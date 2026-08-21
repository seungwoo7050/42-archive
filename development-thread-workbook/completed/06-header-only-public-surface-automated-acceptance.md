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
- 확인한 파일/심볼: `include/ft_containers.hpp`의 include guard와 `ft_algorithm.hpp`, `ft_iterator.hpp`, `ft_pair.hpp`, `ft_stack.hpp`, `ft_type_traits.hpp`, `ft_vector.hpp` include 목록입니다.
- 필요한 경우 비교할 직전 관련 SHA/parent: 직전에는 각 component header만 존재했고 하나의 공개 bundle은 없었습니다.

#### 설계·상태 변화 기록

- 이 commit 직전 상태: consumer가 필요한 utility/container headers를 개별 선택해 include해야 했습니다.
- 해결하려던 문제: 정상 조합을 매 consumer가 반복해서 구성하면 누락과 include-order 차이가 공개 사용법에 섞입니다.
- 선택한 결정: 기존 component headers를 변경하거나 숨기지 않고, 그 위에 `ft_containers.hpp`라는 convenience entry point를 추가했습니다.
- 새로 생긴 책임 경계 또는 상태 변화: component header는 개별 API를 계속 담당하고 aggregate header는 지원되는 조합을 노출하는 packaging 책임만 가집니다. 이 SHA에는 map이 아직 포함되지 않습니다.

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: header-only library의 첫 명시적 public bundle을 만듭니다.
- 핵심 코드와 상태 변화: runtime state는 없습니다. preprocessor include graph에 aggregate root가 추가됩니다.
- 다음 commit에 넘기는 전제: 이 bundle 하나로 기존 순차 컨테이너 tests가 그대로 compile/run되어야 합니다.

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
- 확인한 파일/심볼: `tests/test_containers.cpp`의 여러 `ft_*.hpp` includes가 `#include "ft_containers.hpp"` 하나로 교체된 지점입니다.
- 필요한 경우 비교할 직전 관련 SHA/parent: aggregate header 도입 `80e169e83212`입니다.

#### Test/verification 학습 기록

- 대상 production invariant: aggregate header가 utility, vector, stack의 기존 public symbols와 필요한 내부 dependencies를 빠짐없이 노출해야 합니다.
- 재현하는 failure 또는 boundary: bundle include 누락 또는 include ordering 때문에 기존 test source가 compile되지 않는 경우입니다.
- test technique: 기존 broad behavioral test의 include surface만 aggregate header로 바꾸는 integration smoke입니다.
- 통과하는 production 코드 경로: `ft_containers.hpp`의 transitive include graph를 거쳐 기존 utility/vector/stack test code가 compile되고 실행됩니다.
- 이 테스트가 증명하는 것: 한 translation unit에서 현재 순차 surface가 aggregate include만으로 기존 checks를 사용할 수 있음을 증명합니다.
- 이 테스트가 증명하지 않는 것: 각 component header의 독립 self-containment, 여러 translation units의 linkage/ODR, map 포함 여부, compiler/platform portability는 증명하지 않습니다.
- 성격: 특정 regression보다 public bundle의 broad smoke입니다.
- 후속 변경에서 막아야 하는 회귀: aggregate header에서 필요한 component include를 제거해 기존 test가 직접 include에 우연히 의존하도록 만드는 회귀입니다.
- 실행 증거: include diff와 기존 test 연결을 코드로 검사했으며 executable은 실행하지 않았습니다.

#### C-level 최소 확인

- Thread 이해에 필요한 맥락: 구현 동작을 새로 시험한 것이 아니라 test의 진입 include를 바꿔 packaging boundary를 통과시켰습니다.
- 최소 코드/검증 근거: `tests/test_containers.cpp`의 include replacement 한 곳이며 test body 변경은 없습니다.

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
- 확인한 파일/심볼: `include/ft_containers.hpp`의 `#include "ft_map.hpp"`; `include/ft_map.hpp`의 `value_compare`, `value_comp`, six relational operators, non-member `swap`입니다.
- 필요한 경우 비교할 직전 관련 SHA/parent: `80e169e83212`의 aggregate list에는 map이 없었습니다.

#### 설계·상태 변화 기록

