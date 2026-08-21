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

- [x] 각 commit의 exact SHA에서 변경된 구조체와 핵심 함수의 caller/callee를 기록했습니다.
- [x] `source line → token → command/pipeline list → selected pipeline expansion → execution → cleanup` 흐름을 코드 근거로 설명했습니다.
- [x] pipe와 sequence connector의 binding 차이를 예제 입력과 parser 코드로 연결했습니다.
- [x] skipped pipeline이 확장되지 않는 branch와 `$?`가 갱신되는 순서를 확인했습니다.
- [x] S commit마다 ownership graph, failure path, 후속 연결을 작성했습니다.

> 실행 범위: exact SHA의 commit diff와 해당 시점 source를 GitHub repository에서 검사했습니다. 이 실행 환경에서는 branch checkout이 불가능해 binary build와 runtime command는 수행하지 않았습니다. 아래의 실행 결과 항목은 모두 이를 명시합니다.

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
- 이 commit 직전 상태: scanner에는 operator token만 있었고, 인용된 단어를 입력 줄과 독립된 owned token으로 남기는 표현이 없었습니다.
- 해결하려던 문제: quote delimiter를 제거한 뒤에도 single quote 안의 `$` 같은 byte가 later expansion에서 literal임을 알아야 하며, 입력 줄 해제 뒤에도 token text가 살아 있어야 했습니다.
- 기존 표현·실행 순서가 충분하지 않았던 이유: 최종 text만 보관하면 single-quoted byte와 확장 가능한 byte가 같아지고, source line pointer만 참조하면 line lifetime에 종속됩니다.
- 선택한 결정: `TOK_WORD`와 owned `text`를 추가하고, single-quoted 각 byte를 `LITERAL_MARK('\001') + byte`로 인코딩합니다. Double quote는 delimiter만 제거하고 내부 byte는 marker 없이 둡니다.
- publish 또는 state mutation이 일어나는 지점: `read_word`가 완성한 allocation을 token node의 `text`로 넘기고, node가 완성된 뒤 token list tail에 연결합니다. `start`에는 source offset을 기록합니다.
- failure 뒤 cleanup 또는 상태: unclosed quote 또는 allocation failure면 current word를 해제하고 `tokenize_line`이 이미 연결한 token list를 `free_tokens`로 폐기합니다. Empty quoted word는 failure가 아니라 길이 0인 유효 word입니다.

#### `729a6d2a7d4a`에서 확인할 실제 코드
- `include/shell.h`의 token type/structure에 `text`, `start`, `next`가 있습니다.
- `src/token.c::read_word`는 unquoted, single-quoted, double-quoted fragment를 한 word allocation에 이어 붙입니다.
- single quote branch만 literal marker를 먼저 기록하고, double quote branch는 내부 byte를 그대로 기록합니다.
- quote 직후 닫힘을 만나도 empty string token을 반환합니다.
- unclosed quote branch는 local text를 free하고 error를 설정하며, caller가 prefix token list를 정리합니다.

#### 학습자가 남길 코드 증거
- 확인한 lexer entry 함수와 word-scanning helper: `src/token.c::tokenize_line` → `read_word`; 완성된 word는 word token 생성 helper를 통해 list에 연결됩니다.
- token이 public list에 연결되는 publish 지점: node와 node-owned `text`가 모두 성공한 뒤 tail의 `next`를 갱신하는 append branch입니다.
- single quote marker의 byte 표현과 생성 조건: `#define LITERAL_MARK '\001'`; `quote == '\''`인 동안 각 source byte 앞에 marker를 추가합니다.
- double quote에서 expansion 가능성을 남기는 코드: `quote == '"'`인 branch는 delimiter만 건너뛰고 내부 byte를 marker 없이 append합니다.
- unclosed quote failure path의 해제 순서: local word free → error set → caller의 `free_tokens(prefix)`입니다.
- 확인한 변경 파일: `Makefile`, `include/shell.h`, `src/token.c`.
- 핵심 caller → callee: `tokenize_line` → `read_word` → append helpers → token append; cleanup은 `free_tokens`입니다.
- parent SHA와 비교한 최소 before/after snippet:

```c
/* 729a6d2a7d4a, src/token.c::read_word */
if (quote == '\'')
    word = append_literal(word, line[*i]);
else
    word = append_char(word, line[*i]);
```

- 해당 SHA에서 실행한 test 또는 수동 재현 결과: 실행하지 않았습니다. Exact SHA source와 diff로 `''`, `'$HOME'`, `"$HOME"`, unclosed quote의 branch와 cleanup만 검증했습니다.

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
- 학습 깊이: Architecture / invariant 핵심. 변경 전 가정, failure 가능성, 결정, core code, ownership/lifecycle, follow-up을 추적합니다.

#### Source에서 확정된 변화
pipeline → command → argv/redirection의 계층과 connector metadata를 정의하고, leaf부터 root까지 해제하는 recursive cleanup ownership을 확립합니다.

