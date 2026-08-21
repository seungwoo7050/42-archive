# 경기방 수명주기·연결 교체·복구

원문 Development Thread: `Room lifecycle, connection replacement, and recovery`

## 1. Thread 목표

- readiness, play, pause, disconnect, reconnect, expiry, finish를 explicit room-session state machine으로 복원합니다.
- 동일 사용자 새 socket이 기존 transport를 교체하면서 room side와 authority를 보존하는 atomic handoff를 추적합니다.
- 실제 disconnect와 same-user replacement를 구분하고 15초 reservation, forfeit/abandonment, browser fresh-ticket retry가 협력하는 방식을 확인합니다.

### Source에서 확정된 significance

> Socket loss and socket replacement are treated as lifecycle events, not immediate match termination or fresh
> matchmaking. The state machine, user-indexed connection map, reserved side, deadline, and browser retry
> policy cooperate to preserve one room and one player authority across transient transport failure.

### 직접 연결되는 Critical Invariants

> One user has one authoritative realtime connection, and reconnect replacement transfers ownership without
> creating a second match or losing the reserved room side.

> Timers, schedulers, heartbeat handles, retry work, snapshot buffers, and database resources have explicit
> single-owner cleanup.

### 직접 연결되는 Major Engineering Difficulties

> Coordinating readiness, pause, disconnect, reconnect, replacement, forfeit, retry, and final cleanup across
> interacting state machines.

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
| 학습 깊이 | Architecture/invariant 중심으로 직전 상태, 결정, 핵심 전이, ownership, failure, 후속 검증까지 완전히 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Defines legal readiness, pause, reconnect, expiry, and finish transitions.
- Classification summary: Introduce an explicit room-session state machine for readiness, play, pause, reconnection, and completion.

원문 구현 의도·상태 변화:

> Introduce an explicit room-session state machine for readiness, play, pause, reconnection, and completion. A
> match can enter `playing` only after both sides are ready, and pause or resume operations are effective only
> from their corresponding states.

원문 경계·failure handling·후속 범위:

> Disconnects preserve the state to resume, track which sides are absent, and establish a 15-second deadline.
> A timely reconnect removes only that side and restores the prior state after all missing participants
> return. Expiry converts a single absence into a forfeit for the opposite side, while simultaneous absence
> produces no winner; finishing clears reconnection state so expiry cannot be applied twice. This isolates
> lifecycle rules from socket callbacks and game physics.

#### Source의 Most Important Commit 정의

##### Problem

> Readiness, pause, disconnect, reconnect, forfeit, and finish behavior cannot safely be inferred from
> scattered socket callbacks and snapshot phases.

##### Decision

> Introduce `RoomSession` as an explicit state machine with legal transitions, remembered resume state,
> disconnected sides, a 15-second deadline, and idempotent finish.

##### Why it mattered

> The abstraction distinguishes a recoverable transport loss from a terminal match result and prevents invalid
> or repeated lifecycle transitions.

##### What changed

> The commit models readiness gating, pause/resume, one- or two-sided disconnect, in-window reconnect,
> deadline expiry, forfeit winner selection, and cleanup.

##### Project understanding

> It is the conceptual center of the project’s recovery story and the rule source later integrated into
> GameHub connection replacement and room cleanup.

#### 해당 SHA에서 확인할 실제 코드

- room-session state와 action/method 목록을 찾아 readiness, playing, paused, reconnecting, finished 관계를 표로 만듭니다.
- both-ready gating과 pause/resume 유효 상태, idempotent no-op 조건을 확인합니다.
- disconnect가 resume state, missing sides, 15-second deadline을 저장하는 방식을 기록합니다.
- reconnect가 한 side만 제거하고 모든 side 복귀 후 prior state를 복원하는 조건을 확인합니다.
- deadline expiry에서 one-sided forfeit winner와 two-sided no-winner를 선택하는 branch를 기록합니다.
- finish가 reconnect state를 clear하고 repeated expiry/finalization을 막는지 확인합니다.
- snapshot이나 socket object 없이 lifecycle rule을 테스트할 수 있는 dependency boundary를 정리합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 이 commit 직전 실제 ownership/state | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제와 기존 설계의 부족함 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 decision과 대안 배제 근거 | [파일·심볼·조건·관찰 결과 작성] |
| 입력 → 상태 전이 → 출력/side effect | [파일·심볼·조건·관찰 결과 작성] |
| ownership/lifetime/cleanup 변화 | [파일·심볼·조건·관찰 결과 작성] |
| failure scenario와 복구/rollback | [파일·심볼·조건·관찰 결과 작성] |
| 이 commit이 보장하는 것 | [파일·심볼·조건·관찰 결과 작성] |
| 아직 보장하지 않는 것 | [파일·심볼·조건·관찰 결과 작성] |
| 후속 fix/test와 연결 | [파일·심볼·조건·관찰 결과 작성] |

