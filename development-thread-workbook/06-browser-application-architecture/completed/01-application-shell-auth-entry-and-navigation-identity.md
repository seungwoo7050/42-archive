# Application shell·auth entry·navigation identity

- 카테고리: `06-browser-application-architecture` — 브라우저 애플리케이션 아키텍처
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

Next.js browser runtime, 공통 layout/navigation, 개발 로그인 진입을 구성하고 현재 사용자 식별이 끝나기 전에는 잘못된 profile target을 노출하지 않도록 navigation identity를 안정화하는 과정을 복원합니다.

### 직접 연결되는 불변식

- `RootLayout`은 문서 metadata와 global style을, `AppShell`은 공통 navigation/layout을, route page는 인증 분기와 화면별 상태를 소유합니다.
- navigation item identity는 URL 변화와 분리된 논리적 `id`를 사용합니다.
- 현재 사용자를 알기 전 profile 항목은 `/` 같은 대체 URL로 이동하지 않습니다.

## 2. 핵심 질문

- Next.js runtime과 shared package 소비 경계는 어떤 설정 파일에서 확정됩니까?
- `RootLayout`, `AppShell`, `HomePage`, `LoginPanel`의 책임과 상태 수명은 어떻게 나뉩니까?
- session 해석 전후 profile URL 변경이 active state와 React key에 어떤 영향을 줍니까?
- 초기 E2E가 실제 API 성공과 sample fallback을 구분하지 못하는 범위는 무엇입니까?

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
| 1 | `f5c151c7cc7d` | `chore(web): Next.js runtime 경계 구성` | B | PROTOCOL, PERSISTENCE, WEB | web workspace를 Next.js application과 shared package 소비 경계로 구성합니다. |
| 2 | `4071b935cb24` | `chore(web): Tailwind style build 구성` | B | WEB | Tailwind/PostCSS source scan과 style processing 경계를 구성합니다. |
| 3 | `ce174d6b3633` | `feat(web): 한국어 로비 shell 초기화` | B | REALTIME, WEB | 한국어 metadata, design token, base style, focus-visible을 갖는 App Router shell을 만듭니다. |
| 4 | `77f35c72cd7b` | `feat(web): 공통 내비게이션 프레임 구현` | B | WEB, OPERATIONS | responsive sidebar, active route, content width를 `AppShell`이 소유합니다. |
| 5 | `f27199fdcd34` | `feat(web): 개발용 로그인 패널 추가` | B | AUTH, WEB | 개발 로그인 입력과 mutation 상태를 `LoginPanel`에 추가합니다. |
| 6 | `52ddc3acfcce` | `feat(web): 로비 인증 진입 연결` | B | AUTH, WEB | home route가 current session에 따라 LoginPanel과 authenticated lobby를 분기합니다. |
| 7 | `d755b8dae2c1` | `test(e2e): 한국어 내비게이션과 캔버스 흐름 구성` | B | PERSISTENCE, TOURNAMENT, WEB | Playwright desktop/mobile browser 검증 경계를 구성합니다. |
| 8 | `ec000bed0414` | `build(web): production start와 TS cache 정책 구성` | B | WEB | web application에 production start와 package-local test command를 추가하고 type-check cache 생성을 끕니다. |
| 9 | `34eccd6c7150` | `feat(profile): 현재 프로필과 공유 기능 연결` | B | WEB | 현재 session을 읽어 profile navigation target과 profile 공유 기능을 연결합니다. |
| 10 | `a56a4dee9219` | `fix(web): 안정적인 navigation key 사용` | B | WEB | 현재 URL 대신 stable logical ID를 React key로 사용합니다. |
| 11 | `bc8d023b2999` | `fix(web): profile link 전 사용자 식별 대기` | B | WEB | current user가 resolve되기 전에 잘못된 profile link를 만들지 않습니다. |

## 5. Commit별 학습 기록

