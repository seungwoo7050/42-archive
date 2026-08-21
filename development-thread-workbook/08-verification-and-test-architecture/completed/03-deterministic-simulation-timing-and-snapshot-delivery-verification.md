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
#### 역사적 복원

simulation을 GameHub에서 분리했더라도 내부에서 전역 난수나 wall clock을 읽거나 이전 객체를 mutate하면 replay와 다중 실행 비교가 깨진다. 이 커밋은 구조 분리만으로는 보장되지 않는 결정성·불변성 조건을 실제 테스트로 고정한다.

동일 seed와 입력 스트림으로 AI command와 simulation state를 반복 생성하여 결과가 동일한지 비교한다. PRNG와 AI source에는 `Math.random`·삼각함수 기반 임의성이 들어오지 못하도록 source guard가 있고, delta는 기준 timestep에 맞게 scale되며 paddle은 경기장 범위에 clamp된다.

각 step 뒤 이전 state와 중첩 값이 그대로인지 확인해 caller가 과거 snapshot을 안전하게 보관할 수 있음을 검증한다. 1,000 tick 실행의 digest는 짧은 단위 사례가 놓칠 누적 차이를 잡는 장기 regression 역할을 한다.

이 테스트는 순수 simulation을 대상으로 하므로 socket scheduling이나 serialization 차이는 포함하지 않는다. 그 공백은 fixed-step, replay fixture, GameHub integration test에서 다뤄진다.

#### 이 커밋이 보장하는 것

- 같은 초기 상태·seed·입력·delta는 같은 결과를 만든다.
- step과 AI 계산은 입력 state를 변경하지 않는다.
- 기본 역학 경계와 장기 실행 결과가 회귀로 고정된다.

#### 이 커밋이 보장하지 않는 것

- 다른 JS 엔진·런타임 버전 사이의 영구 bit-for-bit 호환성을 단독으로 보장하지 않는다.
- GameHub timer drift, network delivery, DB persistence는 대상이 아니다.

#### 전후 관계

`0888e119036d`이 wall-clock을 bounded fixed-step work로 변환하는 규칙을 검증하고, `37a7b2e4611b`이 versioned replay fixture로 장기 호환성을 명시한다.

#### 증거 성격

- deterministic simulation / immutability / long-run regression
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
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
#### 역사적 복원

테스트는 실제 시간 대기 대신 제어 가능한 clock을 사용해 50ms 경계와 remainder를 정확히 만든다. 여러 짧은 elapsed가 누적되어 한 step이 되고, 긴 pause가 발생해도 한 callback에서 최대 5 step만 수행한다.

뒤로 간 clock은 음수 work를 만들지 않으며 stop 뒤에는 더 이상 callback이 실행되지 않는다. 따라서 wall-clock 이상과 event-loop stall이 simulation을 무한 catch-up 상태로 밀어 넣지 않는다.

#### 이 커밋이 보장하는 것

- 50ms fixed-step, remainder 보존, 250ms catch-up cap, timer cleanup을 고정한다.

#### 이 커밋이 보장하지 않는 것

- 운영 부하에서 실제 event-loop lag 수치를 측정하지 않는다.
- 여러 room의 스케줄러 topology는 별도 benchmark/통합 테스트 범위다.

#### 전후 관계

`4ef4beeb8611`의 pure deterministic step을 실제 시간과 연결할 때 생기는 보정 규칙을 보호한다.

#### 증거 성격

- fake-clock boundary testing
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
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
#### 역사적 복원

고주파 snapshot을 일반 queue에 쌓으면 느린 client 하나가 과거 상태를 끝없이 보유하고 메모리와 지연을 함께 키운다. 이 테스트는 snapshot을 reliable history가 아니라 replaceable latest value로 다루는 설계를 검증한다.

fake socket의 전송과 `bufferedAmount`를 제어해, 새 snapshot이 도착할 때 pending queue가 여러 개로 늘지 않고 가장 최신 값 하나로 대체되는지 확인한다. soft pressure에서는 50ms 뒤 다시 시도하되 5초 이상 지속되면 연결을 종료하고, hard pressure 1MiB 이상이면 즉시 종료한다.

