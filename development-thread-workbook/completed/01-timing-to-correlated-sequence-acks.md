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

- [x] fixed delay, signal ACK, timeout, sequence datagram ACK의 역할 차이를 코드로 설명합니다.
- [x] 각 단계에서 client가 다음 bit로 넘어가는 조건과 failure branch를 기록합니다.
- [x] wire record, sequence, source endpoint validation이 결합되는 조건식을 찾았습니다.
- [x] legacy ACK 제거 전후 success path를 비교해 단일 authoritative response path를 확인했습니다.
- [x] 최종 상태에서 sleep 없이 ordering이 유지되는 execution flow를 함수 단위로 복원했습니다.

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

- 각 항목은 해당 SHA의 tree를 기준으로 읽었습니다.
- 변경 전 상태는 해당 SHA의 parent 또는 지정된 이전 관련 SHA에서 확인했습니다.
- 같은 commit이 다른 Thread에 다시 등장해도 이 Thread의 질문으로 별도 기록했습니다.
- runtime test는 실행하지 않았으며, 실행 결과처럼 표현하지 않았습니다.

## 5. Commit별 학습 기록

### 1. `89637d63b56f` — feat(client): 메시지 바이트를 시그널로 전송

- **Importance:** A
- **Tags:** CORE, SIGNAL_DATA
- **Thread 내 역할:** message byte를 MSB부터 signal bit로 직렬화하고 provisional fixed delay로 전송 속도를 낮춥니다.

#### 원문에서 확정된 맥락

client는 target PID를 검증하고 message를 encoding 해석 없이 byte sequence로 취급합니다. zero와 one은 서로 다른 user signal이며 delay는 coalescing 위험을 줄일 뿐 receiver 처리 완료를 증명하지 못합니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] `mt_parse_pid`와 `kill(pid, 0)`의 target 검증
- [x] `send_byte`의 7→0 bit 순회
- [x] 0/1을 두 user signal로 매핑하는 `send_bit` branch
- [x] `kill` 성공 뒤 150µs 고정 지연
- [x] send failure 시 caller로 즉시 반환하는 경로

#### 비교 기준

`8e5371c7b85e`의 server assembly가 byte를 왼쪽으로 밀어 MSB-first signal을 복원하는 규칙과 맞췄습니다. parent diff에서는 client transport와 PID parser가 새로 연결됩니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: parent에서는 server 쪽 MSB-first assembly는 존재하지만 client가 payload를 signal sequence로 만드는 transport path가 완성되지 않았습니다. `main`은 아직 `send_byte`/`send_bit`를 호출하지 않았습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: standard signal은 같은 종류의 여러 pending instance를 counted queue처럼 보존하지 않으므로, 송신자가 receiver 처리 여부와 무관하게 전진하면 bit가 합쳐질 수 있습니다.
- 변경된 decision과 state mutation 순서: `src/client.c`에 byte loop와 bit loop를 만들고 각 bit를 `MT_ZERO_SIGNAL` 또는 `MT_ONE_SIGNAL`로 변환했습니다. `main` → `mt_parse_pid` → `kill(pid, 0)` → payload byte 선택 → bit 7부터 0까지 `send_bit` → `kill` 성공 뒤 `usleep(150)` → 다음 bit입니다. 이 SHA에서는 payload 뒤 NUL terminator를 전송하지 않습니다.
- 정상 경로와 failure 경로가 갈라지는 조건: PID parse/process probe/`kill`/delay 중 하나가 실패하면 오류를 반환하고 현재 함수가 끝납니다. 실패한 `send_bit` 뒤에는 bit index나 다음 byte로 전진하지 않습니다.
- 후속 commit이 강화하거나 교체하는 부분: `78de95b3cacb`가 elapsed time 대신 server ACK를 다음 bit의 조건으로 바꾸고, `765efe7b75c9`가 그 wait를 제한합니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] sender-side bit 표현과 MSB-first 순서
- [x] message를 raw byte sequence로 취급하는 기준

**아직 보장하지 않는 것**

- [x] receiver 처리 완료
- [x] signal multiplicity 보존
- [x] NUL framing
- [x] session ownership
- [x] acknowledgement

#### 코드 증거 기록

- 파일 경로: `src/client.c`, `src/parse_pid.c`, `include/minitalk.h`, `Makefile`
- symbol 또는 함수: `main`, `send_byte`, `send_bit`, `mt_parse_pid`
- 확인한 state fields: `bit`, `byte pointer`
- caller → callee: `main` → `send_byte` → `send_bit` → `kill`/`usleep`
- 핵심 branch 또는 mutation 순서: `main` → `mt_parse_pid` → `kill(pid, 0)` → payload byte 선택 → bit 7부터 0까지 `send_bit` → `kill` 성공 뒤 `usleep(150)` → 다음 bit입니다. 이 SHA에서는 payload 뒤 NUL terminator를 전송하지 않습니다.
- parent 또는 이전 관련 SHA와의 diff 요약: client transport 책임과 PID parser가 추가됐고, 아직 ACK·timeout·session state는 없습니다.
- 삽입할 최소 코드 조각과 선택 이유: 표와 호출 순서만으로 invariant가 충분히 드러나므로 코드 덤프를 추가하지 않았습니다.
- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`78de95b3cacb`에서 elapsed time 대신 ACK가 next-bit condition이 됩니다.
### 2. `78de95b3cacb` — feat(protocol): 비트 처리마다 ACK 전송

- **Importance:** A
- **Tags:** CORE, SIGNAL_DATA, RISK
- **Thread 내 역할:** bit마다 signal ACK를 기다리는 stop-and-wait를 도입하고 ACK-before-wait race를 막습니다.

#### 원문에서 확정된 맥락

client는 ACK signal을 먼저 block하고 data signal을 보낸 뒤 `sigsuspend`로 기다립니다. server가 한 bit 처리 뒤 ACK를 보내며 client는 ACK 전에는 다음 bit로 진행하지 않습니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] ACK handler가 `volatile sig_atomic_t` flag를 변경
- [x] `sigprocmask(SIG_BLOCK)`가 data `kill`보다 먼저 실행
- [x] `sigsuspend` mask에서 ACK만 임시 unblock
- [x] server bit mutation 뒤 sender PID로 ACK 전송
- [x] ACK success 뒤에만 bit cursor 감소

#### 비교 기준

