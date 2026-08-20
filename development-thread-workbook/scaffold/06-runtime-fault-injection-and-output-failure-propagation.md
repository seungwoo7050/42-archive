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
- **직전 관련 상태:** [이 기능이 들어오기 전 필요한 최소 코드 상태를 작성]
- **이 commit의 구현 역할:** [Source-confirmed role을 실제 변경 함수/호출 관계로 확인해 작성]
- **핵심 state transition 또는 boundary:** [이 commit에서 필요한 부분만 기록]
- **failure/no-op/edge:** [source에 관련 경계가 있으면 실제 branch를 기록. 없으면 억지로 추가하지 않음]
- **이후 연결:** [다음 관련 commit이 이 결과를 어떻게 사용하거나 검증하는지 기록]
- **Thread의 다음 관련 commit:** `5faa9d7697af`와 비교할 질문을 한 문장으로 작성합니다.

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
- **직전 관련 상태와 문제:** [parent 또는 직전 관련 SHA의 실제 코드로 작성]
- **주요 boundary/decision:** [subsystem, ownership, failure, integration 경계 중 이 commit의 핵심을 작성]
- **state / ownership / failure 변화:** [변경 전 → 변경 후를 실제 symbol과 함께 작성]
- **보장 / 비보장:** [이 commit의 책임 경계와 남은 risk를 분리해 작성]
- **후속 검증 또는 수정 연결:** [같은 thread 또는 source가 명시한 cross-thread evidence와 연결]
- **Thread의 다음 관련 commit:** `63969f770a21`와 비교할 질문을 한 문장으로 작성합니다.

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
- **대상 production invariant:** [이 테스트가 직접 대상으로 삼는 production contract를 실제 assertion과 연결해 작성]
- **재현하는 failure/boundary:** [fixture 또는 injected condition이 어떤 실패/경계를 만드는지 작성]
- **test technique:** [unit / CLI integration / exhaustive enumeration / independent replay / fault injection / deterministic baseline / sanitizer 중 실제 사용 기법 기록]
- **통과하는 production path:** [실행 파일 또는 함수 entry부터 핵심 production branch까지 caller → callee 순서로 기록]
- **이 테스트가 증명하는 것:** [assertion과 관찰 가능한 결과에 근거해 작성]
- **이 테스트가 증명하지 않는 것:** [공유 구현, 입력 범위, fault 종류, resource 종류 등 실제 한계를 작성]
- **성격:** [broad integration / deterministic regression / exhaustive small-state / fault regression 중 근거와 함께 분류]
- **막는 후속 회귀:** [이 테스트가 실패해야 하는 구체적 잘못된 변경 예를 작성]

#### 학습자가 복원할 핵심 기록 — A
- **직전 관련 상태와 문제:** [parent 또는 직전 관련 SHA의 실제 코드로 작성]
- **주요 boundary/decision:** [subsystem, ownership, failure, integration 경계 중 이 commit의 핵심을 작성]
- **state / ownership / failure 변화:** [변경 전 → 변경 후를 실제 symbol과 함께 작성]
- **보장 / 비보장:** [이 commit의 책임 경계와 남은 risk를 분리해 작성]
- **후속 검증 또는 수정 연결:** [같은 thread 또는 source가 명시한 cross-thread evidence와 연결]
- **Thread의 다음 관련 commit:** `315f4b91779b`와 비교할 질문을 한 문장으로 작성합니다.

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
- **기존 가정:** [직전 관련 SHA의 코드가 어떤 조건을 안전하다고 가정했는지 실제 코드로 작성]
- **실제 failure 또는 위험:** [source가 지적한 위험을 해당 이전 코드의 branch/계산과 연결해 작성]
- **root cause:** [추상적 설명이 아니라 잘못된 타입/경계/return contract/reader policy 등 실제 원인 기록]
- **수정된 invariant/decision:** [이 fix 이후 반드시 성립해야 하는 조건을 작성]
- **실제 수정 코드:** [변경 전/후 `SHA:path:symbol`과 핵심 차이를 짧게 기록]
- **regression test:** [동일 SHA 또는 후속 commit에서 직접 재현하는 test가 있으면 연결. source가 특정 test를 지정하지 않으면 임의로 있다고 쓰지 말고 확인 결과를 기록]

