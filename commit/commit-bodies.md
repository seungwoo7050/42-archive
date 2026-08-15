## build(shell): C99 실행 골격 구성
Create the minimal reproducible build boundary for the shell as a C99 program.

The Makefile separates compilation from linking, exposes compiler, preprocessor, linker, and library variables for environment-specific overrides, and enables `-Wall`, `-Wextra`, and `-Wpedantic` by default. The executable name and source list are explicit, while generated binaries, objects, dependency files, and temporary evidence are kept out of version control.

The initial entry point is deliberately behavior-free and declares the POSIX.1-2008 feature level. Its purpose is to prove that the toolchain, language mode, and executable contract are in place before runtime state or input handling is added. Keeping the scaffold buildable from the first code commit provides a stable base against which each later subsystem can be integrated independently.

## feat(input): 표준 입력 반복과 EOF 처리 연결
Establish the shell's first command-input lifetime: allocate one complete line, return it to the loop as owned storage, and release it before reading the next command.

Interactive mode is enabled only when both standard input and standard error are terminals. The prompt is written to standard error rather than standard output, leaving the output stream available for eventual command results and pipeline data. The plain reader grows its buffer geometrically, stops at a newline, and preserves a final unterminated line when EOF arrives after data; EOF with no data ends the loop and emits the customary terminal newline.

The initial API uses a null return for both end-of-input and allocation or stream failure. That is sufficient to establish the loop and ownership boundary, but it does not yet let the caller distinguish orderly EOF from an operational error; later input hardening separates those outcomes. No parsing is performed here, so the commit intentionally defines input and cleanup behavior before attaching command semantics.

## build(input): 선택적 readline 입력 경로 제공
Add an optional interactive input backend without making Readline a mandatory runtime or build dependency.

The default target continues to compile the plain standard-I/O reader. Building through the dedicated `readline` target defines `USE_READLINE` and links `libreadline`; only interactive reads then use `readline`, and only non-empty commands enter history. Non-interactive input deliberately remains on the plain reader so redirected scripts and test streams retain the same line-oriented behavior regardless of whether the optional library is available.

This keeps the input API's ownership contract stable across both backends: a successful call returns a dynamically allocated line that the shell loop must release, while a null result terminates input processing. The compile-time boundary also isolates terminal editing and history from the core parser and executor, preserving a portable dependency-free build path.

## feat(utils): 문자열 소유권 도구 제공
Introduce a small ownership-oriented string utility layer for the shell's dynamically built representations.

`sh_strdup`, `sh_substr`, and `shell_strndup` always return separately owned, NUL-terminated storage, while `sh_strjoin_free` makes its transfer rule explicit by consuming and freeing the left operand after constructing the combined string. `sh_free_words` and its public adapter release both a null-terminated vector and every contained string.

At this stage, the allocation helpers treat out-of-memory as a process-fatal condition: `sh_xcalloc` and `sh_strdup` diagnose the failed allocation and exit rather than returning partially initialized data. That policy simplifies early callers because a successful return guarantees valid owned storage, although later hardening replaces fatal allocation assumptions with recoverable error propagation.

## feat(utils): 종료 상태 문자열 변환 제공
Add an owned decimal conversion for shell status values.

The routine widens the input to `long`, records a leading sign when needed, handles zero explicitly, and collects nonzero digits in reverse before copying them into forward order. It then allocates exactly enough storage for the resulting string and terminator, returning `NULL` if that final allocation fails.

Keeping status formatting in a utility gives `$?` expansion and other status-reporting paths a consistent representation without relying on caller-provided fixed buffers. Ownership is clear: each successful call returns a separately allocated string that the caller must release.

## feat(utils): 환경 식별자 문자 판정 제공
Centralize the lexical rules for shell variable identifiers.

`sh_is_name_start` accepts alphabetic characters and underscore, while `sh_is_name_char` additionally accepts digits after the first position. Both cast through `unsigned char` before calling the `ctype` functions, avoiding undefined behavior for negative plain-`char` values.

Providing these predicates as shared utilities keeps environment-name validation and variable-expansion scanning on the same grammar. Without one common definition, a name accepted by `export` could be consumed differently by `$NAME` expansion.

## feat(env): 프로세스 환경 적재와 수명 관리
Give the shell an owned environment and persistent status state for its complete process lifetime.

`env_from_environ` deep-copies each valid `key=value` entry into an ordered linked list and marks imported entries as exported. The shell can therefore mutate variables independently of the startup `envp` array, whose storage and head pointer it does not own. `env_free` mirrors node construction by releasing every key, value, and list node.

`main` initializes `env`, `last_status`, and the loop-control flag before entering the shell, then frees the environment after the loop and returns the low eight bits of the final status. This establishes one owner for environment memory and connects command status to the program's externally observable exit code.

## feat(env): 환경 조회와 변경 연산 제공
Turn the imported environment list into a mutable shell-owned variable store.

Names are validated against identifier start and continuation rules before insertion. `env_get` maps a missing variable to the empty string required by word expansion. `env_set` updates an existing value when one is supplied, can promote an entry to exported state without replacing its value, and appends a new entry when the name is absent. The pointer-to-pointer interface allows insertion into an empty list and replacement of the head.

`env_unset` relinks and frees a matching node, including the head case, while treating an absent name as a successful no-op. Centralizing lookup, mutation, validation, and node ownership here gives expansion and builtins one consistent environment model instead of modifying `environ` directly.

## feat(env): export 배열과 출력 뷰 생성
Provide two exported-only views over the shell's richer environment store.

`env_to_environ` first counts entries marked for export, allocates an exactly sized null-terminated vector, and then creates owned `key=value` strings for each entry. This snapshot is suitable for process execution without exposing linked-list nodes or including shell-local variables; the caller owns the resulting vector and strings.

`env_print` traverses the same exported subset but offers either ordinary `key=value` output or `declare -x`-style declarations. Keeping conversion and presentation in the environment module centralizes the rule that export metadata, not mere presence in the store, determines what crosses the child-process or user-visible environment boundary.

## feat(env): 공개 환경 저장소 어댑터 제공
Add a stable, caller-owned environment handle over the existing linked-list implementation.

`shell_env_init` turns the supplied `t_env` object into a sentinel whose `next` pointer owns the actual entries imported from `envp`. Public lookup, mutation, export, conversion, and cleanup functions detect and skip that sentinel before delegating to the list operations. Cleanup releases the entries but leaves the outer handle initialized and reusable.

The sentinel solves a pointer-stability problem: inserting or deleting the first real variable may change the list head, but it does not change the address held by the caller. Mutating functions can therefore pass `&env->next` to the internal pointer-to-pointer API while presenting a simpler fixed-handle interface to tests and higher-level shell code.

