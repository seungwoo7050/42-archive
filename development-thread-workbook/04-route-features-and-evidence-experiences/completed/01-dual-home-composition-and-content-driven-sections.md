# Development Thread: Dual home composition and content-driven sections

> **Repository:** `https://github.com/seungwoo7050/42-archive`  
> **Branch:** `web/portfolio`  
> **Category:** `04-route-features-and-evidence-experiences`  
> **Workbook state:** completed workbook  
> **Historical scope:** commits reachable from `web/portfolio` only

## 0. Phase 1 audit result and category boundary

- 포함: 두 홈 route의 hero 구성, 대표 프로젝트·지표·기술·여정·연락 섹션, 섹션 표시와 순서 결정.
- 제외: `view` query 해석과 route dispatcher 자체는 category 02, terminal 타이핑 상태 기계는 category 03, full-site renderer 추출은 category 05, route view-model 소유권은 category 09가 담당합니다.
- `cdb68fdf59f9`는 Classic 홈의 최초 composition이 없던 draft 공백을 메우므로 추가했습니다. terminal interaction/style 후속 커밋은 이 Thread의 기능 경계를 넘으므로 추가하지 않았습니다.

- **Audit decision:** 이 Thread는 독립적인 route feature/evidence story로 유지합니다.
- **Frozen commit count:** 11
- **Importance profile:** branch-local source classification상 이 Thread의 commit은 모두 B입니다. 다른 category의 S/A-level cross-cutting architecture를 중복 편입하지 않았습니다.

## 1. Thread goal

Design과 Classic 홈이 같은 콘텐츠 aggregate를 서로 다른 hero와 섹션 구성으로 표현하고, Design 홈의 섹션 순서가 코드 순서가 아니라 콘텐츠 배열을 따르게 되는 과정을 복원합니다.

### Fixed invariants

- Design과 Classic은 같은 `PortfolioContent`의 profile, links, projects, skills, journey, contact를 사용하지만 표현 구조는 독립적으로 선택합니다.
- 공용 섹션은 각 template의 `sections` 구성에 포함될 때만 렌더링됩니다.
- Design 홈의 최종 섹션 순서는 `presentation.home.design.sections` 배열의 순서가 결정합니다.
- 데이터가 비어 있거나 참조가 없으면 해당 카드·링크·목록이 자연스럽게 비며, 이 Thread 시점에는 별도의 오류 복구 UI를 보장하지 않습니다.

## 2. Core engineering questions

1. Design과 Classic hero는 동일한 원본 데이터에서 어떤 서로 다른 파생값을 계산하는가?
2. 각 공용 섹션은 어느 파일이 데이터를 해석하고 어느 route가 표시 여부를 결정하는가?
3. `includes()` 기반 고정 JSX 순서와 `sections.map()` 기반 콘텐츠 순서의 차이는 무엇인가?
4. featured project, skill ID, preferred link가 없을 때 실제 DOM은 어떻게 달라지는가?
5. 후대 `HomeViewModel` 도입은 이 Thread의 기능 결정을 어떻게 보존하되 어디에서 소유하게 되는가?

## 3. Completion criteria

- [x] 모든 commit을 부모 상태와 exact SHA에서 비교하고 final HEAD를 과거에 투영하지 않았습니다.
- [x] 각 commit의 concrete file/function/component/data field와 caller→callee 또는 data flow를 기록했습니다.
- [x] optional data, missing reference, empty array, disabled page 등 실제 failure/absence branch를 설명했습니다.
- [x] 소유권·표시 책임·상태 전환과 적용되지 않는 resource cleanup을 구분했습니다.
- [x] 보장과 비보장을 분리하고 후속 commit/category와의 관계를 연결했습니다.
- [x] 실행하지 않은 build/test/runtime 결과를 통과했다고 표시하지 않았습니다.

## 4. Frozen commit map

