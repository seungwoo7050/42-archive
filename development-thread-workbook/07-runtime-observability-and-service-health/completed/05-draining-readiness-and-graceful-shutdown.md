# Draining readiness와 graceful shutdown

- 카테고리: `07-runtime-observability-and-service-health` — 런타임 관측성과 서비스 상태
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`
- Phase 1 상태: frozen authoritative scaffold

## 1. Thread 목표

새 work admission을 즉시 닫고 active rooms를 bounded time 동안 drain한 뒤 process resources를 한 번만 정리하며, external container kill budget까지 application drain과 정렬하는 종료 lifecycle을 복원합니다.

범위 메모: Compose 설정을 참조하지만 일반적인 image/release delivery가 아니라 application drain 보장의 외부 상한이므로 이 카테고리에 포함합니다. production artifact 구성 자체는 카테고리 09에 남습니다.

### 직접 연결되는 불변식

- drain 시작 즉시 readiness가 not-ready가 되고 새 queue/tournament/AI work는 거부됩니다.
- 기존 active rooms는 최대 60초 동안 완료할 수 있지만 shutdown은 무기한 기다리지 않습니다.
- 반복 SIGTERM/SIGINT는 하나의 drain-and-close sequence만 시작합니다.
- container termination grace는 application의 60초 drain budget보다 짧지 않습니다.

## 2. 핵심 질문

- readiness lifecycle과 GameHub admission state는 어떤 호출에서 동시에 draining으로 전이됩니까?
- waiting work와 active rooms는 drain에서 왜 다르게 처리됩니까?
- signal 중복·drain timeout·close failure는 어떤 result/exit state로 수렴합니까?
- application timeout과 Compose stop grace의 ownership 관계는 어떻게 검증됩니까?

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
| 1 | `44ef3e07e1a5` | `feat(game): 새 작업 차단과 active room drain 추가` | A | PROTOCOL, REALTIME, TOURNAMENT | GameHub와 readiness가 공유하는 draining state를 도입해 새 matchmaking을 즉시 거부하고 active rooms를 bounded time 동안 기다립니다. |
| 2 | `1c9981393973` | `feat(ops): graceful shutdown 절차 추가` | A | REALTIME, PERSISTENCE, OPERATIONS | SIGTERM/SIGINT를 단일-entry drain→app close 절차로 연결하고 shutdown 오류를 process exit 상태에 반영합니다. |
| 3 | `9d05f47e7f4b` | `test(ops): GameHub drain과 graceful shutdown 검증` | A | REALTIME, OPERATIONS, RISK | drain admission, active-room timeout, readiness transition, repeated signal single-entry를 fake time과 injected signal source로 검증합니다. |
| 4 | `312ddbc6fbe2` | `fix(runtime): container 종료 유예를 room drain과 정렬` | A | REALTIME, OPERATIONS, RISK | API container의 `stop_grace_period`를 70초로 설정해 application의 60초 room drain budget보다 길게 만듭니다. |
| 5 | `73ba979841cd` | `test(docker): API 종료 유예 계약 검증` | B | OPERATIONS, TEST | production Compose duration을 파싱해 API stop grace가 application 60초 drain budget 이상인지 검증합니다. |

## 5. Commit별 학습 기록

### 5.1. `feat(game): 새 작업 차단과 active room drain 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `44ef3e07e1a5` |
| Importance | A |
| Tags | PROTOCOL, REALTIME, TOURNAMENT |
| Source에서 확정된 역할 | GameHub와 readiness가 공유하는 draining state를 도입해 새 matchmaking을 즉시 거부하고 active rooms를 bounded time 동안 기다립니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/app.ts`, `apps/api/src/gameHub.ts`, `packages/shared/src/ws.ts`
- 핵심 symbol: `app.beginDrain`, `GameHub.beginDrain`, `acceptingMatches`, drain waiters/timer, `server_draining` error
- `app.beginDrain`이 lifecycle flag를 먼저 `draining`으로 바꿔 `/health/ready`를 즉시 503으로 만드는지 확인합니다.
- `GameHub.beginDrain(timeoutMs)`가 queue, AI fallback timers, tournament waiting state를 비우고 새 queue command를 `server_draining`으로 거부하는지 추적합니다.
- 이미 active인 rooms는 즉시 제거하지 않고 room count가 0이 되거나 timeout이 만료될 때 Promise를 resolve하는지 확인합니다.
- 반복 `beginDrain` 호출이 같은 Promise/transition을 재사용하고 timeout handle이 `unref`/cleanup되는지 확인합니다.
- `GameHub.close`가 shared scheduler, reconnect timers, guest result retention, heartbeat, snapshot buffer, sockets를 어떤 순서로 정리하는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:44ef3e07e1a5:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | service는 process signal이나 deployment 종료가 시작돼도 readiness가 계속 ready였고, 새 queue/tournament/AI work를 받으면서 기존 rooms와 함께 종료해야 했습니다. |
| 해결하려던 문제와 위험 | 새 작업 admission을 멈추지 않으면 active room 수가 drain 중에도 늘어나 종료가 수렴하지 않습니다. 반대로 모든 socket을 즉시 닫으면 진행 중 match의 authoritative result와 persistence 기회를 잃습니다. |
| 핵심 구현 결정 | app과 GameHub에 explicit draining state를 추가합니다. app은 drain 시작 즉시 readiness lifecycle을 `draining`으로 노출하고, GameHub는 matchmaking admission을 닫아 waiting work를 정리하되 active room은 timeout budget 안에서 finish하도록 둡니다. shared protocol에 stable `server_draining` error가 추가됩니다. |
| 입력 → 상태 전이 → 출력 | `app.beginDrain(60_000)` → lifecycle=`draining` → `hub.beginDrain` → queue/timers/waiters clear·new work reject → active room removal 때 drain waiter 재평가 → rooms=0이면 `{drained:true}` 또는 timeout이면 `{drained:false, activeRooms:n}` resolve → 이후 app close입니다. |
| ownership/lifetime/cleanup | app은 public readiness lifecycle을, GameHub는 queue/room admission과 drain Promise/timer를 소유합니다. 기존 room은 정상 RoomSession/GameHub owner를 유지하며 terminal cleanup이 drain waiter를 알립니다. |
| failure/rollback/retry | active room이 finish하지 않아도 timeout이 상한을 보장합니다. repeated drain은 새 timer를 만들지 않고, new queue attempt는 explicit protocol error를 받습니다. timeout 뒤 remaining room sockets의 최종 처리는 후속 app close가 담당합니다. |
| 보장하는 것 | drain 시작과 동시에 새 work가 차단되고 readiness가 내려가며, 기존 active rooms는 bounded budget 안에서 정상 완료할 기회를 갖습니다. |
| 보장하지 않는 것 | 이 SHA만으로 SIGTERM/SIGINT가 drain을 호출하지 않으며 container가 60초보다 일찍 kill하면 budget을 보장하지 못합니다. |
| 후속 연결 | `1c9981393973`이 process signals를 drain→close에 연결하고 `9d05f47e7f4b`가 admission/timeout/readiness 전이를 검증합니다. `312ddbc6fbe2`가 container budget을 정렬합니다. |
<!-- LEARNER-END:44ef3e07e1a5:record -->




#### 비교 기준

- 이 commit의 parent 상태와 비교합니다.
- 다음 관련 SHA: `1c9981393973` — `feat(ops): graceful shutdown 절차 추가`

### 5.2. `feat(ops): graceful shutdown 절차 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `1c9981393973` |
| Importance | A |
| Tags | REALTIME, PERSISTENCE, OPERATIONS |
| Source에서 확정된 역할 | SIGTERM/SIGINT를 단일-entry drain→app close 절차로 연결하고 shutdown 오류를 process exit 상태에 반영합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/gracefulShutdown.ts`, `apps/api/src/index.ts`
- 핵심 symbol: `installGracefulShutdown`, guarded shutdown callback, signal listener dispose, `app.beginDrain(60_000)`
- `installGracefulShutdown`이 SIGTERM/SIGINT listener를 설치하고 첫 signal의 shutdown Promise만 실행하는 guard를 확인합니다.
- entrypoint shutdown callback이 60초 drain을 기다린 뒤 `app.close()`를 호출하는 순서를 확인합니다.
- drain 또는 close 실패 시 logging/`process.exitCode=1`과 best-effort close가 어떻게 수행되는지 확인합니다.
- app close hook 또는 disposer가 signal listeners를 제거해 테스트·embedded lifecycle에서 중복 listener를 남기지 않는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:1c9981393973:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | drain API는 수동 호출할 수 있었지만 process signals는 default Node 종료 동작에 맡겨져 deployment termination과 application lifecycle이 연결되지 않았습니다. |
| 해결하려던 문제와 위험 | signal마다 별도 shutdown을 시작하면 app.close, repository.close, socket cleanup이 중복 실행될 수 있습니다. 오류에서 즉시 `process.exit()`하면 cleanup이 중단되고, 오류를 무시하면 성공 종료로 오인됩니다. |
| 핵심 구현 결정 | signal source와 shutdown callback을 주입받는 `installGracefulShutdown`을 추가합니다. 첫 signal만 async shutdown을 시작하고 후속 signals는 무시합니다. entrypoint는 GameHub drain budget을 기다린 뒤 Fastify를 닫고, 실패를 log·exitCode 1로 기록합니다. |
| 입력 → 상태 전이 → 출력 | SIGTERM 또는 SIGINT → single-entry guard set → `app.beginDrain(60_000)` → drain result log → `app.close()` → Fastify onClose가 GameHub/repository resources 정리 → Promise failure면 error report·exitCode 1·best-effort close입니다. |
| ownership/lifetime/cleanup | signal listeners와 one-shot guard는 installer가 소유하며 disposer가 해제합니다. entrypoint shutdown callback은 app/drain 순서를, Fastify hooks는 하위 repository/GameHub cleanup을 소유합니다. |
| failure/rollback/retry | drain timeout은 정상 결과로 보고 close를 계속합니다. drain/close rejection은 uncaught signal handler exception으로 퍼뜨리지 않고 error callback 및 nonzero exitCode에 기록합니다. repeated signals는 두 번째 cleanup을 시작하지 않습니다. |
| 보장하는 것 | deployment signal이 하나의 bounded drain-and-close sequence로 수렴하고 failure는 성공 exit로 위장되지 않습니다. |
| 보장하지 않는 것 | external orchestrator가 application의 60초 budget보다 긴 grace를 주는지는 이 code가 통제하지 못합니다. |
| 후속 연결 | `9d05f47e7f4b`가 repeated signals와 failure callback을 결정적으로 검증하고, `312ddbc6fbe2`가 Compose grace를 70초로 늘립니다. |
<!-- LEARNER-END:1c9981393973:record -->




#### 비교 기준

- 직전 관련 SHA: `44ef3e07e1a5` — `feat(game): 새 작업 차단과 active room drain 추가`
- 다음 관련 SHA: `9d05f47e7f4b` — `test(ops): GameHub drain과 graceful shutdown 검증`

### 5.3. `test(ops): GameHub drain과 graceful shutdown 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `9d05f47e7f4b` |
| Importance | A |
| Tags | REALTIME, OPERATIONS, RISK |
| Source에서 확정된 역할 | drain admission, active-room timeout, readiness transition, repeated signal single-entry를 fake time과 injected signal source로 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/gameHub.drain.test.ts`, `apps/api/src/gracefulShutdown.test.ts`, `apps/api/src/health.test.ts`
- 핵심 symbol: `beginDrain` cases, `EventEmitter` signal source, fake timers, readiness inject
- waiting player를 넣은 뒤 drain 시작 즉시 queued count가 0이 되고 새 AI/queue command가 `server_draining`을 받는지 확인합니다.
- room이 없을 때 `{drained:true, activeRooms:0}`으로 즉시 resolve하는지 확인합니다.
- active AI room에서 59,999 ms에는 unresolved, 60,000 ms에 `{drained:false, activeRooms:1}`이 되는 fake-timer boundary를 확인합니다.
- SIGTERM→SIGINT→SIGTERM을 연속 emit해 shutdown callback이 한 번, 첫 signal 값으로만 호출되는지 확인합니다.
- drain 직후 `/health/ready`가 503과 `checks.lifecycle='draining'`을 반환하는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:9d05f47e7f4b:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | drain과 signal code는 여러 interacting state를 다뤘지만 timeout boundary, new admission rejection, repeated signal behavior가 통합 증거로 고정되지 않았습니다. |
| 해결하려던 문제와 위험 | 종료 code는 happy path만 보면 맞아 보이지만 active room이 남거나 signal이 반복될 때 deadlock·duplicate close·new work admission이 발생할 수 있습니다. |
| 핵심 구현 결정 | GameHub에는 fake sockets/repository와 fake timers를, graceful shutdown에는 injected `EventEmitter`와 controlled Promise를 사용합니다. health route는 Fastify inject로 drain 직후 응답을 확인합니다. |
| 입력 → 상태 전이 → 출력 | queue/room setup → beginDrain → immediate state assertions → fake deadline advance → result assertion; 별도 signal test에서 repeated emit → one shutdown → controlled resolve/reject → onError/dispose 확인입니다. |
| ownership/lifetime/cleanup | 테스트가 time, signal emission, socket lifetime, repository close를 명시적으로 소유합니다. production GameHub/app/installer cleanup 호출이 afterEach에 남는 자원 없이 종료되는지 확인합니다. |
| failure/rollback/retry | active room non-progress, repeated signals, shutdown rejection을 각각 결정적으로 재현합니다. raw process signal이나 external SIGKILL은 사용하지 않습니다. |
| 보장하는 것 | drain이 admission을 즉시 닫고 60초 상한을 지키며 readiness를 내리고, signals가 single-entry shutdown으로 수렴함을 증명합니다. |
| 보장하지 않는 것 | 실제 container stop grace, OS signal delivery, PostgreSQL close latency는 이 tests가 증명하지 않습니다. |
| 후속 연결 | `44ef3e07e1a5`/`1c9981393973`의 lifecycle invariant를 보호하며 `73ba979841cd`가 external Compose budget을 정적 계약으로 추가합니다. |
<!-- LEARNER-END:9d05f47e7f4b:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:9d05f47e7f4b:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | deterministic lifecycle integration/regression test |
| 주입·재현 방식 | fake timers, fake sockets, memory repository, injected `EventEmitter`, Fastify inject를 조합합니다. |
| 증명하는 것 | queue clearing/new rejection, no-room success, 60초 timeout, readiness 503, repeated-signal once, error reporting을 증명합니다. |
| 증명하지 않는 것 | 실제 Docker daemon의 kill timing이나 process-level signal integration은 증명하지 않습니다. |
<!-- LEARNER-END:9d05f47e7f4b:test -->



#### 비교 기준

- 직전 관련 SHA: `1c9981393973` — `feat(ops): graceful shutdown 절차 추가`
- 다음 관련 SHA: `312ddbc6fbe2` — `fix(runtime): container 종료 유예를 room drain과 정렬`

### 5.4. `fix(runtime): container 종료 유예를 room drain과 정렬`

| 항목 | 값 |
| --- | --- |
| SHA | `312ddbc6fbe2` |
| Importance | A |
| Tags | REALTIME, OPERATIONS, RISK |
| Source에서 확정된 역할 | API container의 `stop_grace_period`를 70초로 설정해 application의 60초 room drain budget보다 길게 만듭니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `docker-compose.yml`
- 핵심 symbol: production Compose `services.api.stop_grace_period`
- application `beginDrain(60_000)`과 Compose API service의 이전 default/누락된 stop grace를 비교합니다.
- `stop_grace_period: 70s`가 API service에만 적용되고 migration/web/db lifecycle과 혼동되지 않는지 확인합니다.
- orchestrator가 SIGTERM 뒤 강제 SIGKILL하기 전 application drain+close에 남기는 10초 margin의 의미를 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:312ddbc6fbe2:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | application은 최대 60초 동안 active rooms를 기다렸지만 Compose에는 그보다 긴 명시적 stop grace가 없어 runtime이 drain 완료 전 강제 종료될 수 있었습니다. |
| 해결하려던 문제와 위험 | 코드 내부 timeout만 길게 설정해도 external orchestrator kill budget이 짧으면 보장이 무효입니다. 이는 application과 deployment configuration 사이의 cross-layer invariant였습니다. |
| 핵심 구현 결정 | production Compose의 API service에 `stop_grace_period: 70s`를 추가해 60초 drain budget보다 10초 긴 termination grace를 제공합니다. |
| 입력 → 상태 전이 → 출력 | Compose stop → API에 SIGTERM → application 최대 60초 drain → Fastify/GameHub/repository close → 70초 grace 만료 전 정상 exit; 그때까지 종료하지 못하면 orchestrator 강제 종료입니다. |
| ownership/lifetime/cleanup | application은 60초 drain과 cleanup을, Compose runtime은 70초 kill deadline을 소유합니다. 10초 차이는 close/logging overhead를 위한 외부 여유입니다. |
| failure/rollback/retry | 이전 mismatch는 active room 결과나 repository cleanup이 SIGKILL로 중단될 위험이었습니다. 설정 수정은 kill deadline을 application budget보다 뒤로 이동시킵니다. |
| 보장하는 것 | 지정 Compose 환경에서 API가 application drain budget 전체를 사용할 최소 termination window가 생깁니다. |
| 보장하지 않는 것 | 호스트 강제 종료, Kubernetes 등 다른 orchestrator, 70초를 넘는 repository close는 보장하지 않습니다. |
| 후속 연결 | `73ba979841cd`가 Compose duration을 파싱해 최소 60초 계약을 회귀 테스트로 고정합니다. |
<!-- LEARNER-END:312ddbc6fbe2:record -->


#### Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:312ddbc6fbe2:fix -->
이전 가정: application 60초 timeout이면 충분 → 실제 risk: container grace가 더 짧으면 SIGKILL → 수정: Compose 70초 → static contract `73ba979841cd`.
<!-- LEARNER-END:312ddbc6fbe2:fix -->

#### 최소 코드 근거

<!-- LEARNER-BEGIN:312ddbc6fbe2:snippet -->
- SHA: `312ddbc6fbe2`
- 위치: `docker-compose.yml`; production Compose `services.api.stop_grace_period`

```yaml
stop_grace_period: 70s
```
<!-- LEARNER-END:312ddbc6fbe2:snippet -->

#### 비교 기준

- 직전 관련 SHA: `9d05f47e7f4b` — `test(ops): GameHub drain과 graceful shutdown 검증`
- 다음 관련 SHA: `73ba979841cd` — `test(docker): API 종료 유예 계약 검증`

### 5.5. `test(docker): API 종료 유예 계약 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `73ba979841cd` |
| Importance | B |
| Tags | OPERATIONS, TEST |
| Source에서 확정된 역할 | production Compose duration을 파싱해 API stop grace가 application 60초 drain budget 이상인지 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `tests/docker-production.test.mjs`
- 핵심 symbol: `parseDurationSeconds`, `services.api.stop_grace_period` assertion
- Compose를 파싱한 기존 production contract test에 `stop_grace_period` assertion이 추가되는 위치를 확인합니다.
- `parseDurationSeconds`가 `XmYs` 형식을 분·초로 변환하고 unsupported value를 fail-closed로 거부하는지 확인합니다.
- assertion이 특정 70초 문자열이 아니라 최소 60초 관계를 고정하는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:73ba979841cd:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태와 문제 | Compose에 70초가 설정됐지만 후속 변경이 이를 제거하거나 60초 미만으로 낮춰도 application tests는 감지하지 못했습니다. application timeout과 deployment grace의 관계는 서로 다른 파일에 있어 한쪽만 변경될 때 쉽게 깨집니다. |
| 구현 또는 검증 결정 | production Docker contract test가 parsed Compose API service의 duration을 초로 변환하고 `>= 60`을 요구합니다. |
| 실행/검증 경로 | Compose file read/parse → API service 조회 → duration string validate/seconds convert → application drain minimum과 비교 → failure면 contract test 종료입니다. |
| ownership과 failure 처리 | 정적 contract test가 cross-file duration 관계를 소유하며 실제 container를 시작하지 않습니다. 누락·비문자열·지원하지 않는 duration 또는 60초 미만 값을 assertion failure로 만듭니다. |
| 보장하는 것 | repository configuration에서 API stop grace가 application drain budget 아래로 회귀하지 않습니다. |
| 보장하지 않는 것 | Docker daemon이 duration을 실제로 적용하는지, process가 60초 안에 종료되는지는 실행하지 않습니다. |
| 후속 연결 | `312ddbc6fbe2`의 cross-layer fix를 보호하는 최종 regression입니다. |
<!-- LEARNER-END:73ba979841cd:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:73ba979841cd:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | static deployment contract test |
| 주입·재현 방식 | Compose YAML을 파싱하고 duration string을 초로 환산해 `>=60`을 검사합니다. |
| 증명하는 것 | checked-in production Compose와 application drain budget의 최소 관계를 증명합니다. |
| 증명하지 않는 것 | 실제 container stop·SIGTERM·SIGKILL timing은 증명하지 않습니다. |
<!-- LEARNER-END:73ba979841cd:test -->



