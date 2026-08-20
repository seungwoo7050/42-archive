# Parsed representation to conditional execution

> 한국어 주제: **파싱 표현에서 조건부 실행까지**
>
> Project: `small-shell`  
> Branch: `c/minishell`  
> Development Thread order: 1/5

## 1. Thread 목표

인용 의미가 보존된 token이 소유권이 명확한 command/pipeline 구조로 변환되고, pipe와 조건 연결자의 결합 규칙을 유지한 채 현재 status를 기준으로 선택된 pipeline만 확장·실행되는 과정을 복원합니다.

**Source-defined significance**

> The progression separates three concerns that a shell must not conflate: lexical quote meaning, structural binding, and runtime control flow. The decisive commits are the ownership model, sequence representation, and delayed executor; the surrounding commits populate or integrate those choices. This thread explains why pipes bind within a pipeline, why conditional connectors link pipelines, and why expansion occurs only after a branch is selected.

**학습 관점**

이 흐름은 lexical quote 의미, 구조적 결합, runtime control flow를 분리합니다. 핵심은 command tree ownership, complete pipeline 단위의 sequence 표현, 그리고 branch 선택 뒤에 수행되는 delayed expansion입니다.

### SHA 고정 원칙

- 각 commit은 반드시 표시된 exact SHA 또는 그 parent와 비교합니다.
- 먼저 `git show --name-status <SHA>`로 변경 파일을 식별한 뒤, 필요한 path만 `git diff <SHA>^ <SHA> -- <path>`로 봅니다.
- 실제 구현은 `git show <SHA>:<path>` 또는 detached worktree에서 확인합니다.
- final HEAD의 type, function, test를 과거 commit 설명에 소급하지 않습니다.
- later commit의 field나 fix가 아직 존재하지 않는 SHA에서는 그 부재 자체를 기록합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 입력 줄이 해제된 뒤에도 quote 효과가 token에 남도록 하는 표현은 무엇입니까?
- argv, redirection, command, pipeline은 각각 무엇을 소유하며 어느 cleanup 경로가 전체 구조를 해제합니까?
- pipe가 command 내부 결합이 아니라 pipeline 구성 경계가 되는 코드는 어디입니까?
- `;`, `&&`, `||`가 complete pipeline을 연결한다는 사실은 자료구조와 parser state에 어떻게 나타납니까?
- 왜 전체 line을 먼저 확장하지 않고, connector gate를 통과한 pipeline만 현재 `$?`로 확장합니까?
- 한 줄 처리에서 token, parsed structure, expanded fields, persistent shell state의 수명은 어디서 나뉩니까?

## 3. 완료 기준

- [ ] 각 commit의 exact SHA에서 변경된 구조체와 핵심 함수의 caller/callee를 기록했습니다.
- [ ] `source line → token → command/pipeline list → selected pipeline expansion → execution → cleanup` 흐름을 코드 근거로 설명할 수 있습니다.
- [ ] pipe와 sequence connector의 binding 차이를 예제 입력 하나와 parser 코드로 증명했습니다.
- [ ] skipped pipeline이 확장되지 않는 branch와 `$?`가 갱신되는 순서를 확인했습니다.
- [ ] S commit마다 ownership graph, failure path, 후속 연결을 작성했습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source-defined role |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `729a6d2a7d4a` | `feat(lexer): 인용 단어와 토큰 수명 관리` | A | `LEX_PARSE`, `EXPANSION`, `CORE` | Preserves quote effects in owned word tokens. |
| 2 | `48670b845d7f` | `feat(parser): 명령 트리 소유권 모델 정의` | S | `ARCH`, `LEX_PARSE`, `CORE` | Establishes the command, redirection, pipeline, connector, and cleanup ownership hierarchy. |
| 3 | `a209a95a84d3` | `feat(parser): 인자와 리다이렉션 구문 구성` | B | `LEX_PARSE`, `CORE` | Populates commands and ordered redirections inside that model. |
| 4 | `8624028b83bb` | `feat(parser): pipe로 명령을 pipeline에 결합` | A | `LEX_PARSE`, `CORE`, `INTEGRATION` | Defines a pipeline as an ordered command group and validates pipe boundaries. |
| 5 | `f297aaad70fe` | `feat(parser): 조건 연결자를 sequence로 결합` | S | `ARCH`, `LEX_PARSE`, `CORE` | Extends the representation to a connector-linked sequence of complete pipelines. |
| 6 | `13a70b408e89` | `feat(exec): 조건 연결자와 지연 확장 실행` | S | `ARCH`, `EXPANSION`, `CORE` | Executes that sequence with short-circuiting and status-correct delayed expansion. |
| 7 | `91ded56b033d` | `feat(shell): 한 줄 해석과 실행 수명 연결` | B | `INTEGRATION`, `CORE` | Connects the concrete parse and execution lifetime to each input line. |