## feat(lexer): 인용 단어와 토큰 수명 관리
Introduce owned word tokens and preserve quote semantics in an intermediate lexical representation.

The lexer splits on shell whitespace and unquoted operator characters while allowing adjacent quoted and unquoted fragments to form one word. Quote delimiters themselves are removed. Characters inside single quotes are prefixed with an internal literal marker, whereas double-quoted characters remain eligible for later expansion. This retains the semantic difference between quote forms after the original delimiters have disappeared, and it also preserves empty quoted words as real tokens.

Each token owns its text and records the source offset where the word began. An unclosed quote aborts tokenization and releases the already accumulated list; `free_tokens` provides the matching list-wide cleanup operation. The resulting token stream is therefore stable independently of the input line's lifetime.

## feat(lexer): 셸 연산자를 토큰으로 구분
Teach the lexer to emit typed shell operators instead of treating every unquoted fragment as a word.

The scanner applies longest-match recognition where operators share prefixes: `||` is distinguished from `|`, and `>>` from `>`. It emits dedicated tokens for pipelines, input and output redirections, append redirection, conditional connectors, and semicolon sequencing, retaining each operator's source position and text for downstream parsing.

Unsupported standalone `&` and the not-yet-supported `<<` form fail during lexical analysis, before the parser can build an ambiguous structure. On such errors the accumulated token list is released. This gives the parser a stable token vocabulary and keeps character-level operator recognition out of grammar code.

## feat(parser): 명령 트리 소유권 모델 정의
Define the hierarchical representation that separates parsed shell structure from raw tokens.

A pipeline owns an ordered command list; each command owns its null-terminated argument vector and ordered redirection list; each redirection owns its target string. Connectors are stored at the pipeline level, where they can describe sequencing between complete pipeline units rather than individual commands. Counts on commands and pipelines provide the executor with allocation sizes without rewalking syntax text.

`free_pipeline` mirrors this hierarchy from the leaves upward, releasing argument strings and redirection targets before their containing nodes. Establishing one recursive cleanup entry point is the key ownership decision: once a parsed pipeline is published, callers can dispose of the entire structure without knowing which intermediate nodes were populated.

## feat(parser): 인자와 리다이렉션 구문 구성
Build the first executable command representation from the token stream.

Word tokens are copied into a null-terminated `argv` in source order. Redirection operators require an immediately following word, which is copied into an ordered redirection list and consumed as syntax rather than as an argument. Keeping arguments and redirections in separate owned structures allows execution to apply descriptor changes without reparsing command text.

A command containing only redirections is retained as meaningful, while an entirely empty token stream produces no pipeline. Missing redirection targets and operators not yet supported by this parser are reported as syntax errors, and the partially built command is released before returning failure.

## feat(parser): pipe로 명령을 pipeline에 결합
Represent a pipeline as an ordered list of commands rather than restricting parsing to a single command.

Encountering `|` now finalizes the current command, appends it to the pipeline, and starts a fresh command node. Arguments and redirections collected after the separator therefore belong to the next stage, while `command_count` records the number of executable positions for later pipe and process allocation.

An explicit `after_pipe` state rejects a leading, repeated, or trailing pipe and distinguishes a missing right-hand command from a generally unsupported operator. On failure, both the in-progress command and all commands already attached to the pipeline are released, so malformed pipelines cannot leak a partially constructed representation.

## feat(parser): 조건 연결자를 sequence로 결합
Extend the parser from one pipeline to an ordered sequence of pipelines linked by `;`, `&&`, and `||`.

Each connector is stored on the pipeline to its left as `next_op`, preserving the syntax needed to decide whether the following pipeline should run. Pipes continue to combine commands inside one pipeline, while sequence connectors terminate the current pipeline and begin another. This representation therefore makes pipeline binding stronger than conditional or sequential composition without requiring a general-purpose syntax tree.

The parser now rejects empty commands before connectors, commands missing after a pipe, and trailing conditional operators. A trailing semicolon is accepted by normalizing the previous connector to `CONN_NONE`. Every error path releases both the pipeline currently being assembled and the already completed prefix, preserving ownership across partially parsed sequences.

## feat(parser): 공개 sequence parse 수명 제공
Define a public `t_sequence` ownership boundary around the parser's pipeline list.

`shell_parse_line` now performs tokenization and parsing as one operation, releases the transient token stream after the parser has copied its data, and records the number of resulting pipelines. Empty input is represented as a successful empty sequence, while lexical or syntax diagnostics produce a failed parse.

Paired initialization and cleanup functions make ownership explicit: a sequence starts with no pipelines, owns the complete parsed list after success, and returns to the empty state after `shell_sequence_free`. Callers therefore need not coordinate the independent token and pipeline lifetimes themselves.

## feat(parser): hook 기반 sequence 실행 seam 제공
Add a hook-driven sequence evaluator that isolates connector semantics from concrete process execution.

The evaluator walks pipelines in source order, carries the previous connector as the gate for the current pipeline, and invokes the injected runner only when `&&` or `||` permits execution. The returned pipeline status becomes the input to the next gate and is written back through `last_status`, while `;` and the initial state impose no condition.

Injecting `run_pipeline` makes short-circuit behavior testable without forking or manipulating file descriptors. A missing runner is treated as a configuration error, optionally reported through `on_error`, and produces status 1 rather than dereferencing an incomplete execution interface.

## feat(expand): 인용 표식 제거 경로 제공
Introduce a dedicated dequoting pass that converts the tokenizer's literal markers back into runtime bytes.

The tokenizer retains quote information by placing an internal marker before protected characters. `dequote_word` consumes that marker together with its following byte and copies only the literal byte to the result; unmarked bytes pass through unchanged. This makes the marker an intermediate representation detail rather than data that can leak into command arguments or filenames.

Keeping dequoting behind `shell_dequote_word` separates lexical quote preservation from later expansion policy. The public wrapper also validates the output destination and resets the optional error channel, establishing a callable boundary for parser or executor-facing code.

## feat(expand): 환경과 종료 상태 단어 확장
Implement runtime word expansion over the quote-preserving representation produced by tokenization.

A literal marker causes the following byte to be copied without interpretation, preserving characters that were protected by quoting. Unprotected `$?` is replaced with the shell's last status, and `$NAME` consumes a complete valid identifier before looking it up in the shell-owned environment. Other characters, including a dollar sign that does not begin a supported expansion, remain literal.

The expander returns one string and intentionally performs neither field splitting nor pathname expansion. That keeps the parser's one-token-to-one-argument contract intact while still delaying environment- and status-dependent substitution until a shell context is available.

## feat(expand): argv와 리다이렉션 확장 연결
Apply word expansion to the parser's executable representation instead of leaving expansion as an isolated string utility.

