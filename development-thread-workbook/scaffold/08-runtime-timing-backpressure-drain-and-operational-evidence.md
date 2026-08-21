# 런타임 타이밍·백프레셔·드레인·운영 증거

원문 Development Thread: `Runtime timing, backpressure, drain, and operational evidence`

## 1. Thread 목표

- simulation catch-up, socket liveness, input burst, snapshot backlog, timer topology, shutdown work를 각각 명시적으로 제한하는 runtime 경계를 추적합니다.
- per-room timing이 shared scheduler로 이동하며 runnable room membership이 lifecycle 상태와 일치하는지 확인합니다.
- drain/readiness/signal shutdown과 database/edge fault harness가 같은 운영 invariant를 어떻게 검증하는지 복원합니다.

### Source에서 확정된 significance

> The completed runtime bounds every major source of unbounded work: elapsed catch-up, dead sockets, input
> bursts, snapshot backlog, timer multiplicity, and shutdown. Observability and fault tooling then measure the
> same boundaries under process and network degradation rather than relying only on unit behavior.

### 직접 연결되는 Critical Invariants

> Timers, schedulers, heartbeat handles, retry work, snapshot buffers, and database resources have explicit
> single-owner cleanup.

> Draining rejects new work immediately, allows owned rooms to finish within a bounded budget, and remains
> aligned with the container termination grace period.

> Every accepted wire message conforms to the supported versioned runtime schema; snapshot and input ordering
> cannot move state backward.

### 직접 연결되는 Major Engineering Difficulties

> Handling slow or stale transports through sequence gates, token buckets, latest-value snapshot delivery,
> measurable congestion, and hard termination limits.

> Preserving domain correctness during database failure, tournament-start rollback, match-finalization retry,
> process drain, and deployment shutdown.

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
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Separates monotonic elapsed time from bounded 50 ms simulation work.
- Classification summary: Introduce a fixed-step accumulator that separates elapsed wall-clock time from simulation updates.

원문 구현 의도·상태 변화:

> Introduce a fixed-step accumulator that separates elapsed wall-clock time from simulation updates. Elapsed
> time is accumulated against a monotonic clock, converted into whole 50-millisecond steps, and bounded by
> both a five-tick loop limit and a 250-millisecond lag ceiling. This preserves stable simulation increments
> without allowing a long event-loop stall to trigger an unbounded spiral of catch-up work.

원문 경계·failure handling·후속 범위:

> The scheduler wraps that accumulator with an idempotent interval lifecycle and an injectable clock. Its loop
> checks the running timer between steps, so a transition that stops the scheduler from inside a callback
> prevents further work in the same batch. Constructor validation makes invalid timing policies fail before
> runtime.

#### 해당 SHA에서 확인할 실제 코드

- fixed-step accumulator의 monotonic clock input, accumulated remainder, 50 ms step 변환을 확인합니다.
- 한 loop의 five-tick limit와 250 ms lag ceiling이 적용되는 순서를 기록합니다.
- clock이 backward일 때 negative lag를 만들지 않는 branch를 확인합니다.
- scheduler start/stop의 idempotency와 injectable clock/interval ownership을 확인합니다.
- step callback 내부에서 scheduler가 stop되면 같은 batch의 후속 step을 중단하는 running check를 추적합니다.
- constructor가 invalid timing policy를 runtime 시작 전 거부하는 조건을 기록합니다.

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
- 이 commit의 parent에서 동일 책임을 담당하던 코드를 찾아 기록합니다.
- 다음 Thread 관련 SHA: `10a656e59864` — `feat(game): WebSocket heartbeat 추가`

### 5.2. `feat(game): WebSocket heartbeat 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `10a656e59864` |
| Importance | A |
| Tags | REALTIME, RISK |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Adds deterministic liveness ownership and timeout cleanup.
- Classification summary: Introduce an explicit heartbeat lifecycle for realtime connections.

원문 구현 의도·상태 변화:

> Introduce an explicit heartbeat lifecycle for realtime connections. Starting the heartbeat arms a 45-second
> liveness deadline and sends a transport ping every 15 seconds; a pong acknowledgement replaces the deadline,
> while a ping exception or expired deadline stops all timers before terminating the target.

원문 경계·failure handling·후속 범위:

> Start, acknowledgement, stop, and termination are idempotent, so close races cannot leave intervals or
> timeouts running after the socket lifecycle ends. Separating this policy from GameHub makes connection
> liveness deterministic and independently testable.

#### 해당 SHA에서 확인할 실제 코드

