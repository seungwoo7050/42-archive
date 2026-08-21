# Development Thread 03: 결정적 simulation·시간·snapshot 전달 검증

English title: **Deterministic Simulation, Timing, and Snapshot Delivery Verification**

## Thread 목표

순수 simulation 결정성에서 fixed-step 시간 변환, versioned replay, latest snapshot backpressure와 callback 오판 교정까지의 검증 관계를 복원한다.

## 핵심 질문

- 동일 입력 결정성에는 state immutability, seeded randomness, fixed delta가 왜 함께 필요한가?
- wall-clock 지연을 simulation work로 그대로 변환하지 않고 accumulator와 catch-up cap을 두는 이유는 무엇인가?
- versioned replay fixture가 짧은 단위 테스트와 다른 호환성 증거를 어떻게 제공하는가?
- snapshot은 왜 reliable FIFO가 아니라 latest-value buffer이며, 어떤 control event와 구분되는가?
- send callback 지연과 실제 transport congestion을 동일시한 가정은 왜 틀렸는가?

## 완료 기준

- pure simulation, scheduler, replay fixture, delivery buffer의 책임을 분리한다.
- 1,000-tick digest와 versioned fixture가 증명하는 것과 못 하는 것을 구분한다.
- 50ms step, remainder, 250ms catch-up cap을 수치로 설명한다.
- soft/hard backpressure와 callback-latency fix/test 관계를 재구성한다.

## Commit map

| 순서 | Commit | Subject | Importance | Tags |
| --- | --- | --- | --- | --- |
| 1 | `4ef4beeb8611` | `test(game): 결정적 simulation 검증` | A | SIMULATION, REALTIME, TEST |
| 2 | `0888e119036d` | `test(game): fixed-step 보정 범위 검증` | B | SIMULATION, REALTIME, TEST |
| 3 | `125aa113a01c` | `test(game): snapshot replacement와 congestion 검증` | A | REALTIME, PERF, RISK |
| 4 | `37a7b2e4611b` | `test(game): versioned match replay fixture 추가` | A | SIMULATION, REALTIME, TEST |
| 5 | `d90f17fa765d` | `fix(game): callback 지연을 snapshot congestion으로 오판하지 않음` | A | REALTIME, PERF, RISK |
| 6 | `5cd54767858f` | `test(game): callback 지연과 실제 congestion 구분` | A | REALTIME, PERF, TEST |

> Commit 순서·subject·importance·tags는 Phase 1 감사 후 동결된 정보입니다. Phase 2에서는 변경하지 않습니다.

## Commit `4ef4beeb8611` — test(game): 결정적 simulation 검증

- Full SHA: `4ef4beeb8611a17f47764065a9b4da2fc16cd463`
- Subject: `test(game): 결정적 simulation 검증`
- Importance: **A**
- Tags: SIMULATION, REALTIME, TEST
- Source-defined role: 추출된 Pong simulation과 AI가 동일 입력에서 동일 결과를 만들고 이전 상태를 변경하지 않는다는 핵심 결정성 계약을 검증한다.

### 정확한 조사 대상

- `apps/api/src/pongSimulation.test.ts`와 `pongAi.test.ts`의 seeded 실행을 확인한다.
- integer PRNG·동일 seed가 동일 AI command와 snapshot sequence를 만드는지 확인한다.
- 이전 state 및 중첩 객체를 변경하지 않고 새 state를 반환하는 deep immutability 검사를 확인한다.
- delta scaling, paddle clamp, collision/scoring/termination 경계와 1,000-tick digest 검사를 확인한다.
- simulation source에 `Math.random` 또는 시간 의존 호출이 없는지 source guard를 확인한다.

### 학습자 복원

<!-- ANSWER:4ef4beeb8611:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:4ef4beeb8611:end -->

## Commit `0888e119036d` — test(game): fixed-step 보정 범위 검증

- Full SHA: `0888e119036df23deeb961b9e26da305310da391`
- Subject: `test(game): fixed-step 보정 범위 검증`
- Importance: **B**
- Tags: SIMULATION, REALTIME, TEST
- Source-defined role: monotonic elapsed time을 50ms simulation step으로 변환할 때 remainder와 catch-up 상한을 결정적으로 검증한다.

### 정확한 조사 대상

- `apps/api/src/fixedStepScheduler.test.ts`의 fake clock/fake timer 구성을 확인한다.
- 정확히 50ms에서 한 step, 부족한 시간은 remainder로 남는지 확인한다.
- 긴 지연 뒤 최대 5 step/250ms만 처리하는 catch-up cap을 확인한다.
- clock이 뒤로 이동한 경우 음수 elapsed를 무시하는지, `stop()`이 timer를 정리하는지 확인한다.

### 학습자 복원

<!-- ANSWER:0888e119036d:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:0888e119036d:end -->

## Commit `125aa113a01c` — test(game): snapshot replacement와 congestion 검증

- Full SHA: `125aa113a01c38605372c490637e1bfa4e86a009`
- Subject: `test(game): snapshot replacement와 congestion 검증`
- Importance: **A**
- Tags: REALTIME, PERF, RISK
- Source-defined role: latest-value snapshot buffer가 backlog를 누적하지 않고 실제 congestion에서만 drop·close하는 규칙을 fake socket과 clock으로 검증한다.

### 정확한 조사 대상

