# Project Importance Profile

Project: ft_containers (`cpp/ft_container`)
Domain: Header-only C++98 generic container library
Primary Purpose: Implement a selected standard-library-style surface for `ft::vector`, `ft::stack`, `ft::map`, and their supporting utilities while making allocator ownership, object lifetime, exception behavior, iterator contracts, red-black-tree invariants, public-header usability, and asymptotic behavior explicitly verifiable.
Resolved Commit Scope: The complete independent, linear 64-commit history of `cpp/ft_container`, from `84de7f67ab5b` through `1a890fbf69f9`, ordered oldest to newest. The history contains no merge commits and no unrelated inherited ancestors. All 64 commits are classified; the two documentation-only commits are included here even though they were correctly excluded from `commit-bodies.md`.

## Core Technical Areas

- C++98 template dispatch, type traits, value pairs, shared range algorithms, iterator traits, and reverse-iterator adaptation.
- `ft::vector` contiguous storage ownership, allocator-mediated construction and destruction, size/capacity separation, growth arithmetic, self-aliasing, in-place versus reallocating mutation, and exception safety.
- `ft::stack` as a deliberately thin LIFO adaptor over an existing sequence container.
- `ft::map` node allocation, comparator-defined ordering, ordered queries, red-black insertion and deletion balancing, sentinel-based end-state representation, iterator stability, and policy/allocator ownership.
- Header-only public API composition, self-contained component headers, multi-translation-unit consumption, C++98 compiler compatibility, sanitizer instrumentation, and continuous integration.
- Differential testing against standard containers, custom allocator and throwing-policy failure injection, white-box red-black validation, deterministic randomized testing, and structural complexity limits.

## Core Architecture

- The utility layer is split into independent headers for traits, pairs, algorithms, and iterators. Container headers consume those abstractions, while `ft_containers.hpp` provides an aggregate public entry point.
- `ft::vector` owns an allocator, a contiguous allocation pointer, a constructed-element count, and an allocation capacity. The range `[data, data + size)` contains live objects; `[data + size, data + capacity)` is raw storage and must never be treated as constructed.
- `ft::stack` owns no separate storage algorithm. It restricts access to the back of its underlying container and delegates size, lifetime, and relational behavior.
- `ft::map` stores values in allocator-created nodes linked as a red-black tree. A value-free header sentinel owns the root, minimum, and maximum links and is also the stable representation of `end()`.
- The map's comparator defines key equivalence and tree ordering; the rebound node allocator defines physical node ownership. Copy, assignment, and swap must keep policy state and owned tree state coherent.
- Verification is layered: public differential tests, targeted edge and failure tests, iterator-state tests, a constrained internal tree inspector, deterministic randomized operations, complexity bounds, independent-header compilation, linked consumer tests, sanitizers, and compiler/platform CI.

## Critical Invariants

- Every vector element in `[0, size)` is constructed exactly once and destroyed exactly once; storage beyond `size` remains uninitialized until explicitly constructed.
- Vector storage is deallocated by allocator state compatible with the state that allocated it. A failed allocation or construction must not leak a block or leave `size` claiming ownership of an unconstructed object.
- Reallocation commits only after the replacement block is complete. Where the supported contract requires preservation, failed construction leaves the original vector unchanged; in-place operations at minimum keep lifetime bookkeeping valid and the container destructible.
- Range assignment and insertion must snapshot self-referential input before mutating the source vector, so source iterators and aliased values are not invalidated before they are consumed.
- Requested vector sizes and growth calculations must respect `allocator::max_size()` without unsigned overflow or invalid capacity selection.
- Map keys remain strictly ordered according to the comparator; the root is black; red nodes have no red children; every null-leaf path has the same black height; parent/child links agree; and the number of reachable value nodes equals `size()`.
- The map header sentinel is black and value-free. For an empty map it self-references as both extrema; for a non-empty map it points to the current root, minimum, and maximum, and the root points back to the header.
- Rotations and non-erasing structural changes preserve element-node identity. Saved element iterators follow updated parent links, and `end()` remains attached to container-owned sentinel state rather than a stale root snapshot.
- At every failure boundary, each map node has exactly one owner or has been released. Comparator, allocator, and tree ownership must not become partially exchanged when policy assignment throws.
- Every supported public header is self-contained under strict C++98 compilation, and the header-only implementation is safe to include from multiple translation units without linkage or ODR failures.

## Major Engineering Difficulties

- Implementing vector insertion across both spare-capacity and reallocation paths while distinguishing assignment into live objects from construction into raw storage, preserving aliased input, and cleaning partially constructed tails after exceptions.
- Making vector's general construction, assignment, resize, and growth paths transactional enough to preserve lifetime and ownership invariants when user-defined copies, assignments, or allocations throw.
- Implementing red-black insertion and deletion, especially deletion where a removed black node may leave a null replacement and the algorithm must carry explicit parent context through symmetric sibling, recoloring, and rotation cases.
- Replacing a root-carrying/null-end iterator design with a value-free header sentinel that remains correct through rotations, root replacement, erasure, clear, and swap and does not require a default-constructible key.
- Preserving stateful allocator and comparator semantics through node rebinding, insertion, construction, copy assignment, and public swap, including exceptions raised at comparator-call and comparator-assignment boundaries.
- Verifying properties that public sorted output cannot establish: red-black color rules, black height, parent links, header extrema, node reachability, iterator stability, and logarithmic structural bounds.

## Practical Engineering Areas

- Differential result comparison with `std::vector`, `std::stack`, and `std::map` where the standard container is a valid behavioral oracle.
- Explicit expected-value construction where overlapping self-range modifiers require a project-defined snapshot contract rather than a potentially unsuitable reference operation.
- Custom bounded and stateful allocators that expose `max_size`, allocator identity, outstanding blocks, and allocation failure points.
- Throwing element types and comparators that expose invalid copy/destruction, partial mutation, policy assignment, and rollback behavior.
- Reproducible deterministic randomized testing with a fixed seed, operation index, and operation prefix on failure.
- White-box validation through a narrow test-only inspector rather than production debug state.
- Structural complexity checks based on height and comparator counts instead of timing-sensitive microbenchmarks.
- Strict warning-enabled C++98 builds, isolated sanitizer output, independent public-header compilation, multi-translation-unit consumer linkage, and cross-compiler/platform CI.

