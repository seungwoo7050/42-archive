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

`src/components/portfolio/site-shell.tsx`에 첫 `SiteHeader`가 추가됩니다. header는 profile identity를 brand 영역에 표시하고, brand link는 `/`, primary navigation은 `site.navigation`을 순회해 렌더링합니다. `<nav>`에는 accessible label이 있습니다.

이 시점의 navigation은 단순 addressability만 제공합니다. 현재 route를 비교하지 않으므로 `aria-current`가 없고, design/debug query를 다시 붙이지 않으며, mobile 전용 disclosure도 없습니다. 따라서 이 commit의 역할은 “persistent shell navigation의 첫 소유 위치”를 만든 것이지 완성된 route-state contract를 만든 것이 아닙니다.

### 2. `a2fd51d4da44` — feat(shell): 홈 디자인 전환 탐색 추가

- Importance: **B**
- Tags: `ROUTING`
- Fixed role: Introduce an optional design switcher that lists configured home templates, marks the active choice with `aria-current`, and creates explicit `view` URLs for the current path.

#### Historical inspection tasks

- `TemplateSwitcherProps`와 `SiteHeader`의 optional switcher 분기를 확인합니다.
- brand, primary navigation, template links가 `getTemplateHref`로 active design/debug 상태를 전파하는지 추적합니다.
- `alwaysInclude: true`가 현재 path의 design 선택 링크에서 기본 디자인도 명시하도록 만드는지 확인합니다.

#### Reconstruction result

header가 optional `TemplateSwitcherProps`를 받도록 확장됩니다. switcher가 있을 때 brand, primary navigation, template 선택 링크는 `getTemplateHref`를 통과합니다. 그 결과 active template과 `contentDebug`가 내부 탐색에 다시 실립니다.

template 목록은 current path를 대상으로 하고, 선택된 item은 `aria-current="page"`를 가집니다. design 선택 링크에는 `alwaysInclude: true`가 사용되어 configured default도 선택 메뉴 안에서는 명시적 `view` URL을 가질 수 있습니다.

아직 mobile navigation은 없고 switcher가 header 내부의 간단한 inline 목록입니다. 즉 상태 보존은 도입됐지만 responsive lifecycle과 dedicated switcher component는 후속입니다.

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

**구조적 변화**

새 `SiteFooter`는 `site.footer.note`, copyright 문구, 그리고 `/`로 돌아가는 상태 보존 링크를 렌더링합니다. `PageShell`은 별도의 inner main을 만드는 구조가 아니라, **하나의 root `<main data-home-template={homeTemplate}>` 안에** 다음 순서로 자식을 배치합니다.

1. `SiteHeader`
2. route-owned `children`
3. `SiteFooter`

`SiteFooter`의 home link는 `getTemplateHref("/", homeTemplate, { contentDebug })`를 사용하므로 선택한 template과 content-debug 상태를 보존합니다. header는 `templateSwitcher`를 전달받습니다. 이 commit의 diff는 `src/components/portfolio/site-shell.tsx`만 바꾸므로, composition boundary를 정의하지만 기존 route call site를 일괄 이관하지는 않습니다.

**책임 경계**

- `PageShell`: root main, header/children/footer 조합, shell-level state 전달
- `SiteFooter`: footer copy와 상태 보존 home link
- route page/renderer: page-specific content, section order, route data derivation
- URL helper: href string 정책
- browser/Next: 실제 navigation lifecycle

`PageShell`은 route availability나 current-route active 판정을 아직 소유하지 않습니다. 이 commit의 A-level 의미는 여러 route가 채택할 수 있는 공통 composition boundary를 정의했다는 데 있으며, caller migration이나 별도 content landmark까지 보장하지는 않습니다.

### 4. `51806e1875e7` — style(theme): 디자인 속성을 site shell로 승격

- Importance: **B**
- Tags: `ROUTING, RENDERER`
- Fixed role: Promote the active design marker from the home-content selector to the shared site shell.

