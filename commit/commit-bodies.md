## feat(parse): 철학자 실행 인자 검증
The command-line contract is represented as a dedicated `t_config` value and enforced before any concurrent state is created. `philo_parse_args` accepts only the required four numeric arguments plus the optional meal target, distinguishes an omitted target with `has_meal_limit`, and stores the normalized values in fields that later runtime code can consume without reparsing text.

The numeric helper performs validation as part of conversion rather than calling a permissive library routine and checking afterward. It allows one leading `+`, rejects empty strings, signs without digits, non-decimal characters, zero, and negative forms, and checks the next multiplication and addition against the destination range before executing them. This makes overflow rejection deterministic and avoids depending on wrapped arithmetic or implementation-specific conversion behavior.

The philosopher count is constrained to the project limit of 200, while the optional meal target is constrained to `INT_MAX` before narrowing to `int`. Keeping invalid input outside the initialized simulation establishes an important boundary: all later code may assume a positive philosopher count, positive timing values, and a well-formed optional completion target.

## feat(cli): 입력 계약을 실행 진입점에 연결
The executable entry point now treats parsing as the first gate in the program lifecycle. Invalid input produces the full usage contract on standard error and returns a nonzero status; valid input reaches a clean success path without exposing partially interpreted values to later code.

At this stage the parsed configuration is intentionally not yet executed, but wiring it through `main` establishes the public behavior of the binary independently of the forthcoming table and thread implementation. The separation also keeps argument validation testable without requiring synchronization resources or worker creation.

## build(philo): 실행 파일 빌드 규약 구성
The project gains a reproducible build definition for the required `philo` executable. Every translation unit is compiled with `-Wall`, `-Wextra`, and `-Werror`, and `-pthread` is applied through the same flag set so both compilation and linking use the POSIX thread model expected by the source.

Objects are isolated under `.obj` through a pattern rule, and `clean`, `fclean`, and `re` make the generated-state transitions explicit. The `bonus` target fails deliberately rather than silently pretending that an unsupported variant exists. Generated binaries, objects, dependency artifacts, and local filesystem noise are also excluded from version control, keeping the repository state distinct from build output.

## feat(init): 테이블 저장소와 철학자 관계 초기화
The simulation is given an explicit ownership model. `t_table` owns the immutable runtime configuration, global termination and meal-completion state, synchronization objects, the fork array, and the philosopher array. Each `t_philo` owns its identity and per-worker progress fields while retaining pointers to its two forks and back to the shared table.

Fork relationships are materialized as a ring: philosopher `i` receives `forks[i]` on the left and `forks[(i + 1) % number]` on the right. This representation makes shared ownership visible in the data model—neighboring philosophers refer to the same mutex object instead of carrying copied fork state—and the modulo edge closes the table without a special last-philosopher case.

The two arrays are allocated contiguously and initialized before execution begins. Allocation failure is routed through the table destructor, which frees whichever allocations succeeded and nulls the released pointers. At this point the commit establishes storage and topology; synchronization initialization is added separately so resource construction can evolve in well-defined stages.

## feat(init): 뮤텍스 수명주기와 실패 롤백 구현
The table initializer now constructs the synchronization resources required by the shared-state design: one state mutex, one output mutex, and one mutex per fork. Readiness flags and `fork_count` record which objects have successfully crossed their initialization boundary, allowing the common destructor to avoid operating on objects that were never initialized.

Initialization is ordered so each successful step extends the table's ownership ledger. Any later failure invokes the same table-level rollback path, while normal destruction walks the initialized fork range and then releases the shared mutexes before freeing their backing arrays. This is the right general model for partial construction: cleanup must be driven by recorded ownership, not by the requested final configuration.

The initial fork helper nevertheless also destroys previously initialized forks locally when a later fork initialization fails, while leaving `fork_count` unchanged for the common destructor. That duplicates cleanup responsibility and permits a second destruction attempt during rollback. The history later removes the local destruction and makes the ledger-driven destructor the sole owner of rollback; this commit is therefore the foundational lifecycle step, but not yet the final exact-once implementation.

## feat(time): 밀리초 시각 계산 함수 추가
Timing is centralized behind `philo_now_ms` and `philo_sleep_ms` rather than distributed through worker and monitor code. The current time is converted to integer milliseconds, giving the simulation one representation for start times, meal deadlines, log timestamps, and configured durations.

