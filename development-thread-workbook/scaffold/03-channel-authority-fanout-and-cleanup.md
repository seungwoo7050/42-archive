# Thread 03 — Channel authority, fan-out, and cleanup

부제: 채널 권한, 팬아웃과 정리

## 1. Thread 목표

Channel aggregate가 membership·operator·invitation·topic·mode를 authoritative하게 유지하고, application이 fan-out과 identity/departure cleanup을 통해 client/index/channel graph를 일관되게 만드는 과정을 복원합니다.

Source에서 확정된 significance:

> Channel functionality becomes reliable only when the same state model governs admission, fan-out, identity changes, explicit departures, kicks, and transport disconnects. The S-level cleanup commit is the decisive point: it makes client, nickname, and channel state converge after every termination path and prevents stale descriptors or duplicate peer notifications.

이 문서의 source-confirmed 문장은 학습 방향을 고정하기 위한 출발점입니다. 실제 함수 동작, ownership, branch, 실행 결과는 반드시 각 SHA 코드와 test를 직접 확인해 채웁니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- operator가 항상 member라는 invariant는 aggregate 어느 연산에서 강제되는가?
- channel lookup과 create-on-demand는 어떤 command에서 분리되는가?
- 여러 shared channel을 가진 peer에게 NICK/QUIT를 한 번만 보내는 recipient 계산은 무엇인가?
- NICK, PART, QUIT, transport disconnect에서 old identity와 membership을 어느 시점까지 유지하는가?
- JOIN의 validation, invitation consumption, first-member operator, broadcast/topic/NAMES 순서는 무엇인가?
- MODE `+i`, `+t`, `+o`/`-o`가 authorization과 parameter cursor를 어떻게 유지하는가?

### Source와 직접 연결되는 invariant

- channel membership, operator state, invitations, empty-channel lifetime은 client/nickname state와 일치해야 합니다.
- disconnected descriptor는 어떤 channel에도 남아서는 안 되며 shared peer는 identity/quit transition을 최대 한 번 받아야 합니다.
- invite-only admission, topic protection, kick, invitation, operator mode는 membership과 operator authority를 강제해야 합니다.

### Source와 직접 연결되는 engineering difficulty

- NICK/PART/KICK/QUIT/transport failure/fan-out/empty-channel erase를 하나의 shared-state graph에서 일관되게 처리하는 문제.
- broadcast 중 lifecycle mutation이 borrowed channel/client state를 지울 수 있는 후속 reentrancy 문제.

## 3. 완료 기준

- `Channel`의 모든 authoritative state와 non-owning client identifier 관계를 그릴 수 있습니다.
- member/operator/invitation/topic/mode mutation을 실제 aggregate method와 command handler caller로 연결했습니다.
- deduplicated common-peer fan-out과 disconnect cleanup 순서를 state snapshot/erase 시점까지 설명할 수 있습니다.
- JOIN과 MODE의 권한 및 mutation-before-broadcast ordering을 해당 SHA 코드로 증명할 수 있습니다.
- send failure와 reentrant cleanup 관련 한계는 08 문서의 후속 fix/test와 연결해 표시했습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | 원문 확정 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `786ed5d839d9` | `feat(channel): 채널 상태 계약 정의` | A | ARCH, CHANNEL_STATE | Defines the authoritative Channel aggregate. |
| 2 | `966f5663dbcc` | `feat(channel): 구성원과 운영자 상태 관리` | B | CHANNEL_STATE | Implements membership and operator state. |
| 3 | `0d0d850f007d` | `feat(channel): 주제·초대·모드와 이름 규칙 구현` | B | CHANNEL_STATE, IRC_PROTOCOL | Implements topic, invitation, mode, and name rules. |
| 4 | `c1762e011fd6` | `feat(channel): 채널 탐색과 대상 해석 지원` | B | CHANNEL_STATE | Adds application-owned channel storage and command lookup. |
| 5 | `46e2b7785bee` | `feat(channel): 채널 방송 대상 팬아웃 지원` | A | CHANNEL_STATE, INTEGRATION | Introduces reusable, deduplicated channel and common-peer fan-out. |
| 6 | `a147d6994d58` | `feat(channel): 구성원 정리와 식별자 변경 방송` | S | CORE, CHANNEL_STATE, LIFECYCLE | Coordinates nickname transitions, PART, QUIT, membership removal, and empty-channel erasure. |
| 7 | `7ac793d3b695` | `feat(message): 채널 대상 메시지 방송` | B | IRC_PROTOCOL, CHANNEL_STATE | Routes PRIVMSG through membership-authorized channel fan-out. |
| 8 | `22e5f82bc693` | `feat(channel): JOIN 채널 입장 처리` | A | CHANNEL_STATE, IRC_PROTOCOL, RISK | Implements the central JOIN transition, invite-only admission, and first-member operator assignment. |
| 9 | `0e601da7d2bc` | `feat(channel): 채널 모드 조회와 i·t 변경` | B | CHANNEL_STATE, IRC_PROTOCOL | Exposes and mutates +i and +t under operator authorization. |
| 10 | `bce6933f69ab` | `feat(channel): 채널 운영자 모드 변경` | B | CHANNEL_STATE, IRC_PROTOCOL | Extends channel authority with +o and -o. |

