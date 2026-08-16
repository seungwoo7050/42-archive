## feat(type-traits): CXX98 타입 선택 도구 구현
이 변경에서는 C++98에서 오버로드된 컨테이너 인터페이스를 표현하는 데 필요한 컴파일 타임 선택 도구를 도입한다. `enable_if`는 Boolean 조건이 참일 때만 중첩된 `type`을 노출하며, `integral_constant`, `true_type`, `false_type`은 템플릿 치환에 참여할 수 있는 값을 가진 타입을 제공한다.

`is_integral`은 기본 템플릿에서 false로 정의하고, 대상 언어에서 사용할 수 있는 정수 타입에 대해 signed/unsigned 변형과 `wchar_t`를 포함해 명시적으로 특수화한다. 이 구조의 직접적인 목적은 오버로드 모호성을 해소하는 것이다. 생성자와 modifier는 런타임 분기 없이 숫자 인자 두 개와 iterator 범위를 구분할 수 있다. 이러한 결정을 작은 traits 헤더에 모아 두면 각 컨테이너가 자체적인 임시 dispatch 규칙을 구현할 필요가 없고, 유효하지 않은 오버로드는 모호하거나 깊게 중첩된 컴파일 오류를 만들기보다 치환 실패를 통해 후보에서 제거된다.


## feat(pair): 값 쌍과 관계 연산 구현
이 변경에서는 `ft::pair`를 라이브러리 전반에서 사용하는 범용 두 값의 product type으로 정의한다. 기본 생성, 값 생성, 변환 복사 생성, 대입 연산과 함께 `make_pair`를 제공하므로 호출자는 템플릿 인자를 직접 명시하지 않고도 pair를 만들 수 있다. 변환 생성자는 mutable key/value 표현과 const-qualified key/value 표현처럼 서로 관련된 pair 타입 간 상호 운용에 중요하다.

비멤버 비교 연산은 구조적 동등성과 사전식 순서를 구현한다. 순서 비교에서는 `first`를 우선 기준으로 사용하고, 두 `first` 중 어느 쪽도 다른 쪽보다 작지 않을 때만 `second`를 비교한다. 따라서 `operator==`를 요구하지 않고 순서 비교 계약에만 의존한다. 이 차이는 제네릭 코드에서 중요하며, 이후 map의 값이 컨테이너 관계 연산에 참여할 수 있게 한다. 이러한 의미를 한곳에 모으면 `map`의 삽입 결과와 저장된 key/value 레코드도 컨테이너 내부에 pair와 유사한 구조를 따로 만들지 않고 하나의 일관된 표현을 사용할 수 있다.


## feat(algorithm): 공용 범위 비교 알고리즘 구현
이 변경에서는 predicate 및 comparator 오버로드를 포함한 iterator 기반 `equal`과 `lexicographical_compare` 구현을 추가한다. 두 알고리즘은 입력 범위를 순차적으로 처리하다 결과가 결정되는 즉시 중단하므로 random-access iterator를 요구하지 않으며, 포인터와 tree iterator, 사용자 정의 iterator category 모두에 사용할 수 있다.

`equal`은 첫 번째 범위를 기준으로 시퀀스 동등성을 정의하고, `lexicographical_compare`는 사전식 순서를 적용하며 비교 가능한 모든 원소가 일치한 뒤에만 prefix 관계를 처리한다. 이 함수들은 여러 컨테이너의 관계 연산이 공유하는 의미적 기반이 된다. 범위 알고리즘을 재사용하면 컨테이너 클래스는 저장소와 순회에 집중할 수 있고, 동등성과 순서는 private 표현을 직접 다루는 별도 구현이 아니라 iterator로 관찰되는 시퀀스에서 도출된다.


## feat(iterator): iterator 기본 형식과 traits 정의
이 변경에서는 라이브러리 전반에서 공통으로 사용하는 iterator 타입 체계를 도입한다. `iterator` 기본 템플릿은 category, value, distance, pointer, reference 별칭을 묶어 제공하고, `iterator_traits`는 iterator 클래스에서 같은 정보를 추출한다.

mutable 포인터와 const 포인터에 대한 명시적 특수화는 `vector`가 allocator의 raw pointer를 iterator로 사용하기 때문에 필수적이다. 포인터를 random-access iterator로 분류하고 distance type으로 `std::ptrdiff_t`를 노출함으로써 제네릭 iterator adaptor가 포인터와 클래스 기반 iterator를 동일하게 다룰 수 있다. 이 구조는 iterator의 기능을 구체적인 표현과 분리하고, reverse iterator 구현이 특정 컨테이너에 결합되지 않은 채 필요한 컴파일 타임 프로토콜을 제공한다.


## feat(iterator): 역방향 반복자의 양방향 동작 구현
이 변경에서는 `reverse_iterator`의 bidirectional 동작 핵심을 구현한다. adaptor는 역방향 view에서 참조하는 원소보다 한 위치 뒤를 가리키는 base iterator를 저장한다. 따라서 역참조 시 base를 복사하고 그 복사본을 하나 감소시킨 뒤 이전 원소에 접근하며, 저장된 base 자체는 변경하지 않는다.

증가와 감소 연산은 기반 iterator의 이동 방향을 반대로 적용해 `base()`가 항상 역방향 iterator가 가리키는 원소 다음의 정방향 위치를 나타낸다는 불변식을 유지한다. 변환 생성자와 서로 다른 타입 간 equality 연산자를 통해 호환되는 mutable/const iterator 타입을 함께 사용할 수 있다. 직접 참조하는 원소를 저장하는 방식보다 이 표현이 적합한 이유는 `rbegin()`을 자연스럽게 `end()`에서 만들 수 있고, before-begin sentinel 없이 `begin()`으로 `rend()`를 표현할 수 있기 때문이다.


## feat(iterator): 역방향 반복자의 임의 접근 연산 완성
이 변경에서는 base iterator가 random access일 때 사용할 수 있는 연산을 `reverse_iterator`에 추가한다. 덧셈, 뺄셈, 복합 이동, 인덱싱, 거리 계산, 순서 비교는 모두 대응되는 base iterator 연산의 방향을 반대로 적용한다.

부호 반전은 단순한 표기상의 문제가 아니다. 역방향 iterator를 양의 offset만큼 전진시키려면 base에서는 그만큼 빼야 하며, 두 reverse iterator 사이의 거리는 피연산자 순서를 반대로 하여 계산해야 한다. 관계 연산도 마찬가지로 뒤집힌다. base에서 더 뒤쪽 위치가 역방향 순회에서는 더 앞선 원소를 의미하기 때문이다. 이러한 대수 관계를 완성하면 같은 adaptor를 bidirectional tree iterator와 포인터 기반 `vector` iterator 모두에 사용할 수 있고, 각 기반 iterator category가 기대하는 복잡도도 유지할 수 있다.


## test(utils): 공용 타입·값·범위·반복자 도구 검증
이 변경에서는 컨테이너가 유틸리티 계층에 의존하기 전에 실행 가능한 기본 검증 지점을 추가한다. pair 생성, 정수 타입 판별, prefix 동등성, 사전식 비교, raw array의 역방향 순회, 포인터 기반 `iterator_traits`를 확인한다.

테스트는 의도적으로 여러 기능을 함께 다룬다. 개별 반환값뿐 아니라 traits, 알고리즘, pair 타입, iterator adaptor가 C++98 컴파일 설정에서 함께 조합되는지도 검증한다. 이 작은 기준점을 먼저 마련하면 이후 컨테이너 비교나 역방향 순회에서 실패가 발생했을 때, 해당 기능이 의존하는 공용 primitive의 결함과 컨테이너 자체 결함을 분리할 수 있어 진단의 모호성이 줄어든다.


