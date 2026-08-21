# Thread 07 — Output-queue correctness under partial failure

부제: 부분 실패에서의 송신 대기열 정확성

## 1. Thread 목표

persistent partial-send state가 resource limit 도입 뒤 어떤 arithmetic·retry 경계에서 깨질 수 있었는지 추적하고, overflow-safe admission과 injected send script가 exact-once ordered delivery invariant를 어떻게 복구·검증하는지 학습합니다.

Source에서 확정된 significance:

> This thread shows a foundational mechanism being revisited after resource limits make its boundary conditions observable. The later fix is not a feature extension: it protects the exact-once output invariant against arithmetic wraparound, impossible syscall results, and retry-state corruption. Injecting the send operation turns those rare conditions into reproducible unit tests.

이 문서의 source-confirmed 문장은 학습 방향을 고정하기 위한 출발점입니다. 실제 함수 동작, ownership, branch, 실행 결과는 반드시 각 SHA 코드와 test를 직접 확인해 채웁니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- sent prefix와 unsent suffix를 나타내는 최소 state는 무엇인가?
- pending-byte limit은 backing buffer가 아니라 logical unsent bytes를 어떻게 측정하는가?
- `pending + byteCount` 비교가 어떤 값에서 wrap될 수 있으며 subtraction predicate는 왜 안전한가?
- zero, EINTR, EAGAIN, EWOULDBLOCK, EPIPE, impossible oversize return에서 offset과 queue는 어떻게 남는가?
- scripted sender가 real socket으로 만들기 어려운 sequence를 어떻게 재현하는가?

### Source와 직접 연결되는 invariant

- partial send는 kernel이 보고한 exact byte 수만큼만 offset을 전진해야 합니다.
- retryable/zero/terminal outcome에서도 아직 전송되지 않은 suffix는 순서와 내용이 보존되어야 합니다.
- queue-limit arithmetic은 wrap할 수 없고 rejected bytes는 이미 pending인 state를 변경하지 않아야 합니다.

### Source와 직접 연결되는 engineering difficulty

- rare syscall outcome과 size arithmetic failure를 timing-dependent network accident 없이 재현하는 문제.
- slow receiver pressure를 connection-local pending state로 격리하면서 exact byte accounting을 유지하는 문제.

## 3. 완료 기준

- a10fe961e2b1의 buffer/offset invariant와 graceful drain을 byte sequence로 설명할 수 있습니다.
- d7d85e518177의 exact admission 기준과 rejection mutation 순서를 기록했습니다.
- 881e59734a9a의 arithmetic proof와 impossible send-count guard를 parent diff로 설명할 수 있습니다.
- f34ab135c546의 script steps와 expected pending/output 상태를 재구성했습니다.
- 각 test가 증명하는 exact-order/boundary와 증명하지 않는 kernel scheduling 범위를 구분했습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | 원문 확정 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `a10fe961e2b1` | `feat(connection): 부분 송신 대기열 처리` | S | CORE, EVENT_IO, LIFECYCLE | Establishes persistent partial-send state and exact-order delivery. |
| 2 | `d7d85e518177` | `feat(buffer): 송신 대기열 크기 제한` | A | EVENT_IO, RESILIENCE, RISK | Adds a hard pending-output boundary and a visible queue-failure result. |
| 3 | `881e59734a9a` | `fix(connection): 송신 대기열 계산과 재시도 상태 보호` | S | DEBUG, EVENT_IO, RISK | Makes limit arithmetic overflow-safe and protects offset state across every send outcome. |
| 4 | `f34ab135c546` | `test(connection): 부분 송신과 대기열 경계 검증` | A | VERIFICATION, EVENT_IO, RISK | Scripts partial sends, interruptions, backpressure, zero sends, terminal errors, and invalid return counts. |

Commit 순서는 source에 정의된 순서입니다. 이 문서 안에서 재정렬하지 않습니다.

## 5. Commit별 학습 기록

각 commit에서 final HEAD를 보지 말고 해당 SHA의 tree와 필요한 parent/직전 관련 SHA만 확인합니다. 아래의 implementation anchor는 source에서 확정된 내용이며, code evidence 칸은 학습자가 직접 채웁니다.

### 5.1 `a10fe961e2b1` — `feat(connection): 부분 송신 대기열 처리`