### 5.1. `chore(web): Next.js runtime 경계 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `f5c151c7cc7d` |
| Importance | B |
| Tags | PROTOCOL, PERSISTENCE, WEB |
| Source에서 확정된 역할 | web workspace를 Next.js application과 shared package 소비 경계로 구성합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/package.json`의 `dev`, `build`, `typecheck` script와 dependency를 확인합니다.
- `apps/web/next.config.mjs`의 `transpilePackages`와 `apps/web/tsconfig.json`의 path alias를 확인합니다.
- `next-env.d.ts` 외에 아직 route, production start, package-local test가 없는지 parent와 비교합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | web workspace가 실행 가능한 Next.js 애플리케이션으로 정의되지 않았고 shared package를 browser build가 소비하는 규칙도 없었습니다. |
| 해결하려던 문제 | 브라우저 코드를 둘 위치는 있었지만 개발 서버, production build, type-check, shared contract transpilation의 실행 경계가 없었습니다. |
| 핵심 결정 | `@pong-pong/web` package를 만들고 Next.js/React/TypeScript 설정을 묶었으며 `@pong-pong/shared`를 transpilation 대상으로 지정했습니다. |
| 입력 → 상태 전이 → 출력 | workspace command가 web package script를 호출하고 Next.js가 `src`와 shared package를 TypeScript 설정에 따라 compile합니다. |
| ownership/lifetime/cleanup | package script와 framework config가 build 책임을 소유합니다. 이 SHA에는 component resource나 teardown 대상이 없습니다. |
| failure/rollback/retry | 잘못된 설정은 build/type-check 단계에서 실패하지만 이 commit 자체에는 route나 runtime test가 없어 실제 화면 동작은 검증하지 않습니다. |
| 보장하는 것 | web application을 독립적으로 개발·build·type-check할 최소 runtime boundary를 보장합니다. |
| 보장하지 않는 것 | route, global style, production `start`, browser test, API 연결은 아직 보장하지 않습니다. |
| 후속 연결 | `4071b935cb24`가 style processing을, `ce174d6b3633`이 첫 App Router shell을 추가합니다. |

#### 비교 기준

- 이 commit의 parent를 `git show f5c151c7cc7d^` 및 `git diff f5c151c7cc7d^ f5c151c7cc7d`로 비교합니다.
- Thread 내 다음 관련 SHA: `4071b935cb24` — `chore(web): Tailwind style build 구성`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.2. `chore(web): Tailwind style build 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `4071b935cb24` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | Tailwind/PostCSS source scan과 style processing 경계를 구성합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/postcss.config.mjs`의 Tailwind/Autoprefixer plugin 순서를 확인합니다.
- `apps/web/tailwind.config.ts`의 `content` glob이 `src/**/*.ts(x)`만 조사하는지 확인합니다.
- theme extension의 color/shadow token이 이후 global CSS와 component class에서 어떻게 소비되는지 추적합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | Next.js build는 존재했지만 utility class를 CSS로 변환하고 실제 source 사용량을 수집하는 설정이 없었습니다. |
| 해결하려던 문제 | TSX에서 작성할 class가 production CSS에 포함될 근거가 필요했습니다. |
| 핵심 결정 | PostCSS에 Tailwind와 Autoprefixer를 연결하고 web `src` 트리만 scan하도록 제한했습니다. |
| 입력 → 상태 전이 → 출력 | TS/TSX source의 class token이 Tailwind scan 대상이 되고 PostCSS가 build 시 CSS를 생성합니다. |
| ownership/lifetime/cleanup | style build 설정이 source scan 범위를 소유합니다. runtime state나 cleanup은 없습니다. |
| failure/rollback/retry | glob 밖 파일의 class는 수집되지 않습니다. 이 commit은 접근성이나 실제 layout을 검증하지 않습니다. |
| 보장하는 것 | web source에서 사용하는 utility class와 project token을 build 결과에 포함할 수 있습니다. |
| 보장하지 않는 것 | 첫 화면, global reset, focus style은 아직 없습니다. |
| 후속 연결 | `ce174d6b3633`이 이 pipeline을 사용하는 global CSS와 layout을 추가합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `f5c151c7cc7d` — `chore(web): Next.js runtime 경계 구성`
- Thread 내 다음 관련 SHA: `ce174d6b3633` — `feat(web): 한국어 로비 shell 초기화`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.3. `feat(web): 한국어 로비 shell 초기화`

| 항목 | 값 |
| --- | --- |
| SHA | `ce174d6b3633` |
| Importance | B |
| Tags | REALTIME, WEB |
| Source에서 확정된 역할 | 한국어 metadata, design token, base style, focus-visible을 갖는 App Router shell을 만듭니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/layout.tsx`의 `metadata`, `<html lang="ko">`, global CSS import를 확인합니다.
- `apps/web/src/app/globals.css`의 CSS variable, base element, `.card`, `.focus-ring` 규칙을 확인합니다.
- `apps/web/src/app/page.tsx`가 정적 shell만 렌더링하며 인증·server state를 아직 소유하지 않는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | framework와 style build는 있었지만 browser document, root layout, visible route가 없었습니다. |
| 해결하려던 문제 | 한국어 문서와 모든 route가 공유할 기본 시각·focus 규칙이 필요했습니다. |
| 핵심 결정 | `RootLayout`에 metadata와 `lang="ko"`를 두고 global tokens/base style을 한 번 import했습니다. |
| 입력 → 상태 전이 → 출력 | App Router가 root layout을 통해 document shell을 만들고 정적 `HomePage`를 children으로 렌더링합니다. |
| ownership/lifetime/cleanup | layout은 document-level metadata/style 수명을 소유하고 page는 route markup만 소유합니다. |
| failure/rollback/retry | CSS variable이나 class 오류는 compile/runtime styling 문제로 드러나지만 데이터 failure branch는 아직 없습니다. |
| 보장하는 것 | 모든 route가 한국어 document와 동일한 global visual/focus baseline을 공유합니다. |
| 보장하지 않는 것 | navigation, authenticated session, responsive application frame은 보장하지 않습니다. |
| 후속 연결 | `77f35c72cd7b`가 공통 navigation frame을 별도 component로 분리합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `4071b935cb24` — `chore(web): Tailwind style build 구성`
- Thread 내 다음 관련 SHA: `77f35c72cd7b` — `feat(web): 공통 내비게이션 프레임 구현`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.4. `feat(web): 공통 내비게이션 프레임 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `77f35c72cd7b` |
| Importance | B |
| Tags | WEB, OPERATIONS |
| Source에서 확정된 역할 | responsive sidebar, active route, content width를 `AppShell`이 소유합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/components/AppShell.tsx`의 nav 배열, `usePathname`, active 판정, responsive markup을 확인합니다.
- 초기 profile href가 `/profile/tester`로 고정되어 있는지 확인합니다.
- sidebar의 “서버 준비 완료” 표현이 실제 health signal을 읽는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 각 route가 공통 navigation과 content width를 반복해야 하는 상태였습니다. |
| 해결하려던 문제 | responsive application frame과 active route 표시는 한 component가 일관되게 소유해야 했습니다. |
| 핵심 결정 | `AppShell`을 client component로 만들고 고정 nav 목록, pathname 기반 active 판정, desktop sidebar/mobile header를 구현했습니다. |
| 입력 → 상태 전이 → 출력 | `usePathname()` 결과와 각 item의 `href`/prefix를 비교해 class를 선택하고 children을 공통 main 영역에 렌더링합니다. |
| ownership/lifetime/cleanup | `AppShell`이 navigation definition과 responsive presentation을 소유합니다. profile target과 상태 문구도 당시에는 shell 내부 상수였습니다. |
| failure/rollback/retry | pathname prefix 판정은 동작하지만 fixed tester profile과 근거 없는 server-ready 문구를 그대로 표시합니다. |
| 보장하는 것 | route 간 공통 shell과 active navigation을 제공합니다. |
| 보장하지 않는 것 | 실제 current user identity나 server readiness와 일치한다는 보장은 없습니다. |
| 후속 연결 | `34eccd6c7150`, `a56a4dee9219`, `bc8d023b2999`가 profile target과 item identity를 단계적으로 바로잡습니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `ce174d6b3633` — `feat(web): 한국어 로비 shell 초기화`
- Thread 내 다음 관련 SHA: `f27199fdcd34` — `feat(web): 개발용 로그인 패널 추가`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.5. `feat(web): 개발용 로그인 패널 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `f27199fdcd34` |
| Importance | B |
| Tags | AUTH, WEB |
| Source에서 확정된 역할 | 개발 로그인 입력과 mutation 상태를 `LoginPanel`에 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/components/LoginPanel.tsx`의 controlled `handle`, `displayName`, error state를 확인합니다.
- `devLogin` 호출 성공 시 parent callback으로 어떤 `SessionUser`를 전달하는지 확인합니다.
- pending 중 중복 제출 방지와 error message의 정보 범위를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 초기 home route는 정적이며 인증된 사용자로 진입할 UI가 없었습니다. |
| 해결하려던 문제 | 개발 환경에서 browser가 인증 endpoint를 호출하고 성공 사용자 정보를 상위 화면에 전달할 진입점이 필요했습니다. |
| 핵심 결정 | 두 입력을 component local state로 관리하고 `devLogin` 성공 결과를 callback으로 넘겼습니다. |
| 입력 → 상태 전이 → 출력 | 사용자 click → async `devLogin(handle, displayName)` → 성공 시 parent callback, 실패 시 local error 표시 순서입니다. |
| ownership/lifetime/cleanup | 입력·pending·error는 panel instance가 소유합니다. component unmount 뒤 request 취소는 구현하지 않았습니다. |
| failure/rollback/retry | 실패는 하나의 일반 문구로 표시하며 structured error나 abort를 구분하지 않습니다. |
| 보장하는 것 | 개발 로그인 intent를 typed API helper에 연결합니다. |
| 보장하지 않는 것 | session 복원, cookie 정책, route 보호는 보장하지 않습니다. |
| 후속 연결 | `52ddc3acfcce`가 home route의 인증 분기와 연결합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `77f35c72cd7b` — `feat(web): 공통 내비게이션 프레임 구현`
- Thread 내 다음 관련 SHA: `52ddc3acfcce` — `feat(web): 로비 인증 진입 연결`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.6. `feat(web): 로비 인증 진입 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `52ddc3acfcce` |
| Importance | B |
| Tags | AUTH, WEB |
| Source에서 확정된 역할 | home route가 current session에 따라 LoginPanel과 authenticated lobby를 분기합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/page.tsx`의 `getMe`/`getLobby` effect와 `me`, players, chat state 초기값을 확인합니다.
- login callback이 current user와 lobby reload를 어떤 순서로 수행하는지 확인합니다.
- request 실패 뒤 sample 초기값이 성공 화면으로 남는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 로그인 panel과 shell은 있었지만 home route가 현재 session을 해석하거나 authenticated 화면으로 전환하지 않았습니다. |
| 해결하려던 문제 | 새로고침과 로그인 성공 모두에서 current user를 판별하고 로비 데이터를 가져와야 했습니다. |
| 핵심 결정 | `HomePage`를 client component로 전환하고 mount effect에서 `getMe`와 `getLobby`를 호출해 인증 분기를 만들었습니다. |
| 입력 → 상태 전이 → 출력 | mount → session/lobby load → `me`가 없으면 `LoginPanel`, 있으면 shell 내부 authenticated content를 렌더링합니다. |
| ownership/lifetime/cleanup | page가 session 및 lobby read state를 직접 소유합니다. effect cancellation이나 generation guard는 없습니다. |
| failure/rollback/retry | 요청 실패를 catch하지만 sample players/chat 초기값을 비우지 않아 server failure가 정상 데이터처럼 보일 수 있습니다. |
| 보장하는 것 | home route가 인증 여부에 따라 진입 UI를 전환합니다. |
| 보장하지 않는 것 | 실패와 실제 sample 성공을 구별하거나 stale effect update를 막지는 않습니다. |
| 후속 연결 | `be31566ac0fd`가 sample fallback을 제거하고, 이후 query Thread가 effect ownership을 cache로 옮깁니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `f27199fdcd34` — `feat(web): 개발용 로그인 패널 추가`
- Thread 내 다음 관련 SHA: `d755b8dae2c1` — `test(e2e): 한국어 내비게이션과 캔버스 흐름 구성`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.7. `test(e2e): 한국어 내비게이션과 캔버스 흐름 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `d755b8dae2c1` |
| Importance | B |
| Tags | PERSISTENCE, TOURNAMENT, WEB |
| Source에서 확정된 역할 | Playwright desktop/mobile browser 검증 경계를 구성합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `playwright.config.ts`의 desktop/mobile project, base URL, trace/screenshot 조건을 확인합니다.
- `tests/e2e`에서 로그인 후 한국어 navigation과 route heading을 어떤 locator로 검증하는지 확인합니다.
- canvas pixel alpha 검사와 server/API 성공 여부의 관계를 구분합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | browser route와 canvas는 있었지만 실제 브라우저에서 navigation·responsive surface를 검증하는 suite가 없었습니다. |
| 해결하려던 문제 | 정적 markup을 넘어 사용자 진입, 한국어 메뉴, canvas drawing이 browser에서 존재하는지 확인할 필요가 있었습니다. |
| 핵심 결정 | Playwright runner와 desktop/mobile Chromium project를 추가하고 route 이동 및 canvas non-empty pixel을 검사했습니다. |
| 입력 → 상태 전이 → 출력 | test가 page를 열고 login UI를 조작한 뒤 navigation link를 따라가며 heading과 canvas pixel buffer를 관찰합니다. |
| ownership/lifetime/cleanup | Playwright context/page가 browser resource를 소유하고 runner가 test 종료 시 정리합니다. |
| failure/rollback/retry | failure trace/screenshot은 남기지만 app의 sample fallback 때문에 API 실패가 성공처럼 보이는 경우까지 배제하지 못합니다. |
| 보장하는 것 | 한국어 navigation과 canvas가 실제 browser DOM/canvas에서 작동하는 넓은 E2E 증거를 제공합니다. |
| 보장하지 않는 것 | server data의 진실성, 모든 route action, network failure branch는 증명하지 않습니다. |
| 후속 연결 | `8b2679d9e190`이 action 범위를 넓히고 `be31566ac0fd`가 sample-success 허점을 닫습니다. |

#### Test 복원

| 항목 | 근거 |
| --- | --- |
| 검증 대상 production 불변식 | 한국어 application shell과 canvas route가 browser에서 접근·렌더링됩니다. |
| 재현한 실패/경계 | route가 누락되거나 menu locator가 바뀌거나 canvas가 실제로 그려지지 않는 경우입니다. |
| 테스트 기법 | Playwright desktop/mobile navigation과 canvas pixel alpha 검사입니다. |
| 증명하는 것 | DOM navigation, route heading, canvas non-empty drawing의 broad integration을 증명합니다. |
| 증명하지 않는 것 | API가 실제 server data를 반환했는지, sample fallback이 개입하지 않았는지는 증명하지 않습니다. |
| 검증 분류 | 브라우저 통합·시각 surface smoke evidence |

> 실행 상태: 이 workbook 작성 환경에서는 repository test command를 실행하지 않았습니다. 위 내용은 해당 SHA의 test source와 production path를 정적 조사해 복원한 것이며 pass 결과를 주장하지 않습니다.

#### 비교 기준

- Thread 내 직전 관련 SHA: `52ddc3acfcce` — `feat(web): 로비 인증 진입 연결`
- Thread 내 다음 관련 SHA: `ec000bed0414` — `build(web): production start와 TS cache 정책 구성`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.8. `build(web): production start와 TS cache 정책 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `ec000bed0414` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | web application에 production start와 package-local test command를 추가하고 type-check cache 생성을 끕니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/package.json`의 `start`, `test` script가 추가되고 기존 `dev`/`build`/`typecheck`와 어떻게 구분되는지 확인합니다.
- `apps/web/tsconfig.json`의 `incremental: false`가 type-check 뒤 `.tsbuildinfo`를 남기지 않게 하는지 확인합니다.
- `next start --hostname 0.0.0.0 --port 3000`이 container/runtime에서 외부 interface에 bind하는 production 실행 계약인지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 초기 web package는 개발 서버·build·type-check만 제공했고 production build를 실제로 serve하는 `start`와 workspace test command가 없었습니다. |
| 해결하려던 문제 | Compose/production runtime이 build 결과를 일정한 package script로 실행하고 root test orchestration이 web package를 건너뛰지 않게 해야 했습니다. |
| 핵심 결정 | `start`를 Next production server로, `test`를 no-test 상태도 정상인 Vitest command로 정의하고 incremental TypeScript cache 생성을 비활성화했습니다. |
| 입력 → 상태 전이 → 출력 | workspace/runtime command → web package `start` → Next build artifact serving; root test → package `test`; type-check → no emit/no incremental cache 순서입니다. |
| ownership/lifetime/cleanup | package scripts가 production process command를 소유합니다. 이 SHA는 process shutdown이나 artifact contents를 직접 검증하지 않습니다. |
| failure/rollback/retry | build artifact가 없으면 `next start`가 실패하고 test file이 생기면 Vitest가 이를 실행합니다. `--passWithNoTests`는 test 부재를 실패로 보지 않습니다. |
| 보장하는 것 | web package가 개발·build·production serve·type-check·test에 필요한 명시적 command surface를 갖습니다. |
| 보장하지 않는 것 | production artifact 완전성, container routing, browser behavior 자체는 보장하지 않습니다. |
| 후속 연결 | 이후 application shell/navigation 수정은 이 runtime command surface 위에서 계속됩니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `d755b8dae2c1` — `test(e2e): 한국어 내비게이션과 캔버스 흐름 구성`
- Thread 내 다음 관련 SHA: `34eccd6c7150` — `feat(profile): 현재 프로필과 공유 기능 연결`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.9. `feat(profile): 현재 프로필과 공유 기능 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `34eccd6c7150` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | 현재 session을 읽어 profile navigation target과 profile 공유 기능을 연결합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `AppShell`의 `getMe` effect, `profileHref`, profile `matchPrefix`를 확인합니다.
- profile page의 clipboard API 호출과 성공/실패 notice를 확인합니다.
- session 해석 전 profile href가 무엇으로 설정되는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | shell의 profile link는 고정 tester handle을 가리켰고 profile 공유 버튼도 실제 browser API와 연결되지 않았습니다. |
| 해결하려던 문제 | 현재 로그인한 사용자에 맞는 profile target과 URL 복사 동작이 필요했습니다. |
| 핵심 결정 | `AppShell`이 `getMe`를 호출해 profile URL을 만들고 profile route는 `navigator.clipboard.writeText`를 사용했습니다. |
| 입력 → 상태 전이 → 출력 | shell mount → current session load → `profileHref` 계산; share click → current URL write → notice 갱신 순서입니다. |
| ownership/lifetime/cleanup | shell이 session lookup state를 직접 소유하고 profile page가 clipboard feedback을 소유합니다. |
| failure/rollback/retry | session 해석 전에는 profile href가 `/`로 대체되어 잘못된 navigation 가능성이 남고 clipboard failure는 notice로만 처리합니다. |
| 보장하는 것 | 고정 tester link를 current user handle 기반 link로 바꿉니다. |
| 보장하지 않는 것 | session 해석 전 안전한 disabled 상태와 stable key는 아직 보장하지 않습니다. |
| 후속 연결 | `a56a4dee9219`가 key를 안정화하고 `bc8d023b2999`가 unresolved profile navigation을 막습니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `ec000bed0414` — `build(web): production start와 TS cache 정책 구성`
- Thread 내 다음 관련 SHA: `a56a4dee9219` — `fix(web): 안정적인 navigation key 사용`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.10. `fix(web): 안정적인 navigation key 사용`

