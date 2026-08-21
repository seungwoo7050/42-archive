# Development Thread 04 — Canonical friendship과 동시 요청

## 1. 학습 목표

- 초기 directional friendship row와 memory summary가 왜 하나의 관계 identity를 표현하지 못하는지 설명합니다.
- legacy data normalization, self-check, canonical expression unique index의 적용 순서를 재구성합니다.
- PostgreSQL single-statement upsert가 repeat/reverse request를 어떤 state transition으로 원자화하는지 추적합니다.
- memory parity와 regression test의 실제 concurrency 증거 범위를 과장하지 않고 구분합니다.

## 2. 범위와 경계

- 포함: friendship repository operation, canonical-pair migration, PostgreSQL atomic request, memory relationship record, cross-backend regression.
- `cdaca35ccf7f`에서는 friendship assertion만 이 Thread의 핵심 근거로 사용합니다. 같은 commit의 tournament test는 Thread 5에서 다룹니다.
- 제외: profile/friend HTTP authorization, guest capability, browser cache invalidation은 auth/web category 책임입니다.
- 제외: friendship 삭제·차단·notification policy는 이 history에 구현되지 않았으므로 일반론으로 채우지 않습니다.

## 3. 핵심 질문

- 왜 `(requester_id, addressee_id)` unique만으로 A↔B 관계 하나를 보장할 수 없습니까?
- 기존 duplicate를 정리하지 않고 canonical unique index를 추가하면 어떤 migration failure가 생깁니까?
- same-direction repeat와 reverse pending request는 각각 어떤 상태를 반환해야 합니까?
- PostgreSQL upsert에서 existing row와 `excluded` row의 방향 비교는 무엇을 결정합니까?
- memory parity test와 실제 concurrent database request 증거는 어떻게 다릅니까?

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags |
| ---: | --- | --- | :---: | --- |
| 1 | `645e5a3c8e96` | `feat(db): 친구 관계 저장 구현` | B | PERSISTENCE |
| 2 | `ffb0a8275a4f` | `feat(db): friendship canonical pair 제약 추가` | A | PERSISTENCE, RISK |
| 3 | `77c555aba9a0` | `feat(db): PostgreSQL friendship 요청을 원자화` | A | PERSISTENCE, RISK |
| 4 | `34db79005f30` | `feat(db): memory friendship invariant 적용` | B | PERSISTENCE |
| 5 | `cdaca35ccf7f` | `test(db): friendship와 tournament 경쟁 상태 검증` | A | PERSISTENCE, TOURNAMENT, RISK |

## 5. Commit별 조사

### 5.1. `645e5a3c8e96` — feat(db): 친구 관계 저장 구현

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `645e5a3c8e96` |
| Importance | B |
| Tags | PERSISTENCE |
| Source role | friendship list/request/accept를 처음 repository contract에 올리지만 관계 identity가 요청 방향과 backend 표현에 묶여 있습니다. |

#### 해당 SHA에서 확인할 실제 코드

