# Thread 05 — Strict runtime configuration boundaries

부제: 엄격한 런타임 구성 경계

## 1. Thread 목표

CLI 문자열을 실제 destination type과 operational bound에 정확히 맞는 값으로 바꾸는 경계를 복원하고, permissive C conversion과 narrowing의 결함이 digit-by-digit parser 및 cross-width regression으로 어떻게 수정되는지 학습합니다.

Source에서 확정된 significance:

> The public configuration surface initially relied on conversion functions whose accepted syntax and intermediate width did not exactly match the documented contract. The fix moves range checking into digit-by-digit accumulation against the destination type, and the follow-up tests preserve that cross-platform boundary without treating the test itself as a second architectural decision.

이 문서의 source-confirmed 문장, commit map, SHA, subject, importance, tags와 원문 역할은 변경하지 않았습니다. 아래 학습 기록은 지정 branch의 각 exact SHA에서 확인한 code diff를 기준으로 작성했습니다.

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

- 초기 parser가 허용/거부하는 입력을 해당 SHA 코드로 정리했습니다.
- old conversion+narrowing과 new bounded accumulation을 숫자 예제로 비교했습니다.
- sign, whitespace, exact maximum, maximum+1, extremely long decimal의 control flow를 설명합니다.
- CLI contract test와 boundary regression의 증명 범위를 구분했습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | 원문 확정 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `52b6f1ce8f0f` | `feat(config): 기본 실행 인자 해석 모듈 구성` | B | BUILD, RESILIENCE | Establishes the initial RuntimeConfig parsing boundary. |
| 2 | `e5e6c57db80d` | `test(irc): 실행 조건과 오류 동작 계약 검증` | A | VERIFICATION, IRC_PROTOCOL, RISK | Records exact CLI success and failure behavior as an executable contract. |
| 3 | `b6c10bc51937` | `fix(config): 서버 크기 옵션을 오버플로 없이 해석` | A | DEBUG, RESILIENCE, RISK | Replaces permissive C conversion with overflow-safe, target-width decimal parsing. |
| 4 | `5d1286620994` | `test(config): 크기 옵션 경계와 오류 입력 검증` | B | VERIFICATION, RESILIENCE, RISK | Covers signs, whitespace, port narrowing, timeout bounds, size_t overflow, and rate-count overflow. |

Commit 순서는 source에 정의된 순서이며 재정렬하지 않았습니다.

## 5. Commit별 학습 기록

각 기록은 해당 commit의 exact diff에서 확인한 파일·symbol·state와, 필요한 경우 parent/앞선 관련 SHA의 상태 차이를 기준으로 합니다. 후속 commit의 field나 test seam을 이전 commit에 소급하지 않았습니다.

### 5.1 `52b6f1ce8f0f` — `feat(config): 기본 실행 인자 해석 모듈 구성`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | BUILD, RESILIENCE |
| 원문 확정 역할 | Establishes the initial RuntimeConfig parsing boundary. |
| 학습 깊이 | Thread 흐름에서 맡는 구체적 구현 역할과 핵심 state/branch만 기록합니다. |

#### Source에서 확정된 역할

> Establishes the initial RuntimeConfig parsing boundary.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| Thread 내 구현 역할 | `RuntimeConfig`에 rate, idle/ping, registration timeout 기본값을 두고 `<port> <password>`를 필수 인자로 해석했습니다. 초기 port parser는 `strtol`, end pointer, 1..65535 range를 확인하고 unknown extra argument를 usage error로 처리했습니다. |
| 확인한 변경 파일·symbol | `src/RuntimeConfig.hpp — RuntimeConfig fields/defaults`<br>`src/RuntimeConfig.cpp — parseRuntimeConfig, initial port parser`<br>`src/main.cpp — Server::Config mapping` |
| 핵심 state / branch | application policy는 RuntimeConfig가, bind address/port와 transport limit은 Server::Config가 소유하도록 책임을 분리합니다. |
| failure handling | empty/trailing garbage, zero/negative/out-of-port-range와 잘못된 argument count는 server 시작 전에 diagnostic과 실패 return으로 끝납니다. |
| 보장과 다음 연결 | public argv를 typed runtime state로 바꾸는 단일 parsing boundary와 최소 CLI contract가 생깁니다. e5e6c57db80d가 exact CLI behavior를 기록하고 b6c10bc51937가 destination-width decimal parser로 교체합니다. |
| 이 시점의 한계 | `strtol`은 leading whitespace와 sign을 허용하는 C lexical semantics를 가지며 optional flags는 이 scaffold 단계에서 아직 실제 config를 모두 변경하지 않습니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `52b6f1ce8f0f` | `src/RuntimeConfig.cpp` | `port parsing and parseRuntimeConfig` | complete consumption/range 검사와 required argv shape |
| `52b6f1ce8f0f` | `src/RuntimeConfig.hpp` | `RuntimeConfig` | application policy와 transport config의 책임 분리 |

