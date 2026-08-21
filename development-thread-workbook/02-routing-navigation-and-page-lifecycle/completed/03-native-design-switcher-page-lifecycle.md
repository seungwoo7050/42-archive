# Development Thread 03 — Native Design Switcher Page Lifecycle

## 0. Source and frozen audit scope

- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/portfolio`
- Category: `02-routing-navigation-and-page-lifecycle`
- Change range for directed inspection: `e43e8addd7f3^..1ac7813155c6`
- Classification source: `commit/commit-importance.md` on `web/portfolio`
- Historical rule: inspect every commit at its exact SHA; do not project later code backward.
- Phase 1 status: audited and frozen before learner-facing completion.
- Thread boundary: design 선택 navigation의 disclosure state, focus, hydration, server/client ownership을 다룹니다. visual styling 자체는 Category 05, generic component-test strategy는 Category 07의 범위입니다.
- Execution note: source inspection and runtime command evidence must be recorded separately.

### Phase 1 audit decisions

- 카테고리 초안에 빠져 있던 branch source의 핵심 native design-switcher Thread를 추가했습니다.
- source-defined cross-cutting Thread 순서와 exact importance/tag를 그대로 사용했습니다.

## 1. Learning goal and planned invariants

client-owned native disclosure에서 시작해 hydration race를 재현하고, static selector markup을 server ownership으로 되돌린 뒤 최소 close action만 client island로 남기는 과정을 재구성합니다.

- native `<details>`가 open state를 소유하며 explicit close는 `open` 제거 후 summary focus를 복원합니다.
- design link는 current route와 query state를 보존하고 active item은 `aria-current="page"`를 가집니다.
- hydration 전 browser가 변경한 native open state는 합법적인 상태로 취급됩니다.
- 최종 selector static markup은 server component이고 imperative close만 client component입니다.
- source-level regression은 selector에 top-level `"use client"`나 `useRef`가 재도입되는 것을 막습니다.

## 2. Questions to answer

- 초기 `useRef` ownership이 왜 native browser state와 hydration 시점에 충돌할 수 있습니까?
- explicit close와 design-link navigation close의 focus semantics 차이는 무엇입니까?
- `suppressHydrationWarning`이 무엇을 고치고 무엇을 직접 고치지 않습니까?
- deterministic hydration test는 browser mutation을 어떤 순서로 주입합니까?
- server-first refactor 후 client boundary가 남아야 하는 최소 이유는 무엇입니까?

## 3. Completion criteria

- 구현 → interaction test → hydration fix → race regression → server refactor → structural regression 순서를 설명합니다.
- fix commit을 독립 기능처럼 서술하지 않고 이전 assumption과 연결합니다.
- test technique, production path, assertion, 비보장을 구분합니다.
- server/client ownership과 focus lifetime을 명시합니다.
- mixed-scope `09cec...`에서 이 Thread와 직접 관련된 evidence를 분리합니다.

## 4. Fixed commit map

| # | Commit | Subject | Importance | Tags | Source-defined role |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `e43e8addd7f3` | feat(designs): 디자인 선택기 상태와 trigger 추가 | B | RENDERER | Introduce the client-side state and trigger for a route-preserving design switcher. |
| 2 | `c69ef85c98b2` | feat(designs): 디자인 선택 목록과 닫기 동작 추가 | A | ARCH, RENDERER | Complete the design-switcher sheet with an ordered list of registered designs, active-state semantics, palette previews, and explicit closing behavior. |
| 3 | `09cec616f314` | test(ui): 디자인 선택과 프로젝트 링크 계약 검증 | A | VALIDATION, TEST | Lock down the interaction contracts of the design selector and project-link components. |
| 4 | `c702b870d57a` | fix(ui): hydration 중 native details 상태 보존 | A | DEBUG | Mark the native design-switcher `details` element as an intentional hydration boundary. |
| 5 | `b6c0238ab8b8` | test(ui): details hydration 경쟁 조건 검증 | A | VALIDATION, TEST | Reproduce the design-switcher hydration race directly and lock down the intended invariant. |
| 6 | `a37cb8596733` | refactor(ui): 디자인 선택기를 server markup으로 전환 | A | ARCH, REFACTOR | Convert the design selector itself from a client component to server-rendered markup and isolate the only imperative behavior in a small `DesignSwitcherClose` client component. |
| 7 | `1ac7813155c6` | test(ui): server 선택기와 focus 복원 검증 | A | VALIDATION, A11Y, TEST | Add a structural regression check that reads the design-switcher source and rejects either a top-level `"use client"` directive or `useRef` state in the selector component. |

The commit SHA, order, subject, importance, tags, and source-defined role in this map are frozen.

## 5. Commit-by-commit reconstruction

### 1. `e43e8addd7f3` — feat(designs): 디자인 선택기 상태와 trigger 추가

- Importance: **B**
- Tags: `RENDERER`
- Fixed role: Introduce the client-side state and trigger for a route-preserving design switcher.

#### Historical inspection tasks

- `src/components/portfolio/design-switcher.tsx`의 top-level `"use client"`, `useRef` 두 개, native `<details>/<summary>`를 확인합니다.
- `SITE_DESIGNS`, content template copy, active label, two-digit count label의 계산 경로를 추적합니다.
- 이 SHA에서는 trigger만 있고 선택 panel과 explicit close가 아직 없다는 범위를 적습니다.

#### Reconstruction result

`src/components/portfolio/design-switcher.tsx`가 top-level `"use client"` component로 도입됩니다. component는 native `<details>`와 `<summary>`를 사용하면서도 두 DOM ref를 보유합니다. 하나는 details open 상태를 조작하기 위한 ref이고, 다른 하나는 close 후 focus를 돌려줄 summary ref입니다.

이 commit에서는 trigger skeleton만 구성됩니다. `SITE_DESIGNS`와 content-owned template metadata를 결합해 active design을 찾고, 없으면 registry 첫 항목으로 fallback합니다. 현재 index와 전체 개수는 두 자리 문자열로 표시됩니다. 그러나 선택 panel, design link list, explicit close button은 아직 없습니다.

따라서 browser-native disclosure를 선택한 architecture와 client hydration boundary가 먼저 생긴 상태입니다. 아직 imperative ref가 실제 close 동작에 사용되지는 않지만, 후속 lifecycle ownership의 토대가 됩니다.

### 2. `c69ef85c98b2` — feat(designs): 디자인 선택 목록과 닫기 동작 추가

- Importance: **A**
- Tags: `ARCH, RENDERER`
- Fixed role: Complete the design-switcher sheet with an ordered list of registered designs, active-state semantics, palette previews, and explicit closing behavior.

#### Historical inspection tasks

- `SITE_DESIGNS.map`으로 만든 link list, palette swatch, `aria-current`, `getTemplateHref` 호출을 확인합니다.
- close button이 `detailsRef.current?.removeAttribute("open")` 후 `summaryRef.current?.focus()`를 호출하는 순서를 추적합니다.
- design link의 `onClick`도 disclosure를 닫지만 focus를 복원하지 않는 차이를 적습니다.
- native open 상태와 imperative refs를 동시에 쓰는 ownership 구조가 이후 hydration race의 전제가 되는지 설명합니다.

#### Reconstruction result

**완성된 interaction**

선택 panel이 native details 안에 추가되고 `SITE_DESIGNS` 순서대로 각 design을 렌더링합니다. 각 item은 content template에서 label/description을 얻고 registry palette preview를 표시하며, active ID이면 `aria-current="page"`를 갖습니다. href는 현재 path와 debug state를 `getTemplateHref`로 운반합니다.

explicit close button의 실행 순서는 다음과 같습니다.

```ts
detailsRef.current?.removeAttribute("open");
summaryRef.current?.focus();
```

즉 disclosure를 닫은 뒤 keyboard focus를 trigger로 복원합니다. design link click handler는 details의 `open`만 제거하고 focus는 이동시키지 않습니다. 정상 navigation이면 새 page로 넘어가므로 explicit close와 같은 focus restoration이 필요하지 않다는 전제입니다.

**상태 소유**

- open 상태: native details DOM
- imperative close/focus: hydrated client component의 refs
- target URL: helper가 생성한 link href
- active semantics: `aria-current`
- actual route transition: Next `Link`/browser

이 조합은 native state와 React hydration이 같은 DOM을 공유합니다. 사용자가 hydration 전에 summary를 열면 server markup의 closed 상태, browser의 open state, React 첫 render 사이에 경쟁이 생길 수 있습니다. 이 risk는 아직 이 commit에서 다루지 않습니다.

### 3. `09cec616f314` — test(ui): 디자인 선택과 프로젝트 링크 계약 검증

- Importance: **A**
- Tags: `VALIDATION, TEST`
- Fixed role: Lock down the interaction contracts of the design selector and project-link components.

#### Historical inspection tasks

- `src/components/portfolio/design-switcher.test.tsx`에서 native `open` attribute를 직접 설정한 뒤 close button과 design link click을 검증하는 방법을 확인합니다.
- close button이 open 제거와 summary focus를 모두 보장하고, link click은 preventDefault 상황에서도 open을 제거하는지 assertion을 적습니다.
- 같은 commit의 `project-links.test.tsx`가 내부 case-study URL에 `view`와 `debug`를 전파하는 mixed-scope evidence임을 구분합니다.
- 이 테스트가 hydration 전 browser mutation은 재현하지 않는다는 비보장을 적습니다.

#### Reconstruction result

**design-switcher test**

`src/components/portfolio/design-switcher.test.tsx`는 component를 render한 뒤 DOM의 native state를 직접 조작합니다.

- details에 `open`을 설정하고 explicit close button을 click합니다.
- `open` attribute가 제거되는지 확인합니다.
- `document.activeElement`가 summary인지 확인해 focus restoration을 검증합니다.
- design link click에는 navigation을 막는 handler를 둔 상태에서도 disclosure가 닫히는지 확인합니다.
- content-owned trigger copy와 hidden navigation semantics도 query합니다.

이 검증은 interaction regression입니다. production path는 `DesignSwitcher`의 close handler와 link `onClick`입니다. focus를 단순 class나 snapshot이 아니라 실제 active element로 확인한다는 점이 중요합니다.

**mixed-scope evidence**

같은 commit의 `src/components/portfolio/project-links.test.tsx`는 internal case-study link가 `/projects/sample-project?view=classic&debug=content`를 얻고 external link가 `_blank`/`noreferrer`를 갖는지 검증합니다. 이 Thread에서는 switcher와 “route state를 실제 link consumer까지 전달한다”는 integration 근거만 사용합니다. project-link placement 전체는 별도 component story입니다.

**비보장**

테스트는 이미 hydrated component에서 open attribute를 바꿉니다. server string을 만든 뒤 hydration 전에 browser가 open 상태를 변경하는 경쟁 조건은 재현하지 않습니다. 실제 browser history나 page transition도 실행하지 않습니다. 이 환경에서는 source만 inspection했고 test command는 실행하지 않았습니다.

### 4. `c702b870d57a` — fix(ui): hydration 중 native details 상태 보존

- Importance: **A**
- Tags: `DEBUG`
- Fixed role: Mark the native design-switcher `details` element as an intentional hydration boundary.

#### Historical inspection tasks

- 이전 가정(서버와 첫 client render의 `<details>` 상태가 같음)과 browser가 hydration 전에 native disclosure를 열 수 있는 실제 경쟁 조건을 분리합니다.
- `src/components/portfolio/design-switcher.tsx`에서 `suppressHydrationWarning`이 정확히 어느 node에 추가되는지 확인합니다.
- 이 변경이 warning 정책을 수정하는 것과 open 상태 보존을 코드로 강제하는 것은 다르다는 점을 적습니다.
- 후속 deterministic test가 필요했던 이유를 연결합니다.

#### Reconstruction result

**이전 가정**

server는 closed `<details>` markup을 보내고, 첫 client render도 closed일 것이라는 암묵적 가정이 있었습니다. 그러나 native `<summary>`는 JavaScript hydration이 끝나기 전에도 사용자가 조작할 수 있습니다. 그 사이 browser가 `open`을 추가하면 React가 hydrate할 DOM과 server expectation이 달라집니다.

**실제 risk**

- React hydration mismatch warning
- React reconciliation이 browser가 이미 만든 legitimate native state를 다르게 취급할 가능성
- 개발 환경에서 noisy error가 실제 defect와 섞임

**수정**

`src/components/portfolio/design-switcher.tsx`의 native `<details>` node에 `suppressHydrationWarning`을 추가합니다. correction의 의미는 “이 node의 pre-hydration native state 차이는 의도된 경계”라고 React에 알리는 것입니다.

**정확한 보장 범위**

이 prop은 mismatch warning 정책을 바꿉니다. open 상태를 별도 React state로 복사하거나 강제로 재설정하는 코드는 추가하지 않습니다. 따라서 “open이 실제로 보존된다”는 동작 증거는 이 fix diff만으로 완성되지 않습니다. 후속 `b6c0238ab8b8`이 race를 deterministic하게 재현해 그 invariant를 확인합니다.

이 commit은 새 기능이 아니라 browser-native state를 합법적인 hydration 입력으로 인정하도록 초기 assumption을 수정한 root-cause fix입니다.

### 5. `b6c0238ab8b8` — test(ui): details hydration 경쟁 조건 검증

- Importance: **A**
- Tags: `VALIDATION, TEST`
- Fixed role: Reproduce the design-switcher hydration race directly and lock down the intended invariant.

#### Historical inspection tasks

- `renderToString` → container `innerHTML` → hydration 전 `details.open = true` → `hydrateRoot` 순서를 정확히 재구성합니다.
- `console.error` spy가 hydration mismatch 메시지를 수집하는 방법과 cleanup에서 root unmount, spy restore, container remove를 수행하는지 확인합니다.
- assertion이 open state 보존과 hydration error 부재를 각각 어떻게 검증하는지 적습니다.
- 실제 browser navigation이나 모든 React version을 증명하지 않는 deterministic component regression의 경계를 적습니다.

#### Reconstruction result

**주입 방식**

테스트는 별도 mocking framework로 React internals를 조작하지 않습니다. 실제 server rendering과 hydration API를 순서대로 사용해 경쟁 조건을 만듭니다.

1. `renderToString(<DesignSwitcher ... />)`로 server HTML을 생성합니다.
2. 임시 container의 `innerHTML`에 server markup을 넣습니다.
3. hydration 전에 실제 `<details>`를 찾아 `details.open = true`로 browser-side mutation을 주입합니다.
4. `hydrateRoot(container, <DesignSwitcher ... />)`를 호출합니다.
5. hydration이 끝난 뒤 details가 계속 open인지 확인합니다.
6. `console.error` spy에서 hydration mismatch error가 기록되지 않았는지 확인합니다.

**관찰과 cleanup**

테스트는 open boolean과 console error라는 두 상태를 봅니다. `finally` 경로에서 hydrated root를 unmount하고 spy를 restore하며 임시 container를 제거합니다. 따라서 후속 테스트에 React root, patched console, detached DOM을 남기지 않습니다.

**분류**

이것은 deterministic hydration-race regression입니다. production component와 React server/client API를 사용하되 full browser page를 띄우지는 않습니다.

**증명**

- hydration 전에 native details를 연 상태가 hydration 뒤에도 유지됩니다.
- 이 fixture에서 hydration mismatch error가 발생하지 않습니다.

**비증명**

- 모든 browser/React version의 timing
- 실제 pointer/keyboard event가 hydration보다 먼저 발생하는 e2e 상황
- route navigation 후 disclosure teardown
- 성능 또는 client bundle cost

이 환경에서는 해당 command를 실행하지 않았으므로 위 내용은 exact test mechanism과 assertion inspection 결과입니다.

### 6. `a37cb8596733` — refactor(ui): 디자인 선택기를 server markup으로 전환

- Importance: **A**
- Tags: `ARCH, REFACTOR`
- Fixed role: Convert the design selector itself from a client component to server-rendered markup and isolate the only imperative behavior in a small `DesignSwitcherClose` client component.

#### Historical inspection tasks

- `DesignSwitcher`에서 `"use client"`, `useRef`, ref props가 제거되고 새 `design-switcher-close.tsx`만 client boundary로 남는지 확인합니다.
- `DesignSwitcherClose`가 event target에서 `closest("details")`와 `:scope > summary`를 찾아 open 제거와 focus 복원을 수행하는지 추적합니다.
- design link의 `onClick` close가 제거되고 URL navigation에 전환 종료를 맡기는 ownership 변화를 적습니다.
- `suppressHydrationWarning`이 남는지 확인하고, static markup server ownership과 작은 imperative island의 경계를 설명합니다.
- 기존 interaction test가 어떤 assertion을 버리고 어떤 href/focus assertion을 유지했는지 비교합니다.

#### Reconstruction result

**문제 재정의**

`suppressHydrationWarning`과 regression test로 race를 다룰 수 있었지만, selector의 대부분은 static link markup입니다. 전체 component를 client boundary로 유지하면 native disclosure를 쓰면서도 모든 목록 markup과 refs를 hydrate해야 합니다. root cause를 더 좁히면 client JavaScript가 필요한 동작은 explicit close 후 focus restoration뿐입니다.

**구조 변경**

- `DesignSwitcher`에서 top-level `"use client"`, `useRef`, ref attachment를 제거합니다.
- design list, summary, details, links는 server-rendered markup이 됩니다.
- 새 `src/components/portfolio/design-switcher-close.tsx`만 client component입니다.
- close button은 click event의 current target에서 `closest("details")`를 찾고, direct summary를 `:scope > summary`로 찾습니다.
- details의 `open`을 제거한 뒤 summary가 있으면 focus합니다.
- design link의 `onClick` close handler는 제거됩니다. 실제 navigation이 disclosure의 현재 page lifetime을 끝냅니다.
- native state 차이를 허용하는 `suppressHydrationWarning`은 details에 남습니다.

**ownership 이동**

| 이전 | 이후 |
| --- | --- |
| 전체 selector markup과 refs가 client | static selector markup은 server |
| DOM refs가 component lifetime에 고정 | close button이 click 시 local DOM ancestry를 찾음 |
| link click도 imperative close | navigation에 page transition 책임 |
| explicit close/focus와 static list가 같은 boundary | explicit close만 작은 client island |

기존 test도 구조에 맞게 바뀝니다. link click close assertion은 제거되고, href 생성과 explicit close/focus 계약은 유지됩니다.

이 refactor는 behavior를 확장하기보다 hydration 대상과 client ownership을 최소화합니다. `DesignSwitcherClose`가 없는 pure server component로 만들 수 없는 이유는 explicit close button이 현재 DOM을 닫고 summary에 focus를 돌리는 imperative behavior 때문입니다.

### 7. `1ac7813155c6` — test(ui): server 선택기와 focus 복원 검증

- Importance: **A**
- Tags: `VALIDATION, A11Y, TEST`
- Fixed role: Add a structural regression check that reads the design-switcher source and rejects either a top-level `"use client"` directive or `useRef` state in the selector component.

#### Historical inspection tasks

- `readFile`과 `path.join(process.cwd(), ...)`으로 production source를 읽는 structural test를 확인합니다.
- `"use client"`와 `useRef` 문자열 부재 assertion이 어떤 architecture regression을 막는지 적습니다.
- 기존 hydration test와 explicit close focus test가 계속 남아 있는지 확인합니다.
- source-string test가 bundle 크기, RSC payload, arbitrary client import까지 증명하지 않는 한계를 구분합니다.

#### Reconstruction result

**새 regression contract**

test는 runtime render 결과만 보지 않고 production source를 직접 읽습니다. `process.cwd()`에서 `src/components/portfolio/design-switcher.tsx` 경로를 만들고 `readFile`로 문자열을 가져온 뒤 다음을 거부합니다.

- top-level/client directive 문자열 `"use client"`
- `useRef`

이 structural assertion은 “selector 본체가 다시 hydrated client component가 되지 않는다”는 architecture invariant를 보호합니다. explicit close/focus test와 hydration race test도 남아 있어 동작과 boundary를 서로 다른 방식으로 검증합니다.

**접근성 관계**

`DesignSwitcherClose`가 details를 닫은 뒤 summary focus를 복원하는 assertion은 keyboard user의 위치를 잃지 않는 계약을 계속 보호합니다. source boundary test만 통과하고 focus test가 깨질 수 있으므로 두 검증은 대체 관계가 아닙니다.

**한계**

문자열 부재 검사는 source-level guard입니다. 다른 client-only import를 간접적으로 추가하는 모든 경우, 실제 emitted bundle 크기, RSC payload, framework compiler 결과를 증명하지 않습니다. 또한 source formatting에 의존하는 측면이 있습니다. 그럼에도 “이 파일에 client directive/ref state를 되돌리는 단순 회귀”에는 매우 직접적입니다.

실행 결과는 기록하지 않았습니다. exact test source와 assertions를 inspection했습니다.

## 6. Invariant evolution

Record where each invariant was introduced, extended, shown insufficient, corrected, and verified.

| 상태 | SHA | invariant 변화 |
| --- | --- | --- |
| 도입 | `e43e8addd7f3` | native disclosure를 client wrapper로 시작 |
| 확장 | `c69ef85c98b2` | 선택 목록, active semantics, explicit close/focus |
| interaction 검증 | `09cec616f314` | close와 focus, link-driven close를 component test로 고정 |
| 부족 확인/수정 | `c702b870d57a` | pre-hydration native state 차이를 legitimate boundary로 인정 |
| 결정적 재현 | `b6c0238ab8b8` | server→browser mutation→hydrate race를 직접 주입 |
| ownership 축소 | `a37cb8596733` | static markup server, close action만 client |
| 구조 보호 | `1ac7813155c6` | selector 본체의 client/ref 회귀를 source test로 차단 |

최종 invariant는 “browser가 native disclosure state를 소유하고, server가 static selector markup을 소유하며, explicit close/focus만 최소 client island가 소유한다”입니다.

## 7. Failure → Fix → Test relationships

Connect fixes and tests to the exact earlier assumption or implementation they correct or verify.

- **Implementation → Test:** `c69ef...`의 explicit close/focus와 link close를 `09cec...`이 검증합니다.
- **Assumption → Failure risk:** closed server markup과 첫 client render가 같다는 가정이 hydration 전 native click으로 깨질 수 있습니다.
- **Fix → Deterministic test:** `c702...`가 details를 intentional hydration boundary로 표시하고 `b6c...`가 open mutation을 실제 hydration 전에 주입합니다.
- **Fix의 추가 축소:** warning suppression에 머물지 않고 `a37...`이 selector 대부분을 server로 옮겨 hydrated surface 자체를 줄입니다.
- **Architecture regression protection:** `1ac...`이 top-level client directive와 `useRef` 재도입을 막습니다.

## 8. Ownership, state, and responsibility changes

Track caller/callee ownership, browser/framework state, resource lifetime, and boundaries that deliberately remain outside the Thread.

| 자원/상태 | 초기 ownership | 최종 ownership |
| --- | --- | --- |
| details open state | native DOM + hydrated wrapper가 함께 접근 | native DOM/browser |
| static trigger/list/link markup | client component | server component |
| explicit close | client component refs | `DesignSwitcherClose` client island |
| close 후 focus | summary ref | click 시 DOM ancestry에서 찾은 summary |
| design URL | `getTemplateHref` | server-rendered link helper 결과 |
| hydration mismatch policy | 없음 | details의 intentional warning suppression |

## 9. Final Thread state

- design selector 본체는 server-rendered native disclosure입니다.
- active design과 state-preserving href는 server markup에 포함됩니다.
- browser가 hydration 전에 disclosure를 열어도 그 native state를 legitimate하게 취급합니다.
- explicit close button만 client code를 사용하며 summary focus를 복원합니다.
- interaction, hydration race, source boundary가 서로 다른 test technique으로 보호됩니다.
- 실제 test command는 실행하지 않았습니다.

## 10. Final architecture or execution flow

1. server가 registry/content에서 active design과 link 목록을 계산해 `<details>` markup을 보냅니다.
2. browser가 native summary interaction으로 open state를 관리합니다.
3. hydration 전에 open state가 바뀌어도 details boundary는 그 차이를 허용합니다.
4. design link 선택은 server-generated current-route URL로 navigation합니다.
5. 사용자가 explicit close를 누르면 작은 client component가 nearest details를 닫고 direct summary에 focus를 돌립니다.

## 11. Learning-completion checks

- [x] 초기 client implementation과 final server-first structure를 구분했습니다.
- [x] hydration fix를 이전 assumption/risk와 연결했습니다.
- [x] deterministic race 주입 순서와 cleanup을 설명했습니다.
- [x] interaction, hydration, structural test의 증명 범위를 각각 적었습니다.
- [x] 실행하지 않은 test를 통과했다고 기록하지 않았습니다.
