## feat(model): 배열 기반 스택 상태를 구현

The initial model represents each stack as an active prefix of two parallel arrays: `values` retains the original integers, while `ranks` carries the ordering key used by the algorithms. `size` identifies the number of live elements and `capacity` records the allocation bound. Keeping the original value and its rank in separate arrays avoids recomputing order information, but it creates a strict invariant: every operation must move both entries at the same index as one logical element.

`stack_init` establishes explicit ownership of the two allocations and cleans up correctly when either allocation fails. `stack_free` releases both buffers and resets the structure to the same empty state produced by `stack_init_empty`, so callers do not retain stale pointers or sizes after cleanup. A non-positive capacity is treated as a valid empty stack, which makes the no-input path use the same lifecycle API as normal execution.

Sortedness is defined over ranks, and complete success is defined as stack A being ordered while stack B is empty. These predicates separate the representation of input values from the correctness condition used by both the sorter and the checker. The accompanying C99 build scaffold enables strict warning and conformance checks from the beginning rather than leaving the model outside the normal build.

## feat(io): 문자열 비교와 기본 출력을 구현

A small project-local utility layer now owns string length, exact string comparison, descriptor-based output, and the canonical `Error\n` diagnostic. `ps_strcmp` compares through `unsigned char` values, avoiding implementation-dependent ordering for bytes whose signed `char` representation would otherwise be negative.

Routing diagnostics and command text through `ps_putstr_fd` gives callers one output boundary instead of scattering direct `write` calls across parsing, operations, and executables. This first version performs a single write and deliberately exposes no failure result, so it does not yet handle short or failed writes. Even with that limitation, centralizing the operation makes the later I/O contract replaceable without changing every caller.

The Makefile also reclassifies the stack and utility sources as common objects. That boundary reflects their intended use by more than one executable and keeps executable-specific control flow separate from shared state and low-level services.

## feat(operation): 스택 교환 연산을 구현

`stack_swap` defines the first stack state transition. It exchanges the two top entries in both `values` and `ranks`, preserving the value–rank pairing invariant rather than treating either array as independently reorderable. Stacks with fewer than two active elements are valid inputs and produce no state change, making the primitive total over every representable stack size.

The `sa`, `sb`, and `ss` wrappers separate state mutation from command emission through the `emit` flag. The same transition can therefore be used to generate a textual program or to replay a program silently. `ss` applies the primitive independently to both stacks and emits one combined instruction, preserving the instruction-level distinction between two state changes and one command in the public stream.

This split between a silent primitive and an optionally emitting wrapper becomes the shared semantic boundary for the sorter and checker. It prevents the two executables from acquiring separate implementations of what a swap means.

## feat(operation): 스택 간 이동 연산을 구현

`stack_push` moves the source top to the destination top while shifting each active array segment with `memmove`. The value and rank are copied together, the destination size grows exactly once, and the source size shrinks exactly once. Consequently, the total number of logical elements across both stacks remains constant and no element is duplicated or discarded.

An empty source is a defined no-op. This keeps `pa` and `pb` valid for every state and lets command interpretation follow stack-operation semantics without introducing a separate precondition error. The destination and source buffers are reused rather than allocating per operation, so ownership remains with the stack lifecycle established by the model.

The array representation makes a push physically linear in the number of active elements because both prefixes may need to move. That cost is the trade-off for contiguous storage, simple cleanup, and deterministic memory usage. The `pa` and `pb` wrappers retain the existing distinction between silent state replay and emitted commands.

## feat(operation): 스택 정방향 회전을 구현

Forward rotation moves the top logical element to the bottom of the active prefix. The implementation saves the top value–rank pair, shifts the remaining pairs toward index zero, and writes the saved pair at `size - 1`. Both arrays follow the same movement, preserving their positional correspondence.

Stacks of size zero or one remain unchanged, so rotation is defined without special handling in higher layers. `ra` and `rb` expose the transition for one stack, while `rr` applies it to both stacks but emits a single combined command. This keeps the command count aligned with the public instruction stream rather than with the number of internal primitive calls.

