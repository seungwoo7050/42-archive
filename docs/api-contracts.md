# API 계약

이 문서는 현재 `libft.h`를 기준으로 한다. 아래의 “유효”는 함수가 읽거나 쓰는
전체 범위가 해당 객체 안에 있고, 문자열이면 필요한 지점까지 NUL로 끝난다는
뜻이다. 구현이 특정 0길이 호출에서 포인터를 역참조하지 않는 사실은 테스트할 수
있는 구현 특성이지 모든 `NULL` 조합을 허용하는 공개 계약은 아니다.

## 공개 타입

```c
typedef struct s_list
{
    void          *content;
    struct s_list *next;
} t_list;
```

`t_list`는 `content`의 타입과 수명을 알지 못한다. 노드와 내용은 별도 자원이다.
acyclic이며 `next == NULL`로 끝나는 단일 연결 구조를 호출자가 유지해야 한다. 순환 목록이나 이미
연결된 노드의 재삽입은 탐색 무한 반복, 기존 연결 유실 또는 cycle을 만들 수 있다.

## 문자 함수 7개

| 함수 | 입력과 반환 | 표준·한계 |
| --- | --- | --- |
| `ft_isalpha` | ASCII 영문자면 1, 아니면 0 | ISO C `isalpha`와 같은 목적이나 locale을 읽지 않는다 |
| `ft_isdigit` | ASCII 숫자면 1, 아니면 0 | 범위 밖 값도 원값이 아니라 0을 반환한다 |
| `ft_isalnum` | 두 판별 결과의 OR | locale·Unicode를 지원하지 않는다 |
| `ft_isascii` | 0..127이면 1 | ISO C가 아니라 널리 쓰이는 확장 계열이다 |
| `ft_isprint` | ASCII 32..126이면 1 | locale을 읽지 않는다 |
| `ft_toupper` | ASCII 소문자를 대문자로, 그 밖은 원값으로 반환 | 원값 반환 규칙은 판별 함수가 아니라 변환 함수에 해당한다 |
| `ft_tolower` | ASCII 대문자를 소문자로, 그 밖은 원값으로 반환 | 위와 같다 |

## 바이트 함수 6개

| 함수 | 유효 범위·겹침 | 반환 |
| --- | --- | --- |
| `ft_memset(memory, byte, length)` | `memory[0..length)` 쓰기 가능 | `memory` |
| `ft_bzero(memory, length)` | 같은 범위를 0으로 채운다 | 없음 |
| `ft_memcpy(destination, source, length)` | 두 범위가 유효하고 겹치지 않아야 한다 | `destination` |
| `ft_memmove(destination, source, length)` | 두 범위가 겹쳐도 된다 | `destination` |
| `ft_memchr(memory, byte, length)` | 읽기 가능한 바이트 범위 | 첫 일치 위치를 빌려 주거나 `NULL` |
| `ft_memcmp(left, right, length)` | 두 읽기 범위 | 첫 다른 `unsigned char`의 차이, 같으면 0 |

현재 구현은 위 함수들이 길이 0일 때 반복문에서 주소를 역참조하지 않으며 테스트도
일부 `NULL, 0` 조합을 고정한다. 그러나 0이 아닌 길이에는 반드시 유효한 범위가
필요하고, 길이 0의 우연한 동작을 일반적인 `NULL` 허용 계약으로 확대하지 않는다.
`ft_memmove`는 목적지가 원본의 뒤쪽에 겹치는지 최대 `length - 1`개의 주소를
선형 탐색한 뒤 복사하므로 일반적인 방향 판정보다 상수 비용이 크지만 전체 시간은
여전히 O(`length`)다.

## 문자열 조회·해석·복제 함수 9개

