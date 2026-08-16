## feat(core): 리터럴과 퍼센트 출력 구현
Establish the public `ft_printf` variadic entry point, its static-library build, and the smallest useful format loop: ordinary bytes are copied to standard output and `%%` emits one percent sign.

Output accounting is centralized in a helper that rejects an `int` result overflow before adding the requested length and converts a null format or any write failure into `-1`. This gives later conversions a common public contract: the return value is the number of bytes successfully emitted only when the complete operation succeeds. At this stage, a short `write` is deliberately treated as failure rather than as progress to be resumed; the later output abstraction can strengthen that system-call boundary without changing the entry-point contract.

## feat(output): 출력 컨텍스트와 쓰기 API 추가
Introduce a private output context that owns the destination descriptor, accumulated byte count, and a sticky error state. `ft_printf_write` now resumes after positive short writes by advancing the buffer and reducing the remaining length, while `ft_printf_putchar` provides the one-byte operation needed by literal and conversion code.

Keeping these values in one context prevents individual formatters from maintaining independent counts or continuing after an earlier failure. The sticky error is therefore both an accounting invariant and a control-flow boundary: once output becomes invalid, every subsequent write reports failure. The count-overflow check is also concentrated here, although its original placement and cast are refined later when the implementation is tested against wider `ssize_t` results.

## refactor(core): 리터럴 출력을 컨텍스트 API로 이관
Route literal characters and escaped percent signs through the shared output context instead of retaining a second local write-and-count implementation in `ft_printf`.

This makes the entry point responsible only for traversing the format string, initializing and closing the variadic traversal, and translating the context's final state into the public return value. Descriptor handling, short-write progress, byte accounting, and sticky failure now have one implementation, so every later conversion can preserve the same output invariant rather than duplicating subtly different error behavior.

## feat(parser): 포맷 필드 모델과 해석기 추가
Represent each conversion field as a normalized `t_format` value containing a flag bit set, width, optional precision, and conversion specifier. The parser consumes those elements in grammar order and returns the next unread format position, separating textual syntax recognition from conversion rendering.

Flags are accumulated idempotently through bitwise OR, so repeated flags do not require special cases. Width and precision are parsed with a pre-multiplication overflow check against `INT_MAX`; an unrepresentable field fails parsing instead of wrapping into a smaller or negative layout value. Explicitly recording `has_precision` also distinguishes an omitted precision from `.0`, which later numeric and string formatting must treat differently.

## feat(core): 포맷 필드 해석을 출력 루프에 연결
Connect percent-led fields to the parser and advance the main loop by the parser's returned cursor rather than by fixed character increments. Parse failure is promoted into the output context's sticky error state, preserving the public `-1` failure contract.

This commit establishes the integration boundary between format traversal and conversion handling. The temporary rendering behavior still echoes a percent sign and an available specifier because dedicated conversion dispatch is not yet present, but the important structural decision is that the parser owns field consumption while the main loop owns overall sequencing and termination.

## fix(io): 파일 디스크립터 출력을 끝까지 재시도
Replace one-shot `write` calls with a shared completion loop. Positive short writes advance an offset and retry only the remaining suffix; `EINTR` retries without losing progress; request sizes are capped at `SSIZE_MAX`, the largest count whose successful result is representable by `ssize_t`.

A zero-byte result before completion is converted to `EIO` to avoid an infinite loop, while every other error stops immediately and preserves its `errno`. Composite outputs now propagate the internal success state: a failed string suppresses the following newline, and a failed sign or earlier digit suppresses the rest of the number. The public API remains `void`, but it no longer silently proceeds after a known partial failure.

## test(io): 부분 쓰기와 EINTR 이후 진행을 검증
Compile the descriptor-output implementation against a scripted `write` substitute so short writes, interruptions, zero progress, and permanent errors can be reproduced deterministically. The harness records descriptors, requested lengths, emitted bytes, and invalid requests rather than relying on nondeterministic pipe behavior.

The scenarios prove that retries begin at the first unwritten byte, `EINTR` does not advance the offset, zero progress becomes `EIO`, and permanent failures stop composite string, newline, and numeric output. Exercising `INT_MIN` also verifies that recursive digit emission preserves both order and early termination under an injected failure sequence.

