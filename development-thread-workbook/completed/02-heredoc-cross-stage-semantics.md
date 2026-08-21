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

- [x] 한 line에 heredoc이 둘 이상 있는 입력을 사용해 parse node identity와 body entry를 연결했습니다.
- [x] single, double, partial quote delimiter의 text와 provenance를 별도로 기록했습니다.
- [x] parse → precollect → store → expand policy → temp stream → dup2 → cleanup 순서를 코드로 검증했습니다.
- [x] quote provenance bug, temp stream failure, input-boundary failure의 각각에 대해 Fix → Regression Test를 연결했습니다.
- [x] 정상 EOF warning, recoverable read failure, unrecoverable repeated failure를 구분했습니다.

> 실행 범위: exact SHA의 commit diff와 해당 시점 source/test를 GitHub repository에서 검사했습니다. Branch checkout이 불가능해 test binary와 shell script는 실행하지 않았으며, 아래에서 코드 검토와 실제 실행을 구분합니다.

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
- 이 commit 직전 상태: ordinary word expansion은 있었지만 heredoc delimiter의 encoded quote marker만 제거하는 전용 API가 없었습니다.
- 해결하려던 문제: matching에는 `E\001O\001F` 같은 encoded parser text가 아니라 최종 `EOF`가 필요하지만, `$NAME`을 일반 argv처럼 확장해서는 안 됩니다.
- 기존 표현·실행 순서가 충분하지 않았던 이유: ordinary `expand_word`를 재사용하면 delimiter text가 environment/status에 따라 변하고 heredoc syntax의 matching 규칙이 깨집니다.
- 선택한 결정: local growable `strbuf`와 `dequote_runtime_word`를 추가해 marker pair는 literal byte 하나로, unmarked byte는 그대로 복사합니다.
- publish 또는 state mutation이 일어나는 지점: 완성된 buffer pointer만 caller에 반환합니다. Parsed redirection의 encoded target은 변경하지 않습니다.
- failure 뒤 cleanup 또는 상태: init/reserve/append 실패 시 partial buffer를 free하고 NULL을 반환합니다. 이 SHA에는 later `SIZE_MAX` capacity guard가 아직 없습니다.

#### `e65591bb66f5`에서 확인할 실제 코드
- `src/heredoc.c::dequote_runtime_word`와 local `struct strbuf`를 확인했습니다.
- `LITERAL_MARK`를 만나면 marker와 다음 byte를 함께 소비하고 next byte만 append합니다.
- `$`는 별도 branch 없이 ordinary byte로 복사됩니다.
- append 뒤 `data[len] = '\0'`를 유지하고 필요할 때 capacity를 늘립니다.

#### 학습자가 남길 코드 증거
- encoded delimiter 입력 예와 normalized output: `E\001O\001F` → `EOF`; `$TAG` → `$TAG`로 유지됩니다.
- marker pair 소비 branch: marker가 있고 following byte가 있으면 index를 2만큼 진행하고 following byte만 append합니다.
- NUL/capacity invariant: initialized cap 64, `len` 위치에 항상 NUL, `len + 1`이 cap에 닿으면 grow합니다.
- failure cleanup: local buffer allocation을 free하고 NULL; source `redir->target`에는 mutation이 없습니다.
- ordinary word expansion과 분리되는 API boundary: `dequote_runtime_word`는 shell/environment 인자를 받지 않고 encoded text만 받습니다.
- 확인한 변경 파일: `src/heredoc.c`와 build source list.
- 핵심 caller → callee: later `read_heredoc` → `dequote_runtime_word` → strbuf init/append.
- parent SHA와 비교한 최소 before/after snippet:

```c
if (word[i] == LITERAL_MARK && word[i + 1] != '\0') {
    /* marker는 버리고 literal byte만 append */
    i += 2;
} else {
    /* '$'를 포함한 일반 byte를 그대로 append */
    i++;
}
```

- 해당 SHA에서 실행한 test 또는 수동 재현 결과: 실행하지 않았습니다. Exact function body와 allocation/error branches를 검사했습니다.

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
- 이 commit 직전 상태: normalized delimiter를 만들 수 있었지만 body를 line execution 동안 보관하고 redirection과 연결하는 owner가 없었습니다.
- 해결하려던 문제: `cat <<EOF <<EOF`처럼 같은 text가 반복돼도 각 syntax occurrence가 별도 body를 가져야 합니다.
- 기존 표현·실행 순서가 충분하지 않았던 이유: delimiter string을 key로 사용하면 duplicate text가 collision하고 source-order redirection identity가 사라집니다.
- 선택한 결정: `heredoc_entry`가 non-owning `const t_redir *redir` key와 owned `char *body`를 pair로 보관하고 `exec_context`가 entry list를 소유합니다.
- publish 또는 state mutation이 일어나는 지점: body는 collector local로 완성되고 entry allocation이 성공한 뒤 `entry->body`로 ownership이 이전되어 repository list에 연결됩니다.
- failure 뒤 cleanup 또는 상태: entry allocation 실패면 caller가 body를 계속 소유해 free할 수 있습니다. Repository destructor는 body를 먼저 free하고 node를 free합니다.

#### `7c9692346824`에서 확인할 실제 코드
- `src/exec_internal.h`의 execution context와 `src/heredoc.c`의 entry fields를 확인했습니다.
- lookup은 delimiter `strcmp`가 아니라 `entry->redir == redir` pointer equality를 사용합니다.
- missing lookup은 NULL 대신 empty string fallback을 반환해 redirection caller가 read-only body contract를 유지합니다.
- repository가 key로 참조하는 parsed tree보다 먼저 해제되어야 합니다.

