# Thread 04 — Operational protections and controlled shutdown

부제: 운영 보호와 제어된 종료

## 1. Thread 목표

등록·유휴·PING·명령률·pending output·connection 수를 bounded policy로 만들고, 그 상태를 metrics/log로 관찰하며 signal 이후 final output을 제한된 시간 안에 drain하는 public process behavior를 복원합니다.

Source에서 확정된 significance:

> The server evolves from functional protocol handling into an operable bounded process. Each protection addresses a distinct resource or liveness risk, while shutdown and the executable contract define how those protections appear at the public process boundary. The sequence also provides the failure signals later used to expose reentrant cleanup defects.

이 문서의 source-confirmed 문장은 학습 방향을 고정하기 위한 출발점입니다. 실제 함수 동작, ownership, branch, 실행 결과는 반드시 각 SHA 코드와 test를 직접 확인해 채웁니다.

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
- heartbeat를 wall-clock movement 및 unrelated PONG에서 안전하게 만드는 문제는 후속 thread에서 복구됩니다.
- external process behavior를 brittle하지 않으면서 exact하게 검증하는 문제.

## 3. 완료 기준

- registration/idle/ping/rate/output/connection limit마다 state field, check timing, rejection response, cleanup path를 표로 작성했습니다.
- metrics/log가 사실이 확정되는 authoritative transition에 붙어 있음을 코드로 확인했습니다.
- SIGTERM/SIGINT에서 flag 변경, application shutdown, bounded poll drain, callback detach, stop 순서를 설명할 수 있습니다.
- exact contract suite가 보호 옵션과 shutdown을 public boundary에서 어떻게 검증하는지 증명/비증명 범위까지 기록했습니다.
- heartbeat/config/output failure의 후속 fix thread와 연결을 표시했습니다.

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

Commit 순서는 source에 정의된 순서입니다. 이 문서 안에서 재정렬하지 않습니다.

## 5. Commit별 학습 기록

각 commit에서 final HEAD를 보지 말고 해당 SHA의 tree와 필요한 parent/직전 관련 SHA만 확인합니다. 아래의 implementation anchor는 source에서 확정된 내용이며, code evidence 칸은 학습자가 직접 채웁니다.

