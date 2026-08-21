# From fatal allocation to transactional command failure

> 한국어 주제: **Fatal allocation에서 transactional command failure로**
>
> Project: `small-shell`  
> Branch: `c/minishell`  
> Development Thread order: 4/5

## 1. Thread 목표

low-level allocation failure가 임의의 process exit로 끝나던 초기 모델을, 각 subsystem이 complete result만 publish하고 partial state를 정리한 뒤 command status로 전파하는 모델로 전환한 과정을 복원합니다.

**Source-defined significance**

> The central change is not the wrapper itself but the failure model: construction must either publish a complete owned result or leave no partial state. The later executor and heredoc work shows why a single `NULL` return is insufficient unless side effects and input position are also controlled. The sweep then verifies that this policy holds across the actual command-processing graph.

**학습 관점**

핵심은 wrapper 도입이 아니라 failure model의 변경입니다. `NULL`을 반환하는 것만으로는 부족하며, side effect, existing state, OS resource acquisition, stdin position까지 transaction boundary에 포함해야 합니다.

### SHA 고정 원칙

- 각 commit은 반드시 표시된 exact SHA 또는 그 parent와 비교합니다.
- 먼저 `git show --name-status <SHA>`로 변경 파일을 식별한 뒤, 필요한 path만 `git diff <SHA>^ <SHA> -- <path>`로 봅니다.
- 실제 구현은 `git show <SHA>:<path>` 또는 detached worktree에서 확인합니다.
- final HEAD의 type, function, test를 과거 commit 설명에 소급하지 않습니다.
- later commit의 field나 fix가 아직 존재하지 않는 SHA에서는 그 부재 자체를 기록합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- allocation wrapper가 정책을 결정합니까, 아니면 caller가 recoverable/fatal 여부를 결정합니까?
- environment replacement에서 새 value allocation이 성공하기 전에 기존 value를 해제하면 어떤 invariant가 깨집니까?
- lexer/parser append는 어느 시점에 partial object를 public structure에 연결합니까?
- pipeline table allocation이 OS pipe 생성보다 앞서야 하는 이유는 무엇입니까?
- heredoc allocation failure는 object cleanup 외에 어떤 input side effect를 복구해야 합니까?
- phase·command·call-position scoped injection이 어떤 two coherent outcomes만 허용합니까?
- persistent allocator failure에서 계속 loop를 돌면 왜 residual input 실행 위험이 생깁니까?

## 3. 완료 기준

- [x] fatal helper의 이전 call path와 nullable helper 이후 propagation path를 비교했습니다.
- [x] environment, lexer, parser, expansion 각각에서 `allocate → validate → publish → replace/free` 순서를 기록했습니다.
- [x] 실행 resource table이 side-effect-free preparation으로 바뀐 지점을 확인했습니다.
- [x] heredoc failure에서 memory transaction과 input-position recovery를 함께 설명했습니다.
- [x] allocation sweep의 phase, command number, one-shot/repeat mode, accepted outcomes를 구분했습니다.

> 실행 범위: exact SHA의 commit diff와 source/test scripts를 GitHub repository에서 검사했습니다. Branch checkout이 불가능해 allocation sweep과 sanitizer는 실행하지 않았습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source-defined role |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `0b2e76386678` | `refactor(runtime): 실행 경로의 동적 할당 래퍼 통합` | A | `ARCH`, `FAILURE`, `TEST` | Centralizes allocation and adds overflow-aware wrappers across execution paths. |
| 2 | `0bb6f9de0947` | `fix(memory): 구조화 단계의 할당 실패를 명령 오류로 전파` | S | `ARCH`, `FAILURE`, `RISK` | Replaces process-terminating helpers with nullable, transactional construction and command-level propagation. |
| 3 | `6d95776ede59` | `fix(memory): 실행 자원 할당 실패를 pipeline 오류로 전파` | A | `PROCESS`, `FAILURE`, `RISK` | Extends side-effect-free preparation ordering to executor resource tables. |
| 4 | `c30b39c0bcf8` | `fix(heredoc): 준비 실패 뒤 입력 구분자 경계 복구` | A | `HEREDOC`, `FAILURE`, `RISK` | Protects heredoc stream boundaries when preparation fails after input consumption begins. |
| 5 | `476b082d55c7` | `test(memory): 범위별 할당 실패 순회 검증` | A | `TEST`, `FAILURE`, `RISK` | Sweeps allocation positions by phase and verifies cleanup, state atomicity, continuation, and persistent-failure termination. |

## 5. Commit별 학습 기록

### 5.1 `0b2e76386678` — `refactor(runtime): 실행 경로의 동적 할당 래퍼 통합`

#### 확정 정보
- SHA: `0b2e76386678`
- Subject: `refactor(runtime): 실행 경로의 동적 할당 래퍼 통합`
- Importance: **A**
- Tags: `ARCH`, `FAILURE`, `TEST`
- Source-defined role: Centralizes allocation and adds overflow-aware wrappers across execution paths.
- 학습 깊이: 주요 subsystem boundary, integration point 또는 failure path. 핵심 코드와 설계 판단을 확인합니다.

