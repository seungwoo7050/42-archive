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

- [ ] checked storage-size 함수와 모든 index operand conversion을 실제 코드에서 확인했습니다.
- [ ] valid/invalid `Image` 상태를 dimensions와 pixel vector length로 판정할 수 있습니다.
- [ ] 초기 checksum constant와 standard FNV-1a fix를 해당 SHA별로 구분했습니다.
- [ ] small-image golden과 full-render golden이 각각 checksum encoding과 pipeline semantics를 어떻게 고정하는지 설명할 수 있습니다.
- [ ] path writer의 temp 생성부터 replacement commit까지 정상·실패 cleanup 흐름을 기록했습니다.
- [ ] 기존 destination 보존이 invalid representation, stream failure, replacement failure에서 각각 어떻게 검증되는지 연결했습니다.

## 4. Commit map

1. `71096cd311d5` — `fix(image): 이미지 할당과 픽셀 인덱스 overflow 방지`
   - Importance: A
   - Tags: OUTPUT, RISK, EDGE
   - Source-defined role: Makes allocation sizing and pixel offsets overflow-aware.

2. `3d2e6a5becb7` — `test(image): 잘못된 차원과 저장 크기 계산 검증`
   - Importance: B
   - Tags: TEST, OUTPUT
   - Source-defined role: Verifies positive dimensions and exact storage size.

3. `89c3c7269877` — `fix(output): 표준 FNV-1a 기준값 적용`
   - Importance: B
   - Tags: DEBUG, OUTPUT
   - Source-defined role: Corrects the FNV-1a definition.

4. `eac2ecd13c33` — `test(output): PPM과 렌더링 체크섬 기준 고정`
   - Importance: A
   - Tags: TEST, DETERMINISM, OUTPUT
   - Source-defined role: Pins checksum and full-render goldens.

5. `4eb50073bc3e` — `fix(output): 불일치한 이미지 저장소 거부`
   - Importance: A
   - Tags: OUTPUT, RISK, EDGE
   - Source-defined role: Validates that public image dimensions and byte storage agree before use.

6. `918dd1efeaf3` — `test(output): 잘못된 이미지 저장소 처리 검증`
   - Importance: B
   - Tags: TEST, OUTPUT, RISK
   - Source-defined role: Exercises short and oversized storage and preservation of an existing destination.

7. `053235a7a5e1` — `fix(output): PPM 출력 실패 시 기존 파일 보존`
   - Importance: A
   - Tags: OUTPUT, RISK, PRACTICAL
   - Source-defined role: Writes through a checked stream and publishes through a temporary file plus final replacement.

8. `c6a6a7562a4d` — `test(output): 출력 실패의 대상 보존과 정리 검증`
   - Importance: A
   - Tags: TEST, OUTPUT, RISK
   - Source-defined role: Injects serialization and replacement failures and verifies cleanup and preservation.

## 5. Commit별 학습 기록

### 5.1 `71096cd311d5` — `fix(image): 이미지 할당과 픽셀 인덱스 overflow 방지`

- Importance: A
- Tags: OUTPUT, RISK, EDGE
- Thread order: 1/8

#### Source에서 확정된 역할

- Development Thread role: Makes allocation sizing and pixel offsets overflow-aware.
- Classification summary: Checks image allocation multiplication and performs pixel indexing in `std::size_t`.
- Importance rationale: The commit closes signed-overflow and undersized-buffer risks at a public representation boundary, making it significant safety work despite its limited scope.

#### Failure → Fix 연결

- 기존 가정: signed dimension products를 계산한 뒤 `size_t`로 cast해도 valid storage size/index가 된다.
- 실제 failure 또는 위험: signed overflow 또는 wraparound가 undersized allocation이나 wrong RGB offset을 만들 수 있다.
- root cause: overflow check 없이 좁은 integer domain에서 multiplication을 먼저 수행한다.
- 수정된 decision/invariant: positive validation과 `size_t` 단계별 checked multiplication, operand-first index conversion을 사용한다.
- regression test 연결: `3d2e6a5becb7`에서 positive/invalid dimensions와 exact small size를 검증한다.

#### 학습자 root-cause 기록

