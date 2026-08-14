# 셸 의미와 오류 경계

이 문서는 현재 CLI가 보존하는 상태와 복구 단위, 그리고 POSIX shell처럼 보이지만
현재 제품이 제공하지 않는 signal·job-control 의미를 고정한다.

## 부모에 남는 상태

`t_shell`이 다음 명령으로 넘기는 값은 환경 연결 리스트, `last_status`,
`running`이다. 모든 일곱 builtin은 단독 pipeline이면 부모에서 실행한다.

| builtin | 핵심 계약 | 부분 효과와 제한 |
| --- | --- | --- |
| `echo` | 연속된 `-n`, `-nn...`를 newline 억제로 처리 | `write` 실패 시 1 |
| `pwd` | `getcwd(NULL, 0)` 결과 출력 | 삭제되거나 접근 불가한 cwd에서는 실패 |
| `cd` | 인자 없음은 `HOME`, `-`는 `OLDPWD`, 최대 한 인자 | `chdir` 뒤 `PWD`/`OLDPWD` 갱신·출력이 실패해도 directory는 복구하지 않음 |
| `env` | 인자 없이 exported node를 순서대로 출력 | 인자가 있으면 1 |
| `export` | `NAME` 또는 `NAME=value`, 인자 없음은 `declare -x` 형태 | 여러 인자는 비원자적이며 앞 성공이 남음 |
| `unset` | key와 첫 일치 node 제거 | 이름 검증 없이 없는 key도 성공 |
| `exit` | 인자 없음은 현재 상태, 숫자는 하위 8비트 | 잘못된 숫자는 2로 종료, 유효 숫자 뒤 추가 인자는 1이고 계속 실행 |

같은 builtin도 pipeline 안에서는 자식의 `t_shell`과 환경 복사본만 바꾼다.
`exit | cat`이 부모 loop를 끝내거나 `export X=1 | cat`이 다음 줄 환경을 바꾸지
않는 이유다.

`cd`의 `getcwd(NULL, 0)`가 `chdir` 전후에 실패하면 현재 코드는 해당 환경
갱신을 건너뛴다. `env_set`이나 `cd -` 출력 실패는 status 1로 만들지만,
`getcwd`가 NULL이라는 사실만으로는 반드시 1이 되지 않는다. 성공한 directory
변경과 `PWD` 문자열이 어긋날 수 있는 한계다.

## 환경 연결 리스트의 정확한 단위

시작 `envp`의 `KEY=value` 항목은 순서대로 새 node가 된다. duplicate key를
정규화하지 않아 `env_get`, `env_set`, `env_unset`은 첫 일치 node를 대상으로
하고 외부 실행용 배열에는 exported duplicate가 다시 들어갈 수 있다. 일반적인
프로세스 환경이 key를 유일하게 준다는 관행을 넘어선 duplicate 의미는 보장하지
않는다.

한 기존 key 갱신은 새 value 복사를 성공시킨 뒤 이전 문자열을 해제한다. 그
할당 하나가 실패하면 이전 값은 남는다. 하지만 `export A=1 B=2`의 A가 성공한
뒤 B가 invalid이거나 할당 실패면 A를 되돌리지 않는다. `cd`도 `chdir`가 먼저라
후속 `getcwd`·환경 갱신 실패와 하나의 원자 연산이 아니다.

외부 command 직전에 exported node를 새 `char **`로 직렬화하고 전역 `environ`에
연결한 뒤 `execvp`를 호출한다. PATH 검색 규칙은 자체 구현하지 않고 `execvp`에
위임한다.

## connector와 직전 상태

pipeline이 실제 실행될지는 이전 pipeline의 `next_op`와 현재 `last_status`가
결정한다.

- `CONN_AND`: 현재 상태가 0일 때만 실행
- `CONN_OR`: 현재 상태가 0이 아닐 때만 실행
- `CONN_SEQ`와 `CONN_NONE`: 실행

skipped pipeline은 상태를 갱신하지 않지만 자신의 connector는 다음 판정에
사용된다. 이것이 `;`, `&&`, `||`의 같은 우선순위·왼쪽 결합을 구현한다. 실행할
pipeline은 판정 뒤에야 argv와 일반 redirection target을 확장하므로 `$?`는
바로 앞에서 실제로 실행한 결과를 본다.

## 상태 값의 두 경계

| 내부 상태 | 현재 코드가 만드는 대표 경로 |
| --- | --- |
| `0` | command/builtin 성공 |
| `1` | 내부 할당·입력·pipe/fork/wait/fd/redirection 실패, 일반 builtin 실패 |
| `2` | invalid numeric `exit` |
| `126` | `execvp`가 돌아왔고 `errno != ENOENT` |
| `127` | `execvp`가 돌아왔고 `errno == ENOENT` |
| `128 + signal` | 마지막 자식의 `waitpid` 상태가 `WIFSIGNALED` |
| `0..255` | 정상 종료한 마지막 자식의 `WEXITSTATUS`, 또는 parent `exit` 결과 |
| `258` | allocation failure가 아닌 lexer/parser 오류 |

126/127은 현재 코드의 직접 errno 분류다. `ENOENT`가 PATH에서 이름을 찾지 못한
경우뿐 아니라 script interpreter나 path component 부재에서도 나올 수 있으므로
더 정교한 shell 진단을 증명하지 않는다.

