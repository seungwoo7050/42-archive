# Project Importance Profile

Project: `irc-relay-server` (`cpp/ft_irc`)

Domain: Single-process event-driven network server and IRC protocol implementation in C++17.

Primary Purpose: Provide a cross-platform non-blocking IPv4 IRC relay server that supports registration, direct and channel messaging, channel membership and modes, bounded operational protections, observability, and graceful shutdown on Linux (`epoll`) and macOS (`kqueue`).

Resolved Commit Scope: The complete independent, linear history of `cpp/ft_irc`, from `3786db4edf13` (`docs(readme): 프로젝트 목표와 초기 개발 규약 정의`) through `c32b2e2faf44` (`docs(project): 프로젝트 문서 정리`). The scope contains 89 commits: 87 applicable non-documentation commits represented in `commit-bodies.md` and two documentation-only commits. No merge commits or unrelated inherited ancestors are present. Twelve-character abbreviated SHAs uniquely identify every commit in scope.

## Core Technical Areas

- Portable readiness processing through a common event contract with `epoll` and `kqueue` backends.
- Move-only socket ownership, incremental input framing, partial non-blocking reads and writes, output queuing, and backpressure.
- Listener and connection lifecycle management, event registration consistency, callback dispatch, rollback, and cleanup.
- IRC line parsing, command normalization, numeric and message formatting, and registration-state enforcement.
- Descriptor-keyed client state, case-insensitive nickname indexing, identity transitions, and registration completion.
- Channel aggregates, membership, operator authority, invitations, topics, mode state, message fan-out, and disconnect cleanup.
- Registration, idle, and ping deadlines; exact PONG correlation; rate limiting; connection and pending-output limits.
- Structured metrics and logging, signal-driven shutdown, and bounded output-drain behavior.
- Layered verification through deterministic unit tests, real TCP contract and smoke tests, high-descriptor and slow-receiver tests, cross-platform CI, and sanitizers.

## Core Architecture

- `EventManager` defines the platform-neutral add, update, remove, and wait contract. `EpollEventManager` and `KqueueEventManager` translate operating-system registrations and readiness into that common model.
- `Connection` is the move-only owner of one client socket and its input buffer, output queue, partial-write offset, framing limit, peer identity, and close state.
- `Server` owns the listening socket, the event manager, and the authoritative `fd -> unique_ptr<Connection>` map. It converts readiness into connect, complete-line, disconnect, and infrastructure-error callbacks.
- `IrcApplication` is the protocol and domain coordinator. It owns `ClientRegistry`, channel aggregates, runtime policies, application metrics, command dispatch, response construction, and protocol-aware cleanup.
- `IrcMessage` and the reply helpers form the wire-format boundary; `RuntimeConfig`, `main`, and the Makefile form the runtime and platform-selection boundary.
- The test architecture mirrors these layers: scripted `Connection` syscall tests, fake-event-manager server and application lifetime tests, exact TCP contract tests, real-process fairness tests, and CI over both supported event backends.

## Critical Invariants

- Each accepted descriptor has one authoritative `Connection` owner and is closed exactly once; event registration and the server connection map must not diverge.
- Callback execution, event-interest updates, and response enqueueing may synchronously remove a connection. Code must not retain or reuse a `Connection`, client, channel, pointer, reference, or iterator across that transition without re-resolving it.
- Partial sends advance only by the bytes actually reported as sent; retries preserve the unsent suffix in order, queue-limit arithmetic cannot wrap, and rejected bytes do not mutate pending state.
- Input framing is incremental, output framing is normalized to CRLF, and malformed or oversized frames cannot remain buffered as later valid commands.
- IRC registration becomes complete only after the password, nickname, and USER prerequisites hold; nicknames remain unique under the registry's canonical lookup rule.
- Channel membership, operator state, invitations, and empty-channel lifetime remain consistent with client and nickname state. A disconnected descriptor cannot survive in any channel, and shared peers receive each identity or quit transition at most once.
- Channel mutations enforce membership and operator authority, including invite-only admission, topic protection, kicks, invitations, and operator-mode changes.
- Registration, idle, ping, and rate-limit decisions use coherent per-client state. Heartbeat deadlines use a monotonic clock, and only the exact outstanding PONG token clears the wait state.
- Resource and shutdown failures remain connection-scoped where possible: pending output, connection count, registration time, command rate, and heartbeat waits are bounded or explicitly governed, and shutdown attempts to queue final errors before teardown.

## Major Engineering Difficulties

- Reconciling the different registration and notification models of `epoll` and `kqueue` without leaking platform flags into the server loop.
- Correctly modeling a byte stream where one readiness notification may yield many lines, a partial line, a partial write, interruption, temporary backpressure, EOF, or a hard failure.
- Preserving object and aggregate lifetime when user callbacks or event-interest updates can delete the exact connection currently being processed.
- Maintaining consistent identity and channel state across nickname changes, explicit PART, KICK, QUIT, transport failure, fan-out, and empty-channel erasure.
- Defining heartbeat behavior that is immune to wall-clock movement and unrelated or forged PONG messages.
- Turning rare failure paths into deterministic tests through injected send operations and event-manager failures rather than relying on timing-dependent network accidents.
- Demonstrating isolation with many file descriptors and a slow non-reading client while acknowledging that the loop still has no per-ready-event work quantum or formal latency bound.

## Practical Engineering Areas

- Strict external-input validation with explicit numeric ranges and overflow-safe parsing.
- RAII ownership, idempotent cleanup, erase-before-callback ordering, and rollback after partial registration.
- Failure propagation from transport queuing through server interest management into application command continuation.
- Timeouts, rate limits, connection limits, pending-output limits, and explicit operational trade-offs.
- Structured lifecycle logging and metrics with defined shutdown ordering.
- Exact public-contract testing for CLI output, IRC frames, CRLF termination, numerics, log ordering, and process exit behavior.
- Cross-platform regression automation and sanitizer instrumentation over both unit and real-network scenarios.

## S-level Criteria

- Establishes a project-defining execution or responsibility boundary required to explain how the event-driven relay works.
- Implements the core non-blocking output or readiness mechanism without which the server cannot preserve ordered, lossless progress under partial I/O.
- Establishes or restores a critical ownership, callback-reentrancy, event-registration, or application-state invariant spanning multiple layers.
- Establishes authoritative client/channel cleanup whose absence would leave shared protocol state inconsistent after disconnect or identity change.
- Fixes a severe, non-obvious root cause in those mechanisms such that omitting the commit would leave a material gap in the project's correctness story.

## A-level Criteria

- Establishes a major subsystem contract, state model, external-input boundary, lifecycle integration, liveness rule, or resource-protection boundary.
- Corrects a significant edge case or failure path at its proper layer without redefining the whole project architecture.
- Adds deterministic verification for a difficult ownership, timing, backpressure, rollback, or cross-platform invariant.
- Provides system-level integration evidence or operational behavior that materially changes confidence in the completed server.

## Typical B-level Work

- Implements expected IRC commands, numerics, platform-backend details, configuration options, metrics, or support helpers inside an established design.
- Adds normal positive-path or feature-specific regression coverage.
- Extends an existing state machine or aggregate with conventional behavior without changing ownership or responsibility boundaries.
- Provides necessary build and executable wiring that composes already-established mechanisms.

## Typical C-level Work

- Documentation-only commits, ignore rules, presentation-string changes, and very small mechanical refactors.
- Changes with negligible effect on runtime behavior, architecture, correctness guarantees, or verification strength.

## Project-specific Tags

