# Project Importance Profile
Project: `thread-dining` on branch `c/philo`
Domain: Concurrent systems programming in C with POSIX threads; Dining Philosophers simulation
Primary Purpose: Parse a bounded CLI contract, run one philosopher worker per participant over shared fork mutexes, terminate on death or optional global meal completion, emit an ordered status log, and release resources only when thread quiescence is established.
Resolved Commit Scope: The complete independent, linear history reachable from `c/philo`: 38 commits from root `7974e1e1c4cd` through tip `96164b50af2a`, ordered oldest to newest. The root has no parent, there are no merge commits, and no unrelated inherited ancestors are included. Documentation-only commits remain in this classification even though they were excluded from `commit-bodies.md`.

## Core Technical Areas
- Strict command-line validation and numeric-domain boundaries before concurrent state is constructed.
- Shared ownership representation for the table, philosopher array, fork array, mutexes, condition variable, and borrowed pointers.
- Fork acquisition order, worker state transitions, and deadlock avoidance for the ring topology.
- Meal-start, meal-completion, quota, and counter-range semantics.
- Monotonic elapsed-time calculation, interruptible deadline waits, and a common worker start epoch.
- Authoritative death and completion monitoring, terminal-state publication, and terminal log ordering.
- Partial initialization, worker creation, join, destruction, retry, and unsafe process-termination paths.
- Deterministic failure injection, repeated schedule tests, and ThreadSanitizer-backed race detection.

## Core Architecture
- `main` owns a stack-resident `t_table` and drives `parse → initialize → run → destroy`; when join safety is unknown, it bypasses destruction and normal process teardown with `_exit`.
- `t_table` owns immutable configuration, the fork and philosopher allocations, global state, synchronization objects, the start barrier, and lifecycle ledgers. `t_philo` instances borrow pointers into that table and its fork array.
- Forks are mutexes arranged in a ring. Each philosopher worker performs the local eat-sleep-think cycle and updates its own meal state under `state_mutex`.
- The calling thread remains the monitor and owns global death or completion policy. It observes worker state under `state_mutex` rather than delegating peer-death decisions to workers.
- `start_cond` and `state_mutex` form a readiness barrier that publishes one `start_ms` and one initial `last_meal_ms` value to all workers.
- `print_mutex` serializes output and is ordered before `state_mutex` when death is revalidated and committed, coupling the terminal decision to the final `died` attempt.
- Time is accessed through a monotonic millisecond abstraction; waits poll the terminal flag so workers can abandon non-terminal activity after global completion or death.
- Verification is layered: source-level boundary tests use macro-substituted pthread and time calls, shell suites check public behavior and repeated schedules, and an optional ThreadSanitizer path checks exercised memory accesses.

## Critical Invariants
- Invalid, zero, negative, malformed, overflowing, or out-of-contract input must be rejected before any table or worker resource exists.
- A fork has one mutex identity shared by its two neighboring philosophers; two-or-more-philosopher acquisition order must break the all-left circular wait, while one philosopher must never relock the same mutex.
- Every worker must begin from the same published monotonic start epoch and the same initial starvation reference, regardless of creation or scheduling delay.
- `ended`, `full_count`, each `meals` value, each `last_meal_ms`, and barrier predicates are changed or observed through their defined `state_mutex` boundary.
- A meal is counted only after the eating interval completes and the simulation remains active at the synchronized commit point. `full_count` increases only when a philosopher first reaches the target.
- A death candidate must be rechecked against fresh time and the latest meal state before becoming terminal. At most one death is committed, and no ordinary status line is attempted after that terminal publication.
- Initialized resources are destroyed at most once and only when their ownership ledger says they exist. Failed destruction must leave truthful, retryable state for the resources not yet released.
- Shared table memory and synchronization objects must not be destroyed unless every started worker has been successfully joined. A join attempt is not proof of quiescence when the call fails.
- Elapsed time and starvation decisions must use a monotonic clock; a clock acquisition failure cannot be replaced with fabricated time.
- Internal meal accumulation must remain defined beyond the public `INT_MAX` target and must not cause a second contribution to `full_count`.

## Major Engineering Difficulties
- Breaking circular wait without overstating the result as fairness or starvation freedom.
- Distinguishing successful thread creation from actual worker readiness and publishing a common temporal origin under partial-start and condition-wait failures.
- Linearizing death detection, terminal-state publication, and output so a stale candidate does not die and a normal log cannot follow the death line.
- Defining a meal as a committed operation rather than equating resource acquisition or an `is eating` log with completed quota progress.
- Preserving exact ownership evidence across partial initialization, failed joins, and mid-destruction errors.
- Handling the case where cleanup itself is unsafe because an unjoined worker may still dereference the table.
- Testing schedule-dependent behavior without claiming exhaustive progress, latency, or fairness guarantees.
- Separating unsupported ThreadSanitizer infrastructure from an actual race or project build failure.

