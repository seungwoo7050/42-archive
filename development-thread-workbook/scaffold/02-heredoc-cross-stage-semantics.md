# Heredoc from stored input to recoverable cross-stage semantics

> 한국어 주제: **저장된 입력에서 복구 가능한 cross-stage heredoc 의미까지**
>
> Project: `small-shell`  
> Branch: `c/minishell`  
> Development Thread order: 2/5

## 1. Thread 목표

heredoc delimiter의 정규화와 quote provenance, body의 수집·저장·확장, stdin 설치, temporary-stream 오류 전파, 입력 경계 복구를 하나의 수명으로 추적합니다.

**Source-defined significance**

> Heredoc is the strongest integration thread in the history. It crosses parsed identity, quote provenance, input ordering, body expansion, descriptor installation, and recovery after a failure has already consumed part of stdin. The history exposes two distinct corrections: preserving semantic provenance rather than reconstructing it from text, and preserving the command stream boundary even when preparation fails.

**학습 관점**

Heredoc은 parser identity, quote provenance, 입력 소비 순서, expansion, descriptor 설치, 실패 뒤 stream position 복구를 모두 가로지르는 가장 강한 integration thread입니다.

### SHA 고정 원칙

- 각 commit은 반드시 표시된 exact SHA 또는 그 parent와 비교합니다.
- 먼저 `git show --name-status <SHA>`로 변경 파일을 식별한 뒤, 필요한 path만 `git diff <SHA>^ <SHA> -- <path>`로 봅니다.
- 실제 구현은 `git show <SHA>:<path>` 또는 detached worktree에서 확인합니다.
- final HEAD의 type, function, test를 과거 commit 설명에 소급하지 않습니다.
- later commit의 field나 fix가 아직 존재하지 않는 SHA에서는 그 부재 자체를 기록합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- dequoted delimiter text와 'quote syntax가 사용되었는가'라는 provenance는 왜 별도 정보입니까?
- 동일한 delimiter text가 여러 번 등장해도 body가 섞이지 않도록 어떤 identity를 key로 사용합니까?
- 왜 connector gating 전에 line 전체의 heredoc을 source order로 수집합니까?
- quoted delimiter와 unquoted delimiter에서 body expansion 경로는 어떻게 갈립니까?
- temporary stream이 stdin으로 공개되기 전에 어떤 단계가 모두 성공해야 합니까?
- 준비가 이미 stdin 일부를 소비한 뒤 실패하면 다음 command boundary를 어떻게 복구합니까?
- 복구 read까지 반복 실패할 때 shell이 계속 실행하면 안 되는 이유는 무엇입니까?

## 3. 완료 기준

- [ ] 한 line에 heredoc이 둘 이상 있는 입력을 사용해 parse node identity와 body entry를 연결했습니다.
- [ ] single, double, partial quote delimiter의 text와 provenance를 별도로 기록했습니다.
- [ ] parse → precollect → store → expand policy → temp stream → dup2 → cleanup 순서를 코드로 검증했습니다.
- [ ] quote provenance bug, temp stream failure, input-boundary failure의 각각에 대해 Fix → Regression Test를 연결했습니다.
- [ ] 정상 EOF warning, recoverable read failure, unrecoverable repeated failure를 구분했습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source-defined role |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `e65591bb66f5` | `feat(heredoc): 구분자 정규화 버퍼 구현` | B | `HEREDOC`, `PRACTICAL` | Introduces delimiter dequoting support. |
| 2 | `7c9692346824` | `feat(heredoc): 수집 본문 저장소 수명 관리` | A | `HEREDOC`, `ARCH`, `RISK` | Defines body storage keyed by the owning redirection node. |
| 3 | `fc9c63a03db2` | `feat(heredoc): 구분자별 본문 순차 수집` | A | `HEREDOC`, `CORE`, `INTEGRATION` | Collects all pending bodies in source order. |
| 4 | `aeb0d6cba9c1` | `feat(heredoc): 인용 여부에 따라 본문 확장` | A | `HEREDOC`, `EXPANSION`, `CORE` | Adds quote-dependent body expansion. |
| 5 | `d297bd2e8908` | `feat(redirection): heredoc을 stdin으로 연결` | S | `HEREDOC`, `FD_IO`, `INTEGRATION` | Integrates heredoc syntax, precollection, lifetime, redirection order, and stdin installation. |
| 6 | `854f0f435c82` | `fix(heredoc): 구분자의 인용 상태를 실행 단계까지 보존` | S | `HEREDOC`, `DEBUG`, `RISK` | Replaces an insufficient text heuristic with explicit lexical quote provenance. |
| 7 | `dce9e5c083fa` | `test(heredoc): 이중·부분 인용 구분자 회귀 검증` | A | `TEST`, `HEREDOC`, `EDGE` | Locks down double-quoted and partially quoted delimiters. |
| 8 | `9afdca85f5a5` | `fix(heredoc): 임시 파일 저장 오류를 전파` | A | `HEREDOC`, `FD_IO`, `FAILURE` | Propagates temporary-stream storage and positioning failures. |
| 9 | `2fbc4c73af2c` | `test(heredoc): 임시 저장 실패의 데이터 절단 방지 검증` | A | `TEST`, `HEREDOC`, `FAILURE` | Verifies that such failures cannot silently truncate command input. |
| 10 | `c30b39c0bcf8` | `fix(heredoc): 준비 실패 뒤 입력 구분자 경계 복구` | A | `HEREDOC`, `FAILURE`, `RISK` | Restores future command boundaries after heredoc preparation failure. |
| 11 | `7e2fdea3affd` | `test(io): read·write와 heredoc 입력 실패 검증` | A | `TEST`, `FAILURE`, `HEREDOC` | Verifies read failure, recovery, continuation, and forced-stop behavior. |

