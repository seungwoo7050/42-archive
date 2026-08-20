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

- [ ] `mt_write_all` loop invariant와 pointer/remaining update를 코드로 설명합니다.
- [ ] PID, payload byte, NUL newline, recovery newline의 output-to-ACK ordering을 기록합니다.
- [ ] output failure가 event loop → main → endpoint cleanup → client failure로 전파되는 path를 작성합니다.
- [ ] fault-injection mode를 production branch와 process result에 연결합니다.
- [ ] local commit guarantee와 non-exactly-once limit를 구분합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `826dd34c378f` | fix(io): 중단·부분 쓰기를 끝까지 처리 | A | OUTPUT_COMMIT, PRACTICAL, RISK | `mt_write_all`이 EINTR를 retry하고 short write만큼 offset을 전진하며 zero progress를 `EIO`로 처리합니다. |
| 2 | `db2004556d8b` | fix(server): stdout 실패 뒤 ACK 전송 차단 | S | CORE, OUTPUT_COMMIT, RISK | PID, payload, terminator newline, recovery newline을 all-or-failure로 쓰고 failure 시 triggering ACK를 보내지 않습니다. |
| 3 | `9aa80e047514` | test(server): 부분 쓰기와 출력 실패 검증 | A | TEST, OUTPUT_COMMIT, RISK | low-level write를 deterministic test implementation으로 바꿔 EINTR, one-byte short write, zero write, selected payload/newline EPIPE를 주입합니다. |
| 4 | `081a882d7fa3` | test(server): 회수 줄바꿈 출력 실패 검증 | A | TEST, OUTPUT_COMMIT, SESSION | dead owner가 visible partial line을 남긴 상태에서 replacement acquisition이 recovery newline을 쓰는 순간 failure를 주입합니다. |

확인 원칙:

- 각 항목은 해당 SHA의 tree를 기준으로 읽습니다.
- 변경 전 상태는 해당 SHA의 parent 또는 지정된 이전 관련 SHA에서 확인합니다.
- 같은 commit이 다른 Thread에 다시 등장해도 이 Thread의 질문으로 별도 기록합니다.

## 5. Commit별 학습 기록

### 1. `826dd34c378f` — fix(io): 중단·부분 쓰기를 끝까지 처리

- **Importance:** A
- **Tags:** OUTPUT_COMMIT, PRACTICAL, RISK
- **Thread 내 역할:** `mt_write_all`이 EINTR를 retry하고 short write만큼 offset을 전진하며 zero progress를 `EIO`로 처리합니다.

#### 원문에서 확정된 맥락

string/number helpers가 이 primitive를 사용합니다. success는 모든 requested bytes가 descriptor interface에 전달됐다는 뜻이며 terminal error는 숨기지 않습니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] `mt_write_all` signature와 zero-length behavior
- [ ] buffer pointer/offset와 remaining count types
- [ ] positive short count에서 progress update
- [ ] `write == -1 && errno == EINTR` retry branch
- [ ] `write == 0` → `errno = EIO` failure branch
- [ ] other error return contract
- [ ] `mt_putstr_fd`/`mt_putnbr_fd` routing diff

#### 비교 기준

초기 `bf8163cdd7dd` output helpers의 single write와 비교하고 `db2004556d8b`에서 return value가 ACK decision에 연결되는지 확인합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:

#### Fix 연결 기록

| 단계 | Source에서 확정된 내용 | 해당 SHA의 코드 근거 |
| --- | --- | --- |
| 기존 가정 | 한 번의 successful `write` call이 requested buffer 전체를 출력한다. |  |
| 실제 failure 또는 위험 | `EINTR`, short write, zero progress에서 diagnostics나 protocol-visible output이 잘릴 수 있다. |  |
| root cause | descriptor write를 partial-progress interface가 아니라 atomic completion operation으로 취급했다. |  |
| 수정된 invariant/decision | success는 모든 bytes를 쓴 경우뿐이며 interruption은 retry하고 short count만큼 전진한다. |  |

- 변경 전 failure를 재현하거나 추론할 수 있는 입력/상태:
- root cause가 드러나는 field 또는 call order:
- 수정된 invariant를 고정하는 후속 regression test:

#### 보장 범위

**이 commit이 보장하는 것**

- [ ] complete-or-fail descriptor write
- [ ] partial progress와 interruption 처리

**아직 보장하지 않는 것**

- [ ] server ACK ordering
- [ ] endpoint cleanup
- [ ] exactly-once output

#### 코드 증거 기록

- 파일 경로:
- symbol 또는 함수:
- 확인한 state fields:
- caller → callee:
- 핵심 branch 또는 mutation 순서:
- parent 또는 이전 관련 SHA와의 diff 요약:
- 삽입할 최소 코드 조각과 선택 이유:
- 직접 실행한 command 또는 test와 결과:

