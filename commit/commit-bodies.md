## chore(workspace): pnpm 모노레포 경계 구성
Establish the repository as a pnpm monorepo whose executable applications and reusable libraries live under `apps/*` and `packages/*`. Root scripts and Make targets delegate build and type checking recursively, so each workspace retains control of its own command while the repository has a single verification entry point. Pinning the pnpm version also makes dependency installation behavior less dependent on the developer's global tooling.

A strict shared TypeScript baseline targets ES2022, uses ES modules with bundler-style resolution, and enables consistent casing and interoperability rules. Package-specific configurations can extend that baseline without duplicating compiler policy, keeping cross-package types subject to the same language semantics.

## chore(repo): 로컬 빌드 산출물 제외
Exclude dependency trees, framework and compiler output, coverage and browser-test reports, local environment files, logs, and operating-system metadata from version control. This keeps the repository centered on authoritative source and configuration while preventing machine-specific state and secrets from becoming accidental inputs to later commits.

## chore(shared): 공유 패키지 경계 구성
Create `@pong-pong/shared` as an independently addressable workspace for contracts consumed by more than one application. The package exposes a single source entry point, validates itself with a package-local no-emit TypeScript build, and declares Zod as the runtime-schema dependency needed by transport contracts.

The root path mapping resolves the package directly to its TypeScript source. That avoids requiring a separate package build during early development, but it also means consuming applications must be able to transpile the workspace source rather than treating it as precompiled JavaScript.

## feat(shared): 사용자와 서비스 DTO 정의
Define the canonical HTTP-facing representations for users and the initial service domains before the API, database, and browser implementations diverge on naming or shape. The contracts cover identity and moderation state, match modes, dashboard and leaderboard projections, friendship state, chat messages, and tournament summaries.

`PublicUser` deliberately excludes email while `SessionUser` extends it with the account-specific field, establishing a privacy boundary between generally distributable user data and the authenticated session response. Runtime presence is represented separately through `online`, and temporal values are transported as strings, leaving persistence-specific row types and JavaScript `Date` objects outside the cross-application contract.

## feat(shared): 퐁 시뮬레이션 계약 추가
Define the shared geometry, timing, lifecycle, and state representation for Pong. Fixed court, paddle, ball, winning-score, and tick-rate constants give the server simulation and browser renderer one coordinate system, while paddle input is restricted to the discrete directions `-1`, `0`, and `1`.

A snapshot carries the complete observable match state—phase, tick, scores, paddles, ball, players, and server time—so clients can render authoritative server output without owning game rules. The separate finished result adds the persisted match identifier and rating effect. This commit establishes the serialization boundary; it does not yet implement physics or state transitions.

## feat(shared): WebSocket 이벤트 메시지 검증
Introduce a discriminated WebSocket protocol and validate every client-originated message at runtime before application handlers consume it. Queue operations, readiness, paddle input, and chat each have an explicit payload shape; queue mode has a defined default, input is limited to the three legal directions, and chat text is trimmed and bounded to 1–240 characters.

Parsing JSON before applying the Zod union distinguishes malformed serialization from a structurally invalid event and returns a typed event on success. Server-originated events use a TypeScript discriminated union and a single JSON encoder, covering matchmaking, snapshots, completion, chat, presence, and errors. Unlike client input, server output is type-checked at compile time rather than validated again at runtime.

## test(shared): WebSocket 프로토콜 검증
Lock down the WebSocket boundary with table-driven tests for every accepted client event, the default queue mode, required fields, legal enum values, and the exact paddle-direction domain. Chat tests cover whitespace normalization and both valid and invalid length boundaries, while malformed JSON and unknown event types verify that invalid transport input is rejected before reaching domain logic.

Representative values for every server event variant are encoded and round-tripped through JSON, confirming that the declared payloads remain serializable without structural loss. The repository-wide test command is extended to invoke package tests recursively, making protocol regression checks part of the normal workspace verification path.

## chore(db): PostgreSQL 패키지 경계 구성
Create `@pong-pong/db` as the persistence workspace, isolating PostgreSQL and Kysely dependencies from the API package that will consume repository operations. The package depends on shared service contracts, uses `pg` as the database driver, and reserves TSX and Vitest for executable tooling and verification.

Its local no-emit TypeScript configuration lets persistence code participate in repository type checking without producing build artifacts. This boundary makes database access an explicit package dependency rather than allowing transport code to acquire driver-specific concerns directly.

## feat(db): 초기 PostgreSQL schema 정의
Establish the initial durable data model for identity, sessions, friendships, completed matches, chat, tournaments, and administrative actions. UUID primary keys are generated by PostgreSQL, user handles and emails are unique, and foreign keys encode the ownership relationships among users and the records they create or participate in.

Delete behavior is chosen per relationship: sessions, friendships, chat messages, and tournament entries are removed with their owning user or tournament, while historical match, tournament-creator, winner, and administrative references are not uniformly cascaded. Directed friendship and tournament-entry uniqueness constraints prevent duplicate rows for the same stored relationship. Indexes support the two initial recency-sensitive reads—completed matches by end time and chat by scope and creation time. The migration uses `if not exists`, making initial setup repeatable, although it is a bootstrap schema rather than a versioned alteration mechanism for later changes.

## feat(db): migration 실행 경계 구성
Make the database package importable and give runtime code an executable schema-initialization boundary. The package now exports its source entry point, exposes type-check scripts, and is added to the workspace path aliases so applications can depend on `@pong-pong/db` rather than reaching into its directory structure.

The initial PostgreSQL schema is also represented as an exported SQL string that can be submitted through Kysely. This lets repository startup apply the same tables, constraints, cascades, and indexes without relying on a filesystem-relative migration command. At this stage the executable string duplicates the standalone migration file, so their equivalence depends on manual maintenance; the commit establishes execution access, not an automated migration registry or generated single source of truth.

## feat(db): 사용자와 세션 row schema 정의
Describe the users and sessions tables as Kysely types and introduce an explicit mapping boundary from database rows to shared application models. Generated columns identify values supplied by PostgreSQL defaults, while the selected row types preserve nullable email and ban timestamps and the shared role/status unions.

`toPublicUser` converts snake-case storage fields, normalizes numeric values, and receives online presence as runtime context rather than treating it as persisted state. `toSessionUser` extends that public projection with email, making the privacy boundary visible in code: public responses do not acquire account email merely because the underlying row contains it. The narrowed `UserProjectionRow` documents the exact columns required by both mappers.

## feat(db): 저장소 lifecycle 구성
Introduce `AppRepository` as the persistence lifecycle boundary and provide PostgreSQL and memory implementations behind the same factory-level contract. PostgreSQL construction owns both the connection pool and the typed Kysely client, while `close` tears down those resources and tolerates a redundant pool-end failure. The memory repository implements the same lifecycle as no-ops, allowing callers to clean up without branching on the backend.

`ensureSeedData` is the first initialization hook: PostgreSQL executes the idempotent initial schema string and memory performs no work. Centralizing initialization and closure in the repository means later API bootstrap can select storage once and retain a single ownership rule for startup and shutdown.

## feat(db): 개발 사용자 seed 저장 구현
Turn repository initialization into a usable development dataset and add a shared development-login upsert. Handles are trimmed, lowercased, restricted to the supported character set, collapsed around repeated hyphens, and given a safe fallback. Display names fall back to that canonical handle, emails receive a deterministic development domain, and avatar keys are selected deterministically from the handle, so repeated initialization produces stable user identities and presentation values.

PostgreSQL upserts by unique handle, refreshes mutable login fields, seeds representative players, promotes the `admin` handle, and applies sample ratings and records for lobby views. The memory repository implements the same identity-upsert boundary with UUID-backed local rows and seeded users, but its initial sample set and rating details are intentionally simpler in this revision. Both implementations return the shared `SessionUser` representation, allowing higher layers to remain independent of row storage.

## feat(db): 사용자 session 저장 구현
Add session creation and resolution to the repository abstraction so authentication state is owned by persistence rather than by the HTTP server. PostgreSQL generates an opaque UUID token, stores it with the user and a 14-day expiry, and only resolves sessions whose expiration remains in the future. Joining through the session table returns the current user projection without exposing the persistence row to callers.

The memory repository mirrors token-to-user lookup for local execution and tests, while deliberately omitting expiry behavior at this stage. Returning `null` for a missing or unknown token gives higher layers one consistent unauthenticated result across both implementations. This establishes the identity lookup boundary later reused by HTTP and WebSocket authentication.

## feat(db): 프로필 조회와 변경 저장 구현
Expand the repository from login-oriented identity access to public profile lookup, authenticated profile updates, and active-user listing. Both implementations normalize handles before lookup, preserving the same canonical identity rule used when users are created.

Profile updates use the stored value whenever a field is omitted, allowing partial changes without replacing unrelated attributes. The PostgreSQL implementation returns a session-capable user after the update, whereas public lookup maps through the restricted `PublicUser` representation. Active-user listing filters out non-active PostgreSQL users, orders by rating, and caps the result for lobby use; the memory implementation provides the same observable ranking order for its local dataset.

## feat(db): 순위 조회 구현
Add a leaderboard projection to the repository contract. Ranking is deterministic by descending rating with wins as the tie-breaker, and PostgreSQL limits the public result to the leading 20 users. Each entry combines a one-based rank, the public user representation, and a derived win percentage rather than exposing raw persistence rows.

Win rate is calculated from wins and losses with an explicit zero-game result and rounded to one decimal place. The memory repository applies the same ordering and calculation, preserving comparable behavior for API tests and local execution.

## feat(db): 경기 조회 row contract 정의
Define the typed row and mapping boundary for persisted matches. The schema records mode, nullable winner and loser identities, left/right scores, rating delta, and lifecycle timestamps, while the joined projection adds both player handles needed to construct a user-facing summary.

`toMatchSummary` interprets the same stored match relative to an optional viewer: it selects the opposing handle, derives win or loss, normalizes numeric database values, applies the displayed rating delta, and serializes the end time. Keeping this interpretation in a mapper prevents SQL column names and nullable join details from leaking into the API contract. With no viewer identifier, the initial mapper treats the record as a win-oriented global summary, which is the behavior available at this stage.

## feat(db): 최근 경기와 대시보드 조회 구현
Implement recent-match and dashboard reads behind the repository contract. PostgreSQL optionally filters matches to those involving a user, joins winner and loser handles, orders by completion time, and caps the history at eight records. The row mapper then presents each result relative to that user. The memory repository mirrors filtering, reverse-chronological ordering, and the same bounded history over its local records.

Dashboard construction combines the public current-user projection with recent matches and derived statistics. Email is removed from the returned `me` value even though the repository has session-level access to it, preserving the dashboard's public-data boundary. Win rate comes from recorded wins and losses; the initial best-streak value is a bounded estimate in PostgreSQL and a fixed prototype value in memory, so this commit establishes the response shape before a true streak calculation exists.

## feat(db): 친구 관계 저장 구현
Add friendship listing, request, and acceptance to the repository abstraction. PostgreSQL treats either participant as an owner of the relationship when listing, joins the opposite user's public data, and orders by the last state change. Requests resolve the addressee by normalized handle and use an upsert on the ordered requester/addressee pair so repeating the same directed request refreshes it instead of creating another row.

Acceptance constrains the update to the recorded addressee, preventing the requester or an unrelated user from accepting that row through this method. The memory implementation reproduces the pending-to-accepted observable transition for tests, although it stores a simplified unscoped list and does not enforce the same participant check in this revision. The shared mapper keeps relationship metadata separate from the represented friend's user fields.

## feat(db): 경기 결과 저장 구현
Add match completion to the repository contract so realtime game execution can persist one domain result without depending on a concrete database. The input records the mode, winner and loser identities, and both scores; the repository returns the generated match identifier needed by later completion events.

The PostgreSQL implementation writes the match and then applies the project's initial fixed rating and record adjustments: the winner gains a win and 16 rating points, while the loser gains a loss and loses 12 points with an 800-point floor. The memory implementation mirrors the match record and counter updates for local and test use. These statements are sequential rather than wrapped in an explicit transaction in this revision, so the commit establishes the persistence behavior but not yet an atomic all-or-nothing result update.

## feat(db): 채팅 메시지 저장 구현
Extend the repository with persisted chat messages for both lobby and match scopes. Message storage now carries the scope, optional room identifier, sender identity, body, and creation time, while the public representation embeds the mapped sender rather than exposing database column shapes to callers.

Lobby history is deliberately bounded to the latest 20 records. PostgreSQL reads those records newest-first for efficient limiting and reverses them before returning, preserving chronological display order; the memory repository applies the same tail-window behavior. Keeping lobby and match messages in one typed record with an explicit scope allows a common write path while retaining the room boundary required for match-only delivery.

## feat(db): 토너먼트 row contract 정의
Define the typed persistence representation needed to map tournaments into the shared application contract. Separate tournament and entry tables model event metadata independently from membership, allowing one tournament to preserve an ordered seed for each participating user and to reference its creator and eventual winner.

The joined-row projection makes the creator's user fields explicit, and `toTournamentSummary` converts that database-oriented shape plus an independently loaded entry list into the API-facing aggregate. Participant count is derived from the entries rather than trusted as duplicated storage, capacity is normalized to a number, and the creator is mapped through the same public-user boundary used elsewhere. Winner mapping remains `null` at this stage, matching the still-unimplemented tournament progression.

## feat(db): 토너먼트 참가 저장 구현
Implement tournament creation, listing, and entry through the common repository interface. PostgreSQL lists recent tournaments with creator information, loads each seeded participant list, and maps the rows into the shared `TournamentSummary`. Creation uses a four-player capacity and immediately enrolls the creator, establishing the invariant that a newly created cup begins with its owner as its first participant.

Joining assigns the next seed from the current entry count and uses the tournament/user uniqueness constraint to make repeated joins non-duplicating. The memory repository mirrors creator enrollment, duplicate suppression, participant counts, and the transition from `open` to `running` when capacity is reached. This keeps local and database-backed application code behind the same aggregate-level contract, although concurrent seed allocation is not serialized explicitly in this revision.

## feat(db): 관리자 상태 변경 저장 구현
Add administrator-facing user listing and ban-state mutation to the repository boundary. The PostgreSQL mutation updates the target user's status and ban timestamp, then records a separate `admin_actions` row containing the actor, target, action, and reason. Passing both identities through the method keeps authorization decisions in the service layer while preserving enough persistence context for an audit trail.

The memory repository implements the same observable active/banned transition so API tests can exercise the contract without PostgreSQL. It does not persist the audit record, and the PostgreSQL update and audit insert are not enclosed in an explicit transaction in this revision; the change therefore establishes the intended data model and behavior without yet guaranteeing atomic audit consistency.

## feat(db): 데이터베이스 CLI 명령 연결
Expose repository initialization through package-level CLI commands for migration/seed setup and verification. Both `migrate` and `seed` currently invoke the repository's idempotent `ensureSeedData` path, making schema setup and baseline data creation reproducible from the package scripts rather than requiring application startup as the only entry point. A Vitest command is also added for repository verification.

The CLI requires `DATABASE_URL`, constructs the PostgreSQL repository once, and closes it in a `finally` block so connection ownership is explicit even on invalid commands or failed initialization. The `memory-smoke` branch briefly initializes and closes a memory repository, although this revision still performs the database-URL check and opens the PostgreSQL repository before reaching that branch.

## test(db): 메모리 저장소 흐름 검증
Add behavioral coverage for the in-memory implementation of the shared repository contract. The first scenario creates users and a session, stores a completed match, and then requires session lookup and dashboard projection to reflect the same identity, win result, and updated win count. This verifies interaction among operations rather than isolated return values.

The second scenario checks that friend requests retain their pending state and that tournament creation enrolls the creator, updates the participant count, and becomes observable through listing. These tests make the memory repository a meaningful substitute for HTTP and service tests by protecting the state transitions on which those higher layers depend.

## chore(api): Fastify 패키지 경계 구성
Create the API workspace boundary with Fastify, cookie and CORS support, WebSocket integration, the shared and database workspace packages, and Zod for runtime contracts. The package scripts separate watch-mode development from normal startup while using TypeScript's no-emit check as the build and type-validation gate.

A package-local TypeScript configuration extends the repository baseline, enables Node types, and limits analysis to API source files. This makes the server an independently runnable workspace consumer of the shared contracts and repository abstraction rather than allowing application code to rely on undeclared root dependencies.

## feat(api): 로그인과 로비 HTTP 경계 구현
Establish the first HTTP boundary around the repository-backed identity and lobby model. Development login now creates or reuses a user, creates a server-side session, and exposes that session both as an `httpOnly`, `SameSite=Lax` cookie and as a returned token. The cookie supports normal browser requests without making the credential available to client-side JavaScript, while the explicit token also serves clients and later transports that cannot depend on cookie delivery.

Authentication lookup is centralized so protected routes do not each interpret credentials independently. The same session can be resolved from the cookie, a Bearer header, or a `session` query parameter, after which `/me` enforces authentication and the public lobby may enrich its response with an optional current user. Lobby, recent match, chat, and leaderboard reads remain repository operations, keeping HTTP concerns separate from persistence and domain representation. Credentialed CORS is restricted to the configured web origin and the supported local origins.

## feat(api): 실행 환경과 service bootstrap 구성
Introduce an explicit service composition root for runtime configuration, persistence selection, startup, and shutdown. Environment parsing now converts the API port, optional database URL, web origin, and session secret into one typed object with local prototype defaults. The nullable database URL is the switch between the PostgreSQL repository and the in-memory repository, so the HTTP application depends on the same repository contract in both deployed and local modes.

Bootstrap performs seed initialization before accepting traffic and registers repository closure with Fastify's shutdown lifecycle. A listen failure also closes the repository before terminating, preserving the ownership rule that whichever entry point creates the persistence resource is responsible for releasing it. Binding to `0.0.0.0` makes the service reachable from container and host networking rather than only the loopback interface.

## feat(api): 프로필과 친구 리소스 라우트 추가
Expand the HTTP resource boundary to profiles, dashboards, and friendships while distinguishing public reads from identity-bound mutations. User and handle-based profile lookup remain public and return `404` when the requested identity does not exist, whereas the dashboard, current-profile update, friend listing, friend requests, and acceptance all derive the actor from the authenticated session.

Keeping the caller identity out of request payloads prevents clients from selecting another user as the owner of a mutation. The routes delegate profile updates, match lookup, and friendship transitions to the repository, leaving persistence and relationship rules behind one interface. Both `/friends/request` and `/friends` expose the same request operation, providing compatible HTTP entry points without duplicating the underlying state transition.

## feat(api): 토너먼트와 관리자 라우트 추가
Add tournament and administration resources with explicit authentication and authorization boundaries. Tournament listing is public, while creation records the authenticated user as `createdBy` and joining derives the entrant from the same session rather than trusting a client-supplied user identifier.

Administrative reads and status changes now distinguish an unauthenticated request (`401`) from an authenticated non-administrator (`403`). Ban and status mutations pass both the administrator's identity and the target identity to the repository, preserving an actor/subject boundary that can support audit records. The route layer decides who may invoke the operation; the repository remains responsible for applying and persisting the resulting user state.

## test(api): 로그인과 로비 조회 검증
Add API integration coverage through Fastify injection rather than testing route helpers in isolation. A fresh seeded memory repository and application are created for each test and both are closed afterward, making session and repository state deterministic across cases.

The test follows the real development-login path, reuses the returned Bearer token on `/me`, and verifies that the authenticated identity survives the complete route-to-repository round trip. Separate assertions keep the public leaderboard and lobby readable and confirm that seeded ranking data is actually exposed. The package test command makes this boundary executable as part of the workspace's normal verification flow.

## test(api): 실행 환경 기본값 검증
Lock down configuration precedence and the local runtime contract. Explicit environment values must be parsed into the configured port, database URL, and web origin, while an empty environment must select port `4000`, no database connection, and the local web origin. This prevents later bootstrap changes from silently disabling the in-memory development mode or changing the service's expected local endpoints.

## test(api): 관리자 사용자 상태 변경 검증
Exercise the administrator state-change path through real login, token authentication, routing, and repository mutation. The test creates separate administrator and target identities, submits the administrator's Bearer token to the ban endpoint, and verifies that the returned target representation is `banned`.

Using a fresh memory repository keeps the authorization scenario isolated while still checking the integration between session resolution, role-gated routing, and persisted user status. The case specifically protects the successful administrator path; it does not substitute for separate denial-path coverage.

## test(api): 토너먼트 생성 흐름 검증
Verify the tournament write-to-read contract across authentication, HTTP routing, and repository storage. After logging in, the test creates a named tournament with the returned Bearer token and then reads the public tournament collection, requiring the newly created name to appear in the response.

This guards against implementations that acknowledge creation without making the tournament observable through the repository-backed listing endpoint. Fresh application and repository instances, followed by explicit cleanup, keep the persistence result attributable to this single flow.

## feat(realtime): 인증된 WebSocket 연결 구성
Add the authenticated WebSocket upgrade boundary and the first connection hub. The `/ws` handler resolves the same repository-backed session identity used by HTTP routes before admitting a socket; missing identity closes with a policy-violation code, while authentication infrastructure failure uses an internal-error close code.

`GameHub` assigns each accepted transport an internal connection identifier, retains the associated `SessionUser`, removes the client on close, and broadcasts typed presence events only to open sockets. This establishes identity before realtime state is created, so later matchmaking and game commands can be attributed to an authenticated user rather than trusting client-supplied identity fields.

## feat(game): 실시간 경기 방 초기화
Introduce the server-owned room representation and the canonical initial `GameSnapshot`. Room creation assigns left and right participants, substitutes a typed AI participant when required, initializes scores, paddles, ball, phase, and server time from shared game constants, and records the room identifier on each connected client.

Participants receive side-specific `queue.matched` events and the same initial snapshot, while room broadcasting is isolated from global presence broadcasting. Disconnect cleanup clears every participant's room reference before deleting the room. The factory is not yet reachable from client commands in this revision; it defines the ownership and initialization invariants used by the following matchmaking work.

## feat(game): 실시간 매칭 대기열 연결
Connect validated client events to matchmaking. Queue entry first removes any existing occurrence of the client, preventing duplicate positions; AI mode creates a room immediately, while normal mode pairs the new entrant with the oldest waiting client or appends it to the FIFO queue.

Queue departure is used both for an explicit `queue.leave` command and socket disconnect, keeping closed connections out of future matches. Malformed protocol input is contained at the connection boundary and returned as a typed error event rather than mutating queue state.

## feat(game): 실시간 경기 채팅 전달
Handle `chat.send` as an asynchronous, repository-backed realtime operation. The authenticated connection supplies the sender identity, the repository creates the canonical message, and only that persisted result is broadcast to clients.

Match-scoped messages with a room identifier are sent through the room broadcast boundary; lobby messages are sent to all connected clients. Persisting before publication keeps the event payload, later history reads, and sender representation aligned, while repository or validation failures are returned to the originating socket through the existing protocol error path.

## feat(game): 서버 주도 퐁 물리 갱신
Implement the authoritative simulation step inside `GameHub`. Each tick advances server time and tick number, applies bounded paddle movement, derives the AI paddle direction from the ball position, advances the ball, reflects it at field and paddle boundaries, increments scores when it leaves the court, resets the serve, and broadcasts the resulting snapshot.

Paddle contact changes both horizontal speed and vertical angle according to the impact offset, producing controllable rallies without moving collision authority into the browser. The commit defines the deterministic state transition but does not yet schedule it; readiness and timer lifecycle are connected in the following change.

## feat(game): 경기 준비와 paddle 입력 연결
Connect readiness and paddle commands to room state. A client can affect a room only when `sideFor` proves that its internal connection occupies one of that room's participant slots. Readiness is reflected in the snapshot, the AI side is marked ready automatically, and the fixed-rate simulation timer starts once both sides are ready and only if no timer already exists.

Room-scoped input updates only the authenticated participant's direction and ignores finished rooms. Separating a durable direction from individual key events lets the server sample movement on its own tick schedule, preserving simulation authority and preventing duplicate ready events from creating multiple loops.

## feat(game): 경기 종료와 결과 저장 연결
Give realtime rooms a terminal lifecycle. A room finishes when either side reaches the shared winning score, when the 45-second tick limit is reached, or when a human participant disconnects, in which case the remaining side is selected as the winner.

