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
| 직전 관련 상태 | memory repository는 SQL user projection과 별도의 `MemoryUserRow` alias를 유지해 같은 user shape가 두 곳에서 정의됐습니다. |
| 해결하려던 문제 | schema 변경 시 memory alias만 늦게 갱신되거나 mapper가 받는 shape와 저장 shape가 갈라질 위험이 있었습니다. |
| 핵심 결정 | memory user store의 값 타입을 canonical `UserProjectionRow`로 바꾸고 객체 생성 field를 명시했습니다. |
| 입력 → 상태 전이 → 출력 | memory user 입력 → canonical projection 객체 생성/저장 → 기존 mapper로 public/session DTO 변환입니다. |
| ownership / lifetime / cleanup | `schema.ts`가 user projection vocabulary를 소유하고 memory repository는 그 타입의 원본 객체를 Map lifetime 동안 소유합니다. |
| failure / rollback / retry | compile-time refactor이므로 runtime validation은 추가되지 않습니다. 누락 field는 typecheck에서 잡히지만 잘못된 값은 실행 중 그대로 들어갈 수 있습니다. |
| 보장하는 것 | PostgreSQL query projection과 memory storage가 같은 TypeScript field contract를 참조합니다. |
| 보장하지 않는 것 | PostgreSQL과 memory의 정렬·filter·transaction 의미가 같아진 것은 아니며 동작 parity 전체를 보장하지 않습니다. |
| 후속 연결 | `3e3f21129369`가 더 많은 canonical enum/row type을 schema module로 모으고 mapper 시험이 후속 보호를 제공합니다. |

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
| 직전 관련 상태 | memory match record는 write command shape를 재사용해 저장해야 할 state와 호출 순간의 command metadata가 구분되지 않았습니다. |
| 해결하려던 문제 | command가 확장될 때 memory persistence shape도 자동 확장되어 ownership과 lifetime이 불명확해질 수 있었습니다. |
| 핵심 결정 | `MemoryMatchRecord`를 id, result key, mode, participant IDs, scores, endedAt 등 실제 저장 field로 명시했습니다. |
| 입력 → 상태 전이 → 출력 | match command → 필요한 field 선택·새 record 생성 → memory 배열 저장 → summary mapper가 stored field만 읽습니다. |
| ownership / lifetime / cleanup | command 객체는 caller lifetime, stored record는 repository 배열 lifetime을 가집니다. 두 객체가 별도 값으로 분리됩니다. |
| failure / rollback / retry | 저장 중 failure injection이나 transaction은 추가되지 않습니다. 단순 memory push의 process-local atomicity만 유지됩니다. |
| 보장하는 것 | memory 저장 표현이 write input 변화에 암시적으로 끌려가지 않고 stored contract를 명확히 유지합니다. |
| 보장하지 않는 것 | durable persistence, cross-process consistency, PostgreSQL row와 byte-level 동일성은 보장하지 않습니다. |
| 후속 연결 | `9d64ea406b03`가 tournament finalization에서도 aggregate/match lookup 결과를 명시적으로 다룹니다. |

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
| 직전 관련 상태 | round/status/scope/action과 여러 row projection이 mapper·repository에 중복 선언되어 같은 DB column을 다른 union으로 표현할 수 있었습니다. |
| 해결하려던 문제 | row mapper refactor를 계속하려면 한 module이 DB-facing type vocabulary를 소유해야 했습니다. |
| 핵심 결정 | `schema.ts`에 canonical alias와 explicit row projection을 모으고 joined row가 이를 참조하도록 정렬했습니다. |
| 입력 → 상태 전이 → 출력 | SQL table interface → `Selectable` row type → joined projection → mapper 입력 type으로 한 방향의 type dependency를 만듭니다. |
| ownership / lifetime / cleanup | `schema.ts`가 DB row vocabulary를 소유하고 mapper/repository는 import해 소비합니다. runtime row lifetime은 변하지 않습니다. |
| failure / rollback / retry | DB constraint나 runtime parser는 추가되지 않습니다. TypeScript 선언이 실제 SQL과 어긋나면 실행 중 자동 검출하지 못합니다. |
| 보장하는 것 | 동일 column의 compile-time 표현을 한 곳에서 변경하고 downstream type drift를 줄입니다. |
| 보장하지 않는 것 | 실제 enum 값의 DB CHECK, query column completeness, behavior change 부재를 실행으로 증명하지는 않습니다. |
| 후속 연결 | `212650b2863d`와 `5c8659ea233b`가 mapper 출력·relation assembly를 이 canonical type에 맞춥니다. |

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
| 직전 관련 상태 | tournament match record mapper는 반환 타입이 암시적이어서 schema alias가 바뀌어도 caller 계약이 명확히 드러나지 않았습니다. |
| 해결하려던 문제 | internal finalization/lookup code가 public summary와 다른 최소 record shape를 안전하게 소비해야 했습니다. |
| 핵심 결정 | `TournamentMatchRecordView`를 정의하고 round/status를 canonical row field에서 파생해 mapper 반환 타입을 명시했습니다. |
| 입력 → 상태 전이 → 출력 | `TournamentMatchRow` → snake_case ID/status/participant field 선택 → camelCase internal record view 반환입니다. |
| ownership / lifetime / cleanup | mapper가 새 value를 소유하고 DB row는 query result lifetime에 남습니다. view는 public relation user를 소유하지 않고 ID만 담습니다. |
| failure / rollback / retry | runtime validation은 없고 malformed null/type은 차단하지 않습니다. 변환 failure는 일반 JS error로 드러날 수 있습니다. |
| 보장하는 것 | internal record caller가 어떤 field를 받을 수 있는지 compile-time에 고정되고 schema alias 변경이 전파됩니다. |
| 보장하지 않는 것 | query가 올바른 row를 가져왔다는 보장, match lifecycle의 legal transition, relation user 존재성은 제공하지 않습니다. |
| 후속 연결 | `dc0e60e6aa35`가 정확한 record shape를 pure mapper test로 검증합니다. |

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
| 직전 관련 상태 | recent-match query는 optional raw SQL fragment를 중간에 삽입해 scoped/unscoped query의 최종 shape를 한눈에 검토하기 어려웠습니다. |
| 해결하려던 문제 | typed query 결과와 participant predicate가 branch별로 정확히 일치하는지 reviewer가 확인하기 쉬운 표현이 필요했습니다. |
| 핵심 결정 | userId 존재 여부에 따라 완전한 두 SQL query를 선택하고 나머지 mapping·dashboard behavior는 유지했습니다. |
| 입력 → 상태 전이 → 출력 | `userId` 있음 → participant where가 포함된 query, 없음 → global query → 같은 `toMatchSummary` mapping과 newest-first limit입니다. |
| ownership / lifetime / cleanup | repository method가 query branch 선택을 소유하고 mapper가 출력 변환을 계속 소유합니다. |
| failure / rollback / retry | SQL duplication으로 한 branch만 수정할 위험이 생깁니다. 이 commit은 transaction·failure handling을 추가하지 않습니다. |
| 보장하는 것 | 실제 실행될 SQL shape와 bind parameter 위치를 branch마다 명시적으로 검토할 수 있습니다. |
| 보장하지 않는 것 | 성능 개선, result parity의 실행 증거, friendship semantics 변경은 보장하지 않습니다. |
| 후속 연결 | `dc0e60e6aa35`는 mapper shape를 보호하지만 두 SQL branch의 integration behavior 자체는 직접 실행하지 않습니다. |

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
| 직전 관련 상태 | PostgreSQL tournament relation 조립과 admin methods가 긴 inline query·mapping에 섞여 책임 위치를 파악하기 어려웠습니다. |
| 해결하려던 문제 | 한 tournament match row의 세 user relation을 동일 규칙으로 해석하고 admin query도 독립적으로 검토할 수 있어야 했습니다. |
| 핵심 결정 | `tournamentMatchFromRow` helper를 추출하고 admin query/mapper 단계를 명시적으로 배치했습니다. |
| 입력 → 상태 전이 → 출력 | match row → left/right/winner ID별 user lookup → relation object → summary mapper; admin row → actor/target lookup → admin summary입니다. |
| ownership / lifetime / cleanup | helper가 relation assembly를 소유하고 mapper가 shape conversion을 소유합니다. repository가 DB call lifetime을 관리합니다. |
| failure / rollback / retry | 여러 relation lookup 중 하나가 실패하면 상위 operation이 실패할 수 있습니다. admin update와 audit insert atomicity는 이 refactor가 보장하지 않습니다. |
| 보장하는 것 | tournament/admin의 caller-callee 관계와 relation resolution 위치가 분명해집니다. |
| 보장하지 않는 것 | N+1 query 제거, transaction 추가, behavior equivalence의 runtime proof는 제공하지 않습니다. |
| 후속 연결 | `5c8659ea233b`가 tournament aggregate mapper에 explicit related-data object를 요구하며 relation ownership을 더 명확히 합니다. |

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
| 직전 관련 상태 | 기존 mapper는 tournament row에 creator field를 spread해 다른 row처럼 보이게 하고, winner는 mapper 반환 후 mutation으로 채웠습니다. |
| 해결하려던 문제 | row provenance와 related data ownership이 숨겨져 누락 relation·잘못된 field alias가 compile-time에서 드러나기 어려웠습니다. |
| 핵심 결정 | `toTournamentSummary(row, {entries, matches, winner})`를 도입하고 creator를 explicit field로 구성하며 모든 relation을 호출 전에 조립했습니다. |
| 입력 → 상태 전이 → 출력 | tournament+creator row → entries/matches/winner 비동기 조회 → related object → 한 번의 pure summary construction입니다. |
| ownership / lifetime / cleanup | repository가 relation fetch와 async lifetime을 소유하고 mapper가 완성된 immutable-style DTO construction을 소유합니다. 반환 후 mutation이 사라집니다. |
| failure / rollback / retry | relation query 중 하나가 실패하면 aggregate 전체가 실패합니다. batch loading이나 transaction-consistent snapshot은 추가되지 않습니다. |
| 보장하는 것 | mapper 입력에서 raw row와 related data가 명시적으로 구분되고 winner 누락을 사후 mutation에 의존하지 않습니다. |
| 보장하지 않는 것 | N+1 query, concurrent row 변화 사이의 snapshot consistency, runtime validation은 보장하지 않습니다. |
| 후속 연결 | `dc0e60e6aa35`가 entries/matches/winner를 넣은 mapper output을 고정합니다. |