Commit 순서는 source에 정의된 순서입니다. 이 문서 안에서 재정렬하지 않습니다.

## 5. Commit별 학습 기록

각 commit에서 final HEAD를 보지 말고 해당 SHA의 tree와 필요한 parent/직전 관련 SHA만 확인합니다. 아래의 implementation anchor는 source에서 확정된 내용이며, code evidence 칸은 학습자가 직접 채웁니다.

### 5.1 `786ed5d839d9` — `feat(channel): 채널 상태 계약 정의`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | ARCH, CHANNEL_STATE |
| 원문 확정 역할 | Defines the authoritative Channel aggregate. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Channel authority, fan-out, and cleanup` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- `Channel`은 membership, operator privilege, invitations, topic, `+i`/`+t` mode의 authoritative aggregate입니다.
- integer client id는 Server connection registry를 참조하지만 Connection ownership을 가져오지 않습니다.
- member/operator set, canonical nickname invitation, topic/mode mutation, name validation이 aggregate API 뒤에 숨겨집니다.

Source가 이름을 명시한 확인 대상:

- `Channel`, `+i`, `+t`

#### 해당 SHA에서 확인할 코드

- Channel 필드에서 member, operator, invitation, topic presence/text, invite-only, topic-protected 상태를 분류합니다.
- client id가 non-owning identity로만 저장되고 socket/Connection 포인터가 aggregate에 들어가지 않는지 확인합니다.
- container를 직접 노출하지 않고 add/remove/operator/invite/topic/mode 연산을 통해 invariant를 보존하는 API를 정리합니다.
- static name validation/canonicalization helper와 state key가 연결되는 이유를 확인합니다.

비교 기준:

- 기본 비교: `786ed5d839d9^` → `786ed5d839d9`

Source가 지목한 failure/risk 출발점:

> channel handler가 여러 container를 직접 수정하면 operator가 non-member로 남거나 invitation/identity casing이 서로 달라질 수 있습니다.

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
| 786ed5d839d9 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 786ed5d839d9^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `966f5663dbcc` — `feat(channel): 구성원과 운영자 상태 관리`. 원문 역할은 “Implements membership and operator state.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.2 `966f5663dbcc` — `feat(channel): 구성원과 운영자 상태 관리`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | CHANNEL_STATE |
| 원문 확정 역할 | Implements membership and operator state. |
| 학습 깊이 | thread 흐름에서 맡는 구현 역할과 필요한 코드·상태 변화를 확인합니다. S/A와 같은 분량을 강제하지 않습니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Channel authority, fan-out, and cleanup` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- 모든 operator는 member여야 하며 addMember는 초기 operator 부여를 원자적으로 수행할 수 있습니다.
- removeMember는 operator entry도 함께 제거하고 non-member에 대한 operator 변경은 무시됩니다.
- set 기반 membership은 duplicate join/removal을 멱등적으로 만들고 member snapshot은 deterministic order를 가집니다.

