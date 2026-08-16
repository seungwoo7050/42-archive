# Project Importance Profile

Project: C Foundation (`libft`)  
Domain: C99 foundational static library and low-level API implementation  
Primary Purpose: Reimplement 43 character, memory, string, conversion, allocation, file-descriptor, and singly linked-list APIs as `libft.a`, with explicit contracts for bounds, integer arithmetic, ownership, partial failure, callbacks, and the release artifact.  
Resolved Commit Scope: The complete independent linear ancestry of `c/libft`, from root `7e18e418c119` through tip `582af6929a21`, comprising 54 commits. The history contains no inherited unrelated ancestors and no merge commits. Commits are classified oldest to newest, and 12-character abbreviated SHAs are unique within the scope.

## Core Technical Areas

- ASCII character classification and case conversion independent of locale.
- Byte-range filling, copying, overlap-safe movement, searching, and comparison.
- NUL-terminated string capacity, bounded search, construction, and callback traversal.
- Signed and unsigned integer-domain reasoning for parsing, formatting, and allocation sizes.
- Heap ownership for single allocations and multi-allocation rollback.
- Singly linked-list structure, callback-defined content lifetime, and mapping failure cleanup.
- POSIX file-descriptor output under short writes, `EINTR`, zero progress, and permanent errors.
- Static archive composition, exported API, external dependencies, consumer linkage, compiler compatibility, and sanitizer-backed verification.

## Core Architecture

- `libft.h` is the single public authority for the API and `t_list`; implementation is divided into small responsibility-specific translation units under `src/`.
- `libft.a` is the distribution boundary. The build records generated dependencies and later verifies archive members, global symbols, external undefined symbols, and an out-of-tree consumer.
- Simpler primitives are reused by stronger operations: `ft_bzero` delegates to byte filling, non-overlapping copy remains distinct from overlap-safe movement, and list mapping relies on the established list-clear lifecycle.
- Pointer-returning APIs have different ownership categories: borrowed addresses, one new allocation, a multi-allocation root, or a node whose opaque `content` lifetime remains caller-defined.
- Verification is layered: libc differential and boundary tests, deterministic `malloc` and `write` failure injection, sanitizer builds, host leak checking, compiler-matrix builds, and release-artifact inspection.

## Critical Invariants

- A length-bounded memory operation accesses only the specified valid byte range; zero-length operations perform no access, and overlapping movement preserves every source byte needed by later copies.
- Allocation size arithmetic must be validated before multiplication or addition so wrapped sizes are never passed to `malloc`.
- Multi-allocation constructors either return a complete result or release every resource acquired for the partial result; no partially owned root escapes on failure.
- List nodes and list content have separate lifetimes. A content destructor is invoked exactly according to the caller-supplied policy, and completed cleanup leaves the caller's head `NULL`.
- File-descriptor output advances after every positive short write, retries `EINTR`, treats zero progress as failure, and stops composite output after a permanent error.
- The archive contains the intended translation units and public symbols only, links from outside the repository, and depends only on the explicitly allowed runtime functions.
- Tests of reimplemented libc-style functions must not be invalidated by compiler builtin substitution.

## Major Engineering Difficulties

- Maintaining correct arithmetic across `size_t`, `unsigned int`, signed `int`, and platform-dependent integer widths without overflow, wraparound, or undefined negation.
- Distinguishing the weaker non-overlap copy precondition from the direction-sensitive behavior required for overlapping ranges.
- Rolling back nested allocations in `ft_split` and callback-produced node/content pairs in `ft_lstmap`.
- Preserving output progress across short system calls while fitting a public `void` descriptor API that cannot return an error status.
- Reproducing allocation and write failures deterministically without changing the production API.
- Inspecting archive symbols portably enough for both Darwin and Linux and validating the same source under Clang and GNU GCC.

## Practical Engineering Areas

- Guard-region and whole-buffer comparisons for detecting byte-range underruns and overruns.
- Differential testing against libc while comparing only properties guaranteed by the standard, such as sign rather than exact `memcmp` magnitude.
- Explicit ownership cleanup and rollback at every allocation position.
- Error-path testing for `EINTR`, `EPIPE`, zero-byte writes, invalid descriptors, and allocation exhaustion.
- Strict warning, language, and builtin policies that keep low-level reimplementations honest.
- Sanitizer, leak-checker, compiler, archive, and clean-rebuild checks with clearly separated evidence scopes.