Sleeping is implemented as a deadline loop instead of one uninterruptible delay. Each iteration checks the shared terminal flag under `state_mutex`, exits early when the simulation ends, and otherwise yields with a 500-microsecond `usleep`. That choice trades some polling overhead for responsive shutdown: a worker should not keep sleeping for an entire configured interval after another thread has established a terminal condition.

At this historical point the clock is `gettimeofday`, so elapsed-time calculations still inherit wall-clock adjustments and the call's failure is not handled. A later timing correction replaces it with a monotonic source; the abstraction introduced here makes that replacement local rather than requiring changes throughout the simulation.

## feat(log): 상태 로그의 동시 출력 보호
Shared termination access and output serialization are moved behind a small state API. `philo_has_ended` and `philo_finish` read or publish the terminal flag while holding `state_mutex`, so worker and monitor code no longer accesses that flag without synchronization.

Normal status messages acquire `print_mutex`, recheck termination, compute a timestamp relative to the table start, and emit one complete line. Holding the print mutex across the check and `printf` prevents multiple workers from interleaving fields from different messages and suppresses ordinary logs observed after termination. The dedicated death path also changes `ended` only once and uses a guard to ensure at most one caller prints `died`.

The terminal transition and death output are not yet one atomic logging transaction: the death path releases `state_mutex` before acquiring `print_mutex`. A normal logger that already holds the print lock can therefore pass its termination check before death is published and print while the death path is waiting. Later history revalidates death under a common lock order and serializes terminal publication with the final line; this commit establishes the output boundary that makes that stronger invariant possible.

## feat(routine): 철학자의 식사·수면·사고 흐름 구현
The worker routine now implements the simulation's core cycle. A philosopher acquires two fork mutexes, records the meal start under the shared state lock, logs eating, waits for the configured eating interval, records meal completion, releases both forks, then proceeds through sleeping and thinking until the terminal flag is observed.

Fork acquisition order depends on philosopher parity: even identifiers take right then left, while odd identifiers take left then right. This breaks the single circular wait order that would arise if every worker acquired its left fork first, preventing the classic all-workers-hold-one-fork deadlock. A one-millisecond initial delay for even workers also reduces immediate contention, but it is a scheduling aid rather than a fairness guarantee.

Meal timing and completion counters are synchronized with `state_mutex`. Updating `last_meal_ms` at the start of eating gives the monitor a consistent starvation reference, while incrementing `full_count` only when a philosopher's own counter is exactly equal to `must_eat` ensures that each philosopher contributes at most once to global completion.

The initial routine assumes that left and right forks are distinct and treats the return from the interruptible wait as irrelevant, because the wait does not yet report completion status. Consequently, one philosopher would attempt to lock the same non-recursive mutex twice, and a meal interrupted by global termination would still be counted as completed. Both assumptions are corrected by later commits; they are important historical boundaries of this first complete worker mechanism.

## feat(monitor): 사망과 식사 완료 조건 감시
The main execution thread gains an authoritative monitor loop for global termination. While workers update their own meal timestamps and counters, the monitor inspects those values under `state_mutex`, ends the run when every philosopher has reached the optional meal target, or selects the first philosopher whose elapsed time since the last meal reaches `time_to_die`.

This division keeps terminal policy out of individual workers. A worker does not decide that another worker is dead, and global meal completion is derived from the shared `full_count` rather than by unsynchronized per-thread observation. Polling every 500 microseconds balances detection latency against a continuously busy monitor loop.

The first implementation still separates observation from commitment. Completion is detected under the lock but `philo_finish` is called only after unlocking, and a death candidate is selected using a sampled time before being logged outside the state critical section. Those gaps allow state to change between the decision and terminal publication. Later history moves completion commitment under the lock and rechecks death immediately before publishing and printing it.

## feat(thread): 철학자 작업 스레드 시작과 종료
`philo_run` becomes the owner of worker creation, monitoring, and joining. It records a simulation start time, initializes each philosopher's starvation reference, creates one thread per philosopher, runs the monitor in the calling thread after all creations succeed, and joins every worker before returning.

The partial-creation path publishes termination and joins only the threads that were actually started. This is a necessary resource boundary: table storage and synchronization objects cannot be destroyed while a successfully created worker may still dereference them. Returning an error only after the started subset has been joined makes the ordinary failure path safe for the caller to clean up.

