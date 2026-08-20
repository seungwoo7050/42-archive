# Pipeline process and descriptor ownership under partial failure

> 한국어 주제: **부분 실패에서의 pipeline process와 descriptor 소유권**
>
> Project: `small-shell`  
> Branch: `c/minishell`  
> Development Thread order: 3/5

## 1. Thread 목표

single-command fork/exec에서 N-stage pipe graph로 확장되는 정상 경로와, pipe/fork/wait/dup/open 실패 뒤 parent가 PID와 FD를 끝까지 회수하는 경로를 함께 복원합니다.

**Source-defined significance**

> The normal pipeline mechanism is only half of the engineering problem. Once a parent records a PID or acquires a descriptor, it owns that resource even if later construction fails. This thread moves from normal execution to deterministic failure injection, root-cause cleanup, unrecoverable parent-state handling, and direct lifecycle observation. Supporting wrappers and tests remain below S because the decisive ownership guarantees are established by the pipe graph and partial-construction cleanup commits.

**학습 관점**

정상 pipeline wiring만으로는 실행기가 완성되지 않습니다. Parent가 PID를 기록하거나 FD를 획득한 순간부터 후속 단계가 실패해도 그 자원을 종료·관찰·close할 책임이 생깁니다.

### SHA 고정 원칙

- 각 commit은 반드시 표시된 exact SHA 또는 그 parent와 비교합니다.
- 먼저 `git show --name-status <SHA>`로 변경 파일을 식별한 뒤, 필요한 path만 `git diff <SHA>^ <SHA> -- <path>`로 봅니다.
- 실제 구현은 `git show <SHA>:<path>` 또는 detached worktree에서 확인합니다.
- final HEAD의 type, function, test를 과거 commit 설명에 소급하지 않습니다.
- later commit의 field나 fix가 아직 존재하지 않는 SHA에서는 그 부재 자체를 기록합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 어떤 command가 parent에서 실행되고 어떤 command가 child에서 실행되며 그 이유는 무엇입니까?
- N개 command에 대해 왜 N-1개 pipe가 필요하고 child i는 어느 end를 stdin/stdout에 연결합니까?
- explicit redirection이 pipe wiring 뒤에 적용되는 이유는 무엇입니까?
- recorded PID가 생긴 뒤 later fork가 실패하면 단순 wait가 왜 hang할 수 있습니까?
- waitpid failure가 last-stage status보다 우선해야 하는 조건은 무엇입니까?
- parent stdin/stdout restore가 recoverable하게 실패한 경우와 unrecoverable하게 실패한 경우의 shell state는 어떻게 다릅니까?
- output assertion만으로 검출하기 어려운 FD leak과 zombie를 테스트가 어떻게 직접 관찰합니까?

## 3. 완료 기준

- [ ] single command와 multi-stage pipeline의 parent/child responsibility를 표로 작성했습니다.
- [ ] 각 process가 보유·dup·close하는 pipe end를 stage별로 그렸습니다.
- [ ] mid-fork failure에서 close → signal → reap 순서를 exact code로 확인했습니다.
- [ ] one-shot restore failure와 repeated unrecoverable restore failure의 status/running 변화를 구분했습니다.
- [ ] fault-injection regression과 lifecycle stress/probe가 무엇을 증명하는지 기록했습니다.
- [ ] pipe creation failure의 acquisition/cleanup matrix에 PID table까지 포함했습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source-defined role |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `7c9646e7cd79` | `feat(exec): 단일 명령을 자식에서 실행` | A | `PROCESS`, `CORE`, `INTEGRATION` | Establishes fork/exec and child status mapping for a single command. |
| 2 | `ae988017efd5` | `feat(exec): pipeline 자식 상태를 순서대로 회수` | B | `PROCESS`, `CORE` | Adds PID bookkeeping and ordered reaping for multiple commands. |
| 3 | `a71f98de0d92` | `feat(exec): 다단 pipeline의 pipe FD 연결` | S | `PROCESS`, `FD_IO`, `CORE` | Connects the multi-stage pipe graph and defines parent/child descriptor closure. |
| 4 | `915aa072298b` | `refactor(runtime): 프로세스 시스템 호출 경계 분리` | A | `PROCESS`, `FAILURE`, `TEST` | Introduces deterministic pipe, fork, and wait failure seams. |
| 5 | `be2967a4b946` | `fix(exec): 부분 생성 파이프라인의 자식과 FD 회수` | S | `PROCESS`, `FD_IO`, `FAILURE` | Terminates and reaps children after partial pipeline construction. |
| 6 | `d611196b368e` | `test(exec): pipe·fork·wait 실패 회귀 검증` | A | `TEST`, `PROCESS`, `FAILURE` | Reproduces pipe, mid-fork, and wait failure regressions. |
| 7 | `fd5c76c18c27` | `refactor(runtime): FD 시스템 호출 경계 분리` | A | `FD_IO`, `FAILURE`, `TEST` | Extends the runtime boundary to descriptor duplication and opening. |
| 8 | `2ca9f4299c7f` | `fix(redirection): 부모 표준 입출력 복원 실패 전파` | A | `FD_IO`, `FAILURE`, `RISK` | Makes parent standard-stream restoration failure observable and fatal when unrecoverable. |
| 9 | `13645f58d5e6` | `test(redirection): 저장·적용·복원 실패 회귀 검증` | A | `TEST`, `FD_IO`, `FAILURE` | Exercises save, application, restoration, open, and persistent failure paths. |
| 10 | `b42e57eb7755` | `test(lifecycle): FD와 자식 프로세스 누수 검증` | A | `TEST`, `PROCESS`, `FD_IO` | Directly checks for descriptor exhaustion and unreaped children. |
| 11 | `6dff1ba86ba6` | `fix(exec): pipe 생성 실패 시 PID 배열 해제` | B | `FD_IO`, `FAILURE`, `DEBUG` | Closes the remaining PID-table leak before any child is spawned. |

