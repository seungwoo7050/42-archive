# Thread: Route presentation characterization

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

Hard-coded output snapshot 대신 canonical content와 query policy를 기준으로 App Router pages를 characterization하고, five-design route output과 independent renderer boundary를 jsdom·browser matrices로 확장하는 과정을 복원합니다.

### 동결된 핵심 invariant

- Expected labels, projects와 route enablement는 production content에서 파생하며 test 전용 복제 truth를 만들지 않습니다.
- Missing/unknown/repeated `view`·`debug` query는 route resolver의 explicit fallback/first-value policy를 따릅니다.
- 다섯 design은 public route에서 자신을 식별하는 root boundary와 primary heading을 유지합니다.
- Design/Classic independent renderer marker와 shared design-token vocabulary는 structural tests로 보호됩니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- jsdom page tests가 five-design Home과 Classic route shell에서 무엇을 characterization했는가?
- Playwright matrix가 jsdom이 보지 못하는 response, viewport, native interaction과 layout risk를 어떻게 추가했는가?
- View-model migration 뒤 five-design compatibility를 빠르게 확인하는 renderer matrix는 어떤 route set을 사용했는가?
- Renderer marker와 CSS token source-text test가 실제 pixel/behavior 보장과 어떻게 다른가?

## 3. 완료 기준

- 각 referenced SHA의 exact parent diff와 resulting changed files를 확인합니다.
- Commit별 previous state, implementation decision, ownership/lifetime, failure path와 non-guarantee를 구분합니다.
- Fix는 earlier assumption과 root cause에 연결하고, test는 production path·technique·proves/does-not-prove를 구분합니다.
- A-level은 subsystem·failure·verification 관계까지, B-level은 local role과 후속 연결까지만 설명합니다.
- Thread-level invariant evolution, Failure → Fix → Test, ownership transfer와 final flow를 코드 없이 설명합니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | 이 Thread에서 확인할 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `42bef4e5783c` | test(routes): 홈과 route presentation 계약 검증 | A | ARCH, VALIDATION, ROUTING | Canonical content 기반 jsdom Home/public-route characterization |
| 2 | `31c438b52e4b` | test(e2e): 다섯 디자인의 route matrix 검증 | A | ARCH, VALIDATION, ROUTING | Playwright five-design desktop/mobile public route matrix |
| 3 | `1598a87702f6` | test(design): view model 기반 renderer matrix 검증 | A | ARCH, VALIDATION, RENDERER | View-model consumer를 통과하는 six-route×five-design fast matrix |
| 4 | `055b733cbb7e` | test(design): 독립 renderer와 design token 경계 검증 | A | ARCH, VALIDATION, RENDERER | Journey/interview 확장, independent renderer marker와 token source contract |

## 5. Commit별 학습 기록

각 section은 해당 SHA의 tree와 parent diff만 기준으로 작성합니다. 같은 SHA가 다른 category Thread에 등장하더라도 여기서는 위 역할과 파일 범위만 설명합니다.

### 1. `42bef4e5783c` — test(routes): 홈과 route presentation 계약 검증

- **Full SHA:** `42bef4e5783ce471f04f4e538801a72aa89ddbf6`
- **Importance:** A
- **Tags:** ARCH, VALIDATION, ROUTING
- **이 Thread에서의 역할:** Canonical content 기반 jsdom Home/public-route characterization

#### 해당 SHA에서 확인할 실제 코드

- `src/app/page.test.tsx`의 five-design table, default/unknown design fallback, content-debug query propagation
- `src/app/routes.test.tsx`의 여덟 route Classic shell matrix와 repeated query의 first-value policy
- `src/app/journey/page.test.tsx`의 content-owned shell labels와 milestone vocabulary
- 각 test가 page function을 직접 await한 뒤 Testing Library로 semantic role/heading/link를 찾는 호출 경로
- Hard-coded full DOM snapshot 대신 JSON/content selector에서 expected value를 가져오는 부분

