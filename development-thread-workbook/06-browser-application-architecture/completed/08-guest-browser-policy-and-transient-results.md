# Guest browser policy와 transient results

- 카테고리: `06-browser-application-architecture` — 브라우저 애플리케이션 아키텍처
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

deployment mode를 browser capability policy로 변환하고 guest login, route/navigation restriction, lobby/play presentation, non-persisted result notice, active room 복귀, reconnect를 연결한 뒤 abuse·recovery·browser E2E로 검증하는 과정을 복원합니다.

### 직접 연결되는 불변식

- server `APP_MODE`와 browser `NEXT_PUBLIC_APP_MODE`는 같은 demo capability를 선택합니다.
- demo navigation과 middleware는 registered-only 화면을 각각 presentation과 direct URL 경계에서 차단합니다.
- guest UI는 durable 전적·rating·ranking·chat을 제공하는 것처럼 표시하지 않습니다.
- `persisted: false` 결과는 임시 결과로 명시하며 dashboard/history로 취급하지 않습니다.
- lobby socket에서 active room event를 회수하면 새 matchmaking intent를 만들지 않고 `/play`로 복귀합니다.
- 최종 browser E2E는 guest entry, restricted navigation, PvP, 6초 AI fallback, fresh-ticket reconnect를 분리 검증합니다.

### 범위 주의

이 Thread는 browser-owned guest capability와 그 통합 evidence를 다룹니다. `eaa4fdaba361`의 server-side guest result producer(`persisted: false`, `matchId: null`, 2분 retention)와 `2b274686e6d4`의 server runtime bound는 upstream 근거로만 참조하며 이 카테고리의 commit map에는 넣지 않습니다. `9f49db1d9f1d`와 `06d2eb7a93cc`는 mixed test commits이므로 browser policy/transport 관련 test만 학습 범위로 삼고 server-only assertion을 browser 보장으로 해석하지 않습니다.

### 교차 Thread 주의

`4f5199097284`는 Thread 04와 의도적으로 중복됩니다. 여기서는 `HomePage`와 `demoPolicy`의 guest route/result handling만 고정하고 transport/reducer/hook 구현은 Thread 04에서만 해설합니다.

## 2. 핵심 질문

- runtime mode와 session secret/proxy trust가 어떤 config에서 fail-closed로 선택됩니까?
- `createNavigation`, restricted paths, presentation flags가 shell/page/middleware에서 어떻게 공유됩니까?
- guest login은 사용자 입력 없이 server-named identity를 cookie session으로 어떻게 수신합니까?
- lobby가 `game.finished persisted:false`, `queue.matched`, `game.snapshot`을 각각 어떻게 처리합니까?
- mixed guest tests에서 browser policy와 server resource abuse evidence를 어떻게 구분합니까?
- Playwright가 실제 WebSocket frame timing과 forced reconnect를 어떤 technique로 관찰합니까?

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
| 1 | `f801ccd09cf0` | `feat(guest): guest runtime 환경 경계 구성` | A | AUTH, WEB | application mode와 proxy trust를 runtime/public browser configuration에 명시합니다. |
| 2 | `e39316254e44` | `feat(web): 비회원 체험 정책 경계 추가` | B | WEB | guest demo surface용 centralized browser policy module을 도입합니다. |
| 3 | `a9fc8a8328b2` | `feat(web): guest login API와 middleware 연결` | B | AUTH, PROTOCOL, TOURNAMENT | guest session adapter와 registered-only screen 차단 middleware를 연결합니다. |
| 4 | `7fdef5d224c4` | `feat(web): LoginPanel guest 진입 연결` | B | WEB | demo mode에서 login panel을 server-managed guest entry에 연결합니다. |
| 5 | `584d17f3aad1` | `feat(web): guest lobby presentation 적용` | B | REALTIME, WEB | guest lobby가 durable progress와 unsupported interaction을 광고하지 않게 합니다. |
| 6 | `658fafd43f88` | `feat(web): demo navigation 정책 연결` | B | WEB | `AppShell`이 capability에 맞는 navigation만 구성합니다. |
| 7 | `fe0f3e0ad0ad` | `feat(web): guest play presentation 적용` | B | WEB | demo mode에서 지원하지 않는 match chat을 숨깁니다. |
| 8 | `618330916629` | `test(web): 비회원 체험 진입 흐름 검증` | B | AUTH, WEB, TEST | guest entry와 browser API boundary를 검증합니다. |
| 9 | `9f49db1d9f1d` | `test(guest): 체험 기능 오용 방지 검증` | A | AUTH, WEB, RISK | guest-mode abuse와 browser capability isolation의 negative boundary를 확장 검증합니다. |
| 10 | `4f5199097284` | `fix(web): 중단된 game reconnect 복구` | A | AUTH, REALTIME, WEB | guest lobby에서 transient result를 명시하고 active room event를 회수하면 game screen으로 복귀합니다. |
| 11 | `06d2eb7a93cc` | `test(guest): 체험 환경의 복구 경계 검증` | A | AUTH, SIMULATION, REALTIME | fresh-ticket reconnect, duplicate match 차단, transient result presentation을 확장 검증합니다. |
| 12 | `1abda1299ad8` | `test(e2e): 비회원 체험 브라우저 흐름 검증` | A | AUTH, REALTIME, WEB | demo-mode guest entry, restricted navigation, two-browser PvP, 6초 AI fallback, ticket-based reconnect를 Playwright로 검증합니다. |

## 5. Commit별 학습 기록

