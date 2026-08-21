# Thread 02 — Protocol boundary, identity, and registration

부제: 프로토콜 경계, 식별자와 등록

## 1. Thread 목표

wire line을 구조화 message로 바꾸는 문법 경계, descriptor 기반 client state와 nickname index, `IrcApplication` 책임 분리, PASS/NICK/USER 등록 gate가 하나의 실행 경로로 결합되는 과정을 복원합니다.

Source에서 확정된 significance:

> The sequence separates syntax, connection identity, and registration authorization rather than mixing them into the event loop. The application boundary and registration gate are the durable decisions; the individual registration commands are normal implementations within those decisions. The first smoke suite then verifies that framing, parsing, identity indexes, replies, and lifecycle transitions compose correctly.

이 문서의 source-confirmed 문장은 학습 방향을 고정하기 위한 출발점입니다. 실제 함수 동작, ownership, branch, 실행 결과는 반드시 각 SHA 코드와 test를 직접 확인해 채웁니다.

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
- registration prerequisites와 welcome reply ordering을 state transition diagram으로 작성했습니다.
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

Commit 순서는 source에 정의된 순서입니다. 이 문서 안에서 재정렬하지 않습니다.

## 5. Commit별 학습 기록

각 commit에서 final HEAD를 보지 말고 해당 SHA의 tree와 필요한 parent/직전 관련 SHA만 확인합니다. 아래의 implementation anchor는 source에서 확정된 내용이며, code evidence 칸은 학습자가 직접 채웁니다.

### 5.1 `a22bf6ddbd75` — `feat(parser): IRC 메시지 값과 직렬화 정의`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | IRC_PROTOCOL |
| 원문 확정 역할 | Introduces the structured IRC message representation. |
| 학습 깊이 | thread 흐름에서 맡는 구현 역할과 필요한 코드·상태 변화를 확인합니다. S/A와 같은 분량을 강제하지 않습니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Protocol boundary, identity, and registration` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- `IrcMessage`는 optional prefix, normalized command, ordered parameters, raw frame을 분리합니다.
- command는 생성과 비교 시 uppercase로 정규화되고 indexed access는 fallback을 지원합니다.
- `toLine()`은 optional prefix와 trailing-parameter 규칙을 적용해 CRLF로 끝나는 wire frame을 만듭니다.

Source가 이름을 명시한 확인 대상:

- `toLine()`, `raw`

#### 해당 SHA에서 확인할 코드

- 값 객체의 필드와 constructor/setter에서 command canonicalization이 한 번만 일어나는지 확인합니다.
- parameter accessor가 out-of-range에서 unchecked access 대신 어떤 fallback을 돌려주는지 확인합니다.
- `toLine()`이 empty, space 포함, colon 시작 parameter를 trailing field로 만드는 조건과 마지막 parameter에만 marker를 붙이는지 확인합니다.
- structured fields와 `raw`가 동시에 존재하는 이유를 각 사용 지점 후보와 함께 기록하되 실제 caller는 해당 SHA에서만 확인합니다.

비교 기준:

- 기본 비교: `a22bf6ddbd75^` → `a22bf6ddbd75`

Source가 지목한 failure/risk 출발점:

> 각 handler가 command casing과 wire serialization을 따로 구현하면 dispatch와 response 형식이 불일치합니다.

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
| a22bf6ddbd75 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| a22bf6ddbd75^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `c31a32b6cb24` — `feat(parser): IRC 한 줄 구문 해석 구현`. 원문 역할은 “Defines the line grammar and parameter parsing boundary.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.2 `c31a32b6cb24` — `feat(parser): IRC 한 줄 구문 해석 구현`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | IRC_PROTOCOL, RISK |
| 원문 확정 역할 | Defines the line grammar and parameter parsing boundary. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Protocol boundary, identity, and registration` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- transport terminator 제거 뒤 pre-CRLF 510-octet 한계를 적용합니다.
- optional prefix는 non-empty이며 뒤에 command text가 있어야 하고, middle parameter와 trailing parameter를 구분합니다.
- output object는 parse 전에 reset되며 실패 원인은 optional error channel로 반환됩니다.

