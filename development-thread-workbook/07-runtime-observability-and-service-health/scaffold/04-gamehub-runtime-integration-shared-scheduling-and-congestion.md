# GameHub runtime 통합, shared scheduling과 congestion

- 카테고리: `07-runtime-observability-and-service-health` — 런타임 관측성과 서비스 상태
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`
- Phase 1 상태: frozen authoritative scaffold

## 1. Thread 목표

독립 limiter를 GameHub의 room/client lifecycle에 연결하고, room별 timer를 shared scheduler로 이전하며, simulation·snapshot cadence와 실제 transport congestion을 분리하는 과정을 복원합니다.

범위 메모: 이 Thread는 GameHub 내부 runtime work와 transport limits를 다룹니다. process drain과 signal shutdown은 다음 Thread, external k6/Toxiproxy와 DB pool error containment는 마지막 Thread로 분리합니다.

### 직접 연결되는 불변식

- room이 runnable일 때만 정확히 한 scheduler membership을 가지며 모든 active room은 하나의 underlying fixed-step clock을 공유합니다.
- client heartbeat·input budget·snapshot buffer는 connection/user scope에 맞춰 생성·이전·해제됩니다.
- authoritative simulation은 20 Hz를 유지하고 normal snapshot delivery는 10 Hz로 분산됩니다.
- send callback 지연은 congestion이 아니며 실제 queued bytes와 frame size만 bounded transport failure를 결정합니다.

## 2. 핵심 질문

- primitive start/stop/release가 ready, pause, reconnect, replacement, finish, close 경로에 어떻게 연결됩니까?
- room별 timer에서 shared timer로 ownership이 이동할 때 runnable membership을 누가 결정합니까?
- 20 Hz simulation과 10 Hz snapshot delivery를 분리하면서 terminal event는 어떻게 보존합니까?
- callback completion, `bufferedAmount`, frame `maxPayload`는 각각 어느 layer가 소유하는 신호입니까?

## 3. 완료 기준

- Commit map의 모든 SHA를 `web/ft_transcendence` ancestry에서 확인합니다.
- 각 SHA의 parent 또는 직전 관련 SHA와 비교해 당시 상태만 설명합니다.
- 파일, symbol, caller/callee, 상태 mutation, ownership, cleanup, failure branch를 실제 코드로 기록합니다.
- Fix는 이전 가정과 root cause를, test/benchmark는 production path와 증명·비증명 범위를 연결합니다.
- 실행하지 않은 command나 benchmark 수치를 runtime evidence로 기록하지 않습니다.
- 마지막 selected SHA까지만 사용해 Thread 최종 owner, invariant, execution flow를 작성합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Thread 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `a6a1f4fba60e` | `feat(game): fixed-step scheduler를 GameHub에 연결` | A | SIMULATION, REALTIME, OBSERVABILITY | 각 room의 direct interval을 `FixedStepScheduler`로 교체해 simulation time owner를 명시합니다. |
| 2 | `fc2a4451eed1` | `feat(game): heartbeat와 input gate를 GameHub에 연결` | A | PROTOCOL, REALTIME, RISK | connection별 heartbeat와 shared input gate를 GameHub client lifecycle·message path에 통합합니다. |
| 3 | `49ca3e778801` | `feat(game): latest snapshot buffer를 GameHub에 연결` | A | PROTOCOL, REALTIME, RISK | 고빈도 snapshot만 client별 latest buffer로 보내고 control/lifecycle event는 ordinary send path에 유지합니다. |
| 4 | `400ea1589260` | `test(game): GameHub runtime 제한 검증` | B | PROTOCOL, REALTIME, TEST | input gate가 실제 authenticated GameHub message path에서 rate-limited protocol 결과를 만드는지 검증합니다. |
| 5 | `aed88c8a93e0` | `perf(game): scheduler benchmark 실행 경계 추가` | B | REALTIME, OBSERVABILITY, PERF | room별 timer와 shared timer topology를 같은 50 ms cadence·동일 synthetic step work로 비교하는 standalone benchmark를 만듭니다. |
| 6 | `8d24b5e70837` | `perf(game): scheduler benchmark 측정 결과 출력` | B | REALTIME, OBSERVABILITY, PERF | scheduler benchmark를 runtime metadata·measurements·명시적 선택 규칙을 가진 JSON report로 완성합니다. |
| 7 | `d21a47ee92d2` | `refactor(game): shared room scheduler 추가` | A | SIMULATION, REALTIME, REFACTOR | 모든 active room을 하나의 fixed-step clock으로 구동할 수 있는 `SharedRoomScheduler` abstraction을 도입합니다. |
| 8 | `518a8368e28f` | `test(game): shared room scheduler 검증` | B | REALTIME, TEST | 하나의 timer ownership, room 등록·해제, tick 중 membership 변경을 deterministic time으로 검증합니다. |
| 9 | `fb5b1abc97f5` | `refactor(game): GameHub가 shared room scheduler 사용` | A | SIMULATION, REALTIME, REFACTOR | simulation timing ownership을 room별 scheduler에서 GameHub가 소유한 단일 shared scheduler로 이전합니다. |
| 10 | `69fb44d2f0ca` | `test(game): shared scheduler lifecycle 검증` | A | AUTH, SIMULATION, REALTIME | connection loss·reconnect·finish 동안 GameHub의 shared scheduler membership과 cleanup 전이를 검증합니다. |
| 11 | `ad482c200cea` | `fix(game): 부하 중 snapshot cadence 안정화` | A | SIMULATION, REALTIME, PERF | authoritative simulation은 20 Hz로 유지하면서 client snapshot delivery를 10 Hz로 낮추고 room별 slot을 분산합니다. |
| 12 | `db1ae3d47b96` | `test(load): 기본 부하 병목 구간 검증` | B | SIMULATION, REALTIME, OPERATIONS | 여러 room에서 20 Hz simulation과 staggered 10 Hz snapshot delivery가 분리되는지 deterministic GameHub tests로 검증합니다. |
| 13 | `d90f17fa765d` | `fix(game): callback 지연을 snapshot congestion으로 오판하지 않음` | A | REALTIME, PERF, RISK | outstanding WebSocket send callback을 congestion 신호에서 제거하고 실제 `bufferedAmount`만 transport pressure로 사용합니다. |
| 14 | `5cd54767858f` | `test(game): callback 지연과 실제 congestion 구분` | A | REALTIME, PERF, TEST | delayed send callback은 정상 delivery로, 높은 `bufferedAmount`는 실제 congestion으로 처리되는지 분리해 검증합니다. |
| 15 | `8ea18a1b92db` | `fix(realtime): WebSocket transport payload 상한 설정` | A | AUTH, REALTIME, RISK | application pre-auth limit과 동일한 8 KiB를 underlying `ws` server의 `maxPayload`에 설정합니다. |
| 16 | `1afec49052b6` | `test(realtime): oversized WebSocket frame 거부 검증` | B | AUTH, REALTIME, TEST | 실제 server/socket 경로에서 8,193-byte frame이 close code 1009로 거부되는지 검증합니다. |

## 5. Commit별 학습 기록

### 5.1. `feat(game): fixed-step scheduler를 GameHub에 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `a6a1f4fba60e` |
| Importance | A |
| Tags | SIMULATION, REALTIME, OBSERVABILITY |
| Source에서 확정된 역할 | 각 room의 direct interval을 `FixedStepScheduler`로 교체해 simulation time owner를 명시합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/gameHub.ts`, `apps/api/src/game/fixedStepScheduler.ts`
- 핵심 symbol: room의 scheduler field, `startGame`, pause/resume/finalize cleanup 경로
- room 생성 시 scheduler가 어떤 step callback을 캡처하고 simulation state를 갱신하는지 확인합니다.
- waiting→playing에서 `start`, disconnect/pause에서 `stop`, reconnect/resume에서 재시작하는 호출 위치를 추적합니다.
- score terminal, persistence failure, room cleanup 경로가 scheduler를 중지하는지 확인합니다.
- 한 room당 여전히 하나의 underlying timer를 소유한다는 topology 한계를 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:a6a1f4fba60e:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 해결하려던 문제와 위험 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 핵심 구현 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 입력 → 상태 전이 → 출력 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership/lifetime/cleanup | [해당 SHA의 파일·심볼·조건으로 작성] |
| failure/rollback/retry | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:a6a1f4fba60e:record -->




#### 비교 기준

- 이 commit의 parent 상태와 비교합니다.
- 다음 관련 SHA: `fc2a4451eed1` — `feat(game): heartbeat와 input gate를 GameHub에 연결`

### 5.2. `feat(game): heartbeat와 input gate를 GameHub에 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `fc2a4451eed1` |
| Importance | A |
| Tags | PROTOCOL, REALTIME, RISK |
| Source에서 확정된 역할 | connection별 heartbeat와 shared input gate를 GameHub client lifecycle·message path에 통합합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/gameHub.ts`, `apps/api/src/game/connectionHeartbeat.ts`, `apps/api/src/game/inputGate.ts`
- 핵심 symbol: `GameHub.connect`, client record의 `heartbeat`, input event handler, disconnect/replacement cleanup
- 새 client 생성 시 heartbeat start와 pong/activity acknowledge가 어디서 연결되는지 확인합니다.
- validated `game.input`이 membership/room/side 확인 뒤 `InputGate.accept`를 통과하는 순서를 확인합니다.
- rate 거부가 stable `rate_limited` protocol error로 바뀌고 stale input은 어떤 방식으로 무시되는지 확인합니다.
- 마지막 user connection이 사라질 때만 `releaseUser`를 호출해 replacement가 budget state를 잘못 지우지 않는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:fc2a4451eed1:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 해결하려던 문제와 위험 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 핵심 구현 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 입력 → 상태 전이 → 출력 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership/lifetime/cleanup | [해당 SHA의 파일·심볼·조건으로 작성] |
| failure/rollback/retry | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:fc2a4451eed1:record -->




#### 비교 기준

- 직전 관련 SHA: `a6a1f4fba60e` — `feat(game): fixed-step scheduler를 GameHub에 연결`
- 다음 관련 SHA: `49ca3e778801` — `feat(game): latest snapshot buffer를 GameHub에 연결`

### 5.3. `feat(game): latest snapshot buffer를 GameHub에 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `49ca3e778801` |
| Importance | A |
| Tags | PROTOCOL, REALTIME, RISK |
| Source에서 확정된 역할 | 고빈도 snapshot만 client별 latest buffer로 보내고 control/lifecycle event는 ordinary send path에 유지합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/gameHub.ts`, `apps/api/src/game/latestSnapshotBuffer.ts`
- 핵심 symbol: client record의 `snapshots`, snapshot broadcast path, ordinary `send`, client cleanup
- `game.snapshot`만 `LatestSnapshotBuffer.enqueue`로 라우팅되고 queue/error/finished 같은 control event는 직접 send되는지 확인합니다.
- client 생성 시 buffer observer와 socket을 결합하고 close/replacement에서 `snapshots.close()`를 호출하는지 확인합니다.
- ordinary event가 hard buffered threshold를 넘으면 terminate하고 send callback error가 열린 socket을 종료하는지 확인합니다.
- snapshot replacement가 room simulation이나 other-client delivery를 막지 않는지 caller loop를 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:49ca3e778801:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 해결하려던 문제와 위험 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 핵심 구현 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 입력 → 상태 전이 → 출력 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership/lifetime/cleanup | [해당 SHA의 파일·심볼·조건으로 작성] |
| failure/rollback/retry | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:49ca3e778801:record -->




#### 비교 기준

- 직전 관련 SHA: `fc2a4451eed1` — `feat(game): heartbeat와 input gate를 GameHub에 연결`
- 다음 관련 SHA: `400ea1589260` — `test(game): GameHub runtime 제한 검증`

### 5.4. `test(game): GameHub runtime 제한 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `400ea1589260` |
| Importance | B |
| Tags | PROTOCOL, REALTIME, TEST |
| Source에서 확정된 역할 | input gate가 실제 authenticated GameHub message path에서 rate-limited protocol 결과를 만드는지 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/gameHub.runtime.test.ts`
- 핵심 symbol: fake socket, AI room setup, `game.input` burst, parsed server errors
- fake socket을 GameHub에 연결하고 AI room을 ready/playing으로 만드는 setup을 확인합니다.
- 연속 9개 input 중 burst 8 이후 stable `rate_limited` error가 한 번 발생하는지 확인합니다.
- unit `InputGate`가 아니라 message parsing·room membership·send path까지 통과하는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:400ea1589260:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태와 문제 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 구현 또는 검증 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 실행/검증 경로 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership과 failure 처리 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:400ea1589260:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:400ea1589260:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | [unit/integration/process/load/benchmark/failure injection 중 실제 기법 작성] |
| 주입·재현 방식 | [입력·시각·오류·동시성·transport 상태 작성] |
| 증명하는 것 | [실제 production path와 assertion 작성] |
| 증명하지 않는 것 | [실행 범위 밖의 보장 작성] |
<!-- LEARNER-END:400ea1589260:test -->



#### 비교 기준

- 직전 관련 SHA: `49ca3e778801` — `feat(game): latest snapshot buffer를 GameHub에 연결`
- 다음 관련 SHA: `aed88c8a93e0` — `perf(game): scheduler benchmark 실행 경계 추가`

### 5.5. `perf(game): scheduler benchmark 실행 경계 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `aed88c8a93e0` |
| Importance | B |
| Tags | REALTIME, OBSERVABILITY, PERF |
| Source에서 확정된 역할 | room별 timer와 shared timer topology를 같은 50 ms cadence·동일 synthetic step work로 비교하는 standalone benchmark를 만듭니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `tests/load/scheduler-benchmark.mjs`
- 핵심 symbol: `measure(strategy, roomCount)`, `simulateRoomStep`, percentile helpers
- room counts 1/20/50/100, 50 ms timestep, 250 ms warmup, 기본 1.5초 duration과 3 repeats 설정을 확인합니다.
- `room` 전략은 room마다 interval을 만들고 `shared` 전략은 하나의 interval에서 모든 room을 순회하는지 확인합니다.
- 두 전략이 같은 `simulateRoomStep` work를 수행하며 p95/p99 lag sample을 어떻게 수집하는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:aed88c8a93e0:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태와 문제 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 구현 또는 검증 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 실행/검증 경로 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership과 failure 처리 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:aed88c8a93e0:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:aed88c8a93e0:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | [unit/integration/process/load/benchmark/failure injection 중 실제 기법 작성] |
| 주입·재현 방식 | [입력·시각·오류·동시성·transport 상태 작성] |
| 증명하는 것 | [실제 production path와 assertion 작성] |
| 증명하지 않는 것 | [실행 범위 밖의 보장 작성] |
<!-- LEARNER-END:aed88c8a93e0:test -->



