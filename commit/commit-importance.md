# Project Importance Profile
Project: buffered-line-reader (`c/get_next_line`)
Domain: POSIX C buffered record reading and static-library API design
Primary Purpose: Provide a `get_next_line`-compatible function and an explicit reader-context API that return one NUL-terminated line at a time while preserving state, ownership, and failure semantics across arbitrary descriptor reads.
Resolved Commit Scope: The complete independent linear history of the branch, 32 commits from root `1f08a7808567` through tip `dfdf1a2919a4`, ordered oldest to newest. The history contains no merge commits; both documentation-only commits are included in classification even though they were excluded from `commit-bodies.md`.

## Core Technical Areas
- Incremental line framing across arbitrary `read` chunk boundaries, including newline retention and final unterminated tails.
- Dynamic buffer-window representation, geometric growth, compaction, scan cursors, overflow checks, and caller-visible copy ownership.
- Hidden descriptor-indexed state for the compatibility API and explicit context lifetime for the richer API.
- POSIX descriptor and system-call semantics: short reads, EOF, invalid descriptors, `EINTR`, `EAGAIN`, `EWOULDBLOCK`, and recoverable I/O failure.
- Public API/result contracts, static archive surface, external-consumer compatibility, and reproducible `BUFFER_SIZE` configuration.
- Deterministic fault injection, sanitizer coverage, cross-configuration boundary tests, concurrency-boundary tests, and structural performance measurement.

## Core Architecture
- `t_blr_reader` is an opaque heap object that borrows one file descriptor and owns a dynamic byte buffer plus `begin`, `scan`, `end`, `capacity`, and EOF state.
- `blr_reader_create`, `blr_reader_next`, `blr_reader_reset`, and `blr_reader_destroy` expose explicit lifetime and result semantics. `blr_reader_next` is the authoritative state-transition engine.
- `get_next_line(fd)` is a compatibility adapter over the same engine. It stores contexts in a file-scope linked list keyed by descriptor number and maps richer results back to `char *` or `NULL`.
- The static archive is the release boundary. Manifest checks, isolated consumers, fault builds, sanitizers, and metric builds verify different properties without expanding the public implementation surface.

## Critical Invariants
- A successful line result contains exactly one logical record, includes the newline when present, and is an independent allocation owned by the caller.
- EOF returns a remaining unterminated suffix once, then remains stably terminal; an empty stream does not manufacture an empty line.
- Buffered state maintains `0 <= begin <= scan <= end < capacity` with a NUL sentinel at `bytes[end]`, and capacity arithmetic cannot wrap.
- Allocation or read failure must not partially consume an explicit context's unread input; line extraction commits cursor movement only after caller-visible allocation succeeds.
- State and cleanup are scoped to one descriptor or context. Failure on one stream cannot erase another stream's unread bytes, and stale hidden state cannot attach to a reused descriptor number.
- `BLR_LINE`, `BLR_EOF`, `BLR_AGAIN`, and `BLR_ERROR` remain distinguishable, and non-line outcomes clear a valid output pointer to `NULL`.
- `EINTR` retries the same logical operation, while `EAGAIN` or `EWOULDBLOCK` preserve partial input and expose temporary incompleteness rather than EOF.
- Context reset and destruction release owned memory but never close the borrowed descriptor. Independent contexts may be used by different threads; same-context and legacy-list synchronization are not claimed.
- The archive exports only the intended API and depends only on the permitted C/POSIX runtime symbols.

## Major Engineering Difficulties
- Designing a streaming parser whose observable records do not depend on how the kernel partitions reads.
- Evolving one persistent accumulator into a reusable unread-window representation without weakening rollback or ownership guarantees.
- Supporting interleaved descriptors and later explicit contexts while preventing stale integer-fd state, broad cleanup, or duplicated parsing implementations.
- Preserving already accepted bytes across allocation failure, short reads, interruption, nonblocking waits, and later retry.
- Giving the compatibility API useful resumability even though its `NULL` result cannot distinguish EOF, error, and temporary wait.
- Demonstrating algorithmic behavior and failure correctness reproducibly rather than relying on wall-clock timing, memory pressure, or incidental OS scheduling.

