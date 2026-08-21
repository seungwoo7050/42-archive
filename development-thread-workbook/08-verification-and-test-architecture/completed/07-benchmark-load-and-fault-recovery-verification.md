# Development Thread 07: benchmark·load·fault recovery 검증

English title: **Benchmark, Load, and Fault-Recovery Verification**

## Thread 목표

격리 benchmark, executable load SLO, Toxiproxy fault injection, 부하 중 snapshot cadence 수정, machine-readable recovery report가 서로 다른 증거 층으로 결합되는 과정을 복원한다.

## 핵심 질문

- scheduler microbenchmark와 실제 k6 service load는 어떤 변수를 각각 격리·포함하는가?
- measurement report에 runtime/CPU/settings를 포함해도 결과가 universal해지지 않는 이유는 무엇인가?
- 500 connections·50 rooms·99%·p95/p99·duplicate zero가 어떻게 executable contract가 되는가?
- DB와 edge fault path를 별도 proxy로 분리해야 원인과 recovery를 어떻게 구분할 수 있는가?
- 부하 병목을 simulation tick 저하가 아니라 20Hz state/10Hz staggered delivery로 수정한 이유는 무엇인가?
- fault runner의 always-reset와 loopback-only guard가 test harness 안전성에 왜 필수인가?

## 완료 기준

- microbenchmark, static harness contract, actual load capability, production fix, fault orchestration test를 구분한다.
- 모든 수치 threshold와 측정 metric을 concrete하게 설명한다.
- authoritative simulation cadence와 snapshot delivery cadence를 분리한다.
- fault scenario의 ordered state와 readiness 기대값·timeout·cleanup을 설명한다.
- 실제 load/fault 실행 결과가 없음을 명확히 구분한다.

## Commit map

| 순서 | Commit | Subject | Importance | Tags |
| --- | --- | --- | --- | --- |
| 1 | `aed88c8a93e0` | `perf(game): scheduler benchmark 실행 경계 추가` | B | REALTIME, OBSERVABILITY, PERF |
| 2 | `8d24b5e70837` | `perf(game): scheduler benchmark 측정 결과 출력` | B | REALTIME, OBSERVABILITY, PERF |
| 3 | `ff1bffcd5296` | `test(load): 실시간 부하 임계값 정의` | B | REALTIME, PERSISTENCE, OPERATIONS |
| 4 | `7b0b5f086b41` | `test(load): 실시간 fault injection 도구 추가` | A | AUTH, REALTIME, PERSISTENCE |
| 5 | `ad482c200cea` | `fix(game): 부하 중 snapshot cadence 안정화` | A | SIMULATION, REALTIME, PERF |
| 6 | `84bec3bf57ae` | `test(load): fault recovery 검사 자동화` | A | PERSISTENCE, OPERATIONS, PERF |
| 7 | `335565908920` | `test(load): fault scenario 설정과 report 검증` | B | PERSISTENCE, OPERATIONS, PERF |

> Commit 순서·subject·importance·tags는 Phase 1 감사 후 동결된 정보입니다. Phase 2에서는 변경하지 않습니다.

## Commit `aed88c8a93e0` — perf(game): scheduler benchmark 실행 경계 추가

- Full SHA: `aed88c8a93e0c9d987e80a23d5180b85f07e2b78`
- Subject: `perf(game): scheduler benchmark 실행 경계 추가`
- Importance: **B**
- Tags: REALTIME, OBSERVABILITY, PERF
- Source-defined role: room별 timer와 shared timer topology를 동일한 합성 room-step 작업·50ms cadence에서 비교하는 독립 benchmark 경계를 만든다.

### 정확한 조사 대상

- `tests/load/scheduler-benchmark.mjs`의 `TIMESTEP_MS`, `ROOM_COUNTS`, warmup, duration, repeats 설정을 확인한다.
- `room` 전략과 `shared` 전략이 같은 `simulateRoomStep` 함수를 수행하는지 확인한다.
- expected timestamp와 `performance.now()` 차이로 lag sample을 만드는 방식을 확인한다.
- 1, 20, 50, 100 room에서 p95/p99를 계산하기 위한 sample 수집·timer cleanup을 확인한다.

