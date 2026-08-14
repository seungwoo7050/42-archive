# 다섯 디자인의 렌더러와 화면 계약

이 문서는 같은 콘텐츠를 다섯 화면으로 바꾸는 현재 구조를 비교한다. 색이나
폰트의 미적 우열은 다루지 않는다. 어떤 route view model이 어느 renderer로
들어가고, 각 renderer가 navigation·본문·이미지·접근성 책임을 어떻게 나누는지를
코드와 연결한다. 콘텐츠 원본에서 view model까지의 흐름은
[콘텐츠와 배포 입력](./content-to-deployment.md), 요청과 hydration 시점은
[요청 렌더링 경계](./request-rendering-and-hydration-boundary.md)를 먼저 본다.

## 선택 경로와 공통 입력

화면 선택 상태의 소유자는 React 전역 상태가 아니라 URL이다.

```text
/?view=design
/projects?view=classic
/projects/<projectId>?view=cinematic&debug=content
```

`src/lib/portfolio/page-context.ts`가 `searchParams`를 읽고 지원하는
`SiteDesignId`를 결정한다. 값이 없거나 지원하지 않으면
`presentation.defaultHomeTemplate`을 사용한다. 기본값인 `editorial`은 내부
링크를 만들 때 `view` query를 생략한다. `debug=content`는 콘텐츠 원본 위치를
표시하는 authoring 상태이며 디자인 링크와 내부 이동에서 보존한다.

현재 `src/designs/registry.tsx`의 핵심 경계는 다음과 같다.

```tsx
// 현재 소스에서 경계만 발췌
const routeLoaders: Record<SiteDesignId, () => Promise<DesignModule>> = {
  design: () => import("./design"),
  classic: () => import("./classic"),
  editorial: () => import("./editorial"),
  brutalist: () => import("./brutalist"),
  cinematic: () => import("./cinematic"),
};

export async function renderDesignRoute(designId, props) {
  const { default: Renderer } = await routeLoaders[designId]();
  return <Renderer content={props.viewModel} route={props.route} /* ... */ />;
}
```

동적 `import()`는 renderer module의 선택 경계를 만든다. 이것만으로 브라우저에
선택한 디자인의 CSS와 JavaScript만 전송된다고 단정할 수는 없다. 실제 route
bundle은 webpack client-reference manifest를 읽는 `bundle:check`가 별도로
계산하며, 저장된 기준에는 여러 route가 비슷한 크기의 공통 CSS·JavaScript를
가진다.

모든 renderer가 받는 route는 다음 여덟 종류다.

| route ID | App Router 경로 | view model |
| --- | --- | --- |
| `home` | `/` | `HomeViewModel` |
| `projects` | `/projects` | `ProjectIndexViewModel` |
| `project-detail` | `/projects/[projectId]` | `ProjectDetailViewModel` |
| `about` | `/about` | `AboutViewModel` |
| `resume` | `/resume` | `ResumeViewModel` |
| `contact` | `/contact` | `ContactViewModel` |
| `journey` | `/journey` | `JourneyViewModel` |
| `interview-map` | `/interview-map` | `InterviewMapViewModel` |

`PortfolioRouteViewModel`은 `route`를 판별자로 쓰는 union이다. page에서
`renderDesignRoute()`를 호출하는 시점에는 route와 view model이 맞물린
`DesignRouteRequestProps`가 정적으로 검사된다. registry는 이 값을
`DesignRouteProps`라는 더 느슨한 형태로 바꾸고, 세 단일 파일 renderer는 내부
함수에 넘기며 구체 view model로 다시 단언하기도 한다. 따라서 새 route를
추가할 때는 schema나 App Router 파일만 고치면 끝나지 않는다. route ID 타입,
view model union, registry 요청 타입, 다섯 renderer와 테스트 행렬이 함께
바뀌어야 한다.

project detail에는 같은 객체가 두 경로로 전달되는 중복 계약도 있다.