- `AppRepository`의 `listFriends`, `requestFriend`, `acceptFriend` signature를 확인합니다.
- PostgreSQL `listFriends`의 `case when requester_id = userId then addressee_id else requester_id end` join을 추적합니다.
- `requestFriend`의 초기 `on conflict (requester_id, addressee_id)`가 같은 방향만 충돌로 보는지 확인합니다.
- `acceptFriend`의 `where id = friendshipId and addressee_id = userId` authorization 조건을 확인합니다.
- memory 구현이 `FriendSummary[]`만 저장하고 requester/addressee identity를 보존하지 않는 차이를 기록합니다.
- 자기 자신 요청과 reverse duplicate를 DB 제약/코드가 아직 막지 않는다는 점을 확인합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | friendship table은 초기 schema에 있었지만 repository에서 관계를 생성·조회·수락할 operation이 없었습니다. |
| 해결하려던 문제 | social route가 raw SQL을 직접 다루지 않고 양쪽 사용자가 같은 관계를 조회할 수 있어야 했습니다. |
| 핵심 결정 | 공통 interface에 list/request/accept를 추가하고 PostgreSQL은 directional row, memory는 caller-facing `FriendSummary` 배열로 구현했습니다. |
| 입력 → 상태 전이 → 출력 | requester+상대 handle → user lookup → pending row/summary 생성; list → requester/addressee 어느 쪽인지 계산해 상대 user join; accept → addressee가 지정 row status를 accepted로 변경합니다. |
| ownership / lifetime / cleanup | PostgreSQL row는 두 user ID와 방향을 소유하지만 memory 배열은 requester/addressee를 버리고 public summary만 소유합니다. 이 차이가 이후 parity 문제의 원인입니다. |
| failure / rollback / retry | 동일 방향 재요청은 upsert되지만 역방향 요청은 별도 row가 될 수 있습니다. self-friend도 허용될 수 있고 memory accept는 actor 권한을 충분히 확인하지 않습니다. |
| 보장하는 것 | 기본 friendship lifecycle과 addressee-only accept 조건을 PostgreSQL path에 제공합니다. |
| 보장하지 않는 것 | unordered pair당 한 관계, self-friend 금지, reverse pending 자동 수락, backend parity, concurrent request atomicity는 보장하지 않습니다. |
| 후속 연결 | `ffb0a8275a4f`가 기존 데이터를 정규화하고 canonical pair를 DB invariant로 만들며 `34db79005f30`이 memory 표현을 같은 의미로 바꿉니다. |

#### 비교 기준