#### 다음 연결

`db2004556d8b`에서 local write success가 protocol commit condition이 됩니다.
### 2. `db2004556d8b` — fix(server): stdout 실패 뒤 ACK 전송 차단

- **Importance:** S
- **Tags:** CORE, OUTPUT_COMMIT, RISK
- **Thread 내 역할:** PID, payload, terminator newline, recovery newline을 all-or-failure로 쓰고 failure 시 triggering ACK를 보내지 않습니다.

#### 원문에서 확정된 맥락

`SIGPIPE`를 ignore해 closed output을 `EPIPE` return으로 처리합니다. output failure는 event loop 밖으로 전파되고 recovery reset도 delimiter write failure를 반환합니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] server startup의 `SIGPIPE` disposition
- [ ] PID publication failure와 initialization rollback
- [ ] completed payload byte write와 ACK caller order
- [ ] NUL newline write/state reset/ACK order
- [ ] dead-owner recovery newline의 fallible return
- [ ] bit processor → event loop → main error propagation
- [ ] output failure 뒤 ACK가 없는 모든 call site
- [ ] output success 뒤 ACK send failure branch와 semantic limit

#### 비교 기준

`826dd34c378f` helper contract와 비교하고 `9aa80e047514`의 fault modes를 output sites에 매핑합니다.

#### S-level 재구성

다음 항목은 path, symbol, state field, branch를 근거로 작성합니다.

- [ ] PID/payload/NUL/recovery output paths의 caller/callee/failure return table
- [ ] 각 path의 state mutation과 write/ACK order
- [ ] output failure 뒤 process exit 전 session state
- [ ] `SIGPIPE` ignore → `EPIPE` → cleanup path
- [ ] output success 뒤 ACK send failure의 non-guarantee
- [ ] fault injection seam과 production algorithm separation

| 추적 항목 | 학습자 기록 | 코드 근거 |
| --- | --- | --- |
| 직전 architecture/state |  |  |
| 해결하려던 핵심 문제 |  |  |
| 실패 가능한 interleaving 또는 partial failure |  |  |
| 선택한 decision |  |  |
| ownership/lifecycle/state transition |  |  |
| 후속 fix 또는 regression evidence |  |  |

#### Fix 연결 기록

| 단계 | Source에서 확정된 내용 | 해당 SHA의 코드 근거 |
| --- | --- | --- |
| 기존 가정 | byte state를 완성하면 ACK를 보내도 된다. |  |
| 실제 failure | stdout partial/EPIPE에도 client가 success를 관측할 수 있다. |  |
| root cause | in-memory transition과 visible output commit order가 분리돼 있다. |  |
| 수정 invariant | required output complete 뒤에만 triggering ACK를 보낸다. |  |
| 남는 한계 | output success 뒤 ACK loss는 가능하다. |  |

- 변경 전 failure를 재현하거나 추론할 수 있는 입력/상태:
- root cause가 드러나는 field 또는 call order:
- 수정된 invariant를 고정하는 후속 regression test:

#### 보장 범위

**이 commit이 보장하는 것**

- [ ] visible output before success ACK
- [ ] startup/message cleanup
- [ ] recovery delimiter commit

**아직 보장하지 않는 것**

- [ ] atomic output+ACK transaction
- [ ] ACK-loss dedup/retry
- [ ] remote persistence

#### 코드 증거 기록

- 파일 경로:
- symbol 또는 함수:
- 확인한 state fields:
- caller → callee:
- 핵심 branch 또는 mutation 순서:
- parent 또는 이전 관련 SHA와의 diff 요약:
- 삽입할 최소 코드 조각과 선택 이유:
- 직접 실행한 command 또는 test와 결과:

#### 다음 연결

`9aa80e047514`가 normal output failures를, `081a882d7fa3`이 recovery newline failure를 검증합니다.
### 3. `9aa80e047514` — test(server): 부분 쓰기와 출력 실패 검증

- **Importance:** A
- **Tags:** TEST, OUTPUT_COMMIT, RISK
- **Thread 내 역할:** low-level write를 deterministic test implementation으로 바꿔 EINTR, one-byte short write, zero write, selected payload/newline EPIPE를 주입합니다.

#### 원문에서 확정된 맥락

complete output under partial progress와 startup/message failure의 no-false-success, endpoint cleanup, client timeout을 검증합니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] production write를 test hook으로 교체하는 build seam
- [ ] first-call EINTR와 one-byte-each-call mode
- [ ] selected zero/EPIPE call state
- [ ] short/EINTR 뒤 complete expected bytes assertion
- [ ] PID publication zero-write startup failure
- [ ] payload 또는 NUL newline EPIPE server exit
- [ ] client timeout/no-success와 endpoint cleanup

