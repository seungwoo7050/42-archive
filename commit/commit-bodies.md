## feat(type-traits): CXX98 타입 선택 도구 구현
This change introduces the compile-time selection primitives needed to express overloaded container interfaces in C++98. `enable_if` exposes a nested `type` only when its Boolean condition is true, while `integral_constant`, `true_type`, and `false_type` provide value-bearing types that can participate in template substitution.

`is_integral` is defined as a false primary template and explicitly specialized for the integral types available in the target language, including signed and unsigned variants and `wchar_t`. The immediate architectural value is overload disambiguation: constructors and modifiers can distinguish a pair of numeric arguments from an iterator range without runtime branching. Keeping this decision in a small traits header prevents each container from implementing its own ad hoc dispatch rules and makes invalid overloads disappear through substitution failure rather than producing ambiguous or deeply nested compilation errors.

## feat(pair): 값 쌍과 관계 연산 구현
This change establishes `ft::pair` as the library's generic two-value product type. It provides default, value, converting-copy, and assignment operations together with `make_pair`, allowing callers to construct pairs without spelling template arguments explicitly. The converting constructor is important for interoperability between related pair types, such as mutable and const-qualified key/value representations.

The non-member comparisons implement structural equality and lexicographic ordering. Ordering compares `first` as the primary key and consults `second` only when neither first component is less than the other; this relies solely on the ordering contract rather than requiring `operator==`. That distinction matters for generic code and later allows map values to participate in container relational operators. Centralizing these semantics also gives `map` insertion results and stored key/value records one consistent representation instead of duplicating pair-like structures inside the container.

## feat(algorithm): 공용 범위 비교 알고리즘 구현
This change adds iterator-based implementations of `equal` and `lexicographical_compare`, including predicate and comparator overloads. Both algorithms operate incrementally over input ranges and stop as soon as the result is determined, so they impose no random-access requirement and remain usable with pointers, tree iterators, and custom iterator categories.

`equal` defines sequence equality over the first range, while `lexicographical_compare` applies dictionary ordering and handles the prefix case only after all comparable elements have matched. These functions become the common semantic foundation for relational operators on several containers. Reusing range algorithms keeps container classes focused on storage and traversal; equality and ordering are derived from their iterator-visible sequences rather than reimplemented against private representation details.

## feat(iterator): iterator 기본 형식과 traits 정의
This change introduces the common iterator type vocabulary used throughout the library. The `iterator` base template packages category, value, distance, pointer, and reference aliases, while `iterator_traits` extracts the same information from iterator classes.

Explicit specializations for mutable and const pointers are essential because `vector` uses raw allocator pointers as iterators. They classify pointers as random-access iterators and expose `std::ptrdiff_t` as their distance type, allowing generic iterator adaptors to treat pointers and class-based iterators uniformly. This separates an iterator's capabilities from its concrete representation and provides the compile-time protocol required by the reverse iterator implementation without coupling that adaptor to any particular container.

## feat(iterator): 역방향 반복자의 양방향 동작 구현
This change implements the bidirectional core of `reverse_iterator`. The adaptor stores a base iterator that points one position past the element observed through the reverse view. Dereference therefore copies the base, decrements the copy, and accesses that predecessor; the stored base itself is left unchanged.

Increment and decrement invert the direction of the underlying iterator, preserving the invariant that `base()` always denotes the forward position following the reverse element. A converting constructor and heterogeneous equality operators allow compatible mutable and const iterator types to interoperate. This representation is preferable to storing the directly referenced element because it makes `rbegin()` naturally derive from `end()` and represents `rend()` from `begin()` without requiring a before-begin sentinel.

## feat(iterator): 역방향 반복자의 임의 접근 연산 완성
This change extends `reverse_iterator` with the operations available when its base iterator is random access. Addition, subtraction, compound movement, indexing, distance, and ordering all reverse the corresponding base-iterator direction.

The sign reversal is not cosmetic: advancing a reverse iterator by a positive offset must subtract from its base, and the distance between two reverse iterators is computed in the opposite operand order. Relational operators are similarly inverted because a later base position denotes an earlier element in reverse traversal. Completing these algebraic relationships lets the same adaptor serve both bidirectional tree iterators and pointer-based `vector` iterators while preserving the expected complexity of the underlying category.

## test(utils): 공용 타입·값·범위·반복자 도구 검증
This change adds an executable baseline for the utility layer before containers depend on it. The checks cover pair construction, integral classification, prefix equality, lexicographic comparison, reverse traversal over a raw array, and pointer-based `iterator_traits`.

The cases are intentionally cross-cutting: they verify not only individual return values but also that the traits, algorithms, pair type, and iterator adaptor compose under the C++98 compiler settings. Establishing this small reference point reduces diagnostic ambiguity later, because failures in container comparisons or reverse iteration can be separated from defects in the shared primitives on which those features are built.

## build(makefile): CXX98 검사 빌드 구성
This change creates a reproducible build-and-test entry point for the header-only library. Sources are compiled with the C++98 language mode and strict warning flags, public headers are added as dependencies, and generated binaries are isolated under a build directory that is excluded from version control.

