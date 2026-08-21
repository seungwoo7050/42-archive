# 쿠키 신원과 일회용 WebSocket 입장

원문 Development Thread: `Cookie identity and one-time WebSocket admission`

## 1. Thread 목표

- 여러 transport로 노출되던 durable session을 HttpOnly cookie 하나로 제한하는 보안 전환을 추적합니다.
- cookie 인증 HTTP 요청이 hash-only, short-lived, single-use ticket을 발급하고 socket handshake가 이를 원자적으로 소비하는 전체 trust chain을 복원합니다.
- 인증 지연 중 early message 보존과 unauthenticated buffering 상한, credential log redaction이 같은 경계를 어떻게 완성하는지 확인합니다.

### Source에서 확정된 significance

> The branch visibly moves away from reusable tokens in JavaScript and URLs. Authentication becomes a
> two-stage trust chain: the cookie authenticates an HTTP ticket request, and an atomic one-time ticket
> authenticates exactly one socket. Buffer limits and log redaction complete the security boundary rather than
> treating ticket issuance alone as sufficient.

### 직접 연결되는 Critical Invariants

> The durable browser session is carried only by an HttpOnly cookie; raw WebSocket tickets are short-lived,
> single-use, hashed at rest, bounded during authentication, and excluded from logs.

### 직접 연결되는 Major Engineering Difficulties

> Authenticating WebSockets without exposing durable session credentials while preserving early messages and
> bounding unauthenticated buffering.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 초기 session은 cookie, bearer, query 중 어디에서 수용되었고 왜 하나의 cookie 경계로 축소되었습니까?
- 브라우저 JavaScript가 durable credential을 보유하지 않도록 API client와 socket 연결 흐름이 어떻게 바뀝니까?
- raw ticket, digest, expiry, protocol version, active-user check의 소유 계층은 각각 어디입니까?
- ticket 소비는 동시 요청과 replay에서도 정확히 한 번만 성공하도록 어떤 SQL/저장소 연산을 사용합니까?
- 인증 전 message buffering의 message-size, count, total-byte 제한은 어디에서 검사되고 어떤 close path로 수렴합니까?
- URL serializer와 redaction path가 서로 다른 credential 노출면을 어떻게 막습니까?

## 3. 완료 기준

- development login부터 cookie 설정, ticket 발급, digest 저장, handshake 소비, `GameHub` 등록까지의 trust chain을 그릴 수 있습니다.
- durable session과 one-time ticket의 수명·노출·저장·재사용 가능성 차이를 설명할 수 있습니다.
- forged, expired, reused, suspended, wrong-version ticket 각각의 처리와 소비 여부를 코드와 테스트로 구분할 수 있습니다.
- pre-auth buffering 제한과 listener/closed-socket cleanup을 실제 branch 순서로 기록할 수 있습니다.
- 인증 정보가 request URL 및 structured log에 남지 않는 근거를 제시할 수 있습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `1779df300611` | `feat(api): 로그인과 로비 HTTP 경계 구현` | B | AUTH, PERSISTENCE, WEB | Establishes repository-backed sessions and the initial browser identity boundary. |
| 2 | `d0531791406b` | `fix(auth): cookie-only session과 환경별 route 적용` | S | AUTH, ARCH, RISK | Restricts durable credentials to the HttpOnly cookie and scopes development login by mode. |
| 3 | `353ca9a17415` | `fix(web): browser token 저장 제거` | A | AUTH, PROTOCOL, REALTIME | Removes JavaScript-managed durable credentials from the browser. |
| 4 | `d9bde7485719` | `feat(auth): WebSocket ticket 생성과 HTTP 계약 정의` | A | AUTH, PROTOCOL, REALTIME | Defines high-entropy raw tickets and hash-only storage semantics. |
| 5 | `c89a455fee06` | `feat(db): PostgreSQL WebSocket ticket 저장 추가` | A | AUTH, SIMULATION, REALTIME | Makes ticket consumption atomic and single-use in PostgreSQL. |
| 6 | `306d1946afb7` | `feat(auth): ticket 기반 WebSocket 인증 연결` | S | AUTH, REALTIME, RISK | Completes the cookie-to-ticket-to-socket trust handoff with bounded pre-auth buffering. |
| 7 | `b0ee833313c1` | `test(auth): WebSocket ticket 경계 검증` | A | AUTH, PROTOCOL, REALTIME | Exercises replay, expiry, suspension, protocol version, and concurrent consumption. |
| 8 | `ec9cb39babef` | `fix(log): 요청 비밀 정보 redaction 적용` | A | AUTH, REALTIME, OBSERVABILITY | Prevents tickets and durable credentials from becoming operational log data. |

