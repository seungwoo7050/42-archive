# 생성기와 checker 계약

## argv에서 판정까지

두 실행 파일은 같은 파서와 상태 전이를 쓰지만 끝점은 다르다.

```text
argv
  -> C whitespace 기준 토큰화
  -> int 범위·문법 검증
  -> A.values/A.ranks 할당
  -> qsort 복사본으로 중복 검사와 rank 배정
  -> 같은 capacity의 빈 B 할당
     push_swap: tiny 또는 radix -> 상태 변경 -> 명령 stdout
     checker: stdin frame -> 명령 해석 -> 상태 변경 -> A/B 완료 판정
  -> A와 B 정리
```

`push_swap`은 메모리 안의 정렬 결과가 아니라 소비자가 재생할 수 있는 명령열을
제품으로 낸다. `checker`는 stdin이 끝났을 때 A의 rank가 오름차순이고 B가
비어 있어야 `OK`다. 유효한 명령열이 이 조건을 만족하지 못한 `KO`는 실행
오류가 아니라 정상 판정이다.

## 파서 계약과 데이터 모델

`parse_input`은 argv마다 공백, 탭, 개행, carriage return, vertical tab,
form feed를 건너뛴다. 따라서 토큰은 argv 경계를 넘어 합쳐지지는 않지만 여러
argv의 토큰을 순서대로 연결한 것처럼 처리된다. 빈 argv가 다른 숫자 argv와
섞이면 그 argv만 건너뛴다. 숫자 argv가 하나도 없는 `argc == 1`은 빈 입력으로
성공하지만, argv가 있으면서 전체 토큰 수가 0이면 오류다.

각 토큰은 선택적 `+`/`-` 뒤에 한 자리 이상의 ASCII 숫자가 와야 한다. leading
zero는 허용한다. 누적값은 `long long`, 허용 경계는 양수 `INT_MAX`와 음수
크기 `(long long)INT_MAX + 1`로 계산한다. 코드는 `INT_MIN`을 직접 읽지
않으므로 `INT_MIN == -INT_MAX - 1`인 signed 범위와 그 다음 자리를 계산할
만큼 넓은 `long long`을 전제한다. 현재의 “범위 초과를 누적 overflow 전에
거절한다”는 산술 근거와 경계 테스트는 이 전제를 만족하는 32비트 `int`
환경에 맞는다. 이를 고정 32비트 공개 형식이라고 쓰지도, 모든 C99 데이터
모델에서 안전하다고 확대하지도 않는다.

파서는 토큰 수가 `int`와 배열 크기 계산에 들어오는지 확인하고, 복사한 값
배열을 `qsort`한 뒤 인접 중복을 거절한다. 각 원래 값은 정렬 복사본의 lower
bound 위치를 rank로 받는다. 이 시점 이후 `(value, rank)`는 한 원소의 두
표현이다.

## 소유권과 수명

`include/push_swap.h`의 내부 구조는 다음과 같다.

```c
typedef struct s_stack
{
    int *values;
    int *ranks;
    int size;
    int capacity;
} t_stack;
```

| 자원 | 소유자와 수명 | 실패 시 정리 |
| --- | --- | --- |
| `A.values`, `A.ranks` | 각 `main`의 지역 `t_stack a`; 종료 직전까지 | 두 번째 배열, 파싱, rank 할당 실패도 `stack_free(&a)`로 빈 상태 |
| rank용 정렬 복사본 | `assign_ranks` 지역 소유 | 중복·정상·실패 경로에서 `ps_free` |
| `B.values`, `B.ranks` | 각 `main`의 지역 `t_stack b`; A와 같은 capacity | B 초기화 실패 시 먼저 A 정리 |
| checker 명령 버퍼 | `read_next_line`이 매 frame 할당하고 호출자에게 이전 | 적용 직후 또는 오류 경로에서 해제 |
| stdout/stderr와 stdin | 프로세스가 소유하지 않는 외부 descriptor | 이미 읽거나 쓴 바이트는 rollback하지 않음 |

각 스택에서 index 0이 top이고 유효 구간은 `[0, size)`다. `values[i]`와
`ranks[i]`는 항상 같은 논리 원소여야 하며 두 스택을 합친 쌍의 multiset도
보존돼야 한다. capacity는 배열의 할당 크기이고 push는 A와 B 사이에서만
이동하므로 두 스택 모두 최초 입력 크기의 capacity면 충분하다.

## 11개 연산의 상태 전이

