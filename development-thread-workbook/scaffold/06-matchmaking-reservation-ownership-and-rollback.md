# 매치메이킹 예약 소유권과 롤백

원문 Development Thread: `Matchmaking reservation ownership and rollback`

## 1. Thread 목표

- GameHub 내부 timer-backed queue에서 독립 `Matchmaker` state machine으로 queue/reservation ownership이 이동하는 과정을 추적합니다.
- closest-rating pairing, guest/registered pool 분리, six-second AI fallback, duplicate membership, leave/release 의미를 복원합니다.
- room 생성 중 부분 실패와 모든 terminal path가 reservation을 누락 없이 해제하는 rollback/cleanup 구조를 확인합니다.

### Source에서 확정된 significance

> The initial timer-backed queue works but leaves GameHub with multiple representations of availability. The
> later Matchmaker abstraction makes reservation state explicit; integration and cleanup commits then
> eliminate split ownership. The progression matters because stale reservations would permanently remove users
> or allow one user to occupy two matches.

### 직접 연결되는 Critical Invariants

> Queue and reservation membership have one owner and are released on every leave, disconnect, rollback,
> drain, abandonment, failure, and finalization path.

> The server is the sole authority for game rules, scores, phases, room membership, matchmaking, and persisted
> outcomes.

### 직접 연결되는 Major Engineering Difficulties

> Coordinating readiness, pause, disconnect, reconnect, replacement, forfeit, retry, and final cleanup across
> interacting state machines.

> Preserving domain correctness during database failure, tournament-start rollback, match-finalization retry,
> process drain, and deployment shutdown.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- queued, matched/reserved, duplicate, fallback-ready 상태는 어떤 자료구조와 반환형으로 표현됩니까?
- closest candidate 선택에서 rating window, pool kind, tie order, injected clock이 어떻게 사용됩니까?
- `leaveQueue`와 `release`는 왜 분리되며 잘못 사용하면 어떤 invariant가 깨집니까?
- asynchronous NPC lookup 전후 어떤 socket/room/drain 조건을 다시 검증합니까?
- GameHub에 남는 transport metadata와 Matchmaker가 소유하는 domain state는 각각 무엇입니까?
- room publication 도중 observer/send/snapshot failure가 발생하면 어떤 획득 자원을 역순으로 되돌립니까?

## 3. 완료 기준

- Matchmaker 상태 전이와 반환 outcome을 실제 타입 및 메서드로 그릴 수 있습니다.
- 동일 사용자가 queued/reserved/active room 중 둘 이상에 동시에 존재하지 않는 근거를 제시할 수 있습니다.
- normal match, AI fallback, leave, disconnect, drain, room creation failure, finalization/abandonment의 release 경로를 모두 기록할 수 있습니다.
- GameHub의 duplicate queue 표현이 제거되기 전후 ownership 차이를 설명할 수 있습니다.
- rollback test가 partial publication과 stale reservation을 어떻게 재현하는지 구분할 수 있습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `1122e6a4b901` | `feat(game): 대기 플레이어 NPC fallback 구성` | B | REALTIME | Introduces timed AI fallback with explicit timer cleanup. |
| 2 | `1ec8335b0e75` | `refactor(game): matchmaking player와 fallback 계약 정의` | A | REALTIME, REFACTOR | Defines queued, matched, duplicate, fallback, and release outcomes independently of sockets. |
| 3 | `a4f59a2e8192` | `refactor(game): rating 기반 closest-pair queue 구현` | A | REALTIME, REFACTOR | Implements deterministic compatible-pool, closest-rating pairing. |
| 4 | `7871e29278c2` | `refactor(game): AI fallback과 reservation lifecycle 구현` | A | REALTIME, REFACTOR | Separates queue cancellation from releasing an assigned match reservation. |
| 5 | `e53559ef3a11` | `refactor(game): Matchmaker queue reservation을 GameHub에 연결` | A | REALTIME, REFACTOR | Moves duplicate-user reservation and PvP selection behind Matchmaker. |
| 6 | `51f36aa50596` | `refactor(game): Matchmaker AI fallback를 GameHub에 연결` | A | REALTIME, OPERATIONS, RISK | Claims delayed fallback through the same state machine and revalidates asynchronous work. |
| 7 | `a23fc26a7f82` | `refactor(game): queue와 reservation cleanup 일원화` | S | REALTIME, ARCH, RISK | Removes duplicate queue ownership and centralizes every release path. |
| 8 | `b5bfeee0e23e` | `refactor(game): room 생성과 finalization cleanup 보장` | A | REALTIME, OBSERVABILITY, RISK | Rolls back partially published rooms and guarantees terminal removal. |
| 9 | `112228db8878` | `test(game): matchmaking lifecycle 검증` | A | REALTIME, RISK, TEST | Protects matchability after failure, abandonment, forfeit, and rollback. |

