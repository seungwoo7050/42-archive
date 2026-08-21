# Thread 03 — Channel authority, fan-out, and cleanup

부제: 채널 권한, 팬아웃과 정리

## 1. Thread 목표

Channel aggregate가 membership·operator·invitation·topic·mode를 authoritative하게 유지하고, application이 fan-out과 identity/departure cleanup을 통해 client/index/channel graph를 일관되게 만드는 과정을 복원합니다.

Source에서 확정된 significance:

> Channel functionality becomes reliable only when the same state model governs admission, fan-out, identity changes, explicit departures, kicks, and transport disconnects. The S-level cleanup commit is the decisive point: it makes client, nickname, and channel state converge after every termination path and prevents stale descriptors or duplicate peer notifications.

이 문서의 source-confirmed 문장, commit map, SHA, subject, importance, tags와 원문 역할은 변경하지 않았습니다. 아래 학습 기록은 지정 branch의 각 exact SHA에서 확인한 code diff를 기준으로 작성했습니다.

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

- `Channel`의 모든 authoritative state와 non-owning client identifier 관계를 정리했습니다.
- member/operator/invitation/topic/mode mutation을 실제 aggregate method와 command handler caller로 연결했습니다.
- deduplicated common-peer fan-out과 disconnect cleanup 순서를 snapshot/erase 시점까지 설명합니다.
- JOIN과 MODE의 권한 및 mutation-before-broadcast ordering을 해당 SHA 코드로 확인했습니다.
- send failure와 reentrant cleanup 한계는 Thread 08의 후속 fix/test와 연결했습니다.

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

Commit 순서는 source에 정의된 순서이며 재정렬하지 않았습니다.

## 5. Commit별 학습 기록

각 기록은 해당 commit의 exact diff에서 확인한 파일·symbol·state와, 필요한 경우 parent/앞선 관련 SHA의 상태 차이를 기준으로 합니다. 후속 commit의 field나 test seam을 이전 commit에 소급하지 않았습니다.

### 5.1 `786ed5d839d9` — `feat(channel): 채널 상태 계약 정의`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | ARCH, CHANNEL_STATE |
| 원문 확정 역할 | Defines the authoritative Channel aggregate. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Defines the authoritative Channel aggregate.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | application에 채널별 구성원·운영자·초대·주제·모드를 함께 보존하는 authoritative aggregate가 없었습니다. |
| 주요 문제와 설계 판단 | `Channel`이 이름, member fd set, operator fd set, canonical nickname invitation set, topic 존재/문자열, `+i`·`+t` 상태를 private field로 소유하고 mutation/query API를 제공하도록 계약을 정의했습니다. |
| 변경 파일·symbol | `include/Channel.hpp — Channel state and public mutation/query API` |
| state / ownership 변화 | 채널은 client fd를 비소유 식별자로만 보관합니다. socket과 `Connection`의 lifetime은 계속 `Server`가 소유하고 `Channel`은 membership graph만 소유합니다. |
| failure 또는 boundary | container를 handler에 직접 노출하지 않아 비회원 운영자, casing이 다른 invitation, topic presence와 text의 불일치를 aggregate 내부에서 막을 수 있게 했습니다. |
| 보장 / 비보장 | 보장: membership·authority·invitation·topic·mode를 한 객체에서 갱신할 수 있는 단일 state owner가 생깁니다.<br>비보장: 각 mutation의 실제 구현과 command authorization은 아직 없습니다. |
| 다음 관련 변화 | 966f5663dbcc가 member/operator invariant를, 0d0d850f007d가 topic/invite/mode/name 규칙을 구현합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `786ed5d839d9` | `include/Channel.hpp` | `Channel private fields` | member/operator/invitation/topic/mode의 authoritative 저장 위치 |
| `786ed5d839d9` | `include/Channel.hpp` | `member and mode API` | handler가 container를 직접 수정하지 않는 aggregate 경계 |

