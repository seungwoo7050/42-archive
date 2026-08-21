# Making text construction asymptotically safe and observable

> 한국어 주제: **점근적으로 안전하고 관찰 가능한 text construction**
>
> Project: `small-shell`  
> Branch: `c/minishell`  
> Development Thread order: 5/5

## 1. Thread 목표

문자 또는 치환마다 전체 문자열을 다시 복사하던 경로를 overflow-safe growable builder로 바꾸고, lexer와 expansion semantics를 유지하면서 end-to-end time bound와 sanitizer로 검증한 흐름을 복원합니다.

**Source-defined significance**

> The shared abstraction removes repeated whole-string copies while keeping overflow and partial-ownership rules explicit. Only the builder introduction is A because it makes the structural decision; the migrations are applications of that choice. The performance and sanitizer paths provide observable evidence without inflating those supporting commits to architecture-level importance.

**학습 관점**

공통 builder는 성능만 개선한 것이 아니라 permanent NUL, overflow check, discard/take ownership protocol을 여러 text-processing stage에 통일합니다. Migration commit은 그 결정을 적용하고, performance와 sanitizer path는 결과를 관찰합니다.

### SHA 고정 원칙

- 각 commit은 반드시 표시된 exact SHA 또는 그 parent와 비교합니다.
- 먼저 `git show --name-status <SHA>`로 변경 파일을 식별한 뒤, 필요한 path만 `git diff <SHA>^ <SHA> -- <path>`로 봅니다.
- 실제 구현은 `git show <SHA>:<path>` 또는 detached worktree에서 확인합니다.
- final HEAD의 type, function, test를 과거 commit 설명에 소급하지 않습니다.
- later commit의 field나 fix가 아직 존재하지 않는 SHA에서는 그 부재 자체를 기록합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- builder의 data, length, capacity invariant와 permanent NUL terminator는 어느 함수에서 유지됩니까?
- `length + extra + 1`과 capacity doubling의 overflow를 각각 어떻게 검사합니까?
- `discard`와 `take`를 분리하면 failure와 success의 ownership이 어떻게 명확해집니까?
- lexer에서 single-quote marker와 character 두 byte를 append할 때 기존 representation이 보존됩니까?
- expansion에서 `$?`, `$NAME`, unset value, literal marker, empty result semantics가 migration 전후 동일합니까?
- 512 KiB end-to-end test가 실제로 증명하는 것과 수학적으로 증명하지 않는 것은 무엇입니까?
- sanitizer build graph를 ordinary build와 분리하는 이유는 무엇입니까?

## 3. 완료 기준

- [x] builder의 growth equation과 overflow branches를 실제 코드로 설명했습니다.
- [x] success `take`와 failure `discard` 뒤 builder state를 기록했습니다.
- [x] lexer와 expansion migration의 before/after loop를 비교해 repeated whole-string copy 제거를 확인했습니다.
- [x] semantic equivalence를 marker, quote flag, variable/status expansion 항목별로 검증했습니다.
- [x] performance test의 input size, deadline, status, stderr, output-length assertion을 기록했습니다.
- [x] ASan/UBSan artifact와 test seam이 모두 instrument되는 build graph를 확인했습니다.

> 실행 범위: exact SHA의 commit diff와 source/test/build graph를 GitHub repository에서 검사했습니다. Branch checkout이 불가능해 performance와 sanitizer targets는 실행하지 않았습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source-defined role |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `b8347c06b6c7` | `refactor(buffer): 가변 문자열 빌더 모듈 추가` | A | `ARCH`, `PERF`, `REFACTOR` | Defines the shared builder's growth, overflow, discard, and ownership-transfer contracts. |
| 2 | `985f90b9cbc7` | `refactor(lexer): 단어 조립을 가변 버퍼로 전환` | B | `LEX_PARSE`, `PERF`, `REFACTOR` | Applies it to quote-aware lexer word construction. |
| 3 | `89e1a06f06c9` | `refactor(expand): 확장 결과를 가변 버퍼로 조립` | B | `EXPANSION`, `PERF`, `REFACTOR` | Applies it to expansion and dequoting. |
| 4 | `b36b9d324260` | `test(performance): 긴 입력 처리 시간 상한 검증` | B | `TEST`, `PERF` | Verifies a large word end to end under an explicit time bound. |
| 5 | `7d7dd7ad9d8a` | `build(test): ASan·UBSan 검증 경로 추가` | B | `TEST`, `PRACTICAL` | Runs the complete behavior, failure, lifecycle, and performance suites under sanitizers. |