| Order | SHA | Subject | Importance | Tags | Source-defined role |
|---:|---|---|:---:|---|---|
| 1 | `3475ba3efdb2` | feat(home): 디자인 홈 소개 영역 구성 | B | RENDERER | Design 홈의 profile 기반 hero와 shell을 최초 구성합니다. |
| 2 | `b027f42669aa` | feat(home): 대표 프로젝트 쇼케이스 추가 | B | RENDERER | Design hero에 lead/supporting 프로젝트와 작업 지표를 추가합니다. |
| 3 | `cdb68fdf59f9` | feat(home): 클래식 홈 히어로 구성 | B | RENDERER | 같은 콘텐츠 aggregate 위에 Classic 홈 hero를 추가해 dual-home composition의 두 번째 축을 만듭니다. |
| 4 | `07dd465dbe20` | feat(home): 디자인 대표 프로젝트 섹션 추가 | B | RENDERER | Design 홈에 구성 가능한 featured-project section을 추가합니다. |
| 5 | `33bec9cf6325` | feat(home): 클래식 대표 프로젝트 섹션 추가 | B | RENDERER | Classic 홈에도 같은 featured source를 Classic 표현으로 추가합니다. |
| 6 | `afaf5a393518` | feat(home): 작업 지표 섹션 추가 | B | RENDERER | route-local 지표 계산을 공용 `WorkMapSection`으로 추출하고 두 홈에 연결합니다. |
| 7 | `df26861cdc24` | feat(home): 기술 집중 영역 추가 | B | RENDERER | skills의 focus areas를 양쪽 홈의 공용 섹션으로 노출합니다. |
| 8 | `e3aebedaa46b` | feat(home): 선택 기술 스택 영역 추가 | B | RENDERER | skill group ID를 기준으로 홈에 노출할 canonical tech stack을 파생합니다. |
| 9 | `9a107fe185cf` | feat(home): 공용 여정 섹션 추가 | B | RENDERER | 전체 journey 목록을 홈 preview로 재사용합니다. |
| 10 | `bb8ccf341f39` | feat(home): 연락 미리보기 추가 | B | RENDERER | preferred contact links와 availability를 홈 끝의 공용 CTA로 추가합니다. |
| 11 | `92799407457e` | refactor(design-home): 홈 섹션 순서를 콘텐츠로 연결 | B | CONTENT, RENDERER, REFACTOR | Design 홈의 활성 섹션뿐 아니라 DOM 순서까지 콘텐츠 배열이 결정하게 합니다. |

## 5. Commit-by-commit historical investigation

### 5.1. `3475ba3efdb2` — feat(home): 디자인 홈 소개 영역 구성

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** Design 홈의 profile 기반 hero와 shell을 최초 구성합니다.

#### Exact inspection targets

- `src/designs/design/home-route.tsx` — `DesignHomeRoute`, `HeroSection`
- `PageShell`, `ContentLinkView`, `ProfilePhoto` 호출 경로
- `content.profile`, `content.links`, `homeTemplate="design"`

#### Commit-specific investigation tasks

1. 부모 상태와 비교해 `DesignHomeRoute`/`HeroSection`가 처음 생기는 파일 경계를 확인하고 `PageShell` 호출까지 추적합니다.
2. `profile.photo`와 github/resume/website 링크 필터가 각각 어떤 조건부 DOM을 만드는지 확인합니다.
3. 이 SHA에는 Classic home이나 template dispatcher가 없는지 파일 트리와 imports로 검증합니다.

#### Learner evidence record

