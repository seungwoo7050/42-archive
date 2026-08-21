# Startup·liveness·readiness·storage state

- 카테고리: `07-runtime-observability-and-service-health` — 런타임 관측성과 서비스 상태
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`
- Phase 1 상태: frozen authoritative scaffold

## 1. Thread 목표

service bootstrap과 환경 기본값에서 시작해 migration set 및 repository health를 readiness로 노출하고 startup data mutation과 production memory fallback을 제거하는 과정을 복원합니다.

### 직접 연결되는 불변식

- liveness는 process 상태를, readiness는 storage/migration/lifecycle 상태를 반영합니다.
- migration divergence와 database failure는 readiness를 fail-closed 상태로 만듭니다.
- application startup은 암묵적으로 schema/seed data를 변경하지 않습니다.
- production은 durable storage 없이 시작하지 않습니다.

## 2. 핵심 질문

- process가 살아 있는 것과 traffic을 받을 준비가 된 것은 어떤 endpoint/조건으로 분리됩니까?
- repository readiness가 connection failure, pending migration, diverged migration을 어떻게 표현합니까?
- startup이 seed/migration을 암묵 실행하지 않을 때 운영자가 사전에 수행해야 하는 명시적 단계는 무엇입니까?
- production persistent-store requirement와 demo memory mode가 어떤 configuration branch로 분리됩니까?

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
| 1 | `4b43a284e637` | `feat(api): 실행 환경과 service bootstrap 구성` | B | PERSISTENCE, OPERATIONS | runtime env, repository, Fastify app, close lifecycle을 composition root에서 조립합니다. |
| 2 | `85ac2a949439` | `test(api): 실행 환경 기본값 검증` | B | PROTOCOL, PERSISTENCE, TEST | configuration precedence와 local startup default를 고정합니다. |
| 3 | `30aac132e14e` | `feat(db): migration set 상태 검사 추가` | A | PERSISTENCE, OPERATIONS, RISK | bundle/applied migration set을 current, pending, diverged로 분류합니다. |
| 4 | `2f05d5d79c64` | `feat(db): repository readiness 경계 추가` | A | PERSISTENCE, OPERATIONS | database availability와 migration status를 repository contract로 노출합니다. |
| 5 | `15002e229acb` | `feat(ops): liveness와 readiness endpoint 추가` | A | PROTOCOL, PERSISTENCE, OPERATIONS | process liveness와 dependency-aware service readiness를 versioned response로 분리합니다. |
| 6 | `6937cf60aeea` | `test(ops): health와 database readiness 검증` | B | AUTH, PERSISTENCE, OPERATIONS | DB down/migration state와 무관하게 liveness가 유지되고 readiness만 실패하는지 검증합니다. |
| 7 | `e1a0316fbe84` | `fix(api): startup seed 생성을 제거` | B | PERSISTENCE | API startup에서 implicit seed mutation을 제거합니다. |
| 8 | `5cac4843fd9b` | `test(api): startup seed 금지 검증` | B | REALTIME, TEST | entrypoint가 seed operation을 호출하지 않는지 검증합니다. |
| 9 | `eb675ef74af3` | `fix(config): production에서 영속 저장소 요구` | A | TOURNAMENT, OPERATIONS, RISK | production에서 database URL이 없으면 environment parsing 단계에서 실패합니다. |
| 10 | `4633dfde208d` | `test(config): production memory fallback 거부 검증` | A | OPERATIONS, TEST | explicit/inferred production 모두 memory fallback을 거부하는지 검증합니다. |

## 5. Commit별 학습 기록

### 5.1. `feat(api): 실행 환경과 service bootstrap 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `4b43a284e637` |
| Importance | B |
| Tags | PERSISTENCE, OPERATIONS |
| Source에서 확정된 역할 | runtime env, repository, Fastify app, close lifecycle을 composition root에서 조립합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/env.ts`, `apps/api/src/index.ts`, `apps/api/src/app.ts`
- 핵심 symbol: `readEnv`, `buildApp`, API entrypoint의 repository 선택과 `onClose` hook
- `readEnv`가 누락된 환경값을 어떤 로컬 기본값으로 바꾸고 숫자·URL·mode를 어디서 검증하는지 확인합니다.
- `index.ts`가 `DATABASE_URL` 유무로 PostgreSQL/memory repository를 선택하고 `buildApp`에 넘기는 순서를 추적합니다.
- 당시에는 startup에서 `ensureSeedData`를 호출한다는 사실과, `app.close()`가 repository `close()`로 이어지는 소유권을 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:4b43a284e637:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태와 문제 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 구현 또는 검증 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 실행/검증 경로 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership과 failure 처리 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:4b43a284e637:record -->




#### 비교 기준

- 이 commit의 parent 상태와 비교합니다.
- 다음 관련 SHA: `85ac2a949439` — `test(api): 실행 환경 기본값 검증`

### 5.2. `test(api): 실행 환경 기본값 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `85ac2a949439` |
| Importance | B |
| Tags | PROTOCOL, PERSISTENCE, TEST |
| Source에서 확정된 역할 | configuration precedence와 local startup default를 고정합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/env.test.ts`
- 핵심 symbol: `readEnv`의 기본값·환경값 우선순위·유효성 검사
- 빈 환경 객체와 명시적 환경 객체를 각각 `readEnv`에 넣어 어떤 필드가 기본값/override가 되는지 확인합니다.
- port 같은 숫자 값과 mode/url 값의 negative case가 실제 parser에서 거부되는지 테스트 표와 연결합니다.
- 이 테스트는 process를 시작하지 않고 순수 설정 해석만 검증한다는 한계를 구분합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:85ac2a949439:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태와 문제 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 구현 또는 검증 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 실행/검증 경로 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership과 failure 처리 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:85ac2a949439:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:85ac2a949439:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | [unit/integration/process/load/benchmark/failure injection 중 실제 기법 작성] |
| 주입·재현 방식 | [입력·시각·오류·동시성·transport 상태 작성] |
| 증명하는 것 | [실제 production path와 assertion 작성] |
| 증명하지 않는 것 | [실행 범위 밖의 보장 작성] |
<!-- LEARNER-END:85ac2a949439:test -->



#### 비교 기준

- 직전 관련 SHA: `4b43a284e637` — `feat(api): 실행 환경과 service bootstrap 구성`
- 다음 관련 SHA: `30aac132e14e` — `feat(db): migration set 상태 검사 추가`

### 5.3. `feat(db): migration set 상태 검사 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `30aac132e14e` |
| Importance | A |
| Tags | PERSISTENCE, OPERATIONS, RISK |
| Source에서 확정된 역할 | bundle/applied migration set을 current, pending, diverged로 분류합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `packages/db/src/migrator.ts`
- 핵심 symbol: `findMigrationFiles`, `compareMigrationSets`, `inspectMigrationSet`
- bundle 디렉터리의 SQL 파일명과 `kysely_migration.name` 조회 결과를 어떤 정규화 규칙으로 비교하는지 확인합니다.
- `current`, `pending`, `diverged`를 결정하는 missing/unexpected 집합 계산을 실제 조건문으로 기록합니다.
- PostgreSQL 오류 코드 `42P01`만 migration table 부재로 해석하고 다른 query 오류는 다시 던지는 fail-closed 분기를 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:30aac132e14e:record -->
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
<!-- LEARNER-END:30aac132e14e:record -->