## S-level Criteria

- Establishes a project-defining ownership transaction in which a multi-resource result is complete on success and fully rolled back on failure.
- Establishes or restores the system-call progress and termination invariant shared by all file-descriptor output.
- Makes a cross-cutting architectural decision without which the finished library's central correctness or failure story cannot be explained.

## A-level Criteria

- Resolves a significant overlap, overflow, portability, callback-lifetime, or partial-failure risk in a core API.
- Establishes an important node/content ownership boundary or extends rollback safely to callback-produced resources.
- Adds deterministic evidence for a difficult failure path or protects the archive and compiler boundary in a way that materially changes confidence in the deliverable.
- Performs a small root-cause correction whose failure could cause wraparound, nontermination, invalid access, or undefined behavior.

## Typical B-level Work

- Implements an expected API inside the established header, translation-unit, ownership, and build structure.
- Adds ordinary boundary, differential, or ownership tests for behavior whose mechanism is already defined.
- Applies an existing range, allocation, linkage, or formatting pattern to another function.
- Performs a local refactor or verification addition that supports, but does not establish, a major invariant.

## Typical C-level Work

- Documentation-only commits.
- Semantically equivalent wording or arithmetic cleanup with negligible behavioral effect.
- Minor maintenance that contributes little to understanding the library's mechanisms, invariants, or release boundary.

## Project-specific Tags

BYTE_RANGE — Correctness of explicit byte intervals, copy overlap, search bounds, and object representations.  
SIZE_ARITH — Capacity, length, allocation-size, and signed/unsigned range arithmetic.  
OWNERSHIP — Heap ownership, cleanup order, multi-allocation rollback, and callback-produced resources.  
LIST_LIFECYCLE — Singly linked-list structure and the separate lifetimes of nodes and opaque content.  
FD_OUTPUT — POSIX descriptor writing, progress, interruption, permanent failure, and byte accounting.  
RELEASE — Public header, archive members, symbols, dependencies, external consumers, and compiler compatibility.  
VERIFY — Cross-cutting differential, failure-injection, sanitizer, leak, and build verification.

# Commit Classification