#### 학습자가 남길 코드 증거
- entry ownership graph: `exec_context → entry node → body allocation`; `entry->redir`는 parsed tree의 non-owning pointer입니다.
- 동일 delimiter 두 개의 서로 다른 key: text가 모두 `EOF`여도 `&redir1 != &redir2`이므로 별도 entry가 선택됩니다.
- lookup return contract: matching entry의 body, 없으면 `""`; caller는 free하지 않습니다.
- repository와 parsed tree lifetime ordering: `exec_heredoc_entries_free(ctx.heredocs)`가 `free_pipeline(pipelines)`보다 먼저여야 dangling key traversal을 피합니다.
- execution context init/free 호출자: line executor가 `ctx.heredocs = NULL`로 시작하고 line execution 종료/준비 실패에서 repository destructor를 호출합니다.
- 확인한 변경 파일: `src/exec_internal.h`, `src/heredoc.c`.
- 핵심 caller → callee: preparation → `add_heredoc_entry`; redirection apply → body lookup; final cleanup → entry destructor.
- parent SHA와 비교한 최소 before/after snippet: standalone normalized string 기능 위에 redirection-identity-keyed line repository가 새로 추가됐습니다.
- 해당 SHA에서 실행한 test 또는 수동 재현 결과: 실행하지 않았습니다. Pointer-key lookup과 destructor order를 source로 확인했습니다.

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
- 이 commit 직전 상태: repository는 있었지만 parser graph를 순회해 stdin에서 body를 채우는 preparation phase가 없었습니다.
- 해결하려던 문제: line 안의 모든 pending heredoc을 lexical order로 소비하고, connector에서 skip될 command의 body도 다음 command parsing 전에 제거해야 했습니다.
- 기존 표현·실행 순서가 충분하지 않았던 이유: selected command 실행 시점에만 heredoc을 읽으면 source input 순서와 conditional gate가 뒤섞이고 body line이 다음 shell command로 해석될 수 있습니다.
- 선택한 결정: top-level preparation이 pipeline → command → redirection 순으로 전부 순회하고 각 heredoc을 delimiter까지 읽어 repository에 저장합니다.
- publish 또는 state mutation이 일어나는 지점: delimiter match/EOF까지 body buffer가 local이고 `add_heredoc_entry` 성공 뒤 repository-owned가 됩니다.
- failure 뒤 cleanup 또는 상태: allocation/read preparation failure는 partial local body를 discard하고 failure를 반환합니다. 이 SHA는 즉시 abort하므로 unread body/pending heredoc이 stdin에 남을 수 있으며 later fix 대상입니다.

#### `fc9c63a03db2`에서 확인할 실제 코드
- `exec_prepare_heredocs`의 nested source-order traversal을 확인했습니다.
- `read_heredoc`은 delimiter normalize → line read → exact `strcmp` → line+'
' append → entry publish 순서입니다.
- secondary prompt는 stdin과 stderr가 모두 tty인 interactive condition에서만 사용됩니다.
- delimiter 전 EOF는 warning을 출력하지만 collected-so-far body를 entry로 유지합니다.
- connector gate를 알기 전에 complete parsed line의 heredoc을 수집합니다.

#### 학습자가 남길 코드 증거
- 여러 heredoc의 실제 traversal order: pipeline list order, 각 pipeline의 command order, 각 command의 redirection list order입니다.
- line comparison에서 newline 제거/보존 처리: line reader가 newline 없는 logical line을 반환하고 delimiter와 exact compare하며, body line만 append 후 `\n`을 하나 추가합니다.
- stored body의 newline policy: delimiter line은 저장하지 않고 각 accepted body line 끝에 정확히 하나의 newline을 저장합니다.
- premature EOF warning과 return contract: warning 후 현재 body를 성공 결과로 publish하며 preparation 자체를 syntax failure로 만들지 않습니다.
- allocation failure의 stream position: 이미 읽은 line은 되돌릴 수 없고, immediate return 때문에 current remainder와 later delimiter가 남을 수 있습니다.
- 확인한 변경 파일: `src/heredoc.c`, `src/exec_internal.h`.
- 핵심 caller → callee: line processor/executor setup → `exec_prepare_heredocs` → `read_heredoc` → `shell_read_line`/buffer append → `add_heredoc_entry`.
- parent SHA와 비교한 최소 before/after snippet: passive repository에 graph traversal과 stdin-consuming collector가 연결됐습니다.
- 해당 SHA에서 실행한 test 또는 수동 재현 결과: 실행하지 않았습니다. `cat <<ONE <<TWO`의 traversal과 EOF branch를 source로 추적했습니다.

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
- 이 commit 직전 상태: 모든 body line이 literal로 저장됐습니다.
- 해결하려던 문제: unquoted delimiter에는 limited variable/status expansion을 적용하고, quoted delimiter에는 적용하지 않아야 했습니다.
- 기존 표현·실행 순서가 충분하지 않았던 이유: collector는 final delimiter text만 필요하다고 가정했고 quote syntax participation을 별도 field로 보존하지 않았습니다.
- 선택한 결정: encoded target에 `LITERAL_MARK`가 있으면 quoted로 간주하고, quoted branch는 raw line append, unquoted branch는 heredoc-specific `$?`/`$NAME` expander를 사용합니다.
- publish 또는 state mutation이 일어나는 지점: transformed line이 body buffer에 append되고 delimiter 종료 뒤 entry로 publish됩니다.
- failure 뒤 cleanup 또는 상태: expansion/append 실패면 partial body를 discard하고 preparation failure를 반환합니다.

#### `aeb0d6cba9c1`에서 확인할 실제 코드
- quote heuristic은 encoded delimiter에서 literal marker가 존재하는지 검사합니다.
- unquoted expander는 `$?`, valid name, unset variable, unknown/incomplete `$`를 분기합니다.
- quoted branch는 expansion helper를 거치지 않고 original line bytes를 append합니다.
- body line마다 newline 하나를 추가합니다.
- Double-quoted text는 marker 없이 저장될 수 있어 hidden assumption이 깨집니다.

#### 학습자가 남길 코드 증거
- quote heuristic의 실제 condition: target bytes 중 `LITERAL_MARK` 발견 여부입니다.
- body expansion state machine 또는 helper: `$?`는 decimal status, `$` 뒤 valid name은 environment value, unset은 empty, 그 외 `$`는 literal로 처리합니다.
- unset/unknown dollar 결과: unset valid name은 아무 byte도 append하지 않고, unknown form은 `$` 자체를 보존한 뒤 다음 byte를 normal scan합니다.
- quoted body literal path: line을 expansion helper 없이 body buffer에 append합니다.
- later fix가 필요한 hidden assumption: marker는 single-quoted literal byte를 나타낼 뿐, double quote 또는 partial double quote 참여를 항상 나타내지 않습니다.
- 확인한 변경 파일: `src/heredoc.c`.
- 핵심 caller → callee: `read_heredoc` → quote heuristic → literal append 또는 heredoc body expander → body buffer.
- parent SHA와 비교한 최소 before/after snippet: body append 전에 quoted/unquoted policy branch가 추가됐습니다.
- 해당 SHA에서 실행한 test 또는 수동 재현 결과: 실행하지 않았습니다. `$?`, `$NAME`, unset, `<<'EOF'`, `<<"EOF"`의 code path를 비교했습니다.

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
- 학습 깊이: Architecture / invariant 핵심. 변경 전 가정, failure 가능성, 결정, core code, ownership/lifecycle, follow-up을 추적합니다.

#### Source에서 확정된 변화
`<<`를 first-class token/redirection으로 만들고, 실행 전에 모든 body를 수집한 뒤 ordinary redirection traversal에서 temporary stream을 stdin에 설치합니다. Body lifetime은 parsed line execution에 한정됩니다.

