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

- [x] verification layer별 입력, 실패 조건, 증명하는 계약, 증명하지 않는 범위를 구분할 수 있다.
- [x] public header isolation과 external archive consumption을 실제 build commands/tests에서 확인할 수 있다.
- [x] fixed seed, sanitizer, ABI assertion, CI matrix가 서로 중복되지 않는 증거를 제공하는 이유를 설명할 수 있다.
- [x] portable target과 platform target의 포함 관계 및 host prerequisite를 실제 Makefile/CI에서 복원할 수 있다.

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
- [x] contact subsystem tests가 unit, compile-contract, command-line fixture로 분리되는 build/test targets를 찾으세요.
- [x] positive compile test가 public header를 두 번 include하고 exported names만 사용하는 translation unit을 확인하세요.
- [x] private representation 접근을 의도적으로 시도해 compile-fail을 요구하는 negative contract를 확인하세요.
- [x] real binary session fixture가 ADD/LIST/invalid/QUIT transcript 전체 bytes를 비교하는 방식을 기록하세요.
- [x] 세 layer가 각각 domain behavior, API shape, process protocol 중 무엇을 검증하는지 구분하세요.
- [x] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [x] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

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
- 확인한 파일/심볼: `Makefile`의 contact unit/contract/integration targets; `tests/compile/contact_headers.cpp`, contact private-access negative translation unit; `tests/check_cli.sh`; contact unit tests와 실제 app binary.
- 핵심 코드 발췌 위치: `6e78ced59357`의 positive compile unit은 public contact header를 반복 include하고 exported API만 사용합니다. negative unit은 private representation 접근을 시도하며 harness는 compiler rejection을 success로 취급합니다. CLI script는 scripted ADD/LIST/invalid/QUIT session의 status와 exact bytes를 비교합니다.
- 변경 전/후 차이: in-process domain unit test 하나에서 public header shape와 실제 process protocol까지 서로 다른 failure 조건으로 검사하는 세 층 구조가 생겼습니다.
- 직접 확인한 ownership/lifetime/state 관계: unit layer는 `Contact`/`ContactBook` 값과 logical order를, compile layer는 const/private ownership boundary를, CLI layer는 app이 입력을 읽고 state를 갱신해 stdout/stderr로 내보내는 lifetime 전체를 관찰합니다.
- 직접 확인한 failure path: private member가 public이 되거나 header가 self-contained하지 않으면 compile contract가, command parsing/output가 바뀌면 transcript가 실패하도록 작성되어 있습니다. 이 commit의 범위는 contact subsystem이며 repository 전체 archive packaging이나 sanitizer evidence는 아직 아닙니다.
- 실행한 테스트와 결과: 미실행. target dependency, translation units, CLI fixture를 검사했으나 compiler/app command는 수행하지 않았습니다.
- 이 commit을 한 문장으로 설명: contact behavior, public API shape, real CLI session을 분리해 검증하는 기본 패턴을 만들었습니다.

### `4bbbfd191669` — test(contracts): 공개 include와 소유권 규칙 검증

- Importance: **A**
- Tags: **API, TEST, OWNERSHIP**
- Source 역할: library 전체 positive/negative public contract를 확장합니다.
- Source classification summary: Expands positive and negative compile contracts across every public header and ownership boundary.

