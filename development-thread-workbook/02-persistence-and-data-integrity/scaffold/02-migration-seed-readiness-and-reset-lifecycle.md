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
| 직전 관련 상태 | <!-- LEARNER:1140fb868714:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:1140fb868714:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:1140fb868714:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:1140fb868714:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:1140fb868714:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:1140fb868714:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:1140fb868714:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:1140fb868714:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:1140fb868714:later --> _(학습자 작성)_ |

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
| 직전 관련 상태 | <!-- LEARNER:dea169d587a3:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:dea169d587a3:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:dea169d587a3:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:dea169d587a3:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:dea169d587a3:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:dea169d587a3:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:dea169d587a3:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:dea169d587a3:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:dea169d587a3:later --> _(학습자 작성)_ |

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
| 직전 관련 상태 | <!-- LEARNER:f9bb622a1117:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:f9bb622a1117:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:f9bb622a1117:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:f9bb622a1117:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:f9bb622a1117:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:f9bb622a1117:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:f9bb622a1117:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:f9bb622a1117:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:f9bb622a1117:later --> _(학습자 작성)_ |

#### 최소 코드 근거

<!-- LEARNER:f9bb622a1117:evidence --> _(학습자 작성)_

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
| 직전 관련 상태 | <!-- LEARNER:8da6edef28eb:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:8da6edef28eb:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:8da6edef28eb:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:8da6edef28eb:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:8da6edef28eb:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:8da6edef28eb:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:8da6edef28eb:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:8da6edef28eb:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:8da6edef28eb:later --> _(학습자 작성)_ |

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
| 직전 관련 상태 | <!-- LEARNER:981ee655559b:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:981ee655559b:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:981ee655559b:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:981ee655559b:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:981ee655559b:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:981ee655559b:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:981ee655559b:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:981ee655559b:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:981ee655559b:later --> _(학습자 작성)_ |

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
| 직전 관련 상태 | <!-- LEARNER:30aac132e14e:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:30aac132e14e:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:30aac132e14e:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:30aac132e14e:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:30aac132e14e:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:30aac132e14e:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:30aac132e14e:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:30aac132e14e:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:30aac132e14e:later --> _(학습자 작성)_ |

#### 최소 코드 근거

<!-- LEARNER:30aac132e14e:evidence --> _(학습자 작성)_

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
| 직전 관련 상태 | <!-- LEARNER:2f05d5d79c64:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:2f05d5d79c64:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:2f05d5d79c64:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:2f05d5d79c64:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:2f05d5d79c64:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:2f05d5d79c64:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:2f05d5d79c64:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:2f05d5d79c64:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:2f05d5d79c64:later --> _(학습자 작성)_ |

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
| 직전 관련 상태 | <!-- LEARNER:e1a0316fbe84:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:e1a0316fbe84:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:e1a0316fbe84:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:e1a0316fbe84:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:e1a0316fbe84:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:e1a0316fbe84:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:e1a0316fbe84:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:e1a0316fbe84:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:e1a0316fbe84:later --> _(학습자 작성)_ |

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
| 직전 관련 상태 | <!-- LEARNER:5cac4843fd9b:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:5cac4843fd9b:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:5cac4843fd9b:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:5cac4843fd9b:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:5cac4843fd9b:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:5cac4843fd9b:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:5cac4843fd9b:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:5cac4843fd9b:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:5cac4843fd9b:later --> _(학습자 작성)_ |

#### Test commit 학습 기록

| 항목 | 기록 |
| --- | --- |
| 검증 대상 불변식 | <!-- LEARNER:5cac4843fd9b:test:invariant --> _(학습자 작성)_ |
| 재현한 실패·경계 | <!-- LEARNER:5cac4843fd9b:test:boundary --> _(학습자 작성)_ |
| 시험 기법 | <!-- LEARNER:5cac4843fd9b:test:technique --> _(학습자 작성)_ |
| 통과하는 실제 코드 경로 | <!-- LEARNER:5cac4843fd9b:test:path --> _(학습자 작성)_ |
| 시험이 증명하는 것 | <!-- LEARNER:5cac4843fd9b:test:proves --> _(학습자 작성)_ |
| 시험이 증명하지 않는 것 | <!-- LEARNER:5cac4843fd9b:test:not_proves --> _(학습자 작성)_ |
| 막으려는 회귀 | <!-- LEARNER:5cac4843fd9b:test:regression --> _(학습자 작성)_ |

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
| 직전 관련 상태 | <!-- LEARNER:113b3c422192:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:113b3c422192:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:113b3c422192:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:113b3c422192:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:113b3c422192:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:113b3c422192:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:113b3c422192:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:113b3c422192:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:113b3c422192:later --> _(학습자 작성)_ |

