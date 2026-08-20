## feat(api): line reader 공개 계약 정의
The public header establishes `get_next_line(int fd)` as the library boundary and makes `BUFFER_SIZE` an explicit compile-time policy. A default of 42 keeps the API usable without additional flags, while the preprocessor rejects zero or negative values before an invalid read size can reach runtime code. Because the chosen value is compiled into the implementation, the resulting archive has a definite buffering configuration rather than depending on a consumer's later macro definition.

The `char *` result also defines the ownership boundary: a successful call yields a separately owned, NUL-terminated line that the caller can release, while `NULL` represents the absence of a returned line. Keeping the reader's mutable state out of the public header preserves implementation freedom; consumers depend on the line-level contract rather than on buffer layout or cursor management.

## feat(reader): 파일 끝의 마지막 줄 반환
The first reader implementation introduces persistent accumulation across `read` calls, geometric buffer growth, descriptor probing, and cleanup on allocation or I/O failure. Input is appended until `read` reports EOF, after which the accumulated bytes are copied into an independently owned result and the internal state is released. This establishes the essential rule that a final unterminated byte sequence is still data and must not be discarded merely because no trailing newline exists.

At this stage the implementation treats the whole file as one final record rather than separating embedded newlines. Even so, the buffer-growth and rollback structure is foundational: capacity is increased without overwriting the previous allocation until replacement succeeds, and error paths do not return pointers into mutable internal storage. Those decisions provide the ownership and accumulation mechanics on which later line extraction can operate.

## build(reader): 정적 라이브러리 빌드 경계 추가
The build now produces a static archive instead of leaving compilation as an implicit consumer responsibility. Strict C99 warning flags make diagnostics part of the build contract, dependency files keep header changes connected to recompilation, and `BUFFER_SIZE` is passed when compiling the implementation rather than when merely linking a consumer.

Using buffer-size-specific object directories prevents objects compiled with different read sizes from being silently mixed. The clean and rebuild targets also define which files are generated and disposable. This turns the source into a reproducible library artifact with a stable public header, rather than a collection of translation units whose effective configuration depends on ad hoc commands.

## test(reader): 빈 입력과 EOF 앞 마지막 줄 검증
The initial regression suite exercises the reader through actual file descriptors and fixes the earliest observable contract. It covers empty input, a final byte sequence without a newline, data spanning multiple `BUFFER_SIZE` reads, and invalid or already closed descriptors. These cases distinguish a legitimate empty stream from an unterminated final record and from an invalid input source.

Testing across chunk boundaries is important because the caller-visible result must not depend on how the kernel partitions reads. The invalid-descriptor cases also verify that failure is reported without manufacturing a line or retaining unusable state. Together, these tests provide a behavioral baseline before newline extraction and multiple-descriptor support complicate the state machine.

## refactor(buffer): 읽지 않은 입력을 구간으로 표현
Buffered data is rerepresented as an unread interval `[begin, end)` within an allocation instead of as a single length whose entire prefix remains logically active. Capacity management can now compact only the unread suffix when consumed bytes occupy the front, or allocate a geometrically larger buffer when compaction is insufficient. The logical contents are therefore separated from both the allocation's total capacity and the bytes already returned to the caller.

This representation is the key prerequisite for incremental line consumption. Advancing `begin` can retire a returned prefix without immediately reallocating or copying the remaining suffix, while `end` continues to mark the next append position. Preserving the old allocation until a growth allocation and copy succeed keeps reserve failure non-destructive and maintains the invariant that unread bytes remain available or the operation reports failure without partial replacement.

## feat(reader): 줄을 분리하고 남은 입력 보존
The reader now scans buffered input for a newline, returns the prefix through that newline, and leaves the suffix available for subsequent calls. A separate `scan` cursor records how far newline search has progressed, so bytes already proven not to contain a delimiter are not rescanned every time another chunk arrives. When EOF is reached, any remaining unterminated suffix is returned as the final line before the reader reports completion.

