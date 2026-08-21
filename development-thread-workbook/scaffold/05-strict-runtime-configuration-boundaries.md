# Thread 05 — Strict runtime configuration boundaries

부제: 엄격한 런타임 구성 경계

## 1. Thread 목표

CLI 문자열을 실제 destination type과 operational bound에 정확히 맞는 값으로 바꾸는 경계를 복원하고, permissive C conversion과 narrowing의 결함이 digit-by-digit parser 및 cross-width regression으로 어떻게 수정되는지 학습합니다.

Source에서 확정된 significance:

> The public configuration surface initially relied on conversion functions whose accepted syntax and intermediate width did not exactly match the documented contract. The fix moves range checking into digit-by-digit accumulation against the destination type, and the follow-up tests preserve that cross-platform boundary without treating the test itself as a second architectural decision.

이 문서의 source-confirmed 문장은 학습 방향을 고정하기 위한 출발점입니다. 실제 함수 동작, ownership, branch, 실행 결과는 반드시 각 SHA 코드와 test를 직접 확인해 채웁니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 초기 `RuntimeConfig`와 `Server::Config`의 책임은 어떻게 구분되는가?
- `strtol`/`strtoul`의 accepted syntax와 intermediate width가 public contract와 어디서 어긋나는가?
- 곱셈·덧셈 전에 overflow를 증명하는 비교식은 무엇인가?
- port, timeout, `std::size_t` option이 각 destination maximum을 직접 사용하는가?
- 32/64-bit 모두에서 first-unrepresentable size를 test가 어떻게 계산하는가?

### Source와 직접 연결되는 invariant

- accepted numeric option은 실제 socket, buffer, connection, timing limit을 지배하는 destination type에 정확히 representable해야 합니다.
- public CLI syntax는 non-empty ASCII decimal이라는 확정 계약과 일치해야 하며 sign/whitespace를 암묵적으로 허용해서는 안 됩니다.

### Source와 직접 연결되는 engineering difficulty

- external input을 intermediate C integer semantics에 맡기지 않고 target-width에서 overflow 없이 검증하는 문제.
- host width가 달라도 같은 representability invariant를 검증하는 test boundary 설계.

## 3. 완료 기준

- 초기 parser가 허용/거부하는 입력을 해당 SHA 코드로 정확히 정리했습니다.
- old conversion+narrowing과 new bounded accumulation을 parent diff와 숫자 예제로 비교했습니다.
- sign, whitespace, exact maximum, maximum+1, extremely long decimal의 control flow를 설명할 수 있습니다.
- CLI contract test와 boundary regression이 각각 무엇을 증명하는지 구분했습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | 원문 확정 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `52b6f1ce8f0f` | `feat(config): 기본 실행 인자 해석 모듈 구성` | B | BUILD, RESILIENCE | Establishes the initial RuntimeConfig parsing boundary. |
| 2 | `e5e6c57db80d` | `test(irc): 실행 조건과 오류 동작 계약 검증` | A | VERIFICATION, IRC_PROTOCOL, RISK | Records exact CLI success and failure behavior as an executable contract. |
| 3 | `b6c10bc51937` | `fix(config): 서버 크기 옵션을 오버플로 없이 해석` | A | DEBUG, RESILIENCE, RISK | Replaces permissive C conversion with overflow-safe, target-width decimal parsing. |
| 4 | `5d1286620994` | `test(config): 크기 옵션 경계와 오류 입력 검증` | B | VERIFICATION, RESILIENCE, RISK | Covers signs, whitespace, port narrowing, timeout bounds, size_t overflow, and rate-count overflow. |

Commit 순서는 source에 정의된 순서입니다. 이 문서 안에서 재정렬하지 않습니다.

## 5. Commit별 학습 기록

각 commit에서 final HEAD를 보지 말고 해당 SHA의 tree와 필요한 parent/직전 관련 SHA만 확인합니다. 아래의 implementation anchor는 source에서 확정된 내용이며, code evidence 칸은 학습자가 직접 채웁니다.

