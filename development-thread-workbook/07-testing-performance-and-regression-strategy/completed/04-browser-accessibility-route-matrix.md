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
| 직전 state와 부족함 | jsdom tests는 page output을 확인했지만 실제 browser request, CSS viewport, native disclosure, focus와 image loading을 관찰하지 못했습니다. 또한 all-design coverage가 Home 중심이어서 다른 route의 design dispatch 누락이 남을 수 있었습니다. |
| 실제 변경 file/symbol/call path | Playwright를 설치하고 deterministic local web server를 사용하는 config와 약 489-line browser suite를 추가합니다. Suite는 source JSON에서 enabled route와 expected content를 구성하고, 다섯 design을 desktop/mobile project에서 방문하여 route response와 presentation root를 검사합니다. |
| Data/state/DOM/resource owner와 lifetime | Route availability의 source는 `site.json`, design vocabulary는 presentation/config와 test matrix가 소유합니다. Browser page가 production Next route를 요청하고, Playwright는 network/DOM/layout/focus를 관찰합니다. 이 commit 시점에는 matrix helper가 `portfolio.spec.ts` 내부에 있습니다. |
| Failure·absence·fallback·cleanup | Invalid `view`는 default presentation으로 돌아가야 하고, mobile/desktop에서 horizontal overflow나 unusable touch/focus state가 드러나면 test가 실패합니다. Single worker는 Next development compiler의 cold-route invalidation을 피하지만 concurrency behavior를 검증하지 않습니다. |
| Test technique와 실행 증거 | Broad Playwright integration characterization입니다. 실제 Chromium 계열 page, CSS, native controls와 links를 통과합니다. Visual pixel comparison과 Axe rule engine은 아직 없습니다. |
| 보장하는 것 | 다섯 design이 enabled public routes에서 response·root·핵심 content/navigation을 유지하고 desktop/mobile browser에서 기본 interaction/layout contract를 충족하는지 한 suite에서 확인할 수 있습니다. |
| 보장하지 않는 것 | Cross-browser 보장, exact visual baseline, WCAG 전체, production build artifact, disabled route와 모든 dynamic data state는 보장하지 않습니다. 한 worker이므로 병렬 route compilation 회귀도 탐지하지 않습니다. |
| 다음 commit/관련 test 연결 | `1598a87702f6`는 browser보다 빠른 renderer compatibility matrix를 추가하고, `84c71d...`가 이 matrix의 route/design vocabulary를 `site-matrix.ts`로 추출해 Axe suite와 공유합니다. `882a...`는 같은 Playwright projects를 snapshot baseline에 사용합니다. |

#### 최소 code evidence

