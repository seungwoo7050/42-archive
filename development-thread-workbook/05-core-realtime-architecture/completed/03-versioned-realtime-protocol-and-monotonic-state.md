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

> 검토 방식: 지정 브랜치에 속한 exact SHA의 diff와 해당 시점 파일을 GitHub에서 확인했습니다. 로컬 실행 환경은 GitHub clone이 차단되어 테스트 명령은 실행하지 않았으며, 아래 테스트 결과 설명은 test implementation 검토에 한정합니다.

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
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Introduces the first runtime-validated discriminated event vocabulary.
- Classification summary: Introduce a discriminated WebSocket protocol and validate client-originated messages before handlers consume them.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | client/server event는 call site별 object와 TypeScript type에 의존해 malformed JSON과 구조 오류가 handler까지 도달할 수 있었습니다. |
| 핵심 boundary/decision | `packages/shared/src/ws.ts`에 Zod discriminated union과 `parseClientEvent`를 추가합니다. queue, ready, input, chat shape와 direction `-1|0|1`, chat trim/1–240을 runtime 검증합니다. |
| 상태 또는 ownership 변화 | shared package가 client-originated message vocabulary와 parse boundary를 소유합니다. server event는 이 SHA에서 TypeScript union과 `JSON.stringify`만 사용합니다. |
| 주요 failure/edge path | JSON parse failure와 schema-invalid object를 구분해 typed event만 handler에 넘깁니다. server output은 runtime validation이 없어 방향별 비대칭이 남습니다. |
| 보장/비보장 | client event의 알려진 type/payload만 application handler에 도달합니다. event version, strict server output, sequence ordering은 아직 없습니다. |
| 다음 관련 commit 연결 | `7d3437...`가 snapshot/result를 strict runtime model로 바꾸고 transport ordering metadata를 추가합니다. |

비교 기준:
- 이 commit의 parent에서 동일 책임을 담당하던 코드를 비교했습니다.
- 다음 Thread 관련 SHA: `7d3437c49152` — `feat(protocol): versioned game snapshot 계약 정의`

### 5.2. `feat(protocol): versioned game snapshot 계약 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `7d3437c49152` |
| Importance | A |
| Tags | PROTOCOL, SIMULATION, REALTIME |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Reshapes snapshots and results into strict transport models with sequence and persistence metadata.
- Classification summary: Replace loose game interfaces with strict schemas for version-ready snapshots and completion results.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | snapshot은 transport metadata와 mechanics state가 평평하게 섞였고 result의 persisted 여부와 matchId/ratingDelta 조합이 타입상 모순될 수 있었습니다. |
| 핵심 boundary/decision | `packages/shared/src/game.ts`의 strict Zod schemas가 snapshot을 `{roomId,tick,sequence,serverTimeMs,state}`로 분리하고, finished result를 `persisted:true/false` discriminated union으로 정의합니다. |
| 상태 또는 ownership 변화 | shared game schema가 wire state envelope와 persistence semantics를 소유하며 server/browser 모두 같은 shape를 소비할 수 있습니다. |
| 주요 failure/edge path | sequence/tick/score는 nonnegative integer, vector는 finite로 제한합니다. `persisted:true`는 non-null matchId, `persisted:false`는 null matchId와 ratingDelta 0만 허용합니다. |
| 보장/비보장 | snapshot ordering field와 transport/state 분리, contradictory result rejection이 가능해집니다. 모든 WS event에 version이 붙고 양방향 codec이 강제되는 것은 다음 commit입니다. |
| 다음 관련 commit 연결 | `0595a3...`가 모든 client/server event를 strict version-one codec으로 통합합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `a974f8cd9712` — `feat(shared): WebSocket 이벤트 메시지 검증`
- 다음 Thread 관련 SHA: `0595a386000a` — `feat(protocol): versioned WebSocket event codec 연결`

