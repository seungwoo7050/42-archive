# Thread: Hardening file-descriptor output against partial system calls

## Thread 목표

**Source significance**

> The initial public API cannot return status, so reliability has to be enforced internally and failure has to stop further composite output. The thread evolves from formatting correctness to a system-call progress invariant, then proves that invariant with a deterministic substitute for `write`.

### 이 Thread에 직접 연결된 source invariant

> File-descriptor output advances after every positive short write, retries `EINTR`, treats zero progress as failure, and stops composite output after a permanent error.

### 이 Thread에 직접 연결된 engineering difficulties

> Preserving output progress across short system calls while fitting a public `void` descriptor API that cannot return an error status.

> Reproducing allocation and write failures deterministically without changing the production API.

## 이 Thread를 이해하기 위한 핵심 질문

- 초기 one-shot `write`가 어떤 failure/partial-success 상태를 처리하지 못하는가?
- public API가 `void`일 때 내부 helper는 failure를 어떻게 전달해 composite output을 멈추는가?
- positive short write 이후 offset/remaining state는 어떤 순서로 갱신되는가?
- `EINTR`, zero progress, permanent error는 각각 retry/stop 정책이 어떻게 다른가?
- number output refactor가 이후 공통 write path에 어떤 연결을 만드는가?
- deterministic scripted `write`가 실제 OS timing에 의존하지 않고 retry sequence를 어떻게 증명하는가?

## 완료 기준

- `26509fd54c3d`의 one-shot policy와 `3f2bfbf11e1f`의 write-until-complete policy를 실제 코드로 비교했습니다.
- short write 후 progress state, `EINTR` retry, zero-progress failure, permanent-error stop을 순서대로 추적했습니다.
- sign/prefix 또는 앞선 component failure 뒤 후속 출력이 중지되는 control flow를 확인했습니다.
- `b013c926ceb5`에서 scripted return/error sequence와 production call sequence가 1:1로 연결되는지 확인했습니다.

## Commit map

| 순서 | Commit | Subject | Importance | Tags | Source role |
| --- | --- | --- | --- | --- | --- |
| 1 | `26509fd54c3d` | `feat(io): 파일 디스크립터 출력 함수 추가` | B | FD_OUTPUT, CORE | Adds the initial void-returning descriptor API and one-shot writes. |
| 2 | `60c35f2fb431` | `test(io): 파일 디스크립터 출력 검증` | B | FD_OUTPUT, TEST | Captures normal bytes and establishes the initial invalid-descriptor and broken-pipe observations. |
| 3 | `1077556d1c4b` | `refactor(io): 숫자 출력을 자릿수 helper로 분리` | B | FD_OUTPUT, REFACTOR | Routes integer digits through the common character-output path. |
| 4 | `3f2bfbf11e1f` | `fix(io): 파일 디스크립터 출력을 끝까지 재시도` | S | FD_OUTPUT, CORE, RISK | Introduces write-until-complete behavior, `EINTR` retry, zero-progress rejection, and permanent-error stopping. |
| 5 | `b013c926ceb5` | `test(io): 부분 쓰기와 EINTR 이후 진행을 검증` | A | FD_OUTPUT, TEST, RISK | Replaces nondeterministic operating-system timing with scripted write results and verifies the exact retry sequence. |

## Commit별 학습 기록

### `26509fd54c3d` — `feat(io): 파일 디스크립터 출력 함수 추가`

**Source 확정 역할:** arbitrary file descriptor를 대상으로 하는 initial void-returning output API를 one-shot writes로 도입합니다.

#### 해당 SHA에서 확인할 코드

- character, string, newline, signed-decimal descriptor helper의 public declarations와 implementations를 찾습니다.
- composite newline output이 string/character primitive를 어떤 순서로 재사용하는지 확인합니다.
- integer output이 fixed stack buffer를 만들고 한 번의 `write`로 제출하는 경로를 확인합니다.
- `write` 반환값을 버리는 지점을 찾고 public `void` API와 연결해 기록합니다.
- `INT_MIN` magnitude가 signed negation 없이 처리되는 코드를 확인합니다.
- short write 또는 `EINTR` 이후 남은 byte를 재시도하는 loop가 없는지 확인합니다.

#### 학습 기록

