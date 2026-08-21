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
| 직전 관련 상태 | reducer와 transport client는 분리됐지만 React component가 둘을 조합할 stable lifecycle boundary가 없었습니다. |
| 해결하려던 문제 | client instance를 rerender마다 재생성하지 않고 callback을 reducer action에 연결하며 unmount에서 close해야 했습니다. |
| 핵심 결정 | `useGameConnection`이 reducer와 memoized client를 만들고 parsed event를 action으로 dispatch하며 cleanup에서 client를 닫도록 했습니다. |
| 입력 → 상태 전이 → 출력 | React caller → hook connect → client callback → event mapping → reducer dispatch → state 반환 순서입니다. |
| ownership/lifetime/cleanup | hook instance가 client lifetime과 reducer를 조합하고 client는 transport resource, reducer는 state를 계속 소유합니다. |
| failure/rollback/retry | unmount cleanup은 client close를 호출하고 unknown failure는 user-facing notice로 축약합니다. |
| 보장하는 것 | React tree 안에서 connection state와 transport를 하나의 reusable hook으로 결합합니다. |
| 보장하지 않는 것 | ready/chat/pause/input command surface와 play page adoption은 아직 보장하지 않습니다. |
| 후속 연결 | `748079c73eea`가 command surface를 추가하고 `c33412d639c5`부터 page migration을 시작합니다. |

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
| 직전 관련 상태 | hook은 connection state를 제공했지만 active match command는 여전히 play page의 socket ref를 통해 전송됐습니다. |
| 해결하려던 문제 | state owner와 command owner가 같아야 room/status guard가 한 곳에서 일관되게 적용됩니다. |
| 핵심 결정 | hook에 command callbacks를 추가하고 current reducer state에 따라 valid command만 client로 보냈습니다. |
| 입력 → 상태 전이 → 출력 | page intent → hook callback → room/status validation → client send/sequence → failure notice 순서입니다. |
| ownership/lifetime/cleanup | hook이 command policy를, client가 serialization/transport를 소유합니다. |
| failure/rollback/retry | room/status/body 조건이 맞지 않으면 전송하지 않고 closed socket이면 visible failure state로 연결할 수 있습니다. |
| 보장하는 것 | caller가 raw socket 없이 active game command를 수행할 수 있습니다. |
| 보장하지 않는 것 | page가 실제로 hook command만 사용하는지는 아직 보장하지 않습니다. |
| 후속 연결 | `9a67234633b4`가 rendered state/command caller를 hook으로 옮깁니다. |

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
| 직전 관련 상태 | 새 hook은 독립적으로 존재했지만 실제 play page는 inline implementation만 사용했습니다. |
| 해결하려던 문제 | 큰 일괄 rewrite 대신 replacement를 먼저 page에 주입해 단계적으로 caller를 옮길 필요가 있었습니다. |
| 핵심 결정 | hook과 input helper를 page에 생성하되 기존 path를 제거하지 않는 migration seam을 만들었습니다. |
| 입력 → 상태 전이 → 출력 | render 시 hook instance가 만들어지지만 기존 event/command는 아직 legacy state/socket을 사용합니다. |
| ownership/lifetime/cleanup | 일시적으로 hook과 legacy page가 각각 state/client를 가질 수 있으므로 아직 단일 owner가 아닙니다. |
| failure/rollback/retry | 새 hook이 실제 connect를 호출하지 않는 한 두 socket이 동시에 열리지는 않지만 duplicate implementation은 남습니다. |
| 보장하는 것 | 후속 commit이 작은 단위로 caller를 이동할 준비를 합니다. |
| 보장하지 않는 것 | 이 SHA 자체는 ownership 이전을 완료하지 않습니다. |
| 후속 연결 | `898d0884ee37`이 첫 실제 caller인 URL-driven auto entry를 hook으로 전환합니다. |

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
| 직전 관련 상태 | page에 hook이 있었지만 URL query로 자동 진입하는 effect는 legacy connection function을 호출했습니다. |
| 해결하려던 문제 | 동일 route intent가 새 connection owner를 사용해야 후속 state/command migration이 가능했습니다. |
| 핵심 결정 | auto-start effect의 queue/AI/tournament branch를 hook callback으로 교체하고 한 번만 실행하는 ref를 유지했습니다. |
| 입력 → 상태 전이 → 출력 | search params → mode/tournament 판정 → auto-start guard → hook connect callback 순서입니다. |
| ownership/lifetime/cleanup | page가 URL intent와 one-shot guard를, hook이 connection start를 소유합니다. |
| failure/rollback/retry | effect dependency가 바뀌어도 `autoStartedRef`가 같은 mount에서 중복 시작을 막습니다. |
| 보장하는 것 | URL-driven connection은 새 client/reducer path로 들어갑니다. |
| 보장하지 않는 것 | manual buttons와 rendered state/commands는 아직 legacy일 수 있습니다. |
| 후속 연결 | `9a67234633b4`가 화면 state와 command를 hook으로 연결합니다. |

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
| 직전 관련 상태 | auto entry만 새 path를 사용하고 UI는 legacy state/socket을 읽어 두 owner가 서로 다른 내용을 렌더링할 수 있었습니다. |
| 해결하려던 문제 | 화면이 새 reducer state를 source로 사용하고 주요 command도 같은 hook을 거쳐야 했습니다. |
| 핵심 결정 | render derivation과 ready/chat/pause/resume caller를 hook state/command로 교체했습니다. |
| 입력 → 상태 전이 → 출력 | hook reducer state → score/phase/canX/opponent/messages derivation → UI; user action → hook command 순서입니다. |
| ownership/lifetime/cleanup | hook이 rendered connection state와 command policy의 실질적 owner가 되고 page에는 presentation state가 남습니다. |
| failure/rollback/retry | legacy definitions은 dead/unused 상태로 남아 bundle/typecheck에 존재하며 입력 loop도 아직 별도입니다. |
| 보장하는 것 | visible game state와 주요 command가 동일 hook owner를 사용합니다. |
| 보장하지 않는 것 | keyboard/touch와 legacy resource code 제거는 아직 완료되지 않았습니다. |
| 후속 연결 | `1ae6fa7836d8`이 입력을 새 path에 연결하고 이후 네 제거 commit이 dead owner를 삭제합니다. |

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
| 직전 관련 상태 | 기존 keyboard loop는 현재 방향을 50ms마다 반복 전송했고 mobile touch control과 focus/visibility neutralization이 부족했습니다. |
| 해결하려던 문제 | 사용자 intent 변화만 전송하되 key release, focus loss, hidden tab, pointer 종료에서 paddle가 계속 움직이지 않아야 했습니다. |
| 핵심 결정 | previous direction을 ref로 기억하고 변화가 있을 때만 command를 보내며 keyboard/touch/blur/visibility cleanup을 모두 neutral `0`에 연결했습니다. |
| 입력 → 상태 전이 → 출력 | DOM/pointer event → pure key/target helper → `changeDirection` dedupe → hook `setDirection` → client sequence send 순서입니다. |
| ownership/lifetime/cleanup | page가 DOM listener와 current physical input ref를 소유하고 hook/client가 protocol command를 소유합니다. |
| failure/rollback/retry | playing이 아니거나 editable target이면 movement를 시작하지 않고 release/blur/hidden/pointer end는 `0`을 보냅니다. effect cleanup도 listener를 제거하고 neutralize합니다. |
| 보장하는 것 | keyboard와 touch 입력이 변화 기반으로 전송되고 browser lifecycle 종료점에서 neutral 상태로 돌아갑니다. |
| 보장하지 않는 것 | server가 direction을 수락했는지나 packet loss 보상은 보장하지 않습니다. |
| 후속 연결 | `31b5122add6f`가 기존 50ms page loop를 제거합니다. |

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
| 직전 관련 상태 | 새 transition-based input이 동작하지만 old 50ms polling loop도 남아 duplicate command를 보낼 수 있었습니다. |
| 해결하려던 문제 | 한 physical input에 두 protocol writers가 존재하지 않아야 했습니다. |
| 핵심 결정 | legacy direction state와 timer effect를 삭제하고 새 `changeDirection` path만 유지했습니다. |
| 입력 → 상태 전이 → 출력 | keyboard/touch event → hook command의 한 경로만 남습니다. |
| ownership/lifetime/cleanup | page는 DOM listener만 소유하고 periodic command timer ownership은 제거됩니다. |
| failure/rollback/retry | cleanup 대상 interval 자체가 사라져 duplicate send와 timer leak 가능성을 없앱니다. |
| 보장하는 것 | paddle input command writer가 하나로 줄어듭니다. |
| 보장하지 않는 것 | legacy socket lifecycle과 다른 command/state는 아직 파일에 남습니다. |
| 후속 연결 | `fa35e8d15b4e`가 다음 중복 owner인 inline WebSocket lifecycle을 제거합니다. |

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
| 직전 관련 상태 | hook/client가 실제 connection을 소유하는데 page의 old socket factory와 event handlers가 dead code로 남아 있었습니다. |
| 해결하려던 문제 | 동일한 lifecycle 구현이 두 곳에 남으면 후속 변경이 한쪽에만 적용되고 실수로 재사용될 수 있었습니다. |
| 핵심 결정 | legacy connection functions와 raw event parsing path를 삭제했습니다. |
| 입력 → 상태 전이 → 출력 | 모든 connection intent가 hook → client path로만 흐릅니다. |
| ownership/lifetime/cleanup | `GameSocketClient`가 유일한 ticket/socket owner가 되고 page의 resource acquisition 책임이 사라집니다. |
| failure/rollback/retry | page는 더 이상 old handler cleanup을 수행하지 않습니다. hook cleanup이 client close를 담당합니다. |
| 보장하는 것 | raw WebSocket lifecycle implementation이 한 곳으로 통합됩니다. |
| 보장하지 않는 것 | page-local command wrappers와 duplicate state fields는 아직 남을 수 있습니다. |
| 후속 연결 | `365d66c72343`과 `06664abbae7f`가 남은 command/state를 제거합니다. |

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
| 직전 관련 상태 | UI는 hook command를 사용하지만 같은 이름/역할의 page-local socket command 함수가 dead code로 남아 있었습니다. |
| 해결하려던 문제 | protocol command policy는 hook 한 곳만 소유해야 했습니다. |
| 핵심 결정 | legacy command와 socket close wrapper를 삭제하고 UI→hook caller만 남겼습니다. |
| 입력 → 상태 전이 → 출력 | button/form intent → hook command → client send의 단일 경로입니다. |
| ownership/lifetime/cleanup | hook이 command policy와 client close를 소유하고 page는 form input/DOM event만 소유합니다. |
| failure/rollback/retry | old cleanup effect가 사라져도 hook unmount cleanup이 client를 닫습니다. |
| 보장하는 것 | ready/chat/pause/resume의 duplicate implementation을 제거합니다. |
| 보장하지 않는 것 | duplicate state/ref/import는 다음 commit 전까지 남을 수 있습니다. |
| 후속 연결 | `06664abbae7f`가 사용되지 않는 socket/game fields를 제거합니다. |

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
| 직전 관련 상태 | legacy lifecycle/command는 삭제됐지만 관련 imports, refs, state fields가 남아 ownership을 혼동시켰습니다. |
| 해결하려던 문제 | migration의 실제 완료 조건은 old owner의 data structure까지 사라지는 것이었습니다. |
| 핵심 결정 | raw transport imports와 duplicate state/ref를 삭제했습니다. |
| 입력 → 상태 전이 → 출력 | page render는 hook state를 읽고 local state는 chat input/touch 등 presentation intent로 제한됩니다. |
| ownership/lifetime/cleanup | socket/ticket/snapshot lifecycle owner가 page에서 완전히 사라집니다. |
| failure/rollback/retry | 삭제된 resource에 대한 cleanup도 더 이상 page에 존재하지 않으며 hook/client만 담당합니다. |
| 보장하는 것 | duplicate game connection state가 제거됩니다. |
| 보장하지 않는 것 | hook output alias와 migration scaffolding 일부는 아직 남습니다. |
| 후속 연결 | `9faada0df1d7`이 최종 API surface와 markup을 정리합니다. |

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
| 직전 관련 상태 | legacy resource는 제거됐지만 adapter aliases와 migration-oriented indirection이 남아 최종 owner가 코드 표면에서 명확하지 않았습니다. |
| 해결하려던 문제 | page가 hook contract를 직접 소비하고 남은 책임을 presentation/user intent로 제한해야 했습니다. |
| 핵심 결정 | hook state/commands를 직접 destructure하고 route auto-start, render derivation, controls를 그 surface에 맞춰 정리했습니다. |
| 입력 → 상태 전이 → 출력 | URL/user event → hook command → client/reducer → hook state → page render의 한 방향 흐름으로 완성됩니다. |
| ownership/lifetime/cleanup | hook이 connection lifecycle/state/commands를 단독 소유하고 page는 search params, controlled chat input, DOM input listeners, presentation을 소유합니다. |
| failure/rollback/retry | unmount는 hook cleanup을 통해 client를 닫고 effect guards가 같은 mount의 duplicate auto-start를 막습니다. |
| 보장하는 것 | play page에 raw transport/protocol state owner가 남지 않고 replacement-first migration이 종료됩니다. |
| 보장하지 않는 것 | server recovery, browser cache, canvas interpolation correctness는 이 Thread 단독으로 보장하지 않습니다. |
| 후속 연결 | transport Thread의 tests와 rendering Thread의 snapshot/input invariants가 최종 hook surface를 보완합니다. |