## Practical Engineering Areas
- Compile-time configuration validation and buffer-size-specific object isolation.
- Binary archive/API-surface inspection and isolated external-consumer tests.
- Deterministic replacement of `malloc`, `free`, and `read` for rollback and ownership testing.
- Sanitizer, leak, high-descriptor, pipe, repeated-EOF, and multi-`BUFFER_SIZE` verification.
- Explicit documentation of descriptor borrowing, offset coupling, fd reuse, dup aliases, and thread-safety limits.
- Structural operation counting for large-input performance regression detection.

## S-level Criteria
- Establishes the durable buffer/state representation or one-line-at-a-time mechanism that defines the library.
- Establishes the authoritative state-ownership model across descriptors or explicit contexts.
- Defines the richer public result-state contract that the finished library is organized around.
- Solves a difficult POSIX streaming correctness problem whose violation loses, duplicates, or misclassifies buffered input.

## A-level Criteria
- Introduces a significant API/lifecycle boundary, unifies major implementations, or restores non-destructive ownership behavior.
- Provides strong evidence for a critical state, failure, or isolation invariant through deterministic or boundary-heavy verification.
- Makes a meaningful performance or release-boundary improvement that materially changes confidence or cost without redefining the core architecture.

## Typical B-level Work
- Standard build, packaging, sanitizer, or external-link verification within the established architecture.
- Routine regression tests for already-defined behavior, focused configuration checks, or supporting refactors that prepare but do not themselves establish the decisive mechanism.

## Typical C-level Work
- Documentation-only commits and narrowly mechanical maintenance with no behavioral, structural, build, or verification consequence.

## Project-specific Tags
LINE_STATE — line framing, unread-window indices, scanning, compaction, growth, and EOF-tail state.
READER_LIFECYCLE — descriptor-indexed or explicit-context ownership, isolation, reset, destruction, and reuse rules.
POSIX_IO — descriptor validation and `read` outcomes including short reads, EOF, interruption, nonblocking waits, and errors.
API_CONTRACT — public functions, result taxonomy, output ownership, and compatibility semantics.
RELEASE — static archive configuration, exported surface, external-consumer behavior, and package verification.