#### Source에서 확정된 변화
Pipeline setup, heredoc buffering, input growth, shared string utilities의 allocation을 runtime layer로 모으고, `shell_calloc`에 multiplication-overflow check를 추가합니다. Caller의 기존 fatal/recoverable policy는 아직 유지됩니다.

#### Refactor 판단 기록
- 기존 abstraction 또는 cost/failure 관찰 한계: raw `malloc`/`calloc`/`realloc`이 subsystem 곳곳에 있어 overflow behavior와 deterministic injection seam을 한 곳에서 관리할 수 없었습니다.
- 새 boundary가 제공하는 contract: `shell_malloc`, `shell_calloc`, `shell_realloc`이 allocation request를 통과시키고, `shell_calloc`은 `count * size` overflow를 `ENOMEM` failure로 바꿉니다.
- production semantics가 유지된다는 코드 근거: wrapper는 overflow case 외에는 libc allocator를 그대로 호출하고 caller return handling은 이 commit에서 그대로입니다.
- ownership 또는 call-site responsibility 변화: returned pointer의 owner와 cleanup responsibility는 각 caller에 남습니다. Wrapper는 policy owner가 아니라 common call boundary입니다.
- 후속 fix/test가 이 seam을 사용하는 방식: `0bb6...`가 nullable propagation을 project-wide로 만들고 `476b...`가 scope/call-position failure injection을 wrapper에 추가합니다.

#### `0b2e76386678`에서 확인할 실제 코드
- `src/runtime.h/.c`의 three allocation wrappers를 확인했습니다.
- `shell_calloc`은 nonzero size에서 `count > SIZE_MAX / size`를 검사하고 `errno = ENOMEM`, NULL을 반환합니다.
- Pipeline table/PID allocation, heredoc local buffers/entries, input growth, shared duplicate/join utilities가 wrappers로 이동합니다.
- Caller별로 NULL을 이미 처리하는 곳과 fatal helper에 의존하는 곳이 섞여 있습니다.
- Production behavior는 centralization과 overflow guard 외에 변하지 않습니다.

#### 학습자가 남길 코드 증거
- wrapper API map:

| API | Contract |
| --- | --- |
| `shell_malloc(size)` | libc `malloc` delegation |
| `shell_calloc(count,size)` | multiplication overflow면 `ENOMEM`/NULL, 아니면 `calloc` |
| `shell_realloc(ptr,size)` | libc `realloc` delegation, old pointer ownership은 success 전 caller에 유지 |

- overflow check expression: `size != 0 && count > SIZE_MAX / size`.
- routed subsystem 목록: executor tables, heredoc buffers/repository, input buffer, string utilities.
- caller별 failure policy: some callers return failure and cleanup; old `sh_xcalloc`/duplicate helpers may still diagnose and exit.
- 아직 남은 fatal helper와 partial construction 위험: deep lexer/parser/env utility에서 allocation failure가 process termination으로 끝나고 existing state publication ordering이 통일되지 않았습니다.
- 확인한 변경 파일: `src/runtime.c`, `src/runtime.h`, `src/exec.c`, `src/heredoc.c`, `src/input.c`, `src/utils.c`.
- 핵심 caller → callee: subsystem allocator call → shell wrapper → libc allocation; cleanup은 caller-specific입니다.
- parent SHA와 비교한 최소 before/after snippet:

```c
if (size != 0 && count > SIZE_MAX / size) {
    errno = ENOMEM;
    return NULL;
}
return calloc(count, size);
```

- 해당 SHA에서 실행한 test 또는 수동 재현 결과: 실행하지 않았습니다. Wrapper definitions와 routed call sites를 exact diff로 확인했습니다.

#### 보장 범위
- 이 commit이 보장하는 것: allocation behavior를 한 boundary에서 관찰·주입하고 overflow-aware zero allocation을 공통 사용하게 합니다.
- 아직 보장하지 않는 것: global failure model은 아직 바뀌지 않아 low-level fatal exit와 partial publication 문제가 남습니다.

#### Thread 내 다음 연결
`0bb6f9de0947`가 wrapper 위에서 project-wide transactional failure policy를 구현합니다.

### 5.2 `0bb6f9de0947` — `fix(memory): 구조화 단계의 할당 실패를 명령 오류로 전파`

#### 확정 정보
- SHA: `0bb6f9de0947`
- Subject: `fix(memory): 구조화 단계의 할당 실패를 명령 오류로 전파`
- Importance: **S**
- Tags: `ARCH`, `FAILURE`, `RISK`
- Source-defined role: Replaces process-terminating helpers with nullable, transactional construction and command-level propagation.
- 학습 깊이: Architecture / invariant 핵심. 변경 전 가정, failure 가능성, 결정, core code, ownership/lifecycle, follow-up을 추적합니다.

#### Source에서 확정된 변화
Fatal allocation helpers를 nullable operation으로 바꾸고, environment, lexer, parser, expansion, public API, command loop까지 complete result만 publish하고 partial construction을 해제하도록 failure propagation을 재설계합니다.

