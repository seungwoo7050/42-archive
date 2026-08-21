# Thread 07 — Output-queue correctness under partial failure

부제: 부분 실패에서의 송신 대기열 정확성

## 1. Thread 목표

persistent partial-send state가 resource limit 도입 뒤 어떤 arithmetic·retry 경계에서 깨질 수 있었는지 추적하고, overflow-safe admission과 injected send script가 exact-once ordered delivery invariant를 어떻게 복구·검증하는지 학습합니다.

Source에서 확정된 significance:

> This thread shows a foundational mechanism being revisited after resource limits make its boundary conditions observable. The later fix is not a feature extension: it protects the exact-once output invariant against arithmetic wraparound, impossible syscall results, and retry-state corruption. Injecting the send operation turns those rare conditions into reproducible unit tests.

이 문서의 source-confirmed 문장, commit map, SHA, subject, importance, tags와 원문 역할은 변경하지 않았습니다. 아래 학습 기록은 지정 branch의 각 exact SHA에서 확인한 code diff를 기준으로 작성했습니다.

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

- a10fe961e2b1의 buffer/offset invariant와 graceful drain을 byte sequence로 설명합니다.
- d7d85e518177의 exact admission 기준과 rejection mutation 순서를 기록했습니다.
- 881e59734a9a의 arithmetic proof와 impossible send-count guard를 parent change로 설명합니다.
- f34ab135c546의 script steps와 expected pending/output 상태를 재구성했습니다.
- 각 test가 증명하는 exact-order/boundary와 증명하지 않는 kernel scheduling 범위를 구분했습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | 원문 확정 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `a10fe961e2b1` | `feat(connection): 부분 송신 대기열 처리` | S | CORE, EVENT_IO, LIFECYCLE | Establishes persistent partial-send state and exact-order delivery. |
| 2 | `d7d85e518177` | `feat(buffer): 송신 대기열 크기 제한` | A | EVENT_IO, RESILIENCE, RISK | Adds a hard pending-output boundary and a visible queue-failure result. |
| 3 | `881e59734a9a` | `fix(connection): 송신 대기열 계산과 재시도 상태 보호` | S | DEBUG, EVENT_IO, RISK | Makes limit arithmetic overflow-safe and protects offset state across every send outcome. |
| 4 | `f34ab135c546` | `test(connection): 부분 송신과 대기열 경계 검증` | A | VERIFICATION, EVENT_IO, RISK | Scripts partial sends, interruptions, backpressure, zero sends, terminal errors, and invalid return counts. |

Commit 순서는 source에 정의된 순서이며 재정렬하지 않았습니다.

## 5. Commit별 학습 기록

각 기록은 해당 commit의 exact diff에서 확인한 파일·symbol·state와, 필요한 경우 parent/앞선 관련 SHA의 상태 차이를 기준으로 합니다. 후속 commit의 field나 test seam을 이전 commit에 소급하지 않았습니다.

### 5.1 `a10fe961e2b1` — `feat(connection): 부분 송신 대기열 처리`

| 항목 | 값 |
| --- | --- |
| Importance | S |
| Tags | CORE, EVENT_IO, LIFECYCLE |
| 원문 확정 역할 | Establishes persistent partial-send state and exact-order delivery. |
| 학습 깊이 | 프로젝트 핵심 architecture/invariant입니다. 이전 상태, failure sequence, 핵심 결정, ownership/lifecycle, 남은 한계와 후속 fix/test를 모두 복원합니다. |

#### Source에서 확정된 역할

> Establishes persistent partial-send state and exact-order delivery.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 상태 | 출력 bytes와 한 번의 send를 연결할 persistent progress state가 없었습니다. |
| failure / boundary | EINTR은 같은 suffix를 재시도하고, EAGAIN/EWOULDBLOCK 및 0은 offset을 유지한 채 다음 writable event를 기다리며, hard error는 close를 요청합니다. `MSG_NOSIGNAL`을 사용할 수 있는 플랫폼에서는 SIGPIPE를 억제합니다. |
| 핵심 결정 | `writeOffset_`로 sent prefix를 나타내고 `flushPending()`이 unsent suffix만 전송하도록 했습니다. `queueRaw()`와 `queueLine()`은 bytes를 append하고 line terminator를 CRLF 하나로 정규화했습니다. |
| 변경 파일·symbol | `src/Connection.cpp — flushPending, queueRaw, queueLine, pendingBytes, wantsWrite` |
| ownership / lifecycle / state transition | `writeBuffer_[0:writeOffset_]`는 이미 전송된 prefix, 나머지는 순서가 보존된 pending suffix입니다. 완료 시 buffer/offset을 reset하고 큰 consumed prefix만 compact합니다. |
| 이 commit이 보장하는 것 | short send와 backpressure 사이에서도 성공한 byte 수만큼만 전진해 exact-order delivery의 기반을 만듭니다. |
| 아직 보장하지 않는 것 | queue 크기는 무제한이며 `pending + append` overflow와 send가 요청보다 큰 값을 돌려주는 비정상 결과는 아직 방어하지 않습니다. |
| 후속 fix/test 연결 | 625ffc924de8이 write interest에 연결하고, d7d85e518177가 limit를 추가한 뒤 881e59734a9a/f34ab135c546가 경계를 수정·검증합니다. |

