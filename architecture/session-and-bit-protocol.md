# 세션과 비트 프로토콜

이 문서는 **현재 최종 구현의 제품 코드**를 설명한다. 설명을 단순화한 상태
이름은 코드에 새 공개 API가 있다는 뜻이 아니다.

## 두 운반 수단을 하나의 상태 기계로 묶는다

`include/minitalk.h`는 다음 protocol 요소를 두 실행 파일에 공유한다.

| 요소 | 현재 표현 | 역할 |
| --- | --- | --- |
| 데이터 0/1 | `SIGUSR1` / `SIGUSR2` | 한 번에 한 비트 전달 |
| 예약 요청 | `t_mt_request` | magic, kind, nonce, client PID |
| 응답 | `t_mt_response` | magic, READY/ACK, token, status, server PID |
| session token | 무작위 `nonce` | ACQUIRE와 READY 상관관계 |
| bit token | `uint32_t sequence` | 현재 session 안의 ACK 상관관계 |
| message terminator | NUL 바이트 | 줄바꿈을 확정하고 owner 해제 |

시그널에는 송신자 PID 외에 sequence나 message ID를 실을 수 없다. 반대로 Unix
datagram에는 상관관계 필드를 담을 수 있다. 이 제품은 비트를 시그널로 보내는
연습 범위를 유지하면서, 예약과 확인에 필요한 상태를 datagram으로 보완한다.

## 클라이언트 상태 전이

현재 `src/client.c:main`에서 성공 경로는 다음 순서로만 진행한다.

```text
START
  -> PID_TEXT_VALID
  -> RESPONSE_SOCKET_OWNED
  -> ACQUIRE_SENT
  -> READY_CONFIRMED
  -> BIT_SENT <-> ACK_CONFIRMED  (본문과 NUL의 모든 비트)
  -> MESSAGE_CONFIRMED
  -> CLEANED
```

### 1. PID와 예상 server path를 정한다

`mt_parse_pid`는 빈 문자열·비숫자·`INT_MAX` 초과·0·1·`pid_t`로 왕복할 수
없는 값을 거절한다. `main`은 이어서 `kill(server_pid, 0)`으로 process가
보이는지 확인하고 예상 server socket path를 계산한다. 이 첫 단계는 아직
server path를 `lstat`해 socket 종류·소유자를 확인한 것이 아니다.

### 2. 응답 자원을 먼저 소유한다

`bind_client_socket`은 자신의 PID가 들어간 경로를 계산하고, 같은 UID 소유의
stale socket만 지운 뒤 `AF_UNIX/SOCK_DGRAM` socket을 bind한다. descriptor에는
`O_NONBLOCK`과 `FD_CLOEXEC`가 붙는다. 전역 `g_response_socket`,
`g_client_path`, `g_client_bound`는 이 프로세스가 닫고 unlink해야 할 자원
장부다. 부분 준비 실패에서는 `cleanup_response_socket`, 정상 return에서는
등록된 `atexit` handler가 이 장부를 정리한다. response descriptor가
`FD_SETSIZE` 이상이면 `FD_SET` 전에 준비 실패로 처리한다.

### 3. ACQUIRE와 READY로 owner가 된다

자신의 socket을 bind한 뒤 `main`이 server path를 같은 UID socket인지 처음
확인한다. `request_session`은 `/dev/urandom`을 짧은 읽기와 `EINTR`에 대응해
끝까지 읽고 0이 아닌 nonce를 만든 다음 server socket을 다시 확인하고, 현재
PID를 담은 `ACQUIRE`를 정확한 구조체 크기로 전송한다. 이 검사들은 PID와
endpoint가 같은 신원이라는 암호학적 증명은 아니다. READY는 다음이 모두 맞아야
한다.

- datagram 크기가 `sizeof(t_mt_response)`와 정확히 같음
- source가 예상 server socket path
- magic과 server PID가 예상값
- kind가 `MT_RESPONSE_READY`
- token이 현재 nonce

이 correlation field가 다르면 packet을 폐기하되 READY의 절대 기한은 연장하지
않는다. 모두 맞은 packet의 status가 BUSY면 `SEND_REJECTED`, OK가 아닌 다른
값이면 `SEND_ERROR`, OK면 READY 성공이다. 정상 server는 BUSY를 READY에서만
보낸다.

### 4. 비트마다 stop-and-wait를 수행한다

