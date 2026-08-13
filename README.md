# C Foundation

`C99`의 문자·메모리·문자열·변환·파일 디스크립터·단일 연결 리스트 기초 API 43개를 직접 구현하고, 17개 번역 단위를 `libft.a`로 묶어 제공하는 학습용 정적 라이브러리다.

목표는 익숙한 libc 함수 이름을 단순히 복제하는 데 있지 않다. 유효한 메모리 범위와 겹침, `size_t` 산술, 동적 메모리 소유권, 실패 시 rollback, callback 수명, 부분 `write`, 정적 archive의 공개 경계를 코드와 검증 절차로 고정한다.

## 현재 범위

| 항목 | 내용 |
| --- | --- |
| 빌드 산출물 | `libft.a` |
| 공개 헤더 | `libft.h` |
| 공개 인터페이스 | 함수 43개와 `t_list` |
| 구현 구성 | 17개 C 번역 단위 |
| 언어 설정 | `C99`, `-Wall -Wextra -Werror -Wpedantic -fno-builtin` |
| 플랫폼 경계 | ISO C 기반 구현과 POSIX `write`; archive 검사는 Darwin/Linux 지원 |
| 외부 런타임 의존성 | `malloc`, `free`, `write`, 플랫폼별 `errno` 접근자 |

## 핵심 구현

- 바이트 범위와 복사 영역의 겹침을 구분해 `ft_memcpy`와 `ft_memmove`의 계약을 분리한다.
- 크기를 계산한 뒤 할당하지 않고, 곱셈·덧셈 오버플로 가능성을 먼저 검사한다.
- `ft_split`과 `ft_lstmap`은 중간 할당 실패 시 이미 획득한 자원을 정리하고 부분 결과를 노출하지 않는다.
- fd 출력은 짧은 양수 `write` 뒤 남은 바이트를 이어 쓰고, `EINTR`를 재시도하며, 영구 오류 뒤 추가 출력을 중단한다.
- 기능 테스트와 별개로 archive member, 공개 심볼, 외부 미정의 심볼, 저장소 밖 소비자 링크를 검사한다.

## 시작하기

### 요구 환경

라이브러리 빌드에는 다음 도구가 필요하다.

- POSIX 계열 환경
- C99 컴파일러
- `make`
- `ar`

```sh
make
```

빌드가 끝나면 저장소 루트에 `libft.a`가 생성된다.

기본 기능 검사는 다음과 같이 실행한다.

```sh
make test
```

컴파일러를 명시하려면 `CC`를 전달한다.

```sh
make CC=clang
```

## 다른 C 프로그램에서 사용하기

이 저장소는 설치 타깃을 제공하지 않는다. 소비자는 `libft.h`를 include하고 `libft.a`를 직접 링크한다.

```c
#include "libft.h"

#include <stdlib.h>

int main(void)
{
    char    *copy;
    t_list  *node;

    copy = ft_strdup("foundation");
    if (copy == NULL)
        return (1);
    node = ft_lstnew(copy);
    if (node == NULL)
    {
        free(copy);
        return (1);
    }
    ft_lstdelone(node, free);
    return (0);
}
```

```sh
cc -Wall -Wextra -Werror -Wpedantic -std=c99 -fno-builtin \
  -I. example.c libft.a -o example
./example
```

다른 디렉터리에서 링크한다면 `-I`와 archive 경로를 저장소의 실제 위치로 바꾼다.

## 공개 API

