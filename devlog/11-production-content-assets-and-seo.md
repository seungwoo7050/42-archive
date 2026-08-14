# 템플릿 콘텐츠를 공개 가능한 사이트로 판정하기

## 관련 커밋

- `9891f1a` — `feat(content): production readiness 규칙 추가`
- `e566219` — `build(content): readiness 검사를 prebuild에 연결`
- `648bf6f` — `feat(seo): 콘텐츠 mode별 indexing 정책 추가`
- `4011364` — `test(content): readiness와 indexing 계약 검증`
- `1891853` — `test(e2e): 콘텐츠 mode별 metadata와 robots 검증`
- `033691b` — `fix(font): 빌드용 글꼴을 저장소에서 제공`
- `8e5b7ca` — `test(font): 로컬 글꼴과 license 경계 검증`
- `5bff134` — `feat(seo): route metadata와 sitemap 추가`
- `a8d489a` — `feat(seo): 안전한 JSON-LD structured data 추가`
- `2729fd4` — `test(seo): route metadata·sitemap·JSON-LD 계약 검증`
- `edf8eff` — `feat(site): 사용자 정의 404 페이지 추가`
- `46da5d8` — `test(site): 404 복귀 동선 검증`

구조가 올바른 JSON과 공개할 준비가 된 포트폴리오는 같은 상태가 아니다. 이 저장소는
`content:check`와 `content:ready`를 분리해 전자는 schema·교차 참조·파일 존재를,
후자는 placeholder 교체와 공개 입력 조건을 맡긴다.

## template과 production mode

`PORTFOLIO_CONTENT_MODE`가 없거나 빈 문자열이거나 `template`이면 template mode다.
`production`만 공개 mode로 인정하며 다른 값은 오류다.

```ts
type PortfolioReadinessResult =
  | { mode: "template"; siteUrl: undefined }
  | { mode: "production"; siteUrl: URL };
```

template mode에서는 체크인된 `Your Name`, example project, `/template/` 자산을
허용하고 production readiness를 건너뛴다. `prebuild`가 `content:ready`를 호출하더라도
환경 변수를 지정하지 않은 `npm run build`는 template build다. 빌드 성공을 공개 준비
완료로 기록할 수 없는 이유다.

production mode는 문제를 하나 발견한 즉시 멈추지 않는다. 14개 콘텐츠 객체를
순회하며 placeholder, 자산, project link, contact와 `SITE_URL` 문제를 issue 목록으로
모아 `PortfolioReadinessError`에 담는다. 한 번의 실행으로 여러 입력을 함께 고칠 수
있게 한 실패 형식이다.

## 공개 origin과 URL 판정의 경계

`SITE_URL`은 absolute HTTP(S) URL이어야 한다. localhost·loopback, 예약 예시 domain,
`.example`·`.invalid`·`.test`, username과 password가 포함된 URL은 거부한다.
production 결과에는 이 검사를 통과한 `URL`이 들어간다.

모든 URL이 같은 강도로 검증되지는 않는다.

- project의 `isUsablePublicUrl()`은 HTTP(S)와 예약 domain, placeholder marker만 본다.
  localhost와 URL user info를 `SITE_URL`처럼 거부하지 않는다.
- contact는 `mailto:`·`tel:` prefix 또는 위 public URL 판정을 사용한다.
- 어느 검사도 DNS, TLS, URL 소유권이나 실제 HTTP 응답을 확인하지 않는다.

따라서 readiness 통과는 문자열 수준의 공개 후보 판정이다. 링크의 도달성과 소유권은
배포 후 검사가 필요하다.

## production 자산과 콘텐츠 조건

production에서는 social image, profile photo, resume download와 활성 project의
대표·보조 이미지를 `/content/` 아래에 두어야 한다. 활성 project가 하나 이상 있어야
하며 각 project에는 enabled public URL이 하나 이상 필요하다. contact placement에는
email, GitHub, website 중 사용할 수 있는 항목이 하나 이상 있어야 한다.

