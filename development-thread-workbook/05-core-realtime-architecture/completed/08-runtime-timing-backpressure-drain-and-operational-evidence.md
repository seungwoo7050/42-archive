# 런타임 타이밍·백프레셔·드레인·운영 증거

원문 Development Thread: `Runtime timing, backpressure, drain, and operational evidence`

## 1. Thread 목표

- simulation catch-up, socket liveness, input burst, snapshot backlog, timer topology, shutdown work를 각각 명시적으로 제한하는 runtime 경계를 추적합니다.
- per-room timing이 shared scheduler로 이동하며 runnable room membership이 lifecycle 상태와 일치하는지 확인합니다.
- drain/readiness/signal shutdown과 database/edge fault harness가 같은 운영 invariant를 어떻게 검증하는지 복원합니다.

### Source에서 확정된 significance

> The completed runtime bounds every major source of unbounded work: elapsed catch-up, dead sockets, input bursts, snapshot backlog, timer multiplicity, and shutdown. Observability and fault tooling then measure the same boundaries under process and network degradation rather than relying only on unit behavior.

### 직접 연결되는 Critical Invariants

> Timers, schedulers, heartbeat handles, retry work, snapshot buffers, and database resources have explicit single-owner cleanup.

> Draining rejects new work immediately, allows owned rooms to finish within a bounded budget, and remains aligned with the container termination grace period.

> Every accepted wire message conforms to the supported versioned runtime schema; snapshot and input ordering cannot move state backward.

### 직접 연결되는 Major Engineering Difficulties

> Handling slow or stale transports through sequence gates, token buckets, latest-value snapshot delivery, measurable congestion, and hard termination limits.

> Preserving domain correctness during database failure, tournament-start rollback, match-finalization retry, process drain, and deployment shutdown.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- wall-clock 지연이 fixed 50 ms step으로 변환될 때 remainder, five-tick cap, 250 ms ceiling은 어떻게 적용됩니까?
- heartbeat의 ping interval과 authoritative deadline은 어떤 timer ownership과 idempotent cleanup을 사용합니까?
- input sequence와 per-user token bucket은 어떤 순서로 검사되며 왜 stale input이 budget을 쓰지 않습니까?
- latest snapshot buffer는 obsolete frame replacement와 measurable congestion을 어떻게 구분합니까?
- shared scheduler registry는 room register/unregister 중 iteration mutation을 어떻게 격리합니까?
- draining 시작 직후 readiness, waiting clients, active rooms, final close 상태는 어떻게 바뀝니까?
- fault harness가 database path와 edge path를 분리해 어떤 evidence를 수집합니까?

## 3. 완료 기준

- 각 runtime limiter의 key, threshold, timer, cleanup owner를 표로 완성할 수 있습니다.
- room이 simulation 가능한 동안에만 shared scheduler에 등록된다는 lifecycle invariant를 설명할 수 있습니다.
- snapshot delivery가 lossy 최신 상태 전송이고 control event는 다른 경계를 갖는 이유를 설명할 수 있습니다.
- 첫 signal부터 60초 drain, Fastify close, repository release까지 단일 teardown sequence를 그릴 수 있습니다.
- load/fault test가 unit test와 달리 어떤 실제 service-level 경로와 실패를 증명하는지 구분할 수 있습니다.

