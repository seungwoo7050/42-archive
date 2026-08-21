# 토너먼트 경기방 시작 롤백과 결과 확정 인계

원문 Development Thread: `Tournament room start rollback and finalization handoff`

## 1. Thread 목표

- persisted tournament match를 두 참가자의 realtime room으로 전환하는 admission·pairing·publication 순서를 복원합니다.
- room publication 후 DB start가 실패하는 부분 성공을 어떻게 감지하고 역순 롤백하는지 확인합니다.
- generic match, rating, tournament progression을 하나의 `finalizeMatch` boundary로 합친 뒤 legacy escape hatch를 제거하는 과정을 추적합니다.

### Source에서 확정된 significance

> Tournament play crosses an in-memory room boundary and a durable tournament boundary. Publishing one without the other creates ghost rooms or stuck matches; persisting a generic result separately from bracket progression creates duplicate or partially applied outcomes. The history first exposes these split transitions, then consolidates and verifies them.

### 직접 연결되는 Critical Invariants

> A tournament room is usable only when the exact persisted tournament match has been marked running; failure restores room, timer, client association, and retryability.
>
> A finished room hands one idempotent command to persistence, where generic match, rating, tournament match linkage, next-round creation, and tournament completion are atomic.

### 직접 연결되는 Major Engineering Difficulties

> Coordinating two connected participants, an in-memory room, scheduler/timer state, and a PostgreSQL row without distributed transaction support.
>
> Making completion idempotent under repeated/concurrent calls while preserving rollback on tournament linkage failure.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- `joinTournamentMatch`는 어떤 persisted status와 participant 조건을 검사하고 두 waiter를 어떤 좌우 좌석으로 배치합니까?
- 초기 구현은 room publication과 `startTournamentMatch`를 어떤 순서로 수행해 부분 성공을 만들었습니까?
- `UPDATE ... RETURNING` zero-row 검사가 없으면 어떤 존재하지 않는 match가 성공처럼 보입니까?
- `abandonRoom`은 room, timer/scheduler, clients, waiters 중 무엇을 정리해 재입장을 가능하게 합니까?
- `finalizeMatch` transaction은 어떤 row를 잠그고 어떤 결과를 한 번만 적용합니까?
- legacy `completeTournamentMatch` 제거가 왜 단순 API 정리가 아니라 invariant 강제입니까?

## 3. 완료 기준

- tournament waiter → room publication → persistent start의 정상/실패 경로를 순서대로 그릴 수 있습니다.
- rollback test의 실패 주입 위치와 관찰한 room/timer/client 상태를 설명할 수 있습니다.
- 20개 concurrent finalize 호출과 동시 semifinal 완료 테스트가 각각 어떤 중복을 막는지 구분할 수 있습니다.
- GameHub의 in-flight completion promise와 repository transaction이 담당하는 서로 다른 idempotency 범위를 설명할 수 있습니다.
- Commit map의 모든 SHA를 지정 브랜치 ancestry와 source classification에서 확인합니다.
- 각 SHA의 parent 또는 직전 관련 SHA와 비교해 변경 전후 상태를 구분합니다.
- 실행한 명령과 코드 검사만으로 확인한 사실을 구분하고 실행하지 않은 test를 통과했다고 기록하지 않습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `33b6dfc5df7a` | `feat(tournament): 토너먼트 경기 방 진행` | A | REALTIME, TOURNAMENT, RISK | Integrates persisted tournament bracket matches with the realtime game hub. |
| 2 | `e338ea32b2a6` | `feat(db): PostgreSQL tournament 경기 확정을 연결` | S | PERSISTENCE, TOURNAMENT, RISK | Persists match creation, rating changes, tournament linkage, finalist creation, and tournament completion in one locked transaction. |
| 3 | `582a1615a2c6` | `test(db): 경기 결과 단일 확정 조건 검증` | A | PERSISTENCE, TOURNAMENT, RISK | Verifies idempotent result finalization, rollback, and single final creation under repetition and concurrency. |
| 4 | `10bf15723591` | `refactor(game): 경기 결과 확정 boundary 사용` | A | REALTIME, PERSISTENCE, TOURNAMENT | Makes room completion use the canonical atomic repository command and shares one in-flight completion promise. |
| 5 | `916683099ecd` | `fix(db): tournament start 상태 갱신 여부 확인` | A | REALTIME, PERSISTENCE, TOURNAMENT | Turns a zero-row tournament-start update into an explicit failure. |
| 6 | `480e2dc48028` | `test(db): tournament match 미갱신 거부 검증` | B | REALTIME, PERSISTENCE, TOURNAMENT | Adds a PostgreSQL integration regression for a zero-row tournament-start update. |
| 7 | `38312bcaf632` | `fix(game): tournament 시작 실패 시 room 상태 복원` | A | REALTIME, TOURNAMENT, RISK | Treats in-memory room creation and persistent tournament-start marking as one logical transition. |
| 8 | `4e2cb4ae702d` | `test(game): tournament start rollback 검증` | B | REALTIME, PERSISTENCE, TOURNAMENT | Reproduces persistence failure after in-memory tournament-room publication and verifies cleanup/retry. |
| 9 | `25a495d2cd43` | `refactor(db): 경기 결과 확정 boundary 일원화` | A | PERSISTENCE, TOURNAMENT, RISK | Removes the separate tournament-completion operation so every result passes through `finalizeMatch`. |
| 10 | `1646034acd9f` | `test(db): 경기 결과 확정 boundary 적용 검증` | B | PERSISTENCE, TOURNAMENT, TEST | Pins the narrowed repository surface: `finalizeMatch` exists and `completeTournamentMatch` does not. |

