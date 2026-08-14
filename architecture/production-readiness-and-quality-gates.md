# 배포 준비 판정과 품질 게이트

이 프로젝트는 소스 검사, 템플릿 빌드, 실제 콘텐츠 준비와 실행 배포물을 서로 다른 상태로 다룬다. 이 문서는 각 검사가 확인하는 범위와 현재 배포 경계를 설명한다. 실행 명령과 측정 결과는 [운영 문서](../docs/operations.md), 데이터가 renderer까지 가는 경로는 [콘텐츠 architecture](./content-to-deployment.md), 변화 과정은 [런타임·CI와 배포 산출물](../devlog/10-runtime-ci-and-deployment-artifact.md), [프로덕션 콘텐츠와 검색 메타데이터](../devlog/11-production-content-assets-and-seo.md), [성능 예산](../devlog/14-performance-budgets-and-startup.md)에서 확인할 수 있다.

## 품질 상태의 구분

다음 상태는 각각 별도로 확인해야 한다.

1. 소스 품질 검사는 lint, TypeScript와 단위 검사가 통과했음을 뜻한다.
2. 템플릿 빌드는 예제 콘텐츠를 허용한 상태에서 Next.js 프로덕션 서버와 브라우저 검사를 실행한다.
3. 프로덕션 콘텐츠 준비는 실제 이름, 프로젝트, 연락처, 공개 URL과 `/content/` 자산을 요구한다. 프로젝트 이미지 위치 검사는 활성 프로젝트에만 적용된다.
4. 실행 배포물은 `standalone` 서버와 정적 자산을 포함하고 실제 요청에 응답해야 한다.

저장소에는 첫 두 상태의 CI, 세 번째 상태를 판정하는 코드와 네 번째 상태의 container runtime 검사가 있다. 기본 CI는 template mode이며 실제 production 콘텐츠와 외부 proxy·DNS/TLS는 배포 환경에서 확인한다.

## gate가 실행되는 시점

production readiness와 runtime 검색 정책은 같은 함수 하나가 한 번 결정하는
원자적 상태가 아니다.

```text
build process
├─ prebuild
│  ├─ content:check: schema·참조·repository asset
│  └─ content:ready: 당시 mode와 SITE_URL의 전체 readiness
└─ next build --webpack
   ├─ page/layout build 작업
   ├─ 기본 cache 대상 metadata route
   └─ standalone/static 산출물

runtime request
├─ searchParams를 읽는 page: 요청별 design/debug
├─ headers()를 읽는 root metadata: 요청 host/proto
└─ mode와 SITE_URL을 다시 읽는 layout/project structured data
```

`robots.ts`와 `sitemap.ts` 같은 metadata special route는 request-time API나
dynamic config가 없으면 Next.js가 기본으로 캐시한다. 반면 page의
`searchParams`와 root metadata의 `headers()`는 request-time Dynamic API다.
build manifest와 저장된 baseline은 현재 checkout의 통과를 대신하지 않는다. framework 계약과 현재 코드를
기준으로 build와 request에서 서로 다른 값을 읽을 수 있다는 점을 실패 모델로
둔다.

`NEXT_PUBLIC_*` 환경 변수는 build 때 브라우저 JavaScript에 인라인된다. 현재
`PORTFOLIO_CONTENT_MODE`와 `SITE_URL`은 server 전용이며 Client Component에
전달하지 않는다. credential이나 내부 주소를 공개 prefix로 바꾸는 것은 이
gate의 해결책이 아니다.

## CI와 빌드 순서

[`package.json`](../package.json)과 [CI 설정](../.github/workflows/ci.yml)의 실행 흐름은 다음과 같다.

```text
npm ci
  → lint
  → typecheck
  → content:check
  → Vitest
  → Chromium 설치
  → npm run test:e2e:ci
       └─ npm run build
            └─ prebuild
                 ├─ content:check
                 └─ content:ready
            └─ next build --webpack
       └─ production Next server + Playwright
  → build:verify
  → bundle:check
  → lighthouse:audit
  → test:container
```

