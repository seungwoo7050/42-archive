# Project Importance Profile
Project: cpp-foundation
Domain: C++98 object model, manual resource management, polymorphism, type and numeric boundaries, generic containers, and static-library release verification.
Primary Purpose: Build one static library and six small CLI consumers that make C++98 value semantics, ownership, copying, exception safety, conversion correctness, deterministic output, and public API boundaries observable and testable.
Resolved Commit Scope: The complete independent linear history reachable from `cpp/cpp-foundation`: 75 commits from root `2cde0105fcb6` through head `709124d5e2ed`. The root has no parent, the branch has no merge commits, and no inherited unrelated history is present. Both documentation-only commits remain in classification. Twelve-character SHA abbreviations uniquely identify every commit in scope.

## Core Technical Areas
- Direct resource ownership and regular value semantics under the C++98 Rule of Three.
- Polymorphic cloning, virtual destruction, and ownership of heterogeneous dynamic objects.
- Strong exception guarantees implemented through detached candidates, cleanup, and non-throwing swap.
- ASCII-defined scalar, RPN, and batch grammars with strict complete-input validation.
- Numeric representability, signed overflow avoidance, negative zero, and locale-independent rendering.
- Generic random-access container requirements, iterator exposure, sorting, and cross-container consistency.
- Deterministic ordering and output independent of input permutation, locale, and repeated execution.
- Public-header isolation, compile-time negative contracts, external static-library consumption, and supported-platform verification.

## Core Architecture
- `include/cppf` defines the public C++98 types and contracts; `src` owns implementation details, resource transitions, parsing, and state publication.
- `libcpp_foundation.a` is the common deliverable. Six `apps/ex00` through `apps/ex05` binaries are thin consumers that adapt command-line or stream input to the public library.
- Early value objects lead into direct memory ownership, then clone-based polymorphism and factory integration, then scalar and RTTI boundaries, and finally template, RPN, and batch integration.
- Stateful replacement operations use a candidate object or candidate containers and publish with `swap` only after complete success.
- Verification is layered across unit tests, allocation and clone failure injection, no-elide builds, positive and negative compile contracts, CLI fixtures, external consumers, fixed-seed properties, sanitizers, release checks, and CI.

## Critical Invariants
- Every directly or polymorphically owned resource is released exactly once, and copying produces independent ownership rather than pointer aliasing.
- Operations documented with the strong guarantee leave the owning object's observable state unchanged when allocation, clone, parse, arithmetic, or stream-read preparation fails.
- A candidate is not published until it is complete; partial pipelines, contacts, or batch results must remain confined to temporary owners.
- Borrowed references, `c_str()` pointers, result references, and serialized address tokens never outlive or acquire ownership of their source object.
- Signed arithmetic is checked before execution, so error detection does not itself depend on undefined overflow.
- Accepted text must match the complete ASCII grammar and preserve meaningful boundaries such as `LONG_MIN`, negative zero, finite-range overflow, and nonzero underflow.
- Batch output has a total `(value, name)` order and remains invariant under input permutation and repeated rendering.
- Public headers compile without private include paths, private representation remains inaccessible, and the supported C++98 LP64 platform assumptions are explicit.

## Major Engineering Difficulties
- Implementing deep copying and exception-safe assignment for a manually allocated C string.
- Owning and copying heterogeneous polymorphic objects when `clone()` and factory creation return raw pointers.
- Cleaning partially cloned objects from a copy constructor, where the incomplete owner's destructor will not run.
- Preventing partial target mutation across multi-step factory creation and whole-stream batch replacement.
- Parsing floating literals without locale drift while preserving negative zero and rejecting silent nonzero underflow.
- Checking all signed `long` arithmetic without first evaluating an overflowing expression, especially around the asymmetric magnitude of `LONG_MIN`.
- Distinguishing a clean final unterminated line from actual stream failure.
- Demonstrating generic behavior across vector and deque while retaining deterministic total ordering and transactional publication.
- Separating portable verification from host-specific archive, dependency, leak, and sanitizer capabilities.

## Practical Engineering Areas
- Stable exception categories and process-level error-channel behavior.
- Compile-time enforcement of abstraction, constness, construction, conversion, and container requirements.
- Allocation and clone failure sweeps with live-object or live-block accounting.
- Classic-locale rendering and caller stream-state noninterference.
- External-consumer and release-artifact checks rather than relying only on in-tree compilation.
- Reproducible fixed-seed property testing, timeouts, sanitizers, and compiler/platform matrices.
- Explicit documentation of guarantees that stop at object state and do not roll back stream positions or external callback side effects.

## S-level Criteria
- Establishes the branch's defining ownership, polymorphic-clone, generic-container, checked-arithmetic, or transactional-publication mechanism.
- Introduces or corrects an invariant without which the project's core object-model or batch-processing story cannot be explained accurately.
- Solves a difficult lifecycle or correctness problem that materially determines later subsystem structure.
- Serves as a foundational abstraction directly reused by later major components.

## A-level Criteria
- Adds substantial edge-case or failure-path engineering for a core mechanism.
- Establishes important public API, deterministic-output, integration, portability, or verification boundaries.
- Restores a significant local invariant through non-trivial debugging without redefining the overall architecture.
- Provides unusually strong regression evidence for allocation, clone, parsing, arithmetic, or lifecycle failure.

