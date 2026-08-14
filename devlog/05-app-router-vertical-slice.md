# URL을 콘텐츠와 렌더러로 연결하는 App Router 경계

## 관련 커밋

- `a93f4ee` — `feat(portfolio): 실행 가능한 콘텐츠 기반 홈 구성`
- `7b99225` — `feat(home): 대표 프로젝트 근거 섹션 추가`
- `2da79c8` — `feat(home): 기술 집중 영역과 스택 시각화 추가`
- `753ee74` — `feat(home): 여정과 연락 동선 추가`
- `fdc7061` — `feat(projects): 디자인별 프로젝트 목록 추가`
- `57c0fbd` — `feat(projects): 프로젝트 상세 사례 페이지 추가`
- `b1df65a` — `feat(about): 프로필과 경험 페이지 추가`
- `96243b2` — `feat(resume): 이력 요약 페이지 추가`
- `8abac2c` — `feat(contact): 연락 수단 페이지 추가`
- `03a64b5` — `feat(journey): 여정 narrative route 추가`
- `2c56078` — `feat(interview-map): 프로젝트 근거 route 추가`
- `9739fc0` — `feat(content): 페이지 활성 상태와 큐레이션을 콘텐츠로 관리`
- `13038e7` — `refactor(routes): portfolio page context 통합`

현재 App Router page의 역할은 화면을 직접 조립하는 것이 아니라 URL 입력을
검증된 콘텐츠와 route view model로 바꾸는 것이다. 실제 마크업은 다섯 디자인
renderer가 만든다.

## 현재 요청 흐름

홈 요청은 다음 네 단계로 처리된다.

```text
searchParams
→ resolvePortfolioPageContext()
→ createHomeViewModel()
→ renderDesignRoute()
```

`resolvePortfolioPageContext()`는 `view`와 `debug` query를 해석한다. `view`가 지원
목록에 없으면 `presentation.defaultHomeTemplate`로 돌아가고, `debug=content`일 때만
콘텐츠 출처 표시를 켠다. 같은 규칙을 모든 page가 사용하므로 URL 해석이 renderer마다
달라지지 않는다.

```tsx
const { activeTemplate, content, contentDebug } =
  await resolvePortfolioPageContext({
    currentPath: "/",
    searchParams,
  });

return renderDesignRoute(activeTemplate, {
  contentDebug,
  currentPath: "/",
  route: "home",
  viewModel: createHomeViewModel(content),
});
```

page context가 반환하는 `shellProps`는 현재 App Router page에서 사용하지 않는다.
Design과 Classic renderer는 `createDesignShellProps()`로 같은 종류의 값을 다시
조립하고, 나머지 디자인은 자체 shell을 사용한다. 반환 필드가 있다는 이유만으로
공통 shell 입력이 한 번만 생성된다고 볼 수 없다.

## route와 실패 반환 방식

공개 route는 홈, 프로젝트 목록·상세, About, Resume, Contact, Journey,
Interview Map으로 구성된다. 홈을 제외한 page는 대응하는 `site.pages` 값이
`false`이면 `notFound()`를 호출한다. sitemap도 같은 flag를 읽어 비활성 route를
제외한다.

프로젝트 상세는 두 경계를 함께 사용한다.

```tsx
export function generateStaticParams() {
  return getPortfolioContent().projects.map((project) => ({
    projectId: project.id,
  }));
}

const viewModel = createProjectDetailViewModel(content, projectId);
if (!viewModel) notFound();
```

`generateStaticParams()`는 활성 project를 사전 생성 후보로 제공하지만
`dynamicParams = false`를 선언하지 않는다. 후보에 없는 ID를 framework가 무조건
차단하는 계약은 없으며, 실제 실패는 view model의 `null`과 page의 `notFound()`로
닫는다. `generateMetadata()`도 비활성 page나 없는 project에서 같은 404 경계를
사용한다.

route metadata의 canonical URL에는 `view`와 `debug` query를 넣지 않는다. 디자인
선택은 같은 콘텐츠 route의 표현 차이이며 별도 canonical page로 발행하지 않는다는
정책이다.

## view model에서 끝내는 관계 해석

page는 canonical content 전체를 renderer에 그대로 넘기지 않는다. route별 생성
함수가 먼저 다음 관계를 만든다.

- 홈: 대표 project, metric, 최근 journey, hero·contact link
- 프로젝트 목록: featured/archive 구분, group별 project, metric 값
- 프로젝트 상세: ID 조회, stack ID 해석, 보조 image와 detail link
- About·Resume: curation·resume가 참조한 project
- Journey·Interview Map: ID 참조를 실제 project 또는 `null`로 연결

정상 실행 경로에서는 loader가 없는 ID와 비활성 대상 참조를 앞서 거부한다. view
model에 남은 `null`·filter fallback은 테스트가 검증을 우회해 직접 만든 입력이나 URL
조회 실패를 방어하는 성격이 강하다. 구체적인 renderer 입력 계약은
[07. 디자인 레지스트리와 route view model](./07-design-registry-and-renderers.md)에서
다룬다.

## 확인된 계약 결함: 비활성 page로 향하는 고정 CTA

page flag는 route와 sitemap에는 적용되지만 renderer가 만든 모든 링크까지 지배하지
않는다. loader는 `site.navigation`, 공용 `links.json`, project link에 선언된 내부
경로가 비활성 page를 가리키는지 검사한다. 반면 여러 renderer는 다음 목적지를 코드에
직접 넣는다.

- 홈의 `/projects`, `/contact`, `/journey` CTA
- Brutalist 프로젝트·About 화면의 Contact band
- 각 디자인의 route 전용 이동 링크

예를 들어 `contact`를 비활성화하고 navigation과 콘텐츠 link를 올바르게 제거해도
renderer의 고정 `/contact` CTA는 남을 수 있다. 클릭 결과는 404다. 이 입력은 schema와
loader를 통과할 수 있으므로 단순히 “page flag가 모든 진입점을 숨긴다”고 설명하면
틀린다.

현재 `src/content/site.json`은 모든 page를 활성화하므로 배포된 기본 템플릿에서는
문제가 드러나지 않는다. 비활성 flag와 다섯 renderer의 링크 출력을 함께 검사하는
회귀 테스트도 없다.

## 자동 검증이 확인하는 범위

`src/designs/route-view-models.test.tsx`는 다섯 디자인과 여덟 route 조합에서 디자인
root와 비어 있지 않은 `h1`을 확인한다. Playwright의 공용 route 행렬은 현재 설정에서
활성화된 정상 URL만 순회한다.

따라서 다음 항목은 현재 행렬이 직접 보장하지 않는다.

- 비활성 page의 실제 404와 남은 고정 CTA
- 존재하지 않는 project URL의 HTTP status와 404 화면 연결
- 검증을 우회한 미등록 group fallback
- Resume PDF의 실제 응답
- 각 route의 정확한 정적 생성 분류

route가 렌더된다는 사실과 모든 URL 실패 정책을 검증했다는 주장은 구분해야 한다.
