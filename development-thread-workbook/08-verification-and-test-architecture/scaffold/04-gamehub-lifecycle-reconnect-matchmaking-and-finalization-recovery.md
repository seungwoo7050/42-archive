# Development Thread 04: GameHub lifecycle·재연결·매칭·결과 저장 복구 검증

English title: **GameHub Lifecycle, Reconnect, Matchmaking, and Finalization Recovery**

## Thread 목표

RoomSession, connection replacement, drain, Matchmaker reservation, room rollback, persistence retry가 하나의 GameHub ownership story로 결합되는 과정을 복원한다.

## 핵심 질문

- connection replacement와 실제 disconnect는 왜 서로 다른 상태 전이인가?
- room side, reconnect timer, queue/reservation, finalization retry의 소유자는 각각 누구인가?
- queued 상태와 matched reservation을 별도 상태로 두지 않으면 어떤 누수가 생기는가?
- room publish 도중 실패한 경우 어떤 자원을 역순으로 rollback해야 다시 matchable한가?
- simulation 종료와 durable finalization 완료를 왜 분리하며, 외부 `game.finished`는 언제 보내야 하는가?
- drain은 신규 작업 거부와 기존 room 기다리기를 어떻게 동시에 수행하는가?

## 완료 기준

- 순수 RoomSession 전이와 GameHub integration evidence를 구분한다.
- replacement/reconnect/expiry/forfeit의 timer·socket·side ownership을 설명한다.
- Matchmaker queue/reservation release 경로를 성공·실패·포기·drain별로 추적한다.
- transient finalization failure에서 room을 유지해야 하는 이유와 stable key/backoff를 설명한다.
- shutdown single-entry와 bounded wait를 설명한다.

## Commit map

| 순서 | Commit | Subject | Importance | Tags |
| --- | --- | --- | --- | --- |
| 1 | `4026c3bf72ad` | `test(game): 게임 방 상태 전이 검증` | B | REALTIME, OPERATIONS, TEST |
| 2 | `113e39acc85c` | `test(game): reconnect 복구 동작 검증` | A | REALTIME, PERSISTENCE, RISK |
| 3 | `9d05f47e7f4b` | `test(ops): GameHub drain과 graceful shutdown 검증` | A | REALTIME, OPERATIONS, RISK |
| 4 | `fc7da13e935d` | `test(game): matchmaking 규칙 검증` | A | REALTIME, TEST |
| 5 | `112228db8878` | `test(game): matchmaking lifecycle 검증` | A | REALTIME, RISK, TEST |
| 6 | `e939a50948b2` | `fix(game): 경기 결과 저장 실패를 재시도 가능한 상태로 유지` | A | REALTIME, RISK |
| 7 | `8f5b2e86f69b` | `test(game): 일시적인 경기 결과 저장 실패 복구 검증` | A | REALTIME, OBSERVABILITY, RISK |

> Commit 순서·subject·importance·tags는 Phase 1 감사 후 동결된 정보입니다. Phase 2에서는 변경하지 않습니다.

## Commit `4026c3bf72ad` — test(game): 게임 방 상태 전이 검증

- Full SHA: `4026c3bf72adfd97868a9f8296c8899ce4d0ff44`
- Subject: `test(game): 게임 방 상태 전이 검증`
- Importance: **B**
- Tags: REALTIME, OPERATIONS, TEST
- Source-defined role: 순수 `RoomSession` 상태 기계의 준비·일시정지·재연결·만료·종료 전이를 결정적으로 고정한다.

### 정확한 조사 대상

- `apps/api/src/roomSession.test.ts`에서 initial/ready/playing/paused/reconnecting/finished 전이를 확인한다.
- 양쪽 ready 전에는 playing이 되지 않는지 확인한다.
- pause 이전 상태를 기억하고 resume이 올바른 상태로 돌아가는지 확인한다.
- 한쪽 disconnect의 15초 deadline, in-window reconnect, expiry forfeit, 양쪽 부재 시 winner 없음, finish idempotency를 확인한다.

### 학습자 복원

<!-- ANSWER:4026c3bf72ad:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:4026c3bf72ad:end -->

## Commit `113e39acc85c` — test(game): reconnect 복구 동작 검증

