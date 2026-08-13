# 소켓에서 채널 메시지까지의 흐름

한 TCP 클라이언트가 접속하고 등록한 뒤, 채널에 들어가 다른 구성원에게 메시지를 보내는 과정은 다음 경로로 이어진다.

현재 frame, command와 numeric의 정확한 subset은
[프로토콜 계약](../docs/protocol-contract.md)이 소유한다. 이 문서는 그 frame이
어느 객체의 상태를 거쳐 다른 연결의 송신 queue가 되는지만 잇는다.

```text
수신 대기 → 연결 수락 → 연결별 입력 조립 → PASS/NICK/USER 등록
       → JOIN으로 채널 상태 변경 → PRIVMSG 방송
       → 대상 연결의 송신 대기열 → 부분 송신 재개
```

## 역할과 소유권

정상적인 흐름에서는 한 IRC 프레임을 여러 TCP 조각으로 받아도 줄바꿈까지 보관한다. `PASS`, `NICK`, `USER` 조건이 충족되면 `001`, `002`, `003`을 차례로 대기열에 넣는다. 첫 사용자가 새 채널에 들어가면 운영자가 되며, 이후 `PRIVMSG #channel :text`는 송신자를 제외한 현재 구성원에게 전달된다. `send(2)`가 일부 바이트만 처리하거나 `EAGAIN`을 반환하면 남은 위치를 저장하고 다음 쓰기 준비 이벤트에서 계속 보낸다.

이 흐름은 네 가지 수명 경계가 파일 디스크립터를 공통 식별자로 사용하면서 만들어진다.

| 경계 | 소유하거나 기록하는 상태 | 구현 |
|---|---|---|
| 전송 | `listen` 소켓, 클라이언트 `Connection`, 이벤트 등록 | [`Server.hpp`](../include/Server.hpp), [`Server.cpp`](../src/Server.cpp) |
| 연결 | 읽기·송신 버퍼, 송신 오프셋, 종료 요청 | [`Connection.hpp`](../include/Connection.hpp), [`Connection.cpp`](../src/Connection.cpp) |
| 클라이언트 | 등록 플래그, 닉네임 색인, PING·PONG과 호출 제한 상태 | [`ClientRegistry.hpp`](../src/ClientRegistry.hpp), [`ClientRegistry.cpp`](../src/ClientRegistry.cpp) |
| IRC 응용 | 채널, 구성원·운영자, 명령 처리와 응답 생성 | [`IrcApplication.cpp`](../src/IrcApplication.cpp), [`RegistrationCommands.cpp`](../src/RegistrationCommands.cpp), [`ChannelCommands.cpp`](../src/ChannelCommands.cpp), [`MessagingCommands.cpp`](../src/MessagingCommands.cpp) |

`Channel`은 소켓을 소유하지 않고 구성원의 정수 파일 디스크립터만 보관한다. 반대로 `Connection`은 닉네임이나 채널을 알지 못한다. 연결을 제거할 때 두 계층을 함께 정리해야 상태가 어긋나지 않는다.

## 계층 사이의 경계

`EventManager`는 준비 상태만 전달하고 소켓은 `Connection`이 소유한다.
`Connection`은 TCP 조각과 부분 송신을 관리하지만 닉네임과 채널을 알지 못한다.
`ClientRegistry`와 `IrcApplication`은 파일 디스크립터를 식별자로 사용하므로,
콜백 뒤에는 이전 포인터를 다시 쓰지 않고 서버 맵에서 연결을 재조회해야 한다.
이벤트 등록 실패 시 맵 삽입까지 되돌리는 이유도 같은 소유권 규칙에 있다.

## 현재 실행 경로

### 1. `listen` 소켓 생성과 이벤트 등록

`Server::start()`는 운영체제에 맞는 `EventManager`를 만들고 IPv4 TCP `listen` 소켓을 읽기 관심으로 등록한다. 소켓에는 `FD_CLOEXEC`, `O_NONBLOCK`, `SO_REUSEADDR`를 적용하며, 지원 플랫폼에서는 `SO_NOSIGPIPE`도 설정한다.