- fix 직전 SHA에서 가정이 코드로 드러나는 지점:
- failure를 유발하는 입력/state/event:
- failure가 observable behavior로 나타나는 순서:
- 수정 코드가 root cause를 차단하는 정확한 branch:
- symptom 완화가 아니라 root cause 수정임을 보여주는 근거:
- regression test가 같은 failure mechanism을 재현하는 지점:

#### 해당 SHA에서 확인할 실제 코드

- fix 직전 `Image` storage allocation expression에서 `int` multiplication이 언제 발생하고 `size_t` conversion이 언제 일어나는지 확인합니다.
- 이 SHA의 checked storage-size helper/function이 positive dimensions를 검사하는 branch를 기록합니다.
- `width × height × 3`를 `std::size_t` 범위에서 단계별로 overflow check하는 expression과 exception type을 옮깁니다.
- `Image` construction이 checked result로 pixel vector를 allocate하는 caller path를 확인합니다.
- PPM row/column/channel index에서 operands를 multiply 전에 `size_t`로 변환하는 exact code를 기록합니다.
- allocation size와 serialization offset이 같은 coordinate/storage domain을 사용하는지 검산합니다.

#### Source에서 확정된 이 SHA의 경계

- dimensions must be positive; zero/negative are representation errors.
- 이 fix는 construction/index arithmetic을 보호하지만 public pixel vector mutation은 later `4eb50073bc3e` 전까지 가능합니다.

#### A-level 학습 기록

- 직전 관련 상태:
- 핵심 problem/edge:
- 선택한 algorithm 또는 boundary decision:
- 실제 state/data/control-flow 변화:
- 실패하거나 잘못될 수 있는 branch:
- 후속 test/benchmark가 확인해야 하는 항목:

#### 직접 확인 증거

- 확인한 file path와 symbol:
- 변경 전/후 핵심 차이:
- state 또는 boundary 변화:
- failure/edge branch:
- 관련 production test path:
- 이 SHA가 보장하는 것과 남은 공백:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: 이 Thread의 시작점
- 다음 Thread commit: `3d2e6a5becb7`
- 비교 지침: parent implementation과 diff해 cast after multiplication과 cast before multiplication의 semantic 차이를 concrete dimension example로 기록합니다.
- 직접 작성한 연결 설명:

### 5.2 `3d2e6a5becb7` — `test(image): 잘못된 차원과 저장 크기 계산 검증`

- Importance: B
- Tags: TEST, OUTPUT
- Thread order: 2/8

#### Source에서 확정된 역할

- Development Thread role: Verifies positive dimensions and exact storage size.
- Classification summary: Verifies image storage size and rejection of zero or negative dimensions.
- Importance rationale: This is expected regression coverage for the checked constructor rather than an independent architectural decision.

#### Test commit 분석 기준

- 대상 production invariant: Image dimensions are positive and constructed RGB storage has exactly width × height × 3 bytes.
- 재현하는 failure/boundary: zero and negative dimensions plus a representative valid size.
- test technique: constructor-level deterministic assertions and expected exception type.
- 통과하는 production path: `Image` constructor → checked storage-size calculation → pixel vector allocation.
- 이 test가 증명하는 것: positivity and exact valid small storage size behavior.
- 이 test가 증명하지 않는 것: platform-dependent near-limit allocation success/failure나 every overflow boundary를 실제 allocation으로 증명하지 않는다.
- test 성격: component contract regression.
- 막는 regression: invalid dimensions silently accepted, empty/wrapped storage, wrong channel-count multiplication.

#### 학습자 검증 기록

- 실제 test case/function과 file path:
- fixture 또는 test double 구성:
- assertion 전에 통과하는 production function 순서:
- failure가 실제로 주입되는 정확한 지점:
- test 실행 명령과 결과:
- false positive 또는 미검증 범위:

#### 해당 SHA에서 확인할 실제 코드

- 2×3 image construction과 expected 18 byte assertion을 기록합니다.
- zero width/height 및 negative dimensions cases를 모두 확인하고 expected `std::invalid_argument` path를 기록합니다.
- test helper가 exception type만 보는지 message도 보는지 확인합니다.
- near-`size_t` allocation을 강제하지 않는 이유와 test scope를 source comment/structure에서 확인합니다.
- actual constructor가 checked storage-size path를 호출하는 production chain을 추적합니다.

#### 직접 확인 증거

