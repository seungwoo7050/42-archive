# Thread: Checker protocol and verdict hardening

## 1. Thread 목표
- **Source significance:** The visible progression demonstrates an intermediate implementation becoming too general for a tiny fixed protocol. The correction moves the limit into the reader, where hostile or malformed input can be rejected before dispatch, and the fault tests then distinguish valid EOF framing, transient interruption, permanent transport failure, and protocol invalidity.
- **학습 목표:** checker가 command stream을 읽고 silent replay한 뒤 `OK`/`KO`를 판정하는 lifecycle을 복원하고, 초기 general line reader가 protocol-specific bounded reader로 교정되는 실패→수정→검증 과정을 추적합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문
- 초기 reader의 tri-state `1/0/-1` 계약과 frame ownership은 어떻게 구현되는가?
- command dispatch가 exact string match와 `emit = 0`을 통해 shared operations를 어떻게 재사용하는가?
- `OK`, `KO`, malformed stream error의 process/output semantics는 어떻게 다른가?
- 왜 arbitrarily long line reader가 최대 3-byte command protocol에는 과도한 추상화였는가?
- `EINTR`, permanent read failure, NUL, overlength, EOF-delimited final frame이 reader에서 어떻게 구분되는가?

## 3. 완료 기준
- reader → dispatch → state mutation → verdict의 실제 caller/callee 경로를 해당 SHA에서 추적했습니다.
- no-values 실행이 stdin을 읽지 않는 경로를 확인했습니다.
- 0b87adebca2b와 7713a31cf502를 비교해 dynamic growth가 fixed frame으로 바뀐 지점을 설명할 수 있습니다.
- dbf76e147e68에서 EIO/EINTR와 protocol-invalid cases가 각각 어떤 production path를 통과하는지 확인했습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Source-confirmed role |
| --- | --- | --- | --- | --- | --- |
| 1 | `0b87adebca2b` | feat(checker): 표준 입력 명령 프레임을 읽음 | B | CHECKER, CORE | Adds an initial general-purpose dynamic line reader. |
| 2 | `f79ae7e86592` | feat(checker): 스택 연산 명령을 해석 | B | CHECKER, INTEGRATION | Dispatches legal command names to shared silent operations. |
| 3 | `d906f4d86528` | feat(checker): 명령 실행 결과를 판정 | A | CHECKER, CORE, INTEGRATION | Establishes the complete checker lifecycle and `OK`/`KO` protocol. |
| 4 | `44ee0830e9f0` | test(checker): 명령 연산과 최종 판정을 검증 | B | TEST, CHECKER | Verifies every command family and the distinction among verdicts and malformed streams. |
| 5 | `7713a31cf502` | fix(checker): 명령 길이를 제한하고 중단된 읽기를 재시도 | A | CHECKER, RUNTIME, RISK | Replaces unbounded lines with protocol-sized frames and retries interrupted reads. |
| 6 | `dbf76e147e68` | test(checker): 읽기 실패와 명령 경계를 검증 | A | TEST, CHECKER, RISK | Injects read faults and verifies NUL, empty, overlength, long-stream, and EOF-delimited boundaries. |

### Source에서 직접 연결된 invariant / engineering difficulty
- **Critical invariants**
  - Checker returns `OK` only for sorted A with empty B; `KO` is a normal verdict, whereas malformed input, malformed commands, allocation failure, and I/O failure are errors.
  - Checker frames contain at most three non-newline bytes, contain no NUL, retry `read` interrupted by `EINTR`, and reject other read errors.
- **Major engineering difficulties**
  - Handling allocation failure, interrupted reads and writes, short writes, zero-byte writes, closed pipes, and already-visible output prefixes without transactional rollback.

## 5. Commit별 학습 기록

> 모든 코드 확인은 반드시 해당 commit SHA 시점에서 수행합니다. final HEAD의 구현을 소급해 해석하지 않습니다.

