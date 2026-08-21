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
| 직전 관련 상태 | fixed-step primitive는 존재했지만 GameHub room은 direct `setInterval` 기반 timing을 계속 사용해 elapsed clamp와 deterministic lifecycle cleanup이 production path에 적용되지 않았습니다. |
| 해결하려던 문제와 위험 | room state transition과 timer start/stop이 분리되면 waiting·paused·finished room이 계속 simulation work를 만들거나 reconnect 후 중복 timer가 생길 수 있습니다. |
| 핵심 구현 결정 | 각 room에 `FixedStepScheduler`를 넣고 50 ms step callback이 authoritative simulation을 진행하도록 바꿉니다. room이 playing 상태에 들어갈 때 start하고 pause/finalization/removal에서 stop합니다. |
| 입력 → 상태 전이 → 출력 | room 생성 → waiting 상태로 scheduler 보유 → 양측 ready로 playing 전이 → scheduler start → fixed step마다 simulation·snapshot/terminal 판단 → disconnect면 pause/stop → reconnect면 resume/start → finish/cleanup이면 stop입니다. |
| ownership/lifetime/cleanup | 이 단계의 timer owner는 여전히 각 room입니다. GameHub는 room lifecycle 전이 시 scheduler start/stop을 호출하고 room map에서 제거하기 전에 handle이 정리되도록 책임집니다. |
| failure/rollback/retry | simulation callback 또는 finish 비동기 작업의 오류가 room timer를 남기지 않도록 terminal/cleanup 경로에서 stop합니다. 다만 room 수만큼 timer가 늘어나는 topology는 해결하지 않습니다. |
| 보장하는 것 | 실제 GameHub simulation도 50 ms fixed-step clamp를 사용하고 room lifecycle과 timer 상태가 연결됩니다. |
| 보장하지 않는 것 | active room N개가 N개의 scheduler/timer를 소유합니다. 전역 event-loop wakeup과 room iteration 비용은 아직 중앙화되지 않습니다. |
| 후속 연결 | `400ea1589260`이 전체 runtime boundary를 검증하고, `d21a47ee92d2`/`fb5b1abc97f5`가 timer ownership을 shared scheduler로 이전합니다. |
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
| 직전 관련 상태 | heartbeat와 input gate는 unit 수준으로만 존재해 실제 socket은 timeout되지 않았고 GameHub는 input ordering/rate state를 사용하지 않았습니다. |
| 해결하려던 문제와 위험 | primitive를 잘못 배치하면 unauthenticated/unauthorized input이 budget을 소모하거나, connection replacement 때 old socket cleanup이 new socket의 heartbeat/input state까지 제거할 수 있습니다. |
| 핵심 구현 결정 | client record에 heartbeat를 넣어 connect 시 start하고 close/replacement에서 stop합니다. input handler는 protocol validation과 room ownership을 확인한 뒤 InputGate를 호출하며 rate exhaustion만 client-visible error로 반환합니다. |
| 입력 → 상태 전이 → 출력 | authenticated connect → client/heartbeat 생성·start → message parse·membership 확인 → input gate stale/rate/accept 판정 → accept된 direction만 simulation state에 반영 → pong은 acknowledge → close에서 heartbeat stop, 마지막 connection이면 user gate release입니다. |
| ownership/lifetime/cleanup | heartbeat는 client별, InputGate의 bucket은 user별입니다. GameHub가 둘의 lifecycle adapter이며 connection replacement 시 old client만 stop하고 user-level state는 authoritative connection 존재 여부에 따라 유지합니다. |
| failure/rollback/retry | ping/timeout은 socket terminate로, rate 초과는 protocol `rate_limited`로, stale input은 state 변경 없이 종료됩니다. malformed/forbidden message는 input gate 이전 경계에서 거부됩니다. |
| 보장하는 것 | production WebSocket 경로에서 liveness와 bounded input admission이 실제로 적용되고 cleanup scope가 client/user로 구분됩니다. |
| 보장하지 않는 것 | snapshot delivery는 아직 ordinary send path이고 slow-client backlog는 해결되지 않습니다. |
| 후속 연결 | `49ca3e778801`이 snapshot buffer를 같은 client lifecycle에 추가하고 `400ea1589260`이 input throttling을 end-to-end 검증합니다. |
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
| 직전 관련 상태 | 모든 server event가 같은 direct send path를 사용해 snapshot burst가 느린 client의 queue를 누적시킬 수 있었습니다. |
| 해결하려던 문제와 위험 | snapshot은 latest state만 중요하지만 queue match, error, game finished 같은 control event는 손실시키면 lifecycle이 깨집니다. 두 종류를 같은 drop 정책으로 처리할 수 없습니다. |
| 핵심 구현 결정 | client마다 `LatestSnapshotBuffer`를 만들고 snapshot event만 enqueue합니다. control event는 direct send를 유지하되 transport hard pressure와 callback error에서 connection을 종료합니다. |
| 입력 → 상태 전이 → 출력 | simulation tick → snapshot event 생성 → 각 client의 latest buffer enqueue/replace/retry; control event → ordinary send → callback 완료/오류 처리; client close → heartbeat와 snapshot buffer 모두 close입니다. |
| ownership/lifetime/cleanup | GameHub client record가 heartbeat와 snapshots 두 transport resource를 함께 소유합니다. snapshot buffer는 pending/retry를, ordinary send는 해당 호출의 callback을 소유합니다. |
| failure/rollback/retry | snapshot은 soft/hard congestion 규칙을 적용하고, control event는 hard pressure나 send 오류에서 socket을 종료해 silent lifecycle loss를 피합니다. |
| 보장하는 것 | 고빈도 state update backlog는 latest-value로 제한되면서 필수 control event는 임의 drop되지 않습니다. |
| 보장하지 않는 것 | 최초 buffer의 `sending` 오판이 그대로 통합되며, room별 timer topology도 유지됩니다. |
| 후속 연결 | `d90f17fa765d`가 callback pressure 가정을 수정하고 `8ea18a1b92db`가 frame 자체의 transport size 상한을 추가합니다. |
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
| 직전 관련 상태와 문제 | InputGate unit tests는 산술을 검증했지만 GameHub가 올바른 user/room key와 protocol error로 연결했는지는 증명하지 못했습니다. 통합 중 gate 호출 위치나 error mapping이 잘못되면 primitive가 있어도 실제 socket 경로가 제한을 우회할 수 있습니다. |
| 구현 또는 검증 결정 | memory repository와 fake socket으로 AI match를 만들고 valid input event를 burst로 주입해 outbound server event를 파싱합니다. |
| 실행/검증 경로 | connect → queue AI → ready → playing → sequence가 증가하는 input 9개 전송 → 8개 accept 후 rate-limited error 확인입니다. |
| ownership과 failure 처리 | 테스트가 socket event delivery와 repository cleanup을 소유하고, GameHub가 client heartbeat/buffer/gate cleanup을 수행합니다. 실제 full message path에서 token exhaustion을 재현하며 stale/unauthorized cases는 이 commit의 중심이 아닙니다. |
| 보장하는 것 | GameHub가 rate limit primitive를 우회하지 않고 stable protocol error로 노출함을 증명합니다. |
| 보장하지 않는 것 | real WebSocket transport, heartbeat timeout, outbound congestion은 검증하지 않습니다. |
| 후속 연결 | `fc2a4451eed1`의 integration evidence이며 이후 shared scheduler 변경과 독립적으로 input admission을 보호합니다. |
<!-- LEARNER-END:400ea1589260:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:400ea1589260:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | GameHub integration test |
| 주입·재현 방식 | fake socket과 memory repository로 실제 event parser·room setup·input handler·server error path를 실행합니다. |
| 증명하는 것 | burst 8 이후 9번째 valid input이 rate-limited로 관측됨을 증명합니다. |
| 증명하지 않는 것 | network throughput·multi-process rate limiting·persistent state는 증명하지 않습니다. |
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
| 직전 관련 상태와 문제 | room별 scheduler가 기능적으로 동작했지만 timer 수를 중앙화할 근거와 비교 가능한 측정 경계가 없었습니다. shared scheduler로의 refactor가 단순 취향이 되지 않으려면 work와 cadence를 통제한 topology 비교가 필요했습니다. |
| 구현 또는 검증 결정 | standalone Node script가 room별 interval과 shared interval을 동일한 room count·step workload로 실행하고 callback lag samples를 수집합니다. |
| 실행/검증 경로 | strategy/room count 선택 → warmup → fixed 50 ms callback에서 synthetic room work → p95/p99 sample 산출입니다. |
| ownership과 failure 처리 | benchmark가 생성한 모든 intervals를 배열로 소유하고 duration 종료 뒤 전부 clear합니다. production GameHub state는 사용하지 않습니다. 환경·CPU noise는 repeats와 warmup으로 완화하지만 제거하지 못합니다. 입력값 검증과 결과 decision 출력은 다음 commit에서 완성됩니다. |
| 보장하는 것 | 두 timer topology를 동일 조건으로 비교할 재현 가능한 실행 경계가 생깁니다. |
| 보장하지 않는 것 | 실제 simulation, socket, persistence를 실행하지 않으며 commit 자체는 측정 결과나 선택 결정을 출력하지 않습니다. |
| 후속 연결 | `8d24b5e70837`가 결과 schema와 50-room decision rule을 추가하고 `d21a47ee92d2`가 선택된 shared abstraction을 구현합니다. |
<!-- LEARNER-END:aed88c8a93e0:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:aed88c8a93e0:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | standalone microbenchmark harness |
| 주입·재현 방식 | 동일 synthetic CPU work와 50 ms cadence에서 room-per-timer와 one-shared-timer를 비교합니다. |
| 증명하는 것 | 실행 시 topology별 callback lag를 같은 harness로 측정할 수 있음을 증명합니다. |
| 증명하지 않는 것 | 이 workbook에서는 benchmark를 실행하지 않았으므로 구체 p95 수치나 우열은 runtime evidence로 주장하지 않습니다. |
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
| 직전 관련 상태와 문제 | benchmark는 samples를 반환했지만 실행 환경, 반복 집계, 선택 기준을 한 결과물로 남기지 않았습니다. 숫자만 출력하면 어떤 runtime에서 어떤 설정으로 측정했는지 재현하기 어렵고, refactor 결정 기준을 사후에 바꿀 수 있습니다. |
| 구현 또는 검증 결정 | 모든 조합을 반복 실행해 median p95/p99를 모으고 runtime/settings/measurements/decision을 JSON으로 출력합니다. 50-room 비교에서 shared p95가 room p95보다 5% 이상 악화되지 않으면 shared를 선택합니다. |
| 실행/검증 경로 | room count×strategy×repeat 실행 → run samples 집계 → median 산출 → 50-room pair 조회 → 1.05 threshold 계산 → JSON report 출력입니다. |
| ownership과 failure 처리 | script가 측정 배열과 runtime metadata를 한 report object에 모으며 production artifact나 repository state를 변경하지 않습니다. 50-room 결과가 없으면 명시적으로 throw합니다. 환경 noise와 short duration은 여전히 결과 해석의 제한입니다. |
| 보장하는 것 | scheduler 선택이 명시된 비교 규칙과 실행 metadata를 가진 재현 가능한 report 형태로 남습니다. |
| 보장하지 않는 것 | 코드가 결과 schema를 정의할 뿐 특정 machine의 수치는 invariant가 아닙니다. 이번 작업에서도 benchmark 명령을 실행하지 않았습니다. |
| 후속 연결 | `d21a47ee92d2`의 shared scheduler abstraction을 선택하는 사전 operational evidence입니다. |
<!-- LEARNER-END:8d24b5e70837:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:8d24b5e70837:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | benchmark/report contract |
| 주입·재현 방식 | 반복 median과 50-room 5% decision threshold를 source에서 확인했습니다. |
| 증명하는 것 | 실행 결과가 strategy selection을 포함한 structured JSON으로 재현될 수 있음을 증명합니다. |
| 증명하지 않는 것 | shared topology가 모든 production load에서 더 빠르다는 보편적 성능 보장은 하지 않습니다. |
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
| 직전 관련 상태 | GameHub integration은 room마다 하나의 FixedStepScheduler를 만들어 active room 수만큼 interval handles를 생성했습니다. |
| 해결하려던 문제와 위험 | room별 timer는 같은 50 ms cadence인데도 callback wakeup과 accumulator state가 room 수에 비례합니다. 한 room step이 lifecycle 중 map을 변경할 때 shared iteration 안정성도 필요합니다. |
| 핵심 구현 결정 | `SharedRoomScheduler`가 하나의 `FixedStepScheduler`와 room callback map을 소유합니다. 첫 등록 시 clock을 시작하고 매 fixed step마다 등록 callback snapshot을 순회하며 마지막 해제에서 clock을 멈춥니다. |
| 입력 → 상태 전이 → 출력 | `register(roomId, step)` → map 추가 → 첫 room이면 underlying start → tick에서 current callbacks 복사·각 step 호출 → `unregister` → map empty면 underlying stop → global `stop`은 timer와 map을 정리합니다. |
| ownership/lifetime/cleanup | timer와 accumulator는 shared scheduler 하나가 소유하고 room은 callback membership만 등록합니다. room lifecycle owner는 등록/해제를 정확히 호출해야 합니다. |
| failure/rollback/retry | step callback 중 room이 자신이나 다른 room을 해제해도 copied callback list가 iteration skip/iterator corruption을 막습니다. callback 예외 containment는 caller 설계에 의존합니다. |
| 보장하는 것 | 동일 cadence의 active rooms가 하나의 timer owner를 공유하고 등록된 callback 집합으로만 simulation work가 발생합니다. |
| 보장하지 않는 것 | 이 SHA는 abstraction만 추가하며 기존 GameHub room별 schedulers를 아직 교체하지 않습니다. |
| 후속 연결 | `518a8368e28f`가 central ownership을 검증하고 `fb5b1abc97f5`가 GameHub에 실제 적용합니다. |
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
| 직전 관련 상태와 문제 | shared scheduler abstraction은 map iteration과 first/last membership transition에 subtle lifecycle bug가 생길 수 있었습니다. tick 중 map mutation은 JavaScript iterator behavior에 기대면 room skip/duplicate step을 만들 수 있고, 마지막 room 뒤 timer가 남으면 zero-use work가 지속됩니다. |
| 구현 또는 검증 결정 | fake timer로 동일 tick의 room callbacks와 timer count를 관찰하고 callback 내부 unregister case를 재현합니다. |
| 실행/검증 경로 | room A/B 등록 → one timer assertion → tick → A callback에서 membership 변경 → B 호출 확인 → 해제 순서에 따른 timer stop 확인입니다. |
| ownership과 failure 처리 | 테스트가 timer queue를 소유하며 scheduler의 map·underlying handle cleanup을 외부 호출 수로 검증합니다. mutation-during-iteration과 last-unregister leak을 결정적으로 재현합니다. |
| 보장하는 것 | central timer와 membership snapshot iteration의 핵심 ownership 규칙을 고정합니다. |
| 보장하지 않는 것 | GameHub가 모든 room state transition에서 register/unregister를 호출하는지는 검증하지 않습니다. |
| 후속 연결 | `d21a47ee92d2`의 abstraction evidence이고 `69fb44d2f0ca`가 GameHub recovery lifecycle까지 확장합니다. |
<!-- LEARNER-END:518a8368e28f:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:518a8368e28f:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | deterministic scheduler lifecycle test |
| 주입·재현 방식 | fake timers와 callback 내 unregister로 one-timer·mutation safety를 검사합니다. |
| 증명하는 것 | first register starts, last unregister stops, tick mutation이 later room을 skip하지 않음을 증명합니다. |
| 증명하지 않는 것 | 실제 room state machine·simulation cost·socket delivery는 증명하지 않습니다. |
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
| 직전 관련 상태 | shared scheduler abstraction은 존재했지만 GameHub room은 계속 각자의 FixedStepScheduler를 소유했습니다. production timer topology는 아직 room 수에 비례했습니다. |
| 해결하려던 문제와 위험 | ownership 이전에서 한 state transition이라도 unregister를 놓치면 paused/finished room이 계속 step하고, 중복 register는 같은 room을 두 번 진행할 수 있습니다. 반대로 disconnect에서 너무 일찍 제거하면 reconnect 가능한 room이 재개되지 않습니다. |
| 핵심 구현 결정 | GameHub에 하나의 `SharedRoomScheduler`를 두고 runnable room ID와 step callback만 등록합니다. room object의 scheduler를 제거하고 lifecycle transition마다 schedule/unschedule helper를 호출합니다. |
| 입력 → 상태 전이 → 출력 | GameHub 생성 → shared scheduler 하나 생성 → room playing 시 room ID 등록 → shared tick에서 simulation step → pause/disconnect 시 해제 → valid reconnect 시 재등록 → finish/abandon/remove 시 최종 해제입니다. |
| ownership/lifetime/cleanup | GameHub가 timer topology의 유일한 owner가 됩니다. RoomSession은 legal state를 결정하고, GameHub가 그 상태에 맞춰 scheduler membership을 반영하며, shared scheduler는 callback map과 timer handle만 소유합니다. |
| failure/rollback/retry | partial room creation, disconnect, reconnect expiry, finalization failure 같은 여러 exit에서 unregister가 누락되지 않도록 removal helper에 정리 책임을 집중합니다. persistence retry가 진행 중이어도 terminal room은 simulation membership에서 분리됩니다. |
| 보장하는 것 | active runnable room 수와 무관하게 underlying fixed-step timer는 하나이며, room membership이 simulation work의 유일한 진입 조건이 됩니다. |
| 보장하지 않는 것 | snapshot cadence는 아직 모든 simulation tick과 결합돼 있고, slow send callback을 congestion으로 보는 buffer 가정도 남아 있습니다. |
| 후속 연결 | `69fb44d2f0ca`가 reconnect/finish lifecycle의 membership을 검증하고 `ad482c200cea`가 shared tick 위에서 snapshot delivery cadence를 분리합니다. |
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
| 직전 관련 상태 | shared scheduler unit test는 map과 timer만 검증했으며 GameHub의 room/reconnect state machine이 membership을 올바르게 반영하는지는 열려 있었습니다. |
| 해결하려던 문제와 위험 | reconnect는 transport ownership을 교체하면서 room은 보존하는 복합 전이입니다. pause에서 계속 step하거나 reconnect가 두 번째 membership을 만들면 simulation과 결과가 중복됩니다. |
| 핵심 구현 결정 | fake timers와 sockets로 실제 GameHub match를 만든 뒤 disconnect, reconnect, terminal finish를 순서대로 진행하고 scheduled room count와 finalization 호출을 확인합니다. |
| 입력 → 상태 전이 → 출력 | room 생성·ready → scheduled=1 → player disconnect → paused·scheduled=0 → replacement/reconnect → same room resume·scheduled=1 → terminal finish → scheduled=0·finalize once입니다. |
| ownership/lifetime/cleanup | test는 transport events와 fake time을 구동하고 GameHub가 room membership, shared timer, reconnect reservation, repository finalization을 조정합니다. |
| failure/rollback/retry | stale socket이나 duplicate reconnect가 추가 room/timer를 만들지 않는지, finish 뒤 scheduler work가 남지 않는지 확인합니다. |
| 보장하는 것 | shared scheduler ownership 이전이 실제 reconnect lifecycle과 결합돼 한 room을 한 번만 scheduling한다는 high-risk invariant를 증명합니다. |
| 보장하지 않는 것 | 다수 room의 snapshot cadence와 transport congestion behavior는 이 테스트 범위가 아닙니다. |
| 후속 연결 | `fb5b1abc97f5`의 ownership transfer를 보호하고 `db1ae3d47b96`이 multi-room cadence를 추가 검증합니다. |
<!-- LEARNER-END:69fb44d2f0ca:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:69fb44d2f0ca:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | deterministic GameHub lifecycle integration test |
| 주입·재현 방식 | fake sockets/timers/repository로 ready→disconnect→reconnect→finish 상태를 구동하고 scheduler membership을 관찰합니다. |
| 증명하는 것 | room scheduler membership 1→0→1→0, same-room recovery, finalize-once를 증명합니다. |
| 증명하지 않는 것 | 실제 network latency, process restart, PostgreSQL transaction은 증명하지 않습니다. |
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
| 직전 관련 상태 | shared scheduler가 모든 room을 같은 20 Hz tick에서 순회하고 매 tick마다 snapshot을 보내므로, 50 room에서는 동일 callback에 delivery burst가 집중됐습니다. |
| 해결하려던 문제와 위험 | simulation frequency를 낮추면 authoritative physics가 바뀌지만, snapshot을 그대로 20 Hz로 유지하면 serialization·WebSocket delivery가 event loop를 압박합니다. 모든 room을 같은 delivery tick에 보내는 것도 burst를 만듭니다. |
| 핵심 구현 결정 | simulation step은 50 ms마다 계속 수행하고 snapshot cadence만 divisor 2로 분리해 10 Hz로 만듭니다. room마다 alternating slot을 배정해 절반씩 다른 shared tick에 snapshot을 전달합니다. |
| 입력 → 상태 전이 → 출력 | shared scheduler 20 Hz tick → 모든 runnable room simulation step → room delivery slot과 tick parity 비교 → 해당 slot room만 snapshot enqueue → terminal state면 cadence와 무관하게 finish/finalization path 실행입니다. |
| ownership/lifetime/cleanup | GameHub shared tick이 simulation sequence와 delivery slot 결정을 소유합니다. `LatestSnapshotBuffer`는 선택된 snapshot의 client별 delivery만 소유하며 simulation state를 소유하지 않습니다. |
| failure/rollback/retry | 이전에는 synchronized burst가 callback lag와 snapshot drop을 늘릴 수 있었습니다. 수정은 work를 시간축에 분산하지만 transport pressure가 실제로 높은 client는 기존 buffer termination 규칙을 계속 적용합니다. |
| 보장하는 것 | physics는 20 Hz로 유지되고 normal snapshot delivery는 room당 10 Hz이며 room 간 burst가 두 slot으로 분산됩니다. |
| 보장하지 않는 것 | 10 Hz/두 slot은 현재 부하 목표에 맞춘 고정 정책입니다. send callback 지연 오판은 아직 남아 있으며 `d90f17fa765d`에서 별도로 수정됩니다. |
| 후속 연결 | `db1ae3d47b96`가 multi-room 20 Hz/10 Hz 분리를 검증하고 `547d9943d30a`가 load harness 측정 자체를 안정화합니다. |
<!-- LEARNER-END:ad482c200cea:record -->


#### Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:ad482c200cea:fix -->
이전 가정: simulation tick마다 모든 room snapshot을 보내도 된다 → 실제 위험: shared tick에 delivery burst 집중 → 수정: 20 Hz simulation과 10 Hz staggered snapshot cadence 분리 → `db1ae3d47b96` 회귀 테스트.
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
| 직전 관련 상태와 문제 | cadence fix는 구현됐지만 simulation 횟수와 delivery 횟수를 분리해 검증하는 multi-room regression이 없었습니다. 단순 snapshot count만 보면 simulation까지 10 Hz로 낮아진 버그를 놓칠 수 있고, 한 room test만으로는 slot staggering을 증명할 수 없습니다. |
| 구현 또는 검증 결정 | fake timers로 두 AI room을 동시에 구동해 simulation tick과 socket snapshot payload를 별도로 기록합니다. four ticks/two snapshots per room과 alternating aggregate delivery를 검사합니다. |
| 실행/검증 경로 | 두 room ready → fake time으로 4×50 ms advance → simulation sequence/state progress 확인 → room별 snapshot 2개와 tick별 분산 확인 → cleanup/finalization observer 확인입니다. |
| ownership과 failure 처리 | 테스트가 fake time과 fake sockets를 소유하고 GameHub shared scheduler·room slots·buffers가 실제 production path를 실행합니다. delivery burst regression, simulation cadence 저하, duplicate finalization observation을 서로 다른 assertions로 감지합니다. |
| 보장하는 것 | 20 Hz authoritative update와 10 Hz staggered delivery의 분리가 multi-room 상황에서 고정됩니다. |
| 보장하지 않는 것 | 실제 500-connection k6 throughput이나 OS event-loop p95는 실행하지 않습니다. |
| 후속 연결 | `ad482c200cea`의 fix regression이며 `547d9943d30a`는 외부 load scenario의 reconnect/finalization 측정을 추가 안정화합니다. |
<!-- LEARNER-END:db1ae3d47b96:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:db1ae3d47b96:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | deterministic multi-room load-boundary test |
| 주입·재현 방식 | fake timers와 두 AI room/fake sockets로 simulation tick과 emitted snapshot을 별도 집계합니다. |
| 증명하는 것 | 4 simulation ticks 동안 room별 2 snapshots와 alternating delivery slot을 증명합니다. |
| 증명하지 않는 것 | 실제 production load 수치, network backpressure, PostgreSQL 성능은 증명하지 않습니다. |
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
| 직전 관련 상태 | 최초 buffer는 send callback이 아직 호출되지 않은 상태를 socket buffer pressure와 동일하게 취급해 retry/congestion timer를 시작했습니다. |
| 해결하려던 문제와 위험 | `ws.send` callback 지연은 event-loop callback scheduling이나 library completion 시점일 수 있으며 `bufferedAmount`가 낮은 정상 transport에서도 발생합니다. 이를 congestion으로 보면 snapshot을 불필요하게 drop하고 5초 뒤 healthy connection을 terminate할 수 있습니다. |
| 핵심 구현 결정 | `sending`을 pressure gate에서 제거하고 flush 판단을 `socket.bufferedAmount`와 connection state에만 의존하도록 바꿉니다. callback은 error reporting과 후속 flush trigger 역할만 유지합니다. |
| 입력 → 상태 전이 → 출력 | snapshot enqueue → `bufferedAmount` hard/soft 검사 → 낮으면 outstanding callback 여부와 무관하게 send → callback 완료 시 error 처리·pending flush 재시도; pressure timer는 실제 buffered bytes가 soft limit 이상일 때만 시작합니다. |
| ownership/lifetime/cleanup | buffer는 pending latest value와 retry/congestion state를 계속 소유하지만 send callback 개수 자체를 exclusive send lock으로 소유하지 않습니다. transport가 callback completion을 비동기로 통지합니다. |
| failure/rollback/retry | 실제 buffered pressure는 기존 soft retry/hard terminate/5초 deadline으로 계속 제한됩니다. delayed callback만으로는 drop reason이나 termination이 발생하지 않습니다. |
| 보장하는 것 | callback latency와 queued-byte congestion을 구분해 정상 connection을 오판하지 않으면서 실제 outbound memory 상한은 유지합니다. |
| 보장하지 않는 것 | transport library가 `bufferedAmount`를 정확히 반영한다는 전제는 남습니다. frame 하나의 크기 상한은 아직 plugin layer에 강제되지 않습니다. |
| 후속 연결 | `5cd54767858f`가 delayed callbacks와 true pressure를 분리해 검증하고 `8ea18a1b92db`가 frame-size bound를 추가합니다. |
<!-- LEARNER-END:d90f17fa765d:record -->


#### Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:d90f17fa765d:fix -->
이전 가정: callback 미완료 == congestion → 실제 failure: 낮은 bufferedAmount에서도 callback delay로 drop/terminate → root cause: completion signal과 queued bytes 혼동 → 수정: `bufferedAmount`만 pressure source → regression `5cd54767858f`.
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
| 직전 관련 상태 | 기존 `125aa113a01c` 테스트는 delayed callback을 pressure로 취급하는 구현 기대값을 포함했습니다. |
| 해결하려던 문제와 위험 | fix가 callback gate만 제거하고 true backpressure protections까지 약화시키거나 concurrent callback completion에서 stale pending을 전송할 위험이 있었습니다. |
| 핵심 구현 결정 | fake socket에서 callbacks를 보류하되 buffered bytes는 0으로 유지하는 case와, buffered bytes를 soft/hard limit로 올리는 case를 분리합니다. observer와 termination 호출을 각각 확인합니다. |
| 입력 → 상태 전이 → 출력 | low-buffer delayed callbacks + multiple enqueue → sends continue/no congestion; callbacks complete → state clean; 별도 high-buffer case → latest replacement/retry → pressure 해제 또는 terminal threshold 결과 확인입니다. |
| ownership/lifetime/cleanup | 테스트가 callback completion과 `bufferedAmount`를 독립 제어해 두 신호의 ownership을 분리합니다. buffer cleanup은 close/pressure path에서 검증됩니다. |
| failure/rollback/retry | 과거 false-positive congestion을 직접 재현하고, 실제 soft/hard pressure regression도 동시에 보호합니다. |
| 보장하는 것 | callback delay는 congestion이 아니며 queued-byte pressure만 drop/retry/terminate를 유발한다는 수정된 invariant를 증명합니다. |
| 보장하지 않는 것 | 실제 network stack의 callback와 bufferedAmount 상관관계는 fake socket 밖에서 측정하지 않습니다. |
| 후속 연결 | `d90f17fa765d`의 root-cause fix를 보호하고 최초 `125aa113a01c`의 잘못된 가정을 의도적으로 교정합니다. |
<!-- LEARNER-END:5cd54767858f:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:5cd54767858f:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | deterministic regression/failure discrimination test |
| 주입·재현 방식 | send callback completion과 `bufferedAmount`를 독립적으로 제어하는 fake socket을 사용합니다. |
| 증명하는 것 | delayed callback no-drop/no-terminate와 true congestion latest-only/termination을 구분해 증명합니다. |
| 증명하지 않는 것 | 실제 kernel buffer behavior나 WAN latency에서의 throughput은 증명하지 않습니다. |
<!-- LEARNER-END:5cd54767858f:test -->

#### Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:5cd54767858f:fix -->
false positive를 재현하는 regression test이며, 수정 전 test expectation과 달리 low-buffer callback delay를 정상으로 고정합니다.
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
| 직전 관련 상태 | pre-auth message handler는 누적 payload 8 KiB를 제한했지만 underlying WebSocket server는 더 큰 frame을 먼저 메모리에 받아 application callback에 전달할 수 있었습니다. |
| 해결하려던 문제와 위험 | application-level length check만으로는 frame allocation과 parser 진입 전 resource consumption을 막지 못합니다. 인증 전 공격자가 oversized frame을 반복할 수 있었습니다. |
| 핵심 구현 결정 | Fastify WebSocket/`ws` server registration에 `maxPayload`를 기존 8 KiB 상수로 설정해 transport parser 자체가 oversized frame을 거부하도록 합니다. |
| 입력 → 상태 전이 → 출력 | client frame 수신 → `ws` parser가 frame size와 8 KiB maxPayload 비교 → 초과면 application handler 호출 없이 protocol close 1009 → 허용 크기만 pre-auth/authenticated message path로 전달됩니다. |
| ownership/lifetime/cleanup | frame-size enforcement는 application buffer가 아니라 transport server가 소유합니다. application은 여전히 인증 전 메시지 수·누적 상태와 schema validation을 소유합니다. |
| failure/rollback/retry | 8,193-byte frame은 transport close로 종료돼 JSON parsing, ticket lookup, GameHub connect에 도달하지 않습니다. |
| 보장하는 것 | single WebSocket frame이 8 KiB를 넘으면 allocation 이후 application processing으로 확대되지 않고 protocol-level rejection을 받습니다. |
| 보장하지 않는 것 | 허용 크기 이하의 다수 frame, decompression 설정, connection 수 자체는 다른 limit가 소유합니다. |
| 후속 연결 | `1afec49052b6`가 실제 authenticated WebSocket으로 8,193-byte close 1009를 검증합니다. |
<!-- LEARNER-END:8ea18a1b92db:record -->


#### Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:8ea18a1b92db:fix -->
이전 가정: application payload check면 충분 → 실제 risk: transport가 oversized frame을 먼저 수신 → 수정: `ws.maxPayload=8 KiB` → real-socket regression `1afec49052b6`.
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
| 직전 관련 상태와 문제 | `maxPayload` 설정은 있었지만 Fastify plugin과 실제 `ws` server까지 전달되는지 unit inspection만으로 확정하기 어려웠습니다. framework option wiring이 잘못되면 설정이 존재해도 real transport는 default limit를 사용할 수 있습니다. |
| 구현 또는 검증 결정 | 실제 local WebSocket connection을 인증한 뒤 limit보다 1 byte 큰 frame을 보내 protocol close event를 검사합니다. |
| 실행/검증 경로 | app listen → HTTP auth/ticket → WebSocket upgrade → 8,193-byte send → `ws` parser rejection → client close code 1009 → resources close입니다. |
| ownership과 failure 처리 | 테스트가 실제 process-local server/socket lifetime을 소유하고 after cleanup에서 열린 handles를 닫습니다. transport parser의 message-too-big path를 실제 frame으로 재현합니다. |
| 보장하는 것 | 8 KiB 설정이 framework에서 real WebSocket transport까지 적용됨을 증명합니다. |
| 보장하지 않는 것 | 8,192-byte boundary acceptance, compressed frame amplification, distributed ingress limits은 이 테스트가 증명하지 않습니다. |
| 후속 연결 | `8ea18a1b92db`의 transport-layer fix를 직접 보호합니다. |
<!-- LEARNER-END:1afec49052b6:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:1afec49052b6:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | real-socket integration regression test |
| 주입·재현 방식 | 인증된 실제 WebSocket에 8,193-byte frame을 보내 close code 1009를 관찰합니다. |
| 증명하는 것 | application handler 이전 transport size rejection이 실제 wiring에서 동작함을 증명합니다. |
| 증명하지 않는 것 | 모든 frame fragmentation/compression 조합이나 connection-rate defense는 증명하지 않습니다. |
<!-- LEARNER-END:1afec49052b6:test -->