The `test` target runs every configured executable and stops on the first nonzero result, while the cleanup targets remove only generated artifacts. For a template library, compiling consumers is itself a major part of verification because many errors appear only at instantiation time. Encoding the language level and warning policy in the build therefore makes compatibility an enforced property rather than a convention dependent on each caller's local command line.

## feat(vector): allocator 기반 저장소 수명 관리
This change establishes the foundational ownership model for `ft::vector`. The container stores an allocator, a pointer to allocated storage, the number of live elements, and the allocated capacity. Allocation and object construction are treated as separate operations: raw storage is obtained first, and each element is constructed individually through the allocator.

Construction records only the successfully created prefix. If an element constructor throws, that prefix is destroyed in reverse order and the allocation is released before the exception propagates. Destruction follows the same ownership boundary by destroying exactly `_size` live objects and then deallocating the block. The critical invariant is that `_size` denotes constructed objects, not merely reserved slots; later access and mutation can rely on every index below `_size` having an active lifetime and every slot at or above it being uninitialized storage.

## feat(vector): 반복자와 원소 접근 경계 구현
This change exposes the initial observation interface for `vector`: forward and reverse iteration, size and emptiness queries, unchecked indexing, checked access, and front/back access. Raw allocator pointers serve as iterators, matching the contiguous-storage representation and giving constant-time random access without an additional wrapper.

`at` establishes the explicit bounds-checked path by throwing `std::out_of_range`, whereas `operator[]` retains the conventional unchecked contract. Reverse iteration is derived from the shared adaptor and the forward `begin`/`end` boundary, so no separate reverse traversal state is stored. The API keeps responsibility clear: the container owns storage and validates only operations whose contract promises validation, while iterator arithmetic and unchecked access retain the performance and precondition model expected of a contiguous container.

## feat(vector): 용량 확장과 원소 재배치 구현
This change introduces capacity reporting, allocator-derived maximum size, explicit reservation, geometric growth, and storage reallocation. `reserve` rejects requests beyond `max_size`, does nothing when the current capacity is sufficient, and otherwise delegates to a single relocation routine.

Relocation follows a prepare-then-commit structure. A new block is allocated and existing elements are copy-constructed into it; if any copy fails, only the constructed prefix in the new block is destroyed and the original vector remains the owner of its unchanged storage. The old elements and allocation are released only after the new sequence is complete. This is the central exception-safety pattern for contiguous containers because reallocation invalidates every pointer into the old block and must not commit that invalidation until a replacement is ready.

The initial doubling calculation provides amortized growth but still operates directly in the unsigned capacity domain; arithmetic at the allocator limit is hardened later.

## feat(vector): 크기 변경과 값 범위 할당 구현
This change adds the main construction and replacement paths built on the storage primitives: fill and range construction, copying, copy assignment, resizing, fill assignment, range assignment, push/pop, and clearing. SFINAE excludes integral types from range overloads so calls such as `(count, value)` do not compete with iterator-based templates.

Shrinking destroys elements from the end, while growth reserves capacity when necessary and constructs a new suffix. Range ingestion advances one input iterator at a time and appends values, allowing single-pass sources rather than assuming a precomputable distance. These operations establish the functional contract that capacity and object lifetime are independent: `clear` and shrinking destroy elements without necessarily releasing storage, whereas assignment may reuse or replace the allocation.

At this stage several operations mutate live state incrementally. The interface is complete enough to use, but aliasing and rollback when element construction throws are separate concerns addressed by later hardening.

## feat(vector): 중간 변경 연산과 관계 비교 완성
This change completes the initial `vector` surface with positional insertion, erasure, swap, and relational operators. Positions are converted to indices before a possible reallocation so the insertion point can be reconstructed in the new block. Existing elements are shifted to open or close a gap, and non-member comparisons delegate to the shared equality and lexicographic algorithms.

Swap exchanges allocator and storage state together, keeping an allocated block associated with the allocator state that will eventually destroy and deallocate its elements. Erasure compacts the surviving suffix through assignment and destroys the obsolete tail, preserving contiguous layout and linear complexity.

The first insertion algorithm performs direct construct/destroy mutation of the current sequence. It establishes ordering and API behavior, but it does not yet separate construction into uninitialized slots from assignment into live objects with complete failure bookkeeping. Self-referential input and exception-sensitive element types expose those limitations later, motivating more explicit insertion paths.

## test(vector): 핵심 공개 동작을 표준 결과와 비교
This change introduces differential checks against `std::vector` for the ordinary public behavior implemented so far. It compares size, emptiness, and every element after repeated appends, insertion, erasure, resizing, and reservation, then verifies range construction and relational results.

The test also checks that a reserved vector can continue to accept elements and that `at(size())` reports an out-of-range condition consistently with the standard container. Using the standard implementation as the behavioral oracle is appropriate for observable sequence semantics, while capacity is checked through usable guarantees rather than assuming an exact growth factor. The suite establishes normal-path parity but does not yet examine allocator limits, aliasing, or exceptions from user-defined element operations.

## feat(stack): vector 기반 stack 어댑터 구현
This change implements `stack` as a container adaptor rather than a second storage owner. The protected underlying container, `vector` by default, remains responsible for allocation, element lifetime, size, and ordering; the adaptor exposes only the LIFO vocabulary of `top`, `push`, and `pop`.