## 5. Commit별 학습 기록

### 5.1. `feat(api): 로그인과 로비 HTTP 경계 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `1779df300611` |
| Importance | B |
| Tags | AUTH, PERSISTENCE, WEB |
| 학습 깊이 | Thread 흐름에서 맡는 구현 역할과 필요한 상태 변화를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Establishes repository-backed sessions and the initial browser identity boundary.
- Classification summary: Establish the first HTTP boundary around the repository-backed identity and lobby model.

원문 구현 의도·상태 변화:

> Establish the first HTTP boundary around the repository-backed identity and lobby model. Development login
> now creates or reuses a user, creates a server-side session, and exposes that session both as an `httpOnly`,
> `SameSite=Lax` cookie and as a returned token. The cookie supports normal browser requests without making
> the credential available to client-side JavaScript, while the explicit token also serves clients and later
> transports that cannot depend on cookie delivery.

원문 경계·failure handling·후속 범위:

> Authentication lookup is centralized so protected routes do not each interpret credentials independently.
> The same session can be resolved from the cookie, a Bearer header, or a `session` query parameter, after
> which `/me` enforces authentication and the public lobby may enrich its response with an optional current
> user. Lobby, recent match, chat, and leaderboard reads remain repository operations, keeping HTTP concerns
> separate from persistence and domain representation. Credentialed CORS is restricted to the configured web
> origin and the supported local origins.

#### 해당 SHA에서 확인할 실제 코드

- development login route에서 user upsert, session creation, cookie 설정, JSON token 반환 순서를 확인합니다.
- cookie의 `httpOnly`, `SameSite=Lax`와 당시 다른 cookie option을 기록합니다.
- 공통 authentication lookup이 cookie, Bearer header, `session` query를 어떤 우선순위/도우미로 읽는지 추적합니다.
- `/me`와 optional lobby identity가 같은 session resolution을 재사용하는지 caller를 확인합니다.
- credentialed CORS origin 정책과 authorization header 허용 상태를 이후 `d0531791406b`와 비교할 기준으로 기록합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| Thread에서 맡는 역할 | [파일·심볼·조건·관찰 결과 작성] |
| 확인한 핵심 코드와 상태 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 후속 commit에 남긴 조건 | [파일·심볼·조건·관찰 결과 작성] |

비교 기준:
- 이 commit의 parent에서 동일 책임을 담당하던 코드를 찾아 기록합니다.
- 다음 Thread 관련 SHA: `d0531791406b` — `fix(auth): cookie-only session과 환경별 route 적용`

### 5.2. `fix(auth): cookie-only session과 환경별 route 적용`

| 항목 | 값 |
| --- | --- |
| SHA | `d0531791406b` |
| Importance | S |
| Tags | AUTH, ARCH, RISK |
| 학습 깊이 | Architecture/invariant 중심으로 직전 상태, 결정, 핵심 전이, ownership, failure, 후속 검증까지 완전히 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Restricts durable credentials to the HttpOnly cookie and scopes development login by mode.
- Classification summary: Restrict session authentication to the `pp_session` cookie and remove bearer-header and query-string token fallbacks from both request handling and CORS.

원문 구현 의도·상태 변화:

> Restrict session authentication to the `pp_session` cookie and remove bearer-header and query-string token
> fallbacks from both request handling and CORS. This gives the server one transport for browser credentials
> and avoids exposing reusable session secrets through URLs, logs, referrers, or JavaScript-managed
> authorization headers.

원문 경계·failure handling·후속 범위:

> The application now derives an explicit runtime mode. The development login route exists only in development
> and test, while production and demo do not register it at all; cookies are marked secure in the externally
> served modes. These rules make test conveniences an environment-scoped capability rather than part of the
> deployed authentication surface.

#### Source의 Most Important Commit 정의

##### Problem

> The same durable session could be accepted from cookies, authorization headers, and URL query parameters,
> and a development login route existed in deployed modes.

##### Decision

> Accept only the HttpOnly `pp_session` cookie, remove bearer/query fallbacks and authorization CORS support,
> scope development login to development/test, and secure cookies externally.

##### Why it mattered