- 조사 방법: GitHub에서 `786ed5d839d9`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `966f5663dbcc` — `feat(channel): 구성원과 운영자 상태 관리`. 원문 역할은 “Implements membership and operator state.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.2 `966f5663dbcc` — `feat(channel): 구성원과 운영자 상태 관리`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | CHANNEL_STATE |
| 원문 확정 역할 | Implements membership and operator state. |
| 학습 깊이 | Thread 흐름에서 맡는 구체적 구현 역할과 핵심 state/branch만 기록합니다. |

#### Source에서 확정된 역할

> Implements membership and operator state.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| Thread 내 구현 역할 | member 추가·삭제와 operator 승격·해제를 aggregate method로 구현했습니다. `removeMember()`는 같은 fd를 operator set에서도 지우고 `setOperator(true)`는 현재 member인 fd만 허용했습니다. |
| 확인한 변경 파일·symbol | `src/Channel.cpp — addMember, removeMember, hasMember, setOperator, isOperator, members` |
| 핵심 state / branch | operator set은 member set의 부분집합으로 유지되며 `members()`는 fan-out과 안전한 iteration에 사용할 값 snapshot을 반환합니다. |
| failure handling | 비회원에게 운영자 권한을 부여하려는 요청은 상태를 변경하지 않으며, 퇴장한 fd가 operator로 남지 않습니다. |
| 보장과 다음 연결 | “operator는 항상 member”라는 핵심 채널 invariant가 모든 aggregate mutation에서 유지됩니다. 0d0d850f007d가 나머지 채널 상태를 구현하고 bce6933f69ab가 `+o/-o` command에 연결합니다. |
| 이 시점의 한계 | invitation·topic·mode와 실제 MODE authorization은 아직 없습니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `966f5663dbcc` | `src/Channel.cpp` | `Channel::removeMember` | member와 operator state를 함께 제거 |
| `966f5663dbcc` | `src/Channel.cpp` | `Channel::setOperator` | 비회원 운영자 승격을 거부 |

- 조사 방법: GitHub에서 `966f5663dbcc`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `0d0d850f007d` — `feat(channel): 주제·초대·모드와 이름 규칙 구현`. 원문 역할은 “Implements topic, invitation, mode, and name rules.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.3 `0d0d850f007d` — `feat(channel): 주제·초대·모드와 이름 규칙 구현`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | CHANNEL_STATE, IRC_PROTOCOL |
| 원문 확정 역할 | Implements topic, invitation, mode, and name rules. |
| 학습 깊이 | Thread 흐름에서 맡는 구체적 구현 역할과 핵심 state/branch만 기록합니다. |

#### Source에서 확정된 역할

> Implements topic, invitation, mode, and name rules.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| Thread 내 구현 역할 | topic presence/text, canonical nickname invitation, invite-only와 topic-protected flag, 채널 이름 검증 및 nickname canonicalization을 구현했습니다. |
| 확인한 변경 파일·symbol | `src/Channel.cpp — topic, invitation, mode, name/canonical helpers` |
| 핵심 state / branch | 초대는 display spelling이 아니라 canonical key로 저장되고, topic은 text와 존재 여부를 함께 표현합니다. |
| failure handling | 잘못된 channel name은 생성 전에 거부할 수 있고, clearInvite는 없는 초대에도 안전하며 mode query는 현재 aggregate state만 읽습니다. |
| 보장과 다음 연결 | 입장·TOPIC·MODE command가 의존할 authoritative channel policy state가 완성됩니다. c1762e011fd6가 application-owned channel map을, 22e5f82bc693과 0e601da7d2bc가 command transition을 추가합니다. |
| 이 시점의 한계 | application map과 command lookup/authorization은 아직 연결되지 않았습니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `0d0d850f007d` | `src/Channel.cpp` | `Channel::canonicalNick / invite / clearInvite` | case-insensitive invitation state |
| `0d0d850f007d` | `src/Channel.cpp` | `topic and mode methods` | topic presence와 +i/+t mutation을 aggregate에 집중 |