### 5.1. `feat(guest): guest runtime 환경 경계 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `f801ccd09cf0` |
| Importance | A |
| Tags | AUTH, WEB |
| Source에서 확정된 역할 | application mode와 proxy trust를 runtime/public browser configuration에 명시합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `.env.example`, `apps/api/src/env.ts`, browser public env 사용 위치를 확인합니다.
- `APP_MODE`의 development/test/production/demo 값과 `NEXT_PUBLIC_APP_MODE` 연결을 확인합니다.
- demo/production에서 `SESSION_SECRET` 32바이트 이상을 요구하고 `TRUST_PROXY`가 explicit opt-in인지 확인합니다.
- browser build-time public mode와 server runtime mode가 서로 독립적으로 잘못 설정될 가능성도 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | guest 기능은 예정돼 있었지만 deployment가 demo인지 production인지, browser가 어떤 capability를 표시해야 하는지 명시적 runtime contract가 없었습니다. |
| 해결하려던 문제 | 공개 guest traffic을 허용하는 mode에서는 약한/기본 secret과 신뢰되지 않은 forwarded address가 인증·rate-limit 경계를 무너뜨릴 수 있었습니다. |
| 핵심 결정 | `APP_MODE`, `TRUST_PROXY`, `NEXT_PUBLIC_APP_MODE`를 환경 계약에 추가하고 demo/production에서 강한 session secret을 필수로 만들었습니다. |
| 입력 → 상태 전이 → 출력 | process env → `readEnv/readAppMode` validation → API construction; browser build env → policy selection 순서입니다. |
| ownership/lifetime/cleanup | server env parser가 secret/proxy/mode를, browser build가 public mode 값을 소유합니다. 설정은 process/build 수명 동안 고정됩니다. |
| failure/rollback/retry | 알 수 없는 mode/약한 secret은 startup에서 실패하고 proxy parsing은 명시한 경우에만 활성화됩니다. |
| 보장하는 것 | guest capability를 암묵적 NODE_ENV가 아니라 명시적 mode와 fail-closed secret 요구에 연결합니다. |
| 보장하지 않는 것 | server와 browser env가 deployment에서 반드시 같은 값이라는 자동 교차 검증은 이 commit만으로 보장하지 않습니다. |
| 후속 연결 | `e39316254e44`가 browser mode를 구체적인 navigation/presentation policy로 변환하고 `9f49db1d9f1d`/`06d2eb7a93cc`가 env negative case를 검증합니다. |

#### A-level 불변식 종합

- **핵심 책임:** application mode와 proxy trust를 runtime/public browser configuration에 명시합니다.
- **실패 영향:** 공개 guest traffic을 허용하는 mode에서는 약한/기본 secret과 신뢰되지 않은 forwarded address가 인증·rate-limit 경계를 무너뜨릴 수 있었습니다.
- **결과 불변식:** guest capability를 암묵적 NODE_ENV가 아니라 명시적 mode와 fail-closed secret 요구에 연결합니다.
- **남은 제한:** server와 browser env가 deployment에서 반드시 같은 값이라는 자동 교차 검증은 이 commit만으로 보장하지 않습니다.

#### 핵심 코드 근거

| 항목 | 값 |
| --- | --- |
| SHA | `f801ccd09cf0` |
| 파일 | `apps/api/src/env.ts` |
| 함수/위치 | `readEnv / readAppMode` |
| 근거 요약 | demo와 production은 명시적 강한 `SESSION_SECRET`을 요구하고 proxy address 해석은 `TRUST_PROXY`가 켜진 경우에만 허용합니다. |

#### 비교 기준