ARCH — Establishes or materially changes a responsibility or module boundary.

CORE — Implements behavior indispensable to the server's defining execution or protocol story.

EVENT_IO — Readiness backends, sockets, framing, buffering, partial I/O, backpressure, or fairness.

LIFECYCLE — Ownership, registration, callback reentrancy, cleanup, rollback, or shutdown.

IRC_PROTOCOL — IRC grammar, wire formatting, registration rules, commands, or numerics.

CHANNEL_STATE — Channel membership, roles, modes, authorization, invitations, topics, or fan-out.

IDENTITY — Client registration state, nickname uniqueness, hostmasks, or identity transitions.

RESILIENCE — Timeouts, rate limits, resource limits, failure containment, or liveness policy.

OBSERVABILITY — Runtime metrics, structured logs, or externally visible diagnostic state.

VERIFICATION — Unit, contract, smoke, stress, sanitizer, or CI evidence for an invariant.

BUILD — Build rules, platform selection, executable composition, or automation infrastructure.

INTEGRATION — Meaningful interaction between otherwise separate transport, protocol, state, or runtime layers.

DEBUG — A root-cause correction of a non-trivial defect or violated assumption.

RISK — Work protecting a high-impact correctness, resource, or reliability boundary.

REFACTOR — Structural cleanup whose primary purpose is changing code organization rather than behavior.

# Commit Classification