#### 해당 SHA에서 확인할 코드

- addMember/removeMember/setOperator 구현에서 membership과 operator set mutation 순서를 확인합니다.
- 첫 member를 operator로 추가하는 인자 또는 branch가 같은 transition 안에서 처리되는지 확인합니다.
- non-member에게 operator를 부여하려는 호출이 state를 바꾸지 않는 조건을 확인합니다.
- member vector export가 snapshot인지 reference인지, 정렬/ordered set 때문에 deterministic한지 확인합니다.

비교 기준:

- 기본 비교: `966f5663dbcc^` → `966f5663dbcc`
- Thread 직전 관련 SHA: `786ed5d839d9` — `feat(channel): 채널 상태 계약 정의`
- Channel 계약 SHA `786ed5d839d9`의 핵심 subset invariant 구현입니다.

Source가 지목한 failure/risk 출발점:

> membership 제거 뒤 operator set에 fd가 남으면 authorization과 MODE/NAMES projection이 오염됩니다.

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
| 966f5663dbcc | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 966f5663dbcc^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `0d0d850f007d` — `feat(channel): 주제·초대·모드와 이름 규칙 구현`. 원문 역할은 “Implements topic, invitation, mode, and name rules.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.3 `0d0d850f007d` — `feat(channel): 주제·초대·모드와 이름 규칙 구현`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | CHANNEL_STATE, IRC_PROTOCOL |
| 원문 확정 역할 | Implements topic, invitation, mode, and name rules. |
| 학습 깊이 | thread 흐름에서 맡는 구현 역할과 필요한 코드·상태 변화를 확인합니다. S/A와 같은 분량을 강제하지 않습니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Channel authority, fan-out, and cleanup` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- topic presence는 topic text와 별도로 저장되어 empty topic과 no topic을 구분합니다.
- invitation은 lowercase canonical nickname으로 insert/check/remove되고 set으로 멱등성을 가집니다.
- channel name은 `#` 또는 `&`로 시작하며 whitespace, comma, bell을 허용하지 않고 `modeString()`은 Boolean state에서 계산됩니다.

Source가 이름을 명시한 확인 대상:

- `#`, `&`, `modeString()`

#### 해당 SHA에서 확인할 코드

- topic setter/clear/query가 presence flag와 text를 어떤 순서로 바꾸는지 확인합니다.
- invite add/has/consume 또는 remove 경로가 동일 canonicalization을 사용하는지 확인합니다.
- channel name validator의 최소 길이, prefix, 금지 문자 조건을 경계 입력으로 정리합니다.
- `modeString()`이 별도 cached string 없이 `+i`/`+t` Boolean을 어떤 순서로 projection하는지 확인합니다.

비교 기준:

- 기본 비교: `0d0d850f007d^` → `0d0d850f007d`
- Thread 직전 관련 SHA: `966f5663dbcc` — `feat(channel): 구성원과 운영자 상태 관리`

Source가 지목한 failure/risk 출발점:

> topic absence를 empty string으로만 표현하거나 mode 문자열을 별도 저장하면 authoritative Boolean state와 wire projection이 어긋납니다.

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
| 0d0d850f007d | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 0d0d850f007d^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `c1762e011fd6` — `feat(channel): 채널 탐색과 대상 해석 지원`. 원문 역할은 “Adds application-owned channel storage and command lookup.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.4 `c1762e011fd6` — `feat(channel): 채널 탐색과 대상 해석 지원`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | CHANNEL_STATE |
| 원문 확정 역할 | Adds application-owned channel storage and command lookup. |
| 학습 깊이 | thread 흐름에서 맡는 구현 역할과 필요한 코드·상태 변화를 확인합니다. S/A와 같은 분량을 강제하지 않습니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Channel authority, fan-out, and cleanup` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- `IrcApplication`이 channel registry를 소유하고 create-on-demand와 non-creating lookup을 분리합니다.
- `findChannelForCommand()`는 nonexistent channel과 membership failure를 403/442로 구분합니다.
- channel-shaped target은 `#` 또는 `&` prefix로 판별되며 Connection/identity ownership은 기존 계층에 남습니다.

