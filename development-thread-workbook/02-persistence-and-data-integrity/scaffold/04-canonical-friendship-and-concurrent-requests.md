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
| 직전 관련 상태 | <!-- LEARNER:645e5a3c8e96:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:645e5a3c8e96:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:645e5a3c8e96:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:645e5a3c8e96:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:645e5a3c8e96:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:645e5a3c8e96:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:645e5a3c8e96:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:645e5a3c8e96:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:645e5a3c8e96:later --> _(학습자 작성)_ |

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
| 직전 관련 상태 | <!-- LEARNER:ffb0a8275a4f:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:ffb0a8275a4f:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:ffb0a8275a4f:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:ffb0a8275a4f:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:ffb0a8275a4f:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:ffb0a8275a4f:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:ffb0a8275a4f:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:ffb0a8275a4f:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:ffb0a8275a4f:later --> _(학습자 작성)_ |

#### 최소 코드 근거

<!-- LEARNER:ffb0a8275a4f:evidence --> _(학습자 작성)_

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
| 직전 관련 상태 | <!-- LEARNER:77c555aba9a0:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:77c555aba9a0:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:77c555aba9a0:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:77c555aba9a0:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:77c555aba9a0:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:77c555aba9a0:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:77c555aba9a0:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:77c555aba9a0:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:77c555aba9a0:later --> _(학습자 작성)_ |

#### 최소 코드 근거

<!-- LEARNER:77c555aba9a0:evidence --> _(학습자 작성)_

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
| 직전 관련 상태 | <!-- LEARNER:34db79005f30:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:34db79005f30:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:34db79005f30:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:34db79005f30:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:34db79005f30:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:34db79005f30:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:34db79005f30:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:34db79005f30:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:34db79005f30:later --> _(학습자 작성)_ |

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
- 이 Thread의 직전 관련 SHA `34db79005f30`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.

## 6. 불변식 변화

| 단계 | 관련 SHA | 조사 초점 | 학습자 기록 |
| --- | --- | --- | --- |
| Directional initial model | `645e5a3c8e96` | 초기 DB·memory 관계 identity와 authorization 차이를 기록합니다. | <!-- LEARNER:thread-04:invariant:1 --> _(학습자 작성)_ |
| Canonical DB identity | `ffb0a8275a4f` | legacy cleanup과 새 constraint 설치 순서를 설명합니다. | <!-- LEARNER:thread-04:invariant:2 --> _(학습자 작성)_ |
| Atomic PostgreSQL transition | `77c555aba9a0` | insert/repeat/reverse 상태 전이를 한 statement에서 추적합니다. | <!-- LEARNER:thread-04:invariant:3 --> _(학습자 작성)_ |
| Memory semantic parity | `34db79005f30` | 관계 원본과 caller projection을 분리합니다. | <!-- LEARNER:thread-04:invariant:4 --> _(학습자 작성)_ |
| Regression evidence | `cdaca35ccf7f` | public result와 raw row constraint를 연결합니다. | <!-- LEARNER:thread-04:invariant:5 --> _(학습자 작성)_ |

## 7. Failure → Fix → Test 관계

| 관계 | Failure / 이전 가정 | Fix / 결정 | Test / 근거 | 학습자 기록 |
| --- | --- | --- | --- | --- |
| 1 | A→B와 B→A가 별도 row가 되고 self row도 허용될 수 있었습니다. | `ffb0a8275a4f`가 legacy data를 정리하고 canonical unique/CHECK를 설치했습니다. | `cdaca35ccf7f`가 raw table one-row와 self constraint rejection을 확인합니다. | <!-- LEARNER:thread-04:relation:1 --> _(학습자 작성)_ |
| 2 | 초기 request code는 directional conflict만 처리하고 reverse pending의 의미를 여러 operation에 남겼습니다. | `77c555aba9a0`이 canonical conflict target과 conditional update로 한 statement에 넣었습니다. | `cdaca35ccf7f`가 same ID, pending→accepted, 양쪽 projection을 확인합니다. | <!-- LEARNER:thread-04:relation:2 --> _(학습자 작성)_ |
| 3 | memory `FriendSummary[]`는 requester/addressee를 잃어 PostgreSQL 의미를 재현하지 못했습니다. | `34db79005f30`이 `MemoryFriendship`을 도입했습니다. | `cdaca35ccf7f`의 memory scenario입니다. | <!-- LEARNER:thread-04:relation:3 --> _(학습자 작성)_ |

## 8. Ownership·상태·책임 변화

| 구간 | 이전 소유자/표현 | 이후 소유자/표현 | 관련 SHA | 학습자 기록 |
| --- | --- | --- | --- | --- |
| 관계 identity | 요청 방향 또는 caller-facing summary가 identity를 사실상 정의했습니다. | DB canonical expression과 memory unordered lookup이 pair identity를 정의합니다. | `ffb0a8275a4f`, `34db79005f30` | <!-- LEARNER:thread-04:ownership:1 --> _(학습자 작성)_ |
| 상태 전이 | insert·accept·list 조합에 분산됐습니다. | PostgreSQL request upsert가 reverse pending transition을 원자적으로 소유합니다. | `77c555aba9a0` | <!-- LEARNER:thread-04:ownership:2 --> _(학습자 작성)_ |
| Authorization | memory accept가 actor identity를 보존하지 못했습니다. | 두 backend가 addressee ID를 확인합니다. | `645e5a3c8e96`, `34db79005f30` | <!-- LEARNER:thread-04:ownership:3 --> _(학습자 작성)_ |
| Legacy data | reverse/self rows가 이미 존재할 수 있었습니다. | migration이 cleanup·survivor selection·constraint install을 소유합니다. | `ffb0a8275a4f` | <!-- LEARNER:thread-04:ownership:4 --> _(학습자 작성)_ |

## 9. Thread 최종 상태

<!-- LEARNER:thread-04:final-state --> _(학습자 작성)_

## 10. 최종 실행 흐름

<!-- LEARNER:thread-04:flow --> _(학습자 작성)_

## 11. 학습 완료 확인

- [ ] directional unique와 canonical unordered unique의 차이를 SQL expression으로 설명할 수 있습니다.
- [ ] migration의 self 삭제·상태 reconciliation·survivor rank·constraint 설치 순서를 설명할 수 있습니다.
- [ ] same-direction repeat와 reverse pending upsert의 `CASE` 조건을 설명할 수 있습니다.
- [ ] memory relationship 원본과 caller-specific projection을 구분할 수 있습니다.
- [ ] `cdaca35ccf7f`가 friendship에 대해 실제 simultaneous race를 증명하지 않는다는 점을 명시할 수 있습니다.

## 12. 실행 및 증거 기록

<!-- LEARNER:thread-04:execution --> _(학습자 작성)_