## 5. Commit별 학습 기록

### 5.1 `7c9646e7cd79` — `feat(exec): 단일 명령을 자식에서 실행`

#### 확정 정보
- SHA: `7c9646e7cd79`
- Subject: `feat(exec): 단일 명령을 자식에서 실행`
- Importance: **A**
- Tags: `PROCESS`, `CORE`, `INTEGRATION`
- Source-defined role: Establishes fork/exec and child status mapping for a single command.
- 학습 깊이: 주요 subsystem boundary, integration point 또는 failure path. 핵심 코드와 설계 판단을 확인합니다.

#### Source에서 확정된 변화
single parsed command를 parent path 또는 forked child path로 dispatch하고, child에서 redirection/builtin/exec를 수행한 뒤 exact PID를 wait하여 normal, signal, 126, 127 status로 변환합니다.

#### 설계·상태 변화 기록
- 이 commit 직전 상태:
- 해결하려던 문제:
- 기존 표현·실행 순서가 충분하지 않았던 이유:
- 선택한 결정:
- publish 또는 state mutation이 일어나는 지점:
- failure 뒤 cleanup 또는 상태:

#### `7c9646e7cd79`에서 확인할 실제 코드
- redirection-only command와 parent-stateful builtin을 parent path로 보내는 predicate를 확인합니다.
- 그 외 command에서 `fork` 후 parent/child branch가 갈리는 지점을 기록합니다.
- child가 redirection을 먼저 적용하고 known builtin 또는 external command를 선택하는 순서를 확인합니다.
- external command 전에 exported environment vector를 생성하고 `execvp`에 전달하는 ownership을 추적합니다.
- child builtin output flush 뒤 `_exit`를 사용하는 이유를 actual call sequence로 기록합니다.
- parent가 exact child PID로 `waitpid`하고 `EINTR`에 retry하는 loop를 확인합니다.
- `execvp` error를 127/126으로, signal termination을 `128 + signal`로 매핑하는 branch를 기록합니다.

#### 학습자가 남길 코드 증거
- parent/child dispatch 조건:
- child call path:
- environment vector owner:
- wait/status translation table:
- parent persistent state와 child copy state의 차이:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: ordinary execution은 child에 격리되고, shell state를 유지해야 하는 command만 parent에 남으며, child outcome이 shell-visible status로 변환됩니다.
- 아직 보장하지 않는 것: 한 command만 다루며 multi-stage pipe topology와 partial construction cleanup은 아직 없습니다.

#### Thread 내 다음 연결
`ae988017efd5`가 command마다 PID를 기록해 multi-command lifecycle skeleton을 만듭니다.

### 5.2 `ae988017efd5` — `feat(exec): pipeline 자식 상태를 순서대로 회수`

#### 확정 정보
- SHA: `ae988017efd5`
- Subject: `feat(exec): pipeline 자식 상태를 순서대로 회수`
- Importance: **B**
- Tags: `PROCESS`, `CORE`
- Source-defined role: Adds PID bookkeeping and ordered reaping for multiple commands.
- 학습 깊이: Thread 흐름에서 맡는 구현 역할과 필요한 state/ownership 변화를 확인합니다.

#### Source에서 확정된 변화
pipeline의 각 command를 fork하고 one PID slot per command에 기록한 뒤 exact PID 순서로 reap합니다. 완전 spawn이면 last command status, partial spawn이면 existing children을 reap한 뒤 status 1입니다.

#### 설계·상태 변화 기록
- 이 commit 직전 상태:
- 해결하려던 문제:
- 기존 표현·실행 순서가 충분하지 않았던 이유:
- 선택한 결정:
- publish 또는 state mutation이 일어나는 지점:
- failure 뒤 cleanup 또는 상태:

#### `ae988017efd5`에서 확인할 실제 코드
- PID table allocation size와 `command_count` 사용 지점을 확인합니다.
- command order의 fork loop와 successful PID recording 시점을 기록합니다.
- wait loop가 generic `wait`가 아니라 recorded PID를 사용하는지 확인합니다.
- 완전 spawn 여부를 판정하는 count와 last-stage status 선택 조건을 찾습니다.
- partial spawn에서 이미 생성된 child를 reap하고 status 1을 반환하는 path를 추적합니다.
- 이 SHA에서는 아직 pipe FDs가 연결되지 않는다는 점을 child setup code로 확인합니다.

#### 학습자가 남길 코드 증거
- PID table index ↔ command index mapping:
- recorded count mutation:
- complete/partial status branch:
- wait ownership 종료 지점:
- 아직 없는 descriptor topology:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: parent는 child identity를 결정적으로 소유·관찰하고 pipeline status를 last stage에 연결할 bookkeeping을 갖습니다.
- 아직 보장하지 않는 것: child 사이 data flow와 mid-fork block/hang 회복은 아직 해결하지 않습니다.

