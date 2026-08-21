# Thread: Component interaction and hydration regression

> Project: 42 Archive Portfolio (`web/portfolio`)
>
> Category: `07-testing-performance-and-regression-strategy`
>
> Phase 1에서 감사·수정한 뒤 동결한 scaffold를 기준으로 합니다.

## 0. 분류 출처와 변경 가능 범위

- Commit SHA, subject, importance와 tags는 branch-local `commit/commit-importance.md` 분류와 exact commit metadata를 기준으로 고정했습니다.
- 이 문서의 Thread goal, commit grouping과 source-defined 역할은 Phase 1 category audit 결과입니다.
- Phase 2에서는 SHA, 순서, subject, importance, tags, 역할, 질문과 문서 구조를 바꾸지 않습니다.
- 다른 branch 또는 final HEAD의 구현을 earlier SHA 설명에 소급하지 않습니다.
- Runtime evidence는 실제로 실행한 command만 기록하며, 미실행 상태를 통과로 해석하지 않습니다.

## 1. Thread 목표

Native `<details>` design switcher의 초기 client ownership부터 close/focus interaction, pre-hydration race, deterministic regression test와 server/client boundary 축소까지 복원합니다.

### 동결된 핵심 invariant

- Hydration 전 `details.open`은 native browser state이며 React가 초기 server expectation으로 덮어쓰지 않습니다.
- Explicit close는 `open`을 제거하고 trigger summary로 focus를 복원합니다.
- Static selector markup/content/href는 server component가 소유하고 client code는 explicit close action으로 제한됩니다.
- Behavior tests와 source-boundary test가 각각 interaction 결과와 ownership architecture를 보호합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 초기 selector가 왜 전체 client component와 두 DOM ref를 가졌고 어떤 기능이 아직 없었는가?
- Close button과 design link는 native open state와 focus를 어떻게 바꿨는가?
- Server paint 뒤 hydration 전 사용자가 disclosure를 열면 어떤 mismatch가 생기며 어떻게 재현했는가?
- Server markup 전환은 refs/link handlers를 어디서 제거하고 어떤 client island만 남겼는가?

## 3. 완료 기준

- 각 referenced SHA의 exact parent diff와 resulting changed files를 확인합니다.
- Commit별 previous state, implementation decision, ownership/lifetime, failure path와 non-guarantee를 구분합니다.
- Fix는 earlier assumption과 root cause에 연결하고, test는 production path·technique·proves/does-not-prove를 구분합니다.
- A-level은 subsystem·failure·verification 관계까지, B-level은 local role과 후속 연결까지만 설명합니다.
- Thread-level invariant evolution, Failure → Fix → Test, ownership transfer와 final flow를 코드 없이 설명합니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | 이 Thread에서 확인할 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `e43e8addd7f3` | feat(designs): 디자인 선택기 상태와 trigger 추가 | B | RENDERER | Client selector skeleton, native trigger와 DOM refs |
| 2 | `c69ef85c98b2` | feat(designs): 디자인 선택 목록과 닫기 동작 추가 | A | ARCH, RENDERER | Design list, route links, close와 focus restoration 구현 |
| 3 | `09cec616f314` | test(ui): 디자인 선택과 프로젝트 링크 계약 검증 | A | VALIDATION, TEST | Component interaction와 project-link policy regression tests |
| 4 | `c702b870d57a` | fix(ui): hydration 중 native details 상태 보존 | A | DEBUG | Pre-hydration native `open` mismatch 허용 fix |
| 5 | `b6c0238ab8b8` | test(ui): details hydration 경쟁 조건 검증 | A | VALIDATION, TEST | SSR→native mutation→hydrate deterministic race test |
| 6 | `a37cb8596733` | refactor(ui): 디자인 선택기를 server markup으로 전환 | A | ARCH, REFACTOR | Static markup server ownership과 close-only client island |
| 7 | `1ac7813155c6` | test(ui): server 선택기와 focus 복원 검증 | A | VALIDATION, A11Y, TEST | Server component source boundary와 focus behavior 최종 regression |

## 5. Commit별 학습 기록

각 section은 해당 SHA의 tree와 parent diff만 기준으로 작성합니다. 같은 SHA가 다른 category Thread에 등장하더라도 여기서는 위 역할과 파일 범위만 설명합니다.

### 1. `e43e8addd7f3` — feat(designs): 디자인 선택기 상태와 trigger 추가

- **Full SHA:** `e43e8addd7f39e003f52d26e2cbda902f7dd0471`
- **Importance:** B
- **Tags:** RENDERER
- **이 Thread에서의 역할:** Client selector skeleton, native trigger와 DOM refs

#### 해당 SHA에서 확인할 실제 코드

- `src/components/portfolio/design-switcher.tsx`의 새 `DesignSwitcher` client component
- `detailsRef`·`summaryRef`, `SITE_DESIGNS`, `templateCopy`, `activeIndex`·`active` fallback
- `designSwitcherAriaTemplate`와 `designSwitcherCountTemplate`로 만드는 접근성 label/count
- resulting JSX가 이 SHA에서는 `<details>`와 `<summary>`까지만 포함하고 선택 목록·닫기 동작은 아직 없다는 점