As with push, the contiguous representation gives rotation predictable allocation-free behavior at the cost of moving a linear number of pairs. The operation nevertheless maintains fixed capacity and conserves every logical element.

## feat(operation): 스택 역방향 회전을 구현

Reverse rotation completes the directional counterpart to forward rotation. It saves the final active value–rank pair, shifts the preceding pairs one position toward the tail, and installs the saved pair at the top. For a stack with at least two elements, this transition is the inverse of a forward rotation on the resulting state.

`rra`, `rrb`, and `rrr` use the same optional-emission boundary as the other operations. The combined form mutates both stacks independently and represents the result with one instruction. Empty and single-element stacks remain valid no-ops, keeping every checker command executable without introducing size-related command errors.

With swap, push, rotate, and reverse rotate present, the shared operation layer now covers the full instruction vocabulary while preserving the central pair, size, and capacity invariants.

## test(operation): 값과 순위의 보존 불변식을 검증

The first operation test harness checks the representation properties that every command must preserve, rather than only examining a few expected outputs. Its fixture distributes five distinct value–rank pairs across both stacks and verifies after each operation that sizes stay within capacity, each value is still attached to its expected rank, the combined size remains five, and every rank appears exactly once.

The same checks are applied both to each command in isolation and to a sequence containing all eleven commands. Sequential verification matters because a transition may appear correct from the initial fixture yet corrupt state that only a later operation exposes. Running with `emit = 0` isolates state semantics from output behavior.

These tests establish conservation and pairing as explicit invariants. They would catch lost elements, duplicated elements, incorrect size updates, or movement of `values` without the corresponding `ranks`. They intentionally do not prove that each command produces the exact required permutation; that stronger property is added separately.

## test(operation): 정확한 상태 전이와 no-op을 검증

The operation suite now supplements conservation checks with table-driven, exact postconditions for every instruction. Each command is applied to the same fixture and compared against the expected active `values`, `ranks`, sizes, and unchanged capacity for both stacks. This distinguishes a correct transition from an incorrect permutation that merely preserves all elements.

Boundary cases are also exercised against empty and single-element stacks. Swap and rotation families must leave insufficient stacks unchanged, and push must leave both stacks unchanged when its source is empty. The fixture checks the backing entries as well as the logical sizes, ensuring that a no-op does not silently rewrite inactive storage.

Centralizing command names and application in a test enum keeps all eleven operations subject to the same assertions. Together with the earlier pairing tests, the suite now verifies both the structural invariants and the precise command semantics on which the sorter and checker depend.

## feat(parse): 개별 인자의 부호 있는 정수를 파싱

The parser initially accepts one signed decimal integer per argument and constructs stack A as an all-or-nothing result. An optional leading `+` or `-` is recognized, a sign without digits is rejected, and every remaining byte must be an ASCII decimal digit. Accumulation uses a wider type and compares the magnitude against separate positive and negative limits, allowing `INT_MIN` while rejecting values outside the `int` domain.

No arguments produce a valid empty stack. When arguments are present, the parser allocates exactly enough capacity, fills the original values in input order, and temporarily mirrors those values into `ranks`. Any invalid token releases the partially initialized stack and returns failure, so callers never receive a half-valid parse result.

This establishes parser ownership of stack initialization and cleanup. At this stage the grammar is intentionally limited to one token per `argv` entry; whitespace-combined arguments and coordinate compression are added by later changes without altering the signed-integer contract.

## feat(parse): 공백으로 결합된 인자 토큰을 처리

Input tokenization now treats every C whitespace character as a separator inside each argument, allowing quoted groups and ordinary split arguments to share one grammar. The parser first counts all token spans and then scans the same arguments again to parse directly from `[start, end)` ranges. No temporary substring allocation is required, and the stack can still be allocated once at its final capacity.