| 함수 | 입력·반환 | 주의점 |
| --- | --- | --- |
| `ft_strlen` | 유효한 NUL 문자열의 길이 | NUL이 없으면 범위를 넘는다 |
| `ft_strlcpy` | 원본 길이를 반환하고 용량이 있으면 NUL 종료 복사 | BSD 계열 API이며 destination 용량이 실제 객체 이하여야 한다 |
| `ft_strlcat` | 시도한 전체 길이를 반환 | 목적지에서 `capacity` 안에 NUL을 못 찾으면 쓰지 않는다 |
| `ft_strchr` | 문자의 첫 위치를 빌려 준다 | `character`는 `unsigned char`로 축소되며 NUL도 찾는다 |
| `ft_strrchr` | 문자의 마지막 위치를 빌려 준다 | 위와 같다 |
| `ft_strncmp` | 최대 `length`에서 부호 비교 | 바이트를 `unsigned char`로 비교한다 |
| `ft_strnstr` | 최대 `length` 안의 첫 부분 문자열을 빌려 준다 | BSD 계열 API이며 빈 needle은 haystack 시작을 반환한다 |
| `ft_atoi` | 공백·선택 부호·십진 숫자를 읽어 `int` 반환 | ISO C `atoi`와 달리 범위 초과를 `INT_MIN`/`INT_MAX`로 고정하지만 오류 상태는 없다 |
| `ft_strdup` | 원본 복사본을 새로 할당 | POSIX 이름의 함수에 해당하며 호출자가 `free`한다 |

문자열 복사·검색의 입력 영역은 서로 겹치지 않는 정상 문자열 사용을 전제로 한다.
`size_t` 반환의 덧셈이 표현 범위를 넘을 만큼 큰 가상 객체는 이 API가 의미 있게
다루지 못한다.

## 생성·변환 함수 8개

| 함수 | 성공 결과와 소유권 | 실패·특수 결과 |
| --- | --- | --- |
| `ft_calloc(count, size)` | 곱한 크기의 0 초기화 블록, 0바이트 요청도 해제 가능한 1바이트 블록 | 곱셈 오버플로·할당 실패면 `NULL` |
| `ft_substr(text, start, length)` | 새 NUL 문자열 | 입력 `NULL`·할당 실패면 `NULL`, 범위 밖 start는 새 빈 문자열 |
| `ft_strjoin(left, right)` | 두 문자열의 새 결합본 | 입력 `NULL`, 크기 덧셈 오버플로, 할당 실패면 `NULL` |
| `ft_strtrim(text, set)` | 양끝 set 문자를 제거한 새 문자열 | 필수 입력·할당 실패면 `NULL` |
| `ft_split(text, delimiter)` | 각 field와 NULL 종료 포인터 배열이 모두 새 할당 | 입력·할당 실패면 `NULL`; 부분 실패는 전부 rollback |
| `ft_itoa(number)` | 부호 포함 새 십진 문자열 | 할당 실패면 `NULL`; `INT_MIN`도 정의된 결과 |
| `ft_strmapi(text, function)` | 콜백 결과로 만든 새 문자열 | 입력·콜백·할당 실패면 `NULL` |
| `ft_striteri(text, function)` | 원본을 제자리 변경, 반환 없음 | 입력·콜백이 `NULL`이면 no-op |

`ft_split` 호출자는 `fields[i]` 각각과 마지막에 `fields`를 해제한다. 라이브러리는
부분 실패 때 이미 완성된 field를 역순으로 해제한 뒤 배열을 해제한다.

`ft_strmapi`와 `ft_striteri`는 내부 진행에 `size_t`를 사용하고 callback에는
`unsigned int`로 변환한 인덱스를 전달한다. 내부 순회는 전체 길이를 따라
종료하지만 `UINT_MAX`를 넘는 위치의 callback index는 낮은 값부터 반복되므로 이
인터페이스가 정확한 큰 인덱스를 표현하지 못한다. `ft_striteri`는
호출 전에 구한 최초 길이만큼 계속 호출한다. 콜백이 앞 문자에 NUL을 써도 남은
최초 범위의 문자 주소를 계속 전달하지만, 원래 객체 범위 자체를 무효화하거나
해제해서는 안 된다.

## fd 출력 함수 4개

네 함수는 모두 호출 시점에 쓰기 가능한 열린 `fd`를 전제로 한다. 문자열을 받는
함수는 읽을 수 있고 NUL로 끝나는 `text`가 필요하다.

| 함수 | 논리적 출력 | 실패 계약 |
| --- | --- | --- |
| `ft_putchar_fd` | 한 문자 | `void`; 최종 실패를 전달하지 못한다 |
| `ft_putstr_fd` | NUL 문자열 | `text`는 유효해야 한다 |
| `ft_putendl_fd` | 유효한 NUL 문자열 뒤 개행 | 본문이 실패하면 개행을 쓰지 않는다 |
| `ft_putnbr_fd` | `int`의 십진 표현 | `INT_MIN`을 처리하며 첫 영구 오류에서 멈춘다 |

