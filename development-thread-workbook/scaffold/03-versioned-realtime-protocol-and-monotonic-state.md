# 버전 기반 실시간 프로토콜과 단조 상태

원문 Development Thread: `Versioned realtime protocol and monotonic state`

## 1. Thread 목표

- TypeScript 타입 선언 수준의 message vocabulary가 양방향 strict runtime codec으로 발전하는 과정을 추적합니다.
- snapshot sequence와 input sequence가 서버 및 브라우저 상태를 뒤로 되돌리지 못하게 하는 위치와 범위를 확인합니다.
- persisted/transient result discriminator와 machine-readable error code가 wire contract에 어떤 의미를 부여하는지 복원합니다.

### Source에서 확정된 significance

> The protocol evolves from typed messages to an executable compatibility boundary. Versioning, strict object
> shapes, input sequence numbers, and snapshot sequence numbers ensure that malformed, stale, duplicated, or
> structurally incompatible traffic cannot silently mutate authoritative or rendered state.

### 직접 연결되는 Critical Invariants

> Every accepted wire message conforms to the supported versioned runtime schema; snapshot and input ordering
> cannot move state backward.

> The server is the sole authority for game rules, scores, phases, room membership, matchmaking, and persisted
> outcomes.

### 직접 연결되는 Major Engineering Difficulties

> Handling slow or stale transports through sequence gates, token buckets, latest-value snapshot delivery,
> measurable congestion, and hard termination limits.

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
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Introduces the first runtime-validated discriminated event vocabulary.
- Classification summary: Introduce a discriminated WebSocket protocol and validate every client-originated message at runtime before application handlers consume it.

원문 구현 의도·상태 변화:

> Introduce a discriminated WebSocket protocol and validate every client-originated message at runtime before
> application handlers consume it. Queue operations, readiness, paddle input, and chat each have an explicit
> payload shape; queue mode has a defined default, input is limited to the three legal directions, and chat
> text is trimmed and bounded to 1–240 characters.

원문 경계·failure handling·후속 범위:

> Parsing JSON before applying the Zod union distinguishes malformed serialization from a structurally invalid
> event and returns a typed event on success. Server-originated events use a TypeScript discriminated union
> and a single JSON encoder, covering matchmaking, snapshots, completion, chat, presence, and errors. Unlike
> client input, server output is type-checked at compile time rather than validated again at runtime.

#### 해당 SHA에서 확인할 실제 코드

- client event discriminated union의 event 종류, payload shape, default queue mode를 확인합니다.
- JSON parse failure와 schema-invalid event가 구분되는 return/error path를 기록합니다.
- paddle direction `-1|0|1`, chat trim 및 1–240 boundary를 실제 schema로 확인합니다.
- server event union과 JSON encoder가 runtime validation 없이 compile-time typing만 사용하던 당시 경계를 확인합니다.
- handler가 typed event를 받기 전에 validation을 우회하는 path가 없는지 caller를 추적합니다.

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
- 다음 Thread 관련 SHA: `7d3437c49152` — `feat(protocol): versioned game snapshot 계약 정의`

### 5.2. `feat(protocol): versioned game snapshot 계약 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `7d3437c49152` |
| Importance | A |
| Tags | PROTOCOL, SIMULATION, REALTIME |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Reshapes snapshots and results into strict transport models with sequence and persistence metadata.
- Classification summary: Replace compile-time-only game interfaces with strict runtime schemas and reshape snapshots into an explicit transport model.

원문 구현 의도·상태 변화:

> Replace compile-time-only game interfaces with strict runtime schemas and reshape snapshots into an explicit
> transport model. A snapshot now carries room identity, monotonic tick and sequence numbers, numeric server
> time, and a nested game state containing phase, scores, paddles, ball, and players. Numeric values are
> constrained to finite or non-negative integer domains, and every object rejects unknown fields.

원문 경계·failure handling·후속 범위:

> Finished results become a discriminated persisted/transient union. Persisted outcomes require a match
> identifier and may carry a rating delta; non-persisted outcomes must use `matchId: null`, `persisted:
> false`, and zero rating change. This makes persistence success part of the protocol rather than implying
> that every terminal frame was durably recorded, while the inferred TypeScript types remain derived from the
> executable contract.

