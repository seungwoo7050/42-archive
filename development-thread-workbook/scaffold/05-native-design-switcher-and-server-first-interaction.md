# Thread: Native design switcher and server-first interaction

> Project: 42 Archive Portfolio (`web/portfolio`)
>
> 이 문서는 source에서 확정된 thread 구조와 commit 역할만 미리 제공합니다. 실제 구현 해석, code evidence, failure 재현, test 결과, 최종 설명은 해당 SHA의 코드를 직접 확인해 작성합니다.

## 1. Thread 목표

Native `<details>` 기반 design switcher가 client wrapper로 시작해 pre-hydration race를 드러내고, fix와 deterministic test를 거쳐 server-rendered markup과 최소 client action으로 축소되는 과정을 복원합니다.

**Source-defined significance**

> The switcher begins as a client component built around native semantics, exposes a hydration race, and is then reduced to server markup plus the smallest required client action. The thread shows a concrete progression from behavior implementation to root-cause correction and boundary simplification.

### 이 Thread에 직접 연결되는 Critical Invariants

- Design order는 `SITE_DESIGNS`, 표시 문구는 presentation content가 소유합니다. — `e43e8addd7f3`
- Explicit close는 owning `<details>`를 닫고 summary로 focus를 복원합니다. — `c69ef85c98b2`
- Hydration 전 변경된 native `open` state는 유효한 사용자/browser state입니다. — `c702b870d57a → b6c0238ab8b8`
- Static switcher markup은 server에서 렌더링되고 imperative close만 client boundary가 소유합니다. — `a37cb8596733`
- Selector module은 다시 top-level client component나 `useRef` owner가 되지 않습니다. — `1ac7813155c6`

### 연결되는 Major Engineering Difficulty

- Native `<details>` behavior를 server rendering, pre-hydration interaction, explicit closure, keyboard-focus restoration과 함께 보존하는 문제

## 2. 이 Thread를 이해하기 위한 핵심 질문

- Native disclosure semantics를 쓰면서도 처음에는 어떤 client state/ref 책임이 component 전체를 hydration boundary로 만들었는가?
- Close 동작은 왜 `open=false`만이 아니라 summary focus restoration까지 포함해야 하는가?
- Hydration 전에 사용자가 `<details>`를 연 경우 React의 어떤 가정이 깨지는가?
- Hydration warning suppression fix와 server-first refactor는 각각 무엇을 해결하는가?
- 마지막 structural test는 client boundary가 다시 커지는 회귀를 어떻게 막는가?

## 3. 완료 기준

- 초기 client state/ref, native DOM state, hydration, explicit close 흐름을 시간 순서로 그렸습니다.
- `c702b870d57a`의 기존 가정 → race → root cause → 최소 fix를 element/property 수준에서 설명할 수 있습니다.
- `b6c0238ab8b8`의 exact SSR/pre-hydration/hydration 재현 순서를 기록했습니다.
- `a37cb8596733` 이후 server component와 `DesignSwitcherClose`의 책임을 확인했습니다.
- `1ac7813155c6`이 증명하는 것과 증명하지 않는 것을 구분했습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Source에서 확정된 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `e43e8addd7f3` | feat(designs): 디자인 선택기 상태와 trigger 추가 | B | RENDERER | Builds the initial hydrated native disclosure wrapper. |
| 2 | `c69ef85c98b2` | feat(designs): 디자인 선택 목록과 닫기 동작 추가 | A | ARCH, RENDERER | Adds explicit closure and keyboard-focus restoration. |
| 3 | `c702b870d57a` | fix(ui): hydration 중 native details 상태 보존 | A | DEBUG | Recognizes pre-hydration native state as legitimate. |
| 4 | `b6c0238ab8b8` | test(ui): details hydration 경쟁 조건 검증 | A | VALIDATION, TEST | Reproduces the server/browser/React race. |
| 5 | `a37cb8596733` | refactor(ui): 디자인 선택기를 server markup으로 전환 | A | ARCH, REFACTOR | Moves static disclosure markup back to the server and isolates imperative closure. |
| 6 | `1ac7813155c6` | test(ui): server 선택기와 focus 복원 검증 | A | VALIDATION, A11Y, TEST | Prevents the server boundary from silently becoming a hydrated component again. |

## 5. Commit별 학습 기록

각 section은 반드시 해당 SHA를 checkout한 상태에서 작성합니다. Thread 내 이전 commit은 비교 대상으로 사용할 수 있지만 final HEAD를 정답처럼 소급하지 않습니다.

### 1. `e43e8addd7f3` — feat(designs): 디자인 선택기 상태와 trigger 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined thread role:** Builds the initial hydrated native disclosure wrapper.
- **Source classification summary:** Introduced the client-side state and trigger for a route-preserving design switcher.
- **Source classification reason:** Competent implementation within an established design; it advances the finished product but contains limited branch-wide architectural judgment.

