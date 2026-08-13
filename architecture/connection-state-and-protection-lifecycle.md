# 연결 상태와 보호 장치의 수명

TCP 연결이 수락된 뒤 제거되기까지는 등록 상태, 시간 제한, 명령 호출 횟수, 송신 대기열과 전체 연결 수가 함께 작동한다.

```text
등록 제한
heartbeat와 PONG 대기
명령 호출 횟수 제한
송신 대기열 상한
최대 활성 연결 수
종료 요청과 실제 연결 제거
```

이 기능들은 독립된 미들웨어가 아니다. 프로토콜과 시간 상태는 `ClientState`에, 입력·출력 버퍼와 종료 상태는 같은 파일 디스크립터를 소유하는 `Connection`에 있다. 최대 연결 수는 `Server`가 보관하는 연결 맵의 크기로 판단한다.

등록·channel 명령의 wire 의미는
[프로토콜 계약](../docs/protocol-contract.md)에 두고, 여기서는 같은 fd를
가리키는 객체와 인덱스가 성공·실패 뒤 어떤 상태로 남는지만 다룬다.

## 상태를 나누는 세 계층

| 계층 | 핵심 상태 | 시작 | 종료 |
|---|---|---|---|
| `Server` | 활성 `Connection` 맵, 최대 연결 수, 누적 연결 지표 | `accept()` 뒤 맵 삽입 | `disconnect()`가 맵에서 제거 |
| `Connection` | 입력·출력 버퍼, 송신 오프셋, 대기열 상한, `closeRequested` | 객체가 `accept()` 파일 디스크립터를 인수 | 소멸자가 파일 디스크립터를 닫음 |
| `ClientState` | 등록 플래그, 단조 시각, PING 토큰, 명령 시각 목록 | `onConnect()` | `onDisconnect()`에서 레지스트리 삭제 |

선언은 [`Server.hpp`](../include/Server.hpp), [`Connection.hpp`](../include/Connection.hpp), [`ClientRegistry.hpp`](../src/ClientRegistry.hpp)에서 확인할 수 있다. `Channel`도 구성원을 파일 디스크립터로 식별한다. 연결 하나를 제거할 때 이벤트 등록, 소켓 소유권, IRC 상태, 닉네임 색인과 채널 구성원을 함께 정리해야 하는 이유이다.

## 보호 장치의 구성

서버는 다음 실행 옵션을 시작 전에 검사한다.

```text
--idle-timeout
--ping-timeout
--registration-timeout
--rate-limit
--max-pending-bytes
--max-connections
```

`RuntimeConfig`는 숫자를 ASCII 십진수로만 받아 목적 타입의 상한을 넘기 전에
거부한다. `ClientRegistry`는 등록·활동 시각, PING 토큰과 호출 시각 목록을
소유하고, `Connection`은 송신 대기량과 부분 송신 오프셋을 소유한다. 서버 맵과
이벤트 등록이 함께 실패할 수 있으므로 등록 순서와 롤백도 연결 수명의 일부이다.

## 연결 상태 전이

실제 구현은 하나의 enum이 아니라 여러 필드의 조합으로 상태를 표현한다.

| 현재 상태 | 계기 | 처리 | 다음 상태 또는 종료 |
|---|---|---|---|
| 수락됨·미등록 | `onConnect()` | 연결·활동 시각 기록, 비밀번호가 비면 `passOk=true` | 등록 정보 대기 |
| 미등록 | 올바른 `PASS` | `passOk=true` | 나머지 `NICK`·`USER` 대기 |
| 미등록 | 유효한 `NICK` | 기본 C locale `tolower` 색인 갱신, `hasNick=true` | 나머지 조건 대기 |
| 미등록 | 인자 네 개 이상의 `USER` | user·realname 기록, `hasUser=true` | 나머지 조건 대기 |
| 미등록 | 세 조건 충족 | `registered=true`, `001`·`002`·`003` 대기열 추가 | 등록됨 |
| 미등록 | 등록 제한 도달 | `451 Registration timeout` 추가, 종료 요청 | 출력 배출 뒤 제거 |
| 모든 연결 | 유휴 제한 도달 | PING 추가, `awaitingPong=true` | PONG 대기 |
| PONG 대기 | 토큰이 일치하는 `PONG` 명령 | 대기 플래그와 토큰 해제 | 활성 또는 유휴 |
| PONG 대기 | 빈 값이나 다른 토큰의 `PONG` | 대기 상태 유지 | PONG 대기 |
| PONG 대기 | 응답 제한 도달 | `ERROR :Ping timeout` 추가, 종료 요청 | 출력 배출 뒤 제거 |
| 파싱 성공 명령 | 명령 수 상한 초과 | `439` 추가, 종료 요청 | 출력 배출 뒤 제거 |
| 모든 연결 | 송신 대기열 상한 초과 | 새 바이트 거부, drop 증가, 종료 요청 | 기존 출력 배출 뒤 제거 |
| 종료 요청 | 출력 남음 | 읽기 관심 제거, 쓰기만 진행 | 출력 배출 중 |
| 종료 요청 | 출력 없음 | 이벤트 등록과 소유 상태 제거 | 종료 |
| 모든 연결 | 준비 상태·수신·송신 오류 | 즉시 `disconnect()` | 남은 출력이 폐기될 수 있음 |