| Commit | Subject | Importance | Tags | Summary | Why |
| --- | --- | --- | --- | --- | --- |
| `7e18e418c119` | `docs(readme): 프로젝트 목표와 초기 규약을 기록` | C | - | Records the project goal and initial development rules. | Documentation-only root work provides context but contributes no implemented mechanism or verified invariant. |
| `647f57dd08d5` | `feat(char): ASCII 문자 판별과 대소문자 변환 구현` | B | CORE | Introduces the ASCII character API, public header, and static-library build. | This is necessary foundational implementation, but its range checks and composition follow straightforward contracts within the initial design. |
| `bd92a25dc8c1` | `test(char): ASCII 문자 동작을 libc와 비교` | B | TEST, VERIFY | Adds a reusable test harness and differential character tests. | The tests establish broad ordinary coverage and the boolean-result contract, but they verify a straightforward subsystem rather than a project-defining mechanism. |
| `27dce86a9237` | `feat(memory): 메모리 채우기와 0 초기화 구현` | B | BYTE_RANGE, CORE | Implements byte filling and zeroing over explicit lengths. | The byte-oriented representation and reuse of one primitive are sound, but this is normal implementation inside the library's established API model. |
| `1bbc7e019193` | `test(memory): 메모리 채우기 범위 검증` | B | BYTE_RANGE, TEST | Checks fill results, guards, return values, and zero-length access. | Guard-region testing protects exact write bounds, yet it remains routine verification of an already clear memory contract. |
| `4873fb11ac60` | `feat(memory): 겹치지 않는 메모리 복사 구현` | B | BYTE_RANGE, CORE | Adds the non-overlapping byte-copy primitive. | Separating the weaker copy contract from later move semantics is useful, but the implementation itself is ordinary foundational work. |
| `640dc585c85a` | `test(memory): 메모리 복사 경계 검증` | B | BYTE_RANGE, TEST | Verifies copy bounds, source preservation, and return identity. | The test protects the expected primitive contract without establishing a new architecture or difficult failure guarantee. |
| `f2c4c042b339` | `feat(memory): 겹치는 메모리의 안전한 이동 구현` | A | BYTE_RANGE, CORE, RISK | Implements overlap-safe movement by choosing a safe traversal direction. | Correctness depends on recognizing when forward copying would destroy unread source bytes. This is a significant memory invariant, although it is localized rather than project-defining across subsystems. |
| `69853cd4d3ce` | `test(memory): 겹치는 메모리 이동 검증` | B | BYTE_RANGE, TEST | Compares both overlap directions and disjoint moves with libc. | Covering both traversal directions materially protects the implementation, but the tests confirm the established move contract rather than add a new engineering boundary. |
| `37b6bfc7cad2` | `feat(memory): 범위를 제한한 메모리 검색과 비교 추가` | B | BYTE_RANGE, CORE | Adds bounded byte search and unsigned-byte comparison. | Unsigned ordering and strict length bounds are important, but this remains normal implementation of well-defined byte primitives. |
| `37359b42b504` | `test(memory): 메모리 검색과 비교 검증` | B | BYTE_RANGE, TEST | Exercises embedded zeros, high-bit bytes, and sign-only comparison. | The differential matrix is competent boundary verification, not a major project-level decision. |
| `531dd5d21142` | `feat(string): 문자열 길이 계산과 제한 복사·붙이기 추가` | B | SIZE_ARITH, CORE | Introduces length and capacity-bounded string copy and concatenation. | Capacity-aware terminator placement and returned source-length accounting matter, but the work implements expected string contracts within the existing structure. |
| `bca8f9784a5c` | `test(string): 문자열 길이와 capacity 경계 검증` | B | SIZE_ARITH, TEST | Tests length, truncation, capacities, and guard bytes. | These cases prevent ordinary off-by-one regressions but do not independently shape the project's architecture. |
| `ef4ddf9fac29` | `feat(string): 문자의 첫·마지막 위치 검색을 추가` | B | CORE | Adds first- and last-occurrence string search. | The implementation is necessary API coverage with limited project-specific judgment. |
| `cbeebf29df0e` | `feat(string): 범위 비교와 부분 문자열 검색을 추가` | B | BYTE_RANGE, CORE | Adds bounded string comparison and bounded substring search. | The routines preserve supplied search limits and unsigned ordering, but they are ordinary work under established string semantics. |
| `05f2bd9da873` | `test(string): 문자열 검색과 비교 경계 검증` | B | EDGE, TEST | Covers empty needles, bounded prefixes, and comparison edges. | The matrix usefully locks down edge behavior without adding a new mechanism. |
| `080472b6080d` | `feat(convert): 표현 가능한 10진수 정수 해석` | A | SIZE_ARITH, EDGE, RISK | Parses decimal text using unsigned accumulation and signed limits. | The pre-multiplication limit check and asymmetric INT_MIN bound avoid overflow while defining saturation behavior. This is significant arithmetic judgment, though confined to one conversion API. |
| `9d21ee17438a` | `test(convert): 정수 해석 경계 검증` | B | EDGE, TEST | Checks whitespace, signs, digit boundaries, and saturation. | The tests validate the conversion's boundary policy but do not establish it independently. |
| `3b1b30983876` | `feat(alloc): 0 초기화 메모리와 문자열 복제 추가` | A | SIZE_ARITH, OWNERSHIP, RISK | Adds overflow-checked zeroed allocation and owned string duplication. | Preventing multiplication wrap before allocation establishes a foundational allocation-size invariant used by later multi-object builders. It is significant but not sufficient alone to define the whole project. |
| `032aed4013af` | `test(alloc): 할당과 문자열 복제 계약 검증` | B | OWNERSHIP, TEST | Verifies zero initialization, duplication, and allocation ownership. | This is ordinary contract coverage; deterministic failure semantics are established later. |
| `6d076de7185e` | `feat(string): 부분 문자열 생성을 구현` | B | OWNERSHIP, SIZE_ARITH | Adds allocation-backed substring extraction with bounded copying. | The function applies established allocation and range patterns without introducing a new ownership model. |
| `644b1c65444c` | `feat(string): 문자열 결합을 구현` | B | OWNERSHIP, SIZE_ARITH | Adds checked allocation and concatenation of two strings. | Addition-limit handling matters, but this is a single-allocation builder following the existing ownership contract. |
| `b434b6944e9d` | `feat(string): 양끝 문자 집합 제거를 구현` | B | OWNERSHIP, CORE | Adds allocation-backed trimming by a caller-supplied set. | The edge handling is useful but remains a normal string-building feature. |
| `04df67512df4` | `test(string): 문자열 생성과 소유권 검증` | B | OWNERSHIP, TEST | Tests substring, join, trim, allocation, and source preservation. | The suite verifies expected ownership and boundary behavior but not difficult partial-failure paths. |
| `8c0a35a50878` | `feat(string): 실패 시 정리되는 문자열 분리 구현` | S | OWNERSHIP, CORE, RISK | Builds a split result with complete rollback after any field-allocation failure. | This is the first project-defining multi-allocation transaction: success publishes a complete root, while failure releases every acquired child and the root. Omitting it would leave a major gap in the library's ownership and failure story. |
| `01360ba43b01` | `test(string): 문자열 분리 결과 검증` | B | OWNERSHIP, TEST | Checks delimiter patterns, empty inputs, and result ownership. | The tests validate successful layouts; exhaustive allocation-failure proof arrives later, so this remains normal coverage. |
| `1381c0226abf` | `feat(convert): 부호 있는 정수의 문자열 변환 구현` | A | SIZE_ARITH, EDGE, OWNERSHIP | Converts every int to newly allocated decimal text without negating INT_MIN. | Using an unsigned-domain magnitude protects a real undefined-behavior boundary and fixes the allocation size exactly. The decision is significant but localized to one converter. |
| `9abf71572a9e` | `test(convert): 정수 문자열 변환 검증` | B | EDGE, TEST | Covers signed endpoints and digit-count transitions. | The matrix verifies the established conversion algorithm and ownership contract without introducing a new mechanism. |
| `51cce7699289` | `feat(string): 인덱스를 사용하는 문자열 변환 추가` | B | OWNERSHIP, CORE | Adds allocating and in-place callback string traversals. | Capturing the initial length clarifies traversal semantics, but the feature remains ordinary work within the public API. |
| `ca446a9ba82f` | `test(string): callback 문자열 변환 검증` | B | TEST, EDGE | Checks callback order, source preservation, mutation, and fixed traversal length. | The tests protect subtle callback behavior, yet they validate an established local contract rather than a project-wide invariant. |
| `26509fd54c3d` | `feat(io): 파일 디스크립터 출력 함수 추가` | B | FD_OUTPUT, CORE | Adds void-returning character, string, newline, and integer descriptor output. | This establishes the initial API, but it still discards short-write and interruption behavior; the defining reliability decision is made later. |
| `60c35f2fb431` | `test(io): 파일 디스크립터 출력 검증` | B | FD_OUTPUT, TEST | Captures normal output and observes invalid-descriptor and broken-pipe behavior. | The tests establish the initial observable policy, but they do not yet prove completion after partial system calls. |
| `b813d61d31fc` | `feat(list): 연결 리스트 노드 생성과 앞 삽입을 구현` | B | LIST_LIFECYCLE, OWNERSHIP | Introduces list nodes and front insertion with borrowed content pointers. | Separating node allocation from content ownership is necessary, but this commit contains the straightforward base representation. |
| `4e2ed2daae98` | `feat(list): 연결 리스트 크기와 마지막 노드를 조회` | B | LIST_LIFECYCLE | Adds non-mutating list size and tail queries. | These are routine traversals within the established node model. |
| `970e8d42af0f` | `feat(list): 연결 리스트 뒤 삽입을 구현` | B | LIST_LIFECYCLE | Adds tail insertion, including the empty-list case. | The implementation is necessary but applies an established linkage pattern without new lifecycle reasoning. |
| `aad656e4f6c5` | `test(list): 노드 생성과 삽입 불변식 검증` | B | LIST_LIFECYCLE, TEST | Checks node identity, ordering, terminal links, and invalid arguments. | The tests protect normal structural invariants but not yet content destruction or rollback. |
| `7a016ad8fd21` | `feat(list): 연결 리스트 순회와 삭제 구현` | A | LIST_LIFECYCLE, OWNERSHIP, RISK | Adds callback-driven iteration, node deletion, and complete list clearing. | This establishes the critical boundary between structural node lifetime and caller-defined content lifetime. It is significant lifecycle engineering used by later rollback, but narrower than the project's S-level mechanisms. |
| `330fc6efb45c` | `test(list): 순회와 삭제 수명 검증` | B | LIST_LIFECYCLE, TEST | Verifies callback order, exact destruction, and null-destructor no-ops. | The evidence is important but remains direct verification of the lifecycle contract. |
| `6672ea67fae4` | `feat(list): 실패 시 정리되는 리스트 변환 구현` | A | LIST_LIFECYCLE, OWNERSHIP, RISK | Maps into an independent list and rolls back mapped content and nodes on failure. | The commit applies all-or-nothing ownership to callback-produced resources and preserves the source list. It is a major lifecycle decision, but it extends the rollback model first established by split rather than defining a second S-level concept. |
| `68332cbaddaa` | `test(list): 리스트 변환과 content 수명 검증` | B | LIST_LIFECYCLE, TEST | Checks structural independence, content ownership, order, and null mapped values. | The tests provide normal contract evidence; deterministic node-allocation failures are exercised later. |
| `bce818ac8ff4` | `fix(string): callback 순회의 진행 인덱스를 확장` | A | SIZE_ARITH, EDGE, DEBUG | Moves traversal state to size_t and narrows only at the callback boundary. | The fix removes a non-obvious wraparound and potential nontermination for objects larger than UINT_MAX, restoring the loop's object-size invariant with a small but significant correction. |
| `1077556d1c4b` | `refactor(io): 숫자 출력을 자릿수 helper로 분리` | B | FD_OUTPUT, REFACTOR | Routes integer digits through the common character-output primitive. | This improves cohesion and prepares later retry propagation, but the behavior and public reliability guarantee are not yet changed. |
| `3f2bfbf11e1f` | `fix(io): 파일 디스크립터 출력을 끝까지 재시도` | S | FD_OUTPUT, CORE, RISK | Introduces a write-all loop for short writes, EINTR, zero progress, and hard errors. | This restores the defining system-call invariant that successful progress is preserved and remaining bytes are retried, while permanent failure stops composite output. The final reliability story cannot be explained without this commit. |
| `b013c926ceb5` | `test(io): 부분 쓰기와 EINTR 이후 진행을 검증` | A | FD_OUTPUT, TEST, RISK | Adds deterministic write scripts for partial progress, interruption, zero, and permanent errors. | The injected system-call boundary materially proves the S-level completion policy and error-stop behavior, providing evidence ordinary pipe tests could not guarantee. |
| `cc1e59911bd8` | `refactor(string): 결합 문자열의 할당 한계를 명시` | C | SIZE_ARITH, REFACTOR | Rewrites the existing strjoin overflow bound in an explicit form. | The expression is semantically equivalent and improves readability only; it contributes little new behavioral or structural significance. |
| `4df8b23505b8` | `build(flags): C99 경고와 builtin 정책을 고정` | A | RELEASE, VERIFY, RISK | Locks strict C99 warnings, disables compiler builtins, and exposes the bonus target. | Disabling builtins is significant for a libc reimplementation because it prevents the compiler from silently substituting the functions being tested. The build policy materially strengthens evidence across the whole library. |
| `fd3ae063139d` | `test(alloc): 할당 실패와 rollback을 검증` | A | OWNERSHIP, TEST, RISK | Injects malloc failures and tracks leaks and invalid frees across builders. | This turns rollback from code inspection into deterministic evidence for split and list mapping at every allocation position. It materially raises confidence in a core project invariant, though it verifies rather than creates that invariant. |
| `79c0dcefb590` | `test(release): archive와 consumer 경계를 검증` | A | RELEASE, ARCH, VERIFY | Checks archive members, exported API, external dependencies, and out-of-tree linking. | The commit defines the deliverable as more than compilable source: the archive's composition and consumer-visible boundary become reproducible contracts. This is significant release engineering, not core runtime behavior. |
| `f5de4306ebcd` | `test(sanitize): undefined behavior 검사를 추가` | B | VERIFY, TEST | Adds UBSan-specific objects and execution targets. | The sanitizer broadens defect detection but applies a standard verification technique without changing project architecture. |
| `c625970fd211` | `test(sanitize): address sanitizer 검사를 추가` | B | VERIFY, TEST | Adds ASan-specific builds and runtime checks. | This is useful memory-safety coverage, but it is routine validation infrastructure and intentionally does not replace leak testing. |
| `9f555c37a6d8` | `test(leak): host 누수 검사 경로를 추가` | B | VERIFY, TEST | Adds host leak checking through leaks or Valgrind. | The target strengthens practical ownership verification but introduces no new project-specific mechanism. |
| `e31a2e748685` | `test(build): Clang과 GCC 호환성을 검증` | A | RELEASE, VERIFY | Runs clean copies of the full suite under both Clang and GNU GCC. | For a low-level C library, independent compiler validation catches extension and builtin assumptions across build, failures, and archive checks. This is significant compatibility evidence, though not runtime architecture. |
| `b90fd748255a` | `test(release): 전체 검증 절차를 연결` | B | RELEASE, VERIFY | Orchestrates clean build, functional, failure, sanitizer, archive, compiler, leak, and no-op rebuild checks. | The target makes the established evidence reproducible in one sequence, but it mostly composes existing mechanisms rather than adding a new guarantee. |
| `582af6929a21` | `docs(project): 프로젝트 문서 정리` | C | - | Documents the finished API, ownership rules, architecture, and verification limits. | The documentation is extensive and accurate context, but it is documentation-only and does not change implemented behavior or verification machinery. |

