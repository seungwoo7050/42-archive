# Load·fault recovery와 pool error containment

- 카테고리: `07-runtime-observability-and-service-health` — 런타임 관측성과 서비스 상태
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`
- Phase 1 상태: frozen authoritative scaffold

## 1. Thread 목표

realtime load acceptance criteria를 test-first로 고정하고 k6/Toxiproxy로 connection·room·reconnect·dependency fault를 재현하며, fault가 PostgreSQL idle pool event로 나타날 때 process crash와 credential leakage를 차단하는 과정을 복원합니다.

범위 메모: 부하와 fault harness는 검증 architecture와도 교차하지만, 여기서는 runtime health signal·measurement source·failure containment의 engineering story만 다룹니다. CI job 구성이나 release artifact는 포함하지 않습니다.

### 직접 연결되는 불변식

- load harness는 connection/reconnect/snapshot/finalization을 bounded thresholds와 명시된 measurement source로 평가합니다.
- fault control은 loopback target만 조작하고 각 run의 성공·실패와 무관하게 proxy reset을 시도합니다.
- readiness는 database down과 recovery를 503/down→200/up으로 관측하며 polling은 bounded deadline을 가집니다.
- PostgreSQL idle client error와 reporter failure는 process exception으로 탈출하지 않고 sanitized bounded metadata만 남깁니다.

## 2. 핵심 질문

- 500 connections·50 rooms profile이 실제 auth/ticket/room/reconnect path를 어떻게 구성합니까?
- client event와 server-side persistence metric 중 finalization evidence owner는 누구입니까?
- Toxiproxy fault sequence와 readiness expected state, timeout, always-reset cleanup은 어떻게 연결됩니까?
- Pool `error` EventEmitter, sanitizer, early logging buffer는 어떤 failure를 각각 containment합니까?

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
| 1 | `ff1bffcd5296` | `test(load): 실시간 부하 임계값 정의` | B | REALTIME, PERSISTENCE, OPERATIONS | 500 connections·50 rooms를 기본으로 하는 k6/Toxiproxy harness의 service-level thresholds와 구성 계약을 test-first로 정의합니다. |
| 2 | `7b0b5f086b41` | `test(load): 실시간 fault injection 도구 추가` | A | AUTH, REALTIME, PERSISTENCE | k6 realtime load scenario와 PostgreSQL/edge Toxiproxy control plane을 구현해 connection, room, reconnect, snapshot, finalization, dependency failure를 재현합니다. |
| 3 | `547d9943d30a` | `fix(load): 기본 부하 profile 측정 안정화` | A | REALTIME, OPERATIONS, OBSERVABILITY | reconnect burst와 client-side finalization 오판을 제거해 기본 load profile의 측정 source와 timing을 안정화합니다. |
| 4 | `84bec3bf57ae` | `test(load): fault recovery 검사 자동화` | A | PERSISTENCE, OPERATIONS, PERF | Toxiproxy command와 readiness polling을 순서화해 database/edge failure와 recovery를 versioned JSON report로 자동화합니다. |
| 5 | `335565908920` | `test(load): fault scenario 설정과 report 검증` | B | PERSISTENCE, OPERATIONS, PERF | fault runner의 loopback guard, command ordering, bounded polling, report schema, failure cleanup을 deterministic dependencies로 검증합니다. |
| 6 | `eca21f115c1b` | `fix(db): idle connection pool 오류에서 복구` | A | PERSISTENCE, RISK | PostgreSQL Pool의 idle-client `error` event를 sanitized report로 변환하고 malformed error·reporter failure가 process crash로 번지지 않게 containment합니다. |
| 7 | `493babe1cf30` | `test(db): 안전한 connection pool 오류 처리 검증` | B | PERSISTENCE, TEST | real `pg.Pool` EventEmitter에서 idle error가 sanitized metadata로 관측되고 no/throwing reporter에서도 밖으로 throw되지 않는지 검증합니다. |

## 5. Commit별 학습 기록

### 5.1. `test(load): 실시간 부하 임계값 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `ff1bffcd5296` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE, OPERATIONS |
| Source에서 확정된 역할 | 500 connections·50 rooms를 기본으로 하는 k6/Toxiproxy harness의 service-level thresholds와 구성 계약을 test-first로 정의합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `tests/load/load-harness.test.mjs`
- 핵심 symbol: `createLoadProfile` expectations, required k6 metrics/source assertions, proxy definition assertions
- 기본 500 connections, 50 rooms, 100 player connections, 495 minimum success와 4분 scenario를 확인합니다.
- connection/reconnect 99%, snapshot p95≤150 ms·p99≤250 ms, normal drop<1%, finalization zero failures/duplicates 등의 thresholds를 확인합니다.
- k6 source에 login, one-time ticket, queue join, ready, sequenced input, serverTime 측정이 필요하다고 source-level로 고정하는지 확인합니다.
- PostgreSQL과 edge proxy가 분리되고 load overlay가 API DB traffic을 proxy로 라우팅하도록 요구하는지 확인합니다.
- 이 SHA에서 imported harness modules가 아직 다음 commit 구현 전이라는 test-first 상태를 명시합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:ff1bffcd5296:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태와 문제 | runtime metrics와 limiter는 있었지만 몇 connection/room에서 어떤 성공률·latency·drop/finalization 조건을 통과해야 하는지 executable load contract가 없었습니다. 부하 도구를 먼저 만들면 측정 가능한 값에 맞춰 목표를 낮출 수 있고, reconnect·finalization·fault path 중 일부를 누락하기 쉽습니다. |
| 구현 또는 검증 결정 | Node contract test가 아직 구현될 `createLoadProfile`, k6 source, Toxiproxy definitions, Compose overlay에 요구하는 숫자·metric names·routes·failure paths를 먼저 고정합니다. |
| 실행/검증 경로 | load contract test import → profile 생성 → exact default/threshold assertions → k6 source scan → proxy command/Compose route assertions입니다. 이 commit alone에서는 implementation modules가 완성되지 않아 suite가 green이라고 추정할 수 없습니다. |
| ownership과 failure 처리 | 테스트 파일이 operational acceptance vocabulary를 소유합니다. 실제 connection/socket/proxy/process lifetime은 후속 harness가 소유합니다. 잘못된 connection-room ratio, 누락된 SLI, 단일 proxy로 DB/edge failure를 혼합하는 구성을 assertion failure로 만듭니다. |
| 보장하는 것 | 후속 harness가 충족해야 할 load/fault acceptance contract가 숫자와 metric name 수준으로 명시됩니다. |
| 보장하지 않는 것 | test-first commit은 실제 500 connections를 실행하지 않고, 다음 commit 전에는 참조 구현이 없을 수 있으므로 runtime success evidence가 아닙니다. |
| 후속 연결 | `7b0b5f086b41`이 k6/Toxiproxy implementation을 추가하고 `547d9943d30a`가 측정 자체의 reconnect/finalization bias를 교정합니다. |
<!-- LEARNER-END:ff1bffcd5296:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:ff1bffcd5296:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | test-first static/configuration contract |
| 주입·재현 방식 | profile object, source file patterns, proxy definitions, Compose routing을 Node assertions로 고정합니다. |
| 증명하는 것 | 요구되는 부하 규모·SLI·fault topology가 source contract로 명시됐음을 증명합니다. |
| 증명하지 않는 것 | 실제 k6 실행 결과, threshold 통과, network/database recovery를 증명하지 않습니다. |
<!-- LEARNER-END:ff1bffcd5296:test -->



