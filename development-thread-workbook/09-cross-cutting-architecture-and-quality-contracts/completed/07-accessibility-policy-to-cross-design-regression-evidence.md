# Thread: Accessibility policy to cross-design regression evidence

> Project: 42 Archive Portfolio (`web/portfolio`)
>
> 이 문서는 source에서 확정된 thread 구조와 commit 역할만 미리 제공합니다. 실제 구현 해석, code evidence, failure 재현, test 결과, 최종 설명은 해당 SHA의 코드를 직접 확인해 작성합니다.

## 1. Thread 목표

국소 reduced-motion 처리에서 시작해 global motion policy, contrast, skip-link focus, semantic definition list를 수정하고 다섯 design과 모든 enabled route를 browser-level WCAG matrix로 검증하는 과정을 복원합니다.

**Source-defined significance**

> Accessibility develops from local motion rules into cross-design invariants backed by browser evidence. Later fixes show that visual independence can produce semantic and contrast regressions, so the final matrix tests landmarks, Axe rules, and keyboard focus across the full route/design product.

### 이 Thread에 직접 연결되는 Critical Invariants

- Reduced-motion에서는 nonessential animation, transition, smooth scroll이 기능 전제가 아닙니다. — `29bb40579cb2 → af9191fc15ad`
- Accent text는 light와 dark surface 모두에서 구분 가능한 token을 사용합니다. — `5a6fd8a802ff`
- Skip link는 main landmark로 programmatic focus를 이동합니다. — `a15e117cb51b → e1aac08e0e9e`
- Definition-list 값은 `<dd>`이고 landmarks는 route마다 유일합니다. — `e1aac08e0e9e → 84c71d027630`
- 모든 enabled route와 five designs는 configured WCAG A/AA scan과 keyboard skip path를 통과합니다. — `84c71d027630`

### 연결되는 Major Engineering Difficulty

- 서로 다른 다섯 renderer에서 motion, contrast, focus, semantics, landmarks를 하나의 cross-design invariant로 유지하는 문제

## 2. 이 Thread를 이해하기 위한 핵심 질문

- Selector-by-selector motion override가 왜 새 animation을 놓칠 수 있으며 global policy는 이를 어떻게 막는가?
- Light/dark surface에서 같은 accent token을 공유한 것이 어떤 contrast trade-off를 만들었는가?
- Skip link가 viewport만 이동하고 keyboard focus를 옮기지 못한 root cause는 무엇인가?
- Brutalist metric의 `<dl>` 내부 element가 visual output은 유지하면서 semantic contract를 깨는 이유는 무엇인가?
- Final Axe/landmark/keyboard matrix가 보장하는 범위와 보장하지 않는 범위는 무엇인가?

## 3. 완료 기준

- Local motion override와 global `prefers-reduced-motion` policy의 scope/specificity를 비교했습니다.
- Contrast token fix의 light/dark surface 분리와 consumer selector를 기록했습니다.
- 각 shell의 skip link target, main landmark, `tabIndex`, focus assertion을 추적했습니다.
- Brutalist `<dl>/<dt>/<dd>` 구조와 CSS selector를 수정 전후로 비교했습니다.
- `84c71d027630`의 route×design matrix, Axe rules, landmark count, keyboard path를 기록했습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Source에서 확정된 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `29bb40579cb2` | style(a11y): 동적 목록의 모션 감소 지원 | B | RENDERER, A11Y | Extends the initial reduced-motion coverage to repeated elements. |
| 2 | `af9191fc15ad` | style(a11y): 모바일 헤더와 동작 감소 보강 | A | ARCH, RENDERER, A11Y | Replaces selector-by-selector coverage with a global motion contract. |
| 3 | `5a6fd8a802ff` | fix(a11y): 디자인별 색상 대비 보정 | A | A11Y, DEBUG | Corrects shared and Editorial contrast tokens. |
| 4 | `a15e117cb51b` | fix(a11y): skip link focus target 복원 | A | A11Y, DEBUG | Restores programmatic focus transfer in shared shells. |
| 5 | `e1aac08e0e9e` | fix(a11y): Brutalist 지표의 definition semantics 수정 | A | ARCH, RENDERER, A11Y | Repairs definition-list semantics and the remaining shell focus boundary. |
| 6 | `84c71d027630` | test(a11y): 디자인×route WCAG 행렬 추가 | A | ARCH, ROUTING, A11Y | Verifies every enabled route under every design and a keyboard skip path. |

## 5. Commit별 학습 기록

각 section은 반드시 해당 SHA를 checkout한 상태에서 작성합니다. Thread 내 이전 commit은 비교 대상으로 사용할 수 있지만 final HEAD를 정답처럼 소급하지 않습니다.

### 1. `29bb40579cb2` — style(a11y): 동적 목록의 모션 감소 지원

- **Importance:** B
- **Tags:** RENDERER, A11Y
- **Source-defined thread role:** Extends the initial reduced-motion coverage to repeated elements.
- **Source classification summary:** Extend the reduced-motion override to technology chips and the animated guide elements used by experience and journey lists.
- **Source classification reason:** Necessary renderer and responsive implementation within an established visual system; it completes presentation behavior without redefining project-wide architecture or correctness.

#### Source에서 확정된 구현 의도와 상태 변화

Technology chip과 experience/journey guide 같은 반복 요소의 transform/transition을 기존 reduced-motion override에 포함해 hero 밖의 motion gap을 줄입니다.

#### 해당 SHA에서 확인할 실제 코드

