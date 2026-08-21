# 서버 권위형 결정적 게임 메커니즘

원문 Development Thread: `Authoritative and deterministic game mechanics`

## 1. Thread 목표

- `GameHub` 내부 물리 계산에서 출발해 `PongSimulation.step`이 유일한 규칙 소유자가 되는 과정을 복원합니다.
- 점수, 충돌, 가속, 종료 결과가 transport·socket·timer와 분리된 결정적 상태 전이임을 해당 SHA의 코드와 테스트로 증명합니다.
- 마이그레이션 뒤 남아 있던 중복 물리 구현이 실제로 제거되고 장기 replay fixture가 호환성 계약을 고정하는지 확인합니다.

### Source에서 확정된 significance

> The project begins with server-owned gameplay, then extracts the mechanics into a pure, testable simulation and finally removes the duplicate implementation. The thread matters because authority is not merely a deployment choice: one deterministic state transition becomes the source of scores, collisions, timing, and replay compatibility.

### 직접 연결되는 Critical Invariants

> The server is the sole authority for game rules, scores, phases, room membership, matchmaking, and persisted outcomes.

### 직접 연결되는 Major Engineering Difficulties

> Separating deterministic simulation from connection orchestration without changing the observable realtime protocol.

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

> 검토 방식: 지정 브랜치에 속한 exact SHA의 diff와 해당 시점 파일을 GitHub에서 확인했습니다. 로컬 실행 환경은 GitHub clone이 차단되어 테스트 명령은 실행하지 않았으며, 아래 테스트 결과 설명은 test implementation 검토에 한정합니다.

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
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Introduces the first server-owned physics loop.
- Classification summary: Implement the authoritative simulation step inside `GameHub`.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | parent에서는 서버가 room과 snapshot을 보유하지만 한 frame의 물리 규칙을 수행하는 `tick` 구현이 없습니다. |
| 핵심 boundary/decision | `apps/api/src/gameHub.ts`의 `tick`, `collidePaddle`, `resetBall`이 `room.snapshot`을 직접 변경합니다. phase가 `playing`일 때만 tick/serverTime을 올리고 paddle·AI·ball·score를 순서대로 갱신합니다. |
| 상태 또는 ownership 변화 | 이 SHA의 규칙 owner는 `GameHub`입니다. browser는 direction만 보내며 충돌·득점·serve reset 결과는 서버 snapshot에서 나옵니다. |
| 주요 failure/edge path | arena clamp와 wall reflection이 위치 이탈을 제한하고, court 바깥으로 나간 ball은 score 증가 뒤 center serve로 재설정됩니다. 다만 diff에는 `tick`을 호출하는 scheduler가 없어 실행 연결은 아직 보장하지 않습니다. |
| 보장/비보장 | 서버 내부에 하나의 authoritative physics transition이 생겼다는 사실만 보장합니다. timer lifecycle, 독립 simulation, 장기 replay는 보장하지 않습니다. |
| 다음 관련 commit 연결 | `2e4359...`가 state 초기화와 clone을 transport-independent `PongSimulation`으로 옮길 토대를 만듭니다. |

비교 기준:
- 이 commit의 parent에서 동일 책임을 담당하던 코드를 비교했습니다.
- 다음 Thread 관련 SHA: `2e4359f0625f` — `refactor(game): Pong simulation 상태와 초기화 분리`

### 5.2. `refactor(game): Pong simulation 상태와 초기화 분리`

