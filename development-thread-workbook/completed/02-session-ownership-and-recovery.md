# Thread: Session ownership from implicit first-bit capture to resource-aware recovery

> 완성형 해설서가 아닙니다. 아래 확정 사항을 기준으로 각 commit SHA의 실제 코드와 diff를 읽고 기록란을 채웁니다.

## 1. Thread 목표

첫 data signal의 sender PID를 암묵적으로 owner로 잡던 설계가 명시적인 `ACQUIRE`/`READY` reservation으로 바뀌고, 마지막에는 PID 존재뿐 아니라 usable response endpoint까지 owner availability에 포함되는 과정을 복원합니다.

### Significance

single byte accumulator를 여러 sender가 공유하므로 ownership이 없으면 bit가 섞입니다. first-bit capture는 interleaving을 막지만 data 전 reservation을 표현하지 못합니다. explicit acquisition이 authority를 control channel로 옮긴 뒤에는 zombie처럼 PID는 남았지만 response socket은 사라진 상태가 PID-only liveness 가정을 깨뜨립니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- owner PID, partial byte, received-bit count, sequence, visible-line state는 언제 함께 생성·reset되는가?
- first-bit ownership은 competing sender를 어떻게 거부하며 explicit acquisition은 어떤 race를 없애는가?
- dead owner recovery에서 partial output을 newline으로 닫는 순서는 state reset과 어떻게 연결되는가?
- `ACQUIRE` source path와 claimed PID는 owner assignment 전에 어디에서 함께 검증되는가?
- data를 전혀 보내지 않은 live reserver도 exclusive하다는 사실을 어떤 test가 고정하는가?
- exited-but-unreaped owner에서 `kill(pid, 0)`과 response endpoint 상태가 왜 다르게 보이는가?

## 3. 완료 기준

- [x] implicit first-bit ownership과 explicit acquisition의 transition을 code diff로 비교했습니다.
- [x] owner recovery가 reset해야 하는 coupled fields와 partial-line delimiter를 기록했습니다.
- [x] live competitor, dead owner, idle reserver, zombie owner의 server 결과를 설명했습니다.
- [x] PID-only liveness의 root cause와 endpoint-aware fix를 helper/caller로 연결했습니다.
- [x] 각 test commit의 process orchestration과 production path를 분리해 기록했습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `10a7211969bf` | fix(server): 활성 세션에 다른 송신자 거부 | A | SESSION, RISK | active sender PID를 기록하고 NUL terminator까지 다른 sender의 data signal을 거부합니다. |
| 2 | `bc337552961a` | fix(server): 종료된 송신자의 세션 복구 | A | SESSION, PROCESS_LIFECYCLE, RISK | recorded owner가 사라지면 partial byte, bit count, owner, line state를 함께 reset하고 new sender가 진행할 수 있게 합니다. |
| 3 | `bdccf91f5a44` | test(server): 중단·경쟁 송신자 세션 검증 | A | TEST, SESSION, RISK | dedicated sender로 one-bit abandon, complete-byte-plus-partial abandon, live competition, owner exit recovery를 재현합니다. |
| 4 | `caf2feec4971` | feat(server): 획득 요청을 검증해 세션 소유권 예약 | S | ARCH, SESSION, CORE | exact `ACQUIRE` datagram을 검증한 뒤 data 전에 owner를 예약하고 `READY` 또는 `BUSY`를 반환합니다. |
| 5 | `f8e8444c5ded` | feat(client): READY 응답을 출처와 nonce로 상관 검증 | A | RESPONSE, RISK, INTEGRATION | client가 nonzero nonce ACQUIRE를 보내고 expected source, PID, fields, deadline이 맞는 READY만 수락합니다. |
| 6 | `e56e8cc87315` | test(session): 데이터 없는 활성 예약 경쟁 검증 | A | TEST, SESSION | session helper의 `reserve` mode가 acquisition만 완료하고 data를 보내지 않은 채 live owner를 유지합니다. |
| 7 | `1e3da4580733` | fix(server): 응답 경로가 사라진 세션 소유자 회수 | S | SESSION, PROCESS_LIFECYCLE, DEBUG | owner availability를 process presence와 expected same-UID client response socket usability의 결합으로 정의합니다. |
| 8 | `a481bfabb7b5` | test(session): 종료 송신자 회수 전 새 세션 복구 검증 | A | TEST, SESSION, PROCESS_LIFECYCLE | partial-session child를 exit시킨 뒤 `waitid(..., WNOWAIT)`로 unreaped 상태를 유지해 zombie PID와 vanished endpoint를 동시에 관측합니다. |

확인 원칙:

- 각 항목은 해당 SHA의 tree를 기준으로 읽었습니다.
- 변경 전 상태는 해당 SHA의 parent 또는 지정된 이전 관련 SHA에서 확인했습니다.
- 같은 commit이 다른 Thread에 다시 등장해도 이 Thread의 질문으로 별도 기록했습니다.
- runtime test는 실행하지 않았으며, 실행 결과처럼 표현하지 않았습니다.

## 5. Commit별 학습 기록

### 1. `10a7211969bf` — fix(server): 활성 세션에 다른 송신자 거부

- **Importance:** A
- **Tags:** SESSION, RISK
- **Thread 내 역할:** active sender PID를 기록하고 NUL terminator까지 다른 sender의 data signal을 거부합니다.

#### 원문에서 확정된 맥락

server에는 하나의 partial-byte accumulator만 있으므로 sender interleaving은 undecodable byte를 만듭니다. 이 단계의 ownership은 first accepted bit에서 시작합니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] owner PID field의 0 initial value
- [x] `siginfo_t.si_pid`로 first owner를 지정하는 branch
- [x] non-owner가 accumulator mutation 전에 거부되는 condition
- [x] competitor NACK와 client rejected status
- [x] NUL terminator 뒤 owner/byte/bit-count reset

#### 비교 기준

직전 handler의 shared accumulator 앞에 sender identity check와 first-owner assignment가 추가됐습니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: server의 `current_byte`와 `received_bits`는 process-wide 단일 accumulator였고 어느 sender가 만든 partial state인지 기록하지 않았습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: 서로 다른 PID가 번갈아 signal을 보내면 두 client의 bit가 같은 byte에 합쳐지고 한 client의 NUL이 다른 client의 state를 해제할 수 있습니다.
- 변경된 decision과 state mutation 순서: `g_client_pid`를 추가해 첫 accepted signal의 `si_pid`를 owner로 저장하고 NUL terminator가 완성될 때까지 다른 PID의 signal을 accumulator에 넣지 않습니다. handler entry → `g_client_pid == 0`이면 sender를 owner로 지정 → owner mismatch면 NACK 후 return → owner bit만 shift/count → 8 bits 완성 → NUL이면 byte/count/owner reset입니다.
- 정상 경로와 failure 경로가 갈라지는 조건: non-owner는 state mutation 전에 NACK를 받고 client의 reject failure로 끝납니다. owner가 중간에 종료되면 NUL이 오지 않아 session이 영구 점유되는 한계가 남습니다.
- 후속 commit이 강화하거나 교체하는 부분: `bc337552961a`가 vanished owner recovery를 추가하고 `caf2feec4971`가 ownership start를 ACQUIRE control message로 옮깁니다.

