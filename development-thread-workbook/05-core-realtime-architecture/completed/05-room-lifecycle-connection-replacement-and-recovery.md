# 경기방 수명주기·연결 교체·복구

원문 Development Thread: `Room lifecycle, connection replacement, and recovery`

## 1. Thread 목표

- readiness, play, pause, disconnect, reconnect, expiry, finish를 explicit room-session state machine으로 복원합니다.
- 동일 사용자 새 socket이 기존 transport를 교체하면서 room side와 authority를 보존하는 atomic handoff를 추적합니다.
- 실제 disconnect와 same-user replacement를 구분하고 15초 reservation, forfeit/abandonment, browser fresh-ticket retry가 협력하는 방식을 확인합니다.

### Source에서 확정된 significance

> Socket loss and socket replacement are treated as lifecycle events, not immediate match termination or fresh matchmaking. The state machine, user-indexed connection map, reserved side, deadline, and browser retry policy cooperate to preserve one room and one player authority across transient transport failure.

### 직접 연결되는 Critical Invariants

> One user has one authoritative realtime connection, and reconnect replacement transfers ownership without creating a second match or losing the reserved room side.

> Timers, schedulers, heartbeat handles, retry work, snapshot buffers, and database resources have explicit single-owner cleanup.

### 직접 연결되는 Major Engineering Difficulties

> Coordinating readiness, pause, disconnect, reconnect, replacement, forfeit, retry, and final cleanup across interacting state machines.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 어떤 transition이 합법이며 idempotent이고, 어떤 transition이 무시되거나 terminal 결과를 만듭니까?
- snapshot phase는 state machine을 정의합니까, 아니면 accepted state를 반영합니까?
- same-user replacement에서 이전 heartbeat/buffer/membership/room side는 어떤 순서로 이전·정리됩니까?
- 실제 socket loss에서 disconnected-side reservation과 reconnect deadline의 소유자는 누구입니까?
- 한쪽/양쪽 disconnect expiry가 persisted forfeit와 non-persisted abandonment로 갈리는 조건은 무엇입니까?
- 브라우저 reconnect는 새 ticket을 쓰면서 왜 원래 queue/AI intent를 재전송하지 않습니까?

## 3. 완료 기준

- RoomSession의 상태와 transition 표를 실제 메서드 조건으로 완성할 수 있습니다.
- replacement, recoverable disconnect, expired disconnect 세 경로의 client/room/timer/scheduler 변화를 비교할 수 있습니다.
- displaced socket의 stale message가 새 room을 만들거나 현재 room을 조작하지 못하는 근거를 제시할 수 있습니다.
- 15초 경계의 reconnect와 expiry 결과를 deterministic test로 설명할 수 있습니다.
- browser reducer와 socket client가 recovery 동안 matchmaking을 막는 이유를 설명할 수 있습니다.

> 검토 방식: 지정 브랜치에 속한 exact SHA의 diff와 해당 시점 파일을 GitHub에서 확인했습니다. 로컬 실행 환경은 GitHub clone이 차단되어 테스트 명령은 실행하지 않았으며, 아래 테스트 결과 설명은 test implementation 검토에 한정합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `aa5d6a338690` | `refactor(game): 게임 방 상태 전이 모델링` | S | REALTIME, ARCH, RISK | Defines legal readiness, pause, reconnect, expiry, and finish transitions. |
| 2 | `8f64dfc117f3` | `feat(game): 게임 방 상태를 RoomSession에 연결` | A | SIMULATION, REALTIME | Makes GameHub lifecycle changes subordinate to the state machine. |
| 3 | `a06d1705bbc9` | `feat(game): 사용자별 active connection 교체` | S | REALTIME, ARCH, RISK | Enforces one current transport and transfers room ownership atomically. |
| 4 | `c98d4b1e8b43` | `feat(game): 예약된 room connection 복구` | A | SIMULATION, REALTIME | Reattaches a returning identity only to an explicit reserved side. |
| 5 | `e593b1dd9fcd` | `feat(game): reconnect 예약 만료와 room 정리` | A | SIMULATION, REALTIME, RISK | Turns disconnect into a bounded reservation, forfeit, or non-persisted abandonment. |
| 6 | `113e39acc85c` | `test(game): reconnect 복구 동작 검증` | A | REALTIME, PERSISTENCE, RISK | Verifies replacement, deadline recovery, one finalization, and stale-socket rejection. |
| 7 | `4f5199097284` | `fix(web): 중단된 game reconnect 복구` | A | AUTH, REALTIME, WEB | Makes the browser request fresh tickets without replaying matchmaking intent. |