#### Source가 확정한 핵심 판단
- **문제**: Heredoc requires more than recognizing `<<`: its body must be read before execution, associated with the correct parsed redirection, installed in source order, and released at the end of the line.
- **결정**: Make heredoc a first-class token and redirection type, precollect all bodies into an execution context keyed by redirection identity, dequote rather than normally expand the delimiter, and install the selected body through the ordinary redirection traversal.
- **중요한 이유**: Reusing ordered redirection application preserves interactions with incoming pipes and later input redirects. The line-scoped execution context also keeps body lifetime independent of child lifetime while retaining a stable link to parsed ownership.
- **확정된 변경 범위**: Lexer and parser support, heredoc preparation, execution-context initialization, failure cleanup, temporary-stream installation on stdin, and post-execution body release were connected into the product path.
- **프로젝트 이해에서의 위치**: This commit shows how a shell feature crosses every major phase. It is the clearest example of the repository's integration and ownership design.

#### 설계·상태 변화 기록
- 이 commit 직전 상태: collector/repository helpers는 있었지만 lexer/parser가 `<<`를 first-class redirection으로 만들고 product execution에 연결하지 않았습니다.
- 해결하려던 문제: syntax recognition, precollection, body identity/lifetime, pipe/redirection precedence, stdin installation을 한 line transaction으로 결합해야 했습니다.
- 기존 표현·실행 순서가 충분하지 않았던 이유: heredoc을 ordinary `< file`처럼 처리할 수 없고, child가 실행할 때 stdin에서 body를 읽으면 multiple/conditional ordering과 parent input stream이 깨집니다.
- 선택한 결정: `TOK_HEREDOC`/`REDIR_HEREDOC`을 추가하고 line processor가 context를 initialize해 모든 body를 먼저 수집하며, ordered redirection traversal이 repository body를 temporary stream으로 stage한 뒤 stdin에 `dup2`합니다.
- publish 또는 state mutation이 일어나는 지점: parsed redirection node와 repository entry는 preparation 성공 후 stable identity로 연결됩니다. Staging은 temporary stream을 완성한 뒤 `dup2`에서 stdin을 바꿉니다.
- failure 뒤 cleanup 또는 상태: preparation 실패는 status 1, repository free, parsed tree free로 수렴합니다. Per-redirection staging failure는 stream close 후 command redirection failure가 됩니다. 이 SHA에서는 `fflush`/rewind failure 결과를 충분히 확인하지 않습니다.

#### `d297bd2e8908`에서 확인할 실제 코드
- lexer scanner의 `<<` longest-match와 token enum, parser의 heredoc redirection type을 확인했습니다.
- line processor는 context init → all-heredoc preparation → sequence executor → repository free → parsed free 순서입니다.
- ordinary argv/redirection expansion은 heredoc delimiter를 normal word expansion에서 제외합니다.
- redirection apply는 body lookup → `tmpfile` → `fputs` → `fflush` → 당시 `rewind` → `fileno` → `dup2` → close 순서입니다.
- child는 incoming pipe를 먼저 stdin에 wiring한 뒤 ordered redirection을 적용하므로 heredoc이 pipe를 override할 수 있고, 더 뒤의 `< file`은 다시 heredoc을 override합니다.

#### 학습자가 남길 코드 증거
- `<<`의 lexer → parser → redirection type 전파: scanner의 double-character operator → `TOK_HEREDOC` → parser target consumption → `REDIR_HEREDOC` node.
- parse/precollect/execute/free lifecycle: parsed tree 생성 → `ctx.heredocs=NULL` → `exec_prepare_heredocs` → execute list with context → entry repository free → parsed hierarchy free.
- temporary stream의 acquisition과 cleanup: `tmpfile()` owner는 redirection apply local; write/position/dup success 또는 any error 뒤 `fclose`합니다.
- pipe/heredoc/later input redirect precedence 예: `producer | cat <<EOF <file`에서 pipe wiring → heredoc stdin → file stdin 순서이므로 final source는 `file`입니다.
- delimiter dequote와 body expansion 책임 분리: delimiter matching text는 `dequote_runtime_word`; body policy는 quoted heuristic과 heredoc-specific expander입니다.
- 확인한 변경 파일: `include/shell.h`, `src/token.c`, `src/parser.c`, `src/heredoc.c`, `src/redirection.c`, `src/exec.c`, `src/exec_internal.h`.
- 핵심 caller → callee: `shell_process_line` → `exec_prepare_heredocs` → list executor → child/parent redirection apply → heredoc body lookup/staging → `shell_dup2`/`dup2`.
- parent SHA와 비교한 최소 before/after snippet: independent heredoc helpers가 token/parser/product execution path와 normal redirection order에 연결됩니다.
- 해당 SHA에서 실행한 test 또는 수동 재현 결과: 실행하지 않았습니다. Exact integration diff와 function ordering을 검사했습니다.

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
- 학습 깊이: Architecture / invariant 핵심. 변경 전 가정, failure 가능성, 결정, core code, ownership/lifecycle, follow-up을 추적합니다.

#### Source에서 확정된 변화
Delimiter text에서 quote 여부를 재구성하던 heuristic을 제거하고, token이 quote syntax 참여 여부를 기록해 parser의 `heredoc_quoted` field와 collector까지 전달합니다.

#### Source가 확정한 핵심 판단
- **문제**: The runtime inferred whether a delimiter had been quoted by looking for literal markers in its text. Double-quoted and partially quoted delimiters could contain no marker, so their bodies were expanded incorrectly.
- **결정**: Record quote participation explicitly in each token, copy that provenance into heredoc redirections, and use the preserved flag independently from the dequoted delimiter text.
- **중요한 이유**: Final text and lexical provenance answer different questions. Text is needed for delimiter matching; provenance is needed to decide expansion. Reconstructing one from the other is not reliable after token normalization.
- **확정된 변경 범위**: `t_token` gained a quoted flag, word scanning set it whenever quote syntax appeared, the parser stored it as `heredoc_quoted`, and collection used that field rather than marker inspection.
- **프로젝트 이해에서의 위치**: It is the strongest root-cause correction in the semantic history and demonstrates why representation layers must preserve information needed by later phases even when that information is absent from normalized text.

