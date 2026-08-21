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

- [x] handler 전후 responsibility를 symbol 단위로 비교했습니다.
- [x] event write/read/validation/bit transition/output/ACK 순서를 trace로 작성했습니다.
- [x] event loss detection부터 server exit와 endpoint cleanup까지 연결했습니다.
- [x] data event와 termination event의 공통 input과 다른 result를 설명했습니다.
- [x] masked-exec test를 disposition과 deliverability production code에 연결했습니다.

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

- 각 항목은 해당 SHA의 tree를 기준으로 읽었습니다.
- 변경 전 상태는 해당 SHA의 parent 또는 지정된 이전 관련 SHA에서 확인했습니다.
- 같은 commit이 다른 Thread에 다시 등장해도 이 Thread의 질문으로 별도 기록했습니다.
- runtime test는 실행하지 않았으며, 실행 결과처럼 표현하지 않았습니다.

## 5. Commit별 학습 기록

### 1. `a7d994b0a4b6` — refactor(server): 비트 상태 전이 로직 추출

- **Importance:** B
- **Tags:** REFACTOR, SELF_PIPE
- **Thread 내 역할:** bit processing을 explicit `(sender, signal)` event를 받는 function으로 추출하고 event size가 `PIPE_BUF` 안인지 compile-time으로 확인합니다.

#### 원문에서 확정된 맥락

이 intermediate SHA에서는 handler가 extracted function을 여전히 호출합니다. authorization, byte assembly, sequence, output, ACK queueing을 `siginfo_t` 자체와 분리한 preparatory refactor입니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] `t_bit_event`의 sender/signal fields
- [x] `sizeof(t_bit_event) <= PIPE_BUF` compile-time assertion
- [x] extracted bit-transition function signature
- [x] session/byte/bit/sequence/line state access
- [x] handler가 event를 만들고 function을 직접 호출하는 중간 상태

#### 비교 기준

parent handler body에서 이동한 authorization/assembly/response logic과 `22363f83ff25`의 caller 이동을 분리해 확인했습니다.

#### B-level 구현 역할 기록

- Thread 전체에서 이 commit이 연결하는 앞/뒤 단계: signal handler body가 `siginfo_t`에서 sender를 읽는 동시에 owner 검사, bit assembly, output, sequence와 ACK queueing까지 직접 수행했습니다. → `22363f83ff25`에서 handler caller가 transition function이 아니라 nonblocking event-pipe write로 바뀌고 normal loop가 `process_bit`을 호출합니다.
- 실제로 추가·수정된 핵심 symbol과 state: `t_bit_event { pid_t sender; int signal; }`을 만들고 `process_bit(const t_bit_event *)` 계열 함수로 transition logic을 옮겼습니다. compile-time assertion으로 record가 `PIPE_BUF` 이하인지 확인했습니다.
- 이 commit만으로 충분하지 않아 후속 commit을 확인해야 하는 부분: handler metadata와 protocol transition이 한 함수에 결합돼 self-pipe consumer로 caller를 옮길 수 없었습니다. 다만 이 commit은 책임 이동을 완료하지 않습니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] transition logic을 handler metadata에서 explicit event value로 분리
- [x] atomic self-pipe delivery를 위한 fixed record 조건 준비

**아직 보장하지 않는 것**

- [x] async-safe handler boundary
- [x] normal-loop state ownership
- [x] event-loss policy

#### 코드 증거 기록

- 파일 경로: `src/server.c`
- symbol 또는 함수: `t_bit_event`, `process_bit`, `handle_signal`
- 확인한 state fields: `sender`, `signal`, `client_pid`, `current_byte`, `received_bits`, `sequence`, `line_started`
- caller → callee: signal handler → event value construction → `process_bit` (여전히 handler context)
- 핵심 branch 또는 mutation 순서: handler가 sender PID와 signal number를 event value에 복사한 뒤 같은 handler context에서 extracted transition function을 직접 호출합니다.
- parent 또는 이전 관련 SHA와의 diff 요약: handler 내부 logic이 event-value function으로 추출됐지만 실행 context는 아직 바뀌지 않았습니다.
- 삽입할 최소 코드 조각과 선택 이유: 표와 호출 순서만으로 invariant가 충분히 드러나므로 코드 덤프를 추가하지 않았습니다.
- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`22363f83ff25`에서 handler는 transition function 대신 event pipe write만 수행합니다.
### 2. `22363f83ff25` — refactor(server): signal 처리를 self-pipe event loop로 제한

- **Importance:** S
- **Tags:** ARCH, SELF_PIPE, RISK
- **Thread 내 역할:** handler를 `errno` preservation과 fixed event self-pipe write로 제한하고 `pselect` loop가 모든 protocol work를 수행하게 합니다.

