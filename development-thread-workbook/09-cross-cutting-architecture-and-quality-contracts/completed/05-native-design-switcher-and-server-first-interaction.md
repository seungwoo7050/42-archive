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
| Native semantics와 React client ownership의 조합 | React client component가 disclosure markup/ref ownership을 갖고 registry는 design identity/order, presentation content는 user-facing copy를 갖습니다. |
| Design identity와 user-facing copy의 서로 다른 source | `src/components/portfolio/design-switcher.tsx`가 `"use client"`, details/summary refs, `SITE_DESIGNS` order, presentation template label/description, current design fallback과 position/total summary text를 사용합니다. |
| Unknown active ID fallback | top-level client `DesignSwitcher`에 `<details>/<summary>`와 ref/state context를 만들었습니다. |
| 이 시점의 미완성 interaction 범위 | option list, route navigation, explicit close/focus와 hydration race 처리는 아직 없습니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** design selection UI가 complete ordered native disclosure로 존재하지 않았습니다.
- **해당 SHA 핵심 코드:** `src/components/portfolio/design-switcher.tsx`가 `"use client"`, details/summary refs, `SITE_DESIGNS` order, presentation template label/description, current design fallback과 position/total summary text를 사용합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `c69ef85c98b2`가 full option sheet와 close behavior를 추가합니다.

#### SHA별 복원 결론

