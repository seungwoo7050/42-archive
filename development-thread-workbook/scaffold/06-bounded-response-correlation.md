# Thread: Response correlation remains bounded under hostile or stale input

> 완성형 해설서가 아닙니다. 아래 확정 사항을 기준으로 각 commit SHA의 실제 코드와 diff를 읽고 기록란을 채웁니다.

## 1. Thread 목표

Unix datagram response가 현재 client와 현재 transition에 속한다는 판단 규칙을 복원합니다. exact frame size, source endpoint, PID, magic, kind, nonce 또는 sequence, status를 함께 검증하고, stale·forged·oversized·uncorrelated traffic을 무시하면서도 원래의 monotonic deadline을 늘리지 않는 bounded wait를 실제 코드와 adversarial tests로 확인합니다.

### Significance

control channel의 응답은 단순히 도착했다는 이유로 state를 전진시킬 수 없습니다. 한 field만 맞는 datagram도 현재 `ACQUIRE` 또는 bit transition을 증명하지 못합니다. production validation은 모든 identity field와 source를 결합하고, ignored traffic은 기존 deadline budget을 소비할 뿐 새 budget을 만들지 않아야 합니다. 이 Thread는 wire representation에서 시작해 READY와 sequence ACK validation, forged response, oversized frame, invalid flood 검증으로 그 조건을 고정합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- `t_mt_request`와 `t_mt_response`의 어떤 fields가 peer와 transition identity를 표현하는가?
- READY와 bit ACK는 token을 각각 nonce와 sequence로 어떻게 해석하는가?
- response source path와 record 내부 server PID를 왜 동시에 검증하는가?
- exact datagram size check는 valid prefix 뒤 trailing byte를 어디서 거부하는가?
- invalid frame을 받은 뒤 어떤 state가 그대로 유지되어야 하는가?
- `CLOCK_MONOTONIC` absolute deadline은 언제 한 번 계산되고 반복 receive에서 어떻게 재사용되는가?
- forged-source test와 invalid-flood test는 서로 다른 어떤 failure를 고정하는가?

## 3. 완료 기준

- [ ] request/response record의 field, 의미, READY/ACK 사용 위치를 표로 정리합니다.
- [ ] READY acceptance predicate를 source address부터 status까지 실제 condition 순서로 복원합니다.
- [ ] sequence ACK acceptance predicate와 sequence advance 지점을 실제 코드로 확인합니다.
- [ ] discarded frame 뒤 nonce, sequence, bit cursor, absolute deadline이 변하지 않음을 확인합니다.
- [ ] forged-source, wrong-token, bad-magic, wrong-PID, oversized, invalid-flood cases를 production branch에 연결합니다.
- [ ] 같은 UID의 predictable path validation이 cryptographic peer authentication을 뜻하지 않음을 구분합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `ebed06775b92` | feat(protocol): 응답 메시지 wire 형식 정의 | A | ARCH, RESPONSE | request와 특정 bit transition을 식별할 수 있는 request/response fields를 정의합니다. |
| 2 | `f8e8444c5ded` | feat(client): READY 응답을 출처와 nonce로 상관 검증 | A | RESPONSE, RISK, INTEGRATION | READY에 exact size, source, PID, kind, nonce, status와 absolute readiness deadline을 적용합니다. |
| 3 | `d3eacbbfeadc` | feat(client): 비트 ACK를 sequence로 상관 검증 | A | RESPONSE, RISK | 현재 sequence와 정확히 일치하는 datagram ACK만 bit success로 인정합니다. |
| 4 | `b361ef9745ff` | test(protocol): 응답 출처와 token 검증 | A | TEST, RESPONSE, RISK | valid READY와 first bit ACK 전에 forged-source와 mismatched-field responses를 주입해 conjunctive validation을 검증합니다. |
| 5 | `1ed2acbaa353` | test(response): oversized 응답과 invalid flood 검증 | A | TEST, RESPONSE, RISK | response record보다 한 byte 큰 datagram과 sustained wrong-token traffic을 이용해 exact framing과 absolute deadline을 검증합니다. |

확인 원칙:

- 각 항목은 해당 SHA의 tree를 기준으로 읽습니다.
- 변경 전 상태는 해당 SHA의 parent 또는 지정된 이전 관련 SHA에서 확인합니다.
- 같은 commit이 다른 Thread에 다시 등장해도 이 Thread의 질문으로 별도 기록합니다.

