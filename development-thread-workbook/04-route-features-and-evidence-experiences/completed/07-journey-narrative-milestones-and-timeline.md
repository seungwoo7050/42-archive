# Development Thread: Journey narrative, milestones, and timeline

> **Repository:** `https://github.com/seungwoo7050/42-archive`  
> **Branch:** `web/portfolio`  
> **Category:** `04-route-features-and-evidence-experiences`  
> **Workbook state:** completed workbook  
> **Historical scope:** commits reachable from `web/portfolio` only

## 0. Phase 1 audit result and category boundary

- 포함: `/journey` page enablement, narrative intro, milestone decision record, anchor-project resolution, 전체 `journey` timeline, current-position summary.
- 제외: `JourneyList`의 paired/compact responsive primitive는 category 03, page lifecycle/query state는 category 02, route projection과 resolved-reference ownership은 category 09가 담당합니다.
- 이 Thread는 milestone reference의 소비자-side drop 정책을 다루며 schema ingestion의 fail-closed 보장은 category 01/09에 남깁니다.

- **Audit decision:** 이 Thread는 독립적인 route feature/evidence story로 유지합니다.
- **Frozen commit count:** 6
- **Importance profile:** branch-local source classification상 이 Thread의 commit은 모두 B입니다. 다른 category의 S/A-level cross-cutting architecture를 중복 편입하지 않았습니다.

## 1. Thread goal

Journey route가 feature-flagged 소개에서 결정 milestone, state/reason/result 근거, anchor projects, 전체 chronology, 현재 방향으로 확장되는 과정을 복원하고, narrative와 timeline이 서로 다른 원본과 책임을 갖는 이유를 확인합니다.

### Fixed invariants

- `isSitePageEnabled("journey", content)`가 거짓이면 route는 partial page를 보여 주지 않고 `notFound()`로 종료합니다.
- `journeyNarrative.milestones`는 결정의 상태·이유·결과와 anchor project를 설명하고, `journey`는 더 넓은 전체 시간축을 설명합니다.
- milestone의 `anchorProjectIds`는 선언 순서대로 해석하며 찾지 못한 project는 링크로 만들지 않습니다.
- anchor project가 하나도 없어도 milestone의 date/title/state/reason/result는 유지됩니다.
- current-position summary는 과거 chronology와 구분된 현재 방향이며 timeline item으로 임의 삽입되지 않습니다.

## 2. Core engineering questions

1. Journey page flag가 꺼져 있을 때 route는 어떤 control flow로 종료되는가?
2. 초기 milestone은 어떤 최소 필드를 갖고 `e292...`에서 state/reason/result가 어떻게 추가되는가?
3. anchor project 참조를 해석할 수 없을 때 milestone card 자체가 사라지는가, links만 사라지는가?
4. `journeyNarrative.milestones`와 `content.journey`는 왜 하나의 배열로 합쳐지지 않는가?
5. 현재 방향 summary가 chronology와 어떤 별도 presentation copy/data를 소비하는가?

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
| 1 | `0facaf123f29` | feat(journey): 여정 route 소개 추가 | B | ROUTING, RENDERER | feature-flagged Journey route와 narrative hero를 최초 구성합니다. |
| 2 | `fa94b86ac46e` | feat(journey): 결정 milestone 목록 추가 | B | RENDERER | journey narrative의 milestone 순서를 numbered decision list로 추가합니다. |
| 3 | `e292451824ba` | feat(journey): milestone 결정 근거 추가 | B | RENDERER | 각 milestone에 state, reason, result를 추가해 단순 chronology를 decision narrative로 확장합니다. |
| 4 | `ba8130c82d16` | feat(journey): milestone 프로젝트 근거 연결 | B | RENDERER | milestone anchor project IDs를 해석해 template-preserving case-study links를 추가합니다. |
| 5 | `a1136f34f998` | feat(journey): 전체 여정 타임라인 추가 | B | RENDERER | 결정 milestones 아래에 전체 `journey` chronology를 별도 timeline으로 추가합니다. |
| 6 | `694cf57b0162` | feat(journey): 현재 방향 요약 추가 | B | RENDERER | journey narrative의 current-position 정보를 별도 closing section으로 추가합니다. |

## 5. Commit-by-commit historical investigation

### 5.1. `0facaf123f29` — feat(journey): 여정 route 소개 추가

- **Importance:** B
- **Tags:** ROUTING, RENDERER
- **Source-defined role:** feature-flagged Journey route와 narrative hero를 최초 구성합니다.

#### Exact inspection targets

