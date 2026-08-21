# Authoritative snapshot rendering과 입력

- 카테고리: `06-browser-application-architecture` — 브라우저 애플리케이션 아키텍처
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

sample canvas와 browser key event에서 출발해 server snapshot이 score/player/phase의 유일한 source가 되고, room-scoped monotonic input command와 bounded interpolation으로 화면을 projection하는 구조로 발전하는 과정을 복원합니다.

### 직접 연결되는 불변식

- browser는 score, phase, winner, room state를 계산하지 않고 accepted server snapshot을 렌더링합니다.
- snapshot이 없을 때 실제 경기처럼 보이는 sample score/opponent를 만들지 않습니다.
- input은 room identity, protocol version, monotonic `inputSeq`, direction intent만 전달합니다.
- 같거나 더 오래된 snapshot은 거부되고 interpolation은 accepted snapshot state 복사본만 사용합니다.
- input loop와 render animation은 room/phase 변경 및 unmount에서 정리됩니다.

## 2. 핵심 질문

- 초기 canvas sample과 play route sample state가 어떤 false presentation을 만들었습니까?
- 첫 WebSocket 구현은 credential, parsing, stale snapshot, cleanup을 어떻게 처리했습니까?
- 50ms input sampling과 80ms interpolation의 owner·buffer·cleanup은 무엇입니까?
- versioned protocol 전환에서 `v`, `roomId`, `inputSeq`, snapshot `sequence`가 어떤 gate를 만듭니까?
- `PongCanvas`가 nested `snapshot.state`를 복제·보간하되 game rule을 계산하지 않는 근거는 무엇입니까?

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
| 1 | `3449f7988e1b` | `feat(web): 퐁 캔버스 미리보기 구현` | B | SIMULATION, REALTIME, WEB | shared dimensions와 `GameSnapshot`으로 field/paddle/ball/score를 그립니다. |
| 2 | `91962d36bd59` | `feat(play): 경기장 화면 구성` | B | PROTOCOL, REALTIME, WEB | Pong canvas 중심의 초기 play route를 추가합니다. |
| 3 | `737aa99cb4cb` | `feat(play): WebSocket 경기 연결 구현` | B | AUTH, PROTOCOL, SIMULATION | play screen을 realtime protocol client로 전환합니다. |
| 4 | `977ca863050f` | `feat(play): keyboard paddle 입력 연결` | B | PROTOCOL, SIMULATION, REALTIME | Arrow/W/S input을 room-scoped game command로 mapping합니다. |
| 5 | `afbd8847b1dd` | `feat(play): 경기 채팅 입력 연결` | B | REALTIME, WEB | 현재 room과 inline WebSocket에 match-chat form을 연결합니다. |
| 6 | `3cd56054bdab` | `fix(play): 패들 조작과 Canvas rendering 개선` | B | SIMULATION, REALTIME, WEB | persistent direction을 50ms마다 sampling하고 snapshot을 80ms 보간합니다. |
| 7 | `6a7aa285fe68` | `fix(play): 실제 경기 상태에 맞게 세션 표시` | A | SIMULATION, REALTIME, WEB | score/opponent/ready/chat/input/terminal cleanup을 latest server snapshot에서 파생합니다. |
| 8 | `e4e2dec55805` | `feat(play): 일시정지와 재개 UI 연결` | B | REALTIME, WEB | server snapshot phase에서 pause/resume availability를 파생하고 current room command를 전송합니다. |
| 9 | `8a8787d03a19` | `feat(play): versioned game input과 snapshot 소비` | A | PROTOCOL, SIMULATION, REALTIME | inputSeq와 shared event parser, monotonic snapshot acceptance를 browser에 적용합니다. |
| 10 | `868ced55a626` | `refactor(web): PongCanvas snapshot state 렌더링` | B | SIMULATION, REALTIME, WEB | canvas/interpolation buffer를 nested snapshot state에 맞춥니다. |

## 5. Commit별 학습 기록

