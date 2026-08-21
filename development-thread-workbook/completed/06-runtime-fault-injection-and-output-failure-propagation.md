# Thread: Runtime fault injection and output failure propagation

## 1. Thread 목표
- **Source significance:** The thread changes failure handling from implicit assumptions into an explicit runtime contract. The generator's product is an externally visible command stream, so successful in-memory sorting cannot compensate for an incomplete write. The final design preserves already-written prefixes, stops further emission, cleans all owned memory, and reports failure when the transport cannot deliver the complete result.
- **학습 목표:** 초기 output helper의 실패 무시 상태에서 runtime seam, allocation fault sweep, write-all contract, `SIGPIPE` 처리, partial-output regression evidence까지 발전하는 cross-cutting failure architecture를 복원합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문
- 초기 `ps_putstr_fd`의 single-write/no-status 계약은 어떤 failure를 관찰할 수 없게 하는가?
- `ps_malloc`/`ps_free`/`ps_read` wrapper가 domain code를 바꾸지 않고 fault injection seam을 어떻게 제공하는가?
- Nth-allocation failure sweep이 partial construction cleanup을 어떻게 검증하는가?
- `ps_write_all`은 `EINTR`, short positive write, zero-byte write, permanent error를 어떻게 구분하는가?
- 이미 stdout에 보인 prefix가 있는 상태에서 왜 rollback을 시도하지 않고 emission을 중단하는가?
- closed pipe를 `SIGPIPE` termination 대신 ordinary write failure로 바꾸는 경로는 어디인가?

## 3. 완료 기준
- allocation/read/write system boundary가 runtime wrapper로 모이는 실제 호출 경로를 확인했습니다.
- fault build의 allocation header/live-count와 `ps_test_finish` exit reporting을 추적했습니다.
- 315f4b91779b의 status propagation을 output helper → operation → sorter → main까지 따라갔습니다.
- partial stdout prefix, failed verdict, failed diagnostic, closed pipe 케이스의 exit/cleanup을 test 코드와 production 코드로 연결했습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Source-confirmed role |
| --- | --- | --- | --- | --- | --- |
| 1 | `2e97f29961d8` | feat(io): 문자열 비교와 기본 출력을 구현 | B | RUNTIME, PRACTICAL | Centralizes basic text output but initially ignores write results. |
| 2 | `5faa9d7697af` | refactor(runtime): 메모리와 입력 시스템 호출을 공통화 | A | ARCH, REFACTOR, RUNTIME | Creates runtime wrappers for allocation and input, providing an instrumentation seam. |
| 3 | `63969f770a21` | test(memory): 할당 실패 뒤 자원 정리를 검증 | A | TEST, RUNTIME, RISK | Uses that seam to sweep allocation failures and prove zero live allocations. |
| 4 | `315f4b91779b` | fix(io): 출력 실패를 호출 경로 끝까지 전파 | A | RUNTIME, RISK, INTEGRATION | Extends the runtime contract to write-all behavior, `SIGPIPE` handling, and end-to-end failure propagation. |
| 5 | `e1154e181864` | test(io): 부분 출력과 영구 쓰기 실패를 검증 | A | TEST, RUNTIME, RISK | Verifies interrupted, short, zero, permanent, diagnostic, and closed-pipe write paths. |

### Source에서 직접 연결된 invariant / engineering difficulty
- **Critical invariants**
  - A successful `push_swap` execution means the complete emitted stream was written successfully; a merely sorted in-memory state is insufficient.
  - Short positive writes advance the output cursor, zero-byte writes are failures, and a closed pipe is handled as an ordinary error rather than process termination.
- **Major engineering difficulties**
  - Handling allocation failure, interrupted reads and writes, short writes, zero-byte writes, closed pipes, and already-visible output prefixes without transactional rollback.

## 5. Commit별 학습 기록