## 5. Commit별 학습 기록

### 5.1 `729a6d2a7d4a` — `feat(lexer): 인용 단어와 토큰 수명 관리`

#### 확정 정보
- SHA: `729a6d2a7d4a`
- Subject: `feat(lexer): 인용 단어와 토큰 수명 관리`
- Importance: **A**
- Tags: `LEX_PARSE`, `EXPANSION`, `CORE`
- Source-defined role: Preserves quote effects in owned word tokens.
- 학습 깊이: 주요 subsystem boundary, integration point 또는 failure path. 핵심 코드와 설계 판단을 확인합니다.

#### Source에서 확정된 변화
owned word token을 도입하고, quote delimiter를 제거한 뒤에도 single-quoted byte는 내부 literal marker로 보존합니다. token은 text와 source offset을 소유하며, unclosed quote에서는 이미 생성된 token list를 해제합니다.

#### 설계·상태 변화 기록
- 이 commit 직전 상태:
- 해결하려던 문제:
- 기존 표현·실행 순서가 충분하지 않았던 이유:
- 선택한 결정:
- publish 또는 state mutation이 일어나는 지점:
- failure 뒤 cleanup 또는 상태:

#### `729a6d2a7d4a`에서 확인할 실제 코드
- 이 SHA의 token type/structure에서 text, source position, list linkage가 어디에 저장되는지 찾습니다.
- unquoted, single-quoted, double-quoted fragment가 하나의 word로 이어지는 scanner state를 추적합니다.
- single-quoted character 앞에 literal marker를 쓰는 지점과 double-quoted character를 marker 없이 보존하는 지점을 비교합니다.
- empty quoted word가 길이 0의 유효 token으로 publish되는 branch를 확인합니다.
- unclosed quote 진단 직전까지 확보한 text와 token list가 `free_tokens` 또는 대응 cleanup으로 정리되는지 확인합니다.
- input line과 token text가 별도 allocation인지 확인하여 line 해제 뒤 token이 유효한 이유를 기록합니다.

#### 학습자가 남길 코드 증거
- 확인한 lexer entry 함수와 word-scanning helper:
- token이 public list에 연결되는 publish 지점:
- single quote marker의 byte 표현과 생성 조건:
- double quote에서 expansion 가능성을 남기는 코드:
- unclosed quote failure path의 해제 순서:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: quote delimiter가 사라진 뒤에도 later expansion이 single-quoted byte를 literal로 구분할 수 있고, token lifetime이 input line과 분리됩니다.
- 아직 보장하지 않는 것: operator binding, parser hierarchy, runtime expansion은 아직 보장하지 않습니다. Heredoc의 모든 quote provenance는 later fix에서 별도 field로 보강됩니다.

#### Thread 내 다음 연결
`48670b845d7f`에서 이 owned token의 데이터를 복사해 hierarchical parsed representation을 만듭니다.

### 5.2 `48670b845d7f` — `feat(parser): 명령 트리 소유권 모델 정의`