- 조사 방법: GitHub에서 `0d0d850f007d`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `c1762e011fd6` — `feat(channel): 채널 탐색과 대상 해석 지원`. 원문 역할은 “Adds application-owned channel storage and command lookup.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.4 `c1762e011fd6` — `feat(channel): 채널 탐색과 대상 해석 지원`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | CHANNEL_STATE |
| 원문 확정 역할 | Adds application-owned channel storage and command lookup. |
| 학습 깊이 | Thread 흐름에서 맡는 구체적 구현 역할과 핵심 state/branch만 기록합니다. |

#### Source에서 확정된 역할

> Adds application-owned channel storage and command lookup.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| Thread 내 구현 역할 | `IrcApplication`에 channel map을 추가하고 create-on-demand `ensureChannel()`과 non-creating lookup/command helper를 분리했습니다. command helper는 존재·membership 요구에 따라 403/442를 보냅니다. |
| 확인한 변경 파일·symbol | `src/IrcApplication.hpp — _channels`<br>`src/ApplicationSupport.cpp — ensureChannel, findChannelForCommand, eraseChannelIfEmpty` |
| 핵심 state / branch | channel object lifetime의 owner는 `IrcApplication::_channels`이고 handler가 보유한 pointer/reference는 해당 map entry가 존재하는 동안만 유효합니다. |
| failure handling | 조회 command가 실수로 채널을 생성하지 않으며, 없는 채널과 비회원 접근이 mutation 전에 종료됩니다. |
| 보장과 다음 연결 | 채널 생성과 조회의 의미가 command별로 구분되고 empty-channel erase 종착점이 생깁니다. 46e2b7785bee가 map의 member snapshots를 이용한 fan-out을 추가하고 728aaabc4012가 send 뒤 relookup 규칙을 보강합니다. |
| 이 시점의 한계 | broadcast 중 map entry가 지워지는 reentrancy는 아직 방어하지 않습니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `c1762e011fd6` | `src/ApplicationSupport.cpp` | `ensureChannel` | create-on-demand가 필요한 command만 map entry 생성 |
| `c1762e011fd6` | `src/ApplicationSupport.cpp` | `findChannelForCommand` | 403/442를 mutation 전 공통 검사 |

- 조사 방법: GitHub에서 `c1762e011fd6`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `46e2b7785bee` — `feat(channel): 채널 방송 대상 팬아웃 지원`. 원문 역할은 “Introduces reusable, deduplicated channel and common-peer fan-out.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.5 `46e2b7785bee` — `feat(channel): 채널 방송 대상 팬아웃 지원`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | CHANNEL_STATE, INTEGRATION |
| 원문 확정 역할 | Introduces reusable, deduplicated channel and common-peer fan-out. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Introduces reusable, deduplicated channel and common-peer fan-out.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | handler마다 channel member를 직접 순회해야 했고 여러 공통 채널을 가진 peer에게 동일 event가 중복될 수 있었습니다. |
| 주요 문제와 설계 판단 | 한 channel의 `members()` snapshot을 순회하는 broadcast와, sender가 속한 모든 channel의 peer fd를 `std::set<int>`에 합치는 common-peer fan-out을 구현했습니다. |
| 변경 파일·symbol | `src/ApplicationSupport.cpp — broadcastToChannel, broadcastToCommonPeers` |
| state / ownership 변화 | fan-out 도중 순회 기준은 live container iterator가 아니라 fd snapshot이며 recipient dedup set이 한 transition당 최대 한 번 전송을 보장합니다. |
| failure 또는 boundary | 없는 client/connection으로 보내는 개별 실패는 server send 결과와 cleanup으로 넘어가며 다른 recipient 계산은 snapshot에 의해 계속 결정됩니다. |
| 보장 / 비보장 | 보장: NICK/QUIT 같은 identity transition이 shared channel 수와 무관하게 같은 peer에게 한 번만 전달될 수 있습니다.<br>비보장: send가 sender나 channel을 동기적으로 지울 수 있다는 cross-layer invalidation은 아직 처리하지 않습니다. |
| 다음 관련 변화 | a147d6994d58가 identity/departure cleanup을 이 fan-out 위에 구현하고 08 thread가 reentrancy를 수정합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `46e2b7785bee` | `src/ApplicationSupport.cpp` | `broadcastToChannel` | member fd snapshot 기반 channel fan-out |
| `46e2b7785bee` | `src/ApplicationSupport.cpp` | `broadcastToCommonPeers` | std::set recipient dedup으로 중복 notification 방지 |