Source가 이름을 명시한 확인 대상:

- `ensureChannel()`, `findChannelForCommand()`, `#`, `&`, `Channel`, `Server`, `ClientRegistry`

#### 해당 SHA에서 확인할 코드

- channel map의 key/value 타입과 presented channel name을 key로 사용하는 이 SHA의 정책을 확인합니다.
- `ensureChannel()`을 호출할 수 있는 operation과 non-creating lookup을 써야 하는 read/unauthorized operation을 구분합니다.
- 403과 442를 helper가 어느 조건에서 전송하는지 확인합니다.
- target shape 판정이 Channel name validator와 어디까지 같고 어디까지 단순 prefix check인지 기록합니다.

비교 기준:

- 기본 비교: `c1762e011fd6^` → `c1762e011fd6`
- Thread 직전 관련 SHA: `0d0d850f007d` — `feat(channel): 주제·초대·모드와 이름 규칙 구현`

Source가 지목한 failure/risk 출발점:

> 조회 command가 create helper를 사용하면 존재하지 않는 channel이 error path에서 생성됩니다.

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
| c1762e011fd6 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| c1762e011fd6^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `46e2b7785bee` — `feat(channel): 채널 방송 대상 팬아웃 지원`. 원문 역할은 “Introduces reusable, deduplicated channel and common-peer fan-out.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.5 `46e2b7785bee` — `feat(channel): 채널 방송 대상 팬아웃 지원`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | CHANNEL_STATE, INTEGRATION |
| 원문 확정 역할 | Introduces reusable, deduplicated channel and common-peer fan-out. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Channel authority, fan-out, and cleanup` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- direct channel broadcast는 member snapshot에 전송하고 필요하면 한 fd를 제외합니다.
- common-channel broadcast는 source와 하나 이상의 channel을 공유하는 peer를 set union해 중복 제거합니다.
- MODE event도 동일 fan-out 경로와 queued non-blocking send를 사용합니다.

Source가 이름을 명시한 확인 대상:

- `sendRaw()`

#### 해당 SHA에서 확인할 코드

- channel broadcast helper가 live member snapshot을 얻고 recipient마다 send하는 loop를 확인합니다.
- common-peer 계산이 source가 속한 모든 channel을 순회해 set union을 만드는지, source 포함/제외 정책을 command별로 기록합니다.
- 두 사용자가 여러 channel을 공유해도 한 번만 받는 근거가 recipient set 자료구조에 있는지 확인합니다.
- broadcast failure가 이 SHA에서 loop/cleanup에 어떤 영향을 주는지 현재 동작만 기록하고 후속 fix와 혼동하지 않습니다.

비교 기준:

- 기본 비교: `46e2b7785bee^` → `46e2b7785bee`
- Thread 직전 관련 SHA: `c1762e011fd6` — `feat(channel): 채널 탐색과 대상 해석 지원`

Source가 지목한 failure/risk 출발점:

> shared channel 수만큼 같은 identity transition을 중복 전송하면 client-visible event가 중복되고 후속 state reasoning이 어려워집니다.

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
| 46e2b7785bee | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 46e2b7785bee^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `a147d6994d58` — `feat(channel): 구성원 정리와 식별자 변경 방송`. 원문 역할은 “Coordinates nickname transitions, PART, QUIT, membership removal, and empty-channel erasure.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.6 `a147d6994d58` — `feat(channel): 구성원 정리와 식별자 변경 방송`

| 항목 | 값 |
| --- | --- |
| Importance | S |
| Tags | CORE, CHANNEL_STATE, LIFECYCLE |
| 원문 확정 역할 | Coordinates nickname transitions, PART, QUIT, membership removal, and empty-channel erasure. |
| 학습 깊이 | 프로젝트 핵심 architecture/invariant로 취급합니다. 직전 상태, failure 가능성, 핵심 결정, 실제 코드, ownership/lifecycle/state transition, 후속 fix/test까지 깊게 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Channel authority, fan-out, and cleanup` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- registered NICK change는 old hostmask를 capture한 뒤 nickname index를 바꾸고 common peers와 자신에게 transition을 한 번씩 broadcast합니다.
- PART는 client가 아직 member일 때 broadcast한 뒤 membership/operator state를 제거하고 empty channel을 삭제합니다.
- disconnect cleanup은 identity와 unique peer set, channel names를 snapshot한 뒤 QUIT, 모든 membership 제거, empty channel 삭제, registry/index erase 순서로 수렴합니다.