### 5.1. `feat(web): 퐁 캔버스 미리보기 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `3449f7988e1b` |
| Importance | B |
| Tags | SIMULATION, REALTIME, WEB |
| Source에서 확정된 역할 | shared dimensions와 `GameSnapshot`으로 field/paddle/ball/score를 그립니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/components/PongCanvas.tsx`의 default `sampleSnapshot`, canvas ref/effect, DPR scaling을 확인합니다.
- field, center line, paddles, ball, scores가 snapshot/shared dimensions에서 읽히는지 확인합니다.
- canvas resize/animation cleanup과 snapshot prop mutation 여부를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 브라우저 UI에 game field를 시각화하는 component가 없었습니다. |
| 해결하려던 문제 | shared game dimensions와 snapshot shape를 이용해 server game을 표시할 reusable canvas가 필요했습니다. |
| 핵심 결정 | `PongCanvas`를 추가하고 prop이 없으면 sample snapshot을 사용해 2D context에 field와 score를 그렸습니다. |
| 입력 → 상태 전이 → 출력 | render/effect → DPR에 맞춰 canvas size 설정 → snapshot field 읽기 → draw operations 순서입니다. |
| ownership/lifetime/cleanup | component가 canvas DOM/context와 drawing effect를 소유하고 snapshot object 자체는 읽기만 합니다. |
| failure/rollback/retry | context를 얻지 못하면 그리지 않으며 sample default 때문에 실제 connection 없이도 경기 장면처럼 보입니다. |
| 보장하는 것 | shared dimensions와 snapshot 값을 browser canvas에 projection합니다. |
| 보장하지 않는 것 | authoritative source, no-snapshot empty state, interpolation은 보장하지 않습니다. |
| 후속 연결 | `91962d36bd59`가 전용 play route에서 sample canvas를 사용하고 `6a7aa285fe68`이 fabricated session을 제거합니다. |

#### 비교 기준

- 이 commit의 parent를 `git show 3449f7988e1b^` 및 `git diff 3449f7988e1b^ 3449f7988e1b`로 비교합니다.
- Thread 내 다음 관련 SHA: `91962d36bd59` — `feat(play): 경기장 화면 구성`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.2. `feat(play): 경기장 화면 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `91962d36bd59` |
| Importance | B |
| Tags | PROTOCOL, REALTIME, WEB |
| Source에서 확정된 역할 | Pong canvas 중심의 초기 play route를 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/play/page.tsx`의 sample snapshot, score/opponent/status, ready/chat/control markup을 확인합니다.
- button/form이 실제 handler와 연결됐는지 확인합니다.
- server room이 없어도 playing-like state가 표시되는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | canvas component는 있었지만 game-specific route와 control surface가 없었습니다. |
| 해결하려던 문제 | 경기장 layout, opponent/score/status, input controls의 UI 구조를 먼저 만들 필요가 있었습니다. |
| 핵심 결정 | sample snapshot과 local presentation을 사용한 `/play` route를 추가했습니다. |
| 입력 → 상태 전이 → 출력 | route render → sample state derivation → canvas/score/control markup 순서이며 network input은 없습니다. |
| ownership/lifetime/cleanup | page가 sample match state와 presentation을 모두 소유합니다. |
| failure/rollback/retry | control은 inert하거나 local presentation에만 영향을 주며 실제 room/authority가 없습니다. |
| 보장하는 것 | 후속 realtime integration을 위한 play screen layout을 제공합니다. |
| 보장하지 않는 것 | 표시된 score/opponent/phase가 실제 server state라는 보장은 없습니다. |
| 후속 연결 | `737aa99cb4cb`이 first WebSocket connection을 연결합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `3449f7988e1b` — `feat(web): 퐁 캔버스 미리보기 구현`
- Thread 내 다음 관련 SHA: `737aa99cb4cb` — `feat(play): WebSocket 경기 연결 구현`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.3. `feat(play): WebSocket 경기 연결 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `737aa99cb4cb` |
| Importance | B |
| Tags | AUTH, PROTOCOL, SIMULATION |
| Source에서 확정된 역할 | play screen을 realtime protocol client로 전환합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `play/page.tsx`의 token query WebSocket URL, `new WebSocket`, onopen/onmessage/onclose handler를 확인합니다.
- `JSON.parse(...) as ServerEvent` 단언과 event type 분기를 확인합니다.
- sample snapshot이 initial state로 남는지, stale sequence/handler cleanup이 있는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | play route는 sample state만 표시하고 server room/event를 소비하지 않았습니다. |
| 해결하려던 문제 | queue join/ready와 snapshot 수신을 실제 WebSocket으로 연결할 초기 path가 필요했습니다. |
| 핵심 결정 | browser token을 query에 넣어 socket을 열고 raw JSON을 `ServerEvent`로 단언해 matched/snapshot/finished를 local state에 반영했습니다. |
| 입력 → 상태 전이 → 출력 | token read → socket open → queue command → raw message parse/cast → event별 local state update 순서입니다. |
| ownership/lifetime/cleanup | page가 durable token, socket, handler, room/snapshot/status state를 모두 소유합니다. |
| failure/rollback/retry | runtime schema가 없고 stale snapshot gate와 robust replacement cleanup이 없으며 sample initial state가 유지됩니다. |
| 보장하는 것 | play screen이 server WebSocket event를 소비하고 ready command를 보낼 수 있습니다. |
| 보장하지 않는 것 | credential 안전성, malformed event 거부, monotonic ordering, authoritative no-sample state는 보장하지 않습니다. |
| 후속 연결 | `353ca9a17415`가 ticket/schema boundary를, `6a7aa285fe68`과 `8a8787d03a19`가 state/order를 교정합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `91962d36bd59` — `feat(play): 경기장 화면 구성`
- Thread 내 다음 관련 SHA: `977ca863050f` — `feat(play): keyboard paddle 입력 연결`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.4. `feat(play): keyboard paddle 입력 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `977ca863050f` |
| Importance | B |
| Tags | PROTOCOL, SIMULATION, REALTIME |
| Source에서 확정된 역할 | Arrow/W/S input을 room-scoped game command로 mapping합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `play/page.tsx`의 `keydown`/`keyup` listener와 command payload를 확인합니다.
- 어떤 keydown이 `-1`/`1`을 보내고 모든 keyup이 `0`을 보내는지 확인합니다.
- editing target, key repeat, socket readyState, preventDefault, listener cleanup을 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | WebSocket 경기 연결은 있었지만 사용자가 paddle intent를 보낼 입력 path가 없었습니다. |
| 해결하려던 문제 | keyboard event를 current room command로 변환할 최소 구현이 필요했습니다. |
| 핵심 결정 | keydown에서 Arrow/W/S를 direction으로 변환해 `game.input`을 보내고 keyup에서 stop command를 보냈습니다. |
| 입력 → 상태 전이 → 출력 | window key event → room/sender check → serialized input command 순서입니다. |
| ownership/lifetime/cleanup | page가 key listener와 raw send를 소유합니다. |
| failure/rollback/retry | 모든 keyup이 stop을 보내고 editable target/key repeat/focus loss를 충분히 구분하지 않으며 socket 상태 guard가 제한적입니다. |
| 보장하는 것 | keyboard로 paddle direction intent를 server에 보냅니다. |
| 보장하지 않는 것 | 일정 cadence, mobile input, neutralization completeness, monotonic input sequence는 보장하지 않습니다. |
| 후속 연결 | `3cd56054bdab`이 persistent direction sampling으로 바꾸고 hook migration의 `1ae6fa7836d8`이 transition-based 입력으로 재설계합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `737aa99cb4cb` — `feat(play): WebSocket 경기 연결 구현`
- Thread 내 다음 관련 SHA: `afbd8847b1dd` — `feat(play): 경기 채팅 입력 연결`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.5. `feat(play): 경기 채팅 입력 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `afbd8847b1dd` |
| Importance | B |
| Tags | REALTIME, WEB |
| Source에서 확정된 역할 | 현재 room과 inline WebSocket에 match-chat form을 연결합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/play/page.tsx`의 `chatInput`, `sendChat`, trim/room/socket guard를 확인합니다.
- 전송 payload의 `scope: "match"`, `roomId`, `body`와 당시 version field 부재를 확인합니다.
- 성공 확인 없이 input을 즉시 비우며 server error/echo가 local writer와 어떻게 연결되지 않는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | play 화면에는 chat input markup이 있었지만 controlled state나 WebSocket send 동작이 없었습니다. |
| 해결하려던 문제 | 현재 room에 속한 non-empty message intent를 realtime protocol로 보낼 최소 writer가 필요했습니다. |
| 핵심 결정 | `chatInput` state와 submit handler를 추가해 socket/room/body가 모두 있을 때 match-scoped command를 전송하고 input을 비웠습니다. |
| 입력 → 상태 전이 → 출력 | form submit → trim → socket/room/body guard → JSON command send → input clear 순서입니다. |
| ownership/lifetime/cleanup | PlayPage가 input state와 inline socket writer를 직접 소유합니다. message acknowledgement/rollback은 없습니다. |
| failure/rollback/retry | room이 없거나 input이 비면 보내지 않습니다. socket send failure, server reject, 다른 room event filtering은 처리하지 않습니다. |
| 보장하는 것 | match chat UI가 current room identifier를 포함한 realtime command를 전송합니다. |
| 보장하지 않는 것 | versioned schema, delivery confirmation, active-room inbound filtering, dedicated hook ownership은 보장하지 않습니다. |
| 후속 연결 | `8a8787d03a19`가 command를 versioned contract로 만들고 Thread 05가 writer를 hook으로 이전한 뒤 legacy 함수를 제거합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `977ca863050f` — `feat(play): keyboard paddle 입력 연결`
- Thread 내 다음 관련 SHA: `3cd56054bdab` — `fix(play): 패들 조작과 Canvas rendering 개선`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.6. `fix(play): 패들 조작과 Canvas rendering 개선`

| 항목 | 값 |
| --- | --- |
| SHA | `3cd56054bdab` |
| Importance | B |
| Tags | SIMULATION, REALTIME, WEB |
| Source에서 확정된 역할 | persistent direction을 50ms마다 sampling하고 snapshot을 80ms 보간합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `play/page.tsx`의 direction ref와 `setInterval(50)` input loop를 확인합니다.
- `PongCanvas.tsx`의 snapshot buffer(최근 8개), requestAnimationFrame, 80ms render target을 확인합니다.
- snapshot deep copy, two-frame interpolation, extrapolation 부재, interval/RAF cleanup을 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 첫 key handler는 browser key-repeat cadence와 모든 keyup 처리에 의존해 command 빈도와 방향 상태가 불안정했고 canvas는 snapshot을 즉시 점프해 렌더링했습니다. |
| 해결하려던 문제 | input cadence를 browser repeat와 분리하고 delayed snapshots 사이를 부드럽게 projection할 필요가 있었습니다. |
| 핵심 결정 | current direction을 ref에 저장해 room이 있을 때 50ms마다 보내고, canvas는 최근 snapshot 복사본을 버퍼링해 현재 시각보다 80ms 뒤처진 target을 두 frame 사이에서 보간했습니다. |
| 입력 → 상태 전이 → 출력 | key event → direction ref; interval → command; snapshot prop → copied buffer; RAF → target time frame pair → linear interpolation → draw 순서입니다. |
| ownership/lifetime/cleanup | page가 input interval/direction을, canvas가 RAF와 bounded snapshot buffer를 소유합니다. |
| failure/rollback/retry | unmount/room change에서 interval과 RAF를 정리합니다. frame pair가 없으면 가장 가까운 state를 사용하며 미래 extrapolation은 하지 않습니다. |
| 보장하는 것 | input cadence와 rendering cadence를 분리하고 snapshot object mutation 없이 부드럽게 표시합니다. |
| 보장하지 않는 것 | sample initial state, protocol version/sequence, background tab neutralization은 아직 보장하지 않습니다. |
| 후속 연결 | `6a7aa285fe68`이 actual session gating을, `8a8787d03a19`이 monotonic protocol을 적용합니다. |

#### Fix 복원

| 항목 | 근거 |
| --- | --- |
| 이전 가정 | keydown repeat와 즉시 snapshot draw가 충분하다고 가정했습니다. |
| 실제 실패/위험 | OS/browser repeat 차이로 input cadence가 흔들리고 network snapshot 간 화면이 점프합니다. |
| 근본 원인 | physical input event와 transport cadence, network update와 render cadence를 직접 결합했습니다. |
| 수정된 불변식 | direction은 별도 state로 sampling하고 renderer는 bounded delayed snapshot buffer를 projection합니다. |
| 회귀 근거 | 이 SHA에는 전용 test가 없으며 후속 client/input tests가 command sequence를 검증합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `afbd8847b1dd` — `feat(play): 경기 채팅 입력 연결`
- Thread 내 다음 관련 SHA: `6a7aa285fe68` — `fix(play): 실제 경기 상태에 맞게 세션 표시`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.7. `fix(play): 실제 경기 상태에 맞게 세션 표시`

| 항목 | 값 |
| --- | --- |
| SHA | `6a7aa285fe68` |
| Importance | A |
| Tags | SIMULATION, REALTIME, WEB |
| Source에서 확정된 역할 | score/opponent/ready/chat/input/terminal cleanup을 latest server snapshot에서 파생합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `play/page.tsx`의 snapshot initial state가 sample에서 `null`로 바뀌는지 확인합니다.
- ready/chat/input availability가 room과 snapshot phase를 어떤 조건으로 요구하는지 확인합니다.
- connect/finish/close 시 snapshot, room, direction, timers/handlers를 정리하는 순서를 확인합니다.
- `PongCanvas`가 null snapshot에서 neutral empty frame을 그리는지 확인합니다.
- 같은 commit의 server 변경은 이 Thread 설명에 역투영하지 않고 browser diff만 분리합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 실제 room이 없거나 request가 실패해도 sample score/opponent/field가 표시됐고 input loop와 controls가 real phase와 충분히 묶이지 않았습니다. |
| 해결하려던 문제 | browser가 server-authoritative game을 표시한다면 snapshot 부재와 lifecycle phase를 명시적으로 반영해야 했습니다. |
| 핵심 결정 | snapshot을 `null`에서 시작하고 room/phase에 따라 ready/chat/input을 제한하며 connection start/finish/close에서 stale game state와 direction을 정리했습니다. |
| 입력 → 상태 전이 → 출력 | socket event → latest server snapshot/phase → derived score/opponent/control availability; no snapshot → neutral canvas/“경기 전” presentation 순서입니다. |
| ownership/lifetime/cleanup | server snapshot이 display source를 소유하고 page는 accepted latest value와 transport resource를 관리합니다. cleanup이 room/snapshot/direction/handler를 초기화합니다. |
| failure/rollback/retry | snapshot이 없으면 fabricated match를 보이지 않고 playing phase에서만 input timer를 활성화합니다. terminal/close에서 stale room command를 막습니다. |
| 보장하는 것 | score, opponent, phase, action availability가 실제 received snapshot에서만 파생됩니다. |
| 보장하지 않는 것 | raw message schema와 snapshot sequence ordering은 아직 보장하지 않습니다. |
| 후속 연결 | `8a8787d03a19`이 version/parser/sequence gate를 적용하고 `868ced55a626`이 canvas를 nested state contract에 맞춥니다. |

#### A-level 불변식 종합

- **핵심 책임:** score/opponent/ready/chat/input/terminal cleanup을 latest server snapshot에서 파생합니다.
- **실패 영향:** browser가 server-authoritative game을 표시한다면 snapshot 부재와 lifecycle phase를 명시적으로 반영해야 했습니다.
- **결과 불변식:** score, opponent, phase, action availability가 실제 received snapshot에서만 파생됩니다.
- **남은 제한:** raw message schema와 snapshot sequence ordering은 아직 보장하지 않습니다.

#### Fix 복원

| 항목 | 근거 |
| --- | --- |
| 이전 가정 | sample match state를 초기값으로 두고 server snapshot이 오면 교체해도 된다고 봤습니다. |
| 실제 실패/위험 | connection 전/실패/종료 상태가 실제 경기처럼 표시되고 stale input/room이 남습니다. |
| 근본 원인 | preview fixture와 authoritative session state를 같은 변수에 사용했습니다. |
| 수정된 불변식 | snapshot 부재는 경기 부재이며 score/control은 latest server phase에서만 파생합니다. |
| 회귀 근거 | 후속 connection reducer/client tests와 browser E2E가 lifecycle을 간접 검증합니다. |

#### 핵심 코드 근거

| 항목 | 값 |
| --- | --- |
| SHA | `6a7aa285fe68` |
| 파일 | `apps/web/src/app/play/page.tsx` |
| 함수/위치 | `session state derivation` |
| 근거 요약 | snapshot은 `null`에서 시작하고 room과 `snapshot.state.phase === "playing"`일 때만 input을 활성화하며 finish/close에서 room과 direction을 정리합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `3cd56054bdab` — `fix(play): 패들 조작과 Canvas rendering 개선`
- Thread 내 다음 관련 SHA: `e4e2dec55805` — `feat(play): 일시정지와 재개 UI 연결`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.8. `feat(play): 일시정지와 재개 UI 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `e4e2dec55805` |
| Importance | B |
| Tags | REALTIME, WEB |
| Source에서 확정된 역할 | server snapshot phase에서 pause/resume availability를 파생하고 current room command를 전송합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `play/page.tsx`의 `canPause`, `canResume`, button label/handler를 확인합니다.
- snapshot phase가 `paused`/`playing`일 때만 해당 command를 보내는지 확인합니다.
- browser가 자체적으로 phase를 변경하지 않고 server snapshot을 기다리는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | server protocol과 hub가 pause/resume을 지원해도 play UI에는 해당 user intent와 phase 표시가 없었습니다. |
| 해결하려던 문제 | current room과 authoritative phase에 맞는 control만 활성화해야 했습니다. |
| 핵심 결정 | snapshot phase에서 pause/resume 가능 여부를 파생하고 current room ID를 포함한 command를 보냈습니다. |
| 입력 → 상태 전이 → 출력 | snapshot phase → enabled control; click → room-scoped pause/resume command → 후속 server snapshot → UI phase 갱신 순서입니다. |
| ownership/lifetime/cleanup | server가 phase authority를, page는 button intent를 소유합니다. |
| failure/rollback/retry | command 전송만으로 local phase를 낙관적으로 바꾸지 않으며 room/phase가 맞지 않으면 control을 비활성화합니다. |
| 보장하는 것 | pause/resume UI가 authoritative phase와 일치합니다. |
| 보장하지 않는 것 | server가 command를 수락하는 조건과 pause 중 input reset은 이 browser commit이 보장하지 않습니다. |
| 후속 연결 | 후속 protocol/version migration에서도 같은 phase-derived presentation이 유지됩니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `6a7aa285fe68` — `fix(play): 실제 경기 상태에 맞게 세션 표시`
- Thread 내 다음 관련 SHA: `8a8787d03a19` — `feat(play): versioned game input과 snapshot 소비`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.9. `feat(play): versioned game input과 snapshot 소비`