#### Source가 확정한 핵심 판단
- **문제**: Fatal allocation helpers could terminate the shell from deep inside tokenization, parsing, environment mutation, or expansion, bypassing ownership cleanup and potentially exposing partial state.
- **결정**: Make allocation helpers nullable and require each construction layer to publish only complete results, preserve existing state until replacements succeed, release partial prefixes, and propagate allocation failure through command or startup boundaries.
- **중요한 이유**: This is a project-wide change from exception-like process termination to explicit transactional failure. It affects almost every owned representation and determines whether a running shell can diagnose one failed command and continue safely.
- **확정된 변경 범위**: Utilities gained size checks and nullable returns; environment creation, replacement, import, and serialization became transactional; lexer and parser publishing became failure-aware; expansion and public APIs propagated allocation errors; and the loop distinguished syntax status from command-level memory failure.
- **프로젝트 이해에서의 위치**: It is the central failure-architecture commit. It unifies the ownership lessons from parsing, environment state, execution, and heredoc into one invariant: no incomplete object escapes and no arbitrary helper owns process termination.

#### Fix 재구성 기록
- 기존 가정: allocation failure is unrecoverable anywhere, so `sh_xcalloc`/fatal duplicate helper may diagnose and call `exit` deep in the call graph.
- 실제 failure 또는 위험을 드러내는 입력·상태: env replacement가 old value를 먼저 free한 뒤 new copy 실패, parser가 partial prefix를 publish한 뒤 deep exit, token creation failure가 already built list cleanup을 우회하는 상태입니다.
- root cause가 위치한 representation / lifecycle / ordering boundary: low-level helper가 process lifetime policy를 소유하고 constructors의 publish/rollback protocol이 명시되지 않았습니다.
- 수정된 invariant 또는 decision: allocation은 nullable; each layer keeps new work local until complete, publishes after all dependencies succeed, preserves old state until replacement ready, and propagates failure to command/startup boundary.
- 변경 전 코드 증거: `sh_xcalloc`/old helpers가 NULL에서 diagnostic + `exit`; env replacement sequence may destroy old value before replacement is guaranteed.
- 변경 후 코드 증거: `sh_calloc`/string utilities return NULL; env/token/parser/expand functions check and unwind; line loop distinguishes allocation failure status 1 from syntax 258.
- 연결되는 regression test와 그 한계: `476b082d55c7`가 configured scopes/call positions를 sweep합니다. Unscoped startup/allocator internals 전체를 mathematically prove하지 않습니다.

#### `0bb6f9de0947`에서 확인할 실제 코드
- Parent SHA의 `sh_xcalloc` fatal path와 new nullable utility API를 비교했습니다.
- `src/utils.c`는 size arithmetic failure와 NULL return을 caller-visible하게 만듭니다.
- `src/env.c`의 node construction은 structure/key/value success 뒤 list에 link합니다.
- `env_set` replacement는 new value duplicate가 성공한 뒤 old value를 free/publish합니다.
- `env_from_environ`은 import prefix failure 시 whole partial list를 free합니다.
- `env_to_environ`은 vector/each `KEY=VALUE` failure 시 created prefix를 free합니다.
- Token node가 text ownership을 받을 수 없으면 text/list를 cleanup하고 publish하지 않습니다.
- Parser append는 new argv/string or redirection node/target success 뒤 fields/list를 mutate합니다.
- Shared parse failure는 current command/current pipeline/completed prefix를 정리합니다.
- Expansion/dequote/public parser APIs propagate allocation failure separately from syntax diagnostic.
- `shell_process_line`은 syntax status 258와 allocation status 1을 구분합니다.
- Startup environment import failure는 usable shell state가 없으므로 diagnosed process return 경계입니다.

#### 학습자가 남길 코드 증거
- fatal model의 이전 call graph: lexer/parser/env/expand → fatal utility → diagnostic → `exit`, caller cleanup bypass.
- subsystem별 local partial object와 publish point:

| Subsystem | Local partial | Publish point | Failure cleanup |
| --- | --- | --- | --- |
| environment node | node/key/value | all fields complete then list link | free fields/node |
| environment replace | new value copy | copy success then swap/free old | old value unchanged |
| lexer | word text + token node | both complete then list append | free local + token prefix |
| parser argv/redir | new vector/string or node/target | complete aggregate then field/list update | free new partial, hierarchy cleanup |
| expansion | new string/buffer | complete result then replace field | preserve encoded old field |

- environment replace-before-free transaction: allocate copy → on NULL return with old value intact → on success assign new pointer and free old.
- parser single failure convergence: error label frees local command, local pipeline, already completed sequence prefix.
- public API return/diagnostic ownership: NULL/error code communicates allocation; optional error string itself is checked/owned by caller.
- loop의 status 258 vs 1: syntax/lexical grammar error gets 258; `ENOMEM`/allocation failure gets 1.
- startup fatal boundary vs running-shell recoverable boundary: initial env import failure returns from `main`; per-command token/parse/expand failure diagnoses and leaves loop usable when other state/input is trustworthy.
- 확인한 변경 파일: `include/shell.h`, `src/utils.c`, `src/env.c`, `src/token.c`, `src/parser.c`, `src/expand.c`, `src/exec.c`, `src/input.c`, `src/main.c`.
- 핵심 caller → callee: shell loop → line processor → token/parser/expander; every nullable result bubbles to line boundary; startup env import bubbles to `main`.
- parent SHA와 비교한 최소 before/after snippet:

