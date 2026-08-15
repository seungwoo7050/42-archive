# Project Importance Profile
Project: `small-shell` on branch `c/minishell`
Domain: C99/POSIX command interpreter and process-runtime engineering
Primary Purpose: Read a limited shell language from standard input; preserve quote semantics; parse commands, pipelines, redirects, heredocs, and conditional sequences; expand environment and status values; execute parent-stateful builtins and forked commands; and make resource and failure behavior observable and recoverable.
Resolved Commit Scope: The complete independent, linear 78-commit ancestry of `c/minishell`, from root `30d34c745714` through tip `3ed97fb01ff3`. The scope contains 76 non-documentation engineering commits and two documentation-only commits. No merge commits or unrelated inherited ancestors are present. Twelve-character abbreviations uniquely identify every commit in scope.

## Core Technical Areas
- Quote-aware lexical representation and parser ownership for commands, redirections, pipelines, and connector sequences.
- Expansion of environment variables and prior status at the correct execution time.
- Parent-versus-child builtin behavior, shell environment mutation, and exit-status contracts.
- Fork, exec, wait, multi-stage pipeline topology, and partial-process lifecycle recovery.
- File-descriptor ownership for pipes, redirects, parent standard streams, and heredoc temporary storage.
- Heredoc delimiter provenance, ordered precollection, body expansion, input-boundary recovery, and stdin installation.
- Recoverable allocation and I/O failure propagation across construction, execution, and the command loop.
- Deterministic fault injection, lifecycle probes, timeout containment, sanitizers, and end-to-end regression verification.

## Core Architecture
- `shell_loop` owns top-level line acquisition and keeps `t_shell` environment, last status, and running state across commands.
- `tokenize_line` converts source text into owned tokens while preserving literal-marker semantics and whether any quote syntax participated in a word.
- `parse_tokens` copies token data into an owned hierarchy: a sequence of pipelines, each pipeline containing commands, each command containing argv and ordered redirections.
- Heredocs are collected for the complete parsed line before connector gating; entries are keyed by the address of their owning redirection node and are released before the parsed tree.
- `execute_pipeline_list_ctx` applies connector gating, expands only a selected pipeline using current shell state, and dispatches either a parent command or a forked pipeline.
- Parent-stateful builtins and redirection-only commands run in the shell process behind standard-stream save/apply/restore boundaries; pipeline members and external commands run in children.
- Runtime wrappers isolate allocation and system-call boundaries for production delegation and deterministic test failure injection.
- A source-level `t_sequence` and hook executor remain as a parser-testing seam, while the product path uses `shell_process_line` and the concrete executor.

## Critical Invariants
- Parsed ownership is hierarchical and unambiguous: every published token, argv entry, redirection, command, pipeline, heredoc body, PID, and descriptor has one cleanup owner.
- Quote effects survive every necessary stage. Final delimiter text may be dequoted, but quote provenance must remain available to decide heredoc body expansion.
- Connector decisions use the immediately preceding status, and a skipped pipeline is neither expanded nor executed.
- A recorded child PID remains the parent's responsibility until that child has been terminated or observed; partial pipeline creation must not hang or leave zombies.
- Every process closes pipe ends it does not need, and parent standard streams are restored before the next command; unrecoverable restoration stops the shell.
- Heredoc preparation failure must not shift the boundary between heredoc body data and future commands.
- Temporary heredoc write, flush, seek, descriptor, and duplication failures cannot be reported as successful command input.
- Allocation failure either leaves the previous valid state intact or releases the entire partial result; low-level helpers do not terminate a running shell arbitrarily.
- EOF is normal termination, while read or write failure is explicit status-bearing failure; continued execution is allowed only when the next command boundary remains trustworthy.
- External-command and child termination statuses preserve the project's 126, 127, normal-exit, signal, and low-eight-bit exit contracts.

## Major Engineering Difficulties
- Designing a compact representation that preserves shell binding rules and quote semantics without a full POSIX-shell AST.
- Coordinating expansion timing with conditional short-circuiting and mutable `$?` state.
- Implementing pipeline descriptors and child ownership correctly under mid-construction fork, wait, and cleanup failure.
- Carrying heredoc meaning across lexer, parser, input collection, expansion, execution context, and redirection while keeping stream position recoverable.
- Replacing fatal allocation behavior with transactional construction and caller-visible errors across multiple mutually dependent subsystems.
- Making rare failure paths reproducible without changing production semantics, then verifying that no descriptors, children, partial state, or unread heredoc data escape.
- Removing quadratic string construction while preserving marker encoding, overflow checks, and atomic ownership transfer.

## Practical Engineering Areas
- Validation of malformed syntax, identifiers, exit arguments, and public API nullability.
- Exact error and status propagation rather than delayed or silently ignored stdio/system-call failure.
- Cleanup ordering for partial allocations, descriptors, processes, environment replacements, and heredoc bodies.
- EINTR-aware and short-operation-aware I/O boundaries.
- Deterministic fault injection by operation, call position, phase, and command number.
- Test isolation through process groups, monotonic deadlines, resource limits, lifecycle probes, and separate sanitizer artifacts.
- End-to-end regression assertions for output, status, diagnostics, performance, and continuation behavior.

## S-level Criteria
- Establishes the durable parsed representation, execution model, or cross-stage semantic contract on which several later subsystems depend.
- Implements a defining shell mechanism whose omission would leave the process, pipeline, heredoc, or conditional-execution architecture unexplained.
- Restores a severe, non-obvious ownership or semantic invariant at its root cause across subsystem boundaries.
- Replaces the global failure model in a way that materially determines how every major construction path behaves.

## A-level Criteria
- Establishes or hardens an important component boundary, resource lifecycle, API contract, failure path, or testability seam.
- Corrects a meaningful edge case whose failure can corrupt shell state, stream position, process ownership, descriptors, or truthful status reporting.
- Provides regression evidence for a difficult failure or cross-stage invariant rather than routine normal-path coverage.
- Introduces a reusable structural or performance abstraction with substantial effect but without redefining the whole project.

