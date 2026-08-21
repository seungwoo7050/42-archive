# Thread 02 — Protocol boundary, identity, and registration

부제: 프로토콜 경계, 식별자와 등록

## 1. Thread 목표

wire line을 구조화 message로 바꾸는 문법 경계, descriptor 기반 client state와 nickname index, `IrcApplication` 책임 분리, PASS/NICK/USER 등록 gate가 하나의 실행 경로로 결합되는 과정을 복원합니다.

Source에서 확정된 significance:

> The sequence separates syntax, connection identity, and registration authorization rather than mixing them into the event loop. The application boundary and registration gate are the durable decisions; the individual registration commands are normal implementations within those decisions. The first smoke suite then verifies that framing, parsing, identity indexes, replies, and lifecycle transitions compose correctly.

이 문서의 source-confirmed 문장, commit map, SHA, subject, importance, tags와 원문 역할은 변경하지 않았습니다. 아래 학습 기록은 지정 branch의 각 exact SHA에서 확인한 code diff를 기준으로 작성했습니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- transport framing과 IRC grammar parsing은 어디에서 분리되는가?
- display nickname과 canonical lookup key는 왜 별도로 유지되는가?
- `Server` callback에서 protocol state를 생성·조회·삭제하는 authoritative application boundary는 어디인가?
- syntax-valid command가 registration state 때문에 거부되는 지점은 어디인가?
- PASS/NICK/USER prerequisite와 001–003 welcome의 단일 transition은 어떻게 보장되는가?
- 첫 real-TCP smoke가 어떤 계층 연결을 증명하고 무엇은 아직 정확히 고정하지 않는가?

### Source와 직접 연결되는 invariant

- IRC registration은 password, nickname, USER prerequisites가 모두 성립한 뒤에만 완료됩니다.
- nickname은 registry canonical lookup rule 아래 unique해야 하며 display spelling과 reverse key가 일치해야 합니다.
- malformed 또는 oversized frame은 이전 structured state를 남기거나 이후 valid command로 처리되어서는 안 됩니다.

### Source와 직접 연결되는 engineering difficulty

- byte-stream framing과 IRC syntax/authorization을 서로 다른 책임으로 유지하는 문제.
- callback lifecycle와 descriptor-keyed protocol state를 연결하면서 phantom state나 stale index를 만들지 않는 문제.

## 3. 완료 기준

- 한 TCP line이 parser, normalized command, registration gate, handler, reply queue까지 이동하는 흐름을 해당 SHA 코드로 설명할 수 있습니다.
- descriptor map과 nickname reverse index의 consistency 조건 및 collision-before-mutation 순서를 설명할 수 있습니다.
- transport connection과 IRC registration을 같은 상태로 취급하지 않고 각 lifecycle 필드를 구분할 수 있습니다.
- registration prerequisites와 welcome reply ordering을 state transition으로 정리했습니다.
- smoke test의 production path, test technique, 증명/비증명 범위를 구분했습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | 원문 확정 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `a22bf6ddbd75` | `feat(parser): IRC 메시지 값과 직렬화 정의` | B | IRC_PROTOCOL | Introduces the structured IRC message representation. |
| 2 | `c31a32b6cb24` | `feat(parser): IRC 한 줄 구문 해석 구현` | A | IRC_PROTOCOL, RISK | Defines the line grammar and parameter parsing boundary. |
| 3 | `aeb1e9b709b9` | `feat(reply): IRC 서버 응답 생성` | B | IRC_PROTOCOL | Adds canonical server messages, numerics, and hostmasks. |
| 4 | `991b76b8d793` | `feat(client): 연결별 등록 상태 저장` | B | IDENTITY | Stores descriptor-keyed registration state. |
| 5 | `b47135c51cfc` | `feat(client): 닉네임 색인 관리` | A | IDENTITY, RISK | Establishes the case-insensitive nickname index invariant. |
| 6 | `0b5ae6aef328` | `feat(app): IRC 동작 조율 계약 정의` | S | CORE, ARCH, INTEGRATION | Defines IrcApplication as the protocol/domain coordinator above Server. |
| 7 | `2ed9331124bb` | `feat(app): 연결 수명 콜백 조율` | A | LIFECYCLE, IRC_PROTOCOL, INTEGRATION | Connects transport lifecycle callbacks to client state, parsing, and cleanup. |
| 8 | `035e1137e0dd` | `feat(app): 등록 전 명령 분배 구현` | A | IRC_PROTOCOL, IDENTITY, RISK | Centralizes the pre-registration command gate. |
| 9 | `582317254e24` | `feat(registration): PASS 인증 상태 처리` | B | IDENTITY, IRC_PROTOCOL | Adds password authorization state. |
| 10 | `80a639321bad` | `feat(registration): 닉네임 검증과 색인 갱신` | B | IDENTITY, IRC_PROTOCOL | Adds nickname validation and collision handling. |
| 11 | `d9e420b570a0` | `feat(registration): USER 정보와 환영 응답 연결` | B | IDENTITY, IRC_PROTOCOL | Completes PASS/NICK/USER registration and welcome replies. |
| 12 | `6b4a7738a285` | `test(smoke): 실제 TCP 등록과 채널 흐름 검증` | A | VERIFICATION, INTEGRATION, RISK | Proves the integrated registration and command path over real TCP. |

