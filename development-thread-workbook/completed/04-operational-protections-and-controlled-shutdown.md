# Thread 04 — Operational protections and controlled shutdown

부제: 운영 보호와 제어된 종료

## 1. Thread 목표

등록·유휴·PING·명령률·pending output·connection 수를 bounded policy로 만들고, 그 상태를 metrics/log로 관찰하며 signal 이후 final output을 제한된 시간 안에 drain하는 public process behavior를 복원합니다.

Source에서 확정된 significance:

> The server evolves from functional protocol handling into an operable bounded process. Each protection addresses a distinct resource or liveness risk, while shutdown and the executable contract define how those protections appear at the public process boundary. The sequence also provides the failure signals later used to expose reentrant cleanup defects.

이 문서의 source-confirmed 문장, commit map, SHA, subject, importance, tags와 원문 역할은 변경하지 않았습니다. 아래 학습 기록은 지정 branch의 각 exact SHA에서 확인한 code diff를 기준으로 작성했습니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 각 timeout/limit은 어떤 authoritative state와 transition에서 적용되는가?
- 보호 정책 위반은 server 전체가 아니라 한 connection의 queued response와 close로 어떻게 수렴하는가?
- pending-output failure가 왜 이후 reentrant cleanup defect를 드러내는 signal이 되는가?
- counter와 gauge는 어느 계층이 기록하며 live container와 중복 source of truth를 만들지 않는가?
- signal handler와 normal control flow의 책임은 어떻게 분리되는가?
- exact executable contract가 CLI, wire, log, shutdown 순서를 어디까지 고정하는가?

### Source와 직접 연결되는 invariant

- registration, idle, ping, rate-limit decision은 coherent per-client state를 사용해야 합니다.
- pending output, connection count, registration time, command rate, heartbeat wait는 bounded 또는 명시적으로 governed되어야 합니다.
- shutdown은 teardown 전에 final protocol error queue를 시도하되 non-reading peer 때문에 무한 대기하지 않아야 합니다.

### Source와 직접 연결되는 engineering difficulty

- 서로 다른 resource/liveness risk를 한 event-loop tick과 connection-scoped cleanup에 통합하는 문제.
- heartbeat를 wall-clock movement 및 unrelated PONG에서 안전하게 만드는 문제는 후속 Thread에서 복구됩니다.
- external process behavior를 brittle하지 않으면서 exact하게 검증하는 문제.

## 3. 완료 기준

- registration/idle/ping/rate/output/connection limit마다 state field, check timing, rejection response, cleanup path를 정리했습니다.
- metrics/log가 사실이 확정되는 authoritative transition에 붙어 있음을 확인했습니다.
- SIGTERM/SIGINT에서 flag 변경, application shutdown, bounded poll drain, callback detach, stop 순서를 설명합니다.
- exact contract suite의 public-boundary 증명/비증명 범위를 기록했습니다.
- heartbeat/config/output failure의 후속 fix Thread와 연결했습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | 원문 확정 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `c4df44554866` | `feat(registration): 등록 대기 시간 제한` | B | RESILIENCE, LIFECYCLE | Adds a registration deadline. |
| 2 | `764361c52b2a` | `feat(heartbeat): 유휴 연결에 PING을 보내고 응답 대기` | A | RESILIENCE, LIFECYCLE, RISK | Adds idle heartbeat and ping-timeout state. |
| 3 | `9e2b214f9227` | `feat(throttle): 클라이언트별 명령 호출 횟수 제한` | B | RESILIENCE | Adds a per-client command-rate window. |
| 4 | `d7d85e518177` | `feat(buffer): 송신 대기열 크기 제한` | A | EVENT_IO, RESILIENCE, RISK | Bounds each connection's unsent output and propagates queue failure. |
| 5 | `adb49d9466e4` | `feat(server): 최대 연결 수 제한` | B | RESILIENCE, EVENT_IO | Bounds the number of live connections. |
| 6 | `e05e35ca7da9` | `feat(metrics): 서버 실행 지표 조회 기능 추가` | B | OBSERVABILITY | Makes connection, command, message, queue-drop, and rate-limit state queryable. |
| 7 | `c34aa18f89af` | `feat(log): 연결 상태와 실행 지표 기록` | B | OBSERVABILITY, LIFECYCLE | Records structured lifecycle, protection, and aggregate metrics events. |
| 8 | `dd04279c47fd` | `feat(shutdown): 종료 전 송신 대기열 처리` | A | LIFECYCLE, RESILIENCE, RISK | Replaces immediate signal-time stop with application shutdown and output draining. |
| 9 | `e5e6c57db80d` | `test(irc): 실행 조건과 오류 동작 계약 검증` | A | VERIFICATION, IRC_PROTOCOL, RISK | Locks the resulting CLI, wire, timeout, rate, metric, shutdown, and log-order contracts. |