### 학습자 복원

<!-- ANSWER:aed88c8a93e0:begin -->
#### 역사적 복원

스케줄러 topology를 바꾸려면 실제 서비스 전체 부하보다 먼저 timer 수 자체의 영향을 격리할 필요가 있다. 이 script는 room별 `setInterval`과 하나의 shared `setInterval`을 비교하되 두 전략 모두 50ms cadence와 동일한 `simulateRoomStep` CPU work를 사용한다.

250ms warmup 뒤 expected fire time보다 늦은 정도를 sample로 모으고 room 수 1·20·50·100에서 p95/p99를 계산한다. duration 종료 시 생성한 모든 timer를 해제한다.

이 단계는 측정 경계를 만든 것이며 아직 결과 출력·선택 기준이 완성되지 않았다. 실제 PongSimulation이나 network broadcast를 수행하지 않으므로 topology 비교를 위한 microbenchmark다.

#### 이 커밋이 보장하는 것

- 두 scheduler topology를 같은 합성 작업과 cadence로 비교할 수 있다.
- room 수 증가에 따른 timer lag sample을 수집한다.

#### 이 커밋이 보장하지 않는 것

- 실제 GameHub·socket·DB 부하를 대표한다고 보장하지 않는다.
- 측정 환경과 선택 기준은 이 커밋만으로 기록되지 않는다.

#### 전후 관계

`8d24b5e70837`이 runtime metadata, 반복 median, 50-room 5% 선택 기준을 포함한 재현 가능한 report로 완성한다.

#### 증거 성격

- isolated scheduler microbenchmark boundary
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
<!-- ANSWER:aed88c8a93e0:end -->

## Commit `8d24b5e70837` — perf(game): scheduler benchmark 측정 결과 출력

- Full SHA: `8d24b5e70837afe3762622a29e802e40bc66071e`
- Subject: `perf(game): scheduler benchmark 측정 결과 출력`
- Importance: **B**
- Tags: REALTIME, OBSERVABILITY, PERF
- Source-defined role: scheduler benchmark를 runtime 환경·설정·반복 median·선택 결정을 담은 JSON report로 만든다.

### 정확한 조사 대상

- room count와 strategy별 `REPEATS` 실행 및 p95/p99 median 집계를 확인한다.
- Node version, platform/release, CPU model/count, total/free memory를 report에 포함하는지 확인한다.
- settings에 timestep, duration, warmup, repeats, room counts가 기록되는지 확인한다.
- 50-room shared p95가 room p95의 105% 이내일 때 shared를 선택하는 기준을 확인한다.
- stdout JSON이 후속 비교 가능한 구조인지 확인한다.

### 학습자 복원

<!-- ANSWER:8d24b5e70837:begin -->
#### 역사적 복원

이 커밋은 단일 실행 숫자만 출력하는 대신 strategy/room count별 반복 결과의 median을 계산하고 측정 환경과 설정을 함께 JSON으로 기록한다.

의사결정은 50-room에서 shared p95가 room-per-timer p95의 105% 이내인지로 명시된다. 따라서 selected strategy가 임의 인상이 아니라 저장 가능한 threshold 계산으로 나온다.

보고서가 환경 메타데이터를 포함해도 서로 다른 machine의 수치를 자동으로 동일하게 만들지는 않는다. 이는 해석 가능성을 높이는 것이지 universal benchmark 결과를 주장하는 것은 아니다.

#### 이 커밋이 보장하는 것

- benchmark 결과와 실행 환경·설정·선택 기준이 한 JSON artifact로 결합된다.
- 반복 run의 일회성 outlier를 median으로 완화한다.

#### 이 커밋이 보장하지 않는 것

- 이 커밋 자체가 특정 machine에서 실제 실행된 결과를 repository에 고정하지 않는다.
- 5% 기준이 사용자 latency SLO를 직접 의미하지 않는다.

#### 전후 관계