비교 기준:
- 이 commit의 parent에서 동일 책임을 담당하던 코드를 찾아 기록합니다.
- 다음 Thread 관련 SHA: `8f64dfc117f3` — `feat(game): 게임 방 상태를 RoomSession에 연결`

### 5.2. `feat(game): 게임 방 상태를 RoomSession에 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `8f64dfc117f3` |
| Importance | A |
| Tags | SIMULATION, REALTIME |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Makes GameHub lifecycle changes subordinate to the state machine.
- Classification summary: Make `RoomSession` the authority for a room’s lifecycle transitions instead of mutating the public snapshot phase directly.

원문 구현 의도·상태 변화:

> Make `RoomSession` the authority for a room’s lifecycle transitions instead of mutating the public snapshot
> phase directly. Each room creates a session, marks the AI side ready when applicable, and starts, pauses, or
> resumes simulation only when the state machine accepts the corresponding transition; the snapshot then
> mirrors that accepted state.

원문 경계·failure handling·후속 범위:

> The room also acquires explicit reconnect-timer and disconnected-side storage for the recovery work that
> follows. Separating transition validity from the transport and rendering snapshot gives later disconnect
> handling one place to decide whether a room may play, pause, reconnect, or finish.

#### 해당 SHA에서 확인할 실제 코드

- room 생성 시 RoomSession 또는 해당 SHA의 실제 state-machine type이 생성되는 위치를 확인합니다.
- AI side ready 처리와 human readiness가 state-machine method를 통과하는지 추적합니다.
- start/pause/resume 시 snapshot phase를 직접 먼저 바꾸지 않고 accepted session state를 mirror하는 순서를 기록합니다.
- simulation scheduler start/stop이 transition success에 종속되는지 확인합니다.
- reconnect timer와 disconnected-side storage가 room에 추가된 field 및 초기값을 기록합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 boundary/decision | [파일·심볼·조건·관찰 결과 작성] |
| 상태 또는 ownership 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 주요 failure/edge path | [파일·심볼·조건·관찰 결과 작성] |
| 보장/비보장 | [파일·심볼·조건·관찰 결과 작성] |
| 다음 관련 commit 연결 | [파일·심볼·조건·관찰 결과 작성] |

비교 기준:
- 직전 Thread 관련 SHA: `aa5d6a338690` — `refactor(game): 게임 방 상태 전이 모델링`
- 다음 Thread 관련 SHA: `a06d1705bbc9` — `feat(game): 사용자별 active connection 교체`

### 5.3. `feat(game): 사용자별 active connection 교체`

| 항목 | 값 |
| --- | --- |
| SHA | `a06d1705bbc9` |
| Importance | S |
| Tags | REALTIME, ARCH, RISK |
| 학습 깊이 | Architecture/invariant 중심으로 직전 상태, 결정, 핵심 전이, ownership, failure, 후속 검증까지 완전히 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Enforces one current transport and transfers room ownership atomically.
- Classification summary: Enforce one authoritative realtime connection per user.

원문 구현 의도·상태 변화:

> Enforce one authoritative realtime connection per user. A user-indexed client map identifies the current
> socket, and receiving code discards messages from a client that has already been displaced. This prevents
> two tabs or a reconnect race from independently driving the same queue, tournament, input, or room identity.

원문 경계·failure handling·후속 범위:

> Installing a replacement stops the old heartbeat and snapshot buffer, removes its transient memberships,
> transfers any occupied room side to the new client, sends the match context and latest snapshot, and closes
> the old socket with an explicit replacement code. The room is preserved while transport ownership changes,
> making socket replacement an atomic handoff rather than a disconnect followed by a new match.

#### Source의 Most Important Commit 정의

##### Problem

> Multiple tabs or a reconnect race could leave two sockets able to issue queue, tournament, input, or room
> commands for the same user.

##### Decision

> Index the current client by user and replace it through an atomic handoff that stops old resources,
> transfers room ownership, sends current context, and rejects stale messages.

##### Why it mattered

> The room survives transport replacement while player authority remains singular, preventing both duplicate
> control and unnecessary forfeits.