## S-level Criteria

- Establish the final ownership or representation model of a core container, especially vector's live-object/raw-storage boundary or map's sentinel/tree structure.
- Implement a defining core mechanism whose absence would invalidate the container's promised behavior or asymptotic model, such as red-black insertion or deletion balancing.
- Solve a project-defining, non-obvious lifetime or iterator-correctness problem at its structural root rather than adding a local guard.
- Represent a decision that must be included to explain how the completed project works and remains correct under its central mutation paths.

## A-level Criteria

- Restore a significant allocator, aliasing, exception, iterator, or ownership invariant without redefining the whole container architecture.
- Introduce a foundational project-wide utility required by C++98 constraints, when the mechanism materially shapes later interfaces.
- Add high-value failure injection, structural validation, or complexity verification that materially changes confidence in a core mechanism.
- Correct a non-trivial root cause or transaction boundary whose failure could leak resources, corrupt state, or invalidate a supported public contract.

## Typical B-level Work

- Implement expected container operations within an established representation, including normal constructors, accessors, queries, comparisons, adaptors, and ordinary mutation.
- Add normal-path differential tests or targeted regression tests that support, but do not themselves establish, a core architecture or invariant.
- Add practical build, packaging, public-header, consumer, sanitizer, or CI integration using established engineering patterns.
- Extend an existing iterator or utility abstraction without changing the project's main responsibility or ownership boundaries.

## Typical C-level Work

- Documentation-only commits.
- Minimal smoke tests or accessor checks that add little evidence beyond broader existing coverage.
- Mechanical include composition or tiny compatibility checks with negligible independent structural or behavioral consequence.
- Changes that are useful housekeeping but do not help explain the project's important technical decisions.

## Project-specific Tags

CXX98 — Language-version constraints, template substitution, and strict C++98 compatibility.
VECTOR — Contiguous vector storage, capacity, element lifetime, aliasing, and modifiers.
RB_TREE — Map's binary-search-tree and red-black-tree representation, balancing, ordering, and invariants.
ITERATOR — Iterator traits, traversal, const/reverse interoperability, end-state representation, and validity.
ALLOCATOR — Allocator state, rebinding, allocation/deallocation pairing, and resource ownership.
EXCEPTION — Rollback, partial-failure containment, and post-failure state guarantees.
PUBLIC_API — Header-only packaging, self-contained headers, consumer linkage, build acceptance, and CI surface.

# Commit Classification