> 모든 코드 확인은 반드시 해당 commit SHA 시점에서 수행합니다. final HEAD의 구현을 소급해 해석하지 않습니다.

### `2e97f29961d8` — feat(io): 문자열 비교와 기본 출력을 구현
- **Importance:** B
- **Tags:** RUNTIME, PRACTICAL
- **Source-confirmed role:** Centralizes basic text output but initially ignores write results.
- **Classification summary:** Adds project-local string comparison, descriptor output, and the canonical error message.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only 2e97f29961d8`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `2e97f29961d8` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- `ps_strlen`, exact string comparison, descriptor output, canonical `Error\n` utility boundary를 확인합니다.
- `ps_strcmp`가 `unsigned char` 비교를 사용하는지 확인합니다.
- `ps_putstr_fd`가 single `write`를 수행하고 failure status를 노출하지 않는 API를 확인합니다.
- parser/operation/executable에서 direct `write` 대신 utility를 사용하게 되는 경계를 확인합니다.
- Makefile common-object 분류가 stack/utils를 shared core로 만드는 위치를 확인합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### 학습자가 복원할 구현 기록 — B
- **직전 관련 상태:** project-local exact string comparison과 공통 output/error helper가 없거나 direct system call에 흩어질 수 있는 상태였습니다.
- **이 commit의 구현 역할:** `2e97f29961d8:src/utils.c`에 `ps_strlen`, unsigned-char 기반 `ps_strcmp`, descriptor에 문자열을 쓰는 `ps_putstr_fd`, canonical `write_error`를 추가해 checker dispatch와 두 executable이 공통 text API를 사용하게 합니다.
- **핵심 state transition 또는 boundary:** `ps_strcmp`는 exact NUL-terminated command membership을 제공하고, `write_error`는 stderr에 `Error\n`을 쓰는 한 지점이 됩니다. output helper는 문자열 길이를 구해 `write` 한 번을 호출합니다.
- **failure/no-op/edge:** `ps_putstr_fd`와 `write_error`의 반환형이 `void`이고 `write` 결과를 버리므로 short write, `EINTR`, zero, EPIPE를 caller가 알 수 없습니다.
- **이후 연결:** `5faa9d7697af`가 memory/read system call도 runtime boundary로 모으고, `315f4b91779b`가 output helper를 fallible write-all API로 바꿉니다.
- **Thread의 다음 관련 commit:** `5faa9d7697af`는 parser/stack/checker의 direct allocation/read를 어떤 matching wrapper pair로 치환해 fault injection seam을 만드는가?

### `5faa9d7697af` — refactor(runtime): 메모리와 입력 시스템 호출을 공통화
- **Importance:** A
- **Tags:** ARCH, REFACTOR, RUNTIME
- **Source-confirmed role:** Creates runtime wrappers for allocation and input, providing an instrumentation seam.
- **Classification summary:** Routes allocation, free, and read operations through a dedicated runtime boundary.

#### Source-confirmed context
- **Problem:** Allocation and read failures occur below domain logic, but direct calls scattered across parser, stack, and checker code make those failures difficult to inject, count, and verify consistently.
- **Decision:** Introduce `ps_malloc`, `ps_free`, and `ps_read` as a shared runtime boundary and migrate project-owned memory and checker input through it without changing normal semantics.
- **Why it mattered:** The abstraction enables later Nth-allocation failure sweeps, live-allocation accounting, read fault injection, write instrumentation, and resource metrics. It also gives all project allocations one matching release path.
- **What changed:** A runtime module is added, parser scratch storage, stack buffers, and checker command buffers migrate to it, and the low-level operation test links only the objects it actually requires.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only 5faa9d7697af`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `5faa9d7697af` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- `ps_malloc`, `ps_free`, `ps_read` wrapper 정의와 normal build delegation을 확인합니다.
- parser scratch buffer, stack buffers, checker command buffer가 direct libc/POSIX call에서 runtime wrapper로 이동하는 diff를 확인합니다.
- runtime에서 얻은 memory가 matching `ps_free`로 해제되는지 caller별로 추적합니다.
- operation-invariant test가 필요한 object만 링크하도록 dependency graph가 줄어든 부분을 확인합니다.
- behavior change 없이 observability/testability seam만 추가되었는지 비교합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### 학습자가 복원할 핵심 기록 — A
- **직전 관련 상태와 문제:** stack 두 buffer, parser sorted scratch, checker frame이 각각 direct `malloc/free`를 쓰고 reader가 direct `read`를 호출해, 특정 acquisition만 실패시키거나 outstanding allocation을 일관되게 셀 수 없었습니다.
- **주요 boundary/decision:** `5faa9d7697af:src/runtime.c`에 normal build에서는 libc/POSIX에 그대로 위임하는 `ps_malloc`, `ps_free`, `ps_read`를 추가하고 project-owned memory/input call site를 모두 이 경계로 이동했습니다.
- **state / ownership / failure 변화:** ownership 자체는 변하지 않습니다. `stack_init`이 얻은 두 buffer는 `stack_free`가 `ps_free`, `assign_ranks` scratch는 같은 함수가 `ps_free`, status 1 checker frame은 loop가 `ps_free`합니다. matching pair가 한 API로 모여 instrumentation 가능한 상태가 됩니다.
- **보장 / 비보장:** normal build의 의도된 semantics는 direct call과 같고 domain API를 바꾸지 않습니다. 아직 wrapper 자체는 failure를 주입·보고하지 않으며 output은 여전히 이 경계 밖에서 unchecked입니다.
- **후속 검증 또는 수정 연결:** `63969f770a21`이 compile-time fault build에서 Nth malloc과 live count를 구현하고, `dbf76e147e68`이 `ps_read`에 selected-call EIO/EINTR를 추가합니다. `315f4b91779b`는 write boundary까지 확장합니다.
- **Thread의 다음 관련 commit:** `63969f770a21`은 successful allocation 앞에 어떤 header를 배치하고 모든 executable exit에서 outstanding count를 어떻게 검증하는가?

