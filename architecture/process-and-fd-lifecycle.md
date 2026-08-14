# 프로세스와 파일 디스크립터 수명

이 문서는 현재 `src/exec.c`, `src/redirection.c`, `src/heredoc.c`가 소유하는
자원을 준비·전달·정리하는 순서와, 부분 실패 뒤에도 남을 수 있는 외부 효과를
구분한다.

## 한 pipeline의 자원 장부

명령이 `N`개면 실행기는 `N - 1`개의 pipe와 `N`개의 PID slot을 준비한다.

| 자원 | 최초 소유자 | 정상 인계 | 정상 해제 |
| --- | --- | --- | --- |
| pipe fd 배열 | 부모 | fork 뒤 각 자식도 fd table 복사본 보유 | 자식은 `dup2` 뒤 전부 close, 부모는 fork loop 뒤 전부 close |
| PID 배열 | 부모 | 인계 없음 | 알려진 직접 자식을 wait한 뒤 free |
| pipeline/argv/redirection | 부모 한 줄 context | fork 때 주소 공간 복사 | 부모가 pipeline list 실행 뒤 free |
| 환경 `char **` | 외부 명령 자식 | 성공한 `execvp`가 process image와 함께 사용 | `execvp` 실패 때 자식이 free |
| heredoc body | 부모 execution context | fork 때 메모리 복사, redirection이 읽기만 함 | 모든 pipeline 처리 뒤 부모가 free |
| heredoc `tmpfile` | redirection을 적용하는 부모 또는 자식 | `fileno`를 stdin에 `dup2` | 즉시 `fclose`; 복제된 stdin은 command가 보유 |
| 저장한 stdin/stdout | 단독 부모 command | 복원용으로만 보유 | 복원 시 `dup2` 뒤 close |

pipe slot은 먼저 모두 `-1`로 초기화하고 PID 배열도 확보한 뒤 실제 pipe를 만든다.
배열 할당 실패에는 아직 pipe fd가 없으므로 local 배열만 해제한다. 중간 `pipe`
실패에서는 `close_pipes`가 실제로 열린 끝만 닫고, pipe 배열과 PID 배열을 모두
해제한다. 모든 pipe가 성공한 뒤에만 첫 `fork`를 호출하므로 pipe 준비 실패에는
자식 정리가 없다.
이 fd 배치는 stdin·stdout·stderr가 정상적으로 열려 있다는 통상적 시작 조건을
전제로 한다. 표준 fd가 닫힌 process에서 `pipe`가 0이나 1을 돌려주는 경우는
현재 graph와 자동 검사에서 별도 계약으로 다루지 않는다.

## 자식의 fd graph

자식 `i`는 다음 순서로 fd를 바꾼다.

1. 첫 명령이 아니면 `pipes[i - 1][0]`을 stdin에 `dup2`한다.
2. 마지막 명령이 아니면 `pipes[i][1]`을 stdout에 `dup2`한다.
3. 자신의 fd table에 남은 모든 원본 pipe 끝을 닫는다.
4. command의 redirection을 왼쪽부터 적용한다.
5. builtin을 실행하거나 `execvp`로 process image를 바꾼다.

redirection이 pipe 연결보다 뒤이므로 `echo x >file | cat`의 첫 command stdout은
pipe가 아니라 파일을 가리킨다. 부모도 fork loop가 끝나면 모든 pipe 끝을 먼저
닫고 wait한다. 부모의 쓰기 끝이 남아 reader의 EOF를 지연시키는 일을 막기
위해서다.

부모는 PID 배열 순서대로 알려진 직접 자식을 기다리며, 정상적으로 관찰한 마지막
command의 상태만 pipeline 상태로 쓴다. 따라서 앞 command의 redirection 실패나
signal 종료가 마지막 command의 성공에 가려질 수 있다. wait 오류가 하나라도
발생하면 pipeline 결과는 1이다.

## 일부 `fork`만 성공했을 때

`spawned`는 계획한 command 수와 실제 PID 수를 분리한다. 중간 `fork`가 실패하면
부모는 다음 순서로 정리한다.

1. 부모가 가진 pipe 끝을 모두 닫는다.
2. 기록된 직접 자식 각각에 `SIGKILL`을 시도한다.
3. 기록된 PID 각각을 `waitpid`로 회수하려고 시도한다.
4. 배열을 해제하고 pipeline 상태 1을 반환한다.