`finishRoom` clears the simulation timer, marks the authoritative snapshot finished, persists the match with its mode, participants, and final score, and broadcasts a `game.finished` result carrying the repository-assigned match identifier. It then clears participant room references, removes the room, and rebroadcasts presence. Consolidating all terminal paths in one method is important because persistence, notification, timer ownership, and room cleanup must occur as one lifecycle transition.

## chore(web): Next.js runtime 경계 구성
Establish the web workspace as a Next.js application with development, production build, and type-check commands, React and styling dependencies, and a TypeScript configuration derived from the repository base. Local path aliases expose application source and workspace packages without publishing intermediate artifacts.

`transpilePackages` makes `@pong-pong/shared` an explicit framework boundary, allowing the web application to consume the shared TypeScript source and protocol types through the monorepo. The generated Next.js type reference accompanies these hand-authored runtime and compiler decisions but is not itself the semantic source of the configuration.

## chore(web): Tailwind style build 구성
Configure PostCSS to run Tailwind and Autoprefixer and restrict Tailwind's source scan to the web application's TypeScript and TSX tree. The theme extends a small set of named application colors and a shared card shadow, making later components depend on stable semantic tokens instead of repeating raw values.

This is a build-time styling boundary: only classes reachable from application source are generated, and browser prefixing is applied through the same CSS pipeline.

## feat(web): 한국어 로비 shell 초기화
Create the initial Next.js App Router shell with Korean document metadata, language declaration, global design tokens, base element rules, reusable card styling, and an accessible focus-visible treatment. The first home page states the product boundary as a Korean realtime Pong lobby with server-run matches.

Keeping document metadata and global visual primitives in the root layout and stylesheet provides one foundation for later routes rather than allowing each screen to define its own page chrome and interaction focus behavior.

## feat(web): 인증 API client 구현
Create a shared browser-side HTTP client for authentication and the first application read models. `apiFetch` centralizes the API base URL, cookie participation, JSON headers, bearer-token propagation, non-success handling, and typed response decoding, so individual pages do not duplicate transport policy.

Development login persists the returned token in local storage for subsequent HTTP and WebSocket use, while `/me` translates an authentication failure into an unauthenticated result. Lobby, dashboard, leaderboard, and tournament reads deliberately fall back to typed sample data in this early UI stage; state-changing tournament creation still propagates failure rather than pretending that a write succeeded.

## feat(web): 사용자와 서비스 sample 데이터 추가
Add a typed fixture set for users, leaderboard rows, a player dashboard, lobby chat, and tournaments. Building every sample through the shared domain interfaces makes the UI exercise the same field shapes as the API instead of maintaining unrelated view-only mock objects.

The fixtures provide deterministic development and failure-state content while service integration is incomplete. They are presentation support rather than an alternative source of truth: generated ranks, win rates, and tournament membership are confined to the sample module and can be replaced wholesale by real responses.

## feat(web): 경기 snapshot sample 추가
Add a complete `GameSnapshot` fixture for rendering the court before a realtime room is connected. The sample uses the shared field dimensions and paddle constants, includes both player descriptors, and represents ball position, velocity, score, phase, and server time in the same structure emitted by the game service.

Reusing protocol constants keeps the preview geometrically compatible with live snapshots and lets the renderer be developed against the production contract rather than a separate canvas-specific model.

## feat(web): 공통 내비게이션 프레임 구현
Introduce a reusable application shell that owns route navigation, active-route highlighting, responsive sidebar layout, and the common content width. Centralizing this frame keeps feature pages focused on their own data and actions and gives all major routes a consistent information hierarchy.

The connection, readiness, version, and wait-time labels in this first shell are static presentation text, not observations from the runtime. Later work can replace them at one shared boundary instead of repairing independent status claims on every page.

## feat(web): 퐁 캔버스 미리보기 구현
Add a canvas renderer that consumes a `GameSnapshot` and draws the field, center line, paddles, ball, and scores from shared game dimensions. The canvas backing store is scaled by the device-pixel ratio while drawing remains in logical game coordinates, preserving crisp output without changing the server's coordinate system.

Rendering is rerun when the snapshot changes, making the component equally usable for a fixture preview and later server snapshots. A separate `StatCard` component also establishes a small reusable visual primitive for labeled metrics without coupling it to any particular service response.

## feat(web): 개발용 로그인 패널 추가
Add a development-login form that collects the handle and display name, calls the typed authentication client, and returns the authenticated `SessionUser` to its parent. Transport failure is converted into an explicit visible error while a successful login remains the only path that updates caller state.

The component is intentionally scoped to the development authentication endpoint. Keeping that workflow behind a dedicated panel prevents pages from embedding token persistence and login-request details.

## feat(web): 로비 인증 진입 연결
Make the home route branch on authenticated session state. On mount it restores the current user and loads the lobby aggregate; unauthenticated users receive the development-login panel, while authenticated users enter a lobby summary populated with the returned player and chat counts.

The lobby request can also supply `me`, allowing one response to reconcile identity with the lobby view. This establishes authentication as the entry boundary for the application instead of exposing logged-in screens solely through client navigation.

## feat(web): 로그인 사용자 로비 화면 구성
Replace the authenticated home-page summary with a complete lobby composed inside the common shell. Session statistics, online players, lobby messages, and links into matchmaking, AI practice, and the leaderboard now form the primary post-login navigation surface.

Player and chat collections are bound to the previously loaded lobby response, while several descriptive metrics such as weekly change and the 30-second wait estimate remain fixed copy in this revision. The change therefore establishes the lobby's responsibility and layout without misrepresenting those labels as measured service data.

## feat(play): 경기장 화면 구성
Add the initial dedicated play route around the reusable Pong canvas. The page defines the visible boundaries for queue entry, AI practice, connection status, score, and player readiness while rendering a typed sample snapshot.

All controls and status values are still local presentation in this revision. Establishing the screen before transport integration keeps court rendering and match layout independently testable, while later commits can connect each affordance to the realtime protocol without restructuring the page.

## feat(play): WebSocket 경기 연결 구현
Turn the play screen into a client of the realtime game protocol instead of a static preview. The page opens an authenticated WebSocket only after a stored session token is available, joins either the public queue or an AI room when the transport opens, and records the room identifier returned by `queue.matched` before allowing `game.ready` to be sent.

Snapshots, completion results, and protocol errors now drive the visible match state. This keeps the server authoritative over room assignment, simulation, score, and termination while the browser owns only connection intent and presentation. Carrying the assigned `roomId` through later commands also prevents a ready signal from being applied without an established match context.

## feat(play): keyboard paddle 입력 연결
Map Arrow and W/S keyboard events to the room-scoped `game.input` protocol. A pressed movement key sends `-1` or `1`, while key release sends the neutral direction so the server does not continue applying stale movement after the player stops pressing a key.

The listeners are installed only for the lifetime of the current room binding and are removed when that binding changes or the page unmounts. This makes browser input an ephemeral command stream rather than local simulation state, preserving the server's ownership of paddle movement.

## feat(play): 경기 상태와 채팅 panel 구성
Expand the match view around the authoritative snapshot by displaying the right-side player as the opponent and rendering incoming `chat.message` events beside the court. The message list retains only a small recent window, bounding the amount of transient UI state accumulated during a long session.

The commit establishes the presentation boundary for opponent information, match chat, and future match controls. At this stage the chat input and pause button are visual affordances only; received chat is the only newly connected behavior, so the interface does not yet claim that those controls affect the server.

## feat(web): 플레이어 대시보드 구현
Introduce a dashboard route backed by the shared `DashboardSummary` read model. One request supplies the player record, aggregate win rate and streak, and recent matches, allowing the page to render mutually consistent statistics without assembling several independent client-side queries.

The recent-match list is data driven and preserves the API's result and score representation. The rating polyline remains a fixed visual placeholder in this revision, so the commit establishes the dashboard layout and aggregate contract without implying that historical rating samples are already available.

## feat(web): 순위표 화면 추가
Add a leaderboard route that consumes the shared `LeaderboardEntry` contract and renders the rank, player record, rating, and win rate returned by the API. The browser treats rank as server-provided data rather than re-sorting a separate user list, keeping the ordering rule and the displayed ordinal under one authority.

Sample entries provide an initial render while the request is pending, after which the complete list is replaced by the server response.

## feat(web): 토너먼트 대진표 화면 추가
Add the first tournament page and connect tournament listing and creation to the HTTP API. A newly created tournament is inserted into the local collection immediately from the returned `TournamentSummary`, so the screen reflects the persisted resource rather than synthesizing a client-only entry.

The accompanying bracket is an initial projection of the first tournament's entries into round columns. Tournament selection and participation are not connected yet, making this a deliberate first boundary: resource discovery and creation are functional, while bracket progression remains a presentation scaffold.

## feat(web): 공개 프로필 화면 추가
Introduce a dynamic public-profile route whose handle selects the displayed player identity. The page derives rating, win/loss totals, and win rate from a `PublicUser` representation and establishes the profile layout and social-action affordances used by later API integration.

This revision is explicitly fixture backed: an unknown handle produces a synthetic sample profile, the style description is static, and the friend and share buttons have no behavior. The commit therefore defines the client-side route and presentation contract without treating placeholder data as a durable profile source.

## feat(web): 관리자 화면 추가
Add a read-oriented administration route that requests the protected user list and displays each account's record, rating, and active or banned status. Keeping the operational view in its own route separates moderation concerns from ordinary player screens and provides a place for later privileged actions.

The page still starts from sample users and silently retains them when the request fails, while the review button is not connected. It therefore establishes the administrative information boundary but not yet a reliable permission signal or state-changing workflow.

## build(runtime): Compose와 Caddy 라우팅 추가
Define a reproducible multi-service runtime for PostgreSQL, the Fastify API, the Next.js client, and a Caddy gateway. Database readiness is checked before the API starts, persistent data and dependency directories receive named volumes, and service configuration is supplied through explicit environment variables.

Caddy presents one browser-facing origin on port 8080: `/api/*` is forwarded to the API with the prefix removed, `/ws` preserves the WebSocket endpoint, and all other requests reach the web application. This routing boundary avoids making the browser aware of container hostnames and gives HTTP, WebSocket, and UI traffic a single integration point.

## test(smoke): HTTP API 실행 검사 추가
Add a runtime smoke test that performs development login and then exercises authenticated `/me`, `/lobby`, and `/dashboard` reads together with the public leaderboard. The helper rejects every non-success response with its status and payload, turning routing, authentication propagation, and basic response availability into one executable deployment check.

This is intentionally broader and shallower than endpoint unit tests: it verifies that a running service can complete the principal HTTP path with real session credentials, not every field-level rule.

## test(smoke): WebSocket 경기 실행 검사 추가
Add a running-system WebSocket smoke test that logs in two players, authenticates both socket connections, joins the matchmaking queue, readies the resulting room, and waits for a playing snapshot and a relayed match-chat message. A bounded polling helper fails the check instead of allowing a missing protocol event to hang indefinitely.

The scenario verifies the principal realtime chain across HTTP authentication, WebSocket upgrade, matchmaking, readiness, simulation startup, and chat broadcasting. Registering it beside the HTTP smoke test makes transport integration part of the normal runtime verification surface.

## test(e2e): 한국어 내비게이션과 캔버스 흐름 구성
Playwright is introduced as a repository-level browser test runner with desktop and mobile Chromium projects, failure traces and screenshots, and configurable application origin. Initial scenarios complete development login, navigate the Korean lobby, dashboard, leaderboard, and tournament routes, and inspect canvas pixels to prove that the play surface performs real drawing rather than merely mounting an element.

The Makefile and package scripts expose the suite as a distinct end-to-end target. Treating browser behavior separately from unit and smoke tests establishes a verification boundary for routing, accessibility-oriented selectors, responsive viewports, and actual rendering output.

## chore(repo): pnpm과 TypeScript 캐시 제외
The repository ignore policy now excludes the local pnpm content-addressable store. This keeps machine-specific dependency cache data out of version control while leaving the lockfile as the authoritative, reviewable dependency-resolution artifact.

## fix(auth): 인증 완료 전 WebSocket 입력 보존
The WebSocket route now buffers payloads that arrive while asynchronous session resolution is in progress. After authentication succeeds, it removes the temporary listener, registers the client with the game hub, and replays the buffered payloads through the normal validated receive path; unauthenticated connections are still closed without being connected to the hub.

This closes a race in which a client could send `queue.join` immediately after the socket opened but before the server had installed the authenticated message handler. Preserving ordering through the same receive function avoids creating a separate pre-authentication command path.

## fix(game): 닫힌 WebSocket 대기열 참가자 제거
Queue entry now begins by scanning backward through the waiting list and removing clients whose WebSocket is no longer open. Pruning before selecting an opponent prevents a newly connected player from being paired with an unreachable socket and preserves the invariant that every match candidate can still receive the room assignment.

## build(web): production start와 TS cache 정책 구성
The web package now exposes a production `next start` command bound to the container interface and a test command that succeeds when no package-local tests exist. TypeScript incremental compilation is disabled for this application, keeping type-check results independent of a persisted build-info cache.

These scripts distinguish development, build, production serving, type checking, and package-level testing so orchestration can execute the artifact produced by `next build` rather than relying on the development server.

## fix(runtime): Compose에서 build 결과 실행
Compose now starts the API through its production start script and builds the Next.js application before serving it with the production server. A dedicated volume stores the web build directory separately from the bind-mounted source and dependency volume.

This makes the composed runtime exercise compiled application artifacts and production startup behavior instead of development watchers. Isolating `.next` prevents the source mount from obscuring or repeatedly discarding the container-generated build output.

## test(smoke): WebSocket 매칭과 socket 정리 안정화
The WebSocket smoke test now records which client observed each event, requires both clients to receive a match assignment for the same room, waits for a playing snapshot before exercising room chat, and closes both sockets in a `finally` block.

Side-aware assertions prevent one client's event from accidentally satisfying both participants' expectations. Unconditional cleanup also keeps a failed assertion from leaving live sockets and timers that could contaminate subsequent verification.

## feat(web): 사용자 동작용 API 함수 추가
Typed browser adapters are added for joining a tournament, loading a public profile with recent matches, requesting friendship by handle, and changing an administrative user status. Each helper owns the endpoint, HTTP method, payload shape, and response unwrapping for one user action.

Centralizing these transport details keeps pages focused on interaction state and ensures that identifiers and returned shared-domain types cross the UI boundary consistently.

## feat(play): 경기 채팅 입력 연결
The play page now sends trimmed match-chat messages through the current room's WebSocket connection and clears the controlled input after submission. The send action remains disabled until both a room and non-empty content exist, so the browser does not emit room-scoped messages without a valid destination.

The visible pause control is also disabled and labelled as future work instead of presenting an unimplemented button as an active match operation. This separates the chat capability that is wired end to end from control behavior that the server did not yet support.

## feat(profile): 친구 요청 동작 연결
The dynamic profile route now retrieves the requested public profile and connects the friend button to the authenticated friend-request API using the route handle as the target identity. The page reports the returned user's display name on success and presents a bounded failure message when authentication or target resolution fails.

The share control is deliberately disabled and relabelled rather than remaining as a button with no implementation. This makes the page's actionable surface correspond to operations that have an actual server contract.

## feat(admin): 사용자 상태 변경 동작 연결
The administration page now loads the server's user list and turns each status control into an authenticated active-to-banned or banned-to-active update. A successful response replaces only the matching user in local state, ensuring the displayed status comes from the server result rather than an optimistic guess; permission and loading outcomes are surfaced separately.

This connects the interface to the existing authorization boundary while retaining the API as the final authority over whether a status transition is permitted.

## feat(tournament): 생성과 참가 동작 연결
The tournament screen now keeps an explicit selected tournament, selects newly created competitions, and submits join requests for the current selection. Returned summaries replace the corresponding list entry so participant counts and status are refreshed from the API, while full tournaments disable the join action and authentication failures are reported to the user.

The bracket preview also reads entries from the selected competition rather than always using the first list item. This aligns list selection, mutation targets, and rendered tournament state around the same identifier.

## test(e2e): 화면 action의 실제 API 연결 검증
Browser tests now exercise the interactive paths that had moved beyond static presentation: starting an AI room and sending match chat, requesting friendship from a profile, creating and joining a tournament, and attempting an administrative status change. They also assert that intentionally unfinished controls remain disabled.

The coverage verifies that user actions cross the browser-to-API or browser-to-WebSocket boundary and produce observable state or permission feedback, rather than merely confirming that the controls are rendered.

## fix(web): body 없는 요청에서 JSON header 제외
The shared browser request helper now constructs a `Headers` object, adds JSON content type only when a body is present and no type was explicitly supplied, and adds authorization independently when a token exists. Bodyless requests therefore no longer advertise a JSON entity they do not contain, while caller-provided headers remain authoritative.

This keeps GET and other empty requests semantically accurate and avoids transport behavior caused solely by an unnecessary non-simple content type.

## feat(lobby): 실시간 로비 지표 API 추가
The game hub now records queue-entry timestamps and exposes live counts for connected clients, room participants, queued clients, active rooms, and recent matching wait time. Wait duration is measured when a queued player is matched, rounded to seconds, and retained as a bounded 20-sample window; no samples are represented as `null` rather than as a fabricated zero.

These values are added to the shared lobby response contract and returned by the lobby endpoint. Keeping the measurement beside the hub's in-memory queue and room ownership lets the API report runtime state without reconstructing it from unrelated persistence data.

## feat(chat): 쓰기 가능한 로비 채팅 API 추가
An authenticated lobby-chat endpoint now trims submitted text, rejects empty messages and content beyond 240 characters, and persists accepted messages with `scope: "lobby"`, no room identifier, and the authenticated user's identifier. The response returns the repository-created message, including its canonical sender and timestamp data.

Validation at the HTTP boundary prevents invalid text from entering storage, while deriving the sender from the session avoids trusting client-supplied identity.

## feat(chat): 로비 채팅 입력 화면 추가
The lobby page now provides a controlled chat form that trims empty submissions, calls the lobby-chat API, appends the returned message to a bounded 20-item history, and reports loading or send failures. The API helper also stops silently replacing failed lobby reads with fixtures and exposes the complete shared `LobbyResponse` type.

Using the server-returned message preserves canonical identifiers, sender data, and timestamps in the UI. Error propagation makes a failed server read distinguishable from a valid lobby response, even though this stage still retains sample values as the page's initial presentation.

## fix(play): 패들 조작과 Canvas rendering 개선
Paddle input is now sampled as persistent direction state and transmitted every 50 milliseconds while a room is active, rather than relying on the browser's key-repeat cadence. Key release explicitly returns the direction to zero, and the movement keys suppress their normal page-scrolling behavior.

The canvas also keeps a bounded history of deep-copied server snapshots and renders an 80-millisecond delayed view through `requestAnimationFrame`, linearly interpolating paddle and ball positions between the surrounding samples. This separates authoritative state updates from display cadence: the server still determines scores and match state, while the browser smooths the motion visible between network snapshots.

## fix(lobby): 로비 상태 표현 개선
The lobby summary now renders the server-provided counts for online, playing, queued, and active-room state, and represents a missing average wait as no current wait instead of displaying a fixed 30-second estimate. Win totals are described as cumulative rather than as an unsupported weekly change.

These changes make operational labels and calls to action reflect the actual lobby response. The interface no longer presents static marketing values as measured realtime state.

## fix(profile): 공개 프로필 상태 표현 개선
The public profile now retains the recent-match collection returned with the profile response and renders each result, opponent, and score, including an explicit empty state. This replaces the fixed prose that previously described a player's style independently of stored match data.

Using repository-backed match history gives the public page evidence that is tied to the requested account and keeps the profile representation consistent with the same match summaries used elsewhere in the application.

## fix(dashboard): 경기 상태 표현 개선
The dashboard rating chart is now derived from the current rating and the recorded deltas of recent matches instead of a fixed SVG polyline. It reconstructs the pre-history value by subtracting the accumulated deltas, reapplies the matches in chronological order, and normalizes the resulting sequence into the chart coordinate system while guarding against a zero range.

An explicit no-match state and a minimal two-point fallback keep the visualization valid before any history exists. The chart therefore communicates persisted rating movement rather than decorative sample data.

## fix(play): 경기 세션 상태 표현 개선
The match chat now begins empty and renders a dedicated empty-state message instead of inserting a synthetic chat entry. This prevents presentation scaffolding from being mistaken for a message received or stored by the realtime system.

## fix(web): 내비게이션 사용자 상태 표현 개선
The application header no longer claims that average waiting time remains below 30 seconds. It now states only that lobby metrics are updated in realtime, matching the information actually supplied by the server rather than presenting an unverified service-level value.

## fix(api): body 없는 로비 채팅 요청 처리
The lobby-chat route now normalizes a missing request body to an empty object before reading its optional message field. Requests without a payload consequently follow the existing empty-message validation and return a controlled client error instead of throwing while dereferencing `undefined`.

## test(app): 실시간 지표·채팅·경기 기록 검증
The test suite now verifies the initial lobby metrics contract, authenticated lobby-chat persistence, sender and room attribution for lobby and match messages, chronological ordering of recent matches, and the cumulative rating and win effects of queue and AI results. Browser coverage also checks visible lobby metrics and chat delivery, exact navigation targeting, the pre-match empty state, and prevention of arrow-key page scrolling on the play screen.

Together these tests exercise the path from repository state through HTTP responses to browser behavior, protecting the distinction between stored application data and the sample or static presentation values removed by the surrounding fixes.

## fix(play): 실제 경기 상태에 맞게 세션 표시
The play session now starts without fabricated match data and derives the score, opponent, ready and chat availability, input transmission, and terminal cleanup from the latest server snapshot. Starting a new connection first detaches the old socket and resets room-local state; close callbacks ignore superseded sockets, and finish or close events clear the room and paddle direction. The canvas renders a neutral empty court until an authoritative snapshot arrives.

The queue selector also changes from first-in-first-out matching to the waiting opponent with the smallest absolute rating difference, retaining the earliest encountered candidate when distances tie. This makes both opponent selection and the visible session depend on live server state rather than fixture data or stale connection state.

## feat(protocol): 일시정지 WebSocket 계약 추가
The shared game contract now represents `paused` as an explicit phase and accepts `game.pause` and `game.resume` client events carrying a room identifier.

Defining the state and commands in the shared package keeps browser, server, and validation logic on the same protocol vocabulary. A distinct paused phase is preferable to overloading `waiting` or stopping client rendering locally because it makes the authoritative server state observable and constrains later transition handling to named protocol operations.

## feat(game): 서버 주도 일시정지 기능 추가
The game hub now handles pause and resume commands as server-owned room-state transitions. Only a participant may pause a room that is currently playing or resume one that is currently paused; pausing clears the room timer, resuming creates it only when absent, and each transition broadcasts an updated snapshot with a refreshed server timestamp.

Input is also ignored unless the room is actively playing. These checks preserve the lifecycle invariant that simulation advances under exactly one timer and that clients cannot continue mutating paddle state while the authoritative match is paused.

## feat(play): 일시정지와 재개 UI 연결
The play screen now derives pause and resume availability from the server snapshot phase and sends the corresponding WebSocket command for the current room. Snapshot updates also drive the displayed status, and the control remains disabled outside the `playing` and `paused` states.

This keeps the browser as a state consumer rather than a second owner of match progression: the button requests a transition, while the next server snapshot determines what the interface presents.

## feat(chat): 로비 채팅과 접속 상태 실시간 반영
The lobby now opens an authenticated WebSocket after the current user and session token are available. Lobby chat events are merged into the visible history with identifier-based deduplication and a bounded 20-message window, while presence changes trigger a fresh HTTP lobby read so aggregate statistics and online users remain consistent with the server.

Chat uses the socket when it is open and retains the existing HTTP path as a fallback. The effect clears handlers and closes connecting or open sockets during teardown, preventing stale connections from continuing to update an unmounted or re-authenticated page.

## fix(web): 로그인 화면의 sample fallback 제거
Authenticated and server-backed screens no longer substitute sample users, matches, chat, rankings, tournaments, or administrative data when requests fail. They now begin from empty or nullable state and render explicit loading, empty, authorization, and failure messages; action failures such as tournament creation are surfaced instead of silently preserving fixtures.

Removing the fallback restores a critical source-of-truth boundary. A network or authorization failure must not look like valid application state, especially on dashboards and administrative screens where fabricated data could conceal that no authenticated operation succeeded.

## feat(profile): 현재 프로필과 공유 기능 연결
The application shell now resolves the profile navigation target from the authenticated session instead of linking to a fixed test handle, while a prefix match keeps the profile item active for any user route. The profile page also copies its canonical same-origin URL through the Clipboard API and reports both success and failure.