### `0b87adebca2b` — feat(checker): 표준 입력 명령 프레임을 읽음
- **Importance:** B
- **Tags:** CHECKER, CORE
- **Source-confirmed role:** Adds an initial general-purpose dynamic line reader.
- **Classification summary:** Introduces a tri-state dynamically growing line reader for checker command frames.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only 0b87adebca2b`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `0b87adebca2b` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- line reader의 tri-state `1`/`0`/`-1` return contract와 caller의 ownership 전달을 확인합니다.
- newline을 제외한 frame 반환과 EOF의 final unterminated non-empty frame acceptance를 확인합니다.
- buffer geometric growth와 allocation failure/read failure cleanup을 추적합니다.
- clean EOF with zero bytes에서 allocation이 caller에 남지 않는지 확인합니다.
- 이 SHA에서는 arbitrary length가 가능하고 `EINTR`도 failure로 처리되는 위치를 기록합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### 학습자가 복원할 구현 기록 — B
- **직전 관련 상태:** checker가 stdin command를 frame 단위로 읽는 API가 없었습니다.
- **이 commit의 구현 역할:** `0b87adebca2b:src/checker_reader.c:read_next_line`이 한 바이트씩 읽어 newline을 제외한 NUL-terminated heap string을 반환합니다. `grow_line`은 초기 32바이트에서 필요한 길이보다 커질 때까지 두 배로 늘립니다.
- **핵심 state transition 또는 boundary:** 반환값 1이면 caller가 `*line`을 소유하고, 0이면 clean EOF이며 buffer는 남지 않고, -1이면 allocation/read failure로 내부 buffer를 해제합니다. EOF 전에 읽은 non-empty final frame은 newline 없이도 1로 반환합니다.
- **failure/no-op/edge:** read 실패는 errno를 구분하지 않고 -1이므로 `EINTR`도 permanent error가 됩니다. line 길이는 제한이 없고 embedded NUL도 저장 후 C string 비교에서 조기 종료될 수 있습니다.
- **이후 연결:** `f79ae7e86592`가 frame을 exact command로 dispatch하고, `7713a31cf502`가 reader를 최대 3바이트 protocol로 축소해 NUL/overlength와 EINTR를 직접 처리합니다.
- **Thread의 다음 관련 commit:** `f79ae7e86592`는 reader가 넘긴 문자열을 부분 일치 없이 11개 command로 매핑하고 어떻게 stdout을 억제하는가?

### `f79ae7e86592` — feat(checker): 스택 연산 명령을 해석
- **Importance:** B
- **Tags:** CHECKER, INTEGRATION
- **Source-confirmed role:** Dispatches legal command names to shared silent operations.
- **Classification summary:** Maps all legal command names to the shared operation layer with emission disabled.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only f79ae7e86592`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `f79ae7e86592` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- 11개 exact command string과 operation wrapper mapping을 확인합니다.
- prefix/suffix/unknown name이 partial match 없이 reject되는 비교를 확인합니다.
- 각 dispatch가 `emit = 0`으로 shared operations를 호출해 stdout에 echo하지 않는지 확인합니다.
- insufficient stack no-op semantics가 command error로 바뀌지 않는지 shared operation 경로와 연결합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### 학습자가 복원할 구현 기록 — B
- **직전 관련 상태:** reader는 arbitrary line을 반환하지만 그 문자열을 stack transition으로 해석하지 않았습니다.
- **이 commit의 구현 역할:** `f79ae7e86592:src/checker.c:apply_checker_command`가 `ps_strcmp`로 `sa`, `sb`, `ss`, `pa`, `pb`, `ra`, `rb`, `rr`, `rra`, `rrb`, `rrr`를 exact 비교하고 해당 `op_*`를 `emit=0`으로 호출합니다.
- **핵심 state transition 또는 boundary:** known command는 state transition 성공 여부가 아니라 protocol membership을 뜻하는 1을 반환합니다. shared primitive가 size 부족으로 no-op해도 command 자체는 합법이므로 1입니다. unknown/prefix/suffix는 0입니다.
- **failure/no-op/edge:** stdout에 command를 echo하지 않습니다. 이 시점 operation API는 fallible하지 않으므로 dispatch가 I/O failure를 다룰 필요도 없습니다.
- **이후 연결:** `d906f4d86528`이 read/apply loop와 final verdict를 연결합니다.
- **Thread의 다음 관련 commit:** `d906f4d86528`은 valid-but-unsorted stream과 malformed/read-failed stream을 status/output에서 어떻게 구분하는가?