#### Thread 내 다음 연결
`a71f98de0d92`가 PID skeleton에 N-1 pipe graph와 descriptor closure를 연결합니다.

### 5.3 `a71f98de0d92` — `feat(exec): 다단 pipeline의 pipe FD 연결`

#### 확정 정보
- SHA: `a71f98de0d92`
- Subject: `feat(exec): 다단 pipeline의 pipe FD 연결`
- Importance: **S**
- Tags: `PROCESS`, `FD_IO`, `CORE`
- Source-defined role: Connects the multi-stage pipe graph and defines parent/child descriptor closure.
- 학습 깊이: Architecture / invariant 핵심. 변경 전 가정, failure 가능성, 결정, ownership/lifecycle, 후속 fix/test까지 깊게 추적합니다.

#### Source에서 확정된 변화
N command에 대해 N-1 pipe를 만들고, child i의 stdin/stdout을 neighboring pipe에 연결한 뒤 모든 original pipe end를 닫고 explicit redirection을 나중에 적용합니다.

#### Source가 확정한 핵심 판단
- **문제**: Multiple forked commands do not form a pipeline unless each child receives the correct neighboring descriptors and every process closes all unused pipe ends.
- **결정**: Allocate `N - 1` pipes for `N` commands, map the previous read end to stdin and the next write end to stdout in each child, close all original ends, then apply explicit command redirections afterward.
- **중요한 이유**: The ordering defines both data flow and redirection precedence. Parent and child closure rules prevent readers from waiting forever on hidden writers, while child execution of pipeline builtins prevents state mutations from leaking into the parent shell.
- **확정된 변경 범위**: The executor gained pipe-table creation and cleanup, per-stage descriptor duplication, one child per command, parent-side closure and reaping, last-stage status selection, and parent-only execution for a single stateful builtin.
- **프로젝트 이해에서의 위치**: This is the defining process topology. It is the basis for every later fork-failure, descriptor-leak, timeout, and child-lifecycle correction.

#### 설계·상태 변화 기록
- 이 commit 직전 상태:
- 해결하려던 문제:
- 기존 표현·실행 순서가 충분하지 않았던 이유:
- 선택한 결정:
- publish 또는 state mutation이 일어나는 지점:
- failure 뒤 cleanup 또는 상태:

#### `a71f98de0d92`에서 확인할 실제 코드
- pipe table의 memory layout과 command count에서 pipe count를 계산하는 식을 확인합니다.
- descriptor slots를 `-1`로 초기화하는 loop와 partial pipe creation cleanup이 이를 사용하는 방식을 기록합니다.
- parent가 모든 pipe를 fork 전에 생성하는 순서를 확인합니다.
- child stage i가 previous pipe read end를 stdin에, current pipe write end를 stdout에 `dup2`하는 index 식을 기록합니다.
- dup2 뒤 child가 자신의 필요 여부와 무관하게 original pipe table의 모든 end를 close하는 code를 확인합니다.
- pipe wiring 뒤 command redirection을 적용하여 explicit redirect가 pipe default를 override하는지 확인합니다.
- parent가 spawn loop 뒤 자신의 모든 pipe end를 close한 후 recorded PIDs를 wait하는 순서를 기록합니다.
- single parent-stateful builtin만 parent에서 실행되고 multi-command pipeline의 builtin은 child에서 실행되는 predicate를 확인합니다.
- short spawn sequence의 return status와 cleanup을 확인하되, later fix 전 hang 가능성이 남는 지점을 표시합니다.

#### 학습자가 남길 코드 증거
- N-stage descriptor graph:
- child i의 dup2 formula:
- parent/child close matrix:
- pipe wiring vs explicit redirection order:
- pipeline builtin isolation:
- partial failure에 남은 위험:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: multi-stage data flow, descriptor precedence, parent/child closure, last-stage status의 defining execution topology를 제공합니다.
- 아직 보장하지 않는 것: later fork failure 시 already spawned child를 terminate하지 않아 block/hang할 수 있는 failure path가 남습니다.

#### Thread 내 다음 연결
`915aa072298b`가 pipe/fork/wait failure를 재현할 seam을 만들고 `be2967a4b946`가 lifecycle invariant를 복구합니다.

### 5.4 `915aa072298b` — `refactor(runtime): 프로세스 시스템 호출 경계 분리`

#### 확정 정보
- SHA: `915aa072298b`
- Subject: `refactor(runtime): 프로세스 시스템 호출 경계 분리`
- Importance: **A**
- Tags: `PROCESS`, `FAILURE`, `TEST`
- Source-defined role: Introduces deterministic pipe, fork, and wait failure seams.
- 학습 깊이: 주요 subsystem boundary, integration point 또는 failure path. 핵심 코드와 설계 판단을 확인합니다.

#### Source에서 확정된 변화
`pipe`, `fork`, `waitpid`를 runtime wrapper 뒤로 옮기고 selected call count에서 representative `errno`로 실패시키는 deterministic test seam을 추가합니다. Production wrapper는 transparent합니다.

#### Refactor 판단 기록
- 기존 abstraction 또는 cost/failure 관찰 한계:
- 새 boundary가 제공하는 contract:
- production semantics가 유지된다는 코드 근거:
- ownership 또는 call-site responsibility 변화:
- 후속 fix/test가 이 seam을 사용하는 방식:

#### `915aa072298b`에서 확인할 실제 코드
- production wrapper declarations/definitions와 executor call-site replacement를 확인합니다.
- test build flag 또는 compile-time boundary가 production semantics와 injection state를 분리하는지 확인합니다.
- operation별 call counter와 selected failure index가 어디에 저장되는지 기록합니다.
- wrapper가 failure 시 설정하는 representative `errno`와 normal delegation path를 비교합니다.
- later pipe/fork call을 선택할 수 있어 partial acquisition/spawn state를 만드는 mechanism을 확인합니다.
- 이 commit에서 executor recovery policy 자체가 바뀌지 않았다는 diff 근거를 남깁니다.

#### 학습자가 남길 코드 증거
- wrapper API와 raw syscall mapping:
- production/test branch:
- call-index injection state:
- later-call failure가 만드는 partial state:
- 아직 unchanged인 cleanup policy:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: rare process-resource failure를 production behavior 변경 없이 반복 재현할 수 있습니다.
- 아직 보장하지 않는 것: seam은 관찰 가능성만 제공하며 partial child/FD cleanup을 아직 수정하지 않습니다.

#### Thread 내 다음 연결
`be2967a4b946`가 이 seam으로 드러난 mid-construction ownership 문제를 수정합니다.

### 5.5 `be2967a4b946` — `fix(exec): 부분 생성 파이프라인의 자식과 FD 회수`

#### 확정 정보
- SHA: `be2967a4b946`
- Subject: `fix(exec): 부분 생성 파이프라인의 자식과 FD 회수`
- Importance: **S**
- Tags: `PROCESS`, `FD_IO`, `FAILURE`
- Source-defined role: Terminates and reaps children after partial pipeline construction.
- 학습 깊이: Architecture / invariant 핵심. 변경 전 가정, failure 가능성, 결정, ownership/lifecycle, 후속 fix/test까지 깊게 추적합니다.

#### Source에서 확정된 변화
later fork failure 시 parent-held pipe ends를 모두 닫고, 이미 기록된 child에 `SIGKILL`을 보낸 뒤 every PID를 reap하여 pipeline execution이 complete cleanup state로 수렴하도록 합니다.

#### Source가 확정한 핵심 판단
- **문제**: If a later fork failed, already spawned stages could remain blocked or running. Closing descriptors and waiting was insufficient and could hang indefinitely or leave zombies.
- **결정**: On partial construction, close all parent-held pipe ends, send termination to every recorded child, tolerate children that already exited, and still reap every PID. Treat any wait failure as pipeline failure.
- **중요한 이유**: Recording a PID transfers lifecycle responsibility to the parent even when the pipeline never becomes complete. The cleanup path must converge to the same terminal ownership state as successful execution.
- **확정된 변경 범위**: The executor gained child termination, structured wait retry and error reporting, status suppression when the last child was not observed cleanly, and complete cleanup after a short spawn sequence.
- **프로젝트 이해에서의 위치**: This commit converts the pipeline from a normal-path mechanism into a reliable lifecycle owner. It explains the later fault-injection and leak-verification architecture.

#### Fix 재구성 기록
- 기존 가정:
- 실제 failure 또는 위험을 드러내는 입력·상태:
- root cause가 위치한 representation / lifecycle / ordering boundary:
- 수정된 invariant 또는 decision:
- 변경 전 코드 증거:
- 변경 후 코드 증거:
- 연결되는 regression test와 그 한계:

#### `be2967a4b946`에서 확인할 실제 코드
- parent SHA의 partial fork failure branch에서 close 후 단순 wait하는 흐름을 기록하고 hang 원인을 설명합니다.
- failure 발생 시 parent pipe close가 child termination보다 먼저인지 확인합니다.
- recorded PID range만 순회해 `SIGKILL`을 보내고 already-exited child를 허용하는 error handling을 기록합니다.
- signal 이후 every recorded PID를 wait하는 loop와 zombie prevention을 확인합니다.
- reap helper가 `EINTR`에 retry하고 non-interrupt failure에 추가 시도를 제공하는 exact logic을 확인합니다.
- 어떤 wait라도 clean하지 않으면 last child status를 사용하지 않고 pipeline status 1로 덮는 branch를 기록합니다.
- successful pipeline path와 partial failure path가 PID/FD/table ownership의 동일 terminal state로 수렴하는지 비교합니다.

#### 학습자가 남길 코드 증거
- 기존 가정:
- block 가능한 concrete pipeline scenario:
- root cause: recorded child가 incomplete graph에서 살아 있음:
- close → signal → reap 순서:
- wait failure가 status를 override하는 조건:
- cleanup convergence 표:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: recorded PID는 pipeline 완성 여부와 무관하게 parent가 종료하거나 관찰하며, partial construction이 hang/zombie를 남기지 않습니다.
- 아직 보장하지 않는 것: descriptor save/restore failure와 direct lifecycle stress 검증은 후속 commits가 담당합니다.

#### Thread 내 다음 연결
`d611196b368e`가 later pipe/fork/wait failures를 deterministic regression으로 고정합니다.

### 5.6 `d611196b368e` — `test(exec): pipe·fork·wait 실패 회귀 검증`