연결 확인 검사에는 `registered` 조건이 없다. 등록 제한에 아직 도달하지 않았더라도 유휴 시간이 먼저 지나면 미등록 연결에도 PING을 보낼 수 있다. 기본값에서는 등록 제한이 30초, 유휴 제한이 120초라 보통 등록 제한이 먼저 작동하지만, 실행 옵션으로 두 값을 바꾸면 순서가 달라진다.

## 등록 제한

[`RegistrationCommands.cpp`](../src/RegistrationCommands.cpp)의 `maybeRegister()`는 다음 조건을 사용한다.

```text
passOk && hasNick && hasUser
```

명령 순서는 고정되어 있지 않는다. 세 조건을 마지막으로 완성한 명령이 등록 응답을 발생시킨다. 비밀번호가 설정된 서버에서 `PASS`를 보내지 않으면 `passOk`가 거짓으로 남는다.

미등록 상태에서 `now - connectedAt >= registrationTimeoutSeconds`가 되면 `451 Registration timeout`을 대기열에 넣고 종료를 요청한다. 기본값은 30초이다. 현재 시각은 `std::chrono::steady_clock`에서 가져오므로 시스템의 달력 시각이 바뀌어도 경과 시간이 뒤로 가지 않는다. 실제 종료 시점은 여전히 이벤트 대기와 유지보수 주기의 영향을 받는다.

등록 중 일부 명령을 보냈다고 마감 시각을 연장하지 않으며, 완성되지 않은 IRC 줄도 특별히 다루지 않는다. 잘못된 `PASS`는 제한 시간을 기다리지 않고 `464 Password incorrect`를 넣은 뒤 즉시 종료 요청 상태로 바뀐다.

## 활동 시각과 연결 확인

`IrcApplication::onLine()`은 IRC 문법을 해석하기 전에 `lastActivityAt`을 갱신한다. 따라서 `417`을 받는 문법 오류 줄도 유휴 시간을 다시 시작한다. 반면 줄바꿈에 이르지 않은 TCP 바이트 조각은 활동으로 기록하지 않는다.

[`IrcApplication.cpp`](../src/IrcApplication.cpp)의 `maintainClient()`는 미등록 연결의 등록 제한을 먼저 검사한 뒤, 등록 여부와 관계없이 연결 확인 상태를 처리한다. PONG 대기 중에는 응답 제한을 확인하고, 대기 중이 아니면서 유휴 제한을 넘으면 `heartbeat-<fd>-<counter>` 형식의 PING을 보낸다. 카운터는 프로세스 안에서 증가하며 생성한 문자열을 `pendingPongToken`에 보관한다.

[`RegistrationCommands.cpp`](../src/RegistrationCommands.cpp)의 `handlePong()`은 서버가 현재 응답을 기다리는지, 매개변수가 하나인지, 그 값이 저장한 토큰과 같은지를 모두 확인한다. 빈 `PONG`이나 다른 토큰은 연결을 바로 끊지 않지만 대기 상태도 해제하지 않는다. PONG 대기 중 다른 명령을 보내면 활동 시각은 갱신되지만 응답 마감은 그대로 유지되므로, 제한 시간 안에 올바른 토큰이 오지 않으면 연결을 종료한다.

| 설정 | 기본값 | 의미 |
|---|---:|---|
| `idle-timeout` | 120초 | 마지막 완성 줄 이후 PING을 넣기까지의 시간 |
| `ping-timeout` | 30초 | PING을 넣은 뒤 `PONG` 명령을 기다리는 시간 |
| `registration-timeout` | 30초 | accept 뒤 등록을 완료할 수 있는 시간 |

CLI는 세 값을 부호나 공백 없는 십진 숫자로 받아 1 이상 86400 이하로 제한한다. 내부에는 유휴 값이 0 이하이면 연결 확인을 끄는 분기가 있지만 현재 CLI로는 그 상태를 만들 수 없다.

