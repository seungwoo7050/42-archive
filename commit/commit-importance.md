# Project Importance Profile
Project: signal-message-bus (`c/minitalk`)
Domain: Same-host POSIX interprocess communication using standard signals plus Unix-domain datagrams
Primary Purpose: Transfer NUL-terminated message byte streams from short-lived clients to a long-lived server by encoding data bits as signals while using a validated control channel for session acquisition and per-bit acknowledgement.
Resolved Commit Scope: The complete independent linear history of the branch, 55 commits from root `913c23efe38a` through tip `1f3af5851600`, ordered oldest to newest. The history contains no merge commits; both documentation-only commits are included in classification even though they were excluded from `commit-bodies.md`.

## Core Technical Areas
- MSB-first bit encoding over `SIGUSR1` and `SIGUSR2`, NUL message framing, and byte assembly.
- Session acquisition, single-owner enforcement, abandonment recovery, and owner-liveness determination.
- Unix datagram `ACQUIRE`, `READY`, and sequence `ACK` records, source/field correlation, absolute timeouts, and malformed-response rejection.
- Async-signal-safe capture through a nonblocking self-pipe and authoritative state transitions in a `pselect` event loop.
- Stdout completion as part of protocol commit, including interrupted or partial writes, `EPIPE`, recovery delimiters, and false-ACK prevention.
- Runtime directory and socket-path ownership, stale endpoint handling, descriptor limits, inherited signal masks, shutdown, and cleanup.
- Process-level, adversarial-response, high-descriptor, fault-injected output, and self-pipe-loss verification.

## Core Architecture
- The client validates a PID and server endpoint, binds a private response datagram socket, sends a nonce-bearing `ACQUIRE`, waits for correlated `READY`, sends each payload and final NUL bit through signals, and advances only after a matching sequence ACK.
- The server owns a Unix datagram socket and a self-pipe. Signal handlers preserve `errno` and enqueue fixed `(sender, signal)` events only; the normal event loop validates session requests, authorizes owners, assembles bytes, commits stdout, and sends responses.
- `t_mt_request` and `t_mt_response` are same-host ABI records rather than portable serialized messages. Source path, size, magic, PID, kind, token, and status together define acceptance.
- A per-UID private runtime directory contains predictable client and server socket paths. Cleanup is conditioned on actual ownership, and polling is explicitly limited to descriptors below `FD_SETSIZE`.
- The test architecture uses real processes and sockets plus specialized senders, forged response servers, stale-path wrappers, inherited-mask wrappers, unreaped-child helpers, and deterministic write/event fault injection.

## Critical Invariants
- Only the client that completed acquisition may mutate the server's bit, byte, sequence, and output state; competing clients receive `BUSY` or have their signals ignored.
- At most one data bit is logically in flight. A client advances only after a response from the expected server endpoint whose exact frame and sequence fields match the outstanding transition.
- Invalid, forged, oversized, or uncorrelated datagrams never complete a transition and never reset the original monotonic deadline.
- The signal handler performs only async-signal-safe event delivery and preserves `errno`; authoritative protocol state and socket/output work remain in normal execution context.
- A dropped self-pipe event is fatal because one missing bit destroys stream ordering; the server must fail-stop rather than continue with unobservable state loss.
- A completed payload byte or delimiter is acknowledged only after the corresponding stdout write completes. Partial writes and `EINTR` are finished; unrecoverable output failure suppresses success ACK and exits through cleanup.
- Session reassignment may occur only after the previous owner is unavailable and any already-visible partial line is successfully delimited. Protocol liveness requires a usable response endpoint, not merely a retained PID entry.
- The process removes only socket paths it owns or same-UID stale sockets it is explicitly allowed to replace; ordinary files and unowned entries are preserved.
- Data and termination signals are deliverable despite inherited masks, and asynchronous termination is routed through the event loop so descriptors and paths are cleaned consistently.
- Every descriptor placed in `fd_set` is below `FD_SETSIZE`; otherwise startup fails before undefined behavior can occur.

## Major Engineering Difficulties
- Building reliable ordered transport from standard signals, which do not preserve arbitrary multiplicity, without assuming a fixed timing gap.
- Coordinating two channels: signals carry data while datagrams reserve ownership and prove completion of specific state transitions.
- Correlating responses strongly enough that stale, forged, malformed, or flood traffic cannot advance or indefinitely delay the client.
- Separating signal-delivery context from the sequential owner/bit/byte/output state machine while detecting unrecoverable self-pipe loss.
- Defining the commit boundary between externally visible stdout and ACK success when either side can fail after partial progress.
- Recovering sessions across normal exit, dead owners, vanished response paths, PID reuse risk, and exited-but-unreaped children.
- Managing predictable Unix socket paths, inherited descriptor tables, inherited masks, and cleanup across startup failure and signal-driven shutdown.

## Practical Engineering Areas
- Monotonic absolute deadlines, exact datagram-size checks, and exhaustive response-field validation.
- Strict PID parsing, process existence checks, same-UID socket checks, private runtime permissions, and stale-entry policy.
- All-or-failure descriptor writes, `SIGPIPE` policy, error propagation, and endpoint rollback.
- Deterministic process orchestration and cleanup in shell tests, including STOP/CONT, termination status, and unreaped children.
- Fault injection for stdout and handler event writes, plus real high-descriptor and inherited-mask environments.
- Clear documentation of same-host ABI, no-retry/no-dedup limits, lease absence, and non-exactly-once output/ACK semantics.