- **Previous state:** 직전에는 콘텐츠를 소비하는 Design 홈 route가 없어서 profile과 링크가 실제 첫 화면에 조립되지 않았습니다.
- **Implementation decision and path:** `DesignHomeRoute`가 `PageShell` 안에 hero를 만들고 profile name/role/headline/summary, optional photo, github/resume/website 유형 링크를 출력합니다.
- **Ownership and data lifetime:** route가 `PortfolioContent` 전체를 받아 hero가 직접 profile과 link 유형을 해석합니다. `PageShell`은 공통 chrome을 소유합니다.
- **Failure, absence, and non-guarantee:** photo가 없으면 `ProfilePhoto`를 생략합니다. 링크가 없으면 CTA 영역은 빈 목록이 되며 별도 empty state는 없습니다.
- **Resulting guarantee:** 콘텐츠 기반 Design hero가 존재하고 template ID가 `design`으로 고정된다는 것만 보장합니다. Classic 구성이나 route dispatch는 아직 없습니다.
- **Relationship to later work:** `b027...`이 같은 hero에 대표 프로젝트와 지표를 더하고, 후대 category 02의 dispatcher가 이 route를 선택 가능하게 만듭니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `3475ba3efdb2` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.2. `b027f42669aa` — feat(home): 대표 프로젝트 쇼케이스 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** Design hero에 lead/supporting 프로젝트와 작업 지표를 추가합니다.

#### Exact inspection targets

- `src/designs/design/home-route.tsx` — `DesignHomeRoute`, `HeroSection`, 당시의 `getWorkMapStats`
- `getFeaturedProjects`, `getTemplateHref`, `ProjectScreenshot`
- `projects[0]`, `projects.slice(1, 3)`의 경계

#### Commit-specific investigation tasks

1. `getFeaturedProjects(content)` 결과가 lead 1개와 supporting 최대 2개로 분할되는 slice/index 규칙을 기록합니다.
2. 당시 route-local `getWorkMapStats`의 curriculum/product/reliability 산식과 특정 ID/경로 의존을 확인합니다.
3. lead project가 없을 때 showcase wrapper 전체가 생략되는지 JSX branch를 확인합니다.

#### Learner evidence record

- **Previous state:** Design hero는 profile과 링크만 보여 주어 대표 작업과 archive 규모를 증거로 제시하지 못했습니다.
- **Implementation decision and path:** `getFeaturedProjects(content)` 결과를 hero로 전달하고 첫 항목을 lead, 다음 두 항목을 supporting으로 사용합니다. 당시 로컬 `getWorkMapStats`가 curriculum/product/reliability 수를 계산합니다.
- **Ownership and data lifetime:** featured 선별은 selector가, lead/supporting 위치와 지표 표시 형식은 Design hero가 소유합니다.
- **Failure, absence, and non-guarantee:** lead가 없으면 showcase 전체를 렌더링하지 않습니다. supporting이 부족하면 존재하는 항목만 출력됩니다. 특정 project ID와 screenshot 경로에 의존한 지표는 아직 route-local 가정입니다.
- **Resulting guarantee:** 대표 프로젝트 최대 세 개와 세 지표를 hero에서 보여 주지만 데이터 정확성이나 selector 회귀 테스트는 보장하지 않습니다.
- **Relationship to later work:** `07dd...`이 hero 외부의 독립 featured section을 추가하고 `afaf...`이 지표 계산을 공용 컴포넌트로 이동합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `b027f42669aa` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.3. `cdb68fdf59f9` — feat(home): 클래식 홈 히어로 구성

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** 같은 콘텐츠 aggregate 위에 Classic 홈 hero를 추가해 dual-home composition의 두 번째 축을 만듭니다.

#### Exact inspection targets

- `src/designs/classic/home-route.tsx` — `ClassicHomeRoute`, `ClassicHeroSection`
- `AnimatedTerminal`에 전달되는 `profile`, project/stack count, terminal copy
- github/resume/website 링크 필터와 optional photo

#### Commit-specific investigation tasks

1. `ClassicHomeRoute`에서 `ClassicHeroSection`과 `AnimatedTerminal`로 이어지는 caller→callee prop 흐름을 추적합니다.
2. profile/project/stack count 중 route가 계산해 넘기는 값과 terminal이 소유하는 표현을 구분합니다.
3. 이 SHA가 terminal state machine을 새로 구현하는지, 기존 component를 composition하는지만 diff로 판별합니다.

#### Learner evidence record