#### 최소 코드 근거

- `packages/db/src/rowMappers.ts::toTournamentSummary` — `row`와 `{ entries, matches, winner }`를 분리해 relation provenance와 필수 조립 단계를 명시합니다.

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
| 직전 관련 상태 | memory completion은 tournament 배열과 match를 별도로 다시 찾고 non-null assertion에 의존했습니다. |
| 해결하려던 문제 | child match를 찾은 뒤 소유 aggregate를 잃으면 status·winner를 다른 객체에 반영하거나 lookup logic이 중복될 수 있었습니다. |
| 핵심 결정 | `findTournamentMatch`가 aggregate와 child를 한 결과로 반환하고 completion/admin methods가 explicit local 값을 사용하도록 정렬했습니다. |
| 입력 → 상태 전이 → 출력 | match ID → `{tournament, match}` lookup → winner projection 조회 → child status/score 변경 → semifinal이면 final 생성, 아니면 aggregate 완료입니다. |
| ownership / lifetime / cleanup | repository 배열이 tournament aggregate와 child object lifetime을 소유하고 helper는 alias pair를 일시적으로 반환합니다. |
| failure / rollback / retry | winner lookup 후 mutation 중 예외가 발생하면 자동 rollback이 없습니다. process-local sequential method라는 전제입니다. |
| 보장하는 것 | match와 그 소유 tournament가 같은 lookup 결과로 함께 이동해 mutation target이 분명해집니다. |
| 보장하지 않는 것 | PostgreSQL transaction parity, concurrent mutation safety, deep copy 반환은 보장하지 않습니다. |
| 후속 연결 | `9d64ea406b03`가 같은 helper를 atomic finalization의 memory tournament branch에 재사용합니다. |

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
| 직전 관련 상태 | memory finalization은 tournament와 child를 임시 map 구조로 찾고 각 조건에서 optional chain을 반복했습니다. |
| 해결하려던 문제 | participant 검증·중복 확정·semifinal/final mutation이 같은 aggregate를 대상으로 한다는 사실을 코드가 명확히 유지해야 했습니다. |
| 핵심 결정 | `findTournamentMatch` 결과를 하나의 local value로 사용해 participant set과 subsequent mutation을 정렬했습니다. |
| 입력 → 상태 전이 → 출력 | command → tournament child lookup → already-finalized·participant 검증 → match/stat update → child result 기록 → semifinal final 생성 또는 tournament winner/status 확정입니다. |
| ownership / lifetime / cleanup | repository가 match record, user stats, tournament aggregate를 같은 method 동안 소유합니다. helper result는 원본 object alias입니다. |
| failure / rollback / retry | 검증 전에는 mutation하지 않지만 일반 match/stat update 이후 tournament mutation에서 예외가 나면 PostgreSQL transaction과 같은 rollback은 없습니다. |
| 보장하는 것 | memory 구현에서 tournament validation과 mutation이 동일 child/aggregate reference를 사용합니다. |
| 보장하지 않는 것 | durable atomicity, failure injection rollback, cross-process idempotency는 보장하지 않습니다. |
| 후속 연결 | `dc0e60e6aa35`는 mapper를 검증하고, match-finalization atomicity 자체는 별도의 persistence Thread에서 다룹니다. |

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
| 직전 관련 상태 | memory methods는 compact object literal과 여러 lookup 방식에 의존해 shared domain shape와 상태 전이가 숨겨졌습니다. |
| 해결하려던 문제 | chat/tournament의 생성·참가·match 시작이 같은 typed boundary를 사용하고 중복 lookup을 줄일 필요가 있었습니다. |
| 핵심 결정 | 반환 객체에 explicit type을 주고 join 조건을 분기하며 tournament match lookup을 공통 helper로 통일했습니다. |
| 입력 → 상태 전이 → 출력 | chat input → sender 검증 → typed message 저장; tournament create → typed aggregate 저장; join → existing/full 검사 → entry append → count/status/bracket 갱신입니다. |
| ownership / lifetime / cleanup | repository 배열이 message와 tournament aggregate를 소유하고 caller는 같은 객체 projection을 받습니다. helper가 child alias를 찾습니다. |
| failure / rollback / retry | full 상태에서 신규 사용자는 실패하고 기존 사용자는 no-op 후 summary를 받습니다. method 중간 예외에 대한 rollback은 없습니다. |
| 보장하는 것 | memory domain object의 필수 field와 join idempotence/capacity 분기가 명시적으로 드러납니다. |
| 보장하지 않는 것 | 실제 concurrent request serialization, deep immutability, PostgreSQL transaction과 동일한 failure semantics는 보장하지 않습니다. |
| 후속 연결 | Thread 5의 `efdb5c3a4932`가 entrant를 canonical user store에서 검증하고 concurrency test가 final-slot 결과를 확인합니다. |

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
| 직전 관련 상태 | 여러 refactor가 TypeScript contract를 정리했지만 runtime object shape가 바뀌지 않았다는 집중 regression evidence가 없었습니다. |
| 해결하려던 문제 | explicit projection·relation object 변경 중 snake_case 누출, viewer-relative sign, nullable relation, timestamp conversion이 깨질 수 있었습니다. |
| 핵심 결정 | 고정 row fixture로 모든 주요 mapper를 직접 호출하고 exact/partial object assertion을 추가했습니다. |
| 입력 → 상태 전이 → 출력 | typed fixture row → mapper 호출 → public/internal DTO의 ID·이름·enum·numeric·ISO·relation field 비교입니다. |
| ownership / lifetime / cleanup | test fixture가 입력 value를 소유하고 mapper는 새 output object를 반환합니다. DB/pool resource는 없습니다. |
| failure / rollback / retry | malformed runtime row, SQL join 누락, query ordering은 재현하지 않습니다. pure function assertion 실패로 shape regression을 드러냅니다. |
| 보장하는 것 | 현재 mapper가 relational naming을 공개 DTO에 누출하지 않고 relation data를 의도한 shape로 조립함을 증명합니다. |
| 보장하지 않는 것 | 실제 query가 이 row shape를 반환한다는 것, transaction consistency, repository behavior 전체는 증명하지 않습니다. |
| 후속 연결 | 후속 mapper/schema refactor가 shared API contract를 바꾸면 이 test가 명시적으로 실패합니다. |