#### Fix 재구성 기록
- 기존 가정: encoded target에 `LITERAL_MARK`가 있으면 quoted이고 없으면 unquoted라는 가정이었습니다.
- 실제 failure 또는 위험을 드러내는 입력·상태: `cat <<"EOF"` 또는 `cat <<E"OF"`의 normalized delimiter는 `EOF`이고 encoded text에 single-quote marker가 없을 수 있어 body의 `$HD`가 잘못 확장됩니다.
- root cause가 위치한 representation / lifecycle / ordering boundary: lexer가 quote delimiter를 제거한 뒤 final text만 보고 lexical participation을 복원하려 한 representation boundary입니다.
- 수정된 invariant 또는 decision: delimiter matching text와 quote provenance를 서로 독립된 values로 보존합니다.
- 변경 전 코드 증거: collector가 target bytes에서 marker presence를 scan해 `quoted`를 계산했습니다.
- 변경 후 코드 증거: `t_token.quoted` → heredoc parse branch의 `t_redir.heredoc_quoted` → `read_heredoc`의 policy branch로 값이 전달됩니다.
- 연결되는 regression test와 그 한계: `dce9e5c083fa`가 fully double-quoted와 partial double-quoted cases를 고정합니다. 모든 가능한 quote 조합이나 I/O failure는 다루지 않습니다.

#### `854f0f435c82`에서 확인할 실제 코드
- parent SHA의 marker scan condition을 확인했습니다.
- `include/shell.h`에서 token quoted field와 redirection heredoc field가 추가됩니다.
- `src/token.c::read_word`는 single/double quote 어느 쪽이든 quote syntax 진입 시 flag를 set합니다.
- `src/parser.c`는 heredoc operator의 target token에서만 quoted flag를 redirection field로 복사합니다.
- `src/heredoc.c`는 normalized text는 matching에, `redir->heredoc_quoted`는 body expansion decision에 사용합니다.
- Token list가 free돼도 copied redirection flag가 parsed lifetime 동안 유지됩니다.

#### 학습자가 남길 코드 증거
- 기존 가정: marker presence ≈ quote participation.
- 실제 failure input: `HD=expanded; cat <<"EOF"` body `$HD` 또는 `cat <<E"OF"` body `$HD`.
- root cause가 text normalization 이후 정보 손실인 근거: 두 inputs의 matching text는 unquoted `EOF`와 같지만 body policy는 달라야 합니다.
- token flag set → parser copy → collector branch 경로: `read_word(..., &quoted)` → token node `quoted` → heredoc target parse → `redir->heredoc_quoted` → `read_heredoc` literal/expand branch.
- 수정된 semantic invariant: quote syntax가 delimiter의 어느 segment에라도 참여하면 body expansion을 억제합니다.
- 확인한 변경 파일: `include/shell.h`, `src/token.c`, `src/parser.c`, `src/heredoc.c`.
- 핵심 caller → callee: `tokenize_line` → `parse_tokens` → `exec_prepare_heredocs` → `read_heredoc`.
- parent SHA와 비교한 최소 before/after snippet:

```c
/* before: text-derived heuristic */
quoted = contains_literal_marker(redir->target);

/* after: parser가 보존한 lexical provenance */
quoted = redir->heredoc_quoted;
```

- 해당 SHA에서 실행한 test 또는 수동 재현 결과: 실행하지 않았습니다. Exact parent/commit diff에서 field propagation과 old heuristic 제거를 확인했습니다.

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
Fully double-quoted delimiter와 unquoted/double-quoted segment가 섞인 delimiter 모두에서 final terminator는 `EOF`로 dequote되지만 body의 `$HD`는 literal이어야 함을 검증합니다.

#### Test commit 학습 기록
- 대상 production invariant: delimiter text와 quote provenance는 독립이며 quote segment가 하나라도 있으면 body expansion을 억제합니다.
- 재현하는 failure 또는 boundary: marker가 없는 double/partial quote가 old heuristic에서 unquoted로 오인되는 boundary입니다.
- 사용한 test technique: environment를 고정한 end-to-end deterministic regression입니다.
- 실제 통과하는 production code path: input/tokenize → heredoc target parse/provenance copy → precollection → normalized `EOF` match → quoted literal body → temporary stdin → `cat`.
- 이 테스트가 증명하는 것: 두 target form 모두 `EOF`로 종료되면서 body `$HD`가 environment value로 바뀌지 않고 literal로 출력됩니다.
- 이 테스트가 증명하지 않는 것: single quote, multiple heredoc, temporary stream failures, allocation cleanup 전체를 증명하지 않습니다.
- broad integration / deterministic regression / stress·probe 중 분류: 직전 root-cause fix에 대한 deterministic end-to-end regression입니다.
- 후속 변경에서 막는 회귀: token quoted field 제거, parser copy 누락, collector가 marker heuristic으로 돌아가는 변경을 잡습니다.

#### `dce9e5c083fa`에서 확인할 실제 코드
- `tests/smoke.sh`가 `HD`를 expansion과 구별되는 값으로 설정합니다.
- Exact fixtures는 fully double-quoted delimiter와 `E"OF"` 형태의 partial quote입니다.
- Expected output은 expansion 결과가 아니라 literal `$HD`이며 command status는 0입니다.
- 두 cases 모두 production lexer/parser/collector/redirection/external command 경로를 통과합니다.

#### 학습자가 남길 코드 증거
- 대상 production invariant: any quote participation suppresses body expansion while dequoted matching text remains unchanged.
- 재현하는 failure/boundary: final text가 같아 provenance를 text에서 역산할 수 없는 경우입니다.
- test technique: fixed environment + exact stdin fixture + expected stdout/status comparison.
- 통과하는 production path: `shell_process_line` → heredoc preparation → `cat` stdin installation.
- 증명하는 것: `<<"EOF"`와 `<<E"OF"` 모두 delimiter matching은 `EOF`, body policy는 literal입니다.
- 증명하지 않는 것: 모든 quote 조합, all failure paths, resource leak 부재는 증명하지 않습니다.
- 막는 후속 회귀: lexical provenance field 또는 parser copy를 제거해 text heuristic으로 돌아가는 회귀입니다.
- 확인한 변경 파일: `tests/smoke.sh`.
- 핵심 caller → callee: test shell input → product `shell_process_line` → heredoc collector/redirection → external `cat`.
- parent SHA와 비교한 최소 before/after snippet: production 변경 없이 직전 fix를 재현하는 two fixtures와 expected outputs가 추가됐습니다.
- 해당 SHA에서 실행한 test 또는 수동 재현 결과: 실행하지 않았습니다. Test script와 expected bytes/status를 검사했습니다.

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
In-memory heredoc body를 temporary input stream으로 변환할 때 body write, flush, seek, descriptor lookup이 모두 성공한 뒤에만 `dup2`를 호출하도록 오류를 전파합니다.