#### 확정 정보
- SHA: `d611196b368e`
- Subject: `test(exec): pipe·fork·wait 실패 회귀 검증`
- Importance: **A**
- Tags: `TEST`, `PROCESS`, `FAILURE`
- Source-defined role: Reproduces pipe, mid-fork, and wait failure regressions.
- 학습 깊이: 주요 subsystem boundary, integration point 또는 failure path. 핵심 코드와 설계 판단을 확인합니다.

#### Source에서 확정된 변화
`SMALL_SHELL_TESTING` fault binary로 later pipe creation, mid-pipeline fork, waitpid failure를 주입하고 각 failed pipeline이 status 1로 끝난 뒤 following `echo $?`가 이를 관찰하는지 검증합니다.

#### Test commit 학습 기록
- 대상 production invariant:
- 재현하는 failure 또는 boundary:
- 사용한 test technique:
- 실제 통과하는 production code path:
- 이 테스트가 증명하는 것:
- 이 테스트가 증명하지 않는 것:
- broad integration / deterministic regression / stress·probe 중 분류:
- 후속 변경에서 막는 회귀:

#### `d611196b368e`에서 확인할 실제 코드
- fault binary가 production sources와 어떤 compile definition 차이만 갖는지 확인합니다.
- 각 case가 첫 call이 아니라 later pipe/fork call을 선택하는 injection configuration을 기록합니다.
- mid-fork case의 blocked `sleep` pipeline fixture와 timeout 사용을 확인합니다.
- failure 뒤 child termination/reap path를 통과하고 test가 hang하지 않는지 연결합니다.
- waitpid failure가 otherwise successful last command result를 status 1로 override하는 assertion을 확인합니다.
- following `echo $?`가 same shell process의 continuation과 status propagation을 검증하는지 기록합니다.

#### 학습자가 남길 코드 증거
- 대상 production invariant:
- 각 injected operation/call position:
- partial resource state:
- production cleanup path:
- expected status/output:
- 증명하는 것과 증명하지 않는 것:
- deterministic regression 근거:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: partial process construction과 wait failure가 hang, zombie, false success로 바뀌지 않는다는 regression evidence를 제공합니다.
- 아직 보장하지 않는 것: long-run FD exhaustion과 direct post-pipeline child probe는 `b42e57eb7755`가 추가로 검증합니다.

#### Thread 내 다음 연결
`fd5c76c18c27`가 같은 runtime-boundary pattern을 descriptor operations로 확장합니다.

### 5.7 `fd5c76c18c27` — `refactor(runtime): FD 시스템 호출 경계 분리`

#### 확정 정보
- SHA: `fd5c76c18c27`
- Subject: `refactor(runtime): FD 시스템 호출 경계 분리`
- Importance: **A**
- Tags: `FD_IO`, `FAILURE`, `TEST`
- Source-defined role: Extends the runtime boundary to descriptor duplication and opening.
- 학습 깊이: 주요 subsystem boundary, integration point 또는 failure path. 핵심 코드와 설계 판단을 확인합니다.

#### Source에서 확정된 변화
`open`, `dup`, `dup2`를 `shell_open`, `shell_dup`, `shell_dup2` wrapper 뒤로 옮기고, selected position부터 반복 실패하는 repeat mode를 추가합니다.

#### Refactor 판단 기록
- 기존 abstraction 또는 cost/failure 관찰 한계:
- 새 boundary가 제공하는 contract:
- production semantics가 유지된다는 코드 근거:
- ownership 또는 call-site responsibility 변화:
- 후속 fix/test가 이 seam을 사용하는 방식:

#### `fd5c76c18c27`에서 확인할 실제 코드
- wrapper declarations/definitions와 raw libc/syscall delegation을 확인합니다.
- pipeline wiring, file redirection, heredoc installation, parent stdin/stdout save/restore의 call sites가 모두 wrapper를 사용하는지 검색합니다.
- one-shot failure와 selected position 이후 every call failure의 state machine을 비교합니다.
- production build에서 injection branch가 비활성화되어 semantics가 동일한지 확인합니다.
- repeat mode가 parent restore retry까지 계속 실패시키는 이유를 call counter로 추적합니다.
- 이 commit에서 normal execution/failure policy가 아직 바뀌지 않았다는 diff를 기록합니다.

#### 학습자가 남길 코드 증거
- descriptor wrapper coverage map:
- one-shot vs repeat injection:
- restore retry에 필요한 repeated failure scenario:
- production transparency 근거:
- 후속 fix가 사용할 observability point:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: descriptor save, application, restoration, open exhaustion/permission failure를 하나의 deterministic boundary에서 재현할 수 있습니다.
- 아직 보장하지 않는 것: wrapper 자체는 restore failure를 어떻게 처리할지 결정하지 않습니다.

#### Thread 내 다음 연결
`2ca9f4299c7f`가 recoverable/unrecoverable restore policy를 구현합니다.

### 5.8 `2ca9f4299c7f` — `fix(redirection): 부모 표준 입출력 복원 실패 전파`

#### 확정 정보
- SHA: `2ca9f4299c7f`
- Subject: `fix(redirection): 부모 표준 입출력 복원 실패 전파`
- Importance: **A**
- Tags: `FD_IO`, `FAILURE`, `RISK`
- Source-defined role: Makes parent standard-stream restoration failure observable and fatal when unrecoverable.
- 학습 깊이: 주요 subsystem boundary, integration point 또는 failure path. 핵심 코드와 설계 판단을 확인합니다.