> 검토 방식: 지정 브랜치에 속한 exact SHA의 diff와 해당 시점 파일을 GitHub에서 확인했습니다. 로컬 실행 환경은 GitHub clone이 차단되어 테스트 명령은 실행하지 않았으며, 아래 테스트 결과 설명은 test implementation 검토에 한정합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `3a2943ff385d` | `feat(game): fixed-step scheduler 추가` | A | SIMULATION, REALTIME, OBSERVABILITY | Separates monotonic elapsed time from bounded 50 ms simulation work. |
| 2 | `10a656e59864` | `feat(game): WebSocket heartbeat 추가` | A | REALTIME, RISK | Adds deterministic liveness ownership and timeout cleanup. |
| 3 | `207df3f47935` | `feat(game): 입력 순서와 rate limit 보호` | A | SIMULATION, REALTIME, RISK | Combines monotonic input admission with per-user token-bucket limits. |
| 4 | `8589ff3c4821` | `feat(game): latest snapshot buffer 추가` | A | SIMULATION, REALTIME, OPERATIONS | Defines latest-value delivery and congestion termination rules. |
| 5 | `d21a47ee92d2` | `refactor(game): shared room scheduler 추가` | A | SIMULATION, REALTIME, REFACTOR | Creates one fixed-step clock for all registered rooms. |
| 6 | `fb5b1abc97f5` | `refactor(game): GameHub가 shared room scheduler 사용` | A | SIMULATION, REALTIME, REFACTOR | Makes runnable-room membership the hub’s single timing topology. |
| 7 | `44ef3e07e1a5` | `feat(game): 새 작업 차단과 active room drain 추가` | A | PROTOCOL, REALTIME, TOURNAMENT | Rejects new work while waiting for owned rooms to finish. |
| 8 | `1c9981393973` | `feat(ops): graceful shutdown 절차 추가` | A | REALTIME, PERSISTENCE, OPERATIONS | Makes signals enter one bounded drain-and-close sequence. |
| 9 | `7b0b5f086b41` | `test(load): 실시간 fault injection 도구 추가` | A | AUTH, REALTIME, PERSISTENCE | Provides separate database and edge degradation paths for service-level evidence. |

## 5. Commit별 학습 기록

### 5.1. `feat(game): fixed-step scheduler 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `3a2943ff385d` |
| Importance | A |
| Tags | SIMULATION, REALTIME, OBSERVABILITY |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Separates monotonic elapsed time from bounded 50 ms simulation work.
- Classification summary: Introduce a fixed-step accumulator that separates elapsed wall-clock time from simulation updates.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | parent에는 elapsed wall-clock 지연을 simulation step 수로 바꾸면서 catch-up 양을 제한하는 독립 accumulator/scheduler가 없습니다. |
| 핵심 boundary/decision | `apps/api/src/game/fixedStepScheduler.ts`의 `FixedStepAccumulator.advance`가 `elapsed=max(0, now-previous)`를 250 ms까지 누적하고, 50 ms 단위 whole ticks 중 한 loop 최대 5개만 반환합니다. `FixedStepScheduler`는 injectable monotonic clock과 interval을 소유합니다. |
| 상태 또는 ownership 변화 | accumulator가 `previousTimeMs`와 remainder `lagMs`를, scheduler가 interval handle과 현재 accumulator를 단독 소유합니다. `start`/`stop`은 중복 호출에 안전합니다. |
| 주요 failure/edge path | non-finite time은 0 tick, backward clock은 elapsed 0으로 처리하고 previous time을 뒤로 옮기지 않습니다. invalid timestep/cap/ceiling은 constructor에서 거부합니다. callback이 scheduler를 stop하면 loop 조건의 `this.timer`가 같은 batch의 남은 tick을 중단합니다. |
| 보장/비보장 | event-loop stall 뒤에도 한 loop work는 5 ticks, backlog는 250 ms로 제한되고 remainder는 유지됩니다. 아직 room lifecycle이나 GameHub timing owner가 이 abstraction을 사용한다는 보장은 없습니다. |
| 다음 관련 commit 연결 | `10a656...`가 socket liveness timer ownership을 별도 abstraction으로 추가합니다. |

비교 기준:
- 이 commit의 parent에서 동일 책임을 담당하던 코드를 비교했습니다.
- 다음 Thread 관련 SHA: `10a656e59864` — `feat(game): WebSocket heartbeat 추가`