| 항목 | 값 |
| --- | --- |
| SHA | `8a8787d03a19` |
| Importance | A |
| Tags | PROTOCOL, SIMULATION, REALTIME |
| Source에서 확정된 역할 | inputSeq와 shared event parser, monotonic snapshot acceptance를 browser에 적용합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `play/page.tsx`의 모든 client command에 `v: 1`이 포함되는지 확인합니다.
- `game.input`의 `inputSeq` 증가와 reconnect/new room에서 reset되는 위치를 확인합니다.
- raw message가 `parseServerEvent`를 통과하고 `snapshot.sequence <= lastSequence`를 거부하는지 확인합니다.
- flat snapshot field 참조가 `snapshot.state.*`로 이동하는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | browser는 unversioned command와 raw JSON cast를 사용했고 delayed/duplicate snapshot이 current display를 뒤로 돌릴 수 있었습니다. |
| 해결하려던 문제 | wire contract version과 client input/snapshot ordering을 runtime에 강제해야 했습니다. |
| 핵심 결정 | 모든 command에 `v: 1`을 넣고 input sequence를 단조 증가시키며 shared parser로 event를 검증하고 accepted snapshot sequence gate를 추가했습니다. |
| 입력 → 상태 전이 → 출력 | DOM/user intent → versioned command + roomId + inputSeq; raw event → shared parse → sequence gate → nested state adoption 순서입니다. |
| ownership/lifetime/cleanup | browser connection state가 last input/snapshot sequence를 소유하고 shared schema가 wire trust boundary를 소유합니다. |
| failure/rollback/retry | malformed event는 state로 들어오지 않고 같은/오래된 snapshot은 무시합니다. new connection/room에서 relevant sequence를 reset합니다. |
| 보장하는 것 | wire message와 rendered snapshot이 versioned runtime contract 및 monotonic ordering을 따릅니다. |
| 보장하지 않는 것 | network loss 자체를 복구하거나 server simulation correctness를 증명하지 않습니다. |
| 후속 연결 | `868ced55a626`이 reusable canvas도 nested state contract로 정렬하고 이후 reducer/client가 ordering owner를 분리합니다. |

