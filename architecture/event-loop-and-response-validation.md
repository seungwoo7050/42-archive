# 이벤트 루프와 응답 검증

이 문서는 **현재 최종 구현의 구조와 자원 수명**을 설명한다. public 실행 계약은
[README](../README.md), owner·bit·commit 상태는
[세션과 비트 프로토콜](session-and-bit-protocol.md)에서 함께 설명한다.

## 준비 순서가 handler의 전제다

서버 `main`은 다음 순서로 시작한다.

1. `prepare_response_channel`이 self-pipe를 만든다.
2. pipe read end에는 `FD_CLOEXEC`, write end에는 `O_NONBLOCK`과
   `FD_CLOEXEC`를 설정한다.
3. 현재 PID의 server socket path를 계산하고 안전하게 제거 가능한 stale
   socket만 지운다.
4. Unix datagram socket을 만들고 `O_NONBLOCK`·`FD_CLOEXEC`를 설정해 bind한다.
5. `atexit(cleanup_server)`를 등록한다.
6. `install_signal_handlers`가 `SIGPIPE`와 다섯 event signal의 policy를 설치하고,
   상속된 process mask에서 다섯 event signal을 unblock한다.
7. PID 전체와 줄바꿈을 stdout에 확정한 뒤 `run_event_loop`에 들어간다.

handler를 등록하기 전에 pipe write descriptor가 유효해야 한다. 반대로 시작
중간에 실패하면 `cleanup_server`가 현재 장부에 기록된 descriptor만 닫고, 실제로
bind한 경우에만 server path를 unlink한다.

클라이언트도 자신의 datagram socket을 만든 후에 ACQUIRE를 보낸다. client
socket은 nonblocking/CLOEXEC이고, path는 bind 성공 뒤에만 “자신이 소유한
경로”로 장부에 표시된다. 두 프로세스 모두 정상 return 시 `atexit` 정리를
사용한다.

## `sigaction`이 delivery 문맥을 제한한다

서버는 `SIGUSR1`, `SIGUSR2`, `SIGHUP`, `SIGINT`, `SIGTERM`에 같은
`SA_SIGINFO` handler를 설치한다. `SA_SIGINFO`가 없으면 `siginfo_t.si_pid`로
송신자를 식별할 수 없다.

handler 실행 중 `sa_mask`는 위 다섯 signal을 모두 막는다. 하나의 handler가
event 구조체를 쓰는 동안 다른 protocol/종료 handler가 중첩되는 것을 막는다.
다만 표준 signal은 막힌 동안 같은 번호가 여러 번 오면 개수 보존을 보장하지
않는다. 이 mask는 handler 내부 직렬화이지 queue 확장이 아니다.

`SIGPIPE`는 별도로 `SIG_IGN`을 설치한다. stdout이 닫힌 pipe일 때 default
disposition으로 서버가 즉시 종료되게 두지 않고, `mt_write_all`이 `EPIPE`를
보고 ACK를 차단할 수 있게 하는 제품 policy다.

서버는 handler 설치 뒤 상속한 process signal mask에서 `SIGUSR1`·`SIGUSR2`와
세 종료 signal을 명시적으로 unblock한다. 자동 검사는 다섯 signal을 모두 막은
부모를 통해 server를 실행한 뒤 메시지를 왕복하고 `SIGTERM`이 main 정리 경로로
처리되는지 확인한다.

## handler에서는 async-signal-safe 전달만 한다

현재 handler의 전체 책임은 다음과 같다.

```c
saved_errno = errno;
event.sender = info == NULL ? 0 : info->si_pid;
event.signal = signal;
if (write(g_event_pipe[1], &event, sizeof(event))
	!= (ssize_t)sizeof(event))
	g_event_overflow = 1;
errno = saved_errno;
```

`write`는 POSIX async-signal-safe 함수다. handler는 `malloc`, `printf`,
socket 송신, 문자열 조립, session 변경을 호출하지 않는다. local event를
만들고 한 번의 pipe write로 main 문맥에 넘긴다.

