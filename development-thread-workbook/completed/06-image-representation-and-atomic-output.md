# Thread 6. Image representation and atomic PPM publication

## 1. Thread 목표

image dimension/storage/index arithmetic에서 시작해 checksum definition, mutable public storage validation, checked stream serialization, same-directory temporary file와 final replacement까지 안전한 PPM publication contract를 복원합니다.

### Source significance

> This thread expands the output contract from “write bytes” to “publish only a complete, internally
> consistent image.” Allocation and indexing safety prevent buffer mismatch at construction; later
> validation protects callers that mutate public `Image` fields directly. Standardized checksums make
> deterministic regressions comparable, while temporary-file publication ensures validation, stream,
> flush, close, or replacement failures do not destroy a previously valid output.

### 이 Thread에 연결된 source invariant

- Valid image storage is positive and exactly sized without multiplication or index overflow.
- A final PPM path changes only after complete successful serialization, flush, close, and replacement. Any earlier failure preserves the existing destination and attempts to remove the temporary file.
- Golden checksums and exact PPM bytes remain stable unless an intentional rendering contract changes.

### 이 Thread에 연결된 engineering difficulty

- Publishing output atomically enough to avoid destroying a previous file when validation, serialization, flush, close, or replacement fails.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- `width × height × 3` 계산은 어느 type domain에서 어떤 순서로 overflow를 검사하는가?
- allocation size와 PPM pixel offset이 동일한 representation invariant를 공유하는가?
- FNV-1a checksum은 dimensions와 quantized bytes를 어떤 순서로 반영하며 왜 두 수준의 golden이 필요한가?
- public image fields가 construction 이후 storage mismatch를 만들 수 있었던 gap은 무엇인가?
- validation은 checksum과 writer에서 언제 실행되며 기존 파일 truncation보다 왜 앞서야 하는가?
- transactional writer의 commit point는 어디이며 validation/open/write/flush/close/replace failure별 destination과 temp 상태는 무엇인가?

## 3. 완료 기준

- [x] checked storage-size 함수와 모든 index operand conversion을 실제 코드에서 확인했습니다.
- [x] valid/invalid `Image` 상태를 dimensions와 pixel vector length로 판정할 수 있습니다.
- [x] 초기 checksum constant와 standard FNV-1a fix를 해당 SHA별로 구분했습니다.
- [x] small-image golden과 full-render golden이 각각 checksum encoding과 pipeline semantics를 어떻게 고정하는지 설명할 수 있습니다.
- [x] path writer의 temp 생성부터 replacement commit까지 정상·실패 cleanup 흐름을 기록했습니다.
- [x] 기존 destination 보존이 invalid representation, stream failure, replacement failure에서 각각 어떻게 검증되는지 연결했습니다.
- [x] 모든 참조 SHA가 `cpp/miniRT` branch HEAD의 ancestry에 속하는지 확인했습니다.
- [ ] 해당 SHA checkout에서 build/test/benchmark 명령을 직접 실행했습니다. 로컬 외부 네트워크와 checkout이 제공되지 않아 실행 evidence는 만들지 않았습니다.

### 검증 범위

- 지정 branch HEAD: `7d08c7c13fa68c3e60eea3c7014658b0a133e6f0`
- 각 참조 SHA는 Thread 내부의 연속 compare chain에서 `behind_by = 0`, merge base가 선행 SHA였고, Thread 종료 SHA도 branch HEAD의 조상으로 확인했습니다.
- 구현 설명은 해당 commit의 diff/file content를 기준으로 작성했으며, final HEAD의 후속 API를 과거 SHA에 소급하지 않았습니다.
- 테스트와 benchmark는 source mechanism과 production path만 검사했습니다. 실행 결과, sanitizer 결과, wall-clock 수치는 기록하지 않았습니다.

## 4. Commit map

1. `71096cd311d5` — `fix(image): 이미지 할당과 픽셀 인덱스 overflow 방지`
   - Importance: A
   - Tags: OUTPUT, RISK, EDGE
   - Source-defined role: Makes allocation sizing/pixel offsets overflow-aware.

2. `3d2e6a5becb7` — `test(image): 잘못된 차원과 저장 크기 계산 검증`
   - Importance: B
   - Tags: TEST, OUTPUT
   - Source-defined role: Verifies positive dimensions/exact storage.

3. `89c3c7269877` — `fix(output): 표준 FNV-1a 기준값 적용`
   - Importance: B
   - Tags: DEBUG, OUTPUT
   - Source-defined role: Corrects the FNV-1a definition.

4. `eac2ecd13c33` — `test(output): PPM과 렌더링 체크섬 기준 고정`
   - Importance: A
   - Tags: TEST, DETERMINISM, OUTPUT
   - Source-defined role: Pins checksum/full-render goldens.

