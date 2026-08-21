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
| 직전 관련 상태와 문제 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 구현 또는 검증 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 실행/검증 경로 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership과 failure 처리 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:ff1bffcd5296:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:ff1bffcd5296:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | [unit/integration/process/load/benchmark/failure injection 중 실제 기법 작성] |
| 주입·재현 방식 | [입력·시각·오류·동시성·transport 상태 작성] |
| 증명하는 것 | [실제 production path와 assertion 작성] |
| 증명하지 않는 것 | [실행 범위 밖의 보장 작성] |
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
| 직전 관련 상태 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 해결하려던 문제와 위험 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 핵심 구현 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 입력 → 상태 전이 → 출력 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership/lifetime/cleanup | [해당 SHA의 파일·심볼·조건으로 작성] |
| failure/rollback/retry | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:7b0b5f086b41:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:7b0b5f086b41:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | [unit/integration/process/load/benchmark/failure injection 중 실제 기법 작성] |
| 주입·재현 방식 | [입력·시각·오류·동시성·transport 상태 작성] |
| 증명하는 것 | [실제 production path와 assertion 작성] |
| 증명하지 않는 것 | [실행 범위 밖의 보장 작성] |
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
| 직전 관련 상태 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 해결하려던 문제와 위험 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 핵심 구현 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 입력 → 상태 전이 → 출력 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership/lifetime/cleanup | [해당 SHA의 파일·심볼·조건으로 작성] |
| failure/rollback/retry | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:547d9943d30a:record -->


#### Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:547d9943d30a:fix -->
이전 가정 → 실제 failure/risk → root cause → 수정된 invariant/결정 → 변경된 코드 → regression evidence를 해당 SHA와 관련 이전/후속 SHA로 연결해 작성합니다.
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
| 직전 관련 상태 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 해결하려던 문제와 위험 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 핵심 구현 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 입력 → 상태 전이 → 출력 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership/lifetime/cleanup | [해당 SHA의 파일·심볼·조건으로 작성] |
| failure/rollback/retry | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:84bec3bf57ae:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:84bec3bf57ae:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | [unit/integration/process/load/benchmark/failure injection 중 실제 기법 작성] |
| 주입·재현 방식 | [입력·시각·오류·동시성·transport 상태 작성] |
| 증명하는 것 | [실제 production path와 assertion 작성] |
| 증명하지 않는 것 | [실행 범위 밖의 보장 작성] |
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
| 직전 관련 상태와 문제 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 구현 또는 검증 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 실행/검증 경로 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership과 failure 처리 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:335565908920:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:335565908920:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | [unit/integration/process/load/benchmark/failure injection 중 실제 기법 작성] |
| 주입·재현 방식 | [입력·시각·오류·동시성·transport 상태 작성] |
| 증명하는 것 | [실제 production path와 assertion 작성] |
| 증명하지 않는 것 | [실행 범위 밖의 보장 작성] |
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
| 직전 관련 상태 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 해결하려던 문제와 위험 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 핵심 구현 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 입력 → 상태 전이 → 출력 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership/lifetime/cleanup | [해당 SHA의 파일·심볼·조건으로 작성] |
| failure/rollback/retry | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:eca21f115c1b:record -->


#### Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:eca21f115c1b:fix -->
이전 가정 → 실제 failure/risk → root cause → 수정된 invariant/결정 → 변경된 코드 → regression evidence를 해당 SHA와 관련 이전/후속 SHA로 연결해 작성합니다.
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
| 직전 관련 상태와 문제 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 구현 또는 검증 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 실행/검증 경로 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership과 failure 처리 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:493babe1cf30:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:493babe1cf30:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | [unit/integration/process/load/benchmark/failure injection 중 실제 기법 작성] |
| 주입·재현 방식 | [입력·시각·오류·동시성·transport 상태 작성] |
| 증명하는 것 | [실제 production path와 assertion 작성] |
| 증명하지 않는 것 | [실행 범위 밖의 보장 작성] |
<!-- LEARNER-END:493babe1cf30:test -->



#### 비교 기준

- 직전 관련 SHA: `eca21f115c1b` — `fix(db): idle connection pool 오류에서 복구`
- 이 Thread의 마지막 selected SHA입니다.

## 6. 불변식의 변화

<!-- LEARNER-BEGIN:06-load-fault-recovery-and-pool-error-containment.md:evolution -->
[각 불변식이 도입·확장·부족 판정·수정·회귀 보호된 SHA를 순서대로 작성합니다.]
<!-- LEARNER-END:06-load-fault-recovery-and-pool-error-containment.md:evolution -->

## 7. Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:06-load-fault-recovery-and-pool-error-containment.md:failure-links -->
[실패 또는 위험 → 원인 → 수정 SHA → 검증 SHA 관계를 작성합니다.]
<!-- LEARNER-END:06-load-fault-recovery-and-pool-error-containment.md:failure-links -->

## 8. Ownership·state·cleanup 변화

<!-- LEARNER-BEGIN:06-load-fault-recovery-and-pool-error-containment.md:ownership -->
[초기 owner와 최종 owner, 생성·이전·해제 시점을 실제 symbol로 작성합니다.]
<!-- LEARNER-END:06-load-fault-recovery-and-pool-error-containment.md:ownership -->

## 9. Thread 최종 상태

<!-- LEARNER-BEGIN:06-load-fault-recovery-and-pool-error-containment.md:final-state -->
[마지막 selected SHA에서 보장되는 상태와 남은 non-guarantee를 작성합니다.]
<!-- LEARNER-END:06-load-fault-recovery-and-pool-error-containment.md:final-state -->

## 10. 최종 실행 흐름

<!-- LEARNER-BEGIN:06-load-fault-recovery-and-pool-error-containment.md:final-flow -->
[입력 또는 lifecycle event부터 상태 전이·side effect·cleanup까지 최종 caller/callee 흐름을 작성합니다.]
<!-- LEARNER-END:06-load-fault-recovery-and-pool-error-containment.md:final-flow -->

## 11. 실행 및 검증 근거

<!-- LEARNER-BEGIN:06-load-fault-recovery-and-pool-error-containment.md:execution -->
- 실제로 실행한 command가 있으면 SHA, command, result를 기록합니다.
- 실행하지 못했다면 code inspection과 runtime execution을 구분하고 원인을 기록합니다.
<!-- LEARNER-END:06-load-fault-recovery-and-pool-error-containment.md:execution -->

## 12. 학습 완료 확인

<!-- LEARNER-BEGIN:06-load-fault-recovery-and-pool-error-containment.md:checks -->
- [ ] test-first load contract와 실제 harness implementation을 구분할 수 있습니다.
- [ ] reconnect staggering과 server-side finalization metric으로 바뀐 root cause를 설명할 수 있습니다.
- [ ] fault runner의 ordered steps, expected readiness, timeout, always-reset cleanup을 추적할 수 있습니다.
- [ ] idle Pool error가 readiness failure와 별개로 process crash가 될 수 있었던 이유를 설명할 수 있습니다.
- [ ] sanitizer와 reporter containment이 보장하는 것과 DB reconnect를 보장하지 않는 것을 구분할 수 있습니다.
<!-- LEARNER-END:06-load-fault-recovery-and-pool-error-containment.md:checks -->
