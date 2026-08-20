# Thread: Async signal handling to a fail-stop self-pipe event loop

> 완성형 해설서가 아닙니다. 아래 확정 사항을 기준으로 각 commit SHA의 실제 코드와 diff를 읽고 기록란을 채웁니다.

## 1. Thread 목표

signal handler가 protocol state를 직접 변경하던 구조가 fixed event record와 nonblocking self-pipe를 거쳐, `pselect` event loop 하나가 session·bit·output·ACK state를 전담하는 구조로 바뀌는 과정을 복원합니다.

### Significance

핵심은 pipe 사용 자체가 아니라 authoritative state mutation을 normal execution context 하나로 모은 것입니다. handler는 `errno`를 보존하고 ordered fact만 전달합니다. event 하나의 손실은 bit 하나의 손실이므로 recoverable queue hiccup이 아니라 fail-stop 조건입니다. termination과 inherited mask도 같은 event architecture에 통합됩니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- self-pipe 전 handler가 직접 수행하던 authorization, bit assembly, output, ACK 작업은 무엇인가?
- event record의 최소 fields와 `PIPE_BUF` compile-time condition은 무엇인가?
- handler가 보존하는 `errno`와 허용 operation은 실제 코드에서 어떻게 제한되는가?
- failed 또는 partial pipe write를 왜 fatal overflow로 처리하는가?
- termination signal을 같은 event path로 보내면서 exit status와 cleanup을 어떻게 보존하는가?
- `exec`로 상속된 blocked mask를 server가 어떤 initialization order로 정상화하는가?

## 3. 완료 기준

- [ ] handler 전후 responsibility를 symbol 단위로 비교합니다.
- [ ] event write/read/validation/bit transition/output/ACK 순서를 trace로 작성합니다.
- [ ] event loss detection부터 server exit와 endpoint cleanup까지 연결합니다.
- [ ] data event와 termination event의 공통 input과 다른 result를 설명합니다.
- [ ] masked-exec test를 disposition과 deliverability production code에 연결합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `a7d994b0a4b6` | refactor(server): 비트 상태 전이 로직 추출 | B | REFACTOR, SELF_PIPE | bit processing을 explicit `(sender, signal)` event를 받는 function으로 추출하고 event size가 `PIPE_BUF` 안인지 compile-time으로 확인합니다. |
| 2 | `22363f83ff25` | refactor(server): signal 처리를 self-pipe event loop로 제한 | S | ARCH, SELF_PIPE, RISK | handler를 `errno` preservation과 fixed event self-pipe write로 제한하고 `pselect` loop가 모든 protocol work를 수행하게 합니다. |
| 3 | `4c535ac8657e` | test(server): self-pipe 이벤트 손실 시 fail-stop 검증 | A | TEST, SELF_PIPE, RISK | handler의 first self-pipe event write에 `EAGAIN`을 주입하고 server fail-stop을 검증합니다. |
| 4 | `e304c63bee3e` | fix(server): 종료 시그널을 이벤트 루프 정리 경로로 처리 | A | SELF_PIPE, PROCESS_LIFECYCLE | `SIGHUP`, `SIGINT`, `SIGTERM`을 data signal과 같은 self-pipe event로 전달하고 normal cleanup path에서 종료합니다. |
| 5 | `686b0d2a14e3` | fix(server): 상속된 이벤트 시그널 마스크 해제 | A | PROCESS_LIFECYCLE, RISK | handler 설치 후 two data signals와 three supported termination signals를 process mask에서 명시적으로 unblock합니다. |
| 6 | `72424469474c` | test(server): 차단된 시그널 마스크 상속 뒤 메시지 검증 | B | TEST, PROCESS_LIFECYCLE | wrapper가 data와 termination signals를 block한 뒤 server를 `exec`하고 message delivery와 SIGTERM cleanup을 검증합니다. |

확인 원칙:

- 각 항목은 해당 SHA의 tree를 기준으로 읽습니다.
- 변경 전 상태는 해당 SHA의 parent 또는 지정된 이전 관련 SHA에서 확인합니다.
- 같은 commit이 다른 Thread에 다시 등장해도 이 Thread의 질문으로 별도 기록합니다.

## 5. Commit별 학습 기록

### 1. `a7d994b0a4b6` — refactor(server): 비트 상태 전이 로직 추출

- **Importance:** B
- **Tags:** REFACTOR, SELF_PIPE
- **Thread 내 역할:** bit processing을 explicit `(sender, signal)` event를 받는 function으로 추출하고 event size가 `PIPE_BUF` 안인지 compile-time으로 확인합니다.

#### 원문에서 확정된 맥락

