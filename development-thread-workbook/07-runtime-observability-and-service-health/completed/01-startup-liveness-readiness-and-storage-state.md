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
| 직전 관련 상태와 문제 | API 패키지는 있었지만 실행 시 환경값, 저장소 구현, Fastify 인스턴스와 종료 처리를 한 곳에서 조립하는 명시적 entrypoint가 없었습니다. 개발 서버를 실제 process로 띄우려면 환경 해석과 저장소 선택, HTTP 서버 시작, 종료 시 자원 반환 순서를 하나의 composition root가 소유해야 했습니다. |
| 구현 또는 검증 결정 | `readEnv`로 런타임 설정을 구성하고, `DATABASE_URL`이 있으면 PostgreSQL 저장소를, 없으면 memory 저장소를 만든 뒤 `buildApp`에 주입합니다. 이 SHA에서는 저장소 생성 뒤 `ensureSeedData`를 호출하므로 startup이 데이터 변경까지 수행합니다. |
| 실행/검증 경로 | process 시작 → 환경 해석 → repository 생성·seed → Fastify app 생성 → `listen` → 종료 시 `onClose`에서 repository `close` 순서입니다. |
| ownership과 failure 처리 | entrypoint가 repository의 생성과 lifetime을 소유하고 Fastify `onClose` hook에 해제를 연결합니다. app 내부 route는 구현체가 아니라 주입된 `AppRepository`만 사용합니다. 환경 파싱 또는 listen이 실패하면 startup이 끝나지 않습니다. 아직 storage health를 traffic admission과 분리하는 readiness 경계는 없습니다. |
| 보장하는 것 | 로컬에서 실행 가능한 API bootstrap과 한 번의 repository cleanup 경로가 생깁니다. |
| 보장하지 않는 것 | startup seed mutation, production memory fallback, migration 상태 검사는 아직 허용되거나 정의되지 않았습니다. |
| 후속 연결 | `85ac2a949439`가 설정 기본값을 고정하고, `e1a0316fbe84`가 여기의 implicit seed 호출을 나중에 제거합니다. |
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
| 직전 관련 상태와 문제 | bootstrap이 환경값을 읽기 시작했지만 기본값이나 override 규칙이 바뀌어도 이를 탐지할 자동화된 계약이 없었습니다. 로컬 startup과 배포 설정이 같은 parser를 쓰므로, 누락 값과 명시 값의 우선순위가 흔들리면 다른 저장소·origin·port로 실행될 수 있었습니다. |
| 구현 또는 검증 결정 | `readEnv`에 통제된 환경 객체를 주입해 기본값과 명시 값이 예상 필드로 변환되는지 검증합니다. |
| 실행/검증 경로 | test environment 구성 → `readEnv` 호출 → 반환된 configuration의 각 필드 비교입니다. |
| ownership과 failure 처리 | 테스트가 process-global `process.env` 대신 입력 객체를 소유하므로 케이스 간 상태 오염을 피합니다. 잘못된 입력을 거부하는 parser branch는 확인하지만 실제 OS 환경, socket bind, database 연결 실패는 실행하지 않습니다. |
| 보장하는 것 | 설정 기본값과 override 규칙의 회귀를 단위 수준에서 탐지합니다. |
| 보장하지 않는 것 | 설정이 실제 서비스 의존성을 사용할 수 있는지는 증명하지 않습니다. |
| 후속 연결 | 뒤의 `eb675ef74af3`와 `4633dfde208d`가 같은 설정 경계에 production 전용 fail-closed 규칙을 추가합니다. |
<!-- LEARNER-END:85ac2a949439:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:85ac2a949439:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | 결정적 configuration unit test |
| 주입·재현 방식 | 외부 process나 네트워크 없이 명시적 환경 객체를 입력하고 `readEnv` 반환값과 예외 branch를 직접 비교합니다. |
| 증명하는 것 | parser의 기본값·우선순위·입력 검증이 고정됩니다. |
| 증명하지 않는 것 | 실제 환경 변수 주입, port bind, PostgreSQL 연결 성공까지는 증명하지 않습니다. |
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
| 직전 관련 상태 | migration runner는 SQL을 적용할 수 있었지만, 이미 실행 중인 서비스가 bundle과 database의 migration 집합이 일치하는지 읽기 전용으로 판정할 수 없었습니다. |
| 해결하려던 문제와 위험 | 단순 연결 성공만으로는 코드가 기대하는 schema인지 알 수 없습니다. 누락 migration과 database에만 존재하는 예상 밖 migration을 구분하지 않으면 호환되지 않는 schema에도 traffic을 받을 수 있습니다. |
| 핵심 구현 결정 | bundle SQL 이름과 적용된 Kysely migration 이름을 집합으로 비교합니다. 누락만 있으면 `pending`, 예상 밖 이름이 하나라도 있으면 `diverged`, 두 집합이 같으면 `current`로 반환합니다. migration table이 아직 없는 `42P01`은 applied set이 빈 상태로 처리합니다. |
| 입력 → 상태 전이 → 출력 | migration 파일 열거 → `select name from kysely_migration` → missing/unexpected 계산 → status와 차이 목록 반환입니다. |
| ownership/lifetime/cleanup | 함수는 schema를 변경하지 않고 파일 목록과 query 결과만 읽습니다. query client/pool의 lifetime은 호출자가 계속 소유합니다. |
| failure/rollback/retry | migration table 부재 이외의 SQL 오류를 정상 상태로 삼지 않고 전파합니다. 따라서 database 장애가 migration pending으로 위장되지 않습니다. |
| 보장하는 것 | bundle과 database migration 집합의 관계를 명시적으로 판정하고 divergence를 fail-closed 신호로 만들 수 있습니다. |
| 보장하지 않는 것 | migration을 자동 실행하거나 SQL 내용의 의미적 호환성을 증명하지 않습니다. 이름 집합만 비교합니다. |
| 후속 연결 | `2f05d5d79c64`가 이 판정을 repository readiness 결과로 노출하고 `6937cf60aeea`가 pending/current/diverged를 테스트합니다. |
<!-- LEARNER-END:30aac132e14e:record -->



