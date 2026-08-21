# Thread: Output becomes part of protocol commit

> 완성형 해설서가 아닙니다. 아래 확정 사항을 기준으로 각 commit SHA의 실제 코드와 diff를 읽고 기록란을 채웁니다.

## 1. Thread 목표

single `write`를 호출하던 helper가 all-or-failure write contract로 바뀌고, payload·terminator·recovery delimiter·PID output이 성공한 뒤에만 protocol ACK를 보낼 수 있게 되는 commit boundary를 복원합니다.

### Significance

server의 in-memory state와 stdout은 분리된 효과가 아닙니다. state transition 뒤 ACK를 보내고 stdout이 실패하면 client는 실제로 보이지 않은 data를 success로 판단합니다. `mt_write_all`이 local completion contract를 만들고 S-level fix가 output-before-ACK order를 정의하며 fault tests가 normal output과 abandoned-session recovery newline을 함께 고정합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- `write`의 EINTR, short count, zero count, terminal error를 `mt_write_all`은 각각 어떻게 처리하는가?
- completed byte 또는 NUL delimiter에서 state mutation, stdout write, ACK send의 실제 순서는 무엇인가?
- PID publication failure는 endpoint와 process cleanup에 어떻게 전파되는가?
- `SIGPIPE` ignore로 closed stdout을 `EPIPE`로 관측하는 이유는 무엇인가?
- output success 뒤 ACK datagram이 유실되는 경우까지 이 invariant가 해결하는가?
- dead-owner recovery newline failure가 owner reset과 replacement READY를 왜 막아야 하는가?

## 3. 완료 기준

- [x] `mt_write_all` loop invariant와 pointer/remaining update를 코드로 설명했습니다.
- [x] PID, payload byte, NUL newline, recovery newline의 output-to-ACK ordering을 기록했습니다.
- [x] output failure가 event loop → main → endpoint cleanup → client failure로 전파되는 path를 작성했습니다.
- [x] fault-injection mode를 production branch와 process result에 연결했습니다.
- [x] local commit guarantee와 non-exactly-once limit를 구분했습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `826dd34c378f` | fix(io): 중단·부분 쓰기를 끝까지 처리 | A | OUTPUT_COMMIT, PRACTICAL, RISK | `mt_write_all`이 EINTR를 retry하고 short write만큼 offset을 전진하며 zero progress를 `EIO`로 처리합니다. |
| 2 | `db2004556d8b` | fix(server): stdout 실패 뒤 ACK 전송 차단 | S | CORE, OUTPUT_COMMIT, RISK | PID, payload, terminator newline, recovery newline을 all-or-failure로 쓰고 failure 시 triggering ACK를 보내지 않습니다. |
| 3 | `9aa80e047514` | test(server): 부분 쓰기와 출력 실패 검증 | A | TEST, OUTPUT_COMMIT, RISK | low-level write를 deterministic test implementation으로 바꿔 EINTR, one-byte short write, zero write, selected payload/newline EPIPE를 주입합니다. |
| 4 | `081a882d7fa3` | test(server): 회수 줄바꿈 출력 실패 검증 | A | TEST, OUTPUT_COMMIT, SESSION | dead owner가 visible partial line을 남긴 상태에서 replacement acquisition이 recovery newline을 쓰는 순간 failure를 주입합니다. |

확인 원칙:

- 각 항목은 해당 SHA의 tree를 기준으로 읽었습니다.
- 변경 전 상태는 해당 SHA의 parent 또는 지정된 이전 관련 SHA에서 확인했습니다.
- 같은 commit이 다른 Thread에 다시 등장해도 이 Thread의 질문으로 별도 기록했습니다.
- runtime test는 실행하지 않았으며, 실행 결과처럼 표현하지 않았습니다.

## 5. Commit별 학습 기록

### 1. `826dd34c378f` — fix(io): 중단·부분 쓰기를 끝까지 처리

- **Importance:** A
- **Tags:** OUTPUT_COMMIT, PRACTICAL, RISK
- **Thread 내 역할:** `mt_write_all`이 EINTR를 retry하고 short write만큼 offset을 전진하며 zero progress를 `EIO`로 처리합니다.

#### 원문에서 확정된 맥락

string/number helpers가 이 primitive를 사용합니다. success는 모든 requested bytes가 descriptor interface에 전달됐다는 뜻이며 terminal error는 숨기지 않습니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] `mt_write_all`의 zero-length 성공 경로
- [x] `bytes + offset`과 `size - offset`을 사용하는 progress loop
- [x] positive short write 뒤 offset 증가
- [x] `EINTR`만 retry하는 branch
- [x] `write == 0`에서 `errno = EIO`와 failure
- [x] `mt_putstr_fd`/`mt_putnbr_fd`가 새 primitive를 호출하는 diff

#### 비교 기준

