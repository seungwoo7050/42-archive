## build(makefile): C++98 정적 라이브러리 빌드 구성
Introduce a reproducible build for `libcpp_foundation.a` with a strict C++98 compilation boundary. The warning set rejects language extensions, old-style casts, qualifier loss, overloaded-virtual mistakes, and non-virtual destruction hazards, so portability and object-model errors are treated as build failures rather than review conventions.

Source discovery is deterministic, generated dependency files keep incremental rebuilds correct, and build products are isolated from version control. The initial archive rule also handles an empty source tree, allowing the build contract to exist before the first implementation unit without pretending that a platform-specific compiler default is acceptable. `clean`, `fclean`, and `re` establish explicit lifecycle rules for generated objects and the archive.

## feat(contact): 검증된 연락처 값 객체 구현
Add `Contact` as a small value object whose construction establishes its own validity. Names must be non-empty printable ASCII and no longer than 32 bytes; notes may be empty but must remain printable ASCII and fit within 64 bytes. Invalid input is normalized to the single empty-contact state rather than leaving a partially valid combination of fields.

The implementation initializes both members to empty and publishes the supplied values only when both fields satisfy the contract. Const accessors expose observation without allowing callers to break the invariant, while `swap()` supplies a non-throwing state exchange that later ownership and strong-guarantee code can use as a commit operation. Once a real source object exists, the build can also replace the bootstrap empty-archive fallback with normal archiving.

## test(contact): 연락처 값 불변식 검증
Establish executable evidence for the `Contact` value contract. The tests cover the canonical empty state, successful construction, const observation, value copying, and two-way `swap()` behavior, then exercise every validation boundary: an empty name, names and notes one byte beyond their limits, and control characters embedded in otherwise valid text.

This change also introduces a minimal test harness and makes verification part of the build lifecycle. Rebuilding from a clean tree, running the unit suite, and confirming that a second build is already up to date checks more than functional output: it verifies dependency generation, archive reconstruction, and build idempotence alongside the object invariant.

## feat(contact): 고정 크기 연락처 저장 순서 보존
Add `ContactBook` as an eight-slot circular buffer rather than a dynamically growing collection. Empty contacts are ignored; valid contacts occupy the next physical slot; and once capacity is reached, insertion replaces the oldest slot while the observable size remains bounded. This representation makes the memory bound part of the type rather than a caller-managed policy.

`at()` translates a logical oldest-to-newest index into the underlying physical array and rejects indices outside the current logical range. Separating logical order from storage order is the essential decision: callers do not need to know where the ring currently wraps. At this stage replacement uses direct value assignment, which preserves ordering on success but does not yet isolate the stored slot from every allocation failure; that failure boundary is strengthened later without changing the public ordering model.

## test(contact): 연락처 저장 용량과 논리 순서 검증
Lock down the circular-buffer semantics of `ContactBook`. The suite verifies that empty values consume no capacity, inserting ten contacts retains exactly eight, the first two values are displaced, and logical indices still enumerate `C` through `J` even though the physical array has wrapped.

The out-of-range check is equally important: the public index is defined over the current logical sequence, not over the fixed backing array. A caller therefore cannot observe unused slots or use the implementation capacity as a substitute for the current size. These tests protect the storage-order abstraction against later changes to insertion or indexing.

## feat(contact): 연락처 목록의 스트림 출력을 지원
Provide a serialization boundary for the contact book by writing each logical entry as `index|name|note`. The implementation deliberately obtains every record through `at()` instead of traversing the backing array, so the textual representation inherits the same oldest-to-newest order promised by indexed access.

Accepting an arbitrary `std::ostream` keeps formatting independent of the terminal and makes the behavior directly testable with in-memory streams. The method owns record ordering and field delimiters, while the caller remains responsible for the destination stream and its failure policy.

## feat(contact): 연락처 명령행 세션 연결
Add a thin command-line session around the contact domain. `ADD` parses a `name|note` payload, delegates validity to `Contact`, and inserts only a non-empty value; `LIST` delegates ordering and rendering to `ContactBook`; `QUIT` ends the session; and all other lines produce a deterministic error response.

The CLI does not duplicate field limits or circular-buffer rules. Its responsibility is protocol adaptation—line input, command recognition, and process output—while the library remains the authority for value validity and storage behavior. The build is extended generically so applications in `apps/` link against the same public archive consumed by external code.

## test(contact): 공개 계약과 명령행 세션 검증
Split contact verification into unit, compile-contract, and command-line layers. Positive compile tests include each public header twice and use only exported names, checking include guards and standalone usability. A negative compile test confirms that private representation cannot be accessed, turning encapsulation into an executable requirement rather than an informal style rule.

The session fixture then drives the real binary through successful additions, an invalid command, listing, and termination, comparing the complete byte output with the expected transcript. Additional unit assertions verify that wrapped books discard the oldest values and serialize in logical order. Together these tests cover representation hiding, public-header consumption, domain ordering, and the process-level protocol.