## 5. Commit별 학습 기록

### 5.1 `b8347c06b6c7` — `refactor(buffer): 가변 문자열 빌더 모듈 추가`

#### 확정 정보
- SHA: `b8347c06b6c7`
- Subject: `refactor(buffer): 가변 문자열 빌더 모듈 추가`
- Importance: **A**
- Tags: `ARCH`, `PERF`, `REFACTOR`
- Source-defined role: Defines the shared builder's growth, overflow, discard, and ownership-transfer contracts.
- 학습 깊이: 주요 subsystem boundary, integration point 또는 failure path. 핵심 코드와 설계 판단을 확인합니다.

#### Source에서 확정된 변화
Initialization, append, discard, take를 가진 reusable string builder를 도입합니다. 항상 NUL을 유지하고 geometric growth와 overflow check를 수행하며 success/failure ownership을 분리합니다.

#### Refactor 판단 기록
- 기존 abstraction 또는 cost/failure 관찰 한계: `sh_strjoin_free` 방식은 문자나 substitution 하나를 추가할 때마다 old prefix 전체를 새 allocation으로 복사하고 old allocation을 free했습니다.
- 새 boundary가 제공하는 contract: builder owns one growable allocation; `length`, `capacity`, terminal NUL을 유지하고 append reserve arithmetic을 검사하며 failure는 old builder state를 보존합니다.
- production semantics가 유지된다는 코드 근거: 이 commit은 module과 build source만 추가하고 lexer/expander call sites는 아직 바꾸지 않습니다.
- ownership 또는 call-site responsibility 변화: builder init 후 allocation owner는 builder; failure는 caller가 `discard`; success는 `take`에서 completed allocation을 caller로 이전합니다.
- 후속 fix/test가 이 seam을 사용하는 방식: lexer와 expander가 repeated join을 append/take로 교체하고 performance/sanitizer suites가 observable behavior를 검사합니다.

#### `b8347c06b6c7`에서 확인할 실제 코드
- `src/string_builder.h`의 `t_string_builder { data, length, capacity }`를 확인했습니다.
- Init은 fields를 zero/reset한 뒤 initial capacity 64 allocation을 시도하고 성공 시 `data[0] = '\0'`입니다.
- Append는 reserve 성공 뒤 bytes를 copy하고 `length`를 갱신한 다음 `data[length] = '\0'`를 씁니다.
- Required size 계산 전 `extra > SIZE_MAX - length - 1`을 검사합니다.
- Capacity는 geometric doubling하되 doubling overflow 위험이면 exact `needed` capacity로 fallback합니다.
- Realloc result는 temporary pointer에 받고 success 뒤에만 `data/capacity`를 갱신합니다.
- `discard`는 allocation free 후 all fields reset, `take`는 pointer를 return하고 builder를 reset합니다.

#### 학습자가 남길 코드 증거
- builder state invariant:

```text
initialized/successful state:
  data != NULL
  length < capacity
  data[length] == '\0'

reset state after discard/take or failed init:
  data == NULL, length == 0, capacity == 0
```

- growth/overflow equation: first check `extra <= SIZE_MAX - length - 1`; then `needed = length + extra + 1`. While `new_capacity < needed`, double only when safe; otherwise set `new_capacity = needed`.
- discard 전/후 state: before owns partial allocation/content; after allocation freed and fields zero.
- take 전/후 owner: before builder owns `data`; return pointer becomes caller-owned and builder fields become reset, preventing double free.
- allocation failure path: initial malloc leaves reset builder; realloc NULL leaves original allocation/content/metadata unchanged.
- old/new copy pattern 비교: old append copies prefix length 1+2+...+N; builder copies each input byte once plus occasional geometric reallocation copies, amortized linear.
- 확인한 변경 파일: `src/string_builder.c`, `src/string_builder.h`, `Makefile`.
- 핵심 caller → callee: later lexer/expander → builder init → reserve/append → take or discard → runtime allocation wrappers.
- parent SHA와 비교한 최소 before/after snippet:

```c
if (extra > SIZE_MAX - builder->length - 1)
    return -1;
needed = builder->length + extra + 1;
```

- 해당 SHA에서 실행한 test 또는 수동 재현 결과: 실행하지 않았습니다. Exact module implementation과 Makefile source inclusion을 검사했습니다.

#### 보장 범위
- 이 commit이 보장하는 것: text construction이 overflow-safe geometric buffer와 explicit discard/take ownership protocol을 공유할 수 있습니다.
- 아직 보장하지 않는 것: 이 commit은 abstraction만 도입하며 lexer/expansion behavior와 end-to-end performance는 아직 바꾸지 않습니다.

#### Thread 내 다음 연결
`985f90b9cbc7`와 `89e1a06f06c9`가 각각 lexer와 expansion을 migration합니다.

### 5.2 `985f90b9cbc7` — `refactor(lexer): 단어 조립을 가변 버퍼로 전환`

#### 확정 정보
- SHA: `985f90b9cbc7`
- Subject: `refactor(lexer): 단어 조립을 가변 버퍼로 전환`
- Importance: **B**
- Tags: `LEX_PARSE`, `PERF`, `REFACTOR`
- Source-defined role: Applies it to quote-aware lexer word construction.
- 학습 깊이: Thread 흐름에서 맡는 구현 역할과 필요한 state/ownership 변화를 확인합니다.

#### Source에서 확정된 변화
Lexer word construction을 shared builder로 전환하며 single-quoted character의 literal marker+byte encoding, unquoted/double-quoted semantics, token-level quoted flag를 유지합니다.

#### Refactor 판단 기록
- 기존 abstraction 또는 cost/failure 관찰 한계: source character마다 `sh_strjoin_free`가 current word 전체를 다시 allocate/copy했습니다.
- 새 boundary가 제공하는 contract: one builder per word scan; each fragment appends into reserved capacity; only completed word is taken into token ownership.
- production semantics가 유지된다는 코드 근거: quote state branches, marker insertion, quoted flag set, empty quoted word and unclosed quote conditions are preserved in the diff.
- ownership 또는 call-site responsibility 변화: local `char *word` ownership becomes local builder ownership; token receives allocation only through final `string_builder_take`.
- 후속 fix/test가 이 seam을 사용하는 방식: performance fixture drives input → lexer builder and sanitizer suites exercise quote/error paths.

#### `985f90b9cbc7`에서 확인할 실제 코드
- Parent SHA's append helper repeatedly allocated/joined full prefix.
- New `read_word` initializes builder once, appends each byte/fragment, and takes at success.
- Single-quote branch appends marker then character, preserving two-byte encoding.
- Unquoted/double-quoted byte branch remains marker-free.
- Quote syntax participation still sets token-level `quoted` flag.
- If second append in marker+byte pair fails, builder may contain a local marker but error path discards it, so partial representation is never published.
- Allocation failure or unclosed quote discards builder; successful token is sole owner of taken buffer.

#### 학습자가 남길 코드 증거
- old construction loop: each `append_char` produced new allocation containing entire old word plus one byte and freed old word.
- new builder call sequence: init → scan/append → on error discard → on success take → token node publish.
- marker encoding equivalence: single-quoted byte still emits `[LITERAL_MARK, byte]` in exact order.
- quoted flag equivalence: entering either single or double quote sets flag independent from encoded marker.
- failure discard와 success take: any scan/append/unclosed quote error calls discard; success only calls take once.
- token ownership after publish: taken pointer is node-owned and freed by `free_tokens`.
- 확인한 변경 파일: `src/token.c`, build/include references to builder.
- 핵심 caller → callee: `tokenize_line` → `read_word` → `string_builder_init/append_char/take` or discard.
- parent SHA와 비교한 최소 before/after snippet:

```text
before: word = sh_strjoin_free(word, one_or_two_bytes)
 after: string_builder_append_char(&builder, byte); ...; word = string_builder_take(&builder)
```

- 해당 SHA에서 실행한 test 또는 수동 재현 결과: 실행하지 않았습니다. Before/after diff에서 all quote branches and cleanup mapping을 검사했습니다.