## build(makefile): CXX98 검사 빌드 구성
이 변경에서는 header-only 라이브러리를 위한 재현 가능한 빌드 및 테스트 진입점을 만든다. 소스는 C++98 언어 모드와 엄격한 경고 플래그로 컴파일하고, public header를 의존성에 포함하며, 생성되는 바이너리는 버전 관리에서 제외한 build 디렉터리에 격리한다.

`test` target은 구성된 모든 실행 파일을 실행하고 처음으로 0이 아닌 결과가 나오면 중단하며, 정리 target은 생성된 산출물만 삭제한다. 템플릿 라이브러리는 많은 오류가 실제 인스턴스화 시점에만 드러나므로 소비자 코드를 컴파일하는 것 자체가 중요한 검증 과정이다. 따라서 언어 버전과 경고 정책을 빌드에 명시하면 호환성이 각 호출자의 로컬 명령행 관례에 의존하는 조건이 아니라 강제되는 속성이 된다.


## feat(vector): allocator 기반 저장소 수명 관리
이 변경에서는 `ft::vector`의 기본 소유권 모델을 확립한다. 컨테이너는 allocator, 할당된 저장소를 가리키는 포인터, 살아 있는 원소 수, 할당된 capacity를 저장한다. 메모리 할당과 객체 생성은 별개의 연산으로 취급한다. 먼저 raw storage를 확보한 뒤 각 원소를 allocator를 통해 개별적으로 생성한다.

생성 과정에서는 성공적으로 생성된 prefix만 기록한다. 원소 생성자가 예외를 던지면 해당 prefix를 역순으로 파괴하고 할당을 해제한 뒤 예외를 전파한다. 소멸 역시 같은 소유권 경계를 따라 정확히 `_size`개의 살아 있는 객체를 파괴한 다음 블록을 해제한다. 핵심 불변식은 `_size`가 단순히 예약된 slot 수가 아니라 실제로 생성된 객체 수를 나타낸다는 것이다. 이후 접근과 변경 연산은 `_size` 미만의 모든 인덱스에 유효한 객체 수명이 존재하고, 그 이상 위치는 초기화되지 않은 저장소라는 전제에 의존할 수 있다.


## feat(vector): 반복자와 원소 접근 경계 구현
이 변경에서는 `vector`의 초기 조회 인터페이스를 노출한다. 정방향 및 역방향 순회, 크기와 비어 있음 조회, 검사하지 않는 인덱싱, 범위를 검사하는 접근, front/back 접근을 제공한다. raw allocator pointer를 iterator로 사용해 연속 저장소 표현과 일치시키고, 별도의 wrapper 없이 상수 시간 random access를 제공한다.

`at`은 `std::out_of_range`를 던지는 명시적인 범위 검사 경로를 제공하고, `operator[]`는 일반적인 비검사 계약을 유지한다. 역방향 순회는 공용 adaptor와 정방향 `begin`/`end` 경계에서 파생되므로 별도의 역방향 순회 상태를 저장하지 않는다. API의 책임도 명확하다. 컨테이너는 저장소를 소유하며 계약상 검증을 약속한 연산만 검증하고, iterator 산술과 비검사 접근은 연속 컨테이너에 기대되는 성능 및 사전조건 모델을 유지한다.


## feat(vector): 용량 확장과 원소 재배치 구현
이 변경에서는 capacity 조회, allocator에서 파생한 최대 크기, 명시적 reserve, 기하급수적 성장, 저장소 재할당을 도입한다. `reserve`는 `max_size`를 초과하는 요청을 거부하고, 현재 capacity가 충분하면 아무 작업도 하지 않으며, 그 외에는 하나의 재배치 루틴에 처리를 위임한다.

재배치는 준비 후 commit하는 구조를 따른다. 새 블록을 할당하고 기존 원소를 그곳에 복사 생성한다. 복사 중 하나라도 실패하면 새 블록에서 생성이 끝난 prefix만 파괴하고, 기존 vector는 변경되지 않은 저장소의 소유권을 그대로 유지한다. 새 시퀀스가 완성된 뒤에만 기존 원소와 할당을 해제한다. 재할당은 기존 블록을 가리키는 모든 포인터를 무효화하므로 대체 저장소가 준비되기 전에 그 무효화를 확정해서는 안 된다. 이는 연속 컨테이너의 핵심 예외 안전 패턴이다.

초기 doubling 계산은 amortized growth를 제공하지만 unsigned capacity 영역에서 직접 연산한다. allocator 상한에서의 산술은 이후 변경에서 강화한다.


## feat(vector): 크기 변경과 값 범위 할당 구현
이 변경에서는 기존 저장소 primitive를 바탕으로 주요 생성 및 교체 경로를 추가한다. fill/range 생성, 복사, 복사 대입, resize, fill 대입, range 대입, push/pop, clear를 구현한다. SFINAE로 range 오버로드에서 정수 타입을 제외해 `(count, value)` 같은 호출이 iterator 기반 템플릿과 경쟁하지 않도록 한다.

크기를 줄일 때는 뒤에서부터 원소를 파괴하고, 늘릴 때는 필요하면 capacity를 확보한 뒤 새로운 suffix를 생성한다. range 입력은 미리 거리를 계산한다고 가정하지 않고 input iterator를 한 번에 하나씩 전진시키며 값을 append하므로 single-pass 입력도 처리할 수 있다. 이러한 연산은 capacity와 객체 수명이 독립적이라는 기능적 계약을 확립한다. `clear`와 축소는 저장소를 반드시 해제하지 않고도 원소를 파괴할 수 있으며, assignment는 기존 할당을 재사용하거나 교체할 수 있다.

이 단계에서는 여러 연산이 살아 있는 상태를 점진적으로 변경한다. 인터페이스 자체는 사용할 수 있을 만큼 완성되었지만, 원소 생성 중 예외가 발생했을 때의 aliasing과 rollback은 이후 hardening에서 별도로 다룬다.


## feat(vector): 중간 변경 연산과 관계 비교 완성
이 변경에서는 위치 기반 insertion, erasure, swap, 관계 연산자를 추가해 초기 `vector` 인터페이스를 완성한다. 재할당이 발생할 수 있기 전에 위치를 index로 변환해 새 블록에서도 삽입 지점을 복원할 수 있게 한다. 기존 원소를 이동해 gap을 열거나 닫고, 비멤버 비교 연산은 공용 equality 및 lexicographical 알고리즘에 위임한다.

Swap은 allocator와 저장소 상태를 함께 교환해 할당된 블록이 이후 해당 원소를 파괴하고 해제할 allocator 상태와 계속 연결되도록 한다. Erasure는 살아남은 suffix를 대입으로 앞쪽에 압축하고 불필요해진 tail을 파괴해 연속 배치와 선형 복잡도를 유지한다.

첫 insertion 알고리즘은 현재 시퀀스에 대해 직접 construct/destroy 방식으로 변경한다. 순서와 API 동작은 구현하지만, 초기화되지 않은 slot에 대한 생성과 이미 살아 있는 객체에 대한 대입을 완전한 실패 추적과 함께 구분하지는 않는다. 이후 자기 참조 입력과 예외를 던질 수 있는 원소 타입이 이 한계를 드러내며, 더 명시적인 insertion 경로가 필요해진다.


## test(vector): 핵심 공개 동작을 표준 결과와 비교
이 변경에서는 지금까지 구현한 일반적인 공개 동작을 `std::vector`와 비교하는 differential test를 도입한다. 반복적인 append, insertion, erasure, resize, reserve 이후 크기, 비어 있음, 모든 원소를 비교하고 range 생성과 관계 연산 결과도 검증한다.

또한 reserve된 vector가 계속 원소를 받을 수 있는지, `at(size())`가 표준 컨테이너와 동일하게 범위 초과 상황을 보고하는지 확인한다. 관찰 가능한 시퀀스 의미에 대해서는 표준 구현을 동작 oracle로 사용하는 것이 적절하며, capacity는 특정 성장 배율을 가정하지 않고 실제 사용 가능한 보장을 기준으로 검사한다. 이 suite는 정상 경로의 동등성을 확립하지만 allocator 상한, aliasing, 사용자 정의 원소 연산에서 발생하는 예외는 아직 다루지 않는다.