```text
before: allocate failure → deep helper exit
 after: allocate local → NULL? rollback + return → command boundary status 1
```

- 해당 SHA에서 실행한 test 또는 수동 재현 결과: 실행하지 않았습니다. Exact large diff에서 subsystem publish/rollback and status branches를 검사했습니다.

#### 보장 범위
- 이 commit이 보장하는 것: allocation failure는 이전 valid state를 유지하거나 partial result 전체를 정리하며, arbitrary utility가 running shell을 종료하지 않습니다.
- 아직 보장하지 않는 것: executor bookkeeping tables와 stdin을 이미 소비한 heredoc side effect는 별도 commits에서 같은 policy를 확장합니다.

#### Thread 내 다음 연결
`6d95776ede59`가 OS resource acquisition 전 execution tables를 준비하고, `c30b39c0bcf8`가 input-position transaction을 보강합니다.

### 5.3 `6d95776ede59` — `fix(memory): 실행 자원 할당 실패를 pipeline 오류로 전파`

#### 확정 정보
- SHA: `6d95776ede59`
- Subject: `fix(memory): 실행 자원 할당 실패를 pipeline 오류로 전파`
- Importance: **A**
- Tags: `PROCESS`, `FAILURE`, `RISK`
- Source-defined role: Extends side-effect-free preparation ordering to executor resource tables.
- 학습 깊이: 주요 subsystem boundary, integration point 또는 failure path. 핵심 코드와 설계 판단을 확인합니다.

#### Source에서 확정된 변화
Pipeline pipe-end table과 PID table을 모두 OS pipe 생성 전에 overflow-aware `shell_calloc`으로 확보하여, allocation failure를 child/FD 없는 pure preparation error로 만듭니다.

#### Fix 재구성 기록
- 기존 가정: table allocation과 pipe creation을 interleave하거나 one table 뒤 OS resource를 acquire해도 failure cleanup으로 처리할 수 있다고 보았습니다.
- 실제 failure 또는 위험을 드러내는 입력·상태: some pipe FDs가 live인 뒤 PID table allocation이 실패하면 memory failure가 descriptor cleanup/side effect rollback까지 요구합니다.
- root cause가 위치한 representation / lifecycle / ordering boundary: side-effect-free memory preparation과 externally visible OS acquisition이 섞여 있었습니다.
- 수정된 invariant 또는 decision: both bookkeeping tables를 먼저 allocate/initialize한 뒤에만 first `pipe` call을 합니다.
- 변경 전 코드 증거: resource acquisition 전 all table success가 보장되지 않았습니다.
- 변경 후 코드 증거: PID allocation → pipe table allocation → `-1` initialization → pipe creation 순서입니다.
- 연결되는 regression test와 그 한계: `476b...`의 execute scope가 table allocation positions를 실패시킵니다. Pipe syscall failure cleanup은 process/FD Thread tests가 다룹니다.

#### `6d95776ede59`에서 확인할 실제 코드
- Pipeline execution entry의 two allocation order를 확인했습니다.
- Both success 전 `shell_pipe` call이 없습니다.
- Each allocation failure는 status 1 and local memory cleanup only입니다.
- Pipe slots를 explicit `-1`로 채워 later partial pipe cleanup이 unopened slots를 skip합니다.
- Size multiplication은 `shell_calloc` overflow guard를 통과합니다.

#### 학습자가 남길 코드 증거
- preparation acquisition order: PID table → pipe table → initialize descriptors → OS pipes → children.
- allocation failure 시 live OS resources: none.
- status/cleanup path: first allocation failure는 no local free; second failure는 PID table free; both return 1.
- `-1` initialization 필요성: zero is stdin and cannot represent unopened slot; close helper must skip only negative descriptors.
- global transactional policy의 executor 적용점: all fallible memory preparation before external side effects.
- 확인한 변경 파일: `src/exec.c`.
- 핵심 caller → callee: pipeline dispatcher → `shell_calloc` twice → init loop → pipe creation.
- parent SHA와 비교한 최소 before/after snippet:

```text
allocate PID table
allocate pipe table
initialize every fd slot to -1
only then call pipe()
```

- 해당 SHA에서 실행한 test 또는 수동 재현 결과: 실행하지 않았습니다. Exact acquisition order and failure labels를 검사했습니다.

#### 보장 범위
- 이 commit이 보장하는 것: execution bookkeeping allocation failure는 side effect 없이 status 1로 반환되고 child나 pipe descriptor를 남기지 않습니다.
- 아직 보장하지 않는 것: pipe creation 이후의 syscall failure와 later cleanup은 process/FD Thread의 별도 fixes가 담당합니다.

