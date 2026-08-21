# 로비 접속 상태·채팅과 실시간 지표

원문 Development Thread: `Lobby presence, chat, and live statistics`

## 1. Thread 목표

- 저장되는 로비 채팅과 GameHub가 계산하는 접속·대기열·room 지표의 서로 다른 authority를 추적합니다.
- HTTP 채팅 쓰기, WebSocket 실시간 반영, presence refresh가 web 화면에 결합되는 순서를 복원합니다.
- sample fallback, body 누락, 저장 계정 기반 online 표시, WebSocket open 직후 즉시 가시성 가정을 각각 어떻게 교정했는지 확인합니다.

### Source에서 확정된 significance

> The lobby combines durable chat history with ephemeral process state. Treating the database as presence authority, treating sample data as fallback truth, or assuming immediate propagation after WebSocket open all produce misleading state. The history separates these owners and adapts the tests to eventual visibility.

### 직접 연결되는 Critical Invariants

> Lobby chat history is repository-backed, while online users, queued users, active rooms, and wait samples are derived from the live GameHub process.
>
> UI and tests tolerate asynchronous presence propagation without replacing failed server reads with fabricated data.

### 직접 연결되는 Major Engineering Difficulties

> Merging an initial HTTP snapshot with later WebSocket events without duplicating chat or leaking socket lifecycle.
>
> Testing presence that becomes visible asynchronously while still using deterministic time bounds and explicit failure.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- `listLobbyChat`는 최신 20개를 SQL에서 어떤 순서로 읽고 caller에는 어떤 순서로 반환합니까?
- GameHub는 connected/playing/queued/room/wait sample을 어떤 in-memory 자료구조에서 계산합니까?
- HTTP `/chat/lobby`는 body 누락, trim 후 empty, 240자 초과를 각각 어떻게 처리합니까?
- web lobby는 HTTP initial load와 WebSocket `chat.message`/`presence.changed`를 어떻게 합칩니까?
- `onlinePlayers` authority가 repository에서 GameHub로 이동하면서 비접속 저장 계정이 왜 사라집니까?
- smoke test는 WebSocket open과 HTTP presence visibility 사이의 eventual delay를 어떻게 기다립니까?

## 3. 완료 기준

- durable chat와 ephemeral presence/statistics의 owner를 구분해 호출 흐름을 그릴 수 있습니다.
- HTTP chat write와 WebSocket chat delivery가 같은 repository record를 어떻게 공유하는지 설명할 수 있습니다.
- body 없는 요청의 실제 failure 원인과 nullish normalization fix를 지적할 수 있습니다.
- presence test가 즉시 assertion에서 bounded polling으로 바뀐 이유와 비보장을 설명할 수 있습니다.
- Commit map의 모든 SHA를 지정 브랜치 ancestry와 source classification에서 확인합니다.
- 각 SHA의 parent 또는 직전 관련 SHA와 비교해 변경 전후 상태를 구분합니다.
- 실행한 명령과 코드 검사만으로 확인한 사실을 구분하고 실행하지 않은 test를 통과했다고 기록하지 않습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `a6fa5a187eec` | `feat(db): 채팅 메시지 저장 구현` | B | REALTIME, PERSISTENCE | Extends the repository with persistent lobby and match chat messages. |
| 2 | `dabd8d5c2a49` | `feat(game): 실시간 경기 채팅 전달` | B | PROTOCOL, REALTIME, PERSISTENCE | Persists WebSocket chat commands and broadcasts the resulting message. |
| 3 | `1d9aa3902614` | `feat(lobby): 실시간 로비 지표 API 추가` | B | REALTIME | Makes the GameHub expose live connected, playing, queued, room, and recent wait metrics. |
| 4 | `de9a173e6eb1` | `feat(chat): 쓰기 가능한 로비 채팅 API 추가` | B | REALTIME, PERSISTENCE | Adds an authenticated HTTP endpoint for validated lobby chat writes. |
| 5 | `e0ef3fec89a6` | `feat(chat): 로비 채팅 입력 화면 추가` | B | WEB | Adds a controlled lobby-chat form and appends accepted messages to bounded history. |
| 6 | `4f9b3b312d0e` | `fix(lobby): 로비 상태 표현 개선` | B | REALTIME | Displays server-provided lobby statistics instead of fixed activity and wait-time claims. |
| 7 | `8ce1199ffd12` | `fix(api): body 없는 로비 채팅 요청 처리` | B | - | Normalizes a missing lobby-chat request body to an empty object before reading the optional message. |
| 8 | `8078ac6f92ba` | `test(app): 실시간 지표·채팅·경기 기록 검증` | B | REALTIME, PERSISTENCE, WEB | Expands application coverage for lobby metrics, authenticated chat persistence, chat attribution, and recent-match ordering. |
| 9 | `cd3787eefd6a` | `feat(chat): 로비 채팅과 접속 상태 실시간 반영` | B | AUTH, REALTIME, WEB | Opens an authenticated lobby WebSocket and merges chat/presence events with the HTTP snapshot. |
| 10 | `8debb1ea3ad3` | `feat(lobby): 연결 중인 WebSocket 사용자 목록 추가` | B | REALTIME | Makes the realtime hub, not persistent account storage, the authority for lobby presence. |
| 11 | `c3ff9ed2402f` | `test(lobby): WebSocket 사용자 목록 검증` | B | REALTIME, PERSISTENCE, TEST | Verifies that the lobby reports no online players when the realtime hub has no WebSocket clients. |
| 12 | `23a978879b81` | `test(smoke): WebSocket 접속 상태 반영 대기` | B | REALTIME, OPERATIONS, TEST | Changes the smoke test from an immediate presence assertion to bounded asynchronous polling. |