#### Test commit 학습 기록

| 항목 | 기록 |
| --- | --- |
| 검증 대상 불변식 | DB row에서 shared domain DTO로 변환할 때 naming, nullable relation, viewer-relative 결과, numeric/time 변환이 유지돼야 합니다. |
| 재현한 실패·경계 | joined row와 tournament relation object의 복합 shape, null winner/target, loss rating sign입니다. |
| 시험 기법 | 고정 fixture를 쓰는 pure unit/contract test입니다. |
| 통과하는 실제 코드 경로 | `toPublicUser`, `toMatchSummary`, `toFriendSummary`, `toChatMessage`, tournament/admin mapper functions입니다. |
| 시험이 증명하는 것 | mapper 함수 자체의 output shape와 핵심 field 의미를 deterministic하게 증명합니다. |
| 시험이 증명하지 않는 것 | SQL query, PostgreSQL driver conversion, relation snapshot consistency, repository transaction은 증명하지 않습니다. |
| 막으려는 회귀 | schema alias·mapper refactor 중 snake_case 누출, 누락 relation, 잘못된 sign/ISO 변환 회귀를 막습니다. |

#### 비교 기준

- parent 상태와 `dc0e60e6aa35`의 diff를 먼저 비교합니다.
- 이 Thread의 직전 관련 SHA `b34fdaa1e9c2`와 책임·상태·보장 범위가 어떻게 달라졌는지 비교합니다.