## refactor(string): 결합 문자열의 할당 한계를 명시
Rewrite the `ft_strjoin` size guard in terms of `SIZE_MAX - right_length - 1`, making the reserved terminator byte explicit in the same arithmetic expression as the eventual allocation.

The accepted range is unchanged, but the new form directly mirrors the requirement `left_length + right_length + 1 <= SIZE_MAX`. Keeping the separate `right_length == SIZE_MAX` guard ensures the subtraction itself remains defined before the left operand is compared.

## feat(text): 문자·문자열·퍼센트 변환 추가
Add a conversion dispatcher that consumes variadic arguments according to the parsed specifier and delegates `c`, `s`, and `%` rendering to text-specific functions. The main loop no longer needs type-specific `va_arg` knowledge, which keeps argument extraction paired with the conversion that defines its promoted type.

String output maps a null pointer to the explicit `(null)` representation and writes the resulting byte range through the shared context. Character and percent output use the same counted write path. Unknown fields retain the prior literal fallback for now, making this commit an incremental conversion expansion rather than a final syntax-validation policy.

## build(flags): C99 경고와 builtin 정책을 고정
Make the project's language and diagnostic policy non-optional by overriding caller-supplied `CFLAGS` and `CPPFLAGS` with strict C99 warnings and the project include path. Disabling compiler built-ins ensures calls to libc-compatible names are compiled and linked as the library actually defines them, rather than being substituted with compiler-provided semantics.

The commit also exposes the required `bonus` target as an alias of the complete archive and keeps dependency generation on every build path. This turns compilation settings and target availability into reproducible project contracts instead of environment-dependent conventions.

## test(alloc): 할당 실패와 rollback을 검증
Introduce deterministic allocation-failure injection by rebuilding the implementation with `malloc` and `free` redirected to a tracking allocator. Single-allocation APIs are required to return `NULL` without leaving live storage when their allocation fails.

For `ft_split`, every allocation position—from the pointer array through each field—is failed in turn; the result must be `NULL`, all earlier allocations must be reclaimed, and no unowned pointer may be freed. `ft_lstmap` receives the same treatment for each node-allocation point, with destructor counts proving that the newly mapped content and all prior mapped nodes are released while the source list remains unchanged. This directly verifies rollback invariants that successful-path tests cannot establish.

## feat(decimal): 부호 있는·없는 10진수 출력 추가
Extend dispatch with signed `d`/`i` and unsigned `u` conversions, using one unsigned digit routine for both representations. Digits are generated least-significant first into bounded local storage and emitted in reverse order, avoiding dynamic allocation while preserving the output context's failure and count handling for every byte.

Signed formatting separates sign emission from magnitude formatting. The implementation first widens the `int` to `long` before negation so the ordinary negative range, including `INT_MIN` on platforms where `long` is wider, can be represented without negating in `int`. This is a simple initial magnitude strategy; later portability hardening removes the dependency on the relative widths of `int` and `long`.

## feat(hex): 16진수와 포인터 출력 추가
Add lowercase and uppercase hexadecimal conversions plus pointer rendering, with dispatch extracting each argument using the type required by its specifier. A shared base-16 routine selects the digit alphabet, generates digits into fixed local storage, and emits them through the common output context.

Pointers are converted through `uintptr_t` before numeric formatting and receive an explicit `0x` prefix. Treating the prefix separately from the address digits establishes a representation that can later participate in width and padding calculations without confusing prefix bytes with the value's base-16 magnitude.

## test(release): archive와 consumer 경계를 검증
Add a release check for the static library as a delivered artifact rather than only as code compiled into the repository's tests. The script compares archive members and globally defined API symbols with explicit manifests, then rejects undeclared external dependencies except the small allowed runtime set and platform-specific `errno` accessor.

A smoke consumer is copied to a temporary directory, compiled only against `libft.h` and the archive, and executed. This catches missing objects, accidental symbol exports, hidden repository-relative dependencies, and headers or archives that work internally but cannot be consumed through the documented public boundary on Darwin and Linux.