Commit 순서는 source에 정의된 순서이며 재정렬하지 않았습니다.

## 5. Commit별 학습 기록

각 기록은 해당 commit의 exact diff에서 확인한 파일·symbol·state와, 필요한 경우 parent/앞선 관련 SHA의 상태 차이를 기준으로 합니다. 후속 commit의 field나 test seam을 이전 commit에 소급하지 않았습니다.

### 5.1 `c4df44554866` — `feat(registration): 등록 대기 시간 제한`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | RESILIENCE, LIFECYCLE |
| 원문 확정 역할 | Adds a registration deadline. |
| 학습 깊이 | Thread 흐름에서 맡는 구체적 구현 역할과 핵심 state/branch만 기록합니다. |

#### Source에서 확정된 역할

> Adds a registration deadline.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| Thread 내 구현 역할 | connect 시 `connectedAt`을 저장하고 main event loop가 각 `pollOnce()` 뒤 `onTick()`을 호출하도록 했습니다. maintenance는 fd snapshot을 돌며 미등록 client의 elapsed time을 검사해 451을 queue하고 normal close path를 요청했습니다. |
| 확인한 변경 파일·symbol | `src/ClientRegistry.hpp — connectedAt`<br>`src/IrcApplication.cpp — onConnect, onTick, maintainClient`<br>`src/main.cpp — pollOnce/onTick order`<br>`src/RuntimeConfig.cpp — --registration-timeout` |
| 핵심 state / branch | registration deadline state는 ClientState가 보유하고 maintenance는 registry의 fd snapshot을 사용해 disconnect 중 iterator invalidation을 피합니다. |
| failure handling | registered client는 검사에서 제외되고 timeout client만 response+close로 수렴합니다. option은 positive decimal과 1일 상한을 요구합니다. |
| 보장과 다음 연결 | 미등록 connection이 registry와 connection map을 무기한 점유하지 못합니다. 764361c52b2a가 같은 maintenance loop에 heartbeat를 추가하고 3f2b3ae1d3f9가 monotonic clock으로 교정합니다. |
| 이 시점의 한계 | 시간 기준은 이 시점의 wall clock이며 엄격한 target-width parsing은 b6c10bc51937 이전에 부족합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `c4df44554866` | `src/IrcApplication.cpp` | `maintainClient registration branch` | 미등록 elapsed deadline → 451 → requestClose |
| `c4df44554866` | `src/main.cpp` | `pollOnce then onTick` | readiness 처리와 policy tick 순서 |

- 조사 방법: GitHub에서 `c4df44554866`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `764361c52b2a` — `feat(heartbeat): 유휴 연결에 PING을 보내고 응답 대기`. 원문 역할은 “Adds idle heartbeat and ping-timeout state.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.2 `764361c52b2a` — `feat(heartbeat): 유휴 연결에 PING을 보내고 응답 대기`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | RESILIENCE, LIFECYCLE, RISK |
| 원문 확정 역할 | Adds idle heartbeat and ping-timeout state. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Adds idle heartbeat and ping-timeout state.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | 등록 deadline 외에는 유휴 연결의 생존 여부를 확인하거나 제거하는 정책이 없었습니다. |
| 주요 문제와 설계 판단 | 모든 received line에서 `lastActivityAt`을 갱신하고, idle client에 PING token을 queue한 뒤 `awaitingPong`과 `lastPingAt`을 기록했습니다. deadline을 넘으면 ERROR를 queue하고 close를 요청했으며 PONG handler가 wait를 해제했습니다. |
| 변경 파일·symbol | `src/ClientRegistry.hpp — awaitingPong, lastActivityAt, lastPingAt`<br>`src/IrcApplication.cpp — onLine, maintainClient, handlePong`<br>`src/RuntimeConfig.cpp — idle/ping options` |
| state / ownership 변화 | maintenance 우선순위는 registration timeout → registered 여부 → awaiting PONG timeout → idle probe입니다. |
| failure 또는 boundary | 초기 구현은 `std::time` wall clock을 사용하고 outstanding token을 저장하지 않아 어떤 PONG도 wait를 해제합니다. |
| 보장 / 비보장 | 보장: idle probe와 timeout이라는 liveness state machine의 최초 정책을 제공합니다.<br>비보장: clock correction과 forged/unrelated PONG에 안전하지 않습니다. |
| 다음 관련 변화 | d710f29f38a4/f313e707474f가 양성 흐름을 먼저 검증하고 3f2b3ae1d3f9/0c76aad19579가 invariant를 수정·고정합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `764361c52b2a` | `src/IrcApplication.cpp` | `maintainClient` | registration → ping timeout → idle PING 순서 |
| `764361c52b2a` | `src/IrcApplication.cpp` | `handlePong` | 초기 버전은 token 검사 없이 awaiting 상태 해제 |

