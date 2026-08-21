# Development Thread 01 — Repository 추상화·backend parity·read model

## 1. 학습 목표

- 초기 relational schema가 typed row mapper와 `AppRepository`로 감싸지는 과정을 exact SHA 순서로 재구성합니다.
- PostgreSQL과 memory 구현의 공통 surface와 실제로 남아 있던 의미 차이를 구분합니다.
- recent match·dashboard read model의 잘못된 파생 지표가 fix와 regression test로 닫히는 관계를 설명합니다.
- memory behavioral test와 실제 PostgreSQL integration harness가 서로 무엇을 증명하고 무엇을 증명하지 않는지 구분합니다.

## 2. 범위와 경계

- 포함: 초기 DB schema, user/session row mapping, repository lifecycle, seed/upsert, profile·leaderboard·recent-match·dashboard read model, backend test evidence.
- 포함: `bestStreak`의 fabricated 구현을 고친 `035b97ca7c58`과 regression `6b661420e060`.
- 포함: PostgreSQL integration command/dependency `e935054ce0c9`과 harness `c43b87694b29`.
- 제외: session security, match-result atomic finalization, chat persistence, tournament progression, admin audit atomicity는 독립 Thread/카테고리에서 다룹니다.
- 제외: 실제 WebSocket presence는 persistence user list가 아니라 realtime authority로 이동하므로 이 Thread의 parity 결론으로 일반화하지 않습니다.

## 3. 핵심 질문

- `AppRepository`가 concrete backend 자원과 API caller 사이에서 어떤 lifetime을 소유합니까?
- compile-time row type, row mapper, repository method는 각각 어떤 오류를 막고 어떤 오류는 막지 못합니까?
- memory와 PostgreSQL이 같은 interface를 구현해도 왜 동일한 의미를 자동으로 보장하지 않습니까?
- recent-match newest-first 순서에서 실제 최고 연승을 계산하려면 왜 reverse와 loss reset이 모두 필요합니까?
- unit/behavioral test와 Testcontainers integration test의 증거 범위는 어떻게 다릅니까?

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags |
| ---: | --- | --- | :---: | --- |
| 1 | `0e850d24406e` | `feat(db): 초기 PostgreSQL schema 정의` | B | PERSISTENCE, TOURNAMENT |
| 2 | `4aa060c0b8df` | `feat(db): 사용자와 세션 row schema 정의` | B | AUTH, PERSISTENCE |
| 3 | `9277572765e7` | `feat(db): 저장소 lifecycle 구성` | B | PERSISTENCE, OPERATIONS |
| 4 | `fb516f723cdf` | `feat(db): 개발 사용자 seed 저장 구현` | B | PERSISTENCE |
| 5 | `c5b96a06925c` | `feat(db): 프로필 조회와 변경 저장 구현` | B | PERSISTENCE |
| 6 | `0364c42f776b` | `feat(db): 순위 조회 구현` | B | PERSISTENCE |
| 7 | `8ab49e5f2dd4` | `feat(db): 경기 조회 row contract 정의` | B | PERSISTENCE |
| 8 | `c7ea1ff241c8` | `feat(db): 최근 경기와 대시보드 조회 구현` | B | PERSISTENCE |
| 9 | `6509e32ba95d` | `test(db): 메모리 저장소 흐름 검증` | B | PERSISTENCE, TOURNAMENT, TEST |
| 10 | `035b97ca7c58` | `fix(db): 최근 경기에서 최고 연승 계산` | B | PERSISTENCE |
| 11 | `6b661420e060` | `test(db): 최고 연승 계산 검증` | B | PERSISTENCE, TEST |
| 12 | `e935054ce0c9` | `build(db): PostgreSQL integration 의존성과 명령 추가` | B | PERSISTENCE |
| 13 | `c43b87694b29` | `test(db): PostgreSQL integration 환경과 계약 추가` | A | PERSISTENCE, RISK, TEST |

## 5. Commit별 조사

