# 프로젝트 중요도 프로필

프로젝트: ft_containers (`cpp/ft_container`)
도메인: Header-only C++98 제네릭 컨테이너 라이브러리
주요 목적: `ft::vector`, `ft::stack`, `ft::map`과 이를 지원하는 유틸리티에 대해 표준 라이브러리와 유사한 일부 인터페이스를 구현하고, allocator 소유권, 객체 수명, 예외 동작, iterator 계약, red-black tree 불변식, public header 사용성, 점근적 동작을 명시적으로 검증할 수 있게 한다.
확정 커밋 범위: `84de7f67ab5b`부터 `1a890fbf69f9`까지 오래된 순으로 정렬한 `cpp/ft_container`의 독립적이고 선형적인 전체 64개 커밋 이력이다. merge commit이나 관련 없는 상속 ancestor는 없다. 64개 커밋을 모두 분류했으며, documentation-only 커밋 두 개는 `commit-bodies.md`에서는 올바르게 제외되었지만 이 문서에는 포함한다.

## 핵심 기술 영역

- C++98 template dispatch, type traits, value pair, 공용 range algorithm, iterator traits, reverse-iterator adaptation.
- `ft::vector`의 연속 저장소 소유권, allocator를 통한 생성과 파괴, size/capacity 분리, growth 산술, self-aliasing, in-place와 reallocation mutation의 구분, exception safety.
- 기존 sequence container 위에 얇게 구성한 LIFO adaptor인 `ft::stack`.
- `ft::map`의 node allocation, comparator가 정의하는 ordering, ordered query, red-black insertion/deletion balancing, sentinel 기반 end-state 표현, iterator 안정성, policy/allocator 소유권.
- Header-only public API 구성, self-contained component header, multi-translation-unit 사용, C++98 compiler 호환성, sanitizer instrumentation, continuous integration.
- 표준 컨테이너와의 differential test, custom allocator와 throwing policy를 이용한 failure injection, white-box red-black 검증, deterministic randomized test, 구조적 복잡도 상한.

## 핵심 아키텍처

- 유틸리티 계층은 traits, pair, algorithm, iterator용 독립 헤더로 나뉜다. 컨테이너 헤더는 이 추상화를 사용하며, `ft_containers.hpp`는 aggregate public entry point를 제공한다.
- `ft::vector`는 allocator, 연속 allocation pointer, 생성된 원소 수, allocation capacity를 소유한다. `[data, data + size)` 범위에는 살아 있는 객체가 있고, `[data + size, data + capacity)`는 raw storage이므로 생성된 객체처럼 취급해서는 안 된다.
- `ft::stack`은 별도의 storage algorithm을 소유하지 않는다. underlying container의 back에 대한 접근만 허용하고 size, lifetime, 관계 연산 동작을 위임한다.
- `ft::map`은 allocator가 생성한 node에 값을 저장하고 이를 red-black tree로 연결한다. value-free header sentinel이 root, minimum, maximum link를 소유하며 `end()`의 안정적인 표현이기도 하다.
- map의 comparator는 key equivalence와 tree ordering을 정의하고, rebound node allocator는 실제 node ownership을 정의한다. copy, assignment, swap은 policy state와 소유한 tree state의 일관성을 유지해야 한다.
- 검증은 여러 계층으로 구성한다. public differential test, 특정 edge/failure test, iterator-state test, 제한된 내부 tree inspector, deterministic randomized operation, complexity bound, 독립 header compilation, linked consumer test, sanitizer, compiler/platform CI를 사용한다.

## 핵심 불변식

- `[0, size)`의 모든 vector 원소는 정확히 한 번 생성되고 정확히 한 번 파괴된다. `size` 이후의 storage는 명시적으로 생성되기 전까지 초기화되지 않은 상태로 남아야 한다.
- Vector storage는 이를 할당한 상태와 호환되는 allocator state로 deallocate해야 한다. allocation 또는 construction 실패는 block을 leak하거나 `size`가 생성되지 않은 객체의 소유권을 주장하는 상태를 남겨서는 안 된다.
- Reallocation은 replacement block이 완성된 뒤에만 commit한다. 지원하는 계약이 상태 보존을 요구하는 경우 construction 실패 시 기존 vector는 변경되지 않아야 한다. in-place operation도 최소한 lifetime bookkeeping을 유효하게 유지하고 container가 정상적으로 destructible한 상태를 보장해야 한다.
- Range assignment와 insertion은 source vector를 변경하기 전에 self-referential input을 snapshot해야 한다. 그래야 source iterator와 aliased value가 소비되기 전에 무효화되지 않는다.
- 요청된 vector size와 growth 계산은 unsigned overflow나 잘못된 capacity 선택 없이 `allocator::max_size()`를 따라야 한다.
- Map key는 comparator 기준으로 엄격하게 정렬되어야 한다. root는 black이고, red node에는 red child가 없어야 하며, 모든 null-leaf 경로의 black height가 같아야 한다. parent/child link는 서로 일치하고, 도달 가능한 value node 수는 `size()`와 같아야 한다.
- map header sentinel은 black이며 값을 갖지 않는다. 빈 map에서는 두 extrema가 header 자신을 가리키고, 비어 있지 않은 map에서는 현재 root, minimum, maximum을 가리키며 root도 header를 parent로 가리킨다.
- Rotation과 erase가 아닌 구조 변경은 element-node identity를 보존한다. 저장해 둔 element iterator는 갱신된 parent link를 따라가며, `end()`는 stale root snapshot이 아니라 컨테이너가 소유한 sentinel state에 계속 연결되어야 한다.
- 모든 failure boundary에서 각 map node는 정확히 하나의 owner를 갖거나 이미 해제된 상태여야 한다. policy assignment가 예외를 던질 때 comparator, allocator, tree ownership이 부분적으로 교환되어서는 안 된다.
- 지원하는 모든 public header는 엄격한 C++98 compilation 환경에서 self-contained해야 하며, header-only 구현은 여러 translation unit에서 include해도 linkage 또는 ODR failure가 없어야 한다.

## 주요 엔지니어링 난점

- vector insertion을 spare-capacity 경로와 reallocation 경로 모두에서 구현하면서, 살아 있는 객체에 대한 assignment와 raw storage에 대한 construction을 구분하고, aliased input을 보존하며, 예외 이후 부분 생성된 tail을 정리하는 작업.
- 사용자 정의 copy, assignment, allocation이 예외를 던질 때 lifetime과 ownership 불변식을 유지할 수 있도록 vector의 일반 construction, assignment, resize, growth 경로를 충분히 transactional하게 만드는 작업.
- red-black insertion과 deletion 구현. 특히 black node 삭제 후 replacement가 null일 수 있는 상황에서 대칭적인 sibling, recoloring, rotation case 전체에 explicit parent context를 전달해야 하는 deletion 처리.
- root를 보유하는 null-end iterator 설계를 value-free header sentinel로 교체해 rotation, root 교체, erasure, clear, swap 이후에도 올바르게 동작하게 하고 default-constructible key를 요구하지 않도록 하는 작업.
- node rebinding, insertion, construction, copy assignment, public swap 전반에서 stateful allocator와 comparator semantics를 보존하고, comparator call 및 comparator assignment 경계에서 발생하는 예외까지 처리하는 작업.
- public sorted output만으로 증명할 수 없는 red-black color rule, black height, parent link, header extrema, node reachability, iterator stability, logarithmic structural bound를 검증하는 작업.

## 실무 엔지니어링 영역

