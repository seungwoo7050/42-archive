# Development Thread: About profile, skills, experience, and curation

> **Repository:** `https://github.com/seungwoo7050/42-archive`  
> **Branch:** `web/portfolio`  
> **Category:** `04-route-features-and-evidence-experiences`  
> **Workbook state:** completed workbook  
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

- [x] 모든 commit을 부모 상태와 exact SHA에서 비교하고 final HEAD를 과거에 투영하지 않았습니다.
- [x] 각 commit의 concrete file/function/component/data field와 caller→callee 또는 data flow를 기록했습니다.
- [x] optional data, missing reference, empty array, disabled page 등 실제 failure/absence branch를 설명했습니다.
- [x] 소유권·표시 책임·상태 전환과 적용되지 않는 resource cleanup을 구분했습니다.
- [x] 보장과 비보장을 분리하고 후속 commit/category와의 관계를 연결했습니다.
- [x] 실행하지 않은 build/test/runtime 결과를 통과했다고 표시하지 않았습니다.

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

- **Previous state:** 직전에는 `/about`에서 profile summary와 principles를 실제 페이지 구조로 제시하는 route가 없었습니다.
- **Implementation decision and path:** `AboutPage`가 content aggregate와 query state를 읽어 `PageShell`을 만들고, profile identity/summary와 principles 카드를 두 섹션으로 렌더링합니다.
- **Ownership and data lifetime:** profile과 presentation JSON이 문구를 소유하고, route가 섹션 배치와 principles 반복을 소유합니다. shell은 navigation/template switcher chrome을 소유합니다.
- **Failure, absence, and non-guarantee:** principles가 비면 heading 아래 카드 목록만 비며 별도 empty state는 없습니다. 이 시점에는 photo, journey, skills, experience, curation이 없습니다.
- **Resulting guarantee:** About의 최소 profile/principles 경험과 content-debug source hint를 보장합니다. 후속 evidence sections나 page disable 정책은 보장하지 않습니다.
- **Relationship to later work:** `edf8...`부터 같은 route에 journey와 다른 evidence sections가 누적됩니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `7fe913796acb` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

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

- **Previous state:** profile과 principles만으로는 경력의 시간적 순서와 프로젝트 전개를 보여 주지 못했습니다.
- **Implementation decision and path:** About route가 `content.journey`를 공용 `JourneyList`에 전달하고 presentation copy로 별도 journey section을 구성합니다.
- **Ownership and data lifetime:** journey 원본과 순서는 content가, timeline DOM과 project 링크 표현은 `JourneyList`가, section 배치는 About route가 소유합니다.
- **Failure, absence, and non-guarantee:** journey 배열이 비면 timeline 항목이 없으며 별도 오류나 placeholder를 만들지 않습니다. narrative milestone의 state/reason/result는 이 목록에 포함되지 않습니다.
- **Resulting guarantee:** About에서 전체 journey chronology를 재사용할 수 있음을 보장합니다. `/journey`의 깊은 의사결정 narrative는 보장하지 않습니다.
- **Relationship to later work:** `bea99...`가 기술 그룹을, Journey Thread가 별도의 milestone narrative를 추가합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `edf8e75716a3` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

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

- **Previous state:** About에는 시간적 맥락은 있었지만 어떤 기술 묶음을 다루는지 구조적으로 보여 주는 영역이 없었습니다.
- **Implementation decision and path:** 각 skills group의 title과 item ID 목록을 카드로 구성하고, 실제 기술 표시를 공용 `StackList`에 위임합니다.
- **Ownership and data lifetime:** group membership와 순서는 skills content가, 기술 ID의 표시 해석은 `StackList`/canonical tech stack이, 카드 배치는 About route가 소유합니다.
- **Failure, absence, and non-guarantee:** groups가 비면 섹션 내용이 비고, canonical metadata가 없는 ID의 표현은 `StackList`의 별도 fallback 정책에 따릅니다.
- **Resulting guarantee:** About가 skills taxonomy를 content-driven하게 표현한다는 것을 보장합니다. 아이콘 매핑의 완전성은 보장하지 않습니다.
- **Relationship to later work:** `4b9c...`가 group membership과 별개인 focus-area 설명을 추가합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `bea99bce4478` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

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