#### 보장 범위
- 이 commit이 보장하는 것: lexer의 quote-aware representation을 유지하면서 long word construction을 geometric buffer에 옮깁니다.
- 아직 보장하지 않는 것: expansion/dequote의 repeated copying은 아직 남고, 성능 개선의 end-to-end evidence도 후속 test가 제공합니다.

#### Thread 내 다음 연결
`89e1a06f06c9`가 expansion과 dequote를 같은 builder contract로 옮깁니다.

### 5.3 `89e1a06f06c9` — `refactor(expand): 확장 결과를 가변 버퍼로 조립`

#### 확정 정보
- SHA: `89e1a06f06c9`
- Subject: `refactor(expand): 확장 결과를 가변 버퍼로 조립`
- Importance: **B**
- Tags: `EXPANSION`, `PERF`, `REFACTOR`
- Source-defined role: Applies it to expansion and dequoting.
- 학습 깊이: Thread 흐름에서 맡는 구현 역할과 필요한 state/ownership 변화를 확인합니다.

#### Source에서 확정된 변화
Expanded/dequoted output을 `sh_strjoin_free` 반복 대신 builder append로 조립하여 amortized linear construction으로 바꾸고, literal marker, `$?`, `$NAME`, unset value, empty result semantics를 유지합니다.

#### Refactor 판단 기록
- 기존 abstraction 또는 cost/failure 관찰 한계: ordinary byte와 each variable/status substitution을 append할 때 full accumulated output을 반복 복사했습니다.
- 새 boundary가 제공하는 contract: one builder owns partial expanded output; branch-specific bytes/strings append; complete result만 take합니다.
- production semantics가 유지된다는 코드 근거: old/new branch mapping for marker, ordinary char, `$?`, valid name, unset and unknown `$` remains equivalent.
- ownership 또는 call-site responsibility 변화: partial expansion becomes builder-owned; caller field replacement happens only after successful take, preserving encoded source on failure.
- 후속 fix/test가 이 seam을 사용하는 방식: 512 KiB full-product deadline catches repeated copying/truncation and sanitizer suites run expansion/failure cases under instrumentation.

#### `89e1a06f06c9`에서 확인할 실제 코드
- Parent's per-character/per-substitution `sh_strjoin_free` loop is removed.
- Expansion/dequote entries init builder and final success takes allocation.
- Literal marker consumes marker+next and appends only literal byte.
- `$?` appends decimal current status; `$NAME` scans valid name and appends environment value; unset appends nothing.
- Unknown/incomplete dollar retains literal behavior.
- Environment name substring allocation can fail; error path frees substring if needed and discards builder.
- Empty final output remains a valid owned empty string from initialized builder.
- Caller publishes replacement only after whole expand succeeds.

#### 학습자가 남길 코드 증거
- old quadratic copy source: output-growing join inside scan loop and substitution branches.
- new builder branch mapping:

| Encoded input branch | Builder action |
| --- | --- |
| literal marker + byte | append byte, advance 2 |
| ordinary byte | append char |
| `$?` | convert status, append text |
| `$NAME` | allocate/lookup name, append value if present |
| unset name | append zero bytes |

- `$?`/`$NAME`/unset/empty semantics: same as parent; initialized empty buffer ensures all-unset input returns `""`, not NULL.
- substring allocation failure cleanup: free temporary key if allocated, discard builder, return failure; old encoded field remains owned by caller.
- take 후 ownership replacement: complete new string becomes parsed field; only then old encoded string is freed.
- semantic equivalence evidence: each parent branch has one corresponding builder append branch; no connector/quote timing change in this commit.
- 확인한 변경 파일: `src/expand.c`, builder headers/build dependencies.
- 핵심 caller → callee: selected pipeline expansion → word/dequote helper → builder operations → take → field replacement.
- parent SHA와 비교한 최소 before/after snippet:

```text
before: result = sh_strjoin_free(result, fragment)
 after: string_builder_append_text(&builder, fragment)
```

- 해당 SHA에서 실행한 test 또는 수동 재현 결과: 실행하지 않았습니다. Exact semantic branch mapping and replacement order를 검사했습니다.