`send_byte`는 unsigned byte를 bit 7부터 bit 0까지 보낸다. `send_bit`은 매번
server endpoint와 단조 시계를 확인하고 `kill`로 하나의 signal을 보낸 뒤,
같은 `sequence`의 `MT_RESPONSE_ACK`만 기다린다. 성공 ACK 뒤에만 sequence를
증가시킨다. 본문을 마치면 같은 경로로 NUL의 여덟 비트까지 전송한다.

READY 한 번과 **각 비트**에는 각각 3초 deadline이 있지만 message 전체
deadline은 없다. timeout이나 ACK 손실 시 retry하지 않으므로 동일 bit
재전송과 deduplication 규칙도 없다. sequence는 `uint32_t` implicit counter라
아주 긴 session에서는 wrap할 수 있으며 별도 overflow 거절도 없다.

## 서버 상태 전이

서버의 session 상태는 다음 전역값으로 표현된다.

| 상태 | 보호 방식과 의미 |
| --- | --- |
| `g_client_pid` | 0이면 idle, 양수면 유일한 owner |
| `g_current_byte` | 아직 완성되지 않은 비트의 누적값 |
| `g_received_bits` | 현재 바이트에서 받은 비트 수 0..7 |
| `g_sequence` | 다음 owner bit에 붙일 ACK token |
| `g_line_started` | non-NUL 바이트가 stdout에 하나 이상 확정됨. 실제 cursor가 줄 중간인지는 추적하지 않음 |

이 값들은 signal handler가 만지지 않는다. self-pipe에서 event를 꺼낸 main
문맥의 `handle_session_request`, `process_bit`, `flush_byte`,
`reset_session`만 바꾼다.

```text
PREPARED
  -> IDLE
  -> ACQUIRE_VALIDATED
  -> OWNED(client_pid)
  -> BIT_ACCEPTED
     |- 1..7번째: 상태 누적 -> ACK_SENT -> OWNED/ASSEMBLING
     |- 8번째 non-NUL: BYTE_COMMITTED -> ACK_SENT -> OWNED
     `- 8번째 NUL: NUL_NEWLINE_COMMITTED -> IDLE -> COMPLETION_ACK_SENT
```

### 1. 예약 요청으로 소유자를 정한다

`read_session_request`와 `valid_request_source`는 정확한 크기, magic/kind,
양수 PID, source path와 PID 기반 예상 path의 일치, 같은 UID socket,
`kill(client_pid, 0)` 성공을 확인한다. session이 idle이면 PID를
`g_client_pid`에 저장한다.

다른 owner가 있으면 `kill(old_owner, 0)`과 그 PID의 client endpoint를 함께
확인한다. PID가 `ESRCH`이거나 같은 UID의 예상 socket이 사라졌으면 이미 시작한
줄을 줄바꿈으로 닫고 reset한 뒤 새 owner를 받는다. 그래서 종료된 child가 아직
부모에게 회수되지 않아 PID가 보이는 동안에도 endpoint 정리가 끝났다면 session을
복구한다. PID와 endpoint가 모두 남은 `SIGSTOP` 상태처럼 살아 있으나 진행하지
않는 owner는 자동으로 회수하지 않는다.

이미 owner인 같은 PID가 ACQUIRE를 다시 보내면 bit·sequence 상태를 reset하지
않고 OK READY를 다시 보낸다. READY 전송 실패 뒤 reset하는 것은 이번 요청에서
idle session의 **새 owner가 된 경우**뿐이다. 같은 owner의 재-ACQUIRE READY나
경쟁자 BUSY 전송 실패는 기존 session을 없애지 않는다.

### 2. owner의 signal만 조립한다

`process_bit`은 event sender가 현재 `g_client_pid`와 같고 signal이 두 데이터
signal 중 하나일 때만 상태를 바꾼다. 비owner의 signal은 ACK 없이 버린다.
정상 경쟁자는 먼저 ACQUIRE를 보내므로 BUSY를 관찰한다.

비트마다 누적 byte를 왼쪽으로 밀고 ONE이면 최하위 bit를 세운다. 여덟 비트가
모이면 `flush_byte`가 수행된다.

- non-NUL: 그 한 바이트를 stdout에 끝까지 쓰고 `g_line_started = 1`
- NUL: 줄바꿈을 stdout에 끝까지 쓰고 `reset_session(0)`으로 owner·bit·line·sequence를 해제

완성 byte가 아니어도 그 뒤 현재 event에 대응하는 ACK를 보낸다. non-NUL 또는
미완성 byte의 경우 owner가 남아 있어 `g_sequence`가 증가한다. NUL의 경우
reset이 먼저 일어나므로 owner와 sequence는 이미 초기값이지만, 지역 변수에
보관한 마지막 sequence로 완료 ACK를 보낸다.

## 출력과 ACK 사이가 protocol commit 경계다

선행 학습인
[POSIX write 실패 계약](https://github.com/woopinbell/format-printer/blob/main/architecture/output-and-verification-boundaries.md)은
짧은 쓰기, `EINTR`, 0과 영구 오류를 함수 반환으로 다룬다. 이 저장소는 그 성공
여부를 다음 ACK 결정에 사용한다.

1..7번째 bit에는 stdout effect가 없지만 각각 ACK한다. 아래 commit 순서는
여덟 번째 bit가 byte를 완성한 경우에 추가되는 단계다.

```text
8번째 bit 수신
  -> stdout write_all 성공
  -> 상태 전이
  -> ACK datagram