- **Previous state:** About hero는 identity와 summary만 보여 주고 profile의 photo metadata를 소비하지 않았습니다.
- **Implementation decision and path:** `content.profile.photo`가 있을 때만 공용 `ProfilePhoto`를 렌더링하도록 hero 구성을 확장합니다.
- **Ownership and data lifetime:** photo metadata는 profile content가, 이미지 최적화·fallback 표현은 공용 component가, 존재 여부에 따른 배치는 About route가 소유합니다.
- **Failure, absence, and non-guarantee:** photo가 없으면 이미지 부분만 `null`이고 name, handle, title, summary는 그대로 남습니다. 깨진 asset의 runtime 처리까지 이 커밋이 보장하지 않습니다.
- **Resulting guarantee:** 이미지 부재가 About 전체 실패로 전파되지 않는 optional media 계약을 보장합니다.
- **Relationship to later work:** `4b9c...`은 별도 skills focus evidence를 추가하며 photo 조건과 독립적입니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `a00a6bf1af58` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

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

- **Previous state:** 기술 그룹은 ID 묶음만 보여 주어 어떤 문제 영역에 집중하는지 설명하지 못했습니다.
- **Implementation decision and path:** focus area의 title/body를 독립 카드로 반복해 기술 선택의 서술적 맥락을 추가합니다.
- **Ownership and data lifetime:** focus-area 문구와 순서는 skills content가, 카드 구조와 section placement는 About route가 소유합니다.
- **Failure, absence, and non-guarantee:** 배열이 비면 카드가 없으며 별도 empty state는 없습니다. title 중복이나 content quality 검증은 이 route의 책임이 아닙니다.
- **Resulting guarantee:** About가 기술 taxonomy와 기술적 관심 설명을 별도 evidence로 제공함을 보장합니다.
- **Relationship to later work:** `a772...`가 실제 experience records를 연결해 설명을 경력 근거로 확장합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `4b9c2894a756` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

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

- **Previous state:** About는 원칙과 기술을 설명했지만 실제 역할·기간·업무 경험을 직접 제시하지 않았습니다.
- **Implementation decision and path:** experience 배열을 순서대로 카드/목록으로 렌더링해 profile claim을 경력 기록과 연결합니다.
- **Ownership and data lifetime:** 경력 데이터와 순서는 experience content가, 표현 계층과 section placement는 About route가 소유합니다.
- **Failure, absence, and non-guarantee:** experience가 비어도 이전 About sections는 유지되며 이 시점에는 별도의 empty-state copy를 만들지 않습니다.
- **Resulting guarantee:** About가 실제 experience content를 profile 설명과 같은 route에서 제시함을 보장합니다.
- **Relationship to later work:** `924...`부터 프로젝트 선택 기준을 설명하는 별도의 curation 영역이 조건부로 추가됩니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `a7723eb193eb` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

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

- **Previous state:** About는 무엇을 했는지는 보여 줬지만 어떤 기준으로 대표 evidence를 선택하는지 공개하지 않았습니다.
- **Implementation decision and path:** curation page가 활성화된 경우에만 intro와 criteria cards를 렌더링하고 presentation copy를 section heading에 사용합니다.
- **Ownership and data lifetime:** site page flag가 section 존재를, curation content가 기준 문구를, About route가 표현 구조를 소유합니다.
- **Failure, absence, and non-guarantee:** flag가 꺼져 있으면 curation section 전체가 없습니다. criteria가 비면 intro와 heading은 남고 card 목록만 비며, 이 커밋은 project links를 아직 만들지 않습니다.
- **Resulting guarantee:** 비활성 curation을 암묵적으로 공개하지 않고, 활성 상태에서 선택 기준을 명시적으로 보여 줌을 보장합니다.
- **Relationship to later work:** `809...`가 기준 설명을 실제 project categories와 연결합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `924bcd75aade` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

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

- **Previous state:** curation 기준은 설명만 있었고 어떤 프로젝트가 각 기준 범주를 뒷받침하는지 탐색할 수 없었습니다.
- **Implementation decision and path:** 각 category의 label/rationale을 유지하면서 project IDs를 project aggregate에 해석하고, 찾은 항목만 detail 링크로 출력합니다.
- **Ownership and data lifetime:** category가 ID 순서와 rationale을, project aggregate가 표시 title과 실제 route ID를, route helper가 template/debug query 보존을 소유합니다.
- **Failure, absence, and non-guarantee:** 찾지 못한 project ID는 `filter(Boolean)`으로 제거됩니다. 모두 누락돼도 category card와 rationale은 남고 project link list만 생략됩니다.
- **Resulting guarantee:** 잘못된 참조가 깨진 링크로 공개되지 않고, 해석 가능한 근거만 원본 category 순서로 연결됨을 보장합니다.
- **Relationship to later work:** `a65f...`가 아직 의도적으로 비워 둔 영역과 재검토 시점을 큐레이션 설명에 추가합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `80903ec6197f` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

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

