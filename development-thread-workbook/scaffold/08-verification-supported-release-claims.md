# Verification Expands from In-tree Tests to Supported Release Claims

## Thread 목표

in-tree 기능 테스트만으로는 확인할 수 없는 public API shape, 외부 consumer packaging, deterministic breadth, sanitizer/host prerequisite, ABI, compiler/platform 범위를 단계적으로 실행 가능한 release claim으로 확장하는 과정을 복원합니다.

**Source significance:** source-level intent와 실제 supportable release claim의 간극을 단계적으로 줄입니다. interface shape, external packaging, state-space breadth, UB, host prerequisites, ABI assumptions, compiler/platform variation을 서로 다른 verification layer로 다룹니다.

## 이 Thread를 이해하기 위한 핵심 질문

- unit test, compile-contract, CLI fixture가 각각 어떤 blind spot을 담당하는가?
- positive/negative translation unit이 runtime test와 다른 종류의 API 회귀를 어떻게 막는가?
- repository 밖 consumer가 in-tree build에서 가려질 수 있는 어떤 dependency를 노출하는가?
- fixed-seed property와 large batch가 hand-written fixture를 대체하지 않고 보완하는 이유는 무엇인가?
- portable baseline과 host-specific checks를 분리하지 않으면 어떤 지원 주장 왜곡이 생기는가?
- LP64 check와 compiler/platform matrix가 각각 어떤 portability claim을 executable하게 만드는가?

## 완료 기준

- [ ] verification layer별 입력, 실패 조건, 증명하는 계약, 증명하지 않는 범위를 구분할 수 있다.
- [ ] public header isolation과 external archive consumption을 실제 build commands/tests에서 확인할 수 있다.
- [ ] fixed seed, sanitizer, ABI assertion, CI matrix가 서로 중복되지 않는 증거를 제공하는 이유를 설명할 수 있다.
- [ ] portable target과 platform target의 포함 관계 및 host prerequisite를 실제 Makefile/CI에서 복원할 수 있다.

## Source에 연결된 invariant / engineering difficulty

### Critical invariant

- public headers는 private include path 없이 compile되고 private representation은 inaccessible해야 한다.
- 지원하는 C++98 LP64 platform assumptions는 명시적으로 executable하게 검증된다.
- deterministic output과 owned-resource release는 process/release scope에서도 증거가 필요하다.

### Major engineering difficulty

- portable verification과 host-specific archive/dependency/leak/sanitizer capability 분리.
- compile-time API enforcement, external-consumer verification, reproducible property testing, compiler/platform matrix 구성.

위 항목은 source가 확정한 범위입니다. 실제 코드에서 어떻게 구현되는지는 아래 학습 기록에서 직접 확인합니다.

## Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `6e78ced59357` | test(contact): 공개 계약과 명령행 세션 검증 | A | API, TEST, INTEGRATION | unit, compile-contract, CLI integration layer를 도입합니다. |
| 2 | `4bbbfd191669` | test(contracts): 공개 include와 소유권 규칙 검증 | A | API, TEST, OWNERSHIP | library 전체 positive/negative public contract를 확장합니다. |
| 3 | `01271d795d58` | test(consumer): 저장소 밖 공개 library 연결 검증 | A | API, INTEGRATION, PORTABILITY | repository 밖에서 public library consumer를 compile/run합니다. |
| 4 | `9e07d3bc86d3` | test(boundary): 변환·배치 속성과 대용량 경계 검증 | A | TEST, DETERMINISM, EDGE | fixed-seed properties와 large-batch stress를 추가합니다. |
| 5 | `45e9bbfd6b75` | build(check): sanitizer와 portable 검사 계층 구성 | A | ARCH, PORTABILITY, TEST | build/portable/platform checks를 분리하고 ASan/UBSan 역할을 구분합니다. |
| 6 | `ab441fa8737c` | test(portability): 지원 LP64 데이터 모델 검증 | B | PORTABILITY, API | 지원 LP64 ABI assumptions를 executable check로 만듭니다. |
| 7 | `50565bd67e03` | ci: 지원 compiler와 platform matrix 검증 | B | PORTABILITY, TEST | established claims를 GCC/Clang, Linux/macOS matrix에서 실행합니다. |