#### 핵심 설계 / failure boundary 확인
- [x] 필요하면 직전 관련 SHA `6e78ced59357`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [x] library 전체 public headers를 대상으로 하는 positive consumer translation units와 link step을 확인하세요.
- [x] abstract interface, protected/private construction, explicit conversion, const access, utility non-construction, list-backed sorting, pointer signature를 각각 어떤 negative file이 거부하는지 분류하세요.
- [x] negative compile test가 "실행 결과"가 아니라 compiler rejection 자체를 expected success로 다루는 harness를 확인하세요.
- [x] private include path 없이 archive와 public include만으로 contract가 성립하는지 build command를 기록하세요.
- [x] runtime tests가 통과해도 API widening/encapsulation regression을 이 layer가 어떻게 잡는지 예시 하나를 실제 test와 연결하세요.
- [x] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [x] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

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
- 확인한 파일/심볼: `Makefile`의 `PUBLIC_CPPFLAGS := -Iinclude`, `test-contract`, public-contract link rule; `tests/compile/public_headers.cpp`와 subsystem positive units; abstract/private/const/explicit/list-sort 등 negative units.
- 핵심 코드 발췌 위치: `4bbbfd191669:Makefile`의 positive commands는 `-Iinclude ... -fsyntax-only`만 사용하고, negative commands는 `@! $(CXX) ... -fsyntax-only <fail.cpp>`로 rejection을 기대합니다. public integration binary도 public include path와 archive만 링크합니다.
- 변경 전/후 차이: contact 한 영역의 compile contract가 모든 installed public headers와 주요 ownership/API restrictions로 확대되었습니다.
- 직접 확인한 ownership/lifetime/state 관계: compile suite는 `TextBuffer` 내부 storage/implicit conversion, formatter abstractness, creator/builder construction, scalar/RPN utility construction, runtime type access, serializer pointer/const shape, batch result mutability, template const iterator와 container requirement를 compiler-visible boundary로 고정합니다.
- 직접 확인한 failure path: 허용 API가 빠지거나 private header가 필요하면 positive unit이 실패하고, 금지 API가 우연히 열리면 expected-fail unit이 성공해 Make target이 실패합니다. 이 layer는 compiler rejection을 증명할 뿐 runtime output, exception cleanup, leak freedom은 별도 evidence가 필요합니다.
- 실행한 테스트와 결과: 미실행. compile command와 positive/negative file set을 검사했으나 compiler는 실행하지 않았습니다.
- 이 commit을 한 문장으로 설명: public include만으로 허용·금지 API shape를 repository 전체에서 compiler 계약으로 만들었습니다.

### `01271d795d58` — test(consumer): 저장소 밖 공개 library 연결 검증

- Importance: **A**
- Tags: **API, INTEGRATION, PORTABILITY**
- Source 역할: repository 밖에서 public library consumer를 compile/run합니다.
- Source classification summary: Builds and runs a consumer outside the repository using only public headers and the archive.

#### 핵심 설계 / failure boundary 확인
- [x] 필요하면 직전 관련 SHA `4bbbfd191669`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [x] temporary consumer directory가 repository tree 밖에 생성되는 setup과 cleanup trap을 확인하세요.
- [x] compiler include path가 exported include directory만, linker input이 `libcpp_foundation.a`만 사용하도록 제한되는 command를 기록하세요.
- [x] consumer가 test-only helper 없이 실제 public objects를 사용하는 source를 확인하세요.
- [x] working-directory assumption, private include, unarchived object가 있으면 어느 compile/link/run 단계에서 실패하는지 추적하세요.
- [x] external location에서 executable을 실제 run하는 단계까지 포함되는지 확인하세요.
- [x] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [x] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

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
- 확인한 파일/심볼: `tests/check_external_consumer.sh`, `tests/consumer/external_main.cpp`, `Makefile`의 `test-consumer`와 `test-integration`, `libcpp_foundation.a`.
- 핵심 코드 발췌 위치: `01271d795d58:tests/check_external_consumer.sh`는 `${TMPDIR:-/tmp}` 아래 `mktemp -d`로 외부 디렉터리를 만들고 consumer source를 복사합니다. compiler에는 `-I"$project_root/include"`, copied `main.cpp`, 전달받은 absolute archive만 주고 그 디렉터리에서 executable을 실행합니다.
- 변경 전/후 차이: repository 내부 translation unit/link에서 실제 out-of-tree consumer compile/link/run으로 packaging 검증이 확장되었습니다.
- 직접 확인한 ownership/lifetime/state 관계: cleanup trap이 copied source와 executable을 삭제하고 temporary directory를 제거합니다. consumer는 test support나 source object를 직접 소유·링크하지 않고 exported headers와 static archive만 사용합니다.
- 직접 확인한 failure path: private include, working-directory-relative asset, archive에 빠진 symbol/object가 있으면 compile/link/run 중 실패합니다. compiler 존재와 argument/archive file은 script가 먼저 검사합니다. 한 compiler command/host의 consumer일 뿐 모든 downstream build system을 증명하지는 않습니다.
- 실행한 테스트와 결과: 미실행. script의 exact command와 cleanup/run scope를 검사했으나 외부 consumer를 실제 컴파일하지 않았습니다.
- 이 commit을 한 문장으로 설명: public headers와 정적 archive만으로 repository 밖 consumer가 실제 실행되는 packaging boundary를 검사합니다.