Binding navigation to `SessionUser.handle` connects routing to the identity already established by the API and avoids exposing fixture-specific behavior. Constructing the share URL from `window.location.origin` keeps the link valid across development and deployed origins.

## feat(tournament): 대진 경기 contract 정의
The shared HTTP contract now includes tournament match summaries with bracket position, lifecycle status, participants, winner, scores, and optional room and persisted-match identifiers. The WebSocket command set also gains `tournament.join`, addressed by the tournament match identifier.

Keeping this representation in the shared package gives the API and browser one bracket-state vocabulary. Nullable participants, scores, and runtime identifiers model matches that exist before a bracket slot is populated or a room is created, while the finite round and status unions constrain the transitions later tournament code may expose.

## feat(tournament): 대진 경기 schema 추가
Introduce a dedicated `tournament_matches` persistence model for bracket state instead of deriving every round from tournament entries or ordinary game records. Each row owns its round, slot, participants, lifecycle status, room linkage, recorded match, scores, and winner, while `(tournament_id, round, slot)` makes a bracket position unique and therefore safe to create idempotently.

The SQL definition, embedded migration source, and Kysely schema are updated together so the runtime type model matches the database contract. Cascading deletion ties bracket rows to the tournament lifecycle, and the tournament/round/slot index supports ordered bracket retrieval.

## feat(tournament): 대진 row mapper 정의
Add explicit mapping from database-shaped tournament match rows to application records and public summaries. The internal record keeps identifier-oriented fields for lifecycle operations, while the public summary resolves participant and winner objects and includes scores plus room and match references.

Keeping this conversion at the database boundary prevents snake_case storage names, nullable foreign keys, and driver-specific numeric values from leaking through the repository API. It also gives persistence code and presentation code separate representations suited to their responsibilities.

## feat(tournament): 대진 경기 lifecycle 저장 구현
Extend `AppRepository` with operations to retrieve, start, and complete a tournament match, and implement the same contract for PostgreSQL and the in-memory repository. Starting a match associates its game room with the bracket row; completion stores the ordinary match record, winner, and scores, then advances the tournament by creating a final after both semifinals or by marking the tournament finished after the final.

The PostgreSQL implementation relies on the bracket-slot uniqueness constraint and `ON CONFLICT DO NOTHING` when materializing the final, so repeated completion handling cannot create duplicate final rows. Maintaining an equivalent memory implementation preserves the repository abstraction used by local and test execution.

## feat(tournament): 준결승 대진 생성과 조회 구현
Create the semifinal bracket when a four-player tournament reaches capacity and include persisted matches in tournament summaries. Entrants are ordered by seed and paired as first-versus-fourth and second-versus-third, while unique bracket slots make the creation step repeatable without duplicating matches.

Joining now rejects new entrants once capacity is reached, advances the tournament from `open` to `running`, and returns an explicit not-found error rather than relying on a non-null assertion. Tournament reads load matches in round-and-slot order, resolve their participant and winner profiles, and expose the persisted tournament winner so the API reflects the actual bracket lifecycle.

## feat(tournament): memory 대진 진행 구현
Bring the in-memory repository into behavioral parity with the PostgreSQL tournament flow. It now enforces capacity, creates the seeded semifinal bracket once the field is full, creates a single final only after both semifinal winners exist, and marks the tournament and winner when the final completes.

The helper guards make bracket and final creation idempotent within the process. This matters because the memory repository is not merely a stub: callers can exercise the same lifecycle contract without silently accepting extra entrants or omitting tournament progression.

## feat(tournament): 토너먼트 경기 방 진행
Integrate tournament bracket matches with the realtime game hub. A `tournament.join` event now validates that the bracket row is ready, that the caller is one of its two assigned participants, and that the connection is not already in another room. Eligible players wait per bracket match; once both sides arrive, the hub fixes left/right ownership from the bracket, creates a tournament-mode room, and persists the room transition.

Rooms now carry an explicit `MatchMode` and optional tournament match identifier instead of inferring mode solely from the AI flag. On game completion, the ordinary match is recorded with the correct mode and the bracket lifecycle is completed with the same room, match, winner, and score data. Disconnect cleanup also removes stale tournament waiters, preventing abandoned sockets from being paired later.

## feat(tournament): 플레이 가능한 대진 UI 연결
Replace the placeholder tournament bracket with the persisted match model and connect eligible participants directly to realtime play. The tournament page groups semifinals and finals, displays lifecycle status, score, and winner data, and offers an entry link only when the current user belongs to a ready match.

The play page consumes the bracket match identifier from the URL and sends the corresponding `tournament.join` event exactly once. Queue, AI, and tournament entry now share one socket-opening path, which keeps connection setup and message handling consistent while allowing each mode to supply its own initial protocol event.

## feat(admin): 감사 가능한 사용자 상태 API 추가
Make account suspension an enforced server-side authorization state rather than a presentation-only flag. Suspended users are rejected from the WebSocket boundary and from state-changing chat, friendship, and tournament routes, while unauthenticated and suspended cases remain distinguishable as `401` and `403`.

The administration contract now exposes recent ban/unban actions with actor, target, reason, and timestamp data. PostgreSQL and memory repositories both record and return that audit trail, and the endpoint itself is restricted to administrators. This couples every status transition with reviewable evidence while ensuring a suspended identity cannot retain realtime or mutation privileges through an already issued session.

## feat(admin): 감사 기록과 상태 변경 UI 추가
Connect the administration interface to the audit-capable API. Operators can provide a reason for a status transition, refresh the affected user in place, and immediately reload the action log so the visible record reflects the completed server mutation.

The page presents target, action, rationale, actor, and time from the shared audit representation rather than reconstructing history client-side. Passing the reason through the API client removes the previous hard-coded placeholder and makes the UI participate in the server's accountability contract.

## fix(api): 변경 요청용 CORS method와 header 허용
Declare the cross-origin methods and request headers used by authenticated mutation requests. In addition to credentialed origins, the API now permits `PATCH`, `DELETE`, preflight `OPTIONS`, JSON content types, and authorization headers.

This fixes browser preflight rejection for administration and other state-changing routes without broadening the allowed-origin list. The CORS policy therefore matches the actual HTTP contract instead of allowing only the plugin defaults.

## test(app): 전체 서비스 흐름 검증
Expand regression coverage across the administration, tournament, repository, browser, and smoke-test boundaries. The tests verify that a ban produces an auditable reason and immediately blocks mutations, that filling a four-player cup creates two ready semifinals, and that completing both semifinals advances the in-memory bracket with the correct finalists.

The browser scenarios exercise the same vertical contracts through the rendered application: realtime game phases and pause/resume, profile navigation and sharing, tournament entry, and visible administration audit data. Unique message and reason values prevent persisted test data from creating false matches, while API setup is used where arranging a full bracket solely through the UI would obscure the behavior under test.

## fix(web): 안정적인 navigation key 사용
Give each navigation item a stable logical identifier and use it as the React key instead of the current destination URL. The profile destination changes from the lobby fallback to `/profile/<handle>` after session data loads, so keying by `href` made the same conceptual item appear to be a different element and forced unnecessary reconciliation.

Separating component identity from mutable routing data preserves the navigation item's lifecycle while still allowing its target to update.

## fix(db): 최근 경기에서 최고 연승 계산
Derive the dashboard's best winning streak from actual recent match results instead of a fabricated formula or repository-specific constant. Because recent matches are exposed newest first, the helper reverses them into chronological order, increments on wins, resets on any loss, and retains the largest contiguous run.

Both PostgreSQL and in-memory repositories now use the same calculation and the same fetched history, keeping their dashboard semantics aligned. The resulting value deliberately describes the available recent-match window rather than claiming a season-wide statistic.

## test(db): 최고 연승 계산 검증
Lock down both the ordering and reset rules of the winning-streak calculation. The fixture records a win, a loss, then two wins; the repository returns those results newest first, while the expected best contiguous run remains two.

This catches implementations that count total wins, fail to reset after a loss, or accidentally interpret presentation order as chronological order.

## fix(dashboard): 연승 지표 설명 정정
Change the dashboard hint from “this season” to “recent matches” so the interface describes the metric's actual data boundary. The repository computes the streak only from the retained recent-match list, and the UI no longer implies broader historical coverage.

## fix(dashboard): 빈 rating history를 정확히 표시
Treat an empty match history as absence of rating evidence rather than manufacturing a two-point chart. The dashboard now omits the SVG series and presents an explicit empty state until at least one persisted match exists.

Removing the synthetic `currentRating - 1` fallback distinguishes “no data” from a real flat or changing rating history, so the visualization cannot imply a transition that never occurred.

## feat(lobby): 연결 중인 WebSocket 사용자 목록 추가
Make the realtime hub, rather than persistent account storage, the authority for lobby presence. `onlinePlayers()` projects the currently connected clients, removes private email data, marks them online, deduplicates multiple sockets by user identifier, and returns a deterministic rating-and-name order.

The lobby endpoint now reports this live connection state. This prevents seeded or merely registered accounts from appearing online and keeps presence ownership with the component that actually manages connection lifecycles.

## test(lobby): WebSocket 사용자 목록 검증
Assert that the lobby returns an empty online-player list when no WebSocket clients are connected. The check protects the distinction between persisted users and live presence, preventing repository seed data from being mistaken for active sessions.

## fix(game): 경기 시간에 따라 공 속도 증가
Introduce time-based ball acceleration so long rallies become progressively faster without allowing unbounded simulation speed. Each tick scales the velocity vector while preserving its direction, enforces an elapsed-time minimum to recover the intended pace after collisions, and caps the magnitude at a fixed maximum.

Ball resets now inherit a bounded elapsed-time boost instead of returning to the original slow speed after every point. Centralizing the initial velocity, per-tick acceleration, and cap makes the pacing contract explicit and keeps resets and continuous play consistent.

## test(app): 실시간 로비와 공 가속 검증
Extend the WebSocket smoke flow to verify two live-system properties rather than only protocol connectivity. After opening both sockets, the test queries the lobby and requires both handles to appear, proving that HTTP presence is derived from active realtime connections.

The same running game captures an initial velocity magnitude, waits for additional simulation ticks, and requires a strictly greater speed while also enforcing the intended starting pace. This exercises acceleration through emitted snapshots and therefore covers the server tick loop, not just an isolated helper.

## fix(web): 비로그인 상태의 me 요청 생략
Return `null` from `getMe()` immediately when the browser has no stored session token. This keeps the unauthenticated state local and avoids sending a request that can only produce an authorization failure.

The guard also prevents routine public-page rendering from generating unnecessary `401` traffic and leaves real token validation to requests made only when credentials are present.

## fix(web): 만료된 session token 정리
Remove the persisted session token whenever an authenticated API request receives `401 Unauthorized`. A rejected credential can no longer remain in local storage and be attached repeatedly to every later request.

Centralizing this cleanup in `apiFetch` applies the authentication-state transition consistently across callers: a server-declared invalid session becomes an unauthenticated client state, while other failure statuses preserve the token because they do not establish that it is invalid.

## feat(db): NPC 사용자 contract와 schema 추가
Add an explicit NPC discriminator to the user persistence model and public user contract. The database column defaults existing and ordinary users to `false`, row projections carry it through joined chat and tournament queries, and mappers expose it as `isNpc`.

Keeping NPC identity in the shared user representation allows later matchmaking and UI code to distinguish automated opponents without inferring from handles or display names. PostgreSQL, memory rows, and WebSocket fixtures are updated together so the new field remains part of one consistent cross-layer contract.

## feat(db): rating 구간별 NPC 상대 저장
Seed a fixed set of automated opponents at ascending rating bands and expose them through a dedicated repository query. NPC upserts restore their canonical profile, active state, rating, and discriminator, while ordinary development logins explicitly clear `is_npc` so a handle collision cannot leave a human session classified as automated.

Both persistence implementations return only active NPCs, sorted by rating and marked offline. Separating `listNpcOpponents()` from general user and presence queries gives matchmaking an authoritative candidate set without pretending these stored identities own live connections.

## test(db): NPC seed와 leaderboard 분리 검증
Verify that seed initialization produces the four intended rating-banded opponents in ascending order and that every result is explicitly classified as an offline NPC. The test protects the repository boundary used for AI selection, including the distinction between stored automated identities and realtime player presence.

## feat(game): NPC 상대를 경기 방에 연결
Prepare game rooms and result persistence to carry a real NPC user instead of a hard-coded anonymous AI label. Room creation can now accept an NPC profile for the right-side snapshot and matched notification, and game completion resolves winner and loser as user-shaped identities so an automated opponent can participate in the stored match record.

This commit establishes the representation needed for persistent NPC opponents, including rating-based selection helpers, but does not yet schedule queue fallback or pass an NPC into room creation. The subsequent fallback change supplies that lifecycle connection.

## feat(game): 대기 플레이어 NPC fallback 구성
Add a bounded waiting policy for the human matchmaking queue. A player who remains unmatched for six seconds receives the closest active NPC by rating, is removed from the queue, and enters a queue-mode room whose right-side user is the selected automated opponent.

The fallback timer belongs to the queue entry and is cleared whenever the player is matched normally, leaves, disconnects, or is pruned. Those cleanup paths prevent a stale timeout from creating a second room after queue ownership has already changed. Storing the NPC separately on the room also preserves its identity through final result persistence even though it has no WebSocket client.

## feat(game): rating 기반 NPC AI policy 구현
Replace the single perfect-following AI rule with rating-banded behavior profiles. Reaction interval, prediction noise, mistake probability, paddle speed, and dead zone now vary with the selected NPC's rating, while the AI predicts the ball's arrival height by reflecting its projected trajectory across the top and bottom boundaries.

Target updates use deterministic room-and-tick noise rather than uncontrolled randomness. This retains reproducible server simulation and testability while still producing deliberate imperfections. Lower-rated opponents react less often, move more slowly, and accept wider error; higher-rated opponents approach the predicted intercept more quickly and accurately.

## feat(web): 대기열에서 NPC 상대 표시
Expose the automated-opponent distinction throughout the player experience. Queue entry now starts directly from the lobby URL, the play page automatically joins the requested queue, and the opponent panel identifies AI-controlled snapshot players. Leaderboard and profile views label NPC identities, while friendship actions are disabled for accounts that are not human participants.

These choices use the shared `isNpc` and realtime `ai` fields rather than handle conventions, so presentation follows the server contract. The queue copy also states the human-first, NPC-fallback behavior instead of implying that a human opponent is guaranteed.

## test(app): NPC fallback matching 검증
Exercise the delayed fallback through a real WebSocket session with no human opponent. The smoke test joins the normal queue, waits within a timeout that covers the six-second policy, requires a matched event naming an AI opponent, and then verifies that the game snapshot contains an AI-controlled player backed by an `npc-` identity.

This validates the complete timer, repository lookup, room creation, protocol emission, and snapshot path rather than testing only the selection helper. The wait utility accepts a scenario-specific timeout so the fallback assertion can remain stricter than the general smoke timeout.

## test(smoke): WebSocket 접속 상태 반영 대기
Make the realtime presence smoke check observe eventual state rather than assume that HTTP presence is updated at the exact moment both WebSocket `open` events fire. The test now polls the lobby until both connected handles appear.

The shared wait helper is converted to an async loop so predicates may themselves perform network requests. This preserves a bounded timeout while removing a race between transport establishment and the server-side connection callback that owns presence registration.

## test(e2e): 실시간 상태 검증 안정화
Stabilize browser tests around legitimate runtime variation and persistent parallel test data. The lobby assertion accepts any numeric wait time rather than only zero, and tournament identities are suffixed with the Playwright project and current time to avoid collisions across browsers or prior runs.

The tournament creator is also explicitly joined before the three additional entrants are added. That makes the four-player setup independent of any assumption that creation automatically inserts the creator, and keeps the bracket precondition visible in the test fixture.

## fix(api): logout 시 server session 폐기
Invalidate the server-side session during logout instead of clearing only the browser cookie. Session-token extraction is factored into a shared helper so logout and ordinary authentication resolve credentials from the same cookie, authorization header, or WebSocket query locations.

Both repository implementations now delete the supplied token, making logout a revocation operation: possession of the former token no longer grants access after the response. Missing credentials remain a harmless no-op, preserving idempotent logout behavior.

## test(api): logout session invalidation 검증
Verify logout as a server-side security transition. The test proves that a newly issued bearer token can access `/me`, performs logout with that token, and then requires the identical credential to receive `401`.

This prevents a regression where the response clears client state while the underlying session remains replayable.

## fix(web): profile link 전 사용자 식별 대기
Render the profile navigation item as disabled until the current session user has been resolved. Previously its temporary fallback destination was the lobby, allowing an unauthenticated or still-loading click to navigate somewhere unrelated to the advertised action.

The disabled element retains the same stable navigation identity and styling, then becomes a real link once the handle-specific destination is known. This separates loading state from a valid route instead of encoding uncertainty as a misleading URL.

## build(runtime): 지원 Node.js·pnpm 범위 고정
Align local version managers, package metadata, and container images on Node.js 24.18.0, while fixing pnpm at 10.32.1. The `engines` contract now rejects unsupported major runtimes and the deployment images use the same exact Node release developers are directed to install.

This removes an environment split where local tools and containers could resolve different runtime behavior. A root development script also starts the API and web workspaces together under the pinned package manager.

## refactor(db): SQL migration lifecycle 분리
Separate schema evolution from repository seeding and move SQL files under an explicit Kysely migration lifecycle. A migration provider discovers `.sql` files, sorts them by name, exposes each file as an `up` migration, and delegates execution and bookkeeping to `Migrator.migrateToLatest()`.

The repository no longer executes a monolithic embedded schema string every time seed data is requested. This establishes two distinct responsibilities: migrations reproducibly advance persistent structure, while `ensureSeedData` operates only on records after that structure exists. The migrator owns a short-lived database connection and reports the specific failed migration while still guaranteeing cleanup.

## feat(db): 환경별 seed profile 분리
Introduce explicit `development` and `demo` seed profiles. Development seeding retains named sample users, administrator promotion, and illustrative ratings, while both profiles install the NPC identities required for automated matchmaking.

This prevents production-like or demonstration environments from receiving developer accounts and synthetic player statistics merely because seed initialization is needed. PostgreSQL and memory repositories implement the same profile contract, with development remaining the default for existing tests and local callers.

## refactor(db): migration과 seed CLI 연결
Connect the database CLI to the newly separated migration and seed lifecycles. `migrate` now invokes the migration engine only, while `seed:dev` and `seed:demo` select their respective data profiles and always close the repository connection.

The API stops implicitly seeding PostgreSQL at process startup; only the in-memory runtime self-initializes because its state is ephemeral. This makes persistent startup depend on an explicit, ordered migration/deployment step and prevents every application boot from mutating reference data.

## build(repo): workspace 검증 명령 정리
Standardize root scripts and Make targets around distinct verification layers. Unit tests, HTTP smoke tests, WebSocket smoke tests, and Playwright end-to-end tests now have named entry points, while the aggregate smoke target composes the two protocol checks.

The Makefile delegates to package scripts rather than duplicating raw commands, giving local use and automation one authoritative command contract. Development startup and teardown are also exposed as Docker Compose targets with orphan cleanup.

## ci(repo): typecheck·unit·build workflow 추가
Add a read-only GitHub Actions verification job for every push and pull request. The workflow installs the repository's pinned pnpm and Node.js versions, restores the pnpm cache, requires a frozen lockfile, and runs type checking, unit tests, and the production build in sequence.

Using the same runtime contract as local and container execution makes CI a reproducibility check rather than a separate environment. The explicit timeout bounds stalled verification and the minimal `contents: read` permission limits the job's authority.

## test(web): API client 동작 검증
Add focused unit coverage for the browser API boundary and require the web package to contain real tests. A controlled `localStorage` implementation and mocked `fetch` verify server-rendering safety, token storage, credential and header construction, explicit content-type preservation, response-error propagation, and automatic token removal on `401`.

Endpoint-level cases also lock down login request shape and token persistence, the no-request behavior of unauthenticated `getMe`, graceful current-user failure, and extraction of typed payloads from response envelopes. These tests isolate client protocol behavior from pages, making authentication and HTTP regressions visible without a browser end-to-end run.

## feat(shared): 사용자 HTTP runtime contract 정의
Replace compile-time-only user interfaces with Zod schemas that are also executable at runtime. Roles, account states, friendship states, tournament states, and match modes now have one enum definition from which TypeScript types are inferred.

`PublicUser` and `SessionUser` validate identifier format, required names, integer statistics, online/NPC flags, and nullable email shape. Deriving types from the schemas prevents the static model and runtime validator from drifting as API boundaries begin validating untrusted JSON.

## feat(shared): 경기·대시보드 runtime contract 정의
Define executable contracts for match summaries, dashboard payloads, and leaderboard entries. The schemas constrain UUID and timestamp formats, nonnegative scores and streaks, rating-delta integers, result and mode enums, rank positivity, and percentage ranges.

The exported TypeScript types are inferred from these validators, so consumers can use the same definitions for static composition and runtime parsing. Nested dashboard and leaderboard structures reuse the previously established user schemas rather than duplicating their assumptions.

## feat(shared): 친구·채팅·로비 runtime contract 정의
Extend runtime validation to friendship, chat, lobby statistics, and the full lobby response. Chat messages now enforce scope, room identifier, timestamp, sender shape, and a nonempty 240-character body limit; live counters are required to be nonnegative integers and average wait time is nullable but never negative.

The composite lobby schema reuses the session, user, match, chat, and statistics contracts. This gives the high-traffic aggregate endpoint one recursively validated representation instead of trusting a collection of compile-time interfaces at the network boundary.

## feat(shared): 토너먼트·관리 runtime contract 정의
Define runtime schemas for tournament brackets, tournament aggregates, and administration audit records. Bracket validation captures round and lifecycle enums, nonnegative slot and score values, nullable participants and results, and UUID links to rooms and stored matches.

Tournament summaries compose the bracket and user schemas while enforcing positive capacity and nonnegative enrollment. Audit entries similarly validate actor/target nullability, action kind, reason, and timestamp. The inferred types keep these state-heavy API structures synchronized with their executable contracts.

## feat(shared): HTTP 요청·오류 schema 정의
Add strict schemas for route parameters, request bodies, and the common API error envelope. Unknown fields are rejected, identifiers are constrained, text is trimmed and length-bounded, login handles follow a limited syntax, and a profile update must contain at least one actual change.

The error contract provides a stable machine code, human message, request correlation identifier, and optional per-field details. Centralizing these rules in the shared package establishes one normalization and validation boundary for server routes and typed clients instead of scattering ad hoc checks across handlers.

## feat(shared): HTTP 응답 runtime contract 정의
Compose endpoint-specific response schemas from the shared domain validators. Health, session, profile, friendship, chat, leaderboard, tournament, and administration envelopes now describe both their wrapper keys and their nested payloads.

The WebSocket ticket response also fixes its lifetime and protocol version as literal contract values, making a change to either property explicit and detectable. Selected request and response types are inferred from these schemas for callers that need static signatures.

## test(shared): HTTP contract 검증
Verify the behavioral rules encoded by the new HTTP schemas. The tests cover valid session users, rejection of unknown privilege fields and malformed handles, whitespace normalization, UUID route requirements, nonempty profile mutations, and the exact structured error envelope.

The ticket case locks down both the short lifetime representation and protocol version, rejecting an unsupported version rather than treating it as a compatible shape. These checks ensure the validators are not merely type generators but enforce the intended boundary behavior.

## build(db): PostgreSQL integration 의존성과 명령 추가
Introduce an isolated PostgreSQL integration-test entry point backed by Testcontainers. Normal unit runs explicitly exclude `*.integration.test.ts`, while the dedicated command provides longer lifecycle timeouts, disables file parallelism, and uses a single worker so container and database ownership remain deterministic.

The root workspace exposes the command and the lockfile records the resulting dependency graph. This separates fast in-memory verification from tests that require a real PostgreSQL server without allowing either category to be silently skipped by its intended runner.

## test(db): PostgreSQL integration 환경과 계약 추가
Add real-PostgreSQL integration coverage around the migration, seeding, and test-resource lifecycles. A single PostgreSQL 16 container hosts per-test schemas selected through `search_path`, allowing each case to exercise the actual driver and SQL implementation without sharing application data.