### 5.2. `feat(game): WebSocket heartbeat 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `10a656e59864` |
| Importance | A |
| Tags | REALTIME, RISK |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Adds deterministic liveness ownership and timeout cleanup.
- Classification summary: Introduce an explicit heartbeat lifecycle for realtime connections.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | socket close event만 기다리면 peer가 사라졌지만 transport가 즉시 닫히지 않는 경우 connection·room resource가 남을 수 있습니다. |
| 핵심 boundary/decision | `apps/api/src/game/heartbeat.ts::ConnectionHeartbeat`는 start 시 45초 timeout을 먼저 arm하고 15초마다 transport ping을 보냅니다. `acknowledge`는 기존 deadline timer를 clear한 뒤 새 45초 deadline으로 교체합니다. |
| 상태 또는 ownership 변화 | heartbeat instance 하나가 `pingTimer`와 `timeoutTimer`를 모두 소유합니다. socket owner는 pong에서 `acknowledge`, close에서 `stop`을 호출하고 heartbeat는 stale/throw에서 target termination을 호출합니다. |
| 주요 failure/edge path | ping synchronous exception과 deadline expiry는 모두 `terminate`로 수렴하며, `terminate`가 먼저 `stop`해 두 handle을 null로 만든 뒤 socket을 종료합니다. start/ack/stop 재호출은 새 competing timer를 만들지 않습니다. |
| 보장/비보장 | 응답 없는 connection은 최대 45초 liveness budget 안에서 정리되고 close race 뒤 timer가 남지 않습니다. 실제 GameHub socket에 연결되는 통합은 이 abstraction만으로 증명하지 않습니다. |
| 다음 관련 commit 연결 | `207df3...`가 stale ordering과 per-user token budget을 하나의 input admission 결과로 만듭니다. |

비교 기준:
- 직전 Thread 관련 SHA: `3a2943ff385d` — `feat(game): fixed-step scheduler 추가`
- 다음 Thread 관련 SHA: `207df3f47935` — `feat(game): 입력 순서와 rate limit 보호`

### 5.3. `feat(game): 입력 순서와 rate limit 보호`

| 항목 | 값 |
| --- | --- |
| SHA | `207df3f47935` |
| Importance | A |
| Tags | SIMULATION, REALTIME, RISK |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Combines monotonic input admission with per-user token-bucket limits.
- Classification summary: Introduce an input gate that combines sequence ordering with per-user token-bucket throttling.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | input sequence만 검사하면 순서는 보호해도 한 사용자가 유효한 새 sequence를 무제한 보내 server work를 만들 수 있고, room별 bucket이면 room 수로 budget을 늘릴 수 있습니다. |
| 핵심 boundary/decision | `apps/api/src/game/inputGate.ts::InputGate.check`는 sequence key를 `userId\u0000roomId`, bucket key를 `userId`로 둡니다. stale/duplicate를 먼저 반환한 뒤 default burst 8, refill 30/s token을 검사하고 accepted일 때만 token과 last sequence를 갱신합니다. |
| 상태 또는 ownership 변화 | InputGate가 모든 user bucket과 user-room last sequence를 소유하며 caller는 `accepted | stale | rate_limited` 결과만 해석합니다. `releaseUser`가 bucket과 해당 user의 모든 room sequence를 제거합니다. |
| 주요 failure/edge path | `inputSeq <= previous`는 bucket refill/charge 전에 탈락하므로 stale replay가 정상 사용자의 rate budget을 소모하지 않습니다. backward/non-advancing clock은 refill하지 않고 constructor는 nonpositive rate/capacity를 거부합니다. |
| 보장/비보장 | 여러 room/connection을 열어도 user 전체 throughput은 같은 bucket에 묶이고 room별 ordering은 독립적으로 단조 증가합니다. transport가 outcome을 어떻게 노출하는지는 caller 통합 범위입니다. |
| 다음 관련 commit 연결 | `8589ff...`가 outbound snapshot backlog를 latest-value 하나와 congestion deadline으로 제한합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `10a656e59864` — `feat(game): WebSocket heartbeat 추가`
- 다음 Thread 관련 SHA: `8589ff3c4821` — `feat(game): latest snapshot buffer 추가`