#### 원문에서 확정된 맥락

event loop는 complete records를 읽어 sender authorization, bit/byte state, stdout, sequence ACK를 처리합니다. failed/partial event write는 overflow flag를 세우고 server는 계속 진행하지 않습니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] handler entry/exit의 `errno` save/restore
- [x] event에 sender PID와 signal만 복사
- [x] self-pipe descriptors와 nonblocking/CLOEXEC setup
- [x] full event-size write check와 overflow flag
- [x] `pselect`의 response socket/self-pipe fd set
- [x] complete record read와 validation
- [x] authorization→assembly→output→sequence→ACK order
- [x] ordinary loop-owned state로 field type/ownership 이동
- [x] overflow→event-loop error→cleanup path

#### 비교 기준

`a7d994b0a4b6`의 handler → `process_bit` direct call이 handler → event-pipe write, loop → `process_bit`으로 바뀐 diff를 확인했습니다.

#### S-level 재구성

- 이 commit 직전의 관련 state와 caller/callee: `a7d994b0a4b6`에서 event value는 생겼지만 handler가 `process_bit`을 직접 호출해 ordinary state와 stdout/socket work를 async context에서 수행했습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: multi-field session mutation과 output/socket calls를 signal handler에서 실행하면 async-signal-safe 범위를 넘고 normal event-loop input과 state ordering도 분산됩니다.
- 변경된 decision과 state mutation 순서: self-pipe read/write descriptors를 만들고 write end를 nonblocking/CLOEXEC로 설정했습니다. handler는 `errno`를 보존한 채 fixed `t_bit_event` 한 건을 pipe에 쓰고, `pselect` loop가 complete record를 읽어 모든 protocol transition을 실행합니다. signal handler: save `errno` → event(sender, signal) 생성 → one `write` → full-size가 아니면 `g_event_overflow=1` → restore `errno`. event loop: response socket/self-pipe readiness → overflow 확인 → complete record read/validation → authorization → bit/byte/output/sequence → datagram ACK → loop입니다.
- 정상 경로와 failure 경로가 갈라지는 조건: handler pipe write의 -1/partial count는 event loss로 간주합니다. loop는 overflow flag나 incomplete/permanent read, output/response error를 만나면 error return하고 main cleanup으로 종료합니다. queue capacity를 늘리거나 lost event를 복원하지 않습니다.
- 후속 commit이 강화하거나 교체하는 부분: `4c535ac8657e`가 first write `EAGAIN`을 주입해 fail-stop을 검증하고 `e304c63bee3e`가 termination events를 같은 경로에 넣습니다. Thread 4가 output-before-ACK를 보강합니다.

| 추적 항목 | 학습자 기록 | 코드 근거 |
| --- | --- | --- |
| 직전 architecture/state | handler가 event value를 만든 뒤 protocol transition을 직접 호출 | `a7d994b0a4b6` handler |
| 해결하려던 핵심 문제 | async context에서 ordinary state/output/socket work 제거 | new self-pipe producer/consumer |
| 실패 가능한 interleaving 또는 partial failure | nonblocking pipe full/partial write로 ordered bit event 손실 | `g_event_overflow` |
| 선택한 decision | handler는 fixed record enqueue, loop는 모든 mutation/I/O | `handle_signal`, `read_event`, `process_bit` |
| ownership/lifecycle/state transition | ordinary session fields는 loop stack/state가 소유; handler global은 overflow/fds만 참조 | field type and caller diff |
| 후속 fix 또는 regression evidence | EAGAIN fault injection, termination integration, output commit | `4c535ac8657e`, `e304c63bee3e`, `db2004556d8b` |

#### 보장 범위

**이 commit이 보장하는 것**

- [x] async-signal-safe responsibility boundary
- [x] sequential authoritative state machine
- [x] event-loss fail-stop

**아직 보장하지 않는 것**

- [x] unbounded pipe capacity
- [x] lost-event reconstruction
- [x] output-before-ACK commit 완성

#### 코드 증거 기록

- 파일 경로: `src/server.c`
- symbol 또는 함수: `handle_signal`, `read_event`, `process_bit`, `run_event_loop`, `cleanup_server`
- 확인한 state fields: `g_event_overflow`, `event_pipe`, `client_pid`, `current_byte`, `received_bits`, `sequence`, `line_started`
- caller → callee: kernel signal → `handle_signal` → event pipe; `pselect` loop → `read_event` → `process_bit` → output/`send_response`
- 핵심 branch 또는 mutation 순서: signal handler: save `errno` → event(sender, signal) 생성 → one `write` → full-size가 아니면 `g_event_overflow=1` → restore `errno`. event loop: response socket/self-pipe readiness → overflow 확인 → complete record read/validation → authorization → bit/byte/output/sequence → datagram ACK → loop입니다.
- parent 또는 이전 관련 SHA와의 diff 요약: response-work pipe 중간 architecture를 signal-fact self-pipe로 교체하고 authoritative state를 normal context로 이동했습니다.
- 삽입한 최소 코드 조각과 선택 이유: `22363f83ff25`, `src/server.c: signal handler`: 최종 handler 책임과 event-loss detection을 동시에 보여 주는 최소 조각입니다.