| 항목 | 값 |
| --- | --- |
| SHA | `2e4359f0625f` |
| Importance | A |
| Tags | SIMULATION, REALTIME, REFACTOR |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Creates a transport-independent simulation state boundary.
- Classification summary: Extract simulation state, input types, initialization, and cloning from transport concerns.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 게임 상태는 `GameHub`의 wire snapshot과 결합되어 있었고 독립적으로 초기화·복제할 경계가 없었습니다. |
| 핵심 boundary/decision | 새 `apps/api/src/game/pongSimulation.ts`에 `PongSimulationState`, `PongSimulationInputs`, `initialState`, `cloneState`를 추가합니다. |
| 상태 또는 ownership 변화 | state shape와 초기화 책임이 simulation module로 이동하지만 이 commit 자체에는 완전한 `step` mechanics가 아직 없습니다. |
| 주요 failure/edge path | nested paddles와 ball을 별도 객체로 복제해 caller state aliasing의 기초 위험을 제거합니다. 이 시점에는 충돌·득점 규칙 중복이 여전히 남습니다. |
| 보장/비보장 | transport 없이 simulation state를 만들고 복제할 수 있습니다. GameHub가 이를 사용하거나 rule owner가 바뀌었다고까지 보장하지 않습니다. |
| 다음 관련 commit 연결 | `4afec2...`가 득점·충돌·가속·종료를 `PongSimulation.step`에 통합합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `9e3664f5de48` — `feat(game): 서버 주도 퐁 물리 갱신`
- 다음 Thread 관련 SHA: `4afec2071e7a` — `refactor(game): 득점과 충돌을 simulation에 통합`

### 5.3. `refactor(game): 득점과 충돌을 simulation에 통합`

| 항목 | 값 |
| --- | --- |
| SHA | `4afec2071e7a` |
| Importance | S |
| Tags | SIMULATION, CORE, ARCH |
| 학습 깊이 | Architecture/invariant 중심으로 직전 상태, 결정, 핵심 전이, ownership, failure, 후속 검증까지 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Moves complete scoring and terminal mechanics into one deterministic transition.
- Classification summary: Complete the standalone deterministic state transition.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | state boundary는 생겼지만 실제 physics는 여전히 GameHub와 simulation 사이에 분산될 수 있는 상태였습니다. |
| 핵심 boundary/decision | `PongSimulation.step(state, inputs, deltaMs)`가 clone된 state에 paddle 이동, wall/paddle collision, scoring, serve reset, acceleration, terminal 판정을 순서대로 적용합니다. |
| 상태 또는 ownership 변화 | 게임 규칙과 terminal result 계산이 pure simulation transition의 책임이 됩니다. input/state는 caller가 소유하고 반환 state는 새 객체입니다. |
| 주요 failure/edge path | invalid delta는 거부하고 paddle을 arena에 clamp합니다. 속도는 tick당 0.015씩 증가하되 18에서 제한하며, 45초 tick limit 또는 `WINNING_SCORE`에서 종료합니다. 시간 제한 동점은 left를 선택합니다. |
| 보장/비보장 | 동일 state/input/delta는 동일 next state를 만들고 rule ordering이 한 함수에 모입니다. GameHub가 아직 이 함수를 실제 frame에 사용한다는 보장은 다음 commit 전에는 없습니다. |
| 다음 관련 commit 연결 | `4ef4be...`가 immutability·delta scaling·seed repeatability·1,000-step digest를 검증하고, `cf14c4...`가 runtime caller를 전환합니다. |

#### Architecture / invariant 복원

| 축 | 복원 결과 |
| --- | --- |
| 문제 | 충돌·득점·가속·종료가 transport orchestration과 함께 있으면 단위 검증과 replay compatibility를 독립적으로 보장할 수 없습니다. |
| 실패 위험 | GameHub와 별도 simulation이 서로 다른 규칙을 계산하거나 caller state를 in-place 변경하면 서버 내부에서도 결과가 갈라집니다. |
| 핵심 결정 | 모든 mechanics를 하나의 clone-first `PongSimulation.step`에 집중합니다. |
| 구현 경로 | 입력 방향 적용 → paddle clamp → ball 적분 → wall/paddle 반사 → score/reset → acceleration → winning/time-limit 판정. |
| 수명주기·상태 | simulation state는 호출 전 state와 반환 state로 구분되고 socket·timer·repository resource를 소유하지 않습니다. |
| 실패 처리 | 비정상 delta는 즉시 `RangeError`; 위치·속도는 명시적 bounds; terminal에서는 양쪽 direction을 0으로 고정합니다. |
| 후속 검증 | `4ef4be...` deterministic unit test와 `37a7b2...` versioned replay fixture가 후속 보호를 제공합니다. |
| Thread 전체 의미 | 이후 GameHub는 rule engine이 아니라 input/AI 수집, scheduling, projection, persistence를 조정하는 계층이 될 수 있습니다. |