Relational operators are forwarded to the underlying container, with the remaining relations derived from equality and ordering. This design keeps the abstraction deliberately thin: `stack` restricts the visible access pattern without duplicating sequence logic or introducing an independent invariant. It also allows a compatible alternative container type to be supplied through the template parameter, provided it supports the small interface the adaptor consumes.

## test(stack): 기본 동작과 관계 연산 검증
This change compares the adaptor's observable behavior with `std::stack` using equivalent vector-based storage. It verifies the value at the top, size changes during push and pop, the empty transition, and the results of equality and ordering.

The test is useful because adaptor correctness depends on delegation details rather than a new data structure. Matching the standard result confirms that the front-facing LIFO interpretation corresponds to the back of the underlying sequence and that non-member relations preserve the ordering semantics of the wrapped container.

## feat(headers): 공용 도구와 순차 컨테이너 통합 헤더 추가
This change introduces `ft_containers.hpp` as a single public aggregation point for the utility layer and the currently available sequential containers. Consumers can include one stable header instead of depending on the internal include graph of traits, iterators, algorithms, pairs, `vector`, and `stack`.

The aggregate header does not create new runtime behavior; it establishes a packaging boundary. That boundary matters for a header-only library because transitive dependency choices otherwise leak into every consumer. Keeping the component headers available preserves fine-grained inclusion, while the aggregate provides a deliberate convenience surface that can expand as additional containers become complete.

## test(headers): 통합 헤더의 순차 컨테이너 표면 검증
This change switches the existing consumer-style test to include only the aggregate header. The same utility, `vector`, and `stack` operations must therefore compile through the public bundle without direct knowledge of individual implementation headers.

This is primarily an integration check. It detects omissions in the aggregate include list and accidental reliance by the test on private include ordering. The runtime assertions remain unchanged, so a failure can be attributed to public-header composition rather than a newly introduced behavioral expectation.

## feat(map): 노드 소유권과 빈 tree 상태 구현
This change establishes the initial storage and ownership model for `ft::map`. Each key/value pair is held in an individually allocated tree node with parent, left, and right links. A rebound allocator creates and destroys node objects, while a null root and zero size represent the empty tree.

Node creation treats allocation and construction separately and releases the allocation if constructing the stored pair throws. Recursive clearing destroys every reachable node, giving the map a single ownership root and a well-defined destruction path. Individual node allocation is appropriate for an associative container because insertion and balancing can relink pointers without moving existing values, which is necessary for element iterator stability.

At this stage the rebound allocator type is present, but construction from the value allocator's state is refined later. The tree is also initially unbalanced; this commit deliberately supplies the ownership substrate on which ordered operations and balancing can be built.

## feat(map): 가변 반복자와 tree 순회 구현
This change adds mutable bidirectional traversal over the binary-search-tree representation. Successor traversal descends to the minimum of a right subtree or climbs parent links until leaving a right branch; predecessor traversal is the symmetric operation. `begin()` selects the minimum node, and a null current node represents `end()`.

Because a null end node carries no structural context, each iterator also stores the root so `--end()` can recover the maximum element. This makes the initial interface functional, but it couples iterator state to a snapshot of container-level topology rather than only to an element node. Rotations, root replacement, and swap later demonstrate why a structural end sentinel is a stronger model. The traversal algorithms themselves already rely on parent links, so element iterators can move without tree searches and retain bidirectional complexity proportional to tree height.

## feat(map): 상수와 역방향 반복자 구현
This change adds a const-qualified tree iterator, conversion from mutable iterator to const iterator, and reverse traversal aliases and accessors. The const iterator mirrors the successor/predecessor mechanics while exposing only `const value_type&` and `const value_type*`, preserving the map contract that keys cannot be modified through iteration.

Reverse traversal is built from the shared `reverse_iterator`, so `rbegin()` originates at `end()` and `rend()` at `begin()`. This reuses the base-iterator invariant rather than duplicating tree navigation in another iterator class. The one-way mutable-to-const conversion follows the normal substitutability rule: read-only code can accept a mutable position, but a const position cannot be upgraded into write access.

## feat(map): 삽입과 첨자 및 복사 동작 구현
This change gives the initial tree its primary value-producing operations. Insertion walks according to the key comparator, returns the existing node when neither key compares less than the other, and otherwise allocates and links a new leaf. Comparator equivalence, rather than `operator==`, therefore defines key uniqueness.

`operator[]` reuses insertion with a default-constructed mapped value, ensuring one lookup path controls both access and creation. Range and copy construction insert visible elements into a new tree, and assignment reconstructs the destination from the source sequence. Hint insertion is accepted through the standard interface but delegates to ordinary insertion, preserving correctness without yet adding a hint-specific optimization.

This commit establishes baseline semantics on an unbalanced search tree. Assignment clears the destination before rebuilding, and insertion performs another comparator call after allocation to choose the parent side; later exception-safety work moves those operations behind stronger transaction boundaries.

## feat(map): 검색과 경계 query 구현
This change adds comparator-driven `find`, `count`, `lower_bound`, `upper_bound`, and `equal_range` in mutable and const forms. Search follows the same equivalence rule as insertion, so lookup remains consistent even for key types that do not define equality.