# Development Threads

## Thread: Separating non-overlapping copy from overlap-safe movement

`4873fb11ac60` B — Establishes `ft_memcpy` as the primitive whose caller guarantees non-overlapping ranges.  
↓  
`f2c4c042b339` A — Adds direction-sensitive movement so destination overlap cannot destroy unread source bytes.  
↓  
`69853cd4d3ce` B — Differentially verifies same-position, forward-overlap, backward-overlap, and disjoint cases.

**Significance**

The sequence makes the precondition boundary explicit instead of hiding overlap handling inside every copy. The stronger operation is built only where needed, and the tests cover both possible overlap directions because the safe traversal direction changes with range placement.

## Thread: From single allocations to rollback-safe ownership

`3b1b30983876` A — Establishes overflow-checked allocation sizes and the basic caller-owned allocation contract.  
↓  
`6d076de7185e` B — Applies that contract to an exactly sized substring result.  
↓  
`644b1c65444c` B — Extends checked addition to joined strings.  
↓  
`8c0a35a50878` S — Introduces a multi-allocation root whose partially built children are all released on failure.  
↓  
`7a016ad8fd21` A — Separates list-node lifetime from callback-defined content lifetime and provides complete clearing.  
↓  
`6672ea67fae4` A — Applies all-or-nothing ownership to callback-produced content and newly allocated list nodes.  
↓  
`fd3ae063139d` A — Injects failure at each allocation position and measures leaks and invalid frees.

