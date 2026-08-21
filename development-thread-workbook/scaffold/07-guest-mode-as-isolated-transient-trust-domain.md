# 격리된 임시 신뢰 도메인으로서의 게스트 모드

원문 Development Thread: `Guest mode as an isolated transient trust domain`

## 1. Thread 목표

- guest를 약한 registered account가 아니라 별도의 signed identity, ticket, lease, capability, matchmaking, persistence domain으로 추적합니다.
- database 없이 발급·검증되는 guest cookie와 one-time ticket, IP/process capacity lease의 lifecycle을 복원합니다.
- registered data 조회와 write, mixed matchmaking, durable result를 차단하면서 제한된 reconnect recovery만 허용하는 경계를 확인합니다.

### Source에서 확정된 significance

> Guest mode is not implemented as a weaker registered account. It is a separate signed identity, capability,
> matchmaking, persistence, and resource domain. The sequence is significant because each integration point
> explicitly prevents transient public traffic from acquiring durable data or unbounded process state.

### 직접 연결되는 Critical Invariants

> Guest identities, matchmaking pools, capabilities, persistence, tickets, leases, and retained results remain
> isolated and resource-bounded.

> The durable browser session is carried only by an HttpOnly cookie; raw WebSocket tickets are short-lived,
> single-use, hashed at rest, bounded during authentication, and excluded from logs.

> Timers, schedulers, heartbeat handles, retry work, snapshot buffers, and database resources have explicit
> single-owner cleanup.

### 직접 연결되는 Major Engineering Difficulties

> Offering a public guest mode without allowing transient identities to cross into registered data, social
> features, ratings, or unbounded in-memory resources.

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
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Creates tamper-evident, address-bound, expiring guest identity without database sessions.
- Classification summary: Introduce a self-contained signed session representation for transient guests.

원문 구현 의도·상태 변화:

> Introduce a self-contained signed session representation for transient guests. The server generates an
> opaque guest identifier, handle, and display name, embeds that identity with a version, originating client
> address, and two-hour expiration, then authenticates the Base64URL payload with HMAC-SHA-256.

원문 경계·failure handling·후속 범위:

> Verification compares signatures in constant time and rejects malformed, expired, wrong-version, non-active,
> non-user, non-guest, or address-mismatched payloads. Requiring a 32-byte secret and keeping identity
> generation server-side allows demo sessions to remain stateless with respect to the database while still
> making the cookie tamper-evident and narrowly scoped.

#### 해당 SHA에서 확인할 실제 코드

- guest ID/handle/display name을 server가 생성하는 함수와 payload fields를 확인합니다.
- version, originating client address, two-hour expiry가 signed Base64URL payload에 포함되는 serialization을 기록합니다.
- HMAC-SHA-256 signature와 constant-time comparison 구현을 확인합니다.
- malformed, expired, wrong-version, non-active, non-user, non-guest, address-mismatch rejection branch를 표로 만듭니다.
- 32-byte secret validation이 startup/constructor 어느 경계에서 fail-closed되는지 확인합니다.
- database session/repository 호출 없이 SessionUser-shaped identity가 생성되는지 추적합니다.

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
- 다음 Thread 관련 SHA: `17a1dd501b1b` — `feat(guest): guest resource lease 수명주기 추가`

### 5.2. `feat(guest): guest resource lease 수명주기 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `17a1dd501b1b` |
| Importance | A |
| Tags | AUTH, PROTOCOL, REALTIME |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Binds guest connection limits to lease identity and socket lifetime.
- Classification summary: Add explicit leases for live guest connections so resource limits follow socket lifetime rather than ticket issuance.

원문 구현 의도·상태 변화:

> Add explicit leases for live guest connections so resource limits follow socket lifetime rather than ticket
> issuance. `GuestAccess` enforces both a per-IP cap and a process-wide cap while keeping at most one current
> connection record for each guest identity.

원문 경계·failure handling·후속 범위:

> A reconnect replaces that guest’s record with a new lease identifier. Releasing an older socket deletes the
> record only when its identifier is still current, preventing a stale close event from freeing the
> replacement connection. This lease pattern makes acquisition, replacement, and cleanup one atomic ownership
> protocol.

#### 해당 SHA에서 확인할 실제 코드