- public API contract: `libft.h`에 `ft_putchar_fd`, `ft_putstr_fd`, `ft_putendl_fd`, `ft_putnbr_fd`가 모두 `void`로 추가됩니다. caller는 대상 fd와 값만 넘기며 함수 반환값으로 성공 byte 수나 error status를 받을 수 없습니다.
- normal formatting path: character는 주소와 길이 1을 직접 씁니다. string은 `ft_strlen(text)` bytes를 씁니다. newline 함수는 먼저 `ft_putstr_fd`, 다음 `ft_putchar_fd('\n', fd)`를 호출합니다. number 함수는 decimal text를 stack buffer 뒤에서부터 구성합니다.
- `write` 호출 단위: character와 string은 각각 한 번, newline은 내부 두 primitive 때문에 최대 두 번입니다. number는 sign과 digits를 모두 buffer에 만든 뒤 한 번의 `write(fd, buffer + index, sizeof(buffer) - index)`로 제출합니다.
- error observation 수단: 구현은 모든 반환값을 `(void)write(...)`로 버립니다. public status는 없고, caller가 관찰할 수 있는 것은 실제 fd에 남은 bytes, process signal, 또는 `write`가 설정한 `errno`와 같은 외부 효과뿐입니다.
- short write에서 아직 보장하지 않는 것: `write`가 요청보다 작은 양수를 반환해도 남은 bytes를 다시 제출하지 않으므로 정상 prefix만 출력되고 suffix가 누락될 수 있습니다.
- `EINTR`에서 아직 보장하지 않는 것: `write`가 `-1`과 `EINTR`을 반환해도 retry branch가 없어 해당 component 전체가 누락됩니다.
- composite output의 failure continuation 가능성: `ft_putendl_fd`는 string write 성공 여부를 알지 못한 채 newline을 이어서 출력합니다. number는 one-shot이므로 앞부분 성공/실패 이후 별도 component stop 제어가 없습니다.
- `INT_MIN` 처리 근거: negative number의 magnitude는 `-(number + 1)`을 먼저 계산한 뒤 `+ 1U`를 적용합니다. `-INT_MIN`을 signed `int`에서 직접 계산하지 않아 overflow를 피하고 `unsigned int`로 모든 digits를 구성합니다.

### `60c35f2fb431` — `test(io): 파일 디스크립터 출력 검증`

**Source 확정 역할:** pipe capture로 정상 byte sequence를 확인하고, invalid closed descriptor와 suppressed `SIGPIPE` 아래 broken pipe의 초기 observable behavior를 기록합니다.

#### Test commit 학습

- production invariant/contract 대상:
  - 정상 formatting과 ordering: pipe write end에 네 helper를 조합해 `Afoundation\n0|-1|2147483647|-2147483648`을 출력하고, write end를 닫은 뒤 read end에서 예상 길이와 byte sequence를 비교합니다.
  - invalid descriptor control return: 새 pipe 양쪽을 닫은 뒤 closed fd에 네 helper를 호출합니다. 명시적 return/`errno` assertion은 없고, test process가 종료·hang하지 않고 함수 호출 뒤로 돌아오는지만 간접 관찰합니다.
  - broken pipe에서 `EPIPE` 관찰: `SIGPIPE` handler를 `SIG_IGN`으로 바꾸고 pipe read end를 닫은 뒤 `ft_putstr_fd("closed", pipe_fd[1])`를 호출해 `errno == EPIPE`인지 확인합니다. 마지막에 이전 signal handler를 복구합니다.
- test technique:
  - pipe capture 구성 지점을 찾습니다. `pipe(pipe_fd)` 뒤 helper들이 write end를 사용하고, write end close 후 한 번의 `read`로 `actual`을 채워 exact byte count와 `memcmp`를 검사합니다.
  - `SIGPIPE` suppression과 `errno` 관찰 위치를 찾습니다. `signal(SIGPIPE, SIG_IGN)`, read end close, `errno = 0`, production call, `CHECK(errno == EPIPE)` 순서입니다.
- 실제 production code path:
  - 네 output helper 각각 어떤 write path를 통과하는지 기록합니다. character와 string은 one-shot direct write, newline은 string 다음 character, number는 stack buffer를 만든 뒤 one-shot write입니다. 정상 case는 숫자 0, -1, `INT_MAX`, `INT_MIN`을 모두 통과합니다.
