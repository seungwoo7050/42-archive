# 원자적·멱등적 경기 결과 확정

원문 Development Thread: `Atomic and idempotent match finalization`

## 1. Thread 목표

- 경기 row와 rating update가 순차 실행되던 초기 구현에서 하나의 논리적 `finalizeMatch` command로 수렴하는 과정을 복원합니다.
- result key, unique constraint, ordered row lock, transaction, rating history, tournament bracket update가 중복·부분 반영을 어떻게 차단하는지 확인합니다.
- GameHub가 durable boundary를 호출하고 persistence failure 동안 terminal room ownership을 유지하며 같은 idempotency key로 재시도하는 흐름을 추적합니다.

### Source에서 확정된 significance

> This thread converts a multi-write best-effort workflow into one logical domain command. Database
> uniqueness, ordered row locks, transaction-scoped tournament progression, runtime integration, and retryable
> room ownership together ensure that a completed game is neither duplicated nor partially reflected in
> ratings or brackets.

### 직접 연결되는 Critical Invariants

> A logical match result, participant statistics, rating history, and tournament progression commit atomically
> and idempotently.

> Timers, schedulers, heartbeat handles, retry work, snapshot buffers, and database resources have explicit
> single-owner cleanup.

### 직접 연결되는 Major Engineering Difficulties

> Preventing duplicate results, ratings, finals, friendship rows, tournament seeds, and admissions under
> retries or concurrent database operations.

> Preserving domain correctness during database failure, tournament-start rollback, match-finalization retry,
> process drain, and deployment shutdown.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 초기 `createMatch` 경로는 어떤 write들을 어떤 순서로 실행하며 어디에서 부분 성공할 수 있었습니까?
- logical result identity와 persisted match identity는 어떻게 다르며 재시도에서 각각 어떤 역할을 합니까?
- 동시 finalization에서 DB unique constraint와 transaction 내부 readback은 어떻게 수렴합니까?
- participant lock order, rating floor, history row, missing-user rollback을 실제 SQL 순서로 설명할 수 있습니까?
- tournament semifinal 두 개가 동시에 끝날 때 final row가 하나만 생기는 근거는 무엇입니까?
- persistence 실패 뒤 room, reservation, retry timer, drain waiter의 ownership은 어디에 남습니까?

## 3. 완료 기준

- 초기 sequential write와 최종 atomic command의 상태 변화 차이를 표로 완성할 수 있습니다.
- 동일 result key 20회 동시 호출에서 one creation/one effect가 되는 SQL 및 test 근거를 제시할 수 있습니다.
- match, counters, ratings, rating history, tournament match, final creation, tournament finish의 transaction 범위를 그릴 수 있습니다.
- GameHub completion과 repository finalization 사이의 deterministic key, in-flight coalescing, retry 흐름을 설명할 수 있습니다.
- 성공 broadcast가 durable result 이후에만 발생하는지 해당 SHA의 순서로 확인할 수 있습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `38504f041a6a` | `feat(db): 경기 결과 저장 구현` | B | REALTIME, PERSISTENCE | Introduces match persistence and rating effects, initially as sequential operations. |
| 2 | `75bbc762e06d` | `feat(db): match result key와 rating history schema 추가` | A | PERSISTENCE, RISK | Adds durable identities for logical outcomes and auditable participant deltas. |
| 3 | `83f9aee2522a` | `feat(db): PostgreSQL 경기 결과 중복 생성을 차단` | A | PERSISTENCE, RISK | Uses the unique result key to converge concurrent duplicate finalization. |
| 4 | `e9d577ebc1ab` | `feat(db): PostgreSQL 참가자 rating을 원자적으로 반영` | A | PERSISTENCE | Locks participants and commits match, counters, ratings, and history together. |
| 5 | `e338ea32b2a6` | `feat(db): PostgreSQL tournament 경기 확정을 연결` | S | PERSISTENCE, TOURNAMENT, RISK | Adds bracket and tournament progression to the same transaction. |
| 6 | `582a1615a2c6` | `test(db): 경기 결과 단일 확정 조건 검증` | A | PERSISTENCE, TOURNAMENT, RISK | Proves one creation and one set of effects under repetition, concurrency, and rollback. |
| 7 | `10bf15723591` | `refactor(game): 경기 결과 확정 boundary 사용` | A | REALTIME, PERSISTENCE, TOURNAMENT | Routes GameHub completion through the canonical repository command. |
| 8 | `e939a50948b2` | `fix(game): 경기 결과 저장 실패를 재시도 가능한 상태로 유지` | A | REALTIME, RISK | Keeps terminal room ownership and retries with the stable idempotency key. |

