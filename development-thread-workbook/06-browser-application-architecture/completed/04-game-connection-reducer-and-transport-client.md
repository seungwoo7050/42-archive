# Game connection reducer와 transport client

- 카테고리: `06-browser-application-architecture` — 브라우저 애플리케이션 아키텍처
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

play component에 흩어진 socket callback과 mutable state를 pure reducer 및 transport-neutral `GameSocketClient`로 분리하고, ticket 요청부터 socket 교체·재연결·message parsing·room-scoped chat filtering까지의 수명주기를 한 연결 계층이 소유하도록 하는 과정을 복원합니다.

### 직접 연결되는 불변식

- browser connection state transition은 pure reducer가, ticket/socket/timer resource는 `GameSocketClient`가 소유합니다.
- 교체된 ticket response와 stale socket event는 generation/current-socket guard를 통과하지 못합니다.
- snapshot sequence는 단조 증가하며 같은 값이나 더 오래된 snapshot은 current state를 덮지 않습니다.
- reconnect는 existing room continuation이며 최초 queue/tournament command를 다시 보내지 않습니다.
- match chat은 현재 active room과 `scope: "match"`가 모두 일치할 때만 reducer에 전달됩니다.

### 교차 Thread 주의

`4f5199097284`는 cross-cutting commit입니다. 이 문서는 transport/reducer/hook/play-page 변경만 고정합니다. 같은 SHA의 `HomePage`와 `demoPolicy` 변경은 `08-guest-browser-policy-and-transient-results.md`에서 별도로 조사합니다.

## 2. 핵심 질문

- reducer action vocabulary와 transport resource owner가 어떤 파일에서 분리됩니까?
- ticket request가 늦게 resolve되거나 socket이 교체될 때 어떤 generation/identity guard가 stale completion을 버립니까?
- remote close와 explicit close가 reconnect timer, deadline, initial command 면에서 어떻게 다릅니까?
- 현재 room이 없는 terminal state에서만 새 match를 시작하도록 어떤 predicate를 사용합니까?
- 다른 room/lobby chat이 active game message list에 들어오지 않는 filter는 무엇입니까?

## 3. 완료 기준

- Commit map의 모든 SHA를 지정 브랜치 ancestry에서 확인합니다.
- 각 SHA의 parent 또는 직전 관련 SHA와 비교해 변경 전후 상태를 구분합니다.
- 파일, 함수, class, state, caller/callee, failure branch, cleanup을 실제 코드로 기록합니다.
- Fix는 이전 가정과 root cause를, test는 production path와 증명/비증명 범위를 연결합니다.
- 마지막 SHA까지만 사용해 Thread 최종 owner, invariant, execution flow를 작성합니다.
- 중요도는 A-level의 위험·소유권·회귀 근거를 B-level보다 깊게 기록합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Thread 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `1bf328ce92a5` | `refactor(web): game input 직렬화 경계 분리` | B | WEB | keyboard state를 protocol command 방향으로 바꾸는 pure helper를 분리합니다. |
| 2 | `ffcbdd403a06` | `refactor(web): game connection 상태 reducer 분리` | B | REALTIME, WEB | browser game connection state/action vocabulary를 정의합니다. |
| 3 | `d8311e74373e` | `refactor(web): game connection 전이 규칙 완성` | A | REALTIME, WEB, OPERATIONS | open/matched/snapshot/reconnecting/finished/failed transition을 reducer에 완성합니다. |
| 4 | `bfded21cd1ac` | `refactor(web): GameSocketClient 연결 수명주기 분리` | A | AUTH, REALTIME, WEB | ticket request, socket replacement, close/teardown을 transport-neutral client가 소유합니다. |
| 5 | `92ad229a23d3` | `refactor(web): GameSocketClient 메시지 처리를 분리` | A | AUTH, PROTOCOL, SIMULATION | message parse/dispatch까지 client로 이동해 ticket-to-socket lifecycle을 통합합니다. |
| 6 | `b5691b01a09b` | `test(web): game connection lifecycle 검증` | A | AUTH, PROTOCOL, REALTIME | connection replacement, teardown, stale event, command lifecycle을 deterministic test로 고정합니다. |
| 7 | `4f5199097284` | `fix(web): 중단된 game reconnect 복구` | A | AUTH, REALTIME, WEB | fresh ticket으로 existing room을 복구하고 original matchmaking intent를 재전송하지 않습니다. |
| 8 | `85edd6d1e26a` | `fix(web): 현재 경기방의 채팅만 표시` | B | REALTIME, WEB | inbound match chat을 current active room predicate로 filtering합니다. |
| 9 | `02775797ab63` | `test(web): 매치 채팅 room filtering 검증` | B | REALTIME, WEB, TEST | match chat room filter의 positive/negative boundary를 검증합니다. |

