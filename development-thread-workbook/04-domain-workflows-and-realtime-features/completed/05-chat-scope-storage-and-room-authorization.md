# 채팅 scope 저장 불변식과 경기방 권한

원문 Development Thread: `Chat scope storage and room authorization`

## 1. Thread 목표

- lobby와 match chat의 scope/room 조합을 wire schema, repository validation, migration/DB CHECK에서 같은 규칙으로 강제하는 과정을 추적합니다.
- match chat을 보내는 client가 실제 현재 room 좌석인지 저장 전 검사하고 audience를 해당 room으로 제한하는 경로를 복원합니다.
- 브라우저가 현재 active room과 정확히 일치하는 match message만 받아들이는 마지막 방어선을 확인합니다.

### Source에서 확정된 significance

> Chat scope is a security and data-integrity boundary, not a display label. A syntactically valid room ID does not prove membership, and server broadcast discipline does not eliminate the need for storage constraints or client filtering. The history layers the invariant across wire, repository, database, hub authorization, and browser state.

### 직접 연결되는 Critical Invariants

> Lobby chat has no room; match chat has a non-null UUID room. Invalid combinations are rejected before or at persistence and legacy rows are cleaned before the constraint is installed.
>
> A match message is persisted and broadcast only when the sender currently occupies a seat in that exact room; a client reducer accepts only messages for its active room.

### 직접 연결되는 Major Engineering Difficulties

> Expressing a discriminated payload rule in JSON schema/TypeScript, application validation, and SQL CHECK without allowing different edge cases.
>
> Proving rejection occurs before persistence and proving normal delivery is limited to one room while lobby delivery remains global.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- wire schema는 lobby payload의 `roomId` 부재와 match payload의 UUID를 어떤 discriminated union으로 표현합니까?
- migration 006은 기존 lobby/match/unknown row를 어떤 순서로 정규화·삭제한 뒤 CHECK를 설치합니까?
- `assertChatRoom`이 PostgreSQL과 memory 양쪽에 필요한 이유는 무엇입니까?
- GameHub는 room 존재, `client.roomId`, `sideFor`를 저장 호출 전에 어떤 순서로 검사합니까?
- cross-room test는 persistence spy, error event, audience event를 어떻게 함께 관찰합니까?
- `isChatForActiveRoom`은 다른 room, lobby scope, active room 없음 각각을 어떻게 처리합니까?

## 3. 완료 기준

- wire→repository→database의 scope-room invariant를 허용/거부 표로 정리할 수 있습니다.
- storage validity와 sender authorization이 다른 문제인 이유를 설명할 수 있습니다.
- cross-room 주입이 persistence 전에 멈추고 정상 match/lobby delivery가 다른 audience를 갖는 근거를 제시할 수 있습니다.
- client filter가 server authorization을 대체하지 않지만 stale/misrouted event의 UI 오염을 막는 이유를 설명할 수 있습니다.
- Commit map의 모든 SHA를 지정 브랜치 ancestry와 source classification에서 확인합니다.
- 각 SHA의 parent 또는 직전 관련 SHA와 비교해 변경 전후 상태를 구분합니다.
- 실행한 명령과 코드 검사만으로 확인한 사실을 구분하고 실행하지 않은 test를 통과했다고 기록하지 않습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `00d0d7941382` | `fix(protocol): 채팅 scope와 room 식별자 조합 제한` | A | PROTOCOL, REALTIME, WEB | Defines scope-specific chat payloads so lobby messages cannot identify a room and match messages require a UUID room. |
| 2 | `5a3819aec8d0` | `test(protocol): 채팅 scope와 room 조합 검증` | B | AUTH, PROTOCOL, REALTIME | Pins valid scope-room combinations at the WebSocket parse boundary. |
| 3 | `2ff750fa4ff8` | `fix(db): 채팅 행의 scope와 room 불변식 강제` | A | REALTIME, PERSISTENCE, RISK | Cleans legacy rows and enforces the chat scope-room invariant in both repository implementations and PostgreSQL. |
| 4 | `1cead7cc9f35` | `test(db): 채팅 저장 불변식 검증` | B | REALTIME, PERSISTENCE, TEST | Verifies repository rejection, migration cleanup, SQL constraint enforcement, and migration idempotency. |
| 5 | `7759eef59b67` | `fix(game): 매치 채팅의 좌석과 audience 검증` | A | REALTIME, PERSISTENCE, RISK | Rejects match chat unless the sender currently occupies a seat in that exact room, before persistence. |
| 6 | `4a98bd1e4f22` | `test(game): 타 경기방 채팅 주입 차단 검증` | B | REALTIME, TEST | Verifies cross-room rejection before persistence and room-scoped versus global delivery. |
| 7 | `85edd6d1e26a` | `fix(web): 현재 경기방의 채팅만 표시` | B | REALTIME, WEB | Filters incoming chat so the game reducer accepts only match messages for the current active room. |
| 8 | `02775797ab63` | `test(web): 매치 채팅 room filtering 검증` | B | REALTIME, WEB, TEST | Pins the pure active-room chat filter. |

