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
- **직전 관련 상태:** [이 기능이 들어오기 전 필요한 최소 코드 상태를 작성]
- **이 commit의 구현 역할:** [Source-confirmed role을 실제 변경 함수/호출 관계로 확인해 작성]
- **핵심 state transition 또는 boundary:** [이 commit에서 필요한 부분만 기록]
- **failure/no-op/edge:** [source에 관련 경계가 있으면 실제 branch를 기록. 없으면 억지로 추가하지 않음]
- **이후 연결:** [다음 관련 commit이 이 결과를 어떻게 사용하거나 검증하는지 기록]
- **Thread의 다음 관련 commit:** `f79ae7e86592`와 비교할 질문을 한 문장으로 작성합니다.

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
- **직전 관련 상태:** [이 기능이 들어오기 전 필요한 최소 코드 상태를 작성]
- **이 commit의 구현 역할:** [Source-confirmed role을 실제 변경 함수/호출 관계로 확인해 작성]
- **핵심 state transition 또는 boundary:** [이 commit에서 필요한 부분만 기록]
- **failure/no-op/edge:** [source에 관련 경계가 있으면 실제 branch를 기록. 없으면 억지로 추가하지 않음]
- **이후 연결:** [다음 관련 commit이 이 결과를 어떻게 사용하거나 검증하는지 기록]
- **Thread의 다음 관련 commit:** `d906f4d86528`와 비교할 질문을 한 문장으로 작성합니다.

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
- **직전 관련 상태와 문제:** [parent 또는 직전 관련 SHA의 실제 코드로 작성]
- **주요 boundary/decision:** [subsystem, ownership, failure, integration 경계 중 이 commit의 핵심을 작성]
- **state / ownership / failure 변화:** [변경 전 → 변경 후를 실제 symbol과 함께 작성]
- **보장 / 비보장:** [이 commit의 책임 경계와 남은 risk를 분리해 작성]
- **후속 검증 또는 수정 연결:** [같은 thread 또는 source가 명시한 cross-thread evidence와 연결]
- **Thread의 다음 관련 commit:** `44ee0830e9f0`와 비교할 질문을 한 문장으로 작성합니다.

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
- **대상 production invariant:** [이 테스트가 직접 대상으로 삼는 production contract를 실제 assertion과 연결해 작성]
- **재현하는 failure/boundary:** [fixture 또는 injected condition이 어떤 실패/경계를 만드는지 작성]
- **test technique:** [unit / CLI integration / exhaustive enumeration / independent replay / fault injection / deterministic baseline / sanitizer 중 실제 사용 기법 기록]
- **통과하는 production path:** [실행 파일 또는 함수 entry부터 핵심 production branch까지 caller → callee 순서로 기록]
- **이 테스트가 증명하는 것:** [assertion과 관찰 가능한 결과에 근거해 작성]
- **이 테스트가 증명하지 않는 것:** [공유 구현, 입력 범위, fault 종류, resource 종류 등 실제 한계를 작성]
- **성격:** [broad integration / deterministic regression / exhaustive small-state / fault regression 중 근거와 함께 분류]
- **막는 후속 회귀:** [이 테스트가 실패해야 하는 구체적 잘못된 변경 예를 작성]

#### 학습자가 복원할 구현 기록 — B
- **직전 관련 상태:** [이 기능이 들어오기 전 필요한 최소 코드 상태를 작성]
- **이 commit의 구현 역할:** [Source-confirmed role을 실제 변경 함수/호출 관계로 확인해 작성]
- **핵심 state transition 또는 boundary:** [이 commit에서 필요한 부분만 기록]
- **failure/no-op/edge:** [source에 관련 경계가 있으면 실제 branch를 기록. 없으면 억지로 추가하지 않음]
- **이후 연결:** [다음 관련 commit이 이 결과를 어떻게 사용하거나 검증하는지 기록]
- **Thread의 다음 관련 commit:** `7713a31cf502`와 비교할 질문을 한 문장으로 작성합니다.

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
- **Thread의 다음 관련 commit:** `dbf76e147e68`와 비교할 질문을 한 문장으로 작성합니다.

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
| checker final success = sorted A + empty B | d906f4d86528 | - | - | - | 44ee0830e9f0 | [해당 SHA 코드 근거 작성] |
| frame 최대 3 non-newline bytes / NUL 금지 | - | - | 0b87adebca2b는 unbounded general reader | 7713a31cf502 | dbf76e147e68 | [해당 SHA 코드 근거 작성] |
| `read` EINTR retry / other error reject | - | - | 0b87adebca2b에서는 interrupted read도 failure | 7713a31cf502 | dbf76e147e68 | [해당 SHA 코드 근거 작성] |

## 7. Failure → Fix → Test 연결

| Failure / risk | 기존 또는 선택한 대응 | Fix commit | Test / evidence | 학습자 root-cause 기록 |
| --- | --- | --- | --- | --- |
| valid but unsorted/unfinished stream | `KO` normal verdict | d906f4d86528 | 44ee0830e9f0 | [실제 branch와 연결] |
| unbounded command frame / embedded NUL / overlength | bounded protocol reader | 7713a31cf502 | dbf76e147e68 | [실제 branch와 연결] |
| transient `EINTR`를 permanent failure로 취급 | `EINTR` retry | 7713a31cf502 | dbf76e147e68 | [실제 branch와 연결] |

## 8. Ownership / state / responsibility 변화

| 대상 | 이 Thread 시작 시 | 변화 commit | 이 Thread 종료 시 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| checker stack A/B | [시작 상태 확인] | [관련 SHA 기록] | [종료 상태 확인] | `[SHA:path:symbol]` |
| reader-owned command frame | [시작 상태 확인] | [관련 SHA 기록] | [종료 상태 확인] | `[SHA:path:symbol]` |
| command dispatcher | [시작 상태 확인] | [관련 SHA 기록] | [종료 상태 확인] | `[SHA:path:symbol]` |
| verdict output boundary | [시작 상태 확인] | [관련 SHA 기록] | [종료 상태 확인] | `[SHA:path:symbol]` |

## 9. Thread 최종 상태
- **Source 기준 최종 상태:** [이 Thread의 마지막 commit까지 source가 확정한 상태를 commit map과 invariant ledger를 이용해 학습자가 한 문단으로 재구성]
- **남아 있는 한계 / 다른 Thread로 넘어가는 책임:** [source가 명시한 후속 hardening 또는 verification만 연결하고 임의의 개선안을 정답처럼 추가하지 않음]

## 10. 최종 architecture 또는 execution flow 정리
- Source-derived flow anchor: `parse initial A → allocate B → bounded frame read → exact dispatch with `emit=0` → clean EOF → complete-state predicate → `OK`/`KO` or error cleanup`
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