#### 해당 SHA에서 확인할 코드

- line parser의 trim, length check, prefix parse, command parse, middle/trailing parse 순서를 실제 branch로 복원합니다.
- empty line, malformed prefix, missing command, oversized frame 각각이 어떤 error text와 false result를 내는지 기록합니다.
- trailing colon 뒤 remainder가 spaces를 포함한 채 보존되는지와 middle parameter 분리가 어디서 멈추는지 확인합니다.
- parse 실패 뒤 이전 message의 prefix/command/params가 남지 않는 reset 위치를 확인합니다.

비교 기준:

- 기본 비교: `c31a32b6cb24^` → `c31a32b6cb24`
- Thread 직전 관련 SHA: `a22bf6ddbd75` — `feat(parser): IRC 메시지 값과 직렬화 정의`
- 값/serialization 계약 SHA `a22bf6ddbd75`와 parser output 구성을 대조합니다.

Source가 지목한 failure/risk 출발점:

> 실패 시 이전 구조화 값이 남거나 trailing field를 다시 split하면 다음 command handler가 잘못된 의미를 처리합니다.

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
| c31a32b6cb24 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| c31a32b6cb24^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `aeb1e9b709b9` — `feat(reply): IRC 서버 응답 생성`. 원문 역할은 “Adds canonical server messages, numerics, and hostmasks.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.3 `aeb1e9b709b9` — `feat(reply): IRC 서버 응답 생성`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | IRC_PROTOCOL |
| 원문 확정 역할 | Adds canonical server messages, numerics, and hostmasks. |
| 학습 깊이 | thread 흐름에서 맡는 구현 역할과 필요한 코드·상태 변화를 확인합니다. S/A와 같은 분량을 강제하지 않습니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Protocol boundary, identity, and registration` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- numeric code는 3자리로 렌더링되고 recipient가 없으면 `*`가 첫 parameter로 사용됩니다.
- server-generated message는 CRLF로 끝나며 trailing marker는 마지막 parameter에만 적용됩니다.
- `ERROR`와 hostmask formatter는 identity가 덜 완성된 단계에서도 fallback을 제공합니다.

Source가 이름을 명시한 확인 대상:

- `*`, `ERROR`

#### 해당 SHA에서 확인할 코드

- numeric formatter에서 code padding, recipient insertion, middle/trailing parameter 조합 순서를 확인합니다.
- empty nickname, user, host 각각의 fallback이 registration 전 error path에서도 완전한 frame을 만드는지 확인합니다.
- handler가 직접 colon/CRLF를 조립하지 않고 helper를 사용하도록 만든 공개 API 범위를 기록합니다.
- 구조화 `IrcMessage::toLine()`과 reply helper가 책임을 어떻게 나누는지 해당 SHA의 caller를 통해 확인합니다.

비교 기준:

- 기본 비교: `aeb1e9b709b9^` → `aeb1e9b709b9`
- Thread 직전 관련 SHA: `c31a32b6cb24` — `feat(parser): IRC 한 줄 구문 해석 구현`

Source가 지목한 failure/risk 출발점:

> handler별 수동 문자열 조립은 numeric 자리수, target 위치, trailing colon, CRLF가 서로 달라지는 원인이 됩니다.

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
| aeb1e9b709b9 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| aeb1e9b709b9^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `991b76b8d793` — `feat(client): 연결별 등록 상태 저장`. 원문 역할은 “Stores descriptor-keyed registration state.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.4 `991b76b8d793` — `feat(client): 연결별 등록 상태 저장`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | IDENTITY |
| 원문 확정 역할 | Stores descriptor-keyed registration state. |
| 학습 깊이 | thread 흐름에서 맡는 구현 역할과 필요한 코드·상태 변화를 확인합니다. S/A와 같은 분량을 강제하지 않습니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Protocol boundary, identity, and registration` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- `ClientRegistry`는 fd를 key로 PASS, NICK, USER, registered 진행 상태와 identity fields를 저장합니다.
- `state()`는 create-on-first-access이고 `find()`/`contains()`는 phantom client를 만들지 않는 조회 경로입니다.
- erase는 멱등적이고 descriptor key snapshot은 제거 가능한 iteration을 지원합니다.