- `apps/api/src/latestSnapshotBuffer.test.ts`의 fake socket state와 `bufferedAmount` 조작을 확인한다.
- 전송 중 새 snapshot이 도착하면 오래된 pending 값 대신 최신 값 하나만 남기는지 확인한다.
- soft congestion에서 retry 간격 50ms와 5초 지속 기준을 확인한다.
- hard buffered amount 1MiB 이상에서 즉시 종료되는지 확인한다.
- `onDropped`와 close callback이 어떤 사건에서 몇 번 호출되는지 확인한다.

### 학습자 복원

<!-- ANSWER:125aa113a01c:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:125aa113a01c:end -->

## Commit `37a7b2e4611b` — test(game): versioned match replay fixture 추가

- Full SHA: `37a7b2e4611b02d077e98c0e136f2b97313ff807`
- Subject: `test(game): versioned match replay fixture 추가`
- Importance: **A**
- Tags: SIMULATION, REALTIME, TEST
- Source-defined role: 결정성 검사를 코드 내부 상수에서 versioned fixture 계약으로 승격해 장기 simulation 호환성을 검증한다.

### 정확한 조사 대상

- `apps/api/src/fixtures/replay-v1.json`의 protocolVersion, seed, timestep, tick count, input encoding을 확인한다.
- `replayFixture.test.ts`가 fixture를 parse하고 1,000 ticks를 정확히 재생하는지 확인한다.
- 최종 canonical state를 어떤 방식으로 SHA-256 digest로 만드는지 확인한다.
- fixture version과 현재 parser/simulation version 불일치가 어떻게 실패하는지 확인한다.

### 학습자 복원

<!-- ANSWER:37a7b2e4611b:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:37a7b2e4611b:end -->

## Commit `d90f17fa765d` — fix(game): callback 지연을 snapshot congestion으로 오판하지 않음

- Full SHA: `d90f17fa765d4e9548b8f52c850b7605698644eb`
- Subject: `fix(game): callback 지연을 snapshot congestion으로 오판하지 않음`
- Importance: **A**
- Tags: REALTIME, PERF, RISK
- Source-defined role: WebSocket `send` callback 지연을 transport congestion으로 간주하던 잘못된 가정을 제거하고 `bufferedAmount`만 pressure 근거로 사용한다.

### 정확한 조사 대상

- `apps/api/src/latestSnapshotBuffer.ts`에서 `sending` 상태와 callback gating이 제거된 diff를 확인한다.
- snapshot 전송 결정이 `bufferedAmount`의 soft/hard threshold에만 의존하도록 바뀌는지 확인한다.
- callback이 늦어도 socket buffer가 건강하면 다음 snapshot을 보낼 수 있는지 확인한다.
- latest-value replacement가 실제 pressure 상황에서만 적용되는지 확인한다.

### 학습자 복원

<!-- ANSWER:d90f17fa765d:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:d90f17fa765d:end -->

## Commit `5cd54767858f` — test(game): callback 지연과 실제 congestion 구분

- Full SHA: `5cd54767858f60f0f10b9c86e680a9922c361fac`
- Subject: `test(game): callback 지연과 실제 congestion 구분`
- Importance: **A**
- Tags: REALTIME, PERF, TEST
- Source-defined role: 지연된 send callback과 `bufferedAmount` pressure를 독립적으로 제어해 교정된 snapshot delivery invariant를 검증한다.

### 정확한 조사 대상

- `latestSnapshotBuffer.test.ts`의 fake socket callback queue를 확인한다.
- callback 세 개를 보류한 상태에서도 healthy `bufferedAmount`이면 세 snapshot이 모두 전송되는지 확인한다.
- soft pressure를 설정했을 때만 pending 최신값 replacement와 `onDropped`가 발생하는지 확인한다.
- callback을 나중에 flush해도 중복 전송·drop·close가 없는지 확인한다.

### 학습자 복원

<!-- ANSWER:5cd54767858f:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:5cd54767858f:end -->


## Thread-level invariant evolution

다음 표에서 불변식이 도입·확장·교정·검증된 SHA를 구분합니다.

<!-- ANSWER:thread-03-invariants:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-03-invariants:end -->

## Failure → Fix → Test 관계

구현 추가를 독립 기능으로 나열하지 말고, 이전 가정과 실제 실패 위험, 수정된 결정, 회귀 증거를 연결합니다.

<!-- ANSWER:thread-03-failure-relations:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-03-failure-relations:end -->

## Ownership·state·responsibility 변화

자원과 상태를 누가 만들고, 보유하고, 이전하고, 정리하는지 커밋 순서에 따라 정리합니다.

<!-- ANSWER:thread-03-ownership:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-03-ownership:end -->

## 최종 Thread 상태

최종 HEAD를 과거 커밋에 투영하지 말고, 위 SHA 순서에서 도달한 보장을 요약합니다.

<!-- ANSWER:thread-03-final-state:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-03-final-state:end -->

## 최종 architecture / execution flow

실제 caller→boundary→state transition→cleanup 흐름을 순서대로 작성합니다.

<!-- ANSWER:thread-03-flow:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-03-flow:end -->

## 학습 완료 확인

<!-- ANSWER:thread-03-checks:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-03-checks:end -->

## 실행 증거 기록

<!-- ANSWER:thread-03-execution:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-03-execution:end -->
