# Development Thread 07 — Page Context Consolidation

## 0. Source and frozen audit scope

- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/portfolio`
- Category: `02-routing-navigation-and-page-lifecycle`
- Change range for directed inspection: `42bef4e5783c^..349317425bd2`
- Classification source: `commit/commit-importance.md` on `web/portfolio`
- Historical rule: inspect every commit at its exact SHA; do not project later code backward.
- Phase 1 status: audited and frozen before learner-facing completion.
- Thread boundary: 모든 App Router page의 공통 content/query/shell 초기화 ownership만 다룹니다. availability gate, route-specific lookup/derivation, renderer dispatch는 helper 밖에 남습니다.
- Execution note: source inspection and runtime command evidence must be recorded separately.

### Phase 1 audit decisions

- `42bef4e5783c`를 실제 chronology에 맞춰 Thread 첫머리의 characterization baseline으로 이동했습니다.
- route군별 migration order를 branch history와 일치시켰습니다.

## 1. Learning goal and planned invariants

route characterization baseline을 먼저 고정한 뒤 `resolvePortfolioPageContext`를 도입하고 route군별로 이관하여 중복 query/shell 초기화를 제거한 과정을 재구성합니다.

- characterization test는 refactor 이전 route behavior를 canonical content 기준으로 고정합니다.
- resolver는 content, currentPath, searchParams를 받아 template/debug와 shell props를 한 번 계산합니다.
- caller가 이미 읽은 content를 주입해 동일 요청에서 aggregate load ownership을 유지할 수 있습니다.
- availability gate는 resolver 전에, route-specific lookup/derivation과 renderer dispatch는 resolver 밖에 남습니다.
- 모든 public page의 common initialization은 최종적으로 하나의 helper에 모입니다.

## 2. Questions to answer

- `42bef...`을 refactor 후 test로 오해하면 어떤 chronology 오류가 생깁니까?
- `PortfolioPagePath` union은 어떤 path를 허용하며 dynamic detail을 어떻게 표현합니까?
- content injection은 어떤 중복과 consistency risk를 줄입니까?
- 왜 availability와 project lookup을 common helper에 넣지 않았습니까?
- route별 단계적 migration이 기존 characterization과 어떻게 연결됩니까?

## 3. Completion criteria

- characterization baseline을 첫 commit으로 설명합니다.
- Home 도입과 세 migration commit의 ownership 이동을 구분합니다.
- helper가 소유하는 값과 계속 caller에 남는 값을 표로 정리합니다.
- existing tests를 실제 실행하지 않았다면 source-level safety net으로만 기록합니다.
- refactor 전후 behavior preservation을 근거 없는 runtime claim으로 쓰지 않습니다.

## 4. Fixed commit map

| # | Commit | Subject | Importance | Tags | Source-defined role |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `42bef4e5783c` | test(routes): 홈과 route presentation 계약 검증 | A | ARCH, VALIDATION, ROUTING | Add route-level characterization tests that compare presentation shells against canonical content rather than hard-coded snapshots. |
| 2 | `1cf65b708476` | refactor(routes): 홈 page context 통합 | A | ARCH, ROUTING, REFACTOR | Introduce `resolvePortfolioPageContext` as the single owner of common page initialization and migrate Home to it. |
| 3 | `2075e54ff947` | refactor(projects): 프로젝트 page context 통합 | B | RENDERER, REFACTOR | Migrate both the project archive and project-detail routes to the shared page-context resolver. |
| 4 | `a9fdde29221d` | refactor(routes): 소개와 학습 route context 통합 | B | ROUTING, REFACTOR | Apply the common page-context boundary to About, Journey, and Interview Map. |
| 5 | `349317425bd2` | refactor(routes): 이력과 연락 context 통합 | B | ROUTING, REFACTOR | Complete the page-context migration for Resume and Contact. |

The commit SHA, order, subject, importance, tags, and source-defined role in this map are frozen.

## 5. Commit-by-commit reconstruction

### 1. `42bef4e5783c` — test(routes): 홈과 route presentation 계약 검증

- Importance: **A**
- Tags: `ARCH, VALIDATION, ROUTING`
- Fixed role: Add route-level characterization tests that compare presentation shells against canonical content rather than hard-coded snapshots.

#### Historical inspection tasks

- 이 commit이 resolver refactor보다 먼저라는 chronology를 확인하고 characterization baseline으로 다룹니다.
- `src/app/page.test.tsx`, `src/app/routes.test.tsx`, `src/app/journey/page.test.tsx`의 route matrix와 canonical content lookup을 확인합니다.
- 각 route에서 H1, `data-home-template`, content hint, state-preserving Projects link, design switcher current/target href를 어떤 방식으로 검증하는지 적습니다.
- 반복 `view`/`debug` query에서 첫 값을 사용하는 test와 다섯 design/default/unknown fallback test를 구분합니다.
- 직접 함수 unit test가 아니라 async page component를 render하는 characterization의 강점과 browser-level 비보장을 적습니다.

#### Reconstruction result

**chronology와 목적**

이 commit은 `resolvePortfolioPageContext` 도입보다 먼저입니다. 따라서 refactor 결과를 검증하기 위해 나중에 작성된 test가 아니라, 기존 route behavior를 먼저 기록한 **characterization baseline**입니다.

**검증 표면**

- `src/app/page.test.tsx`
  - original design/classic이 같은 journey evidence를 노출하는지 확인합니다.
  - query가 없으면 `editorial` default를 사용합니다.
  - 다섯 design 각각에서 root marker, H1, featured project, project navigation href, design switcher link count를 확인합니다.
  - unknown design이 editorial로 fallback하는지 확인합니다.
  - `debug=content`와 design state가 project/design links에 보존되는지 확인합니다.
- `src/app/routes.test.tsx`
  - Home, About, Contact, Interview Map, Journey, Projects, Project Detail, Resume의 8개 case를 async page component로 직접 render합니다.
  - canonical content에서 heading/labels를 읽어 hard-coded snapshot 의존을 줄입니다.
  - classic shell marker, content source hints, Projects href, switcher active/target href를 확인합니다.
  - repeated `view`/`debug` 배열에서 첫 값을 사용하는 route behavior를 검증합니다.
- `src/app/journey/page.test.tsx`
  - content-owned skip/navigation/menu labels와 milestone labels를 확인합니다.

**test 성격**

이것은 pure helper unit test보다 넓고 full browser e2e보다 좁은 route-component characterization입니다. App Router page function을 실제 props로 호출하고 resulting React tree를 render해 공통 presentation contract를 기록합니다.

**증명하지 않는 것**

HTTP request/response, browser history, network navigation, hydration timing, production build artifact는 실행하지 않습니다. 또한 refactor commit 자체가 아직 존재하지 않으므로 resolver implementation을 직접 검증하지 않습니다. 후속 migration이 이 baseline을 깨지 않아야 한다는 safety net으로 기능합니다.

이 환경에서는 source를 inspection했으며 Vitest command는 실행하지 않았습니다.

### 2. `1cf65b708476` — refactor(routes): 홈 page context 통합

- Importance: **A**
- Tags: `ARCH, ROUTING, REFACTOR`
- Fixed role: Introduce `resolvePortfolioPageContext` as the single owner of common page initialization and migrate Home to it.

#### Historical inspection tasks

- `src/lib/portfolio/page-context.ts`의 `PortfolioPagePath` union, optional content injection, async searchParams, resolver return shape를 확인합니다.
- `activeTemplate`, `contentDebug`, `shellProps`가 한 번 계산되고 `templateSwitcher.currentPath`에 typed path가 들어가는지 추적합니다.
- Home에서 제거된 중복 초기화와 남아 있는 renderer dispatch/view preparation을 구분합니다.
- helper가 page availability, project lookup, renderer 선택까지 소유하지 않는다는 경계를 적습니다.
- pre-existing `42bef...` characterization이 refactor safety net으로 어떤 계약을 제공하는지 연결합니다.

#### Reconstruction result

**중복된 이전 상태**

Home은 직접 content를 읽고, search params를 await하고, template/debug를 resolve하며, shell이 필요한 공통 props를 다시 조립했습니다. 같은 pattern이 다른 public routes에도 반복됐습니다. path 한 곳을 잘못 쓰거나 UI/templates/debug prop을 누락해도 compiler가 공통 initialization의 동일성을 강제하지 못했습니다.

**새 ownership boundary**

`src/lib/portfolio/page-context.ts`에 `resolvePortfolioPageContext`가 추가됩니다.

입력:

- optional injected `content`
- typed `currentPath: PortfolioPagePath`
- optional async `searchParams`

`PortfolioPagePath`는 `/`, `/about`, `/contact`, `/interview-map`, `/journey`, `/projects`, `/resume`, ``/projects/${string}``만 허용합니다.

처리:

1. content가 없으면 `getPortfolioContent()`를 사용합니다.
2. search params를 한 번 await합니다.
3. `view`와 `debug`를 각각 canonical selector로 정규화합니다.
4. `activeTemplate`, `content`, `contentDebug`, complete `shellProps`를 반환합니다.
5. switcher props에는 active ID, debug, typed current path, template 목록이 포함됩니다.

Home은 직접 초기화 코드를 제거하고 resolver 결과를 사용합니다. 그러나 `hasDedicatedRouteRenderer`/`renderDesignRoute`와 Home-specific rendering 선택은 caller에 남습니다.

**경계**

helper는 page availability를 판단하지 않고 project ID도 lookup하지 않으며 route view model도 만들지 않습니다. 즉 “모든 page behavior”가 아니라 **공통 request presentation context**만 소유합니다. optional content injection은 caller가 이미 읽은 같은 aggregate instance를 재사용하게 해 같은 request에서 data source가 갈라지는 위험을 줄입니다.

`42bef...` test는 helper를 직접 부르지 않지만 Home의 visible shell/query behavior를 refactor 전 기준으로 고정합니다. 실행은 하지 않았으므로 behavior preservation을 runtime 결과로 주장하지 않습니다.

### 3. `2075e54ff947` — refactor(projects): 프로젝트 page context 통합

- Importance: **B**
- Tags: `RENDERER, REFACTOR`
- Fixed role: Migrate both the project archive and project-detail routes to the shared page-context resolver.

#### Historical inspection tasks

- `/projects`와 `/projects/${projectId}`가 기존 content instance를 resolver에 주입해 중복 load를 피하는지 확인합니다.
- page enablement gate가 resolver 호출 전에 그대로 남는지 확인합니다.
- detail route가 raw `projectId`로 currentPath를 만든 뒤 lookup/notFound를 수행하지만 shell은 성공 시에만 render되는 흐름을 적습니다.

#### Reconstruction result

Project index와 detail이 shared resolver로 이관됩니다. 두 route 모두 availability 검사에 사용할 content를 먼저 읽고 그 **같은 content instance**를 resolver의 `content` 인자로 전달합니다. 이 때문에 helper가 aggregate를 다시 읽지 않습니다.

- index current path: `/projects`
- detail current path: ``/projects/${projectId}``

기존 route-local search params await, template/debug resolve, hand-built shell props가 제거됩니다. page enablement gate는 resolver 전에 그대로 남습니다.

detail의 순서는 미묘합니다.

1. content load
2. projects capability gate
3. params await
4. resolver로 raw projectId 기반 currentPath와 query context 준비
5. `getProjectById`
6. missing이면 `notFound()`
7. 성공하면 prepared `shellProps`로 render

unknown project에서도 context object는 한 번 계산되지만 shell은 lookup 성공 후에만 render됩니다. project lookup을 helper에 넣지 않은 덕분에 common context가 domain-specific failure를 소유하지 않습니다.

### 4. `a9fdde29221d` — refactor(routes): 소개와 학습 route context 통합

- Importance: **B**
- Tags: `ROUTING, REFACTOR`
- Fixed role: Apply the common page-context boundary to About, Journey, and Interview Map.

#### Historical inspection tasks

- About, Journey, Interview Map에서 제거된 query/template/debug/shell 중복과 새 resolver 호출을 비교합니다.
- 각 route의 정확한 currentPath literal을 확인합니다.
- availability gate와 route-specific data/renderer preparation이 helper 밖에 남는지 확인합니다.

#### Reconstruction result

About, Journey, Interview Map 세 route가 같은 pattern으로 이동합니다.

- `/about`
- `/journey`
- `/interview-map`

각 route에서 직접 수행하던 search params await, `resolveHomeTemplateId`, `resolveContentDebug`, hand-built `PageShell` props가 제거되고 `resolvePortfolioPageContext({ content, currentPath, searchParams })` 결과를 사용합니다.

중요하게 availability gate는 이동하지 않습니다. 각 page는 content를 읽고 자신의 `SitePageId`를 검사한 뒤에 resolver를 호출합니다. 또한 curation, journey narrative, interview track 같은 route-specific data preparation과 dedicated renderer dispatch도 caller에 남습니다.

따라서 migration은 behavior를 한 helper로 “흡수”한 것이 아니라 중복된 presentation context 준비만 치환한 local refactor입니다. 세 route의 서로 다른 content semantics는 보존됩니다.

### 5. `349317425bd2` — refactor(routes): 이력과 연락 context 통합

- Importance: **B**
- Tags: `ROUTING, REFACTOR`
- Fixed role: Complete the page-context migration for Resume and Contact.

#### Historical inspection tasks

- Resume `/resume`, Contact `/contact`의 resolver 호출과 `PageShell {...shellProps}` 전환을 확인합니다.
- preferred contacts, resume project selection 같은 route-specific derivation이 이동하지 않았는지 확인합니다.
- 이 commit 이후 category 내 public page들의 common initialization ownership이 어디로 모이는지 적습니다.

#### Reconstruction result

마지막으로 Resume와 Contact가 resolver를 사용합니다.

- Resume current path: `/resume`
- Contact current path: `/contact`

두 route에서 template/debug 계산과 verbose `PageShell` props가 제거되고 `shellProps` spread로 바뀝니다. 기존 page enablement gate는 resolver 앞에 남습니다.

route-specific derivation도 그대로입니다.

- Resume: configured resume project selection, optional download/content sections
- Contact: preferred contact link selection과 contact-specific body data

이 commit 이후 Home, Projects index/detail, About, Journey, Interview Map, Resume, Contact가 공통 query/shell initialization boundary를 공유합니다. helper가 content/query/path를 presentation context로 바꾸고, 각 caller는 availability, domain lookup/derivation, renderer 선택을 계속 소유합니다.

## 6. Invariant evolution

Record where each invariant was introduced, extended, shown insufficient, corrected, and verified.

| 단계 | invariant 변화 |
| --- | --- |
| characterization | `42bef...`이 refactor 전 route/shell/query behavior를 기록 |
| boundary 도입 | `1cf65...`이 typed path와 common context resolver를 만들고 Home 이관 |
| project migration | `2075...`가 index/detail을 같은 content instance로 이관 |
| profile/learning migration | `a9fd...`가 About/Journey/Interview 이관 |
| completion | `349...`가 Resume/Contact 이관 |

최종 invariant는 “모든 public page의 template/debug/shell 초기화는 `resolvePortfolioPageContext`가 소유하고, framework/domain-specific decisions는 각 route가 소유한다”입니다.

## 7. Failure → Fix → Test relationships

Connect fixes and tests to the exact earlier assumption or implementation they correct or verify.

- **Characterization → Refactor:** `42bef...`이 visible route contract를 먼저 고정하고 다음 commit들이 implementation ownership만 이동합니다.
- **Duplication risk → Boundary:** route마다 query await와 shell props를 반복하던 상태를 `1cf65...`이 typed helper로 통합합니다.
- **Incremental migration:** project routes, profile/learning routes, resume/contact 순으로 caller가 이동합니다. 한 번에 전 route를 바꾸지 않아 diff 범위를 제한합니다.
- **검증 한계:** selected migration commits에 새 test는 없습니다. existing characterization source가 safety net이지만 이 환경에서 실행하지 않았으므로 “모두 통과했다”고 기록하지 않습니다.

## 8. Ownership, state, and responsibility changes

Track caller/callee ownership, browser/framework state, resource lifetime, and boundaries that deliberately remain outside the Thread.

| 책임 | resolver | route caller |
| --- | --- | --- |
| content fallback load | 예 | caller가 content를 주입할 수도 있음 |
| search params await | 예 | 아니요 |
| template/debug 정규화 | 예 | 아니요 |
| shell props 구성 | 예 | 아니요 |
| typed current path | 입력으로 요구 | 정확한 path 제공 |
| page availability gate | 아니요 | 예 |
| dynamic params/project lookup | 아니요 | 예 |
| route-specific derivation | 아니요 | 예 |
| renderer dispatch | 아니요 | 예 |

## 9. Final Thread state

- 공통 page initialization 코드가 한 helper로 모였습니다.
- path union이 supported public path를 type-level로 제한합니다.
- caller는 이미 읽은 content를 주입해 동일 aggregate를 재사용합니다.
- availability와 domain failure는 helper 밖에 남아 responsibility가 과도하게 확장되지 않습니다.
- characterization tests는 refactor 이전 behavior를 기준으로 하지만 실제 실행 결과는 기록하지 않았습니다.

## 10. Final architecture or execution flow

1. route가 필요한 경우 content를 먼저 읽고 availability를 검사합니다.
2. route가 exact typed current path와 search params, 기존 content를 resolver에 전달합니다.
3. resolver가 query를 await하고 active template/debug를 정규화합니다.
4. resolver가 공통 shell props와 normalized context를 반환합니다.
5. caller가 project lookup, route view data, renderer dispatch를 수행하고 shell/context를 소비합니다.

## 11. Learning-completion checks

- [x] `42bef...`을 characterization baseline으로 첫 위치에 두었습니다.
- [x] resolver 입력/출력과 typed path union을 설명했습니다.
- [x] availability, lookup, renderer dispatch가 caller에 남는 이유를 구분했습니다.
- [x] migration 순서를 exact chronology로 유지했습니다.
- [x] existing tests를 실행하지 않고 통과했다고 주장하지 않았습니다.