### 5.1. `0e850d24406e` — feat(db): 초기 PostgreSQL schema 정의

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `0e850d24406e` |
| Importance | B |
| Tags | PERSISTENCE, TOURNAMENT |
| Source role | 사용자·세션·친구·경기·채팅·토너먼트·관리 작업의 최초 durable relational model을 정의합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/migrations/001_initial.sql`의 `pgcrypto` extension, 각 `create table`, 기본값과 nullable column을 확인합니다.
- `sessions`, `friendships`, `tournament_entries`의 foreign key와 `on delete cascade`가 어떤 row lifetime을 묶는지 추적합니다.
- `friendships(requester_id, addressee_id)`와 `tournament_entries(tournament_id, user_id)`의 초기 방향성 unique 제약을 확인합니다.
- `matches_ended_at_idx`, `chat_scope_created_at_idx`가 지원하려는 실제 조회 순서를 확인합니다.
- self-friend, canonical pair, tournament capacity·seed uniqueness, status enum이 아직 DB 제약으로 강제되지 않는다는 점을 기록합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | DB workspace는 있었지만 애플리케이션 상태를 보존할 PostgreSQL table과 관계가 없었습니다. |
| 해결하려던 문제 | 사용자·인증·사회 관계·경기 결과·토너먼트를 프로세스 재시작 뒤에도 식별하고 연결할 durable schema가 필요했습니다. |
| 핵심 결정 | `001_initial.sql` 한 migration에서 UUID 기본키, timestamp 기본값, foreign key, 초기 unique/index를 함께 선언했습니다. |
| 입력 → 상태 전이 → 출력 | migration 실행 → extension과 table 생성 → FK·unique·조회 index 설치 → 이후 repository가 동일 row를 읽고 씁니다. |
| ownership / lifetime / cleanup | PostgreSQL이 UUID·생성 시각·관계 row의 lifetime을 소유합니다. `sessions`와 참가 row는 부모 삭제 시 cascade되고, 애플리케이션은 아직 cleanup을 직접 조정하지 않습니다. |
| failure / rollback / retry | DDL 적용 중 오류가 나면 migration 실행이 실패합니다. 이 SHA 자체에는 기존 데이터 정규화, 재시도 정책, down migration이 없습니다. |
| 보장하는 것 | 핵심 엔터티와 참조 관계, 동일 방향 friendship 및 동일 tournament/user 중복 방지, 최근 경기·채팅 조회용 index를 제공합니다. |
| 보장하지 않는 것 | unordered friendship identity, 자기 자신과의 friendship 금지, tournament seed/capacity, status 값의 유효 범위, 경기 결과 idempotency는 보장하지 않습니다. |
| 후속 연결 | `4aa060c0b8df`가 row 타입과 mapper를 추가하고, `ffb0a8275a4f`·`3aa5958bb967`가 뒤늦게 데이터 무결성 제약을 보강합니다. |

#### 비교 기준

- parent 상태와 `0e850d24406e`의 diff를 먼저 비교합니다.
- 후속 관련 SHA `4aa060c0b8df`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.2. `4aa060c0b8df` — feat(db): 사용자와 세션 row schema 정의

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `4aa060c0b8df` |
| Importance | B |
| Tags | AUTH, PERSISTENCE |
| Source role | 초기 SQL column을 Kysely row type과 public/session model 변환 함수로 연결합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/schema.ts`의 `UserTable`, `SessionTable`, `Database`, `UserRow`, `UserProjectionRow`를 SQL column과 대조합니다.
- `packages/db/src/rowMappers.ts`의 `toPublicUser`, `toSessionUser`가 snake_case를 camelCase로 바꾸고 어떤 column을 제외하는지 확인합니다.
- `Generated`, nullable `email`·`banned_at`, `Date`와 숫자 변환이 compile-time에서 어떻게 표현되는지 확인합니다.
- `online`이 row column이 아니라 mapper 인수라는 점과 public projection에서 email이 빠지는 이유를 기록합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | `001_initial.sql`에는 column이 있었지만 TypeScript query 결과와 shared DTO 사이에 명시된 변환 지점이 없었습니다. |
| 해결하려던 문제 | SQL 이름과 애플리케이션 이름이 섞이고, public 응답이 email·내부 column을 우발적으로 노출할 위험이 있었습니다. |
| 핵심 결정 | Kysely table interface와 `Selectable` row type을 만들고 `toPublicUser`·`toSessionUser`를 유일한 초기 변환 지점으로 두었습니다. |
| 입력 → 상태 전이 → 출력 | `users` row → `UserProjectionRow` → `toPublicUser(online)` → public user, 또는 email을 더한 `SessionUser`로 변환됩니다. |
| ownership / lifetime / cleanup | DB driver가 row lifetime을 소유하고 mapper는 새 DTO 값을 반환합니다. `online` 상태는 저장 row가 아니라 호출자가 제공하는 일시적 정보입니다. |
| failure / rollback / retry | mapper는 입력을 runtime 검증하지 않습니다. 잘못된 driver shape나 유효하지 않은 enum은 TypeScript 타입만으로 실행 중 차단되지 않습니다. |
| 보장하는 것 | column 이름과 API 이름을 분리하고 public/session projection의 노출 범위를 compile-time에 고정합니다. |
| 보장하지 않는 것 | query 실행, repository lifecycle, backend parity, runtime schema validation은 아직 제공하지 않습니다. |
| 후속 연결 | `9277572765e7`가 이 타입을 사용하는 repository lifecycle을 만들고, Thread 3의 row-schema refactor가 projection을 canonical 형태로 정렬합니다. |

#### 비교 기준

- parent 상태와 `4aa060c0b8df`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `0e850d24406e`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `9277572765e7`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.3. `9277572765e7` — feat(db): 저장소 lifecycle 구성

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `9277572765e7` |
| Importance | B |
| Tags | PERSISTENCE, OPERATIONS |
| Source role | `AppRepository`와 PostgreSQL/memory factory를 통해 저장소 생성·종료 책임을 API에서 분리합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.ts`의 `AppRepository`, `createPostgresRepository`, `createMemoryRepository`를 확인합니다.
- PostgreSQL factory가 `Pool`, `Kysely`, dialect를 어떤 순서로 만들고 closure가 무엇을 포획하는지 추적합니다.
- `PostgresRepository.close()`의 `db.destroy()`와 `pool.end()` 순서 및 오류 처리 범위를 확인합니다.
- 이 시점의 interface가 `close`, `ensureSeedData`만 포함하고 기능 parity를 아직 강제하지 않는다는 점을 확인합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | migration SQL과 row mapper는 있었지만 호출자가 Pool/Kysely 생성과 종료를 직접 알아야 했습니다. |
| 해결하려던 문제 | API가 concrete database 자원에 결합되면 memory test double을 같은 호출 계약으로 사용할 수 없고 종료 누락 위험도 커집니다. |
| 핵심 결정 | `AppRepository` interface와 두 factory를 도입해 backend 선택과 자원 구성을 factory 내부로 숨겼습니다. |
| 입력 → 상태 전이 → 출력 | `databaseUrl` → `Pool`/`Kysely` 생성 → `PostgresRepository` 반환 → 호출 종료 시 `close()`가 database 자원을 해제합니다. memory factory는 외부 자원 없는 구현을 반환합니다. |
| ownership / lifetime / cleanup | PostgreSQL repository가 Kysely와 Pool을 소유하며 repository를 만든 호출자가 `close()` 호출 책임을 가집니다. memory repository는 소유할 외부 handle이 없습니다. |
| failure / rollback / retry | 생성 뒤 호출자가 `close()`를 누락하면 pool lifetime이 남습니다. 이 SHA에는 공통 `try/finally` composition root나 운영 readiness가 없습니다. |
| 보장하는 것 | 호출자는 concrete backend를 몰라도 동일 lifecycle method를 사용하고, test에서 memory 구현으로 교체할 수 있습니다. |
| 보장하지 않는 것 | interface가 데이터 동작의 의미적 parity를 증명하지는 않으며, `ensureSeedData`가 schema migration과 seed를 아직 함께 취급합니다. |
| 후속 연결 | `fb516f723cdf`부터 실제 repository operation이 추가되고, Thread 2의 `f9bb622a1117`가 migration과 seed ownership을 분리합니다. |

#### 비교 기준

- parent 상태와 `9277572765e7`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `4aa060c0b8df`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `fb516f723cdf`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.4. `fb516f723cdf` — feat(db): 개발 사용자 seed 저장 구현

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `fb516f723cdf` |
| Importance | B |
| Tags | PERSISTENCE |
| Source role | 개발용 identity seed와 handle 기반 upsert를 PostgreSQL·memory 구현에 함께 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.ts`의 `DevLoginInput`, 두 backend의 `ensureSeedData`, `upsertDevUser`를 비교합니다.
- PostgreSQL `insert ... on conflict (handle) do update ... returning *`가 갱신하는 column과 유지하는 identity를 확인합니다.
- `normalizeHandle`, deterministic email/display/avatar 생성과 고정 seed 목록을 확인합니다.
- memory `Map`의 key/value, UUID 생성, seed 반복 실행 시 중복 여부를 PostgreSQL 동작과 비교합니다.
- 전체 seed가 하나의 transaction으로 묶이지 않는다는 점을 failure 범위에 기록합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | repository는 생성·종료만 지원했고 로컬 로그인이나 read model을 확인할 사용자 데이터가 없었습니다. |
| 해결하려던 문제 | 반복 가능한 개발 환경과 같은 handle로 재로그인할 때 동일 사용자를 갱신하는 identity 규칙이 필요했습니다. |
| 핵심 결정 | handle을 정규화한 뒤 PostgreSQL은 upsert하고 memory는 canonical map을 조회·갱신하며, `ensureSeedData`가 고정 개발 사용자를 준비합니다. |
| 입력 → 상태 전이 → 출력 | 개발 입력 → handle 정규화 → 기존 row/map 검색 → insert 또는 update → mapper를 거친 session user 반환입니다. |
| ownership / lifetime / cleanup | PostgreSQL row는 DB가, memory user는 repository의 `Map`이 소유합니다. 반환값은 projection이며 repository 종료 전까지 memory 원본이 유지됩니다. |
| failure / rollback / retry | 개별 upsert는 idempotent하지만 seed 전체가 하나의 transaction은 아닙니다. 중간 실패 후 재실행으로 수렴할 수는 있어도 이 SHA가 all-or-nothing을 보장하지 않습니다. |
| 보장하는 것 | 동일 handle 재실행이 새 identity를 무한 생성하지 않고 두 backend에서 개발 로그인 입력을 처리할 수 있습니다. |
| 보장하지 않는 것 | production에서 자동 seed가 안전하다는 보장, profile별 데이터 분리, 역할 부여의 보안성, 두 backend의 모든 정렬·limit parity는 없습니다. |
| 후속 연결 | Thread 2의 `8da6edef28eb`가 seed profile을 나누고 `e1a0316fbe84`가 API startup의 암시적 seed를 제거합니다. |