초기 `bf8163cdd7dd`의 single-write helper와 비교하면, 한 syscall 성공 여부가 아니라 requested byte 전체의 누적 완료가 success contract가 됩니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: `src/write_utils.c`의 기존 출력 helper는 단일 `write` 호출의 반환값을 완전한 출력으로 취급했습니다. `mt_putstr_fd`와 `mt_putnbr_fd`는 partial progress를 복구할 공통 primitive가 없었습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: POSIX `write`는 signal에 의해 `EINTR`로 중단되거나 요청 길이보다 적은 양만 쓸 수 있습니다. 0을 반환하면 offset이 전진하지 않아 단순 retry loop도 무한 반복할 수 있습니다.
- 변경된 decision과 state mutation 순서: `mt_write_all(int fd, const void *buffer, size_t size)`를 추가하고 `const unsigned char *bytes`, `size_t offset`, `ssize_t written`으로 progress를 명시적으로 추적했습니다. `offset = 0` → `write(fd, bytes + offset, size - offset)` → `EINTR`이면 같은 offset으로 retry → positive short count면 그 수만큼 offset 증가 → offset이 size에 도달하면 success입니다. `size == 0`은 loop를 건너뛰어 성공합니다.
- 정상 경로와 failure 경로가 갈라지는 조건: `write == -1 && errno == EINTR`만 retry합니다. 다른 `-1`은 그대로 실패하고, `write == 0`은 `errno = EIO`로 바꾼 뒤 실패합니다. 이 SHA의 `mt_putstr_fd`/`mt_putnbr_fd`는 새 primitive를 호출하지만 반환값은 아직 상위 protocol 판단에 연결하지 않습니다.
- 후속 commit이 강화하거나 교체하는 부분: `db2004556d8b`가 이 helper의 반환값을 PID publication, payload, NUL delimiter, recovery delimiter의 ACK 조건에 연결합니다. `9aa80e047514`가 모든 progress branch를 deterministic hook으로 검증합니다.

#### Fix 연결 기록

| 단계 | Source에서 확정된 내용 | 해당 SHA의 코드 근거 |
| --- | --- | --- |
| 기존 가정 | 한 번의 successful `write` call이 requested buffer 전체를 출력합니다. | 직전 helper는 반환 count를 누적하지 않는 single-call 구현이었습니다. |
| 실제 failure 또는 위험 | `EINTR`, short write, zero progress에서 PID·diagnostic·protocol-visible output이 잘리거나 loop가 멈출 수 있습니다. | `write`의 반환 count와 remaining length를 저장하는 state가 없었습니다. |
| root cause | descriptor write를 partial-progress interface가 아니라 atomic completion operation으로 취급했습니다. | 새 구현은 `offset`과 `written`을 분리해 progress를 직접 관리합니다. |
| 수정 invariant/decision | success는 모든 bytes를 쓴 경우뿐이며 interruption은 retry하고 short count만큼 전진합니다. | `mt_write_all`의 `while (offset < size)`와 세 반환 branch |
| regression | `9aa80e047514`가 first-call EINTR, one-byte short write, zero write를 주입합니다. | `tests/write_fault.c`, `tests/output_failure.sh`, fault server build seam |

- 변경 전 failure를 재현하거나 추론할 수 있는 입력/상태: 직전 상태와 해당 분기를 직접 비교했습니다.
- root cause가 드러나는 field 또는 call order: `offset = 0` → `write(fd, bytes + offset, size - offset)` → `EINTR`이면 같은 offset으로 retry → positive short count면 그 수만큼 offset 증가 → offset이 size에 도달하면 success입니다. `size == 0`은 loop를 건너뛰어 성공합니다.
- 수정된 invariant를 고정하는 후속 regression test: `9aa80e047514`의 deterministic write-fault suite입니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] complete-or-fail descriptor write
- [x] partial progress와 interruption 처리
- [x] zero progress를 무한 loop가 아닌 `EIO`로 종료

**아직 보장하지 않는 것**

- [x] server ACK ordering
- [x] endpoint cleanup
- [x] exactly-once output
- [x] 상위 void helper에서 error 전달

#### 코드 증거 기록

- 파일 경로: `src/write_utils.c`, `include/minitalk.h`
- symbol 또는 함수: `mt_write_all`, `mt_putstr_fd`, `mt_putnbr_fd`
- 확인한 state fields: `offset`, `written`
- caller → callee: `mt_putstr_fd`/`mt_putnbr_fd` → `mt_write_all` → `write`
- 핵심 branch 또는 mutation 순서: `offset = 0` → `write(fd, bytes + offset, size - offset)` → `EINTR`이면 같은 offset으로 retry → positive short count면 그 수만큼 offset 증가 → offset이 size에 도달하면 success입니다. `size == 0`은 loop를 건너뛰어 성공합니다.
- parent 또는 이전 관련 SHA와의 diff 요약: single `write` 사용을 공통 progress loop로 교체했습니다. protocol code가 return value를 검사하는 단계는 아직 아닙니다.
- 삽입한 최소 코드 조각과 선택 이유: SHA `826dd34c378f`, `src/write_utils.c`, `mt_write_all`. partial progress, EINTR, zero-progress failure를 한 번에 보여 주는 최소 loop입니다.