- 표준 컨테이너가 유효한 behavioral oracle인 경우 `std::vector`, `std::stack`, `std::map`과 결과를 differential 방식으로 비교.
- overlapping self-range modifier처럼 프로젝트가 정의한 snapshot contract가 필요하고 잠재적으로 부적절한 reference operation을 사용할 수 없는 경우 기대값을 명시적으로 구성.
- `max_size`, allocator identity, outstanding block, allocation failure point를 노출하는 bounded/stateful custom allocator.
- 잘못된 copy/destruction, partial mutation, policy assignment, rollback 동작을 드러내는 throwing element type과 comparator.
- 고정 seed, operation index, 실패 시 operation prefix를 이용한 재현 가능한 deterministic randomized test.
- production debug state가 아니라 제한된 test-only inspector를 통한 white-box validation.
- timing-sensitive microbenchmark 대신 tree height와 comparator count를 이용한 구조적 complexity check.
- 엄격한 경고가 활성화된 C++98 build, 격리된 sanitizer output, 독립 public-header compilation, multi-translation-unit consumer linkage, cross-compiler/platform CI.

## S 등급 기준

- core container의 최종 ownership 또는 representation model을 확립한 변경. 특히 vector의 live-object/raw-storage 경계나 map의 sentinel/tree 구조가 이에 해당한다.
- red-black insertion 또는 deletion balancing처럼 없으면 컨테이너가 약속한 동작이나 점근적 모델이 성립하지 않는 핵심 메커니즘을 구현한 변경.
- 국소적인 guard를 추가하는 수준이 아니라 프로젝트를 규정하는 비자명한 lifetime 또는 iterator correctness 문제를 구조적 원인에서 해결한 변경.
- 완성된 프로젝트의 동작 방식과 주요 mutation 경로에서의 정확성을 설명하려면 반드시 포함해야 하는 설계 결정.

## A 등급 기준

- 컨테이너 전체 아키텍처를 다시 정의하지는 않지만 중요한 allocator, aliasing, exception, iterator, ownership 불변식을 복구한 변경.
- C++98 제약 때문에 필요한 프로젝트 전반의 기반 유틸리티를 도입하고, 그 메커니즘이 이후 인터페이스에 실질적인 영향을 준 변경.
- core mechanism에 대한 신뢰 수준을 실질적으로 높이는 고가치 failure injection, structural validation, complexity verification을 추가한 변경.
- 실패 시 resource leak, state corruption, 지원하는 public contract 위반으로 이어질 수 있는 비자명한 root cause 또는 transaction boundary를 수정한 변경.

## 일반적인 B 등급 작업

- 이미 확립된 representation 안에서 일반 constructor, accessor, query, comparison, adaptor, mutation 등 기대되는 컨테이너 연산을 구현한 작업.
- core architecture나 invariant를 직접 확립하지는 않지만 이를 뒷받침하는 normal-path differential test 또는 특정 regression test 추가.
- 확립된 엔지니어링 패턴을 사용한 실용적인 build, packaging, public-header, consumer, sanitizer, CI integration.
- 프로젝트의 주된 책임이나 ownership boundary를 바꾸지 않고 기존 iterator 또는 utility abstraction을 확장한 작업.

## 일반적인 C 등급 작업

- Documentation-only commit.
- 더 넓은 기존 coverage에 비해 추가 증거가 거의 없는 최소 smoke test 또는 accessor check.
- 독립적인 구조적·동작적 영향이 거의 없는 기계적인 include 구성이나 작은 compatibility check.
- 유용한 housekeeping이지만 프로젝트의 중요한 기술적 결정을 설명하는 데 기여하지 않는 변경.

## 프로젝트 전용 태그

CXX98 — 언어 버전 제약, template substitution, 엄격한 C++98 compatibility.
VECTOR — 연속 vector storage, capacity, element lifetime, aliasing, modifier.
RB_TREE — Map의 binary-search-tree/red-black-tree 표현, balancing, ordering, invariant.
ITERATOR — Iterator traits, traversal, const/reverse interoperability, end-state 표현, validity.
ALLOCATOR — Allocator state, rebinding, allocation/deallocation pairing, resource ownership.
EXCEPTION — Rollback, partial-failure containment, failure 이후 state guarantee.
PUBLIC_API — Header-only packaging, self-contained header, consumer linkage, build acceptance, CI surface.

# 커밋 분류