- 조사 방법: GitHub에서 `46e2b7785bee`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `a147d6994d58` — `feat(channel): 구성원 정리와 식별자 변경 방송`. 원문 역할은 “Coordinates nickname transitions, PART, QUIT, membership removal, and empty-channel erasure.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.6 `a147d6994d58` — `feat(channel): 구성원 정리와 식별자 변경 방송`

| 항목 | 값 |
| --- | --- |
| Importance | S |
| Tags | CORE, CHANNEL_STATE, LIFECYCLE |
| 원문 확정 역할 | Coordinates nickname transitions, PART, QUIT, membership removal, and empty-channel erasure. |
| 학습 깊이 | 프로젝트 핵심 architecture/invariant입니다. 이전 상태, failure sequence, 핵심 결정, ownership/lifecycle, 남은 한계와 후속 fix/test를 모두 복원합니다. |

#### Source에서 확정된 역할

> Coordinates nickname transitions, PART, QUIT, membership removal, and empty-channel erasure.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 상태 | channel fan-out은 있었지만 NICK/PART/QUIT/transport disconnect가 client index와 모든 membership을 하나의 순서로 정리하지 못했습니다. |
| failure / boundary | 여러 shared channel을 가진 peer는 dedup set 때문에 QUIT/NICK을 한 번만 받으며 transport disconnect도 explicit QUIT과 같은 cleanup primitives를 재사용합니다. |
| 핵심 결정 | 공통 peer를 먼저 계산하고 old identity prefix로 NICK/QUIT/PART를 방송한 뒤, 각 channel membership을 제거하고 empty channel을 erase하며 마지막에 registry nickname/client state를 갱신·삭제하도록 수명 전이를 조율했습니다. |
| 변경 파일·symbol | `src/ApplicationSupport.cpp — partAllChannels, partChannel, removeClientFromChannels, broadcastToCommonPeers`<br>`src/RegistrationCommands.cpp — registered NICK transition`<br>`src/IrcApplication.cpp — QUIT/disconnect cleanup` |
| ownership / lifecycle / state transition | old nick와 membership은 outbound event를 구성할 때까지 유지되고, recipient snapshot 이후 channel graph와 nickname index/client record가 수렴합니다. |
| 이 commit이 보장하는 것 | 퇴장한 fd가 channel/operator set이나 nickname reverse index에 남지 않고 empty channel이 map에 잔존하지 않습니다. |
| 아직 보장하지 않는 것 | broadcast 중 send failure가 map/client를 지운 뒤 borrowed reference를 사용하는 위험은 728aaabc4012 이전에 남습니다. |
| 후속 fix/test 연결 | 22e5f82bc693 등 정상 command가 같은 graph를 확장하고 08 thread의 fix/test가 reentrant cleanup을 강화합니다. |

#### S-level invariant 재구성

