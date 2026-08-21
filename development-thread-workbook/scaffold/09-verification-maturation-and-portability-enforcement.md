# Thread 09 — Verification maturation and portability enforcement

부제: 검증 성숙과 이식성 강제

## 1. Thread 목표

broad live-TCP smoke에서 exact public contract, injected transport/server/application failure tests, high-descriptor·slow-reader isolation, Linux/macOS·sanitizer CI로 verification architecture가 성숙하는 과정을 복원합니다.

Source에서 확정된 significance:

> Verification evolves from broad functional integration to exact public contracts, injected transport and event failures, application-lifetime tests, and real-process descriptor pressure. The CI commit then makes the same evidence repeatable for both readiness backends and under dynamic memory and undefined-behavior checks. No individual test proves absolute fairness or every failure class, but together they align the verification structure with the architecture's highest-risk boundaries.

이 문서의 source-confirmed 문장은 학습 방향을 고정하기 위한 출발점입니다. 실제 함수 동작, ownership, branch, 실행 결과는 반드시 각 SHA 코드와 test를 직접 확인해 채웁니다.

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

- 각 test commit을 production invariant, reproduced failure/boundary, technique, code path, proves/does not prove, test type, prevented regression으로 분류했습니다.
- smoke → exact contract → deterministic layer tests → stress/isolation → CI의 confidence 증가를 설명할 수 있습니다.
- test double과 real socket/process를 선택한 이유를 각 failure 특성에 맞게 설명할 수 있습니다.
- CI matrix와 sanitizer flags가 Makefile target 전체에 전달되는지 확인했습니다.
- 검증되지 않은 formal fairness, latency, maximum capacity, 모든 syscall failure class를 과장하지 않았습니다.

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

Commit 순서는 source에 정의된 순서입니다. 이 문서 안에서 재정렬하지 않습니다.

## 5. Commit별 학습 기록

각 commit에서 final HEAD를 보지 말고 해당 SHA의 tree와 필요한 parent/직전 관련 SHA만 확인합니다. 아래의 implementation anchor는 source에서 확정된 내용이며, code evidence 칸은 학습자가 직접 채웁니다.

### 5.1 `6b4a7738a285` — `test(smoke): 실제 TCP 등록과 채널 흐름 검증`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | VERIFICATION, INTEGRATION, RISK |
| 원문 확정 역할 | Adds the first full real-TCP smoke flow. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 thread에서는 broad smoke에서 시작하는 verification maturity의 기준점으로 봅니다.

#### Source에서 확정된 implementation anchor

- 실제 loopback TCP socket과 compiled server process를 사용하는 첫 broad end-to-end smoke harness입니다.
- runner는 free port 선택, process launch, accept readiness wait, isolated log, EXIT trap cleanup을 제공합니다.
- scenario는 password rejection, complete registration, fragmented input, nickname collision, channel/messaging/mode/cleanup 흐름을 통합 검증합니다.

Source가 이름을 명시한 확인 대상:

- `test`, `smoke`

#### 해당 SHA에서 확인할 코드

- shell runner가 server binary를 어떤 option으로 실행하고 readiness를 어떻게 판정하며 실패 시 어떤 log를 남기는지 확인합니다.
- Python peer가 command를 두 TCP write로 쪼개는 지점과 server framing path가 packet boundary와 무관함을 검증하는 assertion을 찾습니다.
- 등록, NAMES/TOPIC, direct/channel PRIVMSG, INVITE, +i/+o, KICK, PART, QUIT가 실제 어떤 production callback과 handler를 통과하는지 추적합니다.
- assertion이 substring 기반인지 exact frame 기반인지 이 SHA의 test technique을 명시합니다.
- cleanup trap이 success/failure 모두에서 process와 temporary files를 정리하는지 확인합니다.

비교 기준:

- 기본 비교: `6b4a7738a285^` → `6b4a7738a285`

Source가 지목한 failure/risk 출발점:

> 각 단위가 독립적으로 맞아도 socket, event loop, parser, registry, replies, channel state가 연결된 실행에서는 ordering이나 framing 오류가 생길 수 있습니다.

#### Test / verification 학습 기록

| 구분 | Source에서 확정된 출발점 | 학습자 코드·실행 기록 |
| --- | --- | --- |
| 대상 production invariant | transport framing, registration, nickname index, channel state와 queued send가 한 process에서 결합되는 production invariant | [관련 production path와 symbol을 추가] |
| 재현 failure / boundary | wrong password, fragmented TCP input, case-insensitive collision, multi-client channel/mode/message/cleanup 흐름 | [입력, state, injected result를 정확히 기록] |
| test technique | compiled server + real loopback TCP + shell process harness + Python peer의 broad substring-oriented assertions | [test double/real socket/process의 구성 증거] |
| 통과하는 production code path | process startup → listener/event loop → Connection framing → parser → IrcApplication dispatch → registry/channel → queued output | [caller → callee → branch를 해당 SHA에서 연결] |
| 이 test가 증명하는 것 | 주요 계층이 실제 socket과 process 안에서 통합되어 정상·일부 오류 흐름을 수행함 | [실행 결과와 assertion 근거] |
| 이 test가 증명하지 않는 것 | exact frame 전체, 모든 ordering/CRLF, rare syscall/event failure, formal capacity나 fairness | [과장하지 않을 범위] |
| test 성격 | broad end-to-end integration smoke | [broad/deterministic 판단 근거] |
| 막는 회귀 | packet boundary를 command boundary로 취급하거나 registry/channel fan-out이 통합 시 깨지는 회귀 | [후속 변경에서 깨질 수 있는 invariant] |