## 5. Commit별 학습 기록

### 5.1. `refactor(game): 게임 방 상태 전이 모델링`

| 항목 | 값 |
| --- | --- |
| SHA | `aa5d6a338690` |
| Importance | S |
| Tags | REALTIME, ARCH, RISK |
| 학습 깊이 | Architecture/invariant 중심으로 직전 상태, 결정, 핵심 전이, ownership, failure, 후속 검증까지 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Defines legal readiness, pause, reconnect, expiry, and finish transitions.
- Classification summary: Introduce an explicit room-session state machine for readiness, play, pause, reconnection, and completion.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | ready/pause/disconnect/finish가 socket callbacks와 snapshot phase 조건에 흩어져 있어 합법 transition과 idempotency를 한 곳에서 판단할 수 없었습니다. |
| 핵심 boundary/decision | 새 `apps/api/src/game/roomSession.ts`의 `RoomSession`이 `waiting|playing|paused|reconnecting|finished`, ready/disconnected sides, resume state, 15초 deadline을 소유합니다. |
| 상태 또는 ownership 변화 | RoomSession이 lifecycle decision을 소유하고 snapshot은 accepted state를 반영하는 projection이 됩니다. socket·scheduler·DB는 이 class가 소유하지 않습니다. |
| 주요 failure/edge path | 두 side ready 전에는 playing이 되지 않고, pause/resume은 대응 state에서만 유효합니다. disconnect는 prior state를 기억하고, 한쪽 expiry는 opposite winner, 양쪽 expiry는 winner 없음, `finish`는 reconnect data를 제거해 반복 expiry를 막습니다. |
| 보장/비보장 | legal transition과 15초 recoverability/terminal outcome을 transport에서 분리합니다. GameHub가 이 state machine을 실제 자원 조작에 사용한다는 보장은 다음 commit입니다. |
| 다음 관련 commit 연결 | `8f64df...`가 GameHub room에 RoomSession을 연결하고 scheduler/snapshot mutation을 accepted transition에 종속시킵니다. |

#### Architecture / invariant 복원

| 축 | 복원 결과 |
| --- | --- |
| 문제 | snapshot phase와 socket callback만으로 lifecycle을 추론하면 replacement, reconnect, forfeit가 중복·역행할 수 있습니다. |
| 실패 위험 | ready 전 play, finished room resume, 같은 disconnect 두 번, timeout 후 reconnect, 양쪽 disconnect를 잘못된 winner로 확정할 수 있습니다. |
| 핵심 결정 | lifecycle 상태와 legal transition을 `RoomSession` 한 객체로 모델링합니다. |
| 구현 경로 | markReady → playing; pause/resume; disconnect(side, now) → reconnecting/deadline; reconnect(side, now) → restore; expireReconnect → winner/null; finish → terminal cleanup. |
| 수명주기·상태 | ready/disconnected sets, resume state, deadline은 RoomSession lifetime에 귀속되고 finish에서 제거됩니다. |
| 실패 처리 | 잘못된 current state 또는 deadline 밖의 operation은 state를 변경하지 않으며 expiry 결과는 terminal로 한 번만 전환됩니다. |
| 후속 검증 | `113e39...` fake-timer replacement/14,999ms/15,000ms/finalize-once tests. |
| Thread 전체 의미 | transport loss를 곧바로 match loss로 처리하지 않고 domain lifecycle event로 해석할 기반이 됩니다. |

