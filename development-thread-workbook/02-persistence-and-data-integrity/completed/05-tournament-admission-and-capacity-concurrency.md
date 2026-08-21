# Development Thread 05 — Tournament admission과 capacity concurrency

## 1. 학습 목표

- 초기 count→seed→insert 구현의 race와 memory capacity 차이를 exact SHA에서 확인합니다.
- legacy seed normalization과 unique constraint가 capacity control과 다른 불변식임을 구분합니다.
- tournament row lock을 기준으로 admission·status·bracket를 한 transaction에 묶는 이유를 설명합니다.
- memory canonical user source 정렬과 PostgreSQL concurrency evidence의 범위 차이를 구분합니다.

## 2. 범위와 경계

- 포함: tournament CRUD의 최초 admission, seed unique migration, PostgreSQL locked transaction, memory entrant source, final-slot concurrency regression.
- `cdaca35ccf7f`에서는 tournament capacity assertion만 이 Thread의 핵심 근거로 사용합니다. friendship assertion은 Thread 4에서 다룹니다.
- 제외: tournament match start/completion, final creation, match finalization과 rollback은 독립 tournament/realtime persistence story입니다.
- 제외: UI join mutation, browser cache, HTTP authorization은 web/auth category에서 다룹니다.

## 3. 핵심 질문

- 왜 unique seed constraint만으로 exactly one final-slot admission을 보장할 수 없습니까?
- row lock은 어떤 row를 잠그며 왜 같은 tournament의 모든 admission이 그 row를 먼저 읽어야 합니까?
- existing-entry check를 capacity check보다 먼저 두면 rejoin semantics가 어떻게 달라집니까?
- entry insert·status running·semifinal bracket가 같은 transaction이어야 하는 이유는 무엇입니까?
- commit 후 aggregate 재조회 실패는 durable admission과 API 응답 사이에 어떤 non-guarantee를 남깁니까?

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags |
| ---: | --- | --- | :---: | --- |
| 1 | `9b1dabcc4bb4` | `feat(db): 토너먼트 참가 저장 구현` | B | PERSISTENCE, TOURNAMENT |
| 2 | `3aa5958bb967` | `feat(db): tournament seed 제약 추가` | B | PERSISTENCE, TOURNAMENT |
| 3 | `d9a6d8dd8950` | `feat(db): PostgreSQL tournament 참가를 원자화` | A | PERSISTENCE, TOURNAMENT, RISK |
| 4 | `efdb5c3a4932` | `feat(db): memory tournament 참가자 원본 검증` | B | PERSISTENCE, TOURNAMENT |
| 5 | `cdaca35ccf7f` | `test(db): friendship와 tournament 경쟁 상태 검증` | A | PERSISTENCE, TOURNAMENT, RISK |

## 5. Commit별 조사

