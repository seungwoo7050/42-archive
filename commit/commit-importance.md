# Project Importance Profile

Project: `push_swap` on branch `c/push_swap` in `seungwoo7050/42-archive`  
Domain: Constrained-stack sorting command generation and command-stream validation in C99  
Primary Purpose: Parse a unique integer sequence, emit a legal stack-operation program that sorts it, replay and judge such programs with a checker, and verify correctness, failure behavior, and resource costs.  
Resolved Commit Scope: The complete independent, linear root-to-tip history of `c/push_swap`: 36 commits from root `8240bf969b9f` through tip `d0762bc9af8c`. The root has no parent, every later commit has one parent, there are no merge commits, and no unrelated inherited history is included.

## Core Technical Areas

- Strict argv tokenization, signed-integer validation, duplicate rejection, and coordinate compression to dense ranks.
- Parallel-array stack state and the exact semantics of the eleven permitted operations.
- Specialized tiny sorting and stable least-significant-bit binary radix command generation.
- Generator and checker integration, including bounded stdin framing and `OK`/`KO` verdict semantics.
- Explicit resource ownership, allocation cleanup, interrupted and partial system-call handling, and `SIGPIPE` behavior.
- Multi-layer correctness evidence: C invariants, an independent Python replay model, fault injection, deterministic resource baselines, and sanitizers.

## Core Architecture

- `src/parser.c`, `src/stack.c`, `src/operations.c`, `src/runtime.c`, and `src/utils.c` form a common core shared by both executables.
- `push_swap` parses A, allocates an equal-capacity empty B, chooses a tiny or radix strategy, mutates state through shared operations, and emits the corresponding command stream.
- `checker` parses the same initial state, reads one bounded command frame at a time, replays shared operations without emission, and reports `OK` only when A is sorted and B is empty.
- Each logical element is represented by parallel `values` and `ranks` entries. Sorting uses dense ranks while operations must preserve the original value-rank association.
- Product code shares operation semantics, while verification deliberately adds an independent Python list model to reduce common-mode risk.
- Normal, fault-injection, and sanitizer builds are isolated into separate object trees so instrumentation does not alter ordinary build reuse.

## Critical Invariants

- `values[i]` and `ranks[i]` always describe the same logical element; operations must move them together.
- Across A and B, every input pair is present exactly once, total active size is conserved, and each stack remains within capacity.
- After parsing unique input of size `n`, ranks form a bijection over `0..n-1` and preserve the ordering of original values.
- A successful `push_swap` execution means the complete emitted stream was written successfully; a merely sorted in-memory state is insufficient.
- Checker returns `OK` only for sorted A with empty B; `KO` is a normal verdict, whereas malformed input, malformed commands, allocation failure, and I/O failure are errors.
- Parser construction is all-or-nothing, and every owned allocation is released on every exit path.
- Checker frames contain at most three non-newline bytes, contain no NUL, retry `read` interrupted by `EINTR`, and reject other read errors.
- Short positive writes advance the output cursor, zero-byte writes are failures, and a closed pipe is handled as an ordinary error rather than process termination.
- Resource metrics count only successfully emitted commands and remain reproducible for the fixed deterministic fixtures.

## Major Engineering Difficulties

- Designing a stable radix partition using only the permitted stack operations and proving that lower-bit order survives later passes.
- Maintaining value-rank pairing and total-element conservation while array-backed push and rotation operations perform overlapping `memmove` operations.
- Sharing operation semantics between generator and checker without allowing that sharing to become the sole correctness oracle.
- Handling allocation failure, interrupted reads and writes, short writes, zero-byte writes, closed pipes, and already-visible output prefixes without transactional rollback.
- Instrumenting allocation, operation, and movement costs in C while preserving normal-build behavior and separating logical command cost from physical array movement.

## Practical Engineering Areas

- Precise input and protocol limits at external boundaries.
- Explicit ownership and cleanup after partial initialization or partial I/O.
- Failure status propagation through all intermediate APIs.
- Deterministic fixtures, exhaustive small-state testing, and independent differential replay.
- Fault injection for otherwise difficult allocation and system-call paths.
- Reproducible command, movement, and peak-allocation regression baselines.
- Separate strict-warning, fault-injection, and sanitizer build configurations.