## Typical B-level Work
- Implements expected shell features or supporting steps inside an established parser, environment, builtin, expansion, or execution design.
- Applies an already selected abstraction to another module.
- Adds routine behavior, compatibility, build support, or regression coverage for an established contract.
- Fixes a narrow and straightforward defect without changing a major responsibility or ownership boundary.

## Typical C-level Work
- Documentation-only changes, dead-interface removal, and other changes with little or no executable or structural consequence.
- Mechanical cleanup whose omission would not impede understanding of the project's mechanisms, invariants, or difficult corrections.

## Project-specific Tags
LEX_PARSE — lexical encoding, parser structure, syntax validation, and parsed-object ownership
EXPANSION — dequoting, variable/status expansion, and expansion timing
SHELL_STATE — environment, builtins, shell lifetime, and status visible across commands
PROCESS — fork, exec, wait, child ownership, and pipeline process topology
FD_IO — pipes, redirections, standard streams, temporary streams, reads, and writes
HEREDOC — delimiter provenance, body collection/expansion, stream recovery, and stdin integration
FAILURE — explicit error propagation, partial-failure cleanup, recovery, and deterministic fault seams

# Commit Classification
| Commit | Subject | Importance | Tags | Summary | Why |
| --- | --- | --- | --- | --- | --- |
| `30d34c745714` | `docs(readme): 프로젝트 목적과 초기 규약 정의` | C | - | Defines the project goal, intended shell subset, engineering rules, and exclusions. | This is useful scope evidence but changes only documentation; it does not establish executable behavior or a code-level contract. |
| `7db501698117` | `build(shell): C99 실행 골격 구성` | B | PRACTICAL | Adds the C99 build, ignored artifacts, and a minimal executable entry point. | The commit is necessary scaffolding and fixes the compiler contract, but the structure is conventional and contains little project-specific technical judgment. |
| `d4b36e22b964` | `feat(input): 표준 입력 반복과 EOF 처리 연결` | B | CORE, PRACTICAL | Introduces line acquisition, interactive prompting, the shell loop, and clean EOF termination. | This creates the basic runtime loop, but it is a straightforward implementation inside the initial shell skeleton rather than a defining parser or execution decision. |
| `03d1186bd580` | `build(input): 선택적 readline 입력 경로 제공` | B | PRACTICAL | Adds an optional Readline-backed interactive path while retaining the dependency-free reader. | The dual build path is a competent compatibility choice, but it affects input convenience rather than the shell's core semantics or ownership model. |
| `aba2c0a8c317` | `feat(utils): 문자열 소유권 도구 제공` | B | PRACTICAL | Adds allocation, duplication, substring, joining, and string-vector ownership helpers. | These helpers support nearly every later subsystem, but the commit implements standard utility behavior and initially uses a fatal allocation policy that later history replaces. |
| `c5804e11700d` | `feat(utils): 종료 상태 문자열 변환 제공` | B | SHELL_STATE | Adds an owned decimal-string conversion for shell status values. | The helper enables later status expansion, but it is a small supporting operation within an already established utility layer. |
| `bc309f93ffa1` | `feat(utils): 환경 식별자 문자 판정 제공` | B | SHELL_STATE, PRACTICAL | Defines the character rules used for environment names and variable expansion. | The validation rule is shared and correctness-relevant, but its implementation is routine and does not independently shape the architecture. |
| `e66c9e5dc366` | `feat(env): 프로세스 환경 적재와 수명 관리` | B | SHELL_STATE, CORE | Imports `envp` into an owned linked list and ties its lifetime and final status to the shell. | This is normal foundational state management. It establishes storage needed by later features but does not yet define mutation, expansion, or execution semantics. |
| `5e5c34d5cc4a` | `feat(env): 환경 조회와 변경 연산 제공` | B | SHELL_STATE, CORE | Adds validated lookup, insert-or-update, export marking, and removal operations. | The operations are central to builtins and expansion, but they are conventional linked-list mutations within the environment model already chosen. |
| `abe21515ae5d` | `feat(env): export 배열과 출력 뷰 생성` | B | SHELL_STATE, INTEGRATION | Serializes exported variables for child processes and prints normal or declaration-style views. | This integrates the environment store with execution and builtins, but it is a direct projection of existing state rather than a new system-wide decision. |
| `28692330e070` | `feat(env): 공개 환경 저장소 어댑터 제공` | B | SHELL_STATE, PRACTICAL | Adds a sentinel-compatible public adapter around the internal environment list. | The adapter is a meaningful API seam, but final product code does not depend on the alternate representation and the layer is later removed as unused. |
| `729a6d2a7d4a` | `feat(lexer): 인용 단어와 토큰 수명 관리` | A | LEX_PARSE, EXPANSION, CORE | Introduces owned word tokens and preserves single-quote literal semantics with an internal marker. | Quote effects must survive tokenization until expansion. This representation is an important cross-stage contract, although later work is still required to preserve all heredoc quote provenance. |
| `062b16e631af` | `feat(lexer): 셸 연산자를 토큰으로 구분` | B | LEX_PARSE, CORE | Recognizes pipes, redirects, conditional connectors, sequences, and rejects unsupported standalone `&`. | The commit extends normal lexical coverage using the token model already established; it does not yet determine how those operators bind or execute. |
| `48670b845d7f` | `feat(parser): 명령 트리 소유권 모델 정의` | S | ARCH, LEX_PARSE, CORE | Defines pipeline, command, redirection, connector, and recursive cleanup ownership structures. | This is the durable representation on which parsing, expansion, heredoc storage, execution, and cleanup all depend. Omitting it would leave a major gap in explaining the project's architecture and ownership story. |
| `a209a95a84d3` | `feat(parser): 인자와 리다이렉션 구문 구성` | B | LEX_PARSE, CORE | Builds one command's argument vector and ordered redirection list from tokens. | This is necessary parser implementation inside the ownership model already selected. Its allocation and syntax handling are competent but not independently project-defining. |
| `8624028b83bb` | `feat(parser): pipe로 명령을 pipeline에 결합` | A | LEX_PARSE, CORE, INTEGRATION | Groups commands into a pipeline and rejects empty or trailing pipe stages. | The commit establishes the parser boundary between a command and a pipeline, a core structural distinction later consumed by process execution. It is significant, though narrower than the full sequence architecture. |
| `f297aaad70fe` | `feat(parser): 조건 연결자를 sequence로 결합` | S | ARCH, LEX_PARSE, CORE | Represents semicolon and conditional connectors as an ordered list of complete pipelines. | This fixes operator binding and partial-parse cleanup at the representation level. It determines later short-circuit execution and is indispensable to understanding the shell's control-flow model. |
| `28c0f6142b04` | `feat(parser): 공개 sequence parse 수명 제공` | B | LEX_PARSE, PRACTICAL | Adds initialization, parsing, counting, and destruction for a public sequence object. | The API packages established parser behavior for callers and tests, but it does not change the grammar or the product execution path. |
| `908f5b4a5f1f` | `feat(parser): hook 기반 sequence 실행 seam 제공` | B | LEX_PARSE, TEST | Adds a callback-driven sequence executor with connector gating and status propagation. | The seam is useful for isolated structural tests, but the finished product uses its own execution path; its architectural influence is therefore limited. |
| `af00b2b27a9f` | `feat(expand): 인용 표식 제거 경로 제공` | B | EXPANSION, PRACTICAL | Adds an API that removes internal literal markers and returns an owned word. | This is a straightforward first expansion primitive. The important variable and timing semantics are established by later commits. |
| `19de6b219314` | `feat(expand): 환경과 종료 상태 단어 확장` | A | EXPANSION, SHELL_STATE, CORE | Expands `$NAME` and `$?` while respecting literal markers and unset values. | Variable and status expansion are core shell semantics, and the implementation establishes how lexical quote encoding controls them. The decision is significant but remains local to one word. |
| `97ae61c93478` | `feat(expand): argv와 리다이렉션 확장 연결` | A | EXPANSION, INTEGRATION, CORE | Applies word expansion to command arguments and redirection targets across parsed pipelines. | This turns the word primitive into executable behavior and establishes ownership replacement for expanded fields. Later delayed execution refines when this integration occurs. |
| `5d83c7297f22` | `feat(builtin): echo 출력 명령 제공` | B | SHELL_STATE, CORE | Introduces builtin dispatch and `echo` with repeated valid `-n` handling. | This is ordinary builtin implementation within a simple dispatch table; it does not establish a difficult state or lifecycle boundary. |
| `be6af8849df0` | `feat(builtin): pwd 작업 디렉터리 출력` | B | SHELL_STATE | Adds `pwd` using the process working directory and output error reporting. | The behavior is useful but straightforward and contained within the existing builtin framework. |
| `d2ad979af9fe` | `feat(builtin): cd 이동과 PWD 상태 동기화` | B | SHELL_STATE, CORE | Adds `cd`, HOME and OLDPWD resolution, and PWD/OLDPWD updates. | The commit implements expected stateful builtin behavior, but the design follows the established environment model and does not yet address parent execution or restoration failures. |
| `4632ea93a5f4` | `feat(builtin): env 환경 목록 출력` | B | SHELL_STATE | Adds argument-free `env` output from exported shell state. | This is a routine projection of the existing environment store and dispatcher. |
| `aa4e6bdbee01` | `feat(builtin): export 대입과 선언 출력` | B | SHELL_STATE, CORE | Adds assignment parsing, identifier validation, mutation, and declaration-style `export` output. | The feature is central to shell use but is normal implementation within previously established validation and environment contracts. |
| `c9c8b85c811e` | `feat(builtin): unset 환경 이름 제거` | B | SHELL_STATE | Adds `unset` by deleting named entries from the shell environment. | The commit is a small application of the existing environment mutation API. |
| `c8aa0e9a53fa` | `feat(builtin): exit 상태를 셸 수명에 연결` | B | SHELL_STATE, CORE | Adds numeric `exit`, argument validation, status normalization, and shell-loop termination. | It completes expected builtin behavior and connects status to lifetime, but the implementation is conventional and contained within the established shell state model. |
| `57f59cdd3449` | `feat(redirection): 파일 입출력 리다이렉션 적용` | A | FD_IO, CORE, RISK | Applies input, truncating output, and append redirections in source order with descriptor cleanup. | Redirection is a core mechanism and establishes ordered descriptor replacement and error cleanup. The logic is significant, though less structurally difficult than multi-process pipeline ownership. |
| `2852c12ed7bd` | `feat(exec): 부모 builtin의 표준 스트림 복원` | A | FD_IO, SHELL_STATE, RISK | Saves parent stdin/stdout, applies redirections, runs a parent builtin, then restores the streams. | Stateful builtins must execute in the parent without permanently corrupting its descriptors. This establishes a critical parent-process boundary later hardened for restore failures. |
| `7c9646e7cd79` | `feat(exec): 단일 명령을 자식에서 실행` | A | PROCESS, CORE, INTEGRATION | Forks external or non-parent commands, applies redirections, exports the environment, execs, and maps status. | This is a core execution mechanism integrating parser output, environment state, redirection, and POSIX process status. The implementation is significant but initially limited to one command. |
| `ae988017efd5` | `feat(exec): pipeline 자식 상태를 순서대로 회수` | B | PROCESS, CORE | Forks each parsed pipeline command, records PIDs, reaps them, and reports the last stage status. | The commit supplies necessary bookkeeping before descriptors are connected. It is a supporting step rather than the decisive pipeline mechanism. |
| `a71f98de0d92` | `feat(exec): 다단 pipeline의 pipe FD 연결` | S | PROCESS, FD_IO, CORE | Creates the pipe graph, wires each child stage, closes inherited ends, and isolates pipeline builtins. | This implements the defining multi-process shell mechanism and its descriptor ownership rules. Without it, the project's execution architecture and resource model cannot be explained coherently. |
| `13a70b408e89` | `feat(exec): 조건 연결자와 지연 확장 실행` | S | ARCH, EXPANSION, CORE | Short-circuits pipeline sequences and expands only the selected pipeline using the current status. | The commit aligns parsed control flow, mutable shell status, and expansion timing. It resolves a cross-subsystem semantic problem and determines the finished behavior of conditional execution. |
| `91ded56b033d` | `feat(shell): 한 줄 해석과 실행 수명 연결` | B | INTEGRATION, CORE | Connects tokenization, parsing, execution, status updates, diagnostics, and cleanup to each input line. | This is essential product assembly, but it mostly composes mechanisms already designed in earlier commits rather than introducing a new invariant. |
| `e65591bb66f5` | `feat(heredoc): 구분자 정규화 버퍼 구현` | B | HEREDOC, PRACTICAL | Adds a growable buffer that removes literal markers from a heredoc delimiter. | The buffer is supporting infrastructure for heredoc handling; collection, expansion, and execution contracts are established later. |
| `7c9692346824` | `feat(heredoc): 수집 본문 저장소 수명 관리` | A | HEREDOC, ARCH, RISK | Stores bodies by redirection-node identity in the execution context and defines their cleanup. | This is an important ownership decision because body lifetime must outlive collection but not the parsed line. It provides the state model required by later integration. |
| `fc9c63a03db2` | `feat(heredoc): 구분자별 본문 순차 수집` | A | HEREDOC, CORE, INTEGRATION | Walks parsed redirections in order, reads each body, warns on EOF, and records it. | Sequential precollection is a significant shell semantic and input-boundary decision. It turns the storage model into a usable multi-heredoc mechanism. |
| `aeb0d6cba9c1` | `feat(heredoc): 인용 여부에 따라 본문 확장` | A | HEREDOC, EXPANSION, CORE | Expands variables and status in unquoted heredoc bodies while preserving quoted bodies literally. | This implements a non-trivial semantic distinction across input and expansion. Its initial quote detection is incomplete, which later history exposes and corrects. |
| `d297bd2e8908` | `feat(redirection): heredoc을 stdin으로 연결` | S | HEREDOC, FD_IO, INTEGRATION | Makes `<<` first-class, precollects bodies, installs them through ordered redirection, and manages line-scoped lifetime. | The commit completes heredoc as a cross-layer mechanism spanning lexer, parser, input, expansion, execution context, and descriptor installation. It is central to the finished architecture. |
| `69ce1f7b2a0f` | `test(smoke): 주요 셸 명령 흐름 검증` | B | TEST, CORE | Adds an end-to-end smoke suite for builtins, expansion, status, pipelines, redirects, heredoc, syntax, EOF, and exit. | The suite creates the first broad behavioral baseline, but it verifies mostly normal paths already implemented rather than a difficult new invariant. |
| `314142a08dd5` | `test(redirection): 부모 명령의 표준 입출력 복원 검증` | B | TEST, FD_IO | Checks that parent-builtin redirections do not leak into following commands or lose environment mutations. | This is valuable regression coverage for a known parent boundary, but it exercises the normal restoration path rather than a subtle failure mode. |
| `6aeaeb413bfd` | `test(heredoc): 인용 구분자와 본문 확장 검증` | B | TEST, HEREDOC | Verifies that a single-quoted delimiter suppresses heredoc body expansion. | The test covers an important rule, but its single-quote form does not expose the incomplete quote-provenance heuristic. |
| `854f0f435c82` | `fix(heredoc): 구분자의 인용 상태를 실행 단계까지 보존` | S | HEREDOC, DEBUG, RISK | Carries token quote provenance into heredoc redirections instead of inferring it from encoded text. | This identifies the real cross-layer cause of incorrect double- and partial-quote behavior and restores the semantic invariant at the correct representation boundary. The correction is both non-obvious and project-defining. |
| `dce9e5c083fa` | `test(heredoc): 이중·부분 인용 구분자 회귀 검증` | A | TEST, HEREDOC, EDGE | Locks down expansion suppression for double-quoted and partially quoted heredoc delimiters. | These cases directly reproduce the provenance bug fixed immediately before them, materially protecting a critical cross-stage semantic contract. |
| `f62657b69766` | `test(exec): 다단 파이프와 리다이렉션 순서 검증` | B | TEST, FD_IO | Checks multi-stage data flow and that later redirects override earlier pipe or redirect destinations. | The tests verify expected ordering in the established executor; they do not introduce a new failure or ownership model. |
| `f0cc6a024cbe` | `test(status): 실행 불가 파일과 신호 종료 상태 검증` | B | TEST, PROCESS | Verifies status 126 for non-executable files and 128-plus-signal mapping. | These are important external contracts but straightforward regression cases for existing wait and exec error handling. |
| `e9c4da95fff1` | `test(parser): 조건 연결자와 잘못된 연산자 검증` | B | TEST, LEX_PARSE | Covers short-circuit behavior, malformed conditional positions, and unsupported standalone `&`. | The commit broadens ordinary syntax and control-flow coverage without exposing a new architectural defect. |
| `99ff06482cb4` | `fix(parser): 오류 출력 포인터 없이도 구문 실패 반환` | B | LEX_PARSE, EDGE | Uses an internal error slot so parsing still reports failure when the caller declines an error string. | This restores a clean public API contract with a focused local correction. It is meaningful but not central to the product architecture. |
| `5b9c1148b39a` | `test(parser): 공개 parser 오류 반환 검증` | B | TEST, LEX_PARSE | Adds source-level tests for valid, empty, malformed, null-output, and optional-error cases. | The tests protect the public seam, but that seam is secondary to the main shell execution path. |
| `915aa072298b` | `refactor(runtime): 프로세스 시스템 호출 경계 분리` | A | PROCESS, FAILURE, TEST | Wraps pipe, fork, and waitpid and adds deterministic call-index failure injection. | This creates the testability boundary needed to reason about partial process creation and wait failures. It materially enables later lifecycle corrections without changing production semantics. |
| `be2967a4b946` | `fix(exec): 부분 생성 파이프라인의 자식과 FD 회수` | S | PROCESS, FD_IO, FAILURE | Closes parent pipes, terminates already spawned children, and reaps every recorded PID after partial failure. | The previous failure path could hang or leave live or zombie children. This restores the parent's fundamental ownership invariant under the hardest pipeline lifecycle case and is essential to the reliability story. |
| `d611196b368e` | `test(exec): pipe·fork·wait 실패 회귀 검증` | A | TEST, PROCESS, FAILURE | Adds injected regressions for later pipe creation, mid-pipeline fork, and waitpid failure. | These cases validate the non-trivial partial-construction cleanup fixed immediately before them and materially increase confidence in process ownership. |
| `fd5c76c18c27` | `refactor(runtime): FD 시스템 호출 경계 분리` | A | FD_IO, FAILURE, TEST | Wraps dup, dup2, and open, including repeatable failure injection, and routes executor call sites through it. | The refactor makes descriptor save, application, and restoration failures reproducible. This is a significant testability and failure-boundary improvement, not merely a rename. |
| `2ca9f4299c7f` | `fix(redirection): 부모 표준 입출력 복원 실패 전파` | A | FD_IO, FAILURE, RISK | Retries restoration, reports transient failure, and stops the shell when parent descriptors cannot be recovered. | A parent that continues with corrupted stdin or stdout cannot preserve command boundaries. This fix restores a high-risk lifecycle invariant, though it is narrower than the overall execution architecture. |
| `13645f58d5e6` | `test(redirection): 저장·적용·복원 실패 회귀 검증` | A | TEST, FD_IO, FAILURE | Covers descriptor saving, redirect application, restoration, open failure, and persistent unrecoverable restore failure. | The suite verifies a broad and subtle parent-process failure matrix, including the decision to terminate when standard descriptors cannot be made trustworthy. |
| `64ad1e4b0ca8` | `refactor(runtime): heredoc 임시 파일 I/O 경계 분리` | B | HEREDOC, FAILURE, REFACTOR | Wraps temporary-stream flush, seek, and descriptor access for later fault injection. | This is a useful narrow seam following the established runtime-wrapper pattern. Its significance lies mainly in enabling the next fix and tests. |
| `9afdca85f5a5` | `fix(heredoc): 임시 파일 저장 오류를 전파` | A | HEREDOC, FD_IO, FAILURE | Checks body write, flush, seek, and fileno before duplicating heredoc input. | Silent temporary-stream failure could execute a command with truncated or invalid stdin. The fix restores data-integrity and status propagation at the correct I/O boundary. |
| `2fbc4c73af2c` | `test(heredoc): 임시 저장 실패의 데이터 절단 방지 검증` | A | TEST, HEREDOC, FAILURE | Injects flush and seek failures and verifies status 1 with continued command processing. | The tests protect a difficult data-loss failure path rather than merely checking ordinary heredoc output, which makes them significant regression evidence. |
| `0b2e76386678` | `refactor(runtime): 실행 경로의 동적 할당 래퍼 통합` | A | ARCH, FAILURE, TEST | Routes execution-path allocation through overflow-aware runtime wrappers. | The wrapper layer creates the common seam required for deterministic memory-failure analysis across input, heredoc, execution, and utilities. It prepares a major error-model change without yet completing it. |
| `0bb6f9de0947` | `fix(memory): 구조화 단계의 할당 실패를 명령 오류로 전파` | S | ARCH, FAILURE, RISK | Replaces fatal allocation helpers with transactional, nullable construction and caller-visible command errors. | This changes the project-wide failure architecture across environment, lexer, parser, expansion, APIs, startup, and the command loop. It establishes the invariant that partial structures never escape and arbitrary utilities do not terminate the shell. |
| `6d95776ede59` | `fix(memory): 실행 자원 할당 실패를 pipeline 오류로 전파` | A | PROCESS, FAILURE, RISK | Allocates pipe and PID tables before creating OS resources and propagates preparation failure as status 1. | The ordering keeps allocation failure side-effect free and closes the executor half of the recoverable-memory model. It is significant but builds directly on the global policy established in the preceding commit. |
| `c30b39c0bcf8` | `fix(heredoc): 준비 실패 뒤 입력 구분자 경계 복구` | A | HEREDOC, FAILURE, RISK | Consumes all pending heredoc delimiters after preparation failure so body text cannot become later commands. | This solves a severe stream-boundary problem under failure and uses marker-aware matching without relying on the failed allocation path. It is difficult and high-risk, but narrower than the defining normal-path heredoc architecture. |
| `2d3791748571` | `fix(input): EOF와 입력 실패를 구분` | A | FAILURE, SHELL_STATE, EDGE | Adds an explicit input-error channel, EINTR retry, overflow checks, and stricter heredoc recovery behavior. | The distinction determines whether the shell exits normally, reports status 1, or must stop because command boundaries are no longer recoverable. This is an important runtime API correction. |
| `342d33e4bfd4` | `fix(io): builtin과 환경 출력 실패를 상태로 전파` | A | FD_IO, SHELL_STATE, FAILURE | Introduces complete-write semantics and propagates prompt, builtin, environment, and state-update output failures. | The change makes output an owned part of command execution instead of a deferred stdio side effect. It is cross-cutting and restores truthful status reporting. |
| `476b082d55c7` | `test(memory): 범위별 할당 실패 순회 검증` | A | TEST, FAILURE, RISK | Sweeps allocation failure positions by processing phase and command while checking cleanup, state atomicity, and continuation. | This systematically verifies the new recoverable-allocation architecture across multiple subsystems and both transient and persistent failure, far beyond routine unit coverage. |
| `7e2fdea3affd` | `test(io): read·write와 heredoc 입력 실패 검증` | A | TEST, FAILURE, HEREDOC | Injects read and write failures and checks status, stream recovery, continuation, and forced termination when recovery also fails. | The tests validate command-boundary recovery, not just return codes. They lock down a non-trivial interaction between I/O failure and future input interpretation. |
| `45a5e07022a7` | `build(test): 테스트 시간 제한 하네스 추가` | A | TEST, PROCESS, FAILURE | Adds a monotonic timeout runner that owns a process group, kills descendants, and preserves exit or signal status. | A hung shell may already own pipeline children, so a simple per-process timeout is insufficient. The harness establishes a robust verification boundary for failure and lifecycle tests. |
| `b42e57eb7755` | `test(lifecycle): FD와 자식 프로세스 누수 검증` | A | TEST, PROCESS, FD_IO | Stress-tests descriptor reuse and probes for live or zombie direct children after pipelines complete. | These resources are not reliably observable through output assertions. The tests directly enforce the executor's central ownership invariants across repeated mixed workloads. |
| `750eedca204d` | `refactor(env): 사용하지 않는 환경 저장소 래퍼 제거` | C | REFACTOR | Deletes the unused sentinel-aware public environment wrapper layer. | This reduces dead API surface and duplicate ownership models, but it is a mechanical cleanup with no product behavior or major structural consequence. |
| `b8347c06b6c7` | `refactor(buffer): 가변 문자열 빌더 모듈 추가` | A | ARCH, PERF, REFACTOR | Introduces an overflow-safe geometrically growing builder with explicit discard and ownership transfer. | The abstraction replaces repeated whole-string copying and standardizes partial-result ownership for multiple core text-processing stages. It is a meaningful cross-module structural improvement. |
| `985f90b9cbc7` | `refactor(lexer): 단어 조립을 가변 버퍼로 전환` | B | LEX_PARSE, PERF, REFACTOR | Migrates token word construction and literal-marker encoding to the shared builder. | This is an important application of the new abstraction, but it follows the ownership and growth policy already established by the builder commit. |
| `89e1a06f06c9` | `refactor(expand): 확장 결과를 가변 버퍼로 조립` | B | EXPANSION, PERF, REFACTOR | Migrates expansion and dequoting from repeated joins to amortized-linear builder appends. | The change materially improves cost and preserves atomic cleanup, but it is the second application of an already decided abstraction rather than a new architecture. |
| `b36b9d324260` | `test(performance): 긴 입력 처리 시간 상한 검증` | B | TEST, PERF | Runs a 512 KiB word end to end under a five-second deadline and verifies exact output. | The test protects the intended asymptotic improvement, but performance is a supporting quality concern rather than the project's defining engineering problem. |
| `7d7dd7ad9d8a` | `build(test): ASan·UBSan 검증 경로 추가` | B | TEST, PRACTICAL | Builds separate sanitizer artifacts and runs the full suites locally and in a reproducible container target. | This is strong practical validation infrastructure, but it does not itself change a core mechanism or establish a new runtime invariant. |
| `6dff1ba86ba6` | `fix(exec): pipe 생성 실패 시 PID 배열 해제` | B | FD_IO, FAILURE, DEBUG | Frees the preallocated PID table when pipe creation fails before any child is spawned. | The fix closes a real leak on a narrow preparation path, but the root cause and correction are straightforward within the ownership model already established. |
| `3ed97fb01ff3` | `docs(project): 설계와 문서 통합` | C | - | Rewrites the README and adds architecture and development documentation for the completed implementation. | The documentation accurately consolidates final contracts and verification scope, but it introduces no code, build, test, or runtime behavior and is therefore minor in engineering-history classification. |