### 5.1. `9b1dabcc4bb4` — feat(db): 토너먼트 참가 저장 구현

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `9b1dabcc4bb4` |
| Importance | B |
| Tags | PERSISTENCE, TOURNAMENT |
| Source role | tournament list/create/join을 처음 repository에 추가하지만 count→seed→insert가 분리되어 capacity와 concurrency를 보호하지 못합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `AppRepository`의 `listTournaments`, `createTournament`, `joinTournament` signature를 확인합니다.
- PostgreSQL `createTournament`가 tournament insert 뒤 creator를 `joinTournament`로 참가시키는 순서를 추적합니다.
- 초기 `joinTournament`의 `select count(*)`, `seed = count + 1`, `insert ... on conflict (tournament_id, user_id) do nothing`을 확인합니다.
- count와 insert 사이에 row lock/transaction이 없고 capacity check도 없는 parent 상태를 명시합니다.
- `tournamentFromRow`가 entries를 seed 순으로 읽고 mapper에 넘기는지 확인합니다.
- memory 구현이 중복 user를 막지만 capacity 이상에서도 status만 running으로 바꾸고 신규 참가를 차단하지 않는지 확인합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | tournament table과 row type은 있었지만 repository를 통해 대회를 생성·조회·참가할 operation이 없었습니다. |
| 해결하려던 문제 | HTTP/tournament UI가 raw SQL을 모르고 creator 자동 참가와 참가자 목록을 일관된 aggregate로 받아야 했습니다. |
| 핵심 결정 | 공통 interface에 list/create/join을 추가하고 PostgreSQL은 count 기반 seed insert, memory는 entries 배열 append로 구현했습니다. |
| 입력 → 상태 전이 → 출력 | create → tournament row 저장 → creator join; join → 현재 entry count 조회 → seed=count+1 계산 → unique user insert → aggregate 재조회입니다. |
| ownership / lifetime / cleanup | PostgreSQL이 rows를, memory tournament object가 entries 배열을 소유합니다. create caller가 별도 transaction 없이 두 operation을 연속 호출합니다. |
| failure / rollback / retry | 동시 join이 같은 count/seed를 볼 수 있고 capacity를 초과할 수 있습니다. create 후 creator join이 실패하면 빈 tournament row가 남을 수 있습니다. memory도 신규 참가를 capacity에서 거부하지 않습니다. |
| 보장하는 것 | tournament aggregate의 기본 CRUD와 동일 user 재join의 row-level no-duplicate를 제공합니다. |
| 보장하지 않는 것 | seed uniqueness, capacity enforcement, final slot serialization, status/bracket atomicity, backend 의미 parity는 보장하지 않습니다. |
| 후속 연결 | `3aa5958bb967`이 seed unique를 DB에 추가하고 `d9a6d8dd8950`이 row lock transaction으로 admission 전체를 원자화합니다. |

#### 비교 기준