#### Source가 확정한 핵심 판단
- **문제**: Raw tokens are insufficient for execution: the shell needs a stable representation of arguments, ordered redirections, command groups, connectors, and all associated ownership.
- **결정**: Represent a line as pipelines containing commands, commands containing argv and redirections, and connectors attached to complete pipelines. Mirror that hierarchy with one recursive cleanup entry point.
- **중요한 이유**: Every later parser, expander, heredoc entry, executor allocation, and failure cleanup assumes these ownership boundaries. The model is compact enough for the supported grammar while still making partial and complete destruction deterministic.
- **확정된 변경 범위**: The commit introduced `t_redir`, `t_command`, `t_pipeline`, connector metadata, element counts, and leaf-to-root cleanup for argv strings, redirection targets, commands, and pipeline nodes.
- **프로젝트 이해에서의 위치**: This is the data architecture of the shell. It explains what each phase owns, why later stages copy rather than retain tokens, and how errors can release an arbitrarily partial parse without subsystem-specific cleanup knowledge.

#### 설계·상태 변화 기록
- 이 commit 직전 상태: owned token list만 존재했고, 실행 단위·redirection order·connector를 보관할 parsed hierarchy가 없었습니다.
- 해결하려던 문제: parser가 부분 생성 중 실패하더라도 argv string, vectors, redirection targets, commands, pipelines를 누락 없이 한 경로에서 해제해야 했습니다.
- 기존 표현·실행 순서가 충분하지 않았던 이유: token list는 syntax 순서만 제공하고 어느 문자열이 argv인지, redirection target인지, 어느 command/pipeline이 소유하는지 표현하지 못합니다.
- 선택한 결정: `t_pipeline`이 command list와 `command_count`, connector/next를 소유하고, `t_command`가 null-terminated argv와 ordered redirection list를, `t_redir`가 target string을 소유하도록 계층을 정의했습니다.
- publish 또는 state mutation이 일어나는 지점: 이후 parser가 완성된 child node를 각 parent list에 연결합니다. 이 commit에서는 zero-initialized nodes와 count fields가 안전한 publish 전 상태를 제공합니다.
- failure 뒤 cleanup 또는 상태: `free_pipeline`이 pipeline sequence를 순회하며 command의 argv strings/vector, redirection target/nodes, command nodes, pipeline nodes를 leaf-to-root로 해제합니다. NULL field와 partial list도 허용합니다.

#### `48670b845d7f`에서 확인할 실제 코드
- `include/shell.h`의 `t_redir`, `t_command`, `t_pipeline`, connector enum과 각 owned pointer를 확인했습니다.
- argv vector는 command-owned이며 각 element도 command hierarchy가 소유합니다.
- redirection list의 node와 `target`은 command-owned입니다.
- connector는 command가 아니라 왼쪽 complete pipeline의 metadata입니다.
- `src/parser.c::free_pipeline`은 nested ownership을 한 entry에서 정리합니다.

#### 학습자가 남길 코드 증거
- 구조체별 owner/owned object 표:

| Owner | Owned object | Non-owning/metadata |
| --- | --- | --- |
| `t_pipeline` | ordered `t_command` nodes, following pipeline chain | `command_count`, `next_op` |
| `t_command` | `argv[]`와 각 string, ordered `t_redir` nodes | `argc`, next command link |
| `t_redir` | `target` string | redirection type, next link |

- count field가 later executor allocation에 제공하는 값: `pipeline->command_count`는 PID table 크기와 `N - 1` pipe count 계산에 사용됩니다.
- partial construction에서도 안전한 initial state: zero/NULL 초기화된 pointer, `argc == 0`, `command_count == 0`, empty lists입니다.
- recursive cleanup entry와 내부 call order: `free_pipeline` → command loop → argv elements/vector → redirection target/node → command → pipeline.
- token lifetime과 parsed lifetime이 갈리는 지점: later `parse_tokens`가 token text를 duplicate해 parsed field에 저장하므로 token list를 먼저 free할 수 있습니다.
- 확인한 변경 파일: `include/shell.h`, `src/parser.c` 및 build source list.
- 핵심 caller → callee: later `parse_tokens`가 constructors/append helpers를 사용하고 모든 error/normal cleanup이 `free_pipeline`로 수렴합니다.
- parent SHA와 비교한 최소 before/after snippet: parent에는 token types만 있었고, 이 SHA에서 `t_redir`, `t_command`, `t_pipeline`과 `free_pipeline(t_pipeline *)`가 새로 생깁니다.
- 해당 SHA에서 실행한 test 또는 수동 재현 결과: 실행하지 않았습니다. Exact SHA의 type definition과 destructor body를 검사했습니다.

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
- 이 commit 직전 상태: hierarchy와 destructor만 있고 parser가 argv/redirection nodes를 채우지 않았습니다.
- 해결하려던 문제: word와 redirection target을 같은 token stream에서 읽되 서로 다른 owned destination에 source order대로 publish해야 했습니다.
- 기존 표현·실행 순서가 충분하지 않았던 이유: operator 뒤 word를 일반 argv로도 넣으면 command semantics가 깨지고, append 중 실패하면 기존 vector나 partial node를 잃을 수 있습니다.
- 선택한 결정: `add_arg`가 새 null-terminated vector를 준비해 기존 pointer들을 옮기고 새 string을 복제한 후 command에 publish하며, `add_redir`는 target을 duplicate한 complete node만 tail에 연결합니다.
- publish 또는 state mutation이 일어나는 지점: argv는 새 vector와 새 string이 준비된 후 `command->argv/argc`가 바뀌고, redirection은 node와 target 성공 후 list tail에 연결됩니다.
- failure 뒤 cleanup 또는 상태: missing target/unsupported operator는 syntax error로 전환되고 current command/pipeline을 hierarchy destructor로 정리합니다.