실행 기록:

- 실행 SHA: `[확인한 SHA]`
- 실행 환경: `[OS, compiler, sanitizer 또는 Python version 등]`
- 실행 명령: `[실제 명령]`
- 결과: `[pass/fail 및 핵심 assertion]`
- 실패 시 transcript/log: `[최소 재현에 필요한 부분]`
- production 코드와 test 코드의 대응: `[path/symbol 쌍]`


#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| 6b4a7738a285 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 6b4a7738a285^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `e5e6c57db80d` — `test(irc): 실행 조건과 오류 동작 계약 검증`. 원문 역할은 “Replaces substring-oriented confidence with exact CLI, frame, and shutdown contracts.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.2 `e5e6c57db80d` — `test(irc): 실행 조건과 오류 동작 계약 검증`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | VERIFICATION, IRC_PROTOCOL, RISK |
| 원문 확정 역할 | Replaces substring-oriented confidence with exact CLI, frame, and shutdown contracts. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 thread에서는 broad substring smoke를 exact public contract로 강화한 verification 전환점으로 봅니다.

#### Source에서 확정된 implementation anchor

- CLI failure, exact IRC wire behavior, orderly process shutdown을 한 executable contract suite로 규정합니다.
- peer helper는 actual line ending 보존, next-frame sequence, exact/anchored-regex match, peer close, hostmask reconstruction을 지원합니다.
- registration 001–003 order와 CRLF, command numerics, channel events, metric key order, shutdown ERROR/EOF, structured log order를 검증합니다.
- optional manifest는 dynamic values를 normalize하고 stable compatibility contract를 분리합니다.

Source가 이름을 명시한 확인 대상:

- `EINVAL`, `ERROR :Server shutting down`

#### 해당 SHA에서 확인할 코드

- CLI subprocess assertions에서 exit status, stdout emptiness, stderr diagnostic exactness를 case별로 확인합니다.
- socket peer가 substring search 대신 complete frame/next frame/regex/CRLF를 어떻게 판정하는지 helper 구현을 확인합니다.
- 등록, nickname collision, fragmented input, JOIN/LIST/NAMES/TOPIC, modes, messaging, throttle, heartbeat의 assertion이 통과하는 production path를 적습니다.
- SIGTERM 뒤 shutdown ERROR 수신, EOF, process exit, structured log order를 어떤 순서로 기다리는지 확인합니다.
- dynamic port/counter를 exact value가 아닌 regex/normalization으로 다루는 범위를 기록합니다.
- broad live-process test가 증명하지 못하는 deterministic internal failure와 formal fairness 범위를 명시합니다.

비교 기준:

- 기본 비교: `e5e6c57db80d^` → `e5e6c57db80d`
- Thread 직전 관련 SHA: `6b4a7738a285` — `test(smoke): 실제 TCP 등록과 채널 흐름 검증`
- 직전 broad smoke `6b4a7738a285`와 assertion precision 및 public boundary 범위를 비교합니다.

Source가 지목한 failure/risk 출발점:

> substring 기반 smoke는 frame 순서, CRLF, parameter 위치, 종료 전달과 log ordering의 회귀를 놓칠 수 있습니다.

#### Test / verification 학습 기록

| 구분 | Source에서 확정된 출발점 | 학습자 코드·실행 기록 |
| --- | --- | --- |
| 대상 production invariant | public executable의 CLI, exact IRC wire, shutdown delivery와 structured log ordering contract | [관련 production path와 symbol을 추가] |
| 재현 failure / boundary | invalid CLI, pre-registration rejection, collision/password failure, exact frame sequence, throttling/heartbeat, SIGTERM drain과 EOF | [입력, state, injected result를 정확히 기록] |
| test technique | subprocess CLI checks + protocol-aware real TCP peer + exact/regex/next-frame/CRLF/close assertions + log-order inspection | [test double/real socket/process의 구성 증거] |
| 통과하는 production code path | binary entrypoint/config → full server/application runtime → shutdown sequence → stderr log | [caller → callee → branch를 해당 SHA에서 연결] |
| 이 test가 증명하는 것 | 명시된 public success/failure 계약과 lifecycle order가 live executable에서 관찰됨 | [실행 결과와 assertion 근거] |
| 이 test가 증명하지 않는 것 | 내부 rare failure branch의 exhaustive coverage, formal fairness/latency, 모든 환경의 dynamic counter exact 값 | [과장하지 않을 범위] |
| test 성격 | broad but exact executable contract test | [broad/deterministic 판단 근거] |
| 막는 회귀 | substring smoke가 놓치던 frame/order/diagnostic/shutdown/log 호환성 회귀 | [후속 변경에서 깨질 수 있는 invariant] |