`aed88c8a93e0`의 측정 경계를 review 가능한 decision report로 완성한다.

#### 증거 성격

- reproducible benchmark reporting contract
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
<!-- ANSWER:8d24b5e70837:end -->

## Commit `ff1bffcd5296` — test(load): 실시간 부하 임계값 정의

- Full SHA: `ff1bffcd5296ed89fca6f42b070f6ecac4c0eb65`
- Subject: `test(load): 실시간 부하 임계값 정의`
- Importance: **B**
- Tags: REALTIME, PERSISTENCE, OPERATIONS
- Source-defined role: k6/Toxiproxy load harness의 기본 규모, metric 집합, SLO threshold, overlay wiring을 정적 실행 테스트로 고정한다.

### 정확한 조사 대상

- `tests/load/load-harness.test.mjs`에서 default 500 connections, 50 rooms, 100 player connections를 확인한다.
- 최소 성공 연결 495, optional 1,000 connection profile, connections >= rooms*2 guard를 확인한다.
- connection/reconnect 99%, snapshot p95 150ms·p99 250ms, drop <1%, finalize failure/duplicate 0 threshold를 확인한다.
- k6 source에 required metric과 dev-login→ticket→v1 queue/input 경로가 실제로 있는지 source contract를 확인한다.
- Toxiproxy PostgreSQL/edge plan과 Compose route가 별도 proxy를 통과하는지 확인한다.

### 학습자 복원

<!-- ANSWER:ff1bffcd5296:begin -->
#### 역사적 복원

load script가 존재하는 것만으로는 어떤 규모와 실패 기준이 release evidence인지 알 수 없다. 이 테스트는 default profile을 500 연결·50 active room·100 player connection으로 고정하고 99% 이상 연결 성공을 요구한다.

metric threshold는 reconnect success 99%, snapshot delay p95 150ms/p99 250ms, normal snapshot drop rate 1% 미만, finalization failure/duplicate 0, 결과 50개 이상, online 495 이상, active room 50 이상이다. 1,000 연결은 `EXTENDED_LOAD=1` 또는 명시 설정에서만 선택된다.

테스트는 profile object만 비교하지 않고 k6 source에 ticket issuance, v1 queue/input, inputSeq/serverTimeMs metric 경로가 있는지 확인하고, Toxiproxy 계획과 Compose overlay가 DB와 public edge를 별도 proxy로 라우팅하는지 검사한다.

이는 harness contract를 검증하지만 실제 k6 run의 SLO 통과 결과는 아니다.

#### 이 커밋이 보장하는 것

- 부하 규모·metric·threshold·fault overlay가 의도와 다르게 drift하는 것을 막는다.
- 연결 수와 room 수가 논리적으로 맞지 않는 profile을 사전에 거부한다.

#### 이 커밋이 보장하지 않는 것

- 500/1,000 실제 연결을 이 단위 테스트에서 열지 않는다.
- 환경별 capacity나 장기 soak stability를 증명하지 않는다.

#### 전후 관계

`7b0b5f086b41`의 load/fault harness를 executable contract로 고정하고, `ad482c200cea`의 cadence fix를 평가할 기준을 제공한다.

#### 증거 성격

- static/executable load-harness contract test
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
<!-- ANSWER:ff1bffcd5296:end -->

## Commit `7b0b5f086b41` — test(load): 실시간 fault injection 도구 추가

- Full SHA: `7b0b5f086b4193b9585e5a8bf6e55ec6e52fb447`
- Subject: `test(load): 실시간 fault injection 도구 추가`
- Importance: **A**
- Tags: AUTH, REALTIME, PERSISTENCE
- Source-defined role: k6 realtime load와 Toxiproxy DB/edge fault 주입을 결합해 연결·재연결·snapshot·finalization invariant를 운영 경계에서 측정할 수 있게 한다.

### 정확한 조사 대상