The traversal replaces every argument and redirection target with the result of `expand_word`, freeing the encoded source string after ownership transfers to the expanded value. Treating redirection operands and ordinary arguments through the same expansion boundary keeps variable and status substitution consistent across command data while preserving the parser's command and pipeline topology.

`shell_expand_sequence` adapts the public sequence API by constructing the minimal shell context required for environment lookup and `$?`. This separates expansion inputs from execution machinery and provides a single operation that callers can apply before dispatching the parsed sequence.

## feat(builtin): echo 출력 명령 제공
Introduce the builtin dispatch boundary and implement `echo` as its first command.

`builtin_is_known`, `builtin_is_parent`, and `builtin_run` separate command recognition, execution policy, and implementation. That interface gives the later executor a stable way to decide whether a command can be handled internally instead of invoking an external program.

`echo` accepts consecutive `-n` operands composed only of `n`, writes remaining arguments with single-space separators, and emits the trailing newline only when requested. Returning failure when the output stream is in error makes redirection and pipe write failures part of command status rather than silently treating partial output as success.

## feat(builtin): pwd 작업 디렉터리 출력
Add `pwd` using the process's actual current working directory as the source of truth.

`getcwd(NULL, 0)` lets the system allocate enough space for an arbitrary path instead of imposing a fixed buffer limit. The returned path is printed and released, while lookup and output failures become nonzero command statuses with diagnostics where applicable.

Reading the process state directly avoids depending on a potentially stale `PWD` environment entry. This keeps `pwd` correct even when the directory was changed through a path whose textual form differs from the stored environment value.

## feat(builtin): cd 이동과 PWD 상태 동기화
Implement `cd` as a parent-owned working-directory transition with corresponding `PWD` and `OLDPWD` updates.

The target is resolved before changing process state: no operand uses `HOME`, `-` uses `OLDPWD`, and more than one operand is rejected. The previous physical directory is captured before `chdir`; after a successful transition, the new physical directory is captured and the environment store is updated. For `cd -`, the resolved destination is also printed.

This builtin must run in the shell process because the current working directory is process-local and a child-only `chdir` would disappear on exit. Updating the environment only after `chdir` succeeds avoids publishing a directory change that never happened. At this stage, synchronization is best-effort when `getcwd` or `env_set` cannot provide a value, while the filesystem working directory remains authoritative.

## feat(builtin): env 환경 목록 출력
Add `env` as a view over the shell's owned environment rather than the process-global `environ` array.

Delegating output to `env_print` keeps filtering and formatting with the component that owns export metadata. As a result, changes made through the shell's environment store are reflected directly, and the builtin does not need to reconstruct or duplicate the storage representation.

This implementation deliberately rejects operands because command execution, option handling, and temporary assignment semantics are outside the supported `env` contract. It also converts a stream error into a nonzero command status, so output failure is observable instead of being reported as successful execution.

## feat(builtin): export 대입과 선언 출력
Implement `export` as both an environment mutation command and a declaration view of the shell's stored variables.

With no operands, the builtin delegates ordered declaration-style output to the environment layer. With operands, it separates the name from the first `=`, validates the identifier using the same name rules used by expansion, and marks the resulting entry as exported through `env_set`. Keeping parsing at the builtin boundary lets the environment store remain responsible for replacement, allocation, and export metadata rather than command syntax.

Invalid identifiers are diagnosed individually while later operands are still processed, and the command returns a nonzero aggregate status if any were rejected. Allocation failure stops immediately because the shell can no longer guarantee that the requested state transition was applied consistently.

## feat(builtin): unset 환경 이름 제거
Add `unset` as a parent-side mutation of the shell's environment store.

The builtin walks every supplied name and delegates removal to `env_unset`, so linked-list ownership and node disposal remain inside the environment layer. Removing a missing name is naturally idempotent, and processing all arguments in one invocation supports batch updates without exposing storage details to command dispatch.

Applying the change to `shell->env` in the owning process is the important boundary: later expansion, `env` output, and environment vectors constructed for child processes must all observe the deletion. Executing the same mutation only in a child would discard the state change when that process exits.

## feat(builtin): exit 상태를 셸 수명에 연결
Make `exit` a shell-state transition rather than an ordinary command result.

The builtin now validates its optional numeric argument with `strtol`, rejects trailing characters and range errors, and narrows accepted values to the shell-visible unsigned-byte exit domain. With no argument it preserves the current `last_status`; a valid argument becomes both the return status and the process's eventual exit status. A non-numeric argument terminates with status 2, while excess arguments report an error but leave the shell running.

Registering `exit` as a parent builtin is essential because changing `shell->running` in a forked child would not stop the command loop in the owning process. This establishes the lifecycle contract that only the parent shell may decide whether the interactive or non-interactive loop continues.

## feat(redirection): 파일 입출력 리다이렉션 적용
Implement file redirections as an ordered execution-stage transformation of standard descriptors.

Input redirections open the target read-only and replace `STDIN_FILENO`. Output redirections create the target with mode 0644 and choose either truncation or append semantics before replacing `STDOUT_FILENO`. The temporary descriptor is closed immediately after a successful `dup2`, because the standard descriptor now refers to the same open file description needed by the command.

Walking the parsed redirection list from left to right gives repeated redirections their shell meaning: each open and descriptor replacement occurs, and the last applicable redirection determines the final standard stream. Any open or duplication failure is diagnosed at this boundary and stops further redirection processing, preventing the command from running with only a partially applied setup.

## feat(exec): 부모 builtin의 표준 스트림 복원
Scope redirections around commands that must execute in the parent shell.

Before applying redirections, the executor duplicates standard input and standard output. It then applies the command's redirection list, runs a parent-stateful builtin—or performs only the redirections for an argument-free command—flushes buffered output, restores both original descriptors, and closes the saved copies. A redirection setup failure follows the same restoration path before returning status 1.

This reconciles two competing requirements. Builtins such as `cd`, `export`, `unset`, and `exit` must mutate persistent shell state, but the descriptor mutations needed for their redirections must remain command-local. Saving and restoring at the parent-command boundary preserves the builtin's state effects without allowing one command's input or output destination to contaminate the next command.

## feat(exec): 단일 명령을 자식에서 실행
Introduce the first concrete execution boundary for a parsed, expanded single command.

A redirection-only command or a builtin whose effects must persist runs through the parent-command path. All other work runs in a forked child: redirections are applied first, known builtins execute against the child's copy of shell state, and external commands receive a freshly serialized environment before `execvp`. Builtin streams are flushed before `_exit`, avoiding loss of stdio-buffered output without invoking parent-side exit handlers.