실행 기록:

- 실행 SHA: `[확인한 SHA]`
- 실행 환경: `[OS, compiler, sanitizer 또는 Python version 등]`
- 실행 명령: `[실제 명령]`
- 결과: `[pass/fail 및 핵심 assertion]`
- 실패 시 transcript/log: `[최소 재현에 필요한 부분]`
- production 코드와 test 코드의 대응: `[path/symbol 쌍]`


#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| e5e6c57db80d | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| e5e6c57db80d^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `f34ab135c546` — `test(connection): 부분 송신과 대기열 경계 검증`. 원문 역할은 “Adds deterministic Connection failure-state tests.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.3 `f34ab135c546` — `test(connection): 부분 송신과 대기열 경계 검증`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | VERIFICATION, EVENT_IO, RISK |
| 원문 확정 역할 | Adds deterministic Connection failure-state tests. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 thread에서는 broad live-process test가 재현하기 어려운 transport failure를 deterministic unit layer로 분리한 단계로 봅니다.

#### Source에서 확정된 implementation anchor

- scripted sender가 byte count와 errno sequence를 주입해 scheduler/socket pressure 없이 write state transition을 재현합니다.
- tests는 size_t maximum, exact-limit CRLF admission, first excess rejection, existing queue preservation을 다룹니다.
- partial scenario는 EINTR, successful prefixes, EAGAIN/EWOULDBLOCK, capacity reuse, final completion을 결합하고 exact output `abcdefghijkl`을 검증합니다.
- zero send, EPIPE, impossible oversized count도 offset corruption 없이 처리되어야 합니다.

Source가 이름을 명시한 확인 대상:

- `make test`, `std::size_t`, `abcdefghijkl`

#### 해당 SHA에서 확인할 코드

- test executable이 production `Connection`을 어떤 injectable sender로 구성하는지 확인합니다.
- script step마다 requested suffix와 returned result, expected pending count/offset을 표로 복원합니다.
- sent bytes를 test double이 어떻게 capture하고 final exact string이 duplication/omission/reordering을 검증하는지 확인합니다.
- capacity reuse가 partial progress 뒤 `pendingBytes()` 감소를 실제 admission에 반영하는지 확인합니다.
- zero/EPIPE/oversize result case가 result enum, close request, pending preservation을 각각 assertion하는지 확인합니다.
- default `make test`에서 smoke보다 먼저 실행되고 generated binary가 clean/ignore 대상인지 확인합니다.

비교 기준:

- 기본 비교: `f34ab135c546^` → `f34ab135c546`
- Thread 직전 관련 SHA: `e5e6c57db80d` — `test(irc): 실행 조건과 오류 동작 계약 검증`

Source가 지목한 failure/risk 출발점:

> real TCP 테스트는 특정 short-send/errno sequence를 안정적으로 만들 수 없어 핵심 offset invariant의 rare branch를 놓칩니다.

#### Test / verification 학습 기록

| 구분 | Source에서 확정된 출발점 | 학습자 코드·실행 기록 |
| --- | --- | --- |
| 대상 production invariant | queued byte가 exact send progress만큼만 제거되고 retry/failure 동안 unsent suffix가 보존되는 transport invariant | [관련 production path와 symbol을 추가] |
| 재현 failure / boundary | size_t maximum, exact limit/CRLF, excess rejection, EINTR, EAGAIN/EWOULDBLOCK, partial, zero, EPIPE, impossible count | [입력, state, injected result를 정확히 기록] |
| test technique | injectable scripted send operation을 사용하는 focused C++ unit executable | [test double/real socket/process의 구성 증거] |
| 통과하는 production code path | Connection queue admission → flushPending → scripted operation → offset/pending/result/close state | [caller → callee → branch를 해당 SHA에서 연결] |
| 이 test가 증명하는 것 | 정해진 syscall outcome sequence에서 duplication/omission/reordering 없이 exact accounting을 유지함 | [실행 결과와 assertion 근거] |
| 이 test가 증명하지 않는 것 | 실제 kernel scheduler와 socket buffer pressure의 모든 조합, server/application integration | [과장하지 않을 범위] |
| test 성격 | deterministic unit-level state-machine regression | [broad/deterministic 판단 근거] |
| 막는 회귀 | overflow admission, retry-state corruption, invalid count offset overrun, CRLF capacity 오계산 | [후속 변경에서 깨질 수 있는 invariant] |

실행 기록:

- 실행 SHA: `[확인한 SHA]`
- 실행 환경: `[OS, compiler, sanitizer 또는 Python version 등]`
- 실행 명령: `[실제 명령]`
- 결과: `[pass/fail 및 핵심 assertion]`
- 실패 시 transcript/log: `[최소 재현에 필요한 부분]`
- production 코드와 test 코드의 대응: `[path/symbol 쌍]`


