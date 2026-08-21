# Thread: Browser accessibility route matrix

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

브라우저 route harness 위에서 design별 contrast, skip-link focusability, definition semantics를 수정하고 shared design×enabled-route Axe/keyboard matrix로 연결하는 과정을 복원합니다.

### 동결된 핵심 invariant

- 각 enabled route/design output에는 하나의 main, banner와 contentinfo landmark가 존재합니다.
- Skip link는 첫 keyboard focus가 되고 activation 뒤 main landmark가 programmatic focus를 받습니다.
- Foreground token은 surface별 contrast 요구에 맞게 분리되며 definition list는 term/value semantics를 유지합니다.
- Accessibility suite와 general E2E suite는 동일한 enabled-route/design matrix를 사용합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 초기 Playwright route matrix가 accessibility automation의 어떤 browser/server foundation을 제공했는가?
- 밝은/어두운 surface에 하나의 color token을 재사용한 가정은 어떻게 수정되었는가?
- Hash target main에 `tabIndex={-1}`가 필요한 이유와 누락된 Brutalist 보강 순서는 무엇인가?
- Axe tags, landmark cardinality와 skip-link keyboard test가 무엇을 증명하고 무엇을 놓치는가?

## 3. 완료 기준

- 각 referenced SHA의 exact parent diff와 resulting changed files를 확인합니다.
- Commit별 previous state, implementation decision, ownership/lifetime, failure path와 non-guarantee를 구분합니다.
- Fix는 earlier assumption과 root cause에 연결하고, test는 production path·technique·proves/does-not-prove를 구분합니다.
- A-level은 subsystem·failure·verification 관계까지, B-level은 local role과 후속 연결까지만 설명합니다.
- Thread-level invariant evolution, Failure → Fix → Test, ownership transfer와 final flow를 코드 없이 설명합니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | 이 Thread에서 확인할 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `31c438b52e4b` | test(e2e): 다섯 디자인의 route matrix 검증 | A | ARCH, VALIDATION, ROUTING | Real-browser five-design route/viewport/interaction foundation |
| 2 | `5a6fd8a802ff` | fix(a11y): 디자인별 색상 대비 보정 | A | A11Y, DEBUG | Surface-specific shared/Editorial contrast token correction |
| 3 | `a15e117cb51b` | fix(a11y): skip link focus target 복원 | A | A11Y, DEBUG | Shared/Cinematic/Editorial skip-target focusability |
| 4 | `e1aac08e0e9e` | fix(a11y): Brutalist 지표의 definition semantics 수정 | A | ARCH, RENDERER, A11Y | Brutalist skip target와 metric definition semantics correction |
| 5 | `84c71d027630` | test(a11y): 디자인×route WCAG 행렬 추가 | A | ARCH, ROUTING, A11Y | Shared site matrix, Axe WCAG scan과 keyboard skip-link regression |

## 5. Commit별 학습 기록

각 section은 해당 SHA의 tree와 parent diff만 기준으로 작성합니다. 같은 SHA가 다른 category Thread에 등장하더라도 여기서는 위 역할과 파일 범위만 설명합니다.

### 1. `31c438b52e4b` — test(e2e): 다섯 디자인의 route matrix 검증

- **Full SHA:** `31c438b52e4b5f87d7e88ce047dd1997aa8ef054`
- **Importance:** A
- **Tags:** ARCH, VALIDATION, ROUTING
- **이 Thread에서의 역할:** Real-browser five-design route/viewport/interaction foundation

#### 해당 SHA에서 확인할 실제 코드

- `package.json`의 `test:e2e` script와 `@playwright/test` dependency
- `playwright.config.ts`의 testDir, timeout, single worker, webServer와 `chromium`/`mobile-chrome` projects
- `tests/e2e/portfolio.spec.ts` 내부의 design IDs, enabled route definitions와 content JSON fixture
- response, design root, heading/content/media, internal href, switcher, invalid view fallback, overflow, reduced-motion, touch/focus assertions
- dev compiler cold-route race를 피하기 위해 worker 수를 1로 둔 이유와 병렬성 비보장

#### Commit-specific investigation

- `31c438b52e4b^`와 `31c438b52e4b`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `Real-browser five-design route/viewport/interaction foundation`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
- Production path와 test path를 분리하고, state/data/resource owner와 lifetime·cleanup을 실제 symbol 기준으로 추적합니다.
- Failure/absence/fallback branch와 test technique을 구분하고, 이 SHA가 보장하지 않는 범위를 명시합니다.
- 다음 후속 관계를 대조하되 later code를 이 SHA의 구현으로 설명하지 않습니다: `1598a87702f6`는 browser보다 빠른 renderer compatibility matrix를 추가하고, `84c71d...`가 이 matrix의 route/design vocabulary를 `site-matrix.ts`로 추출해 Axe suite와 공유합니다. `882a...`는 같은 Playwright projects를 snapshot baseline에 사용합니다.

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