## S-level Criteria
- Establishes the core signal-data mechanism or the authoritative session/ACK state architecture.
- Establishes the async-signal-safe self-pipe responsibility boundary that defines the finished server.
- Establishes or restores the protocol commit rule linking visible output and acknowledgement success.
- Identifies and fixes a severe non-obvious owner-lifecycle bug at the resource-liveness root cause.

## A-level Criteria
- Introduces important correlation, validation, timeout, lifecycle, endpoint, failure, or performance behavior that materially strengthens the core protocol.
- Completes a major architectural migration or provides strong adversarial/fault evidence for a critical invariant.
- Restores a significant resource, polling, signal-mask, or session-recovery guarantee without redefining the entire system.

## Typical B-level Work
- Normal implementation or tests within an established protocol, scaffolding, helper migration, localized parsing, and ordinary end-to-end or edge-case coverage.
- Supporting resource setup or preparatory refactoring whose decisive architecture is established in another commit.

## Typical C-level Work
- Documentation-only commits, mechanically adjusted tests, and local refactors with negligible behavioral or structural consequence.

## Project-specific Tags
SIGNAL_DATA — zero/one signal encoding, bit ordering, framing, delivery, and initial pacing or acknowledgement behavior.
SESSION — acquisition, exclusive ownership, abandonment, reassignment, and owner availability.
RESPONSE — Unix datagram wire records, source/field correlation, sequence ACKs, deadlines, and rejection behavior.
SELF_PIPE — async-signal-safe event capture, event-loop authority, overflow, and event-loss policy.
OUTPUT_COMMIT — complete descriptor writes and the rule that stdout success precedes acknowledgement.
ENDPOINT — per-UID runtime paths, Unix socket ownership, stale entries, descriptor setup, and cleanup.
PROCESS_LIFECYCLE — PID state, inherited masks, process interruption, exit, unreaped children, and signal-driven shutdown.