| Commit | Subject | Importance | Tags | Summary | Why |
| --- | --- | --- | --- | --- | --- |
| `84de7f67ab5b` | `docs(readme): C++98 컨테이너 개발 기준 정의` | C | - | C++98 범위와 개발 기준을 담은 초기 README를 추가한다. | 프로젝트의 맥락을 설명하는 데는 유용하지만 실행 동작, representation, 검증 메커니즘, build contract를 변경하지 않는 documentation-only 변경이다. |
| `ecc0668d6d9c` | `feat(type-traits): CXX98 타입 선택 도구 구현` | A | CXX98, ARCH, LEARNING | C++98 template dispatch를 위한 `enable_if`, integral constant, integral-type detection을 도입한다. | fill/range overload가 runtime dispatch 없이 공존하게 하는 프로젝트 전반의 메커니즘이다. 컨테이너의 핵심 메커니즘 자체라기보다 표준적인 utility 구현이지만, 이후 인터페이스를 가능하게 하는 중요한 기반 설계 결정이다. |
| `1c8692d14118` | `feat(pair): 값 쌍과 관계 연산 구현` | B | CXX98 | `ft::pair`, converting construction, relational operator, `make_pair`를 구현한다. | map value와 반환 계약을 지원하는 데 필요한 타입이지만, 구현은 확립된 value-type semantics를 따르며 프로젝트 고유의 판단은 제한적이다. |
| `07cf5893a53c` | `feat(algorithm): 공용 범위 비교 알고리즘 구현` | B | CXX98, PRACTICAL | 공용 equality 및 lexicographical range-comparison algorithm을 추가한다. | 알고리즘을 한곳에 모아 컨테이너마다 comparison logic을 중복하지 않게 하지만, 이미 이해된 설계 안에서 예상 가능한 generic algorithm을 직접 구현한 작업이다. |
| `e3462cec55a1` | `feat(iterator): iterator 기본 형식과 traits 정의` | B | CXX98, ITERATOR | pointer specialization을 포함한 iterator 기본 형식과 `iterator_traits`를 정의한다. | traits 계층은 reverse iterator와 컨테이너에 필요하지만, 프로젝트를 규정하는 architecture decision보다 관례적인 support infrastructure에 가깝다. |
| `7a8e3d32bb4d` | `feat(iterator): 역방향 반복자의 양방향 동작 구현` | B | ITERATOR | bidirectional reverse-iterator의 construction, dereference, increment, decrement, equality를 구현한다. | base-iterator 규약을 사용해 기대되는 reverse traversal semantics를 확립하지만, utility 설계 내부의 일반적인 구현 작업이다. |
| `ae50e9038643` | `feat(iterator): 역방향 반복자의 임의 접근 연산 완성` | B | ITERATOR | reverse-iterator의 random-access 산술, ordering, indexing, distance를 완성한다. | pointer-backed vector iterator에서 adaptor를 사용할 수 있게 하는 기술적으로 필요한 지원 작업이지만, 프로젝트 architecture나 핵심 ownership model을 바꾸지는 않는다. |
| `455098520e83` | `test(utils): 공용 타입·값·범위·반복자 도구 검증` | B | TEST, CXX98 | pair, type traits, range algorithm, iterator traits, reverse iteration의 초기 검증을 추가한다. | 컨테이너가 의존하기 전에 utility 기반에 대한 기본 신뢰를 마련하지만, 어려운 invariant나 regression보다 일반 동작을 검증한다. |
| `f36ec7e7e047` | `build(makefile): CXX98 검사 빌드 구성` | B | CXX98, PRACTICAL | 엄격한 C++98 Makefile test build를 만들고 생성된 build artifact를 제외한다. | 언어 버전 및 warning compatibility를 반복 가능한 프로젝트 제약으로 만든다. 중요한 실무 인프라이지만 core container mechanism은 아니다. |
| `2eb9cb6c4273` | `feat(vector): allocator 기반 저장소 수명 관리` | S | CORE, VECTOR, ALLOCATOR | allocator 기반 연속 storage, size/capacity state, construction rollback, destruction path를 확립한다. | 이후 모든 vector 연산이 의존하는 ownership representation을 정의한다. 할당된 storage와 생성된 element를 분리하고 cleanup을 중앙화한다. 이 변경을 빼면 컨테이너 architecture와 lifetime model 설명에 큰 공백이 생긴다. |
| `26d8a04e7f57` | `feat(vector): 반복자와 원소 접근 경계 구현` | B | VECTOR, ITERATOR | forward/reverse iteration과 indexed, checked, front/back element access를 추가한다. | 확립된 contiguous representation 위에 직접 구축된 필수 public operation이다. 일반적인 API 구현이며 새로운 ownership 또는 failure guarantee를 도입하지 않는다. |
| `9db46550b13d` | `feat(vector): 용량 확장과 원소 재배치 구현` | A | VECTOR, ALLOCATOR, CORE | capacity query, reserve, geometric growth, exception-aware reallocation을 추가한다. | Reallocation은 vector의 핵심 동적 메커니즘이다. old block을 해제하기 전에 value를 new block에 복사해야 한다. 중요한 결정이지만 이후 commit에서 산술과 transactional edge case를 더 강화한다. |
| `fdd58f1b3e20` | `feat(vector): 크기 변경과 값 범위 할당 구현` | B | VECTOR, CXX98 | 초기 storage primitive를 사용해 range/copy construction, assignment, resize, push/pop, clear를 추가한다. | public surface를 크게 확장하지만 대부분 확립된 representation을 적용한 작업이다. 이후 aliasing 및 exception commit을 통해 이 초기 mutation path가 최종적인 correctness 설계는 아니었음이 드러난다. |
| `9329697eb16e` | `feat(vector): 중간 변경 연산과 관계 비교 완성` | B | VECTOR | positional insert/erase, swap, relational operator를 추가한다. | 일반 sequence 동작과 comparison integration을 완성한다. 직접 construct/destroy하며 shift하는 방식은 이후 lifetime correctness를 위해 교체되는 초기 구현이므로 최종 핵심 메커니즘은 아니다. |
| `4061a6fcb5de` | `test(vector): 핵심 공개 동작을 표준 결과와 비교` | B | TEST, VECTOR | core vector operation과 exception 동작을 `std::vector`와 differential 방식으로 비교한다. | 처음 완성된 vector surface의 normal-path parity를 확립하지만, 이후 엔지니어링의 핵심이 되는 allocator, aliasing, failure-path risk는 아직 다루지 않는다. |
| `805f24ae788b` | `feat(stack): vector 기반 stack 어댑터 구현` | B | CORE, PUBLIC_API | `ft::vector` 위에 비교 연산을 위임하는 얇은 `stack` adaptor를 구현한다. | 기존 컨테이너를 올바르게 재사용하며 별도의 storage invariant를 추가하지 않는다. 일반적인 feature 작업이며 프로젝트의 vector/map 엔지니어링에 비해 부차적이다. |
| `f303b9768bbe` | `test(stack): 기본 동작과 관계 연산 검증` | B | TEST | stack의 push, pop, top, size, emptiness, relation을 `std::stack`과 비교한다. | delegation semantics를 검증하지만 어렵거나 프로젝트를 규정하는 속성보다 단순한 adaptor 동작을 다룬다. |
| `80e169e83212` | `feat(headers): 공용 도구와 순차 컨테이너 통합 헤더 추가` | B | PUBLIC_API, ARCH | utility 계층과 vector, stack을 위한 aggregate public header를 추가한다. | header-only library에 명시적인 packaging boundary를 만든다. consumer에게 중요하지만 구현은 주요 runtime/ownership 결정이 아니라 단순한 구성 작업이다. |
| `3c64a69dd252` | `test(headers): 통합 헤더의 순차 컨테이너 표면 검증` | C | TEST, PUBLIC_API | 기존 test가 component header 대신 aggregate header를 include하도록 바꾼다. | 하나의 include list를 확인하는 작은 integration smoke test다. bundle에 이미 테스트된 header가 포함되어 있음을 확인하는 것 외에는 새 기술적 증거가 거의 없다. |
| `2c6dd8acdd20` | `feat(map): 노드 소유권과 빈 tree 상태 구현` | A | RB_TREE, ALLOCATOR, ARCH | 개별 할당된 map node, parent/child link, null-root empty state, recursive ownership cleanup을 도입한다. | associative container의 기반 ownership layer이며 stable value address를 가능하게 한다. 중요하지만 최종적으로 프로젝트를 규정하는 architecture는 이후 red-black balancing과 value-free header sentinel에서 완성된다. |
| `4bbf81cecef4` | `feat(map): 가변 반복자와 tree 순회 구현` | B | RB_TREE, ITERATOR | successor/predecessor navigation과 root를 보유한 end iterator를 사용해 mutable bidirectional tree traversal을 추가한다. | 필요한 ordered traversal을 제공하지만 iterator마다 결합된 root snapshot이 구조적으로 충분하지 않다는 점이 이후 드러난다. 최종 iterator model이 아니라 중간 구현이다. |
| `50e62b0e0298` | `feat(map): 상수와 역방향 반복자 구현` | B | RB_TREE, ITERATOR | const/reverse map iterator와 const-qualified traversal accessor를 추가한다. | 초기 traversal 설계를 예상되는 const correctness와 reverse iteration으로 확장한다. 일반적인 API 작업이며 앞선 end-state coupling도 그대로 상속한다. |
| `c0fdb8e3f84c` | `feat(map): 삽입과 첨자 및 복사 동작 구현` | B | RB_TREE | unbalanced BST insertion, `operator[]`, range/copy construction, copy assignment를 추가한다. | map의 관찰 가능한 uniqueness 및 insertion semantics를 확립하지만, 이후 commit에서 교체하거나 강화하는 unbalanced하고 transaction 보장이 약한 설계 위에서 동작한다. |
| `e4110ea13f26` | `feat(map): 검색과 경계 query 구현` | B | RB_TREE | find, count, lower/upper bound, equal-range tree query를 구현한다. | 필요한 알고리즘이며 comparator가 정의하는 ordering을 올바르게 사용하지만, 기존 BST representation 안에서 수행하는 직접적인 search다. |
| `0f70c1fcc520` | `feat(map): 삭제와 clear 및 swap 구현` | B | RB_TREE, ALLOCATOR | 초기 BST에 node erasure, range erasure, clear, map swap을 추가한다. | 일반 mutation 및 ownership operation을 완성하지만 deletion은 아직 red-black 구조를 고려하지 않고, swap도 이후 iterator 및 policy-exception correctness를 위해 수정된다. |
| `112af1753538` | `feat(map): 관계 연산과 통합 공개 헤더 완성` | B | PUBLIC_API, RB_TREE | map value comparison, relational operator, non-member swap, aggregate header 포함을 추가한다. | 이미 확립된 shared algorithm으로 기본 public surface를 완성한다. 새로운 core data-structure decision 없이 유용한 integration을 제공한다. |
| `7ae6f88861e3` | `test(map): 삽입·검색·삭제 결과를 표준 map과 비교` | B | TEST, RB_TREE | map insertion, duplicate 처리, query, erasure, copy, ordering을 `std::map`과 differential 방식으로 비교한다. | 기본 public result parity를 확립하지만 balancing, iterator stability, allocator ownership, structural invariant까지 증명할 수는 없다. |
| `6f3cbf4794c9` | `fix(vector): 용량 계산을 allocator 상한에서 포화` | A | VECTOR, ALLOCATOR, EDGE | vector length check와 growth arithmetic이 allocator의 `max_size()`에서 안전하게 포화되도록 한다. | 잘못된 capacity를 선택하거나 잘못된 failure를 보고할 수 있는 비자명한 unsigned-overflow 경계를 닫는다. core representation은 바꾸지 않으면서 중요한 allocator-limit contract를 복구한다. |
| `0ce21f9cf12d` | `test(vector): 제한 allocator에서 용량 상한 검증` | B | TEST, VECTOR, ALLOCATOR | saturated growth, length rejection, block release를 검증하는 bounded allocator test를 추가한다. | custom allocator가 바로 앞의 boundary fix와 ownership cleanup을 직접 검증한다. 의미 있는 regression coverage지만 이미 확립된 하나의 edge condition에 범위가 한정된다. |
| `bdc4c3123bc9` | `fix(vector): 자기 범위 assign과 insert 입력 보존` | A | VECTOR, EDGE, DEBUG | vector assign 또는 insert가 source container를 변경하기 전에 range input을 snapshot한다. | 이전 구현은 self-range modification 중 자신의 iterator를 무효화하거나 덮어쓴 value를 읽을 수 있었다. input capture와 mutation을 분리한 것은 라이브러리가 선택한 snapshot contract를 확립하는 중요한 aliasing 수정이다. |
| `61e8b46e668f` | `test(vector): 자기 범위 변경 결과 검증` | B | TEST, VECTOR, EDGE | reference sequence를 이용한 self-range insert/assign regression case를 추가한다. | fix에서 도입한 aliasing 동작을 고정한다. 중요한 보조 검증이지만 결정적인 기술적 판단은 snapshot 구현 자체에 있다. |
| `4406af809382` | `test(vector): 역방향 순회 결과 검증` | C | TEST, ITERATOR | `ft::vector`와 `std::vector`의 reverse iteration을 짧게 비교한다. | 이미 확립된 reverse-iterator 동작에 대한 좁고 일반적인 coverage 추가이며 주요 엔지니어링 흐름에 대한 기여는 작다. |
| `048ada8fe1c5` | `feat(map): 가변·상수 반복자 상호 비교 지원` | B | ITERATOR, PUBLIC_API | mutable/const map iterator를 대칭적으로 비교할 수 있게 한다. | public iterator interface에 기대되는 interoperability를 복구하지만 변경 범위가 국소적이며, 이후 sentinel 기반 iterator refactor에 포함된다. |
| `0736ef2f9600` | `test(map): 가변·상수 반복자 비교 검증` | C | TEST, ITERATOR | mutable/const map iterator 간 equality와 inequality를 직접 검사한다. | 새로운 구조적 증거나 어려운 failure path 없이 작은 API regression만 확인한다. |
| `6bc71cfedeb5` | `test(map): 역방향 순회와 경계 query 검증` | B | TEST, RB_TREE, ITERATOR | gap/end boundary query와 reverse traversal까지 map test를 확장한다. | 의미 있는 ordered-container 경계를 다루지만 기존 구현에 대한 일반적인 public-result verification 범위에 머문다. |
| `f995dbc53683` | `test(map): 상수 begin과 reverse begin 검증` | C | TEST, ITERATOR | const `begin()`과 const reverse-begin을 검사한다. | 이미 구현된 동작의 최소한의 surface check이며 독립적인 엔지니어링 중요도는 낮다. |
| `ae180871b160` | `fix(map): 값 allocator 상태로 노드 allocator 구성` | A | RB_TREE, ALLOCATOR, RISK | map의 value allocator state에서 rebound node allocator를 구성한다. | node allocator를 기본 생성하면 custom allocator의 state가 조용히 유실되어 allocation ownership과 public allocator contract가 분리된다. 작은 수정이지만 중요한 resource-ownership invariant를 복구한다. |
| `f29fd8a91523` | `feat(map): 레드-블랙 삽입 회전과 색 보정 구현` | S | CORE, RB_TREE, HARD | map의 balance를 유지하기 위해 red/black node state, rotation, insertion fix-up을 추가한다. | 잠재적으로 선형인 BST를 프로젝트의 핵심 ordered-container mechanism인 red-black tree로 바꾼다. rotation/recoloring case가 핵심 logarithmic 구조와 red-black invariant를 확립하므로 이를 빼면 최종 architecture를 설명할 수 없다. |
| `8f8b67961819` | `test(map): 정렬 입력 삽입과 검색 경계 stress 검증` | B | TEST, RB_TREE | 오름차순/내림차순 insertion과 query boundary를 `std::map`과 stress 방식으로 비교한다. | 일반 BST의 worst case를 드러내도록 scenario를 잘 구성해 functional confidence를 높이지만, tree height나 모든 red-black invariant를 직접 검증하지는 않는다. |
| `a055cb19500b` | `feat(map): 레드-블랙 삭제 보정 구현` | S | CORE, RB_TREE, HARD | red-black deletion의 transplant bookkeeping과 대칭적인 double-black fix-up을 구현한다. | deletion은 tree에서 가장 복잡한 core state transition이다. child가 null인 경우에도 removed color, replacement child, parent context, sibling case, rotation, recoloring이 일관되어야 한다. map의 correctness 설명에 필수적인 변경이다. |
| `86922f1ddfa0` | `test(map): 반복 삭제·복사·대입·교환 stress 검증` | B | TEST, RB_TREE | 반복적인 key/iterator erasure와 copy, assignment, swap stress 비교를 추가한다. | deletion balancing 이후 폭넓은 map 동작을 검증하지만, 이후 invariant-aware randomized verification이 더 강한 architecture evidence를 제공한다. 견고한 일반 regression 작업에 해당한다. |
| `835712378454` | `test(map): 범위 삭제 후 상태 검증` | C | TEST, RB_TREE | 전체 range erase 이후 emptiness와 size를 검사한다. | 이미 존재하는 clear 및 반복 erasure coverage에 비해 추가되는 내용이 적은 작은 expected-behavior test다. |
| `2c60c01dd1ca` | `test(map): 비교 함수 접근자 검증` | C | TEST, PUBLIC_API | `key_comp()`와 `value_comp()`를 검사한다. | map relation과 함께 이미 도입된 단순 accessor를 검증하며 구조나 correctness에 미치는 독립적인 영향은 거의 없다. |
| `bc3a74b9342e` | `fix(vector): allocator 형식과 빈 반복자 연산 보정` | A | VECTOR, ALLOCATOR, EDGE | allocator가 제공하는 size type을 사용하고 allocation이 없는 빈 vector에서 pointer arithmetic/subtraction을 피한다. | custom allocator interface correctness와 undefined empty-storage arithmetic을 함께 수정한다. 변경은 작지만 end, insert, erase가 사용하는 기본적인 boundary invariant를 복구한다. |
| `ccb98587e777` | `test(vector): 빈 저장소와 allocator 상태 검증` | B | TEST, VECTOR, EDGE | tracking allocator 환경에서 빈 begin/end equality, zero-count insert, empty erase를 검사한다. | empty-storage 수정을 직접 보호하고 allocation leak이 없음을 확인한다. targeted regression evidence지만 중요한 판단은 구현 fix 자체에 있다. |
| `b3124b3808d5` | `fix(vector): 저장소 교체와 크기 증가를 트랜잭션으로 처리` | A | VECTOR, EXCEPTION, ALLOCATOR | fill construction, assignment, resize growth, aliased push-back에 rollback 또는 temporary-storage transaction을 적용한다. | construction 성공 후에만 state를 commit하고 reallocation 전에 aliased value를 snapshot해 vector의 failure guarantee를 크게 높인다. 중요한 core hardening이지만 insertion에는 별도의 더 본질적인 lifetime redesign이 필요하다. |
| `9051be26db5e` | `test(vector): 생성·대입·크기 변경 실패 주입` | A | TEST, VECTOR, EXCEPTION | construction, assignment, resize, aliased push-back에 tracked-object 및 allocator failure injection을 추가한다. | live-object count, 잘못된 copy/destruction, block release, 원래 value 보존을 검증한다. 단순한 normal-path coverage 추가가 아니라 vector lifetime guarantee에 대한 신뢰 수준을 실질적으로 높인다. |
| `797c33904db3` | `fix(vector): fill·range 삽입의 객체 수명 보존` | S | CORE, VECTOR, HARD | vector의 fill/range insertion을 live object와 uninitialized storage를 구분하는 명시적인 reallocation/in-place algorithm으로 교체한다. | 프로젝트를 규정하는 object-lifetime 문제를 해결한다. 새 경로는 constructed tail을 추적하고 aliased input을 snapshot하며 가능한 경우 spare capacity를 유지하고 failure 시 partial construction을 정리한다. 이 변경 없이는 non-trivial element type에 대한 최종 vector의 정확성을 설명할 수 없다. |
| `8df3d8e067c0` | `test(vector): 삽입 복사·대입·할당 실패 sweep` | A | TEST, VECTOR, EXCEPTION | aliasing과 spare-capacity 동작을 포함해 fill/range insertion 전반의 copy, assignment, allocation failure를 sweep한다. | test matrix가 reallocation/in-place branch를 모두 검증하고, failure 이후 사용 가능 상태와 leak/double-destruction 부재를 확인한다. 가장 복잡한 vector modifier에 대한 가치 높은 regression evidence다. |
| `cb08194d17b0` | `fix(map): 삽입 위치를 노드 할당 전에 확정` | A | RB_TREE, EXCEPTION, DEBUG | tree search 중 insertion side를 기록해 node allocation 이후 comparator 호출이 없도록 한다. | allocation 이후 comparator exception이 발생하면 연결되지 않은 node가 owner를 잃을 수 있었다. 모든 비교를 allocation 앞으로 옮겨 transaction boundary에서 root cause를 수정하고 항상 하나의 owner만 존재하는 상태를 복구한다. |
| `55d3b3e7c104` | `fix(map): 생성과 복사 대입 실패를 임시 tree로 격리` | A | RB_TREE, EXCEPTION, ALLOCATOR | constructor rollback과 copy-and-swap 방식의 temporary-tree assignment를 map에 추가한다. | range/copy construction 실패 시 partial tree를 clear하고 assignment는 완전한 replacement가 준비될 때까지 destination을 보존한다. tree 구조 자체를 다시 정의하지는 않지만 중요한 resource/state transaction engineering이다. |
| `d72b04c5ddc6` | `test(map): 비교·할당 실패 시 노드 소유권 검증` | A | TEST, RB_TREE, EXCEPTION | insertion, constructor, copy, assignment에 comparator 및 allocator failure injection을 추가한다. | 모든 allocated node가 계속 소유되거나 해제되는지, 실패한 assignment가 target을 보존하는지 검증한다. 앞선 fix가 확립한 map transaction boundary를 직접 확인한다. |
| `15a8460ccdfe` | `fix(map): 값 없는 header로 끝 반복자 상태 안정화` | S | ARCH, ITERATOR, RB_TREE | map을 root/minimum/maximum link를 소유하고 `end()`를 나타내는 value-free header sentinel 구조로 refactor한다. | 주요 architecture correction이다. end iterator가 stale root snapshot을 보유하지 않게 되고, rotation과 swap 이후에도 element iterator를 보존할 수 있으며, 빈 map이 default key를 요구하지 않고 extrema가 container-owned state가 된다. 최종 map representation을 정의한다. |
| `81d8c4489c16` | `test(map): 회전·삭제·교환 뒤 반복자 상태 검증` | A | TEST, ITERATOR, RB_TREE | saved end iterator, rotation을 통과한 element iterator, root erasure, swap, empty reset, non-default-constructible key를 검증한다. | header sentinel 도입의 근거가 된 정확한 구조적 약속을 검증한다. 일반적인 결과 비교로는 관찰할 수 없는 architecture boundary를 보호한다. |
| `0f4dd84e44ed` | `fix(map): 비교자 교환 실패 전에 tree 소유권 유지` | A | RB_TREE, EXCEPTION, DEBUG | map swap 및 assignment commit에서 allocator/tree ownership 교환보다 comparator exchange를 먼저 수행한다. | tree pointer 이동 후 comparator assignment가 예외를 던지면 ordering policy와 physical ownership이 분리될 수 있다. 이 작은 순서 수정은 partial ownership transfer를 막고 고위험 exception invariant를 복구한다. |
| `55d4ba1fb493` | `test(map): 비교자 대입 실패 뒤 컨테이너 상태 검증` | A | TEST, RB_TREE, EXCEPTION | 서로 다른 allocator owner와 ordering 방향을 사용해 copy assignment/public swap에 comparator-assignment failure를 주입한다. | partial policy exchange를 관찰 가능하게 만들고 두 map이 contents, allocator identity, node count, usability를 모두 유지하는지 검증한다. 미묘한 commit-ordering fix를 강하게 뒷받침한다. |
| `cd67e6a31bb7` | `test(map): 무작위 연산마다 레드-블랙 불변식 검증` | A | TEST, RB_TREE, RISK | 제한된 white-box inspector와 deterministic differential/randomized 검증을 추가해 구조 변경 이후 모든 red-black invariant를 확인한다. | public sorted output만으로는 parent link, header extrema, red constraint, black height, reachable-node count를 증명할 수 없다. 이 테스트는 core tree에 대한 신뢰 수준을 실질적으로 바꾸며 재현 가능한 operation log로 failure를 진단할 수 있게 한다. |
| `cd8ebbb2c01e` | `perf(map): 높이와 비교 횟수 회귀 상한 추가` | A | PERF, RB_TREE, TEST | adversarial/shuffled insertion 순서에 대해 실행 가능한 red-black height 및 comparator-count 상한을 추가한다. | map의 logarithmic complexity 주장을 deterministic한 구조 및 operation-count limit으로 바꾼다. functional test가 놓칠 수 있는 balancing 비활성화나 숨은 linear search를 탐지할 수 있다. |
| `d938c0079994` | `test(headers): 공개 헤더를 각각 독립 compile` | B | TEST, PUBLIC_API, CXX98 | 각 public header를 최소 translation unit의 첫 include로 독립 컴파일한다. | header self-containment를 강제하고 우연한 transitive dependency를 찾아낸다. header-only API에서 중요한 실무 관행이지만 core container logic보다는 integration hygiene에 해당한다. |
| `072c49832ddc` | `test(consumer): 다중 번역 단위 공개 헤더 사용 검증` | B | TEST, PUBLIC_API, INTEGRATION | vector/map을 사용하는 linked multi-translation-unit consumer와 전체 `check` target을 추가한다. | 실제 header-only 사용 형태를 검증하고 single-file test로 잡을 수 없는 ODR/linkage failure를 탐지한다. 강한 실무 integration 작업이지만 container semantics를 변경하지는 않는다. |
| `1be03ae8daef` | `build(makefile): 격리된 sanitizer 검사 대상 추가` | B | PUBLIC_API, PRACTICAL, RISK | 전체 check suite를 위한 격리된 ASan/UBSan build를 추가한다. | 별도 instrumented output이 flag 혼합을 막고 lifetime/pointer error 탐지 범위를 넓힌다. 검증 인프라는 강화하지만 프로젝트 고유 core decision보다 표준 tooling에 가깝다. |
| `228f457988be` | `ci: compiler 행렬과 sanitizer 검사 구성` | B | CXX98, PUBLIC_API, PRACTICAL | Linux/macOS에서 GCC와 Clang으로 전체 check를 실행하고 Linux sanitizer job을 추가한다. | portability와 memory-safety 검증을 branch level에서 반복 가능하게 만든다. 유용한 release engineering이지만 자체적으로 container invariant를 확립하지는 않는다. |
| `5bdb6eb81a89` | `test(vector): 자기 범위 기대값을 명시적 snapshot으로 구성` | A | TEST, VECTOR, DEBUG | overlapping modifier를 `std::vector`에 실행하지 않고 self-range 기대값을 명시적으로 구성한다. | 기존 oracle은 regression을 구현 또는 버전별 overlapping-range 동작에 결합했다. 이 수정은 선택한 snapshot contract를 독립적으로 검증할 수 있게 하고 중요한 edge-case test에 대한 신뢰를 복구한다. |
| `1a890fbf69f9` | `docs(project): 프로젝트 문서 정리` | C | - | README를 확장하고 완성된 프로젝트의 architecture/devlog 문서를 추가한다. | 완성된 설계와 검증 범위를 기록하지만 code, test, build behavior, runtime contract를 변경하지 않는 documentation-only commit이다. |

