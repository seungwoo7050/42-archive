# Runtime limiter primitive와 bounded work

- 카테고리: `07-runtime-observability-and-service-health` — 런타임 관측성과 서비스 상태
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`
- Phase 1 상태: frozen authoritative scaffold

## 1. Thread 목표

fixed-step 시간 보정, connection heartbeat, input ordering/rate limit, latest-value snapshot buffer를 GameHub와 독립된 primitive로 복원하고 각 primitive가 소유하는 시간·상태·cleanup 상한을 확인합니다.

범위 메모: 이 Thread는 reusable limiter의 탄생과 deterministic 경계까지만 다룹니다. GameHub lifecycle 통합, shared scheduler ownership, 실제 congestion fix는 다음 Thread로 분리합니다.

### 직접 연결되는 불변식

- 한 timer callback이 수행하는 simulation catch-up work는 고정된 상한을 넘지 않습니다.
- 응답 없는 connection은 단일 heartbeat owner가 bounded deadline 뒤 제거합니다.
- accepted input sequence는 user-room별로 증가하고 accepted rate는 user별 token budget을 넘지 않습니다.
- snapshot backlog는 client별 latest one value로 제한되고 transport congestion은 bounded termination으로 수렴합니다.

## 2. 핵심 질문

- elapsed wall-clock과 fixed simulation timestep은 어떤 accumulator·clamp 산술로 분리됩니까?
- heartbeat interval과 timeout handle은 누가 만들고 acknowledge/stop 때 어떻게 교체·해제합니까?
- stale input과 rate-limited input 중 어느 검사가 먼저이며 그 순서가 token budget에 어떤 영향을 줍니까?
- latest snapshot replacement, soft retry, hard termination의 조건과 최초 callback 지연 가정은 무엇입니까?

## 3. 완료 기준

- Commit map의 모든 SHA를 `web/ft_transcendence` ancestry에서 확인합니다.
- 각 SHA의 parent 또는 직전 관련 SHA와 비교해 당시 상태만 설명합니다.
- 파일, symbol, caller/callee, 상태 mutation, ownership, cleanup, failure branch를 실제 코드로 기록합니다.
- Fix는 이전 가정과 root cause를, test/benchmark는 production path와 증명·비증명 범위를 연결합니다.
- 실행하지 않은 command나 benchmark 수치를 runtime evidence로 기록하지 않습니다.
- 마지막 selected SHA까지만 사용해 Thread 최종 owner, invariant, execution flow를 작성합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Thread 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `3a2943ff385d` | `feat(game): fixed-step scheduler 추가` | A | SIMULATION, REALTIME, OBSERVABILITY | monotonic elapsed time을 bounded 50 ms simulation work로 변환하는 fixed-step accumulator를 도입합니다. |
| 2 | `0888e119036d` | `test(game): fixed-step 보정 범위 검증` | B | SIMULATION, REALTIME, TEST | elapsed monotonic time을 fixed 50 ms work로 바꾸는 경계와 catch-up 상한을 deterministic clock으로 검증합니다. |
| 3 | `10a656e59864` | `feat(game): WebSocket heartbeat 추가` | A | REALTIME, RISK | WebSocket 연결의 ping 주기, 응답 deadline, 종료 cleanup을 단일 heartbeat lifecycle로 만듭니다. |
| 4 | `81031dcd2c1c` | `test(game): heartbeat timeout 검증` | B | REALTIME, TEST | ping cadence, 45초 timeout, acknowledge deadline reset을 fake timer로 검증합니다. |
| 5 | `207df3f47935` | `feat(game): 입력 순서와 rate limit 보호` | A | SIMULATION, REALTIME, RISK | room별 monotonic input sequence와 user별 token-bucket budget을 하나의 input admission gate로 결합합니다. |
| 6 | `1353e3eb99cc` | `test(game): input gate 제한 검증` | B | REALTIME, TEST | monotonic ordering과 user별 token bucket의 경계·격리를 deterministic clock으로 검증합니다. |
| 7 | `8589ff3c4821` | `feat(game): latest snapshot buffer 추가` | A | SIMULATION, REALTIME, OPERATIONS | 느린 transport에서 snapshot backlog를 누적하지 않고 latest value만 보존하며 congestion을 bounded termination으로 바꿉니다. |
| 8 | `125aa113a01c` | `test(game): snapshot replacement와 congestion 검증` | A | REALTIME, PERF, RISK | latest-value replacement, soft retry, hard termination, congestion timeout을 controlled socket state와 fake time으로 검증합니다. |

## 5. Commit별 학습 기록

### 5.1. `feat(game): fixed-step scheduler 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `3a2943ff385d` |
| Importance | A |
| Tags | SIMULATION, REALTIME, OBSERVABILITY |
| Source에서 확정된 역할 | monotonic elapsed time을 bounded 50 ms simulation work로 변환하는 fixed-step accumulator를 도입합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/game/fixedStepScheduler.ts`
- 핵심 symbol: `FixedStepScheduler`, `DEFAULT_TIMESTEP_MS`, `MAX_STEPS_PER_TICK`
- `start`, `stop`, 내부 timer callback이 `now()`와 `lastTimeMs`, `accumulatedMs`를 갱신하는 순서를 확인합니다.
- elapsed가 음수일 때 0으로 취급하고, 긴 지연 뒤 누적량을 `timestep * maxSteps`로 제한하는 산술을 확인합니다.
- 한 callback에서 실행할 step 수를 최대 5회로 제한한 뒤 남은 누적량을 어떻게 처리하는지 확인합니다.
- 주입 가능한 monotonic clock과 timer API가 production 시간과 deterministic test를 어떻게 분리하는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:3a2943ff385d:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | GameHub의 각 room은 wall-clock interval callback이 호출될 때마다 곧바로 한 번 simulation을 진행했습니다. callback이 늦거나 몰릴 때 실제 경과 시간과 simulation step 수의 관계를 설명할 별도 소유자가 없었습니다. |
| 해결하려던 문제와 위험 | event loop 지연을 그대로 따라잡으려 하면 한 callback에서 무제한 작업이 발생하고, 반대로 항상 한 번만 진행하면 simulation 시간이 실제 경과와 크게 어긋납니다. 또한 시스템 시계 역행이 음수 elapsed를 만들 수 있었습니다. |
| 핵심 구현 결정 | `FixedStepScheduler`가 monotonic `now()` 차이를 accumulator에 더하고 50 ms 단위로 step callback을 실행합니다. 누적 지연은 최대 250 ms, 한 callback의 step은 최대 5회로 제한하며 음수 elapsed는 0으로 보정합니다. timer와 clock을 주입할 수 있어 계산 규칙을 transport와 분리합니다. |
| 입력 → 상태 전이 → 출력 | `start` → 현재 monotonic 시각 저장 → interval callback → `max(0, now-last)` 계산 → 누적량을 250 ms 이하로 clamp → 누적량이 50 ms 이상인 동안 최대 5회 `step(50)` → 사용한 시간을 accumulator에서 차감합니다. |
| ownership/lifetime/cleanup | scheduler 인스턴스가 interval handle, 마지막 관측 시각, 누적 elapsed를 단독 소유합니다. `start`와 `stop`은 중복 호출에 안전하며 `stop`이 handle과 누적 진행 상태를 정리합니다. |
| failure/rollback/retry | clock이 뒤로 가면 elapsed를 0으로 만들고, event loop가 장시간 멈춰도 과거의 모든 tick을 재생하지 않습니다. step callback 자체의 예외를 복구하는 장치는 이 primitive에 없으므로 caller가 실행 실패 의미를 소유합니다. |
| 보장하는 것 | simulation work는 고정된 50 ms 단위이며 한 timer callback당 최대 5회로 제한됩니다. wall-clock 지연이 즉시 무제한 CPU burst로 변환되지 않습니다. |
| 보장하지 않는 것 | 이 SHA는 scheduler primitive만 추가합니다. GameHub room이 아직 이를 사용하지 않으므로 실제 realtime 경로의 timer topology는 바뀌지 않습니다. |
| 후속 연결 | `0888e119036d`가 보정 산술을 고정하고, `a6a1f4fba60e`에서 각 room의 simulation owner로 처음 통합됩니다. |
<!-- LEARNER-END:3a2943ff385d:record -->



#### 최소 코드 근거

<!-- LEARNER-BEGIN:3a2943ff385d:snippet -->
- SHA: `3a2943ff385d`
- 위치: `apps/api/src/game/fixedStepScheduler.ts`; `FixedStepScheduler`, `DEFAULT_TIMESTEP_MS`, `MAX_STEPS_PER_TICK`

```ts
const elapsedMs = Math.max(0, currentTimeMs - this.lastTimeMs);
this.accumulatedMs = Math.min(this.accumulatedMs + elapsedMs, this.timestepMs * this.maxStepsPerTick);
```
<!-- LEARNER-END:3a2943ff385d:snippet -->

#### 비교 기준

- 이 commit의 parent 상태와 비교합니다.
- 다음 관련 SHA: `0888e119036d` — `test(game): fixed-step 보정 범위 검증`

### 5.2. `test(game): fixed-step 보정 범위 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `0888e119036d` |
| Importance | B |
| Tags | SIMULATION, REALTIME, TEST |
| Source에서 확정된 역할 | elapsed monotonic time을 fixed 50 ms work로 바꾸는 경계와 catch-up 상한을 deterministic clock으로 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/game/fixedStepScheduler.test.ts`
- 핵심 symbol: fake clock/timer를 사용하는 `FixedStepScheduler` test cases
- 49 ms와 50 ms에서 step 호출 횟수가 달라지는 경계 테스트를 확인합니다.
- 10초 지연을 주입했을 때 5회만 실행되고 오래된 lag를 다음 callback으로 무한 이월하지 않는지 확인합니다.
- clock 역행과 `stop` 뒤 callback 중단을 어떤 fake timer 상태로 증명하는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:0888e119036d:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태와 문제 | fixed-step 산술은 구현됐지만 50 ms 경계, 긴 pause, 시계 역행, stop cleanup을 재현 가능한 방식으로 고정한 증거가 없었습니다. 실제 시간을 기다리는 테스트는 느리고 비결정적이며, accumulator의 off-by-one이나 stale lag 이월을 놓치기 쉽습니다. |
| 구현 또는 검증 결정 | 가짜 monotonic 시각과 timer를 주입해 49/50 ms 경계, 10초 pause, 역행한 시각, stop 이후 상태를 직접 구동합니다. |
| 실행/검증 경로 | scheduler 시작 → fake clock 변경 → timer callback 실행 → 기록된 step duration·호출 횟수 확인 → stop 뒤 추가 callback이 work를 만들지 않는지 확인합니다. |
| ownership과 failure 처리 | 테스트가 clock과 timer 진행을 소유하고 production scheduler는 주입된 API만 사용합니다. 각 case는 scheduler를 중지해 handle을 남기지 않습니다. 10초 경과를 한 번에 주입해 catch-up이 5회로 제한되는지, 다음 정상 tick이 과거 lag를 반복하지 않는지 확인합니다. |
| 보장하는 것 | fixed-step의 산술 경계와 cleanup이 wall-clock timing에 의존하지 않고 회귀 테스트로 고정됩니다. |
| 보장하지 않는 것 | 실제 Node event-loop 지연이나 여러 room의 작업 비용은 측정하지 않습니다. |
| 후속 연결 | `3a2943ff385d`의 primitive를 검증하며, 실제 GameHub 통합은 `a6a1f4fba60e`에서 별도로 검증해야 합니다. |
<!-- LEARNER-END:0888e119036d:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:0888e119036d:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | deterministic boundary test |
| 주입·재현 방식 | 주입된 fake clock과 timer callback으로 49/50 ms, 10초 delay, backward time, stop 상태를 직접 재현합니다. |
| 증명하는 것 | 한 callback당 최대 5 step, 음수 elapsed 무시, stop 이후 zero progress를 증명합니다. |
| 증명하지 않는 것 | OS scheduler·실제 event-loop·simulation body의 처리량은 증명하지 않습니다. |
<!-- LEARNER-END:0888e119036d:test -->



#### 비교 기준

- 직전 관련 SHA: `3a2943ff385d` — `feat(game): fixed-step scheduler 추가`
- 다음 관련 SHA: `10a656e59864` — `feat(game): WebSocket heartbeat 추가`

### 5.3. `feat(game): WebSocket heartbeat 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `10a656e59864` |
| Importance | A |
| Tags | REALTIME, RISK |
| Source에서 확정된 역할 | WebSocket 연결의 ping 주기, 응답 deadline, 종료 cleanup을 단일 heartbeat lifecycle로 만듭니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/game/connectionHeartbeat.ts`
- 핵심 symbol: `ConnectionHeartbeat.start`, `acknowledge`, `stop`, ping/timeout handles
- 15초 ping interval과 마지막 응답 기준 45초 timeout이 어떤 timer들로 구성되는지 확인합니다.
- `acknowledge`가 timeout ownership을 갱신하는 순서와 `start`/`stop`의 멱등성을 확인합니다.
- `socket.ping()`이 throw할 때 즉시 terminate하는 failure branch와 모든 handle cleanup을 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:10a656e59864:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | socket close 이벤트만으로 연결 상실을 알 수 있었고, half-open 연결이나 응답 없는 peer를 bounded time 안에 제거하는 owner가 없었습니다. |
| 해결하려던 문제와 위험 | transport가 열림 상태로 남아도 상대가 사라질 수 있습니다. ping과 deadline timer가 여러 위치에 흩어지면 reconnect·replacement·close 때 timer가 남거나 중복 종료할 위험이 있습니다. |
| 핵심 구현 결정 | `ConnectionHeartbeat`가 15초마다 ping을 보내고 45초 동안 acknowledge가 없으면 socket을 terminate합니다. acknowledge는 timeout deadline을 다시 예약하고, start/stop이 모든 timer handle을 한 객체에서 관리합니다. |
| 입력 → 상태 전이 → 출력 | `start` → ping interval·initial timeout 예약 → ping callback에서 `socket.ping()` → pong/활동 시 `acknowledge`가 timeout 재설정 → deadline 도달 또는 ping 예외 시 terminate → `stop`에서 interval/timeout 제거입니다. |
| ownership/lifetime/cleanup | 연결마다 하나의 heartbeat 인스턴스가 ping interval과 timeout을 소유합니다. transport owner는 연결 생성 시 start하고 disconnect/replacement/close 시 stop해야 합니다. |
| failure/rollback/retry | ping 호출이 동기 예외를 던지면 더 이상 heartbeat를 반복하지 않고 socket을 terminate합니다. 응답 없음도 45초 상한 뒤 같은 terminal path로 수렴합니다. |
| 보장하는 것 | 응답 없는 연결은 bounded deadline 안에 제거되고, timer cleanup을 단일 객체가 멱등적으로 수행할 수 있습니다. |
| 보장하지 않는 것 | primitive는 누가 pong을 acknowledge로 전달하고 언제 stop할지 알지 못합니다. 실제 GameHub client lifecycle 연결은 아직 없습니다. |
| 후속 연결 | `81031dcd2c1c`가 시간 계약을 고정하고, `fc2a4451eed1`이 GameHub client 생성·close에 연결합니다. |
<!-- LEARNER-END:10a656e59864:record -->




#### 비교 기준

- 직전 관련 SHA: `0888e119036d` — `test(game): fixed-step 보정 범위 검증`
- 다음 관련 SHA: `81031dcd2c1c` — `test(game): heartbeat timeout 검증`

### 5.4. `test(game): heartbeat timeout 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `81031dcd2c1c` |
| Importance | B |
| Tags | REALTIME, TEST |
| Source에서 확정된 역할 | ping cadence, 45초 timeout, acknowledge deadline reset을 fake timer로 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/game/connectionHeartbeat.test.ts`
- 핵심 symbol: fake socket의 `ping`/`terminate`, fake timers
- 30초 진행 뒤 ping 두 번, 45초 경계에서 terminate되는 expectation을 확인합니다.
- 중간 `acknowledge`가 기존 timeout을 취소하고 새 45초 deadline을 만드는지 확인합니다.
- stop 또는 ping throw case가 남은 timer를 어떻게 정리하는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:81031dcd2c1c:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태와 문제 | heartbeat 구현의 15초/45초 관계와 deadline reset이 실제 시간을 기다리지 않고 검증되지 않았습니다. timer 기반 liveness는 경계 시점과 중복 handle 오류가 흔하며 실제 시간 테스트는 flaky합니다. |
| 구현 또는 검증 결정 | Vitest fake timers와 호출 기록 socket으로 ping 횟수, terminate 시각, acknowledge 후 deadline 이동을 결정적으로 검사합니다. |
| 실행/검증 경로 | heartbeat 시작 → fake time 30초 진행 → ping 호출 확인 → deadline 직전/도달 상태 비교 → acknowledge case에서 deadline 재계산을 확인합니다. |
| ownership과 failure 처리 | 테스트가 fake timer queue를 소유하고 종료 시 timer를 비웁니다. heartbeat의 `stop`이 production handle cleanup을 수행하는지 호출 수로 확인합니다. 응답 없음과 ping 예외를 각각 terminate로 수렴시키는 경계를 재현합니다. |
| 보장하는 것 | heartbeat의 시간 상수와 reset/cleanup 규칙이 deterministic regression으로 고정됩니다. |
| 보장하지 않는 것 | 실제 WebSocket pong event wiring이나 GameHub reconnect semantics는 검증하지 않습니다. |
| 후속 연결 | `10a656e59864`의 primitive 증거이며, `fc2a4451eed1` 이후 통합 경로 테스트가 필요합니다. |
<!-- LEARNER-END:81031dcd2c1c:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:81031dcd2c1c:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | deterministic timer test |
| 주입·재현 방식 | Vitest fake timers와 fake socket call spies를 사용합니다. |
| 증명하는 것 | ping 15초 cadence, 45초 timeout, acknowledge deadline reset을 증명합니다. |
| 증명하지 않는 것 | 실제 network half-open 탐지 시간이나 OS TCP behavior는 증명하지 않습니다. |
<!-- LEARNER-END:81031dcd2c1c:test -->



#### 비교 기준

- 직전 관련 SHA: `10a656e59864` — `feat(game): WebSocket heartbeat 추가`
- 다음 관련 SHA: `207df3f47935` — `feat(game): 입력 순서와 rate limit 보호`

### 5.5. `feat(game): 입력 순서와 rate limit 보호`

| 항목 | 값 |
| --- | --- |
| SHA | `207df3f47935` |
| Importance | A |
| Tags | SIMULATION, REALTIME, RISK |
| Source에서 확정된 역할 | room별 monotonic input sequence와 user별 token-bucket budget을 하나의 input admission gate로 결합합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/game/inputGate.ts`
- 핵심 symbol: `InputGate.accept`, `releaseUser`, token bucket state와 sequence key
- sequence key가 user와 room을 NUL delimiter로 결합해 room별 monotonic ordering을 유지하는지 확인합니다.
- stale/duplicate sequence를 token 차감 전에 거부하는 순서를 확인합니다.
- 초당 30 token, burst 8의 refill 산술과 같은 user가 여러 room에서 budget을 공유하는지 확인합니다.
- `releaseUser`가 user bucket과 관련 sequence entries를 모두 제거하는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:207df3f47935:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | GameHub는 도착한 paddle input을 transport 순서대로 처리했으며 duplicate/stale input과 한 사용자의 과도한 명령을 독립적으로 제한하지 않았습니다. |
| 해결하려던 문제와 위험 | 재전송·역순 패킷은 state를 뒤로 움직일 수 있고, 무제한 input은 event loop와 simulation work를 압박합니다. stale 입력이 rate budget까지 소비하면 정상 최신 입력을 부당하게 막을 수 있습니다. |
| 핵심 구현 결정 | `InputGate`가 `(user, room)`별 마지막 `inputSeq`를 먼저 검사하고, 증가한 입력에만 user별 token bucket을 적용합니다. bucket은 초당 30개까지 refill되고 최대 8개 burst를 허용합니다. |
| 입력 → 상태 전이 → 출력 | input 도착 → user/room last sequence 조회 → `inputSeq <= last`면 stale 거부 → 현재 시각으로 user bucket refill → token 없으면 rate 거부 → token 1 차감·last sequence 갱신 → accept입니다. |
| ownership/lifetime/cleanup | InputGate가 user bucket과 user/room sequence map을 소유합니다. caller는 사용자의 마지막 authoritative connection이 제거될 때 `releaseUser`를 호출해야 memory와 budget state가 해제됩니다. |
| failure/rollback/retry | stale 입력은 token을 소비하지 않고, rate 초과 입력은 sequence를 advance하지 않아 나중의 동일보다 큰 sequence가 refill 후 수용될 수 있습니다. unsafe/non-monotonic clock은 주입 clock과 nonnegative elapsed 처리로 제한됩니다. |
| 보장하는 것 | 같은 user-room의 accepted input은 strictly increasing이며, 한 user의 accepted rate는 burst 8과 초당 30 refill로 제한됩니다. |
| 보장하지 않는 것 | 이 primitive 자체는 payload schema, room membership, player side authorization을 검증하지 않습니다. GameHub가 그 선행 조건을 확인해야 합니다. |
| 후속 연결 | `1353e3eb99cc`가 ordering과 budget 상호작용을 검증하고, `fc2a4451eed1`에서 실제 message path에 통합됩니다. |
<!-- LEARNER-END:207df3f47935:record -->