### 5.1 `c4df44554866` — `feat(registration): 등록 대기 시간 제한`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | RESILIENCE, LIFECYCLE |
| 원문 확정 역할 | Adds a registration deadline. |
| 학습 깊이 | thread 흐름에서 맡는 구현 역할과 필요한 코드·상태 변화를 확인합니다. S/A와 같은 분량을 강제하지 않습니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Operational protections and controlled shutdown` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- transport acceptance 시 connection time을 client state에 기록하고 main은 각 readiness poll 뒤 `onTick()`을 호출합니다.
- maintenance는 fd snapshot을 순회하며 deadline을 넘긴 미등록 client에 timeout numeric을 queue하고 normal graceful-close path로 보냅니다.
- `--registration-timeout=N`은 positive decimal과 1일 상한을 검증합니다.

Source가 이름을 명시한 확인 대상:

- `main`, `onTick()`, `--registration-timeout=N`, `RuntimeConfig`, `ClientState`

#### 해당 SHA에서 확인할 코드

- connect callback에서 timestamp가 언제 저장되고 registration completion과 어떤 field로 구분되는지 확인합니다.
- main loop의 `pollOnce()`와 `onTick()` 호출 순서, tick 중 disconnect가 발생해도 iteration이 안전한 snapshot 사용을 확인합니다.
- registered client가 timeout 대상에서 제외되는 branch와 deadline 비교식을 기록합니다.
- timeout response, close request, eventual disconnect callback이 기존 cleanup path를 어떻게 재사용하는지 추적합니다.
- option parser가 missing/zero/negative/out-of-range/unknown input을 어디서 거부하는지 확인합니다.

비교 기준:

- 기본 비교: `c4df44554866^` → `c4df44554866`

Source가 지목한 failure/risk 출발점:

> 등록을 끝내지 않는 client가 deadline 없이 남으면 connection map과 registry resource를 무기한 점유합니다.

#### Commit 학습 기록

| 학습 항목 | 학습자 기록 |
| --- | --- |
| Thread 내 구현 역할 | [직전/다음 commit 사이에서 맡는 역할] |
| 확인한 변경 파일·symbol | [필요한 코드만 기록] |
| 핵심 상태 또는 branch | [한두 개의 중요한 변화] |
| failure handling | [의미가 있는 경우만 기록] |
| 다음 commit과의 연결 | [흐름을 이해하는 데 필요한 연결] |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| c4df44554866 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| c4df44554866^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `764361c52b2a` — `feat(heartbeat): 유휴 연결에 PING을 보내고 응답 대기`. 원문 역할은 “Adds idle heartbeat and ping-timeout state.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.2 `764361c52b2a` — `feat(heartbeat): 유휴 연결에 PING을 보내고 응답 대기`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | RESILIENCE, LIFECYCLE, RISK |
| 원문 확정 역할 | Adds idle heartbeat and ping-timeout state. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 thread에서는 heartbeat를 여러 operational protections 중 하나의 liveness/resource policy로 봅니다.

#### Source에서 확정된 implementation anchor

- 모든 received line은 `lastActivityAt`을 갱신하고 idle interval이 지나면 server PING token을 queue합니다.
- client state는 awaiting response 여부와 PING send time을 보유하며 active wait 중 deadline을 넘기면 IRC ERROR와 close request를 발생시킵니다.
- PONG은 pre-registration phase에서도 허용되고 registration timeout이 maintenance의 첫 검사입니다.
- 이 버전은 어떤 PONG도 outstanding heartbeat를 해제하며 exact token correlation은 아직 보장하지 않습니다.

Source가 이름을 명시한 확인 대상:

- `lastActivityAt`, `ClientState`

#### 해당 SHA에서 확인할 코드

- ClientState에 추가된 activity, awaitingPong, ping-sent timestamp, token 관련 필드를 확인합니다.
- line receive 시 activity update와 command dispatch의 순서를 확인합니다.
- `onTick()`에서 registration timeout, awaiting deadline, idle probe 순서와 각 상태 mutation을 상태도로 그립니다.
- PING frame을 queue하기 전후 awaiting state와 send time이 언제 설정되는지 해당 SHA의 순서를 기록합니다.
- PONG handler가 parameter/token을 실제로 검사하는지 확인하고 이 초기 버전의 미보장 범위를 명시합니다.
- idle/ping timeout option이 RuntimeConfig와 application state로 전달되는 경로를 추적합니다.

비교 기준:

- 기본 비교: `764361c52b2a^` → `764361c52b2a`
- Thread 직전 관련 SHA: `c4df44554866` — `feat(registration): 등록 대기 시간 제한`

Source가 지목한 failure/risk 출발점:

> wall-clock 이동 또는 unrelated PONG 수용은 실제 liveness challenge와 상태 해제를 일치시키지 못합니다. 이 위험은 후속 fix에서 복구됩니다.

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
| 764361c52b2a | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 764361c52b2a^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `9e2b214f9227` — `feat(throttle): 클라이언트별 명령 호출 횟수 제한`. 원문 역할은 “Adds a per-client command-rate window.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.3 `9e2b214f9227` — `feat(throttle): 클라이언트별 명령 호출 횟수 제한`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | RESILIENCE |
| 원문 확정 역할 | Adds a per-client command-rate window. |
| 학습 깊이 | thread 흐름에서 맡는 구현 역할과 필요한 코드·상태 변화를 확인합니다. S/A와 같은 분량을 강제하지 않습니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Operational protections and controlled shutdown` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- valid parse 뒤 command dispatch 전 per-client sliding-window limiter가 적용됩니다.
- timestamp deque 앞에서 window 이상 지난 항목을 제거한 뒤 current command를 append하고 초과 시 439와 close를 수행합니다.
- malformed line은 parser limit에 남고 valid-command quota를 소비하지 않으며 count 0은 enforcement disabled입니다.

Source가 이름을 명시한 확인 대상:

- `--rate-limit=COUNT:SECONDS`

#### 해당 SHA에서 확인할 코드

