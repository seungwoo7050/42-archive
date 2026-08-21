# 토너먼트 계약·스키마와 대진 구성

원문 Development Thread: `Tournament contract, schema, and bracket construction`

## 1. Thread 목표

- 단순 참가자 목록에서 독립적인 tournament-match read model과 영속 상태로 이동하는 과정을 추적합니다.
- 4인 대회의 seed 배치, 준결승 생성, 결승 생성 조건과 PostgreSQL/memory 구현의 동작 일치를 복원합니다.
- 화면에서 추정한 대진표가 persisted match를 소비하는 UI로 교체되는 지점을 확인합니다.

### Source에서 확정된 significance

> Entries alone cannot represent round, slot, room assignment, persisted game linkage, score, winner, or independent match lifecycle. The history introduces those facts as stored tournament-match state and then makes both realtime play and the web bracket consume that state.

### 직접 연결되는 Critical Invariants

> Tournament bracket state is persisted once and read by every consumer instead of being independently reconstructed from entry order.
>
> A four-player bracket is seeded as 1–4 and 2–3; the final exists only after both semifinals have finished with winners.

### 직접 연결되는 Major Engineering Difficulties

> Keeping shared contracts, SQL schema, row mapping, PostgreSQL behavior, memory behavior, and web rendering aligned while the model expands.
>
> Distinguishing participant admission from bracket construction and distinguishing a tournament match from the generic persisted game result linked later.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 초기 repository와 화면은 참가 순서에서 seed와 bracket을 어떻게 추정했으며 어떤 정보를 표현하지 못했습니까?
- `TournamentMatchSummary`, `tournament_matches`, row mapper는 각각 어떤 형태의 데이터를 소유합니까?
- 4번째 참가자가 들어왔을 때 1–4, 2–3 준결승이 어떤 SQL/메서드에서 생성됩니까?
- 준결승 두 경기가 끝나기 전후 결승 row 생성 조건은 PostgreSQL과 memory에서 어떻게 맞춰집니까?
- UI는 언제부터 `entries.slice(...)` 대신 `TournamentSummary.matches`를 신뢰합니까?

## 3. 완료 기준

- entry-only 모델과 persisted tournament-match 모델의 표현 차이를 실제 타입·컬럼·mapper로 설명할 수 있습니다.
- 4인 bracket 생성과 결승 생성의 선행 조건을 PostgreSQL과 memory 구현에서 각각 추적할 수 있습니다.
- tournament-match ID, room ID, generic match ID가 서로 다른 수명과 역할을 갖는 이유를 설명할 수 있습니다.
- 초기 placeholder bracket이 persisted match 기반 화면으로 교체되는 호출 흐름을 그릴 수 있습니다.
- Commit map의 모든 SHA를 지정 브랜치 ancestry와 source classification에서 확인합니다.
- 각 SHA의 parent 또는 직전 관련 SHA와 비교해 변경 전후 상태를 구분합니다.
- 실행한 명령과 코드 검사만으로 확인한 사실을 구분하고 실행하지 않은 test를 통과했다고 기록하지 않습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `34c80874f13f` | `feat(db): 토너먼트 row contract 정의` | B | PERSISTENCE, TOURNAMENT | Defines typed persistence representations needed to map tournaments into the shared application contract. |
| 2 | `9b1dabcc4bb4` | `feat(db): 토너먼트 참가 저장 구현` | B | PERSISTENCE, TOURNAMENT | Implements tournament creation, listing, and joining through the common repository interface. |
| 3 | `4370ac3162b2` | `feat(web): 토너먼트 대진표 화면 추가` | B | TOURNAMENT, WEB | Adds the first tournament page and connects tournament listing and creation to the HTTP API. |
| 4 | `11e4c3dda1aa` | `feat(tournament): 대진 경기 contract 정의` | B | REALTIME, TOURNAMENT, WEB | Adds a shared tournament-match summary with bracket position, lifecycle, participants, winner, score, room, and persisted-match identifiers. |
| 5 | `138e5b8590b6` | `feat(tournament): 대진 경기 schema 추가` | B | REALTIME, PERSISTENCE, TOURNAMENT | Introduces a dedicated `tournament_matches` persistence model instead of deriving every round from entries or generic game records. |
| 6 | `4021a437e7e0` | `feat(tournament): 대진 row mapper 정의` | B | REALTIME, PERSISTENCE, TOURNAMENT | Adds explicit mapping from database tournament-match rows to application records and public summaries. |
| 7 | `53579ad0f0bf` | `feat(tournament): 대진 경기 lifecycle 저장 구현` | A | REALTIME, PERSISTENCE, TOURNAMENT | Adds tournament-match read/start/complete operations to `AppRepository` and both repository implementations. |
| 8 | `0d6824683677` | `feat(tournament): 준결승 대진 생성과 조회 구현` | A | TOURNAMENT | Creates semifinal bracket rows at four-player capacity and includes persisted matches in tournament summaries. |
| 9 | `b01adf728ca0` | `feat(tournament): memory 대진 진행 구현` | B | PERSISTENCE, TOURNAMENT | Aligns the in-memory tournament flow behaviorally with PostgreSQL. |
| 10 | `b0a1505c6a0f` | `feat(tournament): 플레이 가능한 대진 UI 연결` | B | PROTOCOL, REALTIME, TOURNAMENT | Replaces the placeholder bracket with persisted matches and links eligible participants directly to realtime play. |

