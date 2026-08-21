# Development Thread 03 — Row mapping과 backend contract 정렬

## 1. 학습 목표

- 행 타입·memory stored record·mapper input/output의 중복 표현을 canonical schema로 모으는 refactor sequence를 재구성합니다.
- behavior-preserving refactor라는 주장을 각 exact diff의 변경 범위와 non-guarantee로 제한합니다.
- PostgreSQL relation assembly와 memory aggregate lookup에서 ownership이 어떻게 명시적으로 드러나는지 설명합니다.
- pure mapper regression test가 무엇을 고정하고 live query·transaction은 왜 증명하지 못하는지 구분합니다.

## 2. 범위와 경계

- 포함: user projection, memory match record, canonical row aliases, record view, explicit query shapes, tournament/admin relation helpers, memory aggregate lookup, mapper unit test.
- 제외: C-level formatting-only commits는 state·ownership·behavior 변화가 없어 추가하지 않았습니다.
- 제외: match finalization atomicity, admin audit transaction, tournament admission lock은 별도의 데이터 무결성 Thread에서 다룹니다.
- 이 Thread의 refactor는 runtime validation을 새로 제공하지 않습니다. TypeScript contract와 code reviewability가 중심입니다.

## 3. 핵심 질문

- write command와 stored record가 같은 타입을 공유하면 어떤 lifetime·확장 문제가 생깁니까?
- canonical row type은 실제 SQL constraint나 runtime validation과 어떻게 다릅니까?
- row mapper가 relation을 직접 조회하지 않고 caller가 related-data object를 조립하는 이유는 무엇입니까?
- memory child lookup이 aggregate와 child를 함께 반환하면 어떤 잘못된 mutation target을 줄입니까?
- pure mapper test로 behavior preservation을 어디까지 주장할 수 있습니까?

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags |
| ---: | --- | --- | :---: | --- |
| 1 | `73b8ce0f0c26` | `refactor(db): repository user projection 타입 정렬` | B | AUTH, PERSISTENCE |
| 2 | `3d0ae79affd5` | `refactor(db): memory match record 계약 정렬` | B | PERSISTENCE |
| 3 | `3e3f21129369` | `refactor(db): canonical row schema 타입 정렬` | B | PERSISTENCE, TOURNAMENT |
| 4 | `212650b2863d` | `refactor(db): row mapper record 타입 정렬` | B | PERSISTENCE, TOURNAMENT |
| 5 | `45144a3719bc` | `refactor(db): dashboard와 friendship 조회 경계 정렬` | B | PERSISTENCE |
| 6 | `ce41a880d6c6` | `refactor(db): PostgreSQL tournament helper와 admin 경계 정렬` | B | PERSISTENCE, TOURNAMENT |
| 7 | `5c8659ea233b` | `refactor(db): tournament relation mapper 계약 정렬` | B | PERSISTENCE, TOURNAMENT |
| 8 | `f77e317de4c1` | `refactor(db): memory match completion과 admin 경계 정렬` | B | REALTIME, PERSISTENCE, TOURNAMENT |
| 9 | `9d64ea406b03` | `refactor(db): memory tournament 확정 경계 정렬` | B | PERSISTENCE, TOURNAMENT |
| 10 | `b34fdaa1e9c2` | `refactor(db): memory chat과 tournament 진입 경계 정렬` | B | PERSISTENCE, TOURNAMENT |
| 11 | `dc0e60e6aa35` | `test(db): database row mapping contract 검증` | B | PERSISTENCE, TOURNAMENT, TEST |

## 5. Commit별 조사