## Typical B-level Work
- Implements normal features, CLI adapters, value objects, and expected tests within an already established design.
- Applies an existing ownership, parsing, ordering, or verification pattern to another component.
- Adds narrow compile, release, sanitizer, portability, or CI coverage without changing responsibility boundaries.
- Provides supporting pieces for a larger mechanism whose decisive judgment appears in another commit.

## Typical C-level Work
- Documentation-only framing or consolidation.
- Mechanical or narrowly presentational work with no executable behavioral, ownership, state, API, or verification consequence.
- Minor maintenance that contributes little to understanding the branch's engineering decisions.

## Project-specific Tags
OWNERSHIP — direct or polymorphic resource ownership, deep copying, deletion, and borrowed-lifetime boundaries.
EXCEPTION — strong or basic exception guarantees, candidate-and-swap transactions, rollback, and cleanup.
POLYMORPHISM — virtual interfaces, cloning, RTTI, and derived-object lifecycle.
PARSING — explicit ASCII token, literal, line, and record grammars.
NUMERIC — representability, overflow, underflow, signed limits, and scalar projections.
DETERMINISM — locale-independent rendering, total ordering, permutation invariance, and repeated-output stability.
API — public headers, encapsulation, constness, compile-time contracts, and external consumers.
GENERIC — template and iterator requirements, configurable containers, and cross-container behavior.
PORTABILITY — C++98, LP64, compiler/platform, sanitizer, archive, dependency, and release assumptions.

# Commit Classification

