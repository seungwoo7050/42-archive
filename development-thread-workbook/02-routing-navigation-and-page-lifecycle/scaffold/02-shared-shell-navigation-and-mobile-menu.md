# Development Thread 02 — Shared Shell Navigation and Mobile Menu

## 0. Source and frozen audit scope

- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/portfolio`
- Category: `02-routing-navigation-and-page-lifecycle`
- Change range for directed inspection: `e936c79b98bd^..b9571c485013`
- Classification source: `commit/commit-importance.md` on `web/portfolio`
- Historical rule: inspect every commit at its exact SHA; do not project later code backward.
- Phase 1 status: audited and frozen before learner-facing completion.
- Thread boundary: 공용 header/footer/page shell의 route-state 전파와 active/mobile navigation lifecycle을 다룹니다. design switcher 내부 hydration lifecycle은 다음 Thread로 분리합니다.
- Execution note: source inspection and runtime command evidence must be recorded separately.

### Phase 1 audit decisions

- `51806e1875e7`를 실제 chronology에 맞게 mobile menu 및 switcher integration보다 앞으로 이동했습니다.
- hydration/focus 문제를 별도 native switcher Thread로 분리해 shell composition과 겹치지 않게 했습니다.

## 1. Learning goal and planned invariants

개별 route markup에 흩어진 탐색을 공용 shell로 모으고, desktop/mobile 모두 동일한 route state와 접근성 문구를 사용하도록 진화한 과정을 재구성합니다.

- brand, primary navigation, footer home link는 active design/debug 상태를 보존합니다.
- root navigation은 exact match, 다른 navigation은 exact 또는 segment-prefix match로 active 상태를 정합니다.
- mobile navigation은 native `<details>/<summary>`를 사용해 browser가 disclosure state를 소유합니다.
- active design marker는 최종적으로 전체 shell wrapper에 있고 main landmark는 별도 identity를 가집니다.
- skip link와 main `id`가 연결되며 shell label은 presentation content가 소유합니다.

## 2. Questions to answer

- header 도입부터 complete `PageShell`까지 responsibility가 어떻게 이동합니까?
- `51806...`이 `7f77...`, `b957...`보다 먼저여야 하는 이유는 무엇입니까?
- active route 판정에서 `/`를 prefix로 취급하면 어떤 오류가 발생합니까?
- native mobile disclosure가 React state를 필요로 하지 않는 범위는 어디까지입니까?
- outer design wrapper와 main template marker를 분리한 최종 구조는 무엇을 가능하게 합니까?

## 3. Completion criteria

- 여섯 commit을 실제 시간 순서로 설명합니다.
- 각 시점에 아직 없는 기능을 후대 코드에서 역투영하지 않습니다.
- desktop/mobile href와 `aria-current` 정책을 비교합니다.
- shell이 소유하는 state/labels/landmarks와 route renderer 소유를 구분합니다.
- runtime test가 실행되지 않은 경우 code inspection 사실만 기록합니다.

## 4. Fixed commit map

| # | Commit | Subject | Importance | Tags | Source-defined role |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `e936c79b98bd` | feat(shell): 브랜드와 주 탐색 헤더 추가 | B | ROUTING | Add the persistent site header with a brand link, profile identity, primary navigation, and an accessible navigation label. |
| 2 | `a2fd51d4da44` | feat(shell): 홈 디자인 전환 탐색 추가 | B | ROUTING | Introduce an optional design switcher that lists configured home templates, marks the active choice with `aria-current`, and creates explicit `view` URLs for the current path. |
| 3 | `8e11443dc26d` | feat(shell): 공용 푸터와 페이지 셸 추가 | A | ARCH, ROUTING | Complete the shared page frame with a footer and a `PageShell` composition boundary. |
| 4 | `51806e1875e7` | style(theme): 디자인 속성을 site shell로 승격 | B | ROUTING, RENDERER | Promote the active design marker from the home-content selector to the shared site shell. |
| 5 | `7f77ec1912d6` | feat(shell): 현재 navigation 상태와 모바일 메뉴 추가 | B | ROUTING | Make global navigation route-aware and add a keyboard-operable mobile menu. |
| 6 | `b9571c485013` | feat(shell): 디자인 선택기를 공용 shell에 연결 | A | ARCH, ROUTING | Integrate the design switcher into the shared site header and make shell-level interface text come from presentation content. |

The commit SHA, order, subject, importance, tags, and source-defined role in this map are frozen.

## 5. Commit-by-commit reconstruction

### 1. `e936c79b98bd` — feat(shell): 브랜드와 주 탐색 헤더 추가

- Importance: **B**
- Tags: `ROUTING`
- Fixed role: Add the persistent site header with a brand link, profile identity, primary navigation, and an accessible navigation label.

#### Historical inspection tasks

- `src/components/portfolio/site-shell.tsx`의 새 `SiteHeader`와 호출부를 확인합니다.
- brand `/` 링크와 `site.navigation` 반복 렌더링, navigation label, profile identity의 데이터 출처를 적습니다.
- 이 시점에 active-route 표시, query-state 보존, mobile menu가 아직 없다는 이전/후속 경계를 구분합니다.

#### Reconstruction result

> **학습자 작성란:** [[LEARNER:commit:e936c79b98bd]]

### 2. `a2fd51d4da44` — feat(shell): 홈 디자인 전환 탐색 추가

- Importance: **B**
- Tags: `ROUTING`
- Fixed role: Introduce an optional design switcher that lists configured home templates, marks the active choice with `aria-current`, and creates explicit `view` URLs for the current path.

#### Historical inspection tasks

- `TemplateSwitcherProps`와 `SiteHeader`의 optional switcher 분기를 확인합니다.
- brand, primary navigation, template links가 `getTemplateHref`로 active design/debug 상태를 전파하는지 추적합니다.
- `alwaysInclude: true`가 현재 path의 design 선택 링크에서 기본 디자인도 명시하도록 만드는지 확인합니다.

#### Reconstruction result

> **학습자 작성란:** [[LEARNER:commit:a2fd51d4da44]]

### 3. `8e11443dc26d` — feat(shell): 공용 푸터와 페이지 셸 추가

- Importance: **A**
- Tags: `ARCH, ROUTING`
- Fixed role: Complete the shared page frame with a footer and a `PageShell` composition boundary.

#### Historical inspection tasks

- `SiteFooter`와 `PageShell`이 추가되기 전 각 route가 header/main/footer를 어떻게 소유했는지 부모 diff로 확인합니다.
- `PageShell`이 header, `<main data-home-template>`, children, footer를 어떤 순서로 조합하고 어떤 props를 관통시키는지 추적합니다.
- footer home link에도 design/debug 상태 보존이 적용되는지 확인합니다.
- 공용 frame이 소유하는 것과 각 route renderer가 계속 소유하는 내용을 분리합니다.

#### Reconstruction result

> **학습자 작성란:** [[LEARNER:commit:8e11443dc26d]]

### 4. `51806e1875e7` — style(theme): 디자인 속성을 site shell로 승격

- Importance: **B**
- Tags: `ROUTING, RENDERER`
- Fixed role: Promote the active design marker from the home-content selector to the shared site shell.

#### Historical inspection tasks

- `src/components/portfolio/site-shell.tsx`의 `data-site-design` 위치와 기존 `data-home-template`을 비교합니다.
- `src/app/globals.css` selector가 `main[data-home-template=...]`에서 shell-wide `[data-site-design=...]`으로 바뀐 이유와 적용 범위를 확인합니다.
- 이 commit의 실제 날짜가 `7f77...`, `b957...`보다 앞이라는 chronology를 유지합니다.

#### Reconstruction result

> **학습자 작성란:** [[LEARNER:commit:51806e1875e7]]

### 5. `7f77ec1912d6` — feat(shell): 현재 navigation 상태와 모바일 메뉴 추가

- Importance: **B**
- Tags: `ROUTING`
- Fixed role: Make global navigation route-aware and add a keyboard-operable mobile menu.

#### Historical inspection tasks

- `isCurrentNavigation`의 root exact match와 비-root prefix match를 구체적인 path 예로 검증합니다.
- desktop/mobile 링크에 동일한 state-preserving href와 `aria-current` 정책이 적용되는지 확인합니다.
- native `<details>/<summary>` mobile menu가 open 상태를 browser에 맡기며 별도 React state를 두지 않는지 확인합니다.
- 이 commit에서 inline template switcher가 header에서 제거되는 변경도 thread 흐름에 연결합니다.

#### Reconstruction result

> **학습자 작성란:** [[LEARNER:commit:7f77ec1912d6]]

### 6. `b9571c485013` — feat(shell): 디자인 선택기를 공용 shell에 연결

- Importance: **A**
- Tags: `ARCH, ROUTING`
- Fixed role: Integrate the design switcher into the shared site header and make shell-level interface text come from presentation content.

#### Historical inspection tasks

- `PageShell`, `SiteHeader`, `DesignSwitcher`의 새 조합 경로와 `ui` prop 전파를 추적합니다.
- skip link의 href와 `<main id="main-content">` landmark가 어떻게 맞물리는지 확인합니다.
- `data-site-design` outer wrapper와 `data-home-template` main landmark가 분리된 이유와 selector 범위를 적습니다.
- primary/mobile/design navigation의 label이 hard-coded string에서 presentation content로 이동한 ownership 변화를 설명합니다.
- 이 commit이 switcher 자체의 hydration lifecycle을 해결하지는 않으며 별도 Thread가 이어진다는 경계를 적습니다.

#### Reconstruction result

> **학습자 작성란:** [[LEARNER:commit:b9571c485013]]

## 6. Invariant evolution

Record where each invariant was introduced, extended, shown insufficient, corrected, and verified.

> **학습자 작성란:** [[LEARNER:thread:2:invariants]]

## 7. Failure → Fix → Test relationships

Connect fixes and tests to the exact earlier assumption or implementation they correct or verify.

> **학습자 작성란:** [[LEARNER:thread:2:relations]]

## 8. Ownership, state, and responsibility changes

Track caller/callee ownership, browser/framework state, resource lifetime, and boundaries that deliberately remain outside the Thread.

> **학습자 작성란:** [[LEARNER:thread:2:ownership]]

## 9. Final Thread state

> **학습자 작성란:** [[LEARNER:thread:2:final]]

## 10. Final architecture or execution flow

> **학습자 작성란:** [[LEARNER:thread:2:flow]]

## 11. Learning-completion checks

> **학습자 작성란:** [[LEARNER:thread:2:checks]]