- **Previous state:** 직전에는 Design 홈만 실제 route component로 존재해 'dual home'이라는 기능 서사를 완성할 Classic composition이 없었습니다.
- **Implementation decision and path:** `ClassicHomeRoute`가 `homeTemplate="classic"`인 `PageShell`을 만들고 profile hero와 `AnimatedTerminal`을 나란히 배치합니다.
- **Ownership and data lifetime:** Classic hero가 링크 유형 필터와 profile 표현을 소유하고, terminal 컴포넌트에는 이미 계산한 project/stack count와 presentation copy를 전달합니다.
- **Failure, absence, and non-guarantee:** photo와 링크는 optional입니다. 이 커밋은 terminal의 시간 기반 state machine이나 reduced-motion fallback을 새로 구현하지 않습니다.
- **Resulting guarantee:** 같은 `PortfolioContent`로 Design과 구별되는 Classic hero를 구성할 수 있음을 보장합니다. 사용자가 어느 template를 선택하는지는 보장하지 않습니다.
- **Relationship to later work:** category 02의 `f423...`이 query 기반 선택을 연결하고, 이 Thread의 `33bec...`부터 Classic에도 콘텐츠 섹션이 누적됩니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `cdb68fdf59f9` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.4. `07dd465dbe20` — feat(home): 디자인 대표 프로젝트 섹션 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** Design 홈에 구성 가능한 featured-project section을 추가합니다.

#### Exact inspection targets

- `src/designs/design/home-route.tsx` — `FeaturedProjectsSection`
- `presentation.home.design.sections.includes("featured")`
- `ProjectCard` variant와 `projects.slice()` 경계

#### Commit-specific investigation tasks

1. `sections.includes("featured")`가 section 전체를 가드하는 위치와 `FeaturedProjectsSection`의 1+2 slicing을 확인합니다.
2. hero showcase와 새 featured body section이 같은 selector 결과를 어떻게 재사용하는지 비교합니다.
3. featured 목록이 비어 있을 때 heading/card DOM이 어떻게 남거나 사라지는지 exact JSX에서 기록합니다.

#### Learner evidence record

- **Previous state:** 대표 프로젝트는 hero showcase에만 묶여 있어 홈 본문에서 독립적인 증거 섹션으로 조절할 수 없었습니다.
- **Implementation decision and path:** `featured` ID가 Design section 목록에 있을 때만 `FeaturedProjectsSection`을 렌더링하고 lead 한 개와 supporting 두 개를 `ProjectCard`로 표현합니다.
- **Ownership and data lifetime:** presentation 배열이 섹션의 활성 여부를 소유하지만 이 시점의 JSX 배치 순서 자체는 route 코드가 소유합니다.
- **Failure, absence, and non-guarantee:** featured project가 비어 있으면 목록이 비며 별도 메시지는 없습니다. 배열에 `featured`가 없으면 섹션 전체가 사라집니다.
- **Resulting guarantee:** 콘텐츠 설정으로 Design featured section을 켜고 끌 수 있음을 보장합니다. 설정 배열의 위치가 실제 DOM 순서를 바꾸지는 않습니다.
- **Relationship to later work:** `33bec...`이 Classic 대응 섹션을 만들고 `927...`이 Design의 DOM 순서까지 콘텐츠 배열에 연결합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `07dd465dbe20` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.5. `33bec9cf6325` — feat(home): 클래식 대표 프로젝트 섹션 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** Classic 홈에도 같은 featured source를 Classic 표현으로 추가합니다.

#### Exact inspection targets

- `src/designs/classic/home-route.tsx` — `ClassicHomeRoute`의 featured section
- `presentation.home.classic.sections.includes("featured")`
- `getFeaturedProjects` 결과와 `ProjectCard` 소비 방식

#### Commit-specific investigation tasks

1. Classic route가 featured source를 어떤 component/variant로 표현하고 Design DOM과 어디서 갈라지는지 확인합니다.
2. Classic `sections` 배열의 `featured` 포함 여부가 section 존재를 어떻게 결정하는지 추적합니다.
3. 같은 source를 공유해도 template별 layout을 독립 소유한다는 근거를 파일·symbol 단위로 기록합니다.