Source가 이름을 명시한 확인 대상:

- `partChannel()`, `removeClientState()`

#### 해당 SHA에서 확인할 코드

- NICK path에서 old prefix capture, index mutation, common-peer calculation/broadcast 순서를 확인하고 event prefix가 old identity인 근거를 기록합니다.
- `partChannel()`이 존재/membership 검사, PART broadcast, member/operator removal, empty-channel erase를 어떤 순서로 수행하는지 추적합니다.
- `removeClientState()` 또는 대응 cleanup에서 client identity와 channel list를 mutation 전에 snapshot하는 코드를 찾습니다.
- QUIT recipient set이 여러 shared channel에서 deduplicate되는 자료구조와 source client 포함 여부를 확인합니다.
- channel map iteration 중 erase를 피하기 위해 names를 먼저 모으는 지점과 최종 registry/index erase 위치를 확인합니다.
- explicit PART, JOIN 0, QUIT, transport disconnect가 어떤 공통 helper를 공유하는지 caller graph를 작성합니다.

비교 기준:

- 기본 비교: `a147d6994d58^` → `a147d6994d58`
- Thread 직전 관련 SHA: `46e2b7785bee` — `feat(channel): 채널 방송 대상 팬아웃 지원`

Source가 지목한 failure/risk 출발점:

> disconnect된 fd가 channel에 남거나 NICK/QUIT가 중복 전송되면 이후 fan-out, NAMES, operator authorization이 잘못되거나 stale state를 참조합니다.

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
| a147d6994d58 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| a147d6994d58^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `7ac793d3b695` — `feat(message): 채널 대상 메시지 방송`. 원문 역할은 “Routes PRIVMSG through membership-authorized channel fan-out.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.7 `7ac793d3b695` — `feat(message): 채널 대상 메시지 방송`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | IRC_PROTOCOL, CHANNEL_STATE |
| 원문 확정 역할 | Routes PRIVMSG through membership-authorized channel fan-out. |
| 학습 깊이 | thread 흐름에서 맡는 구현 역할과 필요한 코드·상태 변화를 확인합니다. S/A와 같은 분량을 강제하지 않습니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Channel authority, fan-out, and cleanup` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- PRIVMSG target이 channel-shaped이면 channel 존재와 sender membership을 확인하고 실패 시 404를 반환합니다.
- 유효한 channel message는 sender를 제외한 current members에게 broadcast되고 nickname target은 기존 401 direct lookup을 유지합니다.
- multi-target 처리에서 한 target failure가 이후 target 처리를 막지 않습니다.

Source가 이름을 명시한 확인 대상:

- `PRIVMSG`

#### 해당 SHA에서 확인할 코드

- target split loop에서 channel/nickname 분기와 empty segment 처리 순서를 확인합니다.
- channel 존재, sender membership, fan-out exclusion 조건이 각각 어느 helper와 numeric으로 연결되는지 기록합니다.
- sender hostmask와 parsed message text가 direct/channel frame에 동일하게 사용되는지 확인합니다.
- 하나의 invalid target 뒤 다음 target이 계속 처리되는 control flow를 확인합니다.

비교 기준:

- 기본 비교: `7ac793d3b695^` → `7ac793d3b695`
- Thread 직전 관련 SHA: `a147d6994d58` — `feat(channel): 구성원 정리와 식별자 변경 방송`
- fan-out helper SHA `46e2b7785bee`를 실제 message command가 사용하는 단계입니다.

Source가 지목한 failure/risk 출발점:

> member가 아닌 client가 channel로 traffic을 주입하거나 sender에게 relay echo를 보내면 visibility/authorization contract가 깨집니다.

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
| 7ac793d3b695 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 7ac793d3b695^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `22e5f82bc693` — `feat(channel): JOIN 채널 입장 처리`. 원문 역할은 “Implements the central JOIN transition, invite-only admission, and first-member operator assignment.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.8 `22e5f82bc693` — `feat(channel): JOIN 채널 입장 처리`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | CHANNEL_STATE, IRC_PROTOCOL, RISK |
| 원문 확정 역할 | Implements the central JOIN transition, invite-only admission, and first-member operator assignment. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Channel authority, fan-out, and cleanup` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- JOIN은 comma-separated channel과 `JOIN 0`을 지원하고 invalid name을 registry mutation 전에 거부합니다.
- invite-only channel은 canonical nickname invitation을 요구하며 최초 member는 같은 transition에서 operator가 됩니다.
- membership 추가 뒤 invitation을 consume하고 JOIN broadcast, topic, NAMES를 post-join authoritative state에서 생성합니다.

