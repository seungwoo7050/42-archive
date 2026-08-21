# 매치메이킹 예약 소유권과 롤백

원문 Development Thread: `Matchmaking reservation ownership and rollback`

## 1. Thread 목표

- GameHub 내부 timer-backed queue에서 독립 `Matchmaker` state machine으로 queue/reservation ownership이 이동하는 과정을 추적합니다.
- closest-rating pairing, guest/registered pool 분리, six-second AI fallback, duplicate membership, leave/release 의미를 복원합니다.
- room 생성 중 부분 실패와 모든 terminal path가 reservation을 누락 없이 해제하는 rollback/cleanup 구조를 확인합니다.

### Source에서 확정된 significance

> The initial timer-backed queue works but leaves GameHub with multiple representations of availability. The later Matchmaker abstraction makes reservation state explicit; integration and cleanup commits then eliminate split ownership. The progression matters because stale reservations would permanently remove users or allow one user to occupy two matches.

### 직접 연결되는 Critical Invariants

> Queue and reservation membership have one owner and are released on every leave, disconnect, rollback, drain, abandonment, failure, and finalization path.

> The server is the sole authority for game rules, scores, phases, room membership, matchmaking, and persisted outcomes.

### 직접 연결되는 Major Engineering Difficulties

> Coordinating readiness, pause, disconnect, reconnect, replacement, forfeit, retry, and final cleanup across interacting state machines.

> Preserving domain correctness during database failure, tournament-start rollback, match-finalization retry, process drain, and deployment shutdown.

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

> 검토 방식: 지정 브랜치에 속한 exact SHA의 diff와 해당 시점 파일을 GitHub에서 확인했습니다. 로컬 실행 환경은 GitHub clone이 차단되어 테스트 명령은 실행하지 않았으며, 아래 테스트 결과 설명은 test implementation 검토에 한정합니다.

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
| 학습 깊이 | Thread 흐름에서 맡는 구현 역할과 필요한 상태 변화를 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Introduces timed AI fallback with explicit timer cleanup.
- Classification summary: Add a bounded waiting policy for the human matchmaking queue.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | human queue가 상대를 못 찾으면 무기한 대기하며 queue entry에 fallback lifecycle이 없었습니다. |
| 핵심 boundary/decision | GameHub `QueueEntry`가 6초 `npcFallbackTimer`를 소유하고 timeout 시 entry가 여전히 queue에 있고 socket open/room 없음이면 rating이 가장 가까운 active NPC로 room을 만듭니다. |
| 상태 또는 ownership 변화 | fallback timer는 queue entry가 소유하고 normal match, leave, disconnect, prune가 clear합니다. room은 socket이 없는 `npcUser` identity를 별도로 보관합니다. |
| 주요 failure/edge path | timeout callback은 current membership/socket/room을 재검증해 이미 matched user에게 두 번째 room을 만들지 않습니다. |
| 보장/비보장 | human wait가 6초로 bounded되고 stale timer cleanup이 있습니다. queue/reservation domain owner는 여전히 GameHub 배열과 timer에 분산돼 있습니다. |
| 다음 관련 commit 연결 | `1ec833...`이 socket과 독립된 Matchmaker player/outcome contract를 정의합니다. |

비교 기준:
- 이 commit의 parent에서 동일 책임을 담당하던 코드를 비교했습니다.
- 다음 Thread 관련 SHA: `1ec8335b0e75` — `refactor(game): matchmaking player와 fallback 계약 정의`