The returned line is allocated independently and includes the newline when one was present. Internal indices advance only around the extracted interval, preserving the contract that one call consumes exactly one logical line and no bytes from the next one. This converts the accumulator into a streaming parser while keeping chunk boundaries invisible to callers and retaining unread data across calls.

## test(reader): 개행과 남은 입력 처리 검증
The reader tests are expanded from EOF accumulation to line semantics. Inputs containing several lines verify that each call includes the terminating newline, repeated newline characters produce distinct empty lines, and a final unterminated suffix is returned only after all newline-terminated records. The expected sequence also checks that data following an extracted newline remains intact for the next call.

These assertions protect the cursor invariants introduced by line splitting: `begin` must advance to the first unread byte, `scan` must not skip a possible delimiter, and EOF must not erase a nonempty suffix. The tests are intentionally independent of the number of underlying reads, so an implementation cannot pass by relying on delimiters aligning with `BUFFER_SIZE`.

## refactor(state): reader 상태를 helper 인자로 전달
Buffering and extraction helpers now receive an explicit reader-state object instead of reaching into hidden singleton storage. The change preserves observable behavior but makes every mutation identify the state instance it belongs to. This removes an implicit global dependency from reserve, scan, extraction, and cleanup operations.

Explicit state passing improves responsibility boundaries even before more than one reader exists. Helpers become locally understandable and can be reused for independently owned states without duplicating the algorithm. It also makes cleanup and rollback obligations visible in function signatures: a helper mutates only the supplied reader, which is essential when later calls must isolate failures and unread data belonging to different descriptors.

## feat(state): 디스크립터별 읽기 상태 분리
The single persistent reader is replaced by a linked collection keyed by file descriptor. Each node owns its descriptor number, unread interval, scan cursor, and allocation; calls find or create the matching node, while EOF and unrecoverable descriptor errors remove only that node. Interleaved calls can therefore maintain distinct partial lines and read-ahead data.

The design treats the descriptor number as the compatibility API's state key. That is sufficient for alternating active descriptors, but it also makes timely disposal important: stale state must not survive after a failed or completed descriptor and later attach to a reused number. Restricting cleanup to the affected node preserves other streams while maintaining the invariant that bytes read from one descriptor can never be returned for another.

## test(state): 교차 디스크립터 상태 격리 검증
The state suite alternates reads from multiple descriptors rather than consuming each stream to completion in isolation. It verifies that each descriptor retains its own unread suffix, that line order remains correct under interleaving, and that a call using an invalid descriptor does not disturb a valid reader already holding buffered data.

This is more than ordinary feature coverage: it checks the ownership boundary of the new descriptor-indexed list. A shared buffer, a mistakenly global scan cursor, or broad cleanup after one failure would all corrupt the expected sequence. The test therefore locks down the invariant that lookup, mutation, and disposal are scoped to one descriptor node at a time.

## test(error): 오류 발생 시 디스크립터 상태 정리 검증
Error-path coverage now verifies that unusable descriptors do not leave persistent reader nodes behind. Write-only descriptors, closed descriptors, and failures encountered after state creation must discard the affected buffer and metadata, while an error on one descriptor must leave every other descriptor's unread bytes available.

This protects against a subtle descriptor-reuse hazard. Because the compatibility API keys hidden state by the integer descriptor, retaining a failed node could cause a later file opened under the same number to inherit unrelated bytes. The tests establish cleanup as a correctness requirement, not merely a leak-prevention detail, while confirming that cleanup remains narrowly scoped rather than resetting all active readers.

## test(failure): 메모리 할당과 읽기 실패 처리 검증
A deterministic fault-injection harness replaces allocation, release, and read operations for the test build. It can fail each allocation point, return short reads, inject errors before or after partial input, and record invalid or duplicate frees. This makes failure paths reproducible instead of depending on system memory pressure or nondeterministic I/O timing.

The suite checks that every acquired allocation has one owner, partial construction is rolled back safely, and a failure associated with one descriptor cannot corrupt another descriptor's state. Short reads are treated as valid progress rather than EOF, while injected read errors verify the implementation's cleanup policy at the exact transition where they occur. The harness therefore validates resource and state invariants that normal-path examples cannot exercise reliably.