| Commit | Subject | Importance | Tags | Summary | Why |
| --- | --- | --- | --- | --- | --- |
| `84de7f67ab5b` | `docs(readme): C++98 컨테이너 개발 기준 정의` | C | - | Adds the initial README with the C++98 scope and development standards. | It provides useful project framing but changes no executable behavior, representation, verification mechanism, or build contract; it is documentation-only. |
| `ecc0668d6d9c` | `feat(type-traits): CXX98 타입 선택 도구 구현` | A | CXX98, ARCH, LEARNING | Introduces `enable_if`, integral constants, and integral-type detection for C++98 template dispatch. | This is the project-wide mechanism that makes fill and range overloads coexist without runtime dispatch. It is a significant foundational interface decision, though it implements a standard utility rather than a defining container mechanism. |
| `1c8692d14118` | `feat(pair): 값 쌍과 관계 연산 구현` | B | CXX98 | Implements `ft::pair`, converting construction, relational operators, and `make_pair`. | The type is necessary support for map values and return contracts, but the implementation follows established value-type semantics and contains limited project-specific judgment. |
| `07cf5893a53c` | `feat(algorithm): 공용 범위 비교 알고리즘 구현` | B | CXX98, PRACTICAL | Adds shared equality and lexicographical range-comparison algorithms. | Centralizing these algorithms avoids duplicated comparison logic in containers, but the change is a straightforward implementation of expected generic algorithms within an already understood design. |
| `e3462cec55a1` | `feat(iterator): iterator 기본 형식과 traits 정의` | B | CXX98, ITERATOR | Defines the iterator base form and `iterator_traits`, including pointer specializations. | The traits layer is required by reverse iterators and containers, yet it is conventional support infrastructure rather than a project-defining architecture decision. |
| `7a8e3d32bb4d` | `feat(iterator): 역방향 반복자의 양방향 동작 구현` | B | ITERATOR | Implements bidirectional reverse-iterator construction, dereference, increment, decrement, and equality. | This establishes expected reverse traversal semantics using the base-iterator convention, but it is normal implementation work inside the utility design. |
| `ae50e9038643` | `feat(iterator): 역방향 반복자의 임의 접근 연산 완성` | B | ITERATOR | Completes reverse-iterator random-access arithmetic, ordering, indexing, and distance. | The change makes the adaptor usable by pointer-backed vector iterators. It is technically correct supporting work, but it does not alter the project's architecture or critical ownership model. |
| `455098520e83` | `test(utils): 공용 타입·값·범위·반복자 도구 검증` | B | TEST, CXX98 | Adds initial checks for pair, type traits, range algorithms, iterator traits, and reverse iteration. | The tests establish basic confidence in the utility substrate before containers depend on it, but they exercise ordinary behavior rather than a difficult invariant or regression. |
| `f36ec7e7e047` | `build(makefile): CXX98 검사 빌드 구성` | B | CXX98, PRACTICAL | Creates the strict C++98 Makefile test build and ignores generated build artifacts. | This turns language-version and warning compatibility into a repeatable project constraint. It is important practical infrastructure, but not a core container mechanism. |
| `2eb9cb6c4273` | `feat(vector): allocator 기반 저장소 수명 관리` | S | CORE, VECTOR, ALLOCATOR | Establishes vector's allocator-backed contiguous storage, size/capacity state, construction rollback, and destruction path. | This commit defines the ownership representation on which every later vector operation depends: allocated storage is distinct from constructed elements, and cleanup is centralized. Omitting it would leave a major gap in explaining the container's architecture and lifetime model. |
| `26d8a04e7f57` | `feat(vector): 반복자와 원소 접근 경계 구현` | B | VECTOR, ITERATOR | Adds forward and reverse iteration plus indexed, checked, front, and back element access. | These are necessary public operations built directly on the established contiguous representation. The change is normal API implementation and does not introduce a new ownership or failure guarantee. |
| `9db46550b13d` | `feat(vector): 용량 확장과 원소 재배치 구현` | A | VECTOR, ALLOCATOR, CORE | Adds capacity queries, reserve, geometric growth, and exception-aware reallocation. | Reallocation is the central dynamic mechanism of vector: values must be copied into a new block before the old block is released. The decision is significant, though later commits strengthen arithmetic and transactional edge cases. |
| `fdd58f1b3e20` | `feat(vector): 크기 변경과 값 범위 할당 구현` | B | VECTOR, CXX98 | Adds range/copy construction, assignment, resize, push/pop, and clear using the initial storage primitives. | This substantially fills out the public surface but mostly applies the established representation. Later aliasing and exception commits show that these first mutation paths were not yet the durable correctness design. |
| `9329697eb16e` | `feat(vector): 중간 변경 연산과 관계 비교 완성` | B | VECTOR | Adds positional insert/erase, swap, and relational operators. | The commit completes ordinary sequence behavior and comparison integration. Its direct construct/destroy shifting is an initial implementation later replaced for lifetime correctness, so it is not the decisive final mechanism. |
| `4061a6fcb5de` | `test(vector): 핵심 공개 동작을 표준 결과와 비교` | B | TEST, VECTOR | Differentially checks core vector operations and exceptions against `std::vector`. | The test establishes normal-path parity for the first complete vector surface, but it does not yet address the allocator, aliasing, and failure-path risks that dominate the later engineering story. |
| `805f24ae788b` | `feat(stack): vector 기반 stack 어댑터 구현` | B | CORE, PUBLIC_API | Implements `stack` as a thin adaptor over `ft::vector` with delegated comparisons. | The design correctly reuses an existing container and adds no independent storage invariant. It is normal feature work and is secondary to the project's vector and map engineering. |
| `f303b9768bbe` | `test(stack): 기본 동작과 관계 연산 검증` | B | TEST | Compares stack push, pop, top, size, emptiness, and relations with `std::stack`. | The checks validate delegation semantics, but they cover straightforward adaptor behavior rather than a difficult or project-defining property. |
| `80e169e83212` | `feat(headers): 공용 도구와 순차 컨테이너 통합 헤더 추가` | B | PUBLIC_API, ARCH | Adds an aggregate public header for the utility layer, vector, and stack. | This creates a deliberate packaging boundary for a header-only library. It matters to consumers, but the implementation is simple composition rather than a major runtime or ownership decision. |
| `3c64a69dd252` | `test(headers): 통합 헤더의 순차 컨테이너 표면 검증` | C | TEST, PUBLIC_API | Switches the existing test to include the aggregate header instead of component headers. | The change is a small integration smoke test for one include list. It adds little new technical evidence beyond confirming that the bundle contains the already tested headers. |
| `2c6dd8acdd20` | `feat(map): 노드 소유권과 빈 tree 상태 구현` | A | RB_TREE, ALLOCATOR, ARCH | Introduces map's individually allocated nodes, parent/child links, null-root empty state, and recursive ownership cleanup. | This is the associative container's foundational ownership substrate and enables stable value addresses. It is significant, but the final defining architecture arrives later with red-black balancing and a value-free header sentinel. |
| `4bbf81cecef4` | `feat(map): 가변 반복자와 tree 순회 구현` | B | RB_TREE, ITERATOR | Adds mutable bidirectional tree traversal using successor/predecessor navigation and a root-bearing end iterator. | The commit provides necessary ordered traversal, but the root snapshot coupled into each iterator is later shown to be structurally insufficient. It is an intermediate implementation rather than the final iterator model. |
| `50e62b0e0298` | `feat(map): 상수와 역방향 반복자 구현` | B | RB_TREE, ITERATOR | Adds const and reverse map iterators and const-qualified traversal accessors. | The change extends the initial traversal design with expected const correctness and reverse iteration. It remains ordinary API work and inherits the earlier end-state coupling. |
| `c0fdb8e3f84c` | `feat(map): 삽입과 첨자 및 복사 동작 구현` | B | RB_TREE | Adds unbalanced BST insertion, `operator[]`, range/copy construction, and copy assignment. | These operations establish map's observable uniqueness and insertion semantics, but they operate within an unbalanced and weakly transactional design that later commits replace or harden. |
| `e4110ea13f26` | `feat(map): 검색과 경계 query 구현` | B | RB_TREE | Implements find, count, lower/upper bound, and equal-range tree queries. | The algorithms are necessary and correctly use comparator-defined ordering, but they are straightforward searches within the existing BST representation. |
| `0f70c1fcc520` | `feat(map): 삭제와 clear 및 swap 구현` | B | RB_TREE, ALLOCATOR | Adds node erasure, range erasure, clear, and map swap for the initial BST. | The commit completes normal mutation and ownership operations, but deletion is not yet red-black aware and swap is later revised for iterator and policy-exception correctness. |
| `112af1753538` | `feat(map): 관계 연산과 통합 공개 헤더 완성` | B | PUBLIC_API, RB_TREE | Adds map value comparison, relational operators, non-member swap, and inclusion in the aggregate header. | This completes the baseline public surface through established shared algorithms. It is useful integration work without a new core data-structure decision. |
| `7ae6f88861e3` | `test(map): 삽입·검색·삭제 결과를 표준 map과 비교` | B | TEST, RB_TREE | Differentially checks map insertion, duplicate handling, queries, erasure, copying, and ordering against `std::map`. | The suite establishes baseline public-result parity, but it cannot yet prove balancing, iterator stability, allocator ownership, or structural invariants. |
| `6f3cbf4794c9` | `fix(vector): 용량 계산을 allocator 상한에서 포화` | A | VECTOR, ALLOCATOR, EDGE | Makes vector length checks and growth arithmetic saturate safely at the allocator's `max_size()`. | The fix closes a non-obvious unsigned-overflow boundary that could select an invalid capacity or report the wrong failure. It restores an important allocator-limit contract without changing the core representation. |
| `0ce21f9cf12d` | `test(vector): 제한 allocator에서 용량 상한 검증` | B | TEST, VECTOR, ALLOCATOR | Adds a bounded allocator test for saturated growth, length rejection, and block release. | The custom allocator directly verifies the preceding boundary fix and ownership cleanup. It is meaningful regression coverage, but its scope is one established edge condition. |
| `bdc4c3123bc9` | `fix(vector): 자기 범위 assign과 insert 입력 보존` | A | VECTOR, EDGE, DEBUG | Snapshots range input before vector assign or insert mutates the source container. | The prior implementation could invalidate its own iterators or read overwritten values during self-range modification. Separating input capture from mutation is a significant aliasing correction that establishes the library's chosen snapshot contract. |
| `61e8b46e668f` | `test(vector): 자기 범위 변경 결과 검증` | B | TEST, VECTOR, EDGE | Adds self-range insert and assign regression cases with a reference sequence. | The tests lock down the aliasing behavior introduced by the fix. They are important support, but the decisive technical judgment is in the snapshot implementation itself. |
| `4406af809382` | `test(vector): 역방향 순회 결과 검증` | C | TEST, ITERATOR | Adds a short reverse-iteration comparison between `ft::vector` and `std::vector`. | This is a narrow routine coverage addition for already established reverse-iterator behavior and contributes little to the major engineering story. |
| `048ada8fe1c5` | `feat(map): 가변·상수 반복자 상호 비교 지원` | B | ITERATOR, PUBLIC_API | Allows mutable and const map iterators to compare symmetrically. | The change restores an expected interoperability property of the public iterator interface, but it is localized and later subsumed by the sentinel-based iterator refactor. |
| `0736ef2f9600` | `test(map): 가변·상수 반복자 비교 검증` | C | TEST, ITERATOR | Adds direct equality and inequality checks between mutable and const map iterators. | The test is a small API regression check with no new structural evidence or difficult failure path. |
| `6bc71cfedeb5` | `test(map): 역방향 순회와 경계 query 검증` | B | TEST, RB_TREE, ITERATOR | Extends map tests for gap/end boundary queries and reverse traversal. | These cases cover meaningful ordered-container boundaries, but they remain ordinary public-result verification within the existing implementation. |
| `f995dbc53683` | `test(map): 상수 begin과 reverse begin 검증` | C | TEST, ITERATOR | Adds const `begin()` and const reverse-begin checks. | The diff is a minimal surface check for behavior already implemented and carries little independent engineering significance. |
| `ae180871b160` | `fix(map): 값 allocator 상태로 노드 allocator 구성` | A | RB_TREE, ALLOCATOR, RISK | Constructs the rebound node allocator from the map's value allocator state. | Default-constructing the node allocator silently lost state for custom allocators, separating allocation ownership from the public allocator contract. This small fix restores a significant resource-ownership invariant. |
| `f29fd8a91523` | `feat(map): 레드-블랙 삽입 회전과 색 보정 구현` | S | CORE, RB_TREE, HARD | Adds red/black node state, rotations, and insertion fix-up to keep the map balanced. | This commit turns the map from a potentially linear BST into the project's defining ordered-container mechanism. The rotation and recoloring cases establish the core logarithmic structure and red-black invariants; omitting it would make the final architecture incomprehensible. |
| `8f8b67961819` | `test(map): 정렬 입력 삽입과 검색 경계 stress 검증` | B | TEST, RB_TREE | Stress-tests ascending and descending insertion plus query boundaries against `std::map`. | The scenarios are well chosen to expose an ordinary BST's worst case and broaden functional confidence, but they do not directly validate height or every red-black invariant. |
| `a055cb19500b` | `feat(map): 레드-블랙 삭제 보정 구현` | S | CORE, RB_TREE, HARD | Implements red-black deletion transplant bookkeeping and symmetric double-black fix-up. | Deletion is the most intricate core state transition in the tree: removed color, replacement child, parent context, sibling cases, rotations, and recoloring must remain coherent even when the child is null. This is indispensable to the map's correctness story. |
| `86922f1ddfa0` | `test(map): 반복 삭제·복사·대입·교환 stress 검증` | B | TEST, RB_TREE | Adds repeated key/iterator erasure and copy, assignment, and swap stress comparisons. | The tests exercise broad map behavior after deletion balancing, but later invariant-aware randomized verification provides the stronger architectural evidence. This remains solid normal regression work. |
| `835712378454` | `test(map): 범위 삭제 후 상태 검증` | C | TEST, RB_TREE | Adds an erase-whole-range emptiness and size check. | This is a very small expected-behavior test and adds little beyond existing clear and repeated-erasure coverage. |
| `2c60c01dd1ca` | `test(map): 비교 함수 접근자 검증` | C | TEST, PUBLIC_API | Adds checks for `key_comp()` and `value_comp()`. | The commit verifies simple accessors already introduced with map relations. It has negligible structural or correctness impact. |
| `bc3a74b9342e` | `fix(vector): allocator 형식과 빈 반복자 연산 보정` | A | VECTOR, ALLOCATOR, EDGE | Uses allocator-provided size types and avoids pointer arithmetic/subtraction on an unallocated empty vector. | The fix addresses both custom-allocator interface correctness and undefined empty-storage arithmetic. Although compact, it restores a fundamental boundary invariant used by end, insert, and erase. |
| `ccb98587e777` | `test(vector): 빈 저장소와 allocator 상태 검증` | B | TEST, VECTOR, EDGE | Checks empty begin/end equality and zero-count insert/empty erase under a tracking allocator. | The tests directly protect the empty-storage correction and verify no allocation leak. They are targeted regression evidence, but the important judgment is in the implementation fix. |
| `b3124b3808d5` | `fix(vector): 저장소 교체와 크기 증가를 트랜잭션으로 처리` | A | VECTOR, EXCEPTION, ALLOCATOR | Makes fill construction, assignment, resize growth, and aliased push-back use rollback or temporary-storage transactions. | This substantially raises vector's failure guarantees by committing state only after construction succeeds and by snapshotting aliased values before reallocation. It is significant core hardening, but insertion requires a separate, still more defining lifetime redesign. |
| `9051be26db5e` | `test(vector): 생성·대입·크기 변경 실패 주입` | A | TEST, VECTOR, EXCEPTION | Adds tracked-object and allocator failure injection for construction, assignment, resize, and aliased push-back. | The suite validates live-object counts, invalid copies/destructions, block release, and preservation of original values. It materially changes confidence in vector's lifetime guarantees rather than merely adding normal-path coverage. |
| `797c33904db3` | `fix(vector): fill·range 삽입의 객체 수명 보존` | S | CORE, VECTOR, HARD | Replaces vector fill/range insertion with explicit reallocation and in-place algorithms that distinguish live objects from uninitialized storage. | This solves a project-defining object-lifetime problem. The new paths track constructed tails, snapshot aliased input, preserve spare capacity when possible, and clean partial construction on failure; without it the completed vector's correctness under non-trivial element types cannot be explained. |
| `8df3d8e067c0` | `test(vector): 삽입 복사·대입·할당 실패 sweep` | A | TEST, VECTOR, EXCEPTION | Sweeps copy, assignment, and allocation failures across fill and range insertion, including aliasing and spare-capacity behavior. | The test matrix probes both reallocation and in-place branches, checks post-failure usability, and verifies no leaked or double-destroyed objects. It provides high-value regression evidence for the most complex vector modifier. |
| `cb08194d17b0` | `fix(map): 삽입 위치를 노드 할당 전에 확정` | A | RB_TREE, EXCEPTION, DEBUG | Records the insertion side during tree search so no comparator call occurs after node allocation. | A comparator exception after allocation could orphan an unlinked node. Moving all comparisons before allocation fixes the root cause at the transaction boundary and restores one-owner-at-all-times behavior. |
| `55d3b3e7c104` | `fix(map): 생성과 복사 대입 실패를 임시 tree로 격리` | A | RB_TREE, EXCEPTION, ALLOCATOR | Adds constructor rollback and copy-and-swap-style temporary-tree assignment for map. | Range/copy construction now clears partial trees on failure, while assignment preserves the destination until a complete replacement exists. This is significant resource and state transaction engineering, though it does not redefine the tree structure itself. |
| `d72b04c5ddc6` | `test(map): 비교·할당 실패 시 노드 소유권 검증` | A | TEST, RB_TREE, EXCEPTION | Adds comparator and allocator failure injection for insertion, constructors, copying, and assignment. | The suite verifies that every allocated node remains owned or is released and that failed assignment preserves the target. It directly validates the map transaction boundaries established by the preceding fixes. |
| `15a8460ccdfe` | `fix(map): 값 없는 header로 끝 반복자 상태 안정화` | S | ARCH, ITERATOR, RB_TREE | Refactors map to a value-free header sentinel that owns root/minimum/maximum links and represents `end()`. | This is a major architectural correction: end iterators no longer carry stale root snapshots, rotations and swap can preserve element iterators, empty maps need no default key, and extrema become container-owned state. It defines the final map representation. |
| `81d8c4489c16` | `test(map): 회전·삭제·교환 뒤 반복자 상태 검증` | A | TEST, ITERATOR, RB_TREE | Tests saved end iterators, element iterators through rotations, root erasure, swap, empty reset, and non-default-constructible keys. | These cases validate the exact structural promises that motivated the header sentinel. The suite protects an architecture boundary that ordinary result comparison cannot observe. |
| `0f4dd84e44ed` | `fix(map): 비교자 교환 실패 전에 tree 소유권 유지` | A | RB_TREE, EXCEPTION, DEBUG | Moves comparator exchange before allocator and tree ownership exchange in map swap and assignment commit. | If comparator assignment throws after tree pointers move, ordering policy and physical ownership can diverge. This small ordering fix prevents partial ownership transfer and restores a high-risk exception invariant. |
| `55d4ba1fb493` | `test(map): 비교자 대입 실패 뒤 컨테이너 상태 검증` | A | TEST, RB_TREE, EXCEPTION | Injects comparator-assignment failure into copy assignment and public swap with distinct allocator owners and order directions. | The tests make partial policy exchange observable and verify both maps retain contents, allocator identity, node counts, and usability. They strongly validate the subtle commit-ordering fix. |
| `cd67e6a31bb7` | `test(map): 무작위 연산마다 레드-블랙 불변식 검증` | A | TEST, RB_TREE, RISK | Adds a constrained white-box inspector and deterministic differential/randomized validation of every red-black invariant after structural operations. | This materially changes confidence in the core tree: public sorted output alone cannot prove parent links, header extrema, red constraints, black height, or reachable-node counts. Reproducible operation logs make failures diagnosable. |
| `cd8ebbb2c01e` | `perf(map): 높이와 비교 횟수 회귀 상한 추가` | A | PERF, RB_TREE, TEST | Adds executable red-black height and comparator-count upper bounds for adversarial and shuffled insertion orders. | The test converts the map's logarithmic complexity claim into deterministic structural and operation-count limits. It can detect disabled balancing or hidden linear searches that functional tests would miss. |
| `d938c0079994` | `test(headers): 공개 헤더를 각각 독립 compile` | B | TEST, PUBLIC_API, CXX98 | Compiles each public header independently as the first include in a minimal translation unit. | This enforces header self-containment and catches accidental transitive dependencies, an important header-only API practice. It is significant integration hygiene rather than core container logic. |
| `072c49832ddc` | `test(consumer): 다중 번역 단위 공개 헤더 사용 검증` | B | TEST, PUBLIC_API, INTEGRATION | Adds a linked multi-translation-unit consumer for vector and map and composes a complete `check` target. | The change verifies real header-only consumption and catches ODR or linkage failures that single-file tests cannot. It is strong practical integration work but does not alter container semantics. |
| `1be03ae8daef` | `build(makefile): 격리된 sanitizer 검사 대상 추가` | B | PUBLIC_API, PRACTICAL, RISK | Adds an isolated ASan/UBSan build of the complete check suite. | Separate instrumented output prevents flag mixing and broadens detection of lifetime and pointer errors. This strengthens verification infrastructure but represents standard tooling rather than a project-specific core decision. |
| `228f457988be` | `ci: compiler 행렬과 sanitizer 검사 구성` | B | CXX98, PUBLIC_API, PRACTICAL | Runs the complete checks on GCC and Clang across Linux/macOS plus a Linux sanitizer job. | The workflow makes portability and memory-safety verification repeatable at branch level. It is valuable release engineering, but it does not itself establish a container invariant. |
| `5bdb6eb81a89` | `test(vector): 자기 범위 기대값을 명시적 snapshot으로 구성` | A | TEST, VECTOR, DEBUG | Builds self-range expected values explicitly instead of asking `std::vector` to perform overlapping modifiers. | The previous oracle coupled the regression to implementation- or version-sensitive overlapping-range behavior. This correction makes the chosen snapshot contract independently testable and restores trust in a significant edge-case test. |
| `1a890fbf69f9` | `docs(project): 프로젝트 문서 정리` | C | - | Expands the README and adds architecture/devlog documentation for the completed project. | The commit records the finished design and verification surface but changes no code, tests, build behavior, or runtime contract; it is documentation-only. |