#### 해당 SHA에서 확인할 실제 코드

- snapshot runtime schema의 room identity, tick, sequence, numeric server time, nested state 필드를 정리합니다.
- finite number, non-negative integer, strict object/unknown field rejection이 각 nested schema에 적용되는지 확인합니다.
- persisted result와 transient result union의 `persisted`, `matchId`, rating delta 조합을 표로 만듭니다.
- schema에서 infer된 TypeScript type과 기존 interface 사용처가 어떻게 교체되는지 diff를 확인합니다.
- protocol metadata와 simulation state가 aliasing 없이 분리되는 serialization shape를 기록합니다.

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
- 직전 Thread 관련 SHA: `a974f8cd9712` — `feat(shared): WebSocket 이벤트 메시지 검증`
- 다음 Thread 관련 SHA: `0595a386000a` — `feat(protocol): versioned WebSocket event codec 연결`

### 5.3. `feat(protocol): versioned WebSocket event codec 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `0595a386000a` |
| Importance | S |
| Tags | PROTOCOL, REALTIME, ARCH |
| 학습 깊이 | Architecture/invariant 중심으로 직전 상태, 결정, 핵심 전이, ownership, failure, 후속 검증까지 완전히 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Makes both directions strict version-one codec boundaries.
- Classification summary: Make every client and server WebSocket event a strict runtime-validated version-1 message.

원문 구현 의도·상태 변화:

> Make every client and server WebSocket event a strict runtime-validated version-1 message. Client commands
> now require `v: 1`, non-empty identifiers, bounded chat text, and a non-negative safe `inputSeq` for paddle
> updates. Server messages use the shared chat, snapshot, result, and player schemas and expose a finite set
> of machine-readable error codes.

원문 경계·failure handling·후속 범위:

> Both directions now have codecs: incoming JSON is parsed through the client schema, outgoing events are
> validated before encoding, and clients can parse server payloads through the same authoritative definition.
> Requiring a version on each event, in addition to the handshake version, prevents silently interpreting
> structurally incompatible messages and creates a clear boundary for future protocol evolution.

#### Source의 Most Important Commit 정의

##### Problem

> Compile-time unions and unchecked `JSON.parse` cannot protect a distributed browser/server boundary from
> malformed, stale, or incompatible messages.

##### Decision

> Require `v: 1` on every event and validate both incoming and outgoing payloads through shared strict
> schemas, including bounded text, identifiers, input sequence, and error codes.

##### Why it mattered

> The protocol becomes executable and symmetric: producers cannot encode unsupported shapes and consumers
> cannot silently accept them.

##### What changed

> Client and server event unions, parsers, encoders, snapshot/result composition, input ordering fields, and
> coded errors are unified under one version.

##### Project understanding

> It is the contract that allows later snapshot sequencing, client parsing, rate limiting, guest restrictions,
> and protocol regression tests to be reasoned about precisely.

#### 해당 SHA에서 확인할 실제 코드

- 모든 client command에 필요한 `v: 1`, identifier, chat bound, non-negative safe `inputSeq`를 schema별로 확인합니다.
- server event schema가 shared chat/snapshot/result/player schema를 재사용하고 error code를 finite union으로 제한하는지 확인합니다.
- incoming JSON parse → client schema parse와 outgoing event validation → encode의 양방향 codec 함수를 추적합니다.
- browser/server consumer가 동일 authoritative parser를 import하는 public package boundary를 확인합니다.
- handshake version과 event version이 각각 어디서 검사되고 서로 독립적으로 실패할 수 있는지 기록합니다.
- unknown field, unsupported version, invalid input sequence가 domain handler 전에 차단되는지 caller 순서를 증명합니다.

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
- 직전 Thread 관련 SHA: `7d3437c49152` — `feat(protocol): versioned game snapshot 계약 정의`
- 다음 Thread 관련 SHA: `1567f5005ef8` — `feat(game): room별 input sequence 중복을 차단`

### 5.4. `feat(game): room별 input sequence 중복을 차단`

| 항목 | 값 |
| --- | --- |
| SHA | `1567f5005ef8` |
| Importance | A |
| Tags | SIMULATION, REALTIME, PERSISTENCE |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Rejects stale or reordered input per client and room.
- Classification summary: Track the highest accepted input sequence separately for each client and room.