## test(reader): BUFFER_SIZE 경계값 검증
The behavioral matrix now runs with several read sizes, including 1, 2, the default, and a much larger value. Test data is chosen around chunk boundaries and includes large adjacent lines, pipe input, high-numbered descriptors, repeated EOF calls, and returned buffers that must remain independent of subsequent reader activity. The suite also confirms that the reader borrows descriptors rather than closing them.

Varying `BUFFER_SIZE` tests the representation rather than one convenient partition of the input. Delimiters can appear before, at, or after a read boundary, and a correct implementation must produce the same lines in every case. The ownership checks ensure that caller-visible storage is not an alias of the reusable internal buffer, while repeated EOF establishes a stable terminal state instead of accidental one-shot behavior.

## refactor(buffer): 남은 입력 버퍼를 읽기 공간으로 재사용
The read path now reserves capacity at the end of the internal unread buffer and reads directly into that storage. The previous stack scratch buffer followed by an append copy is removed. Existing unread bytes remain in place or are compacted by reserve, and the new bytes extend `end` before the NUL sentinel is restored.

Eliminating the intermediate copy reduces work for every successful read and makes capacity planning correspond directly to the system call's destination. The change preserves the important rollback boundary: reserve must succeed before `read` is attempted, so allocation failure leaves the old unread interval untouched. Direct tail reads therefore improve efficiency without weakening the parser's cursor, ownership, or error invariants.

## test(build): BUFFER_SIZE 정의 경계 검증
Build verification now compiles the public interface with valid and invalid `BUFFER_SIZE` definitions. A positive value must compile, while zero and negative values must be rejected by the header's compile-time guard. This tests the configuration contract at the same phase where it is enforced rather than relying on a runtime code path that should never exist.

The check prevents future header edits from silently accepting nonsensical read sizes or moving validation into only one translation unit. Because consumers and the implementation share the header, keeping the constraint there ensures that incompatible configurations fail early and consistently across archive builds and external compilation.

## test(release): 정적 라이브러리 표면 검증
Release checks inspect the completed archive rather than only compiling and running in-tree tests. Manifests fix the expected archive members, public definitions, and permitted unresolved library dependencies, allowing accidental extra object files, exported helper symbols, or undeclared runtime requirements to be detected.

This treats binary packaging as part of the API. A source-level test could pass while the archive exposes internal names, omits a public entry point, or links against an unintended helper. Verifying the `ar` and symbol-table surface keeps the implementation boundary aligned with the public header and makes the artifact suitable for consumers that see only the archive, not the repository layout.

## test(release): 공개 archive 소비자 실행 검증
An external-style consumer is compiled against the public header and linked to the generated static archive, then executed to verify the resulting program's behavior. The check no longer relies solely on test binaries linked directly from project object files, which could conceal missing archive members or an incorrect public link interface.

Exercising an invalid-descriptor call through the linked artifact confirms that the declared symbol is resolvable and that the library's basic runtime contract survives packaging. This is a release-boundary test: success requires the header, archive contents, exported symbols, and consumer link command to agree as one interface.

## test(sanitize): UB와 누수 검사 경로 추가
The verification workflow gains builds that instrument undefined behavior and resource lifetime, with leak checking selected according to the host platform. The sanitizer paths run the reader matrix under stricter runtime diagnostics instead of treating warning-free compilation and functional output as sufficient evidence.

This is particularly relevant to a stateful C reader whose correctness depends on index arithmetic, allocation replacement, descriptor-node cleanup, and non-aliasing returned buffers. Instrumentation can expose out-of-bounds access, invalid frees, arithmetic misuse, or retained nodes that ordinary assertions may not reveal. Platform-aware selection keeps the check meaningful without pretending that every leak tool has identical availability or semantics.

