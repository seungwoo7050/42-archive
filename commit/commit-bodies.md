## feat(char): ASCII 문자 판별과 대소문자 변환 구현
Establish the first public `libft` surface together with a reproducible static-library build. The character predicates use explicit ASCII ranges, so their behavior is independent of the process locale, while the case-conversion functions preserve any input outside the corresponding ASCII letter range. `ft_isalnum` is defined by composing the alphabetic and decimal predicates, keeping the classification rules consistent rather than duplicating them.

The build records generated dependencies, compiles under strict C99 warnings, and archives the implementation behind `libft.h`. This makes the header the API authority and gives later modules a stable compilation and linkage boundary.

## test(char): ASCII 문자 동작을 libc와 비교
Introduce a reusable test runner and a `make test` entry point, then verify the character API differentially against the C library in the `C` locale. Boolean results are normalized before comparison because the standard classification functions promise zero versus nonzero, not a particular true value.

Exercising every value representable by `unsigned char`, plus `EOF` and selected out-of-range inputs, locks down both the ASCII contract and the requirement that case conversion leave nonletters unchanged. The test harness also establishes a common failure-reporting mechanism that later modules can extend without replacing the build boundary.

## feat(memory): 메모리 채우기와 0 초기화 구현
Add byte-oriented memory filling through `ft_memset` and define `ft_bzero` as the zero-byte specialization of the same primitive. Converting both the storage pointer and the fill value to `unsigned char` matches the C object-representation model: arbitrary memory is manipulated as bytes, and an `int` fill value is reduced to its low-order byte.

Returning the original pointer preserves the conventional chaining contract of `memset`. Reusing `ft_memset` for zeroing keeps one implementation responsible for the write bounds, avoiding two loops whose edge behavior could diverge.

## test(memory): 메모리 채우기 범위 검증
Verify memory filling against the standard library while checking more than the bytes expected to change. Seeded guard data before and after each target range exposes underruns and overruns, and the matrix of offsets, lengths, and fill values covers zero-length operations, unaligned starts, byte-boundary values, and `int` values that must be converted to `unsigned char`.

The tests also assert the original-pointer return contract and permit null pointers only when the requested length is zero. This separates the valid no-access case from invalid nonzero-length access and protects the exact byte-range invariant required by both `ft_memset` and `ft_bzero`.

## feat(memory): 겹치지 않는 메모리 복사 구현
Add `ft_memcpy` as the primitive for copying a known non-overlapping byte range. Both operands are viewed through character types so every object representation can be transferred byte for byte, while the source remains `const` and the original destination is returned to match the public contract.

The implementation deliberately does not detect or accommodate overlap. Keeping that precondition explicit avoids paying for overlap handling in the simpler primitive and leaves `ft_memmove` responsible for the stronger contract introduced later.

## test(memory): 메모리 복사 경계 검증
Compare `ft_memcpy` with the standard implementation across multiple source and destination offsets and lengths, including the zero-length null-pointer case. Whole-buffer comparison verifies that exactly the requested destination interval changes, rather than checking only the copied prefix.

A preserved snapshot of the source separately enforces its read-only role. Together, these checks protect the function's three essential contracts: return the original destination, leave the source untouched, and write no bytes outside the requested non-overlapping range.

## feat(memory): 겹치는 메모리의 안전한 이동 구현
Add `ft_memmove` on top of the existing byte-copy primitive while preserving data when source and destination ranges overlap. A no-op returns immediately for identical pointers or zero length. When the destination begins inside the source range, bytes are copied from the end toward the beginning so unread source bytes cannot be overwritten; all other cases are safe to process forward through `ft_memcpy`.

The overlap decision is made by equality against positions inside the source range rather than by imposing an address ordering on unrelated objects. This keeps the stronger move semantics localized while retaining `ft_memcpy` as the efficient primitive for ranges whose forward traversal is safe.

## test(memory): 겹치는 메모리 이동 검증
Use the system `memmove` as an oracle for same-position, forward-overlap, backward-overlap, and disjoint moves over a range of lengths. Each case starts from identical patterned buffers and compares the entire result, so corruption of bytes outside the destination interval is visible as well as incorrect copied content.

The zero-length null-pointer case verifies that the early-return path performs no access. Covering both overlap directions is essential because the correct traversal direction changes with the relative placement of source and destination; testing only one direction would leave the central safety property unproven.

