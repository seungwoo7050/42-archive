# Header-only Public Surface and Automated Acceptance

## 1. Thread 목표

### Source-established significance

A header-only library can appear correct inside one monolithic test while still depending on include order, emitting duplicate definitions, or compiling only under one toolchain. This progression expands the acceptance boundary from a convenience include, to independently self-contained headers, to a real linked consumer, and finally to sanitizer and cross-platform automation. These commits do not define the core containers, but they make the finished public surface reproducible and consumable outside the repository's internal test arrangement.

### 이 Thread에서 복원할 것

- 위 significance가 설명하는 변화 과정을 각 commit의 실제 SHA 코드로 재구성합니다.
- source가 확정한 commit 역할과 importance를 바꾸지 않고, 실제 implementation/failure/test 근거만 직접 채웁니다.

### Source에서 직접 연결되는 architecture

- Verification is layered: public differential tests, targeted edge and failure tests, iterator-state tests, a constrained internal tree inspector, deterministic randomized operations, complexity bounds, independent-header compilation, linked consumer tests, sanitizers, and compiler/platform CI.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- header-only library가 monolithic test 하나를 통과해도 consumer에게 깨질 수 있는 이유는 무엇인가?
- aggregate header smoke, independent-header compile, multi-TU link가 서로 다른 어떤 failure class를 잡는가?
- sanitizer build를 normal build와 격리해야 하는 이유는 무엇인가?
- CI matrix가 C++98 portability와 memory-safety acceptance를 어떻게 repeatable contract로 만드는가?

## 3. 완료 기준

- B: Thread 흐름에서 맡는 구현 역할, 필요한 상태 변화와 핵심 코드 위치를 해당 SHA 기준으로 확인할 수 있어야 합니다.
- C: Thread 이해에 필요한 맥락과 최소 검증 포인트만 확인합니다. S/A와 같은 깊이의 분석을 강제하지 않습니다.
- 모든 commit은 해당 SHA의 코드 또는 test/build diff를 근거로 기록합니다.
- Thread 최종 설명은 source 요약을 복사하는 것으로 끝내지 않고, 직접 확인한 코드 근거와 commit 간 변화로 재구성합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source-established role |
| --- | --- | --- | --- | --- | --- |
| 1 | `80e169e83212` | `feat(headers): 공용 도구와 순차 컨테이너 통합 헤더 추가` | B | PUBLIC_API, ARCH | Introduces the aggregate header. |
| 2 | `3c64a69dd252` | `test(headers): 통합 헤더의 순차 컨테이너 표면 검증` | C | TEST, PUBLIC_API | Confirms the current sequential surface compiles through that bundle. |
| 3 | `112af1753538` | `feat(map): 관계 연산과 통합 공개 헤더 완성` | B | PUBLIC_API, RB_TREE | Adds map to the aggregate public entry point. |
| 4 | `d938c0079994` | `test(headers): 공개 헤더를 각각 독립 compile` | B | TEST, PUBLIC_API, CXX98 | Compiles every public header independently as the first include. |
| 5 | `072c49832ddc` | `test(consumer): 다중 번역 단위 공개 헤더 사용 검증` | B | TEST, PUBLIC_API, INTEGRATION | Links independent vector and map consumers in multiple translation units. |
| 6 | `1be03ae8daef` | `build(makefile): 격리된 sanitizer 검사 대상 추가` | B | PUBLIC_API, PRACTICAL, RISK | Runs the complete acceptance surface under isolated ASan/UBSan instrumentation. |
| 7 | `228f457988be` | `ci: compiler 행렬과 sanitizer 검사 구성` | B | CXX98, PUBLIC_API, PRACTICAL | Automates compiler, platform, and sanitizer checks in CI. |

## 5. Commit별 학습 기록

### 1. feat(headers): 공용 도구와 순차 컨테이너 통합 헤더 추가

