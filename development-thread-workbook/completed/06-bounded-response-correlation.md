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

- [x] request/response record의 field, 의미, READY/ACK 사용 위치를 표로 정리했습니다.
- [x] READY acceptance predicate를 source address부터 status까지 실제 condition 순서로 복원했습니다.
- [x] sequence ACK acceptance predicate와 sequence advance 지점을 실제 코드로 확인했습니다.
- [x] discarded frame 뒤 nonce, sequence, bit cursor, absolute deadline이 변하지 않음을 확인했습니다.
- [x] forged-source, wrong-token, bad-magic, wrong-PID, oversized, invalid-flood cases를 production branch에 연결했습니다.
- [x] 같은 UID의 predictable path validation이 cryptographic peer authentication을 뜻하지 않음을 구분했습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `ebed06775b92` | feat(protocol): 응답 메시지 wire 형식 정의 | A | ARCH, RESPONSE | request와 특정 bit transition을 식별할 수 있는 request/response fields를 정의합니다. |
| 2 | `f8e8444c5ded` | feat(client): READY 응답을 출처와 nonce로 상관 검증 | A | RESPONSE, RISK, INTEGRATION | READY에 exact size, source, PID, kind, nonce, status와 absolute readiness deadline을 적용합니다. |
| 3 | `d3eacbbfeadc` | feat(client): 비트 ACK를 sequence로 상관 검증 | A | RESPONSE, RISK | 현재 sequence와 정확히 일치하는 datagram ACK만 bit success로 인정합니다. |
| 4 | `b361ef9745ff` | test(protocol): 응답 출처와 token 검증 | A | TEST, RESPONSE, RISK | valid READY와 first bit ACK 전에 forged-source와 mismatched-field responses를 주입해 conjunctive validation을 검증합니다. |
| 5 | `1ed2acbaa353` | test(response): oversized 응답과 invalid flood 검증 | A | TEST, RESPONSE, RISK | response record보다 한 byte 큰 datagram과 sustained wrong-token traffic을 이용해 exact framing과 absolute deadline을 검증합니다. |

확인 원칙:

- 각 항목은 해당 SHA의 tree를 기준으로 읽었습니다.
- 변경 전 상태는 해당 SHA의 parent 또는 지정된 이전 관련 SHA에서 확인했습니다.
- 같은 commit이 다른 Thread에 다시 등장해도 이 Thread의 질문으로 별도 기록했습니다.
- runtime test는 실행하지 않았으며, 실행 결과처럼 표현하지 않았습니다.

## 5. Commit별 학습 기록

### 1. `ebed06775b92` — feat(protocol): 응답 메시지 wire 형식 정의

- **Importance:** A
- **Tags:** ARCH, RESPONSE
- **Thread 내 역할:** request와 특정 bit transition을 식별할 수 있는 request/response fields를 정의합니다.

#### 원문에서 확정된 맥락

`ACQUIRE`, `READY`, acknowledgement traffic을 구분하는 magic과 kind, client/server PID, nonce 또는 token, status를 포함하는 fixed records를 shared header에 추가합니다. records는 host-local in-memory ABI이며 portable serialized protocol이 아닙니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] `t_mt_request` field order/type
- [x] `t_mt_response` field order/type
- [x] request/response magic and kind constants
- [x] client/server PID field 의미
- [x] nonce와 token 대응
- [x] OK/BUSY status
- [x] raw structure size가 framing 기준
- [x] serialization/version/byte-order conversion 부재

#### 비교 기준

직전 signal-only ACK에는 kind/token/status/PID field가 없습니다. 이 Thread에서는 각 field가 후속 stale/forged/oversized rejection의 어느 조건에 쓰이는지 연결합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: generic ACK/NACK signal은 sender/transition identity를 payload로 전달하지 못했고, request와 response의 exact frame size를 정의할 shared record도 없었습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: 도착한 signal 하나만으로는 어느 acquisition 또는 어느 bit에 대한 응답인지 구분할 수 없습니다. stale/unrelated response를 배제할 field와 framing 기준이 필요합니다.
- 변경된 decision과 state mutation 순서: shared header에 `t_mt_request {magic, kind, nonce, client_pid}`와 `t_mt_response {magic, kind, token, status, server_pid}`를 추가하고 request/response magic, kind, status constants를 정의했습니다. 이 commit은 representation만 정의합니다. 후속 sender/receiver가 raw `sizeof(struct)` datagram을 만들고 exact size, source와 fields를 검사합니다. READY는 request nonce를 response token으로 echo하고 ACK는 current sequence를 token으로 사용합니다.
- 정상 경로와 failure 경로가 갈라지는 조건: schema 자체에는 runtime reject branch가 없습니다. fixed-width integers를 일부 사용하지만 `pid_t`, padding, native byte order를 그대로 포함하므로 다른 ABI/host 간 portable serialization은 아닙니다.
- 후속 commit이 강화하거나 교체하는 부분: `f8e8444c5ded`가 READY predicate와 absolute deadline을, `d3eacbbfeadc`가 per-bit sequence ACK predicate를 구현합니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] strong correlation을 표현할 wire schema
- [x] exact-frame validation의 기준 record size
- [x] READY와 ACK kind 구분 능력

