# Thread 06 — Heartbeat liveness correctness

부제: 하트비트 생존성 정확성

## 1. Thread 목표

초기 idle PING/PONG state machine의 실제 보장과 부족함을 분리하고, monotonic clock과 exact outstanding token correlation로 liveness invariant를 복구한 뒤 forged-response regression으로 고정합니다.

Source에서 확정된 significance:

> The initial feature supplied liveness policy but relied on wall-clock time and accepted any PONG as evidence for the outstanding heartbeat. The correction restores the actual invariant: deadline calculation must be monotonic, and only the response corresponding to the server's current challenge can preserve the connection. The regression test makes the forged-response failure deterministic.

이 문서의 source-confirmed 문장, commit map, SHA, subject, importance, tags와 원문 역할은 변경하지 않았습니다. 아래 학습 기록은 지정 branch의 각 exact SHA에서 확인한 code diff를 기준으로 작성했습니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- idle, awaitingPong, pingSentAt, token 상태는 어떤 전이로 움직이는가?
- registration timeout, heartbeat deadline, idle probe의 maintenance 우선순위는 무엇인가?
- ordinary activity와 outstanding challenge completion은 왜 다른 상태인가?
- wall-clock 대신 `steady_clock`이 필요한 failure scenario는 무엇인가?
- matching PONG과 unrelated PONG을 test가 어떻게 deterministic하게 구분하는가?

### Source와 직접 연결되는 invariant

- heartbeat deadline은 monotonic elapsed time으로 계산되어야 합니다.
- idle client는 outstanding probe가 없거나 하나의 식별 가능한 probe와 send time을 가져야 합니다.
- 현재 outstanding token과 정확히 일치하는 PONG만 wait state를 해제해야 합니다.

### Source와 직접 연결되는 engineering difficulty

- system clock correction과 protocol traffic을 liveness proof로 잘못 결합하지 않는 state-machine 설계.
- real time/socket 통합 test와 exact forged-token regression의 역할을 분리하는 문제.

## 3. 완료 기준

- 764361c52b2a의 state machine과 any-PONG/wall-clock 한계를 코드로 기록했습니다.
- test peer 자동응답이 broad smoke 안정화와 dedicated failure scenario를 모두 지원하는 구조를 설명합니다.
- 3f2b3ae1d3f9의 clock type, token generation/storage/validation/clear 순서를 복원했습니다.
- 0c76aad19579가 matching response와 forged response를 각각 검증하는 이유를 설명합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | 원문 확정 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `764361c52b2a` | `feat(heartbeat): 유휴 연결에 PING을 보내고 응답 대기` | A | RESILIENCE, LIFECYCLE, RISK | Introduces heartbeat PING, PONG waiting, and timeout state. |
| 2 | `d710f29f38a4` | `test(client): 서버 PING에 응답하는 검사 클라이언트 구현` | B | VERIFICATION, IRC_PROTOCOL | Adds automatic PONG behavior to the test peer. |
| 3 | `f313e707474f` | `test(client): 유휴 연결의 PING·PONG 흐름 검증` | B | VERIFICATION, RESILIENCE | Verifies the initial positive PING/PONG flow. |
| 4 | `3f2b3ae1d3f9` | `fix(heartbeat): 단조 시계와 토큰으로 응답 대기 상태 관리` | A | DEBUG, RESILIENCE, RISK | Moves timing to steady_clock and correlates PONG with the exact outstanding token. |
| 5 | `0c76aad19579` | `test(heartbeat): PONG 토큰과 시간 경계 검증` | A | VERIFICATION, RESILIENCE, RISK | Proves matching PONG clears the deadline and forged PONG does not. |

Commit 순서는 source에 정의된 순서이며 재정렬하지 않았습니다.

## 5. Commit별 학습 기록

각 기록은 해당 commit의 exact diff에서 확인한 파일·symbol·state와, 필요한 경우 parent/앞선 관련 SHA의 상태 차이를 기준으로 합니다. 후속 commit의 field나 test seam을 이전 commit에 소급하지 않았습니다.

