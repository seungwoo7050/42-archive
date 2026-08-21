# 원자적·멱등적 경기 결과 확정

원문 Development Thread: `Atomic and idempotent match finalization`

## 1. Thread 목표

- 경기 row와 rating update가 순차 실행되던 초기 구현에서 하나의 논리적 `finalizeMatch` command로 수렴하는 과정을 복원합니다.
- result key, unique constraint, ordered row lock, transaction, rating history, tournament bracket update가 중복·부분 반영을 어떻게 차단하는지 확인합니다.
- GameHub가 durable boundary를 호출하고 persistence failure 동안 terminal room ownership을 유지하며 같은 idempotency key로 재시도하는 흐름을 추적합니다.

### Source에서 확정된 significance

> This thread converts a multi-write best-effort workflow into one logical domain command. Database uniqueness, ordered row locks, transaction-scoped tournament progression, runtime integration, and retryable room ownership together ensure that a completed game is neither duplicated nor partially reflected in ratings or brackets.

### 직접 연결되는 Critical Invariants

> A logical match result, participant statistics, rating history, and tournament progression commit atomically and idempotently.

> Timers, schedulers, heartbeat handles, retry work, snapshot buffers, and database resources have explicit single-owner cleanup.

### 직접 연결되는 Major Engineering Difficulties

> Preventing duplicate results, ratings, finals, friendship rows, tournament seeds, and admissions under retries or concurrent database operations.

> Preserving domain correctness during database failure, tournament-start rollback, match-finalization retry, process drain, and deployment shutdown.

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

> 검토 방식: 지정 브랜치에 속한 exact SHA의 diff와 해당 시점 파일을 GitHub에서 확인했습니다. 로컬 실행 환경은 GitHub clone이 차단되어 테스트 명령은 실행하지 않았으며, 아래 테스트 결과 설명은 test implementation 검토에 한정합니다.

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
| 학습 깊이 | Thread 흐름에서 맡는 구현 역할과 필요한 상태 변화를 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Introduces match persistence and rating effects, initially as sequential operations.
- Classification summary: Add match completion to the repository contract and initial fixed rating effects.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | realtime 경기 종료를 repository abstraction으로 durable match와 사용자 통계에 반영하는 command가 없었습니다. |
| 핵심 boundary/decision | repository `createMatch` contract가 mode, winner/loser IDs, scores를 받고 generated match ID를 반환합니다. PostgreSQL은 match insert 뒤 winner win/+16, loser loss/-12 with 800 floor를 순차 실행합니다. |
| 상태 또는 ownership 변화 | repository가 persistence effects를 수행하지만 명시적 transaction이 없어 각 SQL statement가 독립 commit될 수 있습니다. memory implementation은 local state를 비슷한 순서로 변경합니다. |
| 주요 failure/edge path | match insert 후 winner update 또는 loser update가 실패하면 match만 존재하거나 한쪽 통계만 반영되는 부분 상태가 가능합니다. retry identity도 없어 중복 row를 막지 못합니다. |
| 보장/비보장 | 한 호출의 happy path에서 match ID와 초기 rating effects를 생성합니다. atomicity, idempotency, audit history, tournament progression은 보장하지 않습니다. |
| 다음 관련 commit 연결 | `75bbc7...`가 logical result key와 rating history schema를 추가해 durable identity와 audit 기반을 만듭니다. |

비교 기준:
- 이 commit의 parent에서 동일 책임을 담당하던 코드를 비교했습니다.
- 다음 Thread 관련 SHA: `75bbc762e06d` — `feat(db): match result key와 rating history schema 추가`