#### 최소 코드 근거

<!-- LEARNER:113b3c422192:evidence --> _(학습자 작성)_

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
| 직전 관련 상태 | <!-- LEARNER:434403a7c16a:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:434403a7c16a:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:434403a7c16a:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:434403a7c16a:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:434403a7c16a:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:434403a7c16a:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:434403a7c16a:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:434403a7c16a:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:434403a7c16a:later --> _(학습자 작성)_ |

#### 최소 코드 근거

<!-- LEARNER:434403a7c16a:evidence --> _(학습자 작성)_

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
| 직전 관련 상태 | <!-- LEARNER:527b5f137425:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:527b5f137425:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:527b5f137425:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:527b5f137425:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:527b5f137425:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:527b5f137425:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:527b5f137425:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:527b5f137425:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:527b5f137425:later --> _(학습자 작성)_ |

#### Test commit 학습 기록

| 항목 | 기록 |
| --- | --- |
| 검증 대상 불변식 | <!-- LEARNER:527b5f137425:test:invariant --> _(학습자 작성)_ |
| 재현한 실패·경계 | <!-- LEARNER:527b5f137425:test:boundary --> _(학습자 작성)_ |
| 시험 기법 | <!-- LEARNER:527b5f137425:test:technique --> _(학습자 작성)_ |
| 통과하는 실제 코드 경로 | <!-- LEARNER:527b5f137425:test:path --> _(학습자 작성)_ |
| 시험이 증명하는 것 | <!-- LEARNER:527b5f137425:test:proves --> _(학습자 작성)_ |
| 시험이 증명하지 않는 것 | <!-- LEARNER:527b5f137425:test:not_proves --> _(학습자 작성)_ |
| 막으려는 회귀 | <!-- LEARNER:527b5f137425:test:regression --> _(학습자 작성)_ |

#### 비교 기준

- parent 상태와 `527b5f137425`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `434403a7c16a`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.

## 6. 불변식 변화

| 단계 | 관련 SHA | 조사 초점 | 학습자 기록 |
| --- | --- | --- | --- |
| 초기 executable SQL | `1140fb868714` → `dea169d587a3` | SQL asset과 CLI가 만든 최초 실행 경계 및 결합 문제를 기록합니다. | <!-- LEARNER:thread-02:invariant:1 --> _(학습자 작성)_ |
| Lifecycle 분리 | `f9bb622a1117` → `981ee655559b` | migrator·repository·CLI의 새 책임을 구분합니다. | <!-- LEARNER:thread-02:invariant:2 --> _(학습자 작성)_ |
| Readiness 판정 | `30aac132e14e` → `2f05d5d79c64` | connection과 migration-set current 조건을 결합합니다. | <!-- LEARNER:thread-02:invariant:3 --> _(학습자 작성)_ |
| Startup mutation 제거 | `e1a0316fbe84` → `5cac4843fd9b` | process boot와 data initialization 책임 분리를 설명합니다. | <!-- LEARNER:thread-02:invariant:4 --> _(학습자 작성)_ |
| Destructive reset 보호 | `113b3c422192` → `527b5f137425` | fail-closed target, transaction, migration, sibling 보존을 추적합니다. | <!-- LEARNER:thread-02:invariant:5 --> _(학습자 작성)_ |

## 7. Failure → Fix → Test 관계