```ts
// 현재 src/designs/registry.tsx에서 축약
const rendererProps = {
  content: props.viewModel,
  project:
    props.viewModel.route === "project-detail"
      ? props.viewModel.project
      : undefined,
  route: props.route,
};
```

Design·Classic detail은 `content.project`를 읽지만
Editorial·Brutalist·Cinematic detail은 top-level optional `project`를 먼저
확인한다. registry가 둘 중 하나만 갱신하면 같은 요청에서 디자인별 결과가
갈라질 수 있다. 정상 App Router page는 없는 ID를 `notFound()`로 먼저 닫고
registry는 detail view model의 project를 두 위치에 넣는다. 따라서 세
renderer의 missing branch는 정상 page 경로보다 직접 호출·깨진 props에 대한
대체 경로다. 이 중복을 제거하려면 다섯 consumer와 registry contract test를
한 번에 바꿔야 한다.

## 공통 책임과 디자인 전용 책임

view model까지의 공통 책임은 다음과 같다.

- 비활성 콘텐츠를 제외하고 project·link·group 관계를 정리한다.
- 홈의 featured project와 지표, 상세의 stack item과 supporting image,
  journey와 interview map의 project 참조를 미리 연결한다.
- footer link와 profile·site·presentation처럼 모든 화면이 읽는 값을 넣는다.
- route에 필요 없는 원본 필드는 `never`로 막는다.

renderer가 맡는 전용 책임은 다음과 같다.

- landmark 안에서 section과 heading을 어떤 순서로 배치할지 정한다.
- 같은 project를 card, archive row, spread, numbered grid, chapter 중 어떤
  의미 구조로 표현할지 정한다.
- desktop navigation을 좁은 폭에서 어떤 native `<details>` 메뉴로 바꿀지
  정한다.
- `<img>`와 `next/image`, width/height와 `fill` 중 이미지 경로를 고른다.
- focus 표시, 읽기 순서, reduced motion과 긴 콘텐츠가 레이아웃을 깨뜨리지
  않는 조건을 CSS로 지킨다.

`DesignSwitcher`만 다섯 shell이 직접 공유한다. `PageShell`,
`ProjectCard`, `JourneyList`, `StackList` 같은 공통 component는 Design과
Classic이 사용한다. Editorial·Brutalist·Cinematic은 각각 전용 shell과
markup을 갖는다. 그러므로 “다섯 디자인이 공통 shell에 CSS만 다르게 입힌다”는
설명은 틀리다.

## Design: 공통 UI를 먼저 조립하는 product/case-study 화면

### 구조와 학습 목표

`src/designs/design/index.tsx`는 여덟 route 파일을 switch로 분기한다.
`home-route.tsx`, `projects-route.tsx`, `project-detail-route.tsx`처럼
route마다 파일을 나누고 `src/components/portfolio/site-shell.tsx`의
`PageShell`을 사용한다. 공통 component와 route 전용 조립의 경계를 처음
학습하기 좋은 구조다.

홈은 profile 텍스트와 lead project 이미지를 나란히 놓은 hero에서 시작한다.
그 뒤 section 순서는 코드에 고정하지 않고
`presentation.home.design.sections`를 순회한다.

```tsx
// 현재 src/designs/design/home-route.tsx에서 축약
<PageShell {...shellProps}>
  <HeroSection content={content} /* ... */ />
  {sections.map((sectionId) => (
    <HomeSection key={sectionId} sectionId={sectionId} /* ... */ />
  ))}
</PageShell>
```

`HomeSection`의 조건부 렌더링은 `featured`, `workMap`,
`technicalFocus`, `stack`, `journey`, `contact`를 각각 다른 section으로
연결한다. 배열의 `key`는 section ID이므로 presentation 배열을 재정렬해도
React가 같은 의미의 section을 식별한다. 이 화면은 별도 local state 없이
props와 파생 값만으로 렌더링된다.

### route별 표현