#### `a209a95a84d3`에서 확인할 실제 코드
- `src/parser.c::parse_tokens`, `add_arg`, `add_redir`를 확인했습니다.
- redirection operator branch가 다음 token을 target으로 소비해 main word branch를 건너뜁니다.
- list append는 source order를 유지합니다.
- argv가 없어도 redirection이 있으면 command는 유효합니다.
- empty token stream은 syntax error가 아니라 no parse result입니다.

#### 학습자가 남길 코드 증거
- argv append 전/후 구조: old `argv[0..argc-1]` → new `argv[0..argc]` + final NULL; old vector만 free하고 strings는 새 vector로 이동합니다.
- redirection target ownership transfer: token text를 직접 보관하지 않고 duplicate한 `redir->target`을 node가 소유합니다.
- redirection-only command 판정: `argc == 0`이어도 redirection list가 있으면 parser가 command를 유지합니다.
- syntax failure가 반환되는 정확한 조건: redirection operator 뒤 word가 없거나 해당 시점에 지원하지 않는 operator가 나오는 경우입니다.
- partial command cleanup 함수: `free_pipeline`의 nested command/redirection cleanup입니다.
- 확인한 변경 파일: `src/parser.c`, parser API declarations가 있는 `include/shell.h`.
- 핵심 caller → callee: `parse_tokens` → `add_arg` 또는 `add_redir`; error → shared parse cleanup → `free_pipeline`.
- parent SHA와 비교한 최소 before/after snippet: representation-only state에서 actual token traversal과 ordered population이 추가됐습니다.
- 해당 SHA에서 실행한 test 또는 수동 재현 결과: 실행하지 않았습니다. `echo a > out b`, `> out`, `echo >`에 대응하는 code branch를 검사했습니다.

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
- 이 commit 직전 상태: parser는 하나의 command만 채울 수 있었습니다.
- 해결하려던 문제: `|` 좌우의 command를 독립 ownership node로 확정하고 source-order pipeline에 넣어야 했습니다.
- 기존 표현·실행 순서가 충분하지 않았던 이유: pipe를 일반 operator처럼 command 안에 남기면 stage boundary와 later FD topology를 계산할 `command_count`가 없습니다.
- 선택한 결정: pipe를 current command publish 지점으로 사용하고 새 zero-initialized command를 시작하며 `after_pipe` state로 빈 stage를 거부합니다.
- publish 또는 state mutation이 일어나는 지점: current command가 pipeline tail에 연결될 때 `command_count`가 증가하고 current pointer가 새 command로 교체됩니다.
- failure 뒤 cleanup 또는 상태: leading/repeated/trailing pipe에서 in-progress command와 already attached command list를 모두 hierarchy cleanup으로 폐기합니다.

#### `8624028b83bb`에서 확인할 실제 코드
- pipe token branch의 command finalize/append/new command 순서를 확인했습니다.
- `after_pipe`가 pipe 직후 true가 되고 정상 word/redirection을 읽으면 해제됩니다.
- leading `|`, `||`가 아닌 repeated `| |`, trailing `cmd |`가 empty-stage syntax error로 수렴합니다.
- redirection-only stage도 non-empty command로 유지됩니다.