## Practical Engineering Areas
- Overflow-aware parsing, explicit public limits, stable usage and exit contracts.
- Staged initialization and rollback ledgers instead of cleanup based on requested final state.
- Error-precedence rules that allow unsafe join state to override an ordinary creation or wait error.
- Bounded test timeouts to turn hangs into observable failures.
- Macro-based fault injection for pthread, clock, sleep, and destructor boundaries.
- Negative process-level tests for forbidden destructor, stdio-flush, and `atexit` behavior.
- Repeated workload checks for per-philosopher progress, nondecreasing timestamps, and terminal-line position.
- Capability probing and explicit skip semantics for optional sanitizer tooling.
- Documentation of non-guarantees such as scheduler fairness, strict death-detection latency, and unhandled pthread or output failures.

## S-level Criteria
- Establishes the ownership or responsibility architecture that all worker, monitor, and lifecycle code relies on.
- Implements the defining worker or monitor mechanism of the Dining Philosophers runtime.
- Establishes or restores a project-wide concurrency invariant: one shared start epoch, linearized terminal state and death log, or destruction only after proven worker quiescence.
- Solves a non-obvious race or lifecycle hazard whose omission would make the finished project's correctness story materially incomplete.

## A-level Criteria
- Establishes an important but narrower invariant in parsing, timing, fork edge cases, meal accounting, initialization rollback, or process failure handling.
- Provides deterministic regression evidence for an S-level mechanism or a difficult partial-failure boundary.
- Introduces significant cross-component integration or verification without itself defining the core architecture.
- Corrects undefined behavior or exact-once resource handling on a valid path, even when the code change is small.

## Typical B-level Work
- Implements normal supporting behavior inside an already established architecture, including build wiring, entry-point composition, time helpers, and public smoke tests.
- Adds focused regression coverage for an A-level fix without independently establishing a broad invariant.
- Refines polling precision, output grammar, or domain limits without changing responsibility or ownership boundaries.
- Provides technically valuable documentation or verification support that does not alter runtime behavior.

## Typical C-level Work
- Documentation-only scaffolding with little durable technical effect.
- Local output or maintenance corrections whose consequences are minor relative to the concurrency and lifecycle design.
- Mechanical changes that neither establish nor protect a meaningful project invariant.

## Project-specific Tags
CONCURRENCY — shared-state synchronization, thread interleavings, and lock-order behavior
CLI_CONTRACT — public argument grammar, numeric limits, usage output, and process status behavior
FORK_ORDER — fork identity, acquisition order, and the one-philosopher aliasing edge
START_BARRIER — worker readiness, condition-variable release, and common start-time publication
TERMINAL_STATE — death or meal-completion commitment and suppression of later ordinary logs
MEAL_ACCOUNTING — meal start and completion semantics, quota contribution, and counter range
RESOURCE_LIFECYCLE — allocation, pthread creation and join, rollback, destruction, and unsafe teardown
TIME_MODEL — clock source, millisecond representation, deadlines, elapsed timestamps, and wait responsiveness