| 관계 | Failure / 이전 가정 | Fix / 결정 | Test / 근거 | 학습자 기록 |
| --- | --- | --- | --- | --- |
| 1 | `dea169d587a3`: migrate와 seed가 같은 method를 호출해 schema와 sample data가 함께 변했습니다. | `f9bb622a1117`, `8da6edef28eb`, `981ee655559b`: Migrator·profile seed·CLI command를 분리했습니다. | `c43b87694b29`의 migration/seed idempotence와 profile integration evidence가 후속 보호 역할을 합니다. | <!-- LEARNER:thread-02:relation:1 --> _(학습자 작성)_ |
| 2 | DB 연결 성공만으로는 pending/diverged schema를 ready로 오인할 수 있었습니다. | `30aac132e14e`가 set 상태를 분류하고 `2f05d5d79c64`가 repository readiness에 포함했습니다. | HTTP health 통합은 operations category에서 검증되며 이 Thread는 repository-level 근거만 고정합니다. | <!-- LEARNER:thread-02:relation:2 --> _(학습자 작성)_ |
| 3 | API startup이 memory fallback을 선택하면 sample data를 암시적으로 생성했습니다. | `e1a0316fbe84`가 startup seed call을 제거했습니다. | `5cac4843fd9b`가 entrypoint direct call pattern을 금지합니다. | <!-- LEARNER:thread-02:relation:3 --> _(학습자 작성)_ |
| 4 | 수동 test reset은 잘못된 URL/schema를 파괴하거나 sibling을 지울 위험이 있었습니다. | `113b3c422192` strict resolver와 `434403a7c16a` explicit reset executor를 추가했습니다. | `527b5f137425`가 거부 matrix와 sibling-schema 보존을 검증합니다. | <!-- LEARNER:thread-02:relation:4 --> _(학습자 작성)_ |

## 8. Ownership·상태·책임 변화

| 구간 | 이전 소유자/표현 | 이후 소유자/표현 | 관련 SHA | 학습자 기록 |
| --- | --- | --- | --- | --- |
| Schema evolution | repository `ensureSeedData`가 DDL과 data upsert를 함께 소유했습니다. | Kysely Migrator가 version file과 applied state를 소유합니다. | `f9bb622a1117` | <!-- LEARNER:thread-02:ownership:1 --> _(학습자 작성)_ |
| Seed dataset | 하나의 implicit 개발 집합이었습니다. | repository가 development/demo profile별 upsert set을 소유합니다. | `8da6edef28eb` | <!-- LEARNER:thread-02:ownership:2 --> _(학습자 작성)_ |
| Readiness | API가 concrete DB 상태를 추측해야 했습니다. | repository가 connectivity와 migration current 판단을 소유합니다. | `30aac132e14e`, `2f05d5d79c64` | <!-- LEARNER:thread-02:ownership:3 --> _(학습자 작성)_ |
| Startup | composition root가 runtime boot와 seed mutation을 함께 했습니다. | API는 boot/listen만, DB CLI·test fixture가 data initialization을 소유합니다. | `e1a0316fbe84` | <!-- LEARNER:thread-02:ownership:4 --> _(학습자 작성)_ |
| Test reset | 운영자/시험 코드가 임의 SQL과 URL을 직접 다룰 수 있었습니다. | resolver가 target safety, reset function이 transaction/resource, migrator가 재적용을 소유합니다. | `113b3c422192` → `434403a7c16a` | <!-- LEARNER:thread-02:ownership:5 --> _(학습자 작성)_ |

## 9. Thread 최종 상태

<!-- LEARNER:thread-02:final-state --> _(학습자 작성)_

## 10. 최종 실행 흐름

<!-- LEARNER:thread-02:flow --> _(학습자 작성)_

## 11. 학습 완료 확인

- [ ] migration과 seed가 분리돼야 하는 이유를 command 이름이 아니라 state ownership으로 설명할 수 있습니다.
- [ ] current, pending, diverged의 차이와 readiness failure 의미를 설명할 수 있습니다.
- [ ] startup seed 제거가 만드는 빈 상태와 명시적 initialization 책임을 설명할 수 있습니다.
- [ ] source-level startup test의 증거 한계를 과장하지 않습니다.
- [ ] reset guard의 exact allow-list, DDL transaction, 별도 migration 단계와 failure state를 설명할 수 있습니다.
- [ ] Thread 2의 수정된 commit 순서가 실제 branch chronology와 일치함을 확인했습니다.

## 12. 실행 및 증거 기록

<!-- LEARNER:thread-02:execution --> _(학습자 작성)_