```c
bytes = (const unsigned char *)buffer;
offset = 0;
while (offset < size)
{
    written = write(fd, bytes + offset, size - offset);
    if (written == -1 && errno == EINTR)
        continue ;
    if (written == -1)
        return (-1);
    if (written == 0)
    {
        errno = EIO;
        return (-1);
    }
    offset += (size_t)written;
}
```

- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`db2004556d8b`에서 local write success가 protocol commit condition이 됩니다.
### 2. `db2004556d8b` — fix(server): stdout 실패 뒤 ACK 전송 차단

- **Importance:** S
- **Tags:** CORE, OUTPUT_COMMIT, RISK
- **Thread 내 역할:** PID, payload, terminator newline, recovery newline을 all-or-failure로 쓰고 failure 시 triggering ACK를 보내지 않습니다.

#### 원문에서 확정된 맥락

`SIGPIPE`를 ignore해 closed output을 `EPIPE` return으로 처리합니다. output failure는 event loop 밖으로 전파되고 recovery reset도 delimiter write failure를 반환합니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] server startup의 `SIGPIPE` ignore
- [x] PID publication의 all-or-failure write와 startup failure
- [x] payload write 성공 뒤 line state 변경
- [x] NUL newline 성공 뒤 session reset
- [x] recovery newline 성공 뒤 coupled reset
- [x] bit processor → event loop → main error 전파
- [x] output failure branch에서 triggering ACK 생략
- [x] output success 뒤 ACK send failure의 남은 한계

#### 비교 기준

`826dd34c378f`의 local writer contract를 server call sites에 연결합니다. parent와 달리 `reset_session`과 `flush_byte`가 fallible `int`를 반환하고 그 결과가 event loop 종료까지 전달됩니다.

#### S-level 재구성

- 이 commit 직전의 관련 state와 caller/callee: writer primitive는 complete-or-fail이 됐지만 server의 protocol state transition과 ACK 순서가 output success에 종속되지 않았고 일부 출력 helper는 failure를 상위로 전달하지 않았습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: state를 완료하고 ACK부터 보내면 stdout이 partial 또는 `EPIPE`여도 client는 bit가 성공했다고 판단합니다. dead-owner recovery에서도 field를 먼저 clear한 뒤 newline이 실패하면 두 session의 visible boundary가 사라집니다.
- 변경된 decision과 state mutation 순서: server의 PID, payload byte, NUL newline, recovery newline을 모두 `mt_write_all`의 반환값으로 검사하고 output error를 bit processor/event loop/main까지 전파했습니다. `SIGPIPE`는 `SIG_IGN`으로 설정해 process-killing signal 대신 error return을 받습니다. startup은 endpoint/handlers 준비 → PID text와 newline complete write → event loop입니다. completed payload는 byte write 성공 뒤 `g_line_started = 1`; NUL은 newline write 성공 뒤 session reset; recovery는 필요한 newline write 성공 뒤 coupled fields reset; 그 후에만 triggering ACK를 보냅니다.
- 정상 경로와 failure 경로가 갈라지는 조건: 어느 required write든 실패하면 processor 또는 reset이 `-1`을 반환하고 event loop/main이 종료하며 ACK는 생략됩니다. output은 성공했지만 subsequent `sendto` ACK가 실패하는 branch는 여전히 가능하고 이미 보인 output을 rollback하지 않습니다.
- 후속 commit이 강화하거나 교체하는 부분: `9aa80e047514`가 normal startup/payload/NUL failure를, `081a882d7fa3`이 recovery delimiter failure를 실제 production path의 hook으로 고정합니다.

| 추적 항목 | 학습자 기록 | 코드 근거 |
| --- | --- | --- |
| 직전 architecture/state | writer는 all-or-failure지만 server ACK 판단과 output result가 아직 결합되지 않았습니다. | parent server output call sites와 `826dd34c378f: mt_write_all` |
| 해결하려던 핵심 문제 | 보이지 않은 payload 또는 delimiter를 client가 성공으로 오인하는 false ACK입니다. | payload/NUL/recovery write와 response order |
| 실패 가능한 interleaving 또는 partial failure | stdout complete 전 ACK, recovery fields clear 후 newline EPIPE, PID 일부 출력 후 startup 지속입니다. | `flush_byte`, `reset_session`, PID publication branch |
| 선택한 decision | 모든 required output을 fallible commit 단계로 만들고 ACK보다 먼저 완료합니다. | `mt_write_all` return checks와 processor return propagation |
| ownership/lifecycle/state transition | event loop가 state/output/ACK 순서를 소유하며 failure면 main/cleanup으로 전파합니다. | `process_bit` → loop → main → `cleanup_server` |
| 후속 fix 또는 regression evidence | normal output faults와 recovery newline fault를 별도 deterministic tests로 나눴습니다. | `9aa80e047514`, `081a882d7fa3` |