Commit 순서는 source에 정의된 순서이며 재정렬하지 않았습니다.

## 5. Commit별 학습 기록

각 기록은 해당 commit의 exact diff에서 확인한 파일·symbol·state와, 필요한 경우 parent/앞선 관련 SHA의 상태 차이를 기준으로 합니다. 후속 commit의 field나 test seam을 이전 commit에 소급하지 않았습니다.

### 5.1 `a22bf6ddbd75` — `feat(parser): IRC 메시지 값과 직렬화 정의`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | IRC_PROTOCOL |
| 원문 확정 역할 | Introduces the structured IRC message representation. |
| 학습 깊이 | Thread 흐름에서 맡는 구체적 구현 역할과 핵심 state/branch만 기록합니다. |

#### Source에서 확정된 역할

> Introduces the structured IRC message representation.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| Thread 내 구현 역할 | `IrcMessage`에 optional prefix, uppercase command, ordered params, raw frame을 분리하고 safe indexed access와 `toLine()`을 구현했습니다. |
| 확인한 변경 파일·symbol | `include/IrcMessage.hpp — IrcMessage`<br>`src/IrcMessage.cpp — normalization, param access, toLine` |
| 핵심 state / branch | parser/handler는 command casing을 따로 다루지 않고 message 값 하나를 공유합니다. |
| failure handling | out-of-range parameter access는 unchecked indexing 대신 fallback을 돌려 handler의 UB를 막습니다. |
| 보장과 다음 연결 | 마지막 parameter의 공백/colon/empty 조건에 trailing marker를 적용하고 CRLF frame을 만듭니다. c31a32b6cb24가 line parser를, aeb1e9b709b9가 server reply helper를 추가합니다. |
| 이 시점의 한계 | wire text를 구조화하는 parse grammar는 아직 없습니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `a22bf6ddbd75` | `src/IrcMessage.cpp` | `IrcMessage::toLine` | prefix/params/trailing 규칙과 CRLF 직렬화 |
| `a22bf6ddbd75` | `src/IrcMessage.cpp` | `command normalization/param` | uppercase dispatch key와 safe fallback |

- 조사 방법: GitHub에서 `a22bf6ddbd75`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `c31a32b6cb24` — `feat(parser): IRC 한 줄 구문 해석 구현`. 원문 역할은 “Defines the line grammar and parameter parsing boundary.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.2 `c31a32b6cb24` — `feat(parser): IRC 한 줄 구문 해석 구현`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | IRC_PROTOCOL, RISK |
| 원문 확정 역할 | Defines the line grammar and parameter parsing boundary. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Defines the line grammar and parameter parsing boundary.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | 값 객체는 있었지만 raw IRC line의 prefix/command/parameter 문법을 일관되게 해석하지 못했습니다. |
| 주요 문제와 설계 판단 | frame terminator를 제거하고 output을 초기화한 뒤 optional prefix, 필수 command, middle/trailing parameters를 순서대로 파싱했습니다. command를 uppercase로 정규화하고 raw를 보존했습니다. |
| 변경 파일·symbol | `src/IrcMessage.cpp — parseLine` |
| state / ownership 변화 | 성공 시 output이 한 frame의 완전한 structured state가 되고 실패 시 이전 state가 남지 않습니다. |
| failure 또는 boundary | empty line, prefix 뒤 command 누락, 510-byte 초과 등 malformed boundary를 false로 반환합니다. |
| 보장 / 비보장 | 보장: trailing colon 이후 공백 포함 text를 한 parameter로 보존하고 packet framing과 grammar parsing을 분리합니다.<br>비보장: authorization·registration 상태에 따른 command 허용은 application 단계에 없습니다. |
| 다음 관련 변화 | 035e1137e0dd가 parse 성공 후 registration gate를 적용합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `c31a32b6cb24` | `src/IrcMessage.cpp` | `parseLine` | output reset, prefix/command/middle/trailing parameter 순서와 length 검사 |