#### Thread 내 다음 연결
`c30b39c0bcf8`는 allocation failure가 이미 heredoc input을 소비한 뒤 발생하는 더 어려운 transaction boundary를 다룹니다.

### 5.4 `c30b39c0bcf8` — `fix(heredoc): 준비 실패 뒤 입력 구분자 경계 복구`

#### 확정 정보
- SHA: `c30b39c0bcf8`
- Subject: `fix(heredoc): 준비 실패 뒤 입력 구분자 경계 복구`
- Importance: **A**
- Tags: `HEREDOC`, `FAILURE`, `RISK`
- Source-defined role: Protects heredoc stream boundaries when preparation fails after input consumption begins.
- 학습 깊이: 주요 subsystem boundary, integration point 또는 failure path. 핵심 코드와 설계 판단을 확인합니다.

#### Source에서 확정된 변화
Delimiter dequote, body buffer init, body expansion 등이 실패한 뒤 즉시 return하지 않고, current heredoc remainder와 later pending heredoc을 모두 delimiter까지 소비한 후 failure를 반환합니다.

#### Source가 확정한 핵심 판단
- **문제**: A heredoc preparation failure could return while body lines and later delimiters remained in stdin, causing data intended for the failed command to be parsed as future shell commands.
- **결정**: Mark preparation as failed, consume the remainder of the current and later pending heredocs without constructing bodies, and compare encoded delimiters directly when normal dequoting allocation is unavailable.
- **중요한 이유**: For a streaming command interpreter, preserving the next command boundary is as important as freeing memory. Returning an error without restoring input position would convert a local allocation failure into unintended command execution.
- **확정된 변경 범위**: The collector gained discard-through-delimiter behavior, marker-aware allocation-free delimiter matching, continued traversal of pending heredocs, and additional capacity-overflow protection.
- **프로젝트 이해에서의 위치**: This exceptional A-level commit reveals the depth of the failure model: recovery must account not only for objects and descriptors but also for semantic position in the input stream.

#### Fix 재구성 기록
- 기존 가정: partial heap objects를 free하고 NULL/failure를 return하면 transaction이 rollback됐다고 보았습니다.
- 실제 failure 또는 위험을 드러내는 입력·상태: current body line과 later heredoc delimiters가 stdin에 남아 top-level shell commands로 실행됩니다.
- root cause가 위치한 representation / lifecycle / ordering boundary: streaming input cursor는 heap object가 아니지만 command transaction의 semantic state입니다.
- 수정된 invariant 또는 decision: first failure 후 construction을 멈추되 traversal/input consumption은 all pending delimiters까지 계속합니다.
- 변경 전 코드 증거: dequote/init/append allocation failure에서 immediate return.
- 변경 후 코드 증거: failed flag, `discard_heredoc`, allocation-free `delimiter_matches`, no body publish in recovery mode.
- 연결되는 regression test와 그 한계: `476b...` heredoc scope sweep가 allocation source로 이를 검증하고 I/O repeat failure는 Thread 2의 `7e2f...`가 다룹니다.

#### `c30b39c0bcf8`에서 확인할 실제 코드
- Outer traversal은 failure 후에도 later pending redirections를 방문합니다.
- Current failure path도 own delimiter까지 discard합니다.
- Encoded delimiter matching은 marker를 건너뛰어 no-allocation recovery가 가능합니다.
- Buffer doubling overflow check `SIZE_MAX / 2`가 추가됩니다.
- Recovery path는 body entry를 add하지 않습니다.

#### 학습자가 남길 코드 증거
- 기존 가정: memory state only transaction.
- 실제 위험: `echo unintended` body line이 failed command 뒤 shell command로 이동합니다.
- root cause: failure return과 stream position 불일치.
- failed mode의 traversal: mark failed → discard current → continue nested traversal → discard every remaining heredoc.
- allocation-free delimiter matching: encoded target marker pairs를 direct compare해 dequote allocation이 실패해도 delimiter를 찾습니다.
- 복구 완료 시 반환 status와 next input position: status 1; cursor는 all pending delimiters 뒤 next command boundary입니다.
- 확인한 변경 파일: `src/heredoc.c`.
- 핵심 caller → callee: `exec_prepare_heredocs` → `read_heredoc`/`discard_heredoc` → `delimiter_matches`.
- parent SHA와 비교한 최소 before/after snippet: immediate memory-error return이 discard traversal + delayed failure return으로 변경됩니다.
- 해당 SHA에서 실행한 test 또는 수동 재현 결과: 실행하지 않았습니다. Exact source에서 stream-position rollback을 검사했습니다.

#### 보장 범위
- 이 commit이 보장하는 것: heredoc preparation이 실패해도 body data와 pending delimiters가 future shell commands로 이동하지 않습니다.
- 아직 보장하지 않는 것: recovery read 자체가 계속 실패하면 boundary를 보장할 수 없으며 그 경우의 forced-stop policy는 `7e2fdea3affd`가 검증합니다.