비교 기준:
- 직전 Thread 관련 SHA: `2e4359f0625f` — `refactor(game): Pong simulation 상태와 초기화 분리`
- 다음 Thread 관련 SHA: `4ef4beeb8611` — `test(game): 결정적 simulation 검증`

### 5.4. `test(game): 결정적 simulation 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `4ef4beeb8611` |
| Importance | A |
| Tags | SIMULATION, REALTIME, TEST |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Locks immutability, seed repeatability, and replay digest behavior.
- Classification summary: Add deterministic unit and regression tests for simulation and AI.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | `PongSimulation.step`의 설계 의도는 코드에 존재하지만 동일 입력 반복, source mutation, 장기 drift를 자동 검출할 증거가 없었습니다. |
| 핵심 boundary/decision | `pongSimulation.test.ts`와 `pongAi.test.ts`가 동일 입력 deep equality, 입력 불변성, 25/50ms scaling, bounds, win, invalid delta, seeded PRNG/AI, 1,000-tick SHA-256을 고정합니다. |
| 상태 또는 ownership 변화 | production state owner는 바뀌지 않으며 test fixture가 deterministic contract의 회귀 감시자 역할을 맡습니다. |
| 주요 failure/edge path | `Math.random`·`Math.sin` 사용을 source 검사로 막고, 잘못된 delta와 bounds를 명시적으로 재현합니다. |
| 보장/비보장 | pure mechanics와 AI가 같은 seed/state에서 반복 가능하고 source state를 변경하지 않음을 증명합니다. GameHub·network·scheduler·DB 통합은 증명하지 않습니다. |
| 다음 관련 commit 연결 | `cf14c4...`에서 GameHub의 frame 계산이 실제로 검증된 simulation을 호출합니다. |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | simulation은 입력을 변경하지 않고 동일한 state/input/seed에서 동일한 결과를 냅니다. |
| 재현하는 failure/boundary | delta scaling, paddle bounds, terminal score, invalid delta, 1,000-step drift, 비결정적 난수 사용. |
| test technique | Vitest deterministic unit/regression, seeded PRNG, final-state SHA-256, source-pattern assertion. |
| 통과하는 production path | `PongSimulation.step` 및 `PongAi`를 transport 없이 직접 호출합니다. |
| 증명하는 것 | rule function과 AI의 반복 가능성·불변성·주요 bounds를 증명합니다. |
| 증명하지 않는 것 | GameHub scheduling, socket ordering, persistence 또는 multi-process determinism은 증명하지 않습니다. |
| test 성격 | Deterministic unit and long-run digest regression. |
| 후속 회귀 방지 설명 | state aliasing, physics ordering, constants, PRNG 구현이 바뀌어 같은 fixture의 결과가 달라지면 실패해야 합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `4afec2071e7a` — `refactor(game): 득점과 충돌을 simulation에 통합`
- 다음 Thread 관련 SHA: `cf14c4052310` — `refactor(game): GameHub frame 계산을 simulation에 위임`

### 5.5. `refactor(game): GameHub frame 계산을 simulation에 위임`