- parser success, activity update, rate-limit check, command dispatch의 정확한 순서를 확인합니다.
- deque pruning condition이 경계 시각을 포함하는지 (`>= window` 등) 실제 비교식으로 기록합니다.
- current timestamp append와 count comparison 순서를 확인해 어느 command가 439를 받는지 계산합니다.
- rate-limit rejection 뒤 offending command가 handler에 도달하지 않는 early return과 close request를 확인합니다.
- `--rate-limit=COUNT:SECONDS` lexical/range validation과 count 0 semantics를 확인합니다.

비교 기준:

- 기본 비교: `9e2b214f9227^` → `9e2b214f9227`
- Thread 직전 관련 SHA: `764361c52b2a` — `feat(heartbeat): 유휴 연결에 PING을 보내고 응답 대기`

Source가 지목한 failure/risk 출발점:

> limiter를 handler별로 적용하거나 malformed input과 valid command를 같은 quota로 처리하면 보호 범위와 protocol behavior가 일관되지 않습니다.

#### Commit 학습 기록

| 학습 항목 | 학습자 기록 |
| --- | --- |
| Thread 내 구현 역할 | [직전/다음 commit 사이에서 맡는 역할] |
| 확인한 변경 파일·symbol | [필요한 코드만 기록] |
| 핵심 상태 또는 branch | [한두 개의 중요한 변화] |
| failure handling | [의미가 있는 경우만 기록] |
| 다음 commit과의 연결 | [흐름을 이해하는 데 필요한 연결] |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| 9e2b214f9227 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 9e2b214f9227^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `d7d85e518177` — `feat(buffer): 송신 대기열 크기 제한`. 원문 역할은 “Bounds each connection's unsent output and propagates queue failure.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.4 `d7d85e518177` — `feat(buffer): 송신 대기열 크기 제한`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | EVENT_IO, RESILIENCE, RISK |
| 원문 확정 역할 | Bounds each connection's unsent output and propagates queue failure. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 thread에서는 slow reader를 connection-scoped failure로 제한하는 operational resource boundary와 failure signal을 봅니다.

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
- Thread 직전 관련 SHA: `9e2b214f9227` — `feat(throttle): 클라이언트별 명령 호출 횟수 제한`
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

- 다음 Thread commit: `adb49d9466e4` — `feat(server): 최대 연결 수 제한`. 원문 역할은 “Bounds the number of live connections.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.5 `adb49d9466e4` — `feat(server): 최대 연결 수 제한`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | RESILIENCE, EVENT_IO |
| 원문 확정 역할 | Bounds the number of live connections. |
| 학습 깊이 | thread 흐름에서 맡는 구현 역할과 필요한 코드·상태 변화를 확인합니다. S/A와 같은 분량을 강제하지 않습니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Operational protections and controlled shutdown` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- accept 성공 뒤 `Connection`, event registration, application state 생성 전에 live connection map 크기를 limit과 비교합니다.
- capacity 초과 fd는 report 후 즉시 close하고 listener accept queue drain은 계속합니다.
- configured value 0은 cap을 비활성화합니다.

Source가 이름을 명시한 확인 대상:

- `accept()`, `Connection`, `--max-connections`

#### 해당 SHA에서 확인할 코드

- accept loop에서 capacity check 위치가 descriptor configuration/ownership transfer보다 앞인지 확인합니다.
- rejected descriptor가 connection map, event manager, client registry 어디에도 들어가지 않는다는 근거를 호출 순서로 기록합니다.
- one rejection이 accept loop 전체를 끝내지 않고 다음 pending socket을 계속 처리하는지 확인합니다.
- `--max-connections`가 Server config로 전달되고 default finite value와 zero semantics가 어디서 정의되는지 확인합니다.

비교 기준:

- 기본 비교: `adb49d9466e4^` → `adb49d9466e4`
- Thread 직전 관련 SHA: `d7d85e518177` — `feat(buffer): 송신 대기열 크기 제한`

Source가 지목한 failure/risk 출발점:

> cap 검사를 ownership transfer 뒤에 하면 rejected client가 downstream registry에 잠시 또는 영구적으로 남을 수 있습니다.

#### Commit 학습 기록

| 학습 항목 | 학습자 기록 |
| --- | --- |
| Thread 내 구현 역할 | [직전/다음 commit 사이에서 맡는 역할] |
| 확인한 변경 파일·symbol | [필요한 코드만 기록] |
| 핵심 상태 또는 branch | [한두 개의 중요한 변화] |
| failure handling | [의미가 있는 경우만 기록] |
| 다음 commit과의 연결 | [흐름을 이해하는 데 필요한 연결] |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| adb49d9466e4 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| adb49d9466e4^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `e05e35ca7da9` — `feat(metrics): 서버 실행 지표 조회 기능 추가`. 원문 역할은 “Makes connection, command, message, queue-drop, and rate-limit state queryable.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.6 `e05e35ca7da9` — `feat(metrics): 서버 실행 지표 조회 기능 추가`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | OBSERVABILITY |
| 원문 확정 역할 | Makes connection, command, message, queue-drop, and rate-limit state queryable. |
| 학습 깊이 | thread 흐름에서 맡는 구현 역할과 필요한 코드·상태 변화를 확인합니다. S/A와 같은 분량을 강제하지 않습니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Operational protections and controlled shutdown` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- `Server::Metrics`는 accepted/closed connections, completed input lines, outbound enqueue failures를 transport transition에서 기록합니다.
- `AppMetrics`는 admitted commands, successful PRIVMSG target operations, rate-limit rejections를 application layer에서 기록합니다.
- `METRICS`는 cumulative counters와 live connection/channel gauges를 한 NOTICE로 projection합니다.