The bound operations retain the best candidate encountered while descending the tree. `lower_bound` records the first node whose key is not less than the query, while `upper_bound` records the first node for which the query is strictly less. This avoids a full in-order traversal and keeps the operation proportional to tree height. `equal_range` composes the two boundaries, exposing a range that also behaves correctly for absent keys and end-of-tree cases.

## feat(map): 삭제와 clear 및 swap 구현
This change adds all primary removal paths and whole-container state exchange. Erasing a node with zero or one child uses subtree transplantation. For a node with two children, the in-order successor node is physically transplanted into the removed node's position instead of assigning a new key into `pair<const Key, T>`, whose key component is intentionally immutable.

Range erasure advances to the successor before destroying the current node, preventing traversal from dereferencing erased state. `clear` destroys the entire owned tree and restores the empty representation. Swap exchanges allocator, node allocator, root, size, and comparator together so ownership metadata travels with the nodes it governs.

The implementation at this point preserves binary-search ordering and node lifetime but does not yet restore balancing after deletion; red-black deletion correction is introduced once the balancing representation exists.

## feat(map): 관계 연산과 통합 공개 헤더 완성
This change completes the first public `map` interface. `value_compare` wraps the stored key comparator and applies it to pair keys, matching the distinction between key policy and full stored values. Equality and lexicographic relations operate over the map's ordered iterator sequence, so they compare logical contents rather than tree shape.

A non-member `swap` delegates to the member operation, and the aggregate header now exports `map` alongside the sequential containers and common utilities. The resulting public boundary is internally coherent: tree topology remains private, ordering policy is observable through comparator accessors, and all container-wide comparisons reuse the same generic range algorithms.

## test(map): 삽입·검색·삭제 결과를 표준 map과 비교
This change adds differential coverage for the initial associative-container surface. A sequence containing both unique and duplicate keys is inserted into `ft::map` and `std::map`, and the tests compare insertion flags, size, in-order keys, and mapped values.

The suite also checks `operator[]`, lookup, count, lower and upper bounds, equal range, key- and iterator-based erasure, range construction, and equality. Comparing through iteration is important because it simultaneously validates search-tree ordering and iterator traversal. These cases establish functional parity for a representative tree, while later stress and white-box tests address adversarial shapes and red-black structural invariants.

## fix(vector): 용량 계산을 allocator 상한에서 포화
This change makes capacity arithmetic respect the allocator's finite domain before unsigned overflow can occur. `resize` and fill assignment reject counts above `max_size`, insertion verifies that the requested addition fits in `max_size() - size()`, and the growth helper rejects an impossible minimum before calculating a candidate.

Doubling now saturates at the allocator limit when `capacity + capacity` would exceed that limit, rather than multiplying first and attempting to detect an already-wrapped result. If the saturated value is still below the required minimum, the minimum is selected only after it has been validated. The important invariant is that every capacity passed to the allocator is representable, permitted by that allocator, and large enough for the requested live size; invalid requests fail with `length_error` before the vector mutates.

## test(vector): 제한 allocator에서 용량 상한 검증
This change introduces a deliberately small allocator limit so boundary behavior can be exercised without attempting enormous allocations. The allocator reports a maximum of five elements and tracks outstanding blocks.

A vector reserved at capacity three is grown to four elements, forcing the geometric policy to saturate at five rather than overflow or reject a valid growth. A subsequent reservation beyond the limit must throw `length_error`, and leaving scope must return the tracked allocation count to zero. The test therefore verifies both arithmetic policy and ownership cleanup at a reachable allocator boundary, something the default allocator's very large limit would make impractical to reproduce.

## fix(vector): 자기 범위 assign과 insert 입력 보존
This change protects range modifiers when their input iterators refer to the vector being modified. Range assignment first copies the complete source range into a temporary vector and then exchanges storage, so clearing the destination cannot invalidate values that have not yet been read.

Range insertion similarly snapshots the input and the suffix following the insertion point before erasing and reconstructing the affected sequence. The key decision is to consume aliased input into independently owned storage before any operation that can invalidate its iterators. This trades additional allocations and copies for deterministic overlap behavior and also works for generic input ranges because the snapshot is built incrementally.

The reconstruction remains an incremental mutation of the destination and is later refined for stronger lifetime and exception guarantees. This commit specifically establishes source preservation and correct sequence order under self-reference.

## test(vector): 자기 범위 변경 결과 검증
This change adds regression cases in which a vector inserts and assigns from its own iterator range. The expected sequences are constructed from independent snapshots before the corresponding standard-container modifications, preventing the oracle's source iterators from being invalidated during its operation.

The insertion case overlaps the destination position with the source prefix, and the assignment case replaces the vector with an interior subrange. Comparing every resulting element against the independently prepared reference locks down the library's chosen alias-safe behavior and prevents future implementations from consuming a source range after they have already moved, erased, or reallocated its elements.

## test(vector): 역방향 순회 결과 검증
This change verifies that `vector`'s reverse accessors and the generic reverse iterator compose to produce the same sequence as `std::vector`. Both containers are traversed from `rbegin()` to `rend()`, comparing every dereferenced value.

The case specifically exercises the random-access adaptor over raw pointer iterators after the vector has undergone several mutations. It guards the direction inversion and boundary construction without duplicating implementation details in the test.