### 5.1 `52b6f1ce8f0f` — `feat(config): 기본 실행 인자 해석 모듈 구성`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | BUILD, RESILIENCE |
| 원문 확정 역할 | Establishes the initial RuntimeConfig parsing boundary. |
| 학습 깊이 | thread 흐름에서 맡는 구현 역할과 필요한 코드·상태 변화를 확인합니다. S/A와 같은 분량을 강제하지 않습니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Strict runtime configuration boundaries` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- `RuntimeConfig`는 transport bind config와 별도로 rate, idle/ping, registration timeout 기본 정책을 보유합니다.
- 초기 port parser는 `strtol` complete-consumption/range check를 사용하며 required `<port> <password>` 형태만 허용합니다.
- optional flags는 아직 실제 Server config를 변경하지 않는 scaffold 단계입니다.

Source가 이름을 명시한 확인 대상:

- `strtol`, `<port> <password>`, `Server::Config`

#### 해당 SHA에서 확인할 코드

- RuntimeConfig fields와 default constants를 확인하고 transport `Server::Config`와 소유 책임을 구분합니다.
- port parsing에서 end pointer, range, zero/negative, empty/trailing input을 검사하는 code path를 기록합니다.
- argument count와 first unknown extra argument diagnostic이 usage contract와 일치하는지 확인합니다.
- 이 SHA에서 optional config가 아직 mutation되지 않는 범위를 분명히 적어 후속 완성 상태를 소급하지 않습니다.

비교 기준:

- 기본 비교: `52b6f1ce8f0f^` → `52b6f1ce8f0f`

Source가 지목한 failure/risk 출발점:

> `strtol`의 permissive lexical behavior와 intermediate type width가 최종 destination type의 엄격한 계약과 다를 수 있습니다.

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
| 52b6f1ce8f0f | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 52b6f1ce8f0f^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `e5e6c57db80d` — `test(irc): 실행 조건과 오류 동작 계약 검증`. 원문 역할은 “Records exact CLI success and failure behavior as an executable contract.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.2 `e5e6c57db80d` — `test(irc): 실행 조건과 오류 동작 계약 검증`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | VERIFICATION, IRC_PROTOCOL, RISK |
| 원문 확정 역할 | Records exact CLI success and failure behavior as an executable contract. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 thread에서는 strict numeric parser fix 전에 CLI success/failure behavior를 고정한 executable specification으로 봅니다.

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
- Thread 직전 관련 SHA: `52b6f1ce8f0f` — `feat(config): 기본 실행 인자 해석 모듈 구성`
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

- 다음 Thread commit: `b6c10bc51937` — `fix(config): 서버 크기 옵션을 오버플로 없이 해석`. 원문 역할은 “Replaces permissive C conversion with overflow-safe, target-width decimal parsing.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.3 `b6c10bc51937` — `fix(config): 서버 크기 옵션을 오버플로 없이 해석`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | DEBUG, RESILIENCE, RISK |
| 원문 확정 역할 | Replaces permissive C conversion with overflow-safe, target-width decimal parsing. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Strict runtime configuration boundaries` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- `strtol`/`strtoul` 후 narrowing cast를 없애고 destination type maximum을 직접 받는 digit-by-digit decimal parser를 도입합니다.
- 각 digit 전에 `maximum / 10`, `maximum % 10`과 비교해 `parsed * 10 + digit`이 representable함을 증명합니다.
- non-empty ASCII digits만 허용하므로 sign과 surrounding whitespace도 거부하며 port, size_t, timeout이 각 실제 범위로 parse됩니다.

Source가 이름을 명시한 확인 대상:

- `strtol`, `strtoul`, `parsed * 10 + digit`, `maximum / 10`, `maximum % 10`, `unsigned short`, `std::size_t`

#### 해당 SHA에서 확인할 코드

- generic 또는 type-directed parser의 template/function signature와 maximum 전달 방식을 확인합니다.
- loop에서 non-digit rejection, multiplication 전 overflow check, final accumulation 순서를 한 digit 예제로 계산합니다.
- exact maximum, maximum+1, 매우 긴 decimal, leading zero가 각각 어떤 결과를 내는지 코드 조건으로 설명합니다.
- port가 `unsigned short` 범위 안에서 직접 parse된 뒤 zero를 별도로 거부하는지 확인합니다.
- size options가 `std::size_t` maximum, timeout이 86,400 상한을 사용하며 narrowing cast가 남지 않는지 검색합니다.
- old `strto*` path와 비교해 sign/whitespace acceptance가 root cause 차원에서 사라졌는지 확인합니다.

