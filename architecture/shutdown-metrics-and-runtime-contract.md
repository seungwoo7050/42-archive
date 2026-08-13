# 종료·지표·실행 계약

서버가 실행 옵션을 해석하고 소켓을 연 뒤, 시그널을 받아 연결을 정리할 때까지의 흐름을 설명한다.

```text
CLI 해석과 서버 시작
SIGINT·SIGTERM 수신
일반 처리 루프 중단
종료 응답 대기열 추가
송신 유예
연결·소켓 정리
METRICS 응답과 구조화 로그
```

현재 종료 경로는 기존 연결에 종료 프레임을 넣고 짧은 시간 동안 송신을 시도한다. 다만 유예 중에도 `listen` 소켓과 콜백이 살아 있어 새 연결을 수락할 수 있으며, `server_metrics`는 연결을 정리하기 전에 기록한다. 따라서 모든 작업을 즉시 차단하는 종료나 정리 결과를 모두 반영한 최종 지표로 해석하면 안 된다.

## 실행 진입점과 옵션

실행 파일은 [`Makefile`](../Makefile)이 만드는 `irc-relay-server`이다. 옵션 해석은 [`RuntimeConfig.cpp`](../src/RuntimeConfig.cpp), 프로세스 수명은 [`main.cpp`](../src/main.cpp)에 있다.

```text
./irc-relay-server <port> <password> [options]
```

필수 인자가 부족하면 종료 코드 1과 사용법을 표준 오류에 남긴다. 정상적으로 listen을 시작하면 다음 두 줄을 순서대로 출력한다.

```text
stderr: event=server_started port=<port>
stdout: Listening on port <port>
```

| 입력 | 기본값 | 검사 | 의미 |
|---|---:|---|---|
| `port` | 필수 | 정수 1..65535 | IPv4 `0.0.0.0:<port>`에서 수신 |
| `password` | 필수 문자열 | 내용 검사를 하지 않음 | 빈 문자열이면 새 연결의 `passOk=true` |
| `--idle-timeout=N` | 120 | 1..86400 | 마지막 완성 줄 뒤 연결 확인 PING까지의 초 |
| `--ping-timeout=N` | 30 | 1..86400 | PING을 넣은 뒤 PONG을 기다리는 초 |
| `--registration-timeout=N` | 30 | 1..86400 | `accept()` 뒤 등록을 완료할 수 있는 초 |
| `--rate-limit=COUNT:SECONDS` | 24:3 | COUNT는 `size_t` 범위의 십진수, SECONDS는 1..86400 | 창 안에서 COUNT개까지 허용하며 0이면 해제 |
| `--max-pending-bytes=N` | 1048576 | `size_t` 범위의 십진수 | 연결별 미송신 바이트 상한이며 0은 생성자에서 1MiB로 변경 |
| `--max-connections=N` | 256 | `size_t` 범위의 십진수 | 활성 연결 상한이며 0은 무제한 |

바인드 주소 `0.0.0.0`, `listen` 대기열 128, 일반 이벤트 대기 1000ms, 입력 줄 최대 512바이트와 서버 이름 `irc.relay.local`은 CLI로 바꿀 수 없다. 종료 유예도 최대 8회, 회당 50ms로 고정돼 있다.

숫자 파서는 ASCII `0`부터 `9`까지의 문자만 받아 각 자릿수를 누적한다.
곱셈과 덧셈 전에 목적 타입의 최댓값을 넘는지 확인하므로 부호, 앞뒤 공백,
포트 65536, 86400을 넘는 시간과 `size_t` 범위 밖의 값을 listen 전에
거부한다. `irc_contract.py`는 실제 실행 파일을 통해 이 경계를 확인한다.
옵션별 0의 의미는 표에 적은 기존 정책을 유지한다.

## 종료 설계 원칙