원문 구현 의도·상태 변화:

> Track the highest accepted input sequence separately for each client and room. A game input is applied only
> after the room is playing, the sender is an actual participant, and its `inputSeq` is strictly greater than
> the last accepted value; duplicate or reordered messages are ignored before they can overwrite the current
> paddle direction.

원문 경계·failure handling·후속 범위:

> Scoping the sequence map by room prevents a previous match's counter from invalidating a new room, while
> keeping it on the client preserves ordering across all messages sent by that connection. The final
> assignment also completes the snapshot-envelope migration by writing to `snapshot.state.paddles`.

#### 해당 SHA에서 확인할 실제 코드

- highest accepted input sequence를 client와 room별로 저장하는 map/key 구조를 찾습니다.
- room playing 여부, participant/side 확인, strictly-greater sequence 비교, paddle assignment의 실행 순서를 기록합니다.
- duplicate와 reordered input이 map이나 paddle direction을 변경하지 않는 branch를 확인합니다.
- 새 room에서 이전 room counter가 영향을 주지 않는 cleanup/reset 또는 key scoping을 확인합니다.
- snapshot envelope migration의 마지막 assignment가 `snapshot.state.paddles`를 사용하는지 확인합니다.

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
- 직전 Thread 관련 SHA: `0595a386000a` — `feat(protocol): versioned WebSocket event codec 연결`
- 다음 Thread 관련 SHA: `8a8787d03a19` — `feat(play): versioned game input과 snapshot 소비`

### 5.5. `feat(play): versioned game input과 snapshot 소비`

| 항목 | 값 |
| --- | --- |
| SHA | `8a8787d03a19` |
| Importance | A |
| Tags | PROTOCOL, SIMULATION, REALTIME |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Adds client-side event parsing and monotonic snapshot acceptance.
- Classification summary: Migrate the play page to the versioned realtime contract.

원문 구현 의도·상태 변화:

> Migrate the play page to the versioned realtime contract. Every queue, tournament, ready, pause, resume,
> chat, and game-input command now carries `v: 1`; periodic paddle inputs include a monotonically increasing
> `inputSeq`, and incoming messages are parsed through the shared runtime codec rather than trusted after raw
> JSON decoding.

원문 경계·failure handling·후속 범위:

> The client resets input and snapshot counters for each newly opened game connection and ignores snapshots
> whose sequence is not newer than the last applied value. UI state, scores, participants, and terminal-phase
> updates read the nested snapshot state, so delayed or duplicated frames cannot roll the rendered match
> backward while the server remains authoritative.

#### 해당 SHA에서 확인할 실제 코드

- queue/tournament/ready/pause/resume/chat/input command가 모두 `v: 1`을 포함하는 sender를 확인합니다.
- periodic paddle input의 monotonic `inputSeq` 생성 위치와 connection 교체 시 reset을 기록합니다.
- raw JSON 대신 shared server-event parser를 통과하는 message handler를 추적합니다.
- last accepted snapshot sequence와 `<=` rejection branch를 확인합니다.
- nested snapshot state가 UI score/player/phase/terminal cleanup으로 전달되는 selector/handler를 기록합니다.

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
- 직전 Thread 관련 SHA: `1567f5005ef8` — `feat(game): room별 input sequence 중복을 차단`
- 다음 Thread 관련 SHA: `f655969b0d36` — `test(protocol): versioned realtime contract 검증`

### 5.6. `test(protocol): versioned realtime contract 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `f655969b0d36` |
| Importance | A |
| Tags | PROTOCOL, REALTIME, PERSISTENCE |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Protects version, sequence, and persistence discriminator invariants.
- Classification summary: Add negative protocol cases for shapes that the migration must no longer accept.

원문 구현 의도·상태 변화:

> Add negative protocol cases for shapes that the migration must no longer accept. The server-event parser
> rejects an unversioned presence event, a snapshot with a negative sequence, and a result that claims durable
> persistence while providing no match identifier.

원문 경계·failure handling·후속 범위:

> These tests protect the ordering and persistence invariants encoded by the new schemas rather than merely
> checking successful serialization.