### `9e07d3bc86d3` — test(boundary): 변환·배치 속성과 대용량 경계 검증

- Importance: **A**
- Tags: **TEST, DETERMINISM, EDGE**
- Source 역할: fixed-seed properties와 large-batch stress를 추가합니다.
- Source classification summary: Adds fixed-seed scalar/RPN properties and a 4,096-job batch stress check.

#### 핵심 설계 / failure boundary 확인
- [x] 필요하면 직전 관련 SHA `01271d795d58`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [x] fixed linear-congruential seed와 first-counterexample reporting을 구현한 property test driver를 찾으세요.
- [x] generated integer literals가 4-line scalar output과 trailing invalid byte rejection을 어떻게 반복 검증하는지 확인하세요.
- [x] bounded binary RPN expressions를 direct computation과 비교하는 oracle 구성과 overflow 회피 범위를 확인하세요.
- [x] 4,096-job / 200KB 이상 batch의 생성, 독립 sort oracle, record-by-record comparison, repeated serialization 검증을 추적하세요.
- [x] deterministic seed가 breadth를 늘리면서 flaky randomness를 피하는 구조를 실제 test inputs와 counterexample output에서 확인하세요.
- [x] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [x] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

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
- 확인한 파일/심볼: `tests/property/test_boundary_properties.cpp`의 fixed LCG, scalar/RPN properties, `ExpectedJob` oracle, large batch; `tests/run_with_timeout.sh`; `Makefile`의 `test-property`.
- 핵심 코드 발췌 위치: `9e07d3bc86d3:tests/property/test_boundary_properties.cpp`는 seed `0x13579BDF`, LCG `state * 1103515245 + 12345`, first-counterexample text를 사용합니다. scalar 2,048개, bounded binary RPN 4,096개, 4,096-job·200KB 초과 batch를 생성합니다.
- 변경 전/후 차이: hand-written boundaries를 대체하지 않고 reproducible generated breadth와 large allocation/sort/output growth를 추가했습니다.
- 직접 확인한 ownership/lifetime/state 관계: scalar는 exact int line·4 newlines·repeatability·trailing `x` rejection/empty output을 확인합니다. RPN은 overflow를 피한 bounded direct arithmetic oracle와 비교하고, batch는 독립 `ExpectedJob` vector를 `std::sort`한 뒤 record-by-record 및 repeated bytes를 비교합니다.
- 직접 확인한 failure path: 실패 시 fixed seed와 첫 counterexample을 출력해 재현 가능하게 합니다. timeout wrapper는 hang/과도한 runtime을 별도 failure로 만듭니다. fixed finite sample이므로 formal exhaustive proof나 임의 seed 다양성은 제공하지 않습니다.
- 실행한 테스트와 결과: 미실행. generator, oracle, counts, timeout target을 검사했으나 property binary는 실행하지 않았습니다.
- 이 commit을 한 문장으로 설명: 고정 seed 속성 검사와 4,096-job stress로 deterministic 검증 폭을 넓혔습니다.

### `45e9bbfd6b75` — build(check): sanitizer와 portable 검사 계층 구성

- Importance: **A**
- Tags: **ARCH, PORTABILITY, TEST**
- Source 역할: build/portable/platform checks를 분리하고 ASan/UBSan 역할을 구분합니다.
- Source classification summary: Separates build, portable, and platform verification while adding ASan and UBSan layers.