- 확인한 file path와 symbol:
- Thread에서 필요한 핵심 변화:
- 직접 확인한 caller/callee 또는 state change:
- 다음 commit에 제공하는 것:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `71096cd311d5`
- 다음 Thread commit: `89c3c7269877`
- 비교 지침: fix의 checked arithmetic을 direct observation 가능한 small/invalid inputs로 고정하는 test임을 명시합니다.
- 직접 작성한 연결 설명:

### 5.3 `89c3c7269877` — `fix(output): 표준 FNV-1a 기준값 적용`

- Importance: B
- Tags: DEBUG, OUTPUT
- Thread order: 3/8

#### Source에서 확정된 역할

- Development Thread role: Corrects the FNV-1a definition.
- Classification summary: Corrects the 64-bit FNV-1a offset basis.
- Importance rationale: The fix restores a standard checksum definition, but it is a narrow constant correction with limited effect on project architecture.

#### Failure → Fix 연결

- 기존 가정: 기존 decimal offset basis가 standard FNV-1a constant다.
- 실제 failure 또는 위험: 한 digit이 빠져 independent standard implementation과 golden이 호환되지 않는다.
- root cause: incorrect initialization constant.
- 수정된 decision/invariant: standard 64-bit FNV-1a offset basis로 교체하고 prime/byte order는 유지한다.
- regression test 연결: `eac2ecd13c33`에서 small image와 full render golden을 함께 고정한다.

#### 학습자 root-cause 기록

- fix 직전 SHA에서 가정이 코드로 드러나는 지점:
- failure를 유발하는 입력/state/event:
- failure가 observable behavior로 나타나는 순서:
- 수정 코드가 root cause를 차단하는 정확한 branch:
- symptom 완화가 아니라 root cause 수정임을 보여주는 근거:
- regression test가 같은 failure mechanism을 재현하는 지점:

#### 해당 SHA에서 확인할 실제 코드

- fix 이전 checksum offset basis decimal constant와 이 SHA의 corrected standard 64-bit FNV-1a basis를 기록합니다.
- prime, dimension byte order, pixel byte iteration이 unchanged인지 diff로 확인합니다.
- initial hash state가 each dimension/pixel byte mixing 전에 어디서 set되는지 추적합니다.
- formatted 16-digit hex output이 그대로 유지되는지 확인합니다.
- golden checksums가 변경될 production/tests를 찾고 다음 commit에서 어떤 values가 pin되는지 연결합니다.

#### Source에서 확정된 이 SHA의 경계

- checksum은 cryptographic integrity mechanism이 아니라 deterministic regression fingerprint입니다.
- standard basis correction은 independent implementation과 비교 가능한 definition을 제공합니다.

#### B-level 학습 기록

- Thread에서 이 commit이 맡는 구현 역할:
- 실제 추가/수정된 핵심 symbol:
- 입력·상태·출력의 변화:
- 다음 related commit이 의존하는 결과:

#### 직접 확인 증거

- 확인한 file path와 symbol:
- Thread에서 필요한 핵심 변화:
- 직접 확인한 caller/callee 또는 state change:
- 다음 commit에 제공하는 것:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `3d2e6a5becb7`
- 다음 Thread commit: `eac2ecd13c33`
- 비교 지침: 초기 `1bc7cacd30aa`의 FNV-1a-style checksum과 비교해 mechanism 전체가 아니라 omitted digit constant만 root cause인지 확인합니다.
- 직접 작성한 연결 설명:

### 5.4 `eac2ecd13c33` — `test(output): PPM과 렌더링 체크섬 기준 고정`

- Importance: A
- Tags: TEST, DETERMINISM, OUTPUT
- Thread order: 4/8

#### Source에서 확정된 역할

- Development Thread role: Pins checksum and full-render goldens.
- Classification summary: Pins both a hand-built image checksum and the complete basic-scene render checksum.
- Importance rationale: These dual goldens make checksum semantics and full-pipeline pixels explicit regression contracts, which later performance and concurrency changes rely on.

#### Test commit 분석 기준