비교 기준:
- 이 commit의 parent에서 동일 책임을 담당하던 코드를 비교했습니다.
- 다음 Thread 관련 SHA: `8f64dfc117f3` — `feat(game): 게임 방 상태를 RoomSession에 연결`

### 5.2. `feat(game): 게임 방 상태를 RoomSession에 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `8f64dfc117f3` |
| Importance | A |
| Tags | SIMULATION, REALTIME |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Makes GameHub lifecycle changes subordinate to the state machine.
- Classification summary: Integrate RoomSession decisions with room snapshots and scheduler start/stop.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | RoomSession은 독립 model이지만 GameHub가 snapshot phase와 timer를 직접 바꾸면 두 상태가 어긋날 수 있었습니다. |
| 핵심 boundary/decision | Room이 `session`, reconnect metadata를 보유하고 human/AI ready를 `markReady`에 전달합니다. accepted state만 snapshot phase에 복사하고 playing일 때 scheduler를 시작하며 pause/reconnecting에서 멈춥니다. |
| 상태 또는 ownership 변화 | RoomSession은 legal state, GameHub는 실제 scheduler/socket/snapshot resource를 소유합니다. GameHub는 반환 state를 projection합니다. |
| 주요 failure/edge path | invalid transition이면 resource side effect를 적용하지 않습니다. AI room은 right side를 ready로 표시해 left ready 후에만 시작합니다. |
| 보장/비보장 | domain lifecycle과 runtime scheduler/snapshot이 같은 accepted transition을 따릅니다. 동일 사용자 connection replacement와 reserved reconnect는 아직 없습니다. |
| 다음 관련 commit 연결 | `a06d17...`가 user-indexed active connection map과 atomic replacement를 구현합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `aa5d6a338690` — `refactor(game): 게임 방 상태 전이 모델링`
- 다음 Thread 관련 SHA: `a06d1705bbc9` — `feat(game): 사용자별 active connection 교체`

### 5.3. `feat(game): 사용자별 active connection 교체`

| 항목 | 값 |
| --- | --- |
| SHA | `a06d1705bbc9` |
| Importance | S |
| Tags | REALTIME, ARCH, RISK |
| 학습 깊이 | Architecture/invariant 중심으로 직전 상태, 결정, 핵심 전이, ownership, failure, 후속 검증까지 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Enforces one current transport and transfers room ownership atomically.
- Classification summary: Add user-indexed connection authority and replace an existing socket without treating it as a match disconnect.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | connection map이 socket 중심이면 같은 user가 새 ticket으로 연결할 때 old/new socket이 동시에 room/queue를 조작하거나 old close가 forfeit를 유발할 수 있었습니다. |
| 핵심 boundary/decision | `clientsByUser`가 current client를 가리키고 replacement 시 이전 heartbeat와 snapshot buffer를 중지한 뒤 map에서 old client를 제거합니다. room side/roomId를 new client로 이전하고 current context/snapshot을 전송한 후 old socket을 4001로 닫습니다. |
| 상태 또는 ownership 변화 | user authority는 `clientsByUser`의 한 client에만 있습니다. replacement는 match membership을 유지하면서 transport resource owner만 원자적으로 바꿉니다. |
| 주요 failure/edge path | `receive`는 `clientsByUser.get(userId) !== client`인 stale client를 무시합니다. old close callback은 이미 map에서 제거돼 실제 disconnect/forfeit path로 들어가지 않습니다. |
| 보장/비보장 | 한 user가 동시에 authoritative realtime client 둘을 갖지 않고 same-user reconnect가 새 matchmaking을 만들지 않습니다. 연결이 완전히 끊긴 뒤 side reservation은 다음 commits 범위입니다. |
| 다음 관련 commit 연결 | `c98d4b...`가 current client가 없는 returning identity를 disconnected reservation과 연결합니다. |

#### Architecture / invariant 복원