#### Commit-specific investigation

- `42bef4e5783c^`와 `42bef4e5783c`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `Canonical content 기반 jsdom Home/public-route characterization`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
- Production path와 test path를 분리하고, state/data/resource owner와 lifetime·cleanup을 실제 symbol 기준으로 추적합니다.
- Failure/absence/fallback branch와 test technique을 구분하고, 이 SHA가 보장하지 않는 범위를 명시합니다.
- 다음 후속 관계를 대조하되 later code를 이 SHA의 구현으로 설명하지 않습니다: `31c438b52e4b`가 같은 public surface를 실제 Chromium desktop/mobile route×design matrix로 확장합니다.

#### 학습자 증거

| 확인·기록 항목 | 기록 |
| --- | --- |
| 직전 state와 부족함 | 개별 route와 다섯 presentation이 구현돼 있었지만, 같은 canonical content와 query policy를 유지하는지 한곳에서 비교하지 않았습니다. Design별 markup이 달라 string snapshot을 공유하기 어렵고, 특정 route만 debug/view propagation을 빠뜨릴 위험이 있었습니다. |
| 실제 변경 file/symbol/call path | 세 test file을 추가합니다. Home test는 두 원래 presentation의 journey evidence, default Editorial, unknown fallback, 다섯 design root, featured project와 design navigation, debug query preservation을 확인합니다. Routes test는 여덟 page function을 Classic view로 render해 heading, shell marker, source debug note와 design links를 비교합니다. Journey test는 content-owned labels를 확인합니다. |
| Data/state/DOM/resource owner와 lifetime | Query parsing과 presentation 선택은 실제 page/helper가 소유합니다. Test는 `getPortfolioContent()`에서 canonical expected text를 읽고 async page output을 render하는 observer입니다. Expected content를 test-local copy로 재정의하지 않습니다. |
| Failure·absence·fallback·cleanup | Unknown design은 Editorial로 fallback하고, repeated `view`/`debug` 배열은 첫 값을 사용합니다. 최소 한 enabled project가 없으면 characterization fixture가 명시적으로 실패합니다. Disabled route policy 자체는 이 test의 중심이 아닙니다. |
| Test technique와 실행 증거 | jsdom route characterization입니다. Async server page function을 직접 실행해 React output을 semantic query로 검사합니다. Browser network, CSS layout 또는 hydration은 포함하지 않습니다. |
| 보장하는 것 | Home의 five-design dispatch와 주요 public route의 Classic shell/query/content contract가 content source에 연결됩니다. |
| 보장하지 않는 것 | 모든 route×design 조합을 검증하지 않으며, visual equivalence·responsive layout·real navigation·browser accessibility는 보장하지 않습니다. Text/role assertion 밖의 상세 DOM 변경은 통과할 수 있습니다. |
| 다음 commit/관련 test 연결 | `31c438b52e4b`가 같은 public surface를 실제 Chromium desktop/mobile route×design matrix로 확장합니다. |

#### 최소 code evidence

- **Commit:** `42bef4e5783ce471f04f4e538801a72aa89ddbf6`
- **Excerpt:** 생략했습니다. 이 commit의 핵심은 여러 assertion/configuration에 걸쳐 있어 일부 줄만 인용하면 test 범위를 왜곡할 수 있습니다.
- **대신 확인한 위치:** `src/app/page.test.tsx`의 five-design table, default/unknown design fallback, content-debug query propagation; `src/app/routes.test.tsx`의 여덟 route Classic shell matrix와 repeated query의 first-value policy; `src/app/journey/page.test.tsx`의 content-owned shell labels와 milestone vocabulary

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command | 미실행 |
| 실제 결과 | 실행 환경에서 `github.com` DNS 해석이 실패하여 repository를 local clone하지 못했습니다. 따라서 이 문서의 역사 증거는 GitHub의 exact commit API에서 확인한 parent diff, changed file, 해당 SHA의 file content와 branch-local classification에 한정합니다. Vitest·Playwright·Axe·screenshot·performance command는 실행하지 않았고, 통과했다고 기록하지 않습니다. |
| 정적 검토 범위 | Exact commit diff, changed files, 위에 열거한 symbol/test/config |