| 순서 | 상태 / 판단 |
| --- | --- |
| 1. 이전 전제 | channel fan-out은 있었지만 NICK/PART/QUIT/transport disconnect가 client index와 모든 membership을 하나의 순서로 정리하지 못했습니다. |
| 2. failure conditions / boundary | 여러 shared channel을 가진 peer는 dedup set 때문에 QUIT/NICK을 한 번만 받으며 transport disconnect도 explicit QUIT과 같은 cleanup primitives를 재사용합니다. |
| 3. 선택한 표현과 순서 | 공통 peer를 먼저 계산하고 old identity prefix로 NICK/QUIT/PART를 방송한 뒤, 각 channel membership을 제거하고 empty channel을 erase하며 마지막에 registry nickname/client state를 갱신·삭제하도록 수명 전이를 조율했습니다. |
| 4. authoritative state | old nick와 membership은 outbound event를 구성할 때까지 유지되고, recipient snapshot 이후 channel graph와 nickname index/client record가 수렴합니다. |
| 5. 결과 invariant | 퇴장한 fd가 channel/operator set이나 nickname reverse index에 남지 않고 empty channel이 map에 잔존하지 않습니다. |
| 6. 후속 보강 | 22e5f82bc693 등 정상 command가 같은 graph를 확장하고 08 thread의 fix/test가 reentrant cleanup을 강화합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `a147d6994d58` | `src/ApplicationSupport.cpp` | `partAllChannels / removeClientFromChannels` | channel snapshot → membership 제거 → empty erase 순서 |
| `a147d6994d58` | `src/RegistrationCommands.cpp` | `registered NICK handling` | old prefix fan-out 후 canonical index 갱신 |
| `a147d6994d58` | `src/IrcApplication.cpp` | `QUIT/onDisconnect cleanup` | explicit/transport 종료가 동일 state graph를 정리 |

- 조사 방법: GitHub에서 `a147d6994d58`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `7ac793d3b695` — `feat(message): 채널 대상 메시지 방송`. 원문 역할은 “Routes PRIVMSG through membership-authorized channel fan-out.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.7 `7ac793d3b695` — `feat(message): 채널 대상 메시지 방송`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | IRC_PROTOCOL, CHANNEL_STATE |
| 원문 확정 역할 | Routes PRIVMSG through membership-authorized channel fan-out. |
| 학습 깊이 | Thread 흐름에서 맡는 구체적 구현 역할과 핵심 state/branch만 기록합니다. |

#### Source에서 확정된 역할

> Routes PRIVMSG through membership-authorized channel fan-out.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| Thread 내 구현 역할 | channel target이면 channel 존재와 sender membership을 확인하고, 성공 시 sender를 제외한 member snapshot에 source hostmask의 PRIVMSG를 방송했습니다. |
| 확인한 변경 파일·symbol | `src/MessagingCommands.cpp — handlePrivmsg channel branch` |
| 핵심 state / branch | message text는 channel aggregate를 변경하지 않고 현재 membership snapshot만 읽습니다. |
| failure handling | 없는 channel은 403, 비회원 발신은 404로 끝나며 fan-out side effect가 없습니다. |
| 보장과 다음 연결 | channel 메시지는 authorized member에서 현재 member들로만 전달되고 sender echo는 제외됩니다. de1dd0fc30d0가 실제 slow receiver 아래 unrelated connection progress를 검증합니다. |
| 이 시점의 한계 | slow receiver와 send failure 격리는 output/server layer에 맡기며 이 commit 자체는 fairness를 보장하지 않습니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `7ac793d3b695` | `src/MessagingCommands.cpp` | `IrcApplication::handlePrivmsg` | channel 존재·membership 검사 후 sender 제외 fan-out |