## 5. Commit별 학습 기록

### 5.1. `feat(tournament): 토너먼트 경기 방 진행`

| 항목 | 값 |
| --- | --- |
| SHA | `33b6dfc5df7a` |
| Importance | A |
| Tags | REALTIME, TOURNAMENT, RISK |
| 학습 깊이 | 주요 subsystem, 구현 경로, ownership/failure/non-guarantee를 구체적으로 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Integrates persisted tournament bracket matches with the realtime game hub.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/gameHub.ts`의 `tournamentWaiters`
- `joinTournamentMatch`, `createRoom`, `finishRoom`, disconnect cleanup
- participant 좌우 배치와 `repo.startTournamentMatch`/`completeTournamentMatch` 호출 순서
- parent 상태와 비교해 이전 가정, 새 boundary, caller/callee, ownership 또는 failure path를 기록합니다.
- 이 commit이 보장하지 않는 상태와 다음 fix/test가 보강하는 지점을 구분합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:33b6dfc5df7a -->
- **직전 상태:** persisted bracket과 play event는 있었지만 GameHub는 tournament match 두 참가자를 한 room으로 묶지 않았습니다.
- **구현 결정:** match를 조회해 `ready`, participant, 현재 room 부재를 확인하고 match ID별 waiter에 모은 뒤 left/right participant 순서로 room을 만듭니다. 생성 후 `startTournamentMatch`를 호출하고 종료 시 generic match 저장 뒤 별도 tournament completion을 호출합니다.
- **상태/소유권 변화:** GameHub가 tournament waiter와 room/client association을 소유하고 repository가 durable match status를 소유합니다. 두 소유자가 순차 호출로만 결합됩니다.
- **실패/edge:** room을 먼저 publish한 뒤 DB start가 실패하면 room·timer·client `roomId`가 남을 수 있습니다. 종료도 generic match가 성공하고 bracket update가 실패하는 부분 적용 가능성이 있습니다.
- **보장/비보장:** 정상 경로의 admission과 play는 연결하지만 start/finish의 cross-boundary atomicity는 보장하지 않습니다.
- **다음 연결:** `e338ea32b2a6`이 종료 결과를 하나의 persistence transaction으로 통합하고, 뒤의 `916...`–`4e2...`가 start rollback을 닫습니다.
<!-- LEARNER-ANSWER END commit:33b6dfc5df7a -->

비교 기준:
- 이 commit의 parent와 비교합니다.
- 다음 Thread 관련 SHA: `e338ea32b2a6` — `feat(db): PostgreSQL tournament 경기 확정을 연결`

### 5.2. `feat(db): PostgreSQL tournament 경기 확정을 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `e338ea32b2a6` |
| Importance | S |
| Tags | PERSISTENCE, TOURNAMENT, RISK |
| 학습 깊이 | major architecture와 핵심 invariant를 previous state, transaction/ownership, failure, later verification까지 깊게 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Persists match creation, rating changes, tournament linkage, finalist creation, and tournament completion in one locked transaction.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.ts`의 PostgreSQL `finalizeMatch`
- result key/idempotency row와 generic match/history/rating 처리
- `SELECT ... FOR UPDATE` tournament match/tournament lock
- semifinal two-winner final insert와 final tournament completion
- parent 상태와 비교해 transaction 시작 전 획득 상태, lock 순서, write 순서, rollback 범위를 단계별로 기록합니다.
- process-local idempotency와 durable idempotency를 구분하고, 반복·동시 호출에서 어떤 key/row가 serialization 지점인지 확인합니다.
- 정상 결과뿐 아니라 중간 failure가 이미 수행한 generic match, history, rating, tournament write를 어떻게 되돌리는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:e338ea32b2a6 -->
- **직전 상태:** GameHub는 generic `createMatch` 후 `completeTournamentMatch`를 따로 호출해 첫 단계만 commit될 수 있었습니다. 반복 finish도 동일 결과를 중복 적용할 위험이 있었습니다.
- **구현 결정:** `finalizeMatch`가 하나의 transaction 안에서 result key를 기준으로 기존 결과를 확인하고, generic match와 history/rating을 만든 뒤 tournament match 및 aggregate row를 잠급니다. tournament 참가자·winner/loser 관계를 검증하고 `match_id is null`인 row만 finished로 연결합니다. 두 semifinal이 끝났을 때 final을 만들고 final이면 tournament winner/status를 갱신합니다.
- **상태/소유권 변화:** durable completion의 유일한 owner가 repository transaction이 됩니다. GameHub는 tournament progression 단계를 조합하지 않고 command와 결과만 주고받습니다.
- **실패/edge:** 존재하지 않는 tournament match, 이미 다른 match에 연결된 row, 참가자가 아닌 winner/loser, linkage SQL 실패는 transaction 전체를 rollback해야 합니다. lock 순서는 같은 tournament aggregate를 통한 동시 semifinal serialization에 사용됩니다.
- **보장/비보장:** 동일 result key의 반복/동시 호출에서 한 generic match·한 rating 적용·한 tournament link를 목표로 하며, linkage 실패 시 앞선 match/history/rating도 남기지 않습니다. in-memory room cleanup은 이 transaction의 범위가 아닙니다.
- **다음 연결:** `582a1615a2c6`이 20회 동시 호출, 강제 rollback, 동시 semifinal 완료로 이 불변식을 직접 검증하고 `10bf...`가 GameHub를 새 boundary에 연결합니다.
<!-- LEARNER-ANSWER END commit:e338ea32b2a6 -->

비교 기준:
- 직전 Thread 관련 SHA: `33b6dfc5df7a` — `feat(tournament): 토너먼트 경기 방 진행`
- 다음 Thread 관련 SHA: `582a1615a2c6` — `test(db): 경기 결과 단일 확정 조건 검증`

### 5.3. `test(db): 경기 결과 단일 확정 조건 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `582a1615a2c6` |
| Importance | A |
| Tags | PERSISTENCE, TOURNAMENT, RISK |
| 학습 깊이 | 주요 subsystem, 구현 경로, ownership/failure/non-guarantee를 구체적으로 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Verifies idempotent result finalization, rollback, and single final creation under repetition and concurrency.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.test.ts`의 memory 20-call/concurrent semifinal test
- `packages/db/src/postgres.integration.test.ts`의 isolated database cases
- 강제 tournament linkage failure와 match/history/rating rollback assertion
- parent 상태와 비교해 이전 가정, 새 boundary, caller/callee, ownership 또는 failure path를 기록합니다.
- 이 commit이 보장하지 않는 상태와 다음 fix/test가 보강하는 지점을 구분합니다.
- Test technique, failure/boundary fixture, production path, proves/does-not-prove를 실제 assertion으로 구분합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:582a1615a2c6 -->
- **직전 상태:** transaction 구현은 있었지만 반복 호출·동시 호출·중간 SQL 실패 시 결과가 하나만 남는다는 실행 가능한 회귀 근거가 없었습니다.
- **구현 결정/기법:** 같은 command를 20개 병렬 호출해 모든 응답이 같은 match ID를 가리키고 `created`가 한 번뿐인지 확인합니다. PostgreSQL에서는 match/history 개수와 rating 적용을 확인하고, tournament linkage 실패를 주입해 전체 rollback을 검사합니다. 두 semifinal을 동시에 확정해 final row가 정확히 하나인지도 확인합니다.
- **생산 경로:** `AppRepository.finalizeMatch`의 result-key claim, row lock, generic match/history/rating, tournament link/final insert를 실제 repository 경계로 통과합니다.
- **증명:** 반복·동시 호출의 단일 적용, transaction rollback, concurrent semifinal의 single final을 증명하도록 작성됐습니다.
- **비증명:** 여러 process의 실제 부하·장애 복구 시간이나 GameHub room cleanup을 증명하지는 않습니다.
- **다음 연결:** `10bf15723591`이 이 검증된 boundary를 realtime completion의 유일한 호출로 사용합니다.
<!-- LEARNER-ANSWER END commit:582a1615a2c6 -->

비교 기준:
- 직전 Thread 관련 SHA: `e338ea32b2a6` — `feat(db): PostgreSQL tournament 경기 확정을 연결`
- 다음 Thread 관련 SHA: `10bf15723591` — `refactor(game): 경기 결과 확정 boundary 사용`

### 5.4. `refactor(game): 경기 결과 확정 boundary 사용`

| 항목 | 값 |
| --- | --- |
| SHA | `10bf15723591` |
| Importance | A |
| Tags | REALTIME, PERSISTENCE, TOURNAMENT |
| 학습 깊이 | 주요 subsystem, 구현 경로, ownership/failure/non-guarantee를 구체적으로 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Makes room completion use the canonical atomic repository command and shares one in-flight completion promise.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/gameHub.ts`의 Room `finishing` 필드
- `finishRoom`의 promise reuse/reset
- `finalizeRoom`의 `repo.finalizeMatch` command와 `resultKey`
- 성공 후 finished event/broadcast/cleanup 순서
- parent 상태와 비교해 이전 가정, 새 boundary, caller/callee, ownership 또는 failure path를 기록합니다.
- 이 commit이 보장하지 않는 상태와 다음 fix/test가 보강하는 지점을 구분합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:10bf15723591 -->
- **직전 상태:** GameHub가 `createMatch`와 `completeTournamentMatch`를 직접 조합해 transaction boundary를 우회했습니다.
- **구현 결정:** room에 `finishing` promise를 저장해 동시에 들어온 finish가 같은 작업을 공유하게 하고, `finalizeRoom`은 `room:<id>:finished` result key와 선택적 tournament context를 한 번의 `repo.finalizeMatch`로 넘깁니다. rejection 시 promise를 비워 재시도를 허용합니다.
- **상태/소유권 변화:** in-flight 중복 억제는 room이, durable idempotency와 결과 생성은 repository가 담당합니다. 성공한 persistence 결과를 받은 뒤에만 finished event를 방송합니다.
- **실패/edge:** repository 실패는 finished로 발표되지 않고 promise가 reset됩니다. 이미 commit된 뒤 response만 실패하는 경우도 result key가 재시도를 안전하게 수용합니다.
- **보장/비보장:** 한 process room의 중복 finish와 durable repeated command를 함께 방어하지만 process crash 후 in-memory room 복구 자체는 다루지 않습니다.
- **다음 연결:** start 경로의 부분 성공은 여전히 남아 있어 `916...`–`4e2...`가 별도로 수정합니다.
<!-- LEARNER-ANSWER END commit:10bf15723591 -->