- `GuestAccess`의 per-IP cap, process-wide cap, guest ID → current lease record를 확인합니다.
- lease acquisition이 guest/IP/global capacity를 어떤 순서로 검사하고 mutation하는지 기록합니다.
- reconnect가 새 lease ID로 current record를 교체하는 path를 확인합니다.
- old socket release가 lease ID equality를 검사해 replacement record를 삭제하지 않는 branch를 확인합니다.
- acquire/replacement/release의 idempotency와 capacity counter 정합성을 기록합니다.

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
- 직전 Thread 관련 SHA: `cacd4c22d705` — `feat(guest): signed guest session token 정의`
- 다음 Thread 관련 SHA: `a5c06c561e00` — `feat(guest): guest session과 WebSocket 인증 연결`

### 5.3. `feat(guest): guest session과 WebSocket 인증 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `a5c06c561e00` |
| Importance | A |
| Tags | AUTH, REALTIME, PERSISTENCE |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Connects signed cookies, one-time tickets, and bounded live leases.
- Classification summary: Integrate transient guest identity into both HTTP and WebSocket authentication without creating database users or sessions.

원문 구현 의도·상태 변화:

> Integrate transient guest identity into both HTTP and WebSocket authentication without creating database
> users or sessions. Demo mode exposes `POST /auth/guest`, issues an HttpOnly, Secure, SameSite=Lax two-hour
> cookie from the in-memory guest service, and uses guest-aware current-user resolution for logout and ticket
> issuance.

원문 경계·failure handling·후속 범위:

> WebSocket upgrade consumes guest tickets from the in-memory one-time store before considering registered
> tickets; in demo mode it never falls back to the database. A successful guest upgrade must also acquire an
> IP- and process-bounded connection lease that is released on socket close. This preserves a coherent trust
> chain from signed cookie to short-lived ticket to live connection while keeping guest credentials, capacity
> accounting, and cleanup outside persistent storage.

#### 해당 SHA에서 확인할 실제 코드

- demo-only `POST /auth/guest` route, signed cookie options, two-hour lifetime을 확인합니다.
- guest-aware current-user resolution이 logout/ticket issuance에서 재사용되는지 추적합니다.
- WebSocket upgrade가 in-memory guest ticket을 먼저 소비하고 demo mode에서 database fallback을 금지하는 branch를 확인합니다.
- socket admission 전 IP/process-bounded lease acquire와 close 시 release listener를 확인합니다.
- signed cookie → one-time ticket → live lease 사이 identity 전달과 cleanup 순서를 그립니다.
- guest user/session row가 PostgreSQL 또는 memory AppRepository에 생성되지 않는지 확인합니다.

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
- 직전 Thread 관련 SHA: `17a1dd501b1b` — `feat(guest): guest resource lease 수명주기 추가`
- 다음 Thread 관련 SHA: `27ddc3fca2f1` — `feat(guest): guest 조회 범위와 lobby 격리`

### 5.4. `feat(guest): guest 조회 범위와 lobby 격리`

| 항목 | 값 |
| --- | --- |
| SHA | `27ddc3fca2f1` |
| Importance | A |
| Tags | AUTH, PERSISTENCE, TOURNAMENT |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Avoids fetching registered social and historical data for demo traffic.
- Classification summary: Define the read-side isolation rules for guest and demo traffic.

원문 구현 의도·상태 변화:

> Define the read-side isolation rules for guest and demo traffic. Guest-aware authentication is accepted by
> `/me`, but public demo requests cannot enumerate users, rankings, profiles, or tournaments, and the lobby
> returns no persisted match history or chat. Those branches avoid the repository calls entirely rather than
> retrieving registered data and filtering it afterward.

원문 경계·failure handling·후속 범위:

> Write-capable lobby chat and registered dashboard access now require a registered identity even when a guest
> cookie is valid. This creates a least-privilege projection: guests receive their transient identity and live
> service statistics needed to play, while durable social, historical, and ranking data remains outside the
> guest boundary.

#### 해당 SHA에서 확인할 실제 코드

- `/me`에서 guest를 허용하는 branch와 registered data read route를 차단하는 branch를 구분합니다.
- demo lobby가 persisted matches/chat과 registered user projection을 비우면서 repository call 자체를 건너뛰는지 spy/caller로 확인합니다.
- leaderboard/profile/tournament read가 repository fetch 전 실패하는지 control flow를 기록합니다.
- lobby chat write와 dashboard가 guest cookie를 valid authentication으로 보더라도 registered identity를 요구하는지 확인합니다.
- guest에게 반환되는 live service stats와 차단되는 durable/social fields를 response schema 기준으로 정리합니다.

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
- 직전 Thread 관련 SHA: `a5c06c561e00` — `feat(guest): guest session과 WebSocket 인증 연결`
- 다음 Thread 관련 SHA: `77a7c205ccd0` — `feat(game): guest matchmaking과 room을 격리`