- 대상 production invariant: standardized checksum encoding과 deterministic full-render pixels가 exact golden으로 유지된다.
- 재현하는 failure/boundary: checksum algorithm local encoding drift와 any upstream full-pipeline pixel/shape drift.
- test technique: small hand-built image golden plus complete scene-render golden.
- 통과하는 production path: small: Image → checksum; full: parse → camera → geometry/shading → quantization/layout → checksum.
- 이 test가 증명하는 것: checksum definition과 one representative rendered output의 exact identity.
- 이 test가 증명하지 않는 것: checksum collision resistance나 모든 scene behavior를 증명하지 않는다.
- test 성격: dual deterministic golden regression.
- 막는 regression: FNV constant/order changes, dimensions omission, pixel semantics or full renderer output drift.

#### 학습자 검증 기록

- 실제 test case/function과 file path:
- fixture 또는 test double 구성:
- assertion 전에 통과하는 production function 순서:
- failure가 실제로 주입되는 정확한 지점:
- test 실행 명령과 결과:
- false positive 또는 미검증 범위:

#### 해당 SHA에서 확인할 실제 코드

- hand-constructed two-pixel `Image`의 dimensions와 exact pixel byte sequence를 기록합니다.
- small-image expected checksum literal과 production `checksumHex` call을 확인합니다.
- basic scene render setup 또는 fixture와 expected full-scene checksum을 기록합니다.
- full-scene path가 parser, camera, intersection, lighting, quantization, image layout을 통과하는지 caller chain을 추적합니다.
- small golden failure와 scene golden failure가 각각 checksum encoding change인지 rendering change인지 진단에 어떻게 쓰이는지 구분합니다.

#### 직접 확인 증거

- 확인한 file path와 symbol:
- 변경 전/후 핵심 차이:
- state 또는 boundary 변화:
- failure/edge branch:
- 관련 production test path:
- 이 SHA가 보장하는 것과 남은 공백:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `89c3c7269877`
- 다음 Thread commit: `4eb50073bc3e`
- 비교 지침: FNV basis fix 직후 goldens를 고정하는 순서를 보존하고 later acceleration/concurrency changes의 oracle 역할을 기록합니다.
- 직접 작성한 연결 설명:

### 5.5 `4eb50073bc3e` — `fix(output): 불일치한 이미지 저장소 거부`

- Importance: A
- Tags: OUTPUT, RISK, EDGE
- Thread order: 5/8

#### Source에서 확정된 역할

- Development Thread role: Validates that public image dimensions and byte storage agree before use.
- Classification summary: Adds `Image::validate` and requires exact pixel-storage consistency before checksum or serialization.
- Importance rationale: This closes a public-API memory-safety gap at both output entry points and restores the invariant that dimensions and storage agree.

#### Failure → Fix 연결

- 기존 가정: constructor가 올바르게 만들었으므로 output 시점에도 dimensions와 pixel vector가 일치한다.
- 실제 failure 또는 위험: public fields mutation으로 short/oversized storage가 만들어져 out-of-bounds read, partial output, misleading checksum이 가능하다.
- root cause: consumer entry points가 representation consistency를 재검증하지 않는다.
- 수정된 decision/invariant: `Image::validate`를 checksum과 PPM serialization 전에 호출한다.
- regression test 연결: `918dd1efeaf3`에서 short/oversized storage와 pre-open destination preservation을 검증한다.

#### 학습자 root-cause 기록

- fix 직전 SHA에서 가정이 코드로 드러나는 지점:
- failure를 유발하는 입력/state/event:
- failure가 observable behavior로 나타나는 순서:
- 수정 코드가 root cause를 차단하는 정확한 branch:
- symptom 완화가 아니라 root cause 수정임을 보여주는 근거:
- regression test가 같은 failure mechanism을 재현하는 지점:

#### 해당 SHA에서 확인할 실제 코드

- fix 직전 `Image` public dimensions/pixels를 caller가 mutate해 storage mismatch를 만드는 actual API path를 기록합니다.
- `Image::validate`가 positive dimensions와 checked expected storage size를 어떻게 재사용하는지 확인합니다.
- actual vector length가 expected length와 exact equality인지 검사하는 branch와 exception type을 기록합니다.
- `checksumHex`가 any byte consumption 전에 validation을 호출하는 순서를 추적합니다.
- path/stream PPM writer가 destination open/indexing 전에 validation을 호출하는지 확인합니다.
- malformed short and oversized storage에서 potential out-of-bounds, partial file, misleading checksum 위험을 각각 연결합니다.

