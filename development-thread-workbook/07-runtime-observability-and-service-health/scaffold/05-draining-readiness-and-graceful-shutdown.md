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
| 직전 관련 상태 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 해결하려던 문제와 위험 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 핵심 구현 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 입력 → 상태 전이 → 출력 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership/lifetime/cleanup | [해당 SHA의 파일·심볼·조건으로 작성] |
| failure/rollback/retry | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
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
| 직전 관련 상태 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 해결하려던 문제와 위험 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 핵심 구현 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 입력 → 상태 전이 → 출력 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership/lifetime/cleanup | [해당 SHA의 파일·심볼·조건으로 작성] |
| failure/rollback/retry | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
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
| 직전 관련 상태 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 해결하려던 문제와 위험 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 핵심 구현 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 입력 → 상태 전이 → 출력 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership/lifetime/cleanup | [해당 SHA의 파일·심볼·조건으로 작성] |
| failure/rollback/retry | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:9d05f47e7f4b:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:9d05f47e7f4b:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | [unit/integration/process/load/benchmark/failure injection 중 실제 기법 작성] |
| 주입·재현 방식 | [입력·시각·오류·동시성·transport 상태 작성] |
| 증명하는 것 | [실제 production path와 assertion 작성] |
| 증명하지 않는 것 | [실행 범위 밖의 보장 작성] |
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
| 직전 관련 상태 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 해결하려던 문제와 위험 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 핵심 구현 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 입력 → 상태 전이 → 출력 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership/lifetime/cleanup | [해당 SHA의 파일·심볼·조건으로 작성] |
| failure/rollback/retry | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:312ddbc6fbe2:record -->


#### Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:312ddbc6fbe2:fix -->
이전 가정 → 실제 failure/risk → root cause → 수정된 invariant/결정 → 변경된 코드 → regression evidence를 해당 SHA와 관련 이전/후속 SHA로 연결해 작성합니다.
<!-- LEARNER-END:312ddbc6fbe2:fix -->

#### 최소 코드 근거

<!-- LEARNER-BEGIN:312ddbc6fbe2:snippet -->
설계·상태 전이·실패 처리를 이해하는 데 필요한 최소 코드만 해당 SHA에서 인용하고, 파일과 symbol을 함께 기록합니다.
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
| 직전 관련 상태와 문제 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 구현 또는 검증 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 실행/검증 경로 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership과 failure 처리 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:73ba979841cd:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:73ba979841cd:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | [unit/integration/process/load/benchmark/failure injection 중 실제 기법 작성] |
| 주입·재현 방식 | [입력·시각·오류·동시성·transport 상태 작성] |
| 증명하는 것 | [실제 production path와 assertion 작성] |
| 증명하지 않는 것 | [실행 범위 밖의 보장 작성] |
<!-- LEARNER-END:73ba979841cd:test -->



#### 비교 기준

- 직전 관련 SHA: `312ddbc6fbe2` — `fix(runtime): container 종료 유예를 room drain과 정렬`
- 이 Thread의 마지막 selected SHA입니다.

## 6. 불변식의 변화

<!-- LEARNER-BEGIN:05-draining-readiness-and-graceful-shutdown.md:evolution -->
[각 불변식이 도입·확장·부족 판정·수정·회귀 보호된 SHA를 순서대로 작성합니다.]
<!-- LEARNER-END:05-draining-readiness-and-graceful-shutdown.md:evolution -->

## 7. Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:05-draining-readiness-and-graceful-shutdown.md:failure-links -->
[실패 또는 위험 → 원인 → 수정 SHA → 검증 SHA 관계를 작성합니다.]
<!-- LEARNER-END:05-draining-readiness-and-graceful-shutdown.md:failure-links -->

## 8. Ownership·state·cleanup 변화

<!-- LEARNER-BEGIN:05-draining-readiness-and-graceful-shutdown.md:ownership -->
[초기 owner와 최종 owner, 생성·이전·해제 시점을 실제 symbol로 작성합니다.]
<!-- LEARNER-END:05-draining-readiness-and-graceful-shutdown.md:ownership -->

## 9. Thread 최종 상태

<!-- LEARNER-BEGIN:05-draining-readiness-and-graceful-shutdown.md:final-state -->
[마지막 selected SHA에서 보장되는 상태와 남은 non-guarantee를 작성합니다.]
<!-- LEARNER-END:05-draining-readiness-and-graceful-shutdown.md:final-state -->

## 10. 최종 실행 흐름

<!-- LEARNER-BEGIN:05-draining-readiness-and-graceful-shutdown.md:final-flow -->
[입력 또는 lifecycle event부터 상태 전이·side effect·cleanup까지 최종 caller/callee 흐름을 작성합니다.]
<!-- LEARNER-END:05-draining-readiness-and-graceful-shutdown.md:final-flow -->

## 11. 실행 및 검증 근거

<!-- LEARNER-BEGIN:05-draining-readiness-and-graceful-shutdown.md:execution -->
- 실제로 실행한 command가 있으면 SHA, command, result를 기록합니다.
- 실행하지 못했다면 code inspection과 runtime execution을 구분하고 원인을 기록합니다.
<!-- LEARNER-END:05-draining-readiness-and-graceful-shutdown.md:execution -->

## 12. 학습 완료 확인

<!-- LEARNER-BEGIN:05-draining-readiness-and-graceful-shutdown.md:checks -->
- [ ] drain에서 waiting work와 active room의 처리 차이를 설명할 수 있습니다.
- [ ] readiness 503가 drain 결과를 기다리지 않고 즉시 발생하는 이유를 설명할 수 있습니다.
- [ ] repeated signals가 duplicate cleanup을 만들지 않는 구조를 추적할 수 있습니다.
- [ ] 60초 application budget과 70초 container grace의 cross-layer invariant를 설명할 수 있습니다.
<!-- LEARNER-END:05-draining-readiness-and-graceful-shutdown.md:checks -->
