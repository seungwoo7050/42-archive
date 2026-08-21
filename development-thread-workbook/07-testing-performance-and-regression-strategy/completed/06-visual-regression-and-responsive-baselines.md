# Thread: Visual regression and responsive baselines

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

Playwright route/viewport foundation과 renderer/token structural contracts 위에 five-design responsive screenshot baselines와 exact snapshot manifest를 추가하는 과정을 복원합니다.

### 동결된 핵심 invariant

- Visual baseline은 production route/design output과 configured desktop/mobile projects에서 생성됩니다.
- Capture 전 reduced motion, network idle, font readiness와 image settlement를 기다립니다.
- Home은 five-design desktop/mobile, first project detail은 five-design desktop baseline을 정확히 갖습니다.
- Baseline file set은 `SITE_DESIGN_IDS`에서 계산한 exact 15-file manifest와 일치합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 초기 route matrix가 snapshot capture에 필요한 server, viewport와 design vocabulary를 무엇까지 제공했는가?
- Token/renderer structural tests는 pixel baseline 이전에 어떤 빠른 failure signal을 주는가?
- Stable-page helper가 animation/font/image nondeterminism을 어떻게 줄이는가?
- 1% pixel tolerance와 15-file manifest가 보장하지 않는 route/state/platform 범위는 무엇인가?

## 3. 완료 기준

- 각 referenced SHA의 exact parent diff와 resulting changed files를 확인합니다.
- Commit별 previous state, implementation decision, ownership/lifetime, failure path와 non-guarantee를 구분합니다.
- Fix는 earlier assumption과 root cause에 연결하고, test는 production path·technique·proves/does-not-prove를 구분합니다.
- A-level은 subsystem·failure·verification 관계까지, B-level은 local role과 후속 연결까지만 설명합니다.
- Thread-level invariant evolution, Failure → Fix → Test, ownership transfer와 final flow를 코드 없이 설명합니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | 이 Thread에서 확인할 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `31c438b52e4b` | test(e2e): 다섯 디자인의 route matrix 검증 | A | ARCH, VALIDATION, ROUTING | Desktop/mobile Playwright projects와 five-design route foundation |
| 2 | `055b733cbb7e` | test(design): 독립 renderer와 design token 경계 검증 | A | ARCH, VALIDATION, RENDERER | Renderer marker와 design-token structural precondition |
| 3 | `882a2f9d753e` | test(visual): 다섯 디자인 회귀 기준 추가 | A | TEST | Stable screenshot suite, 15 PNG baselines와 exact manifest contract |

## 5. Commit별 학습 기록

각 section은 해당 SHA의 tree와 parent diff만 기준으로 작성합니다. 같은 SHA가 다른 category Thread에 등장하더라도 여기서는 위 역할과 파일 범위만 설명합니다.

### 1. `31c438b52e4b` — test(e2e): 다섯 디자인의 route matrix 검증

- **Full SHA:** `31c438b52e4b5f87d7e88ce047dd1997aa8ef054`
- **Importance:** A
- **Tags:** ARCH, VALIDATION, ROUTING
- **이 Thread에서의 역할:** Desktop/mobile Playwright projects와 five-design route foundation

#### 해당 SHA에서 확인할 실제 코드

- `package.json`의 `test:e2e` script와 `@playwright/test` dependency
- `playwright.config.ts`의 testDir, timeout, single worker, webServer와 `chromium`/`mobile-chrome` projects
- `tests/e2e/portfolio.spec.ts` 내부의 design IDs, enabled route definitions와 content JSON fixture
- response, design root, heading/content/media, internal href, switcher, invalid view fallback, overflow, reduced-motion, touch/focus assertions
- dev compiler cold-route race를 피하기 위해 worker 수를 1로 둔 이유와 병렬성 비보장

#### Commit-specific investigation

- `31c438b52e4b^`와 `31c438b52e4b`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `Desktop/mobile Playwright projects와 five-design route foundation`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
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

### 2. `055b733cbb7e` — test(design): 독립 renderer와 design token 경계 검증

- **Full SHA:** `055b733cbb7e897df7c75c90164b99f5fd2d9724`
- **Importance:** A
- **Tags:** ARCH, VALIDATION, RENDERER
- **이 Thread에서의 역할:** Renderer marker와 design-token structural precondition

#### 해당 SHA에서 확인할 실제 코드