- parent 상태와 `645e5a3c8e96`의 diff를 먼저 비교합니다.
- 후속 관련 SHA `ffb0a8275a4f`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.2. `ffb0a8275a4f` — feat(db): friendship canonical pair 제약 추가

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `ffb0a8275a4f` |
| Importance | A |
| Tags | PERSISTENCE, RISK |
| Source role | 기존 directional friendship 데이터를 정리한 뒤 unordered user pair당 하나의 row만 허용하는 migration을 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/migrations/004_friendship_tournament_invariants.sql`에서 self row 삭제가 가장 먼저 수행되는지 확인합니다.
- reverse pair가 있고 한쪽이 pending일 때 accepted로 승격하고 `greatest(updated_at)`를 사용하는 update를 추적합니다.
- `row_number() over (partition by least(...), greatest(...))`의 survivor 우선순위 accepted → created_at → id를 확인합니다.
- 기존 directional unique constraint drop과 `friendships_distinct_users_check` 추가를 확인합니다.
- `friendships_canonical_pair_unique` expression index가 requester/addressee 순서를 무시하는지 확인합니다.
- 데이터 정규화와 constraint 설치가 한 migration apply 안에서 수행되는 이유를 설명합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | 초기 schema의 unique는 `(requester_id, addressee_id)` 순서를 보존해 A→B와 B→A가 서로 다른 관계로 저장됐고 self row도 막지 못했습니다. |
| 해결하려던 문제 | 새 constraint만 바로 추가하면 기존 reverse duplicate와 self row 때문에 migration이 실패하거나 어느 상태를 보존할지 불명확했습니다. |
| 핵심 결정 | migration이 self row를 삭제하고 reverse pending을 accepted로 합친 뒤 canonical pair별 survivor를 deterministic하게 남기고 expression unique/check를 설치합니다. |
| 입력 → 상태 전이 → 출력 | 기존 rows → self 삭제 → reverse 상태 reconciliation → canonical pair partition/rank → 중복 삭제 → directional unique 제거 → distinct-user CHECK와 unordered expression UNIQUE 설치입니다. |
| ownership / lifetime / cleanup | migration이 legacy data normalization과 새 DB invariant 설치를 소유합니다. PostgreSQL index가 이후 모든 writer의 unordered identity를 소유합니다. |
| failure / rollback / retry | 삭제되는 중복 row의 외부 참조가 있었다면 영향이 생길 수 있으나 초기 schema에는 해당 friendship ID를 참조하는 별도 FK가 없습니다. migration 실패 시 새 constraint는 적용되지 않습니다. |
| 보장하는 것 | 자기 관계를 DB에서 거부하고 requester/addressee 순서와 무관하게 한 pair당 한 row만 저장되도록 합니다. |
| 보장하지 않는 것 | 요청이 어떤 상태 전이를 해야 하는지, concurrent writer가 어떤 row를 반환하는지, memory backend parity는 아직 보장하지 않습니다. |
| 후속 연결 | `77c555aba9a0`이 expression index를 conflict target으로 사용하는 atomic upsert를 추가하고 `cdaca35ccf7f`가 실제 DB row 하나를 검증합니다. |

#### 최소 코드 근거

- `004_friendship_tournament_invariants.sql` — `least(requester_id, addressee_id), greatest(...)` expression unique index가 방향과 무관한 관계 identity를 DB에 강제합니다.

#### 비교 기준

- parent 상태와 `ffb0a8275a4f`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `645e5a3c8e96`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `77c555aba9a0`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.3. `77c555aba9a0` — feat(db): PostgreSQL friendship 요청을 원자화

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `77c555aba9a0` |
| Importance | A |
| Tags | PERSISTENCE, RISK |
| Source role | canonical expression index를 conflict target으로 사용해 repeat/reverse friendship request를 한 SQL statement에서 처리합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `PostgresRepository.requestFriend`의 self-check와 상대 user lookup 순서를 확인합니다.
- `insert ... on conflict ((least(...)), (greatest(...))) do update` 전체 SQL을 추적합니다.
- 기존 pending row의 방향이 `excluded`와 반대일 때만 status를 accepted로 바꾸는 `case`를 확인합니다.
- 동일 방향 재요청에서는 status와 `updated_at`을 유지해 idempotent readback이 되는지 확인합니다.
- `returning id, status`가 conflict insert/update 모두에서 같은 relationship identity를 반환하는지 확인합니다.
- `acceptFriend`가 authorized update 뒤 `returning requester_id`로 상대를 조회하며 0-row update가 `firstRow` failure가 되는지 확인합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | DB constraint는 unordered duplicate를 막았지만 기존 request code는 directional conflict target을 사용해 새 index와 맞지 않았고 reverse request의 상태 전이를 여러 query로 처리할 수 있었습니다. |
| 해결하려던 문제 | repeat·reverse 요청이 동시에 와도 한 row ID를 유지하고 reverse pending은 accepted로 바뀌어야 했습니다. |
| 핵심 결정 | canonical expression conflict target과 conditional `DO UPDATE`를 사용해 insert, same-direction no-op, reverse-pending accept를 한 statement로 표현했습니다. |
| 입력 → 상태 전이 → 출력 | 상대 handle lookup/self-check → pending insert 시도 → unordered pair conflict 시 existing/excluded 방향 비교 → reverse pending이면 accepted+timestamp 갱신, 아니면 기존 상태 유지 → id/status 반환입니다. |
| ownership / lifetime / cleanup | PostgreSQL unique index가 pair identity를, single SQL statement가 state transition atomicity를 소유합니다. caller는 반환 summary만 받습니다. |
| failure / rollback / retry | 없는 상대·self는 statement 전에 실패합니다. accept에서 addressee 조건에 맞는 row가 없으면 `RETURNING`이 비어 `firstRow`가 실패합니다. transaction 밖 상대 user 조회 사이에 account state가 바뀔 수는 있습니다. |
| 보장하는 것 | 같은 방향 반복은 같은 pending row, 반대 방향 pending request는 같은 row의 accepted 상태를 반환하며 duplicate row를 만들지 않습니다. |
| 보장하지 않는 것 | memory backend, 분산 DB 간 global uniqueness, friendship 삭제/차단 policy, serializable isolation 전체는 보장하지 않습니다. |
| 후속 연결 | `34db79005f30`이 동일 state model을 memory에 적용하고 `cdaca35ccf7f`가 양방향·반복 요청과 direct SQL row count를 검증합니다. |

#### 최소 코드 근거

- `PostgresRepository.requestFriend` — canonical pair expression을 conflict target으로 사용하고 reverse pending일 때만 `status = 'accepted'`로 바꾸는 단일 upsert입니다.

#### 비교 기준

- parent 상태와 `77c555aba9a0`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `ffb0a8275a4f`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `34db79005f30`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.4. `34db79005f30` — feat(db): memory friendship invariant 적용

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `34db79005f30` |
| Importance | B |
| Tags | PERSISTENCE |
| Source role | memory 저장 표현을 caller-specific summary에서 requester/addressee ID를 보존하는 canonical relationship record로 바꿉니다. |

#### 해당 SHA에서 확인할 실제 코드

- `MemoryFriendship { id, requesterId, addresseeId, status }`와 기존 `FriendSummary[]`를 비교합니다.
- `listFriends(userId)`가 actor와 관련된 row만 filter하고 other user ID를 계산하는지 확인합니다.
- `requestFriend`의 self-check, unordered existing lookup, reverse pending→accepted, same-direction repeat 반환을 추적합니다.
- `acceptFriend`가 `friend.addresseeId === userId`를 요구하는지 확인합니다.
- memory user 원본 lookup 실패와 public projection 생성 경로를 확인합니다.
- 동시 Promise가 실제 thread lock이 아니라 JS call-stack 수준의 순차 mutation이라는 한계를 기록합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | memory backend는 friendship의 두 주체를 저장하지 않아 사용자별 목록·accept authorization·reverse request 의미를 PostgreSQL처럼 재현할 수 없었습니다. |
| 해결하려던 문제 | 공통 interface 뒤에서 동일 테스트를 돌리려면 memory도 관계 identity와 방향을 원본 상태로 보존해야 했습니다. |
| 핵심 결정 | `MemoryFriendship` record를 도입하고 list/request/accept가 requester/addressee ID에서 상대와 권한을 계산하도록 했습니다. |
| 입력 → 상태 전이 → 출력 | requester+상대 → self 검사 → unordered existing 검색 → same 방향이면 기존 반환, reverse pending이면 status accepted, 없으면 새 pending record 저장; list/accept는 actor ID로 projection합니다. |
| ownership / lifetime / cleanup | memory repository가 relation record와 user Map을 process lifetime 동안 소유하고 반환 시 other user를 새 public projection으로 만듭니다. |
| failure / rollback / retry | 없는 user/unauthorized accept는 실패합니다. JS memory method에는 DB row lock·transaction rollback이 없으며 여러 process 사이의 상태는 공유되지 않습니다. |
| 보장하는 것 | self-reject, unordered one-record identity, repeated request idempotence, reverse pending accept와 addressee-only acceptance를 memory semantics에 반영합니다. |
| 보장하지 않는 것 | durability, cross-process concurrency, DB constraint 수준의 강제, mutation failure rollback은 보장하지 않습니다. |
| 후속 연결 | `cdaca35ccf7f`가 같은 scenario를 memory와 PostgreSQL에 적용해 observable parity를 검증합니다. |

#### 비교 기준

- parent 상태와 `34db79005f30`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `77c555aba9a0`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `cdaca35ccf7f`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.5. `cdaca35ccf7f` — test(db): friendship와 tournament 경쟁 상태 검증

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `cdaca35ccf7f` |
| Importance | A |
| Tags | PERSISTENCE, TOURNAMENT, RISK |
| Source role | 같은 test commit의 friendship 부분에서 self/repeat/reverse 요청과 canonical DB row를 memory·PostgreSQL 양쪽에 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.test.ts`의 `keeps one friendship for both request directions`를 확인합니다.
- self request rejection, same-direction repeat equality, reverse request의 same ID/accepted 상태를 순서대로 추적합니다.
- 양쪽 `listFriends`가 동일 relationship ID와 상대 user를 반환하는 assertion을 확인합니다.
- `packages/db/src/postgres.integration.test.ts`의 PostgreSQL 동일 scenario와 direct `select requester_id, addressee_id, status from friendships`를 확인합니다.
- self row direct insert가 `friendships_distinct_users_check` constraint로 거부되는 assertion을 확인합니다.
- tournament final-slot test는 Thread 5에서 별도 해석하고 이 Thread에서는 friendship evidence만 사용합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | canonical migration, PostgreSQL upsert, memory record가 구현됐지만 같은 observable scenario에서 한 relationship identity를 유지하는지 regression evidence가 필요했습니다. |
| 해결하려던 문제 | self request, 같은 방향 반복, 반대 방향 요청은 초기 구현이 각각 self row·duplicate/no-op inconsistency를 만들던 경계입니다. |
| 핵심 결정 | memory unit scenario와 Testcontainers PostgreSQL scenario에 동일한 요청 순서를 적용하고 public 결과와 raw DB row를 함께 assertion했습니다. |
| 입력 → 상태 전이 → 출력 | 두 사용자 생성 → self reject → A→B pending → A→B repeat → B→A reverse accepted → 양쪽 list 확인 → PostgreSQL raw table 한 row와 CHECK rejection 확인입니다. |
| ownership / lifetime / cleanup | 각 test repository가 relationship state를 소유하고 integration harness가 schema/pool cleanup을 소유합니다. |
| failure / rollback / retry | memory는 실제 병렬 요청이 아니라 Promise가 순차적으로 실행되는 process-local behavior입니다. PostgreSQL test도 reverse request는 순차이며 friendship에 대한 simultaneous race를 직접 발사하지는 않습니다. |
| 보장하는 것 | self 금지, repeat idempotence, reverse transition, 양쪽 projection, raw canonical one-row invariant가 두 backend에서 유지됨을 코드상 검증합니다. |
| 보장하지 않는 것 | 분산 transaction, 높은 동시성 throughput, deadlock, 삭제/차단 policy, 이 세션에서의 실제 test 통과는 증명하지 않습니다. |
| 후속 연결 | 후속 refactor가 pair ordering이나 actor projection을 바꾸면 public/DB assertion이 회귀를 탐지합니다. |