## 5. Commit별 학습 기록

### 5.1 `e65591bb66f5` — `feat(heredoc): 구분자 정규화 버퍼 구현`

#### 확정 정보
- SHA: `e65591bb66f5`
- Subject: `feat(heredoc): 구분자 정규화 버퍼 구현`
- Importance: **B**
- Tags: `HEREDOC`, `PRACTICAL`
- Source-defined role: Introduces delimiter dequoting support.
- 학습 깊이: Thread 흐름에서 맡는 구현 역할과 필요한 state/ownership 변화를 확인합니다.

#### Source에서 확정된 변화
lexer literal-marker encoding을 제거해 exact delimiter text를 만드는 전용 normalization buffer를 추가하되, ordinary variable expansion은 수행하지 않습니다.

#### 설계·상태 변화 기록
- 이 commit 직전 상태:
- 해결하려던 문제:
- 기존 표현·실행 순서가 충분하지 않았던 이유:
- 선택한 결정:
- publish 또는 state mutation이 일어나는 지점:
- failure 뒤 cleanup 또는 상태:

#### `e65591bb66f5`에서 확인할 실제 코드
- delimiter normalization entry와 local growable buffer state를 찾습니다.
- literal marker와 following byte를 한 단위로 소비해 literal byte만 output에 쓰는 branch를 확인합니다.
- unmarked byte가 그대로 복사되고 `$`가 expansion trigger로 처리되지 않는지 확인합니다.
- append마다 NUL termination을 유지하는 code와 capacity growth를 기록합니다.
- allocation failure에서 partial output을 free하고 parsed encoded target은 변경하지 않는지 확인합니다.

#### 학습자가 남길 코드 증거
- encoded delimiter 입력 예와 normalized output:
- marker pair 소비 branch:
- NUL/capacity invariant:
- failure cleanup:
- ordinary word expansion과 분리되는 API boundary:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: parser-owned encoded delimiter를 보존한 채 matching에 필요한 dequoted text를 별도 owned buffer로 얻습니다.
- 아직 보장하지 않는 것: body storage, collection order, quote-dependent body expansion, stdin installation은 아직 없습니다.

#### Thread 내 다음 연결
`7c9692346824`가 normalized delimiter로 수집한 body를 line-scoped execution context에 저장할 ownership model을 정의합니다.

### 5.2 `7c9692346824` — `feat(heredoc): 수집 본문 저장소 수명 관리`

#### 확정 정보
- SHA: `7c9692346824`
- Subject: `feat(heredoc): 수집 본문 저장소 수명 관리`
- Importance: **A**
- Tags: `HEREDOC`, `ARCH`, `RISK`
- Source-defined role: Defines body storage keyed by the owning redirection node.
- 학습 깊이: 주요 subsystem boundary, integration point 또는 failure path. 핵심 코드와 설계 판단을 확인합니다.

#### Source에서 확정된 변화
각 heredoc body와 해당 parsed redirection pointer를 pair로 저장하는 execution-context-owned repository를 추가합니다. delimiter text가 같아도 redirection identity로 구분하며, destructor가 body와 entry를 해제합니다.

#### 설계·상태 변화 기록
- 이 commit 직전 상태:
- 해결하려던 문제:
- 기존 표현·실행 순서가 충분하지 않았던 이유:
- 선택한 결정:
- publish 또는 state mutation이 일어나는 지점:
- failure 뒤 cleanup 또는 상태:

#### `7c9692346824`에서 확인할 실제 코드
- execution context와 heredoc entry structure의 fields를 확인합니다.
- key가 delimiter string이 아니라 parsed redirection node address인지 lookup code로 증명합니다.
- body allocation의 owner가 collector local에서 repository entry로 이전되는 시점을 확인합니다.
- missing entry lookup이 `NULL`이 아니라 empty string fallback을 제공하는 branch를 기록합니다.
- repository destructor가 body와 nodes를 모두 free하는 순서를 확인합니다.
- repository가 key로 참조하는 parsed redirection보다 먼저 해제되어야 하는 실제 cleanup order를 찾습니다.

#### 학습자가 남길 코드 증거
- entry ownership graph:
- 동일 delimiter 두 개의 서로 다른 key:
- lookup return contract:
- repository와 parsed tree lifetime ordering:
- execution context init/free 호출자:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: 여러 heredoc이 같은 delimiter를 사용해도 body identity가 섞이지 않고 line execution 동안 안정적으로 조회됩니다.
- 아직 보장하지 않는 것: body를 언제 어떤 순서로 읽고 어떤 policy로 확장하는지는 아직 정하지 않습니다.