### 5.2. `refactor(game): matchmaking player와 fallback 계약 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `1ec8335b0e75` |
| Importance | A |
| Tags | REALTIME, REFACTOR |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Defines queued, matched, duplicate, fallback, and release outcomes independently of sockets.
- Classification summary: Define Matchmaker types and state transitions without binding them to WebSocket clients.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | queue state가 GameHub entry/timer와 boolean 조건으로만 표현돼 duplicate, matched reservation, fallback deadline, release 의미가 명시적이지 않았습니다. |
| 핵심 boundary/decision | `MatchmakingKind`, `MatchmakingPlayer`, pair, join outcomes(`queued|matched|duplicate`), fallback outcomes(`waiting|ready|unavailable`), status와 injected clock/rating window options를 정의합니다. |
| 상태 또는 ownership 변화 | Matchmaker가 domain status vocabulary를 소유할 준비를 하고 GameHub/socket은 transport metadata로 분리될 수 있습니다. |
| 주요 failure/edge path | 6,000ms fallback constant와 option validation을 명시합니다. 아직 complete queue algorithm/integration은 뒤 commits 범위입니다. |
| 보장/비보장 | 상태 전이를 typed outcome으로 설명할 수 있습니다. 실제 closest pairing, leave/release semantics, single ownership은 아직 없습니다. |
| 다음 관련 commit 연결 | `a4f59a...`가 compatible pool 내 deterministic closest-rating pairing을 구현합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `1122e6a4b901` — `feat(game): 대기 플레이어 NPC fallback 구성`
- 다음 Thread 관련 SHA: `a4f59a2e8192` — `refactor(game): rating 기반 closest-pair queue 구현`

### 5.3. `refactor(game): rating 기반 closest-pair queue 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `a4f59a2e8192` |
| Importance | A |
| Tags | REALTIME, REFACTOR |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Implements deterministic compatible-pool, closest-rating pairing.
- Classification summary: Implement Matchmaker queue membership and deterministic closest-candidate selection.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | typed contract는 있으나 실제 queue와 candidate selection을 Matchmaker가 소유하지 않았습니다. |
| 핵심 boundary/decision | Matchmaker가 queue와 `playerStatuses`를 보유하고 같은 kind, rating difference ≤ configured max 중 absolute difference가 가장 작은 기존 candidate를 선택합니다. `< closestDifference` 조건으로 동률이면 먼저 들어온 candidate가 유지됩니다. |
| 상태 또는 ownership 변화 | queue membership과 queued/matched status가 Matchmaker 내부 map/list로 이동합니다. injected clock이 joined/fallback timing을 결정합니다. |
| 주요 failure/edge path | duplicate join은 status를 변경하지 않고 duplicate outcome을 반환합니다. 반환 player/pair는 defensive copy로 외부 mutation을 막습니다. |
| 보장/비보장 | same pool에서 deterministic closest pairing과 duplicate membership 차단을 제공합니다. AI fallback claim과 reservation release 차이는 다음 commit입니다. |
| 다음 관련 commit 연결 | `7871e2...`가 queued cancellation과 matched reservation release를 분리합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `1ec8335b0e75` — `refactor(game): matchmaking player와 fallback 계약 정의`
- 다음 Thread 관련 SHA: `7871e29278c2` — `refactor(game): AI fallback과 reservation lifecycle 구현`

### 5.4. `refactor(game): AI fallback과 reservation lifecycle 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `7871e29278c2` |
| Importance | A |
| Tags | REALTIME, REFACTOR |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Separates queue cancellation from releasing an assigned match reservation.
- Classification summary: Implement fallback claiming and distinct leave/release transitions for queued and matched players.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | matched pair와 queued player를 같은 remove operation으로 다루면 assigned reservation을 잘못 해제하거나 queued status를 남길 수 있었습니다. |
| 핵심 boundary/decision | fallback claim은 queued player/deadline에서만 `waiting|ready|unavailable`을 반환하고 ready 시 queue에서 제거해 matched로 표시합니다. `leaveQueue`는 queued만 제거하고 `release`는 queued/matched status 모두 정리합니다. |
| 상태 또는 ownership 변화 | Matchmaker가 queued→matched reservation lifecycle과 deadline을 authoritative하게 소유합니다. |
| 주요 failure/edge path | deadline 전 claim은 remaining time과 waiting을 반환하며 이미 matched/unknown이면 unavailable입니다. 잘못된 `leaveQueue`가 matched reservation을 조용히 없애지 않습니다. |
| 보장/비보장 | queue cancellation과 assigned match cleanup의 의미가 분리됩니다. GameHub가 이 API를 모든 path에서 사용하는지는 integration commits가 필요합니다. |
| 다음 관련 commit 연결 | `e53559...`가 PvP join/selection을 Matchmaker 뒤로 옮기지만 duplicate GameHub queue 표현은 잠시 남습니다. |

비교 기준:
- 직전 Thread 관련 SHA: `a4f59a2e8192` — `refactor(game): rating 기반 closest-pair queue 구현`
- 다음 Thread 관련 SHA: `e53559ef3a11` — `refactor(game): Matchmaker queue reservation을 GameHub에 연결`