- 조사 방법: GitHub에서 `c31a32b6cb24`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `aeb1e9b709b9` — `feat(reply): IRC 서버 응답 생성`. 원문 역할은 “Adds canonical server messages, numerics, and hostmasks.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.3 `aeb1e9b709b9` — `feat(reply): IRC 서버 응답 생성`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | IRC_PROTOCOL |
| 원문 확정 역할 | Adds canonical server messages, numerics, and hostmasks. |
| 학습 깊이 | Thread 흐름에서 맡는 구체적 구현 역할과 핵심 state/branch만 기록합니다. |

#### Source에서 확정된 역할

> Adds canonical server messages, numerics, and hostmasks.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| Thread 내 구현 역할 | `Replies`에 numeric code formatting, generic message, ERROR, hostmask helper를 두고 target이 없을 때 `*`를 사용하도록 했습니다. |
| 확인한 변경 파일·symbol | `include/Replies.hpp`<br>`src/Replies.cpp — numeric, formatMessage, error, hostmask` |
| 핵심 state / branch | server response formatting의 authoritative 위치가 reply helper로 이동합니다. |
| failure handling | 마지막 parameter만 trailing 처리해 중간 parameter의 공백이 wire grammar를 깨뜨리지 않도록 호출자가 구조화 값을 넘기게 합니다. |
| 보장과 다음 연결 | numeric width와 prefix/target/CRLF 형태가 handler마다 달라지지 않습니다. IrcApplication handlers가 이 helper를 통해 Connection output queue로 응답합니다. |
| 이 시점의 한계 | 실제 send 실패와 lifecycle invalidation은 이 helper가 다루지 않습니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `aeb1e9b709b9` | `src/Replies.cpp` | `Replies::numeric/formatMessage` | server prefix, code, target, trailing serialization 중앙화 |

- 조사 방법: GitHub에서 `aeb1e9b709b9`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `991b76b8d793` — `feat(client): 연결별 등록 상태 저장`. 원문 역할은 “Stores descriptor-keyed registration state.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.4 `991b76b8d793` — `feat(client): 연결별 등록 상태 저장`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | IDENTITY |
| 원문 확정 역할 | Stores descriptor-keyed registration state. |
| 학습 깊이 | Thread 흐름에서 맡는 구체적 구현 역할과 핵심 state/branch만 기록합니다. |

#### Source에서 확정된 역할

> Stores descriptor-keyed registration state.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| Thread 내 구현 역할 | `ClientState`와 `ClientRegistry`를 만들고 fd-keyed map, create-on-demand `state()`, non-creating `find()`, contains/fds/erase를 제공했습니다. |
| 확인한 변경 파일·symbol | `src/ClientRegistry.hpp — ClientState, ClientRegistry`<br>`src/ClientRegistry.cpp` |
| 핵심 state / branch | socket lifetime은 Server/Connection이, IRC identity/registration lifetime은 ClientRegistry가 같은 fd를 key로 각각 관리합니다. |
| failure handling | `find()`는 phantom state를 만들지 않고 `erase()`는 없는 fd에도 안전합니다. |
| 보장과 다음 연결 | transport connected와 IRC registered를 다른 상태로 표현할 기반이 생깁니다. b47135c51cfc가 canonical nickname index와 erase consistency를 추가합니다. |
| 이 시점의 한계 | nickname uniqueness를 위한 reverse index는 없습니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `991b76b8d793` | `src/ClientRegistry.cpp` | `state/find/erase/fds` | 생성 조회와 비생성 조회, snapshot, 멱등 erase 분리 |

- 조사 방법: GitHub에서 `991b76b8d793`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `b47135c51cfc` — `feat(client): 닉네임 색인 관리`. 원문 역할은 “Establishes the case-insensitive nickname index invariant.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.5 `b47135c51cfc` — `feat(client): 닉네임 색인 관리`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | IDENTITY, RISK |
| 원문 확정 역할 | Establishes the case-insensitive nickname index invariant. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Establishes the case-insensitive nickname index invariant.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | fd→client state만 있어 nickname lookup이 linear하거나 대소문자 collision을 놓칠 수 있었습니다. |
| 주요 문제와 설계 판단 | canonical nickname→fd reverse map을 추가하고 `setNickname()`이 old canonical key를 먼저 제거한 뒤 new key를 삽입하도록 했습니다. client erase는 reverse key도 함께 제거합니다. |
| 변경 파일·symbol | `src/ClientRegistry.hpp/.cpp — canonical nickname index, setNickname, findByNick, erase`<br>`include/Channel.hpp — canonicalNick helper` |
| state / ownership 변화 | display spelling은 ClientState에, lookup key는 canonical map에 있으며 두 표현이 한 mutation API에서 함께 갱신됩니다. |
| failure 또는 boundary | collision 여부를 mutation 전에 확인할 수 있고 erase 후 stale nickname이 다른 fd를 가리키지 않습니다. |
| 보장 / 비보장 | 보장: case-insensitive uniqueness와 fd↔nickname index consistency를 유지할 수 있습니다.<br>비보장: 실제 NICK validation/collision numeric은 handler에 아직 없습니다. |
| 다음 관련 변화 | 80a639321bad가 validation과 collision-before-mutation을 명령 경로에 적용합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `b47135c51cfc` | `src/ClientRegistry.cpp` | `ClientRegistry::setNickname` | old reverse key 제거 후 state/new key 갱신 |
| `b47135c51cfc` | `src/ClientRegistry.cpp` | `findByNick/erase` | canonical lookup과 lifecycle 정리 |

