# 일시정지·재개와 입력 무효화

원문 Development Thread: `Pause, resume, and input neutralization`

## 1. Thread 목표

- pause/resume를 화면 효과가 아니라 server-owned game phase transition으로 추가하는 과정을 추적합니다.
- timer/scheduler 중단·재등록과 participant/phase authorization을 복원합니다.
- pause 직전 paddle direction이 resume 뒤 남는 결함을 snapshot과 simulation 양쪽에서 어떻게 neutralize했는지 확인합니다.

### Source에서 확정된 significance

> Stopping ticks is not enough to pause a stateful simulation. Input intent can outlive the timer and become active again on resume. The history first introduces the protocol and server transition, then corrects the hidden input state and protects the boundary with fake-time regression coverage.

### 직접 연결되는 Critical Invariants

> Only a seated participant may transition a playing room to paused or a paused room to playing, and simulation ticks/input application occur only in playing.
>
> Entering paused neutralizes both externally visible paddle velocity and the internal simulation direction so resume starts without carried intent.

### 직접 연결되는 Major Engineering Difficulties

> Keeping protocol phase, GameHub session state, scheduler registration, snapshot state, simulation state, and UI controls synchronized.
>
> Testing temporal behavior deterministically without depending on wall-clock timing or a real network.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- shared `GamePhase`와 client event union은 pause/resume를 어떻게 표현합니까?
- 초기 `pauseRoom`/`resumeRoom`은 어떤 phase와 seat 조건을 검사하고 timer를 어떻게 관리합니까?
- 왜 timer를 멈춰도 `paddles[side].dy`와 simulation direction이 남으면 문제가 됩니까?
- later refactor 뒤 pause는 scheduler와 session state를 어떤 순서로 전환합니까?
- fake timer test는 pause 전 input, paused snapshot, resume 후 tick을 어떤 순서로 재현합니까?

## 3. 완료 기준

- protocol→hub phase transition→UI control의 호출 흐름을 설명할 수 있습니다.
- pause가 획득/해제하는 timer 또는 scheduler 자원과 illegal transition no-op 조건을 지적할 수 있습니다.
- visible snapshot와 internal simulation의 입력 상태를 둘 다 0으로 만들어야 하는 이유를 설명할 수 있습니다.
- fake timer regression이 증명하는 것과 실제 장시간 pause/reconnect에서 증명하지 않는 것을 구분할 수 있습니다.
- Commit map의 모든 SHA를 지정 브랜치 ancestry와 source classification에서 확인합니다.
- 각 SHA의 parent 또는 직전 관련 SHA와 비교해 변경 전후 상태를 구분합니다.
- 실행한 명령과 코드 검사만으로 확인한 사실을 구분하고 실행하지 않은 test를 통과했다고 기록하지 않습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `655bc7bd8df7` | `feat(protocol): 일시정지 WebSocket 계약 추가` | B | PROTOCOL, REALTIME, WEB | Adds the paused game phase and room-scoped pause/resume client commands. |
| 2 | `d93612c18e6f` | `feat(game): 서버 주도 일시정지 기능 추가` | B | SIMULATION, REALTIME | Handles pause and resume as server-owned room transitions. |
| 3 | `e4e2dec55805` | `feat(play): 일시정지와 재개 UI 연결` | B | REALTIME, WEB | Derives pause/resume controls from server snapshots and sends room-scoped commands. |
| 4 | `f46bbab95ea5` | `fix(game): 일시정지 시 paddle 입력 상태 초기화` | A | SIMULATION, REALTIME, RISK | Neutralizes both snapshot and internal simulation paddle directions when a room enters paused. |
| 5 | `632cbf13b616` | `test(game): pause 전 입력이 재개 뒤 남지 않음 검증` | B | SIMULATION, REALTIME, TEST | Verifies that a pre-pause paddle direction does not survive pause and resume. |

## 5. Commit별 학습 기록

