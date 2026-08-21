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
| Route expectation은 canonical content에서 파생한다. |  |  |  |
| Five-design dispatch와 query fallback이 route output에서 유지된다. |  |  |  |
| View-model migration은 all-design HTML boundary를 보존한다. |  |  |  |
| Design/Classic은 독립 renderer/token scope를 갖는다. |  |  |  |

## 7. Failure → Fix → Test

| Earlier failure/risk | Fix SHA | Corrected decision | Regression evidence |
| --- | --- | --- | --- |
| Unknown view가 empty page 또는 arbitrary renderer로 흐를 위험 |  |  |  |
| Repeated query array를 잘못 해석해 design/debug state가 달라질 위험 |  |  |  |
| 특정 route/design만 renderer migration에서 누락될 위험 |  |  |  |
| Shared CSS refactor가 required token/independent scope를 제거할 위험 |  |  |  |

## 8. Ownership/state/responsibility 변화

| 대상 | 초기 owner/state | 최종 owner/state | Evidence |
| --- | --- | --- | --- |
| Query normalization |  |  |  |
| Expected content |  |  |  |
| Design dispatch |  |  |  |
| Browser matrix vocabulary |  |  |  |
| Renderer/token boundary |  |  |  |

## 9. 최종 Thread state

다음 내용을 코드 없이 설명합니다: 최종 owner, input→decision→output, failure/absence policy, regression evidence와 명시적 non-guarantee.

> 학습자 기록:

## 10. 최종 실행 흐름

| 단계 | Owner / mechanism | Input | Output/state | Failure/non-guarantee |
| ---: | --- | --- | --- | --- |
| 1. Query input |  |  |  |  |
| 2. Content/view model |  |  |  |  |
| 3. Design dispatch |  |  |  |  |
| 4. Renderer output |  |  |  |  |
| 5. Characterization |  |  |  |  |

## 11. 학습 완료 확인

- [ ] 모든 referenced SHA를 exact historical diff 기준으로 설명했습니다.
- [ ] Commit map의 SHA·순서·subject·importance·tags를 변경하지 않았습니다.
- [ ] Fix를 earlier failure/assumption에 연결했습니다.
- [ ] Test가 실행하는 production path와 증명하지 않는 범위를 구분했습니다.
- [ ] 정적 inspection과 실제 command execution을 구분했습니다.
- [ ] Thread-level invariant, ownership과 final flow를 완성했습니다.
- [ ] 실행하지 못한 command가 있으면 환경 사유와 정적 검토 범위를 기록했습니다.