### 5.1. `73b8ce0f0c26` — refactor(db): repository user projection 타입 정렬

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `73b8ce0f0c26` |
| Importance | B |
| Tags | AUTH, PERSISTENCE |
| Source role | memory-only user alias를 제거하고 canonical `UserProjectionRow`를 repository 저장 표현으로 사용합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.ts`의 memory `users` Map type이 이전 `MemoryUserRow`에서 무엇으로 바뀌는지 확인합니다.
- `packages/db/src/schema.ts`의 canonical `UserProjectionRow` field set과 memory object construction을 대조합니다.
- email·created_at·banned_at처럼 projection에 포함/제외된 field를 확인합니다.
- runtime mutation이나 query 결과가 바뀌지 않고 type ownership만 정렬되는지 parent diff로 확인합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | <!-- LEARNER:73b8ce0f0c26:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:73b8ce0f0c26:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:73b8ce0f0c26:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:73b8ce0f0c26:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:73b8ce0f0c26:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:73b8ce0f0c26:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:73b8ce0f0c26:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:73b8ce0f0c26:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:73b8ce0f0c26:later --> _(학습자 작성)_ |

#### 비교 기준

- parent 상태와 `73b8ce0f0c26`의 diff를 먼저 비교합니다.
- 후속 관련 SHA `3d0ae79affd5`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.2. `3d0ae79affd5` — refactor(db): memory match record 계약 정렬

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `3d0ae79affd5` |
| Importance | B |
| Tags | PERSISTENCE |
| Source role | write command를 상속하던 memory match record를 명시적 stored shape로 바꿉니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.ts`의 이전 `MemoryMatchRecord`가 write input을 intersection/상속하던 부분과 새 explicit field를 비교합니다.
- `createMatch` 또는 finalization path가 command에서 어떤 field만 복사해 저장하는지 확인합니다.
- `memoryMatchSummary`가 새 `endedAt`·participant ID field를 읽는 경로를 확인합니다.
- tournament command metadata나 일시적 입력이 stored record에 우발적으로 남지 않는지 확인합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | <!-- LEARNER:3d0ae79affd5:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:3d0ae79affd5:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:3d0ae79affd5:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:3d0ae79affd5:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:3d0ae79affd5:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:3d0ae79affd5:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:3d0ae79affd5:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:3d0ae79affd5:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:3d0ae79affd5:later --> _(학습자 작성)_ |

#### 비교 기준

- parent 상태와 `3d0ae79affd5`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `73b8ce0f0c26`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `3e3f21129369`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.3. `3e3f21129369` — refactor(db): canonical row schema 타입 정렬

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `3e3f21129369` |
| Importance | B |
| Tags | PERSISTENCE, TOURNAMENT |
| Source role | database enum·row projection vocabulary를 `schema.ts`의 canonical type으로 통합합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/schema.ts`의 `TournamentRound`, `TournamentMatchStatus`, `ChatScope`, `AdminAction` alias를 shared contract와 대조합니다.
- `Database` table map과 각 `Selectable` row export의 재배치를 확인합니다.
- `UserProjectionRow`가 broad alias 대신 explicit `Pick`으로 어떤 column을 고정하는지 확인합니다.
- joined row interface가 canonical aliases를 참조하도록 바뀌고 중복 string union이 제거되는지 확인합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | <!-- LEARNER:3e3f21129369:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:3e3f21129369:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:3e3f21129369:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:3e3f21129369:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:3e3f21129369:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:3e3f21129369:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:3e3f21129369:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:3e3f21129369:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:3e3f21129369:later --> _(학습자 작성)_ |

#### 비교 기준

- parent 상태와 `3e3f21129369`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `3d0ae79affd5`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `212650b2863d`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.4. `212650b2863d` — refactor(db): row mapper record 타입 정렬

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `212650b2863d` |
| Importance | B |
| Tags | PERSISTENCE, TOURNAMENT |
| Source role | `toTournamentMatchRecord`의 반환값을 canonical row type에서 파생한 explicit view로 고정합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/rowMappers.ts`의 `TournamentMatchRecordView`와 `toTournamentMatchRecord` return annotation을 확인합니다.
- round/status type이 hard-coded union이 아니라 `TournamentMatchRow` field에서 파생되는지 확인합니다.
- nullable score·ID field에서 `Number`/null 변환이 유지되는지 parent와 비교합니다.
- public summary mapper와 internal record mapper의 field 차이를 구분합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | <!-- LEARNER:212650b2863d:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:212650b2863d:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:212650b2863d:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:212650b2863d:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:212650b2863d:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:212650b2863d:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:212650b2863d:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:212650b2863d:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:212650b2863d:later --> _(학습자 작성)_ |

#### 비교 기준

