## feat(io): 기본 출력 유틸리티 추가
Small output helpers provide the shared textual operations needed by both executables without introducing a broader library dependency. `mt_strlen` determines byte length, `mt_putstr_fd` writes a string to a selected descriptor, and `mt_putnbr_fd` renders a `pid_t` value through a local digit buffer. Centralizing these operations keeps diagnostics and PID publication consistent across the process boundary.

At this historical stage the helpers issue ordinary `write` calls and do not yet guarantee completion after interruption or a partial write. Their value is therefore structural rather than a final reliability guarantee: they establish one place where descriptor-output policy can later be strengthened, while keeping client and server logic focused on protocol state instead of repeated formatting code.

## build(project): server와 client 실행 골격 추가
The project gains separate `server` and `client` executables, a strict warning-as-error build, common include and source boundaries, and cleanup rules for generated objects and binaries. The initial server publishes its PID and remains alive, while the client validates its command-line shape, establishing the externally visible roles before message transport is implemented.

This split is the fundamental deployment boundary of the program. The server is the long-lived state owner and output sink; each client is a short-lived sender addressed by PID. Building both from shared utilities but distinct entry points makes protocol responsibilities explicit and allows subsequent commits to evolve either side without collapsing them into one test-only process.

## feat(server): 시그널 비트를 바이트로 조립
The server installs `SA_SIGINFO` handlers for the two user signals and interprets them as binary zero and one. Each accepted signal shifts the partial byte left, incorporates the new bit, and increments a bit count; after eight signals the completed byte is written and the accumulator is reset. The order is most-significant bit first, matching the representation later used by the sender.

This is the first receive-side state machine. Its correctness depends on preserving the pair `(current_byte, received_bits)` across asynchronous deliveries and resetting both at an exact eight-bit boundary. At this point byte assembly and output still occur inside signal-handler context, so the change establishes functionality but not yet the final async-signal-safe responsibility boundary.

## feat(client): 메시지 바이트를 시그널로 전송
The client parses and validates the target PID, checks that a process is addressable, and serializes every message byte from its most-significant bit to its least-significant bit. A zero bit is represented by one user signal and a one bit by the other, with a short delay between sends to reduce the risk that standard signals are coalesced before the server handles them.

The implementation treats the command-line message as a byte sequence rather than interpreting an encoding, so transport correctness is defined by preserving bit order. The pacing is only a provisional flow-control mechanism: it reduces sender speed but does not prove that the receiver processed a particular signal. That limitation motivates the later acknowledgement protocol, but this commit establishes the compatible transmit representation.

## feat(protocol): NUL 바이트로 메시지 종료 표시
A separate all-zero byte is appended after the message payload, and the server interprets that byte as the message terminator rather than as printable content. On receipt it emits a newline and resets message-level state. This gives the bit stream explicit framing, allowing the receiver to determine when one client invocation has completed without knowing the original argument length.

NUL framing also makes an empty string well-defined: it consists of the terminator byte alone and produces one empty output line. The trade-off is inherent in the command-line and C-string model—embedded NUL bytes cannot be represented as payload. Within that model, the terminator establishes a simple invariant: every successful transmission ends at an eight-bit boundary with exactly one framing byte.

## feat(protocol): 비트 처리마다 ACK 전송
The server now acknowledges each processed bit, and the client blocks the acknowledgement signal before sending and waits with `sigsuspend` until the handler records completion. Blocking before the send closes the race in which an ACK could arrive between the signal transmission and entry into the wait. The next data bit is not sent until the preceding bit has been acknowledged.

This converts timing-based pacing into a stop-and-wait protocol. Standard signals do not form a reliable counted queue, so allowing several identical bit signals to be outstanding could collapse occurrences and corrupt byte alignment. Per-bit acknowledgement limits the protocol to one in-flight data signal and makes receiver progress, rather than elapsed time alone, the condition for advancing the sender's bit cursor.

## feat(client): ACK 대기 시간 초과 처리
Acknowledgement waiting is bounded by an alarm-driven timeout instead of allowing the client to suspend indefinitely. The client distinguishes an acknowledged bit from timeout and other send failures, cancels the alarm after the wait, and reports failure without advancing to the next bit when the server does not respond.