Source가 이름을 명시한 확인 대상:

- `Connection`, `ClientState`, `state()`, `find()`, `contains()`, `fd`

#### 해당 SHA에서 확인할 코드

- `ClientState`의 Boolean/identity/lifecycle 필드를 분류하고 등록 조건을 어떤 조합으로 표현할 수 있는지 적습니다.
- `state(fd)`와 `find(fd)`의 반환형·삽입 여부 차이를 코드로 확인합니다.
- map key와 state 내부 `fd` 필드의 authoritative 관계가 이 SHA에서 어떻게 초기화되는지 확인합니다.
- keys snapshot 반환이 이후 timeout/disconnect iteration에서 iterator invalidation을 피할 수 있는 이유를 구현으로 확인합니다.

비교 기준:

- 기본 비교: `991b76b8d793^` → `991b76b8d793`
- Thread 직전 관련 SHA: `aeb1e9b709b9` — `feat(reply): IRC 서버 응답 생성`

Source가 지목한 failure/risk 출발점:

> 조회가 무심코 state를 삽입하면 이미 끊긴 fd나 malformed callback에 phantom client가 생깁니다.

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
| 991b76b8d793 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 991b76b8d793^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `b47135c51cfc` — `feat(client): 닉네임 색인 관리`. 원문 역할은 “Establishes the case-insensitive nickname index invariant.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.5 `b47135c51cfc` — `feat(client): 닉네임 색인 관리`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | IDENTITY, RISK |
| 원문 확정 역할 | Establishes the case-insensitive nickname index invariant. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Protocol boundary, identity, and registration` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- reverse nickname index는 channel invitation과 같은 canonicalization을 사용해 case-insensitive lookup을 제공합니다.
- 표시용 spelling은 `ClientState`에 유지하고 canonical form은 uniqueness/lookup key로만 사용합니다.
- nickname 변경과 client erase는 descriptor state와 reverse index를 함께 갱신하며 collision 거부는 caller 책임입니다.

Source가 이름을 명시한 확인 대상:

- `ClientState`, `setNickname()`

#### 해당 SHA에서 확인할 코드

- canonicalization 함수가 nickname insert와 lookup 양쪽에서 동일하게 사용되는지 확인합니다.
- `setNickname()`에서 old canonical key 제거, state spelling 변경, new key 설치 순서를 추적합니다.
- erase에서 fd state와 reverse index를 함께 제거하는 경로를 확인합니다.
- occupied key 검사가 registry 내부가 아니라 caller 책임이라는 API 전제를 찾아, NICK handler가 나중에 지켜야 할 조건을 기록합니다.

비교 기준:

- 기본 비교: `b47135c51cfc^` → `b47135c51cfc`
- Thread 직전 관련 SHA: `991b76b8d793` — `feat(client): 연결별 등록 상태 저장`
- descriptor state SHA `991b76b8d793` 위에 두 번째 index consistency invariant를 추가합니다.

Source가 지목한 failure/risk 출발점:

> state의 nickname과 reverse index가 다르면 direct message, collision, invitation, cleanup이 서로 다른 사용자를 가리킵니다.

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
| b47135c51cfc | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| b47135c51cfc^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `0b5ae6aef328` — `feat(app): IRC 동작 조율 계약 정의`. 원문 역할은 “Defines IrcApplication as the protocol/domain coordinator above Server.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.6 `0b5ae6aef328` — `feat(app): IRC 동작 조율 계약 정의`

| 항목 | 값 |
| --- | --- |
| Importance | S |
| Tags | CORE, ARCH, INTEGRATION |
| 원문 확정 역할 | Defines IrcApplication as the protocol/domain coordinator above Server. |
| 학습 깊이 | 프로젝트 핵심 architecture/invariant로 취급합니다. 직전 상태, failure 가능성, 핵심 결정, 실제 코드, ownership/lifecycle/state transition, 후속 fix/test까지 깊게 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Protocol boundary, identity, and registration` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- `IrcApplication`은 `Server` callback 위에서 protocol/domain state를 조율하는 책임 경계입니다.
- `Server`는 descriptor, buffering, readiness를 유지하고 application은 password policy, runtime limits, registry, channels, dispatch, replies, cleanup을 소유합니다.
- public surface는 connect, line, disconnect callback과 일치하고 private handler/helper가 registration과 공통 reply/lifecycle을 나눕니다.