- heartbeat start가 15-second ping interval과 45-second liveness deadline을 설정하는 순서를 확인합니다.
- pong acknowledgement가 기존 deadline을 단순 flag가 아니라 새 absolute deadline으로 교체하는지 확인합니다.
- ping exception과 expired deadline이 timer stop 후 socket termination으로 수렴하는지 추적합니다.
- start/ack/stop/terminate 반복 호출의 idempotent guard를 기록합니다.
- close race 후 interval/timeout handle이 남지 않는 cleanup ownership을 확인합니다.

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
- 직전 Thread 관련 SHA: `3a2943ff385d` — `feat(game): fixed-step scheduler 추가`
- 다음 Thread 관련 SHA: `207df3f47935` — `feat(game): 입력 순서와 rate limit 보호`

### 5.3. `feat(game): 입력 순서와 rate limit 보호`

| 항목 | 값 |
| --- | --- |
| SHA | `207df3f47935` |
| Importance | A |
| Tags | SIMULATION, REALTIME, RISK |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Combines monotonic input admission with per-user token-bucket limits.
- Classification summary: Introduce an input gate that combines sequence ordering with per-user token-bucket throttling.

원문 구현 의도·상태 변화:

> Introduce an input gate that combines sequence ordering with per-user token-bucket throttling. Sequence
> state is keyed by user and room, so duplicate or older commands cannot overwrite newer paddle intent; rate
> capacity is keyed only by user, so opening additional rooms does not multiply the permitted input rate.

원문 경계·failure handling·후속 범위:

> The default budget allows a short burst of eight commands and replenishes at 30 per second. Ordering is
> checked before the bucket is charged, invalid configuration is rejected at construction, and `releaseUser`
> removes both bucket and sequence state when the user lifecycle ends. Returning `accepted`, `stale`, or
> `rate_limited` lets the transport layer distinguish harmless reordering from an observable abuse limit.

#### 해당 SHA에서 확인할 실제 코드

- sequence state key가 user+room이고 token bucket key가 user-only인 자료구조를 확인합니다.
- sequence ordering 검사가 token charge보다 먼저 실행되는 control flow를 기록합니다.
- default burst 8, refill 30/s와 fractional refill 계산을 확인합니다.
- `accepted`, `stale`, `rate_limited` outcome이 caller에게 전달되는 union/enum을 확인합니다.
- `releaseUser`가 bucket과 모든 room sequence state를 제거하는지 추적합니다.
- 여러 room/connection이 user throughput을 늘리지 못하면서 다른 user와는 격리되는 key 설계를 정리합니다.

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
- 직전 Thread 관련 SHA: `10a656e59864` — `feat(game): WebSocket heartbeat 추가`
- 다음 Thread 관련 SHA: `8589ff3c4821` — `feat(game): latest snapshot buffer 추가`

### 5.4. `feat(game): latest snapshot buffer 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `8589ff3c4821` |
| Importance | A |
| Tags | SIMULATION, REALTIME, OPERATIONS |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Defines latest-value delivery and congestion termination rules.
- Classification summary: Introduce a latest-value outbound buffer for game snapshots.

원문 구현 의도·상태 변화:

> Introduce a latest-value outbound buffer for game snapshots. The buffer permits one send in flight and
> stores at most one pending payload, replacing that payload whenever a newer snapshot arrives. This bounds
> application-level memory and ensures a recovering client receives current state rather than replaying frames
> that are already obsolete.

원문 경계·failure handling·후속 범위:

> Transport pressure has two explicit limits: data above 256 KiB pauses sends and is retried every 50
> milliseconds for at most five seconds, while one MiB triggers immediate termination. Send errors,
> synchronous transport failures, closed sockets, and explicit shutdown all converge on idempotent cleanup,
> preventing retry timers or pending state from surviving the connection lifecycle.

#### 해당 SHA에서 확인할 실제 코드

- one send in flight와 at most one pending latest payload를 표현하는 state fields를 확인합니다.
- 새 snapshot enqueue가 pending old snapshot을 replace하는 조건과 cleanup callback을 기록합니다.
- `bufferedAmount` 256 KiB soft threshold, 50 ms retry, five-second deadline, 1 MiB hard termination을 확인합니다.
- send error, synchronous throw, closed socket, explicit shutdown이 idempotent cleanup으로 수렴하는지 추적합니다.
- retry timer와 pending payload가 connection lifecycle 뒤 남지 않는지 확인합니다.
- control/lifecycle event와 달리 snapshot만 latest-value loss semantics를 갖는 사용 전제를 기록합니다.

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
- 직전 Thread 관련 SHA: `207df3f47935` — `feat(game): 입력 순서와 rate limit 보호`
- 다음 Thread 관련 SHA: `d21a47ee92d2` — `refactor(game): shared room scheduler 추가`