#### 비교 기준

- parent 상태와 `fb516f723cdf`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `9277572765e7`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `c5b96a06925c`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.5. `c5b96a06925c` — feat(db): 프로필 조회와 변경 저장 구현

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `c5b96a06925c` |
| Importance | B |
| Tags | PERSISTENCE |
| Source role | identity 저장소를 profile lookup/update와 사용자 목록 read model로 확장합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `AppRepository`에 추가된 `getUserById`, `getUserByHandle`, `updateProfile`, `listOnlineUsers` signature를 확인합니다.
- PostgreSQL `update ... returning *`와 update 전 사용자 조회의 failure path를 확인합니다.
- PostgreSQL `status = 'active'`, rating 정렬, `limit 12`와 memory 구현의 filter/limit 차이를 비교합니다.
- public mapper가 email을 제외하고 `online`을 어떤 값으로 채우는지 확인합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | 개발 로그인은 가능했지만 다른 사용자를 조회하거나 자기 표시 이름·avatar를 갱신할 repository operation이 없었습니다. |
| 해결하려던 문제 | HTTP profile·lobby가 persistence 내부 SQL을 직접 작성하지 않고 identity-bound read/write를 수행해야 했습니다. |
| 핵심 결정 | ID/handle lookup, profile update, active-user 목록을 `AppRepository`에 올리고 두 backend에 구현했습니다. |
| 입력 → 상태 전이 → 출력 | 식별자 또는 handle → row 검색 → public projection 반환; profile patch → 대상 확인 → row/map 변경 → 갱신 projection 반환입니다. |
| ownership / lifetime / cleanup | repository가 원본 row/map 변경을 소유하고 호출자는 반환 projection만 소비합니다. memory update는 저장된 객체를 직접 바꿉니다. |
| failure / rollback / retry | 대상이 없으면 명시적 오류를 던집니다. 이 SHA에서 PostgreSQL은 active·limit 12를 적용하지만 memory 목록은 같은 filter/limit를 완전히 재현하지 않습니다. |
| 보장하는 것 | profile 접근과 변경이 repository 경계에 모이고 SQL column이 API route로 직접 새지 않습니다. |
| 보장하지 않는 것 | 실제 WebSocket presence, 두 backend의 완전한 목록 parity, optimistic concurrency, runtime 입력 검증은 보장하지 않습니다. |
| 후속 연결 | `0364c42f776b`·`c7ea1ff241c8`가 read model을 확장하고, 실제 online authority는 이후 realtime subsystem으로 이동합니다. |

#### 비교 기준

