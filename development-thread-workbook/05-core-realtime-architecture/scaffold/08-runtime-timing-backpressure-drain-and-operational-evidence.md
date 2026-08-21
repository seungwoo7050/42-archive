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
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Separates monotonic elapsed time from bounded 50 ms simulation work.
- Classification summary: Introduce a fixed-step accumulator that separates elapsed wall-clock time from simulation updates.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- 측정 위치, label cardinality, threshold, time source와 측정 자체가 동작을 바꾸지 않는지 확인합니다.

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
- 이 commit의 parent와 비교합니다.
- 다음 Thread 관련 SHA: `10a656e59864` — `feat(game): WebSocket heartbeat 추가`

### 5.2. `feat(game): WebSocket heartbeat 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `10a656e59864` |
| Importance | A |
| Tags | REALTIME, RISK |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Adds deterministic liveness ownership and timeout cleanup.
- Classification summary: Introduce an explicit heartbeat lifecycle for realtime connections.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.

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
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Combines monotonic input admission with per-user token-bucket limits.
- Classification summary: Introduce an input gate that combines sequence ordering with per-user token-bucket throttling.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.

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
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Defines latest-value delivery and congestion termination rules.
- Classification summary: Introduce a latest-value outbound buffer for game snapshots.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.

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
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Creates one fixed-step clock for all registered rooms.
- Classification summary: Introduce a scheduler abstraction capable of driving all active rooms from one fixed-step clock.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- 기존 경로와 새 경로가 공존하는 migration 구간 및 최종 duplicate implementation 제거 여부를 확인합니다.

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
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Makes runnable-room membership the hub’s single timing topology.
- Classification summary: Move simulation timing ownership from each room to one scheduler owned by `GameHub`.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- 기존 경로와 새 경로가 공존하는 migration 구간 및 최종 duplicate implementation 제거 여부를 확인합니다.

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
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Rejects new work while waiting for owned rooms to finish.
- Classification summary: Introduce an explicit draining state shared by the Fastify readiness boundary and GameHub.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- runtime schema의 strictness, negative branch, producer/consumer의 공통 contract 사용 여부를 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.

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
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Makes signals enter one bounded drain-and-close sequence.
- Classification summary: Install a single-entry graceful-shutdown handler for SIGTERM and SIGINT.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.

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
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Provides separate database and edge degradation paths for service-level evidence.
- Classification summary: Add a k6 realtime-load harness and independent Toxiproxy controls for persistence and transport faults.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- 테스트가 주입하는 입력·시간·동시성·오류와 실제 production path를 구분해 기록합니다.
- 테스트가 증명하는 범위와 실제 process/network/database까지는 증명하지 않는 범위를 함께 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 boundary/decision | [파일·심볼·조건·관찰 결과 작성] |
| 상태 또는 ownership 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 주요 failure/edge path | [파일·심볼·조건·관찰 결과 작성] |
| 보장/비보장 | [파일·심볼·조건·관찰 결과 작성] |
| 다음 관련 commit 연결 | [파일·심볼·조건·관찰 결과 작성] |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | [작성] |
| 재현하는 failure/boundary | [작성] |
| test technique | [작성] |
| 통과하는 production path | [작성] |
| 증명하는 것 | [작성] |
| 증명하지 않는 것 | [작성] |
| 후속 회귀 방지 | [작성] |

비교 기준:
- 직전 Thread 관련 SHA: `1c9981393973` — `feat(ops): graceful shutdown 절차 추가`
- 이 Thread의 최종 상태와 비교합니다.

## 6. Invariant ledger

| Invariant | 도입 SHA | 강화 SHA | 부족함이 드러난 SHA | 복구 fix | 고정 test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| Timers, schedulers, heartbeat handles, retry work, snapshot buffers, and database resources have explicit single-owner cleanup. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| Draining rejects new work immediately, allows owned rooms to finish within a bounded budget, and remains aligned with the container termination grace period. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| Every accepted wire message conforms to the supported versioned runtime schema; snapshot and input ordering cannot move state backward. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| [작성] | [작성] | [작성] | [작성] |

## 8. Ownership / state / responsibility 변화

| 축 | 초기 owner/state | 중간 전환 | 최종 owner/state | cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| elapsed-time accumulation and simulation steps | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| heartbeat timers | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| input budget and sequence state | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| snapshot queue and congestion retry | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| shared room scheduler membership | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| drain waiter and process signal teardown | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| fault experiment | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |

## 9. Thread 최종 상태

- 최종 authoritative owner: [작성]
- 최종 상태/invariant: [작성]
- 남아 있는 의도적 제한 또는 비보장: [작성]
- 후속 Thread가 의존하는 contract: [작성]
- 대표 코드 근거: [SHA·파일·심볼 작성]

## 10. 최종 architecture 또는 execution flow 정리

```text
[입력/이벤트]
    ↓
[소유 boundary와 validation]
    ↓
[상태 전이 또는 side effect]
    ↓
[출력/관측/cleanup]
```

## 11. 학습 완료 자가 점검

- [ ] Commit map의 모든 SHA를 원문 순서대로 확인했습니다.
- [ ] 각 commit의 subject, importance, tags를 변경하지 않았습니다.
- [ ] final HEAD 코드를 과거 SHA에 소급하지 않았습니다.
- [ ] S/A/B/C 깊이를 구분해 근거를 남겼습니다.
- [ ] fix와 test를 실제 production path에 연결했습니다.
- [ ] 실행하지 않은 명령 결과를 작성하지 않았습니다.
- [ ] Thread 최종 flow를 실제 코드로 설명할 수 있습니다.