| Commit | Subject | Importance | Tags | Summary | Why |
| --- | --- | --- | --- | --- | --- |
| `3786db4edf13` | `docs(readme): 프로젝트 목표와 초기 개발 규약 정의` | C | - | Defines the initial project goals, scope, and development conventions in README. | Documentation-only context with no executable or structural change; it is minor relative to the engineering history. |
| `20728dcb9797` | `chore(project): 빌드 산출물 제외` | C | BUILD | Adds executables, objects, dependency files, and logs to the ignore policy. | Routine repository hygiene; it changes neither runtime behavior nor a meaningful engineering boundary. |
| `8e8a3db87950` | `feat(event): 이벤트 준비 상태 계약 정의` | A | ARCH, EVENT_IO | Defines portable readiness flags, event records, and the EventManager interface. | This establishes the semantic portability boundary shared by epoll, kqueue, and the server. It is architecturally significant, although it does not yet make the runtime operational. |
| `d3f74e2857da` | `feat(event): kqueue 관심 상태 등록 구현` | B | EVENT_IO | Maps logical read/write interests onto kqueue filters with tracked registration state. | Necessary macOS backend work, but it applies the already-established event abstraction rather than changing project-wide architecture. |
| `769cd3094f71` | `feat(event): kqueue 준비 이벤트 변환 구현` | B | EVENT_IO | Converts kevent readiness, errors, hangups, and timeouts into common events. | Completes the macOS backend within the existing contract. The implementation is important portability work but follows the selected design. |
| `2284a0e0d8bb` | `feat(event): epoll 관심 상태 등록 구현` | B | EVENT_IO | Maps common interests onto epoll_ctl registrations and tracked masks. | Necessary Linux backend work inside the established event interface, with limited independent architectural judgment. |
| `f1320f357bca` | `feat(event): epoll 준비 이벤트 변환 구현` | B | EVENT_IO | Translates epoll readiness and socket errors into the platform-neutral event model. | Completes Linux support using the existing abstraction; it is normal implementation of a core subsystem, not a new defining decision. |
| `8864f253ac15` | `feat(connection): 스트림 연결 상태 계약 정의` | A | ARCH, EVENT_IO, LIFECYCLE | Defines a move-only socket owner with framing, buffering, close, and I/O-result contracts. | This is the principal transport responsibility boundary and shapes all later I/O and lifetime work. The core mechanism is completed across subsequent commits, so it remains A rather than S. |
| `d71a2549c0eb` | `feat(connection): 소켓 소유권과 이동 수명 구현` | A | LIFECYCLE, RISK | Implements single ownership, exactly-once close, and state-preserving move operations. | It establishes the resource-ownership invariant on which the server map and callback lifecycle depend. The effect is significant but localized to Connection ownership. |
| `9b601b69de4f` | `feat(connection): IRC 입력 프레임 추출 구현` | A | EVENT_IO, IRC_PROTOCOL, RISK | Extracts incremental CRLF/LF frames and enforces the line-length boundary. | This creates the byte-stream-to-protocol-line boundary and prevents unbounded malformed input. It is a substantial correctness decision inside the transport layer. |
| `b00589d4b1b1` | `feat(connection): 논블로킹 수신 상태 처리` | A | EVENT_IO, RISK | Drains recv until backpressure or termination while separating EINTR, EAGAIN, EOF, and errors. | The commit implements the non-blocking receive state machine and its lifecycle outcomes, a significant part of reliable event-driven operation. |
| `a10fe961e2b1` | `feat(connection): 부분 송신 대기열 처리` | S | CORE, EVENT_IO, LIFECYCLE | Implements persistent partial-write progress, backpressure handling, canonical CRLF, and drain-before-close state. | This is indispensable to the server's defining non-blocking mechanism. Without persistent offsets and retry semantics, slow receivers or partial sends would duplicate, lose, or strand IRC output. |
| `e6492e27cc30` | `feat(server): 이벤트 서버 공개 계약 정의` | A | ARCH, EVENT_IO, LIFECYCLE | Defines Server ownership of the listener, event manager, connections, and transport callbacks. | It establishes the transport/application boundary and authoritative ownership model. The later event loop makes that architecture operational. |
| `f6770c790919` | `feat(server): 서버 수명과 콜백 상태 구현` | A | ARCH, LIFECYCLE | Implements server construction, callback ownership, stop state, and ordered destruction. | The lifecycle skeleton determines how server-scoped resources are acquired and released. It is meaningful foundational work, though not the complete runtime mechanism. |
| `25deb8abcb6a` | `feat(server): IPv4 리스닝 소켓 구성` | B | EVENT_IO | Creates and configures the non-blocking IPv4 listening socket and reports the bound port. | This is competent socket setup within the established server design and does not independently define the project architecture. |
| `4ad1227e5119` | `feat(server): 논블로킹 연결 수락과 등록 구현` | A | EVENT_IO, LIFECYCLE | Drains accepts, configures client descriptors, creates Connections, and registers read interest. | This integrates operating-system descriptors into the server's ownership and event registries, a significant lifecycle boundary with real rollback risk. |
| `378d5304828d` | `feat(server): 준비 이벤트 루프 구동` | S | CORE, ARCH, EVENT_IO | Implements start, run, and pollOnce around portable readiness dispatch for listener and clients. | This is the project-defining execution mechanism that joins the listener, event backend, connections, and callbacks. Omitting it would leave a major gap in explaining how the server works. |
| `eb82a81d6c81` | `feat(server): 클라이언트 입력 이벤트 전달` | B | EVENT_IO, INTEGRATION | Reads ready clients, forwards complete lines, and converts read failures into closure. | It connects established Connection results to established callbacks; necessary integration, but largely an application of existing contracts. |
| `625ffc924de8` | `feat(server): 송신 큐와 쓰기 관심 상태 연결` | A | EVENT_IO, LIFECYCLE, INTEGRATION | Synchronizes queued output with write readiness and graceful close completion. | This establishes the critical coupling between Connection backpressure state and kernel event interest. It is significant cross-component lifecycle engineering. |
| `7a6bc7e1276a` | `feat(server): 연결 해제와 오류 정리 구현` | A | LIFECYCLE, RISK | Centralizes event removal, map erasure, disconnect callbacks, listener cleanup, and bulk shutdown. | The commit creates one authoritative transport cleanup path and an important erase-before-callback ordering rule. Later fixes harden exceptional reentrancy, so this foundational version is A. |
| `a22bf6ddbd75` | `feat(parser): IRC 메시지 값과 직렬화 정의` | B | IRC_PROTOCOL | Introduces the structured IRC message value and basic serialization representation. | This is necessary protocol modeling, but it is straightforward scaffolding for the parser and reply layers. |
| `c31a32b6cb24` | `feat(parser): IRC 한 줄 구문 해석 구현` | A | IRC_PROTOCOL, RISK | Parses prefixes, normalized commands, middle parameters, trailing text, and protocol limits. | The parser is an external input boundary whose mistakes would corrupt all command semantics. Its grammar and validation represent significant project-specific judgment. |
| `0fd2c6a9434b` | `feat(parser): 버퍼에서 IRC 프레임 소비` | B | IRC_PROTOCOL, EVENT_IO | Consumes complete lines from a buffer and delegates each line to the IRC parser. | This is normal integration of framing and parsing after both representations are already established. |
| `aeb1e9b709b9` | `feat(reply): IRC 서버 응답 생성` | B | IRC_PROTOCOL | Adds message, numeric, error, code, and hostmask formatting helpers. | It provides necessary wire-format support within the established protocol model, with limited project-defining impact. |
| `786ed5d839d9` | `feat(channel): 채널 상태 계약 정의` | A | ARCH, CHANNEL_STATE | Defines the Channel aggregate for membership, operators, invitations, topics, and modes. | This establishes the authoritative domain model later used by every channel command and cleanup path. It is significant architecture for the IRC layer. |
| `966f5663dbcc` | `feat(channel): 구성원과 운영자 상태 관리` | B | CHANNEL_STATE | Implements membership and operator mutation, lookup, enumeration, and empty-state queries. | These are essential aggregate operations, but they implement the already-defined channel contract without introducing a new system-wide decision. |
| `0d0d850f007d` | `feat(channel): 주제·초대·모드와 이름 규칙 구현` | B | CHANNEL_STATE, IRC_PROTOCOL | Implements channel-name validation, topic/invite state, +i/+t, and mode rendering. | This is normal domain behavior inside the established Channel aggregate. |
| `52b6f1ce8f0f` | `feat(config): 기본 실행 인자 해석 모듈 구성` | B | BUILD, RESILIENCE | Adds RuntimeConfig defaults, usage output, port parsing, and baseline option handling. | It creates a useful runtime configuration boundary, but the initial parsing is conventional and later commits supply the difficult edge handling. |
| `991b76b8d793` | `feat(client): 연결별 등록 상태 저장` | B | IDENTITY | Adds descriptor-keyed client registration and identity state storage. | This is necessary state infrastructure within the application design, but it is a straightforward container abstraction. |
| `b47135c51cfc` | `feat(client): 닉네임 색인 관리` | A | IDENTITY, RISK | Adds case-insensitive nickname lookup and coordinated index updates and erasure. | Nickname uniqueness and index consistency affect registration, messaging, and cleanup throughout the server. The commit establishes a significant identity invariant. |
| `0b5ae6aef328` | `feat(app): IRC 동작 조율 계약 정의` | S | CORE, ARCH, INTEGRATION | Defines IrcApplication as the owner of protocol state and coordinator of Server callbacks and commands. | This is the project-defining boundary between transport orchestration and IRC semantics. Without it, ownership of registration, identity, channels, replies, and cleanup would be unclear. |
| `2ed9331124bb` | `feat(app): 연결 수명 콜백 조율` | A | LIFECYCLE, IRC_PROTOCOL, INTEGRATION | Creates client state on connect, parses each line once, and removes protocol state on disconnect. | This joins transport lifecycle events to application state transitions and parsing. It is significant integration built on the application boundary. |
| `035e1137e0dd` | `feat(app): 등록 전 명령 분배 구현` | A | IRC_PROTOCOL, IDENTITY, RISK | Centralizes registration-aware dispatch, allowed pre-registration commands, 451, and 421 responses. | The registration gate is the protocol authorization boundary for every later command. Centralizing it prevents inconsistent lifecycle checks across handlers. |
| `8bbd1eb75961` | `feat(app): 응답과 클라이언트 정리 지원 구현` | B | IRC_PROTOCOL, LIFECYCLE | Adds shared prefix, numeric, send, close, and initial client-removal helpers. | These helpers support established application responsibilities; the deeper reentrant cleanup guarantees arrive in later commits. |
| `582317254e24` | `feat(registration): PASS 인증 상태 처리` | B | IDENTITY, IRC_PROTOCOL | Validates PASS, rejects bad credentials, and advances password authorization state. | This is expected registration behavior inside the already-defined state machine. |
| `80a639321bad` | `feat(registration): 닉네임 검증과 색인 갱신` | B | IDENTITY, IRC_PROTOCOL | Validates nickname syntax, detects collisions, and updates the nickname index. | The command is necessary and handles expected edge cases, but it applies the identity index and registration design already in place. |
| `d9e420b570a0` | `feat(registration): USER 정보와 환영 응답 연결` | B | IDENTITY, IRC_PROTOCOL | Stores USER fields and completes registration with welcome numerics when all prerequisites hold. | This is normal implementation of the established PASS/NICK/USER state machine. |
| `337f9e5238fa` | `feat(registration): PING과 QUIT 기본 명령 처리` | B | IRC_PROTOCOL, LIFECYCLE | Adds PING/PONG response behavior and QUIT-driven close requests. | These are required connection-control commands implemented within existing reply and close abstractions. |
| `ad728f6b8ee5` | `feat(server): IRC 애플리케이션 실행 진입점 구성` | B | BUILD, INTEGRATION, LIFECYCLE | Wires configuration, signals, Server, IrcApplication callbacks, the poll loop, and error output. | It makes the components executable, but primarily composes architecture and mechanisms already established by earlier commits. |
| `f3ecbf108692` | `build(project): 플랫폼별 IRC 서버 빌드 구성` | B | BUILD | Adds the C++17 Makefile with Linux epoll and macOS kqueue source selection and dependency files. | This is necessary reproducible build and platform integration, but it does not change runtime architecture. |
| `953b8746b95d` | `feat(message): 등록 사용자의 개인 메시지 전달` | B | IRC_PROTOCOL, IDENTITY | Routes multi-target PRIVMSG traffic to registered nickname recipients with standard errors. | Direct messaging is core product behavior, but the implementation follows established parsing, lookup, reply, and send boundaries. |
| `c1762e011fd6` | `feat(channel): 채널 탐색과 대상 해석 지원` | B | CHANNEL_STATE | Adds channel storage, target recognition, lazy creation, and command lookup with errors. | This is supporting infrastructure for channel commands within the already-selected aggregate model. |
| `88877a8b0779` | `feat(channel): 주제와 구성원 응답 지원` | B | CHANNEL_STATE, IRC_PROTOCOL | Projects topic and NAMES state into IRC numerics and operator-prefixed nicknames. | This is normal response construction over existing channel and client state. |
| `46e2b7785bee` | `feat(channel): 채널 방송 대상 팬아웃 지원` | A | CHANNEL_STATE, INTEGRATION | Adds channel, common-peer, and mode fan-out with deduplication across shared channels. | Multi-client relay behavior depends on correct recipient selection, especially when peers share several channels. The reusable fan-out boundary is a significant integration decision. |
| `a147d6994d58` | `feat(channel): 구성원 정리와 식별자 변경 방송` | S | CORE, CHANNEL_STATE, LIFECYCLE | Coordinates PART, QUIT, nickname changes, membership removal, peer notifications, and empty-channel erasure. | This establishes the authoritative cross-aggregate cleanup invariant for clients, nickname indexes, and channels. A disconnected descriptor cannot remain in shared state, making the commit essential to the project's correctness story. |
| `7ac793d3b695` | `feat(message): 채널 대상 메시지 방송` | B | IRC_PROTOCOL, CHANNEL_STATE | Extends PRIVMSG to member-authorized channel fan-out while preserving direct-message behavior. | This is expected feature work using the established target, membership, and broadcast abstractions. |
| `22e5f82bc693` | `feat(channel): JOIN 채널 입장 처리` | A | CHANNEL_STATE, IRC_PROTOCOL, RISK | Implements channel validation, invite-only admission, first-member operator assignment, JOIN broadcast, topic, and NAMES. | JOIN is the central membership transition and combines authorization, aggregate creation, role assignment, and fan-out. It is significant even though it uses established helpers. |
| `1a4329e5f738` | `feat(channel): PART 채널 퇴장 처리` | B | CHANNEL_STATE, IRC_PROTOCOL | Parses multi-channel PART requests and delegates membership removal and broadcasting. | This is normal command implementation over the centralized departure path. |
| `b6e62b56b680` | `feat(channel): TOPIC 조회와 변경 처리` | B | CHANNEL_STATE, IRC_PROTOCOL | Adds TOPIC query and protected mutation with operator authorization and broadcast. | It applies the established channel mode and membership model without changing the architecture. |
| `4183c682c421` | `feat(channel): KICK 구성원 제거 처리` | B | CHANNEL_STATE, IRC_PROTOCOL | Adds operator-authorized KICK validation, broadcast, membership removal, and empty cleanup. | This is competent command behavior within the existing permission and cleanup framework. |
| `93d96af9a341` | `feat(channel): INVITE 초대 상태 처리` | B | CHANNEL_STATE, IRC_PROTOCOL | Validates INVITE, records invitation state, acknowledges the inviter, and notifies the target. | This is normal implementation of the existing invitation and membership model. |
| `0e601da7d2bc` | `feat(channel): 채널 모드 조회와 i·t 변경` | B | CHANNEL_STATE, IRC_PROTOCOL | Adds MODE routing, channel mode queries, operator checks, +i/+t updates, and unknown-mode errors. | The command is important protocol coverage but operates inside the already-defined mode and authorization design. |
| `bce6933f69ab` | `feat(channel): 채널 운영자 모드 변경` | B | CHANNEL_STATE, IRC_PROTOCOL | Extends MODE parsing with argument consumption and +o/-o operator changes. | This is a focused extension of the established compound-mode handler and Channel role model. |
| `6b4a7738a285` | `test(smoke): 실제 TCP 등록과 채널 흐름 검증` | A | VERIFICATION, INTEGRATION, RISK | Adds a real TCP smoke harness covering registration, split frames, collisions, messaging, channels, modes, and cleanup. | This is the first broad end-to-end proof that transport, parsing, state, and command layers work together. It materially changes confidence in the integrated server. |
| `60848f425dc3` | `feat(room): 채널 목록 조회 구현` | B | CHANNEL_STATE, IRC_PROTOCOL | Adds channel creation metadata and LIST numerics with optional filtering and member counts. | This is normal protocol feature work inside the established channel map and reply system. |
| `39553bbdf107` | `feat(room): 채널 구성원 조회 구현` | B | CHANNEL_STATE, IRC_PROTOCOL | Adds NAMES for all or selected channels, including empty-result terminators. | This extends existing NAMES projection in a straightforward way. |
| `4fb0d2347955` | `test(client): 채널 목록 응답 검증` | B | VERIFICATION, CHANNEL_STATE | Extends the smoke client to verify LIST and NAMES response sequences. | This is useful routine coverage for newly added commands, not a new difficult invariant. |
| `c4df44554866` | `feat(registration): 등록 대기 시간 제한` | B | RESILIENCE, LIFECYCLE | Tracks connection age and closes clients that fail to complete registration before a configurable deadline. | This adds practical abuse and resource protection using the existing tick lifecycle; significant operationally but structurally straightforward. |
| `764361c52b2a` | `feat(heartbeat): 유휴 연결에 PING을 보내고 응답 대기` | A | RESILIENCE, LIFECYCLE, RISK | Adds activity tracking, server heartbeats, PONG state, and configurable idle and ping timeouts. | This introduces a non-trivial liveness state machine governing when apparently idle connections remain valid or are terminated. Later commits correct its time and token assumptions. |
| `d710f29f38a4` | `test(client): 서버 PING에 응답하는 검사 클라이언트 구현` | B | VERIFICATION, IRC_PROTOCOL | Makes the smoke peer automatically answer server PING frames with PONG. | This is supporting test-client behavior required to exercise heartbeats without destabilizing unrelated scenarios. |
| `f313e707474f` | `test(client): 유휴 연결의 PING·PONG 흐름 검증` | B | VERIFICATION, RESILIENCE | Runs short heartbeat timeouts and verifies an idle peer receives PING and remains responsive. | This is normal positive-path coverage for the newly introduced liveness feature. |
| `9e2b214f9227` | `feat(throttle): 클라이언트별 명령 호출 횟수 제한` | B | RESILIENCE | Adds a per-client sliding command-time window and disconnects clients exceeding the configured rate. | This is practical protection implemented with a conventional bounded-window policy inside the existing command path. |
| `1d2ee55f219a` | `test(client): 명령 호출 횟수 제한 검증` | B | VERIFICATION, RESILIENCE | Floods PING commands and requires the rate-limit numeric and closure behavior. | This is routine regression coverage for the configured command throttle. |
| `d7d85e518177` | `feat(buffer): 송신 대기열 크기 제한` | A | EVENT_IO, RESILIENCE, RISK | Bounds unsent output, propagates queue failure, and exposes the limit through server configuration. | This converts slow-reader pressure into a contained connection failure and creates the failure signal used by later lifecycle hardening. It is a significant reliability boundary. |
| `adb49d9466e4` | `feat(server): 최대 연결 수 제한` | B | RESILIENCE, EVENT_IO | Adds a configurable connection cap and rejects accepted sockets once the cap is reached. | This is useful resource protection but follows the established accept-loop and configuration design. |
| `e05e35ca7da9` | `feat(metrics): 서버 실행 지표 조회 기능 추가` | B | OBSERVABILITY | Tracks server and application counters and exposes them through a METRICS NOTICE. | The commit improves operability and diagnosis without changing core correctness or architecture. |
| `1493ffe8cbd7` | `test(client): 서버 지표 명령 검증` | B | VERIFICATION, OBSERVABILITY | Checks that METRICS returns the expected NOTICE prefix and key sequence. | This is routine verification of an observability command. |
| `956c7aecda32` | `chore(server): 서버 식별 문자열과 환영 응답 정리` | C | IRC_PROTOCOL | Renames the server identifier and simplifies the three welcome strings. | The change affects wording and identity presentation only; it has almost no structural or behavioral significance. |
| `c34aa18f89af` | `feat(log): 연결 상태와 실행 지표 기록` | B | OBSERVABILITY, LIFECYCLE | Adds structured lifecycle events, failure events, room counters, and final metric logging. | This materially improves diagnosis of lifecycle and protection behavior, but it does not establish a core runtime mechanism. |
| `dd04279c47fd` | `feat(shutdown): 종료 전 송신 대기열 처리` | A | LIFECYCLE, RESILIENCE, RISK | Changes signal handling to request application shutdown, queue ERROR frames, and poll briefly to drain closes. | This establishes a meaningful graceful-shutdown path instead of stopping immediately from a signal handler. It affects every live connection and the final metric lifecycle. |
| `3ad63ee21fb8` | `test(smoke): 서버 보호 옵션으로 실행 검증` | B | VERIFICATION, RESILIENCE | Runs smoke tests with explicit heartbeat, registration, rate, and pending-output limits. | This verifies that the protection options compose in the normal scenario, but it is supporting coverage rather than a new invariant. |
| `5e3a8e97626a` | `test(client): 여러 클라이언트의 채널 메시지 전달 검증` | B | VERIFICATION, CHANNEL_STATE | Registers six channel peers and checks fan-out between distinct clients. | This is useful scaling coverage of established channel messaging behavior, but the scenario remains straightforward. |
| `6b361b10c496` | `refactor(command): 명령 처리 시각 기록 통합` | C | REFACTOR | Reuses one monotonic timestamp for activity tracking and rate recording per line. | This is a small local cleanup with no meaningful architectural or behavioral consequence. |
| `e5e6c57db80d` | `test(irc): 실행 조건과 오류 동작 계약 검증` | A | VERIFICATION, IRC_PROTOCOL, RISK | Adds exact CLI, wire framing, command, rate-limit, heartbeat, shutdown, and log-order contract checks. | The suite converts the public executable surface into an explicit regression contract and provides evidence used by later fixes. It is significant verification, though not itself a project-defining mechanism. |
| `b6c10bc51937` | `fix(config): 서버 크기 옵션을 오버플로 없이 해석` | A | DEBUG, RESILIENCE, RISK | Replaces strto-based parsing with strict bounded unsigned-decimal accumulation for ports, timeouts, and size values. | This fixes narrowing and overflow at the external configuration boundary at the root cause, making behavior independent of intermediate C integer widths and permissive sign or whitespace parsing. |
| `5d1286620994` | `test(config): 크기 옵션 경계와 오류 입력 검증` | B | VERIFICATION, RESILIENCE, RISK | Adds signed, whitespace, timeout, port, size_t, and rate-count overflow cases to the CLI contract. | The test thoroughly locks the configuration fix, but it is supporting evidence for the parser decision rather than a separate architectural change. |
| `3f2b3ae1d3f9` | `fix(heartbeat): 단조 시계와 토큰으로 응답 대기 상태 관리` | A | DEBUG, RESILIENCE, RISK | Moves deadlines to steady_clock and requires the exact outstanding heartbeat token before clearing PONG wait state. | This restores the liveness invariant against wall-clock jumps and unrelated or forged PONGs. The correction is non-trivial and high risk, but heartbeat is not the project's defining architecture. |
| `0c76aad19579` | `test(heartbeat): PONG 토큰과 시간 경계 검증` | A | VERIFICATION, RESILIENCE, RISK | Proves matching PONGs clear deadlines while a forged token leaves the connection subject to ping timeout. | This deterministically protects the non-obvious token and deadline invariant introduced by the heartbeat fix, providing stronger evidence than ordinary positive-path coverage. |
| `881e59734a9a` | `fix(connection): 송신 대기열 계산과 재시도 상태 보호` | S | DEBUG, EVENT_IO, RISK | Makes pending-limit arithmetic overflow-safe, injects send operations, validates impossible byte counts, and preserves offsets across retry outcomes. | This fixes severe, non-obvious correctness risks in the core partial-write state machine. It restores exact-once ordered delivery and bounded-queue invariants on which the whole relay depends. |
| `f34ab135c546` | `test(connection): 부분 송신과 대기열 경계 검증` | A | VERIFICATION, EVENT_IO, RISK | Adds scripted tests for exact limits, CRLF accounting, EINTR, EAGAIN, partial sends, zero sends, EPIPE, and invalid counts. | The deterministic syscall script directly verifies the transport invariants repaired by the preceding S-level fix and prevents regressions that broad TCP tests could miss. |
| `5dcd882f0763` | `fix(server): 연결 콜백 수명과 이벤트 등록 롤백 보장` | S | DEBUG, LIFECYCLE, RISK | Adds injectable event management, registration rollback, fd-based relookup after callbacks, update-failure disconnect, and non-throwing error reporting. | This solves a project-defining reentrancy and ownership problem: callbacks or event failures can remove the Connection currently being processed. The fix restores event-map consistency and prevents stale object access across the server. |
| `928594ec160c` | `test(server): 연결 제거와 이벤트 등록 실패 경로 검증` | A | VERIFICATION, LIFECYCLE, RISK | Uses a fake event manager to test add/update failures, callback-triggered disconnects, and queue-limit closure. | These deterministic tests lock the difficult failure paths and lifetime guarantees introduced by the server fix, materially increasing confidence at the ownership boundary. |
| `728aaabc4012` | `fix(app): 응답 실패 뒤 클라이언트 상태 다시 확인` | S | DEBUG, LIFECYCLE, RISK | Propagates send failure and re-resolves clients and channels after replies or broadcasts that may synchronously disconnect them. | This identifies response delivery as a synchronous lifecycle transition across Server and IrcApplication. The resulting revalidation rule is essential to avoiding stale pointers, iterators, false registration logs, and post-cleanup mutation. |
| `5edcafda8a4d` | `test(app): 작은 송신 한도에서 상태 정리 검증` | A | VERIFICATION, LIFECYCLE, RISK | Forces welcome-response enqueue failure with a one-byte limit and checks complete cleanup without a false registration event. | The test deterministically proves the application-side reentrant-send invariant and distinguishes contained client failure from server failure. |
| `de1dd0fc30d0` | `test(event): 160개 연결과 느린 수신자 처리 공정성 검증` | A | VERIFICATION, EVENT_IO, RISK | Exercises 160 simultaneous peers and verifies an unrelated connection progresses while one recipient stops reading under heavy output. | This provides meaningful real-process evidence that readiness registration and per-connection buffering isolate backpressure. It is a correctness stress test rather than a benchmark. |
| `d48e1f1f8c04` | `fix(app): 응답 실패 뒤 명령 처리를 중단` | A | DEBUG, LIFECYCLE, RISK | Stops LIST, NAMES, and compound MODE processing after failed output and avoids stale iterators and target state. | This closes the remaining continuation gap after the S-level application fix. It is significant lifecycle hardening but narrower than the cross-application rule established earlier. |
| `aee5edebe294` | `test(app): 연결 정리 뒤 모드 변경 중단 검증` | A | VERIFICATION, LIFECYCLE, CHANNEL_STATE | Injects sender removal during MODE +it and requires earlier +i to remain while later +t is not applied. | The test precisely locks the chosen non-transactional partial-command semantics and proves no further transition occurs after the actor and borrowed state are removed. |
| `416efc91e580` | `ci: Linux·macOS 회귀와 새니타이저 자동화` | A | BUILD, VERIFICATION, RISK | Runs the complete suite on Linux and macOS and repeats it under Linux ASan and UBSan. | This institutionalizes both event backends and the ownership-heavy failure suite across pushes and pull requests. It is significant reliability infrastructure, though not core runtime architecture. |
| `c32b2e2faf44` | `docs(project): 프로젝트 문서 정리` | C | - | Reorganizes and expands the final project, protocol, architecture, and development documentation. | The documentation is useful for readers, but it does not alter runtime behavior, tests, build logic, or an engineering invariant. |