#### 핵심 설계 / failure boundary 확인
- [x] 필요하면 직전 관련 SHA `9e07d3bc86d3`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [x] Makefile/check targets에서 build, portable, platform layer가 어떤 dependency graph로 재구성되는지 그리세요.
- [x] clean rebuild, tests, compiler contracts, archive, external consumer, properties, UBSan 중 portable baseline에 포함되는 항목을 실제 target prerequisite로 확인하세요.
- [x] ASan과 host-specific release inspection이 별도 platform checks로 분리되는 이유를 prerequisites/commands에서 확인하세요.
- [x] aggregate target이 unavailable host tool 때문에 portable checks까지 생략하지 않도록 구성된 branch/gating을 기록하세요.
- [x] reconstruction, incremental no-op, deterministic artifact 검증이 어느 layer에서 실행되는지 찾으세요.
- [x] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [x] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.



#### 다음 관련 commit과 연결
- 다음 Thread SHA `ab441fa8737c`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼: `Makefile`의 `test-asan`, `test-ubsan`, `test-sanitize`, `check-build`, `check-portable`, `check-platform`, `check`; archive/dependency/leak/determinism scripts.
- 핵심 코드 발췌 위치: `45e9bbfd6b75:Makefile`에서 `check-build`는 diff check, clean rebuild, `test`, deterministic CLI 두 번, incremental `make -q all`을 수행합니다. `check-portable`은 여기에 UBSan을 추가하고 `check-platform`은 archive/dependency/leak scripts만 실행합니다.
- 변경 전/후 차이: 하나의 검사 묶음을 portable baseline과 host/tool-dependent release inspection으로 분리하고 ASan/UBSan binary/targets를 별도로 만들었습니다.
- 직접 확인한 ownership/lifetime/state 관계: `test` 아래 unit, deterministic failure injection, no-elide, compile contract, CLI/public integration, external consumer, property test가 모입니다. UBSan은 `check-portable` dependency이고, ASan은 standalone `test-asan`/`test-sanitize`로 남아 host capability에 따라 선택됩니다.
- 직접 확인한 failure path: portable checks는 host-specific `ar`/dependency/leak inspection 실패 때문에 생략되지 않고, timeout wrapper와 sanitizer halt options가 UB/memory error를 target failure로 만듭니다. **관찰된 차이:** scaffold 문구와 달리 이 SHA의 `check-platform`에는 ASan이 포함되지 않으며 aggregate `check`도 ASan을 호출하지 않습니다. ASan matrix 실행은 후속 CI commit에서 추가됩니다.
- 실행한 테스트와 결과: 미실행. Make dependency graph와 commands를 검사했으나 sanitizer/host utility를 실행하지 않았습니다.
- 이 commit을 한 문장으로 설명: portable regression·UBSan과 host-specific release inspection을 분리하고 ASan을 별도 capability target으로 제공했습니다.

### `ab441fa8737c` — test(portability): 지원 LP64 데이터 모델 검증

- Importance: **B**
- Tags: **PORTABILITY, API**
- Source 역할: 지원 LP64 ABI assumptions를 executable check로 만듭니다.
- Source classification summary: Adds compile-time LP64 data-model assertions.

