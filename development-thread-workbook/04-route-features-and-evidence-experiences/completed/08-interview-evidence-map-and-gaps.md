# Development Thread: Interview evidence map and gaps

> **Repository:** `https://github.com/seungwoo7050/42-archive`  
> **Branch:** `web/portfolio`  
> **Category:** `04-route-features-and-evidence-experiences`  
> **Workbook state:** completed workbook  
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

- [x] 모든 commit을 부모 상태와 exact SHA에서 비교하고 final HEAD를 과거에 투영하지 않았습니다.
- [x] 각 commit의 concrete file/function/component/data field와 caller→callee 또는 data flow를 기록했습니다.
- [x] optional data, missing reference, empty array, disabled page 등 실제 failure/absence branch를 설명했습니다.
- [x] 소유권·표시 책임·상태 전환과 적용되지 않는 resource cleanup을 구분했습니다.
- [x] 보장과 비보장을 분리하고 후속 commit/category와의 관계를 연결했습니다.
- [x] 실행하지 않은 build/test/runtime 결과를 통과했다고 표시하지 않았습니다.

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

- **Previous state:** 직전에는 interview preparation evidence와 reference repository를 독립 route로 공개하는 화면이 없었습니다.
- **Implementation decision and path:** content aggregate 로드 직후 page flag를 검사하고 disabled이면 404로 종료합니다. enabled이면 intro와 reference repository anchor를 hero에 렌더링합니다.
- **Ownership and data lifetime:** site page config가 route 공개 여부를, interview-map content가 intro/repository를, route가 not-found transition과 hero composition을 소유합니다.
- **Failure, absence, and non-guarantee:** disabled 상태에서는 shell/intro를 일부만 공개하지 않습니다. reference link가 빈 경우 임의 repository URL을 만들지 않으며 이 SHA의 content validation 밖입니다.
- **Resulting guarantee:** Interview Map의 fail-closed route boundary와 source repository로의 명시적 진입점을 보장합니다.
- **Relationship to later work:** `cb161...`이 route 안의 track navigation index를 추가합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `ddba753f7f51` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

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

- **Previous state:** hero와 reference repository만 있어 여러 interview tracks 중 원하는 주제로 바로 이동할 수 없었습니다.
- **Implementation decision and path:** track 순서대로 topic links를 만들고 각 link를 later track section의 fragment ID와 연결합니다.
- **Ownership and data lifetime:** interview-map content가 track ID와 순서를, route가 fragment navigation presentation을 소유합니다.
- **Failure, absence, and non-guarantee:** tracks가 비면 topic links가 없으며 route intro는 유지됩니다. ID uniqueness나 fragment validity는 이 renderer가 자동 수정하지 않습니다.
- **Resulting guarantee:** page 내부에서 content-defined track 순서로 탐색할 수 있음을 보장합니다.
- **Relationship to later work:** `9704...`가 topic 목록과 별개로 evidence gaps를 명시합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `cb161d118ddd` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

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

- **Previous state:** topic index만 있으면 모든 주제가 충분한 evidence를 갖춘 것처럼 보일 수 있었습니다.
- **Implementation decision and path:** content-defined gaps를 별도 section에 렌더링해 아직 부족하거나 후속 근거가 필요한 영역을 공개합니다.
- **Ownership and data lifetime:** interview-map content가 gap 문구와 순서를, presentation이 framing copy를, route가 독립 section placement를 소유합니다.
- **Failure, absence, and non-guarantee:** gaps가 비면 별도 항목이 없고, route가 자동으로 gap을 추론하거나 issue를 생성하지 않습니다. gap은 runtime error가 아닙니다.
- **Resulting guarantee:** 근거 map이 완전성을 과장하지 않고 명시된 한계를 함께 보여 줌을 보장합니다.
- **Relationship to later work:** `a3fb...`이 실제 track sections를 추가해 topic index와 content body를 연결합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `9704aa5f7b59` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

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

- **Previous state:** topic index는 이동 대상만 제공하고 각 track의 범위·설명·evidence 규모를 실제 본문으로 보여 주지 않았습니다.
- **Implementation decision and path:** 각 track을 fragment target section으로 만들고 title, intro, item count를 표시합니다.
- **Ownership and data lifetime:** track content가 ID/title/intro/items를, route가 section ID·alternating layout·count presentation을 소유합니다.
- **Failure, absence, and non-guarantee:** track items가 비어도 track intro와 0 count는 유지될 수 있으며 임의 질문을 생성하지 않습니다.
- **Resulting guarantee:** topic index가 실제 track content section으로 연결되고 각 track의 범위를 먼저 설명함을 보장합니다.
- **Relationship to later work:** `cdc...`가 track items를 reference/question table로 확장합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `a3fb132d33f7` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

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