## 5. Commit별 학습 기록

### 5.1. `feat(db): 토너먼트 row contract 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `34c80874f13f` |
| Importance | B |
| Tags | PERSISTENCE, TOURNAMENT |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Defines typed persistence representations needed to map tournaments into the shared application contract.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/schema.ts`의 tournament/entry row 타입과 projection
- `packages/db/src/rowMappers.ts`의 tournament 변환 경계
- `packages/shared/src/http.ts`의 `TournamentSummary`와 사용자 projection
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:34c80874f13f -->
- **직전 상태:** repository에는 사용자·세션·경기 등은 있었지만 tournament row를 공유 HTTP 모델로 바꾸는 typed 표현이 없었습니다.
- **구현 결정:** DB row의 snake_case 필드와 application의 camelCase summary를 분리하고, creator와 entries를 명시적으로 projection할 기반을 추가했습니다.
- **상태/소유권 변화:** 이 commit은 lifecycle 동작을 만들지 않고 “DB 형태를 application contract로 변환하는 책임”을 database package에 둡니다.
- **실패/edge:** 참가자 목록이 없거나 creator join projection이 불완전한 경우를 이 commit 자체가 해결하지는 않습니다.
- **보장/비보장:** typed row와 mapping 경계는 보장하지만 생성·참가·capacity·bracket 생성은 아직 없습니다.
- **다음 연결:** `9b1dabcc4bb4`가 이 표현 위에 실제 tournament 생성·목록·참가 저장을 추가합니다.
<!-- LEARNER-ANSWER END commit:34c80874f13f -->

비교 기준:
- 이 commit의 parent와 비교합니다.
- 다음 Thread 관련 SHA: `9b1dabcc4bb4` — `feat(db): 토너먼트 참가 저장 구현`

### 5.2. `feat(db): 토너먼트 참가 저장 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `9b1dabcc4bb4` |
| Importance | B |
| Tags | PERSISTENCE, TOURNAMENT |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Implements tournament creation, listing, and joining through the common repository interface.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.ts`의 `AppRepository` tournament 메서드
- PostgreSQL `createTournament`, `listTournaments`, `joinTournament` SQL
- memory repository의 tournament 배열과 seed 계산
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:9b1dabcc4bb4 -->
- **직전 상태:** typed row는 있었지만 application이 대회를 만들거나 참가자를 저장할 repository operation은 없었습니다.
- **구현 결정:** 생성 시 tournament row를 넣은 뒤 creator를 참가시키고, 참가 시 현재 entry 수를 읽어 `count + 1`을 seed로 저장합니다. memory 구현도 같은 순서로 summary를 갱신합니다.
- **상태/소유권 변화:** 참가 순서와 seed는 repository가 소유하며, capacity 4에 도달하면 memory 상태를 `running`으로 바꿉니다.
- **실패/edge:** count 조회와 insert가 하나의 원자적 capacity claim은 아니므로 concurrent admission 안전성은 이 commit의 보장이 아닙니다. 중복 사용자는 unique/conflict 경로로 제한됩니다.
- **보장/비보장:** 단일 호출 흐름의 생성·목록·참가와 seed 순서는 제공하지만 round/slot별 match 상태는 아직 없습니다.
- **다음 연결:** `4370ac3162b2`는 entries만으로 화면 대진을 만들며, 그 한계가 이후 persisted match 모델의 필요성을 드러냅니다.
<!-- LEARNER-ANSWER END commit:9b1dabcc4bb4 -->

비교 기준:
- 직전 Thread 관련 SHA: `34c80874f13f` — `feat(db): 토너먼트 row contract 정의`
- 다음 Thread 관련 SHA: `4370ac3162b2` — `feat(web): 토너먼트 대진표 화면 추가`

### 5.3. `feat(web): 토너먼트 대진표 화면 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `4370ac3162b2` |
| Importance | B |
| Tags | TOURNAMENT, WEB |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Adds the first tournament page and connects tournament listing and creation to the HTTP API.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/tournaments/page.tsx`의 초기 state와 API load/create
- 대진표 렌더링에서 `entries.slice(index, index + 2)` 사용 지점
- sample tournament fallback과 선택 상태
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:4370ac3162b2 -->
- **직전 상태:** tournament 저장은 있었지만 사용자가 목록·생성·대진을 보는 route가 없었습니다.
- **구현 결정:** 화면은 API 목록과 생성을 연결하되, 선택 대회의 `entries`를 두 명씩 잘라 round card처럼 렌더링했습니다.
- **상태/소유권 변화:** UI가 실제 match 상태를 소유하지 않으면서도 entry order에서 bracket을 계산하는 임시 read model 역할을 맡았습니다.
- **실패/edge:** round, slot, winner, score, room, generic match link가 없고 1–4/2–3 seed 규칙도 표현하지 못합니다. API 실패 시 sample state가 실제 데이터처럼 남을 수 있습니다.
- **보장/비보장:** tournament 목록/생성 UI는 제공하지만 대진표는 영속 사실이 아니라 화면 추정입니다.
- **다음 연결:** `11e4c3dda1aa`가 이 추정을 제거할 tournament-match contract를 정의합니다.
<!-- LEARNER-ANSWER END commit:4370ac3162b2 -->

비교 기준:
- 직전 Thread 관련 SHA: `9b1dabcc4bb4` — `feat(db): 토너먼트 참가 저장 구현`
- 다음 Thread 관련 SHA: `11e4c3dda1aa` — `feat(tournament): 대진 경기 contract 정의`

### 5.4. `feat(tournament): 대진 경기 contract 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `11e4c3dda1aa` |
| Importance | B |
| Tags | REALTIME, TOURNAMENT, WEB |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Adds a shared tournament-match summary with bracket position, lifecycle, participants, winner, score, room, and persisted-match identifiers.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `packages/shared/src/http.ts`의 `TournamentMatchSummary`와 tournament summary 확장
- `packages/shared/src/ws.ts`의 `tournament.join` client event
- status, round, slot, participant, winner, score, `roomId`, `matchId` 필드
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:11e4c3dda1aa -->
- **직전 상태:** 화면과 repository는 entries만 공유하므로 독립 경기 lifecycle을 전달할 수 없었습니다.
- **구현 결정:** round/slot과 `pending|ready|running|finished`, 양 참가자, 승자, 점수, 선택적 room/generic match ID를 공유 계약으로 올렸습니다.
- **상태/소유권 변화:** tournament summary 안에 “계산된 pair”가 아니라 독립적인 match summary collection이 들어갈 자리가 생겼고, realtime 참가 명령은 tournament match ID를 사용합니다.
- **실패/edge:** 타입은 허용 상태를 표현할 뿐 DB 제약이나 상태 전이 자체를 강제하지 않습니다.
- **보장/비보장:** API·web·WebSocket이 같은 식별자와 필드를 말하게 하지만 persistence는 다음 commit 전까지 없습니다.
- **다음 연결:** `138e5b8590b6`이 같은 모델을 `tournament_matches` 테이블로 저장합니다.
<!-- LEARNER-ANSWER END commit:11e4c3dda1aa -->

