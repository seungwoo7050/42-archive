# Thread: Content contract test harness

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

Vitest/jsdom/Testing Library 실행 경계를 만들고 content ingestion, public selector surface, clone ownership, route projection rules를 단계적으로 executable contract로 고정하는 과정을 복원합니다.

### 동결된 핵심 invariant

- Test는 production loader·validator·selector·view-model path를 직접 호출하며 별도 모형 구현을 진실의 source로 만들지 않습니다.
- `getPortfolioContent()`가 반환하는 mutable aggregate는 호출 간 격리되고, 의도적으로 immutable한 root metadata만 reference를 공유합니다.
- Route view model은 shared shell fields와 route-specific fields만 노출하며 full `PortfolioContent` spread를 허용하지 않습니다.
- Unknown reference의 null/omission/fallback policy는 route factory에서 명시되고 renderer가 다시 검색하지 않습니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 최초 harness는 어떤 config·setup·production path를 연결했고 malformed fixture를 어디서 주입했는가?
- Public facade 목록과 clone/reference boundary는 왜 같은 contract에서 검사되는가?
- Home, index, detail, about, resume, contact의 selection/order/fallback은 renderer 이전 어디서 결정되는가?
- Journey와 interview map의 unresolved reference는 각각 어떤 형태로 남거나 제거되는가?

## 3. 완료 기준

- 각 referenced SHA의 exact parent diff와 resulting changed files를 확인합니다.
- Commit별 previous state, implementation decision, ownership/lifetime, failure path와 non-guarantee를 구분합니다.
- Fix는 earlier assumption과 root cause에 연결하고, test는 production path·technique·proves/does-not-prove를 구분합니다.
- A-level은 subsystem·failure·verification 관계까지, B-level은 local role과 후속 연결까지만 설명합니다.
- Thread-level invariant evolution, Failure → Fix → Test, ownership transfer와 final flow를 코드 없이 설명합니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | 이 Thread에서 확인할 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `3353032ba23b` | test(content): Vitest 기반 콘텐츠 계약 검증 추가 | A | CONTENT, VALIDATION, TEST | test runner·jsdom setup과 production content contract의 최초 실행 경계 |
| 2 | `dc07871c4d24` | test(portfolio): selector와 presentation 회귀 계약 보강 | A | CONTENT, TEST | public module surface와 mutable/immutable copy ownership 회귀 계약 |
| 3 | `b77b386b344e` | test(content): route view model 파생 규칙 검증 | A | ARCH, CONTENT, VALIDATION | 여섯 route view-model factory의 selection·ordering·fallback contract |
| 4 | `527b9f872333` | test(content): scoped view model과 연락처 회귀 검증 | A | CONTENT, VALIDATION, TEST | 여덟 route의 scoped field whitelist와 unresolved-reference hardening |

## 5. Commit별 학습 기록

각 section은 해당 SHA의 tree와 parent diff만 기준으로 작성합니다. 같은 SHA가 다른 category Thread에 등장하더라도 여기서는 위 역할과 파일 범위만 설명합니다.

### 1. `3353032ba23b` — test(content): Vitest 기반 콘텐츠 계약 검증 추가

- **Full SHA:** `3353032ba23bf0890b3ac0410e3b55638bc70df6`
- **Importance:** A
- **Tags:** CONTENT, VALIDATION, TEST
- **이 Thread에서의 역할:** test runner·jsdom setup과 production content contract의 최초 실행 경계

#### 해당 SHA에서 확인할 실제 코드

- `package.json`의 `test`·`test:watch` script와 Vitest/jsdom/Testing Library devDependencies
- `vitest.config.ts`의 jsdom environment, test include pattern, `src/test/setup.ts` 연결
- `src/test/setup.ts`의 jest-dom matcher 등록
- `src/lib/portfolio.test.ts`가 `loadPortfolioSource`, `validatePortfolioAssets`, selectors와 `PortfolioContentError`를 실제로 호출하는 방식
- 정상 source와 의도적으로 변형한 fixture가 ID, cross-reference, asset, route, metric, selector failure를 어떻게 관찰하는지

