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

> **학습자 작성란:** [[LEARNER:commit:42bef4e5783c]]

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

> **학습자 작성란:** [[LEARNER:commit:1cf65b708476]]

### 3. `2075e54ff947` — refactor(projects): 프로젝트 page context 통합

- Importance: **B**
- Tags: `RENDERER, REFACTOR`
- Fixed role: Migrate both the project archive and project-detail routes to the shared page-context resolver.

#### Historical inspection tasks

- `/projects`와 `/projects/${projectId}`가 기존 content instance를 resolver에 주입해 중복 load를 피하는지 확인합니다.
- page enablement gate가 resolver 호출 전에 그대로 남는지 확인합니다.
- detail route가 raw `projectId`로 currentPath를 만든 뒤 lookup/notFound를 수행하지만 shell은 성공 시에만 render되는 흐름을 적습니다.

#### Reconstruction result

> **학습자 작성란:** [[LEARNER:commit:2075e54ff947]]

### 4. `a9fdde29221d` — refactor(routes): 소개와 학습 route context 통합

- Importance: **B**
- Tags: `ROUTING, REFACTOR`
- Fixed role: Apply the common page-context boundary to About, Journey, and Interview Map.

#### Historical inspection tasks

- About, Journey, Interview Map에서 제거된 query/template/debug/shell 중복과 새 resolver 호출을 비교합니다.
- 각 route의 정확한 currentPath literal을 확인합니다.
- availability gate와 route-specific data/renderer preparation이 helper 밖에 남는지 확인합니다.

#### Reconstruction result

> **학습자 작성란:** [[LEARNER:commit:a9fdde29221d]]

### 5. `349317425bd2` — refactor(routes): 이력과 연락 context 통합

- Importance: **B**
- Tags: `ROUTING, REFACTOR`
- Fixed role: Complete the page-context migration for Resume and Contact.

#### Historical inspection tasks

- Resume `/resume`, Contact `/contact`의 resolver 호출과 `PageShell {...shellProps}` 전환을 확인합니다.
- preferred contacts, resume project selection 같은 route-specific derivation이 이동하지 않았는지 확인합니다.
- 이 commit 이후 category 내 public page들의 common initialization ownership이 어디로 모이는지 적습니다.

#### Reconstruction result

> **학습자 작성란:** [[LEARNER:commit:349317425bd2]]

## 6. Invariant evolution

Record where each invariant was introduced, extended, shown insufficient, corrected, and verified.

> **학습자 작성란:** [[LEARNER:thread:7:invariants]]

## 7. Failure → Fix → Test relationships

Connect fixes and tests to the exact earlier assumption or implementation they correct or verify.

> **학습자 작성란:** [[LEARNER:thread:7:relations]]

## 8. Ownership, state, and responsibility changes

Track caller/callee ownership, browser/framework state, resource lifetime, and boundaries that deliberately remain outside the Thread.

> **학습자 작성란:** [[LEARNER:thread:7:ownership]]

## 9. Final Thread state

> **학습자 작성란:** [[LEARNER:thread:7:final]]

## 10. Final architecture or execution flow

> **학습자 작성란:** [[LEARNER:thread:7:flow]]

## 11. Learning-completion checks

> **학습자 작성란:** [[LEARNER:thread:7:checks]]