`t_bit_event`가 `PIPE_BUF` 이하인지 compile-time 배열 크기로 확인한다.
파이프에 여러 writer가 있더라도 이 크기의 한 번 write는 다른 event write와
byte 단위로 섞이지 않는다는 전제다. write end는 nonblocking이므로 handler가
가득 찬 pipe에서 멈추지 않는다.

handler는 중단한 main 코드의 `errno`를 저장하고 복원한다. handler의 write
실패가 main의 직전 시스템 호출 오류처럼 관찰되는 것을 막는다.

## 왜 overflow만 `volatile sig_atomic_t`인가

`g_event_overflow`는 handler가 쓰고 main event loop가 읽는 유일한 **mutable
scalar**다. 그래서 `volatile sig_atomic_t`로 선언한다. `g_event_pipe[1]`도
handler가 읽는 global이지만 handler 설치 전에 준비한 뒤 loop 동안 바꾸지
않는다. `volatile`은 compiler가 overflow 관찰을 생략하지 않게 하고,
`sig_atomic_t`는 signal 문맥에서의 단순 접근 단위를 제공한다. 이것이 일반
thread 동기화나 복합 상태 transaction을 제공하는 것은 아니다.

`g_client_pid`, `g_current_byte`, `g_received_bits`, `g_sequence`,
`g_line_started`는 handler가 전혀 변경하지 않는다. main이 pipe에서 완전한
event를 읽은 뒤에만 변경하므로 이 값들을 `volatile sig_atomic_t`로 만들 이유가
없다. signal 문맥과 session 상태 사이의 경계가 self-pipe다.

pipe write가 짧거나 실패하면 해당 event의 signal 번호/PID를 복원할 수 없다.
그 뒤 비트를 계속 처리하면 모든 byte 경계가 틀어질 수 있어 main은 overflow를
치명 오류로 처리하고 종료한다. loop 시작점에서 flag를 본 경로는
`errno = ENOBUFS`를 설정하지만, pipe event를 읽은 직후 flag를 본 경로는
`errno`를 덮어쓰지 않고 `-1`을 반환한다. 따라서 `ENOBUFS`는 모든 overflow
경로의 계약이 아니다. 현재 테스트는 실제 pipe를 부하로 채우지 않는다. fault
build가 **첫 event write를 `EAGAIN`으로 실패**시켜 fail-stop 판단만 결정적으로
확인하며 `errno` 값은 확인하지 않는다.

## event loop만 session과 외부 효과를 바꾼다

`run_event_loop`는 `pselect`로 pipe read end와 server datagram socket을 함께
기다린다.

```text
response socket readable -> request 전체 수신·검증 -> owner/BUSY/READY
event pipe readable       -> event 전체 읽기 -> signal 종류·sender 확인
                           -> bit 조립 -> stdout -> ACK
termination event         -> loop 탈출 -> 128 + signal -> atexit cleanup
overflow/read/socket error -> -1 -> 진단 -> exit 1 -> atexit cleanup
```

pipe의 `read_event`는 구조체 일부만 읽었으면 남은 바이트를 이어 읽고 `EINTR`를
재시도한다. 현재 pipe에는 고정 크기 event만 들어간다는 내부 전제가 있다.

`SIGHUP`, `SIGINT`, `SIGTERM`도 handler에서 직접 `close`나 `unlink`하지
않는다. main이 event를 꺼내 종료 상태를 결정한 후 ordinary return과 `atexit`로
정리한다. 이 경로는 제품의 server policy이며, 임의 fatal signal이나
`SIGKILL`에서 path 정리를 보장한다는 뜻은 아니다.

## response는 경로와 payload를 함께 검증한다

client `read_response`는 구조체보다 한 바이트 큰 buffer로 datagram 하나를
받고, 수신 크기가 정확히 `sizeof(t_mt_response)`일 때만 `memcpy`한다. 큰
datagram이 작은 buffer에서 정상 크기처럼 잘린 것으로 오인되는 일을 피한다.

다음 검사가 모두 성공해야 READY/ACK로 소비한다.