- 조사 방법: GitHub에서 `764361c52b2a`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `9e2b214f9227` — `feat(throttle): 클라이언트별 명령 호출 횟수 제한`. 원문 역할은 “Adds a per-client command-rate window.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.3 `9e2b214f9227` — `feat(throttle): 클라이언트별 명령 호출 횟수 제한`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | RESILIENCE |
| 원문 확정 역할 | Adds a per-client command-rate window. |
| 학습 깊이 | Thread 흐름에서 맡는 구체적 구현 역할과 핵심 state/branch만 기록합니다. |

#### Source에서 확정된 역할

> Adds a per-client command-rate window.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| Thread 내 구현 역할 | ClientState에 command timestamp deque를 두고 parsed command마다 오래된 항목을 제거한 후 현재 시각을 추가했습니다. window 내 count가 설정값을 넘으면 439를 queue하고 close를 요청했습니다. |
| 확인한 변경 파일·symbol | `src/ClientRegistry.hpp — commandWindow`<br>`src/IrcApplication.cpp — recordCommand/onLine`<br>`src/RuntimeConfig.cpp — --rate-limit` |
| 핵심 state / branch | rate window는 client별로 독립이며 parser가 frame을 command로 인정한 뒤에만 기록됩니다. |
| failure handling | 초과 client만 close path로 보내고 server 전체나 다른 client state는 유지합니다. |
| 보장과 다음 연결 | 명령 호출량이 구성된 count/window 아래에서 connection 단위로 governed됩니다. e05e35ca7da9/c34aa18f89af가 limit event를 지표와 로그로 관찰 가능하게 합니다. |
| 이 시점의 한계 | 초기 timestamp는 wall-clock 기반이고 rate-count parsing의 target-width overflow는 b6c10bc51937 전까지 남습니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `9e2b214f9227` | `src/IrcApplication.cpp` | `recordCommand` | old timestamp eviction → current push → count compare |
| `9e2b214f9227` | `src/IrcApplication.cpp` | `onLine rate branch` | parsed command 초과를 439와 close로 수렴 |

- 조사 방법: GitHub에서 `9e2b214f9227`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `d7d85e518177` — `feat(buffer): 송신 대기열 크기 제한`. 원문 역할은 “Bounds each connection's unsent output and propagates queue failure.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.4 `d7d85e518177` — `feat(buffer): 송신 대기열 크기 제한`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | EVENT_IO, RESILIENCE, RISK |
| 원문 확정 역할 | Bounds each connection's unsent output and propagates queue failure. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Bounds each connection's unsent output and propagates queue failure.

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

- 다음 Thread commit: `adb49d9466e4` — `feat(server): 최대 연결 수 제한`. 원문 역할은 “Bounds the number of live connections.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.5 `adb49d9466e4` — `feat(server): 최대 연결 수 제한`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | RESILIENCE, EVENT_IO |
| 원문 확정 역할 | Bounds the number of live connections. |
| 학습 깊이 | Thread 흐름에서 맡는 구체적 구현 역할과 핵심 state/branch만 기록합니다. |

#### Source에서 확정된 역할