`89637d63b56f`과 비교하면 다음 bit 전진 조건이 fixed delay 완료에서 ACK flag 관측으로 바뀌고 NUL terminator 전송도 추가됩니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: `89637d63b56f`의 `send_bit`은 `kill` 뒤 짧은 delay만 기다렸고 server 처리 완료를 관측하는 state가 없었습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: delay는 완료 사실이 아니며, ACK를 block하지 않고 먼저 보내면 server ACK가 `sigsuspend` 진입 전에 도착해 영원히 기다리는 lost-wakeup race도 생깁니다.
- 변경된 decision과 state mutation 순서: client에 `volatile sig_atomic_t` ACK flag와 handler를 두고 ACK signal을 block한 상태에서 data signal을 전송하도록 순서를 고정했습니다. server는 한 bit의 state mutation 뒤 sender PID로 ACK를 보냅니다. ACK block → `g_acknowledged = 0` → data `kill` → ACK만 unblocked한 mask로 `sigsuspend` 반복 → handler flag 관측 → `send_bit` success → `send_byte`가 bit index 감소 순서입니다.
- 정상 경로와 failure 경로가 갈라지는 조건: `sigprocmask` 또는 `kill`이 실패하면 전송을 중단합니다. ACK가 없으면 무기한 wait하며, ACK signal에는 bit/session identity가 없습니다.
- 후속 commit이 강화하거나 교체하는 부분: `765efe7b75c9`가 timeout state를 추가하고, `ebed06775b92` 이후 datagram token이 generic signal ACK를 대체합니다.

#### Fix 연결 기록

| 단계 | Source에서 확정된 내용 | 해당 SHA의 코드 근거 |
| --- | --- | --- |
| 기존 가정 | short delay면 server가 이전 signal을 처리했을 것이다. | `89637d63b56f: send_bit`의 `kill` 뒤 `usleep(150)` |
| 실제 failure 또는 위험 | standard signal coalescing과 ACK-before-wait lost wakeup이 남습니다. | 직전에는 receiver state를 확인하는 flag/mask가 없었습니다. |
| root cause | 완료 조건이 elapsed time이고 ACK 도착 전에 block하지 않았습니다. | 새 diff가 ACK block을 `kill` 앞에 둔 이유입니다. |
| 수정 invariant/decision | ACK를 먼저 block하고 한 bit를 보낸 뒤 handler flag를 확인해야 다음 bit로 진행합니다. | `src/client.c: send_bit`, server bit handler의 ACK `kill` |

- 변경 전 failure를 재현하거나 추론할 수 있는 입력/상태: 직전 상태와 해당 분기를 직접 비교했습니다.
- root cause가 드러나는 field 또는 call order: ACK block → `g_acknowledged = 0` → data `kill` → ACK만 unblocked한 mask로 `sigsuspend` 반복 → handler flag 관측 → `send_bit` success → `send_byte`가 bit index 감소 순서입니다.
- 수정된 invariant를 고정하는 후속 regression test: 이 단계 전용 test commit은 Thread에 없습니다. 후속 datagram validation은 Thread 6에서 검증됩니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] one-bit stop-and-wait
- [x] block-before-send ordering
- [x] payload 뒤 NUL frame 전송

**아직 보장하지 않는 것**

- [x] strong response correlation
- [x] bounded wait
- [x] final datagram architecture

#### 코드 증거 기록

- 파일 경로: `src/client.c`, `src/server.c`, `include/minitalk.h`
- symbol 또는 함수: `handle_ack`, `send_bit`, `send_byte`, `handle_bit`
- 확인한 state fields: `g_acknowledged`, `current_byte`, `received_bits`
- caller → callee: client `send_byte` → `send_bit`; server signal handler → bit mutation → `kill(sender, MT_ACK_SIGNAL)`
- 핵심 branch 또는 mutation 순서: ACK block → `g_acknowledged = 0` → data `kill` → ACK만 unblocked한 mask로 `sigsuspend` 반복 → handler flag 관측 → `send_bit` success → `send_byte`가 bit index 감소 순서입니다.
- parent 또는 이전 관련 SHA와의 diff 요약: fixed delay-only path가 signal ACK stop-and-wait로 교체되고 terminator byte가 전송됩니다.
- 삽입할 최소 코드 조각과 선택 이유: 표와 호출 순서만으로 invariant가 충분히 드러나므로 코드 덤프를 추가하지 않았습니다.
- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`765efe7b75c9`에서 wait에 finite deadline이 추가됩니다.
### 3. `765efe7b75c9` — feat(client): ACK 대기 시간 초과 처리

- **Importance:** A
- **Tags:** RISK, PROCESS_LIFECYCLE, PRACTICAL
- **Thread 내 역할:** ACK wait를 alarm 기반 timeout으로 제한하고 timeout과 다른 send failure를 구분합니다.

#### 원문에서 확정된 맥락

process existence는 protocol participation이 아닙니다. ACK가 없으면 current transmission을 실패로 끝내고 next bit로 진행하지 않습니다. timeout은 retransmission이나 delivery guarantee가 아닙니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] ACK와 timeout handler state 구분
- [x] alarm 시작 → wait → alarm 취소 순서
- [x] `kill` failure와 timeout status 분리
- [x] timeout에서 bit cursor 유지
- [x] `MT_ACK_TIMEOUT_SECONDS` 1초 정의

#### 비교 기준

`78de95b3cacb`의 단일 ACK flag loop에 `g_timed_out`, `SIGALRM`, status 구분, alarm 취소가 추가됩니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: `78de95b3cacb`의 client는 target process가 ACK를 보내지 않아도 `sigsuspend` loop를 끝낼 수 없었습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: PID가 존재하거나 `kill`이 성공해도 상대가 minitalk server로 동작한다는 뜻은 아니므로 unbounded suspension이 가능합니다.
- 변경된 decision과 state mutation 순서: ACK와 별도의 timeout flag를 추가하고 `SIGALRM`을 같은 wait loop의 종료 조건으로 사용했습니다. send error와 timeout을 다른 status로 반환합니다. flags reset → data `kill` → `alarm(MT_ACK_TIMEOUT_SECONDS)` → ACK/timeout 중 하나가 될 때까지 `sigsuspend` → `alarm(0)` → ACK면 success, timeout이면 `MT_SEND_TIMEOUT`입니다.
- 정상 경로와 failure 경로가 갈라지는 조건: `kill` failure는 send error, timeout flag는 timeout diagnostic으로 갈라집니다. timeout branch는 `send_byte`에 실패를 반환하므로 현재 bit index가 유지됩니다. `sigsuspend`의 wakeup error는 이 SHA에서 별도 영구 오류로 분류하지 않습니다.
- 후속 commit이 강화하거나 교체하는 부분: `342aea9ce9a8`이 timeout을 3초로 늘리고 ACK 뒤 pacing을 둡니다. 이후 datagram wait는 monotonic absolute deadline으로 교체됩니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] unresponsive target에 대한 bounded liveness failure
- [x] timeout 뒤 transmission 중단

**아직 보장하지 않는 것**

- [x] lost-bit recovery
- [x] retransmission
- [x] ACK loss deduplication
- [x] monotonic clock deadline

#### 코드 증거 기록