#### Thread 내 다음 연결
`fc9c63a03db2`가 parsed sequence를 source order로 순회해 repository를 채웁니다.

### 5.3 `fc9c63a03db2` — `feat(heredoc): 구분자별 본문 순차 수집`

#### 확정 정보
- SHA: `fc9c63a03db2`
- Subject: `feat(heredoc): 구분자별 본문 순차 수집`
- Importance: **A**
- Tags: `HEREDOC`, `CORE`, `INTEGRATION`
- Source-defined role: Collects all pending bodies in source order.
- 학습 깊이: 주요 subsystem boundary, integration point 또는 failure path. 핵심 코드와 설계 판단을 확인합니다.

#### Source에서 확정된 변화
sequence의 pipeline, command, redirection을 source order로 순회하여 모든 heredoc body를 실행 전에 수집합니다. exact delimiter match까지 읽고 각 line에 newline을 붙여 identity-keyed repository에 저장합니다.

#### 설계·상태 변화 기록
- 이 commit 직전 상태:
- 해결하려던 문제:
- 기존 표현·실행 순서가 충분하지 않았던 이유:
- 선택한 결정:
- publish 또는 state mutation이 일어나는 지점:
- failure 뒤 cleanup 또는 상태:

#### `fc9c63a03db2`에서 확인할 실제 코드
- top-level heredoc preparation entry와 nested traversal 순서(sequence → pipeline → command → redirection)를 확인합니다.
- 각 heredoc에서 delimiter normalization, line read, exact comparison, newline append, storage transfer 순서를 기록합니다.
- interactive secondary prompt가 어떤 조건에서 출력되는지 확인합니다.
- delimiter 전 EOF가 warning을 내고 collected-so-far body를 유지하는 branch를 확인합니다.
- allocation failure에서 partial body를 discard하고 preparation을 abort하는 path를 추적합니다.
- connector 실행 여부를 알기 전에 complete parsed line의 모든 heredoc을 읽는 위치를 확인합니다.

#### 학습자가 남길 코드 증거
- 여러 heredoc의 실제 traversal order:
- line comparison에서 newline 제거/보존 처리:
- stored body의 newline policy:
- premature EOF warning과 return contract:
- allocation failure의 stream position:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: pending heredoc input은 lexical/source order로 결정적으로 소비되고, 각 body는 owning redirection identity에 저장됩니다.
- 아직 보장하지 않는 것: quoted delimiter에 따른 body expansion 차이는 아직 적용되지 않으며, preparation failure 뒤 unread input recovery도 later fix 대상입니다.

#### Thread 내 다음 연결
`aeb0d6cba9c1`가 body line transformation을 quote policy와 연결합니다.

### 5.4 `aeb0d6cba9c1` — `feat(heredoc): 인용 여부에 따라 본문 확장`

#### 확정 정보
- SHA: `aeb0d6cba9c1`
- Subject: `feat(heredoc): 인용 여부에 따라 본문 확장`
- Importance: **A**
- Tags: `HEREDOC`, `EXPANSION`, `CORE`
- Source-defined role: Adds quote-dependent body expansion.
- 학습 깊이: 주요 subsystem boundary, integration point 또는 failure path. 핵심 코드와 설계 판단을 확인합니다.

#### Source에서 확정된 변화
delimiter가 unquoted로 판단되면 body line에서 `$?`와 valid environment name을 확장하고, quoted로 판단되면 bytes를 그대로 보존합니다. 이 시점의 quote 판단은 delimiter의 literal marker 존재 여부에 의존합니다.

#### 설계·상태 변화 기록
- 이 commit 직전 상태:
- 해결하려던 문제:
- 기존 표현·실행 순서가 충분하지 않았던 이유:
- 선택한 결정:
- publish 또는 state mutation이 일어나는 지점:
- failure 뒤 cleanup 또는 상태:

#### `aeb0d6cba9c1`에서 확인할 실제 코드
- collector가 delimiter의 quoted/unquoted를 결정하는 heuristic을 찾습니다.
- unquoted body expander에서 `$?`, `$NAME`, unset variable, incomplete/unknown dollar form의 branch를 각각 추적합니다.
- quoted branch가 expansion helper를 거치지 않고 literal line을 저장하는지 확인합니다.
- 모든 input line에 정확히 하나의 terminating newline이 저장되는 code를 확인합니다.
- delimiter text normalization과 body expansion policy가 서로 다른 branch에서 처리되는지 기록합니다.
- double-quoted 또는 partially quoted delimiter가 marker 없이 끝날 수 있는 이유를 current lexer representation과 연결해 기록합니다.

#### 학습자가 남길 코드 증거
- quote heuristic의 실제 condition:
- body expansion state machine 또는 helper:
- unset/unknown dollar 결과:
- quoted body literal path:
- later fix가 필요한 hidden assumption:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: unquoted heredoc body는 제한된 variable/status expansion을 받고, quoted로 판정된 body는 literal로 보존됩니다.
- 아직 보장하지 않는 것: marker presence가 모든 quote syntax를 대표한다는 가정은 double quote와 partial quote에서 성립하지 않습니다.

