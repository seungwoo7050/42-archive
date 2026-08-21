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
| 직전 관련 상태 | <!-- LEARNER:0e850d24406e:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:0e850d24406e:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:0e850d24406e:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:0e850d24406e:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:0e850d24406e:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:0e850d24406e:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:0e850d24406e:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:0e850d24406e:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:0e850d24406e:later --> _(학습자 작성)_ |

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
| 직전 관련 상태 | <!-- LEARNER:4aa060c0b8df:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:4aa060c0b8df:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:4aa060c0b8df:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:4aa060c0b8df:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:4aa060c0b8df:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:4aa060c0b8df:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:4aa060c0b8df:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:4aa060c0b8df:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:4aa060c0b8df:later --> _(학습자 작성)_ |

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
| 직전 관련 상태 | <!-- LEARNER:9277572765e7:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:9277572765e7:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:9277572765e7:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:9277572765e7:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:9277572765e7:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:9277572765e7:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:9277572765e7:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:9277572765e7:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:9277572765e7:later --> _(학습자 작성)_ |

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
| 직전 관련 상태 | <!-- LEARNER:fb516f723cdf:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:fb516f723cdf:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:fb516f723cdf:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:fb516f723cdf:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:fb516f723cdf:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:fb516f723cdf:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:fb516f723cdf:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:fb516f723cdf:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:fb516f723cdf:later --> _(학습자 작성)_ |

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
| 직전 관련 상태 | <!-- LEARNER:c5b96a06925c:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:c5b96a06925c:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:c5b96a06925c:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:c5b96a06925c:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:c5b96a06925c:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:c5b96a06925c:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:c5b96a06925c:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:c5b96a06925c:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:c5b96a06925c:later --> _(학습자 작성)_ |

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
| 직전 관련 상태 | <!-- LEARNER:0364c42f776b:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:0364c42f776b:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:0364c42f776b:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:0364c42f776b:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:0364c42f776b:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:0364c42f776b:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:0364c42f776b:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:0364c42f776b:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:0364c42f776b:later --> _(학습자 작성)_ |

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
| 직전 관련 상태 | <!-- LEARNER:8ab49e5f2dd4:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:8ab49e5f2dd4:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:8ab49e5f2dd4:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:8ab49e5f2dd4:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:8ab49e5f2dd4:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:8ab49e5f2dd4:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:8ab49e5f2dd4:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:8ab49e5f2dd4:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:8ab49e5f2dd4:later --> _(학습자 작성)_ |

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
| 직전 관련 상태 | <!-- LEARNER:c7ea1ff241c8:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:c7ea1ff241c8:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:c7ea1ff241c8:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:c7ea1ff241c8:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:c7ea1ff241c8:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:c7ea1ff241c8:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:c7ea1ff241c8:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:c7ea1ff241c8:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:c7ea1ff241c8:later --> _(학습자 작성)_ |

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
| 직전 관련 상태 | <!-- LEARNER:6509e32ba95d:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:6509e32ba95d:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:6509e32ba95d:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:6509e32ba95d:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:6509e32ba95d:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:6509e32ba95d:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:6509e32ba95d:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:6509e32ba95d:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:6509e32ba95d:later --> _(학습자 작성)_ |

#### Test commit 학습 기록

| 항목 | 기록 |
| --- | --- |
| 검증 대상 불변식 | <!-- LEARNER:6509e32ba95d:test:invariant --> _(학습자 작성)_ |
| 재현한 실패·경계 | <!-- LEARNER:6509e32ba95d:test:boundary --> _(학습자 작성)_ |
| 시험 기법 | <!-- LEARNER:6509e32ba95d:test:technique --> _(학습자 작성)_ |
| 통과하는 실제 코드 경로 | <!-- LEARNER:6509e32ba95d:test:path --> _(학습자 작성)_ |
| 시험이 증명하는 것 | <!-- LEARNER:6509e32ba95d:test:proves --> _(학습자 작성)_ |
| 시험이 증명하지 않는 것 | <!-- LEARNER:6509e32ba95d:test:not_proves --> _(학습자 작성)_ |
| 막으려는 회귀 | <!-- LEARNER:6509e32ba95d:test:regression --> _(학습자 작성)_ |

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
| 직전 관련 상태 | <!-- LEARNER:035b97ca7c58:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:035b97ca7c58:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:035b97ca7c58:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:035b97ca7c58:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:035b97ca7c58:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:035b97ca7c58:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:035b97ca7c58:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:035b97ca7c58:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:035b97ca7c58:later --> _(학습자 작성)_ |