- 기존 `prefers-reduced-motion` block과 새 chip/guide selector를 비교합니다.
- 각 selector에서 transform, transition, animation 중 무엇을 disable하는지 확인합니다.
- Motion 없이 content visibility/order가 동일한지 markup과 함께 확인합니다.
- Selector list 방식이 future motion을 자동 포함하지 않는 한계를 기록합니다.

확인 원칙:

- 먼저 `29bb40579cb2^`와 `29bb40579cb2`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 초기 motion policy coverage | 기존 reduced-motion block은 `.reveal-item`, `.motion-card`만 transform/transition을 껐습니다. |
| 새로 닫힌 repeated-list/timeline gap | motion만 제거하므로 information visibility와 interaction target은 유지됩니다. |
| Motion 제거 후 유지되는 information/interaction | hero 밖 반복 list/timeline의 현재 transform/transition gap을 닫습니다. |
| 후속 global policy가 필요한 이유 | `af9191fc15ad`가 selector별 방식 대신 global reduced-motion contract를 추가합니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 기존 reduced-motion block은 `.reveal-item`, `.motion-card`만 transform/transition을 껐습니다.
- **해당 SHA 핵심 코드:** `src/app/globals.css`의 `prefers-reduced-motion` block이 `.tech-chip`, `.experience-row::before`, `.paired-timeline::before`, `.timeline-list::before`까지 `transform: none; transition: none;`을 적용합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `af9191fc15ad`가 selector별 방식 대신 global reduced-motion contract를 추가합니다.

#### SHA별 복원 결론

- **Thread 내 역할:** 같은 local media block의 selector list에 repeated elements를 추가했습니다.
- **실제 변경:** `src/app/globals.css`의 `prefers-reduced-motion` block이 `.tech-chip`, `.experience-row::before`, `.paired-timeline::before`, `.timeline-list::before`까지 `transform: none; transition: none;`을 적용합니다.
- **현재 보장:** hero 밖 반복 list/timeline의 현재 transform/transition gap을 닫습니다.
- **남은 범위:** 새 animation selector를 자동 포함하지 않는 allow-list 방식의 한계가 남습니다. `af9191fc15ad`가 selector별 방식 대신 global reduced-motion contract를 추가합니다.

### 2. `af9191fc15ad` — style(a11y): 모바일 헤더와 동작 감소 보강

- **Importance:** A
- **Tags:** ARCH, RENDERER, A11Y
- **Source-defined thread role:** Replaces selector-by-selector coverage with a global motion contract.
- **Source classification summary:** Strengthened the global reduced-motion contract and simplified the mobile header effect.
- **Source classification reason:** Significant because it restores or verifies an accessibility invariant across designs or routes, where a local presentation defect would otherwise become a site-wide failure.

#### Source에서 확정된 구현 의도와 상태 변화

Reduced-motion에서 모든 animation/transition을 near-zero single iteration으로 축소하고 smooth scrolling을 끄는 global contract로 강화합니다. Terminal wrapper와 hover card를 포괄하고 mobile header backdrop filter도 제거합니다.

#### 해당 SHA에서 확인할 실제 코드

- Global selector scope가 renderer/component subtree에 적용되는지 확인합니다.
- Animation duration, iteration count, transition duration, scroll behavior override를 기록합니다.
- Terminal wrapper와 hover transform이 general/explicit rule로 처리되는지 확인합니다.
- Specificity 또는 `!important`가 design-scoped CSS를 이기는지 확인합니다.
- Mobile breakpoint의 backdrop filter 제거를 별도 변경으로 구분합니다.
- 새 animation을 가정해 local list 방식과 global 방식 차이를 설명합니다.

확인 원칙:

- 먼저 `af9191fc15ad^`와 `af9191fc15ad`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 local policy와 global policy 차이 | reduced-motion coverage가 known selector list에 의존해 새 animation/transition을 놓칠 수 있었습니다. |
| Near-zero 처리와 `none` 처리의 실제 선택 | media query 안에서 global elements/pseudo-elements를 near-zero duration, single iteration, auto scroll로 강제했습니다. |
| Smooth scroll, hover, terminal coverage | `src/app/globals.css`의 `*, *::before, *::after`에 animation-duration/transition-duration `.01ms !important`, animation-iteration-count `1 !important`, scroll-behavior `auto !important`를 적용하고 terminal wrapper/`.motion-card:hover` transform도 제거합니다. <=640px header backdrop-filter 제거는 별도 mobile effect simplification입니다. |
| Reduced motion에서도 유지되는 functionality | reduced-motion preference에서 animation/transition/smooth scroll이 기능 전제가 되지 않습니다. |
| Global rule의 potential side effect와 trade-off | 브라우저/OS별 실제 사용자 경험과 custom script-driven motion 전체는 이 CSS만으로 증명하지 않습니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** reduced-motion coverage가 known selector list에 의존해 새 animation/transition을 놓칠 수 있었습니다.
- **해당 SHA 핵심 코드:** `src/app/globals.css`의 `*, *::before, *::after`에 animation-duration/transition-duration `.01ms !important`, animation-iteration-count `1 !important`, scroll-behavior `auto !important`를 적용하고 terminal wrapper/`.motion-card:hover` transform도 제거합니다. <=640px header backdrop-filter 제거는 별도 mobile effect simplification입니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `84c71d027630`의 browser matrix는 구조/keyboard/Axe를 검사하지만 motion preference visual timing 자체는 별도 측정하지 않습니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** reduced-motion coverage가 known selector list에 의존해 새 animation/transition을 놓칠 수 있었습니다. hover, terminal wrapper, smooth scroll 등 다른 motion source가 local overrides를 우회할 수 있었습니다.
- **구현 결정과 경로:** media query 안에서 global elements/pseudo-elements를 near-zero duration, single iteration, auto scroll로 강제했습니다. `src/app/globals.css`의 `*, *::before, *::after`에 animation-duration/transition-duration `.01ms !important`, animation-iteration-count `1 !important`, scroll-behavior `auto !important`를 적용하고 terminal wrapper/`.motion-card:hover` transform도 제거합니다. <=640px header backdrop-filter 제거는 별도 mobile effect simplification입니다.
- **소유권·실패 처리:** global policy가 future CSS motion baseline을 소유하고 design-scoped rules는 `!important`에 의해 override됩니다. near-zero는 lifecycle event를 완전히 없애지 않으면서 체감 motion을 제거하지만 broad rule이 의도된 micro-transition도 축소하는 trade-off가 있습니다.
- **보장:** reduced-motion preference에서 animation/transition/smooth scroll이 기능 전제가 되지 않습니다.
- **보장하지 않는 범위:** 브라우저/OS별 실제 사용자 경험과 custom script-driven motion 전체는 이 CSS만으로 증명하지 않습니다.
- **후속 연결:** `84c71d027630`의 browser matrix는 구조/keyboard/Axe를 검사하지만 motion preference visual timing 자체는 별도 측정하지 않습니다.