- 이 commit의 parent를 `git show f801ccd09cf0^` 및 `git diff f801ccd09cf0^ f801ccd09cf0`로 비교합니다.
- Thread 내 다음 관련 SHA: `e39316254e44` — `feat(web): 비회원 체험 정책 경계 추가`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.2. `feat(web): 비회원 체험 정책 경계 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `e39316254e44` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | guest demo surface용 centralized browser policy module을 도입합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/lib/demoPolicy.ts`의 registered navigation, demo navigation, restricted path, presentation flags를 확인합니다.
- `createNavigation(demoMode, profileHref)`, `isDemoRestrictedPath`, `isDemoMode`의 pure/input-dependent 범위를 확인합니다.
- demo mode에서 lobby/play만 남고 persisted progress, leaderboard, lobby/match chat flags가 false인지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 각 component가 demo 여부를 개별 조건문으로 해석하면 navigation과 page capability가 서로 달라질 수 있었습니다. |
| 해결하려던 문제 | guest에게 허용/금지할 browser surface를 한 module에서 정의할 필요가 있었습니다. |
| 핵심 결정 | registered navigation 목록과 demo presentation flags/restricted paths를 `demoPolicy.ts`에 모았습니다. |
| 입력 → 상태 전이 → 출력 | public mode + profile href → navigation items; pathname → restricted 여부; page → presentation flags 소비 순서입니다. |
| ownership/lifetime/cleanup | policy module이 capability description을 소유하고 shell/page/middleware는 이를 소비합니다. |
| failure/rollback/retry | pure function은 정책을 계산하지만 아직 실제 component나 middleware에 연결되지 않았습니다. |
| 보장하는 것 | guest browser surface의 single policy vocabulary를 제공합니다. |
| 보장하지 않는 것 | server route authorization이나 guest session 생성은 보장하지 않습니다. |
| 후속 연결 | `a9fc8a8328b2`가 middleware/API adapter를, 이후 UI commits가 policy를 실제 rendering에 연결합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `f801ccd09cf0` — `feat(guest): guest runtime 환경 경계 구성`
- Thread 내 다음 관련 SHA: `a9fc8a8328b2` — `feat(web): guest login API와 middleware 연결`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.3. `feat(web): guest login API와 middleware 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `a9fc8a8328b2` |
| Importance | B |
| Tags | AUTH, PROTOCOL, TOURNAMENT |
| Source에서 확정된 역할 | guest session adapter와 registered-only screen 차단 middleware를 연결합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/lib/api.ts`의 `guestLogin` endpoint, HTTP method/body, shared response schema를 확인합니다.
- `apps/web/src/middleware.ts`가 demo mode에서 `isDemoRestrictedPath`를 사용해 어떤 status/response를 반환하는지 확인합니다.
- navigation 숨김과 direct URL 차단이 별도 계층임을 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | browser policy는 있었지만 guest session을 만드는 adapter와 직접 URL로 registered-only page에 접근하는 server-side route guard가 없었습니다. |
| 해결하려던 문제 | UI 숨김만으로는 주소 입력을 막지 못하고 guest login success payload도 runtime 검증이 필요했습니다. |
| 핵심 결정 | `POST /auth/guest`를 shared schema로 parse하는 helper와 demo restricted path를 404로 처리하는 Next middleware를 추가했습니다. |
| 입력 → 상태 전이 → 출력 | login caller → cookie-based guest endpoint → schema-validated user; request pathname → middleware policy → restricted면 404 순서입니다. |
| ownership/lifetime/cleanup | API adapter가 response trust를, middleware가 browser route delivery를 소유합니다. |
| failure/rollback/retry | malformed guest response는 성공하지 않고 restricted direct request는 page component까지 도달하지 않습니다. |
| 보장하는 것 | guest session entry adapter와 direct route presentation guard를 제공합니다. |
| 보장하지 않는 것 | API server의 registered-only authorization과 session signing은 browser commit이 증명하지 않습니다. |
| 후속 연결 | `7fdef5d224c4`가 login panel에 helper를 연결하고 `618330916629`가 body/credentials/schema를 검증합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `e39316254e44` — `feat(web): 비회원 체험 정책 경계 추가`
- Thread 내 다음 관련 SHA: `7fdef5d224c4` — `feat(web): LoginPanel guest 진입 연결`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.4. `feat(web): LoginPanel guest 진입 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `7fdef5d224c4` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | demo mode에서 login panel을 server-managed guest entry에 연결합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `LoginPanel.tsx`의 `demoMode`, mutationFn branch, guest response `.user` 사용을 확인합니다.
- demo mode에서 handle/displayName input이 렌더링되지 않는지 확인합니다.
- success 시 `queryKeys.me()` set과 login invalidation, pending/error button label을 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | login panel은 항상 사용자가 handle/display name을 입력하고 development login을 호출했습니다. |
| 해결하려던 문제 | guest identity는 사용자가 이름을 선택하는 registered/development account가 아니라 server가 발급하는 transient session이어야 했습니다. |
| 핵심 결정 | demo mode에서는 inputs를 숨기고 `guestLogin()` 결과의 server-named user를 current session cache에 넣도록 mutation을 분기했습니다. |
| 입력 → 상태 전이 → 출력 | button click → guest POST(no body) → response user → me cache set → login-related invalidation → lobby render 순서입니다. |
| ownership/lifetime/cleanup | server가 guest identity naming/session을, QueryClient가 current user cache를, panel이 pending/error presentation을 소유합니다. |
| failure/rollback/retry | request failure는 entry를 성공 처리하지 않고 error를 표시하며 duplicate pending click을 막습니다. |
| 보장하는 것 | profile input 없이 server-managed guest session으로 진입합니다. |
| 보장하지 않는 것 | guest capability가 UI 전체에서 숨겨졌다는 보장은 아직 없습니다. |
| 후속 연결 | `584d17f3aad1`, `658fafd43f88`, `fe0f3e0ad0ad`가 lobby/nav/play presentation을 순서대로 적용합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `a9fc8a8328b2` — `feat(web): guest login API와 middleware 연결`
- Thread 내 다음 관련 SHA: `584d17f3aad1` — `feat(web): guest lobby presentation 적용`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.5. `feat(web): guest lobby presentation 적용`

| 항목 | 값 |
| --- | --- |
| SHA | `584d17f3aad1` |
| Importance | B |
| Tags | REALTIME, WEB |
| Source에서 확정된 역할 | guest lobby가 durable progress와 unsupported interaction을 광고하지 않게 합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/page.tsx`가 `isDemoMode`와 `demoLobbyPresentation`을 소비하는 위치를 확인합니다.
- “전적 저장”→“결과 미저장”, description, leaderboard link, wins/rating cards, lobby chat 조건을 확인합니다.
- online/wait metrics와 play entry는 guest에게 계속 노출되는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | guest가 로그인해도 registered lobby copy와 wins/rating/ranking/chat이 그대로 보여 durable account capability를 암시했습니다. |
| 해결하려던 문제 | transient guest가 실제로 사용할 수 없는 progress/social 기능을 화면에서 제거하고 결과 미저장을 명시해야 했습니다. |
| 핵심 결정 | central presentation flags로 copy와 section visibility를 분기해 persisted stats, leaderboard link, lobby chat을 숨겼습니다. |
| 입력 → 상태 전이 → 출력 | demo mode → policy flags → lobby hero/stat/link/chat conditional render 순서입니다. |
| ownership/lifetime/cleanup | policy가 capability를, HomePage가 conditional presentation과 live lobby metrics를 소유합니다. |
| failure/rollback/retry | unsupported section은 DOM에 렌더링하지 않으며 online/wait와 play entry는 유지합니다. |
| 보장하는 것 | guest lobby가 durable progress를 약속하지 않습니다. |
| 보장하지 않는 것 | direct registered page 접근과 play match chat은 이 commit만으로 막지 않습니다. |
| 후속 연결 | `658fafd43f88`과 `fe0f3e0ad0ad`가 남은 navigation/play surface를 적용합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `7fdef5d224c4` — `feat(web): LoginPanel guest 진입 연결`
- Thread 내 다음 관련 SHA: `658fafd43f88` — `feat(web): demo navigation 정책 연결`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.6. `feat(web): demo navigation 정책 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `658fafd43f88` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | `AppShell`이 capability에 맞는 navigation만 구성합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `AppShell.tsx`가 inline nav array 대신 `createNavigation(isDemoMode(), profileHref)`를 호출하는지 확인합니다.
- `NavigationId`→Lucide icon mapping이 policy data와 presentation dependency를 분리하는지 확인합니다.
- demo mode에서 lobby/play 두 link만 DOM에 있는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | central policy가 있어도 shell은 여전히 dashboard/leaderboard/tournament/profile/admin 전체 nav를 자체 생성했습니다. |
| 해결하려던 문제 | browser capability와 navigation 목록이 같은 source를 사용해야 했습니다. |
| 핵심 결정 | shell이 `createNavigation` 결과만 렌더링하고 icon component는 ID별 별도 map으로 연결했습니다. |
| 입력 → 상태 전이 → 출력 | mode/profile href → policy nav items → icon lookup/active class → link render 순서입니다. |
| ownership/lifetime/cleanup | policy가 item selection을, shell이 icon/active/layout을 소유합니다. |
| failure/rollback/retry | demo policy에 없는 item은 navigation DOM에 생성되지 않습니다. |
| 보장하는 것 | 주소 직접 입력 차단은 middleware에 의존합니다. |
| 보장하지 않는 것 | guest shell이 lobby/play capability만 광고합니다. |
| 후속 연결 | `9f49db1d9f1d`가 demo/registered item ID 배열을 pure test로 고정합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `584d17f3aad1` — `feat(web): guest lobby presentation 적용`
- Thread 내 다음 관련 SHA: `fe0f3e0ad0ad` — `feat(web): guest play presentation 적용`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.7. `feat(web): guest play presentation 적용`

| 항목 | 값 |
| --- | --- |
| SHA | `fe0f3e0ad0ad` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | demo mode에서 지원하지 않는 match chat을 숨깁니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/play/page.tsx`의 `demoMode`와 `showMatchChat` 조건을 확인합니다.
- match chat aside/form 전체가 조건부 렌더링되는지 확인합니다.
- game controls/opponent/canvas는 guest에게 유지되는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | lobby와 navigation은 제한됐지만 play page의 match chat은 guest에게 계속 표시됐습니다. |
| 해결하려던 문제 | guest capability matrix에서 금지된 social interaction을 실제 match surface에도 적용해야 했습니다. |
| 핵심 결정 | play page가 central policy의 `showMatchChat`을 소비해 chat section 전체를 조건부 렌더링했습니다. |
| 입력 → 상태 전이 → 출력 | demo mode/policy flag → match chat DOM 포함 여부; 나머지 game UI는 동일하게 유지됩니다. |
| ownership/lifetime/cleanup | policy가 capability를, play page가 presentation을 소유합니다. |
| failure/rollback/retry | guest mode에서는 input/form/메시지 목록이 생성되지 않습니다. |
| 보장하는 것 | guest match chat을 browser UI에서 제공하지 않습니다. |
| 보장하지 않는 것 | server가 chat command를 별도로 거부하는지는 browser presentation이 증명하지 않습니다. |
| 후속 연결 | `9f49db1d9f1d`가 presentation flags를 test합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `658fafd43f88` — `feat(web): demo navigation 정책 연결`
- Thread 내 다음 관련 SHA: `618330916629` — `test(web): 비회원 체험 진입 흐름 검증`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.8. `test(web): 비회원 체험 진입 흐름 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `618330916629` |
| Importance | B |
| Tags | AUTH, WEB, TEST |
| Source에서 확정된 역할 | guest entry와 browser API boundary를 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/lib/api.test.ts`의 “starts a server-named guest session without profile input” case를 확인합니다.
- URL `/auth/guest`, method POST, `credentials: include`, body undefined, response schema result를 확인합니다.
- endpoint helper table에 `guestLogin`이 포함돼 malformed response parsing도 공유하는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | guest helper와 LoginPanel 연결은 있었지만 no-input/no-body/cookie/schema contract가 자동화되지 않았습니다. |
| 해결하려던 문제 | guest entry가 development login input이나 bearer token을 다시 요구하지 않는지 deterministic하게 고정해야 했습니다. |
| 핵심 결정 | mocked fetch로 guest response를 반환하고 production `guestLogin()`의 URL/init/result를 직접 검사했습니다. |
| 입력 → 상태 전이 → 출력 | helper call → POST no body + cookie credentials → schema parse → response equality assertion 순서입니다. |
| ownership/lifetime/cleanup | test가 fetch mock을 소유하고 adapter의 실제 request/parse path를 실행합니다. |
| failure/rollback/retry | body와 Authorization이 없고 cookie가 포함되며 malformed success는 endpoint table에서 거부됩니다. |
| 보장하는 것 | browser guest adapter의 entry contract를 증명합니다. |
| 보장하지 않는 것 | LoginPanel DOM, middleware, 실제 Set-Cookie/session 생성은 증명하지 않습니다. |
| 후속 연결 | `1abda1299ad8`이 실제 browser entry와 navigation을 최종 E2E로 검증합니다. |

