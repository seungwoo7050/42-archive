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

- [ ] implicit first-bit ownership과 explicit acquisition의 transition을 code diff로 비교합니다.
- [ ] owner recovery가 reset해야 하는 coupled fields와 partial-line delimiter를 기록합니다.
- [ ] live competitor, dead owner, idle reserver, zombie owner의 server 결과를 설명합니다.
- [ ] PID-only liveness의 root cause와 endpoint-aware fix를 helper/caller로 연결합니다.
- [ ] 각 test commit의 process orchestration과 production path를 분리해 기록합니다.

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

- 각 항목은 해당 SHA의 tree를 기준으로 읽습니다.
- 변경 전 상태는 해당 SHA의 parent 또는 지정된 이전 관련 SHA에서 확인합니다.
- 같은 commit이 다른 Thread에 다시 등장해도 이 Thread의 질문으로 별도 기록합니다.

## 5. Commit별 학습 기록

### 1. `10a7211969bf` — fix(server): 활성 세션에 다른 송신자 거부

- **Importance:** A
- **Tags:** SESSION, RISK
- **Thread 내 역할:** active sender PID를 기록하고 NUL terminator까지 다른 sender의 data signal을 거부합니다.

#### 원문에서 확정된 맥락

server에는 하나의 partial-byte accumulator만 있으므로 sender interleaving은 undecodable byte를 만듭니다. 이 단계의 ownership은 first accepted bit에서 시작합니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] owner PID field와 initial value
- [ ] `siginfo_t` sender PID로 first owner를 정하는 branch
- [ ] non-owner signal이 accumulator에 도달하지 못하는 condition
- [ ] competitor negative response와 client failure path
- [ ] NUL terminator 뒤 owner/byte/bit-count reset order

#### 비교 기준

직전 server accumulator와 비교하고 `caf2feec4971`에서 owner start point가 first bit에서 ACQUIRE로 이동하는 부분을 대조합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:

#### Fix 연결 기록

| 단계 | Source에서 확정된 내용 | 해당 SHA의 코드 근거 |
| --- | --- | --- |
| 기존 가정 | 한 client의 signal sequence가 다른 client와 섞이지 않는다. |  |
| 실제 위험 | 두 sender의 bits가 하나의 `(current_byte, received_bits)`를 공유한다. |  |
| root cause | shared state에 owner identity가 없다. |  |
| 수정 invariant | 한 owner PID만 NUL frame까지 receive state를 변경한다. |  |

- 변경 전 failure를 재현하거나 추론할 수 있는 입력/상태:
- root cause가 드러나는 field 또는 call order:
- 수정된 invariant를 고정하는 후속 regression test:

#### 보장 범위

**이 commit이 보장하는 것**

- [ ] single active sender로 interleaving 차단

**아직 보장하지 않는 것**

- [ ] data-before-reservation
- [ ] strong READY/BUSY correlation
- [ ] abandoned-owner recovery

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

`bc337552961a`에서 owner가 terminator 전에 사라진 경우 recovery가 추가됩니다.
### 2. `bc337552961a` — fix(server): 종료된 송신자의 세션 복구

- **Importance:** A
- **Tags:** SESSION, PROCESS_LIFECYCLE, RISK
- **Thread 내 역할:** recorded owner가 사라지면 partial byte, bit count, owner, line state를 함께 reset하고 new sender가 진행할 수 있게 합니다.

#### 원문에서 확정된 맥락

`kill(owner, 0)`과 `ESRCH`로 liveness를 판단합니다. visible payload가 있으면 newline으로 닫고, vanished owner에게 ACK send가 실패해도 recovery합니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] `kill(owner, 0)`와 `errno == ESRCH` branch
- [ ] owner/current-byte/bit-count/line-state reset code
- [ ] visible partial line에 newline을 쓰는 condition
- [ ] ACK send failure가 recovery로 이어지는 path
- [ ] new sender가 clean state에서 시작하는 order

#### 비교 기준