#### Fix 재구성 기록
- 기존 가정: `fputs`가 성공하면 body가 readable stream에 완전히 저장됐다고 보고 `fflush`와 rewind/positioning result를 사실상 best-effort로 취급했습니다.
- 실제 failure 또는 위험을 드러내는 입력·상태: buffered write 뒤 flush가 실패하거나 seek가 실패하면 empty/truncated stream 또는 end-position stream을 stdin으로 설치할 수 있습니다.
- root cause가 위치한 representation / lifecycle / ordering boundary: memory body에서 stdio stream/descriptor로 변환하는 staging boundary에서 각 intermediate operation의 success가 publish condition에 포함되지 않았습니다.
- 수정된 invariant 또는 decision: write → flush → seek-to-start → descriptor lookup이 모두 성공하기 전 stdin을 바꾸지 않습니다.
- 변경 전 코드 증거: `fflush` result가 무시되고 `rewind`는 failure를 반환하지 않는 API로 사용됐습니다.
- 변경 후 코드 증거: operation-specific wrappers의 return을 검사하고 shared `heredoc_stream_error`로 수렴한 뒤, 마지막에만 `shell_dup2(fd, STDIN_FILENO)`를 호출합니다.
- 연결되는 regression test와 그 한계: `2fbc4c73af2c`가 deterministic flush/seek failures를 검증합니다. 모든 possible write/fileno/dup2 조합을 단독 검증하지는 않습니다.

#### `9afdca85f5a5`에서 확인할 실제 코드
- `src/redirection.c`의 heredoc stream installation path를 parent SHA와 비교했습니다.
- Body write, `shell_fflush`, `shell_fseek(..., 0, SEEK_SET)`, `shell_fileno`, `shell_dup2`의 exact ordering을 확인했습니다.
- 각 checked operation은 common failure helper로 수렴합니다.
- Error helper는 `errno`를 먼저 저장하고, stdio가 errno를 남기지 않은 경우 `EIO`를 사용하며, operation name과 diagnostic을 기록합니다.
- Stream은 success/failure 모두에서 close됩니다.
- `dup2` 전까지 process stdin descriptor는 변경되지 않습니다.

#### 학습자가 남길 코드 증거
- 기존 best-effort assumption: write request 반환만으로 readable staging completion을 간주했습니다.
- 각 staging 단계의 성공 조건: `fputs != EOF`, `fflush == 0`, `fseek == 0`, `fileno >= 0`, 마지막 `dup2 >= 0`입니다.
- shared error path와 saved errno: failed operation에서 `saved_errno = errno != 0 ? errno : EIO`; close/diagnostic 때문에 원인이 덮이지 않도록 보존합니다.
- stdin publish point: 모든 staging checks 뒤 `shell_dup2(temp_fd, STDIN_FILENO)`입니다.
- 실패 뒤 following command가 가능한 resource state: temporary stream closed, stdin은 이 heredoc으로 교체되지 않으며 current command status 1로 돌아갑니다.
- 확인한 변경 파일: `src/redirection.c`, runtime wrapper declarations/definitions.
- 핵심 caller → callee: command redirection traversal → heredoc apply → body lookup → stdio staging wrappers → `shell_dup2`.
- parent SHA와 비교한 최소 before/after snippet:

```c
if (shell_fflush(stream) != 0)
    return heredoc_stream_error(stream, "fflush");
if (shell_fseek(stream, 0, SEEK_SET) != 0)
    return heredoc_stream_error(stream, "fseek");
fd = shell_fileno(stream);
if (fd < 0)
    return heredoc_stream_error(stream, "fileno");
```

- 해당 SHA에서 실행한 test 또는 수동 재현 결과: 실행하지 않았습니다. Exact diff에서 all success conditions와 stdin mutation ordering을 확인했습니다.

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
- 대상 production invariant: temporary stream staging이 완료되지 않으면 stdin publish와 command dispatch가 성공으로 진행돼서는 안 됩니다.
- 재현하는 failure 또는 boundary: body write 이후의 flush failure와 rewind/seek failure입니다.
- 사용한 test technique: `SMALL_SHELL_TESTING` runtime wrapper에서 operation별 selected call을 실패시키는 deterministic fault injection입니다.
- 실제 통과하는 production code path: heredoc precollection 성공 → command redirection apply → temporary stream body write → injected `fflush` 또는 `fseek` failure → shared staging error → current status 1 → next line.
- 이 테스트가 증명하는 것: payload가 partial/empty stdin으로 `cat`에 전달되지 않고 current command failure가 `$?`로 관찰되며 following command가 실행됩니다.
- 이 테스트가 증명하지 않는 것: write, fileno, dup2의 모든 call position과 OS별 stdio behavior를 포괄하지 않습니다.
- broad integration / deterministic regression / stress·probe 중 분류: operation-specific deterministic end-to-end regression입니다.
- 후속 변경에서 막는 회귀: `fflush`/`fseek` result 무시, error를 success로 변환, failure 뒤 loop 중단/stream leak 회귀입니다.

#### `2fbc4c73af2c`에서 확인할 실제 코드
- `src/runtime.c`의 test-only failure counter와 `shell_fflush`/`shell_fseek` wrapper를 확인했습니다.
- Wrapper는 selected occurrence에서 representative errno와 failure return을 제공합니다.
- `tests/faults.sh`의 각 case는 heredoc body를 먼저 수집한 뒤 staging operation을 실패시킵니다.
- Expected result는 current command status 1, `cat` body 출력 없음, following marker output 존재입니다.
- Temporary directory/isolated stdout·stderr files로 case side effect를 분리합니다.

#### 학습자가 남길 코드 증거
- 대상 production invariant: no stdin replacement before complete staging.
- 재현하는 failure: flush completion failure, position reset failure.
- injection technique: compile-time test branch + operation call counter + environment-selected failure occurrence.
- 통과하는 production code path: `exec_apply_redirections`/heredoc apply → checked wrappers → `heredoc_stream_error`.
- 증명하는 것: silent truncation/EOF success가 status-bearing failure로 바뀌고 shell line processing은 신뢰 가능한 stdin에서 계속됩니다.
- 증명하지 않는 것: test가 명시적으로 선택하지 않은 operations와 all platform stdio semantics입니다.
- broad integration 또는 deterministic regression 판정: deterministic regression이며 product redirection path를 end-to-end로 통과합니다.
- 확인한 변경 파일: `src/runtime.c`, `src/runtime.h`, `tests/faults.sh`.
- 핵심 caller → callee: test harness → test binary → heredoc redirection staging wrappers → current status → next command.
- parent SHA와 비교한 최소 before/after snippet: production fix 뒤 operation wrappers와 two failure fixtures/assertions가 추가됐습니다.
- 해당 SHA에서 실행한 test 또는 수동 재현 결과: 실행하지 않았습니다. Injection mechanism과 expected status/stdout continuation을 script/source로 검증했습니다.

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
Delimiter dequote, body buffer init, body expansion 등이 실패한 뒤 즉시 return하지 않고, current heredoc remainder와 later pending heredoc을 모두 delimiter까지 소비한 후 failure를 반환합니다.