#### 비교 기준

- 직전 관련 SHA: `81031dcd2c1c` — `test(game): heartbeat timeout 검증`
- 다음 관련 SHA: `1353e3eb99cc` — `test(game): input gate 제한 검증`

### 5.6. `test(game): input gate 제한 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `1353e3eb99cc` |
| Importance | B |
| Tags | REALTIME, TEST |
| Source에서 확정된 역할 | monotonic ordering과 user별 token bucket의 경계·격리를 deterministic clock으로 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/game/inputGate.test.ts`
- 핵심 symbol: 가짜 시각을 사용하는 `InputGate.accept` cases
- burst 8 이후 거부와 시간 진행에 따른 refill을 확인합니다.
- stale sequence를 반복해도 token이 줄지 않는지 확인합니다.
- 한 user의 여러 room이 budget을 공유하고 다른 user는 격리되는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:1353e3eb99cc:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태와 문제 | 입력 gate 구현은 sequence와 rate 두 상태를 결합했지만 검사 순서와 key scope가 regression으로 고정되지 않았습니다. stale input이 token을 소모하거나 room마다 독립 bucket을 만들면 공격자가 제한을 우회하거나 정상 input을 차단할 수 있습니다. |
| 구현 또는 검증 결정 | 주입 clock을 전진시키며 burst/refill을 검사하고, stale sequence·동일 user 다중 room·다른 user cases를 조합합니다. |
| 실행/검증 경로 | 초기 burst consume → 9번째 거부 → fake time 진행 → refill acceptance; 별도 case에서 stale 입력 후 최신 입력 acceptance; room/user key scope 비교입니다. |
| ownership과 failure 처리 | 테스트가 시각과 input sequence를 명시하며 gate state는 case별 새 인스턴스에 격리됩니다. rate exhaustion과 stale ordering을 서로 다른 rejection reason으로 재현하고 stale 경로가 budget에 side effect를 만들지 않는지 확인합니다. |
| 보장하는 것 | ordering 검사가 rate charge보다 먼저이고, budget scope가 user 단위라는 구현 규칙을 고정합니다. |
| 보장하지 않는 것 | WebSocket error event나 GameHub client cleanup은 이 unit test 범위 밖입니다. |
| 후속 연결 | `207df3f47935`의 admission invariant를 보호하며 `400ea1589260`이 실제 GameHub boundary를 추가 검증합니다. |
<!-- LEARNER-END:1353e3eb99cc:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:1353e3eb99cc:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | deterministic boundary/isolation test |
| 주입·재현 방식 | 가짜 clock, 여러 user/room key, 연속 sequence를 조합합니다. |
| 증명하는 것 | burst/refill 산술, stale non-consumption, user-scoped budget을 증명합니다. |
| 증명하지 않는 것 | network message ordering·schema validation·authorization은 증명하지 않습니다. |
<!-- LEARNER-END:1353e3eb99cc:test -->



#### 비교 기준

- 직전 관련 SHA: `207df3f47935` — `feat(game): 입력 순서와 rate limit 보호`
- 다음 관련 SHA: `8589ff3c4821` — `feat(game): latest snapshot buffer 추가`

### 5.7. `feat(game): latest snapshot buffer 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `8589ff3c4821` |
| Importance | A |
| Tags | SIMULATION, REALTIME, OPERATIONS |
| Source에서 확정된 역할 | 느린 transport에서 snapshot backlog를 누적하지 않고 latest value만 보존하며 congestion을 bounded termination으로 바꿉니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/game/latestSnapshotBuffer.ts`
- 핵심 symbol: `LatestSnapshotBuffer.enqueue`, `flush`, `close`, soft/hard buffer limits와 congestion timer
- pending snapshot 하나만 유지하고 새 snapshot이 기존 pending 값을 교체하는지 확인합니다.
- `bufferedAmount`의 soft 256 KiB와 hard 1 MiB 경계, 50 ms retry, 5초 congestion deadline을 확인합니다.
- 이 최초 버전에서 outstanding send callback을 나타내는 `sending` 상태가 congestion 판단에 포함되는지 확인합니다.
- replace/deliver/congestion/connection-closed가 어떤 callback 또는 cleanup path로 관측 가능한지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:8589ff3c4821:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 모든 simulation snapshot을 즉시 `socket.send`하면 느린 client마다 outbound queue가 무한히 늘고 오래된 state가 최신 state보다 늦게 전달될 수 있었습니다. |
| 해결하려던 문제와 위험 | snapshot은 중간 값을 모두 보존할 필요가 없지만 control event와 달리 높은 빈도로 생성됩니다. transport pressure가 계속되면 process memory와 latency가 무한히 증가하므로 drop과 terminal threshold가 필요했습니다. |
| 핵심 구현 결정 | buffer는 pending snapshot을 하나만 소유하고 다음 snapshot이 오면 교체합니다. transport `bufferedAmount`가 soft limit 이상이면 retry하며, hard limit 초과 또는 5초 지속 congestion이면 socket을 terminate합니다. 이 SHA에서는 send callback 미완료를 나타내는 `sending`도 새 전송을 막는 조건입니다. |
| 입력 → 상태 전이 → 출력 | `enqueue(payload)` → 기존 pending이 있으면 replace 기록 → pending 저장 → `flush` → socket closed면 drop/cleanup → hard pressure면 terminate → soft pressure 또는 sending이면 retry timer → 전송 가능하면 pending을 꺼내 send callback을 기다리고 이후 다시 flush합니다. |
| ownership/lifetime/cleanup | client별 buffer가 latest payload, enqueue 시각, retry timer, congestion 시작 시각, sending 상태를 단독 소유합니다. `close`는 timer와 pending 값을 버리고 이후 enqueue를 받지 않습니다. |
| failure/rollback/retry | send callback 오류, closed socket, hard buffer, 5초 soft congestion을 각각 terminal 또는 drop path로 처리합니다. 다만 callback 지연 자체를 congestion으로 간주하는 가정은 후속 `d90f17fa765d`에서 잘못된 것으로 판명됩니다. |
| 보장하는 것 | outbound snapshot backlog는 client당 latest one value로 제한되고 실제 buffered pressure는 hard/시간 상한을 갖습니다. |
| 보장하지 않는 것 | 최초 구현은 `sending` 상태와 transport `bufferedAmount`를 동일한 pressure 신호처럼 취급해 callback이 느린 정상 socket도 drop/terminate할 수 있습니다. |
| 후속 연결 | `125aa113a01c`가 최초 semantics를 검증하고 `49ca3e778801`에서 GameHub에 연결됩니다. `d90f17fa765d`/`5cd54767858f`가 callback 지연 오판을 나중에 교정합니다. |
<!-- LEARNER-END:8589ff3c4821:record -->


#### Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:8589ff3c4821:fix -->
초기 가정: send callback 미완료도 congestion이다 → 실제 위험: callback 지연과 kernel/userland buffer pressure는 다르다 → `d90f17fa765d`에서 `bufferedAmount`만 pressure source로 남깁니다.
<!-- LEARNER-END:8589ff3c4821:fix -->


#### 비교 기준

- 직전 관련 SHA: `1353e3eb99cc` — `test(game): input gate 제한 검증`
- 다음 관련 SHA: `125aa113a01c` — `test(game): snapshot replacement와 congestion 검증`

### 5.8. `test(game): snapshot replacement와 congestion 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `125aa113a01c` |
| Importance | A |
| Tags | REALTIME, PERF, RISK |
| Source에서 확정된 역할 | latest-value replacement, soft retry, hard termination, congestion timeout을 controlled socket state와 fake time으로 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/game/latestSnapshotBuffer.test.ts`
- 핵심 symbol: fake socket의 `bufferedAmount`, delayed send callback, fake timers, observer spies
- 전송 중 여러 snapshot을 enqueue할 때 intermediate 값이 교체되고 latest만 남는지 확인합니다.
- soft pressure에서 retry timer가 진행되고 pressure 해제 뒤 latest snapshot이 전송되는지 확인합니다.
- hard 1 MiB 초과와 5초 지속 congestion이 각각 terminate를 유발하는지 확인합니다.
- 테스트가 당시 `sending`을 congestion 조건으로 기대한다는 점을 후속 fix와 비교합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:125aa113a01c:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | latest buffer는 중요한 resource-boundary였지만 replacement/drop/termination 기준이 socket 구현에 따라 달라질 위험이 있었습니다. |
| 해결하려던 문제와 위험 | 실제 network를 사용하면 bufferedAmount와 callback 시점을 정밀하게 제어하기 어려워 soft/hard 경계 및 5초 deadline regression을 재현하기 어렵습니다. |
| 핵심 구현 결정 | fake socket에서 `bufferedAmount`와 send callback 완료를 직접 제어하고 fake timers로 50 ms retry와 5초 deadline을 진행합니다. observer 호출과 실제 sent payload를 함께 검사합니다. |
| 입력 → 상태 전이 → 출력 | 첫 snapshot enqueue/전송 → callback 또는 buffer pressure를 유지 → 후속 snapshots enqueue → latest replacement 확인 → pressure 해제 또는 deadline 진행 → send/terminate/drop 결과 확인입니다. |
| ownership/lifetime/cleanup | 테스트 fake socket이 transport pressure와 callback completion을 소유하고, buffer가 retry timer와 pending payload를 정리하는지 확인합니다. |
| failure/rollback/retry | soft pressure recovery, hard immediate termination, prolonged pressure termination을 분리해 재현합니다. 당시에는 delayed callback 역시 pressure 경로에 포함됩니다. |
| 보장하는 것 | 최초 latest-buffer의 bounded-memory와 termination 규칙이 결정적으로 검증됩니다. |
| 보장하지 않는 것 | 테스트가 구현 당시의 잘못된 `sending == congestion` 가정도 고정합니다. 따라서 후속 fix에서는 기대값을 의도적으로 변경해야 합니다. |
| 후속 연결 | `8589ff3c4821`의 high-risk semantics 증거이며, `5cd54767858f`가 callback 지연과 실제 buffered congestion을 분리하는 새 regression으로 대체·확장합니다. |
<!-- LEARNER-END:125aa113a01c:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:125aa113a01c:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | deterministic backpressure/failure test |
| 주입·재현 방식 | fake `bufferedAmount`, 수동 send callback, fake timers로 replacement·soft/hard congestion을 재현합니다. |
| 증명하는 것 | latest-only retention, retry/timeout, hard termination, cleanup을 증명합니다. |
| 증명하지 않는 것 | 실제 OS socket buffer 크기나 network throughput은 증명하지 않으며 당시 callback 가정을 그대로 반영합니다. |
<!-- LEARNER-END:125aa113a01c:test -->

#### Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:125aa113a01c:fix -->
이 테스트가 고정한 callback-pressure 가정은 `d90f17fa765d`에서 root cause가 수정되고 `5cd54767858f`에서 새 기대값으로 회귀 보호됩니다.
<!-- LEARNER-END:125aa113a01c:fix -->


#### 비교 기준

- 직전 관련 SHA: `8589ff3c4821` — `feat(game): latest snapshot buffer 추가`
- 이 Thread의 마지막 selected SHA입니다.

## 6. 불변식의 변화

<!-- LEARNER-BEGIN:03-runtime-limiter-primitives-and-bounded-work.md:evolution -->
`3a2943ff385d`/`0888e119036d`는 elapsed time을 최대 5개의 50 ms step으로 제한합니다. `10a656e59864`/`81031dcd2c1c`는 connection liveness timer를 한 객체로 묶고, `207df3f47935`/`1353e3eb99cc`는 stale ordering을 token charge보다 먼저 판정합니다. `8589ff3c4821`/`125aa113a01c`는 outbound snapshot을 latest one value로 제한하지만 send callback 미완료를 congestion으로 보는 가정은 후속 integration Thread에서 수정됩니다.
<!-- LEARNER-END:03-runtime-limiter-primitives-and-bounded-work.md:evolution -->

## 7. Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:03-runtime-limiter-primitives-and-bounded-work.md:failure-links -->
- event-loop 장기 정지 → accumulator/catch-up clamp → 49/50 ms·10초 pause regression
- half-open connection → ping/deadline lifecycle → fake-time timeout·acknowledge reset
- stale flood/rate burst → sequence-first token gate → user/room isolation tests
- outbound backlog → latest replacement·soft/hard pressure → controlled socket failure tests → callback 오판은 `d90f17fa765d`에서 교정
<!-- LEARNER-END:03-runtime-limiter-primitives-and-bounded-work.md:failure-links -->

## 8. Ownership·state·cleanup 변화

<!-- LEARNER-BEGIN:03-runtime-limiter-primitives-and-bounded-work.md:ownership -->
`FixedStepScheduler`는 interval과 accumulator를, `ConnectionHeartbeat`는 ping/timeout handles를, `InputGate`는 user bucket과 user-room sequence를, `LatestSnapshotBuffer`는 pending payload·retry/congestion 상태를 소유합니다. 이 단계에서는 GameHub가 아직 이 lifetime들을 실제 client/room lifecycle에 연결하지 않습니다.
<!-- LEARNER-END:03-runtime-limiter-primitives-and-bounded-work.md:ownership -->

## 9. Thread 최종 상태

<!-- LEARNER-BEGIN:03-runtime-limiter-primitives-and-bounded-work.md:final-state -->
네 limiter primitive와 deterministic unit evidence가 존재합니다. 각 primitive의 work·time·memory 상한은 정의됐지만 실제 room/client 생성·교체·pause·finalization에서 start/stop/release가 정확히 호출되는지는 다음 Thread의 통합 책임입니다.
<!-- LEARNER-END:03-runtime-limiter-primitives-and-bounded-work.md:final-state -->

## 10. 최종 실행 흐름

<!-- LEARNER-BEGIN:03-runtime-limiter-primitives-and-bounded-work.md:final-flow -->
elapsed time은 fixed-step accumulator로, socket liveness는 heartbeat deadline으로, client input은 sequence+token admission으로, outbound snapshot은 latest buffer+pressure limit으로 각각 독립 처리됩니다. primitive는 상태 결정만 소유하고 domain room 전이와 transport membership은 소유하지 않습니다.
<!-- LEARNER-END:03-runtime-limiter-primitives-and-bounded-work.md:final-flow -->

## 11. 실행 및 검증 근거

<!-- LEARNER-BEGIN:03-runtime-limiter-primitives-and-bounded-work.md:execution -->
- 저장소 runtime/test command는 실행하지 않았습니다.
- 실행을 시도한 명령: `git ls-remote --heads https://github.com/seungwoo7050/42-archive.git refs/heads/web/ft_transcendence`
- 실제 결과: exit status 128, `Could not resolve host: github.com`.
- 따라서 test pass, benchmark 수치, k6/Toxiproxy recovery 결과는 주장하지 않습니다. 각 기록은 GitHub 연결로 exact selected commit의 diff와 당시 파일을 확인한 정적 historical inspection 결과입니다.
<!-- LEARNER-END:03-runtime-limiter-primitives-and-bounded-work.md:execution -->

## 12. 학습 완료 확인

<!-- LEARNER-BEGIN:03-runtime-limiter-primitives-and-bounded-work.md:checks -->
- [x] 50 ms timestep과 최대 5회 catch-up 산술을 설명할 수 있습니다.
- [x] heartbeat의 interval/timeout handle과 acknowledge reset을 추적할 수 있습니다.
- [x] stale input이 token을 소비하지 않는 이유와 user budget scope를 설명할 수 있습니다.
- [x] latest buffer의 soft/hard/time limits와 최초 callback 지연 가정의 한계를 구분할 수 있습니다.
<!-- LEARNER-END:03-runtime-limiter-primitives-and-bounded-work.md:checks -->