- **Thread 내 역할:** top-level client `DesignSwitcher`에 `<details>/<summary>`와 ref/state context를 만들었습니다.
- **실제 변경:** `src/components/portfolio/design-switcher.tsx`가 `"use client"`, details/summary refs, `SITE_DESIGNS` order, presentation template label/description, current design fallback과 position/total summary text를 사용합니다.
- **현재 보장:** native disclosure trigger와 current-state summary가 렌더링됩니다.
- **남은 범위:** option list, route navigation, explicit close/focus와 hydration race 처리는 아직 없습니다. `c69ef85c98b2`가 full option sheet와 close behavior를 추가합니다.

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
| Disclosure state와 route navigation state 구분 | native `<details>`가 disclosure state를, route link가 navigation state를, explicit close handler가 DOM mutation/focus를 소유합니다. |
| Active-state semantics | native `<details>`가 disclosure state를, route link가 navigation state를, explicit close handler가 DOM mutation/focus를 소유합니다. |
| Close와 focus restoration invariant | close 후 trigger focus가 복원되고 current design/route/debug state가 보존됩니다. |
| Mobile sheet에서도 동일 DOM owner를 쓰는지 | native `<details>`가 disclosure state를, route link가 navigation state를, explicit close handler가 DOM mutation/focus를 소유합니다. |
| 아직 hydration race를 고려하지 않은 가정 | SSR 후 hydration 전 browser가 `open`을 바꾸는 race는 고려하지 않았습니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 초기 switcher는 trigger만 있고 design links와 explicit dismissal가 없었습니다.
- **해당 SHA 핵심 코드:** 같은 component에서 `SITE_DESIGNS` 순서로 option을 만들고 active item에 `aria-current`, palette swatches, current path/debug를 보존한 URL을 제공합니다. Close handler는 owning details의 `open`을 제거한 뒤 summary에 `focus()`합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `c702b870d57a`이 pre-hydration native state를 legitimate state로 인정합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** 초기 switcher는 trigger만 있고 design links와 explicit dismissal가 없었습니다. sheet를 닫은 뒤 keyboard focus가 body로 사라지거나 route state가 유실될 수 있었습니다.
- **구현 결정과 경로:** ordered options, active semantics, state-preserving links와 close→summary focus invariant를 추가했습니다. 같은 component에서 `SITE_DESIGNS` 순서로 option을 만들고 active item에 `aria-current`, palette swatches, current path/debug를 보존한 URL을 제공합니다. Close handler는 owning details의 `open`을 제거한 뒤 summary에 `focus()`합니다.
- **소유권·실패 처리:** native `<details>`가 disclosure state를, route link가 navigation state를, explicit close handler가 DOM mutation/focus를 소유합니다. details/summary refs가 동일 mobile sheet DOM owner를 가리키며 link navigation과 explicit close는 별도 동작입니다.
- **보장:** close 후 trigger focus가 복원되고 current design/route/debug state가 보존됩니다.
- **보장하지 않는 범위:** SSR 후 hydration 전 browser가 `open`을 바꾸는 race는 고려하지 않았습니다.
- **후속 연결:** `c702b870d57a`이 pre-hydration native state를 legitimate state로 인정합니다.

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
| 기존 가정: hydration 전 DOM state는 변하지 않음 | React는 server HTML의 closed `<details>`와 hydration 시 DOM이 동일하다고 가정했습니다. |
| 실제 risk: native interaction이 open attribute를 변경 | root cause는 uncontrolled browser-owned `open`과 React comparison의 충돌이며 suppression 범위는 details element 하나입니다. |
| Root cause: browser-owned state와 React comparison 충돌 | 사용자가 hydration 전에 native summary를 열면 browser가 `open` attribute를 추가해 mismatch diagnostic이 발생할 수 있었습니다. |
| 수정된 invariant: current native open state 보존 | hydration 전 변경된 current native open state를 강제로 덮어쓰지 않습니다. |
| 실제 수정 code와 영향받지 않는 close/focus path | `src/components/portfolio/design-switcher.tsx`의 `<details suppressHydrationWarning>` 한 지점이 수정됐고 기존 close handler와 focus path는 그대로입니다. |
| Server-first boundary까지는 달성하지 않은 범위 | whole selector는 여전히 client component이고 모든 browser timing/focus behavior를 검증한 것은 아닙니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** React는 server HTML의 closed `<details>`와 hydration 시 DOM이 동일하다고 가정했습니다.
- **해당 SHA 핵심 코드:** `src/components/portfolio/design-switcher.tsx`의 `<details suppressHydrationWarning>` 한 지점이 수정됐고 기존 close handler와 focus path는 그대로입니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `b6c0238ab8b8`이 SSR→mutation→hydrate 순서를 deterministic test로 재현합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** React는 server HTML의 closed `<details>`와 hydration 시 DOM이 동일하다고 가정했습니다. 사용자가 hydration 전에 native summary를 열면 browser가 `open` attribute를 추가해 mismatch diagnostic이 발생할 수 있었습니다.
- **구현 결정과 경로:** owning `<details>`에 element-level `suppressHydrationWarning`을 추가하고 open state를 reset하지 않았습니다. `src/components/portfolio/design-switcher.tsx`의 `<details suppressHydrationWarning>` 한 지점이 수정됐고 기존 close handler와 focus path는 그대로입니다.
- **소유권·실패 처리:** browser/user가 transient native open state를 소유하고 React는 이 element의 hydration attribute mismatch를 경고 대상으로 취급하지 않습니다. root cause는 uncontrolled browser-owned `open`과 React comparison의 충돌이며 suppression 범위는 details element 하나입니다.
- **보장:** hydration 전 변경된 current native open state를 강제로 덮어쓰지 않습니다.
- **보장하지 않는 범위:** whole selector는 여전히 client component이고 모든 browser timing/focus behavior를 검증한 것은 아닙니다.
- **후속 연결:** `b6c0238ab8b8`이 SSR→mutation→hydrate 순서를 deterministic test로 재현합니다.

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
| 대상 production invariant | 해당 fixture에서 open state 보존과 hydration diagnostic 부재를 증명합니다. |
| 주입한 race timing과 native state mutation | test fixture가 race timing과 DOM ownership을 통제하고 production component가 hydration path를 제공합니다. |
| SSR + pre-hydration DOM mutation + hydrate technique | test는 `renderToString`→DOM install→native open mutation→`hydrateRoot` 순서로 실제 component path를 실행하고 `console.error`의 hydration diagnostic을 spy합니다. Hydration 후 open 유지/no captured errors를 assert하고 root unmount, spy restore, DOM remove를 cleanup합니다. 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다. |
| 실제 production component path | test는 `renderToString`→DOM install→native open mutation→`hydrateRoot` 순서로 실제 component path를 실행하고 `console.error`의 hydration diagnostic을 spy합니다. Hydration 후 open 유지/no captured errors를 assert하고 root unmount, spy restore, DOM remove를 cleanup합니다. |
| 증명하는 것: open 보존과 hydration error 부재 | 해당 fixture에서 open state 보존과 hydration diagnostic 부재를 증명합니다. |
| 증명하지 않는 것: 모든 browser timing, focus restoration, server-only boundary | 모든 browser scheduler/timing, explicit close focus, server-only boundary와 visual behavior는 증명하지 않습니다. |
| 후속 refactor에서 유지할 contract | `a37cb8596733`이 behavior를 보존하면서 whole selector hydration boundary를 제거합니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** hydration fix가 code comment/convention에만 의존했고 race 재현이 없었습니다.
- **해당 SHA 핵심 코드:** test는 `renderToString`→DOM install→native open mutation→`hydrateRoot` 순서로 실제 component path를 실행하고 `console.error`의 hydration diagnostic을 spy합니다. Hydration 후 open 유지/no captured errors를 assert하고 root unmount, spy restore, DOM remove를 cleanup합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `a37cb8596733`이 behavior를 보존하면서 whole selector hydration boundary를 제거합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** hydration fix가 code comment/convention에만 의존했고 race 재현이 없었습니다. 향후 warning suppression 제거나 controlled state 도입이 same mismatch를 되살릴 수 있었습니다.
- **구현 결정과 경로:** production switcher를 server-render하고 hydration 전에 `details.open = true`로 바꾼 뒤 hydrate하는 deterministic regression을 추가했습니다. test는 `renderToString`→DOM install→native open mutation→`hydrateRoot` 순서로 실제 component path를 실행하고 `console.error`의 hydration diagnostic을 spy합니다. Hydration 후 open 유지/no captured errors를 assert하고 root unmount, spy restore, DOM remove를 cleanup합니다.
- **소유권·실패 처리:** test fixture가 race timing과 DOM ownership을 통제하고 production component가 hydration path를 제공합니다. 실패 주입은 allocation이 아니라 hydration 직전 native property mutation입니다.
- **보장:** 해당 fixture에서 open state 보존과 hydration diagnostic 부재를 증명합니다.
- **보장하지 않는 범위:** 모든 browser scheduler/timing, explicit close focus, server-only boundary와 visual behavior는 증명하지 않습니다.
- **후속 연결:** `a37cb8596733`이 behavior를 보존하면서 whole selector hydration boundary를 제거합니다.

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
| 직전 client component의 static/imperative 책임 분해 | 정적 details/summary/list/links 전체가 top-level client component와 refs 때문에 hydration 대상이었습니다. |
| Server markup의 immediate native behavior | static selector를 server component로 되돌리고 DOM mutation/focus만 작은 `DesignSwitcherClose` client island로 분리했습니다. `src/components/portfolio/design-switcher.tsx`에서 `"use client"`, refs와 link `onClick`이 제거되고 serializable props로 markup을 출력합니다. 새 `design-switcher-close.tsx`는 click target에서 closest details를 찾고 `open` 제거 후 direct child summary에 focus합니다. |
| Client-only action의 최소 input과 DOM ownership | server component가 list/link/disclosure markup을, browser가 native open/navigation을, close island만 imperative DOM/focus를 소유합니다. |
| Hydration race fix와 함께 유지되는 policy | hydration 전 native behavior를 즉시 사용할 수 있고 only explicit close에 client JavaScript가 필요합니다. |
| Explicit close에는 JS가 필요하지만 list/navigation에는 필요하지 않은 trade-off | close action에는 여전히 JS가 필요하고 source boundary가 향후 되돌아가지 않는다는 regression proof는 아직 없습니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 정적 details/summary/list/links 전체가 top-level client component와 refs 때문에 hydration 대상이었습니다.
- **해당 SHA 핵심 코드:** `src/components/portfolio/design-switcher.tsx`에서 `"use client"`, refs와 link `onClick`이 제거되고 serializable props로 markup을 출력합니다. 새 `design-switcher-close.tsx`는 click target에서 closest details를 찾고 `open` 제거 후 direct child summary에 focus합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `1ac7813155c6`이 source structure와 focus behavior를 회귀 계약으로 고정합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** 정적 details/summary/list/links 전체가 top-level client component와 refs 때문에 hydration 대상이었습니다. native semantics로 가능한 markup까지 JavaScript가 소유해 bundle/ownership이 넓고 race surface가 컸습니다.
- **구현 결정과 경로:** static selector를 server component로 되돌리고 DOM mutation/focus만 작은 `DesignSwitcherClose` client island로 분리했습니다. `src/components/portfolio/design-switcher.tsx`에서 `"use client"`, refs와 link `onClick`이 제거되고 serializable props로 markup을 출력합니다. 새 `design-switcher-close.tsx`는 click target에서 closest details를 찾고 `open` 제거 후 direct child summary에 focus합니다.
- **소유권·실패 처리:** server component가 list/link/disclosure markup을, browser가 native open/navigation을, close island만 imperative DOM/focus를 소유합니다. details가 없거나 summary를 찾지 못하면 handler는 해당 DOM path에서 더 진행하지 않으며 navigation은 normal page replacement가 처리합니다.
- **보장:** hydration 전 native behavior를 즉시 사용할 수 있고 only explicit close에 client JavaScript가 필요합니다.
- **보장하지 않는 범위:** close action에는 여전히 JS가 필요하고 source boundary가 향후 되돌아가지 않는다는 regression proof는 아직 없습니다.
- **후속 연결:** `1ac7813155c6`이 source structure와 focus behavior를 회귀 계약으로 고정합니다.

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
| 대상 invariant: static selector는 server component | static selector의 server ownership 재도입 방지와 explicit close focus behavior를 보호합니다. |
| Source-structure regression + interaction regression technique | test가 `design-switcher.tsx` source에서 top-level `"use client"` directive와 `useRef` token을 거부하고, 허용된 `DesignSwitcherClose`의 click path가 `open` 제거와 summary focus를 수행하는지 검사합니다. Lockfile 변경은 transitive refresh로 behavior decision과 구분됩니다. 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다. |
| 증명하는 것: whole selector hydration 재도입 방지와 focus behavior | static selector의 server ownership 재도입 방지와 explicit close focus behavior를 보호합니다. |
| 증명하지 않는 것: bundle byte, 모든 hook, 모든 browser race | bundle byte, 모든 React hook, 모든 browser hydration race와 실제 assistive-technology behavior는 증명하지 않습니다. |
| 허용된 `DesignSwitcherClose` boundary와 금지 owner 구분 | selector source structure는 structural test가, imperative behavior는 small client component test가 소유합니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** server/client split은 구현됐지만 selector에 top-level client directive/ref가 다시 들어오는 것을 자동 차단하지 않았습니다.
- **해당 SHA 핵심 코드:** test가 `design-switcher.tsx` source에서 top-level `"use client"` directive와 `useRef` token을 거부하고, 허용된 `DesignSwitcherClose`의 click path가 `open` 제거와 summary focus를 수행하는지 검사합니다. Lockfile 변경은 transitive refresh로 behavior decision과 구분됩니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** 이 commit이 thread의 server-first boundary와 focus invariant를 최종 regression contract로 만듭니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** server/client split은 구현됐지만 selector에 top-level client directive/ref가 다시 들어오는 것을 자동 차단하지 않았습니다. 기능 test만 통과하면서 whole selector hydration owner가 조용히 재도입될 수 있었습니다.
- **구현 결정과 경로:** selector source를 직접 읽는 structural regression과 existing close/focus interaction test를 결합했습니다. test가 `design-switcher.tsx` source에서 top-level `"use client"` directive와 `useRef` token을 거부하고, 허용된 `DesignSwitcherClose`의 click path가 `open` 제거와 summary focus를 수행하는지 검사합니다. Lockfile 변경은 transitive refresh로 behavior decision과 구분됩니다.
- **소유권·실패 처리:** selector source structure는 structural test가, imperative behavior는 small client component test가 소유합니다. 금지 대상은 whole selector owner이고 `DesignSwitcherClose` client boundary 자체는 허용됩니다.
- **보장:** static selector의 server ownership 재도입 방지와 explicit close focus behavior를 보호합니다.
- **보장하지 않는 범위:** bundle byte, 모든 React hook, 모든 browser hydration race와 실제 assistive-technology behavior는 증명하지 않습니다.
- **후속 연결:** 이 commit이 thread의 server-first boundary와 focus invariant를 최종 regression contract로 만듭니다.