이 intermediate SHA에서는 handler가 extracted function을 여전히 호출합니다. authorization, byte assembly, sequence, output, ACK queueing을 `siginfo_t` 자체와 분리한 preparatory refactor입니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] new event structure fields/type
- [ ] `sizeof(event) <= PIPE_BUF` assertion
- [ ] extracted bit-transition function signature
- [ ] function이 읽고 쓰는 session/byte/bit/sequence/line state
- [ ] handler가 event를 만든 뒤 function을 직접 호출하는 code

#### 비교 기준

parent handler body에서 이동한 logic을 표시하고 `22363f83ff25`에서 caller가 event loop로 바뀌는 부분을 대조합니다.

#### B-level 구현 역할 기록

- Thread 전체에서 이 commit이 연결하는 앞/뒤 단계:
- 실제로 추가·수정된 핵심 symbol과 state:
- 이 commit만으로 충분하지 않아 후속 commit을 확인해야 하는 부분:


#### 보장 범위

**이 commit이 보장하는 것**

- [ ] transition logic을 handler metadata에서 event value로 분리
- [ ] atomic self-pipe delivery 준비

**아직 보장하지 않는 것**

- [ ] async-safe handler boundary
- [ ] normal-loop state ownership
- [ ] event-loss policy

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

`22363f83ff25`에서 handler는 transition function 대신 event pipe write만 수행합니다.
### 2. `22363f83ff25` — refactor(server): signal 처리를 self-pipe event loop로 제한

- **Importance:** S
- **Tags:** ARCH, SELF_PIPE, RISK
- **Thread 내 역할:** handler를 `errno` preservation과 fixed event self-pipe write로 제한하고 `pselect` loop가 모든 protocol work를 수행하게 합니다.

#### 원문에서 확정된 맥락

event loop는 complete records를 읽어 sender authorization, bit/byte state, stdout, sequence ACK를 처리합니다. failed/partial event write는 overflow flag를 세우고 server는 계속 진행하지 않습니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] handler entry/exit의 `errno` save/restore
- [ ] event에 sender PID와 signal만 copy하는 code
- [ ] self-pipe descriptors와 nonblocking setup/lifetime
- [ ] full event-size write check와 overflow flag branch
- [ ] `pselect`의 response socket/self-pipe fd set과 mask
- [ ] complete event read와 record validation loop
- [ ] authorization → assembly → output → sequence → ACK order
- [ ] signal-safe globals에서 loop-owned ordinary state로 이동한 fields
- [ ] overflow detection → event-loop error → cleanup path

#### 비교 기준

`a7d994b0a4b6`에서 transition caller가 handler였던 부분과 직접 diff하고 `4c535ac8657e` hook과 연결합니다.

#### S-level 재구성

다음 항목은 path, symbol, state field, branch를 근거로 작성합니다.

- [ ] old handler operations와 new handler operations 비교
- [ ] atomic record write premise와 full-size return check
- [ ] pselect iteration에서 socket/event readiness 처리 order
- [ ] output/ACK failure가 event loop return으로 전파되는 path
- [ ] overflow flag writer/reader/type와 exit branch
- [ ] handler가 호출하는 system calls를 목록화해 async-safe boundary 확인

| 추적 항목 | 학습자 기록 | 코드 근거 |
| --- | --- | --- |
| 직전 architecture/state |  |  |
| 해결하려던 핵심 문제 |  |  |
| 실패 가능한 interleaving 또는 partial failure |  |  |
| 선택한 decision |  |  |
| ownership/lifecycle/state transition |  |  |
| 후속 fix 또는 regression evidence |  |  |


#### 보장 범위

**이 commit이 보장하는 것**

- [ ] final async-signal-safe responsibility boundary
- [ ] sequential authoritative state machine
- [ ] event-loss fail-stop

**아직 보장하지 않는 것**

- [ ] unbounded pipe capacity
- [ ] lost-event reconstruction
- [ ] output-before-ACK commit 완성

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

`4c535ac8657e`에서 first event-write `EAGAIN`을 주입합니다.
### 3. `4c535ac8657e` — test(server): self-pipe 이벤트 손실 시 fail-stop 검증

- **Importance:** A
- **Tags:** TEST, SELF_PIPE, RISK
- **Thread 내 역할:** handler의 first self-pipe event write에 `EAGAIN`을 주입하고 server fail-stop을 검증합니다.

#### 원문에서 확정된 맥락