# Development Threads

## Thread: Parsed representation to conditional execution
`729a6d2a7d4a` A — Preserves quote effects in owned word tokens.
↓
`48670b845d7f` S — Establishes the command, redirection, pipeline, connector, and cleanup ownership hierarchy.
↓
`a209a95a84d3` B — Populates commands and ordered redirections inside that model.
↓
`8624028b83bb` A — Defines a pipeline as an ordered command group and validates pipe boundaries.
↓
`f297aaad70fe` S — Extends the representation to a connector-linked sequence of complete pipelines.
↓
`13a70b408e89` S — Executes that sequence with short-circuiting and status-correct delayed expansion.
↓
`91ded56b033d` B — Connects the concrete parse and execution lifetime to each input line.

**Significance**
The progression separates three concerns that a shell must not conflate: lexical quote meaning, structural binding, and runtime control flow. The decisive commits are the ownership model, sequence representation, and delayed executor; the surrounding commits populate or integrate those choices. This thread explains why pipes bind within a pipeline, why conditional connectors link pipelines, and why expansion occurs only after a branch is selected.

## Thread: Heredoc from stored input to recoverable cross-stage semantics
`e65591bb66f5` B — Introduces delimiter dequoting support.
↓
`7c9692346824` A — Defines body storage keyed by the owning redirection node.
↓
`fc9c63a03db2` A — Collects all pending bodies in source order.
↓
`aeb0d6cba9c1` A — Adds quote-dependent body expansion.
↓
`d297bd2e8908` S — Integrates heredoc syntax, precollection, lifetime, redirection order, and stdin installation.
↓
`854f0f435c82` S — Replaces an insufficient text heuristic with explicit lexical quote provenance.
↓
`dce9e5c083fa` A — Locks down double-quoted and partially quoted delimiters.
↓
`9afdca85f5a5` A — Propagates temporary-stream storage and positioning failures.
↓
`2fbc4c73af2c` A — Verifies that such failures cannot silently truncate command input.
↓
`c30b39c0bcf8` A — Restores future command boundaries after heredoc preparation failure.
↓
`7e2fdea3affd` A — Verifies read failure, recovery, continuation, and forced-stop behavior.

