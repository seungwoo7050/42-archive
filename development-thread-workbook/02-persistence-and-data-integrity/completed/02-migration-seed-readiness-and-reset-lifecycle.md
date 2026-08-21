# Development Thread 02 — Migration·seed·readiness·reset lifecycle

## 1. 학습 목표

- 초기 SQL 실행과 seed가 하나의 method에 묶인 상태에서 versioned migration·profile seed로 분리되는 ownership 변화를 재구성합니다.
- database 연결 가능성과 migration set의 current/pending/diverged 상태가 repository readiness로 결합되는 과정을 설명합니다.
- API startup의 암시적 seed mutation을 제거한 이유와 source-level regression guard의 한계를 구분합니다.
- 파괴적 test reset이 strict target resolver, transactional schema replacement, migration 재적용과 시험으로 보호되는 과정을 추적합니다.

## 2. 범위와 경계

- 포함: DB package migration asset/CLI, Kysely migration lifecycle, seed profile, migration-set inspection, repository readiness, startup seed removal, test reset guard·executor·test.
- 실제 역사 순서에 맞춰 `e1a0316fbe84`·`5cac4843fd9b`를 `113b3c422192` 이후가 아니라 그 앞에 배치합니다.
- 제외: HTTP liveness/readiness endpoint, Prometheus metric, graceful shutdown과 deployment orchestration은 operations category에서 다룹니다.
- 제외: role assignment, guest session, WebSocket ticket migration은 authentication category의 독립 데이터 전환입니다.
- reset은 test-only destructive lifecycle이며 production migration rollback 전략으로 일반화하지 않습니다.

## 3. 핵심 질문

- 왜 `migrate`와 `seed`가 같은 `ensureSeedData()`를 호출하는 상태가 잘못된 ownership입니까?
- applied migration이 bundled set의 prefix가 아닐 때 왜 단순 pending이 아니라 diverged입니까?
- repository readiness는 process liveness와 무엇이 다르고 어느 순간까지의 상태만 보장합니까?
- startup에서 seed를 제거한 뒤 필요한 데이터 준비 책임은 어디로 이동합니까?
- test reset guard는 어떤 입력을 DB 연결 전에 차단하며, drop/create와 migration이 왜 하나의 transaction이 아닙니까?

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags |
| ---: | --- | --- | :---: | --- |
| 1 | `1140fb868714` | `feat(db): migration 실행 경계 구성` | B | PERSISTENCE |
| 2 | `dea169d587a3` | `feat(db): 데이터베이스 CLI 명령 연결` | B | PERSISTENCE |
| 3 | `f9bb622a1117` | `refactor(db): SQL migration lifecycle 분리` | A | PERSISTENCE, RISK, REFACTOR |
| 4 | `8da6edef28eb` | `feat(db): 환경별 seed profile 분리` | B | AUTH, REALTIME, PERSISTENCE |
| 5 | `981ee655559b` | `refactor(db): migration과 seed CLI 연결` | B | PERSISTENCE |
| 6 | `30aac132e14e` | `feat(db): migration set 상태 검사 추가` | A | PERSISTENCE, OPERATIONS, RISK |
| 7 | `2f05d5d79c64` | `feat(db): repository readiness 경계 추가` | A | PERSISTENCE, OPERATIONS |
| 8 | `e1a0316fbe84` | `fix(api): startup seed 생성을 제거` | B | PERSISTENCE |
| 9 | `5cac4843fd9b` | `test(api): startup seed 금지 검증` | B | REALTIME, TEST |
| 10 | `113b3c422192` | `feat(db): test database reset target guard 추가` | A | PERSISTENCE |
| 11 | `434403a7c16a` | `feat(db): test schema reset과 migration 실행 연결` | A | PERSISTENCE, RISK |
| 12 | `527b5f137425` | `test(db): test database reset guard 검증` | B | PERSISTENCE, TEST |

## 5. Commit별 조사