### 5.5. `feat(game): guest matchmaking과 room을 격리`

| 항목 | 값 |
| --- | --- |
| SHA | `77a7c205ccd0` |
| Importance | A |
| Tags | REALTIME, PERSISTENCE, RISK |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Partitions matchmaking and AI fallback by identity kind.
- Classification summary: Partition matchmaking by session kind so a transient guest can never be paired with a registered user.

원문 구현 의도·상태 변화:

> Partition matchmaking by session kind so a transient guest can never be paired with a registered user.
> Candidate selection now skips queue entries whose guest status differs, and each created room records that
> status for later completion and persistence decisions.

원문 경계·failure handling·후속 범위:

> Guest timeout fallback also avoids querying the repository for a persisted NPC, allowing the room to use the
> in-memory practice opponent path. These decisions keep guest play self-contained: both human opponents and
> fallback resources remain outside the registered account and database domain.

#### 해당 SHA에서 확인할 실제 코드

- matchmaking candidate selection에서 guest status/pool kind가 다른 entry를 건너뛰는 조건을 확인합니다.
- room에 guest status가 저장되고 completion/persistence decision까지 전달되는 field를 기록합니다.
- guest fallback이 repository NPC lookup을 하지 않고 in-memory practice opponent를 사용하는 branch를 확인합니다.
- registered user와 guest가 같은 queue request를 보내도 paired되지 않는 state transition을 추적합니다.
- room cleanup/release가 pool isolation state를 남기지 않는지 확인합니다.

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
- 직전 Thread 관련 SHA: `27ddc3fca2f1` — `feat(guest): guest 조회 범위와 lobby 격리`
- 다음 Thread 관련 SHA: `eaa4fdaba361` — `feat(game): guest 경기 결과 영속화 차단과 임시 보존`

### 5.6. `feat(game): guest 경기 결과 영속화 차단과 임시 보존`

| 항목 | 값 |
| --- | --- |
| SHA | `eaa4fdaba361` |
| Importance | A |
| Tags | SIMULATION, REALTIME |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Skips durable finalization while retaining a short in-memory recovery result.
- Classification summary: Separate guest match completion from the registered persistence pipeline.

원문 구현 의도·상태 변화:

> Separate guest match completion from the registered persistence pipeline. When a guest room finishes,
> `GameHub` now emits a result marked `persisted: false` with no match identifier or rating delta, skips
> `finalizeMatch`, and removes the room without writing users, history, or rankings.

원문 경계·failure handling·후속 범위:

> To tolerate a socket loss around completion, the result is retained per guest in process memory for two
> minutes and replayed when that guest reconnects without an active room. Replacing an entry cancels its
> earlier timer, and expiration checks guard timer races, preserving the intended balance: recovery is
> possible for a short window, but transient identities never acquire durable game state.

#### 해당 SHA에서 확인할 실제 코드

- guest room terminal path가 `finalizeMatch`를 건너뛰는 조건과 result `persisted: false`, null match ID, zero rating delta 구성을 확인합니다.
- users/history/ranking/tournament persistence call이 발생하지 않는지 caller graph로 확인합니다.
- per-guest transient result map과 two-minute timer 생성/replace/delete path를 기록합니다.
- reconnect 시 active room이 없을 때 retained result를 replay하는 조건을 확인합니다.
- replacement timer cancel과 expiration identity/time guard가 stale timer race를 막는지 확인합니다.

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
- 직전 Thread 관련 SHA: `77a7c205ccd0` — `feat(game): guest matchmaking과 room을 격리`
- 다음 Thread 관련 SHA: `2b274686e6d4` — `fix(guest): 체험 환경의 runtime 복구 제한`

### 5.7. `fix(guest): 체험 환경의 runtime 복구 제한`

| 항목 | 값 |
| --- | --- |
| SHA | `2b274686e6d4` |
| Importance | A |
| Tags | AUTH, REALTIME, RISK |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Bounds IP windows and pending ticket structures and validates runtime mode.
- Classification summary: Bound the guest runtime structures that were previously able to grow with arbitrary client IPs and ticket requests.

원문 구현 의도·상태 변화:

> Bound the guest runtime structures that were previously able to grow with arbitrary client IPs and ticket
> requests. Creation and ticket-issuance accounting now share timer-backed rolling windows, prune expired
> entries, reject new tracked networks after a configured capacity, and enforce both per-minute issuance
> limits and a per-IP cap on pending one-time WebSocket tickets. Ticket replacement and expiration use one
> deletion path so timers, the ticket map, and the guest-to-ticket index remain synchronized.

원문 경계·failure handling·후속 범위:

> The request IP is now part of guest ticket issuance, making those limits enforceable at the same trust
> boundary where Fastify has resolved the client address. The change also centralizes `APP_MODE` parsing in
> the environment module and validates explicit values instead of silently falling back, ensuring cookie and
> guest-mode behavior are derived from one accepted runtime mode.

#### 해당 SHA에서 확인할 실제 코드

- guest creation과 ticket issuance accounting이 공유하는 rolling-window 구조와 timer ownership을 확인합니다.
- expired entry prune, tracked-network capacity, per-minute limit, per-IP pending ticket cap을 실제 상수/조건으로 기록합니다.
- ticket replacement와 expiry가 하나의 deletion helper로 map, reverse index, timer를 함께 정리하는지 확인합니다.
- Fastify-resolved request IP가 ticket issuance에 전달되는 call chain과 proxy-trust 경계를 확인합니다.
- `APP_MODE` parsing이 중앙화되고 invalid explicit value가 fallback 없이 거부되는지 확인합니다.
- 수정 전 arbitrary IP/ticket request가 성장시킬 수 있던 collection과 수정 후 상한을 비교합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### Fix 연결 골격

- 기존 가정: guest rate window와 pending ticket map은 TTL이 있으므로 별도 tracked-key capacity 없이도 충분히 bounded함.
- Source에서 드러난 failure/risk: 공격자가 임의 IP와 ticket issuance를 반복해 timer/map/index를 process-wide로 계속 증가시킬 수 있음.
- Root cause 코드 근거: [학습자 작성 — 해당 SHA의 실제 caller, state, branch를 인용]
- 수정된 decision/invariant: rolling-window prune, tracked-network cap, issuance rate, per-IP pending cap, unified delete path를 도입함.
- 실제 수정 코드: [학습자 작성 — 파일, 심볼, 변경 전/후 최소 코드]
- Regression 연결: fake-timer guest tests에서 expiry cleanup, capacity rejection, replacement synchronization, APP_MODE validation을 확인합니다.

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
- 직전 Thread 관련 SHA: `eaa4fdaba361` — `feat(game): guest 경기 결과 영속화 차단과 임시 보존`
- 다음 Thread 관련 SHA: `06d2eb7a93cc` — `test(guest): 체험 환경의 복구 경계 검증`

### 5.8. `test(guest): 체험 환경의 복구 경계 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `06d2eb7a93cc` |
| Importance | A |
| Tags | AUTH, SIMULATION, REALTIME |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Verifies bounded cleanup, fresh-ticket reconnect, and no duplicate match intent.
- Classification summary: Extend the guest-mode regression suite across the boundaries that determine whether an in-memory session can recover safely.

원문 구현 의도·상태 변화:

> Extend the guest-mode regression suite across the boundaries that determine whether an in-memory session can
> recover safely. The tests now verify explicit `APP_MODE` parsing, expiration and bounded cleanup of per-IP
> creation windows and one-time WebSocket tickets, issuance limits, reconnecting with a fresh ticket without
> replaying the original queue command, and blocking a second match request while a room is reconnecting.

원문 경계·failure handling·후속 범위:

> The browser policy coverage also fixes the expected presentation of non-persisted results and the transition
> back to the game screen when lobby traffic reveals a still-active room. Using fake timers makes the
> time-based guarantees deterministic and resetting timers after each case prevents those tests from leaking
> clock state into the rest of the suite.

#### 해당 SHA에서 확인할 실제 코드

