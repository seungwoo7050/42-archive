# Development Thread: Interview evidence map and gaps

> **Repository:** `https://github.com/seungwoo7050/42-archive`  
> **Branch:** `web/portfolio`  
> **Category:** `04-route-features-and-evidence-experiences`  
> **Workbook state:** Phase 1 frozen scaffold  
> **Historical scope:** commits reachable from `web/portfolio` only

## 0. Phase 1 audit result and category boundary

- 포함: `/interview-map` page enablement, reference repository, topic anchors, evidence gaps, track summaries, external references/questions, project answer/depth mapping.
- 제외: 외부 링크 security transport는 category 03/06, route lifecycle/query mechanics는 category 02, 후대 Interview view-model과 renderer data ownership은 category 09가 담당합니다.
- 이 Thread에서 `gaps`는 오류나 placeholder가 아니라 의도적으로 공개하는 evidence limitation입니다.

- **Audit decision:** 이 Thread는 독립적인 route feature/evidence story로 유지합니다.
- **Frozen commit count:** 6
- **Importance profile:** branch-local source classification상 이 Thread의 commit은 모두 B입니다. 다른 category의 S/A-level cross-cutting architecture를 중복 편입하지 않았습니다.

## 1. Thread goal

Interview Map route가 feature-flagged 소개에서 topic index, 공개 gaps, track별 외부 참조와 질문, project-backed answers로 확장되는 과정을 복원하고, 근거 부족과 누락 project reference를 숨기지 않는 표현 정책을 확인합니다.

### Fixed invariants

- `isSitePageEnabled("interviewMap", content)`가 거짓이면 partial evidence page를 공개하지 않고 `notFound()`로 종료합니다.
- topic index는 track IDs/labels에 대한 page-local navigation이며 source data의 순서를 따릅니다.
- `gaps`는 숨기거나 자동으로 보충하지 않고 별도 목록으로 공개합니다.
- track의 external reference/question과 project answer/depth는 다른 evidence 열로 유지됩니다.
- answer의 project ID를 찾지 못하면 행을 제거하지 않고 raw ID를 표시해 참조 공백을 드러냅니다.

## 2. Core engineering questions

1. Interview Map page flag가 꺼졌을 때 route는 어디에서 종료되는가?
2. reference repository, topic index, gaps는 각각 어떤 목적을 가지며 동일한 evidence가 아닌 이유는 무엇인가?
3. track section은 item count, intro, external reference, question을 어떤 계층으로 표현하는가?
4. answer project ID lookup을 위해 어떤 map을 만들고, lookup failure를 왜 drop하지 않고 raw ID로 보여 주는가?
5. answer label/title과 depth explanation은 table에서 어떤 별도 열로 유지되는가?

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
| 1 | `ddba753f7f51` | feat(interview-map): 근거 route 소개 추가 | B | ROUTING, RENDERER | feature-flagged Interview Map route, intro, reference repository link를 최초 구성합니다. |
| 2 | `cb161d118ddd` | feat(interview-map): 인터뷰 주제 인덱스 추가 | B | RENDERER | track 목록을 page-local topic anchor index로 추가합니다. |
| 3 | `9704aa5f7b59` | feat(interview-map): 근거 공백 목록 추가 | B | RENDERER | 현재 evidence의 부족 영역을 명시적인 gaps 목록으로 공개합니다. |
| 4 | `a3fb132d33f7` | feat(interview-map): 주제 track 소개 추가 | B | RENDERER | 각 interview track의 intro와 item count를 독립 section으로 구성합니다. |
| 5 | `cdcbbc937490` | feat(interview-map): 주제와 외부 참조 표 추가 | B | RENDERER | track items의 topic, external reference, interview question을 표 구조로 추가합니다. |
| 6 | `1cd28c140350` | feat(interview-map): 프로젝트 답변 근거 연결 | B | RENDERER | 각 question의 answers를 project case studies와 depth explanation으로 연결합니다. |

## 5. Commit-by-commit historical investigation

### 5.1. `ddba753f7f51` — feat(interview-map): 근거 route 소개 추가

- **Importance:** B
- **Tags:** ROUTING, RENDERER
- **Source-defined role:** feature-flagged Interview Map route, intro, reference repository link를 최초 구성합니다.

#### Exact inspection targets

