# 테스트 행렬과 접근성 하한선

## 관련 커밋

- `f8ced21` — `test(content): Vitest 기반 콘텐츠 계약 검증 추가`
- `1e78f4d` — `test(routes): 홈과 route presentation 계약 검증`
- `4f1598e` — `test(ui): 디자인 선택과 프로젝트 링크 계약 검증`
- `c15bb14` — `test(e2e): 다섯 디자인의 route matrix 검증`
- `9c33268` — `test(design): view model 기반 renderer matrix 검증`
- `63f1fce` — `fix(a11y): 디자인별 색상 대비 보정`
- `c9ae0d7` — `fix(a11y): skip link focus target 복원`
- `5dc334b` — `fix(a11y): Brutalist 지표의 definition semantics 수정`
- `cae295d` — `test(a11y): 디자인×route WCAG 행렬 추가`
- `9433278` — `test(design): 독립 renderer와 design token 경계 검증`

같은 콘텐츠와 view model을 사용해도 다섯 renderer의 DOM, CSS와 상호작용은 서로
다르다. 검증은 design과 route를 두 축으로 만들고, 빠른 정적·jsdom 검사와 실제
Chromium 검사를 겹쳐 배치한다. 각 층은 다른 실패를 찾으며 서로를 대체하지 않는다.

## 검사 층과 책임

| 검사 | 직접 확인하는 것 | 확인하지 못하는 것 |
| --- | --- | --- |
| TypeScript | strict type, import/export, route union | runtime JSON, CSS, browser 동작 |
| content unit | schema, 참조, selector, readiness 반례 | 실제 network와 asset decode |
| jsdom page/component | 반환 DOM, heading, attribute, focus helper | layout, 실제 navigation, paint |
| 개발 Playwright | webpack dev server와 browser interaction | production build 산출물 |
| production Playwright | build 뒤 Next.js server의 동작 | production 콘텐츠 mode 자동 활성화 |
| axe·성능 spec | 선택한 자동 규칙과 정해진 시나리오 | 수동 접근성 검토와 실제 사용자 분포 |

Vitest는 `src/**/*.test.{ts,tsx}`만 jsdom에서 실행한다. 현재 별도의 code coverage
provider나 최소 비율 설정은 없다. 테스트 파일 수나 통과 여부를 statement·branch
coverage 수치로 바꾸어 말할 근거도 없다.

두 Playwright config는 모두 worker 하나와 Chromium의 Desktop Chrome·Pixel 7
profile을 사용한다. 개발 config는 port 3100의 webpack dev server를 재사용할 수 있고,
production config는 기존 서버를 재사용하지 않고 port 3200의 `next start`를 띄운다.
두 profile은 viewport·user agent 설정이 다르지만 browser engine은 모두 Chromium이다.

## design×route 공용 행렬

`tests/e2e/site-matrix.ts`는 다섯 design ID와 여덟 route 후보를 정의한다.

```text
/, /projects, /projects/<첫 활성 project>, /about,
/resume, /contact, /journey, /interview-map
```

`site.json#pages`에서 비활성화한 page는 행렬에서 제외한다. 이 방식은 여러 spec의
대상 목록이 어긋나는 문제를 줄이지만 source 목록 자체가 빠뜨린 route는 모든 spec이
함께 놓친다. 비활성 page가 404인지도 이 필터로는 확인할 수 없다.

`tests/e2e/portfolio.spec.ts`는 각 design에서 활성 route의 응답, design root,
`main`, 첫 `h1`, 가로 overflow와 대표 콘텐츠를 확인한다. 별도 시나리오는 design 전환
시 현재 route와 `debug=content` 보존, 잘못된 design의 Editorial fallback, reduced
motion, mobile navigation과 44px touch target 일부를 다룬다.

한 design의 route 여러 개를 하나의 test 안에서 차례로 순회하므로 앞 route가 실패하면
뒤 route의 assertion은 실행되지 않는다. 대표 문자열과 기본 DOM이 보인다는 결과를
모든 section·link·image의 정확성으로 확대해서는 안 된다.

jsdom에도 별도의 다섯 design×여덟 route 행렬이 있다. view model이 각 renderer의
root와 non-empty `h1`까지 연결되는지 빠르게 확인하지만 CSS, image decode, accessibility
tree와 hydration은 보지 않는다.

## axe 행렬이 확인하는 접근성 범위

`tests/e2e/accessibility.spec.ts`는 각 design에서 모든 활성 route를 열어 다음을
확인한다.

- HTTP 응답 성공과 선택한 design root
- `main`, `banner`, `contentinfo`가 각각 하나인지
- axe의 `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` tag 규칙에서
  violation이 없는지

test 이름에는 “WCAG 2.2 AA”가 들어가지만 결과는 axe가 자동 판정할 수 있는 tag
규칙의 통과다. WCAG 전체 적합성이나 특정 screen reader 지원을 뜻하지 않는다.

skip link는 design마다 home route에서 실제 `Tab`과 `Enter`를 보내 link focus와
`main` focus 이동을 확인한다. 모든 route의 skip link를 반복하지는 않는다. mobile
navigation 테스트는 일부 summary·link·close button의 44×44 크기와 keyboard focus
표시를 확인하지만 사이트의 모든 interactive element를 전수하지 않는다.

다음 항목은 자동 행렬 밖에 남는다.

- heading과 alt 문구의 의미, 새 창 이동의 충분한 고지
- hover·focus의 모든 색상 대비와 focus 순서
- 200%·400% zoom, 긴 번역 문구, forced-colors
- screen reader별 browse/form mode
- Firefox, WebKit과 실제 Android·iOS 기기
- 비활성 page와 없는 project ID의 실제 HTTP 404·noindex

axe 결과는 반복 가능한 하한선이며 수동 접근성 검토 완료 보고가 아니다.

## 시각 회귀와 CI의 차이

`tests/e2e/visual.spec.ts`는 reduced motion을 적용하고 font와 image 준비를 기다린 뒤
화면 전체를 비교한다. 기준 PNG는 design마다 home desktop/mobile 두 장과 project
detail desktop 한 장, 모두 15장이다. 허용 차이는 `maxDiffPixelRatio: 0.01`이다.

`src/designs/visual-regression-contract.test.ts`는 정확한 파일명 집합만 확인한다. PNG의
pixel 내용은 Playwright가 실제 `toHaveScreenshot()`을 실행할 때만 비교된다.
`test:e2e:production`은 시각 spec을 포함하지만 CI의 `test:e2e:ci`는 Linux 환경 차이를
분리하려고 `@visual`을 제외한다. 따라서 CI 통과는 15개 snapshot의 현재 pixel 일치를
증명하지 않는다.

현재 config에는 Playwright retry 횟수, HTML report 보존, CI artifact 업로드가 없다.
trace 설정은 `on-first-retry`지만 retry가 따로 설정되지 않은 현재 실행에서는 실패
증거 보존 수단으로 기대하기 어렵다.

## 리팩터링 보호막으로서의 의미

이 행렬은 기능을 처음 만들기 전에 작성된 명세가 아니라, 이미 연결된 route와
renderer의 특성을 고정한 뒤 module·page·view model 책임을 나눌 때 사용한 보호막이다.
root·heading 같은 넓은 행렬과 contact·selector 같은 생산자 단위 test를 함께 둔 이유도
여기에 있다. 넓은 행렬은 연결 단절을 찾고, 좁은 test는 어떤 계약이 깨졌는지 설명한다.

저장된 test와 snapshot은 실행 규칙이다. 현재 checkout에서 실제 명령을 다시 실행하지
않은 상태를 “통과”로 표현해서는 안 된다.
