# Thread 08 — Reentrant server and application cleanup

부제: 재진입 가능한 서버와 애플리케이션 정리

## 1. Thread 목표

callback, interest update, response enqueue가 현재 처리 중인 connection과 application aggregate를 동기적으로 제거할 수 있다는 사실을 중심으로, descriptor relookup·rollback·failure propagation·command continuation 중단 invariant를 fix/test 쌍으로 복원합니다.

Source에서 확정된 significance:

> The difficult integration problem is that a seemingly local send or callback can synchronously remove the connection, client record, memberships, and possibly the channel currently referenced by the caller. The server fix restores descriptor and event-registry ownership; the application fix generalizes the rule to domain state. The follow-up commit and test refine the chosen semantics: earlier mutations are not rolled back transactionally, but command processing must stop immediately after the actor's lifecycle ends.

이 문서의 source-confirmed 문장, commit map, SHA, subject, importance, tags와 원문 역할은 변경하지 않았습니다. 아래 학습 기록은 지정 branch의 각 exact SHA에서 확인한 code diff를 기준으로 작성했습니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 초기 erase-before-callback cleanup은 무엇을 보장하고 무엇을 아직 보장하지 않는가?
- callback self-disconnect 뒤 raw pointer/reference가 왜 즉시 위험해지는가?
- accept/listener registration failure에서 map, event backend, fd lifetime을 어떻게 rollback하는가?
- `sendTo()` failure가 application client/index/membership/channel erase로 이어지는 synchronous call stack은 무엇인가?
- send 뒤 언제 return하고 언제 stable id로 re-resolve해야 하는가?
- compound MODE의 부분 완료를 rollback하지 않으면서 후속 transition을 막는 semantics는 무엇인가?

### Source와 직접 연결되는 invariant

- callback, interest update, response enqueue 뒤에는 이전 `Connection`, client, channel, pointer, reference, iterator를 재사용하지 않고 필요한 state를 다시 resolve해야 합니다.
- connection map, event-manager registration, descriptor lifetime은 함께 advance하거나 함께 teardown되어야 합니다.
- output failure로 actor lifecycle이 끝나면 이전 mutation을 rollback하지 않더라도 이후 command transition은 실행하지 않아야 합니다.

### Source와 직접 연결되는 engineering difficulty

- single-threaded code에서도 external callback이 current owner를 동기적으로 지우는 reentrancy lifetime 문제.
- send처럼 보이는 local side effect가 disconnect callback과 channel erase까지 일으키는 cross-layer invalidation 문제.
- rare add/update failure와 exact continuation point를 fake backend/limits로 deterministic하게 만드는 문제.

## 3. 완료 기준

- 7a6bc7e1276a의 cleanup ordering을 baseline으로 기록했습니다.
- 5dcd882f0763의 callback/registration/update failure 경계와 fd-based relookup/rollback을 설명합니다.
- 928594ec160c의 five failure contracts와 fake backend injection path를 구분했습니다.
- 728aaabc4012의 cross-layer send-failure invalidation rule을 stable copy/relookup으로 복원했습니다.
- d48e1f1f8c04/aee5edebe294의 non-transactional stop-after-failure semantics를 실제 state assertions로 설명합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | 원문 확정 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `7a6bc7e1276a` | `feat(server): 연결 해제와 오류 정리 구현` | A | LIFECYCLE, RISK | Establishes the original erase-before-disconnect-callback cleanup path. |
| 2 | `5dcd882f0763` | `fix(server): 연결 콜백 수명과 이벤트 등록 롤백 보장` | S | DEBUG, LIFECYCLE, RISK | Handles callbacks that remove their own connection and rolls back event registration failures. |
| 3 | `928594ec160c` | `test(server): 연결 제거와 이벤트 등록 실패 경로 검증` | A | VERIFICATION, LIFECYCLE, RISK | Injects add/update failures and callback-driven removal to verify server lifetime safety. |
| 4 | `728aaabc4012` | `fix(app): 응답 실패 뒤 클라이언트 상태 다시 확인` | S | DEBUG, LIFECYCLE, RISK | Propagates output failure and requires application state to be re-resolved after any send that can disconnect. |
| 5 | `5edcafda8a4d` | `test(app): 작은 송신 한도에서 상태 정리 검증` | A | VERIFICATION, LIFECYCLE, RISK | Forces registration response failure and proves application cleanup and logging order. |
| 6 | `d48e1f1f8c04` | `fix(app): 응답 실패 뒤 명령 처리를 중단` | A | DEBUG, LIFECYCLE, RISK | Stops LIST, NAMES, and compound MODE after response failure. |
| 7 | `aee5edebe294` | `test(app): 연결 정리 뒤 모드 변경 중단 검증` | A | VERIFICATION, LIFECYCLE, CHANNEL_STATE | Proves a compound MODE retains completed work but performs no later transition after sender removal. |

Commit 순서는 source에 정의된 순서이며 재정렬하지 않았습니다.

## 5. Commit별 학습 기록

각 기록은 해당 commit의 exact diff에서 확인한 파일·symbol·state와, 필요한 경우 parent/앞선 관련 SHA의 상태 차이를 기준으로 합니다. 후속 commit의 field나 test seam을 이전 commit에 소급하지 않았습니다.