At this stage the start timestamp is captured before the creation loop and each worker can begin as soon as its individual `pthread_create` returns. Later workers therefore lose part of their death budget to thread-creation latency, and join errors are ignored. The later start barrier and lifecycle ledger address those two assumptions without changing the orchestration responsibility introduced here.

## feat(main): 입력부터 자원 정리까지 실행 흐름 연결
The executable now connects the complete normal lifecycle: parse configuration, initialize the table, run the concurrent simulation, and destroy table resources. Each stage has a distinct failure message and a nonzero exit status, while both successful execution and an ordinary runtime failure pass through table cleanup.

This makes `main` the owner of process-level sequencing rather than embedding allocation or thread policy in the parser or workers. The resulting contract is simple: initialization either returns a usable table or has already rolled back; execution returns only after workers are presumed finished; destruction releases the table's owned resources.

That final presumption is still stronger than the implementation can guarantee because join failures are not yet reported. Later lifecycle hardening introduces an explicit unsafe status and prevents destruction when a worker may still be running. This commit nevertheless establishes the top-level responsibility boundary that the later error model refines.

## fix(single): 철학자가 한 명일 때 포크 재잠금 방지
With one philosopher, the ring mapping makes `left_fork` and `right_fork` point to the same mutex. The normal acquisition routine would therefore lock a non-recursive mutex and then attempt to lock it again from the same thread, blocking forever before the monitor could complete the required death scenario.

A dedicated single-philosopher path now locks the only fork once, emits the one possible fork-acquisition event, waits slightly beyond `time_to_die`, releases the fork, and returns. The monitor remains responsible for detecting and logging death, preserving the same authority boundary used for multi-worker runs.

The special case models the actual resource constraint rather than fabricating a second fork or bypassing locking entirely: one philosopher can take one fork but can never begin a meal. The interruptible wait also allows an externally established terminal state to release the worker promptly.

## fix(meals): 식사 제한 도달 시 작업 루프 즉시 중단
Meal-limit completion is now committed by the worker that records the final required meal. While holding `state_mutex`, `record_meal_done` increments the philosopher's counter, contributes to `full_count` exactly at the threshold, and sets `ended` as soon as all philosophers have contributed. This removes the monitor's polling delay from the completion transition.

`eat_once` becomes a status-returning operation and rechecks termination after both forks have been acquired. If another worker completed the simulation while this worker was blocked on a fork, it releases both resources without beginning another meal. The routine also rechecks termination after a completed meal so it does not log sleeping or thinking after the global meal target has been reached.

The change strengthens the boundary between an in-progress cycle and a permitted next state: ownership of forks alone does not authorize a new meal after termination. At this point an eating delay interrupted by termination is still followed by counter advancement; the later interrupted-meal correction makes completion itself conditional on the whole eating interval finishing.

## fix(parse): 밀리초 인자의 상한 적용
The three timing arguments are now rejected when they exceed `INT_MAX`, matching the accepted public input range already applied to the optional meal target. Parsing still uses a wider intermediate type, so syntactically valid but out-of-domain values are rejected explicitly rather than being narrowed or accepted merely because the host `long` can represent them.

This separates numeric parsing capacity from the application's supported contract. The converter can detect overflow safely across the wider representation, while the simulation receives only durations within its specified operational range. That bound also reduces the risk of extreme deadline arithmetic and platform-dependent behavior in downstream timing code.

## fix(cli): 명령행 오류 출력 길이 계산
Error output no longer relies on manually maintained byte counts. A local string-length helper and `put_error` wrapper compute the exact size of each message before writing it to standard error, and the same path is used for usage, initialization, and runtime failures.

This removes a hidden coupling between string literals and numeric constants. Changing message wording can no longer silently truncate output or ask `write` to read past a literal's meaningful bytes. Centralizing unbuffered error output also keeps process-failure reporting independent of standard-output buffering.

## test(smoke): 주요 입력과 종료 조건 검증
A portable shell smoke suite is attached to `make test` and exercises the executable through its public command-line and output interfaces. Temporary output is isolated and removed through a trap, while each potentially blocking simulation is guarded by a separate timeout process so a deadlock or missed terminal condition becomes a bounded test failure.

The suite covers invalid philosopher counts and numeric overflow, verifies that the one-philosopher case emits both fork acquisition and death, and checks two finite meal schedules for clean completion without death. Meal assertions use minimum counts rather than requiring one exact interleaving, which is appropriate for scheduler-dependent execution while still proving that every run reached the intended global work threshold.