| 영역 | 함수 | 주요 경계 |
| --- | --- | --- |
| 문자 7개 | `ft_isalpha`, `ft_isdigit`, `ft_isalnum`, `ft_isascii`, `ft_isprint`, `ft_toupper`, `ft_tolower` | ASCII 기준이며 locale과 Unicode를 읽지 않는다. |
| 메모리 6개 | `ft_memset`, `ft_bzero`, `ft_memcpy`, `ft_memmove`, `ft_memchr`, `ft_memcmp` | 유효 바이트 범위와 복사 영역의 겹침 여부를 호출자가 보장한다. |
| 문자열 13개 | `ft_strlen`, `ft_strlcpy`, `ft_strlcat`, `ft_strchr`, `ft_strrchr`, `ft_strncmp`, `ft_strnstr`, `ft_substr`, `ft_strjoin`, `ft_strtrim`, `ft_split`, `ft_strmapi`, `ft_striteri` | NUL 종료, destination 용량, 새 문자열의 소유권, callback 수명이 핵심이다. |
| 변환 2개 | `ft_atoi`, `ft_itoa` | `INT_MIN`을 처리하며 `ft_atoi`는 범위 초과를 `INT_MIN` 또는 `INT_MAX`로 고정하지만 별도 오류 상태를 제공하지 않는다. |
| 할당 2개 | `ft_calloc`, `ft_strdup` | 오버플로와 할당 실패 시 `NULL`; 성공 결과는 호출자가 해제한다. |
| fd 출력 4개 | `ft_putchar_fd`, `ft_putstr_fd`, `ft_putendl_fd`, `ft_putnbr_fd` | POSIX `write`를 사용하며 공개 반환형이 `void`라 최종 실패를 호출자에게 전달하지 못한다. |
| 리스트 9개 | `ft_lstnew`, `ft_lstadd_front`, `ft_lstsize`, `ft_lstlast`, `ft_lstadd_back`, `ft_lstdelone`, `ft_lstclear`, `ft_lstiter`, `ft_lstmap` | 노드와 `content`의 수명은 별개이며 유한한 비순환 단일 연결 목록을 전제로 한다. |

함수별 입력 조건과 반환·실패 계약은 [API 계약](docs/api-contracts.md)에 정리되어 있다.

## 소유권 규칙

포인터 반환값은 같은 방식으로 다루지 않는다.

| 반환 형태 | 대표 API | 호출자 책임 |
| --- | --- | --- |
| 입력 객체 내부의 빌린 주소 | `ft_memchr`, `ft_strchr`, `ft_strrchr`, `ft_strnstr`, `ft_lstlast` | 직접 해제하지 않고 원본보다 오래 보관하지 않는다. |
| 새 단일 할당 | `ft_calloc`, `ft_strdup`, `ft_substr`, `ft_strjoin`, `ft_strtrim`, `ft_itoa`, `ft_strmapi` | 성공 결과를 `free`한다. |
| 여러 할당의 root | `ft_split`, `ft_lstmap` | 각 child와 root의 계약에 맞춰 전체 결과를 정리한다. |
| 새 리스트 노드 | `ft_lstnew` | 노드만 새로 소유한다. 전달한 `content`의 소유권 정책은 호출자가 정한다. |

`ft_split`은 각 field와 마지막 pointer array를 별도로 할당한다. 중간 실패 때는 완성된 field와 배열을 모두 회수하지만, 성공 결과를 한 번에 해제하는 공개 helper는 제공하지 않는다.

`ft_lstmap`은 callback 결과를 새 노드에 연결한다. 노드 생성이 실패하면 방금 생성한 `content`와 이미 만든 결과 목록에 `del`을 적용한다. callback이 원본 주소를 그대로 반환하거나 외부 자원을 함께 다루는 경우의 공유 수명은 호출자가 정해야 한다.

상세한 자원 이동과 실패 경로는 [소유권과 실패 경로](architecture/ownership-and-failure-paths.md)에서 다룬다.

## 검증

| 명령 | 확인하는 범위 |
| --- | --- |
| `make test` | 43개 API의 선택된 정상·경계 입력, libc 또는 독립 reference와의 결과 비교 |
| `make failure-test` | 지정한 순번의 `malloc` 실패, rollback, 누수와 잘못된 해제 계측 |
| `make write-failure-test` | 짧은 `write`, `EINTR`, 0 반환, `EIO`·`EPIPE`, 오류 뒤 호출 중단 |
| `make asan` | ASan 전용 객체와 일반 기능 테스트 |
| `make ubsan` / `make sanitize` | UBSan 전용 객체와 일반 기능 테스트 |
| `make leak` | 설치된 `leaks` 또는 `valgrind`를 이용한 일반 테스트 누수 검사 |
| `make check-archive` | 17개 archive member, 43개 공개 심볼, 허용된 외부 의존성, 외부 소비자 링크 |
| `make check-compilers` | Clang과 GNU GCC 각각으로 build·test·failure test·archive 검사 |
| `make check` | 공백 검사부터 clean build, 기능·실패·UBSan·archive·compiler·leak 검사를 순서대로 실행 |

### 전체 검사 전 확인할 점