## feat(buffer): 종료 문자를 포함한 문자열 저장소 소유
Introduce `TextBuffer` as an owning C-string-oriented value with an explicit lifetime. Every live object owns a non-null allocation containing exactly `size() + 1` bytes, and the final byte is always the NUL terminator. Default construction and a null input pointer both produce the same valid empty representation, avoiding a second nullable internal state.

Checked const and mutable `at()` access excludes the terminator from the character range, while `c_str()` provides a stable read-only interoperability view. Copying is initially disabled until deep-copy semantics are implemented, preventing accidental shallow ownership. A non-throwing `swap()` exchanges the pointer and size together, preserving their representation invariant and preparing the type for transactional assignment.

## test(buffer): 저장 크기와 범위 접근 검증
Define the observable storage contract of `TextBuffer`. The tests verify that both default and null-pointer construction yield an empty, correctly terminated string; a populated buffer reports the expected byte count and contents; const access reads stored characters; and mutable access changes the owned representation.

Access at exactly `size()` must throw even though that physical position contains the terminator. This distinction prevents callers from treating implementation storage as part of the logical character sequence and protects the invariant that termination remains managed by the class.

## feat(buffer): 깊은 복사와 정규 대입 구현
Make `TextBuffer` a regular owning value by adding a deep-copy constructor and copy assignment. Each copy allocates its own `size + 1` storage and copies the terminator with the payload, so mutation and destruction of one object cannot affect another.

Assignment uses copy-and-swap: construct a complete replacement first, then exchange state with the target. If allocation fails, construction of the temporary fails before the target changes; if it succeeds, the non-throwing swap commits the new state and the temporary destroys the old allocation. The same path handles self-assignment without a special branch, trading an extra allocation for a uniform strong exception guarantee.

## test(buffer): 복사 독립성과 자기 대입 검증
Verify the full value semantics introduced for `TextBuffer`. Mutating a copied buffer must not change its source, assignment must return the target reference and reproduce the bytes, and chained assignment must propagate the same value through multiple objects.

Self-assignment is exercised through an alias rather than an obvious syntactic identity, ensuring the implementation is correct because of its copy-and-swap structure rather than a narrowly matched `this == &other` branch. These checks protect independent ownership and standard assignment behavior that later formatter and container abstractions rely upon.

## feat(buffer): 결합·비교·출력 연산 제공
Extend `TextBuffer` with composition and ordinary value operations. `operator+=` first proves that `size + other.size + 1` fits in `std::size_t`, allocates and fills a complete joined buffer, and only then releases the old storage. This ordering preserves the original value if allocation fails and also makes self-concatenation safe because the source bytes remain alive until both copies finish.

Non-member addition is defined in terms of copy plus compound addition, so operands remain unchanged and reuse the same overflow and ownership rules. Equality, inequality, and ordering expose the class's C-string lexical semantics, while stream insertion delegates only the stored text to the destination stream. The result is a small regular type that can participate in algorithms and I/O without leaking its allocation details.

## feat(buffer): 문자열 결합 CLI 제공
Add a minimal executable that constructs two `TextBuffer` values through the public interface, combines them with `operator+`, and emits the result through the stream operator. Argument-count validation belongs at the process boundary and produces usage text on standard error without entering the library path.

Keeping the executable this small is intentional: it demonstrates that construction, ownership, composition, and output are sufficient from a consumer's perspective. No private header or implementation detail is required to use the archive.

## test(buffer): 연산자와 명령행 결합 결과 검증
Exercise the algebra exposed by `TextBuffer`: addition preserves both operands, compound addition mutates only its left side, self-concatenation duplicates the original bytes correctly, lexical comparison distinguishes ordered values, and stream insertion produces the stored text without decoration.

The command-line check links those operations through the real executable and compares the complete result for two arguments. This prevents a divergence in which unit-level operators work but the installed archive, public headers, or application link rule no longer compose correctly.

## test(buffer): 할당 실패와 복사 생략 비활성화 검증
Introduce deterministic allocation-failure injection by replacing the test executable's global allocation functions with counted `malloc`-backed implementations. Construction, copy construction, ordinary assignment, aliased self-assignment, addition, and compound addition are forced to fail at each observed allocation site. Every case verifies both state preservation and restoration of the live-allocation baseline.

A second unit build disables copy elision. This matters because returned `TextBuffer` values and copy-and-swap code must remain correct even when the compiler materializes all permitted temporaries. The combined checks establish the strong exception guarantee and absence of leaks from behavior that normal successful execution and optimized builds could conceal.

## feat(format): 다형적 formatter 인터페이스 정의
Define `Formatter` as an abstract, safely destructible polymorphic interface with three responsibilities: clone the dynamic object, transform a `TextBuffer`, and expose a stable formatter name. The virtual destructor makes deletion through the base pointer valid, while `clone()` supplies the virtual-copy operation needed when an owning container does not know the concrete type.

Concrete uppercase, prefix, and suffix formatters preserve value semantics by storing their own `TextBuffer` configuration and returning transformed values rather than mutating caller-owned input. Uppercasing converts each `char` to `unsigned char` before calling `std::toupper`, avoiding undefined behavior for negative plain-character values. The interface therefore combines runtime polymorphism with explicit ownership and copy boundaries suitable for C++98.