## 5. Commit별 학습 기록

### 1. `ebed06775b92` — feat(protocol): 응답 메시지 wire 형식 정의

- **Importance:** A
- **Tags:** ARCH, RESPONSE
- **Thread 내 역할:** request와 특정 bit transition을 식별할 수 있는 request/response fields를 정의합니다.

#### 원문에서 확정된 맥락

`ACQUIRE`, `READY`, acknowledgement traffic을 구분하는 magic과 kind, client/server PID, nonce 또는 token, status를 포함하는 fixed records를 shared header에 추가합니다. records는 host-local in-memory ABI이며 portable serialized protocol이 아닙니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] `t_mt_request`와 `t_mt_response` definition 및 field order/type
- [ ] request/response magic constants
- [ ] `ACQUIRE`, `READY`, `ACK` message kind values
- [ ] client PID와 server PID field의 sender/receiver 의미
- [ ] request nonce와 response token의 대응 위치
- [ ] status values와 success/failure 표현
- [ ] record가 raw structure로 send/receive되는 지점 또는 후속 caller가 기대하는 size
- [ ] serialization, version negotiation, byte-order conversion이 없는 범위

#### 비교 기준

Thread 1에서는 signal ACK를 대체할 control-plane foundation으로 읽었습니다. 이 Thread에서는 각 field가 어떤 stale/forged/mismatched response rejection에 사용되는지 표로 연결합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:


#### 보장 범위

**이 commit이 보장하는 것**

- [ ] strong correlation을 표현할 wire schema
- [ ] exact-frame validation의 기준 record size

**아직 보장하지 않는 것**

- [ ] runtime acceptance predicate
- [ ] source endpoint validation
- [ ] absolute deadline behavior

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

`f8e8444c5ded`가 READY validation에 이 fields를 실제로 적용합니다.
### 2. `f8e8444c5ded` — feat(client): READY 응답을 출처와 nonce로 상관 검증

- **Importance:** A
- **Tags:** RESPONSE, RISK, INTEGRATION
- **Thread 내 역할:** READY에 exact size, source, PID, kind, nonce, status와 absolute readiness deadline을 적용합니다.

#### 원문에서 확정된 맥락

client는 nonzero nonce를 생성해 `ACQUIRE`를 보내고 expected server endpoint에서 current request와 일치하는 `READY`만 수락합니다. unrelated 또는 malformed datagrams는 무시하며 one absolute `CLOCK_MONOTONIC` deadline을 유지합니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] `/dev/urandom`에서 nonce를 생성하고 zero를 배제하는 code
- [ ] outstanding request에 nonce와 target server PID를 저장하는 지점
- [ ] `ACQUIRE` send destination과 request fields
- [ ] absolute `CLOCK_MONOTONIC` deadline을 한 번 계산하는 code
- [ ] deadline에서 remaining wait를 계산하는 helper 또는 branch
- [ ] `recvfrom` result byte count와 source sockaddr extraction
- [ ] exact `sizeof(t_mt_response)` comparison
- [ ] expected server socket path comparison
- [ ] magic, server PID, `READY` kind, token, status validation order
- [ ] invalid candidate 뒤 원래 deadline과 acquisition state가 유지되는 loop
- [ ] valid candidate만 session-established state로 전환하는 지점

#### 비교 기준

`ebed06775b92` record fields를 predicate 항목별로 매핑하고, Session Thread에서 본 ownership acquisition과 달리 이 Thread에서는 response acceptance와 deadline state를 중심으로 읽습니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:


#### 보장 범위

**이 commit이 보장하는 것**

- [ ] nonce-correlated READY acceptance
- [ ] malformed/unrelated response rejection
- [ ] invalid traffic 아래 bounded readiness wait

**아직 보장하지 않는 것**

- [ ] per-bit sequence ACK correlation
- [ ] adversarial test evidence
- [ ] same-UID peer에 대한 cryptographic authentication

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

`d3eacbbfeadc`가 같은 규칙을 current bit sequence에 적용합니다.
### 3. `d3eacbbfeadc` — feat(client): 비트 ACK를 sequence로 상관 검증

- **Importance:** A
- **Tags:** RESPONSE, RISK
- **Thread 내 역할:** 현재 sequence와 정확히 일치하는 datagram ACK만 bit success로 인정합니다.

#### 원문에서 확정된 맥락