#### Thread 내 다음 연결
`d297bd2e8908`가 이 policy를 parser, execution context, redirection installation과 통합한 뒤 `854f0f435c82`가 provenance root cause를 수정합니다.

### 5.5 `d297bd2e8908` — `feat(redirection): heredoc을 stdin으로 연결`

#### 확정 정보
- SHA: `d297bd2e8908`
- Subject: `feat(redirection): heredoc을 stdin으로 연결`
- Importance: **S**
- Tags: `HEREDOC`, `FD_IO`, `INTEGRATION`
- Source-defined role: Integrates heredoc syntax, precollection, lifetime, redirection order, and stdin installation.
- 학습 깊이: Architecture / invariant 핵심. 변경 전 가정, failure 가능성, 결정, ownership/lifecycle, 후속 fix/test까지 깊게 추적합니다.

#### Source에서 확정된 변화
`<<`를 first-class token/redirection으로 만들고, 실행 전에 모든 body를 수집한 뒤 ordinary redirection traversal에서 temporary stream을 stdin에 설치합니다. Body lifetime은 parsed line execution에 한정됩니다.

#### Source가 확정한 핵심 판단
- **문제**: Heredoc requires more than recognizing `<<`: its body must be read before execution, associated with the correct parsed redirection, installed in source order, and released at the end of the line.
- **결정**: Make heredoc a first-class token and redirection type, precollect all bodies into an execution context keyed by redirection identity, dequote rather than normally expand the delimiter, and install the selected body through the ordinary redirection traversal.
- **중요한 이유**: Reusing ordered redirection application preserves interactions with incoming pipes and later input redirects. The line-scoped execution context also keeps body lifetime independent of child lifetime while retaining a stable link to parsed ownership.
- **확정된 변경 범위**: Lexer and parser support, heredoc preparation, execution-context initialization, failure cleanup, temporary-stream installation on stdin, and post-execution body release were connected into the product path.
- **프로젝트 이해에서의 위치**: This commit shows how a shell feature crosses every major phase. It is the clearest example of the repository's integration and ownership design.

#### 설계·상태 변화 기록
- 이 commit 직전 상태:
- 해결하려던 문제:
- 기존 표현·실행 순서가 충분하지 않았던 이유:
- 선택한 결정:
- publish 또는 state mutation이 일어나는 지점:
- failure 뒤 cleanup 또는 상태:

#### `d297bd2e8908`에서 확인할 실제 코드
- lexer token enum/scanner에서 `<<` longest-match가 추가된 지점을 확인합니다.
- parser redirection type과 target copy에서 heredoc을 ordinary input redirection과 구분하는 field를 확인합니다.
- `shell_process_line` 또는 command processor가 exec context를 init하고 모든 heredoc을 precollect한 뒤 executor를 호출하는 순서를 기록합니다.
- preparation failure가 status 1을 설정하고 repository와 parsed pipeline을 모두 해제하는 path를 확인합니다.
- redirection application에서 stored body lookup → temporary stream creation → body write → `fflush` → 당시의 `rewind` → `fileno` → `dup2` 순서를 추적합니다.
- pipe descriptor wiring 뒤 ordinary ordered redirection traversal이 실행되어 heredoc이 incoming pipe를 override할 수 있는지 확인합니다.
- later input redirection이 heredoc 뒤에 있으면 다시 stdin을 바꾸는 source-order semantics를 확인합니다.
- ordinary argv/redirection expansion pass가 heredoc delimiter를 normal word처럼 expand하지 않는 branch를 찾습니다.
- execution context repository를 parsed tree보다 먼저 free하는 final cleanup order를 확인합니다.

#### 학습자가 남길 코드 증거
- `<<`의 lexer → parser → redirection type 전파:
- parse/precollect/execute/free lifecycle:
- temporary stream의 acquisition과 cleanup:
- pipe/heredoc/later input redirect precedence 예:
- delimiter dequote와 body expansion 책임 분리:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: heredoc은 parsed identity, ordered precollection, line-scoped storage, normal redirection precedence, stdin installation을 하나의 product path로 연결합니다.
- 아직 보장하지 않는 것: quote 여부는 아직 text marker heuristic이고, flush/seek 같은 temporary-stream failure 전파와 preparation failure 뒤 stream recovery는 later commits에서 보강됩니다.

#### Thread 내 다음 연결
`854f0f435c82`가 quote provenance를 explicit field로 복구하고, `9afdca85f5a5`와 `c30b39c0bcf8`가 failure semantics를 강화합니다.

### 5.6 `854f0f435c82` — `fix(heredoc): 구분자의 인용 상태를 실행 단계까지 보존`