These are black-box checks: they verify observable parsing, termination, and progress contracts without assuming internal lock order. They do not by themselves prove race freedom or all possible schedules, but they establish a repeatable baseline that later deterministic failure-injection and concurrency tests can extend.

## fix(time): 짧은 대기 시간의 초과 지연 완화
The interruptible sleep loop now adjusts its polling interval as the deadline approaches. It continues to sleep for 500 microseconds while more than one millisecond remains, but switches to 100-microsecond pauses for the final interval.

This reduces overshoot for short configured durations and near-deadline wakeups without paying the highest polling frequency for the entire wait. The function still checks global termination on every iteration, so responsiveness to shutdown is preserved while timing precision is improved where the fixed 500-microsecond quantum was proportionally large.

The implementation remains a cooperative polling sleep rather than a real-time guarantee: scheduler latency can still delay wakeup. The change narrows avoidable delay introduced by the program itself, which is the property the implementation can control.

## test(format): 필수 상태 로그 형식 검증
The smoke suite now treats the textual log grammar as an executable contract. An `awk` validator accepts only lines containing a numeric timestamp, a positive philosopher identifier, and one of the five required status phrases, rejecting every other line.

Applying the validator to single-philosopher, finite-meal, and larger no-death runs detects malformed formatting as well as output corruption caused by interleaved writes. This complements content assertions: a run can no longer pass merely because it contains an expected substring while also emitting broken or unexpected lines.

The check deliberately validates syntax rather than a specific event order, since valid thread schedules may interleave actions differently. Later concurrency tests add timestamp ordering and terminal-line properties on top of this foundational format contract.

## fix(init): 포크 초기화 실패 시 중복 정리 방지
Fork rollback is centralized in `philo_table_destroy`. The fork initialization helper now reports failure without destroying anything itself, leaving `fork_count` as the single authoritative record of successfully initialized fork mutexes. The destructor consumes that count in reverse order and resets readiness flags after releasing the shared mutexes.

This restores exact ownership semantics: each initialized synchronization object has one cleanup owner and is destroyed at most once. Reverse consumption also keeps the ledger consistent with partial progress, and resetting flags and counts makes a second cleanup call observe an already-released table instead of replaying destruction.

The correction addresses the earlier split-responsibility design in which both the helper and the table destructor could operate on the same fork mutexes. A common rollback path is more than code reuse here; it is the mechanism that enforces exact-once release after any initialization boundary.

## test(init): 부분 뮤텍스 초기화 롤백 검증
A deterministic failure-injection test replaces `pthread_mutex_init` and `pthread_mutex_destroy` while compiling the initializer. The fourth initialization call is forced to fail after three mutexes have succeeded, and every destruction address is recorded so duplicate release can be detected directly.

The test asserts that initialization reports failure, exactly the three owned mutexes are destroyed, both allocated arrays are released and nulled, and calling the table destructor again performs no additional destruction. This verifies the rollback ledger rather than relying on a naturally occurring allocation or pthread failure that would be difficult to reproduce.

By interposing only the synchronization APIs at compile time, the test exercises the production initialization and cleanup code without adding test branches to it. It locks down both exact-once resource release and post-failure idempotence.

## fix(time): 단조 시계로 경과 시간 계산
Elapsed-time measurement is moved from wall time to `clock_gettime(CLOCK_MONOTONIC)`. Simulation start times, last-meal times, deadlines, and log offsets now share a clock that is not adjusted by changes to the system calendar, preventing backward jumps or sudden forward corrections from fabricating starvation or extending waits.

Timing fields and parser intermediates are converted to `int64_t`, and log formatting casts those fixed-width values explicitly. This makes the intended numeric range independent of whether the platform's `long` is 32 or 64 bits and keeps millisecond arithmetic consistent across the parser, monitor, state logger, and sleeper.

Failure to obtain the monotonic clock is treated as process-fatal. The code writes a fixed error with the async-simple `write` interface and calls `_exit`, because every worker and monitor decision depends on the same time source; continuing with an invented timestamp or attempting ordinary cross-thread unwinding would make the simulation's correctness undefined.

## test(time): 단조 시계와 시계 실패 경로 검증
The timing abstraction is tested by replacing `clock_gettime` during compilation. The successful stub records the requested clock identifier and returns a known `timespec`, allowing the test to verify both the use of `CLOCK_MONOTONIC` and the exact conversion of seconds and nanoseconds to milliseconds.