- 파일 경로: `src/client.c`, `include/minitalk.h`
- symbol 또는 함수: `handle_response`, `send_bit`, `send_byte`
- 확인한 state fields: `g_acknowledged`, `g_timed_out`
- caller → callee: `send_byte` → `send_bit` → `kill`/`alarm`/`sigsuspend`
- 핵심 branch 또는 mutation 순서: flags reset → data `kill` → `alarm(MT_ACK_TIMEOUT_SECONDS)` → ACK/timeout 중 하나가 될 때까지 `sigsuspend` → `alarm(0)` → ACK면 success, timeout이면 `MT_SEND_TIMEOUT`입니다.
- parent 또는 이전 관련 SHA와의 diff 요약: unbounded ACK wait가 alarm으로 제한되고 caller가 send error와 timeout을 다른 diagnostic으로 출력할 수 있게 됩니다.
- 삽입할 최소 코드 조각과 선택 이유: 표와 호출 순서만으로 invariant가 충분히 드러나므로 코드 덤프를 추가하지 않았습니다.
- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`342aea9ce9a8`에서 timeout과 post-ACK pacing이 조정됩니다.
### 4. `342aea9ce9a8` — fix(client): ACK 이후 시그널 전송 간격 안정화

- **Importance:** B
- **Tags:** SIGNAL_DATA, PRACTICAL
- **Thread 내 역할:** signal ACK 뒤 short inter-signal gap을 유지하고 acknowledgement deadline을 늘립니다.

#### 원문에서 확정된 맥락

ACK가 serialization 조건이고 delay는 scheduling sensitivity를 낮추는 workaround입니다. timeout과 pacing constant는 서로 다른 역할입니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] ACK success branch 뒤 gap 호출
- [x] timeout 3초와 pacing 500µs의 별도 정의
- [x] delay failure의 send error 전달
- [x] ACK 전이 아니라 뒤에만 pacing 적용

#### 비교 기준

`765efe7b75c9`에서 timeout 값과 ACK-success tail만 바뀌며 protocol identity는 그대로 generic signal ACK입니다.

#### B-level 구현 역할 기록

- Thread 전체에서 이 commit이 연결하는 앞/뒤 단계: alarm 기반 one-bit stop-and-wait는 있었지만 ACK 직후 다음 signal을 즉시 보내는 초기 signal-only 구현이 host scheduling에 민감했습니다. → `4f17de94e025`가 interrupted sleep의 remainder를 보존하고 `1487a861046e`가 datagram ACK 이후 이 workaround 자체를 삭제합니다.
- 실제로 추가·수정된 핵심 symbol과 state: timeout을 1초에서 3초로 늘리고 `MT_SIGNAL_GAP_US` 500µs를 ACK success branch 뒤에 추가했습니다.
- 이 commit만으로 충분하지 않아 후속 commit을 확인해야 하는 부분: signal ACK는 causal condition이지만 당시 handler cycle과 scheduling variation에 대한 구현상 여유가 없었습니다.

#### Fix 연결 기록

| 단계 | Source에서 확정된 내용 | 해당 SHA의 코드 근거 |
| --- | --- | --- |
| 기존 가정 | ACK만 받으면 다음 signal을 즉시 보내도 scheduling variation과 무관합니다. | 직전 success branch는 ACK flag 확인 즉시 반환했습니다. |
| 실제 failure 또는 위험 | early signal-only response path가 handler-cycle timing에 민감할 수 있습니다. | 당시 ACK와 data가 모두 standard signal handler path를 공유했습니다. |
| root cause | causal ACK와 구현상 pacing의 역할을 분리하지 않았습니다. | 새 상수는 timeout과 별도로 정의되고 ACK 뒤에만 사용됩니다. |
| 수정 invariant/decision | ACK를 ordering 조건으로 유지하되 success path에 500µs gap을 둡니다. | `src/client.c: send_bit` success tail |

- 변경 전 failure를 재현하거나 추론할 수 있는 입력/상태: 직전 상태와 해당 분기를 직접 비교했습니다.
- root cause가 드러나는 field 또는 call order: matching signal ACK 확인 → `usleep(MT_SIGNAL_GAP_US)` → success 반환 → 다음 bit입니다. timeout timer와 pacing delay는 별도 상수입니다.
- 수정된 invariant를 고정하는 후속 regression test: 전용 test는 없으며 `4f17de94e025`가 EINTR progress를 수정하고 `1487a861046e`가 최종 제거합니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] 초기 signal-only protocol의 scheduling 안정화

**아직 보장하지 않는 것**

- [x] sequence identity
- [x] delay 자체의 correctness guarantee

#### 코드 증거 기록

- 파일 경로: `src/client.c`, `include/minitalk.h`
- symbol 또는 함수: `send_bit`
- 확인한 state fields: `g_acknowledged`, `g_timed_out`
- caller → callee: `send_bit` ACK wait → `usleep` → caller success
- 핵심 branch 또는 mutation 순서: matching signal ACK 확인 → `usleep(MT_SIGNAL_GAP_US)` → success 반환 → 다음 bit입니다. timeout timer와 pacing delay는 별도 상수입니다.
- parent 또는 이전 관련 SHA와의 diff 요약: deadline을 늘리고 성공 path에만 explicit inter-signal delay를 추가했습니다.
- 삽입할 최소 코드 조각과 선택 이유: 표와 호출 순서만으로 invariant가 충분히 드러나므로 코드 덤프를 추가하지 않았습니다.
- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`4f17de94e025`에서 interrupted sleep의 remainder를 보존합니다.
### 5. `4f17de94e025` — fix(client): 인터럽트 뒤 남은 전송 간격 유지

- **Importance:** B
- **Tags:** SIGNAL_DATA, PRACTICAL
- **Thread 내 역할:** `nanosleep`이 `EINTR`로 중단되면 returned remainder로 같은 logical gap을 이어갑니다.

#### 원문에서 확정된 맥락

partial sleep을 completed interval로 취급하지 않으며 original full duration을 반복 요청하지도 않습니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] `nanosleep(&remaining, &remaining)` retry loop
- [x] `errno == EINTR`만 반복
- [x] kernel remainder가 다음 request가 되는 alias
- [x] non-EINTR error를 별도 반환하지 않는 실제 한계

#### 비교 기준

`342aea9ce9a8`의 single `usleep`을 remainder-aware `nanosleep` loop로 교체한 부분만 추적했습니다.

#### B-level 구현 역할 기록

- Thread 전체에서 이 commit이 연결하는 앞/뒤 단계: `342aea9ce9a8`은 ACK 뒤 `usleep` 한 번으로 gap을 요청했습니다. → `1487a861046e`에서 correlated datagram ACK가 ordering 근거가 된 뒤 helper와 gap 상수가 제거됩니다.
- 실제로 추가·수정된 핵심 symbol과 state: gap을 5ms `timespec`으로 바꾸고 `nanosleep(&remaining, &remaining)`을 `errno == EINTR`인 동안 반복하는 helper를 추가했습니다.
- 이 commit만으로 충분하지 않아 후속 commit을 확인해야 하는 부분: unrelated signal이 sleep을 중단하면 실제 gap이 짧아지고, 처음 duration을 반복하면 이미 경과한 시간까지 중복 대기합니다.

#### Fix 연결 기록