#### 비교 기준

- 이 commit의 parent 상태와 비교합니다.
- 다음 관련 SHA: `7b0b5f086b41` — `test(load): 실시간 fault injection 도구 추가`

### 5.2. `test(load): 실시간 fault injection 도구 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `7b0b5f086b41` |
| Importance | A |
| Tags | AUTH, REALTIME, PERSISTENCE |
| Source에서 확정된 역할 | k6 realtime load scenario와 PostgreSQL/edge Toxiproxy control plane을 구현해 connection, room, reconnect, snapshot, finalization, dependency failure를 재현합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `docker-compose.load.yml`, `tests/load/load-profile.mjs`, `tests/load/pong-load.js`, `tests/load/toxiproxy-control.mjs`
- 핵심 symbol: `createLoadProfile`, k6 `setup/default`, `connectSession`, `buildProxyDefinitions`, `toxicForCommand`, `runCommand`
- load overlay가 Toxiproxy control/edge ports를 loopback에만 publish하고 API `DATABASE_URL`을 PostgreSQL proxy로 바꾸는지 확인합니다.
- `createLoadProfile`이 positive safe integer를 요구하고 connections≥2×rooms, default/extended profile, 99% success count를 계산하는지 확인합니다.
- k6 VU가 dev login→WS ticket→versioned WebSocket→queue/ready/input→disconnect/reconnect→snapshot/finalization을 어떤 순서로 수행하는지 확인합니다.
- snapshot delay가 `Date.now()-serverTimeMs`, delivery gaps가 sequence 차이, reconnect recovery가 same room ID로 측정되는지 확인합니다.
- Toxiproxy commands가 DB latency/down/up와 edge latency/reset/down/up를 서로 다른 proxy/toxic으로 만들고 reset/ensure를 어떻게 수행하는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:7b0b5f086b41:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | thresholds는 test-first로 정의됐지만 실제 load processes, connection choreography, dependency fault control은 없었습니다. |
| 해결하려던 문제와 위험 | 단순 WebSocket 연결 수만 세면 auth ticket, matchmaking, active room, sequenced input, reconnect ownership, snapshot freshness, idempotent finalization을 검증하지 못합니다. DB와 edge 장애도 분리 주입해야 원인을 구분할 수 있습니다. |
| 핵심 구현 결정 | k6 profile과 scenario를 추가해 기본 500 VUs 중 100 players가 50 rooms를 만들고 나머지는 online load를 구성합니다. login과 one-time ticket을 거쳐 inputs를 보내고 selected players를 disconnect/reconnect합니다. Toxiproxy overlay와 control script가 PostgreSQL과 public edge를 별도 proxy로 구성합니다. |
| 입력 → 상태 전이 → 출력 | Compose load overlay 기동 → Toxiproxy ensure → k6 setup readiness → VU별 login/ticket/connect → presence가 99% 이상일 때 players queue → matched/ready/input → initial connection close·new ticket reconnect → snapshot/finalization metric 기록; 별도 control command로 DB/edge toxic 적용·reset입니다. |
| ownership/lifetime/cleanup | k6 VU가 자신의 socket, inputSeq, observed room/match sets와 timers를 소유합니다. load profile은 thresholds를, Toxiproxy controller는 proxy definitions/toxics를, Compose overlay는 process routing을 소유합니다. |
| failure/rollback/retry | login/ticket/upgrade/reconnect 실패는 rate metrics로, snapshot gap/delay는 Trend/Rate로, duplicate/failure finalization은 counters로 기록합니다. proxy command validation은 nonpositive/unknown args를 fail-fast합니다. |
| 보장하는 것 | realtime product flow와 DB/edge fault injection을 같은 operational harness에서 재현하고 machine-readable thresholds로 평가할 수 있습니다. |
| 보장하지 않는 것 | 초기 reconnect가 모든 players에게 같은 시점에 몰리고 finalization success를 client `game.finished` event에 의존해 server persistence 결과와 혼동할 수 있습니다. `547d9943d30a`가 이를 교정합니다. |
| 후속 연결 | `547d9943d30a`가 reconnect staggering과 server Prometheus finalization source를 추가하고 `84bec3bf57ae`가 fault sequence 자체를 자동화합니다. |
<!-- LEARNER-END:7b0b5f086b41:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:7b0b5f086b41:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | k6 load harness와 Toxiproxy fault-injection implementation |
| 주입·재현 방식 | k6 VU가 HTTP login·one-time ticket·versioned WebSocket·queue/ready/input·reconnect를 실행하고, Toxiproxy control script가 PostgreSQL/edge latency·down·reset을 적용하도록 구성합니다. |
| 증명하는 것 | source inspection상 요구된 product path와 SLI/fault control을 실행할 harness가 구현됐음을 증명합니다. |
| 증명하지 않는 것 | 이번 작업에서는 k6·Compose·Toxiproxy를 실행하지 않았으므로 threshold 통과나 실제 recovery 결과를 증명하지 않습니다. |
<!-- LEARNER-END:7b0b5f086b41:test -->