### 5.2. `feat(db): match result key와 rating history schema 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `75bbc762e06d` |
| Importance | A |
| Tags | PERSISTENCE, RISK |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Adds durable identities for logical outcomes and auditable participant deltas.
- Classification summary: Introduce a unique logical result key and one rating-history row per match participant.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | persisted match ID는 DB insert 후에만 생겨 같은 logical room result의 retry/concurrent call을 미리 식별할 수 없었습니다. rating delta의 독립 audit row도 없었습니다. |
| 핵심 boundary/decision | migration이 `matches.result_key`를 legacy rows에 backfill하고 NOT NULL/UNIQUE로 만들며 `rating_history`에 `(match_id,user_id)` unique identity를 둡니다. |
| 상태 또는 ownership 변화 | caller가 stable logical result key를 제공하고 database unique constraint가 duplicate command의 선형화 지점을 소유합니다. history table이 participant delta audit를 소유합니다. |
| 주요 failure/edge path | schema만으로는 application이 transaction을 사용하거나 rating/tournament effects를 idempotently 실행하지 않습니다. 기존 row는 `legacy:<id>`로 충돌 없이 보존합니다. |
| 보장/비보장 | 동일 result key의 두 match row와 동일 participant history duplicate를 DB가 거부할 수 있습니다. canonical finalize behavior는 뒤 commits에서 구현됩니다. |
| 다음 관련 commit 연결 | `83f9ae...`가 `ON CONFLICT DO NOTHING`과 transaction readback으로 duplicate match creation을 수렴시킵니다. |

비교 기준:
- 직전 Thread 관련 SHA: `38504f041a6a` — `feat(db): 경기 결과 저장 구현`
- 다음 Thread 관련 SHA: `83f9aee2522a` — `feat(db): PostgreSQL 경기 결과 중복 생성을 차단`

### 5.3. `feat(db): PostgreSQL 경기 결과 중복 생성을 차단`

| 항목 | 값 |
| --- | --- |
| SHA | `83f9aee2522a` |
| Importance | A |
| Tags | PERSISTENCE, RISK |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Uses the unique result key to converge concurrent duplicate finalization.
- Classification summary: Create `finalizeMatch` and make match-row creation idempotent under retries and concurrency.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | unique schema는 있지만 caller가 충돌을 일반 error로 받거나 기존 match ID를 일관되게 재사용할 command path가 없었습니다. |
| 핵심 boundary/decision | `PostgresRepository.finalizeMatch`가 transaction 안에서 match를 `ON CONFLICT (result_key) DO NOTHING RETURNING`으로 insert합니다. insert가 없으면 existing row를 읽고 `{created:false}`로 즉시 반환합니다. |
| 상태 또는 ownership 변화 | result key가 logical command identity를, existing/new match row가 persisted identity를 소유합니다. duplicate caller는 동일 match ID에 수렴합니다. |
| 주요 failure/edge path | 이 SHA에서는 duplicate row 차단만 완성되며 rating/tournament side effect까지 같은 transaction에 포함됐다고 볼 수 없습니다. |
| 보장/비보장 | 같은 result key로 match row가 둘 생기지 않고 retry가 existing match를 돌려받습니다. participant effects의 atomicity는 `e9d577...` 범위입니다. |
| 다음 관련 commit 연결 | `e9d577...`가 participant lock·counters·ratings·history를 같은 transaction에 넣습니다. |

비교 기준:
- 직전 Thread 관련 SHA: `75bbc762e06d` — `feat(db): match result key와 rating history schema 추가`
- 다음 Thread 관련 SHA: `e9d577ebc1ab` — `feat(db): PostgreSQL 참가자 rating을 원자적으로 반영`

### 5.4. `feat(db): PostgreSQL 참가자 rating을 원자적으로 반영`

| 항목 | 값 |
| --- | --- |
| SHA | `e9d577ebc1ab` |
| Importance | A |
| Tags | PERSISTENCE |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Locks participants and commits match, counters, ratings, and history together.
- Classification summary: Extend the idempotent match transaction to participant statistics, ratings, and audit history.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | match row는 idempotent하지만 user counters/rating/history가 transaction 밖이거나 중복 call에서 다시 실행되면 partial/double effects가 남을 수 있었습니다. |
| 핵심 boundary/decision | new match인 경우 participant IDs를 정렬해 `FOR UPDATE`로 잠그고 pre-rating을 읽은 뒤 winner +16, loser max(800, -12), win/loss counters, 두 rating history rows를 같은 transaction에서 반영합니다. |
| 상태 또는 ownership 변화 | transaction이 match와 participant effects의 atomic owner가 됩니다. user ID 정렬은 concurrent matches의 lock order를 고정합니다. |
| 주요 failure/edge path | participant가 없거나 update/history insert가 실패하면 transaction 전체가 rollback됩니다. duplicate result는 new effects 전에 existing row return path로 빠집니다. |
| 보장/비보장 | match row, counters, ratings, rating history가 one logical result에 대해 한 번만 all-or-nothing commit됩니다. tournament bracket은 아직 포함되지 않습니다. |
| 다음 관련 commit 연결 | `e338ea...`가 tournament match와 final creation/finish를 같은 transaction에 편입합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `83f9aee2522a` — `feat(db): PostgreSQL 경기 결과 중복 생성을 차단`
- 다음 Thread 관련 SHA: `e338ea32b2a6` — `feat(db): PostgreSQL tournament 경기 확정을 연결`