| 항목 | 값 |
| --- | --- |
| SHA | `a56a4dee9219` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | 현재 URL 대신 stable logical ID를 React key로 사용합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `AppShell` nav item에 추가된 `id`와 `.map()`의 `key` 변경을 확인합니다.
- session resolve 전후 profile `href` 변경과 component identity의 관계를 비교합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | nav item key가 `href`였으므로 profile URL이 `/`에서 `/profile/<handle>`로 바뀌면 같은 논리 항목이 다른 React element로 재생성됐습니다. |
| 해결하려던 문제 | 비동기 session 해석이 navigation item identity까지 바꾸지 않아야 했습니다. |
| 핵심 결정 | 각 item에 불변 논리 ID를 추가하고 React key를 `href` 대신 `id`로 사용했습니다. |
| 입력 → 상태 전이 → 출력 | session data가 profile href만 갱신하고 React reconciliation은 동일 `id`를 가진 항목을 유지합니다. |
| ownership/lifetime/cleanup | navigation definition이 logical identity를 소유하며 URL은 mutable presentation 값으로 남습니다. |
| failure/rollback/retry | 잘못된 href 자체를 막지는 않습니다. unresolved 상태에서는 여전히 `/` 값이 존재합니다. |
| 보장하는 것 | session 해석 중에도 navigation item identity와 local DOM state를 유지합니다. |
| 보장하지 않는 것 | profile target의 유효성은 다음 fix 전까지 보장하지 않습니다. |
| 후속 연결 | `bc8d023b2999`가 unresolved item을 disabled presentation으로 바꿉니다. |