- explicit APP_MODE parse, IP window expiry/capacity, ticket expiry/issuance limit test를 분류합니다.
- fresh ticket reconnect가 original queue command를 재전송하지 않는 browser/socket fixture를 확인합니다.
- reconnecting room 동안 second match request를 막는 state/policy assertion을 기록합니다.
- non-persisted result 표시와 active-room lobby traffic의 `/play` transition을 browser policy test와 연결합니다.
- fake timer setup/advance/reset이 각 case 뒤 전역 clock state를 누출하지 않는지 확인합니다.
- 이 suite가 guest isolation, bounded resource, recovery 중 각각 무엇을 증명하고 무엇을 증명하지 않는지 작성합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | guest runtime state는 bounded/expiring이며 reconnect는 fresh ticket을 쓰되 duplicate match intent를 만들지 않습니다. |
| 재현하는 failure/boundary | unbounded IP/ticket entries, stale timer, reconnect queue replay, second match, wrong result presentation. |
| test technique | fake timers, guest service tests, browser policy/reducer/socket tests. |
| 통과하는 production path | mode parse → guest windows/tickets → client reconnect → room ownership/presentation. |
| 증명하는 것 | resource cleanup과 recovery policy가 같은 transient trust model을 따릅니다. |
| 증명하지 않는 것 | multi-process guest state 공유나 durable recovery는 설계상 검증 대상이 아닙니다. |
| test 성격 | Deterministic resource/recovery regression across service and browser. |
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
- 직전 Thread 관련 SHA: `2b274686e6d4` — `fix(guest): 체험 환경의 runtime 복구 제한`
- 이 Thread의 최종 상태와 비교해 이후 보완 여부를 기록합니다.

## 6. Invariant ledger

Source에서 확정된 invariant를 아래 시점별로 연결합니다. 새 invariant를 추측해 확정하지 않습니다.

| Invariant | 처음 도입/관찰한 SHA | 강화한 SHA | 부족함이 드러난 SHA | 복구한 fix | 고정한 regression test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| Guest identities, matchmaking pools, capabilities, persistence, tickets, leases, and retained results remain isolated and resource-bounded. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| The durable browser session is carried only by an HttpOnly cookie; raw WebSocket tickets are short-lived, single-use, hashed at rest, bounded during authentication, and excluded from logs. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| Timers, schedulers, heartbeat handles, retry work, snapshot buffers, and database resources have explicit single-owner cleanup. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |

추가 기록:

- invariant가 동일한 문장으로 유지되었는지, 더 강한 조건으로 바뀌었는지 구분합니다.
- implementation detail과 invariant를 혼동하지 않습니다.
- source가 명시하지 않은 규칙은 “관찰한 가설”로 표시하고 코드 근거로만 남깁니다.

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| guest를 registered account의 약한 변형으로 처리할 위험 | `cacd4c22d705` signed identity → `a5c06c561e00` separate auth chain → `27ddc3fca2f1` data isolation | `06d2eb7a93cc` guest boundary regression | separate trust/capability domain |
| guest와 registered matchmaking/persistence가 섞일 위험 | `77a7c205ccd0` pool isolation → `eaa4fdaba361` non-persisted result | `06d2eb7a93cc` recovery/result policy | transient play only |
| IP/ticket/result timer state가 무한 증가할 위험 | `17a1dd501b1b` lease → `2b274686e6d4` bounded windows/tickets | `06d2eb7a93cc` fake-timer cleanup | resource-bounded guest runtime |

학습자 보완 기록:

- 실제 failure를 주입하거나 재현하는 test fixture를 찾아 위 표의 각 행과 연결합니다.
- fix가 symptom만 가리는지, ownership/invariant를 바꾸는지 코드 근거로 판별합니다.
- broad integration과 deterministic regression을 별도 표시합니다.

## 8. Ownership / state / responsibility 변화

| 축 | 초기 SHA의 owner/state | 중간 전환 | Thread 최종 owner/state | 해제·cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| signed guest identity | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| ticket and reverse index | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| live connection lease | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| guest capability and data projection | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| guest matchmaking and transient result retention | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |

## 9. Thread 최종 상태

다음 항목은 최종 HEAD를 보고 채우지 말고, 이 Thread의 마지막 commit까지 순서대로 복원한 결과로 작성합니다.

- 최종 authoritative owner: [학습자 작성]
- 최종 상태/invariant: [학습자 작성]
- 남아 있는 의도적 제한 또는 비보장: [학습자 작성]
- 후속 Thread가 의존하는 contract: [학습자 작성]
- 대표 코드 근거: [SHA, 파일, symbol]

## 10. 최종 architecture 또는 execution flow 정리

- registered trust domain과 guest trust domain을 identity, storage, ticket, room, result 기준으로 비교합니다.
- guest reconnect가 허용되지만 durable progress는 생기지 않는 이유를 설명합니다.
- 모든 guest in-memory collection의 생성·상한·만료·삭제 주체를 ledger로 완성합니다.

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