- 이 테스트가 증명하는 것: 일반 pipe에서 선택한 formatting 조합의 byte 순서·길이, 극값 decimal formatting, closed read end에서 suppressed signal 아래 `EPIPE` 관찰을 확인합니다. closed fd 호출이 control을 반환하는 것도 실행 경로에 포함합니다.
- 이 테스트가 증명하지 않는 것:
  - source상 partial write / interrupted write completion은 아직 증명하지 않습니다. 실제 test code가 이를 주입하지 않는지 확인합니다. pipe가 실제로 short write나 `EINTR`을 반환하도록 제어하지 않으며, 한 번의 `read`가 충분하다는 작은 output 조건에 의존합니다. invalid fd에 대한 exact `errno`나 호출 횟수도 assertion하지 않습니다.
- 테스트 성격:
  - [ ] broad integration
  - [x] deterministic regression
  - [x] ordinary pipe/error observation
  - 선택 근거: 고정 byte sequence와 signal/error setup을 반복하는 regression이지만 system `write` 결과를 substitute하지 않고 실제 pipe와 host error observation에 의존합니다. 여러 subsystem release를 검증하는 broad integration은 아닙니다.
- 다음 refactor/fix와 연결: formatting은 확인됐지만 partial progress와 interruption은 통제되지 않습니다. number refactor는 digits를 common character path로 모으고, 이후 fix는 모든 helper가 completion helper를 사용하도록 바꿔야 합니다.
- 실행 근거: 현재 환경에서는 이 SHA의 binary를 실행하지 않았습니다. 위 내용은 `tests/test_fd_output.c`와 `src/io/ft_fd_output.c`를 해당 SHA에서 직접 검사한 결과입니다.

### `1077556d1c4b` — `refactor(io): 숫자 출력을 자릿수 helper로 분리`

**Source 확정 역할:** signed-decimal output을 sign handling + recursive unsigned digit emitter로 분리하고 각 digit을 공통 character-output primitive로 보냅니다.

#### 해당 SHA에서 확인할 코드

- 이전 `26509fd54c3d`의 fixed decimal buffer 경로와 이 SHA의 구현을 비교합니다.
- sign handling과 unsigned magnitude 계산을 찾습니다.
- recursive digit emitter의 base/recursive case를 실제 코드에서 기록합니다.
- 각 digit이 어떤 common character-output path를 통과하는지 caller/callee를 추적합니다.
- public behavior가 아직 short-write reliability를 보장하도록 바뀐 것이 아닌지 source role과 실제 코드로 구분합니다.
- one-byte writes 증가라는 trade-off가 구현상 어떻게 나타나는지 확인합니다.

#### 학습 기록

- 변경 전 number-output path: `char buffer[11]`을 끝에서 앞으로 채우고 sign을 추가한 뒤 전체 decimal representation을 단일 `write`로 제출했습니다.
- 변경 후 path: `ft_putnbr_fd`가 negative sign을 `ft_putchar_fd`로 먼저 쓰고 같은 overflow-safe magnitude를 계산합니다. `put_unsigned`는 magnitude가 10 이상이면 quotient에 재귀 호출한 뒤 현재 remainder digit을 출력합니다.
- 공통 emission boundary: 모든 sign과 digit이 `ft_putchar_fd`를 거치므로 실제 system-call boundary가 character primitive 하나로 통일됩니다.
- public behavior 유지 근거: declaration과 반환형은 그대로 `void`이고 decimal order와 `INT_MIN` magnitude 계산도 유지됩니다. 그러나 `ft_putchar_fd` 자체가 여전히 one-shot `write` 결과를 버리므로 short-write reliability가 추가된 것은 아닙니다.
- 다음 fix가 이 구조를 이용할 수 있는 지점: character primitive에 completion behavior를 넣으면 숫자 각 digit도 그 path를 사용합니다. 다만 digit별 failure를 상위 recursion과 sign 이후 제어로 전달하려면 private helper 반환형을 `int` 등으로 바꿔야 합니다.
- trade-off: 이전 number당 한 번이던 system call이 sign과 각 digit마다 한 byte write로 늘어납니다. 이 commit은 구조 통일을 선택했으며 batching 성능을 개선하지 않습니다.