#### 비교 기준

- 직전 관련 SHA: `8ea18a1b92db` — `fix(realtime): WebSocket transport payload 상한 설정`
- 이 Thread의 마지막 selected SHA입니다.

## 6. 불변식의 변화

<!-- LEARNER-BEGIN:04-gamehub-runtime-integration-shared-scheduling-and-congestion.md:evolution -->
`a6a1f4fba60e`~`49ca3e778801`은 room/client에 fixed-step, heartbeat/input gate, snapshot buffer를 실제 연결합니다. `aed88c8a93e0`/`8d24b5e70837`이 timer topology 비교 경계를 만든 뒤 `d21a47ee92d2`/`fb5b1abc97f5`가 one-clock ownership을 도입·이전하고 `69fb44d2f0ca`가 recovery 전이를 고정합니다. `ad482c200cea`/`db1ae3d47b96`은 20 Hz simulation과 staggered 10 Hz delivery를 분리합니다. `d90f17fa765d`/`5cd54767858f`는 callback 지연 오판을 교정하고, `8ea18a1b92db`/`1afec49052b6`는 8 KiB frame bound를 transport layer에서 강제합니다.
<!-- LEARNER-END:04-gamehub-runtime-integration-shared-scheduling-and-congestion.md:evolution -->

## 7. Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:04-gamehub-runtime-integration-shared-scheduling-and-congestion.md:failure-links -->
- primitive 미통합/cleanup 누락 → GameHub lifecycle wiring → runtime integration tests
- room별 timer 증식 → controlled benchmark boundary → shared scheduler abstraction/ownership transfer → reconnect lifecycle test
- synchronized snapshot burst → 20 Hz simulation/10 Hz staggered delivery → multi-room cadence regression
- send callback false congestion → `bufferedAmount`-only fix → delayed callback vs real pressure regression
- application-only size check → transport `maxPayload` → real-socket 1009 regression
<!-- LEARNER-END:04-gamehub-runtime-integration-shared-scheduling-and-congestion.md:failure-links -->

