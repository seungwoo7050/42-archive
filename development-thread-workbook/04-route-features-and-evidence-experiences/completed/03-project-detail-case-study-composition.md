# Development Thread: Project detail case-study composition

> **Repository:** `https://github.com/seungwoo7050/42-archive`  
> **Branch:** `web/portfolio`  
> **Category:** `04-route-features-and-evidence-experiences`  
> **Workbook state:** completed workbook  
> **Historical scope:** commits reachable from `web/portfolio` only

## 0. Phase 1 audit result and category boundary

- 포함: 상세 case-study 정보 계층, gallery/stack/decision evidence, dynamic route, missing ID, highlights.
- 제외: project link placement selector는 category 01/03, multi-renderer projection은 category 09, metadata/SEO는 category 06이 담당합니다.

- **Audit decision:** 이 Thread는 독립적인 route feature/evidence story로 유지합니다.
- **Frozen commit count:** 7
- **Importance profile:** branch-local source classification상 이 Thread의 commit은 모두 B입니다. 다른 category의 S/A-level cross-cutting architecture를 중복 편입하지 않았습니다.

## 1. Thread goal

프로젝트 상세 화면이 공용 section primitives에서 출발해 문제·해결·구조·증거·의사결정·결과를 조립하고, dynamic route의 missing-project 처리와 highlights까지 완성되는 과정을 복원합니다.

### Fixed invariants

- 상세 route는 path ID를 canonical project로 해석하지 못하면 `notFound()`로 종료합니다.
- case-study section copy는 presentation content가, 실제 body/list/media는 project content가 제공합니다.
- 대표 screenshot과 gallery, stack, decisions, highlights, tradeoffs, results는 서로 다른 evidence role을 유지합니다.
- 각 historical SHA는 그 시점에 존재한 section만 설명하며 후대 view-model을 소급하지 않습니다.

## 2. Core engineering questions

1. 공용 section primitive가 어떤 반복 구조를 추상화하고 어떤 semantics는 호출자에게 남기는가?
2. intro에서 results까지 section이 추가될 때 project schema의 어느 필드를 소비하는가?
3. `generateStaticParams`, `getProjectById`, `notFound()`의 관계는 무엇인가?
4. `383...`은 상세 highlights 추가와 metric 계산 중앙화를 왜 같은 integration point에서 수행하는가?

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
| 1 | `e5b26b762c50` | feat(project): 상세 화면 섹션 프리미티브 추가 | B | RENDERER | case-study 본문을 조립할 제목·2열 본문·목록 primitive를 추가합니다. |
| 2 | `06fff9a6e93b` | feat(project): 프로젝트 상세 소개 추가 | B | RENDERER | 상세 hero, 뒤로가기, 상태·링크·대표 screenshot을 조립합니다. |
| 3 | `9c0c37fa5c3c` | feat(project): 프로젝트 문제와 해결 설명 추가 | B | RENDERER | case study의 problem과 solution을 명시적 두 section으로 추가합니다. |
| 4 | `cabf3a0e378f` | feat(project): 프로젝트 구조와 증거 갤러리 추가 | B | RENDERER | architecture 설명과 screenshot gallery를 상세 본문에 추가합니다. |
| 5 | `1eac524fc8ff` | feat(project): 프로젝트 기술과 의사결정 추가 | B | RENDERER | stack, decisions, tradeoffs, results를 case-study 후반에 추가합니다. |
| 6 | `d4c7f742fb4d` | feat(project): 프로젝트 상세 route 연결 | B | ROUTING, RENDERER | dynamic route, static params, missing-project 404와 shell을 연결합니다. |
| 7 | `383a3b86e119` | feat(content): 프로젝트 지표를 화면에 적용 | B | CONTENT | 상세에 highlights를 노출하고 project metrics의 소비를 공용 selector로 전환합니다. |

## 5. Commit-by-commit historical investigation

### 5.1. `e5b26b762c50` — feat(project): 상세 화면 섹션 프리미티브 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** case-study 본문을 조립할 제목·2열 본문·목록 primitive를 추가합니다.

#### Exact inspection targets

- `src/components/portfolio/project-detail-sections.tsx` — `SectionTitle`, `TwoColumnSection`, `ListSection`
- list key가 item text인 점
- eyebrow/title/body/items prop 경계

#### Commit-specific investigation tasks

1. `SectionTitle`, `TwoColumnSection`, `ListSection`의 prop 계약과 semantic elements를 비교합니다.
2. 각 primitive가 layout만 소유하고 project content lookup은 수행하지 않는지 확인합니다.
3. 빈 `items`를 전달했을 때 `ListSection`의 heading/empty `<ul>` 상태를 기록합니다.

#### Learner evidence record