## 5. Commit별 학습 기록

### 5.1. `feat(db): 경기 결과 저장 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `38504f041a6a` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE |
| 학습 깊이 | Thread 흐름에서 맡는 구현 역할과 필요한 상태 변화를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Introduces match persistence and rating effects, initially as sequential operations.
- Classification summary: Add match completion to the repository contract so realtime game execution can persist one domain result without depending on a concrete database.

원문 구현 의도·상태 변화:

> Add match completion to the repository contract so realtime game execution can persist one domain result
> without depending on a concrete database. The input records the mode, winner and loser identities, and both
> scores; the repository returns the generated match identifier needed by later completion events.

원문 경계·failure handling·후속 범위:

> The PostgreSQL implementation writes the match and then applies the project's initial fixed rating and
> record adjustments: the winner gains a win and 16 rating points, while the loser gains a loss and loses 12
> points with an 800-point floor. The memory implementation mirrors the match record and counter updates for
> local and test use. These statements are sequential rather than wrapped in an explicit transaction in this
> revision, so the commit establishes the persistence behavior but not yet an atomic all-or-nothing result
> update.

#### 해당 SHA에서 확인할 실제 코드

- repository `createMatch` 또는 동등한 초기 completion method의 input/output contract를 확인합니다.
- PostgreSQL에서 match insert 뒤 winner win/+16 rating, loser loss/-12 rating with 800 floor가 실행되는 statement 순서를 기록합니다.
- explicit transaction이 없는지 확인하고 각 statement 사이 failure 시 남을 수 있는 부분 상태를 표로 만듭니다.
- memory implementation이 같은 observable counters/rating을 어떤 mutation 순서로 적용하는지 비교합니다.
- realtime caller가 repository-assigned match ID를 어떻게 completion event에 사용할 예정인지 연결 지점을 확인합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| Thread에서 맡는 역할 | [파일·심볼·조건·관찰 결과 작성] |
| 확인한 핵심 코드와 상태 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 후속 commit에 남긴 조건 | [파일·심볼·조건·관찰 결과 작성] |

비교 기준:
- 이 commit의 parent에서 동일 책임을 담당하던 코드를 찾아 기록합니다.
- 다음 Thread 관련 SHA: `75bbc762e06d` — `feat(db): match result key와 rating history schema 추가`

### 5.2. `feat(db): match result key와 rating history schema 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `75bbc762e06d` |
| Importance | A |
| Tags | PERSISTENCE, RISK |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Adds durable identities for logical outcomes and auditable participant deltas.
- Classification summary: Introduce the persistent foundations for idempotent match finalization and auditable rating changes.

원문 구현 의도·상태 변화:

> Introduce the persistent foundations for idempotent match finalization and auditable rating changes.
> Existing matches receive deterministic `legacy:<id>` result keys before the column becomes non-null and
> unique, preserving old rows while allowing every future logical result to have one database-enforced
> identity.

원문 경계·failure handling·후속 범위:

> A separate `rating_history` table records each participant's before value, after value, and delta against
> the finalized match. Cascading foreign keys keep the history aligned with its match and user, the
> `(match_id, user_id)` uniqueness constraint prevents duplicate participant entries, and the descending
> user/time index supports rating-history queries.

#### 해당 SHA에서 확인할 실제 코드

- matches의 `result_key` backfill이 `legacy:<id>` 형식으로 수행된 뒤 non-null/unique가 되는 migration 순서를 확인합니다.
- `rating_history` table의 match/user FK, before/after/delta, `(match_id,user_id)` uniqueness, descending index를 기록합니다.
- 기존 row 보존과 새 logical result identity 도입이 한 migration에서 어떤 단계로 진행되는지 확인합니다.
- result key와 match ID의 사용처 차이를 repository type/migration 기준으로 정리합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 boundary/decision | [파일·심볼·조건·관찰 결과 작성] |
| 상태 또는 ownership 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 주요 failure/edge path | [파일·심볼·조건·관찰 결과 작성] |
| 보장/비보장 | [파일·심볼·조건·관찰 결과 작성] |
| 다음 관련 commit 연결 | [파일·심볼·조건·관찰 결과 작성] |