#### Thread 흐름에서 확인할 구현 역할
- [x] 직전 관련 SHA `45e9bbfd6b75`와의 차이 중 이 Thread의 흐름에 필요한 부분만 확인하세요.
- [x] CHAR_BIT/short/int/long/pointer/size_t 크기를 compile-time에 assert하는 translation unit을 확인하세요.
- [x] expected data model이 8-bit byte, 2-byte short, 4-byte int, 8-byte long/pointer/size_t임을 test expression에서 확인하세요.
- [x] 이 check가 scalar limits, RPN `long`, allocation size, pointer token 중 어떤 subsystem assumptions와 연결되는지 source references를 찾아 적으세요.
- [x] 지원하지 않는 ABI에서 runtime 오동작 대신 compile-time failure로 끝나는 harness 동작을 확인하세요.
- [x] 이 commit이 다음 관련 commit의 전제가 되는 상태/계약을 한 문단으로 기록하세요.

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
- 확인한 파일/심볼: `tests/portability/test_data_model.cpp`; `Makefile`의 `DATA_MODEL_BIN`, `check-data-model`, `check-build` dependency.
- 핵심 코드 발췌 위치: `ab441fa8737c:tests/portability/test_data_model.cpp`는 `CHAR_BIT == 8`, `sizeof(short)==2`, `sizeof(int)==4`, `sizeof(long)==8`, pointer/`size_t` 8을 `const bool lp64`로 계산하고 false면 diagnostic 후 `return 1` 합니다.
- 변경 전/후 차이: 지원 data model 가정이 문서상의 전제에서 executable gate로 추가되어 `check-build`가 실제 binary를 실행하게 되었습니다.
- 직접 확인한 ownership/lifetime/state 관계: 이 check는 scalar/RPN의 `long` 범위, `size_t`/pointer 크기 등 build가 전제한 host representation을 production 실행 전 verification 단계에서 판정합니다.
- 직접 확인한 failure path: unsupported model은 test executable이 성공적으로 compile된 뒤 runtime에 exit 1로 끝납니다. **관찰된 차이:** scaffold에는 compile-time assertion/compile-time failure로 고정되어 있지만 해당 SHA의 실제 코드는 static/typedef assertion이 아니라 runtime `bool`과 exit status를 사용합니다. 고정 scaffold text는 유지하고 이 불일치를 여기에 기록합니다.
- 실행한 테스트와 결과: 미실행. source와 Make target을 검사했으나 data-model binary를 compile/run하지 않았습니다.
- 이 commit을 한 문장으로 설명: LP64 전제를 executable runtime gate로 만들었으며, scaffold의 compile-time 설명과 실제 구현에는 차이가 있습니다.

### `50565bd67e03` — ci: 지원 compiler와 platform matrix 검증

- Importance: **B**
- Tags: **PORTABILITY, TEST**
- Source 역할: established claims를 GCC/Clang, Linux/macOS matrix에서 실행합니다.
- Source classification summary: Adds GCC/Clang Linux and Clang macOS CI with sanitizer coverage.

#### Thread 흐름에서 확인할 구현 역할
- [x] 직전 관련 SHA `ab441fa8737c`와의 차이 중 이 Thread의 흐름에 필요한 부분만 확인하세요.
- [x] CI matrix에서 GCC/Clang Linux와 Clang macOS 조합을 실제 configuration으로 확인하세요.
- [x] 각 job이 어떤 established build/check target을 실행하는지 기록하세요.
- [x] matrix fail-fast disabled 설정이 한 job 실패 시 다른 evidence를 계속 수집하도록 하는지 확인하세요.
- [x] UBSan은 어디서 공통 실행되고 ASan은 어느 host로 제한되는지 configuration을 확인하세요.
- [x] minimal permissions와 explicit timeout가 실제 workflow에 선언되어 있는지 확인하세요.
- [x] 이 commit이 다음 관련 commit의 전제가 되는 상태/계약을 한 문단으로 기록하세요.

#### Test commit 학습 구분
- 대상 production invariant: source가 확정한 방향은 **supported compiler/platform matrix**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 재현 failure / boundary: source가 확정한 방향은 **compiler/OS-specific regression**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- test technique: source가 확정한 방향은 **CI matrix with sanitizer/check targets**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 통과하는 production path: source가 확정한 방향은 **established build and verification stack**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하는 것: source가 확정한 방향은 **GCC/Clang Linux와 Clang macOS에서 지속적 evidence 확보**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하지 않는 것: source가 확정한 방향은 **matrix 밖 compiler/OS support를 의미하지 않음**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 성격: source가 확정한 방향은 **broad CI verification**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.