비교 기준:
- 직전 Thread 관련 SHA: `582a1615a2c6` — `test(db): 경기 결과 단일 확정 조건 검증`
- 다음 Thread 관련 SHA: `916683099ecd` — `fix(db): tournament start 상태 갱신 여부 확인`

### 5.5. `fix(db): tournament start 상태 갱신 여부 확인`

| 항목 | 값 |
| --- | --- |
| SHA | `916683099ecd` |
| Importance | A |
| Tags | REALTIME, PERSISTENCE, TOURNAMENT |
| 학습 깊이 | 주요 subsystem, 구현 경로, ownership/failure/non-guarantee를 구체적으로 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Turns a zero-row tournament-start update into an explicit failure.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.ts`의 PostgreSQL `startTournamentMatch`
- `UPDATE ... RETURNING id`와 result row count 검사
- ready/running condition과 not-found error
- parent 상태와 비교해 이전 가정, 새 boundary, caller/callee, ownership 또는 failure path를 기록합니다.
- 이 commit이 보장하지 않는 상태와 다음 fix/test가 보강하는 지점을 구분합니다.
- Fix chain을 `이전 가정 → 실제 실패/위험 → root cause → 교정된 결정 → 남는 비보장` 순서로 복원합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:916683099ecd -->
- **직전 가정:** SQL `UPDATE`가 예외를 내지 않으면 match가 running으로 바뀌었다고 간주했습니다. 존재하지 않거나 조건에 맞지 않는 ID도 zero-row success처럼 통과할 수 있었습니다.
- **실제 위험:** GameHub는 durable match가 시작되지 않았는데 room을 유효하다고 유지해 두 상태가 갈라질 수 있습니다.
- **교정:** update에 `RETURNING id`를 붙이고 반환 row가 정확히 하나가 아니면 `tournament match not found` 오류를 던집니다.
- **상태/소유권 변화:** repository가 “상태 전이가 실제 row에 적용됐는지”를 확인하고 caller에 실패를 전달합니다.
- **보장/비보장:** zero-row silent success를 제거하지만 caller가 이미 만든 room을 되돌리는 일은 다음 commit의 GameHub 책임입니다.
- **다음 연결:** `480e2dc48028`이 임의 UUID regression을 추가하고 `38312bcaf632`가 이 오류를 rollback trigger로 사용합니다.
<!-- LEARNER-ANSWER END commit:916683099ecd -->

비교 기준:
- 직전 Thread 관련 SHA: `10bf15723591` — `refactor(game): 경기 결과 확정 boundary 사용`
- 다음 Thread 관련 SHA: `480e2dc48028` — `test(db): tournament match 미갱신 거부 검증`

### 5.6. `test(db): tournament match 미갱신 거부 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `480e2dc48028` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE, TOURNAMENT |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Adds a PostgreSQL integration regression for a zero-row tournament-start update.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/postgres.integration.test.ts`의 존재하지 않는 UUID start case
- isolated PostgreSQL repository와 rejection assertion
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.
- Test technique, failure/boundary fixture, production path, proves/does-not-prove를 실제 assertion으로 구분합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:480e2dc48028 -->
- **직전 상태:** zero-row 검사는 구현됐지만 실제 PostgreSQL driver/result 형태에서 오류가 발생하는지 고정한 test가 없었습니다.
- **기법:** isolated DB에서 존재하지 않는 random UUID로 `startTournamentMatch`를 호출하고 rejection을 요구합니다.
- **생산 경로:** mock이 아니라 PostgreSQL `UPDATE ... RETURNING`과 repository row-count 검사를 통과합니다.
- **증명/비증명:** 없는 match를 성공으로 처리하지 않음을 증명하도록 작성됐지만 room rollback은 호출하지 않습니다.
- **보장:** DB boundary regression을 고정합니다.
- **다음 연결:** `38312bcaf632`이 이 rejection을 받은 GameHub의 역순 cleanup을 구현합니다.
<!-- LEARNER-ANSWER END commit:480e2dc48028 -->

비교 기준:
- 직전 Thread 관련 SHA: `916683099ecd` — `fix(db): tournament start 상태 갱신 여부 확인`
- 다음 Thread 관련 SHA: `38312bcaf632` — `fix(game): tournament 시작 실패 시 room 상태 복원`

### 5.7. `fix(game): tournament 시작 실패 시 room 상태 복원`

| 항목 | 값 |
| --- | --- |
| SHA | `38312bcaf632` |
| Importance | A |
| Tags | REALTIME, TOURNAMENT, RISK |
| 학습 깊이 | 주요 subsystem, 구현 경로, ownership/failure/non-guarantee를 구체적으로 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Treats in-memory room creation and persistent tournament-start marking as one logical transition.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/gameHub.ts`의 `joinTournamentMatch` try/catch
- `abandonRoom(room)` 호출과 rethrow
- room map, timer/scheduler, client room association cleanup
- parent 상태와 비교해 이전 가정, 새 boundary, caller/callee, ownership 또는 failure path를 기록합니다.
- 이 commit이 보장하지 않는 상태와 다음 fix/test가 보강하는 지점을 구분합니다.
- Fix chain을 `이전 가정 → 실제 실패/위험 → root cause → 교정된 결정 → 남는 비보장` 순서로 복원합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:38312bcaf632 -->
- **직전 가정:** room 생성 후 `startTournamentMatch`가 실패하지 않거나 실패해도 caller 오류만 보내면 충분하다고 봤습니다.
- **실제 실패:** room map과 양 client `roomId`, timer/scheduler가 남아 참가자가 다시 join할 수 없고 live stats에도 ghost room이 나타날 수 있습니다.
- **교정:** start를 try/catch로 감싸고 실패한 room을 찾아 `abandonRoom`으로 publication을 역순 취소한 뒤 원래 오류를 다시 던집니다.
- **상태/소유권 변화:** GameHub는 자신이 획득한 in-memory 자원을 직접 rollback하고 repository는 durable row 전이만 책임집니다.
- **보장/비보장:** start failure 뒤 room/timer/client association을 제거해 retry 가능한 상태를 목표로 하지만, cleanup 누락 여부는 다음 deterministic test가 확인합니다.
- **다음 연결:** `4e2cb4ae702d`이 한 번 실패 후 같은 참가자들이 다시 join해 정상 room을 얻는지 검증합니다.
<!-- LEARNER-ANSWER END commit:38312bcaf632 -->