#### 최소 코드 근거

- `postgres.integration.test.ts` — public repository 결과 뒤 raw `friendships` table이 정확히 한 accepted row인지 확인하고 self insert의 constraint 이름까지 검사합니다.

#### Test commit 학습 기록

| 항목 | 기록 |
| --- | --- |
| 검증 대상 불변식 | unordered user pair당 하나의 friendship ID가 있고 self relation은 없으며 reverse pending request는 accepted로 전이해야 합니다. |
| 재현한 실패·경계 | self request, same-direction repeat, reverse-direction request, 양쪽 list view, direct self-row insert입니다. |
| 시험 기법 | memory behavioral test와 real-PostgreSQL integration/constraint test를 결합합니다. |
| 통과하는 실제 코드 경로 | `requestFriend`, `listFriends`, `acceptFriend` 관련 memory/PG code, canonical unique index와 distinct-users CHECK입니다. |
| 시험이 증명하는 것 | 정해진 request sequence에서 두 backend가 같은 public 의미를 보이고 PostgreSQL table에는 한 row만 남는다는 것을 증명합니다. |
| 시험이 증명하지 않는 것 | friendship 요청을 진짜 동시에 발사하는 race, multi-process memory, production load와 본 세션의 실행 결과는 증명하지 않습니다. |
| 막으려는 회귀 | directional duplicate, self row, reverse pending이 별도 관계로 남는 회귀를 막습니다. |