`content:check`는 독립 단계에서 빠르게 실패시키고 `prebuild`에서 다시 확인한다. Linux CI의 `test:e2e:ci`는 Next.js production build·server를 사용하면서 `@visual`로 표시한 spec만 제외한다. 로컬 `test:e2e:production`은 시각 spec을 포함한 전체 검사를 계속 실행한다. 두 명령의 `production`은 framework 빌드·서버를 뜻하며 `PORTFOLIO_CONTENT_MODE=production`을 자동 설정하지 않으므로 템플릿 문구 교체, 실제 `SITE_URL`과 `/content/` 자산 준비 여부를 증명하지 않는다.

## 콘텐츠 게이트

### 구조와 참조

[`validate-content.ts`](../scripts/validate-content.ts)는 [`loadPortfolioSource()`](../src/lib/content-loader.ts)를 호출하여 다음을 검사한다.

- 각 JSON의 Zod 스키마
- 중복 ID와 순서 값
- 프로젝트, 기술, 링크, 디자인과 페이지 사이의 참조
- 지원하지 않는 내부 라우트
- 비활성 페이지 또는 프로젝트를 가리키는 내부 링크
- 기본 디자인과 지원 디자인 목록의 정합성

한 파일의 스키마가 맞지 않으면 그 파일의 오류를 모아 중단한다. 파일별 스키마가 모두 통과한 뒤에는 교차 참조 문제를 모아서 보고한다. 어느 단계에서도 부분적으로 적재된 콘텐츠를 반환하지 않는다.

### 자산 존재

[`validatePortfolioAssets()`](../src/lib/content-assets.ts)는 소셜 이미지, 프로필 사진, 이력서와 프로젝트 이미지가 `public/` 안에 실제로 있는지 확인한다. 이미지 형식, PDF 유효성, 응답 MIME, 브라우저 디코딩과 컨테이너 포함 여부는 검사하지 않는다.

### 프로덕션 준비

[`content-readiness.ts`](../src/lib/content-readiness.ts)는 프로덕션 모드에서 다음 문제를 모두 수집해 실패시킨다.

- 예제 이름, 연락처, `placeholder`, `starter`, `Replace this/the` 같은 템플릿 표식
- 누락되었거나 허용하지 않는 `SITE_URL`
- 소셜 이미지, 프로필 사진과 이력서의 누락 또는 `/content/` 밖의 경로
- 활성 프로젝트 이미지의 `/content/` 밖 경로
- 활성 프로젝트 부재 또는 사용할 수 있는 공개 링크 부재
- 연락처 배치에서 사용할 수 있는 `email`, `github`, `website` 링크 부재

표식 검사는 비활성 항목을 포함한 모든 문자열에 적용된다. 예외 목록이 없으므로 실제 문맥의 `starter`도 실패할 수 있다.

`SITE_URL`은 `localhost`, 루프백, 예약 예시 도메인과 URL 인증 정보를 거부하지만 DNS·HTTP 도달성, 루프백 이외의 사설망 주소, 경로·쿼리·해시를 별도로 제한하지 않는다. 프로젝트와 연락처의 HTTP(S) 링크 검사는 더 약해서 `localhost`, 인증 정보 또는 존재하지 않는 호스트가 형식상 통과할 수 있다. 이 검사는 공개 가용성을 확인하는 네트워크 검사가 아니다.

현재 콘텐츠에는 예제 이름과 `/template/` 자산이 남아 있으므로 기본 템플릿 모드에서는 빌드할 수 있지만 프로덕션 준비 검사는 실패한다.

## 검색 메타데이터