- Full SHA: `113e39acc85c9779c29eb62339bafa884e95b7e5`
- Subject: `test(game): reconnect 복구 동작 검증`
- Importance: **A**
- Tags: REALTIME, PERSISTENCE, RISK
- Source-defined role: GameHub에서 동일 사용자 연결 교체와 실제 disconnect 복구가 서로 다른 lifecycle을 갖고 한 번만 finalization되는지 검증한다.

### 정확한 조사 대상

- `apps/api/src/gameHub.reconnect.test.ts`의 fake socket, fake clock, repository spy를 확인한다.
- 동일 사용자 새 연결이 old socket을 code 4001로 닫고 room side를 이전하는지 확인한다.
- replacement가 reconnect timer나 forfeit를 만들지 않고 최신 snapshot을 새 socket에 보내는지 확인한다.
- 실제 disconnect만 15초 예약을 만들며 in-window reconnect가 같은 room/side로 복구되는지 확인한다.
- deadline expiry 뒤 `finalizeMatch`와 game-finished effect가 정확히 한 번인지 확인한다.

### 학습자 복원

<!-- ANSWER:113e39acc85c:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:113e39acc85c:end -->

## Commit `9d05f47e7f4b` — test(ops): GameHub drain과 graceful shutdown 검증

- Full SHA: `9d05f47e7f4bcbf12e8ff9ac36d446acd865a691`
- Subject: `test(ops): GameHub drain과 graceful shutdown 검증`
- Importance: **A**
- Tags: REALTIME, OPERATIONS, RISK
- Source-defined role: drain 시작 즉시 신규 작업을 차단하면서 기존 room은 제한된 예산 안에서 마치고 process shutdown은 단 한 번만 실행되는지 검증한다.

### 정확한 조사 대상

- `apps/api/src/gameHub.drain.test.ts`에서 queued waiter/timer 정리와 신규 queue/tournament 거부를 확인한다.
- 기존 active room이 최대 60초 동안 completion을 기다리는지 fake clock으로 확인한다.
- readiness endpoint가 drain 시작 즉시 503으로 바뀌는지 health test를 확인한다.
- `gracefulShutdown.test.ts`에서 SIGTERM/SIGINT 반복이 한 shutdown promise만 실행하는지 확인한다.
- drain/close 실패가 report되지만 두 번째 shutdown을 시작하지 않는지 확인한다.

### 학습자 복원

<!-- ANSWER:9d05f47e7f4b:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:9d05f47e7f4b:end -->

## Commit `fc7da13e935d` — test(game): matchmaking 규칙 검증

- Full SHA: `fc7da13e935d4206b743e1eaf706ea9c3b942578`
- Subject: `test(game): matchmaking 규칙 검증`
- Importance: **A**
- Tags: REALTIME, TEST
- Source-defined role: socket과 분리된 `Matchmaker` 상태 기계의 rating 선택·pool 격리·AI fallback·reservation 규칙을 제어 가능한 clock으로 검증한다.

### 정확한 조사 대상

- `apps/api/src/matchmaker.test.ts`에서 compatible candidate 중 rating 차가 가장 작은 pair를 고르는지 확인한다.
- 허용 rating gap 밖 사용자는 queue에 남는지 확인한다.
- guest와 registered pool이 절대 교차하지 않는지 확인한다.
- AI fallback이 정확히 6초 전에는 unavailable이고 deadline 이후 claim되는지 확인한다.
- duplicate join, `leaveQueue`, `release`가 queued와 reserved 상태에서 어떻게 다른지 확인한다.

### 학습자 복원

<!-- ANSWER:fc7da13e935d:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:fc7da13e935d:end -->

## Commit `112228db8878` — test(game): matchmaking lifecycle 검증

- Full SHA: `112228db8878078fae6e9322e258a646e9642e7a`
- Subject: `test(game): matchmaking lifecycle 검증`
- Importance: **A**
- Tags: REALTIME, RISK, TEST
- Source-defined role: GameHub가 Matchmaker의 queue·reservation을 room 성공·종료·포기·부분 실패의 모든 경로에서 정확히 해제하는지 검증한다.

### 정확한 조사 대상

