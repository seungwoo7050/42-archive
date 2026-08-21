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

- Thread 내 직전 관련 SHA: `a56a4dee9219` — `fix(web): 안정적인 navigation key 사용`
- 이 SHA가 이 Thread의 마지막 고정 commit입니다.
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

## 6. 불변식 발전 기록

| 단계 | 관련 SHA | 학습 기록 |
| --- | --- | --- |
| runtime 경계 도입 | `f5c151c7cc7d` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| document·style owner 도입 | `4071b935cb24` → `ce174d6b3633` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| navigation owner 도입 | `77f35c72cd7b` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| production command 경계 | `ec000bed0414` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| auth entry 연결 | `f27199fdcd34` → `52ddc3acfcce` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| navigation identity 교정 | `34eccd6c7150` → `a56a4dee9219` → `bc8d023b2999` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |

## 7. Failure → Fix → Test 관계

| 이전 상태/가정 | 실패 또는 위험 | Fix 연결 | Test/후속 근거 | 관계 해설 |
| --- | --- | --- | --- | --- |
| [학습자 작성: 이전 가정] | [학습자 작성: actual failure/risk] | `a56a4dee9219`가 logical ID를 분리 | 별도 test 없음 | [학습자 작성: root cause와 corrected invariant를 한 문장으로 연결] |
| [학습자 작성: 이전 가정] | [학습자 작성: actual failure/risk] | `bc8d023b2999`가 disabled item 렌더링 | 별도 test 없음 | [학습자 작성: root cause와 corrected invariant를 한 문장으로 연결] |
| [학습자 작성: 이전 가정] | [학습자 작성: actual failure/risk] | resource-screen Thread의 `be31566ac0fd` | 후속 화면 tests와 static branch inspection | [학습자 작성: root cause와 corrected invariant를 한 문장으로 연결] |

## 8. Ownership·state·lifetime 변화

| 대상 | 이전 owner/state | 이후 owner/state | 수명/cleanup |
| --- | --- | --- | --- |
| browser build | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| document/global style | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| navigation | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| login input/error | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| current user/profile target | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| production web process command | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |

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