drop callback과 close 횟수까지 검증해 observable side effect의 중복도 막는다. 하지만 이 초기 테스트와 구현은 outstanding send callback 자체를 congestion 신호로 해석했고, `d90f17fa765d`에서 그 가정이 잘못임이 드러난다.

#### 이 커밋이 보장하는 것

- snapshot backlog는 latest one으로 bounded된다.
- soft/hard congestion의 retry·termination 기준이 결정적으로 고정된다.
- drop/close side effect가 관찰 가능하고 중복되지 않는다.

#### 이 커밋이 보장하지 않는 것

- control event의 reliable delivery를 대신하지 않는다.
- send callback 지연이 실제 kernel/socket pressure와 동일하다는 초기 가정은 후속 fix에서 폐기된다.

#### 전후 관계

`d90f17fa765d` → `5cd54767858f`가 callback latency와 measurable `bufferedAmount` pressure를 분리해 이 invariant를 교정한다.

#### 증거 성격

- controlled backpressure primitive regression
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
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
#### 역사적 복원

단위 테스트 안에 직접 작성된 반복 실행은 결정성을 보여 주지만 입력 데이터와 기대 결과가 호환성 자산으로 분리되어 있지 않다. 이 커밋은 초기 상태, seed, 50ms timestep, 1,000 tick 입력 스트림, 기대 SHA-256을 `replay-v1.json`에 명시한다.

테스트는 fixture version을 확인한 뒤 encoded input을 tick별로 적용하고 final simulation state의 canonical digest를 계산한다. 따라서 알고리즘·상수·입력 해석 중 어느 하나가 바뀌면 version-1 replay 결과 차이가 명시적으로 드러난다.

fixture는 재현 가능한 compatibility evidence이지만, 실제 경기 패킷 캡처나 모든 가능한 물리 상태를 포괄하지는 않는다.

#### 이 커밋이 보장하는 것

- version-1 replay 입력과 최종 simulation digest의 장기 호환성을 고정한다.
- 변경이 의도적이면 fixture/version 갱신이 필요하다는 review 경계를 만든다.

#### 이 커밋이 보장하지 않는 것

- 브라우저 렌더링, socket cadence, persistence 결과를 검증하지 않는다.
- 한 fixture가 전체 상태 공간을 증명하지 않는다.

#### 전후 관계

`4ef4beeb8611`의 장기 digest를 독립 versioned artifact로 발전시킨다.

#### 증거 성격

- versioned deterministic replay regression
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
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
#### 역사적 복원

초기 구현은 `send` callback이 돌아오기 전의 상태를 in-flight congestion으로 보았다. 그러나 callback scheduling은 event-loop 지연이나 라이브러리 callback 시점의 영향을 받으며, 실제 socket send buffer가 비어 있어도 늦을 수 있다. 이 오판은 정상 client에게 snapshot을 불필요하게 drop하고 5초 후 연결을 종료할 수 있었다.

수정은 `sending` 상태를 제거하고 `bufferedAmount`를 유일한 transport pressure 신호로 사용한다. buffer가 정상 범위라면 callback이 아직 돌아오지 않았어도 새 snapshot을 보낸다. soft/hard pressure와 latest replacement 규칙은 유지되지만 measurable backlog가 있을 때만 작동한다.

교정된 invariant는 callback completion과 network congestion을 동일시하지 않는 것이다. callback은 notification일 뿐 flow-control ownership을 갖지 않는다.

#### 이 커밋이 보장하는 것

- 정상 `bufferedAmount`에서 callback 지연만으로 drop·close가 발생하지 않는다.
- 실제 measurable transport backlog에서만 latest-value/congestion 정책이 작동한다.

#### 이 커밋이 보장하지 않는 것

- `bufferedAmount`가 모든 네트워크 상태를 완벽히 예측한다는 보장은 아니다.
- OS·프록시 바깥의 지연 측정은 포함하지 않는다.

#### 전후 관계

