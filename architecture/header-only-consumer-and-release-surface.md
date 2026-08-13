# 소스 헤더가 곧 배포물인 프로젝트

이 프로젝트의 결과물은 링크용 라이브러리가 아니라 `include/`의 C++98 템플릿 헤더이다. 저장소 내부 실행 파일은 구현을 검사하기 위한 산출물이며 소비자에게 배포하는 라이브러리가 아니다.

## 소비자 번역 단위에서 인스턴스화되는 코드

```text
소비자 번역 단위
  └─ -Iinclude
      ├─ #include "ft_containers.hpp"
      │   └─ 모든 공용 도구와 컨테이너
      └─ 또는 필요한 ft_*.hpp 직접 포함
          └─ 사용한 형식과 멤버를 번역 단위에서 인스턴스화
```

통합 헤더를 사용한 최소 명령은 다음과 같다.

```sh
c++ -Wall -Wextra -Werror -std=c++98 -Iinclude your_test.cpp
```

별도의 `.a`, `.so`나 `.dylib`를 링크하지 않는다. 같은 템플릿 정의가 여러 번역 단위에서 사용될 수 있으므로 헤더 자체의 포함 독립성과 링크 중복 여부가 소비자 검증의 일부이다.

## 공개 헤더

| 헤더 | 공개 역할 |
|---|---|
| `ft_containers.hpp` | 모든 구현을 모은 통합 진입점이다. |
| `ft_vector.hpp` | `ft::vector`와 비멤버 관계 연산을 제공한다. |
| `ft_stack.hpp` | `ft::stack` 어댑터를 제공한다. |
| `ft_map.hpp` | `ft::map`과 비멤버 관계 연산을 제공한다. |
| `ft_pair.hpp` | `pair`, `make_pair`와 관계 연산을 제공한다. |
| `ft_type_traits.hpp` | `enable_if`, `integral_constant`, `is_integral`을 제공한다. |
| `ft_iterator.hpp` | 반복자 기반 형식, 특성과 `reverse_iterator`를 제공한다. |
| `ft_algorithm.hpp` | `equal`, `lexicographical_compare`를 제공한다. |

[`tests/headers`](../tests/headers)의 소스는 각 헤더를 첫 번째로 포함한다. 다른 헤더가 우연히 앞에서 표준 형식이나 선언을 제공해야만 컴파일되는 상황을 찾기 위한 구성이다.

## Make 대상

[`Makefile`](../Makefile)은 검사 목적에 따라 결과물을 나눈다.

### 기본 검사 실행 파일

`make`는 다음 일곱 실행 파일을 `build/`에 만든다.

```text
build/test_containers
build/test_vector_exceptions
build/test_map_exceptions
build/test_map_iterators
build/test_map_policy_exceptions
build/test_map_randomized
build/test_complexity
```

`make test`는 위 파일을 순서대로 실행하고 첫 실패의 종료 코드를 반환한다. 각 대상은 검사 소스와 현재 공개 헤더, 테스트 지원 헤더를 선행 조건으로 둔다.

### 개별 헤더

`make headers`는 `tests/headers/*.cpp`를 각각 객체 파일로 컴파일한다.

```text
tests/headers/ft_vector.cpp
  └─ build/headers/ft_vector.o
```

이 대상은 컴파일만 수행한다. 각 소스에 최소 사용 코드가 있지만 객체를 링크하거나 실행하지 않으므로 런타임 동작 검사는 다른 실행 파일이 맡는다.

### 다중 번역 단위

`make consumer`는 다음 경로를 빌드하고 실행한다.

```text
tests/consumer/vector_consumer.cpp ─┐
tests/consumer/map_consumer.cpp ────┼─> build/consumer_test ─> 실행
tests/consumer/main.cpp ────────────┘
```

`vector`와 `map`을 서로 다른 번역 단위에서 직접 포함해 사용한다. 세 객체가 함께 링크되고 실행 결과가 맞아야 통과한다.

- 헤더 안의 정의 때문에 다중 정의 링크 오류가 생기지 않아야 한다.
- 통합 헤더에만 기대지 않고 개별 컨테이너 헤더를 소비할 수 있어야 한다.

### 전체 검사와 새니타이저

`make check`는 `test`, `headers`, `consumer`를 묶는다.

```text
make check
  ├─ 공개 결과·예외·반복자·구조·복잡도 실행
  ├─ 개별 공개 헤더 컴파일
  └─ 다중 번역 단위 링크와 실행
```