## Commit별 학습 기록

### `6e78ced59357` — test(contact): 공개 계약과 명령행 세션 검증

- Importance: **A**
- Tags: **API, TEST, INTEGRATION**
- Source 역할: unit, compile-contract, CLI integration layer를 도입합니다.
- Source classification summary: Introduces unit, compile-contract, and CLI fixture layers for the contact subsystem.

#### 핵심 설계 / failure boundary 확인
- [ ] contact subsystem tests가 unit, compile-contract, command-line fixture로 분리되는 build/test targets를 찾으세요.
- [ ] positive compile test가 public header를 두 번 include하고 exported names만 사용하는 translation unit을 확인하세요.
- [ ] private representation 접근을 의도적으로 시도해 compile-fail을 요구하는 negative contract를 확인하세요.
- [ ] real binary session fixture가 ADD/LIST/invalid/QUIT transcript 전체 bytes를 비교하는 방식을 기록하세요.
- [ ] 세 layer가 각각 domain behavior, API shape, process protocol 중 무엇을 검증하는지 구분하세요.
- [ ] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [ ] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### Test commit 학습 구분
- 대상 production invariant: source가 확정한 방향은 **Contact public API, domain order, process protocol**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 재현 failure / boundary: source가 확정한 방향은 **private representation exposure, header isolation, session drift**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- test technique: source가 확정한 방향은 **unit + positive/negative compile + CLI transcript**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 통과하는 production path: source가 확정한 방향은 **Contact/ContactBook public headers and real app**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하는 것: source가 확정한 방향은 **multi-layer verification pattern이 작동함**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하지 않는 것: source가 확정한 방향은 **repository 전체 API/release packaging까지는 아직 아님**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 성격: source가 확정한 방향은 **broad integration/contract**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `4bbbfd191669`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `4bbbfd191669` — test(contracts): 공개 include와 소유권 규칙 검증

- Importance: **A**
- Tags: **API, TEST, OWNERSHIP**
- Source 역할: library 전체 positive/negative public contract를 확장합니다.
- Source classification summary: Expands positive and negative compile contracts across every public header and ownership boundary.

#### 핵심 설계 / failure boundary 확인
- [ ] 필요하면 직전 관련 SHA `6e78ced59357`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [ ] library 전체 public headers를 대상으로 하는 positive consumer translation units와 link step을 확인하세요.
- [ ] abstract interface, protected/private construction, explicit conversion, const access, utility non-construction, list-backed sorting, pointer signature를 각각 어떤 negative file이 거부하는지 분류하세요.
- [ ] negative compile test가 "실행 결과"가 아니라 compiler rejection 자체를 expected success로 다루는 harness를 확인하세요.
- [ ] private include path 없이 archive와 public include만으로 contract가 성립하는지 build command를 기록하세요.
- [ ] runtime tests가 통과해도 API widening/encapsulation regression을 이 layer가 어떻게 잡는지 예시 하나를 실제 test와 연결하세요.
- [ ] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [ ] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### Test commit 학습 구분
- 대상 production invariant: source가 확정한 방향은 **repository-wide public API shape/ownership boundary**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 재현 failure / boundary: source가 확정한 방향은 **implicit conversion, accidental mutability/construction, private include leakage**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- test technique: source가 확정한 방향은 **positive/negative compile-contract suite**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 통과하는 production path: source가 확정한 방향은 **all installed public headers + archive link**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하는 것: source가 확정한 방향은 **external consumer가 허용/금지된 API shape를 compiler 수준에서 고정**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하지 않는 것: source가 확정한 방향은 **runtime behavioral correctness나 leak freedom 자체는 별도 evidence가 필요**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 성격: source가 확정한 방향은 **broad compile contract**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `01271d795d58`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `01271d795d58` — test(consumer): 저장소 밖 공개 library 연결 검증

- Importance: **A**
- Tags: **API, INTEGRATION, PORTABILITY**
- Source 역할: repository 밖에서 public library consumer를 compile/run합니다.
- Source classification summary: Builds and runs a consumer outside the repository using only public headers and the archive.

