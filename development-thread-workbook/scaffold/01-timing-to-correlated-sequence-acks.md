# Thread: From timing-dependent signal delivery to correlated sequence ACKs

> 완성형 해설서가 아닙니다. 아래 확정 사항을 기준으로 각 commit SHA의 실제 코드와 diff를 읽고 기록란을 채웁니다.

## 1. Thread 목표

고정 지연에 기대던 초기 bit 전송이 signal ACK 기반 stop-and-wait를 거쳐, 출처와 sequence를 검증하는 Unix datagram ACK 방식으로 바뀌는 과정을 복원합니다. 마지막 고정 지연 제거가 단순한 속도 조정이 아니라 더 강한 protocol 보장의 결과임을 해당 SHA의 코드로 설명할 수 있어야 합니다.

### Significance

초기 pacing은 standard signal 중복 병합 가능성을 낮출 뿐 처리 완료를 증명하지 못합니다. signal ACK는 인과적인 흐름 제어를 추가하지만 응답 식별력이 약하고 같은 signal 체계에 응답 책임까지 얹습니다. datagram control channel이 identity와 sequence를 제공한 뒤에는 이전 signal ACK 경로와 timing delay를 제거할 수 있습니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 초기 client는 byte와 bit를 어떤 순서로 signal에 대응시키며, fixed delay는 무엇을 보장하지 못하는가?
- signal ACK wait 전에 response signal을 block해야 했던 race는 어느 순서에서 발생하는가?
- timeout은 delivery 보장과 어떻게 다르며, 어떤 failure에서 bit cursor가 전진하지 않아야 하는가?
- request/response record의 어떤 field가 session과 개별 bit transition을 식별하는가?
- datagram ACK 도입 뒤에도 남아 있던 구 signal ACK path는 어디였으며 제거 후 success source가 하나로 수렴했는가?
- fixed delay를 제거해도 one-bit-in-flight invariant가 어떤 코드 순서로 유지되는가?

## 3. 완료 기준

- [ ] fixed delay, signal ACK, timeout, sequence datagram ACK의 역할 차이를 코드로 설명합니다.
- [ ] 각 단계에서 client가 다음 bit로 넘어가는 조건과 failure branch를 기록합니다.
- [ ] wire record, sequence, source endpoint validation이 결합되는 조건식을 찾습니다.
- [ ] legacy ACK 제거 전후 success path를 비교해 단일 authoritative response path를 확인합니다.
- [ ] 최종 상태에서 sleep 없이 ordering이 유지되는 execution flow를 함수 단위로 복원합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `89637d63b56f` | feat(client): 메시지 바이트를 시그널로 전송 | A | CORE, SIGNAL_DATA | message byte를 MSB부터 signal bit로 직렬화하고 provisional fixed delay로 전송 속도를 낮춥니다. |
| 2 | `78de95b3cacb` | feat(protocol): 비트 처리마다 ACK 전송 | A | CORE, SIGNAL_DATA, RISK | bit마다 signal ACK를 기다리는 stop-and-wait를 도입하고 ACK-before-wait race를 막습니다. |
| 3 | `765efe7b75c9` | feat(client): ACK 대기 시간 초과 처리 | A | RISK, PROCESS_LIFECYCLE, PRACTICAL | ACK wait를 alarm 기반 timeout으로 제한하고 timeout과 다른 send failure를 구분합니다. |
| 4 | `342aea9ce9a8` | fix(client): ACK 이후 시그널 전송 간격 안정화 | B | SIGNAL_DATA, PRACTICAL | signal ACK 뒤 short inter-signal gap을 유지하고 acknowledgement deadline을 늘립니다. |
| 5 | `4f17de94e025` | fix(client): 인터럽트 뒤 남은 전송 간격 유지 | B | SIGNAL_DATA, PRACTICAL | `nanosleep`이 `EINTR`로 중단되면 returned remainder로 같은 logical gap을 이어갑니다. |
| 6 | `ebed06775b92` | feat(protocol): 응답 메시지 wire 형식 정의 | A | ARCH, RESPONSE | `ACQUIRE`, `READY`, `ACK`를 표현하는 request/response records와 identity fields를 정의합니다. |
| 7 | `4234233ebd30` | feat(protocol): 비트 ACK를 sequence 응답으로 큐잉 | S | ARCH, RESPONSE, CORE | accepted bit에 sequence를 부여하고 datagram ACK send work를 pipe로 queue해 direct signal response에서 분리합니다. |
| 8 | `d3eacbbfeadc` | feat(client): 비트 ACK를 sequence로 상관 검증 | A | RESPONSE, RISK | client가 expected server source와 exact current sequence의 datagram ACK만 bit success로 수락합니다. |
| 9 | `aeb1b00867f4` | refactor(protocol): 이전 signal ACK 경로 제거 | A | ARCH, RESPONSE, REFACTOR | obsolete ACK/NACK signal machinery를 client/server/shared/test sender에서 제거하고 datagram response만 남깁니다. |
| 10 | `1487a861046e` | perf(protocol): 검증된 ACK 뒤 고정 지연 제거 | A | PERF, RESPONSE | matching sequence ACK 뒤 fixed sleep을 production client와 session sender에서 제거합니다. |