#### Commit-specific investigation

- `e43e8addd7f3^`와 `e43e8addd7f3`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 이 B-level commit은 `Client selector skeleton, native trigger와 DOM refs`의 local 기반만 설명하고, 후속 commit이 완성하는 기능을 이 시점에 소급하지 않습니다.
- DOM/data owner와 아직 존재하지 않는 behavior를 구분하고 다음 후속 관계만 확인합니다: `c69ef85c98b2`가 이 skeleton에 selection list와 닫기 동작을 연결합니다.

#### 학습자 증거

| 확인·기록 항목 | 기록 |
| --- | --- |
| 직전 state와 부족함 | 직전 상태에는 selectable design registry와 URL helper가 있었지만, 공용 UI에서 현재 디자인을 표시하고 native disclosure를 여는 전용 component가 없었습니다. |
| 실제 변경 file/symbol/call path | `"use client"` component를 새로 만들고 `HTMLDetailsElement`와 summary를 위한 두 ref, 현재 design lookup, content-owned label/count 계산, native `<details>/<summary>` trigger를 추가했습니다. 이 SHA에서는 import된 `Link`와 URL helper가 아직 selection list로 이어지지 않습니다. |
| Data/state/DOM/resource owner와 lifetime | 브라우저가 `open` 상태를 소유하는 native `<details>`가 disclosure state의 owner이고 React component는 두 DOM ref를 보유합니다. Active design의 fallback은 `SITE_DESIGNS[activeIndex] ?? SITE_DESIGNS[0]`가 결정합니다. |
| Failure·absence·fallback·cleanup | Unknown `activeId`는 첫 registry item으로 fallback하지만, 빈 registry는 방어하지 않습니다. 선택 목록이나 explicit close path가 아직 없고 hydration mismatch도 처리하지 않습니다. |
| 보장/비보장과 후속 연결 | 현재 design의 label/count를 content template에서 만들고 keyboard-operable native summary를 렌더링하는 최소 trigger가 생깁니다. 실제 design 전환, active link semantics, close/focus 복원, outside interaction, hydration race와 browser-level 접근성은 보장하지 않습니다. `c69ef85c98b2`가 이 skeleton에 selection list와 닫기 동작을 연결합니다. |

#### 최소 code evidence

- **Commit:** `e43e8addd7f39e003f52d26e2cbda902f7dd0471`
- **Path:** `src/components/portfolio/design-switcher.tsx`
- **Location:** DesignSwitcher 반환부

```tsx
<details className={styles.root} ref={detailsRef}>
  <summary
    aria-label={ui.designSwitcherAriaTemplate.replace(
      "{label}",
      activeLabel,
    )}
    ref={summaryRef}
  >
```

이 excerpt는 위 state/ownership/contract를 식별하는 데 필요한 부분만 남긴 것입니다.

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command | 미실행 |
| 실제 결과 | 실행 환경에서 `github.com` DNS 해석이 실패하여 repository를 local clone하지 못했습니다. 따라서 이 문서의 역사 증거는 GitHub의 exact commit API에서 확인한 parent diff, changed file, 해당 SHA의 file content와 branch-local classification에 한정합니다. Vitest·Playwright·Axe·screenshot·performance command는 실행하지 않았고, 통과했다고 기록하지 않습니다. |
| 정적 검토 범위 | Exact commit diff, changed files, 위에 열거한 symbol/test/config |

### 2. `c69ef85c98b2` — feat(designs): 디자인 선택 목록과 닫기 동작 추가

- **Full SHA:** `c69ef85c98b2659d5f014505964e3103e435fbb8`
- **Importance:** A
- **Tags:** ARCH, RENDERER
- **이 Thread에서의 역할:** Design list, route links, close와 focus restoration 구현

#### 해당 SHA에서 확인할 실제 코드

- `DesignSwitcher`의 새 `<nav>`, sheet header, close `<button>`, design `<ul>`
- close button의 `detailsRef.current?.removeAttribute("open")`와 `summaryRef.current?.focus()`
- `SITE_DESIGNS.map`의 `aria-current`, palette swatch, content label/description, ordinal
- `getTemplateHref(currentPath, design.id, { contentDebug })`와 link `onClick` close path

#### Commit-specific investigation

- `c69ef85c98b2^`와 `c69ef85c98b2`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `Design list, route links, close와 focus restoration 구현`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
- Production path와 test path를 분리하고, state/data/resource owner와 lifetime·cleanup을 실제 symbol 기준으로 추적합니다.
- Failure/absence/fallback branch와 test technique을 구분하고, 이 SHA가 보장하지 않는 범위를 명시합니다.
- 다음 후속 관계를 대조하되 later code를 이 SHA의 구현으로 설명하지 않습니다: `09cec616f314`가 jsdom interaction contract를 추가하고, `c702b870d57a`가 native state와 hydration 사이의 mismatch를 수정합니다.

#### 학습자 증거