dropped event는 ordered stream의 한 bit를 잃는 것이므로 subsequent processing을 계속할 수 없습니다. server error exit, endpoint removal, no success ACK, client failure를 확인합니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] production event write를 대체하는 test hook/seam
- [ ] first call only `EAGAIN` deterministic state
- [ ] handler overflow flag production branch
- [ ] event loop가 flag를 보고 종료하는 code
- [ ] endpoint removal assertion
- [ ] client no-success-ACK와 bounded failure assertion

#### 비교 기준

`22363f83ff25` overflow branch와 injection point를 연결합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:


#### Test commit 분석 기록

- **대상 production invariant:** self-pipe에 전달되지 않은 signal event가 있으면 protocol processing을 계속하지 않습니다.
- **재현하는 failure 또는 boundary:** nonblocking pipe write `EAGAIN`으로 one bit event가 사라지는 상황
- **사용한 test technique:** handler event-write hook first-call fault injection
- **분류:** deterministic fault-injection regression

확인할 production path:

- [ ] signal handler
- [ ] event write
- [ ] overflow flag
- [ ] event-loop error
- [ ] main cleanup
- [ ] client timeout

이 테스트가 증명하는 항목:

- [ ] event loss detection
- [ ] no false ACK
- [ ] server fail-stop
- [ ] endpoint cleanup

이 테스트가 증명하지 않는 항목:

- [ ] OS-level signal completeness
- [ ] overflow recovery
- [ ] burst capacity

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

`e304c63bee3e`는 expected external termination도 same cleanup architecture로 보냅니다.
### 4. `e304c63bee3e` — fix(server): 종료 시그널을 이벤트 루프 정리 경로로 처리

- **Importance:** A
- **Tags:** SELF_PIPE, PROCESS_LIFECYCLE
- **Thread 내 역할:** `SIGHUP`, `SIGINT`, `SIGTERM`을 data signal과 같은 self-pipe event로 전달하고 normal cleanup path에서 종료합니다.

#### 원문에서 확정된 맥락

event loop가 termination event를 인식해 signal number를 main에 돌려주고 process는 `128 + signal`로 종료합니다. close/unlink bookkeeping은 handler가 아니라 registered cleanup에서 수행합니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] termination signal handler registration과 data handler reuse
- [ ] event record의 termination representation
- [ ] event loop data/termination branch
- [ ] signal number를 main까지 전달하는 return contract
- [ ] `128 + signal` exit code
- [ ] atexit/normal teardown descriptor close와 unlink
- [ ] handler에 close/unlink/exit가 없는지

#### 비교 기준

`22363f83ff25` data event loop에 termination branch가 들어온 diff를 확인합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:

#### Fix 연결 기록

| 단계 | Source에서 확정된 내용 | 해당 SHA의 코드 근거 |
| --- | --- | --- |
| 기존 가정 | termination handler에서 직접 종료해도 owned endpoint와 descriptors가 정리된다. |  |
| 실제 failure 또는 위험 | async context에서 cleanup을 생략하거나 unsafe filesystem/socket bookkeeping을 수행할 수 있다. |  |
| root cause | external shutdown을 normal event-loop ownership과 다른 lifecycle path로 처리했다. |  |
| 수정된 invariant/decision | termination도 self-pipe event로 capture하고 main/atexit cleanup path에서 `128 + signal`로 종료한다. |  |

- 변경 전 failure를 재현하거나 추론할 수 있는 입력/상태:
- root cause가 드러나는 field 또는 call order:
- 수정된 invariant를 고정하는 후속 regression test:

#### 보장 범위

**이 commit이 보장하는 것**

- [ ] normal-context asynchronous shutdown
- [ ] signal-derived status
- [ ] endpoint cleanup

**아직 보장하지 않는 것**

- [ ] uncatchable signals
- [ ] cleanup success transaction

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

`686b0d2a14e3`에서 inherited mask가 event delivery를 막지 않도록 unblock합니다.
### 5. `686b0d2a14e3` — fix(server): 상속된 이벤트 시그널 마스크 해제

- **Importance:** A
- **Tags:** PROCESS_LIFECYCLE, RISK
- **Thread 내 역할:** handler 설치 후 two data signals와 three supported termination signals를 process mask에서 명시적으로 unblock합니다.

#### 원문에서 확정된 맥락

signal disposition만 설치해도 blocked mask는 `exec` 뒤 남습니다. server는 필요한 signal delivery conditions를 스스로 세우고 unrelated inherited settings는 유지합니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] unblock signal set construction
- [ ] `sigprocmask` initialization position
- [ ] unblock failure → startup error/cleanup
- [ ] unrelated masks를 보존하는 operation
- [ ] PID publication이 normalization 뒤인지

#### 비교 기준

`e304c63bee3e` startup/handler registration sequence와 비교하고 `72424469474c` wrapper blocked set과 맞춥니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:

#### Fix 연결 기록

| 단계 | Source에서 확정된 내용 | 해당 SHA의 코드 근거 |
| --- | --- | --- |
| 기존 가정 | handler installation이면 signal delivery가 보장된다. |  |
| 실제 failure | `exec` inherited mask 때문에 PID만 publish하고 events를 받지 못한다. |  |
| root cause | disposition만 설정하고 deliverability를 초기화하지 않았다. |  |
| 수정 invariant | required data/termination signals를 explicit unblock한다. |  |

- 변경 전 failure를 재현하거나 추론할 수 있는 입력/상태:
- root cause가 드러나는 field 또는 call order:
- 수정된 invariant를 고정하는 후속 regression test:

#### 보장 범위

**이 commit이 보장하는 것**

- [ ] launcher mask와 무관한 required event delivery

**아직 보장하지 않는 것**

- [ ] all inherited signal policy reset
- [ ] unhandled signal behavior

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

`72424469474c`에서 masked-exec server의 message와 SIGTERM을 검증합니다.
### 6. `72424469474c` — test(server): 차단된 시그널 마스크 상속 뒤 메시지 검증

- **Importance:** B
- **Tags:** TEST, PROCESS_LIFECYCLE
- **Thread 내 역할:** wrapper가 data와 termination signals를 block한 뒤 server를 `exec`하고 message delivery와 SIGTERM cleanup을 검증합니다.

#### 원문에서 확정된 맥락

PID publication만으로 success로 보지 않습니다. bit events, ACKs, NUL frame, status 143, endpoint removal, no unexpected diagnostics를 확인합니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] wrapper exact blocked signal set와 `exec`
- [ ] PID publication wait 뒤 real client start
- [ ] message + newline expected output
- [ ] SIGTERM send와 wait status 143
- [ ] server endpoint removal assertion
- [ ] stderr/diagnostic comparison

#### 비교 기준

`686b0d2a14e3` unblock set과 wrapper block set을 대조하고 data/termination event branches를 연결합니다.

#### B-level 구현 역할 기록

- Thread 전체에서 이 commit이 연결하는 앞/뒤 단계:
- 실제로 추가·수정된 핵심 symbol과 state:
- 이 commit만으로 충분하지 않아 후속 commit을 확인해야 하는 부분:


#### Test commit 분석 기록

- **대상 production invariant:** server는 launcher mask와 무관하게 required event signals를 받을 수 있어야 합니다.
- **재현하는 failure 또는 boundary:** blocked mask를 상속해 PID는 출력하지만 data/termination을 처리하지 못하는 server
- **사용한 test technique:** masked-exec wrapper + real server/client + real SIGTERM
- **분류:** process-lifecycle integration regression

확인할 production path:

- [ ] signal initialization
- [ ] self-pipe handler
- [ ] bit event path
- [ ] termination event
- [ ] atexit cleanup

이 테스트가 증명하는 항목:

- [ ] data unblock
- [ ] termination unblock
- [ ] status 143
- [ ] endpoint cleanup

이 테스트가 증명하지 않는 항목:

- [ ] all signal policies
- [ ] event loss behavior
- [ ] other launch environments

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

이 commit이 Thread final lifecycle regression입니다.


## 6. Invariant ledger

### Source에서 확정된 핵심 invariant

- handler는 `errno`를 보존하고 async-signal-safe event delivery만 수행합니다.
- session, bit, byte, sequence, stdout, socket work는 event loop가 전담합니다.
- event record는 self-pipe에 atomic하게 기록 가능한 fixed size입니다.
- event loss가 감지되면 silent continuation이 아니라 fail-stop cleanup을 수행합니다.
- data와 termination signals는 inherited mask와 무관하게 deliverable해야 합니다.

### 시간에 따른 변화 기록

