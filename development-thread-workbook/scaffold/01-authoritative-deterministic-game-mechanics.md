# 서버 권위형 결정적 게임 메커니즘

원문 Development Thread: `Authoritative and deterministic game mechanics`

## 1. Thread 목표

- `GameHub` 내부 물리 계산에서 출발해 `PongSimulation.step`이 유일한 규칙 소유자가 되는 과정을 복원합니다.
- 점수, 충돌, 가속, 종료 결과가 transport·socket·timer와 분리된 결정적 상태 전이임을 해당 SHA의 코드와 테스트로 증명합니다.
- 마이그레이션 뒤 남아 있던 중복 물리 구현이 실제로 제거되고 장기 replay fixture가 호환성 계약을 고정하는지 확인합니다.

### Source에서 확정된 significance

> The project begins with server-owned gameplay, then extracts the mechanics into a pure, testable simulation
> and finally removes the duplicate implementation. The thread matters because authority is not merely a
> deployment choice: one deterministic state transition becomes the source of scores, collisions, timing, and
> replay compatibility.

### 직접 연결되는 Critical Invariants

> The server is the sole authority for game rules, scores, phases, room membership, matchmaking, and persisted
> outcomes.

### 직접 연결되는 Major Engineering Difficulties

> Separating deterministic simulation from connection orchestration without changing the observable realtime
> protocol.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 각 SHA에서 게임 규칙의 실제 소유자는 `GameHub`와 `PongSimulation` 중 어디입니까?
- simulation 입력, 내부 상태, 반환 상태 사이에 aliasing이나 in-place mutation이 남아 있습니까?
- paddle 충돌, 득점, serve reset, 속도 증가, 시간 제한, 승자 결정은 어떤 순서로 적용됩니까?
- wire snapshot을 유지하면서 mechanics ownership만 이동한 연결 지점은 어디입니까?
- 결정성은 단일 함수 테스트가 아니라 seed, AI, nested state, 1,000-tick replay까지 어떻게 고정됩니까?
- legacy helper가 제거된 뒤 `GameHub`에 남은 책임은 무엇입니까?

## 3. 완료 기준

- 입력 수집 → `PongSimulation.step` → 상태 저장 → snapshot projection → broadcast/finish 흐름을 코드 근거와 함께 그릴 수 있습니다.
- 충돌·득점·가속·종료 규칙을 해당 SHA의 실제 조건식과 상태 갱신 순서로 설명할 수 있습니다.
- immutability와 deterministic replay가 각각 무엇을 검증하고 무엇을 검증하지 않는지 구분할 수 있습니다.
- 마이그레이션 전후 `GameHub`와 simulation의 책임 표를 완성하고 중복 규칙이 남지 않았음을 확인할 수 있습니다.
- final HEAD가 아니라 각 commit 시점의 코드와 직전 관련 SHA를 근거로 설명할 수 있습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `9e3664f5de48` | `feat(game): 서버 주도 퐁 물리 갱신` | A | SIMULATION, REALTIME, WEB | Introduces the first server-owned physics loop. |
| 2 | `2e4359f0625f` | `refactor(game): Pong simulation 상태와 초기화 분리` | A | SIMULATION, REALTIME, REFACTOR | Creates a transport-independent simulation state boundary. |
| 3 | `4afec2071e7a` | `refactor(game): 득점과 충돌을 simulation에 통합` | S | SIMULATION, CORE, ARCH | Moves complete scoring and terminal mechanics into one deterministic transition. |
| 4 | `4ef4beeb8611` | `test(game): 결정적 simulation 검증` | A | SIMULATION, REALTIME, TEST | Locks immutability, seed repeatability, and replay digest behavior. |
| 5 | `cf14c4052310` | `refactor(game): GameHub frame 계산을 simulation에 위임` | S | SIMULATION, ARCH, REALTIME | Makes GameHub consume the standalone authoritative transition. |
| 6 | `2cef070188ac` | `refactor(game): GameHub의 중복 물리 계산 제거` | B | SIMULATION, REALTIME | Deletes the competing legacy rules after migration. |
| 7 | `37a7b2e4611b` | `test(game): versioned match replay fixture 추가` | A | SIMULATION, REALTIME, TEST | Turns long-run deterministic behavior into a versioned compatibility fixture. |