## 5. Commit별 학습 기록

### 5.1. `refactor(web): game input 직렬화 경계 분리`

| 항목 | 값 |
| --- | --- |
| SHA | `1bf328ce92a5` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | keyboard state를 protocol command 방향으로 바꾸는 pure helper를 분리합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/game/gameInput.ts`의 `directionForKey`와 `isEditableTarget`을 확인합니다.
- Arrow/W/S 외 key와 input/textarea/select/contenteditable target이 어떤 값을 반환하는지 확인합니다.
- 아직 play page가 helper를 호출하지 않는지 parent/diff에서 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | play page의 keyboard 해석이 DOM event handler 내부에 직접 섞여 있었습니다. |
| 해결하려던 문제 | 입력 의미를 socket lifecycle과 분리해 단위 검증하고 migration에서 재사용할 필요가 있었습니다. |
| 핵심 결정 | key→`-1\|0\|1\|null` mapping과 editable target 판정을 side effect 없는 helper로 추출했습니다. |
| 입력 → 상태 전이 → 출력 | DOM key/target → pure helper → 이후 caller가 command 전송 여부를 결정합니다. |
| ownership/lifetime/cleanup | helper는 입력 해석만 소유하고 key listener와 socket 전송 수명은 아직 page가 소유합니다. |
| failure/rollback/retry | 지원하지 않는 key는 command를 만들지 않고 editable target은 game control 대상에서 제외할 수 있습니다. |
| 보장하는 것 | 입력 의미를 protocol transport와 독립적으로 재사용·test할 수 있습니다. |
| 보장하지 않는 것 | 실제 listener cleanup, neutral input 전송, mobile pointer는 아직 보장하지 않습니다. |
| 후속 연결 | `1ae6fa7836d8`에서 keyboard/touch caller가 이 helper를 사용하고 `b5691b01a09b`가 mapping을 test합니다. |

#### 비교 기준

- 이 commit의 parent를 `git show 1bf328ce92a5^` 및 `git diff 1bf328ce92a5^ 1bf328ce92a5`로 비교합니다.
- Thread 내 다음 관련 SHA: `ffcbdd403a06` — `refactor(web): game connection 상태 reducer 분리`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.2. `refactor(web): game connection 상태 reducer 분리`

| 항목 | 값 |
| --- | --- |
| SHA | `ffcbdd403a06` |
| Importance | B |
| Tags | REALTIME, WEB |
| Source에서 확정된 역할 | browser game connection state/action vocabulary를 정의합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/game/gameConnection.ts`의 `GameConnectionState`, status union, action union, initial state를 확인합니다.
- 이 SHA의 reducer가 아직 state를 그대로 반환하는 skeleton인지 확인합니다.
- page local fields와 새 state shape의 중복을 비교합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | room, snapshot, notice, opponent, messages, status가 play page의 여러 `useState`에 분산돼 있었습니다. |
| 해결하려던 문제 | connection lifecycle을 하나의 명시적 state/action vocabulary로 표현할 기반이 필요했습니다. |
| 핵심 결정 | state shape와 action union, initial state, reducer boundary를 만들었지만 transition body는 아직 완성하지 않았습니다. |
| 입력 → 상태 전이 → 출력 | 향후 transport callback이 action을 만들고 reducer가 새 state를 반환하도록 호출 경계를 정의했습니다. |
| ownership/lifetime/cleanup | reducer가 connection state의 예정 owner가 되지만 이 SHA에서는 실제 page가 여전히 owner입니다. |
| failure/rollback/retry | action type은 제한하지만 no-op reducer 때문에 lifecycle behavior는 아직 바뀌지 않습니다. |
| 보장하는 것 | 후속 transition 구현에 필요한 상태·사건 어휘를 고정합니다. |
| 보장하지 않는 것 | open/matched/snapshot/close/failure의 실제 전이는 보장하지 않습니다. |
| 후속 연결 | `d8311e74373e`가 reducer transition을 완성합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `1bf328ce92a5` — `refactor(web): game input 직렬화 경계 분리`
- Thread 내 다음 관련 SHA: `d8311e74373e` — `refactor(web): game connection 전이 규칙 완성`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.3. `refactor(web): game connection 전이 규칙 완성`