### 2. `31c438b52e4b` — test(e2e): 다섯 디자인의 route matrix 검증

- **Full SHA:** `31c438b52e4b5f87d7e88ce047dd1997aa8ef054`
- **Importance:** A
- **Tags:** ARCH, VALIDATION, ROUTING
- **이 Thread에서의 역할:** Playwright five-design desktop/mobile public route matrix

#### 해당 SHA에서 확인할 실제 코드

- `package.json`의 `test:e2e` script와 `@playwright/test` dependency
- `playwright.config.ts`의 testDir, timeout, single worker, webServer와 `chromium`/`mobile-chrome` projects
- `tests/e2e/portfolio.spec.ts` 내부의 design IDs, enabled route definitions와 content JSON fixture
- response, design root, heading/content/media, internal href, switcher, invalid view fallback, overflow, reduced-motion, touch/focus assertions
- dev compiler cold-route race를 피하기 위해 worker 수를 1로 둔 이유와 병렬성 비보장

#### Commit-specific investigation

- `31c438b52e4b^`와 `31c438b52e4b`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `Playwright five-design desktop/mobile public route matrix`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
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

### 3. `1598a87702f6` — test(design): view model 기반 renderer matrix 검증

- **Full SHA:** `1598a87702f6988102fffbb728ba314db6b08604`
- **Importance:** A
- **Tags:** ARCH, VALIDATION, RENDERER
- **이 Thread에서의 역할:** View-model consumer를 통과하는 six-route×five-design fast matrix

#### 해당 SHA에서 확인할 실제 코드

- `src/designs/route-view-models.test.tsx`의 `designIds` literal과 six-route table
- Home/projects/project-detail/about/resume/contact page function을 실제로 호출하는 `renderPage` closures
- 첫 enabled project fixture와 missing fixture failure
- `data-site-design` root와 non-empty `h1` assertion이 잡는 failure와 놓치는 failure

#### Commit-specific investigation

- `1598a87702f6^`와 `1598a87702f6`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `View-model consumer를 통과하는 six-route×five-design fast matrix`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
- Production path와 test path를 분리하고, state/data/resource owner와 lifetime·cleanup을 실제 symbol 기준으로 추적합니다.
- Failure/absence/fallback branch와 test technique을 구분하고, 이 SHA가 보장하지 않는 범위를 명시합니다.
- 다음 후속 관계를 대조하되 later code를 이 SHA의 구현으로 설명하지 않습니다: `055b733cbb7e`가 Journey/Interview를 matrix에 넣고 Design/Classic의 독립 renderer marker를 추가 확인합니다.

#### 학습자 증거

| 확인·기록 항목 | 기록 |
| --- | --- |
| 직전 state와 부족함 | View-model factories가 도입된 뒤 모든 renderer가 새 shape를 받을 수 있는지 한 번에 확인하는 test가 없었습니다. TypeScript가 통과해도 route page에서 잘못된 registry dispatch나 renderer runtime throw가 특정 design에만 남을 수 있었습니다. |
| 실제 변경 file/symbol/call path | `src/designs/route-view-models.test.tsx`를 추가해 다섯 design 각각에 대해 six route page output을 render합니다. 각 case는 expected `data-site-design` root와 non-empty `h1`을 요구합니다. |
| Data/state/DOM/resource owner와 lifetime | Route page가 view model 생성과 renderer registry dispatch를 소유합니다. Test는 그 실제 page entry를 호출하므로 renderer를 isolated mock으로 대체하지 않습니다. Fixture project는 canonical content의 첫 enabled item입니다. |
| Failure·absence·fallback·cleanup | Enabled project가 없으면 suite 초기화가 명시적으로 실패합니다. Renderer가 throw하거나 expected design root/h1을 만들지 않으면 해당 matrix case가 실패합니다. |
| Test technique와 실행 증거 | Fast integration/compatibility matrix입니다. jsdom에서 30 combinations를 통과시키되 assertion은 intentionally shallow합니다. |
| 보장하는 것 | View-model migration 이후 six public route가 다섯 renderer에서 최소 HTML boundary와 primary heading을 유지함을 검증합니다. |
| 보장하지 않는 것 | 내용의 정확성, landmark, links, responsive CSS, browser-only behavior와 Journey/Interview routes는 아직 보장하지 않습니다. |
| 다음 commit/관련 test 연결 | `055b733cbb7e`가 Journey/Interview를 matrix에 넣고 Design/Classic의 독립 renderer marker를 추가 확인합니다. |