- 조사 방법: GitHub에서 `b47135c51cfc`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `0b5ae6aef328` — `feat(app): IRC 동작 조율 계약 정의`. 원문 역할은 “Defines IrcApplication as the protocol/domain coordinator above Server.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.6 `0b5ae6aef328` — `feat(app): IRC 동작 조율 계약 정의`

| 항목 | 값 |
| --- | --- |
| Importance | S |
| Tags | CORE, ARCH, INTEGRATION |
| 원문 확정 역할 | Defines IrcApplication as the protocol/domain coordinator above Server. |
| 학습 깊이 | 프로젝트 핵심 architecture/invariant입니다. 이전 상태, failure sequence, 핵심 결정, ownership/lifecycle, 남은 한계와 후속 fix/test를 모두 복원합니다. |

#### Source에서 확정된 역할

> Defines IrcApplication as the protocol/domain coordinator above Server.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 상태 | Server callback과 parser/registry/command handler를 묶는 protocol owner가 없었습니다. |
| failure / boundary | callback boundary가 transport removal을 protocol cleanup으로 전달할 위치를 고정합니다. |
| 핵심 결정 | `IrcApplication`이 Server reference, password/runtime/server name, ClientRegistry와 command handlers를 소유하는 coordinator 계약을 정의했습니다. |
| 변경 파일·symbol | `src/IrcApplication.hpp — IrcApplication public callbacks and private handlers` |
| ownership / lifecycle / state transition | Server는 transport만 소유하고 application은 IRC/domain state와 dispatch를 소유합니다. |
| 이 commit이 보장하는 것 | event loop에 parser/authorization/channel state를 직접 섞지 않는 architecture 경계가 생깁니다. |
| 아직 보장하지 않는 것 | callback 구현과 registration gate는 아직 없습니다. |
| 후속 fix/test 연결 | 2ed9331124bb와 035e1137e0dd가 lifecycle와 dispatch를 구현합니다. |

#### S-level invariant 재구성

| 순서 | 상태 / 판단 |
| --- | --- |
| 1. 이전 전제 | Server callback과 parser/registry/command handler를 묶는 protocol owner가 없었습니다. |
| 2. failure conditions / boundary | callback boundary가 transport removal을 protocol cleanup으로 전달할 위치를 고정합니다. |
| 3. 선택한 표현과 순서 | `IrcApplication`이 Server reference, password/runtime/server name, ClientRegistry와 command handlers를 소유하는 coordinator 계약을 정의했습니다. |
| 4. authoritative state | Server는 transport만 소유하고 application은 IRC/domain state와 dispatch를 소유합니다. |
| 5. 결과 invariant | event loop에 parser/authorization/channel state를 직접 섞지 않는 architecture 경계가 생깁니다. |
| 6. 후속 보강 | 2ed9331124bb와 035e1137e0dd가 lifecycle와 dispatch를 구현합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `0b5ae6aef328` | `src/IrcApplication.hpp` | `onConnect/onLine/onDisconnect/onTick` | transport callback에서 protocol coordinator로 진입하는 공개 경계 |
| `0b5ae6aef328` | `src/IrcApplication.hpp` | `_clients and handler declarations` | protocol state/dispatch ownership |