| 확인·기록 항목 | 기록 |
| --- | --- |
| 직전 state와 부족함 | 초기 trigger는 disclosure를 열 수는 있었지만 선택 가능한 design link, 현재 항목 semantics, explicit close와 focus 복원이 없었습니다. |
| 실제 변경 file/symbol/call path | 모든 registered design을 source order로 렌더링하는 navigation panel을 추가했습니다. Close button은 native `open` attribute를 제거하고 summary로 focus를 되돌리며, design link click도 이동 전에 disclosure를 닫습니다. URL은 current path와 debug state를 보존합니다. |
| Data/state/DOM/resource owner와 lifetime | Registry가 design 순서와 palette를 소유하고 presentation content가 label/description을 소유합니다. Component의 refs가 DOM mutation과 focus restoration을 직접 수행하며, Next `Link`가 route transition을 수행합니다. |
| Failure·absence·fallback·cleanup | Unknown active design은 앞 commit과 동일하게 첫 item으로 fallback합니다. Close button은 ref가 없으면 optional chaining으로 no-op합니다. Link click close는 navigation이 실제로 완료되는지와 독립이며, hydration 전 사용자 토글은 아직 고려하지 않습니다. |
| Test technique와 실행 증거 | 상호작용 구현 commit입니다. 이 SHA에는 자동화 test가 없으므로 close/focus와 URL behavior는 code inspection으로만 확인했습니다. |
| 보장하는 것 | 한 component 안에서 disclosure, 현재 design 표시, route-preserving design links, explicit close와 focus restoration이 연결됩니다. |
| 보장하지 않는 것 | Hydration race, real browser focus order, touch target/viewport layout, failed navigation 후 open state, JavaScript 비활성 상태의 전체 경험은 증명하지 않습니다. |
| 다음 commit/관련 test 연결 | `09cec616f314`가 jsdom interaction contract를 추가하고, `c702b870d57a`가 native state와 hydration 사이의 mismatch를 수정합니다. |

#### 최소 code evidence

- **Commit:** `c69ef85c98b2659d5f014505964e3103e435fbb8`
- **Path:** `src/components/portfolio/design-switcher.tsx`
- **Location:** explicit close button handler

```tsx
onClick={() => {
  detailsRef.current?.removeAttribute("open");
  summaryRef.current?.focus();
}}
```

이 excerpt는 위 state/ownership/contract를 식별하는 데 필요한 부분만 남긴 것입니다.

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command | 미실행 |
| 실제 결과 | 실행 환경에서 `github.com` DNS 해석이 실패하여 repository를 local clone하지 못했습니다. 따라서 이 문서의 역사 증거는 GitHub의 exact commit API에서 확인한 parent diff, changed file, 해당 SHA의 file content와 branch-local classification에 한정합니다. Vitest·Playwright·Axe·screenshot·performance command는 실행하지 않았고, 통과했다고 기록하지 않습니다. |
| 정적 검토 범위 | Exact commit diff, changed files, 위에 열거한 symbol/test/config |

### 3. `09cec616f314` — test(ui): 디자인 선택과 프로젝트 링크 계약 검증

- **Full SHA:** `09cec616f3147524e078c59b608ba899c4c368d7`
- **Importance:** A
- **Tags:** VALIDATION, TEST
- **이 Thread에서의 역할:** Component interaction와 project-link policy regression tests

#### 해당 SHA에서 확인할 실제 코드

- `src/components/portfolio/design-switcher.test.tsx`의 `DesignSwitcher` suite
- `screen.getByLabelText`, hidden navigation query, `within`, `fireEvent`, 직접 설정한 `details[open]`
- close button 후 `open` 제거·summary focus, prevented navigation 상태에서 design link click 후 close
- `src/components/portfolio/project-links.test.tsx`의 source order, template/debug query, external target/rel, placement/offline/case-study filtering, empty wrapper cases

#### Commit-specific investigation

- `09cec616f314^`와 `09cec616f314`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `Component interaction와 project-link policy regression tests`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
- Production path와 test path를 분리하고, state/data/resource owner와 lifetime·cleanup을 실제 symbol 기준으로 추적합니다.
- Failure/absence/fallback branch와 test technique을 구분하고, 이 SHA가 보장하지 않는 범위를 명시합니다.
- 다음 후속 관계를 대조하되 later code를 이 SHA의 구현으로 설명하지 않습니다: `c702b870d57a`의 hydration fix 이전 기준선이며, `b6c0238ab8b8`가 이 suite에 실제 SSR→hydrate race를 추가합니다.

#### 학습자 증거