- `docker-compose.load.yml`의 Toxiproxy service, bootstrap, API DATABASE_URL, edge port wiring을 확인한다.
- `tests/load/load-profile.mjs`의 profile/threshold/hold/reconnect timing을 확인한다.
- `pong-load.js`에서 dev-login cookie, one-time ticket, version-1 WebSocket, queue/ready/input sequence를 추적한다.
- snapshot `serverTimeMs` delay, sequence gap drop rate, online/active room metric 수집을 확인한다.
- finished result의 persisted flag, matchId/roomId, duplicate set 검사와 reconnect same-room recovery를 확인한다.
- `toxiproxy-control.mjs`의 postgres/edge proxy와 latency/down/reset/up command, argument validation을 확인한다.

### 학습자 복원

<!-- ANSWER:7b0b5f086b41:begin -->
#### 역사적 복원

unit·process smoke는 하나 또는 몇 개 연결의 correctness를 보여 주지만 수백 connection, 다수 room, reconnect storm, DB/edge degradation에서 invariant가 유지되는지는 측정하지 못한다. 이 커밋은 별도 load runtime을 정의한다.

k6 VU는 dev-login cookie로 one-time ticket을 발급하고 version-1 socket을 연다. player VU는 queue에 들어가 ready/inputSeq를 보내고 initial connection을 닫은 뒤 새 ticket으로 같은 room에 복구한다. snapshot의 `serverTimeMs`와 sequence gap으로 delay/drop을 기록한다.

완료 결과는 left side에서 `persisted: true`, 유효한 matchId, 기대 roomId를 요구하고 per-VU set으로 duplicate match/room 결과를 센다. connection/reconnect/online/active-room/finalization metric은 threshold 평가에 사용된다.

Toxiproxy는 PostgreSQL과 edge를 별도 proxy로 만들며 API DB traffic과 public edge를 overlay를 통해 통과시킨다. control script는 latency, down/up, peer reset을 명시적 command로 제공하고 잘못된 숫자를 거부한다.

이 도구는 fault를 주입할 능력을 제공하지만 recovery 절차와 report를 자동으로 순서화하는 것은 `84bec3bf57ae`에서 완성된다.

#### 이 커밋이 보장하는 것

- 대규모 realtime traffic에서 auth ticket, same-room reconnect, snapshot cadence, single finalization을 측정할 수 있다.
- DB와 edge fault path가 분리되어 원인별 degradation을 주입할 수 있다.
- load profile과 fault topology가 versioned protocol/credential 경계를 우회하지 않는다.

#### 이 커밋이 보장하지 않는 것

- repository에 기록된 실제 부하 실행 결과가 아니다.
- k6 VU model이 실제 browser rendering 비용을 포함하지 않는다.
- process crash·multi-region failure까지 주입하지 않는다.

#### 전후 관계

`ff1bffcd5296`이 harness contract를 고정하고, `ad482c200cea`가 부하 병목으로 드러난 snapshot burst를 수정하며, `84bec3bf57ae`가 fault-recovery sequence를 자동화한다.

#### 증거 성격

- load and network/database fault-injection architecture
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
<!-- ANSWER:7b0b5f086b41:end -->

## Commit `ad482c200cea` — fix(game): 부하 중 snapshot cadence 안정화

- Full SHA: `ad482c200cea41429c48419fc564069751505d5c`
- Subject: `fix(game): 부하 중 snapshot cadence 안정화`
- Importance: **A**
- Tags: SIMULATION, REALTIME, PERF
- Source-defined role: authoritative simulation은 20Hz로 유지하면서 snapshot 전송은 room별 교대 slot을 가진 10Hz로 줄여 동시 burst를 분산한다.

### 정확한 조사 대상

- `apps/api/src/gameHub.ts`의 `SIMULATION_TIMESTEP_MS`, `SNAPSHOT_DELIVERY_DIVISOR`, `snapshotDeliverySlot`을 확인한다.
- 새 room이 0/1 slot을 round-robin으로 배정받는지 확인한다.
- simulation `step`과 snapshot sync는 매 50ms 수행되지만 broadcast는 `(tick + slot) % 2 === 0`일 때만 실행되는지 확인한다.
- room authoritative state와 client delivery cadence가 분리되었는지 확인한다.
- finalization observer의 `created` metadata와 duplicate metric 연결도 같은 diff에서 확인한다.