#### Historical inspection tasks

- `src/components/portfolio/site-shell.tsx`의 `data-site-design` 위치와 기존 `data-home-template`을 비교합니다.
- `src/app/globals.css` selector가 `main[data-home-template=...]`에서 shell-wide `[data-site-design=...]`으로 바뀐 이유와 적용 범위를 확인합니다.
- 이 commit의 실제 날짜가 `7f77...`, `b957...`보다 앞이라는 chronology를 유지합니다.

#### Reconstruction result

이 commit은 active design marker를 home-template 전용 selector와 분리합니다. `PageShell`의 root `<main>`에는 기존 `data-home-template={homeTemplate}`과 새 `data-site-design={homeTemplate}`이 **같이** 놓이고, global CSS는 `main[data-home-template="classic"]` 대신 `[data-site-design="classic"]`을 사용합니다.

이 SHA에서는 marker가 붙은 DOM element 자체가 바뀌지 않습니다. root `<main>`이 이미 header, route children, footer를 모두 감싸므로 기존 selector도 그 descendants에 적용됐습니다. 실제 변화는 selector의 의미를 “home template인 main”에서 “site design boundary”로 일반화한 것입니다. 후속 `b957...`이 `data-site-design`을 outer `<div>`로 옮기고, `data-home-template`을 route body만 감싸는 inner `<main id="main-content">`에 남기면서 두 책임이 물리적으로 분리됩니다.

중요한 chronology는 이 marker 의미의 분리가 `7f77...`의 mobile navigation과 `b957...`의 dedicated switcher integration보다 먼저라는 점입니다. 후속 outer-wrapper 구조를 이 commit에 역투영하지 않았습니다.

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

**route-aware 판정**

새 `isCurrentNavigation(href, currentPath)`는 `/`를 exact match로만 취급합니다. 그렇지 않으면 `currentPath === href` 또는 `currentPath.startsWith(`${href}/`)`를 사용합니다. 이 예외가 없으면 모든 path가 `/`로 시작하므로 Home이 항상 active가 됩니다.

**desktop/mobile 공통 계약**

- desktop과 mobile 모두 `getTemplateHref`로 design/debug 상태를 보존합니다.
- 같은 active 판정 결과로 `aria-current="page"`를 설정합니다.
- mobile은 React boolean state 대신 native `<details><summary>`를 사용합니다.
- browser가 open/close 및 keyboard disclosure semantics를 소유합니다.

동시에 이전 inline template switcher가 header에서 제거됩니다. 이 시점에는 dedicated `DesignSwitcher`가 아직 shell에 들어오지 않았으므로 design selection UI가 일시적으로 별도 통합을 기다리는 상태입니다.

native menu에 explicit close handler는 추가되지 않았습니다. route navigation이 발생하면 page transition이 disclosure lifetime을 끝내지만, same-page prevented navigation에서 닫힘을 보장하는 component state machine은 이 commit의 범위가 아닙니다.

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

**공용 shell 완성**

`DesignSwitcher`가 `SiteHeader`에 연결되고, presentation의 공용 UI copy가 `ui` prop으로 shell까지 전달됩니다. primary/mobile/design navigation label과 menu text가 hard-coded component text가 아니라 validated presentation content의 책임이 됩니다.

markup 경계도 정리됩니다.

- outer wrapper: `data-site-design={homeTemplate}` — header, main, footer를 포함하는 full-site design scope
- main: `id="main-content"`와 `data-home-template={homeTemplate}` — skip target이자 page content landmark
- skip link: `href="#main-content"`

이 구조는 visual design scope와 semantic main landmark를 같은 element에 강제로 결합하지 않습니다.

**ownership**

`PageShell`이 shell labels, design scope, landmark, header/footer composition을 소유합니다. 각 route는 active template/debug/current path를 준비해 넘깁니다. `DesignSwitcher` 내부의 disclosure/focus/hydration 문제는 여기서 해결되지 않으며 다음 Thread의 책임입니다.