Source가 이름을 명시한 확인 대상:

- `IrcApplication`, `Server`

#### 해당 SHA에서 확인할 코드

- 클래스 선언에서 server reference/dependency, runtime policy, client registry, channel storage, metrics, handler table 또는 dispatch entry를 분류합니다.
- public callback entry와 private command handler 사이 호출 방향을 빈 실행 흐름에 채웁니다.
- transport-owned `Connection`과 application-owned client/channel state가 fd로 연결되지만 소유권은 이전하지 않는 지점을 확인합니다.
- reply, hostmask, numeric, raw send, close request, client removal helper가 어떤 중복을 제거하고 어떤 lifecycle 위험을 한 경계에 모으는지 기록합니다.
- Server internals에 직접 접근하지 않고도 protocol cleanup을 수행할 수 있는 공개 Server 연산을 대조합니다.
- 이 commit에서 아직 구현되지 않은 handler와 state transition을 구분해 “선언된 책임”과 “실제 동작”을 혼동하지 않습니다.

비교 기준:

- 기본 비교: `0b5ae6aef328^` → `0b5ae6aef328`
- Thread 직전 관련 SHA: `b47135c51cfc` — `feat(client): 닉네임 색인 관리`

Source가 지목한 failure/risk 출발점:

> transport와 protocol을 한 객체가 소유하면 socket failure가 identity/channel mutation과 뒤섞이고 계층별 test가 어려워집니다.

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
| 0b5ae6aef328 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 0b5ae6aef328^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `2ed9331124bb` — `feat(app): 연결 수명 콜백 조율`. 원문 역할은 “Connects transport lifecycle callbacks to client state, parsing, and cleanup.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.7 `2ed9331124bb` — `feat(app): 연결 수명 콜백 조율`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | LIFECYCLE, IRC_PROTOCOL, INTEGRATION |
| 원문 확정 역할 | Connects transport lifecycle callbacks to client state, parsing, and cleanup. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Protocol boundary, identity, and registration` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- accept callback은 fd-keyed client state를 만들고 peer address로 초기 host를 설정하며 empty password일 때만 pass authorization을 선행 완료합니다.
- 각 delivered line은 application boundary에서 정확히 한 번 parse되고 malformed syntax는 numeric 417을 받습니다.
- transport disconnect와 explicit quit가 같은 protocol cleanup path로 nickname/channel state를 제거할 수 있게 연결됩니다.

#### 해당 SHA에서 확인할 코드

- onConnect/onLine/onDisconnect 대응 함수의 caller가 Server callback이고 callee가 registry/parser/dispatch/cleanup인지 추적합니다.
- transport acceptance와 IRC registration이 별도 state라는 근거를 client flags와 callback mutation 순서로 기록합니다.
- registry entry가 없을 때 방어적으로 재구성하는 branch와 정상 path의 차이를 확인합니다.
- parse가 line마다 한 번만 호출되고 raw line을 여러 handler가 다시 parse하지 않는지 확인합니다.
- disconnect origin과 무관하게 같은 removal helper에 도달하는지 확인합니다.

비교 기준:

- 기본 비교: `2ed9331124bb^` → `2ed9331124bb`
- Thread 직전 관련 SHA: `0b5ae6aef328` — `feat(app): IRC 동작 조율 계약 정의`
- application contract `0b5ae6aef328`가 실제 transport callback에 연결되는 첫 구현입니다.

Source가 지목한 failure/risk 출발점:

> socket connect를 곧 registered identity로 간주하거나 line을 여러 계층에서 재해석하면 authorization과 error policy가 흔들립니다.

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
| 2ed9331124bb | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 2ed9331124bb^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `035e1137e0dd` — `feat(app): 등록 전 명령 분배 구현`. 원문 역할은 “Centralizes the pre-registration command gate.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.8 `035e1137e0dd` — `feat(app): 등록 전 명령 분배 구현`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | IRC_PROTOCOL, IDENTITY, RISK |
| 원문 확정 역할 | Centralizes the pre-registration command gate. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Protocol boundary, identity, and registration` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- PASS, NICK, USER, PING, QUIT은 registration 전에도 dispatch됩니다.
- 그 밖의 command는 registration 전 numeric 451, 등록 후 unsupported command는 numeric 421을 받습니다.
- registration gate는 parser가 아니라 application authorization boundary에 위치합니다.