### 3. `5a6fd8a802ff` — fix(a11y): 디자인별 색상 대비 보정

- **Importance:** A
- **Tags:** A11Y, DEBUG
- **Source-defined thread role:** Corrects shared and Editorial contrast tokens.
- **Source classification summary:** Adjust shared and Editorial color tokens so accent text remains distinguishable on both light and dark surfaces.
- **Source classification reason:** Significant because it restores or verifies an accessibility invariant across designs or routes, where a local presentation defect would otherwise become a site-wide failure.

#### Source에서 확정된 구현 의도와 상태 변화

Shared와 Editorial color token을 조정해 accent text가 light/dark surface 모두에서 구분되도록 하고 dark-surface vermilion을 normal text token과 분리합니다.

#### 해당 SHA에서 확인할 실제 코드

- Fix 전 하나의 accent token이 적용되던 light/dark selector를 찾습니다.
- 새 token definition과 surface-specific consumer 변경을 비교합니다.
- Evidence, architecture, curation, gap label 적용 영역을 확인합니다.
- 한 context 개선이 다른 context를 악화시키던 기존 color/background 조합을 기록합니다.
- Axe/contrast 검사에서 해당 route/design fixture를 찾습니다.

확인 원칙:

- 먼저 `5a6fd8a802ff^`와 `5a6fd8a802ff`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 기존 가정: shared accent 하나로 모든 surface 대응 | 같은 accent literal/token을 light와 dark surfaces에 재사용했습니다. |
| 실제 risk: dark/light 중 한쪽 대비 부족 | root cause는 role이 다른 surfaces에 literal identity 하나를 강제한 것이며 수정은 context-specific value로 분리합니다. |
| Root cause: semantic role보다 literal visual identity 공유 | 한 surface에서 충분한 색이 다른 background에서는 contrast를 잃어 visual identity와 semantic readability가 충돌했습니다. |
| 수정 decision: surface-specific token | shared accent를 조정하고 Editorial에 dark-surface 전용 vermilion token을 분리했습니다. |
| Regression evidence와 아직 보장하지 않는 color combination | 모든 사용자 content/background 조합과 human contrast perception을 정적 token 변경만으로 보장하지 않습니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 같은 accent literal/token을 light와 dark surfaces에 재사용했습니다.
- **해당 SHA 핵심 코드:** `src/app/globals.css`의 accent가 `#008c89`에서 `#007b78`로 조정되고 dark chip text는 `#f2efe7`을 사용합니다. Editorial stylesheet는 normal vermilion을 `#c7432e`, `--vermilion-on-dark: #e15b43`으로 나눠 evidence/architecture/curation/gap dark contexts에 적용합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `84c71d027630`의 Axe matrix가 configured route/design fixture에서 contrast rule 회귀를 탐지합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** 같은 accent literal/token을 light와 dark surfaces에 재사용했습니다. 한 surface에서 충분한 색이 다른 background에서는 contrast를 잃어 visual identity와 semantic readability가 충돌했습니다.
- **구현 결정과 경로:** shared accent를 조정하고 Editorial에 dark-surface 전용 vermilion token을 분리했습니다. `src/app/globals.css`의 accent가 `#008c89`에서 `#007b78`로 조정되고 dark chip text는 `#f2efe7`을 사용합니다. Editorial stylesheet는 normal vermilion을 `#c7432e`, `--vermilion-on-dark: #e15b43`으로 나눠 evidence/architecture/curation/gap dark contexts에 적용합니다.
- **소유권·실패 처리:** token layer가 semantic surface role을 소유하고 consumer selectors가 light/dark context에 맞는 token을 선택합니다. root cause는 role이 다른 surfaces에 literal identity 하나를 강제한 것이며 수정은 context-specific value로 분리합니다.
- **보장:** 수정된 known light/dark consumers에서 accent text 구분 가능성을 강화합니다.
- **보장하지 않는 범위:** 모든 사용자 content/background 조합과 human contrast perception을 정적 token 변경만으로 보장하지 않습니다.
- **후속 연결:** `84c71d027630`의 Axe matrix가 configured route/design fixture에서 contrast rule 회귀를 탐지합니다.

### 4. `a15e117cb51b` — fix(a11y): skip link focus target 복원

- **Importance:** A
- **Tags:** A11Y, DEBUG
- **Source-defined thread role:** Restores programmatic focus transfer in shared shells.
- **Source classification summary:** Make each main-content landmark programmatically focusable with `tabIndex={-1}`.
- **Source classification reason:** Significant because it restores or verifies an accessibility invariant across designs or routes, where a local presentation defect would otherwise become a site-wide failure.