`10a7211969bf`의 NUL-only release와 비교하고 `1e3da4580733`의 endpoint-aware liveness와 대조합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:

#### Fix 연결 기록

| 단계 | Source에서 확정된 내용 | 해당 SHA의 코드 근거 |
| --- | --- | --- |
| 기존 가정 | owner는 NUL terminator로 정상 종료한다. |  |
| 실제 failure | mid-message exit가 owner와 partial state를 남긴다. |  |
| root cause | owner lifetime이 끝난 뒤에도 owner, byte, bit, line state를 함께 회수하는 transition이 없었다. |  |
| 수정 decision | PID absence에서 coupled receive state를 reset하고 visible line을 delimit한다. |  |
| 남은 한계 | zombie PID에는 `ESRCH`가 발생하지 않는다. |  |

- 변경 전 failure를 재현하거나 추론할 수 있는 입력/상태:
- root cause가 드러나는 field 또는 call order:
- 수정된 invariant를 고정하는 후속 regression test:

#### 보장 범위

**이 commit이 보장하는 것**

- [ ] dead PID가 accumulator를 영구 점유하지 않음
- [ ] visible partial output의 session delimiting

**아직 보장하지 않는 것**

- [ ] zombie owner detection
- [ ] endpoint liveness
- [ ] all-or-failure delimiter commit

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

`bdccf91f5a44`에서 abandoned/live-competition cases를 검증합니다.
### 3. `bdccf91f5a44` — test(server): 중단·경쟁 송신자 세션 검증

- **Importance:** A
- **Tags:** TEST, SESSION, RISK
- **Thread 내 역할:** dedicated sender로 one-bit abandon, complete-byte-plus-partial abandon, live competition, owner exit recovery를 재현합니다.

#### 원문에서 확정된 맥락

normal client가 만들기 어려운 coupled session transitions를 real processes로 검증하고 expected output에 abandoned visible line을 닫는 newline을 포함합니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] sender mode별 signal count와 exit point
- [ ] server/sender/competitor process orchestration
- [ ] live owner를 유지한 채 normal client를 경쟁시키는 order
- [ ] owner exit 뒤 replacement client synchronization
- [ ] partial byte discard와 complete-byte output expectation
- [ ] failure cleanup, terminate, reap logic

#### 비교 기준

`bc337552961a` recovery branch와 test helper path를 연결합니다. 후속 protocol migration commits는 Thread map에 추가하지 않습니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:


#### Test commit 분석 기록

- **대상 production invariant:** 한 live owner만 receive state를 변경하고 dead owner의 partial state는 상속되지 않습니다.
- **재현하는 failure 또는 boundary:** abandoned session과 competitor가 shared state/output을 오염시키는 상황
- **사용한 test technique:** specialized sender + real server/client process scenarios
- **분류:** targeted process-level integration regression

확인할 production path:

- [ ] owner check
- [ ] bit assembly
- [ ] dead-owner recovery
- [ ] line delimiter
- [ ] session reset

이 테스트가 증명하는 항목:

- [ ] live exclusivity
- [ ] dead-owner recovery
- [ ] partial-state discard
- [ ] visible line delimiter

이 테스트가 증명하지 않는 항목:

- [ ] ACQUIRE/READY semantics
- [ ] zombie owner
- [ ] write failure

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

`caf2feec4971`에서 ownership start mechanism이 바뀝니다.
### 4. `caf2feec4971` — feat(server): 획득 요청을 검증해 세션 소유권 예약

- **Importance:** S
- **Tags:** ARCH, SESSION, CORE
- **Thread 내 역할:** exact `ACQUIRE` datagram을 검증한 뒤 data 전에 owner를 예약하고 `READY` 또는 `BUSY`를 반환합니다.

#### 원문에서 확정된 맥락