비교 기준:
- 직전 Thread 관련 SHA: `4370ac3162b2` — `feat(web): 토너먼트 대진표 화면 추가`
- 다음 Thread 관련 SHA: `138e5b8590b6` — `feat(tournament): 대진 경기 schema 추가`

### 5.5. `feat(tournament): 대진 경기 schema 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `138e5b8590b6` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE, TOURNAMENT |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Introduces a dedicated `tournament_matches` persistence model instead of deriving every round from entries or generic game records.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/migrations.ts`의 `tournament_matches` DDL
- `packages/db/src/schema.ts`의 tournament-match table/row 타입
- `unique(tournament_id, round, slot)`과 tournament cascade FK
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:138e5b8590b6 -->
- **직전 상태:** shared contract는 있었지만 restart 후에도 round/slot/lifecycle을 보존할 테이블이 없었습니다.
- **구현 결정:** tournament FK, round, slot, nullable left/right/winner/room/generic match IDs, scores, status를 가진 전용 row와 `(tournament_id, round, slot)` unique key를 추가했습니다.
- **상태/소유권 변화:** bracket 위치와 lifecycle의 authority가 entry order나 UI에서 database row로 이동합니다.
- **실패/edge:** nullable participant와 status 조합의 의미는 application logic이 책임지며, 이 DDL만으로 합법 상태 전이를 완전히 제약하지는 않습니다.
- **보장/비보장:** 동일 대회의 같은 round/slot 중복 row를 막고 대회 삭제 시 종속 row를 정리하지만 bracket 생성 조건은 아직 없습니다.
- **다음 연결:** `4021a437e7e0`이 row를 내부 record와 public summary로 변환합니다.
<!-- LEARNER-ANSWER END commit:138e5b8590b6 -->