| 단계 | Source에서 확정된 내용 | 해당 SHA의 코드 근거 |
| --- | --- | --- |
| 기존 가정 | 한 번의 sleep 호출이 requested interval 전체를 보장합니다. | 직전 ACK-success branch의 단일 `usleep` |
| 실제 failure 또는 위험 | `EINTR`가 gap을 조기에 끝내 timing workaround를 약화합니다. | signal을 사용하는 process이므로 unrelated delivery가 sleep을 중단할 수 있습니다. |
| root cause | interrupted sleep을 remaining duration을 가진 partial operation으로 다루지 않았습니다. | `nanosleep`의 두 번째 인자를 같은 `remaining` object로 사용합니다. |
| 수정 invariant/decision | `EINTR`이면 remainder로 같은 logical interval을 이어갑니다. | `src/client.c: wait_signal_gap` loop |

- 변경 전 failure를 재현하거나 추론할 수 있는 입력/상태: 직전 상태와 해당 분기를 직접 비교했습니다.
- root cause가 드러나는 field 또는 call order: ACK success → `wait_signal_gap` → remaining timespec 초기화 → interrupted call마다 kernel이 돌려준 remainder로 재호출 → success 또는 non-EINTR 종료입니다.
- 수정된 invariant를 고정하는 후속 regression test: 전용 regression test는 없고 최종적으로 `1487a861046e`가 이 timing path를 삭제합니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] EINTR 아래 provisional pacing interval의 남은 시간 처리
- [x] partial sleep progress 보존

**아직 보장하지 않는 것**

- [x] timing-independent ordering
- [x] final response correlation
- [x] non-EINTR sleep error propagation

#### 코드 증거 기록

- 파일 경로: `src/client.c`, `include/minitalk.h`
- symbol 또는 함수: `wait_signal_gap`, `send_bit`
- 확인한 state fields: `remaining timespec`
- caller → callee: `send_bit` → `wait_signal_gap` → `nanosleep`
- 핵심 branch 또는 mutation 순서: ACK success → `wait_signal_gap` → remaining timespec 초기화 → interrupted call마다 kernel이 돌려준 remainder로 재호출 → success 또는 non-EINTR 종료입니다.
- parent 또는 이전 관련 SHA와의 diff 요약: single `usleep`이 remainder-aware `nanosleep` loop로 바뀌고 gap이 5ms로 조정됐습니다.
- 삽입할 최소 코드 조각과 선택 이유: 표와 호출 순서만으로 invariant가 충분히 드러나므로 코드 덤프를 추가하지 않았습니다.
- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`1487a861046e`에서 이 delay 자체가 제거됩니다.
### 6. `ebed06775b92` — feat(protocol): 응답 메시지 wire 형식 정의

- **Importance:** A
- **Tags:** ARCH, RESPONSE
- **Thread 내 역할:** `ACQUIRE`, `READY`, `ACK`를 표현하는 request/response records와 identity fields를 정의합니다.

#### 원문에서 확정된 맥락

magic, kind, PID, nonce/token, status가 signal data channel과 별도의 control-plane identity를 제공합니다. records는 host-local in-memory ABI이며 portable serialized network protocol이 아닙니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] `t_mt_request`/`t_mt_response` field order와 fixed-width types
- [x] magic와 ACQUIRE/READY/ACK kind constants
- [x] client/server PID, nonce/token, status 배치
- [x] `sizeof(record)`를 wire length로 사용할 전제
- [x] byte-order/alignment serialization 부재

#### 비교 기준

`4f17de94e025`까지의 signal ACK는 identity payload가 없었고, 새 records는 acquisition과 bit transition을 구분할 field를 제공합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: generic ACK signal은 sender/transition별 payload를 담지 못해 어느 acquisition 또는 어느 bit에 대한 응답인지 표현할 수 없었습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: stale ACK, 다른 server의 응답, session READY와 bit ACK를 같은 signal만으로 구별할 수 없습니다.
- 변경된 decision과 state mutation 순서: shared header에 fixed-width magic/kind/token/status와 `pid_t` identity를 가진 `t_mt_request`, `t_mt_response`를 정의했습니다. schema만 정의한 commit입니다. 이후 caller가 `sizeof(struct)`를 datagram length로 사용하며 request nonce는 READY token으로, server sequence는 ACK token으로 연결됩니다.
- 정상 경로와 failure 경로가 갈라지는 조건: 이 SHA 자체에는 send/receive acceptance branch가 없습니다. padding, byte order, ABI version을 직렬화하지 않아 같은 host/ABI 범위에 제한됩니다.
- 후속 commit이 강화하거나 교체하는 부분: `4234233ebd30`이 server sequence ACK work를 만들고 `f8e8444c5ded`/`d3eacbbfeadc`가 client acceptance predicate를 구현합니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] correlated control message를 표현할 schema
- [x] session response와 bit response 구분 능력

**아직 보장하지 않는 것**

- [x] runtime ACQUIRE validation
- [x] client acceptance predicate
- [x] portable ABI/byte order/versioning

#### 코드 증거 기록

- 파일 경로: `include/minitalk.h`
- symbol 또는 함수: `t_mt_request`, `t_mt_response`
- 확인한 state fields: `magic`, `kind`, `nonce`, `token`, `status`, `client_pid`, `server_pid`
- caller → callee: shared record definition → 후속 client/server send/receive caller
- 핵심 branch 또는 mutation 순서: schema만 정의한 commit입니다. 이후 caller가 `sizeof(struct)`를 datagram length로 사용하며 request nonce는 READY token으로, server sequence는 ACK token으로 연결됩니다.
- parent 또는 이전 관련 SHA와의 diff 요약: signal-only constants 옆에 host-local datagram record schema와 kind/status constants가 추가됐습니다.
- 삽입한 최소 코드 조각과 선택 이유: `ebed06775b92`, `include/minitalk.h`: acquisition identity를 만드는 field와 raw ABI 범위를 보여 주는 최소 조각입니다.

```c
typedef struct s_mt_request
{
	uint32_t magic;
	uint32_t kind;
	uint32_t nonce;
	pid_t   client_pid;
} t_mt_request;
```

- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`4234233ebd30`에서 sequence가 actual ACK work에 연결됩니다.
### 7. `4234233ebd30` — feat(protocol): 비트 ACK를 sequence 응답으로 큐잉

- **Importance:** S
- **Tags:** ARCH, RESPONSE, CORE
- **Thread 내 역할:** accepted bit에 sequence를 부여하고 datagram ACK send work를 pipe로 queue해 direct signal response에서 분리합니다.

#### 원문에서 확정된 맥락

이 SHA에서는 handler가 bit transition을 여전히 수행하지만 `sendto`는 normal context로 미뤄집니다. queue write failure는 overflow flag로 드러냅니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] server sequence field의 초기화/reset/increment
- [x] ACK work record의 client PID/kind/token/status
- [x] bit mutation 뒤 response work 생성 순서
- [x] handler의 full-size pipe write와 overflow flag
- [x] pipe consumer의 `sendto` 호출
- [x] legacy signal ACK와 datagram ACK의 공존
- [x] NUL reset에서 sequence가 0으로 돌아가는 경로

#### 비교 기준

`ebed06775b92`의 static schema가 `g_sequence`와 response-work pipe에 연결됐습니다. final self-pipe와 달리 이 SHA의 pipe payload는 signal fact가 아니라 이미 처리된 bit의 ACK work입니다.