#### 비교 기준

- 직전 관련 SHA: `312ddbc6fbe2` — `fix(runtime): container 종료 유예를 room drain과 정렬`
- 이 Thread의 마지막 selected SHA입니다.

## 6. 불변식의 변화

<!-- LEARNER-BEGIN:05-draining-readiness-and-graceful-shutdown.md:evolution -->
`44ef3e07e1a5`는 readiness와 GameHub admission을 공유하는 drain state를 만들고 active rooms만 bounded wait 대상으로 남깁니다. `1c9981393973`은 SIGTERM/SIGINT를 single-entry 60초 drain→close sequence로 연결하며, `9d05f47e7f4b`가 queue·timeout·readiness·signal edge를 고정합니다. `312ddbc6fbe2`는 application 바깥의 Compose kill budget을 70초로 정렬하고 `73ba979841cd`가 그 관계를 정적 계약으로 보호합니다.
<!-- LEARNER-END:05-draining-readiness-and-graceful-shutdown.md:evolution -->

## 7. Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:05-draining-readiness-and-graceful-shutdown.md:failure-links -->
- drain 중 new admission → accepting flag/queue cleanup/server_draining → fake-socket regression
- active room non-progress → 60초 timeout result → 59,999/60,000 ms boundary test
- repeated signals/close rejection → single-entry guard·exitCode/onError → injected signal tests
- external grace < app timeout → Compose 70초 fix → duration contract test
<!-- LEARNER-END:05-draining-readiness-and-graceful-shutdown.md:failure-links -->