A finite wait is a liveness contract: process existence does not imply protocol participation, and a stopped, incompatible, or unresponsive target must not hold the client forever. The timeout does not make delivery reliable or retransmit a lost bit; it makes uncertainty explicit and terminates the current transmission rather than allowing an unbounded blocked process.

## fix(server): 활성 세션에 다른 송신자 거부
The server records the PID that begins a message and accepts subsequent bit signals only from that sender until the NUL terminator completes the session. Signals from another live sender are rejected rather than being shifted into the active byte, and the client receives a negative response instead of treating the rejected bit as acknowledged.

This restores a fundamental serialization invariant. The byte accumulator has only one partial-byte state, so interleaving senders would combine unrelated bits and make both messages undecodable. Binding the state to one owner PID turns message receipt into an explicit session: ownership begins with the first accepted data and ends only at the framing byte, while competing clients fail rather than corrupting the current stream.

## fix(client): ACK 이후 시그널 전송 간격 안정화
The client retains a short inter-signal gap even after receiving an acknowledgement and extends the acknowledgement deadline to tolerate scheduling variation. ACK proves that the server handled the previous bit, but a conservative pause gives the process and signal-delivery machinery time to leave the previous handler cycle before another user signal is generated.

This is a pragmatic stabilization within the early signal-only protocol, not an additional correctness identity. The sender still relies on the ACK to serialize bits; the delay merely reduces sensitivity to implementation timing and host load. Keeping the timeout and pacing constants explicit also makes their different roles visible: one bounds failure detection, while the other moderates successful transmission rate.

## test(smoke): 프로세스 간 메시지 전달 검증
The first end-to-end test launches the real server as a separate process, waits for its published PID, invokes the real client with a message, and compares the server's output and both processes' diagnostics. Cleanup logic terminates and reaps spawned processes so a failing assertion does not leave protocol participants running.

This verifies integration properties that isolated functions cannot establish: the build produces executable peers, PID publication is usable for addressing, signal permissions and handlers work across a process boundary, byte order agrees on both sides, the NUL frame closes the message, and the client reaches successful completion only after its ACK sequence.

## test(smoke): 빈 문자열과 장문 전송 검증
The smoke suite expands to empty input, UTF-8 text treated as raw bytes, a long message spanning many signal cycles, and multiple messages sent sequentially to the same server. Expected output is constructed byte-for-byte, including the newline generated by each terminating NUL.

These cases exercise framing and state reset rather than only a single short ASCII path. Empty input proves that framing is independent of payload length, multi-byte text proves that transport does not reinterpret encoding, the long case stresses repeated bit/ACK transitions, and sequential clients verify that completion releases the prior session before the next message begins.

## test(client): 잘못된 PID와 ACK 시간 초과 검증
Client failure tests distinguish syntactically or semantically invalid PIDs from a live process that is not a minitalk server. Invalid targets must fail with the designated diagnostic, while a deliberately nonresponsive process triggers the acknowledgement timeout and remains alive after the client exits.

The distinction matters because `kill(pid, 0)` establishes only that a process can be addressed, not that it implements the expected signal protocol. The test locks down finite failure behavior without allowing the client to kill or otherwise alter an unrelated target. It also verifies that timeout is reported as a protocol completion failure rather than being mistaken for successful delivery.

## fix(server): 종료된 송신자의 세션 복구
When the recorded session owner no longer exists, the server now abandons that owner's partial byte and message state so another sender can proceed. Liveness is checked with `kill(owner, 0)` and `ESRCH`; if a partial output line had already begun, a newline closes it before the owner and bit counters are cleared. Failure to send an ACK to a vanished owner also triggers recovery.

Without this transition, a client that exits before the NUL frame could reserve the single accumulator indefinitely. Resetting every coupled field—owner PID, current byte, bit count, and line state—prevents the next client from inheriting an unfinished prefix. Closing an already visible partial line keeps output from silently concatenating bytes from different sessions.

## fix(client): 상속된 마스크에서도 응답 시그널 수신
The client now constructs its `sigsuspend` mask so acknowledgement, rejection, and alarm signals are explicitly unblocked during the wait, regardless of the process mask inherited across `fork` and `exec`. Installing a handler is not sufficient when the corresponding signal remains blocked at the process level.