시그널 처리기에서는 비동기 시그널 안전성이 보장되는 실행 플래그만 내린다.
종료 프레임 생성, 송신 유예, 지표 기록과 소켓 정리는 이벤트 루프로 돌아온 뒤
수행한다. 지표는 프로세스 메모리에만 누적되며 재시작 뒤 복원되지 않는다.
송신 유예 중에도 부분 송신과 이벤트 관심 갱신 규칙은 평상시와 같다.

## 시그널 종료 순서

### 1. 시그널 처리기는 실행 플래그만 바꾼다

메인은 `SIGINT`와 `SIGTERM`에 같은 처리기를 설치하고 `SIGPIPE`는 무시한다.

```text
handleSignal(int): gRunning = 0
```

처리기에서는 소켓을 닫거나 메모리를 할당하지 않으며 로그와 콜백도 호출하지 않는다. 실제 정리는 메인 흐름으로 돌아온 뒤 시작한다.

```text
while (gRunning && server.isRunning()) {
    server.pollOnce();
    app.onTick();
}
```

시그널이 이벤트 대기를 `EINTR`로 깨우면 두 백엔드는 빈 이벤트 벡터를 반환한다. 반복문 조건을 다시 확인하면서 종료 단계로 이동할 수 있다. 시스템 호출이 다시 시작되는 조건과 실제 지연은 운영체제와 C 라이브러리의 영향을 받으며 시간 상한을 검사하지 않는다.

### 2. 기존 연결에 종료 프레임을 넣는다

반복문을 나온 직후 `app.shutdown("Server shutting down")`을 호출한다. [`IrcApplication.cpp`](../src/IrcApplication.cpp)의 순서는 다음과 같다.

```text
ClientRegistry의 현재 fd 목록 복사
→ 각 fd에 ERROR :Server shutting down 대기열 추가
→ 각 Connection에 closeRequested와 reason 설정
→ server_metrics 로그 기록
```

이 목록에 들어간 연결은 종료 요청 상태가 되므로 이후 읽기 관심이 빠진다. 출력이 남아 있으면 쓰기 관심만 유지한다. 송신 대기열 상한 때문에 `ERROR`를 추가하지 못해도 `requestClose()`는 실행되므로 종료 프레임 없이 닫힐 수 있다.

여기서 종료 요청은 실제 소켓 종료가 아니다. `Connection::requestClose()`는 플래그와 이유만 저장한다. 출력이 비워지면 `Server::disconnect()`가 소유 맵과 이벤트 등록을 정리하고, 마지막에 `Connection` 소멸자가 파일 디스크립터를 닫는다.

### 3. 최대 8회 송신을 진행한다

메인은 연결이 남아 있으면 `server.pollOnce(50)`을 최대 여덟 번 호출한다.

```text
for i in 0..7 while connectionCount > 0:
    pollOnce(50)
```

대기 시간만 합치면 명목상 최대 400ms이다. `accept()`, 콜백과 송수신 처리 시간은 이 값에 포함되지 않으며, 모든 연결이 먼저 정리되면 반복을 일찍 끝낸다.

특히 accept, read와 write는 각각 `EAGAIN` 또는 완료까지 반복하며 event별
작업량 budget이 없다. 400ms는 여덟 번의 kernel wait에 넘기는 timeout 합이지
전체 drain의 wall-clock deadline이나 CPU 작업 상한이 아니다.

출력이 모두 비워진 연결은 다음 순서로 정리한다.

```text
이벤트 등록 제거
→ Server 맵 제거와 closedConnections 증가
→ IrcApplication::onDisconnect
→ 채널·닉네임 상태 정리와 client_disconnected 로그
→ Connection 소멸과 fd close
```

### 4. 콜백을 비우고 서버를 멈춘다

유예가 끝나면 연결·입력·해제·오류 콜백을 빈 함수 객체로 바꾸고 `server.stop()`을 호출한다. `stop()`은 실행 상태만 내리며 그 자리에서 모든 파일 디스크립터를 닫지 않는다.

