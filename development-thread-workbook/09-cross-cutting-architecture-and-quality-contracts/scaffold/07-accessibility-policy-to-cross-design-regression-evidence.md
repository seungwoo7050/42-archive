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
| 초기 motion policy coverage |  |
| 새로 닫힌 repeated-list/timeline gap |  |
| Motion 제거 후 유지되는 information/interaction |  |
| 후속 global policy가 필요한 이유 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

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
| 직전 local policy와 global policy 차이 |  |
| Near-zero 처리와 `none` 처리의 실제 선택 |  |
| Smooth scroll, hover, terminal coverage |  |
| Reduced motion에서도 유지되는 functionality |  |
| Global rule의 potential side effect와 trade-off |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

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
| 기존 가정: shared accent 하나로 모든 surface 대응 |  |
| 실제 risk: dark/light 중 한쪽 대비 부족 |  |
| Root cause: semantic role보다 literal visual identity 공유 |  |
| 수정 decision: surface-specific token |  |
| Regression evidence와 아직 보장하지 않는 color combination |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

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
| 기존 가정: fragment navigation으로 keyboard focus도 이동 |  |
| 실제 failure: visual scroll과 focus position 불일치 |  |
| 수정 code와 shell coverage |  |
| Normal tab order에 새 stop을 추가하지 않는 이유 |  |
| 다음 commit/test와 연결 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

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
| 기존 malformed definition-list assumption |  |
| Root cause와 semantic correction |  |
| CSS adaptation |  |
| 남은 shell focus boundary 복구 |  |
| 다음 broad matrix와 연결 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

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
| 대상 production invariants |  |
| Test matrix의 route/design 범위 |  |
| Real browser, Axe, landmark count, keyboard path technique |  |
| 통과하는 production route/shell/renderer path |  |
| 증명하는 것: configured violations 부재와 structural/focus contract |  |
| 증명하지 않는 것: 모든 assistive technology와 human evaluation |  |
| Broad integration regression으로서 막는 범위 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

## 6. Invariant ledger

| Invariant | Source에서 확인된 변화 지점 | 해당 SHA의 실제 code/test evidence | 부족함이 드러난 시점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| Reduced-motion에서는 nonessential animation, transition, smooth scroll이 기능 전제가 아닙니다. | `29bb40579cb2 → af9191fc15ad` |  |  |  |
| Accent text는 light와 dark surface 모두에서 구분 가능한 token을 사용합니다. | `5a6fd8a802ff` |  |  |  |
| Skip link는 main landmark로 programmatic focus를 이동합니다. | `a15e117cb51b → e1aac08e0e9e` |  |  |  |
| Definition-list 값은 `<dd>`이고 landmarks는 route마다 유일합니다. | `e1aac08e0e9e → 84c71d027630` |  |  |  |
| 모든 enabled route와 five designs는 configured WCAG A/AA scan과 keyboard skip path를 통과합니다. | `84c71d027630` |  |  |  |

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

## 8. Ownership / state / responsibility 변화

| Concern | Thread 초기 owner/state | Thread 최종 owner/state | 실제 symbol과 호출 경로 |
| --- | --- | --- | --- |
| Motion coverage | 개별 selector | Global reduced-motion contract |  |
| Contrast | 하나의 shared accent token | Surface-specific tokens |  |
| Skip navigation | Anchor scroll behavior | Focusable main + keyboard assertion |  |
| Metric semantics | Paragraph inside `<dl>` | Semantic `<dd>` |  |
| Regression proof | 개별 수동 확인 | Route×design browser matrix |  |

## 9. Thread 최종 상태

### Source에서 확정된 최종 상태

국소 reduced-motion 처리에서 시작해 global motion policy, contrast, skip-link focus, semantic definition list를 수정하고 다섯 design과 모든 enabled route를 browser-level WCAG matrix로 검증하는 과정을 복원합니다.

### 학습자가 완성할 최종 설명

- Thread 시작 시점의 설계와 위험:
- 핵심 architecture/decision이 형성된 순서:
- 실제 failure 또는 부족함이 드러난 지점:
- Fix 또는 boundary 강화가 바꾼 invariant:
- Test/build/browser evidence가 보장한 범위:
- Thread 종료 시점에도 보장하지 않는 범위:

## 10. 최종 architecture 또는 execution flow 정리

아래 source-backed flow의 각 단계에 실제 file path, symbol, input/output, failure branch를 추가합니다.

1. User preference가 `prefers-reduced-motion` media query에 전달됩니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
2. Global policy가 animation/transition/smooth scroll을 기능과 분리합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
3. Design-scoped token이 각 surface에서 contrast-safe 값을 제공합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
4. Skip link가 first tab stop으로 나타나 main target에 focus를 이동합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
5. 각 renderer가 banner/main/content-info와 semantic content structure를 출력합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
6. Playwright matrix가 route×design을 열고 Axe와 landmark cardinality를 검사합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
7. 별도 keyboard path가 skip-link focus transfer를 실제 browser에서 검증합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:

### 코드 없이 설명하기

> 이 Thread의 최종 실행 흐름을 code snippet 없이 자신의 말로 작성합니다. 설계 → 구현 → failure/risk → 수정/강화 → 검증 순서가 드러나야 합니다.

## 11. 학습 완료 자가 점검

- [ ] Commit map의 모든 SHA를 실제로 checkout하거나 diff로 확인했습니다.
- [ ] Thread 내 commit 순서를 source와 동일하게 유지했습니다.
- [ ] 각 A/S commit에서 직전 상태, decision, failure boundary, guarantee와 non-guarantee를 구분했습니다.
- [ ] B commit은 thread 흐름에서 필요한 구현 역할과 state change를 확인했습니다.
- [ ] Fix commit을 독립 feature가 아니라 기존 가정 → failure → root cause → corrected invariant로 설명했습니다.
- [ ] Test commit에서 production invariant, failure injection, technique, traversed production path, proves/does-not-prove를 구분했습니다.
- [ ] Invariant ledger의 모든 주장에 해당 SHA의 code/test evidence가 있습니다.
- [ ] Final HEAD의 code를 과거 commit 설명에 소급하지 않았습니다.
- [ ] Thread 최종 흐름을 code 없이 설명할 수 있습니다.