- **Commit:** `31c438b52e4b5f87d7e88ce047dd1997aa8ef054`
- **Excerpt:** 생략했습니다. 이 commit의 핵심은 여러 assertion/configuration에 걸쳐 있어 일부 줄만 인용하면 test 범위를 왜곡할 수 있습니다.
- **대신 확인한 위치:** `package.json`의 `test:e2e` script와 `@playwright/test` dependency; `playwright.config.ts`의 testDir, timeout, single worker, webServer와 `chromium`/`mobile-chrome` projects; `tests/e2e/portfolio.spec.ts` 내부의 design IDs, enabled route definitions와 content JSON fixture

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command | 미실행 |
| 실제 결과 | 실행 환경에서 `github.com` DNS 해석이 실패하여 repository를 local clone하지 못했습니다. 따라서 이 문서의 역사 증거는 GitHub의 exact commit API에서 확인한 parent diff, changed file, 해당 SHA의 file content와 branch-local classification에 한정합니다. Vitest·Playwright·Axe·screenshot·performance command는 실행하지 않았고, 통과했다고 기록하지 않습니다. |
| 정적 검토 범위 | Exact commit diff, changed files, 위에 열거한 symbol/test/config |

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
| 직전 state와 부족함 | Shared accent와 Editorial vermilion 계열이 여러 surface에서 재사용되었습니다. 특히 밝은 paper용 text token을 dark panel에서도 쓰는 구조는 배경별 대비 요구를 하나의 값으로 만족한다고 가정했습니다. |
| 실제 변경 file/symbol/call path | Shared accent를 더 어두운 값으로 조정하고 dark tooltip text를 밝은 고정색으로 바꿨습니다. Editorial에서는 base vermilion을 조정하고 `--vermilion-on-dark`를 추가하여 dark architecture/curation/gap surfaces의 labels와 evidence text에 별도 적용했습니다. |
| Data/state/DOM/resource owner와 lifetime | 각 renderer stylesheet가 surface-specific color ownership을 가집니다. 밝은 배경 text는 `--vermilion-text`, dark surface text는 `--vermilion-on-dark`가 담당하도록 책임이 분리됩니다. |
| Failure·absence·fallback·cleanup | 이 SHA의 diff에는 ratio calculator, fixture 또는 test가 없습니다. 따라서 수치상 WCAG 통과를 runtime evidence로 주장할 수 없고, 변경되지 않은 selector나 dynamic color 조합은 별도 검증이 필요합니다. |
| Test technique와 실행 증거 | Targeted CSS accessibility fix입니다. Exact property/selector diff를 정적으로 확인했습니다. |
| 보장하는 것 | 문제가 확인된 shared/Editorial foreground-background 조합이 더 이상 같은 약한 token을 공유하지 않도록 code policy가 바뀝니다. |
| 보장하지 않는 것 | 모든 텍스트·state·pseudo-element의 contrast, forced-colors, user stylesheet와 실제 device rendering은 보장하지 않습니다. |
| 다음 commit/관련 test 연결 | `84c71d027630`의 Axe route×design matrix가 resulting pages의 자동 검출 가능한 contrast/semantic violations를 검사하도록 연결됩니다. |

#### 최소 code evidence

- **Commit:** `5a6fd8a802ffa82bbe615563a864c413ec4264aa`
- **Path:** `src/designs/editorial/editorial-route.module.css`
- **Location:** Editorial root tokens와 dark section selector

```css
--vermilion-text: #a93222;
--vermilion-on-dark: #e15b43;

.darkSectionTitle > span {
  color: var(--vermilion-on-dark);
}
```

이 excerpt는 위 state/ownership/contract를 식별하는 데 필요한 부분만 남긴 것입니다.

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command | 미실행 |
| 실제 결과 | 실행 환경에서 `github.com` DNS 해석이 실패하여 repository를 local clone하지 못했습니다. 따라서 이 문서의 역사 증거는 GitHub의 exact commit API에서 확인한 parent diff, changed file, 해당 SHA의 file content와 branch-local classification에 한정합니다. Vitest·Playwright·Axe·screenshot·performance command는 실행하지 않았고, 통과했다고 기록하지 않습니다. |
| 정적 검토 범위 | Exact commit diff, changed files, 위에 열거한 symbol/test/config |

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
| 직전 state와 부족함 | Skip link href가 main ID를 가리켜 scroll 위치는 바뀔 수 있었지만, main landmark가 programmatically focusable하지 않으면 Enter 뒤 keyboard focus가 반복 navigation을 건너뛰었다고 보장할 수 없었습니다. |
| 실제 변경 file/symbol/call path | Shared shell, Cinematic frame, Editorial shell의 `<main>`에 `tabIndex={-1}`를 추가했습니다. 이는 일반 Tab 순서에는 넣지 않으면서 fragment navigation 시 focus target이 될 수 있게 합니다. |
| Data/state/DOM/resource owner와 lifetime | 각 renderer shell이 자신의 main ID와 landmark를 소유합니다. Browser가 fragment navigation/focus transition을 수행하고 component는 focusability contract만 제공합니다. |
| Failure·absence·fallback·cleanup | 이 commit은 세 shell만 수정합니다. Brutalist main은 아직 누락되어 있고, 실제 첫 Tab→Enter→focus sequence를 자동화하지 않습니다. 잘못된 href/duplicate ID도 여기서 검사하지 않습니다. |
| Test technique와 실행 증거 | Cross-renderer accessibility fix입니다. Static JSX diff를 확인했고 browser command는 실행하지 않았습니다. |
| 보장하는 것 | Shared, Cinematic, Editorial routes에서 skip target main이 programmatic focus를 받을 수 있는 markup이 됩니다. |
| 보장하지 않는 것 | Brutalist, custom renderer, assistive technology announcement, sticky-header scroll offset와 browser별 fragment focus 차이는 보장하지 않습니다. |
| 다음 commit/관련 test 연결 | `e1aac08e0e9e`가 Brutalist main을 같은 invariant에 포함하고, `84c71d027630`이 keyboard sequence를 browser test로 고정합니다. |