## 5. Commit별 학습 기록

### 5.1. `feat(game): 대기 플레이어 NPC fallback 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `1122e6a4b901` |
| Importance | B |
| Tags | REALTIME |
| 학습 깊이 | Thread 흐름에서 맡는 구현 역할과 필요한 상태 변화를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Introduces timed AI fallback with explicit timer cleanup.
- Classification summary: Add a bounded waiting policy for the human matchmaking queue.

원문 구현 의도·상태 변화:

> Add a bounded waiting policy for the human matchmaking queue. A player who remains unmatched for six seconds
> receives the closest active NPC by rating, is removed from the queue, and enters a queue-mode room whose
> right-side user is the selected automated opponent.

원문 경계·failure handling·후속 범위:

> The fallback timer belongs to the queue entry and is cleared whenever the player is matched normally,
> leaves, disconnects, or is pruned. Those cleanup paths prevent a stale timeout from creating a second room
> after queue ownership has already changed. Storing the NPC separately on the room also preserves its
> identity through final result persistence even though it has no WebSocket client.

#### 해당 SHA에서 확인할 실제 코드

- human queue entry 시 six-second fallback timer가 생성되고 entry와 연결되는 자료구조를 확인합니다.
- deadline 후 closest active NPC를 rating으로 선택하고 queue에서 제거한 뒤 room을 만드는 순서를 기록합니다.
- normal match, leave, disconnect, prune에서 timer clear가 모두 실행되는지 확인합니다.
- stale timeout이 이미 matched user에게 두 번째 room을 만들지 못하는 guard를 찾습니다.
- NPC identity가 socket 없이 room과 final result persistence에 유지되는 field를 기록합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| Thread에서 맡는 역할 | [파일·심볼·조건·관찰 결과 작성] |
| 확인한 핵심 코드와 상태 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 후속 commit에 남긴 조건 | [파일·심볼·조건·관찰 결과 작성] |

비교 기준:
- 이 commit의 parent에서 동일 책임을 담당하던 코드를 찾아 기록합니다.
- 다음 Thread 관련 SHA: `1ec8335b0e75` — `refactor(game): matchmaking player와 fallback 계약 정의`

### 5.2. `refactor(game): matchmaking player와 fallback 계약 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `1ec8335b0e75` |
| Importance | A |
| Tags | REALTIME, REFACTOR |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Defines queued, matched, duplicate, fallback, and release outcomes independently of sockets.
- Classification summary: Introduces the domain vocabulary for matchmaking independently of sockets and rooms: registered versus guest players, rating-bearing pairs, queued/matched/duplicate join outcomes, waiting/ready/unavailable...

원문 구현 의도·상태 변화:

> Introduces the domain vocabulary for matchmaking independently of sockets and rooms: registered versus guest
> players, rating-bearing pairs, queued/matched/duplicate join outcomes, waiting/ready/unavailable AI fallback
> outcomes, and queued versus matched status. The six-second fallback constant and injectable clock are part
> of the contract, while input validation rejects empty identities, unsafe ratings, and invalid pool kinds.
> This typed state surface makes later transitions exhaustive instead of encoding them as nullable values.

#### 해당 SHA에서 확인할 실제 코드

- registered/guest player, rating pair, queue/fallback outcome, membership status를 표현하는 타입을 정리합니다.
- six-second fallback constant와 injectable clock이 contract에 포함되는 위치를 확인합니다.
- empty identity, unsafe rating, invalid pool kind validation을 기록합니다.
- nullable 값 조합 대신 exhaustive outcome을 소비하게 하는 caller-facing union/interface를 확인합니다.

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
- 직전 Thread 관련 SHA: `1122e6a4b901` — `feat(game): 대기 플레이어 NPC fallback 구성`
- 다음 Thread 관련 SHA: `a4f59a2e8192` — `refactor(game): rating 기반 closest-pair queue 구현`