Source가 이름을 명시한 확인 대상:

- `Server::Metrics`, `AppMetrics`, `METRICS`

#### 해당 SHA에서 확인할 코드

- 각 metric field가 증가하는 production 지점을 찾아 “그 사실의 authoritative owner”와 연결합니다.
- historical counter와 current container size에서 계산되는 gauge를 구분합니다.
- PRIVMSG metric이 channel recipient 수가 아니라 resolved target operation당 증가하는 지점을 확인합니다.
- METRICS handler가 Server metrics, AppMetrics, live counts를 어떤 key order와 frame 형식으로 직렬화하는지 확인합니다.
- metric이 control decision에 사용되지 않고 observational인지 caller를 확인합니다.

비교 기준:

- 기본 비교: `e05e35ca7da9^` → `e05e35ca7da9`
- Thread 직전 관련 SHA: `adb49d9466e4` — `feat(server): 최대 연결 수 제한`

Source가 지목한 failure/risk 출발점:

> 같은 live count를 별도 mutable counter로 유지하면 authoritative container와 drift할 수 있습니다.

#### Commit 학습 기록

| 학습 항목 | 학습자 기록 |
| --- | --- |
| Thread 내 구현 역할 | [직전/다음 commit 사이에서 맡는 역할] |
| 확인한 변경 파일·symbol | [필요한 코드만 기록] |
| 핵심 상태 또는 branch | [한두 개의 중요한 변화] |
| failure handling | [의미가 있는 경우만 기록] |
| 다음 commit과의 연결 | [흐름을 이해하는 데 필요한 연결] |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| e05e35ca7da9 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| e05e35ca7da9^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `c34aa18f89af` — `feat(log): 연결 상태와 실행 지표 기록`. 원문 역할은 “Records structured lifecycle, protection, and aggregate metrics events.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.7 `c34aa18f89af` — `feat(log): 연결 상태와 실행 지표 기록`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | OBSERVABILITY, LIFECYCLE |
| 원문 확정 역할 | Records structured lifecycle, protection, and aggregate metrics events. |
| 학습 깊이 | thread 흐름에서 맡는 구현 역할과 필요한 코드·상태 변화를 확인합니다. S/A와 같은 분량을 강제하지 않습니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Operational protections and controlled shutdown` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- structured logger는 `event=<name>` 뒤 key-value fields를 stderr 한 줄에 기록하며 whitespace를 underscore로 정규화합니다.
- startup/error/connect/register/disconnect/channel creation/rate limit/heartbeat timeout 등 사실이 확정되는 transition에서 log를 남깁니다.
- room creation, heartbeat probe, ping timeout metrics가 추가되고 orderly termination에 consolidated `server_metrics` event를 출력합니다.

Source가 이름을 명시한 확인 대상:

- `event=<name>`, `server_metrics`

#### 해당 SHA에서 확인할 코드

- logging helper의 field normalization과 output format을 확인하고 newline/space가 log record를 분할하지 않는지 확인합니다.
- 각 event call site가 state mutation 전인지 후인지 확인해 source에서 확정된 ordering을 표로 작성합니다.
- channel creation log가 insertion success에서만 발생하고 registration log가 registered flag 이후인 위치를 확인합니다.
- final metrics log가 shutdown/disconnect sequence의 어느 지점에 출력되는지 확인합니다.
- logging failure 또는 output이 application behavior를 바꾸지 않는 observational 경계인지 확인합니다.

비교 기준:

- 기본 비교: `c34aa18f89af^` → `c34aa18f89af`
- Thread 직전 관련 SHA: `e05e35ca7da9` — `feat(metrics): 서버 실행 지표 조회 기능 추가`

Source가 지목한 failure/risk 출발점:

> 사실이 확정되기 전에 log/metric을 기록하면 운영 증거가 실제 state와 불일치합니다.

#### Commit 학습 기록

| 학습 항목 | 학습자 기록 |
| --- | --- |
| Thread 내 구현 역할 | [직전/다음 commit 사이에서 맡는 역할] |
| 확인한 변경 파일·symbol | [필요한 코드만 기록] |
| 핵심 상태 또는 branch | [한두 개의 중요한 변화] |
| failure handling | [의미가 있는 경우만 기록] |
| 다음 commit과의 연결 | [흐름을 이해하는 데 필요한 연결] |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| c34aa18f89af | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| c34aa18f89af^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `dd04279c47fd` — `feat(shutdown): 종료 전 송신 대기열 처리`. 원문 역할은 “Replaces immediate signal-time stop with application shutdown and output draining.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.8 `dd04279c47fd` — `feat(shutdown): 종료 전 송신 대기열 처리`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | LIFECYCLE, RESILIENCE, RISK |
| 원문 확정 역할 | Replaces immediate signal-time stop with application shutdown and output draining. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Operational protections and controlled shutdown` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- signal handler는 signal-safe하게 `sig_atomic_t` run flag만 내리고 실제 shutdown은 normal control flow에서 수행합니다.
- application은 client fd snapshot을 만들고 각 client에 `ERROR :Server shutting down`을 queue한 뒤 graceful close를 요청합니다.
- main은 최대 8회의 50 ms poll로 pending output과 disconnect cleanup을 drain한 뒤 callback을 분리하고 `Server::stop()`을 호출합니다.