#### 최소 code evidence

- **Commit:** `a15e117cb51b0c4611a8e8c418e2d4d1f702d3fd`
- **Path:** `src/components/portfolio/site-shell.tsx`
- **Location:** PageShell main landmark

```tsx
<main
  data-home-template={homeTemplate}
  id="main-content"
  tabIndex={-1}
>
```

이 excerpt는 위 state/ownership/contract를 식별하는 데 필요한 부분만 남긴 것입니다.

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command | 미실행 |
| 실제 결과 | 실행 환경에서 `github.com` DNS 해석이 실패하여 repository를 local clone하지 못했습니다. 따라서 이 문서의 역사 증거는 GitHub의 exact commit API에서 확인한 parent diff, changed file, 해당 SHA의 file content와 branch-local classification에 한정합니다. Vitest·Playwright·Axe·screenshot·performance command는 실행하지 않았고, 통과했다고 기록하지 않습니다. |
| 정적 검토 범위 | Exact commit diff, changed files, 위에 열거한 symbol/test/config |

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
| 직전 state와 부족함 | 앞 commit이 세 shell의 main focusability를 고쳤지만 Brutalist는 별도 shell이라 빠져 있었습니다. 또한 metric definition list의 description을 일반 paragraph로 넣어 term/value 관계를 semantic structure가 완전히 표현하지 못했습니다. |
| 실제 변경 file/symbol/call path | Brutalist main에 `tabIndex={-1}`를 추가하고 각 metric description을 `<p>` 대신 추가 `<dd>`로 렌더링했습니다. CSS는 element name 의존 대신 semantic class를 대상으로 바꿨습니다. |
| Data/state/DOM/resource owner와 lifetime | Brutalist shell이 main focus target을 소유합니다. Metric term 뒤의 value와 optional description 모두 definition value로 DOM semantics에 포함되고 stylesheet는 class presentation만 소유합니다. |
| Failure·absence·fallback·cleanup | Description이 없는 metric은 추가 `<dd>`를 렌더링하지 않습니다. 이 fix는 Brutalist home metric block만 다루며 다른 custom `<dl>` 구조를 전수 검사하지 않습니다. |
| Test technique와 실행 증거 | Semantic markup correction입니다. JSX/CSS diff를 확인했지만 accessibility tree 또는 screen reader output을 실행하지 않았습니다. |
| 보장하는 것 | Brutalist도 skip-link focus invariant에 들어오고, metric description이 definition list의 value semantics로 표현됩니다. |
| 보장하지 않는 것 | 읽기 순서의 실제 announcement, terminology quality, all-page landmarks와 WCAG 전체 준수는 보장하지 않습니다. |
| 다음 commit/관련 test 연결 | `84c71d027630`이 all-design enabled-route Axe scan과 skip-link keyboard flow를 추가하여 세 accessibility fixes를 broader matrix에 연결합니다. |

#### 최소 code evidence

- **Commit:** `e1aac08e0e9e65695b0a60d53eacd812b88c1d76`
- **Path:** `src/designs/brutalist/brutalist-route.tsx`
- **Location:** HomeView metric definition list

```tsx
<dt>{metric.label}</dt>
<dd>{String(metric.value).padStart(2, "0")}</dd>
{metric.description ? (
  <dd className={styles.metricDescription}>
    {metric.description}
  </dd>
) : null}
```