## feat(memory): 범위를 제한한 메모리 검색과 비교 추가
Add bounded byte search and comparison primitives. `ft_memchr` converts the requested value to `unsigned char` and returns the first matching address within the supplied length, while `ft_memcmp` compares unsigned byte values and stops at the first difference.

Unsigned byte interpretation is important for values at or above `0x80`; using signed `char` would produce platform-dependent ordering. Both loops are strictly length-bounded, so embedded zero bytes have no special meaning and the functions remain suitable for arbitrary object representations rather than only C strings.

## test(memory): 메모리 검색과 비교 검증
Validate bounded search and comparison over every prefix of buffers containing embedded zeros and high-bit bytes. Search results are compared by address, including repeated values, absent values, and `int` inputs that reduce to the same byte after conversion.

Comparison results are reduced to their sign before matching the C library because `memcmp` specifies ordering, not an exact numeric difference. Testing both operand orders, equality, and the zero-length null-pointer case locks down first-difference ordering without overfitting the test to one library's return magnitude.

## feat(string): 문자열 길이 계산과 제한 복사·붙이기 추가
Add the core NUL-terminated string length and capacity-bounded copy/concatenation operations. `ft_strlcpy` writes at most `capacity - 1` characters and terminates whenever a nonzero capacity permits, but returns the full source length so callers can detect truncation independently of the bytes written. `ft_strlcat` similarly reports the length of the string it attempted to construct.

The concatenation path scans the existing destination only within the supplied capacity. If no terminator is found in that range, it performs no append and returns `capacity + source_length`, avoiding an out-of-bounds read while preserving the `strlcat` truncation contract. These functions therefore make the buffer capacity, rather than an assumed valid destination string, the controlling safety boundary.

## test(string): 문자열 길이와 capacity 경계 검증
Exercise string length, bounded copy, and bounded concatenation across empty inputs, exact fits, truncating capacities, and destinations of several initial lengths. Handwritten reference implementations are used for `strlcpy` and `strlcat`, avoiding dependence on whether the host C library exposes those non-ISO interfaces.

Each destination begins with deterministic data and the entire buffer is compared after the operation. That makes writes beyond the permitted capacity observable while separately checking the attempted-length return value, which is the information callers use to distinguish successful construction from truncation.

## feat(string): 문자의 첫·마지막 위치 검색을 추가
Add first- and last-occurrence searches that treat the requested `int` as an `unsigned char`, matching the standard string-search contract even for values outside the ordinary character range. Both functions include the terminating NUL in the searchable sequence, so searching for `0` returns the terminator rather than reporting no match.

`ft_strchr` can return as soon as the target is encountered. `ft_strrchr` instead carries the most recent match while traversing through the terminator, which handles repeated characters and the NUL case with one consistent loop and no backward-pointer arithmetic.

## feat(string): 범위 비교와 부분 문자열 검색을 추가
Add bounded lexicographic comparison and bounded substring search. `ft_strncmp` compares characters as unsigned bytes, stops at the first difference, NUL terminator, or requested length, and therefore avoids platform-dependent ordering for bytes with the high bit set.

`ft_strnstr` treats an empty needle as matching at the start and examines only candidate bytes inside the supplied search bound. Expressing the remaining allowance as `length - haystack_index` prevents a candidate match from reading past the bound without forming an overflowing sum. The search also stops at the haystack terminator, preserving string semantics inside the external length limit.

## test(string): 문자열 검색과 비교 경계 검증
Verify character search by pointer equality against the C library, including repeated characters, absent values, the terminating NUL, and `int` values that convert to the same byte. Bounded comparisons are checked by result sign rather than exact magnitude because only lexicographic ordering is part of the contract.

A local bounded-substring oracle exercises empty needles, matches at different positions, overlapping prefixes, absent needles, and search lengths on both sides of the required match span. Varying the bound around the haystack end protects the essential invariant that no successful match may depend on bytes outside the caller-provided range.

## feat(convert): 표현 가능한 10진수 정수 해석
Implement decimal integer parsing for leading ASCII whitespace, one optional sign, and the following digit run. Accumulation occurs in `unsigned int` against a sign-specific limit: positive values stop at `INT_MAX`, while negative values may reach the one-larger magnitude needed to represent `INT_MIN`.