#### Commit-specific investigation

- `3353032ba23b^`와 `3353032ba23b`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `test runner·jsdom setup과 production content contract의 최초 실행 경계`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
- Production path와 test path를 분리하고, state/data/resource owner와 lifetime·cleanup을 실제 symbol 기준으로 추적합니다.
- Failure/absence/fallback branch와 test technique을 구분하고, 이 SHA가 보장하지 않는 범위를 명시합니다.
- 다음 후속 관계를 대조하되 later code를 이 SHA의 구현으로 설명하지 않습니다: `dc07871c4d24`가 같은 suite에 public facade surface와 copy/reference ownership을 추가하고, 이후 `b77b...`·`527b...`가 route view-model projection contract를 별도 test file로 확장합니다.

#### 학습자 증거

| 확인·기록 항목 | 기록 |
| --- | --- |
| 직전 state와 부족함 | 직전 parent에는 content loader, asset validation, selectors가 이미 있었지만 이를 반복 실행하는 Vitest 설정·test script·jsdom setup·contract suite가 없었습니다. 따라서 schema와 selector가 바뀌어도 build 또는 수동 화면 확인 전에는 회귀를 빠르게 고정할 수 없었습니다. |
| 실제 변경 file/symbol/call path | `package.json`/`package-lock.json`에 Vitest, jsdom, Testing Library, jest-dom을 추가하고 `vitest.config.ts`, `src/test/setup.ts`, `src/lib/portfolio.test.ts`를 만들었습니다. 테스트는 별도 모형 구현을 만들지 않고 production loader와 validation/selectors를 직접 호출합니다. |
| Data/state/DOM/resource owner와 lifetime | Content truth의 owner는 production의 `loadPortfolioSource`와 validation/selectors에 남습니다. Test suite는 JSON source를 읽고 필요할 때 clone을 변형해 input을 만들며, thrown `PortfolioContentError`와 반환값을 관찰하는 consumer입니다. Test harness가 production state를 대신 소유하지 않습니다. |
| Failure·absence·fallback·cleanup | 정상 fixture만 확인하지 않고 잘못된 ID·참조·asset·route/metric 조건을 주입하여 fail-closed path를 통과시킵니다. Error capture helper는 예상한 `PortfolioContentError`를 분리해 메시지와 issue를 검증합니다. 단, 이 commit의 failure injection은 loader/selector 입력 변형이지 filesystem·network failure injection은 아닙니다. |
| Test technique와 실행 증거 | Unit/contract testing입니다. jsdom은 DOM matcher를 제공하지만 이 commit의 핵심은 실제 content ingestion과 selector path를 deterministic fixture로 실행하는 것입니다. Exact test body와 changed files는 확인했으나 test command는 실행하지 않았습니다. |
| 보장하는 것 | 이 SHA에서 `npm test`로 실행 가능한 content contract boundary가 생기고, branch의 현재 JSON source가 loader·asset validation·selector 규칙을 만족하는지 코드로 표현됩니다. |
| 보장하지 않는 것 | Route component의 실제 render, browser navigation, hydration, CSS, production build와 deployed asset availability는 증명하지 않습니다. Test가 추가된 시점의 fixture와 assertion 범위 밖 규칙도 보장하지 않습니다. |
| 다음 commit/관련 test 연결 | `dc07871c4d24`가 같은 suite에 public facade surface와 copy/reference ownership을 추가하고, 이후 `b77b...`·`527b...`가 route view-model projection contract를 별도 test file로 확장합니다. |

#### 최소 code evidence

- **Commit:** `3353032ba23bf0890b3ac0410e3b55638bc70df6`
- **Excerpt:** 생략했습니다. 이 commit의 핵심은 여러 assertion/configuration에 걸쳐 있어 일부 줄만 인용하면 test 범위를 왜곡할 수 있습니다.
- **대신 확인한 위치:** `package.json`의 `test`·`test:watch` script와 Vitest/jsdom/Testing Library devDependencies; `vitest.config.ts`의 jsdom environment, test include pattern, `src/test/setup.ts` 연결; `src/test/setup.ts`의 jest-dom matcher 등록

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command | 미실행 |
| 실제 결과 | 실행 환경에서 `github.com` DNS 해석이 실패하여 repository를 local clone하지 못했습니다. 따라서 이 문서의 역사 증거는 GitHub의 exact commit API에서 확인한 parent diff, changed file, 해당 SHA의 file content와 branch-local classification에 한정합니다. Vitest·Playwright·Axe·screenshot·performance command는 실행하지 않았고, 통과했다고 기록하지 않습니다. |
| 정적 검토 범위 | Exact commit diff, changed files, 위에 열거한 symbol/test/config |