#### 비교 기준

`826dd34c378f` writer branches와 `db2004556d8b` output sites에 fault modes를 연결합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:


#### Test commit 분석 기록

- **대상 production invariant:** stdout effect가 complete되지 않으면 해당 transition을 success ACK하지 않습니다.
- **재현하는 failure 또는 boundary:** EINTR, short write, zero progress, payload/newline EPIPE
- **사용한 test technique:** compile-time write hook against real server
- **분류:** deterministic production-path fault regression

확인할 production path:

- [ ] PID publication
- [ ] `mt_write_all`
- [ ] payload flush
- [ ] NUL newline
- [ ] event-loop error
- [ ] cleanup

이 테스트가 증명하는 항목:

- [ ] complete output under partial progress
- [ ] no false ACK
- [ ] startup/message cleanup

이 테스트가 증명하지 않는 항목:

- [ ] recovery newline failure
- [ ] ACK loss after output
- [ ] exactly-once

학습자 기록:

- failure 주입 또는 process orchestration 시작 지점:
- production code에 진입하는 최초 호출:
- 핵심 assertion과 관측값:
- broad integration 요소와 deterministic regression 요소의 구분:
- 후속 변경에서 막아야 할 구체적인 회귀:


#### 코드 증거 기록

- 파일 경로:
- symbol 또는 함수:
- 확인한 state fields:
- caller → callee:
- 핵심 branch 또는 mutation 순서:
- parent 또는 이전 관련 SHA와의 diff 요약:
- 삽입할 최소 코드 조각과 선택 이유:
- 직접 실행한 command 또는 test와 결과:

#### 다음 연결

`081a882d7fa3`에서 recovery delimiter까지 같은 invariant를 검증합니다.
### 4. `081a882d7fa3` — test(server): 회수 줄바꿈 출력 실패 검증

- **Importance:** A
- **Tags:** TEST, OUTPUT_COMMIT, SESSION
- **Thread 내 역할:** dead owner가 visible partial line을 남긴 상태에서 replacement acquisition이 recovery newline을 쓰는 순간 failure를 주입합니다.

#### 원문에서 확정된 맥락

server는 event loop를 종료하고 replacement client는 READY/ACK success가 아니라 timeout해야 합니다. fields만 clear하고 visible boundary를 쓰지 못한 상태를 successful recovery로 보지 않습니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] partial session/visible line setup
- [ ] replacement ACQUIRE가 recovery를 촉발하는 order
- [ ] recovery newline call을 선택하는 write hook condition
- [ ] server error exit와 endpoint cleanup assertion
- [ ] replacement client timeout/no READY/no ACK
- [ ] new-session bytes가 output에 합쳐지지 않는 assertion

#### 비교 기준

`db2004556d8b` reset return path와 `9aa80e047514` hook을 함께 확인합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:


#### Test commit 분석 기록

- **대상 production invariant:** visible abandoned line을 delimit하기 전에는 owner reassignment가 완료되지 않습니다.
- **재현하는 failure 또는 boundary:** new ACQUIRE 중 recovery newline EPIPE
- **사용한 test technique:** partial-session setup + selected write fault + real replacement client
- **분류:** failure-path-specific deterministic regression

확인할 production path:

- [ ] owner availability
- [ ] session recovery
- [ ] newline write
- [ ] event-loop error
- [ ] readiness wait

이 테스트가 증명하는 항목:

- [ ] failed delimiter suppresses READY/ACK
- [ ] server stops
- [ ] cleanup runs

이 테스트가 증명하지 않는 항목:

- [ ] recovery retry
- [ ] output rollback
- [ ] ACK loss after delimiter

학습자 기록:

- failure 주입 또는 process orchestration 시작 지점:
- production code에 진입하는 최초 호출:
- 핵심 assertion과 관측값:
- broad integration 요소와 deterministic regression 요소의 구분:
- 후속 변경에서 막아야 할 구체적인 회귀:


#### 코드 증거 기록