| 항목 | 값 |
| --- | --- |
| Importance | S |
| Tags | CORE, EVENT_IO, LIFECYCLE |
| 원문 확정 역할 | Establishes persistent partial-send state and exact-order delivery. |
| 학습 깊이 | 프로젝트 핵심 architecture/invariant로 취급합니다. 직전 상태, failure 가능성, 핵심 결정, 실제 코드, ownership/lifecycle/state transition, 후속 fix/test까지 깊게 기록합니다. |

#### 이 Thread에서의 학습 관점

이 thread에서는 event-loop 통합보다 byte accounting, retry, exact-order output invariant의 최초 형태를 기준선으로 봅니다.

#### Source에서 확정된 implementation anchor

- `writeOffset_`가 persistent output queue의 전송 진행을 나타내며 매 writable event 사이에 유지됩니다.
- `flushPending()`은 unsent suffix만 보내고 `EINTR` 재시도, would-block 정지, hard error close 요청을 구분합니다.
- `queueLine()`은 기존 terminator를 제거하고 정확히 하나의 CRLF를 붙이며 close request는 즉시 close가 아닌 state로 저장됩니다.
- 완료된 queue는 reset되고, consumed prefix는 offset이 16 KiB를 넘은 뒤에만 compact됩니다.

Source가 이름을 명시한 확인 대상:

- `writeOffset_`, `flushPending()`, `MSG_NOSIGNAL`, `SIGPIPE`, `queueLine()`, `queueRaw()`

#### 해당 SHA에서 확인할 코드

- `outputBuffer_`와 `writeOffset_`가 나타내는 sent prefix/unsent suffix invariant를 코드와 byte 예제로 복원합니다.
- send에 넘기는 pointer와 length가 offset 이후 suffix만 가리키는지, positive return만큼만 offset이 전진하는지 확인합니다.
- `EINTR`, `EAGAIN`/`EWOULDBLOCK`, hard error, 전체 완료 각각에서 buffer·offset·close state가 어떻게 남는지 상태표를 작성합니다.
- `MSG_NOSIGNAL` 조건부 사용과 플랫폼별 signal suppression 의도를 확인합니다.
- `queueRaw()`와 `queueLine()`의 framing 책임 차이, line terminator 제거와 CRLF 추가 코드를 확인합니다.
- close가 요청된 상태에서도 pending output을 유지하는 이유와 server가 나중에 어떤 query로 drain 여부를 판단할 수 있는지 기록합니다.

비교 기준:

- 기본 비교: `a10fe961e2b1^` → `a10fe961e2b1`

Source가 지목한 failure/risk 출발점:

> partial send 뒤 offset을 보존하지 않으면 byte 중복·유실이 발생하고, close를 즉시 수행하면 이미 queue된 protocol response가 사라집니다.

#### Commit 학습 기록

| 학습 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태 | [parent 및 직전 관련 SHA에서 실제로 존재한 구조와 아직 없던 보장을 기록] |
| 해결하려던 문제 | [source-confirmed 문제를 실제 caller/state와 연결] |
| 기존 설계가 충분하지 않았던 이유 | [구체적 failure sequence와 영향 범위] |
| 핵심 결정 | [선택한 representation/API/ordering] |
| 실제 핵심 코드 | [path, symbol, 최소 증거 조각] |
| ownership / lifecycle / state transition | [mutation 전후와 owner를 순서대로 기록] |
| failure scenario | [input 또는 callback/syscall sequence와 branch] |
| 이 commit이 보장하는 것 | [코드로 입증한 범위] |
| 아직 보장하지 않는 것 | [후속 fix/test가 필요한 범위] |
| 후속 fix/test 연결 | [SHA와 무엇이 강화·수정되는지] |
| 학습자의 최종 설명 | [완성 후 5~10문장으로 직접 설명] |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| a10fe961e2b1 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| a10fe961e2b1^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `d7d85e518177` — `feat(buffer): 송신 대기열 크기 제한`. 원문 역할은 “Adds a hard pending-output boundary and a visible queue-failure result.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.2 `d7d85e518177` — `feat(buffer): 송신 대기열 크기 제한`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | EVENT_IO, RESILIENCE, RISK |
| 원문 확정 역할 | Adds a hard pending-output boundary and a visible queue-failure result. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 thread에서는 pending-byte admission 계산과 기존 queue 보존 invariant의 중간 상태를 봅니다.

#### Source에서 확정된 implementation anchor