An empty argument contributes no token and is acceptable when other arguments contain values. By contrast, an invocation that supplies arguments but yields zero tokens is rejected, preserving the distinction between a true no-argument execution and malformed present input such as a whitespace-only string.

Separating token discovery from integer conversion keeps whitespace handling outside the numeric parser. On any conversion failure, the allocated stack is released and no partial result escapes. The two-pass structure trades a second linear scan for exact allocation size and simpler ownership.

## feat(parse): 중복 입력을 거절하고 상대 순위를 계산

After parsing the original integers, the parser now creates a sorted copy and converts each unique value to a dense rank in `[0, n - 1]`. The `qsort` comparator uses relational results instead of subtraction, avoiding overflow when comparing extreme integers. Adjacent equality in the sorted copy rejects duplicates before ranks are assigned.

Each original value is then located with a lower-bound binary search, so `values` remains in the user-provided order while `ranks` becomes an order-isomorphic representation. This coordinate compression removes magnitude and sign from the sorting problem: algorithms can operate on small non-negative integers while the original data remains available for representation checks.

The temporary sorted buffer is released on success and duplicate failure, and a ranking failure causes the whole parsed stack to be freed. The parser therefore maintains its all-or-nothing contract while establishing the uniqueness and dense-rank invariants required by the tiny and radix sorters.

## feat(sort): 세 개 이하의 스택을 정렬

The first sorting strategy handles the complete state space for two and three unique ranks. Two elements require at most one swap. For three elements, the implementation classifies the five unsorted relative-order cases and emits the corresponding one- or two-command sequence using swap and rotation operations.

Direct case analysis is appropriate at this size because it avoids the setup and extra commands of a general algorithm. The comparisons depend only on relative rank, so the same logic applies to any original integer magnitudes after coordinate compression. Already sorted stacks and stacks with fewer than two elements return without emitting commands.

All state changes pass through the emitting operation wrappers, keeping the in-memory transition and the external instruction stream synchronized. At this point `sort_stack` deliberately has behavior only for sizes up to three; larger strategies are added without changing these base cases.

## feat(sort): 네다섯 개의 스택을 정렬

The tiny sorter is extended to four and five elements by reducing the problem to the already verified three-element case. It locates the next smallest rank, rotates in the shorter direction to bring that element to the top, and pushes it to stack B. Repeating this until three elements remain isolates rank zero, and for five elements rank one, before sorting the residual stack directly.

Choosing forward or reverse rotation according to the target index limits the commands spent positioning each minimum. When the saved elements are pushed back from B, their stack order restores the smallest ranks ahead of the sorted three-element suffix. This works because the parser guarantees unique, consecutive ranks.

The approach gives the auxiliary stack one clear responsibility: temporarily hold the globally smallest elements while the small direct sorter handles the remainder. It avoids introducing a second unrelated algorithm for four and five elements and preserves the final invariant that B is empty.

## feat(sort): 큰 입력을 기수 정렬로 처리

Inputs larger than five are sorted with a least-significant-bit-first binary radix pass over dense ranks. The required bit count is derived from the maximum possible rank, `size - 1`. During each pass, an element with a one bit is rotated within A, while an element with a zero bit is pushed to B; after exactly the original round size has been examined, every element in B is pushed back to A.

The rotations preserve the relative order of the one-bit group. Pushing zero-bit elements to B reverses their order once, and pushing the whole group back reverses it again, preserving their relative order as well. Each pass is therefore a stable partition, which is the condition that makes least-significant-bit radix sorting correct across successive bits.

Using compressed non-negative ranks avoids signed-shift concerns and makes the number of passes depend on input count rather than integer magnitude. The algorithm emits a deterministic `O(n log n)` number of stack commands and restores B to empty after every bit. Because the underlying stacks are contiguous arrays, individual commands may still move a linear number of pairs; command complexity and physical movement cost are intentionally distinct properties.

## feat(push_swap): 정렬 명령 생성 흐름을 연결