```c
saved_errno = errno;
event.sender = info->si_pid;
event.signal = signal;
if (write(g_event_pipe[1], &event, sizeof(event)) != sizeof(event))
	g_event_overflow = 1;
errno = saved_errno;
```

- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`4c535ac8657e`에서 first event-write `EAGAIN`을 주입합니다.
### 3. `4c535ac8657e` — test(server): self-pipe 이벤트 손실 시 fail-stop 검증

- **Importance:** A
- **Tags:** TEST, SELF_PIPE, RISK
- **Thread 내 역할:** handler의 first self-pipe event write에 `EAGAIN`을 주입하고 server fail-stop을 검증합니다.

#### 원문에서 확정된 맥락

dropped event는 ordered stream의 한 bit를 잃는 것이므로 subsequent processing을 계속할 수 없습니다. server error exit, endpoint removal, no success ACK, client failure를 확인합니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] production event write를 대체하는 compile-time hook
- [x] first call only `EAGAIN` state
- [x] handler overflow flag production branch
- [x] event loop의 flag→error exit
- [x] server endpoint removal assertion
- [x] client no-success-ACK/bounded failure assertion

#### 비교 기준

`22363f83ff25`의 production write macro/seam과 overflow reader를 test env/hook state에 연결했습니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: production code는 failed/partial event write를 fatal flag로 표시했지만 실제 handler branch를 deterministic하게 실행하는 test가 없었습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: OS pipe를 실제로 채우는 방식은 timing-dependent하고 first lost event를 정확히 고정하기 어렵습니다.
- 변경된 decision과 state mutation 순서: Make fault build가 production event-write call을 `MT_EVENT_WRITE` hook으로 치환하고 test implementation은 env 설정 시 첫 호출만 `-1/EAGAIN`을 반환합니다. fault server start → client가 첫 data signal 전송 → handler hook first call EAGAIN → production full-size check가 overflow flag set → loop가 flag 관측 후 error return → main diagnostic/cleanup → endpoint removal → client는 success ACK 없이 bounded failure입니다.
- 정상 경로와 failure 경로가 갈라지는 조건: 주입은 first call only라 failure 지점이 deterministic합니다. hook 이후 protocol processing을 계속하거나 ACK를 보내면 test가 client/server status와 output/endpoint assertion에서 실패합니다.
- 후속 commit이 강화하거나 교체하는 부분: `e304c63bee3e`는 expected termination을 error overflow와 구분해 같은 cleanup architecture로 보냅니다.

#### Test commit 분석 기록

- **대상 production invariant:** self-pipe에 전달되지 않은 signal event가 있으면 protocol processing을 계속하지 않습니다.
- **재현하는 failure 또는 boundary:** nonblocking pipe write `EAGAIN`으로 one bit event가 사라지는 상황
- **사용한 test technique:** handler event-write hook의 first-call deterministic fault injection
- **분류:** deterministic fault-injection regression
- **failure 주입 또는 process orchestration 시작 지점:** `tests/protocol_regressions.sh`가 fault server에 `MT_TEST_EVENT_EAGAIN=1`을 설정합니다.
- **production code에 진입하는 최초 호출:** client의 first signal이 production handler에 들어가고 handler가 `MT_EVENT_WRITE`를 호출합니다.
- **핵심 assertion과 관측값:** server nonzero/error diagnostic, endpoint removal, client timeout/failure, success ACK 부재를 확인합니다.
- **증명하는 것:** event loss detection<br>no false ACK<br>server fail-stop<br>endpoint cleanup
- **증명하지 않는 것:** OS-level signal completeness<br>overflow recovery<br>burst capacity
- **후속 변경에서 막아야 할 구체적인 회귀:** overflow flag를 무시하고 shifted bit state로 계속 처리하는 회귀를 막습니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] event loss detection regression
- [x] no false ACK
- [x] server fail-stop
- [x] endpoint cleanup

**아직 보장하지 않는 것**

- [x] OS-level signal completeness
- [x] overflow recovery
- [x] burst capacity

#### 코드 증거 기록