#### 확정 정보
- SHA: `854f0f435c82`
- Subject: `fix(heredoc): 구분자의 인용 상태를 실행 단계까지 보존`
- Importance: **S**
- Tags: `HEREDOC`, `DEBUG`, `RISK`
- Source-defined role: Replaces an insufficient text heuristic with explicit lexical quote provenance.
- 학습 깊이: Architecture / invariant 핵심. 변경 전 가정, failure 가능성, 결정, ownership/lifecycle, 후속 fix/test까지 깊게 추적합니다.

#### Source에서 확정된 변화
delimiter text에서 quote 여부를 재구성하던 heuristic을 제거하고, token이 quote syntax 참여 여부를 기록해 parser의 `heredoc_quoted` field와 collector까지 전달합니다.

#### Source가 확정한 핵심 판단
- **문제**: The runtime inferred whether a delimiter had been quoted by looking for literal markers in its text. Double-quoted and partially quoted delimiters could contain no marker, so their bodies were expanded incorrectly.
- **결정**: Record quote participation explicitly in each token, copy that provenance into heredoc redirections, and use the preserved flag independently from the dequoted delimiter text.
- **중요한 이유**: Final text and lexical provenance answer different questions. Text is needed for delimiter matching; provenance is needed to decide expansion. Reconstructing one from the other is not reliable after token normalization.
- **확정된 변경 범위**: `t_token` gained a quoted flag, word scanning set it whenever quote syntax appeared, the parser stored it as `heredoc_quoted`, and collection used that field rather than marker inspection.
- **프로젝트 이해에서의 위치**: It is the strongest root-cause correction in the semantic history and demonstrates why representation layers must preserve information needed by later phases even when that information is absent from normalized text.

#### Fix 재구성 기록
- 기존 가정:
- 실제 failure 또는 위험을 드러내는 입력·상태:
- root cause가 위치한 representation / lifecycle / ordering boundary:
- 수정된 invariant 또는 decision:
- 변경 전 코드 증거:
- 변경 후 코드 증거:
- 연결되는 regression test와 그 한계:

#### `854f0f435c82`에서 확인할 실제 코드
- parent SHA에서 marker presence를 검사하던 old condition을 먼저 기록합니다.
- `t_token`에 추가된 quoted/provenance field와 초기값을 확인합니다.
- word scanner가 single, double, partial quote 중 어느 경우에도 해당 flag를 set하는 지점을 추적합니다.
- parser가 ordinary word가 아니라 heredoc target에 해당 flag를 `heredoc_quoted`로 copy하는 branch를 확인합니다.
- collector가 normalized delimiter text와 `heredoc_quoted`를 서로 다른 목적으로 사용하는 code를 확인합니다.
- fully double-quoted와 unquoted+double-quoted segment가 최종 text는 같지만 flag는 true가 되는 과정을 예제로 추적합니다.
- 새 field의 ownership/lifetime이 token → redirection copy 뒤 token free에도 유지되는지 확인합니다.

#### 학습자가 남길 코드 증거
- 기존 가정:
- 실제 failure input:
- root cause가 text normalization 이후 정보 손실인 근거:
- token flag set → parser copy → collector branch 경로:
- 수정된 semantic invariant:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: delimiter matching용 final text와 body expansion policy용 lexical provenance가 독립적으로 유지됩니다.
- 아직 보장하지 않는 것: 이 fix는 quote semantics를 다루며 temporary-stream I/O failure나 input recovery는 별도 문제입니다.

#### Thread 내 다음 연결
`dce9e5c083fa`가 double-quoted와 partially quoted delimiter를 deterministic regression으로 고정합니다.

### 5.7 `dce9e5c083fa` — `test(heredoc): 이중·부분 인용 구분자 회귀 검증`

#### 확정 정보
- SHA: `dce9e5c083fa`
- Subject: `test(heredoc): 이중·부분 인용 구분자 회귀 검증`
- Importance: **A**
- Tags: `TEST`, `HEREDOC`, `EDGE`
- Source-defined role: Locks down double-quoted and partially quoted delimiters.
- 학습 깊이: 주요 subsystem boundary, integration point 또는 failure path. 핵심 코드와 설계 판단을 확인합니다.

#### Source에서 확정된 변화
fully double-quoted delimiter와 unquoted/double-quoted segment가 섞인 delimiter 모두에서 final terminator는 `EOF`로 dequote되지만 body의 `$HD`는 literal이어야 함을 검증합니다.

#### Test commit 학습 기록
- 대상 production invariant:
- 재현하는 failure 또는 boundary:
- 사용한 test technique:
- 실제 통과하는 production code path:
- 이 테스트가 증명하는 것:
- 이 테스트가 증명하지 않는 것:
- broad integration / deterministic regression / stress·probe 중 분류:
- 후속 변경에서 막는 회귀:

#### `dce9e5c083fa`에서 확인할 실제 코드
- 테스트 fixture가 환경 변수 `HD`를 어떤 값으로 정의하는지 확인합니다.
- double-quoted delimiter 입력과 partially quoted delimiter 입력의 exact bytes를 기록합니다.
- 두 delimiter가 matching에서는 동일한 `EOF`가 되고 body expansion에서는 quote flag 때문에 literal path를 타는 production call path를 연결합니다.
- expected stdout/status/stderr assertion을 확인합니다.
- test가 broad smoke가 아니라 직전 provenance bug의 deterministic regression인지 근거를 기록합니다.