This change makes protocol progress independent of launcher policy. The client still preserves unrelated inherited mask settings, but it normalizes the specific signals required for its own wait state. The responsibility boundary is therefore explicit: the executable must establish the delivery conditions of signals on which its correctness depends rather than assuming a conventional parent environment.

## test(server): 중단·경쟁 송신자 세션 검증
A dedicated sender exercises server ownership outside the normal client path. The tests abandon a session after one bit, abandon it after a complete byte plus a partial next byte, hold a live session while another client competes, and then verify recovery after the owner exits. Expected output includes the newline used to close an abandoned partial line.

These scenarios validate the coupled session state machine, not merely message content. They show that a live owner remains exclusive, a dead owner cannot block later work, partial byte state is discarded, already emitted bytes are visibly delimited, and a recovery transition returns the server to the same clean state used for a newly started message.

## test(client): 상속된 시그널 마스크에서 전송 검증
A wrapper blocks the protocol response signals before executing the client, reproducing an environment that ordinary shell invocation would not expose. The client must still complete a real message exchange, demonstrating that its wait mask normalization overrides inherited blockage for the signals it requires.

The test protects a process-lifecycle boundary: signal masks survive `exec`, whereas handlers generally do not. A future refactor that installs handlers but forgets to unblock the relevant signals would hang or time out only under particular launchers. Running the actual executable through the wrapper turns that otherwise hidden assumption into a repeatable regression case.

## fix(client): 인터럽트 뒤 남은 전송 간격 유지
The post-ACK delay now loops on `nanosleep` with the returned remaining duration when the sleep is interrupted. `EINTR` therefore pauses and resumes the same logical gap instead of treating a partial sleep as if the entire pacing interval had elapsed; other sleep failures remain errors.

This preserves the early protocol's intended timing under unrelated signal activity. Restarting with the remainder avoids both under-sleeping and repeatedly requesting the full interval. The change is small but establishes the correct POSIX partial-operation pattern: interruption reports incomplete progress, and the caller must continue from the kernel-provided remainder when the duration itself is part of the protocol policy.

## feat(protocol): 응답 메시지 wire 형식 정의
The shared header introduces explicit request and response records for a Unix datagram control channel. Magic values and message kinds identify acquisition, readiness, and acknowledgement traffic; client PID and nonce fields correlate a session request, while server PID, status, and token fields identify the corresponding response or bit sequence.

This separates control-plane identity from the one-bit data signal. Fixed-width correlation fields make validation rules expressible and allow a response to carry more information than an undifferentiated ACK signal. The records are sent as local in-memory structures, so the contract is intentionally host-local and assumes matching ABI, alignment, and byte order between the two executables rather than defining a portable serialized network protocol.

## feat(runtime): 안전한 응답 endpoint 경로 생성
Response endpoints are placed in a per-UID runtime directory under `/tmp`, with ownership and permission checks that reject directories accessible to group or other users. A single helper constructs role-qualified server or client socket paths, validates the role and positive PID, and refuses results that do not fit the Unix-domain path buffer.

Centralizing path construction creates one authoritative mapping from process identity to endpoint name. The private directory and same-UID checks reduce accidental cross-user interference, while type and length validation prevent unsafe path truncation. These checks are an integrity boundary for cooperative local peers, not peer authentication against another process running under the same UID.

## feat(client): datagram 응답 endpoint 수명주기 관리
The client creates a nonblocking, close-on-exec Unix datagram socket, computes its PID-derived path, removes an existing entry only when it is a same-UID socket, binds the endpoint, and registers cleanup that closes the descriptor and removes the path. Initialization failures unwind the resources acquired so far rather than leaving an open socket indefinitely.

This gives replies a concrete destination whose lifetime matches one client invocation. Nonblocking mode prevents unexpected response operations from suspending the process, and `FD_CLOEXEC` avoids leaking the channel through a later exec. The path cleanup policy distinguishes stale sockets from regular files or foreign-owned entries, although the later history further narrows unlink authority to paths that were actually bound by this process.