##### What changed

> The commit adds the user-indexed map, stale-client receive guard, resource shutdown, transient-membership
> cleanup, side transfer, context replay, and explicit replacement close.

##### Project understanding

> It is essential for understanding why reconnect is a continuation of one identity and room rather than a
> second connection competing with the first.

#### 해당 SHA에서 확인할 실제 코드

- user ID → current client map과 new connection registration/replace entry point를 찾습니다.
- receive path가 displaced client의 message를 identity/generation 기준으로 버리는 조건을 확인합니다.
- replacement 시 old heartbeat와 snapshot buffer stop, queue/tournament transient membership cleanup 순서를 기록합니다.
- old client가 room side를 점유 중일 때 new client로 side/client reference와 room ID를 이전하는 코드를 추적합니다.
- new client에 match context와 latest snapshot을 보낸 뒤 old socket을 explicit replacement code로 닫는 순서를 확인합니다.
- replacement가 reconnect deadline을 만들거나 room을 새로 생성하지 않는지 확인합니다.
- 동일 identity가 두 transport로 command를 처리할 수 없는 최종 guard를 정리합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 이 commit 직전 실제 ownership/state | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제와 기존 설계의 부족함 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 decision과 대안 배제 근거 | [파일·심볼·조건·관찰 결과 작성] |
| 입력 → 상태 전이 → 출력/side effect | [파일·심볼·조건·관찰 결과 작성] |
| ownership/lifetime/cleanup 변화 | [파일·심볼·조건·관찰 결과 작성] |
| failure scenario와 복구/rollback | [파일·심볼·조건·관찰 결과 작성] |
| 이 commit이 보장하는 것 | [파일·심볼·조건·관찰 결과 작성] |
| 아직 보장하지 않는 것 | [파일·심볼·조건·관찰 결과 작성] |
| 후속 fix/test와 연결 | [파일·심볼·조건·관찰 결과 작성] |

비교 기준:
- 직전 Thread 관련 SHA: `8f64dfc117f3` — `feat(game): 게임 방 상태를 RoomSession에 연결`
- 다음 Thread 관련 SHA: `c98d4b1e8b43` — `feat(game): 예약된 room connection 복구`

### 5.4. `feat(game): 예약된 room connection 복구`

| 항목 | 값 |
| --- | --- |
| SHA | `c98d4b1e8b43` |
| Importance | A |
| Tags | SIMULATION, REALTIME |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Reattaches a returning identity only to an explicit reserved side.
- Classification summary: Reconnect a newly authenticated socket to the room side reserved for the same user.

원문 구현 의도·상태 변화:

> Reconnect a newly authenticated socket to the room side reserved for the same user. The hub searches only
> explicit disconnected-user reservations and delegates deadline validity to `MatchSession.reconnect`, then
> replaces the stale side client, restores both room references, and sends the original match context plus
> current snapshot.

원문 경계·failure handling·후속 범위:

> If another participant is still missing, the room remains in `reconnecting` and only the returning player
> receives state. Once the session can resume, the reconnect timer is cleared, the snapshot phase is
> synchronized with session state, simulation restarts only for a playing room, and the restored state is
> broadcast. This keeps transport replacement subordinate to the authoritative match lifecycle rather than
> treating reconnect as new matchmaking.

#### 해당 SHA에서 확인할 실제 코드

- new authenticated socket이 disconnected-user reservation을 검색하는 lookup을 확인합니다.
- deadline validity와 side ownership을 state-machine reconnect method에 위임하는 call을 추적합니다.
- stale side client를 교체하고 양쪽 room reference를 복원하는 mutation 순서를 기록합니다.
- 다른 participant가 여전히 missing일 때 room은 reconnecting으로 남고 returning client만 state를 받는 branch를 확인합니다.
- 모든 participant 복귀 시 timer clear, session/snapshot phase sync, playing room만 scheduler restart, broadcast 순서를 기록합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 boundary/decision | [파일·심볼·조건·관찰 결과 작성] |
| 상태 또는 ownership 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 주요 failure/edge path | [파일·심볼·조건·관찰 결과 작성] |
| 보장/비보장 | [파일·심볼·조건·관찰 결과 작성] |
| 다음 관련 commit 연결 | [파일·심볼·조건·관찰 결과 작성] |

비교 기준:
- 직전 Thread 관련 SHA: `a06d1705bbc9` — `feat(game): 사용자별 active connection 교체`
- 다음 Thread 관련 SHA: `e593b1dd9fcd` — `feat(game): reconnect 예약 만료와 room 정리`