#### 보장 범위
- 이 commit이 보장하는 것: expansion과 dequoting이 complete-or-no-result ownership을 유지하면서 repeated whole-string copies를 제거합니다.
- 아직 보장하지 않는 것: amortized behavior의 observable upper bound는 다음 end-to-end test가 제공하며 이 commit 자체가 시간 제한을 증명하지 않습니다.

#### Thread 내 다음 연결
`b36b9d324260`가 512 KiB word를 complete product path로 통과시켜 performance regression을 고정합니다.

### 5.4 `b36b9d324260` — `test(performance): 긴 입력 처리 시간 상한 검증`

#### 확정 정보
- SHA: `b36b9d324260`
- Subject: `test(performance): 긴 입력 처리 시간 상한 검증`
- Importance: **B**
- Tags: `TEST`, `PERF`
- Source-defined role: Verifies a large word end to end under an explicit time bound.
- 학습 깊이: Thread 흐름에서 맡는 구현 역할과 필요한 state/ownership 변화를 확인합니다.

#### Source에서 확정된 변화
512 KiB word를 input, tokenization, parsing, expansion, builtin output까지 통과시키고 five-second deadline, status 0, no diagnostics, exact payload length를 요구합니다.

#### Test commit 학습 기록
- 대상 production invariant: large single word must complete without pathological repeated-copy delay, truncation, error, or unexpected diagnostic.
- 재현하는 failure 또는 boundary: 524,288-byte payload that makes old per-character whole-prefix copying prohibitively expensive.
- 사용한 test technique: generated end-to-end shell input + timeout runner + status/stderr/stdout-size assertions.
- 실제 통과하는 production code path: input allocation/read → lexer builder → parser argv → selected expansion builder → builtin `echo` output.
- 이 테스트가 증명하는 것: configured product/build/hardware에서 512 KiB payload completes under 5 seconds, exits 0, emits no stderr, and outputs all payload bytes plus newline.
- 이 테스트가 증명하지 않는 것: Big-O를 수학적으로 증명하거나 all hardware/compiler absolute latency, all token/expansion patterns을 보장하지 않습니다.
- broad integration / deterministic regression / stress·probe 중 분류: broad end-to-end performance regression with explicit upper bound입니다.
- 후속 변경에서 막는 회귀: repeated full-prefix join 재도입, truncation/overflow, large-output failure입니다.

#### `b36b9d324260`에서 확인할 실제 코드
- `tests/performance.sh`가 exactly 524,288 `x` bytes를 shell `echo` input에 넣고 command newline을 추가합니다.
- Product binary를 timeout runner through 5-second limit으로 실행합니다.
- Exit status 0과 empty stderr를 별도 검사합니다.
- `wc -c`/equivalent output-length assertion은 payload 524,288 + echo newline 1을 요구합니다.
- Exact length check catches truncation without comparing a huge expected string.

#### 학습자가 남길 코드 증거
- 대상 performance contract: 512 KiB one-word echo completes in <= test timeout with exact output.
- input size와 generated bytes: payload 524,288 bytes of `x`; shell command framing/newline separate.
- 통과하는 production stages: input, tokenization, parse argv allocation, expansion/dequote, builtin output.
- deadline/status/stderr/output assertions: 5 seconds, status 0, stderr empty, stdout 524,289 bytes.
- regression으로 잡는 old failure mode: O(N²)-like cumulative prefix copying and any truncation/failure caused by long word handling.
- 증명하지 않는 것: theoretical complexity, environment-independent performance, variable-heavy worst cases.
- broad integration 또는 performance regression 판정: broad product performance regression.
- 확인한 변경 파일: `tests/performance.sh`, Makefile test suite inclusion.
- 핵심 caller → callee: script generator → timeout runner → `small-shell` → full input/token/parse/expand/builtin path.
- parent SHA와 비교한 최소 before/after snippet: no production change; large fixture and four observable assertions added.
- 해당 SHA에서 실행한 test 또는 수동 재현 결과: 실행하지 않았습니다. Exact input size, timeout, expected status/stderr/length를 script로 확인했습니다.

#### 보장 범위
- 이 commit이 보장하는 것: 긴 입력에서 repeated whole-string copying이나 truncation이 재도입되면 observable test failure로 드러납니다.
- 아직 보장하지 않는 것: 다른 hardware/compiler의 절대 성능이나 이론적 Big-O를 직접 증명하지 않습니다.