- parent 상태와 `9b1dabcc4bb4`의 diff를 먼저 비교합니다.
- 후속 관련 SHA `3aa5958bb967`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.2. `3aa5958bb967` — feat(db): tournament seed 제약 추가

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `3aa5958bb967` |
| Importance | B |
| Tags | PERSISTENCE, TOURNAMENT |
| Source role | 기존 entry seed를 deterministic하게 재번호 매긴 뒤 tournament별 seed uniqueness를 DB constraint로 만듭니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/migrations/004_friendship_tournament_invariants.sql`의 `ranked_entries` CTE를 확인합니다.
- `partition by tournament_id order by seed, created_at, id`의 deterministic rank 기준을 추적합니다.
- 모든 기존 entry의 seed를 `row_number()` 결과로 갱신해 gap/duplicate를 정규화하는지 확인합니다.
- `unique (tournament_id, seed)` constraint 추가를 확인합니다.
- 이 constraint가 capacity나 user uniqueness를 새로 보장하지 않고 seed collision만 막는다는 점을 구분합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | 초기 join은 `count+1`을 transaction 밖에서 계산해 동일 tournament에서 같은 seed가 생성될 수 있었고 DB는 이를 허용했습니다. |
| 해결하려던 문제 | 새 unique constraint를 바로 추가하면 기존 duplicate/gap seed 때문에 migration이 실패할 수 있었습니다. |
| 핵심 결정 | 각 tournament entry를 기존 seed·created_at·id 순으로 rank해 1부터 재번호 매긴 뒤 `(tournament_id, seed)` unique를 설치했습니다. |
| 입력 → 상태 전이 → 출력 | 기존 entries → tournament별 deterministic sort/rank → seed rewrite → unique constraint install → 이후 duplicate seed insert 거부입니다. |
| ownership / lifetime / cleanup | migration이 legacy seed normalization을, PostgreSQL constraint가 future seed uniqueness를 소유합니다. |
| failure / rollback / retry | 동시 writer는 duplicate seed error를 받을 수 있지만 이 commit만으로 retry하거나 다른 seed를 선택하지 않습니다. capacity도 확인하지 않습니다. |
| 보장하는 것 | 한 tournament 안에서 seed가 유일하고 migration 직후 contiguous 1..N 상태로 정규화됩니다. |
| 보장하지 않는 것 | 최대 N=capacity, 신규 참가 serialization, creator auto-join atomicity, bracket 생성은 보장하지 않습니다. |
| 후속 연결 | `d9a6d8dd8950`이 locked transaction 안에서 `max(seed)+1`을 계산해 constraint violation을 예방하고 capacity/status/bracket를 함께 갱신합니다. |

#### 최소 코드 근거

- `004_friendship_tournament_invariants.sql` — tournament별 `row_number()`로 기존 seed를 재번호 매긴 뒤 `(tournament_id, seed)` unique를 설치합니다.

#### 비교 기준

- parent 상태와 `3aa5958bb967`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `9b1dabcc4bb4`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `d9a6d8dd8950`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.3. `d9a6d8dd8950` — feat(db): PostgreSQL tournament 참가를 원자화

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `d9a6d8dd8950` |
| Importance | A |
| Tags | PERSISTENCE, TOURNAMENT, RISK |
| Source role | tournament row lock을 중심으로 duplicate check, capacity, seed, status와 semifinal bracket 생성을 하나의 transaction에 묶습니다. |

#### 해당 SHA에서 확인할 실제 코드

- `PostgresRepository.joinTournament`의 `this.db.transaction().execute` 범위를 확인합니다.
- `select capacity from tournaments where id = ... for update`가 동일 tournament admission을 직렬화하는지 추적합니다.
- lock 획득 뒤 existing `(tournament_id,user_id)` 확인이 rejoin을 idempotent no-op으로 만드는지 확인합니다.
- `count(*)`와 `coalesce(max(seed),0)+1`이 같은 transaction/lock 아래 계산되는지 확인합니다.
- capacity 초과 시 insert 전에 `tournament full`을 던져 transaction rollback되는지 확인합니다.
- 마지막 자리에서 status=`running`과 `ensureTournamentBracket(tournamentId, transaction)`가 같은 executor를 사용하는지 확인합니다.
- transaction commit 뒤 aggregate를 재조회하는 부분이 lock snapshot 밖이라는 non-guarantee를 기록합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | 초기 admission은 count, seed, insert, status, bracket를 별도 statement로 실행해 동시 요청이 같은 마지막 자리를 모두 통과할 수 있었습니다. |
| 해결하려던 문제 | seed unique만 추가하면 race가 constraint error로 바뀔 뿐, 정확히 한 참가자를 받고 status/bracket까지 일관되게 전이하는 domain 결과는 보장하지 못했습니다. |
| 핵심 결정 | tournament row를 `FOR UPDATE`로 잠그는 transaction 안에서 existing check, count/next_seed, capacity check, insert, running status와 bracket 생성을 수행했습니다. |
| 입력 → 상태 전이 → 출력 | transaction 시작 → tournament row lock → same user existing이면 no-op → count/max seed 조회 → full이면 throw → insert → count가 capacity에 도달하면 status running·semifinal 2개 upsert → commit → aggregate 재조회입니다. |
| ownership / lifetime / cleanup | PostgreSQL transaction이 해당 tournament admission state와 bracket side effect를 commit/rollback 단위로 소유합니다. helper는 전달받은 transaction executor를 사용합니다. |
| failure / rollback / retry | 없는 tournament는 `firstRow` failure, full은 insert 전 throw로 rollback됩니다. bracket insert 실패도 entry/status와 함께 rollback됩니다. commit 뒤 summary read가 실패하면 durable admission은 이미 완료됐을 수 있습니다. |
| 보장하는 것 | 동일 tournament의 concurrent admissions가 row lock에서 직렬화되고 exactly one final slot, unique seed, capacity, running+bracket 전이가 한 transaction으로 결정됩니다. |
| 보장하지 않는 것 | 여러 tournament 사이의 global ordering, fairness, long lock wait policy, deadlock retry, commit 후 read availability는 보장하지 않습니다. |
| 후속 연결 | `efdb5c3a4932`가 memory entrant source를 canonical store로 정렬하고 `cdaca35ccf7f`가 10개 concurrent final-slot 요청으로 PostgreSQL 결과를 검증합니다. |

#### 최소 코드 근거

- `PostgresRepository.joinTournament` — `SELECT ... FOR UPDATE`로 tournament row를 잠근 transaction 안에서 count·next seed·capacity·entry·status·bracket를 처리합니다.

#### 비교 기준

- parent 상태와 `d9a6d8dd8950`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `3aa5958bb967`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `efdb5c3a4932`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.4. `efdb5c3a4932` — feat(db): memory tournament 참가자 원본 검증

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `efdb5c3a4932` |
| Importance | B |
| Tags | PERSISTENCE, TOURNAMENT |
| Source role | memory join이 public lookup 결과가 아니라 canonical user Map 원본 존재를 먼저 검증한 뒤 projection을 생성하도록 바꿉니다. |

#### 해당 SHA에서 확인할 실제 코드

- `MemoryRepository.joinTournament`의 `getUserById` 호출이 `this.users.get(userId)`로 바뀐 parent diff를 확인합니다.
- `rawUser` 존재 확인 뒤 `toPublicUser(rawUser, true)`를 생성하는 순서를 추적합니다.
- 기존 joined/full/idempotent/status/bracket logic이 그대로 유지되는지 확인합니다.
- canonical store 존재성 확인이 database row lock과 같은 concurrency mechanism은 아니라는 점을 명시합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | memory join은 public lookup method를 통해 entrant를 얻어 저장 원본 존재 검증과 projection 생성이 한 호출에 숨겨졌습니다. |
| 해결하려던 문제 | repository 내부 mutation은 canonical user store의 원본을 기준으로 해야 하며, public read-model helper의 후속 filtering 변화에 영향을 받지 않아야 했습니다. |
| 핵심 결정 | `this.users.get(userId)`로 원본을 확인하고 그 row에서 `toPublicUser` projection을 만든 뒤 기존 admission 규칙을 적용했습니다. |
| 입력 → 상태 전이 → 출력 | tournament lookup + canonical user Map lookup → public projection 생성 → existing/full 검사 → entries mutation과 status/bracket update입니다. |
| ownership / lifetime / cleanup | memory user Map이 entrant identity의 source of truth를 소유하고 tournament aggregate는 projection을 entries로 보유합니다. |
| failure / rollback / retry | 없는 tournament/user는 동일 오류로 실패합니다. method 중간 mutation rollback이나 true parallel lock은 추가되지 않습니다. |
| 보장하는 것 | memory admission이 public lookup policy가 아니라 실제 repository 원본 사용자 존재에 의존합니다. |
| 보장하지 않는 것 | PostgreSQL과 같은 durability·transaction·row lock, stale projection 자동 갱신, multi-process capacity는 보장하지 않습니다. |
| 후속 연결 | `cdaca35ccf7f`가 memory final-slot scenario에서 capacity·unique entries·bracket와 rejoin idempotence를 검증합니다. |

#### 비교 기준

- parent 상태와 `efdb5c3a4932`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `d9a6d8dd8950`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `cdaca35ccf7f`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.5. `cdaca35ccf7f` — test(db): friendship와 tournament 경쟁 상태 검증

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `cdaca35ccf7f` |
| Importance | A |
| Tags | PERSISTENCE, TOURNAMENT, RISK |
| Source role | 같은 test commit의 tournament 부분에서 10개 concurrent 요청이 마지막 한 자리를 두 backend에서 어떻게 결정하는지 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.test.ts`의 `admits one of ten users into the final tournament slot` memory scenario를 확인합니다.
- creator+두 early entries로 3/4 상태를 만든 뒤 `Promise.allSettled`로 후보 10명의 `joinTournament`를 호출하는지 확인합니다.
- fulfilled 1, rejected 9, 모든 rejection에 `tournament full`, playerCount 4, unique user 4, semifinal slots [1,2] assertion을 확인합니다.
- accepted user의 재join이 성공하고 count/bracket가 늘지 않는 idempotence assertion을 확인합니다.
- `packages/db/src/postgres.integration.test.ts`의 동일 concurrent scenario와 raw entry seed [1,2,3,4], 두 match row assertion을 확인합니다.
- memory Promise concurrency와 PostgreSQL row-lock concurrency의 실제 의미 차이를 기록합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | `d9a6d8dd8950`이 transaction을 도입했지만 마지막 자리 경쟁에서 exactly one admission과 bracket side effect가 실제 SQL path에서 유지되는지 고가치 regression이 필요했습니다. |
| 해결하려던 문제 | 10개 요청이 모두 count=3을 보거나 duplicate seed/bracket를 만들면 capacity·status·read model이 서로 모순될 수 있었습니다. |
| 핵심 결정 | memory와 PostgreSQL 모두 3/4 상태를 만든 뒤 후보 10명을 `Promise.allSettled`로 동시에 요청하고 public aggregate와 raw rows를 확인했습니다. |
| 입력 → 상태 전이 → 출력 | creator 자동 entry + early 2명 → 10 candidate join promises → 1 fulfilled/9 full → entries 4·unique IDs·seeds 1..4 → semifinal slots 1,2 → accepted user rejoin 후 count/matches 불변입니다. |
| ownership / lifetime / cleanup | PostgreSQL transaction/row lock이 final-slot winner를 소유하고 test harness가 schema/pool cleanup을 소유합니다. memory는 event-loop 내 method mutation 순서가 결과를 결정합니다. |
| failure / rollback / retry | full 요청은 entry/status/bracket를 남기지 않아야 합니다. PostgreSQL direct query가 committed state를 확인합니다. test 자체가 fairness나 어떤 candidate가 이길지는 고정하지 않습니다. |
| 보장하는 것 | PostgreSQL에서 concurrent final-slot 요청 중 정확히 하나만 commit되고 seed·entry·bracket가 일관됨을 검증합니다. memory도 observable capacity/idempotence 결과를 맞춥니다. |
| 보장하지 않는 것 | 높은 부하의 lock wait/deadlock, 여러 API process의 retry policy, createTournament creator join atomicity, 본 세션의 실제 test 통과는 증명하지 않습니다. |
| 후속 연결 | count-before-insert 구현으로 회귀하거나 bracket helper가 transaction 밖으로 이동하면 success/rejection 수와 raw row assertion이 실패합니다. |

