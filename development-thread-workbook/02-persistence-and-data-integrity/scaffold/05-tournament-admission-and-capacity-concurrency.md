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
| 직전 관련 상태 | <!-- LEARNER:9b1dabcc4bb4:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:9b1dabcc4bb4:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:9b1dabcc4bb4:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:9b1dabcc4bb4:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:9b1dabcc4bb4:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:9b1dabcc4bb4:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:9b1dabcc4bb4:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:9b1dabcc4bb4:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:9b1dabcc4bb4:later --> _(학습자 작성)_ |

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
| 직전 관련 상태 | <!-- LEARNER:3aa5958bb967:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:3aa5958bb967:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:3aa5958bb967:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:3aa5958bb967:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:3aa5958bb967:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:3aa5958bb967:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:3aa5958bb967:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:3aa5958bb967:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:3aa5958bb967:later --> _(학습자 작성)_ |

#### 최소 코드 근거

<!-- LEARNER:3aa5958bb967:evidence --> _(학습자 작성)_

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
| 직전 관련 상태 | <!-- LEARNER:d9a6d8dd8950:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:d9a6d8dd8950:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:d9a6d8dd8950:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:d9a6d8dd8950:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:d9a6d8dd8950:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:d9a6d8dd8950:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:d9a6d8dd8950:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:d9a6d8dd8950:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:d9a6d8dd8950:later --> _(학습자 작성)_ |

#### 최소 코드 근거

<!-- LEARNER:d9a6d8dd8950:evidence --> _(학습자 작성)_

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
| 직전 관련 상태 | <!-- LEARNER:efdb5c3a4932:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:efdb5c3a4932:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:efdb5c3a4932:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:efdb5c3a4932:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:efdb5c3a4932:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:efdb5c3a4932:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:efdb5c3a4932:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:efdb5c3a4932:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:efdb5c3a4932:later --> _(학습자 작성)_ |

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
| 직전 관련 상태 | <!-- LEARNER:cdaca35ccf7f:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:cdaca35ccf7f:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:cdaca35ccf7f:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:cdaca35ccf7f:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:cdaca35ccf7f:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:cdaca35ccf7f:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:cdaca35ccf7f:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:cdaca35ccf7f:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:cdaca35ccf7f:later --> _(학습자 작성)_ |

#### 최소 코드 근거

<!-- LEARNER:cdaca35ccf7f:evidence --> _(학습자 작성)_

#### Test commit 학습 기록

| 항목 | 기록 |
| --- | --- |
| 검증 대상 불변식 | <!-- LEARNER:cdaca35ccf7f:test:invariant --> _(학습자 작성)_ |
| 재현한 실패·경계 | <!-- LEARNER:cdaca35ccf7f:test:boundary --> _(학습자 작성)_ |
| 시험 기법 | <!-- LEARNER:cdaca35ccf7f:test:technique --> _(학습자 작성)_ |
| 통과하는 실제 코드 경로 | <!-- LEARNER:cdaca35ccf7f:test:path --> _(학습자 작성)_ |
| 시험이 증명하는 것 | <!-- LEARNER:cdaca35ccf7f:test:proves --> _(학습자 작성)_ |
| 시험이 증명하지 않는 것 | <!-- LEARNER:cdaca35ccf7f:test:not_proves --> _(학습자 작성)_ |
| 막으려는 회귀 | <!-- LEARNER:cdaca35ccf7f:test:regression --> _(학습자 작성)_ |

#### 비교 기준

- parent 상태와 `cdaca35ccf7f`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `efdb5c3a4932`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.

## 6. 불변식 변화

| 단계 | 관련 SHA | 조사 초점 | 학습자 기록 |
| --- | --- | --- | --- |
| 초기 non-atomic admission | `9b1dabcc4bb4` | count·seed·insert·capacity의 분리 상태를 기록합니다. | <!-- LEARNER:thread-05:invariant:1 --> _(학습자 작성)_ |
| Seed uniqueness | `3aa5958bb967` | legacy normalization과 future constraint를 구분합니다. | <!-- LEARNER:thread-05:invariant:2 --> _(학습자 작성)_ |
| Atomic admission | `d9a6d8dd8950` | lock·idempotence·capacity·status·bracket transaction을 추적합니다. | <!-- LEARNER:thread-05:invariant:3 --> _(학습자 작성)_ |
| Memory source alignment | `efdb5c3a4932` | entrant identity source와 projection을 분리합니다. | <!-- LEARNER:thread-05:invariant:4 --> _(학습자 작성)_ |
| Final-slot evidence | `cdaca35ccf7f` | success/rejection 수와 raw state를 연결합니다. | <!-- LEARNER:thread-05:invariant:5 --> _(학습자 작성)_ |