#### 비교 기준

- 직전 관련 SHA: `ff1bffcd5296` — `test(load): 실시간 부하 임계값 정의`
- 다음 관련 SHA: `547d9943d30a` — `fix(load): 기본 부하 profile 측정 안정화`

### 5.3. `fix(load): 기본 부하 profile 측정 안정화`

| 항목 | 값 |
| --- | --- |
| SHA | `547d9943d30a` |
| Importance | A |
| Tags | REALTIME, OPERATIONS, OBSERVABILITY |
| Source에서 확정된 역할 | reconnect burst와 client-side finalization 오판을 제거해 기본 load profile의 측정 source와 timing을 안정화합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `tests/load/load-profile.mjs`, `tests/load/pong-load.js`, `tests/load/load-harness.test.mjs`
- 핵심 symbol: `PLAYER_RECONNECT_STAGGER_MS`, `reconnectDelayFor`, k6 `teardown`, `readPrometheusSample`
- 기본 reconnect delay가 2초이고 player population 전체에 5초 stagger를 분배하는 산술을 확인합니다.
- connection close timer가 `queue.matched` 직후가 아니라 실제 `playing` snapshot을 본 뒤에만 arm되는지 확인합니다.
- VU의 `game.finished` event 대신 teardown에서 API Prometheus의 database finalization success/failure/duplicate samples를 읽는지 확인합니다.
- `readPrometheusSample`이 metric name과 expected bounded labels를 정확히 matching하고 missing/invalid event-loop metric을 fail-closed 처리하는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:547d9943d30a:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 초기 harness는 100 player connections가 거의 같은 시점에 끊겨 reconnect stampede를 만들었고, client가 `game.finished`를 받았다는 사실을 durable finalization success처럼 세었습니다. |
| 해결하려던 문제와 위험 | test 자체가 synchronized fault를 만들어 production bottleneck을 과장할 수 있고, transport event 수신은 database commit 성공·duplicate absence를 증명하지 않습니다. |
| 핵심 구현 결정 | player index에 따라 2–7초 범위로 reconnect close를 분산하고, room이 실제 playing snapshot을 보낸 뒤에만 close timer를 설정합니다. finalization 결과는 test 종료 시 server Prometheus counters에서 persistence/outcome labels로 읽습니다. |
| 입력 → 상태 전이 → 출력 | player match/ready → first playing snapshot → `reconnectDelayFor(vuId)` timer → staggered close/reconnect; teardown → `/metrics` scrape → event-loop p95와 finalization success/failure/duplicates parse → k6 metrics에 기록입니다. |
| ownership/lifetime/cleanup | load VU는 reconnect trigger만 소유하고 authoritative finalization outcome은 server metrics owner에게서 읽습니다. teardown parser는 scrape validation과 label selection을 소유합니다. |
| failure/rollback/retry | playing 전에 close해 reconnect window를 잘못 측정하는 case와 client event를 persistence success로 오인하는 case를 제거합니다. required event-loop metric이 없으면 0으로 대체하지 않고 test를 실패시킵니다. |
| 보장하는 것 | 기본 load의 reconnect가 시간축에 분산되고 finalization SLI가 실제 server-side persistence observation을 반영합니다. |
| 보장하지 않는 것 | Prometheus scrape 자체가 성공해야 하며 scrape 시점 이후의 늦은 finalization은 결과에 포함되지 않을 수 있습니다. 실제 run evidence는 별도 실행이 필요합니다. |
| 후속 연결 | `db1ae3d47b96`의 server cadence fix 뒤 measurement harness를 정렬하며 `84bec3bf57ae`의 automated fault recovery와 함께 operational evidence를 강화합니다. |
<!-- LEARNER-END:547d9943d30a:record -->


#### Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:547d9943d30a:fix -->
이전 가정: uniform reconnect와 client finished event가 적절한 load/finalization evidence → 실제 failure: reconnect stampede·persistence success 오판 → 수정: playing-gated stagger + server metrics → load contract tests 갱신.
<!-- LEARNER-END:547d9943d30a:fix -->


#### 비교 기준

- 직전 관련 SHA: `7b0b5f086b41` — `test(load): 실시간 fault injection 도구 추가`
- 다음 관련 SHA: `84bec3bf57ae` — `test(load): fault recovery 검사 자동화`

### 5.4. `test(load): fault recovery 검사 자동화`

| 항목 | 값 |
| --- | --- |
| SHA | `84bec3bf57ae` |
| Importance | A |
| Tags | PERSISTENCE, OPERATIONS, PERF |
| Source에서 확정된 역할 | Toxiproxy command와 readiness polling을 순서화해 database/edge failure와 recovery를 versioned JSON report로 자동화합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `tests/load/fault-scenario.mjs`, `package.json`
- 핵심 symbol: `createFaultScenarioConfig`, `runFaultScenario`, `observeStep`, `probeReadiness`, `formatFaultReport`, `load:faults`
- loopback-only Toxiproxy/API/edge URLs와 DB 300 ms, edge 150 ms, request 5초, recovery 15초, poll 250 ms defaults를 확인합니다.
- `pollIntervalMs <= recoveryTimeoutMs`와 positive integer/boolean parsing이 fail-fast하는지 확인합니다.
- reset→baseline→DB latency→DB down→DB up/recovery→edge latency→edge reset→edge up/recovery 순서를 확인합니다.
- DB down expected state가 HTTP 503, `status=not_ready`, `checks.database=down`인지 확인합니다.
- scenario error가 나도 final reset을 시도하고 cleanup error를 원래 error와 어떻게 결합하는지 확인합니다.
- report가 schemaVersion, timestamps, settings, targets, ordered steps, passed를 보존하는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:84bec3bf57ae:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | Toxiproxy commands는 수동으로 호출할 수 있었지만 어떤 순서로 fault를 넣고 어떤 readiness state를 기다린 뒤 recovery를 판단할지 자동화되지 않았습니다. |
| 해결하려던 문제와 위험 | 수동 장애 실험은 cleanup 누락으로 다음 run을 오염시키고, 한 번의 probe로 recovery를 판정하면 timing race가 생깁니다. 실패 관찰과 복구 관찰을 versioned evidence로 남겨야 했습니다. |
| 핵심 구현 결정 | config parser와 scenario runner를 만들고 각 단계에서 bounded polling으로 expected readiness를 기다립니다. 모든 path에서 proxy reset을 시도하며 성공한 observations를 ordered JSON report에 기록합니다. |
| 입력 → 상태 전이 → 출력 | config validate → proxy reset → baseline ready poll → DB latency ready → DB down 503/down → DB up ready → optional edge latency ready → edge reset network/5xx → edge up ready → final reset → all steps passed면 report finalize입니다. |
| ownership/lifetime/cleanup | runner가 fault command ordering, polling deadline, observations, report lifecycle를 소유합니다. Toxiproxy controller가 toxic mutation을, API readiness가 dependency state interpretation을 소유합니다. |
| failure/rollback/retry | command/probe/deadline 실패는 scenario error로 수렴하되 final reset을 별도로 시도합니다. cleanup도 실패하면 원래 error를 잃지 않고 cause로 연결합니다. target URL은 loopback 외부를 거부해 잘못된 환경 조작을 막습니다. |
| 보장하는 것 | database와 edge failure/recovery가 명시된 순서와 bounded deadlines로 자동 실행되고 versioned JSON evidence로 표현됩니다. |
| 보장하지 않는 것 | runner 자체가 production database correctness를 증명하지 않으며, 실제 Toxiproxy/Compose stack이 떠 있어야 end-to-end 실행됩니다. 이 작업에서는 해당 명령을 실행하지 않았습니다. |
| 후속 연결 | `335565908920`이 config/order/report/cleanup을 injected dependencies로 검증하고, 실제 DB idle connection failure containment는 `eca21f115c1b`에서 application code로 수정됩니다. |
<!-- LEARNER-END:84bec3bf57ae:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:84bec3bf57ae:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | automated fault-recovery scenario |
| 주입·재현 방식 | Toxiproxy command와 readiness probe를 reset→baseline→DB latency/down/up→edge latency/reset/up 순서로 실행하고 bounded polling과 final reset, versioned JSON report를 적용합니다. |
| 증명하는 것 | 실행 시 fault/recovery state를 ordered observations와 deadline으로 판정할 orchestration path가 존재함을 증명합니다. |
| 증명하지 않는 것 | 실제 infrastructure를 실행하지 않았으므로 database/edge가 해당 시간 안에 복구됐다는 runtime evidence는 아닙니다. |
<!-- LEARNER-END:84bec3bf57ae:test -->