#### 학습자가 남길 코드 증거
- 대상 production invariant:
- 재현하는 failure/boundary:
- test technique:
- 통과하는 production path:
- 증명하는 것:
- 증명하지 않는 것:
- 막는 후속 회귀:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: 어떤 quote segment라도 delimiter에 참여하면 body expansion이 억제된다는 provenance contract를 관찰 가능한 output으로 고정합니다.
- 아직 보장하지 않는 것: single quote 외의 provenance regression만 다루며 temp stream, read failure, multiple heredoc recovery는 증명하지 않습니다.

#### Thread 내 다음 연결
다음 failure chain은 quote가 아니라 temporary-stream integrity를 다룹니다.

### 5.8 `9afdca85f5a5` — `fix(heredoc): 임시 파일 저장 오류를 전파`

#### 확정 정보
- SHA: `9afdca85f5a5`
- Subject: `fix(heredoc): 임시 파일 저장 오류를 전파`
- Importance: **A**
- Tags: `HEREDOC`, `FD_IO`, `FAILURE`
- Source-defined role: Propagates temporary-stream storage and positioning failures.
- 학습 깊이: 주요 subsystem boundary, integration point 또는 failure path. 핵심 코드와 설계 판단을 확인합니다.

#### Source에서 확정된 변화
in-memory heredoc body를 temporary input stream으로 변환할 때 body write, flush, seek, descriptor lookup이 모두 성공한 뒤에만 `dup2`를 호출하도록 오류를 전파합니다.

#### Fix 재구성 기록
- 기존 가정:
- 실제 failure 또는 위험을 드러내는 입력·상태:
- root cause가 위치한 representation / lifecycle / ordering boundary:
- 수정된 invariant 또는 decision:
- 변경 전 코드 증거:
- 변경 후 코드 증거:
- 연결되는 regression test와 그 한계:

#### `9afdca85f5a5`에서 확인할 실제 코드
- parent SHA에서 flush/seek result가 무시되던 code를 기록합니다.
- body write → `fflush` wrapper → `fseek` wrapper → `fileno` wrapper → `dup2`의 exact ordering을 확인합니다.
- 각 단계의 return/error condition이 shared failure label로 수렴하는지 추적합니다.
- diagnostic 또는 `fclose` 전에 `errno`를 저장하는 지점을 확인합니다.
- stdio failure가 `errno`를 남기지 않을 때 `EIO`로 대체하는 branch를 기록합니다.
- 실패 operation name이 diagnostic에 반영되고 stream이 항상 close되는지 확인합니다.
- staging 전체 성공 전에는 stdin descriptor가 변경되지 않는지 확인합니다.

#### 학습자가 남길 코드 증거
- 기존 best-effort assumption:
- 각 staging 단계의 성공 조건:
- shared error path와 saved errno:
- stdin publish point:
- 실패 뒤 following command가 가능한 resource state:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: 불완전하거나 end-position에 놓인 temporary stream이 성공한 heredoc stdin으로 공개되지 않습니다.
- 아직 보장하지 않는 것: 이 fix의 body는 이미 collection된 상태이므로 stdin command-boundary recovery와는 별개의 실패 영역입니다.

#### Thread 내 다음 연결
`2fbc4c73af2c`가 flush와 seek failure를 주입해 data truncation/EOF 노출을 막는지 검증합니다.

### 5.9 `2fbc4c73af2c` — `test(heredoc): 임시 저장 실패의 데이터 절단 방지 검증`

#### 확정 정보
- SHA: `2fbc4c73af2c`
- Subject: `test(heredoc): 임시 저장 실패의 데이터 절단 방지 검증`
- Importance: **A**
- Tags: `TEST`, `HEREDOC`, `FAILURE`
- Source-defined role: Verifies that such failures cannot silently truncate command input.
- 학습 깊이: 주요 subsystem boundary, integration point 또는 failure path. 핵심 코드와 설계 판단을 확인합니다.

#### Source에서 확정된 변화
`fflush`와 `fseek` failure를 deterministic하게 주입하고, heredoc command가 status 1로 실패하며 `cat` payload를 출력하지 않고 following command는 계속 실행되는지 검증합니다.

#### Test commit 학습 기록
- 대상 production invariant:
- 재현하는 failure 또는 boundary:
- 사용한 test technique:
- 실제 통과하는 production code path:
- 이 테스트가 증명하는 것:
- 이 테스트가 증명하지 않는 것:
- broad integration / deterministic regression / stress·probe 중 분류:
- 후속 변경에서 막는 회귀:

#### `2fbc4c73af2c`에서 확인할 실제 코드
- test runtime에서 flush와 seek injection을 선택하는 mechanism을 찾습니다.
- 각 case가 어느 call occurrence를 실패시키는지 기록합니다.
- heredoc body가 성공적으로 write된 뒤에도 flush/seek 실패가 command failure로 전환되는 production path를 연결합니다.
- expected status 1, suppressed `cat` output, following command output assertion을 각각 확인합니다.
- test timeout 또는 isolation이 hang/side effect를 어떻게 방지하는지 확인합니다.