## feat(server): datagram 응답 endpoint 수명주기 관리
The server gains its own nonblocking, close-on-exec Unix datagram endpoint at the PID-derived server path. Startup removes only a stale same-UID socket, binds the new endpoint, records whether binding succeeded, and registers cleanup that closes descriptors and unlinks the path on normal process exit or initialization rollback.

The endpoint becomes the long-lived control-plane entry point for session requests. Its lifecycle must be stricter than the data signals because the filesystem path persists beyond a crashed process. Tracking partial initialization and the bound state prevents routine failures from leaking descriptors or blindly deleting unrelated filesystem objects, while the shared path helper keeps client and server naming assumptions consistent.

## feat(server): 획득 요청을 검증해 세션 소유권 예약
The server begins processing `ACQUIRE` datagrams before accepting data bits. It requires an exact request size, valid magic and kind, a viable client PID, and a source socket path that matches the PID-derived client endpoint. A free server records that PID as owner; a competing live client receives `BUSY`; an unavailable prior owner is reset before reassignment. `READY` echoes the request nonce, and a newly reserved session is rolled back if the response cannot be sent.

Ownership now starts at an explicit control-plane transition rather than implicitly at the first signal. This removes a race in which competing first bits could decide the session and lets the client know whether it has exclusive use before transmitting payload. Validating both record fields and source address binds the reservation to the endpoint that sent the request.

## feat(client): READY 응답을 출처와 nonce로 상관 검증
The client generates a nonzero nonce from `/dev/urandom`, sends an `ACQUIRE` request, and waits until a monotonic absolute deadline for a matching `READY`. A candidate response is accepted only when its datagram size, source socket path, magic, server PID, kind, token, and status agree with the outstanding request. Unrelated or malformed datagrams are ignored rather than completing the session.

Nonce and source validation prevent stale control traffic or another local endpoint's message from being mistaken for the current reservation. Using one absolute `CLOCK_MONOTONIC` deadline means interruptions and discarded frames consume the existing budget instead of restarting it. Session establishment therefore has both correlation and bounded liveness before the first data signal is sent.

## feat(protocol): 비트 ACK를 sequence 응답으로 큐잉
Each accepted bit is assigned the current sequence number, and the server queues a response request containing the client PID, ACK kind, token, and status. The signal handler still performs the bit transition at this stage, but datagram transmission is deferred through a pipe so `sendto` occurs in normal execution context. A pipe-write failure sets an overflow flag rather than silently claiming that the response was queued.

This is a transitional move from signal acknowledgements to correlated control messages. Sequence numbers give every bit a distinct identity, allowing the client to reject a delayed ACK from another position. Deferring socket I/O also begins separating asynchronous signal capture from operations that are not appropriate in a handler, while retaining the existing signal ACK path until both peers and tests have migrated.

## feat(client): 비트 ACK를 sequence로 상관 검증
Per-bit success is now determined by a datagram ACK whose token equals the current sequence. Before sending the signal, the client validates the server endpoint and establishes a monotonic deadline; after `kill`, it waits for a response matching the server path, server PID, ACK kind, sequence, magic, size, and success status. The sequence advances only after that exact acknowledgement is accepted.

This removes ambiguity from a generic response signal. A stale or forged frame cannot authorize the next bit merely because it arrived at the right time, and timeout remains attached to one specific in-flight bit. The data channel is still the pair of Unix signals, but its progress is now controlled by a structured, correlated response channel.

## test(protocol): session sender에 명시적 세션 획득 적용
The abnormal-session test sender is upgraded to create its own datagram endpoint and perform the same `ACQUIRE`/`READY` exchange as the production client before sending a lone bit, a partial message, or holding a session. It validates response size, source path, server PID, kind, token, and status instead of bypassing the newly established ownership boundary.

Keeping the test peer protocol-conformant is necessary for meaningful ownership tests. Failures observed after reservation can now be attributed to data-session lifecycle rather than to an unrecognized first signal. The helper still creates deliberately incomplete sessions, but it does so only after proving that the server explicitly granted ownership.

## test(protocol): session sender를 sequence ACK로 전환
The session test sender replaces its signal-based ACK wait with datagram responses correlated by an incrementing sequence number. Lone-bit and partial-message modes now advance their token exactly as the production client does, and each signal is followed by validation of the corresponding ACK before the next bit is emitted.