- 조사 방법: GitHub에서 `52b6f1ce8f0f`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `e5e6c57db80d` — `test(irc): 실행 조건과 오류 동작 계약 검증`. 원문 역할은 “Records exact CLI success and failure behavior as an executable contract.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.2 `e5e6c57db80d` — `test(irc): 실행 조건과 오류 동작 계약 검증`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | VERIFICATION, IRC_PROTOCOL, RISK |
| 원문 확정 역할 | Records exact CLI success and failure behavior as an executable contract. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Records exact CLI success and failure behavior as an executable contract.

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

- 다음 Thread commit: `b6c10bc51937` — `fix(config): 서버 크기 옵션을 오버플로 없이 해석`. 원문 역할은 “Replaces permissive C conversion with overflow-safe, target-width decimal parsing.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.3 `b6c10bc51937` — `fix(config): 서버 크기 옵션을 오버플로 없이 해석`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | DEBUG, RESILIENCE, RISK |
| 원문 확정 역할 | Replaces permissive C conversion with overflow-safe, target-width decimal parsing. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Replaces permissive C conversion with overflow-safe, target-width decimal parsing.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | numeric options가 `strtol/strtoul`의 permissive syntax와 host intermediate width를 거친 뒤 port·timeout·size_t로 narrowing되어 destination contract보다 넓은 입력을 받아들일 수 있었습니다. |
| 주요 문제와 설계 판단 | ASCII digit만 한 자리씩 누적하는 `parseUnsignedDecimal<Unsigned>()`를 도입하고 각 digit 전에 `value > max/10 \|\| (value == max/10 && digit > max%10)`을 검사했습니다. 각 option은 실제 destination type의 maximum을 template argument/limit로 사용했습니다. |
| 변경 파일·symbol | `src/RuntimeConfig.cpp — parseUnsignedDecimal and option parsers` |
| state / ownership 변화 | 외부 문자열은 intermediate signed/unsigned long이 아니라 최종 target-width에서 직접 representability를 검증받습니다. |
| failure 또는 boundary | empty, `+/-`, whitespace, non-digit, exact maximum 초과, 매우 긴 decimal은 곱셈·덧셈 전에 거부되어 wrap이나 narrowing이 일어나지 않습니다. |
| 보장 / 비보장 | 보장: accepted option은 non-empty ASCII decimal이고 실제 port/timeout/size_t/rate-count destination에 표현 가능합니다.<br>비보장: semantic relation인 idle/ping 조합 등은 별도 policy 검증이며 이 helper는 decimal representability만 보장합니다. |
| 다음 관련 변화 | 5d1286620994가 플랫폼 width를 계산한 first-unrepresentable values와 lexical 오류를 regression으로 고정합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `b6c10bc51937` | `src/RuntimeConfig.cpp` | `parseUnsignedDecimal<Unsigned>` | `maximum / 10`과 `maximum % 10` pre-check로 overflow 전 거부 |
| `b6c10bc51937` | `src/RuntimeConfig.cpp` | `port/size/rate option parsing` | 각 destination maximum을 직접 전달 |

- 조사 방법: GitHub에서 `b6c10bc51937`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### Fix chain

| 단계 | 역사 복원 |
| --- | --- |
| 기존 가정 | C conversion이 complete consumption과 errno를 확인하면 public decimal contract 및 모든 destination width에도 충분하다는 가정이었습니다. |
| 실제 failure / risk | leading sign/whitespace가 허용되고 wider intermediate를 좁은 port·count·size_t로 cast하면 플랫폼에 따라 wrap/narrowing할 수 있었습니다. |
| root cause | lexical contract와 range check가 최종 destination type이 아니라 C library intermediate semantics에 묶여 있었습니다. |
| 수정된 invariant / decision | ASCII digit accumulation을 최종 Unsigned maximum에 대해 매 step pre-check하고 성공한 값만 config에 저장합니다. |
| regression evidence | 5d1286620994가 sign/whitespace, 65536, huge timeout, size_t max+1, rate-count overflow를 실행 경계로 고정합니다. |