[`layout.tsx`](../src/app/layout.tsx)와 [`site-metadata.ts`](../src/lib/site-metadata.ts)는 콘텐츠 모드에 따라 메타데이터를 다르게 만든다.
`src/app/robots.ts`와 `src/app/sitemap.ts`는 이 정책을 실제 메타데이터
라우트로 연결한다. `src/components/portfolio/structured-data.tsx`는
`serializeStructuredData()`를 거친 JSON-LD만 script 본문에 넣으며,
루트 레이아웃과 프로젝트 상세는 프로덕션 모드에서만 이 구성 요소를 사용한다.

| 항목 | 템플릿 모드 | 프로덕션 모드 |
|---|---|---|
| `metadataBase` | 요청 호스트에서 계산 | 검증된 `SITE_URL` |
| `robots` 메타데이터 | `index: false`, `follow: false` | `index: true`, `follow: true` |
| `/robots.txt` | 전체 `disallow` | `allow`, 호스트와 사이트맵 |
| `/sitemap.xml` | 빈 배열 | 활성 페이지와 프로젝트 URL |
| 사이트 구조화 데이터 | 출력하지 않음 | Person과 WebSite |
| 프로젝트 구조화 데이터 | 출력하지 않음 | CreativeWork |

[`not-found.tsx`](../src/app/not-found.tsx)는 별도 404 화면과 `noindex` 메타데이터를 제공한다. 단위 검사는 메타데이터 객체, robots와 sitemap 생성을 확인하고 Playwright는 실행 서버의 robots 메타데이터와 응답을 검사한다. 실제 검색 엔진의 색인 결과는 확인하지 않는다.

프로젝트 상세의 `generateStaticParams()`는 현재 활성 project ID를 열거하지만
`dynamicParams = false`를 선언하지 않는다. 목록 밖 ID도 framework가
자동으로 영구 차단한다고 가정하지 않고 page의 view model 조회와
`notFound()`를 최종 경계로 본다. 모든 page가 `searchParams`를 읽으므로
`view`에 따른 renderer 선택은 요청 시 수행한다.

metadata와 환경 변수의 공식 실행 시점 근거는 다음 문서에 둔다.