확인 원칙:

- 각 항목은 해당 SHA의 tree를 기준으로 읽습니다.
- 변경 전 상태는 해당 SHA의 parent 또는 지정된 이전 관련 SHA에서 확인합니다.
- 같은 commit이 다른 Thread에 다시 등장해도 이 Thread의 질문으로 별도 기록합니다.

## 5. Commit별 학습 기록

### 1. `89637d63b56f` — feat(client): 메시지 바이트를 시그널로 전송

- **Importance:** A
- **Tags:** CORE, SIGNAL_DATA
- **Thread 내 역할:** message byte를 MSB부터 signal bit로 직렬화하고 provisional fixed delay로 전송 속도를 낮춥니다.

#### 원문에서 확정된 맥락

client는 target PID를 검증하고 message를 encoding 해석 없이 byte sequence로 취급합니다. zero와 one은 서로 다른 user signal이며 delay는 coalescing 위험을 줄일 뿐 receiver 처리 완료를 증명하지 못합니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] PID parse와 process addressability check 및 failure diagnostic
- [ ] message byte loop와 MSB→LSB bit loop
- [ ] zero/one을 두 user signal에 대응시키는 branch
- [ ] `kill` 성공 뒤 fixed delay가 호출되는 위치와 상수
- [ ] send failure에서 cursor가 더 전진하지 않는 return path

#### 비교 기준

`8e5371c7b85e` server assembly와 MSB-first 규칙을 맞추고 parent diff에서 client transport 책임의 도입을 확인합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:


#### 보장 범위

**이 commit이 보장하는 것**

- [ ] sender-side bit 표현과 순서
- [ ] raw byte sequence 전송 기준

**아직 보장하지 않는 것**

- [ ] receiver 처리 완료
- [ ] signal multiplicity 보존
- [ ] framing
- [ ] session
- [ ] acknowledgement

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

`78de95b3cacb`에서 elapsed time 대신 ACK가 next-bit condition이 됩니다.
### 2. `78de95b3cacb` — feat(protocol): 비트 처리마다 ACK 전송

- **Importance:** A
- **Tags:** CORE, SIGNAL_DATA, RISK
- **Thread 내 역할:** bit마다 signal ACK를 기다리는 stop-and-wait를 도입하고 ACK-before-wait race를 막습니다.

#### 원문에서 확정된 맥락

client는 ACK signal을 먼저 block하고 data signal을 보낸 뒤 `sigsuspend`로 기다립니다. server가 한 bit 처리 뒤 ACK를 보내며 client는 ACK 전에는 다음 bit로 진행하지 않습니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] ACK handler가 수정하는 state와 type
- [ ] `sigprocmask` block과 data `kill`의 순서
- [ ] `sigsuspend` mask에서 ACK를 unblocking하는 방식
- [ ] ACK가 send와 wait 사이에 도착해도 놓치지 않는 loop
- [ ] server bit mutation 뒤 sender PID로 ACK를 보내는 위치
- [ ] ACK 확인 뒤에만 bit cursor가 증가하는 코드

#### 비교 기준

`89637d63b56f`과 비교해 전진 조건이 delay에서 ACK flag로 바뀐 부분을 표시합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:

#### Fix 연결 기록

| 단계 | Source에서 확정된 내용 | 해당 SHA의 코드 근거 |
| --- | --- | --- |
| 기존 가정 | short delay면 server가 이전 signal을 처리했을 것이다. |  |
| 실제 위험 | standard signal coalescing과 ACK의 wait-before-arrival race가 남는다. |  |
| 수정 decision | ACK를 block한 뒤 bit 전송, ACK 확인 뒤 next bit. |  |
| 남은 한계 | generic ACK는 bit identity와 timeout을 제공하지 않는다. |  |