### 5.1 `764361c52b2a` — `feat(heartbeat): 유휴 연결에 PING을 보내고 응답 대기`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | RESILIENCE, LIFECYCLE, RISK |
| 원문 확정 역할 | Introduces heartbeat PING, PONG waiting, and timeout state. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Introduces heartbeat PING, PONG waiting, and timeout state.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | 등록 deadline 외에는 유휴 연결의 생존 여부를 확인하거나 제거하는 정책이 없었습니다. |
| 주요 문제와 설계 판단 | 모든 received line에서 `lastActivityAt`을 갱신하고, idle client에 PING token을 queue한 뒤 `awaitingPong`과 `lastPingAt`을 기록했습니다. deadline을 넘으면 ERROR를 queue하고 close를 요청했으며 PONG handler가 wait를 해제했습니다. |
| 변경 파일·symbol | `src/ClientRegistry.hpp — awaitingPong, lastActivityAt, lastPingAt`<br>`src/IrcApplication.cpp — onLine, maintainClient, handlePong`<br>`src/RuntimeConfig.cpp — idle/ping options` |
| state / ownership 변화 | maintenance 우선순위는 registration timeout → registered 여부 → awaiting PONG timeout → idle probe입니다. |
| failure 또는 boundary | 초기 구현은 `std::time` wall clock을 사용하고 outstanding token을 저장하지 않아 어떤 PONG도 wait를 해제합니다. |
| 보장 / 비보장 | 보장: idle probe와 timeout이라는 liveness state machine의 최초 정책을 제공합니다.<br>비보장: clock correction과 forged/unrelated PONG에 안전하지 않습니다. |
| 다음 관련 변화 | d710f29f38a4/f313e707474f가 양성 흐름을 먼저 검증하고 3f2b3ae1d3f9/0c76aad19579가 invariant를 수정·고정합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `764361c52b2a` | `src/IrcApplication.cpp` | `maintainClient` | registration → ping timeout → idle PING 순서 |
| `764361c52b2a` | `src/IrcApplication.cpp` | `handlePong` | 초기 버전은 token 검사 없이 awaiting 상태 해제 |

- 조사 방법: GitHub에서 `764361c52b2a`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `d710f29f38a4` — `test(client): 서버 PING에 응답하는 검사 클라이언트 구현`. 원문 역할은 “Adds automatic PONG behavior to the test peer.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.2 `d710f29f38a4` — `test(client): 서버 PING에 응답하는 검사 클라이언트 구현`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | VERIFICATION, IRC_PROTOCOL |
| 원문 확정 역할 | Adds automatic PONG behavior to the test peer. |
| 학습 깊이 | Thread 흐름에서 맡는 구체적 구현 역할과 핵심 state/branch만 기록합니다. |

#### Source에서 확정된 역할

> Adds automatic PONG behavior to the test peer.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| Thread 내 구현 역할 | test peer에 `auto_pong` option을 추가하고 server `PING`의 parameter를 그대로 echo한 `PONG`을 자동 전송하도록 했습니다. |
| 확인한 변경 파일·symbol | `tools/irc_smoke_client.py — IrcPeer auto_pong and receive loop` |
| 핵심 state / branch | test peer가 수신 buffer를 parse하는 시점에 PING을 감지해 같은 socket으로 PONG을 보내며 scenario는 필요할 때 자동응답을 끌 수 있습니다. |
| failure handling | PING에 parameter가 없거나 malformed인 경우 임의 token을 만들지 않고 기존 assertion/timeout 경로가 실패를 드러냅니다. |
| 보장과 다음 연결 | broad test 시나리오가 heartbeat policy 때문에 우연히 종료되지 않고 production PING→PONG 경로를 통과합니다. f313e707474f가 짧은 timeout으로 양성 흐름을 전용 시나리오로 확인하고 0c76aad19579는 auto_pong을 꺼 forged case를 만듭니다. |
| 이 시점의 한계 | 자동응답은 matching PONG 양성 경로만 만들며 forged token이나 deadline correctness를 검증하지 않습니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `d710f29f38a4` | `tools/irc_smoke_client.py` | `IrcPeer auto_pong receive handling` | server PING token을 같은 parameter의 PONG으로 자동 응답 |

- 조사 방법: GitHub에서 `d710f29f38a4`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### Test / verification 학습 기록