#### S-level 재구성

- 이 commit 직전의 관련 state와 caller/callee: server는 bit state를 signal handler에서 직접 바꾸고 generic ACK/NACK signal을 보냈습니다. `ebed06775b92`의 record schema는 아직 runtime sequence와 연결되지 않았습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: generic ACK에는 bit identity가 없고 `sendto`를 signal handler에서 수행할 수 없습니다. 다만 state transition 자체도 handler에 남아 있어 완전한 async boundary는 아직 아닙니다.
- 변경된 decision과 state mutation 순서: session에 `g_sequence`를 추가하고 accepted bit마다 current token을 캡처한 `t_response_request`를 pipe에 씁니다. event loop가 pipe record를 읽어 Unix datagram `sendto`를 수행합니다. handler가 sender authorization → current sequence 캡처 → byte shift/bit count → 완성 byte 출력 또는 NUL reset → legacy signal ACK → active session이면 sequence 증가 → response work pipe write를 수행합니다. normal loop는 record를 읽어 `send_response`를 호출합니다.
- 정상 경로와 failure 경로가 갈라지는 조건: pipe write가 full record가 아니면 `g_response_overflow`를 세웁니다. 이때 bit/output state는 이미 바뀌었을 수 있으므로 queue loss를 복구하지 못합니다. 이 SHA의 `respond_to_bit`은 datagram send failure를 authoritative session error로 완전히 연결하지 않았습니다.
- 후속 commit이 강화하거나 교체하는 부분: `d3eacbbfeadc`가 exact sequence ACK를 client success 조건으로 삼고 `aeb1b00867f4`가 legacy signal path를 제거합니다. `22363f83ff25`에서는 bit mutation 자체도 self-pipe consumer로 이동합니다.

| 추적 항목 | 학습자 기록 | 코드 근거 |
| --- | --- | --- |
| 직전 architecture/state | handler가 bit state와 generic signal ACK를 직접 처리 | parent `src/server.c: handle_bit` |
| 해결하려던 핵심 문제 | ACK identity와 async-unsafe socket send 분리 | `g_sequence`, `t_response_request`, response pipe |
| 실패 가능한 interleaving 또는 partial failure | state mutation 뒤 pipe enqueue 실패로 응답 work 손실 | `g_response_overflow` set 시점 |
| 선택한 decision | bit마다 token을 캡처하고 datagram send를 loop로 위임 | `queue_response` → `respond_to_bit` |
| ownership/lifecycle/state transition | owner session이 sequence를 소유하며 NUL reset 시 함께 초기화 | `reset_session`, `g_sequence` |
| 후속 fix 또는 regression evidence | client correlation, legacy 제거, self-pipe event-loop 전환 | `d3eacbbfeadc`, `aeb1b00867f4`, `22363f83ff25` |

#### 보장 범위

**이 commit이 보장하는 것**

- [x] accepted bit마다 distinct sequence identity 부여
- [x] socket send를 normal context로 queue
- [x] full-size pipe write 실패 감지

**아직 보장하지 않는 것**

- [x] final async-signal-safe handler
- [x] single authoritative response path
- [x] queue-loss recovery
- [x] output-before-ACK commit

#### 코드 증거 기록

- 파일 경로: `src/server.c`, `src/client.c`, `include/minitalk.h`
- symbol 또는 함수: `handle_bit`, `queue_response`, `respond_to_bit`, `send_response`, `reset_session`
- 확인한 state fields: `g_client_pid`, `g_current_byte`, `g_received_bits`, `g_line_started`, `g_sequence`, `g_response_overflow`
- caller → callee: signal handler `handle_bit` → `queue_response` → pipe; event loop → `respond_to_bit` → `send_response` → `sendto`
- 핵심 branch 또는 mutation 순서: handler가 sender authorization → current sequence 캡처 → byte shift/bit count → 완성 byte 출력 또는 NUL reset → legacy signal ACK → active session이면 sequence 증가 → response work pipe write를 수행합니다. normal loop는 record를 읽어 `send_response`를 호출합니다.
- parent 또는 이전 관련 SHA와의 diff 요약: schema가 server sequence state와 queued ACK work로 연결됐지만 handler가 authorization/assembly/output/legacy ACK를 계속 담당합니다.
- 삽입한 최소 코드 조각과 선택 이유: `4234233ebd30`, `src/server.c: queue_response` 계열: token을 가진 ACK work와 full-size write 실패 정책을 함께 보여 줍니다.

```c
request.client_pid = g_client_pid;
request.kind = MT_RESPONSE_ACK;
request.token = sequence;
request.status = MT_RESPONSE_OK;
if (write(g_response_pipe[1], &request, sizeof(request)) != sizeof(request))
	g_response_overflow = 1;
```

- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`d3eacbbfeadc`에서 client가 matching sequence response만 수락합니다.
### 8. `d3eacbbfeadc` — feat(client): 비트 ACK를 sequence로 상관 검증

- **Importance:** A
- **Tags:** RESPONSE, RISK
- **Thread 내 역할:** client가 expected server source와 exact current sequence의 datagram ACK만 bit success로 수락합니다.

#### 원문에서 확정된 맥락

signal 전 server endpoint를 검증하고 monotonic deadline을 설정합니다. size, source, PID, kind, token, magic, status가 모두 맞아야 sequence가 증가합니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] signal 전 expected server socket validation
- [x] bit별 absolute `CLOCK_MONOTONIC` deadline
- [x] `kill` 뒤 response receive loop
- [x] size/source/PID/magic/kind/token/status conjunction
- [x] invalid candidate가 deadline을 갱신하지 않는 branch
- [x] matching ACK 뒤에만 sequence/cursor 증가

#### 비교 기준

`4234233ebd30`의 server token initial/increment rule과 일치시키고, signal ACK가 client success 판단에서 빠진 diff를 확인했습니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: server는 sequence datagram ACK를 만들지만 client send path는 여전히 generic signal ACK를 먼저 기다리고 datagram response를 보조적으로 사용했습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: source나 token이 다른 stale/forged datagram이 도착했다는 사실만으로 current bit를 완료하면 cursor가 잘못 전진합니다.
- 변경된 decision과 state mutation 순서: `send_bit`이 expected server endpoint와 current sequence를 고정하고 signal을 보낸 뒤 one absolute monotonic deadline 안에서 exact ACK predicate를 만족하는 datagram만 기다리도록 했습니다. server endpoint validation → absolute deadline 생성 → data `kill` → response receive loop → exact size/source/magic/server PID/ACK kind/current token/OK status 확인 → success 반환 → caller가 sequence와 bit cursor 증가입니다.
- 정상 경로와 failure 경로가 갈라지는 조건: invalid candidate는 버리고 같은 deadline으로 계속 기다립니다. timeout/send/receive permanent error는 current sequence와 bit cursor를 유지한 채 실패합니다.
- 후속 commit이 강화하거나 교체하는 부분: `aeb1b00867f4`가 남은 signal ACK handler/mask를 제거하고 `b361ef9745ff`/`1ed2acbaa353`가 forged·oversized·flood input을 검증합니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] per-bit response correlation
- [x] stale/forged frame이 cursor를 전진시키지 않음
- [x] bit wait의 finite deadline