request size, magic, kind, client PID, process viability, source path가 모두 맞아야 합니다. prior unavailable owner는 reset하고 new READY send failure는 reservation rollback으로 이어집니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] response socket receive와 exact request-size check
- [ ] magic/kind/client-PID/source-address validation
- [ ] claimed PID에서 expected client path를 만드는 helper
- [ ] live owner와 BUSY response branch
- [ ] free state owner assignment 시점과 fields init
- [ ] request nonce를 echo한 READY send
- [ ] READY send failure 시 just-created owner rollback
- [ ] explicit acquisition 없는 data signal 처리 여부

#### 비교 기준

`bc337552961a` first-bit owner assignment와 비교하고 `f8e8444c5ded` client side와 함께 읽습니다.

#### S-level 재구성

다음 항목은 path, symbol, state field, branch를 근거로 작성합니다.

- [ ] first-bit capture와 ACQUIRE owner assignment 시점을 before/after diagram으로 작성
- [ ] validation failure/BUSY/READY success/READY failure별 owner state table
- [ ] prior-owner recovery와 new assignment의 order
- [ ] source path와 claimed PID binding을 helper/caller로 확인
- [ ] NUL release와 ACQUIRE reservation이 공유하는 fields
- [ ] idle-reservation test와 endpoint-aware fix가 강화하는 edge

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

- [ ] data-before-signal explicit session
- [ ] validated source/PID reservation
- [ ] phantom owner rollback

**아직 보장하지 않는 것**

- [ ] resource-aware zombie recovery
- [ ] lease
- [ ] full adversarial validation evidence

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

`f8e8444c5ded`에서 client가 matching READY만 acquisition success로 수락합니다.
### 5. `f8e8444c5ded` — feat(client): READY 응답을 출처와 nonce로 상관 검증

- **Importance:** A
- **Tags:** RESPONSE, RISK, INTEGRATION
- **Thread 내 역할:** client가 nonzero nonce ACQUIRE를 보내고 expected source, PID, fields, deadline이 맞는 READY만 수락합니다.

#### 원문에서 확정된 맥락

`/dev/urandom` nonce와 one absolute `CLOCK_MONOTONIC` deadline을 사용하며 malformed/unrelated datagram은 session을 시작시키지 않습니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] nonce generation open/read/close와 zero handling
- [ ] ACQUIRE record의 client PID와 nonce
- [ ] destination server endpoint construction
- [ ] READY size/source/magic/server-PID/kind/token/status validation
- [ ] invalid candidate 후 same absolute deadline 유지
- [ ] READY success 뒤에만 data path 진입

#### 비교 기준

`caf2feec4971` nonce echo와 source-path rule을 대조합니다. Thread 6에서는 hostile-input 관점으로 다시 읽습니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:


#### 보장 범위

**이 commit이 보장하는 것**

- [ ] correlated session establishment
- [ ] bounded readiness wait

**아직 보장하지 않는 것**

- [ ] final owner availability
- [ ] idle lease
- [ ] same-UID authentication

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

`e56e8cc87315`에서 data 없는 acquired owner도 exclusive한지 검증합니다.
### 6. `e56e8cc87315` — test(session): 데이터 없는 활성 예약 경쟁 검증

- **Importance:** A
- **Tags:** TEST, SESSION
- **Thread 내 역할:** session helper의 `reserve` mode가 acquisition만 완료하고 data를 보내지 않은 채 live owner를 유지합니다.

#### 원문에서 확정된 맥락

그동안 normal client는 BUSY여야 하고 stdout은 비어 있어야 합니다. reserver exit 뒤 later client는 정상 acquisition과 message completion을 수행합니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] `reserve` mode의 endpoint setup과 ACQUIRE/READY only path
- [ ] reserver process를 live로 유지하는 synchronization
- [ ] normal client BUSY assertion
- [ ] reservation 중 no-output assertion
- [ ] reserver exit 뒤 later client order
- [ ] first bit 없이 owner state가 유지되는 production path

#### 비교 기준

`caf2feec4971` owner assignment 시점과 test의 no-data hold를 연결합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:


#### Test commit 분석 기록