- **Previous state:** 상세 page의 반복되는 section heading과 list 구조를 일관되게 만들 공용 primitive가 없었습니다.
- **Implementation decision and path:** `SectionTitle`, `TwoColumnSection`, `ListSection`이 typography/layout을 고정하고 실제 의미와 콘텐츠는 props로 받습니다.
- **Ownership and data lifetime:** primitive는 DOM/표현을 소유하고 어떤 project field가 어느 section에 들어가는지는 이후 `ProjectDetailView`가 소유합니다.
- **Failure, absence, and non-guarantee:** 빈 `items`는 빈 `<ul>`이 되며 자동 생략하지 않습니다. duplicate item text는 key 충돌 가능성이 있습니다.
- **Resulting guarantee:** 상세 section의 반복 DOM contract를 재사용할 수 있음을 보장합니다.
- **Relationship to later work:** `06fff...`부터 실제 project detail view가 이 primitive를 소비합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `e5b26b762c50` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.2. `06fff9a6e93b` — feat(project): 프로젝트 상세 소개 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** 상세 hero, 뒤로가기, 상태·링크·대표 screenshot을 조립합니다.

#### Exact inspection targets

- `src/components/portfolio/project-detail-view.tsx` — `ProjectDetailView`
- `ProjectLinks`, deployment badge/status, `ProjectScreenshot priority`
- `pageCopy`, `project`, `homeTemplate`, `contentDebug` props

#### Commit-specific investigation tasks

1. `ProjectDetailView` 초기 hero가 project category/title/summary/status/links/screenshot 중 무엇을 소비하는지 추적합니다.
2. link renderer와 screenshot component로 전달되는 project data와 template/debug props를 확인합니다.
3. 후속 problem/solution/architecture sections가 아직 없는지 exact file에서 확인합니다.

#### Learner evidence record

- **Previous state:** section primitive만 있고 사용자에게 보이는 project detail composition이 없었습니다.
- **Implementation decision and path:** `ProjectDetailView`가 project title/category/summary, index back link, deployment/link actions, 대표 screenshot을 첫 정보 계층으로 구성합니다.
- **Ownership and data lifetime:** project content가 사실 데이터를, presentation copy가 label을, view가 순서와 강조를 소유합니다.
- **Failure, absence, and non-guarantee:** optional link/media는 각 child component의 조건에 따라 생략됩니다. 이 시점에는 route ID 검증이 아직 연결되지 않았습니다.
- **Resulting guarantee:** canonical project object를 받으면 상세 소개를 렌더링할 수 있음을 보장합니다.
- **Relationship to later work:** `9c0...`–`1eac...`이 본문 evidence를 추가하고 `d4c...`이 dynamic route를 연결합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `06fff9a6e93b` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.3. `9c0c37fa5c3c` — feat(project): 프로젝트 문제와 해결 설명 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** case study의 problem과 solution을 명시적 두 section으로 추가합니다.

#### Exact inspection targets

- `src/components/portfolio/project-detail-view.tsx` — `TwoColumnSection` 호출
- `project.problem`, `project.solution`
- `presentation.pages.projectDetail.sections`의 label/title

#### Commit-specific investigation tasks

1. problem과 solution fields가 `TwoColumnSection`에 어떤 presentation labels와 함께 연결되는지 확인합니다.
2. 두 서술이 project object에서 직접 읽히는지 별도 derived model이 있는지 판별합니다.
3. 빈 문자열/필드 부재에 대한 condition이 있는지 exact JSX를 기록합니다.

#### Learner evidence record

- **Previous state:** 소개는 프로젝트가 무엇인지 보여 주지만 왜 만들었고 어떻게 해결했는지 설명하지 못했습니다.
- **Implementation decision and path:** problem과 solution body를 각각 presentation label과 결합해 순차 렌더링합니다.
- **Ownership and data lifetime:** project가 서술 내용을, presentation이 heading vocabulary를, view가 문제→해결 순서를 소유합니다.
- **Failure, absence, and non-guarantee:** 빈 문자열이어도 section DOM은 남습니다. 내용 필수성 검증은 content schema 책임이며 이 커밋의 UI fallback은 없습니다.
- **Resulting guarantee:** 각 project가 문제와 해결을 독립적인 case-study 단계로 제시함을 보장합니다.
- **Relationship to later work:** `cabf...`이 solution 뒤에 구조와 시각 증거를 추가합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `9c0c37fa5c3c` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.4. `cabf3a0e378f` — feat(project): 프로젝트 구조와 증거 갤러리 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** architecture 설명과 screenshot gallery를 상세 본문에 추가합니다.

#### Exact inspection targets

- `src/components/portfolio/project-detail-view.tsx` — architecture section, screenshot gallery
- `project.architecture`, `project.screenshots` 또는 gallery source
- 대표 image와 보조 image의 역할 구분

#### Commit-specific investigation tasks