#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| f34ab135c546 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| f34ab135c546^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `928594ec160c` — `test(server): 연결 제거와 이벤트 등록 실패 경로 검증`. 원문 역할은 “Adds deterministic Server ownership and rollback tests.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.4 `928594ec160c` — `test(server): 연결 제거와 이벤트 등록 실패 경로 검증`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | VERIFICATION, LIFECYCLE, RISK |
| 원문 확정 역할 | Adds deterministic Server ownership and rollback tests. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 thread에서는 verification architecture가 fake backend injection으로 확장된 단계로 봅니다.

#### Source에서 확정된 implementation anchor

- injectable `FakeEventManager`는 interest 기록, next add/update failure, selected readable event delivery를 제공합니다.
- suite는 accept 후 add failure rollback, connect/line callback self-disconnect+throw, error handler throw containment, write-interest update failure cleanup, queue-limit immediate close를 검증합니다.
- real loopback clients를 사용하지만 host epoll/kqueue timing에는 의존하지 않습니다.

Source가 이름을 명시한 확인 대상:

- `FakeEventManager`, `accept()`, `sendTo()`

#### 해당 SHA에서 확인할 코드

- fake backend interface가 production `EventManager` contract를 어떻게 구현하고 failure flag를 언제 소비하는지 확인합니다.
- add failure case에서 server map, fake registrations, client socket EOF/close 상태를 어떤 assertion으로 확인하는지 기록합니다.
- connect/line callback이 같은 fd를 disconnect한 뒤 throw하도록 구성하는 코드와 server가 crash/stale access 없이 돌아오는 assertion을 확인합니다.
- error handler exception containment test가 원래 infrastructure failure를 어떻게 주입하는지 확인합니다.
- update failure 뒤 `sendTo()` false, map removal, fake registration removal을 함께 검증하는지 확인합니다.
- queue limit overflow로 pending bytes가 0인 close request가 즉시 cleanup되는 production path를 연결합니다.

비교 기준:

- 기본 비교: `928594ec160c^` → `928594ec160c`
- Thread 직전 관련 SHA: `f34ab135c546` — `test(connection): 부분 송신과 대기열 경계 검증`

Source가 지목한 failure/risk 출발점:

> broad integration test로는 callback self-removal과 exact event registration failure 시점을 재현하기 어렵습니다.

#### Test / verification 학습 기록

| 구분 | Source에서 확정된 출발점 | 학습자 코드·실행 기록 |
| --- | --- | --- |
| 대상 production invariant | connection map, event registration, fd lifetime과 callback reentrancy가 함께 수렴하는 Server invariant | [관련 production path와 symbol을 추가] |
| 재현 failure / boundary | accept add failure, connect/line self-disconnect+throw, error-handler throw, update failure, queue-limit immediate close | [입력, state, injected result를 정확히 기록] |
| test technique | injectable FakeEventManager + real loopback clients + selected event/failure delivery | [test double/real socket/process의 구성 증거] |
| 통과하는 production code path | listener/accept → map insert/event add → callback → refresh/update/send → disconnect/RAII cleanup | [caller → callee → branch를 해당 SHA에서 연결] |
| 이 test가 증명하는 것 | 정확히 주입된 server lifecycle failure에서 stale access나 divergent registration 없이 정리됨 | [실행 결과와 assertion 근거] |
| 이 test가 증명하지 않는 것 | native epoll/kqueue timing/flag translation, full IRC application state cleanup | [과장하지 않을 범위] |
| test 성격 | deterministic server-lifetime integration test | [broad/deterministic 판단 근거] |
| 막는 회귀 | use-after-free, leaked fd/map entry, stale event registration, error callback가 cleanup을 중단하는 문제 | [후속 변경에서 깨질 수 있는 invariant] |

실행 기록:

- 실행 SHA: `[확인한 SHA]`
- 실행 환경: `[OS, compiler, sanitizer 또는 Python version 등]`
- 실행 명령: `[실제 명령]`
- 결과: `[pass/fail 및 핵심 assertion]`
- 실패 시 transcript/log: `[최소 재현에 필요한 부분]`
- production 코드와 test 코드의 대응: `[path/symbol 쌍]`


#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| 928594ec160c | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 928594ec160c^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `5edcafda8a4d` — `test(app): 작은 송신 한도에서 상태 정리 검증`. 원문 역할은 “Adds deterministic application cleanup verification.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.5 `5edcafda8a4d` — `test(app): 작은 송신 한도에서 상태 정리 검증`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | VERIFICATION, LIFECYCLE, RISK |
| 원문 확정 역할 | Adds deterministic application cleanup verification. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 thread에서는 lower-level server evidence를 application cleanup과 observability ordering까지 확장한 단계로 봅니다.

#### Source에서 확정된 implementation anchor