### `3f2bfbf11e1f` — `fix(io): 파일 디스크립터 출력을 끝까지 재시도`

**Source 확정 역할:** positive short write progress 보존, `EINTR` retry, zero progress rejection, permanent-error stop을 포함하는 project-defining system-call invariant를 복구합니다.

#### 기존 가정 → 실제 failure 또는 위험

- 기존 one-shot assumption: 요청한 byte count가 한 번의 `write`로 모두 처리되거나, 실패하더라도 public `void` API에서는 더 할 일이 없다고 간주했습니다.
- positive short write에서 생기는 truncation: 반환값만큼은 정상 출력됐지만 아직 남은 suffix가 존재합니다. 기존 코드는 반환값을 버려 prefix progress와 remaining range를 잃습니다.
- `EINTR`을 completion으로 취급할 때의 문제: signal interruption은 byte가 기록되지 않은 transient error일 수 있는데 retry하지 않으면 component가 누락됩니다.
- 모든 error를 무조건 retry할 때의 문제: `EPIPE`, `EBADF`, `EIO` 같은 permanent error나 zero progress에서 같은 request를 반복하면 무한 loop 또는 오류 뒤의 부가 output이 발생할 수 있습니다.
- public `void` API가 직접 status를 돌려줄 수 없는 제약: caller에게 실패를 반환할 수 없으므로 private helper가 성공/실패를 반환하고 composite helper 내부에서 후속 write를 중지해야 합니다. 최종 `errno`는 system call 또는 zero-progress mapping으로 남습니다.

#### 해당 SHA에서 확인할 실제 핵심 코드

- private `write_all` 또는 source가 설명한 completion helper를 찾습니다.
- 한 번의 request가 `SSIZE_MAX`를 넘지 않도록 제한하는 코드를 확인합니다.
- `write`가 양수를 반환했을 때 pointer/offset과 remaining byte count가 **반환된 수만큼만** 전진하는지 확인합니다.
- `write == -1`과 `errno == EINTR`인 branch가 progress를 중복 적용하지 않고 retry하는지 확인합니다.
- `write == 0`에서 `EIO`로 전환하고 종료하는 경로를 확인합니다.
- 다른 permanent error에서 즉시 stop하는 경로를 확인합니다.
- character/string/newline/integer helper가 새 completion path로 어떻게 route되는지 확인합니다.
- recursive number output에서 내부 failure status가 상위 호출로 어떻게 propagation되는지 추적합니다.
- sign emission 실패 후 digit emission이 중지되는지 확인합니다.
- composite newline 출력에서 앞 component failure 후 다음 write를 하지 않는지 확인합니다.

#### state transition 기록

| 상황 | 이전 remaining/progress | system call 결과 | 다음 state | retry/stop | 실제 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| positive full write | `remaining = request`, `offset = k` | `written == request > 0` | `offset += written`, 전체 length에 도달 | loop 종료 / success | `if (written > 0) offset += (size_t)written` 후 `offset < length` 재평가 |
| positive short write | `remaining = length - offset` | `0 < written < request` | 정확히 `written`만큼 offset 증가, 새 remaining 계산 | 남은 range retry | 다음 iteration의 `request = length - offset` |
| `EINTR` | 기존 offset과 remaining 유지 | `written < 0`, `errno == EINTR` | state 변화 없음 | 같은 remaining retry | `continue` 전에 offset 갱신 없음 |
| zero progress | 기존 offset과 remaining 유지 | `written == 0` | `errno = EIO`, progress 없음 | stop / failure 0 | error branch의 explicit `written == 0` 처리 |
| permanent error | 기존 offset과 remaining 유지 | `written < 0`, `errno != EINTR` | system `errno` 유지 | 즉시 stop / failure 0 | `else` branch에서 추가 call 없이 return 0 |

#### 수정된 invariant