### 5.5. `refactor(game): shared room scheduler 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `d21a47ee92d2` |
| Importance | A |
| Tags | SIMULATION, REALTIME, REFACTOR |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Creates one fixed-step clock for all registered rooms.
- Classification summary: Introduce a scheduler abstraction capable of driving all active rooms from one fixed-step clock.

원문 구현 의도·상태 변화:

> Introduce a scheduler abstraction capable of driving all active rooms from one fixed-step clock. Room
> identifiers map to step callbacks; registering the first room starts the underlying timer, removing the last
> room stops it, and `stop` clears both the registry and timing loop.

원문 경계·failure handling·후속 범위:

> The shared loop retains the simulation’s 50-millisecond step and bounded catch-up limits while snapshotting
> callbacks before iteration. That snapshot isolates the current tick from rooms registering or unregistering
> themselves during a lifecycle transition, so one room cannot corrupt iteration for the others.

#### 해당 SHA에서 확인할 실제 코드

- room ID → step callback registry와 first-register timer start, last-unregister timer stop을 확인합니다.
- shared loop가 same 50 ms step과 bounded catch-up accumulator를 재사용하는지 추적합니다.
- iteration 전에 callback collection을 snapshot하는 코드와 register/unregister mutation 격리를 확인합니다.
- 한 room callback이 자기 자신을 제거해도 다른 room callback이 같은 tick에 실행되는 순서를 기록합니다.
- `stop`이 registry와 timing loop를 모두 clear하는지 확인합니다.

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
- 직전 Thread 관련 SHA: `8589ff3c4821` — `feat(game): latest snapshot buffer 추가`
- 다음 Thread 관련 SHA: `fb5b1abc97f5` — `refactor(game): GameHub가 shared room scheduler 사용`

### 5.6. `refactor(game): GameHub가 shared room scheduler 사용`

| 항목 | 값 |
| --- | --- |
| SHA | `fb5b1abc97f5` |
| Importance | A |
| Tags | SIMULATION, REALTIME, REFACTOR |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Makes runnable-room membership the hub’s single timing topology.
- Classification summary: Move simulation timing ownership from each room to one scheduler owned by `GameHub`.

원문 구현 의도·상태 변화:

> Move simulation timing ownership from each room to one scheduler owned by `GameHub`. Rooms no longer carry
> individual `FixedStepScheduler` instances; every lifecycle transition now registers or unregisters the room
> with the shared ticker, including play, pause, disconnect, abandonment, finalization, and removal.

원문 경계·failure handling·후속 범위:

> Centralizing the timing loop avoids one timer per match and gives the hub a single authoritative set of
> runnable rooms. The integration points preserve the stronger lifecycle invariant that a room appears in the
> scheduler exactly while its simulation may advance.

#### 해당 SHA에서 확인할 실제 코드

- room-local `FixedStepScheduler` field/creation이 제거되는 diff를 확인합니다.
- `GameHub`가 하나의 shared scheduler를 생성·소유하는 lifecycle을 기록합니다.
- play, pause, disconnect, abandonment, finalization, removal 각각에서 register/unregister call을 찾습니다.
- room이 simulation 가능할 때만 registry에 존재하는지 session/snapshot phase 조건과 함께 확인합니다.
- 중복 register/unregister와 scheduler close가 idempotent한지 확인합니다.

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
- 직전 Thread 관련 SHA: `d21a47ee92d2` — `refactor(game): shared room scheduler 추가`
- 다음 Thread 관련 SHA: `44ef3e07e1a5` — `feat(game): 새 작업 차단과 active room drain 추가`

### 5.7. `feat(game): 새 작업 차단과 active room drain 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `44ef3e07e1a5` |
| Importance | A |
| Tags | PROTOCOL, REALTIME, TOURNAMENT |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Rejects new work while waiting for owned rooms to finish.
- Classification summary: Introduce an explicit draining state shared by the Fastify readiness boundary and GameHub.

원문 구현 의도·상태 변화:

> Introduce an explicit draining state shared by the Fastify readiness boundary and GameHub. Once draining
> begins, readiness changes to `not_ready`, queued and tournament-waiting clients are released with a
> `server_draining` protocol error, and no new queue or tournament match may start. Existing rooms retain
> ownership of their lifecycle and are allowed to finish; a single waiter resolves when the room set becomes
> empty or returns the remaining room count at the timeout. Final close then stops schedulers, timers,
> snapshot buffers, heartbeats, sockets, and retained guest results.