# Development Threads

## Thread: C++98 Generic Interface Foundation

`ecc0668d6d9c` A — Establishes substitution-based overload selection and compile-time type classification.
↓
`1c8692d14118` B — Supplies the pair value and return type required by associative-container APIs.
↓
`07cf5893a53c` B — Centralizes equality and lexicographical comparison for container relations.
↓
`e3462cec55a1` B — Defines iterator type metadata and pointer traits.
↓
`7a8e3d32bb4d` B — Adds the bidirectional reverse-iterator base convention.
↓
`ae50e9038643` B — Extends reverse iteration to the random-access operations needed by vector.
↓
`455098520e83` B — Verifies the utility layer before containers depend on it.
↓
`f36ec7e7e047` B — Makes strict warning-enabled C++98 compilation the repeatable baseline.

**Significance**

The branch begins by constructing the generic vocabulary that C++98 does not provide in the later standard-library form used by modern code. The sequence is a real dependency chain: SFINAE separates count and range overloads, pair supplies map's value and return contracts, shared algorithms support relational operators, and iterator metadata enables one reverse adaptor to serve both pointer-backed and tree-backed iterators. The strict build then turns those assumptions into an enforceable compatibility boundary. Most individual implementations are conventional, but together they prevent each container from inventing incompatible local substitutes.