## feat(map): 가변·상수 반복자 상호 비교 지원
This change makes mutable and const map positions comparable in both operand orders. The const iterator accepts equality and inequality against a mutable iterator, and friend overloads provide the reverse ordering by converting the mutable position to its const representation.

Iterator identity is defined by the current node, not by the exposed reference type. Supporting symmetric mixed comparisons allows generic code to compare a mutable search result with a const boundary without manual conversion and preserves const correctness because the operation observes identity only; it does not grant mutable access through the const iterator.

## test(map): 가변·상수 반복자 비교 검증
This change adds a focused compile-time and runtime regression test for mixed iterator comparisons. A mutable iterator is converted to a const iterator, then equality and inequality are checked with both possible operand orders.

Separating this case from broad map behavior is useful because overload symmetry is primarily a type-system contract. A missing overload may leave ordinary same-type traversal working while breaking generic code only when const and mutable paths meet.

## test(map): 역방향 순회와 경계 query 검증
This change extends associative-container parity checks to gaps and upper-end boundaries that are not covered by exact-key searches. It compares `lower_bound` for a missing key between stored values and `upper_bound` near the maximum, including whether the correct successor or end position is selected.

It also traverses the complete map in reverse and compares both keys and mapped values with `std::map`. This connects predecessor navigation, `--end()`, reverse-iterator base semantics, and sorted tree order in one observable sequence, exposing errors that forward traversal alone could miss.

## test(map): 상수 begin과 reverse begin 검증
This change exercises the const-qualified entry points by binding the map through a const reference and comparing `begin()` and `rbegin()` with the standard container.

The assertions are small, but they verify two distinct properties: overload resolution must select const iterator types, and the extrema returned through the const API must match the mutable tree's current minimum and maximum. This prevents a correct mutable traversal implementation from masking an incorrectly wired const boundary.

## fix(map): 값 allocator 상태로 노드 allocator 구성
This change constructs the rebound node allocator from the caller-supplied value allocator rather than default-constructing an unrelated allocator instance. The same rule is applied to default/range construction and copying.

Allocator rebinding changes the allocated type, not the allocator's ownership identity. Stateful allocators may carry an arena, pool, accounting object, or allocation policy, and nodes must be deallocated through a rebound allocator derived from that same state. Preserving the state across the rebind makes `get_allocator()` and actual node ownership describe one coherent resource domain instead of merely using compatible allocator types.

## feat(map): 레드-블랙 삽입 회전과 색 보정 구현
This change upgrades the map from an ordinary binary-search tree to a red-black tree on insertion. New nodes begin red, the first root is black, and left/right rotations relink parent and child pointers while updating the root when rotation occurs at the top.

Insertion fix-up handles the symmetric red-parent cases. A red uncle is recolored while the violation moves upward; a black uncle triggers an inner rotation when necessary, followed by an outer rotation and recoloring. Forcing the root black after repair establishes the red-black color constraints and bounds tree height logarithmically instead of allowing sorted input to create a linear chain.

Rotations move links rather than stored values, so node addresses—and therefore iterators to existing elements—remain valid. The older iterator representation still carries a root snapshot for end traversal, however, so root-changing rotations reveal a separate iterator-state issue that is corrected by the later header-sentinel design.

## test(map): 정렬 입력 삽입과 검색 경계 stress 검증
This change subjects the balanced insertion logic to the orders that are most damaging to an unbalanced search tree. Ninety-six keys are inserted in ascending order and then in descending order into separate maps.

After each scenario, in-order contents and insertion results are compared with `std::map`, and a spread of present and absent queries checks `find`, both bounds, and both components of `equal_range`, including end-state parity. The test is behavioral rather than a direct height proof, but the adversarial input forces repeated rotations and recolorings while ensuring those structural changes do not alter ordered-map semantics.

## feat(map): 레드-블랙 삭제 보정 구현
This change completes red-black maintenance for erasure. Removal tracks the node physically moved out of its original position, the child that replaces it, that child's parent even when the child is null, and the removed color. Treating null leaves as black allows the algorithm to model the extra-black deficit without allocating sentinel leaf nodes.

When a black node is removed, the fix-up applies the symmetric sibling cases: a red sibling is rotated into a black-sibling configuration; a black sibling with two black children propagates the deficit upward; and near/far red-child configurations are rotated and recolored to discharge it. Two-child deletion transplants the successor node and copies the target's color while preserving the successor's immutable key/value object.

The resulting invariant is stronger than sorted order alone: the root is black, red nodes do not have red children, and every path from a node to a null leaf has the same black height. Maintaining an explicit parent for a null replacement is the key implementation detail that permits repair to continue after the erased node no longer exists.

## test(map): 반복 삭제·복사·대입·교환 stress 검증
This change broadens map stress coverage across both balancing and whole-container lifecycle operations. Large ascending and descending maps are copied, assigned, and swapped, and both sides are compared with their standard counterparts after ownership changes.

A mixed insertion sequence is then reduced through repeated key erasure, followed by alternating minimum and maximum iterator erasure until the map is empty. Contents and boundary queries are checked after each step. This progression exercises many deletion-fix-up shapes, including changing extrema and roots, while also confirming that copying and swapping balanced trees preserve logical contents independently of their internal shape.