#### Source에서 확정된 이 SHA의 경계

- validation은 declared dimensions와 storage를 일치시키지만 public fields 자체를 private로 만들지는 않습니다.
- path writer validation이 destination open보다 앞서 기존 file truncation을 막습니다.
- stream/write/replacement failure의 transactional guarantee는 later `053235a7a5e1`에서 추가됩니다.

#### A-level 학습 기록

- 직전 관련 상태:
- 핵심 problem/edge:
- 선택한 algorithm 또는 boundary decision:
- 실제 state/data/control-flow 변화:
- 실패하거나 잘못될 수 있는 branch:
- 후속 test/benchmark가 확인해야 하는 항목:

#### 직접 확인 증거

- 확인한 file path와 symbol:
- 변경 전/후 핵심 차이:
- state 또는 boundary 변화:
- failure/edge branch:
- 관련 production test path:
- 이 SHA가 보장하는 것과 남은 공백:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `eac2ecd13c33`
- 다음 Thread commit: `918dd1efeaf3`
- 비교 지침: construction-time safety fix와 비교해 post-construction public mutation gap이 새 root cause임을 분리합니다.
- 직접 작성한 연결 설명:

### 5.6 `918dd1efeaf3` — `test(output): 잘못된 이미지 저장소 처리 검증`

- Importance: B
- Tags: TEST, OUTPUT, RISK
- Thread order: 6/8

#### Source에서 확정된 역할

- Development Thread role: Exercises short and oversized storage and preservation of an existing destination.
- Classification summary: Tests short and oversized image storage and verifies invalid output cannot truncate an existing file.
- Importance rationale: The regression is important supporting coverage for the validation fix, but the representation invariant itself is established by the preceding implementation commit.

#### Test commit 분석 기준

- 대상 production invariant: checksum과 writer는 exact-sized Image만 소비하고 invalid representation은 destination open 전에 거부한다.
- 재현하는 failure/boundary: one-byte short storage, excess storage, pre-existing destination.
- test technique: public-field mutation, expected exceptions, sentinel file preservation check.
- 통과하는 production path: `Image::validate` via checksum and PPM writer before byte access/file open.
- 이 test가 증명하는 것: both mismatch directions are rejected and validation-order preserves existing output.
- 이 test가 증명하지 않는 것: valid image serialization 중 stream/flush/close/replacement failure behavior를 증명하지 않는다.
- test 성격: representation failure regression with filesystem side-effect assertion.
- 막는 regression: short-buffer read, extra-byte acceptance, checksum on inconsistent state, pre-validation truncation.

#### 학습자 검증 기록

- 실제 test case/function과 file path:
- fixture 또는 test double 구성:
- assertion 전에 통과하는 production function 순서:
- failure가 실제로 주입되는 정확한 지점:
- test 실행 명령과 결과:
- false positive 또는 미검증 범위:

#### 해당 SHA에서 확인할 실제 코드

- valid two-pixel image에서 one byte를 제거하는 mutation과 expected validation/checksum/write failures를 기록합니다.
- one or more excess bytes를 추가하는 mutation과 direct validate failure를 확인합니다.
- writer case가 pre-existing destination file에 어떤 sentinel contents를 먼저 쓰는지 기록합니다.
- malformed image write attempt 후 destination contents가 unchanged인지 확인하는 assertion을 추적합니다.
- validation exception이 destination open/truncate 이전에 발생하는 production ordering을 test observation과 연결합니다.

#### 직접 확인 증거

- 확인한 file path와 symbol:
- Thread에서 필요한 핵심 변화:
- 직접 확인한 caller/callee 또는 state change:
- 다음 commit에 제공하는 것:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `4eb50073bc3e`
- 다음 Thread commit: `053235a7a5e1`
- 비교 지침: representation fix의 both directions를 검증하지만 stream/replace transactional failure는 다음 test pair로 넘어감을 구분합니다.
- 직접 작성한 연결 설명:

### 5.7 `053235a7a5e1` — `fix(output): PPM 출력 실패 시 기존 파일 보존`

- Importance: A
- Tags: OUTPUT, RISK, PRACTICAL
- Thread order: 7/8

#### Source에서 확정된 역할