## test(format): 파생 formatter의 동적 호출 검증
Call each concrete formatter through a `Formatter` reference and verify both transformation and reported name. This confirms that the public contract is genuinely virtual: correct results cannot depend on a caller knowing the derived type or invoking derived members directly.

The selected inputs also distinguish responsibilities. Uppercasing changes alphabetic bytes while preserving punctuation and digits, whereas prefix and suffix formatters add configured values on the correct side. These checks form the behavioral base for later pipeline dispatch.

## feat(format): formatter 소유 pipeline 구현
Add `FormatPipeline` as a bounded owner of polymorphic formatter steps. `append()` checks the eight-step capacity before cloning the supplied formatter, stores the clone only after creation succeeds, and increments the size last. The pipeline therefore owns an independent dynamic object rather than borrowing a reference whose lifetime it cannot control.

Application folds a copied input through the stored steps in insertion order; an empty pipeline is naturally the identity. Destruction deletes exactly the successfully stored clones, and non-throwing `swap()` exchanges the complete fixed pointer array and its size. Copying remains disabled in this first version so that ownership cannot accidentally degrade to pointer aliasing before an explicit deep-copy implementation exists.

## feat(format): pipeline 실행 CLI 제공
Provide a public-API example that assembles prefix, uppercase, and suffix formatters into a pipeline and applies them to one argument. The resulting `[TEXT]` form makes execution order observable: changing the order would produce a different value for mixed-case input.

The executable owns only stack formatter prototypes; the pipeline receives them by reference and keeps clones. This demonstrates the intended ownership boundary—callers may destroy their prototypes independently after appending—without exposing raw pointers or clone management at the application layer.

## test(format): pipeline 적용 순서와 용량 경계 검증
Verify that a new pipeline is an identity transformation, appended steps are counted as owned clones, and dispatch follows insertion order. Filling all eight slots and attempting one more append must raise `std::length_error` while leaving the size at capacity.

That failure assertion is a state guarantee, not merely an error check. Capacity is rejected before cloning or modifying the pointer array, so a rejected append cannot leak a clone or create a partially visible ninth step.

## feat(format): pipeline 깊은 복사 구현
Give `FormatPipeline` deep-copy value semantics by cloning every dynamic step. The copy constructor starts from a fully null-initialized array, appends clones in order, and explicitly deletes the already constructed prefix if any later clone throws. This cleanup is necessary because a destructor is not invoked for an object whose constructor never completes.

Assignment uses copy-and-swap, so the target changes only after an entire candidate pipeline has been cloned successfully. The approach preserves dynamic formatter types, step order, and the strong exception guarantee, including self-assignment. It is more expensive than sharing pointers, but it keeps ownership local and prevents lifetime coupling between pipeline values.

## test(format): pipeline 복사와 자기 대입 검증
Confirm that copied pipelines own independent steps and retain the original dynamic behavior even after the source receives another formatter. Assignment must return the destination, reproduce the transformed result, and remain safe when source and destination are aliases of the same pipeline.

These checks distinguish deep polymorphic copying from a superficial pointer-array copy. A shallow implementation could initially produce the same output but would fail independence and eventually double-delete shared steps.

## test(format): 가상 소멸·추상 계약·CLI 검증
Broaden formatter verification from output alone to the object-model contract. A counted test formatter records live and destroyed instances so tests can observe clone ownership and deletion through `Formatter*`; compile-fail coverage confirms that the abstract base cannot be instantiated, and public-header compilation checks repeated inclusion and consumer-visible use.

The pipeline executable is also added to the integration transcript, proving that virtual dispatch, archive linkage, and step order survive the process boundary. Together these checks guard the three C++98 failure modes most relevant here: an accidentally concrete interface, a non-virtual destruction path, and ownership that appears correct functionally but leaks or destroys the wrong dynamic object.

## feat(factory): 문자열 명세로 formatter 생성
Introduce a factory boundary that translates textual configuration into formatter objects. Exact `upper`, `prefix=<payload>`, and `suffix=<payload>` forms map to concrete dynamic types; empty specifications and empty required payloads are classified as malformed, while syntactically complete but unsupported names raise a distinct `UnknownFormatter` error.

`FormatterCreator` is abstract so pipeline construction can depend on creation behavior rather than concrete classes, and its virtual destructor supports safe polymorphic use. The raw owning pointer returned by `create()` is an explicit C++98 ownership transfer: the receiving layer must either delete it or transfer its behavior into another owner. `PipelineBuilder` is declared as a non-instantiable operation object for performing that integration.

## test(factory): formatter 명세 분류 검증
Specify the factory grammar with successful and failing examples. The suite checks concrete names, prefix and suffix payload extraction, the behavior of the created formatter, and deletion through the returned base pointer.

Malformed input and unsupported formatter names are tested separately, including stable exception messages. Preserving this distinction lets callers report configuration errors accurately instead of treating every failure as an unknown feature.

## feat(factory): formatter 임시 소유와 pipeline 교체 구현
Implement pipeline construction from an array of textual specifications. A local RAII owner immediately assumes each raw pointer returned by the creator; `FormatPipeline::append()` clones the formatter, after which the temporary owner deletes the original. This prevents leaks on normal execution and on exceptions without making the pipeline share factory-created objects.