### 5.3. `feat(protocol): versioned WebSocket event codec 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `0595a386000a` |
| Importance | S |
| Tags | PROTOCOL, REALTIME, ARCH |
| 학습 깊이 | Architecture/invariant 중심으로 직전 상태, 결정, 핵심 전이, ownership, failure, 후속 검증까지 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Makes both directions strict version-one codec boundaries.
- Classification summary: Turn the shared event vocabulary into a symmetric strict runtime compatibility boundary.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | client input만 runtime 검증되고 server output은 compile-time type에 의존했으며 event version이 없었습니다. |
| 핵심 boundary/decision | 모든 client/server variant에 literal `v:1`과 `.strict()`를 붙이고 `game.input.inputSeq`, stable error code enum, `parseServerEvent`, validation-before-encode를 추가합니다. |
| 상태 또는 ownership 변화 | shared codec이 양방향 wire compatibility owner가 됩니다. server producer와 browser consumer가 같은 schemas를 사용합니다. |
| 주요 failure/edge path | unknown field, wrong/missing version, unsafe/negative inputSeq, malformed nested snapshot/result는 encode 또는 parse 경계에서 fail-closed됩니다. |
| 보장/비보장 | accepted client와 server message는 모두 version-one strict schema를 만족합니다. 순서상 오래된 message를 무시하는 runtime state는 뒤 commits가 담당합니다. |
| 다음 관련 commit 연결 | `1567f5...`가 server input sequence gate를, `8a8787...`이 browser snapshot sequence gate를 연결합니다. |

#### Architecture / invariant 복원

| 축 | 복원 결과 |
| --- | --- |
| 문제 | compile-time type는 network에서 받은 JSON이나 producer의 runtime object가 실제 contract를 따르는지 보장하지 못합니다. |
| 실패 위험 | versionless/extra-field/incompatible nested shape가 조용히 authoritative 또는 rendered state를 변경합니다. |
| 핵심 결정 | client parse, server encode, browser parse를 같은 strict literal-version schemas에 묶습니다. |
| 구현 경로 | raw JSON → parse/schema → typed client event; typed server event → schema validation → JSON; browser raw → `parseServerEvent`. |
| 수명주기·상태 | codec은 상태를 소유하지 않고 각 message admission 순간만 책임집니다. ordering state는 caller별 map/ref가 소유합니다. |
| 실패 처리 | 구문 오류와 schema 오류 모두 application mutation 전에 차단됩니다. |
| 후속 검증 | `f655969...` negative protocol tests가 missing version, invalid sequence, persistence contradiction을 고정합니다. |
| Thread 전체 의미 | protocol change는 shared schema, server producer, browser consumer가 함께 바뀌어야 하는 실행 가능한 compatibility boundary가 됩니다. |

비교 기준:
- 직전 Thread 관련 SHA: `7d3437c49152` — `feat(protocol): versioned game snapshot 계약 정의`
- 다음 Thread 관련 SHA: `1567f5005ef8` — `feat(game): room별 input sequence 중복을 차단`

### 5.4. `feat(game): room별 input sequence 중복을 차단`

| 항목 | 값 |
| --- | --- |
| SHA | `1567f5005ef8` |
| Importance | A |
| Tags | SIMULATION, REALTIME, PERSISTENCE |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Rejects stale or reordered input per client and room.
- Classification summary: Apply monotonic input ordering before mutating authoritative paddle intent.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 형식상 valid한 `game.input`이라도 network duplicate/reordering으로 더 오래된 direction이 최신 intent를 덮을 수 있었습니다. |
| 핵심 boundary/decision | `apps/api/src/gameHub.ts`의 각 `Client`에 `lastInputSequenceByRoom` map을 두고 room/phase/side 확인 뒤 `inputSeq <= previous`를 무시합니다. accepted일 때만 sequence 저장과 paddle direction mutation을 수행합니다. |
| 상태 또는 ownership 변화 | ordering state는 이 SHA에서 connection별 client가 room key로 소유합니다. server authoritative paddle intent는 monotonic accepted sequence만 반영합니다. |
| 주요 failure/edge path | stale/duplicate input은 no-op입니다. reconnect는 새 Client map이므로 이전 connection sequence와 연속성은 보장하지 않습니다. |
| 보장/비보장 | 한 client/room lifetime 안에서 input sequence가 뒤로 가지 않습니다. user-wide rate budget과 reconnect continuity는 Thread 08의 InputGate integration 범위입니다. |
| 다음 관련 commit 연결 | `8a8787...`이 browser에서 inputSeq를 생성하고 snapshot sequence 역행을 차단합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `0595a386000a` — `feat(protocol): versioned WebSocket event codec 연결`
- 다음 Thread 관련 SHA: `8a8787d03a19` — `feat(play): versioned game input과 snapshot 소비`

### 5.5. `feat(play): versioned game input과 snapshot 소비`