#### Fix 연결 기록

| 단계 | Source에서 확정된 내용 | 해당 SHA의 코드 근거 |
| --- | --- | --- |
| 기존 가정 | 한 client의 signal sequence가 다른 client와 섞이지 않습니다. | 직전 server state에는 sender PID field가 없었습니다. |
| 실제 failure 또는 위험 | 두 sender의 bits가 하나의 `(current_byte, received_bits)`를 공유합니다. | 모든 data signal이 같은 handler globals를 수정했습니다. |
| root cause | shared receive state에 owner identity가 없습니다. | 새 `g_client_pid`와 mismatch early return이 직접 보강점입니다. |
| 수정 invariant/decision | 한 owner PID만 NUL frame까지 receive state를 변경합니다. | `src/server.c: handle_bit` owner assignment/check/reset |

- 변경 전 failure를 재현하거나 추론할 수 있는 입력/상태: 직전 상태와 해당 분기를 직접 비교했습니다.
- root cause가 드러나는 field 또는 call order: handler entry → `g_client_pid == 0`이면 sender를 owner로 지정 → owner mismatch면 NACK 후 return → owner bit만 shift/count → 8 bits 완성 → NUL이면 byte/count/owner reset입니다.
- 수정된 invariant를 고정하는 후속 regression test: `bdccf91f5a44`의 live competitor scenario가 이 invariant를 process 수준에서 검증합니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] single active sender로 bit interleaving 차단

**아직 보장하지 않는 것**

- [x] data-before-reservation
- [x] correlated READY/BUSY
- [x] abandoned-owner recovery

#### 코드 증거 기록

- 파일 경로: `src/server.c`, `src/client.c`, `include/minitalk.h`
- symbol 또는 함수: `handle_bit`, `send_bit`
- 확인한 state fields: `g_client_pid`, `g_current_byte`, `g_received_bits`, `g_rejected`
- caller → callee: server signal handler → owner check → bit assembly → ACK/NACK `kill`; client handler flag → send status
- 핵심 branch 또는 mutation 순서: handler entry → `g_client_pid == 0`이면 sender를 owner로 지정 → owner mismatch면 NACK 후 return → owner bit만 shift/count → 8 bits 완성 → NUL이면 byte/count/owner reset입니다.
- parent 또는 이전 관련 SHA와의 diff 요약: shared accumulator에 owner identity와 competitor rejection이 추가됐지만 release는 NUL frame뿐입니다.
- 삽입할 최소 코드 조각과 선택 이유: 표와 호출 순서만으로 invariant가 충분히 드러나므로 코드 덤프를 추가하지 않았습니다.
- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`bc337552961a`에서 owner가 terminator 전에 사라진 경우 recovery가 추가됩니다.
### 2. `bc337552961a` — fix(server): 종료된 송신자의 세션 복구

- **Importance:** A
- **Tags:** SESSION, PROCESS_LIFECYCLE, RISK
- **Thread 내 역할:** recorded owner가 사라지면 partial byte, bit count, owner, line state를 함께 reset하고 new sender가 진행할 수 있게 합니다.

#### 원문에서 확정된 맥락

`kill(owner, 0)`과 `ESRCH`로 liveness를 판단합니다. visible payload가 있으면 newline으로 닫고, vanished owner에게 ACK send가 실패해도 recovery합니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] `kill(owner, 0)`와 `errno == ESRCH` branch
- [x] owner/current-byte/bit-count/line-state coupled reset
- [x] visible partial line에 newline을 쓰는 condition
- [x] ACK send ESRCH에서 recovery
- [x] new sender가 reset된 state에서 시작하는 순서

#### 비교 기준

`10a7211969bf`의 NUL-only release에 PID probe, line-visible state와 recovery reset path가 추가됐습니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: `10a7211969bf`는 owner가 NUL terminator를 보내야만 `g_client_pid`와 accumulator를 해제했습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: owner가 mid-byte 또는 complete byte 뒤 partial message 상태에서 종료하면 server가 계속 BUSY/NACK만 보내고 다음 sender는 진행할 수 없습니다.
- 변경된 decision과 state mutation 순서: `g_line_started`와 `reset_session`을 추가하고 owner probe가 `ESRCH`이거나 ACK send가 ESRCH로 실패하면 visible line을 newline으로 닫은 뒤 coupled state를 초기화합니다. competitor signal → `kill(owner, 0)` → `ESRCH`면 `reset_session(1)` → newline 필요 시 출력 → byte/bit/owner/line fields reset → new sender가 clean state에서 first owner가 됩니다.
- 정상 경로와 failure 경로가 갈라지는 조건: owner가 존재하면 competitor를 계속 거부합니다. owner ACK `kill`이 ESRCH이면 reset합니다. 이 SHA의 output write 결과는 아직 protocol failure로 충분히 전파되지 않으며 zombie PID는 `kill(pid,0)`에 성공해 회수되지 않습니다.
- 후속 commit이 강화하거나 교체하는 부분: `bdccf91f5a44`가 abandon/competition을 검증하고 `1e3da4580733`이 PID-only liveness를 endpoint-aware availability로 바꿉니다. Thread 4의 `db2004556d8b`가 delimiter write를 commit condition으로 만듭니다.

#### Fix 연결 기록

| 단계 | Source에서 확정된 내용 | 해당 SHA의 코드 근거 |
| --- | --- | --- |
| 기존 가정 | owner는 NUL terminator로 정상 종료합니다. | 직전 release branch는 completed NUL byte뿐이었습니다. |
| 실제 failure 또는 위험 | mid-message exit가 owner와 partial state를 남겨 server를 점유합니다. | `g_client_pid`, partial byte/count가 process exit와 독립적으로 유지됩니다. |
| root cause | owner lifetime 종료 뒤 coupled fields를 회수하는 transition이 없습니다. | 새 `reset_session`이 byte/bit/PID/line을 한곳에서 초기화합니다. |
| 수정 invariant/decision | PID absence에서 visible line을 delimit하고 receive state를 함께 reset합니다. | `kill(...,0)`/ACK ESRCH branches → `reset_session(1)` |

- 변경 전 failure를 재현하거나 추론할 수 있는 입력/상태: 직전 상태와 해당 분기를 직접 비교했습니다.
- root cause가 드러나는 field 또는 call order: competitor signal → `kill(owner, 0)` → `ESRCH`면 `reset_session(1)` → newline 필요 시 출력 → byte/bit/owner/line fields reset → new sender가 clean state에서 first owner가 됩니다.
- 수정된 invariant를 고정하는 후속 regression test: `bdccf91f5a44`가 one-bit/partial abandon과 live competition을 검증합니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] dead PID가 accumulator를 영구 점유하지 않음
- [x] visible partial output의 session delimiting 의도

**아직 보장하지 않는 것**

- [x] zombie owner detection
- [x] endpoint liveness
- [x] all-or-failure delimiter commit

#### 코드 증거 기록