#### 비교 기준

- 직전 관련 SHA: `400ea1589260` — `test(game): GameHub runtime 제한 검증`
- 다음 관련 SHA: `8d24b5e70837` — `perf(game): scheduler benchmark 측정 결과 출력`

### 5.6. `perf(game): scheduler benchmark 측정 결과 출력`

| 항목 | 값 |
| --- | --- |
| SHA | `8d24b5e70837` |
| Importance | B |
| Tags | REALTIME, OBSERVABILITY, PERF |
| Source에서 확정된 역할 | scheduler benchmark를 runtime metadata·measurements·명시적 선택 규칙을 가진 JSON report로 완성합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `tests/load/scheduler-benchmark.mjs`
- 핵심 symbol: top-level measurement loop, median aggregation, `decision.selectedStrategy`
- 각 room count와 두 strategy를 기본 3회 반복하고 p95/p99의 median을 계산하는지 확인합니다.
- Node/platform/CPU/memory와 benchmark settings를 report에 포함해 결과의 실행 환경을 보존하는지 확인합니다.
- 50-room shared p95가 room p95의 105% 이하일 때 shared를 선택하는 decision rule을 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:8d24b5e70837:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태와 문제 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 구현 또는 검증 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 실행/검증 경로 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership과 failure 처리 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:8d24b5e70837:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:8d24b5e70837:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | [unit/integration/process/load/benchmark/failure injection 중 실제 기법 작성] |
| 주입·재현 방식 | [입력·시각·오류·동시성·transport 상태 작성] |
| 증명하는 것 | [실제 production path와 assertion 작성] |
| 증명하지 않는 것 | [실행 범위 밖의 보장 작성] |
<!-- LEARNER-END:8d24b5e70837:test -->