## test(map): 범위 삭제 후 상태 검증
This change verifies the full-range erasure boundary by deleting `[begin(), end())` and comparing emptiness and size with `std::map`.

The case protects the iterator-advancement discipline inside range erasure: each successor must be obtained before its current node is destroyed, the saved end condition must remain reachable, and the final removal must restore the canonical empty-tree state rather than leaving a stale root or nonzero size.

## test(map): 비교 함수 접근자 검증
This change checks that `key_comp()` and `value_comp()` expose ordering behavior consistent with `std::map`. The value comparator is applied to actual stored pairs and must reduce comparison to their keys rather than mapped values.

These accessors are part of the map's policy contract. Verifying them through observable comparisons ensures the stored comparator is returned and wrapped correctly, which matters for stateful or non-default ordering policies even though this particular case uses ordinary ascending integer order.

## fix(vector): allocator 형식과 빈 반복자 연산 보정
This change derives `size_type` and `difference_type` from the allocator instead of hard-coding standard integer types, aligning the public vector interface with its allocation policy.

It also removes pointer arithmetic from the null-backed empty state. Forming `_data + 0` or subtracting two null pointers is not guaranteed by the C++ object model, even when the numerical offset is zero. `_iterator_at` returns the null pointer directly when no block exists, `_index_of` maps an empty position to index zero without subtraction, and empty-range erasure avoids calculating `last - first`. These helpers centralize the representation exception so ordinary allocated vectors still use constant-time pointer arithmetic while an empty vector can support `begin() == end()`, zero-count insertion, and empty erasure without undefined behavior.

## test(vector): 빈 저장소와 allocator 상태 검증
This change exercises vector modifiers before the vector owns any allocation. It verifies equal empty boundaries, performs a zero-count insertion at `end()`, and erases the empty range before continuing with the bounded-allocator growth scenario.

The sequence is designed to reach the null-storage branches added by the preceding fix. It confirms that no-op modifiers remain genuine no-ops, do not require pointer subtraction, and do not disturb the allocator accounting used by the rest of the test.

## fix(vector): 저장소 교체와 크기 증가를 트랜잭션으로 처리
This change converts several vector operations to explicit transactional updates. Fill construction now builds an allocated block through `_initialize_fill`, recording and cleaning the constructed prefix on failure before publishing `_data`, `_size`, or `_capacity`. Fill and range assignment build a temporary vector with the destination allocator and exchange only storage state, preserving the allocator identity of the target while leaving its original sequence untouched until replacement is complete.

Growing `resize` records the old size and destroys only the newly constructed suffix if an element copy fails. `push_back` increments `_size` only after successful construction; when reallocation is required, it first copies an aliased argument because `reserve` may invalidate a reference to an existing element. These choices enforce the central lifetime invariant under exceptions: size counts exactly the live prefix, failed replacement does not leak storage, and operations that promise replacement do not destroy the previous value before a complete successor exists.

## test(vector): 생성·대입·크기 변경 실패 주입
This change replaces simple boundary-only fixtures with a failure-injection framework. `tracked_value` records every live object, detects copies from dead sources and duplicate destruction, and can throw on selected copy or assignment attempts. A tracking allocator independently counts outstanding blocks, injects allocation failures, and can still expose a small `max_size`.

The tests force failure during fill construction, fill assignment, copy assignment, and resize growth, then verify the appropriate rollback boundary: partially constructed prefixes and suffixes are destroyed, temporary blocks are released, and pre-existing destination values remain intact where replacement is transactional. An aliased `push_back(values[0])` checks that reallocation snapshots the source before invalidating it. Final cleanup assertions require no live tracked objects, invalid lifetime operations, or outstanding allocations, making ownership errors directly observable rather than inferred from output values alone.

## fix(vector): fill·range 삽입의 객체 수명 보존
This change separates insertion into reallocation and spare-capacity algorithms for both fill and range forms. Fill insertion snapshots its value before any movement, and range insertion continues to materialize its input in a temporary vector so self-referential sources are independent.

Reallocation paths construct prefix, inserted values, and suffix into a new block. They destroy the constructed prefix and release the block on failure, then replace the old storage only after the complete sequence exists. In-place paths distinguish slots that already contain live objects from uninitialized capacity: new tail objects are created with `construct`, existing positions are shifted or filled with assignment, and only the newly constructed tail is destroyed if an exception occurs.

This distinction repairs a fundamental object-lifetime error in the earlier shift algorithm. Reallocation insertion provides a strong replacement boundary. In-place insertion preserves a valid live-prefix and original size when construction or assignment fails, but assignments already completed before a throwing assignment cannot in general be reversed; that path therefore provides the basic guarantee while remaining usable and leak-free.

## test(vector): 삽입 복사·대입·할당 실패 sweep
This change systematically exercises the insertion guarantees with aliased values and injected failures. Fill insertion at spare capacity must snapshot an element from the same vector, clean a partially constructed tail when copying fails, and retain a valid original size and usable container when an assignment throws.

Range insertion is checked in two modes. With sufficient capacity, capacity and the address of the unaffected prefix must remain stable, proving that the implementation does not reallocate unnecessarily. A sweep over copy-failure positions exercises every construction stage of a reallocating range insertion and requires either the unchanged original sequence or the fully inserted result, never a leaked partial state. A separately injected allocation failure must also preserve the source vector.