#### 핵심 설계 / failure boundary 확인
- [ ] 필요하면 직전 관련 SHA `4bbbfd191669`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [ ] temporary consumer directory가 repository tree 밖에 생성되는 setup과 cleanup trap을 확인하세요.
- [ ] compiler include path가 exported include directory만, linker input이 `libcpp_foundation.a`만 사용하도록 제한되는 command를 기록하세요.
- [ ] consumer가 test-only helper 없이 실제 public objects를 사용하는 source를 확인하세요.
- [ ] working-directory assumption, private include, unarchived object가 있으면 어느 compile/link/run 단계에서 실패하는지 추적하세요.
- [ ] external location에서 executable을 실제 run하는 단계까지 포함되는지 확인하세요.
- [ ] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [ ] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### Test commit 학습 구분
- 대상 production invariant: source가 확정한 방향은 **public archive/header external consumability**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 재현 failure / boundary: source가 확정한 방향은 **in-tree-only include/path/object assumptions**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- test technique: source가 확정한 방향은 **out-of-tree compile/link/run consumer**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 통과하는 production path: source가 확정한 방향은 **exported include + static archive + public objects**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하는 것: source가 확정한 방향은 **packaging boundary가 실제 external location에서 성립함**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하지 않는 것: source가 확정한 방향은 **모든 downstream build system/platform을 증명하지는 않음**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 성격: source가 확정한 방향은 **broad integration/release regression**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `9e07d3bc86d3`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `9e07d3bc86d3` — test(boundary): 변환·배치 속성과 대용량 경계 검증

- Importance: **A**
- Tags: **TEST, DETERMINISM, EDGE**
- Source 역할: fixed-seed properties와 large-batch stress를 추가합니다.
- Source classification summary: Adds fixed-seed scalar/RPN properties and a 4,096-job batch stress check.

#### 핵심 설계 / failure boundary 확인
- [ ] 필요하면 직전 관련 SHA `01271d795d58`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [ ] fixed linear-congruential seed와 first-counterexample reporting을 구현한 property test driver를 찾으세요.
- [ ] generated integer literals가 4-line scalar output과 trailing invalid byte rejection을 어떻게 반복 검증하는지 확인하세요.
- [ ] bounded binary RPN expressions를 direct computation과 비교하는 oracle 구성과 overflow 회피 범위를 확인하세요.
- [ ] 4,096-job / 200KB 이상 batch의 생성, 독립 sort oracle, record-by-record comparison, repeated serialization 검증을 추적하세요.
- [ ] deterministic seed가 breadth를 늘리면서 flaky randomness를 피하는 구조를 실제 test inputs와 counterexample output에서 확인하세요.
- [ ] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [ ] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### Test commit 학습 구분
- 대상 production invariant: source가 확정한 방향은 **scalar/RPN/batch boundary breadth와 determinism**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 재현 failure / boundary: source가 확정한 방향은 **generated edge cases and large allocation/sort/output growth**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- test technique: source가 확정한 방향은 **fixed-seed property-style generation + large stress case**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 통과하는 production path: source가 확정한 방향은 **scalar parser/render, RPN checked ops, batch parse/sort/serialize**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하는 것: source가 확정한 방향은 **넓은 deterministic state-space에서 established invariants 유지**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하지 않는 것: source가 확정한 방향은 **formal exhaustive proof나 unfixed randomness를 제공하지는 않음**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 성격: source가 확정한 방향은 **deterministic property/stress**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `45e9bbfd6b75`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `45e9bbfd6b75` — build(check): sanitizer와 portable 검사 계층 구성

- Importance: **A**
- Tags: **ARCH, PORTABILITY, TEST**
- Source 역할: build/portable/platform checks를 분리하고 ASan/UBSan 역할을 구분합니다.
- Source classification summary: Separates build, portable, and platform verification while adding ASan and UBSan layers.