**아직 보장하지 않는 것**

- [x] runtime acceptance predicate
- [x] source endpoint validation
- [x] absolute deadline behavior
- [x] portable ABI 또는 cryptographic authentication

#### 코드 증거 기록

- 파일 경로: `include/minitalk.h`
- symbol 또는 함수: `t_mt_request`, `t_mt_response`, `MT_RESPONSE_MAGIC`, `MT_REQUEST_ACQUIRE`, `MT_RESPONSE_READY`, `MT_RESPONSE_ACK`
- 확인한 state fields: `request nonce`, `response token`, `status`, `client_pid`, `server_pid`
- caller → callee: shared definitions → 후속 client/server `sendto`/`recvfrom` callers
- 핵심 branch 또는 mutation 순서: 이 commit은 representation만 정의합니다. 후속 sender/receiver가 raw `sizeof(struct)` datagram을 만들고 exact size, source와 fields를 검사합니다. READY는 request nonce를 response token으로 echo하고 ACK는 current sequence를 token으로 사용합니다.
- parent 또는 이전 관련 SHA와의 diff 요약: shared constants와 두 raw record type만 추가됐고 actual socket validation은 아직 없습니다.
- 삽입한 최소 코드 조각과 선택 이유: SHA `ebed06775b92`, `include/minitalk.h`. acquisition identity와 response identity를 표현하는 전체 field set을 보여 주는 최소 정의입니다.

```c
typedef struct s_mt_request
{
    uint32_t magic;
    uint32_t kind;
    uint32_t nonce;
    pid_t    client_pid;
} t_mt_request;

typedef struct s_mt_response
{
    uint32_t magic;
    uint32_t kind;
    uint32_t token;
    int32_t  status;
    pid_t    server_pid;
} t_mt_response;
```

- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`f8e8444c5ded`가 READY validation에 이 fields를 실제로 적용합니다.
### 2. `f8e8444c5ded` — feat(client): READY 응답을 출처와 nonce로 상관 검증

- **Importance:** A
- **Tags:** RESPONSE, RISK, INTEGRATION
- **Thread 내 역할:** READY에 exact size, source, PID, kind, nonce, status와 absolute readiness deadline을 적용합니다.

#### 원문에서 확정된 맥락

client는 nonzero nonce를 생성해 `ACQUIRE`를 보내고 expected server endpoint에서 current request와 일치하는 `READY`만 수락합니다. unrelated 또는 malformed datagrams는 무시하며 one absolute `CLOCK_MONOTONIC` deadline을 유지합니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] `/dev/urandom` partial read/EINTR/close와 zero nonce 처리
- [x] ACQUIRE fields와 expected destination
- [x] absolute `CLOCK_MONOTONIC` deadline one-time calculation
- [x] `sizeof(response)+1` receive buffer와 exact size check
- [x] expected source path check
- [x] magic/server PID/READY/token/status conjunction
- [x] invalid frame 뒤 same deadline 유지
- [x] valid READY 뒤에만 payload path 진입

#### 비교 기준

`ebed06775b92`의 fields를 runtime predicate에 매핑합니다. Session Thread에서는 acquisition ownership으로, 여기서는 client acceptance/deadline state로 읽습니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: server ACQUIRE/READY path는 생겼지만 production client는 session request를 보내고 matching READY를 기다리는 correlated establishment path가 없거나 완전하지 않았습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: 같은 local datagram socket에 stale, malformed, wrong peer, wrong request의 frame이 도착할 수 있습니다. invalid frame마다 relative timeout을 다시 시작하면 wait가 무기한 연장됩니다.
- 변경된 decision과 state mutation 순서: `/dev/urandom`에서 nonzero nonce를 만들고 expected server path와 하나의 monotonic absolute deadline을 확정한 뒤 exact-size/source/magic/PID/kind/token/status conjunction만 READY success로 수락했습니다. client endpoint bind → target server path derivation/validation → nonce generation → `ACQUIRE{magic,kind,nonce,client_pid}` send → `clock_gettime(CLOCK_MONOTONIC)`으로 deadline 한 번 계산 → remaining budget으로 `pselect`/`recvfrom` 반복 → exact READY match 후 payload send path입니다.
- 정상 경로와 failure 경로가 갈라지는 조건: random open/read/close, path, send, clock, pselect/recv fatal error는 send error입니다. EAGAIN/EINTR 또는 invalid candidate는 같은 deadline으로 계속합니다. deadline 도달은 timeout, status BUSY는 rejected, full valid READY만 established입니다.
- 후속 commit이 강화하거나 교체하는 부분: `d3eacbbfeadc`가 같은 structure를 per-bit sequence ACK에 적용하고 `b361ef9745ff`/`1ed2acbaa353`이 forged/oversized/flood inputs를 검증합니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] nonce-correlated READY acceptance
- [x] malformed/unrelated response rejection
- [x] invalid traffic 아래 bounded readiness wait
- [x] BUSY와 transport timeout 구분