#### 비교 기준

- 직전 관련 SHA: `547d9943d30a` — `fix(load): 기본 부하 profile 측정 안정화`
- 다음 관련 SHA: `335565908920` — `test(load): fault scenario 설정과 report 검증`

### 5.5. `test(load): fault scenario 설정과 report 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `335565908920` |
| Importance | B |
| Tags | PERSISTENCE, OPERATIONS, PERF |
| Source에서 확정된 역할 | fault runner의 loopback guard, command ordering, bounded polling, report schema, failure cleanup을 deterministic dependencies로 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `tests/load/fault-scenario.test.mjs`
- 핵심 symbol: injected `applyToxiproxyCommand`, `probeReadiness`, `sleep`, `now`, fake observation queues
- default config와 `FAULT_INCLUDE_EDGE=0`, invalid external URLs를 검사하는 cases를 확인합니다.
- prepared readiness observations가 DB/edge step 순서와 두 번의 250 ms sleep을 만들고 ordered commands를 고정하는지 확인합니다.
- report timestamps, target URLs, step names/status/duration/body/error와 JSON round-trip을 확인합니다.
- `db-down` command가 throw해도 마지막 `reset` command가 호출되는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:335565908920:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태와 문제 | fault runner는 여러 injected boundaries와 cleanup path를 가졌지만 실제 proxy/network 없이 그 순서를 결정적으로 검증할 evidence가 없었습니다. end-to-end fault run만으로는 실패 시 cleanup이 실행됐는지, polling이 어떤 observation을 받아 통과했는지 재현하기 어렵습니다. |
| 구현 또는 검증 결정 | command/probe/sleep/clock를 fake로 주입해 fixed observation queue를 소비하고 exact command list, sleep list, report fields를 검사합니다. |
| 실행/검증 경로 | config build → fake commands/probes로 full scenario → expected step list/report 확인; 별도 failure case에서 `db-down` throw → catch → final reset 호출 확인입니다. |
| ownership과 failure 처리 | 테스트가 모든 external side effect를 fake dependency로 소유하고 runner의 orchestration logic만 실행합니다. non-loopback target, invalid config, mid-command failure, cleanup reset을 deterministic assertion으로 재현합니다. |
| 보장하는 것 | fault scenario control logic과 report contract가 실제 infrastructure availability와 무관하게 회귀 보호됩니다. |
| 보장하지 않는 것 | Toxiproxy API, network reset, PostgreSQL readiness가 실제로 동작하는지는 증명하지 않습니다. |
| 후속 연결 | `84bec3bf57ae`의 operational harness evidence이며 `eca21f115c1b`/`493babe1cf30`은 fault가 application pool event로 나타날 때의 containment를 다룹니다. |
<!-- LEARNER-END:335565908920:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:335565908920:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | deterministic fault-orchestration test |
| 주입·재현 방식 | command/probe/sleep/clock dependency injection과 queued observations를 사용합니다. |
| 증명하는 것 | ordered fault/recovery steps, loopback guard, report schema, always-reset cleanup을 증명합니다. |
| 증명하지 않는 것 | 실제 DB/edge outage와 recovery latency는 증명하지 않습니다. |
<!-- LEARNER-END:335565908920:test -->