## Thread: Vector Ownership, Aliasing, and Exception-safe Mutation

`2eb9cb6c4273` S — Establishes allocator-backed contiguous storage and the constructed-object ownership boundary.
↓
`9db46550b13d` A — Adds replacement-block reallocation and geometric capacity growth.
↓
`6f3cbf4794c9` A — Corrects growth arithmetic at the allocator limit.
↓
`bdc4c3123bc9` A — Snapshots self-range input before mutation invalidates it.
↓
`bc3a74b9342e` A — Removes empty-storage pointer arithmetic and adopts allocator-provided size types.
↓
`b3124b3808d5` A — Makes construction, assignment, resize growth, and aliased push-back transactional.
↓
`9051be26db5e` A — Injects element and allocation failures to validate rollback and live-object counts.
↓
`797c33904db3` S — Rebuilds fill/range insertion around explicit live-object and raw-storage paths.
↓
`8df3d8e067c0` A — Sweeps insertion copy, assignment, and allocation failures across both capacity branches.
↓
`5bdb6eb81a89` A — Replaces a questionable reference modifier with an explicit snapshot-derived test oracle.

**Significance**

The original representation is durable, but the first modifier implementations reveal why vector is primarily a lifetime-management problem rather than only an indexed sequence. Capacity overflow, null-storage arithmetic, self-aliasing, and exceptions from user-defined types each expose a different way that logical size can diverge from actual constructed objects. The thread progressively moves input capture and replacement construction before mutation, separates construction in raw slots from assignment in live slots, and adds failure-injection evidence. The final test-oracle correction also demonstrates that tests for a deliberately extended self-range contract must derive expected values independently rather than assuming another container defines the same overlap behavior.