### 5.4. `feat(game): latest snapshot buffer 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `8589ff3c4821` |
| Importance | A |
| Tags | SIMULATION, REALTIME, OPERATIONS |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Defines latest-value delivery and congestion termination rules.
- Classification summary: Introduce a latest-value outbound buffer for game snapshots.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 각 simulation snapshot을 그대로 queue하면 느린 client가 obsolete frames와 application memory를 무제한 누적시킬 수 있습니다. |
| 핵심 boundary/decision | `apps/api/src/game/latestSnapshotBuffer.ts::LatestSnapshotBuffer`는 send in-flight 하나와 `pendingSnapshot` 하나만 유지하며 새 enqueue가 pending old snapshot을 교체합니다. `bufferedAmount` 256 KiB 초과는 50 ms retry, 5초 지속은 terminate, 1 MiB 이상은 즉시 terminate합니다. |
| 상태 또는 ownership 변화 | connection별 buffer가 pending payload, in-flight flag, congestion start, retry timer, closed state를 단독 소유합니다. `close`가 pending과 timer를 제거합니다. |
| 주요 failure/edge path | closed socket, hard threshold, soft congestion timeout, async send error, synchronous send throw가 모두 idempotent `terminate`/`close`로 수렴합니다. retry timer는 하나만 arm되고 종료 뒤 재실행하지 않습니다. |
| 보장/비보장 | application-level snapshot backlog는 latest pending 하나로 제한되고 recovering client는 obsolete queue 대신 최신 상태를 받습니다. 이 lossy 정책은 snapshot에만 적합하며 control/result event 전달 보장은 별도입니다. |
| 다음 관련 commit 연결 | `d21a47...`가 여러 room을 하나의 bounded fixed-step clock으로 구동할 registry를 만듭니다. |

비교 기준:
- 직전 Thread 관련 SHA: `207df3f47935` — `feat(game): 입력 순서와 rate limit 보호`
- 다음 Thread 관련 SHA: `d21a47ee92d2` — `refactor(game): shared room scheduler 추가`

### 5.5. `refactor(game): shared room scheduler 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `d21a47ee92d2` |
| Importance | A |
| Tags | SIMULATION, REALTIME, REFACTOR |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Creates one fixed-step clock for all registered rooms.
- Classification summary: Introduce a scheduler abstraction capable of driving all active rooms from one fixed-step clock.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | room마다 timer를 소유하면 active match 수만큼 interval이 생기고 register/unregister 중 callback collection mutation이 iteration을 흔들 수 있습니다. |
| 핵심 boundary/decision | `apps/api/src/game/sharedRoomScheduler.ts::SharedRoomScheduler`는 room ID→step callback map과 하나의 `FixedStepScheduler(50 ms, 5 ticks, 250 ms)`를 가집니다. 첫 register가 clock을 시작하고 마지막 unregister가 멈춥니다. |
| 상태 또는 ownership 변화 | shared scheduler가 runnable room registry와 단일 timing loop를 소유합니다. `stop`은 registry와 underlying scheduler를 함께 clear합니다. |
| 주요 failure/edge path | `stepRooms`는 `[...roomSteps.values()]` snapshot을 순회하므로 한 callback이 자신을 unregister하거나 다른 room을 register해도 현재 tick의 iteration이 손상되지 않습니다. 같은 room ID register는 callback을 교체합니다. |
| 보장/비보장 | room 수와 무관하게 하나의 bounded clock으로 registered callbacks를 실행하고 empty registry에는 timer가 없습니다. GameHub lifecycle이 정확히 register/unregister하는지는 다음 commit 범위입니다. |
| 다음 관련 commit 연결 | `fb5b1a...`가 per-room scheduler를 제거하고 GameHub lifecycle을 registry membership에 연결합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `8589ff3c4821` — `feat(game): latest snapshot buffer 추가`
- 다음 Thread 관련 SHA: `fb5b1abc97f5` — `refactor(game): GameHub가 shared room scheduler 사용`

### 5.6. `refactor(game): GameHub가 shared room scheduler 사용`

| 항목 | 값 |
| --- | --- |
| SHA | `fb5b1abc97f5` |
| Importance | A |
| Tags | SIMULATION, REALTIME, REFACTOR |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Makes runnable-room membership the hub’s single timing topology.
- Classification summary: Move simulation timing ownership from each room to one scheduler owned by `GameHub`.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 각 `Room`이 `FixedStepScheduler | null`을 가졌으므로 timer ownership이 room object마다 흩어지고 모든 terminal/pause path가 개별 handle을 기억해야 했습니다. |
| 핵심 boundary/decision | `apps/api/src/gameHub.ts`에서 room scheduler field를 제거하고 GameHub에 `roomScheduler = new SharedRoomScheduler()` 하나를 둡니다. play/resume은 register하고 pause, disconnect, abandonment, finalization, finished-room removal은 unregister합니다. |
| 상태 또는 ownership 변화 | GameHub가 application-wide timing topology를 소유하고 room은 simulation state만 보유합니다. `scheduledRoomCount`는 registry size를 관찰 가능한 상태로 노출합니다. |
| 주요 failure/edge path | unregister는 absent ID에도 안전하며 terminal path가 반복돼도 timer가 중복 정리되지 않습니다. disconnect/finish 전에 unregister해 paused/terminal room이 같은 tick에 더 진행하지 못하게 합니다. |
| 보장/비보장 | room은 simulation이 advance 가능한 동안에만 shared registry에 존재하고 active room 수와 무관하게 interval은 하나입니다. process admission/drain은 아직 별도입니다. |
| 다음 관련 commit 연결 | `44ef3e...`가 새 work를 차단하면서 이미 소유한 rooms만 bounded wait하는 drain state를 추가합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `d21a47ee92d2` — `refactor(game): shared room scheduler 추가`
- 다음 Thread 관련 SHA: `44ef3e07e1a5` — `feat(game): 새 작업 차단과 active room drain 추가`