The builder validates null-array/count consistency and the pipeline capacity before work begins, and an empty specification list replaces the target with an empty pipeline. In this initial implementation the target is cleared before all formatters have been created, so a later creation or clone failure leaves a partially rebuilt target. The temporary ownership decision is sound, but the replacement operation at this point provides cleanup rather than the strong state-preservation guarantee added later.

## test(factory): builder 소유권 이전 검증
Verify that a sequence of specifications produces the expected ordered pipeline and that the result remains valid after each factory-created temporary has been destroyed. This demonstrates the two-stage ownership model: the creator owns a newly allocated formatter only until the builder's local guard deletes it, while the pipeline owns an independent clone.

The tests also cover replacement by an empty sequence and reject a null specification pointer paired with a nonzero count. These cases define both the valid empty operation and the invalid representation of a non-empty request.

## fix(factory): 교체 실패에도 기존 파이프라인 보존
Correct pipeline replacement by building the complete result in a local candidate rather than clearing and mutating the target incrementally. Each formatter creation and clone may allocate or throw; keeping those operations confined to the candidate means its destructor can clean partial work while the existing pipeline remains untouched.

Only after every specification succeeds does a non-throwing `swap()` commit the candidate. This changes `PipelineBuilder::replace()` from a basic cleanup guarantee to the strong exception guarantee and places the transaction boundary at the layer that owns the multi-step replacement operation.

## feat(factory): 명세 기반 파이프라인 CLI 제공
Expose configurable pipeline assembly as a command-line program. The first argument is the input text and the remaining bounded arguments are formatter specifications passed unchanged to `PipelineBuilder`; the finished pipeline is applied only after construction succeeds.

The CLI catches library exceptions, reports failure on standard error, and avoids successful output for an invalid configuration. It remains an adapter rather than a second parser, so the factory continues to own specification grammar and the builder continues to own transactional replacement.

## test(factory): 교체 실패 상태 보존과 CLI 검증
Add regression coverage for the strong replacement guarantee. An unknown formatter in the middle of a sequence and an invalid null/count combination must both leave a seeded target pipeline unchanged, proving that validation and later construction failures cannot expose a partial candidate.

Integration cases exercise successful ordered formatting and error paths through the real CLI, including the requirement that rejected specifications produce no standard output. The tests connect library-level state atomicity with process-level output atomicity.

## test(factory): 생성·복제·할당 실패 정리 검증
Sweep the factory and builder across every observed allocation and clone failure point. Custom creators and counted formatters distinguish failures while creating a formatter from failures while cloning it into the candidate pipeline. For each injected exception, the original target behavior must remain intact and every temporary or partial clone must be destroyed.

This is stronger evidence than one hand-picked `bad_alloc` case. It verifies the ownership protocol at every transition—creator to local guard, local formatter to pipeline clone, partial candidate to destructor, and candidate to target—and detects both leaks and premature mutation.

## feat(scalar): scalar 리터럴 문법과 종류 분류
Introduce an explicit scalar-literal parser that classifies character, integer, floating-point, and special values before any presentation logic runs. The grammar is implemented over ASCII bytes rather than locale-sensitive character classes, rejects surrounding whitespace and trailing material, recognizes signed decimal and exponent forms, and gives a lone non-digit character precedence as a character literal.

Parsing produces a normalized intermediate representation instead of immediately printing conversions. That separation lets later code ask what the source literal means and then independently determine whether each target type is representable. It also centralizes special-value and negative-zero recognition so four output projections cannot drift into four subtly different parsers.

## feat(scalar): locale 고정 수치 추출과 경계 보존
Harden finite numeric extraction by using the classic locale and by requiring a decimal point or exponent before accepting an `f` suffix. This prevents host locale settings from changing the decimal grammar and avoids interpreting an integer-looking token such as `42f` as a float when the declared syntax requires an explicitly floating form.

The parser distinguishes textual zero from a nonzero mantissa that underflows to zero, rejects overflow and silent nonzero underflow, and preserves the sign of a zero lexeme independently of ordinary comparison. Printable single characters remain character literals, while non-ASCII and malformed byte sequences are rejected. These checks preserve source meaning across the lossy boundary from text to machine floating-point.

## test(scalar): literal 문법과 수치 범위 검증
Build a boundary-oriented specification for scalar parsing. The suite covers character precedence, signed integers, decimal points, exponents, valid float suffixes, negative zero, infinities and NaNs, then rejects whitespace, embedded NUL or non-ASCII bytes, trailing garbage, malformed exponent forms, overflow, and nonzero values that collapse to zero.

Testing both lexical form and numerical representability prevents a common parser error in which a stream successfully consumes a prefix or returns a floating value even though the complete source token is outside the intended language.

## feat(scalar): 문자와 정수 투영 결과 출력
Add the public `ScalarConverter` boundary and the first two target projections. Parser-specific failures are translated to the stable `InvalidScalar` exception, so callers depend on the conversion contract rather than internal literal machinery.