> It reduces credential exposure through JavaScript, logs, referrers, and URLs and gives later WebSocket
> authentication a clean starting point.

##### What changed

> The request credential reader, CORS policy, route registration, runtime mode, and secure-cookie behavior
> were changed together.

##### Project understanding

> It defines the durable identity boundary from which one-time WebSocket tickets, guest sessions, logout
> revocation, and suspension enforcement evolve.

#### 해당 SHA에서 확인할 실제 코드

- session credential reader에서 cookie 외 Bearer/query path가 제거된 diff를 확인합니다.
- CORS에서 authorization 관련 허용이 제거되고 cookie credential만 남는 설정을 기록합니다.
- runtime mode 도출과 development login route registration 조건을 확인합니다.
- development/test와 production/demo의 secure-cookie 차이를 실제 option branch로 확인합니다.
- 기존 세 transport를 전제로 하던 caller/test가 어떤 단일 경계로 바뀌었는지 기록합니다.
- 이 수정이 URL, referrer, log, JavaScript-managed header 노출을 줄이는 직접 코드 근거를 분류합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### Fix 연결 골격

- 기존 가정: Durable session을 cookie, Bearer header, query parameter에서 모두 받아도 동일한 편의 기능으로 취급할 수 있다는 초기 경계.
- Source에서 드러난 failure/risk: 재사용 가능한 session secret이 JavaScript, URL, referrer, log에 노출되고 development login이 deployed mode에도 남을 수 있음.
- Root cause 코드 근거: [학습자 작성 — 해당 SHA의 실제 caller, state, branch를 인용]
- 수정된 decision/invariant: credential transport를 `pp_session` HttpOnly cookie 하나로 제한하고 route/cookie 정책을 runtime mode에 종속시킴.
- 실제 수정 코드: [학습자 작성 — 파일, 심볼, 변경 전/후 최소 코드]
- Regression 연결: 해당 SHA와 이후 인증 테스트에서 Bearer/query 거부, production/demo route 부재, secure-cookie 조건을 연결해 기록합니다.

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
- 직전 Thread 관련 SHA: `1779df300611` — `feat(api): 로그인과 로비 HTTP 경계 구현`
- 다음 Thread 관련 SHA: `353ca9a17415` — `fix(web): browser token 저장 제거`

### 5.3. `fix(web): browser token 저장 제거`

| 항목 | 값 |
| --- | --- |
| SHA | `353ca9a17415` |
| Importance | A |
| Tags | AUTH, PROTOCOL, REALTIME |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Removes JavaScript-managed durable credentials from the browser.
- Classification summary: Remove the browser-managed session token from the web application.

원문 구현 의도·상태 변화:

> Remove the browser-managed session token from the web application. The API client no longer reads or writes
> `localStorage`, never adds a bearer header, and relies on `credentials: "include"` so the server's HTTP-only
> cookie remains the sole HTTP credential.

원문 경계·failure handling·후속 범위:

> At the same boundary, successful responses are parsed with the shared runtime schemas and failures become a
> structured `ApiError` carrying status, code, request ID, and field errors, with a typed fallback for
> malformed upstream responses. A 401 dispatches a session-expired event, and endpoint helpers accept
> `AbortSignal` so component teardown can cancel requests.
> Lobby and play sockets now obtain a short-lived WebSocket ticket before constructing the connection URL,
> aborting an unfinished ticket request and closing stale sockets during cleanup. This prepares realtime
> authentication without exposing the durable session secret to JavaScript or URL parameters; administrator
> loading is also moved to its validated helper rather than an untyped generic request.

#### 해당 SHA에서 확인할 실제 코드

- API client에서 `localStorage` read/write와 Bearer header construction이 제거된 diff를 확인합니다.
- `credentials: "include"`가 공통 fetch 경계에서 일관되게 적용되는지 확인합니다.
- response schema parsing, structured `ApiError`, malformed-response fallback, 401 session-expired event의 control flow를 추적합니다.
- endpoint helper가 `AbortSignal`을 전달하고 teardown 시 request가 취소되는 ownership을 확인합니다.
- lobby/play socket이 URL 구성 전 short-lived ticket을 얻고 stale ticket request/socket을 정리하는 경로를 찾습니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### Fix 연결 골격