# Commit Classification
| Commit | Subject | Importance | Tags | Summary | Why |
| --- | --- | --- | --- | --- | --- |
| `913c23efe38a` | `docs(project): 초기 개발 규약 정리` | C | - | Adds the initial README scope, executable roles, layout, and warning policy. | This is documentation-only project framing with no effect on the binaries, protocol, build graph, or tests, so it has minor engineering significance. |
| `bf8163cdd7dd` | `feat(io): 기본 출력 유틸리티 추가` | B | PRACTICAL | Adds shared byte-length, string-output, and PID-output helpers for both executables. | The helpers establish useful common structure, but their initial single-call `write` behavior is routine and is later replaced by the stronger all-or-failure output contract. |
| `fb801689407e` | `build(project): server와 client 실행 골격 추가` | B | ARCH, PRACTICAL | Creates separate server and client binaries, strict compilation, generated-file cleanup, and minimal entry points. | This defines the deployment roles and build boundary, but it contains no message transport or protocol mechanism; it is competent scaffolding within a straightforward architecture. |
| `8e5371c7b85e` | `feat(server): 시그널 비트를 바이트로 조립` | S | ARCH, CORE, SIGNAL_DATA | Makes the server decode `SIGUSR1` and `SIGUSR2` into MSB-first bytes through `SA_SIGINFO` handlers. | This is the receiver-side core mechanism that gives the project its identity as a signal-based message transport. Without it, the central data path and byte-state model cannot be explained. |
| `89637d63b56f` | `feat(client): 메시지 바이트를 시그널로 전송` | A | CORE, SIGNAL_DATA | Parses a target PID and serializes message bytes into zero/one signals with provisional pacing. | It implements the sender half of the core data path and fixes bit ordering, but reliability, framing, ownership, and acknowledgement are still provisional or absent, so it is significant rather than project-defining on its own. |
| `1ce49791d35f` | `feat(protocol): NUL 바이트로 메시지 종료 표시` | A | CORE, SIGNAL_DATA, SESSION | Appends a NUL frame and makes the server translate it into newline output and message-state reset. | This establishes the durable message-framing boundary used by the finished protocol, including empty messages. It is an important protocol decision, though smaller than session and acknowledgement architecture. |
| `78de95b3cacb` | `feat(protocol): 비트 처리마다 ACK 전송` | A | CORE, SIGNAL_DATA, RISK | Adds stop-and-wait signal acknowledgement with blocking-before-send and `sigsuspend` waiting. | The commit addresses standard-signal coalescing and closes an ACK arrival race, establishing the conceptual one-bit-at-a-time rule. The signal-based response path is later replaced, so this is a major intermediate mechanism rather than the final architecture. |
| `765efe7b75c9` | `feat(client): ACK 대기 시간 초과 처리` | A | RISK, PROCESS_LIFECYCLE, PRACTICAL | Bounds acknowledgement waiting and distinguishes timeout from other send failures. | A protocol participant must not block forever when the peer is alive but unresponsive. The timeout establishes an important failure boundary that survives later response-channel redesign. |
| `10a7211969bf` | `fix(server): 활성 세션에 다른 송신자 거부` | A | SESSION, RISK | Tracks an active sender and rejects signals from competing PIDs until the NUL terminator completes the session. | This restores the single-owner invariant needed to keep two clients from interleaving bits into one byte stream. The ownership acquisition mechanism is later redesigned explicitly, so the commit is significant but not the final session architecture. |
| `342aea9ce9a8` | `fix(client): ACK 이후 시그널 전송 간격 안정화` | B | SIGNAL_DATA, PRACTICAL | Extends the timeout and retains a short delay after each signal acknowledgement. | This is a localized scheduling workaround for the initial signal-response design. It improves stability but does not establish a durable protocol rule and is later removed after correlated datagram ACKs. |
| `750be27caf95` | `test(smoke): 프로세스 간 메시지 전달 검증` | B | TEST, INTEGRATION | Adds the first real server/client process test with PID readiness, message delivery, diagnostics, and cleanup. | The test proves basic integration and process hygiene, but it covers the normal path of mechanisms already introduced rather than adding a new invariant. |
| `59810e532712` | `test(smoke): 빈 문자열과 장문 전송 검증` | B | TEST, EDGE | Extends end-to-end coverage to empty, UTF-8, long, sequential, and final messages. | This broadens observable behavior and catches framing or persistence errors, but it is ordinary edge coverage within the existing protocol. |
| `e30f20e29b1d` | `test(client): 잘못된 PID와 ACK 시간 초과 검증` | B | TEST, EDGE, PROCESS_LIFECYCLE | Tests invalid target rejection and timeout against a live process that never acknowledges. | The cases verify expected client failure behavior under the initial response model, but they do not establish a new architectural boundary. |
| `bc337552961a` | `fix(server): 종료된 송신자의 세션 복구` | A | SESSION, PROCESS_LIFECYCLE, RISK | Resets abandoned bit and line state when the recorded owner has exited and closes partial output with a newline. | This is meaningful lifecycle recovery: a dead sender must not permanently monopolize or contaminate the server state. The later endpoint-aware fix refines the liveness test, but this commit first establishes recovery semantics. |
| `559412e4ec1f` | `fix(client): 상속된 마스크에서도 응답 시그널 수신` | B | PROCESS_LIFECYCLE, DEBUG | Normalizes the temporary wait mask so inherited blockage cannot suppress ACK, NACK, or alarm signals. | The fix correctly addresses an `exec`-inherited signal-mask edge, but it belongs to the signal-ACK implementation that is later removed and has limited lasting architectural impact. |
| `bdccf91f5a44` | `test(server): 중단·경쟁 송신자 세션 검증` | A | TEST, SESSION, RISK | Exercises abandoned partial sessions, live-owner competition, recovery, and expected partial-line delimiters. | The suite materially validates the ownership and recovery state machine across several transitions that normal clients cannot create deterministically. It provides strong evidence for a critical invariant. |
| `f822a2097fc3` | `test(client): 상속된 시그널 마스크에서 전송 검증` | B | TEST, PROCESS_LIFECYCLE | Executes the client with response signals inherited as blocked and requires a successful real exchange. | This is precise regression coverage for the preceding mask correction, but the tested response mechanism is temporary and the commit does not alter the production design. |
| `4f17de94e025` | `fix(client): 인터럽트 뒤 남은 전송 간격 유지` | B | SIGNAL_DATA, PRACTICAL | Uses restartable `nanosleep` so `EINTR` cannot shorten the provisional post-ACK gap. | The correction is technically sound but limited to a timing workaround that disappears once the protocol no longer depends on fixed delays. |
| `ebed06775b92` | `feat(protocol): 응답 메시지 wire 형식 정의` | A | ARCH, RESPONSE | Defines shared acquisition, readiness, and ACK datagram records with magic, kind, nonce or token, status, and PID fields. | This creates the control-plane contract required for correlated responses and explicit sessions. It is a significant architectural foundation, but the server and client state transitions are implemented in later commits. |
| `2c37cb592d05` | `feat(runtime): 안전한 응답 endpoint 경로 생성` | A | ARCH, ENDPOINT, RISK | Creates a private per-UID runtime directory and validated role/PID-derived Unix socket paths. | The commit establishes the filesystem namespace, ownership, permission, and path-length boundary for the datagram channel. Those choices affect security, cleanup, and every later response operation. |
| `25780b881ee8` | `feat(client): datagram 응답 endpoint 수명주기 관리` | B | ENDPOINT, PROCESS_LIFECYCLE | Creates, configures, binds, and cleans up the client's nonblocking close-on-exec datagram endpoint. | This is necessary supporting implementation of the endpoint architecture and applies the path policy competently, but the decisive protocol semantics are established elsewhere. |
| `32390dcdfc1b` | `feat(server): datagram 응답 endpoint 수명주기 관리` | B | ENDPOINT, PROCESS_LIFECYCLE | Creates, binds, records, and cleans up the server's nonblocking close-on-exec datagram endpoint. | Like the client counterpart, this is necessary resource plumbing within the chosen control-channel architecture rather than an independent project-defining decision. |
| `caf2feec4971` | `feat(server): 획득 요청을 검증해 세션 소유권 예약` | S | ARCH, SESSION, CORE | Validates exact `ACQUIRE` datagrams, assigns one session owner, returns `READY` or `BUSY`, and rolls back failed readiness responses. | This establishes the finished protocol's explicit ownership transition before any data signal is accepted. It replaces implicit first-bit ownership with a validated and recoverable state-machine boundary central to the whole system. |
| `f8e8444c5ded` | `feat(client): READY 응답을 출처와 nonce로 상관 검증` | A | RESPONSE, RISK, INTEGRATION | Generates a nonce, sends `ACQUIRE`, and accepts `READY` only from the expected endpoint with matching size, identity fields, status, and absolute deadline. | This is significant correlation and trust-boundary engineering that prevents unrelated or malformed local datagrams from granting a session. It completes the client side of the S-level acquisition architecture. |
| `4234233ebd30` | `feat(protocol): 비트 ACK를 sequence 응답으로 큐잉` | S | ARCH, RESPONSE, CORE | Assigns sequence numbers to accepted bits and queues datagram ACK work out of the signal handler through a pipe. | This introduces the final protocol's correlated per-bit control plane and begins moving response transmission into normal execution context. Later commits remove the remaining signal-ACK path, but this is the decisive architectural pivot. |
| `d3eacbbfeadc` | `feat(client): 비트 ACK를 sequence로 상관 검증` | A | RESPONSE, RISK | Makes per-bit success depend on a source-validated datagram ACK with the exact current sequence and monotonic deadline. | This completes the client-side semantics of correlated acknowledgements and removes reliance on an unqualified signal response. It is significant integration with the server's new control plane, but the underlying architecture was introduced in the previous commit. |
| `e631be24b916` | `test(protocol): session sender에 명시적 세션 획득 적용` | B | TEST, SESSION | Updates the adversarial session helper to bind a response endpoint and perform explicit acquisition. | The helper must follow the new protocol to keep lifecycle tests meaningful, but the change is supporting test migration rather than new production engineering. |
| `746772ea92b7` | `test(protocol): session sender를 sequence ACK로 전환` | B | TEST, RESPONSE | Migrates the session helper from signal acknowledgements to correlated sequence ACK datagrams. | This keeps specialized tests aligned with the production response model, but it repeats an established pattern in test code. |
| `c3c3ee363a68` | `test(client): datagram 전환 뒤 상속 mask 경계 조정` | C | TEST | Changes the mask wrapper to block data signals instead of obsolete response signals. | This is a narrow mechanical adjustment to a test environment after the response architecture changed; it adds little independent engineering significance. |
| `aeb1b00867f4` | `refactor(protocol): 이전 signal ACK 경로 제거` | A | ARCH, RESPONSE, REFACTOR | Removes ACK/NACK signal handlers, alarm state, wait masks, implicit first-bit ownership, and test-only signal response code. | The commit completes the migration to explicit acquisition and datagram-only acknowledgements, eliminating two competing response mechanisms and clarifying one authoritative protocol. It is a significant structural consolidation rather than a new core mechanism. |
| `b361ef9745ff` | `test(protocol): 응답 출처와 token 검증` | A | TEST, RESPONSE, RISK | Injects forged-source, wrong-token, bad-magic, and wrong-server responses before valid `READY` and ACK frames. | The test materially proves that correlation is conjunctive rather than field-by-field best effort. It protects the response boundary against realistic local confusion and spoofing within the project's stated trust limits. |
| `ecea755f617a` | `refactor(server): 응답 전송 인자 경계 단순화` | C | REFACTOR | Changes the response helper to receive PID, kind, token, and status directly. | This is a local interface simplification with no behavioral, ownership, or architectural effect; it is minor relative to the surrounding protocol changes. |
| `a7d994b0a4b6` | `refactor(server): 비트 상태 전이 로직 추출` | B | REFACTOR, SELF_PIPE | Extracts bit-state processing behind a fixed event record and asserts that the record fits within `PIPE_BUF`. | The change is an important preparatory refactor for atomic self-pipe delivery, but the handler still performs the transition at this point; the decisive context boundary arrives next. |
| `22363f83ff25` | `refactor(server): signal 처리를 self-pipe event loop로 제한` | S | ARCH, SELF_PIPE, RISK | Reduces the signal handler to an errno-preserving self-pipe write and moves authorization, bit state, output, and ACK sending into the main event loop. | This establishes the finished server architecture and restores an async-signal-safe responsibility boundary. It centralizes authoritative state transitions in one sequential context and fail-stops on event loss. |
| `788b812748c0` | `fix(client): 표현 가능한 PID 범위 전체 허용` | B | EDGE, PRACTICAL | Replaces the arbitrary six-digit cap with overflow-safe parsing through `INT_MAX` and a representability check for `pid_t`. | This is a correct input-boundary fix with useful portability value, but it does not affect the protocol architecture or core runtime state. |
| `778cafb4d84d` | `test(client): PID 문자열 범위 검증` | B | TEST, EDGE | Adds focused accepted and rejected PID parsing boundaries, including overflow and null arguments. | The tests lock down the corrected parser contract, but they are routine unit coverage for a localized validation function. |
| `826dd34c378f` | `fix(io): 중단·부분 쓰기를 끝까지 처리` | A | OUTPUT_COMMIT, PRACTICAL, RISK | Introduces `mt_write_all` with `EINTR` retry, short-write progress, and zero-write failure semantics. | Reliable descriptor output is a prerequisite for treating server stdout as committed protocol state. This is significant practical failure-path engineering, although the protocol consequence is established in the next commit. |
| `db2004556d8b` | `fix(server): stdout 실패 뒤 ACK 전송 차단` | S | CORE, OUTPUT_COMMIT, RISK | Makes PID, payload, terminator, and recovery output all-or-failure and suppresses the triggering ACK when stdout cannot be completed. | This establishes the critical commit boundary between external output and protocol success. Without it, the client can be told a bit committed even though the server did not publish the corresponding byte or delimiter. |
| `9aa80e047514` | `test(server): 부분 쓰기와 출력 실패 검증` | A | TEST, OUTPUT_COMMIT, RISK | Adds deterministic short-write, `EINTR`, zero-write, payload, newline, and `EPIPE` injection for the real server. | The suite directly validates the output-before-ACK invariant, startup rollback, endpoint cleanup, and client failure behavior across otherwise difficult-to-reproduce write transitions. |
| `1487a861046e` | `perf(protocol): 검증된 ACK 뒤 고정 지연 제거` | A | PERF, RESPONSE | Removes the fixed per-bit sleep after sequence-correlated datagram acknowledgement. | A matching ACK is now a causal ordering proof, so the timing delay only adds substantial latency. Removing it is a meaningful performance consequence of the redesigned protocol, not a speculative micro-optimization. |
| `622d80020fb2` | `fix(client): bind한 응답 경로만 정리` | A | ENDPOINT, RISK | Tracks successful bind ownership and unlinks the client path only when this process actually created it. | The small change restores a critical filesystem ownership invariant: computing a predictable name must not authorize deletion of an entry the client never bound. Its risk is disproportionate to its size. |
| `ffd3647a1518` | `test(runtime): stale 응답 endpoint 처리 검증` | A | TEST, ENDPOINT, RISK | Tests replaceable stale sockets, protected regular files, private runtime permissions, and rejection of unrelated processes or stale server identities. | This suite materially verifies the endpoint trust and cleanup boundary across real PID-derived paths and process execution, including the distinction between recoverable residue and objects the program must not remove. |
| `e304c63bee3e` | `fix(server): 종료 시그널을 이벤트 루프 정리 경로로 처리` | A | SELF_PIPE, PROCESS_LIFECYCLE | Routes `SIGHUP`, `SIGINT`, and `SIGTERM` through the self-pipe loop and exits via normal cleanup with signal-derived status. | This keeps descriptor and filesystem cleanup out of the handler and gives asynchronous shutdown the same owned-resource path as normal returns. It is important lifecycle engineering within the established event architecture. |
| `8a8694bb8177` | `test(runtime): 중단된 client와 server 종료 정리 검증` | B | TEST, PROCESS_LIFECYCLE | Pauses and resumes a long-running client, then verifies client cleanup and server `SIGTERM` cleanup and status. | The scenario provides useful end-to-end lifecycle evidence, but it validates already-defined session and shutdown behavior rather than introducing a new invariant. |
| `1ed2acbaa353` | `test(response): oversized 응답과 invalid flood 검증` | A | TEST, RESPONSE, RISK | Rejects oversized datagrams and verifies that a flood of wrong-token frames cannot extend the absolute timeout. | The commit protects exact wire-size compatibility and a subtle liveness invariant: invalid traffic may be ignored, but it cannot restart the transition budget and create an unbounded wait. |
| `e56e8cc87315` | `test(session): 데이터 없는 활성 예약 경쟁 검증` | A | TEST, SESSION | Holds a live acquired session without sending data and verifies `BUSY`, no output, and later recovery. | This proves that ownership begins at successful acquisition rather than the first bit. It protects a central session-state transition that ordinary message tests could miss. |
| `081a882d7fa3` | `test(server): 회수 줄바꿈 출력 실패 검증` | A | TEST, OUTPUT_COMMIT, SESSION | Forces failure of the newline used to delimit a dead owner's partial output during reassignment. | The test establishes that recovery bookkeeping cannot commit unless the visible session boundary is written. It extends the output transaction invariant into a difficult ownership-recovery path. |
| `4c535ac8657e` | `test(server): self-pipe 이벤트 손실 시 fail-stop 검증` | A | TEST, SELF_PIPE, RISK | Injects `EAGAIN` into the handler's first event write and requires server failure, no success ACK, and endpoint cleanup. | A lost bit event cannot be reconstructed without corrupting all later framing. The test locks down the deliberate fail-stop policy of the S-level self-pipe architecture. |
| `4e1c84bfacfc` | `fix(runtime): select 범위를 벗어난 descriptor 거부` | A | EDGE, PRACTICAL, RISK | Rejects client/server sockets and the self-pipe read fd when they cannot be represented by `fd_set`. | This small guard converts a potential out-of-bounds `FD_SET` memory fault into controlled initialization failure. It restores a concrete runtime safety invariant at the polling boundary. |
| `1de95310195d` | `test(runtime): 높은 descriptor 번호의 안전한 실패 검증` | A | TEST, EDGE, RISK | Executes client and server after filling the descriptor table to the `FD_SETSIZE` boundary. | The test reproduces the environmental condition with real descriptors and proves failure occurs before polling or protocol traffic, materially validating the memory-safety guard. |
| `686b0d2a14e3` | `fix(server): 상속된 이벤트 시그널 마스크 해제` | A | PROCESS_LIFECYCLE, RISK | Explicitly unblocks data and termination signals after installing handlers. | A server can otherwise publish readiness yet receive neither messages nor shutdown events because signal masks survive `exec`. The fix makes the executable establish both disposition and deliverability regardless of launcher state. |
| `72424469474c` | `test(server): 차단된 시그널 마스크 상속 뒤 메시지 검증` | B | TEST, PROCESS_LIFECYCLE | Launches the server with all event signals blocked and verifies message delivery, termination status, and endpoint cleanup. | This is exact and valuable regression coverage for the inherited-mask fix, but it does not add a new production mechanism or boundary. |
| `1e3da4580733` | `fix(server): 응답 경로가 사라진 세션 소유자 회수` | S | SESSION, PROCESS_LIFECYCLE, DEBUG | Defines owner availability by both process presence and a valid client response endpoint, not `kill(pid, 0)` alone. | This identifies and fixes a severe non-obvious lifecycle bug: an exited but unreaped process can retain a PID while being unable to receive ACKs. The correction changes the meaning of protocol liveness and restores session progress at its root cause. |
| `a481bfabb7b5` | `test(session): 종료 송신자 회수 전 새 세션 복구 검증` | A | TEST, SESSION, PROCESS_LIFECYCLE | Creates an exited but deliberately unreaped partial-session owner and verifies endpoint-based recovery before the parent reaps it. | The helper isolates the exact state that defeats PID-only probing and provides strong regression evidence for the new owner-availability invariant, including correct partial-line delimiting. |
| `1f3af5851600` | `docs(project): 실행 계약과 아키텍처 정리` | C | - | Documents the final dual-channel protocol, event loop, resource lifecycle, guarantees, tests, and limitations. | The documentation is extensive and technically valuable, but it is documentation-only and does not alter runtime behavior, protocol state, build outputs, or verification; the rubric therefore classifies it as minor. |