| 확인·기록 항목 | 기록 |
| --- | --- |
| 직전 state와 부족함 | Interaction code는 존재했지만 ref 기반 close/focus와 link selection policy가 refactor 중 깨져도 이를 즉시 감지할 test가 없었습니다. |
| 실제 변경 file/symbol/call path | Testing Library로 production components를 직접 render합니다. Switcher test는 content-provided copy와 count, explicit close, focus restoration, link click close를 검사합니다. Project-link tests는 synthetic project fixture로 source order, internal/external transport, deployment/placement filtering과 zero-result omission을 검사합니다. |
| Data/state/DOM/resource owner와 lifetime | Test가 DOM fixture와 synthetic project object를 소유합니다. 상태 전이는 native `open` attribute를 test가 준비하고 production handler가 제거합니다. Production selectors/components가 filtering과 href construction을 계속 소유합니다. |
| Failure·absence·fallback·cleanup | Navigation 자체는 capture listener로 `preventDefault`하여 jsdom을 떠나지 않고 close만 관찰합니다. 따라서 route transition 성공/실패는 검사하지 않습니다. Empty result는 wrapper 자체가 없어야 한다는 explicit policy로 고정됩니다. |
| Test technique와 실행 증거 | Deterministic component regression testing입니다. Real browser hydration이나 layout이 아니라 jsdom DOM state와 accessible queries를 사용합니다. Exact tests를 확인했지만 command는 실행하지 않았습니다. |
| 보장하는 것 | 디자인 copy/count, active navigation access, explicit close/focus, selection close와 project-link rendering/filtering의 현재 contract를 재현 가능한 test로 표현합니다. |
| 보장하지 않는 것 | Pre-hydration native interaction, browser navigation, CSS visibility, pointer/touch behavior, screen-reader output과 network policy는 증명하지 않습니다. |
| 다음 commit/관련 test 연결 | `c702b870d57a`의 hydration fix 이전 기준선이며, `b6c0238ab8b8`가 이 suite에 실제 SSR→hydrate race를 추가합니다. |

#### 최소 code evidence

- **Commit:** `09cec616f3147524e078c59b608ba899c4c368d7`
- **Path:** `src/components/portfolio/design-switcher.test.tsx`
- **Location:** `renders selector copy from content and clears native open state`

```tsx
details?.setAttribute("open", "");
fireEvent.click(closeButton);
expect(details).not.toHaveAttribute("open");
expect(summary).toHaveFocus();
```

이 excerpt는 위 state/ownership/contract를 식별하는 데 필요한 부분만 남긴 것입니다.

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command | 미실행 |
| 실제 결과 | 실행 환경에서 `github.com` DNS 해석이 실패하여 repository를 local clone하지 못했습니다. 따라서 이 문서의 역사 증거는 GitHub의 exact commit API에서 확인한 parent diff, changed file, 해당 SHA의 file content와 branch-local classification에 한정합니다. Vitest·Playwright·Axe·screenshot·performance command는 실행하지 않았고, 통과했다고 기록하지 않습니다. |
| 정적 검토 범위 | Exact commit diff, changed files, 위에 열거한 symbol/test/config |

### 4. `c702b870d57a` — fix(ui): hydration 중 native details 상태 보존

- **Full SHA:** `c702b870d57ab7932218a77e40a5d92302a58e79`
- **Importance:** A
- **Tags:** DEBUG
- **이 Thread에서의 역할:** Pre-hydration native `open` mismatch 허용 fix

#### 해당 SHA에서 확인할 실제 코드

- parent `44e4d062da50...`와 이 SHA 사이의 단일-line diff
- `src/components/portfolio/design-switcher.tsx`의 root `<details>`
- `suppressHydrationWarning`이 추가된 정확한 위치와 여전히 남아 있는 client directive/ref ownership
- 후속 `b6c0238ab8b8` test가 재현하는 SSR markup → native `open` mutation → hydration 순서

#### Commit-specific investigation

- `c702b870d57a^`와 `c702b870d57a`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `Pre-hydration native `open` mismatch 허용 fix`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
- Production path와 test path를 분리하고, state/data/resource owner와 lifetime·cleanup을 실제 symbol 기준으로 추적합니다.
- Failure/absence/fallback branch와 test technique을 구분하고, 이 SHA가 보장하지 않는 범위를 명시합니다.
- 다음 후속 관계를 대조하되 later code를 이 SHA의 구현으로 설명하지 않습니다: `b6c0238ab8b8`가 이 exact race를 SSR/hydrate API로 재현하고, `a37cb8596733`가 더 근본적으로 server markup과 client action을 분리합니다.

#### 학습자 증거

| 확인·기록 항목 | 기록 |
| --- | --- |
| 직전 state와 부족함 | Server-rendered `<details>`에는 `open`이 없더라도 hydration 전에 사용자가 summary를 열 수 있습니다. 그 시점의 DOM은 server/React 기대치와 달라지며, 기존 component는 이 native state 변화를 intentional boundary로 선언하지 않았습니다. |
| 실제 변경 file/symbol/call path | Root `<details>`에 `suppressHydrationWarning`을 한 개 추가했습니다. 다른 state logic, refs, close handlers 또는 renderer structure는 바꾸지 않았습니다. |
| Data/state/DOM/resource owner와 lifetime | Hydration 전 `open` attribute는 browser/native control이 소유한다는 판단을 root boundary에 기록합니다. React는 나머지 component를 hydrate하지만 이 root attribute mismatch warning을 억제합니다. |
| Failure·absence·fallback·cleanup | 이 fix는 root의 hydration mismatch를 의도적으로 허용합니다. Descendant mismatch, 잘못된 server markup 또는 다른 hydration error를 일반적으로 숨기는 정책은 추가하지 않습니다. 이 commit 자체에는 test가 없습니다. |
| Test technique와 실행 증거 | Targeted integration fix입니다. 실제 보존 여부는 code 한 줄만으로 runtime evidence라고 할 수 없고, 후속 deterministic hydration test가 그 intended invariant를 확인합니다. |
| 보장하는 것 | Native disclosure가 hydration 전에 바뀔 수 있다는 상태 소유권을 인정하고 해당 root mismatch를 허용합니다. |
| 보장하지 않는 것 | Client component 비용을 제거하지 않고, 모든 hydration mismatch를 해결하지 않으며, user-visible flicker나 browser matrix를 측정하지 않습니다. |
| 다음 commit/관련 test 연결 | `b6c0238ab8b8`가 이 exact race를 SSR/hydrate API로 재현하고, `a37cb8596733`가 더 근본적으로 server markup과 client action을 분리합니다. |