#### 비교 기준

- 직전 관련 SHA: `aed88c8a93e0` — `perf(game): scheduler benchmark 실행 경계 추가`
- 다음 관련 SHA: `d21a47ee92d2` — `refactor(game): shared room scheduler 추가`

### 5.7. `refactor(game): shared room scheduler 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `d21a47ee92d2` |
| Importance | A |
| Tags | SIMULATION, REALTIME, REFACTOR |
| Source에서 확정된 역할 | 모든 active room을 하나의 fixed-step clock으로 구동할 수 있는 `SharedRoomScheduler` abstraction을 도입합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/game/sharedRoomScheduler.ts`, `apps/api/src/game/fixedStepScheduler.ts`
- 핵심 symbol: `SharedRoomScheduler.register`, `unregister`, `stop`, room-step map
- 첫 room 등록에서 underlying scheduler가 시작되고 마지막 unregister에서 중지되는지 확인합니다.
- room ID→step callback map이 duplicate register와 unregister를 어떻게 처리하는지 확인합니다.
- tick 시작 시 callback values를 복사해 step 도중 register/unregister mutation이 현재 iteration을 깨지 않는지 확인합니다.
- `stop`이 timer와 모든 room membership을 정리하는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:d21a47ee92d2:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 해결하려던 문제와 위험 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 핵심 구현 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 입력 → 상태 전이 → 출력 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership/lifetime/cleanup | [해당 SHA의 파일·심볼·조건으로 작성] |
| failure/rollback/retry | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:d21a47ee92d2:record -->




#### 비교 기준

- 직전 관련 SHA: `8d24b5e70837` — `perf(game): scheduler benchmark 측정 결과 출력`
- 다음 관련 SHA: `518a8368e28f` — `test(game): shared room scheduler 검증`

### 5.8. `test(game): shared room scheduler 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `518a8368e28f` |
| Importance | B |
| Tags | REALTIME, TEST |
| Source에서 확정된 역할 | 하나의 timer ownership, room 등록·해제, tick 중 membership 변경을 deterministic time으로 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/game/sharedRoomScheduler.test.ts`
- 핵심 symbol: fake timers, registered room callbacks, timer count/lifecycle assertions
- 두 room을 등록해도 underlying interval 하나만 존재하는지 확인합니다.
- 한 room 해제 뒤 다른 room은 계속 step하고 마지막 room 해제에서 timer가 중지되는지 확인합니다.
- 첫 callback이 tick 중 unregister를 수행해도 뒤 callback이 skip되지 않는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:518a8368e28f:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태와 문제 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 구현 또는 검증 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 실행/검증 경로 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership과 failure 처리 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:518a8368e28f:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:518a8368e28f:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | [unit/integration/process/load/benchmark/failure injection 중 실제 기법 작성] |
| 주입·재현 방식 | [입력·시각·오류·동시성·transport 상태 작성] |
| 증명하는 것 | [실제 production path와 assertion 작성] |
| 증명하지 않는 것 | [실행 범위 밖의 보장 작성] |
<!-- LEARNER-END:518a8368e28f:test -->



#### 비교 기준

- 직전 관련 SHA: `d21a47ee92d2` — `refactor(game): shared room scheduler 추가`
- 다음 관련 SHA: `fb5b1abc97f5` — `refactor(game): GameHub가 shared room scheduler 사용`

### 5.9. `refactor(game): GameHub가 shared room scheduler 사용`

| 항목 | 값 |
| --- | --- |
| SHA | `fb5b1abc97f5` |
| Importance | A |
| Tags | SIMULATION, REALTIME, REFACTOR |
| Source에서 확정된 역할 | simulation timing ownership을 room별 scheduler에서 GameHub가 소유한 단일 shared scheduler로 이전합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/gameHub.ts`, `apps/api/src/game/sharedRoomScheduler.ts`
- 핵심 symbol: GameHub의 `roomScheduler`, room schedule/unschedule helpers, `liveStats().scheduledRooms` 관련 경로
- room object에서 per-room scheduler state가 제거되고 GameHub constructor가 하나의 `SharedRoomScheduler`를 소유하는지 확인합니다.
- ready/play, disconnect/pause, reconnect/resume, abandon, finalization, room removal의 모든 경로에서 register/unregister가 대칭인지 추적합니다.
- 동일 room의 중복 등록과 stale cleanup이 scheduler membership을 어떻게 보존하는지 확인합니다.
- `GameHub.close` 또는 최종 cleanup이 shared scheduler를 중지하는지 당시 구현 범위를 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:fb5b1abc97f5:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 해결하려던 문제와 위험 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 핵심 구현 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 입력 → 상태 전이 → 출력 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership/lifetime/cleanup | [해당 SHA의 파일·심볼·조건으로 작성] |
| failure/rollback/retry | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:fb5b1abc97f5:record -->




