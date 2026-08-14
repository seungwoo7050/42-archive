# 포트폴리오 사이트

하나의 profile·project·contact 콘텐츠를 다섯 디자인으로 표현하는 Next.js App
Router 프로젝트다. `src/content`의 JSON을 runtime에 검증하고 route별 view
model로 바꾼 뒤 Design, Classic, Editorial, Brutalist, Cinematic renderer가
공유한다.

이 저장소는 디자인의 우열을 평가하는 결과물이 아니라 콘텐츠 구조와 화면 표현,
server rendering과 hydration, 반응형·접근성·성능 기준을 함께 학습하는
구현이다.

## 실행 계약

- Node.js `24.18.0`
- npm `11.16.0`
- Next.js `16.2.11`, React `19.2.4`

버전은 `.node-version`, `.nvmrc`, `package.json`의 `engines`와
`packageManager`, Dockerfile과 CI가 함께 고정한다.

```sh
npm ci
npm run dev
```

개발 서버는 `http://localhost:3100`에서 webpack 개발 compiler로 실행된다.
`?view=design|classic|editorial|brutalist|cinematic`으로 표현을 고르고
`?debug=content`로 화면 문구의 JSON 위치를 표시할 수 있다. 기본 디자인
`editorial`은 URL에서 `view`를 생략한다.

## route와 정적 자산

지원 화면은 `/`, `/projects`, `/projects/[projectId]`, `/about`, `/resume`,
`/contact`, `/journey`, `/interview-map`이다. page 활성 상태와 project ID에
따라 `notFound()`가 처리한다. `src/app/layout.tsx`가 root layout과 local
font, global stylesheet, root metadata를 연결하고 `favicon.ico`,
`robots.ts`, `sitemap.ts`가 file-based metadata 진입점이다.

JSON에서 가리키는 예제 asset은 `public/template/`, 공개 asset은
`public/content/`에 둔다. Docker runner는 `public/`을 명시적으로 복사하며
`npm run test:container`가 실제 route와 tracked asset 응답을 확인한다.

## 콘텐츠 mode와 build

기본 `template` mode는 예제 값을 허용하고 검색 비색인 정책을 사용한다.

```sh
npm run content:check
npm run build
npm run start
```

`npm run build`는 `prebuild`에서 `content:check`와 `content:ready`를 먼저
실행한 뒤 `next build --webpack`을 호출한다. `next.config.ts`의
`output: "standalone"`에 따라 `.next/standalone`과 `.next/static`이 주요
산출물이다.

공개 후보는 제어하는 실제 origin과 production mode를 명시해야 한다.

```sh
export PORTFOLIO_CONTENT_MODE=production
export SITE_URL="https://your-controlled-public-origin.example"
npm run build
```

위 URL은 형식을 보여 주는 자리표시자다. 실제 값으로 교체하지 않으면 readiness
검사에서 거부된다. production mode는 placeholder, profile·social image,
resume, 활성 project와 공개 link, contact 방법과 `/content/` asset을 검사한다.
`PORTFOLIO_CONTENT_MODE`와 `SITE_URL`은 server 전용이며 브라우저 공개 값으로
만들 필요가 없다. secret을 `NEXT_PUBLIC_*` 이름으로 두면 build 시 browser
bundle에 인라인될 수 있으므로 사용하지 않는다.

## 검증 명령

```sh
npm run lint
npm run typecheck
npm run content:check
npm run test
npm run test:e2e:production
npm run build:verify
npm run test:container
npm run bundle:check
npm run lighthouse:audit
```

`test:e2e:production`의 `production`은 production Next build/server를 뜻하며
production 콘텐츠 mode를 자동으로 설정하지 않는다. Lighthouse와 bundle
baseline은 저장된 과거 측정값이지 현재 checkout의 통과 증거가 아니다. 변경 후에는 해당 명령을 다시 실행하고 생략한 검사를 결과와 함께 기록한다.

## 문서

- [학습 순서와 문서 지도](docs/architecture.md)
- [개발 명령과 설정](docs/development.md)
- [콘텐츠 편집과 실패 복구](docs/content-pipeline.md)
- [운영 입력과 배포 절차](docs/operations.md)
- [다시 구현하는 실습](docs/case-study.md)
- [구현 인과관계를 기록한 devlog](devlog/README.md)
- [콘텐츠 원본에서 HTML까지의 구조](architecture/content-to-deployment.md)
- [요청·server rendering·hydration 경계](architecture/request-rendering-and-hydration-boundary.md)
- [다섯 디자인의 renderer 계약](architecture/five-design-renderers-and-interface-contracts.md)
- [production readiness와 품질 gate](architecture/production-readiness-and-quality-gates.md)

## 현재 지원 범위와 비범위

저장소는 정적 JSON 콘텐츠, 다섯 표현, self-hosted Next server용 standalone
산출물, Chromium 기반 browser 검사와 desktop Lighthouse gate를 다룬다.
CMS·database·인증·사용자별 server 상태, 외부 image host, analytics, 특정
hosting provider와 실제 reverse proxy/TLS 설정은 포함하지 않는다.

Playwright와 axe는 모든 browser·screen reader 조합을 증명하지 않는다.
Lighthouse는 통제된 실험실 측정이며 실제 사용자 성능을 대신하지 않는다.
콘텐츠 readiness는 형식과 marker를 확인할 뿐 경력·성과 문구의 사실성이나
디자인 품질을 판정하지 않는다.