#### 해당 SHA에서 확인할 코드

- dispatch 함수에서 command 비교 순서와 pre-registration 허용 set을 확인합니다.
- registered flag 검사 전후에 451과 421이 각각 발생하는 branch를 complete frame 형식과 함께 기록합니다.
- syntax validity와 lifecycle authorization이 서로 다른 단계임을 parser result와 registry state 사용 순서로 설명합니다.
- 나중에 post-registration command를 추가할 때 gate를 우회하지 않도록 handler insertion 위치를 확인합니다.

비교 기준:

- 기본 비교: `035e1137e0dd^` → `035e1137e0dd`
- Thread 직전 관련 SHA: `2ed9331124bb` — `feat(app): 연결 수명 콜백 조율`

Source가 지목한 failure/risk 출발점:

> 각 handler가 registration 여부를 독립적으로 검사하면 일부 command가 조기 허용되거나 서로 다른 numeric을 반환합니다.

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
| 035e1137e0dd | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 035e1137e0dd^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `582317254e24` — `feat(registration): PASS 인증 상태 처리`. 원문 역할은 “Adds password authorization state.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.9 `582317254e24` — `feat(registration): PASS 인증 상태 처리`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | IDENTITY, IRC_PROTOCOL |
| 원문 확정 역할 | Adds password authorization state. |
| 학습 깊이 | thread 흐름에서 맡는 구현 역할과 필요한 코드·상태 변화를 확인합니다. S/A와 같은 분량을 강제하지 않습니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Protocol boundary, identity, and registration` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- PASS는 registration state machine의 비가역 단계이며 이미 registered 또는 passOk인 client의 재제출을 막습니다.
- missing credential은 461, wrong password는 464와 close request로 처리됩니다.
- matching password만 `passOk`를 세우고 직접 등록하지 않고 `maybeRegister()`를 호출합니다.

Source가 이름을 명시한 확인 대상:

- `passOk`, `maybeRegister()`

#### 해당 SHA에서 확인할 코드

- handler의 early rejection 순서가 registered/passOk/missing/wrong/correct를 어떻게 구분하는지 확인합니다.
- wrong password response enqueue와 graceful close request의 순서를 확인합니다.
- `passOk` mutation 뒤 `maybeRegister()`가 호출되고 nickname/user prerequisites를 직접 우회하지 않는지 확인합니다.
- empty password가 onConnect에서 이미 승인된 상태와 PASS handler가 충돌하지 않는지 해당 SHA의 branch를 확인합니다.

비교 기준:

- 기본 비교: `582317254e24^` → `582317254e24`
- Thread 직전 관련 SHA: `035e1137e0dd` — `feat(app): 등록 전 명령 분배 구현`

Source가 지목한 failure/risk 출발점:

> PASS 하나만 성공했다고 registered를 세우거나 성공 뒤 credential을 다시 쓸 수 있으면 registration monotonicity가 깨집니다.

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
| 582317254e24 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 582317254e24^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `80a639321bad` — `feat(registration): 닉네임 검증과 색인 갱신`. 원문 역할은 “Adds nickname validation and collision handling.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.10 `80a639321bad` — `feat(registration): 닉네임 검증과 색인 갱신`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | IDENTITY, IRC_PROTOCOL |
| 원문 확정 역할 | Adds nickname validation and collision handling. |
| 학습 깊이 | thread 흐름에서 맡는 구현 역할과 필요한 코드·상태 변화를 확인합니다. S/A와 같은 분량을 강제하지 않습니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Protocol boundary, identity, and registration` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- nickname은 non-empty, 최대 30자, 허용된 시작 문자와 separator 규칙을 통과해야 합니다.
- missing, invalid syntax, canonical collision은 각각 431, 432, 433으로 구분됩니다.
- collision lookup은 `setNickname()` 전 수행되고 같은 fd의 canonical-equivalent spelling은 유지/변경할 수 있습니다.