#### S-level invariant 재구성

| 순서 | 상태 / 판단 |
| --- | --- |
| 1. 이전 전제 | 출력 bytes와 한 번의 send를 연결할 persistent progress state가 없었습니다. |
| 2. failure conditions / boundary | EINTR은 같은 suffix를 재시도하고, EAGAIN/EWOULDBLOCK 및 0은 offset을 유지한 채 다음 writable event를 기다리며, hard error는 close를 요청합니다. `MSG_NOSIGNAL`을 사용할 수 있는 플랫폼에서는 SIGPIPE를 억제합니다. |
| 3. 선택한 표현과 순서 | `writeOffset_`로 sent prefix를 나타내고 `flushPending()`이 unsent suffix만 전송하도록 했습니다. `queueRaw()`와 `queueLine()`은 bytes를 append하고 line terminator를 CRLF 하나로 정규화했습니다. |
| 4. authoritative state | `writeBuffer_[0:writeOffset_]`는 이미 전송된 prefix, 나머지는 순서가 보존된 pending suffix입니다. 완료 시 buffer/offset을 reset하고 큰 consumed prefix만 compact합니다. |
| 5. 결과 invariant | short send와 backpressure 사이에서도 성공한 byte 수만큼만 전진해 exact-order delivery의 기반을 만듭니다. |
| 6. 후속 보강 | 625ffc924de8이 write interest에 연결하고, d7d85e518177가 limit를 추가한 뒤 881e59734a9a/f34ab135c546가 경계를 수정·검증합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `a10fe961e2b1` | `src/Connection.cpp` | `Connection::flushPending` | unsent suffix pointer/length와 return-count 기반 offset 전진 |
| `a10fe961e2b1` | `src/Connection.cpp` | `queueLine` | 기존 CR/LF 제거 후 CRLF 하나 append |
| `a10fe961e2b1` | `src/Connection.cpp` | `pendingBytes/wantsWrite` | logical unsent bytes가 server interest 판단의 입력 |

- 조사 방법: GitHub에서 `a10fe961e2b1`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `d7d85e518177` — `feat(buffer): 송신 대기열 크기 제한`. 원문 역할은 “Adds a hard pending-output boundary and a visible queue-failure result.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.2 `d7d85e518177` — `feat(buffer): 송신 대기열 크기 제한`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | EVENT_IO, RESILIENCE, RISK |
| 원문 확정 역할 | Adds a hard pending-output boundary and a visible queue-failure result. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Adds a hard pending-output boundary and a visible queue-failure result.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | partial output queue가 무제한이라 느리거나 읽지 않는 peer가 memory를 계속 점유할 수 있었습니다. |
| 주요 문제와 설계 판단 | Connection에 `maxPendingBytes_`를 추가하고 `pendingBytes()` 기준으로 `queueRaw/queueLine` admission을 제한했습니다. queue 함수는 bool을 반환하고 초과 시 close를 요청하며 Server send API가 실패를 caller에 전달했습니다. |
| 변경 파일·symbol | `include/Connection.hpp — maxPendingBytes and bool queue API`<br>`src/Connection.cpp — pendingBytes, canAppendPending, queueRaw, queueLine`<br>`src/Server.cpp — sendTo/queueRawTo propagation` |
| state / ownership 변화 | limit은 backing buffer size가 아니라 `writeBuffer_.size() - writeOffset_`인 logical unsent bytes를 지배합니다. |
| failure 또는 boundary | 초과 append는 기존 pending bytes를 변경하지 않고 `outbound queue limit exceeded` close state를 만듭니다. |
| 보장 / 비보장 | 보장: 한 connection의 unsent output에 hard bound와 observable failure result를 제공합니다.<br>비보장: `pending + byteCount <= limit` 덧셈은 size_t wrap 가능성이 있고 CRLF 추가의 두 단계 경계도 충분히 증명되지 않았습니다. |
| 다음 관련 변화 | 881e59734a9a가 subtraction predicate와 send guard로 수정하고 f34ab135c546가 deterministic하게 검증합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `d7d85e518177` | `src/Connection.cpp` | `pendingBytes/canAppendPending` | logical unsent byte 기준 admission |
| `d7d85e518177` | `src/Server.cpp` | `sendTo/queueRawTo` | queue failure를 application까지 bool로 전달 |

