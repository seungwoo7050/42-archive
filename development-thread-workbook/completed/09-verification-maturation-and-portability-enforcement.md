# Thread 09 — Verification maturation and portability enforcement

부제: 검증 성숙과 이식성 강제

## 1. Thread 목표

broad live-TCP smoke에서 exact public contract, injected transport/server/application failure tests, high-descriptor·slow-reader isolation, Linux/macOS·sanitizer CI로 verification architecture가 성숙하는 과정을 복원합니다.

Source에서 확정된 significance:

> Verification evolves from broad functional integration to exact public contracts, injected transport and event failures, application-lifetime tests, and real-process descriptor pressure. The CI commit then makes the same evidence repeatable for both readiness backends and under dynamic memory and undefined-behavior checks. No individual test proves absolute fairness or every failure class, but together they align the verification structure with the architecture's highest-risk boundaries.

이 문서의 source-confirmed 문장, commit map, SHA, subject, importance, tags와 원문 역할은 변경하지 않았습니다. 아래 학습 기록은 지정 branch의 각 exact SHA에서 확인한 code diff를 기준으로 작성했습니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- broad smoke와 exact contract는 assertion precision과 failure localization이 어떻게 다른가?
- Connection, Server, Application lifetime test는 각각 어떤 production invariant와 injection seam을 사용하는가?
- real-process 160-peer/slow-reader test는 무엇을 증명하고 formal fairness·capacity는 왜 증명하지 않는가?
- Linux와 macOS matrix가 실제 epoll/kqueue backend를 같은 suite로 통과시키는가?
- ASan/UBSan job이 unit과 real-network binary 모두를 같은 instrumentation으로 빌드하는가?

### Source와 직접 연결되는 invariant

- 검증 구조는 architecture의 높은 위험 경계인 partial I/O, event/map ownership, application reentrancy, cross-platform backend와 대응해야 합니다.
- public contract test는 CLI, exact IRC frame, CRLF, numeric/order, shutdown, log ordering을 명시적으로 고정해야 합니다.
- rare failure는 timing accident가 아니라 injected operation/backend/limit로 deterministic하게 재현되어야 합니다.

### Source와 직접 연결되는 engineering difficulty

- rare transport/event failure를 deterministic하게 만들면서 production path 자체를 우회하지 않는 test seam 설계.
- 많은 fd와 slow receiver에서도 progress isolation을 보여 주되 benchmark/fairness 보장을 과장하지 않는 검증 범위 설정.
- 두 event backend와 sanitizer suite를 지속적 자동화로 강제하는 문제.

## 3. 완료 기준

- 각 test commit을 production invariant, boundary, technique, code path, proves/does-not-prove, test type, prevented regression으로 분류했습니다.
- smoke → exact contract → deterministic layer tests → stress/isolation → CI의 confidence 증가를 설명합니다.
- test double과 real socket/process를 선택한 이유를 failure 특성에 맞게 구분했습니다.
- CI matrix와 sanitizer flags가 Makefile target 전체에 전달되는지 확인했습니다.
- formal fairness, latency, maximum capacity, 모든 syscall failure class를 과장하지 않았습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | 원문 확정 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `6b4a7738a285` | `test(smoke): 실제 TCP 등록과 채널 흐름 검증` | A | VERIFICATION, INTEGRATION, RISK | Adds the first full real-TCP smoke flow. |
| 2 | `e5e6c57db80d` | `test(irc): 실행 조건과 오류 동작 계약 검증` | A | VERIFICATION, IRC_PROTOCOL, RISK | Replaces substring-oriented confidence with exact CLI, frame, and shutdown contracts. |
| 3 | `f34ab135c546` | `test(connection): 부분 송신과 대기열 경계 검증` | A | VERIFICATION, EVENT_IO, RISK | Adds deterministic Connection failure-state tests. |
| 4 | `928594ec160c` | `test(server): 연결 제거와 이벤트 등록 실패 경로 검증` | A | VERIFICATION, LIFECYCLE, RISK | Adds deterministic Server ownership and rollback tests. |
| 5 | `5edcafda8a4d` | `test(app): 작은 송신 한도에서 상태 정리 검증` | A | VERIFICATION, LIFECYCLE, RISK | Adds deterministic application cleanup verification. |
| 6 | `de1dd0fc30d0` | `test(event): 160개 연결과 느린 수신자 처리 공정성 검증` | A | VERIFICATION, EVENT_IO, RISK | Adds 160-peer readiness and slow-receiver isolation evidence. |
| 7 | `416efc91e580` | `ci: Linux·macOS 회귀와 새니타이저 자동화` | A | BUILD, VERIFICATION, RISK | Runs the complete suite on Linux and macOS and under ASan and UBSan. |