- `src/app/interview-map/page.tsx` — `InterviewMapPage`
- `isSitePageEnabled("interviewMap", content)`와 `notFound()`
- `content.interviewMap.intro`, `content.interviewMap.referenceRepo`
- `presentation.pages.interviewMap.hero`
- external anchor의 `target="_blank"`, `rel="noreferrer"`

#### Commit-specific investigation tasks

1. `isSitePageEnabled("interviewMap", content)`와 `notFound()`가 partial page보다 먼저 실행되는지 확인합니다.
2. intro/referenceRepo와 presentation hero copy의 data flow를 추적합니다.
3. external anchor의 target/rel semantics와 fallback URL 부재를 기록합니다.

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

### 5.2. `cb161d118ddd` — feat(interview-map): 인터뷰 주제 인덱스 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** track 목록을 page-local topic anchor index로 추가합니다.

#### Exact inspection targets

- `src/app/interview-map/page.tsx` — topic index/nav section
- `content.interviewMap.tracks`
- track `id`, `label` 또는 title을 fragment href로 변환하는 위치
- `presentation.pages.interviewMap`의 index labels

#### Commit-specific investigation tasks

1. tracks의 ID/label/order가 topic index fragment links로 변환되는 규칙을 확인합니다.
2. link href와 후속 section ID가 일치하도록 어떤 field를 공유하는지 기록합니다.
3. tracks가 비어 있을 때 hero/index DOM 상태를 확인합니다.

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

### 5.3. `9704aa5f7b59` — feat(interview-map): 근거 공백 목록 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** 현재 evidence의 부족 영역을 명시적인 gaps 목록으로 공개합니다.

#### Exact inspection targets

- `src/app/interview-map/page.tsx` — gaps section
- `content.interviewMap.gaps`
- `presentation.pages.interviewMap.gaps`
- gap item semantic list/card 반복

#### Commit-specific investigation tasks

1. `interviewMap.gaps`가 별도 section/list로 렌더링되는 위치와 presentation framing을 확인합니다.
2. gap이 runtime error/empty-state와 다른 content claim임을 data model과 DOM으로 구분합니다.
3. 빈 gaps에서 자동 gap 추론이나 placeholder 생성이 없는지 기록합니다.

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

### 5.4. `a3fb132d33f7` — feat(interview-map): 주제 track 소개 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** 각 interview track의 intro와 item count를 독립 section으로 구성합니다.

#### Exact inspection targets

- `src/app/interview-map/page.tsx` — `TrackSection` 초기 형태
- `content.interviewMap.tracks` 반복
- track ID를 section `id`로 적용
- track title/intro/item count와 alternating background

#### Commit-specific investigation tasks

1. `TrackSection`이 track ID, title, intro, item count를 어떻게 소비하는지 확인합니다.
2. alternating background/index 기반 presentation과 semantic section ID를 기록합니다.
3. 0-item track이 section 자체를 생략하는지 0 count를 보여 주는지 exact JSX에서 판별합니다.

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

### 5.5. `cdcbbc937490` — feat(interview-map): 주제와 외부 참조 표 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** track items의 topic, external reference, interview question을 표 구조로 추가합니다.

#### Exact inspection targets

- `src/app/interview-map/page.tsx` — `TrackSection` table
- track item의 topic/title, reference link, question fields
- `presentation.pages.interviewMap.tracks` column labels
- external anchor semantics와 table header/body 관계

#### Commit-specific investigation tasks

1. track item의 topic/reference/question이 table headers와 cells에 어떻게 매핑되는지 확인합니다.
2. external reference anchor semantics와 question text source를 기록합니다.
3. answer/depth columns가 아직 없는 이전 state를 명시합니다.

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

### 5.6. `1cd28c140350` — feat(interview-map): 프로젝트 답변 근거 연결

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** 각 question의 answers를 project case studies와 depth explanation으로 연결합니다.

#### Exact inspection targets

- `src/app/interview-map/page.tsx` — `TrackSection`
- `projectsById = new Map(content.projects.map(...))`
- `item.answers.map(...)`
- missing project branch가 raw `answer.projectId`를 출력하는 위치
- `getTemplateHref`를 사용한 project detail link
- answer/depth table columns

#### Commit-specific investigation tasks

1. `projectsById` Map 구성 비용/범위와 `item.answers` lookup 순서를 추적합니다.
2. lookup success의 project detail link와 failure의 raw project ID branch를 비교합니다.
3. answer와 depth lists가 같은 answer order를 유지하면서 별도 columns에 표현되는지 확인합니다.

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