### `d906f4d86528` — feat(checker): 명령 실행 결과를 판정
- **Importance:** A
- **Tags:** CHECKER, CORE, INTEGRATION
- **Source-confirmed role:** Establishes the complete checker lifecycle and `OK`/`KO` protocol.
- **Classification summary:** Builds the checker executable, replays stdin commands, and emits `OK` or `KO` from complete state.

#### Source-confirmed context
- **Problem:** A command generator alone cannot establish that a stream is legal and reaches the required terminal state. The validator must also distinguish a valid but insufficient stream from malformed input or execution failure.
- **Decision:** Build a separate checker that parses the same initial values, replays stdin frames through shared silent operations, and emits `OK` only for sorted A with empty B; otherwise a valid completed stream receives `KO`.
- **Why it mattered:** The commit establishes the public validation protocol and a second consumer of the common model. It also makes `KO` a normal status-zero judgment while reserving non-zero status and `Error` for malformed input, commands, allocation, or reading.
- **What changed:** The Makefile gains the checker executable, and checker control flow gains frame ownership, command application, cleanup, complete-state evaluation, and verdict output.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only d906f4d86528`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `d906f4d86528` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- checker `main`에서 parse → B allocate → read frame → apply → frame free 반복 → EOF verdict → stack cleanup 순서를 추적합니다.
- invalid command/read failure/parse/allocation failure 각각의 cleanup + `Error` path를 확인합니다.
- complete-state predicate가 A sorted와 B empty를 동시에 요구하는 실제 호출을 확인합니다.
- `OK`와 `KO` 모두 normal status인 반면 malformed stream은 failure status인 분기를 확인합니다.
- no-values invocation이 stdin loop 전에 return하는 위치를 확인합니다.
- 이 SHA에서 verdict/error writes가 아직 checked status를 제공하지 않는 한계를 확인합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### 학습자가 복원할 핵심 기록 — A
- **직전 관련 상태와 문제:** reader와 dispatcher는 있었지만 executable lifecycle, frame ownership loop, final-state protocol이 없었습니다.
- **주요 boundary/decision:** `d906f4d86528:src/checker.c:read_and_apply`가 frame 반환값이 양수인 동안 apply→free를 반복하고, invalid command에서 현재 frame을 free한 뒤 failure를 반환합니다. `main`은 clean EOF에만 complete-state predicate를 평가합니다.
- **state / ownership / failure 변화:** parse 성공 후 main이 A를, B init 성공 후 A/B를 소유합니다. reader가 반환한 각 frame은 loop가 한 번만 free합니다. parse/B/read/command failure는 stack cleanup 뒤 `Error\n`과 status 1입니다. valid EOF 뒤 sorted A+B empty면 `OK\n`, 아니면 `KO\n`이며 둘 다 status 0입니다.
- **보장 / 비보장:** valid command stream의 정상 verdict와 malformed transport/protocol의 error 구분을 제공합니다. argc==1은 parse와 stdin read 전에 status 0으로 반환하므로 입력 stream을 소비하지 않습니다. verdict/error write 결과는 아직 확인하지 않습니다.
- **후속 검증 또는 수정 연결:** `44ee0830e9f0`이 command families와 OK/KO/error를 검증하고, `7713a31cf502`/`dbf76e147e68`이 reader protocol과 read faults를 수정·검증합니다. write status는 `315f4b91779b`에서 보강됩니다.
- **Thread의 다음 관련 commit:** `44ee0830e9f0`은 primitive unit test가 아니라 checker CLI를 통과해 세 public outcome을 어떤 case로 구분하는가?

### `44ee0830e9f0` — test(checker): 명령 연산과 최종 판정을 검증
- **Importance:** B
- **Tags:** TEST, CHECKER
- **Source-confirmed role:** Verifies every command family and the distinction among verdicts and malformed streams.
- **Classification summary:** Exercises all checker commands and distinguishes `OK`, `KO`, and invalid-stream failure.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only 44ee0830e9f0`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `44ee0830e9f0` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- 각 instruction family를 stdin command program으로 실행해 known sorted result를 만드는 test cases를 확인합니다.
- `ss`, `rr`, `rrr` combined command도 executable dispatch를 통해 검증되는지 확인합니다.
- unsorted/no-command → `KO` normal status와 valid-prefix + unknown command → no verdict + `Error` failure를 비교합니다.
- operation primitive unit test와 달리 checker CLI path를 실제 통과하는 범위를 확인합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### Test commit 학습 기록
- **대상 production invariant:** 11개 exact command가 checker CLI에서 silent replay되고 complete state만 `OK`, valid incomplete state는 `KO`, malformed command는 error가 되어야 합니다.
- **재현하는 failure/boundary:** swap, push, rotate, reverse rotate 및 `ss`/`rr`/`rrr`를 포함한 command programs로 알려진 sorted state를 만들고, unsorted/no-command와 valid prefix 뒤 `wat`을 별도로 사용합니다.
- **test technique:** deterministic checker CLI integration입니다.
- **통과하는 production path:** subprocess stdin → `read_next_line` → `apply_checker_command` → shared `op_*` emit=0 → EOF → `stack_is_complete_sorted` → verdict/error입니다.
- **이 테스트가 증명하는 것:** 나열한 command families의 dispatch와 CLI-level OK/KO/error status/stdout/stderr 구분을 확인합니다.
- **이 테스트가 증명하지 않는 것:** read interruption/permanent error, overlength/NUL, allocation/write fault, 모든 command sequence를 exhaust하지 않습니다. shared operation 자체의 독립 semantics도 아닙니다.
- **성격:** broad checker integration regression입니다.
- **막는 후속 회귀:** command mapping 누락, combined dispatch 한쪽 미적용, KO를 error로 바꾸는 변경, malformed stream 뒤 verdict를 출력하는 변경을 막습니다.