# Development Threads

## Thread: Portable readiness and non-blocking transport

`8e8a3db87950` A — Defines the common readiness vocabulary and backend contract.
↓
`d3f74e2857da` B — Maps logical interest changes onto kqueue filters.
↓
`769cd3094f71` B — Converts kqueue notifications into common events.
↓
`2284a0e0d8bb` B — Maps logical interest changes onto epoll registrations.
↓
`f1320f357bca` B — Converts epoll notifications and socket errors into common events.
↓
`8864f253ac15` A — Defines the move-only Connection and its I/O outcome model.
↓
`d71a2549c0eb` A — Implements exactly-once descriptor ownership and move transfer.
↓
`9b601b69de4f` A — Establishes incremental IRC framing and the line-size boundary.
↓
`b00589d4b1b1` A — Implements the non-blocking receive state machine.
↓
`a10fe961e2b1` S — Implements persistent partial-write progress and graceful output draining.
↓
`e6492e27cc30` A — Defines Server ownership and the transport callback boundary.
↓
`4ad1227e5119` A — Integrates accepted descriptors into connection and event ownership.
↓
`378d5304828d` S — Makes the portable event loop operational.
↓
`625ffc924de8` A — Couples pending output to write readiness and close completion.
↓
`7a6bc7e1276a` A — Centralizes transport removal and disconnect notification.