## Thread: Map from Unbalanced Search Tree to Verified Red-black Core

`2c6dd8acdd20` A — Establishes individually allocated nodes and single-root ownership.
↓
`c0fdb8e3f84c` B — Adds comparator-defined BST insertion, indexing, and copying.
↓
`0f70c1fcc520` B — Adds ordinary BST erasure and tree exchange.
↓
`f29fd8a91523` S — Introduces rotations and insertion recoloring.
↓
`8f8b67961819` B — Exercises adversarial sorted insertion and query boundaries.
↓
`a055cb19500b` S — Adds deletion transplant state and double-black correction.
↓
`86922f1ddfa0` B — Stresses repeated erasure, copying, assignment, and swap against `std::map`.
↓
`cd67e6a31bb7` A — Validates all structural red-black invariants after deterministic random operations.
↓
`cd8ebbb2c01e` A — Enforces red-black height and comparator-count upper bounds.

**Significance**

The public map surface first exists as an ordinary BST, which is sufficient to establish comparator semantics and observable ordering but not the required worst-case complexity. Insertion balancing supplies the first red-black mechanism; deletion then adds the more difficult state restoration for removed black nodes and null replacements. The later tests intentionally move beyond output comparison: a white-box inspector proves parent links, header state, red constraints, black height, and node reachability, while complexity tests prove that the structure remains logarithmic under ascending, descending, and shuffled input. The sequence distinguishes functional ordering from structural correctness and asymptotic correctness.

## Thread: Stable Map Iterators through Structural Mutation

`4bbf81cecef4` B — Implements traversal with a null end state plus a copied root pointer.
↓
`50e62b0e0298` B — Extends that model to const and reverse iteration.
↓
`048ada8fe1c5` B — Adds mutable/const comparison interoperability.
↓
`15a8460ccdfe` S — Replaces the root snapshot with a value-free, container-owned header sentinel.
↓
`81d8c4489c16` A — Verifies saved end positions, element iterators, swap migration, empty reset, and non-default keys.

**Significance**

The initial iterator can traverse a static tree, but `--end()` depends on a root pointer copied into the iterator. Rotations, root erasure, and swap make that snapshot stale even though element nodes remain valid. The header-sentinel refactor moves end-state and extrema ownership into the container, lets nodes navigate to the current end through parent links, and removes any need to construct a key merely to represent the sentinel. The follow-up tests target exactly the structural operations that invalidate the earlier model, making this a clear limitation-to-architecture-correction progression.