### 5.7. `feat(game): 새 작업 차단과 active room drain 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `44ef3e07e1a5` |
| Importance | A |
| Tags | PROTOCOL, REALTIME, TOURNAMENT |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Rejects new work while waiting for owned rooms to finish.
- Classification summary: Introduce an explicit draining state shared by the Fastify readiness boundary and GameHub.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | shutdown 직전에 readiness가 계속 ready이고 queue/tournament admission이 열려 있으면 active room을 기다리는 동안 새 room이 계속 생겨 drain completion이 수렴하지 않습니다. |
| 핵심 boundary/decision | `app.beginDrain`은 lifecycle을 draining으로 바꾸고 `GameHub.beginDrain`은 `acceptingMatches=false`로 설정합니다. queued/tournament waiters를 `server_draining`으로 해제하고 existing rooms만 유지하며, room set empty 또는 timeout까지 하나의 waiter를 반환합니다. |
| 상태 또는 ownership 변화 | Fastify app가 readiness lifecycle을, GameHub가 admission flag·active room set·single drain promise/timer를 소유합니다. room removal이 `notifyDrainProgress`를 통해 waiter를 완료합니다. |
| 주요 failure/edge path | 재진입은 기존 promise를 반환해 competing deadline을 만들지 않습니다. timeout은 `{drained:false, activeRooms}`를 반환하고 즉시 room을 파괴하지 않습니다. final `close`는 shared scheduler, queue/reconnect/result timers, rooms, clients, heartbeat, snapshot buffer와 sockets를 정리합니다. |
| 보장/비보장 | drain 시작 즉시 readiness는 not_ready이고 새 queue/tournament match는 거부되며 owned rooms는 주어진 budget 안에서 끝날 기회를 가집니다. timeout 뒤 결과 보존 여부는 caller의 close 결정에 달려 있습니다. |
| 다음 관련 commit 연결 | `1c9981...`가 SIGTERM/SIGINT를 60초 drain→app close의 single-entry process sequence로 연결합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `fb5b1abc97f5` — `refactor(game): GameHub가 shared room scheduler 사용`
- 다음 Thread 관련 SHA: `1c9981393973` — `feat(ops): graceful shutdown 절차 추가`

### 5.8. `feat(ops): graceful shutdown 절차 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `1c9981393973` |
| Importance | A |
| Tags | REALTIME, PERSISTENCE, OPERATIONS |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Makes signals enter one bounded drain-and-close sequence.
- Classification summary: Install a single-entry graceful-shutdown handler for SIGTERM and SIGINT.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | drain API가 있어도 process signal handler가 이를 호출하지 않거나 여러 signal이 parallel close를 시작하면 repository/socket cleanup 순서가 경쟁할 수 있습니다. |
| 핵심 boundary/decision | `apps/api/src/gracefulShutdown.ts::installGracefulShutdown`은 SIGTERM/SIGINT listener와 `started` guard를 설치합니다. 첫 signal이 `app.beginDrain(60_000)` 뒤 `app.close()`를 호출하고 onClose hook이 listeners와 repository를 해제합니다. |
| 상태 또는 ownership 변화 | signal installer가 one-shot guard/listeners를, app shutdown callback이 drain/close 순서를 소유합니다. 반환 disposer는 normal close 시 두 listener를 제거합니다. |
| 주요 failure/edge path | 두 번째 signal은 `started` guard로 무시됩니다. drain/close reject는 error callback이 `process.exitCode=1`을 설정하고 `app.close()`를 다시 best-effort로 시도합니다. |
| 보장/비보장 | process teardown은 첫 signal에서 한 번만 시작되고 60초 room budget 뒤 Fastify/GameHub/repository cleanup으로 수렴합니다. OS/container가 그보다 짧게 강제 종료하면 completion은 보장하지 않습니다. |
| 다음 관련 commit 연결 | `7b0b5f...`가 실제 HTTP/WebSocket/database/edge path에서 같은 limits를 측정하는 load/fault harness를 추가합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `44ef3e07e1a5` — `feat(game): 새 작업 차단과 active room drain 추가`
- 다음 Thread 관련 SHA: `7b0b5f086b41` — `test(load): 실시간 fault injection 도구 추가`