1. architecture body와 gallery images가 각각 어떤 component/section에 추가되는지 추적합니다.
2. 대표 screenshot과 gallery의 중복 제거가 이 SHA에 존재하는지 확인합니다.
3. gallery가 빈 경우 wrapper/heading을 생략하는 조건이 있는지 기록합니다.

#### Learner evidence record

- **Previous state:** 문제·해결 서술만으로는 구현 구조와 관찰 가능한 산출물을 증명하기 어려웠습니다.
- **Implementation decision and path:** architecture body와 여러 screenshot을 별도 section으로 렌더링해 설명과 시각 증거를 연결합니다.
- **Ownership and data lifetime:** project content가 media 순서/설명을, view가 gallery layout과 section 위치를 소유합니다.
- **Failure, absence, and non-guarantee:** 보조 screenshot이 비면 gallery item이 없습니다. 대표 screenshot과의 중복 제거는 이 시점의 view가 보장하지 않습니다.
- **Resulting guarantee:** 구조 설명과 복수 visual evidence를 case study에서 보여 줄 수 있음을 보장합니다.
- **Relationship to later work:** 후대 category 09의 detail view model이 대표 이미지 중복 제거를 route projection으로 이동합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `cabf3a0e378f` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.5. `1eac524fc8ff` — feat(project): 프로젝트 기술과 의사결정 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** stack, decisions, tradeoffs, results를 case-study 후반에 추가합니다.

#### Exact inspection targets

- `src/components/portfolio/project-detail-view.tsx` — `StackList`, 여러 `ListSection`
- `project.stack`, `decisions`, `tradeoffs`, `results`
- section order와 empty-array behavior

#### Commit-specific investigation tasks

1. stack, decisions, tradeoffs, results가 어떤 section primitive와 presentation labels에 대응하는지 표로 작성합니다.
2. stack IDs의 canonical metadata 해석 책임이 어디에 있는지 확인합니다.
3. 각 list가 비었을 때 route가 section을 가드하는지 `ListSection`에 빈 배열을 넘기는지 기록합니다.

#### Learner evidence record

- **Previous state:** 상세에는 문제·해결·구조·media만 있고 기술 선택과 결과를 평가할 근거가 부족했습니다.
- **Implementation decision and path:** 기술 스택을 canonical list component로, decisions/tradeoffs/results를 독립 list sections로 구성합니다.
- **Ownership and data lifetime:** project 배열 순서가 항목 순서를, view가 section 순서를 소유합니다.
- **Failure, absence, and non-guarantee:** 빈 배열이어도 `ListSection` 자체가 자동으로 사라지지 않습니다. ID-to-tech metadata 해석의 정확성은 `StackList` 책임입니다.
- **Resulting guarantee:** 기술 선택, 판단, 비용, 결과를 분리해 설명할 수 있음을 보장합니다.
- **Relationship to later work:** `d4c...`이 이 완성된 view를 실제 dynamic route에 연결합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `1eac524fc8ff` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.6. `d4c7f742fb4d` — feat(project): 프로젝트 상세 route 연결

- **Importance:** B
- **Tags:** ROUTING, RENDERER
- **Source-defined role:** dynamic route, static params, missing-project 404와 shell을 연결합니다.

#### Exact inspection targets

- `src/app/projects/[projectId]/page.tsx` — `generateStaticParams`, `ProjectDetailPage`
- `getProjectById(projectId, content)`, `notFound()`
- `PageShell`, template switcher currentPath, `ProjectDetailView` call

#### Commit-specific investigation tasks

1. `generateStaticParams`가 project IDs를 어떻게 생성하고 `ProjectDetailPage`가 async params를 어떻게 해석하는지 추적합니다.
2. `getProjectById` 실패가 `notFound()`로 전환되는 위치와 그 이후 code reachability를 확인합니다.
3. shell/template switcher currentPath와 `ProjectDetailView` prop 전달을 기록합니다.

#### Learner evidence record

- **Previous state:** 상세 view는 canonical project object를 요구했지만 URL ID에서 이를 얻는 production route가 없었습니다.
- **Implementation decision and path:** `generateStaticParams`가 모든 project ID를 반환하고 page가 params/query를 해석한 뒤 selector로 project를 찾습니다. 찾지 못하면 `notFound()`를 호출합니다.
- **Ownership and data lifetime:** route가 ID 해석·404·shell/template state를 소유하고 view는 valid project의 case-study 표현만 소유합니다.
- **Failure, absence, and non-guarantee:** unknown ID는 빈 상세가 아니라 404입니다. content load/schema failure는 이 route가 복구하지 않습니다.
- **Resulting guarantee:** 등록된 ID는 상세 view로, 미등록 ID는 Next.js not-found 경계로 간다는 것을 보장합니다.
- **Relationship to later work:** `383...`이 highlights evidence를 추가하고 후대 category 09가 renderer-safe detail projection을 도입합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `d4c7f742fb4d` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.7. `383a3b86e119` — feat(content): 프로젝트 지표를 화면에 적용