- 조사 방법: GitHub에서 `0b5ae6aef328`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `2ed9331124bb` — `feat(app): 연결 수명 콜백 조율`. 원문 역할은 “Connects transport lifecycle callbacks to client state, parsing, and cleanup.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.7 `2ed9331124bb` — `feat(app): 연결 수명 콜백 조율`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | LIFECYCLE, IRC_PROTOCOL, INTEGRATION |
| 원문 확정 역할 | Connects transport lifecycle callbacks to client state, parsing, and cleanup. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Connects transport lifecycle callbacks to client state, parsing, and cleanup.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | application 계약은 있었지만 Connection lifecycle와 ClientRegistry가 연결되지 않았습니다. |
| 주요 문제와 설계 판단 | onConnect가 ClientState를 만들고 host/fd/time을 기록하며, onLine이 필요 시 state를 복구하고 parse 후 dispatch하며, onDisconnect가 application state를 정리하도록 했습니다. |
| 변경 파일·symbol | `src/IrcApplication.cpp — onConnect, onLine, onDisconnect` |
| state / ownership 변화 | transport callback의 fd가 protocol registry key로 이어지고 disconnect callback이 state lifetime의 종착점입니다. |
| failure 또는 boundary | parse 실패는 command handler로 넘어가지 않으며 없는 state는 연결 시점 정보로 생성됩니다. |
| 보장 / 비보장 | 보장: connection lifecycle와 parser/registry cleanup이 한 coordinator를 통과합니다.<br>비보장: 응답 send가 동기 disconnect를 일으킨 뒤 borrowed state를 재사용하는 문제는 후속 08 thread에 남습니다. |
| 다음 관련 변화 | 035e1137e0dd가 parsed command에 registration gate를 적용합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `2ed9331124bb` | `src/IrcApplication.cpp` | `onConnect/onLine/onDisconnect` | fd별 state 생성 → parse/dispatch → cleanup lifecycle |

- 조사 방법: GitHub에서 `2ed9331124bb`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `035e1137e0dd` — `feat(app): 등록 전 명령 분배 구현`. 원문 역할은 “Centralizes the pre-registration command gate.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.8 `035e1137e0dd` — `feat(app): 등록 전 명령 분배 구현`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | IRC_PROTOCOL, IDENTITY, RISK |
| 원문 확정 역할 | Centralizes the pre-registration command gate. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Centralizes the pre-registration command gate.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | syntax-valid command가 registration 전후 동일하게 dispatch될 수 있었습니다. |
| 주요 문제와 설계 판단 | PASS/NICK/USER/PING/QUIT는 등록 전 허용하고, 그 외 command는 unregistered면 451, registered인데 unsupported면 421로 분리하는 central gate를 구현했습니다. |
| 변경 파일·symbol | `src/IrcApplication.cpp — handleMessage` |
| state / ownership 변화 | ClientState.registered가 syntax parsing 뒤 authorization/dispatch 상태를 결정합니다. |
| failure 또는 boundary | 등록 전 금지 명령은 handler side effect 없이 numeric으로 끝납니다. |
| 보장 / 비보장 | 보장: 각 handler가 registration check를 중복하지 않고 단일 정책을 적용합니다.<br>비보장: PASS/NICK/USER prerequisite state와 welcome transition 구현은 다음 commits에 있습니다. |
| 다음 관련 변화 | 582317254e24, 80a639321bad, d9e420b570a0가 gate를 통과하는 등록 상태를 채웁니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `035e1137e0dd` | `src/IrcApplication.cpp` | `IrcApplication::handleMessage` | pre-registration allowlist와 451/421 분기 |

- 조사 방법: GitHub에서 `035e1137e0dd`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `582317254e24` — `feat(registration): PASS 인증 상태 처리`. 원문 역할은 “Adds password authorization state.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.9 `582317254e24` — `feat(registration): PASS 인증 상태 처리`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | IDENTITY, IRC_PROTOCOL |
| 원문 확정 역할 | Adds password authorization state. |
| 학습 깊이 | Thread 흐름에서 맡는 구체적 구현 역할과 핵심 state/branch만 기록합니다. |

#### Source에서 확정된 역할

> Adds password authorization state.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| Thread 내 구현 역할 | `handlePass()`가 재등록 462, parameter 부족 461, 잘못된 password 464+close를 처리하고 성공 시 `passOk`를 세운 뒤 `maybeRegister()`를 호출했습니다. |
| 확인한 변경 파일·symbol | `src/RegistrationCommands.cpp — handlePass` |
| 핵심 state / branch | ClientState.passOk가 registration prerequisite 중 하나가 됩니다. |
| failure handling | 잘못된 password는 상태를 승인하지 않고 protocol error를 queue한 뒤 connection close를 요청합니다. |
| 보장과 다음 연결 | password가 정확히 확인되기 전 registered transition이 일어나지 않습니다. 80a639321bad와 d9e420b570a0가 나머지 prerequisites를 추가합니다. |
| 이 시점의 한계 | nickname/USER prerequisite가 아직 없으므로 PASS만으로 등록되지 않습니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `582317254e24` | `src/RegistrationCommands.cpp` | `IrcApplication::handlePass` | 462/461/464 branch와 passOk mutation-before-maybeRegister |