- 각 `Connection`은 configurable pending-byte ceiling을 보유하고 move operations가 그 limit을 함께 이전합니다.
- `queueRaw()`와 `queueLine()`은 현재 unsent `pendingBytes()`를 기준으로 admission하며 초과 payload는 queue를 바꾸지 않고 close를 요청합니다.
- Server send APIs는 enqueue success를 반환하고 accepted connection은 `Server::Config::maxPendingBytes`를 상속합니다.

Source가 이름을 명시한 확인 대상:

- `Connection`, `pendingBytes()`, `queueLine()`, `Server::sendTo()`, `queueRawTo()`, `Server::Config::maxPendingBytes`, `--max-pending-bytes`

#### 해당 SHA에서 확인할 코드

- pending limit field가 constructor와 move constructor/assignment를 통해 보존되는지 확인합니다.
- queue admission이 backing-buffer size가 아니라 unsent suffix를 기준으로 하는 계산을 찾습니다.
- `queueLine()`의 normalized payload와 CRLF가 limit에 포함되는지 경계 예제로 확인합니다.
- rejection 시 기존 output buffer/offset이 유지되고 close reason만 설정되는지 mutation 순서를 기록합니다.
- `Server::sendTo()`/`queueRawTo()`가 bool failure를 caller에 돌리면서도 interest/close state를 갱신하는지 확인합니다.
- `--max-pending-bytes`가 runtime parser에서 server config와 new Connection으로 전달되는 경로를 추적합니다.

비교 기준:

- 기본 비교: `d7d85e518177^` → `d7d85e518177`
- Thread 직전 관련 SHA: `a10fe961e2b1` — `feat(connection): 부분 송신 대기열 처리`
- 후속 `881e59734a9a`가 이 admission arithmetic의 overflow 위험을 수정합니다.

Source가 지목한 failure/risk 출발점:

> slow/non-reading peer의 unsent queue가 무제한 증가하면 단일 connection이 process memory를 고갈시킵니다.

#### Commit 학습 기록

| 학습 항목 | 학습자 기록 |
| --- | --- |
| 직전 경계/상태 | [이 commit 전 subsystem이 제공하던 것] |
| 주요 문제와 설계 판단 | [왜 이 layer에서 처리했는지] |
| 핵심 코드 증거 | [path, symbol, caller/callee] |
| state / ownership 변화 | [mutation·lifetime 순서] |
| failure 또는 boundary | [해당 branch와 outcome] |
| 보장 / 비보장 | [각각 코드에 근거해 분리] |
| 다음 관련 commit | [무엇을 구현·검증·수정하는지] |
| 학습자의 설명 | [subsystem 관점으로 정리] |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| d7d85e518177 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| d7d85e518177^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `881e59734a9a` — `fix(connection): 송신 대기열 계산과 재시도 상태 보호`. 원문 역할은 “Makes limit arithmetic overflow-safe and protects offset state across every send outcome.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.3 `881e59734a9a` — `fix(connection): 송신 대기열 계산과 재시도 상태 보호`