비교 기준:
- 직전 Thread 관련 SHA: `38504f041a6a` — `feat(db): 경기 결과 저장 구현`
- 다음 Thread 관련 SHA: `83f9aee2522a` — `feat(db): PostgreSQL 경기 결과 중복 생성을 차단`

### 5.3. `feat(db): PostgreSQL 경기 결과 중복 생성을 차단`

| 항목 | 값 |
| --- | --- |
| SHA | `83f9aee2522a` |
| Importance | A |
| Tags | PERSISTENCE, RISK |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Uses the unique result key to converge concurrent duplicate finalization.
- Classification summary: Implement PostgreSQL match finalization around the unique result key.

원문 구현 의도·상태 변화:

> Implement PostgreSQL match finalization around the unique result key. The repository attempts the insert
> inside a transaction with `ON CONFLICT (result_key) DO NOTHING`; a concurrent or repeated command that loses
> that race reads the already-created match and returns `created: false` instead of producing another result
> row.

원문 경계·failure handling·후속 범위:

> Relying on the database uniqueness constraint, rather than an application-level check followed by an insert,
> makes idempotency hold under concurrent requests. Duplicate invocations also return before later
> finalization side effects, giving the result key responsibility for the whole logical operation.

#### 해당 SHA에서 확인할 실제 코드

- transaction 안의 match insert와 `ON CONFLICT (result_key) DO NOTHING`을 확인합니다.
- insert winner와 duplicate loser가 같은 existing match를 read back하는 query와 반환 `created` 값을 추적합니다.
- duplicate path가 후속 rating/tournament side effect 전에 return하는 control flow를 확인합니다.
- application pre-check가 아니라 database unique constraint가 동시성을 보장하는 근거를 statement 순서로 기록합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 boundary/decision | [파일·심볼·조건·관찰 결과 작성] |
| 상태 또는 ownership 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 주요 failure/edge path | [파일·심볼·조건·관찰 결과 작성] |
| 보장/비보장 | [파일·심볼·조건·관찰 결과 작성] |
| 다음 관련 commit 연결 | [파일·심볼·조건·관찰 결과 작성] |

비교 기준:
- 직전 Thread 관련 SHA: `75bbc762e06d` — `feat(db): match result key와 rating history schema 추가`
- 다음 Thread 관련 SHA: `e9d577ebc1ab` — `feat(db): PostgreSQL 참가자 rating을 원자적으로 반영`

### 5.4. `feat(db): PostgreSQL 참가자 rating을 원자적으로 반영`

| 항목 | 값 |
| --- | --- |
| SHA | `e9d577ebc1ab` |
| Importance | A |
| Tags | PERSISTENCE |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Locks participants and commits match, counters, ratings, and history together.
- Classification summary: Extend successful PostgreSQL finalization so the match row, participant counters, current ratings, and rating-history records are committed in one transaction.

원문 구현 의도·상태 변화:

> Extend successful PostgreSQL finalization so the match row, participant counters, current ratings, and
> rating-history records are committed in one transaction. Distinct participant identifiers are sorted and
> locked with `SELECT ... FOR UPDATE`, which serializes concurrent rating changes and gives competing
> transactions a consistent lock order.

원문 경계·failure handling·후속 범위:

> The winner gains 16 rating points and a win, while the loser loses 12 points subject to an 800-point floor
> and receives a loss. Each change records its exact before, after, and delta values. Missing participants
> abort the transaction, and the pre-existing duplicate-result path returns before these updates, so retries
> cannot apply rating effects twice.

#### 해당 SHA에서 확인할 실제 코드

- winner/loser ID를 정렬해 `SELECT ... FOR UPDATE`하는 lock order와 missing participant 검증을 확인합니다.
- match insert, counter/rating update, rating-history insert가 같은 transaction executor를 사용하는지 추적합니다.
- winner +16, loser -12 및 800 floor에서 실제 before/after/delta가 계산되는 위치를 기록합니다.
- participant가 없을 때 transaction 전체가 rollback되는 throw path를 확인합니다.
- duplicate result path에서는 lock/update/history가 실행되지 않는지 확인합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 boundary/decision | [파일·심볼·조건·관찰 결과 작성] |
| 상태 또는 ownership 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 주요 failure/edge path | [파일·심볼·조건·관찰 결과 작성] |
| 보장/비보장 | [파일·심볼·조건·관찰 결과 작성] |
| 다음 관련 commit 연결 | [파일·심볼·조건·관찰 결과 작성] |

