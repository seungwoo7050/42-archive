# 소유권과 실패 경로

## 포인터 반환은 세 종류다

| 종류 | API | 호출자 책임 |
| --- | --- | --- |
| 입력 안의 빌린 주소 | `ft_memchr`, `ft_strchr`, `ft_strrchr`, `ft_strnstr` | 해제하지 않고 원본 수명보다 오래 보관하지 않는다 |
| 새 단일 할당 | `ft_calloc`, `ft_strdup`, `ft_substr`, `ft_strjoin`, `ft_strtrim`, `ft_itoa`, `ft_strmapi` | 성공 결과를 `free`한다 |
| 여러 할당의 root | `ft_split`, `ft_lstmap` | 각 child의 계약에 맞춰 전체 그래프를 정리한다 |

리스트 조회인 `ft_lstlast`는 기존 노드를 빌려 주고, `ft_lstnew`는 node만 새로
만든다. `content`를 복사하지 않는다. node의 소유권과 content의 소유권을 같은
것으로 취급하면 누수나 이중 해제가 생긴다.

## 크기 계산은 쓰기 전에 끝낸다

`size_t`는 객체 크기와 byte 수를 표현하는 부호 없는 타입이다. 음수가 없다고
오버플로가 사라지는 것은 아니며 최대값 뒤에서 0 근처로 wrap될 수 있다.

- `ft_calloc`은 `count * size` 전에 `size > SIZE_MAX / count`를 검사한다.
- `ft_strjoin`은 `left + right + 1` 전에 덧셈 가능 범위를 검사한다.
- `ft_substr`은 `start + length`를 만들지 않고 남은 길이와 비교한다.
- `ft_itoa`는 `INT_MIN`을 직접 부정하지 않고 부호 없는 magnitude로 옮긴다.

성공한 빈 결과도 소유권이 있다. `ft_calloc(0, n)`은 현재 구현에서 1바이트를
할당하고, 범위 밖 `ft_substr`과 전부 trim된 결과는 새 빈 문자열을 돌려준다.

## `ft_split`의 다중 소유권

성공 결과는 NULL 종료 pointer array 하나와 field 문자열 N개다.

```text
fields ──► [ p0 | p1 | ... | NULL ]
             │    │
             ▼    ▼
           "a\0" "b\0"
```

배열을 먼저 `ft_calloc`으로 만들고 field를 하나씩 완성한다. field 할당이
실패하면 소유권이 배열에 넘어간 앞선 field를 역순으로 `free`한 뒤 배열을
해제하고 `NULL`을 반환한다. 이는 “일부 결과”를 공개하지 않는 transaction형
rollback이다. 입력 문자열은 끝까지 빌릴 뿐 변경하거나 해제하지 않는다.

## callback과 리스트 상태

`ft_strmapi` callback은 값만 반환하며 새 문자열이 그 값을 소유한다.
`ft_striteri` callback은 원본의 문자 주소를 빌린다. 이 함수는 최초 `ft_strlen`
결과를 고정하므로 callback이 앞쪽에 NUL을 넣어도 최초 범위 끝까지 호출한다.
내부 진행 상태는 `size_t`라 전체 길이를 따라 종료하지만 두 API의 callback
index는 `unsigned int`라 매우 큰 문자열의 정확한 위치를 표현하지 못하는 한계가
있다.

리스트에는 다음 불변식이 필요하다.

- 유한한 acyclic chain이어야 한다.
- 삽입할 node의 연결 상태와 소유자를 호출자가 알아야 한다.
- 순회 callback은 현재 node나 다음 연결의 수명을 무효화하지 않아야 한다.
- 삭제 callback `del`은 content를 정리하고 라이브러리는 node를 정리한다.

`ft_lstclear`는 역순 정리가 아니다. 현재 head의 `next`를 저장하고
`del(content) → free(node)`를 수행한 뒤 head를 다음 node로 옮기는 forward
정리다. 마지막에는 호출자의 head가 `NULL`이다.

`ft_lstmap`은 callback 결과를 새 node에 담기 전까지 임시로 소유한다. node 할당이
실패하면 방금 결과에 `del`, 이미 연결된 새 목록에 `ft_lstclear`를 적용한다.
라이브러리의 연결·정리 코드는 원본 node를 변경하거나 원본 content를 직접
해제하지 않는다. 다만 callback은 mutable `void *`를 받으므로 content를
변경·해제하거나 원본 구조의 수명을 간접적으로 무효화할 수도 있다. 그런 외부
효과를 만들지 않는 것과 callback 실행 중 원본 목록을 유효하게 유지하는 것은
호출자 계약이다. callback이 원본 주소를 그대로 반환한다면 두 목록의 content
수명도 호출자가 별도로 조정해야 한다.

## 구조가 만드는 비용과 한계

- `ft_memmove`의 겹침 방향 판별은 source의 뒤쪽 주소를 선형 탐색하고 복사도
  선형이므로 O(n)이다.
- `ft_lstadd_back`은 tail을 저장하지 않아 호출마다 O(n)이다. 빈 목록에서
  N개를 반복 추가하면 O(N²)가 될 수 있다.
- `ft_lstsize`는 `int`를 반환해 `INT_MAX`보다 큰 목록을 표현하지 못한다.
- list API는 cycle 감지, 이미 연결된 node 재삽입 검증, 공유 content reference
  count를 제공하지 않는다.

## 출력은 외부 효과라 rollback할 수 없다

`write_all`은 이미 성공한 바이트를 되돌릴 수 없다. 짧은 쓰기 뒤 남은 구간을
이어 쓰고 `EINTR`는 같은 구간을 재시도하지만, 0 또는 영구 오류에서는 앞부분만
외부에 남을 수 있다. `ft_putendl_fd`는 본문 실패 뒤 개행을 생략하고,
`ft_putnbr_fd`는 실패 뒤 낮은 자리를 쓰지 않아 추가 손상을 제한한다.

공개 함수가 `void`여서 최종 상태를 반환할 통로가 없다. `errno`도 성공 시
정리되는 계약이 아니고 thread-local 보조 상태일 뿐이다. 기본 `SIGPIPE` 정책은
함수 반환 전 프로세스를 끝낼 수 있다. 성공 확인, 재전송 또는 원자적 message가
필요한 호출자는 반환값이 있는 상위 API를 사용해야 한다.

## 실패 주입이 확인하는 것

할당 검사에서 실패하는 것은 `malloc`뿐이다. `free`는 실패가 아니라 누수와
잘못된 해제를 세는 계측점이다. 따라서 검사 결과는 지정한 할당 위치에서
`ft_split`과 `ft_lstmap`의 rollback이 완결되는지를 말한다. 실제 allocator와
callback 외부 자원까지 자동으로 증명하지 않는다.

출력 주입은 짧은 성공·`EINTR`·0·영구 오류의 남은 범위와 중단을 확인한다.
실제 `SIGPIPE` delivery, scheduler, pipe capacity를 재현하지 않는다. 자세한
증명 범위는 [검증 지도](../docs/verification.md)에 있다.