#### Thread 내 다음 연결
Allocation Thread에서는 `476b082d55c7` sweep으로 재검증됩니다.

### 5.5 `476b082d55c7` — `test(memory): 범위별 할당 실패 순회 검증`

#### 확정 정보
- SHA: `476b082d55c7`
- Subject: `test(memory): 범위별 할당 실패 순회 검증`
- Importance: **A**
- Tags: `TEST`, `FAILURE`, `RISK`
- Source-defined role: Sweeps allocation positions by phase and verifies cleanup, state atomicity, continuation, and persistent-failure termination.
- 학습 깊이: 주요 subsystem boundary, integration point 또는 failure path. 핵심 코드와 설계 판단을 확인합니다.

#### Source에서 확정된 변화
Allocation wrapper에 phase와 command number scope를 추가하고 tokenization, parsing, heredoc input/body, expansion, execution의 successive call positions를 sweep하여 clean failure 또는 untouched normal completion만 허용합니다.

#### Test commit 학습 기록
- 대상 production invariant: any injected allocation point must yield either fully normal command result or coherent status-1 rollback without partial state/side effect.
- 재현하는 failure 또는 boundary: token, parser, expand, execute, heredoc body/input and persistent command-input allocation failures입니다.
- 사용한 test technique: phase + command ordinal + Nth allocation + one-shot/repeat selector를 runtime wrapper에 설정하고 N을 increasing sweep하는 deterministic fault injection입니다.
- 실제 통과하는 production code path: shell command boundary, each phase scope marker, environment mutation, external dispatch, heredoc recovery, input loop stop.
- 이 테스트가 증명하는 것: configured positions에서 only failure output or normal output appears; parent state and external side effects are atomic; heredoc boundary recovers; persistent failure stops residual input execution.
- 이 테스트가 증명하지 않는 것: sweep maxima 밖, unmarked startup allocation, allocator internals, all platform interactions를 증명하지 않습니다.
- broad integration / deterministic regression / stress·probe 중 분류: systematic bounded failure-position sweep입니다.
- 후속 변경에서 막는 회귀: publish-before-success, partial list leak, env mutation on failed setup, external launch before complete preparation, residual heredoc/input execution입니다.

#### `476b082d55c7`에서 확인할 실제 코드
- `src/runtime.c`의 allocation state는 command number, scope string, call index, target index, repeat mode를 가집니다.
- `shell_runtime_begin_command`가 command ordinal을 갱신하고 `shell_runtime_set_alloc_scope`가 token/parser/expand/execute/heredoc/input scopes를 설정합니다.
- One-shot failure 후 state가 disarm되고 repeat mode는 target 이후 계속 fail합니다.
- `tests/allocation.sh`의 sweep은 call index를 증가시키며 exact two outcome patterns만 허용하고 최소 one failure/one success를 요구합니다.
- Failed parent builtin preparation이 environment를 mutate하지 않는 case가 있습니다.
- Failed external preparation이 external program을 실행하지 않는 case가 있습니다.
- Heredoc allocation failure case는 delimiters를 소비한 뒤 next marker를 실행합니다.
- Persistent input/token failure cases는 process status 1 and no residual marker입니다.

#### 학습자가 남길 코드 증거
- phase/command/call-position model: current command ordinal + current scope + scope-local allocation count가 failure key입니다.
- one-shot와 repeat mode: one-shot은 selected allocation 하나만 NULL; repeat은 selected point부터 matching later allocations도 NULL입니다.
- 허용되는 두 outcome: complete expected normal stdout/status 또는 exact diagnosed status-1 failure/rollback; mixed partial output/state는 reject합니다.
- state atomicity case: parent `export`/environment modification preparation failure에서 old environment observation remains.
- external side-effect suppression case: command/envp preparation failure면 marker external program이 실행되지 않습니다.
- heredoc boundary recovery case: current/pending body allocations failure 뒤 body lines suppressed, next top-level command only executes.
- persistent failure termination case: input/token allocation이 계속 실패하면 loop를 돌며 residual commands를 해석하지 않고 process exits 1.
- test가 포괄하지 않는 startup/path: initial environment import와 configured maxima 밖 positions입니다.
- 확인한 변경 파일: `src/runtime.c`, `src/runtime.h`, phase call sites across `src/input.c`, `src/token.c`, `src/parser.c`, `src/expand.c`, `src/exec.c`, `src/heredoc.c`, `tests/allocation.sh`.
- 핵심 caller → callee: test sweep → fault binary → command begin/scope markers → allocation wrappers → subsystem rollback → output/status assertion.
- parent SHA와 비교한 최소 before/after snippet:

```text
SMALL_SHELL_FAIL_ALLOC_SCOPE=<phase>
SMALL_SHELL_FAIL_ALLOC=<N>
[optional command number / repeat]
```

- 해당 SHA에서 실행한 test 또는 수동 재현 결과: 실행하지 않았습니다. Injection state machine, sweep loops, accepted patterns를 source로 확인했습니다.