# 개발 흐름

## 흐름: C++98 제네릭 인터페이스 기반

`ecc0668d6d9c` A — substitution 기반 overload selection과 compile-time type classification을 확립한다.
↓
`1c8692d14118` B — associative-container API에 필요한 pair value와 return type을 제공한다.
↓
`07cf5893a53c` B — 컨테이너 관계 연산을 위한 equality와 lexicographical comparison을 공통화한다.
↓
`e3462cec55a1` B — iterator type metadata와 pointer traits를 정의한다.
↓
`7a8e3d32bb4d` B — bidirectional reverse-iterator의 base convention을 추가한다.
↓
`ae50e9038643` B — vector에 필요한 random-access operation까지 reverse iteration을 확장한다.
↓
`455098520e83` B — 컨테이너가 의존하기 전에 utility 계층을 검증한다.
↓
`f36ec7e7e047` B — 엄격한 warning이 활성화된 C++98 compilation을 반복 가능한 기준선으로 만든다.

**의의**

이 branch는 현대 코드에서 사용하는 이후 표준 라이브러리 형태를 C++98이 제공하지 않는 영역부터 제네릭 용어 체계를 구성한다. 이 순서는 실제 dependency chain이다. SFINAE가 count/range overload를 분리하고, pair가 map의 value 및 return contract를 제공하며, shared algorithm이 relational operator를 지원하고, iterator metadata를 통해 하나의 reverse adaptor가 pointer-backed/tree-backed iterator 모두에 대응한다. 마지막의 엄격한 build는 이러한 전제를 강제 가능한 compatibility boundary로 바꾼다. 개별 구현 대부분은 관례적이지만, 전체로 보면 각 컨테이너가 서로 호환되지 않는 자체 대안을 따로 만들지 않게 한다.