#### 핵심 설계 / failure boundary 확인
- [ ] 필요하면 직전 관련 SHA `9e07d3bc86d3`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [ ] Makefile/check targets에서 build, portable, platform layer가 어떤 dependency graph로 재구성되는지 그리세요.
- [ ] clean rebuild, tests, compiler contracts, archive, external consumer, properties, UBSan 중 portable baseline에 포함되는 항목을 실제 target prerequisite로 확인하세요.
- [ ] ASan과 host-specific release inspection이 별도 platform checks로 분리되는 이유를 prerequisites/commands에서 확인하세요.
- [ ] aggregate target이 unavailable host tool 때문에 portable checks까지 생략하지 않도록 구성된 branch/gating을 기록하세요.
- [ ] reconstruction, incremental no-op, deterministic artifact 검증이 어느 layer에서 실행되는지 찾으세요.
- [ ] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [ ] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.



#### 다음 관련 commit과 연결
- 다음 Thread SHA `ab441fa8737c`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `ab441fa8737c` — test(portability): 지원 LP64 데이터 모델 검증

- Importance: **B**
- Tags: **PORTABILITY, API**
- Source 역할: 지원 LP64 ABI assumptions를 executable check로 만듭니다.
- Source classification summary: Adds compile-time LP64 data-model assertions.

#### Thread 흐름에서 확인할 구현 역할
- [ ] 직전 관련 SHA `45e9bbfd6b75`와의 차이 중 이 Thread의 흐름에 필요한 부분만 확인하세요.
- [ ] CHAR_BIT/short/int/long/pointer/size_t 크기를 compile-time에 assert하는 translation unit을 확인하세요.
- [ ] expected data model이 8-bit byte, 2-byte short, 4-byte int, 8-byte long/pointer/size_t임을 test expression에서 확인하세요.
- [ ] 이 check가 scalar limits, RPN `long`, allocation size, pointer token 중 어떤 subsystem assumptions와 연결되는지 source references를 찾아 적으세요.
- [ ] 지원하지 않는 ABI에서 runtime 오동작 대신 compile-time failure로 끝나는 harness 동작을 확인하세요.
- [ ] 이 commit이 다음 관련 commit의 전제가 되는 상태/계약을 한 문단으로 기록하세요.

#### Test commit 학습 구분
- 대상 production invariant: source가 확정한 방향은 **supported LP64 data model**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 재현 failure / boundary: source가 확정한 방향은 **unsupported ABI silently compiling**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- test technique: source가 확정한 방향은 **compile-time portability assertions**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 통과하는 production path: source가 확정한 방향은 **public/platform build boundary before runtime**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하는 것: source가 확정한 방향은 **declared ABI assumptions을 만족하지 않으면 조기 실패**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하지 않는 것: source가 확정한 방향은 **LP64 내부의 모든 platform 차이를 증명하지는 않음**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 성격: source가 확정한 방향은 **compile-time portability contract**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `50565bd67e03`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `50565bd67e03` — ci: 지원 compiler와 platform matrix 검증

- Importance: **B**
- Tags: **PORTABILITY, TEST**
- Source 역할: established claims를 GCC/Clang, Linux/macOS matrix에서 실행합니다.
- Source classification summary: Adds GCC/Clang Linux and Clang macOS CI with sanitizer coverage.

#### Thread 흐름에서 확인할 구현 역할
- [ ] 직전 관련 SHA `ab441fa8737c`와의 차이 중 이 Thread의 흐름에 필요한 부분만 확인하세요.
- [ ] CI matrix에서 GCC/Clang Linux와 Clang macOS 조합을 실제 configuration으로 확인하세요.
- [ ] 각 job이 어떤 established build/check target을 실행하는지 기록하세요.
- [ ] matrix fail-fast disabled 설정이 한 job 실패 시 다른 evidence를 계속 수집하도록 하는지 확인하세요.
- [ ] UBSan은 어디서 공통 실행되고 ASan은 어느 host로 제한되는지 configuration을 확인하세요.
- [ ] minimal permissions와 explicit timeout가 실제 workflow에 선언되어 있는지 확인하세요.
- [ ] 이 commit이 다음 관련 commit의 전제가 되는 상태/계약을 한 문단으로 기록하세요.

#### Test commit 학습 구분
- 대상 production invariant: source가 확정한 방향은 **supported compiler/platform matrix**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 재현 failure / boundary: source가 확정한 방향은 **compiler/OS-specific regression**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- test technique: source가 확정한 방향은 **CI matrix with sanitizer/check targets**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 통과하는 production path: source가 확정한 방향은 **established build and verification stack**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하는 것: source가 확정한 방향은 **GCC/Clang Linux와 Clang macOS에서 지속적 evidence 확보**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하지 않는 것: source가 확정한 방향은 **matrix 밖 compiler/OS support를 의미하지 않음**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 성격: source가 확정한 방향은 **broad CI verification**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