### 5.5. `feat(db): PostgreSQL tournament 경기 확정을 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `e338ea32b2a6` |
| Importance | S |
| Tags | PERSISTENCE, TOURNAMENT, RISK |
| 학습 깊이 | Architecture/invariant 중심으로 직전 상태, 결정, 핵심 전이, ownership, failure, 후속 검증까지 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Adds bracket and tournament progression to the same transaction.
- Classification summary: Make tournament progression part of the canonical atomic/idempotent match finalization command.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 일반 match와 rating은 atomic해졌지만 tournament match state, semifinal winner slots, final creation, tournament winner가 별도 write라면 bracket이 durable result와 어긋날 수 있었습니다. |
| 핵심 boundary/decision | `finalizeMatch` transaction이 tournament match와 tournament row를 잠그고 final/participant mismatch를 거부하며, 해당 match winner를 조건부 update합니다. 두 semifinal이 완료되면 final row를 한 번 만들고 final 완료 시 tournament를 finished/winner로 변경합니다. |
| 상태 또는 ownership 변화 | 하나의 database transaction이 logical result, participant effects, bracket progression의 authoritative commit owner가 됩니다. |
| 주요 failure/edge path | 이미 final인 tournament match, input participant mismatch, missing tournament data는 rollback됩니다. conditional writes와 locked parent state가 concurrent semifinal/final duplicate를 막습니다. |
| 보장/비보장 | match·ratings·history·tournament progression은 하나의 idempotent transaction으로 commit됩니다. runtime GameHub가 이 boundary를 사용하고 failure를 재시도하는 것은 뒤 commits입니다. |
| 다음 관련 commit 연결 | `582a16...`이 repetition/concurrency/rollback을 PostgreSQL integration으로 검증하고 `10bf15...`가 GameHub를 연결합니다. |

#### Architecture / invariant 복원

| 축 | 복원 결과 |
| --- | --- |
| 문제 | durable match만 원자적이어도 tournament bracket이 별도 처리되면 semifinal/final duplication과 partial progression이 가능합니다. |
| 실패 위험 | match는 finished인데 bracket slot이 비거나, final row가 둘 생기거나, tournament winner가 누락될 수 있습니다. |
| 핵심 결정 | tournament match/parent tournament lock과 progression을 existing finalize transaction에 포함합니다. |
| 구현 경로 | result-key insert/read → participant locks/effects → tournament match lock/validate → winner update → final create 또는 tournament finish → commit. |
| 수명주기·상태 | transaction 시작부터 commit까지 DB rows가 command ownership을 갖고 rollback 시 외부에 partial state를 남기지 않습니다. |
| 실패 처리 | participant mismatch, terminal replay, missing row, any SQL failure는 모두 rollback; duplicate result key는 side effects 전에 existing result로 수렴합니다. |
| 후속 검증 | `582a161...` concurrent same-key, rating/history once, semifinal/final progression, invalid participant rollback tests. |
| Thread 전체 의미 | 경기 종료를 여러 테이블 write의 순서가 아니라 하나의 domain command로 취급할 수 있습니다. |

비교 기준:
- 직전 Thread 관련 SHA: `e9d577ebc1ab` — `feat(db): PostgreSQL 참가자 rating을 원자적으로 반영`
- 다음 Thread 관련 SHA: `582a1615a2c6` — `test(db): 경기 결과 단일 확정 조건 검증`

