# 디자인 레지스트리와 route view model의 계약

## 관련 커밋

- `00124df` — `refactor(designs): Design과 Classic renderer registry 도입`
- `bc2e726` — `feat(designs): 구현된 디자인 선택기 추가`
- `de9f46c` — `feat(designs): Editorial portfolio renderer 추가`
- `26368ad` — `feat(designs): Brutalist grid renderer 추가`
- `593155e` — `feat(designs): Cinematic archive renderer 추가`
- `c15bb14` — `test(e2e): 다섯 디자인의 route matrix 검증`
- `3ff0b77` — `refactor(content): route view model 경계 추가`
- `0b8204d` — `refactor(routes): page와 renderer에 view model 적용`
- `5ecd10f` — `test(content): route view model 파생 규칙 검증`
- `9c33268` — `test(design): view model 기반 renderer matrix 검증`
- `5f2b1e2` — `refactor(content): route별 view model 노출 범위 축소`
- `f082af3` — `test(content): scoped view model과 연락처 회귀 검증`
- `e5360c4` — `refactor(design): Design route renderer 분리`
- `3dbeb7c` — `refactor(design): Classic route renderer 분리`
- `23bcce0` — `refactor(design): 모든 route를 registry renderer로 위임`

이 프로젝트의 다섯 디자인은 색상 token만 바꾸는 theme가 아니다. 같은 route view
model을 받아 shell, heading, navigation, project 표현과 responsive 구조를 각각
만드는 독립 renderer다. 공통 층은 디자인 선택과 데이터 해석을 맡고, 각 renderer는
DOM과 CSS를 소유한다.

## 지원 디자인을 한곳에서 연결한다

현재 registry는 지원 ID와 동적 import를 일대일로 연결한다.

```tsx
const routeLoaders: Record<SiteDesignId, () => Promise<DesignModule>> = {
  design: () => import("./design"),
  classic: () => import("./classic"),
  editorial: () => import("./editorial"),
  brutalist: () => import("./brutalist"),
  cinematic: () => import("./cinematic"),
};
```

`Record<SiteDesignId, ...>`는 타입에 추가한 design의 loader 누락을 compile 단계에서
찾는다. 다만 design ID는 Zod schema, 수기 타입, `SITE_DESIGNS`, presentation JSON,
registry와 테스트에도 반복된다. 이들 집합이 자동으로 하나의 source에서 생성되는
구조는 아니다.

동적 import가 module 선택 책임을 모은다는 사실과 client bundle이 작다는 주장은
별개다. 실제 route별 JS·CSS는 production manifest를 읽는 bundle gate가 측정한다.

## renderer 앞에서 관계를 해석한다

`create*ViewModel()`은 lookup과 fallback을 renderer 밖에서 한 번 수행한다.

| route | 미리 만든 값 |
| --- | --- |
| home | featured·fallback project, metric, hero/footer/contact link, 최근 journey |
| projects | featured/archive 구분, group과 metric |
| project-detail | project, detail link, stack item, 중복을 뺀 보조 image |
| about·resume | curation·resume project 참조 |
| contact | preferred link와 placement fallback |
| journey·interview-map | project ID를 실제 project 또는 `null`로 연결한 항목 |

모든 view model은 `site`, `profile`, `presentation`, `footerLinks`를 공유한다. 그 밖의
canonical field는 route별로 필요한 것만 실제 객체에 넣는다. 타입의 `never` mapping은
과도기 renderer helper와의 호환을 위한 장치일 뿐, 선택하지 않은 field를 runtime
객체에 복사하지 않는다.

Projects와 About이 `contact`를 갖는 이유도 route 이름이 아니라 실제 consumer에 있다.
Brutalist renderer는 두 화면 끝에서 `ContactBand`를 그린다. 범위 축소 때 이 field를
빼면 타입 또는 실행 결과가 깨지므로 producer가 같은 `content.contact` 객체를 넣고,
`view-models.test.ts`가 허용 source field와 identity를 확인한다. 이 사례는 route별
입력 목록을 renderer 사용처에서 역으로 조사해야 한다는 점을 보여 준다.

## page에서 registry까지는 route와 입력이 묶여 있다

page가 호출하는 `DesignRouteRequestProps`는 route discriminant와 대응하는 view
model을 결합한다.

```ts
type ViewModelDesignRouteRequest = {
  [Route in PortfolioRouteViewModel["route"]]: {
    route: Route;
    viewModel: Extract<PortfolioRouteViewModel, { route: Route }>;
    contentDebug: boolean;
    currentPath: string;
  };
}[PortfolioRouteViewModel["route"]];
```