비교 기준:
- 직전 Thread 관련 SHA: `83f9aee2522a` — `feat(db): PostgreSQL 경기 결과 중복 생성을 차단`
- 다음 Thread 관련 SHA: `e338ea32b2a6` — `feat(db): PostgreSQL tournament 경기 확정을 연결`

### 5.5. `feat(db): PostgreSQL tournament 경기 확정을 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `e338ea32b2a6` |
| Importance | S |
| Tags | PERSISTENCE, TOURNAMENT, RISK |
| 학습 깊이 | Architecture/invariant 중심으로 직전 상태, 결정, 핵심 전이, ownership, failure, 후속 검증까지 완전히 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Adds bracket and tournament progression to the same transaction.
- Classification summary: Include tournament progression in PostgreSQL’s match-finalization transaction.

원문 구현 의도·상태 변화:

> Include tournament progression in PostgreSQL’s match-finalization transaction. The repository locks both the
> bracket match and its tournament, rejects missing or already-linked matches, and verifies that the reported
> winner and loser belong to the scheduled participants before attaching the realtime room, durable match,
> result, and scores.

원문 경계·failure handling·후속 범위:

> When a semifinal completes, the transaction reads the finished semifinal winners and inserts the single
> final only after both are available; the bracket’s unique round/slot key makes concurrent insert attempts
> converge. Final-round completion marks the tournament and winner in the same transaction. These locks and
> constraints prevent duplicate finals, cross-match results, and a durable match record that is not reflected
> in bracket state.

#### Source의 Most Important Commit 정의

##### Problem

> Persisting a match separately from ratings and bracket progression could leave a durable game that the
> tournament does not reflect, especially under concurrent semifinal completion or retries.

##### Decision

> Lock the bracket match and tournament inside the match-finalization transaction, validate participants, link
> the result, create the final idempotently, and finish the tournament atomically.

##### Why it mattered

> Database locks and uniqueness constraints make retries and concurrent semifinal completion converge instead
> of duplicating finals or splitting domain state.

##### What changed

> The transaction now covers room linkage, persisted match identity, scores, winner, semifinal winner reads,
> final insertion, and tournament winner/status updates.

##### Project understanding

> It explains the project’s strongest persistence guarantee: one logical game outcome crosses match, rating,
> history, and tournament domains as one commit.

#### 해당 SHA에서 확인할 실제 코드

- finalization transaction에서 tournament match와 owning tournament를 lock하는 SQL 및 lock 순서를 확인합니다.
- missing/already-linked match, scheduled participant mismatch를 mutation 전에 거부하는 조건을 기록합니다.
- room ID, durable match ID, winner, scores가 bracket row에 연결되는 statement를 확인합니다.
- 두 semifinal winner를 읽고 final을 생성하는 조건과 unique round/slot + conflict handling을 기록합니다.
- final completion이 tournament status/winner를 같은 transaction에서 갱신하는지 확인합니다.
- ordinary match/rating/history와 tournament progression이 동일 transaction object를 공유하는 call chain을 그립니다.
- concurrent semifinal 또는 retry에서 duplicate final/cross-match result를 막는 lock/constraint 조합을 설명할 근거를 수집합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 이 commit 직전 실제 ownership/state | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제와 기존 설계의 부족함 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 decision과 대안 배제 근거 | [파일·심볼·조건·관찰 결과 작성] |
| 입력 → 상태 전이 → 출력/side effect | [파일·심볼·조건·관찰 결과 작성] |
| ownership/lifetime/cleanup 변화 | [파일·심볼·조건·관찰 결과 작성] |
| failure scenario와 복구/rollback | [파일·심볼·조건·관찰 결과 작성] |
| 이 commit이 보장하는 것 | [파일·심볼·조건·관찰 결과 작성] |
| 아직 보장하지 않는 것 | [파일·심볼·조건·관찰 결과 작성] |
| 후속 fix/test와 연결 | [파일·심볼·조건·관찰 결과 작성] |