5. `4eb50073bc3e` — `fix(output): 불일치한 이미지 저장소 거부`
   - Importance: A
   - Tags: OUTPUT, RISK, EDGE
   - Source-defined role: Validates image dimensions/pixel storage agree.

6. `918dd1efeaf3` — `test(output): 잘못된 이미지 저장소 처리 검증`
   - Importance: B
   - Tags: TEST, OUTPUT, RISK
   - Source-defined role: Exercises short/oversized storage and existing destination preservation.

7. `053235a7a5e1` — `fix(output): PPM 출력 실패 시 기존 파일 보존`
   - Importance: A
   - Tags: OUTPUT, RISK, PRACTICAL
   - Source-defined role: Writes checked stream and publishes temp+final replacement.

8. `c6a6a7562a4d` — `test(output): 출력 실패의 대상 보존과 정리 검증`
   - Importance: A
   - Tags: TEST, OUTPUT, RISK
   - Source-defined role: Injects serialization/replacement failures, verifies cleanup/preservation.

## 5. Commit별 학습 기록

### 5.1 `71096cd311d5` — `fix(image): 이미지 할당과 픽셀 인덱스 overflow 방지`

- Importance: A
- Tags: OUTPUT, RISK, EDGE
- Thread order: 1/8

#### Source에서 확정된 역할

- Development Thread role: Makes allocation sizing/pixel offsets overflow-aware.

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** `Image` construction의 `width * height * 3`과 PPM offset의 `(y * width + x) * 3`이 signed `int` domain에서 먼저 계산되면, 이후 `size_t`로 변환해도 이미 overflow한 값입니다. 잘못된 allocation 또는 out-of-bounds indexing으로 이어질 수 있습니다.
- **핵심 구현 결정:** `pixelStorageSize`가 width/height 양수를 먼저 검사하고 operands를 `size_t`로 변환한 뒤 단계별 division check를 합니다. `w > max / h`, `w*h > max / 3`이면 `overflow_error`, non-positive dimensions면 `invalid_argument`입니다. Image constructor는 이 helper 결과로 vector를 만듭니다. PPM/checksum indexing도 각 operand를 먼저 `size_t`로 올려 multiplication이 unsigned storage domain에서 일어나게 합니다.

#### Failure → Fix 연결

- **기존 가정:** int dimensions를 곱한 뒤 size_t로 바꿔도 allocation/index가 안전합니다.
- **실제 failure 또는 위험:** signed intermediate가 overflow하거나 wrap된 작은 size가 storage와 logical image를 분리합니다.
- **root cause:** range check 이전에 multiplication이 더 좁은 domain에서 실행됐습니다.
- **수정된 decision/invariant:** operands를 먼저 size_t로 변환하고 division-based precondition checks를 수행합니다.
- **regression 연결:** `3d2e6a5becb7`이 positive dimensions와 exact storage size를 고정합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - include/ray/renderer.hpp — Image declaration/storage helper exposure if present
  - src/renderer.cpp — `pixelStorageSize`, `Image` constructor
  - src/output.cpp — size-safe pixel offset calculation
- **caller → callee / data flow:** signed dimensions → positivity validation → size_t conversion → checked pixel count → checked RGB byte count → vector allocation; pixel `(x,y)` → pre-converted size_t offset
- **ownership·state transition:** dimension values와 pixel vector size가 construction 시점에 일치합니다. 예외가 발생하면 vector allocation/partial Image 성공값이 없습니다.
- **failure/edge branch:** overflow 후 비교하는 검사는 너무 늦습니다. signed multiplication은 undefined behavior가 될 수 있고 작은 vector와 큰 logical dimensions의 불일치를 만듭니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 지원 platform의 `size_t` 범위 안에서 positive dimensions의 exact RGB byte count와 index arithmetic을 계산합니다.
- **이 SHA가 보장하지 않는 것:** public `Image` fields를 caller가 construction 후 변경하면 representation을 다시 깨뜨릴 수 있으며 `4eb50073bc3e`에서 사용 전 validation이 추가됩니다. `int` dimension 범위 때문에 64-bit `size_t`에서는 실제 overflow branch에 도달하기 어려울 수 있습니다.
- **직접 확인/후속 evidence:** multiplication 전 checks와 output operand conversion을 해당 SHA에서 확인했습니다.

#### Thread 내 연결

- 이전 Thread commit: 이 Thread의 시작점
- 다음 Thread commit: `3d2e6a5becb7`
- 이 commit이 다음 단계에 제공하는 것: `3d2e6a5becb7`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.2 `3d2e6a5becb7` — `test(image): 잘못된 차원과 저장 크기 계산 검증`

- Importance: B
- Tags: TEST, OUTPUT
- Thread order: 2/8

#### Source에서 확정된 역할

- Development Thread role: Verifies positive dimensions/exact storage.

#### B-level 구현 역할 복원