Source가 이름을 명시한 확인 대상:

- `JOIN 0`

#### 해당 SHA에서 확인할 코드

- JOIN 0이 현재 channel snapshot을 통해 공통 departure helper를 호출하는지 확인합니다.
- 각 requested name의 validation, create/find, invite check, existing membership idempotence 순서를 추적합니다.
- new channel 판단과 first-member operator argument가 동일 addMember transition에 들어가는지 확인합니다.
- invitation consume이 membership 승인 전인지 후인지, 실패 시 invitation이 남는지 해당 SHA 기준으로 기록합니다.
- member가 visible해진 뒤 JOIN broadcast/topic/NAMES가 나가는 순서를 실제 send calls로 적습니다.
- rejoin 시 duplicate state mutation 없이 현재 NAMES만 돌려주는 branch를 확인합니다.

비교 기준:

- 기본 비교: `22e5f82bc693^` → `22e5f82bc693`
- Thread 직전 관련 SHA: `7ac793d3b695` — `feat(message): 채널 대상 메시지 방송`

Source가 지목한 failure/risk 출발점:

> broadcast나 NAMES를 membership mutation 전에 만들면 observer가 pre-join state를 보고, invitation을 너무 일찍 consume하면 실패한 join이 권한을 소모합니다.

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
| 22e5f82bc693 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 22e5f82bc693^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `0e601da7d2bc` — `feat(channel): 채널 모드 조회와 i·t 변경`. 원문 역할은 “Exposes and mutates +i and +t under operator authorization.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.9 `0e601da7d2bc` — `feat(channel): 채널 모드 조회와 i·t 변경`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | CHANNEL_STATE, IRC_PROTOCOL |
| 원문 확정 역할 | Exposes and mutates +i and +t under operator authorization. |
| 학습 깊이 | thread 흐름에서 맡는 구현 역할과 필요한 코드·상태 변화를 확인합니다. S/A와 같은 분량을 강제하지 않습니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Channel authority, fan-out, and cleanup` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- channel MODE query는 membership 없이 numeric 324를 반환하지만 modification은 member이자 operator여야 합니다.
- compact mode string parser는 add/remove direction을 유지하며 `i`, `t`를 독립 적용하고 unknown flag는 472로 보고합니다.
- aggregate mutation 뒤 accepted transition을 broadcast합니다.

Source가 이름을 명시한 확인 대상:

- `Channel::modeString()`, `i`, `t`, `+i`, `+t`

#### 해당 SHA에서 확인할 코드

- target이 channel인지 user인지 나누는 dispatcher와 query/modification 분기를 확인합니다.
- mode string의 `+`/`-` 방향 상태가 다음 flag까지 유지되는 parser loop를 추적합니다.
- `i`/`t` mutation, broadcast, unknown 472의 각 branch에서 loop가 계속되는지 또는 종료되는지 현재 semantics를 기록합니다.
- user-mode query와 unsupported self/other change가 channel authorization과 섞이지 않는지 확인합니다.

비교 기준:

- 기본 비교: `0e601da7d2bc^` → `0e601da7d2bc`
- Thread 직전 관련 SHA: `22e5f82bc693` — `feat(channel): JOIN 채널 입장 처리`

Source가 지목한 failure/risk 출발점:

> mode direction state를 잘못 유지하거나 mutation 전에 broadcast하면 wire event와 JOIN/TOPIC authorization state가 어긋납니다.

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
| 0e601da7d2bc | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 0e601da7d2bc^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `bce6933f69ab` — `feat(channel): 채널 운영자 모드 변경`. 원문 역할은 “Extends channel authority with +o and -o.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.10 `bce6933f69ab` — `feat(channel): 채널 운영자 모드 변경`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | CHANNEL_STATE, IRC_PROTOCOL |
| 원문 확정 역할 | Extends channel authority with +o and -o. |
| 학습 깊이 | thread 흐름에서 맡는 구현 역할과 필요한 코드·상태 변화를 확인합니다. S/A와 같은 분량을 강제하지 않습니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Channel authority, fan-out, and cleanup` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- compound channel mode parser에 argument-consuming `+o`/`-o`가 추가됩니다.
- 별도 parameter cursor는 nickname argument가 필요한 mode에서만 전진합니다.
- target은 live client이자 current channel member여야 하며 mutation은 `Channel::setOperator()`에 위임됩니다.