- 파일 경로: `src/server.c`
- symbol 또는 함수: `handle_bit`, `reset_session`, `flush_byte`
- 확인한 state fields: `g_client_pid`, `g_current_byte`, `g_received_bits`, `g_line_started`
- caller → callee: signal handler → owner probe/ACK send → `reset_session` → output/reset
- 핵심 branch 또는 mutation 순서: competitor signal → `kill(owner, 0)` → `ESRCH`면 `reset_session(1)` → newline 필요 시 출력 → byte/bit/owner/line fields reset → new sender가 clean state에서 first owner가 됩니다.
- parent 또는 이전 관련 SHA와의 diff 요약: NUL-only cleanup이 owner disappearance에서도 실행되며 visible output 경계를 위한 `g_line_started`가 추가됐습니다.
- 삽입할 최소 코드 조각과 선택 이유: 표와 호출 순서만으로 invariant가 충분히 드러나므로 코드 덤프를 추가하지 않았습니다.
- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`bdccf91f5a44`에서 abandoned/live-competition cases를 검증합니다.
### 3. `bdccf91f5a44` — test(server): 중단·경쟁 송신자 세션 검증

- **Importance:** A
- **Tags:** TEST, SESSION, RISK
- **Thread 내 역할:** dedicated sender로 one-bit abandon, complete-byte-plus-partial abandon, live competition, owner exit recovery를 재현합니다.

#### 원문에서 확정된 맥락

normal client가 만들기 어려운 coupled session transitions를 real processes로 검증하고 expected output에 abandoned visible line을 닫는 newline을 포함합니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] sender mode별 signal count와 exit/pause 지점
- [x] server/sender/competitor process orchestration
- [x] live owner 유지 중 normal client 경쟁 순서
- [x] owner exit 뒤 replacement synchronization
- [x] partial byte discard와 complete-byte output 기대값
- [x] failure cleanup/terminate/reap logic

#### 비교 기준

`bc337552961a`의 owner check/reset branches를 각 sender mode와 expected output에 대응시켰습니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: dead-owner reset과 competitor rejection은 구현됐지만 실제 process exit/interleaving에서 partial byte와 line output이 원하는 대로 분리되는 regression evidence가 없었습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: normal client는 항상 full frame을 보내므로 one-bit abandon, complete-byte 뒤 partial abandon, live holder를 deterministic하게 만들 수 없습니다.
- 변경된 decision과 state mutation 순서: `tests/session_sender.c`에 `bit`, `partial`, `hold` modes를 두고 shell test가 real server/client/sender processes를 순서대로 실행합니다. server start → specialized sender가 지정 bit 수만 전송하거나 pause → competitor client 실행/상태 확인 → owner exit 또는 terminate → replacement client → expected stdout/stderr/status 비교 → 모든 child reap/cleanup입니다.
- 정상 경로와 failure 경로가 갈라지는 조건: one-bit abandon은 partial byte를 폐기하고 출력이 없어야 합니다. complete `X` 뒤 partial abandon은 `X
`을 남깁니다. live holder 동안 competitor는 실패하고, holder exit 뒤 replacement는 성공해야 합니다.
- 후속 commit이 강화하거나 교체하는 부분: `caf2feec4971` 이후 test helper가 explicit acquisition을 사용하도록 변하고 `e56e8cc87315`이 no-data reservation을 별도로 검증합니다.

#### Test commit 분석 기록

- **대상 production invariant:** 한 live owner만 receive state를 변경하고 dead owner의 partial state는 다음 sender가 상속하지 않습니다.
- **재현하는 failure 또는 boundary:** one-bit abandon, complete-byte-plus-partial abandon, live competitor, owner exit recovery
- **사용한 test technique:** specialized sender + real server/client processes + exact stdout/status comparison
- **분류:** targeted process-level integration regression
- **failure 주입 또는 process orchestration 시작 지점:** `tests/session_ownership.sh`가 server를 시작하고 `session_sender` mode를 선택합니다.
- **production code에 진입하는 최초 호출:** helper의 real `kill`이 production server signal handler에 진입합니다.
- **핵심 assertion과 관측값:** live competitor failure, owner exit 뒤 replacement success, one-bit no output, partial scenario의 `X
` 경계, child cleanup을 확인합니다.
- **증명하는 것:** live exclusivity<br>dead-owner recovery<br>partial-state discard<br>visible line delimiter
- **증명하지 않는 것:** ACQUIRE/READY semantics<br>zombie owner<br>write failure
- **후속 변경에서 막아야 할 구체적인 회귀:** 다른 sender의 bit가 active owner accumulator에 섞이거나 dead owner state가 replacement에 상속되는 회귀를 막습니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] live owner exclusivity에 대한 process-level evidence
- [x] dead-owner recovery
- [x] partial-state discard
- [x] visible line delimiter

**아직 보장하지 않는 것**

- [x] ACQUIRE/READY semantics
- [x] zombie owner
- [x] write failure

#### 코드 증거 기록

- 파일 경로: `tests/session_sender.c`, `tests/session_ownership.sh`, `Makefile`
- symbol 또는 함수: `main`, `send_bits`, `wait_for_ack`
- 확인한 state fields: `sender mode`, `ready synchronization`, `child PIDs`
- caller → callee: test shell → session sender/client/server executables → production signal handler/session reset
- 핵심 branch 또는 mutation 순서: server start → specialized sender가 지정 bit 수만 전송하거나 pause → competitor client 실행/상태 확인 → owner exit 또는 terminate → replacement client → expected stdout/stderr/status 비교 → 모든 child reap/cleanup입니다.
- parent 또는 이전 관련 SHA와의 diff 요약: specialized sender binary와 multi-process session scenarios가 test target에 추가됐습니다.
- 삽입할 최소 코드 조각과 선택 이유: 표와 호출 순서만으로 invariant가 충분히 드러나므로 코드 덤프를 추가하지 않았습니다.
- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`caf2feec4971`에서 ownership start mechanism이 control channel로 이동합니다.
### 4. `caf2feec4971` — feat(server): 획득 요청을 검증해 세션 소유권 예약

- **Importance:** S
- **Tags:** ARCH, SESSION, CORE
- **Thread 내 역할:** exact `ACQUIRE` datagram을 검증한 뒤 data 전에 owner를 예약하고 `READY` 또는 `BUSY`를 반환합니다.

#### 원문에서 확정된 맥락

request size, magic, kind, client PID, process viability, source path가 모두 맞아야 합니다. prior unavailable owner는 reset하고 new READY send failure는 reservation rollback으로 이어집니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] response socket의 exact request-size check
- [x] magic/kind/client PID/source address validation
- [x] claimed PID에서 expected client path derivation
- [x] live owner BUSY branch
- [x] free state owner assignment와 fields init
- [x] nonce를 echo한 READY send
- [x] READY send failure rollback
- [x] explicit acquisition 없는 data signal 처리 branch의 잔존

#### 비교 기준

`bc337552961a`의 first-bit assignment와 new `handle_session_request` owner assignment를 나란히 확인했습니다. scaffold의 역할은 보존하되 handler bypass가 남은 실제 tree 차이를 기록했습니다.