#### 학습자가 남길 코드 증거
- 대상 production invariant:
- 재현하는 failure:
- injection technique:
- 통과하는 production code path:
- 증명하는 것:
- 증명하지 않는 것:
- broad integration 또는 deterministic regression 판정:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: temporary stream의 completion/rewind 실패가 silent truncated input으로 바뀌지 않고 status-bearing redirection failure가 됩니다.
- 아직 보장하지 않는 것: 이 commit의 명시적 regression은 flush와 seek이며 write, fileno, dup2의 모든 조합을 단독으로 증명하지 않습니다.

#### Thread 내 다음 연결
`c30b39c0bcf8`는 staging 이후가 아니라 body preparation 중 failure로 흐트러진 stdin boundary를 복구합니다.

### 5.10 `c30b39c0bcf8` — `fix(heredoc): 준비 실패 뒤 입력 구분자 경계 복구`

#### 확정 정보
- SHA: `c30b39c0bcf8`
- Subject: `fix(heredoc): 준비 실패 뒤 입력 구분자 경계 복구`
- Importance: **A**
- Tags: `HEREDOC`, `FAILURE`, `RISK`
- Source-defined role: Restores future command boundaries after heredoc preparation failure.
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

### 5.11 `7e2fdea3affd` — `test(io): read·write와 heredoc 입력 실패 검증`

#### 확정 정보
- SHA: `7e2fdea3affd`
- Subject: `test(io): read·write와 heredoc 입력 실패 검증`
- Importance: **A**
- Tags: `TEST`, `FAILURE`, `HEREDOC`
- Source-defined role: Verifies read failure, recovery, continuation, and forced-stop behavior.
- 학습 깊이: 주요 subsystem boundary, integration point 또는 failure path. 핵심 코드와 설계 판단을 확인합니다.

#### Source에서 확정된 변화
low-level read/write failure를 주입해 top-level input, builtin output, heredoc collection의 서로 다른 recovery scope를 검증합니다. Heredoc read failure는 boundary를 복구하면 continuation, recovery read까지 반복 실패하면 shell stop이어야 합니다.

#### Test commit 학습 기록
- 대상 production invariant:
- 재현하는 failure 또는 boundary:
- 사용한 test technique:
- 실제 통과하는 production code path:
- 이 테스트가 증명하는 것:
- 이 테스트가 증명하지 않는 것:
- broad integration / deterministic regression / stress·probe 중 분류:
- 후속 변경에서 막는 회귀:

#### `7e2fdea3affd`에서 확인할 실제 코드
- test runtime의 read/write injection selector, call count, repeat mode를 확인합니다.
- top-level read failure case가 buffered commands를 실행하지 않고 process status 1로 종료하는지 확인합니다.
- builtin write failure가 current command status 1이 되고 next line에서 `$?`로 관찰되는 case를 확인합니다.
- heredoc read failure 뒤 discard-through-delimiter recovery를 통과해 next command가 실행되는 input fixture를 추적합니다.
- repeated read failure로 recovery 자체가 실패할 때 `running`/process termination과 residual input suppression을 확인합니다.
- 각 case가 stdout, stderr, status, continuation을 어떻게 별도 assertion하는지 기록합니다.

#### 학습자가 남길 코드 증거
- 대상 production invariant:
- 각 failure의 recovery scope:
- injection technique과 call position:
- heredoc recovery production path:
- continuation이 허용되는 조건:
- forced stop 조건:
- 증명하지 않는 failure class:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: I/O failure status뿐 아니라 future input interpretation의 신뢰성까지 regression으로 고정합니다.
- 아직 보장하지 않는 것: allocation failure sweep 전체를 대체하지 않으며, test 범위는 주입된 read/write paths에 한정됩니다.

#### Thread 내 다음 연결
Heredoc Thread의 마지막 검증입니다. 동일 input-boundary invariant는 allocation Thread에서 다른 failure source로 다시 학습합니다.

## 6. Invariant ledger

Source가 명시한 invariant와 engineering difficulty만 사용합니다. 실제 코드 근거와 변화 시점은 학습자가 채웁니다.