- 변경 전 failure를 재현하거나 추론할 수 있는 입력/상태:
- root cause가 드러나는 field 또는 call order:
- 수정된 invariant를 고정하는 후속 regression test:

#### 보장 범위

**이 commit이 보장하는 것**

- [ ] one-bit stop-and-wait
- [ ] block-before-send ordering

**아직 보장하지 않는 것**

- [ ] strong response correlation
- [ ] bounded wait
- [ ] final datagram architecture

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

`765efe7b75c9`에서 wait에 finite deadline이 추가됩니다.
### 3. `765efe7b75c9` — feat(client): ACK 대기 시간 초과 처리

- **Importance:** A
- **Tags:** RISK, PROCESS_LIFECYCLE, PRACTICAL
- **Thread 내 역할:** ACK wait를 alarm 기반 timeout으로 제한하고 timeout과 다른 send failure를 구분합니다.

#### 원문에서 확정된 맥락

process existence는 protocol participation이 아닙니다. ACK가 없으면 current transmission을 실패로 끝내고 next bit로 진행하지 않습니다. timeout은 retransmission이나 delivery guarantee가 아닙니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] alarm handler와 timeout/ACK state 구분
- [ ] alarm 시작 → wait → alarm 취소 순서
- [ ] ACK, timeout, `kill` failure, wait failure의 분기
- [ ] timeout branch에서 bit cursor가 유지되는지
- [ ] timeout constant 정의와 후속 변경 지점

#### 비교 기준

`78de95b3cacb`과 비교해 unbounded suspension이 finite failure state로 바뀐 부분을 확인합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:


#### 보장 범위

**이 commit이 보장하는 것**

- [ ] unresponsive target에 대한 bounded liveness failure
- [ ] timeout 뒤 transmission 중단

**아직 보장하지 않는 것**

- [ ] lost-bit recovery
- [ ] retransmission
- [ ] ACK loss deduplication

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

`342aea9ce9a8`에서 timeout과 post-ACK pacing이 조정됩니다.
### 4. `342aea9ce9a8` — fix(client): ACK 이후 시그널 전송 간격 안정화

- **Importance:** B
- **Tags:** SIGNAL_DATA, PRACTICAL
- **Thread 내 역할:** signal ACK 뒤 short inter-signal gap을 유지하고 acknowledgement deadline을 늘립니다.

#### 원문에서 확정된 맥락

ACK가 serialization 조건이고 delay는 scheduling sensitivity를 낮추는 workaround입니다. timeout과 pacing constant는 서로 다른 역할입니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] ACK success branch 뒤 delay 호출
- [ ] timeout와 pacing constant의 별도 정의
- [ ] delay failure가 caller로 전달되는지
- [ ] delay가 ACK 전이 아니라 후에 적용되는 순서

#### 비교 기준

`765efe7b75c9` diff에서 timeout 값과 successful path의 pacing만 추적합니다.

#### B-level 구현 역할 기록

- Thread 전체에서 이 commit이 연결하는 앞/뒤 단계:
- 실제로 추가·수정된 핵심 symbol과 state:
- 이 commit만으로 충분하지 않아 후속 commit을 확인해야 하는 부분:

#### Fix 연결 기록

| 단계 | Source에서 확정된 내용 | 해당 SHA의 코드 근거 |
| --- | --- | --- |
| 기존 가정 | ACK만 받으면 다음 signal을 즉시 보내도 scheduling variation과 무관하다. |  |
| 실제 failure 또는 위험 | early signal-only response path가 host load와 handler-cycle timing에 민감할 수 있다. |  |
| root cause | causal ACK와 implementation timing stabilization의 역할을 구분하지 않았다. |  |
| 수정된 invariant/decision | ACK를 ordering 조건으로 유지하되 successful path에 explicit pacing gap을 둔다. |  |

- 변경 전 failure를 재현하거나 추론할 수 있는 입력/상태:
- root cause가 드러나는 field 또는 call order:
- 수정된 invariant를 고정하는 후속 regression test:

#### 보장 범위

**이 commit이 보장하는 것**

- [ ] 초기 signal-only protocol의 scheduling 안정화

**아직 보장하지 않는 것**