#### Learner evidence record

- **Previous state:** Classic 홈은 hero와 terminal만 있어 대표 프로젝트를 본문 증거로 보여 주지 못했습니다.
- **Implementation decision and path:** Classic section 목록에 `featured`가 있을 때 featured projects를 카드 목록으로 렌더링합니다.
- **Ownership and data lifetime:** 선별 데이터는 공용 selector가 제공하고, 표시 밀도와 배치는 Classic route가 소유합니다.
- **Failure, absence, and non-guarantee:** 설정에서 빠지면 섹션을 생략하고, 프로젝트가 없으면 빈 목록이 됩니다. Design과 동일한 DOM을 보장하지 않습니다.
- **Resulting guarantee:** 두 template가 같은 featured source를 각자 표현할 수 있음을 보장합니다.
- **Relationship to later work:** `afaf...`부터 work map 등 공용 섹션이 두 route에 동시에 연결됩니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `33bec9cf6325` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.6. `afaf5a393518` — feat(home): 작업 지표 섹션 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** route-local 지표 계산을 공용 `WorkMapSection`으로 추출하고 두 홈에 연결합니다.

#### Exact inspection targets

- `src/components/portfolio/work-map-section.tsx` — `getWorkMapStats`, `WorkMapSection`, `ArchiveStat`
- `src/designs/design/home-route.tsx`, `src/designs/classic/home-route.tsx`의 `workMap` guard
- curriculum/project/reliability count 산식

#### Commit-specific investigation tasks

1. Design hero의 로컬 지표 helper가 `work-map-section.tsx`로 이동한 전후를 부모 diff와 비교합니다.
2. `getWorkMapStats`의 세 산식과 presentation card `countKey` lookup을 추적합니다.
3. Design/Classic 각각의 `workMap` guard와 reliability project 미존재 시 0 처리 branch를 확인합니다.

#### Learner evidence record

- **Previous state:** Design hero 안에만 지표 계산이 있었고 Classic에는 동일한 작업 지도가 없었습니다.
- **Implementation decision and path:** 새 공용 컴포넌트가 세 지표를 계산해 presentation의 card `countKey`에 대응시키며, 두 route는 각자의 `sections`에 `workMap`이 있을 때 이를 호출합니다.
- **Ownership and data lifetime:** 지표 산식과 카드 반복은 공용 컴포넌트가, 표시 여부는 각 template section 목록이 소유합니다.
- **Failure, absence, and non-guarantee:** reliability project를 찾지 못하면 0을 사용합니다. count key가 타입 계약 밖이면 처리하지 않으며, 산식의 의미 정확성은 이 커밋만으로 검증되지 않습니다.
- **Resulting guarantee:** 두 홈이 동일한 산식과 copy source를 공유한다는 것을 보장합니다.
- **Relationship to later work:** `383...`(상세 Thread 관련 후속)가 공용 `getProjectMetricValue`로 산식을 중앙화하지만 그 selector 정책은 category 01에 속합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `afaf5a393518` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.7. `df26861cdc24` — feat(home): 기술 집중 영역 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** skills의 focus areas를 양쪽 홈의 공용 섹션으로 노출합니다.

#### Exact inspection targets

- `src/components/portfolio/technical-focus-section.tsx` — `TechnicalFocusSection`
- `content.skills.focusAreas.map()`
- 두 home route의 `technicalFocus` section guard

#### Commit-specific investigation tasks

1. `TechnicalFocusSection`이 `presentation.home.shared.technicalFocus`와 `skills.focusAreas`를 어떻게 결합하는지 확인합니다.
2. 두 home route의 `technicalFocus` section guard가 동일 component를 호출하는지 기록합니다.
3. focusAreas가 빈 경우 heading과 card grid의 실제 DOM 상태를 exact SHA에서 판별합니다.

#### Learner evidence record