이 경로는 “시도”의 범위를 넘겨 보장하지 않는다. `kill`의 지속 실패와
`waitpid`의 두 번 연속 non-`EINTR` 실패 뒤에는 직접 자식이 살아 있거나 zombie로
남을 수 있다. 자식이 그 사이 만든 grandchild, 외부 프로그램 효과, 별도 process
group은 추적하지 않는다. 제품은 process group을 만들지 않으므로 group 전체를
종료할 수도 없다.

먼저 생성된 자식은 뒤의 `fork` 실패를 부모가 발견하기 전에 이미 redirection,
`execvp`, 파일·네트워크 효과를 수행할 수 있다. `SIGKILL`과 wait는 자원 회수
절차이지 이런 효과를 rollback하는 transaction이 아니다.

## redirection의 왼쪽부터 적용되는 효과

일반 redirection은 `open -> dup2 -> close` 순서다. `>`는 `O_TRUNC`, `>>`는
`O_APPEND`, 생성 mode는 0644이고 실제 permission은 process umask의 영향을
받는다. 여러 redirection은 왼쪽부터 수행하므로 앞 파일은 최종 stdin/stdout이
아니더라도 만들어지거나 truncate될 수 있다. 뒤 `open`·`dup2`가 실패해도 이
효과는 되돌리지 않는다. `close` 오류는 현재 확인하지 않는다.

pipeline 자식의 redirection 실패는 그 자식만 `_exit(1)`시킨다. 이미 만든
형제들은 계속 실행하고, 최종 pipeline 상태는 마지막 command 규칙을 따른다.
단독 부모 command에서는 builtin을 실행하지 않고 저장한 stdio를 복원한 뒤 1을
반환한다.

## 부모 builtin은 stdio를 빌린다

명령 하나인 pipeline의 일곱 builtin과 redirection-only command는 부모에서
실행된다. 실행 전 stdin과 stdout을 모두 `dup`해 저장하고 redirection을 적용한
뒤, 성공·builtin 실패·redirection 실패 어느 경우에도 두 fd 복원을 시도한다.

복원 `dup2`는 `EINTR`이면 같은 호출을 다시 하고, 다른 실패는 한 번 더 시도한다.
첫 실패 뒤 두 번째가 성공해도 command status는 1이다. 두 번 모두 실패하면
`shell.running = 0`으로 바꿔 손상된 fd 상태에서 다음 명령을 받지 않는다. 저장
fd의 `close` 오류와 계속 반복되는 `EINTR`에는 별도 종료 한계가 없다.

## heredoc body와 임시 fd

모든 heredoc body는 fork 전 부모 메모리에 존재한다. 실제 command가 실행될 때
각 heredoc redirection은 `tmpfile`을 만들고 body를 `fputs`로 복사한 뒤
되감아 stdin에 연결한다. 여러 heredoc이면 각각 적용되지만 마지막 stdin만
command에 남는다. 한순간에는 메모리 body와 임시 파일 내용이 동시에 존재한다.

`tmpfile`, `fputs`, `fflush`, `fseek`, `fileno`, `dup2` 실패는 status 1로
전파한다. 특히 stdio buffer에 남아 있던 body가 `fflush`에서 저장 공간 부족으로
실패하면 잘린 입력으로 command를 실행하지 않는다. `fclose`와 일반 `close`의
결과는 확인하지 않는다. 모든 body 메모리의 합에 더해, 여러 heredoc을 왼쪽부터
바꾸는 동안 직전 stdin의 임시 파일과 새 임시 파일이 잠시 함께 열릴 수도 있다.
그러므로 body 수집 성공이 실행 시 임시 저장 성공이나 작은 peak storage를
보장하지 않는다.

## 제품에 없는 process graph

제품 source에는 `setpgid`, `tcsetpgrp`, foreground terminal 관리가 없다.
부모 셸과 자식은 별도 job을 구성하지 않으며, 부분 fork 정리의 `kill(pid,
SIGKILL)`만 직접 PID를 대상으로 한다. `tests/timeout_runner.c`가 별도 process
group을 만들고 group kill을 수행하는 것은 검사 대상 전체를 시간 제한 안에서
치우기 위한 하네스 경계다.