- **직전 관련 상태:** checked helper가 있어도 zero/negative dimensions가 거부되고 정상 dimensions가 정확한 RGB byte vector를 만드는지 자동 검증이 없습니다.
- **핵심 구현 결정:** `tests/core_tests.cpp`가 `Image(2,3)`의 storage length가 18인지 확인하고 zero/negative width 또는 height가 `invalid_argument`를 던지는지 검사합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - tests/core_tests.cpp — Image dimension/storage tests
  - src/renderer.cpp — `pixelStorageSize`, Image constructor
- **caller → callee / data flow:** valid/invalid dimension construction → helper validation/arithmetic → vector length 또는 expected exception
- **ownership·state transition:** fixture는 constructor outcome만 관찰합니다. valid Image는 dimensions와 pixel size가 일치합니다.
- **failure/edge branch:** positivity check 제거 또는 channel multiplier 오류가 assertion에서 드러납니다.

#### Test commit 분석 기준

- **대상 production invariant:** Image dimensions는 양수이며 storage는 정확히 width×height×3 bytes입니다.
- **test technique:** small exact-size assertion + invalid-dimension exception assertions
- **통과하는 production path:** Image constructor → `pixelStorageSize` → vector allocation
- **이 test가 증명하는 것:** 대표 정상/비정상 dimension contract를 보호합니다.
- **이 test가 증명하지 않는 것:** 실제 size_t overflow branch와 post-construction mutation을 증명하지 않습니다.
- **실행 상태:** 테스트 구현과 production 호출 경로는 해당 SHA에서 확인했지만, 이 환경에서는 checkout/build가 불가능해 명령을 실행하지 않았습니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 대표 valid size와 non-positive boundary를 고정합니다.
- **이 SHA가 보장하지 않는 것:** `int` dimensions와 64-bit size_t 조합에서 실제 multiplication-overflow exception을 강제로 재현하지는 않습니다. construction 이후 public mutation도 이 테스트 범위 밖입니다.
- **직접 확인/후속 evidence:** 테스트 성격: constructor boundary regression. 소스를 검사했으며 실행하지 않았습니다.

#### Thread 내 연결

- 이전 Thread commit: `71096cd311d5`
- 다음 Thread commit: `89c3c7269877`
- 이 commit이 다음 단계에 제공하는 것: `89c3c7269877`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.3 `89c3c7269877` — `fix(output): 표준 FNV-1a 기준값 적용`

- Importance: B
- Tags: DEBUG, OUTPUT
- Thread order: 3/8

#### Source에서 확정된 역할

- Development Thread role: Corrects the FNV-1a definition.

#### B-level 구현 역할 복원

- **직전 관련 상태:** 초기 checksum은 FNV-1a prime을 사용했지만 64-bit offset basis를 `1469598103934665603`으로 두어 표준값의 마지막 digit 7이 빠져 있었습니다. deterministic하더라도 표준 FNV-1a로 식별할 수 없는 값입니다.
- **핵심 구현 결정:** `src/output.cpp`의 initial hash를 표준 64-bit FNV-1a offset basis `14695981039346656037ULL`로 수정합니다. byte xor 뒤 prime multiplication 순서와 dimensions/pixels 입력 순서는 유지합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - src/output.cpp — checksum initial constant and update loop
- **caller → callee / data flow:** standard offset basis → dimension bytes → pixel bytes 각각 xor/multiply → fixed-width hex
- **ownership·state transition:** Image representation은 바뀌지 않고 derived checksum 값만 의도적으로 변경됩니다.
- **failure/edge branch:** 기존 golden은 모두 새 정의와 불일치하므로 후속 commit이 새 기준을 명시적으로 고정해야 합니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** checksum 구현이 표준 FNV-1a 정의와 일치합니다.
- **이 SHA가 보장하지 않는 것:** FNV-1a는 암호학적 collision resistance를 제공하지 않으며 artifact identity의 lightweight regression surface입니다.
- **직접 확인/후속 evidence:** 한 자리 차이와 unchanged prime/update order를 해당 SHA에서 확인했습니다.

#### Thread 내 연결

- 이전 Thread commit: `3d2e6a5becb7`
- 다음 Thread commit: `eac2ecd13c33`
- 이 commit이 다음 단계에 제공하는 것: `eac2ecd13c33`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.4 `eac2ecd13c33` — `test(output): PPM과 렌더링 체크섬 기준 고정`

- Importance: A
- Tags: TEST, DETERMINISM, OUTPUT
- Thread order: 4/8

#### Source에서 확정된 역할