## 8. Ownership·state·cleanup 변화

<!-- LEARNER-BEGIN:05-draining-readiness-and-graceful-shutdown.md:ownership -->
app은 readiness lifecycle을, GameHub는 matchmaking admission·active room drain timer/Promise를, signal installer는 listeners와 one-shot guard를, Fastify close hooks는 GameHub/repository cleanup을 소유합니다. Compose runtime은 application 밖에서 70초 강제 종료 deadline을 소유합니다.
<!-- LEARNER-END:05-draining-readiness-and-graceful-shutdown.md:ownership -->

## 9. Thread 최종 상태

<!-- LEARNER-BEGIN:05-draining-readiness-and-graceful-shutdown.md:final-state -->
SIGTERM/SIGINT가 오면 readiness와 admission이 즉시 닫히고 waiting work가 제거됩니다. active rooms는 최대 60초 완료 기회를 가지며 이후 app close가 모든 runtime/storage resources를 정리합니다. 중복 signals는 무시되고 Compose는 70초를 제공하며 static test가 최소 관계를 보호합니다.
<!-- LEARNER-END:05-draining-readiness-and-graceful-shutdown.md:final-state -->

## 10. 최종 실행 흐름

<!-- LEARNER-BEGIN:05-draining-readiness-and-graceful-shutdown.md:final-flow -->
signal → `installGracefulShutdown` one-shot → `app.beginDrain(60_000)` → readiness 503 + GameHub new work reject/queue clear → active room count가 0 또는 timeout → `app.close()` → GameHub scheduler/timers/sockets와 repository close → nonzero exitCode on failure. Compose는 최대 70초 뒤 강제 종료합니다.
<!-- LEARNER-END:05-draining-readiness-and-graceful-shutdown.md:final-flow -->