#### Source에서 확정된 구현 의도와 상태 변화

Client-side design switcher의 native `<details>/<summary>` trigger와 state context를 만들고 `SITE_DESIGNS`를 order source로, presentation templates를 label/description source로 사용합니다.

#### 해당 SHA에서 확인할 실제 코드

- Component의 top-level client directive와 state/ref/hook 사용을 확인합니다.
- `<details>/<summary>` markup과 current design fallback 계산을 추적합니다.
- Registry order와 presentation label을 join하는 key를 확인합니다.
- Position/total summary label의 interpolation template을 찾습니다.
- Selection panel과 explicit close가 아직 없는 초기 boundary를 기록합니다.

확인 원칙:

- 먼저 `e43e8addd7f3^`와 `e43e8addd7f3`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Native semantics와 React client ownership의 조합 |  |
| Design identity와 user-facing copy의 서로 다른 source |  |
| Unknown active ID fallback |  |
| 이 시점의 미완성 interaction 범위 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

### 2. `c69ef85c98b2` — feat(designs): 디자인 선택 목록과 닫기 동작 추가

- **Importance:** A
- **Tags:** ARCH, RENDERER
- **Source-defined thread role:** Adds explicit closure and keyboard-focus restoration.
- **Source classification summary:** Completed the design-switcher sheet with an ordered list of registered designs, active-state semantics, palette previews, and explicit closing behavior.
- **Source classification reason:** Significant because it standardizes a cross-route design, navigation, shell, or dispatch boundary instead of adding isolated page markup.

#### Source에서 확정된 구현 의도와 상태 변화

Ordered design option list, active `aria-current`, palette preview, route-preserving links, close button을 완성합니다. Explicit close는 `<details>`의 open state를 제거하고 summary trigger로 focus를 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- Current path와 debug state를 보존한 design URL 생성 호출을 확인합니다.
- Option order, active item, `aria-current`, palette swatch를 확인합니다.
- Close handler가 owning `<details>`와 summary를 찾는 ref/DOM path를 추적합니다.
- Open state 변경 후 focus restoration 순서를 확인합니다.
- Design link navigation과 explicit close의 역할 차이를 확인합니다.
- Keyboard-only로 open, option navigation, close, focus return을 실행합니다.

확인 원칙:

- 먼저 `c69ef85c98b2^`와 `c69ef85c98b2`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Disclosure state와 route navigation state 구분 |  |
| Active-state semantics |  |
| Close와 focus restoration invariant |  |
| Mobile sheet에서도 동일 DOM owner를 쓰는지 |  |
| 아직 hydration race를 고려하지 않은 가정 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

### 3. `c702b870d57a` — fix(ui): hydration 중 native details 상태 보존

- **Importance:** A
- **Tags:** DEBUG
- **Source-defined thread role:** Recognizes pre-hydration native state as legitimate.
- **Source classification summary:** Mark the native design-switcher `details` element as an intentional hydration boundary.
- **Source classification reason:** Significant because it corrects a non-obvious build, integration, or runtime failure at the layer that owns the violated invariant.

#### Source에서 확정된 구현 의도와 상태 변화

SSR markup 도착 후 hydration 전에 browser/user가 native `<details>`의 `open`을 바꿀 수 있음을 인정하고 owning element에서 transient mismatch warning을 의도적으로 억제해 current open state를 보존합니다.

#### 해당 SHA에서 확인할 실제 코드

- Fix 전 React가 server/client markup 동일성을 가정하던 owning element를 확인합니다.
- `suppressHydrationWarning`이 정확히 `<details>`에 적용되는지 확인합니다.
- Hydration 시 open state를 강제로 reset하는 code가 없는지 확인합니다.
- Post-hydration close/focus logic이 유지되는지 비교합니다.
- Suppression 범위가 element-level인지 기록합니다.

확인 원칙:

- 먼저 `c702b870d57a^`와 `c702b870d57a`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 기존 가정: hydration 전 DOM state는 변하지 않음 |  |
| 실제 risk: native interaction이 open attribute를 변경 |  |
| Root cause: browser-owned state와 React comparison 충돌 |  |
| 수정된 invariant: current native open state 보존 |  |
| 실제 수정 code와 영향받지 않는 close/focus path |  |
| Server-first boundary까지는 달성하지 않은 범위 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

### 4. `b6c0238ab8b8` — test(ui): details hydration 경쟁 조건 검증