Source가 이름을 명시한 확인 대상:

- `+o`, `-o`, `Channel::setOperator()`

#### 해당 SHA에서 확인할 코드

- mode character cursor와 parameter cursor가 독립적으로 움직이는 loop를 예시 `+iot` 또는 source가 허용하는 조합으로 추적합니다.
- missing argument가 이후 mode parse를 중단하는지 계속하는지 해당 SHA의 control flow를 확인합니다.
- canonical nickname lookup, channel membership check, display nickname copy 순서를 확인합니다.
- `setOperator()`가 non-member grant를 거부하는 aggregate invariant를 command가 중복 구현하지 않는지 확인합니다.

비교 기준:

- 기본 비교: `bce6933f69ab^` → `bce6933f69ab`
- Thread 직전 관련 SHA: `0e601da7d2bc` — `feat(channel): 채널 모드 조회와 i·t 변경`

Source가 지목한 failure/risk 출발점:

> argument cursor를 모든 flag에서 전진시키면 이후 operator target이 틀어지고, membership 확인 없이 +o를 적용하면 operator subset invariant가 깨집니다.

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
| bce6933f69ab | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| bce6933f69ab^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 이 commit은 이 Thread의 마지막 항목입니다. Invariant ledger와 Thread 최종 상태에서 전체 변화를 연결합니다.

## 6. Invariant ledger