#### 해당 SHA에서 확인할 실제 코드

- draining state가 Fastify readiness와 GameHub에서 공유/조회되는 위치를 확인합니다.
- drain 시작 시 readiness `not_ready`, queue/tournament waiters release, `server_draining` event 순서를 기록합니다.
- new queue/tournament match를 거부하지만 existing rooms는 계속 소유/실행하는 branch를 확인합니다.
- single waiter가 room set empty 또는 timeout remaining count로 resolve되는 자료구조를 확인합니다.
- final close가 scheduler, timer, snapshot buffer, heartbeat, socket, retained guest result를 정리하는 순서를 기록합니다.
- drain 재진입 또는 concurrent waiter가 competing lifecycle을 만들지 않는 guard를 확인합니다.

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
- 직전 Thread 관련 SHA: `fb5b1abc97f5` — `refactor(game): GameHub가 shared room scheduler 사용`
- 다음 Thread 관련 SHA: `1c9981393973` — `feat(ops): graceful shutdown 절차 추가`

### 5.8. `feat(ops): graceful shutdown 절차 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `1c9981393973` |
| Importance | A |
| Tags | REALTIME, PERSISTENCE, OPERATIONS |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Makes signals enter one bounded drain-and-close sequence.
- Classification summary: Install a single-entry graceful-shutdown handler for SIGTERM and SIGINT.

원문 구현 의도·상태 변화:

> Install a single-entry graceful-shutdown handler for SIGTERM and SIGINT. The first signal moves the
> application through the 60-second game-room drain before Fastify closes and releases repository resources;
> subsequent signals cannot start a competing teardown. Failures set a nonzero exit status and still attempt
> application closure, while the signal listeners are detached as part of the normal close lifecycle.

#### 해당 SHA에서 확인할 실제 코드

- SIGTERM/SIGINT listener와 single-entry shutdown promise/guard를 확인합니다.
- 첫 signal → 60-second room drain → Fastify close → repository/resource release 순서를 추적합니다.
- 후속 signal이 별도 teardown을 시작하지 않는 branch를 확인합니다.
- drain/close failure가 nonzero exit status를 설정하면서도 remaining close를 시도하는지 기록합니다.
- normal application close 시 signal listener가 detach되는 ownership을 확인합니다.

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
- 직전 Thread 관련 SHA: `44ef3e07e1a5` — `feat(game): 새 작업 차단과 active room drain 추가`
- 다음 Thread 관련 SHA: `7b0b5f086b41` — `test(load): 실시간 fault injection 도구 추가`

### 5.9. `test(load): 실시간 fault injection 도구 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `7b0b5f086b41` |
| Importance | A |
| Tags | AUTH, REALTIME, PERSISTENCE |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Provides separate database and edge degradation paths for service-level evidence.
- Classification summary: Add a k6 realtime-load harness that opens the configured connection population, creates live rooms, drives versioned input, exercises ticket-based reconnection, and measures snapshot delay, delivery gaps,...

원문 구현 의도·상태 변화:

> Add a k6 realtime-load harness that opens the configured connection population, creates live rooms, drives
> versioned input, exercises ticket-based reconnection, and measures snapshot delay, delivery gaps, and
> match-finalization uniqueness. A Docker Compose overlay routes PostgreSQL and the public edge through
> separate Toxiproxy endpoints, while a validated control utility can add latency, reset peers, or disable
> either path. Keeping database and edge faults independently addressable makes it possible to distinguish
> persistence degradation from transport degradation under the same server-authoritative workload.

#### 해당 SHA에서 확인할 실제 코드