#### Test 복원

| 항목 | 근거 |
| --- | --- |
| 검증 대상 production 불변식 | guest session은 profile input/body 없이 cookie-based POST와 runtime schema로 시작됩니다. |
| 재현한 실패/경계 | 잘못된 URL/method/body/credential 또는 malformed guest response입니다. |
| 테스트 기법 | mocked fetch와 endpoint table-driven parsing test입니다. |
| 증명하는 것 | browser API adapter의 deterministic request/response contract를 증명합니다. |
| 증명하지 않는 것 | 실제 server cookie 발급과 UI rendering은 증명하지 않습니다. |
| 검증 분류 | browser API boundary unit regression |

> 실행 상태: 이 workbook 작성 환경에서는 repository test command를 실행하지 않았습니다. 위 내용은 해당 SHA의 test source와 production path를 정적 조사해 복원한 것이며 pass 결과를 주장하지 않습니다.

#### 비교 기준

- Thread 내 직전 관련 SHA: `fe0f3e0ad0ad` — `feat(web): guest play presentation 적용`
- Thread 내 다음 관련 SHA: `9f49db1d9f1d` — `test(guest): 체험 기능 오용 방지 검증`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.9. `test(guest): 체험 기능 오용 방지 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `9f49db1d9f1d` |
| Importance | A |
| Tags | AUTH, WEB, RISK |
| Source에서 확정된 역할 | guest-mode abuse와 browser capability isolation의 negative boundary를 확장 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 Thread에서는 `apps/web/src/lib/demoPolicy.test.ts`와 `apps/api/src/env.test.ts`의 mode/secret/proxy case를 우선 조사합니다.
- `createNavigation(true/false)`, presentation flags, restricted path positive/negative case를 확인합니다.
- 같은 commit의 `GuestAccess`, `GameHub`, HTTP abuse tests는 server-side evidence이며 browser policy 보장과 구분해 기록합니다.
- strong secret과 explicit proxy trust가 false/true input에서 어떻게 test되는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | happy-path guest entry만으로는 registered menu 노출, persisted capability copy, direct path 허용, 약한 secret, unbounded ticket/resource 같은 오용을 배제할 수 없었습니다. |
| 해결하려던 문제 | guest mode는 public traffic 경계이므로 positive UI보다 negative capability/abuse matrix가 더 중요했습니다. |
| 핵심 결정 | browser policy pure tests와 server env/resource isolation tests를 한 regression commit에 추가했습니다. |
| 입력 → 상태 전이 → 출력 | mode/path/policy fixture 또는 controlled server resource → production function/service → allowed/blocked/count/expiry assertion 순서입니다. |
| ownership/lifetime/cleanup | browser policy test는 pure values를, server tests는 fake timers와 GuestAccess/GameHub resources를 소유합니다. 두 evidence layer를 혼동하지 않아야 합니다. |
| failure/rollback/retry | demo nav는 lobby/play만 남고 persisted/ranking/chat flags는 false이며 restricted path를 true로 판정합니다. server tests는 별도로 secret/ticket/lease/result bounds를 검증합니다. |
| 보장하는 것 | guest capability가 registered surface로 새지 않는 high-risk negative evidence를 제공합니다. |
| 보장하지 않는 것 | browser test 부분은 실제 middleware response나 UI DOM을 실행하지 않고, server-only test를 browser enforcement 증거로 사용할 수 없습니다. |
| 후속 연결 | `4f5199097284`가 lobby recovery/transient presentation을 추가하고 `06d2eb7a93cc`가 복구 경계를 확장합니다. |

#### A-level 불변식 종합

- **핵심 책임:** guest-mode abuse와 browser capability isolation의 negative boundary를 확장 검증합니다.
- **실패 영향:** guest mode는 public traffic 경계이므로 positive UI보다 negative capability/abuse matrix가 더 중요했습니다.
- **결과 불변식:** guest capability가 registered surface로 새지 않는 high-risk negative evidence를 제공합니다.
- **남은 제한:** browser test 부분은 실제 middleware response나 UI DOM을 실행하지 않고, server-only test를 browser enforcement 증거로 사용할 수 없습니다.

#### Test 복원

| 항목 | 근거 |
| --- | --- |
| 검증 대상 production 불변식 | demo mode는 제한된 browser capability만 노출하고 runtime 설정은 약한 trust configuration을 거부합니다. |
| 재현한 실패/경계 | registered nav/path 노출, persisted progress/chat copy, weak secret, proxy/ticket/resource abuse입니다. |
| 테스트 기법 | pure policy tests + server fake-timer/resource tests를 한 commit에서 분리 실행하도록 작성했습니다. |
| 증명하는 것 | policy matrix와 여러 high-risk negative branch를 증명합니다. |
| 증명하지 않는 것 | browser DOM/middleware E2E와 모든 server isolation을 하나의 end-to-end chain으로 증명하지 않습니다. |
| 검증 분류 | high-risk auth/capability negative regression |

> 실행 상태: 이 workbook 작성 환경에서는 repository test command를 실행하지 않았습니다. 위 내용은 해당 SHA의 test source와 production path를 정적 조사해 복원한 것이며 pass 결과를 주장하지 않습니다.

#### 핵심 코드 근거

| 항목 | 값 |
| --- | --- |
| SHA | `9f49db1d9f1d` |
| 파일 | `apps/web/src/lib/demoPolicy.test.ts` |
| 함수/위치 | `guest demo presentation policy` |
| 근거 요약 | demo navigation은 `lobby`, `play`만 반환하고 persisted progress, leaderboard, lobby/match chat flags는 모두 false이며 registered paths는 restricted로 판정합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `618330916629` — `test(web): 비회원 체험 진입 흐름 검증`
- Thread 내 다음 관련 SHA: `4f5199097284` — `fix(web): 중단된 game reconnect 복구`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.10. `fix(web): 중단된 game reconnect 복구`

| 항목 | 값 |
| --- | --- |
| SHA | `4f5199097284` |
| Importance | A |
| Tags | AUTH, REALTIME, WEB |
| Source에서 확정된 역할 | guest lobby에서 transient result를 명시하고 active room event를 회수하면 game screen으로 복귀합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 Thread에서는 `apps/web/src/app/page.tsx`와 `apps/web/src/lib/demoPolicy.ts`만 조사합니다. 같은 SHA의 client/reducer/hook reconnect는 Thread 04에서 다룹니다.
- `formatTransientResultNotice`가 `persisted: false`, score를 어떤 문구로 표시하는지 확인합니다.
- `shouldResumeGameFromLobby`가 `queue.matched`와 `game.snapshot`만 true인지 확인합니다.
- HomePage lobby socket handler가 resume event를 `/play` redirect보다 먼저 처리하고 transient finish는 notice로 표시하는지 확인합니다.
- upstream `eaa4fdaba361`의 guest result `persisted:false` contract를 later code로 역투영하지 말고 producer dependency로만 연결합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | guest가 game screen 밖에서 socket event를 회수할 때 active room을 놓치거나, 종료 결과를 일반 durable match처럼 해석할 수 있었습니다. transport close도 existing room을 재개하지 못했습니다. |
| 해결하려던 문제 | lobby는 active-room event를 새 matchmaking으로 처리하지 않고 game screen으로 복귀해야 하며 non-persisted result는 명시적으로 transient라고 알려야 했습니다. |
| 핵심 결정 | pure policy helpers를 추가하고 lobby socket handler가 queue/snapshot이면 `/play`로 이동하며 `game.finished`의 `persisted:false`면 score와 미저장 notice를 표시하도록 했습니다. |
| 입력 → 상태 전이 → 출력 | lobby server event → runtime parse → demo active-room predicate면 redirect; 아니면 transient finish predicate면 formatted notice; 그 밖의 lobby event는 기존 cache update 순서입니다. |
| ownership/lifetime/cleanup | demo policy가 event classification/wording을, HomePage가 navigation/notice side effect를 소유합니다. transport retry timer는 Thread 04의 client가 소유합니다. |
| failure/rollback/retry | 정책에 포함되지 않은 event는 기존 lobby 처리로 계속 전달되며 redirect/notice 자체의 실패에 별도 rollback은 없습니다. |
| 보장하는 것 | active room event를 lobby chat/presence로 처리하지 않고 즉시 game route로 되돌립니다. transient result는 rating/history를 암시하지 않습니다. |
| 보장하지 않는 것 | guest 결과가 실제로 DB에 저장되지 않는지는 upstream server commit이 보장하며 browser helper만으로 증명하지 않습니다. |
| 후속 연결 | `06d2eb7a93cc`가 formatting/resume predicate와 fresh-ticket reconnect를 검증하고 `1abda1299ad8`이 browser reconnect를 실행합니다. |

#### A-level 불변식 종합

- **핵심 책임:** guest lobby에서 transient result를 명시하고 active room event를 회수하면 game screen으로 복귀합니다.
- **실패 영향:** lobby는 active-room event를 새 matchmaking으로 처리하지 않고 game screen으로 복귀해야 하며 non-persisted result는 명시적으로 transient라고 알려야 했습니다.
- **결과 불변식:** active room event를 lobby chat/presence로 처리하지 않고 즉시 game route로 되돌립니다. transient result는 rating/history를 암시하지 않습니다.
- **남은 제한:** guest 결과가 실제로 DB에 저장되지 않는지는 upstream server commit이 보장하며 browser helper만으로 증명하지 않습니다.

#### Fix 복원

| 항목 | 근거 |
| --- | --- |
| 이전 가정 | lobby socket은 lobby event만 받고 finish 결과는 일반 match와 같은 presentation으로 처리할 수 있다고 봤습니다. |
| 실제 실패/위험 | 복구된 room을 놓치거나 transient guest result를 durable history로 오인합니다. |
| 근본 원인 | deployment capability와 cross-route realtime event를 분류하는 browser policy가 없었습니다. |
| 수정된 불변식 | active room event는 `/play` 복귀 신호이고 `persisted:false` finish는 명시적인 임시 결과 notice입니다. |
| 회귀 근거 | `06d2eb7a93cc`의 pure policy tests와 `1abda1299ad8`의 reconnect E2E입니다. |

#### 핵심 코드 근거

| 항목 | 값 |
| --- | --- |
| SHA | `4f5199097284` |
| 파일 | `apps/web/src/lib/demoPolicy.ts` |
| 함수/위치 | `formatTransientResultNotice / shouldResumeGameFromLobby` |
| 근거 요약 | non-persisted result는 “전적에 저장되지 않았습니다”로 표시하고 `queue.matched`/`game.snapshot`은 lobby에서 `/play`로 돌아갈 신호로 분류합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `9f49db1d9f1d` — `test(guest): 체험 기능 오용 방지 검증`
- Thread 내 다음 관련 SHA: `06d2eb7a93cc` — `test(guest): 체험 환경의 복구 경계 검증`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.11. `test(guest): 체험 환경의 복구 경계 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `06d2eb7a93cc` |
| Importance | A |
| Tags | AUTH, SIMULATION, REALTIME |
| Source에서 확정된 역할 | fresh-ticket reconnect, duplicate match 차단, transient result presentation을 확장 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/lib/demoPolicy.test.ts`의 transient notice와 lobby resume event case를 확인합니다.
- `apps/web/src/game/GameSocketClient.test.ts`가 close 후 fresh ticket으로 reconnect하고 original queue command를 보내지 않는지 확인합니다.
- `apps/web/src/game/gameConnection.test.ts`의 `canStartNewMatch` reconnecting/current-room negative case를 확인합니다.
- 같은 commit의 GuestAccess cleanup/env tests는 upstream `2b274686e6d4`를 검증하는 server evidence이며 browser guarantee와 구분합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | reconnect/presentation fix는 여러 cross-layer condition을 추가했지만 transient wording, active room redirect, no duplicate intent, timer cleanup을 직접 고정하지 않았습니다. |
| 해결하려던 문제 | guest recovery는 짧은 ticket, room state, lobby/game route, process memory가 함께 움직여 happy path만으로 안전성을 판단할 수 없었습니다. |
| 핵심 결정 | fake timers/fake sockets와 pure policy assertions를 추가해 reconnect와 browser presentation을 deterministic하게 재현했습니다. |
| 입력 → 상태 전이 → 출력 | initial connect/send → fake close → timer advance → second ticket/socket → no sent initial frame; policy input → exact result/boolean assertion 순서입니다. |
| ownership/lifetime/cleanup | test가 timers/socket doubles를 소유하고 cleanup 후 real timers로 복원합니다. server resource cases는 별도 owner의 cleanup을 검증합니다. |
| failure/rollback/retry | reconnect는 ticket provider를 다시 호출하고 second socket에 original queue command가 없으며 current room에서는 새 match predicate가 false입니다. transient notice와 resume event 분류도 고정됩니다. |
| 보장하는 것 | browser recovery와 presentation의 high-risk invariant를 deterministic하게 증명합니다. |
| 보장하지 않는 것 | 실제 browser route navigation, real network/ticket server, PvP/AI timing은 증명하지 않습니다. |
| 후속 연결 | `1abda1299ad8`이 실제 demo-mode browser entry, PvP, AI fallback, forced socket reconnect를 최종 통합 검증합니다. |

#### A-level 불변식 종합

- **핵심 책임:** fresh-ticket reconnect, duplicate match 차단, transient result presentation을 확장 검증합니다.
- **실패 영향:** guest recovery는 짧은 ticket, room state, lobby/game route, process memory가 함께 움직여 happy path만으로 안전성을 판단할 수 없었습니다.
- **결과 불변식:** browser recovery와 presentation의 high-risk invariant를 deterministic하게 증명합니다.
- **남은 제한:** 실제 browser route navigation, real network/ticket server, PvP/AI timing은 증명하지 않습니다.

#### Test 복원

| 항목 | 근거 |
| --- | --- |
| 검증 대상 production 불변식 | guest room recovery는 fresh ticket을 쓰되 original match intent를 반복하지 않고 transient result/route presentation이 명확합니다. |
| 재현한 실패/경계 | close/retry timer, duplicate queue command, reconnecting room의 새 match start, persisted:false wording, active-room lobby event입니다. |
| 테스트 기법 | fake timers, fake sockets, pure policy/reducer tests입니다. |
| 증명하는 것 | browser transport/policy branch를 deterministic하게 증명합니다. |
| 증명하지 않는 것 | 실제 deployment browser/network와 server resource isolation 전체는 증명하지 않습니다. |
| 검증 분류 | high-risk recovery deterministic regression |

> 실행 상태: 이 workbook 작성 환경에서는 repository test command를 실행하지 않았습니다. 위 내용은 해당 SHA의 test source와 production path를 정적 조사해 복원한 것이며 pass 결과를 주장하지 않습니다.

#### 비교 기준

- Thread 내 직전 관련 SHA: `4f5199097284` — `fix(web): 중단된 game reconnect 복구`
- Thread 내 다음 관련 SHA: `1abda1299ad8` — `test(e2e): 비회원 체험 브라우저 흐름 검증`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.12. `test(e2e): 비회원 체험 브라우저 흐름 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `1abda1299ad8` |
| Importance | A |
| Tags | AUTH, REALTIME, WEB |
| Source에서 확정된 역할 | demo-mode guest entry, restricted navigation, two-browser PvP, 6초 AI fallback, ticket-based reconnect를 Playwright로 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `package.json`의 `e2e:guest-demo` command와 `E2E_APP_MODE=demo`, single worker 조건을 확인합니다.
- `tests/e2e/guest-demo.spec.ts`의 `enterAsGuest`, two isolated contexts, frame watcher, `routeWebSocket` forced close를 확인합니다.
- guest name regex, navigation link text, hidden admin, PvP ready/playing, AI fallback 5.5~10초, reconnecting→playing assertion을 확인합니다.
- test skip 조건이 demo mode/chromium desktop에 어떻게 제한되는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | unit/policy tests는 실제 Next middleware, cookie session, 두 browser matching, elapsed-time fallback, forced network interruption을 한 흐름에서 실행하지 않았습니다. |
| 해결하려던 문제 | public demo의 핵심 약속을 실제 browser와 running services에서 통합 검증할 최종 evidence가 필요했습니다. |
| 핵심 결정 | demo 전용 Playwright suite를 만들고 isolated browser contexts, WebSocket frame timestamp 관찰, routeWebSocket forced close를 사용했습니다. |
| 입력 → 상태 전이 → 출력 | guest button → server-named cookie session → restricted nav; 두 contexts → queue/ready/PvP; single guest queue → sent/received frame time delta → AI; active game → routed socket close → second connection → playing 복귀 순서입니다. |
| ownership/lifetime/cleanup | Playwright context가 guest cookie isolation을, test route가 socket interception을, running app/server가 실제 lifecycle을 소유합니다. finally에서 contexts를 닫습니다. |
| failure/rollback/retry | suite는 demo mode가 아니면 skip하고 time/reconnect scenarios는 desktop project에서 한 번만 실행합니다. reconnect는 connection count와 UI state로 확인합니다. |
| 보장하는 것 | guest browser의 핵심 entry/capability/matchmaking/recovery를 broad end-to-end로 증명하도록 작성됐습니다. |
| 보장하지 않는 것 | 이 작업 환경에서는 suite를 실제 실행하지 못했으므로 문서에 pass 결과를 기록하지 않습니다. DB non-persistence나 장시간 부하 한계도 이 E2E만으로는 증명하지 않습니다. |
| 후속 연결 | 이 commit이 Thread의 최종 통합 evidence이며 단위 test의 policy/transport 보장을 실제 UI 흐름과 연결합니다. |