| 항목 | 값 |
| --- | --- |
| SHA | `d8311e74373e` |
| Importance | A |
| Tags | REALTIME, WEB, OPERATIONS |
| Source에서 확정된 역할 | open/matched/snapshot/reconnecting/finished/failed transition을 reducer에 완성합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `gameConnectionReducer`의 각 action branch와 state reset/preserve field를 표로 추적합니다.
- `snapshotReceived`가 `sequence <= lastSnapshotSequence`를 거부하는 조건을 확인합니다.
- `socketClosed`가 `roomId` 유무에 따라 `reconnecting`/`failed`를 선택하는지 확인합니다.
- `gameFinished`가 room, direction-sensitive state, notice를 어떻게 정리하는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | action vocabulary는 있었지만 reducer가 no-op라 transport event를 일관된 state transition으로 바꾸지 못했습니다. |
| 해결하려던 문제 | 비동기 callback 순서가 달라도 stale snapshot, reconnect, finish가 명시적 불변식에 따라 처리돼야 했습니다. |
| 핵심 결정 | 각 action의 immutable transition을 구현하고 last snapshot sequence gate, bounded message list, room-aware close, terminal reset을 추가했습니다. |
| 입력 → 상태 전이 → 출력 | transport event → action → reducer branch → 새 `GameConnectionState` → React render 순서입니다. |
| ownership/lifetime/cleanup | reducer가 synchronous state transition을 소유합니다. socket/ticket/timer resource는 소유하지 않습니다. |
| failure/rollback/retry | stale/equal snapshot은 state를 그대로 반환하고, room이 있는 close는 reconnecting, 없는 close는 failed로 갑니다. |
| 보장하는 것 | connection 상태가 단일 transition table을 따르고 snapshot이 뒤로 가지 않습니다. |
| 보장하지 않는 것 | 비동기 resource가 stale action을 dispatch하지 않는지는 reducer만으로 보장하지 않습니다. |
| 후속 연결 | `bfded21cd1ac`과 `92ad229a23d3`가 transport lifetime/generation을 분리하고 `b5691b01a09b`가 transition을 검증합니다. |

#### A-level 불변식 종합

- **핵심 책임:** open/matched/snapshot/reconnecting/finished/failed transition을 reducer에 완성합니다.
- **실패 영향:** 비동기 callback 순서가 달라도 stale snapshot, reconnect, finish가 명시적 불변식에 따라 처리돼야 했습니다.
- **결과 불변식:** connection 상태가 단일 transition table을 따르고 snapshot이 뒤로 가지 않습니다.
- **남은 제한:** 비동기 resource가 stale action을 dispatch하지 않는지는 reducer만으로 보장하지 않습니다.

#### 핵심 코드 근거

| 항목 | 값 |
| --- | --- |
| SHA | `d8311e74373e` |
| 파일 | `apps/web/src/game/gameConnection.ts` |
| 함수/위치 | `gameConnectionReducer` |
| 근거 요약 | `snapshot.sequence <= state.lastSnapshotSequence`이면 기존 state를 반환하고, close 시 `roomId`가 있으면 `reconnecting`, 없으면 `failed`로 전이합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `ffcbdd403a06` — `refactor(web): game connection 상태 reducer 분리`
- Thread 내 다음 관련 SHA: `bfded21cd1ac` — `refactor(web): GameSocketClient 연결 수명주기 분리`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.4. `refactor(web): GameSocketClient 연결 수명주기 분리`