This aligns failure-path tests with the authoritative protocol. Without the migration, the helper could pass because of the obsolete response channel while production clients depended on sequence ACKs. Exercising the same ordering and correlation rules ensures that session-abandonment and competition tests continue to validate server state rather than a legacy acknowledgement mechanism.

## test(client): datagram 전환 뒤 상속 mask 경계 조정
The inherited-mask wrapper is updated after acknowledgements move to Unix datagrams. It no longer blocks the obsolete ACK, NACK, and alarm signals; instead it executes the client with the data signals blocked, documenting that the client only sends those signals and does not require their delivery to make progress.

This is a test-boundary correction rather than a new production mechanism. It prevents the regression suite from continuing to assert requirements belonging to the removed signal-response design and keeps inherited-mask coverage aligned with the actual roles of the two channels.

## refactor(protocol): 이전 signal ACK 경로 제거
The obsolete signal acknowledgement machinery is removed from the client, server, shared constants, and session test sender. ACK/NACK handlers, alarm flags, signal-mask preparation, and signal responses disappear; bit completion now depends exclusively on validated datagram responses. The server also stops implicitly assigning ownership on the first data signal and ignores bits from any PID that did not complete explicit acquisition.

Removing the parallel path gives the protocol one source of truth. A bit cannot be considered successful by one response mechanism while the other reports failure, and session ownership cannot bypass the control-plane reservation. If a successful datagram response cannot be sent to the current owner, the server resets that session rather than leaving an owner whose progress can no longer be acknowledged.

## test(protocol): 응답 출처와 token 검증
A purpose-built response server injects invalid frames before the valid `READY` and first bit ACK. It sends responses from a forged socket, with the wrong token, invalid magic, and an incorrect server PID, then supplies the correctly correlated frame. The real client must ignore every invalid candidate and complete only when all identity fields and the source endpoint agree.

This verifies that response matching is conjunctive rather than based on arrival order or one convenient field. A datagram from the expected UID or with the expected kind is insufficient by itself; source path, peer PID, magic, kind, and nonce or sequence collectively identify the outstanding transition. The test therefore protects both session acquisition and per-bit progress from stale or unrelated local traffic.

## refactor(server): 응답 전송 인자 경계 단순화
The server's response helper now accepts the destination PID, response kind, token, and status directly instead of requiring an internal queue-record structure. The helper remains responsible for deriving and validating the client endpoint, constructing the wire response, and sending the complete datagram.

This separates two representations with different purposes. A transient event or session decision need not masquerade as the wire-level response object merely to call the sender. Passing the semantic fields makes call sites state exactly what is being acknowledged and keeps wire construction centralized, reducing coupling between event-loop bookkeeping and the public protocol record.

## refactor(server): 비트 상태 전이 로직 추출
Bit processing is extracted into a function that consumes an explicit `(sender, signal)` event. The event structure records only the information needed to authorize and apply one data transition, and a compile-time assertion requires it to fit within `PIPE_BUF`, the size bound later needed for an atomic self-pipe write.

The signal handler still invokes the extracted logic at this intermediate stage, so observable behavior remains unchanged. The structural decision is nevertheless important: sender validation, byte assembly, sequence advancement, output, and ACK queuing become a normal function over an event value rather than code intrinsically tied to `siginfo_t`. That boundary enables the next change to move state mutation out of handler context without rewriting the protocol transition.

## refactor(server): signal 처리를 self-pipe event loop로 제한
The signal handler is reduced to preserving `errno`, copying the sender PID and signal number into a fixed-size event, and writing that event to a nonblocking self-pipe. The main `pselect` loop reads complete records, validates them, owns the session and byte state, writes completed output, and sends sequence ACK datagrams. A failed or partial event write sets an overflow flag that causes the server to stop rather than continue after an unobservable state transition.

This establishes the final async-signal-safe responsibility boundary. The handler performs only bounded data capture through `write`; socket operations, output policy, ownership changes, and multi-field state updates occur in ordinary control flow. Because each event fits within `PIPE_BUF`, a successful write is atomic with respect to other handler writes. Moving mutable protocol state out of `sig_atomic_t` globals also makes transitions sequential and inspectable in one event loop.

