# Development Thread: Dual home composition and content-driven sections

> **Repository:** `https://github.com/seungwoo7050/42-archive`  
> **Branch:** `web/portfolio`  
> **Category:** `04-route-features-and-evidence-experiences`  
> **Workbook state:** Phase 1 frozen scaffold  
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

- [ ] 모든 commit을 부모 상태와 exact SHA에서 비교하고 final HEAD를 과거에 투영하지 않았습니다.
- [ ] 각 commit의 concrete file/function/component/data field와 caller→callee 또는 data flow를 기록했습니다.
- [ ] optional data, missing reference, empty array, disabled page 등 실제 failure/absence branch를 설명했습니다.
- [ ] 소유권·표시 책임·상태 전환과 적용되지 않는 resource cleanup을 구분했습니다.
- [ ] 보장과 비보장을 분리하고 후속 commit/category와의 관계를 연결했습니다.
- [ ] 실행하지 않은 build/test/runtime 결과를 통과했다고 표시하지 않았습니다.

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

<!-- learner: 부모 상태와 정확한 SHA diff를 대조해 아래 항목을 채우십시오. final HEAD의 구현을 이 시점에 소급하지 마십시오. -->
- **Previous state:**
- **Implementation decision and path:**
- **Ownership and data lifetime:**
- **Failure, absence, and non-guarantee:**
- **Resulting guarantee:**
- **Relationship to later work:**
- **Resource acquisition and cleanup, or why not applicable:**

#### Execution evidence

<!-- learner: 실제로 실행한 명령이 있으면 exact SHA, command, relevant result를 기록하십시오. 실행하지 못했다면 정적 검토와 환경 제한을 구분해 설명하십시오. -->

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

<!-- learner: 부모 상태와 정확한 SHA diff를 대조해 아래 항목을 채우십시오. final HEAD의 구현을 이 시점에 소급하지 마십시오. -->
- **Previous state:**
- **Implementation decision and path:**
- **Ownership and data lifetime:**
- **Failure, absence, and non-guarantee:**
- **Resulting guarantee:**
- **Relationship to later work:**
- **Resource acquisition and cleanup, or why not applicable:**

#### Execution evidence

<!-- learner: 실제로 실행한 명령이 있으면 exact SHA, command, relevant result를 기록하십시오. 실행하지 못했다면 정적 검토와 환경 제한을 구분해 설명하십시오. -->

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

<!-- learner: 부모 상태와 정확한 SHA diff를 대조해 아래 항목을 채우십시오. final HEAD의 구현을 이 시점에 소급하지 마십시오. -->
- **Previous state:**
- **Implementation decision and path:**
- **Ownership and data lifetime:**
- **Failure, absence, and non-guarantee:**
- **Resulting guarantee:**
- **Relationship to later work:**
- **Resource acquisition and cleanup, or why not applicable:**

#### Execution evidence

<!-- learner: 실제로 실행한 명령이 있으면 exact SHA, command, relevant result를 기록하십시오. 실행하지 못했다면 정적 검토와 환경 제한을 구분해 설명하십시오. -->

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

<!-- learner: 부모 상태와 정확한 SHA diff를 대조해 아래 항목을 채우십시오. final HEAD의 구현을 이 시점에 소급하지 마십시오. -->
- **Previous state:**
- **Implementation decision and path:**
- **Ownership and data lifetime:**
- **Failure, absence, and non-guarantee:**
- **Resulting guarantee:**
- **Relationship to later work:**
- **Resource acquisition and cleanup, or why not applicable:**

#### Execution evidence

<!-- learner: 실제로 실행한 명령이 있으면 exact SHA, command, relevant result를 기록하십시오. 실행하지 못했다면 정적 검토와 환경 제한을 구분해 설명하십시오. -->

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

<!-- learner: 부모 상태와 정확한 SHA diff를 대조해 아래 항목을 채우십시오. final HEAD의 구현을 이 시점에 소급하지 마십시오. -->
- **Previous state:**
- **Implementation decision and path:**
- **Ownership and data lifetime:**
- **Failure, absence, and non-guarantee:**
- **Resulting guarantee:**
- **Relationship to later work:**
- **Resource acquisition and cleanup, or why not applicable:**

#### Execution evidence

<!-- learner: 실제로 실행한 명령이 있으면 exact SHA, command, relevant result를 기록하십시오. 실행하지 못했다면 정적 검토와 환경 제한을 구분해 설명하십시오. -->

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

<!-- learner: 부모 상태와 정확한 SHA diff를 대조해 아래 항목을 채우십시오. final HEAD의 구현을 이 시점에 소급하지 마십시오. -->
- **Previous state:**
- **Implementation decision and path:**
- **Ownership and data lifetime:**
- **Failure, absence, and non-guarantee:**
- **Resulting guarantee:**
- **Relationship to later work:**
- **Resource acquisition and cleanup, or why not applicable:**

#### Execution evidence

<!-- learner: 실제로 실행한 명령이 있으면 exact SHA, command, relevant result를 기록하십시오. 실행하지 못했다면 정적 검토와 환경 제한을 구분해 설명하십시오. -->

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