The fatal branch is exercised in a child process. The stub is switched to failure, `philo_now_ms` is invoked, and the parent requires the child to terminate with `PHILO_ERR`. Forking isolates the intentional `_exit` so the test runner can inspect the process-level contract rather than terminating itself.

Together, these checks protect both halves of the timing decision: elapsed time must come from the correct clock domain, and absence of that clock must stop execution instead of returning an unchecked or stale value.

## fix(thread): 시작 장벽으로 기준 시각 통일
Worker startup is converted into a condition-variable barrier. Each worker acquires `state_mutex`, increments `ready_count`, notifies the coordinator, and waits in a predicate loop until `start_released` becomes true. The coordinator waits until all successfully created workers are ready, then samples one monotonic start time, assigns it to the table and every philosopher's `last_meal_ms`, and broadcasts the release.

This changes the meaning of the death budget. Thread creation and scheduler delay before barrier arrival no longer count as starvation time for earlier workers, and no worker can begin fork acquisition before all workers share the same temporal origin. Initial state publication and barrier release occur under the state lock, so workers cannot observe a released barrier with partially initialized meal timestamps.

The barrier also participates in failure recovery. If thread creation fails, already-created workers are released into an ended state so they can return and be joined. If a condition wait fails in either worker or coordinator code, `run_error`, `ended`, and `start_released` are published and peers are broadcast rather than left blocked indefinitely.

A readiness count plus predicate loop is used instead of assuming that one condition signal corresponds to one state transition. This is essential because condition variables permit spurious wakeups and because broadcasts are notifications, not stored events.

## test(thread): 지연된 작업자의 공통 시작 시각 검증
The start barrier is tested against deliberately skewed worker startup. `pthread_create` is wrapped so all created threads wait behind a test gate, the fifth worker then incurs an additional 150-millisecond delay, and the real routines are released only after all five thread objects exist.

The configured `time_to_die` is 80 milliseconds—shorter than the injected delay—so an implementation that starts the death clock before every worker reaches the barrier would report a false death. The test instead requires a successful one-meal completion by all five philosophers and confirms that `ready_count` reached the full worker count.

This constructs the scheduler condition the barrier is meant to neutralize without depending on chance. The passing property is not merely that threads eventually start, but that creation latency is excluded from the shared simulation epoch.

## test(thread): 시작 대기 실패 전파 검증
A worker-side condition wait failure is injected by replacing the first `pthread_cond_wait` call in the routine object with an `EINVAL` result. Access to the one-shot injection flag is itself mutex-protected so the test does not introduce an unrelated race while multiple workers reach the barrier.

The run must return `PHILO_ERR`, preserve `run_error`, release all peers, and finish within an external timeout. These assertions verify that a barrier API failure is promoted to the run-level error contract rather than being swallowed, misreported as normal completion, or leaving other workers permanently asleep.

Subsequent condition waits delegate to the real pthread function, so the test isolates one failed wait while retaining the production synchronization behavior around it.

## fix(monitor): 종료 상태와 사망 로그를 원자적으로 확정
Terminal-state publication is given explicit linearization points. Meal completion is now checked and committed while `state_mutex` is still held, so another thread cannot observe the completed global predicate while `ended` remains false.

Death detection becomes a two-stage operation. The monitor may identify a candidate from a sampled scan, but `philo_try_log_death` acquires `print_mutex` and then `state_mutex`, samples the current monotonic time again, and revalidates both the terminal flag and the candidate's latest meal timestamp. Only a still-valid death sets `ended`, computes the timestamp, and emits `died`.

Using the same nested lock order as ordinary logging—print first, state second—serializes the terminal transition with output. Once death is committed, no normal logger can pass its state check and print afterward; once a normal logger owns the print lock, its complete line precedes the death transaction. The death line is therefore unique and terminal rather than merely likely to be last.

Revalidation also prevents a stale candidate from killing a philosopher who began eating after the monitor's initial scan. The monitor's scan is now advisory; correctness is decided at the synchronized commit point.

## test(monitor): 완료 상태와 오래된 사망 판정 검증
The monitor's terminal invariants are exercised with synchronization-boundary injection rather than timing luck. A wrapped mutex unlock observes whether meal-limit completion has already set `ended` before the state critical section is released, proving that predicate evaluation and terminal publication form one transaction.