#### 학습자가 남길 코드 증거
- pipe 직전 current command state: argv/redirection 중 하나 이상을 가진 local command입니다.
- append 후 새 command initial state: old command는 pipeline-owned, `command_count++`; 새 command는 NULL/0 fields입니다.
- 세 가지 malformed pipe input과 branch: `| a`는 current empty, `a | | b`는 `after_pipe`, `a |`는 end-of-input에서 `after_pipe`가 남아 error입니다.
- command_count의 later consumer 후보: `a71f98de0d92`의 PID table과 `N - 1` pipe table 계산입니다.
- failure cleanup이 보유한 두 ownership 영역: pipeline에 published prefix와 아직 local인 current command입니다.
- 확인한 변경 파일: `src/parser.c`, `include/shell.h`의 existing count field 사용.
- 핵심 caller → callee: `parse_tokens` pipe branch → command append helper → new command constructor; failure → shared cleanup.
- parent SHA와 비교한 최소 before/after snippet: single command return에서 ordered command list construction과 `after_pipe` validation이 추가됐습니다.
- 해당 SHA에서 실행한 test 또는 수동 재현 결과: 실행하지 않았습니다. 세 malformed inputs와 `a | b`의 parser state를 exact code로 추적했습니다.

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
- 학습 깊이: Architecture / invariant 핵심. 변경 전 가정, failure 가능성, 결정, core code, ownership/lifecycle, follow-up을 추적합니다.

#### Source에서 확정된 변화
`;`, `&&`, `||`에서 current pipeline을 끝내고 connector를 왼쪽 pipeline의 `next_op`에 저장한 뒤 새 pipeline을 시작합니다. Pipe는 pipeline 내부에 남아 더 강한 binding을 유지합니다.

#### Source가 확정한 핵심 판단
- **문제**: A single-pipeline parser cannot represent semicolon sequencing or conditional execution, and treating all operators alike would lose the stronger binding of pipes.
- **결정**: Finish a pipeline at `;`, `&&`, or `||`, store the connector on its left pipeline, and link the resulting pipeline units in source order. Reject empty units and trailing conditionals while permitting a trailing semicolon.
- **중요한 이유**: The representation preserves the project's grammar without introducing an unnecessarily general AST. It also gives the executor exactly the unit required for short-circuit decisions and keeps cleanup correct when parsing fails after a completed prefix.
- **확정된 변경 범위**: The parser gained pipeline-list construction, connector translation, error handling for empty or incomplete operands, and cleanup of both the current pipeline and the already parsed sequence prefix.
- **프로젝트 이해에서의 위치**: It explains the shell's precedence model: pipes form one executable unit first; sequence and conditional operators then connect those units from left to right.

#### 설계·상태 변화 기록
- 이 commit 직전 상태: one pipeline에 여러 command를 넣을 수 있었지만 line-level sequence를 표현할 수 없었습니다.
- 해결하려던 문제: `a | b && c ; d`에서 pipe group을 먼저 완성한 뒤 `&&`와 `;`가 그 groups를 연결해야 했습니다.
- 기존 표현·실행 순서가 충분하지 않았던 이유: 모든 operator를 같은 list level에 두면 pipe precedence와 connector의 left-result dependency가 사라집니다.
- 선택한 결정: connector를 왼쪽 complete pipeline의 `next_op`에 저장하고 pipeline nodes를 source order로 연결합니다. General AST 대신 현재 grammar에 필요한 최소 linked sequence를 사용합니다.
- publish 또는 state mutation이 일어나는 지점: connector를 만나면 current command를 current pipeline에 finalize하고, pipeline을 sequence tail에 연결한 후 `next_op`를 설정하고 새 pipeline을 시작합니다.
- failure 뒤 cleanup 또는 상태: leading/empty/trailing conditional, pipe RHS 누락에서 current objects와 completed prefix를 모두 하나의 failure path로 해제합니다. Trailing `;`만 허용하고 final tail connector를 `CONN_NONE`으로 정규화합니다.

#### `f297aaad70fe`에서 확인할 실제 코드
- pipeline node의 `next`와 `next_op`를 확인했습니다.
- `a | b && c ; d`는 `[a,b] --AND--> [c] --SEQ--> [d]`가 됩니다.
- connector token → internal enum 변환과 왼쪽 pipeline publish 순서를 확인했습니다.
- leading connector, empty operand, trailing `&&/||`, pipe RHS 누락은 error입니다.
- trailing semicolon은 accepted sequence termination입니다.

#### 학습자가 남길 코드 증거
- 예제 입력의 token → pipeline list 변환:

```text
WORD(a) PIPE WORD(b) AND WORD(c) SEMI WORD(d)
  → pipeline#1 commands=[a,b], next_op=AND
  → pipeline#2 commands=[c],   next_op=SEQ
  → pipeline#3 commands=[d],   next_op=NONE
```

