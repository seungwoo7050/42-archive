# signal-message-bus

`SIGUSR1`과 `SIGUSR2`를 각각 0과 1로 사용해 같은 호스트의 프로세스 사이에서
NUL 종료 문자열을 전달하는 POSIX C 프로그램입니다. 공개 제품은 인자 없는
`server`와 `client <server_pid> <message>` 두 실행 파일입니다. 공유 헤더의
`t_mt_request`와 `t_mt_response`는 두 실행 파일 사이의 로컬 응답 형식입니다.

전처리와 C 자료형 자체는 C 영역이지만 `pid_t`, `kill`, `sigaction`, `write`,
`pipe`, `pselect`, `CLOCK_MONOTONIC`과 Unix domain socket은 ISO C만의 기능이
아닙니다. 현재 실행 계약은 POSIX/Unix host 환경을 전제합니다.

표준 시그널은 같은 종류의 발생 횟수를 일반 메시지 큐처럼 보존하지 않습니다.
그래서 정상 클라이언트는 세션을 먼저 예약하고, 비트 하나마다 ACK를 받은 뒤에만
다음 비트를 보냅니다. 비트는 시그널로, `ACQUIRE`·`READY`·`ACK`는 Unix
datagram으로 전달합니다.

## 실행

```sh
make
./server
```

서버가 stdout 첫 줄에 출력한 PID를 다른 터미널에서 사용합니다.

```sh
./client 12345 "hello"
```

본문은 `argv`의 바이트를 그대로 전송합니다. UTF-8 문자열도 인코딩을 해석하지
않고 바이트열로 왕복합니다. 마지막에는 NUL 바이트를 별도 프레임으로 보내며,
서버는 이를 본문으로 출력하지 않고 줄바꿈과 세션 완료로 해석합니다. 따라서 빈
문자열도 NUL 프레임 하나를 보내고 빈 줄 하나를 만듭니다. `argv`로 표현할 수
없는 embedded NUL을 본문에 담는 API는 없습니다.

## 처음부터 끝까지의 상태 흐름

클라이언트의 현재 경로는 다음과 같습니다.

```text
PID 문자열·kill(pid, 0)·server path 계산
  -> 자신의 nonblocking/CLOEXEC response socket bind
  -> server socket 소유권·종류 재확인
  -> nonce가 든 ACQUIRE 전송
  -> 출처와 필드가 맞는 READY 대기
  -> 각 바이트의 MSB부터 kill(SIGUSR1/SIGUSR2)
  -> 같은 sequence의 ACK 대기
  -> NUL의 여덟 비트와 마지막 ACK
  -> close + 자신이 bind한 socket path unlink
```

서버의 현재 경로는 다음과 같습니다.

```text
self-pipe와 nonblocking/CLOEXEC datagram socket 준비
  -> SIGPIPE 무시, SA_SIGINFO handler 등록과 event signal unblock
  -> PID 한 줄을 stdout에 확정
  -> ACQUIRE 검증과 session owner 결정
  -> handler가 (sender PID, signal)을 self-pipe로 전달
  -> main event loop가 owner의 비트를 바이트 상태에 반영
  -> 여덟 번째면 완성 바이트 또는 NUL 줄바꿈을 stdout에 확정
  -> 받아들인 각 비트 sequence의 ACK
  -> 종료 signal이면 main 문맥에서 descriptor/path 정리
```

`SA_SIGINFO`로 받은 `si_pid` 덕분에 서버는 예약된 PID의 시그널만 상태에
반영합니다. 처리기는 async-signal-safe 함수인 `write`만 호출하고 `errno`를
보존합니다. 바이트 조립, 소켓 송신과 출력은 모두 일반 실행 문맥에서 수행합니다.

## 성공과 실패의 경계

예약과 각 비트에는 각각 `CLOCK_MONOTONIC` 기준 3초 기한이 있습니다. 잘못된
datagram과 `EINTR`가 와도 그 기한은 다시 시작되지 않습니다. 그러나 메시지
전체 기한, 재전송, 중복 제거는 없습니다. 긴 메시지의 전체 실행 시간에는 상한이
없고, ACK가 사라지면 클라이언트는 그 비트를 다시 보내지 않고 실패합니다.