> Bounds the number of live connections.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| Thread 내 구현 역할 | accept 직후 현재 connection count와 configured maximum을 비교해 초과 fd를 event registration/map ownership 이전에 거부하고 닫았습니다. |
| 확인한 변경 파일·symbol | `include/Server.hpp — maxConnections config/metrics`<br>`src/Server.cpp — acceptReadyClients, rejectReadyClient`<br>`src/RuntimeConfig.cpp — --max-connections` |
| 핵심 state / branch | 거부된 raw fd는 임시 accept scope가 닫고 Server connection map이나 application registry에 들어가지 않습니다. |
| failure handling | limit 도달은 server-level exception이 아니라 해당 incoming connection만 drop/reject하는 정상 보호 branch입니다. |
| 보장과 다음 연결 | live transport connection 수가 명시된 최대값을 넘지 않습니다. e05e35ca7da9가 live/accepted/rejected 수를 metrics로 노출하고 contract test가 public option을 검증합니다. |
| 이 시점의 한계 | listen backlog와 OS fd limit, 순간 accept rate 자체의 보장은 아닙니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `adb49d9466e4` | `src/Server.cpp` | `acceptReadyClients/rejectReadyClient` | map 편입 전 connection-limit 판정과 raw fd close |

- 조사 방법: GitHub에서 `adb49d9466e4`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `e05e35ca7da9` — `feat(metrics): 서버 실행 지표 조회 기능 추가`. 원문 역할은 “Makes connection, command, message, queue-drop, and rate-limit state queryable.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.6 `e05e35ca7da9` — `feat(metrics): 서버 실행 지표 조회 기능 추가`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | OBSERVABILITY |
| 원문 확정 역할 | Makes connection, command, message, queue-drop, and rate-limit state queryable. |
| 학습 깊이 | Thread 흐름에서 맡는 구체적 구현 역할과 핵심 state/branch만 기록합니다. |

#### Source에서 확정된 역할

> Makes connection, command, message, queue-drop, and rate-limit state queryable.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| Thread 내 구현 역할 | Server transport metrics와 IrcApplication metrics를 각각 authoritative transition에서 누적하고 `METRICS` command가 fixed-order `key=value` 값을 반환하도록 했습니다. |
| 확인한 변경 파일·symbol | `include/Server.hpp — Metrics`<br>`src/IrcApplication.hpp — AppMetrics`<br>`src/IrcApplication.cpp/ApplicationSupport.cpp — counters and METRICS` |
| 핵심 state / branch | live connection 같은 gauge는 server container에서 읽고 event count는 실제 transition 직후 증가해 별도 mutable source of truth를 만들지 않습니다. |
| failure handling | queue rejection/rate limit/idle timeout도 성공 경로와 분리된 counter로 기록됩니다. |
| 보장과 다음 연결 | 운영 보호 결과와 command/message activity를 query 가능한 stable field set으로 노출합니다. c34aa18f89af가 같은 authoritative transitions를 structured log로 남기고 e5e6c57db80d가 ordering/shape를 고정합니다. |
| 이 시점의 한계 | 지표는 in-process 누적값이며 persistent monitoring/storage나 latency 분포를 제공하지 않습니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `e05e35ca7da9` | `include/Server.hpp` | `Server::Metrics` | transport transition counter owner |
| `e05e35ca7da9` | `src/IrcApplication.cpp` | `METRICS handling` | server/app 수치를 고정 순서 response로 구성 |

- 조사 방법: GitHub에서 `e05e35ca7da9`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `c34aa18f89af` — `feat(log): 연결 상태와 실행 지표 기록`. 원문 역할은 “Records structured lifecycle, protection, and aggregate metrics events.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.7 `c34aa18f89af` — `feat(log): 연결 상태와 실행 지표 기록`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | OBSERVABILITY, LIFECYCLE |
| 원문 확정 역할 | Records structured lifecycle, protection, and aggregate metrics events. |
| 학습 깊이 | Thread 흐름에서 맡는 구체적 구현 역할과 핵심 state/branch만 기록합니다. |

#### Source에서 확정된 역할

> Records structured lifecycle, protection, and aggregate metrics events.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| Thread 내 구현 역할 | 공백을 underscore로 정규화한 `key=value` structured log helper를 만들고 connect/register/disconnect/rate-limit/timeout/metrics/shutdown의 확정 시점에 event를 기록했습니다. |
| 확인한 변경 파일·symbol | `src/ApplicationSupport.cpp/IrcApplication.cpp — structured log helpers and call sites` |
| 핵심 state / branch | 로그는 state를 소유하지 않고 authoritative mutation 직후 그 결과를 직렬화합니다. |
| failure handling | 사용자 제공 reason/nick의 공백은 한 field를 깨지 않도록 escape/normalize되고 missing state에서는 추측한 identity를 기록하지 않습니다. |
| 보장과 다음 연결 | lifecycle 및 protection event의 machine-readable ordering을 관찰할 수 있습니다. dd04279c47fd의 shutdown ordering과 e5e6c57db80d contract test가 final log sequence를 검증합니다. |
| 이 시점의 한계 | logger failure 격리나 durability/rotation은 이 프로젝트 범위에서 보장하지 않습니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `c34aa18f89af` | `src/ApplicationSupport.cpp` | `log event/value sanitization` | 공백 없는 key=value record 생성 |
| `c34aa18f89af` | `src/IrcApplication.cpp` | `lifecycle/protection log call sites` | 확정 mutation 뒤 event 기록 |