## 5. Commit별 학습 기록

### 5.1. `feat(db): 채팅 메시지 저장 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `a6fa5a187eec` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Extends the repository with persistent lobby and match chat messages.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.ts`의 `createChatMessage`, `listLobbyChat`
- PostgreSQL sender join과 latest-20-desc 후 reverse
- memory chat collection/filter/slice
- `packages/db/src/rowMappers.ts`의 `toChatMessage`
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:a6fa5a187eec -->
- **직전 상태:** chat은 realtime 화면/event 개념만 있고 sender와 scope를 가진 durable history가 없었습니다.
- **구현 결정:** lobby/match scope, optional room, sender ID, body, timestamp를 repository에 저장하고 lobby read는 최신 20개를 고른 뒤 오래된 것부터 보이도록 reverse합니다.
- **상태/소유권 변화:** chat identity/body/history는 repository가 소유하고 realtime hub는 전달자가 됩니다.
- **실패/edge:** 이 시점에는 scope와 room 조합을 강제하지 않아 lobby row에 room이 있거나 match row에 room이 없는 입력을 막지 못합니다.
- **보장/비보장:** sender projection과 bounded lobby history는 제공하지만 authorization과 DB invariant는 Thread 05 전까지 없습니다.
- **다음 연결:** `dabd8d5c2a49`가 WebSocket `chat.send`를 이 저장 경계에 연결합니다.
<!-- LEARNER-ANSWER END commit:a6fa5a187eec -->

비교 기준:
- 이 commit의 parent와 비교합니다.
- 다음 Thread 관련 SHA: `dabd8d5c2a49` — `feat(game): 실시간 경기 채팅 전달`

### 5.2. `feat(game): 실시간 경기 채팅 전달`

