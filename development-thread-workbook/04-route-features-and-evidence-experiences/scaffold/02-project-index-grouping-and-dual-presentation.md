# Development Thread: Project index grouping and dual presentation

> **Repository:** `https://github.com/seungwoo7050/42-archive`  
> **Branch:** `web/portfolio`  
> **Category:** `04-route-features-and-evidence-experiences`  
> **Workbook state:** Phase 1 frozen scaffold  
> **Historical scope:** commits reachable from `web/portfolio` only

## 0. Phase 1 audit result and category boundary

- 포함: group ordering, featured/track partition, Design/Classic 프로젝트 목록 표현, `/projects` 통합.
- 제외: query-state 해석의 일반 계약은 category 02, renderer 추출과 dispatcher 아키텍처는 category 05/09, project card primitive는 category 03이 담당합니다.

- **Audit decision:** 이 Thread는 독립적인 route feature/evidence story로 유지합니다.
- **Frozen commit count:** 8
- **Importance profile:** branch-local source classification상 이 Thread의 commit은 모두 B입니다. 다른 category의 S/A-level cross-cutting architecture를 중복 편입하지 않았습니다.

## 1. Thread goal

프로젝트 인덱스가 featured와 archive 항목을 분리하고, 콘텐츠가 정한 group 순서를 보존하면서 Design과 Classic에 서로 다른 정보 밀도로 전달되는 과정을 복원합니다.

### Fixed invariants

- configured category는 presentation의 group 순서를 따르고 unknown category는 뒤에서 알파벳순입니다.
- featured project와 non-featured track project는 서로 다른 presentation role을 가집니다.
- Design과 Classic은 같은 partitions/groups/metrics를 받되 다른 lead·grid·index 표현을 사용합니다.
- source-only/curriculum count는 프로젝트 원본에서 파생되며 route 통합 시점에는 route가 계산 책임을 가집니다.

## 2. Core engineering questions

1. `groupProjects`가 configured/unknown group의 상대 순서를 어떻게 결정하는가?
2. Design의 featured list와 grouped list, Classic의 lead와 compact index는 어떤 입력을 공유하는가?
3. `ProjectsPage`가 계산·routing·shell·renderer dispatch를 동시에 소유한 결과는 무엇인가?
4. 빈 featured list, unknown category, 짧은 group에서 각 표현은 무엇을 생략하는가?

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
| 1 | `e3fc25f46b42` | feat(projects): 프로젝트 그룹 정렬 규칙 추가 | B | RENDERER | 프로젝트 category grouping과 stable presentation order 규칙을 추가합니다. |
| 2 | `cd2eac06b220` | feat(projects): 디자인 프로젝트 소개 영역 추가 | B | RENDERER | Design 프로젝트 페이지의 hero와 archive metrics vocabulary를 만듭니다. |
| 3 | `e547aafcb77a` | feat(projects): 디자인 대표 프로젝트 목록 추가 | B | RENDERER | Design index에 featured projects를 별도 증거 목록으로 추가합니다. |
| 4 | `8f67e1990157` | feat(projects): 디자인 프로젝트 그룹 목록 추가 | B | RENDERER | Design index에 group별 project archive를 추가합니다. |
| 5 | `6d5b1dbbd3ae` | feat(projects): 클래식 프로젝트 소개와 터미널 추가 | B | RENDERER | Classic 프로젝트 index의 hero와 terminal-like summary를 만듭니다. |
| 6 | `b7ed48a4d77c` | feat(projects): 클래식 대표 프로젝트 추가 | B | RENDERER | Classic index에 첫 featured project를 lead evidence로 추가합니다. |
| 7 | `76a3155e757d` | feat(projects): 클래식 그룹 인덱스 추가 | B | RENDERER | Classic index에 category별 compact archive를 추가합니다. |
| 8 | `7571f1400065` | feat(projects): 프로젝트 목록 route 연결 | B | ROUTING, RENDERER | `/projects`에서 콘텐츠 로드, partitions/groups/metrics, shell, template dispatch를 통합합니다. |

## 5. Commit-by-commit historical investigation

### 5.1. `e3fc25f46b42` — feat(projects): 프로젝트 그룹 정렬 규칙 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** 프로젝트 category grouping과 stable presentation order 규칙을 추가합니다.

#### Exact inspection targets

- `src/lib/portfolio/project-groups.ts` — `GroupedProjects`, `groupProjects`
- `Map<string, PortfolioProject[]>` 누적
- `groupOrder.indexOf`와 unknown group `localeCompare`

#### Commit-specific investigation tasks

1. `groupProjects`의 Map 축적과 sort callback을 따라 known/known, known/unknown, unknown/unknown 세 경우를 표로 재현합니다.
2. 프로젝트 입력 순서가 각 category 내부에서 보존되는지 배열 append 방식을 확인합니다.
3. presentation에 없는 category가 뒤로 이동하고 서로는 `localeCompare`되는지 exact code로 확인합니다.

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

### 5.2. `cd2eac06b220` — feat(projects): 디자인 프로젝트 소개 영역 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** Design 프로젝트 페이지의 hero와 archive metrics vocabulary를 만듭니다.

#### Exact inspection targets

- `src/designs/design/projects/projects-route.tsx` — `DesignProjectsView`의 hero/intro
- projects page presentation copy와 total/curriculum/source-only count props
- `ContentHint`가 가리키는 projects presentation source

#### Commit-specific investigation tasks