# Development Threads
## Thread: From timing-dependent signal delivery to correlated sequence ACKs
`89637d63b56f` A — Sends serialized bits with a provisional fixed delay.
↓
`78de95b3cacb` A — Introduces stop-and-wait signal ACKs to prevent standard-signal coalescing.
↓
`765efe7b75c9` A — Bounds the wait so a missing response cannot suspend the client forever.
↓
`342aea9ce9a8` B — Adds a post-ACK timing gap as a stability workaround.
↓
`4f17de94e025` B — Preserves the full gap across `EINTR`.
↓
`ebed06775b92` A — Defines datagram request/response records for a correlated control plane.
↓
`4234233ebd30` S — Assigns bit sequences and queues datagram ACK transmission outside direct signal response.
↓
`d3eacbbfeadc` A — Makes the client accept only the matching sequence ACK from the expected server.
↓
`aeb1b00867f4` A — Removes the obsolete signal ACK path and implicit first-bit ownership.
↓
`1487a861046e` A — Removes the fixed gap because a validated ACK now proves causal progress.

**Significance**
The history exposes a real architectural evolution rather than a set of unrelated networking changes. Initial pacing reduces but cannot prove that standard signals will not coalesce. Signal ACKs add causal flow control but overload the same signal namespace and provide weak correlation. The datagram control plane introduces explicit identity and sequence, after which the old signal response and timing delay can be deleted. The final throughput improvement is therefore evidence of a stronger protocol, not merely faster sleeping.