Source가 이름을 명시한 확인 대상:

- `sig_atomic_t`, `Server::stop()`

#### 해당 SHA에서 확인할 코드

- SIGINT/SIGTERM handler가 호출하는 연산이 flag assignment 외에 없는지 확인합니다.
- main loop가 flag를 관찰한 뒤 application shutdown helper로 넘어가는 호출 순서를 추적합니다.
- fd snapshot, final ERROR queue, close request가 connection마다 어떤 순서로 수행되는지 확인합니다.
- bounded drain loop의 반복 횟수, poll timeout, connection-count 종료 조건을 정확히 기록합니다.
- callbacks detach와 `Server::stop()`/object destruction 순서가 dangling application capture를 막는지 확인합니다.
- non-reading peer 때문에 drain이 끝나지 않을 때 budget expiry 이후 어떤 output이 abandon되는지 미보장 범위로 남깁니다.

비교 기준:

- 기본 비교: `dd04279c47fd^` → `dd04279c47fd`
- Thread 직전 관련 SHA: `c34aa18f89af` — `feat(log): 연결 상태와 실행 지표 기록`

Source가 지목한 failure/risk 출발점:

> signal context에서 직접 object teardown을 수행하거나 무한 drain을 기다리면 async-signal safety와 process termination 모두 깨집니다.

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
| dd04279c47fd | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| dd04279c47fd^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `e5e6c57db80d` — `test(irc): 실행 조건과 오류 동작 계약 검증`. 원문 역할은 “Locks the resulting CLI, wire, timeout, rate, metric, shutdown, and log-order contracts.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.9 `e5e6c57db80d` — `test(irc): 실행 조건과 오류 동작 계약 검증`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | VERIFICATION, IRC_PROTOCOL, RISK |
| 원문 확정 역할 | Locks the resulting CLI, wire, timeout, rate, metric, shutdown, and log-order contracts. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 thread에서는 protection options, shutdown ERROR, metrics/log ordering이 public process contract로 고정되는지 봅니다.

