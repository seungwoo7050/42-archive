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
| Visual evidence는 actual browser route output에서 얻는다. |  |  |  |
| Renderer/token boundary는 pixel diff보다 빠르게 구조적으로 실패한다. |  |  |  |
| Capture는 motion/font/image settlement 뒤 수행된다. |  |  |  |
| Baseline set은 five design당 3개, 총 15개다. |  |  |  |

## 7. Failure → Fix → Test

| Earlier failure/risk | Fix SHA | Corrected decision | Regression evidence |
| --- | --- | --- | --- |
| Browser/viewport foundation 없이 local screenshot이 서로 다른 조건으로 생성될 위험 |  |  |  |
| Renderer extraction/token 삭제가 screenshot review 전까지 늦게 발견될 위험 |  |  |  |
| Font/image/animation timing 차이로 flaky pixel diff가 발생할 위험 |  |  |  |
| Baseline 누락·임의 추가로 coverage가 조용히 변할 위험 |  |  |  |

## 8. Ownership/state/responsibility 변화

| 대상 | 초기 owner/state | 최종 owner/state | Evidence |
| --- | --- | --- | --- |
| Route/design/viewport |  |  |  |
| Renderer/token structure |  |  |  |
| Capture stabilization |  |  |  |
| Reference pixels |  |  |  |
| Coverage manifest |  |  |  |

## 9. 최종 Thread state

다음 내용을 코드 없이 설명합니다: 최종 owner, input→decision→output, failure/absence policy, regression evidence와 명시적 non-guarantee.

> 학습자 기록:

## 10. 최종 실행 흐름

| 단계 | Owner / mechanism | Input | Output/state | Failure/non-guarantee |
| ---: | --- | --- | --- | --- |
| 1. Browser project |  |  |  |  |
| 2. Route selection |  |  |  |  |
| 3. Page stabilization |  |  |  |  |
| 4. Screenshot comparison |  |  |  |  |
| 5. Manifest verification |  |  |  |  |

## 11. 학습 완료 확인

- [ ] 모든 referenced SHA를 exact historical diff 기준으로 설명했습니다.
- [ ] Commit map의 SHA·순서·subject·importance·tags를 변경하지 않았습니다.
- [ ] Fix를 earlier failure/assumption에 연결했습니다.
- [ ] Test가 실행하는 production path와 증명하지 않는 범위를 구분했습니다.
- [ ] 정적 inspection과 실제 command execution을 구분했습니다.
- [ ] Thread-level invariant, ownership과 final flow를 완성했습니다.
- [ ] 실행하지 못한 command가 있으면 환경 사유와 정적 검토 범위를 기록했습니다.