#### Fix 연결 기록

| 단계 | Source에서 확정된 내용 | 해당 SHA의 코드 근거 |
| --- | --- | --- |
| 기존 가정 | byte state를 완성하면 ACK를 보내도 됩니다. | 직전 code는 stdout completion을 authoritative success predicate로 사용하지 않았습니다. |
| 실제 failure 또는 위험 | stdout partial/`EPIPE`에도 client가 success를 관측할 수 있습니다. | output과 response가 서로 다른 실패 가능한 외부 효과입니다. |
| root cause | in-memory transition과 visible output commit order가 분리됐습니다. | 수정 diff가 write return을 processor/loop return과 ACK condition에 연결합니다. |
| 수정 invariant/decision | required output complete 뒤에만 triggering ACK를 보내고, recovery delimiter 성공 전에는 owner를 reset/reassign하지 않습니다. | `flush_byte`, `reset_session`, `process_bit`의 return/order |
| regression | `9aa80e047514`와 `081a882d7fa3`이 각 output site의 false-success를 검증합니다. | write fault hook, client timeout, server exit, endpoint removal assertions |

- 변경 전 failure를 재현하거나 추론할 수 있는 입력/상태: 직전 상태와 해당 분기를 직접 비교했습니다.
- root cause가 드러나는 field 또는 call order: startup은 endpoint/handlers 준비 → PID text와 newline complete write → event loop입니다. completed payload는 byte write 성공 뒤 `g_line_started = 1`; NUL은 newline write 성공 뒤 session reset; recovery는 필요한 newline write 성공 뒤 coupled fields reset; 그 후에만 triggering ACK를 보냅니다.
- 수정된 invariant를 고정하는 후속 regression test: `9aa80e047514` normal output suite와 `081a882d7fa3` recovery-newline suite입니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] visible output before success ACK
- [x] PID publication 실패 시 false readiness 방지
- [x] recovery delimiter가 session handoff의 commit 조건
- [x] output failure 뒤 endpoint cleanup path 진입

**아직 보장하지 않는 것**

- [x] atomic output+ACK transaction
- [x] ACK-loss dedup/retry
- [x] remote persistence
- [x] 이미 성공한 output rollback

#### 코드 증거 기록

- 파일 경로: `src/server.c`, `src/write_utils.c`, `include/minitalk.h`
- symbol 또는 함수: `install_signal_handlers`, `reset_session`, `flush_byte`, `process_bit`, `run_event_loop`, `main`, `mt_write_all`
- 확인한 state fields: `g_current_byte`, `g_received_bits`, `g_client_pid`, `g_line_started`, `g_sequence`
- caller → callee: event loop → `process_bit` → `flush_byte`/`reset_session` → `mt_write_all`; success 뒤 `send_response`
- 핵심 branch 또는 mutation 순서: startup은 endpoint/handlers 준비 → PID text와 newline complete write → event loop입니다. completed payload는 byte write 성공 뒤 `g_line_started = 1`; NUL은 newline write 성공 뒤 session reset; recovery는 필요한 newline write 성공 뒤 coupled fields reset; 그 후에만 triggering ACK를 보냅니다.
- parent 또는 이전 관련 SHA와의 diff 요약: void 또는 unchecked output를 fallible calls로 바꾸고, 모든 관련 caller가 failure를 위로 반환하도록 수정했습니다. `SIGPIPE` 처리도 startup contract에 추가됐습니다.
- 삽입한 최소 코드 조각과 선택 이유: SHA `db2004556d8b`, `src/server.c`, `reset_session`. visible delimiter가 성공하기 전에는 owner와 partial state를 지우지 않는 commit order를 보여 줍니다.

```c
static int reset_session(int close_partial_line)
{
    if (close_partial_line && g_line_started
        && mt_write_all(STDOUT_FILENO, "\n", 1) == -1)
        return (-1);
    g_current_byte = 0;
    g_received_bits = 0;
    g_client_pid = 0;
    g_line_started = 0;
    g_sequence = 0;
    return (0);
}
```

- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`9aa80e047514`가 normal output failures를, `081a882d7fa3`이 recovery newline failure를 검증합니다.
### 3. `9aa80e047514` — test(server): 부분 쓰기와 출력 실패 검증

- **Importance:** A
- **Tags:** TEST, OUTPUT_COMMIT, RISK
- **Thread 내 역할:** low-level write를 deterministic test implementation으로 바꿔 EINTR, one-byte short write, zero write, selected payload/newline EPIPE를 주입합니다.

#### 원문에서 확정된 맥락

