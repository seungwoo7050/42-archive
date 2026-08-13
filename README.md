# ft_containers

> CXX98 템플릿으로 `vector`, `stack`, `map`과 기반 도구를 구현하고, 공개 결과뿐 아니라 객체 수명·예외 처리·반복자·레드-블랙 트리 불변식까지 검증하는 헤더 전용 컨테이너 라이브러리다.

`ft::vector`, `ft::stack`, `ft::map`을 중심으로 `pair`, 반복자 어댑터,
비교 알고리즘과 타입 특성을 `ft` 네임스페이스에 제공한다. 결과물은
[`include/`](./include/)의 템플릿 헤더이며 표준 라이브러리 전체를 대체한다고
주장하지 않는다.

## 빠른 시작

요구 사항은 CXX98을 지원하는 C++ 컴파일러와 GNU Make다. sanitizer 검사는
AddressSanitizer와 UndefinedBehaviorSanitizer를 지원하는 컴파일러가 필요하다.

```sh
make clean
make check
make CXX=clang++ sanitize
```

모든 구성 요소가 필요하면 통합 헤더를 포함한다.

```cpp
#include "ft_containers.hpp"

int main()
{
    ft::vector<int> numbers;
    numbers.push_back(42);

    ft::map<int, int> values;
    values[1] = numbers.back();

    ft::stack<int> pending;
    pending.push(values[1]);
    return pending.top() == 42 ? 0 : 1;
}
```

저장소 루트에서 다음처럼 컴파일한다.

```sh
c++ -Wall -Wextra -Werror -std=c++98 -Iinclude example.cpp -o example
```

## 제공 범위

| 헤더 | 공개 구성 요소 | 역할 |
|---|---|---|
| [`ft_containers.hpp`](./include/ft_containers.hpp) | 전체 공개 표면 | 모든 컨테이너와 공용 도구의 통합 진입점 |
| [`ft_vector.hpp`](./include/ft_vector.hpp) | `ft::vector` | allocator 기반 연속 저장 컨테이너 |
| [`ft_stack.hpp`](./include/ft_stack.hpp) | `ft::stack` | 기본적으로 `ft::vector`를 사용하는 LIFO 어댑터 |
| [`ft_map.hpp`](./include/ft_map.hpp) | `ft::map` | 레드-블랙 트리 기반 정렬 연관 컨테이너 |
| [`ft_pair.hpp`](./include/ft_pair.hpp) | `ft::pair`, `ft::make_pair` | 값 쌍과 관계 연산 |
| [`ft_iterator.hpp`](./include/ft_iterator.hpp) | iterator traits, reverse iterator | 반복자 형식 정보와 역방향 순회 |
| [`ft_algorithm.hpp`](./include/ft_algorithm.hpp) | `equal`, `lexicographical_compare` | 범위 비교 |
| [`ft_type_traits.hpp`](./include/ft_type_traits.hpp) | `enable_if`, `integral_constant`, `is_integral` | 개수와 범위 과부하 선택 |

`vector`는 기본·개수·범위·복사 생성, 순방향·역방향 반복자, 크기·용량,
`reserve`, `resize`, 원소 접근, `assign`, 삽입·삭제·교환과 관계 연산을
제공한다. `stack`은 기본 하위 컨테이너에 LIFO 연산을 위임한다. `map`은
생성·순회·삽입·삭제·교환, 검색·경계 질의, 비교자와 관계 연산을 제공한다.

## 구현 핵심

`vector`는 allocator, 블록 포인터, 크기와 용량을 직접 관리한다.

```text
[data, data + size)       생성된 객체
[data + size, data + cap) 아직 객체가 없는 저장공간
```

재할당 경로는 새 블록의 원소가 완성된 뒤 저장 상태를 교체한다. 범위
`assign`과 `insert`는 입력 snapshot을 만들어 자기 범위 별칭을 분리한다.
용량은 대체로 두 배로 증가하며 allocator의 `max_size()`에 가까워지면
상한에서 포화한다.

`map`은 값이 없는 헤더 센티널과 allocator로 생성한 값 노드를 분리한다.

```text
header.parent -> root
header.left   -> minimum
header.right  -> maximum
end()         -> header
```

삽입과 삭제는 색 보정과 회전을 수행하며 루트 색, 빨강 자식, 검정 높이,
부모·자식 링크와 도달 노드 수를 유지한다. 비교자 교환은 tree 소유권 이동
전에 수행해, 비교자가 상태를 바꾸기 전에 던지는 경로에서 대상 tree를
보존한다.

## 복잡도