## Thread: Session ownership from implicit first-bit capture to resource-aware recovery
`10a7211969bf` A — Adds one active sender and rejects competing data signals.
↓
`bc337552961a` A — Recovers when the owner PID disappears and delimits visible partial output.
↓
`bdccf91f5a44` A — Exercises abandoned, partial, live-owner, and recovery transitions.
↓
`caf2feec4971` S — Moves ownership to a validated `ACQUIRE`/`READY` transition before data.
↓
`f8e8444c5ded` A — Correlates readiness with nonce, source endpoint, server PID, and deadline.
↓
`e56e8cc87315` A — Proves an acquired but data-idle owner is still exclusive.
↓
`1e3da4580733` S — Defines owner availability by a usable response endpoint as well as process state.
↓
`a481bfabb7b5` A — Reproduces the exited-but-unreaped owner that defeats PID-only liveness checks.

**Significance**
The ownership model becomes progressively more precise. First-bit capture prevents interleaving but cannot reserve before data, so explicit acquisition moves authority to the control channel. Recovery initially equates PID existence with protocol availability, which fails for zombies. The final correction recognizes that an owner must still possess the response resource required to continue the protocol, turning resource liveness into part of session state rather than an incidental cleanup detail.

## Thread: Async signal handling to a fail-stop self-pipe event loop
`a7d994b0a4b6` B — Defines a minimal fixed event record and separates bit transition logic conceptually.
↓
`22363f83ff25` S — Restricts the handler to self-pipe delivery and moves all authoritative work to the main loop.
↓
`4c535ac8657e` A — Verifies that event loss is detected and causes fail-stop cleanup rather than silent corruption.
↓
`e304c63bee3e` A — Routes termination signals through the same event and cleanup path.
↓
`686b0d2a14e3` A — Unblocks event signals that may have been inherited as masked across `exec`.
↓
`72424469474c` B — Proves message handling and termination still work under the inherited-mask condition.