The suite verifies migration creation and idempotence, the distinct demo and development seed populations, and explicit schema isolation. Its harness tracks every pool and repository, closes them in reverse order, drops the schema even when a callback throws, reports cleanup failures without masking the original error, validates generated schema names before interpolation, and separately proves that temporary containers stop on failure. These checks make resource ownership and cleanup guarantees part of the integration contract rather than test-runner assumptions.

## ci(db): PostgreSQL integration 검사 실행
Add the container-backed PostgreSQL suite as a separate CI job. It uses the same pinned Node.js and pnpm environment and frozen dependency installation as the ordinary verification job, but retains an independent timeout and command because it owns external container resources.

Keeping this gate separate preserves fast feedback from typecheck/unit/build while still requiring the production persistence path and its cleanup behavior to pass on every push and pull request.

## feat(db): 명시적 사용자 role 할당 추가
Remove handle-based privilege assignment from ordinary login and introduce an explicit repository and CLI operation for changing user roles. A user named `admin` is now created or refreshed as a normal user; administrator status must be granted through `user:set-role` with a validated `user|admin` argument.

The update targets normalized, non-NPC handles and fails when no eligible user exists. PostgreSQL and memory implementations share the contract, development seeding performs its administrator promotion explicitly, and administration tests do the same. This prevents knowledge of a special handle from acting as an authorization mechanism and makes privilege assignment a distinct operational action.

## test(auth): 명시적 role assignment 검증
Verify against PostgreSQL that a development account using the `admin` handle does not retain privilege merely by logging in. The test requires the refreshed account to be a normal user and then confirms that only `setUserRoleByHandle` promotes it.

This locks down the separation between identity selection and authorization assignment, preventing a future login path from reintroducing a magic privileged username.

## feat(api): typed HTTP 오류 boundary 추가
Introduce a centralized typed failure boundary for Fastify routes. Zod input failures are converted into a `400 validation_failed` error with path-indexed field messages, expected authorization and not-found cases use an `ApiHttpError`, and every emitted error follows the shared envelope with the current request identifier.

Unexpected failures are logged server-side and reduced to a generic `500` response so implementation details are not exposed. Output parsing fails closed when a handler violates its declared response schema. Installing one not-found and error handler gives routes a uniform status, code, message, correlation, and validation contract instead of assembling incompatible responses locally.

## feat(api): 인증·사용자 HTTP contract 적용
Apply the shared runtime contracts and typed error boundary to health, authentication, user, and profile routes. Request casts and permissive fallback values are replaced with strict parameter and body parsing, while each response is checked against the corresponding schema before it leaves the handler.

Development login now requires a valid handle and display name, creates the server session, and exposes that session only through the HTTP-only cookie; the JSON response no longer returns the bearer token. Authentication failures and missing users flow through the common error envelope, and profile updates must contain at least one validated field. Allowing `x-request-id` through CORS also preserves the request-correlation boundary for browser callers.

## feat(api): 로비·친구 HTTP contract 적용
Extend runtime validation to lobby, chat, leaderboard, dashboard, and friendship endpoints. Lobby and read-model responses are checked as complete aggregates, while chat and friend requests are trimmed and bounded by the shared schemas before repository calls.

Authentication and suspension checks now raise the common typed errors instead of returning route-specific bodies. The two friendship-request aliases share one handler, so they cannot drift in validation or authorization behavior, and friendship identifiers are required to be UUIDs before acceptance is attempted.

## feat(api): 토너먼트·관리 HTTP contract 적용
Apply the shared request, response, and error contracts to tournament and administration routes. Tournament creation no longer invents a default name for malformed input, join operations validate UUID parameters, and returned brackets are verified against the full tournament schema.

Administrator authentication is centralized in `requireAdmin`, preserving the distinction between an absent session and an authenticated non-administrator. Ban and status changes validate both identifiers and request bodies before mutation, then validate the resulting public user. This removes duplicated privilege checks and inconsistent ad hoc error payloads from the highest-trust HTTP boundary.

## refactor(api): HTTP boundary helper 통합
Remove the remaining route-local unauthorized and suspended response helpers and use the typed HTTP-boundary functions directly throughout the application. The refactor deliberately keeps route behavior unchanged while ensuring every authentication, suspension, and administrator failure is represented by the same exception-to-envelope path.

Using the helpers under their domain names also eliminates aliasing and the now-unused `FastifyReply` dependency, leaving one authoritative implementation for these status and error-code contracts.

## test(api): typed HTTP boundary 기대값 정렬
Update API, tournament, and administrator tests to exercise the cookie-based session contract established by the typed HTTP boundary. Tests extract the `pp_session` cookie from login responses, assert that login JSON does not expose a token, and use that cookie for authenticated requests and logout invalidation.

Administrator tests obtain the explicitly privileged account from the development seed instead of recreating privilege through ordinary login. This verifies both security boundaries together: browser authentication is carried by the HTTP-only server session, and administrator authority comes from explicit role assignment rather than a login payload or special handle.

## fix(auth): cookie-only session과 환경별 route 적용
Restrict session authentication to the `pp_session` cookie and remove bearer-header and query-string token fallbacks from both request handling and CORS. This gives the server one transport for browser credentials and avoids exposing reusable session secrets through URLs, logs, referrers, or JavaScript-managed authorization headers.

The application now derives an explicit runtime mode. The development login route exists only in development and test, while production and demo do not register it at all; cookies are marked secure in the externally served modes. These rules make test conveniences an environment-scoped capability rather than part of the deployed authentication surface.

## test(auth): cookie session 경계 검증
Add focused regression coverage for the complete authentication boundary. The tests require login to return only user data plus an `HttpOnly`, root-scoped, `SameSite=Lax` cookie; prove that the same token is rejected when supplied through an `Authorization` header or query parameter; and confirm that an `admin` handle remains unprivileged.

The suite also checks the common error envelope across validation, authentication, authorization, and missing-route failures, and verifies that production and demo runtimes do not expose the development-login endpoint. Together these cases protect both credential transport and environment-specific route availability.

## refactor(game): Pong simulation 상태와 초기화 분리
Introduce a dedicated representation for authoritative Pong simulation state and inputs. Tick, phase, scores, paddle positions and directions, ball state, and eventual winner are grouped behind `PongSimulation`, with one canonical initializer based on the shared arena constants.

The state-cloning helper prepares the simulation to advance from a read-only input state into a distinct result rather than mutating a room snapshot in place. At this stage the commit establishes the extraction boundary and initial-state contract; later commits can move rules into it incrementally without coupling them to WebSocket clients or room lifecycle data.

## refactor(game): paddle 이동과 벽 반사 모델링
Add the first deterministic simulation step: validate a positive finite delta, clone the prior state, scale movement against the configured tick interval, clamp both paddles to arena bounds, advance the ball, and reflect overshoot at the top or bottom wall.

Scaling by `deltaMs / fixedTimestep` keeps the rules expressed in per-tick units while remaining explicit about elapsed time. Mirroring the excess distance back inside the arena, rather than merely clamping the coordinate, preserves motion across the collision boundary. Finished states are returned as copies without further evolution.

## refactor(game): 득점과 충돌을 simulation에 통합
Move paddle collision, scoring, serve reset, acceleration, and match termination into the standalone simulation. A paddle hit is accepted only when the ball overlaps the paddle and is approaching that side; the contact offset controls vertical velocity while horizontal velocity reverses and increases. Missed balls increment the opposite score and reset from center toward the conceding side.

Speed growth preserves the velocity direction and is capped, while elapsed ticks impose a minimum progression so variable step sizes do not stall acceleration. The simulation finishes at the winning score or the match-duration limit, resolves timeout ties consistently to the left side under the current rule, records the winner, and clears paddle movement. This makes core game outcomes properties of one transport-independent state transition.

## refactor(game): 결정적 정수 난수 생성기 추가
Introduce an integer-only seeded pseudo-random generator for game AI. Numeric seeds are normalized to unsigned 32-bit values, string seeds are hashed deterministically, zero is replaced with a non-zero state, and a xorshift transition produces a repeatable unsigned stream.

`nextInt` accepts only positive safe bounds, and `snapshot` exposes the current generator state for replay verification. This separates gameplay randomness from process-global `Math.random`, making the random input to a match reproducible from a room seed rather than dependent on runtime timing.

## refactor(game): rating 기반 Pong AI 정책 분리
Extract the right-paddle AI into a deterministic policy parameterized by seed and rating. Rating tiers control reaction interval, prediction noise, mistake probability, and dead zone instead of changing the simulation itself, keeping skill variation at the input-generation boundary.

When the ball approaches, the policy predicts its vertical intercept while reflecting through arena walls, then adds seeded bounded error and occasional larger mistakes. When the ball moves away it recenters. The target is refreshed only at the configured reaction tick, and a state snapshot captures both random and reaction state, so identical simulation states and seeds yield identical paddle commands and replays.

## test(game): 결정적 simulation 검증
Establish deterministic and immutability guarantees for the extracted simulation and AI. Equal seeds must produce equal integer streams, the AI source must not fall back to floating-point pseudo-random helpers, equal AI instances must emit the same commands and snapshots, and finished games must produce no movement.

Simulation tests require repeated steps from the same state to be equal without mutating or sharing nested state, verify delta-scaled movement and arena clamping, cover winning-score termination and invalid deltas, and replay one thousand ticks twice to the same SHA-256 digest. The replay hash checks the combined simulation and AI snapshot, protecting the full deterministic transition chain rather than isolated outputs.

## refactor(game): 게임 방 상태 전이 모델링
Introduce an explicit room-session state machine for readiness, play, pause, reconnection, and completion. A match can enter `playing` only after both sides are ready, and pause or resume operations are effective only from their corresponding states.

Disconnects preserve the state to resume, track which sides are absent, and establish a 15-second deadline. A timely reconnect removes only that side and restores the prior state after all missing participants return. Expiry converts a single absence into a forfeit for the opposite side, while simultaneous absence produces no winner; finishing clears reconnection state so expiry cannot be applied twice. This isolates lifecycle rules from socket callbacks and game physics.

## test(game): 게임 방 상태 전이 검증
Lock down valid room-session transitions and reconnection boundary conditions. The tests require both readiness signals before play, idempotent pause behavior, restoration of a previously paused state on an in-window reconnect, and rejection immediately after the deadline.

They also verify that expiry fires exactly at the 15-second boundary, produces one forfeit result only once, and selects no winner when both sides are disconnected. These cases protect the distinction between transient transport loss and terminal match outcome.

## refactor(game): GameHub room에 simulation 상태 연결
Attach a `PongSimulationState` to every newly created game room and derive the initial public snapshot from that state. Paddle positions, directions, and ball coordinates now begin from the same canonical initializer instead of duplicating arena defaults inside `GameHub`.

This is the first integration step rather than a complete ownership transfer: the room still carries its transport snapshot alongside the simulation. Establishing the simulation as the source for initial physics state makes the subsequent frame migration possible without changing the WebSocket payload contract in the same commit.

## refactor(game): GameHub frame 계산을 simulation에 위임
Replace `GameHub`'s in-place frame physics with calls to `PongSimulation.step` at an explicit 50 ms timestep. The hub supplies current player or AI directions, stores the returned authoritative state, projects it into the existing wire snapshot, broadcasts that projection, and finishes the room when the simulation reports a winner.

This moves paddle movement, ball motion, collisions, scoring, acceleration, and terminal rules behind one deterministic transition boundary. `GameHub` remains responsible for scheduling, input collection, transport timestamps, broadcasting, and persistence, while the simulation owns game mechanics. The snapshot-sync function preserves the existing client protocol during that ownership change.

## refactor(game): GameHub에 결정적 AI controller 연결
Instantiate one seeded `PongAi` controller for each NPC room, using the room identifier as the replay seed and the selected NPC's rating as the skill profile. On each frame the hub asks that controller for the right-side direction and passes the command into the simulation; human rooms continue to use the received paddle input.

Keeping the controller as room-owned state preserves its random and reaction progression across frames. It also removes AI target calculation from the transport snapshot, so generated inputs and simulated physics follow the same deterministic state sequence.

## refactor(game): GameHub의 중복 물리 계산 제거
Delete the legacy physics, AI-profile, prediction, pseudo-random, collision, serve-reset, and acceleration helpers after the hub has been migrated to `PongSimulation` and `PongAi`. The associated constants, imports, and obsolete `aiTargetY` room field are removed as well.

This completes the responsibility transfer: there is no second rule implementation in `GameHub` that could diverge from the tested simulation or reintroduce the former sine-based randomness. The hub is left with orchestration and snapshot projection rather than dormant duplicate mechanics.

## fix(web): browser token 저장 제거
Remove the browser-managed session token from the web application. The API client no longer reads or writes `localStorage`, never adds a bearer header, and relies on `credentials: "include"` so the server's HTTP-only cookie remains the sole HTTP credential.

At the same boundary, successful responses are parsed with the shared runtime schemas and failures become a structured `ApiError` carrying status, code, request ID, and field errors, with a typed fallback for malformed upstream responses. A 401 dispatches a session-expired event, and endpoint helpers accept `AbortSignal` so component teardown can cancel requests.

Lobby and play sockets now obtain a short-lived WebSocket ticket before constructing the connection URL, aborting an unfinished ticket request and closing stale sockets during cleanup. This prepares realtime authentication without exposing the durable session secret to JavaScript or URL parameters; administrator loading is also moved to its validated helper rather than an untyped generic request.

## test(web): cookie 기반 API 경계 검증
Expand web API tests around the cookie-only and runtime-validated client boundary. A successful response with the wrong shape must fail schema parsing, structured and malformed HTTP failures must remain inside `ApiError`, 401 responses must publish the session-expired event, and cancellation must pass through to `fetch` without being rewritten.

The suite verifies the one-time WebSocket-ticket request, confirms helper-level signal forwarding, and parameterizes every endpoint helper to reject an invalid response envelope. This prevents individual helpers from silently returning unchecked JSON after the generic client adopted shared schemas.

## feat(auth): WebSocket ticket 생성과 HTTP 계약 정의
Define the cryptographic and protocol representation for one-time WebSocket credentials. Tickets are generated from 32 random bytes and encoded as a 43-character base64url value; only their SHA-256 digest is intended for storage, so a database disclosure does not reveal a usable raw ticket.

The shared HTTP contract now validates the exact ticket alphabet and length, requires a strict handshake query containing that ticket and protocol version `1`, and fixes the response TTL at 30 seconds. Keeping generation and hashing separate from persistence gives both repository implementations the same opaque credential contract.

## feat(db): PostgreSQL WebSocket ticket 저장 추가
Add durable PostgreSQL storage for hashed WebSocket tickets. The migration enforces a 64-character lowercase SHA-256 digest, references the owning user with cascade deletion, records expiration, and indexes expiry for lifecycle maintenance.

Ticket creation validates the hash and TTL before computing expiration in the database. Consumption uses a delete-returning CTE, so lookup and invalidation are one atomic operation; only an unexpired ticket belonging to an active user produces a session user. An expired, replayed, missing, or suspended-user ticket is still deleted and yields no identity, establishing single-use semantics at the persistence boundary.

## feat(db): memory WebSocket ticket 소비 구현
Extend the repository contract and in-memory implementation with the same ticket creation and consumption operations as PostgreSQL. The memory store records the owning user and absolute expiry, removes the entry before evaluating it, and returns an identity only when the ticket exists, is unexpired, and belongs to an active user.

Deleting before validation preserves one-use behavior even for expired or suspended credentials. This gives unit and route tests the same externally visible security semantics as the production repository rather than a permissive test-only substitute.

## feat(auth): ticket 기반 WebSocket 인증 연결
Complete the WebSocket authentication flow by issuing tickets over an authenticated HTTP endpoint and consuming them during the socket handshake. Only an active cookie-authenticated user can request a ticket; the server stores its hash with the fixed TTL and returns the raw value once. The socket query must match the strict versioned schema, and the repository atomically consumes the hash before `GameHub` receives the user.

Messages that arrive while asynchronous authentication is pending are buffered so early client commands are not lost, but the buffer is bounded by per-message size, message count, and total bytes. Protocol violations and oversized pre-auth traffic close the socket with explicit WebSocket codes, listeners are detached exactly once, and a connection that closes before authentication is not attached to the hub. This avoids both durable-session exposure and an unauthenticated buffering denial-of-service surface.

## test(auth): WebSocket ticket 경계 검증
Add end-to-end and repository-level verification for the one-time WebSocket credential boundary. The route tests require cookie authentication, random 43-character tickets, a 30-second/version-1 response, hashed rather than raw persistence, suspension rejection, one successful connection per ticket, and stable rejection of forged, expired, reused, or post-issuance-suspended credentials.

They also prove that an unsupported protocol version does not consume an otherwise valid ticket, that durable session values supplied through cookies, bearer headers, or legacy query parameters cannot authenticate the socket, and that the pre-authentication buffer enforces the exact 8 KiB message, 16-message, and 32 KiB total limits.

Repository tests exercise expiry and suspension in memory and issue 20 concurrent PostgreSQL consumption attempts, requiring exactly one success and no remaining row. This verifies that single use is an atomic storage invariant, not merely a sequential route convention.

## fix(log): 요청 비밀 정보 redaction 적용
Configure Fastify request logging to exclude authentication material. Cookies, authorization headers, query objects, and ticket fields are registered for defensive redaction, while a custom request serializer removes the complete query string before the URL is recorded.

Retaining method, path, host, remote address, and port preserves useful request context without writing a raw WebSocket ticket or durable session credential to logs. Stripping the query at serialization time is important because redacting a parsed `ticket` field alone would not protect credentials embedded in the original URL.

## test(log): 비밀 정보 masking 규칙 검증
Verify that request serialization keeps `/ws` while discarding its ticket-bearing query string and that the serialized output contains no raw ticket value. The test also locks down redaction paths for both request-object naming variants, cookie and authorization headers, query objects, and nested ticket fields.

This prevents later logger configuration changes from restoring sensitive credentials to operational logs while preserving non-secret request metadata.

## feat(protocol): versioned game snapshot 계약 정의
Replace compile-time-only game interfaces with strict runtime schemas and reshape snapshots into an explicit transport model. A snapshot now carries room identity, monotonic tick and sequence numbers, numeric server time, and a nested game state containing phase, scores, paddles, ball, and players. Numeric values are constrained to finite or non-negative integer domains, and every object rejects unknown fields.

Finished results become a discriminated persisted/transient union. Persisted outcomes require a match identifier and may carry a rating delta; non-persisted outcomes must use `matchId: null`, `persisted: false`, and zero rating change. This makes persistence success part of the protocol rather than implying that every terminal frame was durably recorded, while the inferred TypeScript types remain derived from the executable contract.

## feat(protocol): versioned WebSocket event codec 연결
Make every client and server WebSocket event a strict runtime-validated version-1 message. Client commands now require `v: 1`, non-empty identifiers, bounded chat text, and a non-negative safe `inputSeq` for paddle updates. Server messages use the shared chat, snapshot, result, and player schemas and expose a finite set of machine-readable error codes.

Both directions now have codecs: incoming JSON is parsed through the client schema, outgoing events are validated before encoding, and clients can parse server payloads through the same authoritative definition. Requiring a version on each event, in addition to the handshake version, prevents silently interpreting structurally incompatible messages and creates a clear boundary for future protocol evolution.

## test(protocol): versioned event codec 기대값 정렬
Align the protocol tests with the strict version-1 event contract. The client-side cases cover every command shape, retain queue-mode defaulting without defaulting the protocol version, and reject missing or unsupported versions, unknown fields, invalid directions, and absent, negative, or fractional input sequence numbers. Chat normalization and its length limit remain verified under the new envelope.

Server-side fixtures use the nested snapshot representation, sequence and server-time metadata, persisted result discriminator, and coded errors. Round-tripping each event through `encodeServerEvent` and `parseServerEvent` verifies that the executable schema accepts the complete supported vocabulary and that encoding cannot bypass runtime validation.

## feat(game): versioned outbound event 송신 경계 연결
Centralize protocol-version attachment at the GameHub send boundary. Internal producers continue to construct the appropriate event variant without repeating `v: 1`, while `send` adds the version and passes the complete payload through the shared server-event codec before writing it to the socket. The distributive `VersionlessServerEvent` type preserves the field requirements of each union member rather than weakening producers to an arbitrary object.

The change also introduces a dedicated snapshot emission helper that increments the snapshot sequence and refreshes its server timestamp before broadcasting. Keeping versioning and emission metadata at these final transport boundaries avoids inconsistent call-site bookkeeping; subsequent room-state migration can use the helper without duplicating those rules.

## feat(game): GameHub snapshot envelope 초기화
Initialize each GameHub room with the versioned snapshot representation. Transport metadata—room identifier, tick, sequence, and numeric server time—now surrounds a nested `state` object that owns phase, scores, paddle and ball state, and player slots. The simulation remains the source for the initial physical values, but protocol metadata is kept separate from domain state.

The first room update is sent through `broadcastSnapshot` rather than a direct broadcast, so even the initial snapshot receives the same sequence increment and timestamp refresh as later frames. This establishes one ordering path for all snapshots from room creation onward.

## feat(game): GameHub snapshot 상태 소비를 전환
Migrate GameHub's room lifecycle and result handling to the nested snapshot state introduced by the versioned protocol. Readiness, phase changes, AI and player directions, scores, physics synchronization, and tournament completion now read or update `snapshot.state`, while ready, pause, resume, and tick transitions emit through the centralized snapshot broadcaster so sequence and server-time metadata advance consistently.

This commit was an intermediate migration rather than the final compatible state: the input assignment still referenced the removed flat paddle path, and the finished-result payload had not yet gained its persistence discriminator. The immediately following changes complete those two protocol obligations.

## feat(game): room별 input sequence 중복을 차단
Track the highest accepted input sequence separately for each client and room. A game input is applied only after the room is playing, the sender is an actual participant, and its `inputSeq` is strictly greater than the last accepted value; duplicate or reordered messages are ignored before they can overwrite the current paddle direction.

Scoping the sequence map by room prevents a previous match's counter from invalidating a new room, while keeping it on the client preserves ordering across all messages sent by that connection. The final assignment also completes the snapshot-envelope migration by writing to `snapshot.state.paddles`.

## feat(game): realtime 오류 code를 명시
Attach stable machine-readable codes to realtime failures instead of exposing only localized messages. Invalid payloads map to `invalid_event`, NPC matching failures to `internal_error`, unavailable tournament matches to `not_found`, and participant or concurrent-match violations to `forbidden`.

Separating the code from the human message lets clients branch on a bounded protocol contract without parsing display text, while preserving the existing explanations for users and logs.

## feat(game): 영속 경기 결과 metadata를 송신
Mark a successfully recorded game result with `persisted: true` before broadcasting it. Because the match identifier is produced by the repository first, this discriminator accurately states that the terminal result has durable backing and makes the payload conform to the persisted branch of the shared result schema.

## feat(web): lobby realtime event codec 소비
Move the lobby's realtime boundary from an unchecked JSON type assertion to the shared server-event parser. Incoming messages must now satisfy the versioned runtime schema before chat or presence state is updated, so stale or malformed payloads cannot silently enter the React state model.

Lobby chat commands also include `v: 1`, bringing the browser producer into the same explicit protocol version as the server codec while retaining the HTTP fallback when no socket is open.

## feat(play): versioned game input과 snapshot 소비
Migrate the play page to the versioned realtime contract. Every queue, tournament, ready, pause, resume, chat, and game-input command now carries `v: 1`; periodic paddle inputs include a monotonically increasing `inputSeq`, and incoming messages are parsed through the shared runtime codec rather than trusted after raw JSON decoding.

The client resets input and snapshot counters for each newly opened game connection and ignores snapshots whose sequence is not newer than the last applied value. UI state, scores, participants, and terminal-phase updates read the nested snapshot state, so delayed or duplicated frames cannot roll the rendered match backward while the server remains authoritative.

## refactor(web): PongCanvas snapshot state 렌더링
Adapt PongCanvas and its interpolation buffer to the nested snapshot representation. Drawing now reads paddles, ball, and scores from `snapshot.state`; empty samples include the new sequence and numeric server-time metadata; and render samples deep-copy nested paddles, ball vectors, and player records before entering the interpolation queue.

Interpolation continues to blend only paddle and ball positions while carrying the newer sample's remaining state and transport metadata. Preserving independent nested objects prevents rendering calculations from mutating the authoritative snapshot received by the page.

## test(protocol): versioned realtime contract 검증
Add negative protocol cases for shapes that the migration must no longer accept. The server-event parser rejects an unversioned presence event, a snapshot with a negative sequence, and a result that claims durable persistence while providing no match identifier.

