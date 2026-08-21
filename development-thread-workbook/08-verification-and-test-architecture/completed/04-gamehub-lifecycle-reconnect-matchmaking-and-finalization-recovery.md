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
#### 역사적 복원

테스트는 socket이나 repository 없이 `RoomSession`만 구동하여 legal transition을 고정한다. 두 player가 모두 ready여야 playing이 되고, pause/resume은 이전 진행 상태와 일치해야 한다.

disconnect는 즉시 종료가 아니라 15초 reconnect 예약으로 바뀐다. 한쪽만 만료되면 상대가 forfeit winner가 되지만, 양쪽 모두 부재하면 persisted winner를 만들지 않는다. 동일 expiry/finish 호출은 두 번째 terminal effect를 만들지 않는다.

#### 이 커밋이 보장하는 것

- room lifecycle의 합법 전이와 15초 복구 경계가 고정된다.
- terminal 전이는 idempotent이고 양쪽 부재 시 임의 승자를 만들지 않는다.

#### 이 커밋이 보장하지 않는 것

- 실제 socket 교체, timer ownership, DB finalization은 검증하지 않는다.

#### 전후 관계

`113e39acc85c`가 이 순수 상태 기계를 GameHub의 실제 connection replacement와 persistence 경계에서 검증한다.

#### 증거 성격

- pure state-machine boundary testing
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
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
#### 역사적 복원

같은 identity의 새 socket은 장애가 아니라 ownership handoff다. 테스트는 기존 socket을 4001 `connection replaced`로 닫고 새 socket이 기존 room side와 최신 snapshot을 받는지 확인한다. old socket의 이후 message는 stale-client guard로 무시되고 reconnect deadline은 생기지 않는다.

반대로 실제 disconnect는 side를 비운 채 15초 timer를 room이 소유한다. 같은 사용자가 새 ticket으로 돌아오면 matchmaking을 다시 실행하지 않고 reserved room/side로 복구된다. deadline이 지나면 state machine이 forfeit 결과를 만들고 repository finalization을 한 번만 호출한다.

이 테스트는 one user → one authoritative transport, one room → one reserved side, one terminal result라는 세 invariant의 상호작용을 검증한다.

#### 이 커밋이 보장하는 것

- connection replacement가 room을 보존하며 duplicate authority를 만들지 않는다.
- 실제 disconnect만 bounded reservation을 만들고 같은 identity가 같은 room으로 복구된다.
- expiry가 중복 persisted result를 만들지 않는다.

#### 이 커밋이 보장하지 않는 것

- 브라우저 retry backoff나 network proxy 장애를 직접 검증하지 않는다.
- repository transaction 내부 원자성은 별도 DB 테스트 범위다.

#### 전후 관계

`4026c3bf72ad`의 pure transition을 실제 GameHub ownership에 연결하며, `9d05f47e7f4b`의 drain과 `e939a50948b2`의 finalization retry가 같은 room lifecycle을 확장한다.

#### 증거 성격

- deterministic GameHub integration regression
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
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
#### 역사적 복원

즉시 process exit는 owned room, retry timer, DB 작업을 끊을 수 있고, 반대로 readiness를 유지한 채 오래 기다리면 새로운 트래픽이 계속 들어온다. 테스트는 이 두 경계를 분리한다.

drain 전이는 GameHub를 accepting에서 draining으로 바꾸고 waiting queue와 AI fallback timer를 제거한다. 신규 queue/tournament work는 즉시 거부되며 readiness는 503이 된다. 이미 소유한 room은 완료를 기다리되 60초 예산을 넘기지 않는다.

signal handler는 여러 SIGTERM/SIGINT가 와도 하나의 shutdown promise만 소유한다. drain, server close, repository close 중 오류는 관측되지만 재진입이나 두 번째 cleanup 실행으로 이어지지 않는다.

이 검증은 process lifecycle과 domain lifecycle의 ownership을 맞춘다. 다만 container가 실제로 60초보다 긴 stop grace를 주는지는 다른 category의 deployment contract가 맡는다.

#### 이 커밋이 보장하는 것

- drain은 신규 작업 거부와 기존 작업 bounded completion을 동시에 보장한다.
- readiness가 lifecycle 상태와 즉시 정렬된다.
- shutdown cleanup은 single-entry이고 실패도 중복 실행되지 않는다.

#### 이 커밋이 보장하지 않는 것

- 운영 container signal delivery와 실제 60초 wall-clock 실행을 이 테스트에서 수행하지 않는다.
- 모든 외부 dependency가 예산 안에 종료된다고 보장하지 않는다.

#### 전후 관계

RoomSession/GameHub의 장기 소유 작업을 process termination에 연결한다. category 09의 container grace/CI wiring은 의도적으로 제외한다.

#### 증거 성격

- fake-time lifecycle and shutdown integration testing
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
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
#### 역사적 복원