# Commit Classification
| Commit | Subject | Importance | Tags | Summary | Why |
| --- | --- | --- | --- | --- | --- |
| `1f08a7808567` | `docs(readme): 프로젝트 초기 규약 정의` | C | - | Adds an initial README describing the intended C99 line-reader scope and development rules. | Documentation-only project framing; it changes no executable, API, build, or verification behavior, so it contributes little to the engineering history. |
| `466cfcbd3525` | `feat(api): line reader 공개 계약 정의` | A | ARCH, API_CONTRACT | Defines `get_next_line`, caller ownership, and the positive compile-time `BUFFER_SIZE` contract. | This is the durable public boundary used by all later work and fixes configuration and ownership semantics, but the defining parser and state mechanisms are introduced in later commits. |
| `85e4c2a41a4c` | `feat(reader): 파일 끝의 마지막 줄 반환` | A | CORE, LINE_STATE, RISK | Implements geometric accumulation, failure rollback, and return of an unterminated EOF tail. | It establishes essential buffer ownership and EOF behavior that later line parsing reuses; however, it still treats the whole stream as one record, so it is a significant foundation rather than the finished core mechanism. |
| `7e1a6b0cf415` | `build(reader): 정적 라이브러리 빌드 경계 추가` | B | RELEASE, PRACTICAL | Builds a strict C99 static archive with dependency tracking and buffer-size-specific objects. | This makes the library reproducible and configuration-safe, but it applies standard build engineering around an already chosen API rather than changing reader correctness. |
| `9856e1e1eef2` | `test(reader): 빈 입력과 EOF 앞 마지막 줄 검증` | B | TEST, EDGE, POSIX_IO | Adds descriptor-based tests for empty input, EOF tails, chunk spanning, and invalid descriptors. | The suite establishes the earliest observable contract and prevents basic regressions, but it is normal baseline verification of the initial implementation. |
| `7e64d3d79ad4` | `refactor(buffer): 읽지 않은 입력을 구간으로 표현` | S | ARCH, LINE_STATE, HARD | Represents buffered data as an unread `[begin, end)` window with compaction and non-destructive growth. | This durable representation is the architectural prerequisite for incremental consumption, line extraction, rollback, and the final context implementation. Removing it leaves a major gap in explaining how the reader manages persistent state. |
| `39a2b9055728` | `feat(reader): 줄을 분리하고 남은 입력 보존` | S | CORE, LINE_STATE, HARD | Returns one newline-delimited record per call while preserving the unread suffix and EOF tail. | This is the project's defining behavior: it turns a whole-stream accumulator into a streaming line parser whose results are independent of kernel chunking. The finished library cannot be understood without this mechanism. |
| `302aaab64ac9` | `test(reader): 개행과 남은 입력 처리 검증` | B | TEST, LINE_STATE, EDGE | Locks down newline inclusion, empty lines, retained suffixes, and final unterminated records. | The tests directly cover core cursor behavior, but they are expected regression coverage for the mechanism just introduced rather than a new architectural decision. |
| `fc01012e8521` | `refactor(state): reader 상태를 helper 인자로 전달` | B | REFACTOR, READER_LIFECYCLE | Passes an explicit reader state object through buffering and extraction helpers. | The refactor reduces hidden singleton coupling and prepares multi-reader support, but it deliberately preserves behavior and remains a supporting step before the decisive per-descriptor state model. |
| `a4f41cbf2cf0` | `feat(state): 디스크립터별 읽기 상태 분리` | S | ARCH, READER_LIFECYCLE, RISK | Replaces the singleton reader with a linked collection of independent states keyed by file descriptor. | It establishes the core state-ownership rule required for interleaved descriptors and local failure cleanup. This changes how persistent state is organized and prevents one stream's buffered bytes from contaminating another. |
| `61f8b9858672` | `test(state): 교차 디스크립터 상태 격리 검증` | A | TEST, READER_LIFECYCLE, RISK | Alternates multiple descriptors and verifies that invalid calls do not disturb valid buffered streams. | The test protects the central isolation invariant of the new state model and would expose global cursors, shared buffers, or broad cleanup; it materially strengthens confidence in a core architectural boundary. |
| `d3e2b37fca03` | `test(error): 오류 발생 시 디스크립터 상태 정리 검증` | A | TEST, READER_LIFECYCLE, RISK | Verifies local cleanup for write-only and closed descriptors while preserving other descriptor states. | This targets the non-obvious descriptor-reuse hazard created by hidden state keyed to an integer fd. It establishes that cleanup is a correctness requirement, not only leak prevention. |
| `fd03a831686b` | `test(failure): 메모리 할당과 읽기 실패 처리 검증` | A | TEST, POSIX_IO, RISK | Adds deterministic allocation/read fault injection, short-read control, and invalid-free tracking. | The harness makes rollback, ownership, and cross-descriptor failure invariants reproducible across every allocation point and I/O transition. That is significant failure-path engineering beyond routine functional coverage. |
| `656528529ade` | `test(reader): BUFFER_SIZE 경계값 검증` | A | TEST, LINE_STATE, EDGE | Runs a multi-size behavioral matrix around chunk boundaries, large lines, pipes, high fds, stable EOF, and storage independence. | The matrix demonstrates that line semantics and ownership are representation-independent across radically different `BUFFER_SIZE` partitions. Its breadth materially validates the core parser rather than merely adding examples. |
| `dbf1abd21121` | `refactor(buffer): 남은 입력 버퍼를 읽기 공간으로 재사용` | A | PERF, LINE_STATE, REFACTOR | Reads directly into reserved internal tail capacity instead of copying through a stack buffer. | This removes systematic per-read copying while preserving reserve-before-read rollback and cursor invariants. It is a meaningful performance and representation refinement, though not project-defining. |
| `cb86ab3fb0f0` | `test(build): BUFFER_SIZE 정의 경계 검증` | B | TEST, RELEASE, EDGE | Checks at compile time that zero or negative `BUFFER_SIZE` values fail and positive values compile. | This enforces an important configuration edge at the correct phase, but it is a focused validation of the existing header contract. |
| `0593c0e464b2` | `test(release): 정적 라이브러리 표면 검증` | B | TEST, RELEASE, API_CONTRACT | Validates archive members, exported symbols, and permitted undefined dependencies against manifests. | The commit makes binary packaging verifiable and prevents accidental API leakage, but it is standard release-surface protection around the established library architecture. |
| `0d54a18a9ad4` | `test(release): 공개 archive 소비자 실행 검증` | B | TEST, RELEASE, INTEGRATION | Builds and executes a public-header consumer linked to the generated archive. | It closes a practical link-interface gap between in-tree tests and the shipped artifact, yet it exercises an already established API rather than changing core behavior. |
| `f7f438db2c56` | `test(sanitize): UB와 누수 검사 경로 추가` | B | TEST, PRACTICAL, RISK | Adds undefined-behavior and platform-aware leak-check paths to the verification workflow. | Sanitizer coverage is valuable for a stateful C implementation, but the commit adds general verification infrastructure rather than a reader-specific design decision. |
| `903768a43bf4` | `feat(context): 명시적 reader 수명 API 추가` | A | ARCH, READER_LIFECYCLE, API_CONTRACT | Introduces opaque reader creation, reset, and destruction with caller-controlled context lifetime. | This establishes explicit resource ownership and cancellation/reset semantics that hidden legacy state cannot express. It is a significant public architecture change, though reading outcomes are defined in the following commit. |
| `2e681112b304` | `feat(reader): 명시적 결과 상태 API 추가` | S | ARCH, API_CONTRACT, CORE | Adds `blr_reader_next` and distinct `LINE`, `EOF`, and `ERROR` outcomes to the explicit context API. | The commit defines the finished project's richer state-machine contract and separates data ownership from terminal or error status. It is a foundational public mechanism used to explain the final library. |
| `9bd6ebf429e2` | `refactor(reader): legacy API를 context reader에 연결` | A | REFACTOR, INTEGRATION, API_CONTRACT | Makes `get_next_line` an adapter over the context engine and preserves buffered input on line-allocation failure. | Unifying both public entry points around one authoritative state transition removes divergent implementations and clarifies compatibility behavior. It is significant integration and rollback work, but it builds on the explicit engine introduced immediately before. |
| `249093ba477a` | `test(context): 결과 상태와 컨텍스트 수명 검증` | A | TEST, READER_LIFECYCLE, API_CONTRACT | Tests context results, reset/destroy ownership, fd repositioning/reuse, dup aliases, and invalid arguments. | The suite establishes the lifecycle contract of the new API, including borrowed descriptors and read-ahead coupling to kernel offsets. These are substantial correctness boundaries, not routine happy-path tests. |
| `a24ad4e49cc4` | `test(failure): 컨텍스트의 line 할당 재시도 검증` | A | TEST, READER_LIFECYCLE, RISK | Forces caller-visible line allocation failures and verifies exact retry of buffered delimiter and EOF-tail data. | It proves extraction is transactional: input state advances only after result allocation succeeds. That is a significant ownership and rollback invariant for reusable contexts. |
| `f0055ae5cf19` | `fix(reader): 중단된 읽기를 재시도하고 대기 상태를 보존` | S | CORE, POSIX_IO, RISK | Retries interrupted reads, exposes nonblocking wait as `BLR_AGAIN`, and preserves partial input across transient or terminal errors. | This commit establishes the final POSIX streaming semantics and prevents readiness or interruption from collapsing into EOF or data loss. It solves a difficult state-and-I/O correctness problem central to the explicit API. |
| `f3504f674c73` | `test(reader): 비차단 부분 입력 보존 검증` | A | TEST, POSIX_IO, EDGE | Feeds a nonblocking pipe in stages and verifies fragment preservation through `AGAIN`, line completion, EOF tail, and the legacy adapter. | The test locks down the core transient-read invariant across both interfaces and would catch cleanup, duplication, or prefix-loss errors after resumption. |
| `11033bd85c59` | `test(failure): EINTR·EAGAIN·I/O 오류 순서 검증` | A | TEST, POSIX_IO, RISK | Scripts ordered `EINTR`, short-read, `EAGAIN`, and terminal I/O-error sequences. | Alternating progress and failure is where cursor corruption is most likely; this test materially validates the result taxonomy and non-destructive state transitions. |
| `d2d9aabb2d0f` | `test(thread): 독립 컨텍스트의 병렬 사용 검증` | B | TEST, READER_LIFECYCLE | Runs independent explicit contexts concurrently and documents the supported thread-safety boundary. | It confirms a useful property of the context design, but it neither adds synchronization nor changes the core reader mechanism; same-context and legacy concurrency remain unsupported. |
| `114ceeca86e6` | `test(release): 격리된 외부 소비자 계약 검증` | B | TEST, RELEASE, INTEGRATION | Builds an isolated consumer using only the public header and archive and exercises both APIs. | This is strong release hygiene that detects private in-tree dependencies, but it validates rather than establishes the architecture. |
| `7f8939afb12c` | `test(sanitize): AddressSanitizer와 플랫폼 실행 정책 추가` | B | TEST, PRACTICAL, RISK | Adds AddressSanitizer builds and an explicit platform execution policy. | The commit improves memory-safety evidence across existing tests, but it is general verification infrastructure rather than a project-specific mechanism. |
| `a0654d9de446` | `test(perf): 4 MiB 입력의 작업량 기준 고정` | A | PERF, TEST, LINE_STATE | Fixes a deterministic 4 MiB workload manifest for reads, allocations, copies, and checksum. | The structural metrics guard the algorithmic benefits of geometric growth, direct tail reads, and scan cursors without relying on noisy wall time. This is meaningful performance regression prevention. |
| `dfdf1a2919a4` | `docs(project): 프로젝트 문서 완성` | C | - | Documents the final APIs, buffer invariants, lifecycle rules, verification scope, and limitations. | Although extensive and accurate, this is documentation-only work and does not alter the completed library's behavior, packaging, or tests; under the governing rubric it remains minor for commit importance. |