`listen` 이벤트가 오면 `acceptReadyClients()`는 `accept(2)`가 `EAGAIN`이나 `EWOULDBLOCK`을 반환할 때까지 반복한다. 한 번의 준비 알림에서 이미 기다리는 연결을 가능한 만큼 수락한다.

수락 개수 quantum은 없다. 지속적으로 새 연결이 쌓이면 한 listen event가 기존
client event보다 오래 실행될 수 있다. native event 배열의 128개 상한은
`accept()` 반복 횟수를 제한하지 않는다.

### 2. 파일 디스크립터 소유권 이전

새 파일 디스크립터는 다음 순서로 이동한다.

```text
accept가 돌려준 지역 변수 clientFd
→ unique_ptr<Connection>
→ Server::connections_[fd]
```

소켓 설정이 `Connection` 생성 전에 실패하면 예외 처리 경로가 지역 변수의 파일 디스크립터를 닫는다. 객체가 소유권을 넘겨받으면 지역 변수는 `-1`로 바뀌며, 이후 이벤트 등록이나 맵 삽입이 실패하면 지역 `unique_ptr`의 소멸 과정에서 닫는다. 맵 삽입 뒤에는 저장된 `Connection`의 소멸자가 최종 정리를 맡는다. 복사는 허용하지 않고 이동만 지원한다.

서버 맵에 객체를 먼저 넣고 이벤트 관리자에 읽기 관심을 등록한다. 맵 삽입이
실패하면 이벤트 등록을 시작하지 않았고, 등록이 실패하면 맵 원소를 지워
소켓을 닫는다. 두 단계가 성공한 뒤 `acceptedConnections`를 늘리고
`onConnect()`를 호출한다. 응용 콜백에서 던진 `std::exception`을 잡으면
프로세스를 바로 끝내지 않고, 파일 디스크립터로 연결을 다시 찾은 뒤 아직
존재할 때만 종료를 요청한다. non-standard exception은 이 경계가 잡지 않는다.

### 3. IRC 클라이언트 상태 생성

`IrcApplication::onConnect()`는 같은 파일 디스크립터로 `ClientState`를 만든다. `connectedAt`과 `lastActivityAt`에 `steady_clock`의 현재 시점을 넣고 접속 주소를 `host`로 보관한다. 서버 비밀번호가 빈 문자열이면 `passOk`는 처음부터 참이다. 이후 하트비트를 보내면 연결별 `pendingPongToken`과 응답 대기 시점도 이 상태에 기록한다.

```text
Connection: fd를 소유, 읽기 가능, 송신 대기 없음
ClientState: passOk? / hasNick=false / hasUser=false / registered=false
Channel: 아직 이 fd를 참조하지 않음
```

### 4. TCP 조각을 IRC 줄로 조립

읽기 이벤트가 오면 `Connection::readAvailable()`가 `recv()`를 반복한다. 받은 바이트는 `readBuffer_` 뒤에 붙고 `\n`을 찾은 줄만 결과 벡터로 옮긴다. 줄 끝의 `\r`은 제거하며, 완성되지 않은 나머지는 다음 이벤트까지 유지한다.

```text
첫 조각:  PI
둘째 조각: NG :token\r\n
결과 줄:  PING :token
```

완성되지 않은 버퍼나 줄바꿈을 포함한 프레임이 최대 길이를 넘으면 오류를 기록하고 연결 종료를 요청한다. 해당 줄은 응용 계층으로 전달하지 않는다. 기본 최대 길이는 512바이트이다.

`EINTR`는 다시 시도하고 `EAGAIN`과 `EWOULDBLOCK`은 이번 읽기를 마치는 정상 상태로 처리한다. `recv() == 0`이면 상대가 연결을 닫았다고 기록한다.

