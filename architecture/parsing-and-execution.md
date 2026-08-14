# 해석과 실행 단계

이 문서는 **현재 `main`이 사용하는 제품 경로**를 설명한다. 학습용으로 헤더에
남은 `t_sequence`와 executor hook은 마지막 절에서 별도 seam으로 구분한다.

## 제품 진입점부터 상태 갱신까지

```text
main
  -> shell_loop
     -> shell_read_line
     -> shell_process_line
        -> tokenize_line
        -> parse_tokens                    : t_pipeline * 목록
        -> exec_prepare_heredocs           : 모든 pipeline의 << 선수집
        -> execute_pipeline_list_ctx
           -> connector 조건 판정
           -> expand_one_pipeline          : 통과한 pipeline만, 현재 last_status로
           -> parent builtin 또는 fork/exec
           -> shell.last_status 갱신
        -> heredoc entry와 pipeline 목록 해제
```

`shell_loop`는 입력 줄을 소유했다가 `shell_process_line`이 돌아오면 해제한다.
tokenizer가 만든 token 목록은 parser 호출 직후 해제되고, parser가 복사해 만든
pipeline·command·redirection 노드는 한 줄 실행 전체가 끝날 때까지 살아 있다.
heredoc entry는 `t_redir` 주소를 key로 삼으므로 pipeline보다 먼저 해제한다.

## lexer가 보존하는 문법 정보

`src/token.c`의 공백 집합은 `' '`, `\t`, `\n`, `\r`, `\v`, `\f`다. `|`,
`||`, `&&`, `;`, `<`, `>`, `<<`, `>>`는 단어 밖에서 operator가 되고 단독
`&`는 즉시 오류가 된다. 따옴표가 닫히지 않아도 token 단계에서 실패한다.

작은따옴표와 큰따옴표 문자는 결과에서 빠지지만 효과는 같지 않다.

- 작은따옴표 안 각 문자는 내부 `LITERAL_MARK` 뒤에 저장된다.
- 큰따옴표 안 문자는 marker 없이 저장되어 `$NAME`과 `$?`가 나중에 확장된다.
- `t_token.quoted`는 단어 일부라도 인용되었는지를 별도로 기록한다.
- 인용 조각과 비인용 조각은 공백이나 operator가 없으면 하나의 word로 합쳐진다.

`LITERAL_MARK`는 heredoc 전용 표시가 아니다. parser가 token text를 복사하므로
일반 argv와 모든 redirection target에도 전달된다. `expand_word`는 일반 argv와
`<`·`>`·`>>` 대상에서 marker 다음 문자를 literal로 복사한다. 제품의 초기
heredoc 수집은 `read_heredoc -> dequote_runtime_word`에서 delimiter marker를
제거한다. 나중에 해당 pipeline을 확장할 때 REDIR_HEREDOC 분기의 `dequote_word`는
이미 정규화된 target을 다시 통과한다. 반면 dormant sequence expansion seam을
직접 호출하면 `dequote_word`가 최초 제거 함수가 될 수 있다.
`t_token.quoted` 비트만 heredoc의 `heredoc_quoted`로 제한해 전달한다.

token word와 확장 결과는 `src/string_builder.c`의 가변 버퍼로 조립한다. 용량은
필요할 때 기하급수적으로 늘어나므로 문자마다 이전 문자열 전체를 다시 복사하지
않는다. 초기화·증설 실패는 부분 버퍼를 해제하고 현재 명령의 오류로 전파한다.

## parser가 pipeline 우선순위를 만든다

parser의 실제 결과는 `t_pipeline *` 연결 리스트다.

```text
t_pipeline ─next──> t_pipeline
    | next_op           |
    v                   v
t_command ─next──> t_command
    | argv
    `-> t_redir ─next──> t_redir