- navigation은 `PageShell`의 sticky header를 사용한다. desktop nav는
  `md` 이상에서, 좁은 화면은 native `<details>` 메뉴로 제공한다.
- profile/introduction은 profile 사진이 있을 때만 조건부로 표시하고, 이름,
  역할, headline, summary를 하나의 hero heading 흐름으로 둔다.
- project 목록은 `ProjectCard`와 group view model을 사용한다. 카드의 이미지
  링크와 제목 링크는 같은 상세 URL을 가리키지만 카드 전체를 중첩 링크로 만들지
  않는다.
- project detail은 problem, solution, architecture, decisions, tradeoffs,
  results를 case-study section으로 나누고 detail link만 표시한다.
- contact route와 홈 preview는 `ContactViewModel` 또는
  `preferredContactLinks`를 사용한다. link인지 button인지 콘텐츠 동작에 따라
  유지한다.

Design과 Classic의 `ProfilePhoto`·`ProjectScreenshot`은 일반 `<img>`를
쓴다. `aspect-ratio`, width와 object-fit으로 공간을 예약하지만 브라우저별
responsive `srcset`을 생성하지 않는다. 이미지 alt는 JSON schema에서 빈
문자열을 거부하나, 문구가 실제 이미지를 정확히 설명하는지는 사람이 확인해야
한다.

### layout과 완료 기준

전역 Tailwind utility와 `[data-site-design="design"]` 역할 token을 함께
사용한다. `max-w-6xl`, flex, grid, `lg:grid-cols-*`가 넓은 화면의 두 열을
만들고 작은 폭에서는 기본 block flow로 돌아간다. 이 디자인의 완료 기준은
여덟 route가 같은 Design shell을 사용하고, section 순서와 project 관계를
view model로 받아 desktop/mobile에서 가로 넘침 없이 표시하는 것이다.

## Classic: 같은 공통 경계에 브라우저 상태를 한 곳만 추가하기

### 구조와 학습 목표

`src/designs/classic/index.tsx`도 여덟 route 파일로 분기하고 `PageShell`과
공통 project·journey component를 사용한다. 전역 role token을 어두운 배경과
terminal 색으로 바꾼다. Design과 비교하면 “표현을 바꾸기 위해 콘텐츠를
복제할 필요는 없지만, 의미 구조를 독립적으로 바꾸려면 renderer 파일은 분리해야
한다”는 경계를 볼 수 있다.

Classic 홈의 고유 경계는 `AnimatedTerminal`이다.

```tsx
// 현재 src/designs/classic/home-route.tsx에서 발췌
<AnimatedTerminal
  ariaLabel={content.presentation.ui.animatedTerminalAriaLabel}
  profile={profile}
  projectCount={content.projectCount}
  stackCount={content.techStack.length}
  terminal={content.presentation.home.classic.terminal}
/>
```

이 component만 `"use client"`이며 command index, 입력된 문자열, phase를
state로 소유한다. timeout effect는 다음 state 전환을 예약하고 cleanup에서
이전 timeout을 해제한다. 다른 Classic section은 서버에서 정적인 HTML로 만들며
state를 두지 않는다.

### route별 표현과 위험

- home은 profile과 terminal을 두 열로 놓고, project section을 어두운 card로
  표현한다.
- projects는 terminal 요약과 group별 compact archive를 사용한다.
- detail/about/resume/contact/journey/interview-map은 별도 Classic 파일이지만
  여러 파일이 Design과 거의 같은 markup이고 active template만 다르다.

마지막 특성은 의도된 디자인 자유와 별개인 유지보수 위험이다. 예를 들어 heading,
새 창 고지 또는 landmark를 Design 한쪽에서만 고치면 색이 아니라 의미 구조가
달라진다. 관련 변경은 두 route 파일과 다섯 디자인 E2E 행렬을 함께 확인해야
한다.