1. Design projects view의 hero가 project-page presentation copy와 aggregate metrics 중 무엇을 직접 소비하는지 확인합니다.
2. route component가 아직 존재하지 않는 시점인지 imports/callers를 확인해 renderer와 lifecycle을 구분합니다.
3. empty project catalog에서 hero가 유지되는지 project-dependent DOM branch를 확인합니다.

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

### 5.3. `e547aafcb77a` — feat(projects): 디자인 대표 프로젝트 목록 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** Design index에 featured projects를 별도 증거 목록으로 추가합니다.

#### Exact inspection targets

- `src/designs/design/projects/projects-route.tsx` — `DesignProjectsView` featured block
- `featuredProjects` prop와 `ProjectCard`
- priority/variant와 template-preserving link

#### Commit-specific investigation tasks

1. Design view가 `featuredProjects`를 어떤 card variant와 priority 규칙으로 표현하는지 추적합니다.
2. featured와 non-featured source가 route에서 분리되기 전 이 renderer가 기대하는 props를 기록합니다.
3. featured list가 비어 있을 때 section heading/CTA의 실제 상태를 확인합니다.

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

### 5.4. `8f67e1990157` — feat(projects): 디자인 프로젝트 그룹 목록 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** Design index에 group별 project archive를 추가합니다.

#### Exact inspection targets

- `src/designs/design/projects/projects-route.tsx` — grouped sections
- `GroupedProjects` tuple의 category/project list 소비
- presentation `groups` copy lookup과 unknown group label fallback

#### Commit-specific investigation tasks

1. Design grouped-project section이 `GroupedProjects` tuple의 category와 projects를 어떤 중첩 반복으로 소비하는지 확인합니다.
2. group copy lookup과 unknown category label 처리 여부를 exact SHA에서 확인합니다.
3. group 내부 카드 링크가 template/debug state를 보존하는 prop 흐름을 기록합니다.

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

### 5.5. `6d5b1dbbd3ae` — feat(projects): 클래식 프로젝트 소개와 터미널 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** Classic 프로젝트 index의 hero와 terminal-like summary를 만듭니다.

#### Exact inspection targets

- `src/designs/classic/projects/projects-route.tsx` — `ClassicProjectsView`의 intro/terminal
- projects/count props
- group/project 수의 제한·요약 표현

#### Commit-specific investigation tasks

1. Classic projects intro/terminal이 어떤 counts와 page copy를 입력으로 받는지 추적합니다.
2. Design hero와 다른 정보 밀도·terminal composition을 파일 경계로 구분합니다.
3. terminal interaction 구현이 아니라 renderer composition만 추가되는지 diff 범위를 확인합니다.

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

### 5.6. `b7ed48a4d77c` — feat(projects): 클래식 대표 프로젝트 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** Classic index에 첫 featured project를 lead evidence로 추가합니다.

#### Exact inspection targets

- `src/designs/classic/projects/projects-route.tsx` — lead featured block
- `featuredProjects[0]` 또는 동등한 첫 항목 선택
- screenshot/link/deployment 정보

#### Commit-specific investigation tasks

1. Classic featured presentation이 첫 featured project를 lead로 선택하는 index/slice 규칙을 확인합니다.
2. 나머지 featured projects를 어느 위치에서 처리하거나 처리하지 않는지 기록합니다.
3. featured가 0개인 branch에서 lead block이 생략되는지 확인합니다.

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

### 5.7. `76a3155e757d` — feat(projects): 클래식 그룹 인덱스 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** Classic index에 category별 compact archive를 추가합니다.

#### Exact inspection targets

- `src/designs/classic/projects/projects-route.tsx` — group index
- `groupedProjects`와 project availability/stack preview
- stack item 수 제한과 detail link

#### Commit-specific investigation tasks

1. Classic group index가 grouped tuples를 어떻게 compact navigation/content로 바꾸는지 추적합니다.
2. category 순서가 renderer에서 재정렬되지 않고 `groupProjects` 결과를 따르는지 확인합니다.
3. group 또는 project가 비었을 때 index count/link DOM의 실제 상태를 기록합니다.

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

### 5.8. `7571f1400065` — feat(projects): 프로젝트 목록 route 연결

- **Importance:** B
- **Tags:** ROUTING, RENDERER
- **Source-defined role:** `/projects`에서 콘텐츠 로드, partitions/groups/metrics, shell, template dispatch를 통합합니다.

#### Exact inspection targets

- `src/app/projects/page.tsx` — `ProjectsPage`
- `getPortfolioContent`, `resolveHomeTemplateId`, `groupProjects`
- `featuredProjects`, `trackProjects`, `sourceOnlyCount`, `curriculumCount`, `shellProps`
- `src/content/site.json`의 Projects nav

#### Commit-specific investigation tasks

1. `ProjectsPage`에서 featured/non-featured partition, grouping, source-only/curriculum counts의 계산 순서를 추적합니다.
2. `activeTemplate` branch가 Design/Classic views에 전달하는 props를 비교하고 shell/current path를 기록합니다.
3. `src/content/site.json`에 `/projects` navigation이 추가되는 integration 범위를 확인합니다.

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

- [ ] Frozen commit map 8개를 모두 completion record와 연결했습니다.
- [ ] SHA, subject, importance, tags, source-defined role의 고정 정보를 scaffold와 동일하게 유지했습니다.
- [ ] 각 historical claim을 해당 SHA diff에 한정하고 later implementation을 소급하지 않았습니다.
- [ ] fix/test가 없거나 다른 category 소유인 경우 그 사실을 명시했습니다.
- [ ] runtime execution status를 명시했으며 실행하지 않은 command를 성공으로 기록하지 않았습니다.
- [ ] learner placeholder를 남기지 않았습니다.
