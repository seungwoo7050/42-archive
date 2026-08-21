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
- 확인한 파일/심볼: `include/ft_type_traits.hpp`의 `enable_if`, `integral_constant`, `true_type`, `false_type`, `is_integral`.
- 필요한 경우 비교할 직전 관련 SHA/parent: 해당 commit의 parent에는 이 header가 없으며, 이 SHA에서는 독립 utility 선언만 추가됩니다.

#### 설계·상태 변화 기록

- 이 commit 직전 상태: 프로젝트 내부에 compile-time 조건으로 overload 후보를 제거하거나 integral type을 분류하는 공용 형식이 없었습니다.
- 해결하려던 문제: C++98에서 count 인자와 iterator 인자를 받는 template overload를 runtime 분기 없이 구분할 기반이 필요했습니다.
- 선택한 결정: `enable_if<false, T>`에는 `type`을 두지 않고, `enable_if<true, T>` specialization만 `type`을 노출했습니다. `is_integral`은 기본적으로 false이며 지원하는 정수 형식만 true specialization으로 열거했습니다.
- 새로 생긴 책임 경계 또는 상태 변화: overload 선택과 type 분류는 container 구현이 아니라 `ft_type_traits.hpp`가 담당하게 됐습니다. runtime 상태와 ownership 변화는 없습니다.

#### A-level 핵심 확인

- 중요 boundary/failure path: false 조건은 compile error를 직접 발생시키는 경로가 아니라 substitution 대상에서 해당 후보를 제거하는 경계입니다. 이 SHA에는 실제 consumer가 없으므로 동작 연결은 아직 선언 수준에서만 확인됩니다.
- state/ownership/lifecycle 영향: 없습니다. 전부 compile-time 형식과 상수입니다.
- 이 commit이 보장하는 것과 남은 한계: 기본 SFINAE와 C++98 integral 분류를 제공합니다. cv-qualified 정수 형식 처리나 실제 fill/range overload 적용은 이 SHA에서 증명하지 않습니다.
- 다음 관련 commit과의 연결: `pair`, algorithm, iterator utility가 같은 독립 header 계층을 확장하며, 이후 vector/map 공개 API가 이 공용 vocabulary를 소비합니다.

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
- 확인한 파일/심볼: `include/ft_pair.hpp`의 `pair`, 관계 연산자, `make_pair`.
- 필요한 경우 비교할 직전 관련 SHA/parent: parent에는 pair header가 없고, 이 commit이 독립 value type을 추가합니다.

#### 설계·상태 변화 기록

- 이 commit 직전 상태: 두 값을 묶어 map value와 `insert` 결과를 표현할 프로젝트 내부 형식이 없었습니다.
- 해결하려던 문제: 서로 다른 형식을 보존하는 두 필드, 변환 가능한 pair 간 복사, 일관된 관계 연산이 필요했습니다.
- 선택한 결정: `first_type`/`second_type`과 public `first`/`second`를 갖는 값 형식을 만들고, converting constructor와 assignment를 멤버 단위로 구현했습니다. `<`는 first 우선의 사전식 비교입니다.
- 새로 생긴 책임 경계 또는 상태 변화: map은 나중에 key/value 묶음과 `(iterator, bool)` 반환을 같은 공용 pair 계약으로 표현할 수 있게 됐습니다.

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: associative container가 사용할 값/결과 형식을 먼저 고정합니다.
- 핵심 코드와 상태 변화: pair는 두 멤버를 직접 소유하며 별도 자원 관리가 없습니다. 관계 연산은 `==`와 `<`를 기준으로 나머지를 파생합니다.
- 다음 commit에 넘기는 전제: container 관계 연산은 pair 원소 비교와 공용 range algorithm을 조합할 수 있습니다.

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
- 확인한 파일/심볼: `include/ft_algorithm.hpp`의 `equal` 두 overload와 `lexicographical_compare` 두 overload.
- 필요한 경우 비교할 직전 관련 SHA/parent: parent에는 공용 range comparison header가 없습니다.

#### 설계·상태 변화 기록