#### A-level 불변식 종합

- **핵심 책임:** inputSeq와 shared event parser, monotonic snapshot acceptance를 browser에 적용합니다.
- **실패 영향:** wire contract version과 client input/snapshot ordering을 runtime에 강제해야 했습니다.
- **결과 불변식:** wire message와 rendered snapshot이 versioned runtime contract 및 monotonic ordering을 따릅니다.
- **남은 제한:** network loss 자체를 복구하거나 server simulation correctness를 증명하지 않습니다.

#### 핵심 코드 근거

| 항목 | 값 |
| --- | --- |
| SHA | `8a8787d03a19` |
| 파일 | `apps/web/src/app/play/page.tsx` |
| 함수/위치 | `message/input handlers` |
| 근거 요약 | 모든 command는 `v: 1`과 room ID를 포함하고 input은 증가하는 `inputSeq`를 사용합니다. parsed snapshot은 이전 sequence 이하이면 폐기합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `e4e2dec55805` — `feat(play): 일시정지와 재개 UI 연결`
- Thread 내 다음 관련 SHA: `868ced55a626` — `refactor(web): PongCanvas snapshot state 렌더링`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.10. `refactor(web): PongCanvas snapshot state 렌더링`

| 항목 | 값 |
| --- | --- |
| SHA | `868ced55a626` |
| Importance | B |
| Tags | SIMULATION, REALTIME, WEB |
| Source에서 확정된 역할 | canvas/interpolation buffer를 nested snapshot state에 맞춥니다. |