#### 보장 범위
- 이 commit이 보장하는 것: recoverable-allocation architecture를 normal-path 추정이 아니라 systematic failure-position regression으로 검증합니다.
- 아직 보장하지 않는 것: 모든 allocator implementation이나 모든 startup allocation을 수학적으로 증명하지 않으며 설정된 production scopes에 한정됩니다.

#### Thread 내 다음 연결
Allocation Thread의 최종 검증입니다. 각 subsystem ledger의 publish point와 sweep case를 연결해 완료합니다.

## 6. Invariant ledger

Source가 명시한 invariant와 engineering difficulty를 유지하고 exact code 근거를 채웠습니다.

| Invariant | Source에서 확정된 의미 | 처음 도입/표현 | 강화·복구·검증 | 학습자가 확인한 코드 근거 |
| --- | --- | --- | --- | --- |
| Allocation failure publishes either a complete result or no result. | 이전 valid state는 유지되거나, partial construction 전체가 해제되어야 합니다. | `0b2e76386678`의 common allocation boundary | `0bb6f9de0947`에서 project-wide transactional policy로 확정 | Env copy-before-free, token/node append-after-complete, parser single cleanup path, expansion replacement-after-success를 확인했습니다. |
| Low-level helpers do not terminate a running shell arbitrarily. | startup처럼 usable shell state가 없는 경계를 제외하면 allocation failure는 command-level status로 전파됩니다. | `0bb6f9de0947` | `476b082d55c7` failure sweep | Nullable utilities → subsystem returns → `shell_process_line` allocation branch status 1; startup import only returns from `main`. |
| Preparation allocation failure is side-effect free. | PID/pipe bookkeeping allocation이 실패하면 child나 OS pipe가 아직 존재하지 않아야 합니다. | `6d95776ede59` | `476b082d55c7` execution-phase injection | Both tables allocated/initialized before first `shell_pipe`; execute scope sweep checks no external/builtin side effect. |
| Input position is part of transactional recovery. | heredoc body를 일부 소비한 뒤의 allocation failure는 pending delimiter까지 정리해야 합니다. | `c30b39c0bcf8` | `476b082d55c7` heredoc sweep | Failed state + discard-only traversal + allocation-free delimiter matching; next marker only after all delimiters. |

### Ledger 작성 시 확인한 것

- Wrapper introduction and failure policy completion을 구분했습니다.
- `0bb6...`는 existing representations의 publish protocol을 바꾸고, `6d957...`/`c30b...`는 OS/input side effects까지 same invariant를 확장합니다.
- Sweep evidence는 actual phase markers와 production call graph를 통과합니다.
- Success/failure 모두 local partial objects의 owner가 명확하며, continuation은 resource/input boundary가 trustworthy일 때만 허용됩니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 문제 | Feature / 기존 상태 | Fix 또는 결정 | Regression / 확인 방법 | 학습자 코드 근거 |
| --- | --- | --- | --- | --- |
| allocation helper가 deep call stack에서 `exit`하여 partial ownership cleanup과 shell continuation을 우회함 | `0b2e76386678`의 central wrapper seam | `0bb6f9de0947` — nullable utilities, transactional construction, caller-visible failure | `476b082d55c7` — phase/command/call-position sweep | Fatal helper removal, env/token/parser/expand publish points, status 1 branch와 scope sweep를 연결했습니다. |
| executor bookkeeping allocation이 OS resource acquisition 뒤 실패하면 cleanup state가 복잡해짐 | pipeline setup의 table allocation | `6d95776ede59` — both tables first, then pipe creation | `476b082d55c7` execution scope에서 side-effect-free failure를 확인 | Two `shell_calloc` success 전 `shell_pipe` 부재와 no external side effect assertion을 연결했습니다. |
| heredoc construction failure 뒤 unread input이 future commands로 이동 | nullable dequote/buffer/expansion operations | `c30b39c0bcf8` — discard through every pending delimiter | `476b082d55c7`의 heredoc failure and continuation cases | Failed flag/discard traversal, heredoc allocation scope, body suppression/next marker assertions를 연결했습니다. |

## 8. Ownership / state / responsibility 변화

| 대상 | Owner / 책임 주체 | 책임 종료 시점 | 해당 SHA에서 확인할 내용 | 학습자 기록 |
| --- | --- | --- | --- | --- |
| new allocation result | local constructor | all dependent fields가 성공할 때까지 local | public list/field에 연결되는 exact line 기록 | Env/token/parser/expander 모두 dependent allocations success 뒤에만 link/replace합니다. |
| existing environment value/list | environment store | replacement allocation 성공 전까지 유지 | copy-before-free ordering 기록 | `env_set`는 new copy failure 시 old pointer/value를 그대로 둡니다. |
| partial token/parser prefix | current construction scope | failure 시 단일 cleanup path | current object와 completed prefix 모두 포함되는지 확인 | Lexer prefix는 `free_tokens`, parser current + completed sequence는 hierarchy cleanup에 포함됩니다. |
| PID/pipe tables | executor preparation | OS resource acquisition 전 모두 확보 | 실패 시 local memory만 free되는지 확인 | Both tables success and `-1` init 전 pipe/fork 없음; allocation failure side-effect-free입니다. |
| heredoc input position | collector/recovery | pending delimiter consumption 완료 | memory cleanup과 stream recovery의 별도 책임 기록 | Heap rollback 후 discard traversal이 separate semantic cleanup을 담당합니다. |
| startup environment import | program startup boundary | 실패 시 diagnosed process return | running shell command failure와 구분 | No usable `t_shell` env state이므로 `main`이 failure를 반환합니다. |