#### A-level 불변식 종합

- **핵심 책임:** demo-mode guest entry, restricted navigation, two-browser PvP, 6초 AI fallback, ticket-based reconnect를 Playwright로 검증합니다.
- **실패 영향:** public demo의 핵심 약속을 실제 browser와 running services에서 통합 검증할 최종 evidence가 필요했습니다.
- **결과 불변식:** guest browser의 핵심 entry/capability/matchmaking/recovery를 broad end-to-end로 증명하도록 작성됐습니다.
- **남은 제한:** 이 작업 환경에서는 suite를 실제 실행하지 못했으므로 문서에 pass 결과를 기록하지 않습니다. DB non-persistence나 장시간 부하 한계도 이 E2E만으로는 증명하지 않습니다.

#### Test 복원

| 항목 | 근거 |
| --- | --- |
| 검증 대상 production 불변식 | demo guest가 입력 없이 진입하고 제한된 메뉴만 보며 PvP/AI/reconnect를 사용할 수 있습니다. |
| 재현한 실패/경계 | cookie/session entry, two-browser isolation, 6초 AI fallback, forced WebSocket close와 fresh reconnect입니다. |
| 테스트 기법 | Playwright serial suite, isolated contexts, WebSocket frame timestamp, `routeWebSocket` interception입니다. |
| 증명하는 것 | 작성된 scenario가 실제 running browser/service boundary를 통과할 때의 end-to-end contract를 검증하도록 구성됐음을 code inspection으로 확인했습니다. |
| 증명하지 않는 것 | 이번 workbook 환경에서 test가 pass했다는 runtime evidence, DB non-persistence, sustained load는 증명하지 않습니다. |
| 검증 분류 | demo-mode browser end-to-end regression |