- `make check`는 `git`, `nm`과 일반적인 POSIX shell 도구를 추가로 사용한다.
- `make check-compilers`는 Clang과 GNU GCC가 모두 없으면 실패한다.
- `make leak`은 macOS의 `leaks` 또는 `valgrind`가 없으면 실패한다.
- `make check-archive`의 심볼 처리는 Darwin과 Linux만 지원한다.
- `make sanitize`는 UBSan을 실행한다. ASan은 `make asan`으로 별도 실행해야 한다.
- ASan 기본 설정은 `detect_leaks=0`이므로 `make leak`을 대신하지 않는다.
- `make check`에는 ASan이 포함되지 않는다.

각 검사가 증명하는 범위와 남는 한계는 [검증 지도](docs/verification.md)에 정리되어 있다.

## 프로젝트 구조

```text
.
├── libft.h                    # 공개 타입과 43개 함수 선언
├── Makefile                   # library·test·failure injection·release 검사
├── src/
│   ├── alloc/                 # 할당과 복제
│   ├── char/                  # ASCII 판별과 변환
│   ├── convert/               # 정수 해석과 문자열 변환
│   ├── io/                    # POSIX fd 출력
│   ├── list/                  # 단일 연결 리스트와 callback 수명
│   ├── memory/                # 바이트 채우기·복사·이동·검색
│   └── string/                # 문자열 경계·검색·생성·분리·변환
├── tests/
│   ├── failure/               # 할당·write 실패 시나리오
│   ├── smoke/                 # 저장소 밖 소비자 링크 예제
│   └── support/               # 결정적 실패 주입 도구
├── architecture/              # 공개 경계, 소유권, 실패 경로
├── docs/                      # API 계약과 검증 범위
└── devlog/                    # 구현 단계와 검증 형성 과정
```

## 문서 읽기 순서

| 목적 | 문서 |
| --- | --- |
| 함수별 입력·반환·실패 계약 확인 | [API 계약](docs/api-contracts.md) |
| header, 번역 단위, archive, consumer link 이해 | [공개 API와 정적 라이브러리](architecture/public-api-and-static-library.md) |
| 빌린 주소, 새 할당, callback, rollback 이해 | [소유권과 실패 경로](architecture/ownership-and-failure-paths.md) |
| 테스트별 증명 범위와 비보장 확인 | [검증 지도](docs/verification.md) |
| 구현과 검증이 형성된 순서 확인 | [개발 기록](devlog/README.md) |

구현이 형성된 순서는 다음 개발 기록에서 이어진다.

1. [공개 경계와 첫 정적 라이브러리](devlog/00-public-boundary-and-first-library.md)
2. [바이트·문자열과 경계](devlog/01-bytes-strings-and-bounds.md)
3. [할당과 rollback](devlog/02-allocation-and-rollback.md)
4. [callback과 리스트 수명](devlog/03-callback-and-list-lifecycle.md)
5. [descriptor 출력](devlog/04-descriptor-output.md)
6. [release 검증](devlog/05-release-verification.md)

## 제한 사항

- libc 전체를 대체하지 않으며 현재 공개 범위는 43개 함수로 고정되어 있다.
- 문자 판별과 변환은 ASCII 기준이며 locale과 Unicode를 지원하지 않는다.
- `strlcpy`, `strlcat`, `strnstr` 계열 동작과 fd 출력은 각각 BSD·POSIX 경계를 포함하므로 순수 ISO C만으로 모든 기능을 설명할 수 없다.
- 0길이 호출에서 구현이 포인터를 역참조하지 않는 일부 사례를 일반적인 `NULL` 허용 계약으로 확대할 수 없다.
- fd 출력 함수는 `void`이므로 부분 출력이나 최종 오류를 반환값으로 확인할 수 없고, `SIGPIPE` 정책도 변경하지 않는다.
- 리스트 함수는 cycle 감지, 이미 연결된 노드의 재삽입 검증, 공유 `content`의 reference count를 제공하지 않는다.
- `ft_lstmap`은 callback의 `NULL` 반환도 유효한 `content`로 연결하므로 callback 실패를 `NULL` 하나로 표현할 수 없다.
- `ft_lstadd_back`은 tail을 보관하지 않아 호출마다 O(n)이며 반복 append는 O(n²)가 될 수 있다.
- 문자열 callback 인덱스가 `unsigned int`이므로 `UINT_MAX`보다 긴 문자열의 정확한 인덱스를 표현하지 못한다.
- 테스트는 선택된 입력과 현재 host의 실행 경로를 검증한다. 32비트, big-endian, Windows ABI, 모든 allocator·kernel 동작을 보장하지 않는다.

## 라이선스

현재 저장소에는 별도 라이선스가 명시되어 있지 않다.