# Commit Classification
| Commit | Subject | Importance | Tags | Summary | Why |
| --- | --- | --- | --- | --- | --- |
| `7974e1e1c4cd` | `docs(readme): 프로젝트 목적과 초기 개발 규약 정의` | C | - | Introduces the initial project goals, public command shape, directory conventions, and intended verification approach. | This is a documentation-only root scaffold. It records the planned scope but establishes no executable mechanism or invariant, and the final documentation later supersedes most of its explanatory value. |
| `cd72d2150f99` | `feat(parse): 철학자 실행 인자 검증` | A | CLI_CONTRACT, EDGE, PRACTICAL | Adds overflow-safe positive-decimal parsing and normalizes the required and optional CLI arguments into `t_config`. | The commit creates the validity boundary before any concurrent resources exist and prevents malformed or overflowing input from entering the runtime. That is significant correctness work, but it does not define the project's central synchronization architecture. |
| `34563a9f6881` | `feat(cli): 입력 계약을 실행 진입점에 연결` | B | CLI_CONTRACT, INTEGRATION | Connects argument parsing to `main`, emits usage on invalid input, and defines the initial process exit behavior. | This is necessary executable integration performed within the parser contract already established by the previous commit. It adds little independent architectural judgment and does not yet run the simulation. |
| `2abcff211110` | `build(philo): 실행 파일 빌드 규약 구성` | B | PRACTICAL | Adds the `philo` Makefile, strict warning flags, pthread compilation and linking, cleanup targets, and generated-file exclusions. | The build contract is competent and necessary for reproducibility, but it supports rather than determines the runtime's concurrency, timing, or lifecycle design. |
| `16343e76b54b` | `feat(init): 테이블 저장소와 철학자 관계 초기화` | S | ARCH, CORE, RESOURCE_LIFECYCLE | Defines `t_table` and `t_philo`, allocates their arrays, and maps neighboring philosophers onto a shared ring of fork objects. | This commit establishes the ownership graph and topology on which every later worker, monitor, synchronization, and cleanup decision depends. Omitting it would leave a major gap in explaining both how forks are shared and who owns the memory borrowed by worker threads. |
| `1d69df7db78c` | `feat(init): 뮤텍스 수명주기와 실패 롤백 구현` | A | RESOURCE_LIFECYCLE, ARCH, RISK | Initializes state, print, and fork mutexes while recording readiness flags and an initialized-fork count for rollback. | The staged ownership ledger is a meaningful lifecycle design and makes partial construction recoverable. It is A rather than S because the local fork rollback still conflicts with the common destructor, so the exact-once guarantee is not complete until a later correction. |
| `509453b01515` | `feat(time): 밀리초 시각 계산 함수 추가` | B | TIME_MODEL, CORE | Centralizes millisecond time acquisition and introduces an interruptible deadline-based sleep loop. | The abstraction is useful core support and enables responsive shutdown, but the first implementation still uses wall time and ignores clock failure. The later monotonic-clock correction carries the stronger project-specific judgment. |
| `033ad537d166` | `feat(log): 상태 로그의 동시 출력 보호` | A | TERMINAL_STATE, CONCURRENCY, ARCH | Adds synchronized terminal-state access, serializes normal logs, and introduces a one-death logging path. | This creates the state and output responsibility boundaries used by the finished design. It remains A because publication of `ended` and acquisition of the print lock are not yet one linearized operation, leaving the terminal-order race fixed later. |
| `b68f40819af4` | `feat(routine): 철학자의 식사·수면·사고 흐름 구현` | S | CORE, CONCURRENCY, FORK_ORDER | Implements the worker cycle, parity-dependent fork acquisition, meal timestamps and counters, sleeping, and thinking. | This is the central Dining Philosophers mechanism. The parity rule breaks the classic circular-wait pattern, and the worker state transitions become the basis for all later edge-case and accounting corrections; the project cannot be explained coherently without it. |
| `40ea0f871300` | `feat(monitor): 사망과 식사 완료 조건 감시` | S | CORE, CONCURRENCY, TERMINAL_STATE | Introduces the main-thread monitor that observes meal progress and starvation to choose the global terminal condition. | The commit establishes one authoritative owner for death and completion policy while workers remain responsible for local progress. That worker-versus-monitor split is a defining architectural decision even though later history strengthens the atomicity of the final decision. |
| `3d5ad3a4a050` | `feat(thread): 철학자 작업 스레드 시작과 종료` | A | CORE, INTEGRATION, RESOURCE_LIFECYCLE | Creates one worker per philosopher, runs the monitor, joins started workers, and handles a partial creation failure. | This is significant integration of the core components, but the orchestration follows a straightforward create-monitor-join structure and still lacks the shared start barrier and join-safety verdict that later commits make project-defining. |
| `aadf07199897` | `feat(main): 입력부터 자원 정리까지 실행 흐름 연결` | B | INTEGRATION, RESOURCE_LIFECYCLE | Connects parse, table initialization, concurrent execution, and table destruction into the normal executable lifecycle. | The commit makes the program usable end to end, but it is normal composition of already introduced subsystems. Its original cleanup path also precedes the later distinction between recoverable errors and unsafe destruction. |
| `c8531c91f0fb` | `fix(single): 철학자가 한 명일 때 포크 재잠금 방지` | A | FORK_ORDER, EDGE, RISK | Adds a one-philosopher path that locks the single fork once and waits for the monitor to report death. | The general ring representation aliases both fork pointers when `N == 1`, so the previous routine deterministically self-deadlocked on a non-recursive mutex. The fix closes a valid-input correctness hole, but it does not change the general multi-worker architecture. |
| `fe0a2d15b29b` | `fix(meals): 식사 제한 도달 시 작업 루프 즉시 중단` | A | MEAL_ACCOUNTING, TERMINAL_STATE, RISK | Commits global meal completion inside the worker's locked completion path and prevents workers from continuing into post-terminal states. | The commit removes a polling gap between the last required meal and `ended`, and prevents unnecessary sleeping or thinking after completion. This is important accounting and terminal correctness, but it refines rather than establishes the overall worker-monitor architecture. |
| `18a0c638113a` | `fix(parse): 밀리초 인자의 상한 적용` | B | CLI_CONTRACT, EDGE | Rejects timing arguments above `INT_MAX` to align them with the public numeric domain. | This is a straightforward boundary correction within the existing parser design. It keeps the public contract consistent but does not introduce a new runtime mechanism or difficult invariant. |
| `a5b6232c55cb` | `fix(cli): 명령행 오류 출력 길이 계산` | C | CLI_CONTRACT | Replaces hard-coded `write` lengths with a local string-length helper for usage and error messages. | The change removes an extra NUL byte from one usage write and reduces maintenance risk, but its behavioral and structural consequence is minor relative to the rest of the project. |
| `bd6bb8eb18f4` | `test(smoke): 주요 입력과 종료 조건 검증` | B | TEST, CLI_CONTRACT, CORE | Adds bounded shell-level checks for invalid input, overflow, the one-philosopher death case, and finite no-death meal runs. | This is the first useful integration suite and catches hangs through timeouts, but it exercises expected public behavior rather than proving one of the project's most difficult concurrency or lifecycle boundaries. |
| `a21e4cc75272` | `fix(time): 짧은 대기 시간의 초과 지연 완화` | B | TIME_MODEL, PRACTICAL | Reduces the sleep polling interval from 500 microseconds to 100 microseconds near a deadline. | The change improves short-duration responsiveness inside the established polling design, but it is a localized precision refinement rather than a new time or synchronization model. |
| `f145d33f2773` | `test(format): 필수 상태 로그 형식 검증` | B | TEST, TERMINAL_STATE | Adds an `awk` validator for the five allowed log forms and applies it to smoke workloads. | The test makes the output grammar executable and prevents accidental extra text, but it is ordinary contract coverage within the already established logging boundary. |
| `10665e0a5bf9` | `fix(init): 포크 초기화 실패 시 중복 정리 방지` | A | RESOURCE_LIFECYCLE, DEBUG, RISK | Removes local fork destruction from initialization failure and makes the common destructor the sole consumer of `fork_count`. | This is a root-cause correction of a double-destroy path and restores the exact-once ownership invariant for partial initialization. It is significant lifecycle debugging, though localized to construction rather than the entire process lifecycle. |
| `800408d6d84e` | `test(init): 부분 뮤텍스 초기화 롤백 검증` | A | TEST, RESOURCE_LIFECYCLE, RISK | Injects a mutex-initialization failure and records destruction addresses to detect duplicate rollback and retained allocations. | The test deterministically locks down the exact-once rollback invariant and verifies cleanup remains idempotent after failure. That is strong regression evidence for a real resource-safety defect, not routine coverage. |
| `5b32d5bdb955` | `fix(time): 단조 시계로 경과 시간 계산` | A | TIME_MODEL, RISK, CORE | Moves elapsed-time state to `int64_t`, replaces wall time with `CLOCK_MONOTONIC`, and treats clock failure as process-fatal. | The commit restores a cross-cutting time invariant for starvation, deadlines, and log offsets, preventing calendar adjustments from fabricating or hiding death. It is significant across several subsystems, but the local time-source decision is not as defining as the ownership, barrier, terminal, or lifecycle architecture. |
| `f01d62cde8ce` | `test(time): 단조 시계와 시계 실패 경로 검증` | B | TEST, TIME_MODEL | Replaces `clock_gettime` to verify the requested clock, millisecond conversion, and fatal failure behavior. | The test directly supports the important monotonic-time correction, but it is focused verification of an established decision rather than an independent architectural contribution. |
| `e7e62cbe185f` | `fix(thread): 시작 장벽으로 기준 시각 통일` | S | START_BARRIER, CONCURRENCY, TIME_MODEL | Adds a condition-variable readiness barrier and publishes one shared `start_ms` and initial `last_meal_ms` value before releasing workers. | This solves the non-obvious mismatch between successful `pthread_create` and actual worker readiness, which could charge late workers for time before they started. It also defines abort behavior for partial creation and wait failures, making it essential to the project's temporal correctness story. |
| `bfbfa0431732` | `test(thread): 지연된 작업자의 공통 시작 시각 검증` | A | TEST, START_BARRIER, EDGE | Delays the fifth worker by 150 milliseconds while requiring all workers to reach readiness and complete their meal target. | The injected skew turns the barrier's purpose into a deterministic regression scenario rather than relying on scheduler luck. It strongly validates an S-level concurrency invariant without itself changing the architecture. |
| `f57f6ec0be87` | `test(thread): 시작 대기 실패 전파 검증` | B | TEST, START_BARRIER, RESOURCE_LIFECYCLE | Injects one worker-side `pthread_cond_wait` failure and checks `run_error`, terminal release, and `PHILO_ERR` propagation. | This is useful failure-path coverage inside the established barrier protocol. It is narrower and less structurally revealing than the delayed-start test or the later lifecycle fault matrix. |
| `a2e90b84641b` | `fix(monitor): 종료 상태와 사망 로그를 원자적으로 확정` | S | TERMINAL_STATE, CONCURRENCY, RISK | Commits completion while state is locked and rechecks death under a common `print_mutex` then `state_mutex` order before emitting the terminal line. | This fixes two project-defining races: a death candidate can become stale before publication, and a normal line can otherwise appear after `died`. The new linearization points and lock order establish the finished one-death, no-post-terminal-log invariant. |
| `c424b7d91ed1` | `test(monitor): 완료 상태와 오래된 사망 판정 검증` | A | TEST, TERMINAL_STATE, DEBUG | Injects state changes at the monitor's unlock boundary to prove completion is committed while locked and stale death candidates are revalidated. | The test deliberately targets the exact interleaving repaired by the preceding S-level fix. It provides strong evidence for the terminal linearization contract and is substantially more meaningful than ordinary output checks. |
| `53e591effb4a` | `fix(routine): 중단된 식사를 완료 횟수에서 제외` | A | MEAL_ACCOUNTING, TERMINAL_STATE, RISK | Makes interruptible sleep report completion and advances meal counters only after a full eating interval while the simulation is still active. | The commit establishes a real transaction boundary between starting to eat and committing a completed meal, preventing terminal interruption from falsely satisfying quotas. This is a significant core invariant, but it refines one operation rather than changing the project-wide architecture. |
| `73b5551a76f4` | `test(routine): 중단된 식사의 카운터 불변식 검증` | B | TEST, MEAL_ACCOUNTING | Substitutes an interrupting sleep and verifies that per-philosopher and global completion counters remain unchanged. | The test is a precise regression check for the meal-transaction fix, but its harness and scope are focused supporting evidence rather than a broader architectural or failure-path contribution. |
| `a7783d04107f` | `fix(lifecycle): 부분 시작과 정리 오류를 호출자에 전파` | S | RESOURCE_LIFECYCLE, RISK, HARD | Adds started and joined thread ledgers, an unsafe-destruction verdict, retryable destroy state, and an `_exit` path when quiescence cannot be proven. | This commit changes cleanup from control-flow convention into an evidence-based safety decision. A failed join means a worker may still borrow table memory, so refusing destruction and terminating without normal teardown is essential to avoiding use-after-free and destruction of live synchronization objects. |
| `7586b605302b` | `test(lifecycle): 생성·결합·정리 실패 경로 검증` | A | TEST, RESOURCE_LIFECYCLE, EDGE | Injects create, join, and destroy failures at multiple positions and checks rollback, unsafe refusal, ledger preservation, and retryability. | The matrix validates the difficult partial-state behavior created by the lifecycle redesign, including zero, prefix, and mid-destruction cases. It materially changes confidence in the S-level safety model without itself defining that model. |
| `37b29557cccc` | `test(main): 결합 실패 시 안전하지 않은 정리 방지` | A | TEST, RESOURCE_LIFECYCLE, RISK | Uses stubs, buffered output, and an `atexit` hook to prove the unsafe path skips destruction and normal process teardown. | The negative assertions verify the exact process-level meaning of `_exit`, not merely a nonzero status. That is important evidence for the lifecycle safety boundary because normal flushing or callbacks are intentionally excluded when a worker may remain active. |
| `3d24bea01441` | `test(concurrency): 철학자별 진행과 종료 로그 불변식 검증` | A | TEST, CONCURRENCY, TERMINAL_STATE | Adds repeated multi-philosopher progress workloads, repeated death workloads, timestamp checks, and a gated logger-versus-death race harness. | The suite stresses the finished lock ordering and terminal contract across realistic schedules and directly overlaps many concurrent log attempts with death publication. It is significant verification, while still remaining empirical rather than a proof of all schedules or fairness. |
| `20f8270c78bb` | `test(tsan): ThreadSanitizer 검증 경로 추가` | A | TEST, CONCURRENCY, PRACTICAL | Adds a capability-probed ThreadSanitizer build and finite, death, and contention workloads with behavioral assertions. | The commit creates a second verification layer for exercised data races and correctly distinguishes unsupported infrastructure from project failure. It is strong engineering for a concurrency project, but it does not establish a runtime mechanism and cannot prove deadlock or all interleavings. |
| `4c224ae86f2b` | `fix(state): 식사 완료 횟수의 정수 범위 확장` | A | MEAL_ACCOUNTING, EDGE, RISK | Widens the internal meal counter to `int64_t` so a philosopher can safely continue beyond an `INT_MAX` public target. | The small diff prevents signed-overflow undefined behavior on a valid execution path and preserves the distinction between the public target and accumulating runtime state. The reasoning is subtle and correctness-relevant, though the boundary is narrower than the central concurrency architecture. |
| `054ef46f80c7` | `test(routine): 최대 목표 이후 식사 카운터 검증` | B | TEST, MEAL_ACCOUNTING, EDGE | Seeds a philosopher at `INT_MAX`, completes one more meal, and verifies `INT_MAX + 1` without a second `full_count` contribution. | The test accurately covers the former overflow boundary and duplicate-threshold risk, but it is focused regression evidence for the preceding numeric fix rather than an independent major decision. |
| `96164b50af2a` | `docs(project): 프로젝트 문서 정리` | B | ARCH, PRACTICAL, LEARNING | Expands the README and adds detailed architecture documents for ownership, fork and terminal state, timing, verification boundaries, and explicit non-guarantees. | The commit changes no executable behavior, so it does not qualify for A or S. It is nevertheless more than minor maintenance: it consolidates the finished lock order, lifecycle verdicts, meal semantics, and verification limits into an accurate technical specification. |