#### Thread 내 다음 연결
`7d7dd7ad9d8a`가 동일 behavior/failure/lifecycle/performance suites를 sanitizer artifacts로 실행합니다.

### 5.5 `7d7dd7ad9d8a` — `build(test): ASan·UBSan 검증 경로 추가`

#### 확정 정보
- SHA: `7d7dd7ad9d8a`
- Subject: `build(test): ASan·UBSan 검증 경로 추가`
- Importance: **B**
- Tags: `TEST`, `PRACTICAL`
- Source-defined role: Runs the complete behavior, failure, lifecycle, and performance suites under sanitizers.
- 학습 깊이: Thread 흐름에서 맡는 구현 역할과 필요한 state/ownership 변화를 확인합니다.

#### Source에서 확정된 변화
Production binary, fault-injection binary, source-level parser test에 별도 ASan/UBSan build graph를 만들고 existing smoke, failure, allocation, lifecycle, parser, performance suites를 instrumented artifacts로 실행합니다.

#### Build / validation boundary 기록
- 생성되는 artifact와 source set: ordinary product-equivalent sanitizer binary, test-seam sanitizer binary, parser API sanitizer test; ASan and UBSan variants each use dedicated objects/binaries.
- ordinary build와 분리되는 이유: instrumentation compiler/link flags must apply consistently to every object; ordinary objects cannot be reused without leaving code uninstrumented or causing runtime/link mismatch.
- 실행되는 validation path: smoke, process/FD/I/O faults, allocation sweep, lifecycle, parser API, performance suites run against sanitizer artifacts.
- build change가 runtime semantics를 바꾸지 않는 근거: production source logic is unchanged; only separate compile/link flags, artifact paths, test environment propagation, and targets are added.

#### `7d7dd7ad9d8a`에서 확인할 실제 코드
- Makefile has separate ASan/UBSan object dirs and binary targets rather than reusing ordinary objects.
- Flags include `-O1 -g -fno-omit-frame-pointer` and `-fsanitize=address` or `-fsanitize=undefined` at compile/link.
- Fault binary retains `SMALL_SHELL_TESTING` under instrumentation.
- Parser API test builds production sources excluding `main.c` with sanitizer instrumentation.
- `test-asan` and `test-ubsan` invoke smoke, faults, allocation, lifecycle, parser, performance suites.
- Tests using `env -i` explicitly preserve sanitizer option variables.
- Container target uses `gcc:13-bookworm`, disables network, mounts source read-only, copies to writable temporary space, then builds/runs tests.

#### 학습자가 남길 코드 증거
- sanitizer build graph:

```text
ordinary objects ──> ordinary binaries
ASan objects     ──> ASan product / ASan fault / ASan parser test
UBSan objects    ──> UBSan product / UBSan fault / UBSan parser test
```

- instrumented artifact별 source set: product all production sources; fault same plus testing macro/seams; parser API production library-like sources without normal main plus `tests/parser_api.c`.
- 실행되는 suite 목록: `tests/smoke.sh`, `tests/faults.sh`, `tests/allocation.sh`, `tests/lifecycle.sh`, parser API executable, `tests/performance.sh`.
- `env -i` option preservation: ASAN/UBSAN option environment is reintroduced so isolated test invocations keep sanitizer behavior.
- container reproducibility boundary: pinned GCC 13 bookworm image, network none, read-only repository input, writable temp copy.
- sanitizer가 증명하는 것과 증명하지 않는 것: exercised paths contain no sanitizer-detected address/undefined behavior under configured runtime; unexecuted paths/all bug classes/formal memory safety are not proven.
- 확인한 변경 파일: `Makefile`, `tests/container_sanitizers.sh`, environment setup in existing test scripts.
- 핵심 caller → callee: make target → dedicated objects/binaries → complete shell/test suites under sanitizer runtime.
- parent SHA와 비교한 최소 before/after snippet: ordinary graph remains and parallel sanitizer graphs/targets are added.
- 해당 SHA에서 실행한 test 또는 수동 재현 결과: 실행하지 않았습니다. Make dependency graph, recipes, flags, suite list, container script를 source로 확인했습니다.