These tests protect the ordering and persistence invariants encoded by the new schemas rather than merely checking successful serialization.

## feat(db): match result key와 rating history schema 추가
Introduce the persistent foundations for idempotent match finalization and auditable rating changes. Existing matches receive deterministic `legacy:<id>` result keys before the column becomes non-null and unique, preserving old rows while allowing every future logical result to have one database-enforced identity.

A separate `rating_history` table records each participant's before value, after value, and delta against the finalized match. Cascading foreign keys keep the history aligned with its match and user, the `(match_id, user_id)` uniqueness constraint prevents duplicate participant entries, and the descending user/time index supports rating-history queries.

## feat(db): 경기 확정 command 계약 정의
Define repository-level input and output contracts for finalizing a match as one logical command. The command combines scores and participants with a required idempotency `resultKey` and an optional tournament-match link; the result returns the stable match identity and whether this invocation actually created it.

Validation rejects blank or oversized keys, identical winner and loser identities, invalid scores, and tournament links attached to non-tournament matches or missing their identifiers. Establishing these constraints before persistence keeps all repository implementations aligned on the same finalization boundary.

## feat(db): PostgreSQL 경기 결과 중복 생성을 차단
Implement PostgreSQL match finalization around the unique result key. The repository attempts the insert inside a transaction with `ON CONFLICT (result_key) DO NOTHING`; a concurrent or repeated command that loses that race reads the already-created match and returns `created: false` instead of producing another result row.

Relying on the database uniqueness constraint, rather than an application-level check followed by an insert, makes idempotency hold under concurrent requests. Duplicate invocations also return before later finalization side effects, giving the result key responsibility for the whole logical operation.

## feat(db): PostgreSQL 참가자 rating을 원자적으로 반영
Extend successful PostgreSQL finalization so the match row, participant counters, current ratings, and rating-history records are committed in one transaction. Distinct participant identifiers are sorted and locked with `SELECT ... FOR UPDATE`, which serializes concurrent rating changes and gives competing transactions a consistent lock order.

The winner gains 16 rating points and a win, while the loser loses 12 points subject to an 800-point floor and receives a loss. Each change records its exact before, after, and delta values. Missing participants abort the transaction, and the pre-existing duplicate-result path returns before these updates, so retries cannot apply rating effects twice.

## feat(db): PostgreSQL tournament 경기 확정을 연결

Include tournament progression in PostgreSQL’s match-finalization transaction. The repository locks both the bracket match and its tournament, rejects missing or already-linked matches, and verifies that the reported winner and loser belong to the scheduled participants before attaching the realtime room, durable match, result, and scores.

When a semifinal completes, the transaction reads the finished semifinal winners and inserts the single final only after both are available; the bracket’s unique round/slot key makes concurrent insert attempts converge. Final-round completion marks the tournament and winner in the same transaction. These locks and constraints prevent duplicate finals, cross-match results, and a durable match record that is not reflected in bracket state.

## feat(db): memory 경기 결과 중복 생성을 차단

Introduce idempotent match finalization in the in-memory repository. A validated result key identifies the logical game outcome; repeated commands return the previously created match with `created: false`, while the first command records the result and reports creation.

Using a domain result identity rather than relying on call count gives retries a stable meaning. This initial step protects match-row uniqueness before participant ratings and tournament progression are added to the same finalization boundary.

## feat(db): memory 참가자 rating을 원자적으로 반영

Apply participant statistics and rating changes inside the in-memory finalization operation. Winner and loser references are resolved and validated before the match is appended, then wins, losses, and rating deltas are updated together, including the same minimum-rating floor used by the persistent backend.

Validating all referenced users first avoids a partially recorded result when one participant is missing. This gives tests and development mode the same domain-level outcome as PostgreSQL and prepares the method to add tournament linkage without splitting result effects across unrelated calls.

## feat(db): memory tournament 경기 확정을 연결

Extend in-memory match finalization to update tournament progression within the same domain operation. Before mutating match or rating state, the repository resolves the referenced bracket match, rejects missing or already-finalized matches, and verifies that the declared winner and loser are actual participants.

A successful finalization links the realtime room and durable match result, stores the winner and scores, and then either materializes the final after a semifinal or marks the tournament finished after the final. Performing validation first preserves all-or-nothing behavior in a backend without database transactions and keeps its observable contract aligned with PostgreSQL.

## refactor(db): 기존 match 생성을 원자적 확정으로 위임

Make atomic finalization the single implementation path for all match creation. The repository interface exposes `finalizeMatch`, in-memory records require an idempotency key, and the legacy `createMatch` methods delegate with a fresh `legacy:` key rather than retaining separate result and rating logic.

This preserves compatibility for callers that do not yet supply a stable result identity while preventing two implementations of statistics and rating updates from drifting. New gameplay callers can use deterministic keys for retry safety; legacy callers still receive a match ID but intentionally retain one-call semantics.

## test(db): 경기 결과 단일 확정 조건 검증

Verify the repository’s match-finalization boundary under repetition, concurrency, and partial failure. Twenty concurrent calls with the same result key must return one match identifier, report only one creation, record one result, and apply winner/loser statistics and rating history exactly once in both repository implementations.

PostgreSQL coverage also requires the transaction to roll back match and rating effects when tournament linkage fails. Concurrent semifinal finalizations must attach both source matches and create a single final with the correct winners. These cases protect the core invariant that gameplay completion is one atomic, idempotent domain transition rather than several independently repeatable writes.

## refactor(game): 경기 결과 확정 boundary 사용

Route room completion through the repository’s atomic match-finalization boundary instead of separately creating a match and then updating tournament state. The room supplies a deterministic result key plus optional tournament context, so persistence can make retries idempotent and commit related match, rating, and bracket effects together.

A room-level in-flight promise coalesces concurrent finish triggers and is cleared only if finalization fails, allowing a later retry without duplicating successful work. Broadcasting the finished event occurs after the repository returns the canonical match identifier, so clients observe a result that has crossed the durable boundary.

## test(smoke): cookie 기반 realtime protocol 검증

Realign end-to-end and smoke verification with the cookie-based authentication and versioned realtime protocol. Login must set a session cookie and must not expose a reusable token in JSON; HTTP requests carry that cookie, while each WebSocket obtains a separate one-time ticket before connecting.

The realtime smoke path still verifies presence, lobby and match chat, queue pairing, shared room identity, readiness, ball acceleration, pause/resume, AI fallback, and canonical snapshot structure, now through versioned send/parse helpers. Browser coverage also proves that merely choosing the `admin` handle does not grant administrative access, preserving the distinction between identity labels and persisted authorization.

## refactor(web): game input 직렬화 경계 분리

Extract keyboard interpretation from the play component into pure input helpers. Supported Arrow and W/S keys map to the shared direction domain, while a small structural target type identifies form controls and content-editable elements without depending on browser event classes.

This separates UI event capture from command semantics and makes the boundary directly testable. Callers can consistently suppress gameplay input during text entry, and adding touch or alternate controls no longer requires duplicating the keyboard-to-direction rules.

## refactor(web): game connection 상태 reducer 분리

Define the browser game connection as an explicit state-and-action model before moving behavior into it. The state records lifecycle status, room and opponent identity, the latest snapshot and accepted sequence, user notice, and bounded presentation messages; the action union names every event that may change those fields.

Although the reducer is initially a no-op scaffold, the type boundary is the architectural change. It replaces implicit coupling among multiple React state setters with one transition vocabulary, making legal lifecycle behavior independently implementable and testable in the next step.

## refactor(web): game connection 전이 규칙 완성

Complete the game connection reducer as the authoritative browser-side state machine. Connection start resets room-scoped state; socket open and matchmaking advance through named phases; snapshots are accepted only when their sequence is newer; finish, chat, readiness, close, and failure events each produce explicit transitions.

The close rule preserves a known room as `reconnecting` but treats a pre-match close as failure, matching the different recovery possibilities. Mapping server snapshot phases into a smaller UI lifecycle keeps rendering and command eligibility consistent, while bounded chat history and monotonic snapshot acceptance prevent unbounded presentation state and stale network data from reversing progress.

## refactor(web): GameSocketClient 연결 수명주기 분리

Introduce a transport-neutral `GameSocketClient` as the owner of connection replacement and teardown. Ticket acquisition and WebSocket construction are injected behind small interfaces, allowing lifecycle behavior to be tested without a browser socket.

Replacing a connection increments a generation, aborts any pending one-time-ticket request, detaches all callbacks before closing the old socket, and resets input sequencing. The generation-plus-socket identity check gives later asynchronous handlers a precise stale-work guard: an event is valid only for the connection instance that currently owns the client.

## refactor(web): GameSocketClient 메시지 처리를 분리

Move message handling into `GameSocketClient` so one object owns the complete ticket-to-socket lifecycle. A connection generation invalidates superseded ticket requests and sockets; only the current socket may report open, message, error, or close callbacks. Inbound frames must be strings and pass the shared protocol parser before reaching callers.

The client also becomes the serialization boundary for typed events and the owner of monotonically increasing paddle-input sequence numbers. This prevents UI code from mixing transport state with protocol rules, and ensures an obsolete asynchronous callback cannot mutate the active connection after replacement.

## refactor(web): game connection hook 상태 연결

Compose `GameSocketClient` and the connection reducer behind a React hook. The hook creates one client for the component lifetime, translates socket callbacks and each supported server event into reducer actions, exposes queue and tournament entry as intent-level commands, and closes the client during unmount.

This boundary separates imperative transport lifecycle from declarative UI state. The client owns tickets, sockets, parsing, and replacement; the reducer owns legal state transitions; the hook performs only event-to-action coordination. Mapping authentication and transport failures into user-facing notices also keeps error interpretation out of presentation components.

## refactor(web): game connection hook 명령 연결

Expand `useGameConnection` from a connection initiator into the command boundary for an active match. Readiness, trimmed match chat, pause/resume, and paddle direction now derive the current room from hook state and send versioned protocol messages through the owned client.

Commands reject invalid local preconditions instead of asking callers to assemble room-scoped messages themselves. Pause and resume are selected from the explicit lifecycle state, successful readiness advances the reducer notice, and direction sequencing stays inside the socket client. Returning success values lets the UI clear forms or report actions only when a message was actually accepted for sending.

## refactor(play): connection hook 전환 경계 준비

Introduce `useGameConnection` and the shared input helpers at the play-page boundary without removing the existing implementation yet. The additional direction reference is deliberately separate from the legacy polling direction so the new transition-based input path can be wired without changing the old loop in the same step.

This creates an explicit migration seam: subsequent commits can move automatic entry, rendered state, commands, and input ownership one concern at a time. Keeping both paths temporarily visible makes the transfer reviewable while avoiding a single large replacement of transport, state-machine, and UI behavior.

## refactor(play): 자동 경기 진입을 connection hook으로 전환

Route URL-driven queue, AI, and tournament entry through `useGameConnection` instead of the play page’s legacy connection functions. Queue modes now share one validated branch, while tournament match IDs use the hook’s dedicated command.

The effect retains the one-shot guard but declares the connection callbacks as dependencies, so automatic entry follows React’s closure rules without repeating a completed attempt. This establishes the hook as the entry point before the rest of the page’s socket state is migrated.

## refactor(play): 경기 상태와 명령을 connection hook에 연결

Begin the page migration by making `useGameConnection` the source for rendered room, snapshot, lifecycle notice, opponent, chat history, and command availability. Queue entry, readiness, chat submission, and pause/resume are routed through hook methods, with small page adapters only resetting form and input presentation state.

This staged switch lets the UI adopt the new state-machine contract before deleting the old socket implementation. Deriving button validity from named connection states rather than raw snapshot phase also clarifies which commands are legal during matching, ready, playing, and paused transitions.

## feat(play): keyboard와 touch paddle 입력 연결

Connect keyboard and mobile pointer controls to transition-based paddle commands instead of continuously resending the current key state. A local direction reference suppresses duplicate commands, while room changes, key release, window blur, editable-focus changes, hidden documents, pointer cancellation, and pointer exit all explicitly return the paddle to neutral.

Those reset paths matter because a missed release event would otherwise leave the authoritative server applying a stale movement direction. Ignoring editable targets prevents gameplay input from interfering with forms, and disabling touch controls outside the playing phase keeps the UI aligned with the protocol’s valid command window.

## refactor(play): legacy paddle input loop 제거

Remove the component-local keyboard state and 50 ms command loop after paddle input is routed through the new connection client. The deleted path independently tracked direction and input sequence numbers, then serialized `game.input` messages directly from a timer.

Keeping input emission behind the connection abstraction gives sequence ownership to the same object that owns the socket and room, while the page only reports direction transitions. This avoids parallel timers, duplicate sequence counters, and stale commands surviving a room or connection replacement.

## refactor(play): legacy WebSocket lifecycle 제거

Remove the play component’s inline WebSocket lifecycle after the dedicated connection layer can perform the same work. Ticket acquisition, socket replacement, protocol-versioned connection creation, event parsing, snapshot-order checks, finish handling, chat accumulation, and close-state transitions no longer live in the page.

This is the decisive ownership transfer: the UI stops being both renderer and transport controller. Keeping lifecycle behavior in one reusable connection component makes cancellation, parsing, sequencing, and reconnect semantics testable independently and prevents page rerenders or UI changes from altering socket invariants.

## refactor(play): legacy 경기 명령 제거

Delete the play page’s direct implementations of ready, match chat, pause/resume, and socket shutdown once those commands are available through the connection hook. This removes raw protocol encoding and WebSocket cleanup from the component instead of keeping a second path beside the new abstraction.

Centralizing these commands ensures they use the hook’s current room and lifecycle state, and that connection replacement or teardown follows one ownership rule. The page can now invoke domain-level actions without deciding how tickets, sockets, event handlers, or wire messages are managed.

## refactor(play): legacy socket 상태 제거

Remove the play page’s duplicate WebSocket and game-state fields after `useGameConnection` becomes the authoritative owner. Ticket requests, the socket reference, snapshot and room state, notices, messages, and protocol sequence counters no longer exist in parallel with the hook.

Eliminating the shadow state prevents two lifecycle implementations from disagreeing about the active room, accepted snapshot, or outstanding connection attempt. The page retains only local presentation state such as chat input and keyboard-direction deduplication, making connection ownership singular before the remaining call sites are simplified.

## refactor(play): connection hook 전환 마무리

Finish moving the play screen behind `useGameConnection` so the page consumes one state object and a stable set of connection commands instead of retaining adapter aliases around the hook. Queue and tournament autostart, direction changes, chat, readiness, and pause/resume now all cross the same boundary, while room changes still reset the locally deduplicated input direction.

This leaves the page responsible for presentation-only concerns—URL intent, form text, keyboard/mobile controls, and derived button availability—while the hook owns protocol and lifecycle behavior. The update also exposes connection notices through an `aria-live` region and aligns the visible controls with the accepted Arrow/W/S and touch input paths.

## test(web): game connection lifecycle 검증

Lock down the browser game connection as an explicit lifecycle rather than a collection of loosely related callbacks. The tests cover one-time-ticket cancellation when a newer connection supersedes an unfinished attempt, shared protocol validation for inbound events, and strictly increasing input sequence numbers for outbound direction commands.

Reducer coverage verifies the permitted progression through connecting, matching, ready, playing, paused, reconnecting, finished, and failed states. It also establishes that duplicate or older snapshots cannot overwrite newer state and that starting a fresh connection clears room-specific sequence and message data. Keyboard tests protect the final input boundary by mapping only supported controls and ignoring editable elements, preventing gameplay commands from leaking out of form interaction.

## feat(db): friendship canonical pair 제약 추가

Migrate directional friendship rows into one canonical relationship per unordered user pair. The data transition removes self-relations, converts reverse pending pairs to accepted, and deterministically keeps one preferred row—accepted first, then oldest—before introducing the new constraints.

Dropping the directional unique key and replacing it with a `least`/`greatest` expression index makes A→B and B→A the same persistent identity, while the check constraint prevents self-friendship. Cleaning existing data before constraint creation preserves compatible history and makes later atomic upserts enforceable at the database boundary.

## feat(db): tournament seed 제약 추가

Establish seed uniqueness as a persistent tournament invariant. Before adding the constraint, existing entries are deterministically renumbered per tournament by prior seed, creation time, and identifier, producing a contiguous collision-free ordering without discarding participants.

The resulting unique constraint on tournament and seed moves protection from repository convention into the database. Concurrent or future write paths can no longer allocate the same bracket position even when application-level validation is bypassed or races.

## feat(db): PostgreSQL friendship 요청을 원자화

Express the complete friendship-request transition as one PostgreSQL upsert against the canonical unordered user pair. Self-requests are rejected before writing; a repeated request preserves the existing relation, while a pending request arriving from the opposite direction atomically becomes accepted and receives a new update timestamp.

Explicit acceptance now updates only a row whose addressee is the acting user and uses the returned requester identifier to construct the response. This removes the read-then-write race and prevents an unauthorized caller from observing a seemingly successful acceptance through a later broad list query.

## feat(db): PostgreSQL tournament 참가를 원자화

Make tournament admission a single transaction serialized by a row lock on the tournament. After acquiring the lock, an existing entry returns idempotently; otherwise the transaction calculates the current count and next seed, rejects a full tournament, and inserts exactly one new participant.

When the inserted player reaches capacity, the same transaction marks the tournament running and creates the semifinal bracket through the transaction executor. Keeping capacity validation, seed allocation, state transition, and bracket materialization under one lock prevents concurrent callers from overfilling the tournament, reusing a seed, or exposing a running tournament without its bracket.

## feat(db): memory friendship invariant 적용

Model friendships in the in-memory repository as relationships between two user identifiers instead of storing one caller-specific `FriendSummary`. Listing now derives the opposite user for the requesting perspective, so both participants observe the same relationship with the correct counterpart.

The write path rejects self-friendship, treats repeated requests as idempotent, recognizes either request direction as one identity, and promotes a reverse pending request to accepted instead of creating a duplicate. Explicit acceptance is restricted to the addressee and returns the original requester. These rules align the test backend with the undirected uniqueness and ownership constraints required by persistent storage.

## feat(db): memory tournament 참가자 원본 검증

Validate tournament entrants against the in-memory repository’s canonical user store before constructing the public entry projection. The previous path called the public lookup method, which could conflate existence checks with presentation mapping and future visibility policy.

Reading the raw record first makes membership eligibility depend on repository identity, then converts that record through the same public-user mapper used elsewhere. Capacity checks and idempotent re-entry remain unchanged, but the write boundary no longer depends on a read API intended for consumers.

## test(db): friendship와 tournament 경쟁 상태 검증

Verify that friendship identity and tournament capacity remain correct under repeated, reversed, and concurrent operations in both repository implementations. A friendship request to oneself is rejected; repeated requests in one direction return the same relation; a reverse pending request accepts that relation; and both users observe one shared friendship. The PostgreSQL case additionally checks that only one row exists and that the distinct-user constraint rejects invalid direct writes.

For tournament capacity, ten callers race for the fourth slot. Exactly one may succeed, nine must receive the full-capacity error, the final entry set must contain four unique users, and the two semifinal slots must be created once. Rejoining the admitted user remains idempotent. Running the same scenario against memory and PostgreSQL protects behavioral parity while the integration test confirms the new invariant migration is applied.

## feat(game): fixed-step scheduler 추가

Introduce a fixed-step accumulator that separates elapsed wall-clock time from simulation updates. Elapsed time is accumulated against a monotonic clock, converted into whole 50-millisecond steps, and bounded by both a five-tick loop limit and a 250-millisecond lag ceiling. This preserves stable simulation increments without allowing a long event-loop stall to trigger an unbounded spiral of catch-up work.

The scheduler wraps that accumulator with an idempotent interval lifecycle and an injectable clock. Its loop checks the running timer between steps, so a transition that stops the scheduler from inside a callback prevents further work in the same batch. Constructor validation makes invalid timing policies fail before runtime.

## test(game): fixed-step 보정 범위 검증

Verify how elapsed monotonic time is converted into fixed 50-millisecond simulation work. The accumulator must preserve sub-step remainder, produce steps exactly at boundaries, cap a long stall at five ticks and 250 milliseconds, and ignore clocks that move backward rather than generating negative lag.

The scheduler test injects its clock, confirms that one delayed loop performs the bounded catch-up, and proves that `stop` prevents all later steps. These cases lock down determinism and overload containment independently of the game simulation itself.

## feat(game): WebSocket heartbeat 추가

Introduce an explicit heartbeat lifecycle for realtime connections. Starting the heartbeat arms a 45-second liveness deadline and sends a transport ping every 15 seconds; a pong acknowledgement replaces the deadline, while a ping exception or expired deadline stops all timers before terminating the target.

Start, acknowledgement, stop, and termination are idempotent, so close races cannot leave intervals or timeouts running after the socket lifecycle ends. Separating this policy from GameHub makes connection liveness deterministic and independently testable.

## test(game): heartbeat timeout 검증

Pin the connection heartbeat’s timing contract with deterministic clocks. An unacknowledged connection receives pings every 15 seconds and is terminated at 45 seconds without an extra ping at the terminal boundary.

A pong acknowledgement moves the liveness deadline rather than merely marking one interval healthy: the connection remains alive for the next 44,999 milliseconds and terminates at the reset deadline. These tests protect the difference between periodic probing and the authoritative last-seen timeout.

## feat(game): 입력 순서와 rate limit 보호

Introduce an input gate that combines sequence ordering with per-user token-bucket throttling. Sequence state is keyed by user and room, so duplicate or older commands cannot overwrite newer paddle intent; rate capacity is keyed only by user, so opening additional rooms does not multiply the permitted input rate.

The default budget allows a short burst of eight commands and replenishes at 30 per second. Ordering is checked before the bucket is charged, invalid configuration is rejected at construction, and `releaseUser` removes both bucket and sequence state when the user lifecycle ends. Returning `accepted`, `stale`, or `rate_limited` lets the transport layer distinguish harmless reordering from an observable abuse limit.

## test(game): input gate 제한 검증

Verify both dimensions of realtime input admission: monotonically increasing commands per room and a token-bucket budget per user. The tests pin the default eight-command burst and sustained 30-per-second refill, including fractional replenishment observed at 100-millisecond intervals.

Duplicate and older sequence numbers must be rejected before consuming capacity, so retransmitted traffic cannot exhaust a player’s valid budget. The rate limit is shared across that user’s rooms but isolated from other users, preventing room switching from multiplying throughput while preserving independent fairness.

## feat(game): latest snapshot buffer 추가

Introduce a latest-value outbound buffer for game snapshots. The buffer permits one send in flight and stores at most one pending payload, replacing that payload whenever a newer snapshot arrives. This bounds application-level memory and ensures a recovering client receives current state rather than replaying frames that are already obsolete.

Transport pressure has two explicit limits: data above 256 KiB pauses sends and is retried every 50 milliseconds for at most five seconds, while one MiB triggers immediate termination. Send errors, synchronous transport failures, closed sockets, and explicit shutdown all converge on idempotent cleanup, preventing retry timers or pending state from surviving the connection lifecycle.

## test(game): snapshot replacement와 congestion 검증

Verify the snapshot buffer’s loss and termination rules with controlled socket state and time. While a send is in flight, multiple enqueues must retain only the newest pending snapshot; while the transport exceeds the soft threshold, replacement continues and the latest value is sent once pressure clears.

The tests also pin the two failure boundaries: one mebibyte of queued transport data terminates immediately, while sustained soft congestion is tolerated for less than five seconds and terminated at the deadline. These cases protect the intended compromise between dropping obsolete realtime frames and disconnecting a client that can no longer follow authoritative state.

## feat(game): fixed-step scheduler를 GameHub에 연결

Replace direct per-room intervals with the fixed-step scheduler as the owner of simulation time. A room starts only when its public phase is still waiting and both sides are ready, resumes through the same helper, and stops the scheduler when paused or finalized.

The scheduler advances at the shared 50-millisecond timestep but caps one loop at five ticks and 250 milliseconds of accumulated delay. That preserves deterministic simulation steps under ordinary event-loop jitter while preventing an overloaded process from attempting an unbounded catch-up burst. Asynchronous match finalization is detached from the synchronous tick so persistence cannot stall the timing loop.

## feat(game): heartbeat와 input gate를 GameHub에 연결