**아직 보장하지 않는 것**

- [x] per-bit sequence ACK correlation
- [x] adversarial test evidence at this SHA
- [x] same-UID cryptographic authentication
- [x] retransmission

#### 코드 증거 기록

- 파일 경로: `src/client.c`, `src/response_channel.c`, `include/minitalk.h`
- symbol 또는 함수: `generate_nonce`, `time_until`, `valid_source`, `read_response`, `wait_for_response`, `acquire_session`
- 확인한 state fields: `nonce`, `deadline`, `server_path`, `g_response_socket`
- caller → callee: client `main` → endpoint bind → `acquire_session` → `sendto` → response wait/read/validate
- 핵심 branch 또는 mutation 순서: client endpoint bind → target server path derivation/validation → nonce generation → `ACQUIRE{magic,kind,nonce,client_pid}` send → `clock_gettime(CLOCK_MONOTONIC)`으로 deadline 한 번 계산 → remaining budget으로 `pselect`/`recvfrom` 반복 → exact READY match 후 payload send path입니다.
- parent 또는 이전 관련 SHA와의 diff 요약: client에 nonce generation, ACQUIRE send, READY receive validation, absolute-deadline wait와 status-specific return이 추가됐습니다.
- 삽입한 최소 코드 조각과 선택 이유: SHA `f8e8444c5ded`, `src/client.c`, response candidate validation. exact size, source와 모든 identity fields가 conjunction임을 보여 줍니다.

```c
if (size != (ssize_t)sizeof(response))
    return (0);
memcpy(&response, payload, sizeof(response));
if (!valid_source(&source, server_path)
    || response.magic != MT_RESPONSE_MAGIC
    || response.server_pid != server_pid || response.kind != kind
    || response.token != token || response.status != MT_RESPONSE_OK)
    return (0);
```

- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`d3eacbbfeadc`가 같은 규칙을 current bit sequence에 적용합니다.
### 3. `d3eacbbfeadc` — feat(client): 비트 ACK를 sequence로 상관 검증

- **Importance:** A
- **Tags:** RESPONSE, RISK
- **Thread 내 역할:** 현재 sequence와 정확히 일치하는 datagram ACK만 bit success로 인정합니다.

#### 원문에서 확정된 맥락

client는 signal을 보내기 전에 expected server endpoint와 bit-specific monotonic deadline을 확정하고, source path, server PID, ACK kind, current sequence, magic, exact size, success status가 모두 맞는 response를 기다립니다. sequence는 그 ACK 뒤에만 증가합니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] sequence initial value 0
- [x] signal send 전 current sequence expectation
- [x] server endpoint validation과 `kill` order
- [x] per-bit absolute monotonic deadline
- [x] exact size/source/field ACK predicate
- [x] wrong sequence discard
- [x] matching ACK 뒤 cursor/sequence advance
- [x] timeout/failure에서 current bit 유지

#### 비교 기준

READY predicate와 exact fields를 공유하지만 token 의미가 acquisition nonce에서 outstanding bit sequence로 바뀝니다. `4234233ebd30` server sequence initial/increment와 맞춥니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: READY는 nonce로 correlated됐지만 data bits는 아직 legacy signal ACK에 의존하거나 datagram ACK acceptance가 current bit cursor에 완전히 연결되지 않았습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: generic 또는 stale ACK가 다음 bit를 승인하면 one-bit-in-flight state가 틀어집니다. current sequence와 무관한 frame은 source가 맞아도 transition completion 근거가 아닙니다.
- 변경된 decision과 state mutation 순서: session sequence를 0부터 시작하고 각 bit의 signal 전 current sequence와 one absolute deadline을 response expectation으로 고정했습니다. READY와 공통 source/field checks에 kind ACK와 exact sequence token을 적용했습니다. server endpoint validate → current sequence deadline 생성 → current bit `kill` → exact ACK candidate loop → matching response 후에만 caller가 sequence와 bit cursor를 증가시킵니다. invalid/stale frames는 state를 바꾸지 않고 same deadline budget을 소비합니다.
- 정상 경로와 failure 경로가 갈라지는 조건: send/path/clock/receive permanent error는 failure, deadline 만료는 timeout입니다. wrong size/source/magic/PID/kind/token/status는 discard입니다. matching ACK 전에는 bit index와 sequence가 유지됩니다.
- 후속 commit이 강화하거나 교체하는 부분: `aeb1b00867f4`가 parallel signal ACK path를 제거합니다. `b361ef9745ff`와 `1ed2acbaa353`이 rejection conjunction과 deadline을 adversarial input으로 검증합니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] specific in-flight bit에 대한 correlated completion
- [x] stale ACK가 next bit를 승인하지 못함
- [x] one transition deadline 안의 bounded wait