#### Fix 복원

| 항목 | 근거 |
| --- | --- |
| 이전 가정 | `href`가 navigation item identity로 충분하다고 가정했습니다. |
| 실제 실패/위험 | current session 해석으로 profile URL이 바뀔 때 같은 메뉴가 remount됩니다. |
| 근본 원인 | 논리 ID와 목적 URL을 같은 값으로 사용했습니다. |
| 수정된 불변식 | item identity는 고정 `id`, 목적지는 mutable `href`가 소유합니다. |
| 회귀 근거 | 이 SHA에는 별도 test가 없으며 code diff로만 확인됩니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `34eccd6c7150` — `feat(profile): 현재 프로필과 공유 기능 연결`
- Thread 내 다음 관련 SHA: `bc8d023b2999` — `fix(web): profile link 전 사용자 식별 대기`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.11. `fix(web): profile link 전 사용자 식별 대기`

| 항목 | 값 |
| --- | --- |
| SHA | `bc8d023b2999` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | current user가 resolve되기 전에 잘못된 profile link를 만들지 않습니다. |

#### 해당 SHA에서 확인할 실제 코드

- `AppShell`의 profile item rendering 분기와 `aria-disabled` 처리 여부를 확인합니다.
- unresolved profile item이 `<Link href="/">`가 아닌 비활성 element인지 확인합니다.
- session이 resolve된 뒤 같은 logical `id`로 link가 활성화되는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | stable key는 확보했지만 current user를 모르는 동안 profile target이 `/`로 설정되어 lobby link처럼 동작했습니다. |
| 해결하려던 문제 | 아직 알 수 없는 identity를 유효한 URL로 가장하지 않아야 했습니다. |
| 핵심 결정 | profile URL이 없을 때 link 대신 `aria-disabled` 비활성 항목을 렌더링하고 session이 준비된 뒤 실제 link로 전환했습니다. |
| 입력 → 상태 전이 → 출력 | session query pending → disabled nav item; user resolve → `/profile/<handle>` link 생성 순서입니다. |
| ownership/lifetime/cleanup | shell이 profile target readiness와 navigation presentation을 소유합니다. |
| failure/rollback/retry | session request가 영구 실패하면 profile 항목은 비활성 상태로 남으며 별도 복구 UI는 없습니다. |
| 보장하는 것 | 사용자 식별 전 잘못된 profile route로 이동하지 않습니다. |
| 보장하지 않는 것 | session 자체의 인증 정확성이나 retry는 이 commit이 보장하지 않습니다. |
| 후속 연결 | query cache Thread에서 shell session lookup ownership이 `meQuery`로 통합됩니다. |