- real Server와 IrcApplication, controllable event manager, loopback client를 조합하고 `maxPendingBytes=1`로 첫 welcome numeric enqueue를 deterministic하게 실패시킵니다.
- NICK/USER는 registration transition까지 도달하지만 expected result는 client connection/state의 완전한 제거와 server의 지속 실행입니다.
- captured stderr에는 failed welcome 뒤 `client_registered` event가 없어야 합니다.

Source가 이름을 명시한 확인 대상:

- `Server`, `IrcApplication`, `maxPendingBytes`, `client_registered`, `main`

#### 해당 SHA에서 확인할 코드

- one-byte limit이 왜 첫 001 frame보다 작고 socket pressure 없이 queue rejection을 보장하는지 확인합니다.
- test가 PASS/NICK/USER 또는 필요한 등록 입력을 어떻게 공급해 `maybeRegister()`까지 도달시키는지 추적합니다.
- send failure → refresh/close/disconnect callback → application registry/channel cleanup production path를 연결합니다.
- connection count, registry presence, server running state를 어떤 assertion으로 구분하는지 확인합니다.
- stderr capture와 `client_registered` 부재 검사가 state mutation/observability ordering을 어떻게 증명하는지 기록합니다.
- production app sources에서 main만 제외해 test executable을 구성하고 default test/clean에 통합되는지 확인합니다.

비교 기준:

- 기본 비교: `5edcafda8a4d^` → `5edcafda8a4d`
- Thread 직전 관련 SHA: `928594ec160c` — `test(server): 연결 제거와 이벤트 등록 실패 경로 검증`

Source가 지목한 failure/risk 출발점:

> lower-level server test만으로는 application이 cleanup 뒤 welcome sequence와 registration log를 계속 실행하는지 증명할 수 없습니다.

#### Test / verification 학습 기록

| 구분 | Source에서 확정된 출발점 | 학습자 코드·실행 기록 |
| --- | --- | --- |
| 대상 production invariant | response enqueue failure가 client lifecycle을 끝내면 application이 stale state와 false registration observability를 사용하지 않는 invariant | [관련 production path와 symbol을 추가] |
| 재현 failure / boundary | 첫 welcome numeric이 one-byte pending limit에서 deterministic하게 실패함 | [입력, state, injected result를 정확히 기록] |
| test technique | real Server + real IrcApplication + controllable event manager + loopback client + tiny queue limit + stderr capture | [test double/real socket/process의 구성 증거] |
| 통과하는 production code path | NICK/USER → maybeRegister → 001 enqueue failure → Server disconnect → application cleanup → handler return/log suppression | [caller → callee → branch를 해당 SHA에서 연결] |
| 이 test가 증명하는 것 | per-client output failure가 complete cleanup으로 수렴하고 server는 유지되며 `client_registered`가 잘못 기록되지 않음 | [실행 결과와 assertion 근거] |
| 이 test가 증명하지 않는 것 | 모든 channel command continuation과 compound mutation semantics | [과장하지 않을 범위] |
| test 성격 | deterministic application-lifetime regression | [broad/deterministic 판단 근거] |
| 막는 회귀 | failed response 뒤 welcome sequence/log/state access가 계속되는 문제 | [후속 변경에서 깨질 수 있는 invariant] |

실행 기록:

- 실행 SHA: `[확인한 SHA]`
- 실행 환경: `[OS, compiler, sanitizer 또는 Python version 등]`
- 실행 명령: `[실제 명령]`
- 결과: `[pass/fail 및 핵심 assertion]`
- 실패 시 transcript/log: `[최소 재현에 필요한 부분]`
- production 코드와 test 코드의 대응: `[path/symbol 쌍]`