Attach the connection heartbeat and input gate to the GameHub’s client lifecycle. Each accepted socket owns a heartbeat and snapshot buffer, acknowledges WebSocket pong frames, and releases both resources during idempotent disconnect cleanup; input-gate state is released only after the user has no remaining active connection.

Replace per-client sequence bookkeeping with a user-and-room keyed gate that rejects stale inputs and bounds accepted input bursts. Stale packets remain silent because they carry no new state, while capacity violations return a stable `rate_limited` protocol error. The integration makes liveness, ordering, and abuse protection properties of the authoritative hub rather than optional helpers.

## feat(game): latest snapshot buffer를 GameHub에 연결

Route high-frequency game snapshots through each client’s latest-value buffer while keeping control and lifecycle events on the ordinary send path. When a socket cannot drain snapshots fast enough, obsolete intermediate states may be replaced by the newest one instead of accumulating an unbounded realtime backlog.

Non-snapshot events retain delivery priority but now enforce the hard buffered-byte limit and terminate the connection on send failure. This distinguishes lossy state replication from non-lossy protocol messages: current authoritative state matters more than every historical frame, whereas queue, error, and completion events must not be silently coalesced.

## test(game): GameHub runtime 제한 검증

Verify input throttling at the complete realtime boundary rather than only inside the gate abstraction. A fake socket joins an AI room, marks the player ready, then sends a burst of sequenced inputs through the encoded client-event path; the hub must return exactly one protocol-valid `rate_limited` error after the allowance is exhausted.

This locks down the observable contract between parsing, room membership, `InputGate`, and server-event encoding. It prevents later GameHub changes from silently bypassing the limiter or translating rejection into an unstable error shape.

## build(web): React Query 의존성 추가

Add TanStack React Query as the web application’s server-state dependency and record the resolved query-core and React peer graph in the workspace lockfile. This establishes the library boundary used by the following cache migration: remote projections, freshness, retries, invalidation, and mutation state can be coordinated independently of component-local presentation state.

## refactor(db): repository user projection 타입 정렬

Use the canonical `UserProjectionRow` for users held by the in-memory repository instead of maintaining a separate memory-only alias. Seeded NPCs and development users are now constructed against the exact field subset accepted by the public-user mappers.

This unifies the production and test backends at the row-projection boundary without pretending that in-memory records contain generated database columns such as creation or ban timestamps. Both implementations can therefore share mapping code while the type system continues to distinguish projections from complete persisted rows.

## refactor(db): memory match record 계약 정렬

Replace the in-memory match record’s inheritance from the write command with an explicit stored shape. Only fields that constitute persisted match state are copied, and the completion timestamp uses the same `endedAt` representation consumed by public summaries instead of a database-style `ended_at` field.

Constructing the record field by field prevents later command-only properties from leaking into storage and removes an unnecessary parse-and-reserialize step in the mapper. The in-memory backend therefore models the repository contract directly while retaining the same scoring, rating, and summary behavior.

## refactor(db): canonical row schema 타입 정렬

Centralize the TypeScript representation of database enums and row projections. Friendship, match, tournament, chat, and administration columns now reference named shared or database-local aliases instead of repeating inline imports and string unions, so table definitions, selected rows, and mappers use one vocabulary.

Define `UserProjectionRow` as the exact subset needed to construct public users and organize all selectable row aliases alongside the canonical table map. The physical schema is unchanged, but the type boundary now distinguishes complete persisted rows from joined projections and makes later mapper contracts less dependent on incidental column overlap.

## refactor(db): row mapper record 타입 정렬

Give the tournament-match record mapper an explicit view type whose round and status are derived from the canonical database row types. This makes the repository-facing record contract independently checkable instead of relying on an inferred object shape.

Normalize non-null tournament scores with `Number` before exposing them through the shared summary. Although PostgreSQL commonly returns these columns as numbers in this schema, converting at the mapper boundary protects the API contract from driver-specific numeric representations while preserving `null` for unfinished matches.

## refactor(db): seed profile 경계를 canonical 형태로 정렬

Expand the seed-profile declarations and NPC upsert into the repository’s canonical multi-line form. The development and demo profiles, seeded NPC identities, iteration order, and conflict-update behavior remain unchanged; this commit is a readability-only normalization of the existing seeding boundary.

## refactor(db): dashboard와 friendship 조회 경계 정렬

Replace the optional SQL fragment in recent-match lookup with two explicit query shapes: one scoped to a participant and one global. Both retain the same joins, ordering, limit, and row mapping, but the filter boundary is now visible in the query itself rather than interpolated as an empty-or-`where` fragment.

The dashboard projection and friendship join are reformatted without behavioral changes. This is primarily a query-structure refactor that makes scoped and unscoped reads easier to inspect and type-check.

## refactor(db): PostgreSQL match 확정 core 정렬

Reformat the core PostgreSQL match-finalization statements so the idempotency key, existing-match readback, participant row locks, rating updates, and rating-history values can be reviewed independently. The transaction, conflict behavior, lock scope, rating constants, floor, and persisted deltas remain unchanged.

## refactor(db): tournament match 확정 연결 정렬

Reformat the transactional tournament-match finalization SQL so the row lock, idempotency predicate, result linkage, semifinal winner selection, final insertion, and tournament completion update are easier to review. The statements, predicates, ordering, conflict handling, and transaction scope remain unchanged.

## refactor(db): PostgreSQL chat과 tournament CRUD 정렬

Reformat the PostgreSQL chat and tournament CRUD paths so joins, predicates, returned columns, state updates, and result lookup are visible as separate steps. The transaction boundary for joining a tournament, accepted start states, semifinal-to-final progression, and tournament completion behavior remain unchanged.

Naming the loaded tournament collection before lookup also makes the post-write readback easier to inspect, but this commit does not introduce a new persistence rule.

## refactor(db): PostgreSQL tournament helper와 admin 경계 정렬

Extract PostgreSQL tournament-match assembly into a helper that resolves the left player, right player, and winner before invoking the row mapper. This gives every caller one relation-loading path and prepares tournament aggregate mapping to reuse the same contract.

Administration methods are grouped as public repository operations and their SQL is expanded for readability; semifinal lookup and idempotent final insertion retain their existing behavior. The change is primarily structural, clarifying the boundary between public repository commands and private tournament relation helpers without altering persistence semantics.

## refactor(db): tournament relation mapper 계약 정렬

Redefine tournament mapping as assembly of a row plus an explicit related-data object containing entries, match summaries, and winner. `PostgresRepository` resolves those relations first and calls one mapper for the complete aggregate, instead of mapping a partial tournament and mutating its winner afterward.

The creator projection is built from named joined columns rather than spreading the whole tournament row into a user mapper, preventing accidental schema-field overlap from influencing the public user. Match-record output receives an explicit type, match summaries use the repository’s existing relation loader, and bracket creation accepts either the database or a transaction executor. Together these changes make relation ownership and transaction participation visible at the mapping boundary.

## refactor(db): memory repository 조회 경계 정렬

Reformat the in-memory repository’s NPC, leaderboard, and dashboard query code into clearer multi-line pipelines and object construction. The ordering, filters, projections, and calculated values remain unchanged; this commit has no independent runtime behavior change.

## refactor(db): memory match completion과 admin 경계 정렬

Give the in-memory repository one helper that returns a tournament match together with its owning tournament, then use that paired result during completion. Updating match status, room and persisted match references, scores, winner, final creation, and tournament completion through one located aggregate avoids repeated searches and non-null assertions.

The administration methods are expanded into explicit steps as well: resolve the actor once, map the updated target once, and construct the audit action with the same domain shape returned by the persistent repository. The refactor keeps the test backend behaviorally aligned with production boundaries rather than allowing terse in-memory shortcuts to become a second contract.

## refactor(db): memory tournament 확정 경계 정렬

Consolidate the in-memory tournament-finalization path around one lookup result containing both the tournament aggregate and its match. Validation now uses that same object to reject missing or already finalized matches and to ensure the declared winner and loser are actual participants before match, rating, or bracket state is changed.

After successful validation, the method updates the located match and either materializes the final after a semifinal or closes the tournament with its winner. Reusing one lookup boundary keeps validation and mutation attached to the same record and mirrors the atomic intent of the database-backed finalization path.

## refactor(db): memory chat과 tournament 진입 경계 정렬

Align the in-memory repository’s chat and tournament methods with the same typed domain boundary as the database implementation. Constructed chat messages and tournaments now carry explicit shared types, eliminating local literal assertions and making compiler checks apply to the complete returned shape.

Tournament entry remains idempotent: capacity is enforced only for a user who has not already joined, after which player count, running state, and bracket generation are derived from the entry list. Match lookup and start operations reuse one repository helper instead of independently flattening tournament state, reducing the risk that read and mutation paths identify different records.

## test(db): database row mapping contract 검증

Lock down the translation from relational rows to the shared API domain shapes. The tests cover users, perspective-dependent match summaries, friendships, chat senders, tournament records and aggregates, and administration actions, including joined users and nullable relations.

The fixtures deliberately use database column names and `Date` instances while assertions require camel-cased public fields and ISO timestamps. This protects the repository boundary from leaking schema representation into API contracts and catches subtle mapping regressions such as choosing the wrong opponent, result perspective, related user, or nullability.

## feat(game): 게임 방 상태를 RoomSession에 연결

Make `RoomSession` the authority for a room’s lifecycle transitions instead of mutating the public snapshot phase directly. Each room creates a session, marks the AI side ready when applicable, and starts, pauses, or resumes simulation only when the state machine accepts the corresponding transition; the snapshot then mirrors that accepted state.

The room also acquires explicit reconnect-timer and disconnected-side storage for the recovery work that follows. Separating transition validity from the transport and rendering snapshot gives later disconnect handling one place to decide whether a room may play, pause, reconnect, or finish.

## feat(game): 사용자별 active connection 교체

Enforce one authoritative realtime connection per user. A user-indexed client map identifies the current socket, and receiving code discards messages from a client that has already been displaced. This prevents two tabs or a reconnect race from independently driving the same queue, tournament, input, or room identity.

Installing a replacement stops the old heartbeat and snapshot buffer, removes its transient memberships, transfers any occupied room side to the new client, sends the match context and latest snapshot, and closes the old socket with an explicit replacement code. The room is preserved while transport ownership changes, making socket replacement an atomic handoff rather than a disconnect followed by a new match.

## feat(game): 예약된 room connection 복구

Reconnect a newly authenticated socket to the room side reserved for the same user. The hub searches only explicit disconnected-user reservations and delegates deadline validity to `MatchSession.reconnect`, then replaces the stale side client, restores both room references, and sends the original match context plus current snapshot.

If another participant is still missing, the room remains in `reconnecting` and only the returning player receives state. Once the session can resume, the reconnect timer is cleared, the snapshot phase is synchronized with session state, simulation restarts only for a playing room, and the restored state is broadcast. This keeps transport replacement subordinate to the authoritative match lifecycle rather than treating reconnect as new matchmaking.

## feat(game): reconnect 예약 만료와 room 정리

Replace immediate disconnect forfeits with a bounded room reservation. When a participant loses the socket, the hub records the user against that side, pauses simulation, zeros the disconnected paddle’s motion, arms the session’s reconnect deadline, and broadcasts the paused snapshot. The client remains attached to the room identity, so it cannot enter another queue while recovery is pending.

When the deadline expires, the session state decides the terminal outcome: a remaining participant wins by forfeit, while a room with no eligible winner is abandoned without persistence. Both paths clear timers, reservations, client room references, and scheduler activity; normal finalization performs the same cleanup. This makes disconnect recovery a lifecycle state with one deadline and one cleanup boundary instead of an ad hoc delayed side effect.

## test(game): reconnect 복구 동작 검증

Add deterministic integration coverage for the realtime recovery contract. Replacing an active socket for the same user must close the old connection, attach the new one to the existing room, send the current match assignment and snapshot, and avoid starting a forfeit deadline; messages from the displaced socket cannot create another room.

A genuinely disconnected player retains the same room and side for 15 seconds and may reconnect to the latest snapshot before the deadline. Crossing that deadline instead finalizes one idempotently keyed forfeit, notifies the remaining player, and never persists the result twice even as more time elapses. Fake timers and a repository spy verify both the temporal boundary and the durable side effect.

## perf(game): scheduler benchmark 실행 경계 추가

Add a standalone benchmark that isolates scheduler topology while keeping room-step work and the 50-millisecond cadence equivalent. It compares one interval per room with one shared interval across 1, 20, 50, and 100 rooms, ignores an initial warm-up period, and measures p95 and p99 scheduling lag.

The script is not a substitute for end-to-end game load testing; its narrower purpose is to test whether timer multiplicity itself harms event-loop responsiveness. Environment-controlled repeats and duration make the experiment practical to rerun before changing production room timing ownership.

## perf(game): scheduler benchmark 측정 결과 출력

Turn the scheduler load script into a reproducible comparison report rather than an unstructured timing exercise. It measures both per-room and shared-timer strategies across configured room counts and repeats, aggregates each metric with the median, and emits sample counts plus p95 and p99 event-loop lag.

The JSON output records runtime, platform, CPU, memory, timing settings, and a concrete 50-room decision rule: the shared strategy is selected when its p95 lag is no more than five percent above the per-room baseline. Capturing both the conditions and the threshold makes the later scheduler choice auditable instead of relying on an unexplained local observation.

## refactor(game): shared room scheduler 추가

Introduce a scheduler abstraction capable of driving all active rooms from one fixed-step clock. Room identifiers map to step callbacks; registering the first room starts the underlying timer, removing the last room stops it, and `stop` clears both the registry and timing loop.

The shared loop retains the simulation’s 50-millisecond step and bounded catch-up limits while snapshotting callbacks before iteration. That snapshot isolates the current tick from rooms registering or unregistering themselves during a lifecycle transition, so one room cannot corrupt iteration for the others.

## test(game): shared room scheduler 검증

Verify the scheduler’s central ownership guarantees with deterministic time. Multiple registered rooms must share one fixed-step timer, unregistering one room must leave the others advancing, and removing the final room must stop the timer completely.

A second case unregisters a room from inside its own step callback and confirms that a later room still executes during the same tick. This protects iteration from collection mutation and prevents one room’s lifecycle transition from starving unrelated matches.

## refactor(web): query key와 retry 정책 정의

Define the cache vocabulary before migrating individual screens. Stable hierarchical keys identify current user, lobby, dashboard, handle-scoped profiles, rankings, friends, tournaments, and administration projections; mutation policies explicitly list which exact projections become stale after each command.

The retry policy treats `401` as a terminal authentication result while allowing one retry for other query failures. Avoiding retries on expired credentials prevents repeated unauthorized requests and lets session cleanup run promptly, while exact invalidation avoids broad prefix matches that would refresh unrelated data.

## refactor(web): session query와 cache invalidation 추가

Define reusable query options for each server projection, including stable keys, abort-aware API calls, and freshness intervals appropriate to the data. Centralizing these definitions ensures every consumer agrees on query identity and cancellation behavior instead of creating subtly different cache entries for the same endpoint.

Add a session-expiration transition that removes identity-scoped lobby, dashboard, friends, and administration data and sets the current-user value to `null`, while leaving public leaderboard, profile, and tournament projections reusable. Active fetches are removed on the next task to let their observers settle cleanly. This makes cache ownership follow data sensitivity rather than clearing all browser state indiscriminately.

## refactor(web): React Query provider 연결

Install a single `QueryClient` at the application root and make it the lifecycle owner for browser server state. The provider creates the client once, applies the project-wide query retry and window-refocus policy, disables automatic mutation retries, and exposes it to every route.

It also translates the API layer's session-expiration event into centralized cache cleanup. This keeps transport-level authentication failure independent of React components while ensuring all active query observers see the same identity reset and scoped cache removal.

## refactor(web): lobby와 login을 query cache로 전환

Move lobby and login state onto the shared query client so HTTP loads, WebSocket events, and authentication mutations update the same server-data owner. The home screen now derives identity, players, chat, and statistics from `me` and `lobby` queries; lobby chat events patch the cached projection, while presence changes invalidate it for an authoritative refresh.

Development login becomes a mutation that seeds the current-user cache and invalidates the projections whose contents depend on identity. This removes the callback and duplicated local arrays that previously coupled `LoginPanel` to its parent, and makes realtime updates coexist with ordinary query refreshes without maintaining parallel copies of lobby state.

## refactor(web): dashboard와 leaderboard를 query cache로 전환

Move the dashboard and leaderboard from component-owned fetch effects to the shared query cache. Each screen now consumes the established query options, derives loading and failure presentation from query state, and treats returned server projections as cached data rather than copying them into local collections.

This gives navigation and session-expiration logic one authoritative place to invalidate these views, while preserving local rendering concerns. The change is intentionally narrow: it does not alter the API contract or presentation, but removes request lifecycles that could otherwise diverge from the cache used by the rest of the application.

## refactor(web): profile 조회를 query cache로 전환

Move handle-scoped profile loading into the shared query cache and use the resolved route parameter directly as the query identity. The page now treats user data and recent matches as one server projection with cache-derived loading and error states, rather than coordinating a promise, local handle state, and multiple result arrays.

Friend requests become mutations that invalidate the friends projection after success, while clipboard feedback remains local presentation state. Disabling the action for NPC profiles and while a request is pending preserves the domain restriction and prevents duplicate submissions without making the profile cache responsible for UI notices.

## refactor(web): tournament 조회와 mutation을 query cache로 전환

Move tournament and current-user reads into shared queries and represent create and join commands as independent mutations. The page now derives loading, empty, error, and ready states from cache state instead of owning a one-shot fetch and duplicated tournament collection.

Both successful mutations select the returned tournament and invalidate the exact tournament projection, allowing the authoritative server list and bracket to repopulate the cache rather than manually merging partial responses. Pending guards prevent duplicate create or join submissions while preserving local selection and notice state as presentation concerns.

## refactor(web): admin 조회와 mutation을 query cache로 전환

Move administrator users and audit actions into the shared query cache and model status changes as a mutation. The page now derives loading, authorization failure, and ready states from the two query results rather than coordinating a one-off `Promise.all` and duplicated local collections.

After a successful status change, exact invalidation refreshes both the user list and audit log—the two server projections affected by the command—without touching unrelated caches. Disabling controls while the mutation is pending also prevents overlapping toggles from racing against stale row state.

## refactor(web): shell의 session 소비를 query cache로 통합

Make the application shell consume the same cached session query as the rest of the browser instead of maintaining a private `getMe` effect and local state. Profile navigation now reacts to cache updates produced by login, logout, expiration, and refetches through one authoritative query.

This removes a second session owner whose request timing and error handling could diverge from page data, and ensures shell chrome changes atomically with the shared authentication state.

## test(web): query cache key·retry·invalidation 검증

Lock down the browser cache as an explicit data-consistency contract. The tests fix the key namespace for each screen, verify that mutations invalidate only their affected exact keys, and ensure an expired cookie session is not retried as a transient network failure.

Session expiration must clear identity, lobby, dashboard, friends, and administration data while retaining genuinely public leaderboard, profile, and tournament caches. An active unauthorized query is also required to settle in an idle error state after cache cleanup, preventing the expiration path from leaving observers indefinitely fetching.

## feat(guest): signed guest session token 정의

Introduce a self-contained signed session representation for transient guests. The server generates an opaque guest identifier, handle, and display name, embeds that identity with a version, originating client address, and two-hour expiration, then authenticates the Base64URL payload with HMAC-SHA-256.

Verification compares signatures in constant time and rejects malformed, expired, wrong-version, non-active, non-user, non-guest, or address-mismatched payloads. Requiring a 32-byte secret and keeping identity generation server-side allows demo sessions to remain stateless with respect to the database while still making the cookie tamper-evident and narrowly scoped.

## feat(guest): guest 요청 rate limit 추가

Add a per-client-address sliding-window limit to guest-session creation. Before minting an identity, `GuestAccess` discards timestamps outside the previous minute, rejects a request when the remaining count has reached the configured threshold, and otherwise records the new creation.

A typed guest-access error lets the HTTP boundary translate capacity rejection without weakening authentication logic. The check occurs before random identity generation, preventing repeated anonymous requests from consuming unbounded session-related work.

## feat(guest): guest WebSocket ticket 발급 추가

Add a database-free WebSocket admission token for guest sessions. `GuestAccess` generates the existing high-entropy raw ticket format, stores only its hash for 30 seconds, permits one outstanding ticket per guest by replacing the previous entry, and rejects issuance when the bounded in-process store is full.

Consumption removes the ticket and reverse guest index before returning the identity, so replay cannot succeed even if validation later fails. Timer cleanup and explicit pruning maintain both indices together, preserving the one-time, short-lived, and capacity-bounded properties of the authentication handoff.

## feat(guest): guest resource lease 수명주기 추가

Add explicit leases for live guest connections so resource limits follow socket lifetime rather than ticket issuance. `GuestAccess` enforces both a per-IP cap and a process-wide cap while keeping at most one current connection record for each guest identity.

A reconnect replaces that guest’s record with a new lease identifier. Releasing an older socket deletes the record only when its identifier is still current, preventing a stale close event from freeing the replacement connection. This lease pattern makes acquisition, replacement, and cleanup one atomic ownership protocol.

## feat(guest): guest runtime 환경 경계 구성

Extend the runtime configuration contract with an application mode and explicit proxy-trust switch, and expose the matching public mode to the browser build. Demo and production startup now require a configured session secret of at least 32 UTF-8 bytes instead of accepting the development fallback.

This places two security assumptions at deployment time: signed guest identity must use an adequately strong key, and forwarded client addresses affect abuse limits only when the operator has declared the proxy trusted. The example environment documents the complete API/web configuration surface that must remain coordinated.

## feat(shared): guest HTTP 응답 계약 추가

Add a shared runtime contract for guest-login responses. The payload must contain a normal session-user projection, an explicit `guest: true` discriminator, and the fixed two-hour lifetime used by the signed guest cookie.

Keeping the schema in the shared package lets the API validate what it emits and the browser validate what it receives, while the literal expiry prevents either side from silently presenting a duration that differs from the authentication policy.

## feat(api): guest access runtime 구성

Make guest access an explicit runtime dependency of the API application. `buildApp` can receive a `GuestAccess` instance, signing secret, and proxy-trust policy; it constructs the guest service only for demo mode and passes the trust decision to Fastify so `request.ip` has a defined authority.

Current-user resolution authenticates the guest cookie first and, in guest-only demo mode, does not fall through to registered database sessions when guest authentication fails. This composition prevents credential domains from being mixed accidentally and keeps the in-memory guest implementation injectable for deterministic tests.

## feat(guest): guest session과 WebSocket 인증 연결

Integrate transient guest identity into both HTTP and WebSocket authentication without creating database users or sessions. Demo mode exposes `POST /auth/guest`, issues an HttpOnly, Secure, SameSite=Lax two-hour cookie from the in-memory guest service, and uses guest-aware current-user resolution for logout and ticket issuance.

WebSocket upgrade consumes guest tickets from the in-memory one-time store before considering registered tickets; in demo mode it never falls back to the database. A successful guest upgrade must also acquire an IP- and process-bounded connection lease that is released on socket close. This preserves a coherent trust chain from signed cookie to short-lived ticket to live connection while keeping guest credentials, capacity accounting, and cleanup outside persistent storage.

## feat(guest): guest 조회 범위와 lobby 격리

Define the read-side isolation rules for guest and demo traffic. Guest-aware authentication is accepted by `/me`, but public demo requests cannot enumerate users, rankings, profiles, or tournaments, and the lobby returns no persisted match history or chat. Those branches avoid the repository calls entirely rather than retrieving registered data and filtering it afterward.

Write-capable lobby chat and registered dashboard access now require a registered identity even when a guest cookie is valid. This creates a least-privilege projection: guests receive their transient identity and live service statistics needed to play, while durable social, historical, and ranking data remains outside the guest boundary.

## feat(guest): 등록 사용자 전용 route 접근 정책 적용

Apply the registered-account capability boundary to HTTP routes after authentication has been generalized to guests. Profile mutation and reads, friendship operations, and tournament creation or joining now call `requireRegistered` before accessing repository-backed state, so possessing a valid guest cookie is not mistaken for authorization to use persistent account features.

Administrative routes are not registered at all in demo mode, yielding the same not-found surface as an absent feature instead of advertising privileged endpoints to the public runtime. The distinction between “authenticated” and “registered” makes authorization explicit and prevents transient identities from crossing into durable domain state.

## feat(game): GameHub guest identity와 기능 차단 연결

