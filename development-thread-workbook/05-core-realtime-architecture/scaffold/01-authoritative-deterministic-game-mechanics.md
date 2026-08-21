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
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Introduces the first server-owned physics loop.
- Classification summary: Implement the authoritative simulation step inside `GameHub`.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- page, component, hook, reducer, query cache 중 실제 state owner와 teardown 시 stale update 방지 경로를 확인합니다.

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
- 이 commit의 parent와 비교합니다.
- 다음 Thread 관련 SHA: `2e4359f0625f` — `refactor(game): Pong simulation 상태와 초기화 분리`

### 5.2. `refactor(game): Pong simulation 상태와 초기화 분리`

| 항목 | 값 |
| --- | --- |
| SHA | `2e4359f0625f` |
| Importance | A |
| Tags | SIMULATION, REALTIME, REFACTOR |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Creates a transport-independent simulation state boundary.
- Classification summary: Extract simulation state, input types, initialization, and cloning from transport concerns.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- 기존 경로와 새 경로가 공존하는 migration 구간 및 최종 duplicate implementation 제거 여부를 확인합니다.

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
| 학습 깊이 | Architecture/invariant를 깊게 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Moves complete scoring and terminal mechanics into one deterministic transition.
- Classification summary: Complete the standalone deterministic state transition.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- 기존 경로와 새 경로가 공존하는 migration 구간 및 최종 duplicate implementation 제거 여부를 확인합니다.

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
- 직전 Thread 관련 SHA: `2e4359f0625f` — `refactor(game): Pong simulation 상태와 초기화 분리`
- 다음 Thread 관련 SHA: `4ef4beeb8611` — `test(game): 결정적 simulation 검증`

### 5.4. `test(game): 결정적 simulation 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `4ef4beeb8611` |
| Importance | A |
| Tags | SIMULATION, REALTIME, TEST |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Locks immutability, seed repeatability, and replay digest behavior.
- Classification summary: Add deterministic unit and regression tests for simulation and AI.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- 테스트가 주입하는 입력·시간·동시성·오류와 실제 production path를 구분해 기록합니다.
- 테스트가 증명하는 범위와 실제 process/network/database까지는 증명하지 않는 범위를 함께 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 boundary/decision | [파일·심볼·조건·관찰 결과 작성] |
| 상태 또는 ownership 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 주요 failure/edge path | [파일·심볼·조건·관찰 결과 작성] |
| 보장/비보장 | [파일·심볼·조건·관찰 결과 작성] |
| 다음 관련 commit 연결 | [파일·심볼·조건·관찰 결과 작성] |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | [작성] |
| 재현하는 failure/boundary | [작성] |
| test technique | [작성] |
| 통과하는 production path | [작성] |
| 증명하는 것 | [작성] |
| 증명하지 않는 것 | [작성] |
| 후속 회귀 방지 | [작성] |

비교 기준:
- 직전 Thread 관련 SHA: `4afec2071e7a` — `refactor(game): 득점과 충돌을 simulation에 통합`
- 다음 Thread 관련 SHA: `cf14c4052310` — `refactor(game): GameHub frame 계산을 simulation에 위임`

### 5.5. `refactor(game): GameHub frame 계산을 simulation에 위임`

| 항목 | 값 |
| --- | --- |
| SHA | `cf14c4052310` |
| Importance | S |
| Tags | SIMULATION, ARCH, REALTIME |
| 학습 깊이 | Architecture/invariant를 깊게 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Makes GameHub consume the standalone authoritative transition.
- Classification summary: Replace GameHub's frame calculation with `PongSimulation.step` while preserving the realtime projection.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- 기존 경로와 새 경로가 공존하는 migration 구간 및 최종 duplicate implementation 제거 여부를 확인합니다.

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
- 직전 Thread 관련 SHA: `4ef4beeb8611` — `test(game): 결정적 simulation 검증`
- 다음 Thread 관련 SHA: `2cef070188ac` — `refactor(game): GameHub의 중복 물리 계산 제거`

