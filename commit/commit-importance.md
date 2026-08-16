# Project Importance Profile

Project: Format Printer (`ft_printf`)  
Domain: C variadic formatted-output static library  
Primary Purpose: Parse a deliberate `printf` subset, format `%c`, `%s`, `%p`, `%d`, `%i`, `%u`, `%x`, `%X`, and `%`, apply flags, width, and precision, write to file descriptor 1, and return an exact `int` byte count or `-1` under the project's failure contract.  
Resolved Commit Scope: The complete independent linear ancestry of `c/ft_printf`, from root `0ec80a6a8196` through tip `a35faa85cf41`, comprising 33 commits. The history contains no inherited unrelated ancestors and no merge commits. Commits are classified oldest to newest, and 12-character abbreviated SHAs are unique within the scope.

## Core Technical Areas

- Format-field grammar for flags, decimal width, optional precision, and supported conversion specifiers.
- Variadic argument traversal, exact promoted types, and independent `va_list` copies.
- Conversion dispatch and responsibility separation between parsing, argument extraction, rendering, layout, and output.
- Text, signed decimal, unsigned decimal, hexadecimal, pointer, and percent semantics.
- Prefix, precision-zero, zero suppression, field padding, left alignment, and flag-precedence interactions.
- POSIX `write` progress, `EINTR`, request-size limits, byte-count overflow, zero progress, `EPIPE`, and `SIGPIPE` policy.
- Whole-format preflight measurement that rejects malformed or unrepresentable output before any external effect.
- Differential, fixed-contract, fault-injection, release-artifact, and sanitizer verification.

## Core Architecture

- `ft_printf` is the only public function; all parser, measurement, dispatch, layout, and output helpers remain private to the archive.
- `t_printf` owns descriptor state, accumulated count, and a sticky error. Every conversion uses the same output path.
- `t_format` is the normalized field representation passed from the parser to measurement and rendering.
- Dispatch owns `va_arg` type selection, while conversion-specific modules generate text or digits and the shared numeric layout module owns prefix/zero/padding order.
- The final entry point performs two traversals: a `va_copy` measurement pass validates grammar and total length, then the original `va_list` drives output using the same format semantics.
- Release verification treats the nine-object archive, global definitions, external runtime dependencies, public header, and out-of-tree consumer as part of the product contract.

## Critical Invariants

- Unsupported specifiers, unterminated fields, field-number overflow, or a total result exceeding `INT_MAX` return `-1` without producing output.
- Every started or copied `va_list` is traversed independently and ended exactly once; measurement and output consume arguments using compatible promoted types.
- Measurement and rendering must agree on every conversion's effective length, including prefixes, zero suppression, precision zeros, and field width.
- The accumulated count never narrows or overflows beyond `INT_MAX`.
- Positive short writes advance the buffer, `EINTR` is retried, requests do not exceed `SSIZE_MAX`, and non-retryable or zero-byte results stop output with an error.
- Numeric output orders spaces, prefixes, field zeros, precision zeros, digits, and trailing spaces consistently across decimal, hexadecimal, and pointer conversions.
- `%s` reads no further than the precision limit when one is present; a NUL terminator beyond that readable range is not required.
- The library does not alter the process's `SIGPIPE` disposition and cannot roll back bytes already accepted by the operating system.
- The built archive exposes the expected definitions and external dependencies and links for a consumer that sees only the public header.

## Major Engineering Difficulties

- Keeping a normalized field grammar and its overflow behavior consistent across the main loop, measurement, and all renderers.
- Consuming a variadic argument sequence twice without sharing mutable traversal state or using incompatible `va_arg` types.
- Correctly composing prefix selection, zero precision, alternate form, zero padding, width, and left alignment.
- Precomputing total output length and rejecting late format errors before any write while acknowledging that device failure remains non-atomic.
- Handling partial writes, interruptions, zero progress, `EPIPE`, and `SIGPIPE` without taking ownership of process-wide signal policy.
- Preventing `%s` precision from becoming only an output truncation rule when it must also bound memory access.
- Testing system-call sequences deterministically and distinguishing portable libc behavior from explicit project extensions such as formatted percent fields.

## Practical Engineering Areas