| Commit | Subject | Importance | Tags | Summary | Why |
| --- | --- | --- | --- | --- | --- |
| `2cde0105fcb6` | docs(readme): C++98 라이브러리 개발 기준 정의 | C | - | Adds the initial README describing C++98 development principles. | Documentation-only project framing; it contributes context but no executable mechanism or invariant. |
| `2d56fbdbd013` | build(makefile): C++98 정적 라이브러리 빌드 구성 | A | ARCH, PORTABILITY | Creates the strict C++98 static-library build, dependency tracking, and artifact lifecycle. | Repository-wide compilation and packaging rules shape every later commit, but they support rather than define the library's object-model mechanisms. |
| `70e6779470fe` | feat(contact): 검증된 연락처 값 객체 구현 | B | CORE | Introduces a validated `Contact` value object with printable ASCII and length constraints. | Competent foundational domain work, but the validation model is local and does not establish the project's later ownership or transaction architecture. |
| `218c797fe078` | test(contact): 연락처 값 불변식 검증 | B | TEST, EDGE | Adds unit coverage for contact validity, copying, accessors, and swapping. | Useful contract coverage for an established small value type; it does not reveal a difficult failure mechanism. |
| `2f9b934b0825` | feat(contact): 고정 크기 연락처 저장 순서 보존 | B | CORE | Adds an eight-slot circular `ContactBook` with logical oldest-to-newest indexing. | A normal bounded-state feature whose ring representation is important locally but not project-defining. |
| `623dc4bba8f0` | test(contact): 연락처 저장 용량과 논리 순서 검증 | B | TEST, EDGE | Verifies bounded capacity, replacement order, logical indexing, and range errors. | Expected behavioral coverage for the circular buffer rather than a new architectural decision. |
| `ea3d245cdb13` | feat(contact): 연락처 목록의 스트림 출력을 지원 | B | DETERMINISM | Adds logical-order stream output for contact records. | A straightforward serialization feature inside the established `ContactBook` model. |
| `f5a2c01c7d59` | feat(contact): 연락처 명령행 세션 연결 | B | INTEGRATION | Adds the contact-book command session and generic application build rules. | Normal CLI adaptation over an existing public API; it does not change the domain model. |
| `6e78ced59357` | test(contact): 공개 계약과 명령행 세션 검증 | A | API, TEST, INTEGRATION | Introduces unit, compile-contract, and CLI fixture layers for the contact subsystem. | Significant because it establishes the multi-layer verification pattern later reused across the entire branch, including positive and negative public-interface checks. |
| `aa3b5ba6c3c4` | feat(buffer): 종료 문자를 포함한 문자열 저장소 소유 | A | OWNERSHIP, CORE | Introduces an owning NUL-terminated `char` buffer with checked access and non-throwing swap. | This is the first direct-resource owner and establishes representation and lifetime rules that later copy, formatter, and failure-safety work depend on. |
| `802656910803` | test(buffer): 저장 크기와 범위 접근 검증 | B | TEST, EDGE | Verifies empty normalization, size, termination, mutability, and bounds. | Routine validation of the newly introduced buffer representation. |
| `0bc528c7d58e` | feat(buffer): 깊은 복사와 정규 대입 구현 | S | OWNERSHIP, EXCEPTION, CORE | Adds deep copying and copy-and-swap assignment to `TextBuffer`. | Project-defining: it turns the first raw-memory owner into a regular value with independent lifetime and a strong assignment guarantee, a pattern reused throughout the project. |
| `0c8935e8cb54` | test(buffer): 복사 독립성과 자기 대입 검증 | B | TEST, OWNERSHIP | Tests copy independence, chained assignment, and aliased self-assignment. | Necessary confirmation of the regular-value contract, but the decisive design is in the preceding implementation commit. |
| `93faed0d67a2` | feat(buffer): 결합·비교·출력 연산 제공 | A | OWNERSHIP, EXCEPTION, CORE | Adds concatenation, comparison, and stream operations with overflow and allocate-before-commit handling. | Significant because it extends the owning value without weakening self-aliasing or failure-state guarantees; it is more than routine operator boilerplate. |
| `ad1c00300b26` | feat(buffer): 문자열 결합 CLI 제공 | B | INTEGRATION | Adds a CLI that concatenates and prints two `TextBuffer` values. | A simple consumer demonstrating an already established public API. |
| `8da865e94358` | test(buffer): 연산자와 명령행 결합 결과 검증 | B | TEST, INTEGRATION | Covers buffer operators and the real concatenation executable. | Normal regression and integration coverage within the existing ownership design. |
| `47134f9e3b29` | test(buffer): 할당 실패와 복사 생략 비활성화 검증 | A | TEST, EXCEPTION, OWNERSHIP | Adds deterministic allocation-failure injection and no-elide builds for buffer operations. | Materially strengthens confidence in leak freedom and strong guarantees across every allocation point, but it verifies rather than establishes the core ownership architecture. |
| `835d87865762` | feat(format): 다형적 formatter 인터페이스 정의 | S | ARCH, POLYMORPHISM, OWNERSHIP | Defines the abstract formatter interface, virtual destruction, cloning, and concrete transformations. | Project-defining: it establishes the polymorphic copy and deletion boundary from which pipelines, factories, and later lifecycle tests are derived. |
| `262ada90ab53` | test(format): 파생 formatter의 동적 호출 검증 | B | TEST, POLYMORPHISM | Verifies dynamic formatter dispatch and names through the base interface. | Expected behavioral coverage of the newly established polymorphic interface. |
| `62ed45f8adf9` | feat(format): formatter 소유 pipeline 구현 | S | ARCH, POLYMORPHISM, OWNERSHIP | Introduces a bounded pipeline that owns formatter clones and applies them in order. | Project-defining: it creates the central owner of heterogeneous dynamic objects and fixes the clone-based lifetime model used by subsequent factory work. |
| `3526521537c2` | feat(format): pipeline 실행 CLI 제공 | B | INTEGRATION, POLYMORPHISM | Adds a CLI that assembles and executes a fixed formatter pipeline. | Normal public-API consumption of the pipeline architecture. |
| `66bcd2b89282` | test(format): pipeline 적용 순서와 용량 경계 검증 | B | TEST, EDGE | Checks identity behavior, step order, capacity rejection, and state preservation. | Important local coverage, but the underlying owner and failure order are already explicit in the implementation. |
| `bf4d9bed705c` | feat(format): pipeline 깊은 복사 구현 | S | OWNERSHIP, EXCEPTION, POLYMORPHISM | Implements deep pipeline copying, partial-construction cleanup, and copy-and-swap assignment. | Project-defining: safely cloning a heterogeneous owner across constructor and assignment failure is one of the branch's hardest lifecycle mechanisms and essential to the regular-value story. |
| `68f4184812f4` | test(format): pipeline 복사와 자기 대입 검증 | B | TEST, OWNERSHIP | Verifies independent pipeline copies, assignment, and self-assignment. | Normal confirmation of deep-copy semantics after the mechanism was established. |
| `0427713637b8` | test(format): 가상 소멸·추상 계약·CLI 검증 | A | API, TEST, POLYMORPHISM | Adds abstractness, virtual-destruction, public-header, ownership-counter, and CLI checks. | Significant because it protects the object-model boundary, not merely formatter output, and detects failures that ordinary unit assertions would miss. |
| `4c34654a4602` | feat(factory): 문자열 명세로 formatter 생성 | A | ARCH, POLYMORPHISM, API | Adds a polymorphic creator and grammar for constructing formatters from specifications. | This introduces an important creation boundary and raw-pointer ownership transfer used by the builder, though it remains one component of the larger pipeline architecture. |
| `970ff9b3f24c` | test(factory): formatter 명세 분류 검증 | B | TEST, EDGE | Tests valid factory specifications and distinguishes malformed from unknown input. | Expected grammar and error-taxonomy coverage for the factory. |
| `fc0b8b7a40a0` | feat(factory): formatter 임시 소유와 pipeline 교체 구현 | A | OWNERSHIP, INTEGRATION, EXCEPTION | Adds RAII ownership of factory results and pipeline replacement from a specification list. | Significant integration of two ownership models; the initial target-mutation order is later corrected, so it is not the final decisive transaction design. |
| `536f1d329617` | test(factory): builder 소유권 이전 검증 | B | TEST, OWNERSHIP | Verifies builder ordering, empty replacement, and null/count validation. | Normal coverage of the first builder implementation. |
| `907bfbd5c37c` | fix(factory): 교체 실패에도 기존 파이프라인 보존 | S | DEBUG, EXCEPTION, CORE | Builds a complete candidate pipeline before swapping it into the target. | Project-defining correction: it identifies the real partial-replacement flaw and establishes the strong transactional pattern later mirrored by batch state replacement. |
| `0f5928bcbabb` | feat(factory): 명세 기반 파이프라인 CLI 제공 | B | INTEGRATION | Adds the specification-driven pipeline CLI. | A straightforward process adapter over the corrected builder and factory APIs. |
| `466d7abdb60f` | test(factory): 교체 실패 상태 보존과 CLI 검증 | B | TEST, EXCEPTION | Adds regression and CLI checks for failed replacement preserving the prior pipeline. | Important but focused confirmation of the preceding S-level correction; broader failure-point evidence follows later. |
| `af4e35ca7d92` | test(factory): 생성·복제·할당 실패 정리 검증 | A | TEST, EXCEPTION, OWNERSHIP | Sweeps creation, clone, and allocation failures while checking cleanup and target preservation. | Significant failure-path evidence across several ownership transitions, without introducing a new architecture. |
| `6a3d0461faab` | feat(scalar): scalar 리터럴 문법과 종류 분류 | A | PARSING, ARCH, NUMERIC | Introduces an intermediate scalar-literal model and explicit ASCII grammar. | Significant because it separates parsing from projection and creates the semantic boundary used by all scalar conversions. |
| `a863f4899a93` | feat(scalar): locale 고정 수치 추출과 경계 보존 | A | NUMERIC, PARSING, HARD | Hardens locale-independent numeric extraction, suffix grammar, negative zero, overflow, and underflow handling. | A difficult boundary-correctness commit: it prevents accepted text from silently changing meaning, but its significance is confined to the scalar subsystem. |
| `fc7faa10dc66` | test(scalar): literal 문법과 수치 범위 검증 | A | TEST, NUMERIC, EDGE | Adds exhaustive scalar grammar and numerical-boundary tests. | The suite establishes evidence for subtle negative-zero, overflow, underflow, and malformed-token cases that normal examples would not cover. |
| `6abbb64a1c0c` | feat(scalar): 문자와 정수 투영 결과 출력 | B | NUMERIC, CORE | Adds public character and integer scalar projections with representability checks. | Normal implementation within the parser/projection architecture already established. |
| `7cdcec341fb1` | feat(scalar): 부동소수점 표현과 원자 출력 구현 | A | NUMERIC, DETERMINISM, EXCEPTION | Adds float and double projections plus classic-locale staged rendering. | Significant because it handles target-specific underflow and special values while preventing formatting failures from exposing a partial report. |
| `47ef67e3c03a` | feat(scalar): type boundary CLI의 scalar mode 제공 | B | INTEGRATION | Adds the scalar mode to the type-boundary CLI. | A straightforward command adapter over the converter. |
| `afea789fd753` | test(scalar): 변환 가능성·출력·CLI 오류 검증 | A | TEST, NUMERIC, DETERMINISM | Verifies exact projections, locale independence, stream-state preservation, public headers, and CLI errors. | Significant integration and boundary evidence for the completed scalar subsystem, not a new core mechanism. |
| `52a9003a9be6` | feat(rtti): 다형 객체의 실행 시간 타입 식별 | B | POLYMORPHISM, CORE | Adds a small RTTI hierarchy, factory, pointer/reference identification, and names. | A competent type-boundary feature; the dynamic-cast strategy is direct and local rather than architecturally central. |
| `8a49a13afe21` | test(rtti): pointer·reference 식별 경계 검증 | B | TEST, POLYMORPHISM | Tests registered, unknown, and null runtime types plus virtual deletion. | Expected behavioral and lifecycle coverage of the RTTI utility. |
| `8e94677a6674` | feat(serialization): 빌린 객체 주소를 token으로 왕복 | B | OWNERSHIP, API | Adds pointer-to-integer round trips for borrowed `Payload` addresses. | The ownership distinction is important, but the implementation is a narrow demonstration rather than a major mechanism. |
| `bd677962c9c3` | test(serialization): null과 주소 동일성 검증 | B | TEST, OWNERSHIP | Verifies pointer identity, aliasing, null, heap/stack cases, and expired-token non-use. | Normal contract coverage of the borrowed-address boundary. |
| `41af772a7d80` | feat(casts): runtime type CLI mode 추가 | B | INTEGRATION, POLYMORPHISM | Adds the runtime-type CLI mode. | A simple integration of existing factory and RTTI behavior. |
| `bde686cd4af2` | feat(casts): address token CLI mode 추가 | B | INTEGRATION, NUMERIC | Adds an overflow-aware address-token CLI mode. | Competent boundary parsing and demonstration, but it does not change the serializer contract. |
| `5dcf4615329a` | test(casts): 타입·주소 변환의 공개 경계 검증 | A | API, TEST, OWNERSHIP | Adds compile-fail and CLI checks for utility construction, unrelated types, constness, and address parsing. | Significant because it makes several unsafe type-boundary misuses unrepresentable at the public interface. |
| `708c025ef2a0` | feat(template): 임의 접근 container batch 추상화 추가 | S | ARCH, GENERIC, CORE | Introduces `RandomAccessBatch` over configurable random-access containers and cross-container range equality. | Project-defining: it establishes the generic container abstraction that the final batch engine uses to compare vector and deque behavior. |
| `aaeff163baf8` | test(template): iterator·정렬·복사 실패 계약 검증 | A | TEST, GENERIC, EXCEPTION | Tests iterators, algorithms, vector/deque substitution, copying, and throwing element types. | Significant evidence that the template's generic and exception guarantees survive nontrivial element behavior. |
| `57a25e8475ab` | feat(rpn): signed token과 stack 문법 처리 | A | PARSING, NUMERIC, CORE | Introduces signed decimal token parsing and the structural RPN stack language. | Significant foundation for the final computation subsystem, including exact `LONG_MIN` parsing, but arithmetic correctness is completed later. |
| `e1641a714172` | feat(rpn): overflow 검사 산술 연산 구현 | S | NUMERIC, HARD, CORE | Implements checked addition, subtraction, multiplication, and division before signed operations execute. | Project-defining correctness mechanism: avoiding undefined signed overflow, especially around `LONG_MIN`, is one of the branch's hardest and highest-risk algorithms. |
| `aa0cc5e3e063` | test(rpn): 산술 경계와 잘못된 token 검증 | A | TEST, NUMERIC, EDGE | Covers RPN syntax, operand order, all arithmetic boundaries, division by zero, and malformed stacks. | Significant regression evidence for the S-level arithmetic and parser contract. |
| `f3efec4f6897` | feat(batch): 작업 결과 값 객체 정의 | B | CORE | Adds the immutable `JobResult` value transported by batch processing. | A straightforward supporting value object. |
| `d0295f82614b` | feat(batch): 입력 문법과 원자 교체 구현 | S | ARCH, EXCEPTION, INTEGRATION | Implements whole-stream batch parsing, uniqueness, RPN evaluation, and swap-on-success replacement. | Project-defining integration: it combines parsing, arithmetic, containers, and state publication behind a strong transaction boundary. |
| `42d411e42268` | feat(batch): 결과 정렬과 직렬화 제공 | A | DETERMINISM, EXCEPTION, CORE | Adds total result ordering and classic-locale staged batch serialization. | Significant because canonical order and delayed publication are required for reproducible external behavior, though they extend the already established batch transaction. |
| `307605e4bbbf` | feat(batch): batch engine CLI 제공 | B | INTEGRATION | Adds RPN and batch modes to the final CLI. | Normal command adaptation over the completed library mechanisms. |
| `5a9381c4fa7f` | test(batch): 입력 검증·정렬·CLI 결과 검증 | A | TEST, PARSING, DETERMINISM | Adds broad batch grammar, ordering, stream-state, public-header, and CLI tests. | Significant subsystem-level confidence covering both accepted and rejected whole-stream operations. |
| `af57a8f9c5fe` | feat(batch): 두 container의 정렬 결과 대조 | A | GENERIC, INTEGRATION, DETERMINISM | Runs and sorts vector- and deque-backed batches, then rejects disagreement before commit. | A meaningful project-specific consistency check linking the generic abstraction to the final engine, but the engine's transaction model already exists. |
| `9ba0e7c897ed` | test(batch): 입력 순열과 출력 결정성 검증 | A | TEST, DETERMINISM, EDGE | Verifies input-permutation invariance, tie ordering, single-element behavior, and repeatable output. | Significant protection against comparator and container-order nondeterminism. |
| `ea23237ad506` | fix(batch): 입력 stream 종료 상태를 명확히 구분 | A | DEBUG, PARSING, EDGE | Distinguishes clean EOF, an unterminated final record, and actual stream failure. | A small but non-obvious root-cause fix that restores the batch input contract without changing its architecture. |
| `b4ddd78fb9aa` | test(batch): 입력·산술·할당 실패 뒤 상태 복원 검증 | A | TEST, EXCEPTION, RISK | Sweeps malformed input, arithmetic, stream, and allocation failures after seeding engine state. | Significant evidence that the multi-container transaction truly rolls back across all collaborating failure paths. |
| `4bbbfd191669` | test(contracts): 공개 include와 소유권 규칙 검증 | A | API, TEST, OWNERSHIP | Expands positive and negative compile contracts across every public header and ownership boundary. | Significant repository-wide enforcement of API shape and external-consumer assumptions. |
| `d9091fd91765` | test(rtti): integer에서 runtime kind로의 암시 변환 거부 | B | API, TEST | Adds a negative compile case rejecting implicit integer conversion to `RuntimeKind`. | A narrow type-safety regression inside an already comprehensive contract suite. |
| `6b30f7297245` | test(release): 정적 archive와 외부 dependency 검증 | B | PORTABILITY, API | Checks archive member/symbol manifests and platform dependency/RPATH properties. | Useful release validation within the established build architecture, but not central to object-model correctness. |
| `fb3dfc935bc5` | test(release): 실행 결정성과 메모리 해제 검증 | A | TEST, DETERMINISM, OWNERSHIP | Checks repeated CLI output and platform-supported leak freedom at process scope. | Significant practical evidence for two project-wide promises, though platform gating limits it to verification rather than architecture. |
| `91739a5f0b63` | build(check): undefined behavior 검사 대상 추가 | B | PORTABILITY, TEST | Adds a UBSan-instrumented implementation and test target. | Valuable dynamic validation, but it applies an established tool to existing mechanisms without restructuring them. |
| `2c99290b9268` | test(format): 복제 실패 뒤 부분 객체 정리 검증 | A | TEST, EXCEPTION, POLYMORPHISM | Sweeps clone failures during pipeline copy construction and assignment. | Significant because it directly verifies cleanup of partially constructed polymorphic owners, a difficult invariant not proven by success-path tests. |
| `0ad14a57cab6` | fix(contact): 할당 실패에도 저장 상태 보존 | A | DEBUG, EXCEPTION, OWNERSHIP | Copies a contact into a detached candidate before swapping and advancing the ring. | A small but important invariant restoration: allocation failure can no longer desynchronize stored value, cursor, and size. |
| `8930c4d17bc1` | test(contact): 연락처 교체 실패 회귀 검증 | A | TEST, EXCEPTION, EDGE | Sweeps allocation failures during full-book replacement and verifies logical order and leak baselines. | Significant regression evidence for the subtle ring-buffer transaction fixed immediately before it. |
| `01271d795d58` | test(consumer): 저장소 밖 공개 library 연결 검증 | A | API, INTEGRATION, PORTABILITY | Builds and runs a consumer outside the repository using only public headers and the archive. | Significant external-boundary verification that catches private include, working-directory, and packaging dependencies hidden by in-tree tests. |
| `9e07d3bc86d3` | test(boundary): 변환·배치 속성과 대용량 경계 검증 | A | TEST, DETERMINISM, EDGE | Adds fixed-seed scalar/RPN properties and a 4,096-job batch stress check. | Significant breadth and scale evidence with reproducible counterexamples, but it validates rather than creates the core algorithms. |
| `45e9bbfd6b75` | build(check): sanitizer와 portable 검사 계층 구성 | A | ARCH, PORTABILITY, TEST | Separates build, portable, and platform verification while adding ASan and UBSan layers. | Significant verification architecture: it makes host prerequisites explicit and prevents unavailable platform tools from weakening portable checks. |
| `ab441fa8737c` | test(portability): 지원 LP64 데이터 모델 검증 | B | PORTABILITY, API | Adds compile-time LP64 data-model assertions. | Important declaration of a supported ABI assumption, but it is a focused compatibility guard within the existing build profile. |
| `50565bd67e03` | ci: 지원 compiler와 platform matrix 검증 | B | PORTABILITY, TEST | Adds GCC/Clang Linux and Clang macOS CI with sanitizer coverage. | Normal automation of the already established verification targets; broad reach does not by itself make it architecturally significant. |
| `709124d5e2ed` | docs(project): 프로젝트 문서 정리 | C | - | Rewrites and expands project, architecture, contract, and verification documentation. | Documentation-only consolidation after implementation; useful for readers but it introduces no new executable behavior or invariant. |