### `63969f770a21` — test(memory): 할당 실패 뒤 자원 정리를 검증
- **Importance:** A
- **Tags:** TEST, RUNTIME, RISK
- **Source-confirmed role:** Uses that seam to sweep allocation failures and prove zero live allocations.
- **Classification summary:** Adds an instrumented build that fails the Nth allocation and reports live allocations at exit.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only 63969f770a21`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `63969f770a21` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- `PS_FAULT_INJECTION`에서 allocation call counter와 selected Nth `NULL` injection을 확인합니다.
- successful allocation에 붙는 aligned header와 live-allocation tracking 구조를 확인합니다.
- 모든 executable exit가 `ps_test_finish`를 거쳐 non-zero live count를 별도 failure로 보고하는지 확인합니다.
- Python suite가 representative push_swap/checker path의 모든 allocation point와 one-past-last baseline을 sweep하는지 확인합니다.
- 각 injected failure에서 public `Error` behavior와 zero live allocations를 동시에 검사하는지 확인합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### Test commit 학습 기록
- **대상 production invariant:** project allocation이 어느 acquisition에서 실패해도 executable은 partial ownership을 정리하고 종료 시 live project allocation이 0이어야 합니다.
- **재현하는 failure/boundary:** `PS_FAIL_MALLOC_AT=N`이 N번째 `ps_malloc`을 `NULL`로 만듭니다. representative `push_swap`은 allocation 1~5를, checker는 1~6을 각각 실패시키고 one-past-last 6/7을 정상 baseline으로 실행합니다.
- **test technique:** compile-time deterministic Nth-allocation fault injection + exhaustive acquisition-point sweep for selected paths + exit live-count reporting입니다.
- **통과하는 production path:** fault binary → parser stack/sorted scratch 또는 B/checker frame `ps_malloc` → selected NULL → 해당 cleanup/error path → 모든 main return의 `ps_test_finish` → Python stderr/status assertion입니다.
- **이 테스트가 증명하는 것:** 선택한 representative paths에서 각 allocation point의 실패가 public non-zero/`Error` behavior로 끝나고 `PS_LIVE_ALLOCATIONS=0`을 보고하며, one-past-last가 실제 모든 acquisition을 통과하는 baseline임을 확인합니다.
- **이 테스트가 증명하지 않는 것:** libc 내부 allocation, read/write fault, 모든 argv/command path, invalid/double free의 일반 검출은 증명하지 않습니다. header magic/live count는 project wrapper를 통과한 memory에 한정됩니다.
- **성격:** deterministic fault regression이며 selected path의 allocation points를 sweep합니다.
- **막는 후속 회귀:** 두 번째 stack buffer 실패 시 첫 번째 buffer 누수, parser scratch 실패 cleanup 누락, checker frame/error path 누수, main early return이 `ps_test_finish`를 우회하는 변경을 막습니다.

#### 학습자가 복원할 핵심 기록 — A
- **직전 관련 상태와 문제:** runtime seam은 있었지만 allocation 실패 위치와 live ownership을 관찰하는 구현·test가 없었습니다.
- **주요 boundary/decision:** `PS_FAULT_INJECTION` build에서 allocation call count와 env-selected failure를 두고, successful allocation 앞에는 `long double`/pointer alignment를 만족하는 union header를 붙여 magic·size를 보관합니다.
- **state / ownership / failure 변화:** successful `ps_malloc`은 live count를 증가시키고 `ps_free`는 header magic을 지운 뒤 감소시킵니다. 모든 executable return은 `ps_test_finish(status)`를 거쳐 requested report에서 nonzero live count면 status 99를 반환합니다.
- **보장 / 비보장:** selected normal/error construction의 leak-free cleanup을 deterministic하게 확인합니다. source mutation, invalid pointer, output delivery는 범위 밖입니다.
- **후속 검증 또는 수정 연결:** `6569949742eb`이 같은 header size로 current/peak requested bytes를 추가하고, `e1154e181864`이 write failures에서도 live count 0을 확인합니다.
- **Thread의 다음 관련 commit:** `315f4b91779b`은 unchecked single write를 어떤 return contract로 바꾸고, 그 status가 첫 failed emission 뒤 sorter를 어떻게 중단시키는가?

### `315f4b91779b` — fix(io): 출력 실패를 호출 경로 끝까지 전파
- **Importance:** A
- **Tags:** RUNTIME, RISK, INTEGRATION
- **Source-confirmed role:** Extends the runtime contract to write-all behavior, `SIGPIPE` handling, and end-to-end failure propagation.
- **Classification summary:** Adds write-all semantics, `SIGPIPE` handling, and status propagation through operations, sorting, checker, and both mains.

#### Source-confirmed context
- **Problem:** The earlier output helper ignored write results. A command could mutate in-memory state but fail to reach stdout, and a closed pipe could terminate the process through `SIGPIPE` before normal cleanup.
- **Decision:** Add a write-all loop that retries `EINTR`, advances after short writes, rejects zero or permanent failures, ignores `SIGPIPE`, and returns status through output helpers, operation wrappers, sort helpers, checker verdicts, and both executable entry points.
- **Why it mattered:** The generator's actual product is the external command stream, not the final private stack state. The change prevents incomplete delivery from being reported as success, stops further generation after failure, preserves already-visible prefixes without repetition, and still releases all owned resources.
- **What changed:** Operation and sorting APIs become fallible, checker verdict writes are checked, both mains initialize pipe behavior and convert output failure to status one, and error reporting is attempted without replacing the original failure.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only 315f4b91779b`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `315f4b91779b` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- `ps_write_all` loop의 `EINTR` retry, short-positive cursor advance, zero-byte failure, permanent error branch를 확인합니다.
- `ps_putstr_fd`/diagnostic → operation wrapper → sorting helper → top-level sort → `main`까지 status return이 어떻게 전파되는지 추적합니다.
- 첫 failed emission 뒤 추가 command generation을 중단하는 caller branch를 확인합니다.
- 이미 written prefix를 rollback/repeat하지 않고 stack cleanup + failure status로 끝내는 흐름을 확인합니다.
- checker `OK`/`KO` write result 검증과 secondary `Error` write failure가 original failure status를 덮지 않는지 확인합니다.
- output-capable execution 전에 `SIGPIPE`를 ignore하는 위치와 closed-pipe write error 경로를 확인합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### Fix chain 복원
- **기존 가정:** `2e97f29961d8:ps_putstr_fd`는 command/error string을 single `write`로 보내고 return을 버렸으며 operation/sorter/main은 모두 `void` 또는 unconditional success 흐름이었습니다.
- **실제 failure 또는 위험:** short write는 command 일부만 보이게 하고도 성공으로 끝날 수 있고, `EINTR`는 재시도되지 않으며, zero write는 진척 없이 누락되고, EPIPE는 기본 `SIGPIPE`로 cleanup 전에 process를 종료할 수 있습니다. private stack 정렬은 incomplete public stream을 보상하지 못합니다.
- **root cause:** output transport result가 API contract에 포함되지 않아 호출 계층 어디에서도 실패를 관찰·중단·보고할 수 없었고, pipe signal policy도 초기화되지 않았습니다.
- **수정된 invariant/decision:** success는 requested byte 전부가 쓰인 경우만 1입니다. `EINTR`는 같은 cursor/count로 retry하고, positive short write는 cursor/count를 전진시키며, zero/permanent error는 0입니다. operation과 sorter는 첫 0을 즉시 반환하고 두 main은 cleanup 후 status 1을 유지합니다. `SIGPIPE`는 ignore해 EPIPE return path로 바꿉니다.
- **실제 수정 코드:** `315f4b91779b:src/runtime.c:ps_write_all`은 다음 loop를 사용합니다.