## test(sanitize): undefined behavior 검사를 추가
Build both the library objects and ordinary functional tests under UndefinedBehaviorSanitizer in a separate object tree. Recompiling the implementation is essential: instrumenting only the test executable would not observe undefined operations inside archive code.

The runner halts on the first report and retains frame pointers for useful diagnostics. Connecting `sanitize` to this target makes signed overflow, invalid shifts, alignment violations, and related language-level faults a reproducible verification path alongside value-based tests.

## feat(text): 문자·문자열·퍼센트 너비와 정렬 적용
Apply field width to character, string, and percent conversions and add a reusable repeated-character output operation. Each formatter computes the missing width after accounting for its rendered content, emits leading spaces by default, and moves those spaces after the value when the left-alignment flag is present.

The layout rule is expressed around the conversion's actual byte length rather than by modifying the source data. Negative padding naturally becomes a no-op, so content wider than the field is never truncated merely to satisfy width. Every padding byte still passes through the shared output context; a later performance change can batch this repeated output without changing the layout contract.

## feat(decimal): 10진수 너비와 정렬 적용
Refactor decimal conversion into two phases: first materialize the magnitude's digits and determine their length, then render padding, sign prefix, and digits in field order. Signed and unsigned conversions now share the same layout function, with the minus sign represented as an explicit prefix rather than emitted as an unrelated preliminary write.

Precomputing prefix and digit lengths makes width arithmetic deterministic before output starts. Right alignment places spaces before the complete signed representation, while left alignment places them after it, preserving the invariant that a sign remains adjacent to its digits. This structure also creates the insertion point later needed for precision zeroes and other sign flags.

## feat(hex): 16진수와 포인터 너비와 정렬 적용
Rework hexadecimal rendering to materialize digits before writing, then apply one layout path to ordinary hexadecimal values and prefixed pointers. The formatter calculates width from the combined prefix and digit lengths, emits leading or trailing spaces according to left alignment, and keeps `0x` attached to the address digits.

Separating digit generation from field placement avoids duplicating width logic across `x`, `X`, and `p`. Uppercase remains a property of the selected digit alphabet, while pointer identity remains a property of the prefix and converted address value; those concerns can therefore evolve independently from padding behavior.

## feat(text): 문자열 정밀도와 퍼센트 0 채움 적용
Make string precision limit the number of bytes emitted and let percent conversion select zero padding when `0` is active without left alignment. Width is calculated from the post-precision string length, so padding reflects the bytes that will actually be written rather than the source string's full logical value.

This establishes the distinction between width and precision for text: precision truncates content, while width only supplies surrounding padding. The implementation still obtains the full string length before applying the limit, which is sufficient for ordinary NUL-terminated inputs but does not yet make precision a bound on memory reads; a later correction moves that boundary into length discovery itself.

## feat(numeric): 숫자 정밀도와 0 채움 적용
Extend decimal and hexadecimal layout with separate counts for prefix bytes, precision zeroes, field padding, and value digits. An explicitly specified precision suppresses the field-level `0` flag, while a zero value with precision zero contributes no digits. Otherwise, precision adds leading zeroes until the requested minimum digit count is reached.

The resulting order is deliberate: leading spaces, sign or base prefix, field zero padding when permitted, precision zeroes, digits, and optional trailing spaces. Keeping each component independent prevents zero padding from appearing before a sign or `0x` prefix and makes width account for every emitted byte. The same rules are applied through the existing shared layout paths rather than being reimplemented for each numeric specifier.

## feat(flags): 숫자 플래그 우선순위 정규화
Normalize conflicting flags once after parsing and add the prefixes implied by signed and hexadecimal conversions. Left alignment clears zero padding, and an explicit plus sign clears the weaker leading-space sign request. Formatters can therefore consume a canonical flag set instead of repeatedly resolving the same precedence rules.

Positive signed values select `+`, a space, or no prefix in that order; negative values retain `-`. Alternate-form hexadecimal adds `0x` or `0X` only for nonzero values, avoiding a redundant prefix for zero. Because prefixes already participate in the shared width and precision layout, these semantic flags integrate without changing the placement machinery.

## test(sanitize): address sanitizer 검사를 추가
Add a separately instrumented AddressSanitizer build of the library and functional suite. Isolated objects prevent sanitizer and normal artifacts from being mixed, while frame pointers keep memory-error reports attributable to the relevant call path.