#### 비교 기준

- parent 상태와 `cdaca35ccf7f`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `34db79005f30`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.

## 6. 불변식 변화

| 단계 | 관련 SHA | 조사 초점 | 학습자 기록 |
| --- | --- | --- | --- |
| Directional initial model | `645e5a3c8e96` | 초기 DB·memory 관계 identity와 authorization 차이를 기록합니다. | PostgreSQL은 방향을 가진 두 ID를 저장하지만 reverse duplicate를 허용하고, memory는 actor identity 자체를 버린 `FriendSummary[]`라 양쪽 projection과 accept 권한을 정확히 표현하지 못했습니다. |
| Canonical DB identity | `ffb0a8275a4f` | legacy cleanup과 새 constraint 설치 순서를 설명합니다. | self rows 제거, reverse 상태 reconciliation, deterministic survivor 선택 뒤 directional unique를 canonical expression index와 distinct-user CHECK로 교체합니다. |
| Atomic PostgreSQL transition | `77c555aba9a0` | insert/repeat/reverse 상태 전이를 한 statement에서 추적합니다. | unordered expression conflict가 한 row를 선택하고 reverse pending인 경우만 accepted로 갱신합니다. 같은 방향 repeat는 ID·status·timestamp를 유지합니다. |
| Memory semantic parity | `34db79005f30` | 관계 원본과 caller projection을 분리합니다. | memory는 requester/addressee ID를 원본 record로 저장하고 actor별 other-user projection을 매번 구성합니다. DB lock과 durability는 제공하지 않습니다. |
| Regression evidence | `cdaca35ccf7f` | public result와 raw row constraint를 연결합니다. | 두 backend에서 self/repeat/reverse/list scenario를 검증하고 PostgreSQL table의 한 accepted row 및 CHECK 위반을 직접 확인합니다. simultaneous friendship race는 직접 실행하지 않습니다. |