#### 확정 정보
- SHA: `48670b845d7f`
- Subject: `feat(parser): 명령 트리 소유권 모델 정의`
- Importance: **S**
- Tags: `ARCH`, `LEX_PARSE`, `CORE`
- Source-defined role: Establishes the command, redirection, pipeline, connector, and cleanup ownership hierarchy.
- 학습 깊이: Architecture / invariant 핵심. 변경 전 가정, failure 가능성, 결정, ownership/lifecycle, 후속 fix/test까지 깊게 추적합니다.

#### Source에서 확정된 변화
pipeline → command → argv/redirection의 계층과 connector metadata를 정의하고, leaf부터 root까지 해제하는 recursive cleanup ownership을 확립합니다.

#### Source가 확정한 핵심 판단
- **문제**: Raw tokens are insufficient for execution: the shell needs a stable representation of arguments, ordered redirections, command groups, connectors, and all associated ownership.
- **결정**: Represent a line as pipelines containing commands, commands containing argv and redirections, and connectors attached to complete pipelines. Mirror that hierarchy with one recursive cleanup entry point.
- **중요한 이유**: Every later parser, expander, heredoc entry, executor allocation, and failure cleanup assumes these ownership boundaries. The model is compact enough for the supported grammar while still making partial and complete destruction deterministic.
- **확정된 변경 범위**: The commit introduced `t_redir`, `t_command`, `t_pipeline`, connector metadata, element counts, and leaf-to-root cleanup for argv strings, redirection targets, commands, and pipeline nodes.
- **프로젝트 이해에서의 위치**: This is the data architecture of the shell. It explains what each phase owns, why later stages copy rather than retain tokens, and how errors can release an arbitrarily partial parse without subsystem-specific cleanup knowledge.

#### 설계·상태 변화 기록
- 이 commit 직전 상태:
- 해결하려던 문제:
- 기존 표현·실행 순서가 충분하지 않았던 이유:
- 선택한 결정:
- publish 또는 state mutation이 일어나는 지점:
- failure 뒤 cleanup 또는 상태:

#### `48670b845d7f`에서 확인할 실제 코드
- `t_redir`, `t_command`, `t_pipeline`과 connector 관련 type/field를 exact SHA에서 찾습니다.
- 각 구조체의 owned pointer, non-owning link, count field를 구분해 heap graph로 그립니다.
- command의 null-terminated argv와 ordered redirection list가 어떤 node에 귀속되는지 확인합니다.
- pipeline connector가 command가 아니라 complete pipeline에 저장되도록 설계된 field를 확인합니다.
- `free_pipeline` 또는 대응 cleanup이 argv string → argv vector → redirection target/node → command → pipeline 순으로 수렴하는지 추적합니다.
- parser가 아직 완전하지 않은 상태에서도 zero/NULL-initialized field를 안전하게 free할 수 있는 조건을 확인합니다.
- raw token pointer를 보관하지 않고 later parser가 data를 copy하도록 만드는 type boundary를 확인합니다.

#### 학습자가 남길 코드 증거
- 구조체별 owner/owned object 표:
- count field가 later executor allocation에 제공하는 값:
- partial construction에서도 안전한 initial state:
- recursive cleanup entry와 내부 call order:
- token lifetime과 parsed lifetime이 갈리는 지점:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: published parsed tree 전체를 subsystem-specific knowledge 없이 하나의 hierarchy cleanup으로 폐기할 수 있습니다.
- 아직 보장하지 않는 것: 이 commit은 representation과 destructor를 정의하며, argv/redirection population, pipeline/sequence parsing, execution은 후속 commit에 남습니다.

#### Thread 내 다음 연결
`a209a95a84d3`, `8624028b83bb`, `f297aaad70fe`가 동일 ownership model 안에 data와 binding을 채웁니다.

### 5.3 `a209a95a84d3` — `feat(parser): 인자와 리다이렉션 구문 구성`

#### 확정 정보
- SHA: `a209a95a84d3`
- Subject: `feat(parser): 인자와 리다이렉션 구문 구성`
- Importance: **B**
- Tags: `LEX_PARSE`, `CORE`
- Source-defined role: Populates commands and ordered redirections inside that model.
- 학습 깊이: Thread 흐름에서 맡는 구현 역할과 필요한 state/ownership 변화를 확인합니다.