The default run detects out-of-bounds access, use-after-free, and related address errors but explicitly disables ASan leak detection; leak ownership remains the responsibility of the dedicated host leak target. Keeping ASan separate from the aggregate `sanitize` alias also makes the supported verification scope explicit rather than implying both sanitizers run together.

## test(leak): host 누수 검사 경로를 추가
Add a host-adaptive leak check over the ordinary test binary. The target uses macOS `leaks` when available or Valgrind with all leak kinds promoted to a failing exit status, so ownership defects become build failures rather than advisory output.

Failing when neither checker exists avoids reporting an unperformed check as success. This path complements ASan's address-safety configuration, whose default deliberately disables leak detection, and exercises the same successful ownership flows used by the functional suite.

## test(printf): 기본 변환과 포맷 경계 검증
Add an end-to-end harness that redirects standard output through a pipe and checks three properties together: the exact emitted byte sequence, the number of captured bytes, and the function's return value. Comparing supported cases with `snprintf` provides an independent behavioral oracle, while explicit expected-output cases cover project-defined null string and pointer representations.

The suite spans literal and escaped output, embedded NUL characters, integer extrema, unsigned and hexadecimal ranges, pointers, width, alignment, precision, zero padding, alternate form, sign precedence, and mixed flags. It also verifies that width or precision values exceeding `INT_MAX` are rejected with `-1` and no output for the tested field. This locks down both visible formatting and the less obvious byte-count and parser-boundary contracts.

## test(build): Clang과 GCC 호환성을 검증
Verify the project under both a genuine Clang implementation and GNU GCC rather than trusting the generic `cc` name. The script identifies compiler families from their version output, copies the project into isolated temporary workspaces, and fails when either family is unavailable.

Each compiler performs a clean archive build, functional tests, allocation- and write-failure tests, and the archive/consumer boundary check. Isolation prevents artifacts or dependency files produced by one compiler from satisfying the other's build, exposing nonportable diagnostics, extensions, link assumptions, and stale-build masking.

## fix(output): 쓰기 결과를 집계하기 전에 범위 검증
Validate the `ssize_t` result from `write` before converting it to `int` for return-count arithmetic. The previous expression cast `written` first, so a successful result greater than `INT_MAX` could become implementation-defined or negative before the overflow guard evaluated it.

The corrected order preserves the counting invariant: every value added to `ctx->count` is individually representable as `int`, and the sum is checked separately against `INT_MAX`. On violation, the context enters its sticky error state and the public call returns `-1` rather than exposing a wrapped or otherwise invalid byte count.

## test(output): 표준 출력 실패 전파 검증
Exercise the real system-call failure path by temporarily closing standard output, invoking `ft_printf`, restoring the descriptor, and requiring a `-1` result.

This test verifies the public consequence of the output context's sticky error state rather than only checking successful formatting. It protects against implementations that ignore `write` errors, return a partial positive count, or continue as though output succeeded. Restoring standard output within the test also isolates the failure scenario from the remainder of the process.

## test(numeric): 접두사와 정밀도 배치 회귀 검증
Add focused regression cases for interactions among signs, alternate-form prefixes, field zero padding, precision zeroes, left alignment, and the special zero-with-zero-precision rule.

These combinations protect ordering properties that simple single-flag tests cannot establish: signs and `0x`/`0X` must precede zero padding; an explicit precision must disable field-level zero padding; alternate form must not survive when a zero hexadecimal value renders no digits; and trailing spaces must remain outside the complete prefixed value. The cases compare against `snprintf`, fixing the intended composition of independently implemented flags.

## test(release): 전체 검증 절차를 연결
Add a single release gate that composes whitespace validation, a clean rebuild, normal and injected-failure tests, sanitizer runs, archive/API consumer checks, cross-compiler builds, and host leak detection. Running these checks from a freshly cleaned state prevents stale artifacts from masking dependency or linkage problems, while the final `make -q all` asserts that verification itself leaves the declared build graph up to date.

The target does not replace the specialized checks; it sequences them so each defect class retains its own diagnostics while the complete release contract can be exercised reproducibly through one entry point.

