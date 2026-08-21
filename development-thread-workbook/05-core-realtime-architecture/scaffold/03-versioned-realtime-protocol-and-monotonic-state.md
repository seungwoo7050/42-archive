# 버전 기반 실시간 프로토콜과 단조 상태

원문 Development Thread: `Versioned realtime protocol and monotonic state`

## 1. Thread 목표

- TypeScript 타입 선언 수준의 message vocabulary가 양방향 strict runtime codec으로 발전하는 과정을 추적합니다.
- snapshot sequence와 input sequence가 서버 및 브라우저 상태를 뒤로 되돌리지 못하게 하는 위치와 범위를 확인합니다.
- persisted/transient result discriminator와 machine-readable error code가 wire contract에 어떤 의미를 부여하는지 복원합니다.

### Source에서 확정된 significance

> The protocol evolves from typed messages to an executable compatibility boundary. Versioning, strict object shapes, input sequence numbers, and snapshot sequence numbers ensure that malformed, stale, duplicated, or structurally incompatible traffic cannot silently mutate authoritative or rendered state.

### 직접 연결되는 Critical Invariants

> Every accepted wire message conforms to the supported versioned runtime schema; snapshot and input ordering cannot move state backward.

> The server is the sole authority for game rules, scores, phases, room membership, matchmaking, and persisted outcomes.

### 직접 연결되는 Major Engineering Difficulties

> Handling slow or stale transports through sequence gates, token buckets, latest-value snapshot delivery, measurable congestion, and hard termination limits.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 초기 client validation과 server compile-time typing 사이의 비대칭은 무엇이었습니까?
- snapshot envelope에서 transport metadata와 nested game state는 어떻게 분리됩니까?
- `v: 1`은 handshake version과 event version에서 각각 어떤 호환성 경계를 형성합니까?
- server input gate와 browser snapshot gate는 어떤 key와 비교 규칙으로 stale traffic을 거부합니까?
- persisted result와 transient result가 잘못 섞이지 않도록 schema가 강제하는 조합은 무엇입니까?
- producer와 consumer 모두 같은 shared codec을 사용한다는 사실을 실제 call site로 증명할 수 있습니까?

## 3. 완료 기준

- client event parse와 server event encode/parse 경계를 실제 symbol과 함께 정리할 수 있습니다.
- snapshot의 `tick`, `sequence`, `serverTime`, nested `state` 역할을 구분할 수 있습니다.
- duplicate/reordered input과 delayed/duplicate snapshot이 각각 어디에서 무시되는지 설명할 수 있습니다.
- strict object, unknown-field rejection, version rejection, persistence discriminator의 negative tests를 분류할 수 있습니다.
- 프로토콜 변경 시 server, shared, browser에서 동시에 바뀌어야 하는 지점을 나열할 수 있습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `a974f8cd9712` | `feat(shared): WebSocket 이벤트 메시지 검증` | A | PROTOCOL, SIMULATION, REALTIME | Introduces the first runtime-validated discriminated event vocabulary. |
| 2 | `7d3437c49152` | `feat(protocol): versioned game snapshot 계약 정의` | A | PROTOCOL, SIMULATION, REALTIME | Reshapes snapshots and results into strict transport models with sequence and persistence metadata. |
| 3 | `0595a386000a` | `feat(protocol): versioned WebSocket event codec 연결` | S | PROTOCOL, REALTIME, ARCH | Makes both directions strict version-one codec boundaries. |
| 4 | `1567f5005ef8` | `feat(game): room별 input sequence 중복을 차단` | A | SIMULATION, REALTIME, PERSISTENCE | Rejects stale or reordered input per client and room. |
| 5 | `8a8787d03a19` | `feat(play): versioned game input과 snapshot 소비` | A | PROTOCOL, SIMULATION, REALTIME | Adds client-side event parsing and monotonic snapshot acceptance. |
| 6 | `f655969b0d36` | `test(protocol): versioned realtime contract 검증` | A | PROTOCOL, REALTIME, PERSISTENCE | Protects version, sequence, and persistence discriminator invariants. |

## 5. Commit별 학습 기록