한 read-ready에서도 수신 byte나 완성 frame 수의 quantum은 없다.
`readAvailable()`은 `EAGAIN`까지 읽은 모든 완성 줄을 먼저
`ReadResult::lines`에 모은다. 뒤의 overlong frame이 `hasError`를 만들면
서버는 오류를 먼저 처리해 같은 결과에 이미 들어간 앞의 정상 줄도 전달하지
않는다. 같은 읽기에서 EOF가 뒤에 관찰돼 `closeRequested`가 먼저 설정되면 첫
line callback 뒤 나머지 줄 처리를 중단할 수도 있다.

rate limit는 이 vector를 만든 뒤 `onLine()`에서 줄마다 적용된다. 따라서
transport의 `recv` 반복, `readBuffer_`와 결과 vector 할당, 단일 callback의
CPU·메모리 사용량을 제한하지 않는다.

### 5. 문법 해석과 명령 처리

서버는 완성된 줄마다 `linesReceived`를 늘리고 `onLine()`을 호출한다. `IrcApplication::onLine()`은 먼저 `lastActivityAt`을 갱신한 뒤 [`IrcMessage.cpp`](../src/IrcMessage.cpp)의 `parseLine()`을 호출한다.

해석에 실패하면 `417`을 대기열에 넣는다. 성공하면 명령 호출 시간 창에 기록하고 상한을 넘지 않은 명령만 `commandsHandled`에 포함해 전달한다. 문법이 잘못된 줄도 활동 시각은 갱신하지만 호출 제한과 명령 지표에는 들어가지 않는다.

### 6. 등록 상태 전이

등록 전에는 `PASS`, `NICK`, `USER`, `PING`, `PONG`, `QUIT`를 처리한다. 그 밖의 명령은 `451 You have not registered`로 거부한다.

```text
passOk && hasNick && hasUser && !registered
```

올바른 `PASS`는 `passOk`를, 유효하고 중복되지 않은 `NICK`은 닉네임 색인과 `hasNick`을, 인자가 네 개 이상인 `USER`는 사용자 정보와 `hasUser`를 갱신한다. 어느 명령이 마지막 조건을 채웠든 `maybeRegister()`가 `registered=true`로 바꾸고 `001`, `002`, `003`을 순서대로 넣는다.

잘못된 비밀번호에는 `464`를 넣은 뒤 종료를 요청한다. 서버는 읽기 관심을 제거하지만 이미 들어간 `464`가 있으면 쓰기 관심을 유지한다.

### 7. 채널 생성과 입장

등록된 클라이언트가 `JOIN #room`을 보내면 [`ChannelCommands.cpp`](../src/ChannelCommands.cpp)가 채널 이름을 확인하고, 없으면 새 채널을 만든다. 초대 전용 채널은 닉네임 초대 상태를 검사한다. 입장 전 채널이 비어 있었다면 새 구성원을 운영자로 추가한다.

입장이 끝나면 일회성 초대 기록을 지우고 현재 구성원 모두에게 `JOIN`을 보낸다. 송신자 자신도 포함된다. 이어 주제 응답과 `353`, `366` NAMES 응답을 넣는다. 마지막 구성원이 나가면 채널 객체를 삭제하므로 주제, 초대와 모드도 함께 사라진다.

### 8. 채널 메시지 전달

[`MessagingCommands.cpp`](../src/MessagingCommands.cpp)는 `PRIVMSG` 대상을 쉼표로 나눠 차례로 처리한다. 채널 대상이면 채널이 존재하고 송신자가 구성원인지 확인한다. 통과하면 송신자의 hostmask를 붙인 프레임을 만들고 `broadcastToChannel()`을 호출한다.

`broadcastToChannel()`은 현재 구성원 목록을 `vector<int>`로 복사한 뒤 송신자를 제외하고 각 연결에 `Server::sendTo()`를 호출한다. 방송 중 연결 제거가 채널의 반복자를 무효화하지 않도록 만든 구조이다. 다만 방송은 하나의 트랜잭션이 아니다. 앞선 수신자의 대기열 추가가 성공한 뒤 다른 수신자에서 실패해도 이전 결과를 되돌리지 않는다.