- 각 pipeline에 저장된 `next_op`: 다음 pipeline을 실행할 조건을 왼쪽 node가 보유합니다.
- trailing semicolon normalization 전/후: parse 중 left pipeline에는 sequence 의미가 생기지만 새 empty tail을 publish하지 않고 최종 published tail은 `CONN_NONE`입니다.
- completed prefix와 current object의 cleanup path: shared parse failure가 current command/current pipeline을 먼저 정리하고 sequence head에 `free_pipeline`을 적용합니다.
- 이 표현이 executor에 제공하는 최소 control-flow 정보: ordered pipeline pointer와 left connector enum입니다.
- 확인한 변경 파일: `src/parser.c`, `include/shell.h`.
- 핵심 caller → callee: `parse_tokens` → pipeline finalization/connector mapping/sequence append → `free_pipeline`.
- parent SHA와 비교한 최소 before/after snippet: one `t_pipeline` return에서 linked pipeline list와 `next_op` assignment로 확장됐습니다.
- 해당 SHA에서 실행한 test 또는 수동 재현 결과: 실행하지 않았습니다. 위 예제와 malformed connector states를 source branch로 추적했습니다.

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
- 학습 깊이: Architecture / invariant 핵심. 변경 전 가정, failure 가능성, 결정, core code, ownership/lifecycle, follow-up을 추적합니다.

#### Source에서 확정된 변화
pipeline list를 source order로 순회하면서 preceding connector와 previous status로 실행 여부를 결정하고, 선택된 pipeline만 현재 shell state로 확장한 뒤 dispatch합니다.

#### Source가 확정한 핵심 판단
- **문제**: Expanding an entire parsed line before execution would evaluate skipped branches and would give later pipelines a stale value of `$?`.
- **결정**: Carry the previous connector through the pipeline list, decide whether the next pipeline runs, and expand only that selected pipeline immediately before dispatch using current shell state.
- **중요한 이유**: Control flow and expansion are semantically coupled. A skipped branch must produce no expansion side effects or allocation failures, and an executed branch must observe the status produced by the pipeline immediately before it.
- **확정된 변경 범위**: The commit separated one-pipeline expansion and execution, temporarily detached a pipeline during expansion, implemented `&&` and `||` gating, propagated status after each executed unit, and stopped traversal when `exit` ended the shell.
- **프로젝트 이해에서의 위치**: It explains why parsing can happen for the complete line while expansion remains runtime state-dependent. This timing decision is one of the project's most important shell-semantic judgments.

#### 설계·상태 변화 기록
- 이 commit 직전 상태: executor는 단일 pipeline을 받아 전체 대상에 expansion을 적용한 뒤 실행했습니다.
- 해결하려던 문제: short-circuit로 skip될 pipeline을 미리 확장하면 불필요한 allocation failure가 발생하고, later `$?`가 직전 실행 결과가 아닌 stale status를 볼 수 있습니다.
- 기존 표현·실행 순서가 충분하지 않았던 이유: parser가 line 전체를 먼저 만드는 것은 가능하지만 runtime state-dependent expansion까지 parse 직후 일괄 수행하면 control flow와 timing이 어긋납니다.
- 선택한 결정: previous connector와 current `shell->last_status`로 gate를 먼저 계산하고, 선택된 current pipeline만 list에서 임시 분리해 expand한 뒤 실행합니다.
- publish 또는 state mutation이 일어나는 지점: 실행된 pipeline의 return status만 `shell->last_status`에 기록되고 다음 gate의 입력이 됩니다. Skipped pipeline은 parsed fields와 status를 변경하지 않습니다.
- failure 뒤 cleanup 또는 상태: expansion failure는 dispatch 전에 status 1로 반환됩니다. Link는 restore되고, top-level hierarchy cleanup이 전체 parsed list를 해제합니다. `shell->running == 0`이면 traversal을 중단합니다.

#### `13a70b408e89`에서 확인할 실제 코드
- `src/exec.c::execute_pipeline_list_ctx`의 source-order loop를 확인했습니다.
- AND는 previous status가 0일 때, OR는 nonzero일 때, sequence는 항상 실행합니다.
- gate branch가 `expand_one_pipeline`보다 먼저입니다.
- `expand_one_pipeline`은 `next = pipeline->next; pipeline->next = NULL; ...; pipeline->next = next;` 순서로 current unit만 확장합니다.
- execution result가 `last_status`에 들어간 뒤 previous connector가 update됩니다.
- `running`이 false가 되면 remaining sequence를 실행하지 않습니다.

#### 학습자가 남길 코드 증거
- connector gate truth table과 실제 branch:

| Previous connector | Previous status | Current pipeline |
| --- | ---: | --- |
| `CONN_NONE` / sequence | any | execute |
| `CONN_AND` | 0 | execute |
| `CONN_AND` | nonzero | skip |
| `CONN_OR` | 0 | skip |
| `CONN_OR` | nonzero | execute |

- gate → detach → expand → execute → relink 순서: gate가 false면 detach/expand 자체를 호출하지 않습니다. True면 current `next`를 임시 NULL로 만들고 expansion 후 원래 link를 복원한 뒤 dispatch합니다.
- `$?`가 참조하는 status와 update line: `expand_pipeline`은 호출 시점의 `shell->last_status`를 읽고, `execute_one_pipeline` 반환 뒤 executor가 그 field를 갱신합니다.
- skipped pipeline에 expansion allocation이 발생하지 않는 근거: gate false branch가 expansion call을 건너뜁니다.
- `running` 변화가 loop를 중단하는 위치: executed parent builtin `exit`가 state를 clear한 뒤 list loop condition/branch가 remaining node로 진행하지 않습니다.
- 확인한 변경 파일: `src/exec.c`와 executor declarations.
- 핵심 caller → callee: `execute_pipeline_list_ctx` → gate → `expand_one_pipeline` → `expand_pipeline` → `execute_one_pipeline` → parent command 또는 forked execution.
- parent SHA와 비교한 최소 before/after snippet:

```c
next = pipeline->next;
pipeline->next = NULL;
result = expand_pipeline(shell, pipeline);
pipeline->next = next;
```

- 해당 SHA에서 실행한 test 또는 수동 재현 결과: 실행하지 않았습니다. `false && echo $?`, `true || echo $?`, `false || echo $?`의 gate/expansion order를 source로 추적했습니다.

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
- 이 commit 직전 상태: lexer, parser, list executor가 별도 API로 존재했지만 input loop의 transient object lifetime이 한 곳에 묶이지 않았습니다.
- 해결하려던 문제: lexical/parse error, empty line, valid execution마다 token/pipeline/error allocation을 정확히 정리하고 status semantics를 달리해야 했습니다.
- 기존 표현·실행 순서가 충분하지 않았던 이유: 각 subsystem caller가 cleanup을 따로 책임지면 early return에서 누락되기 쉽고 다음 prompt에 transient state가 남을 수 있습니다.
- 선택한 결정: `shell_process_line`을 line transaction entry로 두고 tokenize → parse → token free → execute → pipeline free 순서를 고정합니다.
- publish 또는 state mutation이 일어나는 지점: lexical/parse error는 `last_status = 258`; valid execution은 executor가 status를 갱신합니다. Empty parse는 이전 status를 유지합니다.
- failure 뒤 cleanup 또는 상태: error string, token prefix, parsed tree를 해당 branch에서 정리하며 persistent `t_shell`의 environment/status/running만 다음 input에 남깁니다.

#### `91ded56b033d`에서 확인할 실제 코드
- input loop가 owned line을 `shell_process_line`에 넘긴 뒤 해제하는 경계를 확인했습니다.
- `shell_process_line`은 token list와 pipeline list의 acquisition/cleanup을 모두 포함합니다.
- lexer/parser diagnostic branch는 258을 설정합니다.
- `pipelines == NULL && error == NULL`인 empty parse는 executor를 호출하지 않습니다.
- valid path는 executor 완료 뒤 `free_pipeline`을 호출합니다.

#### 학습자가 남길 코드 증거
- line owner와 derived representation owner: input loop가 line allocation을 소유하고, lexer가 별도 token text/list를, parser가 별도 hierarchy를 소유합니다.
- syntax failure status path: diagnostic 출력 → error free → transient objects free → `last_status = 258`.
- empty input status path: no parsed pipeline이면 기존 `last_status` 반환.
- valid execution status path: `execute_pipeline_list`/context executor → parsed cleanup → current status 반환.
- 다음 prompt 전에 반드시 해제되는 transient objects: input line, error text, token nodes/text, pipeline hierarchy와 expanded replacements입니다.
- 확인한 변경 파일: line processor가 있는 `src/exec.c`, caller input loop가 있는 `src/input.c`.
- 핵심 caller → callee: `shell_loop` → `shell_process_line` → `tokenize_line` → `parse_tokens` → `free_tokens` → executor → `free_pipeline`.
- parent SHA와 비교한 최소 before/after snippet: subsystem 호출이 한 line-scoped entry에 결합되고 error/empty/valid branches가 분리됐습니다.
- 해당 SHA에서 실행한 test 또는 수동 재현 결과: 실행하지 않았습니다. Exact source에서 세 terminal branch와 cleanup 순서를 확인했습니다.

#### 보장 범위
- 이 commit이 보장하는 것: 한 줄에서 파생된 transient representation은 다음 input 전에 정리되고, persistent `t_shell` state만 command 사이에 남습니다.
- 아직 보장하지 않는 것: later heredoc integration과 allocation/I/O hardening은 이 commit 이후의 별도 thread에서 추가됩니다.

#### Thread 내 다음 연결
이 Thread의 최종 integration 지점입니다. 이후 thread에서는 동일 parsed lifetime에 heredoc과 failure recovery가 결합됩니다.

## 6. Invariant ledger

Source가 명시한 invariant와 engineering difficulty를 유지하고 exact code 근거를 채웠습니다.