| 항목 | 값 |
| --- | --- |
| SHA | `bfded21cd1ac` |
| Importance | A |
| Tags | AUTH, REALTIME, WEB |
| Source에서 확정된 역할 | ticket request, socket replacement, close/teardown을 transport-neutral client가 소유합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/game/GameSocketClient.ts`의 `socket`, `ticketRequest`, `generation`, `inputSequence` field를 확인합니다.
- `connect`, `replaceConnection`, `close`, `isCurrent`가 AbortController와 handler 해제를 어떤 순서로 수행하는지 확인합니다.
- ticket resolve 뒤 generation이 바뀐 경우 socket을 만들지 않는 guard를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | play page가 AbortController, WebSocket ref, event handler, input sequence를 직접 소유해 connection 교체와 unmount cleanup이 UI 코드에 섞였습니다. |
| 해결하려던 문제 | ticket request와 socket이 서로 다른 시점에 완료되므로 이전 연결의 completion을 확실히 폐기할 단일 resource owner가 필요했습니다. |
| 핵심 결정 | `GameSocketClient`가 current socket, ticket request, monotonically changing generation, input sequence를 소유하고 replacement 시 모두 정리하도록 했습니다. |
| 입력 → 상태 전이 → 출력 | `connect` → generation 증가/기존 resource 정리 → ticket request → current generation 확인 → socket 생성/handler 설치 순서입니다. |
| ownership/lifetime/cleanup | client instance가 ticket AbortController와 socket handler/lifetime을 소유합니다. React state는 callback 밖 reducer가 소유합니다. |
| failure/rollback/retry | explicit replacement는 pending ticket을 abort하고 old handlers를 null로 만든 뒤 OPEN/CONNECTING socket을 닫습니다. stale completion은 generation check에서 무시됩니다. |
| 보장하는 것 | 동시에 하나의 current ticket/socket만 connection state를 변경할 수 있습니다. |
| 보장하지 않는 것 | message runtime parsing과 full reconnect policy는 아직 완성되지 않았습니다. |
| 후속 연결 | `92ad229a23d3`이 parsing/dispatch를 client에 넣고 `b5691b01a09b`가 aborted ticket 경계를 검증합니다. |

#### A-level 불변식 종합

- **핵심 책임:** ticket request, socket replacement, close/teardown을 transport-neutral client가 소유합니다.
- **실패 영향:** ticket request와 socket이 서로 다른 시점에 완료되므로 이전 연결의 completion을 확실히 폐기할 단일 resource owner가 필요했습니다.
- **결과 불변식:** 동시에 하나의 current ticket/socket만 connection state를 변경할 수 있습니다.
- **남은 제한:** message runtime parsing과 full reconnect policy는 아직 완성되지 않았습니다.

#### 비교 기준

- Thread 내 직전 관련 SHA: `d8311e74373e` — `refactor(web): game connection 전이 규칙 완성`
- Thread 내 다음 관련 SHA: `92ad229a23d3` — `refactor(web): GameSocketClient 메시지 처리를 분리`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.5. `refactor(web): GameSocketClient 메시지 처리를 분리`

| 항목 | 값 |
| --- | --- |
| SHA | `92ad229a23d3` |
| Importance | A |
| Tags | AUTH, PROTOCOL, SIMULATION |
| Source에서 확정된 역할 | message parse/dispatch까지 client로 이동해 ticket-to-socket lifecycle을 통합합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `GameSocketClient`가 ticket response로 URL을 만들고 `parseServerEvent`를 호출하는 위치를 확인합니다.
- parse failure가 `onFailure`로 전달되는지, stale socket의 message가 `isCurrent`에서 버려지는지 확인합니다.
- `send`/`sendDirection`의 readyState, room ID, `inputSeq` 증가 조건을 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | resource lifetime은 client로 옮겼지만 message parsing과 protocol dispatch 일부가 caller에 남아 transport abstraction이 완결되지 않았습니다. |
| 해결하려던 문제 | 모든 inbound event가 current socket과 shared runtime parser를 통과하고 outbound input sequence도 client가 소유해야 했습니다. |
| 핵심 결정 | ticket URL, socket factory, shared parser, callback dispatch, ready-state guarded send, monotonic input sequence를 client 안에 넣었습니다. |
| 입력 → 상태 전이 → 출력 | ticket resolve → socket open → optional initial command; message → current guard → parser → `onEvent`; direction → seq 증가 → serialized send 순서입니다. |
| ownership/lifetime/cleanup | client가 raw transport bytes와 input sequence를 소유하고 reducer/hook은 parsed domain event만 받습니다. |
| failure/rollback/retry | malformed event는 failure callback으로 가고 closed/non-open socket의 send는 false를 반환합니다. |
| 보장하는 것 | raw WebSocket payload가 parser 없이 UI state로 들어오지 않고 input command sequence가 connection 내에서 단조 증가합니다. |
| 보장하지 않는 것 | remote close 후 자동 retry와 room continuation은 아직 보장하지 않습니다. |
| 후속 연결 | `b5691b01a09b`가 parser failure와 input sequence를 test하고 `4f5199097284`가 reconnect policy를 추가합니다. |

#### A-level 불변식 종합

- **핵심 책임:** message parse/dispatch까지 client로 이동해 ticket-to-socket lifecycle을 통합합니다.
- **실패 영향:** 모든 inbound event가 current socket과 shared runtime parser를 통과하고 outbound input sequence도 client가 소유해야 했습니다.
- **결과 불변식:** raw WebSocket payload가 parser 없이 UI state로 들어오지 않고 input command sequence가 connection 내에서 단조 증가합니다.
- **남은 제한:** remote close 후 자동 retry와 room continuation은 아직 보장하지 않습니다.

#### 비교 기준

- Thread 내 직전 관련 SHA: `bfded21cd1ac` — `refactor(web): GameSocketClient 연결 수명주기 분리`
- Thread 내 다음 관련 SHA: `b5691b01a09b` — `test(web): game connection lifecycle 검증`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.6. `test(web): game connection lifecycle 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `b5691b01a09b` |
| Importance | A |
| Tags | AUTH, PROTOCOL, REALTIME |
| Source에서 확정된 역할 | connection replacement, teardown, stale event, command lifecycle을 deterministic test로 고정합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `GameSocketClient.test.ts`의 deferred ticket, fake socket, parser failure, sent frame assertions를 확인합니다.
- `gameConnection.test.ts`의 lifecycle transition과 stale snapshot case를 확인합니다.
- `gameInput.test.ts`의 key/editable mapping 범위를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | reducer와 client 분리는 완료됐지만 asynchronous race와 stale event 방지가 실제로 동작한다는 자동 증거가 없었습니다. |
| 해결하려던 문제 | pending ticket 취소, replacement, malformed message, input sequence, reducer ordering을 deterministic하게 재현해야 했습니다. |
| 핵심 결정 | deferred Promise와 fake socket으로 첫 ticket을 취소한 뒤 두 번째 연결만 생성하고, raw messages와 sent frames를 직접 관찰했습니다. |
| 입력 → 상태 전이 → 출력 | test가 fake clock/socket/ticket provider를 제어 → production client/reducer 실행 → callback/state/frame assertion 순서입니다. |
| ownership/lifetime/cleanup | test fixture가 transport doubles를 소유하고 production client cleanup을 직접 호출합니다. |
| failure/rollback/retry | 취소된 첫 ticket은 socket을 만들지 않고 malformed event는 failure로 가며 direction마다 seq가 증가합니다. |
| 보장하는 것 | generation fencing, parser boundary, reducer stale-snapshot invariant를 deterministic하게 증명합니다. |
| 보장하지 않는 것 | 실제 browser/network reconnect, server room reservation, latency 조건은 증명하지 않습니다. |
| 후속 연결 | `4f5199097284`의 reconnect 추가 뒤 `06d2eb7a93cc`가 fresh-ticket continuation을 추가 검증합니다. |