## Thread: Stateful Allocators and Map Failure Transactions

`ae180871b160` A — Preserves value-allocator state when rebinding to node allocation.
↓
`cb08194d17b0` A — Finishes comparator search before allocating an unlinked node.
↓
`55d3b3e7c104` A — Cleans partial constructors and builds copy-assignment replacement trees off to the side.
↓
`d72b04c5ddc6` A — Injects comparison and allocation failures and accounts for every node.
↓
`0f4dd84e44ed` A — Exchanges comparator state before allocator and tree ownership can move.
↓
`55d4ba1fb493` A — Verifies copy assignment and public swap under comparator-assignment failure.

**Significance**

Map correctness depends on more than key/value ordering: allocator identity determines which state owns each node, and comparator state determines whether the same links describe a valid ordering. The thread first repairs lost allocator state, then ensures a comparator cannot throw after an allocation has no owner. It next makes construction and assignment transactional, and finally addresses a subtler policy failure where comparator assignment can interrupt swap. The resulting rule is consistent across the sequence: policy state must be settled before physical tree ownership is committed, and every failure path must leave each node associated with exactly one valid owner.

## Thread: Header-only Public Surface and Automated Acceptance

`80e169e83212` B — Introduces the aggregate header.
↓
`3c64a69dd252` C — Confirms the current sequential surface compiles through that bundle.
↓
`112af1753538` B — Adds map to the aggregate public entry point.
↓
`d938c0079994` B — Compiles every public header independently as the first include.
↓
`072c49832ddc` B — Links independent vector and map consumers in multiple translation units.
↓
`1be03ae8daef` B — Runs the complete acceptance surface under isolated ASan/UBSan instrumentation.
↓
`228f457988be` B — Automates compiler, platform, and sanitizer checks in CI.

**Significance**

A header-only library can appear correct inside one monolithic test while still depending on include order, emitting duplicate definitions, or compiling only under one toolchain. This progression expands the acceptance boundary from a convenience include, to independently self-contained headers, to a real linked consumer, and finally to sanitizer and cross-platform automation. These commits do not define the core containers, but they make the finished public surface reproducible and consumable outside the repository's internal test arrangement.

# Most Important Commits

## feat(vector): allocator 기반 저장소 수명 관리

Commit: `2eb9cb6c4273`
Importance: S
Tags: CORE, VECTOR, ALLOCATOR

### Problem

A C++98 vector implementation must own raw contiguous storage while separately tracking which positions contain live `T` objects. Allocation alone does not create elements, and destruction must never be applied to unconstructed slots or omitted for constructed ones.

### Decision

The commit represents vector as allocator state, a data pointer, a constructed size, and an allocation capacity. Fill construction allocates one block and constructs elements sequentially, while the failure path destroys the completed prefix and deallocates the block. Destruction centralizes reverse element teardown and storage release.

### Why it mattered

Every later vector operation—reserve, resize, assignment, insertion, erasure, swap, and exception rollback—depends on this separation between storage ownership and object lifetime. It is the core invariant that later fixes refine rather than replace.

### What changed

The branch gained the first `ft::vector` header, allocator-derived public types, empty and fill construction, `size`, `empty`, allocator access, node-free contiguous storage state, and cleanup helpers.

### Why this is important for understanding the project

The completed vector is not primarily explained by its accessors; it is explained by who owns the allocation and which subrange contains live objects. This commit establishes that model and therefore provides the necessary starting point for the later aliasing and exception-safety history.

## fix(vector): 저장소 교체와 크기 증가를 트랜잭션으로 처리

Commit: `b3124b3808d5`
Importance: A
Tags: VECTOR, EXCEPTION, ALLOCATOR

### Problem

The initial vector surface could clear or partially extend the active sequence before all replacement construction succeeded. A throwing element copy could therefore lose the original assignment target, leave a partially grown suffix, or read an aliased push-back argument after reallocation invalidated it.

### Decision

Fill construction now builds a complete block before publishing state. Fill and range assignment build a temporary vector and exchange storage only after success. Resize growth records the old size and destroys only the newly completed suffix on failure. Reallocating push-back copies an aliased argument before reserve can invalidate it.

### Why it mattered

This commit applies a consistent transaction pattern across several high-risk paths: prepare replacement state, track completed construction, and commit only when the new state is valid. It is not the final insertion solution, but it establishes the failure-handling method that the later insertion redesign follows.

### What changed

The commit added `_initialize_fill` and storage-only swap, changed fill/range assignment to temporary replacement, added rollback around resize growth, and separated aliased value capture from reallocation in `push_back`.

### Why this is important for understanding the project

It shows the transition from a functionally complete vector to one designed around user-defined types that can throw. The project's educational value lies heavily in this distinction between ordinary value tests and actual object-lifetime guarantees.

## fix(vector): fill·range 삽입의 객체 수명 보존

Commit: `797c33904db3`
Importance: S
Tags: CORE, VECTOR, HARD

### Problem

The first insertion algorithm shifted values by constructing and destroying positions without consistently distinguishing already-live elements from raw capacity. Range insertion also rebuilt a tail through multiple public operations. With non-trivial or throwing element types, these approaches could violate lifetime bookkeeping, leak constructed objects, or leave invalid state.

### Decision

Insertion is split by both input form and capacity condition. Reallocation paths construct prefix, inserted values, and suffix into a fresh block and publish it only after completion. In-place paths construct only into the uninitialized tail, assign within the live range, track how many tail objects were completed, and destroy that tail if construction fails. Fill values and range inputs are snapshotted before mutation.

### Why it mattered

This is the decisive vector modifier design. It reconciles contiguous layout, capacity preservation, aliasing, construction versus assignment, and exception cleanup in one mechanism. The final vector cannot be considered correct for general element types without it.

### What changed

The direct insertion loops were replaced by dedicated fill/range, reallocate/in-place helpers, replacement-storage commit logic, and constructed-tail cleanup. Range insertion no longer discards spare capacity merely to avoid overlap.

### Why this is important for understanding the project