- source address family와 NUL 종료 pathname
- 예상 server socket pathname과 정확한 일치
- response magic
- 명령행으로 고정한 server PID
- 현재 기대하는 READY 또는 ACK kind
- READY nonce 또는 bit sequence

크기·source·magic·PID·kind·token 중 하나가 다르면 packet을 버리고 같은
deadline에서 계속 기다린다. 이 필드들이 모두 일치한 뒤에는 status를 별도로
해석한다. `MT_RESPONSE_BUSY`면 현재 기대 kind와 관계없이 `SEND_REJECTED`,
`MT_RESPONSE_OK`가 아닌 다른 값이면 `SEND_ERROR`, OK면 성공이다. 정상 server는
BUSY를 READY에만 보내지만 client parser의 status branch 자체는 kind에 한정돼
있지 않다. 따라서 unknown status는 invalid field packet처럼 버리지 않고 즉시
오류로 끝낸다.

`EAGAIN`, `EWOULDBLOCK`, `EINTR`는 “아직 유효 응답이 없음”으로 처리한다.
다른 영구 recv 오류만 client 실패로 전환한다.

server의 ACQUIRE 검증도 대칭적으로 정확한 크기, client source path, request
필드, 같은 UID socket과 PID 생존을 본다. 그러나 datagram의 OS peer credential을
조회하지 않으므로 경로 일치는 인증이 아니다.

## 절대 기한은 invalid-response flood에도 줄어든다

READY 요청 직전과 **각 bit kill 직전**에 `CLOCK_MONOTONIC`으로
`now + MT_ACK_TIMEOUT_SECONDS`를 만든다. 대기 loop는 매번 `time_until`로
남은 값을 계산해 `pselect`에 넘긴다.

고정 relative timeout을 매 반복에 다시 넘기면 `EINTR`나 invalid response가
올 때마다 총 시간이 늘어난다. 현재 방식은 그런 event를 버리는 데 쓴 시간도
동일 deadline에서 차감한다.

`clock_gettime` 실패는 client 오류다. `time_until` 안의 clock 조회가 실패하면
남은 시간을 0으로 만들어 timeout으로 처리한다. deadline은 READY/bit 단위라서
메시지 전체 처리 시간이 3초라는 뜻은 아니다.

## descriptor·경로 소유권과 보안 한계

| 자원 | 생성자/소유자 | 정상 정리 |
| --- | --- | --- |
| self-pipe 양 끝 | server | `cleanup_server` close |
| server datagram fd | server | close |
| server pathname | bind 성공한 server | unlink |
| client datagram fd | 각 client | `cleanup_response_socket` close |
| client pathname | bind 성공한 client | unlink |
| runtime directory | UID별 공유 | 제품 종료 때 제거하지 않음 |

`pselect`가 사용하는 client response socket, server response socket, self-pipe
read descriptor는 `FD_SETSIZE`보다 작은지 준비 단계에서 검사한다. 범위를 벗어난
descriptor는 `FD_SET`에 넘기지 않고 기존 실패·정리 경로로 반환한다.

`mt_runtime_dir`는 새 디렉터리를 mode `0700`으로 요청한다. 기존 경로는 directory,
현재 owner UID, `(st_mode & 077) == 0`을 검사한다. 즉 owner bits까지 정확히
`0700`이어야 한다는 검사는 아니다.

stale endpoint 제거도 `lstat` 시점에 같은 UID socket인지 확인한 뒤 `unlink`한다.
server/client 전송 전에도 상대 path를 다시 `lstat`한다. 이 방어는 일반 파일을
무심코 지우는 일을 줄이지만 검사와 사용 사이 교체를 원자적으로 막지 않는다.

동일 UID 공격자는 예상 pathname을 만들고 native response를 위조할 수 있다.
PID는 종료 후 재사용될 수 있고, `kill(pid, 0)` 뒤 실제 signal/sendto 대상이
바뀔 수 있다. nonce는 correlation 값이지 secret이 아니다. 더 강한 신뢰
경계에는 platform peer credentials, 연결 기반 endpoint, pidfd 계열 수명
handle, 명시적 serialization/authentication이 필요하다.