# Development Threads

## Thread: Direct Ownership Becomes a Failure-safe Value
`aa3b5ba6c3c4` A — establishes the non-null owned `char[]` representation and a non-throwing swap
↓
`0bc528c7d58e` S — adds independent deep copies and copy-and-swap assignment
↓
`93faed0d67a2` A — extends the owner with self-safe, allocate-before-commit composition
↓
`47134f9e3b29` A — injects every observed allocation failure and disables copy elision

**Significance**

The sequence moves from merely owning memory to behaving as a regular value under success, aliasing, and failure. It establishes the copy-and-swap and detached-allocation patterns that later appear in polymorphic pipeline copying and transactional replacement.

## Thread: Polymorphic Cloning Becomes a Regular Owning Aggregate
`835d87865762` S — defines abstract formatter behavior, virtual destruction, and virtual copying
↓
`62ed45f8adf9` S — makes the pipeline own clones rather than borrow formatter lifetimes
↓
`bf4d9bed705c` S — deep-copies the heterogeneous owner and cleans partial construction
↓
`0427713637b8` A — verifies abstractness, virtual destruction, clone ownership, headers, and CLI behavior
↓
`2c99290b9268` A — sweeps clone failures through copy construction and assignment

**Significance**

This is the branch's central C++ object-model progression. Runtime polymorphism alone is insufficient; the history establishes who creates, copies, owns, and destroys each dynamic object, then proves that incomplete cloning cannot leak or corrupt an existing aggregate.