## 7. Failure → Fix → Test 관계

| 관계 | Failure / 이전 가정 | Fix / 결정 | Test / 근거 | 학습자 기록 |
| --- | --- | --- | --- | --- |
| 1 | `9b1dabcc4bb4`의 count+1과 insert가 분리돼 같은 seed·over-capacity race가 가능했습니다. | `3aa5958bb967`이 seed unique를 추가했지만 collision을 domain result로 해결하지는 못했습니다. | constraint 자체는 `cdaca35ccf7f`의 raw seed assertion에서 후속 보호됩니다. | <!-- LEARNER:thread-05:relation:1 --> _(학습자 작성)_ |
| 2 | capacity check·entry·running status·bracket가 분리되면 partial state가 남을 수 있었습니다. | `d9a6d8dd8950`이 tournament row lock transaction에 모두 묶었습니다. | `cdaca35ccf7f`가 10-way final-slot competition과 raw committed state를 검증합니다. | <!-- LEARNER:thread-05:relation:2 --> _(학습자 작성)_ |
| 3 | memory join이 public lookup helper에 entrant source를 의존했습니다. | `efdb5c3a4932`가 canonical user Map을 직접 확인합니다. | `cdaca35ccf7f`의 memory capacity·unique-entry·bracket scenario입니다. | <!-- LEARNER:thread-05:relation:3 --> _(학습자 작성)_ |

## 8. Ownership·상태·책임 변화

| 구간 | 이전 소유자/표현 | 이후 소유자/표현 | 관련 SHA | 학습자 기록 |
| --- | --- | --- | --- | --- |
| Seed identity | application의 stale count가 seed를 사실상 결정했습니다. | DB unique constraint와 locked transaction의 `max(seed)+1`이 결정합니다. | `3aa5958bb967`, `d9a6d8dd8950` | <!-- LEARNER:thread-05:ownership:1 --> _(학습자 작성)_ |
| Capacity decision | 각 request가 독립 count를 읽고 신규 참가를 허용했습니다. | 잠긴 tournament row 아래 transaction이 capacity와 final-slot winner를 소유합니다. | `d9a6d8dd8950` | <!-- LEARNER:thread-05:ownership:2 --> _(학습자 작성)_ |
| Bracket side effect | entry/status/bracket가 별도 statement/executor일 수 있었습니다. | 마지막 admission transaction이 running status와 semifinal rows를 함께 소유합니다. | `d9a6d8dd8950` | <!-- LEARNER:thread-05:ownership:3 --> _(학습자 작성)_ |
| Memory entrant | public lookup output이 source처럼 사용됐습니다. | canonical user Map이 identity source, mapper가 entry projection을 소유합니다. | `efdb5c3a4932` | <!-- LEARNER:thread-05:ownership:4 --> _(학습자 작성)_ |

## 9. Thread 최종 상태

<!-- LEARNER:thread-05:final-state --> _(학습자 작성)_

## 10. 최종 실행 흐름

<!-- LEARNER:thread-05:flow --> _(학습자 작성)_

## 11. 학습 완료 확인

- [ ] seed uniqueness와 capacity serialization이 서로 다른 불변식임을 설명할 수 있습니다.
- [ ] `FOR UPDATE` row와 모든 admission의 lock 순서를 설명할 수 있습니다.
- [ ] existing-entry check가 full check보다 먼저인 rejoin 의미를 설명할 수 있습니다.
- [ ] entry·status·bracket가 같은 transaction이어야 하는 failure/rollback 이유를 설명할 수 있습니다.
- [ ] commit 후 summary read failure의 non-guarantee를 설명할 수 있습니다.
- [ ] memory Promise test와 실제 PostgreSQL row-lock concurrency evidence를 구분할 수 있습니다.

## 12. 실행 및 증거 기록

<!-- LEARNER:thread-05:execution --> _(학습자 작성)_