이 commit에는 이 구조를 새로 실행 검증하는 test가 포함되지 않았습니다. exact diff로 composition과 prop flow를 확인했습니다.

## 6. Invariant evolution

Record where each invariant was introduced, extended, shown insufficient, corrected, and verified.

| 단계 | 추가된 invariant |
| --- | --- |
| `e936...` | persistent header와 content-driven primary navigation |
| `a2fd...` | shell internal links의 design/debug 상태 보존 |
| `8e114...` | 하나의 root main 안에 header/route children/footer를 조합하는 `PageShell` 정의 |
| `51806...` | 동일 root에 site-design marker를 추가해 home-template selector와 의미를 분리 |
| `7f77...` | route-aware active state와 native mobile disclosure |
| `b957...` | content-owned labels, skip/main landmark, dedicated design switcher integration |

최종 shell은 state-preserving navigation, active-route semantics, mobile disclosure, full-site design marker, skip target을 공통으로 제공합니다.

## 7. Failure → Fix → Test relationships

Connect fixes and tests to the exact earlier assumption or implementation they correct or verify.

- **초기 부족 → 확장:** 단순 header는 query state와 active/mobile semantics가 없었습니다. `a2fd...`, `7f77...`이 각각 상태와 route-aware responsive behavior를 추가했습니다.
- **marker coupling → correction:** `51806...`은 동일 root에서 design marker를 `data-home-template`과 분리했고, `b957...`은 이를 outer wrapper와 inner main landmark로 물리적으로 분리했습니다.
- **integration gap → completion:** `7f77...`에서 inline switcher를 제거한 뒤 `b957...`이 dedicated `DesignSwitcher`를 공용 header에 연결했습니다.
- 이 Thread에는 직접 test commit이 없습니다. 후속 route/component characterization은 다른 Thread/카테고리에 있으며 실행 결과를 소급하지 않았습니다.

## 8. Ownership, state, and responsibility changes

Track caller/callee ownership, browser/framework state, resource lifetime, and boundaries that deliberately remain outside the Thread.

| 책임 | 최종 소유자 |
| --- | --- |
| header/footer/main composition | `PageShell` |
| primary/mobile navigation source | `site.navigation` |
| shell UI/accessibility copy | `content.presentation.ui` |
| active route 판정 | `isCurrentNavigation` |
| mobile open state | native `<details>`/browser |
| design selection interaction | `DesignSwitcher` |
| page body | route renderer |
| actual history transition | Next.js/browser |

## 9. Final Thread state

- 공용 shell의 모든 주요 internal navigation surface는 design/debug state를 보존합니다.
- desktop/mobile은 동일한 active route 정책을 사용합니다.
- Home은 exact match만 active이고 section routes는 child detail path에서도 active입니다.
- full-site design marker가 header부터 footer까지 적용되며 main landmark는 별도 유지됩니다.
- skip link와 content-owned accessibility labels가 shell contract에 포함됩니다.

## 10. Final architecture or execution flow

1. route가 content, active template, debug, current path를 준비합니다.
2. `PageShell`이 outer design wrapper와 skip link를 만듭니다.
3. `SiteHeader`가 brand, desktop navigation, native mobile navigation, design switcher를 렌더링합니다.
4. 각 internal href는 query-state helper를 통과하고 active predicate로 `aria-current`를 얻습니다.
5. main landmark가 route body를 감싸고 `SiteFooter`가 동일한 state-preserving home path를 제공합니다.

## 11. Learning-completion checks

- [x] chronology 오류였던 `51806...` 위치를 바로잡았습니다.
- [x] 각 commit 시점에 아직 없는 mobile/switcher behavior를 구분했습니다.
- [x] route active 판정의 root 예외를 설명했습니다.
- [x] shell과 route renderer ownership을 분리했습니다.
- [x] 실행하지 않은 test 결과를 주장하지 않았습니다.