- Development Thread role: Pins checksum/full-render goldens.

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** checksum 정의가 수정됐지만 exact expected 값을 source에 고정하지 않으면 dimensions/byte ordering이나 upstream rendering drift가 조용히 지나갈 수 있습니다.
- **핵심 구현 결정:** `tests/core_tests.cpp`에 작은 hand-built image checksum `0fde7b4d509f1daf`를 넣어 local encoding을 고정하고, basic scene full render checksum `456dc8d87ebf194f`를 고정해 parser/camera/intersection/shading/quantization까지 포함한 pipeline baseline을 만듭니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - tests/core_tests.cpp — small checksum golden and full-render golden
  - src/output.cpp — checksum production path
  - src/renderer.cpp and upstream pipeline — full-render input
- **caller → callee / data flow:** small explicit bytes → checksum exact value; parsed/basic Scene → full render bytes → same checksum function → full golden
- **ownership·state transition:** 두 golden은 같은 checksum function을 쓰지만 upstream 범위가 다릅니다. small case는 encoding order, full case는 renderer semantics까지 포함합니다.
- **failure/edge branch:** checksum constant/update 순서 변경은 둘 다 깨지고, rendering-only drift는 full golden만 깨질 수 있어 fault localization이 가능합니다.

#### Test commit 분석 기준

- **대상 production invariant:** dimension/pixel byte order와 basic full-render result가 의도 없이 바뀌지 않습니다.
- **test technique:** two-level exact checksum goldens
- **통과하는 production path:** Image checksum directly; full parser/render/image/checksum pipeline
- **이 test가 증명하는 것:** local encoding과 broad pipeline drift를 서로 다른 수준에서 탐지합니다.
- **이 test가 증명하지 않는 것:** collision-free equality, PPM text bytes, output failure cleanup을 증명하지 않습니다.
- **실행 상태:** 테스트 구현과 production 호출 경로는 해당 SHA에서 확인했지만, 이 환경에서는 checkout/build가 불가능해 명령을 실행하지 않았습니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 표준ized checksum byte contract와 당시 complete rendering baseline을 함께 고정합니다.
- **이 SHA가 보장하지 않는 것:** hash collision 가능성 때문에 exact pixel comparison을 완전히 대신하지 않으며 intentional rendering change 시 golden update가 필요합니다.
- **직접 확인/후속 evidence:** 테스트 성격: deterministic local golden + broad integration golden. 실행은 하지 않았습니다.

#### Thread 내 연결

- 이전 Thread commit: `89c3c7269877`
- 다음 Thread commit: `4eb50073bc3e`
- 이 commit이 다음 단계에 제공하는 것: `4eb50073bc3e`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.5 `4eb50073bc3e` — `fix(output): 불일치한 이미지 저장소 거부`

- Importance: A
- Tags: OUTPUT, RISK, EDGE
- Thread order: 5/8

#### Source에서 확정된 역할

- Development Thread role: Validates image dimensions/pixel storage agree.

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** constructor는 valid storage를 만들지만 `Image`의 public width/height/pixels를 caller가 수정할 수 있어 checksum/writer가 out-of-bounds read를 하거나 malformed file을 만들 수 있습니다.
- **핵심 구현 결정:** `Image::validate`가 positive dimensions와 checked expected storage size를 다시 계산하고 `pixels.size()`가 정확히 같지 않으면 예외를 던집니다. checksum과 PPM writer는 indexing, stream open/truncation보다 먼저 validation을 호출합니다.

#### Failure → Fix 연결

- **기존 가정:** Image constructor가 storage invariant를 영구히 보장합니다.
- **실제 failure 또는 위험:** public fields가 construction 후 short/oversized representation을 만들 수 있습니다.
- **root cause:** mutable aggregate를 소비할 때 invariant를 재검증하지 않았습니다.
- **수정된 decision/invariant:** checksum/output entry에서 exact size validation을 side effect 전에 수행합니다.
- **regression 연결:** `918dd1efeaf3`이 short/oversized 상태와 destination preservation을 검증합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - include/ray/renderer.hpp — `Image::validate`
  - src/renderer.cpp — representation validation
  - src/output.cpp — checksum/writer precondition call
- **caller → callee / data flow:** possibly externally mutated Image → validate dimensions/expected bytes/exact vector length → only then checksum indexing or output operation
- **ownership·state transition:** public mutable representation은 유지되지만 모든 public consumer 앞에서 invariant를 재확립합니다. validation은 object를 고치지 않고 fail closed합니다.
- **failure/edge branch:** storage가 짧으면 out-of-bounds read, 길면 ignored trailing data/ambiguous representation이 됩니다. writer가 파일을 먼저 열면 invalid input이 기존 destination을 파괴할 수 있습니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** checksum과 output이 정확히 sized Image만 소비하며 invalid input에서 destination side effect 전에 실패할 수 있습니다.
- **이 SHA가 보장하지 않는 것:** 객체 자체를 immutable하게 바꾸지는 않고 consumer discipline에 의존합니다. stream/replace failure transactional behavior는 다음 fix입니다.
- **직접 확인/후속 evidence:** validation call order가 path open보다 앞서는 것을 해당 SHA에서 확인했습니다.