#### 최소 코드 근거

<!-- LEARNER:035b97ca7c58:evidence --> _(학습자 작성)_

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
| 직전 관련 상태 | <!-- LEARNER:6b661420e060:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:6b661420e060:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:6b661420e060:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:6b661420e060:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:6b661420e060:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:6b661420e060:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:6b661420e060:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:6b661420e060:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:6b661420e060:later --> _(학습자 작성)_ |

#### Test commit 학습 기록

| 항목 | 기록 |
| --- | --- |
| 검증 대상 불변식 | <!-- LEARNER:6b661420e060:test:invariant --> _(학습자 작성)_ |
| 재현한 실패·경계 | <!-- LEARNER:6b661420e060:test:boundary --> _(학습자 작성)_ |
| 시험 기법 | <!-- LEARNER:6b661420e060:test:technique --> _(학습자 작성)_ |
| 통과하는 실제 코드 경로 | <!-- LEARNER:6b661420e060:test:path --> _(학습자 작성)_ |
| 시험이 증명하는 것 | <!-- LEARNER:6b661420e060:test:proves --> _(학습자 작성)_ |
| 시험이 증명하지 않는 것 | <!-- LEARNER:6b661420e060:test:not_proves --> _(학습자 작성)_ |
| 막으려는 회귀 | <!-- LEARNER:6b661420e060:test:regression --> _(학습자 작성)_ |

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
| 직전 관련 상태 | <!-- LEARNER:e935054ce0c9:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:e935054ce0c9:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:e935054ce0c9:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:e935054ce0c9:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:e935054ce0c9:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:e935054ce0c9:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:e935054ce0c9:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:e935054ce0c9:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:e935054ce0c9:later --> _(학습자 작성)_ |

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
| 직전 관련 상태 | <!-- LEARNER:c43b87694b29:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:c43b87694b29:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:c43b87694b29:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:c43b87694b29:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:c43b87694b29:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:c43b87694b29:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:c43b87694b29:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:c43b87694b29:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:c43b87694b29:later --> _(학습자 작성)_ |

#### 최소 코드 근거

<!-- LEARNER:c43b87694b29:evidence --> _(학습자 작성)_

#### Test commit 학습 기록

| 항목 | 기록 |
| --- | --- |
| 검증 대상 불변식 | <!-- LEARNER:c43b87694b29:test:invariant --> _(학습자 작성)_ |
| 재현한 실패·경계 | <!-- LEARNER:c43b87694b29:test:boundary --> _(학습자 작성)_ |
| 시험 기법 | <!-- LEARNER:c43b87694b29:test:technique --> _(학습자 작성)_ |
| 통과하는 실제 코드 경로 | <!-- LEARNER:c43b87694b29:test:path --> _(학습자 작성)_ |
| 시험이 증명하는 것 | <!-- LEARNER:c43b87694b29:test:proves --> _(학습자 작성)_ |
| 시험이 증명하지 않는 것 | <!-- LEARNER:c43b87694b29:test:not_proves --> _(학습자 작성)_ |
| 막으려는 회귀 | <!-- LEARNER:c43b87694b29:test:regression --> _(학습자 작성)_ |

#### 비교 기준

- parent 상태와 `c43b87694b29`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `e935054ce0c9`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.

## 6. 불변식 변화

| 단계 | 관련 SHA | 조사 초점 | 학습자 기록 |
| --- | --- | --- | --- |
| Durable model 도입 | `0e850d24406e` | row identity·FK lifetime·초기 unique/index의 범위를 구분합니다. | <!-- LEARNER:thread-01:invariant:1 --> _(학습자 작성)_ |
| Typed translation 경계 | `4aa060c0b8df` | DB row와 public/session DTO의 노출 범위를 추적합니다. | <!-- LEARNER:thread-01:invariant:2 --> _(학습자 작성)_ |
| Backend lifecycle·surface | `9277572765e7` → `c7ea1ff241c8` | factory·close·operation 확장과 parity의 실제 범위를 기록합니다. | <!-- LEARNER:thread-01:invariant:3 --> _(학습자 작성)_ |
| 파생 read-model correction | `035b97ca7c58` → `6b661420e060` | fabricated metric이 repository evidence 기반 계산으로 바뀌는 과정을 설명합니다. | <!-- LEARNER:thread-01:invariant:4 --> _(학습자 작성)_ |
| 실제 DB evidence | `e935054ce0c9` → `c43b87694b29` | 실행 경계·격리·cleanup이 만드는 보장 범위를 구분합니다. | <!-- LEARNER:thread-01:invariant:5 --> _(학습자 작성)_ |