- parent 상태와 `c5b96a06925c`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `fb516f723cdf`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `0364c42f776b`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.6. `0364c42f776b` — feat(db): 순위 조회 구현

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `0364c42f776b` |
| Importance | B |
| Tags | PERSISTENCE |
| Source role | rating과 승수에서 leaderboard projection을 계산하는 repository read model을 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 두 backend의 `listLeaderboard()` 정렬 key, limit, `rank` 생성 방식을 비교합니다.
- `percentage(wins, losses)`의 zero-total 처리와 소수점 한 자리 반올림을 확인합니다.
- PostgreSQL `order by rating desc, wins desc limit 20`과 memory sort의 동점·limit 차이를 기록합니다.
- `LeaderboardEntry`로 변환할 때 public user와 계산 field의 소유 위치를 확인합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | profile 목록은 있었지만 순위, 승률, 표시 순서를 일관된 DTO로 제공하지 못했습니다. |
| 해결하려던 문제 | UI가 backend별 raw users를 받아 자체 정렬·계산하면 PostgreSQL과 memory 결과가 갈라질 수 있었습니다. |
| 핵심 결정 | `listLeaderboard()`가 rating·wins 순으로 정렬하고 rank와 승률을 repository에서 계산하도록 했습니다. |
| 입력 → 상태 전이 → 출력 | 사용자 row 집합 → rating/wins 정렬 → index 기반 rank와 `percentage` 계산 → leaderboard entry 배열입니다. |
| ownership / lifetime / cleanup | 저장된 rating/wins는 repository가 소유하고, rank/winRate는 호출 시 생성되는 read-model 값입니다. |
| failure / rollback / retry | 빈 전적은 0%로 처리합니다. 동점의 추가 deterministic key와 memory의 `limit 20` parity는 이 SHA에서 완전하지 않습니다. |
| 보장하는 것 | leaderboard 계산 위치와 기본 정렬 규칙이 두 backend 계약에 포함됩니다. |
| 보장하지 않는 것 | rating 변경의 atomicity, 전체 시즌 범위, 안정적인 동점 순서, pagination은 보장하지 않습니다. |
| 후속 연결 | `6509e32ba95d`가 memory 흐름에서 결과를 간접 확인하고, rating finalization 자체는 별도의 persistence story에서 강화됩니다. |

#### 비교 기준

- parent 상태와 `0364c42f776b`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `c5b96a06925c`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `8ab49e5f2dd4`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.7. `8ab49e5f2dd4` — feat(db): 경기 조회 row contract 정의

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `8ab49e5f2dd4` |
| Importance | B |
| Tags | PERSISTENCE |
| Source role | persisted match와 joined handle을 `MatchSummary`로 바꾸는 typed row boundary를 정의합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/schema.ts`의 `MatchTable`, `MatchRow`, `MatchWithHandlesRow`를 initial SQL과 대조합니다.
- `packages/db/src/rowMappers.ts`의 `toMatchSummary(row, userId)`가 승패와 상대 handle을 어떻게 결정하는지 확인합니다.
- loser의 `ratingDelta`가 `-12`, AI 상대가 문자열 `AI`로 표현되는 초기 가정을 기록합니다.
- `ended_at.toISOString()`과 nullable winner/loser 처리 경계를 확인합니다.
- 이 SHA에는 실제 recent-match query가 아직 없다는 점을 분리해서 기록합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | `matches` table은 존재했지만 joined query 결과와 공개 경기 요약 사이에 타입·변환 계약이 없었습니다. |
| 해결하려던 문제 | viewer-relative 승패, 상대 식별, timestamp 형식을 각 caller가 임의로 계산하면 read model이 일관되지 않습니다. |
| 핵심 결정 | `MatchTable`·`MatchWithHandlesRow`와 `toMatchSummary`를 추가해 DB row에서 `MatchSummary`로의 변환을 고정했습니다. |
| 입력 → 상태 전이 → 출력 | match row + winner/loser handle + 선택적 viewer ID → 상대/승패/rating delta 계산 → ISO timestamp를 가진 summary입니다. |
| ownership / lifetime / cleanup | DB가 raw match를 소유하고 mapper가 일회성 public summary를 소유합니다. viewer ID는 저장 상태를 바꾸지 않습니다. |
| failure / rollback / retry | nullable participant는 AI fallback으로 처리됩니다. 실제 query가 잘못된 join shape를 반환하면 mapper 자체는 runtime 검증하지 않습니다. |
| 보장하는 것 | 경기 row의 snake_case와 공개 summary의 camelCase·viewer-relative 의미를 한 함수에 모읍니다. |
| 보장하지 않는 것 | 최근 경기 범위, 정렬, dashboard 구성, 실제 rating history 기반 delta는 아직 보장하지 않습니다. |
| 후속 연결 | `c7ea1ff241c8`가 query와 dashboard를 연결하고 Thread 3의 row-mapper test가 이 변환을 직접 고정합니다. |

#### 비교 기준

- parent 상태와 `8ab49e5f2dd4`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `0364c42f776b`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `c7ea1ff241c8`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.8. `c7ea1ff241c8` — feat(db): 최근 경기와 대시보드 조회 구현

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `c7ea1ff241c8` |
| Importance | B |
| Tags | PERSISTENCE |
| Source role | recent-match query와 dashboard aggregate를 두 backend에 처음 연결합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `PostgresRepository.listRecentMatches`의 winner/loser join, 선택적 participant filter, `ended_at desc limit 8`을 확인합니다.
- `MemoryRepository.listRecentMatches`의 filter, tail/reverse 처리와 `memoryMatchSummary`를 비교합니다.
- 두 `getDashboard`가 profile, recent matches, win rate, `bestStreak`를 어떻게 조립하는지 확인합니다.
- PostgreSQL의 임의 수식과 memory 상수로 만든 `bestStreak`가 실제 match sequence에서 파생되지 않는 결함을 명시합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | match mapper는 있었지만 query와 dashboard aggregate가 없었고, UI가 profile과 경기 목록을 따로 조립해야 했습니다. |
| 해결하려던 문제 | viewer-scoped 최근 경기와 요약 지표를 한 repository read operation으로 제공해야 했습니다. |
| 핵심 결정 | PostgreSQL은 participant 조건이 있는 join query, memory는 저장 배열 filter를 사용하고 둘 다 최근 8개를 역시간순으로 반환하도록 했습니다. |
| 입력 → 상태 전이 → 출력 | `userId` → 사용자 조회 → 최근 경기 8개 → win rate와 bestStreak 계산 → `DashboardSummary` 반환입니다. |
| ownership / lifetime / cleanup | repository가 query와 aggregate 조립을 소유합니다. 반환 배열은 read model이며 underlying rows/map의 lifetime과 분리됩니다. |
| failure / rollback / retry | 사용자가 없으면 실패합니다. `bestStreak`는 PostgreSQL의 `wins-losses+3` 수식과 memory 상수 3이라 실제 sequence와 무관합니다. |
| 보장하는 것 | 최근 경기 정렬·limit와 dashboard 조립 위치가 공통 interface에 들어갑니다. |
| 보장하지 않는 것 | 이 SHA만으로 backend parity나 실제 최고 연승의 정확성은 보장하지 않습니다. optional SQL fragment도 이후 명시적 두 query로 정리됩니다. |
| 후속 연결 | `035b97ca7c58`가 실제 경기 순서에서 streak를 계산하고 `6b661420e060`이 회귀를 고정합니다. |

#### 비교 기준

- parent 상태와 `c7ea1ff241c8`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `8ab49e5f2dd4`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `6509e32ba95d`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.9. `6509e32ba95d` — test(db): 메모리 저장소 흐름 검증

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `6509e32ba95d` |
| Importance | B |
| Tags | PERSISTENCE, TOURNAMENT, TEST |
| Source role | memory backend의 주요 repository operation이 한 계약으로 조합되는지 초기 행동 시험을 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.test.ts`의 seed·upsert·session·match·dashboard 시나리오를 순서대로 추적합니다.
- friendship과 tournament 생성·참가 시나리오가 당시의 단순 memory 표현을 어떤 기대값으로 고정하는지 확인합니다.
- 시험이 `createMemoryRepository()`만 사용하며 PostgreSQL·concurrency·resource close를 실행하지 않는다는 점을 분리합니다.
- assertion이 개별 mapper보다 public repository output을 관찰한다는 점을 확인합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | 두 backend에 operation이 늘었지만 memory 구현의 기본 흐름을 실행하는 회귀 시험이 없었습니다. |
| 해결하려던 문제 | seed 이후 identity/session/match/dashboard 및 social/tournament method가 함께 호출될 때 계약이 깨지지 않는지 확인해야 했습니다. |
| 핵심 결정 | Vitest에서 public `AppRepository` method만 호출하는 memory behavioral test를 추가했습니다. |
| 입력 → 상태 전이 → 출력 | memory repository 생성 → seed/upsert → session과 match 생성 → dashboard 조회, 별도 friendship·tournament 흐름 → public 결과 assertion입니다. |
| ownership / lifetime / cleanup | 각 test가 repository를 지역 소유하며 외부 자원 cleanup은 필요 없습니다. 내부 Map/배열은 repository lifetime 동안 유지됩니다. |
| failure / rollback / retry | 동기적 memory 구현이라 DB 오류·transaction rollback·실제 병렬 경쟁 상태는 재현하지 않습니다. |
| 보장하는 것 | 초기 common interface가 호출 가능한 상태이고 핵심 happy path의 결과 shape가 유지됨을 보여 줍니다. |
| 보장하지 않는 것 | PostgreSQL schema/migration, SQL mapper, pool cleanup, 실제 concurrency나 backend parity 전체를 증명하지 않습니다. |
| 후속 연결 | `e935054ce0c9`·`c43b87694b29`가 실제 PostgreSQL integration 환경과 lifecycle evidence를 추가합니다. |