**Significance**

The ownership model grows from one returned allocation to nested object graphs. `ft_split` establishes the decisive complete-or-rollback rule; list lifecycle callbacks generalize ownership to opaque caller data; `ft_lstmap` combines both concerns. The final failure harness demonstrates that cleanup holds at every intermediate acquisition point rather than only on successful examples.

## Thread: Hardening file-descriptor output against partial system calls

`26509fd54c3d` B — Adds the initial void-returning descriptor API and one-shot writes.  
↓  
`60c35f2fb431` B — Captures normal bytes and establishes the initial invalid-descriptor and broken-pipe observations.  
↓  
`1077556d1c4b` B — Routes integer digits through the common character-output path.  
↓  
`3f2bfbf11e1f` S — Introduces write-until-complete behavior, `EINTR` retry, zero-progress rejection, and permanent-error stopping.  
↓  
`b013c926ceb5` A — Replaces nondeterministic operating-system timing with scripted write results and verifies the exact retry sequence.

**Significance**

The initial public API cannot return status, so reliability has to be enforced internally and failure has to stop further composite output. The thread evolves from formatting correctness to a system-call progress invariant, then proves that invariant with a deterministic substitute for `write`.

## Thread: Treating the static archive as a verified release artifact

`4df8b23505b8` A — Locks C99 warnings and disables compiler builtin substitution.  
↓  
`79c0dcefb590` A — Verifies archive members, public definitions, allowed external dependencies, and an out-of-tree consumer.  
↓  
`f5de4306ebcd` B — Adds undefined-behavior sanitizer execution.  
↓  
`c625970fd211` B — Adds address-sanitizer execution.  
↓  
`9f555c37a6d8` B — Adds host leak checking.  
↓  
`e31a2e748685` A — Runs the complete release-oriented suite under both Clang and GNU GCC in clean copied trees.  
↓  
`b90fd748255a` B — Connects clean build, functional, failure, sanitizer, archive, compiler, leak, and no-op rebuild checks.