**Significance**
Heredoc is the strongest integration thread in the history. It crosses parsed identity, quote provenance, input ordering, body expansion, descriptor installation, and recovery after a failure has already consumed part of stdin. The history exposes two distinct corrections: preserving semantic provenance rather than reconstructing it from text, and preserving the command stream boundary even when preparation fails.

## Thread: Pipeline process and descriptor ownership under partial failure
`7c9646e7cd79` A — Establishes fork/exec and child status mapping for a single command.
↓
`ae988017efd5` B — Adds PID bookkeeping and ordered reaping for multiple commands.
↓
`a71f98de0d92` S — Connects the multi-stage pipe graph and defines parent/child descriptor closure.
↓
`915aa072298b` A — Introduces deterministic pipe, fork, and wait failure seams.
↓
`be2967a4b946` S — Terminates and reaps children after partial pipeline construction.
↓
`d611196b368e` A — Reproduces pipe, mid-fork, and wait failure regressions.
↓
`fd5c76c18c27` A — Extends the runtime boundary to descriptor duplication and opening.
↓
`2ca9f4299c7f` A — Makes parent standard-stream restoration failure observable and fatal when unrecoverable.
↓
`13645f58d5e6` A — Exercises save, application, restoration, open, and persistent failure paths.
↓
`b42e57eb7755` A — Directly checks for descriptor exhaustion and unreaped children.
↓
`6dff1ba86ba6` B — Closes the remaining PID-table leak before any child is spawned.