The parent waits for the exact child and retries `waitpid` after `EINTR`. Normal exits become their low-byte status, signal termination becomes `128 + signal`, command-not-found maps to 127, and other `execvp` failures map to 126. This establishes the central process-state rule: ordinary command execution is isolated in a child, while only commands that must mutate persistent shell state remain in the parent.

## feat(exec): pipeline 자식 상태를 순서대로 회수
Generalize child execution from one external command to every command node in a parsed pipeline and record the resulting PIDs explicitly.

The parent allocates one PID slot per command, forks in command order, and then waits for each successfully spawned child by its exact PID, retrying interrupted waits. Recording identities instead of relying on an undirected `wait` establishes deterministic ownership and prevents another child from being mistaken for the stage whose status is being interpreted.

When every command was spawned, the shell reports the status of the final command, matching pipeline status semantics. A partial spawn still reaps the children that do exist but returns status 1 rather than accepting an incomplete pipeline result. This commit establishes the process-lifecycle skeleton that the following pipe-descriptor change connects into an actual data pipeline.

## feat(exec): 다단 pipeline의 pipe FD 연결
Implement N-stage pipelines with an explicit table of `N - 1` pipes and one child per command.

Child stage `i` duplicates the previous pipe's read end onto standard input and, unless it is the last stage, duplicates the current pipe's write end onto standard output. It then closes every original pipe descriptor before applying command redirections. That ordering is significant: pipe topology supplies the defaults, while an explicit redirection in the command may replace the corresponding standard descriptor afterward.

The parent creates all pipes before forking, records each PID, closes its own copies after the spawn loop, and waits for every child. The shell-visible result comes from the last pipeline command, while a short spawn sequence reports failure. Descriptor slots are initialized to `-1` so partial pipe-creation cleanup can safely traverse the complete table.

Only a single parent-stateful builtin or redirection-only command runs in the shell process. Any builtin participating in a multi-command pipeline runs in a child, preserving pipeline isolation instead of leaking its environment or directory mutations back into the parent.

## feat(exec): 조건 연결자와 지연 확장 실행
Execute a parsed pipeline list with shell-style short-circuit connectors and move expansion to the point where an individual pipeline is selected to run.

The executor carries the preceding connector across the list: `&&` skips the next pipeline after a nonzero status, `||` skips it after a zero status, and sequence boundaries run unconditionally. It also stops walking when a parent builtin such as `exit` clears the shell's running flag.

Expansion is deliberately performed after this gate. The selected pipeline is temporarily detached from the list so the existing expansion routine transforms only that pipeline, then its link is restored. Skipped branches therefore neither allocate expansion results nor evaluate variables and `$?`; an executed branch sees the status produced by the immediately preceding pipeline. This ordering makes connector control flow and expansion state consistent instead of expanding the whole line against a stale status before execution begins.

## feat(shell): 한 줄 해석과 실행 수명 연결
Connect the input loop to a complete parse-and-execute transaction for each line.

`shell_process_line` now owns the transient token list and parsed pipeline list from creation through cleanup. Tokenization or parsing diagnostics are printed at this boundary and converted to shell status 258 without invoking the executor; an empty parse preserves the previous status; a valid parse executes and then releases the entire structure.

Placing this orchestration between line acquisition and subsystem-specific APIs gives the shell loop one stable lifecycle boundary. The loop owns only the input string and persistent `t_shell` state, while line processing owns every representation derived from that string and guarantees that those representations are freed before the next prompt.

## feat(heredoc): 구분자 정규화 버퍼 구현
Add a dedicated delimiter-normalization routine that removes the lexer's literal-marker encoding without applying variable expansion.

The lexer preserves single-quoted characters by prefixing them with an internal marker. Heredoc matching needs the character value but must not treat the delimiter as an ordinary expandable command word, so normalization copies marked characters literally and copies all other bytes unchanged into an owned growable buffer.

The local buffer maintains NUL termination after every append and frees partial output when allocation fails. This establishes the representation boundary required by later heredoc collection: parser-owned encoded words remain intact until the heredoc layer deliberately derives the exact text that input lines must match.

## feat(heredoc): 수집 본문 저장소 수명 관리
Add an execution-context-owned repository for heredoc bodies.

Each entry pairs an owned body string with the exact parsed redirection that requested it. Lookup by redirection identity avoids ambiguity when several heredocs use the same delimiter, and returning an empty string for a missing entry gives redirection code a defined fallback rather than a null body.

The repository has one explicit destructor that frees both body allocations and entry nodes. Attaching it to `exec_context` scopes collected input to a single execution operation and separates heredoc storage from the parser's ownership of redirection nodes. The body may outlive collection, but it cannot outlive the parsed structure whose redirection pointer is used as its key.

## feat(heredoc): 구분자별 본문 순차 수집
Implement heredoc preparation as a source-order traversal of every pipeline, command, and redirection.

For each heredoc redirection, the collector dequotes the delimiter, reads lines until an exact match, appends a newline to each body line, and stores the completed body in the execution context. Interactive collection uses a secondary prompt, while premature EOF emits a warning and retains the body collected so far. Allocation failure discards the partial buffer and aborts preparation.

Stored entries are keyed by the address of the parsed redirection rather than by delimiter text. This allows repeated delimiters to retain distinct bodies and lets execution retrieve the body belonging to the exact redirection it is applying. Traversing the full parsed sequence before execution also defines deterministic input consumption: multiple heredocs are read in lexical order rather than only when a branch or command eventually runs.

## feat(heredoc): 인용 여부에 따라 본문 확장
Apply shell expansion to heredoc body lines only when the delimiter is considered unquoted.

The collector now expands `$?` and valid environment-variable names while copying each unquoted body line into the stored buffer. Unknown or syntactically incomplete dollar forms preserve the dollar sign, unset variables contribute an empty value, and each input line receives exactly one terminating newline. Quoted delimiters instead retain the body bytes literally.

At this point quote detection is derived from the literal-marker encoding in the delimiter word, and the delimiter itself is dequoted before comparison. The implementation therefore separates terminator matching from body transformation and keeps heredoc expansion deliberately narrower than general command-word processing: it substitutes variables and status but performs no word splitting or globbing.

## feat(redirection): heredoc을 stdin으로 연결
Integrate heredoc syntax and pre-collected bodies into the normal redirection path.

`<<` becomes a first-class token and parser redirection type rather than an unsupported operator. Before executing any pipeline from a parsed line, the command processor creates an execution context and collects every heredoc body. A preparation failure aborts the line with status 1 and frees both collected entries and the parsed pipeline; successful execution retains the bodies only for the duration of that line.

The executor associates each stored body with its parsed redirection node. When that redirection is applied, the body is written to a temporary stream, rewound, and duplicated onto standard input. Reusing the ordinary redirection traversal preserves left-to-right precedence and lets a heredoc override an incoming pipe or be superseded by a later input redirection according to source order.