### 2. `5a6fd8a802ff` — fix(a11y): 디자인별 색상 대비 보정

- **Full SHA:** `5a6fd8a802ffa82bbe615563a864c413ec4264aa`
- **Importance:** A
- **Tags:** A11Y, DEBUG
- **이 Thread에서의 역할:** Surface-specific shared/Editorial contrast token correction

#### 해당 SHA에서 확인할 실제 코드

- `src/app/globals.css`의 `--accent` 값과 dark tooltip text color 변경
- `src/designs/editorial/editorial-route.module.css`의 `--vermilion`, `--vermilion-text`, 새 `--vermilion-on-dark`
- dark section title, architecture evidence, next-review, gaps selectors가 어느 token으로 이동하는지
- 이 commit에 계산된 contrast ratio나 자동 test 결과가 포함되지 않았다는 점

#### Commit-specific investigation

- `5a6fd8a802ff^`와 `5a6fd8a802ff`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `Surface-specific shared/Editorial contrast token correction`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
- Production path와 test path를 분리하고, state/data/resource owner와 lifetime·cleanup을 실제 symbol 기준으로 추적합니다.
- Failure/absence/fallback branch와 test technique을 구분하고, 이 SHA가 보장하지 않는 범위를 명시합니다.
- 다음 후속 관계를 대조하되 later code를 이 SHA의 구현으로 설명하지 않습니다: `84c71d027630`의 Axe route×design matrix가 resulting pages의 자동 검출 가능한 contrast/semantic violations를 검사하도록 연결됩니다.

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

### 3. `a15e117cb51b` — fix(a11y): skip link focus target 복원

- **Full SHA:** `a15e117cb51b0c4611a8e8c418e2d4d1f702d3fd`
- **Importance:** A
- **Tags:** A11Y, DEBUG
- **이 Thread에서의 역할:** Shared/Cinematic/Editorial skip-target focusability

#### 해당 SHA에서 확인할 실제 코드

- `src/components/portfolio/site-shell.tsx`의 `#main-content`
- `src/designs/cinematic/cinematic-route.tsx`의 `#cinematic-content`
- `src/designs/editorial/editorial-route.tsx`의 `#editorial-main`
- 각 `<main>`에 동일하게 추가된 `tabIndex={-1}`과 keyboard tab order에 미치는 범위
- Brutalist main이 이 SHA에는 포함되지 않고 다음 fix에서 보강되는 chronology

#### Commit-specific investigation

- `a15e117cb51b^`와 `a15e117cb51b`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `Shared/Cinematic/Editorial skip-target focusability`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
- Production path와 test path를 분리하고, state/data/resource owner와 lifetime·cleanup을 실제 symbol 기준으로 추적합니다.
- Failure/absence/fallback branch와 test technique을 구분하고, 이 SHA가 보장하지 않는 범위를 명시합니다.
- 다음 후속 관계를 대조하되 later code를 이 SHA의 구현으로 설명하지 않습니다: `e1aac08e0e9e`가 Brutalist main을 같은 invariant에 포함하고, `84c71d027630`이 keyboard sequence를 browser test로 고정합니다.

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

### 4. `e1aac08e0e9e` — fix(a11y): Brutalist 지표의 definition semantics 수정

- **Full SHA:** `e1aac08e0e9e65695b0a60d53eacd812b88c1d76`
- **Importance:** A
- **Tags:** ARCH, RENDERER, A11Y
- **이 Thread에서의 역할:** Brutalist skip target와 metric definition semantics correction

#### 해당 SHA에서 확인할 실제 코드

- `src/designs/brutalist/brutalist-route.tsx`의 `#brutalist-main`에 `tabIndex={-1}`
- `HomeView` metric block의 `<dt>`, value `<dd>`, description `<p>` 구조
- description이 두 번째 `<dd className={styles.metricDescription}>`로 바뀌는 semantics
- `src/designs/brutalist/brutalist.module.css` selector가 `.metricBlock p`에서 `.metricDescription`으로 이동하는 점

#### Commit-specific investigation