## S-level Criteria

- Establishes the fundamental stack representation or ordering transformation on which all later parser, operation, sorting, checker, and verification work depends.
- Implements the general command-generation mechanism that solves the branch's primary sorting problem and whose reasoning is necessary to explain correctness.
- Establishes a project-defining invariant or mechanism whose omission would leave a material gap in understanding how the completed system works.

## A-level Criteria

- Establishes a major shared boundary between generator, checker, runtime, and verification without being the primary sorting mechanism itself.
- Restores or strongly verifies significant state, ownership, framing, memory-safety, or partial-I/O invariants.
- Adds an independent correctness oracle, comprehensive fault-injection evidence, or resource accounting that materially changes confidence in the core.
- Solves a non-trivial integration or external-failure problem whose effects cross multiple modules.

## Typical B-level Work

- Implements another operation, parser capability, tiny-sort case, executable control-flow step, or command mapping within an established design.
- Adds ordinary functional, edge-case, determinism, command-count, sanitizer, or build support around mechanisms already defined.
- Provides necessary project functionality with limited new project-wide technical judgment.

## Typical C-level Work

- Documentation-only commits, routine cleanup, and maintenance with little effect on algorithms, state ownership, protocol contracts, or verification strength.
- Mechanically useful changes that contribute little to explaining the branch's central engineering decisions.

## Project-specific Tags

STACK_STATE — parallel value/rank representation, stack ownership, operation semantics, and conservation invariants  
INPUT — argv tokenization, integer grammar, duplicate handling, rank assignment, and size safety  
SORT — tiny or radix command-generation strategy and its correctness properties  
CHECKER — command framing, silent replay, and final verdict protocol  
RUNTIME — allocation and system-call abstraction, cleanup, and external failure handling  
RESOURCE — command, pair-movement, and project-allocation measurement

# Commit Classification