- [ ] sequence identity
- [ ] delay 자체의 correctness guarantee

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

`4f17de94e025`에서 interrupted sleep의 remainder를 보존합니다.
### 5. `4f17de94e025` — fix(client): 인터럽트 뒤 남은 전송 간격 유지

- **Importance:** B
- **Tags:** SIGNAL_DATA, PRACTICAL
- **Thread 내 역할:** `nanosleep`이 `EINTR`로 중단되면 returned remainder로 같은 logical gap을 이어갑니다.

#### 원문에서 확정된 맥락

partial sleep을 completed interval로 취급하지 않으며 original full duration을 반복 요청하지도 않습니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] `nanosleep` retry loop와 remaining `timespec`
- [ ] `errno == EINTR`만 retry하는 branch
- [ ] remainder가 다음 request가 되는 assignment
- [ ] other error와 success return path

#### 비교 기준

`342aea9ce9a8`의 single sleep과 비교해 partial-operation 처리만 표시합니다.

#### B-level 구현 역할 기록

- Thread 전체에서 이 commit이 연결하는 앞/뒤 단계:
- 실제로 추가·수정된 핵심 symbol과 state:
- 이 commit만으로 충분하지 않아 후속 commit을 확인해야 하는 부분:

#### Fix 연결 기록

| 단계 | Source에서 확정된 내용 | 해당 SHA의 코드 근거 |
| --- | --- | --- |
| 기존 가정 | 한 번의 `nanosleep` 호출이 requested pacing interval 전체를 보장한다. |  |
| 실제 failure 또는 위험 | unrelated signal의 `EINTR`가 gap을 조기에 끝내 timing workaround를 약화한다. |  |
| root cause | interrupted sleep이 kernel이 반환한 remaining duration을 가진 partial operation임을 반영하지 않았다. |  |
| 수정된 invariant/decision | `EINTR`이면 remainder로 같은 logical interval을 계속하고 다른 error만 실패한다. |  |

- 변경 전 failure를 재현하거나 추론할 수 있는 입력/상태:
- root cause가 드러나는 field 또는 call order:
- 수정된 invariant를 고정하는 후속 regression test:

#### 보장 범위

**이 commit이 보장하는 것**

- [ ] full provisional pacing interval
- [ ] POSIX EINTR progress handling

**아직 보장하지 않는 것**

- [ ] timing-independent ordering
- [ ] final correlation

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

`1487a861046e`에서 이 delay 자체가 제거됩니다.
### 6. `ebed06775b92` — feat(protocol): 응답 메시지 wire 형식 정의

- **Importance:** A
- **Tags:** ARCH, RESPONSE
- **Thread 내 역할:** `ACQUIRE`, `READY`, `ACK`를 표현하는 request/response records와 identity fields를 정의합니다.

#### 원문에서 확정된 맥락

magic, kind, PID, nonce/token, status가 signal data channel과 별도의 control-plane identity를 제공합니다. records는 host-local in-memory ABI이며 portable serialized network protocol이 아닙니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] shared header의 `t_mt_request`/`t_mt_response` fields와 fixed-width types
- [ ] magic와 message kind constants
- [ ] client/server PID, nonce/token, status 배치
- [ ] 직접 structure size를 datagram contract로 쓰는 근거
- [ ] byte order/alignment serialization이 없는 근거

#### 비교 기준

`4f17de94e025`까지의 undifferentiated ACK가 표현하지 못한 identity를 field별로 대조합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:


#### 보장 범위

**이 commit이 보장하는 것**

- [ ] correlated control message schema
- [ ] session/bit response 구분 능력

**아직 보장하지 않는 것**

- [ ] runtime ACQUIRE validation
- [ ] client acceptance predicate
- [ ] portable ABI

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

`4234233ebd30`에서 sequence가 actual ACK work에 연결됩니다.
### 7. `4234233ebd30` — feat(protocol): 비트 ACK를 sequence 응답으로 큐잉

- **Importance:** S
- **Tags:** ARCH, RESPONSE, CORE
- **Thread 내 역할:** accepted bit에 sequence를 부여하고 datagram ACK send work를 pipe로 queue해 direct signal response에서 분리합니다.

#### 원문에서 확정된 맥락