A second mode begins with an apparently dead philosopher, then uses the same boundary hook to update `last_meal_ms` and mark meal completion after the monitor's initial observation. The monitor must recheck the candidate, finish through the valid completion state, and emit no stale death line.

This test targets the exact race window closed by the implementation. It does not merely run the simulation repeatedly; it forces state to change between candidate discovery and terminal commitment, demonstrating that the final decision uses current synchronized data.

## fix(routine): 중단된 식사를 완료 횟수에서 제외
`philo_sleep_ms` now reports whether its deadline was reached or the wait ended because the simulation became terminal. Eating uses that result as part of its operation contract: if the eating interval is interrupted, the worker releases both forks and returns without advancing any meal counter.

`record_meal_done` also rechecks `ended` while holding `state_mutex` immediately before mutation. This covers the race in which the sleep reaches its deadline but another thread commits termination before the counter update. A meal is therefore counted only when the configured duration completed and the simulation was still active at the synchronized completion point.

All failure exits release both fork mutexes, preserving the resource-ownership invariant even when the logical operation cannot commit. The distinction between “started eating” and “completed a meal” is now explicit; logging the start and acquiring resources are not sufficient evidence for quota accounting.

## test(routine): 중단된 식사의 카운터 불변식 검증
The interrupted-meal path is made deterministic by replacing `philo_sleep_ms` in the routine object. The stub publishes `ended`, reports `PHILO_ERR`, and records that the interruption occurred while the production routine still performs real fork locking and state updates around it.

A directly invoked worker is placed past the start barrier with zero meals and zero global completions. After the injected interruption, the test requires both counters to remain zero. This locks down the semantic invariant that only a fully completed eating interval contributes to per-philosopher or global meal progress.

Direct invocation avoids scheduler variability and focuses the test on the transaction boundary inside `eat_once`; a shell-level count alone could not distinguish a correctly rejected interrupted meal from an interleaving that never reached the relevant code.

## fix(lifecycle): 부분 시작과 정리 오류를 호출자에 전파
Thread and synchronization teardown now have an explicit safety model. The table records how many workers were successfully started, how many were successfully joined, and whether destruction remains safe. `join_started` attempts every recorded join, increments the ledger only for successful joins, and returns `PHILO_UNSAFE` if any worker cannot be proven quiescent.

`philo_table_destroy` refuses to release shared memory or synchronization objects when the ledger shows an unjoined worker or `destroy_safe` has been cleared. This is stricter than treating join failure as an ordinary error: a worker may still access forks, state, or philosopher storage, so freeing those resources would create use-after-free and destruction-of-live-mutex hazards.

Destruction failures are also propagated. The destructor decrements a resource ledger or clears a readiness flag only after the corresponding pthread destruction succeeds, leaving the remaining state available for a retry instead of pretending cleanup completed. Ordinary initialization and run failures can therefore be reported without losing track of owned resources.

`main` distinguishes the unsafe status from recoverable errors. On a join failure it writes an unbuffered diagnostic and calls `_exit`, deliberately bypassing table destruction, standard I/O flushing, and normal exit handlers because those paths may touch process state while a worker remains live. For safe run failures, cleanup is still attempted and cleanup failure is reported separately.

This commit turns lifecycle counters into correctness evidence: destruction is authorized by proven thread quiescence, not by control flow merely having reached the end of `philo_run`.

## test(lifecycle): 생성·결합·정리 실패 경로 검증
Lifecycle failures are tested through wrappers around thread creation, thread joining, and mutex destruction. Creation is forced to fail at each position in a three-worker run, and the test requires exactly the successfully started prefix to be joined before the run returns an ordinary error.

Join failures exercise the unsafe branch. Even though joining continues for the other workers, the failed worker remains recorded as unjoined; table destruction must return `PHILO_UNSAFE` without changing fork pointers, fork counts, or destruction-call counts. The test then joins that worker through the real API, repairs the test ledger, and confirms cleanup becomes legal.

Destructor failures are injected at different stages of reverse cleanup. After each failure, the backing allocations and remaining ledger values must still describe what is owned, and a second call without injection must complete successfully. This verifies retryability rather than only error reporting.

By covering failures at multiple indices, the suite checks boundary arithmetic as well as the broad policy: zero, partial, and nearly complete construction or teardown must all leave a truthful ownership record.