- parent 상태와 `212650b2863d`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `3e3f21129369`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `45144a3719bc`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.5. `45144a3719bc` — refactor(db): dashboard와 friendship 조회 경계 정렬

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `45144a3719bc` |
| Importance | B |
| Tags | PERSISTENCE |
| Source role | optional SQL fragment를 제거하고 scoped/unscoped recent-match query를 두 개의 명시적 shape로 분리합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `PostgresRepository.listRecentMatches` parent에서 conditional `sql` fragment가 사용되던 부분과 두 explicit query branch를 비교합니다.
- 두 query의 select column, joins, order, limit가 동일하고 where만 다른지 확인합니다.
- `listFriends` SQL formatting과 dashboard object construction이 behavior를 바꾸는지 확인합니다.
- 분기 duplication이 늘어나는 대신 query shape reviewability가 좋아지는 trade-off를 기록합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | <!-- LEARNER:45144a3719bc:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:45144a3719bc:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:45144a3719bc:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:45144a3719bc:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:45144a3719bc:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:45144a3719bc:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:45144a3719bc:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:45144a3719bc:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:45144a3719bc:later --> _(학습자 작성)_ |

#### 비교 기준

- parent 상태와 `45144a3719bc`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `212650b2863d`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `ce41a880d6c6`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.6. `ce41a880d6c6` — refactor(db): PostgreSQL tournament helper와 admin 경계 정렬

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `ce41a880d6c6` |
| Importance | B |
| Tags | PERSISTENCE, TOURNAMENT |
| Source role | tournament match relation 조립과 admin query를 명시적 helper/statement로 정리합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.ts`의 `tournamentMatchFromRow`가 left/right/winner ID를 `getUserById`로 해석하는 순서를 확인합니다.
- `ensureFinalMatch` 또는 tournament helper가 어떤 executor/row를 받는지 확인합니다.
- `listAdminUsers`, `listAdminActions`, `setUserBan`의 query와 mapper 호출을 parent와 비교합니다.
- 이 refactor가 admin status update와 audit insert를 하나의 transaction으로 만들지는 않는다는 점을 명시합니다.
- relation user가 삭제·누락된 경우 null 처리와 thrown failure를 구분합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | <!-- LEARNER:ce41a880d6c6:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:ce41a880d6c6:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:ce41a880d6c6:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:ce41a880d6c6:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:ce41a880d6c6:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:ce41a880d6c6:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:ce41a880d6c6:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:ce41a880d6c6:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:ce41a880d6c6:later --> _(학습자 작성)_ |

#### 비교 기준

- parent 상태와 `ce41a880d6c6`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `45144a3719bc`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `5c8659ea233b`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.7. `5c8659ea233b` — refactor(db): tournament relation mapper 계약 정렬

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `5c8659ea233b` |
| Importance | B |
| Tags | PERSISTENCE, TOURNAMENT |
| Source role | tournament mapper가 row spread와 사후 mutation 대신 explicit related-data object를 받도록 바꿉니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/rowMappers.ts`의 이전 `toTournamentSummary(row, entries, matches)`와 새 `{ entries, matches, winner }` 인수를 비교합니다.
- creator projection이 `{...row, id: creator_id, status: user_status}` spread에서 explicit field object로 바뀌는지 확인합니다.
- `PostgresRepository.tournamentFromRow`가 entries query, matches helper, winner lookup을 모두 끝낸 뒤 mapper를 호출하는지 추적합니다.
- `ensureTournamentBracket` executor type이 `Kysely | Transaction`으로 명시되는지 확인합니다.
- mapper가 더 이상 반환 후 `summary.winner = ...` mutation을 요구하지 않는지 확인합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | <!-- LEARNER:5c8659ea233b:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:5c8659ea233b:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:5c8659ea233b:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:5c8659ea233b:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:5c8659ea233b:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:5c8659ea233b:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:5c8659ea233b:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:5c8659ea233b:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:5c8659ea233b:later --> _(학습자 작성)_ |

#### 최소 코드 근거

<!-- LEARNER:5c8659ea233b:evidence --> _(학습자 작성)_

#### 비교 기준