#### 학습자가 복원할 구현 기록 — B
- **직전 관련 상태:** complete checker lifecycle은 있었지만 public command/vote behavior의 자동 증거가 없었습니다.
- **이 commit의 구현 역할:** 모든 instruction family를 checker executable stdin으로 통과시키고 세 terminal outcome을 고정합니다.
- **핵심 state transition 또는 boundary:** valid prefix가 이미 stack을 일부 바꿨더라도 뒤의 unknown command가 나오면 verdict 없이 전체 stream이 malformed error로 끝납니다.
- **failure/no-op/edge:** unsorted empty stream은 transport/protocol 성공이므로 `KO` status 0입니다.
- **이후 연결:** 다음 fix는 dispatch가 아니라 reader의 frame size와 EINTR policy를 교정합니다.
- **Thread의 다음 관련 commit:** `7713a31cf502`는 general line reader의 어떤 상태·allocation 정책을 protocol-sized frame으로 바꾸는가?

### `7713a31cf502` — fix(checker): 명령 길이를 제한하고 중단된 읽기를 재시도
- **Importance:** A
- **Tags:** CHECKER, RUNTIME, RISK
- **Source-confirmed role:** Replaces unbounded lines with protocol-sized frames and retries interrupted reads.
- **Classification summary:** Replaces the unbounded reader with a four-byte frame buffer, rejects NUL or overlength input, and retries `EINTR`.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only 7713a31cf502`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `7713a31cf502` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- `0b87adebca2b`와 diff하여 dynamic buffer가 `PS_COMMAND_MAX + 1` fixed frame으로 교체된 위치를 확인합니다.
- 4번째 byte, embedded NUL, allocation failure를 frame reader가 dispatch 전에 reject하는지 확인합니다.
- `read`가 `EINTR`일 때 retry하고 다른 error에서 buffer free + caller pointer null + error return하는 경로를 확인합니다.
- clean EOF/no bytes와 valid EOF-delimited final command의 서로 다른 cleanup/return을 확인합니다.
- fault-allocation sweep이 revised reader allocation behavior에 맞춰 변경되는지 확인합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### Fix chain 복원
- **기존 가정:** `0b87adebca2b:read_next_line`은 checker 입력을 일반 text line으로 보고 32바이트에서 geometric growth하며 모든 non-newline byte를 허용했습니다. 모든 negative `read`를 동일 failure로 처리했습니다.
- **실제 failure 또는 위험:** checker protocol의 longest command는 3바이트인데 arbitrary line을 계속 할당·읽을 수 있었고, embedded NUL은 dispatch 문자열을 실제 frame보다 짧게 보이게 할 수 있었습니다. transient `EINTR`도 malformed/transport error로 잘못 종료됐습니다.
- **root cause:** reader가 protocol boundary를 소유하지 않고 general-purpose line abstraction을 제공했으며, errno별 retry policy가 없었습니다.
- **수정된 invariant/decision:** frame은 최대 3 non-newline bytes, NUL 금지, allocation은 정확히 `PS_COMMAND_MAX + 1`, `EINTR`만 retry, 다른 read error는 free+NULL+-1입니다. clean EOF/no bytes는 free+NULL+0, EOF-delimited nonempty frame은 1입니다.
- **실제 수정 코드:** `7713a31cf502:src/checker_reader.c:read_next_line`의 핵심은 다음과 같습니다.

```c
*line = (char *)ps_malloc(PS_COMMAND_MAX + 1);
...
if (bytes < 0 && errno == EINTR)
    continue ;