#### Source에서 확정된 변화
parent-executed command의 stdin/stdout restore를 독립적으로 retry하고, transient error도 status 1로 남기며, 어느 descriptor라도 복구 불가능하면 `running`을 clear해 shell을 중단합니다.

#### Fix 재구성 기록
- 기존 가정:
- 실제 failure 또는 위험을 드러내는 입력·상태:
- root cause가 위치한 representation / lifecycle / ordering boundary:
- 수정된 invariant 또는 decision:
- 변경 전 코드 증거:
- 변경 후 코드 증거:
- 연결되는 regression test와 그 한계:

#### `2ca9f4299c7f`에서 확인할 실제 코드
- parent command에서 original stdin/stdout을 save하는 acquisition order와 save failure cleanup을 확인합니다.
- redirection apply 또는 builtin 실행 뒤 restore helper가 stdin/stdout 각각을 독립적으로 처리하는지 기록합니다.
- `EINTR` retry와 non-interrupt failure 후 second attempt의 exact branch를 확인합니다.
- retry가 최종 성공해도 command status를 1로 만드는 evidence-preservation logic을 찾습니다.
- 최종 restore 실패 시 diagnostic과 `shell->running = false` 또는 대응 mutation을 확인합니다.
- saved copies가 두 restore attempt 완료 후 outcome과 무관하게 close되는지 확인합니다.
- redirection setup failure 뒤에도 동일 restoration path를 사용하는지 추적합니다.
- buffered builtin output 확인/flush가 original stdout 복원 전에 이루어지는지 기록합니다.

#### 학습자가 남길 코드 증거
- 기존 best-effort assumption:
- stdin/stdout save/apply/restore state table:
- transient failure 후 recovered state/status:
- unrecoverable failure 후 descriptor/running state:
- setup failure와 normal execution이 합류하는 cleanup path:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: 다음 command 전에 parent descriptors가 신뢰 가능한 상태로 복구되거나 shell이 중단되며, restore 오류가 성공으로 숨겨지지 않습니다.
- 아직 보장하지 않는 것: failure matrix의 실제 회귀 증거는 다음 test commit에서 제공합니다.

#### Thread 내 다음 연결
`13645f58d5e6`가 save, open, apply, restore, repeated unrecoverable failure를 분리해 검증합니다.

### 5.9 `13645f58d5e6` — `test(redirection): 저장·적용·복원 실패 회귀 검증`

#### 확정 정보
- SHA: `13645f58d5e6`
- Subject: `test(redirection): 저장·적용·복원 실패 회귀 검증`
- Importance: **A**
- Tags: `TEST`, `FD_IO`, `FAILURE`
- Source-defined role: Exercises save, application, restoration, open, and persistent failure paths.
- 학습 깊이: 주요 subsystem boundary, integration point 또는 failure path. 핵심 코드와 설계 판단을 확인합니다.

#### Source에서 확정된 변화
parent redirection의 descriptor save, target open, replacement apply, original restore 각 phase에 failure를 주입하고, recoverable case의 continuation과 repeated restore failure의 forced stop을 검증합니다.

#### Test commit 학습 기록
- 대상 production invariant:
- 재현하는 failure 또는 boundary:
- 사용한 test technique:
- 실제 통과하는 production code path:
- 이 테스트가 증명하는 것:
- 이 테스트가 증명하지 않는 것:
- broad integration / deterministic regression / stress·probe 중 분류:
- 후속 변경에서 막는 회귀:

#### `13645f58d5e6`에서 확인할 실제 코드
- 각 case가 `dup`, `open`, `dup2` 중 어느 operation과 call position을 실패시키는지 표로 작성합니다.
- one-shot setup failure에서 builtin payload가 실행/출력되지 않고 status 1이 되는 assertion을 확인합니다.
- recoverable failure 뒤 following command가 normal stdout에 쓰는지 확인합니다.
- repeated `dup2` restore failure에서 retry도 실패하고 shell이 status 1/diagnostic으로 중단하는 fixture를 추적합니다.
- environment mutation 같은 parent-state effect가 setup failure 전에 발생하지 않는지 관련 case를 확인합니다.
- 각 test가 exact production save/apply/restore path를 통과하는지 call chain을 기록합니다.

#### 학습자가 남길 코드 증거
- 대상 production invariant:
- phase별 injected operation:
- expected command execution 여부:
- following command behavior:
- forced stop 조건:
- broad integration 또는 deterministic regression 판정:
- 증명하지 않는 path:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: parent descriptor lifecycle의 negative behavior와 recovery behavior, unrecoverable stop decision을 regression으로 고정합니다.
- 아직 보장하지 않는 것: 장기 반복에서 FD 누적이 없는지와 direct child leak은 다음 lifecycle test가 검증합니다.

#### Thread 내 다음 연결
`b42e57eb7755`가 repeated mixed workload에서 descriptor/child ownership을 직접 관찰합니다.

### 5.10 `b42e57eb7755` — `test(lifecycle): FD와 자식 프로세스 누수 검증`

#### 확정 정보
- SHA: `b42e57eb7755`
- Subject: `test(lifecycle): FD와 자식 프로세스 누수 검증`
- Importance: **A**
- Tags: `TEST`, `PROCESS`, `FD_IO`
- Source-defined role: Directly checks for descriptor exhaustion and unreaped children.
- 학습 깊이: 주요 subsystem boundary, integration point 또는 failure path. 핵심 코드와 설계 판단을 확인합니다.