**아직 보장하지 않는 것**

- [x] output-before-ACK commit
- [x] legacy handler/mask 완전 제거
- [x] invalid-flood regression evidence

#### 코드 증거 기록

- 파일 경로: `src/client.c`, `src/response_channel.c`, `include/minitalk.h`
- symbol 또는 함수: `send_bit`, `wait_for_response`, `read_response`, `response_matches`
- 확인한 state fields: `sequence`, `deadline`, `expected server path`
- caller → callee: `send_byte` → `send_bit` → `kill` → `wait_for_response`/`recvfrom`
- 핵심 branch 또는 mutation 순서: server endpoint validation → absolute deadline 생성 → data `kill` → response receive loop → exact size/source/magic/server PID/ACK kind/current token/OK status 확인 → success 반환 → caller가 sequence와 bit cursor 증가입니다.
- parent 또는 이전 관련 SHA와의 diff 요약: signal ACK wait를 client progress condition에서 제거하고 sequence datagram response predicate를 authoritative success로 사용합니다.
- 삽입할 최소 코드 조각과 선택 이유: 표와 호출 순서만으로 invariant가 충분히 드러나므로 코드 덤프를 추가하지 않았습니다.
- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`aeb1b00867f4`에서 generic signal response와 implicit first-bit ownership을 삭제합니다.
### 9. `aeb1b00867f4` — refactor(protocol): 이전 signal ACK 경로 제거

- **Importance:** A
- **Tags:** ARCH, RESPONSE, REFACTOR
- **Thread 내 역할:** obsolete ACK/NACK signal machinery를 client/server/shared/test sender에서 제거하고 datagram response만 남깁니다.

#### 원문에서 확정된 맥락

handlers, alarm flags, wait masks, signal responses가 사라지며 server는 explicit acquisition 없는 sender signal로 owner를 지정하지 않습니다. owner에게 response send가 실패하면 session을 reset합니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] ACK/NACK constants와 handler registration 삭제
- [x] client signal flags/alarm/mask/`sigsuspend` 제거
- [x] server first-bit owner assignment branch 제거
- [x] unauthorized sender signal ignore
- [x] bit success의 단일 datagram path
- [x] response send failure 뒤 session reset

#### 비교 기준

`d3eacbbfeadc` tree의 ACK/NACK macros, signal handlers, alarm/mask state, server first-bit assignment branch를 모두 찾아 삭제 후 남는 datagram path를 확인했습니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: `d3eacbbfeadc`에서 datagram ACK가 progress condition이 됐지만 signal ACK/NACK constants, handlers, wait masks와 server first-bit capture branch가 남아 있었습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: 두 success mechanism은 서로 다른 결과를 낼 수 있고, data signal의 implicit owner capture는 ACQUIRE validation을 우회해 ownership authority가 둘이 됩니다.
- 변경된 decision과 state mutation 순서: client와 test sender의 signal response machinery를 삭제하고 server에서 ACK/NACK `kill` 및 `g_client_pid == 0` first-bit assignment를 제거했습니다. ACQUIRE가 owner를 정한 뒤에만 owner PID의 data event를 처리합니다. bit/output 후 sequence datagram ACK send가 유일한 success path이며 owner에게 response send가 실패하면 `reset_session(1)`을 호출합니다.
- 정상 경로와 failure 경로가 갈라지는 조건: owner가 0이거나 sender가 owner와 다르면 data signal을 무시합니다. datagram send failure는 current session reset/error path로 이어지며 generic signal 성공으로 보완하지 않습니다.
- 후속 commit이 강화하거나 교체하는 부분: `1487a861046e`가 마지막 fixed gap을 제거하고 `db2004556d8b`가 output-before-ACK ordering을 보강합니다.

#### Fix 연결 기록

| 단계 | Source에서 확정된 내용 | 해당 SHA의 코드 근거 |
| --- | --- | --- |
| 기존 가정 | signal ACK와 datagram ACK가 함께 있어도 같은 success를 나타냅니다. | 직전 client/server tree에 두 response path가 동시에 존재했습니다. |
| 실제 failure 또는 위험 | 두 path가 다른 결과를 내고 implicit first-bit path가 acquisition을 우회합니다. | server의 `g_client_pid == 0` branch가 unaquired signal sender를 owner로 지정했습니다. |
| root cause | protocol success와 ownership의 authoritative path가 둘 이상이었습니다. | signal handler/mask 및 first-bit assignment가 datagram path와 병존했습니다. |
| 수정 invariant/decision | success는 sequence datagram ACK만, owner는 validated ACQUIRE 뒤에만 존재합니다. | signal response code 삭제와 unauthorized sender early return |

- 변경 전 failure를 재현하거나 추론할 수 있는 입력/상태: 직전 상태와 해당 분기를 직접 비교했습니다.
- root cause가 드러나는 field 또는 call order: ACQUIRE가 owner를 정한 뒤에만 owner PID의 data event를 처리합니다. bit/output 후 sequence datagram ACK send가 유일한 success path이며 owner에게 response send가 실패하면 `reset_session(1)`을 호출합니다.
- 수정된 invariant를 고정하는 후속 regression test: `b361ef9745ff`가 response identity를, `e56e8cc87315`가 idle reservation exclusivity를 검증합니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] single source of truth for ACK
- [x] ownership은 ACQUIRE 뒤에만 시작
- [x] unauthorized data signal이 state를 바꾸지 않음

**아직 보장하지 않는 것**

- [x] output commit ordering
- [x] fixed delay 제거
- [x] same-UID authentication

#### 코드 증거 기록

- 파일 경로: `src/client.c`, `src/server.c`, `tests/session_sender.c`, `include/minitalk.h`
- symbol 또는 함수: `send_bit`, `process_bit`, `send_response`, `reset_session`
- 확인한 state fields: `g_client_pid`, `sequence`
- caller → callee: validated ACQUIRE → server owner state; client bit `kill` → server process → datagram ACK → client exact wait
- 핵심 branch 또는 mutation 순서: ACQUIRE가 owner를 정한 뒤에만 owner PID의 data event를 처리합니다. bit/output 후 sequence datagram ACK send가 유일한 success path이며 owner에게 response send가 실패하면 `reset_session(1)`을 호출합니다.
- parent 또는 이전 관련 SHA와의 diff 요약: parallel signal response machinery와 implicit data-based ownership이 삭제돼 datagram ACK와 ACQUIRE만 authoritative path로 남습니다.
- 삽입할 최소 코드 조각과 선택 이유: 표와 호출 순서만으로 invariant가 충분히 드러나므로 코드 덤프를 추가하지 않았습니다.
- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`1487a861046e`에서 remaining timing workaround가 제거됩니다.
### 10. `1487a861046e` — perf(protocol): 검증된 ACK 뒤 고정 지연 제거

- **Importance:** A
- **Tags:** PERF, RESPONSE
- **Thread 내 역할:** matching sequence ACK 뒤 fixed sleep을 production client와 session sender에서 제거합니다.