Commit 순서는 source에 정의된 순서이며 재정렬하지 않았습니다.

## 5. Commit별 학습 기록

각 기록은 해당 commit의 exact diff에서 확인한 파일·symbol·state와, 필요한 경우 parent/앞선 관련 SHA의 상태 차이를 기준으로 합니다. 후속 commit의 field나 test seam을 이전 commit에 소급하지 않았습니다.

### 5.1 `6b4a7738a285` — `test(smoke): 실제 TCP 등록과 채널 흐름 검증`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | VERIFICATION, INTEGRATION, RISK |
| 원문 확정 역할 | Adds the first full real-TCP smoke flow. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Adds the first full real-TCP smoke flow.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | parser·registry·registration·channel 기능이 실제 process/socket 안에서 함께 동작한다는 통합 증거가 없었습니다. |
| 주요 문제와 설계 판단 | Makefile test/smoke, shell runner, Python peer를 추가해 loopback server를 실행하고 다중 client 시나리오를 수행했습니다. |
| 변경 파일·symbol | `Makefile — test, smoke`<br>`tests/irc_smoke.sh`<br>`tools/irc_smoke_client.py` |
| state / ownership 변화 | test harness가 process PID, free port, temp log, peer sockets와 수신 line buffer를 소유하고 EXIT trap으로 정리합니다. |
| failure 또는 boundary | wrong password, fragmented input, case-insensitive collision, channel/mode/message/departure 오류를 실제 wire에서 관찰합니다. |
| 보장 / 비보장 | 보장: transport framing부터 application/channel/output queue까지 주요 정상·일부 오류 경로가 한 process에서 조합됩니다.<br>비보장: assertion은 주로 substring 중심이어서 exact 전체 frame/order/CRLF와 rare syscall failure, capacity/fairness를 증명하지 않습니다. |
| 다음 관련 변화 | e5e6c57db80d가 exact public contract로 정밀도를 높이고 계층별 deterministic tests가 후속됩니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `6b4a7738a285` | `tests/irc_smoke.sh` | `runner and cleanup trap` | 실제 server process 기동·readiness·로그·종료 관리 |
| `6b4a7738a285` | `tools/irc_smoke_client.py` | `IrcPeer and scenario` | fragmented write와 registration/channel/messaging 시나리오 |

- 조사 방법: GitHub에서 `6b4a7738a285`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### Test / verification 학습 기록

| 구분 | 역사 복원 기록 |
| --- | --- |
| 대상 production invariant | Connection framing, parser, registration, nickname index, channel state와 queued send가 실제 process에서 결합됩니다. |
| 재현 failure / boundary | wrong password, fragmented PING, nickname collision, JOIN/TOPIC/PRIVMSG/INVITE/MODE/KICK/PART/QUIT입니다. |
| test technique | compiled server + real loopback TCP + shell process harness + Python peer의 broad end-to-end smoke입니다. |
| 통과하는 production path | process startup → Server event loop → Connection framing → parser → IrcApplication → registry/channel → output queue입니다. |
| 이 test가 증명하는 것 | 대표 정상·오류 흐름이 실제 socket에서 연결되어 진행됨을 증명합니다. |
| 이 test가 증명하지 않는 것 | exact 모든 frame, 모든 ordering, rare send/event failure, formal capacity·fairness는 증명하지 않습니다. |
| test 성격 | broad integration smoke |
| 막는 회귀 | packet boundary를 command boundary로 오인하거나 identity/channel fan-out 통합이 깨지는 회귀를 막습니다. |

실행 기록:

- 실행 SHA: `6b4a7738a285`
- repository에 정의된 실행 명령: `make test` 또는 `make smoke`
- 현재 작업 환경 실행 여부: **미실행**
- 이유: 현재 런타임에서 외부 DNS가 차단되어 지정 branch의 local checkout을 만들 수 없었습니다. GitHub 연결 도구로 해당 SHA의 production/test diff와 test mechanism은 확인했지만, binary/test command의 성공 결과를 만들거나 추정하지 않았습니다.
- 실행 결과: 기록 없음

#### 다음 연결

- 다음 Thread commit: `e5e6c57db80d` — `test(irc): 실행 조건과 오류 동작 계약 검증`. 원문 역할은 “Replaces substring-oriented confidence with exact CLI, frame, and shutdown contracts.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.2 `e5e6c57db80d` — `test(irc): 실행 조건과 오류 동작 계약 검증`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | VERIFICATION, IRC_PROTOCOL, RISK |
| 원문 확정 역할 | Replaces substring-oriented confidence with exact CLI, frame, and shutdown contracts. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Replaces substring-oriented confidence with exact CLI, frame, and shutdown contracts.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | broad smoke는 주요 기능 조합을 보여 주었지만 CLI 실패, exact frame/CRLF/numeric order, timeout/rate/metrics/shutdown/log ordering을 정밀하게 고정하지 못했습니다. |
| 주요 문제와 설계 판단 | `tests/irc_contract.py` 중심의 executable contract suite를 추가해 process startup 오류, runtime options, exact/regex wire frames, protection responses, metrics field order, graceful shutdown 및 log order를 manifest와 assertion으로 검사했습니다. |
| 변경 파일·symbol | `tests/irc_contract.py — CLI and wire contract checks`<br>`Makefile — contract/test integration` |
| state / ownership 변화 | test가 server process, sockets, manifest, logs와 expected frames를 소유하며 dynamic fd/token 같은 값만 regex로 허용합니다. |
| failure 또는 boundary | invalid/missing option과 runtime timeout/rate/queue/shutdown boundary를 subprocess return code, exact line, close 및 log event로 관찰합니다. |
| 보장 / 비보장 | 보장: public CLI·wire·shutdown·observability contract의 성공/실패 shape와 ordering을 broad substring 수준보다 정확히 고정합니다.<br>비보장: rare syscall return, event add/update failure, pointer lifetime, formal fairness는 직접 주입하지 않습니다. |
| 다음 관련 변화 | b6c10bc51937/5d1286620994가 parser width 결함을 수정·검증하고 f34ab/928/5ed가 low-level deterministic failure를 추가합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `e5e6c57db80d` | `tests/irc_contract.py` | `CLI checks and record_exact/record_regex` | 정적 frame은 exact, 동적 값만 제한된 regex로 검증 |
| `e5e6c57db80d` | `tests/irc_contract.py` | `wire/shutdown/log scenarios` | timeout·rate·metrics·shutdown public ordering |

- 조사 방법: GitHub에서 `e5e6c57db80d`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### Test / verification 학습 기록

| 구분 | 역사 복원 기록 |
| --- | --- |
| 대상 production invariant | 문서화된 CLI syntax, IRC frame/CRLF/numeric ordering, protection response, metrics와 shutdown/log ordering이 public boundary와 일치합니다. |
| 재현 failure / boundary | missing/invalid args, registration/heartbeat/rate/output limits, exact numerics, signal shutdown과 final ERROR입니다. |
| test technique | compiled server subprocess + real loopback TCP + exact/limited-regex assertions + captured logs/manifest입니다. |
| 통과하는 production path | argv parser → Server/IrcApplication runtime policy → wire output → signal flag → shutdown/drain → logs입니다. |
| 이 test가 증명하는 것 | 외부 사용자가 관찰하는 성공·실패 frame과 ordering을 정확히 고정합니다. |
| 이 test가 증명하지 않는 것 | 모든 syscall/event failure, memory safety, formal latency·fairness, 내부 lifetime 안전성은 증명하지 않습니다. |
| test 성격 | exact process and wire contract integration |
| 막는 회귀 | CLI가 sign/whitespace를 허용하거나 numeric/CRLF/order/shutdown log contract가 변하는 회귀를 막습니다. |

실행 기록:

- 실행 SHA: `e5e6c57db80d`
- repository에 정의된 실행 명령: `python3 tests/irc_contract.py ./irc-relay-server` 또는 해당 Make target
- 현재 작업 환경 실행 여부: **미실행**
- 이유: 현재 런타임에서 외부 DNS가 차단되어 지정 branch의 local checkout을 만들 수 없었습니다. GitHub 연결 도구로 해당 SHA의 production/test diff와 test mechanism은 확인했지만, binary/test command의 성공 결과를 만들거나 추정하지 않았습니다.
- 실행 결과: 기록 없음

#### 다음 연결

- 다음 Thread commit: `f34ab135c546` — `test(connection): 부분 송신과 대기열 경계 검증`. 원문 역할은 “Adds deterministic Connection failure-state tests.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.3 `f34ab135c546` — `test(connection): 부분 송신과 대기열 경계 검증`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | VERIFICATION, EVENT_IO, RISK |
| 원문 확정 역할 | Adds deterministic Connection failure-state tests. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Adds deterministic Connection failure-state tests.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | Connection fix의 rare syscall/overflow branch는 real socket timing에 맡기면 반복적으로 재현하기 어려웠습니다. |
| 주요 문제와 설계 판단 | `SendStep`과 `ScriptedSender`가 Bytes/Error/Zero sequence를 반환하는 unit binary를 추가하고 production `Connection::flushPending()`에 주입했습니다. Makefile에 `connection-test`를 연결했습니다. |
| 변경 파일·symbol | `tests/connection_test.cpp — SendStep, ScriptedSender and five test groups`<br>`Makefile — connection-test` |
| state / ownership 변화 | script index, captured bytes와 Connection pending/offset/close state를 각 단계 후 동시에 assertion합니다. |
| failure 또는 boundary | EINTR→partial→EAGAIN→partial→EWOULDBLOCK→final sequence, zero then progress, EPIPE, requested size보다 큰 return, size_t max arithmetic와 exact CRLF limit을 결정적으로 재현합니다. |
| 보장 / 비보장 | 보장: successful bytes는 `abcdefghijkl` 순서로 정확히 한 번 전달되고 retryable/terminal/invalid outcome은 아직 안 보낸 bytes를 소비하지 않으며 rejected append는 queue를 변경하지 않습니다.<br>비보장: fake sender는 kernel buffer, actual readiness notification, TCP segmentation이나 peer scheduling을 검증하지 않습니다. |
| 다음 관련 변화 | de1dd0fc30d0가 real process/slow reader에서 connection-local queue isolation을 보완하고 416efc91e580가 sanitizer로 반복합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `f34ab135c546` | `tests/connection_test.cpp` | `testLimitArithmetic/testHardLimitAndLineTerminator` | size_t max와 CRLF 포함 exact-limit mutation |
| `f34ab135c546` | `tests/connection_test.cpp` | `testInterruptedAndPartialSendState` | scripted retry마다 pending offset과 exact output |
| `f34ab135c546` | `tests/connection_test.cpp` | `testZeroAndTerminalErrorPreservePendingBytes` | zero/EPIPE가 suffix를 소비하지 않음 |
| `f34ab135c546` | `tests/connection_test.cpp` | `testInvalidSendCountCannotAdvanceOffset` | oversize return이 offset을 손상시키지 않음 |

- 조사 방법: GitHub에서 `f34ab135c546`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### Test / verification 학습 기록

| 구분 | 역사 복원 기록 |
| --- | --- |
| 대상 production invariant | logical pending limit은 overflow하지 않고, offset은 검증된 successful byte만큼만 전진하며 unsent suffix가 exact order로 보존됩니다. |
| 재현 failure / boundary | size_t max, CRLF exact limit, EINTR, partial, EAGAIN/EWOULDBLOCK, zero, EPIPE, impossible oversize return입니다. |
| test technique | injected send operation을 사용하는 deterministic scripted unit test입니다. |
| 통과하는 production path | queueRaw/queueLine → overflow-safe admission → flushPending → injected send result → offset/close/pending query입니다. |
| 이 test가 증명하는 것 | rare outcome sequence에서 exact byte accounting과 mutation-free rejection을 직접 증명합니다. |
| 이 test가 증명하지 않는 것 | real kernel readiness, TCP delivery acknowledgement, end-to-end fairness는 증명하지 않습니다. |
| test 성격 | deterministic transport boundary regression |
| 막는 회귀 | partial retry 중 byte 중복·유실, unsigned wrap, invalid return으로 offset이 깨지는 회귀를 막습니다. |