#### A-level 불변식 종합

- **핵심 책임:** page가 hook의 단일 state/command surface만 소비하도록 migration을 끝냅니다.
- **실패 영향:** page가 hook contract를 직접 소비하고 남은 책임을 presentation/user intent로 제한해야 했습니다.
- **결과 불변식:** play page에 raw transport/protocol state owner가 남지 않고 replacement-first migration이 종료됩니다.
- **남은 제한:** server recovery, browser cache, canvas interpolation correctness는 이 Thread 단독으로 보장하지 않습니다.

#### 핵심 코드 근거

| 항목 | 값 |
| --- | --- |
| SHA | `9faada0df1d7` |
| 파일 | `apps/web/src/app/play/page.tsx` |
| 함수/위치 | `PlayPage hook consumption` |
| 근거 요약 | 최종 page는 `useGameConnection()`의 state와 command를 직접 소비하며 socket, ticket, raw parser, input sequence를 선언하지 않습니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `06664abbae7f` — `refactor(play): legacy socket 상태 제거`
- 이 SHA가 이 Thread의 마지막 고정 commit입니다.
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

## 6. 불변식 발전 기록

| 단계 | 관련 SHA | 학습 기록 |
| --- | --- | --- |
| React 조합 경계 | `9d70eb12e1d7` → `748079c73eea` | hook이 client/reducer와 active command를 조합했습니다. |
| replacement 주입 | `c33412d639c5` | legacy를 유지한 채 새 hook이 page에 들어왔습니다. |
| caller 이전 | `898d0884ee37` → `9a67234633b4` → `1ae6fa7836d8` | auto entry, rendered state/commands, keyboard/touch 순서로 새 owner에 연결됐습니다. |
| legacy owner 제거 | `31b5122add6f` → `06664abbae7f` | timer, WebSocket, command, state/ref를 단계적으로 삭제했습니다. |
| migration 완료 | `9faada0df1d7` | page는 hook의 단일 contract만 소비합니다. |