# Development Threads
## Thread: Ownership ledger to unsafe-destruction verdict
`16343e76b54b` S — Establishes the table as the owner of allocations and the ring objects borrowed by philosophers.
↓
`1d69df7db78c` A — Adds staged mutex construction and resource-readiness ledgers, but still splits rollback responsibility.
↓
`10665e0a5bf9` A — Centralizes partial fork rollback in the common destructor and restores exact-once cleanup.
↓
`800408d6d84e` A — Injects initialization failure and proves that each prepared mutex is destroyed once and allocations are released.
↓
`a7783d04107f` S — Extends ownership evidence to worker creation, successful join, destruction permission, retryable cleanup, and `_exit` on unsafe state.
↓
`7586b605302b` A — Exercises create, join, and destroy failures across multiple partial-state positions.
↓
`37b29557cccc` A — Proves the executable does not destroy resources or execute normal stdio and `atexit` teardown after an unsafe join result.

**Significance**
The thread begins with an ownership graph and evolves into a formal destruction verdict. Early initialization uses readiness flags and `fork_count`, then history exposes and removes duplicate rollback ownership. The later lifecycle redesign applies the same principle to threads: shared memory can be destroyed only after successful joins constitute evidence that every borrower is quiescent. The tests verify not merely returned errors but preservation of the ledger and the absence of forbidden cleanup.