### 5.6. `test(db): 경기 결과 단일 확정 조건 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `582a1615a2c6` |
| Importance | A |
| Tags | PERSISTENCE, TOURNAMENT, RISK |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Proves one creation and one set of effects under repetition, concurrency, and rollback.
- Classification summary: Add PostgreSQL integration regressions for idempotency, atomic participant effects, and tournament progression.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | transaction code는 존재하지만 concurrent calls와 mid-command failure에서 실제 PostgreSQL constraints/locks/rollback이 의도대로 작동한다는 증거가 부족했습니다. |
| 핵심 boundary/decision | PostgreSQL integration fixtures가 동일 result key 반복 및 동시 호출에서 created가 한 번만 true인지, ratings/history가 한 번만 변하는지, semifinal/final progression과 invalid participant rollback을 검사합니다. |
| 상태 또는 ownership 변화 | real PostgreSQL transaction과 constraints를 test fixture가 사용하며 in-memory mock으로 대체하지 않습니다. |
| 주요 failure/edge path | duplicate 20회, participant/tournament mismatch, command failure에서 partial match/rating/bracket row가 남지 않는지를 DB query로 확인합니다. |
| 보장/비보장 | 검사한 concurrency와 rollback 사례에서 one creation/one effect를 증명합니다. 모든 isolation anomaly, external process kill, production load를 일반화하지 않습니다. |
| 다음 관련 commit 연결 | `10bf15...`가 runtime completion을 검증된 repository boundary로 바꿉니다. |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | logical result, participant effects, history, tournament progression은 atomic·idempotent합니다. |
| 재현하는 failure/boundary | 같은 result key 반복/20-way concurrency, participant mismatch, tournament semifinal/final progression, rollback. |
| test technique | Real PostgreSQL integration tests with concurrent promises and direct post-state queries. |
| 통과하는 production path | `PostgresRepository.finalizeMatch` → unique insert/locks/updates/history/bracket → commit/rollback. |
| 증명하는 것 | 해당 DB schema/implementation에서 one creation/one effect와 tested rollback을 증명합니다. |
| 증명하지 않는 것 | process crash at every possible point, distributed DB topology, GameHub retry lifecycle는 증명하지 않습니다. |
| test 성격 | PostgreSQL deterministic concurrency and rollback regression. |
| 후속 회귀 방지 설명 | unique key, lock order, transaction scope, rating/history/tournament writes가 분리되면 실패해야 합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `e338ea32b2a6` — `feat(db): PostgreSQL tournament 경기 확정을 연결`
- 다음 Thread 관련 SHA: `10bf15723591` — `refactor(game): 경기 결과 확정 boundary 사용`

### 5.7. `refactor(game): 경기 결과 확정 boundary 사용`

| 항목 | 값 |
| --- | --- |
| SHA | `10bf15723591` |
| Importance | A |
| Tags | REALTIME, PERSISTENCE, TOURNAMENT |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Routes GameHub completion through the canonical repository command.
- Classification summary: Replace ad-hoc completion persistence with `finalizeMatch` and a stable room-derived result key.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | repository command가 atomic해도 GameHub가 기존 `createMatch` 또는 별도 writes를 사용하면 production completion은 invariant를 얻지 못합니다. |
| 핵심 boundary/decision | `apps/api/src/gameHub.ts::finalizeRoom`이 `repo.finalizeMatch`를 호출하고 result key를 `room:<roomId>:finished`로 고정하며 mode, participants, scores, optional tournamentMatchId를 한 command에 넘깁니다. |
| 상태 또는 ownership 변화 | GameHub는 terminal room context와 deterministic key를 소유하고 repository는 durable effects를 소유합니다. client event의 matchId는 returned finalization result에서 나옵니다. |
| 주요 failure/edge path | 동일 room completion의 재호출은 같은 key로 DB existing result에 수렴합니다. 이 SHA에서 persistence reject 후 room을 어떻게 유지하는지는 아직 강화 전입니다. |
| 보장/비보장 | production completion이 canonical atomic/idempotent boundary를 사용합니다. transient DB failure 중 retry ownership은 `e939a5...`에서 완성됩니다. |
| 다음 관련 commit 연결 | `e939a5...`가 failed finalization 뒤 room을 버리지 않고 in-flight coalescing과 bounded backoff retry를 추가합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `582a1615a2c6` — `test(db): 경기 결과 단일 확정 조건 검증`
- 다음 Thread 관련 SHA: `e939a50948b2` — `fix(game): 경기 결과 저장 실패를 재시도 가능한 상태로 유지`