Character conversion is limited to the project's ASCII domain: values outside 0–127 are impossible, printable values are quoted with explicit handling for quote and backslash, and control values are reported as non-displayable. Integer conversion checks the destination range before casting, avoiding implementation-defined narrowing. The converter therefore reports conversion feasibility explicitly instead of relying on whatever a cast happens to produce.

## feat(scalar): 부동소수점 표현과 원자 출력 구현
Complete float and double projections with deterministic classic-locale rendering. Finite values use precision derived from the target type, preserve negative zero, and receive a `.0` suffix when needed to keep the output visibly floating-point. NaN and infinity are rendered through canonical spellings, while a double that is outside the finite float range or would become a nonzero float underflow is reported as impossible rather than silently changed.

All four projection lines are first formatted into a temporary stream and emitted to the caller only after rendering succeeds. This isolates the result from the caller's locale, precision, and formatting flags and prevents parsing or formatting allocation failures from leaving a partial conversion report. A failing destination stream can still fail during the final write; staging specifically makes computation and formatting transactional.

## feat(scalar): type boundary CLI의 scalar mode 제공
Add the scalar mode of the type-boundary executable. Argument validation and process exit behavior remain in the application, while `ScalarConverter` owns parsing, representability, and canonical rendering.

The program writes no successful result until the library has completed the staged report, and an `InvalidScalar` is converted into a standard-error diagnostic and nonzero status. This keeps command-line concerns from leaking into the conversion API.

## test(scalar): 변환 가능성·출력·CLI 오류 검증
Verify the exact four-line scalar report across printable and control characters, escaped character forms, integer boundaries, finite float and double values, NaN, infinities, negative zero, and values representable in one target but not another. The tests also alter locale and stream formatting state to confirm that conversion remains canonical and does not mutate the caller's settings.

Public-header compilation and command-line fixtures extend the same contract outside the unit helper. Invalid literals must raise the public exception or return a failing process status without producing partial standard output. These checks protect both numerical correctness and output noninterference.

## feat(rtti): 다형 객체의 실행 시간 타입 식별
Introduce a closed runtime type hierarchy with a polymorphic `RuntimeBase`, concrete A/B/C values, a factory keyed by `RuntimeKind`, and stable textual names. The base constructor is protected and the destructor virtual, ensuring objects are created as meaningful derived values and may be released through the base interface.

Pointer identification uses `dynamic_cast` and maps null or unrecognized derived types to `runtime_unknown`. Reference identification exercises the throwing form of `dynamic_cast` but catches `std::bad_cast` internally and normalizes the same failure to `runtime_unknown`. The public enum therefore hides two different RTTI failure mechanisms behind one deterministic classification contract.

## test(rtti): pointer·reference 식별 경계 검증
Exercise A, B, and C through both pointer and reference identification, then cover null pointers and a derived type outside the recognized set. Factory creation is checked for every valid kind and for the unknown discriminator, including stable names and destruction through `RuntimeBase*`.

The suite distinguishes successful dynamic identification from object ownership: RTTI observes an existing polymorphic object, while the factory and virtual destructor establish who creates and releases it. This prevents identification logic from accidentally assuming that every `RuntimeBase` belongs to the closed factory set.

## feat(serialization): 빌린 객체 주소를 token으로 왕복
Add `Serializer` as a non-instantiable utility that maps a `Payload*` to `uintptr_t` and back with `reinterpret_cast`. Null is handled explicitly, and non-null round trips preserve pointer identity rather than copying the object or encoding its fields.

The token represents a borrowed address only. It neither owns the payload nor extends its lifetime, and it is meaningful only on the same compatible process and data model while the pointed object is alive. Using an integer type intended to hold pointer bits makes that low-level contract explicit; it does not turn the token into portable persistence.

## test(serialization): null과 주소 동일성 검증
Verify round-trip identity for stack and heap payloads, aliasing through the recovered pointer, distinction between separate objects, and the null mapping. The tests also retain a token after a scoped object has expired but deliberately do not dereference it, documenting the boundary between preserving bits and preserving object lifetime.

Checking token width and header usability makes the platform assumption observable. The critical invariant is that serialization transfers no ownership: the original owner still controls mutation and destruction, and the caller must never treat an expired token as a valid object reference.

## feat(casts): runtime type CLI mode 추가
Extend the type-boundary executable with a runtime mode that maps a textual A/B/C selector to `RuntimeKind`, creates the polymorphic object, identifies it through both pointer and reference paths, and releases it through the virtual base destructor.

Output is assembled only after the object has been classified and destroyed successfully. The CLI demonstrates the complete lifetime—selection, factory allocation, RTTI observation, and polymorphic deletion—while leaving the hierarchy and cast rules in the library.

## feat(casts): address token CLI mode 추가
Add an address mode that strictly parses an unsigned decimal identifier, constructs a stack `Payload`, serializes its address, deserializes it, and reports nonzero-token, identity, and field preservation checks. Decimal parsing is manual and overflow-aware, so it accepts only the intended byte grammar rather than a locale-dependent numeric prefix.