The `push_swap` executable now composes parsing, auxiliary-stack allocation, sorting, and cleanup into one ownership flow. Parsing initializes A, B receives the same capacity so any distribution of the original elements can be represented, and `sort_stack` emits the command program while mutating the two in-memory stacks.

Failure to parse or allocate B produces the canonical error and a non-zero status. If B allocation fails, A is released before returning. On success, both stacks are freed regardless of whether the input was empty, already sorted, or required commands. This makes `main` the lifetime owner while leaving parsing and sorting responsible for their narrower contracts.

The Makefile links common objects separately from generator-specific control flow. At this stage output functions do not report write failure, so the executable can only propagate parsing and allocation failures; the I/O path is hardened later.

## feat(checker): 표준 입력 명령 프레임을 읽음

The checker receives an initial tri-state line reader: `1` returns one command frame, `0` denotes clean end of input, and `-1` reports allocation or read failure. Newlines delimit frames but are not included in the returned string, and a final unterminated non-empty frame is accepted at EOF.

The initial implementation grows its buffer geometrically, avoiding a new allocation for every byte while retaining ownership of exactly one returned line. Every failure path releases the partial buffer, and clean EOF with no bytes also leaves no allocation for the caller.

This version is a general line reader and therefore accepts arbitrarily long frames and treats an interrupted read as failure. Those properties are broader and less robust than the checker's actual three-character command grammar; later history replaces the dynamic framing policy with a bounded protocol reader and explicit `EINTR` retry.

## feat(checker): 스택 연산 명령을 해석

The checker now maps each exact command string to the shared operation layer with emission disabled. All eleven instructions use the same state-transition implementation as `push_swap`, so command generation and command replay cannot drift through separately maintained swap, push, or rotation logic.

Exact comparison rejects prefixes, suffixes, and unknown names rather than attempting partial interpretation. A recognized command returns success after applying its transition; an unrecognized line returns failure to the checker control flow.

The `emit = 0` boundary is important: replay changes stack state without echoing commands back to standard output. The checker can therefore use stdout exclusively for its final verdict while preserving instruction semantics, including no-op behavior on insufficient stacks.

## feat(checker): 명령 실행 결과를 판정

The standalone checker executable now owns the full validation lifecycle. It parses the same input representation as `push_swap`, allocates B with matching capacity, repeatedly reads and applies command frames, and releases each frame immediately after use. Invalid commands, read failures, parsing failures, and allocation failures all clean up owned resources and report `Error`.

At clean EOF, success is not defined merely as A being ordered. The checker uses the model's complete predicate, requiring A to be sorted and B to be empty, then emits `OK` or `KO`. Both verdicts are normal checker outcomes and therefore return success status; malformed input or command streams return failure.

An invocation without values exits immediately and does not enter the stdin-reading loop. This prevents a command-only invocation from blocking and keeps the no-input behavior consistent with the generator. Output errors are not yet observable in this version because the utility layer still discards `write` results.

## test(parser): 정상 입력과 오류 입력을 검증

An end-to-end Python harness now treats parser behavior as a CLI contract rather than testing only internal helper functions. It verifies the quiet, successful no-argument path and accepts a value sequence split across ordinary and quoted arguments. The resulting `push_swap` program is then supplied to the checker, confirming that the parsed order and generated commands agree across both executables.

Invalid cases cover duplicate values, positive and negative integer overflow, non-digit suffixes, a sign without digits, an input that yields no token, and duplicates spanning separately supplied and whitespace-combined arguments. Each case must fail without stdout and must produce exactly `Error\n` on stderr.

Checking process status and both output channels prevents a parser regression from being hidden behind a superficially correct diagnostic. Integrating the harness into the `test` target makes these public behaviors part of the normal verification path.

## test(cli): 입력 경계와 무인자 실행을 검증

The CLI tests now define the parser's boundary grammar in detail. Accepted cases include an explicit plus sign, negative zero, leading zeroes, empty arguments mixed with real tokens, every C whitespace separator, and the exact `int` endpoints. Rejected cases include whitespace-only input, a very long decimal token, non-ASCII digits, repeated or mixed signs, and differently spelled representations of duplicate zero.