| 축 | 복원 결과 |
| --- | --- |
| 문제 | socket identity와 user identity가 동일하지 않아 reconnect가 duplicate authority 또는 accidental forfeit로 이어집니다. |
| 실패 위험 | old socket stale input, two rooms/queue entries, old close가 new connection의 match를 종료. |
| 핵심 결정 | user-indexed current-client map을 authority source로 두고 replacement 순서를 고정합니다. |
| 구현 경로 | new connect → old transport stop/remove → map authority 교체 → room side/client pointer 이전 → context/snapshot send → old close 4001. |
| 수명주기·상태 | heartbeat·snapshot buffer는 transport별, room side는 user/domain별이며 replacement에서 transport resource만 교체됩니다. |
| 실패 처리 | stale receive no-op, old close는 non-current라 disconnect mutation 없음. |
| 후속 검증 | `113e39...` replacement가 timeout/forfeit를 만들지 않고 stale socket이 무시되는 test. |
| Thread 전체 의미 | ‘한 사용자 한 권위 연결’이 명시적인 lookup invariant가 되어 reconnect 설계의 기준이 됩니다. |

비교 기준:
- 직전 Thread 관련 SHA: `8f64dfc117f3` — `feat(game): 게임 방 상태를 RoomSession에 연결`
- 다음 Thread 관련 SHA: `c98d4b1e8b43` — `feat(game): 예약된 room connection 복구`

### 5.4. `feat(game): 예약된 room connection 복구`

| 항목 | 값 |
| --- | --- |
| SHA | `c98d4b1e8b43` |
| Importance | A |
| Tags | SIMULATION, REALTIME |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Reattaches a returning identity only to an explicit reserved side.
- Classification summary: Recover a disconnected player into the existing room reservation instead of matchmaking again.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | active replacement은 처리하지만 실제 socket loss 후 `clientsByUser`에 old client가 없으면 returning user와 기존 room side를 연결할 정보가 없었습니다. |
| 핵심 boundary/decision | GameHub가 rooms의 `disconnectedUsers`를 찾아 user ID와 reserved side를 확인하고 `session.reconnect(side, now)`가 허용할 때 new client를 그 side에 배치합니다. |
| 상태 또는 ownership 변화 | room이 disconnected user/side reservation을 소유하고 RoomSession이 deadline과 restore state를 판정합니다. new client는 transport ownership만 획득합니다. |
| 주요 failure/edge path | 명시적 reservation이 없거나 deadline/state가 허용하지 않으면 임의 room에 붙이지 않습니다. 다른 side가 아직 disconnected면 reconnecting 유지와 해당 client snapshot만 전송하고, 모두 돌아오면 timer clear·state projection·scheduler resume·broadcast를 수행합니다. |
| 보장/비보장 | returning identity가 같은 room/side에만 복구됩니다. reservation expiry와 terminal cleanup은 `e593b1...`에서 완성됩니다. |
| 다음 관련 commit 연결 | `e593b1...`가 disconnect 시 15초 reservation timer와 expiry forfeit/abandonment를 구현합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `a06d1705bbc9` — `feat(game): 사용자별 active connection 교체`
- 다음 Thread 관련 SHA: `e593b1dd9fcd` — `feat(game): reconnect 예약 만료와 room 정리`

### 5.5. `feat(game): reconnect 예약 만료와 room 정리`

