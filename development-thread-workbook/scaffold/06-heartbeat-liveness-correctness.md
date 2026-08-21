# Thread 06 — Heartbeat liveness correctness

부제: 하트비트 생존성 정확성

## 1. Thread 목표

초기 idle PING/PONG state machine의 실제 보장과 부족함을 분리하고, monotonic clock과 exact outstanding token correlation로 liveness invariant를 복구한 뒤 forged-response regression으로 고정합니다.

Source에서 확정된 significance:

> The initial feature supplied liveness policy but relied on wall-clock time and accepted any PONG as evidence for the outstanding heartbeat. The correction restores the actual invariant: deadline calculation must be monotonic, and only the response corresponding to the server's current challenge can preserve the connection. The regression test makes the forged-response failure deterministic.

이 문서의 source-confirmed 문장은 학습 방향을 고정하기 위한 출발점입니다. 실제 함수 동작, ownership, branch, 실행 결과는 반드시 각 SHA 코드와 test를 직접 확인해 채웁니다.

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

- 초기 764361c52b2a의 state machine과 any-PONG/wall-clock 한계를 코드로 기록했습니다.
- test peer 자동응답이 broad smoke 안정화와 dedicated failure scenario를 모두 지원하는 구조를 설명할 수 있습니다.
- 3f2b3ae1d3f9의 clock type, token generation/storage/validation/clear 순서를 복원했습니다.
- 0c76aad19579가 matching response와 forged response의 production path를 각각 검증하는 이유를 설명할 수 있습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | 원문 확정 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `764361c52b2a` | `feat(heartbeat): 유휴 연결에 PING을 보내고 응답 대기` | A | RESILIENCE, LIFECYCLE, RISK | Introduces heartbeat PING, PONG waiting, and timeout state. |
| 2 | `d710f29f38a4` | `test(client): 서버 PING에 응답하는 검사 클라이언트 구현` | B | VERIFICATION, IRC_PROTOCOL | Adds automatic PONG behavior to the test peer. |
| 3 | `f313e707474f` | `test(client): 유휴 연결의 PING·PONG 흐름 검증` | B | VERIFICATION, RESILIENCE | Verifies the initial positive PING/PONG flow. |
| 4 | `3f2b3ae1d3f9` | `fix(heartbeat): 단조 시계와 토큰으로 응답 대기 상태 관리` | A | DEBUG, RESILIENCE, RISK | Moves timing to steady_clock and correlates PONG with the exact outstanding token. |
| 5 | `0c76aad19579` | `test(heartbeat): PONG 토큰과 시간 경계 검증` | A | VERIFICATION, RESILIENCE, RISK | Proves matching PONG clears the deadline and forged PONG does not. |

Commit 순서는 source에 정의된 순서입니다. 이 문서 안에서 재정렬하지 않습니다.

## 5. Commit별 학습 기록

각 commit에서 final HEAD를 보지 말고 해당 SHA의 tree와 필요한 parent/직전 관련 SHA만 확인합니다. 아래의 implementation anchor는 source에서 확정된 내용이며, code evidence 칸은 학습자가 직접 채웁니다.

### 5.1 `764361c52b2a` — `feat(heartbeat): 유휴 연결에 PING을 보내고 응답 대기`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | RESILIENCE, LIFECYCLE, RISK |
| 원문 확정 역할 | Introduces heartbeat PING, PONG waiting, and timeout state. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 thread에서는 초기 liveness state machine의 정확한 보장과 later fix가 드러낸 부족함을 집중 추적합니다.

#### Source에서 확정된 implementation anchor

- 모든 received line은 `lastActivityAt`을 갱신하고 idle interval이 지나면 server PING token을 queue합니다.
- client state는 awaiting response 여부와 PING send time을 보유하며 active wait 중 deadline을 넘기면 IRC ERROR와 close request를 발생시킵니다.
- PONG은 pre-registration phase에서도 허용되고 registration timeout이 maintenance의 첫 검사입니다.
- 이 버전은 어떤 PONG도 outstanding heartbeat를 해제하며 exact token correlation은 아직 보장하지 않습니다.