이 테스트는 매칭 규칙을 socket callback이나 GameHub map에서 떼어 내어 pure state machine으로 검증한다. compatible 범위 안에서는 rating 차가 가장 작은 상대를 선택하고 범위 밖 사용자는 기다린다. identity kind가 다른 guest/registered는 rating이 맞아도 pair가 되지 않는다.

제어 clock으로 6초 전후를 나눠 AI fallback이 정확한 deadline 뒤에만 claim되는지 확인한다. queue 취소는 아직 배정되지 않은 상태만 제거하고, match reservation은 별도 `release`가 필요하다. duplicate join은 queued/reserved identity를 다시 삽입하지 않는다.

핵심은 availability가 단순 배열 존재 여부가 아니라 queued 또는 reserved라는 명시적 소유 상태라는 점이다.

#### 이 커밋이 보장하는 것

- closest compatible rating, identity-pool isolation, exact fallback deadline을 고정한다.
- queued와 reserved lifecycle 및 중복 가입 의미를 구분한다.

#### 이 커밋이 보장하지 않는 것

- socket disconnect·room publish·rollback에서 release가 실제 호출되는지는 검증하지 않는다.

#### 전후 관계

`112228db8878`이 Matchmaker 규칙을 GameHub room creation/finalization/rollback lifecycle과 결합해 검증한다.

#### 증거 성격

- deterministic matchmaking state-machine testing
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
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
#### 역사적 복원

Matchmaker 자체가 올바르더라도 GameHub가 room을 반쯤 공개한 뒤 실패하거나 terminal cleanup에서 reservation을 놓치면 사용자는 영구적으로 매칭 불가능해진다. 이 테스트는 integration ownership 누수를 겨냥한다.

정상 사례에서는 rating window에 따라 pair되고 room 종료/forfeit 뒤 reservation이 풀린다. 양쪽 connection이 사라진 room도 persisted winner 없이 정리되며 identity는 다시 queue에 들어갈 수 있다.

실패 주입 사례는 room state, scheduler registration, client assignment를 만든 뒤 observer `roomCreated`가 예외를 던지게 한다. GameHub는 방, timer, scheduler, client room 참조, Matchmaker reservation을 모두 역순으로 되돌려야 한다. 이후 동일 사용자들이 다시 매칭되는 것으로 cleanup의 완전성을 관찰한다.

#### 이 커밋이 보장하는 것

- match reservation은 성공한 room이 소유하고 모든 terminal/rollback 경로에서 해제된다.
- 부분 room publish 실패가 stale room·scheduler·client assignment를 남기지 않는다.
- 실패 뒤 사용자는 다시 matchable하다.

#### 이 커밋이 보장하지 않는 것

- DB tournament start 실패와 match finalization retry까지 모두 포함하지 않는다.
- 프로세스 강제 종료에서 memory cleanup을 관찰하지 않는다.

#### 전후 관계

`fc7da13e935d`의 순수 reservation 규칙을 GameHub integration에서 보호하며, `e939a50948b2`는 persistence 실패 동안 reservation을 너무 일찍 해제하지 않는 반대 경계를 추가한다.

#### 증거 성격

- rollback/failure-injection integration regression
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
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
#### 역사적 복원

이전 finalization 경로는 simulation이 끝난 뒤 repository 저장이 실패하면 room cleanup과 reservation release가 진행될 수 있었다. 그러면 결과를 다시 저장할 소유자가 사라지고 client는 종료를 보았지만 durable match가 없는 split state가 생긴다.

수정은 terminal simulation state와 durable finalization 완료를 구분한다. 저장 실패 시 room은 map과 Matchmaker reservation을 계속 소유하고 `finalizationRetryTimer`를 예약한다. retry는 250ms부터 지수 증가해 최대 5초이며 모든 시도에 안정된 `room:<id>:finished` idempotency key를 사용한다.

`game.finished`, room removal, reservation release 같은 observable terminal effect는 repository success 뒤에만 일어난다. drain도 이 room을 pending work로 본다. 성공·abandonment·shutdown cleanup은 timer를 취소해 orphan retry가 남지 않게 한다.

보정된 invariant는 'simulation finished'가 곧 'match finalized'가 아니라는 점과, 재시도 중 결과 ownership이 room에 남아 있어야 한다는 점이다.

#### 이 커밋이 보장하는 것

- 일시적 저장 실패가 room ownership과 idempotency context를 잃지 않는다.
- 외부 종료 통지는 durable success 이후 한 번만 발생한다.
- retry work와 reservation의 cleanup owner가 room으로 명시된다.

#### 이 커밋이 보장하지 않는 것

- 영구 장애가 자동으로 해결된다고 보장하지 않는다.
- 재시도 횟수에 최종 상한은 없으며 process drain 예산이 종료 경계를 제공한다.
- repository 내부 transaction 원자성은 별도 persistence invariant다.