| 항목 | 값 |
| --- | --- |
| SHA | `cf14c4052310` |
| Importance | S |
| Tags | SIMULATION, ARCH, REALTIME |
| 학습 깊이 | Architecture/invariant 중심으로 직전 상태, 결정, 핵심 전이, ownership, failure, 후속 검증까지 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Makes GameHub consume the standalone authoritative transition.
- Classification summary: Replace GameHub's frame calculation with `PongSimulation.step` while preserving the realtime projection.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | GameHub와 simulation에 모두 mechanics가 있어 standalone transition이 production authority라고 말할 수 없었습니다. |
| 핵심 boundary/decision | `GameHub.tick`이 AI intent를 계산한 뒤 `PongSimulation.step`에 현재 state와 50ms 입력을 넘기고, 반환 state를 저장한 뒤 `syncSnapshot`으로 wire model을 투영합니다. |
| 상태 또는 ownership 변화 | mechanics는 simulation, scheduling/input/AI orchestration과 snapshot broadcast/finalization은 GameHub가 소유합니다. |
| 주요 failure/edge path | terminal 결과는 simulation output에서만 판정해 `finishRoom`으로 연결합니다. snapshot projection은 tick·score·paddle·ball을 복사해 기존 protocol을 유지합니다. |
| 보장/비보장 | production frame이 standalone rule engine을 사용하며 wire shape를 유지합니다. legacy helper가 실제로 삭제되었다는 보장은 `2cef...`에서 완성됩니다. |
| 다음 관련 commit 연결 | `2cef07...`가 GameHub의 경쟁 physics helper를 제거하고 single-owner invariant를 완성합니다. |

#### Architecture / invariant 복원

| 축 | 복원 결과 |
| --- | --- |
| 문제 | 순수 simulation이 존재해도 production caller가 기존 코드를 사용하면 authoritative owner가 둘입니다. |
| 실패 위험 | test가 통과한 mechanics와 실제 socket clients가 받는 결과가 달라질 수 있습니다. |
| 핵심 결정 | GameHub의 frame path를 `PongSimulation.step` 하나로 교체하고 wire projection은 별도 `syncSnapshot`으로 유지합니다. |
| 구현 경로 | scheduler → `GameHub.tick` → AI/input 작성 → `PongSimulation.step` → `room.simulation` 저장 → `syncSnapshot` → broadcast/finish. |
| 수명주기·상태 | GameHub는 room·timer·client를 계속 소유하고 simulation은 resource-free state transition만 수행합니다. |
| 실패 처리 | terminal output에서만 finalization을 시작하며, 기존 realtime event shape는 projection으로 보존합니다. |
| 후속 검증 | `2cef...` 중복 삭제와 `37a7b2...` replay fixture가 이 ownership 이동을 고정합니다. |
| Thread 전체 의미 | 서버 권위는 socket 계층이 아니라 production에서 실제 호출되는 단일 deterministic transition으로 구체화됩니다. |

비교 기준:
- 직전 Thread 관련 SHA: `4ef4beeb8611` — `test(game): 결정적 simulation 검증`
- 다음 Thread 관련 SHA: `2cef070188ac` — `refactor(game): GameHub의 중복 물리 계산 제거`

### 5.6. `refactor(game): GameHub의 중복 물리 계산 제거`

| 항목 | 값 |
| --- | --- |
| SHA | `2cef070188ac` |
| Importance | B |
| Tags | SIMULATION, REALTIME |
| 학습 깊이 | Thread 흐름에서 맡는 구현 역할과 필요한 상태 변화를 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Deletes the competing legacy rules after migration.
- Classification summary: Remove the obsolete GameHub physics and AI helpers after the production handoff.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | production call은 simulation으로 전환됐지만 old constants와 collision/reset/AI helper가 파일에 남아 향후 재사용될 가능성이 있었습니다. |
| 핵심 boundary/decision | `gameHub.ts`에서 legacy physics/AI constants와 `clamp`, reset, collision, acceleration 및 예측 helper를 삭제합니다. |
| 상태 또는 ownership 변화 | GameHub에는 scheduler, input/AI orchestration, `syncSnapshot`, room lifecycle만 남고 mechanics 구현은 simulation에만 존재합니다. |
| 주요 failure/edge path | 동작 추가가 아니라 competing implementation 제거입니다. 삭제 뒤에도 protocol projection은 유지됩니다. |
| 보장/비보장 | 해당 SHA에서 중복 rule implementation이 남지 않습니다. 장기 버전 호환성은 아직 fixture가 필요합니다. |
| 다음 관련 commit 연결 | `37a7b2...`가 1,000-tick versioned replay를 추가해 이후 mechanics 변경을 검출합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `cf14c4052310` — `refactor(game): GameHub frame 계산을 simulation에 위임`
- 다음 Thread 관련 SHA: `37a7b2e4611b` — `test(game): versioned match replay fixture 추가`