### 5.1. `feat(shared): WebSocket 이벤트 메시지 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `a974f8cd9712` |
| Importance | A |
| Tags | PROTOCOL, SIMULATION, REALTIME |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Introduces the first runtime-validated discriminated event vocabulary.
- Classification summary: Introduce a discriminated WebSocket protocol and validate client-originated messages before handlers consume them.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
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
- 이 commit의 parent와 비교합니다.
- 다음 Thread 관련 SHA: `7d3437c49152` — `feat(protocol): versioned game snapshot 계약 정의`

### 5.2. `feat(protocol): versioned game snapshot 계약 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `7d3437c49152` |
| Importance | A |
| Tags | PROTOCOL, SIMULATION, REALTIME |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Reshapes snapshots and results into strict transport models with sequence and persistence metadata.
- Classification summary: Replace loose game interfaces with strict schemas for version-ready snapshots and completion results.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
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
- 직전 Thread 관련 SHA: `a974f8cd9712` — `feat(shared): WebSocket 이벤트 메시지 검증`
- 다음 Thread 관련 SHA: `0595a386000a` — `feat(protocol): versioned WebSocket event codec 연결`

### 5.3. `feat(protocol): versioned WebSocket event codec 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `0595a386000a` |
| Importance | S |
| Tags | PROTOCOL, REALTIME, ARCH |
| 학습 깊이 | Architecture/invariant를 깊게 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Makes both directions strict version-one codec boundaries.
- Classification summary: Turn the shared event vocabulary into a symmetric strict runtime compatibility boundary.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
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
- 직전 Thread 관련 SHA: `7d3437c49152` — `feat(protocol): versioned game snapshot 계약 정의`
- 다음 Thread 관련 SHA: `1567f5005ef8` — `feat(game): room별 input sequence 중복을 차단`

### 5.4. `feat(game): room별 input sequence 중복을 차단`

| 항목 | 값 |
| --- | --- |
| SHA | `1567f5005ef8` |
| Importance | A |
| Tags | SIMULATION, REALTIME, PERSISTENCE |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Rejects stale or reordered input per client and room.
- Classification summary: Apply monotonic input ordering before mutating authoritative paddle intent.

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
- 직전 Thread 관련 SHA: `0595a386000a` — `feat(protocol): versioned WebSocket event codec 연결`
- 다음 Thread 관련 SHA: `8a8787d03a19` — `feat(play): versioned game input과 snapshot 소비`

### 5.5. `feat(play): versioned game input과 snapshot 소비`

| 항목 | 값 |
| --- | --- |
| SHA | `8a8787d03a19` |
| Importance | A |
| Tags | PROTOCOL, SIMULATION, REALTIME |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Adds client-side event parsing and monotonic snapshot acceptance.
- Classification summary: Make the browser a strict version-one producer and monotonic server-event consumer.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
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
- 직전 Thread 관련 SHA: `1567f5005ef8` — `feat(game): room별 input sequence 중복을 차단`
- 다음 Thread 관련 SHA: `f655969b0d36` — `test(protocol): versioned realtime contract 검증`

### 5.6. `test(protocol): versioned realtime contract 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `f655969b0d36` |
| Importance | A |
| Tags | PROTOCOL, REALTIME, PERSISTENCE |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Protects version, sequence, and persistence discriminator invariants.
- Classification summary: Add negative and round-trip tests for the strict runtime codec.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- runtime schema의 strictness, negative branch, producer/consumer의 공통 contract 사용 여부를 확인합니다.
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
- 직전 Thread 관련 SHA: `8a8787d03a19` — `feat(play): versioned game input과 snapshot 소비`
- 이 Thread의 최종 상태와 비교합니다.

## 6. Invariant ledger

| Invariant | 도입 SHA | 강화 SHA | 부족함이 드러난 SHA | 복구 fix | 고정 test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| Every accepted wire message conforms to the supported versioned runtime schema; snapshot and input ordering cannot move state backward. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| The server is the sole authority for game rules, scores, phases, room membership, matchmaking, and persisted outcomes. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| [작성] | [작성] | [작성] | [작성] |

## 8. Ownership / state / responsibility 변화

| 축 | 초기 owner/state | 중간 전환 | 최종 owner/state | cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| wire vocabulary/schema | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| input ordering | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| snapshot ordering | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| persistence result meaning | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |

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