| Commit | Subject | Importance | Tags | Summary | Why |
| --- | --- | --- | --- | --- | --- |
| `8240bf969b9f` | docs(readme): 프로젝트 목표와 초기 규약을 기록 | C | - | Introduces the project goal and initial development rules in the README. | This is useful orientation, but it is documentation-only and establishes no executable mechanism, invariant enforcement, or verification capability. |
| `96b5324448e4` | feat(model): 배열 기반 스택 상태를 구현 | S | ARCH, CORE, STACK_STATE | Defines parallel value/rank arrays, stack ownership, capacity, and sorted-state predicates. | This is the foundational representation used by parsing, every operation, both executables, and all later tests. The value-rank pairing and explicit stack lifetime are indispensable to explaining the project. |
| `2e97f29961d8` | feat(io): 문자열 비교와 기본 출력을 구현 | B | RUNTIME, PRACTICAL | Adds project-local string comparison, descriptor output, and the canonical error message. | The utilities are necessary supporting work, but this initial single-write interface neither establishes the final failure contract nor contains project-defining judgment; later I/O commits carry that significance. |
| `c0de1a1b18bb` | feat(operation): 스택 교환 연산을 구현 | A | CORE, STACK_STATE, INTEGRATION | Implements pair-preserving swap and introduces optionally emitting operation wrappers. | Beyond adding swap, this establishes the shared state-transition boundary later used by the generator with emission enabled and the checker with emission disabled. That integration pattern materially shapes both executables. |
| `73d2deb30224` | feat(operation): 스택 간 이동 연산을 구현 | B | CORE, STACK_STATE | Implements `pa` and `pb` by moving the top pair between fixed-capacity array stacks. | Push is essential functionality, but it applies the representation and wrapper pattern already established by earlier commits rather than introducing a new architectural decision. |
| `745ec72850d2` | feat(operation): 스택 정방향 회전을 구현 | B | CORE, STACK_STATE | Adds forward rotation for one or both stacks while preserving value-rank pairing. | This competently completes another required instruction family inside the established operation architecture; its technical judgment is local rather than project-defining. |
| `68dfd1b1fb58` | feat(operation): 스택 역방향 회전을 구현 | B | CORE, STACK_STATE | Adds reverse rotation and the `rra`, `rrb`, and `rrr` command wrappers. | The change completes the instruction vocabulary through the existing array-transition and optional-emission design, so it is normal core implementation rather than a new system-level decision. |
| `86364d27baac` | test(operation): 값과 순위의 보존 불변식을 검증 | A | TEST, STACK_STATE, RISK | Checks pair preservation, element conservation, size bounds, and multi-operation sequences. | The suite locks down the most consequential representation invariant across all eleven commands. A defect here could make both the generator and checker agree on corrupted state, so the evidence materially strengthens the core. |
| `7eb6890c2c13` | test(operation): 정확한 상태 전이와 no-op을 검증 | B | TEST, STACK_STATE, EDGE | Adds exact expected states and empty or single-element no-op cases for every operation. | This is thorough and useful regression coverage, but it refines an already established operation contract rather than introducing or restoring a project-wide mechanism. |
| `f36ad8899b5f` | feat(parse): 개별 인자의 부호 있는 정수를 파싱 | B | INPUT, EDGE | Parses one signed ASCII decimal integer per argument with explicit `int` bounds. | Strict numeric validation and all-or-nothing cleanup are necessary parser work, but this is the initial implementation of an expected boundary rather than the decisive normalization used by sorting. |
| `3bfb465ebdb1` | feat(parse): 공백으로 결합된 인자 토큰을 처리 | B | INPUT, EDGE | Extends parsing to all C whitespace separators and mixed quoted or split arguments. | The two-pass token count and fill design is sound, but it expands the established input grammar without changing the project's central representation or algorithm. |
| `e09cf45e21cd` | feat(parse): 중복 입력을 거절하고 상대 순위를 계산 | S | CORE, INPUT, SORT | Rejects duplicates and maps arbitrary values to a dense, order-preserving rank permutation. | Coordinate compression is the bridge between the CLI domain and every sorting strategy. It establishes the rank bijection that makes signed magnitudes irrelevant and enables deterministic tiny and radix algorithms. |
| `caa54cb306ad` | feat(sort): 세 개 이하의 스택을 정렬 | B | CORE, SORT | Implements direct two- and three-element sorting by relative-rank case analysis. | This is correct core functionality and a useful base case, but it is bounded, straightforward work within the rank and operation architecture already established. |
| `160d1fb8d824` | feat(sort): 네다섯 개의 스택을 정렬 | B | CORE, SORT | Reduces four- and five-element inputs by moving successive minima to B before sorting three. | The reduction is a competent extension of the tiny-sort design. It matters to command quality for small inputs but is not the mechanism that defines general project behavior. |
| `1463a193a4f9` | feat(sort): 큰 입력을 기수 정렬로 처리 | S | CORE, SORT, HARD | Implements stable least-significant-bit binary radix sorting for inputs larger than five. | This is the general sorting mechanism that solves the project's primary problem at scale. Its stable partition reasoning, rank-bit traversal, command complexity, and B-empty round invariant are essential to the engineering story. |
| `cf07495c97f7` | feat(push_swap): 정렬 명령 생성 흐름을 연결 | B | CORE, INTEGRATION | Links parsing, auxiliary-stack allocation, sorting, cleanup, and the `push_swap` executable. | The commit makes the generator usable, but its control flow primarily composes mechanisms and ownership rules that earlier commits already defined. |
| `0b87adebca2b` | feat(checker): 표준 입력 명령 프레임을 읽음 | B | CHECKER, CORE | Introduces a tri-state dynamically growing line reader for checker command frames. | It enables checker input, but the general unbounded reader is an intermediate implementation later replaced by a protocol-specific bounded design. Its lasting judgment is therefore limited. |
| `f79ae7e86592` | feat(checker): 스택 연산 명령을 해석 | B | CHECKER, INTEGRATION | Maps all legal command names to the shared operation layer with emission disabled. | Sharing transitions with the generator is important, but the commit mainly performs direct command dispatch within the already established operation abstraction. |
| `d906f4d86528` | feat(checker): 명령 실행 결과를 판정 | A | CHECKER, CORE, INTEGRATION | Builds the checker executable, replays stdin commands, and emits `OK` or `KO` from complete state. | This establishes the second product boundary and the rule that success requires sorted A and empty B, while malformed streams are errors and `KO` is a normal verdict. It is significant integration, though less fundamental than the model and sorting mechanism. |
| `4cc9783286c0` | test(parser): 정상 입력과 오류 입력을 검증 | B | TEST, INPUT | Adds end-to-end parser acceptance and rejection cases through both executables. | The tests establish useful public CLI evidence, but they cover expected behavior of an already implemented parser rather than a difficult newly discovered invariant. |
| `44a4da8bc63d` | test(cli): 입력 경계와 무인자 실행을 검증 | B | TEST, INPUT, EDGE | Expands numeric, whitespace, sign, timeout, and no-argument stdin-consumption coverage. | The boundary set is unusually complete, including proof that checker leaves stdin unread without values, but it remains verification of the established CLI contract rather than a core architectural change. |
| `44ee0830e9f0` | test(checker): 명령 연산과 최종 판정을 검증 | B | TEST, CHECKER | Exercises all checker commands and distinguishes `OK`, `KO`, and invalid-stream failure. | This is necessary executable coverage, but it validates behavior already defined by the checker integration and shared operations without adding an independent model. |
| `5b7559278909` | test(sort): 생성 명령의 정렬 결과를 독립 검증 | A | TEST, SORT, RISK | Replays emitted commands in an independent Python model and exhausts all permutations through size five. | The independent representation directly addresses common-mode risk from sharing C operations between generator and checker. Exhaustive tiny-state coverage and dual-oracle validation materially change confidence in core correctness. |
| `a16dde75d935` | test(sort): 큰 입력의 명령 수 상한을 검증 | B | TEST, PERF, SORT | Adds reproducible command-count ceilings for 100- and 500-element inputs. | The budgets protect an expected project metric, but they are normal performance regression checks layered onto the established radix mechanism. |
| `51bf9c41d744` | build(clean): 빌드 산출물과 테스트 캐시를 정리 | C | PRACTICAL | Centralizes cleanup commands, removes test caches, and enables `.DELETE_ON_ERROR`. | This improves repository hygiene and failed-target behavior, but it contributes little to understanding the project's algorithms, state, protocols, or failure architecture. |
| `5faa9d7697af` | refactor(runtime): 메모리와 입력 시스템 호출을 공통화 | A | ARCH, REFACTOR, RUNTIME | Routes allocation, free, and read operations through a dedicated runtime boundary. | The refactor creates the testability and observability seam required for later allocation and read fault injection. It materially improves responsibility boundaries while intentionally preserving normal behavior. |
| `63969f770a21` | test(memory): 할당 실패 뒤 자원 정리를 검증 | A | TEST, RUNTIME, RISK | Adds an instrumented build that fails the Nth allocation and reports live allocations at exit. | Sweeping real allocation points proves cleanup across partially constructed parser, stack, and checker states. This is substantial ownership verification rather than routine happy-path testing. |
| `049ecd429548` | fix(parse): 토큰 수와 배열 크기 계산을 방어 | A | INPUT, EDGE, RISK | Prevents token-count narrowing and allocation-size overflow before filling stack arrays. | The small diff closes a memory-safety path in which wrapped logical or byte counts could under-allocate buffers later written by the parser. It restores a significant boundary invariant at the correct layers. |
| `7713a31cf502` | fix(checker): 명령 길이를 제한하고 중단된 읽기를 재시도 | A | CHECKER, RUNTIME, RISK | Replaces the unbounded reader with a four-byte frame buffer, rejects NUL or overlength input, and retries `EINTR`. | This corrects the framing abstraction to match the actual three-character protocol, bounds memory independently of hostile input, and distinguishes transient interruption from permanent failure. |
| `dbf76e147e68` | test(checker): 읽기 실패와 명령 경계를 검증 | A | TEST, CHECKER, RISK | Injects permanent and interrupted reads and tests malformed, overlong, NUL, empty, and unterminated frames. | The tests exercise transport failure and protocol boundaries that normal functional cases cannot reach, while also checking allocation cleanup. They materially validate the corrected reader contract. |
| `315f4b91779b` | fix(io): 출력 실패를 호출 경로 끝까지 전파 | A | RUNTIME, RISK, INTEGRATION | Adds write-all semantics, `SIGPIPE` handling, and status propagation through operations, sorting, checker, and both mains. | This is a cross-cutting reliability correction: a sorted memory state no longer masquerades as a successfully delivered command stream. It handles partial external effects without leaking resources or continuing after failure. |
| `e1154e181864` | test(io): 부분 출력과 영구 쓰기 실패를 검증 | A | TEST, RUNTIME, RISK | Injects short, zero, interrupted, and permanent writes, including closed-pipe and diagnostic failures. | The suite verifies non-trivial partial-output semantics, exact cursor advancement, preserved failure status, `SIGPIPE` conversion, and cleanup. This is strong evidence for the difficult I/O correction. |
| `23198a9cdd55` | test(sort): 결정적 다중 시드 동치 검사를 추가 | B | TEST, SORT | Uses an explicit deterministic permutation generator and checks repeatable streams across seeds and sizes. | The change improves reproducibility and broadens differential coverage, but it refines the verification apparatus rather than introducing a new correctness mechanism. |
| `6569949742eb` | test(resource): 명령과 배열 이동 및 할당량을 기준화 | A | TEST, RESOURCE, PERF | Instruments successful commands, logical pair movements, peak project allocation, and deterministic resource baselines. | The commit makes the project's main implementation trade-off measurable: command complexity differs from the physical cost of contiguous arrays. It provides stable regression evidence across correctness, movement, and memory dimensions. |
| `5505adf3e469` | build(sanitize): C99 sanitizer 검증 경로를 추가 | B | TEST, RUNTIME, PRACTICAL | Builds separate ASan and UBSan binaries and runs operation and functional suites against them. | Sanitizer validation is valuable and correctly isolated from normal objects, but it is a standard supporting verification path rather than a project-specific mechanism or correction. |
| `d0762bc9af8c` | docs(project): 프로젝트 문서 정리 | C | - | Consolidates the final CLI, architecture, sorting, failure, verification, and resource documentation. | The documentation accurately records the finished system, but the commit itself changes no executable behavior, invariant enforcement, or test capability. |