#### 학습자 기록
- 확인한 파일/심볼: `.github/workflows/ci.yml`; `Makefile`의 `check-build`, `test-ubsan`, `test-asan`, `check-data-model`.
- 핵심 코드 발췌 위치: `50565bd67e03:.github/workflows/ci.yml`은 ubuntu-22.04 GCC, ubuntu-22.04 Clang, macOS latest Clang matrix를 정의하고 `fail-fast: false`, `timeout-minutes: 30`, `contents: read`를 설정합니다. 모든 job은 `make check-build`, UBSan을 실행하고 ASan은 Linux 두 job만 실행합니다.
- 변경 전/후 차이: local executable checks를 compiler/OS matrix에서 반복 실행하는 workflow가 추가되었습니다. `check-build`에는 runtime LP64 gate가 포함됩니다.
- 직접 확인한 ownership/lifetime/state 관계: 각 clean GitHub checkout이 독립 workspace를 소유하고 selected compiler를 `CXX`로 Make targets에 전달합니다. matrix job별 artifact/state는 공유하지 않으므로 compiler/OS-specific failure가 다른 evidence를 덮지 않습니다.
- 직접 확인한 failure path: compiler 선택, build/regression/data-model, UBSan, Linux ASan 중 하나가 nonzero면 해당 job이 실패합니다. `fail-fast: false`라 다른 matrix job은 계속됩니다. **보장 경계:** workflow push trigger는 `main`만이며 PR에도 실행됩니다. 또한 CI는 `make check-platform`/`make check`를 호출하지 않아 archive/dependency/leak scripts는 이 matrix evidence에 포함되지 않습니다. 실제 workflow run 결과는 검사하지 않았습니다.
- 실행한 테스트와 결과: 미실행. workflow configuration과 호출 target만 검사했으며 GitHub Actions run 성공을 주장하지 않습니다.
- 이 commit을 한 문장으로 설명: GCC/Clang Linux와 Clang macOS에서 build·regression·LP64·UBSan 및 Linux ASan을 반복하도록 구성했습니다.

## Invariant ledger

| SHA | Source에서 확정된 invariant 변화 | 해당 SHA에서 직접 확인한 코드 근거 | 아직 남은 위험/미보장 |
| --- | --- | --- | --- | --- |
| `6e78ced59357` | unit + compile-contract + CLI의 multi-layer verification pattern 시작 | contact unit, repeated public-header compile, private-access expected failure, exact CLI session fixture가 behavior/API/process 층을 분리합니다. | repository 전체 public contract, external packaging, sanitizer/ABI matrix는 아직 없습니다. |
| `4bbbfd191669` | library 전체 public API/ownership negative contracts로 확대 | `-Iinclude`만 사용하는 positive syntax units와 expected-fail API/ownership units, public archive link rule을 확인했습니다. | runtime behavior와 leak/exception cleanup은 compiler contract만으로 증명되지 않습니다. |
| `01271d795d58` | repository 밖 consumer로 packaging/public-header isolation 검증 | 외부 temporary directory에서 copied consumer를 public include + absolute static archive만으로 compile/link/run하고 trap으로 정리합니다. | 한 host/compiler consumer이며 모든 downstream build system/platform을 포괄하지 않습니다. |
| `9e07d3bc86d3` | fixed-seed properties와 large-batch deterministic stress 추가 | fixed LCG seed, scalar 2,048, RPN 4,096, 4,096-job large batch와 first-counterexample reporting을 확인했습니다. | 유한 fixed sample이므로 exhaustive/formal proof는 아닙니다. |
| `45e9bbfd6b75` | portable baseline과 platform checks 분리, ASan/UBSan prerequisite 구분 | `check-build`/`check-portable`/`check-platform` dependency와 UBSan/ASan standalone targets를 확인했습니다. | 실제 `check-platform`/aggregate `check`에는 ASan이 포함되지 않아 scaffold 표현과 차이가 있습니다. |
| `ab441fa8737c` | LP64 data model을 compile-time assertions로 executable claim화 | LP64 sizes를 `const bool`로 검사하고 false에서 exit 1인 executable과 `check-data-model` target을 확인했습니다. | compile-time assertion이 아니라 runtime gate라는 scaffold/implementation 불일치가 있으며 LP64 내부 차이는 남습니다. |
| `50565bd67e03` | GCC/Clang, Linux/macOS matrix에서 established claims 연속 실행 | ubuntu GCC/Clang, macOS Clang matrix가 check-build·UBSan·Linux ASan을 fail-fast false로 실행하도록 구성됩니다. | push는 main만이며 check-platform/archive/dependency/leak와 matrix 밖 host/compiler는 지원 증거가 아닙니다. |