## 흐름: Vector 소유권, Aliasing, 예외 안전 변경

`2eb9cb6c4273` S — allocator 기반 contiguous storage와 constructed-object ownership boundary를 확립한다.
↓
`9db46550b13d` A — replacement-block reallocation과 geometric capacity growth를 추가한다.
↓
`6f3cbf4794c9` A — allocator 상한에서 growth arithmetic을 수정한다.
↓
`bdc4c3123bc9` A — mutation이 input을 무효화하기 전에 self-range input을 snapshot한다.
↓
`bc3a74b9342e` A — empty-storage pointer arithmetic을 제거하고 allocator가 제공하는 size type을 사용한다.
↓
`b3124b3808d5` A — construction, assignment, resize growth, aliased push-back을 transactional하게 만든다.
↓
`9051be26db5e` A — rollback과 live-object count를 검증하기 위해 element/allocation failure를 주입한다.
↓
`797c33904db3` S — fill/range insertion을 명시적인 live-object/raw-storage 경로 중심으로 다시 구현한다.
↓
`8df3d8e067c0` A — 두 capacity branch 전반에서 insertion copy, assignment, allocation failure를 sweep한다.
↓
`5bdb6eb81a89` A — 문제가 될 수 있는 reference modifier를 명시적인 snapshot 기반 test oracle로 교체한다.