#### Source에서 확정된 implementation anchor

- CLI failure, exact IRC wire behavior, orderly process shutdown을 한 executable contract suite로 규정합니다.
- peer helper는 actual line ending 보존, next-frame sequence, exact/anchored-regex match, peer close, hostmask reconstruction을 지원합니다.
- registration 001–003 order와 CRLF, command numerics, channel events, metric key order, shutdown ERROR/EOF, structured log order를 검증합니다.
- optional manifest는 dynamic values를 normalize하고 stable compatibility contract를 분리합니다.

Source가 이름을 명시한 확인 대상:

- `EINVAL`, `ERROR :Server shutting down`

#### 해당 SHA에서 확인할 코드

- CLI subprocess assertions에서 exit status, stdout emptiness, stderr diagnostic exactness를 case별로 확인합니다.
- socket peer가 substring search 대신 complete frame/next frame/regex/CRLF를 어떻게 판정하는지 helper 구현을 확인합니다.
- 등록, nickname collision, fragmented input, JOIN/LIST/NAMES/TOPIC, modes, messaging, throttle, heartbeat의 assertion이 통과하는 production path를 적습니다.
- SIGTERM 뒤 shutdown ERROR 수신, EOF, process exit, structured log order를 어떤 순서로 기다리는지 확인합니다.
- dynamic port/counter를 exact value가 아닌 regex/normalization으로 다루는 범위를 기록합니다.
- broad live-process test가 증명하지 못하는 deterministic internal failure와 formal fairness 범위를 명시합니다.

비교 기준:

- 기본 비교: `e5e6c57db80d^` → `e5e6c57db80d`
- Thread 직전 관련 SHA: `dd04279c47fd` — `feat(shutdown): 종료 전 송신 대기열 처리`
- 직전 broad smoke `6b4a7738a285`와 assertion precision 및 public boundary 범위를 비교합니다.

Source가 지목한 failure/risk 출발점:

> substring 기반 smoke는 frame 순서, CRLF, parameter 위치, 종료 전달과 log ordering의 회귀를 놓칠 수 있습니다.

#### Test / verification 학습 기록

| 구분 | Source에서 확정된 출발점 | 학습자 코드·실행 기록 |
| --- | --- | --- |
| 대상 production invariant | public executable의 CLI, exact IRC wire, shutdown delivery와 structured log ordering contract | [관련 production path와 symbol을 추가] |
| 재현 failure / boundary | invalid CLI, pre-registration rejection, collision/password failure, exact frame sequence, throttling/heartbeat, SIGTERM drain과 EOF | [입력, state, injected result를 정확히 기록] |
| test technique | subprocess CLI checks + protocol-aware real TCP peer + exact/regex/next-frame/CRLF/close assertions + log-order inspection | [test double/real socket/process의 구성 증거] |
| 통과하는 production code path | binary entrypoint/config → full server/application runtime → shutdown sequence → stderr log | [caller → callee → branch를 해당 SHA에서 연결] |
| 이 test가 증명하는 것 | 명시된 public success/failure 계약과 lifecycle order가 live executable에서 관찰됨 | [실행 결과와 assertion 근거] |
| 이 test가 증명하지 않는 것 | 내부 rare failure branch의 exhaustive coverage, formal fairness/latency, 모든 환경의 dynamic counter exact 값 | [과장하지 않을 범위] |
| test 성격 | broad but exact executable contract test | [broad/deterministic 판단 근거] |
| 막는 회귀 | substring smoke가 놓치던 frame/order/diagnostic/shutdown/log 호환성 회귀 | [후속 변경에서 깨질 수 있는 invariant] |

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
| e5e6c57db80d | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| e5e6c57db80d^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 이 commit은 이 Thread의 마지막 항목입니다. Invariant ledger와 Thread 최종 상태에서 전체 변화를 연결합니다.

## 6. Invariant ledger