**아직 보장하지 않는 것**

- [x] oversized/flood regression evidence at this SHA
- [x] retransmission 또는 deduplication
- [x] same-UID malicious peer authentication
- [x] multiple bits in flight

#### 코드 증거 기록

- 파일 경로: `src/client.c`, `src/server.c`, `include/minitalk.h`
- symbol 또는 함수: `send_bit`, `wait_for_response`, `read_response`, `send_response`
- 확인한 state fields: `sequence`, `bit index`, `deadline`, `server_path`
- caller → callee: `send_byte` → `send_bit` → signal `kill` → datagram response wait/validation → cursor/sequence advance
- 핵심 branch 또는 mutation 순서: server endpoint validate → current sequence deadline 생성 → current bit `kill` → exact ACK candidate loop → matching response 후에만 caller가 sequence와 bit cursor를 증가시킵니다. invalid/stale frames는 state를 바꾸지 않고 same deadline budget을 소비합니다.
- parent 또는 이전 관련 SHA와의 diff 요약: per-bit send success가 generic ACK flag가 아니라 exact datagram token과 source/field predicate에 연결됩니다.
- 삽입할 최소 코드 조각과 선택 이유: 표와 호출 순서만으로 invariant가 충분히 드러나므로 코드 덤프를 추가하지 않았습니다.
- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`b361ef9745ff`가 READY와 first ACK 모두에 forged/mismatched candidates를 주입합니다.
### 4. `b361ef9745ff` — test(protocol): 응답 출처와 token 검증

- **Importance:** A
- **Tags:** TEST, RESPONSE, RISK
- **Thread 내 역할:** valid READY와 first bit ACK 전에 forged-source와 mismatched-field responses를 주입해 conjunctive validation을 검증합니다.

#### 원문에서 확정된 맥락

purpose-built response server는 forged socket, wrong token, invalid magic, incorrect server PID를 가진 frames를 먼저 보내고 마지막에 correctly correlated frame을 보냅니다. real client는 모든 invalid candidate를 무시한 뒤 valid frame에서만 진행해야 합니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] purpose-built expected server/forger sockets
- [x] forged source bind
- [x] wrong token frame
- [x] bad magic frame
- [x] wrong server PID frame
- [x] invalid→valid send order for READY
- [x] first signal event 뒤 same invalid→valid ACK order
- [x] real client success와 cleanup assertions

#### 비교 기준

각 injected frame을 `f8e8444c5ded` READY predicate와 `d3eacbbfeadc` ACK predicate의 한 rejection branch에 대응시킵니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: production predicates는 source와 fields를 함께 검사했지만 각 조건 하나만 틀린 frame이 READY/first ACK를 잘못 완료하지 않는지 end-to-end evidence가 없었습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: normal server는 invalid response를 만들지 않으므로 ordinary integration test는 reject branches를 통과하지 않습니다. source-only 또는 token-only 검사로 퇴행해도 success test는 통과할 수 있습니다.
- 변경된 decision과 state mutation 순서: `tests/response_server.c`가 expected server path와 별도 forger path를 bind하고, READY와 first ACK마다 forged source → wrong token → bad magic → wrong server PID → valid frame 순서로 전송합니다. response server PID/path 준비 → real client ACQUIRE 수신 → invalid READY sequence와 valid READY → first data signal event 관측 → invalid ACK sequence와 valid ACK → remaining ACKs 정상 응답 → NUL frame/cleanup → shell이 client/helper status와 output/stderr를 검사합니다.
- 정상 경로와 failure 경로가 갈라지는 조건: forger socket frame은 source-path check, token+1은 token check, magic 0은 magic check, PID+1은 server PID check에서 discard됩니다. final valid frame만 acquisition 또는 first bit를 완료합니다.
- 후속 commit이 강화하거나 교체하는 부분: `1ed2acbaa353`가 exact-size trailing byte와 sustained wrong-token traffic 아래 deadline을 별도로 검증합니다.