- 기존 가정: 서버가 cookie-only로 바뀌어도 browser localStorage/Bearer 처리와 socket URL credential 준비 코드가 남아 있을 수 있음.
- Source에서 드러난 failure/risk: 클라이언트가 durable secret의 두 번째 소유자가 되어 server invariant를 무효화하고 stale request/socket lifecycle을 남김.
- Root cause 코드 근거: [학습자 작성 — 해당 SHA의 실제 caller, state, branch를 인용]
- 수정된 decision/invariant: browser token storage/header를 제거하고 credentialed cookie, schema validation, cancellable ticket acquisition으로 경계를 통합함.
- 실제 수정 코드: [학습자 작성 — 파일, 심볼, 변경 전/후 최소 코드]
- Regression 연결: API-client unit tests에서 localStorage/Bearer 부재, cookie request, 401 transition, abort 전달을 확인합니다.

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
- 직전 Thread 관련 SHA: `d0531791406b` — `fix(auth): cookie-only session과 환경별 route 적용`
- 다음 Thread 관련 SHA: `d9bde7485719` — `feat(auth): WebSocket ticket 생성과 HTTP 계약 정의`

### 5.4. `feat(auth): WebSocket ticket 생성과 HTTP 계약 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `d9bde7485719` |
| Importance | A |
| Tags | AUTH, PROTOCOL, REALTIME |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Defines high-entropy raw tickets and hash-only storage semantics.
- Classification summary: Define the cryptographic and protocol representation for one-time WebSocket credentials.

원문 구현 의도·상태 변화:

> Define the cryptographic and protocol representation for one-time WebSocket credentials. Tickets are
> generated from 32 random bytes and encoded as a 43-character base64url value; only their SHA-256 digest is
> intended for storage, so a database disclosure does not reveal a usable raw ticket.

원문 경계·failure handling·후속 범위:

> The shared HTTP contract now validates the exact ticket alphabet and length, requires a strict handshake
> query containing that ticket and protocol version `1`, and fixes the response TTL at 30 seconds. Keeping
> generation and hashing separate from persistence gives both repository implementations the same opaque
> credential contract.

#### 해당 SHA에서 확인할 실제 코드

- ticket 생성 함수가 32 random bytes를 43-character base64url로 만드는지 확인합니다.
- raw ticket hash 함수와 SHA-256 digest representation을 기록하고 raw/digest가 각각 어느 caller로 전달되는지 추적합니다.
- shared HTTP response schema의 literal TTL 30 seconds와 handshake query의 protocol version `1`을 확인합니다.
- ticket alphabet/length와 query strictness가 runtime schema에서 어떻게 강제되는지 negative branch를 기록합니다.
- generation/hash와 persistence가 분리된 interface를 찾아 memory/PostgreSQL 구현이 공유할 contract를 정리합니다.

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
- 직전 Thread 관련 SHA: `353ca9a17415` — `fix(web): browser token 저장 제거`
- 다음 Thread 관련 SHA: `c89a455fee06` — `feat(db): PostgreSQL WebSocket ticket 저장 추가`

### 5.5. `feat(db): PostgreSQL WebSocket ticket 저장 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `c89a455fee06` |
| Importance | A |
| Tags | AUTH, SIMULATION, REALTIME |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Makes ticket consumption atomic and single-use in PostgreSQL.
- Classification summary: Add durable PostgreSQL storage for hashed WebSocket tickets.

원문 구현 의도·상태 변화:

> Add durable PostgreSQL storage for hashed WebSocket tickets. The migration enforces a 64-character lowercase
> SHA-256 digest, references the owning user with cascade deletion, records expiration, and indexes expiry for
> lifecycle maintenance.

원문 경계·failure handling·후속 범위:

> Ticket creation validates the hash and TTL before computing expiration in the database. Consumption uses a
> delete-returning CTE, so lookup and invalidation are one atomic operation; only an unexpired ticket
> belonging to an active user produces a session user. An expired, replayed, missing, or suspended-user ticket
> is still deleted and yields no identity, establishing single-use semantics at the persistence boundary.

#### 해당 SHA에서 확인할 실제 코드