## refactor(output): 숫자 출력 배치 로직 통합
Extract the shared decimal and hexadecimal placement algorithm into `ft_printf_write_numeric_layout`. Conversion-specific code now supplies only a prefix, a prepared digit sequence, its length, and whether the value is zero; the helper owns zero-suppression, precision expansion, field padding, ordering, and error propagation.

This is a responsibility-boundary refactor rather than a formatting change. Decimal and hexadecimal conversions previously carried parallel copies of the same nontrivial rules, making a correction likely to diverge between them. Centralizing the layout preserves the verified behavior while giving later fixes and optimizations one place to maintain the prefix–padding–precision invariant.

## fix(output): 중단된 쓰기 재시도와 요청 크기 제한
Harden the system-call loop to distinguish an interrupted write from a permanent failure and to keep every request within the range representable by `ssize_t`. Requests larger than `SSIZE_MAX` are split, positive short writes advance the buffer as before, and `EINTR` retries without changing the count or remaining range.

A compile-time write seam is introduced for deterministic fault tests while production builds still call the real `write`. The output invariant becomes explicit: only positive returned byte counts constitute progress; interruption is transparent; zero or any non-`EINTR` error makes the context permanently failed. Limiting the request also prevents passing a size for which the system call's signed result type cannot report full success.

## perf(output): 반복 채움을 묶어서 출력
Replace one-system-call-per-padding-byte behavior with bounded 64-byte chunks prepared on the stack. Repeated spaces or zeroes now flow through `ft_printf_write` in blocks, preserving short-write recovery, count checks, and sticky failure semantics while sharply reducing call overhead for wide fields or large precisions.

The fixed-size buffer keeps memory usage constant and avoids dynamic allocation. Chunking rather than constructing the entire padding span also bounds stack use independently of user-supplied width, so performance improves without weakening the parser's size limits or the output layer's error contract.

## test(output): 쓰기 실패 시퀀스와 채움 전략 검증
Add a deterministic write substitute that can script full writes, short writes, `EINTR`, `EPIPE`, and zero-byte returns while recording calls and emitted bytes. This makes system-call sequencing observable: tests verify that short writes resume at the correct offset, interrupted calls retry without losing data, permanent failures return `-1`, partial bytes remain exactly those written before failure, and a zero result cannot cause an infinite loop.

The suite also fixes the repeated-padding strategy by checking the call count and 64-byte maximum chunk for a width of 1000. A real broken-pipe test separately confirms that the library reports `EPIPE` through its return value but does not replace the process's `SIGPIPE` handler. Together these tests protect both internal retry mechanics and the boundary that signal policy remains owned by the caller.

## fix(text): 문자열 정밀도 범위까지만 읽기
Move the string precision condition into length discovery so `%s` never reads beyond the maximum number of bytes it is permitted to render. The previous implementation scanned to the terminating NUL first and only then truncated the computed length, which made precision an output limit but not a memory-access limit.

The bounded scan stops at either NUL or the requested precision, and that same length drives width calculation and output. This restores the relevant safety contract for precision-limited strings: bytes outside the visible range are not required to be readable merely so the formatter can decide not to print them.

## test(text): NUL 없는 제한 문자열 회귀 검증
Add a precision-limited string case whose three-byte source array contains no terminating NUL. The expected result is produced through `snprintf`, and the project implementation must emit exactly those three bytes.

This test makes the safety requirement observable rather than relying on ordinary C strings that would also pass an unbounded scan. Any regression that searches past the precision boundary now risks a detectable out-of-bounds read under memory instrumentation and no longer satisfies the functional comparison.

## fix(decimal): INT_MIN 크기를 unsigned 범위에서 계산
Compute a negative signed value's magnitude without ever forming the unrepresentable positive counterpart in the signed type. Instead of directly negating `value`, the formatter negates `value + 1`, converts that representable result to `unsigned long`, and then adds the final unit in the unsigned domain.

This preserves correct `INT_MIN` output even on data models where `long` is not wider than `int`. The change removes an implicit platform assumption from a core numeric boundary while leaving sign selection and shared decimal layout unchanged.