> 실행 상태: 이 workbook 작성 환경에서는 repository test command를 실행하지 않았습니다. 위 내용은 해당 SHA의 test source와 production path를 정적 조사해 복원한 것이며 pass 결과를 주장하지 않습니다.

#### 핵심 코드 근거

| 항목 | 값 |
| --- | --- |
| SHA | `1abda1299ad8` |
| 파일 | `tests/e2e/guest-demo.spec.ts` |
| 함수/위치 | `guest demo browser flow` |
| 근거 요약 | 두 browser context의 PvP, queue frame 시점으로 측정한 6초 AI fallback, routed WebSocket 강제 종료 뒤 두 번째 연결과 playing 복귀를 검증하도록 작성됐습니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `06d2eb7a93cc` — `test(guest): 체험 환경의 복구 경계 검증`
- 이 SHA가 이 Thread의 마지막 고정 commit입니다.
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

## 6. 불변식 발전 기록

| 단계 | 관련 SHA | 학습 기록 |
| --- | --- | --- |
| runtime mode/secret 경계 | `f801ccd09cf0` | demo capability와 fail-closed secret/proxy 설정이 명시됐습니다. |
| browser policy 도입 | `e39316254e44` → `a9fc8a8328b2` | navigation/presentation/restricted path와 guest adapter/middleware가 정의됐습니다. |
| UI capability 적용 | `7fdef5d224c4` → `fe0f3e0ad0ad` | guest login, lobby, shell, play가 중앙 policy를 소비합니다. |
| entry/abuse evidence | `618330916629` → `9f49db1d9f1d` | API entry와 negative capability/secret/resource boundary를 검증합니다. |
| transient/recovery 교정 | `4f5199097284` | active room 복귀와 non-persisted result notice, transport reconnect가 같은 cross-cutting fix에서 연결됐습니다. |
| recovery regression | `06d2eb7a93cc` | fresh ticket/no duplicate intent/policy formatting을 deterministic하게 고정했습니다. |
| browser E2E | `1abda1299ad8` | entry, restricted nav, PvP, AI fallback, reconnect scenario를 running-system test로 작성했습니다. |