| 명령 | 상태 전이 | 작은 스택에서의 의미 |
| --- | --- | --- |
| `sa`, `sb` | 해당 스택의 top 두 원소 교환 | size < 2면 상태 no-op |
| `ss` | A와 B에 swap을 각각 적용 | 한쪽 또는 양쪽이 no-op일 수 있음 |
| `pa` | B top을 A top으로 이동 | B가 비면 no-op |
| `pb` | A top을 B top으로 이동 | A가 비면 no-op |
| `ra`, `rb` | 해당 top을 bottom으로 이동 | size < 2면 no-op |
| `rr` | A와 B에 rotate를 각각 적용 | 한쪽 또는 양쪽이 no-op일 수 있음 |
| `rra`, `rrb` | 해당 bottom을 top으로 이동 | size < 2면 no-op |
| `rrr` | A와 B에 reverse rotate를 각각 적용 | 한쪽 또는 양쪽이 no-op일 수 있음 |

`op_*` wrapper는 상태 전이를 먼저 수행한 뒤 `emit`이 참이면 요청받은 명령
하나를 출력한다. 기본 전이가 no-op이어도 wrapper 호출 자체는 명령을 출력하고,
결합 연산은 두 기본 전이의 효과와 무관하게 결합 명령 한 줄만 출력한다.
`push_swap`은 `emit=1`, checker는 `emit=0`을 쓴다.

출력 실패는 이미 일어난 상태 전이를 되돌리지 않는다. 짧은 쓰기로 명령 prefix가
외부에 보인 뒤 다음 쓰기가 실패할 수도 있다. 따라서 정렬된 메모리 상태는
완전한 명령 스트림의 성공을 뜻하지 않으며, 정렬 함수는 실패를 `main`까지
전파한다.

## checker framing

`read_next_line`은 명령마다 `PS_COMMAND_MAX + 1`, 현재 4바이트를 할당하고
stdin을 한 바이트씩 읽는다.

| 입력 조각 | 결과 |
| --- | --- |
| `sa\n` | `sa` 한 frame |
| EOF 직전 `rra` | 마지막 개행 없이도 `rra` 한 frame |
| 즉시 EOF 또는 frame 뒤 EOF | 정상 스트림 종료 |
| `\n` | 빈 명령이므로 오류 |
| frame 안 NUL | 오류 |
| 개행 제외 4바이트 이상 | 네 번째 바이트를 읽는 순간 오류 |
| 길이 1~3의 미지원 문자열 | 적용 단계에서 오류 |
| `read`의 `EINTR` | 같은 1바이트 읽기 재시도 |
| `EAGAIN`을 포함한 다른 read 오류 | 오류 |

이는 blocking stdin 계약이다. 무개행 무한 스트림을 비동기적으로 다루거나
준비되지 않은 descriptor를 event loop와 조정하지 않는다.

## 출력, 종료, 정리

| 상황 | 판정과 외부 효과 |
| --- | --- |
| `push_swap` 정상 | 명령 0개 이상, status 0 |
| checker 완료 조건 참 | `OK\n`, status 0 |
| checker 완료 조건 거짓 | `KO\n`, status 0 |
| argv·명령·할당·I/O 오류 | 가능한 경우 `Error\n`, status 1 |
| 오류 메시지 쓰기도 실패 | status 1은 유지되지만 `Error\n`은 보장 못 함 |

`ps_write_all`은 `EINTR`와 양수의 짧은 쓰기를 재시도하고, 0바이트나 다른 오류는
실패로 돌려준다. 두 제품은 시작 시 `SIGPIPE`를 프로세스 전체에서 무시해 닫힌
pipe를 `EPIPE` 반환으로 바꾼다. checker의 인자 없는 빠른 경로는 이 설정과
stdin 읽기 전에 곧바로 status 0으로 끝난다.

할당과 I/O 함수는 C의 정수 status로 실패를 전달하며 예외나 장기 rollback은
없다. 호출 경로는 자신이 만든 배열과 명령 버퍼를 정리하지만 libc `qsort`
내부 자원이나 Python interpreter 비용은 프로젝트 allocator 계측 대상이
아니다.

## 공유 구현과 독립 검증의 경계

제품 checker는 생성기와 `src/operations.c`를 공유한다. 이는 두 실행 파일의
명령 의미가 어긋나는 것을 줄이지만 같은 rotate/push 버그를 함께 가질 수 있다.
`tests/run_tests.py`의 Python 리스트 모델은 C 배열 코드를 사용하지 않는 독립
상태 모델로 명령을 재생하고, 같은 스트림을 실제 checker에도 보낸다.

세 층은 서로 대체되지 않는다.

- `tests/operation_invariants.c`: 개별 C 연산의 쌍·원소 보존
- Python 모델: 제품 구현과 다른 표현에서 스트림 의미 확인
- 제품 checker: 실제 parser, frame reader, 공유 연산과 최종 판정 확인

Python은 이 검증 경계에만 있으며 제품 실행 모델, 제품 메모리 비용 또는 제품
오류 traceback을 설명하는 근거가 아니다.