After each scenario, lifetime and allocation accounting must return to zero. The sweep turns exception safety from a single selected failure point into coverage of the complete sequence of user-code calls performed by insertion.

## fix(map): 삽입 위치를 노드 할당 전에 확정
This change records the final left/right attachment decision while traversing the tree and removes the extra comparator call that previously occurred after node allocation.

Comparator execution is user code and may throw. By completing all comparisons before `_create_node`, insertion has a clean phase boundary: a comparison failure happens while the map owns no new resource, and once allocation succeeds, linking the node and applying red-black repair use only pointer and color operations. Duplicate detection remains inside the traversal and therefore also avoids unnecessary allocation. The change closes a narrow but important leak window in which a comparator exception could otherwise strand an allocated, unlinked node.

## fix(map): 생성과 복사 대입 실패를 임시 tree로 격리
This change gives range and copy construction explicit rollback. If any insertion fails, `clear()` destroys every node already linked into the partially built object before the exception escapes the constructor.

Copy assignment now builds the source contents in a temporary map using the destination allocator and the source comparator. Failures during comparator-driven insertion, value construction, or allocation therefore affect only the temporary tree; the destination is not cleared in advance. Once construction succeeds, a private exchange installs the new tree and lets the temporary destroy the old one.

This commit isolates the dominant resource-producing failure paths and establishes copy-and-replace as the assignment model. The final exchange still includes comparator policy swapping, whose own assignment can throw; the ordering of that policy exchange relative to tree ownership is hardened separately later.

## test(map): 비교·할당 실패 시 노드 소유권 검증
This change adds stateful comparator and allocator fixtures that can fail at controlled calls. The allocator state survives rebinding and counts every outstanding node block, so the test can distinguish a logically correct map from one that leaked an unlinked or partially copied node.

Insertion is swept across comparator failure positions to prove no comparison occurs after allocation. Range and copy construction are subjected to both comparison and allocation failures, and every failed constructor must leave no residual nodes. Copy assignment is tested with a pre-existing target; failures while building the temporary tree must preserve its original keys and baseline allocation count.

A generated input iterator supplies values without depending on another container implementation, and all successful or failed paths are followed by ownership checks. The suite directly verifies the transaction boundaries introduced in map construction and assignment rather than relying only on final ordered output.

## fix(map): 값 없는 header로 끝 반복자 상태 안정화
This change replaces the null end representation and per-iterator root snapshot with a value-less header sentinel embedded in each map. A `node_base` stores links, color, and a header marker, while value-bearing nodes derive from it. The header owns the structural summary: `parent` points to the root, `left` to the minimum, and `right` to the maximum; in an empty map, the extrema self-reference and the root is null.

Iterators now store only a `node_base*`. Incrementing the maximum climbs to the header, and decrementing the header reaches its current maximum, so a saved `end()` observes root rotations and erasures through stable sentinel identity rather than stale copied root state. Element dereference casts only non-header nodes to the value-bearing type. Because the header has no `value_type`, constructing an empty map no longer requires a default-constructible key.

Insertion, rotations, transplantation, erasure, clear, and swap are adapted to maintain root/header parent links and refresh cached extrema. After swap, each moved root is reattached to its new container's header, allowing existing element iterators to follow parent links to the destination end. This refactor unifies empty-state representation, end-iterator stability, extrema lookup, and non-default-key support around one structural invariant.

## test(map): 회전·삭제·교환 뒤 반복자 상태 검증
This change adds targeted regressions for the header-sentinel iterator model. A saved end iterator is decremented after an insertion sequence that rotates the root and after erasing a former root; in both cases it must reach the current maximum rather than a stale topology snapshot. Clearing must restore `begin() == end()`.

An iterator to an existing element is retained through rotations, then advanced through the rebalanced parent links to the header. Separate maps are swapped while element iterators are held, and those iterators must still dereference their original nodes and eventually reach the end sentinel of the container that now owns those nodes.

The test also defines a key with no default constructor and verifies an empty map plus insertion. That case proves the header is genuinely value-less rather than hiding a default-constructed key/value object inside the sentinel.

## fix(map): 비교자 교환 실패 전에 tree 소유권 유지
This change reorders both public swap and the private assignment exchange so the potentially throwing comparator swap occurs before allocator, root, or size ownership is moved.

The order is critical because tree ordering is meaningful only with the comparator that governs it, and nodes must remain paired with the allocator state that deallocates them. If comparator assignment throws before policy exchange completes, both maps still retain their original roots, sizes, and allocators; no tree has crossed an ownership boundary under a mismatched policy. The subsequent ownership swaps and header refreshes are performed only after the comparator step succeeds.

This is a small diff that repairs a high-risk commit point in copy assignment and public swap: resource ownership must not be changed before all earlier user-defined policy operations that can fail.

## test(map): 비교자 대입 실패 뒤 컨테이너 상태 검증
This change introduces a comparator whose assignment can throw and an allocator whose identity and outstanding blocks are independently tracked. Two maps use different order directions and different allocator states, making a partial policy/ownership exchange observable.