### 5.1 `7a6bc7e1276a` — `feat(server): 연결 해제와 오류 정리 구현`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | LIFECYCLE, RISK |
| 원문 확정 역할 | Establishes the original erase-before-disconnect-callback cleanup path. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Establishes the original erase-before-disconnect-callback cleanup path.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | 여러 event/error/stop 경로에서 connection 제거 순서가 하나의 함수로 고정되지 않았습니다. |
| 주요 문제와 설계 판단 | `disconnect()`가 backend remove를 시도하고 `unique_ptr`를 map 밖 local로 옮겨 entry를 먼저 erase한 뒤 disconnect callback을 호출했습니다. bulk close는 fd snapshot을 사용했습니다. |
| 변경 파일·symbol | `src/Server.cpp — disconnect, closeAllConnections, handleClientEvent` |
| state / ownership 변화 | callback 시점에는 server map에서 fd가 이미 사라졌지만 local unique_ptr가 callback 동안 객체 lifetime을 유지하고 callback 후 destructor가 fd를 닫습니다. |
| failure 또는 boundary | backend remove와 callback exception은 report되더라도 object destruction을 막지 않습니다. hangup은 pending output이 없을 때 terminal입니다. |
| 보장 / 비보장 | 보장: recursive lookup/repeated disconnect는 이미 제거된 상태를 보고, map iteration 중 erase로 iterator가 깨지지 않습니다.<br>비보장: callback 전에 잡은 raw pointer를 callback 뒤 다시 사용하는 call site와 event add/update rollback은 아직 안전하지 않습니다. |
| 다음 관련 변화 | 5dcd882f0763/928594ec160c가 이 baseline의 reentrancy와 rollback 결함을 수정·검증합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `7a6bc7e1276a` | `src/Server.cpp` | `Server::disconnect` | event remove → map ownership move/erase → callback → destruction 순서 |
| `7a6bc7e1276a` | `src/Server.cpp` | `Server::closeAllConnections` | fd snapshot으로 반복 erase 안전성 |

- 조사 방법: GitHub에서 `7a6bc7e1276a`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `5dcd882f0763` — `fix(server): 연결 콜백 수명과 이벤트 등록 롤백 보장`. 원문 역할은 “Handles callbacks that remove their own connection and rolls back event registration failures.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.2 `5dcd882f0763` — `fix(server): 연결 콜백 수명과 이벤트 등록 롤백 보장`

| 항목 | 값 |
| --- | --- |
| Importance | S |
| Tags | DEBUG, LIFECYCLE, RISK |
| 원문 확정 역할 | Handles callbacks that remove their own connection and rolls back event registration failures. |
| 학습 깊이 | 프로젝트 핵심 architecture/invariant입니다. 이전 상태, failure sequence, 핵심 결정, ownership/lifecycle, 남은 한계와 후속 fix/test를 모두 복원합니다. |

#### Source에서 확정된 역할

> Handles callbacks that remove their own connection and rolls back event registration failures.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 상태 | Server는 callback 전에 map에서 connection을 지우는 disconnect 경로는 가졌지만, connect/line callback이 자신을 제거한 뒤 기존 raw pointer를 다시 쓰고 event add/update 실패 시 map·backend·fd state가 갈라질 수 있었습니다. |
| failure / boundary | listener add 실패는 listen fd를 닫고 backend owner를 reset합니다. client add 실패는 inserted map entry를 erase해 Connection destructor가 fd를 닫습니다. connect/line callback self-disconnect 뒤 lookup이 null이면 즉시 중단하고 update failure는 backend/map 모두 제거합니다. |
| 핵심 결정 | test용 EventManager 주입 constructor를 추가하고 listener add를 rollback 가능하게 했습니다. accept에서는 map에 먼저 `emplace`한 뒤 backend add가 실패하면 entry를 erase했습니다. callback과 read/write 단계 후에는 fd로 `findConnection()`을 다시 호출하고, `refreshInterest(int fd)`는 update exception을 잡아 disconnect한 뒤 bool을 반환하도록 바꿨습니다. error callback 예외는 `noexcept` report path에서 흡수했습니다. |
| 변경 파일·symbol | `include/Server.hpp — injected EventManager constructor, refreshInterest(int)`<br>`src/Server.cpp — start rollback, acceptReadyClients, handleClientEvent, refreshInterest, reportError` |
| ownership / lifecycle / state transition | stable identity는 fd이고 `Connection*`는 다음 external callback/interest operation 전까지만 유효합니다. connection map, backend registration, descriptor lifetime이 성공 시 함께 전진하고 실패 시 authoritative disconnect/erase로 함께 teardown됩니다. |
| 이 commit이 보장하는 것 | single-threaded callback reentrancy와 event registration/update 실패 뒤 stale pointer, leaked connection, ghost backend entry가 남지 않습니다. |
| 아직 보장하지 않는 것 | application handler가 response send 후 borrowed ClientState/Channel/iterator를 재사용하는 cross-layer 문제는 아직 남습니다. |
| 후속 fix/test 연결 | 928594ec160c가 fake backend로 five server failure contracts를 검증하고 728aaabc4012가 동일 규칙을 application state까지 확장합니다. |

#### S-level invariant 재구성