- **Previous state:** 홈에는 프로젝트 지표는 있었지만 기술적 집중 분야를 직접 설명하는 영역이 없었습니다.
- **Implementation decision and path:** presentation copy와 `skills.focusAreas`를 결합한 카드 목록을 만들고 두 template의 section 설정에 따라 연결합니다.
- **Ownership and data lifetime:** focus area 데이터는 skills content가 소유하고 카드 반복·지연 표현은 공용 컴포넌트가 소유합니다.
- **Failure, absence, and non-guarantee:** focusAreas가 비면 heading 아래 카드가 없으며 별도 empty state는 없습니다. 중복 title은 React key 충돌 가능성을 이 커밋이 방지하지 않습니다.
- **Resulting guarantee:** 양쪽 홈에서 같은 집중 분야 데이터를 일관되게 표시할 수 있음을 보장합니다.
- **Relationship to later work:** `e3aebe...`이 같은 skills graph를 사용해 canonical tech stack을 파생합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `df26861cdc24` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.8. `e3aebedaa46b` — feat(home): 선택 기술 스택 영역 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** skill group ID를 기준으로 홈에 노출할 canonical tech stack을 파생합니다.

#### Exact inspection targets

- `src/components/portfolio/selected-stack-section.tsx` — `SelectedStackSection`
- `Set(content.skills.groups.flatMap(...))`와 `content.techStack.filter(...)`
- `TechMarquee`, `StackList`, 두 route의 `stack` guard

#### Commit-specific investigation tasks

1. skills group item IDs로 `Set`을 만들고 canonical `techStack`을 filter하는 교집합 규칙을 재현합니다.
2. `TechMarquee`에 전달되는 항목과 `StackList`에 전달되는 raw group IDs의 차이를 확인합니다.
3. group에는 있지만 techStack에는 없는 ID가 어느 표현에서 사라지는지 기록합니다.

#### Learner evidence record

- **Previous state:** focus area는 설명 텍스트만 제공했고, 그룹에 속한 기술 ID와 canonical 기술 메타데이터를 함께 보여 주지 못했습니다.
- **Implementation decision and path:** group item ID 집합을 만들고 `techStack`에서 일치하는 항목만 골라 marquee에 전달하며, 각 그룹은 `StackList`로 그대로 렌더링합니다.
- **Ownership and data lifetime:** skills groups가 선택 집합과 그룹 순서를 소유하고, techStack가 icon/label 메타데이터를 소유합니다.
- **Failure, absence, and non-guarantee:** group에 존재하지만 techStack에 없는 ID는 marquee에서 빠집니다. `StackList`가 그 ID를 어떻게 표시하는지는 별도 공용 primitive 책임입니다.
- **Resulting guarantee:** 홈의 selected stack가 skill-group membership에서 파생된다는 것을 보장합니다.
- **Relationship to later work:** `9a107...`은 다른 aggregate인 journey를 공용 섹션으로 연결합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `e3aebedaa46b` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.9. `9a107fe185cf` — feat(home): 공용 여정 섹션 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** 전체 journey 목록을 홈 preview로 재사용합니다.

#### Exact inspection targets

- `src/components/portfolio/home-journey-section.tsx` — `HomeJourneySection`
- `JourneyList` props: `items`, `homeTemplate`, `variant="paired-centerline"`
- 두 route의 `journey` guard

#### Commit-specific investigation tasks

1. `HomeJourneySection`이 `content.journey`를 `JourneyList`에 전달하는 prop 흐름을 추적합니다.
2. `journeyNarrative.milestones`가 이 SHA의 home preview source가 아닌지 확인합니다.
3. template/debug state가 project case-study links까지 전달될 수 있는 props를 기록합니다.

#### Learner evidence record