#### 최소 코드 근거

<!-- LEARNER-BEGIN:30aac132e14e:snippet -->
설계·상태 전이·실패 처리를 이해하는 데 필요한 최소 코드만 해당 SHA에서 인용하고, 파일과 symbol을 함께 기록합니다.
<!-- LEARNER-END:30aac132e14e:snippet -->

#### 비교 기준

- 직전 관련 SHA: `85ac2a949439` — `test(api): 실행 환경 기본값 검증`
- 다음 관련 SHA: `2f05d5d79c64` — `feat(db): repository readiness 경계 추가`

### 5.4. `feat(db): repository readiness 경계 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `2f05d5d79c64` |
| Importance | A |
| Tags | PERSISTENCE, OPERATIONS |
| Source에서 확정된 역할 | database availability와 migration status를 repository contract로 노출합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `packages/db/src/index.ts`
- 핵심 symbol: `AppRepository.checkReadiness`, `PostgresRepository.checkReadiness`, memory repository implementation
- `AppRepository`의 readiness 반환형과 PostgreSQL/memory 구현이 같은 계약을 어떻게 다르게 채우는지 확인합니다.
- PostgreSQL 구현에서 `select 1`과 `inspectMigrationSet` 호출 순서, 오류 전파, migration status 매핑을 추적합니다.
- memory 구현의 `migrations: not_applicable`가 `current`를 가장하지 않는 이유를 기록합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:2f05d5d79c64:record -->
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
<!-- LEARNER-END:2f05d5d79c64:record -->