#### 최소 코드 근거

<!-- LEARNER-BEGIN:30aac132e14e:snippet -->
- SHA: `30aac132e14e`
- 위치: `packages/db/src/migrator.ts`; `findMigrationFiles`, `compareMigrationSets`, `inspectMigrationSet`

```ts
if (unexpected.length > 0) return { status: "diverged", missing, unexpected };
if (missing.length > 0) return { status: "pending", missing, unexpected };
return { status: "current", missing, unexpected };
```
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
| 직전 관련 상태 | migration 상태 판정 함수는 존재했지만 API가 저장소 구현을 열어 pool/query 세부사항을 알아야 health를 계산할 수 있었습니다. |
| 해결하려던 문제와 위험 | readiness가 API의 구현 추측에 의존하면 memory와 PostgreSQL이 다른 의미를 반환하거나 migration 검사 순서가 분산됩니다. |
| 핵심 구현 결정 | 공통 `AppRepository`에 `checkReadiness()`를 추가합니다. PostgreSQL 구현은 연결 query와 migration 집합 검사를 수행하고, memory 구현은 database `up`, migrations `not_applicable`을 반환합니다. |
| 입력 → 상태 전이 → 출력 | API 또는 운영 caller → `repo.checkReadiness()` → 구현별 dependency 검사 → `{database, migrations}` 반환입니다. |
| ownership/lifetime/cleanup | 저장소가 자신의 connection과 schema 상태를 판정하는 책임을 소유합니다. API는 결과만 소비하고 pool을 직접 만지지 않습니다. |
| failure/rollback/retry | PostgreSQL query 또는 migration 검사가 실패하면 Promise가 reject됩니다. 이 SHA 자체는 오류를 HTTP 상태로 변환하지 않습니다. |
| 보장하는 것 | storage 종류에 관계없이 동일한 readiness 호출 지점이 생기고 migration applicability를 명시적으로 표현합니다. |
| 보장하지 않는 것 | service lifecycle이나 traffic admission은 아직 포함하지 않으며 database 오류를 sanitize하는 HTTP 경계도 다음 commit에 남습니다. |
| 후속 연결 | `15002e229acb`가 이 contract를 `/health/ready`에 연결합니다. |
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
| 직전 관련 상태 | 기존 `/health`는 process가 응답한다는 사실만 보여 주었고 database/migration 불일치에도 traffic을 받아야 하는지 판단할 수 없었습니다. |
| 해결하려던 문제와 위험 | orchestrator가 process restart와 traffic removal을 같은 신호로 처리하면 일시적 database 장애에 process가 재시작되거나, 반대로 schema가 준비되지 않은 process에 요청이 유입됩니다. |
| 핵심 구현 결정 | liveness와 readiness를 별도 route로 만듭니다. readiness는 database가 `up`이고 migration이 `current` 또는 `not_applicable`일 때만 200/`ready`를 반환하며, 그 외 또는 예외는 503/`not_ready`로 변환합니다. |
| 입력 → 상태 전이 → 출력 | HTTP request → Fastify route → live는 즉시 schema 응답, ready는 `repo.checkReadiness` → 조건 판정 → shared schema로 응답입니다. |
| ownership/lifetime/cleanup | process 생존 신호는 app이, storage 판정은 repository가 소유합니다. HTTP 경계가 내부 예외를 외부의 제한된 상태값으로 변환합니다. |
| failure/rollback/retry | repository reject는 `database: down`, `migrations: unknown`인 503으로 축약됩니다. credential이나 connection string은 응답에 포함되지 않습니다. |
| 보장하는 것 | liveness와 dependency-aware readiness가 서로 독립된 운영 신호가 됩니다. |
| 보장하지 않는 것 | 이 시점의 lifecycle 값은 항상 `accepting`이며 drain 상태는 `44ef3e07e1a5`에서 추가됩니다. |
| 후속 연결 | `6937cf60aeea`가 HTTP와 실제 PostgreSQL 상태 전환을 검증합니다. |
<!-- LEARNER-END:15002e229acb:record -->



