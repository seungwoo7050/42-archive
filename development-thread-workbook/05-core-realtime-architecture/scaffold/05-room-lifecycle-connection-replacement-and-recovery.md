# 경기방 수명주기·연결 교체·복구

원문 Development Thread: `Room lifecycle, connection replacement, and recovery`

## 1. Thread 목표

- readiness, play, pause, disconnect, reconnect, expiry, finish를 explicit room-session state machine으로 복원합니다.
- 동일 사용자 새 socket이 기존 transport를 교체하면서 room side와 authority를 보존하는 atomic handoff를 추적합니다.
- 실제 disconnect와 same-user replacement를 구분하고 15초 reservation, forfeit/abandonment, browser fresh-ticket retry가 협력하는 방식을 확인합니다.

### Source에서 확정된 significance

> Socket loss and socket replacement are treated as lifecycle events, not immediate match termination or fresh matchmaking. The state machine, user-indexed connection map, reserved side, deadline, and browser retry policy cooperate to preserve one room and one player authority across transient transport failure.

### 직접 연결되는 Critical Invariants

> One user has one authoritative realtime connection, and reconnect replacement transfers ownership without creating a second match or losing the reserved room side.

> Timers, schedulers, heartbeat handles, retry work, snapshot buffers, and database resources have explicit single-owner cleanup.

### 직접 연결되는 Major Engineering Difficulties

> Coordinating readiness, pause, disconnect, reconnect, replacement, forfeit, retry, and final cleanup across interacting state machines.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 어떤 transition이 합법이며 idempotent이고, 어떤 transition이 무시되거나 terminal 결과를 만듭니까?
- snapshot phase는 state machine을 정의합니까, 아니면 accepted state를 반영합니까?
- same-user replacement에서 이전 heartbeat/buffer/membership/room side는 어떤 순서로 이전·정리됩니까?
- 실제 socket loss에서 disconnected-side reservation과 reconnect deadline의 소유자는 누구입니까?
- 한쪽/양쪽 disconnect expiry가 persisted forfeit와 non-persisted abandonment로 갈리는 조건은 무엇입니까?
- 브라우저 reconnect는 새 ticket을 쓰면서 왜 원래 queue/AI intent를 재전송하지 않습니까?

## 3. 완료 기준

- RoomSession의 상태와 transition 표를 실제 메서드 조건으로 완성할 수 있습니다.
- replacement, recoverable disconnect, expired disconnect 세 경로의 client/room/timer/scheduler 변화를 비교할 수 있습니다.
- displaced socket의 stale message가 새 room을 만들거나 현재 room을 조작하지 못하는 근거를 제시할 수 있습니다.
- 15초 경계의 reconnect와 expiry 결과를 deterministic test로 설명할 수 있습니다.
- browser reducer와 socket client가 recovery 동안 matchmaking을 막는 이유를 설명할 수 있습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `aa5d6a338690` | `refactor(game): 게임 방 상태 전이 모델링` | S | REALTIME, ARCH, RISK | Defines legal readiness, pause, reconnect, expiry, and finish transitions. |
| 2 | `8f64dfc117f3` | `feat(game): 게임 방 상태를 RoomSession에 연결` | A | SIMULATION, REALTIME | Makes GameHub lifecycle changes subordinate to the state machine. |
| 3 | `a06d1705bbc9` | `feat(game): 사용자별 active connection 교체` | S | REALTIME, ARCH, RISK | Enforces one current transport and transfers room ownership atomically. |
| 4 | `c98d4b1e8b43` | `feat(game): 예약된 room connection 복구` | A | SIMULATION, REALTIME | Reattaches a returning identity only to an explicit reserved side. |
| 5 | `e593b1dd9fcd` | `feat(game): reconnect 예약 만료와 room 정리` | A | SIMULATION, REALTIME, RISK | Turns disconnect into a bounded reservation, forfeit, or non-persisted abandonment. |
| 6 | `113e39acc85c` | `test(game): reconnect 복구 동작 검증` | A | REALTIME, PERSISTENCE, RISK | Verifies replacement, deadline recovery, one finalization, and stale-socket rejection. |
| 7 | `4f5199097284` | `fix(web): 중단된 game reconnect 복구` | A | AUTH, REALTIME, WEB | Makes the browser request fresh tickets without replaying matchmaking intent. |

## 5. Commit별 학습 기록

### 5.1. `refactor(game): 게임 방 상태 전이 모델링`

| 항목 | 값 |
| --- | --- |
| SHA | `aa5d6a338690` |
| Importance | S |
| Tags | REALTIME, ARCH, RISK |
| 학습 깊이 | Architecture/invariant를 깊게 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Defines legal readiness, pause, reconnect, expiry, and finish transitions.
- Classification summary: Introduce an explicit room-session state machine for readiness, play, pause, reconnection, and completion.

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
- 이 commit의 parent와 비교합니다.
- 다음 Thread 관련 SHA: `8f64dfc117f3` — `feat(game): 게임 방 상태를 RoomSession에 연결`