- 이 commit 직전 상태: aggregate entry point는 utility/vector/stack까지만 포함해 associative container surface가 불완전했습니다.
- 해결하려던 문제: map을 직접 include해야 했고, map의 public comparison/swap surface도 동일 commit에서 완성될 필요가 있었습니다.
- 선택한 결정: map header를 aggregate list에 추가하고, key comparator를 value pairs에 적용하는 `value_compare`, shared `ft::equal`/`ft::lexicographical_compare` 기반 relations, member swap forwarding을 공개했습니다.
- 새로 생긴 책임 경계 또는 상태 변화: `ft_containers.hpp`가 이 repository의 utility, sequential, adaptor, associative surface를 한 entry point에서 노출합니다. runtime tree representation은 이 commit에서 새로 정의되지 않습니다.

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: aggregate public surface를 map까지 확장해 baseline bundle을 완성합니다.
- 핵심 코드와 상태 변화: include graph에 `ft_map.hpp`가 추가되고 map public non-member/value-comparison symbols가 생깁니다.
- 다음 commit에 넘기는 전제: bundle만 아니라 각 component header도 독립적으로 자신의 dependencies를 include해야 합니다.

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
- 확인한 파일/심볼: `tests/headers/{ft_algorithm,ft_containers,ft_iterator,ft_map,ft_pair,ft_stack,ft_type_traits,ft_vector}.cpp`; Makefile의 `HEADER_TEST_SOURCES`, `HEADER_TEST_OBJECTS`, `build/headers/%.o`, `headers` target입니다.
- 필요한 경우 비교할 직전 관련 SHA/parent: aggregate expansion `112af1753538` 뒤의 public header set입니다.

#### Test/verification 학습 기록

- 대상 production invariant: 지원하는 각 public header는 strict C++98 translation unit의 첫 library include로 단독 compile되어야 합니다.
- 재현하는 failure 또는 boundary: header가 자신이 사용하는 standard/project declaration을 직접 include하지 않고 다른 header의 선행 include에 기대는 경우입니다.
- test technique: independent translation-unit compile probes입니다. 각 source를 `-c`하여 별도 object로 만듭니다.
- 통과하는 production 코드 경로: 각 header의 include guard/include graph와 representative template instantiation입니다. algorithm은 `equal`/lexicographic comparison, iterator는 reverse dereference, vector/map/stack은 기본 operation을 instantiate합니다.
- 이 테스트가 증명하는 것: 각 probe가 요구하는 declarations/templates가 include order 도움 없이 compile됨을 증명합니다.
- 이 테스트가 증명하지 않는 것: object들을 하나로 link하지 않으므로 duplicate external definitions/ODR failures, runtime behavior, 모든 template argument 조합은 증명하지 않습니다.
- 성격: public-header self-containment를 직접 고정하는 deterministic compile regression입니다.
- 후속 변경에서 막아야 하는 회귀: component header의 required include를 제거하고 aggregate 또는 test include order에 기대는 회귀입니다.
- 실행 증거: probe sources와 Make rules를 코드로 검사했으며 `make headers`는 실행하지 않았습니다.

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: aggregate smoke에서 component별 compile isolation으로 acceptance boundary를 확대합니다.
- 핵심 코드와 상태 변화: public header마다 최소 TU가 생기고 outputs는 `build/headers`에 분리됩니다.
- 다음 commit에 넘기는 전제: compile self-containment를 넘어 독립 TUs를 실제 executable로 link하고 실행해야 합니다.

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
- 확인한 파일/심볼: `tests/consumer/consumer_api.hpp`, `vector_consumer.cpp`, `map_consumer.cpp`, `main.cpp`; Makefile의 `CONSUMER_OBJECTS`, `CONSUMER_BIN`, `consumer`, `check` targets입니다.
- 필요한 경우 비교할 직전 관련 SHA/parent: independent compile probes `d938c0079994`입니다.

#### Test/verification 학습 기록