Heredoc delimiters are dequoted rather than expanded during the ordinary expansion pass. This avoids interpreting the delimiter as a normal argument while leaving body collection responsible for its own expansion rules. The integration establishes a clear lifecycle: parse the redirection, collect its body before execution, install a readable descriptor when the command runs, and release the stored body after the complete pipeline list finishes.

## test(smoke): 주요 셸 명령 흐름 검증
Introduce an end-to-end smoke suite that drives the shell through standard input and compares both process status and exact standard output.

The cases cover the primary cross-subsystem contracts rather than isolated functions: parent-persistent `cd`, `export`, and `unset`; quote-sensitive expansion; propagation of command-not-found status through `$?`; pipeline transport; truncate, append, and input redirections; unquoted heredoc expansion; syntax-error recovery; multiple non-interactive input lines; and `exit` terminating before later input executes.

Each case runs in an isolated temporary directory and records stdout and stderr separately, so filesystem effects and diagnostics cannot accidentally satisfy an output assertion. Adding the suite to `make test` establishes a reusable behavioral baseline against which later parser, executor, failure-path, sanitizer, and performance changes can be checked.

## test(redirection): 부모 명령의 표준 입출력 복원 검증
Verify that redirections applied to a parent-executed builtin are temporary while the builtin's state mutation remains persistent.

`export` must run in the shell process so the new variable is visible afterward, but its input and output redirections must not permanently replace the shell's standard descriptors. The case combines both directions, confirms the variable survives, requires a following `echo` and `env` pipeline to use normal standard output, and verifies that the redirected output file remains empty because `export` itself emits nothing.

This test locks down the executor's split responsibility: parent execution preserves shell state changes, while descriptor changes are scoped to the single command and restored before the loop proceeds.

## test(heredoc): 인용 구분자와 본문 확장 검증
Add an end-to-end heredoc case in which a single-quoted delimiter suppresses body expansion.

The delimiter's quotes are syntax rather than part of the terminator, so the input still ends at an unquoted `EOF` line. At the same time, `$HD` in the body must remain literal despite the variable being exported. The test therefore checks both dequoting for delimiter comparison and quote-sensitive expansion policy in one observable scenario.

This protects the distinction between expanding an ordinary command word and processing a heredoc delimiter: the latter uses the dequoted text for matching but quote presence to control the body.

## fix(heredoc): 구분자의 인용 상태를 실행 단계까지 보존
Carry quote provenance from lexical analysis into heredoc execution instead of trying to reconstruct it from the encoded delimiter text.

The previous runtime heuristic treated the presence of a literal marker as evidence that the delimiter had been quoted. That worked for single-quoted characters, which are marker-encoded, but failed for double-quoted or partially quoted delimiters whose resulting token text could contain no marker. The tokenizer now records whether any quote syntax participated in a word, and the parser copies that fact specifically into heredoc redirections.

Heredoc collection dequotes the delimiter for matching but reads the preserved `heredoc_quoted` flag to decide whether body variables should expand. Separating final text from lexical provenance maintains both required properties: the terminator is compared without quote syntax, while any quoted delimiter segment suppresses expansion.

## test(heredoc): 이중·부분 인용 구분자 회귀 검증
Add regression cases showing that any quoting in a heredoc delimiter disables expansion in the body.

Both a fully double-quoted delimiter and a delimiter assembled from unquoted and double-quoted segments must dequote to the same terminator text, `EOF`, while retaining the fact that quoting occurred. The body therefore preserves `$HD` literally even though the variable is defined.

Testing partial quoting is essential because the final delimiter text alone cannot determine expansion policy. The parser must carry quote provenance separately from the dequoted delimiter so heredoc collection can match the correct terminator and independently decide whether body expansion is permitted.

## test(exec): 다단 파이프와 리다이렉션 순서 검증
Add end-to-end coverage for long pipeline wiring and the ordering of multiple redirections.

The four-stage pipeline verifies that each child receives the previous stage as standard input, sends output to the next stage, and closes unrelated pipe ends so the chain reaches EOF and completes. Allowing the test binary path to be overridden also makes the same behavioral suite reusable for alternate builds.

The redirection cases establish left-to-right application. With two output redirections, the first file is created and then superseded by the second descriptor, so only the second receives command output. When a pipeline stage also redirects its own stdout, the explicit redirection is applied after pipe wiring and therefore overrides the pipe; the downstream `cat` receives no payload while the file does. These cases protect an execution-order rule that cannot be inferred from parser structure alone.

## test(status): 실행 불가 파일과 신호 종료 상태 검증
Add regression coverage for two distinct ways an external command can fail after path resolution.

A regular file that exists but lacks execute permission must produce status 126 and must not run its contents. This distinguishes “found but not executable” from command-not-found status 127. A child terminated by `SIGTERM` must produce `128 + SIGTERM`, yielding 143, so connector decisions and `$?` reflect signal termination rather than a generic failure.

The tests observe each result from a subsequent command, locking down the executor's translation from `execvp` errors and `waitpid` status words into shell-visible status values.

## test(parser): 조건 연결자와 잘못된 연산자 검증
Extend end-to-end parsing coverage for conditional connectors and malformed control operators.

The normal cases establish short-circuit behavior as an observable execution contract: `&&` suppresses its right pipeline after failure, `||` executes its right pipeline after failure, and a successful left side permits `&&` continuation. The malformed cases require leading and trailing conditional operators to reject the entire input line with syntax status 258 rather than executing a partial command.

A lone `&` is tested separately because background execution is outside the supported grammar. Rejecting it during tokenization prevents the parser from misclassifying it as a connector or allowing the surrounding commands to run.

## fix(parser): 오류 출력 포인터 없이도 구문 실패 반환
Preserve parse failure semantics even when the caller declines an error message.

The tokenizer and parser communicate failure by populating an error slot. Passing `NULL` directly previously removed that signal from `shell_parse_line`, allowing malformed input to appear successful because the wrapper had no state to inspect. The public API now always supplies a real slot: the caller's pointer when provided, otherwise a local temporary pointer.

The temporary diagnostic is freed on every return path, while a caller-provided diagnostic remains caller-owned. Partially produced sequences are still released before returning failure. This separates two independent API choices—whether parsing should report success and whether the caller wants explanatory text—so omitting optional diagnostics cannot change correctness.

## test(parser): 공개 parser 오류 반환 검증
Add a source-level test executable for the public parsing API rather than validating parsing only through shell execution.

The cases establish the API's ownership and optional-output contracts: valid and empty input succeed with a sequence that callers may free; syntax failures return nonzero whether or not the caller requests an error string; requesting diagnostics yields an owned message on failure and no message on success; and a `NULL` output sequence is rejected instead of being dereferenced or treated as an empty parse.