### 5.7. `test(game): versioned match replay fixture 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `37a7b2e4611b` |
| Importance | A |
| Tags | SIMULATION, REALTIME, TEST |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Turns long-run deterministic behavior into a versioned compatibility fixture.
- Classification summary: Add an explicit version-one replay input fixture and expected final digest.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | inline deterministic tests는 존재하지만 입력 series와 결과 digest를 외부 versioned artifact로 고정하지 않았습니다. |
| 핵심 boundary/decision | `fixtures/replay-v1.json`에 version, seed, 50ms, 1,000개 입력, initial state, expected final SHA-256을 저장하고 test가 순서대로 `PongSimulation.step`을 재생합니다. |
| 상태 또는 ownership 변화 | fixture가 replay compatibility의 고정 입력을 소유하고 production simulation이 이를 해석합니다. |
| 주요 failure/edge path | fixture shape/length/encoded direction을 먼저 검증해 불완전 fixture가 우연히 통과하지 않게 합니다. |
| 보장/비보장 | 동일 version-one fixture의 final state digest가 `f0a9...3f61`과 일치합니다. network timing, scheduler lag, persistence 결과는 포함하지 않습니다. |
| 다음 관련 commit 연결 | Thread 최종 상태는 simulation이 mechanics의 유일한 owner이고 GameHub가 이를 projection하는 형태입니다. |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | version-one replay input은 구현·환경과 무관하게 동일 final simulation state를 만듭니다. |
| 재현하는 failure/boundary | 1,000 fixed steps 동안 작은 physics·AI·serialization 변화가 누적되는 장기 drift. |
| test technique | Versioned JSON fixture + deterministic replay + final-state SHA-256 regression. |
| 통과하는 production path | fixture decode → `PongSimulation.step` 1,000회 → canonical state hash 비교. |
| 증명하는 것 | 해당 fixture에 대한 mechanics 장기 호환성과 deterministic replay를 증명합니다. |
| 증명하지 않는 것 | 모든 possible input이나 actual WebSocket frame scheduling을 증명하지 않습니다. |
| test 성격 | Versioned deterministic replay compatibility test. |
| 후속 회귀 방지 설명 | physics ordering·constants·state serialization이 의도 없이 바뀌면 digest가 달라져 실패해야 합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `2cef070188ac` — `refactor(game): GameHub의 중복 물리 계산 제거`
- 이 Thread의 마지막 상태와 비교해 최종 보장을 정리했습니다.

## 6. Invariant ledger

Source에서 확정된 invariant를 commit 시점별로 연결했습니다. `해당 없음`은 해당 Thread 안에서 별도 fix/test가 없음을 뜻합니다.

| Invariant | 처음 도입/관찰한 SHA | 강화한 SHA | 부족함이 드러난 SHA | 복구한 fix | 고정한 regression test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| The server is the sole authority for game rules, scores, phases, room membership, matchmaking, and persisted outcomes. | `9e3664f5de48` | `4afec2071e7a`, `cf14c4052310` | `cf14c4052310` 전까지 GameHub와 simulation의 rule ownership이 겹침 | `2cef070188ac` 중복 삭제 | `4ef4beeb8611`, `37a7b2e4611b` | `gameHub.ts::tick/syncSnapshot`, `game/pongSimulation.ts::step` |

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| GameHub가 mechanics와 transport를 함께 소유 | `2e4359...` state 경계 → `4afec2...` complete step → `cf14c4...` production handoff | `4ef4be...` deterministic tests | 규칙과 resource orchestration 분리 |
| migration 뒤 legacy physics가 남음 | `2cef07...` constants/helper 삭제 | source inspection + `37a7b2...` replay | competing rule implementation 없음 |
| 짧은 unit case만으로 장기 drift를 놓침 | `37a7b2...` versioned 1,000-step fixture | final SHA-256 | version-one replay compatibility |

