# 공개 API와 정적 라이브러리

## 소비자가 보는 경계

소비자는 `libft.h`를 전처리해 43개 함수 원형과 `t_list` 정의를 얻고,
`libft.a`를 링크한다. `src` 배치와 파일 안의 `static` 보조 함수는 공개 계약이
아니다. 반대로 `t_list`의 필드 순서와 타입은 헤더에 드러나므로 호출자가 직접
접근하는 source·ABI 경계다.

```text
consumer.c
   │ #include "libft.h"
   ▼
전처리된 소비자 번역 단위 ── compile ── consumer.o
                                           │
17개 src/*.c ── 각자 전처리·compile ── 17개 .o
                                           │ ar rcs
                                           ▼
                                        libft.a
                                           │ link
                                           ▼
                                        executable
```

헤더 guard는 같은 번역 단위에서 중복 포함을 막고 `<stddef.h>`에서 `size_t`와
`NULL`을 얻는다. 헤더를 포함했다고 구현 코드가 복사되는 것은 아니다. 각 `.c`는
헤더와 함께 독립적으로 전처리·컴파일되는 번역 단위며, linker가 소비자의 미해결
`ft_*` 심볼에 필요한 archive member를 선택한다.

## 17개 번역 단위

| 번역 단위 | 공개 구현 |
| --- | --- |
| `src/char/ft_char.c` | 문자 7개 |
| `src/memory/ft_memory_fill.c` | `ft_memset`, `ft_bzero` |
| `src/memory/ft_memory_copy.c` | `ft_memcpy` |
| `src/memory/ft_memory_move.c` | `ft_memmove` |
| `src/memory/ft_memory_scan.c` | `ft_memchr`, `ft_memcmp` |
| `src/string/ft_string_bounds.c` | `ft_strlen`, `ft_strlcpy`, `ft_strlcat` |
| `src/string/ft_string_search.c` | 검색·비교 4개 |
| `src/string/ft_string_build.c` | 부분·결합·trim 문자열 3개 |
| `src/string/ft_split.c` | `ft_split` |
| `src/string/ft_string_transform.c` | callback 문자열 2개 |
| `src/convert/ft_atoi.c` | `ft_atoi` |
| `src/convert/ft_itoa.c` | `ft_itoa` |
| `src/alloc/ft_allocate.c` | `ft_calloc`, `ft_strdup` |
| `src/io/ft_fd_output.c` | fd 출력 4개 |
| `src/list/ft_list_basic.c` | 생성·삽입·조회 5개 |
| `src/list/ft_list_lifecycle.c` | 삭제·순회 3개 |
| `src/list/ft_list_map.c` | `ft_lstmap` |

`Makefile`의 `SRC` 순서가 이 목록을 archive에 넣는다. 객체는
`build/obj/src/...`에 놓이고 `-MMD -MP`가 header 의존성 파일을 만든다.
`libft.h` 변경은 관련 객체의 재컴파일 원인이 된다.
`make clean`은 `build`와 테스트 실행 파일을 지우고, `make fclean`은 여기에
`libft.a`까지 더해 지운다. `make re`는 `fclean` 뒤 archive를 다시 만든다.

## compile, archive, link는 다른 단계다

`-std=c99 -Wall -Wextra -Werror -Wpedantic -fno-builtin`은 각 번역 단위를
컴파일할 때 적용된다. `-fno-builtin`은 compiler가 표준·libc 함수 이름을
builtin으로 인식해 특수 처리하거나 다른 코드로 치환하는 최적화를 끈다. 고유한
`ft_*` 이름의 실제 심볼 호출은 이 옵션이 아니라 함수 이름과 최종 링크가
보장한다.

`ar rcs libft.a ...`는 여러 객체를 담고 symbol index를 갱신하지만 executable을
만들지 않는다. archive member가 존재해도 공개 심볼이 없거나, 과거 객체가
남거나, 예상하지 않은 전역 보조 심볼이 노출될 수 있다. 그래서 member와 symbol을
별도로 검사한다. 최종 link에서는 `malloc`, `free`, `write`, `errno` 접근자
같은 외부 의존성이 C/POSIX runtime에서 해결된다.

## 언어와 운영체제 경계

번역 단위, 객체 표현, 포인터, 정적 archive의 기본 설명은 ISO C와 toolchain
관점이다. `ft_strlcpy`, `ft_strlcat`, `ft_strnstr`는 BSD 계열 동작을 재현하며
ISO C 표준 함수는 아니다. `write`, `ssize_t`, `EINTR`, `SIGPIPE`는 POSIX
경계다. `ft_fd_output.c`가 `_POSIX_C_SOURCE 200809L`을 시스템 header보다 먼저
정의하는 이유도 strict C99 compile에서 필요한 POSIX 선언을 요청하기 위해서다.

## 배포 변경의 영향

- 공개 원형을 바꾸면 consumer를 다시 컴파일해야 한다.
- `t_list` layout 변경은 직접 필드 접근과 ABI에 영향을 준다.
- 공개 함수를 추가하면 header, `SRC`, `tests/api-symbols.txt`, 기능 검사를
  함께 갱신해야 한다.
- 구현 파일을 합치거나 나누면 `tests/archive-members.txt`도 달라진다.
- `void` 출력 API에 오류 반환을 추가하는 것은 호환되지 않는 변경이다. 기존
  경계를 유지하려면 별도 API가 필요하다.

현재 43개 함수의 세부 계약은 [API 계약](../docs/api-contracts.md), 산출물 검사의
한계는 [검증 지도](../docs/verification.md)에서 이어진다.