- **대상 production invariant:** successful acquisition 자체가 ownership start이며 payload progress는 조건이 아닙니다.
- **재현하는 failure 또는 boundary:** first bit 전 owner가 없다고 봐 두 client에게 READY를 주는 회귀
- **사용한 test technique:** protocol-conformant helper that reserves without data
- **분류:** deterministic session integration regression

확인할 production path:

- [ ] ACQUIRE validation
- [ ] owner assignment
- [ ] BUSY response
- [ ] owner availability
- [ ] later recovery

이 테스트가 증명하는 항목:

- [ ] idle live exclusivity
- [ ] reservation 중 no output
- [ ] exit 후 reacquire

이 테스트가 증명하지 않는 항목:

- [ ] lease policy
- [ ] partial-message recovery
- [ ] zombie recovery

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

`1e3da4580733`에서 PID는 남지만 protocol resource는 사라진 반대 경계를 다룹니다.
### 7. `1e3da4580733` — fix(server): 응답 경로가 사라진 세션 소유자 회수

- **Importance:** S
- **Tags:** SESSION, PROCESS_LIFECYCLE, DEBUG
- **Thread 내 역할:** owner availability를 process presence와 expected same-UID client response socket usability의 결합으로 정의합니다.

#### 원문에서 확정된 맥락

exited-but-unreaped child는 `kill(pid, 0)`에 성공하지만 cleanup으로 socket path를 제거해 ACK를 받을 수 없습니다. PID 또는 endpoint가 unusable하면 recovery할 수 있습니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] owner PID/process probing helper
- [ ] owner PID에서 expected client path derivation
- [ ] same-UID Unix socket validation helper
- [ ] process check와 endpoint check 결합 contract
- [ ] competing ACQUIRE 중 unavailable-owner recovery
- [ ] delimiter 성공 뒤 owner/byte/bit/sequence/line reset
- [ ] PID alive + endpoint absent가 BUSY가 아닌 recovery가 되는 branch

#### 비교 기준

`bc337552961a`의 `ESRCH`-only check와 직접 diff하고 `a481bfabb7b5` zombie setup과 대조합니다.

#### S-level 재구성

다음 항목은 path, symbol, state field, branch를 근거로 작성합니다.

- [ ] old availability helper/caller와 PID-only assumption 범위
- [ ] client exit socket cleanup과 parent reap의 order
- [ ] new helper call graph: PID probe/path derive/socket validate
- [ ] recovery delimiter failure가 reassignment를 막는지 연결
- [ ] new session이 상속하지 않도록 reset되는 fields
- [ ] PID reuse와 same-UID trust의 남은 limit

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
| 기존 가정 | `kill(owner, 0)` success면 owner가 ACK를 받을 수 있다. |  |
| 실제 failure | zombie child는 PID entry가 남지만 response socket은 이미 사라진다. |  |
| root cause | kernel identity presence와 protocol availability를 동일시했다. |  |
| 수정 invariant | process와 expected response endpoint가 모두 usable해야 owner가 available하다. |  |
| regression | `a481bfabb7b5`가 `waitid(..., WNOWAIT)`로 zombie window를 재현한다. |  |

- 변경 전 failure를 재현하거나 추론할 수 있는 입력/상태:
- root cause가 드러나는 field 또는 call order:
- 수정된 invariant를 고정하는 후속 regression test:

#### 보장 범위

**이 commit이 보장하는 것**

- [ ] application-level liveness = process + response resource
- [ ] zombie owner가 server를 영구 점유하지 않음

**아직 보장하지 않는 것**

- [ ] PID reuse authentication
- [ ] same-UID adversary blocking
- [ ] lease-based recovery

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

`a481bfabb7b5`가 exited-but-unreaped state를 실제로 고정합니다.
### 8. `a481bfabb7b5` — test(session): 종료 송신자 회수 전 새 세션 복구 검증

- **Importance:** A
- **Tags:** TEST, SESSION, PROCESS_LIFECYCLE
- **Thread 내 역할:** partial-session child를 exit시킨 뒤 `waitid(..., WNOWAIT)`로 unreaped 상태를 유지해 zombie PID와 vanished endpoint를 동시에 관측합니다.