#### 전후 관계

`8f5b2e86f69b`이 첫 finalization 실패 후 성공을 fake time으로 재현하고, 동일 key·비조기 cleanup·observer 결과를 확인한다.

#### 증거 성격

- persistence-failure recovery and ownership fix
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
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
#### 역사적 복원

테스트 repository는 첫 `finalizeMatch`만 의도적으로 reject하고 두 번째에 성공 결과를 반환한다. fake timer를 진행해 실제 backoff callback을 실행하며 두 call의 idempotency key가 동일함을 비교한다.

첫 실패 시 client는 아직 `game.finished`를 받지 않고 room과 reservation은 유지된다. observer에는 persistence failure가 기록되고 drain은 room을 pending으로 센다. retry 성공 후에만 persisted result event, room removal, reservation release가 한 번 발생하며 observer도 success를 기록한다.

이 테스트는 '재시도 함수가 호출된다'보다 강하게, 실패 전후 상태와 observable effect 순서를 함께 고정한다.

#### 이 커밋이 보장하는 것

- transient failure 후 안정된 key로 복구하며 duplicate terminal effect가 없음을 증명한다.
- failure/success observability와 drain accounting이 실제 상태와 정렬된다.

#### 이 커밋이 보장하지 않는 것

- 실제 PostgreSQL outage나 process restart 뒤 재개를 검증하지 않는다.
- 무한 장애에서의 운영 정책은 load/fault 및 shutdown 범위다.

#### 전후 관계

`e939a50948b2`의 Failure → Retryable ownership → Success 흐름에 대한 deterministic regression이다.

#### 증거 성격

- deterministic transient-failure injection
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
<!-- ANSWER:8f5b2e86f69b:end -->


## Thread-level invariant evolution

다음 표에서 불변식이 도입·확장·교정·검증된 SHA를 구분합니다.

<!-- ANSWER:thread-04-invariants:begin -->
### 복원 결과

| SHA | 변화 | 불변식 |
| --- | --- | --- |
| `4026c3bf72ad` | 상태 기계 검증 | 준비·pause·15초 reconnect·expiry·finish의 legal transition이 순수 모델로 고정된다. |
| `113e39acc85c` | connection ownership | 동일 사용자 replacement는 room을 보존하고 실제 disconnect만 reservation/forfeit timer를 만든다. |
| `9d05f47e7f4b` | process lifecycle | drain은 신규 work를 즉시 거부하고 기존 room을 60초 내 기다리며 shutdown은 한 번만 실행된다. |
| `fc7da13e935d` | 매칭 규칙 | closest rating, guest/registered 격리, 6초 fallback, queued/reserved 의미가 고정된다. |
| `112228db8878` | integration cleanup | finalization·abandonment·partial room publish 실패 뒤 reservation과 room 자원이 완전히 해제된다. |
| `e939a50948b2` | persistence ownership | 저장 실패 중에는 room/reservation/retry ownership을 유지하고 success 전 외부 종료를 노출하지 않는다. |
| `8f5b2e86f69b` | 복구 회귀 | 첫 실패→stable-key retry→성공의 상태·observer·drain 효과가 결정적으로 검증된다. |

각 변화는 이전 커밋의 최종 상태를 다음 커밋이 단순 반복한 것이 아니라, 새 경계를 도입·확장·교정하거나 regression으로 보호한 시점을 나타냅니다.
<!-- ANSWER:thread-04-invariants:end -->

## Failure → Fix → Test 관계

구현 추가를 독립 기능으로 나열하지 말고, 이전 가정과 실제 실패 위험, 수정된 결정, 회귀 증거를 연결합니다.

<!-- ANSWER:thread-04-failure-relations:begin -->
### 복원 결과

| Failure / 이전 가정 | Fix / 결정 | Verification |
| --- | --- | --- |
| socket 교체를 disconnect로 처리해 불필요한 forfeit | user-indexed atomic handoff + reserved side recovery | `113e39acc85c` |
| GameHub와 queue가 중복 availability를 소유해 stale reservation | Matchmaker queued/reserved state와 중앙 release | `fc7da13e935d` + `112228db8878` |
| room 생성 중 observer/assignment 실패로 partial publication | scheduler/room/client/timer/reservation 역순 rollback | `112228db8878` failure injection |
| finalize 실패 후 room을 제거해 결과 owner 상실 | `e939a50948b2` room-owned retry + stable key | `8f5b2e86f69b` transient failure regression |
| signal 반복·무기한 종료 대기 | single-entry shutdown + 60초 drain | `9d05f47e7f4b` |
<!-- ANSWER:thread-04-failure-relations:end -->

## Ownership·state·responsibility 변화

자원과 상태를 누가 만들고, 보유하고, 이전하고, 정리하는지 커밋 순서에 따라 정리합니다.