- 이 commit 직전 상태: container별 관계 연산이 생기면 범위 비교 loop를 중복 구현해야 하는 상태였습니다.
- 해결하려던 문제: 서로 다른 iterator 종류에도 적용되는 equality와 lexicographic ordering이 필요했습니다.
- 선택한 결정: `!=`, dereference, prefix increment만으로 진행하는 generic loop를 두고, mismatch 또는 ordering이 결정되는 즉시 반환합니다. 한 범위가 다른 범위의 prefix이면 종료 iterator 상태로 짧은 범위를 판정합니다.
- 새로 생긴 책임 경계 또는 상태 변화: 범위 비교 규칙은 container 밖 공용 algorithm header가 담당합니다.

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: vector/map 관계 연산이 동일한 비교 규칙을 재사용하게 합니다.
- 핵심 코드와 상태 변화: 입력 범위를 읽기만 하며 iterator와 원소를 수정하지 않습니다. random-access 연산을 요구하지 않습니다.
- 다음 commit에 넘기는 전제: iterator가 최소한 dereference, increment, equality를 제공하면 공용 algorithm에 참여할 수 있습니다.

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
- 확인한 파일/심볼: `include/ft_iterator.hpp`의 `iterator`, `iterator_traits<Iterator>`, `iterator_traits<T*>`, `iterator_traits<const T*>`.
- 필요한 경우 비교할 직전 관련 SHA/parent: parent에는 iterator metadata protocol이 없습니다.

#### 설계·상태 변화 기록

- 이 commit 직전 상태: generic adaptor가 iterator의 category와 value/reference/difference type을 공통 방식으로 얻을 수 없었습니다.
- 해결하려던 문제: class iterator와 raw pointer를 동일한 traits protocol로 다뤄야 했습니다.
- 선택한 결정: class iterator는 nested typedef를 추출하고, `T*`와 `const T*`는 random-access category와 `std::ptrdiff_t`를 명시하는 specialization을 제공합니다.
- 새로 생긴 책임 경계 또는 상태 변화: concrete container가 아니라 iterator type 자체 또는 pointer specialization이 traversal metadata를 제공합니다.

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: reverse iterator가 vector pointer와 map iterator 모두에서 형식을 추출할 기반입니다.
- 핵심 코드와 상태 변화: compile-time aliases만 추가되며 runtime 객체 상태는 없습니다.
- 다음 commit에 넘기는 전제: reverse adaptor는 `iterator_traits<Iterator>`만 보면 reference, pointer, difference type을 결정할 수 있습니다.

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
- 확인한 파일/심볼: `include/ft_iterator.hpp`의 `reverse_iterator`, `base`, `operator*`, `operator++`, `operator--`, heterogeneous `==`/`!=`.
- 필요한 경우 비교할 직전 관련 SHA/parent: `e3462cec55a1`이 traits protocol을 먼저 제공합니다.

#### 설계·상태 변화 기록

- 이 commit 직전 상태: iterator metadata는 있었지만 traversal 방향을 뒤집는 공용 adaptor는 없었습니다.
- 해결하려던 문제: vector와 map이 별도 reverse iterator를 구현하지 않고 같은 base convention을 사용해야 했습니다.
- 선택한 결정: 저장된 `_current`는 reverse 원소 자체가 아니라 그 원소 바로 다음의 forward position입니다. dereference는 복사한 base를 한 번 감소시켜 접근하며, reverse `++`는 base `--`, reverse `--`는 base `++`입니다.
- 새로 생긴 책임 경계 또는 상태 변화: adaptor는 base iterator 하나만 소유하고 실제 container/element ownership은 갖지 않습니다.

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: bidirectional traversal이 가능한 모든 iterator에 공통 reverse view를 제공합니다.
- 핵심 코드와 상태 변화: `_current`만 이동하며 underlying sequence는 변하지 않습니다. conversion 가능 여부는 base iterator 변환 가능성에 의해 제한됩니다.
- 다음 commit에 넘기는 전제: pointer-backed vector를 완전히 지원하려면 arithmetic, ordering, indexing, distance가 추가돼야 합니다.

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
- 확인한 파일/심볼: `include/ft_iterator.hpp`의 `operator+`, `operator-`, `operator+=`, `operator-=`, `operator[]`, 관계 연산자와 non-member distance.
- 필요한 경우 비교할 직전 관련 SHA/parent: `7a8e3d32bb4d`의 bidirectional base convention을 확장합니다.

#### 설계·상태 변화 기록