## 8. Ownership·state·cleanup 변화

<!-- LEARNER-BEGIN:04-gamehub-runtime-integration-shared-scheduling-and-congestion.md:ownership -->
초기에는 room이 timer를 소유했지만 최종적으로 GameHub의 `SharedRoomScheduler`가 단 하나의 clock을 소유하고 room은 runnable callback membership만 가집니다. client record는 heartbeat와 latest buffer를 소유하고, InputGate는 user-level budget을 소유합니다. `ws` server는 frame-size enforcement를, buffer는 queued-byte pressure와 latest payload를 소유합니다.
<!-- LEARNER-END:04-gamehub-runtime-integration-shared-scheduling-and-congestion.md:ownership -->

## 9. Thread 최종 상태

<!-- LEARNER-BEGIN:04-gamehub-runtime-integration-shared-scheduling-and-congestion.md:final-state -->
GameHub는 한 shared fixed-step clock으로 runnable rooms를 20 Hz 진행하고 snapshot만 10 Hz two-slot cadence로 전달합니다. client별 heartbeat/input/snapshot limits가 lifecycle에 연결되며 callback 지연은 congestion으로 취급되지 않습니다. 8 KiB 초과 frame은 application handler 전에 transport가 거부합니다.
<!-- LEARNER-END:04-gamehub-runtime-integration-shared-scheduling-and-congestion.md:final-state -->