- parent 상태와 `5c8659ea233b`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `ce41a880d6c6`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `f77e317de4c1`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.8. `f77e317de4c1` — refactor(db): memory match completion과 admin 경계 정렬

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `f77e317de4c1` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE, TOURNAMENT |
| Source role | memory tournament match lookup을 aggregate와 child를 함께 반환하는 helper로 통합합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.ts`의 `findTournamentMatch(matchId)` 반환 `{ tournament, match } | null`을 확인합니다.
- `completeTournamentMatch`가 helper 결과와 winner lookup을 재사용해 어느 객체를 mutation하는지 추적합니다.
- `listAdminUsers`, `listAdminActions`, `setUserBan`이 explicit object construction으로 바뀐 부분을 확인합니다.
- memory mutation이 transaction/rollback 없이 process-local object를 직접 바꾼다는 점을 기록합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | <!-- LEARNER:f77e317de4c1:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:f77e317de4c1:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:f77e317de4c1:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:f77e317de4c1:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:f77e317de4c1:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:f77e317de4c1:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:f77e317de4c1:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:f77e317de4c1:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:f77e317de4c1:later --> _(학습자 작성)_ |

#### 비교 기준

- parent 상태와 `f77e317de4c1`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `5c8659ea233b`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `9d64ea406b03`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.9. `9d64ea406b03` — refactor(db): memory tournament 확정 경계 정렬

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `9d64ea406b03` |
| Importance | B |
| Tags | PERSISTENCE, TOURNAMENT |
| Source role | memory `finalizeMatch`의 tournament participant 검증과 aggregate mutation을 하나의 lookup result에 정렬합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `finalizeMatch`의 이전 `tournamentLink` map/find 표현과 `findTournamentMatch` 사용을 비교합니다.
- already-finalized `matchId` 검사와 winner/loser가 해당 tournament match participant인지 검증하는 순서를 확인합니다.
- 일반 match record/stat update 뒤 tournament match/aggregate를 mutation하는 경로를 추적합니다.
- memory operation이 한 call stack에 있지만 예외 시 deep rollback이 없다는 점을 확인합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | <!-- LEARNER:9d64ea406b03:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:9d64ea406b03:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:9d64ea406b03:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:9d64ea406b03:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:9d64ea406b03:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:9d64ea406b03:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:9d64ea406b03:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:9d64ea406b03:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:9d64ea406b03:later --> _(학습자 작성)_ |

#### 비교 기준

- parent 상태와 `9d64ea406b03`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `f77e317de4c1`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `b34fdaa1e9c2`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.10. `b34fdaa1e9c2` — refactor(db): memory chat과 tournament 진입 경계 정렬

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `b34fdaa1e9c2` |
| Importance | B |
| Tags | PERSISTENCE, TOURNAMENT |
| Source role | memory chat/tournament object construction과 lookup을 explicit shared-domain shape에 맞춥니다. |

#### 해당 SHA에서 확인할 실제 코드

- `createChatMessage`의 `ChatMessage` type annotation과 field별 object construction을 확인합니다.
- `createTournament`가 `TournamentSummary`를 명시하고 entries/matches 초기값을 모두 제공하는지 확인합니다.
- `joinTournament`의 `alreadyJoined`, capacity check, append, playerCount/status 전이를 추적합니다.
- `getTournamentMatch`, `startTournamentMatch`가 `findTournamentMatch`를 재사용하는지 확인합니다.
- 반복 join의 idempotence와 full tournament에서 기존 참가자의 재join 허용을 구분합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | <!-- LEARNER:b34fdaa1e9c2:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:b34fdaa1e9c2:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:b34fdaa1e9c2:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:b34fdaa1e9c2:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:b34fdaa1e9c2:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:b34fdaa1e9c2:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:b34fdaa1e9c2:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:b34fdaa1e9c2:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:b34fdaa1e9c2:later --> _(학습자 작성)_ |

#### 비교 기준

- parent 상태와 `b34fdaa1e9c2`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `9d64ea406b03`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.
- 후속 관련 SHA `dc0e60e6aa35`가 이 결정의 부족한 점을 보완하거나 검증하는지 확인합니다.

### 5.11. `dc0e60e6aa35` — test(db): database row mapping contract 검증

| 항목 | 고정 정보 |
| --- | --- |
| SHA | `dc0e60e6aa35` |
| Importance | B |
| Tags | PERSISTENCE, TOURNAMENT, TEST |
| Source role | pure row fixture에서 user·match·friendship·chat·tournament·admin mapper 출력을 고정합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/rowMappers.test.ts`의 canonical `UserRow` fixture와 고정 UUID/Date를 확인합니다.
- `toPublicUser`가 snake_case를 노출하지 않고 online/role/rating을 변환하는 assertion을 확인합니다.
- joined match/friendship/chat row에서 viewer-relative result, opponent, sender, ISO timestamp를 확인합니다.
- tournament record/summary의 entries·matches·winner와 admin actor/target relation assertion을 확인합니다.
- live query나 PostgreSQL을 사용하지 않는 pure mapper unit test라는 범위를 명시합니다.