#### S-level 재구성

- 이 commit 직전의 관련 state와 caller/callee: ownership은 first data signal의 sender PID를 handler가 암묵적으로 캡처했습니다. control plane에는 `ACQUIRE` schema가 있었지만 server reservation transition이 없었습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: data 전 exclusivity와 correlated READY/BUSY를 표현할 수 없고, first bit와 owner assignment가 하나의 async path에 묶였습니다.
- 변경된 decision과 state mutation 순서: server response socket을 `pselect` loop에 넣고 exact ACQUIRE datagram을 검증한 뒤 free state에서 owner fields를 초기화하고 request nonce를 READY token으로 되돌려줍니다. READY send가 실패하면 방금 만든 reservation을 rollback합니다. `recvfrom` → exact request size → magic/kind/client PID/source path/same-UID socket/process probe → 기존 owner available이면 BUSY → unavailable이면 recovery → free state owner assignment/receive fields init → READY send → 실패 시 just-created owner reset입니다.
- 정상 경로와 failure 경로가 갈라지는 조건: invalid request는 owner state를 바꾸지 않습니다. live owner에는 BUSY를 보냅니다. READY send failure는 phantom owner를 남기지 않습니다. **관찰된 불일치:** 이 SHA의 data handler에는 `g_client_pid == 0`이면 first signal sender를 owner로 지정하는 구 branch가 아직 남아 있어, explicit ACQUIRE 없는 data를 완전히 차단하는 invariant는 이 commit 하나로는 성립하지 않습니다. 해당 bypass는 `aeb1b00867f4`에서 제거됩니다.
- 후속 commit이 강화하거나 교체하는 부분: `f8e8444c5ded`가 conforming client의 ACQUIRE/READY correlation을 구현하고 `aeb1b00867f4`가 남은 implicit first-bit bypass를 제거합니다. `e56e8cc87315`은 idle reservation을 검증합니다.

| 추적 항목 | 학습자 기록 | 코드 근거 |
| --- | --- | --- |
| 직전 architecture/state | first accepted data signal이 owner를 정함 | `bc337552961a: handle_bit` |
| 해결하려던 핵심 문제 | data 전 reservation과 correlated READY/BUSY | response socket request path |
| 실패 가능한 interleaving 또는 partial failure | READY send 실패 뒤 owner만 남는 phantom reservation | new-owner flag와 rollback branch |
| 선택한 decision | exact ACQUIRE validation 후 owner assign, nonce echo READY | `handle_session_request`, `send_response` |
| ownership/lifecycle/state transition | free→reserved→READY 또는 send failure→free | `g_client_pid` 및 receive fields |
| 후속 fix 또는 regression evidence | implicit first-bit bypass 제거와 idle reservation test | `aeb1b00867f4`, `e56e8cc87315` |

#### 보장 범위

**이 commit이 보장하는 것**

- [x] validated ACQUIRE/READY reservation path
- [x] source/PID binding을 통과한 owner assignment
- [x] READY send failure의 phantom owner rollback

**아직 보장하지 않는 것**

- [x] 이 SHA 단독의 data-before-ACQUIRE 강제
- [x] resource-aware zombie recovery
- [x] lease
- [x] full adversarial validation evidence

#### 코드 증거 기록

- 파일 경로: `src/server.c`, `src/response_channel.c`, `include/minitalk.h`
- symbol 또는 함수: `handle_request`, `handle_session_request`, `send_response`, `reset_session`, `handle_bit`
- 확인한 state fields: `g_client_pid`, `g_current_byte`, `g_received_bits`, `g_sequence`, `g_line_started`
- caller → callee: event loop response socket readiness → request receive/validation → `handle_session_request` → READY/BUSY `send_response`
- 핵심 branch 또는 mutation 순서: `recvfrom` → exact request size → magic/kind/client PID/source path/same-UID socket/process probe → 기존 owner available이면 BUSY → unavailable이면 recovery → free state owner assignment/receive fields init → READY send → 실패 시 just-created owner reset입니다.
- parent 또는 이전 관련 SHA와의 diff 요약: control-plane reservation path가 추가됐지만 기존 signal handler의 first-bit owner capture가 아직 병존합니다.
- 삽입한 최소 코드 조각과 선택 이유: `caf2feec4971`, `src/server.c` data handler: scaffold 역할과 달리 explicit acquisition bypass가 아직 남아 있음을 보여 주는 최소 historical evidence입니다.

```c
if (g_client_pid == 0)
	g_client_pid = info->si_pid;
```

- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`f8e8444c5ded`에서 client가 matching READY만 acquisition success로 수락합니다.
### 5. `f8e8444c5ded` — feat(client): READY 응답을 출처와 nonce로 상관 검증

- **Importance:** A
- **Tags:** RESPONSE, RISK, INTEGRATION
- **Thread 내 역할:** client가 nonzero nonce ACQUIRE를 보내고 expected source, PID, fields, deadline이 맞는 READY만 수락합니다.

#### 원문에서 확정된 맥락

`/dev/urandom` nonce와 one absolute `CLOCK_MONOTONIC` deadline을 사용하며 malformed/unrelated datagram은 session을 시작시키지 않습니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] nonce generation의 open/read/close와 zero handling
- [x] ACQUIRE client PID와 nonce fields
- [x] server destination endpoint construction/validation
- [x] READY exact size/source/magic/PID/kind/token/status predicate
- [x] invalid candidate 뒤 same absolute deadline 유지
- [x] READY success 뒤에만 data path 진입

#### 비교 기준

`caf2feec4971`의 nonce echo와 expected source-path rule을 client predicate 항목별로 대조했습니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: server reservation path는 있었지만 production client가 ACQUIRE를 보내고 READY를 검증하는 lifecycle이 완성되지 않았습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: READY kind 하나만 보거나 first datagram을 수락하면 stale/forged response가 session establishment를 거짓 완료할 수 있습니다.
- 변경된 decision과 state mutation 순서: client endpoint를 준비하고 `/dev/urandom`에서 nonzero nonce를 만든 뒤 ACQUIRE를 보내며 exact size/source/magic/server PID/READY/token/status를 모두 검증합니다. client endpoint bind → target server socket validation → nonce open/read/close, zero면 1로 보정 → ACQUIRE send → one absolute monotonic deadline → invalid response discard loop → matching READY 뒤에만 payload send path 진입입니다.
- 정상 경로와 failure 경로가 갈라지는 조건: nonce source/open/read/close, destination validation, send, deadline/receive permanent error 또는 timeout은 session failure입니다. invalid datagram은 state를 바꾸지 않고 같은 deadline을 소비합니다.
- 후속 commit이 강화하거나 교체하는 부분: `e56e8cc87315`이 no-data reservation exclusivity를 검증하고 Thread 6의 `b361ef9745ff`/`1ed2acbaa353`이 forged/flood input을 검증합니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] correlated session establishment
- [x] bounded readiness wait
- [x] malformed/unrelated response가 owner progress를 승인하지 않음

**아직 보장하지 않는 것**

