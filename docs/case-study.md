# 다시 구현하고 조건을 바꾸는 실습

이 문서는 완성 화면을 제품 사례로 평가하지 않는다. 같은 문제를 새 저장소에서
다시 해결하거나 현재 조건을 바꿀 때 필요한 구현 순서와 검증 질문을 제공한다.
실습 전에 [학습 문서 지도](./architecture.md)와
[다섯 renderer 계약](../architecture/five-design-renderers-and-interface-contracts.md)을
읽는다.

## 실습 1. 콘텐츠 한 건으로 첫 route 만들기

### 문제

App Router 설정만 있는 저장소에서 프로필 한 건과 project 한 건을 `/`에
표시한다. TypeScript, React와 Next.js를 처음 쓰는 단계이므로 다섯 디자인,
Zod와 production gate를 한 번에 넣지 않는다.

### 구현 순서

1. `src/app/layout.tsx`에 `<html>`, `<body>`와 전역 stylesheet import를 둔다.
   layout의 `children: React.ReactNode`는 route page가 들어갈 자리다.
2. 작은 TypeScript 콘텐츠 타입과 JSON 원본을 만든다. `photo` 같은 값은
   optional, resume URL처럼 “필드는 있지만 아직 값이 없음”을 구분해야 한다면
   nullable로 모델링한다.
3. `src/app/page.tsx`에서 원본을 읽고 profile과 project를 props로 component에
   전달한다.
4. 의미 구조를 `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`,
   heading과 link로 먼저 만든다.
5. CSS의 기본 flow에서 시작해 profile copy와 image가 나란히 놓일 수 있을 때만
   grid를 추가한다. 열이 최소 폭을 잃으면 한 열로 돌아간다.

설명을 위한 축약 코드는 다음과 같다. 저장소의 과거 소스를 그대로 복사한 것은
아니다.

```tsx
type Project = {
  id: string;
  title: string;
  summary: string;
  image?: { src: string; alt: string };
};

function ProjectCard({ project }: { project: Project }) {
  return (
    <article>
      <h2>{project.title}</h2>
      <p>{project.summary}</p>
      <a href={`/projects/${project.id}`}>사례 읽기</a>
    </article>
  );
}
```

### 완료 기준

- `/`가 공개 route가 되고 profile과 project 한 건이 서버 HTML에 있다.
- link는 이동을, button은 현재 화면의 동작을 맡는다.
- image가 있으면 의미 있는 alt와 크기/비율 공간이 있다.
- 좁은 폭에서 DOM 순서를 바꾸지 않고 가로 넘침이 없다.
- 정적 표현에는 불필요한 state나 effect가 없다.

첫 커밋 `a93f4ee`은 설치 가능한 App Router와 Design·Classic 최소 홈을 함께
제공한다. 위 실습은 그 실행 경계를 더 작은 학습 단계로 설명하지만, 독립 commit으로
만들 때는 source나 실제 검사가 없는 scaffold를 남기지 않는다.

## 실습 2. 원본과 표현을 분리해 두 디자인으로 확장하기

### 문제

같은 profile과 project를 밝은 card 화면과 어두운 terminal 화면으로 표시하되
콘텐츠 JSON을 복제하지 않는다.

### 구현 순서

1. URL query `view`를 presentation 상태의 source of truth로 정한다.
2. 지원 design ID를 union으로 제한하고 잘못된 값의 기본값을 정한다.
3. route page에서 project 관계와 표시할 link를 계산한 view model을 만든다.
4. registry가 design ID에 맞는 renderer를 선택하게 한다.
5. 공통으로 유지할 것은 콘텐츠 의미와 작은 component로 제한한다. shell과
   section markup이 달라져야 한다면 renderer가 소유한다.
6. design 이동 link가 현재 pathname과 authoring query를 보존하게 한다.

현재 저장소의 경계를 참고하면 다음 관계가 된다.

```text
JSON 원본
→ createHomeViewModel()
→ { route: "home", featuredProjects, heroLinks, metrics, ... }
→ renderDesignRoute("design" | "classic", request)
→ 서로 다른 server renderer
```

### React 상태를 추가할 판단

terminal의 글자가 시간에 따라 변하므로 command index, typed text와 phase는
local state가 필요하다. project card, heading, 기술 목록처럼 props에서 그대로
계산되는 값은 state로 복제하지 않는다.