**의의**

초기 representation 자체는 유지되지만 첫 modifier 구현을 통해 vector가 단순한 indexed sequence가 아니라 주로 lifetime-management 문제라는 점이 드러난다. Capacity overflow, null-storage arithmetic, self-aliasing, 사용자 정의 타입에서 발생하는 exception은 각각 logical size가 실제 constructed object와 달라질 수 있는 서로 다른 경로를 보여준다. 이 흐름은 input capture와 replacement construction을 mutation 앞으로 옮기고, raw slot의 construction과 live slot의 assignment를 구분하며, failure-injection evidence를 단계적으로 추가한다. 마지막 test-oracle 수정은 의도적으로 확장한 self-range contract의 테스트가 다른 컨테이너도 같은 overlap behavior를 정의한다고 가정하지 않고 독립적으로 기대값을 도출해야 함을 보여준다.

## 흐름: Unbalanced Search Tree에서 검증된 Red-black Core로의 Map 발전

`2c6dd8acdd20` A — 개별 할당 node와 single-root ownership을 확립한다.
↓
`c0fdb8e3f84c` B — comparator가 정의하는 BST insertion, indexing, copying을 추가한다.
↓
`0f70c1fcc520` B — 일반 BST erasure와 tree exchange를 추가한다.
↓
`f29fd8a91523` S — rotation과 insertion recoloring을 도입한다.
↓
`8f8b67961819` B — adversarial sorted insertion과 query boundary를 검증한다.
↓
`a055cb19500b` S — deletion transplant state와 double-black correction을 추가한다.
↓
`86922f1ddfa0` B — 반복 erasure, copying, assignment, swap을 `std::map`과 stress 비교한다.
↓
`cd67e6a31bb7` A — deterministic random operation 이후 모든 구조적 red-black invariant를 검증한다.
↓
`cd8ebbb2c01e` A — red-black height와 comparator-count upper bound를 강제한다.

**의의**

public map surface는 먼저 일반 BST 형태로 존재한다. comparator semantics와 관찰 가능한 ordering을 확립하기에는 충분하지만 필요한 worst-case complexity까지 보장하지는 못한다. insertion balancing이 첫 red-black 메커니즘을 제공하고, 이어 deletion이 black node 제거와 null replacement 이후의 더 어려운 상태 복구를 추가한다. 이후 테스트는 의도적으로 output comparison을 넘어선다. white-box inspector가 parent link, header state, red constraint, black height, node reachability를 증명하고, complexity test가 오름차순·내림차순·shuffle 입력에서도 구조가 logarithmic하게 유지됨을 검증한다. 이 흐름은 기능적 ordering, 구조적 correctness, asymptotic correctness를 구분한다.

## 흐름: 구조 변경에서도 안정적인 Map Iterator

`4bbf81cecef4` B — null end state와 복사된 root pointer를 사용한 traversal을 구현한다.
↓
`50e62b0e0298` B — 해당 모델을 const/reverse iteration으로 확장한다.
↓
`048ada8fe1c5` B — mutable/const comparison interoperability를 추가한다.
↓
`15a8460ccdfe` S — root snapshot을 value-free, container-owned header sentinel로 교체한다.
↓
`81d8c4489c16` A — saved end position, element iterator, swap migration, empty reset, non-default key를 검증한다.

**의의**

초기 iterator는 static tree를 순회할 수 있지만 `--end()`가 iterator에 복사해 둔 root pointer에 의존한다. element node 자체는 유효하게 남아 있어도 rotation, root erasure, swap이 이 snapshot을 stale하게 만든다. header-sentinel refactor는 end-state와 extrema ownership을 컨테이너로 옮기고, node가 parent link를 따라 현재 end에 도달하게 하며, sentinel 표현만을 위해 key를 생성할 필요도 없앤다. 후속 테스트는 이전 모델을 무효화하는 구조 연산을 정확히 대상으로 삼아, limitation에서 architecture correction으로 이어지는 흐름을 명확히 보여준다.

## 흐름: Stateful Allocator와 Map Failure Transaction

`ae180871b160` A — node allocation으로 rebind할 때 value-allocator state를 보존한다.
↓
`cb08194d17b0` A — 연결되지 않은 node를 할당하기 전에 comparator search를 끝낸다.
↓
`55d3b3e7c104` A — partial constructor를 정리하고 copy-assignment replacement tree를 별도 공간에서 구성한다.
↓
`d72b04c5ddc6` A — comparison/allocation failure를 주입하고 모든 node를 추적한다.
↓
`0f4dd84e44ed` A — allocator와 tree ownership이 이동하기 전에 comparator state를 교환한다.
↓
`55d4ba1fb493` A — comparator-assignment failure 상황에서 copy assignment와 public swap을 검증한다.