실행 기록:

- 실행 SHA: `f34ab135c546`
- repository에 정의된 실행 명령: `make connection-test` 또는 `make test`
- 현재 작업 환경 실행 여부: **미실행**
- 이유: 현재 런타임에서 외부 DNS가 차단되어 지정 branch의 local checkout을 만들 수 없었습니다. GitHub 연결 도구로 해당 SHA의 production/test diff와 test mechanism은 확인했지만, binary/test command의 성공 결과를 만들거나 추정하지 않았습니다.
- 실행 결과: 기록 없음

#### 다음 연결

- 다음 Thread commit: `928594ec160c` — `test(server): 연결 제거와 이벤트 등록 실패 경로 검증`. 원문 역할은 “Adds deterministic Server ownership and rollback tests.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.4 `928594ec160c` — `test(server): 연결 제거와 이벤트 등록 실패 경로 검증`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | VERIFICATION, LIFECYCLE, RISK |
| 원문 확정 역할 | Adds deterministic Server ownership and rollback tests. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Adds deterministic Server ownership and rollback tests.

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

- 다음 Thread commit: `5edcafda8a4d` — `test(app): 작은 송신 한도에서 상태 정리 검증`. 원문 역할은 “Adds deterministic application cleanup verification.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.5 `5edcafda8a4d` — `test(app): 작은 송신 한도에서 상태 정리 검증`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | VERIFICATION, LIFECYCLE, RISK |
| 원문 확정 역할 | Adds deterministic application cleanup verification. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Adds deterministic application cleanup verification.

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

- 다음 Thread commit: `de1dd0fc30d0` — `test(event): 160개 연결과 느린 수신자 처리 공정성 검증`. 원문 역할은 “Adds 160-peer readiness and slow-receiver isolation evidence.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.6 `de1dd0fc30d0` — `test(event): 160개 연결과 느린 수신자 처리 공정성 검증`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | VERIFICATION, EVENT_IO, RISK |
| 원문 확정 역할 | Adds 160-peer readiness and slow-receiver isolation evidence. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Adds 160-peer readiness and slow-receiver isolation evidence.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | deterministic unit/lifetime tests는 rare branch를 고정했지만 많은 live fd와 실제 읽지 않는 recipient 아래 다른 connection progress를 보여 주는 process-level 증거가 없었습니다. |
| 주요 문제와 설계 판단 | `irc_event_fairness.py`와 Make `event-test`를 추가했습니다. 첫 scenario는 160개 non-blocking peer가 각기 다른 PING을 보내 exact PONG을 공통 deadline 안에 받게 하고, 둘째는 receive buffer 1024인 slow peer에게 4096개의 400-byte PRIVMSG를 보내는 동안 unrelated probe의 PING/PONG이 15초 안에 진행되는지 확인했습니다. |
| 변경 파일·symbol | `tests/irc_event_fairness.py — check_many_connections, check_slow_receiver_isolation, process harness`<br>`Makefile — event-test/test integration` |
| state / ownership 변화 | Python selector가 160 peer socket과 expected PONG/buffer를 관리하고 separate slow/sender/probe sockets가 connection-local pressure를 만듭니다. |
| failure 또는 boundary | 어느 peer든 PONG을 못 받거나 slow receiver 때문에 probe가 멈추거나 server가 SIGTERM 후 정상 종료하지 못하면 captured server output과 함께 실패합니다. |
| 보장 / 비보장 | 보장: 160 live descriptors에서 readiness fan-out이 진행되고 한 unread recipient의 pending pressure가 unrelated connection의 기본 progress를 막지 않는다는 관찰 증거를 제공합니다.<br>비보장: formal fairness, latency SLO, 최대 capacity, 모든 fd limit과 scheduler adversary를 증명하지 않으며 한 구성·한 workload의 regression입니다. |
| 다음 관련 변화 | 416efc91e580가 이 real-process suite를 Linux epoll과 macOS kqueue 모두에서 자동 반복합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `de1dd0fc30d0` | `tests/irc_event_fairness.py` | `check_many_connections` | 160 exact PONG을 selector와 monotonic deadline으로 수집 |
| `de1dd0fc30d0` | `tests/irc_event_fairness.py` | `check_slow_receiver_isolation` | slow recipient flood 중 unrelated probe progress |
| `de1dd0fc30d0` | `tests/irc_event_fairness.py` | `stop_server` | SIGTERM bounded normal exit contract |