- 파일 경로: `src/server.c`, `tests/protocol_regressions.sh`, `Makefile`
- symbol 또는 함수: `MT_EVENT_WRITE`, `mt_test_event_write`, `handle_signal`, `run_event_loop`
- 확인한 state fields: `first-call injection flag`, `g_event_overflow`
- caller → callee: real client signal → production handler → injected write hook → production overflow branch → loop/main cleanup
- 핵심 branch 또는 mutation 순서: fault server start → client가 첫 data signal 전송 → handler hook first call EAGAIN → production full-size check가 overflow flag set → loop가 flag 관측 후 error return → main diagnostic/cleanup → endpoint removal → client는 success ACK 없이 bounded failure입니다.
- parent 또는 이전 관련 SHA와의 diff 요약: fault-only server target와 deterministic event-write seam/scenario가 추가됐으며 production algorithm은 같은 full-size check를 실행합니다.
- 삽입할 최소 코드 조각과 선택 이유: 표와 호출 순서만으로 invariant가 충분히 드러나므로 코드 덤프를 추가하지 않았습니다.
- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`e304c63bee3e`는 expected external termination도 same cleanup architecture로 보냅니다.
### 4. `e304c63bee3e` — fix(server): 종료 시그널을 이벤트 루프 정리 경로로 처리

- **Importance:** A
- **Tags:** SELF_PIPE, PROCESS_LIFECYCLE
- **Thread 내 역할:** `SIGHUP`, `SIGINT`, `SIGTERM`을 data signal과 같은 self-pipe event로 전달하고 normal cleanup path에서 종료합니다.

#### 원문에서 확정된 맥락

event loop가 termination event를 인식해 signal number를 main에 돌려주고 process는 `128 + signal`로 종료합니다. close/unlink bookkeeping은 handler가 아니라 registered cleanup에서 수행합니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] termination signals에 same handler registration
- [x] event record의 signal-number representation
- [x] event-loop data/termination branch
- [x] signal number를 main에 반환하는 contract
- [x] `128 + signal` status
- [x] registered cleanup의 close/unlink
- [x] handler에 close/unlink/exit가 없음

#### 비교 기준

`22363f83ff25`의 data-only event branch에 termination classification/return contract와 handler registration이 추가됐습니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: data signals는 self-pipe를 사용했지만 termination signal은 별도 direct-exit handler/lifecycle로 처리돼 normal descriptor/path cleanup과 분리될 수 있었습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: handler에서 `_exit`하면 registered cleanup을 건너뛰고, close/unlink 같은 bookkeeping을 handler에서 수행하면 async-signal-safe 범위를 벗어납니다.
- 변경된 decision과 state mutation 순서: HUP/INT/TERM에 data와 같은 event handler를 등록하고 event loop가 signal number를 termination event로 분류해 main에 반환하도록 했습니다. termination signal → handler errno save/event pipe write/restore → loop complete record read → termination branch가 signal number return → main이 `128 + signal` status 선택 → registered cleanup이 fd close/path unlink를 수행합니다.
- 정상 경로와 failure 경로가 갈라지는 조건: data signals는 `process_bit`로, supported termination signals는 protocol mutation 없이 shutdown status로 갈라집니다. enqueue failure면 ordinary event loss error path입니다.
- 후속 commit이 강화하거나 교체하는 부분: `686b0d2a14e3`이 inherited blocked mask에서도 이 signals가 deliverable하도록 합니다. `72424469474c`가 SIGTERM status 143과 endpoint cleanup을 검증합니다.

#### Fix 연결 기록

| 단계 | Source에서 확정된 내용 | 해당 SHA의 코드 근거 |
| --- | --- | --- |
| 기존 가정 | termination handler에서 직접 종료해도 owned endpoint와 descriptors가 정리됩니다. | 직전 termination lifecycle은 data event loop와 분리됐습니다. |
| 실제 failure 또는 위험 | async context에서 cleanup을 생략하거나 unsafe filesystem/socket bookkeeping을 수행할 수 있습니다. | bound Unix path와 pipe/socket descriptors는 normal teardown state가 필요합니다. |
| root cause | external shutdown을 normal event-loop ownership과 다른 path로 처리했습니다. | 새 diff가 termination을 같은 event record/loop return으로 옮깁니다. |
| 수정 invariant/decision | termination도 self-pipe event로 capture하고 main/atexit path에서 `128 + signal`로 종료합니다. | handler registration, loop termination branch, main status calculation |

- 변경 전 failure를 재현하거나 추론할 수 있는 입력/상태: 직전 상태와 해당 분기를 직접 비교했습니다.
- root cause가 드러나는 field 또는 call order: termination signal → handler errno save/event pipe write/restore → loop complete record read → termination branch가 signal number return → main이 `128 + signal` status 선택 → registered cleanup이 fd close/path unlink를 수행합니다.
- 수정된 invariant를 고정하는 후속 regression test: `72424469474c`가 masked-exec 상황에서 SIGTERM status/cleanup까지 검증합니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] normal-context asynchronous shutdown
- [x] signal-derived status
- [x] endpoint cleanup path 재사용