The overflow check is performed before multiplication and addition, so excessively long input saturates at the appropriate endpoint without invoking signed overflow. Parsing stops at the first nondigit, and malformed sign sequences therefore yield no converted digits rather than being interpreted as a second sign.

## test(convert): 정수 해석 경계 검증
Compare representable inputs with the host `atoi` across empty strings, sign-only inputs, leading zeroes, every standard whitespace character, trailing text, malformed sign combinations, and both signed endpoints. This locks down where parsing begins and exactly when the digit run terminates.

Inputs far beyond the integer range are tested against the library's explicit saturation policy rather than delegated to `atoi`, whose out-of-range behavior is not a portable oracle. The tests therefore distinguish compatibility for valid conversions from the project-defined guarantee that overflow returns `INT_MAX` or `INT_MIN`.

## feat(alloc): 0 초기화 메모리와 문자열 복제 추가
Introduce allocation helpers with explicit arithmetic and ownership guarantees. `ft_calloc` rejects `count * size` overflow before multiplication, allocates one byte for a mathematically zero-sized request, and clears the full allocated extent through the existing byte-zeroing primitive. Returning a real allocation for zero-sized requests gives callers a consistently freeable result in this library.

`ft_strdup` rejects a null source, allocates separate storage for the complete string and terminator, and copies the representation in one bounded operation. Both functions return `NULL` on allocation failure, so ownership transfers to the caller only after construction has completed successfully.

## test(alloc): 할당과 문자열 복제 계약 검증
Validate that successful `ft_calloc` results are non-null and zeroed across ordinary and zero-factor requests, then free every returned allocation through the public ownership boundary. Multiplication cases that exceed `SIZE_MAX` must fail before allocation, protecting the size computation from wraparound into an undersized buffer.

String duplication tests compare contents while also requiring a distinct address, proving that the result owns independent storage rather than aliases the input. Empty strings, normal text, and a null source cover the allocation, copy, and argument-failure contracts separately.

## feat(string): 부분 문자열 생성을 구현
Add substring construction as an owning operation. A null source fails, a start at or beyond the source length returns an independently allocated empty string, and an oversized requested length is clamped to the available suffix before allocation.

Computing the available span as `text_length - start` avoids relying on an overflowing `start + length` comparison. The selected bytes are copied into new storage and explicitly NUL-terminated, so every successful result is a valid, independently freeable C string even when the requested slice is empty.

## feat(string): 문자열 결합을 구현
Add construction of a new string containing the complete left and right operands. Null operands fail before any allocation, and the combined allocation size is checked before adding both lengths and the terminator so size arithmetic cannot wrap into an undersized buffer.

The implementation copies the left payload without its terminator, then copies the right payload together with its terminator. This gives the result one authoritative terminator and preserves both inputs unchanged; ownership of the newly allocated combined representation belongs solely to the caller.

## feat(string): 양끝 문자 집합 제거를 구현
Add trimming by a caller-provided character set. The implementation advances a start boundary over matching leading characters, retreats an end boundary over matching trailing characters, and copies the remaining half-open interval into new storage.

Keeping `end > start` as the backward-scan guard prevents unsigned underflow when the entire string is trimmed. An empty result is still represented by an allocated NUL-terminated string, preserving the same ownership contract as nonempty results, while null text or set arguments fail without allocating.

## test(string): 문자열 생성과 소유권 검증
Verify substring, concatenation, and trimming across empty results, exact and oversized slices, empty operands, multiple trim characters, complete trimming, and no-op trimming. Invalid null arguments are required to fail explicitly.

Every successful result is checked both for content and for a storage address distinct from its input operands, then released by the test. Those address checks are important because these APIs construct owned strings: returning an interior source pointer or an unchanged operand could produce correct text temporarily while violating the caller's right to free the result independently.

## feat(string): 실패 시 정리되는 문자열 분리 구현
Add delimiter-based splitting into a null-terminated array of independently allocated fields. A counting pass determines the pointer-array size, consecutive delimiters are skipped rather than producing empty fields, and zero-initialized allocation guarantees a trailing null sentinel even for an empty result.

Each field is constructed from an exact source span. If any field allocation fails, the helper releases every field already transferred into the partial result and then frees the pointer array before returning `NULL`. This rollback rule makes the operation all-or-nothing: callers either receive a complete ownership graph or no live allocation from the failed attempt.