| Invariant | 처음 도입 | 강화/적용 | 부족함 또는 위험이 드러난 지점 | Fix/Test 연결 | 학습자 최종 기록 |
| --- | --- | --- | --- | --- | --- |
| operator ⊆ member | 786ed5d839d9 | 966f5663dbcc, bce6933f69ab | KICK/PART/disconnect 뒤 stale operator 여부 기록 | aggregate와 command code에서 확인 | [학습자 최종 상태 설명] |
| channel authoritative state | 786ed5d839d9 | 0d0d850f007d, c1762e011fd6 | lookup이 channel을 실수로 생성하는 위험 표시 | command별 non-creating lookup 확인 | [학습자 최종 상태 설명] |
| deduplicated fan-out | 46e2b7785bee | a147d6994d58, 7ac793d3b695 | 여러 shared channel 중복 수신 여부 기록 | 후속 smoke/contract test와 연결 | [학습자 최종 상태 설명] |
| cross-aggregate cleanup | a147d6994d58 | 22e5f82bc693 | broadcast 중 send failure의 reentrancy 한계 기록 | 08 문서의 728aaabc4012 / d48e1f1f8c04 / tests | [학습자 최종 상태 설명] |
| JOIN/MODE authorization | 22e5f82bc693 | 0e601da7d2bc, bce6933f69ab | mutation과 notification ordering 기록 | 09 문서의 contract/smoke 범위 확인 | [학습자 최종 상태 설명] |

Ledger 작성 기준:

- “도입”과 “완성”을 같은 의미로 쓰지 않습니다.
- 후속 fix가 이전 commit의 사실을 소급 변경하지 않도록 각 SHA 시점의 보장과 부족함을 분리합니다.
- source가 명시하지 않은 invariant를 추가할 때는 확정 사실이 아니라 학습자의 코드 해석으로 표시하고 path/symbol 증거를 붙입니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 | 실제 failure/risk | Fix 또는 기반 변화 | 수정된 decision/semantics | Test 연결 | 코드 증거 |
| --- | --- | --- | --- | --- | --- |
| 각 command가 membership container를 직접 수정한다는 가정 | operator/invitation/empty channel state가 서로 어긋남 | 786ed5d839d9이 aggregate boundary를 정립 | 966f5663dbcc / 0d0d850f007d가 invariant 연산 구현 | 후속 command 및 smoke에서 통합 확인 | [실제 code/test evidence] |
| shared channel마다 identity event를 broadcast | 같은 peer가 NICK/QUIT를 중복 수신 | 46e2b7785bee가 set union fan-out 도입 | a147d6994d58이 cleanup과 identity transition에 적용 | 6b4a7738a285 / e5e6c57db80d에서 live behavior 확인 | [실제 code/test evidence] |
| broadcast 후에도 actor/channel이 살아 있다는 가정 | send failure가 cleanup을 일으키면 stale state 사용 | 이 thread에서는 a147d6994d58의 정상 cleanup 기준을 기록 | 08 문서의 728aaabc4012 / d48e1f1f8c04가 수정 | 5edcafda8a4d / aee5edebe294가 deterministic 검증 | [실제 code/test evidence] |

## 8. Ownership / state / responsibility 변화

| 책임 또는 상태 | 이전 상태 | 이후 authoritative 위치 | 관련 commit | 학습자 확인 |
| --- | --- | --- | --- | --- |
| member/operator/invite/topic/mode storage | handler별 container | `Channel` aggregate | 786ed5d839d9 | [확인한 owner/state/lifetime] |
| channel registry와 lookup policy | 없음 | `IrcApplication` channel map/helper | c1762e011fd6 | [확인한 owner/state/lifetime] |
| recipient visibility 계산 | command별 중복 loop | fan-out helpers | 46e2b7785bee | [확인한 owner/state/lifetime] |
| identity/departure cleanup | 분산 command cleanup | `partChannel()` / `removeClientState()` 계열 | a147d6994d58 | [확인한 owner/state/lifetime] |
| admission/authority transition | 없음 | JOIN/MODE handlers + aggregate methods | 22e5f82bc693 → bce6933f69ab | [확인한 owner/state/lifetime] |

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
[registered command] → [channel target parse/lookup: creating 또는 non-creating 표시]
→ [membership/operator/invitation authorization]
→ `Channel` mutation → [member/common-peer snapshot] → [queued fan-out]
→ NICK/PART/QUIT/disconnect: [old identity snapshot] → [broadcast] → [membership/operator removal]
→ [empty channel erase] → [ClientRegistry/nickname index erase]
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