Extend the realtime hub’s identity type to include transient guests while enforcing their reduced capability set at message dispatch. Guest chat and tournament commands are rejected immediately with a protocol error, before any repository-backed domain handler can run.

Guests are also omitted from the registered online-player projection. The explicit `isGuest` type guard keeps these decisions attached to session identity rather than inferred from handles or missing database rows, preserving a clear boundary between playable presence and registered social data.

## feat(game): guest matchmaking과 room을 격리

Partition matchmaking by session kind so a transient guest can never be paired with a registered user. Candidate selection now skips queue entries whose guest status differs, and each created room records that status for later completion and persistence decisions.

Guest timeout fallback also avoids querying the repository for a persisted NPC, allowing the room to use the in-memory practice opponent path. These decisions keep guest play self-contained: both human opponents and fallback resources remain outside the registered account and database domain.

## feat(game): guest 경기 결과 영속화 차단과 임시 보존

Separate guest match completion from the registered persistence pipeline. When a guest room finishes, `GameHub` now emits a result marked `persisted: false` with no match identifier or rating delta, skips `finalizeMatch`, and removes the room without writing users, history, or rankings.

To tolerate a socket loss around completion, the result is retained per guest in process memory for two minutes and replayed when that guest reconnects without an active room. Replacing an entry cancels its earlier timer, and expiration checks guard timer races, preserving the intended balance: recovery is possible for a short window, but transient identities never acquire durable game state.

## feat(api): guest resource lifecycle startup 연결

Wire the validated runtime environment into application construction so guest behavior is enabled and constrained by deployment configuration. The API entry point now passes the selected app mode, session-signing secret, and proxy-trust setting to `buildApp` rather than letting the app infer or default those security-sensitive values independently.

This makes startup the composition boundary for guest resources: the mode controls whether the feature exists, the secret protects transient identity cookies, and trusted-proxy configuration determines which client address may be used for per-IP limits.

## test(auth): guest auth boundary 기대값 정렬

Update the authentication-boundary fixture to satisfy the newly enforced guest signing-key requirement. The test now supplies an explicit valid session secret before asserting that development login remains unavailable in demo and production modes.

This keeps the case focused on route exposure rather than failing earlier for unrelated startup configuration.

## test(guest): 격리된 guest session 경계 검증

Establish end-to-end regression coverage for the isolated guest-session model. The GameHub cases prove that guests match only other guests, fall back to an in-memory AI after the configured wait, cannot invoke chat or tournament commands, never persist match or rating changes, and receive only a two-minute in-memory result for recovery.

The HTTP suite verifies server-assigned identities, signed two-hour cookies, per-IP creation limits, demo-only route availability, registered-feature denial before repository access, and one-time WebSocket admission without database sessions. Lower-level `GuestAccess` tests cover HMAC tamper and expiry handling, hashed 30-second tickets, and connection leases bounded per IP and process; shared-schema tests lock the corresponding guest response and WebSocket query contracts. Together these tests define guest mode as a separate transient trust and persistence boundary, not a weakened registered account.

## test(auth): guest session secret 요구 검증

Add a startup regression for the cryptographic key that signs guest sessions. A demo runtime must reject a session secret shorter than 32 bytes before serving requests, rather than silently operating with a weak or default signing key.

Testing the failure at application construction preserves a fail-closed deployment invariant: guest cookies are only issued after the process has accepted an explicit secret with the required minimum strength.

## test(guest): 위조 client address 거부

Exercise the network and data-exposure boundaries of guest mode. Behind an explicitly trusted proxy, guest creation limits must be keyed by the resolved forwarded client address, while an untrusted deployment must not let a caller evade the limit merely by changing `X-Forwarded-For`.

The suite also verifies that the public demo lobby returns an empty registered-user projection and that leaderboard, profile, and tournament reads fail before invoking repository methods. This locks down both sides of the boundary: rate limiting uses only trusted address information, and transient guests cannot cause private persisted data to be fetched and then filtered after the fact.

## feat(web): 비회원 체험 정책 경계 추가

Introduce a single browser-side policy module for the non-member demo surface. It defines the complete navigation vocabulary, derives the reduced lobby/play menu, records which persisted-progress and chat features are unavailable, identifies registered-only route prefixes, and centralizes detection of the public demo build.

Representing these choices as data and pure policy functions creates one responsibility boundary for later middleware and components. That avoids independent environment checks drifting into inconsistent claims about what a transient guest may see or do.

## feat(web): guest login API와 middleware 연결

Add the web client boundary for creating a guest session and prevent demo deployments from serving registered-account screens. `guestLogin` validates the `POST /auth/guest` response against the shared schema, preserving the same typed runtime contract used by other API helpers.

Next.js middleware applies the centralized demo path policy before page rendering and answers restricted dashboard, ranking, tournament, profile, and administration routes with 404. This is a presentation and exposure boundary rather than a substitute for server authorization, but it keeps the public demo’s reachable route surface aligned with the capabilities of a transient guest session.

## feat(web): LoginPanel guest 진입 연결

Connect the login panel to the server-managed guest entry point when the public app is running in demo mode. The form removes handle and display-name inputs, calls `guestLogin`, and feeds the returned user through the same cache update and invalidation path used by development login.

Keeping identity assignment on the server prevents an unauthenticated browser from choosing guest profile data, while reusing the established login mutation boundary ensures the rest of the application observes the new session consistently.

## feat(web): guest lobby presentation 적용

Apply the centralized guest presentation policy to the lobby so demo mode no longer advertises durable progress or unsupported interaction. The hero and lobby copy explicitly state that results are not stored, and the page omits the leaderboard link, win/rating cards, and lobby chat while retaining operational online and queue statistics.

Conditioning these elements on one policy object keeps the UI aligned with the server’s transient guest model: a guest may play and observe live service state, but should not be led to expect persisted history, rankings, or registered-user communication features.

## feat(web): demo navigation 정책 연결

Make the application shell consume the centralized demo navigation policy instead of constructing the full authenticated menu unconditionally. The policy decides which destinations exist for the current mode, while `AppShell` remains responsible only for presentation details such as icons and active-route styling.

Separating route availability from rendering prevents guest restrictions from being scattered through JSX and keeps the reduced demo surface consistent wherever navigation is generated.

## feat(web): guest play presentation 적용

Apply the guest presentation policy to the live match screen by hiding match chat when demo mode disables it. The page reads the same policy object used by the lobby rather than introducing a separate environment check for each feature.

This keeps the restricted guest surface consistent across navigation and gameplay and prevents a transient, non-registered session from being shown an interaction the server-side guest boundary does not support.

## test(web): 비회원 체험 진입 흐름 검증

Verify the browser-side contract for entering the guest experience. `guestLogin` must issue a credentialed `POST /auth/guest` with no request body, leaving guest identity and display-name assignment under server control rather than accepting profile input from an unauthenticated client.

Including the helper in the common API error matrix also ensures guest entry uses the same response and failure semantics as the rest of the web client.

## test(guest): 체험 기능 오용 방지 검증

Expand guest-mode tests around the abuse and isolation boundaries that cannot be inferred from the happy path. The suite now requires a sufficiently strong explicit session secret in demo and production modes, keeps proxy address trust opt-in, bounds the pending ticket store to one live ticket per guest and a process-wide capacity, and verifies that replacing a guest connection cannot bypass a full per-IP slot.

The tests also assert timed cleanup of retained transient results and define the browser policy for a non-persistent demo: only lobby and play navigation remain visible, progress and chat claims are hidden, and direct registered-account routes are rejected. Together these cases make the guest surface intentionally narrower than the authenticated product rather than merely unauthenticated access to the same UI.

## refactor(game): GameHub가 shared room scheduler 사용

Move simulation timing ownership from each room to one scheduler owned by `GameHub`. Rooms no longer carry individual `FixedStepScheduler` instances; every lifecycle transition now registers or unregisters the room with the shared ticker, including play, pause, disconnect, abandonment, finalization, and removal.

Centralizing the timing loop avoids one timer per match and gives the hub a single authoritative set of runnable rooms. The integration points preserve the stronger lifecycle invariant that a room appears in the scheduler exactly while its simulation may advance.

## test(game): shared scheduler lifecycle 검증

Lock down the scheduler ownership transitions during room recovery. The reconnect regression now asserts that an active room is scheduled, a disconnected room is removed while its recovery window is pending, reconnection registers it again, and terminal forfeit removes it permanently.

These checks protect the invariant that the shared ticker advances exactly the rooms that can currently run: retaining a suspended or finished room would waste work and risk duplicate finalization, while failing to re-register a recovered room would leave its simulation frozen.

## build(shared): production package artifact 구성

Establish the shared protocol package as a compiled production dependency instead of exporting TypeScript source unconditionally. Its package metadata now exposes JavaScript and declaration artifacts for normal consumers while retaining a development condition for source-aware tooling.

A NodeNext build configuration emits the package into `dist`, and internal exports use `.js` specifiers so the generated ESM resolves without a TypeScript loader. This gives the API and web builds a stable runtime and type contract from the same public package boundary.

## build(db): production package artifact 구성

Give the database workspace a real production package boundary. Its public entry point now advertises compiled JavaScript and declarations while retaining a development condition for source-oriented tooling, and a dedicated NodeNext build emits the runtime graph without test files. Relative imports include `.js` so the generated ESM remains resolvable by Node.

The build also copies SQL migrations beside the emitted migrator and adds a Node-based production migration command. This keeps schema changes available after source files and `tsx` are absent from the deployment image, while preserving `dist` as the authoritative runtime artifact.

## build(app): API와 Web production artifact 구성

Convert the application workspace from source-driven development execution into explicit production artifacts. The API now compiles with a dedicated NodeNext configuration, excludes tests, emits declarations and source maps into `dist`, and starts with Node rather than `tsx`; relative imports include `.js` extensions so the emitted ESM graph resolves at runtime.

The web build now produces Next.js standalone output, traces files from the monorepo root, and resolves `@pong-pong/shared` to its compiled runtime instead of a TypeScript path alias. Workspace pre-scripts and the root build order ensure shared and database packages exist before their consumers build. This makes the deployment boundary the compiled package graph rather than unpublished source files and development-only loaders.

## test(build): production artifact 생성 검증

Add an explicit post-build contract for the files required by the production runtime. The verifier checks compiled JavaScript and declarations for shared packages, database migration and CLI assets, key API modules, and the Next.js standalone server entry point.

This catches packaging failures that type checking and compilation alone cannot detect, particularly omitted non-TypeScript assets and workspace paths that container startup expects to exist.

## ci(build): production artifact 검증 실행

Run the production-artifact verifier in CI immediately after the workspace build. This distinguishes a successful compiler invocation from a deployable build by checking that the shared and database packages emitted JavaScript and declarations, migrations were copied, the database CLI and migrator exist, the API runtime was produced, and Next.js generated its standalone server entry point.

Keeping this check in the normal build job turns missing copy steps or packaging regressions into deterministic CI failures before an image is assembled.

## fix(guest): 체험 환경의 runtime 복구 제한

Bound the guest runtime structures that were previously able to grow with arbitrary client IPs and ticket requests. Creation and ticket-issuance accounting now share timer-backed rolling windows, prune expired entries, reject new tracked networks after a configured capacity, and enforce both per-minute issuance limits and a per-IP cap on pending one-time WebSocket tickets. Ticket replacement and expiration use one deletion path so timers, the ticket map, and the guest-to-ticket index remain synchronized.

The request IP is now part of guest ticket issuance, making those limits enforceable at the same trust boundary where Fastify has resolved the client address. The change also centralizes `APP_MODE` parsing in the environment module and validates explicit values instead of silently falling back, ensuring cookie and guest-mode behavior are derived from one accepted runtime mode.

## fix(web): 중단된 game reconnect 복구

Recover interrupted game sockets as continuation of an existing room rather than as a new matchmaking request. `GameSocketClient` now retries within a 15-second window using capped exponential backoff and obtains a fresh one-time WebSocket ticket for every attempt. Reopened sockets deliberately omit the original `queue.join` or AI command, avoiding duplicate matchmaking while allowing the server to restore the authenticated room from subsequent snapshots.

The connection reducer distinguishes a reopened socket from an initial open, and the hook requests retries only while a room is still owned by the client. New match controls are disabled unless no room is active and the state is idle, finished, or failed, preserving the invariant that recovery and matchmaking cannot run concurrently. Guest-mode lobby handling also redirects recovered room traffic back to `/play` and presents non-persisted match results explicitly instead of treating them as durable history.

## test(guest): 체험 환경의 복구 경계 검증

Extend the guest-mode regression suite across the boundaries that determine whether an in-memory session can recover safely. The tests now verify explicit `APP_MODE` parsing, expiration and bounded cleanup of per-IP creation windows and one-time WebSocket tickets, issuance limits, reconnecting with a fresh ticket without replaying the original queue command, and blocking a second match request while a room is reconnecting.

The browser policy coverage also fixes the expected presentation of non-persisted results and the transition back to the game screen when lobby traffic reveals a still-active room. Using fake timers makes the time-based guarantees deterministic and resetting timers after each case prevents those tests from leaking clock state into the rest of the suite.

## build(api): metrics 수집 의존성 추가
Add `prom-client` as an explicit API dependency and update the resolved workspace graph. This establishes the runtime library used by the following observability layer for process collectors, gauges, counters, and histograms; keeping it in the API package rather than relying on transitive availability makes production installation and Docker builds reproducible.

## feat(db): migration set 상태 검사 추가
Compare the bundled SQL migration names with the database's applied Kysely migration records and classify the set as current, pending, or diverged. An absent migration table is treated as an empty applied set, whereas other query failures still propagate. Migration discovery supports both source and built package layouts, so the readiness decision is based on the same authoritative SQL files in development and production.

## feat(db): repository readiness 경계 추가
Add readiness to the repository contract so the API does not need to infer storage health from implementation details. PostgreSQL readiness proves both basic connectivity and the bundled migration-set status, while the memory implementation explicitly reports migrations as not applicable. Returning a bounded domain result keeps health endpoints independent from database-driver errors and gives every repository implementation the same operational boundary.

## feat(ops): liveness와 readiness endpoint 추가
Separate process liveness from service readiness with versioned response schemas. Liveness reports only that the API process can answer, while readiness queries the repository and accepts traffic only when the database is reachable and migrations are current or intentionally inapplicable. Dependency errors are reduced to bounded status fields and a 503 response, keeping database details out of the public health contract.

## test(ops): health와 database readiness 검증
Verify that liveness remains independent from dependency readiness and that the legacy health response stays compatible. Readiness is accepted only for a reachable repository with the expected migration state: memory storage reports migrations as not applicable, PostgreSQL moves from pending to current after migration, and missing or unexpected migration records are distinguished. Repository failures must produce a sanitized 503 response without leaking connection strings or credentials.

## chore(logging): 민감한 요청 값을 redaction 대상에 추가
Extend structured-log redaction to nested cookie, authorization, session-token, query, and ticket fields. Covering wildcard paths matters because authentication material can be logged inside child objects rather than only at the top-level request shape; censoring those representations prevents observability code from becoming a secondary credential store.

## feat(metrics): runtime gauge registry 추가
Create a dedicated Prometheus registry for Node runtime collectors and live GameHub gauges. Connection, matchmaking-queue, and active-room values are sampled from the authoritative hub at scrape time instead of being incrementally mirrored, which avoids drift when clients or rooms are cleaned up through different lifecycle paths. The registry also provides an explicit close operation for test and shutdown isolation.

## feat(metrics): HTTP와 readiness 측정 추가
Expose a Prometheus scrape endpoint and measure HTTP request duration using normalized Fastify route templates, methods, and status codes rather than raw URLs. Readiness checks receive a separate result-tagged histogram so dependency-health latency is distinguishable from ordinary request latency, including the exception path that returns `not_ready`. The metrics registry is closed with the application to avoid leaking default collectors across repeated app instances.

## feat(metrics): repository operation 측정 추가
Wrap the repository interface with a transparent proxy that measures every synchronous or asynchronous operation without changing callers. Success and failure paths are timed separately, known method names are whitelisted as bounded labels, and unexpected methods collapse to `other`. Instrumenting the repository boundary captures both PostgreSQL and memory implementations consistently while preserving the original method receiver and error behavior.

## feat(metrics): game room과 reconnect 관측 추가
Add an observer boundary around GameHub lifecycle events instead of embedding logging and metrics into the game state machine. Room creation carries request and user correlation identifiers to logs, while successful and expired reconnect attempts increment a bounded outcome counter. Passing the originating request ID into the WebSocket client record links HTTP authentication, socket establishment, room creation, and recovery without changing realtime protocol payloads.

## feat(metrics): match finalization 결과 관측 추가
Observe match finalization at the domain boundary that distinguishes in-memory guest completion from database-backed persistence. Successful and failed database attempts, as well as memory completions, emit structured observer events and a low-cardinality counter keyed only by persistence type and outcome. Logging retains room, match, and participant correlation data separately, so operational diagnosis does not inflate metric cardinality.

## feat(metrics): snapshot delivery와 drop 관측 추가
Instrument the latest-snapshot buffer at the point where delivery semantics are actually decided. Each pending snapshot now retains its enqueue time, successful sends report queue-to-callback delay, and discarded snapshots are classified as replacement, connection closure, or sustained congestion. GameHub forwards these events to bounded Prometheus histogram and counter series, making backpressure visible without attaching per-connection or per-room labels.

## test(metrics): database와 snapshot 지표 검증
Verify that database and realtime-delivery behavior is observable without turning high-cardinality identifiers into metric labels. Snapshot buffering must report replacement drops and actual delivery delay, the Prometheus endpoint must expose HTTP, connection, room, database, delivery-delay, and drop series, and request logging must redact nested credentials while retaining correlation identifiers only in logs. These checks preserve both operational usefulness and bounded metric cardinality.

## feat(game): 새 작업 차단과 active room drain 추가
Introduce an explicit draining state shared by the Fastify readiness boundary and GameHub. Once draining begins, readiness changes to `not_ready`, queued and tournament-waiting clients are released with a `server_draining` protocol error, and no new queue or tournament match may start. Existing rooms retain ownership of their lifecycle and are allowed to finish; a single waiter resolves when the room set becomes empty or returns the remaining room count at the timeout. Final close then stops schedulers, timers, snapshot buffers, heartbeats, sockets, and retained guest results.

## feat(ops): graceful shutdown 절차 추가
Install a single-entry graceful-shutdown handler for SIGTERM and SIGINT. The first signal moves the application through the 60-second game-room drain before Fastify closes and releases repository resources; subsequent signals cannot start a competing teardown. Failures set a nonzero exit status and still attempt application closure, while the signal listeners are detached as part of the normal close lifecycle.

## test(ops): GameHub drain과 graceful shutdown 검증
Verify shutdown as a bounded lifecycle transition rather than an immediate process exit. Entering drain must empty waiting queues, reject new matchmaking, make readiness fail immediately, and wait for active rooms until the configured timeout. Separate signal tests ensure repeated SIGTERM or SIGINT delivery starts only one shutdown sequence and reports failures without re-entering cleanup, preserving single-owner teardown semantics under real process-manager behavior.

## test(load): 실시간 부하 임계값 정의
Lock down the load harness as an executable service-level contract. The default profile requires 500 connections and 50 active rooms, with an explicit 1,000-connection mode, and rejects configurations that cannot allocate two players per requested room. The tests also pin connection and reconnection success, snapshot latency and drop limits, exactly-once finalization signals, required k6 actions, and the separation of PostgreSQL and edge fault plans so later harness changes cannot silently weaken the acceptance criteria.

## test(load): 실시간 fault injection 도구 추가
Add a k6 realtime-load harness that opens the configured connection population, creates live rooms, drives versioned input, exercises ticket-based reconnection, and measures snapshot delay, delivery gaps, and match-finalization uniqueness. A Docker Compose overlay routes PostgreSQL and the public edge through separate Toxiproxy endpoints, while a validated control utility can add latency, reset peers, or disable either path. Keeping database and edge faults independently addressable makes it possible to distinguish persistence degradation from transport degradation under the same server-authoritative workload.

## fix(api): startup seed 생성을 제거
Removes automatic seed creation when the API selects the in-memory repository. Startup now constructs dependencies and serves the configured mode without inserting users or other fixtures. This separates runtime lifecycle from environment preparation and prevents restarts from changing application data or making smoke behavior depend on hidden bootstrap records.

## test(api): startup seed 금지 검증
Adds a source-level guard that the API entrypoint never invokes ensureSeedData, keeping process startup free of implicit data mutation. The WebSocket smoke path is changed to explicit AI mode and checks the behavioral AI marker rather than a seeded NPC handle, so process verification no longer depends on startup-created fixtures. Seed creation remains an explicit operational action rather than an application boot side effect.

## test(game): versioned match replay fixture 추가
Adds a versioned, fully specified 1,000-tick replay containing the initial state, fixed timestep, encoded input stream, and expected SHA-256 hash of the final simulation state. Replaying every recorded input through PongSimulation.step must reproduce the hash exactly. This turns determinism into a durable compatibility contract: changes to physics, serialization, or timestep semantics must intentionally update the replay version rather than silently altering authoritative outcomes.

## build(runtime): Node.js engine version을 정확히 고정
Changes the workspace engine declaration from any Node 24 release to the exact runtime version used by the repository. Exact pinning makes local installation checks agree with CI and container images and prevents an unreviewed minor or patch runtime from changing module, networking, or build behavior.

## build(docker): production API image 구성
Adds a multi-stage API image and a constrained Docker build context. The builder installs the frozen workspace dependency graph and compiles shared contracts, database code, and API code in dependency order; the runner receives only compiled packages and their runtime dependencies, starts directly with Node, and drops to the unprivileged node user. Excluding secrets, caches, reports, and prebuilt output also makes the build context smaller and less likely to leak local state.

## build(docker): production Web image 구성
Adds a multi-stage production image for the Next.js application. Dependency installation is frozen against workspace manifests, public API/WebSocket/app-mode values are compiled as build arguments, and only Next's standalone server plus static assets are copied into the final image. Running the minimal artifact as the unprivileged node user avoids shipping the source-oriented build environment into production.

## build(docker): Caddy reverse proxy 구성
Packages the Caddy configuration into an immutable image instead of bind-mounting it at runtime. Routing keeps /api requests and WebSocket upgrades on the API while sending all remaining traffic to the web application, but explicitly returns 404 for the public /api/metrics path before the general API handler. This preserves one external origin without exposing internal observability data.

## build(docker): production container lifecycle 구성
Replaces development-style containers that installed dependencies and mounted source at startup with built API and web images. A one-shot migration service waits for a healthy database; the API waits for migration success; the web waits for API health; and Caddy waits for both application services. Only the edge is published, database and application ports remain internal, secrets are required, and readiness checks define dependency ordering. The resulting Compose graph models production lifecycle rather than a convenient local shell.

## test(docker): production container contract 검증
Adds executable checks against the rendered Compose model and Dockerfiles. The contract requires Caddy to be the only published service, migrations to run once before API startup, no source bind mounts, pinned Node images, non-root application processes, direct Node commands, required secrets, and a publicly blocked metrics path. These tests guard deployment topology and privilege boundaries that application tests cannot observe.

## refactor(game): matchmaking player와 fallback 계약 정의
Introduces the domain vocabulary for matchmaking independently of sockets and rooms: registered versus guest players, rating-bearing pairs, queued/matched/duplicate join outcomes, waiting/ready/unavailable AI fallback outcomes, and queued versus matched status. The six-second fallback constant and injectable clock are part of the contract, while input validation rejects empty identities, unsafe ratings, and invalid pool kinds. This typed state surface makes later transitions exhaustive instead of encoding them as nullable values.

## refactor(game): rating 기반 closest-pair queue 구현
Implements the Matchmaker queue with explicit queued and matched statuses. A new entrant is paired with the closest same-kind candidate inside the configured rating difference; otherwise the player is queued with both enqueue and AI-fallback timestamps. Duplicate membership is reported rather than mutating state, and injected time plus defensive value copies make the algorithm deterministic and isolated from external object mutation.

## refactor(game): AI fallback과 reservation lifecycle 구현
Extends Matchmaker from pair selection into a complete reservation lifecycle. AI fallback can be claimed only by a currently queued user and only after the six-second deadline; the claim atomically removes the queue entry and marks the user matched. Separate leaveQueue and release operations preserve the distinction between cancelling a wait and freeing an already assigned slot, so callers cannot accidentally make one side of an active match available.