## 5. Commit별 학습 기록

### 5.1. `feat(game): 서버 주도 퐁 물리 갱신`

| 항목 | 값 |
| --- | --- |
| SHA | `9e3664f5de48` |
| Importance | A |
| Tags | SIMULATION, REALTIME, WEB |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Introduces the first server-owned physics loop.
- Classification summary: Implement the authoritative simulation step inside `GameHub`.

원문 구현 의도·상태 변화:

> Implement the authoritative simulation step inside `GameHub`. Each tick advances server time and tick
> number, applies bounded paddle movement, derives the AI paddle direction from the ball position, advances
> the ball, reflects it at field and paddle boundaries, increments scores when it leaves the court, resets the
> serve, and broadcasts the resulting snapshot.

원문 경계·failure handling·후속 범위:

> Paddle contact changes both horizontal speed and vertical angle according to the impact offset, producing
> controllable rallies without moving collision authority into the browser. The commit defines the
> deterministic state transition but does not yet schedule it; readiness and timer lifecycle are connected in
> the following change.

#### 해당 SHA에서 확인할 실제 코드

- `GameHub`에서 한 tick/frame을 처리하는 함수와 그 caller를 찾고, tick 번호와 server time이 갱신되는 순서를 기록합니다.
- paddle direction 적용, arena clamp, AI direction 계산, ball 이동, wall/paddle reflection, score 증가, serve reset의 실제 분기 순서를 표시합니다.
- paddle contact offset이 horizontal/vertical velocity에 반영되는 계산과 boundary 비교식을 코드로 인용합니다.
- 상태 mutation 뒤 어떤 snapshot이 어떤 broadcast 함수로 전달되는지 확인합니다.
- 이 SHA에는 scheduler/readiness 연결이 아직 없다는 source 범위를 코드에서 구분하고, loop를 호출할 실제 경로가 존재하는지 기록합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

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
- 이 commit의 parent에서 동일 책임을 담당하던 코드를 찾아 기록합니다.
- 다음 Thread 관련 SHA: `2e4359f0625f` — `refactor(game): Pong simulation 상태와 초기화 분리`

### 5.2. `refactor(game): Pong simulation 상태와 초기화 분리`

| 항목 | 값 |
| --- | --- |
| SHA | `2e4359f0625f` |
| Importance | A |
| Tags | SIMULATION, REALTIME, REFACTOR |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Creates a transport-independent simulation state boundary.
- Classification summary: Introduce a dedicated representation for authoritative Pong simulation state and inputs.

원문 구현 의도·상태 변화:

> Introduce a dedicated representation for authoritative Pong simulation state and inputs. Tick, phase,
> scores, paddle positions and directions, ball state, and eventual winner are grouped behind
> `PongSimulation`, with one canonical initializer based on the shared arena constants.

원문 경계·failure handling·후속 범위:

> The state-cloning helper prepares the simulation to advance from a read-only input state into a distinct
> result rather than mutating a room snapshot in place. At this stage the commit establishes the extraction
> boundary and initial-state contract; later commits can move rules into it incrementally without coupling
> them to WebSocket clients or room lifecycle data.

#### 해당 SHA에서 확인할 실제 코드

- `PongSimulation` state/input 타입, canonical initializer, clone helper의 실제 선언을 찾습니다.
- tick, phase, scores, paddle position/direction, ball, eventual winner 중 simulation state에 포함된 필드를 표로 옮깁니다.
- initializer가 shared arena constants를 소비하는 지점과 room snapshot 초기화와의 중복/연결을 비교합니다.
- clone이 nested paddle/ball object까지 독립 복사하는지 aliasing 근거를 확인합니다.
- 직전 `9e3664f5de48`의 GameHub 물리 코드 중 이 SHA에서 이동한 것과 아직 남은 것을 구분합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

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
- 직전 Thread 관련 SHA: `9e3664f5de48` — `feat(game): 서버 주도 퐁 물리 갱신`
- 다음 Thread 관련 SHA: `4afec2071e7a` — `refactor(game): 득점과 충돌을 simulation에 통합`