## Thread: Factory Assembly Acquires a Transaction Boundary
`4c34654a4602` A — introduces the creator abstraction and formatter specification grammar
↓
`fc0b8b7a40a0` A — immediately guards creator-owned raw pointers and assembles a target pipeline
↓
`907bfbd5c37c` S — replaces clear-then-build mutation with candidate-then-swap publication
↓
`466d7abdb60f` B — adds regression and CLI evidence for preservation after a rejected replacement
↓
`af4e35ca7d92` A — sweeps creation, clone, and allocation failures across the full ownership handoff

**Significance**

The first builder cleans resources but can still expose a partially rebuilt target. The correction identifies object-state atomicity as a separate concern from leak freedom and moves the commit point to one non-throwing swap after the entire candidate succeeds.

## Thread: Scalar Text Is Separated from Target Projection
`6a3d0461faab` A — creates an explicit scalar-literal grammar and intermediate semantic representation
↓
`a863f4899a93` A — preserves locale independence, negative zero, overflow, and nonzero-underflow boundaries
↓
`fc7faa10dc66` A — locks down valid and invalid grammar plus numerical edge conditions
↓
`7cdcec341fb1` A — adds canonical float/double projections and staged whole-report rendering
↓
`afea789fd753` A — verifies exact output, stream noninterference, public headers, and CLI failure behavior