## test(game): matchmaking 규칙 검증
Defines Matchmaker's state-machine contract with a controllable clock: choose the closest compatible rating, retain out-of-range users, never cross guest and registered pools, expose AI fallback exactly after six seconds, reject duplicate membership while queued or reserved, and distinguish leaving a queue from releasing a matched reservation. These tests make ownership and timing semantics explicit before GameHub integration.

## refactor(db): match result repository 계약 분리
Extracts MatchResultRepository as the narrow persistence contract for idempotent match finalization and makes AppRepository extend it. GameHub now depends only on that contract plus the few chat, NPC, and tournament operations it actually invokes. Narrowing the boundary makes finalization independently substitutable and keeps realtime domain code from being coupled to the repository's unrelated user and administration surface.

## refactor(game): Matchmaker queue reservation을 GameHub에 연결
Moves PvP selection and duplicate-user reservation into Matchmaker while GameHub retains socket and timer concerns. Enqueue now distinguishes queued, matched, and duplicate states, separates guests from registered users, enforces the rating window, and releases both reservations if the transport-side opponent entry is missing or room creation fails. This begins replacing ad hoc array matching with an explicit domain state machine.

## refactor(game): Matchmaker AI fallback를 GameHub에 연결
Schedules AI fallback from the Matchmaker-provided deadline and claims the fallback through its state machine rather than by inspecting a parallel queue. The handler reschedules when the deadline has not arrived, abandons stale or unavailable entries, revalidates socket and room state after asynchronous NPC lookup, and releases the reservation on every failure. This keeps delayed work from creating a room for a user who has already disconnected, matched, or entered shutdown.

## refactor(game): queue와 reservation cleanup 일원화
Removes GameHub's duplicate queue array and makes Matchmaker the authoritative owner of queued and reserved users, while a map retains transport-specific timers and clients. Queue leave, disconnect pruning, drain, shutdown, room abandonment, finalization failure, and room removal all release through shared paths. Consolidating ownership prevents the two representations from disagreeing about whether a user is queued, matched, or available.

## refactor(game): room 생성과 finalization cleanup 보장
Wraps room publication in rollback cleanup: if observer notification, client assignment, matching messages, or the initial snapshot fails, the scheduler entry, reconnect timer, room map, and client room references are restored before the error escapes. Finalization similarly removes the room in a finally block after persistence succeeds, even when observation or broadcast fails. The lifecycle boundary now guarantees that partially visible rooms and completed rooms cannot leak in-memory ownership.

## test(game): matchmaking lifecycle 검증
Adds focused GameHub lifecycle tests for rating-window matching, reservation release after a finalized forfeit, cleanup of an abandoned empty room, and rollback when room construction fails partway through. The suite verifies that a player is reserved by at most one active match and becomes matchable again after every terminal or failed creation path, preventing stale in-memory reservations from permanently removing users from matchmaking.

## fix(load): local database secret을 필수화
Changes the load-test Compose overlay from a default PostgreSQL password to required environment interpolation. Startup now fails before launching the stack when POSTGRES_PASSWORD is absent, so fault and performance runs cannot silently use an embedded credential that differs from the base deployment's secret contract.

## test(load): database secret 요구 검증
Locks the load overlay to required-secret interpolation and explicitly rejects a fallback password. The test ensures the Toxiproxy-routed DATABASE_URL can only be constructed when POSTGRES_PASSWORD is supplied, preventing later configuration edits from reintroducing a known local credential.

## feat(db): legacy session을 안전하게 만료
Adds an explicit migration that deletes existing session rows, forcing every previously issued cookie to reauthenticate after the authentication contract changes. The migrator also gains an optional target migration so tests can construct historical states and then exercise the upgrade path. Expiring ephemeral credentials is safer than attempting to reinterpret legacy session material while leaving durable users and match history untouched.

## test(db): 인증 migration 중 데이터 보존 검증
Builds a pre-migration database with users, an active session, a finalized match, and rating history, then applies the authentication migration. The test proves that all legacy sessions are invalidated while user and match-domain records remain byte-for-byte equivalent, and that the migration is recorded. This protects the intended security reset from becoming an accidental domain-data migration.

## ci(repo): process와 browser 검증 job 추가
Adds an integration job that builds production artifacts, provisions and migrates PostgreSQL, starts the compiled API and production web server, waits for readiness, then runs HTTP smoke, WebSocket smoke, and browser E2E suites. Process cleanup is trapped so failures do not leave child services running. This verifies boundaries that unit tests cannot cover: built artifacts, real process startup, persistence wiring, sockets, and browser interaction.

## test(ci): process 검증 job contract 확인
Adds a static CI contract test that pins one Node and pnpm toolchain, requires frozen lockfile installation, and verifies distinct unit, PostgreSQL integration, process smoke, and browser E2E commands. It also checks that the integration path provisions PostgreSQL and applies migrations and seed data, preventing workflow edits from silently dropping required verification stages.

## feat(db): test database reset target guard 추가
Introduces a fail-closed resolver for destructive test resets. It requires NODE_ENV=test and TEST_DATABASE_URL, accepts only PostgreSQL URLs, and permits either the public schema of an explicitly test-named database or one exact generated test_<32 hex> search_path. Ambiguous options, malformed names, and ordinary application databases are rejected so later reset code cannot erase an unintended schema.

## feat(db): test schema reset과 migration 실행 연결
Adds an explicit reset:test CLI path. After the reset target passes the dedicated-test-database or generated-isolated-schema guard, it opens a control connection without search_path options, transactionally drops and recreates only the quoted target schema, closes the pool, and reapplies migrations to the guarded target URL. This makes destructive test cleanup reproducible while preserving the safety boundary established by target resolution.

## test(db): test database reset guard 검증
Exercise the destructive reset boundary against non-test runtimes, ordinary database names, and ambiguous `search_path` options. The integration case resets and remigrates one generated test schema while retaining a sibling schema, proving that the guard constrains both eligibility and the actual destructive target.

## fix(db): 차단 감사 기록을 원자적으로 저장
Move the user-status update and corresponding administrator-action insert into one PostgreSQL transaction. The account state and its audit explanation now commit or roll back together, preventing a suspended user from being left without the durable record required to reconstruct who performed the action and why.

## test(db): 차단 감사 기록 atomicity 검증
Force the audit insert to violate a temporary database constraint after the user update has begun. The test verifies that neither the ban nor an audit row survives, locking down the transaction boundary rather than merely confirming both writes on the normal path.

## feat(metrics): event-loop lag 측정 추가
Adds a Node event-loop delay histogram and exposes its 95th percentile as a Prometheus gauge. The monitor is enabled with the metrics lifecycle and disabled on close so observability does not leave background handles behind.

## test(load): event-loop lag를 부하 profile에 노출
Publishes the API metrics port to loopback in the load overlay and collects the server's event-loop p95 during k6 teardown. Converting the Prometheus seconds sample into a k6 millisecond trend makes runtime saturation part of the load pass/fail profile.

## test(load): event-loop lag 임계값 검증
Locks the load contract to a 50 ms p95 event-loop-lag threshold, verifies the required observability metrics are exported, and checks that the load overlay exposes the API metrics endpoint only on loopback.

## test(e2e): 비회원 체험 브라우저 흐름 검증
Add a demo-mode Playwright suite that verifies guest entry without credentials, restricted navigation, two-browser PvP matching, the bounded six-second AI fallback, and ticket-based recovery after an in-match WebSocket interruption. These scenarios exercise the public guest contract through real browser, HTTP, and realtime boundaries rather than through isolated UI assertions.

## chore(repo): 원본 화면 기록 파일 제외
Exclude run-specific Playwright capture output from version control while retaining only deliberately curated demo artifacts. This keeps nondeterministic raw recordings from bloating history or appearing as reviewable source changes.

## chore(media): 비회원 화면 기록 공통 pipeline 추가
Introduces a reproducible Playwright-and-ffmpeg capture pipeline for guest-demo evidence. It validates the generated guest identity and page state, writes run-scoped raw output, compresses selected artifacts, and rejects missing or implausibly small files.

## chore(media): PvP reconnect 화면 기록 추가
Extends the capture harness to create two isolated guest sessions, start a PvP match, deliberately close one routed WebSocket, verify the reconnecting and resumed-playing states, and encode the resulting screenshot and VP9 video.

## chore(media): AI fallback mobile 화면 기록 추가
Extends the browser media harness to exercise the guest queue on a Pixel-sized viewport, assert that AI fallback does not occur before the configured delay, enter the AI match, and emit verified compressed screenshot/video evidence.

## fix(auth): 정지된 관리자 login 거부
Include current account status in the administrator authorization boundary. A valid session and `admin` role no longer grant access when the underlying account has been suspended, so authorization reflects the latest security state rather than only the state captured when the session was issued.

## test(auth): 정지된 관리자 session 거부 검증
Verify that suspending an administrator revokes privileges held by an already-issued session. A subsequent administrator request must fail with the stable `account_suspended` envelope, protecting against sessions that would otherwise outlive a status change.

## fix(api): 내부 WebSocket 오류 숨김
Separates client parse failures from internal processing failures. Malformed protocol input receives a stable invalid_event response, while repository and matchmaking exceptions are reduced to a fixed internal_error message instead of exposing exception text.

## test(api): WebSocket repository error redaction 검증
Inject a repository failure containing SQL text and an internal host name, then exercise it through the WebSocket command boundary. The client must receive only the stable `internal_error` response, proving that redaction covers asynchronous domain failures as well as malformed protocol input.

## fix(db): tournament start 상태 갱신 여부 확인
Uses UPDATE ... RETURNING to require exactly one eligible tournament row to transition to running. A zero-row update is surfaced as a missing-match error so callers can roll back their in-memory room.

## test(db): tournament match 미갱신 거부 검증
Add a PostgreSQL integration regression for the zero-row tournament-start update. Starting an unknown or ineligible match must reject instead of looking successful, allowing GameHub to invoke its room rollback path.

## fix(game): tournament 시작 실패 시 room 상태 복원
Treats in-memory room creation and persistent tournament-start marking as one logical transition. If persistence fails, the newly created room is abandoned before the error propagates, preventing a ghost room from blocking a clean retry.

## test(game): tournament start rollback 검증
Reproduce a tournament-start persistence failure after the in-memory room has been prepared. The test proves that the room and scheduler state are removed and that the same players can retry successfully, preventing a failed database transition from reserving participants indefinitely.

## feat(web): profile과 friend 조회 query 추가
Adds schema-validated API helpers and scoped React Query options for the current profile and friend list. Profile updates invalidate every cache that embeds mutable identity data, while session expiration clears the new private caches.

## test(web): profile과 friend 조회 규칙 검증
Verify the own-profile and friend-list request helpers and their React Query ownership rules. The tests pin credentials, abort propagation, exact cache keys, profile-wide invalidation after mutation, and private-cache removal on session expiration so user data cannot survive beyond the authenticated session that owns it.

## refactor(db): 경기 결과 확정 boundary 일원화
Remove the separate tournament-completion operation from both repository implementations and route ordinary match persistence and tournament progression through `finalizeMatch`. One idempotent result boundary now owns the durable outcome, avoiding partial workflows in which a match row and bracket state could be advanced by different calls.

## test(db): 경기 결과 확정 boundary 적용 검증
Lock the narrowed repository surface by asserting that `finalizeMatch` is available and the legacy `completeTournamentMatch` escape hatch is gone. This prevents later code from bypassing the single idempotent finalization boundary.

## fix(game): 부하 중 snapshot cadence 안정화
Keeps authoritative simulation at 20Hz but sends snapshots at 10Hz, assigning alternating delivery slots per room to spread bursts. Extends finalization observations with created/null and records idempotent duplicate persistence separately.

## fix(load): 기본 부하 profile 측정 안정화
Staggers reconnect closures across players and arms them only after a playing snapshot, reads finalization success/failure/duplicates from Prometheus server metrics instead of client finished events, and introduces a label-aware metric parser.

## test(load): 기본 부하 병목 구간 검증
Add regression coverage for staggered 10 Hz snapshot delivery across multiple rooms while authoritative simulation continues at 20 Hz. The suite also pins persisted forfeit-finalization observations, duplicate metrics, reconnection staggering, and the switch to server-side finalization evidence, protecting the load profile from measuring client visibility instead of backend correctness.

## test(load): fault recovery 검사 자동화
Adds a reusable fault-scenario runner that drives Toxiproxy through database latency/outage and edge latency/reset, polls readiness for expected failure and recovery states, emits a versioned JSON report, and always resets proxies.

## test(load): fault scenario 설정과 report 검증
Verify the fault harness as an operational contract: proxy ports remain loopback-only, default latency and reset parameters are deterministic, database and edge failures occur in the intended order, readiness captures degradation and recovery, and a versioned JSON report is emitted. Proxy cleanup must run even when a scenario fails so one experiment cannot contaminate the next.

## fix(db): idle connection pool 오류에서 복구
Installs a PostgreSQL Pool error listener that converts idle-client failures to sanitized events and contains reporter failures; API startup buffers events until Fastify logging is available, then reports them without crashing the process.

## test(db): 안전한 connection pool 오류 처리 검증
Verify that idle PostgreSQL pool errors are contained and reported only with sanitized error name and code metadata. Missing or failing reporters must not turn the pool's asynchronous `error` event into an uncaught exception, preserving process availability during transient connection loss.

## feat(shared): 모든 HTTP request schema를 strict하게 정의
Define one strict params, query, and body schema for every JSON HTTP route, including explicit empty-object schemas for endpoints that accept no input. This makes absence of a field part of the API contract and stops undeclared client data from flowing into handler logic merely because TypeScript types disappear at runtime.

## fix(api): 모든 route input을 runtime 검증
Introduce a shared `parseHttpRequest` boundary and apply each route's strict params, query, and body contract before business logic executes. Invalid or additional fields now converge on the same `validation_error` envelope, keeping runtime behavior aligned with the shared TypeScript/Zod route definitions.

## test(api): strict request contract 검증
Adds table-driven API tests across JSON routes to reject unknown query/body fields and invalid path parameters through the shared validation-error envelope; also verifies untrusted X-Forwarded-For cannot evade guest creation limits.

## ci(e2e): 비회원 체험 browser job 실행
Add a dedicated CI job that builds and starts the API and web application in demo mode, waits for both processes, and runs the guest-only Playwright suite without PostgreSQL. Isolating this path verifies that the public trial experience remains self-contained rather than succeeding only in the authenticated production topology.

## test(ci): guest browser job 요구 검증
Add a workflow contract test that requires the separate guest-demo browser job, consistent demo-mode environment values, the intended Playwright command, and the guest specification. The static check prevents routine CI edits from silently dropping this distinct deployment path.

## fix(game): callback 지연을 snapshot congestion으로 오판하지 않음
Stop treating an outstanding WebSocket `send` callback as transport congestion. New snapshots may continue to enter the socket while `bufferedAmount` remains healthy; latest-only replacement and connection termination are reserved for measurable buffered pressure, avoiding false frame loss caused only by callback scheduling.

## test(game): callback 지연과 실제 congestion 구분
Separate delayed WebSocket callbacks from actual buffered transport pressure in `LatestSnapshotBuffer` tests. The fake socket can hold multiple callbacks, and only an elevated `bufferedAmount` may trigger replacement, locking down the distinction between application callback latency and network backpressure.

## test(game): connection 교체 시점 검증 분리
Strengthens the same-user connection replacement test by asserting the replacement receives a waiting snapshot, the room remains unscheduled, stale input cannot create a second room, and no reconnect timeout finalizes the match.

## test(e2e): browser 사용자 상태 격리
Generate bounded E2E identities from the run, browser project, and worker and apply them to chat and tournament actors. Auxiliary API contexts also use explicit origins, preventing parallel tests from sharing persisted users or inheriting an unintended base URL.

## test(e2e): 브라우저 프로젝트별 로그인 식별자 격리
Migrate the remaining browser scenarios from fixed handles to project-, worker-, and run-specific identities and update profile assertions accordingly. Desktop and mobile projects can now execute against the same database without overwriting each other's user state.

## test(repo): 정적 계약 검사 명령 연결
Expose one root `test:contracts` command, with a matching Make target, that runs the CI, production-Docker, and load-harness contract suites. A single entry point makes these repository-level invariants reproducible both locally and in automation.

## ci(repo): 정적 계약 검사 실행
Run the repository's static contract suite in CI after unit tests and before the build. Workflow, deployment, runtime-version, and load-harness assumptions therefore fail in the same change that breaks them instead of remaining unaudited configuration.

## test(runtime): Node 버전 계약을 기준 파일에서 읽음
Make CI and Docker contract tests read the expected Node runtime from `.node-version` rather than duplicating a literal. This establishes one authoritative version source and lets a future patch update be reviewed once while all consumers verify against it.

## build(runtime): Node.js 보안 패치 적용
Updates the single pinned Node patch level from 24.18.0 to 24.18.1 across local version files, package engines, all CI jobs, API/web image stages, and the load-test bootstrap image.

## build(web): Next.js 보안 패치 적용
Raise the web application's direct Next.js requirement to `^15.5.21` and refresh the resolved platform compiler packages. The manifest records the reviewed security/compatibility decision, while the lockfile captures the concrete cross-platform build graph.

## build(api): WebSocket 보안 패치 적용
Raise the API's direct `ws` dependency to `^8.21.0` and resolve that version through the workspace and Fastify WebSocket integration. Updating the authoritative manifest, rather than only the lockfile, preserves the patched transport version on future installs.

## test(config): production fixture에 영속 DB 명시
Add a PostgreSQL URL to the existing explicit-production environment fixture. The fixture now represents a valid production configuration after persistence became mandatory, allowing unrelated production parsing assertions to continue exercising the successful path.

## fix(config): production에서 영속 저장소 요구
Reject production configuration without `DATABASE_URL` during environment parsing. Durable users, matches, ratings, and tournament state can no longer fall back silently to process-local memory, so a deployment with missing persistence fails before accepting traffic.

## test(config): production memory fallback 거부 검증
Verify that both explicit `APP_MODE=production` and production inferred from `NODE_ENV` reject a missing `DATABASE_URL`, while demo mode may still select memory storage. The tests lock the persistence requirement to deployment semantics rather than to one spelling of the environment.

## fix(protocol): 채팅 scope와 room 식별자 조합 제한
Model `chat.send` as a scope-discriminated protocol: lobby messages must omit `roomId`, while match messages must carry a UUID room identifier. Updating the server, browser sender, tests, and smoke traffic together makes invalid scope/room combinations unrepresentable after parsing instead of relying on downstream normalization.

## test(protocol): 채팅 scope와 room 조합 검증
Add negative protocol cases proving that the version-one parser rejects lobby messages carrying any room field and match messages without a valid UUID. These tests protect the discriminated-union boundary before authorization or persistence code sees the event.

## fix(db): 채팅 행의 scope와 room 불변식 강제
Add migration 006 to normalize lobby rows, remove irreparable invalid match/scope rows, and install a database check constraint requiring the correct room representation for each scope. Both PostgreSQL and memory repositories validate the same invariant before insertion, so runtime and durable storage agree.

## test(db): 채팅 저장 불변식 검증
Verify chat scope/room consistency in both repository implementations. Memory insertion rejects invalid combinations, while PostgreSQL migration tests cover legacy cleanup, check-constraint enforcement, and idempotent reapplication, protecting both new writes and upgraded databases.

## fix(game): 매치 채팅의 좌석과 audience 검증
Authorize match chat against the authoritative room rather than trusting the client-supplied identifier. GameHub requires the room to exist, the client to be attached to it, and `sideFor` to prove seat ownership before persistence; match messages are then broadcast only to that room. Lobby messages remain globally broadcast but are normalized to a null room at the repository boundary.

## test(game): 타 경기방 채팅 주입 차단 검증
Create two simultaneous rooms to verify that a player cannot inject chat into the other match. The forged send must fail before persistence or broadcast, legitimate match chat reaches only the owning room, and lobby chat remains global with a normalized null room identifier.

## fix(web): 현재 경기방의 채팅만 표시
Filter inbound `chat.message` events with a pure `isChatForActiveRoom` predicate before they reach the game reducer. Only match-scoped messages whose `roomId` equals the current game are retained, preventing lobby or other-room traffic from contaminating the active match chat panel.

## test(web): 매치 채팅 room filtering 검증
Unit-test the room filter across the full boundary: exact active-room match messages pass, while another room, lobby scope, and the absence of an active room all fail. This preserves client-side audience isolation even if unrelated chat events share the same WebSocket.

## fix(game): 일시정지 시 paddle 입력 상태 초기화
Clear both the public snapshot paddle velocity and the simulation's internal direction on a valid pause transition before broadcasting the paused state. Keeping the rendered and authoritative input representations synchronized prevents a previously held direction from resuming movement implicitly.

## test(game): pause 전 입력이 재개 뒤 남지 않음 검증
Drive movement, pause, neutral input, and resume through GameHub with a controlled clock. The observed authoritative snapshots must report zero paddle velocity across the boundary, proving that no pre-pause direction survives into resumed simulation.

## fix(game): 경기 결과 저장 실패를 재시도 가능한 상태로 유지
Keeps finished room alive when persistence fails; retries finalizeMatch with stable idempotency key using exponential backoff 250ms capped 5s. Retry timer belongs to room and is cleared on abandon/close/remove. Reservations are no longer released on transient failure, and drain waits on finishing promise.

## test(game): 일시적인 경기 결과 저장 실패 복구 검증
New fake-timer GameHub tests force first finalizeMatch failure then success. Assert same room-derived resultKey, no premature game.finished/room removal, failure then success observer events, and beginDrain remains pending until retry succeeds.

## fix(auth): 정지된 사용자의 열린 연결 폐기
Admin ban/status handlers persist ban then immediately call GameHub.revokeUser. Revocation stops heartbeat/snapshot queue, leaves matchmaking/tournament waiters, releases input rate gate, removes connection indexes, preserves room side as reconnect reservation, closes 4003, broadcasts presence. Unban does not revoke.

## test(auth): 계정 정지의 기존 WebSocket 차단 검증
Runs real server/socket in admin tests; after ban endpoint, existing socket must close 4003 account suspended and old session cannot issue new ticket (403). Verifies live revocation across HTTP and realtime.

## fix(realtime): WebSocket transport payload 상한 설정
Set the underlying `ws` server's `maxPayload` to the existing 8 KiB pre-authentication limit. Enforcing the bound in the transport rejects oversized frames before buffering or JSON parsing, and applies consistently both before and after authentication rather than relying on application-level checks.

## test(realtime): oversized WebSocket frame 거부 검증
Authenticate a real WebSocket, send an 8,193-byte frame, and require close code 1009. The integration test locks the payload limit to the authenticated transport path, where an application-only pre-authentication guard would otherwise leave a gap.

## fix(runtime): container 종료 유예를 room drain과 정렬
Set the API container's `stop_grace_period` to 70 seconds, exceeding the application's 60-second room-drain budget. The orchestrator therefore allows active matches and persistence cleanup to finish instead of escalating to SIGKILL before graceful shutdown can complete.

## test(docker): API 종료 유예 계약 검증
Parse the production Compose duration and require the API stop grace period to be at least the 60-second application drain budget. This static contract prevents a deployment-only timeout edit from invalidating the shutdown guarantee.

## build(security): 프로덕션 의존성 취약점 패치
Update the production dependency manifests for patched Fastify, Next.js, and PostCSS releases and add root overrides for vulnerable transitive packages including `fast-uri`, `nanoid`, `postcss`, and `sharp`. The lockfile records the resulting resolution graph; the reviewed security policy remains in the hand-authored manifests and overrides.

## fix(ci): 브라우저 E2E API origin 정렬
Change the browser E2E API origin from `127.0.0.1` to `localhost` while leaving the WebSocket endpoint on loopback. Matching the HTTP login origin to the browser host allows the host-only session cookie to accompany subsequent API requests instead of being lost across equivalent but distinct host labels.

## test(ci): 브라우저 E2E cookie origin 계약 검증
Add a CI contract assertion that `API_BASE_URL` is exactly `http://localhost:4000`. The test protects the cookie-origin fix from later workflow edits that would reintroduce `127.0.0.1` and break authenticated browser requests.

## docs(project): 프로젝트 문서 정리
Reorganize the project README and architecture, operations, protocol, reconnect, and measurement documents around the finished server-authoritative design. Add an executable documentation contract that requires the key files and terminology, so changes to lifecycle or operational evidence cannot silently leave the published engineering description stale.