- 조사 방법: GitHub에서 `d7d85e518177`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `881e59734a9a` — `fix(connection): 송신 대기열 계산과 재시도 상태 보호`. 원문 역할은 “Makes limit arithmetic overflow-safe and protects offset state across every send outcome.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.3 `881e59734a9a` — `fix(connection): 송신 대기열 계산과 재시도 상태 보호`

| 항목 | 값 |
| --- | --- |
| Importance | S |
| Tags | DEBUG, EVENT_IO, RISK |
| 원문 확정 역할 | Makes limit arithmetic overflow-safe and protects offset state across every send outcome. |
| 학습 깊이 | 프로젝트 핵심 architecture/invariant입니다. 이전 상태, failure sequence, 핵심 결정, ownership/lifecycle, 남은 한계와 후속 fix/test를 모두 복원합니다. |

#### Source에서 확정된 역할

> Makes limit arithmetic overflow-safe and protects offset state across every send outcome.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 상태 | pending limit은 `pending + append <= limit` 덧셈을 사용했고 send return count를 요청 길이보다 작거나 같다고 암묵적으로 가정했습니다. rare retry sequence를 직접 주입할 seam도 없었습니다. |
| failure / boundary | size_t wrap, payload+CRLF 경계, impossible oversize return은 기존 pending bytes/offset을 보존한 채 rejection 또는 close로 수렴합니다. EINTR/would-block/zero/hard error의 기존 suffix 보존 semantics도 주입 가능한 operation을 통과합니다. |
| 핵심 결정 | `ConnectionLimits::canAppendPending()`을 `pending <= limit && byteCount <= limit - pending`으로 바꾸고 line payload와 CRLF를 별도 safe admission으로 검사했습니다. `SendOperation`을 constructor에 주입하고 move state에 포함했으며, positive send count가 요청 size를 넘으면 offset을 전진시키지 않고 hard error/close로 처리했습니다. |
| 변경 파일·symbol | `include/Connection.hpp — SendOperation constructor seam`<br>`src/Connection.cpp — send wrapper, move, flushPending, queueLine`<br>`src/ConnectionLimits.hpp — canAppendPending` |
| ownership / lifecycle / state transition | send operation도 Connection의 transport state와 함께 move되고, write offset은 검증된 실제 successful count에 의해서만 전진합니다. |
| 이 commit이 보장하는 것 | queue admission 산술이 overflow할 수 없고 모든 send outcome에서 unsent suffix와 exact-order offset invariant가 보호됩니다. |
| 아직 보장하지 않는 것 | 주입 seam은 send syscall 결과를 모델링하지만 실제 kernel scheduling, TCP peer behavior, write readiness fairness 자체는 보장하지 않습니다. |
| 후속 fix/test 연결 | f34ab135c546가 scripted sender로 산술·retry·partial·zero·terminal·invalid-count branch를 모두 고정합니다. |

#### S-level invariant 재구성