### 5.3. `refactor(game): 득점과 충돌을 simulation에 통합`

| 항목 | 값 |
| --- | --- |
| SHA | `4afec2071e7a` |
| Importance | S |
| Tags | SIMULATION, CORE, ARCH |
| 학습 깊이 | Architecture/invariant 중심으로 직전 상태, 결정, 핵심 전이, ownership, failure, 후속 검증까지 완전히 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Moves complete scoring and terminal mechanics into one deterministic transition.
- Classification summary: Move paddle collision, scoring, serve reset, acceleration, and match termination into the standalone simulation.

원문 구현 의도·상태 변화:

> Move paddle collision, scoring, serve reset, acceleration, and match termination into the standalone
> simulation. A paddle hit is accepted only when the ball overlaps the paddle and is approaching that side;
> the contact offset controls vertical velocity while horizontal velocity reverses and increases. Missed balls
> increment the opposite score and reset from center toward the conceding side.

원문 경계·failure handling·후속 범위:

> Speed growth preserves the velocity direction and is capped, while elapsed ticks impose a minimum
> progression so variable step sizes do not stall acceleration. The simulation finishes at the winning score
> or the match-duration limit, resolves timeout ties consistently to the left side under the current rule,
> records the winner, and clears paddle movement. This makes core game outcomes properties of one
> transport-independent state transition.

#### Source의 Most Important Commit 정의

##### Problem

> The authoritative physics existed inside GameHub, coupling transport orchestration to collision, scoring,
> acceleration, and termination rules.

##### Decision

> Place all outcome-producing mechanics inside `PongSimulation.step`, operating from explicit state and input
> with bounded speed and terminal rules.

##### Why it mattered

> It made a match outcome reproducible without sockets, timers, clients, or persistence and supplied the
> foundation for deterministic replay testing.

##### What changed

> Paddle collisions, scoring, serve reset, speed progression, winning-score and timeout termination, winner
> selection, and input clearing became one simulation transition.

##### Project understanding

> It explains where the game rules live and why the finished server can test and replay them independently of
> realtime transport.

#### 해당 SHA에서 확인할 실제 코드

- `PongSimulation.step`의 입력 검증부터 반환까지 전체 control flow를 따라가며 상태 전이 순서를 작성합니다.
- ball이 paddle과 겹치고 해당 side를 향할 때만 hit로 인정하는 조건식을 확인합니다.
- contact offset, horizontal reversal/increase, vertical adjustment, speed cap이 적용되는 순서와 상수를 기록합니다.
- miss 처리, 득점 side, center reset, 다음 serve 방향을 실제 코드로 확인합니다.
- winning score와 match-duration limit의 terminal branch, timeout tie에서 left winner가 되는 현재 규칙, winner 저장, paddle direction clear를 확인합니다.
- WebSocket, room, timer, repository 의존성이 step 내부에 없는지 import와 parameter 기준으로 확인합니다.
- 직전 simulation boundary와 비교해 outcome-producing rule이 모두 이 transition으로 이동했는지 ledger를 작성합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 이 commit 직전 실제 ownership/state | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제와 기존 설계의 부족함 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 decision과 대안 배제 근거 | [파일·심볼·조건·관찰 결과 작성] |
| 입력 → 상태 전이 → 출력/side effect | [파일·심볼·조건·관찰 결과 작성] |
| ownership/lifetime/cleanup 변화 | [파일·심볼·조건·관찰 결과 작성] |
| failure scenario와 복구/rollback | [파일·심볼·조건·관찰 결과 작성] |
| 이 commit이 보장하는 것 | [파일·심볼·조건·관찰 결과 작성] |
| 아직 보장하지 않는 것 | [파일·심볼·조건·관찰 결과 작성] |
| 후속 fix/test와 연결 | [파일·심볼·조건·관찰 결과 작성] |