## 7. Failure → Fix → Test 관계

| 관계 | Failure / 이전 가정 | Fix / 결정 | Test / 근거 | 학습자 기록 |
| --- | --- | --- | --- | --- |
| 1 | A→B와 B→A가 별도 row가 되고 self row도 허용될 수 있었습니다. | `ffb0a8275a4f`가 legacy data를 정리하고 canonical unique/CHECK를 설치했습니다. | `cdaca35ccf7f`가 raw table one-row와 self constraint rejection을 확인합니다. | DB가 unordered identity의 최종 enforcement owner가 됩니다. migration은 기존 데이터를 deterministic하게 수렴시킨 뒤 제약을 설치합니다. |
| 2 | 초기 request code는 directional conflict만 처리하고 reverse pending의 의미를 여러 operation에 남겼습니다. | `77c555aba9a0`이 canonical conflict target과 conditional update로 한 statement에 넣었습니다. | `cdaca35ccf7f`가 same ID, pending→accepted, 양쪽 projection을 확인합니다. | unique index와 upsert가 같은 canonical expression을 사용해야 conflict detection과 state transition이 일치합니다. |
| 3 | memory `FriendSummary[]`는 requester/addressee를 잃어 PostgreSQL 의미를 재현하지 못했습니다. | `34db79005f30`이 `MemoryFriendship`을 도입했습니다. | `cdaca35ccf7f`의 memory scenario입니다. | 원본 relation state와 caller-specific read model을 분리해 parity를 복구하지만 process-local mutation이라는 한계는 남습니다. |

## 8. Ownership·상태·책임 변화