#### 최소 code evidence

- **Commit:** `1598a87702f6988102fffbb728ba314db6b08604`
- **Excerpt:** 생략했습니다. 이 commit의 핵심은 여러 assertion/configuration에 걸쳐 있어 일부 줄만 인용하면 test 범위를 왜곡할 수 있습니다.
- **대신 확인한 위치:** `src/designs/route-view-models.test.tsx`의 `designIds` literal과 six-route table; Home/projects/project-detail/about/resume/contact page function을 실제로 호출하는 `renderPage` closures; 첫 enabled project fixture와 missing fixture failure

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command | 미실행 |
| 실제 결과 | 실행 환경에서 `github.com` DNS 해석이 실패하여 repository를 local clone하지 못했습니다. 따라서 이 문서의 역사 증거는 GitHub의 exact commit API에서 확인한 parent diff, changed file, 해당 SHA의 file content와 branch-local classification에 한정합니다. Vitest·Playwright·Axe·screenshot·performance command는 실행하지 않았고, 통과했다고 기록하지 않습니다. |
| 정적 검토 범위 | Exact commit diff, changed files, 위에 열거한 symbol/test/config |

### 4. `055b733cbb7e` — test(design): 독립 renderer와 design token 경계 검증

- **Full SHA:** `055b733cbb7e897df7c75c90164b99f5fd2d9724`
- **Importance:** A
- **Tags:** ARCH, VALIDATION, RENDERER
- **이 Thread에서의 역할:** Journey/interview 확장, independent renderer marker와 token source contract

#### 해당 SHA에서 확인할 실제 코드

- `src/designs/route-view-models.test.tsx`에 Journey/Interview page를 추가한 부분
- Design/Classic에서만 `data-route-renderer`를 요구하는 branch와 `data-site-design` 공통 assertion
- `src/designs/design-tokens.test.ts`의 seven token-family list
- `src/app/globals.css`를 읽는 source-text test와 Design/Classic scope 안의 `--content-width` regex
- 이 Thread에서는 renderer independence 증거와 token test의 역할을 구분할 것

#### Commit-specific investigation

- `055b733cbb7e^`와 `055b733cbb7e`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `Journey/interview 확장, independent renderer marker와 token source contract`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
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

## 6. Invariant evolution ledger

| Invariant | 도입/변경 SHA | Historical evidence | 상태 |
| --- | --- | --- | --- |
| Route expectation은 canonical content에서 파생한다. | 42bef4e5783c | `getPortfolioContent()` 기반 heading/labels/projects | 도입 |
| Five-design dispatch와 query fallback이 route output에서 유지된다. | 42bef4e5783c → 31c438b52e4b | jsdom query tests와 browser route matrix | 도입 후 browser 확장 |
| View-model migration은 all-design HTML boundary를 보존한다. | 1598a87702f6 → 055b733cbb7e | route-view-models matrix가 6→8 routes로 확장 | 확장 |
| Design/Classic은 독립 renderer/token scope를 갖는다. | 055b733cbb7e | `data-route-renderer`, token-family/source-scope tests | 고정 |

## 7. Failure → Fix → Test