#### Source에서 확정된 변화
48-descriptor limit 아래 parent redirection, three-stage pipeline, file I/O를 반복하고, test-only `waitpid(-1, ..., WNOHANG)` probe로 live/zombie direct child가 남는지 검사합니다.

#### Test commit 학습 기록
- 대상 production invariant:
- 재현하는 failure 또는 boundary:
- 사용한 test technique:
- 실제 통과하는 production code path:
- 이 테스트가 증명하는 것:
- 이 테스트가 증명하지 않는 것:
- broad integration / deterministic regression / stress·probe 중 분류:
- 후속 변경에서 막는 회귀:

#### `b42e57eb7755`에서 확인할 실제 코드
- test process에 descriptor limit 48을 설정하는 code 또는 harness configuration을 확인합니다.
- 반복 workload가 parent-executed redirection, multi-stage pipeline, input/output file을 어떻게 섞는지 기록합니다.
- 마지막 marker 도달이 FD exhaustion이 없음을 어떻게 간접 증명하는지 확인합니다.
- post-pipeline child probe가 `waitpid(-1, ..., WNOHANG)` 결과를 어떻게 해석하는지 기록합니다.
- live child와 unreaped zombie를 각각 failure로 판정하는 branch를 확인합니다.
- timeout harness termination case가 launched process group을 정리하여 orphan을 막는지 연결합니다.
- `SMALL_SHELL_TESTING` guard가 production process model을 바꾸지 않는지 확인합니다.

#### 학습자가 남길 코드 증거
- 대상 resource invariant:
- workload 반복 횟수/구성:
- FD exhaustion 관찰 방식:
- direct child probe 결과 해석:
- timeout/process-group 관련 assertion:
- broad stress와 deterministic probe의 역할 구분:
- 증명하지 않는 descendant 범위:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: 정상 output만으로 보이지 않는 descriptor 누적과 direct child lifecycle을 반복 workload와 direct probe로 관찰합니다.
- 아직 보장하지 않는 것: 모든 종류의 descendant process나 무한한 workload를 증명하지 않으며 test-specific probe는 production에 포함되지 않습니다.

#### Thread 내 다음 연결
`6dff1ba86ba6`가 preparation 단계의 남은 narrow PID-table leak을 닫습니다.

### 5.11 `6dff1ba86ba6` — `fix(exec): pipe 생성 실패 시 PID 배열 해제`

#### 확정 정보
- SHA: `6dff1ba86ba6`
- Subject: `fix(exec): pipe 생성 실패 시 PID 배열 해제`
- Importance: **B**
- Tags: `FD_IO`, `FAILURE`, `DEBUG`
- Source-defined role: Closes the remaining PID-table leak before any child is spawned.
- 학습 깊이: Thread 흐름에서 맡는 구현 역할과 필요한 state/ownership 변화를 확인합니다.

#### Source에서 확정된 변화
PID table과 pipe table을 모두 할당한 뒤 pipe creation이 실패하는 return path에서 opened pipe ends, pipe table뿐 아니라 아직 local인 PID table도 해제합니다.

#### Fix 재구성 기록
- 기존 가정:
- 실제 failure 또는 위험을 드러내는 입력·상태:
- root cause가 위치한 representation / lifecycle / ordering boundary:
- 수정된 invariant 또는 decision:
- 변경 전 코드 증거:
- 변경 후 코드 증거:
- 연결되는 regression test와 그 한계:

#### `6dff1ba86ba6`에서 확인할 실제 코드
- pipeline preparation에서 PID table과 pipe table의 acquisition order를 확인합니다.
- pipe creation loop가 일부 성공한 뒤 실패하는 branch와 no-child-yet 조건을 기록합니다.
- partial pipe ends close loop가 `-1` slots를 안전하게 skip하는지 확인합니다.
- failure return 전 pipe table과 PID table 모두 free되는 exact lines를 확인합니다.
- successful spawn path와 다른 ownership transfer가 아직 발생하지 않았음을 증명합니다.
- parent SHA와 diff하여 추가된 cleanup 한 항목과 그 누락 원인을 기록합니다.

#### 학습자가 남길 코드 증거
- acquisition list:
- failure 시점의 live resources:
- cleanup list 전/후:
- child count가 0인 근거:
- narrow leak의 관찰 방법:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: first child가 생기기 전 pipe creation failure에서도 preparation memory가 모두 회수됩니다.
- 아직 보장하지 않는 것: project-wide ownership model을 바꾸지 않는 narrow cleanup fix입니다.

#### Thread 내 다음 연결
Pipeline Thread의 마지막 commit입니다. 최종 ledger에서 모든 acquisition path가 terminal cleanup state로 수렴하는지 확인합니다.

## 6. Invariant ledger

Source가 명시한 invariant와 engineering difficulty만 사용합니다. 실제 코드 근거와 변화 시점은 학습자가 채웁니다.