- [x] final owner availability
- [x] idle lease
- [x] same-UID authentication

#### 코드 증거 기록

- 파일 경로: `src/client.c`, `src/response_channel.c`, `include/minitalk.h`
- symbol 또는 함수: `generate_nonce`, `request_session`, `wait_for_response`, `read_response`
- 확인한 state fields: `nonce`, `deadline`, `expected server path`
- caller → callee: `main` → client endpoint setup → `request_session` → `sendto`/`recvfrom` → payload send
- 핵심 branch 또는 mutation 순서: client endpoint bind → target server socket validation → nonce open/read/close, zero면 1로 보정 → ACQUIRE send → one absolute monotonic deadline → invalid response discard loop → matching READY 뒤에만 payload send path 진입입니다.
- parent 또는 이전 관련 SHA와의 diff 요약: production client가 data 전에 correlated ACQUIRE/READY handshake를 수행합니다.
- 삽입할 최소 코드 조각과 선택 이유: 표와 호출 순서만으로 invariant가 충분히 드러나므로 코드 덤프를 추가하지 않았습니다.
- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`e56e8cc87315`에서 data 없는 acquired owner도 exclusive한지 검증합니다.
### 6. `e56e8cc87315` — test(session): 데이터 없는 활성 예약 경쟁 검증

- **Importance:** A
- **Tags:** TEST, SESSION
- **Thread 내 역할:** session helper의 `reserve` mode가 acquisition만 완료하고 data를 보내지 않은 채 live owner를 유지합니다.

#### 원문에서 확정된 맥락

그동안 normal client는 BUSY여야 하고 stdout은 비어 있어야 합니다. reserver exit 뒤 later client는 정상 acquisition과 message completion을 수행합니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] `reserve` mode의 endpoint setup과 ACQUIRE/READY-only path
- [x] reserver를 live로 유지하는 synchronization
- [x] normal client BUSY assertion
- [x] reservation 중 no-output assertion
- [x] reserver exit 뒤 later client order
- [x] first bit 없이 owner state 유지

#### 비교 기준

`caf2feec4971`의 owner assignment가 request handler 안에서 READY 전에 일어나는지 no-data hold와 연결했습니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: 기존 session tests는 owner가 적어도 일부 data signal을 보낸 상태를 만들었기 때문에 ownership start가 ACQUIRE인지 first bit인지 구분하지 못했습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: server가 READY를 보낸 뒤에도 first bit 전에는 owner가 없다고 처리하는 회귀가 생기면 두 client가 동시에 session을 얻을 수 있습니다.
- 변경된 decision과 state mutation 순서: session sender의 `hold` 경로를 protocol-conformant `reserve` mode로 바꿔 endpoint setup과 ACQUIRE/READY만 완료한 뒤 pause합니다. reserver child ACQUIRE/READY → ready synchronization → data를 보내지 않고 live 유지 → normal client는 BUSY failure → stdout empty 확인 → reserver exit → later client acquisition/message success입니다.
- 정상 경로와 failure 경로가 갈라지는 조건: reservation 동안 output이 생기면 실패입니다. competitor가 성공해도 실패입니다. reserver exit 뒤 later client가 계속 BUSY면 recovery failure입니다.
- 후속 commit이 강화하거나 교체하는 부분: `1e3da4580733`이 반대로 PID는 남지만 endpoint가 사라진 owner를 회수합니다.

#### Test commit 분석 기록

- **대상 production invariant:** successful acquisition 자체가 ownership start이며 payload progress는 조건이 아닙니다.
- **재현하는 failure 또는 boundary:** first bit 전 owner가 없다고 봐 두 client에게 READY를 주는 회귀
- **사용한 test technique:** protocol-conformant helper가 ACQUIRE/READY만 완료하고 live pause
- **분류:** deterministic session integration regression
- **failure 주입 또는 process orchestration 시작 지점:** `tests/session_ownership.sh`가 `session_sender reserve`를 시작하고 ready marker를 기다립니다.
- **production code에 진입하는 최초 호출:** reserve helper의 ACQUIRE datagram이 production server request handler에 진입합니다.
- **핵심 assertion과 관측값:** competitor BUSY, reservation 동안 stdout empty, reserver exit 뒤 later client success를 확인합니다.
- **증명하는 것:** idle live exclusivity<br>reservation 중 no output<br>exit 후 reacquire
- **증명하지 않는 것:** lease policy<br>partial-message recovery<br>zombie recovery
- **후속 변경에서 막아야 할 구체적인 회귀:** owner assignment을 first bit 시점으로 되돌려 idle reservation을 무시하는 회귀를 막습니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] idle live reservation exclusivity
- [x] reservation 중 no output
- [x] owner exit 뒤 reacquire

**아직 보장하지 않는 것**

- [x] lease policy
- [x] partial-message recovery
- [x] zombie recovery

#### 코드 증거 기록

- 파일 경로: `tests/session_sender.c`, `tests/session_ownership.sh`
- symbol 또는 함수: `reserve_session`, `main`
- 확인한 state fields: `reservation nonce`, `bound response endpoint`, `ready marker`
- caller → callee: test shell → reserve helper handshake → production `handle_session_request` → competitor client
- 핵심 branch 또는 mutation 순서: reserver child ACQUIRE/READY → ready synchronization → data를 보내지 않고 live 유지 → normal client는 BUSY failure → stdout empty 확인 → reserver exit → later client acquisition/message success입니다.
- parent 또는 이전 관련 SHA와의 diff 요약: helper가 data bits를 보내는 hold mode 대신 acquisition만 유지하는 reserve mode를 제공합니다.
- 삽입할 최소 코드 조각과 선택 이유: 표와 호출 순서만으로 invariant가 충분히 드러나므로 코드 덤프를 추가하지 않았습니다.
- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`1e3da4580733`에서 PID는 남지만 protocol resource는 사라진 반대 경계를 다룹니다.
### 7. `1e3da4580733` — fix(server): 응답 경로가 사라진 세션 소유자 회수

- **Importance:** S
- **Tags:** SESSION, PROCESS_LIFECYCLE, DEBUG
- **Thread 내 역할:** owner availability를 process presence와 expected same-UID client response socket usability의 결합으로 정의합니다.

#### 원문에서 확정된 맥락

exited-but-unreaped child는 `kill(pid, 0)`에 성공하지만 cleanup으로 socket path를 제거해 ACK를 받을 수 없습니다. PID 또는 endpoint가 unusable하면 recovery할 수 있습니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] owner PID/process probing helper
- [x] owner PID에서 expected client path derivation
- [x] same-UID Unix socket validation
- [x] process+endpoint 결합 contract
- [x] competing ACQUIRE의 unavailable-owner recovery
- [x] delimiter 성공 뒤 coupled fields reset
- [x] PID alive+endpoint absent가 recovery가 되는 branch

#### 비교 기준

`bc337552961a`의 ESRCH-only branch를 new helper call graph와 직접 비교했습니다.

#### S-level 재구성