## 9. Thread 최종 상태

Subsystem별 transaction boundary는 다음과 같습니다.

| Subsystem | Old state | Local partial | Publish point | Failure result |
| --- | --- | --- | --- | --- |
| environment replace | existing value | new copy | copy complete then swap | old value preserved |
| lexer | token prefix | word/node | both complete then append | local + prefix cleanup, status 1 |
| parser | completed prefix | current cmd/pipeline/argv/redir | complete node/list append | one hierarchy cleanup, status 1 |
| expansion | encoded field | expanded result | full result then replace | old field preserved, no dispatch |
| executor | no OS side effect | PID/pipe tables | after both allocations, begin pipes | memory only cleanup, status 1 |
| heredoc | stdin at body cursor | partial body | entry after complete body | body cleanup + discard to boundary |

Syntax failure status 258와 allocation failure status 1은 line processor에서 별도 branch입니다. Startup import failure는 process return, running-shell one-shot command failure는 safe boundary에서 continuation, persistent/unrecoverable input/resource failure는 stop입니다.

### 최종 상태 기록

- 최종적으로 유지되는 data/resource ownership: new allocations remain constructor-local until complete; old persistent state remains owner until successful replacement; executor/heredoc side effects have separate rollback rules.
- 최종적으로 보장되는 execution 또는 recovery rule: allocation failure는 complete result 또는 no result만 publish하고, status 1 continuation은 memory/resource/input boundary가 신뢰 가능한 경우에만 허용됩니다.
- Thread가 해결한 가장 어려운 failure: memory allocation failure가 이미 consumed stdin이라는 non-memory side effect를 가진 heredoc에서 unintended command execution으로 번지지 않도록 한 문제입니다.
- Thread 밖에 남아 있는 보장 범위: configured scopes/maxima 밖 allocation, allocator internals, all startup paths와 arbitrary combined faults는 증명하지 않습니다.

## 10. 최종 architecture 또는 execution flow 정리

```text
[allocation request through shell_malloc/calloc/realloc]
  ↓ nullable result
[constructor-local partial state only]
  ↓ all dependent allocations/validation succeed?
    ├─ yes: publish complete object / then replace or free old state
    └─ no: free partial result / preserve old state / return explicit failure
  ↓ command boundary
[status 1 and continue only when heap + OS resources + input cursor are trustworthy]
  ↓ persistent or unrecoverable boundary failure
[stop shell rather than execute residual state/input]
```

### 코드 기반 최종 설명

- 핵심 entry function: runtime allocation wrappers, subsystem constructors, `shell_process_line`, `exec_prepare_heredocs`.
- 주요 caller → callee chain: input loop → command scope → tokenize → parse → heredoc prepare → expand → execute; each phase sets allocation scope and propagates NULL to line boundary.
- state mutation 순서: allocate local → validate all dependencies → publish/link/swap → release previous state; executor memory completes before pipe/fork; heredoc failure restores stream cursor before return.
- ownership transfer 순서: local allocation remains local until publish; old environment/field stays owned until replacement; successful body transfers to entry; failed body remains local and is freed.
- failure convergence path: subsystem rollback → explicit allocation error → status 1; unsafe persistent input/resource state → `running=0`/process stop.
- regression evidence: `tests/allocation.sh`의 scoped sweeps와 coherent-outcome assertions를 source로 확인했습니다. 실제 sweep은 실행하지 않았습니다.

## 11. 학습 완료 자가 점검

- [x] 모든 commit을 exact SHA에서 확인했고 final HEAD를 소급하지 않았습니다.
- [x] Commit map의 SHA, subject, importance, tags, order를 변경하지 않았습니다.
- [x] S commit은 problem, prior state, failure possibility, decision, core code, ownership/lifecycle, follow-up을 설명했습니다.
- [x] A commit은 subsystem boundary 또는 failure path와 실제 핵심 code를 설명했습니다.
- [x] Fix commit은 기존 가정 → failure → root cause → 수정 invariant → code → regression 순으로 연결했습니다.
- [x] Test commit은 invariant, failure, technique, production path, prove/not prove를 구분했습니다.
- [x] Invariant ledger의 각 행에 실제 file/function/branch 근거가 있습니다.
- [x] 정상·실패 경로 모두에서 resource와 partial object의 terminal owner를 설명했습니다.
- [x] 이 Thread의 wrapper → transactional policy → side-effect ordering → stream recovery → sweep 흐름을 commit history 순서로 재구성했습니다.