### 5.2. `feat(game): 게임 방 상태를 RoomSession에 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `8f64dfc117f3` |
| Importance | A |
| Tags | SIMULATION, REALTIME |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Makes GameHub lifecycle changes subordinate to the state machine.
- Classification summary: Integrate RoomSession decisions with room snapshots and scheduler start/stop.

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
- 직전 Thread 관련 SHA: `aa5d6a338690` — `refactor(game): 게임 방 상태 전이 모델링`
- 다음 Thread 관련 SHA: `a06d1705bbc9` — `feat(game): 사용자별 active connection 교체`

### 5.3. `feat(game): 사용자별 active connection 교체`

| 항목 | 값 |
| --- | --- |
| SHA | `a06d1705bbc9` |
| Importance | S |
| Tags | REALTIME, ARCH, RISK |
| 학습 깊이 | Architecture/invariant를 깊게 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Enforces one current transport and transfers room ownership atomically.
- Classification summary: Add user-indexed connection authority and replace an existing socket without treating it as a match disconnect.

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
- 직전 Thread 관련 SHA: `8f64dfc117f3` — `feat(game): 게임 방 상태를 RoomSession에 연결`
- 다음 Thread 관련 SHA: `c98d4b1e8b43` — `feat(game): 예약된 room connection 복구`

### 5.4. `feat(game): 예약된 room connection 복구`

| 항목 | 값 |
| --- | --- |
| SHA | `c98d4b1e8b43` |
| Importance | A |
| Tags | SIMULATION, REALTIME |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Reattaches a returning identity only to an explicit reserved side.
- Classification summary: Recover a disconnected player into the existing room reservation instead of matchmaking again.

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
- 직전 Thread 관련 SHA: `a06d1705bbc9` — `feat(game): 사용자별 active connection 교체`
- 다음 Thread 관련 SHA: `e593b1dd9fcd` — `feat(game): reconnect 예약 만료와 room 정리`

### 5.5. `feat(game): reconnect 예약 만료와 room 정리`

| 항목 | 값 |
| --- | --- |
| SHA | `e593b1dd9fcd` |
| Importance | A |
| Tags | SIMULATION, REALTIME, RISK |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Turns disconnect into a bounded reservation, forfeit, or non-persisted abandonment.
- Classification summary: Own reconnect deadlines and terminal cleanup for one- and two-sided socket loss.

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
- 직전 Thread 관련 SHA: `c98d4b1e8b43` — `feat(game): 예약된 room connection 복구`
- 다음 Thread 관련 SHA: `113e39acc85c` — `test(game): reconnect 복구 동작 검증`

### 5.6. `test(game): reconnect 복구 동작 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `113e39acc85c` |
| Importance | A |
| Tags | REALTIME, PERSISTENCE, RISK |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Verifies replacement, deadline recovery, one finalization, and stale-socket rejection.
- Classification summary: Add fake-timer GameHub lifecycle regressions around replacement and the exact reconnect boundary.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
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
- 직전 Thread 관련 SHA: `e593b1dd9fcd` — `feat(game): reconnect 예약 만료와 room 정리`
- 다음 Thread 관련 SHA: `4f5199097284` — `fix(web): 중단된 game reconnect 복구`

### 5.7. `fix(web): 중단된 game reconnect 복구`

| 항목 | 값 |
| --- | --- |
| SHA | `4f5199097284` |
| Importance | A |
| Tags | AUTH, REALTIME, WEB |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Makes the browser request fresh tickets without replaying matchmaking intent.
- Classification summary: Reconnect the browser transport within the room reservation window using a fresh one-time ticket.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- page, component, hook, reducer, query cache 중 실제 state owner와 teardown 시 stale update 방지 경로를 확인합니다.
- 수정 전 가정 → 실제 실패 또는 위험 → root cause → 수정된 invariant를 parent와 이 SHA에서 비교합니다.
- 후속 regression test가 같은 실패를 어떤 fixture 또는 failure injection으로 고정하는지 연결합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 boundary/decision | [파일·심볼·조건·관찰 결과 작성] |
| 상태 또는 ownership 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 주요 failure/edge path | [파일·심볼·조건·관찰 결과 작성] |
| 보장/비보장 | [파일·심볼·조건·관찰 결과 작성] |
| 다음 관련 commit 연결 | [파일·심볼·조건·관찰 결과 작성] |

#### Fix 연결 골격

- 기존 가정: [작성]
- 실제 실패 또는 위험: [작성]
- Root cause: [작성]
- 수정된 invariant: [작성]
- 실제 수정 코드: [작성]
- Regression 연결: [작성]

비교 기준:
- 직전 Thread 관련 SHA: `113e39acc85c` — `test(game): reconnect 복구 동작 검증`
- 이 Thread의 최종 상태와 비교합니다.

## 6. Invariant ledger

| Invariant | 도입 SHA | 강화 SHA | 부족함이 드러난 SHA | 복구 fix | 고정 test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| One user has one authoritative realtime connection, and reconnect replacement transfers ownership without creating a second match or losing the reserved room side. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| Timers, schedulers, heartbeat handles, retry work, snapshot buffers, and database resources have explicit single-owner cleanup. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| [작성] | [작성] | [작성] | [작성] |

## 8. Ownership / state / responsibility 변화

| 축 | 초기 owner/state | 중간 전환 | 최종 owner/state | cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| room domain state | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| current connection authority | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| reserved side/deadline | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| browser retry | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| scheduler | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |

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