- 이 commit 직전의 관련 state와 caller/callee: server는 owner availability를 `kill(owner, 0)`/`ESRCH`로만 판단했습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: zombie child는 PID table entry가 남아 `kill(pid,0)`이 성공하지만 process cleanup으로 response socket path가 이미 사라져 ACK를 받을 수 없습니다. server는 이를 live owner로 보고 계속 BUSY를 반환합니다.
- 변경된 decision과 state mutation 순서: `session_owner_available`을 도입해 PID probe, owner PID 기반 expected client path derivation, same-UID Unix socket validation을 모두 통과해야 usable owner로 봅니다. competing ACQUIRE → current owner PID probe → expected client path 생성 → socket type/UID usability 확인 → 하나라도 실패하면 recovery delimiter 시도 → 성공 뒤 owner/byte/bit/sequence/line reset → new request owner assignment/READY입니다.
- 정상 경로와 failure 경로가 갈라지는 조건: PID alive + endpoint absent는 BUSY가 아니라 recovery입니다. visible line delimiter write가 실패하면 reset/reassignment를 완료하지 않고 event loop error로 전파합니다. valid process+endpoint이면 BUSY입니다.
- 후속 commit이 강화하거나 교체하는 부분: `a481bfabb7b5`가 `WNOWAIT` zombie window를 deterministic하게 재현합니다. PID reuse와 same-UID malicious socket은 여전히 인증되지 않습니다.

| 추적 항목 | 학습자 기록 | 코드 근거 |
| --- | --- | --- |
| 직전 architecture/state | `kill(owner,0)` success면 owner available | old owner probe in request/bit paths |
| 해결하려던 핵심 문제 | zombie PID와 vanished response endpoint 분리 | new `session_owner_available` |
| 실패 가능한 interleaving 또는 partial failure | child cleanup이 path를 unlink한 뒤 parent가 reap 전 ACQUIRE | PID alive + path absent |
| 선택한 decision | process presence와 expected same-UID socket을 모두 요구 | PID probe/path derive/socket validate |
| ownership/lifecycle/state transition | unavailable→delimiter commit→coupled reset→new owner | `reset_session`, owner fields |
| 후속 fix 또는 regression evidence | WNOWAIT zombie regression | `a481bfabb7b5` |

#### Fix 연결 기록

| 단계 | Source에서 확정된 내용 | 해당 SHA의 코드 근거 |
| --- | --- | --- |
| 기존 가정 | `kill(owner, 0)` success면 owner가 ACK를 받을 수 있습니다. | 직전 availability branch는 ESRCH만 dead로 분류했습니다. |
| 실제 failure 또는 위험 | zombie child는 PID entry가 남지만 response socket은 이미 사라집니다. | client cleanup과 parent reap은 별개 lifecycle event입니다. |
| root cause | kernel identity presence와 protocol availability를 동일시했습니다. | 새 helper가 PID와 expected endpoint를 별도 검사합니다. |
| 수정 invariant/decision | process와 expected response endpoint가 모두 usable해야 owner가 available합니다. | `session_owner_available` conjunction과 request recovery branch |
| regression | `a481bfabb7b5`가 WNOWAIT로 zombie window를 유지합니다. | test가 `kill -0` success와 path absence를 동시에 assertion합니다. |

- 변경 전 failure를 재현하거나 추론할 수 있는 입력/상태: 직전 상태와 해당 분기를 직접 비교했습니다.
- root cause가 드러나는 field 또는 call order: competing ACQUIRE → current owner PID probe → expected client path 생성 → socket type/UID usability 확인 → 하나라도 실패하면 recovery delimiter 시도 → 성공 뒤 owner/byte/bit/sequence/line reset → new request owner assignment/READY입니다.
- 수정된 invariant를 고정하는 후속 regression test: `a481bfabb7b5`

#### 보장 범위

**이 commit이 보장하는 것**

- [x] application-level liveness = process + response resource
- [x] zombie owner가 server를 영구 점유하지 않음
- [x] new session이 prior partial state를 상속하지 않음

**아직 보장하지 않는 것**

- [x] PID reuse authentication
- [x] same-UID adversary blocking
- [x] lease-based recovery

#### 코드 증거 기록

- 파일 경로: `src/server.c`, `src/response_channel.c`
- symbol 또는 함수: `session_owner_available`, `mt_response_path`, `valid_client_socket`, `handle_session_request`, `reset_session`
- 확인한 state fields: `client_pid`, `current_byte`, `received_bits`, `sequence`, `line_started`
- caller → callee: `handle_session_request` → `session_owner_available` → path derivation/socket validation → `reset_session`/BUSY
- 핵심 branch 또는 mutation 순서: competing ACQUIRE → current owner PID probe → expected client path 생성 → socket type/UID usability 확인 → 하나라도 실패하면 recovery delimiter 시도 → 성공 뒤 owner/byte/bit/sequence/line reset → new request owner assignment/READY입니다.
- parent 또는 이전 관련 SHA와의 diff 요약: owner liveness predicate가 kernel PID presence 하나에서 protocol response resource usability와의 conjunction으로 바뀝니다.
- 삽입한 최소 코드 조각과 선택 이유: `1e3da4580733`, `src/server.c: session_owner_available`의 핵심 call graph를 압축한 조각입니다.

```c
if (kill(client_pid, 0) == -1 && errno == ESRCH)
	return (0);
if (mt_response_path(MT_ROLE_CLIENT, client_pid, path, sizeof(path)) == -1)
	return (0);
return (valid_client_socket(path));
```

- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`a481bfabb7b5`가 exited-but-unreaped state를 실제로 고정합니다.
### 8. `a481bfabb7b5` — test(session): 종료 송신자 회수 전 새 세션 복구 검증

- **Importance:** A
- **Tags:** TEST, SESSION, PROCESS_LIFECYCLE
- **Thread 내 역할:** partial-session child를 exit시킨 뒤 `waitid(..., WNOWAIT)`로 unreaped 상태를 유지해 zombie PID와 vanished endpoint를 동시에 관측합니다.

#### 원문에서 확정된 맥락

test는 `kill(pid, 0)` success와 socket-path absence를 확인한 뒤 child reap 전에 new client를 실행합니다. server는 abandoned output을 delimit하고 new message를 완료해야 합니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] partial-session child acquisition/data/exit path
- [x] `waitid`의 WEXITED|WNOHANG|WNOWAIT flags
- [x] `kill(child,0)` success assertion
- [x] child response path absence assertion
- [x] reap 전에 new client 실행
- [x] abandoned newline + new message expected output
- [x] final child reap/server cleanup

#### 비교 기준