**Significance**

The project stops treating a successful local compile as sufficient evidence. Compiler builtins are excluded, the archive and consumer boundary are inspected directly, independent defect detectors cover different failure classes, and the same evidence is reproduced across compiler families before being orchestrated into one release check.

# Most Important Commits

## feat(memory): 겹치는 메모리의 안전한 이동 구현
Commit: `f2c4c042b339`  
Importance: A  
Tags: BYTE_RANGE, CORE, RISK

### Problem

A forward byte copy is correct only when destination writes cannot overwrite source bytes that have not yet been read. A foundational memory library therefore needs a stronger operation than `ft_memcpy` for overlapping ranges.

### Decision

`ft_memmove` keeps the non-overlap primitive unchanged and detects the case in which the destination begins inside the source interval. That case is copied backward; same-position and zero-length operations return immediately; the remaining cases reuse forward `ft_memcpy`.

### Why it mattered

The change establishes that overlap is a semantic boundary, not an incidental optimization detail. It preserves source information without weakening or complicating the simpler copy contract.

### What changed

A new translation unit and public declaration were added, and the movement algorithm selected traversal direction from the relative range placement.

### Why this is important for understanding the project

The commit is the clearest early example of reasoning from valid byte ranges and preconditions rather than merely reproducing a familiar function name. That range discipline recurs in bounded search, string capacities, and failure-safe construction.