#### Source가 확정한 핵심 판단
- **문제**: A heredoc preparation failure could return while body lines and later delimiters remained in stdin, causing data intended for the failed command to be parsed as future shell commands.
- **결정**: Mark preparation as failed, consume the remainder of the current and later pending heredocs without constructing bodies, and compare encoded delimiters directly when normal dequoting allocation is unavailable.
- **중요한 이유**: For a streaming command interpreter, preserving the next command boundary is as important as freeing memory. Returning an error without restoring input position would convert a local allocation failure into unintended command execution.
- **확정된 변경 범위**: The collector gained discard-through-delimiter behavior, marker-aware allocation-free delimiter matching, continued traversal of pending heredocs, and additional capacity-overflow protection.
- **프로젝트 이해에서의 위치**: This exceptional A-level commit reveals the depth of the failure model: recovery must account not only for objects and descriptors but also for semantic position in the input stream.

#### Fix 재구성 기록
- 기존 가정: local body allocation을 free하고 failure를 반환하면 heredoc preparation cleanup이 완료된다고 보았습니다.
- 실제 failure 또는 위험을 드러내는 입력·상태: `cat <<ONE <<TWO`의 first body 중 allocation/read failure 후 `ONE`, second body, `TWO`가 stdin에 남으면 shell loop가 그 lines를 commands로 실행할 수 있습니다.
- root cause가 위치한 representation / lifecycle / ordering boundary: memory ownership은 정리됐지만 stream cursor라는 외부 state가 original command boundary까지 복구되지 않았습니다.
- 수정된 invariant 또는 decision: 첫 preparation failure를 기억하고 current heredoc의 remainder와 모든 later pending heredoc을 construction 없이 delimiter까지 소비한 후에만 caller로 돌아갑니다.
- 변경 전 코드 증거: dequote/init/append failure branch가 즉시 nonzero를 return했습니다.
- 변경 후 코드 증거: `failed` state, `discard_heredoc`, allocation-free `delimiter_matches`가 추가되고 traversal은 remaining redirections까지 계속됩니다.
- 연결되는 regression test와 그 한계: `7e2fdea3affd`가 read failure recovery와 repeated read failure forced stop을 검증하고 `476b082d55c7`가 allocation positions를 sweep합니다. 복구 read 자체가 불가능하면 boundary를 보장할 수 없어 shell을 중단합니다.

#### `c30b39c0bcf8`에서 확인할 실제 코드
- Parent의 early return branches와 새 failed-mode traversal을 비교했습니다.
- `exec_prepare_heredocs`는 first failure 뒤에도 pipeline/command/redirection 순회를 계속하고 later heredoc은 `discard_heredoc`으로 처리합니다.
- Current `read_heredoc` 실패도 자신의 delimiter까지 discard하려고 시도합니다.
- `delimiter_matches`는 normal dequote allocation 없이 encoded target의 marker를 건너뛰며 exact line length/content를 비교합니다.
- Body builder capacity growth에 `SIZE_MAX / 2` guard가 추가됩니다.
- Failed mode에서는 body entry를 publish하지 않습니다.

#### 학습자가 남길 코드 증거
- 기존 가정: heap rollback만 완료하면 command transaction이 끝난다는 가정입니다.
- 실제 위험: unread body가 command로 재해석되는 입력 예: `cat <<EOF`, body `echo unintended`, delimiter `EOF`, following `echo safe`에서 failure 뒤 body가 top-level command가 될 수 있습니다.
- root cause: failure return과 stream position 불일치입니다.
- failed mode의 traversal: failure flag set → current remainder discard → outer traversal 계속 → each pending heredoc discard → final nonzero return.
- allocation-free delimiter matching: encoded target의 marker byte는 skip하고 following literal byte와 input line을 직접 비교합니다.
- 복구 완료 시 반환 status와 next input position: preparation returns failure/status 1이며 stdin은 모든 pending heredoc delimiter 뒤, 즉 다음 top-level command 시작에 위치합니다.
- 확인한 변경 파일: `src/heredoc.c`.
- 핵심 caller → callee: `exec_prepare_heredocs` → `read_heredoc` or `discard_heredoc` → `delimiter_matches`/`shell_read_line`.
- parent SHA와 비교한 최소 before/after snippet:

```text
before: failure → free partial body → return immediately
 after: failure → failed=1 → discard current/later heredocs → return failure
```

- 해당 SHA에서 실행한 test 또는 수동 재현 결과: 실행하지 않았습니다. Exact diff에서 failure flag, traversal continuation, no-publish behavior를 확인했습니다.

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
Low-level read/write failure를 주입해 top-level input, builtin output, heredoc collection의 서로 다른 recovery scope를 검증합니다. Heredoc read failure는 boundary를 복구하면 continuation, recovery read까지 반복 실패하면 shell stop이어야 합니다.

#### Test commit 학습 기록
- 대상 production invariant: I/O failure 뒤에도 status뿐 아니라 다음 input의 의미가 신뢰 가능해야 하며, 신뢰할 수 없으면 shell이 종료돼야 합니다.
- 재현하는 failure 또는 boundary: top-level command read, builtin write, heredoc body read, recovery discard read의 failures입니다.
- 사용한 test technique: runtime read/write wrappers의 call-index와 repeat mode를 이용한 deterministic failure injection입니다.
- 실제 통과하는 production code path: input loop reader, builtin output helper, `read_heredoc`, `discard_heredoc`, `shell->running`/process termination branches입니다.
- 이 테스트가 증명하는 것: top-level unread buffer가 실행되지 않고, builtin write failure는 status 1로 관찰되며, one-shot heredoc read failure는 delimiter recovery 후 continuation하고, repeated recovery failure는 residual input을 실행하지 않고 stop합니다.
- 이 테스트가 증명하지 않는 것: 모든 libc buffering/platform interaction, allocation failure 전체, descriptor leak 전체는 증명하지 않습니다.
- broad integration / deterministic regression / stress·probe 중 분류: 여러 recovery scope를 분리한 deterministic I/O failure regression suite입니다.
- 후속 변경에서 막는 회귀: recoverable failure에서 needless stop, unrecoverable failure에서 unsafe continuation, body line command execution, write failure status loss를 막습니다.