**Significance**
The normal pipeline mechanism is only half of the engineering problem. Once a parent records a PID or acquires a descriptor, it owns that resource even if later construction fails. This thread moves from normal execution to deterministic failure injection, root-cause cleanup, unrecoverable parent-state handling, and direct lifecycle observation. Supporting wrappers and tests remain below S because the decisive ownership guarantees are established by the pipe graph and partial-construction cleanup commits.

## Thread: From fatal allocation to transactional command failure
`0b2e76386678` A — Centralizes allocation and adds overflow-aware wrappers across execution paths.
↓
`0bb6f9de0947` S — Replaces process-terminating helpers with nullable, transactional construction and command-level propagation.
↓
`6d95776ede59` A — Extends side-effect-free preparation ordering to executor resource tables.
↓
`c30b39c0bcf8` A — Protects heredoc stream boundaries when preparation fails after input consumption begins.
↓
`476b082d55c7` A — Sweeps allocation positions by phase and verifies cleanup, state atomicity, continuation, and persistent-failure termination.

**Significance**
The central change is not the wrapper itself but the failure model: construction must either publish a complete owned result or leave no partial state. The later executor and heredoc work shows why a single `NULL` return is insufficient unless side effects and input position are also controlled. The sweep then verifies that this policy holds across the actual command-processing graph.