```

`|`를 만나면 현재 command를 같은 pipeline에 붙인다. `;`, `&&`, `||`를 만나면
pipeline을 닫고 그 connector를 현재 노드의 `next_op`에 둔다. 따라서 pipeline이
connector보다 우선하고, 세 connector는 같은 우선순위로 왼쪽 결합한다. 예를
들어 `true || false && echo yes`는 `(true || false) && echo yes`처럼 진행한다.
건너뛴 pipeline도 자신의 `next_op`를 다음 gate로 넘기므로 이 결합 규칙이
유지된다.

parser는 빈 pipe 양쪽, 시작 connector, 연속 connector, 대상 없는 redirection,
끝의 `&&`·`||`를 거절한다. 끝의 `;`는 직전 pipeline의 `next_op`를
`CONN_NONE`으로 바꿔 허용한다. redirection만 있는 command는 비어 있다고
판정하지 않으므로 유효하다. 이 단계에서는 `open`, `pipe`, `fork`, `chdir`를
호출하지 않아 뒤쪽 구문 오류가 앞쪽 파일 효과를 만들지 않는다.

## heredoc 선수집과 일반 단어 지연 확장

구문이 완성되면 `exec_prepare_heredocs`가 **조건으로 건너뛸 pipeline까지 포함해**
모든 command와 redirection을 입력 순서대로 순회한다. skipped branch의 본문을
남겨 두면 다음 명령 줄로 오인되기 때문이다. 본문은 메모리 buffer에 모아
execution context가 소유한다.

delimiter는 marker를 제거해 비교하되 변수 확장하지 않는다. delimiter 단어에
인용이 하나라도 있으면 본문을 그대로 저장하고, 전혀 인용하지 않았으면 본문의
`$NAME`과 `$?`만 확장한다. 이 확장은 pipeline 실행 전 선수집 시점에 일어나므로
한 줄의 모든 heredoc은 그 줄이 시작할 때의 환경과 `last_status`를 본다. 뒤의
pipeline이 앞 pipeline의 변경 상태를 heredoc 본문에서 보는 구조가 아니다.

반면 일반 argv와 non-heredoc target은 connector 조건을 통과한 pipeline 하나만
`expand_one_pipeline`에서 확장한다. 바로 전에 실제 실행된 pipeline이 갱신한
환경과 `last_status`를 사용하며, skipped pipeline은 확장조차 하지 않는다.
지원하는 치환은 `$?`와 `[A-Za-z_][A-Za-z0-9_]*` 형태의 이름뿐이다. unset은 빈
문자열이 되고 field splitting, glob, command substitution은 뒤따르지 않는다.
빈 결과도 argv에서는 하나의 빈 argument로 남고 redirection에서는 빈 path로
`open("")`을 시도한다. POSIX shell의 field 제거·ambiguous redirect 판정은 없다.

## 실행 선택과 외부 효과

명령 하나인 pipeline에서 argv가 없거나 일곱 builtin 중 하나이면 부모 경로다.
그 외에는 command마다 자식을 만들고 pipeline을 구성한다. 따라서 단독 `echo`,
`pwd`, `env`도 상태 변경 여부와 무관하게 부모에서 실행한다. pipeline 안의 모든
builtin은 자식 복사본에서 실행된다.

redirection은 argv 확장 뒤 실제 실행 경로에서 왼쪽부터 적용한다. 그때부터 파일
생성·truncate, `chdir`, 환경 변경, 외부 프로그램 실행 같은 되돌릴 수 없는
효과가 생긴다. 준비 단계가 성공했다는 사실은 이후 효과의 원자성을 뜻하지 않는다.

## `t_sequence`와 hook은 현재 미사용 seam이다

`include/shell.h`에는 `t_sequence`, `shell_parse_line`,
`shell_expand_sequence`, `shell_execute_sequence`와 `t_executor_hooks`가
선언되어 있다. 이 코드는 구조·확장·executor를 독립 호출하기 위한 source-level
seam이지만 현재 `main`, `shell_loop`, `shell_process_line`은 호출하지 않는다.
`execute_pipeline_list`라는 public-header wrapper도 현재 제품 call site가 없으며
heredoc entry를 준비하지 않은 빈 context로 실행한다.

특히 `shell_expand_sequence`는 목록 전체를 한 번에 확장하고 hook executor에는
현재 제품의 heredoc 선수집과 fd 실행기가 결합되지 않는다. 따라서 이 API를
제품 CLI의 실행 경로라고 설명하거나, hook 동작을 현재 셸 의미의 보장으로
간주해서는 안 된다.

`shell_parse_line`은 오류 문자열을 받지 않는 호출에도 내부 error slot을 사용한다.
따라서 `error == NULL`이어도 미종결 인용이나 잘못된 pipeline을 빈 성공 결과로
오인하지 않고 1을 반환한다. 이 source-level 계약은 `tests/parser_api.c`가
별도 실행 파일로 검증한다.