- Development Thread role: Writes through a checked stream and publishes through a temporary file plus final replacement.
- Classification summary: Serializes through a checked stream, writes a same-directory temporary file, and atomically replaces the destination only after success.
- Importance rationale: This establishes a strong publication guarantee: partial writes, flush/close failures, or replacement failures do not destroy the prior output.
- Most Important Commit anchors:
  - Problem: Opening the final output path directly with truncation can destroy an existing valid image before serialization, flush, or close succeeds. Validation before opening protects one failure class but not stream and replacement failures.
  - Decision: PPM serialization is separated into a checked stream API. File output writes to a uniquely suffixed temporary path in the same directory, verifies stream completion, and only then replaces the destination. An RAII guard removes the temporary file unless the replacement commits.
  - Why it mattered: The output boundary gains transactional behavior: either a complete new PPM becomes visible or the prior destination remains. This is a substantial reliability improvement for a command whose main external effect is writing an image.

#### Failure → Fix 연결

- 기존 가정: validation 후 final destination을 직접 truncate/open해도 output failure를 acceptable하게 처리할 수 있다.
- 실제 failure 또는 위험: serialization, flush, close 실패가 기존 valid PPM을 이미 파괴할 수 있다.
- root cause: serialization과 final publication이 같은 destructive file operation에 결합되어 있다.
- 수정된 decision/invariant: checked stream serialization을 temp file에 완료한 뒤 platform-specific final replacement를 commit point로 사용한다.
- regression test 연결: `c6a6a7562a4d`에서 stream failure, successful replace, replacement failure, temp cleanup을 주입 검증한다.

#### 학습자 root-cause 기록

- fix 직전 SHA에서 가정이 코드로 드러나는 지점:
- failure를 유발하는 입력/state/event:
- failure가 observable behavior로 나타나는 순서:
- 수정 코드가 root cause를 차단하는 정확한 branch:
- symptom 완화가 아니라 root cause 수정임을 보여주는 근거:
- regression test가 같은 failure mechanism을 재현하는 지점:

#### 해당 SHA에서 확인할 실제 코드

- `writePpm(std::ostream&, ...)` 또는 stream overload의 validation과 P3 serialization order를 기록합니다.
- path-based writer가 destination beside unique temporary name을 생성하는 algorithm과 collision handling을 확인합니다.
- temporary stream open, exception configuration/state check, serialization, flush, close의 exact sequence를 추적합니다.
- 각 operation failure가 어떤 exception/error reason으로 caller에 전달되는지 branch별로 기록합니다.
- scope guard가 temp path를 언제 등록하고 uncommitted exit에서 어떻게 remove하는지 lifecycle을 작성합니다.
- POSIX `rename`과 Windows `MoveFileEx` replacement branch, flags, same-directory requirement를 확인합니다.
- final replacement 성공 시 commit state/guard release가 언제 일어나는지 표시합니다.
- existing destination이 validation/open/write/flush/close/replacement failure 동안 언제까지 untouched인지 state table로 작성합니다.

#### Source에서 확정된 이 SHA의 경계

- complete successful serialization, flush, close, replacement가 끝나기 전에는 final path가 바뀌지 않습니다.
- temporary artifact는 every uncommitted path에서 cleanup 대상입니다.
- replacement failure는 underlying error를 caller에게 전달하며 prior destination을 유지합니다.

#### A-level 학습 기록

- 직전 관련 상태:
- 핵심 problem/edge:
- 선택한 algorithm 또는 boundary decision:
- 실제 state/data/control-flow 변화:
- 실패하거나 잘못될 수 있는 branch:
- 후속 test/benchmark가 확인해야 하는 항목:

#### 직접 확인 증거

- 확인한 file path와 symbol:
- 변경 전/후 핵심 차이:
- state 또는 boundary 변화:
- failure/edge branch:
- 관련 production test path:
- 이 SHA가 보장하는 것과 남은 공백:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `918dd1efeaf3`
- 다음 Thread commit: `c6a6a7562a4d`
- 비교 지침: direct-truncation writer와 diff해 serialization boundary와 publication commit point가 분리되는 root decision을 기록합니다.
- 직접 작성한 연결 설명:

### 5.8 `c6a6a7562a4d` — `test(output): 출력 실패의 대상 보존과 정리 검증`

- Importance: A
- Tags: TEST, OUTPUT, RISK
- Thread order: 8/8