Source가 이름을 명시한 확인 대상:

- `lastActivityAt`, `ClientState`

#### 해당 SHA에서 확인할 코드

- ClientState에 추가된 activity, awaitingPong, ping-sent timestamp, token 관련 필드를 확인합니다.
- line receive 시 activity update와 command dispatch의 순서를 확인합니다.
- `onTick()`에서 registration timeout, awaiting deadline, idle probe 순서와 각 상태 mutation을 상태도로 그립니다.
- PING frame을 queue하기 전후 awaiting state와 send time이 언제 설정되는지 해당 SHA의 순서를 기록합니다.
- PONG handler가 parameter/token을 실제로 검사하는지 확인하고 이 초기 버전의 미보장 범위를 명시합니다.
- idle/ping timeout option이 RuntimeConfig와 application state로 전달되는 경로를 추적합니다.

비교 기준:

- 기본 비교: `764361c52b2a^` → `764361c52b2a`

Source가 지목한 failure/risk 출발점:

> wall-clock 이동 또는 unrelated PONG 수용은 실제 liveness challenge와 상태 해제를 일치시키지 못합니다. 이 위험은 후속 fix에서 복구됩니다.

#### Commit 학습 기록

| 학습 항목 | 학습자 기록 |
| --- | --- |
| 직전 경계/상태 | [이 commit 전 subsystem이 제공하던 것] |
| 주요 문제와 설계 판단 | [왜 이 layer에서 처리했는지] |
| 핵심 코드 증거 | [path, symbol, caller/callee] |
| state / ownership 변화 | [mutation·lifetime 순서] |
| failure 또는 boundary | [해당 branch와 outcome] |
| 보장 / 비보장 | [각각 코드에 근거해 분리] |
| 다음 관련 commit | [무엇을 구현·검증·수정하는지] |
| 학습자의 설명 | [subsystem 관점으로 정리] |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| 764361c52b2a | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 764361c52b2a^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `d710f29f38a4` — `test(client): 서버 PING에 응답하는 검사 클라이언트 구현`. 원문 역할은 “Adds automatic PONG behavior to the test peer.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.2 `d710f29f38a4` — `test(client): 서버 PING에 응답하는 검사 클라이언트 구현`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | VERIFICATION, IRC_PROTOCOL |
| 원문 확정 역할 | Adds automatic PONG behavior to the test peer. |
| 학습 깊이 | thread 흐름에서 맡는 구현 역할과 필요한 코드·상태 변화를 확인합니다. S/A와 같은 분량을 강제하지 않습니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Heartbeat liveness correctness` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- integration peer는 완전한 inbound line을 기록한 뒤 server-prefixed/unprefixed PING을 인식하고 optional leading colon을 제거해 PONG을 자동 전송합니다.
- auto-response는 기본 활성화지만 peer별로 끌 수 있어 unresponsive scenario를 만들 수 있습니다.
- PING을 reply 전에 transcript에 남겨 server probe 발생 자체도 assertion할 수 있습니다.

#### 해당 SHA에서 확인할 코드

- peer receive/framing loop에서 line record와 PING detection, PONG send의 순서를 확인합니다.
- server prefix 유무와 token leading colon을 어떤 parser로 처리하는지 확인합니다.
- auto-response configuration이 instance별인지 global인지, disabled peer가 다른 test에 영향을 주지 않는지 확인합니다.
- test helper가 production heartbeat logic을 재구현하지 않고 wire behavior만 수행하는지 경계를 기록합니다.

비교 기준:

- 기본 비교: `d710f29f38a4^` → `d710f29f38a4`
- Thread 직전 관련 SHA: `764361c52b2a` — `feat(heartbeat): 유휴 연결에 PING을 보내고 응답 대기`

Source가 지목한 failure/risk 출발점:

> 모든 test peer가 수동 PONG을 요구하면 unrelated long-running assertion이 heartbeat timeout으로 실패해 feature test와 harness failure가 섞입니다.

#### Test / verification 학습 기록

| 구분 | Source에서 확정된 출발점 | 학습자 코드·실행 기록 |
| --- | --- | --- |
| 대상 production invariant | heartbeat가 활성화된 통합 test에서 peer가 server PING에 protocol-correct PONG으로 응답할 수 있는 harness contract | [관련 production path와 symbol을 추가] |
| 재현 failure / boundary | server prefix 유무, optional token colon, auto-response on/off | [입력, state, injected result를 정확히 기록] |
| test technique | test peer receive loop에 configurable wire-level auto PONG 추가 | [test double/real socket/process의 구성 증거] |
| 통과하는 production code path | server PING output → peer framing/record → PONG input → application PONG handler | [caller → callee → branch를 해당 SHA에서 연결] |
| 이 test가 증명하는 것 | test peer가 probe를 관찰 가능하게 기록하고 정상 응답을 보낼 수 있음 | [실행 결과와 assertion 근거] |
| 이 test가 증명하지 않는 것 | server timeout/token correctness 자체 또는 unresponsive/forged response behavior | [과장하지 않을 범위] |
| test 성격 | test-harness capability commit | [broad/deterministic 판단 근거] |
| 막는 회귀 | unrelated long-running smoke가 heartbeat 때문에 실패하거나 probe가 transcript에서 사라지는 문제 | [후속 변경에서 깨질 수 있는 invariant] |

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
| d710f29f38a4 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| d710f29f38a4^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `f313e707474f` — `test(client): 유휴 연결의 PING·PONG 흐름 검증`. 원문 역할은 “Verifies the initial positive PING/PONG flow.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.3 `f313e707474f` — `test(client): 유휴 연결의 PING·PONG 흐름 검증`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | VERIFICATION, RESILIENCE |
| 원문 확정 역할 | Verifies the initial positive PING/PONG flow. |
| 학습 깊이 | thread 흐름에서 맡는 구현 역할과 필요한 코드·상태 변화를 확인합니다. S/A와 같은 분량을 강제하지 않습니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Heartbeat liveness correctness` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- smoke server를 짧은 registration/idle/ping deadline으로 실행해 heartbeat를 실제 elapsed time 안에서 관찰합니다.
- registered peer를 idle 상태로 두어 server PING을 받고 auto PONG으로 연결을 유지합니다.
- 그 뒤 client-originated PING도 PONG을 받아 bidirectional liveness command가 계속 작동함을 확인합니다.