이 excerpt는 위 state/ownership/contract를 식별하는 데 필요한 부분만 남긴 것입니다.

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command | 미실행 |
| 실제 결과 | 실행 환경에서 `github.com` DNS 해석이 실패하여 repository를 local clone하지 못했습니다. 따라서 이 문서의 역사 증거는 GitHub의 exact commit API에서 확인한 parent diff, changed file, 해당 SHA의 file content와 branch-local classification에 한정합니다. Vitest·Playwright·Axe·screenshot·performance command는 실행하지 않았고, 통과했다고 기록하지 않습니다. |
| 정적 검토 범위 | Exact commit diff, changed files, 위에 열거한 symbol/test/config |

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
| 직전 state와 부족함 | Browser route tests는 이미 있었지만 Axe rule engine, shared route vocabulary와 keyboard skip-link end-state가 없었습니다. Accessibility fixes가 특정 renderer에만 적용되어도 category-wide regression이 이를 보장하지 못했습니다. |
| 실제 변경 file/symbol/call path | `site-matrix.ts`로 design IDs와 enabled routes를 한 owner에 모으고, AxeBuilder가 configured WCAG 2.0/2.1/2.2 A/AA tags로 각 resulting page를 분석하게 했습니다. 각 design마다 enabled routes를 순회하며 landmark cardinality와 violations를 검사하고, 별도 test가 skip-link focus transfer를 실행합니다. |
| Data/state/DOM/resource owner와 lifetime | Content files가 route enablement/first project를 소유하고 site-matrix가 test enumeration을 소유합니다. Production route/renderer가 DOM을 만들고 Playwright+Axe가 browser accessibility tree에 근거한 violations를 관찰합니다. |
| Failure·absence·fallback·cleanup | Enabled project가 없으면 helper가 즉시 error를 던집니다. Non-OK response, wrong design root, duplicate/missing landmarks, Axe violation, focus transfer 실패가 명시적으로 test를 실패시킵니다. Violation formatter는 design/path/node target과 failure summary를 남깁니다. |
| Test technique와 실행 증거 | Browser-level automated accessibility matrix입니다. Axe가 검출 가능한 rules와 scripted keyboard path를 다루며 manual screen-reader/usability review를 대체하지 않습니다. Exact test code는 확인했지만 command는 실행하지 않았습니다. |
| 보장하는 것 | 다섯 design의 모든 enabled route가 동일한 route source를 사용해 자동 accessibility scan을 받고, skip link가 main focus까지 이동해야 하는 regression contract가 생깁니다. |
| 보장하지 않는 것 | Axe 밖의 인지·콘텐츠 품질, 모든 assistive technology/browser, disabled routes, authenticated/dynamic states, color appearance의 수동 판단과 full keyboard journey는 보장하지 않습니다. |
| 다음 commit/관련 test 연결 | 이 Thread의 CSS/markup fixes를 one-off 수정에서 category-wide automated evidence로 승격합니다. Release CI에서 실제 실행되는지는 category 08의 책임입니다. |

#### 최소 code evidence

- **Commit:** `84c71d02763081ccc6d1142f42bc69693f29124c`
- **Path:** `tests/e2e/accessibility.spec.ts`
- **Location:** expectAccessibleRoute