- SHA: `80e169e83212`
- Importance: B
- Tags: PUBLIC_API, ARCH
- Source-established role: Introduces the aggregate header.
- Source summary: Adds an aggregate public header for the utility layer, vector, and stack.
- Source rationale: This creates a deliberate packaging boundary for a header-only library. It matters to consumers, but the implementation is simple composition rather than a major runtime or ownership decision.

#### 해당 SHA에서 확인할 실제 코드

- `ft_containers.hpp`가 traits/iterators/algorithms/pair/vector/stack의 aggregate entry point로 어떤 component headers를 include하는지 확인합니다.
- component header를 직접 include하는 경로가 제거되지 않았는지 공개 surface 관점에서 확인합니다.
- 이 commit은 runtime behavior가 아니라 packaging boundary를 만든다는 source 역할과 실제 diff가 일치하는지 기록합니다.
- 확인한 파일/심볼: [직접 기록]
- 필요한 경우 비교할 직전 관련 SHA/parent: [직접 기록]

#### 설계·상태 변화 기록

- 이 commit 직전 상태: [직접 작성]
- 해결하려던 문제: [직접 작성]
- 선택한 결정: [직접 작성]
- 새로 생긴 책임 경계 또는 상태 변화: [직접 작성]

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: [직접 작성]
- 핵심 코드와 상태 변화: [직접 작성]
- 다음 commit에 넘기는 전제: [직접 작성]


### 2. test(headers): 통합 헤더의 순차 컨테이너 표면 검증

- SHA: `3c64a69dd252`
- Importance: C
- Tags: TEST, PUBLIC_API
- Source-established role: Confirms the current sequential surface compiles through that bundle.
- Source summary: Switches the existing test to include the aggregate header instead of component headers.
- Source rationale: The change is a small integration smoke test for one include list. It adds little new technical evidence beyond confirming that the bundle contains the already tested headers.

#### 해당 SHA에서 확인할 실제 코드

- 기존 consumer-style test가 component headers 대신 aggregate header 하나만 include하도록 바뀐 diff를 확인합니다.
- runtime assertion 자체는 바뀌지 않았는지 확인하여 failure가 public header composition 문제로 귀속되는 구조를 기록합니다.
- 확인한 파일/심볼: [직접 기록]
- 필요한 경우 비교할 직전 관련 SHA/parent: [직접 기록]

#### Test/verification 학습 기록

- 대상 production invariant: [직접 작성]
- 재현하는 failure 또는 boundary: [직접 작성]
- test technique: [differential / failure injection / white-box / deterministic random / structural bound 등 실제 코드 기준]
- 통과하는 production 코드 경로: [직접 작성]
- 이 테스트가 증명하는 것: [직접 작성]
- 이 테스트가 증명하지 않는 것: [직접 작성]
- 성격: [broad integration인지 deterministic regression인지 근거 포함]
- 후속 변경에서 막아야 하는 회귀: [직접 작성]

#### C-level 최소 확인

- Thread 이해에 필요한 맥락: [직접 작성]
- 최소 코드/검증 근거: [직접 작성]


### 3. feat(map): 관계 연산과 통합 공개 헤더 완성

- SHA: `112af1753538`
- Importance: B
- Tags: PUBLIC_API, RB_TREE
- Source-established role: Adds map to the aggregate public entry point.
- Source summary: Adds map value comparison, relational operators, non-member swap, and inclusion in the aggregate header.
- Source rationale: This completes the baseline public surface through established shared algorithms. It is useful integration work without a new core data-structure decision.

#### 해당 SHA에서 확인할 실제 코드

- `ft_containers.hpp`에 map이 추가된 include diff를 확인합니다.
- 같은 SHA에서 map relations/value comparator/non-member swap이 공개 surface에 완성되는 위치를 확인하되, 이 Thread에서는 aggregate header로 노출되는 경계에 초점을 둡니다.
- aggregate consumer가 internal include graph를 알 필요 없이 map까지 사용할 수 있는지 해당 SHA의 test/include 관계로 확인합니다.
- 확인한 파일/심볼: [직접 기록]
- 필요한 경우 비교할 직전 관련 SHA/parent: [직접 기록]