- `src/designs/route-view-models.test.tsx`에 Journey/Interview page를 추가한 부분
- Design/Classic에서만 `data-route-renderer`를 요구하는 branch와 `data-site-design` 공통 assertion
- `src/designs/design-tokens.test.ts`의 seven token-family list
- `src/app/globals.css`를 읽는 source-text test와 Design/Classic scope 안의 `--content-width` regex
- 이 Thread에서는 renderer independence 증거와 token test의 역할을 구분할 것

#### Commit-specific investigation

- `055b733cbb7e^`와 `055b733cbb7e`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `Renderer marker와 design-token structural precondition`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
- Production path와 test path를 분리하고, state/data/resource owner와 lifetime·cleanup을 실제 symbol 기준으로 추적합니다.
- Failure/absence/fallback branch와 test technique을 구분하고, 이 SHA가 보장하지 않는 범위를 명시합니다.
- 다음 후속 관계를 대조하되 later code를 이 SHA의 구현으로 설명하지 않습니다: Visual Thread에서는 이 SHA가 snapshot보다 먼저 오는 token/boundary prerequisite로 다시 사용됩니다. 이후 `882a2f...`가 실제 pixels를 baseline으로 고정합니다.

#### 학습자 증거

| 확인·기록 항목 | 기록 |
| --- | --- |
| 직전 state와 부족함 | 기존 matrix는 six routes만 포함하고 Design과 Classic이 같은 presentation implementation으로 다시 합쳐져도 `data-site-design`만 맞으면 통과할 수 있었습니다. Journey/Interview coverage와 최소 token vocabulary도 별도 guard가 없었습니다. |
| 실제 변경 file/symbol/call path | Renderer matrix에 Journey와 Interview Map을 추가하여 40 combinations로 확장하고, Design/Classic root 아래 각각 `data-route-renderer` marker를 요구합니다. 별도 `design-tokens.test.ts`는 typography, spacing, breakpoint, motion, layer와 width token family가 존재하고 Design/Classic scope가 explicit한지 확인합니다. |
| Data/state/DOM/resource owner와 lifetime | Page/registry가 design dispatch를 소유하고 각 independent renderer가 marker를 출력합니다. CSS token 값의 owner는 `globals.css`; test는 source를 읽어 vocabulary와 explicit scope만 고정합니다. |
| Failure·absence·fallback·cleanup | Journey/Interview renderer 누락, Design/Classic implementation boundary collapse, 필수 token 선언 삭제를 deterministic failure로 만듭니다. Regex는 CSS cascade의 computed result나 token 값의 적절성을 평가하지 않습니다. |
| Test technique와 실행 증거 | jsdom route integration과 static CSS contract를 결합합니다. 이 Thread의 핵심 evidence는 route matrix의 두 추가 route와 `data-route-renderer` assertion입니다. |
| 보장하는 것 | 모든 enabled public route가 five-design dispatch에 참여하고 Design/Classic이 독립 renderer boundary를 유지한다는 최소 계약이 완성됩니다. |
| 보장하지 않는 것 | Editorial/Brutalist/Cinematic에 독립 marker를 요구하지 않고, token value·contrast·responsive behavior·pixel output은 보장하지 않습니다. Static source가 존재해도 unused token일 수 있습니다. |
| 다음 commit/관련 test 연결 | Visual Thread에서는 이 SHA가 snapshot보다 먼저 오는 token/boundary prerequisite로 다시 사용됩니다. 이후 `882a2f...`가 실제 pixels를 baseline으로 고정합니다. |

#### 최소 code evidence

- **Commit:** `055b733cbb7e897df7c75c90164b99f5fd2d9724`
- **Excerpt:** 생략했습니다. 이 commit의 핵심은 여러 assertion/configuration에 걸쳐 있어 일부 줄만 인용하면 test 범위를 왜곡할 수 있습니다.
- **대신 확인한 위치:** `src/designs/route-view-models.test.tsx`에 Journey/Interview page를 추가한 부분; Design/Classic에서만 `data-route-renderer`를 요구하는 branch와 `data-site-design` 공통 assertion; `src/designs/design-tokens.test.ts`의 seven token-family list

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command | 미실행 |
| 실제 결과 | 실행 환경에서 `github.com` DNS 해석이 실패하여 repository를 local clone하지 못했습니다. 따라서 이 문서의 역사 증거는 GitHub의 exact commit API에서 확인한 parent diff, changed file, 해당 SHA의 file content와 branch-local classification에 한정합니다. Vitest·Playwright·Axe·screenshot·performance command는 실행하지 않았고, 통과했다고 기록하지 않습니다. |
| 정적 검토 범위 | Exact commit diff, changed files, 위에 열거한 symbol/test/config |