| 항목 | 값 |
| --- | --- |
| SHA | `8a8787d03a19` |
| Importance | A |
| Tags | PROTOCOL, SIMULATION, REALTIME |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Adds client-side event parsing and monotonic snapshot acceptance.
- Classification summary: Make the browser a strict version-one producer and monotonic server-event consumer.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | browser는 versionless command를 보내고 server snapshot을 arrival order대로 렌더링해 delayed frame이 UI를 과거로 되돌릴 수 있었습니다. |
| 핵심 boundary/decision | play page가 모든 command에 `v:1`을 붙이고 50ms input timer에서 `inputSequenceRef`를 증가시킵니다. incoming data는 `parseServerEvent`를 통과하고 `snapshot.sequence <= last`이면 무시합니다. |
| 상태 또는 ownership 변화 | browser connection instance가 input sequence와 last snapshot sequence refs를 소유하며 새 connection setup에서 초기화합니다. |
| 주요 failure/edge path | duplicate/delayed snapshot은 렌더링하지 않습니다. gap을 보충하거나 missed frame을 replay하지는 않습니다. |
| 보장/비보장 | 한 socket/session에서 rendered snapshot state는 sequence 기준 단조 증가합니다. 서버 authoritative state나 transport delivery completeness를 보장하지 않습니다. |
| 다음 관련 commit 연결 | `f65596...`가 version/sequence/persistence negative cases를 shared contract regression으로 고정합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `1567f5005ef8` — `feat(game): room별 input sequence 중복을 차단`
- 다음 Thread 관련 SHA: `f655969b0d36` — `test(protocol): versioned realtime contract 검증`

### 5.6. `test(protocol): versioned realtime contract 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `f655969b0d36` |
| Importance | A |
| Tags | PROTOCOL, REALTIME, PERSISTENCE |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Protects version, sequence, and persistence discriminator invariants.
- Classification summary: Add negative and round-trip tests for the strict runtime codec.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | strict schemas와 caller gates는 구현됐지만 missing version, invalid sequence, contradictory result가 회귀하지 않는 자동 contract evidence가 부족했습니다. |
| 핵심 boundary/decision | `packages/shared/src/ws.test.ts`가 client/server variants round-trip과 versionless server event, snapshot sequence -1, `persisted:true + matchId:null` rejection을 검사합니다. |
| 상태 또는 ownership 변화 | test suite가 shared wire contract의 negative examples를 고정합니다. |
| 주요 failure/edge path | invalid data가 parse/encode 경계에서 reject되는지를 직접 확인하며 application handler나 renderer를 호출하지 않습니다. |
| 보장/비보장 | 검사한 contract combinations이 runtime schema에 의해 차단됩니다. 실제 packet reordering, GameHub/browser integration, load behavior는 증명하지 않습니다. |
| 다음 관련 commit 연결 | Thread 최종 상태는 strict version-one codec과 server/client 양쪽 monotonic gates가 결합된 형태입니다. |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | accepted wire message는 version-one strict schema를 만족하고 ordering/persistence metadata가 유효합니다. |
| 재현하는 failure/boundary | missing version, negative sequence, persisted result contradiction, variant round-trip. |
| test technique | Shared Zod codec unit/negative contract tests. |
| 통과하는 production path | raw/typed event → `parseClientEvent`/`parseServerEvent`/`encodeServerEvent`. |
| 증명하는 것 | schema-level compatibility와 negative rejection을 증명합니다. |
| 증명하지 않는 것 | network reordering에서 GameHub와 React state가 실제로 단조적인지는 통합 검증하지 않습니다. |
| test 성격 | Deterministic runtime contract regression. |
| 후속 회귀 방지 설명 | version literal, strictness, sequence bounds, persisted discriminator를 약화하면 실패해야 합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `8a8787d03a19` — `feat(play): versioned game input과 snapshot 소비`
- 이 Thread의 마지막 상태와 비교해 최종 보장을 정리했습니다.

## 6. Invariant ledger

Source에서 확정된 invariant를 commit 시점별로 연결했습니다. `해당 없음`은 해당 Thread 안에서 별도 fix/test가 없음을 뜻합니다.