### 5.3. `refactor(game): rating 기반 closest-pair queue 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `a4f59a2e8192` |
| Importance | A |
| Tags | REALTIME, REFACTOR |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Implements deterministic compatible-pool, closest-rating pairing.
- Classification summary: Implements the Matchmaker queue with explicit queued and matched statuses.

원문 구현 의도·상태 변화:

> Implements the Matchmaker queue with explicit queued and matched statuses. A new entrant is paired with the
> closest same-kind candidate inside the configured rating difference; otherwise the player is queued with
> both enqueue and AI-fallback timestamps. Duplicate membership is reported rather than mutating state, and
> injected time plus defensive value copies make the algorithm deterministic and isolated from external object
> mutation.

#### 해당 SHA에서 확인할 실제 코드

- `Matchmaker` enqueue에서 same-kind candidate와 rating-difference 범위를 필터링하는 순서를 확인합니다.
- closest candidate 선택과 distance tie에서 earliest encountered candidate를 유지하는 iteration을 기록합니다.
- match가 없을 때 enqueue time과 AI-fallback time을 저장하는 state를 확인합니다.
- duplicate membership이 state mutation 없이 별도 outcome을 반환하는 branch를 확인합니다.
- injected clock과 defensive copy가 deterministic behavior를 보장하는 근거를 찾습니다.

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
- 직전 Thread 관련 SHA: `1ec8335b0e75` — `refactor(game): matchmaking player와 fallback 계약 정의`
- 다음 Thread 관련 SHA: `7871e29278c2` — `refactor(game): AI fallback과 reservation lifecycle 구현`

### 5.4. `refactor(game): AI fallback과 reservation lifecycle 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `7871e29278c2` |
| Importance | A |
| Tags | REALTIME, REFACTOR |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Separates queue cancellation from releasing an assigned match reservation.
- Classification summary: Extends Matchmaker from pair selection into a complete reservation lifecycle.

원문 구현 의도·상태 변화:

> Extends Matchmaker from pair selection into a complete reservation lifecycle. AI fallback can be claimed
> only by a currently queued user and only after the six-second deadline; the claim atomically removes the
> queue entry and marks the user matched. Separate leaveQueue and release operations preserve the distinction
> between cancelling a wait and freeing an already assigned slot, so callers cannot accidentally make one side
> of an active match available.

#### 해당 SHA에서 확인할 실제 코드

- fallback claim이 currently queued이고 deadline에 도달한 user에게만 허용되는 조건을 확인합니다.
- claim이 queue removal과 matched reservation 설정을 하나의 transition으로 수행하는지 추적합니다.
- `leaveQueue`와 `release`의 대상 상태 및 return behavior를 비교합니다.
- active match의 한 side만 잘못 available로 만드는 호출을 API가 어떻게 방지하는지 기록합니다.
- queued/matched duplicate membership 차단이 reservation lifecycle 전체에서 유지되는지 확인합니다.

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
- 직전 Thread 관련 SHA: `a4f59a2e8192` — `refactor(game): rating 기반 closest-pair queue 구현`
- 다음 Thread 관련 SHA: `e53559ef3a11` — `refactor(game): Matchmaker queue reservation을 GameHub에 연결`

### 5.5. `refactor(game): Matchmaker queue reservation을 GameHub에 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `e53559ef3a11` |
| Importance | A |
| Tags | REALTIME, REFACTOR |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Moves duplicate-user reservation and PvP selection behind Matchmaker.
- Classification summary: Moves PvP selection and duplicate-user reservation into Matchmaker while GameHub retains socket and timer concerns.

원문 구현 의도·상태 변화:

> Moves PvP selection and duplicate-user reservation into Matchmaker while GameHub retains socket and timer
> concerns. Enqueue now distinguishes queued, matched, and duplicate states, separates guests from registered
> users, enforces the rating window, and releases both reservations if the transport-side opponent entry is
> missing or room creation fails. This begins replacing ad hoc array matching with an explicit domain state
> machine.