effect는 다음 timeout 하나를 예약하고 cleanup이 이전 timeout을 해제해야 한다.
props나 state가 바뀌면 component 함수가 다시 실행되고 새 effect가 예약된다.
서버 HTML과 첫 client render는 같은 command와 phase로 시작해야 hydration
mismatch가 생기지 않는다. viewport나 `matchMedia`는 server render 중 읽지
않고 effect 안에서만 확인한다.

### 완료 기준

- 두 URL이 같은 canonical 콘텐츠와 같은 route view model을 사용한다.
- design별 navigation·profile·project·detail·contact 구조가 각각 설명된다.
- 한 디자인의 CSS나 local state가 다른 renderer에 침투하지 않는다.
- keyboard navigation, focus 표시와 reduced motion 조건을 두 화면에서 확인한다.
- 디자인 전환 뒤 pathname과 필요한 query가 보존된다.

## 실습 3. 다섯 renderer로 확장하기

### 문제

Editorial, Brutalist, Cinematic을 추가한다. “같은 HTML에 class만 바꾼다”가
아니라 지면, 번호 grid, image chapter처럼 의미 있는 구조 차이를 허용한다.

### 구현 순서

1. design ID를 schema, TypeScript union, design config와 registry에 추가한다.
2. presentation JSON에 label, description, UI copy와 section order를 넣는다.
3. renderer가 필요한 route view model만 받게 한다.
4. 전용 shell에서 skip link, header/navigation, main과 footer를 먼저 만든다.
5. home을 완성한 뒤 project index, detail, about, resume, contact, journey,
   interview-map을 모두 연결한다.
6. `next/image`를 쓴다면 width/height 또는 position과 크기를 소유하는
   `fill` container, 실제 열 폭에 맞는 `sizes`를 함께 둔다.
7. layout이 깨지는 콘텐츠 폭에서 breakpoint를 정한다. 기기 이름을 기준으로
   임의의 숫자를 고르지 않는다.
8. design×route 행렬과 mobile/reduced-motion/accessibility 검사를 확장한다.

### 변경 비용을 확인하는 질문

- route ID와 design ID를 몇 군데 중복 선언했는가?
- registry 경계에서 discriminated union이 느슨한 props로 바뀌지는 않는가?
- renderer가 project ID로 원본 배열을 다시 탐색하지 않는가?
- 전용 shell이 `PageShell`을 쓴다고 문서에 잘못 일반화하지 않았는가?
- external link의 새 창 정책과 accessible name이 다섯 디자인에서 같은가?
- CSS의 시각적 order가 DOM과 focus 순서를 바꾸지는 않는가?
- raw `<img>`와 `next/image`가 같은 asset에 서로 다른 비용을 만들지 않는가?

registry는 먼저 구현된 Design·Classic만 완전하게 등록한다. Editorial, Brutalist와 Cinematic은 각각 콘텐츠 계약, 전용 renderer와 registry 항목을 한 커밋으로 추가한다. 미구현 ID나 빈 loader map을 공개하지 않으며, Design·Classic route module 분리는 새 디자인 추가가 아니라 표현 책임의 이동이다.

## 실습 4. 외부 JSON을 안전한 입력으로 바꾸기

### 문제

TypeScript 단언만 사용한 JSON import는 runtime 오류를 막지 못한다. 구조,
파일 간 참조와 asset 존재를 단계별로 실패시킨다.

### 구현 순서

1. 파일마다 strict Zod schema를 만든다.
2. schema에서 파생할 타입과 수기로 유지할 domain 타입을 명시한다.
3. 모든 파일 parse가 끝난 뒤 ID 중복과 교차 참조를 검사한다.
4. 내부 link가 활성 route/project를 가리키는지 검사한다.
5. root-relative asset을 `public` 아래 실제 경로로 해석하고 탈출/부재를
   거부한다.
6. 오류에 파일과 JSON path를 붙이고 부분 콘텐츠를 반환하지 않는다.
7. 정규화와 view model은 검증을 통과한 값만 받게 한다.

### 반례

다음 값은 검사가 있어도 실패를 남길 수 있다.

- 접두사만 검사한 `https://`
- 달력 형식을 검사하지 않은 journey date
- 최소 길이가 없는 terminal command 배열
- 존재하지만 decode할 수 없는 image
- `external` flag와 scheme이 어긋난 link
- schema에서 파생되지 않은 수기 타입과 `as unknown as` 단언