#### Test commit 분석 기록

- **대상 production invariant:** source endpoint와 모든 response identity fields가 맞아야 현재 READY 또는 ACK transition이 완료됩니다.
- **재현하는 failure 또는 boundary:** forged source 또는 token, magic, server PID 하나만 다른 stale/uncorrelated response가 state를 전진시키는 상황
- **사용한 test technique:** purpose-built datagram peer가 invalid candidates를 순서대로 주입한 뒤 valid frame을 전송
- **분류:** adversarial protocol integration regression
- **failure 주입 또는 process orchestration 시작 지점:** `tests/response_server`가 server와 forger paths를 둘 다 bind하고 real client의 ACQUIRE를 받습니다.
- **production code에 진입하는 최초 호출:** client READY wait의 `recvfrom`/predicate와 first bit ACK wait의 같은 predicate입니다.
- **핵심 assertion과 관측값:** client success, helper success, expected payload/NUL output, empty diagnostics, all endpoint cleanup을 검사합니다. Progress가 invalid frames에서 일어났다면 subsequent sequence/output assertion이 깨집니다.
- **증명하는 것:** forged source rejection<br>wrong token rejection<br>bad magic rejection<br>wrong server PID rejection<br>valid correlated frame에서만 progress
- **증명하지 않는 것:** oversized rejection<br>continuous invalid traffic의 timeout bound<br>same-UID authentication<br>CPU/rate bound
- **후속 변경에서 막아야 할 구체적인 회귀:** acceptance predicate를 일부 field만 검사하도록 약화하거나 invalid frame에 sequence/cursor를 전진시키는 변경을 막습니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] forged source rejection
- [x] wrong token rejection
- [x] bad magic rejection
- [x] wrong server PID rejection
- [x] valid correlated frame 이후에만 progress

**아직 보장하지 않는 것**

- [x] oversized frame rejection
- [x] continuous invalid traffic timeout bound
- [x] same-UID cryptographic authentication
- [x] rate limiting

#### 코드 증거 기록

- 파일 경로: `tests/response_server.c`, `tests/response_validation.sh`, `Makefile`, `src/client.c`
- symbol 또는 함수: `reply_with_invalid_events`, `send_response`, `receive_session_request`, `response_server main`
- 확인한 state fields: `g_server_socket`, `g_forger_socket`, `expected token`, `sequence`
- caller → callee: test response server → datagram candidates → production client `read_response` predicate → valid-frame progress
- 핵심 branch 또는 mutation 순서: response server PID/path 준비 → real client ACQUIRE 수신 → invalid READY sequence와 valid READY → first data signal event 관측 → invalid ACK sequence와 valid ACK → remaining ACKs 정상 응답 → NUL frame/cleanup → shell이 client/helper status와 output/stderr를 검사합니다.
- parent 또는 이전 관련 SHA와의 diff 요약: purpose-built response server binary와 validation shell test가 Makefile test target에 추가됐습니다.
- 삽입할 최소 코드 조각과 선택 이유: 표와 호출 순서만으로 invariant가 충분히 드러나므로 코드 덤프를 추가하지 않았습니다.
- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`1ed2acbaa353`가 exact size와 continuous invalid traffic liveness를 별도로 검증합니다.
### 5. `1ed2acbaa353` — test(response): oversized 응답과 invalid flood 검증

- **Importance:** A
- **Tags:** TEST, RESPONSE, RISK
- **Thread 내 역할:** response record보다 한 byte 큰 datagram과 sustained wrong-token traffic을 이용해 exact framing과 absolute deadline을 검증합니다.

#### 원문에서 확정된 맥락

client는 valid prefix 뒤 trailing byte가 있는 frame을 거부하고, otherwise well-formed wrong-token responses가 계속 도착해도 original transition interval 안에서 timeout해야 합니다. invalid input은 processing을 유발할 수 있지만 wait budget을 재설정하지 않습니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] `sizeof(response)+1` payload와 trailing `0xa5`
- [x] valid-looking prefix를 expected server socket에서 send
- [x] received exact-size rejection branch
- [x] wrong-token otherwise-valid response construction
- [x] 100µs sustained send loop와 client-path stop condition
- [x] elapsed 2~6 second assertion
- [x] exact timeout diagnostic와 nonzero status
- [x] invalid receive마다 deadline이 재계산되지 않는 production code

#### 비교 기준