## fix(client): 표현 가능한 PID 범위 전체 허용
PID parsing removes the arbitrary six-digit ceiling and instead checks decimal accumulation before multiplication against `INT_MAX`. After parsing, the value is cast to `pid_t` and converted back to confirm that the target type can represent it; non-digits, values at or below one, and arithmetic overflow remain invalid.

The accepted domain now follows the platform representation rather than an application guess about likely PID sizes. Performing the overflow test before `value * 10 + digit` avoids undefined or wrapped intermediate arithmetic, while the round-trip check acknowledges that `pid_t` need not have exactly the same range as `int` on every supported host.

## test(client): PID 문자열 범위 검증
A focused parser test fixes both accepted and rejected boundaries. It accepts the minimum usable PID, leading-zero forms, values above the former six-digit cap, and `INT_MAX`; it rejects null pointers, empty text, zero, one, signs, trailing characters, `INT_MAX + 1`, and a null output destination.

Testing the parser independently separates numeric-contract failures from process liveness and socket setup. The cases verify that the implementation consumes the entire string, does not partially update through an invalid interface, and bases its upper bound on checked representation rather than on a conventional PID range.

## fix(io): 중단·부분 쓰기를 끝까지 처리
`mt_write_all` introduces an all-or-failure descriptor-write contract. It retries after `EINTR`, advances by the number of bytes written after a short write, and treats a zero-byte result before completion as `EIO` because no further progress can be inferred. String and number output helpers are routed through this primitive.

A single successful `write` is not guaranteed to consume an entire buffer, even for ordinary descriptors. Centralizing the completion loop prevents callers from silently truncating diagnostics or protocol-visible output and gives later server code a return value that can participate in acknowledgement decisions. The function does not hide terminal errors; it ensures only that success means every requested byte was committed to the descriptor interface.

## fix(server): stdout 실패 뒤 ACK 전송 차단
Server output becomes part of the bit-acknowledgement commit boundary. Completed bytes, message-ending newlines, recovery newlines, and the initial PID line are written through `mt_write_all`; any failure propagates out of the event loop, and the ACK for the triggering bit is not sent. `SIGPIPE` is ignored so a closed output pipe is observed as `EPIPE` rather than terminating the process outside its cleanup path.

This strengthens the meaning of a successful ACK: it is emitted only after the server has fully applied the corresponding visible output effect. Session reset also returns failure when closing an abandoned partial line cannot be written, preventing the server from advertising recovery that was not reflected on stdout. The guarantee is still not an exactly-once transaction—output may succeed and the datagram ACK may later be lost—but it avoids the clearly incorrect ordering of acknowledging before output succeeds.

## test(server): 부분 쓰기와 출력 실패 검증
A fault-injected server build replaces the low-level write call with a deterministic test implementation. It can interrupt the first write, limit each call to one byte, return zero during PID publication, or fail on a selected payload byte or newline with `EPIPE`. The tests verify complete output under short writes and `EINTR`, and verify that startup or message-output failures terminate the server, remove its endpoint, and leave the client timing out rather than reporting success.

These cases establish the semantic link between descriptor completion and protocol completion. They also cover failure before readiness, during a normal payload byte, and while applying the NUL-frame newline. The harness makes rare partial-operation paths repeatable without changing the production algorithm beyond a compile-time write hook.

## perf(protocol): 검증된 ACK 뒤 고정 지연 제거
The fixed sleep after every acknowledged bit is removed from both the production client and the session test sender. A matching sequence ACK already proves that the server consumed the prior signal and completed its response path, so an additional time-based gap no longer contributes to bit ordering.

This improves throughput without increasing the number of in-flight data signals: the client still sends exactly one bit and waits for its correlated ACK before advancing. The change illustrates the difference between provisional timing defenses and protocol guarantees. Once sequencing is explicit and validated, retaining the delay would add latency to every bit while protecting no remaining invariant.

## fix(client): bind한 응답 경로만 정리
Client cleanup now tracks whether `bind` actually succeeded and unlinks the response path only when that ownership flag is set. Merely computing a PID-derived name is no longer treated as proof that the process created or owns the filesystem entry.