#### 최소 코드 근거

<!-- LEARNER-BEGIN:15002e229acb:snippet -->
- SHA: `15002e229acb`
- 위치: `packages/shared/src/http.ts`; liveness/readiness response schema, `/health/live`, `/health/ready`, `repo.checkReadiness`

```ts
const ready = repository.database === "up"
  && (repository.migrations === "current"
    || repository.migrations === "not_applicable");
```
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
| 직전 관련 상태와 문제 | health route와 repository 판정이 구현됐지만 process 신호 분리, secret 비노출, 실제 migration 전후 상태를 함께 고정하는 증거가 없었습니다. 단위 stub만으로는 실제 migration table과 bundle 비교가 맞는지, 통합 테스트만으로는 HTTP 오류 변환이 안전한지 각각 부족했습니다. |
| 구현 또는 검증 결정 | Fastify injection으로 route contract를, memory/stub으로 실패 응답을, isolated PostgreSQL schema로 pending→current 전환을 각각 검증합니다. |
| 실행/검증 경로 | test setup → app/repository 생성 → health request 또는 migration 실행 → status/body 비교 → reverse-order close입니다. |
| ownership과 failure 처리 | 테스트가 생성한 app, repository, isolated database를 teardown에서 회수합니다. 의도적으로 `checkReadiness`를 reject시켜 503 변환과 secret 비노출을 확인합니다. 실제 네트워크 단절을 주입하는 테스트는 아닙니다. |
| 보장하는 것 | liveness/readiness 분리, memory `not_applicable`, migration set 판정, HTTP 오류 축약이 회귀 테스트로 고정됩니다. |
| 보장하지 않는 것 | orchestrator probe 설정이나 장시간 장애 복구는 검증하지 않습니다. |
| 후속 연결 | 후속 drain 테스트가 readiness lifecycle에 `draining`을 추가하면서 이 계약을 확장합니다. |
<!-- LEARNER-END:6937cf60aeea:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:6937cf60aeea:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | route unit/integration + PostgreSQL integration |
| 주입·재현 방식 | Fastify `inject`, repository rejection stub, migration 전후 isolated PostgreSQL schema를 조합합니다. |
| 증명하는 것 | HTTP contract와 실제 migration state가 같은 readiness 의미로 연결됩니다. |
| 증명하지 않는 것 | 실제 process health probe, container restart, 외부 network partition은 증명하지 않습니다. |
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
| 직전 관련 상태와 문제 | 초기 bootstrap은 repository를 만든 직후 `ensureSeedData`를 호출해 process 재시작이 데이터 생성 side effect를 가졌습니다. 서비스 startup과 데이터 준비가 결합되면 production에서도 운영자가 승인하지 않은 seed mutation이 일어날 수 있고 readiness가 실제 사전 준비 상태를 가립니다. |
| 구현 또는 검증 결정 | API entrypoint에서 `ensureSeedData` 호출을 삭제합니다. 데이터 준비는 별도 명령/운영 단계로 남기고 process는 저장소를 선택해 app을 시작하는 일만 합니다. |
| 실행/검증 경로 | 환경 해석 → repository 생성 → app 생성 → listen으로 단순화됩니다. |
| ownership과 failure 처리 | seed 실행 책임이 API process lifetime에서 외부의 명시적 관리 작업으로 이동합니다. 필요한 데이터가 없으면 startup이 자동 복구하지 않습니다. 이는 의도된 non-guarantee이며 운영자가 명시적으로 준비해야 합니다. |
| 보장하는 것 | API startup이 seed 데이터를 암묵적으로 만들지 않습니다. |
| 보장하지 않는 것 | source-level 호출 하나를 제거했을 뿐 다른 경로의 data mutation을 전역적으로 금지하는 것은 아닙니다. |
| 후속 연결 | `5cac4843fd9b`가 entrypoint source에서 호출 재도입을 막습니다. |
<!-- LEARNER-END:e1a0316fbe84:record -->


#### Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:e1a0316fbe84:fix -->
startup이 개발 편의를 위해 seed를 생성한다는 초기 가정 → production에서 암묵적 데이터 변경 위험 → entrypoint 호출 제거 → source-level regression guard
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
| 직전 관련 상태와 문제 | seed 호출은 제거됐지만 이후 refactor가 entrypoint에 다시 추가되어도 이를 직접 탐지하는 테스트가 없었습니다. startup mutation 금지는 코드 review 규칙만으로는 쉽게 회귀할 수 있습니다. |
| 구현 또는 검증 결정 | entrypoint source를 문자열로 읽어 `.ensureSeedData(` 호출 패턴이 없음을 확인합니다. |
| 실행/검증 경로 | test가 `index.ts` 경로 해석 → source read → negative regex assertion을 수행합니다. |
| ownership과 failure 처리 | 테스트는 파일 descriptor를 장기 보유하지 않는 동기 read만 수행합니다. 정규식이 일치하면 즉시 실패합니다. 간접 호출이나 다른 이름의 mutation은 탐지하지 못합니다. |
| 보장하는 것 | entrypoint에 직접 `ensureSeedData` method call이 돌아오는 회귀를 고정적으로 막습니다. |
| 보장하지 않는 것 | process를 실행하거나 실제 database가 변경되지 않는지 관찰하는 테스트는 아닙니다. |
| 후속 연결 | `e1a0316fbe84`의 fix를 좁은 source contract로 보호합니다. |
<!-- LEARNER-END:5cac4843fd9b:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:5cac4843fd9b:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | 정적 source regression test |
| 주입·재현 방식 | Node `readFileSync`로 동일 디렉터리의 `index.ts`를 읽고 direct method-call pattern의 부재를 검사합니다. |
| 증명하는 것 | 정확히 그 호출 형태의 재도입을 탐지합니다. |
| 증명하지 않는 것 | 간접 seed 호출, 다른 startup module, runtime database write는 증명하지 않습니다. |
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
| 직전 관련 상태 | bootstrap은 `DATABASE_URL`이 없으면 mode와 관계없이 memory repository를 선택할 수 있었습니다. |
| 해결하려던 문제와 위험 | production process가 잘못된 환경 설정으로 시작해 일시적 memory state를 정상 서비스처럼 제공하면 경기·사용자·토너먼트 데이터가 재시작과 함께 사라집니다. |
| 핵심 구현 결정 | 설정 parser가 production mode를 확정한 뒤 database URL이 없으면 예외를 던지도록 변경합니다. 실패가 repository factory보다 앞서므로 서버는 listen하지 않습니다. |
| 입력 → 상태 전이 → 출력 | 환경값 읽기 → app mode 결정 → production이면 `DATABASE_URL` 존재 확인 → 실패 시 throw, 성공 시 bootstrap 진행입니다. |
| ownership/lifetime/cleanup | durable-storage 선택 정책이 composition root의 임시 조건이 아니라 configuration boundary의 검증 규칙이 됩니다. |
| failure/rollback/retry | 오설정 production은 startup fail-fast입니다. memory로 조용히 fallback하지 않습니다. |
| 보장하는 것 | production API는 영속 저장소 위치가 명시되지 않으면 시작하지 않습니다. |
| 보장하지 않는 것 | URL이 실제 연결 가능하거나 올바른 database를 가리키는지는 readiness가 별도로 판정합니다. |
| 후속 연결 | `4633dfde208d`가 명시적/추론된 production 두 경로를 모두 검증합니다. |
<!-- LEARNER-END:eb675ef74af3:record -->


#### Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:eb675ef74af3:fix -->
URL 부재 시 모든 mode에서 memory fallback 가능 → production data loss 위험 → configuration parser에서 fail-fast → mode별 regression tests
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
| 직전 관련 상태 | production fail-fast 구현은 있었지만 한 mode 판정 경로만 테스트하면 다른 추론 경로가 memory fallback을 다시 허용할 수 있었습니다. |
| 해결하려던 문제와 위험 | explicit app mode와 deployment의 `NODE_ENV` 추론이 서로 다른 branch를 타면 production invariant가 설정 방식에 따라 달라집니다. |
| 핵심 구현 결정 | 두 production 판정 방식 모두 URL 부재에서 reject되는지, URL 제공 시 통과하는지, demo는 계속 memory를 허용하는지 표로 고정합니다. |
| 입력 → 상태 전이 → 출력 | 환경 case 구성 → `readEnv` 호출 → throw 또는 반환 config assertion입니다. |
| ownership/lifetime/cleanup | 테스트가 각 환경 객체를 독립적으로 만들어 process-global 상태에 의존하지 않습니다. |
| failure/rollback/retry | 오류는 configuration 단계에서 발생하므로 repository나 network를 만들지 않습니다. |
| 보장하는 것 | production memory fallback 거부가 mode 표기 방식과 무관하게 유지됩니다. |
| 보장하지 않는 것 | 실제 PostgreSQL 연결·migration current 여부는 readiness 테스트의 책임입니다. |
| 후속 연결 | Thread의 최종 startup invariant를 완성합니다. |
<!-- LEARNER-END:4633dfde208d:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:4633dfde208d:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | negative configuration boundary test |
| 주입·재현 방식 | 명시적 production, `NODE_ENV` 기반 production, demo mode를 독립 입력으로 비교합니다. |
| 증명하는 것 | 모든 production 해석 경로에서 durable-store 설정이 필수입니다. |
| 증명하지 않는 것 | 제공된 URL의 접근 가능성이나 database durability 자체는 증명하지 않습니다. |
<!-- LEARNER-END:4633dfde208d:test -->



#### 비교 기준

- 직전 관련 SHA: `eb675ef74af3` — `fix(config): production에서 영속 저장소 요구`
- 이 Thread의 마지막 selected SHA입니다.

## 6. 불변식의 변화