`make sanitize`는 `build/sanitize/`를 별도 결과 경로로 사용하고 다음 옵션을 더해 `make check`를 다시 호출한다.

```text
-O1 -g -fno-omit-frame-pointer
-fsanitize=address,undefined
```

새니타이저 검사는 기본 비교 실행 파일만이 아니라 예외 주입, 무작위 검사, 개별 헤더와 다중 번역 단위 경로까지 같은 빌드 규칙으로 거친다. 실행 환경의 컴파일러와 런타임이 두 새니타이저를 지원해야 한다.

## CI에서 확인하는 환경

[`C++98 checks`](../.github/workflows/ci.yml)는 다음 조합으로 실행된다.

| 운영체제 | 컴파일러 | 명령 |
|---|---|---|
| Ubuntu 최신 실행기 | `g++` | `make CXX=g++ check` |
| Ubuntu 최신 실행기 | `clang++` | `make CXX=clang++ check` |
| macOS 최신 실행기 | `clang++` | `make CXX=clang++ check` |
| Ubuntu 최신 실행기 | `clang++` | 누수 감지를 켠 `make CXX=clang++ sanitize` |

모든 작업은 저장소를 새로 체크아웃한 상태에서 시작하므로 로컬의 오래된 빌드 결과에 기대지 않는다. 워크플로 권한은 저장소 읽기로 제한한다.

이 행렬은 두 컴파일러 계열과 두 운영체제의 현재 GitHub 실행기를 다룬다. 특정 컴파일러 버전, 32비트 ABI나 다른 표준 라이브러리 구현까지 고정하는 호환성 표는 아니다.

## 재빌드 규칙

Makefile은 `include/*.hpp`를 모든 검사 실행 파일, 헤더 객체와 소비자 객체의 선행 조건으로 둔다. 어느 공개 헤더가 바뀌어도 관련 결과물을 다시 컴파일한다.

이 규칙은 의존성 누락을 줄이는 대신 실제 포함 관계보다 넓다. 예를 들어 `ft_map.hpp`만 바뀌어도 `vector` 소비자 객체를 다시 컴파일한다. 저장소 규모에서는 재현성이 단축되는 빌드 시간보다 중요하다는 선택이다.

다음 경우에는 주의가 필요하다.

- 헤더를 삭제하면 그 파일은 다음 `wildcard` 결과에서 사라진다. 통합 헤더나 검사 소스의 수정 시각도 바뀌지 않고 오래된 결과가 남았다면 삭제 자체가 재빌드를 유발하지 않을 수 있다.
- Makefile은 컴파일러가 생성하는 `.d` 파일로 실제 포함 그래프를 저장하지 않는다.
- `make re`는 `build/`를 지운 뒤 기본 일곱 실행 파일만 다시 만든다. 헤더·소비자까지 깨끗하게 확인하려면 `make clean && make check`를 사용해야 한다.

CI는 깨끗한 체크아웃에서 `make check`를 실행하므로 첫 번째 위험이 원격 검사 결과에 남지는 않는다.

## 템플릿 인스턴스화 범위

헤더가 파싱된다는 사실과 모든 코드 경로가 인스턴스화된다는 사실은 다르다.

| 검증 방식 | 알 수 있는 것 | 알 수 없는 것 |
|---|---|---|
| 개별 헤더 `-c` | 헤더가 독립적으로 파싱되고 최소 사용 형식을 컴파일한다. | 해당 객체를 실제 링크·실행한 결과 |
| 통합 공개 결과 검사 | 한 번역 단위에서 여러 컨테이너와 공용 도구가 함께 동작한다. | 다른 번역 단위와의 ODR 문제 |
| 다중 번역 단위 소비자 | 개별 헤더를 여러 소스에서 사용하고 함께 링크할 수 있다. | 모든 형식·과부하 조합 |
| 예외·구조 검사 | 사용자 값·비교자·할당자 조합 일부를 인스턴스화한다. | 임의의 사용자 형식 전체 |
| CI 행렬 | 여러 컴파일러·운영체제에서 같은 공개 경로가 성립한다. | 지원을 명시하지 않은 도구 체인 |

