# API 계약

이 문서는 현재 `get_next_line.h`와 `get_next_line.c`에서 확인되는 공개 계약을
정리한다. 포인터·NUL 문자열과 일반적인 새 할당 소유권은
[`c-foundation-fix`의 API 계약](https://github.com/woopinbell/c-foundation-fix/blob/main/docs/api-contracts.md)을
전제로 하고, 여기서는 호출 사이에 남는 reader 상태를 중심으로 설명한다.

## 언어와 운영체제 경계

제품은 `-std=c99`로 컴파일되지만 fd 기반 I/O는 ISO C가 아니라 POSIX 경계다.
`read`의 반환형 `ssize_t`, 파일 디스크립터, `dup`가 공유하는 open file
description, `lseek`, `EINTR`, `EAGAIN`과 `EWOULDBLOCK`을 전제로 한다. 공개
header에는 `ssize_t`가 노출되지 않지만 구현과 동작 계약에는 POSIX 환경이
필요하다.

## 공개 타입

```c
typedef struct s_blr_reader t_blr_reader;
```

구현이 감춰진 heap 컨텍스트다. 성공한 `blr_reader_create` 결과는 호출자가
소유하며 `blr_reader_destroy`로 정확히 한 번 폐기한다.

```c
typedef enum e_blr_result
{
    BLR_ERROR = -1,
    BLR_EOF = 0,
    BLR_LINE = 1,
    BLR_AGAIN = 2
} t_blr_result;
```

아래 `*line` 열은 호출자가 non-NULL 출력 인자를 전달한 경우다. `line == NULL`인
호출은 `BLR_ERROR`지만 기록할 출력 객체 자체가 없다.

| 결과 | 현재 상태 | `*line` (`line != NULL`) | 다음 선택 |
| --- | --- | --- | --- |
| `BLR_LINE` | 개행까지 포함한 line 또는 EOF 앞 tail을 반환 | 새 할당 | 사용 후 `free`, 계속 호출 가능 |
| `BLR_EOF` | EOF를 확인했고 미반환 byte가 없음 | `NULL` | 반복 호출, reset 또는 destroy |
| `BLR_AGAIN` | 비차단 fd에 현재 읽을 byte가 없음 | `NULL` | readiness 뒤 같은 context로 재호출 |
| `BLR_ERROR` | 인자, fd probe, `read`, 크기 계산 또는 할당 실패 | `NULL` | 원인을 고쳐 재호출하거나 reset/destroy |

`BLR_ERROR` 하나로 잘못된 인자, I/O 오류와 할당 실패를 구분하지 않는다.
`errno`는 정식 결과 계약이 아니다. 할당·크기 실패에서는 의미 있는 I/O errno가
설정된다는 보장도 없다.

## `blr_reader_create`

```c
t_blr_reader *blr_reader_create(int fd);
```

- `fd < 0`이거나 POSIX 0바이트 `read` probe가 실패하거나 context 할당이
  실패하면 `NULL`이다.
- 성공하면 비어 있는 새 context를 반환한다. fd는 빌리며 소유하거나 닫지 않는다.
- 이 POSIX probe는 데이터를 소비하거나 offset을 이동하지 않는다. 일부 현재
  오류를 발견하는 제한된 검사일 뿐 미래의 실제 읽기 성공, EOF 여부 또는
  readiness를 보장하지 않는다.
- 같은 open file description을 공유하는 다른 context가 없어야 한다. context
  수명 중 fd 번호를 다른 입력에 재사용하지 않아야 한다.

## `blr_reader_next`

```c
t_blr_result blr_reader_next(t_blr_reader *reader, char **line);
```

- `line != NULL`이면 진입 즉시 `*line = NULL`로 만든다.
- `reader == NULL` 또는 `line == NULL`이면 `BLR_ERROR`다.
- 성공한 양의 `read`는 짧을 수 있으며, 구현은 line 또는 terminal 상태를 찾을
  때까지 다음 읽기를 계속한다.
- `read == 0`은 EOF다. unread byte가 있으면 먼저 `BLR_LINE`, 없으면
  `BLR_EOF`다.
- `read == -1/EINTR`는 같은 요청을 반복한다. `EAGAIN` 또는 `EWOULDBLOCK`은
  `BLR_AGAIN`, 다른 음수 결과는 `BLR_ERROR`다.
- `BLR_AGAIN`과 `BLR_ERROR`에서도 이미 읽은 내부 byte와 EOF 상태를 보존한다.
  line 추출 할당 실패도 대상 line을 소비하지 않는다.
- `BLR_LINE`의 `*line`은 내부 buffer와 독립된 NUL 종료 새 할당이다. 다음 호출,
  reset, destroy가 이 문자열을 바꾸거나 해제하지 않는다.

line은 입력에 개행이 있었다면 `'\n'`까지 포함한다. 빈 파일은 `BLR_EOF`이고,
`"\n"` 입력은 길이 1의 line이며, EOF 전 마지막 비개행 byte도 한 line이다.
line 길이는 `BUFFER_SIZE`와 무관하다.

매 호출의 0바이트 probe는 저장된 byte 검색보다 먼저다. context 생성 후 fd가
닫히면 저장 byte가 있더라도 `BLR_ERROR`를 반환한다.

## `blr_reader_reset`

```c
void blr_reader_reset(t_blr_reader *reader);
```

`NULL`은 아무 일도 하지 않는다. 그 밖에는 내부 buffer, index와 EOF 상태를
버린다. context와 fd는 유지하며 fd를 닫거나 offset을 바꾸지 않는다.

외부에서 `lseek`로 위치를 바꾼 뒤 이 context를 계속 쓸 때 reset이 필요하다.
두 작업 모두 성공한 다음에만 새 위치의 읽기로 간주할 수 있다. unread byte를
버리므로 reset은 데이터 보존 연산이 아니다.

## `blr_reader_destroy`

```c
void blr_reader_destroy(t_blr_reader *reader);
```

`NULL`은 아무 일도 하지 않는다. 내부 buffer와 context를 해제하지만 fd는 닫지
않는다. destroy 뒤 포인터는 무효이며 다시 넘기면 안 된다. 이미 반환된 line의
소유권은 호출자에게 있어 destroy와 독립적이다.

## `get_next_line`

```c
char *get_next_line(int fd);
```

fd 번호로 file-scope 전역 목록을 찾아 내부 context를 생성·재사용하는 legacy
wrapper다.

- line이면 호출자가 `free`할 새 문자열을 반환한다.
- EOF, 일반 오류, 잘못된 fd와 `BLR_AGAIN`은 모두 `NULL`이다.
- `BLR_AGAIN`에서는 누적 상태를 유지한다.
- EOF와 `BLR_ERROR`에서는 해당 fd의 context와 buffer를 폐기한다. explicit
  API와 달리 일반 오류 뒤 누적 상태를 재시도할 수 없다.
- `BLR_LINE` 뒤에는 context를 유지하므로 마지막 line에서 호출을 중단하면 숨은
  context를 직접 정리할 수 없다.
- 목록 탐색·변경에는 lock이 없어 병렬 호출을 지원하지 않는다.

## `BUFFER_SIZE`와 입력 표현

`BUFFER_SIZE`는 한 실제 `read`의 최대 요청 크기이며 line의 최대 길이가 아니다.
헤더는 값이 0 이하이면 전처리 오류를 낸다. Makefile의
`-DBUFFER_SIZE=<value>`로 `get_next_line.c`를 컴파일한 값이 archive 동작에
고정된다.

내부 상태는 byte 수를 별도로 추적하지만 공개 line에는 길이가 없다. embedded
NUL 뒤의 byte를 포함해 할당될 수 있어도 일반 C 문자열 API는 첫 NUL에서 끝으로
본다. binary-safe 결과 계약은 제공하지 않는다.

## thread와 descriptor 전제

- 서로 독립된 fd와 explicit context를 각 스레드가 단독 소유하는 사용만 지원한다.
- 같은 context의 동시 호출, reset/destroy와 next의 경쟁은 지원하지 않는다.
- legacy `get_next_line`은 전역 목록 때문에 독립 fd라도 병렬 API가 아니다.
- `dup` alias를 자동 판별하지 않으며 fd 번호 재사용도 감지하지 않는다.