## 5. Commit별 학습 기록

### 5.1. `fix(protocol): 채팅 scope와 room 식별자 조합 제한`

| 항목 | 값 |
| --- | --- |
| SHA | `00d0d7941382` |
| Importance | A |
| Tags | PROTOCOL, REALTIME, WEB |
| 학습 깊이 | 주요 subsystem, 구현 경로, ownership/failure/non-guarantee를 구체적으로 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Defines scope-specific chat payloads so lobby messages cannot identify a room and match messages require a UUID room.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `packages/shared/src/ws.ts`의 `chat.send` discriminated variants
- lobby strict object와 match `roomId: z.string().uuid()`
- body trim/min/max 규칙
- GameHub/web caller payload 수정
- parent 상태와 비교해 이전 가정, 새 boundary, caller/callee, ownership 또는 failure path를 기록합니다.
- 이 commit이 보장하지 않는 상태와 다음 fix/test가 보강하는 지점을 구분합니다.
- Fix chain을 `이전 가정 → 실제 실패/위험 → root cause → 교정된 결정 → 남는 비보장` 순서로 복원합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:00d0d7941382 -->
- **직전 상태:** 하나의 chat event가 `scope`와 optional `roomId`를 독립 필드로 가져 lobby+room, match+missing room 같은 조합이 타입/parse를 통과할 수 있었습니다.
- **구현 결정:** `scope: "lobby"` variant는 room 필드를 갖지 않는 strict object로, `scope: "match"` variant는 UUID room을 필수로 하는 discriminated union으로 분리합니다. body는 trim 후 1–240자입니다.
- **상태/소유권 변화:** wire contract가 허용 상태 공간을 줄이고 caller는 lobby에 room을 보내지 않으며 GameHub는 저장 시 null로 정규화합니다.
- **실패/edge:** UUID 형식은 room 존재나 sender membership을 증명하지 않습니다. 저장 layer를 직접 호출하는 코드도 protocol parser를 거치지 않을 수 있습니다.
- **보장/비보장:** parse된 payload의 scope-room 형태는 보장하지만 storage/auth는 후속 commits가 담당합니다.
- **다음 연결:** `5a3819aec8d0`이 모든 invalid 조합을 table-driven test로 고정합니다.
<!-- LEARNER-ANSWER END commit:00d0d7941382 -->

비교 기준:
- 이 commit의 parent와 비교합니다.
- 다음 Thread 관련 SHA: `5a3819aec8d0` — `test(protocol): 채팅 scope와 room 조합 검증`

### 5.2. `test(protocol): 채팅 scope와 room 조합 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `5a3819aec8d0` |
| Importance | B |
| Tags | AUTH, PROTOCOL, REALTIME |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Pins valid scope-room combinations at the WebSocket parse boundary.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `packages/shared/src/ws.test.ts`의 `it.each` invalid payload table
- lobby null/present room, match missing/null/non-UUID cases
- `parseClientEvent(JSON.stringify(payload))` rejection
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.
- Test technique, failure/boundary fixture, production path, proves/does-not-prove를 실제 assertion으로 구분합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:5a3819aec8d0 -->
- **직전 상태:** schema는 분리됐지만 optional/unknown-key behavior가 바뀌어 invalid 조합이 다시 허용돼도 감지할 test가 없었습니다.
- **기법:** lobby에 null room, lobby에 UUID room, match에 room 없음/null/non-UUID를 각각 serialize해 parser가 throw하는지 확인합니다.
- **생산 경로:** 실제 client-event parser와 Zod schema를 사용합니다.
- **증명/비증명:** wire rejection을 검증하지만 repository direct call, DB row, current room membership은 검증하지 않습니다.
- **보장:** protocol layer의 허용 상태 공간을 고정합니다.
- **다음 연결:** `2ff750fa4ff8`이 같은 invariant를 저장 경계와 기존 데이터에 적용합니다.
<!-- LEARNER-ANSWER END commit:5a3819aec8d0 -->