#### 설계·상태 변화 기록

- 이 commit 직전 상태: [직접 작성]
- 해결하려던 문제: [직접 작성]
- 선택한 결정: [직접 작성]
- 새로 생긴 책임 경계 또는 상태 변화: [직접 작성]

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: [직접 작성]
- 핵심 코드와 상태 변화: [직접 작성]
- 다음 commit에 넘기는 전제: [직접 작성]


### 4. test(headers): 공개 헤더를 각각 독립 compile

- SHA: `d938c0079994`
- Importance: B
- Tags: TEST, PUBLIC_API, CXX98
- Source-established role: Compiles every public header independently as the first include.
- Source summary: Compiles each public header independently as the first include in a minimal translation unit.
- Source rationale: This enforces header self-containment and catches accidental transitive dependencies, an important header-only API practice. It is significant integration hygiene rather than core container logic.

#### 해당 SHA에서 확인할 실제 코드

- 각 public header마다 정확히 하나의 library header를 first include하는 minimal translation unit 목록을 확인합니다.
- 각 translation unit이 representative operation을 instantiate하여 선언뿐 아니라 필요한 template dependency까지 컴파일하는지 확인합니다.
- Makefile의 dedicated `headers` target과 object output 경로를 확인합니다.
- 확인한 파일/심볼: [직접 기록]
- 필요한 경우 비교할 직전 관련 SHA/parent: [직접 기록]

#### Test/verification 학습 기록

- 대상 production invariant: [직접 작성]
- 재현하는 failure 또는 boundary: [직접 작성]
- test technique: [differential / failure injection / white-box / deterministic random / structural bound 등 실제 코드 기준]
- 통과하는 production 코드 경로: [직접 작성]
- 이 테스트가 증명하는 것: [직접 작성]
- 이 테스트가 증명하지 않는 것: [직접 작성]
- 성격: [broad integration인지 deterministic regression인지 근거 포함]
- 후속 변경에서 막아야 하는 회귀: [직접 작성]

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: [직접 작성]
- 핵심 코드와 상태 변화: [직접 작성]
- 다음 commit에 넘기는 전제: [직접 작성]


### 5. test(consumer): 다중 번역 단위 공개 헤더 사용 검증

- SHA: `072c49832ddc`
- Importance: B
- Tags: TEST, PUBLIC_API, INTEGRATION
- Source-established role: Links independent vector and map consumers in multiple translation units.
- Source summary: Adds a linked multi-translation-unit consumer for vector and map and composes a complete `check` target.
- Source rationale: The change verifies real header-only consumption and catches ODR or linkage failures that single-file tests cannot. It is strong practical integration work but does not alter container semantics.

#### 해당 SHA에서 확인할 실제 코드

- vector consumer TU, map consumer TU, shared declaration header, caller/main TU의 include와 symbol 관계를 그립니다.
- 각 TU가 독립 compile된 뒤 하나의 executable로 link되는 target을 확인합니다.
- single-file test가 잡지 못하는 header-only ODR/linkage failure를 이 구조가 어떻게 노출하는지 기록합니다.
- new `check` target이 behavioral tests, header compilation, linked consumer를 어떤 순서/의존성으로 묶는지 확인합니다.
- 확인한 파일/심볼: [직접 기록]
- 필요한 경우 비교할 직전 관련 SHA/parent: [직접 기록]

#### Test/verification 학습 기록

- 대상 production invariant: [직접 작성]
- 재현하는 failure 또는 boundary: [직접 작성]
- test technique: [differential / failure injection / white-box / deterministic random / structural bound 등 실제 코드 기준]
- 통과하는 production 코드 경로: [직접 작성]
- 이 테스트가 증명하는 것: [직접 작성]
- 이 테스트가 증명하지 않는 것: [직접 작성]
- 성격: [broad integration인지 deterministic regression인지 근거 포함]
- 후속 변경에서 막아야 하는 회귀: [직접 작성]

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: [직접 작성]
- 핵심 코드와 상태 변화: [직접 작성]
- 다음 commit에 넘기는 전제: [직접 작성]