## feat(stack): vector 기반 stack 어댑터 구현
이 변경에서는 `stack`을 별도의 저장소 소유자가 아니라 container adaptor로 구현한다. 기본적으로 `vector`를 사용하는 protected underlying container가 할당, 원소 수명, 크기, 순서를 계속 담당하고, adaptor는 `top`, `push`, `pop`으로 구성된 LIFO 인터페이스만 노출한다.

관계 연산은 underlying container에 전달하고, 나머지 관계는 equality와 ordering에서 도출한다. 이 설계는 추상화를 의도적으로 얇게 유지한다. `stack`은 시퀀스 로직을 복제하거나 독립적인 불변식을 추가하지 않고 외부에서 보이는 접근 패턴만 제한한다. 또한 template parameter로 호환되는 다른 컨테이너 타입을 전달할 수 있으며, 해당 컨테이너는 adaptor가 사용하는 작은 인터페이스만 지원하면 된다.


## test(stack): 기본 동작과 관계 연산 검증
이 변경에서는 동등한 vector 기반 저장소를 사용해 adaptor의 관찰 가능한 동작을 `std::stack`과 비교한다. top의 값, push/pop에 따른 크기 변화, empty 상태로의 전환, equality 및 ordering 결과를 검증한다.

adaptor의 정확성은 새로운 자료구조보다 delegation 세부 사항에 달려 있으므로 이 테스트가 유효하다. 표준 결과와 일치하는지 확인함으로써 외부에 노출되는 LIFO 해석이 underlying sequence의 back과 대응하고, 비멤버 관계 연산이 감싼 컨테이너의 ordering semantics를 그대로 보존하는지 검증한다.

## feat(headers): 공용 도구와 순차 컨테이너 통합 헤더 추가
이 변경에서는 유틸리티 계층과 현재 제공되는 순차 컨테이너를 한곳에서 포함할 수 있도록 `ft_containers.hpp`를 단일 public aggregation point로 도입한다. 소비자는 traits, iterators, algorithms, pairs, `vector`, `stack`의 내부 include graph에 의존하지 않고 하나의 안정적인 헤더만 포함할 수 있다.

통합 헤더는 새로운 런타임 동작을 만들지 않고 패키징 경계를 정의한다. header-only 라이브러리에서는 transitive dependency 선택이 그렇지 않으면 모든 소비자에게 노출되므로 이 경계가 중요하다. 개별 component header를 그대로 제공해 세밀한 include 방식을 유지하면서, aggregate header는 이후 다른 컨테이너가 완성될 때 확장할 수 있는 명시적인 편의 인터페이스를 제공한다.


## test(headers): 통합 헤더의 순차 컨테이너 표면 검증
이 변경에서는 기존 consumer-style 테스트가 aggregate header만 포함하도록 전환한다. 따라서 동일한 유틸리티, `vector`, `stack` 연산이 개별 구현 헤더를 직접 알지 못해도 public bundle을 통해 컴파일되어야 한다.

주된 목적은 integration 검증이다. aggregate include 목록의 누락과 테스트가 private include ordering에 우연히 의존하는 문제를 찾아낸다. 런타임 assertion은 그대로 유지하므로 실패가 발생하면 새로 추가된 동작 기대값이 아니라 public-header 구성 문제로 원인을 좁힐 수 있다.


## feat(map): 노드 소유권과 빈 tree 상태 구현
이 변경에서는 `ft::map`의 초기 저장소 및 소유권 모델을 확립한다. 각 key/value pair는 parent, left, right 링크를 가진 개별 할당 tree node에 저장한다. rebound allocator가 node 객체를 생성하고 파괴하며, null root와 size 0이 빈 tree를 나타낸다.

node 생성은 할당과 생성을 별도 단계로 처리하고, 저장 pair 생성 중 예외가 발생하면 할당을 해제한다. 재귀적 clear는 도달 가능한 모든 node를 파괴하므로 map은 하나의 ownership root와 명확한 소멸 경로를 갖는다. associative container에서 node를 개별 할당하는 방식은 insertion이나 balancing 시 기존 값을 이동하지 않고 포인터만 다시 연결할 수 있어 적합하며, 이는 원소 iterator 안정성에 필요하다.

이 단계에는 rebound allocator 타입이 존재하지만 value allocator 상태에서 이를 구성하는 방식은 이후에 보정한다. tree도 아직 balanced 상태가 아니다. 이 commit은 의도적으로 ordered operation과 balancing을 쌓을 수 있는 ownership 기반만 제공한다.


## feat(map): 가변 반복자와 tree 순회 구현
이 변경에서는 binary-search-tree 표현 위에 mutable bidirectional 순회를 추가한다. successor는 오른쪽 subtree가 있으면 그 최솟값으로 내려가고, 그렇지 않으면 오른쪽 branch를 벗어날 때까지 parent link를 따라 올라간다. predecessor는 이를 대칭적으로 수행한다. `begin()`은 최소 node를 선택하고, 현재 node가 null이면 `end()`를 나타낸다.

null end node에는 구조적 context가 없으므로 각 iterator는 `--end()`에서 최대 원소를 찾을 수 있도록 root도 함께 저장한다. 이 방식으로 초기 인터페이스는 동작하지만 iterator 상태가 개별 원소 node뿐 아니라 컨테이너 topology의 snapshot에도 결합된다. 이후 rotation, root 교체, swap을 통해 구조적 end sentinel이 더 강한 모델인 이유가 드러난다. 순회 알고리즘 자체는 이미 parent link에 의존하므로 원소 iterator는 별도의 tree search 없이 이동할 수 있고, tree 높이에 비례하는 bidirectional 복잡도를 유지한다.


## feat(map): 상수와 역방향 반복자 구현
이 변경에서는 const-qualified tree iterator, mutable iterator에서 const iterator로의 변환, reverse traversal alias와 accessor를 추가한다. const iterator는 successor/predecessor 동작을 그대로 따르면서 `const value_type&`와 `const value_type*`만 노출해 iteration을 통해 key를 수정할 수 없다는 map 계약을 보존한다.

역방향 순회는 공용 `reverse_iterator`로 구성하므로 `rbegin()`은 `end()`에서, `rend()`는 `begin()`에서 시작한다. 별도의 iterator class에 tree navigation을 중복 구현하지 않고 base-iterator 불변식을 재사용한다. mutable에서 const로만 허용하는 단방향 변환은 일반적인 대체 가능성 규칙을 따른다. read-only 코드는 mutable 위치를 받을 수 있지만 const 위치를 write access로 승격할 수는 없다.


## feat(map): 삽입과 첨자 및 복사 동작 구현
이 변경에서는 초기 tree에 값을 생성하는 주요 연산을 추가한다. insertion은 key comparator에 따라 tree를 내려가며, 어느 key도 다른 key보다 작다고 비교되지 않으면 기존 node를 반환하고, 그렇지 않으면 새 leaf를 할당해 연결한다. 따라서 key uniqueness는 `operator==`가 아니라 comparator equivalence로 정의된다.

`operator[]`는 default-constructed mapped value와 함께 insertion을 재사용해 access와 creation이 하나의 lookup 경로를 사용하도록 한다. range 및 copy construction은 보이는 원소를 새 tree에 삽입하고, assignment는 source sequence에서 destination을 다시 구성한다. hint insertion도 표준 인터페이스 형태로 받지만 아직 hint 전용 최적화는 추가하지 않고 일반 insertion에 위임해 정확성을 유지한다.

이 commit은 unbalanced search tree 위에서 기본 semantics를 확립한다. assignment는 destination을 clear한 뒤 다시 구축하고, insertion은 allocation 이후 parent 쪽을 결정하기 위해 comparator를 한 번 더 호출한다. 이후 exception-safety 작업에서 이러한 연산을 더 강한 transaction boundary 뒤로 옮긴다.


