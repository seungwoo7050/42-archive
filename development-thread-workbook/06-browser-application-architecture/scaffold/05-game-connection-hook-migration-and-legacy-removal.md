# Game connection hook 전환과 legacy 제거

- 카테고리: `06-browser-application-architecture` — 브라우저 애플리케이션 아키텍처
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

reducer와 transport client를 `useGameConnection`으로 조합하고 play page의 inline socket, timer input, command, duplicate state를 replacement-first 순서로 제거해 page가 presentation과 user intent만 소유하도록 하는 migration을 복원합니다.

### 직접 연결되는 불변식

- play page는 raw WebSocket, ticket request, protocol parsing, connection state를 직접 소유하지 않습니다.
- 모든 rendered game state와 ready/chat/pause/input command는 하나의 hook surface를 통해 오갑니다.
- legacy path는 replacement가 caller에 연결된 뒤에만 제거되며 migration 종료 시 duplicate owner가 남지 않습니다.
- keyboard/touch 입력은 방향 변화만 전송하고 key release, blur, hidden, pointer 종료에서 neutral `0`으로 복귀합니다.

## 2. 핵심 질문

- hook이 client callback을 reducer action으로 바꾸는 exact mapping은 무엇입니까?
- migration 중 legacy/new path가 동시에 connection 또는 command를 만들지 않는 근거는 무엇입니까?
- 각 제거 commit 전에 replacement path가 이미 어떤 caller를 제공합니까?
- keyboard/touch listener와 neutralization cleanup은 어떤 browser event에서 실행됩니까?
- 마지막 SHA에서 play page에 남는 local state와 책임은 무엇입니까?

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
| 1 | `9d70eb12e1d7` | `refactor(web): game connection hook 상태 연결` | B | AUTH, REALTIME, TOURNAMENT | client와 reducer를 React hook 뒤에서 조합합니다. |
| 2 | `748079c73eea` | `refactor(web): game connection hook 명령 연결` | B | PROTOCOL, SIMULATION, REALTIME | ready/input/chat/pause/resume command surface를 hook에 추가합니다. |
| 3 | `c33412d639c5` | `refactor(play): connection hook 전환 경계 준비` | B | PERSISTENCE, WEB | legacy path를 유지한 채 hook을 play page boundary에 도입합니다. |
| 4 | `898d0884ee37` | `refactor(play): 자동 경기 진입을 connection hook으로 전환` | B | REALTIME, TOURNAMENT, WEB | URL-driven queue/AI/tournament intent를 hook으로 전환합니다. |
| 5 | `9a67234633b4` | `refactor(play): 경기 상태와 명령을 connection hook에 연결` | B | REALTIME, PERSISTENCE, WEB | render state와 ready/chat/pause command를 hook output으로 전환합니다. |
| 6 | `1ae6fa7836d8` | `feat(play): keyboard와 touch paddle 입력 연결` | B | PROTOCOL, SIMULATION, REALTIME | keyboard와 mobile pointer control을 transition-based paddle command에 연결합니다. |
| 7 | `31b5122add6f` | `refactor(play): legacy paddle input loop 제거` | B | SIMULATION, REALTIME, WEB | component-local keyboard state와 50ms command loop를 제거합니다. |
| 8 | `fa35e8d15b4e` | `refactor(play): legacy WebSocket lifecycle 제거` | B | AUTH, PROTOCOL, REALTIME | inline socket create/listener/close path를 제거합니다. |
| 9 | `365d66c72343` | `refactor(play): legacy 경기 명령 제거` | B | PROTOCOL, REALTIME, WEB | page-local ready/chat/pause/resume/close command path를 제거합니다. |
| 10 | `06664abbae7f` | `refactor(play): legacy socket 상태 제거` | B | AUTH, PROTOCOL, REALTIME | duplicate socket/game-state field와 old API import를 제거합니다. |
| 11 | `9faada0df1d7` | `refactor(play): connection hook 전환 마무리` | A | PROTOCOL, REALTIME, TOURNAMENT | page가 hook의 단일 state/command surface만 소비하도록 migration을 끝냅니다. |