## feat(context): 명시적 reader 수명 API 추가
An opaque `t_blr_reader` and explicit create, reset, and destroy operations make reader lifetime caller-controlled. A context owns its heap object and internal buffer but only borrows the supplied descriptor; resetting or destroying it discards buffered state without closing the descriptor. The legacy descriptor list is adapted to use the same lifecycle primitives.

This separates stream-processing state from descriptor ownership. Callers can now abandon a partially read stream, reset after changing the underlying file position, or release high-water buffer capacity before EOF without depending on hidden global cleanup. Opacity keeps the buffer-window invariants inside the implementation, while the explicit handle identifies which state is being managed.

## feat(reader): 명시적 결과 상태 API 추가
The context API gains `blr_reader_next` and a result enumeration that distinguishes a returned line, clean EOF, and error. A context records that EOF has been reached so repeated calls remain terminal without performing new reads, and successful line results transfer ownership through an output pointer rather than overloading a null pointer with several meanings.

Separating outcome from data resolves an ambiguity inherent in the compatibility function: callers can react differently to completion and failure while still receiving independently allocated lines. The API also establishes a precise output rule—non-line outcomes leave the supplied line pointer null—so error handling cannot accidentally free stale caller memory or interpret a previous result as current output.

## refactor(reader): legacy API를 context reader에 연결
`get_next_line` is reduced to an adapter over the context reader instead of maintaining a second parsing implementation. Descriptor lookup supplies a context, `blr_reader_next` performs the actual state transition, and the adapter maps the richer result set back to the historical `char *` or `NULL` interface. This keeps one authoritative implementation of buffering, extraction, EOF, and failure behavior.

Line extraction is also made non-consuming until allocation and copy succeed. On allocation failure the unread interval remains available for a later call, and the scan cursor is restored so the same delimiter can be found again. EOF tails are copied into caller-owned storage rather than transferring the internal buffer itself. These choices preserve context reusability while allowing the compatibility API to retain its intentionally less expressive return contract.

## test(context): 결과 상태와 컨텍스트 수명 검증
Context tests cover ordered `LINE` results, repeated `EOF`, empty input, invalid arguments, reset after repositioning a descriptor, and destruction without descriptor closure. They also exercise descriptor-number reuse, duplicated descriptors that share one open file description, and the requirement to associate one context with the stream position it buffers.

The suite clarifies ownership and lifecycle boundaries that a function-only API cannot express. A context borrows its descriptor and retains read-ahead state relative to that descriptor's current kernel offset; external repositioning therefore requires reset, while closing and reusing the integer requires discarding the old context. Independent returned lines remain caller-owned, and terminal or error results cannot leak stale output pointers.

## test(failure): 컨텍스트의 line 할당 재시도 검증
Fault injection now targets allocation of a caller-visible line both when a newline is already buffered and when EOF leaves an unterminated tail. After the forced failure, the same context is called again and must return the exact original line rather than skipping it, shortening it, or reporting EOF.

This verifies a transactional extraction boundary: advancing `begin`, retiring a delimiter, or clearing the EOF tail may occur only after result allocation succeeds. The test also checks that failed attempts do not leak temporary storage. Allocation failure is therefore treated as a non-consuming operation on buffered input, allowing callers to retry without reconstructing the context or losing bytes already obtained from the descriptor.

## fix(reader): 중단된 읽기를 재시도하고 대기 상태를 보존
The low-level read path now retries `EINTR` internally and distinguishes `EAGAIN` or `EWOULDBLOCK` from terminal errors. The context API exposes the latter as `BLR_AGAIN`, preserving every byte accumulated so far and indicating that the stream is temporarily incomplete rather than finished or corrupted. Other read errors report `BLR_ERROR` without discarding previously buffered input.

The compatibility adapter continues to return `NULL` because its type cannot express a wait state, but it retains the descriptor context so a later call can resume. This establishes an important streaming invariant: transient scheduling and readiness conditions may delay a result, yet they must not consume partial data or collapse into EOF. `EINTR` is retried as the same logical operation, while nonblocking readiness remains visible to callers that choose the explicit API.