#### Fix 복원

| 항목 | 근거 |
| --- | --- |
| 이전 가정 | 사용자 미확정 상태를 `/` fallback으로 표현해도 된다고 봤습니다. |
| 실제 실패/위험 | profile 메뉴가 lobby로 이동하며 의미가 다른 action을 수행합니다. |
| 근본 원인 | unknown identity를 valid href로 변환했습니다. |
| 수정된 불변식 | profile identity가 없으면 navigation action 자체를 비활성화합니다. |
| 회귀 근거 | 별도 자동 test는 추가되지 않았고 rendering branch를 exact SHA에서 확인했습니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `a56a4dee9219` — `fix(web): 안정적인 navigation key 사용`
- 이 SHA가 이 Thread의 마지막 고정 commit입니다.
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

## 6. 불변식 발전 기록

| 단계 | 관련 SHA | 학습 기록 |
| --- | --- | --- |
| runtime 경계 도입 | `f5c151c7cc7d` | Next.js/shared package build와 type-check 경계가 생겼습니다. |
| document·style owner 도입 | `4071b935cb24` → `ce174d6b3633` | style build와 `RootLayout`이 공통 browser shell의 기반을 소유합니다. |
| navigation owner 도입 | `77f35c72cd7b` | `AppShell`이 responsive navigation과 active route를 소유합니다. |
| production command 경계 | `ec000bed0414` | web package가 build 결과 serve와 package-local test command를 갖고 TypeScript cache를 남기지 않게 됐습니다. |
| auth entry 연결 | `f27199fdcd34` → `52ddc3acfcce` | 로그인 intent와 home route 인증 분기가 연결됐지만 sample fallback은 남았습니다. |
| navigation identity 교정 | `34eccd6c7150` → `a56a4dee9219` → `bc8d023b2999` | current profile URL, stable ID, unresolved disabled 상태가 순서대로 정리됐습니다. |