좁은 화면 전환은 Design과 같은 `md` navigation 경계와 공통 timeline의
767px 조건을 사용한다. terminal은 폭을 넘는 문자열을 wrapping하고 출력 영역의
최소 높이를 유지한다. command 배열이 비면 schema parse는 통과하지만
`activeCommand.command` 접근에서 실행이 실패할 수 있으므로 콘텐츠 편집 단계의
수동 확인 대상이다.

완료 기준은 Design과 같은 route 계약을 유지하면서 Classic 홈의 terminal이
초기 HTML을 가리지 않고, reduced motion일 때 timeout 순환을 시작하지 않으며,
각 route가 `data-site-design="classic"`으로 식별되는 것이다.

## Editorial: 공통 component보다 문서의 읽기 구조를 우선하기

### 구조와 학습 목표

`src/designs/editorial/editorial-route.tsx`는 `EditorialRoute`와
`EditorialShell`, route별 view 함수를 한 module에 둔다. 공통 `PageShell`을
쓰지 않고 masthead, desktop navigation, native mobile menu, footer와 main을
직접 만든다. 여러 route가 한 시각 언어를 공유하지만 Design/Classic markup에는
종속되지 않는 방법을 보여 준다.

홈은 issue·cover-story 구조, project 목록은 editorial archive, 상세는
narrative·architecture·highlight·decision·result spread로 표현한다.
profile은 masthead와 cover copy에, contact는 전용 page와 footer link에
배치된다. 같은 `HomeViewModel`과 `ProjectDetailViewModel`을 받지만 card가
아니라 지면의 위계로 다시 조립한다.

### 이미지와 반응형 계약

`EditorialImage`는 모든 `next/image`에 width 1600, height 1000을 전달한다.
브라우저는 이 **선언된 16:10 비율**의 공간을 먼저 계산하고 Next.js image
최적화 경로를 사용한다. asset의 실제 비율을 읽어 props를 만드는 코드는 없다.
현재 template SVG는 320×400(4:5)이므로 선언과 intrinsic ratio가 다르다.
CSS의 `height: auto`, min/max-height와 함께 실제 표시가 바뀔 때 layout shift나
crop 위험이 남는다. asset validator도 pixel dimension을 검사하지 않는다.
외부 host는 허용하지 않으므로 `src`는 `/template/` 또는 `/content/` 아래
public asset이다.

```tsx
// 현재 src/designs/editorial/editorial-route.tsx에서 발췌
<Image
  alt={image.alt}
  height={1000}
  priority={priority}
  sizes={sizes}
  src={image.src}
  width={1600}
/>
```

CSS module은 1180px에서 masthead 간격을 줄이고, 900px에서 desktop nav를
mobile menu로 바꾸며 여러 열을 축소하고, 640px에서 지면을 한 열로 만든다.
숫자는 특정 기기 이름이 아니라 masthead·navigation·본문 열이 각자 최소 폭을
잃는 시점이다. DOM의 heading과 section 순서를 먼저 유지하고 grid 열만 바꾼다.

skip link의 목적지는 `tabIndex={-1}`인 `#editorial-main`이다. mobile menu의
`summary`와 link는 keyboard로 도달할 수 있다. 다만 menu를 dialog로 다루지
않으므로 focus trap이나 Escape 복귀 계약은 없다. 완료 기준은 여덟 route가
Editorial shell 안에서 독립된 읽기 순서를 갖고, 900px 전후 navigation이 같은
URL·focus 순서를 유지하는 것이다. image props의 비율은 실제 asset dimension과
대조해야 하며 현재 template SVG 불일치는 완료된 CLS 보장으로 취급하지 않는다.

## Brutalist: 시각적 번호와 의미 목록을 분리하기

### 구조와 학습 목표

`src/designs/brutalist/brutalist-route.tsx`는 `BrutalistRoute`가 route별
View를 선택하고 `BrutalistShell`이 공통 frame을 만든다. 굵은 border, 번호,
blue/yellow section, hard grid를 사용하되 숫자와 장식 문자는 `aria-hidden`으로
의미 트리에서 제외한다.