| 항목 | 값 |
| --- | --- |
| SHA | `e593b1dd9fcd` |
| Importance | A |
| Tags | SIMULATION, REALTIME, RISK |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Turns disconnect into a bounded reservation, forfeit, or non-persisted abandonment.
- Classification summary: Own reconnect deadlines and terminal cleanup for one- and two-sided socket loss.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | reserved reconnect path는 있지만 실제 close에서 언제 reservation을 만들고 deadline 후 room을 어떻게 끝낼지 명확한 owner가 없었습니다. |
| 핵심 boundary/decision | 실제 current socket disconnect는 `session.disconnect(side, Date.now())`, `disconnectedUsers`, stopped scheduler, zero dy, paused snapshot, reconnect timer를 설정합니다. expiry는 RoomSession 결과에 따라 single-side forfeit를 score로 만들거나 both-disconnected room을 abandon합니다. |
| 상태 또는 ownership 변화 | room reconnect timer가 deadline wake-up을, RoomSession이 winner/null decision을, GameHub가 finalization/abandon cleanup을 소유합니다. |
| 주요 failure/edge path | winner 없음이면 persistence 없이 room을 버리고, winner가 있으면 winning score를 설정해 canonical finish path를 호출합니다. finalization/remove/close는 timer와 markers를 clear해 stale callback을 막습니다. |
| 보장/비보장 | disconnect는 최대 15초의 bounded reservation이며 expiry가 한 번의 forfeit 또는 non-persisted abandonment로 수렴합니다. browser가 자동으로 fresh ticket을 요청하는 것은 뒤 fix입니다. |
| 다음 관련 commit 연결 | `113e39...`가 replacement, 14,999ms recovery, 15,000ms expiry/finalize-once를 deterministic test로 고정합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `c98d4b1e8b43` — `feat(game): 예약된 room connection 복구`
- 다음 Thread 관련 SHA: `113e39acc85c` — `test(game): reconnect 복구 동작 검증`

### 5.6. `test(game): reconnect 복구 동작 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `113e39acc85c` |
| Importance | A |
| Tags | REALTIME, PERSISTENCE, RISK |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Verifies replacement, deadline recovery, one finalization, and stale-socket rejection.
- Classification summary: Add fake-timer GameHub lifecycle regressions around replacement and the exact reconnect boundary.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | replacement/reservation/expiry 코드가 상호작용하지만 timer race와 old socket callback에서 exactly-once 결과를 보장하는 test evidence가 없었습니다. |
| 핵심 boundary/decision | fake sockets, memory repository mock, fake timers로 active replacement, 14,999ms reconnect/current snapshot/play, 15,000ms expiry, one finalization/no duplicate, stale socket rejection을 검사합니다. |
| 상태 또는 ownership 변화 | test clock이 deadline을 deterministic하게 이동하고 repository spy가 finalize call count를 관찰합니다. |
| 주요 failure/edge path | replacement는 reconnect timeout을 만들지 않아야 하고, deadline 직전은 recover, exact deadline은 terminal입니다. timer를 더 진행해도 finalize가 두 번 호출되면 실패합니다. |
| 보장/비보장 | in-process GameHub state machine과 timers에서 검사한 race가 보호됩니다. 실제 TCP proxy, browser process, PostgreSQL transaction은 포함하지 않습니다. |
| 다음 관련 commit 연결 | `4f5199...`가 browser transport가 같은 reservation window 안에서 fresh ticket으로 재접속하도록 수정합니다. |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | 한 user 한 authoritative transport, 15초 reserved side, expiry/result exactly once. |
| 재현하는 failure/boundary | same-user replacement, stale socket, 14,999ms recovery, 15,000ms timeout, repeated timer advancement. |
| test technique | Vitest fake timers, fake WebSocket, repository spies/memory fixture. |
| 통과하는 production path | GameHub.connect/close → RoomSession disconnect/reconnect/expire → scheduler/timer → finalize/abandon. |
| 증명하는 것 | 검사한 in-process lifecycle에서 replacement와 boundary transition이 정확합니다. |
| 증명하지 않는 것 | real network partition, browser retry, DB failure, process restart는 증명하지 않습니다. |
| test 성격 | Deterministic state-machine and timer regression. |
| 후속 회귀 방지 설명 | old socket authority, deadline off-by-one, duplicate finalization, timer leak가 다시 생기면 실패해야 합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `e593b1dd9fcd` — `feat(game): reconnect 예약 만료와 room 정리`
- 다음 Thread 관련 SHA: `4f5199097284` — `fix(web): 중단된 game reconnect 복구`

### 5.7. `fix(web): 중단된 game reconnect 복구`