## Thread: Wall-clock helper to one shared monotonic start epoch
`509453b01515` B — Centralizes millisecond time and interruptible deadline waits, initially with `gettimeofday`.
↓
`a21e4cc75272` B — Reduces final-interval polling granularity for short waits.
↓
`5b32d5bdb955` A — Replaces wall time with `CLOCK_MONOTONIC`, widens time state, and makes clock failure fatal.
↓
`f01d62cde8ce` B — Verifies the monotonic clock identifier, conversion, and failure exit.
↓
`e7e62cbe185f` S — Adds a readiness barrier and publishes one start timestamp to all workers after they are actually ready.
↓
`bfbfa0431732` A — Deliberately delays one worker and verifies that the shared release prevents pre-start starvation accounting.
↓
`f57f6ec0be87` B — Injects a condition-wait failure and checks that the barrier aborts and propagates the error.

**Significance**
The first time abstraction improves locality but still permits calendar adjustments and sequential-start skew. The monotonic correction protects elapsed-time arithmetic; the barrier then gives that time a valid concurrency meaning by separating “thread object created” from “worker ready.” Together they define the temporal origin used by logs, starvation checks, and sleeps, while the tests distinguish timing correctness from scheduler fairness or strict latency guarantees.

## Thread: Core routine to committed and range-safe meal progress
`b68f40819af4` S — Introduces the eat-sleep-think worker and parity-dependent fork order.
↓
`c8531c91f0fb` A — Handles the ring aliasing edge where one philosopher's two fork pointers are the same mutex.
↓
`fe0a2d15b29b` A — Commits global completion in the final meal critical section and prevents post-completion loop states.
↓
`53e591effb4a` A — Separates an eating attempt from a committed meal and rejects progress after interruption or terminal state.
↓
`73b5551a76f4` B — Injects an interrupted eating wait and verifies that neither local nor global counters advance.
↓
`4c224ae86f2b` A — Widens accumulated meals so a valid `INT_MAX` target can be exceeded without signed overflow.
↓
`054ef46f80c7` B — Verifies `INT_MAX + 1` and confirms the philosopher does not contribute to `full_count` twice.