### 2. `dc07871c4d24` — test(portfolio): selector와 presentation 회귀 계약 보강

- **Full SHA:** `dc07871c4d24ddcd85aa15d41ab7fb334ed784a6`
- **Importance:** A
- **Tags:** CONTENT, TEST
- **이 Thread에서의 역할:** public module surface와 mutable/immutable copy ownership 회귀 계약

#### 해당 SHA에서 확인할 실제 코드

- `src/lib/portfolio.test.ts`의 `import * as portfolio`와 정확한 export-name 목록
- `getPortfolioContent()` 두 호출 사이의 root, `projects`, project item, nested `links`, top-level `links` identity 비교
- `site`, `profile`, `presentation`, `journey`가 같은 reference로 유지되는 assertion
- 이 copy policy가 production `src/lib/portfolio.ts`의 facade 구현과 일치하는지

#### Commit-specific investigation

- `dc07871c4d24^`와 `dc07871c4d24`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `public module surface와 mutable/immutable copy ownership 회귀 계약`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
- Production path와 test path를 분리하고, state/data/resource owner와 lifetime·cleanup을 실제 symbol 기준으로 추적합니다.
- Failure/absence/fallback branch와 test technique을 구분하고, 이 SHA가 보장하지 않는 범위를 명시합니다.
- 다음 후속 관계를 대조하되 later code를 이 SHA의 구현으로 설명하지 않습니다: `b77b386b344e`는 aggregate를 renderer에 직접 넘기는 대신 route factory가 파생 결과를 준비한다는 다음 ownership boundary를 테스트합니다.

#### 학습자 증거

| 확인·기록 항목 | 기록 |
| --- | --- |
| 직전 state와 부족함 | 초기 suite는 content의 값과 selector 결과를 확인했지만 public facade에서 어떤 symbol이 노출되어야 하는지, 호출자가 받은 aggregate 중 어떤 부분을 독립적으로 변경할 수 있는지는 고정하지 않았습니다. Export drift나 clone 범위 변화가 컴파일만 통과할 수 있었습니다. |
| 실제 변경 file/symbol/call path | `src/lib/portfolio.test.ts` 하나를 확장하여 public exports를 정확한 목록으로 비교하고, 두 aggregate 호출의 identity를 단계별로 비교합니다. Root aggregate, projects array/items/nested links와 top-level links는 새 객체이고, site/profile/presentation/journey는 동일 source reference라는 비대칭 copy policy를 명시합니다. |
| Data/state/DOM/resource owner와 lifetime | `getPortfolioContent()`가 요청별 mutable collection copy의 owner입니다. 반면 site/profile/presentation/journey는 canonical validated source가 공유하는 read-only reference로 취급됩니다. Test는 deep clone 전체를 요구하지 않고 실제 의도된 ownership 경계를 고정합니다. |
| Failure·absence·fallback·cleanup | 이 commit은 runtime error branch를 새로 만들지 않습니다. 위험은 public export의 누락·추가와 clone boundary가 조용히 바뀌어 caller mutation이 다른 consumer에 전파되는 것입니다. Identity assertions가 그 regression을 즉시 드러냅니다. |
| Test technique와 실행 증거 | Public API characterization와 reference-identity contract test입니다. 실제 facade module을 namespace import하고 실제 `getPortfolioContent()`를 두 번 호출합니다. |
| 보장하는 것 | 허용된 public selector 목록과 mutable collection의 fresh-copy 범위가 명시적으로 고정됩니다. |
| 보장하지 않는 것 | 공유 reference를 `Object.freeze` 하거나 caller mutation을 차단하지는 않습니다. `site` 등 shared object를 변경해도 안전하다는 뜻이 아니라, 이 시점에는 shared immutable input으로 취급한다는 계약입니다. Nested object 전체의 deep-copy 여부도 assertion에 없는 범위는 보장하지 않습니다. |
| 다음 commit/관련 test 연결 | `b77b386b344e`는 aggregate를 renderer에 직접 넘기는 대신 route factory가 파생 결과를 준비한다는 다음 ownership boundary를 테스트합니다. |