- 조사 방법: GitHub에서 `de1dd0fc30d0`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### Test / verification 학습 기록

| 구분 | 역사 복원 기록 |
| --- | --- |
| 대상 production invariant | 높은 fd 수와 connection-local backpressure에서도 unrelated connection의 event-loop progress가 유지되어야 합니다. |
| 재현 failure / boundary | 160 simultaneous peers와 한 unread receiver에 대한 4096×400-byte message flood입니다. |
| test technique | compiled real server process + loopback sockets + Python selectors + small receive buffer + monotonic deadlines입니다. |
| 통과하는 production path | many accept registrations → epoll/kqueue wait → per-connection read/queue/write → slow pending queue while probe PING/PONG progresses입니다. |
| 이 test가 증명하는 것 | 해당 workload에서 fd>select 전통 한계 수준과 slow-reader isolation을 실제 process로 보여 줍니다. |
| 이 test가 증명하지 않는 것 | formal fairness, worst-case latency, maximum connection capacity, 모든 backpressure pattern은 증명하지 않습니다. |
| test 성격 | real-process stress and progress-isolation regression |
| 막는 회귀 | 고정 배열/fd 한계, 한 느린 recipient가 event loop 전체를 정지시키는 회귀를 막습니다. |

실행 기록:

- 실행 SHA: `de1dd0fc30d0`
- repository에 정의된 실행 명령: `make event-test` 또는 `make test`
- 현재 작업 환경 실행 여부: **미실행**
- 이유: 현재 런타임에서 외부 DNS가 차단되어 지정 branch의 local checkout을 만들 수 없었습니다. GitHub 연결 도구로 해당 SHA의 production/test diff와 test mechanism은 확인했지만, binary/test command의 성공 결과를 만들거나 추정하지 않았습니다.
- 실행 결과: 기록 없음

#### 다음 연결

- 다음 Thread commit: `416efc91e580` — `ci: Linux·macOS 회귀와 새니타이저 자동화`. 원문 역할은 “Runs the complete suite on Linux and macOS and under ASan and UBSan.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.7 `416efc91e580` — `ci: Linux·macOS 회귀와 새니타이저 자동화`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | BUILD, VERIFICATION, RISK |
| 원문 확정 역할 | Runs the complete suite on Linux and macOS and under ASan and UBSan. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Runs the complete suite on Linux and macOS and under ASan and UBSan.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | 모든 test target이 로컬에서 실행 가능했지만 epoll/kqueue 양쪽과 sanitizer instrumentation 아래 반복된다는 repository-level enforcement가 없었습니다. |
| 주요 문제와 설계 판단 | GitHub Actions workflow를 추가해 `ubuntu-latest`와 `macos-latest` matrix에서 `make -j2`와 `make test`를 실행하고, 별도 Ubuntu job에서 ASan+UBSan·frame pointer·leak detection·halt-on-error flags로 동일 binary/tests를 build/run하도록 했습니다. |
| 변경 파일·symbol | `.github/workflows/ci.yml — platform-regression and linux-sanitizers jobs` |
| state / ownership 변화 | matrix OS가 default EventManager factory를 통해 각각 epoll/kqueue backend를 선택하고 sanitizer CXXFLAGS가 production binary와 unit/network test builds에 동일하게 전달됩니다. |
| failure 또는 boundary | 어느 OS build/test 또는 sanitizer report라도 job을 실패시키며 matrix는 fail-fast=false로 다른 platform 결과도 수집합니다. |
| 보장 / 비보장 | 보장: complete Make test graph를 Linux/macOS 및 Linux ASan/UBSan에서 push/PR마다 반복하도록 자동화합니다.<br>비보장: CI runner가 지원하지 않는 OS/compiler, TSan, exhaustive race/fuzz/formal verification은 포함하지 않습니다. workflow 정의의 존재는 현재 run 성공 이력 자체와 동일하지 않습니다. |
| 다음 관련 변화 | Thread 09의 broad→exact→injected→stress evidence를 두 readiness backend와 dynamic checks에 연결하는 최종 enforcement입니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `416efc91e580` | `.github/workflows/ci.yml` | `platform-regression matrix` | ubuntu/macos에서 build와 complete make test 실행 |
| `416efc91e580` | `.github/workflows/ci.yml` | `linux-sanitizers job` | ASan+UBSan/leak options를 build와 test 전체에 전달 |