## 6. 불변식 변화

| 단계 | 관련 SHA | 조사 초점 | 학습자 기록 |
| --- | --- | --- | --- |
| Canonical storage vocabulary | `73b8ce0f0c26` → `3e3f21129369` | 중복 alias·command inheritance가 제거되는 범위를 확인합니다. | memory user는 canonical projection을, memory match는 explicit stored shape를 사용하고 DB enum/row aliases는 `schema.ts`가 소유합니다. type ownership이 한 방향으로 정렬됩니다. |
| Explicit mapper view | `212650b2863d` | internal record와 public summary의 차이를 기록합니다. | tournament match internal record는 IDs·status 중심의 명시적 view를 반환하며 public relation user가 포함된 summary와 분리됩니다. |
| Explicit query·relation assembly | `45144a3719bc` → `5c8659ea233b` | query shape와 related-data provenance를 추적합니다. | conditional SQL fragment가 완전한 두 query로 바뀌고 tournament row, entries, matches, winner가 mapper 호출 전 명시적으로 조립됩니다. 사후 mutation과 row masquerading이 제거됩니다. |
| Memory aggregate lookup | `f77e317de4c1` → `b34fdaa1e9c2` | child와 owner aggregate의 alias·mutation 범위를 확인합니다. | `findTournamentMatch`가 원본 aggregate와 child를 함께 반환해 participant 검증·completion·start가 동일 객체를 대상으로 수행됩니다. process-local direct mutation이라는 한계는 남습니다. |
| Mapper regression evidence | `dc0e60e6aa35` | 정적 type refactor 뒤 runtime object shape를 확인합니다. | 고정 row fixture가 user/match/social/tournament/admin mapper의 naming·nullable·relation·time 변환을 검증하지만 live SQL row 생성은 다루지 않습니다. |