### 5.5. `feat(game): reconnect 예약 만료와 room 정리`

| 항목 | 값 |
| --- | --- |
| SHA | `e593b1dd9fcd` |
| Importance | A |
| Tags | SIMULATION, REALTIME, RISK |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Turns disconnect into a bounded reservation, forfeit, or non-persisted abandonment.
- Classification summary: Replace immediate disconnect forfeits with a bounded room reservation.

원문 구현 의도·상태 변화:

> Replace immediate disconnect forfeits with a bounded room reservation. When a participant loses the socket,
> the hub records the user against that side, pauses simulation, zeros the disconnected paddle’s motion, arms
> the session’s reconnect deadline, and broadcasts the paused snapshot. The client remains attached to the
> room identity, so it cannot enter another queue while recovery is pending.

원문 경계·failure handling·후속 범위:

> When the deadline expires, the session state decides the terminal outcome: a remaining participant wins by
> forfeit, while a room with no eligible winner is abandoned without persistence. Both paths clear timers,
> reservations, client room references, and scheduler activity; normal finalization performs the same cleanup.
> This makes disconnect recovery a lifecycle state with one deadline and one cleanup boundary instead of an ad
> hoc delayed side effect.

#### 해당 SHA에서 확인할 실제 코드

- genuine socket loss에서 disconnected user/side reservation과 deadline timer가 생성되는 위치를 확인합니다.
- simulation pause/unschedule와 disconnected paddle direction zeroing을 기록합니다.
- recovery pending 동안 client/identity가 room ownership을 유지해 queue 진입을 막는 조건을 확인합니다.
- expiry callback이 state-machine result를 받아 forfeit persistence 또는 no-winner abandonment로 분기하는지 추적합니다.
- 두 terminal path에서 timer, reservation, room/client refs, scheduler cleanup의 공통/차이를 표로 만듭니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 boundary/decision | [파일·심볼·조건·관찰 결과 작성] |
| 상태 또는 ownership 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 주요 failure/edge path | [파일·심볼·조건·관찰 결과 작성] |
| 보장/비보장 | [파일·심볼·조건·관찰 결과 작성] |
| 다음 관련 commit 연결 | [파일·심볼·조건·관찰 결과 작성] |

비교 기준:
- 직전 Thread 관련 SHA: `c98d4b1e8b43` — `feat(game): 예약된 room connection 복구`
- 다음 Thread 관련 SHA: `113e39acc85c` — `test(game): reconnect 복구 동작 검증`

### 5.6. `test(game): reconnect 복구 동작 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `113e39acc85c` |
| Importance | A |
| Tags | REALTIME, PERSISTENCE, RISK |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Verifies replacement, deadline recovery, one finalization, and stale-socket rejection.
- Classification summary: Add deterministic integration coverage for the realtime recovery contract.

원문 구현 의도·상태 변화:

> Add deterministic integration coverage for the realtime recovery contract. Replacing an active socket for
> the same user must close the old connection, attach the new one to the existing room, send the current match
> assignment and snapshot, and avoid starting a forfeit deadline; messages from the displaced socket cannot
> create another room.

원문 경계·failure handling·후속 범위:

> A genuinely disconnected player retains the same room and side for 15 seconds and may reconnect to the
> latest snapshot before the deadline. Crossing that deadline instead finalizes one idempotently keyed
> forfeit, notifies the remaining player, and never persists the result twice even as more time elapses. Fake
> timers and a repository spy verify both the temporal boundary and the durable side effect.

#### 해당 SHA에서 확인할 실제 코드

