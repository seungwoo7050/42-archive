# 학습 문서 지도

이 저장소의 문서는 사용법, 구현 과정, 현재 구조를 서로 다른 위치에 둔다.
완성 화면부터 훑기보다 아래 순서로 읽으면 실행 가능한 첫 route에서 시작해
콘텐츠를 분리한 뒤 다섯 renderer와 배포 gate까지 확장한 흐름을 따라갈 수 있다.

## 선행 지식과 여기서 처음 다루는 내용

HTTP 요청·응답, URL과 origin, DOM·브라우저 이벤트, task와 microtask, Fetch,
History API, cookie/storage, CORS·CSP와 브라우저 자동화의 기본 목적은
`web-boundary-inspector`의 완성 문서를 선행 자료로 삼는다. 이 저장소에서는
그 정의를 되풀이하지 않고 App Router 요청, URL 기반 디자인 상태, server
rendering과 hydration, Playwright 행렬에 새로 생긴 책임을 설명한다.

host, published port와 TLS termination의 기본 경계는
`container-stack/architecture/runtime-boundaries-and-request-path.md`를 선행
자료로 삼는다. 그 문서의 nginx→FastCGI 배치를 그대로 적용하지 않고, 이
저장소에서는 standalone Next 서버 앞의 외부 reverse proxy가 전달하는
`x-forwarded-host`·`x-forwarded-proto`와 production `SITE_URL`의 차이를 새
조건으로 설명한다.

다음 개념은 이 프로젝트에서 처음부터 설명한다.

- TypeScript의 정적 검사와 runtime 입력 검증
- React component·props·children·state·effect·key와 다시 렌더링
- Next.js App Router, Server/Client Component와 hydration
- 콘텐츠 원본, selector, route view model과 renderer 경계
- CSS cascade, flex/grid/positioning과 콘텐츠 기반 breakpoint
- semantic HTML, keyboard/focus, reduced motion과 자동 접근성 검사의 한계
- public asset, `next/image`, local font와 layout shift
- Lighthouse·bundle 예산과 프런트엔드 배포 입력 검증

## 권장 읽기 순서

| 단계 | 해결할 문제 | 읽을 문서 |
| --- | --- | --- |
| 1 | 설정 파일만 있는 저장소와 실행 가능한 앱을 구분한다. | [00. 첫 실행 경계](../devlog/00-runnable-app-boundary.md), [개발 안내](./development.md) |
| 2 | JSON을 TypeScript가 읽되 runtime 값은 아직 보장하지 못하는 이유를 이해한다. | [01. 타입과 selector](../devlog/01-content-contract-and-selectors.md) |
| 3 | 최초 `/` route에서 콘텐츠가 layout·page·component까지 흐르는 경로를 복원한다. | [05. App Router 세로 기능](../devlog/05-app-router-vertical-slice.md) |
| 4 | 공통 UI와 CSS를 route 확장 전에 어디까지 분리하는지 판단한다. | [02. CSS와 no-JS](../devlog/02-theme-motion-and-no-js.md), [03. 공통 UI](../devlog/03-shared-ui-and-landmarks.md) |
| 5 | Zod, 교차 참조와 asset 검사가 TypeScript의 빈틈을 어떻게 보완하는지 본다. | [06. runtime 콘텐츠 경계](../devlog/06-runtime-content-boundaries.md), [콘텐츠 편집 절차](./content-pipeline.md) |
| 6 | 원본을 route별 화면 입력으로 바꾸고 공유 상태의 소유권을 추적한다. | [콘텐츠 architecture](../architecture/content-to-deployment.md), [12. route view model](../devlog/12-route-view-models.md) |
| 7 | 같은 view model이 다섯 개의 다른 의미 구조로 표현되는 과정을 비교한다. | [다섯 renderer 계약](../architecture/five-design-renderers-and-interface-contracts.md), [07. 실제 추가 이력](../devlog/07-design-registry-and-renderers.md) |
| 8 | 서버 HTML과 두 client island의 state·effect·cleanup을 구분한다. | [요청·hydration architecture](../architecture/request-rendering-and-hydration-boundary.md), [04. 브라우저 자원](../devlog/04-browser-resource-lifetimes.md), [09. hydration race](../devlog/09-details-hydration-race.md) |
| 9 | 접근성·반응형·성능을 실제 코드와 검사 경계로 연결한다. | [13. 접근성](../devlog/13-accessibility-matrix.md), [14. 성능](../devlog/14-performance-budgets-and-startup.md), [16. 유휴 네트워크](../devlog/16-idle-network-and-interactions.md) |
| 10 | template 입력을 production 공개 입력으로 바꾸고 산출물의 누락을 진단한다. | [운영 준비](./operations.md), [배포·품질 architecture](../architecture/production-readiness-and-quality-gates.md), [10](../devlog/10-runtime-ci-and-deployment-artifact.md), [11](../devlog/11-production-content-assets-and-seo.md) |