## test(string): 문자열 분리 결과 검증
Verify the complete ownership graph returned by `ft_split`: each expected field must exist, contain the right bytes, occupy storage distinct from the source, and be followed by a null pointer sentinel. The test releases fields through that sentinel-based public representation, proving that ordinary consumers can reclaim the result without an external count.

Cases cover empty input, delimiter-only input, repeated and edge delimiters, a NUL delimiter, and a long field. Together they establish that delimiter runs do not create empty fields, that every nonempty span is preserved, and that the representation scales beyond the small examples used to design the parser.

## feat(convert): 부호 있는 정수의 문자열 변환 구현
Add allocation-backed conversion of every `int` value to decimal text. Negative magnitudes are formed as `-(number + 1) + 1` in the unsigned domain, avoiding the undefined operation of directly negating `INT_MIN`, whose positive counterpart is not representable as an `int`.

The digit count determines one exact allocation, and digits are emitted from right to left so no temporary reversed string or second pass is required. Zero receives one digit through the same path, a leading minus sign is added only for negative inputs, and the successful result is a NUL-terminated string owned by the caller.

## test(convert): 정수 문자열 변환 검증
Check decimal conversion at both signed endpoints and around every change in digit count and sign handling. Explicit expectations for `INT_MIN`, zero, powers-of-ten boundaries, and `INT_MAX` expose errors in magnitude formation, allocation length, digit order, and sign placement.

Each successful conversion is required to allocate a result and is freed by the test. This verifies not only textual correctness but also the function's ownership contract across the complete representable `int` range.

## feat(string): 인덱스를 사용하는 문자열 변환 추가
Add two callback-based traversal contracts with distinct ownership behavior. `ft_strmapi` allocates a new string, invokes the callback once for each original character with its zero-based index, and leaves the source untouched. `ft_striteri` exposes each mutable character address to an in-place callback and returns no new storage.

Both functions capture the initial string length before iteration. This fixes the traversal domain at call entry, so an in-place callback that writes NUL does not silently shorten the remaining work. Null strings or callbacks are rejected without dereferencing or allocating.

## test(string): callback 문자열 변환 검증
Instrument callbacks to assert monotonically increasing indices, exact invocation counts, and the expected distinction between allocating and in-place transformations. Mapped results must have independent storage, while iterative callbacks must modify the caller's original buffer.

A callback that replaces every character with NUL is especially important: the test still expects one call per character in the initial string. This locks down the fixed traversal boundary and prevents an implementation from recomputing `strlen` or using the newly written terminator as an early stop condition.

## feat(io): 파일 디스크립터 출력 함수 추가
Add character, string, newline, and signed-decimal output helpers over an arbitrary file descriptor. Composite newline output reuses the string and character primitives, while integer output constructs the complete representation in a fixed stack buffer and submits it with one `write`.

The integer magnitude uses the same unsigned-domain technique as `ft_itoa`, so `INT_MIN` is representable without signed overflow. At this stage the API is deliberately fire-and-forget: the functions return `void` and discard the `write` result, leaving error observation to `errno` and not yet guaranteeing recovery from short or interrupted writes.

## test(io): 파일 디스크립터 출력 검증
Capture output through a pipe and compare the exact byte sequence produced by all four descriptor helpers, including zero and both signed endpoints. This verifies formatting independently of terminal behavior and confirms that calls compose in order on a shared descriptor.

The failure cases define the initial void-returning policy: a broken pipe must expose `EPIPE` once `SIGPIPE` is suppressed, and writes to an invalid closed descriptor must return control without crashing. These checks establish observable error behavior even though the API cannot report a status directly; later commits strengthen completion under partial and interrupted writes.

## feat(list): 연결 리스트 노드 생성과 앞 삽입을 구현
Introduce the public singly linked-list representation and its first construction operations. `ft_lstnew` allocates only the node, stores the caller-supplied content pointer without copying or freeing it, and initializes `next` to `NULL`; node ownership and content ownership therefore remain distinct.

Front insertion mutates the caller's head pointer by linking the new node to the previous head before publishing it as the new head. Null list handles or nodes are treated as no-ops, which prevents partial link changes when the operation lacks either required object.

## feat(list): 연결 리스트 크기와 마지막 노드를 조회
Add read-only traversals for the number of nodes and the final node. Both functions treat a null head as the empty-list representation: its size is zero and it has no last node.

