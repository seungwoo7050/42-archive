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

- [ ] fatal helper의 이전 call path와 nullable helper 이후 propagation path를 비교했습니다.
- [ ] environment, lexer, parser, expansion 각각에서 'allocate → validate → publish → replace/free' 순서를 기록했습니다.
- [ ] 실행 resource table이 side-effect-free preparation으로 바뀐 지점을 확인했습니다.
- [ ] heredoc failure에서 memory transaction과 input-position recovery를 함께 설명했습니다.
- [ ] allocation sweep의 phase, command number, one-shot/repeat mode, accepted outcomes를 구분했습니다.

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
pipeline setup, heredoc buffering, input growth, shared string utilities의 allocation을 runtime layer로 모으고, `shell_calloc`에 multiplication-overflow check를 추가합니다. Caller의 기존 fatal/recoverable policy는 아직 유지됩니다.

#### Refactor 판단 기록
- 기존 abstraction 또는 cost/failure 관찰 한계:
- 새 boundary가 제공하는 contract:
- production semantics가 유지된다는 코드 근거:
- ownership 또는 call-site responsibility 변화:
- 후속 fix/test가 이 seam을 사용하는 방식:

#### `0b2e76386678`에서 확인할 실제 코드
- runtime allocation wrapper API와 raw `malloc`/`calloc`/`realloc` delegation을 확인합니다.
- `shell_calloc`이 element count × size overflow를 어떤 식으로 검사하고 `ENOMEM`을 설정하는지 기록합니다.
- pipeline, heredoc, input, string utility call sites가 wrapper로 변경된 범위를 검색합니다.
- wrapper failure return contract와 caller별 기존 handling 차이를 표로 작성합니다.
- production semantics가 유지되고 test injection/central policy를 위한 seam만 생긴다는 diff 근거를 남깁니다.

#### 학습자가 남길 코드 증거
- wrapper API map:
- overflow check expression:
- routed subsystem 목록:
- caller별 failure policy:
- 아직 남은 fatal helper와 partial construction 위험:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

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
- 학습 깊이: Architecture / invariant 핵심. 변경 전 가정, failure 가능성, 결정, ownership/lifecycle, 후속 fix/test까지 깊게 추적합니다.

#### Source에서 확정된 변화
fatal allocation helpers를 nullable operation으로 바꾸고, environment, lexer, parser, expansion, public API, command loop까지 complete result만 publish하고 partial construction을 해제하도록 failure propagation을 재설계합니다.

#### Source가 확정한 핵심 판단
- **문제**: Fatal allocation helpers could terminate the shell from deep inside tokenization, parsing, environment mutation, or expansion, bypassing ownership cleanup and potentially exposing partial state.
- **결정**: Make allocation helpers nullable and require each construction layer to publish only complete results, preserve existing state until replacements succeed, release partial prefixes, and propagate allocation failure through command or startup boundaries.
- **중요한 이유**: This is a project-wide change from exception-like process termination to explicit transactional failure. It affects almost every owned representation and determines whether a running shell can diagnose one failed command and continue safely.
- **확정된 변경 범위**: Utilities gained size checks and nullable returns; environment creation, replacement, import, and serialization became transactional; lexer and parser publishing became failure-aware; expansion and public APIs propagated allocation errors; and the loop distinguished syntax status from command-level memory failure.
- **프로젝트 이해에서의 위치**: It is the central failure-architecture commit. It unifies the ownership lessons from parsing, environment state, execution, and heredoc into one invariant: no incomplete object escapes and no arbitrary helper owns process termination.

#### Fix 재구성 기록
- 기존 가정:
- 실제 failure 또는 위험을 드러내는 입력·상태:
- root cause가 위치한 representation / lifecycle / ordering boundary:
- 수정된 invariant 또는 decision:
- 변경 전 코드 증거:
- 변경 후 코드 증거:
- 연결되는 regression test와 그 한계:

#### `0bb6f9de0947`에서 확인할 실제 코드
- parent SHA의 `sh_xcalloc`, `sh_strdup` 또는 fatal helper가 diagnose 후 `exit`하는 call path를 기록합니다.
- utility layer의 size arithmetic check, nullable return, join/duplicate failure contract를 확인합니다.
- environment node가 structure/key/value를 모두 확보한 뒤 list에 link되는지 추적합니다.
- existing environment value replacement에서 new copy 성공 전 old value를 free하지 않는 순서를 확인합니다.
- environment import failure가 partial list 전체를 해제하고, `env_to_environ` failure가 partial vector/string을 정리하는지 확인합니다.
- token creation이 ownership을 받을 수 없을 때 text를 free하고 list에 publish하지 않는지 확인합니다.
- parser append가 new argv/redirection/pipeline data를 모두 준비한 뒤 field/list에 연결되는지 확인합니다.
- single `parse_failure` path가 current command, current pipeline, completed prefix를 모두 해제하는지 추적합니다.
- expansion/dequote/public parse API가 allocation error를 optional diagnostic과 별개로 반환하는지 확인합니다.
- command loop가 syntax error status 258과 allocation command error status 1을 구분하는 branch를 기록합니다.
- startup environment import failure만 usable shell state 부재 때문에 diagnosed return으로 process를 끝내는 경계를 확인합니다.

#### 학습자가 남길 코드 증거
- fatal model의 이전 call graph:
- subsystem별 local partial object와 publish point:
- environment replace-before-free transaction:
- parser single failure convergence:
- public API return/diagnostic ownership:
- loop의 status 258 vs 1:
- startup fatal boundary vs running-shell recoverable boundary:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

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
pipeline pipe-end table과 PID table을 모두 OS pipe 생성 전에 overflow-aware `shell_calloc`으로 확보하여, allocation failure를 child/FD 없는 pure preparation error로 만듭니다.

#### Fix 재구성 기록
- 기존 가정:
- 실제 failure 또는 위험을 드러내는 입력·상태:
- root cause가 위치한 representation / lifecycle / ordering boundary:
- 수정된 invariant 또는 decision:
- 변경 전 코드 증거:
- 변경 후 코드 증거:
- 연결되는 regression test와 그 한계:

#### `6d95776ede59`에서 확인할 실제 코드
- pipeline execution entry에서 두 table의 allocation order를 확인합니다.
- 첫 `pipe` wrapper 호출이 두 allocation 성공 뒤에만 발생하는지 기록합니다.
- 각 allocation failure branch가 status 1과 local memory cleanup만 수행하는지 확인합니다.
- pipe table을 `shell_calloc`으로 확보한 뒤 descriptor slots를 explicit `-1`로 초기화하는 이유를 code와 연결합니다.
- PID table과 pipe table size calculation이 command count/pipe count를 어떻게 사용하며 overflow wrapper를 통과하는지 확인합니다.

#### 학습자가 남길 코드 증거
- preparation acquisition order:
- allocation failure 시 live OS resources:
- status/cleanup path:
- `-1` initialization 필요성:
- global transactional policy의 executor 적용점:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

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
delimiter dequote, body buffer init, body expansion 등이 실패한 뒤 즉시 return하지 않고, current heredoc remainder와 later pending heredoc을 모두 delimiter까지 소비한 후 failure를 반환합니다.

#### Source가 확정한 핵심 판단
- **문제**: A heredoc preparation failure could return while body lines and later delimiters remained in stdin, causing data intended for the failed command to be parsed as future shell commands.
- **결정**: Mark preparation as failed, consume the remainder of the current and later pending heredocs without constructing bodies, and compare encoded delimiters directly when normal dequoting allocation is unavailable.
- **중요한 이유**: For a streaming command interpreter, preserving the next command boundary is as important as freeing memory. Returning an error without restoring input position would convert a local allocation failure into unintended command execution.
- **확정된 변경 범위**: The collector gained discard-through-delimiter behavior, marker-aware allocation-free delimiter matching, continued traversal of pending heredocs, and additional capacity-overflow protection.
- **프로젝트 이해에서의 위치**: This exceptional A-level commit reveals the depth of the failure model: recovery must account not only for objects and descriptors but also for semantic position in the input stream.