#### 최소 코드 근거

- `postgres.integration.test.ts` — 10개의 final-slot 요청 뒤 raw `tournament_entries` seed `[1,2,3,4]`와 정확히 두 semifinal row를 확인합니다.

#### Test commit 학습 기록

| 항목 | 기록 |
| --- | --- |
| 검증 대상 불변식 | tournament admission은 capacity를 넘지 않고 final slot 하나만 배정하며 seed와 semifinal bracket가 중복 없이 같은 committed state를 반영해야 합니다. |
| 재현한 실패·경계 | 3/4 tournament에 10명의 신규 user가 동시에 참가하고 성공한 user가 다시 참가하는 경계입니다. |
| 시험 기법 | `Promise.allSettled` 기반 concurrent repository test와 Testcontainers PostgreSQL raw-state verification입니다. |
| 통과하는 실제 코드 경로 | `joinTournament` transaction, tournament row `FOR UPDATE`, entry insert, status update, `ensureTournamentBracket`, memory equivalent입니다. |
| 시험이 증명하는 것 | PostgreSQL에서 1 success/9 full, entries 4·seeds 1..4·unique users, semifinals 2개와 rejoin idempotence를 증명합니다. |
| 시험이 증명하지 않는 것 | winner fairness, long-running lock behavior, deadlock retry, production load, 이 세션에서의 실제 실행 결과는 증명하지 않습니다. |
| 막으려는 회귀 | over-capacity admission, duplicate seed, duplicate/missing bracket, failed request의 partial commit, rejoin side effect 회귀를 막습니다. |