### 5.9. `test(load): 실시간 fault injection 도구 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `7b0b5f086b41` |
| Importance | A |
| Tags | AUTH, REALTIME, PERSISTENCE |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Provides separate database and edge degradation paths for service-level evidence.
- Classification summary: Add a k6 realtime-load harness and independent Toxiproxy controls for persistence and transport faults.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | unit/fake-timer tests는 local state machine과 cleanup을 결정적으로 검증하지만 실제 process/network 경로의 latency, reconnect, snapshot gap, duplicate finalization을 함께 측정하지 못합니다. |
| 핵심 boundary/decision | `tests/load` k6 harness는 기본 500 connections/50 rooms(extended 1,000), dev-login→ticket→WebSocket→queue/input→fresh-ticket reconnect를 실행합니다. Compose overlay는 PostgreSQL과 public edge를 별도 Toxiproxy endpoint로 라우팅하고 control script가 latency/reset/down/up을 독립 적용합니다. |
| 상태 또는 ownership 변화 | k6 VU가 connection/room lifecycle과 sequence/result sets를, custom metrics가 connection/reconnect success, snapshot delay/gap, online/room count, finalization uniqueness를 소유합니다. Toxiproxy control utility가 named proxy/toxic lifecycle을 소유합니다. |
| 주요 failure/edge path | profile은 connections≥2×rooms를 검증하고 99% connection/reconnect, snapshot p95≤150 ms/p99≤250 ms, normal drop<1%, finalize failures/duplicates=0 등의 thresholds를 둡니다. DB fault와 edge fault를 분리해 persistence degradation과 transport degradation을 혼동하지 않습니다. |
| 보장/비보장 | 실제 service-level auth/ticket/socket/reconnect/snapshot/finalize 경로를 장애 아래 측정할 수 있는 executable evidence를 제공합니다. 이 환경에서는 harness를 실행하지 않았으므로 수치 통과를 주장하지 않으며 장기 production capacity를 일반화하지 않습니다. |
| 다음 관련 commit 연결 | Thread 최종 상태는 모든 주요 runtime work source에 bound·owner·cleanup·operational measurement가 있는 구조입니다. |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | database와 edge degradation을 분리해도 server-authoritative admission, reconnect, snapshot delivery와 one-result finalization을 관찰할 수 있습니다. |
| 재현하는 failure/boundary | connection population, room creation, forced reconnect, snapshot latency/gaps, DB latency/outage, edge latency/reset/outage, duplicate finalization. |
| test technique | k6 multi-connection load, Docker Compose overlay, independent Toxiproxy controls, custom thresholds/metrics. |
| 통과하는 production path | dev-login/cookie → one-time ticket → WebSocket queue/ready/input → snapshot → forced fresh-ticket reconnect → durable game.finished. |
| 증명하는 것 | 실행 시 actual process/network path에서 fault source별 service metrics와 threshold pass/fail을 수집합니다. |
| 증명하지 않는 것 | unit-level physics correctness, 모든 production topology, 장기 soak/capacity, 그리고 이 작업 환경에서 실제 threshold 통과를 증명하지 않습니다. |
| test 성격 | Broad service-level load and fault-injection evidence. |
| 후속 회귀 방지 설명 | ticket/reconnect protocol, snapshot monotonicity, liveness, finalization uniqueness, DB/edge fault controls가 깨지면 명시된 metric/threshold가 실패해야 합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `1c9981393973` — `feat(ops): graceful shutdown 절차 추가`
- 이 Thread의 마지막 상태와 비교해 최종 보장을 정리했습니다.