### 3. `882a2f9d753e` — test(visual): 다섯 디자인 회귀 기준 추가

- **Full SHA:** `882a2f9d753ea8ff97cc8ce6a202aeb0e394597d`
- **Importance:** A
- **Tags:** TEST
- **이 Thread에서의 역할:** Stable screenshot suite, 15 PNG baselines와 exact manifest contract

#### 해당 SHA에서 확인할 실제 코드

- `playwright.config.ts`와 `playwright.production.config.ts`의 shared `snapshotPathTemplate`
- `tests/e2e/visual.spec.ts`의 `prepareStablePage`: reduced motion, `networkidle`, `document.fonts.ready`, all image load/error settlement
- five design loop, home test의 desktop/mobile project assertion, project detail의 desktop-only skip
- `toHaveScreenshot` options: fullPage, disabled animations, `maxDiffPixelRatio: 0.01`
- `src/designs/visual-regression-contract.test.ts`가 `SITE_DESIGN_IDS`에서 exact 15-file manifest를 만드는 방식
- 추가된 PNG set: design당 home desktop/mobile 두 장과 project desktop 한 장

#### Commit-specific investigation

- `882a2f9d753e^`와 `882a2f9d753e`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `Stable screenshot suite, 15 PNG baselines와 exact manifest contract`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
- Production path와 test path를 분리하고, state/data/resource owner와 lifetime·cleanup을 실제 symbol 기준으로 추적합니다.
- Failure/absence/fallback branch와 test technique을 구분하고, 이 SHA가 보장하지 않는 범위를 명시합니다.
- 다음 후속 관계를 대조하되 later code를 이 SHA의 구현으로 설명하지 않습니다: 앞선 route matrix와 token/renderer structural tests를 pixel evidence로 보완합니다. Baseline update의 타당성은 자동으로 판단하지 않으므로 review ownership은 여전히 사람에게 남습니다.

#### 학습자 증거

| 확인·기록 항목 | 기록 |
| --- | --- |
| 직전 state와 부족함 | Route/browser characterization은 semantics와 layout invariants를 검사했지만 typography, spacing, wrapping, image crop처럼 DOM assertion으로 표현하기 어려운 변화는 놓칠 수 있었습니다. Baseline file이 빠지거나 과도하게 추가되어도 별도 contract가 없었습니다. |
| 실제 변경 file/symbol/call path | 두 Playwright config에 deterministic snapshot naming을 추가하고 five-design visual suite와 15개 PNG baseline을 커밋했습니다. Page 준비는 motion을 줄이고 network/font/image settlement를 기다립니다. 별도 Vitest test는 directory의 PNG manifest가 expected exact set과 일치해야 한다고 요구합니다. |
| Data/state/DOM/resource owner와 lifetime | Playwright project name과 snapshot template가 platform/viewport filename을 소유합니다. `SITE_DESIGN_IDS`가 design enumeration을 소유하고 first enabled project가 detail fixture를 결정합니다. Repository에 커밋된 PNG가 review baseline입니다. |
| Failure·absence·fallback·cleanup | Enabled project가 없으면 test module이 error를 던집니다. Image error도 settlement 대상으로 처리하므로 hang은 피하지만 broken image 자체를 이 helper가 실패시키지는 않습니다. Pixel difference가 1%를 넘으면 실패하고 manifest의 누락·추가도 실패합니다. |
| Test technique와 실행 증거 | Visual regression testing plus snapshot-manifest contract입니다. Full-page browser screenshots를 비교하지만 exact browser/font/platform reproducibility에 의존합니다. Baselines와 test code는 확인했으나 screenshot command는 실행하지 않았습니다. |
| 보장하는 것 | 다섯 design의 home desktop/mobile와 first project desktop에 대해 안정화 절차, filename, pixel tolerance와 exact baseline count가 repository contract가 됩니다. |
| 보장하지 않는 것 | 다른 public routes, project detail mobile, interaction/open states, hover/focus/forced-colors, multiple projects, all OS/browser rendering과 1% 이하의 local visual drift는 보장하지 않습니다. |
| 다음 commit/관련 test 연결 | 앞선 route matrix와 token/renderer structural tests를 pixel evidence로 보완합니다. Baseline update의 타당성은 자동으로 판단하지 않으므로 review ownership은 여전히 사람에게 남습니다. |

#### 최소 code evidence

- **Commit:** `882a2f9d753ea8ff97cc8ce6a202aeb0e394597d`
- **Path:** `tests/e2e/visual.spec.ts`
- **Location:** home visual test