- 조사 방법: GitHub에서 `c34aa18f89af`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `dd04279c47fd` — `feat(shutdown): 종료 전 송신 대기열 처리`. 원문 역할은 “Replaces immediate signal-time stop with application shutdown and output draining.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.8 `dd04279c47fd` — `feat(shutdown): 종료 전 송신 대기열 처리`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | LIFECYCLE, RESILIENCE, RISK |
| 원문 확정 역할 | Replaces immediate signal-time stop with application shutdown and output draining. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Replaces immediate signal-time stop with application shutdown and output draining.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | SIGINT/SIGTERM이 server를 즉시 멈춰 queued protocol output과 disconnect cleanup을 건너뛸 수 있었습니다. |
| 주요 문제와 설계 판단 | signal handler는 async-signal-safe flag만 변경하고 normal loop가 `IrcApplication::shutdown()`으로 각 client에 final ERROR를 queue·close 요청한 뒤 최대 8회, 각 50ms poll로 pending output을 drain하도록 했습니다. 그 후 callback을 detach하고 server를 stop했습니다. |
| 변경 파일·symbol | `src/main.cpp — signal flag, main loop shutdown/drain order`<br>`src/IrcApplication.cpp — shutdown` |
| state / ownership 변화 | shutdown transition은 signal context가 아니라 main control flow가 소유하며 connection은 final queue가 비거나 bounded drain budget가 끝날 때까지 Server map에 남습니다. |
| failure 또는 boundary | 읽지 않는 peer가 있어도 8×50ms 이후 teardown으로 진행해 무한 대기를 막습니다. queue 실패는 해당 connection cleanup으로 즉시 수렴할 수 있습니다. |
| 보장 / 비보장 | 보장: 종료 전에 final protocol output을 시도하면서 process termination latency를 제한합니다.<br>비보장: 모든 peer가 ERROR를 실제 수신한다는 보장은 없고 drain budget 이후 unsent bytes는 teardown됩니다. |
| 다음 관련 변화 | e5e6c57db80d가 signal→ERROR→close/log ordering을 public process boundary에서 검증합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `dd04279c47fd` | `src/main.cpp` | `signal handler and shutdown sequence` | signal flag → application shutdown → bounded poll drain → callback detach/stop |
| `dd04279c47fd` | `src/IrcApplication.cpp` | `IrcApplication::shutdown` | client snapshot에 ERROR queue와 close request |

- 조사 방법: GitHub에서 `dd04279c47fd`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `e5e6c57db80d` — `test(irc): 실행 조건과 오류 동작 계약 검증`. 원문 역할은 “Locks the resulting CLI, wire, timeout, rate, metric, shutdown, and log-order contracts.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.9 `e5e6c57db80d` — `test(irc): 실행 조건과 오류 동작 계약 검증`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | VERIFICATION, IRC_PROTOCOL, RISK |
| 원문 확정 역할 | Locks the resulting CLI, wire, timeout, rate, metric, shutdown, and log-order contracts. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Locks the resulting CLI, wire, timeout, rate, metric, shutdown, and log-order contracts.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | broad smoke는 주요 기능 조합을 보여 주었지만 CLI 실패, exact frame/CRLF/numeric order, timeout/rate/metrics/shutdown/log ordering을 정밀하게 고정하지 못했습니다. |
| 주요 문제와 설계 판단 | `tests/irc_contract.py` 중심의 executable contract suite를 추가해 process startup 오류, runtime options, exact/regex wire frames, protection responses, metrics field order, graceful shutdown 및 log order를 manifest와 assertion으로 검사했습니다. |
| 변경 파일·symbol | `tests/irc_contract.py — CLI and wire contract checks`<br>`Makefile — contract/test integration` |
| state / ownership 변화 | test가 server process, sockets, manifest, logs와 expected frames를 소유하며 dynamic fd/token 같은 값만 regex로 허용합니다. |
| failure 또는 boundary | invalid/missing option과 runtime timeout/rate/queue/shutdown boundary를 subprocess return code, exact line, close 및 log event로 관찰합니다. |
| 보장 / 비보장 | 보장: public CLI·wire·shutdown·observability contract의 성공/실패 shape와 ordering을 broad substring 수준보다 정확히 고정합니다.<br>비보장: rare syscall return, event add/update failure, pointer lifetime, formal fairness는 직접 주입하지 않습니다. |
| 다음 관련 변화 | b6c10bc51937/5d1286620994가 parser width 결함을 수정·검증하고 f34ab/928/5ed가 low-level deterministic failure를 추가합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `e5e6c57db80d` | `tests/irc_contract.py` | `CLI checks and record_exact/record_regex` | 정적 frame은 exact, 동적 값만 제한된 regex로 검증 |
| `e5e6c57db80d` | `tests/irc_contract.py` | `wire/shutdown/log scenarios` | timeout·rate·metrics·shutdown public ordering |