## Invariant ledger

| SHA | Source에서 확정된 invariant 변화 | 해당 SHA에서 직접 확인한 코드 근거 | 아직 남은 위험/미보장 |
| --- | --- | --- | --- | --- |
| `6e78ced59357` | unit + compile-contract + CLI의 multi-layer verification pattern 시작 |  |  |
| `4bbbfd191669` | library 전체 public API/ownership negative contracts로 확대 |  |  |
| `01271d795d58` | repository 밖 consumer로 packaging/public-header isolation 검증 |  |  |
| `9e07d3bc86d3` | fixed-seed properties와 large-batch deterministic stress 추가 |  |  |
| `45e9bbfd6b75` | portable baseline과 platform checks 분리, ASan/UBSan prerequisite 구분 |  |  |
| `ab441fa8737c` | LP64 data model을 compile-time assertions로 executable claim화 |  |  |
| `50565bd67e03` | GCC/Clang, Linux/macOS matrix에서 established claims 연속 실행 |  |  |

## Failure → Fix → Test 연결

- 이 Thread는 한 개의 bug fix chain보다 verification blind spot을 단계적으로 줄이는 흐름입니다. 각 layer가 이전 layer가 증명하지 못한 무엇을 추가하는지 학습자가 기록하세요.

### 학습자 연결 기록
- 최초 위험/맹점:
- 이를 드러낸 실제 failure 또는 test gap:
- 수정/강화된 decision:
- 해당 코드 위치:
- 이를 고정하는 regression/evidence:

## Verification responsibility 변화

- Source 기준 흐름: behavior → API shape → external packaging → breadth/stress → portable/platform separation → ABI → compiler/platform matrix로 검증 책임이 확장됩니다.
- [ ] 각 layer가 실행되는 build/CI target과 prerequisite를 실제 코드에서 연결하세요.

## Thread 최종 상태

- Source가 확정한 최종 흐름: `unit behavior → compile-time public contract → process fixture → external consumer → deterministic property/stress → portable/platform check layers → ABI gate → CI matrix`
- [ ] 마지막 Thread SHA 시점에서 실제 type/function 호출 관계를 사용해 위 흐름을 다시 그리세요.
- [ ] Thread 시작 시점과 비교해 새로 보장되는 invariant를 정리하세요.
- [ ] source가 보장하지 않는 영역이나 외부 side effect/stream position 등 남는 경계를 실제 코드 근거로 적으세요.

## 최종 architecture 또는 execution flow 정리

다음 항목은 학습자가 실제 commit code를 읽은 뒤 완성합니다. 완성형 정답을 source 밖에서 추정해 채우지 않습니다.

```text
[입력/호출자]
    ↓
[검증/생성/후보 상태]
    ↓
[핵심 ownership/state transition]
    ↓
[commit/publication point]
    ↓
[output / observable state]

실패 분기:
[throw/failure source] → [cleanup owner] → [보존되는 prior state]
```

- 실제 caller → callee 흐름:
- 핵심 상태 필드:
- resource owner / borrowed view:
- commit point:
- cleanup path:
- 최종 invariant 설명:

## 학습 완료 자가 점검

- [ ] Commit map의 SHA/순서를 그대로 따라 모든 관련 code tree를 확인했습니다.
- [ ] final HEAD를 과거 commit 설명에 소급해서 사용하지 않았습니다.
- [ ] S/A/B importance에 맞는 깊이로 code/test evidence를 채웠습니다.
- [ ] source가 확정한 invariant와 제가 실제 코드에서 확인한 증거를 구분했습니다.
- [ ] failure path에서 state mutation 전후와 cleanup owner를 설명할 수 있습니다.
- [ ] test commit마다 production invariant, technique, production path, 증명/비증명 범위를 구분했습니다.
- [ ] Thread 마지막 상태를 commit history에 근거해 처음부터 끝까지 설명할 수 있습니다.