#### Test commit 학습 기록

| 항목 | 기록 |
| --- | --- |
| 검증 대상 불변식 | memory repository의 공통 operation이 순서대로 조합되고 public DTO를 반환한다는 계약입니다. |
| 재현한 실패·경계 | 비어 있는 memory 상태에서 seed 후 사용자·세션·경기·dashboard, friendship·tournament를 생성하는 초기 경계입니다. |
| 시험 기법 | 외부 의존성 없는 behavioral integration test입니다. |
| 통과하는 실제 코드 경로 | `createMemoryRepository` → `ensureSeedData`/`upsertDevUser`/session·match·dashboard 및 social/tournament methods입니다. |
| 시험이 증명하는 것 | memory backend의 해당 happy path와 method surface가 작동함을 증명합니다. |
| 시험이 증명하지 않는 것 | PostgreSQL SQL, transaction, migration, pool lifecycle, 다중 요청 경쟁 상태는 증명하지 않습니다. |
| 막으려는 회귀 | repository method 추가·refactor 중 memory happy path와 반환 shape가 조용히 깨지는 회귀를 막습니다. |

#### 비교 기준

- parent 상태와 `6509e32ba95d`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `c7ea1ff241c8`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `035b97ca7c58`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.10. `035b97ca7c58` — fix(db): 최근 경기에서 최고 연승 계산

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `035b97ca7c58` |
| Importance | B |
| Tags | PERSISTENCE |
| Source role | backend별 가짜 `bestStreak`를 실제 recent-match sequence에서 계산하는 공통 함수로 교체합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.ts`에서 PostgreSQL 수식과 memory 상수가 제거된 parent diff를 확인합니다.
- `bestWinningStreak(matches)`가 역시간순 recent list를 복사·reverse하여 시간순으로 순회하는 이유를 확인합니다.
- win에서 current/best를 증가시키고 loss에서 current를 0으로 되돌리는 상태 전이를 추적합니다.
- 계산 범위가 전체 이력이 아니라 `listRecentMatches`가 반환한 최대 8경기라는 non-guarantee를 기록합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | `c7ea1ff241c8`은 PostgreSQL에서 임의 수식, memory에서 상수 3을 반환해 동일 경기 이력도 실제 연승과 무관했습니다. |
| 해결하려던 문제 | dashboard가 persistence evidence가 아닌 fabricated metric을 표시하고 backend마다 다른 값을 낼 수 있었습니다. |
| 핵심 결정 | 두 backend가 같은 `bestWinningStreak(recentMatches)`를 호출하도록 하고 역시간순 배열을 시간순으로 순회하는 작은 상태 계산기를 추가했습니다. |
| 입력 → 상태 전이 → 출력 | 최근 경기 newest-first 배열 복사 → reverse → win이면 current 증가·best 갱신, loss면 current=0 → best 반환입니다. |
| ownership / lifetime / cleanup | 원본 `recentMatches` 배열은 spread로 복사해 변형하지 않습니다. 계산 함수가 파생 지표를 소유하고 repository는 결과만 dashboard에 넣습니다. |
| failure / rollback / retry | 빈 배열은 0을 반환합니다. `draw` 같은 값은 현재 `MatchSummary.result` domain에 없으며, 경기 목록 조회 실패는 상위로 전파됩니다. |
| 보장하는 것 | PostgreSQL과 memory가 동일한 실제 match-result sequence에서 같은 최고 연승을 계산합니다. |
| 보장하지 않는 것 | 최대 8개 최근 경기 밖의 더 긴 연승, 시즌 전체 지표, DB-side 계산은 보장하지 않습니다. |
| 후속 연결 | `6b661420e060`이 win/loss reset과 ordering을 deterministic memory regression으로 검증합니다. |

#### 최소 코드 근거

- `packages/db/src/index.ts::bestWinningStreak` — `[...matches].reverse()`로 newest-first read model을 chronological order로 바꾼 뒤 loss에서 연속값을 초기화합니다.

#### 비교 기준

- parent 상태와 `035b97ca7c58`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `6509e32ba95d`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `6b661420e060`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.11. `6b661420e060` — test(db): 최고 연승 계산 검증

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `6b661420e060` |
| Importance | B |
| Tags | PERSISTENCE, TEST |
| Source role | `bestWinningStreak`의 order와 loss reset을 public dashboard 경로에서 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.test.ts`의 `derives the best streak from recent match results` 시나리오를 확인합니다.
- 생성 순서 `win → loss → win → win`과 조회 결과 `win, win, loss, win`의 reverse chronology를 대조합니다.
- `dashboard.bestStreak === 2`가 loss reset과 newest-first 처리 둘 다 필요로 한다는 점을 설명합니다.
- 시험이 memory backend만 실행하며 8경기 window 밖의 streak는 다루지 않는다는 점을 기록합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | `035b97ca7c58`가 계산기를 추가했지만 역순 처리나 loss reset이 다시 깨져도 이를 탐지할 집중 시험이 없었습니다. |
| 해결하려던 문제 | recent list가 newest-first이므로 단순 순회하면 시간 방향을 잘못 해석할 수 있고, loss 뒤 current를 초기화하지 않으면 3으로 계산될 수 있었습니다. |
| 핵심 결정 | 실제 repository로 네 경기 결과를 저장하고 dashboard의 경기 순서와 `bestStreak`를 함께 assertion했습니다. |
| 입력 → 상태 전이 → 출력 | seed·두 사용자 생성 → 네 경기 저장 → dashboard 조회 → 결과 배열이 newest-first인지 확인 → 최고 연승 2 확인입니다. |
| ownership / lifetime / cleanup | 시험 repository가 저장 순서와 파생 지표 계산을 소유하며 test 종료 뒤 memory state는 폐기됩니다. |
| failure / rollback / retry | 외부 오류나 retry는 주입하지 않습니다. assertion 실패가 계산·정렬 회귀를 직접 드러냅니다. |
| 보장하는 것 | public dashboard 경로에서 order 변환과 loss reset이 결합되어 기대값 2를 만든다는 것을 증명합니다. |
| 보장하지 않는 것 | PostgreSQL query 자체, 8개를 넘는 history, 전체 시즌 streak는 증명하지 않습니다. |
| 후속 연결 | 후속 row-mapping·query refactor가 dashboard 의미를 바꾸지 않도록 보호합니다. |