- Differential byte-for-byte and return-count comparison with `snprintf` where libc behavior is a valid oracle.
- Fixed expectations for deliberate project contracts that are not portable libc requirements.
- Deterministic write substitution for partial, interrupted, zero-progress, and permanent-failure sequences.
- Boundary matrices for signed endpoints, zero precision, alternate prefixes, null pointers, null strings, and conflicting flags.
- Release checks for archive layout, symbols, dependencies, and external consumers.
- UBSan and Linux GCC AddressSanitizer paths that exercise both normal and injected-failure binaries.

## S-level Criteria

- Establishes a foundational parser or output-state abstraction used by every later conversion.
- Establishes the project-wide POSIX output progress and interruption policy.
- Changes the entry point to a two-pass variadic architecture that guarantees format and length errors have no output side effect.
- Makes a core architectural decision without which the final grammar, byte-accounting, or failure model cannot be explained.

## A-level Criteria

- Resolves a significant interaction among flags, prefix, precision, width, count range, bounded string access, or signed endpoints.
- Creates a meaningful responsibility boundary such as dispatch or shared numeric layout.
- Adds deterministic evidence for the output state machine, no-output preflight guarantee, public contract, or release artifact.
- Provides a meaningful and evidenced performance improvement in the output path.

## Typical B-level Work

- Adds a normal conversion or applies established width, alignment, or precision behavior to another renderer.
- Integrates an existing abstraction into the main loop.
- Adds ordinary differential or focused regression coverage for an already established mechanism.
- Adds standard sanitizer infrastructure or localized supporting refactoring.

## Typical C-level Work

- Documentation-only commits.
- Minor maintenance with negligible influence on grammar, rendering, output, failure handling, or release behavior.
- Work that contributes context but no executable or verification mechanism.

## Project-specific Tags

PARSER — Format grammar, field representation, normalization, and parse-time limits.  
FORMAT — Public conversion semantics and generated text or digits.  
VARARGS — `va_list` ownership, promoted types, copying, and traversal.  
OUTPUT — POSIX write behavior, sticky error state, byte accounting, and signal interaction.  
ATOMIC — Rejection of format and total-length errors before any output side effect.  
LAYOUT — Prefix, precision, zero, width, alignment, and padding placement.  
RELEASE — Archive composition, global symbols, dependencies, public header, and external consumer linkage.  
VERIFY — Differential, fault-injection, sanitizer, and artifact-level evidence.

# Commit Classification

