# 개발 명령과 설정

이 문서는 현재 checkout을 수정할 때 사용하는 명령과 각 명령이 읽는 설정을
정리한다. 구현 순서는 [devlog](../devlog/README.md), 데이터와 렌더링 구조는
[architecture](../architecture/content-to-deployment.md)에서 다룬다.

## 실행 환경

Node.js `24.18.0`과 npm `11.16.0`을 사용한다.

| 계약 위치 | 의미 |
| --- | --- |
| `.node-version`, `.nvmrc` | local version manager와 CI가 읽는 Node 버전 |
| `package.json#engines` | 지원하는 Node·npm의 정확한 버전 |
| `package.json#packageManager` | lockfile을 해석할 npm 버전 |
| `package-lock.json` | 실제 dependency 해석 결과 |
| `.github/workflows/ci.yml` | Node setup 뒤 npm 11.16.0을 명시적으로 설치 |
| `Dockerfile` | dependency/builder/runner 모두 Node 24.18.0 사용 |

버전 범위를 넓게 허용하지 않으므로 다른 minor에서 우연히 성공한 결과를 저장소
계약의 통과로 취급하지 않는다.

```sh
npm ci
npm run dev
```

개발 서버는 `next dev --webpack -p 3100`으로 실행된다. `--webpack`은
production build와 route bundle manifest parser가 같은 compiler 계열의
출력을 보게 하는 계약이다.

## package script 전체

| script | 실제 명령 | 입력과 결과 |
| --- | --- | --- |
| `dev` | `next dev --webpack -p 3100` | webpack 개발 서버, port 3100 |
| `prebuild` | `content:check` 뒤 `content:ready` | `npm run build` 앞에서 자동 실행 |
| `build` | `next build --webpack` | Next production build와 standalone 출력 |
| `build:verify` | `node scripts/verify-build-output.mjs` | `server.js`, `.next/static` 존재 확인 |
| `test:container` | `node scripts/verify-container-runtime.mjs` | image build·route/asset HTTP·MIME·비루트·종료 확인 |
| `bundle:baseline` | `route-budgets.mjs --write-baseline` | 현재 manifest 크기로 baseline 갱신 |
| `bundle:check` | `route-budgets.mjs` | committed route JS/CSS 예산과 비교 |
| `lighthouse:audit` | `lhci autorun` | production server port 3300의 desktop gate |
| `lighthouse:summarize` | `summarize-lighthouse.mjs` | 남은 LHR을 수동 baseline JSON으로 요약 |
| `start` | `next start -p 3100` | 기존 `.next`를 port 3100에서 실행 |
| `start:e2e` | `next start -p 3200` | production Playwright용 서버 |
| `start:performance` | `next start -p 3300` | LHCI용 서버 |
| `lint` | `eslint .` | source·test·script의 lint |
| `typecheck` | `tsc --noEmit` | TypeScript 정적 검사, 출력 파일 없음 |
| `content:check` | `validate-content.ts` | Zod, 교차 참조와 public asset 존재 |
| `content:ready` | `validate-content-readiness.ts` | template/production 공개 준비 |
| `test` | `vitest run` | jsdom 단위·component test |
| `test:watch` | `vitest` | 변경 감시 단위 test |
| `test:e2e` | `playwright test` | webpack 개발 서버 대상 |
| `test:e2e:production` | build 뒤 production config Playwright | Next production build/server의 전체 spec, `@visual` 포함; 콘텐츠 mode는 별도 env |
| `test:e2e:ci` | production config에서 `@visual`만 제외 | Linux CI의 비시각 Playwright; 로컬 전체 검사를 대체하지 않음 |

`prebuild`는 npm lifecycle 이름이므로 `npm run build` 앞에서 자동 실행된다.
`npm run test:e2e:production`도 내부에서 build를 다시 실행한다. 이미 build한
결과를 그대로 재사용한다고 가정하지 않는다. 이 로컬 명령은
`@visual`을 포함한다. `test:e2e:ci`는 Linux CI에서 시각 환경 차이를
분리하기 위해 `@visual`만 제외하고 나머지 production spec을 실행한다.

## 설정과 검사가 닫는 경계

| 검사 | 읽는 설정 | 실제 대상 | 증명하지 않는 것 |
| --- | --- | --- | --- |
| `npm run lint` | `eslint.config.mjs`, Next core-web-vitals/TypeScript config | 저장소의 lint 대상 파일 | runtime JSON 값, browser layout |
| `npm run typecheck` | `tsconfig.json` | strict, noEmit, bundler resolution, JSON module, `@/*` alias | Zod parse와 env 값 |
| `npm run content:check` | schema, loader, asset validator | 14개 JSON과 `public/` 참조 | MIME, URL 도달성, 콘텐츠 사실성 |
| `npm run content:ready` | mode와 `SITE_URL`, readiness marker | template 또는 production 입력 | 실제 deploy 응답과 검색 색인 |
| `npm run test` | `vitest.config.ts`, `src/test/setup.ts` | `src/**/*.test.{ts,tsx}`, jsdom | CSS layout과 실제 browser 조합 |
| `npm run build` | `next.config.ts`, PostCSS, App Router | webpack production output, `output: standalone` | 실행 image와 HTTP 응답 |
| `npm run test:e2e` | `playwright.config.ts` | port 3100, Desktop Chrome와 Pixel 7 profile, worker 1 | Firefox/WebKit, production compiler |
| `npm run test:e2e:production` | `playwright.production.config.ts` | build + port 3200 Next server, 같은 두 Chromium profile, `@visual` 포함 | production 콘텐츠 mode 자동 활성화 |
| `npm run test:e2e:ci` | production config에서 `@visual` 제외 | Linux CI의 비시각 production E2E | 15개 PNG의 pixel 비교 |
| `npm run bundle:check` | `performance/route-budgets.json`, build manifest | 압축 전 route client JS/CSS, +5% 한도 | image/font/server bundle과 체감 성능 |
| `npm run lighthouse:audit` | `lighthouserc.cjs` | 다섯 design의 home/detail 10 URL, desktop 3회 | mobile 통과, 실제 사용자 성능 |
| `npm run test:container` | Dockerfile, runtime verifier | route와 tracked public asset, MIME, uid와 종료 | 외부 proxy, DNS/TLS, 장시간 부하 |