비교 기준:
- 직전 Thread 관련 SHA: `11e4c3dda1aa` — `feat(tournament): 대진 경기 contract 정의`
- 다음 Thread 관련 SHA: `4021a437e7e0` — `feat(tournament): 대진 row mapper 정의`

### 5.6. `feat(tournament): 대진 row mapper 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `4021a437e7e0` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE, TOURNAMENT |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Adds explicit mapping from database tournament-match rows to application records and public summaries.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/rowMappers.ts`의 `toTournamentMatchRecord`
- `toTournamentMatchSummary`의 사용자 projection과 nullable 필드 처리
- slot 숫자 변환과 ISO timestamp 변환
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:4021a437e7e0 -->
- **직전 상태:** 테이블 row는 생겼지만 DB 이름·Date·nullable ID를 shared summary로 바꾸는 단일 경계가 없었습니다.
- **구현 결정:** raw row를 내부 record로 먼저 정규화하고, participant/winner `PublicUser` projection을 주입해 외부 summary를 구성합니다.
- **상태/소유권 변화:** SQL 조회와 HTTP 응답 사이의 이름 변환·날짜 직렬화·사용자 결합 책임이 mapper로 모입니다.
- **실패/edge:** mapper는 존재하지 않는 사용자나 잘못된 상태를 복구하지 않으며 caller가 올바른 projection을 제공해야 합니다.
- **보장/비보장:** 동일 row가 PostgreSQL 경로에서 일관된 application 형태가 되지만 lifecycle mutation은 다음 commit이 담당합니다.
- **다음 연결:** `53579ad0f0bf`가 조회·시작·완료 operation을 양 repository에 추가합니다.
<!-- LEARNER-ANSWER END commit:4021a437e7e0 -->

