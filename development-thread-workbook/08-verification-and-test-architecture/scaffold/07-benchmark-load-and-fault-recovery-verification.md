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
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
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
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
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
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
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
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
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
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
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
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
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
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:335565908920:end -->


## Thread-level invariant evolution

다음 표에서 불변식이 도입·확장·교정·검증된 SHA를 구분합니다.

<!-- ANSWER:thread-07-invariants:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-07-invariants:end -->

## Failure → Fix → Test 관계

구현 추가를 독립 기능으로 나열하지 말고, 이전 가정과 실제 실패 위험, 수정된 결정, 회귀 증거를 연결합니다.

<!-- ANSWER:thread-07-failure-relations:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-07-failure-relations:end -->

## Ownership·state·responsibility 변화

자원과 상태를 누가 만들고, 보유하고, 이전하고, 정리하는지 커밋 순서에 따라 정리합니다.

<!-- ANSWER:thread-07-ownership:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-07-ownership:end -->

## 최종 Thread 상태

최종 HEAD를 과거 커밋에 투영하지 말고, 위 SHA 순서에서 도달한 보장을 요약합니다.

<!-- ANSWER:thread-07-final-state:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-07-final-state:end -->

## 최종 architecture / execution flow

실제 caller→boundary→state transition→cleanup 흐름을 순서대로 작성합니다.

<!-- ANSWER:thread-07-flow:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-07-flow:end -->

## 학습 완료 확인

<!-- ANSWER:thread-07-checks:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-07-checks:end -->

## 실행 증거 기록

<!-- ANSWER:thread-07-execution:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-07-execution:end -->