### 학습자 복원

<!-- ANSWER:ad482c200cea:begin -->
#### 역사적 복원

부하 profile에서 room별 20Hz snapshot을 같은 tick에 전송하면 simulation 자체보다 serialization/send burst가 event loop와 transport buffer를 압박할 수 있었다. 단순히 simulation tick을 낮추면 게임 규칙과 입력 반응을 바꾸므로 올바른 수정이 아니다.

수정은 simulation timestep 50ms, 즉 20Hz를 유지한다. 각 room은 생성 시 0 또는 1의 `snapshotDeliverySlot`을 round-robin으로 받고, snapshot broadcast는 divisor 2 조건에서만 수행해 10Hz가 된다. slot이 번갈아 있으므로 여러 room의 전송이 같은 tick에 몰리지 않는다.

authoritative state는 매 tick 갱신되고 client는 더 낮은 cadence의 최신 projection을 받는다. 같은 커밋은 finalization observer에 `created`를 전달해 DB가 기존 idempotent 결과를 반환한 경우 duplicate metric으로 관찰할 수 있게 한다.

핵심은 simulation correctness와 delivery capacity를 별도 조절하는 것이다.

#### 이 커밋이 보장하는 것

- authoritative mechanics와 input processing은 20Hz를 유지한다.
- snapshot delivery는 10Hz로 bounded되고 room slot으로 burst가 분산된다.
- idempotent existing-result 반환이 별도 metric으로 관찰된다.

#### 이 커밋이 보장하지 않는 것

- 모든 환경에서 p95/p99 threshold를 자동으로 통과한다고 보장하지 않는다.
- 10Hz가 모든 클라이언트 UX에 최적이라는 일반 결론은 아니다.

#### 전후 관계

load harness가 드러낸 병목을 timing ownership을 깨지 않고 수정한다. 후속 load regression은 20Hz simulation/10Hz staggered delivery를 함께 확인한다.

#### 증거 성격

- load-induced cadence correction
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
<!-- ANSWER:ad482c200cea:end -->

## Commit `84bec3bf57ae` — test(load): fault recovery 검사 자동화

- Full SHA: `84bec3bf57ae15af185ed17ce935008438461758`
- Subject: `test(load): fault recovery 검사 자동화`
- Importance: **A**
- Tags: PERSISTENCE, OPERATIONS, PERF
- Source-defined role: Toxiproxy command와 readiness polling을 순서화하여 baseline→degradation→outage/reset→recovery를 versioned JSON report로 자동 검증한다.

### 정확한 조사 대상

- `tests/load/fault-scenario.mjs`의 `createFaultScenarioConfig`, `runFaultScenario`, `observeStep`을 확인한다.
- control/API/edge URL이 HTTP loopback으로 제한되는지 확인한다.
- baseline, DB latency 300ms, DB down, DB up/recovery, edge latency 150ms, edge reset, edge recovery 순서를 확인한다.
- DB down이 HTTP 503 + `not_ready` + `checks.database=down`으로 관찰되는지 확인한다.
- request/recovery timeout과 poll interval, JSON `schemaVersion: 1` report를 확인한다.
- 성공·실패 어느 경우에도 마지막 `reset`이 실행되고 cleanup error가 원래 error와 어떻게 결합되는지 확인한다.

### 학습자 복원

<!-- ANSWER:84bec3bf57ae:begin -->
#### 역사적 복원

Toxiproxy control command가 있어도 사람이 수동으로 fault를 넣고 readiness를 눈으로 확인하면 순서·timeout·cleanup·증거 형식이 재현되지 않는다. 이 커밋은 fault scenario 자체를 실행 가능한 state machine으로 만든다.

설정은 control, API readiness, edge readiness URL을 loopback HTTP로 제한해 우발적으로 외부 target을 변조하지 못하게 한다. 기본 DB latency 300ms, edge latency 150ms, request timeout 5초, recovery timeout 15초, polling 250ms가 명시된다.