**Significance**
The initial routine supplies the project's core mechanism but exposes three different semantic boundaries: fork identity at `N == 1`, the exact global-completion transition, and the difference between beginning and completing a meal. Later commits turn meal progress into a synchronized transaction and separate the public target type from the wider accumulating state. The sequence shows how concurrency correctness depends on defining when an operation commits, not merely when it logs or acquires resources.

## Thread: Serialized output to linearized terminal state
`033ad537d166` A — Introduces synchronized terminal-state access and a print mutex, but does not yet couple death publication to final output atomically.
↓
`40ea0f871300` S — Establishes the main-thread monitor as the authority for starvation and global completion.
↓
`a2e90b84641b` S — Rechecks death under `print_mutex → state_mutex`, commits completion while locked, and gives terminal state explicit linearization points.
↓
`c424b7d91ed1` A — Mutates state at the old unlock boundary to prove stale candidates are rejected and completion is already terminal before release.

**Significance**
Simple output serialization is not enough when the output itself represents the terminal decision. The monitor initially identifies candidates under one lock and prints through another, leaving a stale-death and post-death-log window. The correction standardizes lock order, revalidates the predicate, and publishes `ended` with the final line. The deterministic boundary test demonstrates the actual race rather than relying on repeated timing luck.

## Thread: Layered evidence for concurrent behavior
`bd6bb8eb18f4` B — Adds bounded public smoke cases for input, death, and finite completion.
↓
`f145d33f2773` B — Treats the five-line status grammar as an executable output contract.
↓
`3d24bea01441` A — Repeats progress and death schedules and adds a gated logger-versus-death race harness.
↓
`20f8270c78bb` A — Adds capability-probed ThreadSanitizer workloads while retaining semantic log and progress assertions.

**Significance**
The verification strategy grows from public end-to-end behavior to schedule stress and then dynamic data-race detection. Each layer observes a different class of failure: timeouts expose hangs, parsers expose contract violations, repeated workloads expose schedule-sensitive symptoms, and ThreadSanitizer observes exercised memory accesses. The history also preserves the limits of each layer rather than treating one successful run or one sanitizer report as proof of fairness, deadlock freedom, or all possible interleavings.

# Most Important Commits
## feat(init): 테이블 저장소와 철학자 관계 초기화
Commit: `16343e76b54b`
Importance: S
Tags: ARCH, CORE, RESOURCE_LIFECYCLE

### Problem
The simulation needs one durable representation for configuration, global state, philosopher-local state, shared forks, and the addresses that worker threads will later borrow. A fork cannot be copied into each philosopher because neighboring philosophers must contend for the same ownership object.

### Decision
`t_table` becomes the owner of the configuration and the two contiguous arrays, while each `t_philo` stores identity and progress state plus borrowed pointers to its left fork, right fork, and table. The modulo mapping closes the fork array into a ring and makes the last-to-first relationship use the same rule as every other edge.