#### 최소 code evidence

- **Commit:** `c702b870d57ab7932218a77e40a5d92302a58e79`
- **Path:** `src/components/portfolio/design-switcher.tsx`
- **Location:** DesignSwitcher root

```tsx
<details
  className={styles.root}
  ref={detailsRef}
  suppressHydrationWarning
>
```

이 excerpt는 위 state/ownership/contract를 식별하는 데 필요한 부분만 남긴 것입니다.

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command | 미실행 |
| 실제 결과 | 실행 환경에서 `github.com` DNS 해석이 실패하여 repository를 local clone하지 못했습니다. 따라서 이 문서의 역사 증거는 GitHub의 exact commit API에서 확인한 parent diff, changed file, 해당 SHA의 file content와 branch-local classification에 한정합니다. Vitest·Playwright·Axe·screenshot·performance command는 실행하지 않았고, 통과했다고 기록하지 않습니다. |
| 정적 검토 범위 | Exact commit diff, changed files, 위에 열거한 symbol/test/config |

### 5. `b6c0238ab8b8` — test(ui): details hydration 경쟁 조건 검증

- **Full SHA:** `b6c0238ab8b8de588371c1f23f3170560398883c`
- **Importance:** A
- **Tags:** VALIDATION, TEST
- **이 Thread에서의 역할:** SSR→native mutation→hydrate deterministic race test

#### 해당 SHA에서 확인할 실제 코드

- `renderToString`, DOM container, `details.open = true`, `hydrateRoot`의 순서
- `act` 안의 hydration과 microtask flush
- `vi.spyOn(console, "error")` 및 hydration-related message filtering
- `open` attribute 보존 assertion과 root unmount, spy restore, container removal cleanup

#### Commit-specific investigation

- `b6c0238ab8b8^`와 `b6c0238ab8b8`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `SSR→native mutation→hydrate deterministic race test`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
- Production path와 test path를 분리하고, state/data/resource owner와 lifetime·cleanup을 실제 symbol 기준으로 추적합니다.
- Failure/absence/fallback branch와 test technique을 구분하고, 이 SHA가 보장하지 않는 범위를 명시합니다.
- 다음 후속 관계를 대조하되 later code를 이 SHA의 구현으로 설명하지 않습니다: `a37cb8596733`는 test가 보호하는 native root를 유지하면서 bulk markup을 server component로 옮깁니다.

#### 학습자 증거

| 확인·기록 항목 | 기록 |
| --- | --- |
| 직전 state와 부족함 | Fix는 한 줄의 hydration-warning suppression이었지만, 실제 race를 재현하는 regression evidence가 없으면 향후 attribute나 component boundary 변경으로 다시 깨질 수 있었습니다. |
| 실제 변경 file/symbol/call path | Production `DesignSwitcher`를 server string으로 렌더링하고 DOM에 삽입한 뒤 hydration 전에 `details.open = true`로 native state를 바꿉니다. 같은 element를 `hydrateRoot`로 hydrate하여 `open` 보존과 hydration error 부재를 검사합니다. |
| Data/state/DOM/resource owner와 lifetime | Test container와 React root lifetime은 test가 소유합니다. Native DOM이 hydration 전 state를 소유하고 React root가 이후 lifecycle을 이어받습니다. `finally`에서 root unmount, console spy restore, DOM removal을 수행합니다. |
| Failure·absence·fallback·cleanup | Missing `<details>`는 명시적 error입니다. Console error 전체를 무조건 허용하지 않고 hydration/server HTML mismatch 관련 message를 추려 empty를 요구합니다. Test failure 중에도 cleanup이 수행됩니다. |
| Test technique와 실행 증거 | Deterministic hydration regression test입니다. Browser network/paint 없이 React server/client APIs와 jsdom을 사용합니다. Exact code는 확인했지만 실행하지 않았습니다. |
| 보장하는 것 | 해당 component에서 pre-hydration native `open` state가 hydration 뒤에도 남고, test가 정의한 hydration mismatch messages가 발생하지 않아야 한다는 invariant를 고정합니다. |
| 보장하지 않는 것 | Real Chromium의 event timing, streaming SSR, concurrent navigation, CSS transition, 다른 attributes/descendants와 production bundle behavior는 증명하지 않습니다. |
| 다음 commit/관련 test 연결 | `a37cb8596733`는 test가 보호하는 native root를 유지하면서 bulk markup을 server component로 옮깁니다. |