## 7. Failure → Fix → Test 관계

| 관계 | Failure / 이전 가정 | Fix / 결정 | Test / 근거 | 학습자 기록 |
| --- | --- | --- | --- | --- |
| 1 | `c7ea1ff241c8`: PostgreSQL은 임의 수식, memory는 상수 3으로 `bestStreak`를 생성했습니다. | `035b97ca7c58`: recent match 결과를 chronological order로 순회하는 공통 계산기를 추가했습니다. | `6b661420e060`: `win→loss→win→win`과 newest-first 반환을 이용해 기대값 2를 검증합니다. | <!-- LEARNER:thread-01:relation:1 --> _(학습자 작성)_ |
| 2 | memory test만으로는 SQL·migration table·pool cleanup을 확인할 수 없었습니다. | `e935054ce0c9`: 전용 command와 Testcontainers dependency를 추가했습니다. | `c43b87694b29`: PostgreSQL 16, isolated schema, callback-failure cleanup을 구현했습니다. | <!-- LEARNER:thread-01:relation:2 --> _(학습자 작성)_ |

## 8. Ownership·상태·책임 변화

| 구간 | 이전 소유자/표현 | 이후 소유자/표현 | 관련 SHA | 학습자 기록 |
| --- | --- | --- | --- | --- |
| Schema와 row | 애플리케이션 상태의 durable owner가 없었습니다. | PostgreSQL table/FK가 row identity와 관계 lifetime을 소유합니다. | `0e850d24406e` | <!-- LEARNER:thread-01:ownership:1 --> _(학습자 작성)_ |
| DB shape → DTO | caller가 raw column을 직접 해석할 수 있었습니다. | row mapper가 이름·nullable·공개 field 변환을 소유합니다. | `4aa060c0b8df`, `8ab49e5f2dd4` | <!-- LEARNER:thread-01:ownership:2 --> _(학습자 작성)_ |
| 자원 lifecycle | Pool/Kysely 생성·종료가 caller 세부사항이었습니다. | repository factory가 구성하고 caller가 `close()`를 호출합니다. | `9277572765e7` | <!-- LEARNER:thread-01:ownership:3 --> _(학습자 작성)_ |
| Read-model 계산 | UI 또는 backend별 임의 계산으로 갈라질 수 있었습니다. | repository 공통 helper가 recent sequence에서 지표를 계산합니다. | `c7ea1ff241c8`, `035b97ca7c58` | <!-- LEARNER:thread-01:ownership:4 --> _(학습자 작성)_ |
| Integration resource | test 자원의 명시적 owner가 없었습니다. | suite와 helper가 container·schema·pool·repository cleanup을 소유합니다. | `c43b87694b29` | <!-- LEARNER:thread-01:ownership:5 --> _(학습자 작성)_ |

## 9. Thread 최종 상태

<!-- LEARNER:thread-01:final-state --> _(학습자 작성)_

## 10. 최종 실행 흐름

<!-- LEARNER:thread-01:flow --> _(학습자 작성)_

## 11. 학습 완료 확인

- [ ] 초기 SQL 제약과 나중에 보강된 불변식을 혼동하지 않고 설명할 수 있습니다.
- [ ] mapper의 compile-time 보장과 runtime non-guarantee를 구분할 수 있습니다.
- [ ] memory/PostgreSQL의 interface parity와 의미 parity 차이를 구체적인 filter·limit 사례로 설명할 수 있습니다.
- [ ] `bestStreak` fix의 이전 가정, root cause, corrected invariant와 regression을 연결할 수 있습니다.
- [ ] memory behavioral test와 PostgreSQL integration test의 증거 범위를 과장하지 않고 설명할 수 있습니다.

## 12. 실행 및 증거 기록

<!-- LEARNER:thread-01:execution --> _(학습자 작성)_