# Development Threads
## Thread: Whole-stream accumulation to a bounded streaming line parser
`85e4c2a41a4c` A — Establishes geometric accumulation, ownership rollback, and the EOF-tail rule.
↓
`7e64d3d79ad4` S — Introduces the unread-window representation needed to retire consumed prefixes safely.
↓
`39a2b9055728` S — Implements one-line extraction, newline retention, scan progress, and suffix preservation.
↓
`656528529ade` A — Demonstrates that framing and ownership remain correct across multiple chunk sizes and difficult boundaries.
↓
`dbf1abd21121` A — Removes the per-read scratch-buffer copy by reading directly into reserved tail capacity.
↓
`a0654d9de446` A — Fixes reproducible large-input operation counts so later changes cannot silently reintroduce multiplicative work.

**Significance**
The sequence separates three distinct engineering decisions: how bytes are accumulated safely, how logical records are represented and consumed, and how the resulting parser's cost is controlled. The initial implementation supplies ownership and growth mechanics, but the unread interval and line extractor establish the durable architecture. Later tests and metrics show that the same semantics survive arbitrary read partitioning without regressing into repeated append copies, repeated scans, or linear-capacity growth.

## Thread: Singleton state to descriptor-scoped compatibility state
`fc01012e8521` B — Makes helper mutations target an explicit reader object rather than hidden singleton fields.
↓
`a4f41cbf2cf0` S — Creates independent linked reader nodes keyed by file descriptor.
↓
`61f8b9858672` A — Verifies interleaved streams and local behavior under an unrelated invalid descriptor.
↓
`d3e2b37fca03` A — Locks down cleanup for unusable descriptors and the descriptor-number reuse hazard.
↓
`fd03a831686b` A — Exercises allocation and read failure at exact transitions while checking that other reader nodes survive.