| 순서 | 상태 / 판단 |
| --- | --- |
| 1. 이전 전제 | pending limit은 `pending + append <= limit` 덧셈을 사용했고 send return count를 요청 길이보다 작거나 같다고 암묵적으로 가정했습니다. rare retry sequence를 직접 주입할 seam도 없었습니다. |
| 2. failure conditions / boundary | size_t wrap, payload+CRLF 경계, impossible oversize return은 기존 pending bytes/offset을 보존한 채 rejection 또는 close로 수렴합니다. EINTR/would-block/zero/hard error의 기존 suffix 보존 semantics도 주입 가능한 operation을 통과합니다. |
| 3. 선택한 표현과 순서 | `ConnectionLimits::canAppendPending()`을 `pending <= limit && byteCount <= limit - pending`으로 바꾸고 line payload와 CRLF를 별도 safe admission으로 검사했습니다. `SendOperation`을 constructor에 주입하고 move state에 포함했으며, positive send count가 요청 size를 넘으면 offset을 전진시키지 않고 hard error/close로 처리했습니다. |
| 4. authoritative state | send operation도 Connection의 transport state와 함께 move되고, write offset은 검증된 실제 successful count에 의해서만 전진합니다. |
| 5. 결과 invariant | queue admission 산술이 overflow할 수 없고 모든 send outcome에서 unsent suffix와 exact-order offset invariant가 보호됩니다. |
| 6. 후속 보강 | f34ab135c546가 scripted sender로 산술·retry·partial·zero·terminal·invalid-count branch를 모두 고정합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `881e59734a9a` | `src/ConnectionLimits.hpp` | `detail::canAppendPending` | subtraction predicate로 size_t wrap 방지 |
| `881e59734a9a` | `src/Connection.cpp` | `Connection::flushPending` | send count > requested guard가 offset mutation 전에 실행 |
| `881e59734a9a` | `src/Connection.cpp` | `queueLine` | payload와 CRLF를 각각 overflow-safe하게 admission |
| `881e59734a9a` | `include/Connection.hpp` | `SendOperation` | rare syscall result를 production path에 주입 |

- 조사 방법: GitHub에서 `881e59734a9a`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### Fix chain

| 단계 | 역사 복원 |
| --- | --- |
| 기존 가정 | unsigned 덧셈이 limit 비교 전에 wrap하지 않고 send가 요청 길이 이하를 반환한다는 가정이었습니다. |
| 실제 failure / risk | wrap된 합은 oversize queue를 허용하고 impossible return은 offset을 buffer 끝 너머로 이동시켜 pending 계산과 retry state를 깨뜨릴 수 있었습니다. |
| root cause | admission과 progress mutation 전에 arithmetic/syscall postcondition을 명시적으로 검증하지 않았습니다. |
| 수정된 invariant / decision | limit에서 pending을 빼는 representable 비교와 return-count upper bound 검사를 mutation 전에 수행합니다. |
| regression evidence | f34ab135c546가 size_t maximum, exact CRLF limit, EINTR/partial/EAGAIN/EWOULDBLOCK/zero/EPIPE/oversize return을 script로 검증합니다. |

#### 다음 연결

- 다음 Thread commit: `f34ab135c546` — `test(connection): 부분 송신과 대기열 경계 검증`. 원문 역할은 “Scripts partial sends, interruptions, backpressure, zero sends, terminal errors, and invalid return counts.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.4 `f34ab135c546` — `test(connection): 부분 송신과 대기열 경계 검증`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | VERIFICATION, EVENT_IO, RISK |
| 원문 확정 역할 | Scripts partial sends, interruptions, backpressure, zero sends, terminal errors, and invalid return counts. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Scripts partial sends, interruptions, backpressure, zero sends, terminal errors, and invalid return counts.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | Connection fix의 rare syscall/overflow branch는 real socket timing에 맡기면 반복적으로 재현하기 어려웠습니다. |
| 주요 문제와 설계 판단 | `SendStep`과 `ScriptedSender`가 Bytes/Error/Zero sequence를 반환하는 unit binary를 추가하고 production `Connection::flushPending()`에 주입했습니다. Makefile에 `connection-test`를 연결했습니다. |
| 변경 파일·symbol | `tests/connection_test.cpp — SendStep, ScriptedSender and five test groups`<br>`Makefile — connection-test` |
| state / ownership 변화 | script index, captured bytes와 Connection pending/offset/close state를 각 단계 후 동시에 assertion합니다. |
| failure 또는 boundary | EINTR→partial→EAGAIN→partial→EWOULDBLOCK→final sequence, zero then progress, EPIPE, requested size보다 큰 return, size_t max arithmetic와 exact CRLF limit을 결정적으로 재현합니다. |
| 보장 / 비보장 | 보장: successful bytes는 `abcdefghijkl` 순서로 정확히 한 번 전달되고 retryable/terminal/invalid outcome은 아직 안 보낸 bytes를 소비하지 않으며 rejected append는 queue를 변경하지 않습니다.<br>비보장: fake sender는 kernel buffer, actual readiness notification, TCP segmentation이나 peer scheduling을 검증하지 않습니다. |
| 다음 관련 변화 | de1dd0fc30d0가 real process/slow reader에서 connection-local queue isolation을 보완하고 416efc91e580가 sanitizer로 반복합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `f34ab135c546` | `tests/connection_test.cpp` | `testLimitArithmetic/testHardLimitAndLineTerminator` | size_t max와 CRLF 포함 exact-limit mutation |
| `f34ab135c546` | `tests/connection_test.cpp` | `testInterruptedAndPartialSendState` | scripted retry마다 pending offset과 exact output |
| `f34ab135c546` | `tests/connection_test.cpp` | `testZeroAndTerminalErrorPreservePendingBytes` | zero/EPIPE가 suffix를 소비하지 않음 |
| `f34ab135c546` | `tests/connection_test.cpp` | `testInvalidSendCountCannotAdvanceOffset` | oversize return이 offset을 손상시키지 않음 |

