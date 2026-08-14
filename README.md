# small-shell

표준 입력에서 한 줄씩 읽어 제한된 셸 문법을 실행하는 C99/POSIX 학습용
프로그램입니다. 지원하는 실행 인터페이스는 `./small-shell` 하나이며 `-c`나
스크립트 파일 인자는 해석하지 않습니다. 최종 구현은 추가 인자를 거절하지 않고
그냥 무시하므로, 인자를 이용하는 실행은 계약에 포함되지 않습니다.

## 빌드와 최소 실행

```sh
make
./small-shell
printf 'echo hello | tr a-z A-Z\n' | ./small-shell
```

기본 입력기는 외부 라이브러리가 필요 없습니다. 대화형 입력에 Readline을
선택하려면 빌드 조건을 바꾸기 전에 기존 object를 지웁니다.

```sh
make clean
make USE_READLINE=1
```

## 지원 문법

| 영역 | 현재 계약 |
| --- | --- |
| 공백 | space, tab, newline, carriage return, vertical tab, form feed |
| 단어 | 인용하지 않은 조각, 작은따옴표, 큰따옴표와 이들의 연속 결합 |
| 확장 | `$NAME`, `$?`; 작은따옴표 안은 literal, 큰따옴표 안은 확장 |
| 연결 | `|`, `;`, `&&`, `||` |
| 리다이렉션 | `<`, `>`, `>>`, `<<` |
| builtin | `echo`, `pwd`, `cd`, `env`, `export`, `unset`, `exit` |
| 외부 명령 | `execvp`가 수행하는 `PATH` 검색 |

`|`는 한 pipeline을 먼저 묶는다. `;`, `&&`, `||`는 서로 같은 우선순위로
왼쪽에서 오른쪽으로 결합한다. 끝의 `;`는 허용하지만 끝의 `&&`·`||`, 빈
pipeline, 대상 없는 리다이렉션은 구문 오류다.

일반 argv와 `<`·`>`·`>>` 대상은 그 pipeline이 조건을 통과한 직후의 환경과
직전 상태로 확장한다. 따옴표 제거 뒤 field splitting이나 glob은 하지 않는다.
모든 heredoc은 조건 판정보다 먼저 입력 순서대로 수집한다. 구분자가 조금이라도
인용되면 본문의 `$NAME`·`$?` 확장을 끄며, 구분자 자체는 변수 확장하지 않는다.

단독 pipeline의 일곱 builtin과 리다이렉션만 있는 명령은 부모에서 실행한다.
pipeline 안의 builtin과 외부 명령은 자식에서 실행하므로 그 안의 `cd`, `export`,
`unset`, `exit` 효과는 부모 셸에 남지 않는다.

## 상태 계약

| 상태 | 현재 코드가 만드는 대표 경로 |
| --- | --- |
| `0` | 성공 |
| `1` | 내부 준비·할당·시스템 호출 오류 또는 일반 builtin 실패 |
| `2` | 잘못된 `exit` 숫자, 또는 내부 구문 상태 258의 프로세스 종료값 |
| `126` | `execvp`가 `ENOENT` 이외의 오류로 돌아옴 |
| `127` | `execvp`가 `ENOENT`로 돌아옴 |
| `128 + n` | 셸이 기다린 마지막 자식이 signal `n`으로 종료됨 |
| `0..255` | 정상 종료한 마지막 자식의 `WEXITSTATUS`, 또는 범위를 줄인 `exit N` |
| `258` | 명령 반복 안에서 보존하는 lexer/parser 구문 오류 |

이 숫자는 원인을 유일하게 encode하지 않는다. 외부 명령은 정상 종료로도
1·2·126·127이나 `128 + n`과 같은 값을 선택할 수 있으므로 숫자만 보고 signal
종료나 내부 오류였다고 역추론할 수 없다.

구문 오류 뒤 다음 명령은 `$? == 258`을 볼 수 있다. 그 상태로 EOF에 도달하면
`main`이 하위 8비트만 반환하므로 운영체제에는 2가 보인다. `exit N`도 `N`을
`unsigned char` 범위로 줄인다.

## 대화형 입력과 signal 비범위

stdin과 stderr가 모두 terminal일 때만 prompt와 선택적 Readline 경로를 쓴다.
이 판정은 입력 UI만 바꾸며 signal 정책은 바꾸지 않는다. 제품에는 `sigaction`,
job control, 별도 process group, foreground terminal 제어가 없다. 따라서 보통의
기본 signal disposition에서는 prompt나 heredoc을 읽던 부모도 `SIGINT`로 끝날 수
있고, 이를 복구해 새 prompt를 내는 동작은 제공하지 않는다.

`128 + signal`은 `waitpid`로 관찰한 **자식** 상태의 변환이다. 부모 셸이 signal을
받고 복구했다는 뜻이 아니다. `tests/timeout_runner.c`의 signal handler와 process
group 정리는 테스트 하네스의 기능이며 제품 기능이 아니다.

## 지원하지 않는 의미

- background 실행, job control, signal 기반 prompt 복구
- 역슬래시 보호, `${VAR}`, field splitting, glob, 주석
- 명령·산술 치환, subshell, grouping
- 숫자 fd, stderr 리다이렉션, here-string
- `-c`, 스크립트 파일 인자와 완전한 POSIX shell 호환

## 문서와 검증 명령

제품 흐름은 [해석과 실행](architecture/parsing-and-execution.md), fd와
프로세스 소유권은
[프로세스와 fd 수명](architecture/process-and-fd-lifecycle.md), 상태·실패·
signal 경계는
[의미와 오류 경계](architecture/semantics-and-error-boundaries.md)에 있습니다.
형성 과정과 검증 범위는 [개발 기록](devlog/README.md)에서 이어집니다.

```sh
make test
make test-asan
make test-ubsan
make test-sanitizers-container
```

`make test`는 smoke, fault injection, 할당 실패 순회, FD·자식 수명,
source-level parser API와 512 KiB 긴 입력의 5초 상한을 검사합니다.
`make test-asan`과 `make test-ubsan`은 제품·test seam·parser API 바이너리를
각 sanitizer로 만들고 같은 기능·수명·성능 경계를 실행합니다. parser API는
CLI 지원 인터페이스가 아니라 독립 구조 검사용 seam입니다.

container target은 `gcc:13-bookworm`에서 network를 끄고 source를 read-only로
mount한 뒤 tmpfs 작업 공간에서 두 sanitizer target을 실행합니다. 각 명령이
증명하는 범위와 증명하지 않는 범위는
[자원 수명과 검증 범위](devlog/06-resource-verification.md)를 먼저 확인합니다.