#### Source에서 확정된 변화
word token을 source order의 null-terminated argv로 복사하고, redirection operator와 뒤따르는 word를 ordered redirection list로 분리합니다. Redirection-only command는 보존하며 missing target은 syntax failure로 처리합니다.

#### 설계·상태 변화 기록
- 이 commit 직전 상태:
- 해결하려던 문제:
- 기존 표현·실행 순서가 충분하지 않았던 이유:
- 선택한 결정:
- publish 또는 state mutation이 일어나는 지점:
- failure 뒤 cleanup 또는 상태:

#### `a209a95a84d3`에서 확인할 실제 코드
- token traversal entry와 current command construction helper를 찾습니다.
- word를 argv에 append할 때 새 array/string이 완성된 뒤 command field에 publish되는 순서를 확인합니다.
- redirection operator 다음 token을 target으로 소비하여 argv에 들어가지 않게 하는 branch를 확인합니다.
- 여러 redirection의 list order가 source order와 동일한지 append code로 증명합니다.
- argv가 없는 redirection-only command를 유효하게 유지하는 조건과 empty token stream 처리 차이를 기록합니다.
- missing target 또는 unsupported operator에서 partial argv/redirection을 해제하는 path를 확인합니다.

#### 학습자가 남길 코드 증거
- argv append 전/후 구조:
- redirection target ownership transfer:
- redirection-only command 판정:
- syntax failure가 반환되는 정확한 조건:
- partial command cleanup 함수:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: 한 command 안에서 argument와 redirection syntax가 분리되고 각 target/argument가 독립 소유됩니다.
- 아직 보장하지 않는 것: pipe로 여러 command를 결합하거나 connector sequence를 구성하지 않습니다.

#### Thread 내 다음 연결
`8624028b83bb`가 pipe를 command-finalization boundary로 추가합니다.

### 5.4 `8624028b83bb` — `feat(parser): pipe로 명령을 pipeline에 결합`

#### 확정 정보
- SHA: `8624028b83bb`
- Subject: `feat(parser): pipe로 명령을 pipeline에 결합`
- Importance: **A**
- Tags: `LEX_PARSE`, `CORE`, `INTEGRATION`
- Source-defined role: Defines a pipeline as an ordered command group and validates pipe boundaries.
- 학습 깊이: 주요 subsystem boundary, integration point 또는 failure path. 핵심 코드와 설계 판단을 확인합니다.

#### Source에서 확정된 변화
`|`를 만나면 current command를 pipeline에 append하고 새 command를 시작합니다. `after_pipe` 상태로 leading, repeated, trailing pipe를 거부하고 partial pipeline을 정리합니다.

#### 설계·상태 변화 기록
- 이 commit 직전 상태:
- 해결하려던 문제:
- 기존 표현·실행 순서가 충분하지 않았던 이유:
- 선택한 결정:
- publish 또는 state mutation이 일어나는 지점:
- failure 뒤 cleanup 또는 상태:

#### `8624028b83bb`에서 확인할 실제 코드
- pipe token branch에서 current command를 finalize하고 pipeline command list에 연결하는 순서를 확인합니다.
- `command_count`가 정확히 어느 시점에 증가하는지 기록합니다.
- `after_pipe` 또는 대응 state가 leading/repeated/trailing pipe를 각각 어떻게 검출하는지 비교합니다.
- pipe 뒤 argument/redirection이 새 command에 귀속되는 current pointer/state reset을 확인합니다.
- 실패 시 in-progress command와 이미 attached된 commands를 모두 해제하는 path를 추적합니다.
- `a209a95a84d3`의 single-command parser와 diff하여 새로 생긴 binding boundary만 분리합니다.

#### 학습자가 남길 코드 증거
- pipe 직전 current command state:
- append 후 새 command initial state:
- 세 가지 malformed pipe input과 branch:
- command_count의 later consumer 후보:
- failure cleanup이 보유한 두 ownership 영역:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: pipeline은 ordered command group으로 표현되고, 빈 stage를 가진 pipe syntax가 partial structure로 남지 않습니다.
- 아직 보장하지 않는 것: `;`, `&&`, `||`로 여러 pipeline을 연결하는 sequence와 runtime short-circuit는 아직 없습니다.