### 5.1. `1140fb868714` — feat(db): migration 실행 경계 구성

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `1140fb868714` |
| Importance | B |
| Tags | PERSISTENCE |
| Source role | 초기 SQL 파일을 DB package가 읽고 실행할 수 있는 importable schema-initialization 경계로 연결합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/migrations.ts`와 package export가 `001_initial.sql`을 runtime에서 찾는 방식을 확인합니다.
- `initialMigrationSql`을 사용하는 caller가 파일 경로·module URL에 의존하는 범위를 확인합니다.
- 이 시점에는 migration history table이나 개별 version 적용 상태가 없고, 하나의 초기 SQL payload라는 점을 기록합니다.
- package build/runtime에서 SQL asset이 존재해야 한다는 non-guarantee를 확인합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | `001_initial.sql`은 repository에 있었지만 TypeScript runtime이 이를 import·실행할 안정된 package 경계가 없었습니다. |
| 해결하려던 문제 | repository 초기화 코드가 임의 경로로 SQL을 읽으면 실행 위치나 package 소비 방식에 따라 schema setup이 깨질 수 있었습니다. |
| 핵심 결정 | DB package 내부에서 초기 migration SQL을 읽어 export하고 이후 repository/CLI가 그 값을 사용하도록 했습니다. |
| 입력 → 상태 전이 → 출력 | module-relative SQL asset 조회 → `initialMigrationSql` 로드 → repository 초기화 path가 SQL을 execute합니다. |
| ownership / lifetime / cleanup | DB package가 SQL asset의 위치와 읽기 책임을 소유합니다. 실행 caller는 반환된 SQL을 소비하지만 version set을 소유하지 않습니다. |
| failure / rollback / retry | asset 누락·경로 오류·SQL 실행 오류는 호출자에게 전파됩니다. 적용된 migration 목록이나 rollback은 없습니다. |
| 보장하는 것 | schema initialization SQL을 API와 CLI가 같은 package 경계에서 사용할 수 있습니다. |
| 보장하지 않는 것 | versioned migration lifecycle, pending/diverged 판별, seed와 schema evolution 분리는 보장하지 않습니다. |
| 후속 연결 | `dea169d587a3`가 CLI에 연결하고 `f9bb622a1117`가 단일 SQL payload를 Kysely file migration lifecycle로 대체합니다. |

#### 비교 기준

- parent 상태와 `1140fb868714`의 diff를 먼저 비교합니다.
- 후속 관련 SHA `dea169d587a3`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.2. `dea169d587a3` — feat(db): 데이터베이스 CLI 명령 연결

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `dea169d587a3` |
| Importance | B |
| Tags | PERSISTENCE |
| Source role | `migrate`, `seed`, memory smoke를 DB package CLI에 노출하지만 당시 migration과 seed는 같은 method를 호출합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/cli.ts`의 command parsing과 unknown-command failure를 확인합니다.
- `migrate`와 `seed`가 모두 repository의 `ensureSeedData()`를 호출하는 parent 상태를 비교합니다.
- `try/finally` 또는 종료 경로에서 repository `close()`가 항상 실행되는지 확인합니다.
- `packages/db/package.json` scripts가 각 command를 어떻게 노출하는지 확인합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | schema와 seed를 준비하는 repository method는 있었지만 개발자·운영 script가 호출할 명시적 CLI가 없었습니다. |
| 해결하려던 문제 | 수동 코드 호출 대신 반복 가능한 command가 필요했지만, 당시 `ensureSeedData`가 DDL과 seed를 동시에 소유해 두 command의 의미가 같았습니다. |
| 핵심 결정 | command parser를 추가하고 `migrate`, `seed`, `memory-smoke`를 package script에 연결했습니다. |
| 입력 → 상태 전이 → 출력 | CLI 인수 해석 → URL/backend repository 생성 → `ensureSeedData()` 또는 smoke operation → `close()`입니다. |
| ownership / lifetime / cleanup | CLI process가 repository lifetime과 종료를 소유합니다. schema/seed의 실제 변경은 repository method가 수행합니다. |
| failure / rollback / retry | 잘못된 command와 DB 오류는 non-zero failure로 전파됩니다. `migrate`만 실행해도 seed가 생성되는 의미적 결합이 남아 있습니다. |
| 보장하는 것 | 개발자가 DB 준비와 smoke를 명시적 package command로 실행할 수 있습니다. |
| 보장하지 않는 것 | migration과 seed의 분리, environment profile, applied-version 기록, readiness는 보장하지 않습니다. |
| 후속 연결 | `f9bb622a1117`가 잘못 결합된 ownership을 분리하고 `981ee655559b`가 CLI 의미를 다시 연결합니다. |

#### 비교 기준