**아직 보장하지 않는 것**

- [x] uncatchable signals
- [x] cleanup success의 transaction 보장

#### 코드 증거 기록

- 파일 경로: `src/server.c`
- symbol 또는 함수: `install_signal_handlers`, `handle_signal`, `run_event_loop`, `main`, `cleanup_server`
- 확인한 state fields: `termination signal number`, `event record`
- caller → callee: termination handler → self-pipe → event loop → main return/status → atexit cleanup
- 핵심 branch 또는 mutation 순서: termination signal → handler errno save/event pipe write/restore → loop complete record read → termination branch가 signal number return → main이 `128 + signal` status 선택 → registered cleanup이 fd close/path unlink를 수행합니다.
- parent 또는 이전 관련 SHA와의 diff 요약: 별도 direct termination 경로가 self-pipe event와 normal cleanup/status path에 통합됐습니다.
- 삽입할 최소 코드 조각과 선택 이유: 표와 호출 순서만으로 invariant가 충분히 드러나므로 코드 덤프를 추가하지 않았습니다.
- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`686b0d2a14e3`에서 inherited mask가 event delivery를 막지 않도록 unblock합니다.
### 5. `686b0d2a14e3` — fix(server): 상속된 이벤트 시그널 마스크 해제

- **Importance:** A
- **Tags:** PROCESS_LIFECYCLE, RISK
- **Thread 내 역할:** handler 설치 후 two data signals와 three supported termination signals를 process mask에서 명시적으로 unblock합니다.

#### 원문에서 확정된 맥락

signal disposition만 설치해도 blocked mask는 `exec` 뒤 남습니다. server는 필요한 signal delivery conditions를 스스로 세우고 unrelated inherited settings는 유지합니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] required five-signal set construction
- [x] `sigprocmask(SIG_UNBLOCK)` 위치
- [x] unblock failure→startup error/cleanup
- [x] unrelated masks 보존
- [x] PID publication이 normalization 뒤

#### 비교 기준

`e304c63bee3e` startup sequence와 비교해 handler disposition 다음, readiness publication 전 deliverability normalization이 추가됐습니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: server는 handlers를 설치했지만 launcher가 blocked mask를 설정한 뒤 `exec`하면 그 mask를 상속했습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: blocked signal에는 handler가 있어도 delivery되지 않으므로 server가 PID를 출력한 뒤 data/termination events를 영원히 처리하지 않을 수 있습니다.
- 변경된 decision과 state mutation 순서: required two data signals와 HUP/INT/TERM만 담은 set을 만들고 `sigprocmask(SIG_UNBLOCK, ...)`를 handler 설치 뒤 PID publication 전에 호출합니다. endpoint/self-pipe setup → `sigaction` handlers 설치 → required signal set 구성 → `SIG_UNBLOCK` → 성공 뒤 PID publication/event loop입니다.
- 정상 경로와 failure 경로가 갈라지는 조건: unblock가 실패하면 startup error로 cleanup합니다. `SIG_UNBLOCK`은 listed signals만 바꾸므로 unrelated inherited blocked settings는 유지됩니다.
- 후속 commit이 강화하거나 교체하는 부분: `72424469474c`가 exact set을 먼저 block한 wrapper에서 message와 SIGTERM cleanup을 검증합니다.

#### Fix 연결 기록

| 단계 | Source에서 확정된 내용 | 해당 SHA의 코드 근거 |
| --- | --- | --- |
| 기존 가정 | handler installation이면 signal delivery가 보장됩니다. | 직전 init은 `sigaction`만 수행했습니다. |
| 실제 failure 또는 위험 | `exec` inherited mask 때문에 PID만 publish하고 events를 받지 못합니다. | POSIX process signal mask는 exec 뒤 유지됩니다. |
| root cause | disposition만 설정하고 deliverability를 초기화하지 않았습니다. | 새 helper가 `SIG_UNBLOCK`을 명시적으로 호출합니다. |
| 수정 invariant/decision | required data/termination signals를 PID publication 전에 explicit unblock합니다. | `src/server.c: unblock_event_signals`와 main call order |

- 변경 전 failure를 재현하거나 추론할 수 있는 입력/상태: 직전 상태와 해당 분기를 직접 비교했습니다.
- root cause가 드러나는 field 또는 call order: endpoint/self-pipe setup → `sigaction` handlers 설치 → required signal set 구성 → `SIG_UNBLOCK` → 성공 뒤 PID publication/event loop입니다.
- 수정된 invariant를 고정하는 후속 regression test: `72424469474c`의 masked-exec regression입니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] launcher mask와 무관한 required event delivery