#### Thread 내 연결

- 이전 Thread commit: `eac2ecd13c33`
- 다음 Thread commit: `918dd1efeaf3`
- 이 commit이 다음 단계에 제공하는 것: `918dd1efeaf3`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.6 `918dd1efeaf3` — `test(output): 잘못된 이미지 저장소 처리 검증`

- Importance: B
- Tags: TEST, OUTPUT, RISK
- Thread order: 6/8

#### Source에서 확정된 역할

- Development Thread role: Exercises short/oversized storage and existing destination preservation.

#### B-level 구현 역할 복원

- **직전 관련 상태:** representation validation이 추가됐지만 short/oversized 양쪽과 writer의 pre-truncation ordering을 고정하는 test가 없습니다.
- **핵심 구현 결정:** `tests/core_tests.cpp`가 valid Image에서 byte 하나를 `pop_back`해 checksum과 writer가 거부하는지 확인합니다. writer destination에는 먼저 `preserve me`를 써 두고 invalid write 뒤 그대로인지 확인합니다. 이후 byte 둘을 push해 expected보다 1 큰 storage도 validation error인지 검사합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - tests/core_tests.cpp — malformed Image regression and existing destination assertion
  - src/renderer.cpp — `Image::validate`
  - src/output.cpp — checksum/path writer
- **caller → callee / data flow:** valid Image → short mutation → checksum reject → existing file seed → path write reject before open/truncate → content preserved → oversized mutation → reject
- **ownership·state transition:** failure injection은 public vector mutation으로 deterministic합니다. destination 내용은 observable external state입니다.
- **failure/edge branch:** validation이 after-open으로 이동하면 exception은 나더라도 `preserve me`가 사라져 preservation assertion이 실패합니다.

#### Test commit 분석 기준

- **대상 production invariant:** invalid Image는 checksum/output에 사용되지 않고 기존 destination을 변경하지 않습니다.
- **test technique:** pixel vector short/oversized mutation, exception assertion, seeded destination content comparison
- **통과하는 production path:** `Image::validate` → checksum/path writer precondition
- **이 test가 증명하는 것:** 두 mismatch 방향과 validation-before-truncation을 고정합니다.
- **이 test가 증명하지 않는 것:** valid serialization 중 I/O failure와 temp cleanup을 증명하지 않습니다.
- **실행 상태:** 테스트 구현과 production 호출 경로는 해당 SHA에서 확인했지만, 이 환경에서는 checkout/build가 불가능해 명령을 실행하지 않았습니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** short와 oversized representation을 모두 거부하고 invalid input이 기존 destination을 건드리지 않음을 고정합니다.
- **이 SHA가 보장하지 않는 것:** valid image의 serialization 도중 stream/flush/replace failure는 이 테스트가 주입하지 않습니다.
- **직접 확인/후속 evidence:** 테스트 성격: deterministic representation failure injection + pre-side-effect preservation regression. 실행은 하지 않았습니다.

#### Thread 내 연결

- 이전 Thread commit: `4eb50073bc3e`
- 다음 Thread commit: `053235a7a5e1`
- 이 commit이 다음 단계에 제공하는 것: `053235a7a5e1`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.7 `053235a7a5e1` — `fix(output): PPM 출력 실패 시 기존 파일 보존`

- Importance: A
- Tags: OUTPUT, RISK, PRACTICAL
- Thread order: 7/8

#### Source에서 확정된 역할

- Development Thread role: Writes checked stream and publishes temp+final replacement.

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** valid Image를 직접 final path에 쓰면 serialization, flush, close 중간 실패가 기존 파일을 부분 PPM으로 바꿉니다. validation-only preservation으로는 실제 I/O failure를 다루지 못합니다.
- **핵심 구현 결정:** stream overload가 Image를 validate하고 P3 header/pixels를 쓴 뒤 stream state를 검사합니다. path overload는 target과 같은 directory에 `target + ".tmp." + steady-clock stamp + atomic sequence` 형태의 임시 파일을 만들고 RAII `TemporaryOutput`이 commit 전까지 삭제 책임을 가집니다. serialize → flush → close가 모두 성공한 뒤 POSIX `rename` 또는 Windows replacement API로 final path를 교체하고 마지막에 temp guard를 committed로 표시합니다.

#### Failure → Fix 연결

- **기존 가정:** valid Image를 final path에 직접 쓰면 output failure도 예외로 충분히 처리됩니다.
- **실제 failure 또는 위험:** 예외가 나기 전에 기존 destination이 truncate되거나 partial PPM으로 바뀝니다.
- **root cause:** serialization work와 externally visible publication이 같은 파일에서 동시에 진행됐습니다.
- **수정된 decision/invariant:** same-directory temporary candidate와 final replacement를 분리하고 RAII cleanup/commit을 둡니다.
- **regression 연결:** `c6a6a7562a4d`가 stream 및 replacement failure를 deterministic하게 주입합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - include/ray/output.hpp — checked stream/path overloads
  - src/output.cpp — stream validation, `TemporaryOutput`, temp naming, flush/close, platform replacement