이 SHA에서는 handler가 bit transition을 여전히 수행하지만 `sendto`는 normal context로 미뤄집니다. queue write failure는 overflow flag로 드러냅니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] server session의 sequence field, init/reset/increment
- [ ] ACK work record의 PID, kind, token, status
- [ ] bit transition과 ACK work creation 순서
- [ ] handler 경로의 pipe write
- [ ] pipe reader에서 `sendto`를 수행하는 caller/callee
- [ ] failed/partial pipe write와 overflow flag
- [ ] legacy signal ACK와 datagram ACK가 공존하는 path

#### 비교 기준

`ebed06775b92` schema가 runtime sequence state에 연결되는 diff를 확인하고 `d3eacbbfeadc` client side와 맞춥니다.

#### S-level 재구성

다음 항목은 path, symbol, state field, branch를 근거로 작성합니다.

- [ ] generic signal ACK가 어떤 identity를 잃는지 직전 code로 정리
- [ ] bit mutation → sequence assignment → queue write → actual send context trace
- [ ] pipe write failure 시 이미 변한 state와 failure semantics
- [ ] legacy ACK와 datagram ACK 공존 지점
- [ ] byte/NUL frame을 지나 sequence reset 또는 continuation
- [ ] 후속 self-pipe refactor에서 다시 이동할 responsibility

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

- [ ] distinct per-bit sequence identity
- [ ] socket send의 normal-context queueing

**아직 보장하지 않는 것**

- [ ] final async-signal-safe handler
- [ ] single response path
- [ ] queue-loss recovery

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

`d3eacbbfeadc`에서 client가 matching sequence response만 수락합니다.
### 8. `d3eacbbfeadc` — feat(client): 비트 ACK를 sequence로 상관 검증

- **Importance:** A
- **Tags:** RESPONSE, RISK
- **Thread 내 역할:** client가 expected server source와 exact current sequence의 datagram ACK만 bit success로 수락합니다.

#### 원문에서 확정된 맥락

signal 전 server endpoint를 검증하고 monotonic deadline을 설정합니다. size, source, PID, kind, token, magic, status가 모두 맞아야 sequence가 증가합니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] signal send 전 server endpoint validation
- [ ] bit-specific absolute monotonic deadline
- [ ] `kill` 뒤 response receive loop
- [ ] exact size/source/PID/magic/kind/token/status predicate
- [ ] invalid candidate를 같은 deadline으로 무시하는 branch
- [ ] matching ACK 뒤 sequence와 cursor 증가

#### 비교 기준

`4234233ebd30` server sequence의 initial/increment rule과 대조하고 `aeb1b00867f4`에서 legacy dependency 제거를 확인합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:


#### 보장 범위

**이 commit이 보장하는 것**

- [ ] per-bit response correlation
- [ ] stale/forged frame이 cursor를 전진시키지 않음

**아직 보장하지 않는 것**

- [ ] output-before-ACK commit
- [ ] legacy removal
- [ ] invalid-flood regression

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

`aeb1b00867f4`에서 generic signal response와 implicit first-bit ownership을 삭제합니다.
### 9. `aeb1b00867f4` — refactor(protocol): 이전 signal ACK 경로 제거

- **Importance:** A
- **Tags:** ARCH, RESPONSE, REFACTOR
- **Thread 내 역할:** obsolete ACK/NACK signal machinery를 client/server/shared/test sender에서 제거하고 datagram response만 남깁니다.

#### 원문에서 확정된 맥락

handlers, alarm flags, wait masks, signal responses가 사라지며 server는 explicit acquisition 없는 sender signal로 owner를 지정하지 않습니다. owner에게 response send가 실패하면 session을 reset합니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] 삭제된 ACK/NACK constants와 handler registration
- [ ] client signal flags/alarm/mask/`sigsuspend` 제거
- [ ] first-bit owner assignment branch 제거
- [ ] unauthorized sender signal ignore condition
- [ ] bit success의 단일 datagram path
- [ ] response send failure → session reset path

#### 비교 기준

`d3eacbbfeadc`와 비교해 parallel success mechanisms를 모두 찾고 삭제 후 남는 단일 path를 표시합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:

#### Fix 연결 기록

| 단계 | Source에서 확정된 내용 | 해당 SHA의 코드 근거 |
| --- | --- | --- |
| 기존 가정 | signal ACK와 datagram ACK가 함께 있어도 같은 success를 나타낸다. |  |
| 실제 위험 | 두 response path가 다른 결과를 내고 implicit first-bit path가 acquisition을 우회한다. |  |
| root cause | protocol success와 ownership의 authoritative path가 둘 이상이다. |  |
| 수정 invariant | success는 sequence datagram ACK만, owner는 ACQUIRE 뒤에만 존재한다. |  |