완료 기준은 정상 JSON이 표시된다는 것만이 아니다. 잘못된 structure, unknown
reference, missing asset이 어느 경계에서 어떤 상태를 남기고 중단하는지 test로
구분해야 한다.

## 실습 5. production 공개 gate 설계하기

### 문제

예제 콘텐츠로는 개발을 계속할 수 있어야 하지만 공개 build에는 placeholder,
template asset와 잘못된 canonical origin이 남아서는 안 된다.

### 구현 순서

1. `template | production` mode를 runtime union으로 parse한다.
2. production에서 `SITE_URL`, profile/photo/resume/social image, 활성 project와
   공개 URL, contact 방법을 요구한다.
3. template은 noindex, robots disallow, 빈 sitemap과 JSON-LD 비출력을 적용한다.
4. production은 canonical, Open Graph/Twitter, sitemap과 structured data를
   실제 origin에 연결한다.
5. `prebuild`에 콘텐츠 구조와 readiness를 연결한다.
6. build 산출물과 runtime server에 같은 mode와 URL이 전달되는지 별도로 확인한다.
7. standalone runner가 `.next/static`과 `public/`을 모두 포함하는지 확인하고
   실제 HTTP asset 응답을 gate에 넣는다.

현재 저장소는 1~5와 `public/` 포함, route·asset container smoke를 자동화한다.
build와 runtime 환경 변수의 일치, metadata cache, 외부 proxy·DNS/TLS는 여전히
배포 환경에서 확인해야 한다. 자동 gate와 운영 책임을 같은 완료 상태로 합치지 않는다.

## 실습 6. 검사 하나가 증명하는 범위를 말하기

다음 표의 오른쪽 질문에 답할 수 있어야 검증을 설명한 것이다.

| 검사 | 확인하는 것 | 확인하지 못하는 것 |
| --- | --- | --- |
| TypeScript | props, union, import 경계의 정적 일치 | JSON/env 실제 값, browser layout |
| Zod/loader | runtime 구조와 정의된 교차 참조 | URL 도달성, 콘텐츠 사실성 |
| Vitest | 함수·view model·metadata의 지정 반례 | 실제 CSS layout과 browser/보조기기 조합 |
| Playwright | Chromium 조건의 route·interaction·overflow·axe | 모든 browser, screen reader, 실제 mobile |
| visual snapshot | 지정 viewport의 pixel 변화 | 의미 구조와 운영 데이터 전체 |
| bundle gate | manifest에 나타난 압축 전 JS/CSS 크기 | font/image/server bundle과 체감 속도 |
| Lighthouse | 통제한 desktop 실험실 지표 | 실제 사용자 분포와 안정적인 현장 성능 |
| `build:verify` | 두 standalone 경로 존재 | server 응답, runtime env |
| `test:container` | image의 route·asset·MIME·uid·종료 | 외부 proxy, DNS/TLS, 장시간 부하 |

저장된 Lighthouse와 route baseline은 과거 실행 결과다. 명령을 다시 실행하지
않고 현재 통과라고 말할 수 없다. 모바일 Lighthouse 파일은 관찰용이며 현재
강제 gate가 아니다.

## 결과를 평가하는 기준

이 프로젝트에서 확인할 수 있는 결과는 데이터 흐름, 구현된 gate와 저장된
검증 자료다. 사용자 수나 전환율은 측정 자료가 없으므로 성과로 쓰지 않습니다.

다음 질문에 코드와 test 위치로 답할 수 있으면 실습을 마친다.

- 콘텐츠 한 건이 원본에서 최종 HTML까지 어떤 함수를 지나는가?
- 공통 콘텐츠를 바꾸면 다섯 화면에 어떤 경로로 반영되는가?
- local state와 server-owned 콘텐츠의 수명은 어떻게 다른가?
- 잘못된 ID, image, URL, mode가 어느 단계에서 실패하는가?
- 한 design을 추가할 때 어떤 타입·renderer·CSS·검증 행렬이 함께 바뀌는가?
- unit test, browser test와 Lighthouse가 각각 증명하지 못하는 것은 무엇인가?
- build 성공과 실제 standalone/Docker 공개 준비는 왜 다른 상태인가?