desktop header는 brand, route 상태, design switcher를 grid로 두고 navigation을
가로 목록으로 표시한다. home section 순서는
`presentation.home.brutalist.sections`가 정한다. projects는 큰 번호와 project
묶음, detail은 evidence·decision 구조, contact는 직접적인 link block으로
표현한다. resume·journey·interview map의 관계는 각 view model이 이미 해석한
project를 사용한다.

### layout·이미지·접근성 계약

CSS module은 980px에서 header/navigation과 다중 열을 줄이고, 720px에서
project·본문 grid를 단일 흐름에 가깝게 만들며, 430px에서 번호 rail과 여백을
다시 줄인다. grid의 시각적 위치를 바꾸더라도 DOM navigation과 main 순서는
그대로라 keyboard focus가 화면의 의미 순서를 따른다.

`ProjectMedia`는 `position: relative`, flex와 `min-height: 20rem`을 가진
container 안에서 `next/image fill`을 쓴다. `aspect-ratio`는 없으며 container의
grid/flex 배치와 최소 높이가 표시 영역을 소유하고 Image가 그 안을 채운다.
`sizes`와 실제 CSS 열 폭이 어긋나면 불필요하게 큰 이미지를 받을 수 있으므로
두 값을 함께 수정해야 한다.

```tsx
// 현재 src/designs/brutalist/brutalist-route.tsx에서 발췌
<div className={styles.mediaInner}>
  <Image
    alt={image.alt}
    fill
    priority={priority}
    sizes="(max-width: 900px) 100vw, 55vw"
    src={image.src}
  />
</div>
```

과거 접근성 검사에서는 description list 안에 일반 `<p>`가 들어간 결함이
드러나 `<dd>`로 고쳤다. 자동 axe가 현재 마크업 규칙을 확인하지만 과장된 대문자
heading의 읽기 난이도나 번호가 이해를 돕는지는 판정하지 않는다. 완료 기준은
여덟 route의 의미 요소가 hard grid와 무관하게 올바른 landmark/list 구조를
유지하고, 세 breakpoint에서 navigation과 media가 document 폭을 넘지 않는
것이다.

## Cinematic: 이미지 chapter와 sticky 배치를 데이터 순서에 연결하기

### 구조와 학습 목표

`src/designs/cinematic/cinematic-route.tsx`는 `Frame`이 header, desktop/mobile
navigation, design switcher, main과 footer를 소유한다. home은 viewport hero와
project chapter, projects는 image-led archive, detail은 case body와 gallery로
구성한다. 넓은 화면에서는 project copy를 sticky로 두고 media를 따라 읽게 한다.

현재 대표 코드는 project 하나를 view model 순서대로 chapter로 바꾸는
`ProjectChapter`다.

```tsx
// 현재 소스에서 축약
<article className={styles.projectChapter}>
  <div className={styles.stickyCopy}>
    <h2>{project.title}</h2>
    <p>{project.summary}</p>
  </div>
  <Link aria-label={openItemAriaTemplate.replace("{title}", project.title)}>
    <Media alt={project.screenshot.alt} src={project.screenshot.src} />
  </Link>
</article>
```

profile/introduction은 hero copy, contact는 `preferredOrContactLinks`, detail은
`supportingImages`와 `stackItems`를 사용한다. renderer가 원본 project 배열을
다시 검색하지 않는다.

### layout·이미지·링크 계약

`Media`는 `next/image fill`과
`sizes="(max-width: 900px) 100vw, 72vw"`를 사용한다. 980px에서 desktop nav를
mobile menu로 바꾸고 sticky/multi-column을 해제하며, 640px에서 gallery와
timeline을 한 열로 줄인다. sticky는 넓은 화면의 시각 효과일 뿐 콘텐츠 순서를
바꾸지 않는다.