비교 기준:
- 직전 Thread 관련 SHA: `480e2dc48028` — `test(db): tournament match 미갱신 거부 검증`
- 다음 Thread 관련 SHA: `4e2cb4ae702d` — `test(game): tournament start rollback 검증`

### 5.8. `test(game): tournament start rollback 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `4e2cb4ae702d` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE, TOURNAMENT |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Reproduces persistence failure after in-memory tournament-room publication and verifies cleanup/retry.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/gameHub.tournament.test.ts`의 fake sockets
- `startTournamentMatch` `mockRejectedValueOnce` 후 성공 설정
- `activeRooms`, `scheduledRoomCount`, matched events, second join assertions
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.
- Test technique, failure/boundary fixture, production path, proves/does-not-prove를 실제 assertion으로 구분합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:4e2cb4ae702d -->
- **직전 상태:** rollback 코드는 있었지만 room과 timer가 모두 사라지고 참가자가 재시도할 수 있다는 근거가 없었습니다.
- **실패 주입:** repository `startTournamentMatch`를 첫 호출에만 reject하도록 하고 두 fake socket을 같은 ready match에 pair합니다.
- **관찰:** 첫 실패 뒤 start 호출 1회, active room 0, scheduled room 0을 확인합니다. 같은 두 참가자가 다시 join하면 두 번째 start가 성공하고 room 1개와 좌우 matched event가 생기는지 확인합니다.
- **생산 경로:** 실제 `GameHub.connect`/event receive/pair/create/abandon 흐름을 사용하고 persistence만 spy/mock으로 제어합니다.
- **증명/비증명:** partial publication cleanup과 retryability를 결정적으로 검증하도록 작성됐지만 PostgreSQL transaction 자체는 이 test 범위가 아닙니다.
- **다음 연결:** start/finish 양쪽 교정 후 `25a495d2cd43`이 legacy completion escape hatch를 제거합니다.
<!-- LEARNER-ANSWER END commit:4e2cb4ae702d -->