- 변경 전 failure를 재현하거나 추론할 수 있는 입력/상태:
- root cause가 드러나는 field 또는 call order:
- 수정된 invariant를 고정하는 후속 regression test:

#### 보장 범위

**이 commit이 보장하는 것**

- [ ] single source of truth for ACK
- [ ] ownership은 ACQUIRE 뒤에만 시작

**아직 보장하지 않는 것**

- [ ] output commit ordering
- [ ] fixed delay 제거

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

`1487a861046e`에서 remaining timing workaround가 제거됩니다.
### 10. `1487a861046e` — perf(protocol): 검증된 ACK 뒤 고정 지연 제거

- **Importance:** A
- **Tags:** PERF, RESPONSE
- **Thread 내 역할:** matching sequence ACK 뒤 fixed sleep을 production client와 session sender에서 제거합니다.

#### 원문에서 확정된 맥락

client는 여전히 one bit를 보내고 exact ACK를 기다린 뒤 다음 bit로 진행합니다. delay 제거는 ordering이 time이 아니라 correlation에 의해 보장됨을 보여 줍니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] production send loop의 sleep helper/constant 제거 diff
- [ ] session sender의 동일 delay 제거
- [ ] send와 matching wait가 한 iteration에서 직렬화되는 코드
- [ ] ACK 전 cursor/sequence가 증가하지 않는 순서
- [ ] timeout과 success path의 최종 구분

#### 비교 기준

`4f17de94e025` pacing implementation과 `aeb1b00867f4` datagram-only path를 함께 비교합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:


#### 보장 범위

**이 commit이 보장하는 것**

- [ ] sleep 없는 one-bit-in-flight ordering
- [ ] bit당 unnecessary latency 제거

**아직 보장하지 않는 것**

- [ ] multiple bits in flight
- [ ] retransmission
- [ ] exactly-once transaction

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

이 commit이 Thread final state입니다. elapsed time이 success condition으로 남지 않았는지 확인합니다.


## 6. Invariant ledger

### Source에서 확정된 핵심 invariant

- 논리적으로 한 번에 하나의 data bit만 전송 중입니다.
- client는 expected server endpoint에서 온 exact sequence ACK를 수락한 뒤에만 다음 bit로 진행합니다.
- stale, forged, malformed, uncorrelated response는 transition을 완료하지 않습니다.
- 무응답은 bounded failure로 끝나며 현재 bit를 성공 처리하지 않습니다.

### 시간에 따른 변화 기록

| Commit | Source에서 확정된 변화 | 실제 state/condition | code evidence | 상태: 도입·강화·부족·복구·검증 |
| --- | --- | --- | --- | --- |
| `89637d63b56f` | message byte를 MSB부터 signal bit로 직렬화하고 provisional fixed delay로 전송 속도를 낮춥니다. |  |  |  |
| `78de95b3cacb` | bit마다 signal ACK를 기다리는 stop-and-wait를 도입하고 ACK-before-wait race를 막습니다. |  |  |  |
| `765efe7b75c9` | ACK wait를 alarm 기반 timeout으로 제한하고 timeout과 다른 send failure를 구분합니다. |  |  |  |
| `342aea9ce9a8` | signal ACK 뒤 short inter-signal gap을 유지하고 acknowledgement deadline을 늘립니다. |  |  |  |
| `4f17de94e025` | `nanosleep`이 `EINTR`로 중단되면 returned remainder로 같은 logical gap을 이어갑니다. |  |  |  |
| `ebed06775b92` | `ACQUIRE`, `READY`, `ACK`를 표현하는 request/response records와 identity fields를 정의합니다. |  |  |  |
| `4234233ebd30` | accepted bit에 sequence를 부여하고 datagram ACK send work를 pipe로 queue해 direct signal response에서 분리합니다. |  |  |  |
| `d3eacbbfeadc` | client가 expected server source와 exact current sequence의 datagram ACK만 bit success로 수락합니다. |  |  |  |
| `aeb1b00867f4` | obsolete ACK/NACK signal machinery를 client/server/shared/test sender에서 제거하고 datagram response만 남깁니다. |  |  |  |
| `1487a861046e` | matching sequence ACK 뒤 fixed sleep을 production client와 session sender에서 제거합니다. |  |  |  |

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 상태 | 실제 failure/위험 | Fix 또는 전환 commit | 수정된 decision/invariant | Test 또는 후속 검증 | 학습자 code evidence |
| --- | --- | --- | --- | --- | --- |
| 여러 bit를 시간 간격만 두고 전송 | receiver 완료를 증명하지 못해 signal 병합과 byte 정렬 손상 위험 | `78de95b3cacb` | bit별 signal ACK stop-and-wait | 이 단계 전용 test commit은 Thread에 없음 |  |
| generic signal ACK | 어느 bit의 response인지 식별 불가하고 parallel success path가 남음 | `ebed06775b92 → 4234233ebd30 → d3eacbbfeadc → aeb1b00867f4` | wire field와 sequence correlation, legacy path 제거 | Thread 6의 b361ef9745ff와 1ed2acbaa353에서 adversarial 검증 |  |
| ACK 뒤 fixed delay | validated ACK 뒤에도 bit마다 latency 누적 | `1487a861046e` | delay 제거, ACK를 causal progress 근거로 사용 | production client와 session sender diff 확인 |  |

