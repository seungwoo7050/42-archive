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
| 학습 깊이 | Thread 내 구현 역할을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Introduces match persistence and rating effects, initially as sequential operations.
- Classification summary: Add match completion to the repository contract and initial fixed rating effects.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.

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
- 이 commit의 parent와 비교합니다.
- 다음 Thread 관련 SHA: `75bbc762e06d` — `feat(db): match result key와 rating history schema 추가`

### 5.2. `feat(db): match result key와 rating history schema 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `75bbc762e06d` |
| Importance | A |
| Tags | PERSISTENCE, RISK |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Adds durable identities for logical outcomes and auditable participant deltas.
- Classification summary: Introduce a unique logical result key and one rating-history row per match participant.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.

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
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Uses the unique result key to converge concurrent duplicate finalization.
- Classification summary: Create `finalizeMatch` and make match-row creation idempotent under retries and concurrency.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.

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
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Locks participants and commits match, counters, ratings, and history together.
- Classification summary: Extend the idempotent match transaction to participant statistics, ratings, and audit history.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.

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
| 학습 깊이 | Architecture/invariant를 깊게 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Adds bracket and tournament progression to the same transaction.
- Classification summary: Make tournament progression part of the canonical atomic/idempotent match finalization command.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.

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
- 직전 Thread 관련 SHA: `e9d577ebc1ab` — `feat(db): PostgreSQL 참가자 rating을 원자적으로 반영`
- 다음 Thread 관련 SHA: `582a1615a2c6` — `test(db): 경기 결과 단일 확정 조건 검증`

### 5.6. `test(db): 경기 결과 단일 확정 조건 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `582a1615a2c6` |
| Importance | A |
| Tags | PERSISTENCE, TOURNAMENT, RISK |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Proves one creation and one set of effects under repetition, concurrency, and rollback.
- Classification summary: Add PostgreSQL integration regressions for idempotency, atomic participant effects, and tournament progression.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.
- 테스트가 주입하는 입력·시간·동시성·오류와 실제 production path를 구분해 기록합니다.
- 테스트가 증명하는 범위와 실제 process/network/database까지는 증명하지 않는 범위를 함께 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 boundary/decision | [파일·심볼·조건·관찰 결과 작성] |
| 상태 또는 ownership 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 주요 failure/edge path | [파일·심볼·조건·관찰 결과 작성] |
| 보장/비보장 | [파일·심볼·조건·관찰 결과 작성] |
| 다음 관련 commit 연결 | [파일·심볼·조건·관찰 결과 작성] |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | [작성] |
| 재현하는 failure/boundary | [작성] |
| test technique | [작성] |
| 통과하는 production path | [작성] |
| 증명하는 것 | [작성] |
| 증명하지 않는 것 | [작성] |
| 후속 회귀 방지 | [작성] |

비교 기준:
- 직전 Thread 관련 SHA: `e338ea32b2a6` — `feat(db): PostgreSQL tournament 경기 확정을 연결`
- 다음 Thread 관련 SHA: `10bf15723591` — `refactor(game): 경기 결과 확정 boundary 사용`

### 5.7. `refactor(game): 경기 결과 확정 boundary 사용`

| 항목 | 값 |
| --- | --- |
| SHA | `10bf15723591` |
| Importance | A |
| Tags | REALTIME, PERSISTENCE, TOURNAMENT |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Routes GameHub completion through the canonical repository command.
- Classification summary: Replace ad-hoc completion persistence with `finalizeMatch` and a stable room-derived result key.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.
- 기존 경로와 새 경로가 공존하는 migration 구간 및 최종 duplicate implementation 제거 여부를 확인합니다.

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
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Keeps terminal room ownership and retries with the stable idempotency key.
- Classification summary: Preserve the terminal room and coalesce/retry finalization until durable commit succeeds or the hub is closed.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- 수정 전 가정 → 실제 실패 또는 위험 → root cause → 수정된 invariant를 parent와 이 SHA에서 비교합니다.
- 후속 regression test가 같은 실패를 어떤 fixture 또는 failure injection으로 고정하는지 연결합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 boundary/decision | [파일·심볼·조건·관찰 결과 작성] |
| 상태 또는 ownership 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 주요 failure/edge path | [파일·심볼·조건·관찰 결과 작성] |
| 보장/비보장 | [파일·심볼·조건·관찰 결과 작성] |
| 다음 관련 commit 연결 | [파일·심볼·조건·관찰 결과 작성] |

#### Fix 연결 골격

- 기존 가정: [작성]
- 실제 실패 또는 위험: [작성]
- Root cause: [작성]
- 수정된 invariant: [작성]
- 실제 수정 코드: [작성]
- Regression 연결: [작성]

비교 기준:
- 직전 Thread 관련 SHA: `10bf15723591` — `refactor(game): 경기 결과 확정 boundary 사용`
- 이 Thread의 최종 상태와 비교합니다.

## 6. Invariant ledger

| Invariant | 도입 SHA | 강화 SHA | 부족함이 드러난 SHA | 복구 fix | 고정 test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| A logical match result, participant statistics, rating history, and tournament progression commit atomically and idempotently. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| Timers, schedulers, heartbeat handles, retry work, snapshot buffers, and database resources have explicit single-owner cleanup. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| [작성] | [작성] | [작성] | [작성] |

## 8. Ownership / state / responsibility 변화

| 축 | 초기 owner/state | 중간 전환 | 최종 owner/state | cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| logical result identity | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| participant ratings/history | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| tournament progression | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| terminal room/retry | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| database resource | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |

## 9. Thread 최종 상태

- 최종 authoritative owner: [작성]
- 최종 상태/invariant: [작성]
- 남아 있는 의도적 제한 또는 비보장: [작성]
- 후속 Thread가 의존하는 contract: [작성]
- 대표 코드 근거: [SHA·파일·심볼 작성]

## 10. 최종 architecture 또는 execution flow 정리

```text
[입력/이벤트]
    ↓
[소유 boundary와 validation]
    ↓
[상태 전이 또는 side effect]
    ↓
[출력/관측/cleanup]
```

## 11. 학습 완료 자가 점검

- [ ] Commit map의 모든 SHA를 원문 순서대로 확인했습니다.
- [ ] 각 commit의 subject, importance, tags를 변경하지 않았습니다.
- [ ] final HEAD 코드를 과거 SHA에 소급하지 않았습니다.
- [ ] S/A/B/C 깊이를 구분해 근거를 남겼습니다.
- [ ] fix와 test를 실제 production path에 연결했습니다.
- [ ] 실행하지 않은 명령 결과를 작성하지 않았습니다.
- [ ] Thread 최종 flow를 실제 코드로 설명할 수 있습니다.