| 구분 | 역사 복원 기록 |
| --- | --- |
| 대상 production invariant | 검사 client가 server heartbeat challenge에 protocol-compatible response를 보낼 수 있어야 합니다. |
| 재현 failure / boundary | server PING 수신과 token echo입니다. |
| test technique | real TCP peer helper의 automatic response seam입니다. |
| 통과하는 production path | socket receive buffer → PING line parse → PONG sendall → server PONG handler입니다. |
| 이 test가 증명하는 것 | test harness가 양성 heartbeat path를 자동으로 유지할 수 있음을 증명합니다. |
| 이 test가 증명하지 않는 것 | server가 exact token만 인정하거나 deadline을 올바르게 계산하는지는 증명하지 않습니다. |
| test 성격 | test-harness capability |
| 막는 회귀 | heartbeat 도입 후 unrelated smoke가 idle timeout으로 불안정해지는 회귀를 막습니다. |

실행 기록:

- 실행 SHA: `d710f29f38a4`
- repository에 정의된 실행 명령: 이 helper를 사용하는 smoke/contract scenario
- 현재 작업 환경 실행 여부: **미실행**
- 이유: 현재 런타임에서 외부 DNS가 차단되어 지정 branch의 local checkout을 만들 수 없었습니다. GitHub 연결 도구로 해당 SHA의 production/test diff와 test mechanism은 확인했지만, binary/test command의 성공 결과를 만들거나 추정하지 않았습니다.
- 실행 결과: 기록 없음

#### 다음 연결

- 다음 Thread commit: `f313e707474f` — `test(client): 유휴 연결의 PING·PONG 흐름 검증`. 원문 역할은 “Verifies the initial positive PING/PONG flow.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.3 `f313e707474f` — `test(client): 유휴 연결의 PING·PONG 흐름 검증`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | VERIFICATION, RESILIENCE |
| 원문 확정 역할 | Verifies the initial positive PING/PONG flow. |
| 학습 깊이 | Thread 흐름에서 맡는 구체적 구현 역할과 핵심 state/branch만 기록합니다. |

#### Source에서 확정된 역할

> Verifies the initial positive PING/PONG flow.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| Thread 내 구현 역할 | test scenario가 짧은 heartbeat 옵션으로 server를 실행하고 idle peer가 PING을 받은 뒤 자동 PONG하며 이후 command/PING response가 계속 진행되는지 확인했습니다. |
| 확인한 변경 파일·symbol | `tools/irc_smoke_client.py or tests scenario — idle heartbeat positive flow` |
| 핵심 state / branch | real monotonic test deadline과 socket timeout이 scenario lifetime을 제한하고 peer connection은 PONG 뒤에도 유지됩니다. |
| failure handling | expected server PING 또는 후속 response가 deadline 안에 없거나 connection이 닫히면 test가 실패합니다. |
| 보장과 다음 연결 | 초기 heartbeat의 positive integration path가 listener/event loop/parser/application/output queue를 거쳐 동작합니다. 3f2b3ae1d3f9가 실제 liveness invariant를 고치고 0c76aad19579가 matching/forged response를 분리합니다. |
| 이 시점의 한계 | 초기 implementation의 wall-clock 사용과 any-PONG acceptance는 이 양성 test로 드러나지 않습니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `f313e707474f` | `tools/irc_smoke_client.py` | `idle heartbeat scenario` | 짧은 idle timeout에서 PING→automatic PONG→connection progress |

- 조사 방법: GitHub에서 `f313e707474f`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### Test / verification 학습 기록

| 구분 | 역사 복원 기록 |
| --- | --- |
| 대상 production invariant | idle probe에 정상 PONG을 보낸 connection은 ping deadline으로 제거되지 않아야 합니다. |
| 재현 failure / boundary | 짧은 idle interval과 positive PING/PONG round trip입니다. |
| test technique | real process/socket timing integration with automatic PONG입니다. |
| 통과하는 production path | onTick idle branch → send PING → test peer auto-PONG → handlePong → later progress입니다. |
| 이 test가 증명하는 것 | 정상 heartbeat round trip과 connection 유지가 통합 환경에서 동작합니다. |
| 이 test가 증명하지 않는 것 | forged token rejection, wall-clock rollback, exact deadline ordering은 증명하지 않습니다. |
| test 성격 | positive liveness integration |
| 막는 회귀 | heartbeat feature가 정상 응답 client도 timeout시키는 기본 회귀를 막습니다. |

실행 기록:

- 실행 SHA: `f313e707474f`
- repository에 정의된 실행 명령: 해당 smoke/contract heartbeat scenario
- 현재 작업 환경 실행 여부: **미실행**
- 이유: 현재 런타임에서 외부 DNS가 차단되어 지정 branch의 local checkout을 만들 수 없었습니다. GitHub 연결 도구로 해당 SHA의 production/test diff와 test mechanism은 확인했지만, binary/test command의 성공 결과를 만들거나 추정하지 않았습니다.
- 실행 결과: 기록 없음

#### 다음 연결

- 다음 Thread commit: `3f2b3ae1d3f9` — `fix(heartbeat): 단조 시계와 토큰으로 응답 대기 상태 관리`. 원문 역할은 “Moves timing to steady_clock and correlates PONG with the exact outstanding token.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.4 `3f2b3ae1d3f9` — `fix(heartbeat): 단조 시계와 토큰으로 응답 대기 상태 관리`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | DEBUG, RESILIENCE, RISK |
| 원문 확정 역할 | Moves timing to steady_clock and correlates PONG with the exact outstanding token. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Moves timing to steady_clock and correlates PONG with the exact outstanding token.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | heartbeat와 rate/registration timing이 wall clock을 사용하고, `awaitingPong`만 있어 unrelated PONG도 outstanding challenge를 완료할 수 있었습니다. |
| 주요 문제와 설계 판단 | client timing을 `std::chrono::steady_clock` 기반 `MonotonicTime`으로 바꾸고, 증가하는 heartbeat sequence로 token을 만들었습니다. PING 전 `awaitingPong`, `pendingPongToken`, `lastPingAt`을 저장하고 PONG parameter가 exact token과 일치할 때만 wait state/token을 지웠습니다. |
| 변경 파일·symbol | `src/ClientRegistry.hpp — MonotonicTime, pendingPongToken`<br>`src/IrcApplication.hpp/.cpp — heartbeat sequence, maintainClient, handlePong` |
| state / ownership 변화 | 한 client는 outstanding probe가 없거나 정확히 하나의 token과 send time을 가지며 ordinary activity는 그 challenge를 완료하지 않습니다. |
| failure 또는 boundary | system clock correction은 elapsed deadline에 영향을 주지 않고, parameter 누락·추가·불일치 PONG은 liveness proof가 아니므로 state를 그대로 둡니다. |
| 보장 / 비보장 | 보장: deadline이 monotonic elapsed time을 사용하고 현재 challenge와 정확히 상관된 response만 connection을 보존합니다.<br>비보장: network delay/clock scheduling 자체의 upper bound와 cryptographic token unpredictability는 보장하지 않습니다. |
| 다음 관련 변화 | 0c76aad19579가 matching response와 forged response를 deterministic한 real-socket 시나리오로 고정합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `3f2b3ae1d3f9` | `src/IrcApplication.cpp` | `maintainClient heartbeat branch` | token 생성과 awaiting/token/time mutation을 send 전에 설정 |
| `3f2b3ae1d3f9` | `src/IrcApplication.cpp` | `handlePong` | 정확히 하나의 parameter가 pending token과 같을 때만 clear |
| `3f2b3ae1d3f9` | `src/ClientRegistry.hpp` | `steady_clock-based fields` | wall-clock과 분리된 elapsed deadline |

- 조사 방법: GitHub에서 `3f2b3ae1d3f9`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### Fix chain

| 단계 | 역사 복원 |
| --- | --- |
| 기존 가정 | 최근 activity나 아무 PONG이면 현재 peer가 server heartbeat에 응답했다고 간주해도 된다는 가정이었습니다. |
| 실제 failure / risk | clock rollback은 timeout을 지연시키고, forged/unrelated PONG은 실제 challenge를 보지 않은 client도 wait state를 해제했습니다. |
| root cause | deadline clock과 protocol correlation이 각각 wall-clock 및 boolean state에만 의존했습니다. |
| 수정된 invariant / decision | steady_clock elapsed time과 outstanding exact token을 함께 authoritative liveness state로 사용합니다. |
| regression evidence | 0c76aad19579가 matching PONG은 유지하고 forged PONG은 timeout ERROR/close로 끝나는 두 경로를 분리합니다. |

#### 다음 연결