#### A-level 불변식 종합

- **핵심 책임:** connection replacement, teardown, stale event, command lifecycle을 deterministic test로 고정합니다.
- **실패 영향:** pending ticket 취소, replacement, malformed message, input sequence, reducer ordering을 deterministic하게 재현해야 했습니다.
- **결과 불변식:** generation fencing, parser boundary, reducer stale-snapshot invariant를 deterministic하게 증명합니다.
- **남은 제한:** 실제 browser/network reconnect, server room reservation, latency 조건은 증명하지 않습니다.

#### Test 복원

| 항목 | 근거 |
| --- | --- |
| 검증 대상 production 불변식 | 현재 generation/socket만 event를 전달하고 reducer는 stale state를 거부합니다. |
| 재현한 실패/경계 | 취소된 ticket resolve, malformed event, socket replacement, duplicate/stale snapshot, input sequence입니다. |
| 테스트 기법 | deferred Promise, fake WebSocket, reducer table, pure input helper test입니다. |
| 증명하는 것 | race와 protocol boundary를 browser 없이 deterministic하게 증명합니다. |
| 증명하지 않는 것 | 실제 network reconnect와 server-side room recovery는 증명하지 않습니다. |
| 검증 분류 | deterministic lifecycle·boundary regression |

> 실행 상태: 이 workbook 작성 환경에서는 repository test command를 실행하지 않았습니다. 위 내용은 해당 SHA의 test source와 production path를 정적 조사해 복원한 것이며 pass 결과를 주장하지 않습니다.

#### 비교 기준

- Thread 내 직전 관련 SHA: `92ad229a23d3` — `refactor(web): GameSocketClient 메시지 처리를 분리`
- Thread 내 다음 관련 SHA: `4f5199097284` — `fix(web): 중단된 game reconnect 복구`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.7. `fix(web): 중단된 game reconnect 복구`

