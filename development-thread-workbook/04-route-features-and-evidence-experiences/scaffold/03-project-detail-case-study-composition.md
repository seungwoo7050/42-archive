# Development Thread: Project detail case-study composition

> **Repository:** `https://github.com/seungwoo7050/42-archive`  
> **Branch:** `web/portfolio`  
> **Category:** `04-route-features-and-evidence-experiences`  
> **Workbook state:** Phase 1 frozen scaffold  
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

- [ ] 모든 commit을 부모 상태와 exact SHA에서 비교하고 final HEAD를 과거에 투영하지 않았습니다.
- [ ] 각 commit의 concrete file/function/component/data field와 caller→callee 또는 data flow를 기록했습니다.
- [ ] optional data, missing reference, empty array, disabled page 등 실제 failure/absence branch를 설명했습니다.
- [ ] 소유권·표시 책임·상태 전환과 적용되지 않는 resource cleanup을 구분했습니다.
- [ ] 보장과 비보장을 분리하고 후속 commit/category와의 관계를 연결했습니다.
- [ ] 실행하지 않은 build/test/runtime 결과를 통과했다고 표시하지 않았습니다.

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

- [ ] Frozen commit map 7개를 모두 completion record와 연결했습니다.
- [ ] SHA, subject, importance, tags, source-defined role의 고정 정보를 scaffold와 동일하게 유지했습니다.
- [ ] 각 historical claim을 해당 SHA diff에 한정하고 later implementation을 소급하지 않았습니다.
- [ ] fix/test가 없거나 다른 category 소유인 경우 그 사실을 명시했습니다.
- [ ] runtime execution status를 명시했으며 실행하지 않은 command를 성공으로 기록하지 않았습니다.
- [ ] learner placeholder를 남기지 않았습니다.