## 명령 호출 횟수 제한

현재 방식은 토큰 버킷이 아니라 연결별 슬라이딩 단조 시각 목록이다.

```text
1. now - oldest >= window인 항목을 앞에서 제거
2. 현재 now를 뒤에 추가
3. count != 0이고 deque.size() > count이면 제한
```

기본값 24:3에서는 같은 창 안의 24번째 명령까지 허용하고 25번째에 `439 Command rate limit exceeded`를 넣는다. 파싱에 성공한 알 수 없는 명령과 등록 전 금지 명령도 목록에 포함된다. 문법 해석에 실패한 줄은 활동 시각만 갱신하고 명령 목록과 `commandsHandled`에는 포함하지 않는다. 목록의 시각도 `steady_clock::time_point`이므로 시스템 시각 조정이 창을 늘리거나 줄이지 않는다.

`--rate-limit=0:SECONDS`는 제한을 끄며 시간 창은 양수여야 한다. 제한 길이는 초 단위로 설정하지만 각 명령 시점은 `steady_clock`이 제공하는 정밀도로 저장한다. 정확히 창 길이 이상 지난 항목은 제거하며, 제한이 발생하면 같은 수신 결과에 뒤이어 있던 완성 줄도 더 이상 전달하지 않는다.

## 송신 대기열 상한

아직 보내지 않은 바이트 수는 다음과 같다.

```text
pendingBytes = writeBuffer.size - writeOffset
```

이는 논리적으로 미송신인 byte 수다. `writeBuffer.capacity()`, allocator
overhead, 이미 보낸 prefix가 16KiB 압축 조건 전까지 차지하는 공간과 실제
resident memory를 재지 않는다. 따라서 연결별 상한을 모두 더해도 process
memory hard limit가 되지 않는다.

`queueRaw()`은 원시 바이트 수를 그대로 검사한다. `queueLine()`은 기존 줄 끝의 CR/LF를 제거한 본문과 새 `\r\n` 두 바이트를 차례로 검사한다. 검사는 `pending <= limit && added <= limit - pending` 형태라 `size_t` 덧셈이 순환하지 않는다. 본문을 확인한 뒤 CRLF를 별도로 확인하므로 `line length + 2`도 먼저 계산하지 않는다.

상한을 넘으면 새 메시지는 들어가지 않고 `outbound queue limit exceeded` 종료 요청이 설정된다. `Server::sendTo()` 또는 `queueRawTo()`는 `outboundQueueDrops`를 한 번 늘린다. 기존 출력이 있으면 쓰기 이벤트에서 배출을 시도하며, 버퍼가 비거나 송신 오류가 나면 연결을 제거한다. 관심 이벤트 갱신 자체가 실패하면 전송 성공으로 보고하지 않고 해당 연결을 정리한다.

응용 계층의 `sendRaw()`은 `Server::sendTo()`의 결과를 반환한다. 등록·heartbeat와 상태를 이어서 사용하는 channel 명령은 실패를 확인해 중단하거나 상태를 다시 찾는다. 방송 helper는 한 수신자의 대기열 추가가 실패해도 다른 수신자 처리를 계속하므로, 호출한 명령 처리기는 어느 대상의 추가가 실패했는지 구분하지 않는다.

0의 의미는 두 옵션에서 다르다.

| 옵션 | 0을 전달했을 때 |
|---|---|
| `--max-connections=0` | 상한 검사를 건너뛰므로 무제한 |
| `--max-pending-bytes=0` | `Connection` 생성자가 기본값 1048576으로 바꾸므로 1MiB |

## 최대 연결 수

`acceptReadyClients()`는 새 파일 디스크립터를 받은 다음 현재 연결 수와 상한을 비교한다.

```text
server_error: connection rejected: max connection count reached
→ 방금 accept한 fd close
→ accept 루프 계속
```

거부된 연결은 `Connection`이나 `ClientState`를 만들지 않고 `acceptedConnections`에도 포함하지 않는다. IRC 오류 프레임을 보내지 않으므로 클라이언트는 TCP 연결 직후 종료만 관찰할 수 있다. 이 검사는 listen backlog를 제한하는 기능이 아니며, 커널이 준비한 연결을 서버가 차례로 받아 닫는 방식이다.

연결 객체를 서버 맵에 넣은 뒤 이벤트 등록을 시도한다. 등록이 실패하면 맵
원소를 즉시 지워 파일 디스크립터를 닫고, 연결 수와 응용 상태는 증가시키지
않는다. 맵 삽입이 먼저 실패한 경우에는 커널 등록을 아직 시작하지 않았으므로
되돌릴 이벤트 상태가 없다.