The implementations advance local pointers only, preserving all links and content. `ft_lstlast` stops when the current node owns the terminal `next == NULL` link, giving later back-insertion code a single authoritative way to locate the append boundary.

## feat(list): 연결 리스트 뒤 삽입을 구현
Add tail insertion while preserving the empty-list case. A valid node becomes the head when the list is empty; otherwise the existing last node's `next` link is updated, leaving the head and all intermediate links unchanged.

Reusing `ft_lstlast` centralizes the definition of the terminal node. As with front insertion, null handles and null nodes are no-ops, and the function only transfers the node into the linkage structure—it does not assume ownership of or modify the node's content.

## test(list): 노드 생성과 삽입 불변식 검증
Verify that newly allocated nodes retain the exact content pointer and begin detached, then compose front and back insertion to establish head identity, node order, terminal `NULL`, size, and last-node queries. Empty-list behavior and a node carrying null content are covered independently.

Invalid insertion arguments must leave an existing list unchanged. The test frees nodes without touching stack-backed content, reinforcing the API boundary that node allocation belongs to the list helpers while content lifetime remains controlled by the caller until a destructor is explicitly supplied.

## feat(list): 연결 리스트 순회와 삭제 구현
Add traversal and destruction operations that make content ownership explicit through callbacks. `ft_lstdelone` invokes the caller's destructor before freeing the node, while `ft_lstclear` saves each successor before deleting the current node and advances the caller's head until it becomes `NULL`.

Requiring a non-null destructor prevents the library from guessing how opaque content should be released. Iteration applies a callback to each content pointer without changing links or freeing storage. These functions therefore separate structural node lifetime, caller-defined content lifetime, and non-owning traversal into distinct contracts.

## test(list): 순회와 삭제 수명 검증
Track callback counts, mutation order, and destructor order over a multi-node list. Iteration must visit every node once in linkage order; clearing must destroy each content object once, free the corresponding node, and leave the caller's head as `NULL`.

Single-node deletion and null-argument paths clarify the ownership preconditions. In particular, a missing destructor must leave nodes and stack-backed content untouched rather than freeing only part of the ownership graph, preventing ambiguous partial destruction.

## feat(list): 실패 시 정리되는 리스트 변환 구현
Add list mapping as construction of a completely separate node chain. For each source node, the transformation callback produces mapped content and a new node takes ownership of that result; a maintained tail allows append in constant time without rescanning the partial output.

If node allocation fails after content has been produced, that unlinked content is destroyed immediately and the already-built mapped list is cleared with the same destructor. The source list is never modified. This establishes an all-or-nothing ownership transfer: success returns a complete independent chain, while failure leaves no mapped node or mapped content live.

## test(list): 리스트 변환과 content 수명 검증
Map a source list into newly allocated content and nodes, then verify value transformation, preserved order, structural independence, content independence, and absence of source mutation. Clearing the mapped result must invoke its destructor exactly once for every mapped node.

A callback returning `NULL` content is treated as a legitimate mapped value rather than an implicit allocation failure, which distinguishes callback semantics from node-allocation failure. Null callback/destructor inputs and an empty source define the remaining boundary behavior, while the source chain is released separately without destroying its stack-backed content.

## fix(string): callback 순회의 진행 인덱스를 확장
Use `size_t` for the internal traversal counter so it has the same range as `ft_strlen` and the allocated object size. The previous `unsigned int` counter could wrap before reaching a string whose length exceeded `UINT_MAX`, causing repeated access or a nonterminating traversal even though the callback API itself accepts only an `unsigned int` index.

The callback conversion is now performed only at the call boundary. This preserves the mandated public signature while keeping pointer arithmetic, loop termination, and terminator placement in the correct object-size domain.

## refactor(io): 숫자 출력을 자릿수 helper로 분리
Refactor signed-decimal output into sign handling plus a recursive unsigned-digit emitter. The change preserves the unsigned `INT_MIN` magnitude technique while making each emitted digit pass through the same character-output primitive used elsewhere.

This removes the private fixed-size decimal buffer and consolidates byte emission behind one descriptor-writing path, preparing number output to inherit later short-write and interruption handling. The trade-off is multiple one-byte writes instead of one buffered write, acceptable here because the public helpers prioritize a uniform completion policy over throughput.

