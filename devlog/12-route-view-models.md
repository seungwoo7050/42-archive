# 원본 콘텐츠와 렌더러 사이의 route view model

## 관련 커밋

- `3ff0b77` — `refactor(content): route view model 경계 추가`
- `0b8204d` — `refactor(routes): page와 renderer에 view model 적용`
- `5ecd10f` — `test(content): route view model 파생 규칙 검증`
- `9c33268` — `test(design): view model 기반 renderer matrix 검증`
- `66f4d61` — `refactor(content): 여정과 interview view model 확장`
- `5f2b1e2` — `refactor(content): route별 view model 노출 범위 축소`
- `f082af3` — `test(content): scoped view model과 연락처 회귀 검증`

다섯 renderer가 canonical content를 직접 탐색하면 project lookup, 표시 순서와
fallback 정책이 표현 코드마다 달라질 수 있다. `src/lib/portfolio/view-models.ts`는
이 해석을 route 앞에서 한 번 수행하고 renderer에는 준비된 입력을 넘긴다.

## 인터페이스의 기본 형태

모든 view model은 `site`, `profile`, `presentation`, `footerLinks`를 공유한다. 그 위에
route별 원본 필드와 파생 필드를 더하고 `route` discriminant로 결과를 구분한다.

```ts
type PortfolioRouteViewModel =
  | HomeViewModel
  | ProjectIndexViewModel
  | ProjectDetailViewModel
  | AboutViewModel
  | ResumeViewModel
  | ContactViewModel
  | JourneyViewModel
  | InterviewMapViewModel;
```

예를 들어 project detail은 원본 전체 대신 `project`, `detailLinks`, `stackItems`,
`supportingImages`를 받는다. page→registry 요청에서는 route와 view model을 함께
구분하지만 registry 이후 일부 renderer에는 구체 타입 단언이 남아 있어 TypeScript
하나만으로 모든 잘못된 조합을 막는 구조는 아니다.

## route별로 먼저 결정하는 정책

view model 생성 함수가 맡는 대표 규칙은 다음과 같다.

- home: featured project가 없으면 전체 project를 사용하고, 첫 항목을 lead로 고른다.
- project index: featured/archive를 나누고 설정된 group 순서로 묶는다.
- project detail: ID로 project와 stack을 찾고 detail link와 보조 이미지를 준비한다.
- about/resume: project ID 참조를 실제 object로 바꾸되 원본 ID 순서를 유지한다.
- contact: preferred link가 비어 있으면 contact placement link를 fallback으로 쓴다.
- journey/interview map: project 참조를 미리 해석해 object 또는 `null`로 만든다.

없는 project detail은 빈 model이 아니라 `null`을 반환한다. page는 이 값을 Next.js의
`notFound()`로 바꾼다. 반면 journey와 interview answer의 누락 참조는 model 안의
`null`로 남는다. 정상 loader는 잘못된 참조를 앞에서 거부하므로 이 fallback은 주로
검증을 우회해 생성 함수를 직접 호출할 때 의미가 있다.

stack ID를 찾지 못하면 ID 자체를 label로 쓰는 임시 `TechStackItem`을 만든다.
대표 screenshot과 같은 `src`를 가진 보조 이미지는 제외한다. 여기서 중복 기준은 파일
내용이 아니라 경로 문자열이다. unknown stack fallback은 현재 전용 test가 없다.

## 원본 전체 노출에서 허용 필드 목록으로

초기 view model은 `PortfolioContent` 전체를 교차 타입으로 포함하고 `...content`를
복사했다. `5f2b1e2`는 공통 필드와 route별 `Pick`만 남기는 형태로 범위를 줄였다.

```ts
type RouteViewModel<VisibleKey, RouteFields extends object> =
  RouteViewModelBase &
  Pick<PortfolioContent, VisibleKey> &
  RouteFields & {
    readonly [Key in Exclude<keyof PortfolioContent, SharedKey | VisibleKey>]: never;
  };
```

선택하지 않은 필드를 `never`로 표시한 부분은 일부 legacy helper의 타입 모양을
유지하기 위한 호환층이다. runtime 객체에는 그 필드를 복사하지 않는다. 각 생성 함수
끝에는 `as ...ViewModel` 단언이 있으므로 타입 선언만 추가하고 실제 값을 빠뜨려도
compiler가 항상 잡아 주지는 않는다.

## contact 누락을 막는 consumer 기반 계약

필드 범위는 route 이름이 아니라 실제 renderer tree를 기준으로 정해야 한다.
Brutalist의 Projects와 About 화면은 공통 contact section을 사용하므로 두 model 모두
`contact`가 필요하다. 현재 타입과 생성 함수는 이를 함께 제공한다.

```ts
type ProjectIndexViewModel = RouteViewModel<"contact" | "projects", ...>;
type AboutViewModel = RouteViewModel<
  "contact" | "curation" | "experience" | "journey" | "skills",
  ...
>;
```

Git 이력에는 contact가 빠진 잘못된 중간 상태가 커밋돼 있지 않다. 이 사례는 실제
consumer를 조사해 누락 위험을 피한 인터페이스 설계다. `f082af3`의 producer test는
두 생성 결과의 `contact`가 canonical `content.contact`와 같은 참조인지 확인한다.
renderer root와 `h1`만 보는 행렬으로는 깊은 section의 입력 누락을 설명하기 어려워
생산자 가까이에 회귀 조건을 둔 것이다.

## 객체 수명과 변경 금지 관례

원본 source와 정규화된 canonical object는 server module load 시 만들어지고 module
cache 수명 동안 공유된다. `getPortfolioContent()`는 새 최상위 envelope와 일부 배열을
만들지만 deep clone하지 않는다. view model도 파생 배열을 만들 뿐 `site`, `profile`,
project와 여러 중첩 object는 canonical 참조를 공유한다.

타입은 deep readonly가 아니며 object를 freeze하지도 않는다. renderer와 selector가
중첩 object를 읽기 전용으로 다루는 것이 현재 불변식이다. 공유 배열을 제자리
`sort()`하는 식의 변경은 다음 요청에서도 관찰될 수 있다. 현재 구현은 `map`, `filter`,
`slice`, spread로 새 파생값을 만드는 방식으로 이 위험을 피한다.

view model은 장기 상태 저장소가 아니다. design/debug 상태는 URL, `<details>`의 open
상태는 브라우저, AnimatedTerminal의 phase와 timer는 client component가 소유한다.

## 테스트가 고정하는 범위

`src/lib/portfolio/view-models.test.ts`는 다음을 직접 확인한다.

- route별 허용 원본 필드와 공통 field
- home selection·metric·link, project group과 detail 파생값
- 없는 detail ID의 `null` 반환
- resume·curation·journey·interview의 ID 해석과 순서
- Project/About의 contact와 Contact의 preferred fallback
- 구현이 `...content`와 `PortfolioContent &`로 돌아가지 않는 source 계약

`src/designs/route-view-models.test.tsx`는 다섯 design×여덟 route를 jsdom으로
렌더링해 design root와 non-empty `h1`을 확인한다. 이는 producer와 renderer가 기본
HTML까지 연결되는지를 보는 검사다. CSS layout, image load, hydration, 실제 navigation과
깊은 section의 모든 필드를 증명하지 않는다.

새 필드를 넣을 때는 타입, runtime 생성값, 직접 consumer, producer test와 renderer
행렬을 같은 변경 단위로 검토해야 한다. 특히 type assertion이 있는 현재 구조에서는
이 순서를 생략하면 runtime 누락이 정적 검사 뒤에 숨을 수 있다.