#### Fix 재구성 기록
- 기존 가정:
- 실제 failure 또는 위험을 드러내는 입력·상태:
- root cause가 위치한 representation / lifecycle / ordering boundary:
- 수정된 invariant 또는 decision:
- 변경 전 코드 증거:
- 변경 후 코드 증거:
- 연결되는 regression test와 그 한계:

#### `c30b39c0bcf8`에서 확인할 실제 코드
- parent SHA에서 preparation failure가 즉시 return하여 unread body를 남기던 branch를 기록합니다.
- collector-wide failed flag 또는 대응 state가 set된 뒤 body construction 대신 discard mode로 전환되는 지점을 확인합니다.
- current heredoc의 남은 line과 이후 redirection의 heredoc을 모두 순회하는 control flow를 추적합니다.
- normal dequote allocation 없이 encoded delimiter에서 literal marker를 skip하며 exact target을 비교하는 helper를 확인합니다.
- delimiter line을 만난 뒤 다음 heredoc 또는 command boundary로 이동하는 state를 기록합니다.
- body buffer capacity doubling이 `SIZE_MAX / 2`를 넘지 않도록 하는 check를 확인합니다.
- recovery 중 생성된 local allocation이나 body entry가 publish되지 않는지 확인합니다.

#### 학습자가 남길 코드 증거
- 기존 가정:
- 실제 위험: unread body가 command로 재해석되는 입력 예:
- root cause: failure return과 stream position 불일치:
- failed mode의 traversal:
- allocation-free delimiter matching:
- 복구 완료 시 반환 status와 next input position:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: heredoc preparation이 실패해도 body data와 pending delimiters가 future shell commands로 이동하지 않습니다.
- 아직 보장하지 않는 것: recovery read 자체가 계속 실패하면 boundary를 보장할 수 없으며 그 경우의 forced-stop policy는 `7e2fdea3affd`가 검증합니다.

#### Thread 내 다음 연결
Heredoc Thread에서는 `7e2fdea3affd`로 이어지고, allocation Thread에서는 `476b082d55c7` sweep으로 재검증됩니다.

### 5.5 `476b082d55c7` — `test(memory): 범위별 할당 실패 순회 검증`

#### 확정 정보
- SHA: `476b082d55c7`
- Subject: `test(memory): 범위별 할당 실패 순회 검증`
- Importance: **A**
- Tags: `TEST`, `FAILURE`, `RISK`
- Source-defined role: Sweeps allocation positions by phase and verifies cleanup, state atomicity, continuation, and persistent-failure termination.
- 학습 깊이: 주요 subsystem boundary, integration point 또는 failure path. 핵심 코드와 설계 판단을 확인합니다.

#### Source에서 확정된 변화
allocation wrapper에 phase와 command number scope를 추가하고 tokenization, parsing, heredoc input/body, expansion, execution의 successive call positions를 sweep하여 clean failure 또는 untouched normal completion만 허용합니다.

#### Test commit 학습 기록
- 대상 production invariant:
- 재현하는 failure 또는 boundary:
- 사용한 test technique:
- 실제 통과하는 production code path:
- 이 테스트가 증명하는 것:
- 이 테스트가 증명하지 않는 것:
- broad integration / deterministic regression / stress·probe 중 분류:
- 후속 변경에서 막는 회귀:

#### `476b082d55c7`에서 확인할 실제 코드
- runtime allocation injection state에서 phase, command number, call index, one-shot/repeat mode fields를 확인합니다.
- 각 production phase가 allocation 전에 scope를 설정하는 call sites를 기록합니다.
- one-shot failure가 한 번 발동한 뒤 비활성화되는 logic과 repeat mode가 계속 실패하는 logic을 비교합니다.
- sweep loop가 call position을 증가시키며 두 coherent outcome만 허용하는 assertion을 확인합니다.
- failed parent-builtin preparation이 environment를 mutate하지 않는 case를 추적합니다.
- failed external-command preparation이 external program을 실행하지 않는 case를 확인합니다.
- heredoc allocation failure가 delimiter boundary를 복구한 뒤 next command를 실행하는 case를 확인합니다.
- persistent allocation failure가 loop 또는 residual input 실행 대신 shell termination으로 끝나는 case를 확인합니다.
- test-only scope markers가 production allocation delegation을 바꾸지 않는지 확인합니다.