- 조사 방법: GitHub에서 `f34ab135c546`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### Test / verification 학습 기록

| 구분 | 역사 복원 기록 |
| --- | --- |
| 대상 production invariant | logical pending limit은 overflow하지 않고, offset은 검증된 successful byte만큼만 전진하며 unsent suffix가 exact order로 보존됩니다. |
| 재현 failure / boundary | size_t max, CRLF exact limit, EINTR, partial, EAGAIN/EWOULDBLOCK, zero, EPIPE, impossible oversize return입니다. |
| test technique | injected send operation을 사용하는 deterministic scripted unit test입니다. |
| 통과하는 production path | queueRaw/queueLine → overflow-safe admission → flushPending → injected send result → offset/close/pending query입니다. |
| 이 test가 증명하는 것 | rare outcome sequence에서 exact byte accounting과 mutation-free rejection을 직접 증명합니다. |
| 이 test가 증명하지 않는 것 | real kernel readiness, TCP delivery acknowledgement, end-to-end fairness는 증명하지 않습니다. |
| test 성격 | deterministic transport boundary regression |
| 막는 회귀 | partial retry 중 byte 중복·유실, unsigned wrap, invalid return으로 offset이 깨지는 회귀를 막습니다. |

실행 기록:

- 실행 SHA: `f34ab135c546`
- repository에 정의된 실행 명령: `make connection-test` 또는 `make test`
- 현재 작업 환경 실행 여부: **미실행**
- 이유: 현재 런타임에서 외부 DNS가 차단되어 지정 branch의 local checkout을 만들 수 없었습니다. GitHub 연결 도구로 해당 SHA의 production/test diff와 test mechanism은 확인했지만, binary/test command의 성공 결과를 만들거나 추정하지 않았습니다.
- 실행 결과: 기록 없음

#### 다음 연결

- 이 commit은 이 Thread의 마지막 항목입니다. 아래 Invariant ledger와 Thread 최종 상태에서 전체 변화를 연결합니다.

## 6. Invariant ledger

| Invariant | 처음 도입 | 강화/적용 | 학습자 최종 기록 | Fix/Test 연결 |
| --- | --- | --- | --- | --- |
| persistent sent-prefix state | `a10fe961e2b1` | writeOffset/pending suffix | positive return만큼만 전진하고 retry 사이에 offset을 보존합니다. | 881e59734a9a invalid-count guard |
| hard logical pending bound | `d7d85e518177` | pendingBytes + bool admission | limit 초과 append는 기존 queue를 변경하지 않습니다. | 초기 addition wrap이 부족함 |
| overflow-safe exact-order invariant | `881e59734a9a` | subtraction predicate + injected sender | all outcome에서 offset/suffix를 mutation 전에 검증합니다. | f34ab135c546 |

도입과 완성을 같은 의미로 쓰지 않았습니다. 후속 fix가 이전 SHA의 사실을 바꾸지 않도록 각 시점의 보장과 부족함을 분리했습니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 | 실제 failure / risk | Fix 또는 기반 변화 | 수정된 decision / semantics | Test 연결 |
| --- | --- | --- | --- | --- |
| 한 send가 전부 또는 정상 범위 반환 | partial/retry/invalid count에서 byte 중복·유실·offset 손상 | a10fe961e2b1 → 881e59734a9a | persistent offset + count upper bound | f34ab135c546 |
| pending + append 비교는 안전 | size_t wrap 후 oversize admission | 881e59734a9a | append <= limit - pending | f34ab135c546 |
| rare syscall sequence는 real socket으로 충분 | timing에 따라 branch 미재현 | 881e59734a9a SendOperation seam | scripted deterministic outcomes | f34ab135c546 |