- same-user replacement test와 genuine disconnect/reconnect test의 setup 차이를 확인합니다.
- old socket close, existing room/side transfer, current context/snapshot replay, no forfeit deadline assertion을 기록합니다.
- displaced socket message가 another room을 만들지 못하는 production receive guard를 연결합니다.
- fake timer로 15초 이전 reconnect와 정확한 deadline 이후 expiry를 어떻게 구분하는지 확인합니다.
- forfeit finalize spy가 stable key로 exactly once 호출되고 추가 시간 경과에도 반복되지 않는지 확인합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | 한 user의 authoritative transport replacement와 genuine disconnect recovery는 같은 room/side를 보존하며 expiry는 한 번만 terminal result를 만듭니다. |
| 재현하는 failure/boundary | duplicate room, stale socket control, premature forfeit, lost side, double persistence. |
| test technique | fake sockets, fake timers, repository spy, replacement/reconnect/expiry scenarios. |
| 통과하는 production path | hub connect/replace/disconnect → session reservation/reconnect/expire → finalize/cleanup. |
| 증명하는 것 | 시간 경계와 durable side effect를 포함한 recovery integration을 검증합니다. |
| 증명하지 않는 것 | 실제 network proxy의 reconnect 품질이나 browser backoff는 직접 검증하지 않습니다. |
| test 성격 | Deterministic realtime lifecycle integration regression. |
| 후속 회귀 방지 설명 | [학습자 작성 — 어떤 변경이 이 테스트를 깨뜨려야 하는지 기록] |

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 boundary/decision | [파일·심볼·조건·관찰 결과 작성] |
| 상태 또는 ownership 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 주요 failure/edge path | [파일·심볼·조건·관찰 결과 작성] |
| 보장/비보장 | [파일·심볼·조건·관찰 결과 작성] |
| 다음 관련 commit 연결 | [파일·심볼·조건·관찰 결과 작성] |

비교 기준:
- 직전 Thread 관련 SHA: `e593b1dd9fcd` — `feat(game): reconnect 예약 만료와 room 정리`
- 다음 Thread 관련 SHA: `4f5199097284` — `fix(web): 중단된 game reconnect 복구`

### 5.7. `fix(web): 중단된 game reconnect 복구`

| 항목 | 값 |
| --- | --- |
| SHA | `4f5199097284` |
| Importance | A |
| Tags | AUTH, REALTIME, WEB |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Makes the browser request fresh tickets without replaying matchmaking intent.
- Classification summary: Recover interrupted game sockets as continuation of an existing room rather than as a new matchmaking request.

원문 구현 의도·상태 변화:

> Recover interrupted game sockets as continuation of an existing room rather than as a new matchmaking
> request. `GameSocketClient` now retries within a 15-second window using capped exponential backoff and
> obtains a fresh one-time WebSocket ticket for every attempt. Reopened sockets deliberately omit the original
> `queue.join` or AI command, avoiding duplicate matchmaking while allowing the server to restore the
> authenticated room from subsequent snapshots.

원문 경계·failure handling·후속 범위:

> The connection reducer distinguishes a reopened socket from an initial open, and the hook requests retries
> only while a room is still owned by the client. New match controls are disabled unless no room is active and
> the state is idle, finished, or failed, preserving the invariant that recovery and matchmaking cannot run
> concurrently. Guest-mode lobby handling also redirects recovered room traffic back to `/play` and presents
> non-persisted match results explicitly instead of treating them as durable history.

#### 해당 SHA에서 확인할 실제 코드

- `GameSocketClient` reconnect window, capped exponential backoff, fresh ticket acquisition을 확인합니다.
- reopened socket이 original queue/AI initial command를 재전송하지 않는 branch를 기록합니다.
- connection reducer가 initial open과 reopened open을 구분하고 room-owned reconnecting 상태를 유지하는지 확인합니다.
- active room 동안 new match controls를 막는 state 조건을 확인합니다.
- 15초 window 종료, manual replacement, unmount에서 pending retry/ticket/socket이 정리되는지 추적합니다.
- guest lobby가 recovered active-room traffic을 `/play`로 돌리는 연결은 guest-specific인지 공통 lifecycle인지 구분합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### Fix 연결 골격

- 기존 가정: socket이 끊기면 browser가 원래 matchmaking command를 다시 보내 새 연결을 만들면 됨.
- Source에서 드러난 failure/risk: server가 reserved room을 복구하는 동안 duplicate queue/AI intent가 두 번째 match를 만들 수 있음.
- Root cause 코드 근거: [학습자 작성 — 해당 SHA의 실제 caller, state, branch를 인용]
- 수정된 decision/invariant: 15초 window 안에서 fresh ticket으로 socket만 재개하고 initial match intent는 replay하지 않음.
- 실제 수정 코드: [학습자 작성 — 파일, 심볼, 변경 전/후 최소 코드]
- Regression 연결: client/reducer/guest recovery tests에서 reconnecting 중 second match 차단과 fresh-ticket retry를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 boundary/decision | [파일·심볼·조건·관찰 결과 작성] |
| 상태 또는 ownership 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 주요 failure/edge path | [파일·심볼·조건·관찰 결과 작성] |
| 보장/비보장 | [파일·심볼·조건·관찰 결과 작성] |
| 다음 관련 commit 연결 | [파일·심볼·조건·관찰 결과 작성] |