#### Thread 내 다음 연결
`f297aaad70fe`가 complete pipeline을 connector-linked sequence unit으로 사용합니다.

### 5.5 `f297aaad70fe` — `feat(parser): 조건 연결자를 sequence로 결합`

#### 확정 정보
- SHA: `f297aaad70fe`
- Subject: `feat(parser): 조건 연결자를 sequence로 결합`
- Importance: **S**
- Tags: `ARCH`, `LEX_PARSE`, `CORE`
- Source-defined role: Extends the representation to a connector-linked sequence of complete pipelines.
- 학습 깊이: Architecture / invariant 핵심. 변경 전 가정, failure 가능성, 결정, ownership/lifecycle, 후속 fix/test까지 깊게 추적합니다.

#### Source에서 확정된 변화
`;`, `&&`, `||`에서 current pipeline을 끝내고 connector를 왼쪽 pipeline의 `next_op`에 저장한 뒤 새 pipeline을 시작합니다. Pipe는 pipeline 내부에 남아 더 강한 binding을 유지합니다.

#### Source가 확정한 핵심 판단
- **문제**: A single-pipeline parser cannot represent semicolon sequencing or conditional execution, and treating all operators alike would lose the stronger binding of pipes.
- **결정**: Finish a pipeline at `;`, `&&`, or `||`, store the connector on its left pipeline, and link the resulting pipeline units in source order. Reject empty units and trailing conditionals while permitting a trailing semicolon.
- **중요한 이유**: The representation preserves the project's grammar without introducing an unnecessarily general AST. It also gives the executor exactly the unit required for short-circuit decisions and keeps cleanup correct when parsing fails after a completed prefix.
- **확정된 변경 범위**: The parser gained pipeline-list construction, connector translation, error handling for empty or incomplete operands, and cleanup of both the current pipeline and the already parsed sequence prefix.
- **프로젝트 이해에서의 위치**: It explains the shell's precedence model: pipes form one executable unit first; sequence and conditional operators then connect those units from left to right.

#### 설계·상태 변화 기록
- 이 commit 직전 상태:
- 해결하려던 문제:
- 기존 표현·실행 순서가 충분하지 않았던 이유:
- 선택한 결정:
- publish 또는 state mutation이 일어나는 지점:
- failure 뒤 cleanup 또는 상태:

#### `f297aaad70fe`에서 확인할 실제 코드
- pipeline list node와 `next_op` 또는 대응 connector field를 확인합니다.
- `a | b && c ; d` 같은 입력을 token 순서대로 따라가며 어떤 command가 어느 pipeline에 들어가는지 기록합니다.
- connector token을 internal enum으로 변환하는 branch와 왼쪽 pipeline에 저장하는 시점을 확인합니다.
- leading connector, empty command before connector, pipe 뒤 missing command, trailing conditional을 각각 거부하는 state를 찾습니다.
- trailing semicolon을 accept하면서 이전 connector를 `CONN_NONE`으로 normalize하는 code를 확인합니다.
- failure 시 current command/current pipeline/completed prefix를 한 경로에서 모두 해제하는지 추적합니다.
- general AST 없이 linked pipeline sequence로 precedence를 표현한 type relationship을 그립니다.

#### 학습자가 남길 코드 증거
- 예제 입력의 token → pipeline list 변환:
- 각 pipeline에 저장된 `next_op`:
- trailing semicolon normalization 전/후:
- completed prefix와 current object의 cleanup path:
- 이 표현이 executor에 제공하는 최소 control-flow 정보:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: pipe가 먼저 complete executable unit을 만들고, sequence/conditional connector가 그 pipeline units를 왼쪽부터 연결합니다.
- 아직 보장하지 않는 것: representation만으로 short-circuit나 delayed expansion이 실행되지는 않습니다.