이 구현은 POSIX `write`를 사용한다. 짧은 양수 반환은 남은 범위를 이어 쓰고
`EINTR`는 재시도하며, 0은 `errno = EIO`, 그 밖의 음수는 중단한다. `errno`는
보조 관찰값일 뿐 공개 반환 계약이 아니다. 라이브러리는 `SIGPIPE` disposition을
바꾸지 않으므로 닫힌 파이프에서 기본 정책이면 함수가 돌아오기 전에 프로세스가
끝날 수 있다. 호출자가 signal을 무시하거나 복귀하는 handler로 처리하면
`EPIPE`를 관찰할 수 있다. 차단한 경우에도 `EPIPE`를 먼저 볼 수 있지만
`SIGPIPE`는 pending으로 남아 차단 해제 뒤 전달될 수 있다. 비블로킹 `EAGAIN`
대기, 동시 호출의 메시지 원자성도 보장하지 않는다.

## 리스트 함수 9개

| 함수 | 상태 변화·반환 | 소유권과 실패 |
| --- | --- | --- |
| `ft_lstnew(content)` | `next = NULL`인 새 노드 | 노드 할당 실패면 `NULL`; content 소유권 정책은 호출자가 정한다 |
| `ft_lstadd_front(&list, node)` | node를 새 head로 연결 | `list`나 node가 `NULL`이면 no-op |
| `ft_lstsize(list)` | 노드 수를 `int`로 반환 | cycle을 감지하지 않으며 `INT_MAX`를 넘는 순회는 signed overflow를 일으킬 수 있다 |
| `ft_lstlast(list)` | 마지막 기존 노드를 빌려 준다 | 빈 목록은 `NULL`, cycle이면 종료하지 않는다 |
| `ft_lstadd_back(&list, node)` | 마지막 노드 뒤에 연결 | tail pointer가 없어 매 호출 O(n); 이미 연결된 node 재삽입은 계약 밖이다 |
| `ft_lstdelone(node, del)` | `del(content)` 뒤 노드 해제 | 둘 중 하나가 `NULL`이면 no-op; 다음 노드는 건드리지 않는다 |
| `ft_lstclear(&list, del)` | head부터 `del(content)`, `free(node)` 순으로 전진해 끝에서 head를 `NULL`로 만든다 | list 주소나 `del`이 `NULL`이면 no-op; 역순 정리가 아니며 cycle은 지원하지 않는다 |
| `ft_lstiter(list, function)` | 현재 순서로 content callback 호출 | 빈 목록이나 `NULL` callback은 no-op; callback이 연결 수명을 파괴하면 안 된다 |
| `ft_lstmap(list, function, del)` | 새 content와 새 노드 목록 | callback이 없거나 `del`이 없으면 `NULL`; 빈 원본도 빈 결과 `NULL`; 노드 실패 시 방금 content와 앞선 결과를 `del`한다 |

`ft_lstmap`의 `function`이 `NULL`을 반환해도 현재 구현은 `content == NULL`인
노드를 만든다. 따라서 callback 실패를 `NULL` 하나로 표현할 수 없다. 새 결과가
원본 content를 공유한다면 두 목록에서 같은 `del`을 적용해 이중 해제하지 않도록
호출자가 별도 수명 정책을 세워야 한다. `del`은 callback이 만들 수 있는 모든
결과에 적용 가능해야 하며, 여기에는 `NULL` content도 포함될 수 있다.

## 언어·플랫폼 경계

메모리·문자열의 핵심 계약과 정적 라이브러리 자체는 ISO C 관점에서 설명한다.
`strlcpy`, `strlcat`, `strnstr`는 BSD 계열 인터페이스의 동작을 이식해 구현한
것이고, `strdup`은 POSIX 이름과 대응한다. `<errno.h>`와 `errno` macro 자체는
ISO C에도 속한다. 실제 외부 효과인 `write`, 그 반환형 `ssize_t`, 그리고
`EINTR`·`EIO`·`EPIPE`·`SIGPIPE`의 system-call 의미는 POSIX 경계다. 이 구분은
이름이 익숙하다는 이유로 모든 C 구현에서 같은 선언과 동작을 기대하지 않게 한다.