**Significance**
The crucial boundary is not merely using a pipe; it is assigning one execution context sole authority over session, bit, output, and ACK state. The handler produces ordered facts and preserves `errno`, while the event loop performs all complex work. Because one missing event means one missing bit, overflow cannot be treated as a recoverable queue hiccup. Shutdown and mask handling are then integrated into the same architecture instead of creating special unsafe handler paths.

## Thread: Output becomes part of protocol commit
`826dd34c378f` A — Creates an all-or-failure write primitive for interruption, short progress, and zero writes.
↓
`db2004556d8b` S — Sends ACK only after the relevant payload, terminator, recovery delimiter, or PID output succeeds.
↓
`9aa80e047514` A — Injects deterministic write failures and verifies no false success, startup residue, or lost cleanup.
↓
`081a882d7fa3` A — Extends the same invariant to the recovery newline required before owner reassignment.

**Significance**
Protocol state and stdout are coupled external effects. Completing the in-memory bit transition before checking output can falsely acknowledge data the server never published. The write primitive provides a reliable local operation, the S-level fix defines the actual commit order, and the fault tests cover both ordinary message output and the less obvious delimiter written during abandoned-session recovery.

## Thread: Endpoint ownership and bounded polling
`2c37cb592d05` A — Establishes a private per-UID namespace and validated role/PID paths.
↓
`25780b881ee8` B — Applies the endpoint lifecycle to the client.
↓
`32390dcdfc1b` B — Applies the endpoint lifecycle to the server.
↓
`622d80020fb2` A — Prevents cleanup from unlinking a path the client never successfully bound.
↓
`ffd3647a1518` A — Tests stale sockets, protected files, private permissions, and unrelated identities.
↓
`4e1c84bfacfc` A — Rejects response and self-pipe descriptors outside `fd_set` capacity.
↓
`1de95310195d` A — Reproduces the high-descriptor environment with real inherited descriptors.