#### 원문에서 확정된 맥락

client는 여전히 one bit를 보내고 exact ACK를 기다린 뒤 다음 bit로 진행합니다. delay 제거는 ordering이 time이 아니라 correlation에 의해 보장됨을 보여 줍니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] production `wait_signal_gap` helper/constant 삭제
- [x] session sender의 동일 delay 삭제
- [x] send와 matching wait가 한 iteration에서 직렬화
- [x] ACK 전 cursor/sequence 불변
- [x] timeout과 success branch 유지

#### 비교 기준

`4f17de94e025`의 remainder-aware gap implementation과 `aeb1b00867f4`의 datagram-only path를 함께 비교해 sleep만 제거됐음을 확인했습니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: datagram ACK가 progress condition이 된 뒤에도 production client와 test session sender는 ACK success 뒤 5ms gap을 유지했습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: validated ACK가 server의 accepted bit를 이미 식별하므로 고정 gap은 correctness에 기여하지 않고 bit마다 latency만 누적합니다.
- 변경된 decision과 state mutation 순서: `MT_SIGNAL_GAP` 상수와 sleep helper/call을 client와 session sender에서 삭제했습니다. current bit signal 전송 → exact current sequence ACK wait → success 반환 → caller가 sequence/bit cursor 증가 → 즉시 다음 bit입니다.
- 정상 경로와 failure 경로가 갈라지는 조건: ACK 전에 cursor나 sequence는 증가하지 않습니다. send/receive/timeout failure는 current bit에서 전체 transmission을 중단합니다.
- 후속 commit이 강화하거나 교체하는 부분: 이 commit이 Thread final state입니다. 후속 output commit fix는 ACK를 보내기 전 server stdout 성공 조건을 강화합니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] sleep 없는 one-bit-in-flight ordering
- [x] bit당 unnecessary latency 제거

**아직 보장하지 않는 것**

- [x] multiple bits in flight
- [x] retransmission
- [x] exactly-once transaction
- [x] ACK loss recovery

#### 코드 증거 기록

- 파일 경로: `src/client.c`, `tests/session_sender.c`, `include/minitalk.h`
- symbol 또는 함수: `send_bit`, `send_byte`
- 확인한 state fields: `sequence`, `bit index`
- caller → callee: `send_byte` → `send_bit` → exact response wait → caller cursor advance
- 핵심 branch 또는 mutation 순서: current bit signal 전송 → exact current sequence ACK wait → success 반환 → caller가 sequence/bit cursor 증가 → 즉시 다음 bit입니다.
- parent 또는 이전 관련 SHA와의 diff 요약: pacing helper와 상수만 제거되고 send→validate→advance stop-and-wait 순서는 유지됩니다.
- 삽입할 최소 코드 조각과 선택 이유: 표와 호출 순서만으로 invariant가 충분히 드러나므로 코드 덤프를 추가하지 않았습니다.
- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

이 commit이 Thread final state입니다. elapsed time은 success condition으로 남지 않습니다.

## 6. Invariant ledger

### Source에서 확정된 핵심 invariant

- 논리적으로 한 번에 하나의 data bit만 전송 중입니다.
- client는 expected server endpoint에서 온 exact sequence ACK를 수락한 뒤에만 다음 bit로 진행합니다.
- stale, forged, malformed, uncorrelated response는 transition을 완료하지 않습니다.
- 무응답은 bounded failure로 끝나며 현재 bit를 성공 처리하지 않습니다.

### 시간에 따른 변화 기록

| Commit | Source에서 확정된 변화 | 실제 state/condition | code evidence | 상태: 도입·강화·부족·복구·검증 |
| --- | --- | --- | --- | --- |
| `89637d63b56f` | message byte를 MSB부터 signal bit로 직렬화하고 provisional fixed delay로 전송 속도를 낮춥니다. | bit index는 `send_bit`가 성공한 뒤에만 감소하지만 성공 조건은 `kill`과 fixed delay뿐입니다. | `src/client.c: send_byte`, `send_bit` | 도입·부족 |
| `78de95b3cacb` | bit마다 signal ACK를 기다리는 stop-and-wait를 도입하고 ACK-before-wait race를 막습니다. | `g_acknowledged`가 false인 동안 current bit가 outstanding이며 ACK 뒤에만 bit index가 감소합니다. | `src/client.c: send_bit`, `src/server.c` ACK branch | 강화·부족 |
| `765efe7b75c9` | ACK wait를 alarm 기반 timeout으로 제한하고 timeout과 다른 send failure를 구분합니다. | ACK 또는 timeout 중 하나가 outstanding bit의 종료 상태이며 timeout에는 cursor가 전진하지 않습니다. | `src/client.c: send_bit` alarm/flag branches | 강화 |
| `342aea9ce9a8` | signal ACK 뒤 short inter-signal gap을 유지하고 acknowledgement deadline을 늘립니다. | ACK는 전진 조건, 500µs gap은 ACK 뒤 scheduling workaround입니다. | `src/client.c: send_bit`, timeout/gap constants | 강화·임시 |
| `4f17de94e025` | `nanosleep`이 `EINTR`로 중단되면 returned remainder로 같은 logical gap을 이어갑니다. | pacing request는 EINTR 때 remaining time을 소유하지만 protocol success는 여전히 signal ACK입니다. | `src/client.c: wait_signal_gap` | 복구·임시 |
| `ebed06775b92` | `ACQUIRE`, `READY`, `ACK`를 표현하는 request/response records와 identity fields를 정의합니다. | wire schema가 nonce/token과 PID identity를 표현하지만 아직 runtime state를 전진시키지 않습니다. | `include/minitalk.h: t_mt_request`, `t_mt_response` | 도입 |
| `4234233ebd30` | accepted bit에 sequence를 부여하고 datagram ACK send work를 pipe로 queue해 direct signal response에서 분리합니다. | server가 accepted bit의 pre-increment sequence를 ACK token으로 캡처하고 pipe work로 전달합니다. | `src/server.c: handle_bit`, `queue_response`, `respond_to_bit` | 도입·부족 |
| `d3eacbbfeadc` | client가 expected server source와 exact current sequence의 datagram ACK만 bit success로 수락합니다. | client의 current `sequence`가 outstanding bit identity이며 exact ACK 뒤에만 증가합니다. | `src/client.c: send_bit`, response validation helpers | 강화 |
| `aeb1b00867f4` | obsolete ACK/NACK signal machinery를 client/server/shared/test sender에서 제거하고 datagram response만 남깁니다. | owner와 bit progress의 authoritative source가 ACQUIRE와 sequence datagram ACK 하나로 수렴합니다. | `src/server.c` first-bit branch 삭제, `src/client.c` signal wait 삭제 | 복구·강화 |
| `1487a861046e` | matching sequence ACK 뒤 fixed sleep을 production client와 session sender에서 제거합니다. | one outstanding bit의 progress는 exact ACK 하나로만 결정되며 delay state가 없습니다. | `src/client.c: send_bit`, delay helper removal diff | 강화·완료 |

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 상태 | 실제 failure/위험 | Fix 또는 전환 commit | 수정된 decision/invariant | Test 또는 후속 검증 | 학습자 code evidence |
| --- | --- | --- | --- | --- | --- |
| 여러 bit를 시간 간격만 두고 전송 | receiver 완료를 증명하지 못해 signal 병합과 byte 정렬 손상 위험 | `78de95b3cacb` | bit별 signal ACK stop-and-wait | 이 단계 전용 test commit은 Thread에 없음 | `src/client.c: send_bit`; ACK block-before-send |
| generic signal ACK | 어느 bit의 response인지 식별 불가하고 parallel success path가 남음 | `ebed06775b92 → 4234233ebd30 → d3eacbbfeadc → aeb1b00867f4` | wire field와 sequence correlation, legacy path 제거 | `b361ef9745ff`, `1ed2acbaa353` | record schema, server `g_sequence`, client exact predicate |
| ACK 뒤 fixed delay | validated ACK 뒤에도 bit마다 latency 누적 | `1487a861046e` | delay 제거, ACK를 causal progress 근거로 사용 | production client/session sender diff | sleep helper/constant 제거 뒤 send→wait→advance 유지 |