### 5.5. `refactor(game): Matchmaker queue reservation을 GameHub에 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `e53559ef3a11` |
| Importance | A |
| Tags | REALTIME, REFACTOR |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Moves duplicate-user reservation and PvP selection behind Matchmaker.
- Classification summary: Integrate Matchmaker join outcomes with GameHub transport clients and room creation.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | GameHub 배열이 membership/selection을 직접 결정해 Matchmaker state와 production behavior가 연결되지 않았습니다. |
| 핵심 boundary/decision | GameHub가 registered/guest kind와 rating을 `Matchmaker.join`에 넘기고 duplicate/queued/matched outcome에 따라 error, queue metadata, room creation을 수행합니다. rating window는 200입니다. |
| 상태 또는 ownership 변화 | domain status는 Matchmaker로 이동하지만 이 SHA에는 기존 queue/queueEntries 표현이 함께 남아 split ownership이 완전히 제거되지 않았습니다. |
| 주요 failure/edge path | matched opponent transport가 없거나 createRoom이 throw하면 두 player를 `release`합니다. 그렇지 않으면 stale reservation이 남습니다. |
| 보장/비보장 | PvP selection과 duplicate reservation은 Matchmaker outcome에 종속됩니다. AI fallback과 all-path cleanup은 아직 통합 중입니다. |
| 다음 관련 commit 연결 | `51f36a...`가 fallback timer callback도 Matchmaker claim과 asynchronous revalidation을 사용하게 합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `7871e29278c2` — `refactor(game): AI fallback과 reservation lifecycle 구현`
- 다음 Thread 관련 SHA: `51f36aa50596` — `refactor(game): Matchmaker AI fallback를 GameHub에 연결`

### 5.6. `refactor(game): Matchmaker AI fallback를 GameHub에 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `51f36aa50596` |
| Importance | A |
| Tags | REALTIME, OPERATIONS, RISK |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Claims delayed fallback through the same state machine and revalidates asynchronous work.
- Classification summary: Route AI fallback deadlines and claims through Matchmaker while guarding async NPC lookup races.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | PvP는 Matchmaker를 사용하지만 fallback timer가 GameHub local queue state만 보면 두 ownership model이 충돌합니다. |
| 핵심 boundary/decision | timer는 Matchmaker fallback deadline에 맞춰 arm하고 callback에서 current entry/socket/room을 확인한 뒤 `claimFallback`을 호출합니다. `waiting`이면 reschedule, `unavailable`이면 metadata cleanup, `ready`이면 NPC lookup 후 조건을 다시 검사합니다. |
| 상태 또는 ownership 변화 | fallback status/deadline은 Matchmaker, timer/client reference는 GameHub `queueEntries`가 소유합니다. |
| 주요 failure/edge path | async NPC lookup 동안 drain, disconnect, room 생성, entry replacement가 발생할 수 있어 lookup 전후 acceptingMatches/socket/room/entry를 재검증하고 모든 실패에서 release합니다. |
| 보장/비보장 | AI fallback도 동일 reservation state machine을 통과합니다. duplicate queue representation과 cleanup scatter는 `a23fc2...`에서 제거됩니다. |
| 다음 관련 commit 연결 | `a23fc2...`가 GameHub queue array를 없애고 release path를 중앙화해 single owner invariant를 완성합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `e53559ef3a11` — `refactor(game): Matchmaker queue reservation을 GameHub에 연결`
- 다음 Thread 관련 SHA: `a23fc26a7f82` — `refactor(game): queue와 reservation cleanup 일원화`

### 5.7. `refactor(game): queue와 reservation cleanup 일원화`