#### Thread 내 다음 연결
`13a70b408e89`가 `next_op`와 previous status를 사용해 실제 gate와 delayed expansion을 수행합니다.

### 5.6 `13a70b408e89` — `feat(exec): 조건 연결자와 지연 확장 실행`

#### 확정 정보
- SHA: `13a70b408e89`
- Subject: `feat(exec): 조건 연결자와 지연 확장 실행`
- Importance: **S**
- Tags: `ARCH`, `EXPANSION`, `CORE`
- Source-defined role: Executes that sequence with short-circuiting and status-correct delayed expansion.
- 학습 깊이: Architecture / invariant 핵심. 변경 전 가정, failure 가능성, 결정, ownership/lifecycle, 후속 fix/test까지 깊게 추적합니다.

#### Source에서 확정된 변화
pipeline list를 source order로 순회하면서 preceding connector와 previous status로 실행 여부를 결정하고, 선택된 pipeline만 현재 shell state로 확장한 뒤 dispatch합니다.

#### Source가 확정한 핵심 판단
- **문제**: Expanding an entire parsed line before execution would evaluate skipped branches and would give later pipelines a stale value of `$?`.
- **결정**: Carry the previous connector through the pipeline list, decide whether the next pipeline runs, and expand only that selected pipeline immediately before dispatch using current shell state.
- **중요한 이유**: Control flow and expansion are semantically coupled. A skipped branch must produce no expansion side effects or allocation failures, and an executed branch must observe the status produced by the pipeline immediately before it.
- **확정된 변경 범위**: The commit separated one-pipeline expansion and execution, temporarily detached a pipeline during expansion, implemented `&&` and `||` gating, propagated status after each executed unit, and stopped traversal when `exit` ended the shell.
- **프로젝트 이해에서의 위치**: It explains why parsing can happen for the complete line while expansion remains runtime state-dependent. This timing decision is one of the project's most important shell-semantic judgments.

#### 설계·상태 변화 기록
- 이 commit 직전 상태:
- 해결하려던 문제:
- 기존 표현·실행 순서가 충분하지 않았던 이유:
- 선택한 결정:
- publish 또는 state mutation이 일어나는 지점:
- failure 뒤 cleanup 또는 상태:

#### `13a70b408e89`에서 확인할 실제 코드
- `execute_pipeline_list_ctx` 또는 concrete list executor의 loop entry를 찾습니다.
- current pipeline의 실행 여부를 이전 pipeline에 저장된 connector로 결정하는 변수와 update 순서를 기록합니다.
- `&&` 실패 skip, `||` 성공 skip, unconditional sequence의 branch를 각각 표시합니다.
- gate가 expansion 호출보다 먼저 배치되어 skip된 pipeline의 argv/redirection target을 건드리지 않는지 확인합니다.
- selected pipeline을 list에서 임시 detach하는 code, expansion 후 link를 restore하는 code를 추적합니다.
- pipeline return status가 `last_status`와 다음 gate input으로 반영되는 순서를 기록합니다.
- `exit`가 `shell->running`을 clear한 뒤 traversal을 중단하는 branch를 확인합니다.
- expansion failure 시 해당 pipeline이 실행되지 않고 status/cleanup이 어떻게 처리되는지 확인합니다.

#### 학습자가 남길 코드 증거
- connector gate truth table과 실제 branch:
- gate → detach → expand → execute → relink 순서:
- `$?`가 참조하는 status와 update line:
- skipped pipeline에 expansion allocation이 발생하지 않는 근거:
- `running` 변화가 loop를 중단하는 위치:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: connector decision은 직전 실행 status를 사용하고, skipped pipeline은 확장도 실행도 하지 않으며, 실행된 pipeline은 최신 `$?`를 봅니다.
- 아직 보장하지 않는 것: 이 commit만으로 top-level line/token/parsed cleanup 수명이 완전히 연결되지는 않으며 다음 integration commit에서 묶입니다.

#### Thread 내 다음 연결
`91ded56b033d`가 한 입력 줄의 tokenization, parsing, execution, status, cleanup을 하나의 transaction으로 연결합니다.