- 이 commit 직전 상태: reverse traversal은 가능했지만 vector iterator처럼 offset 이동과 ordering을 요구하는 API는 완성되지 않았습니다.
- 해결하려던 문제: reverse 방향에서 forward base의 산술과 순서가 반전된다는 규칙을 모든 random-access 연산에 일관되게 적용해야 했습니다.
- 선택한 결정: `r + n`은 `base - n`, `r - n`은 `base + n`, `lhs - rhs`는 `rhs.base() - lhs.base()`로 구현했습니다. `<`도 base의 `>`에 대응합니다.
- 새로 생긴 책임 경계 또는 상태 변화: random-access 기능은 base iterator가 같은 연산을 제공한다는 compile-time 전제를 가집니다.

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: vector의 `rbegin`/`rend` 및 reverse random-access 표면을 완성합니다.
- 핵심 코드와 상태 변화: base 위치만 산술적으로 이동하며 element 수명이나 storage는 바꾸지 않습니다.
- 다음 commit에 넘기는 전제: utility test가 raw array/pointer를 통해 base convention과 traits를 조합 검증할 수 있습니다.

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
- 확인한 파일/심볼: `tests/test_containers.cpp`의 utility 관련 test 함수와 `main` 호출 경로.
- 필요한 경우 비교할 직전 관련 SHA/parent: utility headers가 모두 존재하는 `ae50e9038643` 이후 상태입니다.

#### Test/verification 학습 기록

- 대상 production invariant: pair/traits/algorithm/reverse adaptor가 서로 호환되는 C++98 utility surface를 제공해야 합니다.
- 재현하는 failure 또는 boundary: integral과 non-integral 분류, equal mismatch, lexicographic prefix/차이, raw-array reverse traversal, pointer traits 형식입니다.
- test technique: 고정 입력에 대한 deterministic unit/integration assertion입니다. 표준 컨테이너와의 differential test나 failure injection은 아닙니다.
- 통과하는 production 코드 경로: `ft::pair` 생성·비교, `is_integral`, `equal`, `lexicographical_compare`, `iterator_traits<T*>`, `reverse_iterator<int*>`입니다.
- 이 테스트가 증명하는 것: 대표 입력에서 utility 선언이 함께 compile되고 예상 값을 반환합니다.
- 이 테스트가 증명하지 않는 것: container ownership, allocator state, exception rollback, 모든 변환/형식 조합은 증명하지 않습니다.
- 성격: 여러 utility를 한 executable에서 확인하는 초기 broad baseline입니다. 특정 과거 버그를 재현하는 regression은 아닙니다.
- 후속 변경에서 막아야 하는 회귀: public utility 이름/형식/기본 의미가 바뀌어 이후 container compile 또는 기본 비교가 깨지는 회귀입니다.
- 실행 증거: 이 작업 환경에서는 repository checkout이 불가능해 executable을 실행하지 않았습니다. 위 내용은 SHA diff의 test code 검사 결과입니다.

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: container 구현 전 utility 문제를 독립적으로 좁혀 잡을 기준을 만듭니다.
- 핵심 코드와 상태 변화: production 상태 변화는 없고 test target이 utility API를 소비합니다.
- 다음 commit에 넘기는 전제: strict C++98 flags와 반복 가능한 Make target이 이 test를 동일 조건으로 compile/run해야 합니다.

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
- 확인한 파일/심볼: `Makefile`의 `CXXFLAGS`, `CPPFLAGS`, `BUILD_DIR`, test binary rule, `test`, `clean`, `fclean`, `re`; `.gitignore`의 build artifact 제외.
- 필요한 경우 비교할 직전 관련 SHA/parent: `455098520e83`의 test source는 있었지만 반복 가능한 build contract가 없었습니다.

#### 설계·상태 변화 기록

- 이 commit 직전 상태: test source가 존재해도 호출자마다 compiler mode와 warning 조건이 달라질 수 있었습니다.
- 해결하려던 문제: C++98 전용 public headers를 현대 기본 mode나 느슨한 warning 조건에서 우연히 통과시키지 않아야 했습니다.
- 선택한 결정: compile command에 `-Wall -Wextra -Werror -std=c++98`과 `-Iinclude`를 고정하고, 모든 public header를 dependency로 둔 test binary를 `build/`에 생성합니다. `test` loop는 각 binary를 실행하고 nonzero 즉시 종료합니다.
- 새로 생긴 책임 경계 또는 상태 변화: Makefile이 language/warning mode와 test 실행 순서를 반복 가능한 acceptance boundary로 소유합니다.

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: utility API의 C++98 compile 가능성을 프로젝트 build 규칙으로 강제합니다.
- 핵심 코드와 상태 변화: source/header가 바뀌면 binary가 재빌드되며 generated artifacts는 source tree와 분리됩니다.
- 다음 commit에 넘기는 전제: 이후 vector/map/test가 같은 flags와 target convention에 편입될 수 있습니다.
- 실행 증거: Makefile 코드는 검사했으나 이 환경에서는 checkout 실패 때문에 `make test`를 실제 실행하지 않았습니다.