- 조사 방법: GitHub에서 `e5e6c57db80d`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### Test / verification 학습 기록

| 구분 | 역사 복원 기록 |
| --- | --- |
| 대상 production invariant | 문서화된 CLI syntax, IRC frame/CRLF/numeric ordering, protection response, metrics와 shutdown/log ordering이 public boundary와 일치합니다. |
| 재현 failure / boundary | missing/invalid args, registration/heartbeat/rate/output limits, exact numerics, signal shutdown과 final ERROR입니다. |
| test technique | compiled server subprocess + real loopback TCP + exact/limited-regex assertions + captured logs/manifest입니다. |
| 통과하는 production path | argv parser → Server/IrcApplication runtime policy → wire output → signal flag → shutdown/drain → logs입니다. |
| 이 test가 증명하는 것 | 외부 사용자가 관찰하는 성공·실패 frame과 ordering을 정확히 고정합니다. |
| 이 test가 증명하지 않는 것 | 모든 syscall/event failure, memory safety, formal latency·fairness, 내부 lifetime 안전성은 증명하지 않습니다. |
| test 성격 | exact process and wire contract integration |
| 막는 회귀 | CLI가 sign/whitespace를 허용하거나 numeric/CRLF/order/shutdown log contract가 변하는 회귀를 막습니다. |

실행 기록:

- 실행 SHA: `e5e6c57db80d`
- repository에 정의된 실행 명령: `python3 tests/irc_contract.py ./irc-relay-server` 또는 해당 Make target
- 현재 작업 환경 실행 여부: **미실행**
- 이유: 현재 런타임에서 외부 DNS가 차단되어 지정 branch의 local checkout을 만들 수 없었습니다. GitHub 연결 도구로 해당 SHA의 production/test diff와 test mechanism은 확인했지만, binary/test command의 성공 결과를 만들거나 추정하지 않았습니다.
- 실행 결과: 기록 없음

#### 다음 연결

- 이 commit은 이 Thread의 마지막 항목입니다. 아래 Invariant ledger와 Thread 최종 상태에서 전체 변화를 연결합니다.

## 6. Invariant ledger

| Invariant | 처음 도입 | 강화/적용 | 학습자 최종 기록 | Fix/Test 연결 |
| --- | --- | --- | --- | --- |
| registration deadline | `c4df44554866` | onTick snapshot maintenance | 미등록 client만 deadline 뒤 451+close로 수렴합니다. | e5e6c57db80d public contract |
| heartbeat liveness | `764361c52b2a` | initial idle PING/PONG | 초기에는 wall-clock/any-PONG이라는 부족함이 있습니다. | 3f2b3ae1d3f9/0c76aad19579가 수정·검증 |
| command-rate bound | `9e2b214f9227` | per-client timestamp window | 초과 actor만 439+close 처리합니다. | e05e35ca7da9/c34aa18f89af 관찰, e5e6c57db80d contract |
| output/connection bounds | `d7d85e518177` | adb49d9466e4 | logical pending bytes와 live connection 수를 제한합니다. | 881e59734a9a/f34ab135c546 arithmetic fix/test |
| observable controlled shutdown | `e05e35ca7da9` | c34aa18f89af, dd04279c47fd | metrics/log와 bounded final-output drain을 연결합니다. | e5e6c57db80d exact process contract |