#### 해당 SHA에서 확인할 실제 코드

- `PongCanvas.tsx`의 draw, clone, interpolation 함수가 `snapshot.state`의 paddle/ball/score를 읽는지 확인합니다.
- empty snapshot이 valid sequence/serverTime/state shape를 갖는지 확인합니다.
- buffer copy가 source snapshot을 mutate하지 않는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | play page는 nested versioned snapshot을 소비했지만 reusable canvas의 helper 일부는 이전 flat field shape에 묶여 있었습니다. |
| 해결하려던 문제 | renderer와 interpolation buffer도 authoritative shared shape를 그대로 따라야 했습니다. |
| 핵심 결정 | draw/clone/interpolate/empty snapshot을 nested `state` 구조에 맞춰 정리했습니다. |
| 입력 → 상태 전이 → 출력 | accepted snapshot prop → deep clone buffer → delayed interpolation of state fields → draw nested paddles/ball/scores 순서입니다. |
| ownership/lifetime/cleanup | canvas가 presentation buffer/RAF를 소유하고 source snapshot authority는 caller/server에 남습니다. |
| failure/rollback/retry | source object를 직접 변경하지 않고 null 상태에는 neutral empty snapshot을 사용합니다. |
| 보장하는 것 | reusable renderer가 versioned nested snapshot contract와 일치합니다. |
| 보장하지 않는 것 | renderer는 collision, score, phase transition을 계산하지 않습니다. |
| 후속 연결 | 후속 connection refactor가 snapshot acceptance를 reducer에 옮겨도 canvas는 projection component로 유지됩니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `8a8787d03a19` — `feat(play): versioned game input과 snapshot 소비`
- 이 SHA가 이 Thread의 마지막 고정 commit입니다.
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