#### 해당 SHA에서 확인할 실제 코드

- GameHub queue join이 Matchmaker enqueue outcome을 분기하는 call site를 확인합니다.
- guest/registered pool과 rating window가 hub가 아닌 Matchmaker 결과로 적용되는지 확인합니다.
- matched opponent의 transport metadata가 없거나 room creation이 실패할 때 양쪽 reservation release 순서를 기록합니다.
- duplicate outcome이 새 timer/room/membership을 만들지 않는지 확인합니다.
- 이 SHA에서 아직 남아 있는 GameHub queue representation을 찾아 이후 cleanup 통합의 출발점으로 기록합니다.

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
- 직전 Thread 관련 SHA: `7871e29278c2` — `refactor(game): AI fallback과 reservation lifecycle 구현`
- 다음 Thread 관련 SHA: `51f36aa50596` — `refactor(game): Matchmaker AI fallback를 GameHub에 연결`

### 5.6. `refactor(game): Matchmaker AI fallback를 GameHub에 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `51f36aa50596` |
| Importance | A |
| Tags | REALTIME, OPERATIONS, RISK |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Claims delayed fallback through the same state machine and revalidates asynchronous work.
- Classification summary: Schedules AI fallback from the Matchmaker-provided deadline and claims the fallback through its state machine rather than by inspecting a parallel queue.

원문 구현 의도·상태 변화:

> Schedules AI fallback from the Matchmaker-provided deadline and claims the fallback through its state
> machine rather than by inspecting a parallel queue. The handler reschedules when the deadline has not
> arrived, abandons stale or unavailable entries, revalidates socket and room state after asynchronous NPC
> lookup, and releases the reservation on every failure. This keeps delayed work from creating a room for a
> user who has already disconnected, matched, or entered shutdown.

#### 해당 SHA에서 확인할 실제 코드

- Matchmaker가 반환한 fallback deadline으로 timer delay를 계산하는 코드를 확인합니다.
- callback 시 deadline 전이면 reschedule하고 stale/unavailable이면 abandon하는 branch를 기록합니다.
- asynchronous NPC lookup 전후 socket open/current client/room/draining/reservation 상태를 다시 검사하는 순서를 확인합니다.
- NPC lookup failure, stale client, room creation failure 각각에서 reservation과 timer metadata가 release되는지 추적합니다.
- parallel queue array를 직접 검사하지 않고 Matchmaker claim outcome을 authority로 쓰는지 확인합니다.

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
- 직전 Thread 관련 SHA: `e53559ef3a11` — `refactor(game): Matchmaker queue reservation을 GameHub에 연결`
- 다음 Thread 관련 SHA: `a23fc26a7f82` — `refactor(game): queue와 reservation cleanup 일원화`

### 5.7. `refactor(game): queue와 reservation cleanup 일원화`

| 항목 | 값 |
| --- | --- |
| SHA | `a23fc26a7f82` |
| Importance | S |
| Tags | REALTIME, ARCH, RISK |
| 학습 깊이 | Architecture/invariant 중심으로 직전 상태, 결정, 핵심 전이, ownership, failure, 후속 검증까지 완전히 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Removes duplicate queue ownership and centralizes every release path.
- Classification summary: Removes GameHub's duplicate queue array and makes Matchmaker the authoritative owner of queued and reserved users, while a map retains transport-specific timers and clients.

원문 구현 의도·상태 변화:

> Removes GameHub's duplicate queue array and makes Matchmaker the authoritative owner of queued and reserved
> users, while a map retains transport-specific timers and clients. Queue leave, disconnect pruning, drain,
> shutdown, room abandonment, finalization failure, and room removal all release through shared paths.
> Consolidating ownership prevents the two representations from disagreeing about whether a user is queued,
> matched, or available.

#### Source의 Most Important Commit 정의

##### Problem

> GameHub and Matchmaker both represented queue state, allowing disconnect, drain, rollback, abandonment, or
> finalization paths to disagree about whether a user was available.

##### Decision

> Make Matchmaker the sole owner of queued and matched reservations and route every release through shared
> cleanup paths while retaining only transport-specific metadata in GameHub.

##### Why it mattered

> Single ownership prevents stale reservations from permanently excluding a user or allowing one player to
> enter multiple matches.