<!-- learner: 부모 상태와 정확한 SHA diff를 대조해 아래 항목을 채우십시오. final HEAD의 구현을 이 시점에 소급하지 마십시오. -->
- **Previous state:**
- **Implementation decision and path:**
- **Ownership and data lifetime:**
- **Failure, absence, and non-guarantee:**
- **Resulting guarantee:**
- **Relationship to later work:**
- **Resource acquisition and cleanup, or why not applicable:**

#### Execution evidence

<!-- learner: 실제로 실행한 명령이 있으면 exact SHA, command, relevant result를 기록하십시오. 실행하지 못했다면 정적 검토와 환경 제한을 구분해 설명하십시오. -->

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

<!-- learner: 부모 상태와 정확한 SHA diff를 대조해 아래 항목을 채우십시오. final HEAD의 구현을 이 시점에 소급하지 마십시오. -->
- **Previous state:**
- **Implementation decision and path:**
- **Ownership and data lifetime:**
- **Failure, absence, and non-guarantee:**
- **Resulting guarantee:**
- **Relationship to later work:**
- **Resource acquisition and cleanup, or why not applicable:**

#### Execution evidence

<!-- learner: 실제로 실행한 명령이 있으면 exact SHA, command, relevant result를 기록하십시오. 실행하지 못했다면 정적 검토와 환경 제한을 구분해 설명하십시오. -->

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

<!-- learner: 부모 상태와 정확한 SHA diff를 대조해 아래 항목을 채우십시오. final HEAD의 구현을 이 시점에 소급하지 마십시오. -->
- **Previous state:**
- **Implementation decision and path:**
- **Ownership and data lifetime:**
- **Failure, absence, and non-guarantee:**
- **Resulting guarantee:**
- **Relationship to later work:**
- **Resource acquisition and cleanup, or why not applicable:**

#### Execution evidence

<!-- learner: 실제로 실행한 명령이 있으면 exact SHA, command, relevant result를 기록하십시오. 실행하지 못했다면 정적 검토와 환경 제한을 구분해 설명하십시오. -->

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

<!-- learner: 부모 상태와 정확한 SHA diff를 대조해 아래 항목을 채우십시오. final HEAD의 구현을 이 시점에 소급하지 마십시오. -->
- **Previous state:**
- **Implementation decision and path:**
- **Ownership and data lifetime:**
- **Failure, absence, and non-guarantee:**
- **Resulting guarantee:**
- **Relationship to later work:**
- **Resource acquisition and cleanup, or why not applicable:**

#### Execution evidence

<!-- learner: 실제로 실행한 명령이 있으면 exact SHA, command, relevant result를 기록하십시오. 실행하지 못했다면 정적 검토와 환경 제한을 구분해 설명하십시오. -->

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

<!-- learner: 부모 상태와 정확한 SHA diff를 대조해 아래 항목을 채우십시오. final HEAD의 구현을 이 시점에 소급하지 마십시오. -->
- **Previous state:**
- **Implementation decision and path:**
- **Ownership and data lifetime:**
- **Failure, absence, and non-guarantee:**
- **Resulting guarantee:**
- **Relationship to later work:**
- **Resource acquisition and cleanup, or why not applicable:**

#### Execution evidence

<!-- learner: 실제로 실행한 명령이 있으면 exact SHA, command, relevant result를 기록하십시오. 실행하지 못했다면 정적 검토와 환경 제한을 구분해 설명하십시오. -->

## 6. Invariant evolution

<!-- learner: invariant가 도입·확장·불충분 판정·교정·검증된 순서를 commit SHA와 함께 복원하십시오. -->

## 7. Failure → Fix → Test and later relationships

<!-- learner: Failure → Fix → Test 또는 구현 → integration → regression 관계를 기록하십시오. 해당 commit이 없으면 왜 없는지 설명하십시오. -->

## 8. Ownership, state, and responsibility changes

<!-- learner: content, selector, route, shared component, later view model 사이의 소유권·책임 이동을 기록하십시오. -->

## 9. Final thread state

<!-- learner: frozen commit map 마지막 상태에서 이 Thread가 보장하는 기능과 보장하지 않는 범위를 요약하십시오. -->

## 10. Final architecture and execution flow

<!-- learner: source data에서 route/component/link/failure branch까지 최종 실행·표현 흐름을 순서대로 설명하십시오. -->

## 11. Minimal historical code evidence

<!-- learner: 설계·상태 전환·참조 해석·failure branch를 가장 잘 보여 주는 exact-SHA 최소 code excerpt를 하나 선택하고 SHA/path/symbol을 명시하십시오. -->

## 12. Learning-completion checks

- [ ] Frozen commit map 11개를 모두 completion record와 연결했습니다.
- [ ] SHA, subject, importance, tags, source-defined role의 고정 정보를 scaffold와 동일하게 유지했습니다.
- [ ] 각 historical claim을 해당 SHA diff에 한정하고 later implementation을 소급하지 않았습니다.
- [ ] fix/test가 없거나 다른 category 소유인 경우 그 사실을 명시했습니다.
- [ ] runtime execution status를 명시했으며 실행하지 않은 command를 성공으로 기록하지 않았습니다.
- [ ] learner placeholder를 남기지 않았습니다.