| Invariant | Source에서 확정된 의미 | 처음 도입/표현 | 강화·복구·검증 | 학습자가 확인한 코드 근거 |
| --- | --- | --- | --- | --- |
| Published parsed objects have one hierarchical cleanup owner. | 공개된 token, argv entry, redirection, command, pipeline의 소유권은 계층적으로 단일해야 합니다. | `48670b845d7f` | `f297aaad70fe` | `src/parser.c`의 node constructors/append와 `free_pipeline`; sequence parse failure도 completed prefix와 current objects를 같은 hierarchy cleanup으로 정리합니다. |
| Quote effects survive until the stage that needs them. | quote delimiter가 제거된 뒤에도 expansion에 필요한 literal 의미는 남아야 합니다. | `729a6d2a7d4a` | `13a70b408e89`에서 runtime expansion과 결합 | `src/token.c::read_word`가 single-quoted byte에 `LITERAL_MARK`를 붙이고, selected pipeline의 `expand_word`가 marker pair를 literal byte로 소비합니다. Token text는 line과 별도 allocation입니다. |
| Connector gating precedes expansion and execution. | connector는 직전 status를 사용하며, skip된 pipeline은 확장도 실행도 하지 않습니다. | `f297aaad70fe`에서 표현 | `13a70b408e89`에서 실행 invariant로 확정 | `execute_pipeline_list_ctx`의 gate가 `expand_one_pipeline`보다 앞서고, 실행 result를 `last_status`에 쓴 뒤 다음 node로 이동합니다. |

### Ledger 작성 시 확인한 것

- `48670b845d7f`는 ownership field/destructor를 도입했고, `f297aaad70fe`는 completed prefix까지 같은 cleanup이 적용되도록 실제 parser graph를 확장했습니다.
- quote marker는 lexical representation이고, runtime expansion timing은 별도 commit에서 결합됐습니다.
- Thread에 test commit이 없으므로 test evidence를 소급하지 않았습니다. Code path와 example state만 기록했습니다.
- 정상·syntax failure·partial parse 모두 hierarchy의 terminal owner가 `free_tokens`/`free_pipeline`로 수렴합니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 문제 | Feature / 기존 상태 | Fix 또는 결정 | Regression / 확인 방법 | 학습자 코드 근거 |
| --- | --- | --- | --- | --- |
| quote 의미가 raw delimiter와 함께 사라질 위험 | `729a6d2a7d4a`의 literal-marker token 표현 | 이 Thread에는 별도 fix commit이 포함되지 않습니다. | 해당 SHA의 lexer error path와 이후 expansion 연결을 직접 추적합니다. | `read_word`의 single-quote marker 생성과 `expand_word`의 marker 소비를 연결했습니다. Heredoc provenance 문제는 이 표현이 모든 quote participation을 보존하지 못해 Thread 2에서 별도 수정됩니다. |
| pipe와 connector를 같은 수준으로 처리하면 binding이 깨짐 | `8624028b83bb`의 pipeline 경계와 `f297aaad70fe`의 pipeline-linked sequence | 구조 자체가 문제를 예방하는 결정입니다. | source-defined Thread에는 test commit이 없으므로 parser code와 예제 입력으로 증거를 남깁니다. | `a | b && c ; d`가 `[a,b] --AND--> [c] --SEQ--> [d]`로 변환되는 state와 `next_op` assignment를 추적했습니다. |
| 전체 line 선확장 시 skipped branch가 확장되고 `$?`가 stale해짐 | `13a70b408e89`의 gate 후 delayed expansion | 동일 commit에서 execution order를 변경합니다. | gate 전후 호출 순서와 status mutation을 exact SHA에서 확인합니다. | `execute_pipeline_list_ctx` gate → `expand_one_pipeline` → execute → `last_status` update 순서와 false gate에서 expansion call 부재를 확인했습니다. |

## 8. Ownership / state / responsibility 변화

| 대상 | Owner / 책임 주체 | 책임 종료 시점 | 해당 SHA에서 확인할 내용 | 학습자 기록 |
| --- | --- | --- | --- | --- |
| 입력 줄 | `shell_loop` | line 처리 종료 | tokenization 완료 뒤에도 token text가 독립 소유인지 확인 | line과 token text는 별도 allocation이며 input loop가 line을 회수합니다. |
| token text/list | lexer/token list cleanup | parse가 필요한 데이터를 복사한 뒤 | `free_tokens`와 parser copy 지점 기록 | parser가 argv/redirection target을 duplicate한 뒤 `shell_process_line`이 token list를 free합니다. |
| argv/redirection/command/pipeline | parsed hierarchy | line execution 완료 또는 parse failure | `free_pipeline` 및 sequence cleanup의 leaf-to-root 순서 기록 | command-owned strings/nodes부터 pipeline list까지 하나의 hierarchy로 해제됩니다. |
| expanded argv/redirection target | parsed field를 대체한 소유자 | pipeline 실행 후 parsed cleanup | old encoded string free와 new string publish 순서 기록 | selected pipeline에서 expansion 성공 후 field가 replacement를 소유하고, final `free_pipeline`이 해제합니다. Skipped fields는 encoded 상태 그대로 남았다가 같은 cleanup을 탑니다. |
| `t_shell` status/running/environment | top-level shell | process 종료 | per-line transient data와 분리되는 경계 기록 | line cleanup 뒤에도 `last_status`, `running`, environment만 남아 다음 gate/expansion에 사용됩니다. |