- 대상 production invariant: header-only definitions와 shared transitive utilities가 여러 independently compiled TUs에서 사용돼도 하나의 executable로 link되고 예상 동작을 해야 합니다.
- 재현하는 failure 또는 boundary: non-inline external definition duplication, missing linkage, include-order/TU-local dependency, consumer-facing runtime integration 오류입니다.
- test technique: multi-translation-unit compile + link + executable integration test입니다.
- 통과하는 production 코드 경로: vector TU는 1..5 push 후 index 2에 두 개의 7을 insert해 합계 29를 반환합니다. map TU는 3/1/2를 insert하고 key 1을 erase한 뒤 key+value 합계 55를 반환합니다. main TU가 두 external functions를 호출해 값을 검사합니다.
- 이 테스트가 증명하는 것: 이 TU 구성에서 overlapping header-only dependencies가 link되며 vector insertion과 map insertion/erase/iteration의 representative consumer flow가 실행 가능한 구조임을 증명합니다.
- 이 테스트가 증명하지 않는 것: 모든 public header가 동시에 여러 TUs에서 모든 instantiation으로 사용되는 경우, shared-library ABI, dynamic loading, 모든 ODR-sensitive 조합은 다루지 않습니다.
- 성격: 실제 consumer shape를 재현한 deterministic link/runtime integration입니다.
- 후속 변경에서 막아야 하는 회귀: header에 non-inline external symbol을 추가해 duplicate definition을 만들거나, component header가 다른 TU의 include side effect에 기대거나, public templates의 link visibility를 잃는 회귀입니다.
- 실행 증거: source, link rule, expected 29/55 계산을 검사했으며 consumer executable은 실행하지 않았습니다.

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: compile-only acceptance를 linked consumer acceptance로 전환합니다.
- 핵심 코드와 상태 변화: 세 `.cpp` objects가 별도 compile되어 `build/consumer_test`로 link되고 `consumer` target이 실행합니다. `check`는 `test`, `headers`, `consumer`를 모두 prerequisite로 둡니다.
- 다음 commit에 넘기는 전제: 동일한 complete check surface를 instrumented build에서도 실행할 수 있어야 합니다.

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
- 확인한 파일/심볼: Makefile의 `SANITIZER_FLAGS`, phony `sanitize`, recursive `$(MAKE) BUILD_DIR=$(BUILD_DIR)/sanitize CXXFLAGS="..." check`입니다.
- 필요한 경우 비교할 직전 관련 SHA/parent: complete `check` target 도입 `072c49832ddc`입니다.

#### 설계·상태 변화 기록

- 이 commit 직전 상태: normal build/test/header/consumer acceptance만 있었고 instrumented output을 분리하는 경로가 없었습니다.
- 해결하려던 문제: normal flags로 결과가 맞아도 exercised path의 out-of-bounds, use-after-free, invalid lifetime, undefined arithmetic가 관찰되지 않을 수 있습니다. 같은 object directory를 flag만 바꿔 재사용하면 stale/mixed objects가 생길 수 있습니다.
- 선택한 결정: `-O1 -g -fno-omit-frame-pointer -fsanitize=address,undefined`를 recursive make의 `CXXFLAGS`에 추가하고 `BUILD_DIR=build/sanitize`로 complete `check`를 다시 빌드·실행합니다.
- 새로 생긴 책임 경계 또는 상태 변화: normal artifacts와 instrumented artifacts가 경로로 분리되며 sanitizer target은 별도 acceptance mode를 담당합니다.

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: 같은 behavioral/header/multi-TU surface에 dynamic memory/UB diagnostics를 추가합니다.
- 핵심 코드와 상태 변화: build directory와 flags만 override하고 target graph는 `check`를 재사용합니다.
- 다음 commit에 넘기는 전제: local normal/sanitizer commands를 여러 compiler/platform에서 자동 반복해야 합니다.

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
- 확인한 파일/심볼: `.github/workflows/ci.yml`의 `compiler-matrix`, three include entries, `make CXX=${{ matrix.compiler }} check`, `sanitizers` job, ASAN/UBSAN environment, `make CXX=clang++ sanitize`, `permissions: contents: read`입니다.
- 필요한 경우 비교할 직전 관련 SHA/parent: local sanitizer target `1be03ae8daef`입니다.

#### 설계·상태 변화 기록

- 이 commit 직전 상태: acceptance commands는 Makefile에 있었지만 실행 여부가 개발자의 local environment에 의존했습니다.
- 해결하려던 문제: 하나의 compiler/OS에서만 통과하는 C++98 extension, warning 차이, platform-sensitive header/build issue와 sanitizer omission을 반복적으로 잡기 어렵습니다.
- 선택한 결정: push와 pull request에서 Ubuntu/g++, Ubuntu/clang++, macOS/clang++의 complete `check`를 fail-fast 없이 수행하고, 별도 Ubuntu/clang++ sanitizer job을 둡니다.
- 새로 생긴 책임 경계 또는 상태 변화: repository workflow가 cross-toolchain normal acceptance와 Linux instrumented acceptance 실행 책임을 가집니다. content write permission은 부여하지 않습니다.

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: local acceptance graph를 compiler/platform matrix와 sanitizer automation으로 승격합니다.
- 핵심 코드와 상태 변화: workflow jobs가 기존 Make targets를 그대로 호출하므로 local/CI acceptance 명령이 분기되지 않습니다.
- 다음 commit에 넘기는 전제: 이 Thread의 마지막 commit입니다. 이후 public-surface 변경은 같은 `check`/`sanitize`/CI graph에 편입되어야 합니다.