| 순서 | 상태 / 판단 |
| --- | --- |
| 1. 이전 전제 | Server는 callback 전에 map에서 connection을 지우는 disconnect 경로는 가졌지만, connect/line callback이 자신을 제거한 뒤 기존 raw pointer를 다시 쓰고 event add/update 실패 시 map·backend·fd state가 갈라질 수 있었습니다. |
| 2. failure conditions / boundary | listener add 실패는 listen fd를 닫고 backend owner를 reset합니다. client add 실패는 inserted map entry를 erase해 Connection destructor가 fd를 닫습니다. connect/line callback self-disconnect 뒤 lookup이 null이면 즉시 중단하고 update failure는 backend/map 모두 제거합니다. |
| 3. 선택한 표현과 순서 | test용 EventManager 주입 constructor를 추가하고 listener add를 rollback 가능하게 했습니다. accept에서는 map에 먼저 `emplace`한 뒤 backend add가 실패하면 entry를 erase했습니다. callback과 read/write 단계 후에는 fd로 `findConnection()`을 다시 호출하고, `refreshInterest(int fd)`는 update exception을 잡아 disconnect한 뒤 bool을 반환하도록 바꿨습니다. error callback 예외는 `noexcept` report path에서 흡수했습니다. |
| 4. authoritative state | stable identity는 fd이고 `Connection*`는 다음 external callback/interest operation 전까지만 유효합니다. connection map, backend registration, descriptor lifetime이 성공 시 함께 전진하고 실패 시 authoritative disconnect/erase로 함께 teardown됩니다. |
| 5. 결과 invariant | single-threaded callback reentrancy와 event registration/update 실패 뒤 stale pointer, leaked connection, ghost backend entry가 남지 않습니다. |
| 6. 후속 보강 | 928594ec160c가 fake backend로 five server failure contracts를 검증하고 728aaabc4012가 동일 규칙을 application state까지 확장합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `5dcd882f0763` | `src/Server.cpp` | `Server::start` | listener add 예외 시 listen fd close와 backend reset |
| `5dcd882f0763` | `src/Server.cpp` | `acceptReadyClients` | map emplace → backend add → callback, add 실패 시 erase rollback |
| `5dcd882f0763` | `src/Server.cpp` | `handleClientEvent` | callback/read/write 후 fd relookup과 null이면 즉시 return |
| `5dcd882f0763` | `src/Server.cpp` | `refreshInterest(int)` | update failure report → disconnect → false |
| `5dcd882f0763` | `src/Server.cpp` | `reportError noexcept` | user error callback 예외가 cleanup을 중단하지 않음 |

- 조사 방법: GitHub에서 `5dcd882f0763`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### Fix chain

| 단계 | 역사 복원 |
| --- | --- |
| 기존 가정 | single-threaded callback과 event update가 반환되면 이전 Connection pointer/reference가 계속 유효하고 등록 단계가 부분 실패하지 않는다는 가정이었습니다. |
| 실제 failure / risk | callback self-disconnect는 map object를 파괴해 use-after-free를 만들고 add/update exception은 map과 kernel registry 중 한쪽만 남길 수 있었습니다. |
| root cause | callback/foreign operation을 lifecycle mutation boundary로 취급하지 않았고 map/backend/fd 변화가 transaction-like ordering을 갖지 않았습니다. |
| 수정된 invariant / decision | fd만 stable key로 보존하고 각 boundary 뒤 relookup하며, 등록은 map owner를 먼저 세운 뒤 backend 실패를 erase로 rollback하고 update 실패는 disconnect로 수렴합니다. |
| regression evidence | 928594ec160c가 add/update injection 및 connect/line callback removal을 production Server 경로에서 검증합니다. |

#### 다음 연결

- 다음 Thread commit: `928594ec160c` — `test(server): 연결 제거와 이벤트 등록 실패 경로 검증`. 원문 역할은 “Injects add/update failures and callback-driven removal to verify server lifetime safety.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.3 `928594ec160c` — `test(server): 연결 제거와 이벤트 등록 실패 경로 검증`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | VERIFICATION, LIFECYCLE, RISK |
| 원문 확정 역할 | Injects add/update failures and callback-driven removal to verify server lifetime safety. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Injects add/update failures and callback-driven removal to verify server lifetime safety.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | server lifetime fix는 있었지만 add/update failure와 callback self-removal을 real backend/timing에 의존하지 않고 재현하는 regression suite가 없었습니다. |
| 주요 문제와 설계 판단 | `FakeEventManager`에 interest map, queued events, fail-next-add/update seam을 두고 loopback ClientSocket과 `Server::pollOnce()`를 결합한 `server_lifetime_test`를 추가했습니다. |
| 변경 파일·symbol | `tests/server_lifetime_test.cpp — FakeEventManager, ClientSocket, five tests`<br>`Makefile — unit/server lifetime target` |
| state / ownership 변화 | fake backend가 등록 fd와 호출 횟수를 관찰하고 test가 real accepted socket과 Server connection count를 함께 assertion합니다. |
| failure 또는 boundary | (1) client add 실패 rollback, (2) connect callback self-disconnect+throw, (3) line callback self-disconnect+throw, (4) write interest update 실패, (5) outbound queue rejection close를 각각 결정적으로 주입합니다. |
| 보장 / 비보장 | 보장: 각 case 뒤 connection map과 fake backend에 client fd가 남지 않고 callback 예외가 cleanup을 무효화하지 않으며 queue/update failure가 false를 반환합니다.<br>비보장: fake backend는 epoll/kqueue native semantics 자체를 검증하지 않고 callback 이후 application channel/client graph도 직접 검사하지 않습니다. |
| 다음 관련 변화 | 728aaabc4012/5edcafda8a4d가 send failure가 application state와 log까지 정리되는 경로를 추가합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `928594ec160c` | `tests/server_lifetime_test.cpp` | `registrationRollbackTest` | injected add failure 뒤 map/backend가 모두 비어 있음 |
| `928594ec160c` | `tests/server_lifetime_test.cpp` | `connectCallbackLifetimeTest/lineCallbackLifetimeTest` | callback self-disconnect와 throw 뒤 stale access 없음 |
| `928594ec160c` | `tests/server_lifetime_test.cpp` | `interestUpdateRollbackTest` | update failure가 send false와 map/backend removal로 수렴 |
| `928594ec160c` | `tests/server_lifetime_test.cpp` | `queueLimitCloseTest` | queue rejection close가 event/map entry를 남기지 않음 |