#### 최소 code evidence

- **Commit:** `b6c0238ab8b8de588371c1f23f3170560398883c`
- **Path:** `src/components/portfolio/design-switcher.test.tsx`
- **Location:** `tolerates native open state changed before hydration`

```tsx
container.innerHTML = renderToString(switcher);
details.open = true;
root = hydrateRoot(container, switcher);
expect(details).toHaveAttribute("open");
```

이 excerpt는 위 state/ownership/contract를 식별하는 데 필요한 부분만 남긴 것입니다.

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command | 미실행 |
| 실제 결과 | 실행 환경에서 `github.com` DNS 해석이 실패하여 repository를 local clone하지 못했습니다. 따라서 이 문서의 역사 증거는 GitHub의 exact commit API에서 확인한 parent diff, changed file, 해당 SHA의 file content와 branch-local classification에 한정합니다. Vitest·Playwright·Axe·screenshot·performance command는 실행하지 않았고, 통과했다고 기록하지 않습니다. |
| 정적 검토 범위 | Exact commit diff, changed files, 위에 열거한 symbol/test/config |

### 6. `a37cb8596733` — refactor(ui): 디자인 선택기를 server markup으로 전환

- **Full SHA:** `a37cb85967331fcec7d8c7202b4103ba0780947e`
- **Importance:** A
- **Tags:** ARCH, REFACTOR
- **이 Thread에서의 역할:** Static markup server ownership과 close-only client island

#### 해당 SHA에서 확인할 실제 코드

- 새 `src/components/portfolio/design-switcher-close.tsx`와 `DesignSwitcherClose`
- `design-switcher.tsx`에서 제거된 `"use client"`, `useRef`, DOM refs와 link `onClick`
- server `DesignSwitcher`가 유지하는 content lookup, href, `<details>`, `suppressHydrationWarning`
- close island의 `event.currentTarget.closest("details")`, direct summary query, open 제거와 focus
- 수정된 component test가 href와 explicit close/focus만 검사하고 link-click close assertion을 제거한 이유

#### Commit-specific investigation

- `a37cb8596733^`와 `a37cb8596733`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `Static markup server ownership과 close-only client island`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
- Production path와 test path를 분리하고, state/data/resource owner와 lifetime·cleanup을 실제 symbol 기준으로 추적합니다.
- Failure/absence/fallback branch와 test technique을 구분하고, 이 SHA가 보장하지 않는 범위를 명시합니다.
- 다음 후속 관계를 대조하되 later code를 이 SHA의 구현으로 설명하지 않습니다: `1ac7813155c6`가 source boundary를 regression test로 고정하고, Thread 5의 performance tests가 broader client/network behavior를 다룹니다.

#### 학습자 증거

| 확인·기록 항목 | 기록 |
| --- | --- |
| 직전 state와 부족함 | 전체 switcher가 client component여서 static registry/list markup까지 hydration 대상이었고 두 ref가 root와 summary lifetime을 소유했습니다. Link click close도 client handler에 의존했습니다. |
| 실제 변경 file/symbol/call path | Main `DesignSwitcher`에서 client directive와 refs를 제거하여 server component markup으로 전환했습니다. Explicit close button만 `DesignSwitcherClose` client component로 분리하고, handler가 event target에서 가까운 details와 direct summary를 찾아 open 제거/focus 복원을 수행합니다. |
| Data/state/DOM/resource owner와 lifetime | Browser가 native details state를 계속 소유합니다. Server component는 markup/content/href를 소유하고 작은 close island만 explicit DOM mutation을 소유합니다. Design link는 native/Next navigation으로 페이지를 떠나므로 더 이상 별도 close handler를 갖지 않습니다. |
| Failure·absence·fallback·cleanup | Close button이 expected DOM hierarchy 밖에 있으면 closest/query가 null이 되어 optional no-op합니다. Link navigation이 취소되면 disclosure를 강제로 닫지 않는 behavior로 바뀝니다. `suppressHydrationWarning`은 native pre-hydration state를 위해 유지됩니다. |
| Test technique와 실행 증거 | Server-first ownership refactor입니다. Component test는 URL과 close/focus contract를 갱신하지만 이 commit은 client JavaScript byte 수를 측정하지 않습니다. |
| 보장하는 것 | Static selector markup과 registry rendering이 server에서 제공되고, client code는 explicit close action으로 제한됩니다. |
| 보장하지 않는 것 | Zero-JavaScript라고 보장하지 않으며 Next `Link`, close island, hydration warning boundary가 남습니다. Bundle 감소량과 production interaction latency는 별도 성능 evidence가 필요합니다. |
| 다음 commit/관련 test 연결 | `1ac7813155c6`가 source boundary를 regression test로 고정하고, Thread 5의 performance tests가 broader client/network behavior를 다룹니다. |

#### 최소 code evidence

- **Commit:** `a37cb85967331fcec7d8c7202b4103ba0780947e`
- **Path:** `src/components/portfolio/design-switcher-close.tsx`
- **Location:** DesignSwitcherClose click handler