## 7. Failure → Fix → Test 관계

| 이전 상태/가정 | 실패 또는 위험 | Fix 연결 | Test/후속 근거 | 관계 해설 |
| --- | --- | --- | --- | --- |
| new hook과 legacy page가 공존 | duplicate socket/command 위험 | replacement caller를 먼저 옮긴 뒤 각 legacy layer 삭제 | transport unit tests가 replacement behavior를 보호 | new hook과 legacy page가 공존 → duplicate socket/command 위험 → replacement caller를 먼저 옮긴 뒤 각 legacy layer 삭제 → transport unit tests가 replacement behavior를 보호 |
| 50ms polling input과 transition input 공존 | duplicate direction frame | `31b5122add6f` | input helper/client tests | 50ms polling input과 transition input 공존 → duplicate direction frame → `31b5122add6f` → input helper/client tests |
| raw socket fields가 page에 잔존 | ownership 혼동과 stale maintenance | `fa35e8d15b4e` → `06664abbae7f` | `9faada0df1d7` 최종 structural completion | raw socket fields가 page에 잔존 → ownership 혼동과 stale maintenance → `fa35e8d15b4e` → `06664abbae7f` → `9faada0df1d7` 최종 structural completion |

## 8. Ownership·state·lifetime 변화

| 대상 | 이전 owner/state | 이후 owner/state | 수명/cleanup |
| --- | --- | --- | --- |
| connection composition | play page | `useGameConnection` | hook instance 수명 |
| raw transport | play page refs/functions | `GameSocketClient` | current connection 수명 |
| connection state | page `useState` | hook reducer | hook 수명 |
| game commands | page-local functions | hook callbacks | current room/status 수명 |
| physical input listeners | legacy keyboard/timer | page DOM listener + hook command | page mount 수명 |
| neutral input cleanup | 부분적 keyup | keyup/blur/hidden/pointer end/effect cleanup | browser focus/pointer lifecycle |