complete output under partial progress와 startup/message failure의 no-false-success, endpoint cleanup, client timeout을 검증합니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] production write를 hook으로 바꾸는 fault build seam
- [x] first-call EINTR mode
- [x] 한 call당 1 byte short-write mode
- [x] selected zero/EPIPE call state
- [x] partial progress 뒤 complete output assertion
- [x] PID zero-write startup failure
- [x] payload/NUL newline EPIPE 뒤 no ACK와 cleanup

#### 비교 기준

`826dd34c378f`의 `mt_write_all` branches와 `db2004556d8b`의 PID/payload/NUL output sites를 test mode별로 일대일 매핑합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: production code에는 all-or-failure loop와 output-before-ACK branch가 있었지만 actual kernel timing에 의존하면 EINTR/short/zero/특정 EPIPE 지점을 반복 재현하기 어려웠습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: 일반 smoke test는 write가 항상 한 번에 완료되는 환경에서 success path만 통과할 수 있어 partial-progress 알고리즘과 각 output failure의 ACK 억제를 증명하지 못합니다.
- 변경된 decision과 state mutation 순서: fault build에서 production `write` 호출을 test wrapper로 치환하고 환경/내부 call state로 first EINTR, one-byte maximum, selected zero, selected byte/newline EPIPE를 결정적으로 반환합니다. Makefile fault target → `tests/write_fault.c` hook 선택 → real server algorithm 실행 → shell scenario가 server/client status, stdout/stderr, socket path를 관측합니다. EINTR/short mode는 같은 logical output을 완성하고, zero/EPIPE mode는 server error와 no-success response로 끝납니다.
- 정상 경로와 failure 경로가 갈라지는 조건: startup PID zero-write는 PID publication 전에 실패합니다. payload 또는 terminating newline EPIPE는 bit processor가 실패하고 ACK가 없어 client가 bounded timeout합니다. short/EINTR mode는 offset loop가 계속 진행해 expected bytes를 완성합니다.
- 후속 commit이 강화하거나 교체하는 부분: `081a882d7fa3`이 같은 seam을 dead-owner recovery newline이라는 별도 branch에 적용합니다.

#### Test commit 분석 기록

- **대상 production invariant:** stdout effect가 complete되지 않으면 해당 transition을 success ACK하지 않습니다.
- **재현하는 failure 또는 boundary:** EINTR, one-byte short write, zero progress, payload/newline EPIPE
- **사용한 test technique:** compile-time/link-time write hook against the real server algorithm
- **분류:** deterministic production-path fault regression
- **failure 주입 또는 process orchestration 시작 지점:** Makefile의 fault server build가 `tests/write_fault.c`를 연결하고 `tests/output_failure.sh`가 mode별 환경을 설정합니다.
- **production code에 진입하는 최초 호출:** server PID publication 또는 signal event가 `mt_write_all`을 호출하면서 test hook에 진입합니다.
- **핵심 assertion과 관측값:** short/EINTR에서는 expected output 완성, zero/EPIPE에서는 nonzero server/client status, timeout diagnostic, no false payload, bound endpoint 제거를 검사합니다.
- **증명하는 것:** partial progress 보존<br>EINTR retry<br>zero progress failure<br>required output failure 뒤 no false ACK<br>startup/message cleanup
- **증명하지 않는 것:** recovery delimiter branch<br>output success 뒤 datagram loss<br>exactly-once<br>실제 시스템 부하에서 모든 scheduling
- **후속 변경에서 막아야 할 구체적인 회귀:** writer가 short count를 무시하거나 output error 뒤 ACK를 보내는 변경을 막습니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] EINTR/short write에서도 complete output
- [x] zero progress의 controlled startup failure
- [x] payload/NUL failure 뒤 false ACK 방지
- [x] server endpoint cleanup과 client bounded failure

**아직 보장하지 않는 것**

- [x] recovery newline failure
- [x] output success 뒤 ACK loss
- [x] exactly-once transaction
- [x] 모든 OS write failure 조합

#### 코드 증거 기록

- 파일 경로: `Makefile`, `tests/write_fault.c`, `tests/write_fault.h`, `tests/output_failure.sh`, `src/write_utils.c`, `src/server.c`
- symbol 또는 함수: `mt_test_write`, `mt_write_all`, `fault server target`, `output_failure.sh scenarios`
- 확인한 state fields: `fault call count`, `selected mode`, `selected byte/newline ordinal`
- caller → callee: fault server의 `mt_write_all` → test hook → configured return; shell → real client/server process 관측
- 핵심 branch 또는 mutation 순서: Makefile fault target → `tests/write_fault.c` hook 선택 → real server algorithm 실행 → shell scenario가 server/client status, stdout/stderr, socket path를 관측합니다. EINTR/short mode는 같은 logical output을 완성하고, zero/EPIPE mode는 server error와 no-success response로 끝납니다.
- parent 또는 이전 관련 SHA와의 diff 요약: production binary는 유지하고 test-only link seam과 fault server target, process-level assertion script를 추가했습니다.
- 삽입할 최소 코드 조각과 선택 이유: 표와 호출 순서만으로 invariant가 충분히 드러나므로 코드 덤프를 추가하지 않았습니다.
- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`081a882d7fa3`에서 recovery delimiter까지 같은 invariant를 검증합니다.
### 4. `081a882d7fa3` — test(server): 회수 줄바꿈 출력 실패 검증