# Development Threads

## Thread: Parallel stack state and operation invariants

`96b5324448e4` S — Establishes the parallel value/rank stack representation, ownership model, and completion predicate.  
↓  
`c0de1a1b18bb` A — Introduces pair-preserving state transitions and the emit/no-emit wrapper boundary.  
↓  
`73d2deb30224` B — Adds cross-stack push while conserving logical elements.  
↓  
`745ec72850d2` B — Adds forward rotation within the same representation.  
↓  
`68dfd1b1fb58` B — Completes the instruction vocabulary with reverse rotation.  
↓  
`86364d27baac` A — Verifies pair association, element conservation, size bounds, and sequences across all commands.  
↓  
`7eb6890c2c13` B — Locks down exact states and insufficient-stack no-op behavior.

**Significance**

The thread progresses from representation to shared transition architecture, then to complete command semantics and two complementary levels of evidence. The decisive judgment is not any individual `memmove`; it is that original values and dense ranks remain one logical element across both stacks, allowing the sorter to reason about ranks while the checker and tests retain the original-value association.

## Thread: Input grammar, coordinate compression, and size safety

`f36ad8899b5f` B — Establishes strict signed ASCII integer parsing and `int` range checks.  
↓  
`3bfb465ebdb1` B — Extends the grammar to mixed argv and C-whitespace token spans with exact allocation sizing.  
↓  
`e09cf45e21cd` S — Rejects duplicates and establishes the dense order-preserving rank bijection.  
↓  
`4cc9783286c0` B — Adds public parser acceptance and rejection tests.  
↓  
`44a4da8bc63d` B — Expands boundary evidence for signs, zero spellings, whitespace, integer endpoints, timeouts, and no-argument stdin behavior.  
↓  
`049ecd429548` A — Hardens logical token counts and byte-size calculations against narrowing and overflow.