Building the test against all production sources except `main.c` verifies the same parser implementation exposed to embedding callers. This prevents the interactive command loop's status handling and diagnostics from masking mistakes in the lower-level return-value contract.

## refactor(runtime): 프로세스 시스템 호출 경계 분리
Introduce a runtime boundary around `pipe`, `fork`, and `waitpid`, and make the executor depend on that boundary rather than invoking the system calls directly.

Production wrappers remain transparent, while test builds can fail a selected call count with a representative `errno`. Call-position injection is important for pipeline code because failures after some pipes or children already exist exercise materially different cleanup obligations from failure on the first operation.

This refactor does not yet change the executor's recovery policy. It establishes the seam needed to reproduce rare process-resource failures deterministically and to verify that later fixes close descriptors, terminate partial child sets, and report reaping errors correctly.

## fix(exec): 부분 생성 파이프라인의 자식과 FD 회수
Make partially constructed pipelines converge on a complete parent-owned cleanup path.

If a later `fork` fails, the children already created for earlier stages may be blocked on pipe input or running an unrelated command. Merely closing the parent's descriptors and waiting can therefore hang indefinitely. The executor now closes every parent-held pipe end, sends `SIGKILL` to each spawned child, tolerates children that have already exited, and still waits for every recorded PID so no zombie remains.

Child reaping is also separated into a helper that retries `EINTR` and gives a non-interrupt failure a second opportunity. Any reaping error forces pipeline status 1; the last command's exit status is accepted only when its wait completed cleanly. This preserves the ownership invariant that once the parent records a PID, it remains responsible for terminating or observing that child before returning from pipeline execution.

## test(exec): pipe·fork·wait 실패 회귀 검증
Add a separately compiled fault-injection binary and regression cases for failures in pipeline creation, child creation, and child reaping.

Compiling the same sources with `SMALL_SHELL_TESTING` keeps production behavior unchanged while allowing the runtime wrappers to fail a selected system-call occurrence deterministically. The tests target a later pipe or fork call rather than only the first operation, which exercises cleanup after the executor has already acquired descriptors or spawned children.

Each case requires the failed pipeline to resolve to status 1 and then lets a following `echo $?` observe that result. The blocked `sleep` pipeline makes partial-fork cleanup meaningful: when a later `fork` fails, already spawned children must be terminated and reaped instead of leaving the test hung. The `waitpid` case verifies that a reaping error overrides an otherwise successful pipeline result rather than being silently ignored.

## refactor(runtime): FD 시스템 호출 경계 분리
Route descriptor-opening and descriptor-duplication operations through the runtime layer.

Pipeline wiring, redirection setup, heredoc installation, and parent standard-I/O save/restore now share `shell_open`, `shell_dup`, and `shell_dup2` instead of calling libc directly. The wrappers preserve production semantics but give fault tests one consistent interception point for descriptor exhaustion, replacement failure, and permission errors across both child and parent execution paths.

The injection helper also gains a repeat mode that can fail every call from a selected position onward. One-shot failures are sufficient to test ordinary cleanup; repeated failures are necessary to model an unrecoverable restoration path where the shell cannot simply retry and continue. This commit establishes the observability boundary later used to verify redirection state recovery without changing normal execution behavior.

## fix(redirection): 부모 표준 입출력 복원 실패 전파
Propagate failures while restoring the parent shell's standard descriptors instead of discarding them.

A parent-executed builtin temporarily mutates persistent process state, so restoring `STDIN_FILENO` and `STDOUT_FILENO` is part of command correctness, not best-effort cleanup. Each descriptor is restored independently, retries `EINTR`, records recoverable non-interrupt errors, and makes a second attempt before declaring the descriptor unrecoverable. Saved copies are closed after both restore attempts regardless of outcome.

A transient restore error that eventually succeeds still forces command status 1, preserving evidence that execution was not clean. If either descriptor cannot be restored, the shell also clears `running`: continuing would route later input or output through an unknown descriptor configuration. The same rule applies when restoration follows failed redirection setup, and buffered builtin output is checked before the original stdout is reinstated.

## test(redirection): 저장·적용·복원 실패 회귀 검증
Add fault-injection coverage for each phase of parent-executed redirection: saving standard descriptors, opening the target, applying the replacement, and restoring the original descriptors.

The one-shot cases require the affected command to return status 1 without printing its redirected payload, while a later command still writes to the normal standard output. This verifies both negative behavior—do not run after failed setup—and recovery behavior—do not leave the shell’s persistent descriptors altered after a recoverable failure.

A repeated `dup2` failure during restoration exercises the non-recoverable boundary. Once the parent cannot restore its own standard descriptors, subsequent command I/O is no longer trustworthy, so the test requires the shell to stop with status 1 and emit a diagnostic rather than continue in a corrupted process environment.

## refactor(runtime): heredoc 임시 파일 I/O 경계 분리
Move heredoc temporary-stream operations behind the runtime boundary.

The redirection code now calls wrappers for flush, seek, and descriptor extraction instead of invoking `fflush`, `rewind`, and `fileno` directly. Using `fseek(..., 0, SEEK_SET)` also provides an explicit return value, unlike `rewind`, so the operation can later participate in normal error propagation.

This commit intentionally preserves behavior by still discarding the flush and seek results. Its structural purpose is to make the complete temporary-file staging sequence observable and injectable at the same boundary already used for process and descriptor system calls.

## fix(heredoc): 임시 파일 저장 오류를 전파
Treat every stage of converting an in-memory heredoc body into a temporary input stream as fallible.

The redirection path now requires the body write, stream flush, rewind, and descriptor lookup to succeed before calling `dup2`. Ignoring a failed flush or seek could install a descriptor containing incomplete data or positioned at end-of-file, making the command observe silent truncation rather than a redirection error.

A shared error path captures `errno` before diagnostics and `fclose` can overwrite it, substitutes `EIO` when a failed stdio operation leaves no error code, names the failed operation, closes the stream, and returns status 1. The temporary stream therefore becomes command input only after its complete staging contract has been established.

## test(heredoc): 임시 저장 실패의 데이터 절단 방지 검증
Make `fflush` and `fseek` failures injectable and verify that a heredoc is rejected when its temporary backing stream cannot be completed or rewound.

A successful body write alone is insufficient: buffered bytes must reach the temporary file, and the file position must return to the beginning before it replaces standard input. Treating either operation as successful would let the command consume truncated data or immediate EOF. The regression cases require status 1, suppress the `cat` output, and confirm that the shell can execute the following command.

These tests lock down the heredoc staging rule that redirection becomes visible only after the entire temporary-stream preparation sequence succeeds.