```tsx
const details = event.currentTarget.closest("details");
const summary = details?.querySelector<HTMLElement>(":scope > summary");

details?.removeAttribute("open");
summary?.focus();
```

이 excerpt는 위 state/ownership/contract를 식별하는 데 필요한 부분만 남긴 것입니다.

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command | 미실행 |
| 실제 결과 | 실행 환경에서 `github.com` DNS 해석이 실패하여 repository를 local clone하지 못했습니다. 따라서 이 문서의 역사 증거는 GitHub의 exact commit API에서 확인한 parent diff, changed file, 해당 SHA의 file content와 branch-local classification에 한정합니다. Vitest·Playwright·Axe·screenshot·performance command는 실행하지 않았고, 통과했다고 기록하지 않습니다. |
| 정적 검토 범위 | Exact commit diff, changed files, 위에 열거한 symbol/test/config |

### 7. `1ac7813155c6` — test(ui): server 선택기와 focus 복원 검증

- **Full SHA:** `1ac7813155c61e79f9c7ccc736b120f1a2c802a1`
- **Importance:** A
- **Tags:** VALIDATION, A11Y, TEST
- **이 Thread에서의 역할:** Server component source boundary와 focus behavior 최종 regression

#### 해당 SHA에서 확인할 실제 코드

- `src/components/portfolio/design-switcher.test.tsx`가 `node:fs/promises.readFile`로 production source를 읽는 방식
- `"use client"`와 `useRef` 부재 assertion
- 기존 hydration race test와 explicit close/focus test가 같은 suite에 계속 남아 있는지
- `package-lock.json`의 side-channel dependency metadata 변경은 UI contract와 독립인 부수 변경이라는 점

#### Commit-specific investigation

- `1ac7813155c6^`와 `1ac7813155c6`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `Server component source boundary와 focus behavior 최종 regression`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
- Production path와 test path를 분리하고, state/data/resource owner와 lifetime·cleanup을 실제 symbol 기준으로 추적합니다.
- Failure/absence/fallback branch와 test technique을 구분하고, 이 SHA가 보장하지 않는 범위를 명시합니다.
- 다음 후속 관계를 대조하되 later code를 이 SHA의 구현으로 설명하지 않습니다: 이 Thread의 최종 상태를 고정하며, `dfeb...`·`787...` 같은 browser performance tests가 runtime 비용과 interaction을 별도로 관찰합니다.

#### 학습자 증거

| 확인·기록 항목 | 기록 |
| --- | --- |
| 직전 state와 부족함 | Server/client split은 architecture decision이었지만 runtime DOM test만으로는 main file에 client directive/ref가 다시 추가되어도 UI 결과가 같으면 감지하지 못할 수 있었습니다. |
| 실제 변경 file/symbol/call path | Test가 `src/components/portfolio/design-switcher.tsx` source text를 읽어 `"use client"`와 `useRef`가 없어야 한다고 요구합니다. 기존 interaction/hydration tests와 함께 structural ownership과 behavior를 동시에 보호합니다. |
| Data/state/DOM/resource owner와 lifetime | Production server component가 markup을 소유하고 `DesignSwitcherClose`가 client action을 소유한다는 파일 경계를 test가 감시합니다. Test는 source file read lifetime만 소유합니다. |
| Failure·absence·fallback·cleanup | Working directory나 file path가 바뀌면 architecture가 유지돼도 source-text test는 실패할 수 있습니다. 반대로 다른 client-only mechanism을 도입해도 두 문자열을 피하면 이 assertion만으로는 잡지 못합니다. |
| Test technique와 실행 증거 | Static architecture regression plus existing functional tests입니다. Build output 또는 React Flight payload를 분석하는 test가 아닙니다. Exact diff는 확인했지만 command는 실행하지 않았습니다. |
| 보장하는 것 | Main switcher source에 client directive와 `useRef`가 없어야 하고 explicit close/focus와 hydration race tests가 함께 유지되는 contract가 생깁니다. |
| 보장하지 않는 것 | 실제 client bundle 크기, all-transitive-import server safety, runtime latency와 assistive technology behavior는 증명하지 않습니다. |
| 다음 commit/관련 test 연결 | 이 Thread의 최종 상태를 고정하며, `dfeb...`·`787...` 같은 browser performance tests가 runtime 비용과 interaction을 별도로 관찰합니다. |

#### 최소 code evidence

- **Commit:** `1ac7813155c61e79f9c7ccc736b120f1a2c802a1`
- **Path:** `src/components/portfolio/design-switcher.test.tsx`
- **Location:** `keeps the selector markup in a server component`

```tsx
expect(source).not.toContain('"use client"');
expect(source).not.toContain("useRef");
```

이 excerpt는 위 state/ownership/contract를 식별하는 데 필요한 부분만 남긴 것입니다.

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command | 미실행 |
| 실제 결과 | 실행 환경에서 `github.com` DNS 해석이 실패하여 repository를 local clone하지 못했습니다. 따라서 이 문서의 역사 증거는 GitHub의 exact commit API에서 확인한 parent diff, changed file, 해당 SHA의 file content와 branch-local classification에 한정합니다. Vitest·Playwright·Axe·screenshot·performance command는 실행하지 않았고, 통과했다고 기록하지 않습니다. |
| 정적 검토 범위 | Exact commit diff, changed files, 위에 열거한 symbol/test/config |

