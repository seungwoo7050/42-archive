# Development Thread: Project index grouping and dual presentation

> **Repository:** `https://github.com/seungwoo7050/42-archive`  
> **Branch:** `web/portfolio`  
> **Category:** `04-route-features-and-evidence-experiences`  
> **Workbook state:** completed workbook  
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

- [x] 모든 commit을 부모 상태와 exact SHA에서 비교하고 final HEAD를 과거에 투영하지 않았습니다.
- [x] 각 commit의 concrete file/function/component/data field와 caller→callee 또는 data flow를 기록했습니다.
- [x] optional data, missing reference, empty array, disabled page 등 실제 failure/absence branch를 설명했습니다.
- [x] 소유권·표시 책임·상태 전환과 적용되지 않는 resource cleanup을 구분했습니다.
- [x] 보장과 비보장을 분리하고 후속 commit/category와의 관계를 연결했습니다.
- [x] 실행하지 않은 build/test/runtime 결과를 통과했다고 표시하지 않았습니다.

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

- **Previous state:** 프로젝트 목록을 category별로 묶고 콘텐츠가 지정한 순서로 정렬하는 공통 규칙이 없었습니다.
- **Implementation decision and path:** 각 project를 category map에 누적한 뒤 configured group index로 정렬하고, 둘 다 unknown이면 category 이름의 `localeCompare`를 사용합니다.
- **Ownership and data lifetime:** project의 `category`가 membership을, `ProjectPageContent.groups`가 known category 순서를 소유합니다.
- **Failure, absence, and non-guarantee:** unknown category는 버리지 않고 known groups 뒤에 둡니다. 같은 category 안의 project 입력 순서는 보존되지만 명시적 secondary sort는 없습니다.
- **Resulting guarantee:** 모든 project가 정확히 한 category tuple에 들어가고 unknown group도 노출된다는 것을 보장합니다.
- **Relationship to later work:** 후속 Design/Classic view들이 같은 `GroupedProjects`를 소비하고 `757...`에서 route가 실제 계산합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `e3fc25f46b42` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

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

- **Previous state:** grouping helper는 있었지만 이를 사용자에게 소개할 Design index 화면이 없었습니다.
- **Implementation decision and path:** Design view가 title/body와 세 count를 hero 정보 계층으로 구성합니다.
- **Ownership and data lifetime:** route가 전달한 count 값의 의미는 input contract가 소유하고 Design view는 label/copy와 배치를 소유합니다.
- **Failure, absence, and non-guarantee:** count가 0이어도 숫자 0으로 표시됩니다. 계산의 정확성은 이 view가 검증하지 않습니다.
- **Resulting guarantee:** Design 프로젝트 index가 프로젝트 archive 규모를 소개할 수 있음을 보장합니다.
- **Relationship to later work:** `e547...`과 `8f67...`이 실제 featured/grouped content를 같은 view에 추가합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `cd2eac06b220` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

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

- **Previous state:** Design hero는 수치만 보여 주고 대표 프로젝트로 이어지는 시각적 증거가 없었습니다.
- **Implementation decision and path:** featured projects를 독립 section에서 카드로 반복하고 현재 template/debug 상태를 project detail link에 전달합니다.
- **Ownership and data lifetime:** featured membership은 caller가, 카드 표현은 Design view/`ProjectCard`가 소유합니다.
- **Failure, absence, and non-guarantee:** featuredProjects가 비면 카드 목록이 비며 별도 empty state는 없습니다.
- **Resulting guarantee:** 대표 프로젝트가 non-featured archive와 분리되어 강조된다는 것을 보장합니다.
- **Relationship to later work:** `8f67...`이 나머지 프로젝트를 grouped archive로 추가합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `e547aafcb77a` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

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

- **Previous state:** featured 항목 외의 track projects는 화면에 노출되지 않았습니다.
- **Implementation decision and path:** grouped tuple을 순회하며 category heading과 project cards를 렌더링합니다.
- **Ownership and data lifetime:** group 순서는 `groupProjects` 결과가, 각 group의 설명 copy와 card layout은 Design view가 소유합니다.
- **Failure, absence, and non-guarantee:** 빈 group tuple은 렌더링되지 않습니다. presentation에 설명이 없는 unknown category는 제한된 fallback 표현만 가집니다.
- **Resulting guarantee:** non-featured project가 category archive로 모두 도달 가능하다는 것을 보장합니다.
- **Relationship to later work:** Classic view는 같은 입력을 더 조밀한 terminal/index 형태로 소비합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `8f67e1990157` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

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

- **Previous state:** 프로젝트 index에는 Design 표현만 있어 Classic template에서 같은 archive를 표현할 독립 구조가 없었습니다.
- **Implementation decision and path:** Classic view가 소개 copy와 count를 terminal 형식의 compact summary로 구성합니다.
- **Ownership and data lifetime:** 입력 데이터 파생은 caller가, terminal line과 밀도 제한은 Classic view가 소유합니다.
- **Failure, absence, and non-guarantee:** 긴 목록은 preview 범위로 잘릴 수 있으며 이 커밋은 전체 archive 접근을 아직 제공하지 않습니다.
- **Resulting guarantee:** Classic template에 맞는 프로젝트 intro가 존재함을 보장합니다.
- **Relationship to later work:** `b7ed...`이 lead project, `76a...`가 전체 grouped index를 이어 붙입니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `6d5b1dbbd3ae` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

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