## 9. Thread 최종 상태

- 최종 자료구조:

```text
t_pipeline(head)
  ├─ commands -> t_command -> t_command ...
  │                 ├─ argv[] -> owned strings
  │                 └─ redirs -> t_redir(target) ...
  ├─ command_count
  ├─ next_op  -- 왼쪽 pipeline이 다음 pipeline에 적용할 connector
  └─ next -> t_pipeline ...
```

- 각 connector는 왼쪽 complete pipeline의 `next_op`에 저장됩니다.
- `execute_pipeline_list_ctx`가 previous connector와 current `last_status`로 gate한 뒤 selected pipeline만 `expand_one_pipeline`에 전달합니다.
- syntax failure는 transient objects를 정리하고 258, empty parse는 이전 status 유지, valid execution은 실행 결과를 status로 남긴 뒤 hierarchy를 정리합니다.

### 최종 상태 기록

- 최종적으로 유지되는 data/resource ownership: line, token list, parsed hierarchy는 각 단계에서 독립 allocation을 소유하고 한 line 종료 전에 해제됩니다. `t_shell`만 process lifetime을 가집니다.
- 최종적으로 보장되는 execution 또는 recovery rule: pipe는 한 pipeline 내부에서 먼저 결합되고 connector는 complete pipelines를 연결합니다. Gate를 통과한 pipeline만 현재 shell state로 확장·실행됩니다.
- Thread가 해결한 가장 어려운 failure: completed prefix와 in-progress objects가 함께 존재하는 sequence parse failure, 그리고 short-circuit branch를 선확장하지 않도록 timing을 분리한 문제입니다.
- Thread 밖에 남아 있는 보장 범위: heredoc provenance/input recovery, syscall·allocation failure, process/FD lifecycle, 성능 검증은 후속 Thread가 담당합니다.

## 10. 최종 architecture 또는 execution flow 정리

```text
[source line: shell_loop가 line allocation 소유]
  ↓ tokenize_line
[owned tokens: text + source offset + single-quote literal marker]
  ↓ parse_tokens: argv/redirection target을 복사하고 complete node만 publish
[pipeline list: command list + ordered redirections + command_count + next_op]
  ↓ execute_pipeline_list_ctx connector gate
[selected pipeline only]
  ↓ expand_one_pipeline with current shell->last_status
[parent command 또는 forked pipeline dispatch]
  ↓ executed status를 last_status에 기록
[free_pipeline 전체 hierarchy cleanup]
  ↓
[next input line]
```

### 코드 기반 최종 설명

- 핵심 entry function: `shell_process_line`.
- 주요 caller → callee chain: `shell_loop` → `shell_process_line` → `tokenize_line` → `parse_tokens` → `free_tokens` → `execute_pipeline_list`/`execute_pipeline_list_ctx` → `expand_one_pipeline` → dispatch → `free_pipeline`.
- state mutation 순서: token/pipeline local publish → connector gate → selected field expansion → command execution → `last_status` update → optional `running` clear → transient cleanup.
- ownership transfer 순서: scanner local word → token node → parser duplicate to command/redirection → expanded replacement in parsed field → hierarchy destructor.
- failure convergence path: lexical/parse failure는 error allocation과 partial structures를 정리하고 258; expansion failure는 no dispatch/status 1; valid/skip path 모두 final hierarchy cleanup으로 수렴합니다.
- regression evidence: 이 Thread에는 source-defined test commit이 없습니다. Exact branch order와 ownership cleanup을 code inspection으로 검증했으며 runtime test는 실행하지 않았습니다.

## 11. 학습 완료 자가 점검

- [x] 모든 commit을 exact SHA에서 확인했고 final HEAD를 소급하지 않았습니다.
- [x] Commit map의 SHA, subject, importance, tags, order를 변경하지 않았습니다.
- [x] S commit은 problem, prior state, failure possibility, decision, core code, ownership/lifecycle, follow-up을 설명했습니다.
- [x] A commit은 subsystem boundary 또는 failure path와 실제 핵심 code를 설명했습니다.
- [x] B commit은 Thread 내 구현 역할과 state/ownership 변화를 설명했습니다.
- [x] 이 Thread의 fix/test 부재를 명시하고 code evidence를 임의의 later test로 대체하지 않았습니다.
- [x] Invariant ledger의 각 행에 실제 file/function/branch 근거가 있습니다.
- [x] 정상·실패 경로 모두에서 resource와 partial object의 terminal owner를 설명했습니다.
- [x] 이 Thread의 설계 → 구현 → 실행 timing → integration 흐름을 commit history 순서로 재구성했습니다.