#### 비교 기준

- parent 상태와 `cdaca35ccf7f`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `efdb5c3a4932`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.

## 6. 불변식 변화

| 단계 | 관련 SHA | 조사 초점 | 학습자 기록 |
| --- | --- | --- | --- |
| 초기 non-atomic admission | `9b1dabcc4bb4` | count·seed·insert·capacity의 분리 상태를 기록합니다. | PostgreSQL은 count+1을 transaction 밖에서 계산하고 capacity를 확인하지 않았으며 memory도 capacity 이후 신규 entry를 막지 않았습니다. 동일 user unique만 존재했습니다. |
| Seed uniqueness | `3aa5958bb967` | legacy normalization과 future constraint를 구분합니다. | 기존 entry를 deterministic 1..N으로 재번호 매긴 뒤 tournament별 seed unique를 설치합니다. duplicate seed는 막지만 final-slot winner를 선택하거나 capacity를 강제하지 않습니다. |
| Atomic admission | `d9a6d8dd8950` | lock·idempotence·capacity·status·bracket transaction을 추적합니다. | tournament row `FOR UPDATE`가 동일 tournament의 admission을 직렬화하고 existing user no-op, count/max seed, full reject, insert, running+bracket가 하나의 commit/rollback 단위가 됩니다. |
| Memory source alignment | `efdb5c3a4932` | entrant identity source와 projection을 분리합니다. | memory는 canonical user Map 원본 존재를 검증한 뒤 public projection을 entries에 넣습니다. 이것은 source alignment이지 DB-style lock이나 rollback이 아닙니다. |
| Final-slot evidence | `cdaca35ccf7f` | success/rejection 수와 raw state를 연결합니다. | 10개 요청 중 1개만 성공하고 9개는 full, entries/seeds/users가 4개로 유일하며 semifinal 2개와 rejoin no-op을 memory·PostgreSQL에서 확인합니다. |