| 항목 | 값 |
| --- | --- |
| SHA | `dabd8d5c2a49` |
| Importance | B |
| Tags | PROTOCOL, REALTIME, PERSISTENCE |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Persists WebSocket chat commands and broadcasts the resulting message.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/gameHub.ts`의 async `receive`
- `chat.send` 분기와 `repo.createChatMessage`
- `broadcastRoom`/`broadcastAll` 선택
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:dabd8d5c2a49 -->
- **직전 상태:** repository chat API는 있었지만 WebSocket client event가 이를 호출하지 않았습니다.
- **구현 결정:** `chat.send`를 받으면 인증된 client user ID로 먼저 message를 저장하고, match면 room, lobby면 모든 연결에 persisted message를 broadcast합니다.
- **상태/소유권 변화:** message ID/timestamp/sender는 repository 결과가 authority이고 hub는 그 결과를 전달합니다.
- **실패/edge:** match branch는 event가 말한 room을 그대로 사용해 current seat/room authorization이 없고 scope-room 조합도 느슨합니다.
- **보장/비보장:** 저장 후 broadcast 순서는 갖지만 cross-room injection 방지는 Thread 05에서 추가됩니다.
- **다음 연결:** `1d9aa3902614`가 같은 GameHub의 live lobby stats를 노출합니다.
<!-- LEARNER-ANSWER END commit:dabd8d5c2a49 -->

비교 기준:
- 직전 Thread 관련 SHA: `a6fa5a187eec` — `feat(db): 채팅 메시지 저장 구현`
- 다음 Thread 관련 SHA: `1d9aa3902614` — `feat(lobby): 실시간 로비 지표 API 추가`

### 5.3. `feat(lobby): 실시간 로비 지표 API 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `1d9aa3902614` |
| Importance | B |
| Tags | REALTIME |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Makes the GameHub expose live connected, playing, queued, room, and recent wait metrics.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/gameHub.ts`의 `QueueEntry.queuedAt`, wait sample collection
- `lobbyStats`/live stats getter
- 최근 최대 20개 wait sample과 rounded average seconds
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:1d9aa3902614 -->
- **직전 상태:** lobby는 저장 데이터 중심이라 현재 process의 queue와 room 상태를 수치로 제공하지 못했습니다.
- **구현 결정:** queue entry timestamp를 기록하고 match 시 wait sample을 남겨 connected clients, playing participants, queued clients, active rooms, 평균 대기 시간을 계산합니다.
- **상태/소유권 변화:** 실시간 지표 authority는 database가 아니라 GameHub in-memory maps/queue/wait samples입니다.
- **실패/edge:** sample이 없으면 average wait는 null이며 process restart 시 history는 사라집니다. 장기 통계가 아닙니다.
- **보장/비보장:** 현재 process snapshot과 bounded recent wait 평균만 보장합니다.
- **다음 연결:** `de9a173e6eb1`이 로비 채팅의 HTTP 쓰기 경로를 추가합니다.
<!-- LEARNER-ANSWER END commit:1d9aa3902614 -->

비교 기준:
- 직전 Thread 관련 SHA: `dabd8d5c2a49` — `feat(game): 실시간 경기 채팅 전달`
- 다음 Thread 관련 SHA: `de9a173e6eb1` — `feat(chat): 쓰기 가능한 로비 채팅 API 추가`

### 5.4. `feat(chat): 쓰기 가능한 로비 채팅 API 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `de9a173e6eb1` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Adds an authenticated HTTP endpoint for validated lobby chat writes.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- API route의 `/chat/lobby` handler
- request body cast, trim, empty/240-char 검사
- `repo.createChatMessage({ scope: "lobby", ... })`
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:de9a173e6eb1 -->
- **직전 상태:** lobby chat write는 WebSocket 경로에만 있고 socket이 없는 client의 HTTP fallback이 없었습니다.
- **구현 결정:** 인증 사용자의 body를 trim하고 empty 또는 240자 초과를 400으로 거부한 뒤 room 없는 lobby message를 저장해 반환합니다.
- **상태/소유권 변화:** HTTP와 WS가 같은 repository message record를 만들 수 있게 됩니다.
- **실패/edge:** `request.body` 자체가 undefined이면 `body.message` 접근 전에 TypeError가 나 intended 400이 아니라 내부 오류가 될 수 있습니다.
- **보장/비보장:** body가 객체인 정상 입력의 validation은 제공하지만 missing-body normalization은 `8ce1199ffd12`에서 수정됩니다.
- **다음 연결:** `e0ef3fec89a6`이 web form과 HTTP fallback을 연결합니다.
<!-- LEARNER-ANSWER END commit:de9a173e6eb1 -->

비교 기준:
- 직전 Thread 관련 SHA: `1d9aa3902614` — `feat(lobby): 실시간 로비 지표 API 추가`
- 다음 Thread 관련 SHA: `e0ef3fec89a6` — `feat(chat): 로비 채팅 입력 화면 추가`

