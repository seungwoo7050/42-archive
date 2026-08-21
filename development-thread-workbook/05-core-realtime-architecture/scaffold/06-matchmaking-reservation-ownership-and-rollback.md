# 매치메이킹 예약 소유권과 롤백

원문 Development Thread: `Matchmaking reservation ownership and rollback`

## 1. Thread 목표

- GameHub 내부 timer-backed queue에서 독립 `Matchmaker` state machine으로 queue/reservation ownership이 이동하는 과정을 추적합니다.
- closest-rating pairing, guest/registered pool 분리, six-second AI fallback, duplicate membership, leave/release 의미를 복원합니다.
- room 생성 중 부분 실패와 모든 terminal path가 reservation을 누락 없이 해제하는 rollback/cleanup 구조를 확인합니다.

### Source에서 확정된 significance

> The initial timer-backed queue works but leaves GameHub with multiple representations of availability. The later Matchmaker abstraction makes reservation state explicit; integration and cleanup commits then eliminate split ownership. The progression matters because stale reservations would permanently remove users or allow one user to occupy two matches.

### 직접 연결되는 Critical Invariants

> Queue and reservation membership have one owner and are released on every leave, disconnect, rollback, drain, abandonment, failure, and finalization path.

> The server is the sole authority for game rules, scores, phases, room membership, matchmaking, and persisted outcomes.

### 직접 연결되는 Major Engineering Difficulties

> Coordinating readiness, pause, disconnect, reconnect, replacement, forfeit, retry, and final cleanup across interacting state machines.

> Preserving domain correctness during database failure, tournament-start rollback, match-finalization retry, process drain, and deployment shutdown.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- queued, matched/reserved, duplicate, fallback-ready 상태는 어떤 자료구조와 반환형으로 표현됩니까?
- closest candidate 선택에서 rating window, pool kind, tie order, injected clock이 어떻게 사용됩니까?
- `leaveQueue`와 `release`는 왜 분리되며 잘못 사용하면 어떤 invariant가 깨집니까?
- asynchronous NPC lookup 전후 어떤 socket/room/drain 조건을 다시 검증합니까?
- GameHub에 남는 transport metadata와 Matchmaker가 소유하는 domain state는 각각 무엇입니까?
- room publication 도중 observer/send/snapshot failure가 발생하면 어떤 획득 자원을 역순으로 되돌립니까?

## 3. 완료 기준

- Matchmaker 상태 전이와 반환 outcome을 실제 타입 및 메서드로 그릴 수 있습니다.
- 동일 사용자가 queued/reserved/active room 중 둘 이상에 동시에 존재하지 않는 근거를 제시할 수 있습니다.
- normal match, AI fallback, leave, disconnect, drain, room creation failure, finalization/abandonment의 release 경로를 모두 기록할 수 있습니다.
- GameHub의 duplicate queue 표현이 제거되기 전후 ownership 차이를 설명할 수 있습니다.
- rollback test가 partial publication과 stale reservation을 어떻게 재현하는지 구분할 수 있습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `1122e6a4b901` | `feat(game): 대기 플레이어 NPC fallback 구성` | B | REALTIME | Introduces timed AI fallback with explicit timer cleanup. |
| 2 | `1ec8335b0e75` | `refactor(game): matchmaking player와 fallback 계약 정의` | A | REALTIME, REFACTOR | Defines queued, matched, duplicate, fallback, and release outcomes independently of sockets. |
| 3 | `a4f59a2e8192` | `refactor(game): rating 기반 closest-pair queue 구현` | A | REALTIME, REFACTOR | Implements deterministic compatible-pool, closest-rating pairing. |
| 4 | `7871e29278c2` | `refactor(game): AI fallback과 reservation lifecycle 구현` | A | REALTIME, REFACTOR | Separates queue cancellation from releasing an assigned match reservation. |
| 5 | `e53559ef3a11` | `refactor(game): Matchmaker queue reservation을 GameHub에 연결` | A | REALTIME, REFACTOR | Moves duplicate-user reservation and PvP selection behind Matchmaker. |
| 6 | `51f36aa50596` | `refactor(game): Matchmaker AI fallback를 GameHub에 연결` | A | REALTIME, OPERATIONS, RISK | Claims delayed fallback through the same state machine and revalidates asynchronous work. |
| 7 | `a23fc26a7f82` | `refactor(game): queue와 reservation cleanup 일원화` | S | REALTIME, ARCH, RISK | Removes duplicate queue ownership and centralizes every release path. |
| 8 | `b5bfeee0e23e` | `refactor(game): room 생성과 finalization cleanup 보장` | A | REALTIME, OBSERVABILITY, RISK | Rolls back partially published rooms and guarantees terminal removal. |
| 9 | `112228db8878` | `test(game): matchmaking lifecycle 검증` | A | REALTIME, RISK, TEST | Protects matchability after failure, abandonment, forfeit, and rollback. |

## 5. Commit별 학습 기록

### 5.1. `feat(game): 대기 플레이어 NPC fallback 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `1122e6a4b901` |
| Importance | B |
| Tags | REALTIME |
| 학습 깊이 | Thread 내 구현 역할을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Introduces timed AI fallback with explicit timer cleanup.
- Classification summary: Add a bounded waiting policy for the human matchmaking queue.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.

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
- 다음 Thread 관련 SHA: `1ec8335b0e75` — `refactor(game): matchmaking player와 fallback 계약 정의`