`125aa113a01c`의 초기 가정을 교정하고 `5cd54767858f`가 delayed callback과 실제 pressure를 분리해 회귀를 막는다.

#### 증거 성격

- backpressure root-cause correction
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
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
#### 역사적 복원

fake socket은 send callback을 즉시 실행하지 않고 queue에 보관한다. 이 상태에서 `bufferedAmount`를 0으로 유지한 채 여러 snapshot을 보내 모두 전송되었음을 확인한다. 따라서 callback delay만으로 congestion branch가 실행되지 않는다.

별도 사례에서는 `bufferedAmount`를 soft threshold 위로 올려 최신 snapshot replacement와 drop 관찰을 요구한다. 두 원인을 독립적으로 조작하기 때문에 수정이 단순히 테스트 타이밍을 느슨하게 만든 것이 아니라 판단 신호를 바꿨음을 증명한다.

#### 이 커밋이 보장하는 것

- callback delay와 실제 buffered pressure가 별도 상태로 취급됨을 결정적으로 증명한다.
- healthy transport에서 `onDropped`가 호출되지 않는다.

#### 이 커밋이 보장하지 않는 것

- 실제 인터넷 경로의 latency나 browser별 `bufferedAmount` 구현 차이는 측정하지 않는다.

#### 전후 관계

`d90f17fa765d`의 corrected invariant를 deterministic regression으로 닫는다.

#### 증거 성격

- root-cause-specific regression test
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
<!-- ANSWER:5cd54767858f:end -->


## Thread-level invariant evolution

다음 표에서 불변식이 도입·확장·교정·검증된 SHA를 구분합니다.

<!-- ANSWER:thread-03-invariants:begin -->
### 복원 결과

| SHA | 변화 | 불변식 |
| --- | --- | --- |
| `4ef4beeb8611` | 도입 | 동일 state·seed·input·delta는 동일 결과를 만들며 입력 state를 mutate하지 않는다. |
| `0888e119036d` | 시간 경계 | monotonic elapsed는 50ms step과 remainder로 변환되고 한 callback catch-up은 250ms로 제한된다. |
| `125aa113a01c` | 전달 상한 | snapshot backlog는 latest one으로 bounded되고 soft/hard congestion에 retry/close 규칙이 있다. |
| `37a7b2e4611b` | 호환성 고정 | version-1 1,000-tick replay와 최종 SHA-256이 독립 fixture가 된다. |
| `d90f17fa765d` | 가정 교정 | outstanding callback은 congestion 증거가 아니며 `bufferedAmount`만 pressure 판단에 사용된다. |
| `5cd54767858f` | 회귀 보호 | callback delay와 실제 pressure가 독립적으로 조작되어 drop 여부가 검증된다. |

각 변화는 이전 커밋의 최종 상태를 다음 커밋이 단순 반복한 것이 아니라, 새 경계를 도입·확장·교정하거나 regression으로 보호한 시점을 나타냅니다.
<!-- ANSWER:thread-03-invariants:end -->

## Failure → Fix → Test 관계

구현 추가를 독립 기능으로 나열하지 말고, 이전 가정과 실제 실패 위험, 수정된 결정, 회귀 증거를 연결합니다.

<!-- ANSWER:thread-03-failure-relations:begin -->
### 복원 결과

| Failure / 이전 가정 | Fix / 결정 | Verification |
| --- | --- | --- |
| simulation이 전역 난수·mutable state에 의존할 위험 | seeded pure transition | `4ef4beeb8611`의 repeatability/immutability/digest |
| event-loop stall을 무제한 catch-up | 50ms accumulator + 5-step cap | `0888e119036d` fake-clock boundary |
| snapshot FIFO backlog | latest-value + soft/hard pressure | `125aa113a01c` controlled socket test |
| send callback 지연을 congestion으로 오판 | `d90f17fa765d` — `sending` 제거, measurable pressure만 사용 | `5cd54767858f` — delayed callbacks vs buffered pressure |
<!-- ANSWER:thread-03-failure-relations:end -->

## Ownership·state·responsibility 변화