### 5.5. `feat(chat): 로비 채팅 입력 화면 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `e0ef3fec89a6` |
| Importance | B |
| Tags | WEB |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Adds a controlled lobby-chat form and appends accepted messages to bounded history.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/page.tsx`의 `chatInput`/submit handler
- `sendLobbyChat` 호출
- 최대 20개 history 유지와 당시 sample initial/failure state
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:e0ef3fec89a6 -->
- **직전 상태:** lobby는 chat history를 표시만 하고 사용자가 입력할 form이 없었습니다.
- **구현 결정:** controlled input을 trim해 empty submit을 무시하고 HTTP API 반환 message를 history 뒤에 붙인 뒤 20개로 제한합니다.
- **상태/소유권 변화:** UI는 pending input과 local render list를 소유하지만 message 사실은 server response에서 옵니다.
- **실패/edge:** 당시 initial players/chat는 sample이며 load failure에도 sample 표시 메시지를 사용했습니다.
- **보장/비보장:** HTTP chat journey는 연결하지만 실시간 broadcast와 honest failure state는 후속 commit이 담당합니다.
- **다음 연결:** `4f9b3b312d0e`이 server stats를 화면에 반영하고 `cd3787eefd6a`가 WebSocket을 연결합니다.
<!-- LEARNER-ANSWER END commit:e0ef3fec89a6 -->

비교 기준:
- 직전 Thread 관련 SHA: `de9a173e6eb1` — `feat(chat): 쓰기 가능한 로비 채팅 API 추가`
- 다음 Thread 관련 SHA: `4f9b3b312d0e` — `fix(lobby): 로비 상태 표현 개선`

### 5.6. `fix(lobby): 로비 상태 표현 개선`

| 항목 | 값 |
| --- | --- |
| SHA | `4f9b3b312d0e` |
| Importance | B |
| Tags | REALTIME |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Displays server-provided lobby statistics instead of fixed activity and wait-time claims.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/page.tsx`의 lobby stats cards
- online/playing/queued/active room count
- averageWaitSeconds null 처리와 고정 30초/주간 문구 제거
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.
- Fix chain을 `이전 가정 → 실제 실패/위험 → root cause → 교정된 결정 → 남는 비보장` 순서로 복원합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:4f9b3b312d0e -->
- **직전 상태:** lobby는 server stats가 있어도 일부 고정 수치·“30초 미만” 같은 근거 없는 문구를 표시했습니다.
- **구현 결정:** API가 준 connected/playing/queued/room/average wait를 직접 표시하고 값이 없으면 측정 전 상태를 보여 줍니다.
- **상태/소유권 변화:** live metric 값은 GameHub가, 화면은 format만 소유합니다.
- **실패/edge:** 이 시점에도 sample initial state가 남아 request failure truthfulness는 완전하지 않습니다.
- **보장/비보장:** 성공 응답 시 고정 통계 fabrication을 제거합니다.
- **다음 연결:** `8ce1199ffd12`가 HTTP missing-body bug를 고치고 `8078ac6f92ba`가 지표/채팅 저장을 테스트합니다.
<!-- LEARNER-ANSWER END commit:4f9b3b312d0e -->

비교 기준:
- 직전 Thread 관련 SHA: `e0ef3fec89a6` — `feat(chat): 로비 채팅 입력 화면 추가`
- 다음 Thread 관련 SHA: `8ce1199ffd12` — `fix(api): body 없는 로비 채팅 요청 처리`

### 5.7. `fix(api): body 없는 로비 채팅 요청 처리`

| 항목 | 값 |
| --- | --- |
| SHA | `8ce1199ffd12` |
| Importance | B |
| Tags | - |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Normalizes a missing lobby-chat request body to an empty object before reading the optional message.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- 로비 chat route의 `(request.body ?? {})` destructuring
- trim/empty 400 validation path
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.
- Fix chain을 `이전 가정 → 실제 실패/위험 → root cause → 교정된 결정 → 남는 비보장` 순서로 복원합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:8ce1199ffd12 -->
- **직전 가정:** JSON request에는 항상 object body가 있다고 봤습니다.
- **실제 실패:** body가 없으면 validation 전에 property access TypeError가 나 400 계약을 우회했습니다.
- **교정:** nullish body를 빈 객체로 정규화해 `message`가 undefined가 되고 기존 trim/empty 검사로 400을 반환하게 합니다.
- **보장/비보장:** missing body가 의도한 client error로 수렴하지만 content-type parser 전체 동작을 바꾸지는 않습니다.
- **다음 연결:** `8078ac6f92ba`의 application tests가 chat write/read와 lobby contract를 함께 검증합니다.
<!-- LEARNER-ANSWER END commit:8ce1199ffd12 -->