#### 최소 code evidence

- **Commit:** `dc07871c4d24ddcd85aa15d41ab7fb334ed784a6`
- **Excerpt:** 생략했습니다. 이 commit의 핵심은 여러 assertion/configuration에 걸쳐 있어 일부 줄만 인용하면 test 범위를 왜곡할 수 있습니다.
- **대신 확인한 위치:** `src/lib/portfolio.test.ts`의 `import * as portfolio`와 정확한 export-name 목록; `getPortfolioContent()` 두 호출 사이의 root, `projects`, project item, nested `links`, top-level `links` identity 비교; `site`, `profile`, `presentation`, `journey`가 같은 reference로 유지되는 assertion

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command | 미실행 |
| 실제 결과 | 실행 환경에서 `github.com` DNS 해석이 실패하여 repository를 local clone하지 못했습니다. 따라서 이 문서의 역사 증거는 GitHub의 exact commit API에서 확인한 parent diff, changed file, 해당 SHA의 file content와 branch-local classification에 한정합니다. Vitest·Playwright·Axe·screenshot·performance command는 실행하지 않았고, 통과했다고 기록하지 않습니다. |
| 정적 검토 범위 | Exact commit diff, changed files, 위에 열거한 symbol/test/config |

### 3. `b77b386b344e` — test(content): route view model 파생 규칙 검증

- **Full SHA:** `b77b386b344e60e1aa2ed3eafd76ab5dafb32342`
- **Importance:** A
- **Tags:** ARCH, CONTENT, VALIDATION
- **이 Thread에서의 역할:** 여섯 route view-model factory의 selection·ordering·fallback contract

#### 해당 SHA에서 확인할 실제 코드

- `src/lib/portfolio/view-models.test.ts`의 `createHomeViewModel`, `createProjectIndexViewModel`, `createProjectDetailViewModel`
- `createAboutViewModel`, `createResumeViewModel`, `createContactViewModel`
- Home의 fixed date, featured/lead fallback, hero/footer placement, metric derivation
- Project group order·중복 방지, detail unknown-ID `null`, stack/image/link preparation
- About/resume/contact의 source-order 유지, unknown reference omission, cinematic contact fallback

#### Commit-specific investigation

- `b77b386b344e^`와 `b77b386b344e`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `여섯 route view-model factory의 selection·ordering·fallback contract`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
- Production path와 test path를 분리하고, state/data/resource owner와 lifetime·cleanup을 실제 symbol 기준으로 추적합니다.
- Failure/absence/fallback branch와 test technique을 구분하고, 이 SHA가 보장하지 않는 범위를 명시합니다.
- 다음 후속 관계를 대조하되 later code를 이 SHA의 구현으로 설명하지 않습니다: `527b9f872333`가 journey/interview를 추가하고, route별 허용 source field와 full-content spread 금지를 structural regression으로 강화합니다.

#### 학습자 증거