도입과 완성을 같은 의미로 쓰지 않았습니다. 후속 fix가 이전 SHA의 사실을 바꾸지 않도록 각 시점의 보장과 부족함을 분리했습니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 | 실제 failure / risk | Fix 또는 기반 변화 | 수정된 decision / semantics | Test 연결 |
| --- | --- | --- | --- | --- |
| functional server는 무제한 resource를 감당 | 미등록·slow reader·connection flood가 state/memory/fd 점유 | c4df44554866 / d7d85e518177 / adb49d9466e4 | 각 resource를 connection-scoped bound로 제한 | e5e6c57db80d |
| wall-clock 및 any PONG이면 충분 | clock 이동·forged PONG으로 liveness 오판 | 3f2b3ae1d3f9 | steady_clock + exact token | 0c76aad19579 |
| signal에서 즉시 stop | queued final output과 cleanup 유실 | dd04279c47fd | flag-only handler와 bounded normal-flow drain | e5e6c57db80d |

## 8. Ownership / state / responsibility 변화

| 책임 또는 상태 | 이전 상태 | 이후 authoritative 위치 | 관련 commit | 확인 결과 |
| --- | --- | --- | --- | --- |
| registration/rate/heartbeat state | 없음 | ClientState + IrcApplication maintenance | c4df44554866 → 9e2b214f9227 | path/symbol은 위 commit 증거표에 연결했습니다. |
| unsent-output bound | 무제한 Connection queue | Connection maxPendingBytes | d7d85e518177 | path/symbol은 위 commit 증거표에 연결했습니다. |
| live-connection bound | listener가 모두 수락 | Server accept policy | adb49d9466e4 | path/symbol은 위 commit 증거표에 연결했습니다. |
| transport/app metrics | 관찰 불가 | Server::Metrics / AppMetrics | e05e35ca7da9 | path/symbol은 위 commit 증거표에 연결했습니다. |
| shutdown orchestration | signal-time immediate stop | main normal control flow + IrcApplication::shutdown | dd04279c47fd | path/symbol은 위 commit 증거표에 연결했습니다. |

## 9. Thread 최종 상태

- 시작 직전 상태: transport를 받아 놓고 등록을 끝내지 않는 client를 제거할 deadline이 없었습니다.
- 마지막 commit `e5e6c57db80d` 시점의 상태: public CLI·wire·shutdown·observability contract의 성공/실패 shape와 ordering을 broad substring 수준보다 정확히 고정합니다.
- Thread 안에서 강화된 핵심 invariant: registration deadline, heartbeat liveness, command-rate bound, output/connection bounds, observable controlled shutdown.
- 남은 한계 또는 후속 Thread에서 보강되는 부분: rare syscall return, event add/update failure, pointer lifetime, formal fairness는 직접 주입하지 않습니다. b6c10bc51937/5d1286620994가 parser width 결함을 수정·검증하고 f34ab/928/5ed가 low-level deterministic failure를 추가합니다.
- 최종 설명: `c4df44554866`에서 시작한 책임은 commit map 순서대로 상태 owner, failure branch와 cleanup ordering을 추가했고 `e5e6c57db80d`에서 이 Thread가 정한 검증 또는 운영 상태에 도달합니다. 이전 시점의 미보장은 후속 fix/test SHA를 별도로 연결했으며 final HEAD 상태를 과거 commit에 소급하지 않았습니다.

## 10. 최종 architecture 또는 execution flow 정리

| 단계 | SHA | Caller / callee / state owner | 정상 transition | failure / cleanup transition |
| --- | --- | --- | --- | --- |
| connection/command event | c4df44554866 / 9e2b214f9227 | `Server callbacks/IrcApplication` | ClientState timestamps/window 갱신 | deadline/rate 초과는 response+requestClose |
| output admission | d7d85e518177 | `IrcApplication send helper` | Server.sendTo → Connection queue | limit 초과는 false+connection close |
| accept admission | adb49d9466e4 | `Server::acceptReadyClients` | count 확인 후 map/backend 편입 | limit 도달 raw fd는 편입 전 close |
| observability | e05e35ca7da9 / c34aa18f89af | `authoritative transition` | counter/gauge와 key=value log | 실패 branch도 별도 metric/event |
| signal shutdown | dd04279c47fd | `signal flag/main loop` | ERROR queue → close request → 8×50ms drain → detach/stop | budget 만료 후 unsent bytes는 teardown |

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