**Significance**

This progression builds the server from a portable event vocabulary into an operational single-threaded reactor. The decisive choices are not the platform calls themselves, but the separation of native readiness from server semantics, the move-only per-connection state machine, persistent partial-write progress, and the authoritative server cleanup path. Later reliability work depends directly on these ownership and I/O contracts.

## Thread: Protocol boundary, identity, and registration

`a22bf6ddbd75` B — Introduces the structured IRC message representation.
↓
`c31a32b6cb24` A — Defines the line grammar and parameter parsing boundary.
↓
`aeb1e9b709b9` B — Adds canonical server messages, numerics, and hostmasks.
↓
`991b76b8d793` B — Stores descriptor-keyed registration state.
↓
`b47135c51cfc` A — Establishes the case-insensitive nickname index invariant.
↓
`0b5ae6aef328` S — Defines IrcApplication as the protocol/domain coordinator above Server.
↓
`2ed9331124bb` A — Connects transport lifecycle callbacks to client state, parsing, and cleanup.
↓
`035e1137e0dd` A — Centralizes the pre-registration command gate.
↓
`582317254e24` B — Adds password authorization state.
↓
`80a639321bad` B — Adds nickname validation and collision handling.
↓
`d9e420b570a0` B — Completes PASS/NICK/USER registration and welcome replies.
↓
`6b4a7738a285` A — Proves the integrated registration and command path over real TCP.