```ts
await expect(page).toHaveScreenshot(`home-${designId}.png`, {
  animations: "disabled",
  fullPage: true,
  maxDiffPixelRatio: 0.01,
});
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
| Visual evidence는 actual browser route output에서 얻는다. | 31c438b52e4b | Playwright server/projects/route matrix | 기반 |
| Renderer/token boundary는 pixel diff보다 빠르게 구조적으로 실패한다. | 055b733cbb7e | Marker/token source tests | 보강 |
| Capture는 motion/font/image settlement 뒤 수행된다. | 882a2f9d753e | `prepareStablePage` | 도입 |
| Baseline set은 five design당 3개, 총 15개다. | 882a2f9d753e | PNG files + exact manifest Vitest | 고정 |

## 7. Failure → Fix → Test

| Earlier failure/risk | Fix SHA | Corrected decision | Regression evidence |
| --- | --- | --- | --- |
| Browser/viewport foundation 없이 local screenshot이 서로 다른 조건으로 생성될 위험 | 31c438b52e4b | Configured Chromium/mobile projects와 web server | Harness |
| Renderer extraction/token 삭제가 screenshot review 전까지 늦게 발견될 위험 | 055b733cbb7e | Structural marker/token tests | Fast regression |
| Font/image/animation timing 차이로 flaky pixel diff가 발생할 위험 | 882a2f9d753e | Reduced motion + network/font/image settlement | Stabilization |
| Baseline 누락·임의 추가로 coverage가 조용히 변할 위험 | 882a2f9d753e | Exact filename manifest | Manifest regression |

## 8. Ownership/state/responsibility 변화

| 대상 | 초기 owner/state | 최종 owner/state | Evidence |
| --- | --- | --- | --- |
| Route/design/viewport | E2E spec 내부 | Playwright config + matrix | Chromium/mobile projects |
| Renderer/token structure | 암묵적 | Static contract tests | `route-view-models`, `design-tokens` |
| Capture stabilization | 수동 timing 가능 | `prepareStablePage` | Visual spec |
| Reference pixels | 없음 | Committed PNGs | `visual.spec.ts-snapshots/` |
| Coverage manifest | Directory 관행 | Vitest exact set | `visual-regression-contract.test.ts` |

## 9. 최종 Thread state

다음 내용을 코드 없이 설명합니다: 최종 owner, input→decision→output, failure/absence policy, regression evidence와 명시적 non-guarantee.

최종 visual contract는 다섯 design의 home desktop/mobile와 first project desktop 15개 full-page PNG를 repository baseline으로 둡니다. Capture는 motion/network/font/image settlement를 거치며 1% pixel-diff tolerance를 사용하고, 별도 test가 exact filename set을 보호합니다. 다른 routes와 interaction states는 명시적으로 coverage 밖입니다.

## 10. 최종 실행 흐름

| 단계 | Owner / mechanism | Input | Output/state | Failure/non-guarantee |
| ---: | --- | --- | --- | --- |
| 1. Browser project | Playwright config | desktop/mobile project + web server | stable viewport/runtime | project/platform 차이 |
| 2. Route selection | `site-matrix` | design + home/first detail | explicit URL | enabled project 없음→error |
| 3. Page stabilization | `prepareStablePage` | loaded page | settled motion/fonts/images | image error는 settle만 함 |
| 4. Screenshot comparison | `toHaveScreenshot` | full page | ≤1% diff | threshold 초과 failure |
| 5. Manifest verification | `visual-regression-contract.test.ts` | snapshot directory + design IDs | exact 15 names | 누락/추가 failure |

## 11. 학습 완료 확인

- [x] 모든 referenced SHA를 exact historical diff 기준으로 설명했습니다.
- [x] Commit map의 SHA·순서·subject·importance·tags를 변경하지 않았습니다.
- [x] Fix를 earlier failure/assumption에 연결했습니다.
- [x] Test가 실행하는 production path와 증명하지 않는 범위를 구분했습니다.
- [x] 정적 inspection과 실제 command execution을 구분했습니다.
- [x] Thread-level invariant, ownership과 final flow를 완성했습니다.
- [x] 실행 제한을 명시했습니다: 실행 환경에서 `github.com` DNS 해석이 실패하여 repository를 local clone하지 못했습니다. 따라서 이 문서의 역사 증거는 GitHub의 exact commit API에서 확인한 parent diff, changed file, 해당 SHA의 file content와 branch-local classification에 한정합니다. Vitest·Playwright·Axe·screenshot·performance command는 실행하지 않았고, 통과했다고 기록하지 않습니다.