This closes a destructive failure path. If binding fails because an endpoint already exists, unconditional cleanup could delete the entry belonging to another live or independently managed process. Recording the resource-acquisition transition makes unlink symmetric with successful bind: close may apply to any descriptor the client opened, but path removal applies only to the namespace object it established.

## test(runtime): stale 응답 endpoint 처리 검증
Runtime regression tests construct stale client and server sockets, protected regular files at expected endpoint paths, and unrelated live processes. They verify that same-UID stale sockets can be removed and replaced, while non-socket entries are preserved and cause a clean startup failure. The per-UID runtime directory is also checked for private permissions, and a PID without a valid server endpoint is rejected.

The helpers coordinate path creation with child `exec` so the tests exercise real PID-derived names rather than approximations. This locks down the distinction between recoverable residue and an object the program has no authority to remove. It also confirms that process existence and filesystem endpoint validity are jointly required for the control channel.

## fix(server): 종료 시그널을 이벤트 루프 정리 경로로 처리
`SIGHUP`, `SIGINT`, and `SIGTERM` are captured as the same fixed self-pipe events used for data signals. The normal event loop recognizes them, returns the signal number to `main`, and exits with `128 + signal`; registered `atexit` cleanup then closes descriptors and removes the bound server socket path.

Cleanup is deliberately not performed in the signal handler. Filesystem operations, socket closure bookkeeping, and process-exit policy remain in normal execution context, while the handler performs only the async-signal-safe event write. This gives externally initiated shutdown the same resource-lifecycle path as ordinary returns and preserves conventional signal-derived exit status without abandoning persistent endpoint state.

## test(runtime): 중단된 client와 server 종료 정리 검증
The runtime suite pauses and resumes a client during a 16 KiB transfer, verifies that the complete message is delivered, and checks that the client endpoint disappears after successful exit. It then terminates the server with `SIGTERM`, requires exit status 143, verifies removal of the server endpoint, and compares the final stdout contents with all expected messages.

This covers lifecycle behavior under scheduling interruption and asynchronous shutdown rather than only quick normal executions. A stopped client must retain its session and sequence state, while eventual completion must release its filesystem resource. The server must route termination through the event loop without truncating prior committed output or leaving a stale address behind.

## test(response): oversized 응답과 invalid flood 검증
Response validation is extended with a datagram one byte larger than the protocol record and with a sustained stream of otherwise well-formed responses carrying the wrong token. The client must reject the oversized frame, ignore every uncorrelated frame, and still time out within the original bounded interval.

These tests protect two independent invariants. Datagram acceptance requires an exact frame size, so a valid prefix cannot conceal trailing data or an incompatible record version. The wait uses one absolute monotonic deadline, so invalid traffic cannot keep a client alive by repeatedly restarting a relative timeout. A busy or malicious local sender can consume processing effort, but it cannot convert a three-second transition budget into an unbounded wait.

## test(session): 데이터 없는 활성 예약 경쟁 검증
The session helper gains a `reserve` mode that completes acquisition and then sends no data. While that process remains alive, a normal client must receive a busy result and the server must emit no partial output. After the reserver exits, a later client must acquire the session and complete normally.

This proves that ownership begins at the `ACQUIRE` transition, not at the first bit or first completed byte. The test separates reservation semantics from payload progress and prevents a regression in which two clients could both be told they were ready until one happened to signal first. It also confirms that an idle but live owner remains exclusive under the current no-lease design.

## test(server): 회수 줄바꿈 출력 실패 검증
Fault coverage now targets the newline written when a new acquisition causes recovery from a dead owner that had already emitted a partial line. The recovery write is forced to fail; the server must terminate its event loop, and the waiting replacement client must time out rather than receiving readiness or acknowledgement for a state transition that was not completed.

This distinguishes recovery bookkeeping from successful recovery. Clearing the owner and bit counters while failing to delimit visible partial output would merge sessions or falsely present a clean boundary. The test confirms that the recovery newline participates in the same all-or-failure output invariant as ordinary payload and terminating-newline writes.

## test(server): self-pipe 이벤트 손실 시 fail-stop 검증
The event-write hook injects `EAGAIN` on the first attempt by the signal handler to place an event in the nonblocking self-pipe. The handler records overflow, the event loop detects that flag, and the server exits with an error and removes its endpoint; the client cannot receive a success ACK and eventually fails.