**Significance**

The sequence separates syntax, connection identity, and registration authorization rather than mixing them into the event loop. The application boundary and registration gate are the durable decisions; the individual registration commands are normal implementations within those decisions. The first smoke suite then verifies that framing, parsing, identity indexes, replies, and lifecycle transitions compose correctly.

## Thread: Channel authority, fan-out, and cleanup

`786ed5d839d9` A — Defines the authoritative Channel aggregate.
↓
`966f5663dbcc` B — Implements membership and operator state.
↓
`0d0d850f007d` B — Implements topic, invitation, mode, and name rules.
↓
`c1762e011fd6` B — Adds application-owned channel storage and command lookup.
↓
`46e2b7785bee` A — Introduces reusable, deduplicated channel and common-peer fan-out.
↓
`a147d6994d58` S — Coordinates nickname transitions, PART, QUIT, membership removal, and empty-channel erasure.
↓
`7ac793d3b695` B — Routes PRIVMSG through membership-authorized channel fan-out.
↓
`22e5f82bc693` A — Implements the central JOIN transition, invite-only admission, and first-member operator assignment.
↓
`0e601da7d2bc` B — Exposes and mutates +i and +t under operator authorization.
↓
`bce6933f69ab` B — Extends channel authority with +o and -o.

**Significance**

Channel functionality becomes reliable only when the same state model governs admission, fan-out, identity changes, explicit departures, kicks, and transport disconnects. The S-level cleanup commit is the decisive point: it makes client, nickname, and channel state converge after every termination path and prevents stale descriptors or duplicate peer notifications.

## Thread: Operational protections and controlled shutdown

`c4df44554866` B — Adds a registration deadline.
↓
`764361c52b2a` A — Adds idle heartbeat and ping-timeout state.
↓
`9e2b214f9227` B — Adds a per-client command-rate window.
↓
`d7d85e518177` A — Bounds each connection's unsent output and propagates queue failure.
↓
`adb49d9466e4` B — Bounds the number of live connections.
↓
`e05e35ca7da9` B — Makes connection, command, message, queue-drop, and rate-limit state queryable.
↓
`c34aa18f89af` B — Records structured lifecycle, protection, and aggregate metrics events.
↓
`dd04279c47fd` A — Replaces immediate signal-time stop with application shutdown and output draining.
↓
`e5e6c57db80d` A — Locks the resulting CLI, wire, timeout, rate, metric, shutdown, and log-order contracts.

**Significance**

The server evolves from functional protocol handling into an operable bounded process. Each protection addresses a distinct resource or liveness risk, while shutdown and the executable contract define how those protections appear at the public process boundary. The sequence also provides the failure signals later used to expose reentrant cleanup defects.

## Thread: Strict runtime configuration boundaries

`52b6f1ce8f0f` B — Establishes the initial RuntimeConfig parsing boundary.
↓
`e5e6c57db80d` A — Records exact CLI success and failure behavior as an executable contract.
↓
`b6c10bc51937` A — Replaces permissive C conversion with overflow-safe, target-width decimal parsing.
↓
`5d1286620994` B — Covers signs, whitespace, port narrowing, timeout bounds, size_t overflow, and rate-count overflow.

**Significance**

The public configuration surface initially relied on conversion functions whose accepted syntax and intermediate width did not exactly match the documented contract. The fix moves range checking into digit-by-digit accumulation against the destination type, and the follow-up tests preserve that cross-platform boundary without treating the test itself as a second architectural decision.

## Thread: Heartbeat liveness correctness

`764361c52b2a` A — Introduces heartbeat PING, PONG waiting, and timeout state.
↓
`d710f29f38a4` B — Adds automatic PONG behavior to the test peer.
↓
`f313e707474f` B — Verifies the initial positive PING/PONG flow.
↓
`3f2b3ae1d3f9` A — Moves timing to steady_clock and correlates PONG with the exact outstanding token.
↓
`0c76aad19579` A — Proves matching PONG clears the deadline and forged PONG does not.

**Significance**

The initial feature supplied liveness policy but relied on wall-clock time and accepted any PONG as evidence for the outstanding heartbeat. The correction restores the actual invariant: deadline calculation must be monotonic, and only the response corresponding to the server's current challenge can preserve the connection. The regression test makes the forged-response failure deterministic.

## Thread: Output-queue correctness under partial failure

`a10fe961e2b1` S — Establishes persistent partial-send state and exact-order delivery.
↓
`d7d85e518177` A — Adds a hard pending-output boundary and a visible queue-failure result.
↓
`881e59734a9a` S — Makes limit arithmetic overflow-safe and protects offset state across every send outcome.
↓
`f34ab135c546` A — Scripts partial sends, interruptions, backpressure, zero sends, terminal errors, and invalid return counts.