## 6. Invariant ledger

### Source에서 확정된 관련 invariant

- Every supported public header is self-contained under strict C++98 compilation, and the header-only implementation is safe to include from multiple translation units without linkage or ODR failures.

### 시간에 따른 변화 기록

| Invariant | 처음 도입된 commit | 부족함이 드러난 commit/상태 | 강화·복구한 fix | 고정한 test/perf | 직접 확인한 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| Every supported public header is self-contained under strict C++98 compilation, and the... | `ecc0668d6d9c`에서 독립 utility header 구성이 시작됨 | 이 Thread 시점에는 전체 public header 단독 compile 및 multi-TU link 검사가 아직 없음 | 이 Thread 내부 fix는 없음. 후속 Thread 06의 `d938c0079994`, `072c49832ddc`가 검증 범위를 확장함 | `455098520e83`, `f36ec7e7e047` | `include/ft_*.hpp`, `tests/test_containers.cpp`, Makefile의 `-std=c++98` test rule |

## 7. Failure → Fix → Test 연결

| 기존 상태/production change | fix 또는 verification | Source에서 확정된 연결 관점 | 실제 failure/root cause | 실제 test production path |
| --- | --- | --- | --- | --- |
| `Utility layer` | `455098520e83` | 공용 utility baseline verification | utility별 선언이 있어도 조합 compile과 대표 의미가 검증되지 않은 상태 | test executable이 pair/traits/algorithm/reverse iterator를 직접 호출 |
| `C++98 build contract` | `f36ec7e7e047` | strict C++98 compilation baseline | 수동 compiler invocation에서는 language mode와 warning 조건이 재현되지 않음 | Makefile compile rule → test binary → nonzero 즉시 중단 loop |

## 8. Ownership / state / responsibility 변화

| 시점 | Owner / state / responsibility | 변경 전 | 변경 후 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| `ecc0668d6d9c` | Establishes substitution-based overload selection and compile-time type classification. | 공용 type dispatch 부재 | traits header가 SFINAE와 integral 분류 담당 | `include/ft_type_traits.hpp` |
| `1c8692d14118` | Supplies the pair value and return type required by associative-container APIs. | 두 값/결과 형식 부재 | `ft::pair`가 두 멤버와 관계 연산 소유 | `include/ft_pair.hpp` |
| `07cf5893a53c` | Centralizes equality and lexicographical comparison for container relations. | container별 비교 중복 가능 | 공용 range algorithm이 읽기 전용 비교 담당 | `include/ft_algorithm.hpp` |
| `e3462cec55a1` | Defines iterator type metadata and pointer traits. | iterator별 metadata 접근 규칙 부재 | traits protocol과 pointer specialization 확립 | `include/ft_iterator.hpp` |
| `7a8e3d32bb4d` | Adds the bidirectional reverse-iterator base convention. | reverse traversal 부재 | adaptor가 base iterator 하나로 반대 방향 표현 | `reverse_iterator::_current`, `operator*`, `++`, `--` |
| `ae50e9038643` | Extends reverse iteration to the random-access operations needed by vector. | bidirectional 기능만 존재 | 산술·순서·distance가 base 반전 규칙으로 확장 | reverse random-access operators |
| `455098520e83` | Verifies the utility layer before containers depend on it. | 선언만 존재 | 대표 utility composition을 test가 소비 | `tests/test_containers.cpp` |
| `f36ec7e7e047` | Makes strict warning-enabled C++98 compilation the repeatable baseline. | 수동 build 조건 | Makefile이 flags, artifacts, execution을 소유 | `Makefile` |

## 9. Thread 최종 상태