##### What changed

> The duplicate queue array is removed; leave, pruning, drain, shutdown, abandonment, finalization failure,
> and room removal all converge on common release operations.

##### Project understanding

> It captures the final matchmaking architecture and the practical rule that every acquisition path must have
> one complete, centralized release story.

#### 해당 SHA에서 확인할 실제 코드

- GameHub의 duplicate queue array가 제거되는 diff와 Matchmaker가 보유하는 authoritative state를 확인합니다.
- transport-specific timer/client map에 남는 field와 domain queue/reservation state를 명확히 구분합니다.
- queue leave, disconnect pruning, drain, shutdown, abandonment, finalization failure, room removal의 shared cleanup entry point를 모두 찾습니다.
- 각 path가 queued membership과 matched reservation 중 올바른 것을 release하는지 기록합니다.
- cleanup의 idempotency와 이미 제거된 user 처리 branch를 확인합니다.
- 한 user가 stale reservation 때문에 permanently unavailable하거나 동시에 두 match에 들어가지 않는 ownership 근거를 정리합니다.

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
- 직전 Thread 관련 SHA: `51f36aa50596` — `refactor(game): Matchmaker AI fallback를 GameHub에 연결`
- 다음 Thread 관련 SHA: `b5bfeee0e23e` — `refactor(game): room 생성과 finalization cleanup 보장`

### 5.8. `refactor(game): room 생성과 finalization cleanup 보장`

| 항목 | 값 |
| --- | --- |
| SHA | `b5bfeee0e23e` |
| Importance | A |
| Tags | REALTIME, OBSERVABILITY, RISK |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Rolls back partially published rooms and guarantees terminal removal.
- Classification summary: Wraps room publication in rollback cleanup: if observer notification, client assignment, matching messages, or the initial snapshot fails, the scheduler entry, reconnect timer, room map, and client room...

원문 구현 의도·상태 변화:

> Wraps room publication in rollback cleanup: if observer notification, client assignment, matching messages,
> or the initial snapshot fails, the scheduler entry, reconnect timer, room map, and client room references
> are restored before the error escapes. Finalization similarly removes the room in a finally block after
> persistence succeeds, even when observation or broadcast fails. The lifecycle boundary now guarantees that
> partially visible rooms and completed rooms cannot leak in-memory ownership.

#### 해당 SHA에서 확인할 실제 코드

- room publication 전에 획득/변경되는 scheduler entry, reconnect timer, room map, client room refs를 순서대로 기록합니다.
- observer notification, client assignment, matched messages, initial snapshot 중 각각 throw/failure가 가능한 지점을 찾습니다.
- 부분 실패 시 rollback이 위 자원을 어떤 역순/공통 helper로 복원하는지 확인합니다.
- persistence 성공 뒤 observer 또는 broadcast가 실패해도 finalization `finally`가 room을 제거하는지 확인합니다.
- rollback 자체의 failure handling과 original error 보존 여부를 기록합니다.

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
- 직전 Thread 관련 SHA: `a23fc26a7f82` — `refactor(game): queue와 reservation cleanup 일원화`
- 다음 Thread 관련 SHA: `112228db8878` — `test(game): matchmaking lifecycle 검증`

### 5.9. `test(game): matchmaking lifecycle 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `112228db8878` |
| Importance | A |
| Tags | REALTIME, RISK, TEST |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Protects matchability after failure, abandonment, forfeit, and rollback.
- Classification summary: Adds focused GameHub lifecycle tests for rating-window matching, reservation release after a finalized forfeit, cleanup of an abandoned empty room, and rollback when room construction fails partway through.

원문 구현 의도·상태 변화:

> Adds focused GameHub lifecycle tests for rating-window matching, reservation release after a finalized
> forfeit, cleanup of an abandoned empty room, and rollback when room construction fails partway through. The
> suite verifies that a player is reserved by at most one active match and becomes matchable again after every
> terminal or failed creation path, preventing stale in-memory reservations from permanently removing users
> from matchmaking.

#### 해당 SHA에서 확인할 실제 코드