| 항목 | 값 |
| --- | --- |
| SHA | `a23fc26a7f82` |
| Importance | S |
| Tags | REALTIME, ARCH, RISK |
| 학습 깊이 | Architecture/invariant 중심으로 직전 상태, 결정, 핵심 전이, ownership, failure, 후속 검증까지 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Removes duplicate queue ownership and centralizes every release path.
- Classification summary: Make Matchmaker the sole domain owner and reduce GameHub state to transport/timer metadata.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | Matchmaker status와 GameHub queue array/entry map이 동시에 user availability를 표현해 한쪽 cleanup 누락이 stale reservation 또는 duplicate match를 만들 수 있었습니다. |
| 핵심 boundary/decision | legacy queue array/findClosest를 삭제하고 Matchmaker를 sole domain owner로 둡니다. GameHub `queueEntries`는 client와 fallback timer를 찾는 transport metadata만 보관하며 shared cleanup helper가 leave/prune/drain/close/abandon/failure/finalization에서 `release`를 호출합니다. |
| 상태 또는 ownership 변화 | queued/matched membership은 Matchmaker 한 곳, timer/socket reference는 GameHub 한 곳으로 분리됩니다. release는 idempotent domain cleanup primitive입니다. |
| 주요 failure/edge path | normal match, AI fallback, disconnect, drain, room abandonment, finalization failure, hub close 중 하나라도 release를 빠뜨리면 user가 영구 matched로 남습니다. 공통 helper로 모든 terminal path를 수렴시킵니다. |
| 보장/비보장 | availability의 competing representation이 없고 every known terminal path가 reservation을 해제합니다. room publication 중 partial resource rollback은 다음 commit에서 강화됩니다. |
| 다음 관련 commit 연결 | `b5bfee...`가 createRoom publish failure와 finalization observer/broadcast failure에서도 acquired resource를 rollback/finally cleanup합니다. |

#### Architecture / invariant 복원

| 축 | 복원 결과 |
| --- | --- |
| 문제 | domain queue와 transport queue가 동일 사실을 각각 보유해 cleanup 원자성이 깨집니다. |
| 실패 위험 | user가 영구 queue 밖/예약 상태에 남거나 두 match에 동시에 배정됩니다. |
| 핵심 결정 | Matchmaker를 sole status owner로 하고 GameHub에는 transport/timer metadata만 남깁니다. |
| 구현 경로 | join/claim/leave/release는 Matchmaker; GameHub path는 metadata helper를 거쳐 timer clear + release. |
| 수명주기·상태 | queued → matched/reserved → room active → release; fallback timer는 queued metadata lifetime에만 존재합니다. |
| 실패 처리 | leave, socket prune, drain, async lookup failure, create failure, abandon, finalization/remove 모두 shared cleanup에 수렴합니다. |
| 후속 검증 | `112228...` forfeit/abandon/observer throw 뒤 같은 users가 즉시 다시 match되는 regression. |
| Thread 전체 의미 | matchability가 여러 array의 우연한 동기화가 아니라 단일 state machine invariant가 됩니다. |

비교 기준:
- 직전 Thread 관련 SHA: `51f36aa50596` — `refactor(game): Matchmaker AI fallback를 GameHub에 연결`
- 다음 Thread 관련 SHA: `b5bfeee0e23e` — `refactor(game): room 생성과 finalization cleanup 보장`

### 5.8. `refactor(game): room 생성과 finalization cleanup 보장`

| 항목 | 값 |
| --- | --- |
| SHA | `b5bfeee0e23e` |
| Importance | A |
| Tags | REALTIME, OBSERVABILITY, RISK |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Rolls back partially published rooms and guarantees terminal removal.
- Classification summary: Treat room publication as an acquisition sequence with explicit rollback and terminal cleanup in `finally`.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | reservation을 release해도 createRoom 중 room map/client roomId/scheduler/timer/observer 일부가 publish된 뒤 throw하면 ghost room과 stale ownership이 남을 수 있었습니다. |
| 핵심 boundary/decision | createRoom publication을 `try/catch`로 감싸 scheduler/reconnect timer/rooms/client roomIds 등 이미 획득한 자원을 역순 rollback하고 original error를 재throw합니다. finalization observer/broadcast는 `try/finally`로 room removal을 보장합니다. |
| 상태 또는 ownership 변화 | createRoom call이 publication transaction의 in-memory owner이며 success 전 자원은 provisional입니다. terminal cleanup은 `finally`가 소유합니다. |
| 주요 failure/edge path | observer/send/snapshot setup가 throw해도 active room과 reservation이 남지 않습니다. cleanup error로 original failure를 덮지 않도록 원래 exception을 보존합니다. |
| 보장/비보장 | partial room publication이 외부 state에 남지 않고 terminal observer failure도 room removal을 막지 않습니다. DB transaction 자체는 Thread 04 invariant를 사용합니다. |
| 다음 관련 commit 연결 | `112228...`가 observer throw failure injection 뒤 activeRooms/queuedPlayers=0과 immediate rematch를 검증합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `a23fc26a7f82` — `refactor(game): queue와 reservation cleanup 일원화`
- 다음 Thread 관련 SHA: `112228db8878` — `test(game): matchmaking lifecycle 검증`