**의의**

Map correctness는 key/value ordering만으로 결정되지 않는다. allocator identity는 각 node를 어느 state가 소유하는지를 정하고, comparator state는 같은 link 구조가 유효한 ordering을 나타내는지를 결정한다. 이 흐름은 먼저 유실된 allocator state를 복구하고, 이어 allocation이 owner를 갖기 전에 comparator가 예외를 던지는 상황을 없앤다. 다음으로 construction과 assignment를 transactional하게 만들고, 마지막에는 comparator assignment가 swap을 중단할 수 있는 더 미묘한 policy failure를 다룬다. 전체 흐름에서 일관된 원칙은 physical tree ownership을 commit하기 전에 policy state가 확정되어야 하며, 모든 failure path가 각 node를 정확히 하나의 유효한 owner와 연결된 상태로 남겨야 한다는 것이다.

## 흐름: Header-only Public Surface와 자동화된 Acceptance

`80e169e83212` B — aggregate header를 도입한다.
↓
`3c64a69dd252` C — 현재 sequential surface가 해당 bundle을 통해 컴파일되는지 확인한다.
↓
`112af1753538` B — aggregate public entry point에 map을 추가한다.
↓
`d938c0079994` B — 모든 public header를 첫 include로 두고 독립 컴파일한다.
↓
`072c49832ddc` B — 독립적인 vector/map consumer를 여러 translation unit에서 link한다.
↓
`1be03ae8daef` B — 격리된 ASan/UBSan instrumentation으로 전체 acceptance surface를 실행한다.
↓
`228f457988be` B — compiler, platform, sanitizer 검사를 CI에서 자동화한다.

**의의**

header-only library는 하나의 monolithic test에서는 올바르게 보이면서도 include order에 의존하거나 duplicate definition을 내보내거나 특정 toolchain에서만 컴파일될 수 있다. 이 흐름은 acceptance boundary를 convenience include에서 시작해, 독립적으로 self-contained한 header, 실제 linked consumer, 마지막으로 sanitizer와 cross-platform automation까지 확장한다. 이 commit들은 core container를 정의하지는 않지만 완성된 public surface를 repository 내부 test arrangement 밖에서도 재현 가능하고 사용할 수 있는 형태로 만든다.

# 주요 커밋

## feat(vector): allocator 기반 저장소 수명 관리

Commit: `2eb9cb6c4273`
Importance: S
Tags: CORE, VECTOR, ALLOCATOR

### 문제

C++98 vector 구현은 raw contiguous storage를 소유하면서 어떤 위치에 살아 있는 `T` 객체가 존재하는지 별도로 추적해야 한다. allocation만으로는 element가 생성되지 않으며, 생성되지 않은 slot을 파괴하거나 생성된 객체의 destruction을 누락해서는 안 된다.

### 결정

이 commit은 vector를 allocator state, data pointer, constructed size, allocation capacity로 표현한다. Fill construction은 block 하나를 할당한 뒤 element를 순차적으로 생성하고, 실패 경로에서는 완성된 prefix를 파괴한 뒤 block을 deallocate한다. 소멸 과정은 element의 역순 teardown과 storage release를 한곳에서 처리한다.

### 중요했던 이유

이후의 모든 vector operation인 reserve, resize, assignment, insertion, erasure, swap, exception rollback은 storage ownership과 object lifetime의 분리에 의존한다. 이후 fix는 이 core invariant를 교체하지 않고 정교화한다.

### 변경 내용

branch에 첫 `ft::vector` header, allocator-derived public type, empty/fill construction, `size`, `empty`, allocator access, node가 없는 contiguous storage state, cleanup helper가 추가되었다.

### 프로젝트 이해에 중요한 이유

완성된 vector를 설명하는 핵심은 accessor가 아니라 allocation을 누가 소유하고 어느 subrange에 살아 있는 객체가 있는지다. 이 commit이 해당 모델을 확립하므로 이후 aliasing과 exception-safety 이력을 이해하기 위한 출발점이 된다.

## fix(vector): 저장소 교체와 크기 증가를 트랜잭션으로 처리

Commit: `b3124b3808d5`
Importance: A
Tags: VECTOR, EXCEPTION, ALLOCATOR

### 문제

초기 vector interface는 replacement construction이 모두 성공하기 전에 active sequence를 clear하거나 일부 확장할 수 있었다. 따라서 element copy가 예외를 던지면 원래 assignment target을 잃거나, 부분적으로 늘어난 suffix가 남거나, reallocation으로 reference가 무효화된 뒤 aliased push-back argument를 읽을 수 있었다.

### 결정

Fill construction은 state를 공개하기 전에 complete block을 구성한다. Fill/range assignment는 temporary vector를 만들고 성공한 뒤에만 storage를 교환한다. Resize growth는 old size를 기록하고 실패하면 새로 완성된 suffix만 파괴한다. Reallocating push-back은 reserve가 reference를 무효화하기 전에 aliased argument를 복사한다.

### 중요했던 이유

이 commit은 여러 고위험 경로에 일관된 transaction pattern을 적용한다. replacement state를 준비하고, 완성된 construction을 추적하며, 새 state가 유효할 때만 commit한다. 최종 insertion solution은 아니지만 이후 insertion redesign이 따르는 failure-handling 방식을 확립한다.

### 변경 내용

`_initialize_fill`과 storage-only swap을 추가하고, fill/range assignment를 temporary replacement 방식으로 변경했으며, resize growth에 rollback을 추가하고 `push_back`에서 aliased value capture를 reallocation과 분리했다.

### 프로젝트 이해에 중요한 이유

기능적으로 완성된 vector에서 예외를 던질 수 있는 사용자 정의 타입까지 고려한 vector로 전환되는 지점을 보여준다. 프로젝트의 학습 가치는 일반적인 value test와 실제 object-lifetime guarantee의 차이에 크게 있다.

## fix(vector): fill·range 삽입의 객체 수명 보존

Commit: `797c33904db3`
Importance: S
Tags: CORE, VECTOR, HARD

### 문제

첫 insertion algorithm은 이미 살아 있는 element와 raw capacity를 일관되게 구분하지 않은 채 position을 construct/destroy하면서 value를 이동했다. Range insertion도 여러 public operation을 통해 tail을 다시 구성했다. non-trivial하거나 예외를 던지는 element type에서는 이런 방식이 lifetime bookkeeping을 깨뜨리거나 constructed object를 leak하거나 invalid state를 남길 수 있었다.

### 결정

Insertion을 input form과 capacity condition 양쪽 기준으로 나눈다. Reallocation path는 새 block에 prefix, inserted value, suffix를 생성하고 완료된 뒤에만 공개한다. In-place path는 uninitialized tail에만 construct하고 live range에는 assignment하며, 완성된 tail object 수를 추적해 construction 실패 시 해당 tail을 파괴한다. Fill value와 range input은 mutation 전에 snapshot한다.

### 중요했던 이유

이것이 결정적인 vector modifier 설계다. contiguous layout, capacity preservation, aliasing, construction과 assignment의 구분, exception cleanup을 하나의 메커니즘으로 조정한다. 이 변경 없이는 일반적인 element type에 대해 최종 vector가 올바르다고 볼 수 없다.

### 변경 내용

직접 insertion loop를 fill/range, reallocate/in-place 전용 helper, replacement-storage commit logic, constructed-tail cleanup으로 교체했다. Range insertion은 overlap을 피하기 위해 spare capacity를 버리는 방식도 더 이상 사용하지 않는다.

### 프로젝트 이해에 중요한 이유

vector를 처음부터 구현할 때 가장 어려운 부분을 보여준다. logical sequence를 이동하는 작업은 byte를 이동하거나 public modifier를 반복 호출하는 것과 같지 않다. 정확성은 모든 destination slot의 lifetime state와 old representation을 변경해도 되는 시점에 달려 있다.

## feat(map): 레드-블랙 삽입 회전과 색 보정 구현