스코프를 벗어날 때 `Server` 소멸자가 남은 연결과 `listen` 소켓을 정리한다. 콜백을 이미 제거했으므로 유예 안에 끝나지 않은 연결에는 `client_disconnected` 로그나 IRC 상태 정리 콜백이 실행되지 않는다. 프로세스가 종료되면서 응용 상태 자체도 소멸한다.

## 유예 중 새 작업이 생길 수 있는 이유

종료를 시작할 때 복사한 기존 연결은 읽기를 중단한다. 그러나 서버 전체의 신규 작업을 차단하지는 않는다. `listen` 파일 디스크립터를 이벤트 관리자에서 빼거나 `listen` 소켓을 닫지 않고, 연결 콜백도 유예가 끝날 때까지 유지하기 때문이다.

유예 중 `listen` 소켓이 준비되면 `acceptReadyClients()`가 새 연결을 수락할 수 있다. 이 연결은 종료 시작 때 만든 목록에 없으므로 `ERROR`와 종료 요청을 받지 않는다. 연결 콜백이 `ClientState`를 만들고, 다음 유예 `poll`에서 입력이 준비되면 명령도 처리할 수 있다. 유예 뒤에는 콜백을 비우고 서버 소멸자가 연결을 닫지만, 시그널 직후부터 신규 연결과 명령을 완전히 거부한다고 볼 수는 없다.

기존 연결이 정리될 때 `onDisconnect()`는 공통 채널 동료에게 `QUIT`을 넣는다. 동료가 이미 종료 요청 상태여도 `Server::sendTo()`는 남은 대기열 뒤에 프레임을 추가할 수 있다. 따라서 종료 중에도 추가 출력 작업이 생기며, 먼저 들어간 `ERROR` 뒤에 다른 사용자의 `QUIT`이 이어질 수 있다.

## `server_metrics`가 최종값이 아닌 이유

`IrcApplication::shutdown()`은 종료 프레임을 넣은 직후, 송신 유예 전에 `logMetrics()`를 호출한다. 따라서 로그에는 다음 변화가 아직 반영되지 않는다.

- 송신 유예에서 뒤이어 정리되는 연결의 `closedConnections`
- 연결 해제 콜백 중 발생한 송신 대기열 거부
- 유예 중 새로 수락한 연결
- 종료 중 삭제한 채널 수
- 유예 뒤 소멸자가 강제로 닫은 연결

종료 검사는 `server_metrics`가 대표 클라이언트의 `client_disconnected`보다 앞에 나타나는 순서를 요구한다. 이는 현재 구현과 검사가 함께 고정한 동작이다. 정리 결과를 모두 반영한 지표가 필요하다면 기록 시점과 검사 기대값을 함께 바꿔야 한다.

## 지표의 의미

### 전송 계층 지표

| 필드 | 증가 시점 | 포함하지 않는 항목 |
|---|---|---|
| `acceptedConnections` | 소켓 설정·이벤트 등록·맵 삽입 뒤 | 최대 연결 수 때문에 곧바로 거부한 파일 디스크립터 |
| `closedConnections` | `disconnect()`가 연결 맵에서 제거한 뒤 | 아직 활성인 연결, 콜백 제거 뒤 소멸자만 거친 연결의 사전 로그 |
| `linesReceived` | 완성 줄을 응용 콜백에 넘기기 직전 | 줄바꿈 전의 미완성 바이트 |
| `outboundQueueDrops` | `queueLine()` 또는 `queueRaw()`이 상한 때문에 실패할 때 | 연결 수가 아니라 실패한 호출 수 |

### 응용 계층 지표

