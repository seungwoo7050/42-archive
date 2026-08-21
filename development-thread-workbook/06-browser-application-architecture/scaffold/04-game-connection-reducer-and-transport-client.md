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
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

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
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

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
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

#### A-level 불변식 종합

- [학습자 작성: 이 A-level commit이 교정하거나 이전한 핵심 책임]
- [학습자 작성: 실패 시 영향 범위와 남은 비보장]
- [학습자 작성: later fix/test와 연결되는 불변식]

#### 핵심 코드 근거

| 항목 | 값 |
| --- | --- |
| SHA | `d8311e74373e` |
| 파일 | `apps/web/src/game/gameConnection.ts` |
| 함수/위치 | `gameConnectionReducer` |
| 근거 요약 | [학습자 작성: 이 위치가 상태·소유권·실패 규칙을 어떻게 증명하는지 기록] |

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
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

#### A-level 불변식 종합

- [학습자 작성: 이 A-level commit이 교정하거나 이전한 핵심 책임]
- [학습자 작성: 실패 시 영향 범위와 남은 비보장]
- [학습자 작성: later fix/test와 연결되는 불변식]

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
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

#### A-level 불변식 종합

- [학습자 작성: 이 A-level commit이 교정하거나 이전한 핵심 책임]
- [학습자 작성: 실패 시 영향 범위와 남은 비보장]
- [학습자 작성: later fix/test와 연결되는 불변식]

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
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

#### A-level 불변식 종합

- [학습자 작성: 이 A-level commit이 교정하거나 이전한 핵심 책임]
- [학습자 작성: 실패 시 영향 범위와 남은 비보장]
- [학습자 작성: later fix/test와 연결되는 불변식]

#### Test 복원

| 항목 | 근거 |
| --- | --- |
| 검증 대상 production 불변식 | [학습자 작성: 검증 대상 production 불변식] |
| 재현한 실패/경계 | [학습자 작성: 재현한 실패/경계] |
| 테스트 기법 | [학습자 작성: 테스트 기법] |
| 증명하는 것 | [학습자 작성: 증명하는 것] |
| 증명하지 않는 것 | [학습자 작성: 증명하지 않는 것] |
| 검증 분류 | [학습자 작성: 검증 분류] |

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
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

#### A-level 불변식 종합

- [학습자 작성: 이 A-level commit이 교정하거나 이전한 핵심 책임]
- [학습자 작성: 실패 시 영향 범위와 남은 비보장]
- [학습자 작성: later fix/test와 연결되는 불변식]

#### Fix 복원

| 항목 | 근거 |
| --- | --- |
| 이전 가정 | [학습자 작성: 이전 가정] |
| 실제 실패/위험 | [학습자 작성: 실제 실패/위험] |
| 근본 원인 | [학습자 작성: 근본 원인] |
| 수정된 불변식 | [학습자 작성: 수정된 불변식] |
| 회귀 근거 | [학습자 작성: 회귀 근거] |

#### 핵심 코드 근거

| 항목 | 값 |
| --- | --- |
| SHA | `4f5199097284` |
| 파일 | `apps/web/src/game/GameSocketClient.ts` |
| 함수/위치 | `scheduleReconnect / openSocket` |
| 근거 요약 | [학습자 작성: 이 위치가 상태·소유권·실패 규칙을 어떻게 증명하는지 기록] |

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
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

#### Fix 복원

| 항목 | 근거 |
| --- | --- |
| 이전 가정 | [학습자 작성: 이전 가정] |
| 실제 실패/위험 | [학습자 작성: 실제 실패/위험] |
| 근본 원인 | [학습자 작성: 근본 원인] |
| 수정된 불변식 | [학습자 작성: 수정된 불변식] |
| 회귀 근거 | [학습자 작성: 회귀 근거] |

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
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

#### Test 복원

| 항목 | 근거 |
| --- | --- |
| 검증 대상 production 불변식 | [학습자 작성: 검증 대상 production 불변식] |
| 재현한 실패/경계 | [학습자 작성: 재현한 실패/경계] |
| 테스트 기법 | [학습자 작성: 테스트 기법] |
| 증명하는 것 | [학습자 작성: 증명하는 것] |
| 증명하지 않는 것 | [학습자 작성: 증명하지 않는 것] |
| 검증 분류 | [학습자 작성: 검증 분류] |

#### 비교 기준

- Thread 내 직전 관련 SHA: `85edd6d1e26a` — `fix(web): 현재 경기방의 채팅만 표시`
- 이 SHA가 이 Thread의 마지막 고정 commit입니다.
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

## 6. 불변식 발전 기록

| 단계 | 관련 SHA | 학습 기록 |
| --- | --- | --- |
| 입력 해석 분리 | `1bf328ce92a5` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| state vocabulary 도입·완성 | `ffcbdd403a06` → `d8311e74373e` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| transport lifetime 이전 | `bfded21cd1ac` → `92ad229a23d3` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| deterministic 검증 | `b5691b01a09b` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| bounded reconnect 교정 | `4f5199097284` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| room-scoped chat 교정 | `85edd6d1e26a` → `02775797ab63` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |

## 7. Failure → Fix → Test 관계

| 이전 상태/가정 | 실패 또는 위험 | Fix 연결 | Test/후속 근거 | 관계 해설 |
| --- | --- | --- | --- | --- |
| [학습자 작성: 이전 가정] | [학습자 작성: actual failure/risk] | `bfded21cd1ac` generation owner | `b5691b01a09b` | [학습자 작성: root cause와 corrected invariant를 한 문장으로 연결] |
| [학습자 작성: 이전 가정] | [학습자 작성: actual failure/risk] | `4f5199097284` | `06d2eb7a93cc`, `1abda1299ad8` | [학습자 작성: root cause와 corrected invariant를 한 문장으로 연결] |
| [학습자 작성: 이전 가정] | [학습자 작성: actual failure/risk] | `85edd6d1e26a` | `02775797ab63` | [학습자 작성: root cause와 corrected invariant를 한 문장으로 연결] |

## 8. Ownership·state·lifetime 변화

| 대상 | 이전 owner/state | 이후 owner/state | 수명/cleanup |
| --- | --- | --- | --- |
| keyboard meaning | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| connection state | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| ticket request | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| socket/handlers | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| reconnect timer/deadline | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| chat acceptance | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |

## 9. Thread 최종 상태

[학습자 작성: 마지막 고정 SHA에서 실제로 성립하는 최종 상태]

### 최종 실행 흐름

1. [학습자 작성: 입력 또는 route 진입]
2. [학습자 작성: validation/state transition]
3. [학습자 작성: resource acquisition/cleanup]
4. [학습자 작성: output/presentation]
5. [학습자 작성: failure/non-guarantee]

## 10. 학습 완료 점검

- [ ] 모든 commit을 지정 SHA의 parent/diff와 비교했습니다.
- [ ] 후속 HEAD 코드를 이전 SHA 설명에 역투영하지 않았습니다.
- [ ] owner, lifetime, cleanup, failure branch와 non-guarantee를 기록했습니다.
- [ ] fix는 이전 가정과 root cause에, test는 production path와 증명 범위에 연결했습니다.
- [ ] A/B importance 깊이를 구분했고 source subject/tag/role을 유지했습니다.
- [ ] 실행하지 않은 project test에 pass 결과를 만들지 않았습니다.