- `apps/api/src/gameHub.matchmaking.test.ts`의 rating gap과 successful room 사례를 확인한다.
- finalized forfeit와 empty-room abandonment 후 두 사용자가 다시 매칭 가능한지 확인한다.
- room construction 중 observer `roomCreated` 실패를 주입하는 방식을 확인한다.
- 실패 뒤 scheduler entry, room map, client room assignment, reservation이 모두 rollback되는지 확인한다.
- cleanup 후 같은 identity가 duplicate로 남지 않고 재가입 가능한지 확인한다.

### 학습자 복원

<!-- ANSWER:112228db8878:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:112228db8878:end -->

## Commit `e939a50948b2` — fix(game): 경기 결과 저장 실패를 재시도 가능한 상태로 유지

- Full SHA: `e939a50948b2934e5087ccc8b9169faf91c968e1`
- Subject: `fix(game): 경기 결과 저장 실패를 재시도 가능한 상태로 유지`
- Importance: **A**
- Tags: REALTIME, RISK
- Source-defined role: 일시적 persistence 실패 시 finished room과 reservation을 보존하고 안정된 idempotency key로 재시도한 뒤에만 외부 종료 효과를 노출한다.

### 정확한 조사 대상

- `apps/api/src/gameHub.ts`의 room-owned `finalizationRetryTimer`와 cleanup 경로를 확인한다.
- 재시도 delay가 250ms에서 시작해 지수 증가하고 5초로 cap되는지 확인한다.
- `room:<roomId>:finished`와 같은 result key가 재시도마다 동일한지 확인한다.
- 실패 중 room, reservation, drain pending 상태가 유지되고 `game.finished`가 아직 broadcast되지 않는지 확인한다.
- 성공·abandon·close·remove 시 retry timer가 한 번만 정리되는지 확인한다.

### 학습자 복원

<!-- ANSWER:e939a50948b2:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:e939a50948b2:end -->

## Commit `8f5b2e86f69b` — test(game): 일시적인 경기 결과 저장 실패 복구 검증

- Full SHA: `8f5b2e86f69bfa9faad1d942d097e2c6f9961df5`
- Subject: `test(game): 일시적인 경기 결과 저장 실패 복구 검증`
- Importance: **A**
- Tags: REALTIME, OBSERVABILITY, RISK
- Source-defined role: 첫 `finalizeMatch` 실패와 다음 성공을 결정적으로 주입해 room-owned retry와 외부 효과 순서를 검증한다.

### 정확한 조사 대상

- `apps/api/src/gameHub.finalization.test.ts`의 fake timer와 repository mock call sequence를 확인한다.
- 첫 호출이 reject하고 두 번째 호출이 success하도록 failure injection을 구성한 방식을 확인한다.
- 두 호출의 result key가 동일한지, retry delay가 250ms부터 시작하는지 확인한다.
- 첫 실패 후 room·reservation·drain pending이 남고 `game.finished`가 전송되지 않는지 확인한다.
- 성공 후 한 번만 broadcast/remove/release되고 observer가 failure 후 success를 기록하는지 확인한다.

### 학습자 복원

<!-- ANSWER:8f5b2e86f69b:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:8f5b2e86f69b:end -->


## Thread-level invariant evolution

다음 표에서 불변식이 도입·확장·교정·검증된 SHA를 구분합니다.

<!-- ANSWER:thread-04-invariants:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-04-invariants:end -->

## Failure → Fix → Test 관계

구현 추가를 독립 기능으로 나열하지 말고, 이전 가정과 실제 실패 위험, 수정된 결정, 회귀 증거를 연결합니다.

<!-- ANSWER:thread-04-failure-relations:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-04-failure-relations:end -->

## Ownership·state·responsibility 변화

자원과 상태를 누가 만들고, 보유하고, 이전하고, 정리하는지 커밋 순서에 따라 정리합니다.

<!-- ANSWER:thread-04-ownership:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-04-ownership:end -->

## 최종 Thread 상태

최종 HEAD를 과거 커밋에 투영하지 말고, 위 SHA 순서에서 도달한 보장을 요약합니다.

<!-- ANSWER:thread-04-final-state:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-04-final-state:end -->

## 최종 architecture / execution flow

실제 caller→boundary→state transition→cleanup 흐름을 순서대로 작성합니다.

<!-- ANSWER:thread-04-flow:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-04-flow:end -->

## 학습 완료 확인

<!-- ANSWER:thread-04-checks:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-04-checks:end -->

## 실행 증거 기록

<!-- ANSWER:thread-04-execution:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-04-execution:end -->
