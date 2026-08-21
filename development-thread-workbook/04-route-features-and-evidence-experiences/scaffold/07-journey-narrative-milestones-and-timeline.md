# Development Thread: Journey narrative, milestones, and timeline

> **Repository:** `https://github.com/seungwoo7050/42-archive`  
> **Branch:** `web/portfolio`  
> **Category:** `04-route-features-and-evidence-experiences`  
> **Workbook state:** Phase 1 frozen scaffold  
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

- [ ] 모든 commit을 부모 상태와 exact SHA에서 비교하고 final HEAD를 과거에 투영하지 않았습니다.
- [ ] 각 commit의 concrete file/function/component/data field와 caller→callee 또는 data flow를 기록했습니다.
- [ ] optional data, missing reference, empty array, disabled page 등 실제 failure/absence branch를 설명했습니다.
- [ ] 소유권·표시 책임·상태 전환과 적용되지 않는 resource cleanup을 구분했습니다.
- [ ] 보장과 비보장을 분리하고 후속 commit/category와의 관계를 연결했습니다.
- [ ] 실행하지 않은 build/test/runtime 결과를 통과했다고 표시하지 않았습니다.

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

- [ ] Frozen commit map 6개를 모두 completion record와 연결했습니다.
- [ ] SHA, subject, importance, tags, source-defined role의 고정 정보를 scaffold와 동일하게 유지했습니다.
- [ ] 각 historical claim을 해당 SHA diff에 한정하고 later implementation을 소급하지 않았습니다.
- [ ] fix/test가 없거나 다른 category 소유인 경우 그 사실을 명시했습니다.
- [ ] runtime execution status를 명시했으며 실행하지 않은 command를 성공으로 기록하지 않았습니다.
- [ ] learner placeholder를 남기지 않았습니다.