client는 signal을 보내기 전에 expected server endpoint와 bit-specific monotonic deadline을 확정하고, source path, server PID, ACK kind, current sequence, magic, exact size, success status가 모두 맞는 response를 기다립니다. sequence는 그 ACK 뒤에만 증가합니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] sequence initial value와 session state field
- [ ] bit send 직전 current sequence를 response expectation으로 잡는 code
- [ ] server endpoint validity check와 signal `kill` 순서
- [ ] per-bit absolute deadline creation과 remaining-time loop
- [ ] response exact size와 source path check
- [ ] magic, server PID, ACK kind, sequence token, status predicate
- [ ] wrong sequence와 other invalid frame discard branch
- [ ] matching ACK 뒤 bit cursor와 sequence가 advance하는 exact order
- [ ] timeout/failure 시 current bit를 advance하지 않는 return path

#### 비교 기준

`f8e8444c5ded` READY predicate와 공통 fields 및 nonce/sequence 차이를 표로 만들고, Thread 1에서 확인한 signal-ACK migration과 연결합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:


#### 보장 범위

**이 commit이 보장하는 것**

- [ ] specific in-flight bit에 대한 correlated completion
- [ ] stale ACK가 next bit를 승인하지 못함
- [ ] one transition deadline 안의 bounded wait

**아직 보장하지 않는 것**

- [ ] oversized/flood regression evidence
- [ ] retransmission 또는 deduplication
- [ ] same-UID malicious peer authentication

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

`b361ef9745ff`가 READY와 first ACK 모두에 forged/mismatched candidates를 주입합니다.
### 4. `b361ef9745ff` — test(protocol): 응답 출처와 token 검증

- **Importance:** A
- **Tags:** TEST, RESPONSE, RISK
- **Thread 내 역할:** valid READY와 first bit ACK 전에 forged-source와 mismatched-field responses를 주입해 conjunctive validation을 검증합니다.

#### 원문에서 확정된 맥락

purpose-built response server는 forged socket, wrong token, invalid magic, incorrect server PID를 가진 frames를 먼저 보내고 마지막에 correctly correlated frame을 보냅니다. real client는 모든 invalid candidate를 무시한 뒤 valid frame에서만 진행해야 합니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] purpose-built response server와 expected server path setup
- [ ] expected source와 다른 forged socket 생성·bind 지점
- [ ] wrong token, bad magic, wrong server PID frame construction
- [ ] invalid frames와 valid frame의 send order
- [ ] READY phase와 first bit ACK phase 각각의 injection sequence
- [ ] client가 data signal을 보냈음을 helper가 관측하는 synchronization
- [ ] client success와 process cleanup assertions
- [ ] 각 injected field가 `f8e8444c5ded` 또는 `d3eacbbfeadc`의 어느 rejection branch를 통과하는지

#### 비교 기준

`f8e8444c5ded`와 `d3eacbbfeadc` acceptance predicate에 test frames를 한 행씩 대응시킵니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:


#### Test commit 분석 기록

- **대상 production invariant:** source endpoint와 모든 response identity fields가 맞아야 현재 READY 또는 ACK transition이 완료됩니다.
- **재현하는 failure 또는 boundary:** forged source 또는 token, magic, server PID 하나만 다른 stale/uncorrelated response가 state를 전진시키는 상황
- **사용한 test technique:** purpose-built datagram peer가 invalid candidates를 순서대로 주입한 뒤 valid frame을 전송
- **분류:** adversarial protocol integration regression

확인할 production path:

- [ ] client `ACQUIRE` send와 READY wait
- [ ] response source/field validation과 invalid discard loop
- [ ] first data signal send
- [ ] sequence ACK validation과 bit-state advance

이 테스트가 증명하는 항목:

- [ ] forged source rejection
- [ ] wrong token rejection
- [ ] bad magic rejection
- [ ] wrong server PID rejection
- [ ] valid correlated frame 이후에만 progress

이 테스트가 증명하지 않는 항목:

- [ ] oversized frame rejection
- [ ] continuous invalid traffic 아래 timeout bound
- [ ] same-UID peer에 대한 cryptographic authentication

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

`1ed2acbaa353`가 exact size와 continuous invalid traffic liveness를 별도로 검증합니다.
### 5. `1ed2acbaa353` — test(response): oversized 응답과 invalid flood 검증

- **Importance:** A
- **Tags:** TEST, RESPONSE, RISK
- **Thread 내 역할:** response record보다 한 byte 큰 datagram과 sustained wrong-token traffic을 이용해 exact framing과 absolute deadline을 검증합니다.