| 항목 | 값 |
| --- | --- |
| SHA | `4f5199097284` |
| Importance | A |
| Tags | AUTH, REALTIME, WEB |
| Source에서 확정된 역할 | fresh ticket으로 existing room을 복구하고 original matchmaking intent를 재전송하지 않습니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 Thread에서는 `GameSocketClient.ts`, `gameConnection.ts`, `useGameConnection.ts`, `play/page.tsx`만 조사합니다. 같은 SHA의 `HomePage`/`demoPolicy` 변경은 guest Thread에서 다룹니다.
- `RECONNECT_WINDOW_MS`, initial/max delay, deadline, attempts, timer cleanup을 확인합니다.
- `openSocket(..., initialEvent: null, reconnected: true)`가 새 ticket을 사용하되 최초 queue command를 보내지 않는지 확인합니다.
- `canStartNewMatch`가 `roomId === null`과 terminal status를 동시에 요구하는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | remote close는 reducer를 reconnecting으로 표시할 수 있었지만 client는 재연결하지 않았고, 단순 `connect` 재사용 시 원래 queue/tournament command를 다시 보내 두 번째 match intent를 만들 위험이 있었습니다. |
| 해결하려던 문제 | existing room recovery는 새 admission ticket과 bounded retry를 사용하되 original matchmaking command를 반복하지 않아야 했습니다. |
| 핵심 결정 | 15초 window, 250ms exponential delay(2초 상한), fresh ticket socket, `initialEvent=null`, room-aware `onClosed`, `canStartNewMatch` guard를 추가했습니다. |
| 입력 → 상태 전이 → 출력 | remote close → reducer `socketClosed` → room이 있으면 retry 승인 → timer → fresh ticket → 새 socket open → no initial command → server snapshot으로 room 복구 순서입니다. |
| ownership/lifetime/cleanup | `GameSocketClient`가 retry timer/deadline/attempt를 소유하고 hook의 stateRef가 현재 room을 판단합니다. explicit `close`는 timer와 request/socket을 모두 해제합니다. |
| failure/rollback/retry | ticket failure도 window 안에서는 retry하고 deadline을 넘으면 failure action을 만듭니다. duplicate start button과 hook connect는 predicate에서 거부됩니다. |
| 보장하는 것 | 끊긴 socket이 existing room을 bounded하게 이어가며 재연결 때문에 두 번째 matchmaking intent를 만들지 않습니다. |
| 보장하지 않는 것 | server가 room reservation을 실제 유지하는지, 15초 이후 복구되는지는 browser client만으로 보장하지 않습니다. |
| 후속 연결 | `06d2eb7a93cc`가 fresh ticket/no original command를 fake timer로 검증하고 `1abda1299ad8`이 browser E2E reconnect를 검증합니다. |

#### A-level 불변식 종합

- **핵심 책임:** fresh ticket으로 existing room을 복구하고 original matchmaking intent를 재전송하지 않습니다.
- **실패 영향:** existing room recovery는 새 admission ticket과 bounded retry를 사용하되 original matchmaking command를 반복하지 않아야 했습니다.
- **결과 불변식:** 끊긴 socket이 existing room을 bounded하게 이어가며 재연결 때문에 두 번째 matchmaking intent를 만들지 않습니다.
- **남은 제한:** server가 room reservation을 실제 유지하는지, 15초 이후 복구되는지는 browser client만으로 보장하지 않습니다.

#### Fix 복원

| 항목 | 근거 |
| --- | --- |
| 이전 가정 | close 상태 표시만으로 reconnect가 충분하거나 최초 `connect`를 재사용해도 된다고 봤습니다. |
| 실제 실패/위험 | 연결이 복구되지 않거나 queue command가 반복되어 existing room과 새 match intent가 충돌합니다. |
| 근본 원인 | initial admission과 room continuation을 같은 command-bearing open path로 취급했습니다. |
| 수정된 불변식 | reconnect는 fresh ticket을 사용하지만 initial matchmaking command는 `null`이며 current room이 있는 동안 새 match를 시작하지 않습니다. |
| 회귀 근거 | `06d2eb7a93cc` unit tests와 `1abda1299ad8` Playwright reconnect scenario입니다. |

#### 핵심 코드 근거

| 항목 | 값 |
| --- | --- |
| SHA | `4f5199097284` |
| 파일 | `apps/web/src/game/GameSocketClient.ts` |
| 함수/위치 | `scheduleReconnect / openSocket` |
| 근거 요약 | 재연결은 `openSocket(generation, null, handlers, true)`를 호출해 새 ticket을 얻되 최초 queue command를 다시 보내지 않습니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `b5691b01a09b` — `test(web): game connection lifecycle 검증`
- Thread 내 다음 관련 SHA: `85edd6d1e26a` — `fix(web): 현재 경기방의 채팅만 표시`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.8. `fix(web): 현재 경기방의 채팅만 표시`

