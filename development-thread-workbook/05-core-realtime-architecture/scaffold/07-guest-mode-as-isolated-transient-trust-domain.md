# 격리된 임시 신뢰 도메인으로서의 게스트 모드

원문 Development Thread: `Guest mode as an isolated transient trust domain`

## 1. Thread 목표

- guest를 약한 registered account가 아니라 별도의 signed identity, ticket, lease, capability, matchmaking, persistence domain으로 추적합니다.
- database 없이 발급·검증되는 guest cookie와 one-time ticket, IP/process capacity lease의 lifecycle을 복원합니다.
- registered data 조회와 write, mixed matchmaking, durable result를 차단하면서 제한된 reconnect recovery만 허용하는 경계를 확인합니다.

### Source에서 확정된 significance

> Guest mode is not implemented as a weaker registered account. It is a separate signed identity, capability, matchmaking, persistence, and resource domain. The sequence is significant because each integration point explicitly prevents transient public traffic from acquiring durable data or unbounded process state.

### 직접 연결되는 Critical Invariants

> Guest identities, matchmaking pools, capabilities, persistence, tickets, leases, and retained results remain isolated and resource-bounded.

> The durable browser session is carried only by an HttpOnly cookie; raw WebSocket tickets are short-lived, single-use, hashed at rest, bounded during authentication, and excluded from logs.

> Timers, schedulers, heartbeat handles, retry work, snapshot buffers, and database resources have explicit single-owner cleanup.

### 직접 연결되는 Major Engineering Difficulties

> Offering a public guest mode without allowing transient identities to cross into registered data, social features, ratings, or unbounded in-memory resources.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- guest token payload와 signature는 어떤 값으로 구성되며 address/version/expiry를 어디에서 검증합니까?
- ticket issuance limit과 live connection lease limit은 왜 별도이며 reconnect replacement에서 stale release를 어떻게 막습니까?
- demo mode가 registered session/database fallback을 하지 않는 branch는 어디입니까?
- guest route가 repository data를 조회한 뒤 필터링하는 것이 아니라 호출 자체를 피하는 근거는 무엇입니까?
- guest와 registered matchmaking pool 및 AI fallback source는 어떻게 분리됩니까?
- non-persisted result의 2분 보존은 어떤 map/timer ownership과 race guard를 사용합니까?
- IP window와 pending ticket map이 무한 증가하지 않도록 어떤 capacity와 prune path를 둡니까?

## 3. 완료 기준

- signed cookie → in-memory ticket → live lease의 trust chain과 각 TTL/capacity를 설명할 수 있습니다.
- guest가 접근 가능한 HTTP/WebSocket 기능과 registered-only 기능을 코드 branch로 구분할 수 있습니다.
- guest room이 registered user/NPC/persistence와 섞이지 않는 근거를 제시할 수 있습니다.
- transient result recovery가 durable history나 rating을 만들지 않는지 확인할 수 있습니다.
- fake-timer tests가 window/ticket/result cleanup과 reconnect intent를 어떻게 검증하는지 정리할 수 있습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `cacd4c22d705` | `feat(guest): signed guest session token 정의` | A | AUTH, PERSISTENCE | Creates tamper-evident, address-bound, expiring guest identity without database sessions. |
| 2 | `17a1dd501b1b` | `feat(guest): guest resource lease 수명주기 추가` | A | AUTH, PROTOCOL, REALTIME | Binds guest connection limits to lease identity and socket lifetime. |
| 3 | `a5c06c561e00` | `feat(guest): guest session과 WebSocket 인증 연결` | A | AUTH, REALTIME, PERSISTENCE | Connects signed cookies, one-time tickets, and bounded live leases. |
| 4 | `27ddc3fca2f1` | `feat(guest): guest 조회 범위와 lobby 격리` | A | AUTH, PERSISTENCE, TOURNAMENT | Avoids fetching registered social and historical data for demo traffic. |
| 5 | `77a7c205ccd0` | `feat(game): guest matchmaking과 room을 격리` | A | REALTIME, PERSISTENCE, RISK | Partitions matchmaking and AI fallback by identity kind. |
| 6 | `eaa4fdaba361` | `feat(game): guest 경기 결과 영속화 차단과 임시 보존` | A | SIMULATION, REALTIME | Skips durable finalization while retaining a short in-memory recovery result. |
| 7 | `2b274686e6d4` | `fix(guest): 체험 환경의 runtime 복구 제한` | A | AUTH, REALTIME, RISK | Bounds IP windows and pending ticket structures and validates runtime mode. |
| 8 | `06d2eb7a93cc` | `test(guest): 체험 환경의 복구 경계 검증` | A | AUTH, SIMULATION, REALTIME | Verifies bounded cleanup, fresh-ticket reconnect, and no duplicate match intent. |

## 5. Commit별 학습 기록

### 5.1. `feat(guest): signed guest session token 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `cacd4c22d705` |
| Importance | A |
| Tags | AUTH, PERSISTENCE |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Creates tamper-evident, address-bound, expiring guest identity without database sessions.
- Classification summary: Introduce a self-contained signed session representation for transient guests.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.

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
- 다음 Thread 관련 SHA: `17a1dd501b1b` — `feat(guest): guest resource lease 수명주기 추가`