### 5.9. `test(game): matchmaking lifecycle 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `112228db8878` |
| Importance | A |
| Tags | REALTIME, RISK, TEST |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Protects matchability after failure, abandonment, forfeit, and rollback.
- Classification summary: Add deterministic GameHub/Matchmaker lifecycle regressions including injected room-publication failure.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | single-owner와 rollback code는 있지만 모든 terminal path 후 user가 실제로 다시 matchable한지를 상태와 behavior 모두로 검증하지 않았습니다. |
| 핵심 boundary/decision | fake timers/GameHub fixtures가 rating window, forfeit release/rematch, empty-room abandonment/rematch를 검사하고 observer가 room creation에서 한 번 throw하도록 deterministic failure injection합니다. |
| 상태 또는 ownership 변화 | observer throw가 publication sequence의 지정 지점에서 실패를 주입하고 stats가 `activeRooms:0`, `queuedPlayers:0`을 관찰합니다. |
| 주요 failure/edge path | 첫 create가 실패한 뒤 같은 두 user를 다시 join시켜 즉시 match되는지 확인해 단순 map size뿐 아니라 reservation 재획득 가능성을 증명합니다. |
| 보장/비보장 | 검사한 in-process failure/terminal paths가 stale reservation과 ghost room을 남기지 않습니다. 장기 fairness, multi-instance queue, production load는 증명하지 않습니다. |
| 다음 관련 commit 연결 | Thread 최종 상태는 Matchmaker sole ownership과 all-path release/room rollback입니다. |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | queued/reserved/active room ownership은 중복되지 않고 terminal/rollback 뒤 모두 재획득 가능합니다. |
| 재현하는 failure/boundary | rating window, forfeit, empty abandonment, room-created observer throw after partial publication. |
| test technique | Fake timers, GameHub state inspection, deterministic observer failure injection, behavioral rematch assertion. |
| 통과하는 production path | Matchmaker.join/release → GameHub createRoom/rollback → terminal cleanup → same users rejoin. |
| 증명하는 것 | 검사한 path에서 activeRooms/queuedPlayers가 0으로 수렴하고 stale reservation이 남지 않습니다. |
| 증명하지 않는 것 | global fairness, starvation, distributed queue coordination, sustained fault load는 증명하지 않습니다. |
| test 성격 | Deterministic lifecycle, rollback, and failure-injection regression. |
| 후속 회귀 방지 설명 | release 누락, provisional room leak, original error masking, rematch 불가 상태가 생기면 실패해야 합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `b5bfeee0e23e` — `refactor(game): room 생성과 finalization cleanup 보장`
- 이 Thread의 마지막 상태와 비교해 최종 보장을 정리했습니다.

## 6. Invariant ledger

Source에서 확정된 invariant를 commit 시점별로 연결했습니다. `해당 없음`은 해당 Thread 안에서 별도 fix/test가 없음을 뜻합니다.

| Invariant | 처음 도입/관찰한 SHA | 강화한 SHA | 부족함이 드러난 SHA | 복구한 fix | 고정한 regression test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| Queue and reservation membership have one owner and are released on every leave, disconnect, rollback, drain, abandonment, failure, and finalization path. | `1ec8335b0e75` explicit statuses | `a4f59a2e8192` queue owner → `7871e29278c2` release semantics → `a23fc26a7f82` sole ownership → `b5bfeee0e23e` rollback | `e53559ef3a11`~`51f36aa50596` 동안 GameHub duplicate representation | `a23fc26a7f82`, `b5bfeee0e23e` | `112228db8878` | `Matchmaker`, GameHub queueEntries/cleanup/createRoom |
| The server is the sole authority for game rules, scores, phases, room membership, matchmaking, and persisted outcomes. | `1122e6a4b901` server fallback | `a4f59a2e8192` deterministic selection, `a23fc26a7f82` sole owner | 해당 없음 | 해당 없음 | `112228db8878` | server-side Matchmaker outcomes |

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| timer-backed GameHub queue가 availability를 직접 소유 | Matchmaker contract/algorithm/fallback integration | unit/GameHub lifecycle tests | socket-independent explicit statuses |
| Matchmaker와 GameHub가 queue를 중복 표현 | `a23fc2...` legacy queue 삭제 + centralized release | forfeit/abandon/rematch tests | single domain owner |
| room publication 중 throw가 partial resources를 남김 | `b5bfee...` reverse rollback/finally removal | `112228...` observer throw injection | ghost room·stale reservation 없음 |