Accepted cases are validated through both executables: `push_swap` must remain silent on stderr, and the checker must accept its generated program. Rejected cases must return status one with no stdout and exactly the canonical diagnostic. Child-process timeouts turn accidental infinite scans or blocked reads into deterministic test failures.

A separate file-position check proves that `checker` with no values exits before consuming stdin. This verifies a lifecycle property that output assertions alone cannot observe and protects callers from an otherwise surprising blocking or input-stealing behavior.

## test(checker): 명령 연산과 최종 판정을 검증

The checker suite now exercises every instruction through command programs that produce a known sorted result. Single-stack, dual-stack, push, forward-rotation, and reverse-rotation forms are all covered, including the combined `ss`, `rr`, and `rrr` commands. This validates the command-to-operation mapping as used by the executable rather than only calling C primitives directly.

The final-state protocol is tested separately. An unsorted stack with no commands must return `KO` without being treated as an execution error, while an unknown command following a valid prefix must produce no verdict, return failure, and report `Error`.

These cases lock down the distinction among a valid successful program, a valid but insufficient program, and an invalid command stream. That distinction is central to using the checker as an independent consumer of generated instructions.

## test(sort): 생성 명령의 정렬 결과를 독립 검증

The sorting tests add a Python implementation of the full stack instruction set and apply the emitted program independently of the C checker. Every output line must belong to the exact command vocabulary, the simulated final A must equal Python's numeric sort of the original values, and B must be empty. The same stream is then passed to the checker as a second oracle.

This independent interpreter reduces common-mode risk: a matching bug in the C generator and C checker would not automatically satisfy the Python model. Fixed cases include reversed small input, mixed signs, integer endpoints, and a larger permutation. Every permutation of sizes two through five is also exercised, covering the complete tiny-sort state space.

Already sorted input must emit no commands at all. The suite therefore verifies not just eventual correctness but also the public stream format, B-empty postcondition, and the early-exit behavior for an already satisfied input.

## test(sort): 큰 입력의 명령 수 상한을 검증

Large-input verification now includes explicit command-count budgets for 100 and 500 unique values. A fixed seed produces reproducible permutations, the existing independent simulator first proves each stream correct, and only then is the number of emitted commands compared with the configured limit.

The limits measure the resource that the project is designed to optimize: legal stack instructions. They do not substitute wall-clock timing, which would be sensitive to the machine and to the array implementation's physical movement cost. This keeps the regression criterion stable while ensuring that a correct but pathologically verbose replacement cannot silently enter the history.

Using the same correctness helper also prevents a low command count from being accepted when it is achieved by emitting an incomplete or invalid program.

## build(clean): 빌드 산출물과 테스트 캐시를 정리

The build now centralizes removal commands, clears the object tree together with Python test caches, and removes both executable targets through their declared names. `.DELETE_ON_ERROR` also instructs `make` to discard a target whose recipe fails, preventing a truncated or otherwise invalid artifact from appearing up to date on the next invocation.

These changes make `clean`, `fclean`, and rebuilds return the repository to a reproducible state without leaving stale test or build products that could mask dependency problems.

## refactor(runtime): 메모리와 입력 시스템 호출을 공통화

Allocation, deallocation, and input now pass through `ps_malloc`, `ps_free`, and `ps_read` in a dedicated runtime module. The wrappers initially delegate directly to the C and POSIX functions, so normal behavior is intentionally unchanged. The structural change is that parser, stack, and checker code no longer bind directly to those system interfaces.

This boundary makes failure behavior observable and replaceable at one layer. Allocation failures can be injected without rewriting every caller, live allocations can be tracked consistently, and read faults can later be modeled while the domain code continues to use the same API. It also ensures that memory obtained through the runtime is released through the matching runtime function.