## feat(map): 검색과 경계 query 구현
이 변경에서는 mutable/const 형태의 comparator 기반 `find`, `count`, `lower_bound`, `upper_bound`, `equal_range`를 추가한다. 검색도 insertion과 동일한 equivalence 규칙을 따르므로 equality를 정의하지 않은 key 타입에서도 lookup 의미가 일관된다.

bound 연산은 tree를 내려가는 동안 현재까지의 최적 candidate를 유지한다. `lower_bound`는 key가 query보다 작지 않은 첫 node를 기록하고, `upper_bound`는 query가 해당 key보다 엄격히 작은 첫 node를 기록한다. 이를 통해 전체 in-order traversal 없이 tree 높이에 비례하는 연산을 수행할 수 있다. `equal_range`는 두 경계를 조합하며, 존재하지 않는 key와 tree 끝 위치에서도 올바른 범위를 제공한다.


## feat(map): 삭제와 clear 및 swap 구현
이 변경에서는 주요 제거 경로와 컨테이너 전체 상태 교환을 모두 추가한다. 자식이 없거나 하나인 node 삭제는 subtree transplantation을 사용한다. 자식이 둘인 node는 key component가 의도적으로 immutable인 `pair<const Key, T>`에 새 key를 대입하지 않고, in-order successor node 자체를 제거 대상 node 위치로 물리적으로 이식한다.

range erasure는 현재 node를 파괴하기 전에 successor로 먼저 이동해 순회 중 지워진 상태를 역참조하지 않도록 한다. `clear`는 소유한 tree 전체를 파괴하고 빈 표현으로 되돌린다. Swap은 allocator, node allocator, root, size, comparator를 함께 교환해 node를 지배하는 ownership metadata가 node와 함께 이동하도록 한다.

이 시점의 구현은 binary-search ordering과 node lifetime은 유지하지만 삭제 후 balancing까지 복구하지는 않는다. red-black deletion correction은 balancing 표현이 존재한 이후에 도입한다.


## feat(map): 관계 연산과 통합 공개 헤더 완성
이 변경에서는 첫 번째 public `map` 인터페이스를 완성한다. `value_compare`는 저장된 key comparator를 감싸 pair의 key에 적용하므로 key policy와 전체 stored value 사이의 구분을 유지한다. equality와 lexicographic relation은 map의 정렬된 iterator sequence를 기준으로 동작해 tree shape이 아니라 논리적 contents를 비교한다.

비멤버 `swap`은 member 연산에 위임하고, aggregate header는 이제 순차 컨테이너와 공용 유틸리티에 더해 `map`도 export한다. 결과적인 public boundary는 내부적으로 일관된다. tree topology는 private으로 유지되고, ordering policy는 comparator accessor를 통해 관찰할 수 있으며, 컨테이너 전체 비교는 모두 같은 generic range algorithm을 재사용한다.


## test(map): 삽입·검색·삭제 결과를 표준 map과 비교
이 변경에서는 초기 associative-container 인터페이스를 differential 방식으로 검증한다. unique key와 duplicate key가 섞인 시퀀스를 `ft::map`과 `std::map`에 삽입하고 insertion flag, size, in-order key, mapped value를 비교한다.

또한 `operator[]`, lookup, count, lower/upper bound, equal range, key 및 iterator 기반 erasure, range construction, equality를 검사한다. iteration을 통한 비교는 search-tree ordering과 iterator traversal을 동시에 검증한다는 점에서 중요하다. 이 테스트는 대표적인 tree에 대해 기능적 동등성을 확립하고, adversarial shape과 red-black 구조 불변식은 이후 stress 및 white-box 테스트에서 다룬다.


## fix(vector): 용량 계산을 allocator 상한에서 포화
이 변경에서는 unsigned overflow가 발생하기 전에 capacity 산술이 allocator의 유한한 범위를 따르도록 수정한다. `resize`와 fill assignment는 `max_size`를 넘는 count를 거부하고, insertion은 추가하려는 개수가 `max_size() - size()` 안에 들어오는지 확인하며, growth helper는 candidate를 계산하기 전에 불가능한 minimum을 거부한다.

Doubling은 먼저 곱한 뒤 이미 wrap된 결과를 탐지하지 않고, `capacity + capacity`가 allocator 상한을 넘는 경우 그 상한에서 포화시킨다. 포화된 값도 필요한 minimum보다 작다면 minimum이 먼저 유효성 검사를 통과한 경우에만 선택한다. 핵심 불변식은 allocator에 전달되는 모든 capacity가 표현 가능하고 해당 allocator가 허용하며 요청한 live size를 수용할 만큼 충분해야 한다는 것이다. 유효하지 않은 요청은 vector를 변경하기 전에 `length_error`로 실패한다.


## test(vector): 제한 allocator에서 용량 상한 검증
이 변경에서는 거대한 할당을 시도하지 않고도 경계 동작을 검증할 수 있도록 의도적으로 작은 allocator 상한을 도입한다. allocator는 최대 다섯 원소를 보고하고 현재 남아 있는 allocation block 수를 추적한다.

capacity 3으로 reserve한 vector를 4개 원소까지 늘려 geometric growth가 overflow하거나 유효한 증가를 거부하지 않고 5에서 포화되도록 한다. 이어서 상한을 초과하는 reserve는 `length_error`를 던져야 하며, scope를 벗어나면 추적 중인 allocation 수가 0으로 돌아와야 한다. 따라서 이 테스트는 실제로 재현 가능한 allocator 경계에서 산술 정책과 ownership cleanup을 함께 검증한다. 기본 allocator의 매우 큰 상한으로는 같은 상황을 실용적으로 재현하기 어렵다.


## fix(vector): 자기 범위 assign과 insert 입력 보존
이 변경에서는 range modifier의 input iterator가 변경 대상 vector 자체를 가리키는 경우를 보호한다. Range assignment는 source range 전체를 먼저 temporary vector에 복사한 뒤 storage를 교환하므로 destination을 clear하더라도 아직 읽지 않은 source value가 무효화되지 않는다.

Range insertion도 input과 insertion point 뒤의 suffix를 먼저 snapshot한 다음 영향을 받는 시퀀스를 erase하고 다시 구성한다. 핵심 결정은 iterator를 무효화할 수 있는 연산을 수행하기 전에 aliased input을 독립적으로 소유되는 storage로 소비하는 것이다. 추가 할당과 복사를 감수하는 대신 deterministic한 overlap 동작을 얻고, snapshot을 점진적으로 구성하므로 generic input range에도 사용할 수 있다.

재구성은 여전히 destination을 점진적으로 변경하며, 이후 더 강한 lifetime 및 exception guarantee를 위해 다시 정교화한다. 이 commit은 자기 참조 상황에서 source 보존과 올바른 시퀀스 순서를 확립하는 데 초점을 둔다.


## test(vector): 자기 범위 변경 결과 검증
이 변경에서는 vector가 자기 iterator range에서 insert와 assign을 수행하는 regression case를 추가한다. 예상 시퀀스는 대응되는 표준 컨테이너 변경을 실행하기 전에 독립적인 snapshot에서 구성해, oracle의 source iterator가 연산 중 무효화되지 않도록 한다.

insertion case는 destination 위치와 source prefix가 겹치고, assignment case는 vector를 내부 subrange로 교체한다. 각 결과 원소를 독립적으로 준비한 reference와 비교해 라이브러리가 선택한 alias-safe 동작을 고정하고, 이후 구현이 source range의 원소를 이미 이동하거나 지우거나 재할당한 뒤에 소비하는 문제를 막는다.


## test(vector): 역방향 순회 결과 검증
이 변경에서는 `vector`의 reverse accessor와 generic reverse iterator를 조합했을 때 `std::vector`와 같은 시퀀스를 만드는지 검증한다. 두 컨테이너를 `rbegin()`부터 `rend()`까지 순회하며 역참조한 모든 값을 비교한다.