### 5.8. `fix(game): 경기 결과 저장 실패를 재시도 가능한 상태로 유지`

| 항목 | 값 |
| --- | --- |
| SHA | `e939a50948b2` |
| Importance | A |
| Tags | REALTIME, RISK |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Keeps terminal room ownership and retries with the stable idempotency key.
- Classification summary: Preserve the terminal room and coalesce/retry finalization until durable commit succeeds or the hub is closed.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | GameHub가 terminal state에서 repository failure를 받은 뒤 room을 제거하거나 ownership을 놓으면 결과가 영구 누락되고 retry할 context/key가 사라질 수 있었습니다. |
| 핵심 boundary/decision | room에 shared `finishing` promise와 retry timer를 두고 failure 시 room을 유지합니다. retry delay는 250ms부터 증가해 5초에서 상한이며 모든 시도는 같은 `room:<id>:finished` key를 사용합니다. |
| 상태 또는 ownership 변화 | terminal room이 successful durable finalization까지 context와 retry ownership을 유지합니다. concurrent finalize caller는 동일 promise를 공유합니다. |
| 주요 failure/edge path | 실패 시 broadcast/remove를 하지 않고 timer를 예약합니다. 성공 후에만 terminal result를 보내고 room을 제거합니다. room discard/hub close는 retry timer를 정리합니다. process restart를 넘는 retry는 보장하지 않습니다. |
| 보장/비보장 | transient repository failure가 in-process terminal result를 잃게 하지 않고 duplicate work는 DB idempotency와 promise coalescing으로 제한됩니다. |
| 다음 관련 commit 연결 | 후속 room/drain Thread는 terminal room이 retry 중에도 owned resource라는 contract에 의존합니다. |

#### Fix 재구성

| 단계 | 근거 |
| --- | --- |
| 이전 가정 | 게임이 terminal이면 persistence 호출 성공 여부와 관계없이 room lifecycle을 끝낼 수 있다는 가정. |
| 실제 실패 또는 위험 | DB 일시 장애에서 match/rating/tournament 결과가 누락되고 재시도 key/context가 사라집니다. |
| Root cause | terminal simulation state와 durable finalization 완료 상태를 같은 lifecycle 단계로 취급했습니다. |
| 수정된 invariant/decision | durable success 전까지 room을 유지하고 하나의 in-flight promise와 bounded backoff timer가 재시도를 소유합니다. |
| 변경 코드 | `apps/api/src/gameHub.ts` room `finishing`/retry timer, `finalizeRoom`, cleanup paths. |
| Regression evidence | repository rejection 뒤 room 유지, retry same key, success only-once removal/broadcast를 GameHub tests가 검사해야 합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `10bf15723591` — `refactor(game): 경기 결과 확정 boundary 사용`
- 이 Thread의 마지막 상태와 비교해 최종 보장을 정리했습니다.

## 6. Invariant ledger

Source에서 확정된 invariant를 commit 시점별로 연결했습니다. `해당 없음`은 해당 Thread 안에서 별도 fix/test가 없음을 뜻합니다.

| Invariant | 처음 도입/관찰한 SHA | 강화한 SHA | 부족함이 드러난 SHA | 복구한 fix | 고정한 regression test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| A logical match result, participant statistics, rating history, and tournament progression commit atomically and idempotently. | `75bbc762e06d` durable identities | `83f9aee2522a` match idempotency → `e9d577ebc1ab` participant atomicity → `e338ea32b2a6` tournament transaction | `38504f041a6a` sequential partial-write 위험 | `83f9aee2522a`~`e338ea32b2a6` | `582a1615a2c6` | DB migration, `PostgresRepository.finalizeMatch` |
| Timers, schedulers, heartbeat handles, retry work, snapshot buffers, and database resources have explicit single-owner cleanup. | `e939a50948b2` finalization retry ownership | 후속 room/drain commits | persistence failure 시 terminal room 제거 위험 | `e939a50948b2` | GameHub retry tests/inspection | `gameHub.ts` finishing promise/retry timer/cleanup |

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| match insert와 rating writes가 sequential | result key/history schema → idempotent transaction → ordered participant locks | `582a16...` concurrent/rollback DB tests | match/counters/ratings/history one commit |
| tournament progression이 durable match 밖 | `e338ea...` bracket locks/updates를 transaction에 편입 | semifinal/final integration cases | final row/winner one-time progression |
| GameHub가 canonical command를 사용하지 않음 | `10bf15...` stable room key + finalizeMatch | runtime code inspection | production path도 DB invariant 사용 |
| DB failure 뒤 terminal room ownership 상실 | `e939a5...` coalesced retry/backoff/cleanup | GameHub failure regression inspection | in-process transient failure에서 결과 보존 |