#### 학습자가 남길 코드 증거
- phase/command/call-position model:
- one-shot와 repeat mode:
- 허용되는 두 outcome:
- state atomicity case:
- external side-effect suppression case:
- heredoc boundary recovery case:
- persistent failure termination case:
- test가 포괄하지 않는 startup/path:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: recoverable-allocation architecture를 normal-path 추정이 아니라 systematic failure-position regression으로 검증합니다.
- 아직 보장하지 않는 것: 모든 allocator implementation이나 모든 startup allocation을 수학적으로 증명하지 않으며 설정된 production scopes에 한정됩니다.

#### Thread 내 다음 연결
Allocation Thread의 최종 검증입니다. 각 subsystem ledger의 publish point와 sweep case를 연결해 완료합니다.

## 6. Invariant ledger

Source가 명시한 invariant와 engineering difficulty만 사용합니다. 실제 코드 근거와 변화 시점은 학습자가 채웁니다.

| Invariant | Source에서 확정된 의미 | 처음 도입/표현 | 강화·복구·검증 | 학습자가 확인한 코드 근거 |
| --- | --- | --- | --- | --- |
| Allocation failure publishes either a complete result or no result. | 이전 valid state는 유지되거나, partial construction 전체가 해제되어야 합니다. | `0b2e76386678`의 common allocation boundary | `0bb6f9de0947`에서 project-wide transactional policy로 확정 | subsystem별 publish point와 rollback/cleanup을 기록합니다.<br>기록: |
| Low-level helpers do not terminate a running shell arbitrarily. | startup처럼 usable shell state가 없는 경계를 제외하면 allocation failure는 command-level status로 전파됩니다. | `0bb6f9de0947` | `476b082d55c7` failure sweep | utility return, caller propagation, loop status branch를 연결합니다.<br>기록: |
| Preparation allocation failure is side-effect free. | PID/pipe bookkeeping allocation이 실패하면 child나 OS pipe가 아직 존재하지 않아야 합니다. | `6d95776ede59` | `476b082d55c7` execution-phase injection | allocation과 first OS resource acquisition의 순서를 기록합니다.<br>기록: |
| Input position is part of transactional recovery. | heredoc body를 일부 소비한 뒤의 allocation failure는 pending delimiter까지 정리해야 합니다. | `c30b39c0bcf8` | `476b082d55c7` heredoc sweep | failure flag, discard-only traversal, next command assertion을 기록합니다.<br>기록: |

### Ledger 작성 시 확인할 것

- field 또는 resource가 처음 생기는 commit과 invariant가 실제로 완성되는 commit을 구분합니다.
- fix가 이전 feature를 삭제한 것인지, representation에 빠진 정보를 보강한 것인지 구분합니다.
- test evidence는 production invariant와 실제 production path에 연결합니다.
- 정상 경로와 failure 경로가 같은 terminal ownership state로 수렴하는지 기록합니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 문제 | Feature / 기존 상태 | Fix 또는 결정 | Regression / 확인 방법 | 학습자 코드 근거 |
| --- | --- | --- | --- | --- |
| allocation helper가 deep call stack에서 `exit`하여 partial ownership cleanup과 shell continuation을 우회함 | `0b2e76386678`의 central wrapper seam | `0bb6f9de0947` — nullable utilities, transactional construction, caller-visible failure | `476b082d55c7` — phase/command/call-position sweep | |
| executor bookkeeping allocation이 OS resource acquisition 뒤 실패하면 cleanup state가 복잡해짐 | pipeline setup의 table allocation | `6d95776ede59` — both tables first, then pipe creation | `476b082d55c7` execution scope에서 side-effect-free failure를 확인 | |
| heredoc construction failure 뒤 unread input이 future commands로 이동 | nullable dequote/buffer/expansion operations | `c30b39c0bcf8` — discard through every pending delimiter | `476b082d55c7`의 heredoc failure and continuation cases | |