이 case는 여러 변경 연산을 거친 vector의 raw pointer iterator 위에서 random-access adaptor를 직접 검증한다. 테스트 내부에 구현 세부 사항을 중복하지 않으면서 방향 반전과 경계 구성을 보호한다.


## feat(map): 가변·상수 반복자 상호 비교 지원
이 변경에서는 mutable map 위치와 const map 위치를 피연산자 어느 쪽에 두어도 비교할 수 있게 한다. const iterator는 mutable iterator와의 equality/inequality를 직접 지원하고, friend overload는 mutable 위치를 const 표현으로 변환해 반대 순서의 비교를 제공한다.

Iterator identity는 외부에 노출되는 reference type이 아니라 현재 node로 정의된다. 대칭적인 mixed comparison을 지원하면 generic code에서 mutable search result와 const boundary를 수동 변환 없이 비교할 수 있다. 또한 연산은 identity만 관찰하고 const iterator를 통해 mutable access를 제공하지 않으므로 const correctness도 유지한다.

## test(map): 가변·상수 반복자 비교 검증
이 변경에서는 서로 다른 iterator 타입 간 비교를 대상으로 한 compile-time 및 runtime regression test를 추가한다. mutable iterator를 const iterator로 변환한 뒤 가능한 두 피연산자 순서 모두에서 equality와 inequality를 검사한다.

이 case를 넓은 map 동작 테스트와 분리하는 이유는 overload의 대칭성이 주로 type-system 계약이기 때문이다. 특정 overload가 빠져 있어도 같은 타입끼리의 일반 순회는 정상 동작할 수 있고, const 경로와 mutable 경로가 만나는 generic code에서만 문제가 드러날 수 있다.


## test(map): 역방향 순회와 경계 query 검증
이 변경에서는 정확한 key 검색만으로는 다루지 못한 저장 값 사이의 gap과 상단 경계까지 associative-container 동등성 검사를 확장한다. 저장된 값 사이에 존재하지 않는 key에 대한 `lower_bound`와 최댓값 부근의 `upper_bound`를 비교하고, 올바른 successor 또는 end 위치가 선택되는지도 확인한다.

또한 전체 map을 역방향으로 순회하면서 key와 mapped value를 모두 `std::map`과 비교한다. 이 하나의 관찰 가능한 시퀀스가 predecessor navigation, `--end()`, reverse-iterator base semantics, 정렬된 tree 순서를 함께 검증하므로 정방향 순회만으로 놓칠 수 있는 오류를 드러낼 수 있다.


## test(map): 상수 begin과 reverse begin 검증
이 변경에서는 map을 const reference로 바인딩하고 `begin()`과 `rbegin()`을 표준 컨테이너와 비교해 const-qualified 진입점을 검증한다.

assertion 수는 적지만 서로 다른 두 속성을 확인한다. overload resolution은 const iterator 타입을 선택해야 하며, const API를 통해 반환되는 극값은 mutable tree의 현재 minimum과 maximum과 일치해야 한다. 이를 통해 mutable traversal 구현이 올바르더라도 const boundary 연결이 잘못된 문제를 가리는 일을 방지한다.


## fix(map): 값 allocator 상태로 노드 allocator 구성
이 변경에서는 관련 없는 allocator instance를 기본 생성하지 않고, 호출자가 전달한 value allocator에서 rebound node allocator를 구성한다. 같은 규칙을 default/range construction과 copy에도 적용한다.

Allocator rebinding은 할당 대상 타입만 바꾸며 allocator의 ownership identity까지 바꾸는 것이 아니다. Stateful allocator는 arena, pool, accounting object, allocation policy 등을 보유할 수 있으므로 node도 동일한 상태에서 파생된 rebound allocator를 통해 해제해야 한다. rebind 과정에서 상태를 보존하면 `get_allocator()`가 나타내는 allocator와 실제 node ownership이 단순히 호환 가능한 allocator 타입을 사용하는 수준을 넘어 하나의 일관된 resource domain을 가리키게 된다.


## feat(map): 레드-블랙 삽입 회전과 색 보정 구현
이 변경에서는 insertion 시 map을 일반 binary-search tree에서 red-black tree로 확장한다. 새 node는 red로 시작하고 최초 root는 black이며, left/right rotation은 parent와 child pointer를 다시 연결하면서 최상위에서 rotation이 일어나면 root도 갱신한다.

Insertion fix-up은 red parent에서 발생하는 대칭적인 경우를 처리한다. uncle이 red이면 recoloring한 뒤 위쪽으로 violation을 이동시키고, uncle이 black이면 필요할 경우 inner rotation을 수행한 다음 outer rotation과 recoloring을 적용한다. 보정이 끝난 뒤 root를 black으로 강제해 red-black color 제약을 확립하고, 정렬된 입력이 선형 chain을 만들지 않도록 tree 높이를 로그 수준으로 제한한다.

rotation은 저장된 값을 이동하지 않고 link만 변경하므로 node 주소와 기존 원소 iterator는 그대로 유효하다. 다만 이전 iterator 표현은 end 순회를 위해 여전히 root snapshot을 보유하므로, root가 바뀌는 rotation은 별도의 iterator-state 문제를 드러낸다. 이 문제는 이후 header-sentinel 설계에서 수정한다.


## test(map): 정렬 입력 삽입과 검색 경계 stress 검증
이 변경에서는 unbalanced search tree에 가장 불리한 순서를 사용해 balanced insertion 로직에 stress를 가한다. 96개의 key를 각각 오름차순과 내림차순으로 별도 map에 삽입한다.

각 scenario 이후 in-order contents와 insertion result를 `std::map`과 비교하고, 존재하는 query와 존재하지 않는 query를 섞어 `find`, 두 bound, `equal_range`의 두 결과를 검사하며 end 상태도 일치하는지 확인한다. 이 테스트는 tree 높이를 직접 증명하는 대신 동작을 검증하지만, adversarial input으로 반복적인 rotation과 recoloring을 강제하면서 그런 구조 변경이 ordered-map semantics를 바꾸지 않는지 확인한다.


## feat(map): 레드-블랙 삭제 보정 구현
이 변경에서는 erasure에 대한 red-black 유지 로직을 완성한다. 삭제 과정은 원래 위치에서 실제로 이동된 node, 그 node를 대체하는 child, child가 null인 경우에도 사용할 parent, 제거된 color를 추적한다. null leaf를 black으로 취급하면 별도의 sentinel leaf node를 할당하지 않고도 extra-black deficit을 모델링할 수 있다.

black node가 제거되면 fix-up은 대칭적인 sibling case를 적용한다. sibling이 red이면 rotation을 통해 black sibling 구조로 바꾸고, sibling이 black이며 두 child도 black이면 deficit을 parent 쪽으로 전달한다. near/far child가 red인 경우에는 rotation과 recoloring으로 deficit을 해소한다. 자식이 둘인 node를 삭제할 때는 successor node를 이식하고 target의 color를 복사하되 successor의 immutable key/value object 자체는 그대로 보존한다.

그 결과 단순한 정렬 순서보다 강한 불변식을 유지한다. root는 black이고, red node는 red child를 갖지 않으며, 각 node에서 null leaf까지의 모든 경로는 같은 black height를 갖는다. null replacement의 parent를 명시적으로 유지하는 것이 핵심 구현 세부 사항이며, 지워진 node가 더 이상 존재하지 않아도 보정 과정을 계속할 수 있게 한다.


## test(map): 반복 삭제·복사·대입·교환 stress 검증
이 변경에서는 balancing과 컨테이너 전체 lifecycle 연산을 함께 다루도록 map stress coverage를 확장한다. 큰 오름차순/내림차순 map을 복사, 대입, swap하고 ownership이 바뀐 뒤 양쪽을 대응되는 표준 컨테이너와 비교한다.