- 조사 방법: GitHub에서 `928594ec160c`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### Test / verification 학습 기록

| 구분 | 역사 복원 기록 |
| --- | --- |
| 대상 production invariant | connection map, event registration, descriptor lifetime이 함께 전진·정리되고 callback 뒤 stale pointer를 재사용하지 않아야 합니다. |
| 재현 failure / boundary | event add/update exception, connect/line callback self-disconnect+throw, outbound queue rejection입니다. |
| test technique | injected FakeEventManager + real loopback accepted socket + direct `pollOnce()` deterministic lifetime unit/integration입니다. |
| 통과하는 production path | accept/read/send → Server map/backend → callback/refreshInterest → disconnect/erase/destruction입니다. |
| 이 test가 증명하는 것 | server-level ownership rollback과 callback relookup rule을 timing accident 없이 검증합니다. |
| 이 test가 증명하지 않는 것 | native epoll/kqueue kernel behavior, application aggregate cleanup, 모든 OS resource failure는 증명하지 않습니다. |
| test 성격 | deterministic server lifetime regression |
| 막는 회귀 | self-disconnect use-after-free와 partial event registration/interest update leak을 막습니다. |

실행 기록:

- 실행 SHA: `928594ec160c`
- repository에 정의된 실행 명령: `make unit` 또는 `make test`
- 현재 작업 환경 실행 여부: **미실행**
- 이유: 현재 런타임에서 외부 DNS가 차단되어 지정 branch의 local checkout을 만들 수 없었습니다. GitHub 연결 도구로 해당 SHA의 production/test diff와 test mechanism은 확인했지만, binary/test command의 성공 결과를 만들거나 추정하지 않았습니다.
- 실행 결과: 기록 없음

#### 다음 연결

- 다음 Thread commit: `728aaabc4012` — `fix(app): 응답 실패 뒤 클라이언트 상태 다시 확인`. 원문 역할은 “Propagates output failure and requires application state to be re-resolved after any send that can disconnect.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.4 `728aaabc4012` — `fix(app): 응답 실패 뒤 클라이언트 상태 다시 확인`

| 항목 | 값 |
| --- | --- |
| Importance | S |
| Tags | DEBUG, LIFECYCLE, RISK |
| 원문 확정 역할 | Propagates output failure and requires application state to be re-resolved after any send that can disconnect. |
| 학습 깊이 | 프로젝트 핵심 architecture/invariant입니다. 이전 상태, failure sequence, 핵심 결정, ownership/lifecycle, 남은 한계와 후속 fix/test를 모두 복원합니다. |

#### Source에서 확정된 역할

> Propagates output failure and requires application state to be re-resolved after any send that can disconnect.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 상태 | Server.sendTo가 queue/interest 실패 시 synchronous disconnect와 application disconnect callback을 실행할 수 있었지만 handlers는 send 뒤 기존 ClientState, Channel reference, iterator를 계속 사용했습니다. |
| failure / boundary | queue limit 또는 interest update failure가 `Server::disconnect()` → application `onDisconnect()` → registry membership/channel erase를 동기 실행할 수 있으므로 false 또는 missing relookup에서 command를 종료합니다. |
| 핵심 결정 | `sendRaw`, `sendNumeric`, `sendNumericRaw`, `sendTopicReply`, `sendNames`, `broadcastMode`가 bool을 반환하도록 전파했습니다. handler는 send 전에 channel name/nick/prefix 같은 stable value를 복사하고, send/broadcast 뒤 `_clients.contains/find`와 `_channels.find`로 다시 resolve하거나 실패 즉시 return하도록 바꿨습니다. |
| 변경 파일·symbol | `src/IrcApplication.hpp/.cpp — bool send helpers and support methods`<br>`src/ChannelCommands.cpp — JOIN/PART/KICK/INVITE/MODE revalidation`<br>`src/RegistrationCommands.cpp — registration response checks`<br>`src/ApplicationSupport.cpp — fan-out/relookup` |
| ownership / lifecycle / state transition | send는 단순 출력 append가 아니라 actor lifecycle을 끝낼 수 있는 mutation boundary입니다. pointer/reference/iterator 대신 fd와 copied channel name/nick이 boundary를 넘는 stable identity가 됩니다. |
| 이 commit이 보장하는 것 | 응답 실패 뒤 삭제된 client/channel state에 접근하지 않고 후속 response/mutation을 기존 borrowed object로 수행하지 않습니다. |
| 아직 보장하지 않는 것 | LIST/NAMES 반복과 compound MODE 일부 branch는 아직 send 실패 뒤 loop를 계속할 수 있어 d48e1f1f8c04에서 추가 수정됩니다. 이미 성공한 mutation을 transaction처럼 rollback하지는 않습니다. |
| 후속 fix/test 연결 | 5edcafda8a4d가 one-byte queue로 registration failure cleanup/log ordering을 검증하고 d48e1f1f8c04/aee5edebe294가 stop-after-failure semantics를 완성합니다. |

