# C++98 Generic Interface Foundation

## 1. Thread 목표

### Source-established significance

The branch begins by constructing the generic vocabulary that C++98 does not provide in the later standard-library form used by modern code. The sequence is a real dependency chain: SFINAE separates count and range overloads, pair supplies map's value and return contracts, shared algorithms support relational operators, and iterator metadata enables one reverse adaptor to serve both pointer-backed and tree-backed iterators. The strict build then turns those assumptions into an enforceable compatibility boundary. Most individual implementations are conventional, but together they prevent each container from inventing incompatible local substitutes.

### 이 Thread에서 복원할 것

- 위 significance가 설명하는 변화 과정을 각 commit의 실제 SHA 코드로 재구성합니다.
- source가 확정한 commit 역할과 importance를 바꾸지 않고, 실제 implementation/failure/test 근거만 직접 채웁니다.

### Source에서 직접 연결되는 architecture

- The utility layer is split into independent headers for traits, pairs, algorithms, and iterators. Container headers consume those abstractions, while `ft_containers.hpp` provides an aggregate public entry point.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- C++98에서 count overload와 iterator-range overload를 runtime branching 없이 어떻게 분리하는가?
- pair, range algorithms, iterator traits가 container 내부 중복 구현을 어떻게 줄이는가?
- reverse iterator의 base convention이 pointer-backed vector와 tree-backed map에 공통으로 적용될 수 있는 이유는 무엇인가?
- strict C++98 build가 utility contract의 일부가 되는 지점은 어디인가?

## 3. 완료 기준

- A: 주요 subsystem/boundary/failure path/integration point를 실제 코드와 설계 판단으로 연결하고, 관련 regression 또는 다음 fix와의 관계를 설명할 수 있어야 합니다.
- B: Thread 흐름에서 맡는 구현 역할, 필요한 상태 변화와 핵심 코드 위치를 해당 SHA 기준으로 확인할 수 있어야 합니다.
- 모든 commit은 해당 SHA의 코드 또는 test/build diff를 근거로 기록합니다.
- Thread 최종 설명은 source 요약을 복사하는 것으로 끝내지 않고, 직접 확인한 코드 근거와 commit 간 변화로 재구성합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source-established role |
| --- | --- | --- | --- | --- | --- |
| 1 | `ecc0668d6d9c` | `feat(type-traits): CXX98 타입 선택 도구 구현` | A | CXX98, ARCH, LEARNING | Establishes substitution-based overload selection and compile-time type classification. |
| 2 | `1c8692d14118` | `feat(pair): 값 쌍과 관계 연산 구현` | B | CXX98 | Supplies the pair value and return type required by associative-container APIs. |
| 3 | `07cf5893a53c` | `feat(algorithm): 공용 범위 비교 알고리즘 구현` | B | CXX98, PRACTICAL | Centralizes equality and lexicographical comparison for container relations. |
| 4 | `e3462cec55a1` | `feat(iterator): iterator 기본 형식과 traits 정의` | B | CXX98, ITERATOR | Defines iterator type metadata and pointer traits. |
| 5 | `7a8e3d32bb4d` | `feat(iterator): 역방향 반복자의 양방향 동작 구현` | B | ITERATOR | Adds the bidirectional reverse-iterator base convention. |
| 6 | `ae50e9038643` | `feat(iterator): 역방향 반복자의 임의 접근 연산 완성` | B | ITERATOR | Extends reverse iteration to the random-access operations needed by vector. |
| 7 | `455098520e83` | `test(utils): 공용 타입·값·범위·반복자 도구 검증` | B | TEST, CXX98 | Verifies the utility layer before containers depend on it. |
| 8 | `f36ec7e7e047` | `build(makefile): CXX98 검사 빌드 구성` | B | CXX98, PRACTICAL | Makes strict warning-enabled C++98 compilation the repeatable baseline. |

## 5. Commit별 학습 기록

### 1. feat(type-traits): CXX98 타입 선택 도구 구현

- SHA: `ecc0668d6d9c`
- Importance: A
- Tags: CXX98, ARCH, LEARNING
- Source-established role: Establishes substitution-based overload selection and compile-time type classification.
- Source summary: Introduces `enable_if`, integral constants, and integral-type detection for C++98 template dispatch.
- Source rationale: This is the project-wide mechanism that makes fill and range overloads coexist without runtime dispatch. It is a significant foundational interface decision, though it implements a standard utility rather than a defining container mechanism.

#### 해당 SHA에서 확인할 실제 코드

- 해당 SHA의 traits 전용 header에서 `enable_if`가 조건이 참일 때만 nested `type`을 노출하는 선언을 찾고, false case가 substitution에서 어떻게 사라지는지 타입 선언 수준에서 표시합니다.
- `integral_constant`, `true_type`, `false_type`의 value/type 관계와 `is_integral` primary template 및 C++98 integral specialization 목록을 확인합니다.
- 이 SHA에는 아직 실제 container overload consumer가 없다면 그 사실을 기록하고, later HEAD의 사용처를 소급해서 설명하지 않습니다.
- 확인한 파일/심볼: [직접 기록]
- 필요한 경우 비교할 직전 관련 SHA/parent: [직접 기록]