비교 기준:
- 직전 Thread 관련 SHA: `4f9b3b312d0e` — `fix(lobby): 로비 상태 표현 개선`
- 다음 Thread 관련 SHA: `8078ac6f92ba` — `test(app): 실시간 지표·채팅·경기 기록 검증`

### 5.8. `test(app): 실시간 지표·채팅·경기 기록 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `8078ac6f92ba` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE, WEB |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Expands application coverage for lobby metrics, authenticated chat persistence, chat attribution, and recent-match ordering.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- API injection/e2e test의 초기 lobby stats
- authenticated `/chat/lobby` write-to-read
- memory repository chat sender/room 및 recent match 시간순 assertions
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.
- Test technique, failure/boundary fixture, production path, proves/does-not-prove를 실제 assertion으로 구분합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:8078ac6f92ba -->
- **직전 상태:** stats/chat 기능은 여러 layer에 걸쳤지만 초기 contract와 저장 결과를 연결한 regression coverage가 부족했습니다.
- **기법:** 초기 hub의 zero/empty stats를 확인하고 dev login 후 HTTP lobby chat을 쓰고 다시 읽습니다. memory repository에서는 lobby/match message의 sender·room attribution과 recent-match ordering을 검사합니다.
- **생산 경로:** API routing/auth/repository와 memory domain projection을 통과합니다.
- **증명/비증명:** 기능 조합을 검증하도록 작성됐지만 WebSocket presence의 eventual visibility와 cross-room auth는 별도 tests가 담당합니다.
- **보장:** 로비 read/write contract와 ordering regression을 넓게 감지합니다.
- **다음 연결:** `cd3787eefd6a`가 browser lobby를 WebSocket event에 연결합니다.
<!-- LEARNER-ANSWER END commit:8078ac6f92ba -->

비교 기준:
- 직전 Thread 관련 SHA: `8ce1199ffd12` — `fix(api): body 없는 로비 채팅 요청 처리`
- 다음 Thread 관련 SHA: `cd3787eefd6a` — `feat(chat): 로비 채팅과 접속 상태 실시간 반영`

### 5.9. `feat(chat): 로비 채팅과 접속 상태 실시간 반영`