Playwright가 worker를 하나로 고정한 이유는 개발 compiler가 두 device project의
cold route 요청을 동시에 처리할 때 진행 중 navigation을 invalidate할 수 있기
때문이다. 이는 실제 사용자가 한 명이라는 가정이 아니라 test runner 안정화
조건이다.

## 콘텐츠 수정

1. [콘텐츠 파일 표](./content-pipeline.md)에서 source of truth를 찾는다.
2. image/PDF를 추가하면 예제는 `public/template`, 공개 파일은
   `public/content`에 둔다.
3. project ID를 바꿀 때 resume, journey, narrative, interview map, curation,
   link의 참조를 함께 바꾼다.
4. schema → loader → content normalization → route view model → renderer의
   생산자/소비자 순서로 검토한다.
5. `?debug=content`로 화면 주변의 source hint를 확인하되 이를 validation
   결과로 대신하지 않는다.

starter identity도 test consumer를 가진다. project ID를 바꾸면
`src/performance/performance-gates.test.ts`의 Lighthouse project URL 기대값을,
`site.brand`를 바꾸면 `src/lib/site-metadata.test.ts`의 route metadata title
기대값을 함께 맞춘다. 이 두 값은 현재 JSON에서 완전히 파생되지 않으므로
`content:check`와 `content:ready`가 통과해도 오래된 기대값이 남으면
`npm run test`가 실패한다.

`presentation.pages.projects.groups`는 화면의 최종 group 원본이 아니다.
`portfolio/content.ts`가 `projects.groups`에서 다시 만들므로 project group
label과 description은 `projects.json`에서 수정한다.

## 화면 수정

공통 계산과 화면 표현을 다음 기준으로 나눈다.

- project ID를 object로 바꾸거나 여러 원본을 결합하는 계산은
  `src/lib/portfolio/view-models.ts` 또는 selector가 맡는다.
- Design·Classic이 의미까지 공유하는 작은 표시 component는
  `src/components/portfolio`에 둔다.
- shell, section 순서와 디자인 고유 markup은 `src/designs/<id>`가 맡는다.
- 전역 role token과 Design·Classic 공용 rule은 `src/app/globals.css`,
  Editorial·Brutalist·Cinematic은 각 CSS module이 맡는다.

route를 추가하면 다음 경계를 함께 수정한다.

```text
site page schema와 타입
→ App Router page
→ PortfolioRouteId
→ PortfolioRouteViewModel union과 creator
→ registry request
→ 다섯 renderer
→ metadata/sitemap/navigation
→ unit·E2E 행렬
```

design을 추가하면 design ID가 schema, 수기 union, supported design 목록,
config, registry와 test에 중복되어 있음을 고려한다. 한 위치에서 자동 파생되는
구조가 아니므로 typecheck 하나가 drift를 모두 잡는다고 보지 않는다.

## React/Next.js 변경 확인

App Router page와 renderer는 기본적으로 Server Component다. browser API,
event handler, state와 effect가 정말 필요할 때만 `"use client"` 경계를 만든다.
현재 first-party client component는 terminal animation과 design sheet close
button 두 개다.

- props에서 바로 계산할 수 있는 값은 state로 복제하지 않는다.
- list의 `key`는 index보다 project/section/link의 안정된 ID를 우선한다.
- effect에서 timeout, listener나 observer를 만들면 cleanup의 종료 조건을 함께
  정의한다.
- `window`, `matchMedia`, viewport, locale date와 난수는 server render와 첫
  client render가 다른 값을 만들 수 있다.
- hydration 전 동작이 필요하면 native `<details>`처럼 HTML 기본 동작을 먼저
  검토한다.

[요청·hydration 문서](../architecture/request-rendering-and-hydration-boundary.md)에
현재 두 client island의 state와 cleanup을 코드로 설명한다.

## 변경 후 확인 순서

일반적인 전체 확인 순서는 다음과 같다.

```sh
npm run content:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e:production
npm run build:verify
npm run test:container
npm run bundle:check
npm run lighthouse:audit
```

`npm run test:e2e:production`이 build를 다시 하므로 실제 작업에서는 중복 build를
피하도록 순서를 조정할 수 있다. 어떤 명령을 생략했는지 결과와 함께 기록한다.
unit test는 browser layout을 증명하지 않고, Playwright는 모든 browser와
보조기기 조합을 증명하지 않으며, Lighthouse 점수는 CPU·browser·font/image
cache와 server 상태에 따라 변한다.

문서와 저장된 baseline은 현재 checkout의 통과를 대신하지 않는다. 변경 후에는 위 명령을 다시 실행하고, 생략한 검사는 결과와 함께 명시한다.