## 6. Invariant ledger

Source에서 확정된 invariant를 commit 시점별로 연결했습니다. `해당 없음`은 해당 Thread 안에서 별도 fix/test가 없음을 뜻합니다.

| Invariant | 처음 도입/관찰한 SHA | 강화한 SHA | 부족함이 드러난 SHA | 복구한 fix | 고정한 regression test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| Timers, schedulers, heartbeat handles, retry work, snapshot buffers, and database resources have explicit single-owner cleanup. | `3a2943ff385d` scheduler handles | `10a656e59864` heartbeat → `8589ff3c4821` snapshot retry → `d21a47ee92d2` shared clock → `fb5b1abc97f5` lifecycle membership → `44ef3e07e1a5` final close | per-room timer multiplicity와 shutdown competing ownership | `fb5b1abc97f5`/`44ef3e07e1a5` | 각 abstraction unit tests와 `7b0b5f086b41` operational harness | fixedStepScheduler.ts, heartbeat.ts, latestSnapshotBuffer.ts, sharedRoomScheduler.ts, GameHub.close |
| Draining rejects new work immediately, allows owned rooms to finish within a bounded budget, and remains aligned with the container termination grace period. | `44ef3e07e1a5` | `1c9981393973` 60초 single signal sequence | signal 경쟁과 readiness/admission 불일치 | `1c9981393973` | graceful shutdown tests와 load/fault 운영 evidence | app.beginDrain, GameHub.beginDrain, installGracefulShutdown |
| Every accepted wire message conforms to the supported versioned runtime schema; snapshot and input ordering cannot move state backward. | Thread 03 versioned codec/sequence | `207df3f47935` stale-before-token admission, `8589ff3c4821` latest-value delivery | 유효한 새 sequence burst와 slow consumer backlog | input rate gate/latest buffer | InputGate/LatestSnapshotBuffer tests + `7b0b5f086b41` metrics | inputGate.ts, latestSnapshotBuffer.ts, k6 sequence metrics |

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| long event-loop stall이 무제한 catch-up을 유발 | `3a2943ff385d` 50 ms step, 5-tick loop cap, 250 ms lag ceiling | deterministic accumulator/scheduler tests | bounded simulation work와 remainder |
| dead·abusive·slow client가 timer/input/snapshot work를 누적 | `10a656e59864` heartbeat → `207df3f47935` input gate → `8589ff3c4821` latest buffer | 각 abstraction tests와 k6 connection/snapshot metrics | bounded connection work와 hard termination |
| room마다 timer를 갖고 lifecycle path마다 개별 cleanup | `d21a47ee92d2` shared scheduler → `fb5b1abc97f5` complete register/unregister integration | scheduler/GameHub lifecycle tests | runnable-room registry가 timing topology의 단일 owner |
| shutdown 중 readiness와 admission이 열리고 여러 signal이 경쟁 | `44ef3e07e1a5` drain → `1c9981393973` one-shot signal sequence | drain/shutdown tests와 fault harness | bounded operational teardown |
| DB와 edge degradation을 구분하지 못하는 측정 | `7b0b5f086b41` separate proxies와 source-specific controls | k6 metrics/thresholds | failure source별 service-level evidence |

## 8. Ownership / state / responsibility 변화

| 축 | 초기 SHA의 owner/state | 중간 전환 | Thread 최종 owner/state | 해제·cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| elapsed-time accumulation and simulation steps | `3a2943...` accumulator/scheduler | `d21a47...` room registry | `fb5b1...` GameHub-owned shared scheduler | last unregister/GameHub.close | fixedStepScheduler.ts, sharedRoomScheduler.ts, gameHub.ts |
| heartbeat timers | 없음 | `10a656...` connection heartbeat | connection별 heartbeat instance | stop/terminate/socket close | heartbeat.ts |
| input budget and sequence state | sequence-only or scattered checks | `207df3...` user bucket + user-room sequence | InputGate | releaseUser | inputGate.ts |
| snapshot queue and congestion retry | transport send backlog | `8589ff...` latest pending + one retry | LatestSnapshotBuffer | close/terminate | latestSnapshotBuffer.ts |
| shared room scheduler membership | room별 scheduler | `d21a47...` abstraction | `fb5b1...` GameHub registry | pause/disconnect/abandon/finalize/remove/close | SharedRoomScheduler/GameHub |
| drain waiter and process signal teardown | 없음/즉시 close | `44ef3...` single drain waiter | `1c998...` one-shot signal→60초 drain→close | finishDrain/dispose listeners/app.close | GameHub.beginDrain, gracefulShutdown.ts |
| fault experiment | unit evidence만 존재 | `7b0b5...` DB/edge proxies | k6 profile + toxiproxy control | reset/up/down commands/compose teardown | tests/load, compose overlay |