## 8. Ownership / state / responsibility 변화

| 책임 또는 상태 | 이전 상태 | 이후 authoritative 위치 | 관련 commit | 확인 결과 |
| --- | --- | --- | --- | --- |
| output backing bytes/offset | 없음 | Connection | a10fe961e2b1 | path/symbol은 위 commit 증거표에 연결했습니다. |
| logical pending limit | 무제한 | Connection maxPendingBytes | d7d85e518177 | path/symbol은 위 commit 증거표에 연결했습니다. |
| send operation | 직접 syscall 고정 | Connection-owned SendOperation | 881e59734a9a | path/symbol은 위 commit 증거표에 연결했습니다. |
| failure script/captured output | 없음 | connection_test ScriptedSender | f34ab135c546 | path/symbol은 위 commit 증거표에 연결했습니다. |

## 9. Thread 최종 상태

- 시작 직전 상태: 출력 bytes와 한 번의 send를 연결할 persistent progress state가 없었습니다.
- 마지막 commit `f34ab135c546` 시점의 상태: successful bytes는 `abcdefghijkl` 순서로 정확히 한 번 전달되고 retryable/terminal/invalid outcome은 아직 안 보낸 bytes를 소비하지 않으며 rejected append는 queue를 변경하지 않습니다.
- Thread 안에서 강화된 핵심 invariant: persistent sent-prefix state, hard logical pending bound, overflow-safe exact-order invariant.
- 남은 한계 또는 후속 Thread에서 보강되는 부분: fake sender는 kernel buffer, actual readiness notification, TCP segmentation이나 peer scheduling을 검증하지 않습니다. de1dd0fc30d0가 real process/slow reader에서 connection-local queue isolation을 보완하고 416efc91e580가 sanitizer로 반복합니다.
- 최종 설명: `a10fe961e2b1`에서 시작한 책임은 commit map 순서대로 상태 owner, failure branch와 cleanup ordering을 추가했고 `f34ab135c546`에서 이 Thread가 정한 검증 또는 운영 상태에 도달합니다. 이전 시점의 미보장은 후속 fix/test SHA를 별도로 연결했으며 final HEAD 상태를 과거 commit에 소급하지 않았습니다.

## 10. 최종 architecture 또는 execution flow 정리

| 단계 | SHA | Caller / callee / state owner | 정상 transition | failure / cleanup transition |
| --- | --- | --- | --- | --- |
| admission | 881e59734a9a | `queueRaw/queueLine` | pending <= limit && append <= limit-pending | reject 시 existing queue/offset unchanged |
| writable call | a10fe961e2b1 / 881e59734a9a | `flushPending` | unsent suffix pointer/length로 SendOperation 호출 | count > requested는 terminal before offset mutation |
| retry outcomes | 881e59734a9a | `flushPending` | EINTR retry, partial positive offset advance | EAGAIN/EWOULDBLOCK/zero는 suffix 보존, EPIPE는 close |
| completion | a10fe961e2b1 | `flushPending` | offset가 size에 도달하면 buffer/offset reset | closeRequested라면 Server가 drain 후 disconnect |
| regression | f34ab135c546 | `ScriptedSender` | exact `abcdefghijkl` captured once | every failure step에서 pending/output assertions |

## 11. 학습 완료 자가 점검

- [x] Commit map의 모든 SHA, subject, importance, tags를 source와 대조했습니다.
- [x] 모든 commit의 exact SHA diff와 변경 파일·symbol을 확인했습니다.
- [x] final HEAD의 함수나 field를 과거 commit 설명에 소급하지 않았습니다.
- [x] S commit은 architecture/invariant, failure, ownership/lifecycle, 후속 fix/test까지 기록했습니다.
- [x] A commit은 주요 subsystem/boundary/failure path와 설계 판단을 기록했습니다.
- [x] B commit은 Thread 흐름에서 맡는 구현 역할과 state 변화를 기록했습니다.
- [x] fix commit의 기존 가정, root cause, 수정 invariant, regression test를 연결했습니다.
- [x] test commit의 production path, technique, 증명/비증명 범위를 구분했습니다.
- [x] Invariant ledger와 responsibility 표를 path/symbol 증거에 연결했습니다.
- [ ] production build/test command를 이 작업 환경에서 직접 실행했습니다. local checkout을 만들 수 없어 code/test inspection과 실행 결과를 분리했으며 pass 결과를 기록하지 않았습니다.