## 7. Failure → Fix → Test 관계

| 관계 | Failure / 이전 가정 | Fix / 결정 | Test / 근거 | 학습자 기록 |
| --- | --- | --- | --- | --- |
| 1 | memory-only alias와 write-command inheritance가 stored shape를 암시적으로 확장했습니다. | `73b8ce0f0c26`, `3d0ae79affd5`, `3e3f21129369`가 canonical projection과 explicit record를 도입했습니다. | `dc0e60e6aa35`가 downstream mapper output shape를 고정합니다. | compile-time source of truth를 줄여 schema 변화가 한 경로로 전파되게 합니다. test는 output을 보호하지만 storage/query parity 전체는 증명하지 않습니다. |
| 2 | tournament mapper가 row spread와 반환 후 winner mutation으로 relation provenance를 숨겼습니다. | `ce41a880d6c6`, `5c8659ea233b`가 helper와 `{ entries, matches, winner }` 계약을 추가했습니다. | `dc0e60e6aa35`의 tournament/admin fixture assertion입니다. | repository가 관계 조회를, mapper가 순수 shape construction을 소유합니다. 여러 query의 snapshot consistency는 별도 문제로 남습니다. |
| 3 | memory completion이 tournament와 child를 반복 lookup하고 optional chain/non-null assertion에 의존했습니다. | `f77e317de4c1` → `9d64ea406b03` → `b34fdaa1e9c2`가 aggregate+child helper를 공통 사용합니다. | 후속 memory repository·concurrency tests가 public behavior를 간접 보호합니다. | 동일 원본 object를 mutation한다는 사실이 명확해졌지만 transaction rollback이나 cross-request serialization을 추가한 것은 아닙니다. |

## 8. Ownership·상태·책임 변화