#### Source에서 확정된 구현 의도와 상태 변화

Shared, Cinematic, Editorial shell의 main landmark에 `tabIndex={-1}`을 추가해 skip link가 viewport 이동뿐 아니라 keyboard focus까지 전달하도록 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- 각 shell의 skip link `href`와 main `id`가 일치하는지 확인합니다.
- Fix 전 main이 programmatic focus target이 될 수 없었던 markup을 비교합니다.
- `tabIndex={-1}`이 normal tab order에는 없지만 focus를 허용하는 browser behavior를 확인합니다.
- Shared, Cinematic, Editorial의 동일 수정 지점을 찾습니다.
- Brutalist gap은 다음 commit과 연결합니다.

확인 원칙:

- 먼저 `a15e117cb51b^`와 `a15e117cb51b`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 기존 가정: fragment navigation으로 keyboard focus도 이동 | skip link `href`가 main fragment로 scroll했지만 대상 `<main>`이 programmatic focusable하지 않았습니다. |
| 실제 failure: visual scroll과 focus position 불일치 | `-1`은 normal sequential tab order에 새 stop을 만들지 않으면서 fragment/explicit focus를 허용합니다. |
| 수정 code와 shell coverage | 각 shell의 skip link `href`와 main `id` (`main-content`, `cinematic-content`, `editorial-main`)가 일치하고 main에 `tabIndex={-1}`이 추가됩니다. |
| Normal tab order에 새 stop을 추가하지 않는 이유 | Shared, Cinematic, Editorial main landmarks에 `tabIndex={-1}`을 추가했습니다. |
| 다음 commit/test와 연결 | `e1aac08e0e9e`이 Brutalist main focusability를 추가하고 `84c71d027630`이 keyboard path를 검사합니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** skip link `href`가 main fragment로 scroll했지만 대상 `<main>`이 programmatic focusable하지 않았습니다.
- **해당 SHA 핵심 코드:** 각 shell의 skip link `href`와 main `id` (`main-content`, `cinematic-content`, `editorial-main`)가 일치하고 main에 `tabIndex={-1}`이 추가됩니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `e1aac08e0e9e`이 Brutalist main focusability를 추가하고 `84c71d027630`이 keyboard path를 검사합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** skip link `href`가 main fragment로 scroll했지만 대상 `<main>`이 programmatic focusable하지 않았습니다. visual viewport는 이동해도 keyboard focus는 header/skip link에 남아 다음 Tab 순서가 content 시작과 어긋날 수 있었습니다.
- **구현 결정과 경로:** Shared, Cinematic, Editorial main landmarks에 `tabIndex={-1}`을 추가했습니다. 각 shell의 skip link `href`와 main `id` (`main-content`, `cinematic-content`, `editorial-main`)가 일치하고 main에 `tabIndex={-1}`이 추가됩니다.
- **소유권·실패 처리:** anchor가 navigation trigger를, main landmark가 programmatic focus target을 소유합니다. `-1`은 normal sequential tab order에 새 stop을 만들지 않으면서 fragment/explicit focus를 허용합니다.
- **보장:** 세 shell에서 skip-link activation이 viewport 이동뿐 아니라 main focus transfer로 이어질 기반을 복원합니다.
- **보장하지 않는 범위:** Brutalist shell은 이 SHA에서 누락돼 cross-design complete invariant는 아직 아닙니다.
- **후속 연결:** `e1aac08e0e9e`이 Brutalist main focusability를 추가하고 `84c71d027630`이 keyboard path를 검사합니다.

### 5. `e1aac08e0e9e` — fix(a11y): Brutalist 지표의 definition semantics 수정

- **Importance:** A
- **Tags:** ARCH, RENDERER, A11Y
- **Source-defined thread role:** Repairs definition-list semantics and the remaining shell focus boundary.
- **Source classification summary:** Correct the Brutalist metric block so every descriptive value is represented by a `<dd>` inside its definition list instead of an unrelated paragraph.
- **Source classification reason:** Significant because it restores or verifies an accessibility invariant across designs or routes, where a local presentation defect would otherwise become a site-wide failure.

#### Source에서 확정된 구현 의도와 상태 변화

Brutalist metric `<dl>`에서 descriptive value를 paragraph 대신 `<dd>`로 수정하고 CSS selector를 맞춥니다. Brutalist main landmark도 focusable하게 만들어 남은 skip-link gap을 닫습니다.

#### 해당 SHA에서 확인할 실제 코드

- Metric block의 `<dl>`, `<dt>`, value, description markup을 수정 전후로 비교합니다.
- Paragraph에서 `<dd>`로 바뀌며 accessible relationship이 어떻게 달라지는지 확인합니다.
- Description이 strong value typography를 상속하지 않도록 CSS selector가 분리되는지 확인합니다.
- Brutalist main의 `tabIndex={-1}`과 skip link target을 확인합니다.
- Visual output과 accessibility tree 차이를 기록합니다.

확인 원칙:

- 먼저 `e1aac08e0e9e^`와 `e1aac08e0e9e`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 기존 malformed definition-list assumption | Brutalist metric `<dl>` 안에서 description이 `<p>`로 렌더링됐고 Brutalist main은 focus target이 아니었습니다. |
| Root cause와 semantic correction | visual layout은 보이지만 definition relationship이 accessibility tree에서 끊기고 skip link focus gap이 한 design에 남았습니다. |
| CSS adaptation | description을 두 번째 `<dd>`로 바꾸고 CSS selector를 분리하며 Brutalist main에 `tabIndex={-1}`을 추가했습니다. Brutalist metric component의 `<dt>` 뒤 value `<dd>`와 description `<dd className="metricDescription">`가 semantic pair를 이루고 stylesheet가 strong value style과 description style을 구분합니다. Main landmark는 matching id와 `tabIndex={-1}`을 가집니다. |
| 남은 shell focus boundary 복구 | HTML definition list가 term/value relationship을 소유하고 CSS는 visual distinction만 소유합니다. |
| 다음 broad matrix와 연결 | `84c71d027630`이 semantic/focus fixes를 모든 enabled route×design integration에서 검사합니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** Brutalist metric `<dl>` 안에서 description이 `<p>`로 렌더링됐고 Brutalist main은 focus target이 아니었습니다.
- **해당 SHA 핵심 코드:** Brutalist metric component의 `<dt>` 뒤 value `<dd>`와 description `<dd className="metricDescription">`가 semantic pair를 이루고 stylesheet가 strong value style과 description style을 구분합니다. Main landmark는 matching id와 `tabIndex={-1}`을 가집니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `84c71d027630`이 semantic/focus fixes를 모든 enabled route×design integration에서 검사합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** Brutalist metric `<dl>` 안에서 description이 `<p>`로 렌더링됐고 Brutalist main은 focus target이 아니었습니다. visual layout은 보이지만 definition relationship이 accessibility tree에서 끊기고 skip link focus gap이 한 design에 남았습니다.
- **구현 결정과 경로:** description을 두 번째 `<dd>`로 바꾸고 CSS selector를 분리하며 Brutalist main에 `tabIndex={-1}`을 추가했습니다. Brutalist metric component의 `<dt>` 뒤 value `<dd>`와 description `<dd className="metricDescription">`가 semantic pair를 이루고 stylesheet가 strong value style과 description style을 구분합니다. Main landmark는 matching id와 `tabIndex={-1}`을 가집니다.
- **소유권·실패 처리:** HTML definition list가 term/value relationship을 소유하고 CSS는 visual distinction만 소유합니다. malformed child element를 semantic `<dd>`로 교체해 visual output을 유지하면서 accessibility tree를 수정합니다.
- **보장:** definition values가 `<dd>`이고 남은 shell skip target도 programmatic focusable합니다.
- **보장하지 않는 범위:** route별 landmark cardinality와 full design matrix는 아직 broad test로 고정되지 않았습니다.
- **후속 연결:** `84c71d027630`이 semantic/focus fixes를 모든 enabled route×design integration에서 검사합니다.

### 6. `84c71d027630` — test(a11y): 디자인×route WCAG 행렬 추가

- **Importance:** A
- **Tags:** ARCH, ROUTING, A11Y
- **Source-defined thread role:** Verifies every enabled route under every design and a keyboard skip path.
- **Source classification summary:** Add an end-to-end accessibility matrix that exercises every enabled route under all five designs.
- **Source classification reason:** Significant because it restores or verifies an accessibility invariant across designs or routes, where a local presentation defect would otherwise become a site-wide failure.

#### Source에서 확정된 구현 의도와 상태 변화

모든 enabled route를 five designs에서 실행하는 browser-level accessibility matrix를 추가합니다. Response, selected design root, banner/main/content-info 각 하나, Axe WCAG A/AA clean scan과 skip-link focus transfer를 검증합니다.

#### 해당 SHA에서 확인할 실제 코드

- Enabled route fixture와 five-design fixture가 기존 matrix와 공유되는지 확인합니다.
- Route×design case 생성과 dynamic project route 선택을 확인합니다.
- Response status, design root, landmark cardinality assertion을 추적합니다.
- Axe integration의 included/excluded rules와 WCAG 2.x A/AA tags를 확인합니다.
- Keyboard test에서 first Tab, skip activation, main focus 순서를 확인합니다.
- Failure report가 route/design/rule을 식별하는지 확인합니다.
- 이전 fixes를 제거했을 때 어떤 case가 실패할지 연결합니다.

확인 원칙:

- 먼저 `84c71d027630^`와 `84c71d027630`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 대상 production invariants | configured WCAG scan의 violation 부재, single landmark cardinality와 keyboard skip focus contract를 모든 enabled route×5 designs에 적용합니다. |
| Test matrix의 route/design 범위 | `tests/e2e/site-matrix.ts`는 content에서 첫 enabled project와 enabled optional pages를 포함한 8 route definitions를 만들고 5 design IDs를 공유합니다. `tests/e2e/accessibility.spec.ts`는 각 design×enabled route에서 response OK, selected design root visible, banner/main/contentinfo 각 1개, Axe tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`의 zero violations를 검사합니다. 별도 case는 home에서 Tab→skip link label→Enter→main focus를 확인합니다. 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다. |
| Real browser, Axe, landmark count, keyboard path technique | `tests/e2e/site-matrix.ts`는 content에서 첫 enabled project와 enabled optional pages를 포함한 8 route definitions를 만들고 5 design IDs를 공유합니다. `tests/e2e/accessibility.spec.ts`는 각 design×enabled route에서 response OK, selected design root visible, banner/main/contentinfo 각 1개, Axe tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`의 zero violations를 검사합니다. 별도 case는 home에서 Tab→skip link label→Enter→main focus를 확인합니다. 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다. |
| 통과하는 production route/shell/renderer path | `tests/e2e/site-matrix.ts`는 content에서 첫 enabled project와 enabled optional pages를 포함한 8 route definitions를 만들고 5 design IDs를 공유합니다. `tests/e2e/accessibility.spec.ts`는 각 design×enabled route에서 response OK, selected design root visible, banner/main/contentinfo 각 1개, Axe tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`의 zero violations를 검사합니다. 별도 case는 home에서 Tab→skip link label→Enter→main focus를 확인합니다. |
| 증명하는 것: configured violations 부재와 structural/focus contract | configured WCAG scan의 violation 부재, single landmark cardinality와 keyboard skip focus contract를 모든 enabled route×5 designs에 적용합니다. |
| 증명하지 않는 것: 모든 assistive technology와 human evaluation | 모든 assistive technology, screen-reader UX, human review, reduced-motion timing과 WCAG 전체 적합성을 증명하지 않습니다. |
| Broad integration regression으로서 막는 범위 | `tests/e2e/site-matrix.ts`는 content에서 첫 enabled project와 enabled optional pages를 포함한 8 route definitions를 만들고 5 design IDs를 공유합니다. `tests/e2e/accessibility.spec.ts`는 각 design×enabled route에서 response OK, selected design root visible, banner/main/contentinfo 각 1개, Axe tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`의 zero violations를 검사합니다. 별도 case는 home에서 Tab→skip link label→Enter→main focus를 확인합니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** motion/contrast/focus/semantics fixes가 개별 source 변경과 일부 local checks에 의존했습니다.
- **해당 SHA 핵심 코드:** `tests/e2e/site-matrix.ts`는 content에서 첫 enabled project와 enabled optional pages를 포함한 8 route definitions를 만들고 5 design IDs를 공유합니다. `tests/e2e/accessibility.spec.ts`는 각 design×enabled route에서 response OK, selected design root visible, banner/main/contentinfo 각 1개, Axe tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`의 zero violations를 검사합니다. 별도 case는 home에서 Tab→skip link label→Enter→main focus를 확인합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** 이 commit이 이전 local fixes를 broad production-browser integration regression으로 연결합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** motion/contrast/focus/semantics fixes가 개별 source 변경과 일부 local checks에 의존했습니다. 다섯 renderer와 optional/dynamic routes 중 하나가 banner/main/footer, contrast 또는 keyboard skip behavior를 다시 깨뜨릴 수 있었습니다.
- **구현 결정과 경로:** shared route fixture와 5-design browser accessibility matrix를 추가했습니다. `tests/e2e/site-matrix.ts`는 content에서 첫 enabled project와 enabled optional pages를 포함한 8 route definitions를 만들고 5 design IDs를 공유합니다. `tests/e2e/accessibility.spec.ts`는 각 design×enabled route에서 response OK, selected design root visible, banner/main/contentinfo 각 1개, Axe tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`의 zero violations를 검사합니다. 별도 case는 home에서 Tab→skip link label→Enter→main focus를 확인합니다.
- **소유권·실패 처리:** content/config fixture가 matrix coverage를, Playwright page가 real browser route path를, Axe/landmark/keyboard assertions가 regression result를 소유합니다. dynamic project는 첫 enabled ID를 사용하며 violation formatter가 route/design/rule context를 남깁니다.
- **보장:** configured WCAG scan의 violation 부재, single landmark cardinality와 keyboard skip focus contract를 모든 enabled route×5 designs에 적용합니다.
- **보장하지 않는 범위:** 모든 assistive technology, screen-reader UX, human review, reduced-motion timing과 WCAG 전체 적합성을 증명하지 않습니다.
- **후속 연결:** 이 commit이 이전 local fixes를 broad production-browser integration regression으로 연결합니다.

## 6. Invariant ledger

| Invariant | Source에서 확인된 변화 지점 | 해당 SHA의 실제 code/test evidence | 부족함이 드러난 시점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| Reduced-motion에서는 nonessential animation, transition, smooth scroll이 기능 전제가 아닙니다. | `29bb40579cb2 → af9191fc15ad` | `29bb40579cb2` local selector additions과 `af9191fc15ad` global `*/*::before/*::after` near-zero duration, single iteration, auto scroll. | selector allow-list는 future/new motion source를 자동 포함하지 못했습니다. | reduced-motion preference에서 known transforms와 future CSS animation/transition/smooth scroll이 core functionality의 전제가 되지 않습니다. |
| Accent text는 light와 dark surface 모두에서 구분 가능한 token을 사용합니다. | `5a6fd8a802ff` | shared accent `#007b78`, dark chip text, Editorial normal/dark-surface vermilion tokens와 consumers. | 하나의 literal accent를 light/dark surfaces에 공유해 한쪽 contrast가 부족했습니다. | known light/dark contexts가 surface-specific tokens를 사용하고 Axe matrix가 configured fixtures의 contrast regression을 검사합니다. |
| Skip link는 main landmark로 programmatic focus를 이동합니다. | `a15e117cb51b → e1aac08e0e9e` | Shared/Cinematic/Editorial main `tabIndex={-1}`, Brutalist follow-up와 keyboard Tab→skip→Enter→main assertion. | fragment scroll만으로 focus가 이동한다는 가정과 Brutalist 누락이 있었습니다. | 모든 five-design shells의 main은 normal tab order를 늘리지 않으면서 programmatic focus target이 됩니다. |
| Definition-list 값은 `<dd>`이고 landmarks는 route마다 유일합니다. | `e1aac08e0e9e → 84c71d027630` | Brutalist metric의 second `<dd className="metricDescription">`; matrix의 banner/main/contentinfo exact-one assertions. | `<dl>` 안 paragraph와 untested landmark duplicates가 semantic structure를 깰 수 있었습니다. | definition values는 `<dd>`로 연결되고 enabled route마다 three landmark categories가 하나씩 있어야 합니다. |
| 모든 enabled route와 five designs는 configured WCAG A/AA scan과 keyboard skip path를 통과합니다. | `84c71d027630` | `tests/e2e/site-matrix.ts` + `accessibility.spec.ts`: enabled route×5 design, Axe WCAG tags, zero violations와 keyboard skip test. | 개별 fix만으로 cross-design/route regression을 알 수 없었습니다. | configured browser scan과 structural/focus contract를 full enabled product matrix에 적용합니다. |