### 6. build(makefile): 격리된 sanitizer 검사 대상 추가

- SHA: `1be03ae8daef`
- Importance: B
- Tags: PUBLIC_API, PRACTICAL, RISK
- Source-established role: Runs the complete acceptance surface under isolated ASan/UBSan instrumentation.
- Source summary: Adds an isolated ASan/UBSan build of the complete check suite.
- Source rationale: Separate instrumented output prevents flag mixing and broadens detection of lifetime and pointer errors. This strengthens verification infrastructure but represents standard tooling rather than a project-specific core decision.

#### 해당 SHA에서 확인할 실제 코드

- ASan/UBSan flags, debug info, frame-pointer options가 sanitizer build에만 적용되는 Makefile 경로를 확인합니다.
- recursive make가 instrumented objects를 별도 build directory에 두어 normal objects와 섞이지 않게 하는지 확인합니다.
- sanitizer target이 complete `check` surface를 다시 실행하는지 확인하고, value parity test만으로 보이지 않는 pointer/lifetime 오류 종류를 source 범위 안에서 기록합니다.
- 확인한 파일/심볼: [직접 기록]
- 필요한 경우 비교할 직전 관련 SHA/parent: [직접 기록]

#### 설계·상태 변화 기록

- 이 commit 직전 상태: [직접 작성]
- 해결하려던 문제: [직접 작성]
- 선택한 결정: [직접 작성]
- 새로 생긴 책임 경계 또는 상태 변화: [직접 작성]

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: [직접 작성]
- 핵심 코드와 상태 변화: [직접 작성]
- 다음 commit에 넘기는 전제: [직접 작성]


### 7. ci: compiler 행렬과 sanitizer 검사 구성

- SHA: `228f457988be`
- Importance: B
- Tags: CXX98, PUBLIC_API, PRACTICAL
- Source-established role: Automates compiler, platform, and sanitizer checks in CI.
- Source summary: Runs the complete checks on GCC and Clang across Linux/macOS plus a Linux sanitizer job.
- Source rationale: The workflow makes portability and memory-safety verification repeatable at branch level. It is valuable release engineering, but it does not itself establish a container invariant.

#### 해당 SHA에서 확인할 실제 코드

- CI main matrix의 GCC/Clang Linux 및 Clang macOS 조합과 각 job이 실행하는 complete check target을 확인합니다.
- fail-fast disabled 설정과 platform-specific result가 동시에 보존되는지 확인합니다.
- separate Linux Clang sanitizer job의 leak detection/immediate failure/UB stack trace 설정과 sanitizer target 호출을 확인합니다.
- workflow 권한이 read-only로 충분한 acceptance 작업만 수행하는지 확인합니다.
- 확인한 파일/심볼: [직접 기록]
- 필요한 경우 비교할 직전 관련 SHA/parent: [직접 기록]

#### 설계·상태 변화 기록

- 이 commit 직전 상태: [직접 작성]
- 해결하려던 문제: [직접 작성]
- 선택한 결정: [직접 작성]
- 새로 생긴 책임 경계 또는 상태 변화: [직접 작성]

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: [직접 작성]
- 핵심 코드와 상태 변화: [직접 작성]
- 다음 commit에 넘기는 전제: [직접 작성]


## 6. Invariant ledger

### Source에서 확정된 관련 invariant

- Every supported public header is self-contained under strict C++98 compilation, and the header-only implementation is safe to include from multiple translation units without linkage or ODR failures.

### 시간에 따른 변화 기록

| Invariant | 처음 도입된 commit | 부족함이 드러난 commit/상태 | 강화·복구한 fix | 고정한 test/perf | 직접 확인한 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| Every supported public header is self-contained under strict C++98 compilation, and the... | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |

## 7. Failure → Fix → Test 연결