## Failure → Fix → Test 연결

- 이 Thread는 한 개의 bug fix chain보다 verification blind spot을 단계적으로 줄이는 흐름입니다. 각 layer가 이전 layer가 증명하지 못한 무엇을 추가하는지 학습자가 기록하세요.

### 학습자 연결 기록
- 최초 위험/맹점: in-tree unit tests가 통과해도 public header가 private include에 의존하거나, archive가 빠진 object를 숨기거나, API가 우연히 넓어지거나, 특정 compiler/ABI에서만 실패할 수 있습니다.
- 이를 드러낸 실제 failure 또는 test gap: runtime output은 abstractness/const/private shape를 보지 못하고, in-tree link는 relative path와 loose objects를 숨기며, hand-written fixtures는 state-space breadth와 large growth를 제한합니다. 단일 host 실행은 sanitizer/ABI/compiler 차이를 보여 주지 못합니다.
- 수정/강화된 decision: behavior, positive/negative compile, CLI, out-of-tree consumer, fixed-seed property/stress, portable/host target, LP64 gate, CI matrix를 서로 다른 failure 조건으로 누적합니다.
- 해당 코드 위치: `6e78ced59357`~`50565bd67e03`의 `Makefile`, `tests/compile/`, `tests/check_external_consumer.sh`, `tests/property/test_boundary_properties.cpp`, `tests/portability/test_data_model.cpp`, `.github/workflows/ci.yml`.
- 이를 고정하는 regression/evidence: 각 layer 자체가 이전 layer가 볼 수 없는 failure를 nonzero build/test/compile/run status로 드러냅니다. 다만 data-model check는 scaffold 설명과 달리 runtime이며 CI는 check-platform을 실행하지 않는다는 한계를 함께 기록합니다.

## Verification responsibility 변화

- Source 기준 흐름: behavior → API shape → external packaging → breadth/stress → portable/platform separation → ABI → compiler/platform matrix로 검증 책임이 확장됩니다.
- [x] 각 layer가 실행되는 build/CI target과 prerequisite를 실제 코드에서 연결하세요.

### 코드 검사로 복원한 변화

1. `6e78ced59357`: verification 책임이 contact behavior에서 compile-time API shape와 real process transcript로 확장됩니다.
2. `4bbbfd191669`: public-only positive/negative compiler 계약이 library 전체 API와 ownership restrictions를 다룹니다.
3. `01271d795d58`: packaging 책임이 repository 밖 compile/link/run으로 이동해 in-tree assumptions를 제거합니다.
4. `9e07d3bc86d3`: fixed-seed generated inputs와 large batch가 deterministic breadth와 growth를 검증합니다.
5. `45e9bbfd6b75`: portable baseline/UBSan과 host-specific archive/dependency/leak checks, standalone ASan capability가 분리됩니다.
6. `ab441fa8737c`: LP64 가정이 runtime executable gate가 됩니다. scaffold의 compile-time 표현과 실제 code 차이를 명시했습니다.
7. `50565bd67e03`: clean Linux/macOS compiler jobs가 build/regression/data-model/UBSan 및 Linux ASan을 반복합니다. check-platform은 CI 범위 밖입니다.

## Thread 최종 상태

- Source가 확정한 최종 흐름: `unit behavior → compile-time public contract → process fixture → external consumer → deterministic property/stress → portable/platform check layers → ABI gate → CI matrix`
- [x] 마지막 Thread SHA 시점에서 실제 type/function 호출 관계를 사용해 위 흐름을 다시 그리세요.
- [x] Thread 시작 시점과 비교해 새로 보장되는 invariant를 정리하세요.
- [x] source가 보장하지 않는 영역이나 외부 side effect/stream position 등 남는 경계를 실제 코드 근거로 적으세요.