<!-- LEARNER-BEGIN:01-startup-liveness-readiness-and-storage-state.md:evolution -->
`4b43a284e637`은 process가 실행될 composition root와 repository lifetime을 만들었지만 startup seed와 memory fallback을 함께 허용했습니다. `30aac132e14e`와 `2f05d5d79c64`는 schema 상태 판정과 저장소 소유의 readiness를 도입했고, `15002e229acb`는 이를 process liveness와 분리된 HTTP 신호로 내보냈습니다. `e1a0316fbe84`/`5cac4843fd9b`가 startup mutation을 제거·고정하고, `eb675ef74af3`/`4633dfde208d`가 production의 durable-storage fail-fast를 완성합니다.
<!-- LEARNER-END:01-startup-liveness-readiness-and-storage-state.md:evolution -->

## 7. Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:01-startup-liveness-readiness-and-storage-state.md:failure-links -->
- implicit seed mutation → `e1a0316fbe84` 제거 → `5cac4843fd9b` source regression guard
- production memory fallback → `eb675ef74af3` parser fail-fast → `4633dfde208d` explicit/inferred production tests
- database/migration 불확실성 → `30aac132e14e`/`2f05d5d79c64` 판정 → `6937cf60aeea` route·PostgreSQL evidence
<!-- LEARNER-END:01-startup-liveness-readiness-and-storage-state.md:failure-links -->

## 8. Ownership·state·cleanup 변화

<!-- LEARNER-BEGIN:01-startup-liveness-readiness-and-storage-state.md:ownership -->
entrypoint는 환경·repository 생성과 close hook만 소유합니다. repository는 connection 및 migration 상태 판정을 소유하고, Fastify health route는 그 결과를 제한된 외부 상태로 변환합니다. seed/migration 실행은 API process 밖의 명시적 운영 작업으로 이동합니다.
<!-- LEARNER-END:01-startup-liveness-readiness-and-storage-state.md:ownership -->

## 9. Thread 최종 상태

<!-- LEARNER-BEGIN:01-startup-liveness-readiness-and-storage-state.md:final-state -->
process가 응답하면 liveness는 유지되지만, database down·pending/diverged migration이면 readiness는 503입니다. production은 database URL이 없으면 listen 이전에 실패하고, startup은 seed를 만들지 않습니다.
<!-- LEARNER-END:01-startup-liveness-readiness-and-storage-state.md:final-state -->

## 10. 최종 실행 흐름

<!-- LEARNER-BEGIN:01-startup-liveness-readiness-and-storage-state.md:final-flow -->
- 환경 파싱에서 mode와 durable-store 요구를 검증합니다.
- entrypoint가 repository를 만들고 Fastify app에 주입합니다.
- `/health/live`는 dependency와 무관하게 process 생존을 응답합니다.
- `/health/ready`는 repository의 connection 및 migration 집합 결과를 읽어 200/503을 결정합니다.
- 종료 시 Fastify `onClose`가 repository `close`를 호출합니다.
<!-- LEARNER-END:01-startup-liveness-readiness-and-storage-state.md:final-flow -->

## 11. 실행 및 검증 근거

<!-- LEARNER-BEGIN:01-startup-liveness-readiness-and-storage-state.md:execution -->
- 저장소 runtime/test command는 실행하지 않았습니다.
- 실행을 시도한 명령: `git ls-remote --heads https://github.com/seungwoo7050/42-archive.git refs/heads/web/ft_transcendence`
- 실제 결과: exit status 128, `Could not resolve host: github.com`.
- 따라서 test pass, benchmark 수치, k6/Toxiproxy recovery 결과는 주장하지 않습니다. 각 기록은 GitHub 연결로 exact selected commit의 diff와 당시 파일을 확인한 정적 historical inspection 결과입니다.
<!-- LEARNER-END:01-startup-liveness-readiness-and-storage-state.md:execution -->

## 12. 학습 완료 확인

<!-- LEARNER-BEGIN:01-startup-liveness-readiness-and-storage-state.md:checks -->
- [x] migration `current/pending/diverged/not_applicable`의 의미와 계산 근거를 설명할 수 있습니다.
- [x] liveness와 readiness의 호출 경로·실패 branch를 exact SHA 기준으로 구분할 수 있습니다.
- [x] startup seed 제거와 production memory fallback 거부의 fix→test 관계를 설명할 수 있습니다.
<!-- LEARNER-END:01-startup-liveness-readiness-and-storage-state.md:checks -->
