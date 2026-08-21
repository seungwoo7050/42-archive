# Development Thread: About profile, skills, experience, and curation

> **Repository:** `https://github.com/seungwoo7050/42-archive`  
> **Branch:** `web/portfolio`  
> **Category:** `04-route-features-and-evidence-experiences`  
> **Workbook state:** Phase 1 frozen scaffold  
> **Historical scope:** commits reachable from `web/portfolio` only

## 0. Phase 1 audit result and category boundary

- 포함: `/about`의 profile·principles·journey·skills·focus areas·experience·curation 표현과 큐레이션 프로젝트 참조 해석.
- 제외: 공용 `JourneyList`, `StackList`, 이미지 primitive의 내부 상호작용은 category 03, route query/lifecycle은 category 02, 후대 About view-model 소유권은 category 09가 담당합니다.
- 큐레이션의 schema validation과 fail-closed ingestion은 category 01/09의 책임이며, 이 Thread는 유효한 aggregate를 About 경험으로 조립하는 소비자 규칙에 집중합니다.

- **Audit decision:** 이 Thread는 독립적인 route feature/evidence story로 유지합니다.
- **Frozen commit count:** 9
- **Importance profile:** branch-local source classification상 이 Thread의 commit은 모두 B입니다. 다른 category의 S/A-level cross-cutting architecture를 중복 편입하지 않았습니다.

## 1. Thread goal

About route가 profile 소개에서 시작해 journey, 기술 그룹, 경력, 큐레이션 기준과 프로젝트 범주를 단계적으로 결합하는 과정을 복원하고, optional media·page enablement·누락 프로젝트 참조의 실제 처리 규칙을 확인합니다.

### Fixed invariants

- About의 기본 profile·principles는 `profile`과 `presentation.pages.about`에서 오며 route가 별도 하드코딩된 자기소개를 소유하지 않습니다.
- profile photo는 optional이며 없으면 소개 본문은 유지되고 이미지 부분만 생략됩니다.
- curation section은 `isSitePageEnabled("curation", content)`가 참일 때만 존재합니다.
- 큐레이션 category의 `projectIds`는 원본 순서대로 해석하며 찾지 못한 ID는 링크로 만들지 않습니다.
- curation criteria, categories, omissions, next-review 정보는 각각 다른 의미를 가지며 누락 참조를 임의의 프로젝트로 대체하지 않습니다.

## 2. Core engineering questions

1. 초기 About route는 profile과 principles의 어느 필드를 직접 소비하는가?
2. journey·skills·experience가 추가되면서 route가 어떤 공용 renderer를 호출하고 어떤 데이터는 계속 직접 반복하는가?
3. photo가 없거나 skills/experience 배열이 비면 어느 DOM만 생략되는가?
4. curation page flag와 curation data의 존재는 어떻게 구분되는가?
5. category `projectIds` 중 해석할 수 없는 값은 어떤 방식으로 제거되며 category 설명 자체는 남는가?

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
| 1 | `7fe913796acb` | feat(about): 프로필과 원칙 소개 추가 | B | RENDERER | About route의 profile hero와 principles 목록을 최초 구성합니다. |
| 2 | `edf8e75716a3` | feat(about): 여정 요약 추가 | B | RENDERER | About에 전체 journey의 요약 timeline을 추가합니다. |
| 3 | `bea99bce4478` | feat(about): 기술 그룹 소개 추가 | B | RENDERER | skills group의 기술 ID와 설명을 About evidence로 추가합니다. |
| 4 | `a00a6bf1af58` | feat(about): 프로필 사진 소개 추가 | B | RENDERER | optional profile photo를 About hero에 통합합니다. |
| 5 | `4b9c2894a756` | feat(about): 기술 집중 영역 추가 | B | RENDERER | skills의 focus areas를 About 페이지에 설명형 evidence로 추가합니다. |
| 6 | `a7723eb193eb` | feat(about): 경력 목록 추가 | B | RENDERER | experience records를 About route의 경력 evidence로 추가합니다. |
| 7 | `924bcd75aade` | feat(about): 큐레이션 기준 소개 추가 | B | CONTENT, RENDERER | page flag로 보호되는 curation intro와 criteria를 About에 추가합니다. |
| 8 | `80903ec6197f` | feat(about): 큐레이션 프로젝트 범주 추가 | B | CONTENT, RENDERER | curation category의 project IDs를 해석해 route-preserving evidence links로 연결합니다. |
| 9 | `a65f27363837` | feat(about): 큐레이션 공백과 재검토 추가 | B | CONTENT, RENDERER | curation의 omissions와 next-review 정보를 공개해 현재 선택의 비보장 범위를 명시합니다. |