**아직 보장하지 않는 것**

- [x] all inherited signal policy reset
- [x] unhandled signal behavior

#### 코드 증거 기록

- 파일 경로: `src/server.c`
- symbol 또는 함수: `unblock_event_signals`, `main`
- 확인한 state fields: `sigset_t event_signals`
- caller → callee: server initialization → handler install → `unblock_event_signals` → PID output/event loop
- 핵심 branch 또는 mutation 순서: endpoint/self-pipe setup → `sigaction` handlers 설치 → required signal set 구성 → `SIG_UNBLOCK` → 성공 뒤 PID publication/event loop입니다.
- parent 또는 이전 관련 SHA와의 diff 요약: required signal disposition뿐 아니라 deliverability를 server가 자체 초기화합니다.
- 삽입할 최소 코드 조각과 선택 이유: 표와 호출 순서만으로 invariant가 충분히 드러나므로 코드 덤프를 추가하지 않았습니다.
- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`72424469474c`에서 masked-exec server의 message와 SIGTERM을 검증합니다.
### 6. `72424469474c` — test(server): 차단된 시그널 마스크 상속 뒤 메시지 검증

- **Importance:** B
- **Tags:** TEST, PROCESS_LIFECYCLE
- **Thread 내 역할:** wrapper가 data와 termination signals를 block한 뒤 server를 `exec`하고 message delivery와 SIGTERM cleanup을 검증합니다.

#### 원문에서 확정된 맥락

PID publication만으로 success로 보지 않습니다. bit events, ACKs, NUL frame, status 143, endpoint removal, no unexpected diagnostics를 확인합니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] wrapper의 exact blocked signal set와 `exec`
- [x] PID publication 뒤 real client start
- [x] message+newline expected output
- [x] real SIGTERM과 status 143
- [x] server endpoint removal
- [x] stderr/diagnostic comparison

#### 비교 기준

`686b0d2a14e3`의 unblock set과 wrapper block set을 항목별로 맞추고 data/termination event branches를 모두 연결했습니다.

#### B-level 구현 역할 기록

- Thread 전체에서 이 commit이 연결하는 앞/뒤 단계: required signal unblock fix는 구현됐지만 실제 `exec` inheritance와 data/termination 양쪽을 함께 검증하는 test가 없었습니다. → 이 commit이 Thread final lifecycle regression입니다.
- 실제로 추가·수정된 핵심 symbol과 state: `masked_exec` wrapper가 data와 HUP/INT/TERM을 block한 채 real server를 `exec`하고 shell test가 real client message와 real SIGTERM을 보냅니다.
- 이 commit만으로 충분하지 않아 후속 commit을 확인해야 하는 부분: 단순 startup/PID assertion은 blocked mask가 실제 event processing을 막는 failure를 놓칩니다.

#### Test commit 분석 기록

- **대상 production invariant:** server는 launcher mask와 무관하게 required event signals를 받을 수 있어야 합니다.
- **재현하는 failure 또는 boundary:** blocked mask를 상속해 PID는 출력하지만 data/termination을 처리하지 못하는 server
- **사용한 test technique:** masked-exec wrapper + real server/client + real SIGTERM
- **분류:** process-lifecycle integration regression
- **failure 주입 또는 process orchestration 시작 지점:** `tests/inherited_mask.sh`가 `masked_exec` wrapper로 server를 시작합니다.
- **production code에 진입하는 최초 호출:** wrapper가 `exec`한 server의 `unblock_event_signals` initialization입니다.
- **핵심 assertion과 관측값:** message+newline, client completion, SIGTERM status 143, endpoint removal, clean stderr를 확인합니다.
- **증명하는 것:** data unblock<br>termination unblock<br>status 143<br>endpoint cleanup
- **증명하지 않는 것:** all signal policies<br>event loss behavior<br>other launch environments
- **후속 변경에서 막아야 할 구체적인 회귀:** handler만 설치하고 inherited mask를 방치하는 회귀를 막습니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] data signals unblock에 대한 process evidence
- [x] termination signal unblock
- [x] status 143
- [x] endpoint cleanup

**아직 보장하지 않는 것**

- [x] all signal policies
- [x] event loss behavior
- [x] 다른 launcher 환경 전체

#### 코드 증거 기록