| 항목 | 값 |
| --- | --- |
| SHA | `cd3787eefd6a` |
| Importance | B |
| Tags | AUTH, REALTIME, WEB |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Opens an authenticated lobby WebSocket and merges chat/presence events with the HTTP snapshot.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/page.tsx`의 user/token 준비 후 WebSocket open
- `chat.message` ID dedupe와 append
- `presence.changed` 시 `loadLobby`
- unmount/identity change socket cleanup 및 HTTP fallback
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:cd3787eefd6a -->
- **직전 상태:** lobby는 HTTP load/write만 사용해 다른 사용자의 chat과 presence 변화를 새로고침 없이 보지 못했습니다.
- **구현 결정:** 현재 user와 token이 준비되면 socket을 열고 chat event는 ID 중복을 제거해 병합하며 presence event는 authoritative HTTP lobby를 다시 읽습니다. socket이 열리지 않으면 chat submit은 HTTP로 fallback합니다.
- **상태/소유권 변화:** socket lifecycle은 page effect가, durable message는 repository가, presence snapshot은 GameHub/API가 소유합니다.
- **실패/edge:** 당시 token query 연결 방식 자체의 보안 개선은 다른 category에 속합니다. reconnect/backoff도 이 commit의 핵심은 아닙니다.
- **보장/비보장:** 단일 page lifetime의 실시간 반영과 cleanup은 제공하지만 presence source는 아직 repository 기반일 수 있습니다.
- **다음 연결:** `8debb1ea3ad3`이 `/lobby.onlinePlayers`를 hub-connected clients로 바꿉니다.
<!-- LEARNER-ANSWER END commit:cd3787eefd6a -->

비교 기준:
- 직전 Thread 관련 SHA: `8078ac6f92ba` — `test(app): 실시간 지표·채팅·경기 기록 검증`
- 다음 Thread 관련 SHA: `8debb1ea3ad3` — `feat(lobby): 연결 중인 WebSocket 사용자 목록 추가`

### 5.10. `feat(lobby): 연결 중인 WebSocket 사용자 목록 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `8debb1ea3ad3` |
| Importance | B |
| Tags | REALTIME |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Makes the realtime hub, not persistent account storage, the authority for lobby presence.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/gameHub.ts`의 `onlinePlayers`/client map projection
- user ID dedupe, `online: true`, rating/name sort
- `/lobby` route의 repository `listOnlineUsers` 대체
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:8debb1ea3ad3 -->
- **직전 상태:** `/lobby`는 repository의 active user 목록을 online처럼 반환해 실제 socket 연결이 없는 저장 계정도 접속자로 보였습니다.
- **구현 결정:** GameHub client map에서 user ID를 dedupe하고 online true projection을 만든 뒤 rating/name으로 정렬해 route가 사용합니다.
- **상태/소유권 변화:** account 활성 상태는 DB가, 현재 접속 presence는 GameHub가 소유하도록 분리됩니다.
- **실패/edge:** 한 process의 client map만 보므로 다중 instance 전체 presence aggregation은 보장하지 않습니다.
- **보장/비보장:** 현재 hub에 연결된 사용자만 반환합니다.
- **다음 연결:** `c3ff9ed2402f`가 socket이 없을 때 empty list를 요구합니다.
<!-- LEARNER-ANSWER END commit:8debb1ea3ad3 -->

비교 기준:
- 직전 Thread 관련 SHA: `cd3787eefd6a` — `feat(chat): 로비 채팅과 접속 상태 실시간 반영`
- 다음 Thread 관련 SHA: `c3ff9ed2402f` — `test(lobby): WebSocket 사용자 목록 검증`

### 5.11. `test(lobby): WebSocket 사용자 목록 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `c3ff9ed2402f` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE, TEST |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Verifies that the lobby reports no online players when the realtime hub has no WebSocket clients.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- API route/injection test의 empty hub setup
- `/lobby` response `onlinePlayers: []` assertion
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.
- Test technique, failure/boundary fixture, production path, proves/does-not-prove를 실제 assertion으로 구분합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:c3ff9ed2402f -->
- **직전 상태:** authority 전환은 구현됐지만 seed/active users가 다시 online list에 섞이는 regression을 막을 test가 없었습니다.
- **기법:** repository seed는 존재하되 WebSocket client를 연결하지 않은 app에서 `/lobby`를 조회해 empty online list를 요구합니다.
- **생산 경로:** route가 repository가 아니라 hub projection을 호출하는지를 간접 검증합니다.
- **증명/비증명:** no-connection case를 고정하지만 connect/disconnect propagation timing은 smoke test가 담당합니다.
- **보장:** 저장 계정 존재만으로 online이 되는 regression을 감지합니다.
- **다음 연결:** `23a978879b81`이 실제 socket open 후 presence가 eventual하게 반영되는 시간을 기다립니다.
<!-- LEARNER-ANSWER END commit:c3ff9ed2402f -->

비교 기준:
- 직전 Thread 관련 SHA: `8debb1ea3ad3` — `feat(lobby): 연결 중인 WebSocket 사용자 목록 추가`
- 다음 Thread 관련 SHA: `23a978879b81` — `test(smoke): WebSocket 접속 상태 반영 대기`

### 5.12. `test(smoke): WebSocket 접속 상태 반영 대기`

| 항목 | 값 |
| --- | --- |
| SHA | `23a978879b81` |
| Importance | B |
| Tags | REALTIME, OPERATIONS, TEST |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Changes the smoke test from an immediate presence assertion to bounded asynchronous polling.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `tests/smoke-ws.mjs`의 async `waitFor`
- 두 socket open 뒤 `/lobby` polling
- 10초 timeout, 50ms `delay`, predicate가 두 handle을 포함할 때 종료
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.
- Test technique, failure/boundary fixture, production path, proves/does-not-prove를 실제 assertion으로 구분합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:23a978879b81 -->
- **직전 가정:** WebSocket `open` promise가 resolve되면 HTTP `/lobby`도 같은 순간 두 사용자를 반드시 포함한다고 봤습니다.
- **실제 실패:** socket open event와 server-side connect/presence publication, 별도 HTTP read 사이에는 scheduling delay가 있어 정상 시스템도 flaky할 수 있습니다.
- **교정/기법:** async predicate를 최대 10초 동안 50ms 간격으로 호출하고 두 handle이 모두 보일 때만 다음 smoke 단계로 진행합니다. timeout이면 명시적으로 실패합니다.
- **생산 경로:** 실제 WebSocket 연결과 HTTP lobby read를 함께 사용하도록 작성됐습니다.
- **증명/비증명:** bounded eventual visibility를 검증하지만 즉시 consistency나 10초 이내라는 제품 SLA를 공식 보장하지는 않습니다.
- **Thread 종료:** durable chat와 live presence의 서로 다른 authority 및 asynchronous observation 모델이 테스트에도 반영됩니다.
<!-- LEARNER-ANSWER END commit:23a978879b81 -->

