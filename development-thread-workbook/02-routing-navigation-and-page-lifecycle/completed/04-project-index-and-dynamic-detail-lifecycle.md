# Development Thread 04 — Project Index and Dynamic Detail Lifecycle

## 0. Source and frozen audit scope

- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/portfolio`
- Category: `02-routing-navigation-and-page-lifecycle`
- Change range for directed inspection: `7571f1400065^..d4c7f742fb4d`
- Classification source: `commit/commit-importance.md` on `web/portfolio`
- Historical rule: inspect every commit at its exact SHA; do not project later code backward.
- Phase 1 status: audited and frozen before learner-facing completion.
- Thread boundary: App Router가 project index와 dynamic detail addressability, params, unknown-project failure를 소유하는 부분만 다룹니다. page enablement 및 global 404 presentation은 별도 Thread로 분리합니다.
- Execution note: source inspection and runtime command evidence must be recorded separately.

### Phase 1 audit decisions

- `50199...`와 custom 404 commit을 제거해 route creation과 availability/recovery를 독립 story로 분리했습니다.

## 1. Learning goal and planned invariants

`/projects` index와 `/projects/[projectId]` detail이 content/query/shell 계약에 연결되고, static params와 runtime `notFound()`가 서로 다른 책임을 가지는 과정을 재구성합니다.

- project index는 aggregated enabled project set을 partition/group하고 template/debug state를 renderer로 전달합니다.
- dynamic detail static params는 canonical project IDs에서 생성됩니다.
- runtime unknown project ID는 `getProjectById` 실패 후 `notFound()`로 종료됩니다.
- static generation 목록과 runtime failure path는 서로 대체하지 않습니다.

## 2. Questions to answer

- index route가 content derivation과 renderer dispatch를 어느 경계에서 수행합니까?
- `generateStaticParams`와 `notFound()`가 각각 어떤 요청 집합을 다룹니까?
- invalid project ID에서 query resolution과 lookup의 실제 순서는 무엇입니까?
- page enablement가 이 Thread에서 제외되어야 하는 이유는 무엇입니까?

## 3. Completion criteria

- 두 route-introduction commit만 chronology대로 설명합니다.
- 초기 index/detail code에 존재하는 로직만 사용합니다.
- static build-time enumeration과 runtime missing-ID handling을 분리합니다.
- 후속 page gate 또는 renderer architecture를 이 시점의 구현으로 오인하지 않습니다.

## 4. Fixed commit map

| # | Commit | Subject | Importance | Tags | Source-defined role |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `7571f1400065` | feat(projects): 프로젝트 목록 route 연결 | B | ROUTING, RENDERER | Connect `/projects` to the aggregated content and query-state model. |
| 2 | `d4c7f742fb4d` | feat(project): 프로젝트 상세 route 연결 | B | ROUTING, RENDERER | Add the dynamic project-detail route and generate static parameters from the enabled project collection. |

The commit SHA, order, subject, importance, tags, and source-defined role in this map are frozen.

## 5. Commit-by-commit reconstruction

### 1. `7571f1400065` — feat(projects): 프로젝트 목록 route 연결

- Importance: **B**
- Tags: `ROUTING, RENDERER`
- Fixed role: Connect `/projects` to the aggregated content and query-state model.

#### Historical inspection tasks

- `src/app/projects/page.tsx`가 content, search params, template/debug, featured/archive partition, grouping, metrics를 어떤 순서로 준비하는지 확인합니다.
- classic/design renderer 분기와 공통 `shellProps.currentPath = "/projects"`를 추적합니다.
- `src/content/site.json`의 Projects navigation 추가가 route addressability와 discovery를 동시에 연결하는지 확인합니다.

#### Reconstruction result

`src/app/projects/page.tsx`가 `/projects`의 App Router entry로 추가됩니다. route는 먼저 portfolio aggregate와 optional search params를 읽고 `view`/`debug`를 정규화합니다. 이어 presentation copy와 project collection을 사용해 featured project와 나머지 archive, configured group, route-level metric count를 준비합니다.

active template에 따라 Classic 또는 Design project-index view로 분기하지만 두 경로는 같은 content와 query-state 결과를 공유합니다. `shellProps.templateSwitcher.currentPath`는 `/projects`로 고정되어 design switch가 현재 route를 유지합니다. 같은 commit에서 `src/content/site.json`에 Projects navigation이 추가되어 addressable route가 공용 navigation에서도 발견됩니다.

이 시점의 route는 page availability flag를 검사하지 않습니다. 또한 later full-site renderer registry나 route view model을 아직 사용하지 않습니다. 이 commit의 역할은 기존 aggregate/query/shell 계약에 project index를 처음 연결하는 것입니다.

### 2. `d4c7f742fb4d` — feat(project): 프로젝트 상세 route 연결

- Importance: **B**
- Tags: `ROUTING, RENDERER`
- Fixed role: Add the dynamic project-detail route and generate static parameters from the enabled project collection.

#### Historical inspection tasks

- `generateStaticParams`가 aggregated `content.projects`의 ID를 반환하는지 확인합니다.
- `params`/`searchParams` await, template/debug resolution, `getProjectById`, `notFound()`의 실제 순서를 적습니다.
- 유효한 project일 때 `currentPath`와 detail view props가 canonical project record에서 만들어지는지 확인합니다.
- static params에 없는 runtime request와 unknown ID가 어떻게 recover되는지, page enablement는 아직 이 Thread 범위가 아님을 구분합니다.

#### Reconstruction result

**build-time enumeration**

`generateStaticParams()`는 `getPortfolioContent().projects`를 순회해 `{ projectId }` 배열을 반환합니다. 이 aggregate는 앞선 loader에서 disabled project를 걸러낸 상태이므로 source-defined role의 “enabled project collection”과 일치합니다.

**runtime page 순서**

1. content를 읽습니다.
2. dynamic `params`를 await해 `projectId`를 얻습니다.
3. optional `searchParams`를 await합니다.
4. template/debug를 resolve합니다.
5. `getProjectById(projectId, content)`를 호출합니다.
6. 결과가 없으면 `notFound()`로 종료합니다.
7. 성공 시 canonical project ID를 포함한 current path와 detail view props를 구성합니다.

static params는 known project pages를 미리 만들 수 있게 하지만 runtime에서 알려지지 않은 path가 절대 요청되지 않는다는 보장은 아닙니다. 그래서 `getProjectById` 실패 path가 별도로 필요합니다.

**보장과 경계**

- known project는 query-state-preserving shell 안에서 detail view로 연결됩니다.
- unknown project ID는 null dereference나 빈 page 대신 App Router not-found flow로 전환됩니다.
- 이 SHA의 invalid-ID path는 query parsing 뒤에 실행됩니다.
- `projects` page capability gate는 아직 없습니다. 그 정책은 `50199...`에서 별도 도입됩니다.

## 6. Invariant evolution

Record where each invariant was introduced, extended, shown insufficient, corrected, and verified.

| 단계 | invariant |
| --- | --- |
| `7571...` | `/projects`가 aggregate/query/shell contract에 연결되고 navigation에서 발견 가능 |
| `d4c7...` | canonical project IDs를 static params로 노출하며 runtime unknown ID는 `notFound()` |

이 Thread의 최종 invariant는 “project collection의 addressability는 index와 generated detail paths로 제공하되, runtime lookup 실패는 명시적 not-found lifecycle로 종료한다”입니다.

## 7. Failure → Fix → Test relationships

Connect fixes and tests to the exact earlier assumption or implementation they correct or verify.

- **Index → Detail:** index가 project collection과 internal detail navigation의 진입점을 제공하고 다음 commit이 `[projectId]` addressability를 완성합니다.
- **Enumeration → Recovery:** `generateStaticParams`는 build-time known set을 제공하지만 unknown runtime path를 처리하지 않으므로 `getProjectById` + `notFound()`가 별도로 존재합니다.
- **분리된 후속 정책:** `50199...`의 page capability gate와 `154b...`의 global 404 presentation은 이 route-creation Thread의 후속/인접 정책이지 초기 구현의 일부가 아닙니다.

## 8. Ownership, state, and responsibility changes

Track caller/callee ownership, browser/framework state, resource lifetime, and boundaries that deliberately remain outside the Thread.

| 책임 | 소유자 |
| --- | --- |
| project aggregate 및 enabled set | portfolio content layer |
| `/projects` route data 준비 | project index App Router page |
| dynamic ID extraction | App Router `params` |
| canonical lookup | `getProjectById` |
| missing ID transition | Next `notFound()` |
| page body presentation | Classic/Design route views |
| page capability | 이 Thread 이후 별도 route gate |

## 9. Final Thread state

- project index와 dynamic detail path가 모두 query-state-aware shell에 연결됩니다.
- known detail paths는 aggregate project IDs에서 생성됩니다.
- unknown ID는 explicit not-found path를 가집니다.
- static params와 runtime validation을 동일한 보장으로 혼동하지 않습니다.
- page enablement와 custom 404 UI는 별도 Thread에 있습니다.

## 10. Final architecture or execution flow

1. `/projects` 요청이 aggregate와 query state를 준비해 index renderer를 선택합니다.
2. 사용자가 project detail link로 이동합니다.
3. `[projectId]` page가 params와 query를 읽습니다.
4. canonical project lookup이 성공하면 current path와 detail props를 구성합니다.
5. lookup이 실패하면 `notFound()`가 global not-found lifecycle로 넘깁니다.

## 11. Learning-completion checks

- [x] 두 route-introduction commit만 유지했습니다.
- [x] static params와 runtime missing-ID handling을 구분했습니다.
- [x] `d4c7...`의 실제 query/lookup/notFound 순서를 적었습니다.
- [x] 후속 page gate와 404 UI를 초기 commit에 역투영하지 않았습니다.
- [x] runtime 실행 결과를 주장하지 않았습니다.