| 구간 | 이전 소유자/표현 | 이후 소유자/표현 | 관련 SHA | 학습자 기록 |
| --- | --- | --- | --- | --- |
| 관계 identity | 요청 방향 또는 caller-facing summary가 identity를 사실상 정의했습니다. | DB canonical expression과 memory unordered lookup이 pair identity를 정의합니다. | `ffb0a8275a4f`, `34db79005f30` | ID 하나가 양쪽 사용자에게 공유되고 projection만 actor에 따라 달라집니다. |
| 상태 전이 | insert·accept·list 조합에 분산됐습니다. | PostgreSQL request upsert가 reverse pending transition을 원자적으로 소유합니다. | `77c555aba9a0` | DB statement completion 시점에 row ID/status가 결정되며 caller는 `RETURNING` 결과를 소비합니다. |
| Authorization | memory accept가 actor identity를 보존하지 못했습니다. | 두 backend가 addressee ID를 확인합니다. | `645e5a3c8e96`, `34db79005f30` | PostgreSQL은 `WHERE addressee_id=userId`, memory는 record field 비교로 unauthorized accept를 실패시킵니다. |
| Legacy data | reverse/self rows가 이미 존재할 수 있었습니다. | migration이 cleanup·survivor selection·constraint install을 소유합니다. | `ffb0a8275a4f` | application writer를 바꾸기 전에 저장된 데이터가 새 invariant를 만족하도록 정규화됩니다. |

## 9. Thread 최종 상태

최종 상태에서 friendship은 requester/addressee 순서와 무관한 사용자 pair 하나로 식별됩니다. PostgreSQL은 distinct-user CHECK와 canonical expression unique index를 최종 enforcement owner로 사용하고, request는 한 upsert에서 반복·역방향 상태를 결정합니다. memory는 같은 관계 record와 actor-specific projection을 구현합니다. 시험은 주요 sequence와 raw constraint를 검증하지만 simultaneous friendship request 부하나 multi-process memory consistency까지 증명하지 않습니다.

## 10. 최종 실행 흐름

1. caller가 requester ID와 상대 handle로 `requestFriend`를 호출하고 repository가 상대 user를 찾은 뒤 self 요청을 거부합니다.
2. PostgreSQL은 pending insert를 시도하고 canonical pair conflict 시 existing/excluded 방향을 비교합니다.
3. same-direction repeat는 기존 row를 유지하고 reverse pending은 같은 row ID에서 accepted로 전이합니다.
4. memory는 unordered pair를 배열에서 찾아 같은 상태 규칙을 process-local object에 적용합니다.
5. `listFriends(userId)`는 관계 원본에서 other user ID를 계산해 actor별 `FriendSummary`를 만듭니다.
6. regression test는 public 결과, 양쪽 view, raw PostgreSQL row와 self CHECK를 서로 연결합니다.

## 11. 학습 완료 확인

- [x] directional unique와 canonical unordered unique의 차이를 SQL expression으로 설명할 수 있습니다.
- [x] migration의 self 삭제·상태 reconciliation·survivor rank·constraint 설치 순서를 설명할 수 있습니다.
- [x] same-direction repeat와 reverse pending upsert의 `CASE` 조건을 설명할 수 있습니다.
- [x] memory relationship 원본과 caller-specific projection을 구분할 수 있습니다.
- [x] `cdaca35ccf7f`가 friendship에 대해 실제 simultaneous race를 증명하지 않는다는 점을 명시할 수 있습니다.

## 12. 실행 및 증거 기록

- 저장소 실행 시험: 실행하지 않았습니다.
- 이유: 로컬 `git clone --branch web/ft_transcendence --single-branch`가 DNS 해석 실패(`Could not resolve host: github.com`)로 중단되어 의존성을 포함한 실행 가능한 checkout을 만들 수 없었습니다.
- 코드 근거: 지정 브랜치의 source classification과 각 exact SHA의 GitHub commit diff를 확인했습니다. 따라서 본 문서의 시험 설명은 실제 시험 코드의 정적 검토 결과이며, 이 환경에서의 통과 결과가 아닙니다.