| 기존 상태/production change | fix 또는 verification | Source에서 확정된 연결 관점 | 실제 failure/root cause | 실제 test production path |
| --- | --- | --- | --- | --- |
| `80e169e83212` | `3c64a69dd252` | aggregate sequential surface smoke | [직접 작성] | [직접 작성] |
| `112af1753538` | `d938c0079994` | aggregate expansion 이후 component self-containment 검사 | [직접 작성] | [직접 작성] |
| `d938c0079994` | `072c49832ddc` | compile isolation에서 multi-TU link acceptance로 확대 | [직접 작성] | [직접 작성] |
| `072c49832ddc` | `1be03ae8daef` | complete check surface를 sanitizer instrumentation으로 확대 | [직접 작성] | [직접 작성] |
| `1be03ae8daef` | `228f457988be` | local acceptance를 compiler/platform/sanitizer CI로 자동화 | [직접 작성] | [직접 작성] |

## 8. Ownership / state / responsibility 변화

| 시점 | Owner / state / responsibility | 변경 전 | 변경 후 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| `80e169e83212` | Introduces the aggregate header. | [직접 작성] | [직접 작성] | [직접 작성] |
| `3c64a69dd252` | Confirms the current sequential surface compiles through that bundle. | [직접 작성] | [직접 작성] | [직접 작성] |
| `112af1753538` | Adds map to the aggregate public entry point. | [직접 작성] | [직접 작성] | [직접 작성] |
| `d938c0079994` | Compiles every public header independently as the first include. | [직접 작성] | [직접 작성] | [직접 작성] |
| `072c49832ddc` | Links independent vector and map consumers in multiple translation units. | [직접 작성] | [직접 작성] | [직접 작성] |
| `1be03ae8daef` | Runs the complete acceptance surface under isolated ASan/UBSan instrumentation. | [직접 작성] | [직접 작성] | [직접 작성] |
| `228f457988be` | Automates compiler, platform, and sanitizer checks in CI. | [직접 작성] | [직접 작성] | [직접 작성] |

## 9. Thread 최종 상태

- 최종적으로 성립한 representation/state: [직접 작성]
- 최종적으로 보장하는 invariant: [위 ledger와 실제 코드 근거로 작성]
- 남아 있는 precondition 또는 보장하지 않는 범위: [직접 작성]
- 최종 verification evidence: [직접 작성]
- 이 상태에 도달하기 위해 필요했던 핵심 turning point commit: [직접 작성]

## 10. 최종 architecture 또는 execution flow 정리

아래 단계명은 source가 정의한 Thread progression을 따라가는 탐색 순서입니다. 실제 함수·상태·분기·코드 조각은 해당 SHA에서 직접 채웁니다.

| 단계 | 관련 commit | 실제 코드 위치 | 입력/기존 상태 | 핵심 transition | failure/cleanup | 다음 단계에 남기는 invariant |
| --- | --- | --- | --- | --- | --- | --- |
| Aggregate header | `80e169e83212` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Aggregate smoke test | `3c64a69dd252` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Map public integration | `112af1753538` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Independent component compilation | `d938c0079994` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Multi-TU linked consumer | `072c49832ddc` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Isolated sanitizers | `1be03ae8daef` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Cross-compiler/platform CI | `228f457988be` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |

## 11. 학습 완료 자가 점검

- [ ] Commit map의 모든 SHA를 source 순서대로 확인했습니다.
- [ ] 각 commit 기록에 final HEAD가 아니라 해당 SHA의 실제 코드 근거가 있습니다.
- [ ] S/A commit은 decision, failure boundary, ownership/state transition을 설명할 수 있습니다.
- [ ] Test/perf commit은 production invariant, technique, production path, 증명/비증명 범위를 구분했습니다.
- [ ] Fix가 있는 경우 기존 가정 → failure/risk → root cause → 수정 → regression 연결을 설명할 수 있습니다.
- [ ] Invariant ledger가 commit history에 따라 어떻게 변했는지 설명할 수 있습니다.
- [ ] Thread 최종 상태와 architecture/execution flow를 실제 코드 근거로 자기 말로 설명할 수 있습니다.