| Commit | Subject | Importance | Tags | Summary | Why |
| --- | --- | --- | --- | --- | --- |
| `0ec80a6a8196` | `docs(readme): 프로젝트 목표와 초기 개발 규약 정의` | C | - | Records the intended formatter scope and initial development rules. | Documentation-only root context contains no implemented parser, formatter, or output invariant. |
| `1d6a5cee3041` | `feat(core): 리터럴과 퍼센트 출력 구현` | B | CORE, OUTPUT | Creates the public entry point, archive, literal loop, percent escape, and initial counting. | This is necessary project bootstrap, but its one-byte writes and short-write rejection are an initial implementation later replaced by the defining output architecture. |
| `3f7b0ab926d0` | `feat(output): 출력 컨텍스트와 쓰기 API 추가` | S | ARCH, OUTPUT, CORE | Introduces a shared output context with descriptor, count, sticky error, and short-write progress. | This abstraction determines how every later formatter accounts for bytes and propagates failure. Removing it would leave a fundamental gap in the project's responsibility boundaries and output correctness story. |
| `78e5d25d7df6` | `refactor(core): 리터럴 출력을 컨텍스트 API로 이관` | B | OUTPUT, REFACTOR | Migrates literal and percent output to the shared context. | The migration removes duplicate accounting and is required integration work, but the decisive architecture was established by the preceding context commit. |
| `7984ddf2dd57` | `feat(parser): 포맷 필드 모델과 해석기 추가` | S | ARCH, PARSER, CORE | Defines t_format and parses flags, width, precision, and specifiers with decimal overflow checks. | The parser creates the durable representation through which all conversions and both later passes communicate. It is indispensable to explaining the formatter's grammar and field-processing architecture. |
| `9e6d785628f3` | `feat(core): 포맷 필드 해석을 출력 루프에 연결` | B | PARSER, INTEGRATION | Connects parsed fields to the main traversal with temporary fallback output. | This is normal integration of the parser into the loop; actual conversion responsibility and final invalid-format policy are established later. |
| `03c3e6e09fa1` | `feat(text): 문자·문자열·퍼센트 변환 추가` | A | ARCH, FORMAT, VARARGS | Introduces conversion dispatch and concrete c, s, and percent renderers. | Separating va_arg selection from rendering becomes the integration boundary used by every later conversion. It is significant architecture, though subordinate to the parser and two-pass core. |
| `95d6613a1c72` | `feat(decimal): 부호 있는·없는 10진수 출력 추가` | B | FORMAT, VARARGS | Adds d, i, and u dispatch and decimal digit emission. | This is normal core-feature implementation within the established dispatch and output model. |
| `93c883070a1b` | `feat(hex): 16진수와 포인터 출력 추가` | B | FORMAT, VARARGS | Adds x, X, and p formatting with uintptr_t conversion. | The feature completes the base conversion set but follows existing dispatch and output boundaries. |
| `a0fcf2ba3704` | `feat(text): 문자·문자열·퍼센트 너비와 정렬 적용` | B | FORMAT, LAYOUT | Adds space padding and left alignment for text conversions. | This is ordinary formatting behavior applied within the established renderer structure. |
| `ac27a26affaa` | `feat(decimal): 10진수 너비와 정렬 적용` | B | FORMAT, LAYOUT | Builds decimal digit buffers and applies prefix-aware width and alignment. | The commit is necessary layout implementation but still local to decimal rendering and later consolidated. |
| `c5ef742b84de` | `feat(hex): 16진수와 포인터 너비와 정렬 적용` | B | FORMAT, LAYOUT | Applies width and alignment to hexadecimal and pointer output. | This repeats the established layout model for another conversion family and is normal supporting work. |
| `8e1cee3ed7f0` | `feat(text): 문자열 정밀도와 퍼센트 0 채움 적용` | B | FORMAT, EDGE | Adds string truncation and zero padding for the project's percent extension. | The semantics matter, but the initial string implementation still scans to NUL before truncating and is corrected later; this is an intermediate feature step. |
| `1fa064ca9d79` | `feat(numeric): 숫자 정밀도와 0 채움 적용` | A | FORMAT, LAYOUT, RISK | Adds zero suppression, precision zeros, and zero-padding order for decimal and hexadecimal output. | The interaction among prefix, precision, field width, left alignment, and the zero flag is one of the formatter's hardest local correctness problems. It is significant, though the duplicated implementation is later centralized. |
| `c5f627099ad9` | `feat(flags): 숫자 플래그 우선순위 정규화` | A | PARSER, FORMAT, LAYOUT | Normalizes conflicting flags and adds signed and alternate-form prefixes. | Resolving '-' over '0' and '+' over space at the parser boundary simplifies every renderer, while nonzero-only hexadecimal prefixes fix public semantics. This is significant cross-conversion judgment. |
| `1b8049e411bb` | `test(printf): 기본 변환과 포맷 경계 검증` | A | FORMAT, TEST, VERIFY | Creates stdout capture, libc differential checks, fixed expectations, and parser-overflow tests. | The harness materially changes confidence in all core conversions and return counts and becomes the basis for later regression matrices. It is significant verification rather than a defining runtime mechanism. |
| `c627bd1f85bb` | `fix(output): 쓰기 결과를 집계하기 전에 범위 검증` | A | OUTPUT, RISK, DEBUG | Rejects a write result wider than int before narrowing and adding it. | The small fix restores the public count invariant at the exact conversion boundary and avoids implementation-defined narrowing. Its impact is significant despite the one-line diff. |
| `ba0fe19d9411` | `test(output): 표준 출력 실패 전파 검증` | B | OUTPUT, TEST | Closes stdout and checks that ft_printf returns -1. | This confirms the ordinary hard-error path but does not yet exercise partial progress, interruption, zero writes, or signal policy. |
| `f276ee73087c` | `test(numeric): 접두사와 정밀도 배치 회귀 검증` | B | FORMAT, TEST, EDGE | Adds focused prefix, precision, zero, and alignment regression cases. | The cases protect tricky established layout semantics but do not introduce the shared layout mechanism. |
| `177c8d03b353` | `refactor(output): 숫자 출력 배치 로직 통합` | A | ARCH, LAYOUT, REFACTOR | Extracts one numeric layout writer shared by decimal, hexadecimal, and pointer conversions. | Centralizing prefix, precision-zero, field-padding, and digit ordering removes duplicated correctness logic and creates one responsibility boundary later mirrored by measurement. This is a significant structural improvement, though not independently project-defining. |
| `8a3ec50cb689` | `fix(output): 중단된 쓰기 재시도와 요청 크기 제한` | S | OUTPUT, CORE, RISK | Caps write requests at SSIZE_MAX, retries EINTR, and exposes a deterministic write test seam. | This completes the project-defining POSIX output policy beyond simple short-write handling. It establishes progress, interruption, and request-range invariants used by every conversion and enables direct failure-path proof. |
| `22e65c176b5d` | `perf(output): 반복 채움을 묶어서 출력` | A | OUTPUT, PERF | Emits repeated padding through bounded 64-byte chunks instead of one write per character. | The change materially reduces system-call count for wide fields while preserving bounded stack use and failure propagation. Later fault tests make the cost model observable. |
| `1223518652bd` | `test(output): 쓰기 실패 시퀀스와 채움 전략 검증` | A | OUTPUT, TEST, RISK | Injects partial writes, EINTR, EPIPE, zero progress, and verifies SIGPIPE and padding chunks. | This provides deterministic evidence for the S-level output state machine and confirms that the library does not mutate process signal policy. It is unusually strong failure-path verification. |
| `9ac825379180` | `fix(text): 문자열 정밀도 범위까지만 읽기` | A | FORMAT, EDGE, RISK | Stops the string scan at precision instead of finding NUL first and truncating afterward. | The previous approach could read beyond the caller's valid bounded object even when the requested output was safe. This root-cause fix restores the memory-access contract at the renderer boundary. |
| `e040e69db535` | `test(text): NUL 없는 제한 문자열 회귀 검증` | B | FORMAT, TEST, EDGE | Formats a three-byte non-NUL array with a matching string precision. | The focused regression proves the bounded-read fix, but it is supporting evidence for the preceding A-level correction. |
| `ed3750fd081a` | `fix(decimal): INT_MIN 크기를 unsigned 범위에서 계산` | A | FORMAT, EDGE, RISK | Forms negative magnitude as -(value + 1) + 1 before unsigned conversion. | The correction removes signed-overflow dependence on platforms where long cannot represent -INT_MIN. It restores portable numeric correctness with a small but material fix. |
| `2d773acc5bd6` | `fix(format): 지원 문법과 전체 출력 크기 선검증` | S | ARCH, VARARGS, ATOMIC | Adds a va_copy measurement pass that validates grammar and total int length before output. | This changes the formatter from incremental discovery to a two-pass architecture: malformed, unsupported, or unrepresentable output is rejected with no external effect. The final correctness and failure contract cannot be explained without it. |
| `14059bd24f3e` | `test(format): 잘못된 포맷의 무출력 실패 검증` | A | ATOMIC, TEST, RISK | Verifies late invalid fields and INT_MAX length failures produce no bytes. | These cases specifically prove the new preflight atomicity guarantee, including errors after otherwise valid prefixes and conversions. They materially protect an S-level contract. |
| `aceddf290594` | `test(printf): 숫자와 문자열 포맷 조합 확대` | B | FORMAT, TEST, VERIFY | Adds broad libc differential matrices for signed, unsigned, hexadecimal, text, and mixed formats. | The coverage is extensive but mainly scales ordinary verification over already established semantics. |
| `12d715eba77d` | `test(printf): 공개 계약 경계 사례 확대` | A | FORMAT, TEST, EDGE | Locks down zero precision, prefixes, null values, percent extensions, and width/precision boundary matrices. | Several expectations are deliberate project contracts rather than portable libc behavior. Fixing them explicitly is significant for preserving the library's actual public semantics. |
| `a87bcf560789` | `test(release): 아카이브와 외부 소비자 검증` | A | RELEASE, ARCH, VERIFY | Checks archive order, global definitions, external dependencies, and a header-only external consumer. | The commit establishes the distributable artifact and consumer boundary as reproducible contracts, adding significant release-level evidence beyond in-tree tests. |
| `1b474fa2a5e3` | `build(sanitize): UBSan과 Linux ASan 검증 추가` | B | VERIFY, TEST | Adds UBSan targets and a Dockerized GCC AddressSanitizer path. | The sanitizer matrix is useful safety infrastructure, but it applies standard verification without changing the formatter's architecture or contract. |
| `a35faa85cf41` | `docs(project): 프로젝트 문서 정리` | C | - | Documents the final grammar, two-pass pipeline, output behavior, and verification limits. | The comprehensive documentation clarifies the result but is documentation-only and changes no executable or verification behavior. |