#### 다음 연결

- 다음 Thread commit: `5d1286620994` — `test(config): 크기 옵션 경계와 오류 입력 검증`. 원문 역할은 “Covers signs, whitespace, port narrowing, timeout bounds, size_t overflow, and rate-count overflow.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.4 `5d1286620994` — `test(config): 크기 옵션 경계와 오류 입력 검증`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | VERIFICATION, RESILIENCE, RISK |
| 원문 확정 역할 | Covers signs, whitespace, port narrowing, timeout bounds, size_t overflow, and rate-count overflow. |
| 학습 깊이 | Thread 흐름에서 맡는 구체적 구현 역할과 핵심 state/branch만 기록합니다. |

#### Source에서 확정된 역할

> Covers signs, whitespace, port narrowing, timeout bounds, size_t overflow, and rate-count overflow.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| Thread 내 구현 역할 | contract test에 sign/whitespace, port 65536, timeout upper bound 초과, 매우 긴 decimal, runtime에서 계산한 `std::size_t` maximum의 다음 값, rate-count destination overflow cases를 추가했습니다. |
| 확인한 변경 파일·symbol | `tests/irc_contract.py — numeric boundary and invalid CLI cases` |
| 핵심 state / branch | test는 Python integer로 host/process가 노출한 size width에 맞는 first-unrepresentable decimal을 구성하고 각 subprocess failure를 manifest에 기록합니다. |
| failure handling | 각 invalid input은 server가 listen하기 전에 nonzero exit와 정해진 diagnostic으로 거부되어야 합니다. |
| 보장과 다음 연결 | 32/64-bit 차이와 무관하게 destination representability 및 strict ASCII-decimal syntax가 유지됩니다. 416efc91e580의 Linux/macOS matrix가 서로 다른 platform environment에서 같은 contract suite를 반복합니다. |
| 이 시점의 한계 | parser 내부의 모든 template instantiation을 unit level에서 직접 호출하는 테스트는 아니며 process CLI 경계만 통과합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `5d1286620994` | `tests/irc_contract.py` | `configuration boundary cases` | sign/whitespace/port/timeout/rate/size overflow를 process 실패로 검증 |

- 조사 방법: GitHub에서 `5d1286620994`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### Test / verification 학습 기록

| 구분 | 역사 복원 기록 |
| --- | --- |
| 대상 production invariant | accepted numeric CLI value가 strict ASCII decimal이고 실제 destination type에 표현 가능해야 합니다. |
| 재현 failure / boundary | `+1`, `-1`, leading/trailing whitespace, port 65536, timeout 상한 초과, size_t max+1, rate-count overflow입니다. |
| test technique | real executable CLI subprocess와 Python arbitrary-precision integer로 platform first-unrepresentable 값을 생성하는 boundary regression입니다. |
| 통과하는 production path | argv → `parseUnsignedDecimal` → option-specific bound → RuntimeConfig/Server::Config 또는 startup rejection입니다. |
| 이 test가 증명하는 것 | lexical strictness와 target-width overflow rejection이 public CLI에서 유지됨을 증명합니다. |
| 이 test가 증명하지 않는 것 | 모든 internal caller나 non-CLI serialization 경로, semantic option 조합 전체는 증명하지 않습니다. |
| test 성격 | cross-width boundary regression |
| 막는 회귀 | C conversion으로 회귀하거나 narrowing이 32/64-bit 중 한쪽에서만 통과하는 문제를 막습니다. |

실행 기록:

- 실행 SHA: `5d1286620994`
- repository에 정의된 실행 명령: `python3 tests/irc_contract.py ./irc-relay-server` 또는 `make test`
- 현재 작업 환경 실행 여부: **미실행**
- 이유: 현재 런타임에서 외부 DNS가 차단되어 지정 branch의 local checkout을 만들 수 없었습니다. GitHub 연결 도구로 해당 SHA의 production/test diff와 test mechanism은 확인했지만, binary/test command의 성공 결과를 만들거나 추정하지 않았습니다.
- 실행 결과: 기록 없음

#### 다음 연결

- 이 commit은 이 Thread의 마지막 항목입니다. 아래 Invariant ledger와 Thread 최종 상태에서 전체 변화를 연결합니다.