- ticket migration/table에서 64-character lowercase digest, user FK cascade, expiry, index 제약을 확인합니다.
- ticket creation이 hash와 TTL을 검증하고 database time으로 expiry를 계산하는 SQL을 기록합니다.
- consume의 delete-returning CTE 또는 동등한 atomic SQL을 전체 읽고 lookup과 invalidation이 한 statement인지 확인합니다.
- expired/replayed/missing/suspended ticket이 identity를 반환하지 않으면서 row는 삭제되는 branch를 확인합니다.
- active user projection으로 변환되는 join/mapper와 transaction/connection boundary를 추적합니다.

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
- 직전 Thread 관련 SHA: `d9bde7485719` — `feat(auth): WebSocket ticket 생성과 HTTP 계약 정의`
- 다음 Thread 관련 SHA: `306d1946afb7` — `feat(auth): ticket 기반 WebSocket 인증 연결`

### 5.6. `feat(auth): ticket 기반 WebSocket 인증 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `306d1946afb7` |
| Importance | S |
| Tags | AUTH, REALTIME, RISK |
| 학습 깊이 | Architecture/invariant 중심으로 직전 상태, 결정, 핵심 전이, ownership, failure, 후속 검증까지 완전히 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Completes the cookie-to-ticket-to-socket trust handoff with bounded pre-auth buffering.
- Classification summary: Complete the WebSocket authentication flow by issuing tickets over an authenticated HTTP endpoint and consuming them during the socket handshake.

원문 구현 의도·상태 변화:

> Complete the WebSocket authentication flow by issuing tickets over an authenticated HTTP endpoint and
> consuming them during the socket handshake. Only an active cookie-authenticated user can request a ticket;
> the server stores its hash with the fixed TTL and returns the raw value once. The socket query must match
> the strict versioned schema, and the repository atomically consumes the hash before `GameHub` receives the
> user.

원문 경계·failure handling·후속 범위:

> Messages that arrive while asynchronous authentication is pending are buffered so early client commands are
> not lost, but the buffer is bounded by per-message size, message count, and total bytes. Protocol violations
> and oversized pre-auth traffic close the socket with explicit WebSocket codes, listeners are detached
> exactly once, and a connection that closes before authentication is not attached to the hub. This avoids
> both durable-session exposure and an unauthenticated buffering denial-of-service surface.

#### Source의 Most Important Commit 정의

##### Problem

> A WebSocket needs authenticated identity, but placing the durable cookie value in the socket URL or
> JavaScript would violate the cookie-only security model.

##### Decision

> Issue a random ticket through authenticated HTTP, store only its hash, consume it atomically during a
> versioned handshake, and bound all pre-authentication buffering.

##### Why it mattered

> The solution preserves early client commands without exposing a reusable session and closes an otherwise
> reachable unauthenticated memory-growth path.

##### What changed

> The commit adds the ticket endpoint, strict query parsing, atomic consumption, explicit close codes,
> per-message/count/byte limits, listener detachment, and closed-socket guards.

##### Project understanding

> It explains how HTTP authentication and realtime identity are joined without weakening the project’s
> credential or resource limits.

#### 해당 SHA에서 확인할 실제 코드

- cookie-authenticated ticket issuance endpoint에서 active-user check, raw generation, hash 저장, raw response 순서를 추적합니다.
- WebSocket handshake query strict parse와 repository consume가 `GameHub` registration보다 먼저 완료되는지 확인합니다.
- authentication pending 동안 설치되는 temporary message listener와 buffer 자료구조를 찾습니다.
- 8 KiB per-message, 16 messages, 32 KiB total 제한의 비교 조건과 close code를 기록합니다.
- 인증 성공 시 temporary listener 제거, normal receive handler 등록, buffered order replay 순서를 확인합니다.
- protocol violation, oversized traffic, auth failure, socket-closed-before-auth에서 listener/buffer/hub attachment가 어떻게 정리되는지 각각 추적합니다.
- durable session 값이 socket URL이나 browser JS로 전달되지 않는 전체 call chain을 확인합니다.

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
- 직전 Thread 관련 SHA: `c89a455fee06` — `feat(db): PostgreSQL WebSocket ticket 저장 추가`
- 다음 Thread 관련 SHA: `b0ee833313c1` — `test(auth): WebSocket ticket 경계 검증`

### 5.7. `test(auth): WebSocket ticket 경계 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `b0ee833313c1` |
| Importance | A |
| Tags | AUTH, PROTOCOL, REALTIME |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Exercises replay, expiry, suspension, protocol version, and concurrent consumption.
- Classification summary: Add end-to-end and repository-level verification for the one-time WebSocket credential boundary.

원문 구현 의도·상태 변화:

> Add end-to-end and repository-level verification for the one-time WebSocket credential boundary. The route
> tests require cookie authentication, random 43-character tickets, a 30-second/version-1 response, hashed
> rather than raw persistence, suspension rejection, one successful connection per ticket, and stable
> rejection of forged, expired, reused, or post-issuance-suspended credentials.

원문 경계·failure handling·후속 범위:

> They also prove that an unsupported protocol version does not consume an otherwise valid ticket, that
> durable session values supplied through cookies, bearer headers, or legacy query parameters cannot
> authenticate the socket, and that the pre-authentication buffer enforces the exact 8 KiB message,
> 16-message, and 32 KiB total limits.
> Repository tests exercise expiry and suspension in memory and issue 20 concurrent PostgreSQL consumption
> attempts, requiring exactly one success and no remaining row. This verifies that single use is an atomic
> storage invariant, not merely a sequential route convention.

#### 해당 SHA에서 확인할 실제 코드

- route, memory repository, PostgreSQL integration test를 구분하고 각 fixture의 resource lifecycle을 기록합니다.
- 43-character randomness, TTL/version literal, hash-only persistence를 검증하는 assertion을 찾습니다.
- forged, expired, reused, suspended-after-issuance ticket의 expected result와 row 소비 여부를 표로 만듭니다.
- unsupported protocol version이 valid ticket을 소비하지 않는 test setup과 실제 handshake parse 순서를 연결합니다.
- cookie/Bearer/legacy query의 durable session 값이 socket auth에 실패하는 regression을 확인합니다.
- 8 KiB, 16-message, 32 KiB boundary의 exact valid/invalid case를 확인합니다.
- PostgreSQL 20 concurrent consume에서 exactly one success와 zero remaining row를 확인하는 동시성 기법을 기록합니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | WebSocket ticket은 authenticated issuance 뒤 짧은 시간 동안 정확히 한 번만 소비되며 raw secret은 저장되지 않습니다. |
| 재현하는 failure/boundary | forgery, expiry, replay, suspension, wrong version, durable-session fallback, pre-auth buffer overflow, concurrent consumption. |
| test technique | route integration, memory repository test, PostgreSQL concurrency test, exact boundary payloads. |
| 통과하는 production path | cookie auth → ticket endpoint → hash storage → socket query parse → atomic consume → hub admission. |
| 증명하는 것 | single use와 buffer/security 경계가 route 관례가 아니라 storage/transport invariant임을 증명합니다. |
| 증명하지 않는 것 | 장기 socket liveness나 gameplay correctness는 검증하지 않습니다. |
| test 성격 | Security boundary integration + deterministic concurrency regression. |
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
- 직전 Thread 관련 SHA: `306d1946afb7` — `feat(auth): ticket 기반 WebSocket 인증 연결`
- 다음 Thread 관련 SHA: `ec9cb39babef` — `fix(log): 요청 비밀 정보 redaction 적용`

### 5.8. `fix(log): 요청 비밀 정보 redaction 적용`

| 항목 | 값 |
| --- | --- |
| SHA | `ec9cb39babef` |
| Importance | A |
| Tags | AUTH, REALTIME, OBSERVABILITY |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Prevents tickets and durable credentials from becoming operational log data.
- Classification summary: Configure Fastify request logging to exclude authentication material.

원문 구현 의도·상태 변화:

> Configure Fastify request logging to exclude authentication material. Cookies, authorization headers, query
> objects, and ticket fields are registered for defensive redaction, while a custom request serializer removes
> the complete query string before the URL is recorded.

원문 경계·failure handling·후속 범위:

> Retaining method, path, host, remote address, and port preserves useful request context without writing a
> raw WebSocket ticket or durable session credential to logs. Stripping the query at serialization time is
> important because redacting a parsed `ticket` field alone would not protect credentials embedded in the
> original URL.

#### 해당 SHA에서 확인할 실제 코드

- Fastify logger redaction path에 cookie, authorization, query object, ticket field가 어떻게 등록되는지 확인합니다.
- custom request serializer가 raw URL에서 query string 전체를 제거하는 구현을 확인합니다.
- method, path, host, remote address, port 중 보존되는 operational metadata를 기록합니다.
- parsed ticket field redaction만으로 raw URL secret을 막을 수 없는 기존 가정과 수정된 경계를 diff로 비교합니다.
- serializer/redaction에서 exception이나 누락이 발생해도 credential이 출력되지 않는지 관련 test 위치를 해당 SHA에서 찾습니다.

코드 근거를 남길 때:

- 반드시 이 SHA를 checkout하거나 `git show <SHA>:<path>`로 확인합니다.
- 파일 경로, symbol, caller/callee, 관련 조건식 또는 최소 코드 조각을 함께 기록합니다.
- final HEAD의 같은 이름 코드를 이 시점의 구현으로 간주하지 않습니다.

#### Fix 연결 골격

- 기존 가정: parsed request field redaction만으로 WebSocket URL의 ticket을 숨길 수 있음.
- Source에서 드러난 failure/risk: raw URL query string 또는 nested request object가 structured log에 credential을 남김.
- Root cause 코드 근거: [학습자 작성 — 해당 SHA의 실제 caller, state, branch를 인용]
- 수정된 decision/invariant: redaction path와 URL serializer를 함께 적용해 query string 자체를 기록 전에 제거함.
- 실제 수정 코드: [학습자 작성 — 파일, 심볼, 변경 전/후 최소 코드]
- Regression 연결: logger serializer와 masking test에서 raw ticket 부재와 non-secret context 보존을 확인합니다.

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
- 직전 Thread 관련 SHA: `b0ee833313c1` — `test(auth): WebSocket ticket 경계 검증`
- 이 Thread의 최종 상태와 비교해 이후 보완 여부를 기록합니다.

## 6. Invariant ledger

Source에서 확정된 invariant를 아래 시점별로 연결합니다. 새 invariant를 추측해 확정하지 않습니다.

| Invariant | 처음 도입/관찰한 SHA | 강화한 SHA | 부족함이 드러난 SHA | 복구한 fix | 고정한 regression test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| The durable browser session is carried only by an HttpOnly cookie; raw WebSocket tickets are short-lived, single-use, hashed at rest, bounded during authentication, and excluded from logs. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |

추가 기록:

- invariant가 동일한 문장으로 유지되었는지, 더 강한 조건으로 바뀌었는지 구분합니다.
- implementation detail과 invariant를 혼동하지 않습니다.
- source가 명시하지 않은 규칙은 “관찰한 가설”로 표시하고 코드 근거로만 남깁니다.

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| durable session이 cookie/Bearer/query 및 browser storage에 분산됨 | `d0531791406b` cookie-only → `353ca9a17415` browser token 제거 | 해당 SHA의 auth/web tests와 `b0ee833313c1`의 durable-session socket 거부 | durable credential 단일 소유 |
| socket 인증용 재사용 credential 또는 race/buffer 노출 | `d9bde7485719` contract → `c89a455fee06` atomic storage → `306d1946afb7` handshake 통합 | `b0ee833313c1` replay/expiry/concurrency/buffer 검증 | one-time admission |
| ticket이 request log에 남을 위험 | `ec9cb39babef` redaction + query stripping | 해당 SHA의 masking test를 확인 | operational secret boundary |

학습자 보완 기록:

- 실제 failure를 주입하거나 재현하는 test fixture를 찾아 위 표의 각 행과 연결합니다.
- fix가 symptom만 가리는지, ownership/invariant를 바꾸는지 코드 근거로 판별합니다.
- broad integration과 deterministic regression을 별도 표시합니다.

## 8. Ownership / state / responsibility 변화

| 축 | 초기 SHA의 owner/state | 중간 전환 | Thread 최종 owner/state | 해제·cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| durable browser credential ownership | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| raw ticket versus digest ownership | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| ticket issuance and atomic consumption | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| pre-auth message buffer lifecycle | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| request logging and secret redaction | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |

## 9. Thread 최종 상태

다음 항목은 최종 HEAD를 보고 채우지 말고, 이 Thread의 마지막 commit까지 순서대로 복원한 결과로 작성합니다.

- 최종 authoritative owner: [학습자 작성]
- 최종 상태/invariant: [학습자 작성]
- 남아 있는 의도적 제한 또는 비보장: [학습자 작성]
- 후속 Thread가 의존하는 contract: [학습자 작성]
- 대표 코드 근거: [SHA, 파일, symbol]

## 10. 최종 architecture 또는 execution flow 정리

- cookie → ticket → socket identity handoff를 credential 값의 노출 위치까지 포함해 정리합니다.
- 인증 실패와 resource-abuse 실패가 서로 다른 계층에서 차단되는 이유를 설명합니다.
- ticket 발급만 구현했을 때 남는 취약 지점과 이 Thread가 추가로 닫은 경계를 기록합니다.

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