| Invariant | Source에서 확정된 의미 | 처음 도입/표현 | 강화·복구·검증 | 학습자가 확인한 코드 근거 |
| --- | --- | --- | --- | --- |
| Every recorded child PID remains parent-owned until termination or observation. | parent가 PID를 기록한 뒤에는 pipeline이 완성되지 않아도 해당 child를 종료하거나 wait로 관찰해야 합니다. | `ae988017efd5` | `be2967a4b946`, `d611196b368e`, `b42e57eb7755` | PID recording, kill loop, reap loop, wait error path를 연결합니다.<br>기록: |
| Each process closes every pipe end it does not need. | 숨은 writer/read end가 EOF와 resource lifetime을 방해하지 않도록 parent와 child 모두 불필요한 pipe end를 닫아야 합니다. | `a71f98de0d92` | `be2967a4b946`, `b42e57eb7755` | stage별 descriptor table과 close loop를 기록합니다.<br>기록: |
| Parent standard streams are restored before the next command. | restore가 불가능하면 이후 command I/O가 신뢰 불가능하므로 shell은 계속 실행하지 않습니다. | `fd5c76c18c27`의 injectable boundary | `2ca9f4299c7f`, `13645f58d5e6` | save/apply/restore 각 failure branch와 `running` mutation을 기록합니다.<br>기록: |
| Shell-visible status reflects cleanly observed process results. | 정상 exit, signal, 126, 127 mapping과 wait failure를 구분해야 합니다. | `7c9646e7cd79` | `be2967a4b946`, `d611196b368e` | wait status translation과 error override 조건을 기록합니다.<br>기록: |

### Ledger 작성 시 확인할 것

- field 또는 resource가 처음 생기는 commit과 invariant가 실제로 완성되는 commit을 구분합니다.
- fix가 이전 feature를 삭제한 것인지, representation에 빠진 정보를 보강한 것인지 구분합니다.
- test evidence는 production invariant와 실제 production path에 연결합니다.
- 정상 경로와 failure 경로가 같은 terminal ownership state로 수렴하는지 기록합니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 문제 | Feature / 기존 상태 | Fix 또는 결정 | Regression / 확인 방법 | 학습자 코드 근거 |
| --- | --- | --- | --- | --- |
| later fork failure 뒤 이미 생성된 child가 pipe에서 block되어 wait가 끝나지 않음 | `a71f98de0d92`의 normal pipe graph | `be2967a4b946` — parent pipe close, recorded child termination, complete reaping | `915aa072298b` seam → `d611196b368e` deterministic pipe/fork/wait failures → `b42e57eb7755` lifecycle probe | |
| parent builtin redirection restore failure를 무시하면 persistent stdin/stdout이 손상됨 | `fd5c76c18c27`의 dup/open seam | `2ca9f4299c7f` — independent retry, status 1, unrecoverable stop | `13645f58d5e6` — save/apply/restore/open/repeated failure matrix | |
| pipe creation failure 전 preallocated PID table이 return path에 남음 | execution table을 먼저 할당하는 preparation order | `6dff1ba86ba6` — partial pipe cleanup에 PID table free 추가 | Thread 내 별도 전용 test commit은 없으므로 fault-injection 또는 sanitizer 실행 결과와 allocation/free code를 직접 기록합니다. | |

## 8. Ownership / state / responsibility 변화

| 대상 | Owner / 책임 주체 | 책임 종료 시점 | 해당 SHA에서 확인할 내용 | 학습자 기록 |
| --- | --- | --- | --- | --- |
| PID slot | parent executor | wait 또는 partial-failure termination/reap 완료 | record 시점과 valid count를 확인 | |
| pipe table | parent 준비 단계 | parent close 후 table free | 각 slot `-1` 초기화와 partial creation cleanup 확인 | |
| child inherited pipe ends | 각 child stage | dup2 뒤 모든 original end close | stage index별 필요한 end와 불필요한 end 기록 | |
| saved stdin/stdout | parent-command executor | restore attempts 완료 후 close | 둘을 독립적으로 복원하는 code 확인 | |
| external environment vector | child before exec | exec 성공 시 process image로 이전, 실패 시 child cleanup | serialization과 failure status 기록 | |
| last-stage wait result | parent status calculation | 모든 required wait가 clean할 때만 사용 | wait error override branch 기록 | |

## 9. Thread 최종 상태

아래 항목은 final HEAD를 보고 채우지 않습니다. 이 Thread의 마지막 SHA까지 누적된 code와 각 commit diff만 사용합니다.

- N-stage pipeline의 process/FD graph를 실제 loop index와 descriptor 식으로 작성합니다.
- parent command path와 child pipeline path를 분기 조건부터 cleanup까지 비교합니다.
- normal completion, pipe failure, mid-fork failure, wait failure, restore failure의 terminal state를 표로 정리합니다.
- 어떤 자원이 생성되기 전/후 failure인지에 따라 cleanup 책임이 어떻게 달라지는지 작성합니다.

### 최종 상태 기록

- 최종적으로 유지되는 data/resource ownership:
- 최종적으로 보장되는 execution 또는 recovery rule:
- Thread가 해결한 가장 어려운 failure:
- Thread 밖에 남아 있는 보장 범위:

## 10. 최종 architecture 또는 execution flow 정리

아래 source-confirmed 단계에 실제 function, field, branch, cleanup을 채웁니다.

```text
[command_count 확인]
  ↓ allocate PID table + pipe table
[create N-1 pipes]
  ↓ fork in command order
[child i: dup previous read / next write → close all originals → apply redirections → builtin or exec]
[parent: record PID → after spawn close all parent pipe ends]
  ↓ wait exact recorded PIDs
[last clean stage status 또는 status 1]

[partial failure branch]
  ↓ close parent FDs → terminate recorded children → reap every PID → free tables
[return only after ownership converges]
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