- 다음 Thread commit: `0c76aad19579` — `test(heartbeat): PONG 토큰과 시간 경계 검증`. 원문 역할은 “Proves matching PONG clears the deadline and forged PONG does not.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.5 `0c76aad19579` — `test(heartbeat): PONG 토큰과 시간 경계 검증`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | VERIFICATION, RESILIENCE, RISK |
| 원문 확정 역할 | Proves matching PONG clears the deadline and forged PONG does not. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Proves matching PONG clears the deadline and forged PONG does not.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | steady-clock/exact-token fix는 있었지만 양성·위조 response가 서로 다른 production branch를 통과한다는 regression 증거가 없었습니다. |
| 주요 문제와 설계 판단 | test peer의 auto-PONG을 끈 채 server PING token을 직접 읽어 exact PONG을 보내는 생존 case와, 다른 token을 보낸 뒤 exact `ERROR :Ping timeout` 및 close를 기다리는 forged case를 추가했습니다. |
| 변경 파일·symbol | `tests/irc_contract.py or tools/irc_smoke_client.py — heartbeat token/deadline scenarios` |
| state / ownership 변화 | test가 server가 발급한 token을 capture하고 scenario별 socket/deadline을 독립 관리합니다. |
| failure 또는 boundary | forged PONG은 awaiting state를 바꾸지 않아 original `lastPingAt` 기준 deadline에서 timeout되고 connection이 닫혀야 합니다. |
| 보장 / 비보장 | 보장: matching response만 liveness deadline을 해제하며 unrelated response는 connection을 보존하지 못합니다.<br>비보장: OS wall-clock을 실제로 뒤로 움직이는 test는 아니며 steady_clock type과 code inspection이 그 부분의 근거입니다. |
| 다음 관련 변화 | 416efc91e580가 이 contract를 Linux/macOS와 sanitizer build에서 반복하도록 합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `0c76aad19579` | `tests/irc_contract.py` | `matching PONG scenario` | captured exact token response 후 connection progress |
| `0c76aad19579` | `tests/irc_contract.py` | `forged PONG scenario` | 불일치 token 뒤 exact Ping timeout ERROR와 close |

- 조사 방법: GitHub에서 `0c76aad19579`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### Test / verification 학습 기록

| 구분 | 역사 복원 기록 |
| --- | --- |
| 대상 production invariant | 현재 outstanding heartbeat token과 정확히 일치하는 PONG만 wait state를 해제해야 합니다. |
| 재현 failure / boundary | matching token과 forged/unrelated token, ping deadline입니다. |
| test technique | real process/socket + auto-PONG disabled + server token capture + exact timeout frame assertion입니다. |
| 통과하는 production path | maintainClient PING state → wire token → handlePong exact comparison → clear 또는 unchanged → timeout/close입니다. |
| 이 test가 증명하는 것 | token correlation의 positive/negative branch와 deadline outcome을 deterministic하게 구분합니다. |
| 이 test가 증명하지 않는 것 | 실제 system-clock jump나 모든 scheduler delay, token 보안성은 증명하지 않습니다. |
| test 성격 | deterministic liveness regression |
| 막는 회귀 | any-PONG acceptance와 forged response로 idle connection을 무기한 유지하는 문제를 막습니다. |

실행 기록:

- 실행 SHA: `0c76aad19579`
- repository에 정의된 실행 명령: `make test`의 heartbeat contract scenario
- 현재 작업 환경 실행 여부: **미실행**
- 이유: 현재 런타임에서 외부 DNS가 차단되어 지정 branch의 local checkout을 만들 수 없었습니다. GitHub 연결 도구로 해당 SHA의 production/test diff와 test mechanism은 확인했지만, binary/test command의 성공 결과를 만들거나 추정하지 않았습니다.
- 실행 결과: 기록 없음

#### 다음 연결

- 이 commit은 이 Thread의 마지막 항목입니다. 아래 Invariant ledger와 Thread 최종 상태에서 전체 변화를 연결합니다.

## 6. Invariant ledger

| Invariant | 처음 도입 | 강화/적용 | 학습자 최종 기록 | Fix/Test 연결 |
| --- | --- | --- | --- | --- |
| idle heartbeat policy | `764361c52b2a` | PING/awaiting/timeout state | registration timeout 뒤 idle probe와 deadline을 적용합니다. | 초기 wall-clock/any-PONG이 부족함 |
| test peer response seam | `d710f29f38a4` | f313e707474f | matching PONG 자동응답과 positive real-socket 흐름을 제공합니다. | negative token branch는 아직 없음 |
| monotonic exact challenge | `3f2b3ae1d3f9` | steady_clock + pendingPongToken | ordinary activity와 unrelated PONG은 challenge를 완료하지 않습니다. | 0c76aad19579 matching/forged regression |