## 9. Thread 최종 상태

마지막 SHA에서 `PlayPage`는 raw socket, ticket, parser, snapshot sequence, input sequence, connection status를 선언하지 않습니다. URL과 사용자 intent를 hook command에 전달하고 hook state를 렌더링하며, DOM keyboard/touch listener는 방향 변화와 neutralization만 소유합니다. transport와 reducer는 별도 Thread의 전용 owner로 남습니다.

### 최종 실행 흐름

1. page가 route query를 해석해 queue/AI/tournament intent를 hook connect callback에 전달합니다.
2. hook이 `GameSocketClient` callback을 reducer action으로 바꾸고 state를 반환합니다.
3. page는 hook state에서 room, phase, score, opponent, messages, command availability를 파생합니다.
4. button/form intent는 hook의 ready/chat/pause/resume command를 호출합니다.
5. keyboard/touch event는 pure helper와 direction dedupe를 거쳐 hook input command로 전달됩니다.
6. keyup, blur, hidden, pointer 종료, effect cleanup은 neutral `0`을 전송합니다.
7. unmount 시 hook cleanup이 client의 request/socket/timer를 정리합니다.

## 10. 학습 완료 점검

- [x] 모든 commit을 지정 SHA의 parent/diff와 비교했습니다.
- [x] 후속 HEAD 코드를 이전 SHA 설명에 역투영하지 않았습니다.
- [x] owner, lifetime, cleanup, failure branch와 non-guarantee를 기록했습니다.
- [x] fix는 이전 가정과 root cause에, test는 production path와 증명 범위에 연결했습니다.
- [x] A/B importance 깊이를 구분했고 source subject/tag/role을 유지했습니다.
- [x] 실행하지 않은 project test에 pass 결과를 만들지 않았습니다.