서버는 완성된 바이트를 stdout에 끝까지 쓴 뒤 ACK를 보냅니다. 출력이 실패하면
ACK하지 않지만, 출력 성공 뒤 ACK datagram만 잃을 수도 있습니다. `sendto`가
즉시 실패하면 서버는 그 사실을 보고 정리 경로를 탑니다. kernel이 datagram을
받아 `sendto`는 성공했지만 client가 소비하지 못한 경우에는 서버도 손실을 알지
못합니다. 어느 경우든 외부 효과가 이미 발생한 뒤 client가 실패할 수 있으므로
양쪽이 합의한 exactly-once commit은 아닙니다. 특히 최종 NUL은 줄바꿈을 쓴 뒤
세션 owner를 이미 0으로 지우고 완료 ACK를 보냅니다. 그 ACK의 동기적 전송
실패는 “현재 세션을 다시 초기화”하지 않습니다. 세션은 이미 끝났고, client만
성공을 확신하지 못합니다.

서버는 `SIGPIPE`를 명시적으로 무시해 stdout `write`의 `EPIPE`를 오류 반환으로
처리합니다. 이는 프로세스의 signal 정책을 바꾸지 않는 일반 출력 라이브러리와
다른 제품 수준 결정입니다.

## 런타임 경로와 wire 전제

응답 소켓은 `/tmp/signal-message-bus-<uid>/` 아래에 만듭니다. 새 디렉터리는
`0700`으로 요청합니다. 이미 있는 디렉터리는 정확히 `0700`인지가 아니라
“현재 UID 소유의 디렉터리이며 group/other 권한 비트가 모두 0인가”를 검사합니다.
기존 endpoint는 현재 UID 소유의 socket일 때만 stale 항목으로 제거하고, 일반
파일이나 다른 UID의 항목은 건드리지 않습니다.

`pselect`의 `fd_set`에 넣는 client response socket, server response socket,
self-pipe read descriptor는 모두 `FD_SETSIZE`보다 작아야 합니다. 범위를 벗어나면
`FD_SET`을 호출하지 않고 시작 단계에서 실패합니다.

요청·응답은 구조체를 직렬화하지 않고 `sizeof` 바이트 그대로 전송합니다.
`pid_t` 폭, 정렬·padding, host byte order가 wire 규약에 고정돼 있지 않고
version 협상 필드도 없습니다. 따라서 같은 호스트에서 같은 ABI와 공유 헤더를
사용하는 한 빌드 쌍만 전제합니다.

경로 소유권·source path·PID·magic·kind·token 검사는 우발적 혼선을 줄이지만
peer credential 인증은 아닙니다. 같은 UID 프로세스는 경로나 구조체를 위조할
수 있고, `lstat`·`kill(pid, 0)` 확인과 실제 사용 사이에는 TOCTOU가 있습니다.
PID 재사용도 배제하지 못합니다.

## 학습 문서

먼저 다음 선행 문서의 기본 계약을 사용합니다.

- [`int` 출력 계약과 write 상태](https://github.com/woopinbell/format-printer/blob/main/architecture/output-and-verification-boundaries.md)
- [여섯 저장소의 개념 소유권](https://github.com/woopinbell/c-foundation/blob/main/docs/series-learning-path.md)

이 저장소에서 새로 배우는 것은 프로세스·PID, signal delivery, async-signal-safe
처리, self-pipe, 두 채널을 묶는 session/ACK 상태와 출력 성공을 protocol
결정에 포함했을 때의 모호성입니다.

- [세션과 비트 프로토콜](architecture/session-and-bit-protocol.md):
  양쪽 상태 전이, owner, sequence, message·commit 경계
- [이벤트 루프와 응답 검증](architecture/event-loop-and-response-validation.md):
  handler/main 분리, descriptor·path 수명, response/security 경계

## 검증 범위

저장소가 제공하는 검증 진입점은 다음과 같습니다.

```sh
make test
```

이 명령은 PID 문자열 경계와 실제 프로세스의 일반·빈·UTF-8·장문 메시지,
세션 경쟁, 종료됐지만 아직 회수되지 않은 소유자 복구, 잘못된 응답, timeout,
client STOP/CONT, stale endpoint, 높은 descriptor의 안전한 실패, 차단된 signal
mask 상속 뒤 통신과 종료 정리를 확인합니다. fault server는 stdout의 부분
쓰기·`EINTR`·0·`EPIPE`, 그리고 첫 handler event `write` 실패를 결정적으로
주입합니다. 마지막 사례는 실제 부하로 self-pipe를 포화시키는 검사가 아닙니다.

## 보장하지 않는 범위

- 다른 호스트·다른 사용자·서로 다른 ABI나 protocol version 사이 통신
- 같은 UID의 악성 프로세스를 구분하는 인증·기밀성
- 메시지 전체 deadline, ACK 재전송, deduplication, 서버 재시작 복구
- 살아 있지만 영구 정지한 owner의 lease 만료
- embedded NUL과 임의 binary message
- protocol을 무시한 signal flood의 발생 횟수 보존
- 출력 성공과 ACK 성공을 하나의 원자적 transaction으로 묶는 exactly-once 보장