비교 기준:
- 직전 Thread 관련 SHA: `00d0d7941382` — `fix(protocol): 채팅 scope와 room 식별자 조합 제한`
- 다음 Thread 관련 SHA: `2ff750fa4ff8` — `fix(db): 채팅 행의 scope와 room 불변식 강제`

### 5.3. `fix(db): 채팅 행의 scope와 room 불변식 강제`

| 항목 | 값 |
| --- | --- |
| SHA | `2ff750fa4ff8` |
| Importance | A |
| Tags | REALTIME, PERSISTENCE, RISK |
| 학습 깊이 | 주요 subsystem, 구현 경로, ownership/failure/non-guarantee를 구체적으로 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Cleans legacy rows and enforces the chat scope-room invariant in both repository implementations and PostgreSQL.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/migrations/006_chat_invariants.sql`의 update/delete/check 순서
- `packages/db/src/index.ts`의 `assertChatRoom`
- PostgreSQL/memory `createChatMessage` 호출 위치
- `chat_messages_scope_room_check` UUID regex
- parent 상태와 비교해 이전 가정, 새 boundary, caller/callee, ownership 또는 failure path를 기록합니다.
- 이 commit이 보장하지 않는 상태와 다음 fix/test가 보강하는 지점을 구분합니다.
- Fix chain을 `이전 가정 → 실제 실패/위험 → root cause → 교정된 결정 → 남는 비보장` 순서로 복원합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:2ff750fa4ff8 -->
- **직전 가정:** 모든 chat write가 protocol parser를 통과하므로 DB에는 올바른 조합만 들어간다고 봤습니다.
- **실제 위험:** HTTP/내부 repository caller나 기존 데이터는 lobby+room, match+null/non-UUID, unknown scope를 저장할 수 있었습니다.
- **교정:** migration은 lobby row의 room을 null로 정규화하고 unknown scope 및 invalid match rows를 삭제한 뒤 `(lobby and room is null) or (match and UUID room)` CHECK를 설치합니다. 양 repository는 SQL 전 `assertChatRoom`을 호출합니다.
- **상태/소유권 변화:** application과 DB가 같은 invariant를 독립적으로 강제합니다. migration은 constraint 설치가 실패하지 않도록 기존 데이터의 운명도 명시합니다.
- **보장/비보장:** 공식 repository와 direct SQL 모두 invalid row를 거부하지만 sender가 그 room에 속하는지는 저장 형태와 별도 authorization 문제입니다.
- **다음 연결:** `1cead7cc9f35`가 memory rejection, legacy cleanup, migration idempotency, DB CHECK를 실제 test로 묶습니다.
<!-- LEARNER-ANSWER END commit:2ff750fa4ff8 -->

비교 기준:
- 직전 Thread 관련 SHA: `5a3819aec8d0` — `test(protocol): 채팅 scope와 room 조합 검증`
- 다음 Thread 관련 SHA: `1cead7cc9f35` — `test(db): 채팅 저장 불변식 검증`

### 5.4. `test(db): 채팅 저장 불변식 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `1cead7cc9f35` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE, TEST |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Verifies repository rejection, migration cleanup, SQL constraint enforcement, and migration idempotency.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.test.ts`의 invalid lobby/match cases
- `packages/db/src/postgres.integration.test.ts`의 005→006 legacy fixture
- migrate twice, expected surviving rows, SQLSTATE `23514`, migration count 1
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.
- Test technique, failure/boundary fixture, production path, proves/does-not-prove를 실제 assertion으로 구분합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:1cead7cc9f35 -->
- **직전 상태:** 저장 invariant는 구현됐지만 legacy row 정리와 CHECK가 실제 PostgreSQL에서 의도대로 함께 작동한다는 근거가 없었습니다.
- **기법:** memory repository에 세 invalid 조합을 직접 전달해 reject를 확인합니다. PostgreSQL은 migration 005 상태에 good/bad rows를 넣고 006을 두 번 실행한 뒤 정규화된 lobby 2개와 valid match 1개만 남는지 확인합니다. 이후 invalid direct INSERT가 `23514`인지, migration record가 한 번인지 검사합니다.
- **생산 경로:** repository validation과 실제 migration/constraint를 모두 통과합니다.
- **증명/비증명:** stored-row invariant와 migration 재실행 안전성을 검증하지만 room membership authorization은 검증하지 않습니다.
- **보장:** protocol을 우회한 write와 legacy 오염에 대한 방어를 회귀로 고정합니다.
- **다음 연결:** `7759eef59b67`이 유효한 UUID room을 악용한 cross-room sender를 차단합니다.
<!-- LEARNER-ANSWER END commit:1cead7cc9f35 -->

비교 기준:
- 직전 Thread 관련 SHA: `2ff750fa4ff8` — `fix(db): 채팅 행의 scope와 room 불변식 강제`
- 다음 Thread 관련 SHA: `7759eef59b67` — `fix(game): 매치 채팅의 좌석과 audience 검증`

### 5.5. `fix(game): 매치 채팅의 좌석과 audience 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `7759eef59b67` |
| Importance | A |
| Tags | REALTIME, PERSISTENCE, RISK |
| 학습 깊이 | 주요 subsystem, 구현 경로, ownership/failure/non-guarantee를 구체적으로 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Rejects match chat unless the sender currently occupies a seat in that exact room, before persistence.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/gameHub.ts`의 `chat.send` match branch
- `rooms.get`, `client.roomId`, `sideFor` authorization
- `forbidden` error와 early return
- lobby null-room write와 global broadcast
- parent 상태와 비교해 이전 가정, 새 boundary, caller/callee, ownership 또는 failure path를 기록합니다.
- 이 commit이 보장하지 않는 상태와 다음 fix/test가 보강하는 지점을 구분합니다.
- Fix chain을 `이전 가정 → 실제 실패/위험 → root cause → 교정된 결정 → 남는 비보장` 순서로 복원합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:7759eef59b67 -->
- **직전 가정:** parser가 UUID를 요구하고 repository가 valid row를 저장하면 match chat은 안전하다고 봤습니다.
- **실제 공격/오류:** 다른 active room의 UUID를 아는 사용자가 자신의 room이 아닌 곳에 message를 저장·broadcast할 수 있었습니다.
- **교정:** event room을 조회하고 room 존재, `client.roomId === room.id`, `sideFor(room, client)`를 모두 만족할 때만 `createChatMessage`를 호출합니다. 실패는 `forbidden`을 sender에게 보내고 return합니다.
- **상태/소유권 변화:** current seat membership은 GameHub의 room/client state가 authority이며 repository는 형태만 검증합니다. match audience는 `broadcastRoom`, lobby audience는 `broadcastAll`입니다.
- **보장/비보장:** cross-room write와 delivery를 server에서 막지만 browser가 stale room event를 local state에 넣는 문제는 별도입니다.
- **다음 연결:** `4a98bd1e4f22`가 rejection-before-persistence와 audience 범위를 두 room으로 검증합니다.
<!-- LEARNER-ANSWER END commit:7759eef59b67 -->

비교 기준:
- 직전 Thread 관련 SHA: `1cead7cc9f35` — `test(db): 채팅 저장 불변식 검증`
- 다음 Thread 관련 SHA: `4a98bd1e4f22` — `test(game): 타 경기방 채팅 주입 차단 검증`

### 5.6. `test(game): 타 경기방 채팅 주입 차단 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `4a98bd1e4f22` |
| Importance | B |
| Tags | REALTIME, TEST |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Verifies cross-room rejection before persistence and room-scoped versus global delivery.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/gameHub.chat.test.ts`의 two-room fake socket setup
- `createChatMessage` spy
- cross-room forbidden/no-call/no-chat assertions
- normal room A only 및 lobby all-client cases
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.
- Test technique, failure/boundary fixture, production path, proves/does-not-prove를 실제 assertion으로 구분합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:4a98bd1e4f22 -->
- **직전 상태:** authorization fix는 있었지만 저장 전 차단인지, 정상 room audience가 다른 room과 분리되는지, lobby가 여전히 global인지 함께 증명한 test가 없었습니다.
- **실패 주입:** room B 좌석의 client가 room A UUID로 match message를 보냅니다.
- **관찰:** room IDs가 다름, repository spy 미호출, sender의 forbidden, 전체 socket의 chat event 0을 확인합니다. 정상 room A message는 A의 두 socket만 받고 B는 0, lobby message는 null room으로 저장되고 모든 socket이 받습니다.
- **생산 경로:** 실제 GameHub queue pairing, room creation, event parser/handler/broadcast를 fake WebSocket으로 실행합니다.
- **증명/비증명:** server authorization/audience를 결정적으로 검증하지만 browser reducer filtering은 포함하지 않습니다.
- **다음 연결:** `85edd6d1e26a`가 client active-room filter를 추가합니다.
<!-- LEARNER-ANSWER END commit:4a98bd1e4f22 -->

비교 기준:
- 직전 Thread 관련 SHA: `7759eef59b67` — `fix(game): 매치 채팅의 좌석과 audience 검증`
- 다음 Thread 관련 SHA: `85edd6d1e26a` — `fix(web): 현재 경기방의 채팅만 표시`

### 5.7. `fix(web): 현재 경기방의 채팅만 표시`

| 항목 | 값 |
| --- | --- |
| SHA | `85edd6d1e26a` |
| Importance | B |
| Tags | REALTIME, WEB |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Filters incoming chat so the game reducer accepts only match messages for the current active room.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/game/chatScope.ts`의 `isChatForActiveRoom`
- `apps/web/src/game/useGameConnection.ts`의 `chat.message` 분기
- dispatch 전 `stateRef.current.roomId` 비교
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.
- Fix chain을 `이전 가정 → 실제 실패/위험 → root cause → 교정된 결정 → 남는 비보장` 순서로 복원합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:85edd6d1e26a -->
- **직전 상태:** server가 room broadcast를 지켜도 reconnect/race/misrouted event가 들어오면 hook이 모든 `chat.message`를 현재 panel에 넣었습니다.
- **구현 결정:** active room이 non-null이고 message scope가 match이며 `message.roomId === activeRoomId`일 때만 reducer dispatch를 허용하는 pure function을 추가했습니다.
- **상태/소유권 변화:** browser connection state가 현재 화면 audience의 마지막 수용 기준이 됩니다.
- **실패/edge:** client filter는 보안 경계가 아니며 악성 sender의 저장을 막지 못합니다. lobby message도 game panel에서는 의도적으로 버립니다.
- **보장/비보장:** 현재 room panel의 local contamination을 막지만 server auth를 대체하지 않습니다.
- **다음 연결:** `02775797ab63`이 current/other/lobby/no-active 네 조합을 고정합니다.
<!-- LEARNER-ANSWER END commit:85edd6d1e26a -->