```c
while (count > 0)
{
    written = ps_write_once(fd, cursor, count);
    if (written < 0 && errno == EINTR)
        continue ;
    if (written <= 0)
        return (0);
    cursor += (size_t)written;
    count -= (size_t)written;
}
```

  `315f4b91779b:src/operations.c:op_*`는 state primitive를 먼저 적용한 뒤 `emit_op` status를 반환합니다. `315f4b91779b:src/sort.c`의 모든 연속 command branch는 이전 call이 0이면 다음 command를 호출하지 않습니다. `src/push_swap.c:main`은 A/B를 free한 뒤 diagnostic을 시도하고 원래 status를 `ps_test_finish`에 전달합니다.
- **regression test:** 후속 `e1154e181864`이 EINTR, one-byte short, zero, permanent failure, short-then-fail prefix, verdict/diagnostic failure, real closed pipe를 직접 주입·관찰합니다.

#### 학습자가 복원할 핵심 기록 — A
- **직전 관련 상태와 문제:** allocation/read는 runtime seam과 fault tests를 가졌지만 output은 unchecked single write라 external product completeness가 성공 조건이 아니었습니다.
- **주요 boundary/decision:** write-all을 가장 낮은 runtime boundary에 두고 status를 `ps_putstr_fd` → `emit_op`/`op_*` → tiny/radix helpers → `sort_stack` → main까지 동일 방향으로 올립니다. checker verdict도 같은 helper를 사용합니다.
- **state / ownership / failure 변화:** operation은 private state를 먼저 mutate한 뒤 emit합니다. 따라서 failed command의 state가 이미 진행됐을 수 있지만 sorter는 즉시 중단하고 private A/B를 해제합니다. 이미 성공한 stdout prefix는 되돌리거나 다시 쓰지 않습니다. 이는 transaction rollback이 아니라 prefix-preserving failure입니다.
- **보장 / 비보장:** complete write만 success, no zero-write loop, short-write 정확 전진, closed pipe ordinary failure, cleanup과 original status 보존을 보장합니다. stdout에 이미 보인 prefix를 원자적으로 회수하거나 command 단위 atomicity를 보장하지는 않습니다.
- **후속 검증 또는 수정 연결:** `e1154e181864`이 runtime write seam을 확장해 각 branch와 partial prefix를 검증합니다. resource command counter는 성공 emission 뒤에만 증가해야 한다는 Thread 4 invariant와도 연결됩니다.
- **Thread의 다음 관련 commit:** `e1154e181864`은 baseline stream의 각 write 위치와 short-then-fail 조합을 어떻게 주입해 누락·중복 없는 prefix를 확인하는가?