전용 test commit이 없는 연결에는 존재하지 않는 test를 만들어 적지 않습니다.

## 8. Ownership / state / responsibility 변화

| 단계 | state 또는 responsibility owner | transition | 당시 한계 또는 다음 변화 | 실제 symbol/field |
| --- | --- | --- | --- | --- |
| 초기 | client bit cursor | elapsed time 뒤 다음 bit | server 처리 완료와 직접 연결되지 않음 |  |
| signal ACK | client ACK flag와 mask | handler flag 뒤 다음 bit | transition identity 없음 |  |
| datagram 전환 | server sequence와 queued response | accepted bit마다 token 부여 | legacy ACK와 잠시 공존 |  |
| 최종 | client outstanding sequence | exact ACK 뒤 증가 | fixed delay와 signal ACK 제거 |  |

## 9. Thread 최종 상태

Source에서 확정된 최종 조건:

- data bit는 계속 `SIGUSR1`/`SIGUSR2`로 전달됩니다.
- 진행 허가는 expected server endpoint의 sequence-correlated datagram ACK 하나로 결정됩니다.
- fixed sleep은 ordering invariant에 포함되지 않습니다.
- timeout은 uncertainty를 bounded failure로 끝내며 retransmission 또는 exactly-once를 제공하지 않습니다.

학습자 기록:

- 최종 state fields와 owner:
- 정상 transition 순서:
- 실패 시 중단·reset·cleanup 순서:
- 최종 상태가 보장하지 않는 것:
- 이 Thread를 한 문단으로 설명한 최종 서술:

## 10. 최종 architecture 또는 execution flow 정리

아래 노드를 해당 SHA에서 확인한 함수명과 branch로 연결합니다.

- [ ] client가 payload byte와 MSB-first bit 위치를 선택하는 지점
- [ ] zero/one을 signal로 전송하는 호출
- [ ] current sequence와 absolute deadline을 만드는 지점
- [ ] server가 accepted bit에 같은 sequence ACK를 생성하는 경로
- [ ] client가 source와 response fields를 검증하는 predicate
- [ ] sequence와 bit cursor가 증가하는 유일한 지점
- [ ] timeout/send/receive failure에서 중단되는 경로

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

- [ ] commit map의 10개 SHA를 source 순서대로 모두 설명할 수 있습니다.
- [ ] 각 code excerpt에 SHA, path, symbol, 선택 이유가 기록돼 있습니다.
- [ ] final HEAD 코드를 historical SHA의 증거로 사용한 곳이 없습니다.
- [ ] 정상 경로와 failure path를 state mutation 순서로 설명할 수 있습니다.
- [ ] source 확정 invariant와 직접 확인한 code evidence를 구분했습니다.
- [ ] test commit의 invariant, failure, technique, production path, proves/not-proves를 기록했습니다.
- [ ] Thread final state를 함수와 state field 수준으로 설명할 수 있습니다.

### 이 Thread와 직접 연결된 Major Engineering Difficulties

- standard signal은 동일 signal의 임의 multiplicity를 reliable counted queue처럼 보존하지 않습니다.
- signal data channel과 datagram completion channel의 state ordering을 맞춰야 합니다.
- invalid response를 무시하는 동안에도 original monotonic deadline을 유지해야 합니다.