**Significance**

Parsing and rendering evolve as separate responsibilities. The thread prevents permissive stream extraction or host locale from silently changing source meaning, then ensures that the four projections are published as one deterministic report rather than a partially formatted prefix.

## Thread: Checked RPN Evaluation Avoids Undefined Arithmetic
`57a25e8475ab` A — parses complete signed decimal operands and establishes stack-shape rules
↓
`e1641a714172` S — adds precondition checks for all four signed operations
↓
`aa0cc5e3e063` A — verifies literal limits, every overflow direction, operand order, and malformed expressions

**Significance**

The core lesson is that detecting signed overflow after performing it is too late. The evaluator instead reasons about limits and unsigned magnitudes, including the one-extra-unit magnitude of `LONG_MIN`, before committing any arithmetic result.

## Thread: Generic Containers Converge in a Transactional Batch Engine
`708c025ef2a0` S — defines the configurable random-access batch abstraction and cross-container range comparison
↓
`aaeff163baf8` A — proves iterator, algorithm, container-substitution, and throwing-value behavior
↓
`d0295f82614b` S — integrates record parsing, duplicate detection, RPN evaluation, and swap-on-success publication
↓
`42d411e42268` A — adds a total result order and classic-locale staged serialization
↓
`af57a8f9c5fe` A — sorts vector and deque candidates independently and rejects disagreement
↓
`9ba0e7c897ed` A — verifies permutation invariance and byte-identical repeated output
↓
`ea23237ad506` A — distinguishes clean EOF and a final unterminated record from input failure
↓
`b4ddd78fb9aa` A — sweeps syntax, arithmetic, stream, and allocation failures while preserving seeded state