- **Previous state:** Classic intro는 archive 개요만 있고 사용자가 바로 확인할 대표 사례가 없었습니다.
- **Implementation decision and path:** featured list의 첫 project를 lead로 선택해 핵심 설명과 detail link를 보여 줍니다.
- **Ownership and data lifetime:** featured 순서가 lead 선택을 소유하고 Classic view는 첫 항목만 강조합니다.
- **Failure, absence, and non-guarantee:** featured가 없으면 lead block을 생략합니다. 두 번째 이후 featured는 이 lead 영역에서 보장되지 않습니다.
- **Resulting guarantee:** Classic index가 최소 한 개 대표 사례를 강조할 수 있음을 보장합니다.
- **Relationship to later work:** `76a...`이 나머지 grouped project를 compact archive로 제공합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `b7ed48a4d77c` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

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

- **Previous state:** Classic의 lead project만으로는 전체 non-featured archive에 접근할 수 없었습니다.
- **Implementation decision and path:** group tuple을 순회하고 각 project의 상태·요약·제한된 stack을 compact row/card로 렌더링합니다.
- **Ownership and data lifetime:** group membership/order는 helper 결과가, row의 정보 밀도와 stack truncation은 Classic view가 소유합니다.
- **Failure, absence, and non-guarantee:** stack이 제한 수를 넘으면 나머지는 표시하지 않습니다. unknown group을 제거하지 않습니다.
- **Resulting guarantee:** Classic에서도 전체 grouped archive로 이동할 수 있음을 보장합니다.
- **Relationship to later work:** `757...`이 실제 route에서 partitions/groups/counts를 한 번 계산해 두 view 중 하나에 전달합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `76a3155e757d` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

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

- **Previous state:** 두 renderer와 helper는 존재했지만 실제 route가 입력을 조립하고 선택하지 않았습니다.
- **Implementation decision and path:** route가 featured/non-featured를 분리하고 group과 두 count를 계산한 뒤 Classic 또는 Design view에 동일한 payload를 전달합니다.
- **Ownership and data lifetime:** 이 시점에는 route가 data projection과 template dispatch를 모두 소유하며 renderer는 전달된 배열/숫자를 표현합니다.
- **Failure, absence, and non-guarantee:** invalid template/debug 처리 방식은 resolver 책임입니다. project가 0개여도 route는 성공하고 빈 표현을 전달합니다.
- **Resulting guarantee:** 동일한 derived data가 두 presentation에 제공되고 `/projects`가 site navigation에 노출됨을 보장합니다.
- **Relationship to later work:** 후대 view-model/renderer ownership 이동은 category 09, query/navigation lifecycle은 category 02에서 다룹니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `7571f1400065` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

## 6. Invariant evolution

| Stage | Historical reconstruction |
|---|---|
| 정렬 정책 | `e3fc...`가 category grouping과 configured/unknown order를 명시했습니다. |
| Design 표현 | `cd2...`–`8f67...`이 hero, featured evidence, grouped archive를 분리했습니다. |
| Classic 표현 | `6d5...`–`76a...`이 compact intro, lead, grouped index를 만들었습니다. |
| route 통합 | `757...`이 하나의 partitions/groups/metrics payload로 두 표현을 연결했습니다. |

## 7. Failure → Fix → Test and later relationships

- 이 commit set에는 direct regression test가 없습니다. grouping/view-model characterization은 category 07/09에서 소유합니다.
- unknown category를 뒤로 보내되 버리지 않는 정책은 failure tolerance이며, 별도 error UI가 아니라 deterministic ordering으로 처리됩니다.
- `757...`의 route-local projection은 후대 category 09의 `ProjectIndexViewModel`로 이동하지만 이 Thread의 feature semantics는 유지됩니다.

## 8. Ownership, state, and responsibility changes

- `groupProjects`: category membership과 order 파생.
- `ProjectsPage`: 당시 featured/track 분할, counts, shell/dispatch.
- Design view: 넓은 hero·featured cards·group sections.
- Classic view: terminal summary·single lead·compact group index.

## 9. Final thread state

모든 프로젝트는 featured 또는 track presentation에 들어가며, track은 configured category order와 unknown fallback order를 따릅니다. 두 template는 같은 derived data를 서로 다른 밀도로 표현합니다.

## 10. Final architecture and execution flow

콘텐츠 로드 → featured/non-featured 분할 → non-featured category grouping/ordering → source-only/curriculum count 계산 → template 선택 → 동일 payload를 Design 또는 Classic view에 전달 → project detail link 생성.

## 11. Minimal historical code evidence

`e3fc25f46b42`, `src/lib/portfolio/project-groups.ts`, `groupProjects`:
```ts
if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right);
if (leftIndex === -1) return 1;
if (rightIndex === -1) return -1;
return leftIndex - rightIndex;
```
configured group을 우선하고 unknown group을 버리지 않는 정렬 계약입니다.

## 12. Learning-completion checks

- [x] Frozen commit map 8개를 모두 completion record와 연결했습니다.
- [x] SHA, subject, importance, tags, source-defined role의 고정 정보를 scaffold와 동일하게 유지했습니다.
- [x] 각 historical claim을 해당 SHA diff에 한정하고 later implementation을 소급하지 않았습니다.
- [x] fix/test가 없거나 다른 category 소유인 경우 그 사실을 명시했습니다.
- [x] runtime execution status를 명시했으며 실행하지 않은 command를 성공으로 기록하지 않았습니다.
- [x] learner placeholder를 남기지 않았습니다.