#### S-level invariant 재구성

| 순서 | 상태 / 판단 |
| --- | --- |
| 1. 이전 전제 | Server.sendTo가 queue/interest 실패 시 synchronous disconnect와 application disconnect callback을 실행할 수 있었지만 handlers는 send 뒤 기존 ClientState, Channel reference, iterator를 계속 사용했습니다. |
| 2. failure conditions / boundary | queue limit 또는 interest update failure가 `Server::disconnect()` → application `onDisconnect()` → registry membership/channel erase를 동기 실행할 수 있으므로 false 또는 missing relookup에서 command를 종료합니다. |
| 3. 선택한 표현과 순서 | `sendRaw`, `sendNumeric`, `sendNumericRaw`, `sendTopicReply`, `sendNames`, `broadcastMode`가 bool을 반환하도록 전파했습니다. handler는 send 전에 channel name/nick/prefix 같은 stable value를 복사하고, send/broadcast 뒤 `_clients.contains/find`와 `_channels.find`로 다시 resolve하거나 실패 즉시 return하도록 바꿨습니다. |
| 4. authoritative state | send는 단순 출력 append가 아니라 actor lifecycle을 끝낼 수 있는 mutation boundary입니다. pointer/reference/iterator 대신 fd와 copied channel name/nick이 boundary를 넘는 stable identity가 됩니다. |
| 5. 결과 invariant | 응답 실패 뒤 삭제된 client/channel state에 접근하지 않고 후속 response/mutation을 기존 borrowed object로 수행하지 않습니다. |
| 6. 후속 보강 | 5edcafda8a4d가 one-byte queue로 registration failure cleanup/log ordering을 검증하고 d48e1f1f8c04/aee5edebe294가 stop-after-failure semantics를 완성합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `728aaabc4012` | `src/IrcApplication.cpp` | `sendRaw/sendNumeric/sendNumericRaw` | Server send 결과를 application caller에 bool로 전파 |
| `728aaabc4012` | `src/ChannelCommands.cpp` | `handleJoin/part/kick/invite` | stable string copy와 send 뒤 client/channel relookup |
| `728aaabc4012` | `src/IrcApplication.cpp` | `maintainClient` | heartbeat state를 send 전에 설정하고 실패 시 removed state를 재사용하지 않음 |

- 조사 방법: GitHub에서 `728aaabc4012`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### Fix chain

| 단계 | 역사 복원 |
| --- | --- |
| 기존 가정 | response enqueue는 local operation이라 caller가 보유한 client/channel reference를 무효화하지 않는다는 가정이었습니다. |
| 실제 failure / risk | queue/interest failure는 synchronous disconnect callback을 통해 registry, memberships, empty channel을 지워 handler의 pointer/iterator를 dangling으로 만들었습니다. |
| root cause | cross-layer call stack의 lifecycle side effect가 send API의 void signature와 handler continuation에 숨겨져 있었습니다. |
| 수정된 invariant / decision | send failure를 bool로 끝까지 전파하고 stable id/value만 boundary를 넘기며 모든 이후 state는 authoritative containers에서 다시 resolve합니다. |
| regression evidence | 5edcafda8a4d가 registration response failure를, aee5edebe294가 compound MODE sender removal을 재현합니다. |

#### 다음 연결

- 다음 Thread commit: `5edcafda8a4d` — `test(app): 작은 송신 한도에서 상태 정리 검증`. 원문 역할은 “Forces registration response failure and proves application cleanup and logging order.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.5 `5edcafda8a4d` — `test(app): 작은 송신 한도에서 상태 정리 검증`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | VERIFICATION, LIFECYCLE, RISK |
| 원문 확정 역할 | Forces registration response failure and proves application cleanup and logging order. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Forces registration response failure and proves application cleanup and logging order.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | application revalidation fix가 welcome 응답 실패로 connection이 제거되는 실제 cross-layer stack에서 state/log를 올바르게 정리한다는 test가 없었습니다. |
| 주요 문제와 설계 판단 | FakeEventManager와 captured stderr를 사용하는 `application_lifetime_test`를 추가하고 Server `maxPendingBytes=1`로 설정해 NICK/USER 등록 중 첫 welcome frame admission을 강제로 실패시켰습니다. |
| 변경 파일·symbol | `tests/application_lifetime_test.cpp — CapturedStderr, FakeEventManager, registrationQueueFailureTest`<br>`Makefile — application-test` |
| state / ownership 변화 | real accepted socket과 application callbacks를 사용하되 tiny queue limit가 deterministic disconnect seam이며 test가 server connection count, running state와 log text를 관찰합니다. |
| failure 또는 boundary | welcome queue failure는 Server disconnect와 application onDisconnect cleanup을 동기 실행합니다. |
| 보장 / 비보장 | 보장: 실패 뒤 connection count가 0이고 server는 계속 실행되며 제거된 client를 `event=client_registered`로 기록하지 않습니다.<br>비보장: 이 최초 application test는 channel/mode의 multi-step continuation을 검사하지 않습니다. |
| 다음 관련 변화 | d48e1f1f8c04/aee5edebe294가 LIST/NAMES/MODE continuation과 부분 완료 semantics를 추가로 고정합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `5edcafda8a4d` | `tests/application_lifetime_test.cpp` | `registrationQueueFailureTest` | 1-byte limit → welcome send failure → connection cleanup, server running, registered log 부재 |