runner는 모든 proxy를 reset하고 baseline ready를 확인한 뒤 DB latency에서도 ready, DB down에서는 503/not_ready/database down, DB up 후 ready를 기다린다. 선택적으로 edge latency, peer reset으로 network failure, edge up 후 recovery를 관찰한다. 각 단계는 status, duration, body/error를 report에 남긴다.

try/catch 뒤 별도 cleanup block에서 항상 proxy reset을 시도한다. scenario와 cleanup이 모두 실패하면 원래 오류를 유지하면서 cleanup error를 cause로 보존한다. 성공 report는 schemaVersion 1, settings, target, ordered steps, timestamps를 가진다.

#### 이 커밋이 보장하는 것

- DB/edge degradation과 readiness failure/recovery가 bounded polling으로 검증된다.
- fault target은 loopback으로 제한되고 proxy state는 성공·실패 뒤 reset된다.
- 결과가 versioned machine-readable report로 남는다.

#### 이 커밋이 보장하지 않는 것

- 실제 production network나 원격 host에 fault를 주입하지 않는다.
- DB가 down인 동안 in-flight business transaction의 모든 결과를 검증하지 않는다.
- 이 커밋 자체에 실제 실행 report가 포함된 것은 아니다.

#### 전후 관계

`335565908920`이 dependency injection으로 command/probe/sleep 순서와 cleanup을 deterministic하게 검증한다.

#### 증거 성격

- automated operational fault-recovery scenario
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
<!-- ANSWER:84bec3bf57ae:end -->

## Commit `335565908920` — test(load): fault scenario 설정과 report 검증

- Full SHA: `335565908920371a20f939ae27df5bcd985792c9`
- Subject: `test(load): fault scenario 설정과 report 검증`
- Importance: **B**
- Tags: PERSISTENCE, OPERATIONS, PERF
- Source-defined role: fault runner의 설정 안전성, 명령 순서, polling, JSON report, 실패 cleanup을 외부 Toxiproxy 없이 결정적으로 검증한다.

### 정확한 조사 대상

- `tests/load/fault-scenario.test.mjs`의 dependency injection 지점을 확인한다.
- 기본 loopback URL·latency·timeout과 non-loopback 거부 사례를 확인한다.
- 가짜 probe sequence가 ready→latency ready→DB down→recovery→edge reset→recovery를 만드는지 확인한다.
- 명령 배열과 sleep 배열이 정확한 순서/횟수인지 확인한다.
- report의 schemaVersion/timestamp/targets/steps/duration/error가 기대와 일치하는지 확인한다.
- `db-down` control 실패 뒤에도 마지막 `reset`이 호출되는지 확인한다.

### 학습자 복원

<!-- ANSWER:335565908920:begin -->
#### 역사적 복원

외부 Toxiproxy를 매번 띄우지 않고도 runner의 제어 논리를 검증하기 위해 command, readiness probe, sleep, clock을 주입한다. 가짜 probe 결과는 DB down 전 두 번의 not-ready polling과 edge socket reset을 포함한다.

테스트는 `reset → db-latency → db-down → db-up → edge-latency → edge-reset → edge-up → reset` 명령 순서와 두 번의 250ms sleep을 정확히 비교한다. report는 시작/종료 시각, target, settings, ordered step, latency duration, DB down body, socket-reset error를 보존해야 한다.

별도 실패 사례에서 `db-down` command가 예외를 던져도 마지막 reset이 호출되는지 확인한다. 또한 non-loopback URL은 runner가 어떤 command도 수행하기 전에 거부된다.

#### 이 커밋이 보장하는 것

- fault orchestration과 report 형식이 외부 환경 없이 결정적으로 회귀 검증된다.
- 중간 control failure에서도 cleanup reset이 보장된다.

#### 이 커밋이 보장하지 않는 것

- 실제 Toxiproxy·PostgreSQL·edge process가 예상 상태로 변하는지는 이 단위 테스트가 증명하지 않는다.
- 실제 recovery duration 수치를 제공하지 않는다.

#### 전후 관계