- **Importance:** A
- **Tags:** TEST, OUTPUT_COMMIT, SESSION
- **Thread 내 역할:** dead owner가 visible partial line을 남긴 상태에서 replacement acquisition이 recovery newline을 쓰는 순간 failure를 주입합니다.

#### 원문에서 확정된 맥락

server는 event loop를 종료하고 replacement client는 READY/ACK success가 아니라 timeout해야 합니다. fields만 clear하고 visible boundary를 쓰지 못한 상태를 successful recovery로 보지 않습니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] visible partial session setup
- [x] owner exit 뒤 replacement ACQUIRE 순서
- [x] recovery newline ordinal을 선택하는 fault mode
- [x] delimiter EPIPE 뒤 server error exit
- [x] replacement client timeout/no READY
- [x] endpoint cleanup과 new payload 미출력 assertion

#### 비교 기준

`db2004556d8b: reset_session(close_partial_line)`의 write-before-clear order와 `9aa80e047514`의 hook seam을 함께 사용합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: `9aa80e047514`는 PID, normal payload, NUL delimiter를 검증했지만 competing ACQUIRE가 dead owner를 회수하면서 쓰는 별도 newline branch는 다루지 않았습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: recovery branch가 field reset과 reassignment만 성공으로 처리하면 newline EPIPE 뒤에도 replacement client에게 READY를 보내 두 session의 visible output이 합쳐질 수 있습니다.
- 변경된 decision과 state mutation 순서: specialized partial sender로 complete visible byte와 unfinished state를 남긴 뒤 owner를 종료하고, replacement ACQUIRE 시 두 번째 newline write에 EPIPE를 주입하도록 fault mode를 확장했습니다. server start → partial-session helper가 acquire/visible byte/partial bit 후 exit → replacement client ACQUIRE → owner unavailable 판단 → `reset_session(1)`의 recovery newline write → injected EPIPE → reset/READY 생략 → loop/main failure → endpoint cleanup; replacement client는 timeout합니다.
- 정상 경로와 failure 경로가 갈라지는 조건: delimiter write가 실패하면 coupled fields를 clear하지 않고 `reset_session`이 `-1`을 반환합니다. event loop는 종료되고 replacement READY와 subsequent bit ACK 모두 전송되지 않습니다.
- 후속 commit이 강화하거나 교체하는 부분: 이 commit이 Thread final regression입니다. 후속 상태에서도 recovery output은 successful handoff의 선행 조건이어야 합니다.

#### Test commit 분석 기록

- **대상 production invariant:** visible abandoned line을 delimit하기 전에는 owner reassignment가 완료되지 않습니다.
- **재현하는 failure 또는 boundary:** new ACQUIRE 중 recovery newline EPIPE
- **사용한 test technique:** partial-session real process + selected write fault + real replacement client
- **분류:** failure-path-specific deterministic regression
- **failure 주입 또는 process orchestration 시작 지점:** session sender가 visible byte와 partial next byte를 남기고 종료한 뒤 replacement client를 실행합니다.
- **production code에 진입하는 최초 호출:** server의 competing ACQUIRE path가 unavailable owner를 확인하고 `reset_session(1)`을 호출합니다.
- **핵심 assertion과 관측값:** server/client nonzero status, client timeout diagnostic, server endpoint removal, replacement message 미출력, abandoned line 이후 성공 boundary 부재를 검사합니다.
- **증명하는 것:** delimiter failure suppresses reassignment<br>READY/ACK 없음<br>server fail-stop<br>cleanup 실행
- **증명하지 않는 것:** recovery retry<br>output rollback<br>delimiter 성공 뒤 ACK loss<br>다중 replacement 경쟁
- **후속 변경에서 막아야 할 구체적인 회귀:** fields를 먼저 clear하거나 delimiter failure 뒤 READY를 보내는 변경을 막습니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] failed recovery delimiter가 READY/ACK를 억제
- [x] owner reassignment false success 방지
- [x] unrecoverable output failure 뒤 fail-stop cleanup

**아직 보장하지 않는 것**

- [x] recovery retry
- [x] 이미 출력된 partial line rollback
- [x] delimiter 성공 뒤 ACK loss
- [x] persistent output transaction

#### 코드 증거 기록