### 5.2. `refactor(game): matchmaking player와 fallback 계약 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `1ec8335b0e75` |
| Importance | A |
| Tags | REALTIME, REFACTOR |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Defines queued, matched, duplicate, fallback, and release outcomes independently of sockets.
- Classification summary: Define Matchmaker types and state transitions without binding them to WebSocket clients.

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
- 직전 Thread 관련 SHA: `1122e6a4b901` — `feat(game): 대기 플레이어 NPC fallback 구성`
- 다음 Thread 관련 SHA: `a4f59a2e8192` — `refactor(game): rating 기반 closest-pair queue 구현`

### 5.3. `refactor(game): rating 기반 closest-pair queue 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `a4f59a2e8192` |
| Importance | A |
| Tags | REALTIME, REFACTOR |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Implements deterministic compatible-pool, closest-rating pairing.
- Classification summary: Implement Matchmaker queue membership and deterministic closest-candidate selection.

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
- 직전 Thread 관련 SHA: `1ec8335b0e75` — `refactor(game): matchmaking player와 fallback 계약 정의`
- 다음 Thread 관련 SHA: `7871e29278c2` — `refactor(game): AI fallback과 reservation lifecycle 구현`

### 5.4. `refactor(game): AI fallback과 reservation lifecycle 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `7871e29278c2` |
| Importance | A |
| Tags | REALTIME, REFACTOR |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Separates queue cancellation from releasing an assigned match reservation.
- Classification summary: Implement fallback claiming and distinct leave/release transitions for queued and matched players.

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
- 직전 Thread 관련 SHA: `a4f59a2e8192` — `refactor(game): rating 기반 closest-pair queue 구현`
- 다음 Thread 관련 SHA: `e53559ef3a11` — `refactor(game): Matchmaker queue reservation을 GameHub에 연결`

### 5.5. `refactor(game): Matchmaker queue reservation을 GameHub에 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `e53559ef3a11` |
| Importance | A |
| Tags | REALTIME, REFACTOR |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Moves duplicate-user reservation and PvP selection behind Matchmaker.
- Classification summary: Integrate Matchmaker join outcomes with GameHub transport clients and room creation.

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
- 직전 Thread 관련 SHA: `7871e29278c2` — `refactor(game): AI fallback과 reservation lifecycle 구현`
- 다음 Thread 관련 SHA: `51f36aa50596` — `refactor(game): Matchmaker AI fallback를 GameHub에 연결`

### 5.6. `refactor(game): Matchmaker AI fallback를 GameHub에 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `51f36aa50596` |
| Importance | A |
| Tags | REALTIME, OPERATIONS, RISK |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Claims delayed fallback through the same state machine and revalidates asynchronous work.
- Classification summary: Route AI fallback deadlines and claims through Matchmaker while guarding async NPC lookup races.

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
- 직전 Thread 관련 SHA: `e53559ef3a11` — `refactor(game): Matchmaker queue reservation을 GameHub에 연결`
- 다음 Thread 관련 SHA: `a23fc26a7f82` — `refactor(game): queue와 reservation cleanup 일원화`

### 5.7. `refactor(game): queue와 reservation cleanup 일원화`

| 항목 | 값 |
| --- | --- |
| SHA | `a23fc26a7f82` |
| Importance | S |
| Tags | REALTIME, ARCH, RISK |
| 학습 깊이 | Architecture/invariant를 깊게 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Removes duplicate queue ownership and centralizes every release path.
- Classification summary: Make Matchmaker the sole domain owner and reduce GameHub state to transport/timer metadata.

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
- 직전 Thread 관련 SHA: `51f36aa50596` — `refactor(game): Matchmaker AI fallback를 GameHub에 연결`
- 다음 Thread 관련 SHA: `b5bfeee0e23e` — `refactor(game): room 생성과 finalization cleanup 보장`

### 5.8. `refactor(game): room 생성과 finalization cleanup 보장`

| 항목 | 값 |
| --- | --- |
| SHA | `b5bfeee0e23e` |
| Importance | A |
| Tags | REALTIME, OBSERVABILITY, RISK |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Rolls back partially published rooms and guarantees terminal removal.
- Classification summary: Treat room publication as an acquisition sequence with explicit rollback and terminal cleanup in `finally`.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- 측정 위치, label cardinality, threshold, time source와 측정 자체가 동작을 바꾸지 않는지 확인합니다.
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
- 직전 Thread 관련 SHA: `a23fc26a7f82` — `refactor(game): queue와 reservation cleanup 일원화`
- 다음 Thread 관련 SHA: `112228db8878` — `test(game): matchmaking lifecycle 검증`

### 5.9. `test(game): matchmaking lifecycle 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `112228db8878` |
| Importance | A |
| Tags | REALTIME, RISK, TEST |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Protects matchability after failure, abandonment, forfeit, and rollback.
- Classification summary: Add deterministic GameHub/Matchmaker lifecycle regressions including injected room-publication failure.

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
- 직전 Thread 관련 SHA: `b5bfeee0e23e` — `refactor(game): room 생성과 finalization cleanup 보장`
- 이 Thread의 최종 상태와 비교합니다.

## 6. Invariant ledger

| Invariant | 도입 SHA | 강화 SHA | 부족함이 드러난 SHA | 복구 fix | 고정 test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| Queue and reservation membership have one owner and are released on every leave, disconnect, rollback, drain, abandonment, failure, and finalization path. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| The server is the sole authority for game rules, scores, phases, room membership, matchmaking, and persisted outcomes. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| [작성] | [작성] | [작성] | [작성] |

## 8. Ownership / state / responsibility 변화

| 축 | 초기 owner/state | 중간 전환 | 최종 owner/state | cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| queued/matched status | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| transport/timer metadata | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| fallback deadline/claim | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| provisional room resources | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |

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