#### Test commit 학습 기록

| 항목 | 기록 |
| --- | --- |
| 검증 대상 불변식 | recent-match ordering을 chronological streak 계산으로 바꾸고 loss에서 연속 승리를 끊는 불변식입니다. |
| 재현한 실패·경계 | newest-first 조회와 `win → loss → win → win` 저장 순서의 조합입니다. |
| 시험 기법 | memory repository를 통과하는 deterministic regression test입니다. |
| 통과하는 실제 코드 경로 | `createMatch` → `listRecentMatches` → `getDashboard` → `bestWinningStreak`입니다. |
| 시험이 증명하는 것 | 결과 순서와 최고 연승 2를 함께 확인하므로 역순·reset 두 조건을 검증합니다. |
| 시험이 증명하지 않는 것 | PostgreSQL 실행 계획, 전체 history 범위, concurrent match write는 증명하지 않습니다. |
| 막으려는 회귀 | fabricated constant/수식으로 되돌아가거나 recent 배열 방향을 잘못 순회하는 회귀를 막습니다. |

#### 비교 기준

- parent 상태와 `6b661420e060`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `035b97ca7c58`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `e935054ce0c9`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.12. `e935054ce0c9` — build(db): PostgreSQL integration 의존성과 명령 추가

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `e935054ce0c9` |
| Importance | B |
| Tags | PERSISTENCE |
| Source role | unit suite와 실제 PostgreSQL integration suite를 분리하고 Testcontainers 실행 경계를 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- root `package.json`의 `postgres-integration` script가 DB package command에 위임하는지 확인합니다.
- `packages/db/package.json`의 unit exclude pattern과 integration Vitest command의 timeout·worker·file-parallelism 설정을 확인합니다.
- `@testcontainers/postgresql` dev dependency와 lockfile 추가가 production dependency에 포함되지 않는지 확인합니다.
- 이 SHA는 실행 기반만 추가하고 실제 integration scenario는 다음 commit이라는 점을 분리합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | DB package의 `test`는 unit과 container-backed test의 비용·환경 차이를 구분할 실행 경계가 없었습니다. |
| 해결하려던 문제 | 실제 PostgreSQL을 쓰는 시험은 Docker, 긴 timeout, 순차 실행이 필요하며 일반 unit suite에 섞으면 불안정하거나 건너뛰기 쉽습니다. |
| 핵심 결정 | root/package script를 추가하고 unit은 `*.integration.test.ts`를 제외하며 integration command는 한 worker·no file parallelism과 확장 timeout을 사용하도록 했습니다. |
| 입력 → 상태 전이 → 출력 | `pnpm postgres-integration` → `@pong-pong/db` 전용 Vitest command → Testcontainers 의존성을 사용할 준비가 됩니다. |
| ownership / lifetime / cleanup | 개발 의존성과 test process가 container lifetime을 소유합니다. production package runtime에는 이 도구를 요구하지 않습니다. |
| failure / rollback / retry | Docker daemon 부재, image pull 실패, timeout은 command 실패로 노출됩니다. 이 SHA 자체는 container cleanup 코드를 아직 추가하지 않습니다. |
| 보장하는 것 | unit과 real-PostgreSQL 검증을 명시적으로 선택·CI 연결할 수 있는 실행 경계를 제공합니다. |
| 보장하지 않는 것 | 어떤 schema·seed·cleanup 불변식이 검증되는지는 아직 보장하지 않으며 실제 통과 증거도 이 commit만으로 없습니다. |
| 후속 연결 | `c43b87694b29`가 isolated schema와 cleanup을 포함한 integration contract를 구현합니다. |