## 5. Commit-by-commit historical investigation

### 5.1. `7fe913796acb` — feat(about): 프로필과 원칙 소개 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** About route의 profile hero와 principles 목록을 최초 구성합니다.

#### Exact inspection targets

- `src/app/about/page.tsx` — `AboutPage`
- `src/content/profile.json` — `name`, `handle`, `summary`, `principles`
- `src/content/presentation.json` — `pages.about.hero`, `pages.about.principles`
- `PageShell`, `ContentHint`, `SectionHeading` 호출 경계

#### Commit-specific investigation tasks

1. `AboutPage` hero와 principles section이 profile/presentation의 어떤 fields를 직접 소비하는지 추적합니다.
2. principles의 key와 card 반복, content-debug hint 경로를 확인합니다.
3. photo/journey/skills/experience/curation이 아직 없는 최소 state를 기록합니다.

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

### 5.2. `edf8e75716a3` — feat(about): 여정 요약 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** About에 전체 journey의 요약 timeline을 추가합니다.

#### Exact inspection targets

- `src/app/about/page.tsx` — `AboutPage`의 journey section
- `JourneyList` 호출과 `content.journey` 전달
- `presentation.pages.about.journey` heading copy
- project case-study 링크의 `homeTemplate`/`contentDebug` 전달

#### Commit-specific investigation tasks

1. About journey section이 `content.journey`를 `JourneyList`에 전달하는 prop 경계를 확인합니다.
2. homeTemplate/contentDebug가 case-study links에 보존되는지 기록합니다.
3. Journey narrative milestones가 이 summary source에 포함되지 않는지 확인합니다.

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

### 5.3. `bea99bce4478` — feat(about): 기술 그룹 소개 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** skills group의 기술 ID와 설명을 About evidence로 추가합니다.

#### Exact inspection targets

- `src/app/about/page.tsx` — skills/group section
- `content.skills.groups` 반복
- `StackList` 호출과 group `items` 전달
- `src/content/site.json` — About navigation 연결 여부

#### Commit-specific investigation tasks

1. skills groups의 title/items가 About cards와 `StackList`로 어떻게 분리 전달되는지 추적합니다.
2. canonical tech metadata lookup을 About route가 직접 수행하는지 확인합니다.
3. skills groups가 비어 있을 때 section DOM과 navigation integration을 기록합니다.

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

### 5.4. `a00a6bf1af58` — feat(about): 프로필 사진 소개 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** optional profile photo를 About hero에 통합합니다.

#### Exact inspection targets

- `src/app/about/page.tsx` — hero의 `ProfilePhoto` 조건부 렌더링
- `content.profile.photo`
- `ProfilePhoto` prop 전달
- photo가 없는 branch의 기존 text layout

#### Commit-specific investigation tasks

1. `content.profile.photo` 존재 여부가 `ProfilePhoto` component를 가드하는 exact branch를 확인합니다.
2. photo가 없어도 hero text가 유지되는 layout을 부모 state와 비교합니다.
3. image loading/fallback 구현이 이 route commit에 포함되는지 별도 primitive인지 구분합니다.

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

### 5.5. `4b9c2894a756` — feat(about): 기술 집중 영역 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** skills의 focus areas를 About 페이지에 설명형 evidence로 추가합니다.

#### Exact inspection targets

- `src/app/about/page.tsx` — focus-area section
- `content.skills.focusAreas`
- `presentation.pages.about`의 해당 heading/copy
- `ContentHint`가 가리키는 `src/content/skills.json` 경로

#### Commit-specific investigation tasks

1. focus-area title/body 반복과 presentation heading의 source를 확인합니다.
2. skills group ID 목록과 focus-area 설명이 별도 data paths인지 구분합니다.
3. 빈 focusAreas의 DOM 상태와 duplicate-title key 비보장을 기록합니다.

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