- 최종적으로 성립한 representation/state: traits, pair, range algorithms, iterator metadata, reverse adaptor가 서로 독립 public header로 존재하며 Makefile이 C++98 compile/test 조건을 묶습니다.
- 최종적으로 보장하는 invariant: 해당 SHA들의 코드상 utility는 서로 조합 가능한 공용 vocabulary를 제공하고 strict C++98 test target에 편입됩니다. 전체 public header self-containment와 multi-TU ODR 안정성은 후속 Thread 06에서 별도 검증됩니다.
- 남아 있는 precondition 또는 보장하지 않는 범위: adaptor의 random-access 연산은 base iterator가 해당 연산을 제공해야 합니다. 이 Thread의 test는 allocator/exception/container lifetime을 다루지 않습니다.
- 최종 verification evidence: `455098520e83`의 utility assertions와 `f36ec7e7e047`의 strict build/test rule을 코드로 확인했습니다. 실제 실행은 수행하지 못했습니다.
- 이 상태에 도달하기 위해 필요했던 핵심 turning point commit: compile-time dispatch 경계를 만든 `ecc0668d6d9c`와 반복 가능한 acceptance 조건을 만든 `f36ec7e7e047`입니다.

## 10. 최종 architecture 또는 execution flow 정리

아래 단계명은 source가 정의한 Thread progression을 따라가는 탐색 순서입니다. 실제 함수·상태·분기·코드 조각은 해당 SHA에서 직접 채웁니다.

| 단계 | 관련 commit | 실제 코드 위치 | 입력/기존 상태 | 핵심 transition | failure/cleanup | 다음 단계에 남기는 invariant |
| --- | --- | --- | --- | --- | --- | --- |
| Overload selection / type classification | `ecc0668d6d9c` | `ft_type_traits.hpp` | template 조건과 후보 type | true specialization만 nested `type` 공개 | runtime cleanup 없음; false는 substitution에서 탈락 | 공용 compile-time dispatch 가능 |
| Pair value contract | `1c8692d14118` | `ft_pair.hpp` | 두 값 또는 변환 가능한 pair | 두 멤버 저장·변환·사전식 비교 | 별도 자원 없음 | map value/result 형식 준비 |
| Shared range comparison | `07cf5893a53c` | `ft_algorithm.hpp` | 두 iterator range | mismatch/order 결정까지 순차 전진 | mutation/cleanup 없음 | container 관계 연산 재사용 가능 |
| Iterator metadata | `e3462cec55a1` | `ft_iterator.hpp` | class iterator 또는 pointer | traits가 category/value/difference 추출 | runtime 없음 | adaptor가 concrete container에서 분리됨 |
| Reverse traversal convention | `7a8e3d32bb4d` | `reverse_iterator` | forward base position | dereference 시 base 복사 후 감소, 이동 방향 반전 | element ownership 없음 | bidirectional reverse traversal |
| Random-access reverse operations | `ae50e9038643` | reverse operators | base와 offset/다른 reverse iterator | 산술·순서·distance 피연산 방향 반전 | base precondition 위반은 별도 처리 없음 | vector reverse API 지원 |
| Utility composition test | `455098520e83` | `tests/test_containers.cpp` | 고정 utility 입력 | assertions로 대표 결과 검사 | 실패 시 test process 종료 | container 도입 전 baseline |
| Strict C++98 build baseline | `f36ec7e7e047` | `Makefile` | source/header/test | strict flags로 build 후 binary loop 실행 | nonzero 즉시 중단, clean은 build 제거 | 반복 가능한 C++98 acceptance boundary |

## 11. 학습 완료 자가 점검

- [x] Commit map의 모든 SHA를 source 순서대로 확인했습니다.
- [x] 각 commit 기록에 final HEAD가 아니라 해당 SHA의 실제 코드 근거가 있습니다.
- [x] S/A commit은 decision, failure boundary, ownership/state transition을 설명할 수 있습니다.
- [x] Test/perf commit은 production invariant, technique, production path, 증명/비증명 범위를 구분했습니다.
- [x] Fix가 있는 경우 기존 가정 → failure/risk → root cause → 수정 → regression 연결을 설명할 수 있습니다.
- [x] Invariant ledger가 commit history에 따라 어떻게 변했는지 설명할 수 있습니다.
- [x] Thread 최종 상태와 architecture/execution flow를 실제 코드 근거로 자기 말로 설명할 수 있습니다.