## 6. Invariant ledger

| Invariant | 처음 도입 | 강화/적용 | 학습자 최종 기록 | Fix/Test 연결 |
| --- | --- | --- | --- | --- |
| runtime parsing boundary | `52b6f1ce8f0f` | e5e6c57db80d | RuntimeConfig와 Server::Config 책임 및 public CLI behavior를 고정합니다. | 초기 C conversion의 lexical/width 한계가 남음 |
| target-width representability | `b6c10bc51937` | digit-by-digit accumulation | destination maximum에 대해 mutation 전 overflow를 거부합니다. | 5d1286620994 cross-width regression |
| strict decimal syntax | `b6c10bc51937` | all numeric option parsers | sign/whitespace/non-digit를 허용하지 않습니다. | 5d1286620994 |

도입과 완성을 같은 의미로 쓰지 않았습니다. 후속 fix가 이전 SHA의 사실을 바꾸지 않도록 각 시점의 보장과 부족함을 분리했습니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 | 실제 failure / risk | Fix 또는 기반 변화 | 수정된 decision / semantics | Test 연결 |
| --- | --- | --- | --- | --- |
| strtol/strtoul + cast면 충분 | sign/whitespace 허용과 intermediate-width narrowing | b6c10bc51937 | ASCII digit + destination max pre-check | 5d1286620994 |
| 한 platform boundary만 고정 | 32/64-bit 중 한쪽에서만 overflow 재현 | 5d1286620994 | runtime first-unrepresentable decimal 계산 | 416efc91e580 OS matrix |

## 8. Ownership / state / responsibility 변화

| 책임 또는 상태 | 이전 상태 | 이후 authoritative 위치 | 관련 commit | 확인 결과 |
| --- | --- | --- | --- | --- |
| application runtime policy | 없음 | RuntimeConfig | 52b6f1ce8f0f | path/symbol은 위 commit 증거표에 연결했습니다. |
| transport bind/size policy | 문자열 argv | Server::Config typed fields | 52b6f1ce8f0f → b6c10bc51937 | path/symbol은 위 commit 증거표에 연결했습니다. |
| numeric representability check | C library conversion | parseUnsignedDecimal<Unsigned> | b6c10bc51937 | path/symbol은 위 commit 증거표에 연결했습니다. |

## 9. Thread 최종 상태

- 시작 직전 상태: 실행 인자에서 transport와 application runtime policy를 분리해 보관·검증하는 모듈이 없었습니다.
- 마지막 commit `5d1286620994` 시점의 상태: 32/64-bit 차이와 무관하게 destination representability 및 strict ASCII-decimal syntax가 유지됩니다.
- Thread 안에서 강화된 핵심 invariant: runtime parsing boundary, target-width representability, strict decimal syntax.
- 남은 한계 또는 후속 Thread에서 보강되는 부분: parser 내부의 모든 template instantiation을 unit level에서 직접 호출하는 테스트는 아니며 process CLI 경계만 통과합니다. 416efc91e580의 Linux/macOS matrix가 서로 다른 platform environment에서 같은 contract suite를 반복합니다.
- 최종 설명: `52b6f1ce8f0f`에서 시작한 책임은 commit map 순서대로 상태 owner, failure branch와 cleanup ordering을 추가했고 `5d1286620994`에서 이 Thread가 정한 검증 또는 운영 상태에 도달합니다. 이전 시점의 미보장은 후속 fix/test SHA를 별도로 연결했으며 final HEAD 상태를 과거 commit에 소급하지 않았습니다.

## 10. 최종 architecture 또는 execution flow 정리

| 단계 | SHA | Caller / callee / state owner | 정상 transition | failure / cleanup transition |
| --- | --- | --- | --- | --- |
| argv shape | 52b6f1ce8f0f | `main/parser` | required port/password와 option 분리 | missing/unknown은 usage failure |
| decimal scan | b6c10bc51937 | `option parser` | ASCII digit를 target Unsigned에 누적 | digit 전 max/10·max%10 검사에서 reject |
| typed assignment | b6c10bc51937 | `parseRuntimeConfig` | RuntimeConfig/Server::Config에 성공 값 저장 | 실패 값은 config를 변경하지 않음 |
| regression | 5d1286620994 | `real CLI subprocess` | exact max/first-unrepresentable 및 lexical cases | startup 전에 diagnostic/nonzero exit |

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