템플릿 멤버는 헤더를 읽는 순간 모두 컴파일되는 것이 아니라 소비자가 사용한 형식과 연산을 따라 지연 인스턴스화될 수 있다. 따라서 통합 헤더가 파싱되고 최소 `vector<int>`·`map<int, int>` 소비자가 링크되어도, 호출하지 않은 범위 과부하나 다른 반복자 조합의 오류는 남을 수 있다. 현재 예외 검사가 던지는 값·상태 추적 할당자·비교자 조합 일부를 추가로 인스턴스화하지만, 임의의 할당자 전파 방식, 값 형식, 비교자와 반복자 조합 전체로 일반화하지 않는다. 새 공개 과부하나 지원 형식을 추가할 때는 그 조합을 실제로 호출하는 최소 소비자 또는 실패 주입 검사를 함께 추가해야 한다.

`map`의 테스트 전용 `ft::detail::map_inspector` 친구 선언도 공개 헤더에 존재한다. 일반 소비자는 이를 사용할 필요가 없으며, `tests/support/map_inspector.hpp`를 포함한 검사만 내부 구조를 읽는다.

## 알려진 공개 타입 경계

헤더가 컴파일된다는 사실과 표준 구현의 모든 type trait 결과가 같다는 사실은
구분한다.

- `map::const_iterator`는
  `ft::iterator<..., const value_type>`를 기반으로 한다. 일반
  `iterator_traits`가 중첩 형식을 그대로 사용하므로
  `iterator_traits<map::const_iterator>::value_type`은
  `const pair<const Key, T>`가 된다. 표준적인 unqualified `value_type`과
  다른 현재 호환성 경계이며 자동 검사가 없다.
- `integral_constant<T, V>::value`는 class 안의 `static const` 선언과
  initializer만 제공한다. compile-time 값으로 사용하는 경로는 성립하지만
  주소를 취하는 ODR-use에는 별도 정의가 없어 link 대상이 되지 않는다.
- vector allocator의 `pointer`는 저장소 산술에 직접 쓰이고 map은 내부 링크를
  raw `node*`로 보관한다. 현대 fancy pointer·allocator propagation 전체를
  제공하는 구현이 아니다.
- `map::erase(end())`는 조용히 반환한다. 이는 잘못된 iterator 사용을 진단하는
  계약이 아니라 현재 구현의 확장 동작이며 다른 잘못된 iterator는 지원하지 않는다.

이 차이는 제품 코드를 표준 전체와 같다고 과장하지 않기 위한 공개 제한이다.
새 호환성을 약속하려면 실제 소비자 type assertion과 여러 번역 단위 링크 검사를
같이 추가해야 한다.

## 배포되는 것과 배포되지 않는 것

현재 배포 표면은 소스 저장소의 헤더와 사용·검증 안내이다.

| 항목 | 상태 |
|---|---|
| `include/*.hpp` | 실제 공개 템플릿 구현이다. |
| 통합 헤더 | 제공하며 자동 컴파일·실행 검사에 사용한다. |
| 개별 헤더 | 각각 독립 컴파일 검사가 있다. |
| 링크용 라이브러리 | 만들지 않는다. |
| 설치 대상과 접두사 | 정의하지 않았다. |
| CMake 패키지·pkg-config | 제공하지 않는다. |
| 버전 매크로와 ABI 정책 | 정의하지 않았다. |
| 배포 압축 파일 | 만들거나 내용물을 검사하지 않는다. |
| 패키지 관리자 메타데이터 | 제공하지 않는다. |

`build/` 아래 파일은 저장소 자체의 검사 산출물이다. 이를 다른 프로젝트에 복사해 링크하는 사용법은 지원하지 않는다.

## 저장소 밖에서 쓰기 전에 확인할 것

```sh
make clean
make check
make CXX=clang++ sanitize
```

GCC 경로를 별도로 확인하려면 깨끗한 상태에서 `make CXX=g++ check`를 실행한다. 검사 후 생성되는 `build/`는 `make clean`으로 제거할 수 있다.

실제 설치 패키지나 배포 압축 파일을 추가한다면 공개 헤더 목록과 설치 경로를 명시하고, 빈 임시 디렉터리에 설치한 결과만으로 소비자 코드를 컴파일해야 한다. 패키지 내용과 지원 컴파일러·버전 정책도 자동 검사와 함께 고정해야 한다.

현재 자동 검사는 소스 저장소에서 헤더를 직접 사용하는 경우까지만 다룬다.
설치·버전·압축 배포는 아직 공개 계약으로 삼지 않았다. 모든 공개 헤더를
보수적으로 선행 조건에 넣었기 때문에 재컴파일 범위도 실제 포함 관계보다 넓다.