# Development Threads

## Thread: A single output state becomes a robust system-call boundary

`1d6a5cee3041` B — Starts with a local write-and-count helper that rejects short writes.  
↓  
`3f7b0ab926d0` S — Introduces shared descriptor, count, and sticky-error state and resumes after positive short writes.  
↓  
`78e5d25d7df6` B — Migrates literal output to the shared context, eliminating duplicate accounting.  
↓  
`c627bd1f85bb` A — Validates a wide `ssize_t` result before narrowing it into the public `int` count.  
↓  
`8a3ec50cb689` S — Caps requests at `SSIZE_MAX`, retries `EINTR`, and creates a deterministic write seam.  
↓  
`22e65c176b5d` A — Emits wide padding in bounded chunks rather than one system call per byte.  
↓  
`1223518652bd` A — Scripts partial progress, interruption, zero writes, `EPIPE`, and verifies `SIGPIPE` and chunking policy.

**Significance**

The output layer evolves from a convenience helper into a state machine shared by every conversion. Count range, progress, interruption, permanent failure, syscall cost, and process signal policy are all made explicit and then verified independently of operating-system timing.

## Thread: From format fields to typed conversion dispatch

`7984ddf2dd57` S — Establishes the normalized `t_format` representation and overflow-checked field parser.  
↓  
`9e6d785628f3` B — Connects field parsing to the main format traversal.  
↓  
`03c3e6e09fa1` A — Introduces a dispatcher that owns `va_arg` type selection and routes to conversion renderers.  
↓  
`95d6613a1c72` B — Adds signed and unsigned decimal conversions inside that boundary.  
↓  
`93c883070a1b` B — Adds hexadecimal and pointer conversions inside the same boundary.  
↓  
`c5f627099ad9` A — Normalizes conflicting flags once and applies signed and alternate-form prefixes.