#### `7e2fdea3affd`에서 확인할 실제 코드
- `src/runtime.c`의 read/write operation counters, selected occurrence, repeat-mode branch를 확인했습니다.
- Top-level read failure fixture는 buffered commands의 stdout이 비어 있고 process status 1이어야 합니다.
- Builtin write failure fixture는 next line의 `$?`가 1임을 관찰합니다.
- Heredoc one-shot read failure는 `discard_heredoc`을 통과한 뒤 following command marker를 출력합니다.
- Repeated read failure는 recovery도 실패해 shell을 중단하고 residual body/following marker를 출력하지 않습니다.
- Tests는 status, stdout, stderr/diagnostic, continuation을 별도 assertions로 다룹니다.

#### 학습자가 남길 코드 증거
- 대상 production invariant: continue only after reliable command boundary restoration.
- 각 failure의 recovery scope: top-level read는 process input trust 상실로 stop; builtin write는 current command failure로 continue; heredoc read는 discard 성공 시 continue; discard read도 실패하면 stop입니다.
- injection technique과 call position: test build wrapper, operation-specific call counter, exact selected call, optional repeat-from-position mode입니다.
- heredoc recovery production path: body read failure → failed state → `discard_heredoc` → delimiter reached → preparation status 1 → next top-level command.
- continuation이 허용되는 조건: current/pending delimiter를 모두 소비하고 stdin cursor가 next command boundary에 도달한 경우입니다.
- forced stop 조건: repeated read failure로 recovery cursor를 신뢰할 수 없거나 top-level input 자체가 실패한 경우입니다.
- 증명하지 않는 failure class: arbitrary kernel faults, all write sites, memory failure combinations입니다.
- 확인한 변경 파일: `src/runtime.c`, `src/runtime.h`, `src/input.c`, `src/heredoc.c`, `tests/faults.sh`.
- 핵심 caller → callee: harness → test binary wrappers → input/builtin/heredoc production paths → status/running decisions.
- parent SHA와 비교한 최소 before/after snippet: process/FD wrappers가 read/write까지 확장되고 recovery/forced-stop fixtures가 추가됩니다.
- 해당 SHA에서 실행한 test 또는 수동 재현 결과: 실행하지 않았습니다. Injection state, fixtures, expected status/output와 production branches를 source로 연결했습니다.

#### 보장 범위
- 이 commit이 보장하는 것: I/O failure status뿐 아니라 future input interpretation의 신뢰성까지 regression으로 고정합니다.
- 아직 보장하지 않는 것: allocation failure sweep 전체를 대체하지 않으며, test 범위는 주입된 read/write paths에 한정됩니다.

#### Thread 내 다음 연결
Heredoc Thread의 마지막 검증입니다. 동일 input-boundary invariant는 allocation Thread에서 다른 failure source로 다시 학습합니다.

## 6. Invariant ledger

Source가 명시한 invariant와 engineering difficulty를 유지하고 exact code 근거를 채웠습니다.

| Invariant | Source에서 확정된 의미 | 처음 도입/표현 | 강화·복구·검증 | 학습자가 확인한 코드 근거 |
| --- | --- | --- | --- | --- |
| Delimiter text and quote provenance remain independent. | delimiter는 비교를 위해 dequote할 수 있지만, body expansion 여부를 결정할 quote provenance는 별도로 남아야 합니다. | `aeb0d6cba9c1`의 초기 policy | `854f0f435c82`에서 explicit flag로 복구, `dce9e5c083fa`로 고정 | `read_word`의 token `quoted` set → parser의 `heredoc_quoted` copy → `read_heredoc` policy branch. Matching은 별도 normalized delimiter를 사용합니다. |
| Heredoc bodies are keyed by owning redirection identity. | body는 delimiter text가 아니라 해당 parsed redirection의 주소로 식별됩니다. | `7c9692346824` | `d297bd2e8908`에서 normal redirection path와 통합 | `heredoc_entry.redir` pointer equality lookup; repository entry/body는 parsed tree보다 먼저 free됩니다. |
| Temporary-stream staging must complete before stdin replacement. | body write, flush, seek, descriptor 획득, duplication 실패는 성공한 command input으로 보고될 수 없습니다. | `d297bd2e8908`의 temp-stream 설치 | `9afdca85f5a5`, `2fbc4c73af2c` | `fputs` → checked `fflush` → checked `fseek` → checked `fileno` → final `dup2`; failure injection은 payload suppression/status 1/continuation을 검사합니다. |
| Preparation failure must preserve the next command boundary. | heredoc 준비 실패가 body data를 이후 shell command로 재해석하게 해서는 안 됩니다. | `fc9c63a03db2`의 ordered input consumption | `c30b39c0bcf8`, `7e2fdea3affd` | collector-wide failed state, allocation-free delimiter match, discard traversal; recovery read 반복 실패면 unsafe continuation 대신 stop합니다. |

### Ledger 작성 시 확인한 것

- Body repository field는 `7c969...`에서 생기고 product path invariant는 `d297...`에서 완성됩니다.
- `854f...`는 prior policy를 삭제한 것이 아니라 final text에 없던 lexical provenance를 별도 field로 보강합니다.
- Test evidence는 각각 quote, staging, stream recovery production path와 연결했습니다.
- Normal, staging failure, recoverable preparation failure는 entry/stream/local buffers가 해제되고 신뢰 가능한 stdin으로 수렴합니다. Recovery 자체 실패는 shell stop으로 수렴합니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 문제 | Feature / 기존 상태 | Fix 또는 결정 | Regression / 확인 방법 | 학습자 코드 근거 |
| --- | --- | --- | --- | --- |
| literal marker 존재 여부만으로 quote를 추정하면 double/partial quote를 놓침 | `aeb0d6cba9c1`, `d297bd2e8908`의 text-based heuristic | `854f0f435c82` — token quote participation을 `heredoc_quoted`까지 전달 | `dce9e5c083fa` — double-quoted와 partially quoted delimiter deterministic regression | Token quoted flag set, parser field copy, collector branch와 two literal `$HD` fixtures를 연결했습니다. |
| temp body write 뒤 flush/seek 실패를 무시하면 truncated input 또는 EOF가 설치됨 | `d297bd2e8908`의 temporary-stream installation | `9afdca85f5a5` — write/flush/seek/fileno 전체 성공 뒤에만 dup2 | `2fbc4c73af2c` — injected flush/seek failure, status 1, no payload, continuation | `src/redirection.c` staging order와 `src/runtime.c` wrappers, `tests/faults.sh` expected outputs를 연결했습니다. |
| 준비 실패 뒤 unread body와 later delimiter가 stdin에 남아 command로 실행될 수 있음 | `fc9c63a03db2`의 early-abort path | `c30b39c0bcf8` — current와 pending heredoc을 delimiter까지 discard | `7e2fdea3affd` — read failure recovery와 recovery read 반복 실패 시 forced stop | `failed` traversal, `discard_heredoc`, `delimiter_matches`, next marker/stop assertions를 연결했습니다. |