## feat(alloc): 0 초기화 메모리와 문자열 복제 추가
Commit: `3b1b30983876`  
Importance: A  
Tags: SIZE_ARITH, OWNERSHIP, RISK

### Problem

An allocation request computed as `count * size` can wrap in `size_t`, causing a smaller object to be allocated than the caller's logical request. Subsequent initialization would then violate the allocated range even though `malloc` itself succeeded.

### Decision

`ft_calloc` validates multiplication before performing it, defines a concrete one-byte allocation policy for a zero product, and zeroes exactly the resulting object. `ft_strdup` likewise checks the terminator-inclusive size and returns a caller-owned copy.

### Why it mattered

This establishes the allocation arithmetic and ownership foundation used by later string builders and multi-allocation roots. Preventing wrapped allocation sizes is a prerequisite for every later byte-range guarantee.

### What changed

The public allocation API and implementation module were added, including overflow rejection, zero initialization, exact string duplication, and `NULL` failure returns.

### Why this is important for understanding the project

The library's safety story depends on validating sizes before acquisition, not after a too-small object already exists. This commit provides the primitive on which rollback-safe construction is built.

## feat(string): 실패 시 정리되는 문자열 분리 구현
Commit: `8c0a35a50878`  
Importance: S  
Tags: OWNERSHIP, CORE, RISK

### Problem

Splitting a string creates one pointer array and an unknown number of separately allocated fields. Failure after several successful field allocations creates a partially owned object graph that cannot be safely returned and must not leak.

### Decision

The implementation counts fields, allocates a null-terminated root array, creates each field independently, and records the number already owned. If any field allocation fails, a dedicated cleanup routine releases every completed field and then the root before returning `NULL`.

### Why it mattered

This is the first complete transaction-like ownership mechanism in the history. Success publishes a complete result; failure publishes nothing and leaves no acquired child alive.

### What changed

`ft_split` was added to the public API and build, together with field counting, exact field copying, and reverse cleanup of a partial result.

### Why this is important for understanding the project

The finished project repeatedly emphasizes rollback rather than normal-path allocation alone. This commit establishes that defining invariant and provides the model later extended to callback-produced list mappings.

## feat(list): 실패 시 정리되는 리스트 변환 구현
Commit: `6672ea67fae4`  
Importance: A  
Tags: LIST_LIFECYCLE, OWNERSHIP, RISK