## 8. Ownership / state / responsibility 변화

| 축 | 초기 SHA의 owner/state | 중간 전환 | Thread 최종 owner/state | 해제·cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| physics/scoring/terminal rules | `9e3664...` GameHub | `4afec2...` PongSimulation에 완전 구현 | `cf14c4...` 이후 `PongSimulation.step` | resource 없음; 반환 state를 GameHub가 보유 | `pongSimulation.ts::step` |
| simulation state | wire snapshot 내부 | `2e4359...` 독립 state/clone | `room.simulation` | room 제거 시 GameHub가 함께 폐기 | `gameHub.ts`, `pongSimulation.ts` |
| timing/input/projection | GameHub | mechanics만 분리 | GameHub | scheduler/room lifecycle가 정리 | `gameHub.ts::tick/syncSnapshot` |
| deterministic evidence | 없음 | `4ef4be...` unit/digest | `37a7b2...` versioned fixture | test fixture가 repository에 고정 | `replayFixture.test.ts`, `replay-v1.json` |

## 9. Thread 최종 상태

- 최종 authoritative owner: `PongSimulation.step`이 mechanics와 terminal result의 유일한 owner이며 `GameHub`는 frame orchestration과 projection을 소유합니다.
- 최종 상태/invariant: 동일 state/input/delta/seed는 동일 next state를 만들고 browser는 score·collision을 결정하지 않습니다.
- 남아 있는 의도적 제한 또는 비보장: replay fixture는 하나의 versioned input series이며 network scheduling·persistence·multi-process를 검증하지 않습니다.
- 후속 Thread가 의존하는 contract: GameHub와 protocol 계층은 simulation state를 authoritative snapshot으로 투영하고 terminal output만 finalization에 넘깁니다.
- 대표 코드 근거: `4afec2071e7a apps/api/src/game/pongSimulation.ts::PongSimulation.step`, `cf14c4052310 apps/api/src/gameHub.ts::tick/syncSnapshot`, `37a7b2e4611b replayFixture.test.ts`

## 10. 최종 architecture 또는 execution flow 정리

```text
[WebSocket direction / AI intent]
    ↓  cf14c4052310 GameHub.tick
[PongSimulation.step: clone → move → collide → score/reset → accelerate → terminal]
    ↓  4afec2071e7a
[room.simulation 저장]
    ↓  GameHub.syncSnapshot
[versioned snapshot broadcast 또는 finishRoom]
    ↓
[37a7b2e4611b replay fixture로 장기 결과 검증]
```

- `PongSimulation`은 socket, timer, repository를 소유하지 않습니다.
- `GameHub`는 입력·AI·room lifecycle을 조정하지만 physics 식을 다시 구현하지 않습니다.

## 11. 학습 완료 자가 점검

- [x] Commit map의 모든 SHA를 원문 순서대로 확인했습니다.
- [x] 각 commit의 subject, importance, tags를 변경하지 않았습니다.
- [x] S/A/B 깊이를 구분해 코드 근거를 남겼습니다.
- [x] final HEAD의 구현을 과거 SHA에 소급하지 않았습니다.
- [x] 핵심 상태 필드, caller/callee, ownership, failure branch, cleanup을 실제 코드로 확인했습니다.
- [x] Fix를 기존 가정 → failure/risk → root cause → decision → code → regression 순서로 연결했습니다.
- [x] Test commit에서 production invariant, failure, technique, path, 증명/비증명 범위를 구분했습니다.
- [x] Thread 최종 execution flow를 별도 프로젝트 재학습 없이 설명할 수 있습니다.