`/content/` prefix만으로 파일 존재를 알 수는 없다. 역할은 다음처럼 나뉜다.

```text
content:ready  → 공개용 경로와 placeholder 정책
content:check  → repository의 실제 파일과 JSON 참조
container HTTP 검사 → image 안에서 제공되는 body와 MIME
```

현재 container 명령은 기본 template image만 검사하므로 production `/content/` 묶음과
production runtime env가 함께 동작하는지는 공개 후보 절차에서 따로 확인해야 한다.
readiness는 문구의 사실성, 성과 수치, 이미지 품질과 링크 대상의 적절성도 판정하지
않는다.

## 빌드 시 외부 글꼴 의존성 제거

layout은 `next/font/local`로 저장소의 WOFF2 세 개를 등록한다. `src/app/local-fonts.test.ts`
는 Google Fonts import·endpoint가 없는지, 각 파일이 `wOF2` magic bytes를 갖는지,
OFL notice가 존재하는지 확인한다.

이 검사가 글꼴 전체의 무결성이나 glyph 범위, license 준수까지 증명하지는 않는다.
Geist Mono와 Source Han Serif KR는 `preload: false`, `display: optional`이다. 이는
preload와 늦은 교체를 줄이는 설정이지 지정 글꼴의 실제 사용을 보장하는 설정은 아니다.

## indexing과 metadata 계약

template mode에서는 root metadata가 `noindex, nofollow`, `/robots.txt`가 전체 경로
disallow, sitemap이 빈 배열이 된다. production mode에서는 검증된 origin을 기준으로
canonical, robots host, sitemap URL과 활성 route·project URL을 만든다.

`src/lib/site-metadata.test.ts`가 직접 확인하는 범위는 다음과 같다.

- mode별 root robots 정책과 `robots.txt` 생성 결과
- query를 제외한 route canonical과 콘텐츠 기반 title·description
- production sitemap의 활성 page와 project URL
- Person·WebSite·CreativeWork JSON-LD의 선택 필드
- `</script>` 같은 문자열을 JSON-LD에 넣을 때 `<`, `>`, `&`를 escape하는 serializer

`src/app/route-metadata.test.ts`는 여덟 route의 metadata export를 호출해 canonical과
콘텐츠 값을 확인한다. Playwright의 content-mode 테스트는 실행 중인 `/`의 robots
meta와 `/robots.txt` 응답을 확인하지만 `/sitemap.xml`, canonical, JSON-LD의 실제
HTTP 응답까지 검사하지 않는다.

robots와 noindex는 접근 제어가 아니다. 민감한 정보를 보호해야 한다면 배포를 막거나
인증 경계를 둬야 한다. JSON-LD serializer도 HTML parser 경계를 지킬 뿐, Schema.org
의미와 콘텐츠 사실성을 검증하지 않는다.

## 404와 누락된 browser 계약

custom `not-found.tsx`는 noindex metadata, 안내 heading과 home link를 제공한다.
`src/app/not-found.test.tsx`는 component를 jsdom에 렌더링해 heading과 link만 확인한다.
없는 project ID나 비활성 page가 실제 Next.js server에서 HTTP 404를 반환하는지,
응답 HTML에 noindex가 있는지는 현재 Playwright 행렬에 없다.

## 공개 release에서 함께 묶어야 할 것

공개 후보는 같은 release 입력으로 다음을 수행해야 한다.

```text
PORTFOLIO_CONTENT_MODE=production
SITE_URL=<실제 제어하는 origin>
content:check + content:ready
production build
동일한 runtime env
HTML + robots.txt + sitemap.xml + canonical + JSON-LD + asset URL 확인
```

현재 unit test와 설정은 각 생성 규칙의 하한선을 남긴다. 저장된 코드와 과거 결과만으로
새 배포의 origin, cache 시점과 실제 응답을 증명하지는 않는다.