### Problem

List mapping combines two ownership events for every source node: a callback creates mapped content, then the library allocates a node to own that content. A node-allocation failure can therefore strand both the newest callback result and every previously built node/content pair.

### Decision

The mapper keeps the source immutable, appends new nodes through a maintained tail, destroys an unlinked callback result immediately when node creation fails, and clears the entire partial mapped list with the caller's destructor.

### Why it mattered

The commit generalizes rollback from a known array of strings to opaque callback-produced resources. It also relies on the earlier separation between node lifetime and content lifetime, showing that the list API's destructor contract is an architectural dependency rather than an isolated helper.

### What changed

`ft_lstmap` was added with a three-argument ownership contract and an all-or-nothing failure path.

### Why this is important for understanding the project

This commit demonstrates how callback APIs transfer responsibility without knowing the content type. It is central to understanding why `del` is mandatory and why partial list results never escape.

## fix(io): 파일 디스크립터 출력을 끝까지 재시도
Commit: `3f2bfbf11e1f`  
Importance: S  
Tags: FD_OUTPUT, CORE, RISK

### Problem

POSIX `write` may successfully consume fewer bytes than requested or fail with `EINTR` before making progress. Treating one call as complete silently truncates output, while blindly retrying every failure can duplicate data or loop after a permanent error.

### Decision

A private `write_all` loop advances only by positive returned counts, limits each request to `SSIZE_MAX`, retries only `EINTR`, turns zero progress into `EIO`, and stops on other errors. Composite newline and integer output cease once an earlier component fails.

### Why it mattered

This establishes the system-call progress invariant shared by all descriptor helpers. The public functions cannot return status, so internal completion and stop-on-error behavior are the only way to prevent silent continuation after a failed prefix or digit.

### What changed

Every descriptor helper was routed through the new completion loop, recursive numeric output began propagating failure internally, and sign emission became a prerequisite for further digits.

### Why this is important for understanding the project

The commit changes the I/O layer from formatting helpers that happen to call `write` into robust adapters over POSIX partial-success semantics. It is one of the two clearest project-defining failure mechanisms.

## test(alloc): 할당 실패와 rollback을 검증
Commit: `fd3ae063139d`  
Importance: A  
Tags: OWNERSHIP, TEST, RISK

### Problem

Normal tests can show that successful results are correct, but they cannot establish that every intermediate allocation failure releases exactly the resources already acquired. Manual inspection is especially weak for nested constructors such as `ft_split` and `ft_lstmap`.

### Decision

The test build substitutes tracked `malloc` and `free`, chooses the allocation attempt that must fail, records live objects and invalid frees, and reruns the constructors across every possible failure position.

### Why it mattered

This converts the rollback invariant into reproducible evidence. It distinguishes a function that merely returns `NULL` from one that also leaves no leaks, double frees, invalid frees, or source mutation.

### What changed

A separate failure-instrumented object set, allocator support module, and failure suite were added for single-allocation APIs, every split acquisition point, and each mapped-list node allocation.

### Why this is important for understanding the project

The commit reveals the project's verification philosophy: difficult failure behavior is not inferred from happy-path tests or sanitizer absence but forced deterministically and measured directly.

## test(release): archive와 consumer 경계를 검증
Commit: `79c0dcefb590`  
Importance: A  
Tags: RELEASE, ARCH, VERIFY

### Problem

Passing in-tree tests does not prove that `libft.a` contains the intended object members, exposes the intended public symbols, avoids accidental external dependencies, or links for a consumer with only the documented header and archive.

### Decision

The release check compares archive members and normalized symbol sets with explicit manifests, permits only a small platform-aware undefined-symbol set, and compiles and runs a consumer in a temporary directory outside the source tree.

### Why it mattered

The deliverable becomes a verified binary interface rather than an incidental by-product of the Makefile. The check catches accidental global helpers, missing objects, unexpected runtime calls, and hidden in-tree include or path dependencies.

### What changed

Archive, API, and allowed-dependency manifests, a Darwin/Linux symbol-inspection script, an external smoke consumer, and a Make target were added.

### Why this is important for understanding the project

The final project is a static library, so correctness includes the shape of the artifact seen by downstream code. This commit explains how implementation boundaries are enforced after compilation, not only described in `libft.h`.