- 조사 방법: GitHub에서 `5edcafda8a4d`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### Test / verification 학습 기록

| 구분 | 역사 복원 기록 |
| --- | --- |
| 대상 production invariant | registration response failure로 actor가 제거되면 application state와 lifecycle log가 제거 결과와 일치해야 합니다. |
| 재현 failure / boundary | `maxPendingBytes=1`에서 001 welcome frame queue rejection입니다. |
| test technique | tiny real Server queue limit + fake event backend + real loopback connection + captured stderr입니다. |
| 통과하는 production path | NICK/USER → maybeRegister → sendNumeric → Server.sendTo → queue rejection/refresh/disconnect → onDisconnect cleanup입니다. |
| 이 test가 증명하는 것 | cross-layer synchronous removal 뒤 phantom registered state/log가 없고 server가 process-wide failure로 멈추지 않음을 증명합니다. |
| 이 test가 증명하지 않는 것 | 모든 handler, compound iteration, native backend failure는 증명하지 않습니다. |
| test 성격 | deterministic application lifetime regression |
| 막는 회귀 | welcome 실패 후 removed client를 계속 등록 처리·로그하는 use-after-lifecycle 회귀를 막습니다. |

실행 기록:

- 실행 SHA: `5edcafda8a4d`
- repository에 정의된 실행 명령: `make application-test` 또는 `make test`
- 현재 작업 환경 실행 여부: **미실행**
- 이유: 현재 런타임에서 외부 DNS가 차단되어 지정 branch의 local checkout을 만들 수 없었습니다. GitHub 연결 도구로 해당 SHA의 production/test diff와 test mechanism은 확인했지만, binary/test command의 성공 결과를 만들거나 추정하지 않았습니다.
- 실행 결과: 기록 없음

#### 다음 연결

- 다음 Thread commit: `d48e1f1f8c04` — `fix(app): 응답 실패 뒤 명령 처리를 중단`. 원문 역할은 “Stops LIST, NAMES, and compound MODE after response failure.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.6 `d48e1f1f8c04` — `fix(app): 응답 실패 뒤 명령 처리를 중단`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | DEBUG, LIFECYCLE, RISK |
| 원문 확정 역할 | Stops LIST, NAMES, and compound MODE after response failure. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Stops LIST, NAMES, and compound MODE after response failure.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | 주요 handlers는 send 결과를 확인했지만 LIST/NAMES 반복과 compound MODE는 중간 response/broadcast 실패 뒤 다음 iteration/mode mutation을 계속할 수 있었습니다. |
| 주요 문제와 설계 판단 | LIST header/item, NAMES channel/item, MODE i/t/o/unknown response의 bool 결과를 즉시 검사해 false면 return하도록 했습니다. channel name과 target nick을 stable copy하고 broadcast 뒤 continuation 전에 actor/channel 존재를 확인했습니다. |
| 변경 파일·symbol | `src/ChannelCommands.cpp — handleList, handleNames, handleChannelMode` |
| state / ownership 변화 | compound command는 앞서 완료한 mutation을 유지하지만 actor lifecycle이 끝난 정확한 boundary 이후에는 cursor를 더 전진시키지 않습니다. |
| failure 또는 boundary | 첫 mode mutation의 broadcast가 sender disconnect를 유발하면 뒤 mode 문자는 처리되지 않습니다. 반복 reply도 첫 failure에서 끝나 stale iterator/reference를 재사용하지 않습니다. |
| 보장 / 비보장 | 보장: output failure 이후 command continuation은 즉시 중단됩니다.<br>비보장: transactional rollback을 제공하지 않으므로 failure 이전에 성공한 mutation은 남습니다. 이것이 선택된 semantics입니다. |
| 다음 관련 변화 | aee5edebe294가 `MODE #room +it`에서 +i는 유지되고 +t는 적용되지 않는 state assertion으로 고정합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `d48e1f1f8c04` | `src/ChannelCommands.cpp` | `handleList/handleNames` | 각 send failure에서 반복 즉시 return |
| `d48e1f1f8c04` | `src/ChannelCommands.cpp` | `handleChannelMode` | mode별 broadcast/send false 뒤 cursor continuation 중단 |

- 조사 방법: GitHub에서 `d48e1f1f8c04`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### Fix chain

| 단계 | 역사 복원 |
| --- | --- |
| 기존 가정 | handler entry에서 revalidation하면 같은 command 안의 이후 send/iteration도 안전하다는 가정이었습니다. |
| 실제 failure / risk | 각 send가 actor를 제거할 수 있어 list loop나 mode cursor가 다음 transition을 삭제된 sender 권한으로 계속 수행했습니다. |
| root cause | failure propagation은 추가되었지만 모든 continuation point가 return 조건으로 연결되지 않았습니다. |
| 수정된 invariant / decision | 각 output boundary의 bool 결과를 그 자리에서 검사하고 compound operation은 non-transactional partial completion 후 즉시 종료합니다. |
| regression evidence | aee5edebe294가 첫 mode만 남고 later mode는 적용되지 않는 exact state를 검증합니다. |

#### 다음 연결

