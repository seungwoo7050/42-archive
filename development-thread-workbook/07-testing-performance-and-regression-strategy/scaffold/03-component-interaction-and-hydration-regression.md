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
| 직전 state와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner와 lifetime |  |
| Failure·absence·fallback·cleanup |  |
| 보장/비보장과 후속 연결 |  |

#### 최소 code evidence

- **Commit:**
- **Path / function / test:**
- **왜 이 excerpt가 필요한가:**

```text
[학습자가 exact SHA에서 필요한 최소 excerpt만 기록]
```

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command |  |
| 실제 결과 또는 실행 불가 사유 |  |
| 정적 검토와 실행 결과의 구분 |  |

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
| 직전 state와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner와 lifetime |  |
| Failure·absence·fallback·cleanup |  |
| Test technique와 실행 증거 |  |
| 보장하는 것 |  |
| 보장하지 않는 것 |  |
| 다음 commit/관련 test 연결 |  |

#### 최소 code evidence

- **Commit:**
- **Path / function / test:**
- **왜 이 excerpt가 필요한가:**

```text
[학습자가 exact SHA에서 필요한 최소 excerpt만 기록]
```

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command |  |
| 실제 결과 또는 실행 불가 사유 |  |
| 정적 검토와 실행 결과의 구분 |  |

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
| 직전 state와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner와 lifetime |  |
| Failure·absence·fallback·cleanup |  |
| Test technique와 실행 증거 |  |
| 보장하는 것 |  |
| 보장하지 않는 것 |  |
| 다음 commit/관련 test 연결 |  |

#### 최소 code evidence

- **Commit:**
- **Path / function / test:**
- **왜 이 excerpt가 필요한가:**

```text
[학습자가 exact SHA에서 필요한 최소 excerpt만 기록]
```

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command |  |
| 실제 결과 또는 실행 불가 사유 |  |
| 정적 검토와 실행 결과의 구분 |  |

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
| 직전 state와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner와 lifetime |  |
| Failure·absence·fallback·cleanup |  |
| Test technique와 실행 증거 |  |
| 보장하는 것 |  |
| 보장하지 않는 것 |  |
| 다음 commit/관련 test 연결 |  |

#### 최소 code evidence

- **Commit:**
- **Path / function / test:**
- **왜 이 excerpt가 필요한가:**

```text
[학습자가 exact SHA에서 필요한 최소 excerpt만 기록]
```

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command |  |
| 실제 결과 또는 실행 불가 사유 |  |
| 정적 검토와 실행 결과의 구분 |  |

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
| 직전 state와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner와 lifetime |  |
| Failure·absence·fallback·cleanup |  |
| Test technique와 실행 증거 |  |
| 보장하는 것 |  |
| 보장하지 않는 것 |  |
| 다음 commit/관련 test 연결 |  |

#### 최소 code evidence

- **Commit:**
- **Path / function / test:**
- **왜 이 excerpt가 필요한가:**

```text
[학습자가 exact SHA에서 필요한 최소 excerpt만 기록]
```

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command |  |
| 실제 결과 또는 실행 불가 사유 |  |
| 정적 검토와 실행 결과의 구분 |  |

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
| 직전 state와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner와 lifetime |  |
| Failure·absence·fallback·cleanup |  |
| Test technique와 실행 증거 |  |
| 보장하는 것 |  |
| 보장하지 않는 것 |  |
| 다음 commit/관련 test 연결 |  |

#### 최소 code evidence

- **Commit:**
- **Path / function / test:**
- **왜 이 excerpt가 필요한가:**

```text
[학습자가 exact SHA에서 필요한 최소 excerpt만 기록]
```

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command |  |
| 실제 결과 또는 실행 불가 사유 |  |
| 정적 검토와 실행 결과의 구분 |  |

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
| 직전 state와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner와 lifetime |  |
| Failure·absence·fallback·cleanup |  |
| Test technique와 실행 증거 |  |
| 보장하는 것 |  |
| 보장하지 않는 것 |  |
| 다음 commit/관련 test 연결 |  |

#### 최소 code evidence

- **Commit:**
- **Path / function / test:**
- **왜 이 excerpt가 필요한가:**

```text
[학습자가 exact SHA에서 필요한 최소 excerpt만 기록]
```

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command |  |
| 실제 결과 또는 실행 불가 사유 |  |
| 정적 검토와 실행 결과의 구분 |  |

## 6. Invariant evolution ledger

| Invariant | 도입/변경 SHA | Historical evidence | 상태 |
| --- | --- | --- | --- |
| Native details가 disclosure state의 base owner다. |  |  |  |
| Explicit close는 summary focus를 복원한다. |  |  |  |
| Pre-hydration open state는 hydrate 뒤 보존된다. |  |  |  |
| Bulk selector markup은 server component에 남는다. |  |  |  |

## 7. Failure → Fix → Test

| Earlier failure/risk | Fix SHA | Corrected decision | Regression evidence |
| --- | --- | --- | --- |
| 선택기를 닫은 뒤 focus가 body에 남을 위험 |  |  |  |
| Native open과 hydration expectation이 충돌할 위험 |  |  |  |
| Static list 전체가 불필요한 client ownership으로 회귀할 위험 |  |  |  |
| Link navigation cancel 상태에서 close semantics를 과도하게 강제할 위험 |  |  |  |

## 8. Ownership/state/responsibility 변화

| 대상 | 초기 owner/state | 최종 owner/state | Evidence |
| --- | --- | --- | --- |
| Disclosure `open` state |  |  |  |
| Static design list/content/href |  |  |  |
| Explicit close/focus |  |  |  |
| Route transition close |  |  |  |
| Regression evidence |  |  |  |

## 9. 최종 Thread state

다음 내용을 코드 없이 설명합니다: 최종 owner, input→decision→output, failure/absence policy, regression evidence와 명시적 non-guarantee.

> 학습자 기록:

## 10. 최종 실행 흐름

| 단계 | Owner / mechanism | Input | Output/state | Failure/non-guarantee |
| ---: | --- | --- | --- | --- |
| 1. Server markup |  |  |  |  |
| 2. Native pre-hydration state |  |  |  |  |
| 3. Hydration boundary |  |  |  |  |
| 4. Explicit close |  |  |  |  |
| 5. Regression evidence |  |  |  |  |

## 11. 학습 완료 확인

- [ ] 모든 referenced SHA를 exact historical diff 기준으로 설명했습니다.
- [ ] Commit map의 SHA·순서·subject·importance·tags를 변경하지 않았습니다.
- [ ] Fix를 earlier failure/assumption에 연결했습니다.
- [ ] Test가 실행하는 production path와 증명하지 않는 범위를 구분했습니다.
- [ ] 정적 inspection과 실제 command execution을 구분했습니다.
- [ ] Thread-level invariant, ownership과 final flow를 완성했습니다.
- [ ] 실행하지 못한 command가 있으면 환경 사유와 정적 검토 범위를 기록했습니다.