| 확인·기록 항목 | 기록 |
| --- | --- |
| 직전 state와 부족함 | Route view-model factories는 존재했지만 renderer가 의존하는 파생 규칙을 독립적으로 고정한 test가 없었습니다. Production implementation이 같은 shape를 반환해도 project order, unknown reference 처리, lead/contact fallback이 바뀌면 각 design renderer가 서로 다른 결과를 낼 수 있었습니다. |
| 실제 변경 file/symbol/call path | 새 `src/lib/portfolio/view-models.test.ts`가 실제 `getPortfolioContent()`와 여섯 factory를 호출합니다. Home은 2026-07-23의 고정 시간을 주입하고, project index는 configured group order와 전체 project의 exactly-once inclusion을, detail은 links/stack/supporting images와 missing ID를 검증합니다. About/resume/contact도 ID resolution과 order/fallback을 확인합니다. |
| Data/state/DOM/resource owner와 lifetime | Raw aggregate 검색과 파생 결정의 owner는 view-model factory입니다. Renderer는 이미 resolved project objects, link lists, metric values와 fallback result를 받습니다. Test fixture가 time을 주입해 `currentYear` 계산의 비결정성을 제거합니다. |
| Failure·absence·fallback·cleanup | Unknown project detail은 `null`, resume의 unknown project ID는 omission, contact는 preferred list가 비면 contact-placement links로 fallback합니다. Supporting image는 cover image와 중복되지 않아야 합니다. 이 서로 다른 absence policy를 하나의 generic rule로 뭉개지 않습니다. |
| Test technique와 실행 증거 | Pure factory characterization입니다. Production factories를 직접 호출하고 object/result ordering을 비교합니다. DOM이나 route page를 render하지 않습니다. |
| 보장하는 것 | Home/projects/project-detail/about/resume/contact의 주요 derivation과 missing-reference policy가 renderer 이전 단계에서 재현 가능하게 고정됩니다. |
| 보장하지 않는 것 | Journey와 interview-map route는 아직 이 test matrix에 없고, route 모델이 허용된 source field만 노출하는지도 아직 검증하지 않습니다. Type-level broad content leakage는 통과할 수 있습니다. |
| 다음 commit/관련 test 연결 | `527b9f872333`가 journey/interview를 추가하고, route별 허용 source field와 full-content spread 금지를 structural regression으로 강화합니다. |

#### 최소 code evidence

- **Commit:** `b77b386b344e60e1aa2ed3eafd76ab5dafb32342`
- **Excerpt:** 생략했습니다. 이 commit의 핵심은 여러 assertion/configuration에 걸쳐 있어 일부 줄만 인용하면 test 범위를 왜곡할 수 있습니다.
- **대신 확인한 위치:** `src/lib/portfolio/view-models.test.ts`의 `createHomeViewModel`, `createProjectIndexViewModel`, `createProjectDetailViewModel`; `createAboutViewModel`, `createResumeViewModel`, `createContactViewModel`; Home의 fixed date, featured/lead fallback, hero/footer placement, metric derivation

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command | 미실행 |
| 실제 결과 | 실행 환경에서 `github.com` DNS 해석이 실패하여 repository를 local clone하지 못했습니다. 따라서 이 문서의 역사 증거는 GitHub의 exact commit API에서 확인한 parent diff, changed file, 해당 SHA의 file content와 branch-local classification에 한정합니다. Vitest·Playwright·Axe·screenshot·performance command는 실행하지 않았고, 통과했다고 기록하지 않습니다. |
| 정적 검토 범위 | Exact commit diff, changed files, 위에 열거한 symbol/test/config |

### 4. `527b9f872333` — test(content): scoped view model과 연락처 회귀 검증

- **Full SHA:** `527b9f872333cbd45f6ab436a7d0e6178ccba6d3`
- **Importance:** A
- **Tags:** CONTENT, VALIDATION, TEST
- **이 Thread에서의 역할:** 여덟 route의 scoped field whitelist와 unresolved-reference hardening

#### 해당 SHA에서 확인할 실제 코드

- `src/lib/portfolio/view-models.test.ts`의 route별 `sourceFields` whitelist
- 공통 `site`, `profile`, `presentation`, `footerLinks`와 route-specific field 비교
- `readFileSync`로 `src/lib/portfolio/view-models.ts`를 읽어 `PortfolioContent &` 및 `...content`를 거부하는 structural assertion
- projects/about model의 `contact` 전달
- Journey milestone의 missing anchor omission과 interview answer의 `{ projectId, project: null }` 유지

#### Commit-specific investigation