- **Previous state:** track intro와 count만으로는 어떤 자료를 보고 어떤 질문에 답해야 하는지 구체적인 evidence path가 없었습니다.
- **Implementation decision and path:** 각 track item을 table row로 표현하고 topic, 외부 참조, 질문을 별도 columns에 배치합니다.
- **Ownership and data lifetime:** track item content가 reference/question을, presentation이 column labels를, route가 semantic table과 external-link expression을 소유합니다.
- **Failure, absence, and non-guarantee:** reference가 유효하지 않을 때 임의 URL을 대체하지 않습니다. 아직 project answers와 depth는 table에 없습니다.
- **Resulting guarantee:** 각 interview topic이 외부 학습 source와 질문으로 추적 가능함을 보장합니다.
- **Relationship to later work:** `1cd...`이 같은 rows에 project-backed answers와 depth를 추가합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `cdcbbc937490` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

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

- **Previous state:** 외부 reference와 질문은 있었지만 실제 구현 사례로 어떤 답변을 할 수 있고 그 깊이가 무엇인지 보여 주지 못했습니다.
- **Implementation decision and path:** track section마다 project lookup map을 만들고 answer IDs를 project로 해석합니다. 찾으면 template/debug-preserving detail link를, 못 찾으면 raw ID를 표시하며 depth는 별도 열에 유지합니다.
- **Ownership and data lifetime:** answer content가 project ID와 depth 순서를, project aggregate가 title/route ID를, route가 lookup과 missing-reference 표현을 소유합니다.
- **Failure, absence, and non-guarantee:** 누락 project를 drop하지 않습니다. raw ID는 참조 공백을 드러내지만 클릭 가능한 근거를 제공하지 않으며 자동 복구도 하지 않습니다.
- **Resulting guarantee:** 질문 → project answer → depth의 대응을 유지하고, 깨진 참조를 조용히 숨기지 않는 evidence-audit 계약을 보장합니다.
- **Relationship to later work:** 후대 Interview view model은 category 09에서 각 answer에 `project | null`을 붙여 renderer의 raw lookup 책임을 제거합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `1cd28c140350` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

## 6. Invariant evolution

| Stage | Historical reconstruction |
|---|---|
| Route와 source | `ddba...`가 page flag와 reference repository를 가진 최소 Interview Map을 만들었습니다. |
| 탐색과 한계 | `cb161...`이 topic index를, `9704...`가 explicit gaps를 추가했습니다. |
| Track 계층 | `a3fb...`가 track intro/count를 만들고 `cdc...`가 reference/question table로 확장했습니다. |
| 프로젝트 답변 | `1cd...`이 answers와 depth를 추가하고 lookup failure를 raw ID로 공개했습니다. |

## 7. Failure → Fix → Test and later relationships

- Missing-reference policy는 About/Journey와 다릅니다. 그 route들은 해석 불가 links를 제거하지만 Interview Map은 evidence audit 목적상 raw project ID를 남깁니다.
- `9704...`의 gaps는 fix 대상 오류가 아니라 의도적인 non-guarantee disclosure입니다.
- 전용 regression test는 frozen map에 없습니다. project-or-null projection과 renderer boundary tests는 category 09에서 후속 보호됩니다.

## 8. Ownership, state, and responsibility changes

- Site page config: Interview Map 공개 여부.
- Interview-map content: intro, repository, tracks, items, references, questions, answers, depth, gaps.
- Project aggregate: answer ID가 참조하는 실제 project title/route.
- Interview route: topic anchors, table composition, project lookup, raw-ID missing state.
- 후대 view model: category 09에서 project resolution을 route projection 단계로 이동.

## 9. Final thread state

Interview Map은 disabled이면 404로 닫히고, enabled이면 source repository, topic index, explicit gaps, track별 reference/question table, project-backed answers와 depth를 제공합니다. project lookup 실패는 숨기지 않고 raw ID로 남깁니다.

## 10. Final architecture and execution flow

content aggregate 로드 → Interview Map page flag 검사 → disabled이면 `notFound()` → enabled이면 intro/reference repository → track IDs로 topic index 생성 → gaps 공개 → tracks 순회해 intro/count와 reference/question rows 생성 → project lookup map 구성 → each answer ID lookup → 성공 시 detail link, 실패 시 raw ID → depth를 대응 순서로 별도 열에 출력.

## 11. Minimal historical code evidence

`1cd28c140350`, `src/app/interview-map/page.tsx`, `TrackSection`:
```tsx
const project = projectsById.get(answer.projectId);
if (!project) {
  return <li key={answer.projectId}>{answer.projectId}</li>;
}
```
이 발췌는 증거 참조 실패를 조용히 제거하지 않고 감사 가능한 raw identifier로 남기는 정책을 보여 줍니다.

## 12. Learning-completion checks

- [x] Frozen commit map 6개를 모두 completion record와 연결했습니다.
- [x] SHA, subject, importance, tags, source-defined role의 고정 정보를 scaffold와 동일하게 유지했습니다.
- [x] 각 historical claim을 해당 SHA diff에 한정하고 later implementation을 소급하지 않았습니다.
- [x] fix/test가 없거나 다른 category 소유인 경우 그 사실을 명시했습니다.
- [x] runtime execution status를 명시했으며 실행하지 않은 command를 성공으로 기록하지 않았습니다.
- [x] learner placeholder를 남기지 않았습니다.