비교 기준:
- 직전 Thread 관련 SHA: `e9d577ebc1ab` — `feat(db): PostgreSQL 참가자 rating을 원자적으로 반영`
- 다음 Thread 관련 SHA: `582a1615a2c6` — `test(db): 경기 결과 단일 확정 조건 검증`

### 5.6. `test(db): 경기 결과 단일 확정 조건 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `582a1615a2c6` |
| Importance | A |
| Tags | PERSISTENCE, TOURNAMENT, RISK |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Proves one creation and one set of effects under repetition, concurrency, and rollback.
- Classification summary: Verify the repository’s match-finalization boundary under repetition, concurrency, and partial failure.

원문 구현 의도·상태 변화:

> Verify the repository’s match-finalization boundary under repetition, concurrency, and partial failure.
> Twenty concurrent calls with the same result key must return one match identifier, report only one creation,
> record one result, and apply winner/loser statistics and rating history exactly once in both repository
> implementations.

원문 경계·failure handling·후속 범위:

> PostgreSQL coverage also requires the transaction to roll back match and rating effects when tournament
> linkage fails. Concurrent semifinal finalizations must attach both source matches and create a single final
> with the correct winners. These cases protect the core invariant that gameplay completion is one atomic,
> idempotent domain transition rather than several independently repeatable writes.

#### 해당 SHA에서 확인할 실제 코드

- memory와 PostgreSQL에서 동일 result key를 20회 동시 호출하는 test harness와 result aggregation을 확인합니다.
- one match ID, exactly one `created: true`, one result row, counters/rating/history exactly once assertion을 구분합니다.
- tournament linkage failure를 주입해 PostgreSQL match/rating effect rollback을 검증하는 지점을 찾습니다.
- 두 semifinal finalization을 병렬 실행하고 source matches linkage와 single final participants를 확인하는 assertion을 기록합니다.
- 이 suite가 broad integration인지 deterministic regression인지 backend별로 분류합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | 한 logical result는 반복·동시 호출에서도 match/rating/history/tournament effect를 정확히 한 번만 생성합니다. |
| 재현하는 failure/boundary | duplicate row/effect, partial rollback, duplicate final, inconsistent finalist. |
| test technique | 20-way concurrency, injected transaction failure, parallel semifinal completion, memory/PostgreSQL parity. |
| 통과하는 production path | `finalizeMatch` validation → unique key/locks → writes/history → tournament progression → commit/readback. |
| 증명하는 것 | repository boundary의 atomicity와 idempotency를 실제 backend에서 검증합니다. |
| 증명하지 않는 것 | GameHub retry timing이나 client completion visibility는 직접 검증하지 않습니다. |
| test 성격 | Deterministic concurrency regression + real PostgreSQL integration. |
| 후속 회귀 방지 설명 | [학습자 작성 — 어떤 변경이 이 테스트를 깨뜨려야 하는지 기록] |

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 boundary/decision | [파일·심볼·조건·관찰 결과 작성] |
| 상태 또는 ownership 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 주요 failure/edge path | [파일·심볼·조건·관찰 결과 작성] |
| 보장/비보장 | [파일·심볼·조건·관찰 결과 작성] |
| 다음 관련 commit 연결 | [파일·심볼·조건·관찰 결과 작성] |

비교 기준:
- 직전 Thread 관련 SHA: `e338ea32b2a6` — `feat(db): PostgreSQL tournament 경기 확정을 연결`
- 다음 Thread 관련 SHA: `10bf15723591` — `refactor(game): 경기 결과 확정 boundary 사용`

### 5.7. `refactor(game): 경기 결과 확정 boundary 사용`

| 항목 | 값 |
| --- | --- |
| SHA | `10bf15723591` |
| Importance | A |
| Tags | REALTIME, PERSISTENCE, TOURNAMENT |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Routes GameHub completion through the canonical repository command.
- Classification summary: Route room completion through the repository’s atomic match-finalization boundary instead of separately creating a match and then updating tournament state.

원문 구현 의도·상태 변화:

> Route room completion through the repository’s atomic match-finalization boundary instead of separately
> creating a match and then updating tournament state. The room supplies a deterministic result key plus
> optional tournament context, so persistence can make retries idempotent and commit related match, rating,
> and bracket effects together.

원문 경계·failure handling·후속 범위:

> A room-level in-flight promise coalesces concurrent finish triggers and is cleared only if finalization
> fails, allowing a later retry without duplicating successful work. Broadcasting the finished event occurs
> after the repository returns the canonical match identifier, so clients observe a result that has crossed
> the durable boundary.

#### 해당 SHA에서 확인할 실제 코드

- room completion이 legacy create/update 경로 대신 `finalizeMatch`를 호출하는 위치를 확인합니다.
- room에서 deterministic result key를 만드는 구성 요소와 tournament context 전달 조건을 기록합니다.
- room-level in-flight promise가 concurrent finish trigger를 coalesce하는 branch를 추적합니다.
- 성공 시 promise/result를 유지하고 failure 때만 clear해 later retry를 허용하는지 확인합니다.
- repository가 canonical match ID를 반환한 뒤에만 `game.finished`를 broadcast하는 순서를 기록합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 boundary/decision | [파일·심볼·조건·관찰 결과 작성] |
| 상태 또는 ownership 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 주요 failure/edge path | [파일·심볼·조건·관찰 결과 작성] |
| 보장/비보장 | [파일·심볼·조건·관찰 결과 작성] |
| 다음 관련 commit 연결 | [파일·심볼·조건·관찰 결과 작성] |

비교 기준:
- 직전 Thread 관련 SHA: `582a1615a2c6` — `test(db): 경기 결과 단일 확정 조건 검증`
- 다음 Thread 관련 SHA: `e939a50948b2` — `fix(game): 경기 결과 저장 실패를 재시도 가능한 상태로 유지`

### 5.8. `fix(game): 경기 결과 저장 실패를 재시도 가능한 상태로 유지`

| 항목 | 값 |
| --- | --- |
| SHA | `e939a50948b2` |
| Importance | A |
| Tags | REALTIME, RISK |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Keeps terminal room ownership and retries with the stable idempotency key.
- Classification summary: Keeps finished room alive when persistence fails; retries finalizeMatch with stable idempotency key using exponential backoff 250ms capped 5s.

원문 구현 의도·상태 변화:

> Keeps finished room alive when persistence fails; retries finalizeMatch with stable idempotency key using
> exponential backoff 250ms capped 5s. Retry timer belongs to room and is cleared on abandon/close/remove.
> Reservations are no longer released on transient failure, and drain waits on finishing promise.

#### 해당 SHA에서 확인할 실제 코드

- persistence 실패 뒤 room이 finished/finishing 상태로 map에 남는지 확인합니다.
- 같은 room-derived result key를 유지한 채 250 ms에서 시작해 5 s cap까지 증가하는 retry scheduling을 추적합니다.
- retry timer의 room ownership과 abandon/close/remove에서 clear되는 모든 cleanup path를 찾습니다.
- transient failure 동안 reservation이 release되지 않고 `game.finished`가 broadcast되지 않는지 확인합니다.
- drain waiter가 in-flight/ retry finalization을 기다리는 조건을 기록합니다.
- 성공 뒤 observer, broadcast, room removal 순서와 재시도 중복 효과를 막는 repository idempotency 연결을 확인합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### Fix 연결 골격

- 기존 가정: terminal room의 persistence 호출이 한 번 실패하면 room을 즉시 제거하거나 reservation을 풀어도 됨.
- Source에서 드러난 failure/risk: 완료된 gameplay 결과가 유실되거나 retry가 다른 logical result로 중복 반영되고 drain이 미완료 persistence를 놓침.
- Root cause 코드 근거: [학습자 작성 — 해당 SHA의 실제 caller, state, branch를 인용]
- 수정된 decision/invariant: terminal room과 stable result key를 유지하고 bounded exponential backoff로 `finalizeMatch`를 재시도함.
- 실제 수정 코드: [학습자 작성 — 파일, 심볼, 변경 전/후 최소 코드]
- Regression 연결: fake-timer failure-then-success 시나리오에서 same key, delayed broadcast/removal, observer outcome, drain wait를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 boundary/decision | [파일·심볼·조건·관찰 결과 작성] |
| 상태 또는 ownership 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 주요 failure/edge path | [파일·심볼·조건·관찰 결과 작성] |
| 보장/비보장 | [파일·심볼·조건·관찰 결과 작성] |
| 다음 관련 commit 연결 | [파일·심볼·조건·관찰 결과 작성] |