### 5.2. `feat(guest): guest resource lease 수명주기 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `17a1dd501b1b` |
| Importance | A |
| Tags | AUTH, PROTOCOL, REALTIME |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Binds guest connection limits to lease identity and socket lifetime.
- Classification summary: Add bounded live-connection leases with stale-release protection.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- runtime schema의 strictness, negative branch, producer/consumer의 공통 contract 사용 여부를 확인합니다.
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
- 직전 Thread 관련 SHA: `cacd4c22d705` — `feat(guest): signed guest session token 정의`
- 다음 Thread 관련 SHA: `a5c06c561e00` — `feat(guest): guest session과 WebSocket 인증 연결`

### 5.3. `feat(guest): guest session과 WebSocket 인증 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `a5c06c561e00` |
| Importance | A |
| Tags | AUTH, REALTIME, PERSISTENCE |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Connects signed cookies, one-time tickets, and bounded live leases.
- Classification summary: Integrate demo guest identity with HTTP login/logout, in-memory one-time tickets, and WebSocket admission.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
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
- 직전 Thread 관련 SHA: `17a1dd501b1b` — `feat(guest): guest resource lease 수명주기 추가`
- 다음 Thread 관련 SHA: `27ddc3fca2f1` — `feat(guest): guest 조회 범위와 lobby 격리`

### 5.4. `feat(guest): guest 조회 범위와 lobby 격리`

| 항목 | 값 |
| --- | --- |
| SHA | `27ddc3fca2f1` |
| Importance | A |
| Tags | AUTH, PERSISTENCE, TOURNAMENT |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Avoids fetching registered social and historical data for demo traffic.
- Classification summary: Partition public guest reads from registered profile, social, leaderboard, history, and tournament data.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.

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
- 직전 Thread 관련 SHA: `a5c06c561e00` — `feat(guest): guest session과 WebSocket 인증 연결`
- 다음 Thread 관련 SHA: `77a7c205ccd0` — `feat(game): guest matchmaking과 room을 격리`

### 5.5. `feat(game): guest matchmaking과 room을 격리`

| 항목 | 값 |
| --- | --- |
| SHA | `77a7c205ccd0` |
| Importance | A |
| Tags | REALTIME, PERSISTENCE, RISK |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Partitions matchmaking and AI fallback by identity kind.
- Classification summary: Prevent guest and registered players or persistent NPC sources from entering the same room.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
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
- 직전 Thread 관련 SHA: `27ddc3fca2f1` — `feat(guest): guest 조회 범위와 lobby 격리`
- 다음 Thread 관련 SHA: `eaa4fdaba361` — `feat(game): guest 경기 결과 영속화 차단과 임시 보존`

### 5.6. `feat(game): guest 경기 결과 영속화 차단과 임시 보존`

| 항목 | 값 |
| --- | --- |
| SHA | `eaa4fdaba361` |
| Importance | A |
| Tags | SIMULATION, REALTIME |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Skips durable finalization while retaining a short in-memory recovery result.
- Classification summary: Return a non-persisted guest result and retain it briefly for reconnect recovery without touching ratings/history.

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
- 직전 Thread 관련 SHA: `77a7c205ccd0` — `feat(game): guest matchmaking과 room을 격리`
- 다음 Thread 관련 SHA: `2b274686e6d4` — `fix(guest): 체험 환경의 runtime 복구 제한`

### 5.7. `fix(guest): 체험 환경의 runtime 복구 제한`

| 항목 | 값 |
| --- | --- |
| SHA | `2b274686e6d4` |
| Importance | A |
| Tags | AUTH, REALTIME, RISK |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Bounds IP windows and pending ticket structures and validates runtime mode.
- Classification summary: Close unbounded in-memory growth and fail-open runtime-mode behavior in the public guest surface.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
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
- 직전 Thread 관련 SHA: `eaa4fdaba361` — `feat(game): guest 경기 결과 영속화 차단과 임시 보존`
- 다음 Thread 관련 SHA: `06d2eb7a93cc` — `test(guest): 체험 환경의 복구 경계 검증`

### 5.8. `test(guest): 체험 환경의 복구 경계 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `06d2eb7a93cc` |
| Importance | A |
| Tags | AUTH, SIMULATION, REALTIME |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Verifies bounded cleanup, fresh-ticket reconnect, and no duplicate match intent.
- Classification summary: Add deterministic guest runtime and browser recovery regressions for bounded transient state.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
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
- 직전 Thread 관련 SHA: `2b274686e6d4` — `fix(guest): 체험 환경의 runtime 복구 제한`
- 이 Thread의 최종 상태와 비교합니다.

## 6. Invariant ledger

| Invariant | 도입 SHA | 강화 SHA | 부족함이 드러난 SHA | 복구 fix | 고정 test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| Guest identities, matchmaking pools, capabilities, persistence, tickets, leases, and retained results remain isolated and resource-bounded. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| The durable browser session is carried only by an HttpOnly cookie; raw WebSocket tickets are short-lived, single-use, hashed at rest, bounded during authentication, and excluded from logs. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| Timers, schedulers, heartbeat handles, retry work, snapshot buffers, and database resources have explicit single-owner cleanup. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| [작성] | [작성] | [작성] | [작성] |

## 8. Ownership / state / responsibility 변화

| 축 | 초기 owner/state | 중간 전환 | 최종 owner/state | cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| guest identity | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| pending ticket | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| live capacity | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| read/match capability | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| result | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |

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