## 5. Commit별 학습 기록

### 5.1. `refactor(web): game connection hook 상태 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `9d70eb12e1d7` |
| Importance | B |
| Tags | AUTH, REALTIME, TOURNAMENT |
| Source에서 확정된 역할 | client와 reducer를 React hook 뒤에서 조합합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/game/useGameConnection.ts`의 `useReducer`, memoized `GameSocketClient`, cleanup effect를 확인합니다.
- server event별 reducer action mapping과 failure message 변환을 확인합니다.
- 이 SHA에서 hook이 제공하는 connection initiator와 아직 제공하지 않는 command를 구분합니다.

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

- 이 commit의 parent를 `git show 9d70eb12e1d7^` 및 `git diff 9d70eb12e1d7^ 9d70eb12e1d7`로 비교합니다.
- Thread 내 다음 관련 SHA: `748079c73eea` — `refactor(web): game connection hook 명령 연결`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.2. `refactor(web): game connection hook 명령 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `748079c73eea` |
| Importance | B |
| Tags | PROTOCOL, SIMULATION, REALTIME |
| Source에서 확정된 역할 | ready/input/chat/pause/resume command surface를 hook에 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `useGameConnection`의 `ready`, `sendChat`, `pause`, `resume`, `setDirection` callback을 확인합니다.
- 각 command가 current `roomId`, status, trimmed body 조건을 확인한 뒤 client `send`를 호출하는지 확인합니다.
- send failure 시 reducer notice를 바꾸는지 확인합니다.

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

- Thread 내 직전 관련 SHA: `9d70eb12e1d7` — `refactor(web): game connection hook 상태 연결`
- Thread 내 다음 관련 SHA: `c33412d639c5` — `refactor(play): connection hook 전환 경계 준비`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.3. `refactor(play): connection hook 전환 경계 준비`

| 항목 | 값 |
| --- | --- |
| SHA | `c33412d639c5` |
| Importance | B |
| Tags | PERSISTENCE, WEB |
| Source에서 확정된 역할 | legacy path를 유지한 채 hook을 play page boundary에 도입합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/play/page.tsx`에 `useGameConnection`, `directionForKey`, `isEditableTarget` import와 hook call이 추가되는지 확인합니다.
- legacy socket refs/state/functions가 그대로 남아 있는지 확인합니다.
- 새 hook output이 아직 render/command caller에 사용되지 않는 범위를 기록합니다.

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

- Thread 내 직전 관련 SHA: `748079c73eea` — `refactor(web): game connection hook 명령 연결`
- Thread 내 다음 관련 SHA: `898d0884ee37` — `refactor(play): 자동 경기 진입을 connection hook으로 전환`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.4. `refactor(play): 자동 경기 진입을 connection hook으로 전환`

| 항목 | 값 |
| --- | --- |
| SHA | `898d0884ee37` |
| Importance | B |
| Tags | REALTIME, TOURNAMENT, WEB |
| Source에서 확정된 역할 | URL-driven queue/AI/tournament intent를 hook으로 전환합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `play/page.tsx`의 search params 처리와 `autoStartedRef`를 확인합니다.
- queue, AI, tournament mode가 각각 hook의 어떤 connect callback을 호출하는지 확인합니다.
- legacy auto-connect function이 더 이상 effect caller에서 사용되지 않는지 확인합니다.

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

- Thread 내 직전 관련 SHA: `c33412d639c5` — `refactor(play): connection hook 전환 경계 준비`
- Thread 내 다음 관련 SHA: `9a67234633b4` — `refactor(play): 경기 상태와 명령을 connection hook에 연결`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.5. `refactor(play): 경기 상태와 명령을 connection hook에 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `9a67234633b4` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE, WEB |
| Source에서 확정된 역할 | render state와 ready/chat/pause command를 hook output으로 전환합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `play/page.tsx`가 score, phase, room, status, messages, opponent를 hook state에서 읽는지 확인합니다.
- ready/chat/pause/resume handler가 hook command를 호출하는지 확인합니다.
- legacy functions/refs가 아직 파일에 남지만 caller가 사라진 범위를 확인합니다.

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