`f8e8444c5ded`/`d3eacbbfeadc`에서 deadline을 한 번 만드는 지점과 receive loop가 `time_until(deadline)`을 반복 사용하는 지점을 test elapsed bound와 연결합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: `b361ef9745ff`는 finite invalid frames 뒤 valid response를 보내 conjunction을 검증했지만 valid prefix+trailing data와 끊임없는 invalid traffic의 liveness는 검증하지 않았습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: received size를 최소 크기로만 검사하면 oversized frame의 valid prefix가 수락될 수 있습니다. invalid datagram마다 relative timeout을 새로 만들면 attacker가 wait를 무한 연장할 수 있습니다.
- 변경된 decision과 state mutation 순서: response server에 `sizeof(t_mt_response)+1` frame 전송과 wrong-token READY flood mode를 추가했습니다. shell은 flood client가 expected diagnostic으로 2~6초 안에 실패하는지 측정합니다. normal validation scenario에서 forger frame 뒤 legitimate server path가 oversized frame을 보내고 이후 other invalid/valid frames를 보냅니다. flood scenario는 ACQUIRE 수신 후 same server path에서 token+1 READY를 최대 100000회, 100µs 간격으로 client endpoint가 사라질 때까지 보냅니다.
- 정상 경로와 failure 경로가 갈라지는 조건: oversized `recvfrom` count는 `sizeof(response)`와 다르므로 field copy/validation 전에 discard됩니다. wrong token은 exact-size/source/other fields가 맞아도 token branch에서 discard되고 original monotonic deadline이 만료되면 client가 timeout/cleanup합니다.
- 후속 commit이 강화하거나 교체하는 부분: 이 commit이 Thread final adversarial regression입니다. production code는 invalid traffic에 rate limit을 두지 않지만 wait budget은 늘리지 않습니다.

#### Test commit 분석 기록

- **대상 production invariant:** response는 exact record size여야 하고 ignored traffic은 original monotonic deadline을 연장하지 않습니다.
- **재현하는 failure 또는 boundary:** valid prefix를 가진 oversized frame 수락 또는 invalid response마다 timeout을 재시작해 wait가 무한 연장되는 상황
- **사용한 test technique:** oversized datagram injection + sustained wrong-token response flood
- **분류:** adversarial framing and liveness regression
- **failure 주입 또는 process orchestration 시작 지점:** response server가 legitimate source path에서 oversized frame 또는 `MT_TEST_INVALID_FLOOD` mode를 시작합니다.
- **production code에 진입하는 최초 호출:** client `recvfrom` byte-count check와 token predicate, 이어서 remaining-time calculation입니다.
- **핵심 assertion과 관측값:** oversized frame 이후에도 invalid sequence를 계속 무시하고 valid response에서 정상 progress; flood case는 nonzero client status, exact timeout diagnostic, elapsed 2~6초, helper clean exit입니다.
- **증명하는 것:** exact-size framing<br>trailing byte rejection<br>wrong-token no progress<br>invalid flood가 deadline을 reset하지 않음
- **증명하지 않는 것:** CPU/rate limit<br>peer authentication<br>packet loss recovery<br>deduplication
- **후속 변경에서 막아야 할 구체적인 회귀:** `size >= sizeof` 같은 prefix acceptance나 receive마다 fresh relative timeout을 만드는 변경을 막습니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] exact-size acceptance rule
- [x] valid prefix plus trailing byte rejection
- [x] wrong-token traffic이 state를 전진시키지 않음
- [x] continuous invalid input이 transition deadline을 reset하지 못함

**아직 보장하지 않는 것**

- [x] CPU consumption bound under flood
- [x] rate limiting 또는 peer authentication
- [x] packet loss retransmission/deduplication
- [x] cryptographic integrity

#### 코드 증거 기록

- 파일 경로: `tests/response_server.c`, `tests/protocol_regressions.sh`, `src/client.c`
- symbol 또는 함수: `send_oversized_response`, `flood_invalid_responses`, `read_response`, `time_until`
- 확인한 state fields: `oversized payload length`, `wrong token`, `absolute deadline`, `flood tries`, `client endpoint existence`
- caller → callee: test response server → oversized/flood datagrams → client exact-size/token discard loop → original deadline timeout
- 핵심 branch 또는 mutation 순서: normal validation scenario에서 forger frame 뒤 legitimate server path가 oversized frame을 보내고 이후 other invalid/valid frames를 보냅니다. flood scenario는 ACQUIRE 수신 후 same server path에서 token+1 READY를 최대 100000회, 100µs 간격으로 client endpoint가 사라질 때까지 보냅니다.
- parent 또는 이전 관련 SHA와의 diff 요약: existing response server에 oversized sender와 flood mode를 추가하고 protocol regression script에 elapsed-time scenario를 추가했습니다.
- 삽입한 최소 코드 조각과 선택 이유: SHA `1ed2acbaa353`, `tests/response_server.c`, `send_oversized_response`. valid struct prefix 뒤 한 byte를 붙여 exact framing branch를 겨냥합니다.