- 파일 경로:
- symbol 또는 함수:
- 확인한 state fields:
- caller → callee:
- 핵심 branch 또는 mutation 순서:
- parent 또는 이전 관련 SHA와의 diff 요약:
- 삽입할 최소 코드 조각과 선택 이유:
- 직접 실행한 command 또는 test와 결과:

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
| `826dd34c378f` | `mt_write_all`이 EINTR를 retry하고 short write만큼 offset을 전진하며 zero progress를 `EIO`로 처리합니다. |  |  |  |
| `db2004556d8b` | PID, payload, terminator newline, recovery newline을 all-or-failure로 쓰고 failure 시 triggering ACK를 보내지 않습니다. |  |  |  |
| `9aa80e047514` | low-level write를 deterministic test implementation으로 바꿔 EINTR, one-byte short write, zero write, selected payload/newline EPIPE를 주입합니다. |  |  |  |
| `081a882d7fa3` | dead owner가 visible partial line을 남긴 상태에서 replacement acquisition이 recovery newline을 쓰는 순간 failure를 주입합니다. |  |  |  |

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 상태 | 실제 failure/위험 | Fix 또는 전환 commit | 수정된 decision/invariant | Test 또는 후속 검증 | 학습자 code evidence |
| --- | --- | --- | --- | --- | --- |
| single `write` success를 complete output으로 간주 | EINTR/short write에서 PID·payload truncation 가능 | `826dd34c378f` | `mt_write_all` all-or-failure loop | 9aa80e047514 EINTR/one-byte write injection |  |
| state transition 후 ACK부터 전송 | stdout failure에도 client가 success 관측 | `db2004556d8b` | output complete 뒤 ACK, failure면 server exit | 9aa80e047514 payload/newline EPIPE regression |  |
| dead-owner fields를 먼저 reset | recovery newline failure에도 clean handoff로 오인 | `db2004556d8b` | delimiter success를 recovery commit 조건에 포함 | 081a882d7fa3 recovery-newline failure regression |  |

전용 test commit이 없는 연결에는 존재하지 않는 test를 만들어 적지 않습니다.

## 8. Ownership / state / responsibility 변화

| 단계 | state 또는 responsibility owner | transition | 당시 한계 또는 다음 변화 | 실제 symbol/field |
| --- | --- | --- | --- | --- |
| write primitive | `mt_write_all` caller | offset와 remaining을 끝까지 소유 | success 의미 통일 |  |
| server byte commit | event loop | state → stdout → ACK order | write failure 시 ACK 없음 |  |
| recovery commit | session reset caller | delimiter success 뒤 reset/reassign | failure 시 server 종료 |  |
| startup | main/initialization | PID line와 endpoint rollback | false readiness 방지 |  |

## 9. Thread 최종 상태

Source에서 확정된 최종 조건:

- 모든 protocol-visible server output은 all-or-failure writer를 사용합니다.
- ACK는 triggering bit가 요구한 visible output effect가 성공한 뒤에만 전송됩니다.
- closed stdout pipe는 asynchronous termination 대신 `EPIPE` error path로 처리됩니다.
- output success 뒤 ACK loss는 남으므로 exactly-once transaction은 아닙니다.

학습자 기록:

- 최종 state fields와 owner:
- 정상 transition 순서:
- 실패 시 중단·reset·cleanup 순서:
- 최종 상태가 보장하지 않는 것:
- 이 Thread를 한 문단으로 설명한 최종 서술:

## 10. 최종 architecture 또는 execution flow 정리

아래 노드를 해당 SHA에서 확인한 함수명과 branch로 연결합니다.

- [ ] bit event로 byte/delimiter completion 결정
- [ ] output buffer와 length 선택
- [ ] `mt_write_all` retry/advance loop
- [ ] write success 뒤 state reset 또는 sequence update
- [ ] matching ACK send
- [ ] write failure에서 ACK 생략과 event-loop error
- [ ] main exit와 endpoint cleanup

```text
[시작 함수/입력]
    -> [검증]
    -> [state transition]
    -> [외부 효과 또는 응답]
    -> [성공 시 다음 state]
    -> [failure 시 cleanup/종료]
```

- 실제 함수·파일을 반영한 완성 흐름:
- asynchronous boundary:
- externally visible commit point:
- cleanup owner:

## 11. 학습 완료 자가 점검

- [ ] commit map의 4개 SHA를 source 순서대로 모두 설명할 수 있습니다.
- [ ] 각 code excerpt에 SHA, path, symbol, 선택 이유가 기록돼 있습니다.
- [ ] final HEAD 코드를 historical SHA의 증거로 사용한 곳이 없습니다.
- [ ] 정상 경로와 failure path를 state mutation 순서로 설명할 수 있습니다.
- [ ] source 확정 invariant와 직접 확인한 code evidence를 구분했습니다.
- [ ] test commit의 invariant, failure, technique, production path, proves/not-proves를 기록했습니다.
- [ ] Thread final state를 함수와 state field 수준으로 설명할 수 있습니다.

### 이 Thread와 직접 연결된 Major Engineering Difficulties

- partial descriptor progress와 protocol state progress를 같은 commit order로 묶어야 합니다.
- output success 뒤 ACK loss는 exactly-once transaction 없이 완전히 제거할 수 없습니다.
- PID, payload, NUL newline, recovery newline의 모든 output sites를 같은 contract로 바꿔야 합니다.