- 조사 방법: GitHub에서 `7ac793d3b695`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `22e5f82bc693` — `feat(channel): JOIN 채널 입장 처리`. 원문 역할은 “Implements the central JOIN transition, invite-only admission, and first-member operator assignment.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.8 `22e5f82bc693` — `feat(channel): JOIN 채널 입장 처리`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | CHANNEL_STATE, IRC_PROTOCOL, RISK |
| 원문 확정 역할 | Implements the central JOIN transition, invite-only admission, and first-member operator assignment. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Implements the central JOIN transition, invite-only admission, and first-member operator assignment.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | 채널 aggregate와 helper는 있었지만 JOIN의 admission·membership·첫 운영자·응답 순서가 한 transition으로 결합되지 않았습니다. |
| 주요 문제와 설계 판단 | JOIN 0은 전체 PART로 처리하고, 쉼표 목록의 각 이름을 검증한 뒤 channel을 확보합니다. invite-only admission을 확인하고 첫 member만 operator로 추가하며 초대를 소비한 뒤 JOIN 방송, TOPIC reply, NAMES reply 순서로 전송했습니다. |
| 변경 파일·symbol | `src/ChannelCommands.cpp — handleJoin`<br>`src/ApplicationSupport.cpp — sendTopicReply, sendNames` |
| state / ownership 변화 | membership mutation은 JOIN fan-out 전에 완료되고 invitation은 성공 입장 시에만 제거됩니다. 첫 member 여부는 mutation 전 `empty()` 결과로 결정됩니다. |
| failure 또는 boundary | invalid name은 403, invite-only 미초대는 473이며 기존 member의 재JOIN은 state를 중복 추가하지 않고 NAMES만 보냅니다. |
| 보장 / 비보장 | 보장: 입장 authorization과 first-member operator invariant, 응답 순서가 하나의 handler에서 고정됩니다.<br>비보장: 각 send 뒤 actor/channel lifetime 재검증은 728aaabc4012 이전에 부족합니다. |
| 다음 관련 변화 | 0e601da7d2bc와 bce6933f69ab가 입장 후 operator가 변경할 channel mode를 구현합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `22e5f82bc693` | `src/ChannelCommands.cpp` | `IrcApplication::handleJoin` | validation → admission → addMember(first) → invite clear → JOIN/TOPIC/NAMES 순서 |

- 조사 방법: GitHub에서 `22e5f82bc693`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `0e601da7d2bc` — `feat(channel): 채널 모드 조회와 i·t 변경`. 원문 역할은 “Exposes and mutates +i and +t under operator authorization.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.9 `0e601da7d2bc` — `feat(channel): 채널 모드 조회와 i·t 변경`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | CHANNEL_STATE, IRC_PROTOCOL |
| 원문 확정 역할 | Exposes and mutates +i and +t under operator authorization. |
| 학습 깊이 | Thread 흐름에서 맡는 구체적 구현 역할과 핵심 state/branch만 기록합니다. |

#### Source에서 확정된 역할

> Exposes and mutates +i and +t under operator authorization.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| Thread 내 구현 역할 | MODE 조회는 324와 current mode string을 보내고, 변경은 membership과 operator를 확인한 뒤 mode 문자열을 순회해 `+i/-i`, `+t/-t`를 aggregate에 반영하고 방송했습니다. |
| 확인한 변경 파일·symbol | `src/ChannelCommands.cpp — handleChannelMode, broadcastMode` |
| 핵심 state / branch | adding/removing cursor가 mode string 전체에 적용되고 각 성공 mutation 직후 현재 channel members에게 mode event를 fan-out합니다. |
| failure handling | 비회원 442, 비운영자 482, 알 수 없는 mode 472로 mutation 없이 거부합니다. |
| 보장과 다음 연결 | invite-only와 topic-protection policy를 channel operator만 변경할 수 있습니다. bce6933f69ab가 argument를 소비하는 `o` mode를 추가하고 d48e1f1f8c04/aee5edebe294가 continuation semantics를 수정·검증합니다. |
| 이 시점의 한계 | compound mode 중 첫 broadcast failure 뒤 다음 mode가 계속 적용되는 문제는 d48e1f1f8c04까지 남습니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `0e601da7d2bc` | `src/ChannelCommands.cpp` | `handleChannelMode +i/+t` | membership/operator 검사, mode cursor, mutation 후 broadcast |