이는
`stl-container/architecture/compatibility-exception-and-iterator-contract.md`
에서 처음 정리한 반복자 무효화와 실패 뒤 상태를 실제 응용 상태에 옮긴
예다. 원본 `set`을 순회하며 callback을 부르지 않고 snapshot `vector`를
순회해 구조 변경과 반복자 수명을 분리하지만, O(m) 복사·추가 공간과 snapshot
할당 실패가 새 비용과 실패 지점이 된다.

snapshot은 `broadcastToChannel()` 자신의 반복자만 보호한다. `sendRaw()`은
메모리에 줄을 넣는 데서 끝나지 않고 `Server::sendTo()`를 거쳐 이벤트 관심을
즉시 갱신한다. 새 frame이 대기열 상한보다 커서 pending 0인 채 거부되거나
`updateFd()`가 실패하면, 같은 호출 스택에서 `disconnect()`와
`IrcApplication::onDisconnect()`가 실행돼 client registry와 channel map을
바꿀 수 있다.

송신 호출 바깥에서 보관한 application 참조도 별도 수명 규칙이 필요하다.
등록 응답은 nickname을 값으로 보관하고 각 frame 뒤 성공 여부를 확인한다.
heartbeat는 응답 대기 상태를 먼저 기록하되 송신이 실패하면 즉시 반환한다.
`JOIN`·`KICK`과 복합 `MODE`는 방송 뒤 fd와 channel 이름으로 상태를 다시 찾고,
송신 과정에서 연결이 정리됐으면 이후 응답이나 모드 변경을 중단한다.

`messagesRelayed`는 유효한 `PRIVMSG` 대상 하나의 라우팅 처리가 끝날 때 한 번 증가한다. 채널에 송신자 외의 구성원이 없어 실제 대기열 추가가 없을 때도 증가하며, 채널의 실제 수신자 수만큼 늘어나지도 않는다. 응답 helper는 `Server::sendTo()`의 결과를 전달하지만 메시지 handler는 이 값을 지표에 반영하지 않는다. 따라서 이 값은 상대가 받은 메시지 수가 아니라 유효한 대상의 라우팅 처리 횟수이다.

### 9. 송신 대기열과 부분 송신

IRC 응답은 최종적으로 `Connection::queueLine()`에 도달한다. 기존 줄 끝의 CR/LF를 제거하고 정확히 `\r\n` 하나를 붙인다. 새 데이터까지 합친 대기 바이트가 상한을 넘으면 데이터를 추가하지 않고 종료를 요청한다.

쓰기 준비 이벤트가 오면 `flushPending()`은 현재 오프셋부터 `send()`를 반복한다. 대기열 상한은 `pending <= limit && added <= limit - pending`으로 계산하며, `queueLine()`은 본문과 CRLF를 나눠 검사한다.

이 상한은 `writeBuffer_.size() - writeOffset_`인 논리적 미송신 byte다.
`std::string::capacity()`, 이미 보낸 prefix가 압축되기 전까지 차지하는 저장
공간과 process resident memory를 제한하지 않는다. 한 write-ready의 송신 byte
quantum도 없어서 queue 완료나 `EAGAIN`까지 한 연결을 계속 처리한다.

```text
send > 0       → writeOffset_ 증가, 남은 데이터 계속 시도
EINTR          → 같은 위치에서 재시도
EAGAIN         → 버퍼와 오프셋 유지, 다음 Write 이벤트 대기
기타 오류      → 종료 요청, Server가 즉시 연결 제거
전부 송신 완료 → 버퍼와 오프셋 초기화, Write 관심 제거
```