A dropped signal event cannot be reconstructed safely because it may represent one specific bit in an ordered byte stream. Continuing after loss would shift every subsequent bit and could acknowledge corrupted state. The test therefore locks down a fail-stop policy: once the bridge between asynchronous delivery and sequential processing loses an event, availability is sacrificed to preserve protocol integrity.

## fix(runtime): select 범위를 벗어난 descriptor 거부
Client and server initialization now reject any descriptor that will be placed in an `fd_set` when its value is greater than or equal to `FD_SETSIZE`. The checks cover the client response socket, the server response socket, and the self-pipe read descriptor before any `FD_SET` or `pselect` call uses them.

`fd_set` is a fixed-size bit representation, not a dynamically checked collection. Passing a larger descriptor to `FD_SET` can write outside the object and invoke undefined behavior even though the descriptor itself is otherwise valid. Failing during resource creation makes the implementation's polling limitation explicit and converts a potential memory-safety fault into a controlled startup error.

## test(runtime): 높은 descriptor 번호의 안전한 실패 검증
A wrapper opens `/dev/null` repeatedly until subsequent descriptors reach the `FD_SETSIZE` boundary, then executes the real client or server with that inherited descriptor table. Both programs must fail through their normal response-channel diagnostic instead of entering `pselect`, while an independently running server remains unaffected by the failing high-descriptor client.

The test creates the condition through real descriptor allocation rather than mocking an integer. It verifies both sides of the new guard and checks that failure occurs before PID publication or protocol traffic. This provides regression evidence that an environmental resource layout cannot turn fixed-size polling structures into out-of-bounds memory access.

## fix(server): 상속된 이벤트 시그널 마스크 해제
After installing handlers, the server explicitly unblocks the two data signals and the three supported termination signals in its process mask. Signal masks survive `exec`, so a server launched by a parent that blocked these signals would otherwise publish readiness while never receiving data or shutdown events.

The executable now establishes both halves of its signal policy: disposition through `sigaction` and deliverability through `sigprocmask`. Only the signals required by the event loop are normalized; unrelated inherited settings remain untouched. This makes server correctness independent of launcher mask state and ensures that self-pipe event capture can actually occur.

## test(server): 차단된 시그널 마스크 상속 뒤 메시지 검증
The masked-exec wrapper blocks data and termination signals before launching the server. The test then sends a complete message through a normal client, compares output, terminates the server, requires exit status 143, and verifies that the endpoint is removed with no unexpected diagnostics.

This reproduces the exact process-lifecycle condition addressed by signal unblocking. Successful PID publication alone is not considered readiness; the inherited-mask server must receive bit events, generate ACKs, process the NUL frame, and later receive `SIGTERM` through the same event channel. The cleanup assertion confirms that unblocking termination signals also preserves the normal shutdown path.

## fix(server): 응답 경로가 사라진 세션 소유자 회수
Session-owner availability is broadened beyond `kill(owner, 0)`. The server now also derives the owner's client response path and requires it to exist as a valid same-UID Unix socket. If the PID is invalid, no longer exists, or no longer has a usable reply endpoint, a competing acquisition may close any partial line and reset the session before becoming owner.

This fixes the unreaped-child case: an exited process can remain present as a zombie, causing `kill(pid, 0)` to succeed even though it can no longer receive acknowledgements and its `atexit` cleanup has removed the socket. Protocol liveness is therefore tied to the resources needed for further communication, not solely to the kernel's continued PID entry.

## test(session): 종료 송신자 회수 전 새 세션 복구 검증
A dedicated helper forks a partial-session sender, waits with `waitid(..., WNOWAIT)` until the child has exited, and deliberately leaves it unreaped. It confirms that the child's PID still responds to liveness probing while its client socket path has disappeared, then starts a new client and requires the server to recover, delimit the abandoned partial output, and complete the new message before the parent finally reaps the child.

This test isolates the root cause that PID-only ownership checks miss. The old owner is neither a live protocol participant nor yet absent from the process table. Successful recovery therefore proves that endpoint availability is part of the session invariant and that the server can make progress during the interval between process exit and parent reaping without mixing the two sessions.