- `527b9f872333^`와 `527b9f872333`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `여덟 route의 scoped field whitelist와 unresolved-reference hardening`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
- Production path와 test path를 분리하고, state/data/resource owner와 lifetime·cleanup을 실제 symbol 기준으로 추적합니다.
- Failure/absence/fallback branch와 test technique을 구분하고, 이 SHA가 보장하지 않는 범위를 명시합니다.
- 다음 후속 관계를 대조하되 later code를 이 SHA의 구현으로 설명하지 않습니다: 이 commit으로 content contract Thread가 route projection ownership까지 닫히며, `1598a...`·`055b...`의 renderer matrix가 같은 production factories의 최종 consumer를 검증합니다.

#### 학습자 증거

| 확인·기록 항목 | 기록 |
| --- | --- |
| 직전 state와 부족함 | 여섯 factory의 값 규칙은 테스트됐지만 route model이 시간이 지나며 전체 `PortfolioContent`를 intersection 또는 spread로 다시 노출하는 것을 막지 못했습니다. Journey/interview-map과 projects/about contact data도 기존 matrix 밖이었습니다. |
| 실제 변경 file/symbol/call path | Test matrix를 여덟 route model로 확장하고 각 모델이 source aggregate에서 노출해도 되는 field 이름을 whitelist로 비교합니다. Production source text를 읽어 broad type intersection과 object spread의 두 구체적 회귀 패턴을 거부합니다. Journey와 interview reference resolution 및 contact 전달도 추가합니다. |
| Data/state/DOM/resource owner와 lifetime | Shared shell data는 각 view model이 공통으로 전달하지만, route-specific aggregate slice와 ID resolution은 각 factory가 소유합니다. Journey는 존재하는 project object만 `anchorProjects`에 넣고, interview는 원래 `projectId`를 증거로 보존하면서 resolved object를 `null`로 둡니다. |
| Failure·absence·fallback·cleanup | Missing reference가 route마다 다른 의미를 갖습니다. Journey presentation은 깨진 anchor를 렌더 목록에서 제거하고, interview evidence는 unresolved ID 자체가 진단 정보이므로 삭제하지 않습니다. Structural test는 broad spread를 failure로 만들지만 semantic alias나 helper를 통한 우회까지 탐지하지는 못합니다. |
| Test technique와 실행 증거 | Runtime factory assertions과 source-text structural regression을 결합합니다. Test는 production view-model functions와 production source file을 모두 대상으로 합니다. |
| 보장하는 것 | 여덟 route의 permitted source exposure, 공통 shell field, contact propagation, journey/interview absence semantics가 고정됩니다. |
| 보장하지 않는 것 | TypeScript compiler 수준의 완전한 information-flow proof는 아닙니다. Regex는 정확히 `PortfolioContent &`와 `...content` 패턴만 막고, renderer가 받은 field를 올바르게 표현하는지는 route/render/browser Thread의 책임입니다. |
| 다음 commit/관련 test 연결 | 이 commit으로 content contract Thread가 route projection ownership까지 닫히며, `1598a...`·`055b...`의 renderer matrix가 같은 production factories의 최종 consumer를 검증합니다. |

#### 최소 code evidence

- **Commit:** `527b9f872333cbd45f6ab436a7d0e6178ccba6d3`
- **Path:** `src/lib/portfolio/view-models.test.ts`
- **Location:** `does not build route models by spreading the full content object`