이후 혼합 insertion sequence를 반복적인 key erasure로 줄이고, map이 비워질 때까지 minimum과 maximum iterator erasure를 번갈아 수행한다. 각 단계마다 contents와 boundary query를 검사한다. 이 과정은 extrema와 root가 바뀌는 경우를 포함해 다양한 deletion-fix-up 형태를 실행하며, balanced tree를 copy/swap해도 내부 shape과 무관하게 logical contents가 보존되는지도 확인한다.


## test(map): 범위 삭제 후 상태 검증
이 변경에서는 `[begin(), end())` 전체를 삭제한 뒤 emptiness와 size를 `std::map`과 비교해 full-range erasure 경계를 검증한다.

이 case는 range erasure 내부의 iterator 전진 규칙을 보호한다. 현재 node를 파괴하기 전에 각 successor를 먼저 얻어야 하고, 저장된 end 조건은 끝까지 도달 가능해야 하며, 마지막 제거 뒤에는 stale root나 0이 아닌 size가 남지 않고 canonical empty-tree 상태로 복원되어야 한다.


## test(map): 비교 함수 접근자 검증
이 변경에서는 `key_comp()`와 `value_comp()`가 `std::map`과 일치하는 ordering 동작을 노출하는지 확인한다. value comparator는 실제 저장 pair에 적용되며 mapped value가 아니라 key 비교로 환원되어야 한다.

이 accessor들은 map의 policy contract 일부다. 관찰 가능한 비교를 통해 검증하면 저장된 comparator가 올바르게 반환되고 감싸지는지 확인할 수 있다. 이 case 자체는 일반적인 오름차순 정수 순서를 사용하지만, 이러한 속성은 stateful comparator나 기본값이 아닌 ordering policy에서 특히 중요하다.


## fix(vector): allocator 형식과 빈 반복자 연산 보정
이 변경에서는 표준 정수 타입을 하드코딩하지 않고 allocator에서 `size_type`과 `difference_type`을 파생해 public vector 인터페이스를 allocation policy와 맞춘다.

또한 null-backed empty state에서 pointer arithmetic을 제거한다. 수치 offset이 0이라도 C++ object model은 `_data + 0`을 만들거나 두 null pointer를 빼는 연산을 보장하지 않는다. `_iterator_at`은 block이 없을 때 null pointer를 직접 반환하고, `_index_of`는 subtraction 없이 빈 위치를 index 0으로 변환하며, empty-range erasure는 `last - first` 계산을 피한다. 이 helper들이 표현상의 예외를 한곳에 모으므로 allocation이 존재하는 일반 vector는 계속 상수 시간 pointer arithmetic을 사용하면서, 빈 vector도 undefined behavior 없이 `begin() == end()`, zero-count insertion, empty erasure를 지원할 수 있다.


## test(vector): 빈 저장소와 allocator 상태 검증
이 변경에서는 vector가 아직 어떤 allocation도 소유하지 않은 상태에서 modifier를 실행한다. 빈 begin/end가 같은지 확인하고, `end()`에 zero-count insertion을 수행하며, 이후 bounded-allocator growth scenario로 넘어가기 전에 빈 range를 erase한다.

이 시퀀스는 앞선 fix에서 추가한 null-storage branch를 직접 실행하도록 구성했다. no-op modifier가 실제로 아무 작업도 하지 않고, pointer subtraction을 요구하지 않으며, 나머지 테스트가 사용하는 allocator accounting을 건드리지 않는지 확인한다.


## fix(vector): 저장소 교체와 크기 증가를 트랜잭션으로 처리
이 변경에서는 여러 vector 연산을 명시적인 transactional update로 바꾼다. Fill construction은 `_initialize_fill`을 통해 allocation block을 구성하고, 실패하면 `_data`, `_size`, `_capacity`를 공개하기 전에 생성이 완료된 prefix를 기록해 정리한다. Fill/range assignment는 destination allocator를 사용해 temporary vector를 만들고 storage state만 교환하므로 target의 allocator identity를 보존하면서 replacement가 완성될 때까지 원래 시퀀스를 건드리지 않는다.

크기를 늘리는 `resize`는 이전 size를 기록하고 원소 copy가 실패하면 새로 생성된 suffix만 파괴한다. `push_back`은 construction이 성공한 뒤에만 `_size`를 증가시키며, 재할당이 필요한 경우 `reserve`가 기존 원소 reference를 무효화할 수 있으므로 aliased argument를 먼저 복사한다. 이 선택들은 예외 상황에서도 핵심 lifetime invariant를 강제한다. size는 정확히 살아 있는 prefix만 세고, 실패한 replacement는 storage를 leak하지 않으며, 교체를 약속한 연산은 완전한 successor가 준비되기 전에 이전 값을 파괴하지 않는다.


## test(vector): 생성·대입·크기 변경 실패 주입
이 변경에서는 단순한 boundary fixture를 failure-injection framework로 교체한다. `tracked_value`는 살아 있는 모든 객체를 기록하고 이미 파괴된 source에서의 copy와 중복 destruction을 감지하며, 지정한 copy 또는 assignment 시점에 예외를 던질 수 있다. tracking allocator는 별도로 outstanding block 수를 세고 allocation failure를 주입하며 작은 `max_size`도 노출할 수 있다.

테스트는 fill construction, fill assignment, copy assignment, resize growth 중 실패를 강제로 발생시킨 뒤 각 상황에 맞는 rollback boundary를 확인한다. 부분적으로 생성된 prefix와 suffix는 파괴되어야 하고 temporary block은 해제되어야 하며, replacement가 transactional인 경우 기존 destination value는 그대로 남아야 한다. aliased `push_back(values[0])`은 reallocation 전에 source를 snapshot하는지도 확인한다. 마지막 cleanup assertion에서는 살아 있는 tracked object, 잘못된 lifetime operation, outstanding allocation이 하나도 남지 않아야 하므로 ownership 오류를 단순한 출력값 추론이 아니라 직접 관찰할 수 있다.


## fix(vector): fill·range 삽입의 객체 수명 보존
이 변경에서는 fill과 range 두 형태 모두에서 insertion을 reallocation 경로와 spare-capacity 경로로 분리한다. Fill insertion은 어떤 이동보다 먼저 value를 snapshot하고, range insertion은 self-referential source를 독립시키기 위해 계속 input을 temporary vector에 materialize한다.

Reallocation 경로는 새 block에 prefix, inserted value, suffix를 순서대로 생성한다. 실패하면 새 block에서 생성된 prefix를 파괴하고 block을 해제하며, 전체 시퀀스가 완성된 뒤에만 기존 storage를 교체한다. In-place 경로는 이미 살아 있는 객체가 들어 있는 slot과 초기화되지 않은 capacity를 구분한다. 새 tail object는 `construct`로 생성하고 기존 위치는 assignment로 이동하거나 채우며, 예외 발생 시 새로 생성한 tail만 파괴한다.

이 구분은 이전 shift 알고리즘의 근본적인 object-lifetime 오류를 수정한다. Reallocation insertion은 강한 replacement boundary를 제공한다. In-place insertion은 construction 또는 assignment가 실패해도 유효한 live-prefix와 원래 size를 유지하지만, 예외를 던지는 assignment 이전에 이미 완료된 assignment까지 일반적으로 되돌릴 수는 없다. 따라서 이 경로는 usable하고 leak-free한 상태를 유지하면서 basic guarantee를 제공한다.


## test(vector): 삽입 복사·대입·할당 실패 sweep
이 변경에서는 aliased value와 주입된 failure를 사용해 insertion guarantee를 체계적으로 검증한다. spare capacity에서 fill insertion을 수행할 때는 같은 vector의 원소를 snapshot해야 하고, copy 실패 시 부분 생성된 tail을 정리해야 하며, assignment가 예외를 던져도 유효한 원래 size와 사용할 수 있는 container 상태를 유지해야 한다.