## 7. Failure → Fix → Test 관계

| 이전 상태/가정 | 실패 또는 위험 | Fix 연결 | Test/후속 근거 | 관계 해설 |
| --- | --- | --- | --- | --- |
| profile href를 React key로 사용 | session 해석 후 URL 변경으로 remount 가능 | `a56a4dee9219`가 logical ID를 분리 | 별도 test 없음 | profile href를 React key로 사용 → session 해석 후 URL 변경으로 remount 가능 → `a56a4dee9219`가 logical ID를 분리 → 별도 test 없음 |
| unknown user를 `/` href로 대체 | profile action이 lobby 이동으로 오인 | `bc8d023b2999`가 disabled item 렌더링 | 별도 test 없음 | unknown user를 `/` href로 대체 → profile action이 lobby 이동으로 오인 → `bc8d023b2999`가 disabled item 렌더링 → 별도 test 없음 |
| E2E가 sample fallback도 통과 | 실제 server failure를 성공처럼 볼 수 있음 | resource-screen Thread의 `be31566ac0fd` | 후속 화면 tests와 static branch inspection | E2E가 sample fallback도 통과 → 실제 server failure를 성공처럼 볼 수 있음 → resource-screen Thread의 `be31566ac0fd` → 후속 화면 tests와 static branch inspection |