- **Previous state:** journey 콘텐츠는 존재했지만 홈에서 현재 작업의 시간적 맥락을 보여 주는 섹션이 없었습니다.
- **Implementation decision and path:** 공용 heading과 `JourneyList`를 결합한 섹션을 만들고 두 template에 조건부 연결합니다.
- **Ownership and data lifetime:** journey 항목의 원본과 순서는 `content.journey`가, 링크 상태 보존과 layout은 `JourneyList`가 소유합니다.
- **Failure, absence, and non-guarantee:** journey가 비면 timeline 내용이 없고 별도 메시지는 없습니다. 이 커밋은 `/journey`의 narrative milestone을 사용하지 않습니다.
- **Resulting guarantee:** 홈 preview가 전체 journey 원본을 재사용하고 현재 template/debug 상태를 project 링크에 전달할 수 있음을 보장합니다.
- **Relationship to later work:** `ba813...` 등 Journey route Thread는 별도의 narrative milestone과 anchor-project 의미를 추가합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `9a107fe185cf` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.10. `bb8ccf341f39` — feat(home): 연락 미리보기 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** preferred contact links와 availability를 홈 끝의 공용 CTA로 추가합니다.

#### Exact inspection targets

- `src/components/portfolio/home-contact-preview.tsx` — `HomeContactPreview`
- `getPreferredContactLinks(content)`
- 두 route의 `contact` guard와 `ContentLinkView`

#### Commit-specific investigation tasks

1. `HomeContactPreview`가 `getPreferredContactLinks` 결과와 contact availability를 결합하는 위치를 확인합니다.
2. preferred links가 0개일 때 별도 empty-state branch가 아직 없는지 JSX를 확인합니다.
3. Design/Classic route의 `contact` section guard와 공용 CTA component 호출을 비교합니다.

#### Learner evidence record

- **Previous state:** 홈에서 여정까지 본 뒤 실제 연락 수단으로 이동할 연결이 없었습니다.
- **Implementation decision and path:** contact availability와 presentation copy를 보여 주고 selector가 반환한 preferred links를 CTA로 렌더링합니다.
- **Ownership and data lifetime:** 선호 순서·활성 링크 결정은 selector가, 홈의 CTA 표현은 공용 preview가 소유합니다.
- **Failure, absence, and non-guarantee:** preferred links가 비면 CTA 목록만 비고 별도 empty state는 없습니다. Contact route의 fallback 규칙은 이 커밋에 없습니다.
- **Resulting guarantee:** 두 홈이 같은 선호 연락 결과를 사용한다는 것을 보장합니다.
- **Relationship to later work:** Contact Thread의 `119...`와 `9e99...`가 placement vocabulary와 explicit empty state를 발전시킵니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `bb8ccf341f39` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.11. `92799407457e` — refactor(design-home): 홈 섹션 순서를 콘텐츠로 연결

- **Importance:** B
- **Tags:** CONTENT, RENDERER, REFACTOR
- **Source-defined role:** Design 홈의 활성 섹션뿐 아니라 DOM 순서까지 콘텐츠 배열이 결정하게 합니다.

#### Exact inspection targets

- `src/designs/design/home-route.tsx` — `DesignHomeRoute`, `HomeSection`
- `HomeSectionId`, `sections.map((sectionId) => ...)`
- 각 ID별 component dispatch와 unknown ID의 `null`

#### Commit-specific investigation tasks

1. 이전 `includes()` 나열과 새 `sections.map()`/`HomeSection` dispatch를 부모 diff로 직접 비교합니다.
2. 각 `HomeSectionId`가 어떤 component로 매핑되고 알 수 없는 ID가 어떤 값을 반환하는지 확인합니다.
3. 배열 순서·중복 ID·React key가 DOM order/duplication에 미치는 비보장 범위를 기록합니다.

#### Learner evidence record