**Significance**
Predictable Unix socket names create both a lifecycle obligation and an authority boundary. The project first defines which paths are valid and which stale objects may be replaced, then discovers that naming a path does not imply ownership of it. The same runtime layer must also respect the fixed representation used by `select`; otherwise a valid descriptor number can become memory corruption. The tests exercise these conditions through real filesystem objects, processes, and descriptor allocation rather than through nominal integer checks.

## Thread: Response correlation remains bounded under hostile or stale input
`ebed06775b92` A — Defines fields capable of identifying a request and a particular bit transition.
↓
`f8e8444c5ded` A — Enforces exact size, source, PID, kind, nonce, status, and an absolute readiness deadline.
↓
`d3eacbbfeadc` A — Applies the same correlation rule to sequence ACKs.
↓
`b361ef9745ff` A — Injects forged-source and mismatched-field responses before the valid frame.
↓
`1ed2acbaa353` A — Adds oversized frames and sustained wrong-token traffic without allowing deadline extension.

**Significance**
The control channel is reliable only if a response proves which peer and transition it belongs to. No single field is sufficient, and ignored traffic must not become a liveness attack by resetting a relative timeout. The thread progresses from representational capacity, through production validation, to adversarial evidence that exact framing and one monotonic deadline are preserved even under continuous invalid input.

# Most Important Commits
## feat(server): 시그널 비트를 바이트로 조립
Commit: `8e5371c7b85e`
Importance: S
Tags: ARCH, CORE, SIGNAL_DATA

### Problem
The project's data channel has only two standard signals and no payload field. The server therefore needs a deterministic state machine that converts signal identity and arrival order into message bytes without relying on text APIs or shared memory.

### Decision
`SIGUSR1` and `SIGUSR2` represent binary zero and one. An `SA_SIGINFO` handler receives the sender metadata, shifts an accumulator MSB-first, and emits a byte after eight accepted signals.

### Why it mattered
This is the first implementation of the project's defining transport idea. Every later framing, ownership, acknowledgement, and self-pipe change preserves the same bit-to-byte semantics even as responsibility moves out of the handler.

### What changed
The server gains signal constants, per-byte accumulation state, bit counting, signal-handler installation, and byte output after a complete eight-bit frame.

### Why this is important for understanding the project
The rest of the history addresses reliability and lifecycle around this mechanism. Understanding the byte assembly rule makes later sequence numbers, ACKs, owner checks, and event records concrete rather than abstract protocol machinery.

## feat(server): 획득 요청을 검증해 세션 소유권 예약
Commit: `caf2feec4971`
Importance: S
Tags: ARCH, SESSION, CORE

### Problem
Assigning ownership on the first data signal cannot reserve the server before transmission, cannot reject a competitor through a strongly correlated response, and couples authorization to an asynchronous channel that carries no request metadata.

### Decision
The server accepts an exact `ACQUIRE` datagram only when magic, kind, client PID, source path, endpoint validity, and process availability agree. It records one owner, returns nonce-correlated `READY` or `BUSY`, and rolls back a newly assigned owner if readiness cannot be sent.