## Thread: Making text construction asymptotically safe and observable
`b8347c06b6c7` A — Defines the shared builder's growth, overflow, discard, and ownership-transfer contracts.
↓
`985f90b9cbc7` B — Applies it to quote-aware lexer word construction.
↓
`89e1a06f06c9` B — Applies it to expansion and dequoting.
↓
`b36b9d324260` B — Verifies a large word end to end under an explicit time bound.
↓
`7d7dd7ad9d8a` B — Runs the complete behavior, failure, lifecycle, and performance suites under sanitizers.

**Significance**
The shared abstraction removes repeated whole-string copies while keeping overflow and partial-ownership rules explicit. Only the builder introduction is A because it makes the structural decision; the migrations are applications of that choice. The performance and sanitizer paths provide observable evidence without inflating those supporting commits to architecture-level importance.


# Most Important Commits

## feat(parser): 명령 트리 소유권 모델 정의
Commit: `48670b845d7f`
Importance: S
Tags: ARCH, LEX_PARSE, CORE

### Problem
Raw tokens are insufficient for execution: the shell needs a stable representation of arguments, ordered redirections, command groups, connectors, and all associated ownership.

### Decision
Represent a line as pipelines containing commands, commands containing argv and redirections, and connectors attached to complete pipelines. Mirror that hierarchy with one recursive cleanup entry point.