- 조사 방법: GitHub에서 `416efc91e580`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### Test / verification 학습 기록

| 구분 | 역사 복원 기록 |
| --- | --- |
| 대상 production invariant | 동일 regression graph가 Linux epoll, macOS kqueue, ASan/UBSan instrumentation에서 반복 가능해야 합니다. |
| 재현 failure / boundary | cross-platform compilation/warnings, complete unit/network tests, address/undefined/leak failures입니다. |
| test technique | GitHub Actions OS matrix와 separate sanitizer CI job입니다. |
| 통과하는 production path | checkout → make production/tests → make test → backend factory/network process/unit binaries입니다. |
| 이 test가 증명하는 것 | workflow가 두 OS와 sanitizer에서 같은 suite를 실행하도록 구성되었음을 코드로 증명합니다. |
| 이 test가 증명하지 않는 것 | 이 작업 환경에서 실제 CI run이 성공했다는 사실, TSan/Windows/BSD와 모든 UB class는 증명하지 않습니다. |
| test 성격 | continuous cross-platform and dynamic-analysis enforcement |
| 막는 회귀 | 한 backend에서만 compile/test되거나 memory/UB defect가 일반 build에서 숨는 회귀를 막습니다. |

실행 기록:

- 실행 SHA: `416efc91e580`
- repository에 정의된 실행 명령: workflow의 `make -j2`, `make test`, sanitizer CXXFLAGS build/test
- 현재 작업 환경 실행 여부: **미실행**
- 이유: 현재 런타임에서 외부 DNS가 차단되어 지정 branch의 local checkout을 만들 수 없었습니다. GitHub 연결 도구로 해당 SHA의 production/test diff와 test mechanism은 확인했지만, binary/test command의 성공 결과를 만들거나 추정하지 않았습니다.
- 실행 결과: 기록 없음

#### 다음 연결

- 이 commit은 이 Thread의 마지막 항목입니다. 아래 Invariant ledger와 Thread 최종 상태에서 전체 변화를 연결합니다.

## 6. Invariant ledger

| Invariant | 처음 도입 | 강화/적용 | 학습자 최종 기록 | Fix/Test 연결 |
| --- | --- | --- | --- | --- |
| broad live integration | `6b4a7738a285` | real process/TCP smoke | 여러 subsystem의 조합을 넓게 확인하지만 assertion precision은 낮습니다. | e5e6c57db80d |
| exact public contract | `e5e6c57db80d` | CLI/wire/shutdown/log exact assertions | 외부 behavior와 ordering을 정밀하게 고정합니다. | low-level rare failure는 별도 seam 필요 |
| deterministic layer failures | `f34ab135c546` | 928594ec160c, 5edcafda8a4d | send operation, event backend, queue limit로 rare branch를 재현합니다. | 각 architecture risk와 직접 대응 |
| real-process pressure isolation | `de1dd0fc30d0` | 160 peers + slow receiver | 실제 descriptor 수와 backpressure에서 progress evidence를 추가합니다. | formal fairness/capacity는 아님 |
| cross-platform/dynamic enforcement | `416efc91e580` | Linux/macOS matrix + ASan/UBSan | complete make test graph를 두 backend와 sanitizer에 반복합니다. | 현재 run 성공 자체는 workflow inspection과 구분 |