### Why it mattered
This moves session authority to an explicit control-plane transition and makes ownership precede data. The decision defines when exclusivity starts, how competition is reported, and how a failed control response avoids leaving a phantom reservation.

### What changed
The server's datagram loop gains request validation, prior-owner recovery, assignment, busy status, nonce echoing, and rollback of unsuccessful readiness delivery.

### Why this is important for understanding the project
The final protocol is not simply a stream of signals. It is a session state machine in which validated datagrams authorize which process may affect the signal-decoded state. This commit establishes that architecture.

## feat(protocol): 비트 ACK를 sequence 응답으로 큐잉
Commit: `4234233ebd30`
Importance: S
Tags: ARCH, RESPONSE, CORE

### Problem
A generic acknowledgement signal cannot identify which bit it confirms, cannot carry status, and forces response behavior back into signal-handling concerns. Reliable progress needs a response tied to one accepted transition and sent from normal execution context.

### Decision
The server assigns a monotonically increasing sequence to each accepted bit and constructs an ACK request containing the owner PID, response kind, token, and status. It queues that work through a pipe so datagram transmission occurs outside direct signal response; queue loss is recorded rather than ignored.

### Why it mattered
This is the decisive pivot from timing and signal identity toward a correlated control plane. Although the old signal ACK temporarily coexists, sequence becomes the authoritative proof later consumed by the client and retained in the finished design.

### What changed
Server session state gains a sequence counter and response queue, while the client starts waiting for a matching datagram after each signal. Subsequent commits remove the remaining signal-response path and fixed timing gap.

### Why this is important for understanding the project
The project solves standard-signal reliability not by making signals queueable, but by wrapping each signal transition in a separate acknowledged protocol step. This commit introduces the identifier and execution boundary that make that possible.

## refactor(server): signal 처리를 self-pipe event loop로 제한
Commit: `22363f83ff25`
Importance: S
Tags: ARCH, SELF_PIPE, RISK

### Problem
Mutating session state, assembling bytes, writing stdout, and sending responses from a signal handler mixes asynchronous delivery with complex operations and leaves correctness dependent on what is safe or reentrant in that context.

### Decision
The handler preserves `errno` and writes only a fixed `(sender, signal)` record to a nonblocking self-pipe. The `pselect` loop reads complete events and becomes the sole owner of authorization, bit and byte state, output, sequence advancement, and ACK transmission. Any event-write loss is marked as fatal.

### Why it mattered
This establishes the final responsibility boundary of the server. It converts asynchronous signals into ordered event input and keeps the authoritative protocol state machine sequential and testable in normal execution context.

### What changed
State variables no longer need signal-safe scalar treatment, the response pipe is replaced by an event pipe, bit processing moves into the loop, and overflow becomes a fail-stop condition rather than a hidden dropped transition.

### Why this is important for understanding the project
The server should be understood as an event loop fed by signals, not as a large signal handler. This commit explains the final concurrency model, the cleanup strategy, and why later shutdown, mask, and event-loss work belongs at the event boundary.

## fix(server): stdout 실패 뒤 ACK 전송 차단
Commit: `db2004556d8b`
Importance: S
Tags: CORE, OUTPUT_COMMIT, RISK

### Problem
A bit can complete a payload byte or delimiter. If the server advances state and sends ACK even though stdout only partially writes or fails, the client observes success while the externally visible message is missing or malformed.

### Decision
All server output uses an all-or-failure writer, `SIGPIPE` is converted into an error return, and write failure propagates out of the event loop before the triggering ACK. The rule covers PID publication, payload bytes, message-ending newlines, and recovery newlines.

### Why it mattered
This defines the protocol's commit order: visible output must succeed before acknowledgement can claim the state transition completed. It prevents false success across one of the most important partial-failure boundaries in the system.

### What changed
Output helpers return failure, session reset and byte flushing become fallible, the event loop stops on output error, and startup reports PID-publication failure without leaving the response endpoint behind.

### Why this is important for understanding the project
The project does not provide an exactly-once distributed transaction, but it does enforce one critical local guarantee. This commit shows where protocol success is anchored and why ACK handling cannot be reasoned about independently of stdout.

## fix(server): 응답 경로가 사라진 세션 소유자 회수
Commit: `1e3da4580733`
Importance: S
Tags: SESSION, PROCESS_LIFECYCLE, DEBUG

### Problem
`kill(owner, 0)` reports success for an exited child that remains unreaped. Such a process still has a PID entry but has already run cleanup, removed its response socket, and can no longer receive ACKs, so a PID-only check can leave the server permanently busy.

### Decision
Owner availability requires both a viable process identity and a valid same-UID client response socket at the expected path. A competing acquisition may delimit partial output and reset the session when either required resource is gone.

### Why it mattered
The fix identifies protocol liveness at the correct layer: an owner is available only while it retains the resources needed to continue the protocol. This is a severe, non-obvious lifecycle correction rather than a superficial timeout workaround.

### What changed
A dedicated availability check combines PID probing with endpoint derivation and socket validation, and acquisition recovery uses that result instead of `ESRCH` alone.

### Why this is important for understanding the project
This commit connects process lifecycle, filesystem cleanup, and session ownership. It explains why the final server can recover during the interval between child exit and parent reaping and illustrates the broader lesson that kernel identity presence is not equivalent to application-level liveness.