### Why it mattered
Every later parser, expander, heredoc entry, executor allocation, and failure cleanup assumes these ownership boundaries. The model is compact enough for the supported grammar while still making partial and complete destruction deterministic.

### What changed
The commit introduced `t_redir`, `t_command`, `t_pipeline`, connector metadata, element counts, and leaf-to-root cleanup for argv strings, redirection targets, commands, and pipeline nodes.

### Why this is important for understanding the project
This is the data architecture of the shell. It explains what each phase owns, why later stages copy rather than retain tokens, and how errors can release an arbitrarily partial parse without subsystem-specific cleanup knowledge.

## feat(parser): 조건 연결자를 sequence로 결합
Commit: `f297aaad70fe`
Importance: S
Tags: ARCH, LEX_PARSE, CORE

### Problem
A single-pipeline parser cannot represent semicolon sequencing or conditional execution, and treating all operators alike would lose the stronger binding of pipes.

### Decision
Finish a pipeline at `;`, `&&`, or `||`, store the connector on its left pipeline, and link the resulting pipeline units in source order. Reject empty units and trailing conditionals while permitting a trailing semicolon.

### Why it mattered
The representation preserves the project's grammar without introducing an unnecessarily general AST. It also gives the executor exactly the unit required for short-circuit decisions and keeps cleanup correct when parsing fails after a completed prefix.

### What changed
The parser gained pipeline-list construction, connector translation, error handling for empty or incomplete operands, and cleanup of both the current pipeline and the already parsed sequence prefix.

### Why this is important for understanding the project
It explains the shell's precedence model: pipes form one executable unit first; sequence and conditional operators then connect those units from left to right.

## feat(exec): 다단 pipeline의 pipe FD 연결
Commit: `a71f98de0d92`
Importance: S
Tags: PROCESS, FD_IO, CORE

### Problem
Multiple forked commands do not form a pipeline unless each child receives the correct neighboring descriptors and every process closes all unused pipe ends.

### Decision
Allocate `N - 1` pipes for `N` commands, map the previous read end to stdin and the next write end to stdout in each child, close all original ends, then apply explicit command redirections afterward.

### Why it mattered
The ordering defines both data flow and redirection precedence. Parent and child closure rules prevent readers from waiting forever on hidden writers, while child execution of pipeline builtins prevents state mutations from leaking into the parent shell.

### What changed
The executor gained pipe-table creation and cleanup, per-stage descriptor duplication, one child per command, parent-side closure and reaping, last-stage status selection, and parent-only execution for a single stateful builtin.

### Why this is important for understanding the project
This is the defining process topology. It is the basis for every later fork-failure, descriptor-leak, timeout, and child-lifecycle correction.

## feat(exec): 조건 연결자와 지연 확장 실행
Commit: `13a70b408e89`
Importance: S
Tags: ARCH, EXPANSION, CORE