## 6. Invariant ledger

### Source에서 확정된 관련 invariant

- Every supported public header is self-contained under strict C++98 compilation, and the header-only implementation is safe to include from multiple translation units without linkage or ODR failures.

### 시간에 따른 변화 기록

| Invariant | 처음 도입된 commit | 부족함이 드러난 commit/상태 | 강화·복구한 fix | 고정한 test/perf | 직접 확인한 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| Every supported public header is self-contained under strict C++98 compilation, and the header-only implementation is safe to include from multiple translation units without linkage or ODR failures. | aggregate entry는 `80e169e83212`; map 포함은 `112af1753538` | one-TU aggregate smoke `3c64a69dd252`는 component self-containment와 link/ODR를 보지 못함 | production fix가 아니라 acceptance를 `d938c0079994`와 `072c49832ddc`로 확대 | `d938c0079994`, `072c49832ddc`, 이후 `1be03ae8daef`, `228f457988be` | first-include compile probes, separate consumer objects/link/run, isolated sanitizer target, CI matrix |

## 7. Failure → Fix → Test 연결

| 기존 상태/production change | fix 또는 verification | Source에서 확정된 연결 관점 | 실제 failure/root cause | 실제 test production path |
| --- | --- | --- | --- | --- |
| `80e169e83212` | `3c64a69dd252` | aggregate sequential surface smoke | bundle include가 component symbol/dependency를 누락할 수 있음 | aggregate include → unchanged utility/vector/stack tests |
| `112af1753538` | `d938c0079994` | aggregate expansion 이후 component self-containment 검사 | monolithic include order가 missing direct include를 가릴 수 있음 | each header first include → representative instantiation → object compile |
| `d938c0079994` | `072c49832ddc` | compile isolation에서 multi-TU link acceptance로 확대 | compile-only objects는 duplicate definitions/link visibility를 보지 못함 | vector/map objects + main → link → expected 29/55 run |
| `072c49832ddc` | `1be03ae8daef` | complete check surface를 sanitizer instrumentation으로 확대 | correct output가 invalid memory/UB를 숨길 수 있고 flag-mixed artifacts가 진단을 왜곡할 수 있음 | isolated build/sanitize → recursive complete `check` |
| `1be03ae8daef` | `228f457988be` | local acceptance를 compiler/platform/sanitizer CI로 자동화 | local 단일 toolchain 실행의 비반복성/portability blind spot | Linux GCC/Clang, macOS Clang `check`; Linux Clang `sanitize` |

## 8. Ownership / state / responsibility 변화

| 시점 | Owner / state / responsibility | 변경 전 | 변경 후 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| `80e169e83212` | Introduces the aggregate header. | consumer가 component 조합 소유 | repository가 supported bundle include list 제공 | `ft_containers.hpp` |
| `3c64a69dd252` | Confirms the current sequential surface compiles through that bundle. | bundle은 선언만 존재 | existing test의 sole library entry로 사용 | test include replacement |
| `112af1753538` | Adds map to the aggregate public entry point. | aggregate에 associative surface 없음 | map와 relations/swap도 bundle에서 노출 | aggregate/map header diff |
| `d938c0079994` | Compiles every public header independently as the first include. | include correctness가 monolithic TU에 묶임 | 각 header가 자기 dependency 책임을 독립 probe로 부담 | `tests/headers`, `headers` target |
| `072c49832ddc` | Links independent vector and map consumers in multiple translation units. | compile-only verification | consumer objects/link/runtime가 ODR/link 책임 검증 | `tests/consumer`, `consumer`, `check` |
| `1be03ae8daef` | Runs the complete acceptance surface under isolated ASan/UBSan instrumentation. | normal artifacts만 존재 | separate instrumented artifact owner/path | recursive sanitize Make |
| `228f457988be` | Automates compiler, platform, and sanitizer checks in CI. | developer가 local 실행 책임 | workflow가 push/PR matrix 실행 책임 | CI jobs/permissions |

## 9. Thread 최종 상태