- 다음 Thread commit: `aee5edebe294` — `test(app): 연결 정리 뒤 모드 변경 중단 검증`. 원문 역할은 “Proves a compound MODE retains completed work but performs no later transition after sender removal.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.7 `aee5edebe294` — `test(app): 연결 정리 뒤 모드 변경 중단 검증`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | VERIFICATION, LIFECYCLE, CHANNEL_STATE |
| 원문 확정 역할 | Proves a compound MODE retains completed work but performs no later transition after sender removal. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Proves a compound MODE retains completed work but performs no later transition after sender removal.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | stop-after-failure semantics는 코드에 반영됐지만 compound MODE의 partial completion과 unrelated peer 보존을 state level에서 확인하지 않았습니다. |
| 주요 문제와 설계 판단 | white-box application fixture와 fd-specific update failure를 추가했습니다. 두 registered client가 있는 `#room`에서 sender를 operator로 두고 topic protection을 끈 뒤 `MODE #room +it`를 실행하며 첫 `+i` broadcast interest update에서 sender를 제거했습니다. |
| 변경 파일·symbol | `tests/application_lifetime_test.cpp — FakeEventManager::failNextUpdateFor, modeStopsAfterSenderCleanupTest` |
| state / ownership 변화 | test는 `_clients`와 `_channels`를 직접 구성·관찰하고 failure 전/후 channel flags와 두 client 존재를 각각 저장한 뒤 cleanup합니다. |
| failure 또는 boundary | `+i` mutation은 broadcast 전에 이미 완료되지만 update failure가 sender disconnect를 유발하므로 handler가 return해 다음 `+t` mutation은 실행하지 않습니다. |
| 보장 / 비보장 | 보장: channel은 peer 때문에 유지되고 `inviteOnly=true`, `topicProtected=false`, sender removed, peer present라는 non-transactional stop semantics가 고정됩니다.<br>비보장: white-box setup은 public IRC parser/authorization 전체를 통과하지 않으며 한 compound mode pattern만 검사합니다. |
| 다음 관련 변화 | 416efc91e580가 application lifetime suite를 두 OS와 sanitizer에서 반복합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `aee5edebe294` | `tests/application_lifetime_test.cpp` | `modeStopsAfterSenderCleanupTest` | injected sender update failure 뒤 +i 유지, +t 미적용, sender만 제거 |
| `aee5edebe294` | `tests/application_lifetime_test.cpp` | `FakeEventManager::failNextUpdateFor` | 정확한 fd의 다음 interest update만 실패 |

- 조사 방법: GitHub에서 `aee5edebe294`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### Test / verification 학습 기록

| 구분 | 역사 복원 기록 |
| --- | --- |
| 대상 production invariant | actor lifecycle이 output boundary에서 끝나면 완료된 mutation은 유지하되 같은 compound command의 이후 transition은 실행하지 않아야 합니다. |
| 재현 failure / boundary | `MODE #room +it`의 첫 `+i` broadcast에서 sender interest update failure입니다. |
| test technique | white-box application state + fd-specific fake backend failure injection입니다. |
| 통과하는 production path | handleChannelMode → setInviteOnly → broadcastMode → Server.update failure/disconnect → false → handler return입니다. |
| 이 test가 증명하는 것 | partial completion, sender-only cleanup, peer/channel 보존과 later mode suppression을 exact state로 증명합니다. |
| 이 test가 증명하지 않는 것 | 모든 compound MODE 조합이나 public wire path, transactional rollback은 증명하지 않습니다. |
| test 성격 | deterministic command-continuation regression |
| 막는 회귀 | sender 제거 뒤 남은 mode 문자를 실행하거나 unrelated peer/channel을 함께 지우는 회귀를 막습니다. |

실행 기록:

- 실행 SHA: `aee5edebe294`
- repository에 정의된 실행 명령: `make application-test` 또는 `make test`
- 현재 작업 환경 실행 여부: **미실행**
- 이유: 현재 런타임에서 외부 DNS가 차단되어 지정 branch의 local checkout을 만들 수 없었습니다. GitHub 연결 도구로 해당 SHA의 production/test diff와 test mechanism은 확인했지만, binary/test command의 성공 결과를 만들거나 추정하지 않았습니다.
- 실행 결과: 기록 없음

#### 다음 연결

- 이 commit은 이 Thread의 마지막 항목입니다. 아래 Invariant ledger와 Thread 최종 상태에서 전체 변화를 연결합니다.

## 6. Invariant ledger

| Invariant | 처음 도입 | 강화/적용 | 학습자 최종 기록 | Fix/Test 연결 |
| --- | --- | --- | --- | --- |
| erase-before-callback baseline | `7a6bc7e1276a` | Server::disconnect | recursive lookup은 removed state를 보지만 caller의 기존 pointer 문제는 남습니다. | 5dcd882f0763/928594ec160c |
| map/backend/fd atomic lifecycle | `5dcd882f0763` | start/accept/update rollback | map owner를 먼저 세우고 backend 실패를 erase/disconnect로 되돌립니다. | 928594ec160c |
| application send boundary | `728aaabc4012` | bool propagation + stable value/relookup | send가 client/channel graph를 지울 수 있음을 API에 반영합니다. | 5edcafda8a4d |
| stop-after-actor-removal | `d48e1f1f8c04` | LIST/NAMES/MODE continuation checks | completed mutation은 유지하고 later transition을 중단합니다. | aee5edebe294 |