`1e3da4580733`의 process probe/path validation branch를 test의 두 관측값과 일대일로 연결했습니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: endpoint-aware availability fix는 구현됐지만 zombie 상태와 client socket cleanup 순서를 직접 고정하는 root-cause-specific test가 없었습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: 일반 `wait`는 child를 즉시 reap해 PID-only bug를 숨기므로 exited-but-unreaped window를 유지해야 합니다.
- 변경된 decision과 state mutation 순서: `unreaped_exec` helper가 partial-session child를 fork하고 `waitid(P_PID, ..., WEXITED|WNOHANG|WNOWAIT)`로 exit를 확인하되 reap하지 않습니다. partial child ACQUIRE/data/exit → WNOWAIT로 zombie 확인 → `kill(child,0)` success assertion → client path `ENOENT` assertion → child reap 전 replacement client → abandoned newline + new message 확인 → final reap/server cleanup입니다.
- 정상 경로와 failure 경로가 갈라지는 조건: PID probe가 성공한다는 사실만으로 BUSY가 되면 replacement가 실패해 test가 잡습니다. endpoint-aware recovery가 성공하면 visible partial line을 newline으로 닫고 new frame을 별도 줄에 출력합니다.
- 후속 commit이 강화하거나 교체하는 부분: 이 commit이 Thread final regression evidence입니다.

#### Test commit 분석 기록

- **대상 production invariant:** owner는 PID entry뿐 아니라 usable response endpoint를 유지해야 합니다.
- **재현하는 failure 또는 boundary:** exited-but-unreaped owner가 server를 BUSY로 고정하는 상황
- **사용한 test technique:** `fork` + partial sender + `waitid(..., WNOWAIT)` + real endpoint observation
- **분류:** root-cause-specific deterministic regression
- **failure 주입 또는 process orchestration 시작 지점:** `tests/session_ownership.sh`가 `unreaped_exec`를 실행해 partial child를 만듭니다.
- **production code에 진입하는 최초 호출:** replacement ACQUIRE가 production `handle_session_request`와 `session_owner_available`에 진입합니다.
- **핵심 assertion과 관측값:** `kill(child,0)` success, endpoint path absence, child reap 전 replacement success, abandoned/new output separation을 확인합니다.
- **증명하는 것:** zombie PID/vanished endpoint separation<br>reap-before-recovery 불필요<br>output session separation
- **증명하지 않는 것:** PID reuse authentication<br>same-UID adversary resistance<br>lease behavior
- **후속 변경에서 막아야 할 구체적인 회귀:** ESRCH-only owner availability로 되돌아가 zombie owner가 BUSY를 영구 유지하는 회귀를 막습니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] zombie PID와 vanished endpoint의 분리 검증
- [x] reap 전에 owner recovery 가능
- [x] output session separation

**아직 보장하지 않는 것**

- [x] PID reuse authentication
- [x] same-UID adversary resistance
- [x] lease behavior

#### 코드 증거 기록

- 파일 경로: `tests/unreaped_exec.c`, `tests/session_ownership.sh`, `tests/session_sender.c`, `Makefile`
- symbol 또는 함수: `main`, `waitid`, `waitpid`
- 확인한 state fields: `zombie child PID`, `client socket path`, `partial output`
- caller → callee: test shell → `unreaped_exec` → session sender → production server availability/recovery → replacement client
- 핵심 branch 또는 mutation 순서: partial child ACQUIRE/data/exit → WNOWAIT로 zombie 확인 → `kill(child,0)` success assertion → client path `ENOENT` assertion → child reap 전 replacement client → abandoned newline + new message 확인 → final reap/server cleanup입니다.
- parent 또는 이전 관련 SHA와의 diff 요약: WNOWAIT helper와 zombie-specific scenario가 추가돼 PID-only assumption의 정확한 failure window를 재현합니다.
- 삽입할 최소 코드 조각과 선택 이유: 표와 호출 순서만으로 invariant가 충분히 드러나므로 코드 덤프를 추가하지 않았습니다.
- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

이 commit이 Thread final regression evidence입니다.

## 6. Invariant ledger

### Source에서 확정된 핵심 invariant

- explicit acquisition을 완료한 하나의 client만 bit, byte, sequence, output state를 변경합니다.
- live owner가 있으면 competing acquisition은 `BUSY`이고 competing data signal은 state를 바꾸지 않습니다.
- owner reassignment 전 already-visible partial line을 성공적으로 delimit해야 합니다.
- owner availability는 retained PID entry뿐 아니라 usable same-UID response socket을 요구합니다.
- `caf2feec4971` 단독 tree에는 implicit first-bit capture가 남았고, 이 bypass는 `aeb1b00867f4`에서 제거됩니다.

### 시간에 따른 변화 기록

| Commit | Source에서 확정된 변화 | 실제 state/condition | code evidence | 상태: 도입·강화·부족·복구·검증 |
| --- | --- | --- | --- | --- |
| `10a7211969bf` | active sender PID를 기록하고 NUL terminator까지 다른 sender의 data signal을 거부합니다. | `g_client_pid`가 0이면 first sender가 owner가 되고 NUL frame까지 다른 PID가 byte state를 바꾸지 못합니다. | `src/server.c: handle_bit` owner branches | 도입·부족 |
| `bc337552961a` | recorded owner가 사라지면 partial byte, bit count, owner, line state를 함께 reset하고 new sender가 진행할 수 있게 합니다. | owner PID absence가 session recovery trigger가 되고 `g_line_started`가 delimiter 필요 여부를 결정합니다. | `src/server.c: reset_session`, owner probe branches | 복구·부족 |
| `bdccf91f5a44` | dedicated sender로 one-bit abandon, complete-byte-plus-partial abandon, live competition, owner exit recovery를 재현합니다. | real child lifecycle로 first-bit ownership, abandon reset, live competition 결과를 관측합니다. | `tests/session_sender.c`, `tests/session_ownership.sh` | 검증 |
| `caf2feec4971` | exact `ACQUIRE` datagram을 검증한 뒤 data 전에 owner를 예약하고 `READY` 또는 `BUSY`를 반환합니다. | validated ACQUIRE가 reservation path를 만들지만 data handler의 implicit capture branch가 함께 남아 있습니다. | `src/server.c: handle_session_request`와 `handle_bit` 직접 비교 | 도입·불충분 |
| `f8e8444c5ded` | client가 nonzero nonce ACQUIRE를 보내고 expected source, PID, fields, deadline이 맞는 READY만 수락합니다. | outstanding acquisition은 nonzero nonce와 expected server endpoint/deadline으로 식별됩니다. | `src/client.c: request_session`, response predicate | 강화 |
| `e56e8cc87315` | session helper의 `reserve` mode가 acquisition만 완료하고 data를 보내지 않은 채 live owner를 유지합니다. | READY를 받은 live reserver의 `g_client_pid`는 bit count가 0이어도 exclusive합니다. | `tests/session_sender.c: reserve`, server request owner assignment | 검증 |
| `1e3da4580733` | owner availability를 process presence와 expected same-UID client response socket usability의 결합으로 정의합니다. | owner availability는 PID와 expected same-UID response socket 둘 다 usable인 conjunction입니다. | `src/server.c: session_owner_available`, `handle_session_request` | 복구·강화 |
| `a481bfabb7b5` | partial-session child를 exit시킨 뒤 `waitid(..., WNOWAIT)`로 unreaped 상태를 유지해 zombie PID와 vanished endpoint를 동시에 관측합니다. | test가 PID table retention과 response endpoint cleanup을 동시에 관측해 resource-aware availability를 검증합니다. | `tests/unreaped_exec.c`, session shell assertions | 검증 |

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 상태 | 실제 failure/위험 | Fix 또는 전환 commit | 수정된 decision/invariant | Test 또는 후속 검증 | 학습자 code evidence |
| --- | --- | --- | --- | --- | --- |
| shared accumulator에 sender identity 없음 | 서로 다른 client의 bits가 한 byte에 섞임 | `10a7211969bf` | first sender를 active owner로 기록하고 competitor 거부 | `bdccf91f5a44` | `g_client_pid` assignment/mismatch early return |
| first data signal이 ownership 시작점 | data 전 reservation과 correlated BUSY/READY 불가 | `caf2feec4971`, 완전한 bypass 제거는 `aeb1b00867f4` | validated ACQUIRE/READY가 owner authority, unaquired data는 무시 | `e56e8cc87315` | request validation/owner assignment + later first-bit branch deletion |
| `kill(owner, 0)` success면 usable owner | zombie PID는 남고 response endpoint는 사라짐 | `1e3da4580733` | process identity와 response endpoint를 함께 availability로 검사 | `a481bfabb7b5` | `session_owner_available`; WNOWAIT/ENOENT assertions |