### 완성된 Thread 해석

마지막 Thread SHA 기준으로 verification stack은 unit/failure/no-elide tests, public-only positive/negative compiler contracts, real CLI/public integration, out-of-tree consumer, fixed-seed property/stress, deterministic rebuild/output, runtime LP64 gate, UBSan/ASan targets, compiler/OS CI matrix로 구성됩니다. 각 층은 동일한 "테스트 통과"를 반복하는 것이 아니라 source behavior, API shape, packaging, state-space breadth, UB/memory fault, ABI, toolchain variation을 서로 다른 방식으로 관찰합니다.

시작 시점과 비교하면 support claim이 in-tree contact behavior에서 exported archive와 특정 GCC/Clang LP64 hosts까지 넓어졌습니다. 하지만 실제 증거는 구성 코드를 검사한 것이며 실행 결과는 없습니다. 또 data-model check는 compile-time이 아니라 runtime이고, CI는 host-specific `check-platform`을 실행하지 않으며 push trigger는 main에 제한됩니다. 따라서 matrix 밖 compiler/OS와 archive/dependency/leak의 CI 지속 실행은 주장할 수 없습니다.

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

- 실제 caller → callee 흐름: source/build change → unit/failure/no-elide → public positive/negative compile → CLI/public integration → external consumer → fixed-seed property/stress → `check-build`/LP64 gate → UBSan/ASan → GitHub Actions compiler/OS jobs.
- 핵심 상태 필드: Make target dependency graph, compile translation units, fixture expected bytes, property `random_state`/`first_failure`, runtime `lp64` bool, CI matrix entries and conditions.
- resource owner / borrowed view: each test process owns its temporary objects; external-consumer script owns and traps a temporary directory; CI jobs own isolated checkouts. Public consumers borrow only installed headers/API and link the archive.
- commit point: 각 verification layer는 compiler/linker/process exit status와 exact assertion/byte comparison으로 claim을 승인합니다. CI job은 모든 configured step success일 때만 green입니다.
- cleanup path: compile/run failure는 nonzero로 상위 Make/CI를 중단하고 scripts/traps가 temporary files를 제거합니다. sanitizer는 configured halt option으로 첫 detected fault를 failure로 만듭니다.
- 최종 invariant 설명: supportable claim은 단일 unit result가 아니라 public API isolation, external packaging, deterministic behavior, LP64 runtime gate, selected sanitizer와 compiler/OS configuration에서 실행 가능하도록 코드화되어 있습니다. 구성 밖 platform과 실행되지 않은 target은 보장으로 확대하지 않습니다.

### 실행 검증 범위

이 문서의 구현·테스트 설명은 지정 SHA의 diff와 당시 파일을 GitHub 저장소에서 직접 검사해 복원했습니다. 현재 컨테이너에서는 GitHub checkout에 필요한 네트워크 연결이 차단되어 build/test command를 실행하지 못했습니다. 따라서 아래 체크 표시는 코드·테스트 구현을 확인했다는 의미이며, 실행 결과를 의미하지 않습니다.

## 학습 완료 자가 점검

- [x] Commit map의 SHA/순서를 그대로 따라 모든 관련 code tree를 확인했습니다.
- [x] final HEAD를 과거 commit 설명에 소급해서 사용하지 않았습니다.
- [x] S/A/B importance에 맞는 깊이로 code/test evidence를 채웠습니다.
- [x] source가 확정한 invariant와 제가 실제 코드에서 확인한 증거를 구분했습니다.
- [x] failure path에서 state mutation 전후와 cleanup owner를 설명할 수 있습니다.
- [x] test commit마다 production invariant, technique, production path, 증명/비증명 범위를 구분했습니다.
- [x] Thread 마지막 상태를 commit history에 근거해 처음부터 끝까지 설명할 수 있습니다.