전용 test commit이 없는 연결에는 존재하지 않는 test를 만들어 적지 않았습니다.

## 8. Ownership / state / responsibility 변화

| 단계 | state 또는 responsibility owner | transition | 당시 한계 또는 다음 변화 | 실제 symbol/field |
| --- | --- | --- | --- | --- |
| 초기 | client bit cursor | elapsed time 뒤 다음 bit | server 처리 완료와 직접 연결되지 않음 | `send_byte` bit index, `send_bit` |
| signal ACK | client ACK flag와 signal mask | handler flag 뒤 다음 bit | transition identity 없음 | `g_acknowledged`, `sigprocmask`, `sigsuspend` |
| datagram 전환 | server sequence와 queued response | accepted bit마다 token 부여 | legacy ACK와 잠시 공존 | `g_sequence`, `t_response_request`, response pipe |
| 최종 | client outstanding sequence | exact ACK 뒤 증가 | fixed delay와 signal ACK 제거 | client `sequence`, response predicate |

## 9. Thread 최종 상태

Source에서 확정된 최종 조건:

- data bit는 계속 `SIGUSR1`/`SIGUSR2`로 전달됩니다.
- 진행 허가는 expected server endpoint의 sequence-correlated datagram ACK 하나로 결정됩니다.
- fixed sleep은 ordering invariant에 포함되지 않습니다.
- timeout은 uncertainty를 bounded failure로 끝내며 retransmission 또는 exactly-once를 제공하지 않습니다.

학습자 기록:

- 최종 state fields와 owner: client의 current `sequence`와 bit index가 outstanding transition을 소유합니다. server는 owner session의 `g_sequence`와 byte/bit state를 소유하고 같은 token으로 ACK를 만듭니다.
- 정상 transition 순서: payload byte 선택 → MSB-first signal 선택 → expected server/deadline 확정 → `kill` → exact datagram ACK 검증 → sequence와 bit cursor 증가입니다.
- 실패 시 중단·reset·cleanup 순서: endpoint validation, signal send, response receive 또는 deadline failure에서 cursor를 유지하고 client가 실패합니다. server response failure는 해당 시점의 session reset/error path로 이어집니다.
- 최종 상태가 보장하지 않는 것: retransmission, duplicate suppression, multiple in-flight bits, output와 ACK의 atomic transaction, same-UID peer의 cryptographic authentication은 제공하지 않습니다.
- 이 Thread를 한 문단으로 설명한 최종 서술: 이 Thread는 “시간이 충분히 지났으니 다음 bit”라는 추정에서 출발해, ACK signal을 block-before-send로 기다리는 stop-and-wait, finite timeout, identity를 가진 datagram record, server sequence와 client acceptance predicate를 차례로 도입합니다. legacy signal path를 제거한 뒤 exact ACK만 progress를 허용하므로 마지막 fixed delay를 삭제해도 one-bit-in-flight ordering이 유지됩니다.

## 10. 최종 architecture 또는 execution flow 정리

- [x] client가 payload byte와 MSB-first bit 위치를 선택하는 지점
- [x] zero/one을 signal로 전송하는 호출
- [x] current sequence와 absolute deadline을 만드는 지점
- [x] server가 accepted bit에 같은 sequence ACK를 생성하는 경로
- [x] client가 source와 response fields를 검증하는 predicate
- [x] sequence와 bit cursor가 증가하는 유일한 지점
- [x] timeout/send/receive failure에서 중단되는 경로

```text
client main/send_byte
    -> target PID와 server endpoint 검증
    -> current byte의 bit 7..0 선택
    -> current sequence와 absolute deadline 확정
    -> kill(server_pid, zero_or_one_signal)
    -> server accepted bit mutation + same sequence ACK 생성
    -> client recvfrom: exact size/source/magic/PID/kind/token/status 검증
    -> match면 sequence/bit cursor 증가
    -> mismatch면 같은 deadline으로 반복
    -> timeout/error면 cursor 유지 후 실패/cleanup

```

- 실제 함수·파일을 반영한 완성 흐름: `src/client.c`의 `send_byte`/`send_bit`와 response receive helpers가 sender 흐름을, `src/server.c`의 bit processor와 `send_response`가 receiver 흐름을 구성합니다.
- asynchronous boundary: data signal delivery와 server handler/event processing 사이, 그리고 server Unix datagram send와 client `recvfrom` 사이입니다.
- externally visible commit point: client 관점에서는 expected server endpoint에서 exact current sequence ACK를 수락하는 순간입니다. Thread 4에서 server output-before-ACK 조건이 추가됩니다.
- cleanup owner: client endpoint는 client cleanup이, server endpoint와 response/event descriptors는 server cleanup이 소유합니다.

## 11. 학습 완료 자가 점검

- [x] commit map의 10개 SHA를 source 순서대로 모두 설명할 수 있습니다.
- [x] 각 code excerpt에 SHA, path, symbol, 선택 이유가 기록돼 있습니다.
- [x] final HEAD 코드를 historical SHA의 증거로 사용한 곳이 없습니다.
- [x] 정상 경로와 failure path를 state mutation 순서로 설명할 수 있습니다.
- [x] source 확정 invariant와 직접 확인한 code evidence를 구분했습니다.
- [x] test commit의 invariant, failure, technique, production path, proves/not-proves를 기록했습니다.
- [x] Thread final state를 함수와 state field 수준으로 설명할 수 있습니다.
- [ ] 해당 SHA의 test를 로컬에서 직접 실행했습니다. — 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

### 이 Thread와 직접 연결된 Major Engineering Difficulties

- standard signal은 동일 signal의 임의 multiplicity를 reliable counted queue처럼 보존하지 않습니다.
- signal data channel과 datagram completion channel의 state ordering을 맞춰야 합니다.
- invalid response를 무시하는 동안에도 original monotonic deadline을 유지해야 합니다.