## 8. Ownership / state / responsibility 변화

| 대상 | Owner / 책임 주체 | 책임 종료 시점 | 해당 SHA에서 확인할 내용 | 학습자 기록 |
| --- | --- | --- | --- | --- |
| encoded delimiter string | parsed redirection | parsed tree cleanup | ordinary word expansion과 분리되는 지점 확인 | Parser-owned target은 matching normalization source로 유지되고 heredoc normal expansion에서 제외됩니다. |
| normalized delimiter | collector local owner | 해당 heredoc collection 완료 | allocation·dequote failure cleanup 기록 | `dequote_runtime_word` 반환을 local이 free하며 entry에는 저장하지 않습니다. Failure면 partial buffer만 해제합니다. |
| body buffer | collector → heredoc repository entry | execution context cleanup | partial buffer discard와 successful transfer 구분 | Delimiter/EOF까지 local; entry allocation/list append 성공 시 body pointer ownership 이전; failure면 local discard. |
| redirection identity pointer | repository key로 참조 | repository가 parsed tree보다 먼저 해제되어야 함 | 실제 destructor order 확인 | Entry는 pointer를 free하지 않으며 line cleanup이 repository를 먼저 해제한 뒤 `free_pipeline`을 호출합니다. |
| temporary stream / fd | redirection application | dup2 성공 또는 error path | write·flush·seek·fileno·dup2·fclose 순서 기록 | Local `FILE *` owner가 all stages를 관리하고 success/error 모두 `fclose`; stdin은 final dup에서만 mutate됩니다. |
| stdin stream position | collector/recovery path | 다음 command boundary 확보 시점 | 복구 실패 시 `running` 또는 종료 결정 기록 | Discard가 all delimiters를 소비하면 continue 가능; read가 반복 실패해 cursor 불명확하면 shell을 stop합니다. |

## 9. Thread 최종 상태

Delimiter 관련 state는 다음처럼 분리됩니다.

| State | 용도 | Owner/lifetime |
| --- | --- | --- |
| encoded target | parser representation, literal marker 보존 | `t_redir`, line parse lifetime |
| normalized delimiter text | exact input-line matching | collector local |
| `heredoc_quoted` | body expansion policy | copied parser field |
| body bytes | selected command stdin material | execution-context repository |
| redirection node address | body identity key | parsed tree; repository가 non-owning reference |

모든 heredoc은 connector gate 전에 source order로 수집됩니다. Child pipe wiring이 먼저, ordered redirection apply가 다음이므로 later redirection이 earlier stdin source를 override합니다. Normal collection은 repository cleanup, staging failure는 unchanged stdin/current status 1, recoverable preparation failure는 delimiter discard 후 status 1, recovery read failure는 shell stop으로 끝납니다.

### 최종 상태 기록

- 최종적으로 유지되는 data/resource ownership: parsed redirection은 encoded text와 provenance를, line context는 identity-keyed body entries를, redirection apply local은 temporary stream을 소유합니다.
- 최종적으로 보장되는 execution 또는 recovery rule: all body input은 execution 전 source order로 소비되고, complete staging 후에만 stdin이 바뀌며, preparation failure도 next command boundary를 복구한 경우에만 continuation합니다.
- Thread가 해결한 가장 어려운 failure: 이미 stdin 일부를 소비한 뒤 allocation/read failure가 발생했을 때 body를 future command로 실행하지 않도록 semantic cursor를 복구하는 문제입니다.
- Thread 밖에 남아 있는 보장 범위: tests가 주입하지 않은 모든 OS/stdio failure 조합, descendant process lifecycle, allocator implementation 전체는 다른 Thread 또는 범위 밖입니다.

## 10. 최종 architecture 또는 execution flow 정리

```text
[parsed redirection: encoded target + heredoc_quoted + stable node identity]
  ↓ exec_prepare_heredocs: pipeline → command → redirection source-order traversal
[dequote_runtime_word / exact line matching]
  ↓ redir->heredoc_quoted branch
[literal line 또는 heredoc-specific $NAME/$? expansion]
  ↓ add_heredoc_entry(redir pointer, owned body)
[execution context repository]
  ↓ selected command's ordered redirection traversal
[tmpfile → write → checked flush → checked seek → checked descriptor → dup2]
  ↓
[command stdin]
  ↓ close temp stream; execute; free repository before parsed tree
[next command boundary recovered, 또는 recovery 불가 시 shell stopped]
```

### 코드 기반 최종 설명

- 핵심 entry function: `exec_prepare_heredocs`와 heredoc redirection apply helper입니다.
- 주요 caller → callee chain: `shell_process_line` → `exec_prepare_heredocs` → `read_heredoc`/`discard_heredoc` → repository → list executor → `exec_apply_redirections` → heredoc staging → `shell_dup2`.
- state mutation 순서: token quote flag → parsed `heredoc_quoted`; body local construction → repository publish; staging complete → stdin replace; status/running update; repository/tree cleanup.
- ownership transfer 순서: normalized delimiter remains local; body buffer local → entry; entry body freed by context; temporary stream remains local and is always closed.
- failure convergence path: semantic quote error is prevented by explicit provenance; staging failure closes stream without stdin publish; preparation failure discards current/later bodies; recovery failure stops shell.
- regression evidence: `dce9e5c083fa`, `2fbc4c73af2c`, `7e2fdea3affd`의 test implementation과 production path를 연결했습니다. 실제 test command는 실행하지 않았습니다.

## 11. 학습 완료 자가 점검

- [x] 모든 commit을 exact SHA에서 확인했고 final HEAD를 소급하지 않았습니다.
- [x] Commit map의 SHA, subject, importance, tags, order를 변경하지 않았습니다.
- [x] S commit은 problem, prior state, failure possibility, decision, core code, ownership/lifecycle, follow-up을 설명했습니다.
- [x] A commit은 subsystem boundary 또는 failure path와 실제 핵심 code를 설명했습니다.
- [x] B commit은 Thread 내 구현 역할과 state/ownership 변화를 설명했습니다.
- [x] Fix commit은 기존 가정 → failure → root cause → 수정 invariant → code → regression 순으로 연결했습니다.
- [x] Test commit은 invariant, failure, technique, production path, prove/not prove를 구분했습니다.
- [x] Invariant ledger의 각 행에 실제 file/function/branch 근거가 있습니다.
- [x] 정상·실패 경로 모두에서 resource와 partial object의 terminal owner를 설명했습니다.
- [x] 이 Thread의 설계 → 구현 → 실패 → 수정 → 검증 흐름을 commit history 순서로 재구성했습니다.