**Significance**

Parsing evolves from lexical validity into the normalization contract required by sorting. Coordinate compression is the turning point: arbitrary signed values become a permutation over `0..n-1`. Later tests define the external grammar precisely, and the size fix closes the remaining gap between logically counted tokens and safely allocated storage.

## Thread: Building the sorting engine

`caa54cb306ad` B — Handles the complete two- and three-element state space directly.  
↓  
`160d1fb8d824` B — Reduces four and five elements to the verified three-element case through B.  
↓  
`1463a193a4f9` S — Introduces stable LSD binary radix sorting for the general case.  
↓  
`cf07495c97f7` B — Integrates parsing, B allocation, sorting, emission, and cleanup into `push_swap`.

**Significance**

The thread separates bounded small-state optimization from the scalable general mechanism. Tiny sorting minimizes avoidable setup for at most five elements, while radix sorting supplies deterministic `Θ(n log n)` command behavior for larger inputs. The final integration commit is important operationally but does not duplicate the algorithmic significance of the radix decision.

## Thread: Independent correctness and cost evidence

`5b7559278909` A — Adds an independent Python command interpreter and exhaustive permutations through size five.  
↓  
`a16dde75d935` B — Adds command-count ceilings for large deterministic cases.  
↓  
`23198a9cdd55` B — Replaces ambient randomness with a specified permutation generator and checks repeated-stream determinism.  
↓  
`6569949742eb` A — Separately baselines emitted commands, logical pair movements, peak project allocation, and final cleanup.  
↓  
`5505adf3e469` B — Runs the operation and functional suites against isolated ASan/UBSan builds.