- `src/app/journey/page.tsx` — `JourneyPage`
- `isSitePageEnabled("journey", content)`와 `notFound()`
- `content.journeyNarrative.intro`
- `presentation.pages.journey.hero`
- `PageShell` current path `/journey`

#### Commit-specific investigation tasks

1. content load 직후 `isSitePageEnabled("journey", content)`와 `notFound()`의 실행 순서를 확인합니다.
2. enabled branch의 hero가 presentation copy와 `journeyNarrative.intro`를 어떻게 결합하는지 추적합니다.
3. disabled 상태에서 shell/partial content가 생성되지 않는지 control flow로 기록합니다.

#### Learner evidence record

- **Previous state:** 직전에는 journey content가 있어도 독립 `/journey` route와 page enablement 경계가 없었습니다.
- **Implementation decision and path:** content aggregate를 로드한 직후 journey page flag를 검사하고, disabled이면 `notFound()`로 종료합니다. enabled이면 narrative intro를 hero에 렌더링합니다.
- **Ownership and data lifetime:** site page configuration이 route 존재를, journey narrative가 intro를, route가 not-found transition과 hero composition을 소유합니다.
- **Failure, absence, and non-guarantee:** disabled 상태에서는 shell이나 partial content를 렌더링하지 않습니다. enabled지만 intro가 빈 경우를 위한 별도 fallback copy는 없습니다.
- **Resulting guarantee:** 비활성 Journey가 공개되지 않는 fail-closed route boundary와 최소 narrative hero를 보장합니다.
- **Relationship to later work:** `fa94...`가 hero 아래에 결정 milestone 목록을 추가합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `0facaf123f29` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.2. `fa94b86ac46e` — feat(journey): 결정 milestone 목록 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** journey narrative의 milestone 순서를 numbered decision list로 추가합니다.

#### Exact inspection targets

- `src/app/journey/page.tsx` — milestone section과 `MilestoneCard` 초기 형태
- `content.journeyNarrative.milestones`
- milestone `date`, `title` 및 초기 summary fields
- `presentation.pages.journey.narrative` heading/labels

#### Commit-specific investigation tasks

1. milestones의 content order, numbering, date/title fields를 `MilestoneCard` 초기 형태에서 확인합니다.
2. state/reason/result와 project links가 아직 없는지 exact file로 확인합니다.
3. 빈 milestones에서 section heading/list의 실제 DOM 상태를 기록합니다.

#### Learner evidence record

- **Previous state:** Journey hero는 전체 설명만 제공해 실제 전환점의 순서와 개별 결정을 구분하지 못했습니다.
- **Implementation decision and path:** narrative milestones를 content 순서대로 반복하고 각 항목에 번호·날짜·제목과 당시 제공된 설명을 표시합니다.
- **Ownership and data lifetime:** milestone 배열이 순서를, presentation이 labels를, route/card가 번호와 card hierarchy를 소유합니다.
- **Failure, absence, and non-guarantee:** milestones가 비면 section heading 아래 항목이 없으며 별도 empty state는 없습니다. project evidence나 state/reason/result 구조는 아직 완성되지 않았습니다.
- **Resulting guarantee:** 결정 전환점을 narrative 순서대로 탐색할 수 있음을 보장합니다.
- **Relationship to later work:** `e292...`가 각 milestone을 상태 변화와 근거·결과를 가진 decision record로 확장합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `fa94b86ac46e` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.3. `e292451824ba` — feat(journey): milestone 결정 근거 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** 각 milestone에 state, reason, result를 추가해 단순 chronology를 decision narrative로 확장합니다.

#### Exact inspection targets

- `src/app/journey/page.tsx` — `MilestoneCard` description list
- `JourneyMilestone`의 `state`, `reason`, `result`
- `presentation.pages.journey.narrative.labels`
- `<dl>`, `<dt>`, `<dd>` semantic structure

#### Commit-specific investigation tasks

1. milestone의 state/reason/result가 `<dl>/<dt>/<dd>`에 어떤 labels로 대응되는지 표로 작성합니다.
2. 세 fields의 순서와 content source를 확인합니다.
3. 빈 값에 대해 renderer가 자동 문구를 생성하는지 확인합니다.

#### Learner evidence record