- [Next.js page의 `searchParams`](https://nextjs.org/docs/app/api-reference/file-conventions/page)
- [Next.js metadata file](https://nextjs.org/docs/app/api-reference/file-conventions/metadata)
- [Next.js self-hosting과 runtime env](https://nextjs.org/docs/app/guides/self-hosting)

## 검사 설정과 대상

각 명령은 서로 다른 설정을 읽는다.

| 검사 | script/설정 | 대상 | 핵심 비보장 |
| --- | --- | --- | --- |
| lint | `eslint .`, `eslint.config.mjs` | source, test, script | runtime 콘텐츠와 browser layout |
| typecheck | `tsc --noEmit`, `tsconfig.json` | strict TS/module/props | JSON·environment 실제 값 |
| unit | `vitest run`, `vitest.config.ts` | `src/**/*.test.{ts,tsx}`, jsdom | 실제 CSS와 모든 browser |
| content | 두 validation script | schema, 참조, asset, mode | URL 도달성·콘텐츠 사실성 |
| build | `next build --webpack`, `next.config.ts` | production output/standalone | runtime HTTP |
| 개발 E2E | `playwright.config.ts` | port 3100, Chromium/Pixel 7 profile | production compiler |
| production E2E | `playwright.production.config.ts` | build + port 3200, `@visual` 포함 | production 콘텐츠 mode 자동 설정 |
| Linux CI E2E | `test:e2e:ci`, production config | `@visual`만 제외한 production E2E | 15개 PNG pixel 비교 |
| bundle | `route-budgets.mjs` | webpack client-reference manifest | image/font/server bundle |
| Lighthouse | `lighthouserc.cjs` | port 3300, desktop 10 URL | mobile/field performance |
| container | `verify-container-runtime.mjs`, Dockerfile | route·JSON 참조 asset HTTP/body/MIME, 비루트, 강제 정리 | graceful exit, proxy, DNS/TLS, 부하 |

## 브라우저 검사

프로덕션 서버 E2E는 빌드 뒤 `next start`를 별도 포트에서 실행하고 데스크톱 Chrome과 Pixel 7 크기를 사용한다. 로컬 `test:e2e:production`은 전체 spec을, Linux CI의 `test:e2e:ci`는 `@visual`만 제외한 spec을 실행한다.

### 라우트와 디자인

[`portfolio.spec.ts`](../tests/e2e/portfolio.spec.ts)는 다섯 디자인과 활성 라우트의 행렬에서 다음을 확인한다.

- HTTP 응답과 선택한 디자인 루트
- `main`, 첫 번째 `h1`과 대표 콘텐츠
- 가로 넘침 부재
- 프로젝트 이미지의 로딩과 크기
- 디자인 전환 뒤 `pathname`과 `debug=content` 보존
- 전환 중 하이드레이션 오류 부재
- 잘못된 `view`의 기본 디자인 복귀
- reduced-motion에서 지속 애니메이션과 부드러운 스크롤 해제

행렬은 홈, 활성화된 페이지 유형과 첫 번째 활성 프로젝트 상세를 포함한다. 모든 프로젝트 상세, 외부 링크의 도달성, Firefox, WebKit과 실제 모바일 브라우저는 포함하지 않는다.

### 시각 회귀와 접근성

시각 회귀 spec은 `@visual`로 표시하고 다섯 홈의 데스크톱·모바일 10장과 첫 프로젝트 상세의 데스크톱 5장을 비교한다. `reduced-motion`, `networkidle`, 글꼴과 이미지 로딩을 기다린 뒤 `maxDiffPixelRatio: 0.01`을 적용한다. Vitest manifest는 PNG 기준 파일이 정확히 이 15개인지 고정하지만 pixel은 비교하지 않는다. 다른 라우트, 의미론과 운영 데이터 길이는 이 기준에 포함되지 않는다.

접근성 검사는 활성 라우트 행렬 전체에서 랜드마크와 axe의 WCAG 2.0 A/AA·2.1 A/AA·2.2 AA 규칙을 확인한다. 첫 Tab의 건너뛰기 링크 포커스와 Enter 입력 뒤 `main` 포커스 이동은 각 디자인의 홈에서만 검사한다. 자동 검사 결과는 콘텐츠 의미, 스크린 리더별 동작, 확대·고대비와 실제 사용자 평가를 대신하지 않는다.

## `standalone`과 Docker

[`verify-build-output.mjs`](../scripts/verify-build-output.mjs)는
`.next/standalone/server.js`와 `.next/static`의 존재를 확인한다. 파일 존재 검사는
서버 응답을 대신하지 않는다.

Docker runner는 필요한 세 입력을 명시적으로 복사한다.

```text
/app/.next/standalone → /app
/app/.next/static     → /app/.next/static
/app/public           → /app/public
```

[`verify-container-runtime.mjs`](../scripts/verify-container-runtime.mjs)는 image를
build하고 임시 container를 시작해 `/`·구성된 project route와 JSON이 참조하는
public asset의 HTTP 200·non-empty body·MIME, 실행 사용자 `node`를 확인한다.
검사 뒤에는 `docker rm --force`와 image `rm --force`로 임시 자원을 정리한다.
이는 graceful SIGTERM과 process exit code를 검증하는 계약이 아니다. 외부 proxy,
DNS/TLS와 production 콘텐츠의 사실성도 이 검사 범위 밖이다.

빌드 단계의 `PORTFOLIO_CONTENT_MODE`와 `SITE_URL`은 새 runner stage에 자동 상속되지
않는다. 배포 환경이 runtime 값을 제공해야 하며 metadata route cache와 request-time
HTML이 같은 mode/origin을 나타내는지 실제 응답으로 확인한다.

두 불일치 방향을 모두 확인해야 한다.

- template로 build한 뒤 runtime만 production으로 바꾸면 전체 production
  readiness 없이 indexing/JSON-LD 경로가 열릴 수 있다.
- production 입력으로 build한 뒤 runner에서 변수를 빼면 request-time 경로가
  template/noindex 상태로 돌아갈 수 있다.

## 번들과 성능

[`route-budgets.mjs`](../scripts/route-budgets.mjs)는 Next.js 빌드 매니페스트를 읽어 App Router 라우트별 클라이언트 JavaScript와 비인라인 CSS 바이트를 계산한다.

- `performance/route-budgets.json`을 기준으로 사용한다.
- 압축 전 크기가 기준보다 5% 넘게 증가하면 실패한다.
- 기준에 있던 라우트가 사라지거나 기준 없는 새 라우트가 생겨도 실패한다.
- JavaScript와 CSS를 따로 비교한다.

이 값은 압축 전 클라이언트 자산이며 서버 번들, 이미지, 글꼴과 전체 배포물 크기를 합산하지 않는다.

Lighthouse는 다섯 디자인의 홈과 첫 프로젝트 상세, 모두 10개 URL을 데스크톱 설정으로 세 번 측정하고 중앙값을 사용한다.

| 지표 | 실패 조건 |
|---|---:|
| 성능 범주 | 0.90 미만 |
| 접근성 범주 | 0.95 미만 |
| LCP | 2,500ms 초과 |
| CLS | 0.1 초과 |
| TBT | 200ms 초과 |

SEO와 권장사항 범주, 모바일 측정 통과 기준, 실제 사용자 측정과 장시간 캐시 상태는 포함하지 않는다. [`lighthouse-baseline.json`](../performance/lighthouse-baseline.json)은 이전 데스크톱 측정 자료이고 [`lighthouse-mobile-observation.json`](../performance/lighthouse-mobile-observation.json)은 모바일 단일 관찰값이다. 둘 다 현재 검사를 대신하지 않으며 새 결과와 비교할 때 파일 안에 기록된 실행 환경을 함께 확인해야 한다.

`scripts/summarize-lighthouse.mjs`는 LHCI의 판정기가 아니다. 남아 있는
`.lighthouseci/lhr-*.json`을 `finalUrl`로 묶고 지표별 중앙값과 실행 환경을
`lighthouse-baseline.json`에 기록하는 수동 도구다. 보고서가 하나 이상인지만
확인하며 열 개 URL과 URL별 세 실행을 다시 세지 않는다. 현재 CI도
`lighthouse:audit`만 실행하고 `lighthouse:summarize`는 호출하지 않는다.
따라서 저장 파일의 갱신 시각이나 `runCountPerUrl`만으로 현재 게이트 실행을
증명할 수 없다.

유휴 요청 검사는 로드 뒤 1초 동안 `_rsc` prefetch와 font request·preload href를 기록한다. hash된 font URL에 family 이름이 남는다고 가정하지 않고 CSSOM `@font-face` source에서 얻은 mono pathname 집합을 기준으로 삼는다. 모든 대상 design·route에서 preload pathname과, Design·Editorial에서 실제 request pathname과의 교집합이 비어 있는지 검사한다. 상호작용 검사는 디자인 선택기 닫기와 모바일 메뉴 열기를 세 번 측정하여 중앙값과 최댓값을 200ms 이하로 제한한다. 두 검사는 실제 사용자 세션 전체의 네트워크와 INP를 대표하지 않는다.

## 배포 확인 순서

템플릿 상태에서는 다음 순서로 소스, 브라우저와 산출물을 확인한다.

```text
lint/typecheck
→ content:check
→ unit tests
→ template-mode production build
→ Playwright route/accessibility/visual/performance
→ standalone existence
→ bundle budgets
→ Lighthouse
→ container runtime gate
```

도식의 `unit tests`는 단위 검사를, `template-mode production build`는 템플릿 모드에서 실행하는 프로덕션 빌드를 뜻한다.

실제 콘텐츠로 공개 후보를 확인할 때는 빌드와 서버가 같은 환경변수를 사용하도록 셸에 값을 설정한다.

```sh
: "${ACTUAL_PUBLIC_SITE_URL:?set ACTUAL_PUBLIC_SITE_URL to the controlled public origin}"
export PORTFOLIO_CONTENT_MODE=production
export SITE_URL="$ACTUAL_PUBLIC_SITE_URL"

npm run test:e2e:production
npm run build:verify
npm run bundle:check
npm run lighthouse:audit
```

`test:e2e:production`이 내부에서 다시 빌드하므로 별도의 `npm run build`를 먼저 실행할 필요는 없다.

첫 줄은 `ACTUAL_PUBLIC_SITE_URL`이 비어 있을 때 제어 중인 공개 주소를 설정하라는 오류와 함께 실행을 중단한다.

`npm run test:container`는 다음 최소 조건을 확인한다.

- container 설정의 실행 사용자가 `node`다.
- `/`와 현재 콘텐츠에 구성된 project route가 HTTP 200, 비어 있지 않은
  body와 `text/html` MIME으로 응답한다.
- JSON이 참조하는 모든 `/template/`·`/content/` asset이 HTTP 200, 비어 있지
  않은 body와 확장자별 예상 MIME으로 응답한다.
- 검사 뒤 `docker rm --force`와 image `rm --force`로 임시 자원을 정리한다.

`test:container`는 `/robots.txt`·`/sitemap.xml`을 요청하지 않고 SIGTERM을
보내거나 process exit code를 확인하지 않는다. robots 실제 응답은
Playwright E2E가, robots·sitemap 생성 규칙은 metadata unit test가 각각
담당하며 실제 production 배포 응답은 별도로 확인해야 한다.

## 현재 게이트의 범위

| 질문 | 자동 검사 | 현재 범위 |
|---|---|---|
| JSON 형태와 참조가 유효한가 | Zod와 교차 참조 | 검사 정의가 있다. |
| 저장소의 참조 자산이 존재하는가 | `content:check` | 경로와 파일 존재를 확인한다. |
| 실제 개인 콘텐츠인가 | 프로덕션 준비 검사 | 코드가 있으나 기본 CI에서는 비활성이다. |
| 공개 URL이 유효한가 | 프로덕션 준비 검사 | 일부 정적 조건만 확인하며 도달성은 검사하지 않는다. |
| 템플릿이 비색인 지시를 내보내는가 | 메타데이터와 robots E2E | 검사 정의가 있다. |
| 다섯 디자인과 활성 라우트가 렌더링되는가 | Playwright 행렬 | 첫 프로젝트 상세까지만 포함한다. |
| 자동 접근성 규칙을 통과하는가 | axe 행렬 | 랜드마크와 axe는 활성 라우트, 건너뛰기 링크는 홈에서 확인한다. |
| 지정 화면이 기준 이미지와 일치하는가 | `@visual` 15개 스냅샷 + manifest Vitest | 로컬 Playwright가 pixel을, Vitest가 정확한 PNG 집합만 확인한다. |
| 라우트 번들이 예산 안에 있는가 | `bundle:check` | 압축 전 클라이언트 자산을 비교한다. |
| Lighthouse 목표를 만족하는가 | LHCI | 데스크톱 10개 URL의 실험실 환경 측정이다. |
| `standalone` 핵심 파일이 있는가 | `build:verify` | 두 경로의 존재만 확인한다. |
| Docker가 정적 자산을 제공하는가 | `test:container` | tracked public asset의 HTTP·MIME을 확인한다. |
| Docker가 runtime 값을 받을 수 있는가 | container env | production 값의 제공·정합성은 배포 환경 책임이다. |
| 실제 배포 주소가 응답하는가 | 없음 | 저장소 안에서는 확인하지 않는다. |
| 부하, 장애와 복구가 검증되었는가 | 없음 | 현재 검사 범위에 포함되지 않는다. |

이 표는 각 자동 검사가 직접 닫는 범위다. 변경 후 검사를 다시 실행하고 저장된 baseline이나 설정만으로 현재 checkout의 통과를 주장하지 않는다.