- **Importance:** B
- **Tags:** CONTENT
- **Source-defined role:** 상세에 highlights를 노출하고 project metrics의 소비를 공용 selector로 전환합니다.

#### Exact inspection targets

- `src/components/portfolio/project-detail-view.tsx` — highlights `ListSection`
- `src/app/projects/page.tsx`, `src/components/portfolio/work-map-section.tsx` — `getProjectMetricValue`
- `project.highlights`와 presentation highlights copy

#### Commit-specific investigation tasks

1. 한 커밋에서 `ProjectDetailView` highlights 추가와 project metric selector 적용을 파일별로 분리해 기록합니다.
2. highlights가 decisions와 tradeoffs 사이 어느 위치에 들어가며 어떤 labels를 쓰는지 확인합니다.
3. projects page/work-map의 inline 산식이 `getProjectMetricValue`로 대체되는 전후를 비교합니다.

#### Learner evidence record

- **Previous state:** project highlights는 content에 있어도 상세에서 보이지 않았고, project count 산식은 여러 consumer에 중복돼 있었습니다.
- **Implementation decision and path:** decisions 뒤에 highlights list를 추가하고 projects page/work-map의 직접 filter 산식을 `getProjectMetricValue` 호출로 교체합니다.
- **Ownership and data lifetime:** 상세 view는 highlights 배치를, selector는 metric 의미와 산식을 소유합니다.
- **Failure, absence, and non-guarantee:** highlights가 비면 빈 list section이 될 수 있습니다. selector 자체의 correctness test는 이 commit map에 포함되지 않습니다.
- **Resulting guarantee:** project highlights가 case-study 증거로 노출되고 동일 metric key가 consumer 간 같은 값을 사용함을 보장합니다.
- **Relationship to later work:** metric selector 정책은 category 01, route projection과 regression tests는 category 09/07에서 깊게 다룹니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `383a3b86e119` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

## 6. Invariant evolution

| Stage | Historical reconstruction |
|---|---|
| 표현 primitive | `e5b...`가 section DOM을 고정했습니다. |
| case-study 서사 | `06fff...`–`1eac...`이 소개→문제/해결→구조/갤러리→기술/결정/결과를 누적했습니다. |
| route failure boundary | `d4c...`이 unknown ID를 `notFound()`로 명시했습니다. |
| 증거 보강 | `383...`이 highlights를 노출하고 metric consumer를 중앙 selector에 연결했습니다. |

## 7. Failure → Fix → Test and later relationships

- `d4c...`은 missing project를 fail-closed 404로 처리하지만 이 frozen map에 직접 404 test commit은 없습니다.
- `383...`은 기능 확장과 중복 산식 제거를 함께 수행합니다. metric selector의 full policy는 이 Thread의 범위를 넘습니다.
- 후대 detail links, view models, renderer matrix는 각각 category 01/03, 09, 07이 담당합니다.

## 8. Ownership, state, and responsibility changes

- project content: case-study facts와 evidence arrays.
- presentation content: section labels/titles.
- `ProjectDetailView`: section order와 표현.
- dynamic route: ID resolution, not-found, template/debug shell state.

## 9. Final thread state

유효한 project ID는 완전한 case-study 정보 계층으로 연결되고, 유효하지 않은 ID는 404입니다. 상세은 problem/solution/architecture/media/stack/decisions/highlights/tradeoffs/results를 분리합니다.

## 10. Final architecture and execution flow

static params 생성 또는 request ID 수신 → content aggregate 로드 → template/debug 해석 → project ID selector → missing이면 `notFound()` → valid project와 page copy를 상세 view에 전달 → 각 evidence section을 순서대로 렌더링.

## 11. Minimal historical code evidence

`d4c7f742fb4d`, `src/app/projects/[projectId]/page.tsx`, `ProjectDetailPage`:
```tsx
const project = getProjectById(projectId, content);
if (!project) {
  notFound();
}
```
unknown ID가 부분 성공이나 빈 상세로 이어지지 않는 route failure boundary입니다.

## 12. Learning-completion checks

- [x] Frozen commit map 7개를 모두 completion record와 연결했습니다.
- [x] SHA, subject, importance, tags, source-defined role의 고정 정보를 scaffold와 동일하게 유지했습니다.
- [x] 각 historical claim을 해당 SHA diff에 한정하고 later implementation을 소급하지 않았습니다.
- [x] fix/test가 없거나 다른 category 소유인 경우 그 사실을 명시했습니다.
- [x] runtime execution status를 명시했으며 실행하지 않은 command를 성공으로 기록하지 않았습니다.
- [x] learner placeholder를 남기지 않았습니다.