### 5.7 `91ded56b033d` — `feat(shell): 한 줄 해석과 실행 수명 연결`

#### 확정 정보
- SHA: `91ded56b033d`
- Subject: `feat(shell): 한 줄 해석과 실행 수명 연결`
- Importance: **B**
- Tags: `INTEGRATION`, `CORE`
- Source-defined role: Connects the concrete parse and execution lifetime to each input line.
- 학습 깊이: Thread 흐름에서 맡는 구현 역할과 필요한 state/ownership 변화를 확인합니다.

#### Source에서 확정된 변화
`shell_process_line`에서 tokenization, parsing, execution, diagnostics, status update, parsed cleanup을 한 줄 단위로 묶습니다. Syntax failure는 status 258, empty parse는 이전 status 유지, valid parse는 실행 후 전체 해제입니다.

#### 설계·상태 변화 기록
- 이 commit 직전 상태:
- 해결하려던 문제:
- 기존 표현·실행 순서가 충분하지 않았던 이유:
- 선택한 결정:
- publish 또는 state mutation이 일어나는 지점:
- failure 뒤 cleanup 또는 상태:

#### `91ded56b033d`에서 확인할 실제 코드
- `shell_loop`에서 `shell_process_line`을 호출하는 지점과 input string의 owner를 확인합니다.
- `shell_process_line` 내부에서 token list와 pipeline list를 처음 획득하고 마지막으로 해제하는 위치를 표시합니다.
- lexical/syntax diagnostic과 status 258 설정 branch를 확인합니다.
- empty parse가 executor를 호출하지 않고 previous status를 유지하는 조건을 확인합니다.
- valid parse에서 executor return과 parsed cleanup 순서를 기록합니다.
- 각 early return이 token, current parse result, diagnostic allocation을 누락 없이 정리하는지 확인합니다.

#### 학습자가 남길 코드 증거
- line owner와 derived representation owner:
- syntax failure status path:
- empty input status path:
- valid execution status path:
- 다음 prompt 전에 반드시 해제되는 transient objects:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: 한 줄에서 파생된 transient representation은 다음 input 전에 정리되고, persistent `t_shell` state만 command 사이에 남습니다.
- 아직 보장하지 않는 것: later heredoc integration과 allocation/I/O hardening은 이 commit 이후의 별도 thread에서 추가됩니다.

#### Thread 내 다음 연결
이 Thread의 최종 integration 지점입니다. 이후 thread에서는 동일 parsed lifetime에 heredoc과 failure recovery가 결합됩니다.

## 6. Invariant ledger

Source가 명시한 invariant와 engineering difficulty만 사용합니다. 실제 코드 근거와 변화 시점은 학습자가 채웁니다.

| Invariant | Source에서 확정된 의미 | 처음 도입/표현 | 강화·복구·검증 | 학습자가 확인한 코드 근거 |
| --- | --- | --- | --- | --- |
| Published parsed objects have one hierarchical cleanup owner. | 공개된 token, argv entry, redirection, command, pipeline의 소유권은 계층적으로 단일해야 합니다. | `48670b845d7f` | `f297aaad70fe` | 각 구조의 생성·append·free 함수와 partial parse cleanup을 기록합니다.<br>기록: |
| Quote effects survive until the stage that needs them. | quote delimiter가 제거된 뒤에도 expansion에 필요한 literal 의미는 남아야 합니다. | `729a6d2a7d4a` | `13a70b408e89`에서 runtime expansion과 결합 | marker 생성 지점, marker 소비 지점, token lifetime을 연결합니다.<br>기록: |
| Connector gating precedes expansion and execution. | connector는 직전 status를 사용하며, skip된 pipeline은 확장도 실행도 하지 않습니다. | `f297aaad70fe`에서 표현 | `13a70b408e89`에서 실행 invariant로 확정 | gate branch, expansion 호출, status update의 실제 순서를 기록합니다.<br>기록: |

### Ledger 작성 시 확인할 것