| Invariant | 처음 도입/관찰한 SHA | 강화한 SHA | 부족함이 드러난 SHA | 복구한 fix | 고정한 regression test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| Every accepted wire message conforms to the supported versioned runtime schema; snapshot and input ordering cannot move state backward. | `a974f8cd9712` client runtime parse | `7d3437c49152` strict snapshot/result → `0595a386000a` symmetric v1 codec → `1567f5005ef8` input gate → `8a8787d03a19` snapshot gate | 초기 server output runtime validation과 sequence state 부재 | 해당 없음 — 순차 강화 | `f655969b0d36` | `packages/shared/src/ws.ts`, `game.ts`, `gameHub.ts::applyInput`, web play snapshot handler |
| The server is the sole authority for game rules, scores, phases, room membership, matchmaking, and persisted outcomes. | `7d3437c49152` authoritative snapshot/result shape | `0595a386000a` producer validation, `1567f5005ef8` stale input rejection | 해당 없음 | 해당 없음 | `f655969b0d36` contract evidence | shared schemas + GameHub input mutation path |

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| client만 runtime 검증, server는 compile-time type | `7d3437...` strict models → `0595a3...` symmetric codec | `f65596...` negative tests | 양방향 version-one compatibility boundary |
| valid하지만 stale input이 최신 intent를 덮음 | `1567f5...` per-client/per-room sequence gate | code inspection; later InputGate tests | authoritative input state monotonic |
| delayed snapshot이 UI를 과거로 되돌림 | `8a8787...` browser last-sequence gate | browser reducer/page tests | rendered state monotonic |

## 8. Ownership / state / responsibility 변화

| 축 | 초기 SHA의 owner/state | 중간 전환 | Thread 최종 owner/state | 해제·cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| wire vocabulary/schema | 각 call site/TS type | `a974f8...` client schema, `7d3437...` game schema | `0595a3...` shared strict v1 codec | stateless | `packages/shared/src/ws.ts`, `game.ts` |
| input ordering | 없음 | `1567f5...` client map keyed room | GameHub connection state | client disconnect/replacement 시 map 폐기 | `gameHub.ts::lastInputSequenceByRoom/applyInput` |
| snapshot ordering | arrival order | `8a8787...` sequence ref | browser connection instance | new connection setup/cleanup에서 reset | `apps/web/src/app/play/page.tsx` |
| persistence result meaning | loose interface | `7d3437...` discriminated union | shared schema | stateless | `persistedGameFinishedSchema` |

## 9. Thread 최종 상태

- 최종 authoritative owner: shared package가 wire schema/codec을, GameHub가 authoritative input admission을, browser connection이 rendered snapshot admission을 소유합니다.
- 최종 상태/invariant: version-one strict message만 수용되고 accepted input 및 rendered snapshot sequence는 각 lifetime 안에서 감소하지 않습니다.
- 남아 있는 의도적 제한 또는 비보장: sequence gap을 복구하지 않고, reconnect 전후 sequence continuity와 actual delivery rate는 이 Thread만으로 보장하지 않습니다.
- 후속 Thread가 의존하는 contract: server producer와 browser consumer는 동일 shared schemas를 사용하며 persisted/transient 결과 조합도 wire에서 강제됩니다.
- 대표 코드 근거: `0595a386000a packages/shared/src/ws.ts`, `1567f5005ef8 apps/api/src/gameHub.ts`, `8a8787d03a19 apps/web/src/app/play/page.tsx`, `f655969b0d36 ws.test.ts`

## 10. 최종 architecture 또는 execution flow 정리

```text
[Browser command {v:1,inputSeq,...}]
    ↓  shared parseClientEvent
[GameHub room/phase/side + monotonic sequence check]
    ↓
[authoritative intent/state mutation]
    ↓  encodeServerEvent validates v1 strict snapshot
[WebSocket delivery]
    ↓  browser parseServerEvent + sequence > last
[nested snapshot.state 렌더링 또는 stale drop]
```

- schema validation은 구조 호환성을, sequence gate는 시간 순서를 담당합니다.
- persisted discriminator는 UI가 durable match와 transient result를 혼동하지 않게 합니다.

## 11. 학습 완료 자가 점검

- [x] Commit map의 모든 SHA를 원문 순서대로 확인했습니다.
- [x] 각 commit의 subject, importance, tags를 변경하지 않았습니다.
- [x] S/A/B 깊이를 구분해 코드 근거를 남겼습니다.
- [x] final HEAD의 구현을 과거 SHA에 소급하지 않았습니다.
- [x] 핵심 상태 필드, caller/callee, ownership, failure branch, cleanup을 실제 코드로 확인했습니다.
- [x] Fix를 기존 가정 → failure/risk → root cause → decision → code → regression 순서로 연결했습니다.
- [x] Test commit에서 production invariant, failure, technique, path, 증명/비증명 범위를 구분했습니다.
- [x] Thread 최종 execution flow를 별도 프로젝트 재학습 없이 설명할 수 있습니다.