종료 요청이 있는 연결은 새 입력을 읽지 않는다. 출력이 남아 있으면 쓰기만 구독하고, 모두 비우면 `Server::disconnect()`로 넘어간다. 잘못된 비밀번호, 호출 제한, PING 응답 제한과 정상 종료가 이 경로를 공유한다. 쓰기 관심 갱신이 실패하면 해당 연결을 즉시 제거하고 `sendTo()`는 실패를 반환한다.

## 실패와 정리

| 실패 지점 | 처리 | 영향 범위 |
|---|---|---|
| `listen` 이벤트 오류 | 예외를 최상위로 전달 | 서버 소멸자가 연결과 `listen` 소켓 정리 |
| `accept()`의 `EINTR` | 재시도 | 상태 변화 없음 |
| `accept()`의 `EAGAIN` | 수락 반복 종료 | 다음 준비 이벤트 대기 |
| 최대 연결 수 도달 | 새 파일 디스크립터를 즉시 닫음 | 기존 연결 유지, IRC 거부 프레임 없음 |
| 새 연결 이벤트 등록 실패 | 서버 맵에서 연결을 지워 fd를 닫음 | 연결·응용 상태는 남기지 않음. backend 내부 kernel/map 부분 변경은 별도 한계 |
| 입력 줄 상한 초과 | 해당 연결 종료 요청 | 미완성 입력 삭제, 명령 미실행 |
| 입력 buffer·결과 vector 할당 실패 | 연결 단위 결과를 만들지 못하고 예외 전파 | 최상위 `std::exception` 경로면 서버 전체 종료; 별도 실패 주입 없음 |
| IRC 문법 오류 | `417` 응답 | 연결 유지 |
| 잘못된 `PASS` | `464` 뒤 종료 요청 | 가능하면 응답을 보낸 뒤 제거 |
| 대상 송신 대기열 초과 | 해당 대상에 종료 요청, 거부 횟수 증가 | 다른 대상 처리 계속, 롤백 없음 |
| 송신 오류 | 해당 연결 즉시 제거 | 남은 대기 바이트 폐기 |
| 관심 이벤트 갱신 실패 | 오류 보고 뒤 해당 연결 제거 | 다른 연결과 수신 소켓은 유지 |
| 상대 `hangup` | 출력이 없으면 제거 | 출력이 있으면 송신 결과에 따라 처리 |

실제 제거 순서는 다음과 같다.

```text
EventManager에서 fd 제거
→ Server::connections_에서 unique_ptr를 지역 변수로 이동하고 맵에서 삭제
→ closedConnections 증가
→ onDisconnect(Connection&, reason)
   ├─ 공통 채널 동료에게 QUIT 요청
   ├─ 모든 채널에서 fd 제거, 빈 채널 삭제
   └─ 닉네임 색인과 ClientState 삭제
→ 지역 unique_ptr 소멸
→ Connection 소멸자가 fd close
```

종료 콜백이 실행되는 동안 `Connection` 객체와 파일 디스크립터 값은 유효하지만,
해당 객체는 이미 서버 맵에서 빠졌다. 제거되는 자기 연결에는 새 응답을
넣을 수 없고 동료 연결만 갱신할 수 있다. 연결·줄 콜백은 반대로 서버 맵에
있는 객체를 받지만 실행 중 직접 연결을 제거할 수 있다. 서버는 콜백 뒤
호출 전 포인터를 쓰지 않고 fd로 다시 찾아 해제된 객체 접근을 피한다.

지역 `unique_ptr`가 종료 callback이 끝날 때까지 실제 fd를 열어 두므로 application
cleanup 중 같은 숫자가 커널에서 재사용되는 것도 막는다. 그러나 callback이
연결을 지운 뒤 reentrant `pollOnce()`로 새 연결을 수락하는 사용자 정의 경로에는
세대 token이 없다. 그 경우 같은 정수 fd 재조회가 새 `Connection`을 이전
연결로 오인할 수 있다. 기본 `IrcApplication` callback은 event loop를
재진입하지 않지만 `Server` API 자체가 이 ABA를 막지는 않는다.