## 8. Ownership·state·lifetime 변화

| 대상 | 이전 owner/state | 이후 owner/state | 수명/cleanup |
| --- | --- | --- | --- |
| browser build | 없음 | `apps/web` package scripts + Next config | process command 수명 |
| document/global style | 없음 | `RootLayout` + `globals.css` | application document 수명 |
| navigation | route별 반복 가능 상태 | `AppShell` | mounted shell 수명 |
| login input/error | 없음 | `LoginPanel` local state | panel instance 수명 |
| current user/profile target | 고정 tester → page/shell effect | `AppShell` session state, 이후 query로 이전 예정 | session lookup 수명 |
| production web process command | 없음 | `apps/web/package.json`의 `start` | process 수명 |

## 9. Thread 최종 상태

마지막 SHA에서 web package는 개발·build·production start·type-check·test command를 제공하고, RootLayout은 한국어 문서/global style을, AppShell은 stable logical ID를 가진 공통 navigation을 소유합니다. HomePage/LoginPanel은 개발 인증 진입을 담당하며 current user가 확정되기 전 profile 항목은 이동 가능한 링크가 아닙니다. session과 resource state의 canonical ownership은 아직 component effect에 남아 있어 이후 API/query Thread에서 교체됩니다.

### 최종 실행 흐름