**Significance**

This thread shows a foundational mechanism being revisited after resource limits make its boundary conditions observable. The later fix is not a feature extension: it protects the exact-once output invariant against arithmetic wraparound, impossible syscall results, and retry-state corruption. Injecting the send operation turns those rare conditions into reproducible unit tests.

## Thread: Reentrant server and application cleanup

`7a6bc7e1276a` A — Establishes the original erase-before-disconnect-callback cleanup path.
↓
`5dcd882f0763` S — Handles callbacks that remove their own connection and rolls back event registration failures.
↓
`928594ec160c` A — Injects add/update failures and callback-driven removal to verify server lifetime safety.
↓
`728aaabc4012` S — Propagates output failure and requires application state to be re-resolved after any send that can disconnect.
↓
`5edcafda8a4d` A — Forces registration response failure and proves application cleanup and logging order.
↓
`d48e1f1f8c04` A — Stops LIST, NAMES, and compound MODE after response failure.
↓
`aee5edebe294` A — Proves a compound MODE retains completed work but performs no later transition after sender removal.

**Significance**

The difficult integration problem is that a seemingly local send or callback can synchronously remove the connection, client record, memberships, and possibly the channel currently referenced by the caller. The server fix restores descriptor and event-registry ownership; the application fix generalizes the rule to domain state. The follow-up commit and test refine the chosen semantics: earlier mutations are not rolled back transactionally, but command processing must stop immediately after the actor's lifecycle ends.

## Thread: Verification maturation and portability enforcement

`6b4a7738a285` A — Adds the first full real-TCP smoke flow.
↓
`e5e6c57db80d` A — Replaces substring-oriented confidence with exact CLI, frame, and shutdown contracts.
↓
`f34ab135c546` A — Adds deterministic Connection failure-state tests.
↓
`928594ec160c` A — Adds deterministic Server ownership and rollback tests.
↓
`5edcafda8a4d` A — Adds deterministic application cleanup verification.
↓
`de1dd0fc30d0` A — Adds 160-peer readiness and slow-receiver isolation evidence.
↓
`416efc91e580` A — Runs the complete suite on Linux and macOS and under ASan and UBSan.

**Significance**

Verification evolves from broad functional integration to exact public contracts, injected transport and event failures, application-lifetime tests, and real-process descriptor pressure. The CI commit then makes the same evidence repeatable for both readiness backends and under dynamic memory and undefined-behavior checks. No individual test proves absolute fairness or every failure class, but together they align the verification structure with the architecture's highest-risk boundaries.


# Most Important Commits

## feat(connection): 부분 송신 대기열 처리

Commit: `a10fe961e2b1`

Importance: S

Tags: CORE, EVENT_IO, LIFECYCLE

### Problem

A writable readiness notification does not guarantee that the kernel will accept an entire IRC frame. A correct single-threaded server must survive interruption, temporary backpressure, short sends, and peer termination without duplicating bytes, dropping suffixes, blocking the loop, or closing before already queued responses have a chance to leave.

### Decision

Represent output progress as a persistent byte buffer plus `writeOffset_`. Send only the unsent suffix, retry `EINTR`, stop normally on `EAGAIN` or `EWOULDBLOCK`, retain the offset for the next writable event, and store close requests as state so the queue can drain. Normalize line output to exactly one CRLF while preserving a raw-byte path for transport-level frames.

### Why it mattered

This is not an optimization around an otherwise complete design; it is the core correctness mechanism that makes non-blocking output possible. Every reply, private message, channel fan-out, heartbeat, and shutdown error ultimately depends on its ordered, exact-once progress model.

### What changed

`Connection::flushPending()` gained a non-blocking send loop and explicit write results, queued bytes became persistent across events, completed buffers reset or compacted, and `queueLine()` acquired canonical IRC framing. Send-side `SIGPIPE` was suppressed where available so peer closure remains a normal error path.

### Why this is important for understanding the project

The server is best understood as a collection of persistent state machines rather than one-command-per-syscall code. This commit supplies the transport state machine that later queue limits, event-interest management, partial-send tests, and lifecycle fixes refine.

## feat(server): 준비 이벤트 루프 구동

Commit: `378d5304828d`

Importance: S

Tags: CORE, ARCH, EVENT_IO

### Problem

The listener, portable event manager, and per-connection state existed as separate components but still required one authoritative runtime to register descriptors, wait for readiness, distinguish listener from client events, dispatch work, and stop without processing an already-obsolete event batch.

### Decision

Make `start()`, `run()`, and `pollOnce()` the server lifecycle. Register the listener through the abstract event manager, dispatch listener readiness separately from client readiness by descriptor identity, reject polling before startup, and check stop state between returned events. Keep `pollOnce()` public so tests and the executable use the same dispatch path.

### Why it mattered

This commit turns the portability and Connection abstractions into the actual execution model. It determines how all later protocol behavior obtains progress and how callbacks, shutdown, and deterministic tests enter the system.

### What changed

The server gained backend creation, listener registration, the main readiness wait, listener-error handling, accept dispatch, client-event delegation, run-loop termination, and centralized cleanup after the loop exits.

### Why this is important for understanding the project

The project's central architectural claim is a single-process, single-event-loop IRC server on both Linux and macOS. This commit is the point at which that claim becomes operational rather than merely represented by interfaces.

## feat(app): IRC 동작 조율 계약 정의

Commit: `0b5ae6aef328`

Importance: S

Tags: CORE, ARCH, INTEGRATION

### Problem

Socket readiness and IRC semantics have different ownership rules. If registration, nickname state, channel state, command dispatch, replies, and cleanup were embedded directly in `Server`, transport failures and protocol transitions would become inseparable and difficult to test or reason about.

### Decision

Introduce `IrcApplication` as the protocol coordinator whose public surface exactly matches the server's connect, line, and disconnect callbacks. Keep descriptor ownership, buffering, and readiness in `Server`; keep password policy, client and channel state, command handlers, replies, and protocol-aware cleanup in the application.

### Why it mattered

This boundary determines the finished architecture and all later failure propagation. It permits transport tests without IRC state, application tests with an injected server/event backend, and explicit reasoning about when a transport operation can invalidate application-owned objects.

### What changed

The commit defined application-owned dependencies and state, callback entry points, registration and connection-control handler declarations, reply and prefix helpers, close requests, and client-removal responsibilities.

### Why this is important for understanding the project

Later S-level fixes are comprehensible only through this split: `Server` may synchronously remove a connection while `IrcApplication` still holds client or channel state derived from it. The boundary both creates that integration risk and makes the correct repair possible.

## feat(channel): 구성원 정리와 식별자 변경 방송

Commit: `a147d6994d58`

Importance: S

Tags: CORE, CHANNEL_STATE, LIFECYCLE

### Problem

One client identity participates simultaneously in a descriptor registry, a nickname index, and zero or more channel aggregates. Nickname changes, PART, QUIT, and transport disconnects must notify the right peers and then remove every stale reference without invalidating the containers being traversed or sending duplicate notifications through multiple shared channels.

### Decision

Centralize explicit channel departure, snapshot channel names and client identity before mutation, compute a deduplicated set of common peers, broadcast transitions while the old state is still meaningful, remove membership and operator state from every channel, erase empty channels, and finally erase the client and nickname index. Use the old hostmask when broadcasting NICK.

### Why it mattered

This commit establishes the authoritative shared-state cleanup invariant. A server that relays messages correctly on the happy path but leaves disconnected descriptors in channels is not correct: later fan-out, authorization, NAMES results, and operator state all become unsafe or wrong.