도입과 완성을 같은 의미로 쓰지 않았습니다. 후속 fix가 이전 SHA의 사실을 바꾸지 않도록 각 시점의 보장과 부족함을 분리했습니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 | 실제 failure / risk | Fix 또는 기반 변화 | 수정된 decision / semantics | Test 연결 |
| --- | --- | --- | --- | --- |
| single-thread callback은 pointer를 무효화하지 않음 | self-disconnect 뒤 use-after-free | 5dcd882f0763 | fd relookup after every callback/foreign operation | 928594ec160c |
| event add/update는 실패해도 local state와 일치 | map/backend/fd partial ownership | 5dcd882f0763 | map-first+erase rollback, update failure disconnect | 928594ec160c |
| send는 local queue append | sync disconnect가 client/channel/iterator를 제거 | 728aaabc4012 | bool 전파+stable copy+relookup | 5edcafda8a4d |
| 한 번 revalidate하면 compound command 끝까지 안전 | 첫 response failure 뒤 later mode mutation | d48e1f1f8c04 | 각 output boundary에서 즉시 return | aee5edebe294 |

## 8. Ownership / state / responsibility 변화

| 책임 또는 상태 | 이전 상태 | 이후 authoritative 위치 | 관련 commit | 확인 결과 |
| --- | --- | --- | --- | --- |
| connection stable identity | raw pointer/reference | fd + Server map relookup | 5dcd882f0763 | path/symbol은 위 commit 증거표에 연결했습니다. |
| event registration rollback | 분산 exception path | Server start/accept/refreshInterest | 5dcd882f0763 | path/symbol은 위 commit 증거표에 연결했습니다. |
| send failure signal | void/hidden lifecycle | bool through Server→IrcApplication helper | 728aaabc4012 | path/symbol은 위 commit 증거표에 연결했습니다. |
| channel/client post-send state | borrowed pointer/iterator | stable copied key + container relookup | 728aaabc4012 | path/symbol은 위 commit 증거표에 연결했습니다. |
| compound failure semantics | 계속 처리 가능 | partial completion + immediate stop | d48e1f1f8c04 | path/symbol은 위 commit 증거표에 연결했습니다. |

## 9. Thread 최종 상태

- 시작 직전 상태: 여러 event/error/stop 경로에서 connection 제거 순서가 하나의 함수로 고정되지 않았습니다.
- 마지막 commit `aee5edebe294` 시점의 상태: channel은 peer 때문에 유지되고 `inviteOnly=true`, `topicProtected=false`, sender removed, peer present라는 non-transactional stop semantics가 고정됩니다.
- Thread 안에서 강화된 핵심 invariant: erase-before-callback baseline, map/backend/fd atomic lifecycle, application send boundary, stop-after-actor-removal.
- 남은 한계 또는 후속 Thread에서 보강되는 부분: white-box setup은 public IRC parser/authorization 전체를 통과하지 않으며 한 compound mode pattern만 검사합니다. 416efc91e580가 application lifetime suite를 두 OS와 sanitizer에서 반복합니다.
- 최종 설명: `7a6bc7e1276a`에서 시작한 책임은 commit map 순서대로 상태 owner, failure branch와 cleanup ordering을 추가했고 `aee5edebe294`에서 이 Thread가 정한 검증 또는 운영 상태에 도달합니다. 이전 시점의 미보장은 후속 fix/test SHA를 별도로 연결했으며 final HEAD 상태를 과거 commit에 소급하지 않았습니다.

## 10. 최종 architecture 또는 execution flow 정리

| 단계 | SHA | Caller / callee / state owner | 정상 transition | failure / cleanup transition |
| --- | --- | --- | --- | --- |
| server callback boundary | 5dcd882f0763 | `accept/read handler` | callback 후 fd로 map relookup | missing이면 즉시 return |
| event registration/update | 5dcd882f0763 | `start/accept/refreshInterest` | map/backend/fd 함께 성공 | add 실패 erase rollback, update 실패 disconnect |
| application send | 728aaabc4012 | `sendNumeric/broadcast helper` | Server.sendTo true면 authoritative state relookup | false 또는 missing state면 handler return |
| sync cleanup stack | 728aaabc4012 | `Connection queue/update failure` | Server::disconnect → onDisconnect → registry/channel cleanup | caller의 pre-send pointer/iterator는 무효 |
| compound command | d48e1f1f8c04 / aee5edebe294 | `MODE +it` | +i 완료 후 failure 없으면 +t | +i broadcast에서 sender 제거되면 +t 미실행 |

## 11. 학습 완료 자가 점검

- [x] Commit map의 모든 SHA, subject, importance, tags를 source와 대조했습니다.
- [x] 모든 commit의 exact SHA diff와 변경 파일·symbol을 확인했습니다.
- [x] final HEAD의 함수나 field를 과거 commit 설명에 소급하지 않았습니다.
- [x] S commit은 architecture/invariant, failure, ownership/lifecycle, 후속 fix/test까지 기록했습니다.
- [x] A commit은 주요 subsystem/boundary/failure path와 설계 판단을 기록했습니다.
- [x] B commit은 Thread 흐름에서 맡는 구현 역할과 state 변화를 기록했습니다.
- [x] fix commit의 기존 가정, root cause, 수정 invariant, regression test를 연결했습니다.
- [x] test commit의 production path, technique, 증명/비증명 범위를 구분했습니다.
- [x] Invariant ledger와 responsibility 표를 path/symbol 증거에 연결했습니다.
- [ ] production build/test command를 이 작업 환경에서 직접 실행했습니다. local checkout을 만들 수 없어 code/test inspection과 실행 결과를 분리했으며 pass 결과를 기록하지 않았습니다.