## 6. Invariant ledger

| Invariant | Source에서 확인된 변화 지점 | 해당 SHA의 실제 code/test evidence | 부족함이 드러난 시점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| Design order는 `SITE_DESIGNS`, 표시 문구는 presentation content가 소유합니다. | `e43e8addd7f3` | `e43e8addd7f3`의 `SITE_DESIGNS` iteration과 presentation template lookup/summary interpolation. | 초기에는 trigger만 있고 complete options/close는 없었습니다. | design ID/order/palette는 registry, label/description/summary copy는 presentation content에서 결합됩니다. |
| Explicit close는 owning `<details>`를 닫고 summary로 focus를 복원합니다. | `c69ef85c98b2` | `c69ef85c98b2` close handler: owning details의 `open` 제거 후 summary `focus()`. | 처음에는 explicit dismissal와 keyboard focus return이 없었습니다. | close action은 disclosure를 닫고 trigger focus를 복원하는 하나의 invariant로 구현됩니다. |
| Hydration 전 변경된 native `open` state는 유효한 사용자/browser state입니다. | `c702b870d57a → b6c0238ab8b8` | `c702b870d57a`의 `<details suppressHydrationWarning>`와 `b6c0238ab8b8`의 SSR→pre-open→hydrate assertions. | React/server markup 동일성 가정이 hydration 전 native mutation을 고려하지 못했습니다. | current browser-owned open state를 reset하지 않고 해당 element mismatch를 허용하며 deterministic regression이 이를 보호합니다. |
| Static switcher markup은 server에서 렌더링되고 imperative close만 client boundary가 소유합니다. | `a37cb8596733` | `a37cb8596733`에서 selector의 client directive/refs/handlers 제거, `DesignSwitcherClose`만 client island. | static list/link까지 whole client component가 소유했습니다. | native disclosure/list/navigation은 server markup+browser가, explicit close/focus만 small client action이 소유합니다. |
| Selector module은 다시 top-level client component나 `useRef` owner가 되지 않습니다. | `1ac7813155c6` | `1ac7813155c6` source test가 selector의 top-level `use client`와 `useRef`를 거부하고 close/focus interaction을 유지합니다. | server-first split이 convention만으로 되돌아갈 수 있었습니다. | whole selector hydration owner 재도입을 structural regression으로 차단합니다. |

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

