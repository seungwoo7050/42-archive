# irc-relay-server

C++17 단일 프로세스 IRC relay server다. IPv4 논블로킹 소켓을 한 이벤트
루프에서 처리하고 Linux에서는 `epoll`, macOS에서는 `kqueue`를 사용한다.
연결별 입력 buffer와 송신 queue, 등록·nickname·channel 상태, timeout과
rate limit를 메모리에 보관한다.

## 빌드와 실행

```sh
make
./irc-relay-server 6667 relay-secret
```

Makefile은 `uname -s`가 `Linux` 또는 `Darwin`일 때만 backend를 선택한다.
기본 compiler contract는 다음과 같다.

```text
-std=c++17 -Wall -Wextra -Werror -g -Iinclude
```

실행 형식과 기본값은 다음과 같다.

```text
irc-relay-server <port> <password>
  [--idle-timeout=120]
  [--ping-timeout=30]
  [--registration-timeout=30]
  [--rate-limit=24:3]
  [--max-pending-bytes=1048576]
  [--max-connections=256]
```

- port는 부호와 whitespace 없는 십진수 `1..65535`다.
- 세 timeout은 십진수 `1..86400`초다.
- rate count와 두 `max-*` 값은 현재 플랫폼의 `size_t` 범위다.
- `rate-limit=0:SECONDS`는 거부만 끄고 명령 시각 deque 갱신은 계속한다.
- `max-connections=0`은 무제한이지만 `max-pending-bytes=0`은 연결 생성 때
  1MiB 기본값으로 바뀐다.
- 정상 listen 뒤 stderr에는 `event=server_started port=<port>`, stdout에는
  `Listening on port <port>`가 기록된다.
- 필수 인자 누락·CLI 검사 실패와 `main()`까지 올라온 `std::exception`은
  stderr 오류와 status 1, 정상 종료는 status 0이다. connect·line·disconnect
  callback에서 잡힌 `std::exception`은 연결 단위로 보고하고 계속할 수 있다.
  non-standard exception과 소멸 중 실패까지 이 계약으로 격리하지는 않는다.

## 구현한 프로토콜 범위

등록 전에는 `PASS`, `NICK`, `USER`, `PING`, `PONG`, `QUIT`를 처리한다.
등록 뒤에는 다음 command subset을 제공한다.

```text
PRIVMSG  JOIN  PART  TOPIC  KICK  INVITE
MODE     LIST  NAMES METRICS
```

channel mode는 `+i`, `+t`, `+o`다. user mode 변경은 구현하지 않았다. input은
CRLF뿐 아니라 LF-only frame도 받고, output은 CRLF로 정규화한다. 현재 frame
길이, 등록 전이, command·numeric 표, channel case·invite·operator 정책은
[프로토콜 계약](docs/protocol-contract.md)이 소유한다.

## 연결·자원 한계

- `accept`, `recv`, `send`는 각 ready event에서 별도 quantum 없이
  `EAGAIN` 또는 완료까지 반복한다. 계속 준비된 한 연결의 latency·공정성
  상한은 없다.
- 한 read callback은 완성된 모든 frame을 먼저 `vector`에 모은다. line limit와
  응용 rate limit는 callback 전체의 byte·frame 수와 임시 메모리를 제한하지
  않는다.
- `max-pending-bytes`는 아직 보내지 않은 논리 byte 수다. `std::string`
  capacity, allocator overhead나 process resident memory 상한은 아니다.
- 종료 요청은 출력이 남아 있으면 write-ready를 기다리지만 연결별 drain
  deadline은 없다. socket·event 오류에서는 남은 출력을 버릴 수 있다.
- SIGINT/SIGTERM 유예는 `pollOnce(50)` 최대 8회의 wait budget이다. listen
  socket이 열려 있어 그동안 새 연결과 명령을 받을 수 있으며 400ms wall-clock
  종료 보장이 아니다.

## password와 네트워크 신뢰 경계

server는 기본 IPv4 `0.0.0.0`에 bind하며 TLS를 종료하지 않는다. CLI password와
클라이언트의 `PASS`는 암호화되지 않은 TCP를 지나고 저장 hash, 계정 DB, SASL과
인증서를 제공하지 않는다. 신뢰할 수 없는 네트워크에서는 별도 TLS endpoint와
접근 통제가 필요하다.

IPv6, federation, channel persistence, 전체 IRC command·numeric·casemapping,
ban/key/limit mode, 전체 user mode와 message history는 비범위다.

## 문서 지도

- [프로토콜 계약](docs/protocol-contract.md): framing, 등록 상태,
  command·numeric subset, channel 정책과 wire 비범위
- [소켓에서 채널 메시지까지](architecture/socket-to-channel-message.md):
  listen→accept→read batch→application→queue→write 실행 흐름
- [연결 상태와 보호 수명](architecture/connection-state-and-protection-lifecycle.md):
  `unique_ptr<Connection>`, fd 재조회, nickname/channel cleanup, timeout·rate
- [이벤트 루프](architecture/portable-event-loop.md): 관심/준비 이벤트,
  epoll/kqueue 등록 실패와 실제 공정성
- [종료·지표·실행 계약](architecture/shutdown-metrics-and-runtime-contract.md):
  signal flag, drain, metric 시점과 예외 종료
- [개발 기록](devlog/README.md): Git에서 형성된 순서와 교육용 읽기 순서

## 정적·실행 검증 진입점

```sh
make test
make connection-test
make unit
make application-test
make event-test
```

`make test`는 송신 상태, server와 application lifetime 단위 검사, TCP
smoke·contract, 160-peer와 slow receiver 진행 검사를 의존 대상으로 둔다. `make -j`에서는
선행 prerequisite 사이의 표시 순서를 실행 순서 계약으로 보지 않는다.
고정된 유한 시나리오는 지속적인 fast sender의 독점, 모든 numeric,
allocation/non-standard exception, 실제 fd 재사용과 wall-clock 성능을
증명하지 않는다.

현재 외부 release surface는 실행 파일의 CLI, TCP wire, stdout/stderr와 종료
상태다. `include/*.hpp`는 이 실행 파일을 구성하는 C++ 모듈 경계이며 install
규칙, versioned library와 ABI 호환 약속은 없다.

## 라이선스

MIT License