Range insertion은 두 모드로 검사한다. capacity가 충분한 경우 capacity와 영향을 받지 않는 prefix의 주소가 그대로여야 하며, 이를 통해 구현이 불필요하게 reallocate하지 않았음을 증명한다. copy-failure 위치를 순회하는 sweep은 reallocating range insertion의 모든 construction 단계를 실행하며, 결과는 변경되지 않은 원래 시퀀스 또는 완전히 insertion된 시퀀스 중 하나여야 하고 누수된 partial state는 허용하지 않는다. 별도로 주입한 allocation failure 역시 source vector를 보존해야 한다.

각 scenario가 끝나면 lifetime 및 allocation accounting은 모두 0으로 돌아와야 한다. 이 sweep은 exception safety 검증을 선택한 하나의 failure point에서 insertion이 수행하는 사용자 코드 호출 전체 시퀀스로 확장한다.

## fix(map): 삽입 위치를 노드 할당 전에 확정
이 변경에서는 tree를 순회하는 동안 최종 left/right 연결 방향을 기록하고, 이전 구현에서 node allocation 이후 수행하던 추가 comparator 호출을 제거한다.

Comparator 실행은 사용자 코드이며 예외를 던질 수 있다. `_create_node` 전에 모든 비교를 끝내면 insertion에 명확한 단계 경계가 생긴다. 비교 실패 시 map은 아직 새 resource를 소유하지 않고, allocation이 성공한 뒤에는 node 연결과 red-black 보정이 pointer 및 color 연산만으로 진행된다. Duplicate 탐지도 traversal 내부에 남아 있어 불필요한 allocation을 피한다. 이 변경은 comparator 예외로 인해 할당되었지만 연결되지 않은 node가 소유자를 잃을 수 있던 좁지만 중요한 leak 구간을 닫는다.


## fix(map): 생성과 복사 대입 실패를 임시 tree로 격리
이 변경에서는 range construction과 copy construction에 명시적인 rollback을 추가한다. insertion 중 하나라도 실패하면 constructor에서 예외가 빠져나가기 전에 `clear()`가 부분적으로 구축된 객체에 이미 연결된 모든 node를 파괴한다.

Copy assignment는 destination allocator와 source comparator를 사용해 source contents를 temporary map에 먼저 구성한다. 따라서 comparator 기반 insertion, value construction, allocation 중 실패가 발생해도 temporary tree에만 영향을 주고 destination은 미리 clear되지 않는다. construction이 성공하면 private exchange로 새 tree를 설치하고 temporary가 이전 tree를 파괴하게 한다.

이 commit은 resource를 주로 생성하는 failure path를 격리하고 assignment 모델을 copy-and-replace로 정립한다. 마지막 exchange에는 여전히 comparator policy swap이 포함되며 해당 assignment 자체도 예외를 던질 수 있다. policy 교환 순서와 tree ownership의 관계는 이후 별도로 강화한다.


## test(map): 비교·할당 실패 시 노드 소유권 검증
이 변경에서는 제어된 호출 지점에서 실패할 수 있는 stateful comparator 및 allocator fixture를 추가한다. allocator state는 rebinding 이후에도 유지되고 모든 outstanding node block을 세므로, 논리적으로는 올바르지만 연결되지 않거나 부분적으로 복사된 node를 leak한 map과 정상 map을 구분할 수 있다.

Insertion은 comparator failure 위치 전체를 sweep해 allocation 이후에는 비교가 발생하지 않음을 증명한다. Range/copy construction에는 comparison failure와 allocation failure를 모두 주입하며, 실패한 constructor는 어떤 residual node도 남기지 않아야 한다. Copy assignment는 기존 target이 있는 상태에서 검사하고, temporary tree 구축 중 실패하면 원래 key와 baseline allocation count가 보존되어야 한다.

생성형 input iterator가 다른 컨테이너 구현에 의존하지 않고 값을 공급하며, 성공/실패한 모든 경로 뒤에는 ownership check를 수행한다. 이 suite는 최종 ordered output에만 의존하지 않고 map construction과 assignment에 도입한 transaction boundary를 직접 검증한다.


## fix(map): 값 없는 header로 끝 반복자 상태 안정화
이 변경에서는 null end 표현과 iterator마다 저장하던 root snapshot을 각 map에 포함된 value-less header sentinel로 교체한다. `node_base`는 link, color, header marker를 저장하고, 실제 값을 가진 node는 이를 상속한다. header는 구조 요약을 소유한다. `parent`는 root를, `left`는 minimum을, `right`는 maximum을 가리키며, 빈 map에서는 extrema가 header 자신을 가리키고 root는 null이다.

Iterator는 이제 `node_base*` 하나만 저장한다. maximum에서 증가하면 header까지 올라가고, header에서 감소하면 현재 maximum에 도달하므로 저장해 둔 `end()`도 stale한 root snapshot이 아니라 안정적인 sentinel identity를 통해 root rotation과 erasure 이후의 상태를 반영한다. 원소 역참조는 header가 아닌 node에 대해서만 value-bearing 타입으로 cast한다. header에는 `value_type`이 없으므로 빈 map 생성도 default-constructible key를 요구하지 않는다.

Insertion, rotation, transplantation, erasure, clear, swap은 root/header parent link를 유지하고 cache된 extrema를 갱신하도록 변경한다. swap 이후 이동된 각 root는 새 컨테이너의 header에 다시 연결되므로 기존 element iterator는 parent link를 따라 현재 소유 컨테이너의 end까지 이동할 수 있다. 이 refactor는 empty-state 표현, end-iterator 안정성, extrema lookup, non-default-key 지원을 하나의 구조적 불변식으로 통합한다.


## test(map): 회전·삭제·교환 뒤 반복자 상태 검증
이 변경에서는 header-sentinel iterator 모델을 대상으로 한 regression을 추가한다. root를 회전시키는 insertion sequence 이후와 이전 root를 erase한 이후에 저장해 둔 end iterator를 감소시켰을 때 stale topology snapshot이 아니라 현재 maximum에 도달해야 한다. Clear 이후에는 `begin() == end()`가 복원되어야 한다.

기존 원소를 가리키는 iterator를 rotation 동안 유지한 뒤, 재균형된 parent link를 따라 header까지 전진시킨다. element iterator를 보관한 상태에서 서로 다른 map을 swap하며, 해당 iterator는 여전히 원래 node를 역참조할 수 있고 최종적으로 그 node를 새로 소유한 컨테이너의 end sentinel에 도달해야 한다.

테스트는 default constructor가 없는 key도 정의하고 빈 map 및 insertion을 검증한다. 이 case는 sentinel 내부에 default-constructed key/value object를 숨겨 둔 것이 아니라 header가 실제로 value-less임을 증명한다.


## fix(map): 비교자 교환 실패 전에 tree 소유권 유지
이 변경에서는 public swap과 private assignment exchange 모두의 순서를 바꿔 예외를 던질 수 있는 comparator swap이 allocator, root, size ownership 이동보다 먼저 수행되도록 한다.

이 순서가 중요한 이유는 tree ordering은 그것을 지배하는 comparator와 함께 있을 때만 의미가 있고, node는 자신을 deallocate할 allocator state와 계속 짝을 이뤄야 하기 때문이다. policy exchange가 완료되기 전에 comparator assignment가 예외를 던지면 두 map은 여전히 기존 root, size, allocator를 유지하며, 일치하지 않는 policy 아래에서 어떤 tree도 ownership boundary를 넘어가지 않는다. 이후 ownership swap과 header refresh는 comparator 단계가 성공한 뒤에만 수행한다.

작은 diff이지만 copy assignment와 public swap의 고위험 commit point를 수정한다. 앞선 사용자 정의 policy 연산 중 예외가 발생할 수 있다면, 해당 연산들이 모두 끝나기 전에 resource ownership을 바꾸어서는 안 된다.