## 6. 불변식 발전 기록

| 단계 | 관련 SHA | 학습 기록 |
| --- | --- | --- |
| preview renderer | `3449f7988e1b` → `91962d36bd59` | canvas/play screen은 생겼지만 sample match를 실제처럼 표시했습니다. |
| 첫 realtime/input | `737aa99cb4cb` → `977ca863050f` | socket과 keyboard command가 연결됐지만 token/cast/order/cleanup이 불완전했습니다. |
| match chat writer | `afbd8847b1dd` | 현재 room과 inline socket을 사용하는 첫 chat command path가 생겼습니다. |
| cadence 분리 | `3cd56054bdab` | 50ms input sampling과 80ms delayed interpolation이 도입됐습니다. |
| authoritative presentation 교정 | `6a7aa285fe68` | no-snapshot는 no-game이며 control이 server phase를 따릅니다. |
| pause projection | `e4e2dec55805` | pause/resume intent가 current room과 snapshot phase에 묶였습니다. |
| version/order contract | `8a8787d03a19` → `868ced55a626` | versioned parser, monotonic sequence, nested renderer가 완성됐습니다. |

## 7. Failure → Fix → Test 관계

| 이전 상태/가정 | 실패 또는 위험 | Fix 연결 | Test/후속 근거 | 관계 해설 |
| --- | --- | --- | --- | --- |
| sample snapshot을 runtime state로 사용 | connection 전/실패도 실제 경기처럼 표시 | `6a7aa285fe68` | 후속 reducer/client lifecycle tests | sample snapshot을 runtime state로 사용 → connection 전/실패도 실제 경기처럼 표시 → `6a7aa285fe68` → 후속 reducer/client lifecycle tests |
| keydown repeat·즉시 draw | 불안정 input cadence·화면 점프 | `3cd56054bdab` | 전용 rendering test는 없음 | keydown repeat·즉시 draw → 불안정 input cadence·화면 점프 → `3cd56054bdab` → 전용 rendering test는 없음 |
| raw JSON cast·sequence gate 없음 | malformed/stale snapshot 수용 | `8a8787d03a19` | shared protocol tests와 후속 client/reducer tests | raw JSON cast·sequence gate 없음 → malformed/stale snapshot 수용 → `8a8787d03a19` → shared protocol tests와 후속 client/reducer tests |