The mode keeps the payload alive for the entire round trip and never suggests that the token owns it. Its output makes the actual promise observable: within the object's lifetime, the recovered pointer is the same address and sees the same payload.

## test(casts): 타입·주소 변환의 공개 경계 검증
Turn several type-boundary rules into compile-time tests. Utility classes must not be constructible, runtime identification must not accept unrelated pointer types, and serialization must not silently discard `const` from a `Payload*`. These negative cases ensure that convenience overloads do not widen a deliberately narrow low-level API.

Command-line cases cover successful runtime and address modes, malformed and overflowing numeric input, and the absence of standard output on failure. Unit additions retain the lifetime and identity checks, so both the static type system and process behavior enforce the same ownership and conversion boundaries.

## feat(template): 임의 접근 container batch 추상화 추가
Introduce the header-only `RandomAccessBatch` template over a value type and a configurable sequence container, defaulting to `std::vector`. It exposes the container's iterator categories, checked indexed access, insertion, range iteration, sorting with `std::sort`, and range equality. The use of `std::sort` intentionally makes random-access iteration a real template requirement rather than a comment.

Copy assignment follows copy-and-swap, giving the batch the exception guarantee supplied by a complete container copy and non-throwing state exchange. Supporting both vector and deque demonstrates that the abstraction depends on capabilities, not on one concrete representation, while rejecting list-like containers keeps algorithmic requirements honest.

## test(template): iterator·정렬·복사 실패 계약 검증
Verify `RandomAccessBatch` with vector and deque storage, mutable and const iterators, standard algorithms, checked access, sorting, range equality, ordinary copying, assignment, and self-assignment. The tests make both behavioral results and generic interface shape observable.

A throwing value type then injects copy failures and counts live objects. Failed construction or assignment must not leak partially copied values, and assignment must preserve the destination until the candidate container is complete. This confirms that the template's value semantics remain valid for element types whose copy operation is not noexcept.

## feat(rpn): signed token과 stack 문법 처리
Establish the lexical and structural foundation of `RpnEvaluator`. Tokens are separated by explicit ASCII space rules, signed decimal operands are parsed manually, and magnitude accumulation is bounded so both `LONG_MAX` and the asymmetric `LONG_MIN` value can be represented without overflowing during parsing.

Evaluation owns a stack and requires the expression to leave exactly one result; malformed tokens and invalid stack shapes raise the evaluator's domain error. Keeping token recognition independent of locale and of stream prefix parsing ensures that later arithmetic operates only on complete, validated integer operands.

## feat(rpn): overflow 검사 산술 연산 구현
Implement the four RPN operators with checks performed before the signed operation. Addition and subtraction compare operands against the appropriate `LONG_MIN`/`LONG_MAX` margins; multiplication reasons about signs and unsigned magnitudes so it can handle the absolute-value asymmetry of `LONG_MIN`; division rejects zero and the singular `LONG_MIN / -1` overflow case.

Operands are popped in right-then-left order, preserving the non-commutative semantics of subtraction and division. Avoiding the overflowing expression itself is essential: detecting a bad result after signed overflow would already be undefined behavior. Arithmetic failure leaves no published result because the evaluator's stack is local to the call.

## test(rpn): 산술 경계와 잘못된 token 검증
Cover normal operator behavior, operand order, signed tokens, both `long` extremes, every overflow and underflow direction, division by zero, malformed numbers, unknown tokens, insufficient operands, extra operands, and spacing boundaries.

This suite verifies the evaluator as a complete language rather than as four arithmetic helpers. In particular, exact `LONG_MIN` parsing and multiplication/division edge cases protect the precondition checks that exist specifically to keep evaluation out of undefined signed-overflow behavior.

## feat(batch): 작업 결과 값 객체 정의
Add `JobResult` as the common value transported by the batch subsystem. It stores a job name and evaluated `long`, exposes only const accessors, and defines equality over both fields.

Keeping the result independent of parser, evaluator, and container types gives vector- and deque-backed batches a shared comparison unit. The default value also permits ordinary container operations without creating a second ownership or lifetime policy.

## feat(batch): 입력 문법과 원자 교체 구현
Introduce `BatchEngine::replace()` as a whole-input transaction. Each non-empty record is split into a name and RPN expression, trimmed with explicit ASCII rules, validated against the engine's identifier grammar, checked for duplicate names, evaluated, and appended to a local candidate result set. Empty input, malformed records, duplicate names, evaluator errors, and stream failures all reject the operation.

The engine swaps the candidate into `results_` only after the complete stream has been accepted. This keeps parsing, uniqueness, arithmetic, and allocation failures from exposing a prefix of the new batch and makes the existing engine state the rollback value without writing compensating code.

## feat(batch): 결과 정렬과 직렬화 제공
Define a canonical result order by numeric value and then by name, giving equal-valued jobs a deterministic tie breaker. Sorting occurs on a candidate before publication, so comparison or allocation failures cannot leave the engine with a partially reordered result set.

Serialization uses a classic-locale temporary stream and emits the completed bytes to the destination afterward. This isolates formatting from the caller's locale and flags and prevents failures during formatting from producing a partial record sequence. As with other staged output in the project, the final destination write cannot make an intrinsically failing stream atomic; the transaction covers result construction and rendering.