#### 원문에서 확정된 맥락

test는 `kill(pid, 0)` success와 socket-path absence를 확인한 뒤 child reap 전에 new client를 실행합니다. server는 abandoned output을 delimit하고 new message를 완료해야 합니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] partial-session child acquisition/data/exit path
- [ ] `waitid` flags와 WNOWAIT usage
- [ ] `kill(child, 0)` success assertion
- [ ] child response path absence assertion
- [ ] new client를 reap 전에 실행하는 order
- [ ] expected abandoned newline + new message output
- [ ] final child reap과 server cleanup

#### 비교 기준

`1e3da4580733` availability helper branches를 test observations와 일대일로 연결합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:


#### Test commit 분석 기록

- **대상 production invariant:** owner는 PID entry뿐 아니라 usable response endpoint를 유지해야 합니다.
- **재현하는 failure 또는 boundary:** exited-but-unreaped owner가 server를 BUSY로 고정하는 상황
- **사용한 test technique:** `fork` + partial sender + `waitid(..., WNOWAIT)` + real endpoint observation
- **분류:** root-cause-specific deterministic regression

확인할 production path:

- [ ] ACQUIRE
- [ ] partial state
- [ ] client cleanup
- [ ] availability helper
- [ ] recovery delimiter
- [ ] new acquisition

이 테스트가 증명하는 항목:

- [ ] zombie PID/vanished endpoint separation
- [ ] reap-before-recovery 불필요
- [ ] output session separation

이 테스트가 증명하지 않는 항목:

- [ ] PID reuse authentication
- [ ] same-UID adversary resistance
- [ ] lease behavior

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

이 commit이 Thread final regression evidence입니다.


## 6. Invariant ledger

### Source에서 확정된 핵심 invariant

- explicit acquisition을 완료한 하나의 client만 bit, byte, sequence, output state를 변경합니다.
- live owner가 있으면 competing acquisition은 `BUSY`이고 competing data signal은 state를 바꾸지 않습니다.
- owner reassignment 전 already-visible partial line을 성공적으로 delimit해야 합니다.
- owner availability는 retained PID entry뿐 아니라 usable same-UID response socket을 요구합니다.

### 시간에 따른 변화 기록

| Commit | Source에서 확정된 변화 | 실제 state/condition | code evidence | 상태: 도입·강화·부족·복구·검증 |
| --- | --- | --- | --- | --- |
| `10a7211969bf` | active sender PID를 기록하고 NUL terminator까지 다른 sender의 data signal을 거부합니다. |  |  |  |
| `bc337552961a` | recorded owner가 사라지면 partial byte, bit count, owner, line state를 함께 reset하고 new sender가 진행할 수 있게 합니다. |  |  |  |
| `bdccf91f5a44` | dedicated sender로 one-bit abandon, complete-byte-plus-partial abandon, live competition, owner exit recovery를 재현합니다. |  |  |  |
| `caf2feec4971` | exact `ACQUIRE` datagram을 검증한 뒤 data 전에 owner를 예약하고 `READY` 또는 `BUSY`를 반환합니다. |  |  |  |
| `f8e8444c5ded` | client가 nonzero nonce ACQUIRE를 보내고 expected source, PID, fields, deadline이 맞는 READY만 수락합니다. |  |  |  |
| `e56e8cc87315` | session helper의 `reserve` mode가 acquisition만 완료하고 data를 보내지 않은 채 live owner를 유지합니다. |  |  |  |
| `1e3da4580733` | owner availability를 process presence와 expected same-UID client response socket usability의 결합으로 정의합니다. |  |  |  |
| `a481bfabb7b5` | partial-session child를 exit시킨 뒤 `waitid(..., WNOWAIT)`로 unreaped 상태를 유지해 zombie PID와 vanished endpoint를 동시에 관측합니다. |  |  |  |

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 상태 | 실제 failure/위험 | Fix 또는 전환 commit | 수정된 decision/invariant | Test 또는 후속 검증 | 학습자 code evidence |
| --- | --- | --- | --- | --- | --- |
| shared accumulator에 sender identity 없음 | 서로 다른 client의 bits가 한 byte에 섞임 | `10a7211969bf` | first sender를 active owner로 기록하고 competitor 거부 | bdccf91f5a44 process-level ownership test |  |
| first data signal이 ownership 시작점 | data 전 reservation과 correlated BUSY/READY 불가 | `caf2feec4971` | validated ACQUIRE/READY 전에 data 수락 금지 | e56e8cc87315 idle reservation regression |  |
| `kill(owner, 0)` success면 usable owner | zombie PID는 남고 response endpoint는 사라짐 | `1e3da4580733` | process identity와 response endpoint를 함께 availability로 검사 | a481bfabb7b5 WNOWAIT zombie regression |  |