```c
unsigned char payload[sizeof(*response) + 1];
memcpy(payload, response, sizeof(*response));
payload[sizeof(*response)] = 0xa5;
sendto(socket_fd, payload, sizeof(payload), 0, ...);
```

- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

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
| `ebed06775b92` | request와 특정 bit transition을 식별할 수 있는 request/response fields를 정의합니다. | nonce와 token을 포함한 fixed request/response record가 생기지만 acceptance behavior는 아직 caller에 없습니다. | `include/minitalk.h: t_mt_request`, `t_mt_response` | 도입·부족 |
| `f8e8444c5ded` | READY에 exact size, source, PID, kind, nonce, status와 absolute readiness deadline을 적용합니다. | outstanding acquisition은 nonce, expected server path/PID, one absolute deadline으로 식별되며 exact READY만 완료합니다. | `src/client.c: generate_nonce`, READY response wait/validation | 강화 |
| `d3eacbbfeadc` | 현재 sequence와 정확히 일치하는 datagram ACK만 bit success로 인정합니다. | current bit는 exact sequence token ACK 전까지 outstanding이며 invalid response에 cursor/sequence가 변하지 않습니다. | `src/client.c: send_bit`, response validation loop | 강화 |
| `b361ef9745ff` | valid READY와 first bit ACK 전에 forged-source와 mismatched-field responses를 주입해 conjunctive validation을 검증합니다. | READY와 first ACK에서 source/field 하나씩 틀린 candidates가 state를 전진시키지 않고 final valid frame만 완료합니다. | `tests/response_server.c: reply_with_invalid_events`, `tests/response_validation.sh` | 검증 |
| `1ed2acbaa353` | response record보다 한 byte 큰 datagram과 sustained wrong-token traffic을 이용해 exact framing과 absolute deadline을 검증합니다. | exact frame length과 original absolute deadline이 adversarial oversized/flood traffic에서도 유지됩니다. | `tests/response_server.c`, `tests/protocol_regressions.sh`, client response loop | 검증 |

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 상태 | 실제 failure/위험 | Fix 또는 전환 commit | 수정된 decision/invariant | Test 또는 후속 검증 | 학습자 code evidence |
| --- | --- | --- | --- | --- | --- |
| 도착 순서나 kind 하나만 맞으면 current response로 간주 | stale/forged datagram이 READY/ACK를 거짓 완료 | `f8e8444c5ded → d3eacbbfeadc` | exact source와 모든 identity fields conjunction | `b361ef9745ff` | forger source, token, magic, PID invalid frames 뒤 valid frame |
| record prefix가 valid하면 frame 전체도 valid | trailing data를 가진 oversized frame 수락 가능 | `f8e8444c5ded` | received size가 record와 정확히 같을 때만 검증 | `1ed2acbaa353` | `sizeof(response)+1` legitimate-source datagram |
| invalid response마다 relative timeout 재시작 | wrong-token flood가 wait를 무기한 연장 | `f8e8444c5ded → d3eacbbfeadc` | transition 시작 때 만든 하나의 absolute monotonic deadline | `1ed2acbaa353` | 100µs wrong-token flood와 elapsed 2~6초 timeout |

전용 test commit이 없는 연결에는 존재하지 않는 test를 만들어 적지 않았습니다.

## 8. Ownership / state / responsibility 변화

| 단계 | state 또는 responsibility owner | transition | 당시 한계 또는 다음 변화 | 실제 symbol/field |
| --- | --- | --- | --- | --- |
| wire record definition | shared protocol header | peer와 request/bit identity fields 제공 | validation behavior는 caller에 있음 | `t_mt_request`, `t_mt_response` |
| READY wait | client outstanding acquisition | nonce+expected server endpoint exact frame만 완료 | same-UID authentication은 아님 | nonce, server path/PID, deadline |
| ACK wait | client current bit/sequence | matching ACK 뒤에만 cursor/sequence advance | retransmission/dedup 없음 | sequence token, bit index |
| invalid traffic handling | receive loop + original deadline | discard하고 같은 budget으로 계속 wait | processing rate limit 없음 | `read_response`, `time_until` |

## 9. Thread 최종 상태

Source에서 확정된 최종 조건:

- READY는 exact size, expected server source path, magic, server PID, READY kind, nonce token, success status가 모두 맞아야 수락됩니다.
- bit ACK는 같은 validation에 현재 sequence token을 적용하며 exact match 뒤에만 다음 bit로 전진합니다.
- forged, stale, malformed, oversized, wrong-token responses는 transition을 완료하지 않습니다.
- discarded traffic은 original `CLOCK_MONOTONIC` absolute deadline을 다시 시작하지 않으므로 wait는 bounded입니다.

학습자 기록:

- 최종 state fields와 owner: client가 outstanding nonce 또는 sequence, expected server path/PID, response kind와 one absolute deadline을 소유합니다. receive candidate는 검증 완료 전 session/bit state에 반영되지 않습니다.
- 정상 transition 순서: transition identity와 absolute deadline 확정 → request/signal send → remaining budget으로 receive → exact byte count/source 검사 → magic/PID/kind/token/status 검사 → invalid면 state 그대로 반복, valid면 acquisition 또는 bit cursor/sequence advance입니다.
- 실패 시 중단·reset·cleanup 순서: permanent send/receive/clock error는 즉시 실패하고, invalid candidate는 같은 deadline budget 안에서 discard합니다. deadline 만료는 timeout으로 전송 전체를 중단하며 current bit를 성공 처리하지 않습니다.
- 최종 상태가 보장하지 않는 것: same-UID malicious peer에 대한 authentication, invalid traffic rate limiting/CPU bound, retransmission, deduplication, exactly-once delivery는 제공하지 않습니다.
- 이 Thread를 한 문단으로 설명한 최종 서술: 이 Thread는 raw response record의 field set을 current transition의 acceptance predicate로 바꿉니다. READY는 acquisition nonce를, ACK는 bit sequence를 token으로 사용하며 exact size와 expected source path, internal PID, magic, kind, status가 모두 맞아야 progress합니다. invalid datagram은 state를 바꾸지 않고 최초 absolute deadline만 소비하므로 forged·oversized·flood traffic 아래에서도 wait가 bounded됩니다.

## 10. 최종 architecture 또는 execution flow 정리

- [x] outstanding nonce 또는 sequence와 expected server endpoint 설정
- [x] transition 시작 시 monotonic absolute deadline 계산
- [x] remaining budget으로 response receive 대기
- [x] received datagram의 exact byte count와 source path 검증
- [x] magic, server PID, kind, token, status 검증
- [x] invalid frame이면 state advance 없이 같은 absolute deadline으로 반복
- [x] valid frame이면 acquisition 또는 bit transition 완료
- [x] deadline 도달이면 timeout failure 반환

```text
begin transition
    -> identity = acquisition nonce OR current bit sequence
    -> expected source path/server PID/kind/status
    -> deadline = CLOCK_MONOTONIC now + fixed interval
    -> send ACQUIRE or data signal
receive loop
    -> remaining = deadline - monotonic now
    -> pselect/recvfrom
    -> require exact sizeof(t_mt_response)
    -> require expected source path
    -> require magic + server_pid + kind + token + OK status
    -> invalid: no state advance, repeat with same deadline
    -> valid: commit acquisition or advance bit cursor/sequence
    -> deadline zero: timeout failure

```

- 실제 함수·파일을 반영한 완성 흐름: `include/minitalk.h`의 records, `src/client.c`의 nonce/deadline/response validation, `tests/response_server.c`의 adversarial frames가 complete path를 구성합니다.
- asynchronous boundary: data signal delivery는 asynchronous지만 response acceptance와 all state advance는 client normal-context datagram wait loop에서 수행됩니다.
- externally visible commit point: 모든 source/frame/identity/status 조건을 만족한 READY 또는 ACK를 받은 뒤 acquisition state 또는 bit cursor/sequence를 전진시키는 지점입니다.
- cleanup owner: client cleanup이 timeout/error/success 뒤 response descriptor와 실제 bound client path를 정리합니다. test response server는 server/forger paths를 자체 cleanup합니다.

## 11. 학습 완료 자가 점검

- [x] commit map의 5개 SHA를 source 순서대로 모두 설명할 수 있습니다.
- [x] 각 code excerpt에 SHA, path, symbol, 선택 이유가 기록돼 있습니다.
- [x] final HEAD 코드를 historical SHA의 증거로 사용한 곳이 없습니다.
- [x] 정상 경로와 failure path를 state mutation 순서로 설명할 수 있습니다.
- [x] source 확정 invariant와 직접 확인한 code evidence를 구분했습니다.
- [x] test commit의 invariant, failure, technique, production path, proves/not-proves를 기록했습니다.
- [x] Thread final state를 함수와 state field 수준으로 설명할 수 있습니다.
- [ ] 해당 SHA의 test를 로컬에서 직접 실행했습니다. — 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

### 이 Thread와 직접 연결된 Major Engineering Difficulties

- predictable local endpoint와 record field 하나만으로는 stale 또는 unrelated traffic을 배제할 수 없습니다.
- acquisition nonce와 per-bit sequence는 scope가 달라 공통 validation과 transition-specific validation을 함께 유지해야 합니다.
- continuous invalid traffic이 receive loop를 계속 깨워도 relative timeout을 반복 시작하지 않아야 합니다.