<!-- ANSWER:thread-04-ownership:begin -->
### 복원 결과

| 대상 | 소유자 | 책임·수명 |
| --- | --- | --- |
| Legal room transition | `RoomSession` | ready/play/pause/reconnect/finish 상태와 deadline 결과를 소유한다. |
| Current socket authority | GameHub user-indexed client map | 동일 identity의 현재 transport 한 개와 replacement handoff를 소유한다. |
| Room side/reconnect timer | GameHub room | disconnect 중 side reservation과 15초 timer cleanup을 소유한다. |
| Queued/reserved identity | `Matchmaker` | availability, pair, fallback, release를 소유한다. |
| Transport-specific waiter/timer | GameHub matchmaking metadata | socket/client와 AI timeout callback을 소유하되 reservation truth는 소유하지 않는다. |
| Finalization retry | finished GameHub room | stable result key, backoff timer, pending drain 상태를 durable success까지 소유한다. |
| Process shutdown | single shutdown promise | drain→server close→repository close의 한 번 실행을 소유한다. |
<!-- ANSWER:thread-04-ownership:end -->

## 최종 Thread 상태

최종 HEAD를 과거 커밋에 투영하지 말고, 위 SHA 순서에서 도달한 보장을 요약합니다.

<!-- ANSWER:thread-04-final-state:begin -->
### 최종 상태

- 한 사용자에는 한 authoritative realtime connection만 있고 replacement는 room을 잃지 않는다.
- 실제 disconnect는 15초 reserved-side recovery를 만들며 expiry만 terminal forfeit가 된다.
- Matchmaker가 queued/reserved identity의 단일 owner이고 모든 room terminal/rollback 경로가 release에 수렴한다.
- durable finalization 실패 시 room은 stable key로 retry하며 성공 전에는 client 종료·room 제거·reservation release가 일어나지 않는다.
- drain은 신규 작업을 차단하고 owned room/retry를 bounded하게 기다린 뒤 single-entry shutdown으로 정리한다.
<!-- ANSWER:thread-04-final-state:end -->

## 최종 architecture / execution flow

실제 caller→boundary→state transition→cleanup 흐름을 순서대로 작성합니다.

<!-- ANSWER:thread-04-flow:begin -->
### 최종 실행 흐름

1. client가 Matchmaker queue 또는 tournament room 요청
2. Matchmaker가 pair/reservation 또는 6초 fallback claim
3. GameHub가 room·scheduler·client assignment를 publish; 실패 시 역순 rollback
4. RoomSession이 ready/play/pause/disconnect/reconnect/finish 전이 결정
5. replacement는 authority handoff, 실제 disconnect는 15초 side reservation
6. simulation terminal 후 repository `finalizeMatch`
7. 실패 시 room-owned exponential retry·stable key·drain pending 유지
8. 성공 시 한 번의 finished event·room cleanup·reservation release
9. drain은 신규 진입 거부 후 기존 room을 최대 60초 기다림
<!-- ANSWER:thread-04-flow:end -->

## 학습 완료 확인

<!-- ANSWER:thread-04-checks:begin -->
### 완료 확인

- [x] replacement socket이 reconnect timer를 만들면 왜 잘못인지 설명할 수 있다.
- [x] `leaveQueue`와 matched reservation `release`의 차이를 설명할 수 있다.
- [x] room publish 실패 후 재매칭 가능 여부가 cleanup 완전성의 관찰값인 이유를 설명할 수 있다.
- [x] 저장 실패 직후 `game.finished`를 보내면 생기는 split state를 설명할 수 있다.
- [x] drain readiness 503 시점과 기존 room 종료 대기 시점이 왜 분리되는지 설명할 수 있다.

체크는 repository code inspection을 통해 설명이 문서에 작성되었음을 뜻합니다. 실제 repository test suite 실행 완료를 뜻하지 않습니다.
<!-- ANSWER:thread-04-checks:end -->

## 실행 증거 기록

<!-- ANSWER:thread-04-execution:begin -->
- Historical inspection: 각 참조 SHA의 GitHub commit diff와 변경 파일을 개별 조회했습니다.
- Repository test execution: 실행하지 않았습니다. 로컬 환경에서 지정 branch의 전체 checkout을 materialize하지 못해 pnpm, PostgreSQL, Playwright, k6, Toxiproxy 명령 결과를 만들 수 없었습니다.
- Runtime claims: 기록하지 않았습니다. 위의 `증거 성격`은 test 구현과 production code path에 대한 정적·역사적 검사입니다.
- Artifact validation: scaffold/completed 대응, fixed metadata, answer completion, SHA uniqueness, Markdown fence, ZIP 구조는 로컬 검증 스크립트로 검사했습니다.
<!-- ANSWER:thread-04-execution:end -->