- k6 harness의 connection population, room creation, versioned input, ticket reconnect, snapshot/finalization measurement flow를 확인합니다.
- PostgreSQL과 public edge가 서로 다른 Toxiproxy endpoint를 통과하도록 구성된 Compose overlay를 기록합니다.
- control utility가 latency, reset, disable을 어느 proxy에 적용하는지 validation과 cleanup을 확인합니다.
- snapshot delay, delivery gap, match-finalization uniqueness metric을 어떤 source에서 수집하는지 추적합니다.
- database degradation과 transport degradation에서 expected readiness/connection behavior를 구분합니다.
- 이 harness가 simulation rule의 정확성보다 service-level recovery/limit evidence를 검증한다는 범위를 작성합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | database와 edge degradation을 분리해도 server-authoritative workload의 admission, reconnect, delivery, finalization을 관찰할 수 있습니다. |
| 재현하는 failure/boundary | DB latency/outage, edge latency/reset, connection/reconnect loss, snapshot gaps, duplicate finalization. |
| test technique | k6 load, Docker Compose overlay, independent Toxiproxy controls, service metrics. |
| 통과하는 production path | HTTP ticket/auth → WebSocket rooms/input/reconnect → snapshot/finalization metrics under injected faults. |
| 증명하는 것 | 실제 process/network 경로에서 failure source별 operational evidence를 수집할 수 있습니다. |
| 증명하지 않는 것 | 모든 production topology나 장기 capacity를 일반화하지 않으며 unit-level rule correctness를 대체하지 않습니다. |
| test 성격 | Broad service-level load and fault-injection evidence. |
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
- 직전 Thread 관련 SHA: `1c9981393973` — `feat(ops): graceful shutdown 절차 추가`
- 이 Thread의 최종 상태와 비교해 이후 보완 여부를 기록합니다.

## 6. Invariant ledger

Source에서 확정된 invariant를 아래 시점별로 연결합니다. 새 invariant를 추측해 확정하지 않습니다.

| Invariant | 처음 도입/관찰한 SHA | 강화한 SHA | 부족함이 드러난 SHA | 복구한 fix | 고정한 regression test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| Timers, schedulers, heartbeat handles, retry work, snapshot buffers, and database resources have explicit single-owner cleanup. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| Draining rejects new work immediately, allows owned rooms to finish within a bounded budget, and remains aligned with the container termination grace period. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| Every accepted wire message conforms to the supported versioned runtime schema; snapshot and input ordering cannot move state backward. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |

추가 기록:

- invariant가 동일한 문장으로 유지되었는지, 더 강한 조건으로 바뀌었는지 구분합니다.
- implementation detail과 invariant를 혼동하지 않습니다.
- source가 명시하지 않은 규칙은 “관찰한 가설”로 표시하고 코드 근거로만 남깁니다.

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| event-loop stall과 per-room timer가 unbounded catch-up/work를 유발 | `3a2943ff385d` bounded fixed step → `d21a47ee92d2` shared scheduler → `fb5b1abc97f5` hub ownership | 해당 SHA의 deterministic scheduler tests를 확인 | bounded timing topology |
| dead/stale/abusive/slow transport가 handle·input·snapshot backlog를 남김 | `10a656e59864` heartbeat → `207df3f47935` input gate → `8589ff3c4821` latest buffer | 각 abstraction 및 GameHub integration tests를 확인 | bounded connection work |
| shutdown이 new work와 active rooms를 구분하지 못함 | `44ef3e07e1a5` drain → `1c9981393973` single signal sequence | graceful shutdown tests와 fault harness evidence | bounded operational teardown |
| failure source를 구분하지 못하는 측정 | `7b0b5f086b41` separate DB/edge proxies | versioned load/fault report | service-level evidence |

학습자 보완 기록:

- 실제 failure를 주입하거나 재현하는 test fixture를 찾아 위 표의 각 행과 연결합니다.
- fix가 symptom만 가리는지, ownership/invariant를 바꾸는지 코드 근거로 판별합니다.
- broad integration과 deterministic regression을 별도 표시합니다.

## 8. Ownership / state / responsibility 변화

| 축 | 초기 SHA의 owner/state | 중간 전환 | Thread 최종 owner/state | 해제·cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| elapsed-time accumulation and simulation steps | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| heartbeat timers | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| input budget and sequence state | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| snapshot queue and congestion retry | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| shared room scheduler membership | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| drain waiter and process signal teardown | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |

## 9. Thread 최종 상태

다음 항목은 최종 HEAD를 보고 채우지 말고, 이 Thread의 마지막 commit까지 순서대로 복원한 결과로 작성합니다.

- 최종 authoritative owner: [학습자 작성]
- 최종 상태/invariant: [학습자 작성]
- 남아 있는 의도적 제한 또는 비보장: [학습자 작성]
- 후속 Thread가 의존하는 contract: [학습자 작성]
- 대표 코드 근거: [SHA, 파일, symbol]

## 10. 최종 architecture 또는 execution flow 정리

- event-loop stall부터 bounded catch-up과 snapshot delivery까지 시간 흐름을 작성합니다.
- connection/room/process shutdown에서 남을 수 있는 handle과 각 cleanup 지점을 정리합니다.
- database degradation과 edge degradation을 분리한 fault experiment의 관찰 항목을 설명합니다.

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