- 파일 경로: `tests/masked_exec.c`, `tests/inherited_mask.sh`, `Makefile`
- symbol 또는 함수: `main`, `sigprocmask`, `execv`
- 확인한 state fields: `inherited blocked set`, `server PID/status`
- caller → callee: test shell → `masked_exec` → real server initialization → real client/self-pipe → SIGTERM/cleanup
- 핵심 branch 또는 mutation 순서: wrapper signal block → `exec(server)` → PID publication wait → real client message → exact output/ACK completion → SIGTERM → wait status 143 → endpoint removal/stderr 확인입니다.
- parent 또는 이전 관련 SHA와의 diff 요약: masked-exec wrapper와 end-to-end lifecycle scenario가 test target에 추가됐습니다.
- 삽입할 최소 코드 조각과 선택 이유: 표와 호출 순서만으로 invariant가 충분히 드러나므로 코드 덤프를 추가하지 않았습니다.
- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

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
| `a7d994b0a4b6` | bit processing을 explicit `(sender, signal)` event를 받는 function으로 추출하고 event size가 `PIPE_BUF` 안인지 compile-time으로 확인합니다. | protocol transition이 `(sender, signal)` value를 입력으로 받지만 handler가 authoritative caller입니다. | `src/server.c: t_bit_event`, extracted processor, handler caller | 도입·준비 |
| `22363f83ff25` | handler를 `errno` preservation과 fixed event self-pipe write로 제한하고 `pselect` loop가 모든 protocol work를 수행하게 합니다. | handler는 event producer이고 event loop만 session/bit/output/ACK state를 수정합니다. enqueue loss는 fatal flag입니다. | `src/server.c: handle_signal`, event pipe setup, `run_event_loop` | 강화·전환 |
| `4c535ac8657e` | handler의 first self-pipe event write에 `EAGAIN`을 주입하고 server fail-stop을 검증합니다. | first event enqueue 실패가 `g_event_overflow`를 거쳐 server error/cleanup으로 끝나는 production path를 검증합니다. | fault write hook + `tests/protocol_regressions.sh` assertions | 검증 |
| `e304c63bee3e` | `SIGHUP`, `SIGINT`, `SIGTERM`을 data signal과 같은 self-pipe event로 전달하고 normal cleanup path에서 종료합니다. | supported termination signal은 data와 같은 event transport를 쓰되 loop에서 shutdown result로 분기합니다. | `src/server.c` handler registrations, loop return, main status | 강화 |
| `686b0d2a14e3` | handler 설치 후 two data signals와 three supported termination signals를 process mask에서 명시적으로 unblock합니다. | server startup이 required event set의 deliverability를 직접 소유합니다. | `src/server.c: unblock_event_signals`, main call order | 복구 |
| `72424469474c` | wrapper가 data와 termination signals를 block한 뒤 server를 `exec`하고 message delivery와 SIGTERM cleanup을 검증합니다. | blocked mask를 상속한 real process가 data와 termination 모두 처리하고 cleanup하는지 검증합니다. | `tests/masked_exec.c`, `tests/inherited_mask.sh` | 검증 |

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 상태 | 실제 failure/위험 | Fix 또는 전환 commit | 수정된 decision/invariant | Test 또는 후속 검증 | 학습자 code evidence |
| --- | --- | --- | --- | --- | --- |
| handler가 state/output/ACK를 직접 처리 | async-safe 범위를 넘고 multi-field state가 handler context에 결합 | `a7d994b0a4b6 → 22363f83ff25` | event value 추출 후 handler는 self-pipe write만 수행 | `4c535ac8657e` | handler full-record write/overflow flag/loop error |
| termination handler에서 직접 cleanup | filesystem/socket bookkeeping을 async context에서 수행하거나 생략할 위험 | `e304c63bee3e` | termination도 event loop와 normal cleanup 사용 | `72424469474c` | termination event branch, main `128+signal`, endpoint assertion |
| launcher가 event signals를 block한 채 exec | PID는 publish하지만 data/shutdown events를 받지 못함 | `686b0d2a14e3` | required signals explicit unblock | `72424469474c` | `unblock_event_signals`; masked-exec message/SIGTERM |

전용 test commit이 없는 연결에는 존재하지 않는 test를 만들어 적지 않았습니다.

## 8. Ownership / state / responsibility 변화

| 단계 | state 또는 responsibility owner | transition | 당시 한계 또는 다음 변화 | 실제 symbol/field |
| --- | --- | --- | --- | --- |
| pre-refactor | signal handler | authorization, assembly, output, response | complex async shared state | handler globals and direct calls |
| `a7d994b0a4b6` | extracted transition function | event value를 받지만 handler가 호출 | conceptual separation | `t_bit_event`, `process_bit` |
| `22363f83ff25` | `pselect` event loop | 모든 authoritative mutation과 I/O | handler는 event producer | event pipe, ordinary session fields |
| shutdown integration | event loop + main/atexit | termination signal number→status/cleanup | handler cleanup 없음 | loop return, main, `cleanup_server` |

## 9. Thread 최종 상태

Source에서 확정된 최종 조건:

- handler는 sender PID와 signal number를 fixed event로 복사해 nonblocking self-pipe에 씁니다.
- event loop가 complete event를 읽고 authorization, assembly, stdout, ACK를 순서대로 실행합니다.
- event enqueue loss는 server error exit와 cleanup으로 끝납니다.
- SIGHUP/SIGINT/SIGTERM도 event loop를 거쳐 `128 + signal` status로 처리됩니다.
- required signals는 handler 설치 뒤 명시적으로 unblock됩니다.

학습자 기록:

- 최종 state fields와 owner: ordinary `client_pid`, `current_byte`, `received_bits`, `sequence`, `line_started`는 event loop가 소유합니다. handler와 loop가 공유하는 signal-safe state는 event-pipe descriptors와 `volatile sig_atomic_t g_event_overflow`입니다.
- 정상 transition 순서: signal delivery → handler의 errno 보존/fixed record write → pselect wakeup → complete event read → data/termination 분기 → data면 authorization/assembly/output/ACK, termination이면 signal status return입니다.
- 실패 시 중단·reset·cleanup 순서: event enqueue loss 또는 permanent read/transition/output/response error는 loop error→main failure→registered cleanup입니다. supported termination은 error가 아니라 `128+signal` status로 같은 cleanup을 사용합니다.
- 최종 상태가 보장하지 않는 것: pipe capacity 확장, lost event 복원, standard signal multiplicity 자체의 보존, uncatchable signal cleanup은 제공하지 않습니다.
- 이 Thread를 한 문단으로 설명한 최종 서술: 이 Thread는 handler body를 event value processor로 먼저 분리한 뒤, fixed record를 nonblocking self-pipe에 쓰는 producer로 handler 책임을 축소합니다. event loop 하나가 session과 I/O를 직렬화하고 enqueue loss를 fail-stop으로 처리합니다. termination도 같은 event path에 넣고 required signals를 startup에서 unblock해 launcher의 inherited mask와 무관한 lifecycle을 완성합니다.

## 10. 최종 architecture 또는 execution flow 정리

- [x] `sigaction`과 signal mask initialization
- [x] handler entry에서 `errno` save
- [x] sender/signal을 event record로 copy
- [x] nonblocking pipe write와 overflow flag
- [x] `pselect` wake-up과 complete record read
- [x] data event/termination event branch
- [x] state transition, output, ACK 또는 exit status
- [x] main return과 registered cleanup

```text
server initialization
    -> self-pipe/socket create + flags
    -> sigaction(data, HUP/INT/TERM)
    -> required signals SIG_UNBLOCK
    -> publish PID
asynchronous handler
    -> save errno -> event(sender, signal) -> nonblocking full-record write
    -> failure/partial: g_event_overflow = 1 -> restore errno
pselect event loop
    -> read complete event
    -> overflow/error: fail-stop
    -> termination: return signal number
    -> data: authorize -> assemble -> output -> sequence ACK
    -> main status -> registered cleanup

```

- 실제 함수·파일을 반영한 완성 흐름: `src/server.c`의 signal initialization/handler/event pipe/read loop/processor/main cleanup이 전체 path를 구성합니다.
- asynchronous boundary: handler의 fixed record write가 유일한 async→normal context handoff입니다.
- externally visible commit point: data event가 event loop에서 완전히 처리되고 필요한 output 뒤 ACK가 성공한 시점입니다. event enqueue 자체는 protocol success가 아닙니다.
- cleanup owner: main/registered server cleanup이 response socket, event pipe와 bound server path를 정리합니다.

## 11. 학습 완료 자가 점검

- [x] commit map의 6개 SHA를 source 순서대로 모두 설명할 수 있습니다.
- [x] 각 code excerpt에 SHA, path, symbol, 선택 이유가 기록돼 있습니다.
- [x] final HEAD 코드를 historical SHA의 증거로 사용한 곳이 없습니다.
- [x] 정상 경로와 failure path를 state mutation 순서로 설명할 수 있습니다.
- [x] source 확정 invariant와 직접 확인한 code evidence를 구분했습니다.
- [x] test commit의 invariant, failure, technique, production path, proves/not-proves를 기록했습니다.
- [x] Thread final state를 함수와 state field 수준으로 설명할 수 있습니다.
- [ ] 해당 SHA의 test를 로컬에서 직접 실행했습니다. — 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

### 이 Thread와 직접 연결된 Major Engineering Difficulties

- asynchronous signal delivery와 sequential protocol state machine 사이에 lossless bridge가 필요합니다.
- handler에서 complex work를 제거하면서 sender PID와 signal identity를 보존해야 합니다.
- shutdown과 mask normalization을 별도 unsafe path가 아니라 같은 lifecycle에 통합해야 합니다.