## 9. Thread 최종 상태

- 최종 authoritative owner: GameHub가 shared room scheduler와 drain lifecycle을, connection abstractions가 heartbeat/input/snapshot resources를, process entrypoint가 signal→close sequence를 소유합니다.
- 최종 상태/invariant: elapsed catch-up, liveness, input burst, snapshot backlog, timer multiplicity, admission과 shutdown이 모두 hard bound와 단일 cleanup owner를 가집니다.
- 남아 있는 의도적 제한 또는 비보장: snapshot 전송은 의도적으로 lossy latest-value이며 drain timeout 뒤 unfinished room 보존을 보장하지 않습니다. load/fault harness의 threshold는 실행 환경과 topology에 종속됩니다.
- 후속 Thread가 의존하는 contract: runnable room만 shared scheduler에 등록되고 draining은 새 work를 즉시 거부한 뒤 60초 budget에서 existing room completion을 기다리고 전체 runtime resource를 한 번 정리합니다.
- 대표 코드 근거: `3a2943ff385d fixedStepScheduler.ts`, `10a656e59864 heartbeat.ts`, `207df3f47935 inputGate.ts`, `8589ff3c4821 latestSnapshotBuffer.ts`, `fb5b1abc97f5`/`44ef3e07e1a5 gameHub.ts`, `1c9981393973 gracefulShutdown.ts`, `7b0b5f086b41 tests/load`

## 10. 최종 architecture 또는 execution flow 정리

```text
[wall-clock / client input / socket state]
    ↓ monotonic accumulator + version/sequence/token admission
[shared 50 ms scheduler: ≤5 ticks/loop, ≤250 ms lag]
    ↓ runnable room callbacks
[authoritative simulation snapshot]
    ↓ latest-value buffer: one pending, 256 KiB soft, 1 MiB hard, 5 s deadline
[WebSocket client + heartbeat: 15 s ping / 45 s deadline]

[SIGTERM/SIGINT]
    ↓ one-shot
[readiness not_ready + reject queue/tournament + release waiters]
    ↓ wait existing rooms ≤60 s
[GameHub.close → timers/scheduler/buffers/heartbeats/sockets]
    ↓
[Fastify close → repository close → signal listener dispose]

[k6 workload] → [separate DB/edge Toxiproxy faults] → [latency/gap/reconnect/finalize metrics]
```

- stale input은 token budget을 쓰기 전에 제거되고 accepted input만 simulation intent를 바꿉니다.
- snapshot은 최신 상태가 가치이므로 obsolete pending frame을 교체하지만 `game.finished` 같은 control event의 delivery 정책과 동일하지 않습니다.
- 이 작업에서는 load/fault command를 실행하지 않았으며 harness와 threshold의 구현만 검토했습니다.

## 11. 학습 완료 자가 점검

- [x] Commit map의 모든 SHA를 원문 순서대로 확인했습니다.
- [x] 각 commit의 subject, importance, tags를 변경하지 않았습니다.
- [x] S/A/B 깊이를 구분해 코드 근거를 남겼습니다.
- [x] final HEAD의 구현을 과거 SHA에 소급하지 않았습니다.
- [x] 핵심 상태 필드, caller/callee, ownership, failure branch, cleanup을 실제 코드로 확인했습니다.
- [x] Fix를 기존 가정 → failure/risk → root cause → decision → code → regression 순서로 연결했습니다.
- [x] Test commit에서 production invariant, failure, technique, path, 증명/비증명 범위를 구분했습니다.
- [x] Thread 최종 execution flow를 별도 프로젝트 재학습 없이 설명할 수 있습니다.