### 5.6. `refactor(game): GameHub의 중복 물리 계산 제거`

| 항목 | 값 |
| --- | --- |
| SHA | `2cef070188ac` |
| Importance | B |
| Tags | SIMULATION, REALTIME |
| 학습 깊이 | Thread 내 구현 역할을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Deletes the competing legacy rules after migration.
- Classification summary: Remove the obsolete GameHub physics and AI helpers after the production handoff.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- 기존 경로와 새 경로가 공존하는 migration 구간 및 최종 duplicate implementation 제거 여부를 확인합니다.

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
- 직전 Thread 관련 SHA: `cf14c4052310` — `refactor(game): GameHub frame 계산을 simulation에 위임`
- 다음 Thread 관련 SHA: `37a7b2e4611b` — `test(game): versioned match replay fixture 추가`

### 5.7. `test(game): versioned match replay fixture 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `37a7b2e4611b` |
| Importance | A |
| Tags | SIMULATION, REALTIME, TEST |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Turns long-run deterministic behavior into a versioned compatibility fixture.
- Classification summary: Add an explicit version-one replay input fixture and expected final digest.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- 테스트가 주입하는 입력·시간·동시성·오류와 실제 production path를 구분해 기록합니다.
- 테스트가 증명하는 범위와 실제 process/network/database까지는 증명하지 않는 범위를 함께 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 boundary/decision | [파일·심볼·조건·관찰 결과 작성] |
| 상태 또는 ownership 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 주요 failure/edge path | [파일·심볼·조건·관찰 결과 작성] |
| 보장/비보장 | [파일·심볼·조건·관찰 결과 작성] |
| 다음 관련 commit 연결 | [파일·심볼·조건·관찰 결과 작성] |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | [작성] |
| 재현하는 failure/boundary | [작성] |
| test technique | [작성] |
| 통과하는 production path | [작성] |
| 증명하는 것 | [작성] |
| 증명하지 않는 것 | [작성] |
| 후속 회귀 방지 | [작성] |

비교 기준:
- 직전 Thread 관련 SHA: `2cef070188ac` — `refactor(game): GameHub의 중복 물리 계산 제거`
- 이 Thread의 최종 상태와 비교합니다.

## 6. Invariant ledger

| Invariant | 도입 SHA | 강화 SHA | 부족함이 드러난 SHA | 복구 fix | 고정 test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| The server is the sole authority for game rules, scores, phases, room membership, matchmaking, and persisted outcomes. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| [작성] | [작성] | [작성] | [작성] |

## 8. Ownership / state / responsibility 변화

| 축 | 초기 owner/state | 중간 전환 | 최종 owner/state | cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| physics/scoring/terminal rules | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| simulation state | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| timing/input/projection | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| deterministic evidence | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |

## 9. Thread 최종 상태

- 최종 authoritative owner: [작성]
- 최종 상태/invariant: [작성]
- 남아 있는 의도적 제한 또는 비보장: [작성]
- 후속 Thread가 의존하는 contract: [작성]
- 대표 코드 근거: [SHA·파일·심볼 작성]

## 10. 최종 architecture 또는 execution flow 정리

```text
[입력/이벤트]
    ↓
[소유 boundary와 validation]
    ↓
[상태 전이 또는 side effect]
    ↓
[출력/관측/cleanup]
```

## 11. 학습 완료 자가 점검

- [ ] Commit map의 모든 SHA를 원문 순서대로 확인했습니다.
- [ ] 각 commit의 subject, importance, tags를 변경하지 않았습니다.
- [ ] final HEAD 코드를 과거 SHA에 소급하지 않았습니다.
- [ ] S/A/B/C 깊이를 구분해 근거를 남겼습니다.
- [ ] fix와 test를 실제 production path에 연결했습니다.
- [ ] 실행하지 않은 명령 결과를 작성하지 않았습니다.
- [ ] Thread 최종 flow를 실제 코드로 설명할 수 있습니다.