Source가 이름을 명시한 확인 대상:

- `pollOnce()`, `onTick()`

#### 해당 SHA에서 확인할 코드

- server option 값과 test wait deadline이 어떻게 설정되어 scenario를 bounded하게 만드는지 확인합니다.
- peer가 registered된 뒤 어떤 traffic도 보내지 않는 구간과 PING transcript assertion을 찾습니다.
- auto PONG 뒤 원래 ping timeout보다 오래 connection이 사용 가능한지 어떤 후속 command로 확인하는지 기록합니다.
- real time/socket test라 clock control이 없다는 한계와 positive-path만 검증한다는 범위를 명시합니다.

비교 기준:

- 기본 비교: `f313e707474f^` → `f313e707474f`
- Thread 직전 관련 SHA: `d710f29f38a4` — `test(client): 서버 PING에 응답하는 검사 클라이언트 구현`

Source가 지목한 failure/risk 출발점:

> heartbeat state가 onTick/event loop/output queue/PONG dispatch와 통합되지 않으면 단위 상태가 맞아도 live process에서는 probe가 나가지 않거나 timeout이 잘못됩니다.

#### Test / verification 학습 기록

| 구분 | Source에서 확정된 출발점 | 학습자 코드·실행 기록 |
| --- | --- | --- |
| 대상 production invariant | event loop tick, activity timestamp, PING queue, PONG handling이 live process에서 positive flow로 결합되는 invariant | [관련 production path와 symbol을 추가] |
| 재현 failure / boundary | registered idle peer가 probe를 받고 응답한 뒤 계속 command를 수행함 | [입력, state, injected result를 정확히 기록] |
| test technique | 짧은 real-time deadlines + real socket + auto-PONG peer | [test double/real socket/process의 구성 증거] |
| 통과하는 production code path | pollOnce → onTick → PING queue/write → peer PONG → parser/dispatch → state clear → later client PING/PONG | [caller → callee → branch를 해당 SHA에서 연결] |
| 이 test가 증명하는 것 | 초기 heartbeat feature의 정상 통합 흐름과 bidirectional liveness command | [실행 결과와 assertion 근거] |
| 이 test가 증명하지 않는 것 | wall-clock jump, forged/stale token, exact deadline 경계의 deterministic control | [과장하지 않을 범위] |
| test 성격 | broad positive-path integration test | [broad/deterministic 판단 근거] |
| 막는 회귀 | heartbeat option은 parse되지만 onTick/output/PONG dispatch가 실제로 연결되지 않는 회귀 | [후속 변경에서 깨질 수 있는 invariant] |

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
| f313e707474f | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| f313e707474f^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `3f2b3ae1d3f9` — `fix(heartbeat): 단조 시계와 토큰으로 응답 대기 상태 관리`. 원문 역할은 “Moves timing to steady_clock and correlates PONG with the exact outstanding token.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.4 `3f2b3ae1d3f9` — `fix(heartbeat): 단조 시계와 토큰으로 응답 대기 상태 관리`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | DEBUG, RESILIENCE, RISK |
| 원문 확정 역할 | Moves timing to steady_clock and correlates PONG with the exact outstanding token. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Heartbeat liveness correctness` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- connection age, last activity, heartbeat deadline, command window를 모두 `std::chrono::steady_clock` time point로 전환합니다.
- 각 PING은 process-local 증가 token을 받고 exact token이 `ClientState`에 저장됩니다.
- PONG은 parameter가 정확히 하나이고 pending token과 일치할 때만 `awaitingPong`을 해제하며 token/timestamp를 함께 clear합니다.

Source가 이름을 명시한 확인 대상:

- `std::time_t`, `std::chrono::steady_clock`, `std::chrono::seconds`, `ClientState`, `awaitingPong`

#### 해당 SHA에서 확인할 코드

- wall-clock `std::time_t` field와 call site가 steady-clock type으로 바뀐 diff를 parent와 비교합니다.
- duration comparison이 explicit `std::chrono::seconds`로 수행되고 서로 다른 clock type이 섞이지 않는지 확인합니다.
- token sequence 생성, frame serialization, state 저장의 순서를 추적합니다.
- PONG handler에서 awaiting state, parameter count, exact string match를 검사한 뒤 세 field를 함께 clear하는지 확인합니다.
- unsolicited, malformed, stale, forged PONG 각각이 ordinary activity는 갱신하되 outstanding heartbeat는 유지하는지 code path로 설명합니다.
- 같은 line timestamp가 activity와 rate limiter에 재사용되는지 확인합니다.

비교 기준:

- 기본 비교: `3f2b3ae1d3f9^` → `3f2b3ae1d3f9`
- Thread 직전 관련 SHA: `f313e707474f` — `test(client): 유휴 연결의 PING·PONG 흐름 검증`
- 초기 feature `764361c52b2a`의 가정을 root cause 기준으로 비교합니다.

Source가 지목한 failure/risk 출발점:

> wall-clock correction은 elapsed deadline을 왜곡하고, 아무 PONG이나 허용하면 forged/unrelated traffic이 liveness challenge를 통과합니다.

#### Failure → root cause → fix → test 기록

| Fix 추적 항목 | 기록 |
| --- | --- |
| 기존 가정 | wall-clock elapsed 비교와 임의 PONG acknowledgement가 heartbeat liveness에 충분하다는 가정 |
| 실제 failure 또는 위험 | wall-clock correction은 elapsed deadline을 왜곡하고, 아무 PONG이나 허용하면 forged/unrelated traffic이 liveness challenge를 통과합니다. |
| root cause | wall-clock은 역행/점프할 수 있고 PONG presence는 current challenge 응답을 증명하지 않음 |
| 수정된 invariant / decision | monotonic time와 정확히 하나의 outstanding token이 함께 heartbeat state를 정의함 |
| 실제 수정 코드 | [parent/current diff의 path, symbol, branch, mutation 순서] |
| cleanup / failure propagation | [실패가 어느 owner와 callback을 거쳐 수렴하는지] |
| regression test 연결 | `0c76aad19579`의 matching/forged token regression |
| fix가 보장하는 것 | [코드와 test가 직접 입증하는 범위] |
| fix가 보장하지 않는 것 | [transactionality, fairness, 다른 layer 등 미보장 범위] |
| 학습자의 root-cause 설명 | [증상 → 원인 → 수정 → 검증을 직접 작성] |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| 3f2b3ae1d3f9 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 3f2b3ae1d3f9^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `0c76aad19579` — `test(heartbeat): PONG 토큰과 시간 경계 검증`. 원문 역할은 “Proves matching PONG clears the deadline and forged PONG does not.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.5 `0c76aad19579` — `test(heartbeat): PONG 토큰과 시간 경계 검증`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | VERIFICATION, RESILIENCE, RISK |
| 원문 확정 역할 | Proves matching PONG clears the deadline and forged PONG does not. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Heartbeat liveness correctness` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- dedicated peers는 auto PONG을 끄고 test가 exact challenge token과 response timing을 직접 제어합니다.
- matching token peer는 여러 1초 interval 뒤에도 METRICS를 사용하며 connection 유지가 검증됩니다.
- unrelated token peer는 ordinary activity를 갱신했어도 `ERROR :Ping timeout`과 close를 받아야 합니다.