**Significance**

The final subsystem composes most earlier ideas: generic containers, checked arithmetic, deterministic order, local candidates, and delayed publication. Later commits refine what constitutes successful stream completion and prove that no collaborating failure path can expose a partial batch.

## Thread: ContactBook Replacement Gains the Guarantee Used Elsewhere
`2f9b934b0825` B — initially replaces the selected ring slot through ordinary `Contact` assignment
↓
`0ad14a57cab6` A — prepares a detached replacement and swaps it before advancing ring metadata
↓
`8930c4d17bc1` A — sweeps allocation failures at full capacity and verifies order, values, and leak baselines

**Significance**

The late correction shows that strong guarantees apply even to a small fixed array when a value assignment can allocate. Slot content, `next_`, and `size_` form one logical transaction; the fix aligns this early subsystem with the candidate-and-swap discipline established later in the branch.

## Thread: Verification Expands from In-tree Tests to Supported Release Claims
`6e78ced59357` A — introduces unit, compile-contract, and CLI integration layers
↓
`4bbbfd191669` A — expands positive and negative public contracts across the library
↓
`01271d795d58` A — compiles and runs a consumer outside the repository
↓
`9e07d3bc86d3` A — adds fixed-seed properties and large-batch stress
↓
`45e9bbfd6b75` A — separates build, portable, and platform checks and splits ASan from UBSan
↓
`ab441fa8737c` B — makes the supported LP64 ABI assumptions executable
↓
`50565bd67e03` B — runs the established claims across GCC, Clang, Linux, and macOS

**Significance**

The branch progressively narrows the gap between source-level intent and a supportable release claim. Each layer addresses a different blind spot: interface shape, external packaging, state-space breadth, undefined behavior, host prerequisites, ABI assumptions, and compiler/platform variation.

# Most Important Commits

## feat(buffer): 깊은 복사와 정규 대입 구현
Commit: `0bc528c7d58e`
Importance: S
Tags: OWNERSHIP, EXCEPTION, CORE

### Problem
`TextBuffer` directly owns a dynamically allocated NUL-terminated array. The initial non-copyable form avoids double deletion, but it cannot participate as an ordinary value in later transformations and aggregates. A shallow copy would couple lifetimes and make destruction unsafe.

### Decision
The commit implements a deep-copy constructor and copy-and-swap assignment. A complete replacement is allocated before the target changes, and the existing non-throwing `swap()` becomes the commit operation.

### Why it mattered
This is the first complete expression of regular value semantics over a manually owned C++98 resource. It establishes independent ownership, self-assignment safety, and the strong assignment guarantee without relying on C++11 move operations or smart pointers.

### What changed
Copy construction becomes public and duplicates `size + 1` bytes, including the terminator. Assignment constructs a temporary copy, swaps state, returns the target reference, and lets the temporary release the former allocation.

### Why this is important for understanding the project
Later formatter results, pipelines, factory candidates, and batch values rely on the same principle: construct an independent complete value first and publish it through a non-throwing exchange.

## feat(format): 다형적 formatter 인터페이스 정의
Commit: `835d87865762`
Importance: S
Tags: ARCH, POLYMORPHISM, OWNERSHIP

### Problem
The formatting stage needs several interchangeable transformations and later must store them without knowing their concrete types. Ordinary copying through a base object would slice derived state, and deletion through a non-virtual base would be unsafe.

### Decision
The commit defines an abstract `Formatter` with a virtual destructor, virtual `clone()`, virtual `apply()`, and a stable name. Concrete uppercase, prefix, and suffix implementations provide their own virtual copies.

### Why it mattered
It establishes the project's polymorphic ownership protocol. Dynamic behavior, copying, and destruction are made explicit at one interface instead of being reconstructed by every owner.

### What changed
A new public hierarchy and implementations are added. Stateful formatters own `TextBuffer` configuration, and `clone()` returns independent heap objects preserving the dynamic type.

### Why this is important for understanding the project
`FormatPipeline`, `FormatterCreator`, `PipelineBuilder`, copy-failure cleanup, and compile-time abstractness tests all derive from this contract.

## feat(format): formatter 소유 pipeline 구현
Commit: `62ed45f8adf9`
Importance: S
Tags: ARCH, POLYMORPHISM, OWNERSHIP

### Problem
A pipeline must keep heterogeneous formatter steps after caller-owned prototypes leave scope. Borrowing references would make pipeline validity depend on external lifetimes, while storing base objects by value would slice dynamic behavior.

### Decision
`FormatPipeline` clones each appended formatter and becomes the sole owner of the resulting pointer. It applies the owned steps in order, deletes them at destruction, enforces a fixed capacity, and exposes non-throwing whole-state swap.

### Why it mattered
The commit turns the virtual interface into an actual lifecycle architecture. It defines the boundary between borrowed formatter prototypes and owned dynamic steps.