### 5.1. `feat(protocol): 일시정지 WebSocket 계약 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `655bc7bd8df7` |
| Importance | B |
| Tags | PROTOCOL, REALTIME, WEB |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Adds the paused game phase and room-scoped pause/resume client commands.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `packages/shared/src/game.ts`의 `GamePhase`
- `packages/shared/src/ws.ts`의 `game.pause`/`game.resume` variants
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:655bc7bd8df7 -->
- **직전 상태:** phase는 waiting/countdown/playing/finished뿐이고 client가 server에 pause/resume 의도를 보낼 계약이 없었습니다.
- **구현 결정:** `paused`를 공유 phase union에 추가하고 두 command가 `roomId`를 필수로 갖게 합니다.
- **상태/소유권 변화:** protocol은 요청과 관찰 가능한 phase를 표현하지만 전이 권한은 server에 남습니다.
- **실패/edge:** 타입만으로 sender가 room 참가자인지, 현재 phase가 legal한지는 확인하지 않습니다.
- **보장/비보장:** wire vocabulary는 통일하지만 timer와 simulation 동작은 다음 commit 전까지 없습니다.
- **다음 연결:** `d93612c18e6f`가 GameHub transition과 tick/input gating을 구현합니다.
<!-- LEARNER-ANSWER END commit:655bc7bd8df7 -->

비교 기준:
- 이 commit의 parent와 비교합니다.
- 다음 Thread 관련 SHA: `d93612c18e6f` — `feat(game): 서버 주도 일시정지 기능 추가`