## 7. Failure → Fix → Test 관계

| 관계 | Failure / 이전 가정 | Fix / 결정 | Test / 근거 | 학습자 기록 |
| --- | --- | --- | --- | --- |
| 1 | `9b1dabcc4bb4`의 count+1과 insert가 분리돼 같은 seed·over-capacity race가 가능했습니다. | `3aa5958bb967`이 seed unique를 추가했지만 collision을 domain result로 해결하지는 못했습니다. | constraint 자체는 `cdaca35ccf7f`의 raw seed assertion에서 후속 보호됩니다. | DB constraint는 최소 무결성 safety net이며 admission winner 선택과 status/bracket transition은 transaction logic이 별도로 소유해야 합니다. |
| 2 | capacity check·entry·running status·bracket가 분리되면 partial state가 남을 수 있었습니다. | `d9a6d8dd8950`이 tournament row lock transaction에 모두 묶었습니다. | `cdaca35ccf7f`가 10-way final-slot competition과 raw committed state를 검증합니다. | row lock을 모든 admission의 첫 serialization point로 사용해 exactly one final slot을 만들고 helper도 같은 transaction executor를 사용합니다. |
| 3 | memory join이 public lookup helper에 entrant source를 의존했습니다. | `efdb5c3a4932`가 canonical user Map을 직접 확인합니다. | `cdaca35ccf7f`의 memory capacity·unique-entry·bracket scenario입니다. | memory의 identity source는 정렬되지만 event-loop 순서에 따른 process-local mutation일 뿐 PostgreSQL의 concurrency mechanism과 같다고 볼 수 없습니다. |

## 8. Ownership·상태·책임 변화