## 8. Ownership·state·lifetime 변화

| 대상 | 이전 owner/state | 이후 owner/state | 수명/cleanup |
| --- | --- | --- | --- |
| game authority | sample/browser state 혼합 | server snapshot | room/session 수명 |
| canvas resources | 단발 drawing | `PongCanvas` context/RAF/buffer | component mount 수명 |
| input cadence | browser key repeat | 50ms page interval, 이후 hook transition command로 이전 | active room/playing 수명 |
| snapshot ordering | 없음 | browser last sequence gate, 이후 reducer | connection/room 수명 |
| protocol trust | JSON cast | shared runtime parser | message 처리 순간 |
| pause state | 없음/local 가능 | server snapshot phase | room phase 수명 |
| match chat input | 정적 markup | PlayPage controlled input/inline socket, 이후 hook으로 이전 | active room/page 수명 |

## 9. Thread 최종 상태

마지막 SHA에서 canvas는 accepted nested server snapshot만 복제·보간·렌더링하고 game rule을 계산하지 않습니다. snapshot이 없으면 neutral pre-game surface를 보이며 score/opponent/control은 authoritative phase에서 파생됩니다. client input은 versioned room-scoped monotonic command입니다. 후속 hook migration에서는 입력 writer와 snapshot acceptance owner가 각각 client/reducer로 이동하지만 이 projection invariant는 유지됩니다.