### 실제 연결 기록

- Fix는 `open`을 React state로 덮어쓰는 것이 아니라 owning `<details>`에서 transient mismatch warning을 억제하고 browser state를 그대로 둡니다.
- Deterministic test의 failure injection은 hydration 전에 `details.open = true`를 설정하는 것입니다. Console diagnostic spy, unmount, spy restore와 DOM cleanup을 확인했습니다.
- Server-first refactor 뒤에는 link/list가 client behavior를 요구하지 않고 explicit close/focus만 작은 island에 남습니다.

## 8. Ownership / state / responsibility 변화

| Concern | Thread 초기 owner/state | Thread 최종 owner/state | 실제 symbol과 호출 경로 |
| --- | --- | --- | --- |
| Disclosure markup/list/link | Client component | Server component | `src/components/portfolio/design-switcher.tsx`: server-rendered details/summary/options/links. |
| Native open state | React hydration의 동일 markup 가정 | Browser/user state를 보존하는 owning `<details>` | native `<details>` element/browser: user가 hydration 전후 변경하는 `open` state; owning element에 warning suppression. |
| Explicit close | Component-wide ref/state | 작은 `DesignSwitcherClose` handler | `design-switcher-close.tsx::DesignSwitcherClose` click handler: closest details lookup과 `open` removal. |
| Focus restoration | Close와 분리될 위험 | Close handler가 summary를 찾아 복원 | same close handler: direct summary lookup 후 focus restoration. |
| Regression proof | 일반 interaction test | Hydration race test + source-boundary test | hydration race test + selector source-structure test + close/focus interaction test. |