- 조사 방법: GitHub에서 `582317254e24`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `80a639321bad` — `feat(registration): 닉네임 검증과 색인 갱신`. 원문 역할은 “Adds nickname validation and collision handling.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.10 `80a639321bad` — `feat(registration): 닉네임 검증과 색인 갱신`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | IDENTITY, IRC_PROTOCOL |
| 원문 확정 역할 | Adds nickname validation and collision handling. |
| 학습 깊이 | Thread 흐름에서 맡는 구체적 구현 역할과 핵심 state/branch만 기록합니다. |

#### Source에서 확정된 역할

> Adds nickname validation and collision handling.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| Thread 내 구현 역할 | NICK missing/invalid/collision을 431/432/433으로 거부하고, canonical collision 검사를 마친 뒤에만 registry nickname을 갱신했습니다. |
| 확인한 변경 파일·symbol | `src/RegistrationCommands.cpp — handleNick, nickname validation` |
| 핵심 state / branch | hasNick/display nick/reverse index가 성공 branch에서만 함께 전진합니다. |
| failure handling | collision 전에 old mapping을 제거하지 않으므로 실패가 기존 identity를 보존합니다. |
| 보장과 다음 연결 | case-insensitive uniqueness와 validation-before-mutation ordering을 command 경로에서 지킵니다. d9e420b570a0가 USER와 final registration transition을 연결합니다. |
| 이 시점의 한계 | 이미 registered client의 NICK fan-out/cleanup semantics는 channel thread에서 추가됩니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `80a639321bad` | `src/RegistrationCommands.cpp` | `IrcApplication::handleNick` | 431/432/433 검사 후 registry mutation |

- 조사 방법: GitHub에서 `80a639321bad`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `d9e420b570a0` — `feat(registration): USER 정보와 환영 응답 연결`. 원문 역할은 “Completes PASS/NICK/USER registration and welcome replies.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.11 `d9e420b570a0` — `feat(registration): USER 정보와 환영 응답 연결`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | IDENTITY, IRC_PROTOCOL |
| 원문 확정 역할 | Completes PASS/NICK/USER registration and welcome replies. |
| 학습 깊이 | Thread 흐름에서 맡는 구체적 구현 역할과 핵심 state/branch만 기록합니다. |

#### Source에서 확정된 역할

> Completes PASS/NICK/USER registration and welcome replies.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| Thread 내 구현 역할 | USER fields를 저장하고 `maybeRegister()`가 `passOk && hasNick && hasUser`일 때만 `registered=true`로 만든 뒤 001, 002, 003을 순서대로 queue했습니다. |
| 확인한 변경 파일·symbol | `src/RegistrationCommands.cpp — handleUser, maybeRegister` |
| 핵심 state / branch | 등록은 세 prerequisite의 conjunction에서 false→true로 한 번 전이하며 welcome send 전에 flag를 먼저 세워 재진입 중 중복 등록을 막습니다. |
| failure handling | parameter 부족/이미 등록은 numeric으로 거부합니다. 다만 welcome enqueue가 connection을 제거해도 이 버전은 이후 send/log를 계속할 수 있습니다. |
| 보장과 다음 연결 | PASS/NICK/USER가 모두 충족된 client만 registered가 되고 welcome 순서가 정해집니다. 6b4a7738a285가 실제 TCP에서 정상 등록을 통합 검증하고 08 thread가 failure semantics를 보강합니다. |
| 이 시점의 한계 | response failure 후 application state revalidation은 728aaabc4012/5edcafda8a4d 이전에 없습니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `d9e420b570a0` | `src/RegistrationCommands.cpp` | `IrcApplication::maybeRegister` | 세 prerequisite conjunction, registered mutation, 001→002→003 |