비교 기준:
- 직전 Thread 관련 SHA: `38312bcaf632` — `fix(game): tournament 시작 실패 시 room 상태 복원`
- 다음 Thread 관련 SHA: `25a495d2cd43` — `refactor(db): 경기 결과 확정 boundary 일원화`

### 5.9. `refactor(db): 경기 결과 확정 boundary 일원화`

| 항목 | 값 |
| --- | --- |
| SHA | `25a495d2cd43` |
| Importance | A |
| Tags | PERSISTENCE, TOURNAMENT, RISK |
| 학습 깊이 | 주요 subsystem, 구현 경로, ownership/failure/non-guarantee를 구체적으로 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Removes the separate tournament-completion operation so every result passes through `finalizeMatch`.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.ts`의 `AppRepository` surface
- PostgreSQL/memory `completeTournamentMatch` 및 old final helper 제거
- observability operation 목록과 caller compile surface
- parent 상태와 비교해 이전 가정, 새 boundary, caller/callee, ownership 또는 failure path를 기록합니다.
- 이 commit이 보장하지 않는 상태와 다음 fix/test가 보강하는 지점을 구분합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:25a495d2cd43 -->
- **직전 상태:** GameHub는 새 boundary를 사용했지만 repository interface에 `completeTournamentMatch`가 남아 다른 caller가 generic match/rating transaction을 우회할 수 있었습니다.
- **구현 결정:** 양 repository 구현과 interface, 관련 helper/observability 이름에서 별도 operation을 제거하고 tournament progression을 `finalizeMatch` 내부로만 남깁니다.
- **상태/소유권 변화:** “결과 확정” 책임이 명시적으로 단일 method에 귀속되며, 잘못된 호출 순서를 타입/API surface에서 만들기 어려워집니다.
- **실패/edge:** 기존 외부 caller가 있었다면 compile/runtime migration이 필요하지만 같은 branch의 caller는 이미 `10bf...`에서 전환됐습니다.
- **보장/비보장:** application-level escape hatch를 제거하지만 직접 SQL로 제약을 우회하는 권한까지 없애는 것은 아닙니다.
- **다음 연결:** `1646034acd9f`이 method 존재/부재를 contract test로 고정합니다.
<!-- LEARNER-ANSWER END commit:25a495d2cd43 -->

비교 기준:
- 직전 Thread 관련 SHA: `4e2cb4ae702d` — `test(game): tournament start rollback 검증`
- 다음 Thread 관련 SHA: `1646034acd9f` — `test(db): 경기 결과 확정 boundary 적용 검증`

### 5.10. `test(db): 경기 결과 확정 boundary 적용 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `1646034acd9f` |
| Importance | B |
| Tags | PERSISTENCE, TOURNAMENT, TEST |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Pins the narrowed repository surface: `finalizeMatch` exists and `completeTournamentMatch` does not.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.test.ts`의 repository contract assertion
- memory repository object의 method presence/absence
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.
- Test technique, failure/boundary fixture, production path, proves/does-not-prove를 실제 assertion으로 구분합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:1646034acd9f -->
- **직전 상태:** 구현과 interface에서 legacy method를 지웠지만 후속 변경이 다시 escape hatch를 추가해도 behavioral tests가 눈치채지 못할 수 있었습니다.
- **기법:** 생성된 repository에 `finalizeMatch`가 함수인지, `completeTournamentMatch` property가 없는지 직접 검사합니다.
- **증명:** 결과 확정 API surface가 하나라는 구조적 회귀를 고정하도록 작성됐습니다.
- **비증명:** transaction 내부 원자성이나 동시성은 `582a...` 테스트가 담당합니다.
- **최종 보장:** caller가 공식 repository contract를 사용할 때 별도 tournament completion 경로를 선택할 수 없습니다.
- **Thread 종료:** room start rollback과 durable finalization handoff의 양쪽 logical transition이 각각 실패를 소유하는 계층에서 닫힙니다.
<!-- LEARNER-ANSWER END commit:1646034acd9f -->

비교 기준:
- 직전 Thread 관련 SHA: `25a495d2cd43` — `refactor(db): 경기 결과 확정 boundary 일원화`
- 이 commit을 Thread의 마지막 상태로 사용합니다.

## 6. Thread 종합

다음 항목을 commit 순서에서 재구성합니다: invariant evolution, Failure → Fix → Test 관계, ownership/state 변화, 최종 실행 흐름, 비보장, 실제 실행 증거.

<!-- LEARNER-ANSWER START thread:02-tournament-room-start-rollback-and-finalization-handoff.md:synthesis -->
- **불변식 진화:** `33b6dfc5df7a`는 tournament waiter를 pair하고 room을 만든 뒤 DB start를 호출했으므로 in-memory publication과 persistence가 갈라질 수 있었습니다. `916683099ecd`가 zero-row update를 오류로 바꾸고, `38312bcaf632`가 실패 시 `abandonRoom`을 호출하며, `4e2cb4ae702d`가 재입장까지 검증했습니다. 종료 쪽은 `e338ea32b2a6`–`10bf15723591`에서 generic match·rating·bracket progression을 하나의 transaction command로 통합했습니다.
- **소유권과 인계:** GameHub는 waiter, room, client association, scheduler/timer와 현재 in-flight completion promise를 소유합니다. repository는 match result key, generic match/history/rating, tournament row/match row, final 생성/우승 확정을 소유합니다. GameHub는 결과를 계산한 뒤 한 번의 `finalizeMatch` command로 durable ownership을 넘깁니다.
- **Failure → Fix → Test:** zero-row start → `RETURNING id` 검사 → PostgreSQL regression. room publish 후 start 실패 → `abandonRoom` rollback → fake-socket 재입장 test. 두 단계 completion → transactional finalize + in-flight promise → 20-call idempotency/rollback/concurrent-semifinal tests → legacy boundary 제거와 surface test로 닫힙니다.
- **최종 흐름:** 참가자 두 명이 동일 ready match에 join → 좌석 결정과 room publish → DB running 전환; 실패하면 room 전체 폐기 → 경기 종료 시 동일 room completion은 같은 promise 공유 → repository transaction이 result key와 tournament rows를 잠그고 한 번만 결과 적용 → 성공 후 finished broadcast/cleanup입니다.
- **비보장:** 이 Thread는 later Matchmaker reservation refactor 전체나 process drain을 소유하지 않습니다. 그 ownership 통합은 category 05 core realtime Thread가 주 소유자입니다.
- **실행 증거:** 테스트 파일과 실패 주입 코드는 exact SHA에서 검사했으나 로컬 checkout 부재로 실행하지 않았습니다. 따라서 “테스트가 통과했다”가 아니라 “해당 regression을 검증하도록 구현되어 있다”고 기록합니다.
<!-- LEARNER-ANSWER END thread:02-tournament-room-start-rollback-and-finalization-handoff.md:synthesis -->

## 7. 학습 완료 확인

<!-- LEARNER-ANSWER START thread:02-tournament-room-start-rollback-and-finalization-handoff.md:checklist -->
- [x] 모든 SHA를 지정 브랜치의 exact commit으로 검사했습니다.
- [x] fixed commit map과 source classification을 보존했습니다.
- [x] earlier commit을 later HEAD 코드로 설명하지 않았습니다.
- [x] fix와 test를 원래 failure/production path에 연결했습니다.
- [x] 실제 실행하지 않은 test를 통과했다고 기록하지 않았습니다.
- [x] Thread 최종 owner, invariant, flow, non-guarantee를 작성했습니다.
<!-- LEARNER-ANSWER END thread:02-tournament-room-start-rollback-and-finalization-handoff.md:checklist -->