- **caller → callee / data flow:** Image validate → same-directory temp open → complete P3 write → stream check → flush check → close check → atomic-style replacement → temp guard commit; any throw before commit → guard removes temp
- **ownership·state transition:** 기존 destination은 final replacement까지 authoritative합니다. temp file이 new candidate를 소유하고, replacement 성공이 publication commit point입니다. guard destructor가 uncommitted temp cleanup을 맡습니다.
- **failure/edge branch:** validation/open/serialization/flush/close/replacement 어느 단계든 예외가 나면 final path를 직접 수정하지 않습니다. replacement가 실패하면 temp를 제거하고 기존 target을 유지합니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** API-level 정상/오류 반환 관점에서 incomplete PPM을 final path로 publish하지 않고 기존 file을 보존합니다.
- **이 SHA가 보장하지 않는 것:** directory fsync나 power-loss crash consistency까지 보장하지 않습니다. POSIX/Windows replacement semantics 차이가 있으며 동일 filesystem을 위해 same-directory temp를 사용합니다.
- **직접 확인/후속 evidence:** temp lifetime, stream checks, replacement-before-commit과 destructor cleanup 순서를 해당 SHA에서 확인하고 failure-injection tests와 연결했습니다.

#### Thread 내 연결

- 이전 Thread commit: `918dd1efeaf3`
- 다음 Thread commit: `c6a6a7562a4d`
- 이 commit이 다음 단계에 제공하는 것: `c6a6a7562a4d`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.8 `c6a6a7562a4d` — `test(output): 출력 실패의 대상 보존과 정리 검증`

- Importance: A
- Tags: TEST, OUTPUT, RISK
- Thread order: 8/8

#### Source에서 확정된 역할

- Development Thread role: Injects serialization/replacement failures, verifies cleanup/preservation.

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** transactional writer가 있어도 실제 stream failure와 final replacement failure에서 destination/temp 상태를 관찰하지 않으면 cleanup ordering regression을 잡기 어렵습니다.
- **핵심 구현 결정:** `tests/output_tests.cpp`가 custom failing stream buffer로 serialization 중 failure를 주입합니다. 임시 directory RAII 아래에서 정상 atomic replacement가 exact expected output을 만들고 temp leftovers가 없는지 확인합니다. replacement failure는 destination path를 directory로 만들고 sentinel을 두어 replace가 실패하도록 한 뒤 directory/sentinel이 보존되고 `.tmp.` 파일이 남지 않는지 검사합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - tests/output_tests.cpp — failing buffer, temp directory fixture, replacement failure/preservation assertions
  - src/output.cpp — stream writer and transactional path writer
- **caller → callee / data flow:** failing stream buffer → checked stream write throws; seeded destination/directory → temp candidate complete → replacement fails → guard cleanup → destination/sentinel/temp-directory scan assertions
- **ownership·state transition:** destination, sentinel, temp directory listing이 failure 전후 external state입니다. failure injection은 timing이나 disk-full에 의존하지 않습니다.
- **failure/edge branch:** stream state를 검사하지 않으면 short output을 성공으로 볼 수 있고, replacement failure 뒤 guard commit/cleanup 순서가 틀리면 temp leak 또는 destination 손상이 나타납니다.

#### Test commit 분석 기준

- **대상 production invariant:** final destination은 complete success에서만 변경되고 실패 시 기존 state와 temp cleanliness가 유지됩니다.
- **test technique:** custom failing streambuf, directory-as-destination replacement failure, sentinel and directory enumeration
- **통과하는 production path:** checked stream serializer and path-level temp/replace/RAII cleanup
- **이 test가 증명하는 것:** 두 주요 failure phase와 정상 publication의 state outcome을 고정합니다.
- **이 test가 증명하지 않는 것:** OS crash durability, every errno, cross-filesystem replacement을 증명하지 않습니다.
- **실행 상태:** 테스트 구현과 production 호출 경로는 해당 SHA에서 확인했지만, 이 환경에서는 checkout/build가 불가능해 명령을 실행하지 않았습니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** serialization failure 감지, successful replacement, replacement failure 시 기존 target 보존, uncommitted temp cleanup을 deterministic tests로 고정합니다.
- **이 SHA가 보장하지 않는 것:** 실제 ENOSPC, permission change race, process crash/power loss와 directory fsync durability를 증명하지 않습니다.
- **직접 확인/후속 evidence:** 테스트 성격: deterministic I/O failure injection + transactional state regression. 실행은 하지 않았습니다.

#### Thread 내 연결