**Significance**

Verification deliberately broadens from functional outcomes to independence, reproducibility, and cost. The Python model reduces common-mode risk from the product checker, deterministic fixtures make regressions comparable, resource instrumentation exposes the array representation's hidden movement cost, and sanitizers cover invalid memory behavior that explicit assertions may miss.

## Thread: Checker protocol and verdict hardening

`0b87adebca2b` B — Adds an initial general-purpose dynamic line reader.  
↓  
`f79ae7e86592` B — Dispatches legal command names to shared silent operations.  
↓  
`d906f4d86528` A — Establishes the complete checker lifecycle and `OK`/`KO` protocol.  
↓  
`44ee0830e9f0` B — Verifies every command family and the distinction among verdicts and malformed streams.  
↓  
`7713a31cf502` A — Replaces unbounded lines with protocol-sized frames and retries interrupted reads.  
↓  
`dbf76e147e68` A — Injects read faults and verifies NUL, empty, overlength, long-stream, and EOF-delimited boundaries.

**Significance**

The visible progression demonstrates an intermediate implementation becoming too general for a tiny fixed protocol. The correction moves the limit into the reader, where hostile or malformed input can be rejected before dispatch, and the fault tests then distinguish valid EOF framing, transient interruption, permanent transport failure, and protocol invalidity.

## Thread: Runtime fault injection and output failure propagation

`2e97f29961d8` B — Centralizes basic text output but initially ignores write results.  
↓  
`5faa9d7697af` A — Creates runtime wrappers for allocation and input, providing an instrumentation seam.  
↓  
`63969f770a21` A — Uses that seam to sweep allocation failures and prove zero live allocations.  
↓  
`315f4b91779b` A — Extends the runtime contract to write-all behavior, `SIGPIPE` handling, and end-to-end failure propagation.  
↓  
`e1154e181864` A — Verifies interrupted, short, zero, permanent, diagnostic, and closed-pipe write paths.

**Significance**

The thread changes failure handling from implicit assumptions into an explicit runtime contract. The generator's product is an externally visible command stream, so successful in-memory sorting cannot compensate for an incomplete write. The final design preserves already-written prefixes, stops further emission, cleans all owned memory, and reports failure when the transport cannot deliver the complete result.

# Most Important Commits

## feat(model): 배열 기반 스택 상태를 구현

Commit: `96b5324448e4`  
Importance: S  
Tags: ARCH, CORE, STACK_STATE

### Problem

The project needs one representation that can serve parsing, command generation, silent checker replay, sortedness checks, and resource cleanup. Sorting can use relative order, but the implementation must not lose the original integer associated with that order.

### Decision