```

stdout 실패에는 ACK를 보내지 않으므로 클라이언트가 “출력되지 않은 byte”를
성공으로 오해하는 경로는 차단한다. 하지만 출력은 되돌릴 수 없고 ACK 송신과
원자적이지 않다.

- final NUL이 아닌 모든 bit의 ACK `send_response`가 동기적으로 실패하면 owner가 아직
  같다. 서버는 `reset_session(1)`로 session을 비운다. 1..7번째라면 현재 partial
  bit 상태도 버리며, 이전에 완성 byte를 출력해 `g_line_started`가 참이면 recovery
  newline도 먼저 쓰려 한다. 여덟 번째 non-NUL이면 방금 쓴 byte도 이미 보인다.
- 최종 NUL 줄바꿈 뒤 ACK `send_response`가 동기적으로 실패하면 `flush_byte`가 owner를
  이미 0으로 만들었다. `event->sender == g_client_pid`가 거짓이므로 추가
  reset은 하지 않는다.
- `sendto`가 성공했지만 datagram이 client에게 소비되지 않은 손실은 server가
  알 수 없어 위 reset 경로를 타지 않는다.
- 어느 경우든 클라이언트는 timeout/오류로 실패할 수 있지만 stdout 효과는
  이미 발생했다. client 재시도 규칙이 없으므로 exactly-once 합의가 아니다.

세션 회수의 줄바꿈도 별도 외부 효과다. 이미 출력된 접두사를 rollback하지 않고
다음 메시지와 시각적으로 분리할 뿐이다.

## 표준 signal이 보존하는 것과 보존하지 않는 것

`sigaction(..., SA_SIGINFO)`는 handler에 `si_pid`를 제공한다. 그러나
`SIGUSR1`·`SIGUSR2`는 표준 signal이므로 같은 종류가 pending인 동안 여러 번
발생하면 횟수가 합쳐질 수 있다. 정상 client의 stop-and-wait는 다음 bit를 ACK
전에는 보내지 않아 outstanding data signal을 하나로 제한한다.

이 제한은 protocol을 따르는 owner에만 유효하다. 다른 프로세스의 flood나
handler 설치·mask 해제 전 연속 signal까지 lossless queue로 만들지는 않는다.
발생 횟수 자체가 자료라면 realtime signal, datagram payload, stream transport가
더 맞다.

## native 구조체는 이식 가능한 wire format이 아니다

`src/client.c`와 `src/server.c`는 `t_mt_request`와 `t_mt_response`의 메모리를
`sizeof`만큼 그대로 보내고, 수신자는 한 바이트 큰 임시 버퍼로 받아 **정확한**
크기만 허용한 뒤 `memcpy`한다.

현재 field의 정확한 선언 순서는 다음과 같다. 이 순서와 type 사이에 ABI가 넣는
padding까지 datagram의 일부가 된다.

| `t_mt_request` 순서 | type | field |
| --- | --- | --- |
| 1 | `uint32_t` | `magic` |
| 2 | `uint32_t` | `kind` |
| 3 | `uint32_t` | `nonce` |
| 4 | `pid_t` | `client_pid` |

| `t_mt_response` 순서 | type | field |
| --- | --- | --- |
| 1 | `uint32_t` | `magic` |
| 2 | `uint32_t` | `kind` |
| 3 | `uint32_t` | `token` |
| 4 | `int32_t` | `status` |
| 5 | `pid_t` | `server_pid` |

`uint32_t` 자체는 고정 폭이어도 다음은 protocol에 고정돼 있지 않다.

- `pid_t`의 폭과 표현
- field alignment와 padding byte
- host byte order
- 구조체 전체 크기
- protocol version과 호환 범위

그러므로 같은 로컬 ABI와 같은 공유 헤더로 빌드한 쌍만 전제한다. 독립 배포
protocol로 만들려면 고정 폭 직렬화, byte order, length, version을 별도로
정의해야 한다.