전용 test commit이 없는 연결에는 존재하지 않는 test를 만들어 적지 않았습니다.

## 8. Ownership / state / responsibility 변화

| 단계 | state 또는 responsibility owner | transition | 당시 한계 또는 다음 변화 | 실제 symbol/field |
| --- | --- | --- | --- | --- |
| `10a7211969bf` | first accepted signal sender PID | NUL terminator까지 owner | implicit ownership | `g_client_pid`, handler first-bit branch |
| `bc337552961a` | PID existence | ESRCH owner면 partial state recovery | PID-only liveness | `kill(owner,0)`, `reset_session` |
| `caf2feec4971` | validated ACQUIRE sender | owner assign 후 nonce-correlated READY/BUSY | data handler bypass가 아직 잔존 | `handle_session_request`, `g_client_pid` |
| `aeb1b00867f4` 이후 | ACQUIRE path만 owner authority | unaquired data는 ignore | explicit data-before-signal ownership | first-bit assignment 삭제 |
| `1e3da4580733` | process + usable endpoint | 둘 중 하나가 없으면 recovery | resource-aware liveness | `session_owner_available` |

## 9. Thread 최종 상태

Source에서 확정된 최종 조건:

- ownership은 first bit가 아니라 validated `ACQUIRE`/`READY` transition에서 시작합니다.
- live and usable owner는 payload progress가 없어도 exclusive합니다.
- unavailable owner의 partial byte는 폐기되고 visible output은 delimit된 뒤 reassignment됩니다.
- PID가 남아도 expected client response socket이 사라졌으면 protocol owner로 유지되지 않습니다.

학습자 기록:

- 최종 state fields와 owner: server event loop가 `client_pid`, `current_byte`, `received_bits`, `sequence`, `line_started`를 하나의 session state로 소유합니다. client endpoint path는 해당 client process가 bind lifetime 동안 소유합니다.
- 정상 transition 순서: exact ACQUIRE receive/validation → prior owner availability 확인 및 필요 시 delimiter commit/reset → new owner fields 초기화 → nonce-correlated READY → owner data events만 mutation → NUL frame에서 release입니다.
- 실패 시 중단·reset·cleanup 순서: invalid ACQUIRE는 무시하고 live owner면 BUSY입니다. READY send failure는 새 reservation을 rollback합니다. unavailable owner delimiter 실패는 reassignment를 막고 server error/cleanup으로 전파합니다.
- 최종 상태가 보장하지 않는 것: lease, idle progress timeout, PID reuse 방지, same-UID peer authentication, session handoff의 distributed transaction은 제공하지 않습니다.
- 이 Thread를 한 문단으로 설명한 최종 서술: 이 Thread는 shared accumulator에 first-sender PID를 붙여 interleaving을 막는 단계에서 시작합니다. dead PID recovery와 line delimiter를 추가한 뒤 ACQUIRE/READY control path로 reservation을 옮기지만, 해당 도입 SHA에는 implicit first-bit bypass가 잠시 남습니다. 이후 datagram-only ownership으로 수렴하고, 마지막에는 PID 존재와 client response socket usability를 함께 검사해 zombie owner까지 회수합니다.

## 10. 최종 architecture 또는 execution flow 정리

- [x] server datagram receive와 exact ACQUIRE validation
- [x] prior owner availability check와 필요시 recovery delimiter
- [x] owner assignment 및 nonce-correlated READY/BUSY
- [x] READY send failure 시 new reservation rollback
- [x] owner PID의 data signal만 state transition에 적용
- [x] NUL frame 완료 시 session release
- [x] process 또는 endpoint 소실 뒤 competing acquisition recovery

```text
server pselect: response socket readable
    -> recvfrom exact ACQUIRE
    -> size/magic/kind/claimed PID/source path/same-UID validation
    -> existing owner: process + expected endpoint availability check
    -> available: BUSY response
    -> unavailable: visible-line delimiter commit -> coupled reset
    -> assign new owner fields -> READY(nonce)
    -> READY send failure: rollback
    -> self-pipe data event from owner only
    -> bit/byte/sequence/output/ACK
    -> NUL frame: delimiter + session release

```

- 실제 함수·파일을 반영한 완성 흐름: `src/server.c`의 request handler, `session_owner_available`, session reset과 bit processor가 control/data lifecycle을 연결합니다.
- asynchronous boundary: ACQUIRE Unix datagram과 data signal은 서로 다른 입력 채널이며 server event loop가 두 채널의 state order를 직렬화합니다.
- externally visible commit point: reservation은 validated ACQUIRE 뒤 owner state와 READY send가 성공한 시점이며, reassignment는 recovery delimiter가 성공한 뒤입니다.
- cleanup owner: server session reset이 coupled receive state를, client/server endpoint cleanup이 각 bound path와 descriptor를 소유합니다.

## 11. 학습 완료 자가 점검

- [x] commit map의 8개 SHA를 source 순서대로 모두 설명할 수 있습니다.
- [x] 각 code excerpt에 SHA, path, symbol, 선택 이유가 기록돼 있습니다.
- [x] final HEAD 코드를 historical SHA의 증거로 사용한 곳이 없습니다.
- [x] 정상 경로와 failure path를 state mutation 순서로 설명할 수 있습니다.
- [x] source 확정 invariant와 직접 확인한 code evidence를 구분했습니다.
- [x] test commit의 invariant, failure, technique, production path, proves/not-proves를 기록했습니다.
- [x] Thread final state를 함수와 state field 수준으로 설명할 수 있습니다.
- [ ] 해당 SHA의 test를 로컬에서 직접 실행했습니다. — 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

### 이 Thread와 직접 연결된 Major Engineering Difficulties

- process exit, PID table retention, socket cleanup이 서로 다른 시점에 일어납니다.
- partial byte와 already-written bytes를 함께 복구하지 않으면 sessions가 섞입니다.
- no-lease design에서는 live but idle owner도 계속 exclusive하므로 availability와 progress를 구분해야 합니다.