자원과 상태를 누가 만들고, 보유하고, 이전하고, 정리하는지 커밋 순서에 따라 정리합니다.

<!-- ANSWER:thread-03-ownership:begin -->
### 복원 결과

| 대상 | 소유자 | 책임·수명 |
| --- | --- | --- |
| Game mechanics | `PongSimulation` | state transition, collision, score, phase와 결과 결정성을 소유한다. |
| AI randomness | seeded integer PRNG / `PongAi` | 같은 seed·rating에서 같은 command stream을 소유한다. |
| Wall-clock conversion | fixed-step scheduler | elapsed, remainder, catch-up cap, timer cleanup을 소유한다. |
| Compatibility evidence | `replay-v1.json` + replay test | versioned input stream과 기대 digest를 소유한다. |
| Snapshot pressure | `LatestSnapshotBuffer` | replaceable latest state, retry, drop/close와 measurable backlog를 소유한다. |
| Send callback | notification only | flow-control authority를 갖지 않는다. |
<!-- ANSWER:thread-03-ownership:end -->

## 최종 Thread 상태

최종 HEAD를 과거 커밋에 투영하지 말고, 위 SHA 순서에서 도달한 보장을 요약합니다.

<!-- ANSWER:thread-03-final-state:begin -->
### 최종 상태

- simulation은 transport·clock에서 분리된 pure deterministic transition으로 검증된다.
- wall-clock은 bounded 50ms work로 변환되며 장기 결과는 versioned replay digest로 보호된다.
- snapshot 전달은 latest-value로 bounded되고 실제 `bufferedAmount` pressure에서만 drop/close한다.
- callback scheduling 지연은 network congestion으로 취급되지 않는다.
<!-- ANSWER:thread-03-final-state:end -->

## 최종 architecture / execution flow

실제 caller→boundary→state transition→cleanup 흐름을 순서대로 작성합니다.

<!-- ANSWER:thread-03-flow:begin -->
### 최종 실행 흐름

1. monotonic clock에서 elapsed 수집
2. 50ms fixed step으로 최대 5회 simulation 실행
3. seeded AI/input으로 immutable next state 생성
4. versioned snapshot projection
5. `bufferedAmount`가 정상일 때 즉시 전송
6. soft pressure면 latest pending 하나로 대체·retry
7. 지속 soft/hard pressure면 관찰 후 연결 종료
<!-- ANSWER:thread-03-flow:end -->

## 학습 완료 확인

<!-- ANSWER:thread-03-checks:begin -->
### 완료 확인

- [x] 동일 seed만으로 결정성이 충분하지 않은 이유를 state mutation과 delta 관점에서 설명할 수 있다.
- [x] replay SHA-256이 protocol/network 전체를 증명하지 않는 이유를 설명할 수 있다.
- [x] latest snapshot drop이 데이터 손실 버그가 아니라 의도된 delivery policy인 조건을 설명할 수 있다.
- [x] `d90...` 이전/이후 pressure 판단식을 비교할 수 있다.

체크는 repository code inspection을 통해 설명이 문서에 작성되었음을 뜻합니다. 실제 repository test suite 실행 완료를 뜻하지 않습니다.
<!-- ANSWER:thread-03-checks:end -->

## 실행 증거 기록

<!-- ANSWER:thread-03-execution:begin -->
- Historical inspection: 각 참조 SHA의 GitHub commit diff와 변경 파일을 개별 조회했습니다.
- Repository test execution: 실행하지 않았습니다. 로컬 환경에서 지정 branch의 전체 checkout을 materialize하지 못해 pnpm, PostgreSQL, Playwright, k6, Toxiproxy 명령 결과를 만들 수 없었습니다.
- Runtime claims: 기록하지 않았습니다. 위의 `증거 성격`은 test 구현과 production code path에 대한 정적·역사적 검사입니다.
- Artifact validation: scaffold/completed 대응, fixed metadata, answer completion, SHA uniqueness, Markdown fence, ZIP 구조는 로컬 검증 스크립트로 검사했습니다.
<!-- ANSWER:thread-03-execution:end -->