`84bec3bf57ae`의 operational runner를 설정/제어/cleanup contract 수준에서 고정한다.

#### 증거 성격

- deterministic orchestration and cleanup regression
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
<!-- ANSWER:335565908920:end -->


## Thread-level invariant evolution

다음 표에서 불변식이 도입·확장·교정·검증된 SHA를 구분합니다.

<!-- ANSWER:thread-07-invariants:begin -->
### 복원 결과

| SHA | 변화 | 불변식 |
| --- | --- | --- |
| `aed88c8a93e0` | benchmark 경계 | room timer와 shared timer를 동일 50ms 합성 work에서 비교한다. |
| `8d24b5e70837` | 측정 보고 | 반복 median, runtime metadata, 50-room 5% decision rule이 JSON으로 기록된다. |
| `ff1bffcd5296` | load 계약 | 500 connections·50 rooms와 연결/재연결/snapshot/finalization threshold가 executable profile이 된다. |
| `7b0b5f086b41` | fault/load 도구 | k6가 ticket/v1/reconnect/snapshot/finalization을 측정하고 Toxiproxy가 DB/edge를 분리한다. |
| `ad482c200cea` | 부하 수정 | simulation 20Hz를 유지하면서 snapshot 10Hz와 교대 slot으로 burst를 분산한다. |
| `84bec3bf57ae` | 복구 자동화 | baseline→DB latency/down/up→edge latency/reset/up가 bounded readiness polling과 versioned report가 된다. |
| `335565908920` | orchestrator 회귀 | loopback guard, command/probe/sleep 순서, report와 실패 후 reset이 결정적으로 검증된다. |

각 변화는 이전 커밋의 최종 상태를 다음 커밋이 단순 반복한 것이 아니라, 새 경계를 도입·확장·교정하거나 regression으로 보호한 시점을 나타냅니다.
<!-- ANSWER:thread-07-invariants:end -->

## Failure → Fix → Test 관계

구현 추가를 독립 기능으로 나열하지 말고, 이전 가정과 실제 실패 위험, 수정된 결정, 회귀 증거를 연결합니다.

<!-- ANSWER:thread-07-failure-relations:begin -->
### 복원 결과

| Failure / 이전 가정 | Fix / 결정 | Verification |
| --- | --- | --- |
| timer topology 선택이 인상·단일 숫자에 의존 | 동일 work benchmark + environment/report + 5% rule | `aed88...` → `8d24...` |
| load script 존재하지만 규모·SLO·metric drift | executable profile/threshold/source contract | `ff1bffcd5296` |
| 20Hz snapshot burst가 event loop/transport를 압박 | `ad482c200cea` — 20Hz simulation 유지, 10Hz staggered delivery | 후속 load regression과 metric 관찰 |
| 수동 fault 주입이 순서·cleanup·증거를 보장하지 못함 | `84bec3bf57ae` automated runner | `335565908920` dependency-injected regression |
<!-- ANSWER:thread-07-failure-relations:end -->

## Ownership·state·responsibility 변화

자원과 상태를 누가 만들고, 보유하고, 이전하고, 정리하는지 커밋 순서에 따라 정리합니다.

<!-- ANSWER:thread-07-ownership:begin -->
### 복원 결과

| 대상 | 소유자 | 책임·수명 |
| --- | --- | --- |
| Topology microbenchmark | `scheduler-benchmark.mjs` | 합성 work, timer topology, lag sample과 environment report를 소유한다. |
| Load profile | `load-profile.mjs` | connections, rooms, hold/reconnect timing, SLO threshold를 소유한다. |
| Realtime load client | `pong-load.js` | cookie/ticket/v1 socket, queue/input/reconnect, metric observation을 소유한다. |
| Fault topology | Toxiproxy + Compose overlay | PostgreSQL·edge의 별도 degradation 경로를 소유한다. |
| Delivery cadence | GameHub room `snapshotDeliverySlot` | 20Hz authoritative state와 10Hz staggered projection을 분리한다. |
| Fault orchestration | `fault-scenario.mjs` | ordered commands, readiness expectations, polling, report, final reset을 소유한다. |
| Harness regression | `fault-scenario.test.mjs` | 외부 dependency 없이 orchestration contract를 결정적으로 보호한다. |
<!-- ANSWER:thread-07-ownership:end -->

