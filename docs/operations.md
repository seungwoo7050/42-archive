# 운영 입력과 배포 확인 절차

이 문서는 template 콘텐츠를 편집하고 production 공개 후보를 확인할 때 실행할
절차를 정리한다. gate의 내부 흐름과 실패 원인은
[배포 준비 architecture](../architecture/production-readiness-and-quality-gates.md),
입력별 복구 방법은 [콘텐츠 편집 절차](./content-pipeline.md)에서 확인한다.

## 네 상태를 따로 판정하기

| 상태 | 운영자가 확인할 결과 | 대표 명령 또는 확인 |
| --- | --- | --- |
| 콘텐츠 구조 | JSON 구조·참조와 repository asset이 유효하다. | `npm run content:check` |
| 공개 입력 | placeholder를 교체하고 실제 origin·asset·link를 제공했다. | production `npm run content:ready` |
| build 산출물 | Next production build와 standalone 핵심 경로가 있다. | `npm run build`, `npm run build:verify` |
| 실행 배포물 | image가 비루트로 시작하고 route·`public/` 응답이 정상이다. | `npm run test:container`; proxy/DNS/TLS는 배포 뒤 확인 |

앞 단계의 성공은 다음 단계의 성공을 뜻하지 않는다. 특히
`test:e2e:production`의 `production`은 Next.js production build/server를
뜻하며 `PORTFOLIO_CONTENT_MODE=production`을 자동 설정하지 않는다.

## template mode에서 편집하기

변수가 없거나 빈 문자열이거나 다음처럼 명시하면 template mode다.

```sh
export PORTFOLIO_CONTENT_MODE=template
npm run content:check
npm run build
```

예제 이름과 `/template/` asset을 허용하는 대신 다음 검색 출력을 사용한다.

- root robots metadata는 `noindex`, `nofollow`다.
- `/robots.txt`는 전체 경로를 disallow한다.
- `/sitemap.xml`은 빈 배열이다.
- Person·WebSite·CreativeWork JSON-LD를 출력하지 않는다.

이 상태의 build 성공을 공개 준비 완료로 기록하지 않는다.

## production 입력 준비하기

실제 공개 origin을 build와 runtime에 같은 값으로 제공한다.

```sh
export PORTFOLIO_CONTENT_MODE=production
export SITE_URL="https://replace-with-an-origin-you-control.example"
npm run content:check
npm run content:ready
```

예시 URL의 `.example`은 예약 domain이므로 그대로는 실패한다. scheme·host와
필요한 port로 이루어진, 실제로 제어하는 public origin으로 바꾼다.

공개 후보에는 다음 입력이 필요하다.

- placeholder가 아닌 profile과 콘텐츠 문구
- `/content/` 아래 profile·social image, resume와 활성 project image
- 활성 project와 사용할 수 있는 공개 project URL
- contact 배치에서 사용할 email, GitHub 또는 website
- localhost·loopback·예약 예시 domain·인증 정보를 쓰지 않는 `SITE_URL`