**Significance**

Parsing, argument extraction, and rendering become separate responsibilities. The normalized field prevents every conversion from reparsing raw text, while dispatch centralizes the exact promoted type consumed for each specifier. Parser-side flag normalization then reduces the number of conflicting states every renderer must handle.

## Thread: Numeric formatting converges on one layout model

`ac27a26affaa` B — Adds prefix-aware width and alignment to decimal output.  
↓  
`c5ef742b84de` B — Repeats the model for hexadecimal and pointer output.  
↓  
`1fa064ca9d79` A — Adds zero suppression, precision zeros, and zero-field padding rules.  
↓  
`c5f627099ad9` A — Establishes prefix selection and flag precedence.  
↓  
`f276ee73087c` B — Locks down representative prefix, precision, zero, and left-alignment interactions.  
↓  
`177c8d03b353` A — Extracts one shared numeric layout writer for decimal, hexadecimal, and pointer conversions.  
↓  
`ed3750fd081a` A — Removes signed-overflow dependence when formatting `INT_MIN`.  
↓  
`12d715eba77d` A — Expands public boundary matrices for zero precision, prefixes, null pointers, and narrow fields.

**Significance**

The early decimal and hexadecimal implementations duplicate a difficult sequence of spaces, prefixes, field zeros, precision zeros, digits, and trailing padding. Shared layout turns that sequence into one invariant, while later portability and boundary work ensures the common mechanism remains correct at signed endpoints and project-specific pointer semantics.

## Thread: String precision changes from output truncation to bounded access

`8e1cee3ed7f0` B — Initially computes the full string length and truncates the emitted length afterward.  
↓  
`9ac825379180` A — Moves the precision bound into the scan itself so memory beyond the permitted object range is never read.  
↓  
`e040e69db535` B — Uses a non-NUL-terminated three-byte object to prove that `%.3s` requires only those three readable bytes.

**Significance**

The history exposes a real distinction between output length and memory access. Precision is not merely a post-processing limit; it changes how far the renderer may inspect the caller's object. The focused regression prevents a return to full `strlen`-style scanning.

## Thread: Per-field validation becomes whole-call preflight

`7984ddf2dd57` S — Rejects decimal width or precision values that overflow `int` while parsing one field.  
↓  
`1b8049e411bb` A — Adds parser-boundary tests and a differential harness, but errors later in a format can still follow earlier output.  
↓  
`2d773acc5bd6` S — Adds a `va_copy` measurement pass that validates every field and the total result before any write.  
↓  
`14059bd24f3e` A — Verifies that late unsupported fields and unrepresentable total lengths fail with zero emitted bytes.