- **Previous state:** 날짜와 제목만으로는 무엇이 바뀌었고 왜 바뀌었으며 결과가 무엇인지 복원할 수 없었습니다.
- **Implementation decision and path:** milestone card에 state/reason/result를 label-value 형태로 렌더링해 이전 상태에서 의사결정과 결과로 이어지는 인과를 명시합니다.
- **Ownership and data lifetime:** journey narrative content가 세 설명을, presentation이 labels를, card가 semantic pairing과 layout을 소유합니다.
- **Failure, absence, and non-guarantee:** 해당 문자열이 비어 있을 때 route가 자동 설명을 생성하지 않습니다. 실제 project evidence는 아직 연결되지 않습니다.
- **Resulting guarantee:** 각 milestone이 단순 이력 날짜가 아니라 state → reason → result를 가진 결정 기록임을 보장합니다.
- **Relationship to later work:** `ba813...`이 결정 설명을 실제 anchor project case studies와 연결합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `e292451824ba` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.4. `ba8130c82d16` — feat(journey): milestone 프로젝트 근거 연결

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** milestone anchor project IDs를 해석해 template-preserving case-study links를 추가합니다.

#### Exact inspection targets

- `src/app/journey/page.tsx` — `MilestoneCard`
- `milestone.anchorProjectIds.map(...find...).filter(Boolean)`
- `getTemplateHref(`/projects/${project.id}`, homeTemplate, { contentDebug })`
- `PortfolioContent.projects`와 `JourneyMilestone`

#### Commit-specific investigation tasks

1. `anchorProjectIds.map(find).filter(Boolean)` lookup과 link list guard를 추적합니다.
2. 모든 anchors가 누락돼도 milestone state/reason/result가 남는지 확인합니다.
3. `getTemplateHref`가 current template/debug state를 project links에 보존하는지 기록합니다.

#### Learner evidence record

- **Previous state:** state/reason/result는 설명은 제공했지만 독자가 그 결정의 구현 근거로 이동할 수 없었습니다.
- **Implementation decision and path:** 각 milestone의 anchor IDs를 project aggregate에서 찾고, 해석 가능한 projects만 detail links로 출력합니다.
- **Ownership and data lifetime:** milestone content가 anchor ID 순서를, project aggregate가 title/route ID를, route helper가 현재 template/debug query 보존을 소유합니다.
- **Failure, absence, and non-guarantee:** 찾지 못한 ID는 `filter(Boolean)`으로 제거됩니다. 결과가 0개여도 milestone 설명은 남고 links list만 `null`입니다.
- **Resulting guarantee:** 누락 참조를 깨진 링크로 만들지 않으면서 결정 narrative와 실제 case study를 연결함을 보장합니다.
- **Relationship to later work:** `a113...`이 narrative milestones와 별개의 전체 journey chronology를 같은 route에 추가합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `ba8130c82d16` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.5. `a1136f34f998` — feat(journey): 전체 여정 타임라인 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** 결정 milestones 아래에 전체 `journey` chronology를 별도 timeline으로 추가합니다.

#### Exact inspection targets

- `src/app/journey/page.tsx` — timeline section
- `JourneyList` 호출
- `content.journey`
- `presentation.pages.journey.timeline`
- case-study label과 template/debug props 전달

#### Commit-specific investigation tasks

1. 새 timeline이 `journeyNarrative.milestones`가 아니라 `content.journey`를 `JourneyList`에 전달하는지 확인합니다.
2. milestone section과 full timeline의 heading/source/order를 비교합니다.
3. 두 arrays를 자동 병합·중복 제거하지 않는지 code path를 기록합니다.

#### Learner evidence record

- **Previous state:** milestones는 중요한 전환점만 설명해 전체 프로젝트·학습 chronology를 대체하지 못했습니다.
- **Implementation decision and path:** 별도 timeline heading과 `JourneyList`를 추가하고 더 넓은 `content.journey` 배열을 전달합니다.
- **Ownership and data lifetime:** journey narrative가 선별된 결정 기록을, `content.journey`가 전체 시간축을, 공용 `JourneyList`가 timeline DOM과 project links를 소유합니다.
- **Failure, absence, and non-guarantee:** timeline 배열이 비어도 milestone narrative는 유지됩니다. 두 배열을 자동 병합하거나 중복 제거하지 않습니다.
- **Resulting guarantee:** 중요한 결정 narrative와 포괄적 chronology를 같은 페이지에서 서로 다른 의미로 제공함을 보장합니다.
- **Relationship to later work:** `694...`가 과거 이력과 구분되는 현재 방향 요약을 마지막에 추가합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `a1136f34f998` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.6. `694cf57b0162` — feat(journey): 현재 방향 요약 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** journey narrative의 current-position 정보를 별도 closing section으로 추가합니다.

#### Exact inspection targets

- `src/app/journey/page.tsx` — current-position/current-direction section
- `content.journeyNarrative.currentPosition` 또는 해당 current state field
- `presentation.pages.journey`의 closing labels/copy
- timeline 뒤의 section ordering

#### Commit-specific investigation tasks