#### 보장 범위
- 이 commit이 보장하는 것: behavior와 fault seams가 sanitizer instrumentation 아래 동일하게 검증되고 incompatible object reuse를 피합니다.
- 아직 보장하지 않는 것: sanitizer가 모든 memory/lifetime bug를 증명하지 않으며 configured compiler/runtime와 exercised paths에 한정됩니다.

#### Thread 내 다음 연결
Text-construction Thread의 마지막 validation layer입니다.

## 6. Invariant ledger

Source가 명시한 invariant와 engineering difficulty를 유지하고 exact code 근거를 채웠습니다.

| Invariant | Source에서 확정된 의미 | 처음 도입/표현 | 강화·복구·검증 | 학습자가 확인한 코드 근거 |
| --- | --- | --- | --- | --- |
| Builder output is always NUL-terminated. | 초기화와 모든 append 뒤 `data[length]`가 NUL이어야 합니다. | `b8347c06b6c7` | `985f90b9cbc7`, `89e1a06f06c9`에서 실제 사용 | Init `data[0]='\0'`; append copies bytes, updates length, writes final NUL; take/discard reset metadata. |
| Growth arithmetic cannot wrap. | `length + extra + 1`과 geometric doubling 모두 `SIZE_MAX`를 넘기지 않아야 합니다. | `b8347c06b6c7` | runtime allocation failure injection과 sanitizer path | `extra > SIZE_MAX - length - 1` guard, safe doubling and exact-needed fallback, temporary realloc publish. |
| Partial output does not escape on failure. | 실패 시 builder를 discard하고, 성공 시에만 allocation을 take하여 caller에 이전합니다. | `b8347c06b6c7` | `985f90b9cbc7`, `89e1a06f06c9` | Lexer unclosed/allocation errors and expander substring/append errors discard; token/field gets pointer only after take. |
| Performance change preserves lexical and expansion semantics. | literal marker, quote flag, `$?`, environment name, unset value, empty result 동작은 유지되어야 합니다. | `985f90b9cbc7`, `89e1a06f06c9` | `b36b9d324260`, `7d7dd7ad9d8a` | Parent/new branch mapping preserves semantics; large full-product regression and complete sanitizer suites provide observable evidence. Runtime not executed here. |

### Ledger 작성 시 확인한 것

- Builder invariant is introduced before callers migrate.
- Migration commits apply existing semantics rather than redefining quote/expansion policy.
- Performance evidence and sanitizer evidence are observational, not formal complexity/memory proofs.
- Failure path always leaves builder owner capable of one discard; success path transfers exactly once through take.

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 문제 | Feature / 기존 상태 | Fix 또는 결정 | Regression / 확인 방법 | 학습자 코드 근거 |
| --- | --- | --- | --- | --- |
| character/substitution마다 whole output을 재할당·복사하여 긴 입력에서 비용이 누적됨 | 기존 `sh_strjoin_free` 중심 construction | `b8347c06b6c7` builder 도입 → `985f90b9cbc7`, `89e1a06f06c9` migration | `b36b9d324260` 512 KiB end-to-end deadline | Parent/new loops, builder reserve math, 524,288-byte fixture와 5-second/exact-length assertions를 연결했습니다. |
| 성능 refactor가 marker encoding이나 ownership cleanup을 깨뜨릴 위험 | lexer/expansion의 기존 semantics | migration commit에서 동일 branch semantics와 discard/take protocol 유지 | `7d7dd7ad9d8a`의 complete suites under ASan/UBSan | Marker/quote/status/env/unset branch mapping과 instrumented suite graph를 연결했습니다. 실제 sanitizer는 실행하지 않았습니다. |

## 8. Ownership / state / responsibility 변화

| 대상 | Owner / 책임 주체 | 책임 종료 시점 | 해당 SHA에서 확인할 내용 | 학습자 기록 |
| --- | --- | --- | --- | --- |
| builder allocation | builder object | discard 또는 take | init 이후 pointer/length/capacity state 기록 | Init success부터 builder-owned; realloc uses temp so failure preserves owner/state. |
| partial text | builder | failure 시 discard | caller에 노출되지 않는지 확인 | All lexer/expander error labels discard before return; no field/list append. |
| completed text | caller after take | token 또는 expanded field cleanup | take 뒤 builder reset state 확인 | Take returns pointer and zeroes builder; token/free_pipeline later owns cleanup. |
| old lexer/expansion string | caller field/local | new result publish 뒤 free | migration의 replacement ordering 기록 | New result complete/taken first; caller then swaps/frees old encoded string. |
| sanitizer artifacts | build graph | target별 clean/rebuild | ordinary object 재사용 금지 여부 확인 | Dedicated object dirs and link targets ensure all units carry matching instrumentation. |