## 9. Thread 최종 상태

### Source에서 확정된 최종 상태

Native `<details>` 기반 design switcher가 client wrapper로 시작해 pre-hydration race를 드러내고, fix와 deterministic test를 거쳐 server-rendered markup과 최소 client action으로 축소되는 과정을 복원합니다.

### 학습자가 완성할 최종 설명

- **Thread 시작 시점의 설계와 위험:** 초기 switcher는 native details를 사용했지만 top-level client component와 refs가 static markup 전체를 hydration boundary로 만들었습니다.
- **핵심 architecture/decision이 형성된 순서:** trigger/context → option list/navigation/close-focus → hydration mismatch fix → deterministic race test → server markup/client island split → structural regression 순서로 발전했습니다.
- **실제 failure 또는 부족함이 드러난 지점:** SSR closed markup 뒤 사용자가 hydration 전에 details를 열면 browser `open`과 React comparison이 충돌하는 non-obvious race가 드러났습니다.
- **Fix 또는 boundary 강화가 바꾼 invariant:** element-level suppression은 current native state를 보존했고 server-first refactor는 race surface와 hydrated responsibility 자체를 줄였습니다.
- **Test/build/browser evidence가 보장한 범위:** test code의 exact timing, assertions와 cleanup을 정적으로 검토했습니다. JSDOM/browser test를 실제 실행하지 않았습니다.
- **Thread 종료 시점에도 보장하지 않는 범위:** 모든 browser timing, bundle byte, explicit close의 JS-free 동작과 assistive technology 전반은 보장하지 않습니다.

