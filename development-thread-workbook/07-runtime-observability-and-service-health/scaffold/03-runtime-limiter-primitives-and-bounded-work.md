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
| 직전 관련 상태 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 해결하려던 문제와 위험 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 핵심 구현 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 입력 → 상태 전이 → 출력 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership/lifetime/cleanup | [해당 SHA의 파일·심볼·조건으로 작성] |
| failure/rollback/retry | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:3a2943ff385d:record -->



#### 최소 코드 근거

<!-- LEARNER-BEGIN:3a2943ff385d:snippet -->
설계·상태 전이·실패 처리를 이해하는 데 필요한 최소 코드만 해당 SHA에서 인용하고, 파일과 symbol을 함께 기록합니다.
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
| 직전 관련 상태와 문제 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 구현 또는 검증 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 실행/검증 경로 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership과 failure 처리 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:0888e119036d:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:0888e119036d:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | [unit/integration/process/load/benchmark/failure injection 중 실제 기법 작성] |
| 주입·재현 방식 | [입력·시각·오류·동시성·transport 상태 작성] |
| 증명하는 것 | [실제 production path와 assertion 작성] |
| 증명하지 않는 것 | [실행 범위 밖의 보장 작성] |
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
| 직전 관련 상태 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 해결하려던 문제와 위험 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 핵심 구현 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 입력 → 상태 전이 → 출력 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership/lifetime/cleanup | [해당 SHA의 파일·심볼·조건으로 작성] |
| failure/rollback/retry | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
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
| 직전 관련 상태와 문제 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 구현 또는 검증 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 실행/검증 경로 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership과 failure 처리 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:81031dcd2c1c:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:81031dcd2c1c:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | [unit/integration/process/load/benchmark/failure injection 중 실제 기법 작성] |
| 주입·재현 방식 | [입력·시각·오류·동시성·transport 상태 작성] |
| 증명하는 것 | [실제 production path와 assertion 작성] |
| 증명하지 않는 것 | [실행 범위 밖의 보장 작성] |
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
| 직전 관련 상태 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 해결하려던 문제와 위험 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 핵심 구현 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 입력 → 상태 전이 → 출력 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership/lifetime/cleanup | [해당 SHA의 파일·심볼·조건으로 작성] |
| failure/rollback/retry | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
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
| 직전 관련 상태와 문제 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 구현 또는 검증 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 실행/검증 경로 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership과 failure 처리 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:1353e3eb99cc:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:1353e3eb99cc:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | [unit/integration/process/load/benchmark/failure injection 중 실제 기법 작성] |
| 주입·재현 방식 | [입력·시각·오류·동시성·transport 상태 작성] |
| 증명하는 것 | [실제 production path와 assertion 작성] |
| 증명하지 않는 것 | [실행 범위 밖의 보장 작성] |
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
| 직전 관련 상태 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 해결하려던 문제와 위험 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 핵심 구현 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 입력 → 상태 전이 → 출력 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership/lifetime/cleanup | [해당 SHA의 파일·심볼·조건으로 작성] |
| failure/rollback/retry | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:8589ff3c4821:record -->


#### Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:8589ff3c4821:fix -->
이전 가정 → 실제 failure/risk → root cause → 수정된 invariant/결정 → 변경된 코드 → regression evidence를 해당 SHA와 관련 이전/후속 SHA로 연결해 작성합니다.
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
| 직전 관련 상태 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 해결하려던 문제와 위험 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 핵심 구현 결정 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 입력 → 상태 전이 → 출력 | [해당 SHA의 파일·심볼·조건으로 작성] |
| ownership/lifetime/cleanup | [해당 SHA의 파일·심볼·조건으로 작성] |
| failure/rollback/retry | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 보장하지 않는 것 | [해당 SHA의 파일·심볼·조건으로 작성] |
| 후속 연결 | [해당 SHA의 파일·심볼·조건으로 작성] |
<!-- LEARNER-END:125aa113a01c:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:125aa113a01c:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | [unit/integration/process/load/benchmark/failure injection 중 실제 기법 작성] |
| 주입·재현 방식 | [입력·시각·오류·동시성·transport 상태 작성] |
| 증명하는 것 | [실제 production path와 assertion 작성] |
| 증명하지 않는 것 | [실행 범위 밖의 보장 작성] |
<!-- LEARNER-END:125aa113a01c:test -->

#### Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:125aa113a01c:fix -->
이전 가정 → 실제 failure/risk → root cause → 수정된 invariant/결정 → 변경된 코드 → regression evidence를 해당 SHA와 관련 이전/후속 SHA로 연결해 작성합니다.
<!-- LEARNER-END:125aa113a01c:fix -->


#### 비교 기준

- 직전 관련 SHA: `8589ff3c4821` — `feat(game): latest snapshot buffer 추가`
- 이 Thread의 마지막 selected SHA입니다.

## 6. 불변식의 변화

<!-- LEARNER-BEGIN:03-runtime-limiter-primitives-and-bounded-work.md:evolution -->
[각 불변식이 도입·확장·부족 판정·수정·회귀 보호된 SHA를 순서대로 작성합니다.]
<!-- LEARNER-END:03-runtime-limiter-primitives-and-bounded-work.md:evolution -->

## 7. Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:03-runtime-limiter-primitives-and-bounded-work.md:failure-links -->
[실패 또는 위험 → 원인 → 수정 SHA → 검증 SHA 관계를 작성합니다.]
<!-- LEARNER-END:03-runtime-limiter-primitives-and-bounded-work.md:failure-links -->

## 8. Ownership·state·cleanup 변화

<!-- LEARNER-BEGIN:03-runtime-limiter-primitives-and-bounded-work.md:ownership -->
[초기 owner와 최종 owner, 생성·이전·해제 시점을 실제 symbol로 작성합니다.]
<!-- LEARNER-END:03-runtime-limiter-primitives-and-bounded-work.md:ownership -->

## 9. Thread 최종 상태

<!-- LEARNER-BEGIN:03-runtime-limiter-primitives-and-bounded-work.md:final-state -->
[마지막 selected SHA에서 보장되는 상태와 남은 non-guarantee를 작성합니다.]
<!-- LEARNER-END:03-runtime-limiter-primitives-and-bounded-work.md:final-state -->

## 10. 최종 실행 흐름

<!-- LEARNER-BEGIN:03-runtime-limiter-primitives-and-bounded-work.md:final-flow -->
[입력 또는 lifecycle event부터 상태 전이·side effect·cleanup까지 최종 caller/callee 흐름을 작성합니다.]
<!-- LEARNER-END:03-runtime-limiter-primitives-and-bounded-work.md:final-flow -->

## 11. 실행 및 검증 근거

<!-- LEARNER-BEGIN:03-runtime-limiter-primitives-and-bounded-work.md:execution -->
- 실제로 실행한 command가 있으면 SHA, command, result를 기록합니다.
- 실행하지 못했다면 code inspection과 runtime execution을 구분하고 원인을 기록합니다.
<!-- LEARNER-END:03-runtime-limiter-primitives-and-bounded-work.md:execution -->

## 12. 학습 완료 확인

<!-- LEARNER-BEGIN:03-runtime-limiter-primitives-and-bounded-work.md:checks -->
- [ ] 50 ms timestep과 최대 5회 catch-up 산술을 설명할 수 있습니다.
- [ ] heartbeat의 interval/timeout handle과 acknowledge reset을 추적할 수 있습니다.
- [ ] stale input이 token을 소비하지 않는 이유와 user budget scope를 설명할 수 있습니다.
- [ ] latest buffer의 soft/hard/time limits와 최초 callback 지연 가정의 한계를 구분할 수 있습니다.
<!-- LEARNER-END:03-runtime-limiter-primitives-and-bounded-work.md:checks -->