도입과 완성을 같은 의미로 쓰지 않았습니다. 후속 fix가 이전 SHA의 사실을 바꾸지 않도록 각 시점의 보장과 부족함을 분리했습니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 | 실제 failure / risk | Fix 또는 기반 변화 | 수정된 decision / semantics | Test 연결 |
| --- | --- | --- | --- | --- |
| wall-clock elapsed time | clock rollback/adjustment으로 deadline 왜곡 | 3f2b3ae1d3f9 | steady_clock timestamp | 0c76aad19579은 code path, 실제 clock jump는 inspection 근거 |
| 아무 PONG이면 현재 challenge 응답 | forged/unrelated token으로 timeout 회피 | 3f2b3ae1d3f9 | exact pending token comparison | 0c76aad19579 |
| 양성 PING/PONG만 검증 | 실제 결함 branch가 드러나지 않음 | 0c76aad19579 | auto-PONG off + forged response | exact ERROR/close assertion |

## 8. Ownership / state / responsibility 변화

| 책임 또는 상태 | 이전 상태 | 이후 authoritative 위치 | 관련 commit | 확인 결과 |
| --- | --- | --- | --- | --- |
| activity/deadline timestamps | wall-clock time_t | ClientState steady_clock time points | 764361c52b2a → 3f2b3ae1d3f9 | path/symbol은 위 commit 증거표에 연결했습니다. |
| outstanding challenge identity | awaiting bool만 존재 | ClientState pendingPongToken | 3f2b3ae1d3f9 | path/symbol은 위 commit 증거표에 연결했습니다. |
| token sequence | fd/time 조합 | IrcApplication monotonic counter | 3f2b3ae1d3f9 | path/symbol은 위 commit 증거표에 연결했습니다. |
| test response policy | 항상 일반 line | IrcPeer auto_pong flag | d710f29f38a4 | path/symbol은 위 commit 증거표에 연결했습니다. |

## 9. Thread 최종 상태

- 시작 직전 상태: 등록 deadline 외에는 유휴 연결의 생존 여부를 확인하거나 제거하는 정책이 없었습니다.
- 마지막 commit `0c76aad19579` 시점의 상태: matching response만 liveness deadline을 해제하며 unrelated response는 connection을 보존하지 못합니다.
- Thread 안에서 강화된 핵심 invariant: idle heartbeat policy, test peer response seam, monotonic exact challenge.
- 남은 한계 또는 후속 Thread에서 보강되는 부분: OS wall-clock을 실제로 뒤로 움직이는 test는 아니며 steady_clock type과 code inspection이 그 부분의 근거입니다. 416efc91e580가 이 contract를 Linux/macOS와 sanitizer build에서 반복하도록 합니다.
- 최종 설명: `764361c52b2a`에서 시작한 책임은 commit map 순서대로 상태 owner, failure branch와 cleanup ordering을 추가했고 `0c76aad19579`에서 이 Thread가 정한 검증 또는 운영 상태에 도달합니다. 이전 시점의 미보장은 후속 fix/test SHA를 별도로 연결했으며 final HEAD 상태를 과거 commit에 소급하지 않았습니다.

## 10. 최종 architecture 또는 execution flow 정리

| 단계 | SHA | Caller / callee / state owner | 정상 transition | failure / cleanup transition |
| --- | --- | --- | --- | --- |
| activity receive | 764361c52b2a / 3f2b3ae1d3f9 | `IrcApplication::onLine` | lastActivityAt 갱신 | ordinary activity는 outstanding token을 clear하지 않음 |
| idle probe | 3f2b3ae1d3f9 | `maintainClient` | token 생성 → awaiting/token/time 저장 → PING send | send failure면 lifecycle 종료 후 state 재사용 안 함 |
| response | 3f2b3ae1d3f9 | `handlePong` | exact one-param token이면 awaiting/token clear | 불일치/누락은 unchanged |
| deadline | 3f2b3ae1d3f9 | `maintainClient` | steady elapsed가 ping timeout 미만이면 대기 | 초과 시 ERROR + requestClose |
| regression | 0c76aad19579 | `real socket scenario` | matching PONG은 progress | forged PONG은 exact Ping timeout ERROR/close |

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