#### 원문에서 확정된 맥락

client는 valid prefix 뒤 trailing byte가 있는 frame을 거부하고, otherwise well-formed wrong-token responses가 계속 도착해도 original transition interval 안에서 timeout해야 합니다. invalid input은 processing을 유발할 수 있지만 wait budget을 재설정하지 않습니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] `sizeof(t_mt_response) + 1` oversized buffer construction
- [ ] valid-looking prefix와 trailing byte의 send length
- [ ] oversized frame 뒤 client state/response behavior assertion
- [ ] wrong-token frame 생성과 sustained send loop
- [ ] test server/client synchronization과 flood stop condition
- [ ] elapsed time 또는 bounded completion assertion
- [ ] timeout diagnostic와 client exit status
- [ ] production exact-size rejection branch
- [ ] production wrong-token rejection branch
- [ ] absolute deadline이 invalid receive마다 다시 계산되지 않는 code

#### 비교 기준

`f8e8444c5ded`와 `d3eacbbfeadc`에서 deadline base를 만드는 지점과 반복 receive에서 사용하는 지점을 비교해 한 budget임을 확인합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:


#### Test commit 분석 기록

- **대상 production invariant:** response는 exact record size여야 하고 ignored traffic은 original monotonic deadline을 연장하지 않습니다.
- **재현하는 failure 또는 boundary:** valid prefix를 가진 oversized frame이 수락되거나 invalid response마다 relative timeout이 재시작돼 wait가 무한 연장되는 상황
- **사용한 test technique:** oversized datagram injection과 sustained wrong-token response flood
- **분류:** adversarial framing and liveness regression

확인할 production path:

- [ ] datagram receive byte-count validation
- [ ] token correlation failure와 discard loop
- [ ] remaining budget calculation
- [ ] deadline expiration과 client timeout return

이 테스트가 증명하는 항목:

- [ ] exact-size acceptance rule
- [ ] valid prefix plus trailing data rejection
- [ ] wrong-token frames do not advance state
- [ ] continuous invalid input cannot reset transition deadline

이 테스트가 증명하지 않는 항목:

- [ ] CPU consumption bound under flood
- [ ] rate limiting or peer authentication
- [ ] packet loss retransmission or deduplication

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

이 commit이 Thread final adversarial regression입니다.


## 6. Invariant ledger

### Source에서 확정된 핵심 invariant

- response datagram은 protocol record와 정확히 같은 크기여야 하며 valid prefix만으로 수락하지 않습니다.
- expected source path와 record의 magic, server PID, kind, token, status가 모두 일치해야 transition이 완료됩니다.
- READY token은 outstanding acquisition nonce와, ACK token은 현재 outstanding bit sequence와 일치해야 합니다.
- invalid, forged, stale, oversized, uncorrelated frame은 session 또는 bit state를 전진시키지 않습니다.
- ignored traffic은 한 번 설정한 monotonic absolute deadline을 갱신하지 않습니다.

### 시간에 따른 변화 기록

| Commit | Source에서 확정된 변화 | 실제 state/condition | code evidence | 상태: 도입·강화·부족·복구·검증 |
| --- | --- | --- | --- | --- |
| `ebed06775b92` | request와 특정 bit transition을 식별할 수 있는 request/response fields를 정의합니다. |  |  |  |
| `f8e8444c5ded` | READY에 exact size, source, PID, kind, nonce, status와 absolute readiness deadline을 적용합니다. |  |  |  |
| `d3eacbbfeadc` | 현재 sequence와 정확히 일치하는 datagram ACK만 bit success로 인정합니다. |  |  |  |
| `b361ef9745ff` | valid READY와 first bit ACK 전에 forged-source와 mismatched-field responses를 주입해 conjunctive validation을 검증합니다. |  |  |  |
| `1ed2acbaa353` | response record보다 한 byte 큰 datagram과 sustained wrong-token traffic을 이용해 exact framing과 absolute deadline을 검증합니다. |  |  |  |

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 상태 | 실제 failure/위험 | Fix 또는 전환 commit | 수정된 decision/invariant | Test 또는 후속 검증 | 학습자 code evidence |
| --- | --- | --- | --- | --- | --- |
| 도착 순서나 kind 하나만 맞으면 current response로 간주 | stale 또는 forged datagram이 READY/ACK를 거짓 완료할 수 있음 | `f8e8444c5ded → d3eacbbfeadc` | exact source와 모든 identity fields를 conjunction으로 검증 | b361ef9745ff forged/mismatched response regression |  |
| record prefix가 valid하면 frame 전체도 valid하다고 간주 | trailing data를 가진 oversized frame이 compatible response로 수락될 수 있음 | `f8e8444c5ded` | received size가 response record와 정확히 같을 때만 검증 진행 | 1ed2acbaa353 oversized datagram regression |  |
| invalid response마다 relative timeout을 새로 시작 | wrong-token flood가 client wait를 무기한 연장할 수 있음 | `f8e8444c5ded → d3eacbbfeadc` | transition 시작 때 만든 하나의 absolute monotonic deadline을 유지 | 1ed2acbaa353 sustained invalid-flood liveness regression |  |