#### 비교 기준

- 직전 관련 SHA: `518a8368e28f` — `test(game): shared room scheduler 검증`
- 다음 관련 SHA: `69fb44d2f0ca` — `test(game): shared scheduler lifecycle 검증`

### 5.10. `test(game): shared scheduler lifecycle 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `69fb44d2f0ca` |
| Importance | A |
| Tags | AUTH, SIMULATION, REALTIME |
| Source에서 확정된 역할 | connection loss·reconnect·finish 동안 GameHub의 shared scheduler membership과 cleanup 전이를 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/gameHub.reconnect.test.ts`
- 핵심 symbol: fake socket/repository, scheduled room count, reconnect/finish transition assertions
- 두 player를 room에 연결하고 ready 이후 scheduled room count가 1이 되는 setup을 확인합니다.
- 한 connection이 끊겨 room이 paused/reserved 상태가 될 때 membership이 0으로 내려가는지 확인합니다.
- 같은 user의 reconnect가 기존 side를 회복한 뒤 membership이 다시 1이 되고 새 room을 만들지 않는지 확인합니다.
- match finish/finalization 뒤 membership이 0이고 persistence가 한 번만 실행되는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:69fb44d2f0ca:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 해결하려던 문제와 위험 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 핵심 구현 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 입력 → 상태 전이 → 출력 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership/lifetime/cleanup | [해당 SHA의 파일·심볼·조건으로 작성] |
| failure/rollback/retry | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:69fb44d2f0ca:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:69fb44d2f0ca:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | [unit/integration/process/load/benchmark/failure injection 중 실제 기법 작성] |
| 주입·재현 방식 | [입력·시각·오류·동시성·transport 상태 작성] |
| 증명하는 것 | [실제 production path와 assertion 작성] |
| 증명하지 않는 것 | [실행 범위 밖의 보장 작성] |
<!-- LEARNER-END:69fb44d2f0ca:test -->



#### 비교 기준

- 직전 관련 SHA: `fb5b1abc97f5` — `refactor(game): GameHub가 shared room scheduler 사용`
- 다음 관련 SHA: `ad482c200cea` — `fix(game): 부하 중 snapshot cadence 안정화`

### 5.11. `fix(game): 부하 중 snapshot cadence 안정화`

| 항목 | 값 |
| --- | --- |
| SHA | `ad482c200cea` |
| Importance | A |
| Tags | SIMULATION, REALTIME, PERF |
| Source에서 확정된 역할 | authoritative simulation은 20 Hz로 유지하면서 client snapshot delivery를 10 Hz로 낮추고 room별 slot을 분산합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/gameHub.ts`, `apps/api/src/observability.ts`
- 핵심 symbol: shared tick sequence, snapshot divisor/room delivery slot, finalization observer counters
- 50 ms simulation step은 그대로 실행하면서 snapshot 생성/전송은 매 두 번째 tick에만 수행하는지 확인합니다.
- room ID 또는 등록 순서에서 alternating delivery slot을 정해 같은 tick의 snapshot burst를 분산하는지 확인합니다.
- terminal/finished event가 reduced snapshot cadence 때문에 지연되거나 누락되지 않는지 별도 control path를 확인합니다.
- finalization metrics가 created/duplicate 의미를 구분하도록 함께 조정된 부분을 실제 diff에서 분리해 기록합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:ad482c200cea:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 해결하려던 문제와 위험 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 핵심 구현 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 입력 → 상태 전이 → 출력 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership/lifetime/cleanup | [해당 SHA의 파일·심볼·조건으로 작성] |
| failure/rollback/retry | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:ad482c200cea:record -->


#### Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:ad482c200cea:fix -->
이전 가정 → 실제 failure/risk → root cause → 수정된 invariant/결정 → 변경된 코드 → regression evidence를 해당 SHA와 관련 이전/후속 SHA로 연결해 작성합니다.
<!-- LEARNER-END:ad482c200cea:fix -->


#### 비교 기준

- 직전 관련 SHA: `69fb44d2f0ca` — `test(game): shared scheduler lifecycle 검증`
- 다음 관련 SHA: `db1ae3d47b96` — `test(load): 기본 부하 병목 구간 검증`

### 5.12. `test(load): 기본 부하 병목 구간 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `db1ae3d47b96` |
| Importance | B |
| Tags | SIMULATION, REALTIME, OPERATIONS |
| Source에서 확정된 역할 | 여러 room에서 20 Hz simulation과 staggered 10 Hz snapshot delivery가 분리되는지 deterministic GameHub tests로 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/gameHub.snapshotCadence.test.ts`, `apps/api/src/gameHub.reconnect.test.ts`, `apps/api/src/observability.finalization.test.ts`, `tests/load/*` 관련 조정
- 핵심 symbol: 두 AI room fake-timer scenario, snapshot counts, finalization observer assertions
- 두 active room을 만들고 네 simulation ticks 동안 각 room이 두 snapshot만 받는지 확인합니다.
- 두 room의 delivery slot이 번갈아 실행돼 한 shared tick에 한 room delivery만 발생하는지 확인합니다.
- simulation state는 네 번 advance하면서 snapshot count만 두 번인지 구분합니다.
- finalization observer가 created/duplicate 결과를 실제 production callback에서 어떻게 기록하는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:db1ae3d47b96:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태와 문제 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 구현 또는 검증 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 실행/검증 경로 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership과 failure 처리 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:db1ae3d47b96:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:db1ae3d47b96:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | [unit/integration/process/load/benchmark/failure injection 중 실제 기법 작성] |
| 주입·재현 방식 | [입력·시각·오류·동시성·transport 상태 작성] |
| 증명하는 것 | [실제 production path와 assertion 작성] |
| 증명하지 않는 것 | [실행 범위 밖의 보장 작성] |
<!-- LEARNER-END:db1ae3d47b96:test -->



#### 비교 기준

- 직전 관련 SHA: `ad482c200cea` — `fix(game): 부하 중 snapshot cadence 안정화`
- 다음 관련 SHA: `d90f17fa765d` — `fix(game): callback 지연을 snapshot congestion으로 오판하지 않음`

### 5.13. `fix(game): callback 지연을 snapshot congestion으로 오판하지 않음`

| 항목 | 값 |
| --- | --- |
| SHA | `d90f17fa765d` |
| Importance | A |
| Tags | REALTIME, PERF, RISK |
| Source에서 확정된 역할 | outstanding WebSocket send callback을 congestion 신호에서 제거하고 실제 `bufferedAmount`만 transport pressure로 사용합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/game/latestSnapshotBuffer.ts`
- 핵심 symbol: `LatestSnapshotBuffer.flush`, 제거된 `sending` gate, send callback continuation
- parent에서 `sending`이 flush/retry/congestion elapsed에 어떤 영향을 주는지 비교합니다.
- 수정 후 outstanding callback이 있어도 `bufferedAmount`가 낮으면 후속 latest snapshot을 보낼 수 있는지 확인합니다.
- soft/hard thresholds와 congestion deadline은 그대로 `bufferedAmount`에만 적용되는지 확인합니다.
- 여러 callback 완료 순서가 pending snapshot cleanup과 close state를 깨지 않는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:d90f17fa765d:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 해결하려던 문제와 위험 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 핵심 구현 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 입력 → 상태 전이 → 출력 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership/lifetime/cleanup | [해당 SHA의 파일·심볼·조건으로 작성] |
| failure/rollback/retry | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:d90f17fa765d:record -->


#### Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:d90f17fa765d:fix -->
이전 가정 → 실제 failure/risk → root cause → 수정된 invariant/결정 → 변경된 코드 → regression evidence를 해당 SHA와 관련 이전/후속 SHA로 연결해 작성합니다.
<!-- LEARNER-END:d90f17fa765d:fix -->


#### 비교 기준

- 직전 관련 SHA: `db1ae3d47b96` — `test(load): 기본 부하 병목 구간 검증`
- 다음 관련 SHA: `5cd54767858f` — `test(game): callback 지연과 실제 congestion 구분`

### 5.14. `test(game): callback 지연과 실제 congestion 구분`

| 항목 | 값 |
| --- | --- |
| SHA | `5cd54767858f` |
| Importance | A |
| Tags | REALTIME, PERF, TEST |
| Source에서 확정된 역할 | delayed send callback은 정상 delivery로, 높은 `bufferedAmount`는 실제 congestion으로 처리되는지 분리해 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/game/latestSnapshotBuffer.test.ts`
- 핵심 symbol: 수동 callback completion fake socket, bufferedAmount pressure cases, delivered/drop/terminate spies
- `bufferedAmount=0`인 채 여러 send callbacks를 지연하고 snapshots가 drop/terminate 없이 전송되는지 확인합니다.
- callbacks를 순서와 다르게 완료해도 buffer state가 깨지지 않는지 확인합니다.
- soft pressure에서는 latest one value만 유지되고 pressure 해제 뒤 전달되는 기존 semantics가 남는지 확인합니다.
- hard/time congestion tests가 callback delay case와 명확히 분리되는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:5cd54767858f:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 해결하려던 문제와 위험 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 핵심 구현 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 입력 → 상태 전이 → 출력 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership/lifetime/cleanup | [해당 SHA의 파일·심볼·조건으로 작성] |
| failure/rollback/retry | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:5cd54767858f:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:5cd54767858f:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | [unit/integration/process/load/benchmark/failure injection 중 실제 기법 작성] |
| 주입·재현 방식 | [입력·시각·오류·동시성·transport 상태 작성] |
| 증명하는 것 | [실제 production path와 assertion 작성] |
| 증명하지 않는 것 | [실행 범위 밖의 보장 작성] |
<!-- LEARNER-END:5cd54767858f:test -->

#### Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:5cd54767858f:fix -->
이전 가정 → 실제 failure/risk → root cause → 수정된 invariant/결정 → 변경된 코드 → regression evidence를 해당 SHA와 관련 이전/후속 SHA로 연결해 작성합니다.
<!-- LEARNER-END:5cd54767858f:fix -->


#### 비교 기준

- 직전 관련 SHA: `d90f17fa765d` — `fix(game): callback 지연을 snapshot congestion으로 오판하지 않음`
- 다음 관련 SHA: `8ea18a1b92db` — `fix(realtime): WebSocket transport payload 상한 설정`

### 5.15. `fix(realtime): WebSocket transport payload 상한 설정`

| 항목 | 값 |
| --- | --- |
| SHA | `8ea18a1b92db` |
| Importance | A |
| Tags | AUTH, REALTIME, RISK |
| Source에서 확정된 역할 | application pre-auth limit과 동일한 8 KiB를 underlying `ws` server의 `maxPayload`에 설정합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/app.ts`, `apps/api/src/ws-ticket.test.ts`
- 핵심 symbol: WebSocket plugin options의 `maxPayload`, 기존 pre-authentication payload constant
- parent에서 application message buffer가 8 KiB를 검사해도 transport가 frame 전체를 먼저 수신하는지 확인합니다.
- plugin registration이 기존 pre-auth 상수와 동일한 `maxPayload`를 사용하는지 확인합니다.
- limit 초과 frame이 application JSON parser나 auth buffer에 도달하기 전에 `ws` close 1009로 종료되는지 확인합니다.
- text/binary frame 모두 transport limit 적용 범위에 포함되는지 library boundary를 실제 설정으로 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:8ea18a1b92db:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 해결하려던 문제와 위험 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 핵심 구현 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 입력 → 상태 전이 → 출력 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership/lifetime/cleanup | [해당 SHA의 파일·심볼·조건으로 작성] |
| failure/rollback/retry | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:8ea18a1b92db:record -->


#### Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:8ea18a1b92db:fix -->
이전 가정 → 실제 failure/risk → root cause → 수정된 invariant/결정 → 변경된 코드 → regression evidence를 해당 SHA와 관련 이전/후속 SHA로 연결해 작성합니다.
<!-- LEARNER-END:8ea18a1b92db:fix -->


#### 비교 기준

- 직전 관련 SHA: `5cd54767858f` — `test(game): callback 지연과 실제 congestion 구분`
- 다음 관련 SHA: `1afec49052b6` — `test(realtime): oversized WebSocket frame 거부 검증`

### 5.16. `test(realtime): oversized WebSocket frame 거부 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `1afec49052b6` |
| Importance | B |
| Tags | AUTH, REALTIME, TEST |
| Source에서 확정된 역할 | 실제 server/socket 경로에서 8,193-byte frame이 close code 1009로 거부되는지 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/ws-ticket.test.ts`
- 핵심 symbol: server startup, authenticated WebSocket ticket flow, oversized frame send, close event assertion
- memory repository와 real listening server를 띄우고 인증/ticket을 거쳐 WebSocket을 여는 setup을 확인합니다.
- 정확히 8,193-byte payload를 전송하고 close code 1009를 기다리는지 확인합니다.
- application error event가 아니라 transport close를 관측하며 cleanup에서 socket/app/repository를 닫는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:1afec49052b6:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태와 문제 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 구현 또는 검증 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 실행/검증 경로 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership과 failure 처리 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:1afec49052b6:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:1afec49052b6:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | [unit/integration/process/load/benchmark/failure injection 중 실제 기법 작성] |
| 주입·재현 방식 | [입력·시각·오류·동시성·transport 상태 작성] |
| 증명하는 것 | [실제 production path와 assertion 작성] |
| 증명하지 않는 것 | [실행 범위 밖의 보장 작성] |
<!-- LEARNER-END:1afec49052b6:test -->



#### 비교 기준

- 직전 관련 SHA: `8ea18a1b92db` — `fix(realtime): WebSocket transport payload 상한 설정`
- 이 Thread의 마지막 selected SHA입니다.

## 6. 불변식의 변화

<!-- LEARNER-BEGIN:04-gamehub-runtime-integration-shared-scheduling-and-congestion.md:evolution -->
[각 불변식이 도입·확장·부족 판정·수정·회귀 보호된 SHA를 순서대로 작성합니다.]
<!-- LEARNER-END:04-gamehub-runtime-integration-shared-scheduling-and-congestion.md:evolution -->

## 7. Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:04-gamehub-runtime-integration-shared-scheduling-and-congestion.md:failure-links -->
[실패 또는 위험 → 원인 → 수정 SHA → 검증 SHA 관계를 작성합니다.]
<!-- LEARNER-END:04-gamehub-runtime-integration-shared-scheduling-and-congestion.md:failure-links -->

## 8. Ownership·state·cleanup 변화

<!-- LEARNER-BEGIN:04-gamehub-runtime-integration-shared-scheduling-and-congestion.md:ownership -->
[초기 owner와 최종 owner, 생성·이전·해제 시점을 실제 symbol로 작성합니다.]
<!-- LEARNER-END:04-gamehub-runtime-integration-shared-scheduling-and-congestion.md:ownership -->

## 9. Thread 최종 상태

<!-- LEARNER-BEGIN:04-gamehub-runtime-integration-shared-scheduling-and-congestion.md:final-state -->
[마지막 selected SHA에서 보장되는 상태와 남은 non-guarantee를 작성합니다.]
<!-- LEARNER-END:04-gamehub-runtime-integration-shared-scheduling-and-congestion.md:final-state -->

## 10. 최종 실행 흐름

<!-- LEARNER-BEGIN:04-gamehub-runtime-integration-shared-scheduling-and-congestion.md:final-flow -->
[입력 또는 lifecycle event부터 상태 전이·side effect·cleanup까지 최종 caller/callee 흐름을 작성합니다.]
<!-- LEARNER-END:04-gamehub-runtime-integration-shared-scheduling-and-congestion.md:final-flow -->

## 11. 실행 및 검증 근거

<!-- LEARNER-BEGIN:04-gamehub-runtime-integration-shared-scheduling-and-congestion.md:execution -->
- 실제로 실행한 command가 있으면 SHA, command, result를 기록합니다.
- 실행하지 못했다면 code inspection과 runtime execution을 구분하고 원인을 기록합니다.
<!-- LEARNER-END:04-gamehub-runtime-integration-shared-scheduling-and-congestion.md:execution -->

## 12. 학습 완료 확인

<!-- LEARNER-BEGIN:04-gamehub-runtime-integration-shared-scheduling-and-congestion.md:checks -->
- [ ] room별 timer에서 shared timer로 ownership이 이동한 전후를 설명할 수 있습니다.
- [ ] ready/pause/reconnect/finish마다 scheduler membership이 어떻게 변하는지 추적할 수 있습니다.
- [ ] simulation frequency와 snapshot frequency가 왜 분리됐는지 설명할 수 있습니다.
- [ ] callback delay, buffered bytes, frame size를 서로 다른 pressure signal로 구분할 수 있습니다.
- [ ] 각 fix를 해당 regression test와 연결할 수 있습니다.
<!-- LEARNER-END:04-gamehub-runtime-integration-shared-scheduling-and-congestion.md:checks -->