if (c == '\0' || len >= PS_COMMAND_MAX)
    return (ps_free(*line), *line = NULL, -1);
```

- **regression test:** 같은 commit에서 fault-allocation sweep의 reader allocation 횟수가 새 fixed allocation에 맞게 조정됩니다. protocol/read-fault의 직접 회귀는 후속 `dbf76e147e68`이 EIO/EINTR와 NUL/overlength/EOF cases로 제공합니다.

#### 학습자가 복원할 핵심 기록 — A
- **직전 관련 상태와 문제:** checker lifecycle은 완성됐지만 reader가 실제 명령 protocol보다 넓고 transient interruption을 구분하지 않았습니다.
- **주요 boundary/decision:** 길이·NUL 유효성 검사를 dispatch가 아니라 byte를 받는 reader에 배치해 invalid frame이 command 비교 전에 차단됩니다.
- **state / ownership / failure 변화:** frame은 매 호출 한 번의 4-byte project allocation입니다. error와 clean EOF에서 reader가 해제하고 pointer를 NULL로 만들며, status 1일 때만 caller가 frame을 소유합니다.
- **보장 / 비보장:** bounded memory, NUL/4번째 byte reject, EINTR retry, EOF framing을 보장합니다. exact command membership은 여전히 dispatcher 책임이고 write failure는 다루지 않습니다.
- **후속 검증 또는 수정 연결:** `dbf76e147e68`이 read call별 fault injection과 protocol boundaries를 deterministic하게 검증합니다. output hardening은 Thread 6으로 이어집니다.
- **Thread의 다음 관련 commit:** `dbf76e147e68`은 command bytes와 final EOF probe 각각의 read call을 어떻게 선택해 EIO/EINTR를 주입하는가?

### `dbf76e147e68` — test(checker): 읽기 실패와 명령 경계를 검증
- **Importance:** A
- **Tags:** TEST, CHECKER, RISK
- **Source-confirmed role:** Injects read faults and verifies NUL, empty, overlength, long-stream, and EOF-delimited boundaries.
- **Classification summary:** Injects permanent and interrupted reads and tests malformed, overlong, NUL, empty, and unterminated frames.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only dbf76e147e68`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `dbf76e147e68` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- runtime read counter와 selected-call `EIO`/`EINTR` injection 구현을 확인합니다.
- `sa\n` + EOF 전체 read sequence에 permanent failure를 sweep하는 test를 확인합니다.
- early command byte와 final EOF probe의 `EINTR`가 retry success로 이어지는 test를 확인합니다.
- embedded NUL, >3 bytes, empty command, standalone NUL, 64 KiB overlong frame rejection을 확인합니다.
- EOF-only terminated valid `sa`가 적용되어 `OK`가 되는 케이스를 확인합니다.
- allocation-reporting fault build를 통해 same cases의 frame leak도 함께 검사하는지 확인합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### Test commit 학습 기록
- **대상 production invariant:** max-3/no-NUL frame, `EINTR` retry, other read error reject, EOF-delimited final command acceptance, 모든 종료에서 frame allocation cleanup입니다.
- **재현하는 failure/boundary:** runtime `ps_read` call counter가 environment-selected call에서 EIO 또는 EINTR를 반환합니다. `sa\n`의 `s`, `a`, newline, final EOF probe에 EIO를 각각 주입하고, 첫 byte와 EOF probe에는 EINTR를 주입합니다. embedded NUL, `rrrr`, empty line, NUL-only, 64KiB overlong, unterminated `sa`도 사용합니다.
- **test technique:** deterministic read fault injection + protocol boundary CLI regression + live-allocation reporting입니다.
- **통과하는 production path:** fault checker → `read_next_line` → runtime `ps_read` injection → retry/error/frame return → dispatch/verdict 또는 error cleanup → `ps_test_finish` allocation report입니다.
- **이 테스트가 증명하는 것:** 지정 read calls의 permanent failure가 error가 되고 transient EINTR는 같은 read를 재시도해 성공하며, malformed frames는 dispatch 전에 거절되고 valid EOF final frame은 적용되어 `OK`가 됨을 확인합니다. 각 case의 live allocation도 0이어야 합니다.
- **이 테스트가 증명하지 않는 것:** arbitrary errno, signal timing의 실제 비결정성, write failure, 모든 possible byte stream을 exhaustive하게 증명하지 않습니다.
- **성격:** deterministic fault regression과 protocol boundary regression입니다.
- **막는 후속 회귀:** EINTR를 permanent failure로 되돌리기, 4번째 byte/NUL 허용, EOF probe 실패 누락, error path frame leak을 막습니다.