| 구간 | 이전 소유자/표현 | 이후 소유자/표현 | 관련 SHA | 학습자 기록 |
| --- | --- | --- | --- | --- |
| User/match stored type | memory-only alias와 write command가 shape를 간접 소유했습니다. | `schema.ts` projection과 explicit `MemoryMatchRecord`가 stored field를 소유합니다. | `73b8ce0f0c26`, `3d0ae79affd5` | caller command lifetime과 repository stored-record lifetime이 type에서도 분리됩니다. |
| DB type vocabulary | round/status/scope/action union이 여러 파일에 중복됐습니다. | canonical aliases와 row exports를 `schema.ts`가 소유합니다. | `3e3f21129369`, `212650b2863d` | mapper는 schema field에서 타입을 파생하지만 runtime row validation은 여전히 별도 책임입니다. |
| Relation assembly | mapper 입력 masquerading과 사후 mutation에 분산됐습니다. | repository helper가 relation fetch, mapper가 완성 DTO construction을 소유합니다. | `ce41a880d6c6`, `5c8659ea233b` | raw row와 related data가 분리되어 caller-callee contract가 명시됩니다. |
| Memory aggregate mutation | child와 owner를 별도 탐색했습니다. | helper가 `{tournament, match}` 원본 alias pair를 반환합니다. | `f77e317de4c1` → `b34fdaa1e9c2` | mutation target은 분명해졌지만 반환 projection의 deep immutability는 제공하지 않습니다. |
| Regression owner | typecheck만 behavior-preserving 근거였습니다. | pure mapper test가 public/internal output shape를 소유합니다. | `dc0e60e6aa35` | DB 없이 빠르게 shape를 고정하고 live query는 integration suite 책임으로 남깁니다. |

## 9. Thread 최종 상태

최종 상태에서 `schema.ts`가 DB-facing row와 enum vocabulary를 소유하고, memory repository는 command와 분리된 explicit stored record를 사용합니다. PostgreSQL repository는 query와 relation fetch를 명시적으로 수행한 뒤 related-data object를 mapper에 넘기며, memory repository는 aggregate와 child를 같은 lookup 결과로 다룹니다. mapper test는 변환 shape를 보호하지만 SQL 실행·transaction·concurrency를 증명하지 않습니다.

## 10. 최종 실행 흐름

1. SQL schema에 대응하는 canonical row/enum type을 `schema.ts`에서 import합니다.
2. PostgreSQL query는 완전한 query branch로 row를 읽고 relation helper가 left/right/winner 또는 entries/matches/winner를 조립합니다.
3. mapper는 raw row와 explicit related-data object를 받아 새 shared DTO를 한 번에 구성합니다.
4. memory backend는 canonical projection/explicit record를 저장하고 `findTournamentMatch`로 owner aggregate와 child를 함께 찾습니다.
5. completion·start·join은 그 원본 object를 직접 변경하며 transaction-like rollback은 제공하지 않습니다.
6. pure fixture test가 mapper의 naming, viewer-relative 값, nullable relation, ISO 변환을 고정합니다.

## 11. 학습 완료 확인

- [x] command type과 stored record type의 lifetime 차이를 설명할 수 있습니다.
- [x] canonical TypeScript row type이 DB CHECK나 runtime parser를 대신하지 않는다고 설명할 수 있습니다.
- [x] relation fetch와 mapper construction의 책임 분리를 실제 helper·function 이름으로 설명할 수 있습니다.
- [x] memory aggregate+child lookup의 장점과 rollback non-guarantee를 함께 말할 수 있습니다.
- [x] C-level formatting commit을 제외한 이유를 독립적인 state·ownership 변화 부재로 설명할 수 있습니다.
- [x] mapper unit test의 증거 범위를 live PostgreSQL query로 과장하지 않습니다.

## 12. 실행 및 증거 기록

- 저장소 실행 시험: 실행하지 않았습니다.
- 이유: 로컬 `git clone --branch web/ft_transcendence --single-branch`가 DNS 해석 실패(`Could not resolve host: github.com`)로 중단되어 의존성을 포함한 실행 가능한 checkout을 만들 수 없었습니다.
- 코드 근거: 지정 브랜치의 source classification과 각 exact SHA의 GitHub commit diff를 확인했습니다. 따라서 본 문서의 시험 설명은 실제 시험 코드의 정적 검토 결과이며, 이 환경에서의 통과 결과가 아닙니다.