비교 기준:
- 직전 Thread 관련 SHA: `138e5b8590b6` — `feat(tournament): 대진 경기 schema 추가`
- 다음 Thread 관련 SHA: `53579ad0f0bf` — `feat(tournament): 대진 경기 lifecycle 저장 구현`

### 5.7. `feat(tournament): 대진 경기 lifecycle 저장 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `53579ad0f0bf` |
| Importance | A |
| Tags | REALTIME, PERSISTENCE, TOURNAMENT |
| 학습 깊이 | 주요 subsystem, 구현 경로, ownership/failure/non-guarantee를 구체적으로 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Adds tournament-match read/start/complete operations to `AppRepository` and both repository implementations.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.ts`의 `getTournamentMatch`, `startTournamentMatch`, `completeTournamentMatch`
- PostgreSQL complete SQL과 `ensureFinalMatch` 호출
- memory implementation의 같은 operation 및 당시 parity 차이
- parent 상태와 비교해 이전 가정, 새 boundary, caller/callee, ownership 또는 failure path를 기록합니다.
- 이 commit이 보장하지 않는 상태와 다음 fix/test가 보강하는 지점을 구분합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:53579ad0f0bf -->
- **직전 상태:** 전용 row와 mapper는 있었지만 realtime hub가 match를 조회·running 전환·finished 전환할 repository API가 없었습니다.
- **구현 결정:** `AppRepository`에 조회/시작/완료를 추가하고 PostgreSQL은 completion에서 winner·scores·room/generic match link를 저장한 뒤 semifinal이면 결승 생성 검사를, final이면 tournament 완료 갱신을 수행합니다.
- **상태/소유권 변화:** tournament match lifecycle mutation은 repository가 소유하며 GameHub는 구체 SQL을 알지 않습니다. PostgreSQL과 memory가 같은 interface 뒤에 놓입니다.
- **실패/edge:** 당시 memory completion은 PostgreSQL과 완전히 같은 final 생성 동작을 아직 갖지 않았고, 일반 match 저장과 tournament completion도 별도 호출이었습니다.
- **보장/비보장:** 기본 조회·시작·완료 경로는 생기지만 transaction 단위의 generic match/rating/bracket 원자성은 Thread 02의 후속 `finalizeMatch`가 완성합니다.
- **다음 연결:** `0d6824683677`이 4번째 entry 시 semifinal row를 생성하고 summary에 포함합니다.
<!-- LEARNER-ANSWER END commit:53579ad0f0bf -->

비교 기준:
- 직전 Thread 관련 SHA: `4021a437e7e0` — `feat(tournament): 대진 row mapper 정의`
- 다음 Thread 관련 SHA: `0d6824683677` — `feat(tournament): 준결승 대진 생성과 조회 구현`

### 5.8. `feat(tournament): 준결승 대진 생성과 조회 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `0d6824683677` |
| Importance | A |
| Tags | TOURNAMENT |
| 학습 깊이 | 주요 subsystem, 구현 경로, ownership/failure/non-guarantee를 구체적으로 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Creates semifinal bracket rows at four-player capacity and includes persisted matches in tournament summaries.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.ts`의 PostgreSQL `joinTournament`
- `ensureTournamentBracket`의 seed 1/4 및 2/3 insert
- `tournamentFromRow`의 match load, 사용자 resolution, round/slot 정렬
- parent 상태와 비교해 이전 가정, 새 boundary, caller/callee, ownership 또는 failure path를 기록합니다.
- 이 commit이 보장하지 않는 상태와 다음 fix/test가 보강하는 지점을 구분합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:0d6824683677 -->
- **직전 상태:** lifecycle operation은 있었지만 tournament join이 entries만 저장해 실제 첫 round row가 자동 생성되지 않았습니다.
- **구현 결정:** 4명일 때 seed 1–4를 semifinal slot 1, seed 2–3을 slot 2로 insert하고 unique conflict 시 중복 생성을 피합니다. summary 조회는 matches와 participant/winner 사용자를 결합해 round/slot 순으로 반환합니다.
- **상태/소유권 변화:** bracket topology가 web 계산이 아니라 repository가 생성한 row 집합으로 확정됩니다.
- **실패/edge:** 참가 인원 count와 insert의 concurrent capacity 경쟁은 이 commit만으로 안전하지 않습니다. 결승은 두 semifinal 완료 전 생성되지 않습니다.
- **보장/비보장:** 정상적인 4인 순차 참가에서 정확한 seed pair와 persisted summary를 보장하지만 concurrent admission invariant는 category 02에서 보강됩니다.
- **다음 연결:** `b01adf728ca0`이 memory repository에도 동일한 topology와 progression을 구현합니다.
<!-- LEARNER-ANSWER END commit:0d6824683677 -->

비교 기준:
- 직전 Thread 관련 SHA: `53579ad0f0bf` — `feat(tournament): 대진 경기 lifecycle 저장 구현`
- 다음 Thread 관련 SHA: `b01adf728ca0` — `feat(tournament): memory 대진 진행 구현`

### 5.9. `feat(tournament): memory 대진 진행 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `b01adf728ca0` |
| Importance | B |
| Tags | PERSISTENCE, TOURNAMENT |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Aligns the in-memory tournament flow behaviorally with PostgreSQL.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.ts`의 memory `joinTournament` capacity guard
- `ensureMemoryBracket`의 semifinal 생성
- memory completion의 두 semifinal winner 확인과 final/tournament 완료
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:b01adf728ca0 -->
- **직전 상태:** PostgreSQL은 persisted semifinal/final progression을 가졌지만 memory backend는 entry와 부분 lifecycle만 구현해 테스트·개발 환경이 달랐습니다.
- **구현 결정:** memory join도 capacity를 검사하고 4명 시 1–4/2–3 semifinal을 한 번만 만들며, 두 semifinal이 finished이고 winner가 있을 때 final을 만듭니다. final 완료는 tournament status/winner를 갱신합니다.
- **상태/소유권 변화:** backend 선택과 무관하게 tournament summary와 progression이 같은 repository contract를 따릅니다.
- **실패/edge:** memory는 process 수명 안의 단일 자료구조이므로 PostgreSQL transaction/동시성 특성을 검증하지 않습니다.
- **보장/비보장:** 기능 parity는 높이지만 durable persistence나 row lock 보장은 없습니다.
- **다음 연결:** `b0a1505c6a0f`이 web과 play flow를 이 공통 persisted model에 연결합니다.
<!-- LEARNER-ANSWER END commit:b01adf728ca0 -->

비교 기준:
- 직전 Thread 관련 SHA: `0d6824683677` — `feat(tournament): 준결승 대진 생성과 조회 구현`
- 다음 Thread 관련 SHA: `b0a1505c6a0f` — `feat(tournament): 플레이 가능한 대진 UI 연결`

### 5.10. `feat(tournament): 플레이 가능한 대진 UI 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `b0a1505c6a0f` |
| Importance | B |
| Tags | PROTOCOL, REALTIME, TOURNAMENT |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Replaces the placeholder bracket with persisted matches and links eligible participants directly to realtime play.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/tournaments/page.tsx`의 `selected.matches` 렌더링
- ready match와 현재 사용자 participant 여부에 따른 play link
- `apps/web/src/app/play/page.tsx`의 `tournamentMatchId` parsing 및 `tournament.join` 전송
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:b0a1505c6a0f -->
- **직전 상태:** UI는 entries를 잘라 대진을 추정했고 play route는 일반 queue/AI만 시작했습니다.
- **구현 결정:** round/slot/status/score/winner를 persisted match summary에서 표시하고, 현재 사용자가 ready match의 참가자일 때만 match ID를 포함한 play link를 제공합니다. play page는 query의 ID로 `tournament.join`을 보냅니다.
- **상태/소유권 변화:** 화면은 bracket을 만들지 않고 repository-backed summary를 표시하며, realtime server가 실제 좌석·room 생성 권한을 유지합니다.
- **실패/edge:** 링크 가시성은 편의 제어일 뿐 보안 경계가 아니며 server가 participant/status를 다시 검증해야 합니다.
- **보장/비보장:** 정상 UI journey는 persisted bracket과 연결되지만 room start rollback과 finalization 원자성은 Thread 02에서 다룹니다.
- **다음 연결:** 다음 Thread의 `33b6dfc5df7a`가 tournament match admission을 GameHub room lifecycle에 실제 통합합니다.
<!-- LEARNER-ANSWER END commit:b0a1505c6a0f -->

비교 기준:
- 직전 Thread 관련 SHA: `b01adf728ca0` — `feat(tournament): memory 대진 진행 구현`
- 이 commit을 Thread의 마지막 상태로 사용합니다.

## 6. Thread 종합

다음 항목을 commit 순서에서 재구성합니다: invariant evolution, Failure → Fix → Test 관계, ownership/state 변화, 최종 실행 흐름, 비보장, 실제 실행 증거.

<!-- LEARNER-ANSWER START thread:01-tournament-contract-schema-and-bracket-construction.md:synthesis -->
- **불변식 진화:** 초기 `TournamentSummary.entries`는 참가 순서만 보존했고, `4370ac3162b2`의 화면은 이를 두 명씩 잘라 대진을 추정했습니다. `11e4c3dda1aa`–`4021a437e7e0`이 round/slot/participant/winner/score/room/match 식별자를 가진 별도 계약·테이블·mapper를 만들었고, `0d6824683677`과 `b01adf728ca0`이 4명 충원 시 1–4, 2–3 준결승과 두 준결승 승자 기반 결승을 각각 PostgreSQL과 memory에 고정했습니다. `b0a1505c6a0f`에서 UI도 이 저장 상태만 렌더링합니다.
- **소유권과 상태:** 참가자 집합은 tournament entry가, 각 경기의 round/slot/lifecycle은 `tournament_matches`가, 실제 종료 경기 기록은 별도 generic match가 소유합니다. `room_id`는 진행 중 realtime 방 연결이고 `match_id`는 종료 후 영속 결과 연결이므로 같은 식별자가 아닙니다.
- **Failure → Fix → Verification:** 이 Thread의 핵심 실패는 데이터 손상보다 read-model fabrication입니다. `entries.slice(...)`와 backend별 불완전한 bracket progression을 persisted matches 및 memory parity가 교정했습니다. 원자적 결과 확정과 동시성 검증은 다음 Thread가 주 소유자입니다.
- **최종 흐름:** 대회 생성/참가 → 4번째 참가 시 준결승 두 row 생성 → summary가 matches를 round/slot 순서로 반환 → 참가 가능한 ready match를 UI가 play route에 연결 → 준결승 완료 두 건이 확인되면 결승 생성 → 최종 match 완료 후 tournament winner 확정입니다.
- **비보장:** 이 Thread만으로 concurrent admission의 capacity 안전성이나 match 결과 확정 transaction의 원자성이 보장되지는 않습니다. 전자는 category 02, 후자는 이 category의 Thread 02에서 다룹니다.
- **실행 증거:** 로컬 checkout을 만들 수 없어 테스트 명령은 실행하지 않았습니다. 위 내용은 각 exact SHA의 diff, 파일, 테스트 구현을 검사한 결과이며 runtime 성공으로 표시하지 않았습니다.
<!-- LEARNER-ANSWER END thread:01-tournament-contract-schema-and-bracket-construction.md:synthesis -->

## 7. 학습 완료 확인

<!-- LEARNER-ANSWER START thread:01-tournament-contract-schema-and-bracket-construction.md:checklist -->
- [x] 모든 SHA를 지정 브랜치의 exact commit으로 검사했습니다.
- [x] fixed commit map과 source classification을 보존했습니다.
- [x] earlier commit을 later HEAD 코드로 설명하지 않았습니다.
- [x] fix와 test를 원래 failure/production path에 연결했습니다.
- [x] 실제 실행하지 않은 test를 통과했다고 기록하지 않았습니다.
- [x] Thread 최종 owner, invariant, flow, non-guarantee를 작성했습니다.
<!-- LEARNER-ANSWER END thread:01-tournament-contract-schema-and-bracket-construction.md:checklist -->