## 10. 최종 실행 흐름

<!-- LEARNER-BEGIN:04-gamehub-runtime-integration-shared-scheduling-and-congestion.md:final-flow -->
authenticated connect가 heartbeat와 snapshot buffer를 만들고 user-level input gate를 공유합니다. room이 playing이 되면 shared scheduler에 등록되고 매 50 ms simulation이 진행됩니다. tick parity에 맞는 room만 snapshot을 latest buffer에 enqueue합니다. queued bytes가 실제 threshold를 넘을 때만 retry/terminate하며 oversized frame은 `ws` parser에서 1009로 종료됩니다. pause/finish/close는 scheduler membership과 client resources를 정리합니다.
<!-- LEARNER-END:04-gamehub-runtime-integration-shared-scheduling-and-congestion.md:final-flow -->

## 11. 실행 및 검증 근거

<!-- LEARNER-BEGIN:04-gamehub-runtime-integration-shared-scheduling-and-congestion.md:execution -->
- 저장소 runtime/test command는 실행하지 않았습니다.
- 실행을 시도한 명령: `git ls-remote --heads https://github.com/seungwoo7050/42-archive.git refs/heads/web/ft_transcendence`
- 실제 결과: exit status 128, `Could not resolve host: github.com`.
- 따라서 test pass, benchmark 수치, k6/Toxiproxy recovery 결과는 주장하지 않습니다. 각 기록은 GitHub 연결로 exact selected commit의 diff와 당시 파일을 확인한 정적 historical inspection 결과입니다.
<!-- LEARNER-END:04-gamehub-runtime-integration-shared-scheduling-and-congestion.md:execution -->

## 12. 학습 완료 확인

<!-- LEARNER-BEGIN:04-gamehub-runtime-integration-shared-scheduling-and-congestion.md:checks -->
- [x] room별 timer에서 shared timer로 ownership이 이동한 전후를 설명할 수 있습니다.
- [x] ready/pause/reconnect/finish마다 scheduler membership이 어떻게 변하는지 추적할 수 있습니다.
- [x] simulation frequency와 snapshot frequency가 왜 분리됐는지 설명할 수 있습니다.
- [x] callback delay, buffered bytes, frame size를 서로 다른 pressure signal로 구분할 수 있습니다.
- [x] 각 fix를 해당 regression test와 연결할 수 있습니다.
<!-- LEARNER-END:04-gamehub-runtime-integration-shared-scheduling-and-congestion.md:checks -->