## feat(batch): batch engine CLI 제공
Add one executable with two explicit modes: evaluate a supplied RPN expression or read and process a batch stream. Both modes delegate grammar, arithmetic, sorting, and formatting to library objects; the application owns only argument validation, exception translation, and process status.

Batch output is requested only after `replace()` has completed, so malformed input cannot print a successfully parsed prefix. Errors are directed to standard error with a failing exit status, preserving standard output as a success-only channel.

## test(batch): 입력 검증·정렬·CLI 결과 검증
Specify the batch grammar and result contract through unit, compile, and process tests. Valid records, whitespace handling, duplicate and malformed names, invalid RPN expressions, empty input, value/name ordering, checked result access, and deterministic serialization are exercised directly.

CLI fixtures verify both RPN and batch modes, exact successful output, error status, and no standard output for rejected work. Stream-state checks confirm that the engine's classic-locale staging does not overwrite formatting choices owned by the caller.

## feat(batch): 두 container의 정렬 결과 대조
Evaluate each accepted job into both vector- and deque-backed `RandomAccessBatch` candidates, sort them independently with the same total ordering, and compare their ranges before committing the vector result. A disagreement raises `logic_error` and leaves the engine's prior state intact.

The duplicated computation is deliberate verification rather than an optimization: it exercises the generic abstraction against two random-access representations and detects representation-dependent ordering or copy behavior at the integration boundary. The trade-off is additional memory and sorting work in exchange for an internal consistency check.

## test(batch): 입력 순열과 출력 결정성 검증
Verify that insertion order and selected random-access container do not affect the canonical result. Multiple permutations of the same jobs must produce identical value/name ordering, vector and deque batches must agree, and repeated writes of one engine state must be byte-for-byte identical.

These tests distinguish determinism from mere sortedness. A comparator that omitted the name tie breaker could appear numerically sorted yet still emit equal-valued jobs in input- or implementation-dependent order.

## fix(batch): 입력 stream 종료 상태를 명확히 구분
Replace the usual `getline` loop condition with a record reader that distinguishes three outcomes: a complete line, a final unterminated line followed by clean EOF, and an actual input failure. The final record is accepted even without a trailing newline, while `badbit` or a non-EOF failure rejects the transaction.

This correction prevents two opposite errors—discarding valid last-line data and treating an I/O fault as ordinary end of input. Because `replace()` commits only after the reader reports a clean end, transport state becomes part of the same atomic input contract as syntax and arithmetic.

## test(batch): 입력·산술·할당 실패 뒤 상태 복원 검증
Exercise `BatchEngine::replace()` after seeding it with a known result, then force malformed input, RPN arithmetic failure, stream failure, and every observed allocation failure. Each rejected replacement must preserve both the prior result objects and their serialized bytes, and the allocation baseline must return to its original value.

The command-line failure cases add the external consequence of the same invariant: no partial success output may escape. This suite verifies rollback across all collaborating layers—record parsing, duplicate tracking, evaluator stacks, two candidate containers, sorting, comparison, and final publication.

## test(contracts): 공개 include와 소유권 규칙 검증
Expand compile-time contract coverage across the complete public library. Positive consumers include only installed headers and link the archive, while negative translation units verify abstract interfaces, protected or private construction, explicit conversion boundaries, const accessors, non-constructible utility classes, forbidden list-backed sorting, and ownership-sensitive pointer signatures.

These tests make API shape part of regression coverage. A change that still passes runtime tests but accidentally exposes mutation, permits an implicit conversion, removes abstraction, or depends on a private include now fails at the same boundary where an external C++98 consumer would encounter it.

## test(rtti): integer에서 runtime kind로의 암시 변환 거부
Add a negative compile case proving that an arbitrary integer cannot be passed where `RuntimeKind` is required. The factory's discriminator is a closed semantic type, not a numeric convenience parameter, so accidental values must be rejected by overload resolution before runtime.

The runtime test that forged an enum value is removed accordingly. A deliberate explicit cast can still manufacture an invalid enum outside the API's protection, but the public contract now focuses on preventing ordinary implicit misuse rather than promising to validate every type-system escape hatch.

## test(release): 정적 archive와 외부 dependency 검증
Add release-structure checks for the archive itself and for linked executables. Deterministic manifests record archive members and exported symbols, making accidental object omission, duplicate packaging, or public-symbol drift visible. Platform-specific binary inspection records external dynamic dependencies and rejects embedded runtime search paths.

This verification treats the deliverable as more than source that happens to compile. Consumers receive a static archive with a defined composition and executables with observable linkage assumptions; changes to either require an explicit review of the manifest rather than silently altering distribution behavior.

## test(release): 실행 결정성과 메모리 해제 검증
Run representative command-line programs repeatedly under fixed locale and time-zone settings and compare their complete outputs. This checks that the deterministic formatting promises made by scalar and batch code survive the built binaries and are not contaminated by ambient process settings.

Where the host provides the leak inspection tool, unit, no-elide, failure, and public-contract executables are also checked after termination. The platform gate keeps the portable suite usable while still adding concrete lifetime evidence on supported systems. Together the checks cover repeatable observation and release of owned memory at process scope.