#### 설계·상태 변화 기록

- 이 commit 직전 상태: [직접 작성]
- 해결하려던 문제: [직접 작성]
- 선택한 결정: [직접 작성]
- 새로 생긴 책임 경계 또는 상태 변화: [직접 작성]

#### A-level 핵심 확인

- 중요 boundary/failure path: [직접 작성]
- state/ownership/lifecycle 영향: [직접 작성]
- 이 commit이 보장하는 것과 남은 한계: [직접 작성]
- 다음 관련 commit과의 연결: [직접 작성]


### 2. feat(pair): 값 쌍과 관계 연산 구현

- SHA: `1c8692d14118`
- Importance: B
- Tags: CXX98
- Source-established role: Supplies the pair value and return type required by associative-container APIs.
- Source summary: Implements `ft::pair`, converting construction, relational operators, and `make_pair`.
- Source rationale: The type is necessary support for map values and return contracts, but the implementation follows established value-type semantics and contains limited project-specific judgment.

#### 해당 SHA에서 확인할 실제 코드

- `ft::pair`의 `first`/`second` 저장 형식과 default/value/converting-copy/assignment 경로를 확인합니다.
- 관계 연산에서 `first`를 우선 비교하고, `first`가 서로 less가 아닐 때만 `second`를 비교하는 lexicographic 조건을 직접 추적합니다.
- `make_pair`가 호출자에게 template 인자를 명시하지 않게 하는 반환 형식 구성을 확인합니다.
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


### 3. feat(algorithm): 공용 범위 비교 알고리즘 구현

- SHA: `07cf5893a53c`
- Importance: B
- Tags: CXX98, PRACTICAL
- Source-established role: Centralizes equality and lexicographical comparison for container relations.
- Source summary: Adds shared equality and lexicographical range-comparison algorithms.
- Source rationale: Centralizing these algorithms avoids duplicated comparison logic in containers, but the change is a straightforward implementation of expected generic algorithms within an already understood design.

#### 해당 SHA에서 확인할 실제 코드

- `equal` 기본/함수 객체 overload가 첫 번째 범위를 한 번씩 전진하며 mismatch에서 조기 종료하는지 확인합니다.
- `lexicographical_compare`의 조기 결정 조건과 prefix 처리 시점을 구분해서 기록합니다.
- 구현이 random-access 연산을 요구하지 않는지 실제 iterator 사용 연산만 추립니다.
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


### 4. feat(iterator): iterator 기본 형식과 traits 정의

- SHA: `e3462cec55a1`
- Importance: B
- Tags: CXX98, ITERATOR
- Source-established role: Defines iterator type metadata and pointer traits.
- Source summary: Defines the iterator base form and `iterator_traits`, including pointer specializations.
- Source rationale: The traits layer is required by reverse iterators and containers, yet it is conventional support infrastructure rather than a project-defining architecture decision.

#### 해당 SHA에서 확인할 실제 코드

- `iterator` base template의 category/value/difference/pointer/reference alias와 `iterator_traits` 추출 방식을 확인합니다.
- mutable pointer와 const pointer specialization이 random-access category 및 `std::ptrdiff_t`를 노출하는지 확인합니다.
- reverse iterator가 concrete container가 아니라 traits protocol에 의존할 수 있게 된 경계를 기록합니다.
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


### 5. feat(iterator): 역방향 반복자의 양방향 동작 구현

- SHA: `7a8e3d32bb4d`
- Importance: B
- Tags: ITERATOR
- Source-established role: Adds the bidirectional reverse-iterator base convention.
- Source summary: Implements bidirectional reverse-iterator construction, dereference, increment, decrement, and equality.
- Source rationale: This establishes expected reverse traversal semantics using the base-iterator convention, but it is normal implementation work inside the utility design.

#### 해당 SHA에서 확인할 실제 코드

- `reverse_iterator`가 저장하는 base iterator의 의미를 확인하고, dereference에서 base 복사본을 decrement한 뒤 접근하는 순서를 추적합니다.
- `operator++`/`operator--`가 underlying iterator 방향을 어떻게 반대로 적용하는지 확인합니다.
- converting constructor와 heterogeneous equality가 mutable/const 호환 타입 사이에서 어떤 변환만 허용하는지 확인합니다.
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


### 6. feat(iterator): 역방향 반복자의 임의 접근 연산 완성

- SHA: `ae50e9038643`
- Importance: B
- Tags: ITERATOR
- Source-established role: Extends reverse iteration to the random-access operations needed by vector.
- Source summary: Completes reverse-iterator random-access arithmetic, ordering, indexing, and distance.
- Source rationale: The change makes the adaptor usable by pointer-backed vector iterators. It is technically correct supporting work, but it does not alter the project's architecture or critical ownership model.

#### 해당 SHA에서 확인할 실제 코드