**Significance**
Passing state explicitly is only preparatory; the decisive change is giving each active descriptor its own buffer, cursors, and disposal path. The following tests expose why that ownership boundary matters: a global cursor, broad reset, or retained failed node can cross-contaminate streams or attach stale bytes to a later descriptor reuse. The fault harness extends the same invariant from normal interleaving into partial construction and I/O failure.

## Thread: Explicit reader lifetime and one authoritative engine
`903768a43bf4` A — Exposes opaque creation, reset, and destruction while keeping descriptor ownership external.
↓
`2e681112b304` S — Adds the explicit line/EOF/error result-state API.
↓
`9bd6ebf429e2` A — Routes the legacy function through the context engine and makes extraction non-consuming on allocation failure.
↓
`249093ba477a` A — Verifies descriptor borrowing, reset after seek, fd reuse, dup aliases, and stable results.
↓
`a24ad4e49cc4` A — Proves that both newline-delimited and EOF-tail allocations can fail and be retried without input loss.

**Significance**
The project moves from hidden lifetime tied to EOF toward an explicit state object that callers can cancel, reset, and destroy. The result enumeration separates data from status, while the adapter prevents the compatibility function and explicit API from diverging. The tests then establish the non-obvious consequences of borrowing a descriptor: read-ahead is coupled to its kernel offset, integer reuse requires a new context, and output allocation failure must not commit input consumption.