1·2·126·127·`128 + signal`은 이 셸 자체 경로가 선택하는 관례적 값이지 서로
겹치지 않는 tagged encoding이 아니다. 정상 종료한 외부 program도 같은
`WEXITSTATUS`를 반환할 수 있다. 따라서 저장된 숫자만으로 자식이 signal로
종료했는지, `execvp`가 실패했는지, program이 스스로 그 값을 반환했는지
복원할 수 없다.

구문 오류 상태 258은 loop 안에서 그대로 남아 다음 줄의 `$?`, 인자 없는
`exit`, EOF가 읽을 수 있다. 하지만 오류가 난 줄은 실행 전체를 중단하고 새 줄의
connector 평가는 항상 `previous = CONN_NONE`에서 시작하므로, 258이 다음 줄의
`&&`·`||` gate에 직접 이어지는 것은 아니다. `main`은 최종 상태에 `& 0xff`를
적용하므로 바로 EOF면 운영체제 상태는 2다. 반대로 구문 오류 뒤 성공한
`echo $?`는 last status를 0으로 다시 바꾸므로 최종 process status도 0이다.
빈 줄은 기존 상태를 보존한다.

## 실패 단계별 복구 단위

| 실패 시점 | 직접 정리·상태 | 되돌리지 않는 것 |
| --- | --- | --- |
| token/parser | 중간 node 전부 free. 공개 `shell_parse_line`은 진단 포인터 유무와 관계없이 1, CLI의 비할당 문법 오류는 258 | 아직 외부 효과 없음 |
| heredoc 선수집 | 확보한 body/entry free, 남은 delimiter 소비 시도, 1 | 이미 소비한 stdin |
| heredoc 실행 저장 | 임시 stream을 닫고 해당 command 실행을 생략, 1 | 앞 redirection 파일 효과 |
| pipeline 확장 | pipeline 전체는 나중에 free, 1 | 앞 pipeline의 환경·파일·외부 효과 |
| pipe 준비 | 열린 pipe close, 배열 free, 1 | 앞 pipeline 효과 |
| 일부 fork | pipe close, 직접 자식 kill/wait 시도, 1 | 이미 실행된 자식·grandchild 효과 |
| child redirection | 해당 자식 `_exit(1)` | 앞 redirection 파일 효과, 형제 실행 |
| parent redirection | builtin 생략, stdio 복원 시도, 1 | 생성·truncate된 파일 |
| stdio 복원 지속 실패 | 저장 fd close, `running = 0`, 1 | 이미 바뀐 stdio와 builtin 효과 |

heredoc body 할당 실패 일부 경로는 현재 delimiter까지 버리기 위해
`discard_heredoc`을 호출하지만 그 discard 자체의 실패를 무시한다. input read
실패 뒤 discard도 실패한 경로는 `running = 0`으로 바꾼다. 두 오류가 겹치면
다음 명령 경계를 복구한다고 일반화할 수 없다.

파일 생성·truncate, `chdir`, 앞에서 성공한 export 인자, fork 뒤 외부 프로그램의
파일·네트워크 효과는 transaction 대상이 아니다.

## 부분 `write`와 `SIGPIPE`

제품의 builtin 출력 helper는 짧은 양수 `write`를 누적하고 `EINTR`을 재시도하며
0은 `EIO`로 바꾼다. 그러나 제품은 `SIGPIPE` disposition을 바꾸지 않는다.
`SIGPIPE`가 block되지 않았고 disposition이 기본이면 깨진 pipe에 쓰는 부모 또는
자식은 helper가 1을 반환하기 전에 process가 종료될 수 있다. signal을 무시하거나
복귀하는 handler로 처리한 경우, 또는 signal을 block한 경우에는 `EPIPE` 오류
경로를 관찰할 수 있다. block한 signal은 pending 상태로 남아 나중에 unblock할
때 전달될 수 있다. 이 disposition과 mask 중 어느 것도 제품이 설정하지 않는다.

## 대화형 판정은 signal 정책이 아니다

`shell_loop`와 heredoc은 stdin과 stderr가 모두 terminal인지 확인해 prompt와
Readline 사용 여부만 정한다. 제품 source에는 `sigaction`, signal mask,
`setpgid`, `tcsetpgrp`가 없다.

- 부모가 `SIGINT`를 받아도 last status 130으로 복구하고 prompt를 다시 내는
  경로가 없다.
- heredoc은 부모가 직접 읽으므로 기본 disposition의 `SIGINT`는 셸 전체를 끝낼
  수 있다.
- `128 + signal`은 셸이 살아서 **기다린 자식**의 종료를 변환한 값일 뿐 부모
  signal 복구가 아니다.
- job별 process group과 foreground terminal 인계가 없으므로 대화형 job control을
  제공하지 않는다.

`tests/timeout_runner.c`의 `sigaction`, signal mask, `setpgid`, group kill은
별도 테스트 실행 파일에만 있다. 이를 제품 기능의 간접 구현으로 읽어서는 안 된다.

## 언어와 운영체제 경계

Makefile은 C99로 컴파일하지만 실제 셸 기능은 `read`, `write`, `pipe`, `fork`,
`dup`, `dup2`, `open`, `waitpid`, `kill`, `execvp`, `isatty`, `tmpfile`과
Unix fd/process model에 의존한다. `_POSIX_C_SOURCE 200809L`를 지정한 모듈도
있다. 따라서 “C 언어만으로 동작하는 portable shell”이 아니라 C99로 작성한
POSIX 프로그램이다. 선택적 Readline은 이 경계 위의 별도 UI 의존성이다.