- 파일 경로: `tests/output_failure.sh`, `tests/session_sender.c`, `tests/write_fault.c`, `src/server.c`
- symbol 또는 함수: `reset_session`, `session_sender partial mode`, `recovery-newline fault scenario`
- 확인한 state fields: `g_line_started`, `g_client_pid`, `g_current_byte`, `g_received_bits`, `g_sequence`, `fault newline count`
- caller → callee: replacement ACQUIRE handling → owner availability recovery → `reset_session(1)` → `mt_write_all` → fault hook
- 핵심 branch 또는 mutation 순서: server start → partial-session helper가 acquire/visible byte/partial bit 후 exit → replacement client ACQUIRE → owner unavailable 판단 → `reset_session(1)`의 recovery newline write → injected EPIPE → reset/READY 생략 → loop/main failure → endpoint cleanup; replacement client는 timeout합니다.
- parent 또는 이전 관련 SHA와의 diff 요약: 기존 output fault suite에 dead-owner recovery setup과 selected recovery-newline failure assertion을 추가했습니다.
- 삽입할 최소 코드 조각과 선택 이유: 표와 호출 순서만으로 invariant가 충분히 드러나므로 코드 덤프를 추가하지 않았습니다.
- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

이 commit이 Thread final regression입니다.

## 6. Invariant ledger

### Source에서 확정된 핵심 invariant

- writer success는 requested bytes 전체가 descriptor interface에 전달됐음을 뜻합니다.
- EINTR와 short write는 progress를 보존해 끝까지 처리하며 zero write는 `EIO`입니다.
- payload byte 또는 delimiter ACK는 corresponding stdout write success 뒤에만 전송됩니다.
- recovery delimiter failure는 session reassignment success로 처리되지 않습니다.
- unrecoverable output failure는 cleanup path로 전파되고 false ACK를 막습니다.

### 시간에 따른 변화 기록

| Commit | Source에서 확정된 변화 | 실제 state/condition | code evidence | 상태: 도입·강화·부족·복구·검증 |
| --- | --- | --- | --- | --- |
| `826dd34c378f` | `mt_write_all`이 EINTR를 retry하고 short write만큼 offset을 전진하며 zero progress를 `EIO`로 처리합니다. | `offset`이 requested `size`에 도달해야 success이고, zero progress는 `EIO`입니다. | `src/write_utils.c: mt_write_all` | 도입 |
| `db2004556d8b` | PID, payload, terminator newline, recovery newline을 all-or-failure로 쓰고 failure 시 triggering ACK를 보내지 않습니다. | output success가 ACK 전에 필요한 protocol commit condition이 되고 recovery fields는 delimiter 성공 뒤에만 clear됩니다. | `src/server.c: flush_byte`, `reset_session`, bit processor response order | 강화·수정 |
| `9aa80e047514` | low-level write를 deterministic test implementation으로 바꿔 EINTR, one-byte short write, zero write, selected payload/newline EPIPE를 주입합니다. | fault hook이 production progress/commit branches를 결정적으로 선택하고 process-level outcomes를 확인합니다. | `tests/write_fault.c`, `tests/output_failure.sh`, Makefile fault target | 검증 |
| `081a882d7fa3` | dead owner가 visible partial line을 남긴 상태에서 replacement acquisition이 recovery newline을 쓰는 순간 failure를 주입합니다. | recovery delimiter가 성공하지 않으면 owner/reset/reassignment transition이 commit되지 않습니다. | `tests/output_failure.sh` recovery scenario와 `src/server.c: reset_session` | 검증 |

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 상태 | 실제 failure/위험 | Fix 또는 전환 commit | 수정된 decision/invariant | Test 또는 후속 검증 | 학습자 code evidence |
| --- | --- | --- | --- | --- | --- |
| single `write` success를 complete output으로 간주 | EINTR/short write에서 PID·payload truncation 가능 | `826dd34c378f` | `mt_write_all` all-or-failure loop | `9aa80e047514` | writer hook의 EINTR/one-byte/zero branches |
| state transition 후 ACK부터 전송 | stdout failure에도 client가 success 관측 | `db2004556d8b` | output complete 뒤 ACK, failure면 server exit | `9aa80e047514` | payload/newline EPIPE, timeout, cleanup assertions |
| dead-owner fields를 먼저 reset | recovery newline failure에도 clean handoff로 오인 | `db2004556d8b` | delimiter success를 recovery commit 조건에 포함 | `081a882d7fa3` | recovery newline EPIPE 뒤 no READY/ACK |

전용 test commit이 없는 연결에는 존재하지 않는 test를 만들어 적지 않았습니다.

## 8. Ownership / state / responsibility 변화

| 단계 | state 또는 responsibility owner | transition | 당시 한계 또는 다음 변화 | 실제 symbol/field |
| --- | --- | --- | --- | --- |
| write primitive | `mt_write_all` caller | offset와 remaining을 끝까지 소유 | success 의미 통일 | `bytes`, `offset`, `written` |
| server byte commit | event loop/bit processor | state 판단 → stdout → ACK | write failure 시 ACK 없음 | `flush_byte`, `process_bit`, `g_sequence` |
| recovery commit | session reset caller | delimiter success 뒤 reset/reassign | failure 시 server 종료 | `reset_session(close_partial_line)` |
| startup | main/initialization | PID line complete write 뒤 ready | false readiness 방지 | PID buffer/publication path, `cleanup_server` |