- Thread 내 직전 관련 SHA: `898d0884ee37` — `refactor(play): 자동 경기 진입을 connection hook으로 전환`
- Thread 내 다음 관련 SHA: `1ae6fa7836d8` — `feat(play): keyboard와 touch paddle 입력 연결`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.6. `feat(play): keyboard와 touch paddle 입력 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `1ae6fa7836d8` |
| Importance | B |
| Tags | PROTOCOL, SIMULATION, REALTIME |
| Source에서 확정된 역할 | keyboard와 mobile pointer control을 transition-based paddle command에 연결합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `play/page.tsx`의 `changeDirection` callback과 previous direction ref를 확인합니다.
- keydown/keyup, `blur`, `visibilitychange`, editable target, touch pointer down/up/cancel/leave listener를 확인합니다.
- direction이 실제로 바뀔 때만 hook `setDirection`을 호출하고 종료 event에서 `0`을 보내는지 확인합니다.

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

- Thread 내 직전 관련 SHA: `9a67234633b4` — `refactor(play): 경기 상태와 명령을 connection hook에 연결`
- Thread 내 다음 관련 SHA: `31b5122add6f` — `refactor(play): legacy paddle input loop 제거`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.7. `refactor(play): legacy paddle input loop 제거`

| 항목 | 값 |
| --- | --- |
| SHA | `31b5122add6f` |
| Importance | B |
| Tags | SIMULATION, REALTIME, WEB |
| Source에서 확정된 역할 | component-local keyboard state와 50ms command loop를 제거합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `play/page.tsx`에서 old direction ref, key listener, `setInterval(50)` 전송 effect가 삭제되는지 확인합니다.
- `1ae6fa7836d8`의 replacement listener가 그대로 남아 input caller를 제공하는지 확인합니다.

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

- Thread 내 직전 관련 SHA: `1ae6fa7836d8` — `feat(play): keyboard와 touch paddle 입력 연결`
- Thread 내 다음 관련 SHA: `fa35e8d15b4e` — `refactor(play): legacy WebSocket lifecycle 제거`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.8. `refactor(play): legacy WebSocket lifecycle 제거`

| 항목 | 값 |
| --- | --- |
| SHA | `fa35e8d15b4e` |
| Importance | B |
| Tags | AUTH, PROTOCOL, REALTIME |
| Source에서 확정된 역할 | inline socket create/listener/close path를 제거합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `play/page.tsx`에서 ticket request, `new WebSocket`, onopen/onmessage/onerror/onclose 설정 함수가 삭제되는지 확인합니다.
- URL auto-start와 manual start가 모두 hook connect를 사용해 replacement가 완성됐는지 확인합니다.

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

- Thread 내 직전 관련 SHA: `31b5122add6f` — `refactor(play): legacy paddle input loop 제거`
- Thread 내 다음 관련 SHA: `365d66c72343` — `refactor(play): legacy 경기 명령 제거`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.9. `refactor(play): legacy 경기 명령 제거`

| 항목 | 값 |
| --- | --- |
| SHA | `365d66c72343` |
| Importance | B |
| Tags | PROTOCOL, REALTIME, WEB |
| Source에서 확정된 역할 | page-local ready/chat/pause/resume/close command path를 제거합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `play/page.tsx`의 old `ready`, chat submit, toggle pause, close function과 cleanup effect 삭제를 확인합니다.
- UI handler가 hook command를 직접 호출하는 replacement를 유지하는지 확인합니다.

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

- Thread 내 직전 관련 SHA: `fa35e8d15b4e` — `refactor(play): legacy WebSocket lifecycle 제거`
- Thread 내 다음 관련 SHA: `06664abbae7f` — `refactor(play): legacy socket 상태 제거`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.10. `refactor(play): legacy socket 상태 제거`

| 항목 | 값 |
| --- | --- |
| SHA | `06664abbae7f` |
| Importance | B |
| Tags | AUTH, PROTOCOL, REALTIME |
| Source에서 확정된 역할 | duplicate socket/game-state field와 old API import를 제거합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `play/page.tsx`에서 raw parser, `requestWsTicket`, WS URL, snapshot/room/status/messages state와 socket/ticket/sequence refs 삭제를 확인합니다.
- 렌더링에 필요한 값이 hook state 또는 presentation-only state에서만 오는지 확인합니다.

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

- Thread 내 직전 관련 SHA: `365d66c72343` — `refactor(play): legacy 경기 명령 제거`
- Thread 내 다음 관련 SHA: `9faada0df1d7` — `refactor(play): connection hook 전환 마무리`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.11. `refactor(play): connection hook 전환 마무리`

| 항목 | 값 |
| --- | --- |
| SHA | `9faada0df1d7` |
| Importance | A |
| Tags | PROTOCOL, REALTIME, TOURNAMENT |
| Source에서 확정된 역할 | page가 hook의 단일 state/command surface만 소비하도록 migration을 끝냅니다. |

#### 해당 SHA에서 확인할 실제 코드

- `play/page.tsx`의 hook destructuring과 queue/AI/tournament auto-start caller를 확인합니다.
- 남은 alias/ref가 제거되고 aria-live notice, button guards, presentation local state만 남는지 확인합니다.
- `useGameConnection` cleanup과 page effects가 duplicate connection을 만들지 않는 dependency를 확인합니다.

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
| SHA | `9faada0df1d7` |
| 파일 | `apps/web/src/app/play/page.tsx` |
| 함수/위치 | `PlayPage hook consumption` |
| 근거 요약 | [학습자 작성: 이 위치가 상태·소유권·실패 규칙을 어떻게 증명하는지 기록] |

#### 비교 기준

- Thread 내 직전 관련 SHA: `06664abbae7f` — `refactor(play): legacy socket 상태 제거`
- 이 SHA가 이 Thread의 마지막 고정 commit입니다.
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

## 6. 불변식 발전 기록

| 단계 | 관련 SHA | 학습 기록 |
| --- | --- | --- |
| React 조합 경계 | `9d70eb12e1d7` → `748079c73eea` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| replacement 주입 | `c33412d639c5` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| caller 이전 | `898d0884ee37` → `9a67234633b4` → `1ae6fa7836d8` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| legacy owner 제거 | `31b5122add6f` → `06664abbae7f` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| migration 완료 | `9faada0df1d7` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |

## 7. Failure → Fix → Test 관계

| 이전 상태/가정 | 실패 또는 위험 | Fix 연결 | Test/후속 근거 | 관계 해설 |
| --- | --- | --- | --- | --- |
| [학습자 작성: 이전 가정] | [학습자 작성: actual failure/risk] | replacement caller를 먼저 옮긴 뒤 각 legacy layer 삭제 | transport unit tests가 replacement behavior를 보호 | [학습자 작성: root cause와 corrected invariant를 한 문장으로 연결] |
| [학습자 작성: 이전 가정] | [학습자 작성: actual failure/risk] | `31b5122add6f` | input helper/client tests | [학습자 작성: root cause와 corrected invariant를 한 문장으로 연결] |
| [학습자 작성: 이전 가정] | [학습자 작성: actual failure/risk] | `fa35e8d15b4e` → `06664abbae7f` | `9faada0df1d7` 최종 structural completion | [학습자 작성: root cause와 corrected invariant를 한 문장으로 연결] |

## 8. Ownership·state·lifetime 변화

| 대상 | 이전 owner/state | 이후 owner/state | 수명/cleanup |
| --- | --- | --- | --- |
| connection composition | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| raw transport | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| connection state | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| game commands | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| physical input listeners | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| neutral input cleanup | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |

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