| 필드 | 증가 시점 | 주의할 점 |
|---|---|---|
| `commandsHandled` | 문법 해석과 호출 제한을 통과한 뒤 명령 전달 직전 | 알 수 없는 명령과 등록 전 금지 명령도 포함하며 `METRICS` 자신도 값에 반영 |
| `messagesRelayed` | 유효한 `PRIVMSG` 대상 하나의 라우팅 처리가 끝날 때 | 실제 대기열 추가 여부, 채널 수신자 수, 상대 수신 확인과 무관 |
| `roomsCreated` | `ensureChannel()`이 새 채널을 넣을 때 | 현재 채널 수가 아니며 삭제 뒤에도 누적 |
| `rateLimitedClients` | 명령 창의 상한을 넘을 때 | 제한된 명령 수가 아니라 제한 사건 수 |
| `idleTimeouts` | PING 응답 제한으로 종료할 때 | 등록 제한 종료는 포함하지 않음 |
| `heartbeatPings` | 연결 확인 PING을 대기열에 넣으려 할 때 | 송신 완료나 PONG 수신과 무관 |

`messagesRelayed`는 채널 대상 하나를 처리해 여러 구성원에게 송신을 시도하더라도 한 번만 증가한다. 직접 닉네임 대상도 한 번 증가한다. `sendRaw()`은 성공 여부를 전달하지만 메시지 handler가 지표 증가 조건으로 사용하지 않으므로, 이 값으로 실제 대기열 추가나 수신 건수를 계산할 수 없다.

## 실행 중 `METRICS`와 종료 로그

등록된 클라이언트가 `METRICS`를 보내면 [`ApplicationSupport.cpp`](../src/ApplicationSupport.cpp)가 다음 필드를 `NOTICE` 본문에 넣는다.

```text
connections
accepted
closed
rooms
commands
messages
queue_drops
rate_limited
```

종료 시 `event=server_metrics`에는 다음 필드를 기록한다.

```text
accepted
closed
lines
queue_drops
commands
messages
rooms
rooms_created
rate_limited
idle_timeouts
heartbeats
```

실행 중 응답에는 현재 `connections`가 있고, 종료 로그에는 `lines`,
`rooms_created`, `idle_timeouts`, `heartbeats`가 추가된다. 둘 다 메모리 안의
값이며 영속 저장, 외부 전송이나 여러 시점의 원자적 조회를 제공하지 않는다.
이벤트 루프는 단일 스레드이지만 한 명령 안에서도 각 지표가 갱신되는 시점은 서로
다르다.

## 구조화 로그

`logEvent()`는 표준 오류에 한 줄을 기록한다.

```text
event=<event-name> key=value key=value
```

주요 이벤트는 `server_started`, `client_connected`, `client_registered`, `room_created`, `client_rate_limited`, `client_ping_timeout`, `client_disconnected`, `server_error`, `server_metrics`이다.

값의 공백 문자는 밑줄로 바꾸지만 `=`, 따옴표와 제어 문자를 일반적으로 이스케이프하지 않는다. 단순한 공백 분리에는 맞지만 임의 사용자 입력을 완전한 key/value 문법으로 직렬화하는 형식은 아니다. 로그는 이벤트 루프 스레드에서 `std::cerr`로 직접 출력하므로 느린 표준 오류 대상이 소켓 처리를 지연시킬 가능성도 있다.

## 정상 종료와 예외 종료

송신 유예와 `server_metrics`는 반복문이 정상적으로 끝나 `app.shutdown()`에 도달할 때만 실행한다. `pollOnce()`나 응용 처리에서 잡히지 않은 예외가 최상위 예외 처리로 올라가면 흐름이 달라진다.

```text
signal 정상 경로:
ERROR 대기열 추가 → 지표 기록 → 송신 유예 반복 → 콜백 해제 → 서버 정지·소멸

예외 경로:
스택 해제 → Server 소멸자가 연결·수신 소켓 정리 → 예외 처리에서 오류 출력
```