- `e1aac08e0e9e^`와 `e1aac08e0e9e`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `Brutalist skip target와 metric definition semantics correction`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
- Production path와 test path를 분리하고, state/data/resource owner와 lifetime·cleanup을 실제 symbol 기준으로 추적합니다.
- Failure/absence/fallback branch와 test technique을 구분하고, 이 SHA가 보장하지 않는 범위를 명시합니다.
- 다음 후속 관계를 대조하되 later code를 이 SHA의 구현으로 설명하지 않습니다: `84c71d027630`이 all-design enabled-route Axe scan과 skip-link keyboard flow를 추가하여 세 accessibility fixes를 broader matrix에 연결합니다.

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

### 5. `84c71d027630` — test(a11y): 디자인×route WCAG 행렬 추가

- **Full SHA:** `84c71d02763081ccc6d1142f42bc69693f29124c`
- **Importance:** A
- **Tags:** ARCH, ROUTING, A11Y
- **이 Thread에서의 역할:** Shared site matrix, Axe WCAG scan과 keyboard skip-link regression

#### 해당 SHA에서 확인할 실제 코드

- `package.json`/lockfile의 `@axe-core/playwright` dependency
- 새 `tests/e2e/site-matrix.ts`의 five design IDs, first enabled project, route definitions, page-enabled filtering, `withExplicitDesign`
- `tests/e2e/accessibility.spec.ts`의 WCAG tag set와 `expectAccessibleRoute`
- response, design root, main/banner/contentinfo count, formatted violations, zero-violation assertion
- 첫 `Tab`으로 skip link focus 후 `Enter`로 main focus를 확인하는 keyboard test
- `portfolio.spec.ts`가 같은 matrix helper를 사용하도록 중복을 제거한 integration change

#### Commit-specific investigation

- `84c71d027630^`와 `84c71d027630`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `Shared site matrix, Axe WCAG scan과 keyboard skip-link regression`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
- Production path와 test path를 분리하고, state/data/resource owner와 lifetime·cleanup을 실제 symbol 기준으로 추적합니다.
- Failure/absence/fallback branch와 test technique을 구분하고, 이 SHA가 보장하지 않는 범위를 명시합니다.
- 다음 후속 관계를 대조하되 later code를 이 SHA의 구현으로 설명하지 않습니다: 이 Thread의 CSS/markup fixes를 one-off 수정에서 category-wide automated evidence로 승격합니다. Release CI에서 실제 실행되는지는 category 08의 책임입니다.

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
| Accessibility는 actual route/design DOM에서 검사한다. |  |  |  |
| Color ownership은 light/dark surface별로 분리된다. |  |  |  |
| 모든 design main은 skip-link focus target이다. |  |  |  |
| Metric description은 definition value semantics를 갖는다. |  |  |  |

## 7. Failure → Fix → Test

| Earlier failure/risk | Fix SHA | Corrected decision | Regression evidence |
| --- | --- | --- | --- |
| Dark surface에서 light-surface token을 재사용해 contrast가 낮아질 위험 |  |  |  |
| Skip link가 scroll만 하고 keyboard focus를 옮기지 못할 위험 |  |  |  |
| `<dl>` 내부 description이 term/value 관계를 잃을 위험 |  |  |  |
| Route/design 추가가 accessibility scan에서 누락될 위험 |  |  |  |

## 8. Ownership/state/responsibility 변화

| 대상 | 초기 owner/state | 최종 owner/state | Evidence |
| --- | --- | --- | --- |
| Route/design enumeration |  |  |  |
| Surface color policy |  |  |  |
| Main focus target |  |  |  |
| Semantic metric structure |  |  |  |
| Automated evidence |  |  |  |

## 9. 최종 Thread state

다음 내용을 코드 없이 설명합니다: 최종 owner, input→decision→output, failure/absence policy, regression evidence와 명시적 non-guarantee.

> 학습자 기록:

## 10. 최종 실행 흐름

| 단계 | Owner / mechanism | Input | Output/state | Failure/non-guarantee |
| ---: | --- | --- | --- | --- |
| 1. Matrix construction |  |  |  |  |
| 2. Route render |  |  |  |  |
| 3. Landmark/semantics |  |  |  |  |
| 4. Axe analysis |  |  |  |  |
| 5. Keyboard verification |  |  |  |  |

## 11. 학습 완료 확인

- [ ] 모든 referenced SHA를 exact historical diff 기준으로 설명했습니다.
- [ ] Commit map의 SHA·순서·subject·importance·tags를 변경하지 않았습니다.
- [ ] Fix를 earlier failure/assumption에 연결했습니다.
- [ ] Test가 실행하는 production path와 증명하지 않는 범위를 구분했습니다.
- [ ] 정적 inspection과 실제 command execution을 구분했습니다.
- [ ] Thread-level invariant, ownership과 final flow를 완성했습니다.
- [ ] 실행하지 못한 command가 있으면 환경 사유와 정적 검토 범위를 기록했습니다.