## 현재 구조의 세 지도

### 콘텐츠 지도

```text
src/content/*.json 14개
→ src/lib/content-schema.ts
→ src/lib/content-loader.ts
├─ server module → src/lib/portfolio/content.ts
│  → src/lib/portfolio/view-models.ts
│  → src/designs/registry.tsx
│  → 선택한 renderer
├─ content:check → src/lib/content-assets.ts
└─ content:ready/prebuild → src/lib/content-readiness.ts
```

각 JSON 파일의 모양은 Zod가 runtime에 검사한다. loader는 프로젝트·기술·링크,
route와 디자인 ID처럼 파일을 넘는 참조를 검사한다. 여기서 요청 렌더링과
명령형 gate가 갈라진다. server module은 정규화와 view model로 진행하고,
`content:check`는 `public/` 파일 존재를, `content:ready`는 mode별 공개 입력을
별도 process에서 확인한다. `prebuild`는 두 script를 차례로 실행하지만 page
request가 asset/readiness validator를 다시 통과하는 것은 아니다.

이 흐름의 source of truth가 항상 하나인 것은 아니다.
`presentation.pages.projects.groups`는 schema상 필수지만
`src/lib/portfolio/content.ts`가 `projects.groups`에서 만든 값으로 덮어쓴다.
project group 문구를 수정할 때는 `projects.json`이 실제 화면 원본이다.

### 요청 지도

```text
Node/npm script
→ src/app/layout.tsx
→ src/app/**/page.tsx의 params·searchParams
→ resolvePortfolioPageContext()
→ route view model
→ renderDesignRoute()
→ Server Component HTML/RSC
→ AnimatedTerminal·DesignSwitcherClose hydration
→ DOM과 URL navigation
```

App Router page는 기본적으로 Server Component다. 이 프로젝트의 first-party
Client Component는 `src/components/portfolio/animated-terminal.tsx`와
`src/components/portfolio/design-switcher-close.tsx` 두 개다.
`DesignSwitcher` 자체는 server markup인 `<details>/<summary>/<nav>`이며
브라우저가 hydration 전에도 native disclosure로 동작한다.

### 배포 지도

```text
content:check
→ content:ready
→ next build --webpack
→ .next/standalone + .next/static
→ Node server 또는 Docker runner
→ host/proxy/TLS
→ browser와 crawler
```

`test:e2e:production`의 `production`은 Next.js production build/server를
뜻한다. 명령은 `PORTFOLIO_CONTENT_MODE=production`을 설정하지 않으므로 실제
콘텐츠 준비를 증명하지 않는다. Docker runner는 `public/`을 명시적으로 복사하고 `test:container`가
route·asset HTTP 응답과 비루트 실행을 확인한다. 실행 산출물과 공개 준비를
같은 완료 상태로 취급하면 안 된다.

## 문서 역할

- [README](../README.md)는 현재 실행 방법과 지원 범위를 제공한다.
- [개발 안내](./development.md), [콘텐츠 편집 절차](./content-pipeline.md),
  [운영 준비](./operations.md)는 현재 작업 절차를 제공한다.
- [devlog](../devlog/README.md)는 Git에서 확인한 구현 인과관계와 실패 방지 조건을
  기록한다.
- [architecture](../architecture/content-to-deployment.md)는 현재
  데이터·요청·배포 경계와 불변식을 연결한다.
- [재구현 실습](./case-study.md)은 조건을 바꿔 같은 문제를 다시 해결하는
  과제를 제공한다.

현재 코드와 과거 구현은 devlog에서 commit ID로 구분한다. architecture의 코드
조각은 별도 표기가 없으면 현재 소스다. 어떤 문서도 저장된 baseline이나 설정이
존재한다는 이유만으로 이번 checkout의 검증 명령이 통과했다고 주장하지 않는다.