- 조사 방법: GitHub에서 `0e601da7d2bc`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `bce6933f69ab` — `feat(channel): 채널 운영자 모드 변경`. 원문 역할은 “Extends channel authority with +o and -o.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.10 `bce6933f69ab` — `feat(channel): 채널 운영자 모드 변경`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | CHANNEL_STATE, IRC_PROTOCOL |
| 원문 확정 역할 | Extends channel authority with +o and -o. |
| 학습 깊이 | Thread 흐름에서 맡는 구체적 구현 역할과 핵심 state/branch만 기록합니다. |

#### Source에서 확정된 역할

> Extends channel authority with +o and -o.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| Thread 내 구현 역할 | mode cursor와 별도의 parameter cursor를 사용해 `+o/-o` 대상 nick을 소비하고, nickname lookup과 channel membership을 확인한 뒤 `Channel::setOperator()`를 호출해 실제 display nick으로 방송했습니다. |
| 확인한 변경 파일·symbol | `src/ChannelCommands.cpp — handleChannelMode o branch` |
| 핵심 state / branch | operator state는 Channel aggregate만 변경하고 nickname은 ClientRegistry에서 lookup한 현재 display value를 사용합니다. |
| failure handling | 인자 부족은 461, 존재하지 않거나 비회원인 target은 441이며 operator set을 변경하지 않습니다. |
| 보장과 다음 연결 | 운영자 권한 변경도 “operator는 member” invariant와 command parameter ordering을 따릅니다. d48e1f1f8c04와 aee5edebe294가 response failure 후 더 이상의 mode transition을 막습니다. |
| 이 시점의 한계 | send failure 뒤 compound mode continuation과 target lifetime revalidation은 08 thread에서 보강됩니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `bce6933f69ab` | `src/ChannelCommands.cpp` | `handleChannelMode o branch` | argument cursor, nick lookup/member 검사, setOperator와 broadcast |

- 조사 방법: GitHub에서 `bce6933f69ab`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 이 commit은 이 Thread의 마지막 항목입니다. 아래 Invariant ledger와 Thread 최종 상태에서 전체 변화를 연결합니다.

## 6. Invariant ledger

| Invariant | 처음 도입 | 강화/적용 | 학습자 최종 기록 | Fix/Test 연결 |
| --- | --- | --- | --- | --- |
| authoritative Channel aggregate | `786ed5d839d9` | 966f5663dbcc, 0d0d850f007d | member/operator/invitation/topic/mode를 한 객체에서 관리합니다. | command integration은 22e5f82bc693, 0e601da7d2bc, bce6933f69ab |
| operator ⊆ member | `966f5663dbcc` | bce6933f69ab | removeMember가 operator도 제거하고 비회원 승격을 거부합니다. | aee5edebe294가 failure 중 unrelated member/channel 보존을 확인 |
| deduplicated peer fan-out | `46e2b7785bee` | a147d6994d58 | member snapshot과 std::set recipient로 shared peer 중복을 제거합니다. | 6b4a7738a285의 multi-client flow |
| identity/departure graph cleanup | `a147d6994d58` | PART/QUIT/NICK/transport disconnect | old identity로 notification 후 membership/index/client state를 수렴시킵니다. | 728aaabc4012/5edcafda8a4d가 send-failure reentrancy 보강 |
| authorized admission/mode | `22e5f82bc693` | 0e601da7d2bc, bce6933f69ab | invite/member/operator 검사를 mutation 전에 수행합니다. | d48e1f1f8c04/aee5edebe294가 compound failure continuation 고정 |