비교 기준:
- 직전 Thread 관련 SHA: `c3ff9ed2402f` — `test(lobby): WebSocket 사용자 목록 검증`
- 이 commit을 Thread의 마지막 상태로 사용합니다.

## 6. Thread 종합

다음 항목을 commit 순서에서 재구성합니다: invariant evolution, Failure → Fix → Test 관계, ownership/state 변화, 최종 실행 흐름, 비보장, 실제 실행 증거.

<!-- LEARNER-ANSWER START thread:04-lobby-presence-chat-and-live-statistics.md:synthesis -->
- **불변식 진화:** `a6fa5a187eec`은 채팅을 repository에 저장했고 `dabd8d5c2a49`는 WebSocket send를 저장 후 broadcast했습니다. `1d9aa3902614`는 connected/playing/queued/room/wait를 GameHub에서 계산했습니다. 초기 UI는 sample 상태와 repository online projection을 섞었지만 `be31566ac0fd`의 sample 제거, `8debb1ea3ad3`의 GameHub presence authority 전환, `c3ff9ed2402f`의 empty presence test로 정리됐습니다.
- **소유권:** repository는 chat rows와 sender projection을 소유합니다. GameHub는 live client/queue/room/wait samples를 소유합니다. API `/lobby`는 두 source를 조합하고 web은 HTTP snapshot에 WebSocket event를 병합합니다.
- **Failure → Fix → Test:** missing body에서 property access 예외 → `(request.body ?? {})` → intended 400 경로. 저장 사용자 목록을 online으로 표시 → `hub.onlinePlayers()` → no-socket empty test. WebSocket open 직후 presence 즉시 조회 → 최대 10초/50ms async polling smoke test.
- **최종 흐름:** HTTP `/lobby`가 최근 chat와 hub stats/presence를 반환 → 로그인 사용자는 ticket/token 기반 WebSocket 연결 → lobby chat은 socket이 열리면 WS, 아니면 HTTP write → repository가 message를 만들고 hub가 broadcast → `presence.changed`는 HTTP lobby refresh를 유도 → message ID로 중복을 제거합니다.
- **비보장:** 이 Thread는 match chat의 scope/room 조합과 cross-room authorization을 완성하지 않습니다. 그 보안 invariant는 Thread 05가 소유합니다. Presence는 process-local이며 WebSocket open 순간과 HTTP read 순간 사이에 eventual delay가 있을 수 있습니다.
- **실행 증거:** repository/API/web/smoke test 구현은 검사했지만 서비스를 실행하지 않았습니다.
<!-- LEARNER-ANSWER END thread:04-lobby-presence-chat-and-live-statistics.md:synthesis -->

## 7. 학습 완료 확인

<!-- LEARNER-ANSWER START thread:04-lobby-presence-chat-and-live-statistics.md:checklist -->
- [x] 모든 SHA를 지정 브랜치의 exact commit으로 검사했습니다.
- [x] fixed commit map과 source classification을 보존했습니다.
- [x] earlier commit을 later HEAD 코드로 설명하지 않았습니다.
- [x] fix와 test를 원래 failure/production path에 연결했습니다.
- [x] 실제 실행하지 않은 test를 통과했다고 기록하지 않았습니다.
- [x] Thread 최종 owner, invariant, flow, non-guarantee를 작성했습니다.
<!-- LEARNER-ANSWER END thread:04-lobby-presence-chat-and-live-statistics.md:checklist -->