### Problem
Expanding an entire parsed line before execution would evaluate skipped branches and would give later pipelines a stale value of `$?`.

### Decision
Carry the previous connector through the pipeline list, decide whether the next pipeline runs, and expand only that selected pipeline immediately before dispatch using current shell state.

### Why it mattered
Control flow and expansion are semantically coupled. A skipped branch must produce no expansion side effects or allocation failures, and an executed branch must observe the status produced by the pipeline immediately before it.

### What changed
The commit separated one-pipeline expansion and execution, temporarily detached a pipeline during expansion, implemented `&&` and `||` gating, propagated status after each executed unit, and stopped traversal when `exit` ended the shell.

### Why this is important for understanding the project
It explains why parsing can happen for the complete line while expansion remains runtime state-dependent. This timing decision is one of the project's most important shell-semantic judgments.

## feat(redirection): heredoc을 stdin으로 연결
Commit: `d297bd2e8908`
Importance: S
Tags: HEREDOC, FD_IO, INTEGRATION

### Problem
Heredoc requires more than recognizing `<<`: its body must be read before execution, associated with the correct parsed redirection, installed in source order, and released at the end of the line.

### Decision
Make heredoc a first-class token and redirection type, precollect all bodies into an execution context keyed by redirection identity, dequote rather than normally expand the delimiter, and install the selected body through the ordinary redirection traversal.

### Why it mattered
Reusing ordered redirection application preserves interactions with incoming pipes and later input redirects. The line-scoped execution context also keeps body lifetime independent of child lifetime while retaining a stable link to parsed ownership.

### What changed
Lexer and parser support, heredoc preparation, execution-context initialization, failure cleanup, temporary-stream installation on stdin, and post-execution body release were connected into the product path.

### Why this is important for understanding the project
This commit shows how a shell feature crosses every major phase. It is the clearest example of the repository's integration and ownership design.

## fix(heredoc): 구분자의 인용 상태를 실행 단계까지 보존
Commit: `854f0f435c82`
Importance: S
Tags: HEREDOC, DEBUG, RISK

### Problem
The runtime inferred whether a delimiter had been quoted by looking for literal markers in its text. Double-quoted and partially quoted delimiters could contain no marker, so their bodies were expanded incorrectly.

### Decision
Record quote participation explicitly in each token, copy that provenance into heredoc redirections, and use the preserved flag independently from the dequoted delimiter text.

### Why it mattered
Final text and lexical provenance answer different questions. Text is needed for delimiter matching; provenance is needed to decide expansion. Reconstructing one from the other is not reliable after token normalization.

### What changed
`t_token` gained a quoted flag, word scanning set it whenever quote syntax appeared, the parser stored it as `heredoc_quoted`, and collection used that field rather than marker inspection.

### Why this is important for understanding the project
It is the strongest root-cause correction in the semantic history and demonstrates why representation layers must preserve information needed by later phases even when that information is absent from normalized text.

## fix(exec): 부분 생성 파이프라인의 자식과 FD 회수
Commit: `be2967a4b946`
Importance: S
Tags: PROCESS, FD_IO, FAILURE

### Problem
If a later fork failed, already spawned stages could remain blocked or running. Closing descriptors and waiting was insufficient and could hang indefinitely or leave zombies.

### Decision
On partial construction, close all parent-held pipe ends, send termination to every recorded child, tolerate children that already exited, and still reap every PID. Treat any wait failure as pipeline failure.

### Why it mattered
Recording a PID transfers lifecycle responsibility to the parent even when the pipeline never becomes complete. The cleanup path must converge to the same terminal ownership state as successful execution.

### What changed
The executor gained child termination, structured wait retry and error reporting, status suppression when the last child was not observed cleanly, and complete cleanup after a short spawn sequence.

### Why this is important for understanding the project
This commit converts the pipeline from a normal-path mechanism into a reliable lifecycle owner. It explains the later fault-injection and leak-verification architecture.

## fix(memory): 구조화 단계의 할당 실패를 명령 오류로 전파
Commit: `0bb6f9de0947`
Importance: S
Tags: ARCH, FAILURE, RISK

### Problem
Fatal allocation helpers could terminate the shell from deep inside tokenization, parsing, environment mutation, or expansion, bypassing ownership cleanup and potentially exposing partial state.

### Decision
Make allocation helpers nullable and require each construction layer to publish only complete results, preserve existing state until replacements succeed, release partial prefixes, and propagate allocation failure through command or startup boundaries.

### Why it mattered
This is a project-wide change from exception-like process termination to explicit transactional failure. It affects almost every owned representation and determines whether a running shell can diagnose one failed command and continue safely.

### What changed
Utilities gained size checks and nullable returns; environment creation, replacement, import, and serialization became transactional; lexer and parser publishing became failure-aware; expansion and public APIs propagated allocation errors; and the loop distinguished syntax status from command-level memory failure.

### Why this is important for understanding the project
It is the central failure-architecture commit. It unifies the ownership lessons from parsing, environment state, execution, and heredoc into one invariant: no incomplete object escapes and no arbitrary helper owns process termination.

## fix(heredoc): 준비 실패 뒤 입력 구분자 경계 복구
Commit: `c30b39c0bcf8`
Importance: A
Tags: HEREDOC, FAILURE, RISK

### Problem
A heredoc preparation failure could return while body lines and later delimiters remained in stdin, causing data intended for the failed command to be parsed as future shell commands.

### Decision
Mark preparation as failed, consume the remainder of the current and later pending heredocs without constructing bodies, and compare encoded delimiters directly when normal dequoting allocation is unavailable.

### Why it mattered
For a streaming command interpreter, preserving the next command boundary is as important as freeing memory. Returning an error without restoring input position would convert a local allocation failure into unintended command execution.

### What changed
The collector gained discard-through-delimiter behavior, marker-aware allocation-free delimiter matching, continued traversal of pending heredocs, and additional capacity-overflow protection.

### Why this is important for understanding the project
This exceptional A-level commit reveals the depth of the failure model: recovery must account not only for objects and descriptors but also for semantic position in the input stream.

