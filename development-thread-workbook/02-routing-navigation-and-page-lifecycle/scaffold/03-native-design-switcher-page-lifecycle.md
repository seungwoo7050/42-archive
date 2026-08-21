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

> **학습자 작성란:** [[LEARNER:commit:e43e8addd7f3]]

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

> **학습자 작성란:** [[LEARNER:commit:c69ef85c98b2]]

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

> **학습자 작성란:** [[LEARNER:commit:09cec616f314]]

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

> **학습자 작성란:** [[LEARNER:commit:c702b870d57a]]

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

> **학습자 작성란:** [[LEARNER:commit:b6c0238ab8b8]]

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

> **학습자 작성란:** [[LEARNER:commit:a37cb8596733]]

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

> **학습자 작성란:** [[LEARNER:commit:1ac7813155c6]]

## 6. Invariant evolution

Record where each invariant was introduced, extended, shown insufficient, corrected, and verified.

> **학습자 작성란:** [[LEARNER:thread:3:invariants]]

## 7. Failure → Fix → Test relationships

Connect fixes and tests to the exact earlier assumption or implementation they correct or verify.

> **학습자 작성란:** [[LEARNER:thread:3:relations]]

## 8. Ownership, state, and responsibility changes

Track caller/callee ownership, browser/framework state, resource lifetime, and boundaries that deliberately remain outside the Thread.

> **학습자 작성란:** [[LEARNER:thread:3:ownership]]

## 9. Final Thread state

> **학습자 작성란:** [[LEARNER:thread:3:final]]

## 10. Final architecture or execution flow

> **학습자 작성란:** [[LEARNER:thread:3:flow]]

## 11. Learning-completion checks

> **학습자 작성란:** [[LEARNER:thread:3:checks]]