비교 기준:
- 직전 Thread 관련 SHA: `10bf15723591` — `refactor(game): 경기 결과 확정 boundary 사용`
- 이 Thread의 최종 상태와 비교해 이후 보완 여부를 기록합니다.

## 6. Invariant ledger

Source에서 확정된 invariant를 아래 시점별로 연결합니다. 새 invariant를 추측해 확정하지 않습니다.

| Invariant | 처음 도입/관찰한 SHA | 강화한 SHA | 부족함이 드러난 SHA | 복구한 fix | 고정한 regression test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| A logical match result, participant statistics, rating history, and tournament progression commit atomically and idempotently. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| Timers, schedulers, heartbeat handles, retry work, snapshot buffers, and database resources have explicit single-owner cleanup. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |

추가 기록:

- invariant가 동일한 문장으로 유지되었는지, 더 강한 조건으로 바뀌었는지 구분합니다.
- implementation detail과 invariant를 혼동하지 않습니다.
- source가 명시하지 않은 규칙은 “관찰한 가설”로 표시하고 코드 근거로만 남깁니다.

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| match/rating write가 sequential하여 부분 상태 가능 | `75bbc762e06d` result identity/history → `83f9aee2522a` idempotency → `e9d577ebc1ab` transaction | `582a1615a2c6` repetition/concurrency/rollback | one logical finalization |
| tournament progression이 match와 분리될 위험 | `e338ea32b2a6` same transaction | `582a1615a2c6` concurrent semifinal/single final | atomic bracket progression |
| GameHub persistence 실패 시 result 유실 또는 중복 위험 | `10bf15723591` canonical command → `e939a50948b2` stable-key retry | 해당 SHA의 retry regression을 실제 test에서 연결 | terminal room retains ownership until durable success |

학습자 보완 기록:

- 실제 failure를 주입하거나 재현하는 test fixture를 찾아 위 표의 각 행과 연결합니다.
- fix가 symptom만 가리는지, ownership/invariant를 바꾸는지 코드 근거로 판별합니다.
- broad integration과 deterministic regression을 별도 표시합니다.

## 8. Ownership / state / responsibility 변화

| 축 | 초기 SHA의 owner/state | 중간 전환 | Thread 최종 owner/state | 해제·cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| logical result identity | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| database transaction and row locks | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| rating and history side effects | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| tournament progression | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| terminal room and retry lifecycle | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |

## 9. Thread 최종 상태

다음 항목은 최종 HEAD를 보고 채우지 말고, 이 Thread의 마지막 commit까지 순서대로 복원한 결과로 작성합니다.

- 최종 authoritative owner: [학습자 작성]
- 최종 상태/invariant: [학습자 작성]
- 남아 있는 의도적 제한 또는 비보장: [학습자 작성]
- 후속 Thread가 의존하는 contract: [학습자 작성]
- 대표 코드 근거: [SHA, 파일, symbol]

## 10. 최종 architecture 또는 execution flow 정리

- `finalizeMatch` 한 번이 소유하는 모든 durable side effect를 작성합니다.
- duplicate retry, concurrent semifinal, missing participant, tournament linkage failure 각각의 결과를 표로 정리합니다.
- persistence가 잠시 실패해도 match result를 유실하거나 중복 적용하지 않는 전체 복구 흐름을 설명합니다.

```text
[입력/이벤트]
    ↓
[소유 boundary와 validation]
    ↓
[상태 전이 또는 side effect]
    ↓
[출력/관측/cleanup]
```

위 흐름의 각 화살표에 실제 SHA와 symbol을 붙입니다.

## 11. 학습 완료 자가 점검

- [ ] Commit map의 모든 SHA를 원문 순서대로 확인했습니다.
- [ ] 각 commit의 subject, importance, tags를 변경하지 않았습니다.
- [ ] S/A/B 깊이를 구분해 코드 근거를 남겼습니다.
- [ ] final HEAD의 구현을 과거 SHA에 소급하지 않았습니다.
- [ ] 핵심 상태 필드, caller/callee, ownership, failure branch, cleanup을 실제 코드로 확인했습니다.
- [ ] Fix를 기존 가정 → failure/risk → root cause → decision → code → regression 순서로 연결했습니다.
- [ ] Test commit에서 production invariant, failure, technique, path, 증명/비증명 범위를 구분했습니다.
- [ ] Thread 최종 execution flow를 별도 프로젝트 재학습 없이 설명할 수 있습니다.