**Significance**

Local parse validation is insufficient for the public no-output guarantee when an invalid field appears after valid literals or conversions. The second pass changes the architecture: format and length errors become preflight failures, while only device errors may leave partial external output.

## Thread: Verification reaches runtime and artifact boundaries

`1b8049e411bb` A — Establishes byte capture, return-count comparison, and libc differential testing.  
↓  
`1223518652bd` A — Adds deterministic system-call and signal-policy verification.  
↓  
`12d715eba77d` A — Records fixed expectations for deliberate project semantics that libc cannot serve as a portable oracle for.  
↓  
`a87bcf560789` A — Verifies archive members, global definitions, external dependencies, and an out-of-tree consumer.  
↓  
`1b474fa2a5e3` B — Runs normal and fault binaries under UBSan and a Linux GCC AddressSanitizer environment.

**Significance**

Each layer answers a different question: whether bytes match, whether failure sequences preserve the output contract, whether project extensions remain stable, whether the distributable archive has the right boundary, and whether exercised paths trigger runtime undefined behavior or invalid memory access.

# Most Important Commits

## feat(output): 출력 컨텍스트와 쓰기 API 추가
Commit: `3f7b0ab926d0`  
Importance: S  
Tags: ARCH, OUTPUT, CORE

### Problem

As conversions accumulate, separate helpers cannot safely maintain independent byte counts, descriptors, short-write loops, and failure flags. Duplicated output state would let conversions disagree about whether output may continue or how many bytes have been committed.

### Decision

A private `t_printf` context owns the descriptor, accumulated `int` count, and sticky error. `ft_printf_write` advances after every positive short write, updates one shared count, and rejects any subsequent write once the context is invalid.

### Why it mattered

The context becomes the common execution state for literal text and every conversion. It centralizes the public return-value invariant and gives the rest of the formatter a single error-propagation boundary.

### What changed

The output module, internal header, context initializer, multi-byte writer, and character writer were added to the archive.

### Why this is important for understanding the project

The formatter is not a collection of independent conversion functions. It is one stateful output operation whose components share progress and failure; this commit establishes that architecture.

## feat(parser): 포맷 필드 모델과 해석기 추가
Commit: `7984ddf2dd57`  
Importance: S  
Tags: ARCH, PARSER, CORE

### Problem

Raw format text combines flags, width, optional precision, and a conversion specifier. Letting each renderer inspect the raw cursor would duplicate grammar, make conflict handling inconsistent, and obscure field-number overflow.

### Decision

The parser converts one field into a normalized `t_format` structure and advances the input pointer. Decimal accumulation checks `INT_MAX` before multiplication and addition, while flags are represented as stable bits for later normalization and rendering.

### Why it mattered

`t_format` becomes the durable contract among parsing, measurement, dispatch, and layout. Every subsequent conversion depends on this representation rather than the original text.

### What changed

A parser translation unit, flag constants, the field structure, initialization, decimal parsing, and parse API were added.

### Why this is important for understanding the project

The commit defines the project's actual format language and the component boundary that lets later work evolve independently. Without it, neither the renderer structure nor the eventual two-pass validation architecture is intelligible.

## refactor(output): 숫자 출력 배치 로직 통합
Commit: `177c8d03b353`  
Importance: A  
Tags: ARCH, LAYOUT, REFACTOR

### Problem

Decimal and hexadecimal renderers independently implemented the same difficult ordering rules for prefix length, suppressed zero digits, precision zeros, field zeros, leading spaces, and trailing spaces. Duplication allowed the two conversion families to drift on edge cases.

### Decision

A shared numeric layout writer receives an already generated digit sequence, prefix, zero-value fact, and normalized field. It alone determines effective digit length, precision zeros, field padding, and emission order.

### Why it mattered

This creates one authoritative mechanism for numeric placement and materially reduces the number of states that must be reasoned about and tested separately. The later measurement pass can mirror one model rather than several subtly different renderers.

### What changed

A new layout translation unit and internal API replaced almost identical output sequences in decimal and hexadecimal modules.

### Why this is important for understanding the project

Most visible `printf` complexity lies not in converting a number to digits but in placing prefixes and padding under interacting flags. This commit identifies that concern as its own subsystem.