Source가 이름을 명시한 확인 대상:

- `ERROR :Ping timeout`

#### 해당 SHA에서 확인할 코드

- server PING frame에서 token을 capture하는 regex/parser와 exact PONG 전송을 확인합니다.
- valid peer가 original deadline 이후에도 살아 있음을 어떤 반복 wait와 command로 입증하는지 기록합니다.
- forged peer가 unrelated token을 보내고도 pending challenge가 남는 production path를 추적합니다.
- timeout ERROR exact frame와 connection close를 어떤 assertion 순서로 기다리는지 확인합니다.
- test가 generic traffic/activity와 correlated heartbeat completion을 분리한다는 근거를 명시합니다.

비교 기준:

- 기본 비교: `0c76aad19579^` → `0c76aad19579`
- Thread 직전 관련 SHA: `3f2b3ae1d3f9` — `fix(heartbeat): 단조 시계와 토큰으로 응답 대기 상태 관리`

Source가 지목한 failure/risk 출발점:

> positive PONG test만으로는 unrelated token이나 activity가 잘못 wait state를 해제하는 회귀를 잡을 수 없습니다.

#### Test / verification 학습 기록

| 구분 | Source에서 확정된 출발점 | 학습자 코드·실행 기록 |
| --- | --- | --- |
| 대상 production invariant | monotonic deadline과 exact outstanding token만 heartbeat wait를 해제한다는 invariant | [관련 production path와 symbol을 추가] |
| 재현 failure / boundary | matching PONG은 connection을 살리고 unrelated token은 activity를 갱신해도 timeout/close로 이어짐 | [입력, state, injected result를 정확히 기록] |
| test technique | auto PONG disabled peer + captured exact token + controlled valid/forged responses + bounded real-time waits | [test double/real socket/process의 구성 증거] |
| 통과하는 production code path | server token generation/storage → PING wire → PONG parse/validation → state clear 또는 retained deadline → timeout cleanup | [caller → callee → branch를 해당 SHA에서 연결] |
| 이 test가 증명하는 것 | correlated response와 generic activity/PONG presence가 분리됨 | [실행 결과와 assertion 근거] |
| 이 test가 증명하지 않는 것 | arbitrary clock implementation defects 전체, process restart token uniqueness, formal timing precision | [과장하지 않을 범위] |
| test 성격 | deterministic protocol-state regression over real sockets | [broad/deterministic 판단 근거] |
| 막는 회귀 | any PONG 또는 unrelated traffic이 outstanding heartbeat를 잘못 해제하는 문제 | [후속 변경에서 깨질 수 있는 invariant] |

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
| 0c76aad19579 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 0c76aad19579^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 이 commit은 이 Thread의 마지막 항목입니다. Invariant ledger와 Thread 최종 상태에서 전체 변화를 연결합니다.