## 8. Ownership / state / responsibility 변화

| 축 | 초기 SHA의 owner/state | 중간 전환 | Thread 최종 owner/state | 해제·cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| queued/matched status | GameHub queue array | `a4f59...` Matchmaker + temporary duplicate | Matchmaker | leave/release/close/drain/final paths | `matchmaker.ts`, `a23fc...` |
| transport/timer metadata | QueueEntry | `51f36...` deadline integration | GameHub `queueEntries` | metadata cleanup helper | `gameHub.ts` |
| fallback deadline/claim | entry timer | `7871e...` Matchmaker claim | Matchmaker status + GameHub timer | claim/leave/release | fallback methods |
| provisional room resources | ad-hoc create | `b5bfee...` publication transaction | GameHub createRoom scope | catch rollback/finally remove | createRoom/finalization |

## 9. Thread 최종 상태

- 최종 authoritative owner: Matchmaker가 queue/reservation domain state를 유일하게 소유하고 GameHub는 socket/timer metadata와 room publication을 소유합니다.
- 최종 상태/invariant: user는 queued·reserved·active room 중 하나에만 있고 모든 leave/disconnect/drain/rollback/abandon/failure/finalization path가 release합니다.
- 남아 있는 의도적 제한 또는 비보장: single-process in-memory queue이며 distributed matchmaking, persistence, fairness/starvation guarantee는 없습니다.
- 후속 Thread가 의존하는 contract: GameHub는 Matchmaker outcome만으로 room을 만들고 async 작업 후 상태를 재검증하며 publication 실패 시 획득 자원을 역순으로 되돌립니다.
- 대표 코드 근거: `a4f59a2e8192`/`7871e29278c2 Matchmaker`, `a23fc26a7f82` centralized cleanup, `b5bfeee0e23e` rollback, `112228db8878` failure injection tests

## 10. 최종 architecture 또는 execution flow 정리

```text
[queue.join user/kind/rating]
    ↓ Matchmaker.join
[duplicate | queued(deadline) | matched(pair)]
    ├─ queued → GameHub timer metadata → claimFallback → async NPC revalidation
    └─ matched → provisional createRoom
            ├─ success → active room; reservation released at terminal ownership transfer
            └─ throw → scheduler/timer/map/client rollback + Matchmaker.release
[leave/disconnect/drain/abandon/finalize/close]
    ↓ shared cleanup
[timer clear + metadata delete + idempotent Matchmaker.release]
```

- `leaveQueue`는 queued cancellation만, `release`는 queued/matched reservation 전체 정리입니다.
- failure test는 map size와 함께 같은 users의 즉시 rematch를 확인합니다.

## 11. 학습 완료 자가 점검

- [x] Commit map의 모든 SHA를 원문 순서대로 확인했습니다.
- [x] 각 commit의 subject, importance, tags를 변경하지 않았습니다.
- [x] S/A/B 깊이를 구분해 코드 근거를 남겼습니다.
- [x] final HEAD의 구현을 과거 SHA에 소급하지 않았습니다.
- [x] 핵심 상태 필드, caller/callee, ownership, failure branch, cleanup을 실제 코드로 확인했습니다.
- [x] Fix를 기존 가정 → failure/risk → root cause → decision → code → regression 순서로 연결했습니다.
- [x] Test commit에서 production invariant, failure, technique, path, 증명/비증명 범위를 구분했습니다.
- [x] Thread 최종 execution flow를 별도 프로젝트 재학습 없이 설명할 수 있습니다.