## 9. Thread 최종 상태

Source에서 확정된 최종 조건:

- 모든 protocol-visible server output은 all-or-failure writer를 사용합니다.
- ACK는 triggering bit가 요구한 visible output effect가 성공한 뒤에만 전송됩니다.
- closed stdout pipe는 asynchronous termination 대신 `EPIPE` error path로 처리됩니다.
- output success 뒤 ACK loss는 남으므로 exactly-once transaction은 아닙니다.

학습자 기록:

- 최종 state fields와 owner: `mt_write_all`의 `offset`이 local write progress를 소유하고, event loop가 `g_current_byte`, `g_received_bits`, `g_client_pid`, `g_line_started`, `g_sequence`와 output/ACK 순서를 소유합니다.
- 정상 transition 순서: bit event가 byte 또는 delimiter completion을 결정한 뒤 `mt_write_all`이 필요한 output을 모두 완료합니다. 성공한 경우에만 line/session state를 commit하고 matching ACK를 보냅니다.
- 실패 시 중단·reset·cleanup 순서: EINTR은 retry하고 short count는 누적합니다. zero/terminal error는 processor→event loop→main failure로 전파되며 triggering ACK를 생략하고 registered cleanup이 descriptor와 bound endpoint를 정리합니다.
- 최종 상태가 보장하지 않는 것: output과 ACK의 원자적 transaction, output rollback, ACK 재전송·deduplication, remote persistence는 제공하지 않습니다.
- 이 Thread를 한 문단으로 설명한 최종 서술: 이 Thread는 descriptor write를 partial-progress interface로 바로잡은 뒤 그 success를 server protocol의 commit 조건으로 끌어올립니다. PID, payload, NUL delimiter와 abandoned-session delimiter는 모두 complete write 뒤에만 다음 state나 ACK로 넘어갑니다. deterministic fault tests는 EINTR·short·zero·EPIPE의 각 branch를 고정하지만 output 성공 후 ACK 손실까지 제거하지는 못합니다.

## 10. 최종 architecture 또는 execution flow 정리

- [x] bit event로 byte/delimiter completion 결정
- [x] output buffer와 length 선택
- [x] `mt_write_all` retry/advance loop
- [x] write success 뒤 state reset 또는 line state update
- [x] matching ACK send
- [x] write failure에서 ACK 생략과 event-loop error
- [x] main exit와 endpoint cleanup

```text
signal event in normal event loop
    -> authorize and append one bit
    -> if byte incomplete: prepare ACK
    -> if payload complete: mt_write_all(payload)
    -> if NUL complete: mt_write_all("\n") -> reset session
    -> only after required output: send matching ACK
output failure
    -> processor -1 -> event loop -1 -> main failure
    -> no triggering ACK -> cleanup socket/pipe/path
dead-owner recovery
    -> if visible line: mt_write_all("\n")
    -> success only: clear coupled fields and consider reassignment

```

- 실제 함수·파일을 반영한 완성 흐름: `src/server.c`의 bit processor/`flush_byte`/`reset_session`과 `src/write_utils.c: mt_write_all`이 output commit path를 구성합니다.
- asynchronous boundary: signal handler는 event만 enqueue하며 stdout commit과 ACK 판단은 event loop normal context에서 실행됩니다.
- externally visible commit point: 현재 transition이 요구하는 stdout bytes가 모두 쓰이고, 그 뒤 matching ACK를 전송하는 시점입니다. output 성공 자체와 ACK delivery는 하나의 원자적 transaction이 아닙니다.
- cleanup owner: server main/registered cleanup이 output 또는 response failure 뒤 response socket, self-pipe, bound path를 정리합니다.

## 11. 학습 완료 자가 점검

- [x] commit map의 4개 SHA를 source 순서대로 모두 설명할 수 있습니다.
- [x] 각 code excerpt에 SHA, path, symbol, 선택 이유가 기록돼 있습니다.
- [x] final HEAD 코드를 historical SHA의 증거로 사용한 곳이 없습니다.
- [x] 정상 경로와 failure path를 state mutation 순서로 설명할 수 있습니다.
- [x] source 확정 invariant와 직접 확인한 code evidence를 구분했습니다.
- [x] test commit의 invariant, failure, technique, production path, proves/not-proves를 기록했습니다.
- [x] Thread final state를 함수와 state field 수준으로 설명할 수 있습니다.
- [ ] 해당 SHA의 test를 로컬에서 직접 실행했습니다. — 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

### 이 Thread와 직접 연결된 Major Engineering Difficulties

- partial descriptor progress와 protocol state progress를 같은 commit order로 묶어야 합니다.
- output success 뒤 ACK loss는 exactly-once transaction 없이 완전히 제거할 수 없습니다.
- PID, payload, NUL newline, recovery newline의 모든 output sites를 같은 contract로 바꿔야 합니다.