1. current-position/current-direction data와 presentation labels가 어느 closing section에 연결되는지 확인합니다.
2. timeline item으로 삽입되지 않고 별도 summary로 남는지 기록합니다.
3. 빈 current state에서 임의 future goal을 생성하는 branch가 없는지 확인합니다.

#### Learner evidence record

- **Previous state:** 페이지가 과거 milestones와 timeline으로 끝나 현재 어떤 방향에 있고 무엇을 다음 기준으로 삼는지 설명하지 못했습니다.
- **Implementation decision and path:** narrative가 제공하는 현재 위치/방향 정보를 timeline과 구분된 closing section에 렌더링합니다.
- **Ownership and data lifetime:** journey narrative content가 현재 상태를, presentation이 framing copy를, route가 마지막 section 배치를 소유합니다.
- **Failure, absence, and non-guarantee:** 현재 방향 값이 비어 있을 때 임의 목표를 생성하지 않습니다. 이 정보는 자동 progress tracker나 future guarantee가 아닙니다.
- **Resulting guarantee:** 과거 chronology와 현재 방향을 혼합하지 않고, 현재 편집 시점의 상태를 별도 claim으로 공개함을 보장합니다.
- **Relationship to later work:** 후대 Journey view model은 category 09에서 anchor references를 미리 해석하고 renderer의 raw lookup을 제거합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `694cf57b0162` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

## 6. Invariant evolution

| Stage | Historical reconstruction |
|---|---|
| Route 존재 | `0fac...`이 page flag를 검사해 disabled Journey를 `notFound()`로 닫았습니다. |
| 결정 목록 | `fa94...`가 milestones를 도입하고 `e292...`가 state/reason/result 인과로 확장했습니다. |
| 근거 연결 | `ba813...`이 anchor project IDs를 해석하고 누락 참조는 links에서 제거했습니다. |
| 두 시간축 | `a113...`이 선별 milestone과 별개인 전체 journey timeline을 추가했습니다. |
| 현재 상태 | `694...`가 과거 기록 뒤에 현재 방향을 별도 claim으로 배치했습니다. |

## 7. Failure → Fix → Test and later relationships

- Failure/absence correction: `ba813...`은 누락 anchor reference를 예외로 만들지 않고 해당 link만 제거합니다. milestone narrative는 보존됩니다.
- Milestone list와 full timeline은 중복 구현이 아니라 서로 다른 source와 granularity를 가진 병렬 evidence입니다.
- 전용 fix/test commit은 frozen map에 없습니다. 후대 resolved-reference view model과 renderer-boundary tests는 category 09에서 다룹니다.

## 8. Ownership, state, and responsibility changes

- Site page config: `/journey` 공개 여부.
- Journey narrative: intro, milestones, state/reason/result, anchor IDs, current position.
- Journey array: 전체 chronology와 item 순서.
- Journey route: feature gate, milestone reference resolution, section ordering.
- JourneyList: timeline DOM, case-study link expression, responsive presentation.

## 9. Final thread state

Journey route는 disabled이면 404로 닫히고, enabled이면 narrative intro, 결정 milestones, 해석 가능한 anchor projects, 별도의 전체 chronology, 현재 방향을 순서대로 제공합니다. 누락 anchor는 link만 제거하며 milestone 설명은 남습니다.

## 10. Final architecture and execution flow

content aggregate 로드 → journey page flag 검사 → disabled이면 `notFound()` → enabled이면 narrative hero → milestones 순회 및 state/reason/result 출력 → anchor IDs를 project aggregate에 해석하고 찾은 links만 생성 → 별도 `content.journey` timeline 렌더링 → current-position closing summary.

## 11. Minimal historical code evidence

`ba8130c82d16`, `src/app/journey/page.tsx`, `MilestoneCard`:
```tsx
const anchorProjects = milestone.anchorProjectIds
  .map((projectId) => content.projects.find((project) => project.id === projectId))
  .filter((project): project is NonNullable<typeof project> => Boolean(project));
```
이 발췌는 milestone 자체와 optional project evidence를 분리하고, 누락 참조를 깨진 route로 만들지 않는 정책을 보여 줍니다.

## 12. Learning-completion checks

- [x] Frozen commit map 6개를 모두 completion record와 연결했습니다.
- [x] SHA, subject, importance, tags, source-defined role의 고정 정보를 scaffold와 동일하게 유지했습니다.
- [x] 각 historical claim을 해당 SHA diff에 한정하고 later implementation을 소급하지 않았습니다.
- [x] fix/test가 없거나 다른 category 소유인 경우 그 사실을 명시했습니다.
- [x] runtime execution status를 명시했으며 실행하지 않은 command를 성공으로 기록하지 않았습니다.
- [x] learner placeholder를 남기지 않았습니다.