#### Source에서 확정된 역할

- Development Thread role: Injects serialization and replacement failures and verifies cleanup and preservation.
- Classification summary: Injects stream and replacement failures, verifies destination preservation, and checks temporary-file cleanup.
- Importance rationale: These tests exercise the difficult negative paths of atomic publication rather than only the normal serializer behavior.

#### Test commit 분석 기준

- 대상 production invariant: final destination은 complete successor replacement 성공 때만 바뀌며 every earlier failure preserves prior destination and removes temp.
- 재현하는 failure/boundary: stream serialization failure, successful replacement, filesystem replacement failure after temp completion.
- test technique: custom refusing stream buffer, sentinel pre-existing destination, directory-based replacement failure injection, temp artifact inspection.
- 통과하는 production path: stream serializer; path writer temp open/write/flush/close; platform replacement; RAII cleanup.
- 이 test가 증명하는 것: both sides of publication commit point, destination preservation, temporary cleanup, exact successful bytes.
- 이 test가 증명하지 않는 것: 모든 OS/filesystem crash-atomicity guarantee까지 확장해 단정하지 않고 source의 stated replacement contract만 증명한다.
- test 성격: deterministic injected output failure-path regression.
- 막는 regression: silent bad stream acceptance, direct truncation, temp leak, destination destruction/type change on replacement failure.

#### 학습자 검증 기록

- 실제 test case/function과 file path:
- fixture 또는 test double 구성:
- assertion 전에 통과하는 production function 순서:
- failure가 실제로 주입되는 정확한 지점:
- test 실행 명령과 결과:
- false positive 또는 미검증 범위:

#### 해당 SHA에서 확인할 실제 코드

- all writes를 거부하는 custom stream buffer 구현과 stream overload invocation을 기록합니다.
- bad stream state가 어떤 production check에서 exception으로 변환되는지 추적합니다.
- successful path에서 pre-existing destination contents가 exact expected P3 bytes로 교체되는지 assertion을 확인합니다.
- success 후 temporary sibling이 남지 않았음을 검사하는 file enumeration/path logic을 기록합니다.
- replacement failure를 만들기 위해 destination을 sentinel file을 포함한 existing directory로 구성하는 setup을 확인합니다.
- failure 후 destination type과 sentinel contents가 preserved되는 assertions를 기록합니다.
- 이미 완전히 기록된 temp가 replacement failure 뒤 제거되는지 cleanup assertion을 확인합니다.
- normal path와 failure path에서 commit point 전후 state를 표로 정리합니다.

#### 직접 확인 증거

- 확인한 file path와 symbol:
- 변경 전/후 핵심 차이:
- state 또는 boundary 변화:
- failure/edge branch:
- 관련 production test path:
- 이 SHA가 보장하는 것과 남은 공백:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `053235a7a5e1`
- 다음 Thread commit: 이 Thread의 종료점
- 비교 지침: transactional writer의 separate stream and path responsibilities를 test cases에 매핑하고, invalid-image validation test와 중복되지 않는 failure stages를 구분합니다.
- 직접 작성한 연결 설명:

## 6. Invariant ledger

source가 연결한 invariant의 시간상 변화를 실제 코드 근거로 완성합니다.

| Invariant | 최초 도입/기준 | 강화 또는 수정 | 부족함/위험 노출 | 고정한 test/evidence | 실제 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| dimensions와 RGB storage가 정확히 일치 | 71096cd311d5 | 4eb50073bc3e | public field mutation으로 mismatch 가능 | 3d2e6a5becb7 / 918dd1efeaf3 | 작성 |
| checksum 정의와 rendered golden의 안정성 | 89c3c7269877 | eac2ecd13c33 | 잘못된 offset basis | eac2ecd13c33 | 작성 |
| 기존 destination은 complete successor 전까지 보존 | 4eb50073bc3e의 pre-open validation | 053235a7a5e1 | stream/flush/close/replace failure | c6a6a7562a4d | 작성 |

### Ledger 보완 기록

- 각 invariant가 처음 observable behavior가 된 SHA:
- invariant를 우회하거나 깨뜨릴 수 있었던 실제 code path:
- fix 뒤 새로 금지되거나 강제된 state transition:
- test가 invariant를 직접 고정하는 assertion:
- source가 명시하지 않은 invariant를 추가했다면 삭제하거나 근거를 재확인:

## 7. Failure → Fix → Test 연결

| Failure 또는 위험 | Decision/Fix | Test 또는 evidence | 실제 failure path와 assertion |
| --- | --- | --- | --- |
| dimension multiplication 또는 pixel offset overflow | size_t domain의 사전 checked multiplication과 operand-first conversion | 3d2e6a5becb7 construction regression | 작성 |
| dimension과 pixel vector length 불일치 | `Image::validate`를 checksum/write 진입점에서 호출 | 918dd1efeaf3 short/oversized storage regression | 작성 |
| final path를 먼저 truncate한 뒤 serialization 실패 | temp serialization 후 final replacement | c6a6a7562a4d refusing stream buffer와 replacement-failure injection | 작성 |
| replacement 실패 후 temp가 남거나 destination이 훼손 | scope guard cleanup과 commit 이후에만 guard 해제 | c6a6a7562a4d sentinel directory regression | 작성 |

### 연결 검토

- feature를 독립적인 성공 경로로만 읽지 않고 어떤 failure를 예방하는지 기록:
- fix가 기존 assumption을 어떻게 수정했는지 기록:
- test가 symptom이 아니라 root cause를 재현하는지 확인:
- test가 증명하지 않는 범위를 별도로 기록:

## 8. Ownership / state / responsibility 변화

- `Image`가 pixel vector를 소유하지만 public fields가 mutation 가능했던 시점과 validation 도입 후의 책임을 구분합니다.
- destination path, temporary path, open stream, cleanup guard의 lifetime과 commit flag 변화를 기록합니다.
- replacement 전후 어느 파일이 authoritative artifact인지 failure branch별로 표시합니다.

### 학습자 최종 기록

- source state:
- derived/cache state:
- owner와 non-owner:
- mutation 또는 transition boundary:
- failure 시 복구되는 상태:

## 9. Thread 최종 상태

`Image`는 positive dimensions와 exact RGB storage를 검증하고, checksum/serializer는 유효성 검사를 통과한 quantized bytes만 소비합니다. path-based PPM write는 같은 디렉터리의 temp에 완전히 기록·flush·close한 뒤에만 destination을 교체하며, 그 전의 모든 실패는 기존 destination을 보존하고 temp cleanup을 시도합니다.

### 직접 작성

- Thread 시작 시점과 종료 시점의 behavior 차이:
- 최종적으로 authoritative한 contract:
- 아직 다른 Thread가 보완해야 하는 항목:

## 10. 최종 architecture 또는 execution flow 정리

### Source가 확정한 흐름 anchor

`checked dimensions/storage size → byte indexing → standard FNV-1a goldens → `Image::validate` → checked stream serialization → same-directory temp → flush/close → final replacement commit → cleanup on failure`

### 실제 코드로 완성할 흐름

1. entry point와 입력 state:
2. 핵심 caller → callee:
3. state/ownership mutation:
4. success result:
5. failure branch와 cleanup/fallback:
6. test/benchmark가 통과하는 동일 production path:

### 학습자의 최종 설명

이 영역에는 source 문장을 복사하지 말고, 확인한 SHA별 코드와 연결 관계를 근거로
설계 → 구현 → 실패 또는 위험 → 수정 → 검증의 발전 과정을 직접 작성합니다.

## 11. 학습 완료 자가 점검

- [ ] 모든 commit을 source 순서대로 확인했습니다.
- [ ] 각 commit의 SHA, subject, importance, tags를 그대로 유지했습니다.
- [ ] 모든 핵심 설명에 해당 SHA의 file path와 symbol 근거가 있습니다.
- [ ] final HEAD의 구조를 과거 SHA에 소급하지 않았습니다.
- [ ] S/A/B importance에 맞는 깊이로 기록했습니다.
- [ ] source에서 확정하지 않은 구현 세부를 정답처럼 채우지 않았습니다.
- [ ] failure와 fix/test가 실제 production path로 연결됩니다.
- [ ] test가 증명하는 것과 증명하지 않는 것을 구분했습니다.
- [ ] invariant ledger의 각 변화가 commit evidence와 연결됩니다.
- [ ] 별도의 프로젝트 재학습 없이 이 Thread의 발전 과정을 설명할 수 있습니다.