## refactor(runtime): 실행 경로의 동적 할당 래퍼 통합
Route dynamic allocation in pipeline setup, heredoc buffering, input growth, and shared string utilities through one runtime layer.

The wrappers initially preserve the ordinary `malloc`, `calloc`, and `realloc` behavior, but `shell_calloc` adds an explicit multiplication-overflow check and reports the condition as `ENOMEM`. Centralizing these calls creates a single boundary where allocation policy and test instrumentation can be applied consistently instead of leaving important paths invisible behind direct libc calls.

This is a structural seam rather than a change to ownership rules: existing callers still decide whether failure is recoverable or fatal. Its value is that later failure propagation and deterministic allocation injection can cover the complete execution path without rewriting each subsystem again.

## fix(memory): 구조화 단계의 할당 실패를 명령 오류로 전파
Replace process-terminating allocation helpers with nullable operations and propagate memory exhaustion through the shell’s existing command-error boundaries.

Previously, `sh_xcalloc` and `sh_strdup` printed an error and called `exit`, so a failure while tokenizing, parsing, copying environment state, or expanding a word bypassed all ownership cleanup and ended the entire shell. The utility layer now returns `NULL`, checks size arithmetic before allocating or joining strings, and leaves each caller responsible for either committing a complete result or releasing its partial construction.

The environment store adopts that rule explicitly. A node is linked only after its structure, key, and value all exist; replacement values are copied before the old value is freed; environment import discards the whole partial list on failure; and `env_to_environ` frees a partially serialized vector. These orderings preserve the previous valid state whenever a replacement allocation fails.

Tokenization and parsing similarly make construction transactional at their local boundary. Token creation frees text it cannot own, parser append operations publish new arrays or redirections only after all required allocations succeed, and one `parse_failure` path releases the current command, current pipeline, and completed pipeline prefix. Expansion and the source-level parse/dequote APIs now return an explicit allocation error instead of silently yielding incomplete structures.

At the command loop, syntax errors retain internal status 258 while allocation failures become ordinary status 1 failures, allowing later input to continue. Startup environment import remains fatal because no usable shell state exists yet, but it now exits through a diagnosed return path rather than from a low-level helper. This establishes the project-wide invariant that allocation failure cannot expose a partially initialized representation or terminate from an arbitrary utility function.

## fix(memory): 실행 자원 할당 실패를 pipeline 오류로 전파
Allocate both pipeline bookkeeping tables before creating any operating-system pipes, and use the overflow-checking allocation wrapper for each table.

The executor needs a pipe-end table and one PID slot per command before it can safely enter the spawn loop. Establishing both allocations first means an allocation failure remains a pure preparation error: no child exists and no pipe descriptor has yet been created. The common allocation path can report status 1 and release only local memory.

Using `shell_calloc` for the pipe table also applies the wrapper’s multiplication-overflow check consistently with the PID table. The explicit `-1` initialization remains necessary because zero-filled descriptors would otherwise look like valid standard-input descriptors to cleanup code.

## fix(heredoc): 준비 실패 뒤 입력 구분자 경계 복구
Continue consuming heredoc input through every pending delimiter after preparation has already failed.

Returning immediately on delimiter dequoting, buffer initialization, or body-expansion failure left the remainder of the current heredoc—and any later heredocs on the same parsed line—in standard input. The command loop could then interpret those body lines as new shell commands. The collector now marks the preparation as failed, discards the rest of the current body, and walks subsequent heredocs solely to consume their input before returning the failure.

Delimiter recovery compares input against the encoded target while skipping literal markers, so quoted delimiters can be recognized without first requiring the allocation that may already have failed. The local body buffer also rejects capacity doubling beyond `SIZE_MAX / 2` instead of overflowing its size calculation.

The key invariant is that heredoc preparation may fail, but it must not silently shift the boundary between heredoc data and future commands.

## fix(input): EOF와 입력 실패를 구분
Give line input an explicit failure channel so an empty end-of-file is no longer indistinguishable from an allocation or `read` error.

The plain reader now uses the runtime `read` wrapper directly, retries `EINTR`, preserves a final unterminated line, checks capacity doubling for overflow, and reports whether a `NULL` result means normal EOF or failure. The main loop can therefore keep the existing last status on ordinary EOF but set status 1 and diagnose a real input error.

Heredoc collection uses the same distinction because its recovery requirements are stricter. EOF before a delimiter remains a warning and yields the body accumulated so far, whereas an input failure aborts the heredoc. After such a failure, the collector attempts to discard through the delimiter so subsequent input is not reinterpreted as commands; if even that recovery read fails, the shell stops because the command boundary can no longer be established reliably.

This makes stream position and error kind part of the input API contract rather than inferring both from a single `NULL` pointer.

## fix(io): builtin과 환경 출력 실패를 상태로 전파
Route builtin, environment, and prompt output through an explicit descriptor-level write helper and propagate failures through command status.

`stdio` calls could defer an error until a later flush, obscuring which builtin failed and requiring the parent executor to inspect global stream state. `shell_write_all` instead handles short writes, retries `EINTR`, treats a zero-length write as `EIO`, and returns failure at the operation that owns the output. `echo`, `pwd`, `cd -`, `env`, and argument-free `export` can therefore report status 1 without relying on a later `fflush(stdout)`.

Changing `env_print` from a `void` procedure to a status-returning operation extends the same contract across multi-part environment lines: any failed fragment stops the traversal and reaches the caller. `cd` also records failures while updating `OLDPWD` or `PWD`, acknowledging that a successful `chdir` can be followed by an unsuccessful environment or output update; the directory change is not rolled back, but the partial failure is no longer reported as success.

Using the same helper for interactive prompts makes input acquisition fail explicitly when the prompt cannot be written. The result is a consistent boundary in which output is part of builtin execution rather than an unowned side effect checked after the fact.

## test(memory): 범위별 할당 실패 순회 검증
Add scoped allocation-failure injection and sweep each major command-processing phase across successive allocation call positions.

Runtime allocation wrappers now observe both the current phase and command number. Tokenization, parsing, heredoc input/body construction, expansion, and execution set explicit scopes before allocating, allowing tests to fail one allocation without coupling the case to unrelated allocations in earlier layers. A one-shot failure is disabled after it fires, while an explicit repeat mode models a persistently unavailable allocator.

The sweep accepts only two coherent outcomes at every injection point: the current operation fails cleanly and later commands continue with status 1, or the targeted call lies beyond the phase’s allocation count and the command completes normally. Dedicated cases also verify that failed parent-builtin preparation does not mutate the environment, failed external-command preparation does not execute the command, heredoc failures recover the following input boundary, and persistent allocation failure terminates rather than looping or executing residual input.