#### 비교 기준

- 직전 관련 SHA: `84bec3bf57ae` — `test(load): fault recovery 검사 자동화`
- 다음 관련 SHA: `eca21f115c1b` — `fix(db): idle connection pool 오류에서 복구`

### 5.6. `fix(db): idle connection pool 오류에서 복구`

| 항목 | 값 |
| --- | --- |
| SHA | `eca21f115c1b` |
| Importance | A |
| Tags | PERSISTENCE, RISK |
| Source에서 확정된 역할 | PostgreSQL Pool의 idle-client `error` event를 sanitized report로 변환하고 malformed error·reporter failure가 process crash로 번지지 않게 containment합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `packages/db/src/poolError.ts`, `packages/db/src/index.ts`, `apps/api/src/index.ts`
- 핵심 symbol: `installPostgresPoolErrorHandler`, `toSafePoolErrorEvent`, `safeLabel`, `PostgresRepositoryOptions.onPoolError`, early error buffer
- `Pool.on('error')` listener가 설치되지 않았던 parent와 Node EventEmitter의 unhandled error behavior를 비교합니다.
- raw Error message/connection string 대신 `{kind,errorName,errorCode}`만 만들고 label을 `[A-Za-z0-9_]{1,64}`로 제한하는지 확인합니다.
- malformed error object 변환과 user-supplied reporter callback을 각각 try/catch로 containment하는지 확인합니다.
- `createPostgresRepository`가 `onPoolError` option을 받고 pool 생성 직후 listener를 설치하는 순서를 확인합니다.
- API entrypoint가 Fastify logger 준비 전 발생한 events를 배열에 임시 보관한 뒤 logger owner가 생기면 flush하는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:eca21f115c1b:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | PostgreSQL pool은 query 중이 아닌 idle client에서 connection failure를 `error` event로 방출할 수 있었고, listener가 없으면 EventEmitter semantics상 process-level uncaught error가 될 수 있었습니다. |
| 해결하려던 문제와 위험 | database outage 실험 중 idle connection error가 readiness 503로만 표현되지 않고 API process를 종료시킬 수 있었습니다. raw error를 그대로 log하면 credentials/host details가 노출되고, reporter 자체가 throw해도 crash가 재발합니다. |
| 핵심 구현 결정 | pool 생성 즉시 error listener를 설치해 safe bounded metadata로 변환합니다. conversion과 optional reporter를 별도 try/catch로 감싸 event boundary 밖으로 exception이 나오지 않게 합니다. API는 app logger가 준비되기 전 events를 buffer하고 준비 후 structured error log로 flush합니다. |
| 입력 → 상태 전이 → 출력 | idle PG client error emit → pool listener → safe event conversion 또는 fallback → optional reporter 호출(throw contained) → startup 전이면 `earlyPoolErrors.push` → app logger 준비 뒤 reporter 교체·buffer flush → 이후 events 직접 structured log입니다. |
| ownership/lifetime/cleanup | DB package가 Pool listener와 sanitization boundary를 소유합니다. API composition root는 logger readiness 전 임시 event buffer와 이후 reporting destination을 소유합니다. repository close는 기존 pool lifetime owner를 유지합니다. |
| failure/rollback/retry | malformed name/code는 fallback `UnknownError`/null로 축소되고 raw message는 전달되지 않습니다. reporter가 throw해도 listener가 삼켜 idle-client failure를 process crash로 바꾸지 않습니다. early buffer는 logger 설치 후 `splice`로 비웁니다. |
| 보장하는 것 | idle pool error가 uncaught EventEmitter error로 process를 종료하지 않고, credential-bearing message 없이 bounded metadata로 관측됩니다. |
| 보장하지 않는 것 | active query failure를 성공으로 바꾸거나 database를 자동 reconnect한다고 보장하지 않습니다. readiness와 client retry는 별도 `pg`/repository behavior입니다. |
| 후속 연결 | `493babe1cf30`이 real `pg.Pool` event와 malicious reporter를 검증합니다. `84bec3bf57ae`의 DB outage/recovery scenario와 함께 process-level containment story를 완성합니다. |
<!-- LEARNER-END:eca21f115c1b:record -->


#### Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:eca21f115c1b:fix -->
이전 가정: query rejection/readiness 처리만으로 DB failure가 containment됨 → 실제 failure: idle client `error` EventEmitter가 uncaught crash 가능 → root cause: pool listener 부재 → 수정: safe listener+reporter containment+early logging buffer → regression `493babe1cf30`.
<!-- LEARNER-END:eca21f115c1b:fix -->


#### 비교 기준

- 직전 관련 SHA: `335565908920` — `test(load): fault scenario 설정과 report 검증`
- 다음 관련 SHA: `493babe1cf30` — `test(db): 안전한 connection pool 오류 처리 검증`

### 5.7. `test(db): 안전한 connection pool 오류 처리 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `493babe1cf30` |
| Importance | B |
| Tags | PERSISTENCE, TEST |
| Source에서 확정된 역할 | real `pg.Pool` EventEmitter에서 idle error가 sanitized metadata로 관측되고 no/throwing reporter에서도 밖으로 throw되지 않는지 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `packages/db/src/poolError.test.ts`
- 핵심 symbol: real `Pool`, `pool.emit('error', error)`, reporter spy/throw cases
- real `new Pool()`에 listener가 정확히 하나 설치되는지 확인합니다.
- secret-bearing message·connectionString과 code `57P01`를 가진 Error를 emit하고 callback payload만 `{kind:'idle_client_error', errorName:'Error', errorCode:'57P01'}`인지 확인합니다.
- serialized mock calls에 `secret`과 `Connection terminated`가 없는 negative assertions를 확인합니다.
- reporter 미설정과 reporter 자체 throw 두 cases 모두 `pool.emit`이 throw하지 않는지 확인합니다.
- 각 case가 `pool.end()`로 pool lifetime을 정리하는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:493babe1cf30:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태와 문제 | safe listener implementation은 있었지만 EventEmitter의 실제 `error` semantics, raw credential redaction, reporter failure containment을 함께 고정하지 않았습니다. mock emitter는 Node의 특별한 unhandled `error` behavior를 놓칠 수 있고, sanitizer가 raw Error reference를 payload에 남기면 JSON/log에서 secret이 노출될 수 있습니다. |
| 구현 또는 검증 결정 | 실제 `pg.Pool` 인스턴스에 handler를 설치하고 crafted error를 직접 emit합니다. reporter call shape와 serialized negative substrings, no-reporter/throwing-reporter non-throw behavior를 검사합니다. |
| 실행/검증 경로 | Pool 생성 → handler install/listener count → secret-bearing Error emit → no throw → safe callback inspect → pool.end; 별도 cases에서 reporter 없음/throw → no throw → end입니다. |
| ownership과 failure 처리 | 테스트가 Pool 생성·종료를 소유하고 production handler가 event conversion/reporting containment을 실행합니다. unhandled EventEmitter error, credential leakage, reporter-induced crash를 각각 직접 재현할 입력으로 검사합니다. |
| 보장하는 것 | idle pool error boundary가 실제 `pg.Pool`에서 process exception을 방지하고 bounded sanitized metadata만 보고함을 증명합니다. |
| 보장하지 않는 것 | 실제 PostgreSQL server disconnect/reconnect나 readiness recovery timing은 실행하지 않습니다. |
| 후속 연결 | `eca21f115c1b`의 root-cause fix를 보호하는 최종 database failure containment regression입니다. |
<!-- LEARNER-END:493babe1cf30:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:493babe1cf30:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | real-library EventEmitter regression test |
| 주입·재현 방식 | 실제 `pg.Pool`에 crafted idle error를 emit하고 callback shape·negative secret strings·throw containment을 검사합니다. |
| 증명하는 것 | listener 존재, safe labels, no raw message/secret, no/throwing reporter non-crash를 증명합니다. |
| 증명하지 않는 것 | 실제 network outage와 pool reconnection 성공은 증명하지 않습니다. |
<!-- LEARNER-END:493babe1cf30:test -->



#### 비교 기준

- 직전 관련 SHA: `eca21f115c1b` — `fix(db): idle connection pool 오류에서 복구`
- 이 Thread의 마지막 selected SHA입니다.

## 6. 불변식의 변화