### 5.6. `a7723eb193eb` — feat(about): 경력 목록 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** experience records를 About route의 경력 evidence로 추가합니다.

#### Exact inspection targets

- `src/app/about/page.tsx` — experience section과 item 반복
- `content.experience`
- role/company/period/description 또는 highlights 소비 위치
- `ContentHint`의 `src/content/experience.json` 참조

#### Commit-specific investigation tasks

1. experience records가 role/company/period/description/highlights 중 어떤 fields로 표현되는지 exact SHA에서 확인합니다.
2. profile/skills claims와 experience evidence의 section ordering을 기록합니다.
3. experience가 비었을 때 section guard가 있는지 확인합니다.

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

### 5.7. `924bcd75aade` — feat(about): 큐레이션 기준 소개 추가

- **Importance:** B
- **Tags:** CONTENT, RENDERER
- **Source-defined role:** page flag로 보호되는 curation intro와 criteria를 About에 추가합니다.

#### Exact inspection targets

- `src/app/about/page.tsx` — `isSitePageEnabled("curation", content)`, `CurationSection`
- `content.curation.intro`, `content.curation.criteria.items`
- `presentation.pages.about.curation`
- `CurationSection`의 `aria-label`과 criteria card 반복

#### Commit-specific investigation tasks

1. `isSitePageEnabled("curation", content)`가 `CurationSection` 전체를 가드하는 위치를 확인합니다.
2. curation intro와 criteria items가 presentation copy와 어떻게 결합되는지 추적합니다.
3. page flag off와 criteria empty를 서로 다른 상태로 기록합니다.

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

### 5.8. `80903ec6197f` — feat(about): 큐레이션 프로젝트 범주 추가

- **Importance:** B
- **Tags:** CONTENT, RENDERER
- **Source-defined role:** curation category의 project IDs를 해석해 route-preserving evidence links로 연결합니다.

#### Exact inspection targets

- `src/app/about/page.tsx` — `CurationSection`, `CurationCategoryCard`
- `category.projectIds.map(...find...).filter(Boolean)`
- `getTemplateHref(`/projects/${project.id}`, homeTemplate, { contentDebug })`
- `content.curation.categories`와 `PortfolioContent.projects`

#### Commit-specific investigation tasks

1. `CurationCategoryCard`의 `projectIds.map(find).filter(Boolean)` lookup을 단계별로 재현합니다.
2. 모든 project ID가 누락될 때 category rationale과 links list 중 무엇이 남는지 확인합니다.
3. `getTemplateHref`가 template/debug state를 detail links에 보존하는지 기록합니다.

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

### 5.9. `a65f27363837` — feat(about): 큐레이션 공백과 재검토 추가

- **Importance:** B
- **Tags:** CONTENT, RENDERER
- **Source-defined role:** curation의 omissions와 next-review 정보를 공개해 현재 선택의 비보장 범위를 명시합니다.

#### Exact inspection targets

- `src/app/about/page.tsx` — `CurationSection`의 omissions/next-review 영역
- `src/content/curation.json` — omissions와 review 관련 필드
- `src/content/presentation.json` — About curation labels
- 비어 있는 omissions/review 값의 조건부 branch

#### Commit-specific investigation tasks

1. curation omissions와 next-review data가 criteria/categories와 다른 section/labels로 표현되는지 확인합니다.
2. 빈 omissions 또는 review 정보에 대한 conditional branch를 기록합니다.
3. 이 data가 자동 검증·scheduler가 아니라 편집된 non-guarantee disclosure임을 code/content 경계로 확인합니다.

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

- [ ] Frozen commit map 9개를 모두 completion record와 연결했습니다.
- [ ] SHA, subject, importance, tags, source-defined role의 고정 정보를 scaffold와 동일하게 유지했습니다.
- [ ] 각 historical claim을 해당 SHA diff에 한정하고 later implementation을 소급하지 않았습니다.
- [ ] fix/test가 없거나 다른 category 소유인 경우 그 사실을 명시했습니다.
- [ ] runtime execution status를 명시했으며 실행하지 않은 command를 성공으로 기록하지 않았습니다.
- [ ] learner placeholder를 남기지 않았습니다.