readiness는 DNS, TLS certificate, HTTP 응답, 루프백 이외 사설망 전체, 이미지
decode와 콘텐츠 사실성을 검사하지 않는다. marker 기반 placeholder 판정에도
false positive/negative가 가능하다. 이 범위는
[콘텐츠 gate 설명](../architecture/production-readiness-and-quality-gates.md#콘텐츠-게이트)을
기준으로 해석한다.

## build와 runtime의 불변식

공개 후보는 다음 세 조건을 한 묶음으로 관리한다.

1. `content:ready`, `next build`와 실행 server가 같은
   `PORTFOLIO_CONTENT_MODE`·`SITE_URL`을 본다.
2. 실행 디렉터리에 `.next/standalone`, `.next/static`과 `public/`이 함께 있다.
3. proxy가 실제 공개 host와 protocol을 일관되게 전달하고 TLS가 그 host에서
   끝난다.

Dockerfile은 `.next/standalone`, `.next/static`과 `public/`을 runner에
명시적으로 복사한다. `test:container`는 image를 시작해 route·tracked asset의
HTTP 200, MIME, 비루트 process와 종료 정리를 확인한다. 다만 builder의 두 환경
변수는 새 runner stage에 자동 상속되지 않으므로 배포 환경이 runtime 값을 별도로
제공해야 한다.

mode가 build와 runtime에서 다르면 검색 표면도 갈릴 수 있다.

- template build 뒤 runtime만 production이면 전체 production readiness를
  거치지 않은 콘텐츠가 request-time JSON-LD/index 경로에 들어갈 수 있다.
- production build 뒤 runner env가 없으면 request-time layout·page는
  template/noindex로 돌아갈 수 있다.
- `robots.ts`와 `sitemap.ts`가 build에서 cache됐다면 production 결과를
  유지할 수 있어 request-time HTML과 서로 다른 mode를 나타낼 수 있다.

metadata route의 build/cache 분류는 runtime 변수만으로 같게 바뀐다고 가정하지
않는다. 배포 뒤 HTML, robots와 sitemap을 각각 요청해 최종 결과를 판정한다.
요청 시점과 cache 계약은
[요청·배포 gate 설명](../architecture/production-readiness-and-quality-gates.md#gate가-실행되는-시점)에
둔다.

## 공개 후보 검사 순서

같은 shell environment에서 다음 검사를 실행한다.

```sh
export PORTFOLIO_CONTENT_MODE=production
export SITE_URL="https://replace-with-an-origin-you-control.example"

npm run lint
npm run typecheck
npm run content:check
npm run content:ready
npm run test
npm run test:e2e:production
npm run build:verify
npm run test:container
npm run bundle:check
npm run lighthouse:audit
```

실제 URL을 넣지 않으면 readiness가 먼저 실패해야 한다.
`test:e2e:production`은 내부에서 build를 다시 실행하므로 별도 `npm run build`
결과를 재사용하지 않는다. 저장된 Lighthouse와 bundle baseline은 과거
실행값이며 위 명령의 현재 통과를 대신하지 않는다. 각 검사와 threshold,
브라우저·보조기기 비보장은
[품질 gate 표](../architecture/production-readiness-and-quality-gates.md#검사-설정과-대상)에서
확인한다.

## 자동 container 검사와 배포 뒤 확인

`npm run test:container`는 로컬 image의 root·public asset 응답, MIME, 비루트
실행과 종료 정리를 닫는다. 아래 항목 중 외부 환경에 의존하는 조건은 배포 뒤 별도로 확인한다.

- `/`와 활성 project detail이 HTTP 200으로 응답한다.
- profile/project image, font와 resume PDF가 non-empty body와 예상 MIME으로
  응답한다.
- production `/robots.txt`, `/sitemap.xml`, canonical과 JSON-LD origin이
  `SITE_URL`과 같다.
- HTML의 robots metadata가 production index/follow 정책이다.
- server process가 비루트 사용자로 실행되고 SIGTERM에 예상대로 종료한다.
- proxy가 잘못된 `x-forwarded-host`나 `x-forwarded-proto`를 만들지 않는다.
- public DNS와 TLS certificate가 실제 공개 host를 가리킨다.
- keyboard focus, heading·alt 의미, 새 창 고지, 200% 확대, forced colors와
  실제 screen reader 동작을 사람이 확인한다.

Playwright는 Desktop Chrome과 Pixel 7 profile을 쓰지만 모두 Chromium
계열이다. Lighthouse는 desktop 실험실 측정이다. 실제 Android/iOS browser,
Firefox/WebKit, 보조기기와 실사용자 성능을 위 자동 검사로 대신하지 않는다.

## 배포 대상과 비범위

현재 대상은 self-hosted Node standalone server와 이를 담으려는 Docker
image다. 특정 cloud provider, CDN, CMS, database, authentication, analytics,
실사용자 monitoring, load test와 장애 복구 자동화는 범위 밖이다.

문서와 저장된 baseline은 현재 checkout의 통과 보고를 대신하지 않는다. 배포
후에는 자동 gate와 함께 실제 origin, proxy, DNS/TLS 응답을 다시 확인한다.