| Invariant | 처음 도입 | 강화/적용 | 부족함 또는 위험이 드러난 지점 | Fix/Test 연결 | 학습자 최종 기록 |
| --- | --- | --- | --- | --- | --- |
| 미등록 connection lifetime | c4df44554866 | onTick + fd snapshot | deadline/close ordering 기록 | e5e6c57db80d contract | [학습자 최종 상태 설명] |
| heartbeat wait state | 764361c52b2a | 초기 idle/PING/PONG/timeout state | wall-clock/any-PONG 부족함 표시 | 06 문서의 3f2b3ae1d3f9 / 0c76aad19579 | [학습자 최종 상태 설명] |
| command-rate bound | 9e2b214f9227 | sliding deque window | boundary timestamp와 response-before-close 기록 | e5e6c57db80d | [학습자 최종 상태 설명] |
| pending-output bound | d7d85e518177 | Server bool failure propagation | overflow arithmetic와 synchronous cleanup 위험 표시 | 07/08 문서의 fix/test | [학습자 최종 상태 설명] |
| connection admission bound | adb49d9466e4 | accept 전 capacity check | downstream state 미생성 확인 | contract/smoke option integration | [학습자 최종 상태 설명] |
| observability/shutdown ordering | e05e35ca7da9 | c34aa18f89af, dd04279c47fd | metric/log 시점과 bounded drain 기록 | e5e6c57db80d exact contract | [학습자 최종 상태 설명] |

Ledger 작성 기준:

- “도입”과 “완성”을 같은 의미로 쓰지 않습니다.
- 후속 fix가 이전 commit의 사실을 소급 변경하지 않도록 각 SHA 시점의 보장과 부족함을 분리합니다.
- source가 명시하지 않은 invariant를 추가할 때는 확정 사실이 아니라 학습자의 코드 해석으로 표시하고 path/symbol 증거를 붙입니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 | 실제 failure/risk | Fix 또는 기반 변화 | 수정된 decision/semantics | Test 연결 | 코드 증거 |
| --- | --- | --- | --- | --- | --- |
| functional server면 connection이 계속 남아도 된다는 가정 | 미등록·idle·flood·slow reader가 resource를 무기한 점유 | c4df44554866 / 764361c52b2a / 9e2b214f9227 / d7d85e518177 / adb49d9466e4 | 각 violation을 connection-scoped close로 수렴 | e5e6c57db80d 및 개별 후속 test | [실제 code/test evidence] |
| signal handler에서 즉시 stop/teardown | final output 유실과 async-signal-unsafe 동작 | dd04279c47fd가 flag-only handler + bounded drain 도입 | normal server paths로 disconnect/cleanup 재사용 | e5e6c57db80d의 shutdown ERROR/EOF/log order | [실제 code/test evidence] |
| heartbeat의 any-PONG/wall-clock 가정 | forged response와 clock adjustment가 liveness를 잘못 통과 | 이 thread에서 초기 764361c52b2a 상태를 기록 | 06 문서의 3f2b3ae1d3f9 수정 | 0c76aad19579 regression | [실제 code/test evidence] |

## 8. Ownership / state / responsibility 변화

| 책임 또는 상태 | 이전 상태 | 이후 authoritative 위치 | 관련 commit | 학습자 확인 |
| --- | --- | --- | --- | --- |
| deadline/rate policy | 없음 | `RuntimeConfig` + `ClientState` + `IrcApplication::onTick`/line path | c4df44554866 → 9e2b214f9227 | [확인한 owner/state/lifetime] |
| pending-output protection | unbounded `Connection` queue | `Connection` admission + Server failure propagation | d7d85e518177 | [확인한 owner/state/lifetime] |
| connection admission | accept 후 모두 등록 | Server accept boundary | adb49d9466e4 | [확인한 owner/state/lifetime] |
| runtime counters/log evidence | 없음 | Server/App metrics + structured logger | e05e35ca7da9 → c34aa18f89af | [확인한 owner/state/lifetime] |
| signal shutdown | immediate stop | flag-only signal handler + application drain sequence | dd04279c47fd | [확인한 owner/state/lifetime] |

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
`pollOnce()` → `onTick()` → [registration deadline] → [awaiting PONG deadline] → [idle PING]
[parsed command] → [rate window prune/append/check] → [dispatch 또는 439 + close]
[send] → [pending-byte admission] → [interest refresh] → [success 또는 connection-scoped cleanup]
[SIGTERM flag] → [client fd snapshot] → ERROR queue + close request → bounded polls
→ [disconnect callbacks/channel cleanup] → [final metrics/log] → callback detach → `stop()`
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