## 10. 최종 architecture 또는 execution flow 정리

아래 source-backed flow의 각 단계에 실제 file path, symbol, input/output, failure branch를 추가합니다.

1. Server가 native `<details>/<summary>`와 design link 목록을 출력합니다.
   - 실제 코드 위치: `src/components/portfolio/design-switcher.tsx` server component
   - 입력과 출력: serializable props, `SITE_DESIGNS`, presentation copy와 current path/debug를 받아 native details/summary/options/links HTML을 출력합니다.
   - 실패/absence 처리: unknown design은 registry fallback을 사용하고 content copy가 없으면 해당 data contract failure가 upstream에 드러납니다.
2. Browser/user가 hydration 전에도 native disclosure state를 바꿀 수 있습니다.
   - 실제 코드 위치: browser native `<details>` behavior
   - 입력과 출력: summary activation이 JavaScript/hydration 전에도 element `open` state를 토글합니다.
   - 실패/absence 처리: native behavior 자체가 없으면 platform support 범위이며 React controlled reset code는 없습니다.
3. Hydration은 transient `open` 차이를 owning boundary에서 유효하게 취급합니다.
   - 실제 코드 위치: same `<details suppressHydrationWarning>`
   - 입력과 출력: hydration이 server closed attribute와 current browser open attribute 차이를 element-level transient state로 허용합니다.
   - 실패/absence 처리: suppression은 다른 descendants/global mismatch를 숨기는 범위가 아닙니다.
4. Design link는 state-preserving URL로 navigation합니다.
   - 실제 코드 위치: design URL builder와 server-rendered links
   - 입력과 출력: current path, selected design와 debug query를 결합한 href로 normal navigation합니다.
   - 실패/absence 처리: link click handler로 disclosure를 수동 닫지 않으며 navigation failure는 route layer로 전파됩니다.
5. Explicit close button만 client handler를 호출해 `open`을 제거합니다.
   - 실제 코드 위치: `DesignSwitcherClose` client click handler
   - 입력과 출력: event target에서 closest details를 찾아 `open` attribute를 제거합니다.
   - 실패/absence 처리: owning details를 찾지 못하면 mutation을 수행하지 않습니다.
6. Handler가 summary에 focus를 복원합니다.
   - 실제 코드 위치: same handler의 summary lookup/focus
   - 입력과 출력: details direct child summary를 찾아 `.focus()`로 keyboard position을 복구합니다.
   - 실패/absence 처리: summary가 없으면 focus restoration을 수행할 target이 없습니다.
7. Regression tests가 hydration race와 server/client boundary를 각각 고정합니다.
   - 실제 코드 위치: hydration test와 source/interaction tests
   - 입력과 출력: SSR→mutation→hydrate 및 source token/close-focus assertions로 두 regression class를 분리합니다.
   - 실패/absence 처리: fixture 밖 browser scheduling, bundle size와 visual layout은 test 범위가 아닙니다.

### 코드 없이 설명하기

> 이 Thread의 최종 실행 흐름을 code snippet 없이 자신의 말로 작성합니다. 설계 → 구현 → failure/risk → 수정/강화 → 검증 순서가 드러나야 합니다.

native details 기반 switcher는 처음에 전체 client component였고 option links와 explicit close/focus를 구현했습니다. 그러나 server HTML이 도착한 뒤 hydration 전에 사용자가 details를 열 수 있어 React가 예상한 closed markup과 browser state가 충돌했습니다. Owning element에서 그 transient mismatch를 허용하고 exact race를 test로 고정했습니다. 이후 static details, options와 links는 server component로 옮기고 open 제거와 summary focus만 작은 client button에 남겼습니다. 마지막 structural test는 selector가 다시 client/ref owner가 되는 회귀를 막습니다.

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
