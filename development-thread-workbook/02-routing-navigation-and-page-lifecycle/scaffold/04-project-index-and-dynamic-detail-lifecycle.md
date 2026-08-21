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

> **학습자 작성란:** [[LEARNER:commit:7571f1400065]]

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

> **학습자 작성란:** [[LEARNER:commit:d4c7f742fb4d]]

## 6. Invariant evolution

Record where each invariant was introduced, extended, shown insufficient, corrected, and verified.

> **학습자 작성란:** [[LEARNER:thread:4:invariants]]

## 7. Failure → Fix → Test relationships

Connect fixes and tests to the exact earlier assumption or implementation they correct or verify.

> **학습자 작성란:** [[LEARNER:thread:4:relations]]

## 8. Ownership, state, and responsibility changes

Track caller/callee ownership, browser/framework state, resource lifetime, and boundaries that deliberately remain outside the Thread.

> **학습자 작성란:** [[LEARNER:thread:4:ownership]]

## 9. Final Thread state

> **학습자 작성란:** [[LEARNER:thread:4:final]]

## 10. Final architecture or execution flow

> **학습자 작성란:** [[LEARNER:thread:4:flow]]

## 11. Learning-completion checks

> **학습자 작성란:** [[LEARNER:thread:4:checks]]