### Why it mattered
This ownership graph is the substrate for all subsequent synchronization and cleanup. It explains why a worker may dereference table memory until it has been joined, why fork mutexes must live in a stable allocation, and why destruction belongs to the table owner rather than to individual philosophers.

### What changed
The public header gains the central structures and relationships; initialization allocates the fork and philosopher arrays, initializes identifiers and progress fields, maps both fork pointers, and frees partially allocated storage through a common destructor.

### Why this is important for understanding the project
Every later invariant—fork exclusivity, meal state protection, start-time publication, terminal monitoring, join safety, and retryable destruction—refers back to this ownership and borrowing model. It is the first commit that makes the finished architecture recognizable.

## feat(routine): 철학자의 식사·수면·사고 흐름 구현
Commit: `b68f40819af4`
Importance: S
Tags: CORE, CONCURRENCY, FORK_ORDER

### Problem
The project requires concurrent philosopher workers to acquire two shared forks, update starvation state, complete meals, and continue through sleep and thought without falling into the classic circular wait where every worker holds one fork and waits for the next.

### Decision
Each worker follows one local routine, but fork acquisition order depends on philosopher parity: odd identifiers lock left then right, and even identifiers lock right then left. Meal timestamps and counters are updated under the shared state mutex, and a short initial delay reduces immediate even-worker contention without being treated as a fairness guarantee.

### Why it mattered
The parity rule removes the uniform lock-order cycle that would make deadlock structurally possible in the ring. The commit also establishes which state belongs to worker execution and which observations the monitor can later trust. Subsequent fixes refine edge cases, but they all operate on the mechanism introduced here.

### What changed
`routine.c` is added with fork acquisition and release helpers, meal-start and meal-completion updates, the eating operation, and the long-running eat-sleep-think loop. The build and public interface are extended to include the worker entry point.

### Why this is important for understanding the project
This is the implementation of the domain problem itself. It explains the fork lock graph, the source of `last_meal_ms` and `meals`, and the worker side of the worker-monitor split.

## feat(monitor): 사망과 식사 완료 조건 감시
Commit: `40ea0f871300`
Importance: S
Tags: CORE, CONCURRENCY, TERMINAL_STATE

### Problem
Local worker progress is not sufficient to decide when the simulation as a whole ends. Death depends on elapsed time since each worker's last meal, while optional completion depends on all philosophers reaching a target. Allowing every worker to make peer-death decisions would duplicate global policy and complicate terminal coordination.

### Decision
The calling thread remains an authoritative monitor. It polls under `state_mutex`, checks the global completion predicate, scans philosopher starvation references, and triggers one terminal path while workers continue to own only their local routine and state updates.

### Why it mattered
This separates state production from terminal policy. Workers publish synchronized facts; one observer interprets them for the whole simulation. That responsibility boundary makes later stale-candidate revalidation and terminal-log linearization possible without distributing death logic across all workers.

### What changed
A monitor translation unit and public entry point are added. The monitor checks `full_count`, locates a philosopher whose starvation duration reaches `time_to_die`, invokes the death path, and yields between scans to avoid a continuous busy loop.

### Why this is important for understanding the project
The finished program is not merely a set of independent worker loops. It is a worker system supervised by an authoritative main-thread monitor, and most of the later concurrency corrections protect the boundary introduced by this commit.

## fix(time): 단조 시계로 경과 시간 계산
Commit: `5b32d5bdb955`
Importance: A
Tags: TIME_MODEL, RISK, CORE

### Problem
`gettimeofday` measures civil wall time. Calendar corrections can move it backward or forward, which can produce negative or inflated log offsets, extend or shorten waits, and falsely create or hide starvation. The initial use of host `long` also leaves the time representation platform-dependent, and clock failure is ignored.

### Decision
All runtime time state moves to `int64_t`, and `philo_now_ms` uses `clock_gettime(CLOCK_MONOTONIC)`. Failure to obtain the clock is treated as process-fatal because the simulation cannot safely substitute a timestamp while preserving its death and ordering semantics.

### Why it mattered
Starvation is an elapsed-time property, not a calendar-time property. The correction gives deadlines, `start_ms`, `last_meal_ms`, and log offsets one stable ordering domain and prevents external clock administration from changing simulation truth.

### What changed
The header, parser, monitor, logger, and time helpers are updated to use fixed-width millisecond values. The time implementation converts monotonic seconds and nanoseconds and writes an error before `_exit` when the clock is unavailable.

### Why this is important for understanding the project
The start barrier and terminal monitor are meaningful only if all participants compare time from a monotonic source. This A-level commit explains the time model that underlies several S-level concurrency decisions.

## fix(thread): 시작 장벽으로 기준 시각 통일
Commit: `e7e62cbe185f`
Importance: S
Tags: START_BARRIER, CONCURRENCY, TIME_MODEL

### Problem
Sequential `pthread_create` calls do not mean sequentially created workers have begun executing. If `start_ms` and `last_meal_ms` are assigned before every worker reaches its routine, a delayed worker can be charged for time during which it was not ready and may be declared dead before receiving a fair start. Partial creation or a failed condition wait can also strand workers behind an unreleased predicate.