| 항목 | 값 |
| --- | --- |
| SHA | `4f5199097284` |
| Importance | A |
| Tags | AUTH, REALTIME, WEB |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Makes the browser request fresh tickets without replaying matchmaking intent.
- Classification summary: Reconnect the browser transport within the room reservation window using a fresh one-time ticket.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | server는 15초 side reservation을 유지하지만 browser socket client가 close를 terminal로 처리하면 user가 새 ticket으로 돌아오지 못해 항상 forfeit됩니다. |
| 핵심 boundary/decision | `GameSocketClient`가 roomId가 있는 unexpected close에서 최대 15초 동안 250ms부터 2초 상한의 backoff로 매 시도 새 `/auth/ws-ticket`을 발급받아 연결합니다. reconnect open에는 initial `queue.join`/AI intent를 보내지 않습니다. |
| 상태 또는 ownership 변화 | browser connection generation이 abort controller와 retry timer를 소유하고 reducer가 recovery state 동안 새 matchmaking intent를 막습니다. |
| 주요 failure/edge path | room이 없으면 reconnect하지 않고, generation 변경/unmount/terminal event에서 pending ticket과 timer를 취소합니다. 새 ticket은 single-use이므로 재사용하지 않습니다. |
| 보장/비보장 | 일시 transport 중단에서 existing room reservation으로 복귀할 수 있고 duplicate queue/room intent를 만들지 않습니다. full process/browser E2E나 server restart 복구는 이 commit만으로 증명하지 않습니다. |
| 다음 관련 commit 연결 | Thread 최종 contract는 server 15초 reservation과 browser 15초 fresh-ticket retry가 같은 room identity를 보존하는 것입니다. |

#### Fix 재구성

| 단계 | 근거 |
| --- | --- |
| 이전 가정 | server가 room side를 예약하면 browser는 별도 retry 정책 없이도 복구할 수 있다는 가정. |
| 실제 실패 또는 위험 | unexpected close 뒤 client가 socket을 다시 만들지 않아 reservation이 항상 expiry/forfeit로 끝납니다. |
| Root cause | domain recovery window와 browser transport lifecycle이 연결되지 않았습니다. |
| 수정된 invariant/decision | room context가 있을 때만 bounded retry하고 각 attempt에 fresh one-time ticket을 사용하며 matchmaking intent는 replay하지 않습니다. |
| 변경 코드 | web `GameSocketClient`/play reducer의 generation, abort, retry timer, reconnect open branch. |
| Regression evidence | browser tests는 fresh ticket count, no duplicate queue.join, cleanup, 15초 budget을 검사해야 합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `113e39acc85c` — `test(game): reconnect 복구 동작 검증`
- 이 Thread의 마지막 상태와 비교해 최종 보장을 정리했습니다.

## 6. Invariant ledger

Source에서 확정된 invariant를 commit 시점별로 연결했습니다. `해당 없음`은 해당 Thread 안에서 별도 fix/test가 없음을 뜻합니다.

| Invariant | 처음 도입/관찰한 SHA | 강화한 SHA | 부족함이 드러난 SHA | 복구한 fix | 고정한 regression test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| One user has one authoritative realtime connection, and reconnect replacement transfers ownership without creating a second match or losing the reserved room side. | `a06d1705bbc9` | `c98d4b1e8b43` reserved recovery → `e593b1dd9fcd` bounded deadline → `4f5199097284` browser retry | 기존 socket 중심 connection map | `a06d1705bbc9`, `4f5199097284` | `113e39acc85c` | `clientsByUser`, `disconnectedUsers`, `RoomSession`, browser `GameSocketClient` |
| Timers, schedulers, heartbeat handles, retry work, snapshot buffers, and database resources have explicit single-owner cleanup. | `8f64dfc117f3` scheduler follows session | `e593b1dd9fcd` reconnect timer cleanup, `4f5199097284` browser timer/abort cleanup | stale timeout/old socket 가능성 | `a06d1705bbc9`, `e593b1dd9fcd` | `113e39acc85c` | room timers, client heartbeat/snapshot buffer, browser generation |

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| snapshot phase와 callbacks가 lifecycle을 암묵적으로 정의 | `aa5d6...` RoomSession → `8f64df...` GameHub integration | `113e39...` fake-timer tests | legal transition와 runtime side effect 일치 |
| 같은 user의 old/new socket이 동시에 authoritative | `a06d17...` clientsByUser atomic handoff | replacement/stale-socket test | 한 user 한 current transport |
| disconnect 즉시 match 종료 또는 room 상실 | `c98d4...` reservation recovery + `e593b1...` 15초 expiry | 14,999/15,000ms tests | bounded recoverable loss |
| browser가 reservation을 사용하지 못함 | `4f5199...` fresh-ticket retry/no intent replay | browser code/tests | same room transport recovery |