The operation-invariant test is linked only with the objects it actually exercises. Narrowing that test dependency graph avoids pulling unrelated parser or executable code into a low-level state-transition test while still including the new runtime dependency.

## test(memory): 할당 실패 뒤 자원 정리를 검증

A separate fault-injection build now instruments every project allocation without changing the normal build. Under `PS_FAULT_INJECTION`, allocation calls are counted, a selected Nth call can return `NULL`, and successful allocations receive an aligned header that tracks whether they remain live. Every executable exit is routed through `ps_test_finish`, which can report a non-zero live-allocation count as a distinct test failure.

The Python fault suite sweeps each allocation point used by representative `push_swap` and checker executions, then also tests one call beyond the last expected allocation to prove that the baseline path still succeeds. Each injected failure must retain the public `Error` behavior and must report zero live allocations.

This verifies cleanup after partial stack construction, parser scratch allocation, auxiliary-stack failure, and checker line-buffer failure. Injecting faults at the runtime boundary tests real control-flow exits rather than relying on static inspection of cleanup code, while the aligned header keeps returned pointers suitable for ordinary project data.

## fix(parse): 토큰 수와 배열 크기 계산을 방어

Token scanning now uses `size_t` for string positions and per-argument counts, and aggregation explicitly refuses any total that cannot fit the stack model's `int` size field. The count is converted to `int` only after the bound has been established. This removes signed-overflow and narrowing hazards from the two-pass parser.

Stack allocation also checks that `capacity * sizeof(int)` is representable in `size_t` before allocating either parallel array. Without these guards, a wrapped count or byte size could allocate a smaller buffer than the parser later fills, converting a large-input rejection problem into out-of-bounds memory access.

The checks live at both responsibility boundaries: parsing validates the logical element count, and `stack_init` validates its own byte-size calculation. Normal inputs retain the same grammar and representation; only unrepresentable sizes are rejected earlier and deterministically.

## fix(checker): 명령 길이를 제한하고 중단된 읽기를 재시도

The checker reader is specialized to the actual command protocol. Since the longest legal instruction has three characters, each frame now uses a fixed `PS_COMMAND_MAX + 1` buffer instead of an unbounded geometrically growing line. A fourth character, an embedded NUL byte, or allocation failure immediately rejects the frame, while newline and EOF continue to delimit valid commands.

Interrupted reads are retried when `errno` is `EINTR`; other read failures release the buffer, null the caller's pointer, and return the error state. Clean EOF with no pending bytes also releases the temporary buffer, while a valid final command without a newline remains accepted.

Bounding the frame at the input boundary prevents arbitrary command text from driving memory growth and rejects malformed protocol data before command dispatch. The fault-allocation sweep is updated for the reader's revised allocation behavior so cleanup coverage remains aligned with the executable path.

## test(checker): 읽기 실패와 명령 경계를 검증

The runtime fault layer now counts reads and can inject either a permanent `EIO` failure or a transient `EINTR` at a selected call. The checker tests sweep permanent failures across the complete `sa\n` plus EOF read sequence and verify that interruptions at both an early command byte and the final EOF probe are retried successfully.

Protocol-boundary cases cover embedded NUL data, commands longer than three bytes with and without a trailing newline, an empty command, a standalone NUL, and a 64 KiB overlong frame. Every malformed stream must fail without a verdict and with the canonical error. A valid `sa` frame terminated only by EOF must still be applied and produce `OK`.

These tests distinguish framing errors from transport interruptions and permanent I/O failures. Because they run through the allocation-reporting fault build, the same cases also verify that rejected or interrupted frames do not leak their fixed buffers.

## fix(io): 출력 실패를 호출 경로 끝까지 전파

Output becomes an explicit success-or-failure contract. `ps_write_all` retries `EINTR`, advances past short writes, and treats both a permanent error and a zero-byte write as failure. `ps_putstr_fd`, diagnostics, operation wrappers, every sorting helper, and the top-level sorting function now return status so the first failed emission can propagate to `main`.