예외 경로에서는 전체 클라이언트용 `ERROR`와 `server_metrics`를 만들지 않는다. `listen` 소켓 이벤트 오류는 이 경로로 가며, 개별 클라이언트의 일반 오류는 해당 연결의 `disconnect()`로 격리한다.

여기서 “개별 오류”는 server가 잡는 선택된 `std::exception` 경로에 한정된다.
read/event vector allocation과 callback의 non-standard exception은 연결별
catch 밖으로 나갈 수 있고, `main()`도 `std::exception`만 잡는다. 그런 경로는
graceful shutdown sequence를 시작하지 못하거나 프로세스 종료로 이어질 수 있다.

## 최종 소유권 정리

`Server` 소멸자는 다음 순서로 정리한다.

```text
stop()
→ closeAllConnections()
→ closeListenSocket()
```

`closeAllConnections()`는 파일 디스크립터 목록을 먼저 복사한 뒤 각각 `disconnect("server stopped")`를 호출한다. 정상 시그널 경로에서는 콜백을 비웠으므로 남은 연결은 응용 정리 없이 `Connection` 소멸까지 진행한다. `listen` 소켓은 이벤트 등록에서 제거한 뒤 닫고, 마지막으로 `EventManager`가 소멸하면서 `epoll` 또는 `kqueue` 파일 디스크립터를 닫는다. 오류 처리기에서 예외가 발생해도 서버의 정리 경로 밖으로 다시 전달하지 않는다.

`Server` 소멸자는 암묵적으로 `noexcept`지만 `closeAllConnections()`는 fd
`vector`에 `reserve`와 `push_back`을 한다. 이 할당이 실패하거나 disconnect
callback에서 non-standard exception이 빠져나오면 소멸 중 예외가 되어
`std::terminate`로 이어질 수 있다. 따라서 정상 경로의 RAII 소유 구조가 모든
resource-exhaustion 상황에서 끝까지 실행된다는 강한 보장은 없다.

따라서 스코프가 끝나면 파일 디스크립터의 소유권은 회수한다. 다만 모든 종료 응답의 송신 완료, 모든 연결 해제 로그, 채널 정리를 반영한 지표까지 보장하지는 않는다.

## 검증 범위와 남은 제한

- [`irc_contract.py`](../tests/irc_contract.py)는 대표 CLI 오류, 실행 중 `METRICS`, SIGTERM 뒤 정확한 `ERROR`, TCP 종료와 주요 로그의 상대 순서를 검사한다.
- `make test`는 연결·서버 단위 검사, 기존 TCP 계약, 160개 연결과 읽지 않는 수신자의 진행 격리를 함께 실행한다. GitHub Actions에서는 이 명령을 Linux와 macOS에서 실행하고 Linux ASan·UBSan 경로도 구성한다.
- 종료 검사는 한 정상 연결의 프레임과 종료를 확인하지만 송신 대기열 포화, 여러 느린 연결, SIGINT와 유예 시간 상한은 다루지 않는다.
- 시그널 뒤 새 연결 수락을 차단하는 검사는 없으며 현재 구현도 이를 차단하지 않는다.
- `server_metrics`가 연결 해제보다 먼저 기록되는 순서는 검사에 포함되지만, 그 값이 모든 정리를 반영하는지는 확인하지 않는다.
- 고정된 8회·50ms 안에 출력이 끝나지 않으면 남은 프레임을 소멸자 정리에서 버릴 수 있다.
- callback을 비운 뒤 남은 연결은 application channel/nickname cleanup과
  `client_disconnected` 로그 없이 소멸한다.
- 부호 없는 정수 옵션의 부호·공백·범위 초과는 실행 계약 검사에 포함된다.
- 로그 값의 일반적인 이스케이프와 느린 표준 오류 대상의 영향은 검사하지 않는다.
- allocation 실패, non-standard exception, shutdown 유예 중 새 연결과
  accept/read/write의 실제 wall-clock 상한은 검사하지 않는다.