| Commit | Source에서 확정된 변화 | 실제 state/condition | code evidence | 상태: 도입·강화·부족·복구·검증 |
| --- | --- | --- | --- | --- |
| `a7d994b0a4b6` | bit processing을 explicit `(sender, signal)` event를 받는 function으로 추출하고 event size가 `PIPE_BUF` 안인지 compile-time으로 확인합니다. |  |  |  |
| `22363f83ff25` | handler를 `errno` preservation과 fixed event self-pipe write로 제한하고 `pselect` loop가 모든 protocol work를 수행하게 합니다. |  |  |  |
| `4c535ac8657e` | handler의 first self-pipe event write에 `EAGAIN`을 주입하고 server fail-stop을 검증합니다. |  |  |  |
| `e304c63bee3e` | `SIGHUP`, `SIGINT`, `SIGTERM`을 data signal과 같은 self-pipe event로 전달하고 normal cleanup path에서 종료합니다. |  |  |  |
| `686b0d2a14e3` | handler 설치 후 two data signals와 three supported termination signals를 process mask에서 명시적으로 unblock합니다. |  |  |  |
| `72424469474c` | wrapper가 data와 termination signals를 block한 뒤 server를 `exec`하고 message delivery와 SIGTERM cleanup을 검증합니다. |  |  |  |

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 상태 | 실제 failure/위험 | Fix 또는 전환 commit | 수정된 decision/invariant | Test 또는 후속 검증 | 학습자 code evidence |
| --- | --- | --- | --- | --- | --- |
| handler가 state/output/ACK를 직접 처리 | async-safe 범위를 넘고 multi-field state가 handler context에 결합 | `a7d994b0a4b6 → 22363f83ff25` | event value 추출 후 handler는 self-pipe write만 수행 | 4c535ac8657e event-write loss injection |  |
| termination handler에서 직접 cleanup | filesystem/socket bookkeeping을 async context에서 수행할 위험 | `e304c63bee3e` | termination도 event loop와 normal cleanup 사용 | 72424469474c에서 SIGTERM/status/cleanup 검증 |  |
| launcher가 event signals를 block한 채 exec | PID는 publish하지만 data/shutdown events를 받지 못함 | `686b0d2a14e3` | required signals explicit unblock | 72424469474c masked-exec regression |  |

전용 test commit이 없는 연결에는 존재하지 않는 test를 만들어 적지 않습니다.

## 8. Ownership / state / responsibility 변화

| 단계 | state 또는 responsibility owner | transition | 당시 한계 또는 다음 변화 | 실제 symbol/field |
| --- | --- | --- | --- | --- |
| pre-refactor | signal handler | authorization, assembly, output, response | complex async shared state |  |
| `a7d994b0a4b6` | extracted transition function | event value를 받지만 handler가 호출 | conceptual separation |  |
| `22363f83ff25` | `pselect` event loop | 모든 authoritative mutation과 I/O | handler는 event producer |  |
| shutdown integration | event loop + main/atexit | exit status와 cleanup | handler cleanup 없음 |  |

## 9. Thread 최종 상태

Source에서 확정된 최종 조건:

- handler는 sender PID와 signal number를 fixed event로 복사해 nonblocking self-pipe에 씁니다.
- event loop가 complete event를 읽고 authorization, assembly, stdout, ACK를 순서대로 실행합니다.
- event enqueue loss는 server error exit와 cleanup으로 끝납니다.
- SIGHUP/SIGINT/SIGTERM도 event loop를 거쳐 `128 + signal` status로 처리됩니다.
- required signals는 handler 설치 뒤 명시적으로 unblock됩니다.

학습자 기록:

- 최종 state fields와 owner:
- 정상 transition 순서:
- 실패 시 중단·reset·cleanup 순서:
- 최종 상태가 보장하지 않는 것:
- 이 Thread를 한 문단으로 설명한 최종 서술:

## 10. 최종 architecture 또는 execution flow 정리

아래 노드를 해당 SHA에서 확인한 함수명과 branch로 연결합니다.

- [ ] `sigaction`과 signal mask initialization
- [ ] handler entry에서 `errno` save
- [ ] sender/signal을 event record로 copy
- [ ] nonblocking pipe write와 overflow flag
- [ ] `pselect` wake-up과 complete record read
- [ ] data event/termination event branch
- [ ] state transition, output, ACK 또는 exit status
- [ ] main return과 registered cleanup

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

- [ ] commit map의 6개 SHA를 source 순서대로 모두 설명할 수 있습니다.
- [ ] 각 code excerpt에 SHA, path, symbol, 선택 이유가 기록돼 있습니다.
- [ ] final HEAD 코드를 historical SHA의 증거로 사용한 곳이 없습니다.
- [ ] 정상 경로와 failure path를 state mutation 순서로 설명할 수 있습니다.
- [ ] source 확정 invariant와 직접 확인한 code evidence를 구분했습니다.
- [ ] test commit의 invariant, failure, technique, production path, proves/not-proves를 기록했습니다.
- [ ] Thread final state를 함수와 state field 수준으로 설명할 수 있습니다.

### 이 Thread와 직접 연결된 Major Engineering Difficulties

- asynchronous signal delivery와 sequential protocol state machine 사이에 lossless bridge가 필요합니다.
- handler에서 complex work를 제거하면서 sender PID와 signal identity를 보존해야 합니다.
- shutdown과 mask normalization을 별도 unsafe path가 아니라 같은 lifecycle에 통합해야 합니다.