- rating-window match, finalized forfeit release, abandoned empty room cleanup, partial room-construction rollback case를 분류합니다.
- 각 test에서 user가 at most one active reservation을 갖는 assertion을 확인합니다.
- terminal/failed creation 이후 동일 user가 다시 matchable해지는 follow-up action을 기록합니다.
- room creation failure를 어느 dependency/observer/send 지점에 주입하는지 확인합니다.
- domain Matchmaker unit evidence와 GameHub integration evidence의 범위를 구분합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | 사용자는 최대 한 match reservation만 소유하고 모든 terminal/failed creation path 뒤 다시 matchable해집니다. |
| 재현하는 failure/boundary | stale reservation, partial room leak, forfeit/abandonment cleanup omission, rollback omission. |
| test technique | GameHub focused lifecycle scenarios와 failure injection. |
| 통과하는 production path | Matchmaker enqueue/reserve → GameHub room publication/finalization/abandonment → shared release. |
| 증명하는 것 | domain reservation과 transport room lifecycle이 실패 후 수렴함을 검증합니다. |
| 증명하지 않는 것 | 대규모 경쟁 부하에서의 latency/fairness는 직접 증명하지 않습니다. |
| test 성격 | Deterministic lifecycle regression. |
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
- 직전 Thread 관련 SHA: `b5bfeee0e23e` — `refactor(game): room 생성과 finalization cleanup 보장`
- 이 Thread의 최종 상태와 비교해 이후 보완 여부를 기록합니다.

## 6. Invariant ledger

Source에서 확정된 invariant를 아래 시점별로 연결합니다. 새 invariant를 추측해 확정하지 않습니다.

| Invariant | 처음 도입/관찰한 SHA | 강화한 SHA | 부족함이 드러난 SHA | 복구한 fix | 고정한 regression test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| Queue and reservation membership have one owner and are released on every leave, disconnect, rollback, drain, abandonment, failure, and finalization path. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| The server is the sole authority for game rules, scores, phases, room membership, matchmaking, and persisted outcomes. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |

추가 기록:

- invariant가 동일한 문장으로 유지되었는지, 더 강한 조건으로 바뀌었는지 구분합니다.
- implementation detail과 invariant를 혼동하지 않습니다.
- source가 명시하지 않은 규칙은 “관찰한 가설”로 표시하고 코드 근거로만 남깁니다.

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| timer queue와 availability가 GameHub 내부에 중복 표현됨 | `1ec8335b0e75` contract → `a4f59a2e8192` queue → `7871e29278c2` reservation | `112228db8878` lifecycle regression | explicit Matchmaker state |
| async fallback/room creation 실패가 stale reservation을 남김 | `e53559ef3a11`/`51f36aa50596` integration → `b5bfeee0e23e` rollback | `112228db8878` failure injection | matchability restored |
| queue owner가 둘이라 cleanup path가 불일치 | `a23fc26a7f82` single ownership | `112228db8878` leave/forfeit/abandon/rollback | centralized release |

학습자 보완 기록:

- 실제 failure를 주입하거나 재현하는 test fixture를 찾아 위 표의 각 행과 연결합니다.
- fix가 symptom만 가리는지, ownership/invariant를 바꾸는지 코드 근거로 판별합니다.
- broad integration과 deterministic regression을 별도 표시합니다.

## 8. Ownership / state / responsibility 변화

| 축 | 초기 SHA의 owner/state | 중간 전환 | Thread 최종 owner/state | 해제·cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| queue membership | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| matched reservation | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| fallback deadline and timer metadata | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| socket/client lookup | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| room publication rollback | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |

## 9. Thread 최종 상태

다음 항목은 최종 HEAD를 보고 채우지 말고, 이 Thread의 마지막 commit까지 순서대로 복원한 결과로 작성합니다.

- 최종 authoritative owner: [학습자 작성]
- 최종 상태/invariant: [학습자 작성]
- 남아 있는 의도적 제한 또는 비보장: [학습자 작성]
- 후속 Thread가 의존하는 contract: [학습자 작성]
- 대표 코드 근거: [SHA, 파일, symbol]

## 10. 최종 architecture 또는 execution flow 정리

- user join부터 PvP 또는 AI room 생성까지 상태·ownership 흐름을 작성합니다.
- 모든 acquire operation에 대응하는 release operation을 ledger로 정리합니다.
- partially created room이 외부에 남지 않는 rollback 순서를 설명합니다.

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
