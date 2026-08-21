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
| SHA | `6a7aa285fe68` |
| 파일 | `apps/web/src/app/play/page.tsx` |
| 함수/위치 | `session state derivation` |
| 근거 요약 | [학습자 작성: 이 위치가 상태·소유권·실패 규칙을 어떻게 증명하는지 기록] |

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
| SHA | `8a8787d03a19` |
| 파일 | `apps/web/src/app/play/page.tsx` |
| 함수/위치 | `message/input handlers` |
| 근거 요약 | [학습자 작성: 이 위치가 상태·소유권·실패 규칙을 어떻게 증명하는지 기록] |

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

- Thread 내 직전 관련 SHA: `8a8787d03a19` — `feat(play): versioned game input과 snapshot 소비`
- 이 SHA가 이 Thread의 마지막 고정 commit입니다.
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

## 6. 불변식 발전 기록

| 단계 | 관련 SHA | 학습 기록 |
| --- | --- | --- |
| preview renderer | `3449f7988e1b` → `91962d36bd59` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| 첫 realtime/input | `737aa99cb4cb` → `977ca863050f` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| match chat writer | `afbd8847b1dd` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| cadence 분리 | `3cd56054bdab` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| authoritative presentation 교정 | `6a7aa285fe68` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| pause projection | `e4e2dec55805` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| version/order contract | `8a8787d03a19` → `868ced55a626` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |

## 7. Failure → Fix → Test 관계

| 이전 상태/가정 | 실패 또는 위험 | Fix 연결 | Test/후속 근거 | 관계 해설 |
| --- | --- | --- | --- | --- |
| [학습자 작성: 이전 가정] | [학습자 작성: actual failure/risk] | `6a7aa285fe68` | 후속 reducer/client lifecycle tests | [학습자 작성: root cause와 corrected invariant를 한 문장으로 연결] |
| [학습자 작성: 이전 가정] | [학습자 작성: actual failure/risk] | `3cd56054bdab` | 전용 rendering test는 없음 | [학습자 작성: root cause와 corrected invariant를 한 문장으로 연결] |
| [학습자 작성: 이전 가정] | [학습자 작성: actual failure/risk] | `8a8787d03a19` | shared protocol tests와 후속 client/reducer tests | [학습자 작성: root cause와 corrected invariant를 한 문장으로 연결] |

## 8. Ownership·state·lifetime 변화

| 대상 | 이전 owner/state | 이후 owner/state | 수명/cleanup |
| --- | --- | --- | --- |
| game authority | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| canvas resources | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| input cadence | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| snapshot ordering | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| protocol trust | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| pause state | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| match chat input | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |

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