#### 학습자가 복원할 핵심 기록 — A
- **직전 관련 상태와 문제:** [parent 또는 직전 관련 SHA의 실제 코드로 작성]
- **주요 boundary/decision:** [subsystem, ownership, failure, integration 경계 중 이 commit의 핵심을 작성]
- **state / ownership / failure 변화:** [변경 전 → 변경 후를 실제 symbol과 함께 작성]
- **보장 / 비보장:** [이 commit의 책임 경계와 남은 risk를 분리해 작성]
- **후속 검증 또는 수정 연결:** [같은 thread 또는 source가 명시한 cross-thread evidence와 연결]
- **Thread의 다음 관련 commit:** `e1154e181864`와 비교할 질문을 한 문장으로 작성합니다.

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
- **대상 production invariant:** [이 테스트가 직접 대상으로 삼는 production contract를 실제 assertion과 연결해 작성]
- **재현하는 failure/boundary:** [fixture 또는 injected condition이 어떤 실패/경계를 만드는지 작성]
- **test technique:** [unit / CLI integration / exhaustive enumeration / independent replay / fault injection / deterministic baseline / sanitizer 중 실제 사용 기법 기록]
- **통과하는 production path:** [실행 파일 또는 함수 entry부터 핵심 production branch까지 caller → callee 순서로 기록]
- **이 테스트가 증명하는 것:** [assertion과 관찰 가능한 결과에 근거해 작성]
- **이 테스트가 증명하지 않는 것:** [공유 구현, 입력 범위, fault 종류, resource 종류 등 실제 한계를 작성]
- **성격:** [broad integration / deterministic regression / exhaustive small-state / fault regression 중 근거와 함께 분류]
- **막는 후속 회귀:** [이 테스트가 실패해야 하는 구체적 잘못된 변경 예를 작성]

#### 학습자가 복원할 핵심 기록 — A
- **직전 관련 상태와 문제:** [parent 또는 직전 관련 SHA의 실제 코드로 작성]
- **주요 boundary/decision:** [subsystem, ownership, failure, integration 경계 중 이 commit의 핵심을 작성]
- **state / ownership / failure 변화:** [변경 전 → 변경 후를 실제 symbol과 함께 작성]
- **보장 / 비보장:** [이 commit의 책임 경계와 남은 risk를 분리해 작성]
- **후속 검증 또는 수정 연결:** [같은 thread 또는 source가 명시한 cross-thread evidence와 연결]
- **Thread 내 다음 commit:** 없음. Thread 최종 상태에서 이 commit의 남은 역할을 정리합니다.

## 6. Invariant ledger

| Invariant / contract | 처음 도입 | 강화 | 부족함이 드러난 지점 | fix | regression / evidence | 학습자 확인 메모 |
| --- | --- | --- | --- | --- | --- | --- |
| complete emitted stream까지 성공해야 `push_swap` success | - | - | 2e97f29961d8은 write result를 무시 | 315f4b91779b | e1154e181864 | [해당 SHA 코드 근거 작성] |
| short write cursor advance / zero write failure / closed pipe ordinary error | - | - | - | 315f4b91779b | e1154e181864 | [해당 SHA 코드 근거 작성] |
| owned allocation은 모든 exit path에서 release | 5faa9d7697af runtime boundary | 63969f770a21에서 failure sweep | - | - | 63969f770a21, e1154e181864 | [해당 SHA 코드 근거 작성] |

## 7. Failure → Fix → Test 연결