## 7. Failure → Fix → Test 관계

| 이전 상태/가정 | 실패 또는 위험 | Fix 연결 | Test/후속 근거 | 관계 해설 |
| --- | --- | --- | --- | --- |
| mode가 implicit/weak secret 허용 | guest identity와 rate-limit trust 약화 | `f801ccd09cf0` | `9f49db1d9f1d`, `06d2eb7a93cc` env tests | mode가 implicit/weak secret 허용 → guest identity와 rate-limit trust 약화 → `f801ccd09cf0` → `9f49db1d9f1d`, `06d2eb7a93cc` env tests |
| central policy 미적용 | registered capability가 guest UI에 노출 | `584d17f3aad1`, `658fafd43f88`, `fe0f3e0ad0ad` | `9f49db1d9f1d`, `1abda1299ad8` | central policy 미적용 → registered capability가 guest UI에 노출 → `584d17f3aad1`, `658fafd43f88`, `fe0f3e0ad0ad` → `9f49db1d9f1d`, `1abda1299ad8` |
| lobby에서 active room/transient result 미분류 | room 상실 또는 durable 결과 오인 | `4f5199097284` | `06d2eb7a93cc`, `1abda1299ad8` | lobby에서 active room/transient result 미분류 → room 상실 또는 durable 결과 오인 → `4f5199097284` → `06d2eb7a93cc`, `1abda1299ad8` |
| remote close 후 initial command 재전송 가능 | duplicate matchmaking intent | Thread 04 범위의 `4f5199097284` | `06d2eb7a93cc`, `1abda1299ad8` | remote close 후 initial command 재전송 가능 → duplicate matchmaking intent → Thread 04 범위의 `4f5199097284` → `06d2eb7a93cc`, `1abda1299ad8` |