- 이전 Thread commit: `053235a7a5e1`
- 다음 Thread commit: 이 Thread의 종료점
- 이 commit이 Thread 종료에 제공하는 것: Thread-level invariant ledger와 최종 실행 흐름에서 이 SHA의 결과를 최종 상태에 반영했습니다.

## 6. Invariant ledger

| Invariant | 최초 도입/기준 | 강화 또는 수정 | 부족함/위험 노출 | 고정한 test/evidence | 실제 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| positive exact-size RGB storage | 71096cd311d5 | 4eb50073bc3e에서 consumer 재검증 | public mutation으로 size mismatch | 3d2e6a5becb7/918dd1efeaf3 | checked multiplication + `Image::validate` |
| 표준 FNV-1a checksum | 1bc7cacd30aa 초기 비표준 상수 | 89c3c7269877 | offset basis digit 누락 | eac2ecd13c33 | standard basis + local/full goldens |
| invalid Image는 destination side effect 전 거부 | 4eb50073bc3e | 4eb50073bc3e | writer가 open/truncate 먼저 할 위험 | 918dd1efeaf3 | validate before checksum/open |
| final path는 complete write 후에만 변경 | 053235a7a5e1 | 053235a7a5e1 | direct write가 기존 파일 partial/truncate | c6a6a7562a4d | temp serialize/flush/close → replace → commit |

### Ledger 보완 기록

- 각 invariant는 위 표의 SHA에서 observable behavior 또는 state로 처음 나타났습니다.
- 후속 commit이 같은 용어를 사용하더라도 그 보장을 과거 SHA에 소급하지 않았습니다.
- test/evidence 열은 production path와 assertion 또는 deterministic work gate를 함께 가리킵니다.
- 실행하지 않은 test는 source-level evidence로만 기록했습니다.

## 7. Failure → Fix → Test 연결

| Failure 또는 위험 | Decision/Fix | Test 또는 evidence | 실제 failure path와 assertion |
| --- | --- | --- | --- |
| dimension/storage multiplication 또는 index overflow | size_t pre-conversion + division checks | 3d2e6a5becb7 | valid size/non-positive boundary assertions |
| public pixels short/oversized | `Image::validate` exact equality | 918dd1efeaf3 | checksum/write reject and existing content preservation |
| 비표준 checksum definition | correct FNV-1a offset basis | eac2ecd13c33 | small/full exact goldens |
| serialization/flush/close 중 기존 파일 손상 | same-directory temp and checked stream | c6a6a7562a4d | failing stream + no publish |
| final replacement failure/temp leak | replacement as commit point + RAII temp cleanup | c6a6a7562a4d | directory target/sentinel preservation and leftover scan |

### 연결 검토

- feature commit도 어떤 잘못된 state 또는 semantic drift를 막는지 production path에 연결했습니다.
- fix commit은 기존 가정 → 실제 위험 → root cause → corrected decision → regression 순서로 기록했습니다.
- test가 broad integration인지 deterministic boundary/differential/failure-injection regression인지 commit 기록에서 구분했습니다.
- assertion이 증명하지 않는 범위와 실행하지 못한 항목을 별도로 남겼습니다.

## 8. Ownership / state / responsibility 변화

construction 시 `Image`가 dimensions와 exact RGB vector를 소유하지만 public mutation 가능성 때문에
각 consumer가 representation을 재검증합니다. checksum은 Image를 읽기만 합니다. stream writer는
caller stream을 소유하지 않고 상태만 검사합니다. path writer는 `TemporaryOutput` guard를 통해
same-directory candidate file의 cleanup 책임을 소유하고, 기존 destination은 replacement 성공 전까지
authoritative합니다. replacement가 성공한 뒤 guard를 commit하면 temp cleanup 책임이 해제됩니다.
예외 경로에서는 stack unwinding이 uncommitted temp를 제거합니다.

### 학습자 최종 기록

- **source state와 derived state:** construction 시 `Image`가 dimensions와 exact RGB vector를 소유하지만 public mutation 가능성 때문에 각 consumer가 representation을 재검증합니다. checksum은 Image를 읽기만 합니다. stream writer는 caller stream을 소유하지 않고 상태만 검사합니다. path writer는 `TemporaryOutput` guard를 통해 same-directory candidate file의 cleanup 책임을 소유하고, 기존 destination은 replacement 성공 전까지 authoritative합니다. replacement가 성공한 뒤 guard를 commit하면 temp cleanup 책임이 해제됩니다. 예외 경로에서는 stack unwinding이 uncommitted temp를 제거합니다.
- **mutation/transition boundary:** commit별 `ownership·state transition`과 위 invariant ledger에 표시했습니다.
- **failure 시 복구 상태:** Failure → Fix → Test 표와 각 fix/test section에 정상·오류 상태를 구분했습니다.

## 9. Thread 최종 상태