- 조사 방법: GitHub에서 `d9e420b570a0`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `6b4a7738a285` — `test(smoke): 실제 TCP 등록과 채널 흐름 검증`. 원문 역할은 “Proves the integrated registration and command path over real TCP.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.12 `6b4a7738a285` — `test(smoke): 실제 TCP 등록과 채널 흐름 검증`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | VERIFICATION, INTEGRATION, RISK |
| 원문 확정 역할 | Proves the integrated registration and command path over real TCP. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Proves the integrated registration and command path over real TCP.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | parser·registry·registration·channel 기능이 실제 process/socket 안에서 함께 동작한다는 통합 증거가 없었습니다. |
| 주요 문제와 설계 판단 | Makefile test/smoke, shell runner, Python peer를 추가해 loopback server를 실행하고 다중 client 시나리오를 수행했습니다. |
| 변경 파일·symbol | `Makefile — test, smoke`<br>`tests/irc_smoke.sh`<br>`tools/irc_smoke_client.py` |
| state / ownership 변화 | test harness가 process PID, free port, temp log, peer sockets와 수신 line buffer를 소유하고 EXIT trap으로 정리합니다. |
| failure 또는 boundary | wrong password, fragmented input, case-insensitive collision, channel/mode/message/departure 오류를 실제 wire에서 관찰합니다. |
| 보장 / 비보장 | 보장: transport framing부터 application/channel/output queue까지 주요 정상·일부 오류 경로가 한 process에서 조합됩니다.<br>비보장: assertion은 주로 substring 중심이어서 exact 전체 frame/order/CRLF와 rare syscall failure, capacity/fairness를 증명하지 않습니다. |
| 다음 관련 변화 | e5e6c57db80d가 exact public contract로 정밀도를 높이고 계층별 deterministic tests가 후속됩니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `6b4a7738a285` | `tests/irc_smoke.sh` | `runner and cleanup trap` | 실제 server process 기동·readiness·로그·종료 관리 |
| `6b4a7738a285` | `tools/irc_smoke_client.py` | `IrcPeer and scenario` | fragmented write와 registration/channel/messaging 시나리오 |

- 조사 방법: GitHub에서 `6b4a7738a285`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### Test / verification 학습 기록

| 구분 | 역사 복원 기록 |
| --- | --- |
| 대상 production invariant | Connection framing, parser, registration, nickname index, channel state와 queued send가 실제 process에서 결합됩니다. |
| 재현 failure / boundary | wrong password, fragmented PING, nickname collision, JOIN/TOPIC/PRIVMSG/INVITE/MODE/KICK/PART/QUIT입니다. |
| test technique | compiled server + real loopback TCP + shell process harness + Python peer의 broad end-to-end smoke입니다. |
| 통과하는 production path | process startup → Server event loop → Connection framing → parser → IrcApplication → registry/channel → output queue입니다. |
| 이 test가 증명하는 것 | 대표 정상·오류 흐름이 실제 socket에서 연결되어 진행됨을 증명합니다. |
| 이 test가 증명하지 않는 것 | exact 모든 frame, 모든 ordering, rare send/event failure, formal capacity·fairness는 증명하지 않습니다. |
| test 성격 | broad integration smoke |
| 막는 회귀 | packet boundary를 command boundary로 오인하거나 identity/channel fan-out 통합이 깨지는 회귀를 막습니다. |

실행 기록:

- 실행 SHA: `6b4a7738a285`
- repository에 정의된 실행 명령: `make test` 또는 `make smoke`
- 현재 작업 환경 실행 여부: **미실행**
- 이유: 현재 런타임에서 외부 DNS가 차단되어 지정 branch의 local checkout을 만들 수 없었습니다. GitHub 연결 도구로 해당 SHA의 production/test diff와 test mechanism은 확인했지만, binary/test command의 성공 결과를 만들거나 추정하지 않았습니다.
- 실행 결과: 기록 없음

#### 다음 연결

- 이 commit은 이 Thread의 마지막 항목입니다. 아래 Invariant ledger와 Thread 최종 상태에서 전체 변화를 연결합니다.

## 6. Invariant ledger

| Invariant | 처음 도입 | 강화/적용 | 학습자 최종 기록 | Fix/Test 연결 |
| --- | --- | --- | --- | --- |
| wire syntax value | `a22bf6ddbd75` | c31a32b6cb24, aeb1e9b709b9 | structured value, parser reset/grammar, reply serializer를 분리합니다. | 6b4a7738a285가 실제 fragmented wire와 response 조합을 확인합니다. |
| descriptor-keyed registration state | `991b76b8d793` | 2ed9331124bb | transport lifecycle와 별도 ClientState를 fd로 연결합니다. | 5edcafda8a4d가 response failure cleanup을 보강합니다. |
| canonical nickname uniqueness | `b47135c51cfc` | 80a639321bad | collision-before-mutation과 erase 시 reverse index 정리를 지킵니다. | 6b4a7738a285의 case-insensitive collision scenario |
| transport/protocol 책임 분리 | `0b5ae6aef328` | 2ed9331124bb, 035e1137e0dd | Server callback 위에서 parser·registry·dispatch를 application이 소유합니다. | 728aaabc4012/5edcafda8a4d가 send reentrancy를 보강합니다. |
| registration monotonic transition | `582317254e24` | 80a639321bad, d9e420b570a0 | PASS/NICK/USER conjunction에서 registered를 한 번 세우고 001→002→003을 queue합니다. | 6b4a7738a285 정상 흐름, 5edcafda8a4d 실패 흐름 |