The commit demonstrates the hardest part of implementing vector from first principles: moving a logical sequence is not equivalent to moving bytes or repeatedly calling public modifiers. Correctness depends on the lifetime state of every destination slot and on when the old representation is allowed to change.

## feat(map): 레드-블랙 삽입 회전과 색 보정 구현

Commit: `f29fd8a91523`
Importance: S
Tags: CORE, RB_TREE, HARD

### Problem

The baseline map is an ordered BST, so ascending or descending insertion can make its height linear. Correct sorted iteration alone is insufficient because map's defining performance depends on maintaining a balanced search structure.

### Decision

Nodes gain red/black state. New non-root nodes begin red, the root remains black, and insertion repair handles red-uncles through recoloring and black-uncles through the appropriate single or double rotations. Left and right cases are implemented symmetrically.

### Why it mattered

This commit introduces the mechanism that makes map a red-black tree rather than merely a sorted linked structure. It establishes the logarithmic architecture that later deletion, invariant validation, and complexity tests must preserve.

### What changed

The node representation acquired color, insertion calls a fix-up routine, and the map gained red checks, left/right rotations, and the full parent/uncle/grandparent recoloring logic.

### Why this is important for understanding the project

Without this commit, the map's public behavior could still pass many ordinary comparisons while its worst-case complexity remained incorrect. It marks the point where structural invariants become as important as returned values.

## feat(map): 레드-블랙 삭제 보정 구현

Commit: `a055cb19500b`
Importance: S
Tags: CORE, RB_TREE, HARD

### Problem

Deleting a node from a red-black tree can reduce the black count on one root-to-leaf path. The replacement may be null, so the repair cannot rely on a normal node object to carry color and parent context. Incorrect handling can silently preserve sorted output while corrupting black height or future rotations.

### Decision

Erasure records the node physically moved, its original color, the replacement child, and an explicit replacement parent. If a black node was removed, a symmetric double-black repair examines sibling color and near/far child colors, performs recoloring or rotations, and finally forces the replacement and root black.

### Why it mattered

Deletion is a separate defining mechanism from insertion balancing and is substantially more failure-prone. This commit preserves the red-black invariants across all erase forms and enables repeated arbitrary deletion without degrading or corrupting the tree.

### What changed

The simple BST successor transplant was expanded with moved-node bookkeeping, black/null predicates, deletion fix-up, and root normalization after repair.

### Why this is important for understanding the project

A map implementation is not complete when it only balances insertion. This commit explains how the project handles the most difficult structural mutation and why later randomized invariant checking is necessary.

## fix(map): 생성과 복사 대입 실패를 임시 tree로 격리

Commit: `55d3b3e7c104`
Importance: A
Tags: RB_TREE, EXCEPTION, ALLOCATOR

### Problem

Range and copy construction inserted nodes incrementally without cleaning the partially built tree when comparison or allocation failed. Copy assignment cleared the destination before rebuilding, so failure destroyed the original value and could leave a partial replacement.

### Decision

Constructors catch failures, clear every reachable new node, and rethrow. Assignment builds a complete temporary map using the destination allocator and source comparator, then exchanges comparator and tree state only after construction succeeds.

### Why it mattered

The change establishes map's transaction boundary for bulk ownership changes. It preserves the destination under failure and ensures that a partially built tree never escapes without an owner.

### What changed

The constructors gained rollback guards, assignment changed from clear-then-insert to temporary-tree replacement, and a helper was introduced to exchange tree size and comparator state.

### Why this is important for understanding the project

It connects abstract exception safety to concrete node ownership. The red-black algorithms can be locally correct while the container still leaks or loses state during construction; this commit closes that higher-level lifecycle gap.

## fix(map): 값 없는 header로 끝 반복자 상태 안정화

Commit: `15a8460ccdfe`
Importance: S
Tags: ARCH, ITERATOR, RB_TREE

### Problem

The initial `end()` was represented by null plus a root pointer copied into each iterator. Rotations, root deletion, and swap could change the owning root while saved iterators retained stale topology. A sentinel containing a full value would also impose an invalid default-construction requirement on the key.

### Decision

The map is refactored around `node_base` and a value-free header sentinel. `header.parent` owns the root, `header.left` and `header.right` cache extrema, and `end()` points to the header. Root parent links terminate at the header, allowing successor and predecessor traversal to discover the current container boundary through topology.

### Why it mattered

This commit resolves iterator stability, current-maximum lookup from a saved end iterator, empty-state representation, swap migration, and non-default key support with one structural decision. It is the final map architecture, not a local iterator patch.

### What changed

Value storage moved into a derived node type, all tree links became base-node links, iterator state collapsed to one node pointer, null end results became header results, and insert, erase, clear, swap, search, extrema refresh, rotations, and traversal were updated around the sentinel.

### Why this is important for understanding the project

The commit demonstrates how a sentinel can own container-level topology without pretending to be an element. It is essential to understanding why element iterators survive rebalancing and how `end()` remains stable as the tree root changes.

## test(map): 무작위 연산마다 레드-블랙 불변식 검증

Commit: `cd67e6a31bb7`
Importance: A
Tags: TEST, RB_TREE, RISK

### Problem

Sorted output and parity with `std::map` cannot prove that the internal tree is valid. Parent links may be inconsistent, header extrema stale, red nodes adjacent, black heights unequal, or unreachable nodes excluded from iteration until a later operation exposes the corruption.

### Decision

A narrowly scoped friend inspector validates header state, root linkage and color, extrema, strict subtree bounds, parent/child consistency, red-child rules, equal black height, and reachable-node count. Fixed deletion sequences, repeated current-root deletion, and 3,000 deterministic mixed operations validate both primary and secondary maps after every step.

### Why it mattered

This test changes the evidence standard for the project from output equivalence to representation correctness. The fixed seed, step number, and operation prefix also make deep balancing regressions reproducible rather than intermittent.

### What changed

The map gained a test-only inspection seam, the build incorporated support headers and a randomized test target, and the new test combined differential public checks with full structural validation after every mutation.

### Why this is important for understanding the project

The red-black implementation is too stateful to trust through examples alone. This commit explains how the project proves its defining invariants and why the later complexity test can safely interpret measured height.