- progress가 보존되는 조건: system call이 양수를 반환한 경우에만 그 반환 byte 수만큼 offset을 증가시킵니다. 다음 request는 남은 길이이며 `buffer + offset`부터 시작합니다.
- retry 가능한 유일한 error: 이 구현에서 명시적으로 retry하는 error는 `EINTR`뿐입니다. progress를 적용하지 않고 같은 remaining range를 재요청합니다.
- zero progress 처리: length가 남았는데 `write`가 0이면 더 진행된다는 보장이 없으므로 `errno = EIO`로 바꾸고 실패합니다. 무한 retry하지 않습니다.
- composite stop 조건: `ft_putendl_fd`는 text `write_all`이 성공한 경우에만 newline을 씁니다. negative number는 sign write가 실패하면 return하고, recursive digit helper는 하위 digit 실패를 0으로 전파해 이후 digits를 중지합니다.
- public API가 `void`여도 내부적으로 확보되는 보장: caller는 status를 받지 못하지만, transient `EINTR`과 short write는 completion까지 처리되고, permanent failure 후 동일 composite operation의 추가 bytes는 쓰지 않습니다. 오류를 성공으로 바꾸거나 caller에게 report하는 보장은 없습니다.
- request bound: 매 iteration의 remaining이 `SSIZE_MAX`보다 크면 request를 `SSIZE_MAX`로 제한해 `write`의 representable return 범위 안에 둡니다.

#### 후속 검증 연결

- ordinary pipe test로 결정적으로 만들기 어려운 scenario: 정확히 2 bytes short write 후 `EINTR`, 다시 1 byte와 3 bytes 성공, zero return, 특정 digit 뒤 `EPIPE`처럼 OS scheduling에 좌우되는 sequence입니다.
- `b013c926ceb5`가 scripted result로 고정해야 하는 순서: request lengths와 fd, call count, copied output bytes를 모두 기록하며 positive progress 뒤 remaining 감소, `EINTR` 뒤 same request, zero/hard error 뒤 no further call을 assertion해야 합니다.

### `b013c926ceb5` — `test(io): 부분 쓰기와 EINTR 이후 진행을 검증`

**Source 확정 역할:** deterministic scripted `write` 결과를 사용해 partial progress, interruption, zero, permanent error의 정확한 retry/stop sequence를 검증합니다.

#### Test commit 학습

- production invariant 대상:
  - positive short write 후 남은 byte만 재시도: `"abcdef"`에 첫 result 2를 주고 다음 request가 4인지 검사합니다.
  - `EINTR` retry: 두 번째 call이 `-1/EINTR`일 때 세 번째 request가 여전히 4이고 output progress가 중복되지 않는지 검사합니다.
  - zero progress rejection: 2 bytes 성공 뒤 0을 반환시켜 두 call에서 멈추고 output이 `"ab"`, `errno == EIO`인지 검사합니다.
  - permanent error 이후 composite stop: `ft_putendl_fd("error")`에서 1 byte 성공 뒤 `-1/EIO`를 반환시켜 newline과 남은 text를 쓰지 않는지 검사합니다. number에서도 `"-2"` 뒤 `EPIPE`가 나면 뒤 digits를 중지합니다.
- failure injection technique:
  - 실제 `write`를 substitute하는 test/build boundary를 찾습니다. Makefile은 `src/io/ft_fd_output.c`만 별도 `build/write-failure/ft_fd_output.o`로 compile하며 `-Dwrite=test_write`를 적용합니다. 이 object와 support/test source, 기존 archive를 link합니다.
  - scripted return values와 `errno`를 저장/소비하는 state를 찾습니다. `t_write_step { ssize_t result; int error_number; }` 배열을 reset 시 저장하고 `test_write`가 call index 순서대로 step을 소비합니다. negative result는 지정 `errno`와 `-1`을 반환합니다.
  - production이 요청한 buffer pointer/length 또는 call count를 기록하는 instrumentation을 확인합니다. fd와 requested length를 배열에 기록하고 positive result만큼 현재 buffer bytes를 output buffer에 복사합니다. script 고갈, result > request, output overflow는 `g_invalid`로 표시합니다.
- production path 추적:
  - short write → next request: 6-byte 요청에서 2를 반환해 offset 2, 다음 request 4가 됩니다.
  - `EINTR` → same remaining range retry: request 4에서 error가 나고 offset이 그대로라 다음 request도 4입니다.
  - zero → `EIO`/stop: 두 번째 call에서 0이면 third scripted success는 소비되지 않고 call count 2로 끝납니다.
  - hard error → no later component: text 중간 EIO 뒤 newline이 없고, number digit EPIPE 뒤 다음 one-byte step을 소비하지 않습니다.