- **Previous state:** criteria와 categories만 있으면 현재 evidence가 완전하고 영구적인 선택처럼 보일 수 있었습니다.
- **Implementation decision and path:** 의도적으로 제외되거나 아직 부족한 항목과 다음 재검토 정보를 curation section에 추가해 선택의 시간적·범위 한계를 표시합니다.
- **Ownership and data lifetime:** curation content가 공백과 review 계획을 소유하고, presentation이 label을, route가 해당 정보를 criteria/categories와 구분해 배치합니다.
- **Failure, absence, and non-guarantee:** 공백 목록이 비면 목록 내용이 없고, review 값이 없을 때 임의 날짜를 만들지 않습니다. 이 정보는 자동 검증이나 scheduler가 아닙니다.
- **Resulting guarantee:** 현재 curation이 완전성 보장이 아니라 명시된 기준·공백·재검토를 가진 편집 상태임을 보여 줍니다.
- **Relationship to later work:** 후대 route projection은 category 09에서 이 데이터를 renderer-safe model로 옮기지만 의미는 그대로 유지합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `a65f27363837` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

## 6. Invariant evolution

| Stage | Historical reconstruction |
|---|---|
| 기본 identity | `7fe...`가 profile summary와 principles를 About의 최소 계약으로 만들었습니다. |
| 근거 축 확장 | `edf...`부터 journey, skills, photo, focus areas, experience가 각각 독립 evidence section으로 추가됐습니다. |
| 큐레이션 활성 경계 | `924...`가 page flag를 section 존재의 선행 조건으로 만들었습니다. |
| 참조 해석 | `809...`가 category project IDs를 해석하되 누락 참조는 링크로 만들지 않는 정책을 도입했습니다. |
| 비보장 공개 | `a65...`가 omissions와 review 정보를 통해 큐레이션의 한계를 명시했습니다. |

## 7. Failure → Fix → Test and later relationships

- 이 frozen map에는 생산 코드를 직접 교정하는 fix commit이나 전용 regression test가 없습니다.
- `809...`의 missing-project drop은 runtime exception 복구가 아니라 소비자 측 참조 해석 정책입니다. schema-level invalid reference 차단은 category 01/09에서 다룹니다.
- 공용 Journey/Stack/ProfilePhoto의 interaction·fallback 회귀는 category 03/07의 테스트 책임이므로 이 문서에서 실행됐다고 주장하지 않습니다.

## 8. Ownership, state, and responsibility changes

- Profile/skills/experience/journey/curation JSON: claim과 배열 순서, page-specific evidence 원본.
- Site/presentation: curation 활성 여부와 route copy/labels.
- About route: section composition, optional photo, curation categories와 reference resolution.
- 공용 components: timeline, stack, photo의 표현 세부사항.
- 후대 About view model: category 09에서 raw aggregate 접근을 줄이되 이 route-feature 의미를 보존합니다.

## 9. Final thread state

About route는 profile·principles를 중심으로 journey, skills, focus areas, experience를 조립하고, curation이 활성화된 경우 기준·범주·공백·재검토를 추가합니다. 누락 project reference는 링크에서 제거되지만 category 설명은 유지됩니다.

## 10. Final architecture and execution flow

content aggregate와 page flag 로드 → `/about` 활성 route 구성 → profile/principles 및 optional photo 렌더링 → journey/skills/focus/experience evidence 반복 → curation flag 확인 → criteria와 categories 렌더링 → category project IDs를 aggregate에 해석 → 찾은 프로젝트만 template/debug-preserving detail 링크로 출력 → omissions/review로 비보장 범위 공개.

## 11. Minimal historical code evidence

`80903ec6197f`, `src/app/about/page.tsx`, `CurationCategoryCard`:
```tsx
const projects = category.projectIds
  .map((projectId) => content.projects.find((project) => project.id === projectId))
  .filter((project): project is NonNullable<typeof project> => Boolean(project));
```
이 발췌는 category 순서를 보존하면서 해석할 수 없는 참조를 깨진 링크로 만들지 않는 소비자 정책을 보여 줍니다.

## 12. Learning-completion checks

- [x] Frozen commit map 9개를 모두 completion record와 연결했습니다.
- [x] SHA, subject, importance, tags, source-defined role의 고정 정보를 scaffold와 동일하게 유지했습니다.
- [x] 각 historical claim을 해당 SHA diff에 한정하고 later implementation을 소급하지 않았습니다.
- [x] fix/test가 없거나 다른 category 소유인 경우 그 사실을 명시했습니다.
- [x] runtime execution status를 명시했으며 실행하지 않은 command를 성공으로 기록하지 않았습니다.
- [x] learner placeholder를 남기지 않았습니다.