## 검증 범위와 제한

- [`irc_smoke.sh`](../tests/irc_smoke.sh)는 실제 서버 프로세스가 루프백 연결을 받는지 확인한다.
- [`irc_contract.py`](../tests/irc_contract.py)와 [`irc_smoke_client.py`](../tools/irc_smoke_client.py)는 `PI`와 나머지 바이트를 나눠 보낸 뒤 정확한 `PONG`을 확인한다. 임의 개수의 조각이나 모든 최대 길이 경계를 검사하지는 않는다.
- 등록 응답, 첫 사용자의 채널 입장과 운영자 표시, 두 클라이언트 사이의 채널 메시지 프레임은 실제 소켓으로 검사한다.
- 주입형 [`connection_test.cpp`](../tests/connection_test.cpp)는 짧은 `send()`, `EINTR`, `EAGAIN`·`EWOULDBLOCK`, 0 반환과 터미널 오류 뒤의 오프셋 재개를 확인한다.
- 실제 커널 송신 버퍼 포화와 16KiB를 넘긴 버퍼 접두부 압축은 별도로 검사하지 않는다.
- 채널 방송의 모든 대상 전달, 대상별 대기열 실패, 송신자 비수신을 한꺼번에 확인하지 않는다.
- [`server_lifetime_test.cpp`](../tests/server_lifetime_test.cpp)는 이벤트 등록·갱신 실패와 콜백이 연결을 제거한 뒤 예외를 던지는 순서를 검사한다.
- [`application_lifetime_test.cpp`](../tests/application_lifetime_test.cpp)는 응답 실패로 application 상태가 정리된 뒤 등록과 복합 MODE 처리가 계속되지 않는지 확인한다.
- [`irc_event_fairness.py`](../tests/irc_event_fairness.py)는 160개 연결이 모두 PONG을 받고, 읽지 않는 수신자에게 메시지가 쌓여도 별도 연결의 PING이 진행하는지 확인한다.
- 160-peer와 4096-message 유한 시나리오는 eventual progress와 한 slow
  receiver의 격리를 확인한다. 지속적인 accept/read/write 폭주에서 starvation,
  연결별 latency와 throughput 상한을 증명하지 않는다.
- 구현은 IRC 전체 사양이 아닌 명령과 응답의 일부만 제공한다. 채널 상태는 메모리에만 있으며 운영자가 나간 뒤 자동 승계하는 규칙도 없다.

입력 경계도 두 계층에서 다르다. 실제 소켓 입력은 `Connection`의 512바이트
프레임 상한을 거치지만 독립 함수 `IrcMessage::consumeBuffer()`는 4096바이트를
넘긴 미완성 입력만 버린다. 소켓 경로의 계약을 독립 파서 함수의 상한으로
설명하면 안 된다. 한 읽기 묶음에 정상 줄과 너무 긴 줄이 함께 들어오면 해당
묶음의 정상 줄도 응용 계층에 전달되지 않을 수 있다.

응답 생성기는 모든 명령 조합에 대해 CRLF 포함 512바이트를 일괄 강제하지
않는다. 새 응답이나 사용자 입력을 조합하는 명령을 추가할 때는 최종 프레임
길이와 송신 대기열 상한을 각각 확인해야 한다.

현재 채널 모델은 다음 정책을 완전한 IRC 호환으로 약속하지 않는다.

- 초대는 canonical nickname 문자열로 저장하고 nickname 변경·disconnect 때
  옮기거나 지우지 않는다. 따라서 이전 nickname의 초대가 남아 나중에 같은
  nickname을 얻은 다른 연결이 사용할 수 있다.
- 마지막 운영자가 나가도 남은 구성원에게 운영자 권한을 자동 승계하지 않는다.
- IRC 전용 대소문자 대응 규칙을 구현하지 않는다.
- 빈 `TOPIC`과 인자 없는 `NAMES`의 모든 표준 응답 조합을 제공하지 않는다.