The generator stops producing further commands after a failed write, frees both stacks, reports an error when possible, and returns failure. It does not try to roll back state or repeat an already written prefix; once the external program is incomplete, process failure is the meaningful contract. The checker similarly validates the write of `OK` or `KO` rather than assuming the verdict reached its consumer.

`SIGPIPE` is ignored before output-capable execution, converting a closed pipe into an ordinary `write` error that follows the same cleanup path. Silent checker operations continue to use the shared wrappers and report success without writing. A failure while writing the secondary `Error` diagnostic does not replace the original non-zero exit status.

## test(io): 부분 출력과 영구 쓰기 실패를 검증

The fault runtime can now inject interrupted, short, zero-byte, and permanent writes at an exact call index. The test suite first records a successful multi-command baseline, then fails each command write in turn to confirm that the error reaches `main` and that all allocations are still released.

Transient interruption and a one-byte short write must reconstruct the exact baseline stream. A zero-byte write is treated as permanent failure. A short write followed by failure must leave exactly the successfully written prefix on stdout without duplicating it, demonstrating that the write loop advances its cursor correctly.

The checker verdict path and the diagnostic path are tested independently. A failed `OK` write must cause checker failure; failure to write `Error` must not erase the original failure status. Finally, a pipe whose read end is already closed verifies that the process does not die from `SIGPIPE`, reports failure through normal control flow, and still reaches allocation cleanup.

## test(sort): 결정적 다중 시드 동치 검사를 추가

Randomized coverage is replaced with an explicitly specified 32-bit linear-congruential state and Fisher–Yates permutation. The resulting values are transformed into unique signed integers, producing reproducible fixtures that do not depend on Python's random implementation or process-global random state.

Multiple seeds are exercised across sizes on both sides of the tiny/radix boundary, and each fixture is run twice. The two command lists must be identical in addition to independently sorting correctly, making deterministic generation an observable regression property. The 100- and 500-element command budgets are also checked for three seeds instead of one.

Executable paths can now be supplied through environment variables. That keeps the same behavioral suite reusable for alternative builds, including the later sanitizer binaries, without copying or weakening the tests.

## test(resource): 명령과 배열 이동 및 할당량을 기준화

The fault build gains compile-time instrumentation for three distinct resources. It counts commands only after their text has been emitted successfully, records the number of logical value–rank pairs moved or rewritten by array operations, and tracks current and peak requested allocation bytes while excluding instrumentation headers. In normal builds these hooks compile to no-ops.

A versioned JSON baseline defines deterministic cases for sizes 10, 100, and 500 across three seeds. Command counts are exact, while array movements and peak live bytes are upper bounds. The resource runner also requires zero live allocations and verifies that the recorded operation count equals the number of command lines actually written.

Separating these measurements exposes trade-offs that a command-only score would hide. The radix strategy has a stable instruction count, while the contiguous array representation can perform substantially more physical movement. Peak-byte limits verify that operations do not introduce hidden per-command allocation. Elapsed time is printed only as information, avoiding a machine-dependent pass criterion.

## build(sanitize): C99 sanitizer 검증 경로를 추가

The Makefile now builds dedicated AddressSanitizer and UndefinedBehaviorSanitizer objects in a separate directory with C99 warning flags, debug information, modest optimization, and preserved frame pointers. Keeping sanitized objects separate prevents `make` from accidentally reusing normally compiled objects under incompatible instrumentation settings.

The sanitizer target builds both executables and the C operation-invariant test, configures both sanitizers to halt on the first detected defect, and runs the full Python functional suite against the instrumented binaries through the configurable executable paths. This exercises parser boundaries, checker framing, tiny and radix sorting, and output behavior under runtime instrumentation as well as the direct operation tests.

This path does not replace the fault and resource suites: sanitizers detect invalid memory access and undefined behavior, while injected failures and explicit metrics verify different contracts. The build change gives those forms of evidence distinct, reproducible configurations.