This converts memory cleanup from normal-path confidence into a systematic failure-path contract. The scope markers are test seams only; production allocation still delegates directly to the C allocator.

## test(io): read·write와 heredoc 입력 실패 검증
Make low-level `read` and `write` calls injectable in the test runtime and add regressions for input, builtin output, and heredoc collection failures.

The cases distinguish failures with different recovery scopes. A top-level input read failure must terminate with status 1 without executing buffered commands, while a builtin write failure becomes the command status and permits the next line to observe it. Heredoc read failures must abort the current command, consume or discard enough pending delimiter input to recover the next command boundary, and continue only when that recovery succeeds.

The repeated-failure case exercises the stricter boundary: when both heredoc input and the attempt to discard the remainder keep failing, the shell must stop instead of treating unread heredoc text as future commands. These tests make the input-stream position part of error recovery rather than checking status codes alone.

## build(test): 테스트 시간 제한 하네스 추가
Add a dedicated timeout runner and route the smoke, fault-injection, and allocation-failure suites through it.

The harness launches the target in its own process group, measures deadlines with a monotonic clock, and kills the group before reaping the direct child when time expires or the harness receives `SIGHUP`, `SIGINT`, or `SIGTERM`. Group cleanup matters because a stalled shell may already have forked pipeline children; terminating only the direct process could leave those descendants running after the test reports failure. Child exit and signal states are preserved using conventional status values, while timeout and harness failures remain distinguishable.

Writing test input to files before execution also removes the producer side of a shell pipeline from the process graph under test. Each case therefore has a bounded, self-contained execution whose hang is reported deterministically rather than blocking the complete suite or leaving background processes behind.

## test(lifecycle): FD와 자식 프로세스 누수 검증
Add lifecycle regression coverage for two resources that ordinary output assertions cannot reliably expose: file descriptors and direct child processes.

The suite repeatedly mixes parent-executed redirections, three-stage pipelines, and file input/output while the process is limited to 48 descriptors. Reaching the final marker without diagnostics demonstrates that each command returns its transient descriptors instead of gradually exhausting the process table. A test-only post-pipeline probe uses `waitpid(-1, ..., WNOHANG)` to fail when any direct child is still running or has become an unreaped zombie after the executor reports completion.

The timeout cases also verify that a blocked pipeline is bounded and that terminating the timeout harness does not orphan its launched process. Keeping these probes behind `SMALL_SHELL_TESTING` preserves the production process model while making lifecycle invariants directly observable in the test binary.

## refactor(env): 사용하지 않는 환경 저장소 래퍼 제거
Remove the unused sentinel-aware `shell_env_*` wrapper layer and leave the linked-list `env_*` interface as the single environment-storage contract.

The wrappers supported both a synthetic sentinel node and a direct list head, but no remaining call site used that alternate representation. Keeping them would preserve two ownership and mutation models for the same data without providing an active compatibility boundary. Deleting the declarations and implementations reduces the risk that future code initializes or frees an environment through the wrong model while intentionally leaving runtime behavior unchanged.

## refactor(buffer): 가변 문자열 빌더 모듈 추가
Introduce a reusable string builder with explicit initialization, append, discard, and ownership-transfer operations.

The builder maintains a permanent NUL terminator and grows capacity geometrically from a small initial allocation. It checks both `length + extra + 1` and capacity doubling for `SIZE_MAX` overflow, falling back to the exact required capacity when another doubling would overflow. Allocations pass through the runtime wrappers, so existing allocation-failure injection can exercise initialization and growth paths.

Separating `discard` from `take` makes ownership visible at call sites: failed construction frees the partial buffer, while successful construction transfers the allocation and resets the builder. This abstraction provides the performance and cleanup contract later used by both lexical word construction and expansion.

## refactor(lexer): 단어 조립을 가변 버퍼로 전환
Assemble lexer words in the shared growable buffer rather than reallocating the complete token text for each source character.

This is especially important for quoted segments because single-quoted characters are encoded as a literal marker plus the character itself; appending both bytes through one builder preserves that representation without multiplying whole-buffer copies. Unquoted and double-quoted text retain their previous encoding and the token-level `quoted` flag remains unchanged.

The lexer now has a clear partial-result rule: allocation failure or an unclosed quote discards the builder, while a valid word transfers the completed buffer to the token. The change therefore improves asymptotic behavior without weakening syntax-error cleanup or quote semantics.

## refactor(expand): 확장 결과를 가변 버퍼로 조립
Build expanded and dequoted words through the shared growable string builder instead of allocating and copying a complete replacement string for every character or substitution.

The previous `sh_strjoin_free` loop made long words increasingly expensive because each append copied all output accumulated so far. Appending into geometrically grown capacity changes that construction cost to amortized linear time while preserving the existing handling of literal markers, `$?`, environment names, unset values, and empty results.

Failure handling now follows an explicit builder ownership protocol: discard the partial buffer when substring allocation or an append fails, and transfer the completed allocation only on success. This keeps expansion atomic from the caller’s perspective—either a complete owned string is returned or no partial result escapes.

## test(performance): 긴 입력 처리 시간 상한 검증
Add a regression check that feeds a 512 KiB word through the complete input, tokenization, parsing, expansion, and builtin-output path under a five-second deadline.

The test verifies more than process completion: it requires a zero status, no diagnostic output, and an exact payload length including the trailing newline. This turns the string builder’s intended amortized growth behavior into an observable end-to-end constraint and detects regressions that reintroduce repeated whole-string copying or truncate large inputs.

## build(test): ASan·UBSan 검증 경로 추가
Add dedicated AddressSanitizer and UndefinedBehaviorSanitizer build graphs for the production binary, the fault-injection binary, and the source-level parser API test, then run the existing smoke, failure, allocation, lifecycle, parser, and performance suites against those instrumented artifacts.

Keeping sanitizer binaries separate from ordinary objects avoids silently reusing incompatible compilation products and ensures the test seam is instrumented with the same runtime checks as the product path. The test scripts preserve sanitizer options even when they intentionally rebuild the environment with `env -i`, so fault injection does not accidentally disable diagnostics.

The container target fixes the compiler/runtime context to GCC 13, removes network access, mounts the repository read-only, and copies it into a tmpfs work area before building. This makes the validation path reproducible while retaining the write access required for generated objects and binaries.

## fix(exec): pipe 생성 실패 시 PID 배열 해제
Release the PID array when pipeline pipe creation fails after both execution arrays have already been allocated.

This failure occurs before any child is spawned, so cleanup belongs entirely to the parent and should cover every resource acquired during pipeline preparation: close the pipe ends that were opened, free the pipe table, and free the still-local PID table. Keeping the PID allocation alive on this return path would leak once per injected or real `pipe` failure even though execution never begins.