## test(map): 비교자 대입 실패 뒤 컨테이너 상태 검증
이 변경에서는 assignment가 예외를 던질 수 있는 comparator와 identity 및 outstanding block을 독립적으로 추적하는 allocator를 도입한다. 두 map은 서로 다른 ordering 방향과 allocator state를 사용하므로 policy/ownership이 부분적으로 교환되는 문제를 관찰할 수 있다.

Copy assignment에서는 exchange boundary의 comparator failure가 발생한 뒤에도 target의 원래 내림차순 시퀀스, allocator 소유 node 수, 추가 insertion 가능 상태가 그대로 유지되어야 하며, 완성된 temporary tree는 해제되어야 한다. Public swap에서는 주입된 failure 이후 두 컨테이너 모두 원래 ordered contents, allocator identity, node ownership count를 유지해야 한다.

테스트는 search 중 comparator 호출이 아니라 policy assignment 자체에 초점을 맞춰 이전 map exception suite가 다루지 않은 failure mode를 검증한다. commit 순서를 재배치한 것이 logical ordering과 physical resource ownership을 모두 보호하는지 확인한다.


## test(map): 무작위 연산마다 레드-블랙 불변식 검증
이 변경에서는 제한된 white-box inspection seam을 추가하고 이를 사용해 모든 구조 변경 연산 뒤 tree를 검증한다. inspector는 header가 black이고 올바르게 표시되어 있는지, 빈 상태의 extrema가 self-reference하는지, root가 header를 parent로 가리키며 black인지, cache된 minimum/maximum이 현재 값인지, parent/child link가 서로 일치하는지, key가 엄격한 subtree bound를 만족하는지, red node에 red child가 없는지, 모든 null-leaf 경로의 black height가 같은지, 도달 가능한 node 수가 `size()`와 같은지를 검사한다.

검증에는 고정 insertion/erasure sequence, 현재 root의 반복 삭제, `std::map`과 비교하는 3,000회의 deterministic pseudo-random operation이 포함된다. randomized stream은 insertion, `operator[]`, key/iterator erasure, query, copy, assignment, secondary map과의 swap, 간헐적인 clear를 다룬다. 매 단계마다 두 map을 비교하고 구조를 검증한다.

실패 시 고정 seed, 현재 step, 전체 operation prefix를 출력하므로 복잡한 balancing regression도 재현할 수 있다. friend 선언은 컨테이너 동작을 새로 노출하지 않고, 일반 iteration만으로 증명할 수 없는 속성을 위한 의도적으로 제한된 test boundary를 만든다.


## perf(map): 높이와 비교 횟수 회귀 상한 추가
이 변경에서는 map의 asymptotic requirement를 실행 가능한 regression limit으로 바꾼다. counting comparator가 insertion 및 lookup 작업량을 측정하고 structural inspector가 실제 tree height를 보고한다.

오름차순, 내림차순, deterministic shuffle 순서의 1,024개 key에 대해 tree는 최대 `2 * ceil(log2(n + 1))`인 red-black height bound를 만족해야 한다. 전체 insertion comparison 수는 보수적인 `n log n` 식으로 제한하고, 성공/실패하는 각 `find`는 측정된 height의 일정 배수 안에서 끝나야 한다. scenario에는 일반 binary-search tree를 선형으로 만드는 두 입력 순서가 모두 포함된다.

이는 microbenchmark가 아니라 upper-bound test다. timing noise를 피하고 알고리즘적으로 의미 있는 구조 및 비교 비용을 측정한다. 정렬 결과는 그대로 유지하면서 balancing이 실수로 비활성화되거나 반복적인 linear search가 도입되는 regression은 deterministic하게 실패한다.


## test(headers): 공개 헤더를 각각 독립 compile
이 변경에서는 모든 public header마다 별도의 최소 translation unit을 컴파일한다. 각 source는 library header 하나만 포함하고 대표적인 연산 하나를 인스턴스화하며, Makefile은 dedicated `headers` target에서 파일을 object로 빌드한다.

분리된 검증이 중요한 이유는 combined test가 앞서 포함된 다른 header가 빠진 standard 또는 project dependency를 우연히 제공한 덕분에 컴파일될 수 있기 때문이다. 각 public header가 self-contained해야 한다는 조건을 강제하면 include guard와 direct dependency도 API contract 일부가 된다. aggregate header는 component header와 별도로 테스트해 두 가지 지원 include 방식을 모두 보존한다.


## test(consumer): 다중 번역 단위 공개 헤더 사용 검증
이 변경에서는 독립적인 translation unit으로 나눈 linked consumer program을 추가한다. 한 source는 `ft_vector`를 include하고 사용하며, 다른 source는 `ft_map`을 include하고 사용하고, 세 번째 source는 작은 shared declaration header를 통해 둘을 호출한다. 결과 executable은 deterministic한 aggregate result를 확인한다.

header를 독립적으로 컴파일하면 빠진 declaration을 찾을 수 있고, 여러 consumer를 link하면 여러 object file에 non-inline definition이 생성되는 경우처럼 header-only ODR 및 linkage error까지 검증할 수 있다. 새 `check` target은 behavioral test, isolated-header compilation, multi-translation-unit consumer를 조합해 라이브러리를 하나의 monolithic test source가 아니라 실제 애플리케이션에 가까운 사용 형태로 검증한다.


## build(makefile): 격리된 sanitizer 검사 대상 추가
이 변경에서는 전체 `check` suite를 AddressSanitizer와 UndefinedBehaviorSanitizer로 빌드하는 target을 추가한다. 실패 원인을 진단할 수 있도록 debug information과 frame pointer를 유지하고, recursive make가 instrumented object를 별도 build directory에 배치한다.

빌드를 격리하면 서로 다른 flag로 컴파일된 일반 object와 sanitizer object가 섞이거나 잘못 up-to-date로 판단되는 문제를 막는다. behavioral test, header consumer, linked multi-translation-unit program 전체에 instrumentation을 적용해 잘못된 pointer arithmetic, use-after-free, double destruction, out-of-bounds access 등 단순한 value comparison만으로는 드러나지 않을 수 있는 lifetime 오류 탐지 범위를 넓힌다.


## ci: compiler 행렬과 sanitizer 검사 구성
이 변경에서는 push와 pull request마다 repository의 compatibility 및 memory-safety 검사를 자동화한다. main matrix는 Linux에서 GNU C++와 Clang, macOS에서 Clang으로 전체 `check` target을 실행하며, fail-fast를 비활성화해 platform별 결과를 함께 확인할 수 있게 한다.

별도의 Linux job은 Clang으로 sanitizer target을 실행하고 leak detection, 즉시 실패, undefined-behavior stack trace를 활성화한다. 두 job 모두 read-only repository permission이면 충분하다. 이 workflow는 C++98 portability, public-header integration, multi-translation-unit linkage, behavioral parity, sanitizer cleanliness를 로컬에서 선택적으로 수행하는 검사가 아니라 반복 가능한 branch-level acceptance criterion으로 바꾼다.


## test(vector): 자기 범위 기대값을 명시적 snapshot으로 구성
이 변경에서는 `ft::vector`에 연산을 적용하기 전에 self-range insertion과 assignment의 기대 결과를 원소 단위로 명시적으로 다시 구성한다. insertion의 reference sequence는 변경되지 않는 prefix, snapshot한 source range, 변경되지 않는 suffix를 이어 만들고, assignment는 선택된 내부 range에서 구성한다.

테스트는 더 이상 `std::vector`에 대응 modifier를 실행하지 않으므로 overlapping source range에 대한 구현별 또는 버전별 해석에 oracle이 결합되는 문제를 피한다. 기대값은 이제 이 라이브러리가 지원하기로 한 계약에서 직접 도출된다. 따라서 regression이 실패하면 관련된 두 컨테이너가 비슷한 mutation algorithm을 수행한 결과 차이가 아니라 명시된 snapshot semantics와의 불일치를 뜻한다.