도입과 완성을 같은 의미로 쓰지 않았습니다. 후속 fix가 이전 SHA의 사실을 바꾸지 않도록 각 시점의 보장과 부족함을 분리했습니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 | 실제 failure / risk | Fix 또는 기반 변화 | 수정된 decision / semantics | Test 연결 |
| --- | --- | --- | --- | --- |
| handler별 command casing/serialization | dispatch와 wire shape 불일치 | a22bf6ddbd75 + c31a32b6cb24 + aeb1e9b709b9 | structured parser/reply boundary | 6b4a7738a285 |
| display nick만 비교 | case variant collision·stale reverse mapping | b47135c51cfc + 80a639321bad | canonical collision-before-mutation | 6b4a7738a285 |
| welcome send는 실패하지 않음 | 등록 중 synchronous disconnect 후 stale state | 728aaabc4012 | send bool 전파와 state relookup | 5edcafda8a4d |

## 8. Ownership / state / responsibility 변화

| 책임 또는 상태 | 이전 상태 | 이후 authoritative 위치 | 관련 commit | 확인 결과 |
| --- | --- | --- | --- | --- |
| frame text ↔ structured message | handler별 문자열 | `IrcMessage`/parser/reply helper | a22bf6ddbd75 → aeb1e9b709b9 | path/symbol은 위 commit 증거표에 연결했습니다. |
| connection별 IRC identity | transport와 혼합 가능 | `ClientRegistry` | 991b76b8d793 | path/symbol은 위 commit 증거표에 연결했습니다. |
| nickname lookup/uniqueness | linear/display-only 가능 | canonical reverse index | b47135c51cfc | path/symbol은 위 commit 증거표에 연결했습니다. |
| protocol orchestration | Server에 혼합 가능 | `IrcApplication` | 0b5ae6aef328 | path/symbol은 위 commit 증거표에 연결했습니다. |
| registration authorization | handler별 검사 가능 | central gate + `maybeRegister()` | 035e1137e0dd → d9e420b570a0 | path/symbol은 위 commit 증거표에 연결했습니다. |

## 9. Thread 최종 상태

- 시작 직전 상태: IRC line을 구조화 값과 wire serialization으로 표현하는 공통 타입이 없었습니다.
- 마지막 commit `6b4a7738a285` 시점의 상태: transport framing부터 application/channel/output queue까지 주요 정상·일부 오류 경로가 한 process에서 조합됩니다.
- Thread 안에서 강화된 핵심 invariant: wire syntax value, descriptor-keyed registration state, canonical nickname uniqueness, transport/protocol 책임 분리, registration monotonic transition.
- 남은 한계 또는 후속 Thread에서 보강되는 부분: assertion은 주로 substring 중심이어서 exact 전체 frame/order/CRLF와 rare syscall failure, capacity/fairness를 증명하지 않습니다. e5e6c57db80d가 exact public contract로 정밀도를 높이고 계층별 deterministic tests가 후속됩니다.
- 최종 설명: `a22bf6ddbd75`에서 시작한 책임은 commit map 순서대로 상태 owner, failure branch와 cleanup ordering을 추가했고 `6b4a7738a285`에서 이 Thread가 정한 검증 또는 운영 상태에 도달합니다. 이전 시점의 미보장은 후속 fix/test SHA를 별도로 연결했으며 final HEAD 상태를 과거 commit에 소급하지 않았습니다.

## 10. 최종 architecture 또는 execution flow 정리

| 단계 | SHA | Caller / callee / state owner | 정상 transition | failure / cleanup transition |
| --- | --- | --- | --- | --- |
| complete line | 2ed9331124bb | `Server line callback` | IrcApplication::onLine | missing state는 생성, disconnect는 cleanup |
| grammar | c31a32b6cb24 | `IrcApplication::onLine` | parseLine → IrcMessage | malformed/oversize는 dispatch하지 않음 |
| gate | 035e1137e0dd | `handleMessage` | ClientState.registered와 allowlist | 미등록 금지 451, 등록 후 미지원 421 |
| registration | 582317254e24 / 80a639321bad / d9e420b570a0 | `PASS/NICK/USER handlers` | maybeRegister conjunction → registered | invalid/collision/password failure는 mutation 없이 numeric/close |
| welcome output | d9e420b570a0 | `maybeRegister` | 001 → 002 → 003 → Server::sendTo | send failure revalidation은 728aaabc4012에서 보강 |

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