- exact retry sequence:
  - test script: partial/interrupted case는 `{2, 0}, {-1, EINTR}, {1, 0}, {3, 0}`입니다.
  - 예상 call sequence: fd 91로 request lengths `6 → 4 → 4 → 3`, 총 4 calls이며 output은 순서대로 `ab`, 변화 없음, `c`, `def`입니다.
  - 실제 assertion: calls 4, 첫/마지막 fd 91, 각 request length, output size 6, `memcmp(..., "abcdef", 6)`, invalid 0을 각각 검사합니다.
- 테스트가 증명하는 것: 고정된 short write, `EINTR`, zero, EIO/EPIPE sequence에서 offset과 request length, call stop, accumulated output, `errno`가 예상과 같음을 production `write_all` 경로에 대해 결정적으로 검사합니다. `INT_MIN`의 sign/digits propagation도 포함합니다.
- 테스트가 증명하지 않는 것: 실제 kernel pipe/socket의 concurrency와 signal timing, `SSIZE_MAX`보다 큰 실사용 buffer, 모든 `errno`, nonblocking `EAGAIN` 정책, thread safety, public caller의 error reporting은 증명하지 않습니다.
- 테스트 성격:
  - [ ] broad integration
  - [x] deterministic regression
  - [x] deterministic system-call failure injection
  - 선택 근거: production system-call symbol을 compile-time substitute하고 exact return/error script, request lengths, output, call count를 assertion합니다. 실제 OS timing을 관찰하는 test가 아니라 progress invariant 전용 regression입니다.
- 후속 변경에서 막아야 할 회귀: short write 뒤 original length 재요청, offset을 requested size만큼 잘못 증가, `EINTR`에서 중복 progress, zero에서 무한 loop, hard error 뒤 newline/digits 계속 출력, sign 실패 뒤 digits 출력, 잘못된 fd 전달을 막습니다.
- 실행 근거: 현재 환경에서는 `make write-failure-test`를 실행하지 않았습니다. 위 exact sequence는 `b013c926ceb5`의 test/support code와 Makefile을 검사한 결과이며 실제 실행 성공을 주장하지 않습니다.

## Invariant ledger

| 단계 | Commit | Source에 연결된 invariant 상태 | 실제 코드에서 확인한 근거 |
| --- | --- | --- | --- |
| initial API | `26509fd54c3d` | one-shot write, completion invariant 미확립 | 네 public helper가 `write` 반환값을 버리고 short write/`EINTR` loop 없이 동작합니다. |
| initial observation | `60c35f2fb431` | 정상 bytes와 기본 error observation만 검증 | 실제 pipe로 expected bytes와 `EPIPE`를 확인하지만 write return sequence를 통제하지 않습니다. |
| common path preparation | `1077556d1c4b` | number digits가 common character path를 사용 | recursive `put_unsigned`와 sign이 모두 `ft_putchar_fd`를 호출합니다. |
| fix / invariant restoration | `3f2bfbf11e1f` | progress, `EINTR`, zero, permanent error 정책 확립 | `write_all`이 positive bytes만큼 offset을 갱신하고 EINTR만 retry하며 zero를 EIO, 다른 error를 stop으로 처리합니다. |
| deterministic regression | `b013c926ceb5` | exact retry/stop sequence 강제 검증 | substituted `test_write`가 scripted results를 반환하고 fd/request/output/call count를 기록해 `6→4→4→3` 및 stop cases를 assertion합니다. |

## Failure → Fix → Test 연결

- 기존 가정: one-shot `write`가 요청을 충분히 처리한다고 간주
- 실제 failure/위험: short write, `EINTR`, zero progress, permanent error 후 잘못된 continuation
- root cause: 반환값과 `errno`를 버려 이미 전송된 byte 수와 남은 range, retry 가능 여부를 state로 유지하지 않았습니다.
- 구조 준비: `1077556d1c4b`
- fix: `3f2bfbf11e1f`
- 실제 수정 코드: private `write_all`이 bounded request, offset, positive progress, EINTR retry, zero/hard error stop을 담당하고, newline/number private paths가 boolean success를 전파합니다.
- regression test: `b013c926ceb5`
- failure injection script: `write`를 `test_write`로 바꾸고 `{result, errno}` steps를 순서대로 제공하며 request/call/output를 기록합니다.
- 고정된 invariant: 양수 반환만큼만 전진하고, EINTR에는 같은 remaining range를 재시도하며, zero와 permanent error에서는 추가 component를 쓰지 않습니다.