#### 학습자 기록

| 항목 | 기록 |
| --- | --- |
| 직전 관련 상태 | <!-- LEARNER:dc0e60e6aa35:previous --> _(학습자 작성)_ |
| 해결하려던 문제 | <!-- LEARNER:dc0e60e6aa35:problem --> _(학습자 작성)_ |
| 핵심 결정 | <!-- LEARNER:dc0e60e6aa35:decision --> _(학습자 작성)_ |
| 입력 → 상태 전이 → 출력 | <!-- LEARNER:dc0e60e6aa35:flow --> _(학습자 작성)_ |
| ownership / lifetime / cleanup | <!-- LEARNER:dc0e60e6aa35:ownership --> _(학습자 작성)_ |
| failure / rollback / retry | <!-- LEARNER:dc0e60e6aa35:failure --> _(학습자 작성)_ |
| 보장하는 것 | <!-- LEARNER:dc0e60e6aa35:guarantees --> _(학습자 작성)_ |
| 보장하지 않는 것 | <!-- LEARNER:dc0e60e6aa35:nonguarantees --> _(학습자 작성)_ |
| 후속 연결 | <!-- LEARNER:dc0e60e6aa35:later --> _(학습자 작성)_ |

#### Test commit 학습 기록

| 항목 | 기록 |
| --- | --- |
| 검증 대상 불변식 | <!-- LEARNER:dc0e60e6aa35:test:invariant --> _(학습자 작성)_ |
| 재현한 실패·경계 | <!-- LEARNER:dc0e60e6aa35:test:boundary --> _(학습자 작성)_ |
| 시험 기법 | <!-- LEARNER:dc0e60e6aa35:test:technique --> _(학습자 작성)_ |
| 통과하는 실제 코드 경로 | <!-- LEARNER:dc0e60e6aa35:test:path --> _(학습자 작성)_ |
| 시험이 증명하는 것 | <!-- LEARNER:dc0e60e6aa35:test:proves --> _(학습자 작성)_ |
| 시험이 증명하지 않는 것 | <!-- LEARNER:dc0e60e6aa35:test:not_proves --> _(학습자 작성)_ |
| 막으려는 회귀 | <!-- LEARNER:dc0e60e6aa35:test:regression --> _(학습자 작성)_ |

#### 비교 기준

- parent 상태와 `dc0e60e6aa35`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `b34fdaa1e9c2`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.

## 6. 불변식 변화

| 단계 | 관련 SHA | 조사 초점 | 학습자 기록 |
| --- | --- | --- | --- |
| Canonical storage vocabulary | `73b8ce0f0c26` → `3e3f21129369` | 중복 alias·command inheritance가 제거되는 범위를 확인합니다. | <!-- LEARNER:thread-03:invariant:1 --> _(학습자 작성)_ |
| Explicit mapper view | `212650b2863d` | internal record와 public summary의 차이를 기록합니다. | <!-- LEARNER:thread-03:invariant:2 --> _(학습자 작성)_ |
| Explicit query·relation assembly | `45144a3719bc` → `5c8659ea233b` | query shape와 related-data provenance를 추적합니다. | <!-- LEARNER:thread-03:invariant:3 --> _(학습자 작성)_ |
| Memory aggregate lookup | `f77e317de4c1` → `b34fdaa1e9c2` | child와 owner aggregate의 alias·mutation 범위를 확인합니다. | <!-- LEARNER:thread-03:invariant:4 --> _(학습자 작성)_ |
| Mapper regression evidence | `dc0e60e6aa35` | 정적 type refactor 뒤 runtime object shape를 확인합니다. | <!-- LEARNER:thread-03:invariant:5 --> _(학습자 작성)_ |

## 7. Failure → Fix → Test 관계