## Thread: POSIX transient-read and recovery semantics
`fd03a831686b` A — Provides deterministic short-read and read-error injection with allocation ownership tracking.
↓
`f0055ae5cf19` S — Retries `EINTR`, introduces `BLR_AGAIN`, and preserves accepted bytes across transient or terminal read failures.
↓
`f3504f674c73` A — Feeds nonblocking input in stages to verify wait, resumption, suffix retention, EOF tail, and legacy compatibility.
↓
`11033bd85c59` A — Scripts mixed progress and failure sequences to validate exact cursor behavior after retry.

**Significance**
The important progression is not simple errno handling. The implementation must distinguish interruption, temporary lack of readiness, terminal failure, and EOF without treating any of them as a record boundary or discarding bytes already read. The fault harness makes those transitions controllable, the fix defines the state policy, and the two test layers verify both realistic nonblocking behavior and ordered adversarial sequences.

# Most Important Commits
## refactor(buffer): 읽지 않은 입력을 구간으로 표현
Commit: `7e64d3d79ad4`
Importance: S
Tags: ARCH, LINE_STATE, HARD

### Problem
A single active length can describe accumulated bytes, but it cannot cleanly distinguish already returned prefixes, still-unread bytes, scan progress, and unused capacity. Incremental line consumption needs those regions to have separate meanings while allocation failure must leave the old data intact.

### Decision
The buffer becomes an unread interval `[begin, end)` inside a capacity-managed allocation. Consumed prefixes can be retired by advancing `begin`, remaining bytes can be compacted only when necessary, and geometric growth replaces the allocation only after allocation and copy succeed.

### Why it mattered
This representation is the common substrate for later newline scanning, suffix preservation, explicit contexts, retry after failure, and direct reads into tail capacity. It converts buffer management from an append-only implementation detail into an explicit state model with durable invariants.

### What changed
Capacity, logical length, and consumption position become separate concerns. Reserve can reuse free tail space, compact unread bytes, or grow non-destructively while maintaining a NUL sentinel and valid indices.

### Why this is important for understanding the project
The final reader is best understood as a stateful window over bytes, not as repeated string concatenation. This commit establishes that mental model and explains why later extraction, rollback, and performance work can coexist without losing unread input.

## feat(reader): 줄을 분리하고 남은 입력 보존
Commit: `39a2b9055728`
Importance: S
Tags: CORE, LINE_STATE, HARD

### Problem
Accumulating until EOF does not satisfy the library's central contract. A caller needs exactly one logical line per call, even when delimiters cross read boundaries or one read obtains bytes belonging to several later results.

### Decision
The reader scans from a persistent cursor, allocates and returns the prefix through a newline, advances the unread start only for that record, and retains every following byte. At EOF it returns a final nonempty suffix once before reporting completion.

### Why it mattered
This is the core parsing mechanism that makes kernel read partitioning invisible. It also fixes the key consumption invariant: one successful call commits exactly one record and never consumes bytes from the next record.