전용 test commit이 없는 연결에는 존재하지 않는 test를 만들어 적지 않습니다.

## 8. Ownership / state / responsibility 변화

| 단계 | state 또는 responsibility owner | transition | 당시 한계 또는 다음 변화 | 실제 symbol/field |
| --- | --- | --- | --- | --- |
| `10a7211969bf` | first accepted signal sender PID | NUL terminator까지 owner | implicit ownership |  |
| `bc337552961a` | PID existence | dead owner면 partial state recovery | PID-only liveness |  |
| `caf2feec4971` | validated ACQUIRE sender | READY를 포함해 reservation commit | data 전 exclusivity |  |
| `1e3da4580733` | process + usable endpoint | 둘 중 하나가 없으면 recovery | resource-aware liveness |  |

## 9. Thread 최종 상태

Source에서 확정된 최종 조건:

- ownership은 first bit가 아니라 validated `ACQUIRE`/`READY` transition에서 시작합니다.
- live and usable owner는 payload progress가 없어도 exclusive합니다.
- unavailable owner의 partial byte는 폐기되고 visible output은 delimit된 뒤 reassignment됩니다.
- PID가 남아도 expected client response socket이 사라졌으면 protocol owner로 유지되지 않습니다.

학습자 기록:

- 최종 state fields와 owner:
- 정상 transition 순서:
- 실패 시 중단·reset·cleanup 순서:
- 최종 상태가 보장하지 않는 것:
- 이 Thread를 한 문단으로 설명한 최종 서술:

## 10. 최종 architecture 또는 execution flow 정리

아래 노드를 해당 SHA에서 확인한 함수명과 branch로 연결합니다.

- [ ] server datagram receive와 exact ACQUIRE validation
- [ ] prior owner availability check와 필요시 recovery delimiter
- [ ] owner assignment 및 nonce-correlated READY/BUSY
- [ ] READY send failure 시 new reservation rollback
- [ ] owner PID의 data signal만 state transition에 적용
- [ ] NUL frame 완료 시 session release
- [ ] process 또는 endpoint 소실 뒤 competing acquisition recovery

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

- [ ] commit map의 8개 SHA를 source 순서대로 모두 설명할 수 있습니다.
- [ ] 각 code excerpt에 SHA, path, symbol, 선택 이유가 기록돼 있습니다.
- [ ] final HEAD 코드를 historical SHA의 증거로 사용한 곳이 없습니다.
- [ ] 정상 경로와 failure path를 state mutation 순서로 설명할 수 있습니다.
- [ ] source 확정 invariant와 직접 확인한 code evidence를 구분했습니다.
- [ ] test commit의 invariant, failure, technique, production path, proves/not-proves를 기록했습니다.
- [ ] Thread final state를 함수와 state field 수준으로 설명할 수 있습니다.

### 이 Thread와 직접 연결된 Major Engineering Difficulties

- process exit, PID table retention, socket cleanup이 서로 다른 시점에 일어납니다.
- partial byte와 already-written bytes를 함께 복구하지 않으면 sessions가 섞입니다.
- no-lease design에서는 live but idle owner도 계속 exclusive하므로 availability와 progress를 구분해야 합니다.