Represent each stack as parallel `values` and `ranks` arrays with explicit `size` and `capacity`, and make stack initialization, cleanup, sortedness, and complete-state checks part of the model boundary.

### Why it mattered

Every later operation moves these arrays together, every sorter reads ranks, both executables own stacks through the same lifecycle, and the invariant tests are written around this representation. The decision determines both correctness obligations and the later physical cost of array-backed push and rotation.

### What changed

The commit adds `t_stack`, empty and allocated initialization, paired cleanup, rank-based sortedness, the A-sorted/B-empty completion predicate, and the first strict C99 build structure.

### Why this is important for understanding the project

It explains why coordinate compression can coexist with original values, why all operations have pair-preservation obligations, why both A and B use input-sized capacity, and why logical commands may cause linear physical movement.

## feat(operation): 스택 교환 연산을 구현

Commit: `c0de1a1b18bb`  
Importance: A  
Tags: CORE, STACK_STATE, INTEGRATION

### Problem

The generator must mutate stacks and emit commands, while the checker must replay the same command semantics without emitting them. Separate implementations would create an avoidable semantic divergence risk.

### Decision

Split the silent stack transition from an operation wrapper controlled by an `emit` flag, beginning with `sa`, `sb`, and `ss`, while always moving value and rank entries together.

### Why it mattered

The pattern becomes the integration boundary for every later command. `push_swap` uses the wrappers as state transition plus serialization, and checker uses the same wrappers as silent replay. Combined commands also remain one public instruction even when they apply two internal transitions.

### What changed

The commit adds `stack_swap`, optional command emission, and the single- and dual-stack swap wrappers, then registers the operation module as common code.

### Why this is important for understanding the project

It explains how generator and checker share instruction meaning, why product sharing reduces semantic drift, and why an independent Python replay model is later required to address the remaining common-mode risk.

## feat(parse): 중복 입력을 거절하고 상대 순위를 계산

Commit: `e09cf45e21cd`  
Importance: S  
Tags: CORE, INPUT, SORT

### Problem

The input domain contains arbitrary signed integers, but the sorting strategies need only a compact, non-negative representation of relative order. Duplicate values would make a unique target permutation undefined under the project's contract.

### Decision

Copy and sort the values, reject adjacent duplicates, and assign each original value the lower-bound index in the sorted copy as its rank.

### Why it mattered

The result is a bijection over `0..n-1` that preserves ordering. Tiny sorting can compare small relative ranks, radix sorting can traverse finite non-negative bit patterns, and the maximum required bit count depends only on input size.

### What changed

The parser adds an overflow-safe comparator, a binary lower-bound search, temporary sorted storage, duplicate rejection, rank assignment, and cleanup on every outcome.

### Why this is important for understanding the project

It is the mathematical bridge between input validation and command generation. Without the dense-rank invariant, the later radix mechanism and its deterministic command-count reasoning cannot be explained cleanly.

## feat(sort): 큰 입력을 기수 정렬로 처리

Commit: `1463a193a4f9`  
Importance: S  
Tags: CORE, SORT, HARD

### Problem

Direct case analysis is practical only for a bounded tiny state space. The general case needs a legal command sequence with predictable growth while preserving ordering established by previously processed bits.

### Decision

Apply stable LSD binary radix passes to dense ranks: rotate one-bit elements in A, push zero-bit elements to B, then push all of B back before advancing to the next bit.

### Why it mattered

Rotation preserves the one group, and the two reversals experienced by the zero group preserve its order. Each round therefore performs a stable partition, so later bits do not destroy lower-bit ordering. B returns to empty after every round, simplifying the next pass and the final correctness condition.

### What changed

The commit derives the necessary bit count from `size - 1`, scans exactly the round's starting A size, partitions by each bit with `ra` and `pb`, restores zeros with `pa`, and routes inputs above five to this strategy.

### Why this is important for understanding the project

This is the scalable mechanism that fulfills the primary purpose of `push_swap`. It also explains the distinction between `Θ(n log n)` logical commands and the larger physical movement cost imposed by the array representation.

## feat(checker): 명령 실행 결과를 판정

Commit: `d906f4d86528`  
Importance: A  
Tags: CHECKER, CORE, INTEGRATION

### Problem