## 종료 요청과 소켓 종료

`Connection::requestClose()`는 파일 디스크립터를 닫지 않는다. 종료 플래그와 이유만 기록하고, `Server::refreshInterest(fd)`가 현재 연결을 다시 찾아 다음 관심 상태를 정한다.

```text
closeRequested=false, 출력 없음 → Read
closeRequested=false, 출력 있음 → Read | Write
closeRequested=true, 출력 있음  → Write
closeRequested=true, 출력 없음  → disconnect
```

잘못된 `PASS`, 명령 호출 제한, 등록 제한, PING 응답 제한, `QUIT`, 정상적인 서버 종료는 대기 중인 출력을 보낼 기회를 얻는다. 반면 수신·송신 오류나 이벤트 오류는 즉시 `disconnect()`로 이어져 남은 바이트를 버릴 수 있다. 관심 이벤트 갱신 실패도 연결 하나의 즉시 정리로 처리한다. 따라서 종료 요청과 실제 소켓 종료는 같은 시점이 아니며, 모든 종료 경로가 대기열을 끝까지 비운다고 보장할 수도 없다.

## 연결 제거 순서

제거 과정은 [`Server.cpp`](../src/Server.cpp)와 [`ApplicationSupport.cpp`](../src/ApplicationSupport.cpp)에 나뉜다.

```text
1. EventManager::removeFd(fd)
2. unique_ptr<Connection>을 Server 맵에서 지역 변수로 이동
3. 맵 엔트리 삭제
4. closedConnections 증가
5. onDisconnect(connection, reason)
   5-1. 등록된 사용자면 공통 채널 동료를 중복 제거해 QUIT 대기열 추가
   5-2. 모든 채널에서 fd 제거
   5-3. 빈 채널 삭제
   5-4. 닉네임 색인과 ClientState 삭제
6. 지역 unique_ptr 소멸
7. Connection 소멸자에서 fd close
```

콜백이 실행되는 동안에는 `Connection&`에서 파일 디스크립터와 접속 주소를 읽을 수 있다. 다만 해당 연결은 이미 서버 맵에서 빠졌으므로 자기 자신에게 새 응답을 넣을 수 없다. 연결·줄 콜백은 실행 중 현재 연결을 제거할 수 있으므로 서버는 콜백 뒤 기존 포인터를 쓰지 않고 fd로 다시 조회한다. 이벤트 등록 제거가 실패해도 오류를 기록한 뒤 사용자 공간 상태와 소켓 소유권 정리는 계속한다.

등록되지 않은 연결은 닉네임 색인만 정리하고 동료에게 `QUIT`을 방송하지 않는다. 등록된 사용자가 여러 채널에 있었다면 `set<int>`로 동료를 중복 제거해 `QUIT`을 한 번씩 요청한다. 빈 채널은 순회가 끝난 뒤 삭제한다.

지역 `unique_ptr<Connection>`은 `onDisconnect()`가 nickname·channel 상태를
지우는 동안 fd를 닫지 않는다. 따라서 그 cleanup 도중 커널이 같은 숫자를 새
연결에 주는 일은 막는다. callback이 끝나 객체가 소멸한 뒤에는 숫자를 재사용할
수 있다. 일반적인 callback 반환 뒤 `findConnection(fd)`는 해제 포인터 접근을
막지만 연결 generation까지 비교하지는 않는다. 사용자 callback이 event loop를
재진입해 새 연결을 받는 경우에는 같은 fd가 새 객체를 가리키는 ABA가 가능하며,
현재 lifetime test는 실제 fd 재사용을 만들지 않는다.

## 예외 뒤 여러 상태가 함께 남는다는 보장은 없다

연결과 IRC 상태 변경은 하나의 transaction으로 구현되지 않았다.

- `ClientRegistry::setNickname()`은 이전 nickname index를 먼저 지우고 client
  문자열과 새 map 항목을 차례로 갱신한다. 문자열 또는 map allocation이
  실패하면 `ClientState`와 역색인이 서로 어긋날 수 있다.
- disconnect cleanup은 client 복사, peer `set`, channel 이름 `vector`와
  outbound frame을 할당할 수 있다. `onDisconnect()`의 `std::exception`은
  server가 보고하고 socket 정리는 계속하지만, nickname/channel cleanup의
  중간 결과를 rollback하지 않는다.