비교 기준:

- 기본 비교: `b6c10bc51937^` → `b6c10bc51937`
- Thread 직전 관련 SHA: `e5e6c57db80d` — `test(irc): 실행 조건과 오류 동작 계약 검증`
- contract test `e5e6c57db80d`가 드러낸 public boundary를 수정하고 `5d1286620994`가 경계를 고정합니다.

Source가 지목한 failure/risk 출발점:

> 중간 signed/unsigned 타입에서 overflow하거나 representable하지 않은 값을 cast하면 최종 resource limit이 작게 wrap되거나 implementation-dependent해집니다.

#### Failure → root cause → fix → test 기록

| Fix 추적 항목 | 기록 |
| --- | --- |
| 기존 가정 | `strto*`가 성공하고 이후 cast하면 destination option type에도 안전하다는 가정 |
| 실제 failure 또는 위험 | 중간 signed/unsigned 타입에서 overflow하거나 representable하지 않은 값을 cast하면 최종 resource limit이 작게 wrap되거나 implementation-dependent해집니다. |
| root cause | accepted lexical form과 intermediate integer width가 실제 destination type/strict CLI contract와 일치하지 않음 |
| 수정된 invariant / decision | 각 digit는 destination maximum을 기준으로 곱셈·덧셈 전에 representability가 증명되어야 함 |
| 실제 수정 코드 | [parent/current diff의 path, symbol, branch, mutation 순서] |
| cleanup / failure propagation | [실패가 어느 owner와 callback을 거쳐 수렴하는지] |
| regression test 연결 | `5d1286620994`의 sign/space/width/very-long input regression |
| fix가 보장하는 것 | [코드와 test가 직접 입증하는 범위] |
| fix가 보장하지 않는 것 | [transactionality, fairness, 다른 layer 등 미보장 범위] |
| 학습자의 root-cause 설명 | [증상 → 원인 → 수정 → 검증을 직접 작성] |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| b6c10bc51937 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| b6c10bc51937^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `5d1286620994` — `test(config): 크기 옵션 경계와 오류 입력 검증`. 원문 역할은 “Covers signs, whitespace, port narrowing, timeout bounds, size_t overflow, and rate-count overflow.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.4 `5d1286620994` — `test(config): 크기 옵션 경계와 오류 입력 검증`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | VERIFICATION, RESILIENCE, RISK |
| 원문 확정 역할 | Covers signs, whitespace, port narrowing, timeout bounds, size_t overflow, and rate-count overflow. |
| 학습 깊이 | thread 흐름에서 맡는 구현 역할과 필요한 코드·상태 변화를 확인합니다. S/A와 같은 분량을 강제하지 않습니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Strict runtime configuration boundaries` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- port/timeout은 explicit plus/minus, leading/trailing space, width overflow, extremely long decimal을 거부해야 합니다.
- size options test는 runtime pointer width로 `2^(pointer width)`를 계산해 첫 unrepresentable `std::size_t` 값을 만듭니다.
- connection limit의 sign/whitespace와 established diagnostic도 별도로 검증합니다.

Source가 이름을 명시한 확인 대상:

- `2^(pointer width)`, `std::size_t`, `struct.calcsize("P")`

#### 해당 SHA에서 확인할 코드

- test가 host pointer width를 `struct.calcsize("P")`로 얻고 first-unrepresentable 값을 만드는 계산을 확인합니다.
- 각 CLI case의 argv, expected exit status, stdout/stderr contract를 표로 정리합니다.
- 32-bit와 64-bit 모두에서 valid한 이유와 특정 literal maximum을 hard-code하지 않은 이유를 기록합니다.
- test input이 `b6c10bc51937`의 overflow-safe branch와 lexical rejection branch를 각각 통과하는 production path를 연결합니다.

비교 기준:

- 기본 비교: `5d1286620994^` → `5d1286620994`
- Thread 직전 관련 SHA: `b6c10bc51937` — `fix(config): 서버 크기 옵션을 오버플로 없이 해석`

Source가 지목한 failure/risk 출발점:

> host width를 가정한 test는 다른 architecture에서 실제 destination boundary를 검증하지 못합니다.

#### Test / verification 학습 기록

| 구분 | Source에서 확정된 출발점 | 학습자 코드·실행 기록 |
| --- | --- | --- |
| 대상 production invariant | 모든 accepted numeric option이 destination type에 representable하고 strict decimal syntax를 따르는 invariant | [관련 production path와 symbol을 추가] |
| 재현 failure / boundary | sign, whitespace, port/timeout overflow, very long decimal, first unrepresentable size_t/rate count | [입력, state, injected result를 정확히 기록] |
| test technique | CLI subprocess contract + runtime pointer-width 기반 boundary input 생성 | [test double/real socket/process의 구성 증거] |
| 통과하는 production code path | argv → strict decimal parser → option-specific bound → startup diagnostic/exit | [caller → callee → branch를 해당 SHA에서 연결] |
| 이 test가 증명하는 것 | 32/64-bit에서 lexical/representational rejection이 같은 public contract로 유지됨 | [실행 결과와 assertion 근거] |
| 이 test가 증명하지 않는 것 | 모든 future option parser, successful runtime behavior beyond parse/startup boundary | [과장하지 않을 범위] |
| test 성격 | deterministic boundary regression | [broad/deterministic 판단 근거] |
| 막는 회귀 | narrowing/wrap, sign/space acceptance, host-width 가정 재도입 | [후속 변경에서 깨질 수 있는 invariant] |

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
| 5d1286620994 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 5d1286620994^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 이 commit은 이 Thread의 마지막 항목입니다. Invariant ledger와 Thread 최종 상태에서 전체 변화를 연결합니다.

## 6. Invariant ledger

| Invariant | 처음 도입 | 강화/적용 | 부족함 또는 위험이 드러난 지점 | Fix/Test 연결 | 학습자 최종 기록 |
| --- | --- | --- | --- | --- | --- |
| RuntimeConfig parsing boundary | 52b6f1ce8f0f | required args/default policy scaffold | `strto*` lexical/width 한계 표시 | e5e6c57db80d가 exact diagnostics 기록 | [학습자 최종 상태 설명] |
| destination-type representability | b6c10bc51937 | digit-by-digit maximum check | 없음 — root-cause fix | 5d1286620994 | [학습자 최종 상태 설명] |
| cross-platform size boundary | 5d1286620994 | runtime pointer-width calculation | hard-coded 64-bit 가정 방지 | CLI regression suite | [학습자 최종 상태 설명] |

Ledger 작성 기준:

- “도입”과 “완성”을 같은 의미로 쓰지 않습니다.
- 후속 fix가 이전 commit의 사실을 소급 변경하지 않도록 각 SHA 시점의 보장과 부족함을 분리합니다.
- source가 명시하지 않은 invariant를 추가할 때는 확정 사실이 아니라 학습자의 코드 해석으로 표시하고 path/symbol 증거를 붙입니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 | 실제 failure/risk | Fix 또는 기반 변화 | 수정된 decision/semantics | Test 연결 | 코드 증거 |
| --- | --- | --- | --- | --- | --- |
| `strto*` 성공 뒤 cast하면 충분하다는 가정 | permissive sign/space와 narrowing overflow | e5e6c57db80d가 external behavior를 명시 | b6c10bc51937이 destination-aware parser로 수정 | 5d1286620994가 lexical/width boundary 검증 | [실제 code/test evidence] |

## 8. Ownership / state / responsibility 변화

| 책임 또는 상태 | 이전 상태 | 이후 authoritative 위치 | 관련 commit | 학습자 확인 |
| --- | --- | --- | --- | --- |
| CLI lexical validation | C conversion 함수 semantics | strict decimal parser | 52b6f1ce8f0f → b6c10bc51937 | [확인한 owner/state/lifetime] |
| range authority | intermediate long/unsigned long | actual destination maximum | b6c10bc51937 | [확인한 owner/state/lifetime] |
| cross-width regression | host-specific literals 가능성 | runtime-computed first unrepresentable value | 5d1286620994 | [확인한 owner/state/lifetime] |

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
[argv text] → [non-empty ASCII digit loop] → [maximum/10, maximum%10 pre-check]
→ [accumulate] → [option-specific zero/upper-bound rule] → `RuntimeConfig`/`Server::Config`
[contract test] → subprocess exit/stdout/stderr
[boundary test] → sign/space/width/very-long input → same public diagnostics
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