#### 해당 SHA에서 확인할 실제 코드

- unversioned presence, negative snapshot sequence, `persisted: true`와 null match ID 조합의 negative fixture를 확인합니다.
- 각 fixture가 shared server-event parser의 어느 schema branch에서 실패하는지 연결합니다.
- 성공 round-trip test와 negative parse test의 목적 차이를 기록합니다.
- 이 테스트가 transport delivery/order 자체가 아니라 contract acceptance를 검증한다는 한계를 명시합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | version, monotonic sequence domain, result persistence discriminator가 schema 밖의 shape를 수용하지 않습니다. |
| 재현하는 failure/boundary | unversioned event, negative sequence, impossible persisted result. |
| test technique | shared parser에 대한 targeted negative schema cases. |
| 통과하는 production path | raw/constructed event → server-event runtime parser. |
| 증명하는 것 | 잘못된 wire shape가 application state에 진입하기 전에 거부됩니다. |
| 증명하지 않는 것 | message delivery 순서나 server/client state application 로직은 직접 검증하지 않습니다. |
| test 성격 | Deterministic protocol regression. |
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
- 직전 Thread 관련 SHA: `8a8787d03a19` — `feat(play): versioned game input과 snapshot 소비`
- 이 Thread의 최종 상태와 비교해 이후 보완 여부를 기록합니다.

## 6. Invariant ledger

Source에서 확정된 invariant를 아래 시점별로 연결합니다. 새 invariant를 추측해 확정하지 않습니다.

| Invariant | 처음 도입/관찰한 SHA | 강화한 SHA | 부족함이 드러난 SHA | 복구한 fix | 고정한 regression test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| Every accepted wire message conforms to the supported versioned runtime schema; snapshot and input ordering cannot move state backward. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| The server is the sole authority for game rules, scores, phases, room membership, matchmaking, and persisted outcomes. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |

추가 기록:

- invariant가 동일한 문장으로 유지되었는지, 더 강한 조건으로 바뀌었는지 구분합니다.
- implementation detail과 invariant를 혼동하지 않습니다.
- source가 명시하지 않은 규칙은 “관찰한 가설”로 표시하고 코드 근거로만 남깁니다.

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| typed union만 있고 runtime 호환성/strictness가 불완전함 | `7d3437c49152` strict snapshot/result → `0595a386000a` 양방향 v1 codec | `f655969b0d36` negative contract cases | executable versioned protocol |
| duplicate/reordered input과 snapshot이 상태를 되돌릴 위험 | `1567f5005ef8` server input sequence → `8a8787d03a19` browser snapshot sequence | 각 SHA의 ordering tests 및 `f655969b0d36` domain checks | monotonic authoritative/rendered state |

학습자 보완 기록:

- 실제 failure를 주입하거나 재현하는 test fixture를 찾아 위 표의 각 행과 연결합니다.
- fix가 symptom만 가리는지, ownership/invariant를 바꾸는지 코드 근거로 판별합니다.
- broad integration과 deterministic regression을 별도 표시합니다.

## 8. Ownership / state / responsibility 변화

| 축 | 초기 SHA의 owner/state | 중간 전환 | Thread 최종 owner/state | 해제·cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| schema and codec ownership | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| event version attachment | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| input ordering state | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| snapshot ordering state | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| result persistence metadata | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |

## 9. Thread 최종 상태

다음 항목은 최종 HEAD를 보고 채우지 말고, 이 Thread의 마지막 commit까지 순서대로 복원한 결과로 작성합니다.

- 최종 authoritative owner: [학습자 작성]
- 최종 상태/invariant: [학습자 작성]
- 남아 있는 의도적 제한 또는 비보장: [학습자 작성]
- 후속 Thread가 의존하는 contract: [학습자 작성]
- 대표 코드 근거: [SHA, 파일, symbol]

## 10. 최종 architecture 또는 execution flow 정리

- 한 client command와 한 server snapshot이 생성·검증·적용되는 전체 실행 흐름을 작성합니다.
- sequence가 room/connection 교체 시 어떻게 초기화 또는 격리되는지 정리합니다.
- runtime schema가 compile-time type만으로는 막을 수 없던 실패를 설명합니다.

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