#### 학습자가 복원할 핵심 기록 — A
- **직전 관련 상태와 문제:** fix의 branch는 존재했지만 실제 read call 위치별 permanent/transient fault와 hostile frame을 자동으로 재현하는 증거가 없었습니다.
- **주요 boundary/decision:** runtime seam에서 call count를 세고 selected call만 EIO/EINTR로 바꿔 reader의 정확한 branch를 반복 가능하게 실행합니다.
- **state / ownership / failure 변화:** production normal behavior는 유지되고 fault build에 read counter/env controls가 생깁니다. test harness는 stderr의 allocation report까지 검사해 frame cleanup을 함께 관찰합니다.
- **보장 / 비보장:** source에 명시된 read/protocol cases의 regression을 제공합니다. output write와 closed-pipe behavior는 Thread 6이 담당합니다.
- **후속 검증 또는 수정 연결:** `315f4b91779b`/`e1154e181864`가 같은 runtime 경계를 write-all과 output fault injection으로 확장합니다.
- **Thread 내 다음 commit:** 없음. Thread 최종 상태에서 이 commit의 남은 역할을 정리합니다.

## 6. Invariant ledger

| Invariant / contract | 처음 도입 | 강화 | 부족함이 드러난 지점 | fix | regression / evidence | 학습자 확인 메모 |
| --- | --- | --- | --- | --- | --- | --- |
| checker final success = sorted A + empty B | d906f4d86528 | - | - | - | 44ee0830e9f0 | `stack_is_complete_sorted` 뒤에만 `OK`; valid EOF지만 predicate false면 `KO` status 0입니다. |
| frame 최대 3 non-newline bytes / NUL 금지 | - | - | 0b87adebca2b는 unbounded general reader | 7713a31cf502 | dbf76e147e68 | reader가 4-byte buffer를 한 번 할당하고 4번째 byte 또는 NUL을 저장 전에 오류로 만듭니다. |
| `read` EINTR retry / other error reject | - | - | 0b87adebca2b에서는 interrupted read도 failure | 7713a31cf502 | dbf76e147e68 | errno==EINTR만 loop를 계속하고 EIO 등은 buffer free+NULL+-1입니다. selected-call injection이 두 경로를 구분합니다. |

## 7. Failure → Fix → Test 연결

| Failure / risk | 기존 또는 선택한 대응 | Fix commit | Test / evidence | 학습자 root-cause 기록 |
| --- | --- | --- | --- | --- |
| valid but unsorted/unfinished stream | `KO` normal verdict | d906f4d86528 | 44ee0830e9f0 | protocol과 transport가 정상 종료됐으므로 process error가 아니라 final-state negative verdict입니다. |
| unbounded command frame / embedded NUL / overlength | bounded protocol reader | 7713a31cf502 | dbf76e147e68 | general line abstraction이 protocol length와 binary NUL을 reader에서 제한하지 않은 것이 원인입니다. |
| transient `EINTR`를 permanent failure로 취급 | `EINTR` retry | 7713a31cf502 | dbf76e147e68 | 모든 negative read를 동일 처리했던 정책을 errno별 retry/reject로 나눴습니다. |

## 8. Ownership / state / responsibility 변화