Source가 이름을 명시한 확인 대상:

- `setNickname()`

#### 해당 SHA에서 확인할 코드

- nickname validator에서 첫 문자와 나머지 문자의 금지 조건, 길이 경계, whitespace/separator 검사를 확인합니다.
- canonical index lookup이 mutation 전에 실행되어 occupied key를 덮어쓰지 않는지 확인합니다.
- 동일 fd가 대소문자만 다른 nickname으로 바꾸는 경우와 다른 fd가 같은 canonical key를 요청하는 경우를 branch로 비교합니다.
- 성공 뒤 `maybeRegister()`가 호출되고 NICK만으로 registered를 강제하지 않는지 확인합니다.

비교 기준:

- 기본 비교: `80a639321bad^` → `80a639321bad`
- Thread 직전 관련 SHA: `582317254e24` — `feat(registration): PASS 인증 상태 처리`
- reverse index 계약 `b47135c51cfc`의 caller 책임을 실제 handler가 이행하는지 확인합니다.

Source가 지목한 failure/risk 출발점:

> index를 먼저 갱신하거나 collision을 display spelling으로만 비교하면 두 fd가 같은 canonical identity를 차지할 수 있습니다.

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
| 80a639321bad | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 80a639321bad^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `d9e420b570a0` — `feat(registration): USER 정보와 환영 응답 연결`. 원문 역할은 “Completes PASS/NICK/USER registration and welcome replies.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.11 `d9e420b570a0` — `feat(registration): USER 정보와 환영 응답 연결`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | IDENTITY, IRC_PROTOCOL |
| 원문 확정 역할 | Completes PASS/NICK/USER registration and welcome replies. |
| 학습 깊이 | thread 흐름에서 맡는 구현 역할과 필요한 코드·상태 변화를 확인합니다. S/A와 같은 분량을 강제하지 않습니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Protocol boundary, identity, and registration` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- USER는 registration 후 거부되고 4개 parameter를 요구하며 username과 trailing real name을 저장합니다.
- `maybeRegister()`는 pass authorization, nickname, user data 세 prerequisite를 확인합니다.
- 모든 조건이 성립하면 registered flag를 먼저 세운 뒤 welcome numerics 001, 002, 003을 queue합니다.

Source가 이름을 명시한 확인 대상:

- `maybeRegister()`

#### 해당 SHA에서 확인할 코드

- USER handler의 parameter indexing과 trailing real name 저장 지점을 확인합니다.
- `maybeRegister()`의 prerequisite 조건을 Boolean 식으로 정확히 적고 early return이 반복 호출을 무해하게 만드는지 확인합니다.
- registered state mutation이 welcome send보다 먼저인 순서와 duplicate welcome 방지 의도를 기록합니다.
- 001–003의 recipient와 server prefix가 reply helper를 통해 구성되는 호출 흐름을 확인합니다.

비교 기준:

- 기본 비교: `d9e420b570a0^` → `d9e420b570a0`
- Thread 직전 관련 SHA: `80a639321bad` — `feat(registration): 닉네임 검증과 색인 갱신`
- 후속 application fix `728aaabc4012`에서는 send failure 때문에 이 순서를 다시 검토하므로 현재 SHA의 한계를 별도로 남깁니다.

Source가 지목한 failure/risk 출발점:

> welcome을 먼저 보내고 state를 나중에 바꾸면 재진입/반복 호출에서 중복 sequence가 발생할 수 있습니다.

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
| d9e420b570a0 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| d9e420b570a0^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `6b4a7738a285` — `test(smoke): 실제 TCP 등록과 채널 흐름 검증`. 원문 역할은 “Proves the integrated registration and command path over real TCP.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.12 `6b4a7738a285` — `test(smoke): 실제 TCP 등록과 채널 흐름 검증`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | VERIFICATION, INTEGRATION, RISK |
| 원문 확정 역할 | Proves the integrated registration and command path over real TCP. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 thread에서는 parser·identity·registration이 실제 TCP에서 한 경로로 결합되는 최초 증거로 봅니다.

#### Source에서 확정된 implementation anchor

- 실제 loopback TCP socket과 compiled server process를 사용하는 첫 broad end-to-end smoke harness입니다.
- runner는 free port 선택, process launch, accept readiness wait, isolated log, EXIT trap cleanup을 제공합니다.
- scenario는 password rejection, complete registration, fragmented input, nickname collision, channel/messaging/mode/cleanup 흐름을 통합 검증합니다.

Source가 이름을 명시한 확인 대상:

- `test`, `smoke`

#### 해당 SHA에서 확인할 코드

- shell runner가 server binary를 어떤 option으로 실행하고 readiness를 어떻게 판정하며 실패 시 어떤 log를 남기는지 확인합니다.
- Python peer가 command를 두 TCP write로 쪼개는 지점과 server framing path가 packet boundary와 무관함을 검증하는 assertion을 찾습니다.
- 등록, NAMES/TOPIC, direct/channel PRIVMSG, INVITE, +i/+o, KICK, PART, QUIT가 실제 어떤 production callback과 handler를 통과하는지 추적합니다.
- assertion이 substring 기반인지 exact frame 기반인지 이 SHA의 test technique을 명시합니다.
- cleanup trap이 success/failure 모두에서 process와 temporary files를 정리하는지 확인합니다.

비교 기준:

- 기본 비교: `6b4a7738a285^` → `6b4a7738a285`
- Thread 직전 관련 SHA: `d9e420b570a0` — `feat(registration): USER 정보와 환영 응답 연결`

Source가 지목한 failure/risk 출발점:

> 각 단위가 독립적으로 맞아도 socket, event loop, parser, registry, replies, channel state가 연결된 실행에서는 ordering이나 framing 오류가 생길 수 있습니다.

#### Test / verification 학습 기록

| 구분 | Source에서 확정된 출발점 | 학습자 코드·실행 기록 |
| --- | --- | --- |
| 대상 production invariant | transport framing, registration, nickname index, channel state와 queued send가 한 process에서 결합되는 production invariant | [관련 production path와 symbol을 추가] |
| 재현 failure / boundary | wrong password, fragmented TCP input, case-insensitive collision, multi-client channel/mode/message/cleanup 흐름 | [입력, state, injected result를 정확히 기록] |
| test technique | compiled server + real loopback TCP + shell process harness + Python peer의 broad substring-oriented assertions | [test double/real socket/process의 구성 증거] |
| 통과하는 production code path | process startup → listener/event loop → Connection framing → parser → IrcApplication dispatch → registry/channel → queued output | [caller → callee → branch를 해당 SHA에서 연결] |
| 이 test가 증명하는 것 | 주요 계층이 실제 socket과 process 안에서 통합되어 정상·일부 오류 흐름을 수행함 | [실행 결과와 assertion 근거] |
| 이 test가 증명하지 않는 것 | exact frame 전체, 모든 ordering/CRLF, rare syscall/event failure, formal capacity나 fairness | [과장하지 않을 범위] |
| test 성격 | broad end-to-end integration smoke | [broad/deterministic 판단 근거] |
| 막는 회귀 | packet boundary를 command boundary로 취급하거나 registry/channel fan-out이 통합 시 깨지는 회귀 | [후속 변경에서 깨질 수 있는 invariant] |

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
| 6b4a7738a285 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 6b4a7738a285^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 이 commit은 이 Thread의 마지막 항목입니다. Invariant ledger와 Thread 최종 상태에서 전체 변화를 연결합니다.

## 6. Invariant ledger

| Invariant | 처음 도입 | 강화/적용 | 부족함 또는 위험이 드러난 지점 | Fix/Test 연결 | 학습자 최종 기록 |
| --- | --- | --- | --- | --- | --- |
| wire syntax의 authoritative value | a22bf6ddbd75 | c31a32b6cb24, aeb1e9b709b9 | parse failure/reset과 reply shape를 기록 | 6b4a7738a285에서 live wire 조합 확인 | [학습자 최종 상태 설명] |
| descriptor-keyed registration state | 991b76b8d793 | 2ed9331124bb | transport connect와 registered state 혼동 위험을 표시 | 6b4a7738a285 | [학습자 최종 상태 설명] |
| canonical nickname uniqueness | b47135c51cfc | 80a639321bad | collision check 전 mutation 여부 기록 | 6b4a7738a285의 case-insensitive collision scenario | [학습자 최종 상태 설명] |
| transport/protocol 책임 분리 | 0b5ae6aef328 | 2ed9331124bb, 035e1137e0dd | response failure가 application state를 지울 수 있는 후속 위험 표시 | 08 문서의 728aaabc4012 / 5edcafda8a4d | [학습자 최종 상태 설명] |
| registration monotonic transition | 582317254e24 | 80a639321bad, d9e420b570a0 | welcome enqueue failure 한계 기록 | 6b4a7738a285 및 후속 5edcafda8a4d | [학습자 최종 상태 설명] |

Ledger 작성 기준:

- “도입”과 “완성”을 같은 의미로 쓰지 않습니다.
- 후속 fix가 이전 commit의 사실을 소급 변경하지 않도록 각 SHA 시점의 보장과 부족함을 분리합니다.
- source가 명시하지 않은 invariant를 추가할 때는 확정 사실이 아니라 학습자의 코드 해석으로 표시하고 path/symbol 증거를 붙입니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 | 실제 failure/risk | Fix 또는 기반 변화 | 수정된 decision/semantics | Test 연결 | 코드 증거 |
| --- | --- | --- | --- | --- | --- |
| command string을 각 handler가 직접 해석한다는 가정 | casing/trailing parameter/error reset 불일치 | a22bf6ddbd75 + c31a32b6cb24가 parser boundary를 정립 | aeb1e9b709b9가 reply format을 중앙화 | 6b4a7738a285가 broad live flow 검증 | [실제 code/test evidence] |
| nickname spelling만 비교하면 충분하다는 가정 | 대소문자 변형 collision과 stale reverse mapping | b47135c51cfc가 canonical index를 정립 | 80a639321bad가 mutation 전 collision 검증 | 6b4a7738a285의 collision scenario | [실제 code/test evidence] |
| registration response send는 실패하지 않는다는 초기 가정 | welcome 중 disconnect 시 stale application state 가능 | 이 thread에서는 d9e420b570a0의 초기 순서를 기록 | 08 문서의 728aaabc4012가 revalidation 규칙을 수정 | 5edcafda8a4d가 one-byte limit으로 검증 | [실제 code/test evidence] |

## 8. Ownership / state / responsibility 변화

| 책임 또는 상태 | 이전 상태 | 이후 authoritative 위치 | 관련 commit | 학습자 확인 |
| --- | --- | --- | --- | --- |
| frame text ↔ structured message | handler별 문자열 가능성 | `IrcMessage`와 parser/reply helper | a22bf6ddbd75 → aeb1e9b709b9 | [확인한 owner/state/lifetime] |
| connection별 IRC identity | transport `Connection`에 섞일 가능성 | `ClientRegistry` | 991b76b8d793 | [확인한 owner/state/lifetime] |
| nickname lookup/uniqueness | linear scan 가능성 | canonical reverse index | b47135c51cfc | [확인한 owner/state/lifetime] |
| protocol orchestration | `Server`에 섞일 가능성 | `IrcApplication` | 0b5ae6aef328 | [확인한 owner/state/lifetime] |
| registration authorization | handler별 검사 가능성 | central dispatch gate + `maybeRegister()` | 035e1137e0dd → d9e420b570a0 | [확인한 owner/state/lifetime] |

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
[Connection이 전달한 complete line] → `IrcApplication` [line callback symbol 기입]
→ [parser symbol] → `IrcMessage`(prefix/command/params/raw)
→ [ClientRegistry lookup/create 여부] → [registration gate]
→ PASS / NICK / USER → [`maybeRegister()` prerequisite 식 기입]
→ registered state mutation → 001 → 002 → 003 → [Server queued send path]
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