비교 기준:
- 직전 Thread 관련 SHA: `2e4359f0625f` — `refactor(game): Pong simulation 상태와 초기화 분리`
- 다음 Thread 관련 SHA: `4ef4beeb8611` — `test(game): 결정적 simulation 검증`

### 5.4. `test(game): 결정적 simulation 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `4ef4beeb8611` |
| Importance | A |
| Tags | SIMULATION, REALTIME, TEST |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Locks immutability, seed repeatability, and replay digest behavior.
- Classification summary: Establish deterministic and immutability guarantees for the extracted simulation and AI.

원문 구현 의도·상태 변화:

> Establish deterministic and immutability guarantees for the extracted simulation and AI. Equal seeds must
> produce equal integer streams, the AI source must not fall back to floating-point pseudo-random helpers,
> equal AI instances must emit the same commands and snapshots, and finished games must produce no movement.

원문 경계·failure handling·후속 범위:

> Simulation tests require repeated steps from the same state to be equal without mutating or sharing nested
> state, verify delta-scaled movement and arena clamping, cover winning-score termination and invalid deltas,
> and replay one thousand ticks twice to the same SHA-256 digest. The replay hash checks the combined
> simulation and AI snapshot, protecting the full deterministic transition chain rather than isolated outputs.

#### 해당 SHA에서 확인할 실제 코드

- 동일 seed의 integer stream과 동일 AI command/snapshot을 비교하는 fixture와 assertion을 찾습니다.
- source가 금지한 floating-point pseudo-random fallback을 테스트가 어떤 방식으로 탐지하는지 확인합니다.
- 같은 input state로 step을 반복했을 때 equality, 원본 불변, nested reference 비공유를 각각 어떻게 검증하는지 구분합니다.
- delta-scaled movement, arena clamp, winning-score termination, invalid delta의 test case를 production branch와 연결합니다.
- 1,000 tick replay digest가 simulation과 AI의 어떤 snapshot을 hash하는지 확인합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | 동일 state/input/seed는 동일 결과를 만들고 입력 state를 mutate하거나 nested object를 공유하지 않습니다. |
| 재현하는 failure/boundary | global/random drift, in-place mutation, invalid delta, boundary error, finished-state movement, long-run replay divergence. |
| test technique | table/fixture assertions, reference inequality, deterministic seed comparison, 1,000-tick SHA-256 digest. |
| 통과하는 production path | `PongSimulation.step`, deterministic AI/PRNG, state snapshot/hash path. |
| 증명하는 것 | 순수 transition과 AI가 지정된 입력에서 반복 가능하고 mutation-free임을 증명합니다. |
| 증명하지 않는 것 | GameHub scheduling, network transport, persistence, browser rendering의 결정성은 직접 증명하지 않습니다. |
| test 성격 | Deterministic regression + compatibility-oriented replay test. |
| 후속 회귀 방지 설명 | [학습자 작성 — 어떤 변경이 이 테스트를 깨뜨려야 하는지 기록] |

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
- 직전 Thread 관련 SHA: `4afec2071e7a` — `refactor(game): 득점과 충돌을 simulation에 통합`
- 다음 Thread 관련 SHA: `cf14c4052310` — `refactor(game): GameHub frame 계산을 simulation에 위임`

### 5.5. `refactor(game): GameHub frame 계산을 simulation에 위임`

| 항목 | 값 |
| --- | --- |
| SHA | `cf14c4052310` |
| Importance | S |
| Tags | SIMULATION, ARCH, REALTIME |
| 학습 깊이 | Architecture/invariant 중심으로 직전 상태, 결정, 핵심 전이, ownership, failure, 후속 검증까지 완전히 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Makes GameHub consume the standalone authoritative transition.
- Classification summary: Replace `GameHub`'s in-place frame physics with calls to `PongSimulation.step` at an explicit 50 ms timestep.

원문 구현 의도·상태 변화:

> Replace `GameHub`'s in-place frame physics with calls to `PongSimulation.step` at an explicit 50 ms
> timestep. The hub supplies current player or AI directions, stores the returned authoritative state,
> projects it into the existing wire snapshot, broadcasts that projection, and finishes the room when the
> simulation reports a winner.

원문 경계·failure handling·후속 범위:

> This moves paddle movement, ball motion, collisions, scoring, acceleration, and terminal rules behind one
> deterministic transition boundary. `GameHub` remains responsible for scheduling, input collection, transport
> timestamps, broadcasting, and persistence, while the simulation owns game mechanics. The snapshot-sync
> function preserves the existing client protocol during that ownership change.

#### Source의 Most Important Commit 정의

##### Problem

> A tested standalone simulation does not establish authority while GameHub still runs its own physics
> implementation.

##### Decision

> Make each fixed frame call `PongSimulation.step`; keep only input collection, scheduling, projection,
> broadcast, persistence, and room lifecycle in the hub.

##### Why it mattered

> This is the decisive responsibility transfer that eliminates two potential sources of gameplay truth while
> preserving the existing wire snapshot.

##### What changed

> GameHub now supplies human or AI directions, stores the returned state, projects it to protocol form,
> broadcasts it, and reacts to the simulation winner.

##### Project understanding

> It explains the final architecture’s most important separation: mechanics are deterministic domain logic,
> while GameHub is an orchestration boundary.

#### 해당 SHA에서 확인할 실제 코드

- `GameHub` frame/tick 함수에서 `PongSimulation.step`을 호출하는 정확한 위치와 50 ms timestep 전달을 확인합니다.
- human/AI direction을 수집하는 코드, returned simulation state 저장, wire snapshot projection, broadcast, winner 처리 순서를 기록합니다.
- snapshot sync/projection helper가 protocol shape를 유지하면서 어떤 field를 복사하는지 확인합니다.
- scheduler/input/transport timestamp/broadcast/persistence는 hub에 남고 mechanics는 simulation으로 이동했음을 실제 함수 목록으로 증명합니다.
- 같은 frame 안에서 legacy in-place physics가 추가로 실행되지 않는지 caller와 helper를 추적합니다.
- 직전 `4afec2071e7a`와 비교해 standalone transition이 실제 runtime authority가 된 지점을 표시합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 이 commit 직전 실제 ownership/state | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제와 기존 설계의 부족함 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 decision과 대안 배제 근거 | [파일·심볼·조건·관찰 결과 작성] |
| 입력 → 상태 전이 → 출력/side effect | [파일·심볼·조건·관찰 결과 작성] |
| ownership/lifetime/cleanup 변화 | [파일·심볼·조건·관찰 결과 작성] |
| failure scenario와 복구/rollback | [파일·심볼·조건·관찰 결과 작성] |
| 이 commit이 보장하는 것 | [파일·심볼·조건·관찰 결과 작성] |
| 아직 보장하지 않는 것 | [파일·심볼·조건·관찰 결과 작성] |
| 후속 fix/test와 연결 | [파일·심볼·조건·관찰 결과 작성] |

비교 기준:
- 직전 Thread 관련 SHA: `4ef4beeb8611` — `test(game): 결정적 simulation 검증`
- 다음 Thread 관련 SHA: `2cef070188ac` — `refactor(game): GameHub의 중복 물리 계산 제거`

### 5.6. `refactor(game): GameHub의 중복 물리 계산 제거`

| 항목 | 값 |
| --- | --- |
| SHA | `2cef070188ac` |
| Importance | B |
| Tags | SIMULATION, REALTIME |
| 학습 깊이 | Thread 흐름에서 맡는 구현 역할과 필요한 상태 변화를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Deletes the competing legacy rules after migration.
- Classification summary: Delete the legacy physics, AI-profile, prediction, pseudo-random, collision, serve-reset, and acceleration helpers after the hub has been migrated to `PongSimulation` and `PongAi`.

원문 구현 의도·상태 변화:

> Delete the legacy physics, AI-profile, prediction, pseudo-random, collision, serve-reset, and acceleration
> helpers after the hub has been migrated to `PongSimulation` and `PongAi`. The associated constants, imports,
> and obsolete `aiTargetY` room field are removed as well.

원문 경계·failure handling·후속 범위:

> This completes the responsibility transfer: there is no second rule implementation in `GameHub` that could
> diverge from the tested simulation or reintroduce the former sine-based randomness. The hub is left with
> orchestration and snapshot projection rather than dormant duplicate mechanics.

#### 해당 SHA에서 확인할 실제 코드

- 삭제된 legacy physics, AI profile/prediction, pseudo-random, collision, serve reset, acceleration helper와 상수를 diff에서 분류합니다.
- obsolete `aiTargetY` room field와 관련 import가 제거됐는지 확인합니다.
- 삭제 뒤 `GameHub`에 남은 orchestration/snapshot projection 함수만 목록화합니다.
- 동일 gameplay rule이 다른 helper나 inline branch로 남아 있지 않은지 해당 SHA 전체 검색 결과를 기록합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| Thread에서 맡는 역할 | [파일·심볼·조건·관찰 결과 작성] |
| 확인한 핵심 코드와 상태 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 후속 commit에 남긴 조건 | [파일·심볼·조건·관찰 결과 작성] |

비교 기준:
- 직전 Thread 관련 SHA: `cf14c4052310` — `refactor(game): GameHub frame 계산을 simulation에 위임`
- 다음 Thread 관련 SHA: `37a7b2e4611b` — `test(game): versioned match replay fixture 추가`

### 5.7. `test(game): versioned match replay fixture 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `37a7b2e4611b` |
| Importance | A |
| Tags | SIMULATION, REALTIME, TEST |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Turns long-run deterministic behavior into a versioned compatibility fixture.
- Classification summary: Adds a versioned, fully specified 1,000-tick replay containing the initial state, fixed timestep, encoded input stream, and expected SHA-256 hash of the final simulation state.

원문 구현 의도·상태 변화:

> Adds a versioned, fully specified 1,000-tick replay containing the initial state, fixed timestep, encoded
> input stream, and expected SHA-256 hash of the final simulation state. Replaying every recorded input
> through PongSimulation.step must reproduce the hash exactly. This turns determinism into a durable
> compatibility contract: changes to physics, serialization, or timestep semantics must intentionally update
> the replay version rather than silently altering authoritative outcomes.

#### 해당 SHA에서 확인할 실제 코드

- versioned replay fixture의 version, initial state, fixed timestep, encoded input stream, expected SHA-256 필드를 확인합니다.
- fixture replay runner가 모든 input을 `PongSimulation.step`에 전달하는 순서와 final state serialization/hash 방식을 추적합니다.
- 1,000 tick 실행이 외부 clock, socket, random global state 없이 재현되는지 확인합니다.
- physics/serialization/timestep 변경 시 fixture version과 expected hash를 어떤 기준으로 갱신해야 하는지 현재 test contract에서 추론해 기록합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | versioned replay input을 1,000 tick 적용한 authoritative final state hash는 명시적 변경 전까지 고정됩니다. |
| 재현하는 failure/boundary | physics, serialization, timestep semantics의 비의도적 drift. |
| test technique | 완전 지정 fixture와 expected SHA-256 hash 재생. |
| 통과하는 production path | fixture decode → input stream iteration → `PongSimulation.step` → final serialization/hash. |
| 증명하는 것 | 장기 transition compatibility를 한 결과 digest로 고정합니다. |
| 증명하지 않는 것 | 실시간 scheduler jitter, socket loss, rendering interpolation은 검증하지 않습니다. |
| test 성격 | Versioned deterministic compatibility regression. |
| 후속 회귀 방지 설명 | [학습자 작성 — 어떤 변경이 이 테스트를 깨뜨려야 하는지 기록] |

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
- 직전 Thread 관련 SHA: `2cef070188ac` — `refactor(game): GameHub의 중복 물리 계산 제거`
- 이 Thread의 최종 상태와 비교해 이후 보완 여부를 기록합니다.