### 최종 실행 흐름

1. server event가 shared runtime parser를 통과하고 stale/equal sequence gate를 통과합니다.
2. accepted snapshot의 nested `state`가 current game source가 됩니다.
3. page는 phase에서 score/opponent/ready/chat/pause/input availability를 파생합니다.
4. `PongCanvas`는 snapshot 복사본을 bounded buffer에 넣고 80ms delayed target의 두 frame을 보간합니다.
5. RAF가 interpolated paddle/ball/score를 draw하며 source snapshot을 mutate하지 않습니다.
6. keyboard intent는 active room/playing 조건에서 versioned `game.input`과 증가하는 `inputSeq`로 전송됩니다.
7. match chat intent도 current room ID와 non-empty body를 요구한 뒤 realtime command로 전송됩니다.
8. room/finish/close/unmount에서는 input timer, direction, socket handler, animation resource를 정리합니다.

## 10. 학습 완료 점검

- [x] 모든 commit을 지정 SHA의 parent/diff와 비교했습니다.
- [x] 후속 HEAD 코드를 이전 SHA 설명에 역투영하지 않았습니다.
- [x] owner, lifetime, cleanup, failure branch와 non-guarantee를 기록했습니다.
- [x] fix는 이전 가정과 root cause에, test는 production path와 증명 범위에 연결했습니다.
- [x] A/B importance 깊이를 구분했고 source subject/tag/role을 유지했습니다.
- [x] 실행하지 않은 project test에 pass 결과를 만들지 않았습니다.