## 8. Ownership / state / responsibility 변화

| 축 | 초기 SHA의 owner/state | 중간 전환 | Thread 최종 owner/state | 해제·cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| logical result identity | 없음/generated match ID | `75bbc7...` caller result key | stable `room:<id>:finished` | DB unique row lifetime | migration/result_key, `10bf15...` |
| participant ratings/history | sequential statements | `e9d577...` ordered locks + transaction | finalize transaction | commit/rollback | `PostgresRepository.finalizeMatch` |
| tournament progression | 별도/없음 | `e338ea...` same transaction | finalize transaction | commit/rollback | tournament SQL path |
| terminal room/retry | GameHub terminal callback | `10bf15...` canonical command | `e939a5...` room finishing promise/timer | success/remove 또는 hub close | `gameHub.ts::finalizeRoom` |
| database resource | repository calls | transaction client | repository/pool | transaction release/pool close | DB implementation |

## 9. Thread 최종 상태

- 최종 authoritative owner: repository `finalizeMatch` transaction이 durable command를 소유하고 GameHub terminal room이 성공 전까지 retry context를 소유합니다.
- 최종 상태/invariant: 동일 result key는 하나의 match와 한 세트의 participant/history/tournament effects로 수렴하며 부분 commit을 남기지 않습니다.
- 남아 있는 의도적 제한 또는 비보장: retry timer는 process memory에 있어 crash/restart를 넘는 delivery guarantee는 없고 DB availability 자체를 보장하지 않습니다.
- 후속 Thread가 의존하는 contract: GameHub는 stable room-derived key와 complete terminal context를 넘기고 durable success 뒤에만 result broadcast/room removal을 수행합니다.
- 대표 코드 근거: `e338ea32b2a6 PostgresRepository.finalizeMatch`, `582a1615a2c6` PostgreSQL tests, `10bf15723591`/`e939a50948b2 apps/api/src/gameHub.ts`

## 10. 최종 architecture 또는 execution flow 정리

```text
[terminal PongSimulation result]
    ↓  GameHub.finalizeRoom / stable resultKey
[PostgreSQL transaction]
    ↓ unique match insert or existing read
[ordered participant locks → counters/ratings/history]
    ↓ tournament match/parent locks and progression
[COMMIT: one logical result]
    ↓ success
[game.finished broadcast → room removal]
    ↘ failure: same room + same key + 250ms..5s retry
```

- duplicate result key는 participant/tournament effects 전에 existing result로 수렴합니다.
- failure 중 terminal room은 drain이 기다려야 하는 owned work로 남습니다.

## 11. 학습 완료 자가 점검

- [x] Commit map의 모든 SHA를 원문 순서대로 확인했습니다.
- [x] 각 commit의 subject, importance, tags를 변경하지 않았습니다.
- [x] S/A/B 깊이를 구분해 코드 근거를 남겼습니다.
- [x] final HEAD의 구현을 과거 SHA에 소급하지 않았습니다.
- [x] 핵심 상태 필드, caller/callee, ownership, failure branch, cleanup을 실제 코드로 확인했습니다.
- [x] Fix를 기존 가정 → failure/risk → root cause → decision → code → regression 순서로 연결했습니다.
- [x] Test commit에서 production invariant, failure, technique, path, 증명/비증명 범위를 구분했습니다.
- [x] Thread 최종 execution flow를 별도 프로젝트 재학습 없이 설명할 수 있습니다.