### `e1154e181864` — test(io): 부분 출력과 영구 쓰기 실패를 검증
- **Importance:** A
- **Tags:** TEST, RUNTIME, RISK
- **Source-confirmed role:** Verifies interrupted, short, zero, permanent, diagnostic, and closed-pipe write paths.
- **Classification summary:** Injects short, zero, interrupted, and permanent writes, including closed-pipe and diagnostic failures.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only e1154e181864`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `e1154e181864` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- write fault runtime의 interrupted/short/zero/permanent mode와 selected-call injection을 확인합니다.
- successful multi-command baseline을 기록한 뒤 각 command write를 차례로 실패시키는 sweep을 확인합니다.
- `EINTR` 및 one-byte short write가 exact baseline stream을 재구성하는 assertion을 확인합니다.
- short write 후 permanent failure에서 stdout이 정확한 successfully-written prefix만 포함하는지 확인합니다.
- checker verdict write failure, diagnostic write failure, already-closed pipe case를 각각 확인합니다.
- 모든 write failure case에서 allocation cleanup이 끝까지 도달하는지 확인합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### Test commit 학습 기록
- **대상 production invariant:** `ps_write_all`은 EINTR/short를 완성하고 zero/permanent를 실패시키며, 첫 unrecoverable failure 뒤 추가 output을 만들지 않고 이미 쓴 prefix만 유지하고 cleanup/status failure에 도달해야 합니다.
- **재현하는 failure/boundary:** fault runtime은 selected write call에 `EINTR`, EPIPE, 0, 또는 count를 1로 줄이는 short를 주입합니다. `push_swap 3 2 1`의 multi-command baseline 각 write failure, first-call EINTR/short/zero, short first+permanent second, checker verdict, parse/command diagnostic, 실제 closed stdout pipe를 사용합니다.
- **test technique:** deterministic selected-call write fault injection + exact-byte baseline/prefix comparison + real pipe closure + live-allocation report입니다.
- **통과하는 production path:** fault binary → output helper → `ps_write_all`/injected `ps_write_once` → operation/sorter or verdict/diagnostic caller → stack/frame cleanup → `ps_test_finish` allocation report입니다.
- **이 테스트가 증명하는 것:** EINTR와 one-byte short가 baseline byte stream을 정확히 완성하고, zero/permanent는 non-zero status가 되며, short-then-fail stdout은 baseline의 첫 1바이트만 포함해 반복/건너뜀 없이 멈춥니다. verdict/diagnostic failure와 real closed pipe도 process signal termination 대신 failure cleanup으로 끝나고 live allocation 0이어야 합니다.
- **이 테스트가 증명하지 않는 것:** 모든 OS/device behavior, concurrent writers, command 단위 atomicity, 임의의 여러 short/EINTR 조합 전체를 exhaust하지 않습니다.
- **성격:** deterministic I/O fault regression과 closed-pipe integration regression입니다.
- **막는 후속 회귀:** short write를 full success로 오인, cursor 미전진으로 prefix 반복, zero write 무한 loop, failure 뒤 다음 command emission, SIGPIPE cleanup 우회, diagnostic failure가 original status를 성공으로 바꾸는 변경을 막습니다.

#### 학습자가 복원할 핵심 기록 — A
- **직전 관련 상태와 문제:** production fix는 있었지만 syscall edge와 partial externally visible stream을 반복 가능하게 검증하는 test seam이 없었습니다.
- **주요 boundary/decision:** write call counter와 env-selected mode를 `ps_write_once`에 배치하고, exact baseline byte string을 먼저 얻어 성공 복구는 equality, permanent failure는 exact prefix로 비교합니다.
- **state / ownership / failure 변화:** fault build write counter가 추가되지만 normal build semantics는 유지됩니다. 모든 test case는 allocation report를 요청해 output failure가 main/frame cleanup을 건너뛰지 않는지 함께 봅니다.
- **보장 / 비보장:** source가 열거한 interrupted/short/zero/permanent/verdict/diagnostic/closed-pipe 회귀를 제공합니다. 이미 출력된 byte rollback은 요구하지 않고 prefix preservation과 failure status를 요구합니다.
- **후속 검증 또는 수정 연결:** Thread 최종 regression layer이며 source는 이 이후 추가 output hardening commit을 지정하지 않습니다.
- **Thread 내 다음 commit:** 없음. Thread 최종 상태에서 이 commit의 남은 역할을 정리합니다.

## 6. Invariant ledger

| Invariant / contract | 처음 도입 | 강화 | 부족함이 드러난 지점 | fix | regression / evidence | 학습자 확인 메모 |
| --- | --- | --- | --- | --- | --- | --- |
| complete emitted stream까지 성공해야 `push_swap` success | - | - | 2e97f29961d8은 write result를 무시 | 315f4b91779b | e1154e181864 | `ps_write_all` 0이 operation/sorter/main으로 올라가며 main은 A/B free 후 status 1을 반환합니다. baseline write sweep이 incomplete delivery를 success로 숨기지 못하게 합니다. |
| short write cursor advance / zero write failure / closed pipe ordinary error | - | - | - | 315f4b91779b | e1154e181864 | positive count만큼 cursor/count를 갱신하고 `written <= 0`은 실패합니다. `SIGPIPE` ignore 후 closed pipe가 EPIPE return으로 들어갑니다. |
| owned allocation은 모든 exit path에서 release | 5faa9d7697af runtime boundary | 63969f770a21에서 failure sweep | - | - | 63969f770a21, e1154e181864 | wrapper allocation은 matching `ps_free`, 모든 main exit는 `ps_test_finish`; allocation 및 write fault cases에서 report 0을 요구합니다. |

## 7. Failure → Fix → Test 연결

| Failure / risk | 기존 또는 선택한 대응 | Fix commit | Test / evidence | 학습자 root-cause 기록 |
| --- | --- | --- | --- | --- |
| allocation 중간 실패 후 leak | runtime allocation seam + cleanup paths | - | 63969f770a21 | direct allocation을 wrapper로 모으고 Nth failure 뒤 stack/scratch/frame owner가 cleanup한 후 live count 0을 확인합니다. |
| write failure가 성공으로 숨음 | `ps_write_all` + end-to-end status propagation | 315f4b91779b | e1154e181864 | output helper가 status를 버리고 sorter/main이 fallible하지 않았던 것이 원인입니다. 모든 계층을 int success contract로 변경했습니다. |
| short write에서 중복/누락, zero write 무한 반복 위험 | cursor advance + zero-write failure | 315f4b91779b | e1154e181864 | positive actual bytes만큼 cursor/count를 갱신하고 0을 terminal failure로 처리합니다. exact baseline/prefix가 이를 검증합니다. |
| closed pipe가 cleanup 전에 `SIGPIPE`로 종료 | `SIGPIPE` ignore 후 write error 처리 | 315f4b91779b | e1154e181864 | output-capable main이 먼저 signal policy를 설정해 EPIPE가 return path와 stack cleanup을 통과하게 합니다. |

## 8. Ownership / state / responsibility 변화

| 대상 | 이 Thread 시작 시 | 변화 commit | 이 Thread 종료 시 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| runtime allocation boundary | project code의 direct malloc/free/read | 5faa9d7697af | 모든 project-owned memory/input이 `ps_malloc`/`ps_free`/`ps_read`를 통과 | `5faa9d7697af:src/runtime.c` 및 migrated callers |
| fault-injection allocation header/counters | 없음 | 63969f770a21, 6569949742eb | aligned header가 magic/size를 보유하고 live/current/peak를 fault build에서 계측 | `63969f770a21:src/runtime.c:ps_malloc/ps_free` |
| stdout command stream | single unchecked write, delivery 책임 없음 | 315f4b91779b | complete write만 success; prefix 뒤 failure면 즉시 generation 중단 | `315f4b91779b:src/runtime.c:ps_write_all`, `src/sort.c` |
| stderr diagnostic stream | unchecked `Error\n` | 315f4b91779b | diagnostic도 write-all을 시도하지만 실패해도 이미 선택된 original error status는 유지 | `315f4b91779b:src/push_swap.c:main`, `src/checker.c:main` |
| main-level stack cleanup | ordinary parse/sort/checker errors에서 cleanup | 63969f770a21, 315f4b91779b | allocation/output/closed-pipe failure에서도 owned stacks를 free하고 `ps_test_finish` 경유 | `315f4b91779b:src/push_swap.c:main`, `src/checker.c:main` |

## 9. Thread 최종 상태
- **Source 기준 최종 상태:** project memory와 input은 runtime wrappers를 통과하고 fault build는 Nth allocation, selected read/write, live allocation을 관찰합니다. output은 `ps_write_all`이 EINTR를 재시도하고 short write만큼 전진하며 zero/permanent를 실패시킵니다. emitting operation이 실패하면 tiny/radix caller가 즉시 반환하고 두 main은 private state를 정리한 뒤 status 1을 보존합니다. `SIGPIPE`는 ignore되어 closed pipe도 같은 ordinary error path를 통과합니다. 이미 쓰인 stdout prefix는 rollback하지 않되 반복하지도 않습니다.
- **남아 있는 한계 / 다른 Thread로 넘어가는 책임:** command 단위 원자성이나 visible prefix rollback은 보장하지 않으며 의도된 contract도 아닙니다. fault tests는 열거된 deterministic syscall 결과와 selected positions를 다루며 모든 kernel/device/concurrency 조합을 증명하지 않습니다. 이 환경에서는 binary를 실행하지 못했으므로 test result를 새로 주장하지 않고 각 SHA의 implementation과 assertion만 확인했습니다.

## 10. 최종 architecture 또는 execution flow 정리
- Source-derived flow anchor: `basic output → runtime seam → allocation fault sweep → write-all + status propagation + SIGPIPE policy → injected write regressions`
- **학습자 최종 flow:** `2e97f29961d8:ps_putstr_fd`의 unchecked single write → `5faa9d7697af:runtime.c`의 malloc/free/read seam → `63969f770a21`의 aligned header/Nth failure/`ps_test_finish` → `315f4b91779b:ps_write_all`의 retry/progress/failure contract → `operations.c:emit_op/op_*` → `sort.c`의 첫 failure 즉시 반환 → `push_swap.c`/`checker.c` cleanup, optional diagnostic, original status → `e1154e181864`의 exact baseline/prefix와 closed-pipe regression입니다.
- **실제 코드 삽입:** 핵심 decision은 위 `ps_write_all` loop와 `sort.c`의 반복적인 `if (!op_*(...)) return (0);`입니다. operation이 private state를 먼저 바꾸더라도 emission failure가 곧 caller 중단으로 이어져 external stream에 뒤 command를 추가하지 않습니다.

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