- parent 상태와 `dea169d587a3`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `1140fb868714`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `f9bb622a1117`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.3. `f9bb622a1117` — refactor(db): SQL migration lifecycle 분리

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `f9bb622a1117` |
| Importance | A |
| Tags | PERSISTENCE, RISK, REFACTOR |
| Source role | schema evolution을 Kysely `Migrator`와 SQL file set이, seed를 repository가 소유하도록 책임을 분리합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/migrator.ts`의 `FileMigrationProvider`, `Migrator`, migration directory resolution을 확인합니다.
- `packages/db/src/index.ts`에서 `ensureSeedData()`가 schema DDL 실행을 더 이상 수행하지 않는 parent diff를 확인합니다.
- 기존 `initialMigrationSql` import/asset 경로가 제거되거나 대체되는 범위를 확인합니다.
- migration failure result와 thrown error가 caller에게 어떻게 전달되는지 확인합니다.
- repository seed가 이미 migration된 schema를 전제로 하게 된 새로운 precondition을 기록합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | `migrate`와 `seed`가 같은 `ensureSeedData()`를 실행해 schema version과 데이터 준비의 책임이 섞여 있었습니다. |
| 해결하려던 문제 | 운영 startup·CI가 schema만 적용하거나 seed만 선택할 수 없고, migration history와 순서를 독립적으로 추적할 수 없었습니다. |
| 핵심 결정 | SQL 파일을 Kysely `FileMigrationProvider`와 `Migrator`에 맡기고, repository의 `ensureSeedData`는 데이터 upsert만 수행하도록 바꿨습니다. |
| 입력 → 상태 전이 → 출력 | `migrateDatabase(url)` → migration directory의 version file discovery → Kysely migration table과 비교 → pending SQL 순차 적용; seed command는 별도 repository path를 사용합니다. |
| ownership / lifetime / cleanup | Migrator가 schema evolution 순서와 applied state를 소유하고 repository가 seed 데이터 의미를 소유합니다. caller는 두 lifecycle을 명시적으로 조합합니다. |
| failure / rollback / retry | migration이 실패하면 이후 seed를 자동 실행하지 않으며 오류가 전파됩니다. repository method를 migration 없이 호출하면 table 부재로 실패할 수 있습니다. |
| 보장하는 것 | schema evolution과 seed 데이터 생성이 서로 독립적으로 실행·감사될 수 있고 applied migration history가 생깁니다. |
| 보장하지 않는 것 | bundled/applied set divergence 판별, readiness 노출, destructive reset 안전성은 아직 보장하지 않습니다. |
| 후속 연결 | `981ee655559b`가 CLI를 새 lifecycle에 맞추고 `30aac132e14e`가 migration set 일치 여부를 명시적으로 분류합니다. |

#### 최소 코드 근거

- `packages/db/src/migrator.ts` — Kysely `FileMigrationProvider`/`Migrator`가 SQL file 순서와 applied migration state를 소유하고, repository seed path에서는 DDL 책임이 제거됩니다.

#### 비교 기준

- parent 상태와 `f9bb622a1117`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `dea169d587a3`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `8da6edef28eb`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.4. `8da6edef28eb` — feat(db): 환경별 seed profile 분리

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `8da6edef28eb` |
| Importance | B |
| Tags | AUTH, REALTIME, PERSISTENCE |
| Source role | `development`와 `demo` seed profile을 분리해 환경별 사용자·NPC 데이터 범위를 명시합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `SeedProfile`과 `ensureSeedData(profile = 'development')` signature를 두 backend에서 확인합니다.
- development profile의 일반·관리 사용자와 demo profile의 NPC/체험 데이터 차이를 확인합니다.
- NPC rating band와 `is_npc` upsert가 반복 실행에서 identity를 유지하는지 확인합니다.
- profile 선택이 migration을 실행하지 않는다는 `f9bb622a1117` 이후 precondition을 확인합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | migration과 seed는 분리됐지만 seed 데이터가 하나의 고정 집합이라 개발용 권한 사용자와 demo용 상대가 섞였습니다. |
| 해결하려던 문제 | 환경에 따라 필요한 sample identity가 다른데 같은 seed를 적용하면 demo에서 불필요한 계정·권한이 생길 수 있었습니다. |
| 핵심 결정 | `development`·`demo` profile을 도입하고 두 backend의 `ensureSeedData`가 profile별 사용자/NPC 집합을 upsert하도록 했습니다. |
| 입력 → 상태 전이 → 출력 | profile 입력 → 공통 NPC 및 profile-specific 사용자 선택 → handle 기준 upsert → 반복 실행 시 기존 identity 갱신입니다. |
| ownership / lifetime / cleanup | repository가 profile별 seed set과 memory map/DB row를 소유합니다. caller가 환경에 맞는 profile 선택 책임을 가집니다. |
| failure / rollback / retry | 잘못된 profile은 타입/CLI parsing에서 차단됩니다. 여러 upsert가 하나의 transaction으로 묶인다는 보장은 없습니다. |
| 보장하는 것 | development와 demo가 의도한 데이터 집합을 명시적으로 선택하고 반복 적용해도 handle 중복이 생기지 않습니다. |
| 보장하지 않는 것 | 권한 assignment의 보안 전체, production 자동 seed 허용, migration current 상태는 보장하지 않습니다. |
| 후속 연결 | `981ee655559b`가 `seed:dev`·`seed:demo` command로 연결하고 PostgreSQL integration test가 idempotence와 차이를 확인합니다. |

#### 비교 기준

- parent 상태와 `8da6edef28eb`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `f9bb622a1117`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `981ee655559b`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.5. `981ee655559b` — refactor(db): migration과 seed CLI 연결

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `981ee655559b` |
| Importance | B |
| Tags | PERSISTENCE |
| Source role | CLI command를 분리된 migration function과 profile-specific seed operation에 정확히 연결합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/cli.ts`의 `migrate`, `seed:dev`, `seed:demo`, `memory-smoke` branch를 확인합니다.
- `migrate`가 repository `ensureSeedData`가 아니라 `migrateDatabase(databaseUrl)`을 직접 호출하는지 확인합니다.
- seed command의 repository 생성·profile 인수·`finally close()`를 추적합니다.
- usage text와 `packages/db/package.json` scripts가 command 의미와 일치하는지 확인합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | `f9bb622a1117`가 내부 책임을 분리했지만 CLI는 이전 command 의미를 그대로 두면 사용자에게 잘못된 동작을 노출할 수 있었습니다. |
| 해결하려던 문제 | `migrate`는 schema만, `seed:*`는 이미 migration된 schema의 데이터만 바꿔야 했습니다. |
| 핵심 결정 | command dispatch를 `migrateDatabase`, `ensureSeedData('development'\|'demo')`에 각각 연결하고 package scripts 이름을 맞췄습니다. |
| 입력 → 상태 전이 → 출력 | `migrate` → migrator 실행; `seed:dev\|demo` → repository 생성 → profile seed → `finally close`; smoke는 memory path를 사용합니다. |
| ownership / lifetime / cleanup | migration command는 migrator resource를, seed command는 repository lifecycle을 소유합니다. CLI caller가 실행 순서를 선택합니다. |
| failure / rollback / retry | seed를 migration 전에 실행하면 DB 오류가 발생합니다. 두 command를 하나의 all-or-nothing operation으로 묶지 않습니다. |
| 보장하는 것 | command 이름과 실제 mutation 범위가 일치하고 seed backend 자원이 항상 close되는 경로를 제공합니다. |
| 보장하지 않는 것 | 배포가 올바른 순서로 command를 실행한다는 보장, migration divergence/readiness는 아직 없습니다. |
| 후속 연결 | `30aac132e14e`와 `2f05d5d79c64`가 적용 상태를 판별하고 repository readiness로 노출합니다. |

#### 비교 기준