| 관계 | Failure / 이전 가정 | Fix / 결정 | Test / 근거 | 학습자 기록 |
| --- | --- | --- | --- | --- |
| 1 | memory-only alias와 write-command inheritance가 stored shape를 암시적으로 확장했습니다. | `73b8ce0f0c26`, `3d0ae79affd5`, `3e3f21129369`가 canonical projection과 explicit record를 도입했습니다. | `dc0e60e6aa35`가 downstream mapper output shape를 고정합니다. | <!-- LEARNER:thread-03:relation:1 --> _(학습자 작성)_ |
| 2 | tournament mapper가 row spread와 반환 후 winner mutation으로 relation provenance를 숨겼습니다. | `ce41a880d6c6`, `5c8659ea233b`가 helper와 `{ entries, matches, winner }` 계약을 추가했습니다. | `dc0e60e6aa35`의 tournament/admin fixture assertion입니다. | <!-- LEARNER:thread-03:relation:2 --> _(학습자 작성)_ |
| 3 | memory completion이 tournament와 child를 반복 lookup하고 optional chain/non-null assertion에 의존했습니다. | `f77e317de4c1` → `9d64ea406b03` → `b34fdaa1e9c2`가 aggregate+child helper를 공통 사용합니다. | 후속 memory repository·concurrency tests가 public behavior를 간접 보호합니다. | <!-- LEARNER:thread-03:relation:3 --> _(학습자 작성)_ |

## 8. Ownership·상태·책임 변화

| 구간 | 이전 소유자/표현 | 이후 소유자/표현 | 관련 SHA | 학습자 기록 |
| --- | --- | --- | --- | --- |
| User/match stored type | memory-only alias와 write command가 shape를 간접 소유했습니다. | `schema.ts` projection과 explicit `MemoryMatchRecord`가 stored field를 소유합니다. | `73b8ce0f0c26`, `3d0ae79affd5` | <!-- LEARNER:thread-03:ownership:1 --> _(학습자 작성)_ |
| DB type vocabulary | round/status/scope/action union이 여러 파일에 중복됐습니다. | canonical aliases와 row exports를 `schema.ts`가 소유합니다. | `3e3f21129369`, `212650b2863d` | <!-- LEARNER:thread-03:ownership:2 --> _(학습자 작성)_ |
| Relation assembly | mapper 입력 masquerading과 사후 mutation에 분산됐습니다. | repository helper가 relation fetch, mapper가 완성 DTO construction을 소유합니다. | `ce41a880d6c6`, `5c8659ea233b` | <!-- LEARNER:thread-03:ownership:3 --> _(학습자 작성)_ |
| Memory aggregate mutation | child와 owner를 별도 탐색했습니다. | helper가 `{tournament, match}` 원본 alias pair를 반환합니다. | `f77e317de4c1` → `b34fdaa1e9c2` | <!-- LEARNER:thread-03:ownership:4 --> _(학습자 작성)_ |
| Regression owner | typecheck만 behavior-preserving 근거였습니다. | pure mapper test가 public/internal output shape를 소유합니다. | `dc0e60e6aa35` | <!-- LEARNER:thread-03:ownership:5 --> _(학습자 작성)_ |

## 9. Thread 최종 상태

<!-- LEARNER:thread-03:final-state --> _(학습자 작성)_

## 10. 최종 실행 흐름

<!-- LEARNER:thread-03:flow --> _(학습자 작성)_

## 11. 학습 완료 확인

- [ ] command type과 stored record type의 lifetime 차이를 설명할 수 있습니다.
- [ ] canonical TypeScript row type이 DB CHECK나 runtime parser를 대신하지 않는다고 설명할 수 있습니다.
- [ ] relation fetch와 mapper construction의 책임 분리를 실제 helper·function 이름으로 설명할 수 있습니다.
- [ ] memory aggregate+child lookup의 장점과 rollback non-guarantee를 함께 말할 수 있습니다.
- [ ] C-level formatting commit을 제외한 이유를 독립적인 state·ownership 변화 부재로 설명할 수 있습니다.
- [ ] mapper unit test의 증거 범위를 live PostgreSQL query로 과장하지 않습니다.

## 12. 실행 및 증거 기록

<!-- LEARNER:thread-03:execution --> _(학습자 작성)_