- **Previous state:** 각 section은 `includes()`로 켜고 껐지만 JSX에 적힌 고정 순서로만 배치되어 presentation 배열의 순서 의미가 무시됐습니다.
- **Implementation decision and path:** `sections.map()`이 배열 순서대로 `HomeSection`을 호출하고, `HomeSection`이 featured/workMap/technicalFocus/stack/journey/contact를 분기합니다.
- **Ownership and data lifetime:** presentation content가 활성 집합과 순서를 함께 소유하고 route는 ID-to-component dispatch만 소유합니다.
- **Failure, absence, and non-guarantee:** 알 수 없는 ID는 `null`입니다. 중복 ID가 있으면 같은 key와 중복 section 문제가 생길 수 있으며 이 커밋은 schema validation을 설명하지 않습니다.
- **Resulting guarantee:** Design 홈의 본문 순서가 콘텐츠 편집으로 변경된다는 것을 보장합니다. Classic의 순서 정책까지 변경하지는 않습니다.
- **Relationship to later work:** 이 SHA는 이미 `HomeViewModel`을 소비하지만, 그 파생 데이터 소유권·renderer contract는 category 09에서 별도 복원합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `92799407457e` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

## 6. Invariant evolution

| Stage | Historical reconstruction |
|---|---|
| 소개 구성 | `3475...`가 Design hero를, `cdb68...`가 Classic hero를 만들어 같은 aggregate의 두 표현을 성립시켰습니다. |
| 증거 확장 | `b027...`부터 featured project, work map, skills, journey, contact가 단계적으로 추가됐습니다. |
| 공유 경계 | `afaf...` 이후 공용 섹션은 데이터 해석을 공유하고 두 route는 section ID로 포함 여부를 정했습니다. |
| 순서 소유권 | `927...`에서 Design의 section 배열이 활성 여부뿐 아니라 DOM 순서까지 소유하게 됐습니다. |

## 7. Failure → Fix → Test and later relationships

- 직접적인 fix/test commit은 이 frozen map에 없습니다. route projection·renderer matrix·회귀 테스트는 category 09/07의 경계입니다.
- `927...`은 기능 오류 수정이라기보다 이전의 '배열은 활성 집합만 표현한다'는 제한을 제거한 ownership refactor입니다.
- Terminal state와 reduced-motion 검증은 category 03의 별도 Thread가 담당하므로 이 문서가 실행 증거를 대신 주장하지 않습니다.

## 8. Ownership, state, and responsibility changes

- 콘텐츠 JSON/aggregate: profile, presentation section IDs/copy, projects, skills, journey, contact 원본.
- 공용 selectors/components: featured/preferred 선별, work-map 산식, selected stack 교집합, journey/contact 표현.
- Design/Classic route: hero 표현과 각 template의 section 포함/배치.
- 후대 route view model: category 09에서 원본 aggregate를 renderer-safe projection으로 변환합니다.

## 9. Final thread state

Design과 Classic은 같은 콘텐츠를 다른 hero로 표현하고 공용 evidence sections를 공유합니다. Design 본문은 content-owned section order를 따르며, optional 데이터는 해당 부분을 생략합니다.

## 10. Final architecture and execution flow

콘텐츠 aggregate 로드 → 선택된 template route에 전달 → hero가 template별 profile/project 파생값 소비 → section ID 목록 순회 또는 guard → 공용 섹션이 projects/skills/journey/contact를 해석 → 내부 링크가 template/debug 상태를 보존해 다음 route로 이동.

## 11. Minimal historical code evidence

`92799407457e`, `src/designs/design/home-route.tsx`, `DesignHomeRoute`/`HomeSection`:
```tsx
const sections = content.presentation.home.design.sections;
{sections.map((sectionId) => (
  <HomeSection key={sectionId} sectionId={sectionId} {...sectionProps} />
))}
```
이 발췌는 활성 여부와 순서를 같은 콘텐츠 배열이 소유하게 된 결정을 보여 줍니다.

## 12. Learning-completion checks

- [x] Frozen commit map 11개를 모두 completion record와 연결했습니다.
- [x] SHA, subject, importance, tags, source-defined role의 고정 정보를 scaffold와 동일하게 유지했습니다.
- [x] 각 historical claim을 해당 SHA diff에 한정하고 later implementation을 소급하지 않았습니다.
- [x] fix/test가 없거나 다른 category 소유인 경우 그 사실을 명시했습니다.
- [x] runtime execution status를 명시했으며 실행하지 않은 command를 성공으로 기록하지 않았습니다.
- [x] learner placeholder를 남기지 않았습니다.