| 대상 | 이 Thread 시작 시 | 변화 commit | 이 Thread 종료 시 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| checker stack A/B | checker executable ownership 없음 | d906f4d86528 | main이 parse/init 후 소유하고 verdict/error 모든 경로에서 해제 | `d906f4d86528:src/checker.c:main` |
| reader-owned command frame | 없음 | 0b87adebca2b, 7713a31cf502 | status 1에서 caller 소유, EOF/error에서는 reader가 해제+NULL; 고정 4바이트 | `7713a31cf502:src/checker_reader.c:read_next_line` |
| command dispatcher | 없음 | f79ae7e86592 | 11개 exact name을 shared `op_*` emit=0으로 매핑 | `f79ae7e86592:src/checker.c:apply_checker_command` |
| verdict output boundary | 없음 | d906f4d86528 | clean EOF 뒤 complete predicate로 OK/KO, malformed/read failure는 Error | `d906f4d86528:src/checker.c:main` |

## 9. Thread 최종 상태
- **Source 기준 최종 상태:** checker는 값 인자를 parse해 A를 소유하고 동일 capacity B를 만든 뒤, 최대 3바이트·NUL 금지 frame을 한 번의 fixed allocation으로 읽습니다. `EINTR`는 재시도하고 다른 read error는 정리 후 실패합니다. 11개 exact command는 shared operation을 `emit=0`으로 적용합니다. clean EOF에만 A sorted+B empty를 검사해 `OK` 또는 normal `KO`를 출력하고, malformed input/command, allocation, I/O failure는 `Error`와 non-zero status입니다.
- **남아 있는 한계 / 다른 Thread로 넘어가는 책임:** 이 Thread 마지막 시점의 핵심 reader 경계는 fault tests로 보호되지만 output write 자체의 short/zero/EPIPE와 SIGPIPE는 Thread 6의 `315f4b91779b`/`e1154e181864`가 맡습니다. 현재 환경에서는 test executable을 실행하지 않았고, 문서의 test 결과 범위는 해당 SHA의 test code와 assertions를 확인한 것입니다.

## 10. 최종 architecture 또는 execution flow 정리
- Source-derived flow anchor: ``parse initial A → allocate B → bounded frame read → exact dispatch with `emit=0` → clean EOF → complete-state predicate → `OK`/`KO` or error cleanup``
- **학습자 최종 flow:** `d906f4d86528:main`이 no-values를 reader 전에 반환하거나 A/B를 구성합니다 → `7713a31cf502:read_next_line`이 4-byte buffer에서 protocol frame을 만들고 EINTR를 재시도합니다 → `f79ae7e86592:apply_checker_command`가 exact command를 `op_*` emit=0으로 적용합니다 → frame을 해제하고 반복합니다 → clean EOF면 `stack_is_complete_sorted`, 그 외 오류면 A/B cleanup+Error입니다.
- **실제 코드 삽입:** 초기 `0b87adebca2b`는 `grow_line`으로 arbitrary buffer를 두 배 확장했지만, fix는 위와 같이 `PS_COMMAND_MAX + 1`을 한 번 할당하고 NUL/4번째 byte를 reader에서 차단합니다. 이 비교가 protocol boundary 이동의 핵심입니다.

## 11. 학습 완료 자가 점검
- [x] Thread commit 순서를 source와 동일하게 유지했습니다.
- [x] 모든 commit에서 지정된 SHA의 코드를 직접 확인했습니다.
- [x] final HEAD를 과거 commit 설명에 소급 사용하지 않았습니다.
- [x] Source-confirmed fact와 직접 코드 확인 결과를 구분했습니다.
- [x] S/A commit은 decision, invariant, ownership/failure, 후속 evidence까지 추적했습니다.
- [x] B commit은 Thread 흐름에서 맡는 구현 역할과 필요한 state/boundary만 충분히 확인했습니다.
- [x] test commit마다 production invariant, failure/boundary, technique, production path, 증명/비증명 범위를 구분했습니다.
- [x] fix commit은 기존 가정 → failure/risk → root cause → 수정 invariant → 실제 코드 → regression evidence 순서로 연결했습니다.
- [x] Invariant ledger와 Failure → Fix → Test 표를 실제 코드 근거로 채웠습니다.
- [x] 별도 프로젝트 재학습 없이 이 Thread의 설계 → 구현 → 실패/위험 → 수정/검증 흐름을 commit history에 근거해 설명할 수 있습니다.