## 6. Invariant ledger

Source에서 확정된 invariant를 아래 시점별로 연결합니다. 새 invariant를 추측해 확정하지 않습니다.

| Invariant | 처음 도입/관찰한 SHA | 강화한 SHA | 부족함이 드러난 SHA | 복구한 fix | 고정한 regression test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| The server is the sole authority for game rules, scores, phases, room membership, matchmaking, and persisted outcomes. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |

추가 기록:

- invariant가 동일한 문장으로 유지되었는지, 더 강한 조건으로 바뀌었는지 구분합니다.
- implementation detail과 invariant를 혼동하지 않습니다.
- source가 명시하지 않은 규칙은 “관찰한 가설”로 표시하고 코드 근거로만 남깁니다.

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| GameHub 안에 physics와 transport가 결합됨 | `2e4359f0625f` boundary 추출 → `4afec2071e7a` outcome rule 통합 | `4ef4beeb8611` deterministic/immutability 검증 | `cf14c4052310` runtime authority 전환 |
| 이전 physics helper가 남아 두 규칙이 공존할 위험 | `2cef070188ac` legacy helper 제거 | `37a7b2e4611b` versioned replay fixture | single mechanics owner와 장기 compatibility |

학습자 보완 기록:

- 실제 failure를 주입하거나 재현하는 test fixture를 찾아 위 표의 각 행과 연결합니다.
- fix가 symptom만 가리는지, ownership/invariant를 바꾸는지 코드 근거로 판별합니다.
- broad integration과 deterministic regression을 별도 표시합니다.

## 8. Ownership / state / responsibility 변화

| 축 | 초기 SHA의 owner/state | 중간 전환 | Thread 최종 owner/state | 해제·cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| physics/mechanics ownership | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| simulation state ownership and cloning | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| snapshot projection responsibility | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| AI input generation versus mechanics | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| terminal outcome detection | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |

## 9. Thread 최종 상태

다음 항목은 최종 HEAD를 보고 채우지 말고, 이 Thread의 마지막 commit까지 순서대로 복원한 결과로 작성합니다.

- 최종 authoritative owner: [학습자 작성]
- 최종 상태/invariant: [학습자 작성]
- 남아 있는 의도적 제한 또는 비보장: [학습자 작성]
- 후속 Thread가 의존하는 contract: [학습자 작성]
- 대표 코드 근거: [SHA, 파일, symbol]

## 10. 최종 architecture 또는 execution flow 정리

- 최종 mechanics owner와 외부 의존성 경계를 한 문단으로 설명합니다.
- 한 frame의 입력부터 terminal result 감지까지 실제 함수 호출 순서를 작성합니다.
- 결정성 계약을 깨뜨릴 수 있는 변경 유형과 replay fixture가 포착하는 범위를 기록합니다.

```text
[입력/이벤트]
    ↓
[소유 boundary와 validation]
    ↓
[상태 전이 또는 side effect]
    ↓
[출력/관측/cleanup]
```

위 흐름의 각 화살표에 실제 SHA와 symbol을 붙입니다.

## 11. 학습 완료 자가 점검

- [ ] Commit map의 모든 SHA를 원문 순서대로 확인했습니다.
- [ ] 각 commit의 subject, importance, tags를 변경하지 않았습니다.
- [ ] S/A/B 깊이를 구분해 코드 근거를 남겼습니다.
- [ ] final HEAD의 구현을 과거 SHA에 소급하지 않았습니다.
- [ ] 핵심 상태 필드, caller/callee, ownership, failure branch, cleanup을 실제 코드로 확인했습니다.
- [ ] Fix를 기존 가정 → failure/risk → root cause → decision → code → regression 순서로 연결했습니다.
- [ ] Test commit에서 production invariant, failure, technique, path, 증명/비증명 범위를 구분했습니다.
- [ ] Thread 최종 execution flow를 별도 프로젝트 재학습 없이 설명할 수 있습니다.
