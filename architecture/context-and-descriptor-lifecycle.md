# 컨텍스트와 descriptor lifecycle

이 문서는 현재 `get_next_line.c`의 상태 전이, 불변식, 소유권과 비용을 한 장에서
연결한다. 코드 조각은 별도 표시가 없으면 **현재 코드의 구조를 요약한 설명용
표기**다.

## 진입점부터 결과까지

`blr_reader_create(fd)`는 fd를 POSIX 0바이트 `read`로 probe하고 heap에 빈
컨텍스트를 만든다. `blr_reader_next`의 한 호출은 다음 순서로 진행한다.

```text
line != NULL이면 *line = NULL
  → 0-byte fd probe
  → 저장된 [scan, end)에서 '\n' 검색
  → 찾으면 별도 line 할당·복사
  → EOF가 이미 확인됐다면 tail line 또는 BLR_EOF
  → reserve(기존 공간 / 압축 / 성장)
  → read(BUFFER_SIZE)
      > 0: end 이동, NUL 기록, 새 구간 검색
      = 0: EOF 기록, tail line 또는 BLR_EOF
      < 0: EAGAIN이면 BLR_AGAIN, 그 밖은 BLR_ERROR
```

`read_retrying`은 `-1/EINTR`만 같은 요청으로 반복한다. 양의 반환은 요청보다
짧아도 정상 진행이고, 0은 현재까지의 EOF, 다른 음수는 현재 호출의 오류다.
0바이트 probe는 POSIX `read`를 이용해 데이터를 소비하지 않으면서 일부 잘못된
fd 상태를 발견하는 제한된 검사일 뿐, 다음 실제 `read`의 성공이나 readiness를
보장하지 않는다. `blr_reader_next`는 저장된 line을 반환하기 전에도 이 probe를
하므로 fd가 이미 닫혔다면 buffer가 남아 있어도 `BLR_ERROR`다.

## 버퍼 창과 불변식

현재 컨텍스트는 다음 상태를 가진다.

```c
/* 현재 코드 */
struct s_blr_reader
{
    int          fd;
    char        *bytes;
    size_t       begin;
    size_t       scan;
    size_t       end;
    size_t       capacity;
    int          reached_eof;
    t_blr_reader *next;
};
```

할당된 버퍼에서는 다음 불변식을 유지한다.

```text
0 <= begin <= scan <= end < capacity
bytes[end] == '\0'

bytes
[소비됨 | 미반환·검색 완료 | 미반환·미검색 | 빈 용량]
         ^begin            ^scan          ^end       ^capacity
```

빈 컨텍스트와 reset 직후에는 `bytes == NULL`, `capacity == 0`이고 세 index가 모두
0이다. `begin`은 다음 반환 대상의 시작, `scan`은 다음 개행 검색 위치, `end`는
읽어 둔 byte의 다음 위치다. 종단 NUL은 내부 안전 표지이지 입력 길이의 근거가
아니다. 실제 unread 길이는 `end - begin`으로 계산한다.

`find_line_end`는 `scan`을 전진시켜 이미 확인한 byte를 다시 보지 않는다.
`extract_line`은 새 문자열 할당과 복사가 성공한 뒤에만 `begin`을 옮긴다. 할당이
실패하면 `scan = begin`으로 되돌려 같은 line을 보존하므로 다음 시도는 그 구간을
다시 검색한다. 따라서 정상 진행의 개행 검색은 입력 크기에 선형이지만, line
할당 실패 후 재시도까지 포함한 무조건적인 단일 검색 보장은 아니다.

## reserve, 압축과 성장

새 byte와 NUL을 둘 공간이 있으면 `end` 뒤를 그대로 사용한다. 앞쪽에 소비된
공간이 있고 unread byte를 당기면 기존 capacity로 충분한 경우에는
`[begin, end)`를 buffer 앞으로 압축한다. source보다 destination이 항상 앞이므로
현재의 앞방향 `copy_bytes`가 이 제한된 겹침에는 안전하다.

그래도 부족하면 필요한 크기 이상이 될 때까지 capacity를 두 배로 늘리고 새
buffer를 할당한다. `length + appended + 1`과 배수 성장은 `size_t` 범위를 먼저
검사한다. 새 할당과 copy가 끝나기 전에 기존 buffer를 해제하지 않으므로 실패해도
기존 상태가 남는다.

이 구조의 비용은 다음과 같다.

- `extract_line`은 `begin`만 옮기고 capacity를 줄이지 않는다. 따라서 한
  컨텍스트의 지속 buffer 공간은 현재 unread byte 수보다 그 수명 중 도달한
  high-water capacity에 좌우되며 reset 또는 destroy까지 유지된다.