| 연산 | 시간 복잡도 | 비고 |
|---|---:|---|
| `vector` 원소 접근·반복자·크기 조회 | O(1) | 연산별 사전 조건 적용 |
| `vector::push_back` | 상각 O(1), 성장 시 O(n) | 재할당 시 새 블록 사용 |
| `vector::insert`, `erase` | 이동 원소 수에 선형 | 범위 입력 snapshot은 O(m) 추가 공간 |
| 기본 `stack` 조회·`top`·`pop` | O(1) | 다른 하위 컨테이너는 해당 비용 적용 |
| `map` 검색·경계 질의·단일 삽입 | O(log n) | 비교자 비용 별도 |
| `map` 범위 삽입·복사 | O(k log(n + k)) | 원소별 단일 삽입 |
| `map::clear`, 관계 연산 | O(n) | 노드 정리 또는 원소열 비교 |
| `map::swap` | O(log n + log m) | 교환 뒤 헤더 양 끝 갱신 |

## 검증

| 명령 | 수행 내용 |
|---|---|
| `make` | 일곱 검사 실행 파일 생성 |
| `make test` | 공개 결과·예외·반복자·무작위·복잡도 검사 실행 |
| `make headers` | 모든 공개 헤더를 첫 include로 개별 컴파일 |
| `make consumer` | 다중 번역 단위 소비자를 링크·실행 |
| `make check` | `test`, `headers`, `consumer` 전체 수행 |
| `make sanitize` | 격리 빌드 경로에서 ASan·UBSan으로 `check` 실행 |

검사 계층은 다음과 같다.

| 검사 | 확인하는 내용 |
|---|---|
| [`test_containers.cpp`](./tests/test_containers.cpp) | 선택된 공개 결과를 `std` 컨테이너와 비교 |
| [`test_vector_exceptions.cpp`](./tests/test_vector_exceptions.cpp) | 객체 수명, 할당 블록과 실패 뒤 상태 |
| [`test_map_exceptions.cpp`](./tests/test_map_exceptions.cpp) | 비교·노드 할당 실패와 트랜잭션 |
| [`test_map_iterators.cpp`](./tests/test_map_iterators.cpp) | 회전·삭제·교환 뒤 반복자 상태 |
| [`test_map_policy_exceptions.cpp`](./tests/test_map_policy_exceptions.cpp) | 비교자 대입 실패 뒤 tree 소유권 |
| [`test_map_randomized.cpp`](./tests/test_map_randomized.cpp) | 고정 시드 공개 결과와 레드-블랙 불변식 |
| [`test_complexity.cpp`](./tests/test_complexity.cpp) | 트리 높이와 비교자 호출 상한 |
| [`tests/headers`](./tests/headers/) | 개별 공개 헤더 컴파일 |
| [`tests/consumer`](./tests/consumer/) | 다중 번역 단위 링크와 실행 |

CI는 Ubuntu의 GCC·Clang, macOS의 Clang 일반 검사와 Ubuntu Clang sanitizer
검사를 모든 push와 pull request에서 실행한다.

## 호환성 및 제한

- 선택한 CXX98 인터페이스만 제공하며 모든 표준 과부하를 포함하지 않는다.
- `map`의 힌트 삽입은 일반 삽입으로 전달한다.
- `vector` 범위 변경은 입력 snapshot에 추가 공간을 사용한다.
- 제자리 삽입·삭제 중 사용자 대입이 실패하면 일부 값은 이미 바뀔 수 있다.
- `map::operator[]`은 `mapped_type`의 기본 생성을 요구한다.
- `is_integral`은 cv 한정 형식을 자동 정규화하지 않는다.
- allocator fancy pointer와 전파 정책 전체를 지원하지 않는다.
- 상태를 일부 변경한 뒤 던지는 비교자와 allocator 교환 예외는 일반화하지 않는다.
- 설치 패키지, ABI 정책과 배포 메타데이터는 제공하지 않는다.

## 구조와 문서

```text
.
├── include/                    # 공개 CXX98 템플릿 헤더
├── tests/                     # 공개·예외·구조·소비자 검사
├── architecture/              # 구현 구조와 계약
├── devlog/                    # 구현 단계와 검증 기록
├── .github/workflows/ci.yml   # compiler·sanitizer 행렬
└── Makefile                   # 빌드와 검증 진입점
```

현재 구현을 파악하려면 다음 문서를 순서대로 읽을 수 있다.

1. [`implementation-dependency-map.md`](./architecture/implementation-dependency-map.md)
2. [`vector-map-representation-invariants.md`](./architecture/vector-map-representation-invariants.md)
3. [`compatibility-exception-and-iterator-contract.md`](./architecture/compatibility-exception-and-iterator-contract.md)
4. [`header-only-consumer-and-release-surface.md`](./architecture/header-only-consumer-and-release-surface.md)

구현 단계의 인과관계와 검사 확장은 [`devlog/README.md`](./devlog/README.md)에서
주제별 읽기 순서로 이어진다.

저장소에는 별도의 `LICENSE` 파일이 없으므로 재사용·수정·재배포 조건은 아직
명시되지 않았다.