- parent 상태와 `981ee655559b`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `8da6edef28eb`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `30aac132e14e`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.6. `30aac132e14e` — feat(db): migration set 상태 검사 추가

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `30aac132e14e` |
| Importance | A |
| Tags | PERSISTENCE, OPERATIONS, RISK |
| Source role | bundled SQL migration 이름과 DB의 Kysely applied record를 비교해 current/pending/diverged를 구분합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/migrator.ts`의 bundled migration name discovery와 applied migration query를 확인합니다.
- current, pending, diverged를 결정하는 순서·prefix 조건과 unknown applied migration 처리 방식을 추적합니다.
- 파일 이름 정렬이 실제 migration order와 어떻게 연결되는지 확인합니다.
- DB 연결 실패와 migration set divergence가 서로 다른 failure로 전달되는지 확인합니다.
- 상태 검사가 migration을 적용하거나 seed를 변경하지 않는 read-only operation인지 확인합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | Kysely는 pending migration을 적용할 수 있었지만 서비스가 현재 binary의 migration set과 DB applied state가 같은지 명시적으로 설명하지 못했습니다. |
| 해결하려던 문제 | DB가 연결돼도 pending file이 있거나 이미 적용된 migration이 bundle에서 사라진 diverged 상태면 API를 ready로 취급하면 안 됩니다. |
| 핵심 결정 | bundled file 이름과 applied record를 정렬·비교해 `current`, `pending`, `diverged` 상태를 계산하는 inspection function을 추가했습니다. |
| 입력 → 상태 전이 → 출력 | migration directory 목록 읽기 + Kysely applied rows 조회 → ordered set 비교 → 동일하면 current, applied prefix 뒤 file이 남으면 pending, prefix가 깨지거나 unknown applied가 있으면 diverged입니다. |
| ownership / lifetime / cleanup | Migrator module이 migration vocabulary와 comparison logic을 소유합니다. 검사 caller는 결과를 정책으로 해석합니다. |
| failure / rollback / retry | DB query/파일 읽기 실패는 상태가 아니라 오류로 전파됩니다. divergence를 자동 수정하거나 down migration하지 않습니다. |
| 보장하는 것 | 연결 가능성과 별개로 binary/DB schema set의 합치·미적용·분기를 구분할 수 있습니다. |
| 보장하지 않는 것 | migration 내용의 semantic 호환성, production data migration 안전성, 자동 복구는 보장하지 않습니다. |
| 후속 연결 | `2f05d5d79c64`가 이 inspection을 repository readiness contract에 포함하고 운영 health endpoint는 다른 카테고리에서 소비합니다. |

#### 최소 코드 근거

- `packages/db/src/migrator.ts` — bundled migration name sequence와 Kysely applied sequence를 비교하며, applied prefix가 깨지는 경우를 단순 pending이 아닌 `diverged`로 분류합니다.

#### 비교 기준

- parent 상태와 `30aac132e14e`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `981ee655559b`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `2f05d5d79c64`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.7. `2f05d5d79c64` — feat(db): repository readiness 경계 추가

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `2f05d5d79c64` |
| Importance | A |
| Tags | PERSISTENCE, OPERATIONS |
| Source role | storage 연결성과 migration set 상태를 concrete backend 밖의 `AppRepository` readiness contract로 올립니다. |

#### 해당 SHA에서 확인할 실제 코드

- `AppRepository`에 추가된 readiness method와 반환/오류 shape를 확인합니다.
- PostgreSQL 구현의 `select 1` 또는 동등한 connectivity probe와 migration set inspection 순서를 추적합니다.
- pending/diverged 상태가 ready 결과가 아니라 failure로 해석되는지 확인합니다.
- memory 구현이 외부 DB 없이 어떤 readiness 값을 반환하는지 비교합니다.
- API가 Pool/Kysely 세부사항을 알지 않아도 readiness를 확인할 수 있는지 확인합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | migration 상태를 계산할 수 있었지만 API가 이를 사용하려면 DB package의 concrete migrator·pool 세부사항을 알아야 했습니다. |
| 해결하려던 문제 | liveness와 달리 ready는 query 가능하고 현재 binary와 schema가 일치해야 하며 backend 선택과 무관한 호출 계약이 필요했습니다. |
| 핵심 결정 | `AppRepository`에 readiness operation을 추가하고 PostgreSQL은 connectivity probe와 migration set current를 확인하며 memory는 즉시 준비 상태를 반환하도록 했습니다. |
| 입력 → 상태 전이 → 출력 | API readiness 요청 → repository readiness → PostgreSQL query 성공 여부 → migration set inspection → current이면 ready 응답, 아니면 오류/비준비입니다. |
| ownership / lifetime / cleanup | repository가 backend-specific health probe와 migration interpretation을 소유하고 API는 결과만 소비합니다. |
| failure / rollback / retry | 연결 실패·pending·diverged는 ready로 숨기지 않습니다. probe와 실제 다음 business query 사이의 race는 제거하지 못합니다. |
| 보장하는 것 | 서비스가 storage implementation을 추측하지 않고 동일 interface에서 query 가능성과 schema current 상태를 검사할 수 있습니다. |
| 보장하지 않는 것 | 장기 transaction, replica lag, 모든 table의 semantic integrity, 이후 순간의 availability는 보장하지 않습니다. |
| 후속 연결 | `e1a0316fbe84`가 startup mutation을 제거해 readiness와 initialization을 더 분리하고, health endpoint 통합은 operations category에서 검증됩니다. |

#### 비교 기준

- parent 상태와 `2f05d5d79c64`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `30aac132e14e`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `e1a0316fbe84`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.8. `e1a0316fbe84` — fix(api): startup seed 생성을 제거

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `e1a0316fbe84` |
| Importance | B |
| Tags | PERSISTENCE |
| Source role | API process startup이 memory backend를 선택했다는 이유만으로 데이터를 암시적으로 생성하던 동작을 제거합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/index.ts` parent diff에서 `if (!env.databaseUrl) await repo.ensureSeedData()` 제거를 확인합니다.
- repository 생성, application build, listen, shutdown 흐름에서 seed mutation이 사라졌는지 확인합니다.
- 명시적 CLI seed와 startup composition root의 책임 차이를 기록합니다.
- memory startup이 빈 상태일 수 있다는 새 non-guarantee와 demo/guest 흐름의 별도 준비 책임을 확인합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | API startup은 `DATABASE_URL`이 없으면 memory repository에 자동 seed를 넣어 process boot와 data mutation을 결합했습니다. |
| 해결하려던 문제 | 재시작이 데이터 상태를 바꾸고, production/demo 설정 오류가 sample data로 가려지며, readiness가 initialization 성공처럼 오해될 수 있었습니다. |
| 핵심 결정 | composition root에서 `ensureSeedData()` 호출을 제거하고 seed는 DB CLI나 명시적 test setup만 수행하도록 했습니다. |
| 입력 → 상태 전이 → 출력 | 환경 parse → repository 생성 → application 구성 → listen으로 진행하며 startup 중 seed write는 없습니다. |
| ownership / lifetime / cleanup | API process는 runtime lifecycle만 소유하고 seed data ownership은 명시적 DB command/test fixture로 돌아갑니다. |
| failure / rollback / retry | 필요한 seed를 별도 실행하지 않으면 memory read는 빈 결과를 반환할 수 있습니다. startup이 이를 보완하지 않습니다. |
| 보장하는 것 | process boot가 암시적으로 사용자·NPC 데이터를 생성하지 않는 fail-transparent startup을 제공합니다. |
| 보장하지 않는 것 | 배포 orchestration이 migration/seed를 올바르게 실행했다는 보장이나 source 밖 동적 호출 금지는 아직 없습니다. |
| 후속 연결 | `5cac4843fd9b`가 entrypoint source에 seed 호출이 다시 들어오는 것을 회귀로 막습니다. |