| Earlier failure/risk | Fix SHA | Corrected decision | Regression evidence |
| --- | --- | --- | --- |
| Unknown view가 empty page 또는 arbitrary renderer로 흐를 위험 | 42bef4e5783c | Editorial fallback assertion | jsdom characterization |
| Repeated query array를 잘못 해석해 design/debug state가 달라질 위험 | 42bef4e5783c | 첫 query value assertion | Route test |
| 특정 route/design만 renderer migration에서 누락될 위험 | 31c438b52e4b → 1598a87702f6 → 055b733cbb7e | Browser matrix + fast 5×8 matrix | Integration regression |
| Shared CSS refactor가 required token/independent scope를 제거할 위험 | 055b733cbb7e | CSS source token-family/scope assertions | Structural regression |

## 8. Ownership/state/responsibility 변화

| 대상 | 초기 owner/state | 최종 owner/state | Evidence |
| --- | --- | --- | --- |
| Query normalization | Page마다 직접 해석 가능 | Route resolver contract | `view`/`debug` first value and fallback |
| Expected content | Hard-coded text 가능 | Canonical content aggregate | `getPortfolioContent`/JSON fixtures |
| Design dispatch | Home 중심 | All public route pages/registry | `data-site-design` |
| Browser matrix vocabulary | Spec 내부 | 초기에는 `portfolio.spec.ts` 내부 | 후속 category Thread에서 `site-matrix.ts`로 추출 |
| Renderer/token boundary | 암묵적 CSS/markup | Explicit marker와 token tests | `data-route-renderer`, `design-tokens.test.ts` |

## 9. 최종 Thread state

다음 내용을 코드 없이 설명합니다: 최종 owner, input→decision→output, failure/absence policy, regression evidence와 명시적 non-guarantee.

최종적으로 page tests는 canonical content와 query resolver를 기준으로 route output을 설명하고, Playwright는 실제 desktop/mobile browser에서 five-design public route matrix를 통과합니다. View-model migration은 별도 fast matrix로 보호되고 Design/Classic의 independent renderer marker와 shared token vocabulary가 structural contract가 됩니다. Exact pixels와 WCAG는 다른 Threads가 보완합니다.

## 10. 최종 실행 흐름

| 단계 | Owner / mechanism | Input | Output/state | Failure/non-guarantee |
| ---: | --- | --- | --- | --- |
| 1. Query input | App Router page props | `searchParams`/`params` | resolved view/debug/project | missing/unknown/repeated fallback |
| 2. Content/view model | `getPortfolioContent` + route factory | resolved route state | route data | missing project→not-found/null |
| 3. Design dispatch | registry/route page | route data + design ID | design-specific root | default Editorial |
| 4. Renderer output | five design renderers | view model | HTML heading/navigation/content | missing boundary assertion |
| 5. Characterization | Vitest + Playwright matrices | canonical expectations + rendered page | DOM/browser assertions | contract failure |

## 11. 학습 완료 확인

- [x] 모든 referenced SHA를 exact historical diff 기준으로 설명했습니다.
- [x] Commit map의 SHA·순서·subject·importance·tags를 변경하지 않았습니다.
- [x] Fix를 earlier failure/assumption에 연결했습니다.
- [x] Test가 실행하는 production path와 증명하지 않는 범위를 구분했습니다.
- [x] 정적 inspection과 실제 command execution을 구분했습니다.
- [x] Thread-level invariant, ownership과 final flow를 완성했습니다.
- [x] 실행 제한을 명시했습니다: 실행 환경에서 `github.com` DNS 해석이 실패하여 repository를 local clone하지 못했습니다. 따라서 이 문서의 역사 증거는 GitHub의 exact commit API에서 확인한 parent diff, changed file, 해당 SHA의 file content와 branch-local classification에 한정합니다. Vitest·Playwright·Axe·screenshot·performance command는 실행하지 않았고, 통과했다고 기록하지 않습니다.