## build(check): undefined behavior 검사 대상 추가
Add an UndefinedBehaviorSanitizer build that compiles the library implementation, tests, and support code under instrumentation and executes the resulting suite with failure-on-report settings. Instrumenting the actual implementation units is essential; sanitizing only an already-built archive or only the test harness would leave the code under examination unchecked.

This layer complements explicit boundary tests. Arithmetic and cast code is designed to avoid undefined behavior by construction, and the sanitizer provides dynamic evidence that exercised paths do not nevertheless trigger invalid operations, misaligned access, or related runtime violations.

## test(format): 복제 실패 뒤 부분 객체 정리 검증
Inject clone failure at every formatter position during pipeline copy construction and assignment. A failed constructor must destroy all clones created before the failure even though the incomplete pipeline's destructor will not run; a failed assignment must additionally leave the destination's prior steps and behavior unchanged.

Live-object counters verify that source pipelines remain intact and that neither partial clones nor replaced target objects leak. This directly tests the two distinct cleanup mechanisms in the implementation: the copy constructor's catch block and assignment's copy-and-swap transaction.

## fix(contact): 할당 실패에도 저장 상태 보존
Strengthen `ContactBook::add()` by preparing a detached replacement contact before touching the selected ring slot. Copying the incoming strings may allocate and throw, but any such failure now affects only the local temporary. Once the replacement is complete, a non-throwing `swap()` commits it into the slot.

The ring cursor and logical size advance only after that commit. This ordering preserves the coupled invariant between slot contents, `next_`, and `size_`: failure cannot replace part of a stored contact or move the logical oldest position without a corresponding successful insertion.

## test(contact): 연락처 교체 실패 회귀 검증
Fill a contact book to capacity, inject allocation failure at every observed point while replacing the oldest entry, and verify that size, logical order, field values, and live-allocation count remain unchanged. A final successful insertion confirms that the ring still advances normally after the failure sweep.

The test specifically targets the previously vulnerable full-capacity path, where mutating one physical slot and the logical cursor are a single conceptual transaction. It prevents later simplification from reintroducing direct throwing assignment into stored state.

## test(consumer): 저장소 밖 공개 library 연결 검증
Build a temporary consumer outside the repository tree using only the exported include directory and `libcpp_foundation.a`, then run it from that external location. The program exercises public objects rather than test-only helpers, so success proves that installed headers are self-contained and the archive supplies their required definitions.

This catches dependencies that in-tree tests can accidentally mask: private include paths, working-directory assumptions, unarchived objects, and implicit access to repository files. Cleanup traps keep the verification isolated even when compilation or execution fails.

## test(boundary): 변환·배치 속성과 대용량 경계 검증
Add deterministic property-style checks driven by a fixed linear-congruential seed. Thousands of generated integer literals must produce four stable scalar lines and reject a trailing invalid byte without output; thousands of bounded binary RPN expressions are compared with directly computed results across all four operators.

A 4,096-job batch larger than 200 KB is then parsed, evaluated, independently sorted by value and name, compared record by record, and serialized twice into identical output larger than 150 KB. The fixed seed and first-counterexample report provide broad state-space coverage without flaky randomness, while the large case exercises allocation growth, sorting, and deterministic output beyond hand-written fixtures.

## build(check): sanitizer와 portable 검사 계층 구성
Reorganize verification into explicit portability and platform layers. Clean rebuilds, tests, compiler contracts, archive checks, external-consumer checks, deterministic properties, and UndefinedBehaviorSanitizer form the portable baseline; AddressSanitizer and host-specific release inspection are separate platform checks; the aggregate target composes them without hiding their different prerequisites.

The build also verifies reconstruction, incremental no-op behavior, and deterministic artifacts. This structure prevents an unavailable host tool from weakening language-level validation while making the strongest supported checks easy to run as one contract.

## test(portability): 지원 LP64 데이터 모델 검증
Make the implementation's supported data model explicit by compiling assertions for eight-bit bytes, two-byte `short`, four-byte `int`, eight-byte `long`, eight-byte pointers, and eight-byte `size_t`. These assumptions are relevant to exact scalar boundaries, `long` RPN arithmetic, allocation sizes, and pointer-to-integer address tokens.

Failing early with a named LP64 check is preferable to allowing a different ABI to compile and then produce misleading serialization or range behavior. The test defines supported portability honestly: the code is checked across systems and compilers that satisfy the declared model, not claimed to be ABI-independent.

## ci: 지원 compiler와 platform matrix 검증
Automate the complete build contract across GCC and Clang on Linux and Clang on macOS. Each job performs the build-oriented verification stack with fail-fast disabled at the matrix level, so one platform or compiler failure does not suppress evidence from the others.

UndefinedBehaviorSanitizer runs throughout the supported matrix, while AddressSanitizer is limited to the host where the project enables it reliably. Minimal repository permissions and explicit time limits reduce CI's operational surface. The matrix converts the supported compiler, operating-system, sanitizer, and LP64 claims into continuously executed compatibility evidence.