## 최종 Thread 상태

최종 HEAD를 과거 커밋에 투영하지 말고, 위 SHA 순서에서 도달한 보장을 요약합니다.

<!-- ANSWER:thread-07-final-state:begin -->
### 최종 상태

- scheduler topology는 격리 benchmark와 환경 metadata가 있는 JSON decision report로 비교된다.
- load harness는 500 connection·50 room 기본 규모와 구체적 connection/reconnect/snapshot/finalization threshold를 가진다.
- k6와 Toxiproxy는 최종 auth/protocol을 우회하지 않고 DB/edge degradation을 별도로 주입할 수 있다.
- 부하 대응은 simulation authority를 20Hz로 유지하면서 snapshot 전달만 10Hz로 낮추고 room별 burst를 분산한다.
- fault recovery는 loopback-only, bounded polling, always-reset, versioned JSON report로 자동화되며 orchestration 자체도 단위 회귀를 가진다.
<!-- ANSWER:thread-07-final-state:end -->

## 최종 architecture / execution flow

실제 caller→boundary→state transition→cleanup 흐름을 순서대로 작성합니다.

<!-- ANSWER:thread-07-flow:begin -->
### 최종 실행 흐름

1. microbenchmark로 room/shared timer topology의 lag 비교
2. load profile에서 connections/rooms/SLO 확정
3. k6가 cookie→ticket→v1 socket으로 500 connections·50 rooms 구동
4. snapshot delay/drop, reconnect, online/rooms, finalization duplicate/failure 측정
5. Toxiproxy로 DB latency/down 및 edge latency/reset 주입
6. readiness에서 failure/recovery state bounded polling
7. GameHub는 20Hz simulation·10Hz staggered snapshots로 delivery burst 완화
8. runner가 schemaVersion 1 JSON report 생성 후 항상 proxy reset
<!-- ANSWER:thread-07-flow:end -->

## 학습 완료 확인

<!-- ANSWER:thread-07-checks:begin -->
### 완료 확인

- [x] microbenchmark 수치와 actual service SLO를 동일시하면 안 되는 이유를 설명할 수 있다.
- [x] 500/50 profile에서 player connection이 100이고 최소 성공 연결이 495인 계산을 설명할 수 있다.
- [x] snapshot p95 150ms·p99 250ms·drop 1% 미만·final duplicate 0을 열거할 수 있다.
- [x] 20Hz simulation과 10Hz delivery가 모순되지 않는 state projection 흐름을 설명할 수 있다.
- [x] fault runner의 non-loopback 거부와 finally reset이 어떤 위험을 줄이는지 설명할 수 있다.
- [x] 이 workbook이 실제 load pass 결과를 기록하지 않는 이유를 설명할 수 있다.

체크는 repository code inspection을 통해 설명이 문서에 작성되었음을 뜻합니다. 실제 repository test suite 실행 완료를 뜻하지 않습니다.
<!-- ANSWER:thread-07-checks:end -->

## 실행 증거 기록

<!-- ANSWER:thread-07-execution:begin -->
- Historical inspection: 각 참조 SHA의 GitHub commit diff와 변경 파일을 개별 조회했습니다.
- Repository test execution: 실행하지 않았습니다. 로컬 환경에서 지정 branch의 전체 checkout을 materialize하지 못해 pnpm, PostgreSQL, Playwright, k6, Toxiproxy 명령 결과를 만들 수 없었습니다.
- Runtime claims: 기록하지 않았습니다. 위의 `증거 성격`은 test 구현과 production code path에 대한 정적·역사적 검사입니다.
- Artifact validation: scaffold/completed 대응, fixed metadata, answer completion, SHA uniqueness, Markdown fence, ZIP 구조는 로컬 검증 스크립트로 검사했습니다.
<!-- ANSWER:thread-07-execution:end -->