Ledger 작성 원칙:

- Source가 명시한 invariant만 사용하고 새 invariant를 확정 사실처럼 추가하지 않습니다.
- 도입, 강화, 부족함 노출, fix, regression test가 서로 다른 commit이면 각 열에 분리해 기록합니다.
- Code evidence에는 실제 field, function, branch, selector, command 또는 assertion을 적습니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 위험 | 대응 commit | 실제 수정/강화 code에서 확인할 것 | Test 또는 실행 증거 |
| --- | --- | --- | --- |
| 반복 list/timeline animation이 reduced-motion override 밖에 남음 | 29bb40579cb2 | Chip/guide transform과 transition을 기존 override에 포함합니다. | Future selector를 자동 포함하지 못하는 한계를 기록합니다. |
| 새 animation이 selector list를 우회함 | af9191fc15ad | Global near-zero duration/iteration과 smooth-scroll off로 강화합니다. | Terminal wrapper와 hover card 적용을 확인합니다. |
| Shared accent가 한 surface에서는 충분하지만 다른 surface에서는 대비 부족 | 5a6fd8a802ff | Normal/dark-surface token 분리와 consumer selector를 확인합니다. | 어느 route/design에서 contrast failure가 재현되는지 기록합니다. |
| Skip link가 scroll만 하고 focus는 header에 남음 | a15e117cb51b | Main에 `tabIndex={-1}`을 추가해 programmatic focusable하게 만듭니다. | Shared/Cinematic/Editorial shell을 확인합니다. |
| Brutalist definition semantics와 focus gap | e1aac08e0e9e | Paragraph를 `<dd>`로 바꾸고 CSS와 main focusability를 보정합니다. | 다음 matrix와 연결합니다. |
| Cross-design regression | 84c71d027630 | Enabled route×5 designs에 response, root, landmark, Axe, skip focus를 적용합니다. | Broad matrix가 증명하지 않는 screen-reader별 경험을 구분합니다. |

### 실제 연결 기록

- `29bb40579cb2`은 known repeated selectors를 추가한 보완이고 `af9191fc15ad`은 future CSS motion까지 포괄하는 global policy입니다.
- `a15e117cb51b`은 Shared/Cinematic/Editorial만 수정했고 Brutalist gap은 `e1aac08e0e9e`에서 닫혔습니다.
- `84c71d027630`은 real-browser Axe/landmark/keyboard integration을 정의하지만 human evaluation이나 모든 assistive technology의 적합성 증명은 아닙니다.

## 8. Ownership / state / responsibility 변화

| Concern | Thread 초기 owner/state | Thread 최종 owner/state | 실제 symbol과 호출 경로 |
| --- | --- | --- | --- |
| Motion coverage | 개별 selector | Global reduced-motion contract | `src/app/globals.css` global `prefers-reduced-motion` block이 CSS motion baseline을 소유합니다. |
| Contrast | 하나의 shared accent token | Surface-specific tokens | shared/Editorial token definitions과 surface consumer selectors가 contrast 역할을 소유합니다. |
| Skip navigation | Anchor scroll behavior | Focusable main + keyboard assertion | 각 design shell의 skip link href + matching focusable main; Playwright keyboard assertion이 integration proof를 소유합니다. |
| Metric semantics | Paragraph inside `<dl>` | Semantic `<dd>` | Brutalist metric component의 `<dt>/<dd>/<dd>` markup과 description CSS selector. |
| Regression proof | 개별 수동 확인 | Route×design browser matrix | `tests/e2e/site-matrix.ts` route/design fixtures → Playwright navigation → Axe/landmark/skip-focus assertions. |

## 9. Thread 최종 상태

### Source에서 확정된 최종 상태

국소 reduced-motion 처리에서 시작해 global motion policy, contrast, skip-link focus, semantic definition list를 수정하고 다섯 design과 모든 enabled route를 browser-level WCAG matrix로 검증하는 과정을 복원합니다.

### 학습자가 완성할 최종 설명

- **Thread 시작 시점의 설계와 위험:** 초기 reduced-motion support는 일부 reveal/card selector만 다뤄 repeated list/timeline과 future animation을 놓칠 수 있었습니다.
- **핵심 architecture/decision이 형성된 순서:** local motion gap 보완 → global policy → surface-specific contrast → shared shell focus → Brutalist semantics/focus → full browser matrix 순서로 cross-design invariant가 형성됐습니다.
- **실제 failure 또는 부족함이 드러난 지점:** 같은 accent token의 surface mismatch, fragment scroll과 keyboard focus 불일치, visually acceptable paragraph inside `<dl>`이 실제 부족함으로 확인됐습니다.
- **Fix 또는 boundary 강화가 바꾼 invariant:** CSS token/policy와 semantic markup/focus target을 수정하고 five-design enabled-route matrix에서 Axe, landmarks와 keyboard path를 함께 검사하도록 강화했습니다.
- **Test/build/browser evidence가 보장한 범위:** commit diffs와 test source의 exact fixtures/assertions를 정적으로 확인했습니다. Playwright/Axe browser run은 실행하지 않았으므로 “통과”라는 runtime claim은 기록하지 않았습니다.
- **Thread 종료 시점에도 보장하지 않는 범위:** 모든 assistive technology, screen-reader experience, human WCAG review, motion timing perception와 arbitrary user content 조합은 보장하지 않습니다.