도입과 완성을 같은 의미로 쓰지 않았습니다. 후속 fix가 이전 SHA의 사실을 바꾸지 않도록 각 시점의 보장과 부족함을 분리했습니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 | 실제 failure / risk | Fix 또는 기반 변화 | 수정된 decision / semantics | Test 연결 |
| --- | --- | --- | --- | --- |
| broad substring smoke만 충분 | exact frame/order와 rare branch가 숨음 | e5e6c57db80d + layer tests | contract와 deterministic injection 분리 | f34ab/928/5ed |
| real socket에서 rare syscall/event failure를 기다림 | timing-dependent·불안정 재현 | SendOperation/FakeEventManager/tiny queue | production path에 controlled failure 주입 | f34ab/928/5ed |
| 단일 OS local success면 portable | epoll/kqueue 또는 sanitizer에서만 나타나는 결함 | 416efc91e580 | OS matrix와 same-suite instrumentation | CI jobs |

## 8. Ownership / state / responsibility 변화

| 책임 또는 상태 | 이전 상태 | 이후 authoritative 위치 | 관련 commit | 확인 결과 |
| --- | --- | --- | --- | --- |
| process lifecycle fixture | 없음 | shell/Python smoke harness | 6b4a7738a285 | path/symbol은 위 commit 증거표에 연결했습니다. |
| public contract oracle | substring expectation | exact/regex manifest | e5e6c57db80d | path/symbol은 위 commit 증거표에 연결했습니다. |
| transport failure script | kernel timing | ScriptedSender | f34ab135c546 | path/symbol은 위 commit 증거표에 연결했습니다. |
| server backend failure control | native backend | FakeEventManager | 928594ec160c | path/symbol은 위 commit 증거표에 연결했습니다. |
| application failure trigger | 우연한 send pressure | maxPendingBytes=1 + captured log | 5edcafda8a4d | path/symbol은 위 commit 증거표에 연결했습니다. |
| portable enforcement | developer local environment | GitHub Actions matrix/sanitizer | 416efc91e580 | path/symbol은 위 commit 증거표에 연결했습니다. |

## 9. Thread 최종 상태

- 시작 직전 상태: parser·registry·registration·channel 기능이 실제 process/socket 안에서 함께 동작한다는 통합 증거가 없었습니다.
- 마지막 commit `416efc91e580` 시점의 상태: complete Make test graph를 Linux/macOS 및 Linux ASan/UBSan에서 push/PR마다 반복하도록 자동화합니다.
- Thread 안에서 강화된 핵심 invariant: broad live integration, exact public contract, deterministic layer failures, real-process pressure isolation, cross-platform/dynamic enforcement.
- 남은 한계 또는 후속 Thread에서 보강되는 부분: CI runner가 지원하지 않는 OS/compiler, TSan, exhaustive race/fuzz/formal verification은 포함하지 않습니다. workflow 정의의 존재는 현재 run 성공 이력 자체와 동일하지 않습니다. Thread 09의 broad→exact→injected→stress evidence를 두 readiness backend와 dynamic checks에 연결하는 최종 enforcement입니다.
- 최종 설명: `6b4a7738a285`에서 시작한 책임은 commit map 순서대로 상태 owner, failure branch와 cleanup ordering을 추가했고 `416efc91e580`에서 이 Thread가 정한 검증 또는 운영 상태에 도달합니다. 이전 시점의 미보장은 후속 fix/test SHA를 별도로 연결했으며 final HEAD 상태를 과거 commit에 소급하지 않았습니다.

## 10. 최종 architecture 또는 execution flow 정리

| 단계 | SHA | Caller / callee / state owner | 정상 transition | failure / cleanup transition |
| --- | --- | --- | --- | --- |
| broad integration | 6b4a7738a285 | `make smoke/test` | real server + peers + substring assertions | 실패 시 process/log cleanup |
| exact contract | e5e6c57db80d | `irc_contract.py` | exact frame/CLI/shutdown/log assertions | dynamic value만 limited regex |
| deterministic units | f34ab135c546 / 928594ec160c / 5edcafda8a4d | `injected sender/backend/limit` | production Connection/Server/App paths | rare branch를 fixed outcome으로 재현 |
| stress isolation | de1dd0fc30d0 | `irc_event_fairness.py` | 160 fd exact PONG + slow-reader/probe | deadline miss 또는 abnormal exit는 failure |
| CI enforcement | 416efc91e580 | `GitHub Actions` | ubuntu/macos make test + Linux ASan/UBSan | 한 job failure가 regression signal |

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