- field 또는 resource가 처음 생기는 commit과 invariant가 실제로 완성되는 commit을 구분합니다.
- fix가 이전 feature를 삭제한 것인지, representation에 빠진 정보를 보강한 것인지 구분합니다.
- test evidence는 production invariant와 실제 production path에 연결합니다.
- 정상 경로와 failure 경로가 같은 terminal ownership state로 수렴하는지 기록합니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 문제 | Feature / 기존 상태 | Fix 또는 결정 | Regression / 확인 방법 | 학습자 코드 근거 |
| --- | --- | --- | --- | --- |
| quote 의미가 raw delimiter와 함께 사라질 위험 | `729a6d2a7d4a`의 literal-marker token 표현 | 이 Thread에는 별도 fix commit이 포함되지 않습니다. | 해당 SHA의 lexer error path와 이후 expansion 연결을 직접 추적합니다. | |
| pipe와 connector를 같은 수준으로 처리하면 binding이 깨짐 | `8624028b83bb`의 pipeline 경계와 `f297aaad70fe`의 pipeline-linked sequence | 구조 자체가 문제를 예방하는 결정입니다. | source-defined Thread에는 test commit이 없으므로 parser code와 예제 입력으로 증거를 남깁니다. | |
| 전체 line 선확장 시 skipped branch가 확장되고 `$?`가 stale해짐 | `13a70b408e89`의 gate 후 delayed expansion | 동일 commit에서 execution order를 변경합니다. | gate 전후 호출 순서와 status mutation을 exact SHA에서 확인합니다. | |

## 8. Ownership / state / responsibility 변화

| 대상 | Owner / 책임 주체 | 책임 종료 시점 | 해당 SHA에서 확인할 내용 | 학습자 기록 |
| --- | --- | --- | --- | --- |
| 입력 줄 | `shell_loop` | line 처리 시작 전 | tokenization 완료 뒤에도 token text가 독립 소유인지 확인 | |
| token text/list | lexer/token list cleanup | parse가 필요한 데이터를 복사한 뒤 | `free_tokens`와 parser copy 지점 기록 | |
| argv/redirection/command/pipeline | parsed hierarchy | line execution 완료 또는 parse failure | `free_pipeline` 및 sequence cleanup의 leaf-to-root 순서 기록 | |
| expanded argv/redirection target | parsed field를 대체한 소유자 | pipeline 실행 후 parsed cleanup | old encoded string free와 new string publish 순서 기록 | |
| `t_shell` status/running/environment | top-level shell | process 종료 | per-line transient data와 분리되는 경계 기록 | |

## 9. Thread 최종 상태

아래 항목은 final HEAD를 보고 채우지 않습니다. 이 Thread의 마지막 SHA까지 누적된 code와 각 commit diff만 사용합니다.

- 최종 자료구조를 실제 type 이름과 포인터 방향으로 그립니다.
- 각 connector가 어느 pipeline에 저장되는지 표시합니다.
- selected pipeline만 expansion되는 지점과 `last_status` 갱신 지점을 표시합니다.
- syntax failure, empty input, valid execution의 서로 다른 cleanup/status 결과를 구분합니다.

### 최종 상태 기록

- 최종적으로 유지되는 data/resource ownership:
- 최종적으로 보장되는 execution 또는 recovery rule:
- Thread가 해결한 가장 어려운 failure:
- Thread 밖에 남아 있는 보장 범위:

## 10. 최종 architecture 또는 execution flow 정리

아래 source-confirmed 단계에 실제 function, field, branch, cleanup을 채웁니다.

```text
[source line: owner와 lifetime 작성]
  ↓ tokenize_line / 실제 호출 경로 작성
[owned tokens: text, position, quote representation 작성]
  ↓ parse_tokens / copy·publish 지점 작성
[pipeline list: command, argv, redirection, next_op 작성]
  ↓ connector gate
[selected pipeline only]
  ↓ expansion with current shell state
[parent command 또는 forked pipeline dispatch]
  ↓ status update and recursive cleanup
[next input line]
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