| Failure / risk | 기존 또는 선택한 대응 | Fix commit | Test / evidence | 학습자 root-cause 기록 |
| --- | --- | --- | --- | --- |
| allocation 중간 실패 후 leak | runtime allocation seam + cleanup paths | - | 63969f770a21 | [실제 branch와 연결] |
| write failure가 성공으로 숨음 | `ps_write_all` + end-to-end status propagation | 315f4b91779b | e1154e181864 | [실제 branch와 연결] |
| short write에서 중복/누락, zero write 무한 반복 위험 | cursor advance + zero-write failure | 315f4b91779b | e1154e181864 | [실제 branch와 연결] |
| closed pipe가 cleanup 전에 `SIGPIPE`로 종료 | `SIGPIPE` ignore 후 write error 처리 | 315f4b91779b | e1154e181864 | [실제 branch와 연결] |

## 8. Ownership / state / responsibility 변화

| 대상 | 이 Thread 시작 시 | 변화 commit | 이 Thread 종료 시 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| runtime allocation boundary | [시작 상태 확인] | [관련 SHA 기록] | [종료 상태 확인] | `[SHA:path:symbol]` |
| fault-injection allocation header/counters | [시작 상태 확인] | [관련 SHA 기록] | [종료 상태 확인] | `[SHA:path:symbol]` |
| stdout command stream | [시작 상태 확인] | [관련 SHA 기록] | [종료 상태 확인] | `[SHA:path:symbol]` |
| stderr diagnostic stream | [시작 상태 확인] | [관련 SHA 기록] | [종료 상태 확인] | `[SHA:path:symbol]` |
| main-level stack cleanup | [시작 상태 확인] | [관련 SHA 기록] | [종료 상태 확인] | `[SHA:path:symbol]` |

## 9. Thread 최종 상태
- **Source 기준 최종 상태:** [이 Thread의 마지막 commit까지 source가 확정한 상태를 commit map과 invariant ledger를 이용해 학습자가 한 문단으로 재구성]
- **남아 있는 한계 / 다른 Thread로 넘어가는 책임:** [source가 명시한 후속 hardening 또는 verification만 연결하고 임의의 개선안을 정답처럼 추가하지 않음]

## 10. 최종 architecture 또는 execution flow 정리
- Source-derived flow anchor: `basic output → runtime seam → allocation fault sweep → write-all + status propagation + SIGPIPE policy → injected write regressions`
- **학습자 최종 flow:** [각 화살표마다 실제 `SHA:path:symbol`을 붙여 호출·state mutation·ownership·failure 경로를 다시 작성]
- **실제 코드 삽입:** [핵심 decision을 설명하는 최소 코드만 해당 SHA에서 인용. full function 또는 final HEAD 코드 복사는 피함]

## 11. 학습 완료 자가 점검
- [ ] Thread commit 순서를 source와 동일하게 유지했습니다.
- [ ] 모든 commit에서 지정된 SHA의 코드를 직접 확인했습니다.
- [ ] final HEAD를 과거 commit 설명에 소급 사용하지 않았습니다.
- [ ] Source-confirmed fact와 직접 코드 확인 결과를 구분했습니다.
- [ ] S/A commit은 decision, invariant, ownership/failure, 후속 evidence까지 추적했습니다.
- [ ] B commit은 Thread 흐름에서 맡는 구현 역할과 필요한 state/boundary만 충분히 확인했습니다.
- [ ] test commit마다 production invariant, failure/boundary, technique, production path, 증명/비증명 범위를 구분했습니다.
- [ ] fix commit은 기존 가정 → failure/risk → root cause → 수정 invariant → 실제 코드 → regression evidence 순서로 연결했습니다.
- [ ] Invariant ledger와 Failure → Fix → Test 표를 실제 코드 근거로 채웠습니다.
- [ ] 별도 프로젝트 재학습 없이 이 Thread의 설계 → 구현 → 실패/위험 → 수정/검증 흐름을 commit history에 근거해 설명할 수 있습니다.