#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| 5edcafda8a4d | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 5edcafda8a4d^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `de1dd0fc30d0` — `test(event): 160개 연결과 느린 수신자 처리 공정성 검증`. 원문 역할은 “Adds 160-peer readiness and slow-receiver isolation evidence.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.6 `de1dd0fc30d0` — `test(event): 160개 연결과 느린 수신자 처리 공정성 검증`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | VERIFICATION, EVENT_IO, RISK |
| 원문 확정 역할 | Adds 160-peer readiness and slow-receiver isolation evidence. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Verification maturation and portability enforcement` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- 첫 scenario는 160 TCP connection이 각기 다른 pre-registration PING을 보내고 selector로 exact PONG을 한 deadline 안에 수집합니다.
- 둘째 scenario는 작은 receive buffer를 가진 non-reading recipient에 4,096개의 large PRIVMSG를 보내 sustained outbound pressure를 만듭니다.
- unrelated probe의 PING/PONG 진행으로 한 slow connection이 single event loop 전체를 막지 않는 isolation을 검증합니다.
- 명시적 high limits와 monotonic deadlines를 사용하며 correctness stress이지 throughput benchmark는 아닙니다.

#### 해당 SHA에서 확인할 코드

- 160 peer 생성/송신/selector registration과 fd별 expected token mapping을 확인합니다.
- 모든 exact PONG을 one deadline 안에 수집하면서 response가 다른 peer와 섞이지 않는 assertion을 확인합니다.
- slow recipient의 receive buffer 설정, read 중단, sender flood size/count, pending-byte/rate/connection options를 기록합니다.
- probe가 pressure 생성 뒤에도 exact PONG을 받는 production path와 timeout bound를 확인합니다.
- failure 시 process termination과 log disclosure가 bounded하게 수행되는지 확인합니다.
- 이 test가 formal fairness, latency distribution, maximum capacity를 증명하지 않는다는 source 한계를 문서화합니다.

비교 기준:

- 기본 비교: `de1dd0fc30d0^` → `de1dd0fc30d0`
- Thread 직전 관련 SHA: `5edcafda8a4d` — `test(app): 작은 송신 한도에서 상태 정리 검증`

Source가 지목한 failure/risk 출발점:

> 하나의 non-blocking socket에 backpressure가 걸렸을 때 per-connection queue가 loop를 격리하지 못하면 unrelated descriptor progress가 멈춥니다.

#### Test / verification 학습 기록

| 구분 | Source에서 확정된 출발점 | 학습자 코드·실행 기록 |
| --- | --- | --- |
| 대상 production invariant | 많은 descriptor의 fd별 readiness progress와 slow-reader backpressure의 connection-local isolation invariant | [관련 production path와 symbol을 추가] |
| 재현 failure / boundary | 160 simultaneous pre-registration PING peers와 4,096 large messages를 받지 않는 recipient | [입력, state, injected result를 정확히 기록] |
| test technique | real server process + real sockets + selector + monotonic deadline + explicit high protection limits | [test double/real socket/process의 구성 증거] |
| 통과하는 production code path | native epoll/kqueue registration/wait → Server dispatch → per-Connection queue/backpressure → unrelated probe progress | [caller → callee → branch를 해당 SHA에서 연결] |
| 이 test가 증명하는 것 | 정해진 topology와 deadline에서 fd response가 섞이지 않고 slow receiver가 unrelated connection을 완전히 막지 않음 | [실행 결과와 assertion 근거] |
| 이 test가 증명하지 않는 것 | formal fairness quantum, latency distribution, throughput benchmark, maximum supported capacity | [과장하지 않을 범위] |
| test 성격 | bounded real-process correctness stress test | [broad/deterministic 판단 근거] |
| 막는 회귀 | descriptor registration 누락/혼선, blocking send, 한 slow queue가 event loop를 정지시키는 문제 | [후속 변경에서 깨질 수 있는 invariant] |

실행 기록:

- 실행 SHA: `[확인한 SHA]`
- 실행 환경: `[OS, compiler, sanitizer 또는 Python version 등]`
- 실행 명령: `[실제 명령]`
- 결과: `[pass/fail 및 핵심 assertion]`
- 실패 시 transcript/log: `[최소 재현에 필요한 부분]`
- production 코드와 test 코드의 대응: `[path/symbol 쌍]`


#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| de1dd0fc30d0 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| de1dd0fc30d0^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `416efc91e580` — `ci: Linux·macOS 회귀와 새니타이저 자동화`. 원문 역할은 “Runs the complete suite on Linux and macOS and under ASan and UBSan.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.7 `416efc91e580` — `ci: Linux·macOS 회귀와 새니타이저 자동화`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | BUILD, VERIFICATION, RISK |
| 원문 확정 역할 | Runs the complete suite on Linux and macOS and under ASan and UBSan. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Verification maturation and portability enforcement` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- GitHub Actions는 push와 pull request마다 read-only permission으로 complete build/regression pipeline을 실행합니다.
- non-fail-fast matrix가 Ubuntu와 macOS에서 `make test`를 수행해 epoll과 kqueue를 각각 실제로 검증합니다.
- 별도 Linux job은 ASan/UBSan, frame pointer, debug info, halt-on-error/leak settings로 같은 real-network tests를 실행합니다.
- 각 job timeout은 deadlock/stalled network test를 무한 실행하지 못하게 합니다.

Source가 이름을 명시한 확인 대상:

- `make test`

#### 해당 SHA에서 확인할 코드

- workflow trigger, permissions, OS matrix, fail-fast setting, timeout을 확인합니다.
- build와 test 양쪽에 warning-as-error/default flags가 유지되고 sanitizer CXXFLAGS/LDFLAGS가 server와 test binaries 모두에 전달되는지 확인합니다.
- Linux job이 epoll, macOS job이 kqueue source selection을 Makefile을 통해 실제로 거치는지 연결합니다.
- ASan leak/abort와 UBSan stacktrace/halt environment가 어떤 defect를 job failure로 바꾸는지 기록합니다.
- complete suite에 unit, contract, smoke, fairness targets가 모두 포함되는지 Makefile dependency와 workflow command를 대조합니다.
- CI가 증명하지 않는 environment-specific load/capacity와 formal correctness 범위를 남깁니다.

비교 기준:

- 기본 비교: `416efc91e580^` → `416efc91e580`
- Thread 직전 관련 SHA: `de1dd0fc30d0` — `test(event): 160개 연결과 느린 수신자 처리 공정성 검증`

Source가 지목한 failure/risk 출발점:

> 한 플랫폼이나 비계측 local run만으로는 backend portability와 lifetime/undefined-behavior 회귀를 지속적으로 보장할 수 없습니다.

#### Test / verification 학습 기록

| 구분 | Source에서 확정된 출발점 | 학습자 코드·실행 기록 |
| --- | --- | --- |
| 대상 production invariant | 전체 verification suite가 두 supported backend와 sanitizer instrumentation 아래 지속적으로 실행되는 repository invariant | [관련 production path와 symbol을 추가] |
| 재현 failure / boundary | Ubuntu/epoll, macOS/kqueue, Linux ASan+UBSan, stalled job timeout | [입력, state, injected result를 정확히 기록] |
| test technique | GitHub Actions non-fail-fast OS matrix + separate sanitizer job + read-only permissions | [test double/real socket/process의 구성 증거] |
| 통과하는 production code path | workflow → Makefile platform selection/build → complete make test targets → process/network tests | [caller → callee → branch를 해당 SHA에서 연결] |
| 이 test가 증명하는 것 | push/PR마다 양 backend와 sanitizer 환경에서 현재 suite가 통과함 | [실행 결과와 assertion 근거] |
| 이 test가 증명하지 않는 것 | CI runner와 다른 OS/load/environment, formal correctness, suite 밖의 미작성 scenario | [과장하지 않을 범위] |
| test 성격 | continuous cross-platform verification infrastructure | [broad/deterministic 판단 근거] |
| 막는 회귀 | 한 backend만 통과하거나 test binary가 sanitizer 없이 빌드되는 문제, hang이 무한 job으로 남는 문제 | [후속 변경에서 깨질 수 있는 invariant] |

실행 기록:

- 실행 SHA: `[확인한 SHA]`
- 실행 환경: `[OS, compiler, sanitizer 또는 Python version 등]`
- 실행 명령: `[실제 명령]`
- 결과: `[pass/fail 및 핵심 assertion]`
- 실패 시 transcript/log: `[최소 재현에 필요한 부분]`
- production 코드와 test 코드의 대응: `[path/symbol 쌍]`


#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| 416efc91e580 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 416efc91e580^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 이 commit은 이 Thread의 마지막 항목입니다. Invariant ledger와 Thread 최종 상태에서 전체 변화를 연결합니다.

## 6. Invariant ledger

| Invariant | 처음 도입 | 강화/적용 | 부족함 또는 위험이 드러난 지점 | Fix/Test 연결 | 학습자 최종 기록 |
| --- | --- | --- | --- | --- | --- |
| broad integrated execution | 6b4a7738a285 | real TCP/process smoke | substring/assertion precision 한계 | e5e6c57db80d | [학습자 최종 상태 설명] |
| exact public executable contract | e5e6c57db80d | CLI/wire/shutdown/log exactness | internal rare failure localization 한계 | layer-specific deterministic tests | [학습자 최종 상태 설명] |
| Connection state-machine failures | f34ab135c546 | scripted send operation | kernel scheduling 자체는 검증하지 않음 | CI/sanitizers에서도 반복 | [학습자 최종 상태 설명] |
| Server ownership/rollback failures | 928594ec160c | FakeEventManager + real loopback | native backend timing은 별도 stress/CI | de1dd0fc30d0 / 416efc91e580 | [학습자 최종 상태 설명] |
| Application reentrant cleanup | 5edcafda8a4d | one-byte pending limit | 모든 command continuation은 별도 aee test | 08 문서와 연결 | [학습자 최종 상태 설명] |
| descriptor/backpressure isolation | de1dd0fc30d0 | 160 peers + slow reader | formal fairness/latency/capacity 미증명 | 416efc91e580 | [학습자 최종 상태 설명] |
| cross-platform repeated enforcement | 416efc91e580 | Linux/macOS matrix + ASan/UBSan | runner 밖 환경은 미검증 | 지속적 regression gate | [학습자 최종 상태 설명] |

Ledger 작성 기준:

- “도입”과 “완성”을 같은 의미로 쓰지 않습니다.
- 후속 fix가 이전 commit의 사실을 소급 변경하지 않도록 각 SHA 시점의 보장과 부족함을 분리합니다.
- source가 명시하지 않은 invariant를 추가할 때는 확정 사실이 아니라 학습자의 코드 해석으로 표시하고 path/symbol 증거를 붙입니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 | 실제 failure/risk | Fix 또는 기반 변화 | 수정된 decision/semantics | Test 연결 | 코드 증거 |
| --- | --- | --- | --- | --- | --- |
| substring smoke면 public behavior가 고정된다는 가정 | frame order/CRLF/prefix/diagnostic/log regressions 누락 | e5e6c57db80d이 exact contract로 강화 | stable/dynamic 값 구분 | 후속 fixes의 evidence base | [실제 code/test evidence] |
| real network만으로 rare failure를 재현 | short send/error/add/update/reentrant timing이 비결정적 | f34ab135c546 / 928594ec160c / 5edcafda8a4d가 injection seam 도입 | production state machine은 그대로 통과 | CI에서 반복 | [실제 code/test evidence] |
| 소수 peer functional flow면 event isolation이 충분 | high fd와 non-reading recipient에서 progress 문제 가능 | de1dd0fc30d0이 bounded correctness stress 추가 | formal benchmark 주장은 배제 | 416efc91e580이 양 backend에서 실행 | [실제 code/test evidence] |