```ts
expect(source).not.toMatch(/PortfolioContent\s*&/);
expect(source).not.toMatch(/\.\.\.content\b/);
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
| Production content path가 executable contract의 source다. | 3353032ba23b | `portfolio.test.ts`가 loader, asset validator와 selectors를 직접 호출 | 도입 |
| Mutable aggregate는 호출 간 격리된다. | dc07871c4d24 | projects/items/nested links는 fresh reference, site/profile/presentation/journey는 shared | 강화 |
| Renderer는 full content가 아니라 route projection을 받는다. | b77b386b344e → 527b9f872333 | factory tests, source-spread guard와 permitted source field table | 도입 후 범위 축소 |
| Unknown references는 route별 explicit absence로 처리된다. | b77b386b344e → 527b9f872333 | missing detail→null, resume/journey unknown ID omission, interview answer project→null | 확장·고정 |

## 7. Failure → Fix → Test

| Earlier failure/risk | Fix SHA | Corrected decision | Regression evidence |
| --- | --- | --- | --- |
| Malformed ID/cross-reference/asset가 정상 content처럼 통과할 위험 | 3353032ba23b | Production validation path에 변형 fixture를 넣고 `PortfolioContentError` 관찰 | Content contract tests |
| 호출자가 returned project/link를 mutation해 다음 요청을 오염할 위험 | dc07871c4d24 | Mutable nested collections의 reference identity를 두 호출 사이 비교 | Clone-boundary regression |
| Renderer가 full aggregate를 받아 local search/spread를 반복할 위험 | b77b386b344e → 527b9f872333 | Route factory result와 source-text guard로 data scope 제한 | View-model regression |
| Unknown project reference가 crash 또는 stale object로 흘러갈 위험 | b77b386b344e → 527b9f872333 | null/omission policy를 route별 assertion으로 고정 | Boundary tests |

## 8. Ownership/state/responsibility 변화

| 대상 | 초기 owner/state | 최종 owner/state | Evidence |
| --- | --- | --- | --- |
| Raw JSON/source | Content files와 loader | 변경 없음 | `loadPortfolioSource` |
| Validation/derived aggregate | Validator와 selector helpers | 변경 없음 | `validatePortfolioAssets`, `getPortfolioContent` |
| Mutable returned data | 암묵적 | 호출별 cloned projects/links | `getPortfolioContent()` identity assertions |
| Route-specific projection | Renderer/local search 가능 | View-model factories | `create*ViewModel` |
| Regression evidence | 없음 | Vitest suites | `portfolio.test.ts`, `view-models.test.ts` |

## 9. 최종 Thread state

다음 내용을 코드 없이 설명합니다: 최종 owner, input→decision→output, failure/absence policy, regression evidence와 명시적 non-guarantee.

Thread 종료 시 content source는 production loader/validator를 거쳐 aggregate가 되고, caller가 수정할 수 있는 project/link graph는 호출마다 격리됩니다. Public module surface와 route factory가 사용할 수 있는 field가 test로 제한되며, unresolved references는 route별 null 또는 omission policy로 변환됩니다. Browser rendering은 이 Thread의 보장 범위가 아닙니다.

## 10. 최종 실행 흐름

| 단계 | Owner / mechanism | Input | Output/state | Failure/non-guarantee |
| ---: | --- | --- | --- | --- |
| 1. Source load | `loadPortfolioSource` | JSON source | raw source | loader/parse error |
| 2. Validation/aggregate | `validatePortfolioAssets`·`getPortfolioContent` | raw source | validated aggregate/fresh mutable graph | `PortfolioContentError` |
| 3. Public selection | `portfolio` facade selectors | aggregate | placement/order/status-derived values | empty/unknown policy |
| 4. Route projection | `create*ViewModel` | aggregate + route key/date | shared shell + route-specific model | null/omitted unresolved reference |
| 5. Regression evidence | `portfolio.test.ts`·`view-models.test.ts` | production functions + deterministic fixtures | assertions | test failure |

## 11. 학습 완료 확인

- [x] 모든 referenced SHA를 exact historical diff 기준으로 설명했습니다.
- [x] Commit map의 SHA·순서·subject·importance·tags를 변경하지 않았습니다.
- [x] Fix를 earlier failure/assumption에 연결했습니다.
- [x] Test가 실행하는 production path와 증명하지 않는 범위를 구분했습니다.
- [x] 정적 inspection과 실제 command execution을 구분했습니다.
- [x] Thread-level invariant, ownership과 final flow를 완성했습니다.
- [x] 실행 제한을 명시했습니다: 실행 환경에서 `github.com` DNS 해석이 실패하여 repository를 local clone하지 못했습니다. 따라서 이 문서의 역사 증거는 GitHub의 exact commit API에서 확인한 parent diff, changed file, 해당 SHA의 file content와 branch-local classification에 한정합니다. Vitest·Playwright·Axe·screenshot·performance command는 실행하지 않았고, 통과했다고 기록하지 않습니다.