Commit: `f29fd8a91523`
Importance: S
Tags: CORE, RB_TREE, HARD

### 문제

기본 map은 ordered BST이므로 오름차순이나 내림차순 insertion에서 높이가 선형이 될 수 있다. 올바른 sorted iteration만으로는 충분하지 않다. map의 핵심 성능 특성은 balanced search structure를 유지하는 데 의존한다.

### 결정

node에 red/black state를 추가한다. 새 non-root node는 red로 시작하고 root는 black을 유지하며, insertion repair는 red uncle을 recoloring으로 처리하고 black uncle은 적절한 single/double rotation으로 처리한다. left/right case는 대칭적으로 구현한다.

### 중요했던 이유

map을 단순히 정렬된 linked structure가 아니라 red-black tree로 만드는 메커니즘을 도입한다. 이후 deletion, invariant validation, complexity test가 보존해야 하는 logarithmic architecture를 확립한다.

### 변경 내용

node representation에 color가 추가되고 insertion이 fix-up routine을 호출하도록 바뀌었으며, map에 red check, left/right rotation, parent/uncle/grandparent 전체 recoloring logic이 추가되었다.

### 프로젝트 이해에 중요한 이유

이 commit이 없어도 map의 public behavior는 많은 일반 comparison test를 통과할 수 있지만 worst-case complexity는 잘못된 상태로 남는다. 반환값만큼 structural invariant가 중요해지는 지점을 나타낸다.

## feat(map): 레드-블랙 삭제 보정 구현

Commit: `a055cb19500b`
Importance: S
Tags: CORE, RB_TREE, HARD

### 문제

red-black tree에서 node를 삭제하면 특정 root-to-leaf 경로의 black count가 줄어들 수 있다. replacement는 null일 수 있으므로 repair가 일반 node object에 color와 parent context를 의존할 수 없다. 잘못 처리해도 sorted output은 한동안 정상으로 보이면서 black height나 이후 rotation 상태가 손상될 수 있다.

### 결정

Erasure는 실제로 이동된 node, 원래 color, replacement child, explicit replacement parent를 기록한다. black node가 제거되면 대칭적인 double-black repair가 sibling color와 near/far child color를 확인해 recoloring 또는 rotation을 수행하고, 마지막에는 replacement와 root를 black으로 강제한다.

### 중요했던 이유

Deletion은 insertion balancing과 별개의 핵심 메커니즘이며 훨씬 failure-prone하다. 이 commit은 모든 erase 형태에서 red-black invariant를 유지하고, 임의의 반복 deletion도 tree를 저하시키거나 손상하지 않도록 한다.

### 변경 내용

단순 BST successor transplant를 moved-node bookkeeping, black/null predicate, deletion fix-up, repair 이후 root normalization까지 확장했다.

### 프로젝트 이해에 중요한 이유

insertion만 balance한다고 map 구현이 완성되는 것은 아니다. 이 commit은 프로젝트가 가장 어려운 구조 변경을 어떻게 처리하는지와 이후 randomized invariant check가 왜 필요한지를 설명한다.

## fix(map): 생성과 복사 대입 실패를 임시 tree로 격리

Commit: `55d3b3e7c104`
Importance: A
Tags: RB_TREE, EXCEPTION, ALLOCATOR

### 문제

Range/copy construction은 comparison 또는 allocation이 실패했을 때 부분적으로 구축된 tree를 정리하지 않은 채 node를 점진적으로 삽입했다. Copy assignment는 rebuilding 전에 destination을 clear했으므로 failure가 원래 값을 파괴하고 partial replacement를 남길 수 있었다.

### 결정

Constructor는 failure를 catch해 도달 가능한 새 node를 모두 clear한 뒤 예외를 다시 던진다. Assignment는 destination allocator와 source comparator를 사용해 complete temporary map을 만든 뒤 construction이 성공한 경우에만 comparator와 tree state를 교환한다.

### 중요했던 이유

bulk ownership change에 대한 map의 transaction boundary를 확립한다. failure 상황에서 destination을 보존하고 partially built tree가 owner 없이 빠져나가는 일을 막는다.

### 변경 내용

constructor에 rollback guard를 추가하고, assignment를 clear-then-insert 방식에서 temporary-tree replacement로 변경했으며, tree size와 comparator state를 교환하는 helper를 도입했다.

### 프로젝트 이해에 중요한 이유

추상적인 exception safety를 구체적인 node ownership과 연결한다. red-black algorithm이 국소적으로 올바르더라도 construction 중 container가 leak하거나 state를 잃을 수 있다. 이 commit은 그 상위 lifecycle gap을 닫는다.

## fix(map): 값 없는 header로 끝 반복자 상태 안정화

Commit: `15a8460ccdfe`
Importance: S
Tags: ARCH, ITERATOR, RB_TREE

### 문제

초기 `end()`는 null과 각 iterator에 복사된 root pointer로 표현했다. rotation, root deletion, swap은 owning root를 바꿀 수 있지만 저장된 iterator는 stale topology를 계속 보유했다. full value를 가진 sentinel을 사용하면 key에 부적절한 default-construction 요구도 생긴다.

### 결정

map을 `node_base`와 value-free header sentinel 중심으로 refactor한다. `header.parent`는 root를 소유하고, `header.left`와 `header.right`는 extrema를 cache하며, `end()`는 header를 가리킨다. root parent link가 header에서 끝나므로 successor/predecessor traversal은 topology를 통해 현재 container boundary를 찾을 수 있다.

### 중요했던 이유

하나의 구조적 결정으로 iterator stability, saved end iterator에서의 current-maximum lookup, empty-state representation, swap migration, non-default key support를 해결한다. 국소적인 iterator patch가 아니라 최종 map architecture다.

### 변경 내용

value storage를 derived node type으로 옮기고, 모든 tree link를 base-node link로 바꾸며, iterator state를 node pointer 하나로 축소했다. null end result를 header result로 바꾸고 insert, erase, clear, swap, search, extrema refresh, rotation, traversal을 sentinel 중심으로 수정했다.

### 프로젝트 이해에 중요한 이유

sentinel이 element인 것처럼 가장하지 않고도 container-level topology를 소유할 수 있음을 보여준다. element iterator가 rebalancing 이후에도 살아남는 이유와 tree root가 바뀌어도 `end()`가 안정적인 이유를 이해하는 데 필수적이다.

## test(map): 무작위 연산마다 레드-블랙 불변식 검증

Commit: `cd67e6a31bb7`
Importance: A
Tags: TEST, RB_TREE, RISK

### 문제

sorted output과 `std::map`과의 parity만으로 internal tree의 유효성을 증명할 수는 없다. parent link가 불일치하거나, header extrema가 stale하거나, red node가 인접하거나, black height가 다르거나, 도달할 수 없는 node가 이후 operation에서 corruption이 드러날 때까지 iteration에서 빠져 있을 수 있다.

### 결정

범위를 좁힌 friend inspector가 header state, root linkage/color, extrema, strict subtree bound, parent/child consistency, red-child rule, equal black height, reachable-node count를 검증한다. 고정 deletion sequence, 현재 root의 반복 삭제, 3,000개의 deterministic mixed operation을 통해 매 단계마다 primary/secondary map을 모두 검증한다.

### 중요했던 이유

프로젝트의 evidence standard를 output equivalence에서 representation correctness로 바꾼다. 고정 seed, step number, operation prefix 덕분에 깊은 balancing regression도 간헐적 문제가 아니라 재현 가능한 failure가 된다.

### 변경 내용

map에 test-only inspection seam을 추가하고, build에 support header와 randomized test target을 포함했으며, 새 test가 differential public check와 모든 mutation 이후의 전체 structural validation을 결합한다.

### 프로젝트 이해에 중요한 이유

red-black 구현은 example만으로 신뢰하기에는 상태가 너무 많다. 이 commit은 프로젝트가 핵심 invariant를 어떻게 증명하는지와 이후 complexity test가 측정된 height를 신뢰할 수 있는 이유를 보여준다.