### What changed

The application gained `partChannel()`, `partAllChannels()`, empty-channel erasure, QUIT peer collection, full disconnect cleanup, and registered NICK broadcasts to common peers and the changing client.

### Why this is important for understanding the project

Channel commands are not isolated handlers; they operate on a graph of shared state whose lifecycle must track the underlying connection. This commit is the clearest expression of that relationship before later reentrant-send failures make it still more demanding.

## fix(connection): 송신 대기열 계산과 재시도 상태 보호

Commit: `881e59734a9a`

Importance: S

Tags: DEBUG, EVENT_IO, RISK

### Problem

The initial pending-output limit used addition that could wrap, and the partial-send loop implicitly trusted every positive send count. Rare outcomes—arithmetic overflow, zero-byte sends, interrupted calls, repeated backpressure, terminal errors, or a count larger than the requested suffix—could corrupt queue accounting or advance the offset beyond valid data.

### Decision

Compute capacity through subtraction-based overflow-safe checks, count line payload and CRLF separately, and reject already-invalid pending state. Inject the send operation so every syscall outcome is testable, validate that a positive result never exceeds the requested size, and preserve queued bytes and offsets on zero, retryable, and terminal failure paths.

### Why it mattered

This restores the exact-once, in-order output invariant at the most fundamental transport layer. The defect class is severe and non-obvious: broad TCP tests usually cannot force these return sequences, while any corruption affects every protocol response and fan-out path.

### What changed

`ConnectionLimits.hpp` introduced safe limit arithmetic, `Connection` accepted a send operation, move operations preserved it, `flushPending()` guarded impossible counts, and line queuing performed two overflow-safe capacity checks.

### Why this is important for understanding the project

The commit demonstrates how the project moved from plausible non-blocking code to an explicitly verified state machine. It also motivates the scripted unit-test architecture added immediately afterward.

## fix(server): 연결 콜백 수명과 이벤트 등록 롤백 보장

Commit: `5dcd882f0763`

Importance: S

Tags: DEBUG, LIFECYCLE, RISK

### Problem

A connect or line callback can call back into `Server::disconnect()` and erase the Connection whose reference the server is currently using. Separately, failures while adding or updating event interest could leave the authoritative connection map and kernel event registry out of sync. Error handlers could also throw while the server was already handling another failure.

### Decision

Allow event-manager injection, insert accepted connections into the authoritative map before exposing them, roll that insertion back if event registration fails, and identify work by descriptor rather than by a retained object reference. Re-find the Connection after every callback or write operation, make interest refresh descriptor-based and failure-reporting, disconnect on update failure, and contain exceptions from the error handler.

### Why it mattered

This is a root-cause repair of the server's ownership model under reentrancy and partial failure. Without it, normal callback freedom could become use-after-free behavior, and an event registration failure could strand a descriptor in only one of the two authoritative structures.

### What changed

`Server` gained an injectable-backend constructor, startup and accept rollback, fd-based `refreshInterest()`, post-callback relookup, update-failure cleanup, and non-throwing error reporting.

### Why this is important for understanding the project

The fix reveals that single-threaded code is not automatically lifetime-safe. Reentrant callbacks can mutate ownership synchronously, so descriptor identity—not a previously acquired reference—must be the stable handle across callback boundaries.

## fix(app): 응답 실패 뒤 클라이언트 상태 다시 확인

Commit: `728aaabc4012`

Importance: S

Tags: DEBUG, LIFECYCLE, RISK

### Problem

After pending-output limits and event-update failure handling were added, `sendTo()` could synchronously disconnect a client. The disconnect callback then removed client records, nickname indexes, memberships, and possibly entire channels before the command handler resumed, leaving cached pointers, references, and iterators invalid.

### Decision

Make raw and numeric send helpers return success. In multi-step handlers, copy stable identifiers before sending, stop on failure, or re-find clients and channels before any later read or mutation. Apply the rule to JOIN, PART, KICK, NICK, INVITE, registration replies, topic and NAMES replies, and heartbeat state ordering. Record registration and heartbeat metrics only after the corresponding frames are accepted.

### Why it mattered

This commit establishes a cross-layer invariant that did not exist in the initial architecture: output delivery is a potential lifecycle transition, not an infallible side effect. Violating that rule can produce use-after-free behavior, iterator invalidation, false logs, or mutations after the actor has ceased to exist.

### What changed

Response helpers changed from `void` to `bool`; handlers gained early returns, stable-value copies, client-existence checks, and channel re-resolution; NAMES preserved its 353/366 ordering; registration logged only after all welcome numerics succeeded; heartbeat state was committed before its potentially destructive send.

### Why this is important for understanding the project

This is the key integration lesson of the completed history. The transport layer's correct failure behavior becomes an application-layer invalidation event, and every command sequence must be written around that fact.

## fix(heartbeat): 단조 시계와 토큰으로 응답 대기 상태 관리

Commit: `3f2b3ae1d3f9`

Importance: A

Tags: DEBUG, RESILIENCE, RISK

### Problem

Wall-clock time can move independently of elapsed duration, and the initial PONG handler cleared heartbeat wait state for any PONG. A client could therefore survive the wrong challenge, or timeout behavior could be distorted by clock adjustments.

### Decision

Represent connection, activity, ping, and rate-window times with `steady_clock` time points. Generate a unique serial heartbeat token, store it in the client state, and clear the pending deadline only when exactly one PONG parameter matches that token.

### Why it mattered

The correction restores the intended liveness contract rather than merely changing an implementation detail. It prevents unrelated or forged responses from satisfying the server's challenge and makes timeout calculation depend on elapsed time.

### What changed

Client time fields and command windows moved to monotonic types, timeout comparisons used `chrono::seconds`, heartbeat generation stored an outstanding token, and PONG validation became exact.

### Why this is important for understanding the project

It is the clearest example outside the transport core of a small state-machine assumption producing a meaningful reliability defect. The follow-up test demonstrates how to verify both the accepted transition and the rejected forged transition.

## test(irc): 실행 조건과 오류 동작 계약 검증

Commit: `e5e6c57db80d`

Importance: A

Tags: VERIFICATION, IRC_PROTOCOL, RISK

### Problem

The smoke client primarily searched for substrings. It did not fully pin CLI diagnostics, exact frame order and CRLF termination, hostmasks, numeric parameter positions, metric key order, shutdown delivery, connection closure, or structured log ordering. Subtle externally visible regressions could therefore pass broad functional checks.

### Decision

Create an exact contract runner for CLI failure cases, IRC frames, registration, channel behavior, rate limiting, heartbeat, metrics, shutdown ERROR delivery, process termination, and lifecycle-log order. Upgrade the peer helper with exact-next-frame, exact-match, regex, CRLF, close-wait, and hostmask support, and run the contract from the smoke harness against the same live process.

### Why it mattered

This materially changes what the repository can claim about its public executable surface. It also creates the evidence base that exposes strict numeric parsing, heartbeat correlation, and shutdown-order issues in later commits.

### What changed

The commit added `tests/irc_contract.py`, hardened `tools/irc_smoke_client.py`, disabled Python bytecode artifacts for the harness, invoked the contract after smoke behavior, signaled the server, waited for its exit, and optionally emitted a normalized manifest.

### Why this is important for understanding the project

The completed server is defined not only by internal classes but by CLI, TCP wire, stdout/stderr, logs, and exit state. This commit makes those external contracts explicit and shows how the project's verification matured from demonstration to specification.