## 6. Invariant evolution ledger

| Invariant | 도입/변경 SHA | Historical evidence | 상태 |
| --- | --- | --- | --- |
| Native details가 disclosure state의 base owner다. | e43e8addd7f3 → c702b870d57a | Native element + root hydration-warning boundary | 도입 후 hydration ownership 수정 |
| Explicit close는 summary focus를 복원한다. | c69ef85c98b2 → 09cec616f314 → a37cb8596733 | Ref handler→component test→event-local close island | 도입·검증·owner 축소 |
| Pre-hydration open state는 hydrate 뒤 보존된다. | c702b870d57a → b6c0238ab8b8 | `suppressHydrationWarning` + deterministic hydrate test | 수정·검증 |
| Bulk selector markup은 server component에 남는다. | a37cb8596733 → 1ac7813155c6 | Client directive/ref 제거 + source-text guard | 도입·고정 |

## 7. Failure → Fix → Test

| Earlier failure/risk | Fix SHA | Corrected decision | Regression evidence |
| --- | --- | --- | --- |
| 선택기를 닫은 뒤 focus가 body에 남을 위험 | c69ef85c98b2 → 09cec616f314 | Open 제거 후 summary focus assertion | Component regression |
| Native open과 hydration expectation이 충돌할 위험 | c702b870d57a → b6c0238ab8b8 | Root mismatch boundary + SSR/pre-hydration mutation test | Fix→Test |
| Static list 전체가 불필요한 client ownership으로 회귀할 위험 | a37cb8596733 → 1ac7813155c6 | Server/client split + source guard | Architecture regression |
| Link navigation cancel 상태에서 close semantics를 과도하게 강제할 위험 | a37cb8596733 | Link onClick close 제거, explicit close만 client mutation | Responsibility correction |

## 8. Ownership/state/responsibility 변화

| 대상 | 초기 owner/state | 최종 owner/state | Evidence |
| --- | --- | --- | --- |
| Disclosure `open` state | Native details + client refs | Native details | `<details suppressHydrationWarning>` |
| Static design list/content/href | Client `DesignSwitcher` | Server `DesignSwitcher` | `design-switcher.tsx` |
| Explicit close/focus | Parent refs/inline handler | Local event-derived client island | `DesignSwitcherClose` |
| Route transition close | Link onClick mutation | Navigation lifecycle | Link handler 제거 |
| Regression evidence | 없음 | Component + hydration + source-boundary tests | `design-switcher.test.tsx` |

## 9. 최종 Thread state

다음 내용을 코드 없이 설명합니다: 최종 owner, input→decision→output, failure/absence policy, regression evidence와 명시적 non-guarantee.

최종 선택기는 server component가 native disclosure markup, content와 route links를 출력하고, browser가 hydration 전후 `open` state를 소유합니다. Explicit close만 작은 client component가 closest details/direct summary를 찾아 state를 닫고 focus를 복원합니다. SSR→pre-hydration toggle→hydrate race와 server-source boundary가 tests로 고정되지만 client bundle 크기는 이 Thread가 측정하지 않습니다.

## 10. 최종 실행 흐름

| 단계 | Owner / mechanism | Input | Output/state | Failure/non-guarantee |
| ---: | --- | --- | --- | --- |
| 1. Server markup | `DesignSwitcher` | active design/templates/ui/path | details/summary/nav/links | unknown active→first registry item |
| 2. Native pre-hydration state | Browser `<details>` | summary interaction | `open` attribute | React expectation과 mismatch 가능 |
| 3. Hydration boundary | `suppressHydrationWarning` | server markup + mutated DOM | state-tolerant hydration | descendant mismatch는 별도 |
| 4. Explicit close | `DesignSwitcherClose` | click event | open 제거 + summary focus | unexpected hierarchy→no-op |
| 5. Regression evidence | `design-switcher.test.tsx` | SSR/jsdom/source text | behavior/architecture assertions | test failure |

## 11. 학습 완료 확인

- [x] 모든 referenced SHA를 exact historical diff 기준으로 설명했습니다.
- [x] Commit map의 SHA·순서·subject·importance·tags를 변경하지 않았습니다.
- [x] Fix를 earlier failure/assumption에 연결했습니다.
- [x] Test가 실행하는 production path와 증명하지 않는 범위를 구분했습니다.
- [x] 정적 inspection과 실제 command execution을 구분했습니다.
- [x] Thread-level invariant, ownership과 final flow를 완성했습니다.
- [x] 실행 제한을 명시했습니다: 실행 환경에서 `github.com` DNS 해석이 실패하여 repository를 local clone하지 못했습니다. 따라서 이 문서의 역사 증거는 GitHub의 exact commit API에서 확인한 parent diff, changed file, 해당 SHA의 file content와 branch-local classification에 한정합니다. Vitest·Playwright·Axe·screenshot·performance command는 실행하지 않았고, 통과했다고 기록하지 않습니다.