## 10. 최종 architecture 또는 execution flow 정리

아래 source-backed flow의 각 단계에 실제 file path, symbol, input/output, failure branch를 추가합니다.

1. User preference가 `prefers-reduced-motion` media query에 전달됩니다.
   - 실제 코드 위치: `src/app/globals.css @media (prefers-reduced-motion: reduce)`
   - 입력과 출력: OS/browser preference가 matching media query를 활성화합니다.
   - 실패/absence 처리: preference가 없으면 normal design motion rules가 유지됩니다.
2. Global policy가 animation/transition/smooth scroll을 기능과 분리합니다.
   - 실제 코드 위치: same global block + explicit transform rules
   - 입력과 출력: animation/transition duration을 `.01ms`, iteration을 1, scroll을 auto로 바꾸고 known transforms를 none으로 만듭니다.
   - 실패/absence 처리: script-driven motion이나 외부 styles가 scope 밖이면 이 CSS만으로 제어하지 않습니다.
3. Design-scoped token이 각 surface에서 contrast-safe 값을 제공합니다.
   - 실제 코드 위치: shared and design-scoped CSS variables/selectors
   - 입력과 출력: surface context가 normal 또는 dark-safe accent token을 선택해 text/background 조합을 출력합니다.
   - 실패/absence 처리: 새 consumer가 잘못된 token을 쓰면 Axe matrix의 covered route에서 contrast violation으로 드러날 수 있습니다.
4. Skip link가 first tab stop으로 나타나 main target에 focus를 이동합니다.
   - 실제 코드 위치: 각 shell의 skip link와 `<main id=... tabIndex={-1}>`
   - 입력과 출력: 첫 Tab에 skip link가 나타나고 Enter fragment activation이 focusable main으로 이동합니다.
   - 실패/absence 처리: id mismatch나 missing tabindex이면 Playwright focus assertion이 실패합니다.
5. 각 renderer가 banner/main/content-info와 semantic content structure를 출력합니다.
   - 실제 코드 위치: five route renderers/shells 및 Brutalist metric markup
   - 입력과 출력: 각 page가 banner/main/contentinfo와 semantic `<dl>/<dt>/<dd>` content를 출력합니다.
   - 실패/absence 처리: duplicate/missing landmarks 또는 invalid semantic relations는 structural/Axe checks 대상입니다.
6. Playwright matrix가 route×design을 열고 Axe와 landmark cardinality를 검사합니다.
   - 실제 코드 위치: `tests/e2e/accessibility.spec.ts` route×design loop
   - 입력과 출력: shared fixture의 enabled routes를 five explicit design query로 열고 response/root/landmarks/Axe를 검사합니다.
   - 실패/absence 처리: HTTP failure, wrong renderer root, landmark count 또는 configured Axe violation이 route/design context와 함께 실패합니다.
7. 별도 keyboard path가 skip-link focus transfer를 실제 browser에서 검증합니다.
   - 실제 코드 위치: same spec의 keyboard test
   - 입력과 출력: 각 design home에서 Tab, skip-link accessible name, Enter, main focus 순서를 real browser API로 확인합니다.
   - 실패/absence 처리: 이 path는 broader screen-reader navigation이나 all keyboard controls를 평가하지 않습니다.

### 코드 없이 설명하기

> 이 Thread의 최종 실행 흐름을 code snippet 없이 자신의 말로 작성합니다. 설계 → 구현 → failure/risk → 수정/강화 → 검증 순서가 드러나야 합니다.

처음에는 reduced-motion 대상 selector를 하나씩 늘렸지만 새 animation을 놓칠 수 있어 global near-zero duration, single iteration과 smooth-scroll off 정책으로 바꿨습니다. 이후 light/dark surface의 accent token을 분리하고 skip link target main을 programmatic focusable하게 만들었습니다. Brutalist의 잘못된 definition-list child를 `<dd>`로 고치고 남은 focus gap도 닫았습니다. 마지막 browser matrix는 content에서 enabled routes를 만들고 다섯 design 각각에서 response, design root, single landmarks, configured Axe rules와 실제 keyboard skip focus를 검사하도록 구현됐습니다.

> **실행 증거 구분:** 참조 SHA의 diff와 해당 SHA 파일은 GitHub connector로 확인했습니다. 로컬 clone은 실행 환경의 DNS 차단으로 실패해 build, unit/E2E, browser, Lighthouse, Docker command는 실행하지 않았습니다. 따라서 위 test 결과는 구현된 test technique과 assertion의 정적 검토이며 실제 통과 결과가 아닙니다.

## 11. 학습 완료 자가 점검

- [x] Commit map의 모든 SHA를 실제로 checkout하거나 diff로 확인했습니다.
- [x] Thread 내 commit 순서를 source와 동일하게 유지했습니다.
- [x] 각 A/S commit에서 직전 상태, decision, failure boundary, guarantee와 non-guarantee를 구분했습니다.
- [x] B commit은 thread 흐름에서 필요한 구현 역할과 state change를 확인했습니다.
- [x] Fix commit을 독립 feature가 아니라 기존 가정 → failure → root cause → corrected invariant로 설명했습니다.
- [x] Test commit에서 production invariant, failure injection, technique, traversed production path, proves/does-not-prove를 구분했습니다.
- [x] Invariant ledger의 모든 주장에 해당 SHA의 code/test evidence가 있습니다.
- [x] Final HEAD의 code를 과거 commit 설명에 소급하지 않았습니다.
- [x] Thread 최종 흐름을 code 없이 설명할 수 있습니다.