| 구간 | 이전 소유자/표현 | 이후 소유자/표현 | 관련 SHA | 학습자 기록 |
| --- | --- | --- | --- | --- |
| Seed identity | application의 stale count가 seed를 사실상 결정했습니다. | DB unique constraint와 locked transaction의 `max(seed)+1`이 결정합니다. | `3aa5958bb967`, `d9a6d8dd8950` | constraint는 collision을 거부하고 transaction은 collision이 발생하지 않도록 serialized state에서 다음 seed를 계산합니다. |
| Capacity decision | 각 request가 독립 count를 읽고 신규 참가를 허용했습니다. | 잠긴 tournament row 아래 transaction이 capacity와 final-slot winner를 소유합니다. | `d9a6d8dd8950` | 같은 tournament admission은 lock을 통과해야 하며 다른 tournament는 서로 독립적으로 진행할 수 있습니다. |
| Bracket side effect | entry/status/bracket가 별도 statement/executor일 수 있었습니다. | 마지막 admission transaction이 running status와 semifinal rows를 함께 소유합니다. | `d9a6d8dd8950` | bracket 생성 실패는 entry와 status도 rollback되어 partial running tournament를 막습니다. |
| Memory entrant | public lookup output이 source처럼 사용됐습니다. | canonical user Map이 identity source, mapper가 entry projection을 소유합니다. | `efdb5c3a4932` | 원본 존재성과 read model 생성이 분리되지만 stored projection freshness는 별도 문제입니다. |

## 9. Thread 최종 상태

최종 상태에서 PostgreSQL tournament admission은 tournament row lock을 얻은 transaction 하나가 existing-entry idempotence, capacity, next seed, entry insert, running status와 semifinal bracket를 결정합니다. seed unique constraint가 DB-level safety net을 제공합니다. memory는 canonical user source와 같은 observable capacity/idempotence를 구현하지만 durable transaction이나 cross-process serialization은 없습니다. concurrency regression은 final slot 결과를 직접 검증하되 fairness·deadlock retry·production 부하까지 보장하지 않습니다.

## 10. 최종 실행 흐름

1. caller가 tournament ID와 user ID로 `joinTournament`를 호출합니다.
2. PostgreSQL transaction이 tournament row를 `FOR UPDATE`로 읽어 같은 tournament admission의 serialization point를 확보합니다.
3. 이미 참가한 user면 capacity와 무관하게 no-op하고 기존 aggregate를 반환할 준비를 합니다.
4. 신규 user면 current count와 max seed를 읽고 full이면 insert 전에 실패합니다.
5. 자리 있으면 next seed로 entry를 넣고 capacity에 도달한 요청이 status를 running으로 바꾸며 같은 transaction에서 semifinal 두 개를 생성합니다.
6. commit 뒤 aggregate를 재조회해 caller에 반환합니다. 이 read 실패는 committed write를 되돌리지 않습니다.
7. memory는 같은 분기를 canonical user Map과 tournament object에 적용하고 test는 10-way final-slot 결과와 raw PostgreSQL rows를 비교합니다.

## 11. 학습 완료 확인

- [x] seed uniqueness와 capacity serialization이 서로 다른 불변식임을 설명할 수 있습니다.
- [x] `FOR UPDATE` row와 모든 admission의 lock 순서를 설명할 수 있습니다.
- [x] existing-entry check가 full check보다 먼저인 rejoin 의미를 설명할 수 있습니다.
- [x] entry·status·bracket가 같은 transaction이어야 하는 failure/rollback 이유를 설명할 수 있습니다.
- [x] commit 후 summary read failure의 non-guarantee를 설명할 수 있습니다.
- [x] memory Promise test와 실제 PostgreSQL row-lock concurrency evidence를 구분할 수 있습니다.

## 12. 실행 및 증거 기록

- 저장소 실행 시험: 실행하지 않았습니다.
- 이유: 로컬 `git clone --branch web/ft_transcendence --single-branch`가 DNS 해석 실패(`Could not resolve host: github.com`)로 중단되어 의존성을 포함한 실행 가능한 checkout을 만들 수 없었습니다.
- 코드 근거: 지정 브랜치의 source classification과 각 exact SHA의 GitHub commit diff를 확인했습니다. 따라서 본 문서의 시험 설명은 실제 시험 코드의 정적 검토 결과이며, 이 환경에서의 통과 결과가 아닙니다.