## test(reader): 비차단 부분 입력 보존 검증
A nonblocking pipe test feeds a line in stages. An initial fragment produces `BLR_AGAIN`; later bytes complete that line and begin another; a subsequent wait preserves the second fragment; closing the writer finally turns the remaining bytes into the unterminated tail and then stable EOF. The compatibility function is also exercised across a wait to confirm that its hidden context retains the prefix despite returning `NULL`.

The scenario verifies that readiness boundaries are not record boundaries. Partial bytes must survive any number of no-data calls, newline extraction must leave the following prefix untouched, and EOF alone authorizes returning an unterminated remainder. This prevents implementations from treating `EAGAIN` as cleanup, from duplicating fragments after resumption, or from losing read-ahead when adapting to the legacy API.

## test(failure): EINTR·EAGAIN·I/O 오류 순서 검증
The scripted read harness now drives ordered fault sequences rather than isolated failures. It covers an interruption followed by a short read and `EAGAIN`, as well as a short read followed by a terminal I/O error and a successful later call. Expected results confirm that interruption is invisible, temporary unavailability is reported without data loss, and a terminal error does not erase bytes already accepted into the context.

Ordering matters because state bugs often appear only when progress and failure alternate. The tests ensure that `end` advances exactly for positive reads, scan state remains consistent across returned status codes, and retrying after an error resumes from preserved unread data rather than rereading, duplicating, or skipping it. They therefore validate the result taxonomy as a state-machine contract, not merely as errno translation.

## test(thread): 독립 컨텍스트의 병렬 사용 검증
The test suite reads several streams concurrently with separate explicit contexts and verifies each complete result sequence. This demonstrates that context-based operation has no shared mutable parsing state: one thread's buffer growth, cursor movement, EOF flag, or destruction cannot alter another context.

The scope is deliberately limited to independent contexts. It does not claim that simultaneous calls on the same context are synchronized, nor that the legacy global descriptor list is thread-safe. By testing the boundary the API actually provides, the suite documents the useful concurrency property without overstating guarantees that the implementation does not establish.

## test(release): 격리된 외부 소비자 계약 검증
Release verification now stages only the public header and static archive in isolated temporary directories, builds a consumer there, and exercises both the explicit context API and the compatibility function. The consumer reads a real line through the packaged artifact without access to private source files, project object directories, or internal headers.

This catches accidental in-tree dependencies that ordinary link tests can miss, such as undeclared private includes, reliance on local object ordering, or a public declaration not backed by the archive. Verifying both entry points also confirms that the richer and compatibility interfaces are exported together and agree on caller ownership of returned lines.

## test(sanitize): AddressSanitizer와 플랫폼 실행 정책 추가
AddressSanitizer builds are added to the existing verification matrix to detect invalid memory access and lifetime errors during actual reader execution. The workflow records a platform policy for environments where executing ASan binaries is unreliable by default, while still allowing an explicit override; undefined-behavior and leak checks remain complementary rather than being replaced.

The policy separates compilation support from trustworthy runtime evidence. On supported hosts the same boundary-heavy scenarios run under address instrumentation, increasing confidence in buffer compaction, geometric growth, extraction copies, failure rollback, and context disposal. On constrained hosts the check reports its deliberate execution decision instead of silently presenting an unexecuted binary as proof.

## test(perf): 4 MiB 입력의 작업량 기준 고정
A 4 MiB unterminated input is read with a 4096-byte buffer while test hooks count system calls, allocations, releases, and internal copy volume. The manifest fixes the expected line checksum and structural work—1025 reads, 13 allocations, 11 copy operations, and 12,533,760 copied bytes—while wall-clock duration is kept informational rather than used as a brittle pass/fail threshold.

This verifies the algorithmic consequences of direct tail reads, geometric growth, and scan cursors. The test does not claim zero-copy behavior: growth and the final caller-owned line still require copying. Instead, it guards against regressions such as linear-capacity expansion, per-chunk append copies, or repeated full-buffer scans that would multiply work for large records. Counting operations provides reproducible evidence of bounded implementation cost independent of transient machine load.