## fix(output): 중단된 쓰기 재시도와 요청 크기 제한
Commit: `8a3ec50cb689`  
Importance: S  
Tags: OUTPUT, CORE, RISK

### Problem

The shared output loop already handled positive short writes, but an interrupted call was still treated as permanent failure and a `size_t` remaining length could exceed the maximum representable positive `ssize_t` result.

### Decision

Each request is capped at `SSIZE_MAX`; `EINTR` retries without advancing the buffer or count; other nonpositive results set the sticky error. A compile-time test seam redirects only the system-call boundary to a deterministic substitute.

### Why it mattered

The change completes the POSIX progress model used by every conversion and makes its hardest paths directly testable. It distinguishes interruption before progress from permanent failure after partial progress.

### What changed

The output module gained `errno` handling, request-size selection, retry logic, and the `FT_PRINTF_TEST_WRITE` substitution path.

### Why this is important for understanding the project

The public API's return value is only meaningful if the underlying write loop accounts for exactly the bytes accepted by the kernel. This commit establishes the final system-call semantics behind that contract.

## fix(text): 문자열 정밀도 범위까지만 읽기
Commit: `9ac825379180`  
Importance: A  
Tags: FORMAT, EDGE, RISK

### Problem

The initial precision implementation found the full NUL-terminated length and only then reduced the emitted length. A valid `%.3s` call may provide exactly three readable bytes without a terminator, so full scanning can read outside the caller's object.

### Decision

The local length scan stops when either NUL or the precision limit is reached. The same bounded length controls padding and output, making precision both an emission limit and a memory-access limit.

### Why it mattered

This fixes the root cause rather than guarding one output call. It restores a caller-visible safety property that ordinary NUL-terminated tests could not expose.

### What changed

The string length helper now accepts the parsed field and enforces precision during traversal; redundant post-scan truncation was removed.

### Why this is important for understanding the project

The commit demonstrates that format semantics constrain memory reads, not only rendered bytes. That distinction is central to safely implementing string conversions in C.

## fix(format): 지원 문법과 전체 출력 크기 선검증
Commit: `2d773acc5bd6`  
Importance: S  
Tags: ARCH, VARARGS, ATOMIC

### Problem

A single output pass can discover an unsupported or unrepresentable field only after earlier literals and conversions have already been written. The public contract requires format and total-length errors to return `-1` without output, and the total count must remain representable as `int`.

### Decision

`ft_printf` copies the variadic traversal with `va_copy` and performs a complete measurement pass. That pass reparses every field, consumes arguments with their correct promoted types, computes exact effective lengths, rejects unsupported syntax, and accumulates only while the total remains within `INT_MAX`.

### Why it mattered

This is a major architectural change from incremental validation to preflight validation. It cleanly separates errors that can be detected before external effects from device failures that may occur after partial output.

### What changed

A substantial measurement module and internal API were added, and the entry point gained independent copied-argument traversal with balanced `va_end` handling on success and failure.

### Why this is important for understanding the project

The final formatter is intentionally two-pass. This commit explains why the parser and layout rules must be reproducible in measurement, how variadic state is owned, and where the project's limited atomicity guarantee comes from.

## test(output): 쓰기 실패 시퀀스와 채움 전략 검증
Commit: `1223518652bd`  
Importance: A  
Tags: OUTPUT, TEST, RISK

### Problem

Real pipes and descriptors do not reliably produce an exact sequence of partial writes, interruptions, zero returns, and permanent errors. They also make it difficult to prove that padding optimization does not bypass the common output policy or that the library preserves the process's `SIGPIPE` disposition.

### Decision

A scripted writer records request sizes and accepted bytes while returning configured `EINTR`, partial counts, `EPIPE`, or zero. Separate signal tests install a caller-owned handler around a broken pipe and verify both the returned error and unchanged disposition.

### Why it mattered

The suite proves transition behavior, not merely final strings: retries request the correct remaining suffix, hard failure preserves prior bytes but stops future writes, zero progress fails, and wide padding remains chunk-bounded.

### What changed

The Makefile gained a fault binary built through the output test seam, the normal suite gained a `SIGPIPE` policy case, and the fault suite covered retry, permanent failure, and 64-byte padding chunks.

### Why this is important for understanding the project

The output layer is the formatter's main interaction with the operating system. This commit provides the strongest evidence that its state machine and process-boundary assumptions match the implemented contract.