Image storage와 offset은 multiplication 전에 checked `size_t` domain에서 계산되고, public mutation으로
생긴 short/oversized state는 checksum/output side effect 전에 거부됩니다. checksum은 표준 64-bit
FNV-1a로 정의되고 local/full goldens이 byte order와 pipeline을 고정합니다. valid PPM은 final path가
아닌 same-directory temp에 완전히 serialize·flush·close된 뒤 replacement됩니다. validation, stream,
close, replace failure에서는 기존 destination이 유지되고 temp guard가 candidate를 제거합니다.
power-loss durability와 directory fsync는 이 API-level contract 밖입니다.

### 직접 작성한 결론

- **Thread 시작과 종료의 behavior 차이:** Image storage와 offset은 multiplication 전에 checked `size_t` domain에서 계산되고, public mutation으로 생긴 short/oversized state는 checksum/output side effect 전에 거부됩니다. checksum은 표준 64-bit FNV-1a로 정의되고 local/full goldens이 byte order와 pipeline을 고정합니다. valid PPM은 final path가 아닌 same-directory temp에 완전히 serialize·flush·close된 뒤 replacement됩니다. validation, stream, close, replace failure에서는 기존 destination이 유지되고 temp guard가 candidate를 제거합니다. power-loss durability와 directory fsync는 이 API-level contract 밖입니다.
- **아직 다른 Thread 또는 외부 검증이 보완해야 하는 항목:** process crash·power loss에 대한 durable atomicity, directory fsync, 모든 filesystem/Windows edge는 별도 시스템 수준 검증이 필요합니다.

## 10. 최종 architecture 또는 execution flow 정리

### Source가 확정한 흐름 anchor

```text
dimensions → checked `pixelStorageSize` → `Image::pixels`/safe offset → `Image::validate` → checksum or checked P3 serialization → same-directory temporary file → flush/close → final replacement → temporary-file commit
```

### 실제 코드로 완성한 흐름

1. Image constructor가 positive dimensions를 검사하고 RGB storage size를 checked 계산합니다.
2. pixel access/serialization은 operands를 size_t로 올린 뒤 offset을 계산합니다.
3. checksum 또는 writer entry가 `Image::validate`로 exact storage equality를 확인합니다.
4. checksum은 standard FNV-1a basis에서 dimension bytes와 pixel bytes를 순서대로 반영합니다.
5. path writer가 target과 같은 directory에 unique temp file과 RAII guard를 만듭니다.
6. checked stream serializer가 P3 전체를 쓰고 stream state를 검사합니다.
7. flush와 close가 성공해야 replacement 단계로 이동합니다.
8. OS replacement 성공이 externally visible commit point입니다.
9. commit 전 예외에서는 guard가 temp를 제거하고 기존 destination을 보존합니다.
10. failure-injection tests가 invalid representation, stream failure, replacement failure state를 검사합니다.

### 학습자의 최종 설명

Image storage와 offset은 multiplication 전에 checked `size_t` domain에서 계산되고, public mutation으로
생긴 short/oversized state는 checksum/output side effect 전에 거부됩니다. checksum은 표준 64-bit
FNV-1a로 정의되고 local/full goldens이 byte order와 pipeline을 고정합니다. valid PPM은 final path가
아닌 same-directory temp에 완전히 serialize·flush·close된 뒤 replacement됩니다. validation, stream,
close, replace failure에서는 기존 destination이 유지되고 temp guard가 candidate를 제거합니다.
power-loss durability와 directory fsync는 이 API-level contract 밖입니다.

남은 경계는 다음과 같습니다. process crash·power loss에 대한 durable atomicity, directory fsync, 모든 filesystem/Windows edge는 별도 시스템 수준 검증이 필요합니다.

## 11. 학습 완료 자가 점검

- [x] 모든 commit을 source 순서대로 확인했습니다.
- [x] 각 commit의 SHA, subject, importance, tags를 그대로 유지했습니다.
- [x] 모든 핵심 설명에 해당 SHA의 file path와 symbol 근거를 기록했습니다.
- [x] final HEAD의 구조를 과거 SHA에 소급하지 않았습니다.
- [x] S/A/B importance에 맞춰 architecture, subsystem, localized role의 깊이를 구분했습니다.
- [x] source에서 확정하지 않은 실행 결과나 runtime 수치를 사실로 채우지 않았습니다.
- [x] failure와 fix/test를 실제 production path로 연결했습니다.
- [x] test가 증명하는 것과 증명하지 않는 것을 구분했습니다.
- [x] invariant ledger의 각 변화를 commit evidence와 연결했습니다.
- [ ] 해당 SHA checkout에서 테스트·benchmark·sanitizer를 직접 실행했습니다. 환경 제한 때문에 미실행 상태입니다.
- [x] 별도의 프로젝트 재학습 없이 이 Thread의 설계 → 구현 → 위험 → 수정 → 검증 발전을 설명할 수 있는 기록을 남겼습니다.