1. web workspace는 `dev`/`build`/`start`/`typecheck`/`test` command와 shared package transpilation 규칙으로 실행됩니다.
2. workspace command가 `@pong-pong/web`의 Next.js script를 실행합니다.
3. `RootLayout`이 metadata, `lang="ko"`, global CSS를 한 번 적용합니다.
4. `HomePage`가 current session을 조회하고 미인증이면 `LoginPanel`, 인증이면 `AppShell` 내부 화면을 선택합니다.
5. `AppShell`은 pathname과 stable nav `id`로 active item을 계산합니다.
6. profile identity가 없으면 비활성 item을, 준비되면 `/profile/<handle>` link를 렌더링합니다.

## 10. 학습 완료 점검

- [x] 모든 commit을 지정 SHA의 parent/diff와 비교했습니다.
- [x] 후속 HEAD 코드를 이전 SHA 설명에 역투영하지 않았습니다.
- [x] owner, lifetime, cleanup, failure branch와 non-guarantee를 기록했습니다.
- [x] fix는 이전 가정과 root cause에, test는 production path와 증명 범위에 연결했습니다.
- [x] A/B importance 깊이를 구분했고 source subject/tag/role을 유지했습니다.
- [x] 실행하지 않은 project test에 pass 결과를 만들지 않았습니다.