A command generator alone cannot establish that a stream is legal and reaches the required terminal state. The validator must also distinguish a valid but insufficient stream from malformed input or execution failure.

### Decision

Build a separate checker that parses the same initial values, replays stdin frames through shared silent operations, and emits `OK` only for sorted A with empty B; otherwise a valid completed stream receives `KO`.

### Why it mattered

The commit establishes the public validation protocol and a second consumer of the common model. It also makes `KO` a normal status-zero judgment while reserving non-zero status and `Error` for malformed input, commands, allocation, or reading.

### What changed

The Makefile gains the checker executable, and checker control flow gains frame ownership, command application, cleanup, complete-state evaluation, and verdict output.

### Why this is important for understanding the project

It explains the generator/checker responsibility boundary, the meaning of successful process status, and why shared operations improve consistency but do not by themselves constitute independent proof.

## test(sort): 생성 명령의 정렬 결과를 독립 검증

Commit: `5b7559278909`  
Importance: A  
Tags: TEST, SORT, RISK

### Problem

The product checker and generator share the C operation implementation. A defect in push or rotation semantics could therefore cause both programs to accept the same incorrect behavior.

### Decision

Implement the eleven commands again using Python lists, reject unknown emitted commands, replay every stream independently, require sorted A and empty B, and still pass the same stream through the product checker.

### Why it mattered

The two representations fail differently. Exhausting every permutation for sizes two through five strongly covers the direct sorting branches, while fixed larger cases exercise the radix path. The checker remains valuable for integration, but it is no longer the only oracle.

### What changed

The test suite adds command parsing, an independent A/B state model, fixed cases including integer extremes, the no-command already-sorted case, and all 152 permutations for sizes two through five.

### Why this is important for understanding the project

It demonstrates a deliberate verification boundary: shared code is used for product consistency, while independent code is used for confidence in semantics. That distinction is one of the strongest engineering lessons in the branch.

## refactor(runtime): 메모리와 입력 시스템 호출을 공통화

Commit: `5faa9d7697af`  
Importance: A  
Tags: ARCH, REFACTOR, RUNTIME

### Problem

Allocation and read failures occur below domain logic, but direct calls scattered across parser, stack, and checker code make those failures difficult to inject, count, and verify consistently.

### Decision

Introduce `ps_malloc`, `ps_free`, and `ps_read` as a shared runtime boundary and migrate project-owned memory and checker input through it without changing normal semantics.

### Why it mattered

The abstraction enables later Nth-allocation failure sweeps, live-allocation accounting, read fault injection, write instrumentation, and resource metrics. It also gives all project allocations one matching release path.

### What changed

A runtime module is added, parser scratch storage, stack buffers, and checker command buffers migrate to it, and the low-level operation test links only the objects it actually requires.

### Why this is important for understanding the project

It explains how the branch moves from ordinary functional correctness to systematic failure-path engineering. The subsequent fault tests are not isolated test tricks; they depend on this explicit architectural seam.

## fix(io): 출력 실패를 호출 경로 끝까지 전파

Commit: `315f4b91779b`  
Importance: A  
Tags: RUNTIME, RISK, INTEGRATION

### Problem

The earlier output helper ignored write results. A command could mutate in-memory state but fail to reach stdout, and a closed pipe could terminate the process through `SIGPIPE` before normal cleanup.

### Decision

Add a write-all loop that retries `EINTR`, advances after short writes, rejects zero or permanent failures, ignores `SIGPIPE`, and returns status through output helpers, operation wrappers, sort helpers, checker verdicts, and both executable entry points.

### Why it mattered

The generator's actual product is the external command stream, not the final private stack state. The change prevents incomplete delivery from being reported as success, stops further generation after failure, preserves already-visible prefixes without repetition, and still releases all owned resources.

### What changed

Operation and sorting APIs become fallible, checker verdict writes are checked, both mains initialize pipe behavior and convert output failure to status one, and error reporting is attempted without replacing the original failure.

### Why this is important for understanding the project

It captures the branch's most important reliability correction: state transition and serialization are coupled effects, but external I/O is not transactional. Correct behavior therefore requires explicit partial-failure semantics rather than rollback fiction.