- **Importance:** A
- **Tags:** VALIDATION, TEST
- **Source-defined thread role:** Reproduces the server/browser/React race.
- **Source classification summary:** Reproduce the design-switcher hydration race directly and lock down the intended invariant.
- **Source classification reason:** Significant because it locks down a cross-cutting contract or production-relevant regression rather than adding routine component coverage.

#### Source에서 확정된 구현 의도와 상태 변화

Switcher를 server-render하고 hydration 전에 native `<details>`를 연 뒤 같은 tree를 hydrate하는 race를 직접 재현합니다. Open attribute 유지와 hydration diagnostic 부재를 검증하고 cleanup을 명시합니다.

#### 해당 SHA에서 확인할 실제 코드

- Server render API와 생성 HTML을 DOM에 설치하는 순서를 확인합니다.
- Hydration 전에 `<details>.open` 또는 attribute를 변경하는 line을 찾습니다.
- Console/error diagnostic spy가 어떤 channel을 capture하는지 확인합니다.
- Hydration 후 open state와 diagnostic assertions를 확인합니다.
- Unmount, spy restoration, DOM cleanup을 확인합니다.

확인 원칙:

- 먼저 `b6c0238ab8b8^`와 `b6c0238ab8b8`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 대상 production invariant |  |
| 주입한 race timing과 native state mutation |  |
| SSR + pre-hydration DOM mutation + hydrate technique |  |
| 실제 production component path |  |
| 증명하는 것: open 보존과 hydration error 부재 |  |
| 증명하지 않는 것: 모든 browser timing, focus restoration, server-only boundary |  |
| 후속 refactor에서 유지할 contract |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

### 5. `a37cb8596733` — refactor(ui): 디자인 선택기를 server markup으로 전환

- **Importance:** A
- **Tags:** ARCH, REFACTOR
- **Source-defined thread role:** Moves static disclosure markup back to the server and isolates imperative closure.
- **Source classification summary:** Convert the design selector itself from a client component to server-rendered markup and isolate the only imperative behavior in a small `DesignSwitcherClose` client component.
- **Source classification reason:** Significant because it materially narrows ownership or coupling at a boundary used by multiple routes and renderers while preserving established behavior.

#### Source에서 확정된 구현 의도와 상태 변화

Design selector의 static `<details>`, option list, links를 server-rendered component로 바꾸고 DOM mutation과 focus가 필요한 `DesignSwitcherClose`만 client component로 격리합니다.

#### 해당 SHA에서 확인할 실제 코드

- Selector module에서 top-level client directive와 ref/state가 제거되는 diff를 확인합니다.
- Server component props가 serializable한지 확인합니다.
- `DesignSwitcherClose`의 client directive, event target traversal, details lookup을 추적합니다.
- Handler가 open attribute 제거 후 summary focus를 복원하는 순서를 확인합니다.
- Design link의 `onClick`이 제거되고 navigation이 page replacement를 담당하는지 확인합니다.
- Hydration되는 JavaScript boundary가 어디까지 축소됐는지 import graph로 기록합니다.

확인 원칙:

- 먼저 `a37cb8596733^`와 `a37cb8596733`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 client component의 static/imperative 책임 분해 |  |
| Server markup의 immediate native behavior |  |
| Client-only action의 최소 input과 DOM ownership |  |
| Hydration race fix와 함께 유지되는 policy |  |
| Explicit close에는 JS가 필요하지만 list/navigation에는 필요하지 않은 trade-off |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

### 6. `1ac7813155c6` — test(ui): server 선택기와 focus 복원 검증

- **Importance:** A
- **Tags:** VALIDATION, A11Y, TEST
- **Source-defined thread role:** Prevents the server boundary from silently becoming a hydrated component again.
- **Source classification summary:** Add a structural regression check that reads the design-switcher source and rejects either a top-level `"use client"` directive or `useRef` state in the selector component.
- **Source classification reason:** Significant because it restores or verifies an accessibility invariant across designs or routes, where a local presentation defect would otherwise become a site-wide failure.

#### Source에서 확정된 구현 의도와 상태 변화

Selector source를 검사해 top-level `"use client"`와 `useRef`가 다시 들어오는 것을 거부하고 existing explicit-close focus tests와 함께 server/client split을 회귀 계약으로 만듭니다.

#### 해당 SHA에서 확인할 실제 코드

- Test가 selector source file을 읽는 방식과 exact token/pattern을 확인합니다.
- Top-level directive와 incidental string을 어떻게 구분하는지 확인합니다.
- `useRef` 금지가 어떤 ownership 회귀를 뜻하는지 production source와 대조합니다.
- Explicit close/focus behavior test가 어떤 production path를 실행하는지 확인합니다.
- Lockfile movement이 behavior source가 아닌 transitive refresh인지 구분합니다.

확인 원칙:

- 먼저 `1ac7813155c6^`와 `1ac7813155c6`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 대상 invariant: static selector는 server component |  |
| Source-structure regression + interaction regression technique |  |
| 증명하는 것: whole selector hydration 재도입 방지와 focus behavior |  |
| 증명하지 않는 것: bundle byte, 모든 hook, 모든 browser race |  |
| 허용된 `DesignSwitcherClose` boundary와 금지 owner 구분 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

## 6. Invariant ledger

| Invariant | Source에서 확인된 변화 지점 | 해당 SHA의 실제 code/test evidence | 부족함이 드러난 시점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| Design order는 `SITE_DESIGNS`, 표시 문구는 presentation content가 소유합니다. | `e43e8addd7f3` |  |  |  |
| Explicit close는 owning `<details>`를 닫고 summary로 focus를 복원합니다. | `c69ef85c98b2` |  |  |  |
| Hydration 전 변경된 native `open` state는 유효한 사용자/browser state입니다. | `c702b870d57a → b6c0238ab8b8` |  |  |  |
| Static switcher markup은 server에서 렌더링되고 imperative close만 client boundary가 소유합니다. | `a37cb8596733` |  |  |  |
| Selector module은 다시 top-level client component나 `useRef` owner가 되지 않습니다. | `1ac7813155c6` |  |  |  |

Ledger 작성 원칙:

- Source가 명시한 invariant만 사용하고 새 invariant를 확정 사실처럼 추가하지 않습니다.
- 도입, 강화, 부족함 노출, fix, regression test가 서로 다른 commit이면 각 열에 분리해 기록합니다.
- Code evidence에는 실제 field, function, branch, selector, command 또는 assertion을 적습니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 위험 | 대응 commit | 실제 수정/강화 code에서 확인할 것 | Test 또는 실행 증거 |
| --- | --- | --- | --- |
| Initial behavior | e43e8addd7f3 → c69ef85c98b2 | Native disclosure, active item, state-preserving links, close/focus를 구현합니다. | 일반 interaction은 동작하지만 pre-hydration mutation은 아직 고려되지 않습니다. |
| 실제 failure/risk | c702b870d57a | SSR markup과 hydration 사이에 `open`이 바뀌어 mismatch diagnostic이 발생합니다. | Owning `<details>`에서 transient state를 의도된 boundary로 표시합니다. |
| Deterministic regression | b6c0238ab8b8 | Server render → hydration 전 open → hydrate → diagnostic capture를 수행합니다. | Open state 유지와 hydration error 부재를 검증합니다. |
| Boundary simplification | a37cb8596733 → 1ac7813155c6 | Static panel/list/link는 server, close/focus만 client action으로 이동합니다. | Source-structure test로 whole-selector hydration 회귀를 차단합니다. |

## 8. Ownership / state / responsibility 변화

| Concern | Thread 초기 owner/state | Thread 최종 owner/state | 실제 symbol과 호출 경로 |
| --- | --- | --- | --- |
| Disclosure markup/list/link | Client component | Server component |  |
| Native open state | React hydration의 동일 markup 가정 | Browser/user state를 보존하는 owning `<details>` |  |
| Explicit close | Component-wide ref/state | 작은 `DesignSwitcherClose` handler |  |
| Focus restoration | Close와 분리될 위험 | Close handler가 summary를 찾아 복원 |  |
| Regression proof | 일반 interaction test | Hydration race test + source-boundary test |  |

## 9. Thread 최종 상태

### Source에서 확정된 최종 상태

Native `<details>` 기반 design switcher가 client wrapper로 시작해 pre-hydration race를 드러내고, fix와 deterministic test를 거쳐 server-rendered markup과 최소 client action으로 축소되는 과정을 복원합니다.

### 학습자가 완성할 최종 설명

- Thread 시작 시점의 설계와 위험:
- 핵심 architecture/decision이 형성된 순서:
- 실제 failure 또는 부족함이 드러난 지점:
- Fix 또는 boundary 강화가 바꾼 invariant:
- Test/build/browser evidence가 보장한 범위:
- Thread 종료 시점에도 보장하지 않는 범위:

## 10. 최종 architecture 또는 execution flow 정리

아래 source-backed flow의 각 단계에 실제 file path, symbol, input/output, failure branch를 추가합니다.

1. Server가 native `<details>/<summary>`와 design link 목록을 출력합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
2. Browser/user가 hydration 전에도 native disclosure state를 바꿀 수 있습니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
3. Hydration은 transient `open` 차이를 owning boundary에서 유효하게 취급합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
4. Design link는 state-preserving URL로 navigation합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
5. Explicit close button만 client handler를 호출해 `open`을 제거합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
6. Handler가 summary에 focus를 복원합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
7. Regression tests가 hydration race와 server/client boundary를 각각 고정합니다.
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