- 성장 순간에는 old buffer와 new buffer가 잠시 함께 존재한다.
- 반환 line은 내부 buffer와 별도 할당이다. 긴 마지막 line을 추출하는 순간에는
  내부 buffer와 거의 같은 크기의 반환 문자열이 함께 살아 peak memory가 커진다.
- 여러 입력이 미완료라면 총 지속 공간은 모든 활성 컨텍스트가 유지하는
  high-water buffer capacity의 합이다.

## explicit context와 legacy 전역 목록

`blr_reader_create`가 만든 컨텍스트와 그 buffer는 heap 객체이며 호출자가
`blr_reader_destroy`로 정리한다. fd는 빌린 자원이라 destroy와 reset이 닫지
않는다. reset은 buffer와 EOF 표지만 버리고 현재 kernel file offset은 그대로
둔다.

`get_next_line`도 같은 heap 컨텍스트를 사용하지만 그 주소를 file-scope static
포인터 `g_readers`가 가리키는 연결 리스트에 숨긴다.

```text
static g_readers
  └─ heap reader(fd A) ─→ heap reader(fd B) ─→ ...
       └─ heap bytes          └─ heap bytes
```

호출마다 fd 번호를 선형 탐색하므로 lookup은 활성 legacy fd 수에 O(n)이다.
서로 다른 fd를 번갈아 호출해도 각 node의 buffer는 분리되지만 목록 자체는 전역
공유 변경 상태다.

legacy wrapper는 `BLR_LINE`과 `BLR_AGAIN`에서 node를 유지한다. `BLR_ERROR`와
`BLR_EOF`에서만 제거한다. 마지막 비개행 line을 반환한 시점에는 EOF를 이미
알더라도 node가 남아 다음 `get_next_line(fd)` 호출이 필요하다. 호출자가 그
마지막 line에서 중단하면 내부 buffer와 컨텍스트에 접근해 해제할 방법이 없는
hidden context가 process 종료까지 남을 수 있다. 중간 취소 가능성이 있으면
explicit API가 필요하다.

## fd 번호, open file description과 위치

fd 번호는 프로세스의 handle일 뿐 입력의 영구 식별자가 아니다.

- `dup` 계열의 서로 다른 fd는 같은 open file description과 offset을 공유한다.
  별도 컨텍스트 둘이 선행 읽기하면 한쪽 내부 buffer를 다른 쪽이 알 수 없다.
- fd를 닫고 같은 번호로 새 파일을 열면 숫자는 같지만 입력은 바뀐다. 오래된
  컨텍스트를 재사용하면 이전 buffer와 새 입력이 섞인다.
- 한 번의 `read`가 현재 line 뒤까지 가져갈 수 있어 kernel offset은 내부
  `begin`보다 앞서 있다. 외부 `lseek` 뒤 내부 buffer를 유지하면 서로 다른
  위치의 byte가 이어진다.

라이브러리는 alias나 fd 재사용을 자동 감지하지 않는다. 같은 open file
description에는 컨텍스트 하나를 두고, fd 수명이 끝나기 전에 destroy한다.
외부 `lseek` 뒤에는 명시적 handle로 `blr_reader_reset`도 수행한다. legacy
`get_next_line`에는 reset할 handle이 없으므로 `lseek + reset` 절차를 적용할 수
없다.

## 종료 상태와 thread 경계

`reached_eof`는 실제 `read`가 0을 반환한 뒤에만 설정된다. unread byte가 남으면
그 byte를 마지막 `BLR_LINE`으로 먼저 반환하고, 그 다음 호출부터 `BLR_EOF`를
반복한다. 빈 입력은 바로 `BLR_EOF`이며 길이 0인 line을 만들지 않는다.

독립 explicit context는 서로 공유하는 reader 상태가 없어 각각 다른 스레드에서
사용할 수 있다. 그러나 같은 context의 index와 buffer에는 lock이 없고,
`g_readers`의 탐색·삽입·삭제도 동기화되지 않는다. 같은 context 또는 legacy
API의 동시 호출은 지원 범위가 아니다.

입력 byte에 NUL이 있어도 `end` 기반 내부 상태는 그 뒤 byte를 보관하고 개행을
찾을 수 있다. 그러나 공개 결과에는 길이가 없고 NUL 종료 `char *`만 반환하므로
호출자는 첫 embedded NUL 뒤를 정상적인 C 문자열 내용으로 다룰 수 없다. 이 API는
binary record reader가 아니다.