## 11. 실행 및 검증 근거

<!-- LEARNER-BEGIN:05-draining-readiness-and-graceful-shutdown.md:execution -->
- 저장소 runtime/test command는 실행하지 않았습니다.
- 실행을 시도한 명령: `git ls-remote --heads https://github.com/seungwoo7050/42-archive.git refs/heads/web/ft_transcendence`
- 실제 결과: exit status 128, `Could not resolve host: github.com`.
- 따라서 test pass, benchmark 수치, k6/Toxiproxy recovery 결과는 주장하지 않습니다. 각 기록은 GitHub 연결로 exact selected commit의 diff와 당시 파일을 확인한 정적 historical inspection 결과입니다.
<!-- LEARNER-END:05-draining-readiness-and-graceful-shutdown.md:execution -->

## 12. 학습 완료 확인

<!-- LEARNER-BEGIN:05-draining-readiness-and-graceful-shutdown.md:checks -->
- [x] drain에서 waiting work와 active room의 처리 차이를 설명할 수 있습니다.
- [x] readiness 503가 drain 결과를 기다리지 않고 즉시 발생하는 이유를 설명할 수 있습니다.
- [x] repeated signals가 duplicate cleanup을 만들지 않는 구조를 추적할 수 있습니다.
- [x] 60초 application budget과 70초 container grace의 cross-layer invariant를 설명할 수 있습니다.
<!-- LEARNER-END:05-draining-readiness-and-graceful-shutdown.md:checks -->