- 최종적으로 성립한 representation/state: component public headers와 aggregate `ft_containers.hpp`가 공존합니다. Makefile acceptance는 behavioral tests, independent-header objects, multi-TU linked consumer를 `check`로 묶고, 동일 graph를 separate sanitizer build에서 재실행합니다. CI는 normal compiler/platform matrix와 sanitizer job을 호출합니다.
- 최종적으로 보장하는 invariant: repository가 정의한 probes 범위에서 각 public header는 strict C++98로 first-include compile되고, header-only implementation은 representative vector/map consumer TUs를 함께 link할 수 있도록 구성됩니다.
- 남아 있는 precondition 또는 보장하지 않는 범위: probes가 instantiate하지 않은 모든 template/type 조합, ABI/shared-library compatibility, unexercised runtime path의 memory safety를 전부 증명하지 않습니다. CI workflow 정의는 확인했지만 이 작업에서 run 결과를 검증하지 않았습니다.
- 최종 verification evidence: aggregate include diff, eight independent header probes, separate consumer compile/link/run rules와 expected 29/55, isolated ASan/UBSan recursive target, three normal matrix entries와 one sanitizer job을 코드로 확인했습니다. local checkout 제한 때문에 명령은 실행하지 않았습니다.
- 이 상태에 도달하기 위해 필요했던 핵심 turning point commit: self-containment를 분리한 `d938c0079994`, real linked consumer를 만든 `072c49832ddc`, complete acceptance를 자동화한 `228f457988be`입니다.

## 10. 최종 architecture 또는 execution flow 정리

아래 단계명은 source가 정의한 Thread progression을 따라가는 탐색 순서입니다. 실제 함수·상태·분기·코드 조각은 해당 SHA에서 직접 채웁니다.

| 단계 | 관련 commit | 실제 코드 위치 | 입력/기존 상태 | 핵심 transition | failure/cleanup | 다음 단계에 남기는 invariant |
| --- | --- | --- | --- | --- | --- | --- |
| Aggregate header | `80e169e83212` | `include/ft_containers.hpp` | separate utility/vector/stack headers | supported include list를 bundle로 구성 | preprocessor/compile failure로 누락 노출 | one public entry exists |
| Aggregate smoke test | `3c64a69dd252` | `tests/test_containers.cpp` | existing test + many direct includes | sole aggregate include로 교체 | compile/test nonzero | current sequential bundle usable in one TU |
| Map public integration | `112af1753538` | aggregate/map headers | aggregate without map | map include + public comparisons/swap 노출 | compile surface | bundle includes associative surface |
| Independent component compilation | `d938c0079994` | `tests/headers`, Make `headers` | possible transitive include dependence | each header first include, instantiate, `-c` | failing object stops target | component self-containment evidence |
| Multi-TU linked consumer | `072c49832ddc` | `tests/consumer`, Make `consumer/check` | isolated objects only | separate vector/map/main objects link and run | compile/link/nonzero runtime | representative ODR/link consumer evidence |
| Isolated sanitizers | `1be03ae8daef` | Make `sanitize` | normal complete check | recursive check with sanitizer flags/new build dir | sanitizer abort/nonzero propagates | instrumented acceptance separated |
| Cross-compiler/platform CI | `228f457988be` | `.github/workflows/ci.yml` | local targets | matrix `check` + separate `sanitize` automation | jobs report independently, fail-fast false | repeatable branch-level acceptance configuration |

## 11. 학습 완료 자가 점검

- [x] Commit map의 모든 SHA를 source 순서대로 확인했습니다.
- [x] 각 commit 기록에 final HEAD가 아니라 해당 SHA의 실제 코드 근거가 있습니다.
- [x] S/A commit은 decision, failure boundary, ownership/state transition을 설명할 수 있습니다. 이 Thread에는 S/A commit이 없어 해당 항목은 비적용임을 확인했습니다.
- [x] Test/perf commit은 production invariant, technique, production path, 증명/비증명 범위를 구분했습니다.
- [x] Fix가 있는 경우 기존 가정 → failure/risk → root cause → 수정 → regression 연결을 설명할 수 있습니다. 이 Thread는 production fix보다 acceptance 확대 순서가 중심입니다.
- [x] Invariant ledger가 commit history에 따라 어떻게 변했는지 설명할 수 있습니다.
- [x] Thread 최종 상태와 architecture/execution flow를 실제 코드 근거로 자기 말로 설명할 수 있습니다.