## 8. Ownership·state·lifetime 변화

| 대상 | 이전 owner/state | 이후 owner/state | 수명/cleanup |
| --- | --- | --- | --- |
| deployment capability | 암묵적 env | validated APP_MODE + public browser mode | process/build 수명 |
| browser capability matrix | component별 조건 가능 | `demoPolicy.ts` | application build/runtime 수명 |
| direct route presentation | navigation 숨김만 | Next middleware restricted path | request 수명 |
| guest identity entry | development form inputs | server-named guest response + cookie session | 2시간 guest session(서버 계약) |
| transient result presentation | 일반 finish와 미분리 | demo policy formatter + HomePage notice | result notice 수명 |
| active room recovery navigation | lobby에 머무름 | lobby event predicate + `/play` redirect | socket event 처리 순간 |
| reconnect transport | 재연결 없음/intent 재사용 | `GameSocketClient` fresh ticket/backoff | 15초 reconnect window |

## 9. Thread 최종 상태

마지막 SHA에서 demo browser는 입력 없이 server-named guest session에 진입하고 lobby/play만 navigation으로 노출합니다. middleware는 registered-only direct URL을 404로 차단하고 lobby/play는 durable progress·ranking·chat을 광고하지 않습니다. lobby에서 active room event를 회수하면 `/play`로 복귀하며 non-persisted result는 전적 미저장 임시 결과로 표시됩니다. transport는 fresh ticket으로 bounded reconnect하되 original match intent를 반복하지 않습니다.

### 최종 실행 흐름

1. deployment가 validated `APP_MODE=demo`와 matching public browser mode로 시작합니다.
2. LoginPanel은 profile inputs 없이 `guestLogin()`을 호출하고 cookie session의 server-named user를 `me` cache에 넣습니다.
3. `AppShell`은 `createNavigation(true, ...)` 결과인 lobby/play만 렌더링하고 middleware는 restricted direct path를 404 처리합니다.
4. HomePage/PlayPage는 presentation flags로 persisted progress, ranking, lobby/match chat을 숨기고 결과 미저장을 명시합니다.
5. lobby socket에서 `queue.matched`/`game.snapshot`을 받으면 `/play`로 이동하고 `persisted:false game.finished`는 transient notice로 표시합니다.
6. game socket close 시 client는 fresh ticket으로 bounded reconnect하며 original queue command를 다시 보내지 않습니다.
7. unit/policy tests가 negative/recovery branches를, Playwright suite가 entry/PvP/AI/reconnect browser flow를 검증하도록 구성됩니다.

## 10. 학습 완료 점검

- [x] 모든 commit을 지정 SHA의 parent/diff와 비교했습니다.
- [x] 후속 HEAD 코드를 이전 SHA 설명에 역투영하지 않았습니다.
- [x] owner, lifetime, cleanup, failure branch와 non-guarantee를 기록했습니다.
- [x] fix는 이전 가정과 root cause에, test는 production path와 증명 범위에 연결했습니다.
- [x] A/B importance 깊이를 구분했고 source subject/tag/role을 유지했습니다.
- [x] 실행하지 않은 project test에 pass 결과를 만들지 않았습니다.