## 9. Thread 최종 상태

Builder API ownership transition:

| Operation | Input state | Success state | Failure state |
| --- | --- | --- | --- |
| init | reset | owned empty NUL buffer cap 64 | reset/no allocation |
| append | valid builder | bytes appended, terminal NUL | previous builder/content unchanged |
| discard | any builder-owned allocation | reset, allocation freed | not applicable |
| take | valid builder | caller owns returned allocation; builder reset | not applicable |

Old complexity source was per-fragment whole-prefix join. New growth uses reserved geometric capacity, so each append writes only new bytes while reallocations happen logarithmically in capacity growth. Semantic equivalence is established by branch mapping; performance is observed by a 512 KiB full-product deadline. Sanitizer targets cover configured paths but do not prove all platforms or unexecuted code.

### 최종 상태 기록

- 최종적으로 유지되는 data/resource ownership: one builder owns partial text; success transfers one completed allocation to token/parsed field, failure discards without publication.
- 최종적으로 보장되는 execution 또는 recovery rule: growth arithmetic is checked, terminal NUL is maintained, and lexer/expander preserve previous semantics while avoiding per-byte full-prefix copies.
- Thread가 해결한 가장 어려운 failure: overflow or second append/allocation failure in a partially encoded/expanded word must not publish malformed text or lose the original field.
- Thread 밖에 남아 있는 보장 범위: theoretical proof, all hardware latency, all sanitizer bug classes, unexercised paths are outside evidence.

## 10. 최종 architecture 또는 execution flow 정리

```text
[builder init: reset fields → allocate cap 64 → data[0]=NUL]
  ↓ append request(extra)
[check extra <= SIZE_MAX - length - 1]
  ↓ needed = length + extra + 1
[geometric grow, or exact needed when doubling would overflow]
  ↓ append bytes → update length → data[length]=NUL
  ↓ final outcome
    ├─ success: take → caller owns completed allocation; builder reset
    └─ failure: discard → no partial output escapes
  ↓ lexer + expansion migrations preserve semantic branches
[512 KiB deadline + ASan/UBSan build/test graphs]
```

### 코드 기반 최종 설명

- 핵심 entry function: string builder init/reserve/append/discard/take; lexer `read_word`; expansion/dequote helpers.
- 주요 caller → callee chain: tokenization/selected expansion → builder APIs → runtime allocators → take/publish or discard.
- state mutation 순서: reserve check → optional realloc temporary → append bytes → length update → terminal NUL; final take resets builder before caller publication.
- ownership transfer 순서: builder local owns allocation throughout partial construction; take returns sole pointer; token/parsed hierarchy becomes owner.
- failure convergence path: reserve/append/sub-allocation/unclosed quote → discard; realloc failure preserves existing builder until discard; original field remains until new complete result.
- regression evidence: performance script and sanitizer build/suite graph were inspected. Their commands were not executed in this environment.

## 11. 학습 완료 자가 점검

- [x] 모든 commit을 exact SHA에서 확인했고 final HEAD를 소급하지 않았습니다.
- [x] Commit map의 SHA, subject, importance, tags, order를 변경하지 않았습니다.
- [x] A commit은 subsystem boundary, growth/ownership contract, failure path와 핵심 code를 설명했습니다.
- [x] B commit은 Thread 내 migration/test/build 역할과 state/ownership 변화를 설명했습니다.
- [x] Test/build commit은 invariant, technique, production path, prove/not prove를 구분했습니다.
- [x] Invariant ledger의 각 행에 실제 file/function/branch 근거가 있습니다.
- [x] 정상·실패 경로 모두에서 partial/completed text의 terminal owner를 설명했습니다.
- [x] 이 Thread의 abstraction → migration → performance observation → sanitizer validation 흐름을 commit history 순서로 재구성했습니다.