### Decision
Workers increment `ready_count` and wait on `start_cond` under `state_mutex`. The coordinator waits for all intended workers, samples one monotonic timestamp, assigns it to the table and every philosopher, sets `start_released`, and broadcasts. Abort paths set terminal and release predicates without waiting for an impossible full-ready count.

### Why it mattered
The commit creates a clear linearization point for the beginning of the simulation. It converts “worker created” into “worker ready and sharing the same temporal origin,” while integrating failure handling so the barrier cannot turn a partial start into a deadlock.

### What changed
The table gains condition-variable readiness state and `run_error`; initialization and destruction manage the condition variable; routines wait before any fork activity; and `philo_run` coordinates normal release or abort before monitoring and joining.

### Why this is important for understanding the project
The barrier is where thread lifecycle, time semantics, and starvation correctness meet. It is one of the clearest examples in the history of a concurrency bug being solved by changing the state protocol rather than tuning delays.

## fix(monitor): 종료 상태와 사망 로그를 원자적으로 확정
Commit: `a2e90b84641b`
Importance: S
Tags: TERMINAL_STATE, CONCURRENCY, RISK

### Problem
The monitor originally selected a death candidate under `state_mutex`, released that lock, and later published death through a separate print path. The candidate could begin a meal in that interval, making the decision stale. Separately, a normal logger could pass its terminal check before death was published and emit a status line after `died`.

### Decision
Completion is committed while the state predicate is still locked. Death moves to `philo_try_log_death`, which acquires `print_mutex` before `state_mutex`, obtains a fresh monotonic time, rechecks `!ended` and the latest `last_meal_ms`, sets `ended`, and emits the death line while still holding the output serialization boundary.

### Why it mattered
The new lock order and recheck define the linearization point for terminal state. A stale candidate is discarded, exactly one path can commit death, and a logger arriving after that commit observes `ended` inside the print boundary and suppresses ordinary output.

### What changed
The monitor loop checks terminal and completion directly while locked and calls a boolean death-attempt function for candidates. The state module replaces the older death logger with the revalidating, serialized terminal transaction.

### Why this is important for understanding the project
This is the key correction that turns several individually synchronized operations into one coherent terminal contract. It explains both the final lock order and the guarantee that `died` is the last successful status attempt.

## fix(routine): 중단된 식사를 완료 횟수에서 제외
Commit: `53e591effb4a`
Importance: A
Tags: MEAL_ACCOUNTING, TERMINAL_STATE, RISK

### Problem
The deadline wait was interruptible but returned no result. A worker whose eating interval ended early because another path set `ended` still executed the meal-completion increment, allowing an interrupted operation to change local and global quota state after the simulation was already terminal.

### Decision
`philo_sleep_ms` now distinguishes reaching the deadline from observing termination. `eat_once` treats a failed wait or a terminal state at the synchronized completion point as an aborted meal, releases both forks, and returns without changing `meals` or `full_count`.

### Why it mattered
This defines meal completion as a commit, not as an intention or log event. The semantics are essential because global completion derives from meal counters; counting interrupted work could prematurely satisfy the optional target or mutate state after death.

### What changed
The sleep API returns `PHILO_OK` or `PHILO_ERR`; `record_meal_done` rechecks `ended`; and all aborted eating paths release the acquired fork mutexes before leaving the routine.

### Why this is important for understanding the project
The commit reveals a broader concurrency lesson in the project: operations that span waiting and shared state need an explicit commit boundary. It complements the terminal-state linearization work by defining when worker progress becomes authoritative.

## fix(lifecycle): 부분 시작과 정리 오류를 호출자에 전파
Commit: `a7783d04107f`
Importance: S
Tags: RESOURCE_LIFECYCLE, RISK, HARD

### Problem
Thread creation, joining, and synchronization destruction can fail after the table has become partially live. In particular, a failed `pthread_join` does not prove that the worker stopped; freeing the table or destroying its mutexes may therefore race with a still-running borrower. Returning an ordinary error and running normal cleanup is unsafe.

### Decision
The table records `threads_started`, `threads_joined`, and `destroy_safe`. Every started handle is visited, but only successful joins increase the quiescence ledger. Any join failure produces `PHILO_UNSAFE`; the destructor refuses to touch resources without a safe verdict; and `main` writes a direct diagnostic then uses `_exit` rather than normal cleanup. Resource destruction also updates ledgers only after success so explicit teardown can be retried.

### Why it mattered
The commit distinguishes error reporting from lifetime safety. It makes successful join the evidence that borrowed addresses are no longer in use and gives unsafe state higher precedence than ordinary creation or barrier errors. This prevents use-after-free and destruction of live synchronization objects on the most dangerous failure path.

### What changed
The public status model gains `PHILO_UNSAFE`; initialization establishes lifecycle ledgers; `join_started` returns a verdict; `philo_run` propagates unsafe status; `philo_table_destroy` checks quiescence and preserves retry state; and `main` separates recoverable cleanup from immediate process termination.

### Why this is important for understanding the project
This is the culmination of the ownership model introduced near the start of the history. It explains why cleanup is permitted by evidence rather than by control flow and why the program intentionally abandons graceful teardown when it cannot prove worker termination.