## test(main): 결합 실패 시 안전하지 않은 정리 방지
The process-level unsafe path is isolated by replacing parsing, initialization, execution, and destruction around the real `main`. The run stub emits buffered standard output and returns `PHILO_UNSAFE`; parsing also registers an `atexit` hook, while the destroy stub would print a visible marker if called.

The launched test process must fail, emit the unbuffered join diagnostic, and contain none of the destroy marker, buffered output, or normal exit-hook output. These negative assertions demonstrate that `main` calls `_exit` directly rather than returning from `main` or invoking `exit`.

That distinction is the safety property under test. Avoiding table destruction alone is insufficient if ordinary process teardown can flush shared library state or execute callbacks under assumptions that all worker threads have stopped.

## test(concurrency): 철학자별 진행과 종료 로그 불변식 검증
A dedicated concurrency suite broadens verification from individual failure paths to repeated observable schedules. Finite runs with 2, 5, and 17 philosophers must terminate without death and show every philosopher reaching the meal target. An additional seven-philosopher workload is repeated several times to expose schedule-sensitive progress failures.

Death workloads are repeated separately and must contain exactly one `died` line with no line after it. Every log is checked for the required grammar and nondecreasing timestamps, so output serialization, monotonic elapsed time, and terminal ordering are verified together rather than as independent substrings.

A focused race harness then starts twelve logger threads, each attempting hundreds of normal status writes, while another path commits death for the same table. The resulting stream must still have one terminal death and no post-terminal status. Coordinating the loggers behind a gate increases overlap at the print/state boundary and directly stresses the lock-order decision introduced by terminal-state hardening.

Repeated executions cannot prove starvation freedom for every scheduler, and the implementation does not promise that property. They do provide substantially stronger evidence that the established lock ordering, progress accounting, and terminal logging invariants survive realistic contention.

## test(tsan): ThreadSanitizer 검증 경로 추가
The project gains an optional ThreadSanitizer build and workload path through `make test-tsan`. The compiler is configurable, and `TSAN_REQUIRED` distinguishes an optional local capability from an environment where sanitizer support is mandatory.

Before interpreting sanitizer results, the script compiles and runs a small pthread probe. A compiler that lacks `-fsanitize=thread`, or a runtime that cannot execute the instrumented binary, causes a documented skip with exit status 77 unless sanitizer support was declared required. This prevents infrastructure limitations from being misclassified as project races while still allowing continuous integration to enforce availability.

When the probe succeeds, the complete executable is rebuilt with thread instrumentation and debug information. Finite, forced-death, and higher-contention schedules run with `halt_on_error` and a dedicated error exit code; the script rejects sanitizer diagnostics while also rechecking log grammar, per-philosopher progress, no-death expectations, and the one-terminal-death invariant.

Dynamic race detection complements the deterministic boundary tests: it observes actual unsynchronized memory accesses across exercised schedules, while the behavioral assertions ensure that an instrumented run did not avoid a race merely by failing to perform the required work. It remains schedule-dependent rather than an exhaustive proof, which is why both forms of verification are retained.

## fix(state): 식사 완료 횟수의 정수 범위 확장
The internal per-philosopher meal counter is widened from `int` to `int64_t`. Although the public `must_eat` argument remains bounded by `INT_MAX`, a philosopher that reaches its threshold early may continue completing meals while other philosophers have not yet made the global `full_count` reach the table size.

Using the same narrow type for both the public threshold and the accumulating runtime state would therefore permit signed overflow during a sufficiently long valid execution. Signed overflow is undefined behavior in C and cannot be made safe merely by protecting the increment with a mutex. The wider counter preserves exact threshold comparison while giving continued internal progress a substantially larger defined range.

## test(routine): 최대 목표 이후 식사 카운터 검증
The widened meal counter is tested at the precise former boundary. A two-philosopher table uses `INT_MAX` as the public target; one philosopher is seeded at that value and `full_count` is seeded to show that its threshold contribution has already been recorded.

A substituted sleep completes one additional eating interval, then terminates the routine during the following sleep. The test requires the internal counter to become `INT_MAX + 1`, proving the increment is defined beyond the public target, while `full_count` must remain unchanged because threshold contribution occurs only on equality and must not be counted twice.

This simultaneously verifies numeric range and completion accounting. Widening the field would be incomplete if advancing past the threshold caused another global contribution, and preserving the threshold logic would be incomplete if the underlying increment still overflowed.