### What changed
A scan cursor avoids repeatedly searching bytes already known not to contain a delimiter. Returned storage is independent, newline bytes remain part of the result, and the unread suffix stays in the internal window for later calls.

### Why this is important for understanding the project
Without this change the project is merely a dynamic EOF accumulator. This commit turns it into a reusable streaming line reader and establishes the behavior that every later state, context, failure, and performance change must preserve.

## feat(state): 디스크립터별 읽기 상태 분리
Commit: `a4f41cbf2cf0`
Importance: S
Tags: ARCH, READER_LIFECYCLE, RISK

### Problem
Persistent read-ahead cannot be shared safely across unrelated file descriptors. Interleaved calls require each stream to retain its own unread bytes, cursor positions, and cleanup state, while a failure or EOF on one descriptor must not reset another.

### Decision
The compatibility layer stores a linked collection of reader nodes keyed by descriptor number. Lookup, creation, mutation, EOF disposal, and error cleanup are performed against one node at a time.

### Why it mattered
This establishes the authoritative ownership boundary for hidden legacy state. It enables the standard multi-descriptor use case and prevents cross-stream data leakage, while also making descriptor reuse a concrete lifecycle hazard that later tests and explicit contexts address.

### What changed
The former singleton reader is replaced by individually allocated nodes, each containing its own buffer window and scan state. Cleanup removes only the affected node instead of clearing a global reader.

### Why this is important for understanding the project
The project is not only a parser; it is a collection of persistent stream states. This commit explains how the compatibility API associates state with callers and why local cleanup, fd reuse, and later explicit handles are central correctness concerns.

## feat(reader): 명시적 결과 상태 API 추가
Commit: `2e681112b304`
Importance: S
Tags: ARCH, API_CONTRACT, CORE

### Problem
The historical `char *` interface collapses clean EOF, allocation or I/O error, and temporary incompleteness into `NULL`. It also provides no explicit handle through which callers can reason about persistent stream state and repeated terminal results.

### Decision
`blr_reader_next` returns an explicit result enumeration and transfers a successful line through an output pointer. The context records EOF so completion remains stable, and non-line outcomes leave the output pointer null.

### Why it mattered
This creates the finished library's richer public state-machine contract. Callers can separate data ownership from control flow, retry after recoverable failure, and manage context lifetime without interpreting a null data pointer as several unrelated outcomes.

### What changed
The public header gains `t_blr_result`, the context gains EOF state, and the reader engine returns `BLR_LINE`, `BLR_EOF`, or `BLR_ERROR` while maintaining independently allocated line results.

### Why this is important for understanding the project
The explicit API is the clearest expression of the implementation's real states. It also becomes the authoritative engine beneath `get_next_line`, so this commit defines both the public semantics and the architecture through which later nonblocking behavior is exposed.

## fix(reader): 중단된 읽기를 재시도하고 대기 상태를 보존
Commit: `f0055ae5cf19`
Importance: S
Tags: CORE, POSIX_IO, RISK

### Problem
A POSIX `read` can be interrupted or can temporarily report no available data after already supplying part of a future line. Treating those outcomes as EOF, cleanup, or destructive error would lose buffered input and make nonblocking streams unusable.

### Decision
A low-level wrapper retries `EINTR`; `EAGAIN` and `EWOULDBLOCK` become the explicit `BLR_AGAIN` result; and the reader preserves all accumulated bytes for later calls. Other I/O errors remain distinguishable and do not retroactively erase accepted input from an explicit context.

### Why it mattered
This restores the central streaming invariant under real system-call behavior: scheduling and readiness may delay a record, but they cannot redefine record boundaries or consume partial data. It is the point where the result taxonomy becomes a complete POSIX state model rather than only an EOF/error distinction.

### What changed
The explicit API gains `BLR_AGAIN`, actual and probe reads use interruption retry, and the compatibility adapter retains hidden state when it must map a wait result back to `NULL`.

### Why this is important for understanding the project
The difficult part of a stateful reader is not the happy-path newline search; it is preserving exact byte and cursor state across partial progress and asynchronous failure. This commit captures that problem and the final policy used throughout the completed library.