## State / responsibility 변화

- 초기 public `void` API가 caller에게 제공하지 못하는 status: 성공 byte 수, partial progress, 최종 error를 반환값으로 전달하지 못합니다.
- 내부 helper가 새로 맡는 completion responsibility: 전체 length를 쓰거나 실패할 때까지 offset과 remaining을 유지하고 system-call 결과를 분류합니다.
- composite helper가 맡는 stop-on-error responsibility: 앞 component의 private failure를 검사해 newline, sign 이후 digits, recursive 후속 digits를 중지합니다.
- test harness가 맡는 deterministic system-call boundary: 실제 OS 대신 exact short/error results를 공급하고 production request와 output progression을 측정합니다.

## Thread 최종 상태

- 마지막 commit 시점에 이 thread가 보장하는 것:
  - 기록: valid text/value와 fd 입력에서 내부 completion path는 positive short write를 모두 이어 쓰고 EINTR을 재시도합니다. zero는 EIO, permanent error는 즉시 stop이며 composite helper는 앞선 failure 뒤 후속 bytes를 제출하지 않습니다. scripted test가 대표 sequence를 정확히 검사합니다.
- 이 thread만으로는 보장하지 않는 것:
  - 기록: public API가 caller에게 status를 반환하지 않고, `NULL` string 방어, nonblocking `EAGAIN` retry, 모든 kernel timing, atomic multi-byte output, thread safety를 보장하지 않습니다. 현재 작업 환경에서 test 명령은 실행하지 않았습니다.
- source의 significance와 실제 코드 확인 결과가 연결되는 지점:
  - 기록: API signature를 바꾸지 않고 private status propagation과 stop-on-error를 추가했으며, nondeterministic system call을 scripted substitute로 바꿔 exact progress invariant를 검증한다는 점이 source significance와 일치합니다.

## 최종 architecture 또는 execution flow 정리

해당 thread의 commit history를 근거로 최종 흐름을 직접 작성합니다.

- 시작 조건 / 입력: public helper가 fd와 character, NUL-terminated text, newline text, 또는 `int`를 받습니다. 문자열 pointer의 유효성은 caller precondition입니다.
- 핵심 분기 또는 책임 경계: public `void` wrapper는 private `write_all`/`put_unsigned` status를 내부 제어에만 사용합니다. `write_all`은 positive, EINTR, zero, permanent error를 분기합니다.
- 상태 또는 ownership 변화: allocation은 없습니다. local `offset`만 이미 처리된 prefix를 나타내며, remaining은 `length - offset`으로 매 iteration 재계산됩니다.
- failure 처리: EINTR만 state 변화 없이 retry합니다. zero는 EIO로 바꿔 실패하고 다른 error는 errno를 유지한 채 실패합니다. composite operation은 실패 status를 받으면 즉시 반환합니다.
- verification 경로: normal pipe test는 formatting과 기본 error를 관찰하고, special build는 `write`를 scripted function으로 치환해 request lengths, fd, accumulated bytes, call count를 검사합니다.
- 최종 설명: 이 Thread는 출력 문자열을 올바르게 만드는 문제에서 system call의 부분 성공을 올바르게 이어 가는 문제로 확장됩니다. public API는 여전히 `void`지만 private helper가 progress와 failure를 명시적으로 관리해 잘린 출력과 오류 뒤 continuation을 막습니다.

## 학습 완료 자가 점검

- [x] 모든 commit을 문서 순서대로 해당 SHA에서 확인했습니다.
- [x] 중요도와 tags를 source 그대로 유지했습니다.
- [x] 실제 코드 근거와 source 확정 설명을 구분했습니다.
- [x] 변경 전/후 비교가 필요한 commit은 이전 관련 SHA와 비교했습니다.
- [x] failure → fix → test 연결을 실제 코드와 test code로 확인했습니다.
- [x] final HEAD를 과거 commit 설명에 소급하지 않았습니다.
- [x] 이 thread의 최종 invariant와 execution flow를 코드 근거로 설명할 수 있습니다.