## 8. Ownership / state / responsibility 변화

| 대상 | Owner / 책임 주체 | 책임 종료 시점 | 해당 SHA에서 확인할 내용 | 학습자 기록 |
| --- | --- | --- | --- | --- |
| new allocation result | local constructor | all dependent fields가 성공할 때까지 local | public list/field에 연결되는 exact line 기록 | |
| existing environment value/list | environment store | replacement allocation 성공 전까지 유지 | copy-before-free ordering 기록 | |
| partial token/parser prefix | current construction scope | failure 시 단일 cleanup path | current object와 completed prefix 모두 포함되는지 확인 | |
| PID/pipe tables | executor preparation | OS resource acquisition 전 모두 확보 | 실패 시 local memory만 free되는지 확인 | |
| heredoc input position | collector/recovery | pending delimiter consumption 완료 | memory cleanup과 stream recovery의 별도 책임 기록 | |
| startup environment import | program startup boundary | 실패 시 diagnosed process return | running shell command failure와 구분 | |

## 9. Thread 최종 상태

아래 항목은 final HEAD를 보고 채우지 않습니다. 이 Thread의 마지막 SHA까지 누적된 code와 각 commit diff만 사용합니다.

- 각 subsystem의 transaction boundary를 `old state / local partial / publish point / cleanup` 네 칸으로 작성합니다.
- status 258 syntax failure와 status 1 allocation failure가 line loop에서 갈리는 지점을 기록합니다.
- startup fatal boundary와 running-shell recoverable boundary를 구분합니다.
- one-shot failure와 persistent failure가 continuation policy에 미치는 차이를 정리합니다.

### 최종 상태 기록

- 최종적으로 유지되는 data/resource ownership:
- 최종적으로 보장되는 execution 또는 recovery rule:
- Thread가 해결한 가장 어려운 failure:
- Thread 밖에 남아 있는 보장 범위:

## 10. 최종 architecture 또는 execution flow 정리

아래 source-confirmed 단계에 실제 function, field, branch, cleanup을 채웁니다.

```text
[allocation request through runtime wrapper]
  ↓ nullable result
[local construction only]
  ↓ all dependent allocations/validation succeed?
    ├─ yes: publish complete object / replace old state
    └─ no: free partial result / preserve old state / return explicit failure
  ↓ command boundary
[status 1 and continue only when resource + input boundary are trustworthy]
  ↓ persistent or unrecoverable boundary failure
[stop shell rather than execute residual state/input]
```

### 코드 기반 최종 설명

- 핵심 entry function:
- 주요 caller → callee chain:
- state mutation 순서:
- ownership transfer 순서:
- failure convergence path:
- regression evidence:

## 11. 학습 완료 자가 점검

- [ ] 모든 commit을 exact SHA에서 확인했고 final HEAD를 소급하지 않았습니다.
- [ ] Commit map의 SHA, subject, importance, tags, order를 변경하지 않았습니다.
- [ ] S commit은 problem, prior state, failure possibility, decision, core code, ownership/lifecycle, follow-up을 설명할 수 있습니다.
- [ ] A commit은 subsystem boundary 또는 failure path와 실제 핵심 code를 설명할 수 있습니다.
- [ ] B commit은 Thread 내 구현 역할과 state/ownership 변화를 설명할 수 있습니다.
- [ ] Fix commit은 기존 가정 → failure → root cause → 수정 invariant → code → regression 순으로 연결했습니다.
- [ ] Test commit은 invariant, failure, technique, production path, prove/not prove를 구분했습니다.
- [ ] Invariant ledger의 각 행에 실제 file/function/branch 근거가 있습니다.
- [ ] 정상·실패 경로 모두에서 resource와 partial object의 terminal owner를 설명할 수 있습니다.
- [ ] 이 Thread의 설계 → 구현 → 실패 → 수정 → 검증 흐름을 commit history 순서로 다시 설명할 수 있습니다.