### 5.2. `feat(game): 서버 주도 일시정지 기능 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `d93612c18e6f` |
| Importance | B |
| Tags | SIMULATION, REALTIME |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Handles pause and resume as server-owned room transitions.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/gameHub.ts`의 `pauseRoom`, `resumeRoom`
- playing/paused phase와 `sideFor` 조건
- timer clear/null 및 single `setInterval` restart
- `applyInput`/`tick`의 playing-only guard
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:d93612c18e6f -->
- **직전 상태:** protocol command는 parse돼도 server room과 simulation을 바꾸지 않았습니다.
- **구현 결정:** seated participant만 playing→paused, paused→playing을 요청할 수 있게 하고 pause는 interval을 clear해 null로, resume은 timer가 없을 때만 새 interval을 만듭니다. snapshot phase/time을 갱신해 room에 broadcast합니다. input/tick은 playing일 때만 작동합니다.
- **상태/소유권 변화:** server room이 phase와 timer authority가 되고 client는 snapshot을 따라갑니다.
- **실패/edge:** 잘못된 room/phase/non-participant 요청은 no-op입니다. 당시 pause가 기존 paddle direction 자체를 reset하지는 않습니다.
- **보장/비보장:** tick 중단과 중복 timer 방지는 제공하지만 stale input neutralization은 후속 fix가 필요합니다.
- **다음 연결:** `e4e2dec55805`가 UI를 authoritative snapshot phase에 연결합니다.
<!-- LEARNER-ANSWER END commit:d93612c18e6f -->

비교 기준:
- 직전 Thread 관련 SHA: `655bc7bd8df7` — `feat(protocol): 일시정지 WebSocket 계약 추가`
- 다음 Thread 관련 SHA: `e4e2dec55805` — `feat(play): 일시정지와 재개 UI 연결`

### 5.3. `feat(play): 일시정지와 재개 UI 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `e4e2dec55805` |
| Importance | B |
| Tags | REALTIME, WEB |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Derives pause/resume controls from server snapshots and sends room-scoped commands.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/play/page.tsx`의 `canPause`, `canResume`
- `togglePause`의 command send
- snapshot phase에 따른 status/button label
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:e4e2dec55805 -->
- **직전 상태:** play 화면에는 disabled “일시정지 예정” 버튼만 있고 server command와 연결되지 않았습니다.
- **구현 결정:** current room과 snapshot phase에서 pause/resume 가능 여부를 계산하고 같은 버튼이 해당 command를 전송합니다. phase snapshot 수신 시 상태 문구도 갱신합니다.
- **상태/소유권 변화:** UI는 server snapshot을 근거로 control을 활성화하며 click 직후 local phase를 임의 변경하지 않습니다.
- **실패/edge:** command rejection/no-op을 별도 acknowledgement로 표시하지 않으며 다음 snapshot이 authority입니다.
- **보장/비보장:** 정상 interaction은 연결하지만 server input carryover를 해결하지 않습니다.
- **다음 연결:** `f46bbab95ea5`가 pause 전 direction이 resume에 남는 simulation bug를 교정합니다.
<!-- LEARNER-ANSWER END commit:e4e2dec55805 -->

비교 기준:
- 직전 Thread 관련 SHA: `d93612c18e6f` — `feat(game): 서버 주도 일시정지 기능 추가`
- 다음 Thread 관련 SHA: `f46bbab95ea5` — `fix(game): 일시정지 시 paddle 입력 상태 초기화`

### 5.4. `fix(game): 일시정지 시 paddle 입력 상태 초기화`

| 항목 | 값 |
| --- | --- |
| SHA | `f46bbab95ea5` |
| Importance | A |
| Tags | SIMULATION, REALTIME, RISK |
| 학습 깊이 | 주요 subsystem, 구현 경로, ownership/failure/non-guarantee를 구체적으로 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Neutralizes both snapshot and internal simulation paddle directions when a room enters paused.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/gameHub.ts`의 later `pauseRoom`
- `roomScheduler.unregister`, `room.session.pause()`
- left/right `snapshot.state.paddles[side].dy = 0`
- `room.simulation.paddles[side].direction = 0`
- parent 상태와 비교해 이전 가정, 새 boundary, caller/callee, ownership 또는 failure path를 기록합니다.
- 이 commit이 보장하지 않는 상태와 다음 fix/test가 보강하는 지점을 구분합니다.
- Fix chain을 `이전 가정 → 실제 실패/위험 → root cause → 교정된 결정 → 남는 비보장` 순서로 복원합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:f46bbab95ea5 -->
- **직전 가정:** scheduler를 중단하고 phase를 paused로 바꾸면 게임 상태가 완전히 정지한다고 봤습니다.
- **실제 실패:** pause 직전 눌린 방향이 snapshot `dy` 또는 internal simulation direction에 남아 resume 첫 tick에서 새 input 없이 패들이 계속 움직일 수 있었습니다.
- **교정:** scheduler unregister와 성공한 `session.pause()` 뒤 양쪽 paddle의 외부 snapshot velocity와 내부 simulation direction을 모두 0으로 설정한 다음 paused snapshot을 broadcast합니다.
- **상태/소유권 변화:** pause는 단순 clock transition이 아니라 현재 input intent의 terminal boundary가 됩니다. 서로 다른 두 state representation을 함께 갱신합니다.
- **보장/비보장:** resume는 neutral intent에서 시작하지만 키가 실제로 계속 눌린 client가 resume 후 새 input을 보내는 것은 정상 새 의도입니다.
- **다음 연결:** `632cbf13b616`이 fake timer로 pre-pause direction이 resume 뒤 재생되지 않는지 검증합니다.
<!-- LEARNER-ANSWER END commit:f46bbab95ea5 -->

비교 기준:
- 직전 Thread 관련 SHA: `e4e2dec55805` — `feat(play): 일시정지와 재개 UI 연결`
- 다음 Thread 관련 SHA: `632cbf13b616` — `test(game): pause 전 입력이 재개 뒤 남지 않음 검증`