<!-- LEARNER-BEGIN:06-load-fault-recovery-and-pool-error-containment.md:evolution -->
`ff1bffcd5296`은 implementation 전에 load scale와 SLI thresholds를 고정하고 `7b0b5f086b41`이 k6/Toxiproxy harness를 구현합니다. `547d9943d30a`는 synchronized reconnect와 client-side finalization 오판을 playing-gated stagger/server Prometheus source로 수정합니다. `84bec3bf57ae`/`335565908920`은 DB/edge failure→recovery를 bounded polling·always-reset·JSON report로 자동화/검증합니다. `eca21f115c1b`/`493babe1cf30`은 DB fault가 idle pool `error`로 나타나도 safe metadata 관측으로 containment합니다.
<!-- LEARNER-END:06-load-fault-recovery-and-pool-error-containment.md:evolution -->

## 7. Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:06-load-fault-recovery-and-pool-error-containment.md:failure-links -->
- load 목표/SLI 누락 → test-first threshold contract → k6/Toxiproxy implementation
- reconnect stampede·client finalization 오판 → playing-gated stagger/server metrics → harness contract update
- manual fault experiment 오염·race → ordered bounded runner+always reset → dependency-injected report/cleanup test
- idle pool EventEmitter crash·secret log·reporter throw → safe listener/early buffer → real `pg.Pool` regression
<!-- LEARNER-END:06-load-fault-recovery-and-pool-error-containment.md:failure-links -->

## 8. Ownership·state·cleanup 변화

<!-- LEARNER-BEGIN:06-load-fault-recovery-and-pool-error-containment.md:ownership -->
k6 profile은 acceptance thresholds를, 각 VU는 connection/input/reconnect observation을, teardown은 server metric scrape를 소유합니다. Toxiproxy controller는 DB/edge toxic mutation을, fault runner는 ordered polling/report/cleanup을 소유합니다. DB package는 Pool event sanitization/containment을, API composition root는 logger 준비 전 event buffer를 소유합니다.
<!-- LEARNER-END:06-load-fault-recovery-and-pool-error-containment.md:ownership -->

## 9. Thread 최종 상태

<!-- LEARNER-BEGIN:06-load-fault-recovery-and-pool-error-containment.md:final-state -->
기본 load contract는 500 connections·50 rooms와 connection/reconnect/snapshot/finalization thresholds를 정의합니다. reconnect는 playing 이후 분산되고 durable finalization은 server metrics에서 읽습니다. DB/edge faults는 loopback-only Toxiproxy로 순서화돼 readiness recovery JSON report를 만들며, idle PG pool errors는 process를 죽이지 않고 safe name/code만 log됩니다.
<!-- LEARNER-END:06-load-fault-recovery-and-pool-error-containment.md:final-state -->

## 10. 최종 실행 흐름

<!-- LEARNER-BEGIN:06-load-fault-recovery-and-pool-error-containment.md:final-flow -->
load overlay → Toxiproxy ensure → k6 readiness/login/ticket/ws/rooms/input/reconnect → teardown Prometheus evaluation. fault run은 baseline→DB latency/down/up→edge latency/reset/up→always reset을 polling/report합니다. DB outage 중 idle Pool error는 listener→sanitizer→reporter containment→early buffer/logger로 흐르며 readiness는 별도로 dependency state를 반환합니다.
<!-- LEARNER-END:06-load-fault-recovery-and-pool-error-containment.md:final-flow -->

## 11. 실행 및 검증 근거

<!-- LEARNER-BEGIN:06-load-fault-recovery-and-pool-error-containment.md:execution -->
- 저장소 runtime/test command는 실행하지 않았습니다.
- 실행을 시도한 명령: `git ls-remote --heads https://github.com/seungwoo7050/42-archive.git refs/heads/web/ft_transcendence`
- 실제 결과: exit status 128, `Could not resolve host: github.com`.
- 따라서 test pass, benchmark 수치, k6/Toxiproxy recovery 결과는 주장하지 않습니다. 각 기록은 GitHub 연결로 exact selected commit의 diff와 당시 파일을 확인한 정적 historical inspection 결과입니다.
<!-- LEARNER-END:06-load-fault-recovery-and-pool-error-containment.md:execution -->

## 12. 학습 완료 확인

<!-- LEARNER-BEGIN:06-load-fault-recovery-and-pool-error-containment.md:checks -->
- [x] test-first load contract와 실제 harness implementation을 구분할 수 있습니다.
- [x] reconnect staggering과 server-side finalization metric으로 바뀐 root cause를 설명할 수 있습니다.
- [x] fault runner의 ordered steps, expected readiness, timeout, always-reset cleanup을 추적할 수 있습니다.
- [x] idle Pool error가 readiness failure와 별개로 process crash가 될 수 있었던 이유를 설명할 수 있습니다.
- [x] sanitizer와 reporter containment이 보장하는 것과 DB reconnect를 보장하지 않는 것을 구분할 수 있습니다.
<!-- LEARNER-END:06-load-fault-recovery-and-pool-error-containment.md:checks -->