| 항목 | 값 |
| --- | --- |
| SHA | `85edd6d1e26a` |
| Importance | B |
| Tags | REALTIME, WEB |
| Source에서 확정된 역할 | inbound match chat을 current active room predicate로 filtering합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/game/chatScope.ts`의 `isChatForActiveRoom` 조건을 확인합니다.
- `useGameConnection` event handler가 reducer dispatch 전에 predicate를 호출하는지 확인합니다.
- active room 없음, lobby scope, 다른 room ID가 모두 false인지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | parsed `chat.message`면 scope/room 관계와 무관하게 current game message list로 전달될 수 있었습니다. |
| 해결하려던 문제 | 다른 match 또는 lobby chat이 active game UI에 나타나지 않아야 했습니다. |
| 핵심 결정 | `scope === "match"`, active room 존재, `message.roomId === activeRoomId`를 모두 요구하는 pure predicate를 추가했습니다. |
| 입력 → 상태 전이 → 출력 | server event → current room read → predicate → true일 때만 reducer chat action 순서입니다. |
| ownership/lifetime/cleanup | hook이 active room context를, pure helper가 acceptance rule을 소유합니다. |
| failure/rollback/retry | 조건이 하나라도 맞지 않으면 event를 조용히 무시합니다. |
| 보장하는 것 | 현재 방의 match chat만 game message state에 들어갑니다. |
| 보장하지 않는 것 | server-side chat authorization이나 persistence는 보장하지 않습니다. |
| 후속 연결 | `02775797ab63`이 모든 negative 조합을 unit test로 고정합니다. |

#### Fix 복원

| 항목 | 근거 |
| --- | --- |
| 이전 가정 | parsed chat event는 현재 화면에 표시해도 된다고 가정했습니다. |
| 실제 실패/위험 | 다른 room이나 lobby message가 active match UI에 섞입니다. |
| 근본 원인 | protocol validity와 UI room membership을 같은 것으로 취급했습니다. |
| 수정된 불변식 | runtime-valid event라도 current room/scope predicate를 통과해야 표시합니다. |
| 회귀 근거 | `02775797ab63`의 exact/other/lobby/no-room table입니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `4f5199097284` — `fix(web): 중단된 game reconnect 복구`
- Thread 내 다음 관련 SHA: `02775797ab63` — `test(web): 매치 채팅 room filtering 검증`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.9. `test(web): 매치 채팅 room filtering 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `02775797ab63` |
| Importance | B |
| Tags | REALTIME, WEB, TEST |
| Source에서 확정된 역할 | match chat room filter의 positive/negative boundary를 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/game/chatScope.test.ts`의 exact active-room, other-room, lobby, null-room case를 확인합니다.
- test가 `isChatForActiveRoom` pure production function을 직접 호출하는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | room filter fix는 작지만 다른 scope/room 조합에서 다시 완화될 위험이 있었습니다. |
| 해결하려던 문제 | accepted case 하나와 거부해야 할 모든 주요 case를 고정할 필요가 있었습니다. |
| 핵심 결정 | pure predicate를 table-like assertions로 직접 호출했습니다. |
| 입력 → 상태 전이 → 출력 | event fixture + active room → predicate result assertion 순서입니다. |
| ownership/lifetime/cleanup | test에는 resource cleanup이 없고 production hook dispatch는 실행하지 않습니다. |
| failure/rollback/retry | predicate는 active room이 없거나 scope/room ID가 다르면 false를 반환하며 retry나 fallback은 없습니다. |
| 보장하는 것 | exact active room만 true이며 다른 room/lobby/no active room은 false입니다. |
| 보장하지 않는 것 | browser rendering, server authorization, chat order는 증명하지 않습니다. |
| 후속 연결 | current room filtering fix의 deterministic regression evidence입니다. |

#### Test 복원

| 항목 | 근거 |
| --- | --- |
| 검증 대상 production 불변식 | 현재 active room의 match-scope chat만 game reducer로 전달할 수 있습니다. |
| 재현한 실패/경계 | 다른 room, lobby scope, room 없는 상태입니다. |
| 테스트 기법 | pure predicate direct unit test입니다. |
| 증명하는 것 | acceptance rule의 complete branch 조합을 증명합니다. |
| 증명하지 않는 것 | hook integration과 server-side audience authorization은 증명하지 않습니다. |
| 검증 분류 | scope/identity boundary unit regression |

> 실행 상태: 이 workbook 작성 환경에서는 repository test command를 실행하지 않았습니다. 위 내용은 해당 SHA의 test source와 production path를 정적 조사해 복원한 것이며 pass 결과를 주장하지 않습니다.

#### 비교 기준

- Thread 내 직전 관련 SHA: `85edd6d1e26a` — `fix(web): 현재 경기방의 채팅만 표시`
- 이 SHA가 이 Thread의 마지막 고정 commit입니다.
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

## 6. 불변식 발전 기록

| 단계 | 관련 SHA | 학습 기록 |
| --- | --- | --- |
| 입력 해석 분리 | `1bf328ce92a5` | keyboard 의미를 pure helper로 분리했습니다. |
| state vocabulary 도입·완성 | `ffcbdd403a06` → `d8311e74373e` | reducer가 lifecycle와 snapshot ordering을 소유합니다. |
| transport lifetime 이전 | `bfded21cd1ac` → `92ad229a23d3` | ticket, socket, parser, sequence를 `GameSocketClient`가 소유합니다. |
| deterministic 검증 | `b5691b01a09b` | replacement/stale/parse/input sequence를 test로 고정했습니다. |
| bounded reconnect 교정 | `4f5199097284` | fresh ticket, no duplicate initial intent, deadline/backoff가 추가됐습니다. |
| room-scoped chat 교정 | `85edd6d1e26a` → `02775797ab63` | current room predicate와 unit regression이 추가됐습니다. |

## 7. Failure → Fix → Test 관계

| 이전 상태/가정 | 실패 또는 위험 | Fix 연결 | Test/후속 근거 | 관계 해설 |
| --- | --- | --- | --- | --- |
| page-local async refs | stale ticket/socket가 state 변경 가능 | `bfded21cd1ac` generation owner | `b5691b01a09b` | page-local async refs → stale ticket/socket가 state 변경 가능 → `bfded21cd1ac` generation owner → `b5691b01a09b` |
| remote close 후 상태만 reconnecting | 실제 연결 복구 없음/intent 중복 가능 | `4f5199097284` | `06d2eb7a93cc`, `1abda1299ad8` | remote close 후 상태만 reconnecting → 실제 연결 복구 없음/intent 중복 가능 → `4f5199097284` → `06d2eb7a93cc`, `1abda1299ad8` |
| parsed chat이면 표시 | 다른 room/lobby message 혼입 | `85edd6d1e26a` | `02775797ab63` | parsed chat이면 표시 → 다른 room/lobby message 혼입 → `85edd6d1e26a` → `02775797ab63` |

## 8. Ownership·state·lifetime 변화

| 대상 | 이전 owner/state | 이후 owner/state | 수명/cleanup |
| --- | --- | --- | --- |
| keyboard meaning | page event handler | `gameInput.ts` pure helper | event 처리 순간 |
| connection state | 여러 page `useState` | `gameConnectionReducer` | hook/reducer 수명 |
| ticket request | page ref | `GameSocketClient.ticketRequest` | connect attempt 수명 |
| socket/handlers | page ref/callback | `GameSocketClient.socket` + generation | current connection 수명 |
| reconnect timer/deadline | 없음 | `GameSocketClient` | 15초 recovery window |
| chat acceptance | 모든 parsed event | hook + `isChatForActiveRoom` | active room 수명 |

## 9. Thread 최종 상태

마지막 SHA에서 reducer는 browser-visible game connection state를, `GameSocketClient`는 ticket/socket/reconnect timer/input sequence를 소유합니다. stale generation과 stale snapshot은 폐기되고 reconnect는 fresh ticket으로 existing room을 이어가며 initial matchmaking command를 반복하지 않습니다. game chat은 현재 room과 scope가 일치할 때만 state로 들어갑니다.

### 최종 실행 흐름

1. hook이 `GameSocketClient.connect(initialEvent, handlers)`를 호출합니다.
2. client가 이전 request/socket/timer를 정리하고 generation을 증가시킨 뒤 ticket을 요청합니다.
3. current generation이면 socket을 열고 최초 연결에서만 initial command를 전송합니다.
4. raw message는 shared parser를 통과한 뒤 hook callback이 reducer action으로 변환합니다.
5. reducer는 stale snapshot을 거부하고 room-aware lifecycle state를 반환합니다.
6. remote close에서 room이 남아 있으면 bounded timer가 fresh ticket socket을 열되 initial command는 보내지 않습니다.
7. chat event는 current room predicate를 통과한 경우에만 message action으로 dispatch됩니다.

## 10. 학습 완료 점검

- [x] 모든 commit을 지정 SHA의 parent/diff와 비교했습니다.
- [x] 후속 HEAD 코드를 이전 SHA 설명에 역투영하지 않았습니다.
- [x] owner, lifetime, cleanup, failure branch와 non-guarantee를 기록했습니다.
- [x] fix는 이전 가정과 root cause에, test는 production path와 증명 범위에 연결했습니다.
- [x] A/B importance 깊이를 구분했고 source subject/tag/role을 유지했습니다.
- [x] 실행하지 않은 project test에 pass 결과를 만들지 않았습니다.