### What changed
A fixed pointer array and size become the pipeline representation. `append()` checks capacity, clones before incrementing size, `apply()` folds a copied input through the steps, and the destructor releases exactly the stored prefix.

### Why this is important for understanding the project
The later deep-copy and factory threads are not merely about formatting; they are about safely transferring, duplicating, and replacing this heterogeneous ownership graph.

## feat(format): pipeline 깊은 복사 구현
Commit: `bf4d9bed705c`
Importance: S
Tags: OWNERSHIP, EXCEPTION, POLYMORPHISM

### Problem
An owning pointer array cannot use compiler-generated copying. Cloning several dynamic steps can fail after a prefix has already been allocated, and an incomplete object's destructor will not run.

### Decision
The copy constructor initializes every slot, clones in order through `append()`, catches any failure, deletes the successfully built prefix, and rethrows. Assignment uses a complete copy followed by `swap()`.

### Why it mattered
This solves the branch's most demanding object-lifecycle case: deep copying heterogeneous dynamic state while preserving both leak freedom and the target's prior value under failure.

### What changed
Copy construction and assignment become public. Explicit constructor cleanup handles partial objects, while copy-and-swap supplies transactional assignment and naturally supports self-assignment.

### Why this is important for understanding the project
It demonstrates why destructor correctness alone is insufficient during constructor failure and provides the lifecycle basis for transactional factory replacement.

## fix(factory): 교체 실패에도 기존 파이프라인 보존
Commit: `907bfbd5c37c`
Importance: S
Tags: DEBUG, EXCEPTION, CORE

### Problem
The initial builder correctly deleted temporary factory products but cleared and rebuilt the target incrementally. An exception from a later specification therefore preserved memory safety while still losing the previous pipeline or exposing a partial replacement.

### Decision
The commit constructs every new step inside a local candidate and swaps the candidate into the target only after all creation and cloning succeeds.

### Why it mattered
It separates two different guarantees: cleaning resources and preserving committed state. The correction locates the transaction boundary at the multi-step replacement operation rather than expecting individual allocations to compensate for earlier mutation.

### What changed
`target.swap(empty)` and direct appends to `target` are replaced by appends to `candidate`, followed by one final `target.swap(candidate)`.

### Why this is important for understanding the project
Candidate-then-swap becomes the clearest expression of the project's failure philosophy and reappears in batch replacement and the later `ContactBook` correction.

## feat(template): 임의 접근 container batch 추상화 추가
Commit: `708c025ef2a0`
Importance: S
Tags: ARCH, GENERIC, CORE

### Problem
The final exercise must apply the same indexed, iterable, sortable behavior to more than one container representation and compare their results without duplicating the entire algorithm.

### Decision
The commit introduces a header-only template parameterized by value and container type, exposing the container's iterator types, checked access, insertion, sorting, copy-and-swap assignment, and cross-container range equality.

### Why it mattered
It establishes the generic boundary later instantiated with both `std::vector` and `std::deque`. Requiring `std::sort` deliberately makes random-access iteration an executable template requirement rather than an undocumented assumption.

### What changed
`RandomAccessBatch<T, Container>` and `equal_ranges()` are added entirely in the public header so consumer translation units can instantiate them.

### Why this is important for understanding the project
The final batch engine's two-container consistency check and its template/iterator learning objective depend on this abstraction.

## feat(rpn): overflow 검사 산술 연산 구현
Commit: `e1641a714172`
Importance: S
Tags: NUMERIC, HARD, CORE

### Problem
C++ signed overflow is undefined behavior, so an evaluator cannot safely compute a result and then test whether it exceeded the range. Multiplication and division also have difficult cases caused by the larger magnitude of `LONG_MIN`.

### Decision
Every operator checks its preconditions before executing the signed operation. Addition and subtraction compare against limit margins, multiplication uses sign and unsigned magnitude reasoning, and division rejects zero and `LONG_MIN / -1`.

### Why it mattered
The commit makes numerical error handling trustworthy rather than itself undefined. It solves the highest-risk algorithmic boundary in the branch and supports both direct RPN use and every batch record.

### What changed
Checked operator helpers, magnitude conversion, operator recognition, stack pops in right-then-left order, and domain-specific overflow or invalid-expression exceptions are added.

### Why this is important for understanding the project
Batch correctness depends on this evaluator, and the implementation is a concrete example of reasoning from the language's valid-operation domain rather than from post-hoc results.

## feat(batch): 입력 문법과 원자 교체 구현
Commit: `d0295f82614b`
Importance: S
Tags: ARCH, EXCEPTION, INTEGRATION

### Problem
A batch replacement combines stream consumption, record parsing, identifier validation, duplicate detection, RPN evaluation, allocation, and result accumulation. Publishing each successful prefix would leave the engine in a state that never represented one fully accepted input.

### Decision
The commit performs all work in local candidate containers and a local duplicate map, rejects empty or failed input, and swaps the finished result vector into the engine only after the complete stream succeeds.

### Why it mattered
This is the final integration of the branch's object and failure models. Many independent failure sources are placed behind one commit point, giving the engine a strong state guarantee without rollback code.

### What changed
`BatchEngine`, its record grammar, duplicate tracking, RPN integration, candidate results, const result access, and swap-on-success replacement are introduced.

### Why this is important for understanding the project
Subsequent ordering, dual-container checks, stream-state correction, and allocation-failure sweeps all refine or verify this transaction rather than replacing its architecture.