## fix(format): 지원 문법과 전체 출력 크기 선검증
Add a complete measurement pass before any output. It parses the entire format, rejects unsupported or incomplete conversion syntax, consumes a copied `va_list` using the same promoted argument types as rendering, computes each conversion's formatted length, and rejects any component or total that cannot be represented by the public `int` return type.

`va_copy` keeps validation from advancing the argument sequence used by the real output pass. Measuring strings with the same precision bound and reproducing numeric prefix, zero-suppression, precision, and width rules makes the preflight result correspond to the renderer's byte model.

The central contract change is atomic validation: malformed syntax or an unrepresentable total now returns `-1` before even valid literal text or earlier conversions are written. This costs a second traversal and requires measurement logic to remain synchronized with rendering, but it prevents partial output caused by errors that are discoverable from the format and arguments in advance. Runtime `write` failures remain inherently non-atomic and are still handled by the output context.

## test(format): 잘못된 포맷의 무출력 실패 검증
Lock down the preflight contract with invalid fields placed after literal text and after a valid argument-consuming conversion. Unsupported specifiers, a trailing percent sign, width or precision values beyond `INT_MAX`, and combinations whose complete formatted length would exceed `INT_MAX` must all return `-1` while emitting zero bytes.

Placing the fault late in each format is essential: it distinguishes whole-format validation from a renderer that discovers errors only as it reaches them. The tests also cover overflow contributed by literals, suffixes, signs, alternate-form prefixes, and precision, ensuring that total-length validation counts every output component rather than checking field numbers in isolation.

## test(printf): 숫자와 문자열 포맷 조합 확대
Expand differential testing into format-by-value matrices for signed decimal, unsigned decimal, and hexadecimal output. The selected values include zero, sign transitions, ordinary multi-digit values, and integer extrema; the formats combine alignment, sign flags, field zero padding, precision, alternate form, and mixed width–precision layouts.

Text coverage is similarly extended across characters, empty and nonempty strings, truncation, alignment, embedded NUL output, and a mixed multi-conversion format. Iterating the cross-product against `snprintf` is more effective than isolated examples here because it detects interactions that preserve each individual feature but break when prefixes, zero suppression, or padding lengths are composed.

## test(printf): 공개 계약 경계 사례 확대
Define the remaining public boundary behavior with a mixture of differential matrices and fixed project-specific expectations. Dense cases around precision zero, values near a digit-count transition, signs, alternate prefixes, and widths just below or above content length verify the exact point at which digits disappear, zeroes are introduced, or spaces move to the trailing side.

Fixed expectations cover behavior that is not safely or portably delegated to the host `printf`: a null format fails without output; an empty format succeeds with zero bytes; null strings use `(null)` subject to width and precision; null pointers retain the `0x` prefix even when precision suppresses all digits; and percent accepts the project's width, alignment, zero-padding, and precision syntax. This separates compatibility checks from deliberate project contracts instead of treating every supported extension as ISO `printf` behavior.

## test(release): 아카이브와 외부 소비자 검증
Add a release-level check for the static library as a distributable artifact rather than only as code linked by the repository's own tests. The script verifies the exact archive member list, the complete set of defined global symbols, and the unresolved runtime dependencies after normalizing Darwin and Linux symbol naming.

The dependency allowlist restricts the archive to `write`, the platform errno accessor, and compiler-introduced stack-protector symbols where applicable. A consumer is then built in an isolated temporary directory using only the copied public header and archive; its output and return behavior confirm that the packaged interface links and runs outside the source tree. Temporary-state cleanup is itself checked, keeping the release test reproducible and non-polluting.

## build(sanitize): UBSan과 Linux ASan 검증 추가
Add instrumented build paths that compile the implementation together with both the functional suite and deterministic output-fault suite. UBSan runs as the portable default sanitizer target with immediate failure on detected undefined behavior, while a combined AddressSanitizer/UBSan build is executed in a pinned Linux GCC container to make the address-checking environment reproducible.

Separate object-free test binaries ensure the actual library sources, including the test write seam, are instrumented rather than merely linking an uninstrumented archive. The aggregate `check` target combines behavioral tests, release-boundary validation, undefined-behavior detection, and whitespace checks. ASan remains explicit through `sanitize-linux`, so the default check does not imply address or leak coverage that it does not perform.