비교 기준:
- 직전 Thread 관련 SHA: `113e39acc85c` — `test(game): reconnect 복구 동작 검증`
- 이 Thread의 최종 상태와 비교해 이후 보완 여부를 기록합니다.

## 6. Invariant ledger

Source에서 확정된 invariant를 아래 시점별로 연결합니다. 새 invariant를 추측해 확정하지 않습니다.

| Invariant | 처음 도입/관찰한 SHA | 강화한 SHA | 부족함이 드러난 SHA | 복구한 fix | 고정한 regression test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| One user has one authoritative realtime connection, and reconnect replacement transfers ownership without creating a second match or losing the reserved room side. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| Timers, schedulers, heartbeat handles, retry work, snapshot buffers, and database resources have explicit single-owner cleanup. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |

추가 기록:

- invariant가 동일한 문장으로 유지되었는지, 더 강한 조건으로 바뀌었는지 구분합니다.
- implementation detail과 invariant를 혼동하지 않습니다.
- source가 명시하지 않은 규칙은 “관찰한 가설”로 표시하고 코드 근거로만 남깁니다.

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| socket callback에 lifecycle rule이 흩어짐 | `aa5d6a338690` state machine → `8f64dfc117f3` hub integration | `113e39acc85c` transition/recovery integration | legal room lifecycle |
| 동일 user의 두 socket 또는 reconnect를 새 match로 오인 | `a06d1705bbc9` atomic replacement → `c98d4b1e8b43` reserved-side restore | `113e39acc85c` stale socket/replacement/reconnect 검증 | one authoritative transport |
| disconnect 즉시 forfeit 또는 영구 room leak | `e593b1dd9fcd` 15초 reservation/expiry → `4f5199097284` browser fresh-ticket retry | `113e39acc85c` deadline regression | bounded recovery |

학습자 보완 기록:

- 실제 failure를 주입하거나 재현하는 test fixture를 찾아 위 표의 각 행과 연결합니다.
- fix가 symptom만 가리는지, ownership/invariant를 바꾸는지 코드 근거로 판별합니다.
- broad integration과 deterministic regression을 별도 표시합니다.

## 8. Ownership / state / responsibility 변화

| 축 | 초기 SHA의 owner/state | 중간 전환 | Thread 최종 owner/state | 해제·cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| room lifecycle state | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| authoritative client per user | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| room-side reservation | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| reconnect deadline and timer | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| browser retry and intent ownership | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |

## 9. Thread 최종 상태

다음 항목은 최종 HEAD를 보고 채우지 말고, 이 Thread의 마지막 commit까지 순서대로 복원한 결과로 작성합니다.

- 최종 authoritative owner: [학습자 작성]
- 최종 상태/invariant: [학습자 작성]
- 남아 있는 의도적 제한 또는 비보장: [학습자 작성]
- 후속 Thread가 의존하는 contract: [학습자 작성]
- 대표 코드 근거: [SHA, 파일, symbol]

## 10. 최종 architecture 또는 execution flow 정리

- playing 중 socket replacement와 genuine disconnect의 실행 흐름을 각각 작성합니다.
- room side가 어느 시점에도 두 socket에 의해 동시에 제어되지 않는 근거를 설명합니다.
- reconnect 성공, forfeit, abandonment의 cleanup 차이를 정리합니다.

```text
[입력/이벤트]
    ↓
[소유 boundary와 validation]
    ↓
[상태 전이 또는 side effect]
    ↓
[출력/관측/cleanup]
```

위 흐름의 각 화살표에 실제 SHA와 symbol을 붙입니다.

## 11. 학습 완료 자가 점검

- [ ] Commit map의 모든 SHA를 원문 순서대로 확인했습니다.
- [ ] 각 commit의 subject, importance, tags를 변경하지 않았습니다.
- [ ] S/A/B 깊이를 구분해 코드 근거를 남겼습니다.
- [ ] final HEAD의 구현을 과거 SHA에 소급하지 않았습니다.
- [ ] 핵심 상태 필드, caller/callee, ownership, failure branch, cleanup을 실제 코드로 확인했습니다.
- [ ] Fix를 기존 가정 → failure/risk → root cause → decision → code → regression 순서로 연결했습니다.
- [ ] Test commit에서 production invariant, failure, technique, path, 증명/비증명 범위를 구분했습니다.
- [ ] Thread 최종 execution flow를 별도 프로젝트 재학습 없이 설명할 수 있습니다.