### 5.5. `test(game): pause 전 입력이 재개 뒤 남지 않음 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `632cbf13b616` |
| Importance | B |
| Tags | SIMULATION, REALTIME, TEST |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Verifies that a pre-pause paddle direction does not survive pause and resume.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/gameHub.pause.test.ts`의 fake timers/fake socket
- AI room 생성, ready, input sequence 0 direction 1
- pause snapshot phase/dy 0
- resume 후 100ms advance와 playing/dy 0
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.
- Test technique, failure/boundary fixture, production path, proves/does-not-prove를 실제 assertion으로 구분합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:632cbf13b616 -->
- **직전 상태:** neutralization fix는 있었지만 scheduler 재등록과 다음 tick까지 통과한 뒤 상태가 0인지 보장하는 test가 없었습니다.
- **기법:** fake timers를 사용해 AI room을 만들고 ready→direction 1→pause를 보내 paused snapshot과 left `dy=0`을 확인합니다. paused 중 neutral input event를 보낸 뒤 resume하고 100ms를 진행해 playing snapshot에서도 `dy=0`인지 검사합니다.
- **생산 경로:** 실제 GameHub event handling, room/session/scheduler, snapshot parsing을 fake WebSocket으로 실행합니다.
- **증명/비증명:** pause boundary가 stale direction을 지우고 resume ticks가 이를 되살리지 않음을 검증하도록 작성됐습니다. 실제 브라우저 keyup, 장시간 pause, reconnect는 검증하지 않습니다.
- **보장:** snapshot과 simulation neutralization 중 하나가 빠지는 regression을 감지합니다.
- **Thread 종료:** pause/resume는 server phase·scheduler·input intent를 함께 전환하는 lifecycle이 됩니다.
<!-- LEARNER-ANSWER END commit:632cbf13b616 -->

비교 기준:
- 직전 Thread 관련 SHA: `f46bbab95ea5` — `fix(game): 일시정지 시 paddle 입력 상태 초기화`
- 이 commit을 Thread의 마지막 상태로 사용합니다.

## 6. Thread 종합

다음 항목을 commit 순서에서 재구성합니다: invariant evolution, Failure → Fix → Test 관계, ownership/state 변화, 최종 실행 흐름, 비보장, 실제 실행 증거.

<!-- LEARNER-ANSWER START thread:06-pause-resume-and-input-neutralization.md:synthesis -->
- **불변식 진화:** `655bc7bd8df7`은 `paused` phase와 pause/resume commands를 공유 계약에 추가했습니다. `d93612c18e6f`는 GameHub가 participant/phase를 검사하고 timer를 clear/restart하며 playing일 때만 input/tick을 허용하게 했습니다. `e4e2dec55805`는 snapshot phase로 UI 가능 여부를 계산했습니다. 그러나 later simulation/session refactor 상태에서 pause 전 direction이 남았고, `f46bbab95ea5`가 snapshot `dy`와 internal simulation direction을 모두 0으로 만들었습니다.
- **소유권:** server session/room이 phase authority이며 scheduler/timer는 tick ownership을 표현합니다. snapshot은 client-visible state, simulation object는 다음 tick에 사용할 internal intent를 소유합니다. UI는 command를 요청할 뿐 phase를 낙관적으로 바꾸지 않습니다.
- **Failure → Fix → Test:** timer 중단만 수행 → resume 첫 tick에서 stale direction 재적용 위험 → 두 state representation 모두 neutralize → fake timers와 fake socket으로 input 1→pause→dy 0→resume/tick→dy 0을 검증합니다.
- **최종 흐름:** participant가 playing room에 pause 전송 → scheduler unregister/session pause → 양 paddle의 snapshot/internal direction 0 → paused snapshot broadcast → paused 중 input은 적용되지 않음 → participant resume → session playing/scheduler register → neutral state에서 ticks 재개입니다.
- **비보장:** pause timeout, 합의형 pause, reconnect 후 pause ownership, process restart persistence는 이 Thread의 기능이 아닙니다.
- **실행 증거:** test 구현은 exact SHA에서 검사했으나 Vitest fake-timer suite를 실행하지 않았습니다.
<!-- LEARNER-ANSWER END thread:06-pause-resume-and-input-neutralization.md:synthesis -->

## 7. 학습 완료 확인

<!-- LEARNER-ANSWER START thread:06-pause-resume-and-input-neutralization.md:checklist -->
- [x] 모든 SHA를 지정 브랜치의 exact commit으로 검사했습니다.
- [x] fixed commit map과 source classification을 보존했습니다.
- [x] earlier commit을 later HEAD 코드로 설명하지 않았습니다.
- [x] fix와 test를 원래 failure/production path에 연결했습니다.
- [x] 실제 실행하지 않은 test를 통과했다고 기록하지 않았습니다.
- [x] Thread 최종 owner, invariant, flow, non-guarantee를 작성했습니다.
<!-- LEARNER-ANSWER END thread:06-pause-resume-and-input-neutralization.md:checklist -->