#### 비교 기준

- parent 상태와 `e935054ce0c9`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `6b661420e060`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `c43b87694b29`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.13. `c43b87694b29` — test(db): PostgreSQL integration 환경과 계약 추가

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `c43b87694b29` |
| Importance | A |
| Tags | PERSISTENCE, RISK, TEST |
| Source role | 실제 PostgreSQL 16 container에서 migration·seed·schema 격리·cleanup 계약을 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/postgres.integration.test.ts`의 PostgreSQL 16-alpine container startup/stop lifecycle을 확인합니다.
- `withIsolatedDatabase`가 무작위 `test_<32hex>` schema와 `search_path` URL을 만들고 pool/repository를 등록·역순 cleanup하는 과정을 추적합니다.
- callback 오류가 있어도 cleanup을 실행하고, cleanup 오류가 원래 오류를 덮지 않도록 처리하는지 확인합니다.
- migration idempotence, development/demo seed idempotence와 profile 차이, sibling schema isolation assertion을 구분합니다.
- 실제 test command는 `e935054ce0c9`의 sequential integration command임을 연결합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | memory behavioral test만으로는 SQL 문법, Kysely migration table, PostgreSQL type conversion, pool/schema cleanup을 확인할 수 없었습니다. |
| 해결하려던 문제 | 한 test의 row가 다른 test에 남거나 callback 실패로 pool/container가 누수되면 결과가 비결정적이고 CI가 종료되지 않을 수 있었습니다. |
| 핵심 결정 | PostgreSQL 16 Testcontainer를 suite 단위로 띄우고 각 case마다 무작위 isolated schema를 생성해 migration·seed를 실행하며, 자원을 역순으로 정리하는 harness를 만들었습니다. |
| 입력 → 상태 전이 → 출력 | container 시작 → test별 schema/search_path 생성 → pool/repository 등록 → migration·seed·query assertion → callback 성공/실패와 무관하게 repository/pool close·schema drop → suite 종료 시 container stop입니다. |
| ownership / lifetime / cleanup | outer suite가 container를, `withIsolatedDatabase`가 schema와 열린 pool/repository 목록을 소유합니다. cleanup은 등록 역순으로 실행되어 의존 자원을 먼저 닫습니다. |
| failure / rollback / retry | callback이 던져도 cleanup은 계속됩니다. cleanup 오류는 수집하되 원래 callback 오류를 보존하고, container stop도 suite teardown에서 수행합니다. |
| 보장하는 것 | 실제 PostgreSQL에서 migration 재실행 안정성, seed profile idempotence, schema 격리, 실패 중 cleanup을 검증할 수 있는 기반을 제공합니다. |
| 보장하지 않는 것 | production traffic 규모, network partition, 모든 repository method parity, 이 환경에서의 실제 test 통과는 본 작업에서 증명하지 않았습니다. |
| 후속 연결 | Thread 2의 migration/readiness/reset 시험과 Thread 4·5의 concurrency integration test가 이 harness를 확장합니다. |

#### 최소 코드 근거

- `packages/db/src/postgres.integration.test.ts::withIsolatedDatabase` — schema·pool·repository를 test가 명시적으로 소유하고 callback 실패 뒤에도 역순 cleanup합니다.

#### Test commit 학습 기록

| 항목 | 기록 |
| --- | --- |
| 검증 대상 불변식 | migration·seed가 실제 PostgreSQL에서 반복 가능하고 test별 schema/resource가 서로 격리·정리된다는 불변식입니다. |
| 재현한 실패·경계 | callback 실패, 여러 pool/repository 등록, 같은 migration/seed 재실행, development/demo profile 차이입니다. |
| 시험 기법 | PostgreSQL 16 Testcontainers와 random schema `search_path`를 사용하는 integration/lifecycle test입니다. |
| 통과하는 실제 코드 경로 | `migrateDatabase`·`ensureSeedData`·repository query, `close`, pool end, schema drop, container stop입니다. |
| 시험이 증명하는 것 | SQL과 PostgreSQL driver를 실제로 통과하는 상태 전이 및 실패 시 cleanup 설계가 시험 코드상 검증됨을 보여 줍니다. |
| 시험이 증명하지 않는 것 | 부하·장애 복구·production 데이터 migration, 모든 backend operation parity는 증명하지 않습니다. 이 세션에서는 command를 실행하지 않았습니다. |
| 막으려는 회귀 | mock/memory에서는 보이지 않는 SQL 오류, schema 오염, 열린 handle 누수, seed 중복 회귀를 막습니다. |

#### 비교 기준

- parent 상태와 `c43b87694b29`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `e935054ce0c9`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.

## 6. 불변식 변화

| 단계 | 관련 SHA | 조사 초점 | 학습자 기록 |
| --- | --- | --- | --- |
| Durable model 도입 | `0e850d24406e` | row identity·FK lifetime·초기 unique/index의 범위를 구분합니다. | PostgreSQL이 UUID·timestamp·관계 row를 소유하게 되었지만 canonical friendship, seed/capacity, idempotent result 같은 고위험 불변식은 아직 schema 밖에 남았습니다. |
| Typed translation 경계 | `4aa060c0b8df` | DB row와 public/session DTO의 노출 범위를 추적합니다. | `UserProjectionRow`와 mapper가 snake_case·nullable field를 DTO로 바꾸며 public projection에서 email을 제외합니다. 다만 runtime validation은 하지 않습니다. |
| Backend lifecycle·surface | `9277572765e7` → `c7ea1ff241c8` | factory·close·operation 확장과 parity의 실제 범위를 기록합니다. | caller는 하나의 interface를 사용하지만 PostgreSQL filter/limit와 memory 배열 동작은 일부 달랐습니다. interface parity는 의미 parity가 아니라 교체 가능한 호출 surface만 제공합니다. |
| 파생 read-model correction | `035b97ca7c58` → `6b661420e060` | fabricated metric이 repository evidence 기반 계산으로 바뀌는 과정을 설명합니다. | backend별 수식/상수가 제거되고 동일 `recentMatches` sequence를 시간순으로 해석하는 계산기로 통일되었습니다. regression은 order와 loss reset을 함께 고정합니다. |
| 실제 DB evidence | `e935054ce0c9` → `c43b87694b29` | 실행 경계·격리·cleanup이 만드는 보장 범위를 구분합니다. | unit과 container suite가 분리되고 test마다 random schema와 명시적 cleanup owner를 둡니다. 실제 SQL·migration lifecycle을 시험할 수 있지만 production 장애·부하까지 증명하지는 않습니다. |

## 7. Failure → Fix → Test 관계

| 관계 | Failure / 이전 가정 | Fix / 결정 | Test / 근거 | 학습자 기록 |
| --- | --- | --- | --- | --- |
| 1 | `c7ea1ff241c8`: PostgreSQL은 임의 수식, memory는 상수 3으로 `bestStreak`를 생성했습니다. | `035b97ca7c58`: recent match 결과를 chronological order로 순회하는 공통 계산기를 추가했습니다. | `6b661420e060`: `win→loss→win→win`과 newest-first 반환을 이용해 기대값 2를 검증합니다. | 이 관계는 read model이 저장된 경기 evidence에서만 파생되어야 한다는 불변식을 복구합니다. test는 fabricated value뿐 아니라 reverse·reset 오류도 막습니다. |
| 2 | memory test만으로는 SQL·migration table·pool cleanup을 확인할 수 없었습니다. | `e935054ce0c9`: 전용 command와 Testcontainers dependency를 추가했습니다. | `c43b87694b29`: PostgreSQL 16, isolated schema, callback-failure cleanup을 구현했습니다. | 시험 실행 환경 자체를 먼저 독립시킨 뒤 실제 DB lifecycle을 검증합니다. harness의 존재와 이 세션에서의 실제 통과는 구분해야 합니다. |

## 8. Ownership·상태·책임 변화

| 구간 | 이전 소유자/표현 | 이후 소유자/표현 | 관련 SHA | 학습자 기록 |
| --- | --- | --- | --- | --- |
| Schema와 row | 애플리케이션 상태의 durable owner가 없었습니다. | PostgreSQL table/FK가 row identity와 관계 lifetime을 소유합니다. | `0e850d24406e` | DB가 durability를 맡지만 domain-level canonical identity와 capacity는 이후 제약·transaction이 보강해야 했습니다. |
| DB shape → DTO | caller가 raw column을 직접 해석할 수 있었습니다. | row mapper가 이름·nullable·공개 field 변환을 소유합니다. | `4aa060c0b8df`, `8ab49e5f2dd4` | mapper는 새 projection을 반환하고 raw row를 수정하지 않습니다. runtime 검증 책임은 별도 protocol 경계에 남습니다. |
| 자원 lifecycle | Pool/Kysely 생성·종료가 caller 세부사항이었습니다. | repository factory가 구성하고 caller가 `close()`를 호출합니다. | `9277572765e7` | 구성은 repository가, 종료 trigger는 composition root가 소유하는 분할 책임입니다. |
| Read-model 계산 | UI 또는 backend별 임의 계산으로 갈라질 수 있었습니다. | repository 공통 helper가 recent sequence에서 지표를 계산합니다. | `c7ea1ff241c8`, `035b97ca7c58` | 저장 원본은 DB/Map이 유지하고 파생 metric은 query 시 생성됩니다. 계산 범위는 recent 8개로 한정됩니다. |
| Integration resource | test 자원의 명시적 owner가 없었습니다. | suite와 helper가 container·schema·pool·repository cleanup을 소유합니다. | `c43b87694b29` | callback 오류와 teardown을 분리해 원래 실패를 보존하면서 열린 handle을 정리합니다. |

## 9. Thread 최종 상태

이 Thread의 최종 상태에서 `AppRepository`는 PostgreSQL과 memory를 같은 호출 surface 뒤에 배치하고, row mapper는 relational row를 shared read model로 변환합니다. profile·leaderboard·recent match·dashboard가 repository operation으로 제공되며 `bestStreak`는 최근 경기 결과에서 계산됩니다. 다만 interface만으로 완전한 backend 의미 parity를 증명하지 않으며, 실제 PostgreSQL 보장은 container integration test가 다루는 범위로 제한됩니다.

## 10. 최종 실행 흐름

1. 호출자가 factory로 PostgreSQL 또는 memory repository를 만들고 해당 repository lifetime의 종료 책임을 가집니다.
2. repository method가 DB query 또는 Map/배열 조회를 수행하고 raw row/record를 얻습니다.
3. row mapper가 snake_case, nullable 값, viewer-relative 의미를 shared DTO로 변환합니다.
4. `getDashboard`는 사용자와 newest-first 최근 경기 최대 8개를 조립합니다.
5. `bestWinningStreak`가 복사한 경기 배열을 시간순으로 순회해 loss에서 current를 초기화하고 best를 반환합니다.
6. memory test는 public method composition을, PostgreSQL integration harness는 migration·seed·schema/resource lifecycle을 서로 다른 범위에서 검증합니다.

## 11. 학습 완료 확인

- [x] 초기 SQL 제약과 나중에 보강된 불변식을 혼동하지 않고 설명할 수 있습니다.
- [x] mapper의 compile-time 보장과 runtime non-guarantee를 구분할 수 있습니다.
- [x] memory/PostgreSQL의 interface parity와 의미 parity 차이를 구체적인 filter·limit 사례로 설명할 수 있습니다.
- [x] `bestStreak` fix의 이전 가정, root cause, corrected invariant와 regression을 연결할 수 있습니다.
- [x] memory behavioral test와 PostgreSQL integration test의 증거 범위를 과장하지 않고 설명할 수 있습니다.

## 12. 실행 및 증거 기록

- 저장소 실행 시험: 실행하지 않았습니다.
- 이유: 로컬 `git clone --branch web/ft_transcendence --single-branch`가 DNS 해석 실패(`Could not resolve host: github.com`)로 중단되어 의존성을 포함한 실행 가능한 checkout을 만들 수 없었습니다.
- 코드 근거: 지정 브랜치의 source classification과 각 exact SHA의 GitHub commit diff를 확인했습니다. 따라서 본 문서의 시험 설명은 실제 시험 코드의 정적 검토 결과이며, 이 환경에서의 통과 결과가 아닙니다.