## 8. Ownership / state / responsibility 변화

| 축 | 초기 SHA의 owner/state | 중간 전환 | Thread 최종 owner/state | 해제·cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| room domain state | snapshot phase/callbacks | `aa5d6...` RoomSession | RoomSession | finish에서 reconnect state clear | `roomSession.ts` |
| current connection authority | socket/client collections | `a06d17...` user index | `clientsByUser` | replacement/close/hub close | `gameHub.ts` |
| reserved side/deadline | 없음 | `c98d4...` disconnectedUsers, `e593b1...` timer | room + RoomSession | reconnect/finalize/abandon/close | GameHub reconnect methods |
| browser retry | 없음 | `4f5199...` generation/backoff | GameSocketClient | success/terminal/unmount/15초 expiry | web socket client/reducer |
| scheduler | room timer | session-gated start/stop | GameHub scheduler owner | pause/disconnect/finalize/remove | `startRoomScheduler`, unregister/stop paths |

## 9. Thread 최종 상태

- 최종 authoritative owner: RoomSession이 lifecycle을, `clientsByUser`가 current transport authority를, room timer가 reservation deadline을, browser generation이 retry work를 소유합니다.
- 최종 상태/invariant: same-user replacement는 disconnect가 아니며 실제 loss는 15초간 같은 room side를 보존하고 정확히 한 recovery/forfeit/abandonment로 끝납니다.
- 남아 있는 의도적 제한 또는 비보장: process restart 후 in-memory room 복구, multi-instance routing, real network proxy E2E는 보장하지 않습니다.
- 후속 Thread가 의존하는 contract: browser는 room context가 있을 때만 fresh ticket으로 재접속하고 queue/AI intent를 다시 보내지 않으며 server는 identity가 일치하는 reserved side만 반환합니다.
- 대표 코드 근거: `aa5d6a338690 roomSession.ts`, `a06d1705bbc9`/`e593b1dd9fcd gameHub.ts`, `113e39acc85c` tests, `4f5199097284` web reconnect code

## 10. 최종 architecture 또는 execution flow 정리

```text
[current socket/user]
    ├─ same-user new socket → atomic transport replacement → same room/side
    └─ actual close
          ↓ RoomSession.disconnect(side, now)
       [reconnecting + 15s deadline, scheduler stopped]
          ├─ fresh-ticket return before deadline → reserved side reattach
          │      ↓ all sides present → prior state + scheduler resume
          └─ deadline expiry
                 ├─ one side absent → opposite winner → canonical finalize
                 └─ both absent → non-persisted abandonment
```

- snapshot phase는 RoomSession decision을 반영하며 lifecycle source of truth가 아닙니다.
- replacement old socket은 current map에서 제거된 뒤 닫히므로 close callback이 forfeit를 만들지 않습니다.

## 11. 학습 완료 자가 점검

- [x] Commit map의 모든 SHA를 원문 순서대로 확인했습니다.
- [x] 각 commit의 subject, importance, tags를 변경하지 않았습니다.
- [x] S/A/B 깊이를 구분해 코드 근거를 남겼습니다.
- [x] final HEAD의 구현을 과거 SHA에 소급하지 않았습니다.
- [x] 핵심 상태 필드, caller/callee, ownership, failure branch, cleanup을 실제 코드로 확인했습니다.
- [x] Fix를 기존 가정 → failure/risk → root cause → decision → code → regression 순서로 연결했습니다.
- [x] Test commit에서 production invariant, failure, technique, path, 증명/비증명 범위를 구분했습니다.
- [x] Thread 최종 execution flow를 별도 프로젝트 재학습 없이 설명할 수 있습니다.