#### 비교 기준

- parent 상태와 `e1a0316fbe84`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `2f05d5d79c64`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `5cac4843fd9b`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.9. `5cac4843fd9b` — test(api): startup seed 금지 검증

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `5cac4843fd9b` |
| Importance | B |
| Tags | REALTIME, TEST |
| Source role | API entrypoint가 `ensureSeedData`를 호출하지 않는다는 정적 회귀 guard를 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/startup.test.ts`가 어떤 source file을 읽고 어떤 정규식/문자열을 금지하는지 확인합니다.
- 시험이 API process를 실제 시작하지 않고 source text를 검사한다는 점을 분리합니다.
- 같은 commit의 WebSocket smoke 변경이 seeded NPC 의존성을 제거하는지 확인합니다.
- alias·wrapper를 통한 간접 seed 호출은 탐지하지 못하는 non-guarantee를 기록합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | `e1a0316fbe84`가 한 줄을 제거했지만 후속 refactor가 같은 startup path에 seed 호출을 다시 넣어도 집중 guard가 없었습니다. |
| 해결하려던 문제 | startup lifecycle과 데이터 준비 책임의 분리가 source 변경으로 쉽게 회귀할 수 있었습니다. |
| 핵심 결정 | entrypoint source를 읽어 `.ensureSeedData(` 호출이 없는지 assertion하고 smoke가 seed 전제 없이 진행되도록 조정했습니다. |
| 입력 → 상태 전이 → 출력 | test → `apps/api/src/index.ts` text load → 금지 pattern 검색 → 존재 시 실패; 별도 smoke는 AI/queue 경로를 seed 없는 조건에 맞춥니다. |
| ownership / lifetime / cleanup | 시험이 source contract를 소유하며 runtime repository state는 만들지 않습니다. |
| failure / rollback / retry | wrapper·computed property·다른 startup module의 간접 호출은 놓칠 수 있습니다. 실제 process boot나 DB mutation을 관찰하지 않습니다. |
| 보장하는 것 | 현재 entrypoint에 직접적인 startup seed call이 다시 들어오면 unit suite가 실패합니다. |
| 보장하지 않는 것 | 전체 call graph에서 모든 암시적 seed를 금지한다거나 production startup이 실제로 mutation-free라는 runtime 증거는 아닙니다. |
| 후속 연결 | 이후 destructive reset은 startup과 별개인 explicit test-only CLI로 설계됩니다. |

#### Test commit 학습 기록

| 항목 | 기록 |
| --- | --- |
| 검증 대상 불변식 | API startup과 seed lifecycle이 분리되어 entrypoint가 직접 `ensureSeedData`를 호출하지 않는다는 규칙입니다. |
| 재현한 실패·경계 | 후속 수정이 memory fallback 편의를 위해 seed call을 다시 삽입하는 source-level 회귀입니다. |
| 시험 기법 | source file text를 읽는 static contract test입니다. |
| 통과하는 실제 코드 경로 | `apps/api/src/startup.test.ts` → `apps/api/src/index.ts` source inspection입니다. |
| 시험이 증명하는 것 | 직접 method call pattern이 entrypoint에 없음을 증명합니다. |
| 시험이 증명하지 않는 것 | 간접 wrapper, 다른 module, 실제 runtime mutation이나 deployment command 순서는 증명하지 않습니다. |
| 막으려는 회귀 | process boot가 sample data 생성 책임을 다시 떠안는 회귀를 빠르게 막습니다. |

#### 비교 기준

- parent 상태와 `5cac4843fd9b`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `e1a0316fbe84`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `113b3c422192`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.10. `113b3c422192` — feat(db): test database reset target guard 추가

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `113b3c422192` |
| Importance | A |
| Tags | PERSISTENCE |
| Source role | 파괴적 reset을 허용할 database/schema target을 strict environment·URL 규칙으로 fail-closed 판정합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/testReset.ts`의 `resolveTestResetTarget`에서 `NODE_ENV=test`, `TEST_DATABASE_URL` 필수 조건을 확인합니다.
- PostgreSQL URL protocol, database name pattern, `options=-c search_path=...` parsing과 허용 개수를 추적합니다.
- public schema가 허용되는 dedicated test database 이름과 isolated `test_[a-f0-9]{32}` schema regex를 확인합니다.
- ambiguous option, 일반 DB 이름, 잘못된 schema가 모두 동일한 unsafe failure로 차단되는지 확인합니다.
- guard가 target만 반환하고 실제 drop/create를 아직 수행하지 않는다는 점을 분리합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | test isolation을 위해 schema reset이 필요했지만 잘못된 URL을 받으면 개발·운영 데이터까지 삭제할 수 있었습니다. |
| 해결하려던 문제 | `NODE_ENV=test` 한 조건이나 database 이름에 `test`가 포함된 정도로는 encoded path·search_path option을 안전하게 판별할 수 없었습니다. |
| 핵심 결정 | `resolveTestResetTarget`이 환경, protocol, database name, option count, exact schema pattern을 모두 검사하고 dedicated public test DB 또는 generated isolated schema만 반환하도록 했습니다. |
| 입력 → 상태 전이 → 출력 | env 입력 → 필수값 검증 → URL parse/decoded DB name → options/search_path 해석 → strict allow-list match → 안전 target 반환, 하나라도 어긋나면 throw입니다. |
| ownership / lifetime / cleanup | guard module이 destructive target validation을 소유하고 reset executor는 검증된 target만 받아야 합니다. 아직 DB resource는 만들지 않습니다. |
| failure / rollback / retry | 일반 DB, production env, 여러 options, 임의 schema, ambiguous search_path는 fail-closed합니다. URL이 규칙을 만족해도 실제 server가 test 전용인지 외부에서 증명하지는 못합니다. |
| 보장하는 것 | 실수로 평범한 application DB/public schema를 reset command에 넘기는 주요 경로를 코드 수준에서 차단합니다. |
| 보장하지 않는 것 | DB 권한 오설정, DNS가 다른 server를 가리키는 경우, privileged attacker의 환경 조작까지 보장하지 않습니다. |
| 후속 연결 | `434403a7c16a`가 이 resolver 뒤에 실제 drop/create+migrate를 연결하고 `527b5f137425`가 거부·허용 경계를 검증합니다. |

#### 최소 코드 근거

- `packages/db/src/testReset.ts::resolveTestResetTarget` — dedicated test DB의 `public` 또는 정확한 `test_[a-f0-9]{32}` schema만 허용하고 그 외 URL/option은 모두 거부합니다.

#### 비교 기준

- parent 상태와 `113b3c422192`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `5cac4843fd9b`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `434403a7c16a`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.11. `434403a7c16a` — feat(db): test schema reset과 migration 실행 연결

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `434403a7c16a` |
| Importance | A |
| Tags | PERSISTENCE, RISK |
| Source role | 검증된 test target만 transaction으로 drop/create한 뒤 migration을 다시 적용하는 explicit `reset:test` CLI를 구현합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/testReset.ts`의 `resetTestDatabase`가 resolver를 먼저 호출하는지 확인합니다.
- control URL에서 options를 제거하고 Pool/client를 만든 뒤 `begin`/`drop schema`/`create schema`/`commit` 또는 `rollback`하는 순서를 추적합니다.
- identifier quote helper가 strict resolver 결과만 받는지 확인합니다.
- client release와 pool end가 success/failure 모두에서 실행되는지 확인합니다.
- schema transaction이 끝난 뒤 `migrateDatabase(target.databaseUrl)`가 별도 lifecycle로 실행되는 이유와 실패 상태를 기록합니다.
- `packages/db/src/cli.ts`와 package script의 `reset:test` 연결을 확인합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | 안전 target을 판별할 수 있었지만 실제 reset과 migration 재적용을 일관되게 수행하는 command가 없었습니다. |
| 해결하려던 문제 | 수동 drop/create는 guard를 우회하거나 중간 실패 때 열린 client·부분 schema를 남길 위험이 있었습니다. |
| 핵심 결정 | `reset:test`가 resolver를 통과한 schema를 transaction에서 drop/create하고 자원을 정리한 뒤 같은 target URL로 migration을 실행하도록 했습니다. |
| 입력 → 상태 전이 → 출력 | CLI → target resolve → control Pool/client → BEGIN → quoted schema DROP CASCADE → CREATE → COMMIT → client release/pool end → `migrateDatabase`로 current schema 재구성입니다. |
| ownership / lifetime / cleanup | reset function이 control connection과 transaction cleanup을 소유하고 migrator가 새 schema version 적용을 소유합니다. CLI caller는 explicit invocation만 소유합니다. |
| failure / rollback / retry | DDL 단계 오류면 ROLLBACK 후 자원을 닫습니다. migration은 commit 뒤 별도 단계이므로 migration 실패 시 빈/부분 적용 test schema가 남고 command가 실패합니다. |
| 보장하는 것 | 허용된 test target만 파괴하며 sibling schema를 건드리지 않고 reset 뒤 current migration set을 재적용할 수 있습니다. |
| 보장하지 않는 것 | drop/create와 전체 migration이 하나의 transaction이라는 보장, production target의 물리적 식별, seed 자동 복구는 없습니다. |
| 후속 연결 | `527b5f137425`가 pure guard matrix와 실제 PostgreSQL sibling-schema 보존·readiness를 검증합니다. |

#### 최소 코드 근거

- `packages/db/src/testReset.ts::resetTestDatabase` — 검증된 schema의 `DROP ... CASCADE`와 `CREATE`를 한 transaction에서 수행하고, commit 이후 별도 `migrateDatabase` lifecycle을 실행합니다.

#### 비교 기준

- parent 상태와 `434403a7c16a`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `113b3c422192`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `527b5f137425`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.12. `527b5f137425` — test(db): test database reset guard 검증

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `527b5f137425` |
| Importance | B |
| Tags | PERSISTENCE, TEST |
| Source role | 파괴적 reset의 허용·거부 matrix와 실제 isolated-schema reset 효과를 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/testReset.test.ts`의 non-test env, 일반 DB, ambiguous options, invalid schema 거부 case를 확인합니다.
- dedicated test DB public schema와 generated isolated schema 허용 case를 확인합니다.
- `packages/db/src/postgres.integration.test.ts`의 sibling schema marker, target reset, users table empty, migration readiness current assertion을 추적합니다.
- 시험이 target schema 외 sibling을 보존하는지 direct query로 확인하는 부분을 찾습니다.
- Testcontainers/Docker가 필요한 integration 부분과 pure resolver unit 부분을 구분합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | `113b3c422192`와 `434403a7c16a`가 guard/executor를 구현했지만 allow-list가 너무 넓거나 reset 범위가 잘못돼도 탐지할 시험이 필요했습니다. |
| 해결하려던 문제 | 특히 encoded/복수 option, 평범한 DB 이름, target과 sibling schema의 혼동이 destructive data loss로 이어질 수 있었습니다. |
| 핵심 결정 | pure resolver table test와 PostgreSQL isolated-schema integration test를 함께 추가했습니다. |
| 입력 → 상태 전이 → 출력 | unit: env/URL matrix → resolve success 또는 unsafe rejection; integration: target·sibling schema 생성 → target reset → migration/current 확인 → sibling marker 보존 확인입니다. |
| ownership / lifetime / cleanup | unit test는 문자열 규칙을, integration harness는 schema·pool lifecycle을 소유하고 기존 `withIsolatedDatabase` cleanup을 재사용합니다. |
| failure / rollback / retry | unsafe 입력은 DB 연결 전에 실패합니다. 실제 reset 실패는 command error로 전파되며 test harness가 자원을 정리합니다. |
| 보장하는 것 | 정의된 allow-list가 fail-closed이고 reset이 target schema만 교체한 뒤 migration current 상태를 만든다는 코드를 검증합니다. |
| 보장하지 않는 것 | 실제 production URL 오지정, 권한 escalation, 이 환경에서의 container test 통과는 증명하지 않습니다. |
| 후속 연결 | 이후 test DB reset은 explicit CLI로 유지되며 startup seed removal과 함께 process boot/data mutation 책임을 분리합니다. |

#### Test commit 학습 기록

| 항목 | 기록 |
| --- | --- |
| 검증 대상 불변식 | 파괴적 reset은 test-only allow-list target에만 적용되고 sibling schema를 보존하며 migration current 상태로 끝나야 합니다. |
| 재현한 실패·경계 | non-test env, 일반 DB, 복수/모호 option, invalid schema, 실제 sibling schema가 있는 PostgreSQL입니다. |
| 시험 기법 | pure decision-table unit test와 Testcontainers integration test의 조합입니다. |
| 통과하는 실제 코드 경로 | `resolveTestResetTarget` → `resetTestDatabase` → transaction DDL → `migrateDatabase` → readiness/query입니다. |
| 시험이 증명하는 것 | guard의 주요 거부 조건과 target-only reset·migration 재적용을 코드상 검증합니다. |
| 시험이 증명하지 않는 것 | 물리 server identity, credential compromise, production data restore, 본 세션에서의 실제 실행 성공은 증명하지 않습니다. |
| 막으려는 회귀 | allow-list 완화, schema quote 오류, sibling 삭제, reset 후 migration 누락 회귀를 막습니다. |

#### 비교 기준

- parent 상태와 `527b5f137425`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `434403a7c16a`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.

## 6. 불변식 변화

| 단계 | 관련 SHA | 조사 초점 | 학습자 기록 |
| --- | --- | --- | --- |
| 초기 executable SQL | `1140fb868714` → `dea169d587a3` | SQL asset과 CLI가 만든 최초 실행 경계 및 결합 문제를 기록합니다. | DB package가 초기 SQL을 제공하고 CLI가 이를 호출할 수 있게 됐지만 `migrate`와 `seed`가 모두 `ensureSeedData`를 실행해 schema와 data mutation이 구분되지 않았습니다. |
| Lifecycle 분리 | `f9bb622a1117` → `981ee655559b` | migrator·repository·CLI의 새 책임을 구분합니다. | Kysely Migrator가 versioned schema evolution을, repository가 profile seed를, CLI가 명시적 command dispatch와 resource close를 소유합니다. |
| Readiness 판정 | `30aac132e14e` → `2f05d5d79c64` | connection과 migration-set current 조건을 결합합니다. | DB query 가능성만으로 ready가 되지 않습니다. bundled/applied sequence가 정확히 current일 때만 repository readiness가 성공하고 pending/diverged는 비준비로 노출됩니다. |
| Startup mutation 제거 | `e1a0316fbe84` → `5cac4843fd9b` | process boot와 data initialization 책임 분리를 설명합니다. | API entrypoint는 seed를 만들지 않으며 explicit CLI/test setup이 데이터 준비를 소유합니다. source test는 직접 호출 회귀만 막고 전체 runtime call graph를 증명하지는 않습니다. |
| Destructive reset 보호 | `113b3c422192` → `527b5f137425` | fail-closed target, transaction, migration, sibling 보존을 추적합니다. | strict environment·URL·schema allow-list를 통과한 target만 transaction으로 drop/create되고 migration이 별도로 재적용됩니다. unit matrix와 real-PostgreSQL test가 거부 조건과 target-only effect를 연결합니다. |

## 7. Failure → Fix → Test 관계

| 관계 | Failure / 이전 가정 | Fix / 결정 | Test / 근거 | 학습자 기록 |
| --- | --- | --- | --- | --- |
| 1 | `dea169d587a3`: migrate와 seed가 같은 method를 호출해 schema와 sample data가 함께 변했습니다. | `f9bb622a1117`, `8da6edef28eb`, `981ee655559b`: Migrator·profile seed·CLI command를 분리했습니다. | `c43b87694b29`의 migration/seed idempotence와 profile integration evidence가 후속 보호 역할을 합니다. | 문제는 command 이름이 아니라 ownership 결합이었습니다. schema history는 migrator, 데이터 집합은 repository, 실행 순서는 caller가 소유하도록 나뉩니다. |
| 2 | DB 연결 성공만으로는 pending/diverged schema를 ready로 오인할 수 있었습니다. | `30aac132e14e`가 set 상태를 분류하고 `2f05d5d79c64`가 repository readiness에 포함했습니다. | HTTP health 통합은 operations category에서 검증되며 이 Thread는 repository-level 근거만 고정합니다. | ready는 현재 binary가 기대하는 migration sequence와 DB applied sequence가 맞는 순간의 조건입니다. 미래 availability나 semantic data correctness는 아닙니다. |
| 3 | API startup이 memory fallback을 선택하면 sample data를 암시적으로 생성했습니다. | `e1a0316fbe84`가 startup seed call을 제거했습니다. | `5cac4843fd9b`가 entrypoint direct call pattern을 금지합니다. | process lifecycle과 data initialization을 분리합니다. test는 가벼운 static guard이므로 indirect call까지 보장한다고 해석하면 안 됩니다. |
| 4 | 수동 test reset은 잘못된 URL/schema를 파괴하거나 sibling을 지울 위험이 있었습니다. | `113b3c422192` strict resolver와 `434403a7c16a` explicit reset executor를 추가했습니다. | `527b5f137425`가 거부 matrix와 sibling-schema 보존을 검증합니다. | 검증은 DB 연결 전 fail-closed하며 executor는 검증 결과만 사용합니다. schema replacement와 migration은 별도 lifecycle이므로 migration 실패 시 command 실패 상태가 남을 수 있습니다. |

## 8. Ownership·상태·책임 변화

| 구간 | 이전 소유자/표현 | 이후 소유자/표현 | 관련 SHA | 학습자 기록 |
| --- | --- | --- | --- | --- |
| Schema evolution | repository `ensureSeedData`가 DDL과 data upsert를 함께 소유했습니다. | Kysely Migrator가 version file과 applied state를 소유합니다. | `f9bb622a1117` | repository는 이미 존재하는 schema를 전제로 seed만 수행하며 caller가 migrate-before-seed 순서를 명시합니다. |
| Seed dataset | 하나의 implicit 개발 집합이었습니다. | repository가 development/demo profile별 upsert set을 소유합니다. | `8da6edef28eb` | 환경 선택은 CLI/deployment caller가 소유하고 production startup은 이를 자동으로 실행하지 않습니다. |
| Readiness | API가 concrete DB 상태를 추측해야 했습니다. | repository가 connectivity와 migration current 판단을 소유합니다. | `30aac132e14e`, `2f05d5d79c64` | API는 backend 세부사항 대신 공통 readiness operation을 소비합니다. |
| Startup | composition root가 runtime boot와 seed mutation을 함께 했습니다. | API는 boot/listen만, DB CLI·test fixture가 data initialization을 소유합니다. | `e1a0316fbe84` | 빈 memory state는 허용되는 명시적 결과이며 startup이 sample data로 감추지 않습니다. |
| Test reset | 운영자/시험 코드가 임의 SQL과 URL을 직접 다룰 수 있었습니다. | resolver가 target safety, reset function이 transaction/resource, migrator가 재적용을 소유합니다. | `113b3c422192` → `434403a7c16a` | 각 소유자는 검증·파괴·재구성을 분리하고 error/cleanup 경계를 명시합니다. |

## 9. Thread 최종 상태

최종적으로 schema evolution은 Kysely file migration set과 applied record가, seed는 environment profile을 받는 repository operation이 소유합니다. repository readiness는 연결 성공과 migration set current를 함께 요구하며, API startup은 데이터를 만들지 않습니다. `reset:test`는 strict allow-list target에만 transactional schema replacement를 수행하고 이후 migration을 재적용합니다. 이 설계는 production rollback이나 deployment sequencing 전체를 대신하지 않습니다.

## 10. 최종 실행 흐름

1. 배포·개발 caller가 `migrate` command를 실행하면 Migrator가 bundled SQL 이름과 applied state를 기준으로 pending migration을 적용합니다.
2. 필요한 환경에서만 `seed:dev` 또는 `seed:demo`가 repository를 만들고 profile-specific upsert를 수행한 뒤 `finally`에서 close합니다.
3. API startup은 repository와 application을 구성할 뿐 seed write를 수행하지 않습니다.
4. readiness 요청은 repository에서 connectivity probe와 migration set comparison을 수행하고 current일 때만 성공합니다.
5. test reset은 env/URL/schema allow-list를 먼저 평가해 unsafe target이면 DB 연결 전 종료합니다.
6. 안전 target은 transaction에서 drop/create되고 client/pool이 정리된 뒤 같은 target에 migration이 재적용됩니다.
7. unit/static/integration tests는 각각 resolver matrix, startup direct-call 금지, 실제 schema 격리·sibling 보존을 서로 다른 범위에서 보호합니다.

## 11. 학습 완료 확인

- [x] migration과 seed가 분리돼야 하는 이유를 command 이름이 아니라 state ownership으로 설명할 수 있습니다.
- [x] current, pending, diverged의 차이와 readiness failure 의미를 설명할 수 있습니다.
- [x] startup seed 제거가 만드는 빈 상태와 명시적 initialization 책임을 설명할 수 있습니다.
- [x] source-level startup test의 증거 한계를 과장하지 않습니다.
- [x] reset guard의 exact allow-list, DDL transaction, 별도 migration 단계와 failure state를 설명할 수 있습니다.
- [x] Thread 2의 수정된 commit 순서가 실제 branch chronology와 일치함을 확인했습니다.

## 12. 실행 및 증거 기록

- 저장소 실행 시험: 실행하지 않았습니다.
- 이유: 로컬 `git clone --branch web/ft_transcendence --single-branch`가 DNS 해석 실패(`Could not resolve host: github.com`)로 중단되어 의존성을 포함한 실행 가능한 checkout을 만들 수 없었습니다.
- 코드 근거: 지정 브랜치의 source classification과 각 exact SHA의 GitHub commit diff를 확인했습니다. 따라서 본 문서의 시험 설명은 실제 시험 코드의 정적 검토 결과이며, 이 환경에서의 통과 결과가 아닙니다.