따라서 `route: "projects"`와 home view model을 page에서 registry로 보내는 오류는
타입이 막는다.

## 확인된 약한 경계: registry 안에서 상관관계가 풀린다

registry는 요청을 renderer용 `DesignRouteProps`로 바꾸면서 `route`와
`content: PortfolioRouteViewModel`을 별도 필드로 넓힌다.

```tsx
const rendererProps: DesignRouteProps = {
  content: props.viewModel,
  contentDebug: props.contentDebug,
  currentPath: props.currentPath,
  project:
    props.viewModel.route === "project-detail"
      ? props.viewModel.project
      : undefined,
  route: props.route,
};
```

이후 타입만 보면 `route`와 `content.route`가 항상 같다는 관계가 사라진다.
Design·Classic의 route 파일은 `content.route`를 확인하지만 Editorial, Brutalist,
Cinematic에는 `as HomeViewModel` 같은 단언이 남아 있다. project detail도 project를
view model 안과 top-level `project` prop 두 곳에 전달한다.

현재 page 호출은 올바른 request union을 거치므로 checked-in 정상 경로에서 값이
갈리지 않는다. 그러나 “TypeScript가 각 renderer 내부까지 잘못된 조합을 완전히
배제한다”는 설명은 과하다. registry 이후의 상관관계와 중복 prop을 지키는 데 renderer
행렬 테스트도 필요하다.

## 다섯 renderer의 소유 범위

- Design과 Classic은 `PageShell`, project card, journey·stack component를 공유하고
  route별 파일을 따로 둔다. Classic home만 `AnimatedTerminal`을 사용한다.
- Editorial은 masthead와 지면형 archive·spread를 자체 shell에서 만든다.
- Brutalist는 번호 navigation, hard grid, metric definition list와 Contact band를
  직접 구성한다.
- Cinematic은 image chapter와 sticky copy 중심의 Frame을 사용한다.

같은 view model을 받는다고 같은 DOM을 만들 필요는 없다. 대신 다음 의미 계약은
모두 지켜야 한다.

- 현재 route를 나타내는 `h1`과 landmark
- 내부 이동 시 `view`·`debug` 상태 보존
- project와 참조 목록의 순서·중복 정책
- 좁은 화면의 읽기 순서와 keyboard focus 순서
- reduced motion, image 크기와 overflow 경계

URL scheme과 `external` flag를 renderer마다 다르게 해석하는 현재 빈틈은
[06. 콘텐츠 검증 경계](./06-runtime-content-boundaries.md)에 정리했다.

## 확인된 renderer 불일치: featured fallback

`createHomeViewModel()`은 featured project가 없을 때 전체 project를 사용하는
`featuredOrAllProjects`와 그 첫 항목인 `leadProject`를 만든다.

Editorial, Brutalist, Cinematic은 이 fallback을 소비한다. 반면 Design과 Classic
home은 `featuredProjects`만 전달해 hero·featured 영역을 만든다. schema상 project에
`featured`는 optional이므로 featured가 하나도 없는 콘텐츠도 유효하지만, 그 경우 두
디자인은 project 강조 영역을 비우고 나머지 세 디자인은 전체 project로 대체한다.

현재 JSON에는 featured project가 하나 있어 정상 행렬에서는 차이가 보이지 않는다.
featured가 0개인 입력으로 다섯 renderer의 fallback을 비교하는 테스트도 없다. 따라서
view model에 fallback이 있다는 사실을 다섯 디자인의 공통 보장으로 확대하면 안 된다.

## 테스트 행렬의 의미와 한계

`route-view-models.test.tsx`는 다섯 디자인과 여덟 route 조합에서 design root와
비어 있지 않은 `h1`을 확인한다. view model unit test는 노출 field, project lookup,
group 순서, metric, link와 참조 변환을 생산자 가까이에서 검사한다. Playwright,
axe, visual·performance test는 실제 Chromium의 일부 layout과 상호작용을 보완한다.

이 행렬이 다음을 자동으로 증명하지는 않는다.

- featured가 없는 콘텐츠의 디자인 간 동일한 fallback
- 모든 긴 문구·image 비율·breakpoint 조합
- route와 view model을 registry 밖에서 잘못 조합한 직접 호출
- 모든 screen reader와 keyboard 사용 흐름

새 design이나 route를 추가할 때는 ID와 loader만 고치는 것으로 끝나지 않는다.
schema·presentation·view model producer·request union·다섯 consumer와 해당 테스트를
한 묶음으로 확인해야 한다.