- addition/subtraction/compound movement/indexing에서 positive reverse movement가 base subtraction으로 바뀌는 식을 확인합니다.
- 두 reverse iterator의 distance에서 피연산자 순서가 왜 뒤집혀 있는지 코드 식 그대로 기록합니다.
- 관계 연산이 base ordering을 어떻게 반전시키는지 확인하고 vector의 pointer iterator에서 요구되는 연산만 구분합니다.
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


### 7. test(utils): 공용 타입·값·범위·반복자 도구 검증

- SHA: `455098520e83`
- Importance: B
- Tags: TEST, CXX98
- Source-established role: Verifies the utility layer before containers depend on it.
- Source summary: Adds initial checks for pair, type traits, range algorithms, iterator traits, and reverse iteration.
- Source rationale: The tests establish basic confidence in the utility substrate before containers depend on it, but they exercise ordinary behavior rather than a difficult invariant or regression.

#### 해당 SHA에서 확인할 실제 코드

- utility test executable에서 pair, integral classification, prefix equality, lexicographic comparison, raw-array reverse traversal, pointer `iterator_traits` 각각의 assertion을 찾습니다.
- 각 assertion이 단일 utility만 보는지, 여러 utility의 조합을 보는지 구분합니다.
- 이 테스트가 container 구현 전에 진단 범위를 줄이는 baseline이라는 역할과, container ownership/failure를 아직 증명하지 않는다는 한계를 기록합니다.
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


### 8. build(makefile): CXX98 검사 빌드 구성

- SHA: `f36ec7e7e047`
- Importance: B
- Tags: CXX98, PRACTICAL
- Source-established role: Makes strict warning-enabled C++98 compilation the repeatable baseline.
- Source summary: Creates the strict C++98 Makefile test build and ignores generated build artifacts.
- Source rationale: This turns language-version and warning compatibility into a repeatable project constraint. It is important practical infrastructure, but not a core container mechanism.

#### 해당 SHA에서 확인할 실제 코드

- Makefile에서 C++98 language mode와 strict warning flags가 실제 compile command에 들어가는 지점을 확인합니다.
- public header dependency, build directory 분리, `test` target의 executable 실행 및 nonzero 중단 동작을 확인합니다.
- header-only library에서 consumer compilation 자체가 verification이 되는 경계를 기록합니다.
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
| `Utility layer` | `455098520e83` | 공용 utility baseline verification | [직접 작성] | [직접 작성] |
| `C++98 build contract` | `f36ec7e7e047` | strict C++98 compilation baseline | [직접 작성] | [직접 작성] |

## 8. Ownership / state / responsibility 변화

| 시점 | Owner / state / responsibility | 변경 전 | 변경 후 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| `ecc0668d6d9c` | Establishes substitution-based overload selection and compile-time type classification. | [직접 작성] | [직접 작성] | [직접 작성] |
| `1c8692d14118` | Supplies the pair value and return type required by associative-container APIs. | [직접 작성] | [직접 작성] | [직접 작성] |
| `07cf5893a53c` | Centralizes equality and lexicographical comparison for container relations. | [직접 작성] | [직접 작성] | [직접 작성] |
| `e3462cec55a1` | Defines iterator type metadata and pointer traits. | [직접 작성] | [직접 작성] | [직접 작성] |
| `7a8e3d32bb4d` | Adds the bidirectional reverse-iterator base convention. | [직접 작성] | [직접 작성] | [직접 작성] |
| `ae50e9038643` | Extends reverse iteration to the random-access operations needed by vector. | [직접 작성] | [직접 작성] | [직접 작성] |
| `455098520e83` | Verifies the utility layer before containers depend on it. | [직접 작성] | [직접 작성] | [직접 작성] |
| `f36ec7e7e047` | Makes strict warning-enabled C++98 compilation the repeatable baseline. | [직접 작성] | [직접 작성] | [직접 작성] |

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
| Overload selection / type classification | `ecc0668d6d9c` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Pair value contract | `1c8692d14118` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Shared range comparison | `07cf5893a53c` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Iterator metadata | `e3462cec55a1` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Reverse traversal convention | `7a8e3d32bb4d` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Random-access reverse operations | `ae50e9038643` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Utility composition test | `455098520e83` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Strict C++98 build baseline | `f36ec7e7e047` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |

## 11. 학습 완료 자가 점검

- [ ] Commit map의 모든 SHA를 source 순서대로 확인했습니다.
- [ ] 각 commit 기록에 final HEAD가 아니라 해당 SHA의 실제 코드 근거가 있습니다.
- [ ] S/A commit은 decision, failure boundary, ownership/state transition을 설명할 수 있습니다.
- [ ] Test/perf commit은 production invariant, technique, production path, 증명/비증명 범위를 구분했습니다.
- [ ] Fix가 있는 경우 기존 가정 → failure/risk → root cause → 수정 → regression 연결을 설명할 수 있습니다.
- [ ] Invariant ledger가 commit history에 따라 어떻게 변했는지 설명할 수 있습니다.
- [ ] Thread 최종 상태와 architecture/execution flow를 실제 코드 근거로 자기 말로 설명할 수 있습니다.