전용 test commit이 없는 연결에는 존재하지 않는 test를 만들어 적지 않습니다.

## 8. Ownership / state / responsibility 변화

| 단계 | state 또는 responsibility owner | transition | 당시 한계 또는 다음 변화 | 실제 symbol/field |
| --- | --- | --- | --- | --- |
| wire record definition | shared protocol header | peer와 request/bit identity를 표현할 fields 제공 | validation behavior는 아직 caller에 있음 |  |
| READY wait | client의 outstanding acquisition state | nonce와 expected server endpoint에 맞는 frame만 session을 완료 | same-UID cryptographic authentication은 아님 |  |
| ACK wait | client의 current bit/sequence state | matching ACK 뒤에만 bit cursor와 sequence advance | retransmission 또는 deduplication은 없음 |  |
| invalid traffic handling | receive loop와 original deadline | frame을 discard하고 같은 transition budget으로 계속 wait | processing cost 자체의 rate limit은 없음 |  |

## 9. Thread 최종 상태

Source에서 확정된 최종 조건:

- READY는 exact size, expected server source path, magic, server PID, READY kind, nonce token, success status가 모두 맞아야 수락됩니다.
- bit ACK는 같은 validation에 현재 sequence token을 적용하며 exact match 뒤에만 다음 bit로 전진합니다.
- forged, stale, malformed, oversized, wrong-token responses는 transition을 완료하지 않습니다.
- discarded traffic은 original `CLOCK_MONOTONIC` absolute deadline을 다시 시작하지 않으므로 wait는 bounded입니다.

학습자 기록:

- 최종 state fields와 owner:
- 정상 transition 순서:
- 실패 시 중단·reset·cleanup 순서:
- 최종 상태가 보장하지 않는 것:
- 이 Thread를 한 문단으로 설명한 최종 서술:

## 10. 최종 architecture 또는 execution flow 정리

아래 노드를 해당 SHA에서 확인한 함수명과 branch로 연결합니다.

- [ ] outstanding nonce 또는 sequence와 expected server endpoint 설정
- [ ] transition 시작 시 monotonic absolute deadline 계산
- [ ] remaining budget으로 response receive 대기
- [ ] received datagram의 exact byte count와 source path 검증
- [ ] magic, server PID, kind, token, status 검증
- [ ] invalid frame이면 state advance 없이 같은 absolute deadline으로 반복
- [ ] valid frame이면 acquisition 또는 bit transition 완료
- [ ] deadline 도달이면 timeout failure 반환

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

- [ ] commit map의 5개 SHA를 source 순서대로 모두 설명할 수 있습니다.
- [ ] 각 code excerpt에 SHA, path, symbol, 선택 이유가 기록돼 있습니다.
- [ ] final HEAD 코드를 historical SHA의 증거로 사용한 곳이 없습니다.
- [ ] 정상 경로와 failure path를 state mutation 순서로 설명할 수 있습니다.
- [ ] source 확정 invariant와 직접 확인한 code evidence를 구분했습니다.
- [ ] test commit의 invariant, failure, technique, production path, proves/not-proves를 기록했습니다.
- [ ] Thread final state를 함수와 state field 수준으로 설명할 수 있습니다.

### 이 Thread와 직접 연결된 Major Engineering Difficulties

- predictable local endpoint와 record field 하나만으로는 stale 또는 unrelated traffic을 배제할 수 없습니다.
- acquisition nonce와 per-bit sequence는 scope가 달라 공통 validation과 transition-specific validation을 함께 유지해야 합니다.
- continuous invalid traffic이 receive loop를 계속 깨워도 relative timeout을 반복 시작하지 않아야 합니다.