```ts
const results = await new AxeBuilder({ page })
  .withTags([...wcag22AATags])
  .analyze();

expect(results.violations).toEqual([]);
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
| Accessibility는 actual route/design DOM에서 검사한다. | 31c438b52e4b → 84c71d027630 | Playwright server/browser foundation + AxeBuilder | 기반 후 자동화 |
| Color ownership은 light/dark surface별로 분리된다. | 5a6fd8a802ff | Shared accent와 Editorial on-dark token | 수정 |
| 모든 design main은 skip-link focus target이다. | a15e117cb51b → e1aac08e0e9e → 84c71d027630 | tabIndex fixes + first Tab/Enter/main-focus test | 부분 수정→완성→검증 |
| Metric description은 definition value semantics를 갖는다. | e1aac08e0e9e | `<p>`→`<dd>` | 수정 |

## 7. Failure → Fix → Test

| Earlier failure/risk | Fix SHA | Corrected decision | Regression evidence |
| --- | --- | --- | --- |
| Dark surface에서 light-surface token을 재사용해 contrast가 낮아질 위험 | 5a6fd8a802ff | On-dark token 분리 | CSS fix; 후속 Axe scan |
| Skip link가 scroll만 하고 keyboard focus를 옮기지 못할 위험 | a15e117cb51b → e1aac08e0e9e → 84c71d027630 | All-shell main focusability + keyboard assertion | Fix→Fix→Test |
| `<dl>` 내부 description이 term/value 관계를 잃을 위험 | e1aac08e0e9e | Description을 `<dd>`로 변환 | Semantic fix |
| Route/design 추가가 accessibility scan에서 누락될 위험 | 84c71d027630 | Shared `site-matrix.ts`와 enabled-page filtering | Matrix regression |

## 8. Ownership/state/responsibility 변화

| 대상 | 초기 owner/state | 최종 owner/state | Evidence |
| --- | --- | --- | --- |
| Route/design enumeration | Portfolio spec 내부 | Shared `site-matrix.ts` | General E2E와 a11y suite 공유 |
| Surface color policy | Shared token 재사용 | Renderer/surface-specific token | globals + Editorial stylesheet |
| Main focus target | Shell별 불균일 | All five design shells | `tabIndex={-1}` |
| Semantic metric structure | Brutalist presentation markup | Brutalist semantic markup | `dt`/`dd` group |
| Automated evidence | General route checks | Axe + landmark + keyboard checks | `accessibility.spec.ts` |

## 9. 최종 Thread state

다음 내용을 코드 없이 설명합니다: 최종 owner, input→decision→output, failure/absence policy, regression evidence와 명시적 non-guarantee.

최종 상태에서 route/design vocabulary는 shared helper가 content enablement에서 파생하고, Axe suite가 five-design enabled routes를 actual browser에서 분석합니다. Contrast token, focus target과 definition semantics fixes는 같은 matrix 및 skip-link keyboard flow에 연결됩니다. Automated rules는 manual screen-reader와 usability 판단을 대체하지 않습니다.

## 10. 최종 실행 흐름

| 단계 | Owner / mechanism | Input | Output/state | Failure/non-guarantee |
| ---: | --- | --- | --- | --- |
| 1. Matrix construction | `site-matrix.ts` | content pages/projects + design IDs | enabled routes/design URLs | enabled project 없음→error |
| 2. Route render | Next server + renderer | explicit design URL | browser DOM/CSS | non-OK/wrong root |
| 3. Landmark/semantics | Shell/renderer markup | content/view model | main/banner/footer/dl | missing/duplicate/invalid structure |
| 4. Axe analysis | `AxeBuilder` | rendered page | tag-filtered violations | formatted node failures |
| 5. Keyboard verification | Playwright | Tab→Enter | skip link focus→main focus | focus assertion failure |

## 11. 학습 완료 확인

- [x] 모든 referenced SHA를 exact historical diff 기준으로 설명했습니다.
- [x] Commit map의 SHA·순서·subject·importance·tags를 변경하지 않았습니다.
- [x] Fix를 earlier failure/assumption에 연결했습니다.
- [x] Test가 실행하는 production path와 증명하지 않는 범위를 구분했습니다.
- [x] 정적 inspection과 실제 command execution을 구분했습니다.
- [x] Thread-level invariant, ownership과 final flow를 완성했습니다.
- [x] 실행 제한을 명시했습니다: 실행 환경에서 `github.com` DNS 해석이 실패하여 repository를 local clone하지 못했습니다. 따라서 이 문서의 역사 증거는 GitHub의 exact commit API에서 확인한 parent diff, changed file, 해당 SHA의 file content와 branch-local classification에 한정합니다. Vitest·Playwright·Axe·screenshot·performance command는 실행하지 않았고, 통과했다고 기록하지 않습니다.