#### 비교 기준

- 직전 관련 SHA: `30aac132e14e` — `feat(db): migration set 상태 검사 추가`
- 다음 관련 SHA: `15002e229acb` — `feat(ops): liveness와 readiness endpoint 추가`

### 5.5. `feat(ops): liveness와 readiness endpoint 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `15002e229acb` |
| Importance | A |
| Tags | PROTOCOL, PERSISTENCE, OPERATIONS |
| Source에서 확정된 역할 | process liveness와 dependency-aware service readiness를 versioned response로 분리합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `packages/shared/src/http.ts`, `apps/api/src/app.ts`
- 핵심 symbol: liveness/readiness response schema, `/health/live`, `/health/ready`, `repo.checkReadiness`
- shared response schema가 `status`, `service`, `checks.lifecycle/database/migrations`를 어떤 bounded enum으로 제한하는지 확인합니다.
- `/health/live`가 dependency query 없이 200을 반환하고 `/health/ready`만 repository를 호출하는 분리를 추적합니다.
- readiness 성공 조건과 catch branch의 503/down/unknown 응답, 원본 database 오류를 body에 넣지 않는 처리를 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:15002e229acb:record -->
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
<!-- LEARNER-END:15002e229acb:record -->



#### 최소 코드 근거

<!-- LEARNER-BEGIN:15002e229acb:snippet -->
설계·상태 전이·실패 처리를 이해하는 데 필요한 최소 코드만 해당 SHA에서 인용하고, 파일과 symbol을 함께 기록합니다.
<!-- LEARNER-END:15002e229acb:snippet -->

#### 비교 기준

- 직전 관련 SHA: `2f05d5d79c64` — `feat(db): repository readiness 경계 추가`
- 다음 관련 SHA: `6937cf60aeea` — `test(ops): health와 database readiness 검증`

### 5.6. `test(ops): health와 database readiness 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `6937cf60aeea` |
| Importance | B |
| Tags | AUTH, PERSISTENCE, OPERATIONS |
| Source에서 확정된 역할 | DB down/migration state와 무관하게 liveness가 유지되고 readiness만 실패하는지 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/health.test.ts`, `packages/db/src/postgres.integration.test.ts`, `packages/db/src/readiness.test.ts`
- 핵심 symbol: Fastify `inject`, memory readiness stub, isolated PostgreSQL database, `compareMigrationSets`
- legacy `/health`, `/health/live`, `/health/ready` 응답을 한 app instance에서 비교하는 route test를 확인합니다.
- `checkReadiness` rejection에 credential이 든 오류를 주입하고 503 body에 secret/URL이 없는지 확인합니다.
- migration 미적용 isolated database가 `pending`, migrate 후 `current`가 되는 실제 PostgreSQL integration path를 추적합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:6937cf60aeea:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태와 문제 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 구현 또는 검증 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 실행/검증 경로 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership과 failure 처리 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:6937cf60aeea:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:6937cf60aeea:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | [unit/integration/process/load/benchmark/failure injection 중 실제 기법 작성] |
| 주입·재현 방식 | [입력·시각·오류·동시성·transport 상태 작성] |
| 증명하는 것 | [실제 production path와 assertion 작성] |
| 증명하지 않는 것 | [실행 범위 밖의 보장 작성] |
<!-- LEARNER-END:6937cf60aeea:test -->



#### 비교 기준

- 직전 관련 SHA: `15002e229acb` — `feat(ops): liveness와 readiness endpoint 추가`
- 다음 관련 SHA: `e1a0316fbe84` — `fix(api): startup seed 생성을 제거`

### 5.7. `fix(api): startup seed 생성을 제거`

| 항목 | 값 |
| --- | --- |
| SHA | `e1a0316fbe84` |
| Importance | B |
| Tags | PERSISTENCE |
| Source에서 확정된 역할 | API startup에서 implicit seed mutation을 제거합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/index.ts`
- 핵심 symbol: entrypoint의 `ensureSeedData` 호출 제거
- parent의 repository 생성 뒤 `ensureSeedData` 호출과 이 SHA의 제거 diff를 직접 비교합니다.
- migration/seed CLI가 남아 있는지와 API startup이 이제 read/configure/listen만 수행하는지 구분합니다.
- memory와 PostgreSQL 모두에서 같은 implicit mutation이 사라지는 범위를 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:e1a0316fbe84:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태와 문제 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 구현 또는 검증 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 실행/검증 경로 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership과 failure 처리 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:e1a0316fbe84:record -->


#### Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:e1a0316fbe84:fix -->
이전 가정 → 실제 failure/risk → root cause → 수정된 invariant/결정 → 변경된 코드 → regression evidence를 해당 SHA와 관련 이전/후속 SHA로 연결해 작성합니다.
<!-- LEARNER-END:e1a0316fbe84:fix -->


#### 비교 기준

- 직전 관련 SHA: `6937cf60aeea` — `test(ops): health와 database readiness 검증`
- 다음 관련 SHA: `5cac4843fd9b` — `test(api): startup seed 금지 검증`

### 5.8. `test(api): startup seed 금지 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `5cac4843fd9b` |
| Importance | B |
| Tags | REALTIME, TEST |
| Source에서 확정된 역할 | entrypoint가 seed operation을 호출하지 않는지 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/startup.test.ts` (같은 commit의 `tests/smoke-ws.mjs` AI fixture 정렬은 이 Thread의 부수 변경)
- 핵심 symbol: `index.ts` source read, `/\.ensureSeedData\s*\(/` negative assertion
- `startup.test.ts`가 build artifact가 아니라 exact source인 `index.ts`를 읽는 방식을 확인합니다.
- 정규식이 method-call 형태의 `ensureSeedData` 재도입만 막는다는 범위와 우회 가능성을 기록합니다.
- 같은 commit의 WebSocket smoke fixture 변경은 startup seed invariant와 분리해 다룹니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:5cac4843fd9b:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태와 문제 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 구현 또는 검증 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 실행/검증 경로 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership과 failure 처리 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:5cac4843fd9b:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:5cac4843fd9b:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | [unit/integration/process/load/benchmark/failure injection 중 실제 기법 작성] |
| 주입·재현 방식 | [입력·시각·오류·동시성·transport 상태 작성] |
| 증명하는 것 | [실제 production path와 assertion 작성] |
| 증명하지 않는 것 | [실행 범위 밖의 보장 작성] |
<!-- LEARNER-END:5cac4843fd9b:test -->



#### 비교 기준

- 직전 관련 SHA: `e1a0316fbe84` — `fix(api): startup seed 생성을 제거`
- 다음 관련 SHA: `eb675ef74af3` — `fix(config): production에서 영속 저장소 요구`

### 5.9. `fix(config): production에서 영속 저장소 요구`

| 항목 | 값 |
| --- | --- |
| SHA | `eb675ef74af3` |
| Importance | A |
| Tags | TOURNAMENT, OPERATIONS, RISK |
| Source에서 확정된 역할 | production에서 database URL이 없으면 environment parsing 단계에서 실패합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/env.ts`
- 핵심 symbol: `readEnv`의 production mode 판정과 `DATABASE_URL` 요구 조건
- 명시적 `APP_MODE=production`과 `NODE_ENV=production`에서 mode가 어떻게 결정되는지 확인합니다.
- `DATABASE_URL` 부재를 memory repository 선택까지 미루지 않고 parser에서 거부하는 exact 조건을 기록합니다.
- demo/local/test mode의 memory fallback이 계속 허용되는 범위를 구분합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:eb675ef74af3:record -->
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
<!-- LEARNER-END:eb675ef74af3:record -->


#### Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:eb675ef74af3:fix -->
이전 가정 → 실제 failure/risk → root cause → 수정된 invariant/결정 → 변경된 코드 → regression evidence를 해당 SHA와 관련 이전/후속 SHA로 연결해 작성합니다.
<!-- LEARNER-END:eb675ef74af3:fix -->


#### 비교 기준

- 직전 관련 SHA: `5cac4843fd9b` — `test(api): startup seed 금지 검증`
- 다음 관련 SHA: `4633dfde208d` — `test(config): production memory fallback 거부 검증`

### 5.10. `test(config): production memory fallback 거부 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `4633dfde208d` |
| Importance | A |
| Tags | OPERATIONS, TEST |
| Source에서 확정된 역할 | explicit/inferred production 모두 memory fallback을 거부하는지 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/env.test.ts`
- 핵심 symbol: `readEnv` production cases, demo/local memory allowance
- `APP_MODE=production`과 `NODE_ENV=production` 각각에서 `DATABASE_URL` 누락이 같은 오류로 끝나는지 확인합니다.
- production에 URL을 제공한 positive case와 demo mode의 memory 허용 case를 대조합니다.
- 테스트가 repository 생성 전 parser 단계만 검증한다는 범위를 명시합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:4633dfde208d:record -->
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
<!-- LEARNER-END:4633dfde208d:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:4633dfde208d:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | [unit/integration/process/load/benchmark/failure injection 중 실제 기법 작성] |
| 주입·재현 방식 | [입력·시각·오류·동시성·transport 상태 작성] |
| 증명하는 것 | [실제 production path와 assertion 작성] |
| 증명하지 않는 것 | [실행 범위 밖의 보장 작성] |
<!-- LEARNER-END:4633dfde208d:test -->



#### 비교 기준

- 직전 관련 SHA: `eb675ef74af3` — `fix(config): production에서 영속 저장소 요구`
- 이 Thread의 마지막 selected SHA입니다.

## 6. 불변식의 변화

<!-- LEARNER-BEGIN:01-startup-liveness-readiness-and-storage-state.md:evolution -->
[각 불변식이 도입·확장·부족 판정·수정·회귀 보호된 SHA를 순서대로 작성합니다.]
<!-- LEARNER-END:01-startup-liveness-readiness-and-storage-state.md:evolution -->

## 7. Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:01-startup-liveness-readiness-and-storage-state.md:failure-links -->
[실패 또는 위험 → 원인 → 수정 SHA → 검증 SHA 관계를 작성합니다.]
<!-- LEARNER-END:01-startup-liveness-readiness-and-storage-state.md:failure-links -->

## 8. Ownership·state·cleanup 변화

<!-- LEARNER-BEGIN:01-startup-liveness-readiness-and-storage-state.md:ownership -->
[초기 owner와 최종 owner, 생성·이전·해제 시점을 실제 symbol로 작성합니다.]
<!-- LEARNER-END:01-startup-liveness-readiness-and-storage-state.md:ownership -->

## 9. Thread 최종 상태

<!-- LEARNER-BEGIN:01-startup-liveness-readiness-and-storage-state.md:final-state -->
[마지막 selected SHA에서 보장되는 상태와 남은 non-guarantee를 작성합니다.]
<!-- LEARNER-END:01-startup-liveness-readiness-and-storage-state.md:final-state -->

## 10. 최종 실행 흐름

<!-- LEARNER-BEGIN:01-startup-liveness-readiness-and-storage-state.md:final-flow -->
[입력 또는 lifecycle event부터 상태 전이·side effect·cleanup까지 최종 caller/callee 흐름을 작성합니다.]
<!-- LEARNER-END:01-startup-liveness-readiness-and-storage-state.md:final-flow -->

## 11. 실행 및 검증 근거

<!-- LEARNER-BEGIN:01-startup-liveness-readiness-and-storage-state.md:execution -->
- 실제로 실행한 command가 있으면 SHA, command, result를 기록합니다.
- 실행하지 못했다면 code inspection과 runtime execution을 구분하고 원인을 기록합니다.
<!-- LEARNER-END:01-startup-liveness-readiness-and-storage-state.md:execution -->

## 12. 학습 완료 확인

<!-- LEARNER-BEGIN:01-startup-liveness-readiness-and-storage-state.md:checks -->
- [ ] migration `current/pending/diverged/not_applicable`의 의미와 계산 근거를 설명할 수 있습니다.
- [ ] liveness와 readiness의 호출 경로·실패 branch를 exact SHA 기준으로 구분할 수 있습니다.
- [ ] startup seed 제거와 production memory fallback 거부의 fix→test 관계를 설명할 수 있습니다.
<!-- LEARNER-END:01-startup-liveness-readiness-and-storage-state.md:checks -->