| 항목 | 값 |
| --- | --- |
| Importance | S |
| Tags | DEBUG, EVENT_IO, RISK |
| 원문 확정 역할 | Makes limit arithmetic overflow-safe and protects offset state across every send outcome. |
| 학습 깊이 | 프로젝트 핵심 architecture/invariant로 취급합니다. 직전 상태, failure 가능성, 핵심 결정, 실제 코드, ownership/lifecycle/state transition, 후속 fix/test까지 깊게 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Output-queue correctness under partial failure` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- capacity admission은 `pending <= limit`와 `byteCount <= limit - pending` 형태로 바뀌어 addition overflow를 피합니다.
- `queueLine()`은 normalized payload와 CRLF 2 bytes를 별도 안전 검사하고 rejection 시 기존 queue를 변경하지 않습니다.
- injectable send operation이 Connection owned state와 함께 move되며 `flushPending()`은 requested count보다 큰 positive result를 거부합니다.
- EINTR, would-block, zero progress, terminal error는 unsent suffix를 기존 retry/close 계약대로 보존합니다.

Source가 이름을 명시한 확인 대상:

- `pending <= limit`, `byteCount <= limit - pending`, `queueLine()`, `pending + payload`, `payload + 2`, `send()`, `flushPending()`

#### 해당 SHA에서 확인할 코드

- old `pending + byteCount` 비교와 새 subtraction-based predicate를 parent diff에서 찾아 overflow 가능성을 구체적 maximum 예제로 계산합니다.
- 현재 pending state 자체가 limit 이하인지 먼저 검사하는지 확인합니다.
- `queueLine()`이 payload와 CRLF를 두 단계로 admission하고 첫 실패 뒤 append가 전혀 일어나지 않는지 mutation 순서를 확인합니다.
- send operation type, production default binding, test injection API, move constructor/assignment 보존을 확인합니다.
- `flushPending()`에서 requested length, returned positive count, impossible oversize result 검사, offset advance 순서를 추적합니다.
- zero/EINTR/EAGAIN/EWOULDBLOCK/EPIPE/oversize return 각각에서 buffer, offset, pending count, close state를 상태표로 작성합니다.

비교 기준:

- 기본 비교: `881e59734a9a^` → `881e59734a9a`
- Thread 직전 관련 SHA: `d7d85e518177` — `feat(buffer): 송신 대기열 크기 제한`
- 초기 state machine `a10fe961e2b1`과 limit feature `d7d85e518177`를 함께 비교합니다.

Source가 지목한 failure/risk 출발점:

> capacity addition wrap은 limit을 우회하고 impossible send count를 신뢰하면 offset이 buffer 뒤로 넘어가 pending arithmetic underflow와 byte accounting corruption을 일으킵니다.

#### Failure → root cause → fix → test 기록

| Fix 추적 항목 | 기록 |
| --- | --- |
| 기존 가정 | `pending + bytes <= limit`와 positive send count를 그대로 신뢰해도 queue accounting이 안전하다는 가정 |
| 실제 failure 또는 위험 | capacity addition wrap은 limit을 우회하고 impossible send count를 신뢰하면 offset이 buffer 뒤로 넘어가 pending arithmetic underflow와 byte accounting corruption을 일으킵니다. |
| root cause | addition wrap과 requested size보다 큰 result가 admission/offset invariant를 깨뜨릴 수 있음 |
| 수정된 invariant / decision | subtraction-based capacity proof와 returned count upper-bound 검증 후에만 state를 mutate함 |
| 실제 수정 코드 | [parent/current diff의 path, symbol, branch, mutation 순서] |
| cleanup / failure propagation | [실패가 어느 owner와 callback을 거쳐 수렴하는지] |
| regression test 연결 | `f34ab135c546`의 scripted boundary/errno/result regression |
| fix가 보장하는 것 | [코드와 test가 직접 입증하는 범위] |
| fix가 보장하지 않는 것 | [transactionality, fairness, 다른 layer 등 미보장 범위] |
| 학습자의 root-cause 설명 | [증상 → 원인 → 수정 → 검증을 직접 작성] |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| 881e59734a9a | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 881e59734a9a^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `f34ab135c546` — `test(connection): 부분 송신과 대기열 경계 검증`. 원문 역할은 “Scripts partial sends, interruptions, backpressure, zero sends, terminal errors, and invalid return counts.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.4 `f34ab135c546` — `test(connection): 부분 송신과 대기열 경계 검증`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | VERIFICATION, EVENT_IO, RISK |
| 원문 확정 역할 | Scripts partial sends, interruptions, backpressure, zero sends, terminal errors, and invalid return counts. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 thread에서는 partial-write invariant를 syscall outcome별로 고정하는 직접 regression으로 봅니다.

#### Source에서 확정된 implementation anchor

- scripted sender가 byte count와 errno sequence를 주입해 scheduler/socket pressure 없이 write state transition을 재현합니다.
- tests는 size_t maximum, exact-limit CRLF admission, first excess rejection, existing queue preservation을 다룹니다.
- partial scenario는 EINTR, successful prefixes, EAGAIN/EWOULDBLOCK, capacity reuse, final completion을 결합하고 exact output `abcdefghijkl`을 검증합니다.
- zero send, EPIPE, impossible oversized count도 offset corruption 없이 처리되어야 합니다.

Source가 이름을 명시한 확인 대상:

- `make test`, `std::size_t`, `abcdefghijkl`

#### 해당 SHA에서 확인할 코드

- test executable이 production `Connection`을 어떤 injectable sender로 구성하는지 확인합니다.
- script step마다 requested suffix와 returned result, expected pending count/offset을 표로 복원합니다.
- sent bytes를 test double이 어떻게 capture하고 final exact string이 duplication/omission/reordering을 검증하는지 확인합니다.
- capacity reuse가 partial progress 뒤 `pendingBytes()` 감소를 실제 admission에 반영하는지 확인합니다.
- zero/EPIPE/oversize result case가 result enum, close request, pending preservation을 각각 assertion하는지 확인합니다.
- default `make test`에서 smoke보다 먼저 실행되고 generated binary가 clean/ignore 대상인지 확인합니다.

비교 기준:

- 기본 비교: `f34ab135c546^` → `f34ab135c546`
- Thread 직전 관련 SHA: `881e59734a9a` — `fix(connection): 송신 대기열 계산과 재시도 상태 보호`

Source가 지목한 failure/risk 출발점:

> real TCP 테스트는 특정 short-send/errno sequence를 안정적으로 만들 수 없어 핵심 offset invariant의 rare branch를 놓칩니다.

#### Test / verification 학습 기록

| 구분 | Source에서 확정된 출발점 | 학습자 코드·실행 기록 |
| --- | --- | --- |
| 대상 production invariant | queued byte가 exact send progress만큼만 제거되고 retry/failure 동안 unsent suffix가 보존되는 transport invariant | [관련 production path와 symbol을 추가] |
| 재현 failure / boundary | size_t maximum, exact limit/CRLF, excess rejection, EINTR, EAGAIN/EWOULDBLOCK, partial, zero, EPIPE, impossible count | [입력, state, injected result를 정확히 기록] |
| test technique | injectable scripted send operation을 사용하는 focused C++ unit executable | [test double/real socket/process의 구성 증거] |
| 통과하는 production code path | Connection queue admission → flushPending → scripted operation → offset/pending/result/close state | [caller → callee → branch를 해당 SHA에서 연결] |
| 이 test가 증명하는 것 | 정해진 syscall outcome sequence에서 duplication/omission/reordering 없이 exact accounting을 유지함 | [실행 결과와 assertion 근거] |
| 이 test가 증명하지 않는 것 | 실제 kernel scheduler와 socket buffer pressure의 모든 조합, server/application integration | [과장하지 않을 범위] |
| test 성격 | deterministic unit-level state-machine regression | [broad/deterministic 판단 근거] |
| 막는 회귀 | overflow admission, retry-state corruption, invalid count offset overrun, CRLF capacity 오계산 | [후속 변경에서 깨질 수 있는 invariant] |

실행 기록:

- 실행 SHA: `[확인한 SHA]`
- 실행 환경: `[OS, compiler, sanitizer 또는 Python version 등]`
- 실행 명령: `[실제 명령]`
- 결과: `[pass/fail 및 핵심 assertion]`
- 실패 시 transcript/log: `[최소 재현에 필요한 부분]`
- production 코드와 test 코드의 대응: `[path/symbol 쌍]`


#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| f34ab135c546 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| f34ab135c546^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 이 commit은 이 Thread의 마지막 항목입니다. Invariant ledger와 Thread 최종 상태에서 전체 변화를 연결합니다.

## 6. Invariant ledger

| Invariant | 처음 도입 | 강화/적용 | 부족함 또는 위험이 드러난 지점 | Fix/Test 연결 | 학습자 최종 기록 |
| --- | --- | --- | --- | --- | --- |
| persistent send progress | a10fe961e2b1 | writeOffset + unsent suffix | limit/invalid result boundary 미정 | 881e59734a9a에서 강화 | [학습자 최종 상태 설명] |
| pending-output resource bound | d7d85e518177 | queue admission + bool failure | addition overflow 가능성 | 881e59734a9a / f34ab135c546 | [학습자 최종 상태 설명] |
| overflow-safe capacity | 881e59734a9a | subtraction predicate + two-step CRLF check | 없음 | f34ab135c546 max/exact/excess cases | [학습자 최종 상태 설명] |
| valid send progress | 881e59734a9a | injectable operation + oversize guard | kernel 외 implementation/test double도 보호 | f34ab135c546 scripted outcomes | [학습자 최종 상태 설명] |

Ledger 작성 기준:

- “도입”과 “완성”을 같은 의미로 쓰지 않습니다.
- 후속 fix가 이전 commit의 사실을 소급 변경하지 않도록 각 SHA 시점의 보장과 부족함을 분리합니다.
- source가 명시하지 않은 invariant를 추가할 때는 확정 사실이 아니라 학습자의 코드 해석으로 표시하고 path/symbol 증거를 붙입니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 | 실제 failure/risk | Fix 또는 기반 변화 | 수정된 decision/semantics | Test 연결 | 코드 증거 |
| --- | --- | --- | --- | --- | --- |
| persistent offset이면 충분 | resource limit addition wrap과 invalid positive count가 accounting을 깨뜨림 | d7d85e518177이 failure boundary를 노출 | 881e59734a9a이 arithmetic/offset root cause 수정 | f34ab135c546이 모든 outcome을 script로 검증 | [실제 code/test evidence] |

## 8. Ownership / state / responsibility 변화

| 책임 또는 상태 | 이전 상태 | 이후 authoritative 위치 | 관련 commit | 학습자 확인 |
| --- | --- | --- | --- | --- |
| byte queue와 offset | 없음 | `Connection` | a10fe961e2b1 | [확인한 owner/state/lifetime] |
| capacity policy | unbounded queue | `Connection` limit admission | d7d85e518177 | [확인한 owner/state/lifetime] |
| syscall variability abstraction | real `send()` 직접 호출 | injectable send operation + production default | 881e59734a9a | [확인한 owner/state/lifetime] |
| rare-branch verification | broad TCP | focused scripted C++ executable | f34ab135c546 | [확인한 owner/state/lifetime] |

추가 기록:

- owner가 바뀌는 실제 코드: `[SHA / path / symbol]`
- non-owning reference 또는 identifier: `[어떤 lifetime 안에서만 유효한지]`
- state mutation 전후 순서: `[호출 순서와 실패 시 남는 상태]`
- cleanup 책임: `[normal / error / callback / shutdown 경로]`

## 9. Thread 최종 상태

- 시작 직전 상태: `[첫 commit의 parent에서 실제로 존재한 구조와 미보장 항목]`
- 마지막 commit 시점의 source-confirmed 상태: `[마지막 commit 역할을 코드로 입증한 설명]`
- Thread 안에서 강화된 핵심 invariant: `[ledger를 바탕으로 작성]`
- 남은 한계 또는 후속 Thread에서 보강되는 부분: `[관련 문서와 SHA]`
- 학습자의 최종 설명: `[이 Thread의 설계 → 구현 → failure → 수정/검증 흐름을 직접 작성]`

## 10. 최종 architecture 또는 execution flow 정리

다음 골격에 실제 symbol, state, failure branch를 채웁니다.

```text
[queueRaw/queueLine request] → pending/limit safe admission → append 또는 reject+close
[writable event] → requested unsent suffix → injected/real send operation
→ EINTR retry | would-block/zero preserve | positive exact advance | terminal error close
→ pending 0이면 buffer reset, 아니면 다음 writable event까지 state 유지
[scripted test] → result sequence → pending/offset/captured bytes assertions
```

Execution flow 증거표:

| 단계 | SHA | Caller | Callee / state owner | 정상 transition | failure / cleanup transition |
| --- | --- | --- | --- | --- | --- |
| 1 | [SHA] | [caller] | [callee/owner] | [정상 흐름] | [실패 흐름] |
| 2 | [SHA] | [caller] | [callee/owner] | [정상 흐름] | [실패 흐름] |
| 3 | [SHA] | [caller] | [callee/owner] | [정상 흐름] | [실패 흐름] |

## 11. 학습 완료 자가 점검

- [ ] Commit map의 모든 SHA, subject, importance, tags를 source와 대조했습니다.
- [ ] 모든 commit을 해당 SHA 시점의 코드로 확인했습니다.
- [ ] final HEAD의 함수나 field를 과거 commit 설명에 소급하지 않았습니다.
- [ ] S commit은 architecture/invariant, failure, ownership/lifecycle, 후속 fix/test까지 설명할 수 있습니다.
- [ ] A commit은 주요 subsystem/boundary/failure path와 설계 판단을 설명할 수 있습니다.
- [ ] B commit은 Thread 흐름에서 맡는 구현 역할과 state 변화를 확인했습니다.
- [ ] fix commit의 기존 가정, root cause, 수정 invariant, regression test를 연결했습니다.
- [ ] test commit의 production path, technique, 증명/비증명 범위를 구분했습니다.
- [ ] Invariant ledger와 responsibility 표를 실제 path/symbol 증거로 완성했습니다.
- [ ] 이 Thread를 별도 프로젝트 재학습 없이 commit history에 근거해 설명할 수 있습니다.