- `readBuffer_` append와 frame `substr`, 결과 vector와 native event vector
  할당은 client callback catch보다 앞에서 실패할 수 있다. 유효 범위
  `readBuffer_.erase()` 자체는 할당 지점이 아니지만, 현재 frame을 buffer에서
  지운 뒤 `result.lines.push_back()`이 실패하면 그 변경을 되돌리지 않는다.
  이런 예외는 연결 하나의 protocol 오류가 아니라 상위 event loop로 전파된다.
- `queueLine()`은 본문과 CRLF를 두 번의 string append로 commit한다. 본문
  append 뒤 CRLF append allocation이 실패하면 이미 들어간 본문을 transaction
  단위로 rollback하는 코드가 없다.
- connect, line, disconnect callback 경계는 `std::exception`만 잡는다.
  non-standard exception은 선택한 연결에 격리되지 않는다.
- `sendRaw()`은 `sendTo()`의 이벤트 관심 갱신까지 동기 실행한다. pending
  output 없이 queue가 거부되거나 `updateFd()`가 실패하면 `disconnect()`가
  재진입해 `onDisconnect()`에서 `ClientState`와 channel map을 바꿀 수 있다.
  응답 helper는 이 성공 여부를 호출자에게 돌려주고, 등록·heartbeat·JOIN·KICK과
  여러 MODE를 처리하는 경로는 송신 뒤 fd와 channel 이름으로 상태를 다시 찾거나
  더 이상의 명령 처리를 중단한다. 송신 전에 오래 보관해야 하는 nickname과
  channel 이름은 값으로 복사한다.

그러므로 “fd는 결국 RAII로 닫힌다”와 “nickname, channel, invite, operator
상태가 강한 예외 보장으로 원상 유지된다”는 다른 주장이다. 현재 구현은 뒤의
보장을 제공하지 않는다. 초대 문자열의 nickname 변경·재사용과 마지막 operator
미승계 정책은 [프로토콜 계약](../docs/protocol-contract.md)에 정리했다.

## 확인된 범위와 남은 제한

- [`irc_contract.py`](../tests/irc_contract.py)는 부호·공백·범위 초과 CLI 입력, 기본 24:3 설정의 호출 제한, 일치하는 PONG 뒤 연결 유지와 다른 토큰의 제한 시간 종료를 검사한다.
- [`connection_test.cpp`](../tests/connection_test.cpp)는 `size_t` 산술, CRLF 경계, 부분 송신, `EINTR`, `EAGAIN`, 0 반환과 터미널 오류 뒤의 오프셋을 검사한다.
- [`server_lifetime_test.cpp`](../tests/server_lifetime_test.cpp)는 이벤트 등록·갱신 실패, 송신 대기열 거부 직후 정리와 콜백의 연결 제거 뒤 예외를 주입한다.
- [`application_lifetime_test.cpp`](../tests/application_lifetime_test.cpp)는 작은 송신 한도와 이벤트 관심 갱신 실패에서 등록 기록과 복합 MODE 처리가 연결 정리 뒤 계속되지 않는지 확인한다.
- [`irc_event_fairness.py`](../tests/irc_event_fairness.py)는 160개 연결의 PONG이 모두 진행하고, 읽지 않는 수신자에게 메시지가 쌓이는 동안 별도 연결이 응답하는지 확인한다.
- 등록 제한의 실제 만료, 미등록 연결의 연결 확인과 최대 연결 수 N/N+1 경계는 직접 검사하지 않는다.
- 송신 대기열이 넘친 수신자만 종료 요청 상태가 되지만, 방송 전체의 부분 성공과 대기열 거부 횟수를 소켓 수준에서 확인하는 검사는 없다.
- 16KiB를 넘겨 보낸 접두부를 지우는 버퍼 압축 분기는 단위 검사하지 않는다.
- 문법 오류 줄은 유휴 시간을 연장하지만 호출 제한에는 포함되지 않는다.
- `max-pending-bytes=0`과 `max-connections=0`의 의미는 서로 다르다.
- `rate-limit` 횟수를 0으로 두면 제한 판정은 꺼지지만 각 명령 시각은 계속
  `deque`에 넣고 창 밖의 값을 제거한다. 제한을 끈 고요율 장기 연결의 메모리
  상한은 별도로 측정하지 않았다.
- 등록·유휴·PING 마감은 단조 시계를 사용하지만 원하는 시각 순서를 주입하는
  가상 시계 회귀는 없다.
- allocation 실패, non-standard exception, 실제 fd 재사용과 nickname·channel
  cleanup의 중간 실패를 주입하는 검사는 없다.
- application 수명 검사는 등록 응답과 복합 MODE의 중단을 확인한다. 모든 channel 명령과 방송 대상별 실패 조합을 각각 열거하지는 않는다.