`CinematicLink`는 `external` flag뿐 아니라 `http(s)` scheme도 새 창 조건으로
사용한다. Brutalist의 `ActionLink`도 `http(s)`와 `mailto:`를 자체 판정하되
mailto는 새 창을 열지 않는다. Design·Classic의 공통 link와 Editorial은
주로 콘텐츠의 `external` flag를 따른다. 현재 새 창 링크에는 `noreferrer`가
붙지만 accessible name에 “새 창” 안내가 자동으로 추가되지는 않는다. 콘텐츠와
renderer를 함께 검토해야 하는 디자인별 접근성 계약이다.

완료 기준은 media가 chapter 순서를 보존하고, 좁은 화면에서 sticky와 다중 열이
해제되며, 이미지 link가 project title을 포함한 accessible name을 갖고, reduced
motion에서 장식 전환이 멈추는 것이다.

## cascade, focus와 긴 콘텐츠를 함께 확인하는 법

Design과 Classic은 `src/app/globals.css`의 `[data-site-design]` selector가
`--background`, `--foreground`, `--accent` 같은 role token을 바꾸고
`@theme inline`이 이를 Tailwind token에 연결한다. 같은 utility class여도 상위
design attribute에 따라 계산값이 달라진다. `[data-route-renderer] .max-w-6xl`
같은 전역 selector는 공용 content 폭을 덮으므로 새 utility를 추가할 때 cascade와
specificity를 함께 확인해야 한다.

세 전용 디자인은 CSS module의 scoped class를 사용한다. scoped 이름은 다른
디자인과의 우발적 충돌을 줄이지만, global element style과 focus rule보다 항상
우선한다는 뜻은 아니다. browser computed style과 Playwright snapshot은 결과를
확인할 뿐 selector 설계의 의도를 증명하지 않는다.

다섯 디자인에서 공통으로 확인할 실패 조건은 다음과 같다.

- grid item에 `min-width: 0`이 없어서 긴 제목이나 URL이 열 폭을 밀어낸다.
- 외부 URL에 `overflow-wrap`이 없어서 document가 가로로 넘친다.
- 시각적 `order`를 바꿔 focus 순서와 읽기 순서가 달라진다.
- `next/image fill`의 부모가 position·크기를 소유하지 않아 높이가 0이 된다.
- raw `<img>`가 비율 공간을 예약하지 않아 layout shift가 생긴다.
- desktop nav를 숨겼지만 mobile `<details>`를 표시하지 않아 route가 사라진다.
- focus outline이 theme 배경과 충분히 대비되지 않는다.
- 지속 animation은 CSS에서 멈췄지만 terminal timeout은 계속 돈다.

현재 E2E는 활성 route의 가로 넘침, mobile navigation과 44px target, skip link,
reduced motion, axe 규칙과 지정 screenshot을 확인한다. 모든 길이의 production
콘텐츠, 실제 screen reader, 200% 이상 확대, forced colors, Safari/WebKit과
Firefox까지 증명하지는 않는다.

## 실제 추가 순서와 학습상 순서

Git 이력에서 확인되는 순서는 다음과 같다.

1. `a93f4ee`에서 설치 가능한 App Router와 Design·Classic 최소 홈이 함께 시작한다.
2. project, detail, about, contact, resume와 학습 route가 독립 기능으로 뒤따른다.
3. registry는 구현된 Design·Classic만 완전하게 등록하고 선택기는 그 집합만 노출한다.
4. Editorial, Brutalist와 Cinematic은 각각 콘텐츠 계약, 전용 renderer, CSS와 registry
   항목을 한 커밋에서 추가한다.
5. 다섯 디자인×route browser 행렬은 다섯 renderer가 모두 존재한 뒤 추가된다.
6. Design과 Classic을 전용 route directory로 옮기는 작업은 새 디자인 추가가 아니라
   표현 책임의 이동이다.

따라서 어떤 중간 checkout에도 renderer가 없는 design ID나 빈 loader map이 공개되지
않는다. 학습자는 Design 한 route부터 읽을 수 있지만 이는 문서의 읽기 순서이며
commit에 실행 불가능한 단계를 만든다는 뜻이 아니다.