For copy assignment, a comparator failure at the exchange boundary must leave the target's original descending sequence, allocator-owned node count, and ability to accept further insertion intact; the completed temporary tree must be released. For public swap, both containers must retain their original ordered contents, allocator identities, and node ownership counts after the injected failure.

The tests focus on policy assignment rather than comparator calls during search, covering the failure mode not exercised by the earlier map exception suite. They verify that reordering the commit sequence protects both logical ordering and physical resource ownership.

## test(map): 무작위 연산마다 레드-블랙 불변식 검증
This change adds a narrow white-box inspection seam and uses it to validate the tree after every structural operation. The inspector checks that the header is black and correctly marked, empty extrema self-reference, the root points back to the header and is black, cached minimum and maximum are current, parent/child links agree, keys satisfy strict subtree bounds, red nodes have no red children, all null-leaf paths have equal black height, and the reachable node count equals `size()`.

Verification includes fixed insertion/erasure sequences, repeated deletion of the current root, and 3,000 deterministic pseudo-random operations compared with `std::map`. The randomized stream covers insertion, `operator[]`, key and iterator erasure, queries, copying, assignment, swap with a secondary map, and occasional clear. Both maps are compared and structurally validated after every step.

A fixed seed, current step, and complete operation prefix are printed on failure, making a complex balancing regression reproducible. The friend declaration exposes no new container behavior; it creates a deliberately constrained test boundary for properties that ordinary iteration cannot prove.

## perf(map): 높이와 비교 횟수 회귀 상한 추가
This change turns the map's asymptotic requirements into executable regression limits. A counting comparator measures insertion and lookup work, while the structural inspector reports actual tree height.

For 1,024 ascending, descending, and deterministically shuffled keys, the tree must satisfy the red-black height bound of at most twice `ceil(log2(n + 1))`. Total insertion comparisons are bounded by a conservative `n log n` expression, and each successful or unsuccessful `find` must remain within a constant multiple of the measured height. The scenarios include the two orders that would make an ordinary binary-search tree linear.

These are upper-bound tests rather than microbenchmarks: they avoid timing noise and instead measure algorithmically meaningful structural and comparison costs. A regression that preserves sorted output but accidentally disables balancing or introduces repeated linear searches will fail deterministically.

## test(headers): 공개 헤더를 각각 독립 compile
This change compiles a separate minimal translation unit for every public header. Each source includes exactly one library header and instantiates a representative operation, while the Makefile builds the files as objects under a dedicated `headers` target.

The isolation matters because a combined test may compile only because another header happened to include a missing standard or project dependency first. Requiring every public header to be self-contained makes include guards and direct dependencies part of the API contract. The aggregate header is tested separately from component headers, preserving both supported consumption styles.

## test(consumer): 다중 번역 단위 공개 헤더 사용 검증
This change adds a linked consumer program split across independent translation units. One source includes and uses `ft_vector`, another includes and uses `ft_map`, and a third calls both through a small shared declaration header. The resulting executable checks deterministic aggregate results.

Compiling headers independently detects missing declarations; linking multiple consumers adds coverage for header-only ODR and linkage errors, such as non-inline definitions emitted into more than one object file. The new `check` target composes behavioral tests, isolated-header compilation, and the multi-translation-unit consumer so the library is verified in a usage shape closer to a real application rather than only as one monolithic test source.

## build(makefile): 격리된 sanitizer 검사 대상 추가
This change adds an AddressSanitizer and UndefinedBehaviorSanitizer build of the complete `check` suite. Debug information and frame pointers are retained to make failures diagnosable, and a recursive make places instrumented objects in a separate build directory.

Build isolation prevents normal and sanitizer-compiled objects from being mixed or incorrectly considered up to date under different flags. Applying the instrumentation to behavioral tests, header consumers, and the linked multi-translation-unit program broadens detection of invalid pointer arithmetic, use-after-free, double destruction, out-of-bounds access, and other lifetime errors that value comparisons alone may not reveal.

## ci: compiler 행렬과 sanitizer 검사 구성
This change makes the repository's compatibility and memory-safety checks automatic on pushes and pull requests. The main matrix runs the complete `check` target with GNU C++ and Clang on Linux and with Clang on macOS, with fail-fast disabled so platform-specific results remain visible together.

A separate Linux job runs the sanitizer target under Clang with leak detection, immediate failure, and undefined-behavior stack traces enabled. Read-only repository permissions are sufficient for both jobs. The workflow converts C++98 portability, public-header integration, multi-translation-unit linkage, behavioral parity, and sanitizer cleanliness from local optional checks into repeatable branch-level acceptance criteria.

## test(vector): 자기 범위 기대값을 명시적 snapshot으로 구성
This change rebuilds the expected results for self-range insertion and assignment explicitly, element by element, before applying the operation to `ft::vector`. The reference sequence is assembled from the unchanged prefix, snapshotted source range, and unchanged suffix for insertion, and from the selected interior range for assignment.

The test no longer asks `std::vector` to perform a corresponding modifier and thereby avoids coupling the oracle to any implementation-specific or version-sensitive interpretation of overlapping source ranges. The expected value is now derived directly from the contract this library chooses to support. That makes the regression independent: a failure identifies a disagreement with the stated snapshot semantics rather than a difference between two containers executing related mutation algorithms.