비교 기준:
- 직전 Thread 관련 SHA: `4a98bd1e4f22` — `test(game): 타 경기방 채팅 주입 차단 검증`
- 다음 Thread 관련 SHA: `02775797ab63` — `test(web): 매치 채팅 room filtering 검증`

### 5.8. `test(web): 매치 채팅 room filtering 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `02775797ab63` |
| Importance | B |
| Tags | REALTIME, WEB, TEST |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Pins the pure active-room chat filter.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/game/chatScope.test.ts`
- current match true
- other match, lobby, no active room false
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.
- Test technique, failure/boundary fixture, production path, proves/does-not-prove를 실제 assertion으로 구분합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:02775797ab63 -->
- **직전 상태:** pure filter는 있었지만 조건 하나가 느슨해지는 regression을 막을 test가 없었습니다.
- **기법:** 고정 UUID 두 개와 helper로 만든 `ChatMessage`를 사용해 현재 match만 true이고 다른 room/lobby/active null은 false인지 검사합니다.
- **생산 경로:** network 없이 production pure predicate를 직접 실행합니다.
- **증명/비증명:** browser 수용 규칙을 정확히 검증하지만 server broadcast/authorization과 storage는 별도 tests가 담당합니다.
- **보장:** scope·room·active state 세 조건을 모두 요구합니다.
- **Thread 종료:** wire, storage, authorization, audience, browser state가 같은 room semantics를 각 책임 범위에서 강제합니다.
<!-- LEARNER-ANSWER END commit:02775797ab63 -->

비교 기준:
- 직전 Thread 관련 SHA: `85edd6d1e26a` — `fix(web): 현재 경기방의 채팅만 표시`
- 이 commit을 Thread의 마지막 상태로 사용합니다.

## 6. Thread 종합

다음 항목을 commit 순서에서 재구성합니다: invariant evolution, Failure → Fix → Test 관계, ownership/state 변화, 최종 실행 흐름, 비보장, 실제 실행 증거.

<!-- LEARNER-ANSWER START thread:05-chat-scope-storage-and-room-authorization.md:synthesis -->
- **불변식 진화:** 초기 chat contract는 `scope`와 optional room의 잘못된 조합을 표현할 수 있었습니다. `00d0d7941382`가 wire union을 lobby/no-room과 match/UUID-room으로 분리하고 `5a3819aec8d0`이 반례를 고정했습니다. `2ff750fa4ff8`은 같은 규칙을 repository와 DB CHECK로 내리고 legacy rows를 정리했으며 `1cead7cc9f35`가 memory/실제 migration을 검증했습니다. `7759eef59b67`은 syntactically valid room ID만으로 부족하므로 실제 seat membership을 저장 전에 확인합니다. web은 `85edd6d1e26a`에서 active room filter를 추가합니다.
- **소유권:** shared protocol은 wire shape, repository/DB는 stored row validity, GameHub는 current room membership과 broadcast audience, browser connection state는 현재 화면에 수용할 room을 소유합니다. 어느 한 layer도 다른 layer의 책임을 대신하지 않습니다.
- **Failure → Fix → Test:** invalid scope-room payload → discriminated schema → table-driven negative test. legacy/우회 저장 → migration + `assertChatRoom` + CHECK → cleanup/idempotent migration/SQLSTATE 23514 test. cross-room sender → seat check before persistence → two-room fake-socket test. stale/misrouted client event → pure room filter → four-case unit test.
- **최종 흐름:** parser가 payload 조합을 검증 → GameHub가 current room/seat를 authorization → repository가 동일 invariant를 다시 검사 → DB CHECK가 direct/legacy invalid row를 거부 → 성공 record만 해당 room audience에 broadcast → browser가 active room 일치 여부를 확인 후 reducer에 넣습니다. lobby는 room null로 저장하고 global audience에 전달됩니다.
- **비보장:** 이 Thread는 message content moderation, rate limiting, end-to-end encryption, multi-process room routing을 제공하지 않습니다.
- **실행 증거:** exact test/migration code를 검사했지만 Vitest/PostgreSQL integration을 실행하지 않았습니다.
<!-- LEARNER-ANSWER END thread:05-chat-scope-storage-and-room-authorization.md:synthesis -->

## 7. 학습 완료 확인

<!-- LEARNER-ANSWER START thread:05-chat-scope-storage-and-room-authorization.md:checklist -->
- [x] 모든 SHA를 지정 브랜치의 exact commit으로 검사했습니다.
- [x] fixed commit map과 source classification을 보존했습니다.
- [x] earlier commit을 later HEAD 코드로 설명하지 않았습니다.
- [x] fix와 test를 원래 failure/production path에 연결했습니다.
- [x] 실제 실행하지 않은 test를 통과했다고 기록하지 않았습니다.
- [x] Thread 최종 owner, invariant, flow, non-guarantee를 작성했습니다.
<!-- LEARNER-ANSWER END thread:05-chat-scope-storage-and-room-authorization.md:checklist -->