| Invariant | Source에서 확정된 의미 | 처음 도입/표현 | 강화·복구·검증 | 학습자가 확인한 코드 근거 |
| --- | --- | --- | --- | --- |
| Delimiter text and quote provenance remain independent. | delimiter는 비교를 위해 dequote할 수 있지만, body expansion 여부를 결정할 quote provenance는 별도로 남아야 합니다. | `aeb0d6cba9c1`의 초기 policy | `854f0f435c82`에서 explicit flag로 복구, `dce9e5c083fa`로 고정 | token flag → redirection field → collector branch를 연결합니다.<br>기록: |
| Heredoc bodies are keyed by owning redirection identity. | body는 delimiter text가 아니라 해당 parsed redirection의 주소로 식별됩니다. | `7c9692346824` | `d297bd2e8908`에서 normal redirection path와 통합 | entry 구조, lookup, parsed tree와 execution context의 destructor 순서를 기록합니다.<br>기록: |
| Temporary-stream staging must complete before stdin replacement. | body write, flush, seek, descriptor 획득, duplication 실패는 성공한 command input으로 보고될 수 없습니다. | `d297bd2e8908`의 temp-stream 설치 | `9afdca85f5a5`, `2fbc4c73af2c` | 성공 조건과 단일 error path를 actual code로 기록합니다.<br>기록: |
| Preparation failure must preserve the next command boundary. | heredoc 준비 실패가 body data를 이후 shell command로 재해석하게 해서는 안 됩니다. | `fc9c63a03db2`의 ordered input consumption | `c30b39c0bcf8`, `7e2fdea3affd` | failed state, discard traversal, forced-stop branch를 기록합니다.<br>기록: |

### Ledger 작성 시 확인할 것

- field 또는 resource가 처음 생기는 commit과 invariant가 실제로 완성되는 commit을 구분합니다.
- fix가 이전 feature를 삭제한 것인지, representation에 빠진 정보를 보강한 것인지 구분합니다.
- test evidence는 production invariant와 실제 production path에 연결합니다.
- 정상 경로와 failure 경로가 같은 terminal ownership state로 수렴하는지 기록합니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 문제 | Feature / 기존 상태 | Fix 또는 결정 | Regression / 확인 방법 | 학습자 코드 근거 |
| --- | --- | --- | --- | --- |
| literal marker 존재 여부만으로 quote를 추정하면 double/partial quote를 놓침 | `aeb0d6cba9c1`, `d297bd2e8908`의 text-based heuristic | `854f0f435c82` — token quote participation을 `heredoc_quoted`까지 전달 | `dce9e5c083fa` — double-quoted와 partially quoted delimiter deterministic regression | |
| temp body write 뒤 flush/seek 실패를 무시하면 truncated input 또는 EOF가 설치됨 | `d297bd2e8908`의 temporary-stream installation | `9afdca85f5a5` — write/flush/seek/fileno 전체 성공 뒤에만 dup2 | `2fbc4c73af2c` — injected flush/seek failure, status 1, no payload, continuation | |
| 준비 실패 뒤 unread body와 later delimiter가 stdin에 남아 command로 실행될 수 있음 | `fc9c63a03db2`의 early-abort path | `c30b39c0bcf8` — current와 pending heredoc을 delimiter까지 discard | `7e2fdea3affd` — read failure recovery와 recovery read 반복 실패 시 forced stop | |

## 8. Ownership / state / responsibility 변화

| 대상 | Owner / 책임 주체 | 책임 종료 시점 | 해당 SHA에서 확인할 내용 | 학습자 기록 |
| --- | --- | --- | --- | --- |
| encoded delimiter string | parsed redirection | parsed tree cleanup | ordinary word expansion과 분리되는 지점 확인 | |
| normalized delimiter | collector local owner | 해당 heredoc collection 완료 | allocation·dequote failure cleanup 기록 | |
| body buffer | collector → heredoc repository entry | execution context cleanup | partial buffer discard와 successful transfer 구분 | |
| redirection identity pointer | repository key로 참조 | repository가 parsed tree보다 먼저 해제되어야 함 | 실제 destructor order 확인 | |
| temporary stream / fd | redirection application | dup2 성공 또는 error path | write·flush·seek·fileno·dup2·fclose 순서 기록 | |
| stdin stream position | collector/recovery path | 다음 command boundary 확보 시점 | 복구 실패 시 `running` 또는 종료 결정 기록 | |

## 9. Thread 최종 상태

아래 항목은 final HEAD를 보고 채우지 않습니다. 이 Thread의 마지막 SHA까지 누적된 code와 각 commit diff만 사용합니다.

- delimiter text, quote provenance, body bytes, redirection node identity를 서로 다른 항목으로 설명합니다.
- 모든 heredoc이 실행 여부와 무관하게 언제 수집되는지 표시합니다.
- redirection source order에서 pipe input, heredoc, later input redirect의 우선순위를 코드로 정리합니다.
- 정상 collection, staging failure, preparation failure, recovery failure의 terminal state를 구분합니다.

### 최종 상태 기록

- 최종적으로 유지되는 data/resource ownership:
- 최종적으로 보장되는 execution 또는 recovery rule:
- Thread가 해결한 가장 어려운 failure:
- Thread 밖에 남아 있는 보장 범위:

## 10. 최종 architecture 또는 execution flow 정리

아래 source-confirmed 단계에 실제 function, field, branch, cleanup을 채웁니다.

```text
[parsed redirection: encoded target + quote provenance]
  ↓ source-order traversal
[delimiter normalization / exact line matching]
  ↓ quoted? branch
[literal body 또는 $NAME/$? expansion]
  ↓ store by redirection identity
[execution context repository]
  ↓ selected command redirection traversal
[write → flush → seek → descriptor → dup2]
  ↓
[command stdin]
  ↓ cleanup repository before parsed tree
[next command boundary recovered or shell stopped]
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