## 6. Invariant ledger

| Invariant | 처음 도입 | 강화/적용 | 부족함 또는 위험이 드러난 지점 | Fix/Test 연결 | 학습자 최종 기록 |
| --- | --- | --- | --- | --- | --- |
| idle heartbeat state | 764361c52b2a | d710f29f38a4, f313e707474f | wall-clock + any-PONG 부족함 | 3f2b3ae1d3f9에서 복구 | [학습자 최종 상태 설명] |
| monotonic deadline | 3f2b3ae1d3f9 | all client timing fields와 rate window까지 통일 | clock type 혼용 여부 기록 | 0c76aad19579 valid/timeout timing | [학습자 최종 상태 설명] |
| exact challenge correlation | 3f2b3ae1d3f9 | token generate/store/validate/clear | unsolicited/stale/forged PONG 무시 | 0c76aad19579 forged token scenario | [학습자 최종 상태 설명] |

Ledger 작성 기준:

- “도입”과 “완성”을 같은 의미로 쓰지 않습니다.
- 후속 fix가 이전 commit의 사실을 소급 변경하지 않도록 각 SHA 시점의 보장과 부족함을 분리합니다.
- source가 명시하지 않은 invariant를 추가할 때는 확정 사실이 아니라 학습자의 코드 해석으로 표시하고 path/symbol 증거를 붙입니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 | 실제 failure/risk | Fix 또는 기반 변화 | 수정된 decision/semantics | Test 연결 | 코드 증거 |
| --- | --- | --- | --- | --- | --- |
| wall-clock과 any PONG이면 충분 | clock jump와 forged/unrelated PONG이 wait를 잘못 해제 | 3f2b3ae1d3f9이 steady clock + exact token으로 수정 | ordinary activity와 challenge completion을 분리 | 0c76aad19579가 matching/forged 양쪽을 검증 | [실제 code/test evidence] |
| heartbeat 통합만 확인하면 충분 | positive path만으로 correlation defect를 놓침 | d710f29f38a4 / f313e707474f는 broad positive evidence | dedicated peer auto-response를 끄고 exact token을 제어 | 0c76aad19579 deterministic regression | [실제 code/test evidence] |

## 8. Ownership / state / responsibility 변화

| 책임 또는 상태 | 이전 상태 | 이후 authoritative 위치 | 관련 commit | 학습자 확인 |
| --- | --- | --- | --- | --- |
| liveness state | 없음 | `ClientState` | 764361c52b2a | [확인한 owner/state/lifetime] |
| periodic transition | event backend timer 없음 | `IrcApplication::onTick()` | 764361c52b2a | [확인한 owner/state/lifetime] |
| test-peer liveness behavior | 수동 응답 | configurable auto PONG | d710f29f38a4 | [확인한 owner/state/lifetime] |
| elapsed time authority | wall clock | `steady_clock` | 3f2b3ae1d3f9 | [확인한 owner/state/lifetime] |
| challenge completion | any PONG | exact pending token | 3f2b3ae1d3f9 | [확인한 owner/state/lifetime] |

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
[line received] → lastActivityAt 갱신 → [PONG이면 exact token 검사]
`onTick()` → registration timeout → awaitingPong deadline → idle threshold
→ token 생성/저장 + PING queue → awaiting state
→ matching PONG: token/timestamp/flag clear
→ forged/unrelated PONG: activity만 갱신, outstanding state 유지 → timeout ERROR + close
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