## 8. Ownership / state / responsibility 변화

| 책임 또는 상태 | 이전 상태 | 이후 authoritative 위치 | 관련 commit | 학습자 확인 |
| --- | --- | --- | --- | --- |
| broad composition evidence | 없음 | real TCP smoke runner | 6b4a7738a285 | [확인한 owner/state/lifetime] |
| public compatibility specification | substring assertions | exact contract runner/peer | e5e6c57db80d | [확인한 owner/state/lifetime] |
| transport rare failures | kernel timing | scripted send unit executable | f34ab135c546 | [확인한 owner/state/lifetime] |
| server lifecycle failures | native event queue timing | FakeEventManager suite | 928594ec160c | [확인한 owner/state/lifetime] |
| application reentrant failure | indirect lower-layer evidence | real app + forced queue rejection | 5edcafda8a4d | [확인한 owner/state/lifetime] |
| backend isolation/scale evidence | small topology | real-process 160-peer/slow-reader test | de1dd0fc30d0 | [확인한 owner/state/lifetime] |
| continuous enforcement | local execution | GitHub Actions matrix/sanitizers | 416efc91e580 | [확인한 owner/state/lifetime] |

추가 기록:

- owner가 바뀌는 실제 코드: `[SHA / path / symbol]`
- non-owning reference 또는 identifier: `[어떤 lifetime 안에서만 유효한지]`
- state mutation 전후 순서: `[호출 순서와 실패 시 남는 상태]`
- cleanup 책임: `[normal / error / callback / shutdown 경로]`

## 9. Thread 최종 상태

- 시작 직전 상태: `[첫 commit의 parent에서 실제로 존재한 구조와 미보장 항목]`
- 마지막 commit 시점의 source-confirmed 상태: `[마지막 commit 역할을 코드로 입증한 설명]`
- Thread 안에서 강화된 핵심 invariant: `[ledger를 바탕으로 작성]`
- 남은 한계 또는 후속 Thread에서 보강되는 부분: `[관련 문서와 SHA]`
- 학습자의 최종 설명: `[이 Thread의 설계 → 구현 → failure → 수정/검증 흐름을 직접 작성]`

## 10. 최종 architecture 또는 execution flow 정리

다음 골격에 실제 symbol, state, failure branch를 채웁니다.

```text
broad smoke: [binary/process/socket] → integrated feature assertions
exact contract: [CLI + frame sequence + shutdown/log order] → stable public contract
deterministic tests: injected send / fake event / tiny queue limit → exact failure path
stress: 160 descriptor progress + slow-reader isolation → bounded correctness evidence
CI: Linux(epoll) + macOS(kqueue) + Linux ASan/UBSan → repeated regression gate
```

Execution flow 증거표:

| 단계 | SHA | Caller | Callee / state owner | 정상 transition | failure / cleanup transition |
| --- | --- | --- | --- | --- | --- |
| 1 | [SHA] | [caller] | [callee/owner] | [정상 흐름] | [실패 흐름] |
| 2 | [SHA] | [caller] | [callee/owner] | [정상 흐름] | [실패 흐름] |
| 3 | [SHA] | [caller] | [callee/owner] | [정상 흐름] | [실패 흐름] |

## 11. 학습 완료 자가 점검

- [ ] Commit map의 모든 SHA, subject, importance, tags를 source와 대조했습니다.
- [ ] 모든 commit을 해당 SHA 시점의 코드로 확인했습니다.
- [ ] final HEAD의 함수나 field를 과거 commit 설명에 소급하지 않았습니다.
- [ ] S commit은 architecture/invariant, failure, ownership/lifecycle, 후속 fix/test까지 설명할 수 있습니다.
- [ ] A commit은 주요 subsystem/boundary/failure path와 설계 판단을 설명할 수 있습니다.
- [ ] B commit은 Thread 흐름에서 맡는 구현 역할과 state 변화를 확인했습니다.
- [ ] fix commit의 기존 가정, root cause, 수정 invariant, regression test를 연결했습니다.
- [ ] test commit의 production path, technique, 증명/비증명 범위를 구분했습니다.
- [ ] Invariant ledger와 responsibility 표를 실제 path/symbol 증거로 완성했습니다.
- [ ] 이 Thread를 별도 프로젝트 재학습 없이 commit history에 근거해 설명할 수 있습니다.