도입과 완성을 같은 의미로 쓰지 않았습니다. 후속 fix가 이전 SHA의 사실을 바꾸지 않도록 각 시점의 보장과 부족함을 분리했습니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 | 실제 failure / risk | Fix 또는 기반 변화 | 수정된 decision / semantics | Test 연결 |
| --- | --- | --- | --- | --- |
| handler가 여러 container를 직접 수정 | 비회원 operator·stale invite/index | 786ed5d839d9 → 0d0d850f007d | aggregate method 뒤에 state mutation 집중 | 6b4a7738a285 |
| shared channel마다 NICK/QUIT 전송 | 같은 peer 중복 notification | 46e2b7785bee + a147d6994d58 | recipient fd set dedup | 6b4a7738a285 |
| broadcast가 local side effect뿐 | send 중 actor/channel erase 후 dangling reference | 728aaabc4012 | stable value copy와 container relookup | 5edcafda8a4d / aee5edebe294 |

## 8. Ownership / state / responsibility 변화

| 책임 또는 상태 | 이전 상태 | 이후 authoritative 위치 | 관련 commit | 확인 결과 |
| --- | --- | --- | --- | --- |
| channel membership/authority | 분산 container 가능 | `Channel` aggregate | 786ed5d839d9 → 0d0d850f007d | path/symbol은 위 commit 증거표에 연결했습니다. |
| channel object lifetime | 없음 | `IrcApplication::_channels` map | c1762e011fd6 | path/symbol은 위 commit 증거표에 연결했습니다. |
| recipient computation | handler별 반복 | broadcast helper/snapshot/dedup set | 46e2b7785bee | path/symbol은 위 commit 증거표에 연결했습니다. |
| identity/departure cleanup | 명령별 분산 가능 | IrcApplication cleanup helpers | a147d6994d58 | path/symbol은 위 commit 증거표에 연결했습니다. |
| socket lifetime | Channel이 소유하지 않음 | Server/Connection, Channel에는 fd만 저장 | 전체 Thread | path/symbol은 위 commit 증거표에 연결했습니다. |

## 9. Thread 최종 상태

- 시작 직전 상태: application에 채널별 구성원·운영자·초대·주제·모드를 함께 보존하는 authoritative aggregate가 없었습니다.
- 마지막 commit `bce6933f69ab` 시점의 상태: 운영자 권한 변경도 “operator는 member” invariant와 command parameter ordering을 따릅니다.
- Thread 안에서 강화된 핵심 invariant: authoritative Channel aggregate, operator ⊆ member, deduplicated peer fan-out, identity/departure graph cleanup, authorized admission/mode.
- 남은 한계 또는 후속 Thread에서 보강되는 부분: send failure 뒤 compound mode continuation과 target lifetime revalidation은 08 thread에서 보강됩니다. d48e1f1f8c04와 aee5edebe294가 response failure 후 더 이상의 mode transition을 막습니다.
- 최종 설명: `786ed5d839d9`에서 시작한 책임은 commit map 순서대로 상태 owner, failure branch와 cleanup ordering을 추가했고 `bce6933f69ab`에서 이 Thread가 정한 검증 또는 운영 상태에 도달합니다. 이전 시점의 미보장은 후속 fix/test SHA를 별도로 연결했으며 final HEAD 상태를 과거 commit에 소급하지 않았습니다.

## 10. 최종 architecture 또는 execution flow 정리

| 단계 | SHA | Caller / callee / state owner | 정상 transition | failure / cleanup transition |
| --- | --- | --- | --- | --- |
| channel resolve | c1762e011fd6 | `command handler` | ensureChannel/findChannelForCommand | invalid/missing/nonmember는 403/442 |
| authorize | 22e5f82bc693 / 0e601da7d2bc | `JOIN/MODE handler` | invite/member/operator state | 473/482 등에서 mutation 없이 종료 |
| mutate | 966f5663dbcc / 0d0d850f007d | `handler` | Channel aggregate methods | 비회원 operator와 stale operator를 방지 |
| fan-out | 46e2b7785bee | `application helper` | member snapshot/common-peer set | 개별 send failure는 Server cleanup으로 전달 |
| departure cleanup | a147d6994d58 | `PART/QUIT/onDisconnect` | old prefix notification → member 제거 → empty erase → registry cleanup | send reentrancy는 728aaabc4012에서 relookup |

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
