# Thread: Route projections and renderer data ownership

> Project: 42 Archive Portfolio (`web/portfolio`)
>
> 이 문서는 source에서 확정된 thread 구조와 commit 역할만 미리 제공합니다. 실제 구현 해석, code evidence, failure 재현, test 결과, 최종 설명은 해당 SHA의 코드를 직접 확인해 작성합니다.

## 1. Thread 목표

Renderer가 전체 `PortfolioContent`를 받아 관계를 다시 해석하던 상태에서 route별 view model이 join, ordering, fallback, missing-reference policy를 한 번만 해결하고 필요한 데이터만 노출하는 상태로 발전하는 과정을 복원합니다.

**Source-defined significance**

> The initial multi-design system still allowed renderers to reinterpret a broad content graph. Route projections progressively centralize joins, ordering, fallbacks, and time-dependent values. The final type and runtime restrictions make route ownership enforceable rather than conventional.

### 이 Thread에 직접 연결되는 Critical Invariants

- Cross-content join, ordering, fallback은 route projection이 한 번만 수행합니다. — `4d6b4e6d564e → 44e3b80b297f → d4ad7ecd0d08`
- Route literal은 정확한 view-model variant와 상관관계를 가집니다. — `d7eaa1ac401d`
- Journey와 interview renderer는 raw project collection을 조회하지 않습니다. — `bc0a718e2052 → 98f07b1c211d`
- Registry renderer의 유일한 입력은 discriminated route view model입니다. — `f8b0ab7b08aa`
- Common route base는 site/profile/presentation/footerLinks로 제한됩니다. — `5897b4b024da`
- 허용 field와 missing-reference policy는 runtime regression test로 고정됩니다. — `527b9f872333`

### 연결되는 Major Engineering Difficulty

- Broad portfolio object를 scoped route projection으로 이동하면서 renderer behavior를 보존하는 문제
- Cross-reference resolution과 missing-reference policy를 design마다 재구현하지 않도록 한 owner로 제한하는 문제

## 2. 이 Thread를 이해하기 위한 핵심 질문

- Home, projects, detail, about, journey, interview route마다 projection이 소유하는 derived value와 cross-reference는 무엇인가?
- Unknown reference를 omit하는 경우와 `null`로 보존하는 경우는 어떻게 구분되는가?
- Route literal과 view-model variant의 상관관계가 TypeScript와 registry에서 어떻게 유지되는가?
- Type-level `never`와 runtime object shape가 각각 어떤 우회를 막는가?
- Renderer가 raw project collection을 다시 얻지 못한다는 사실을 test가 어떻게 검증하는가?

## 3. 완료 기준

- 각 route projection의 input, output, derived fields, missing-reference policy를 표로 정리했습니다.
- `f8b0ab7b08aa`의 registry input 제한과 `5897b4b024da`의 actual runtime payload 축소 차이를 설명할 수 있습니다.
- Renderer에서 제거된 lookup/filter/grouping code와 새 owner인 factory를 직전 관련 SHA와 비교했습니다.
- `527b9f872333`이 type declaration뿐 아니라 runtime field set과 incomplete reference behavior를 고정하는 방식을 기록했습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Source에서 확정된 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `4d6b4e6d564e` | refactor(content): 홈 route view model 경계 추가 | A | ARCH, CONTENT, ROUTING | Introduces centralized presentation-ready derivation and the route discriminant. |
| 2 | `44e3b80b297f` | refactor(content): 프로젝트 목록 파생 모델 추가 | A | ARCH, CONTENT, REFACTOR | Moves project partitioning and fallback grouping into content projection. |
| 3 | `d4ad7ecd0d08` | refactor(content): 상세와 소개 파생 모델 추가 | A | ARCH, CONTENT, REFACTOR | Resolves project and curation relationships before rendering. |
| 4 | `d7eaa1ac401d` | refactor(routes): renderer view model 요청 타입 추가 | A | ARCH, ROUTING, RENDERER | Correlates each route literal with its exact projection. |
| 5 | `bc0a718e2052` | refactor(content): 여정 근거 view model 추가 | A | ARCH, CONTENT, REFACTOR | Removes raw project lookup from journey renderers. |
| 6 | `98f07b1c211d` | refactor(content): 인터뷰 근거 view model 추가 | A | ARCH, CONTENT, REFACTOR | Preserves unresolved evidence explicitly while resolving valid answers once. |
| 7 | `f8b0ab7b08aa` | refactor(designs): renderer 입력을 route view model로 제한 | S | ARCH, ROUTING, RENDERER | Makes projected route data the only registry input. |
| 8 | `5897b4b024da` | refactor(content): route view model 공용 경계 제한 | S | ARCH, CONTENT, ROUTING | Removes the global content spread and finalizes a small shared base. |
| 9 | `527b9f872333` | test(content): scoped view model과 연락처 회귀 검증 | A | CONTENT, VALIDATION, TEST | Verifies allowed runtime fields and missing-reference behavior. |

## 5. Commit별 학습 기록

각 section은 반드시 해당 SHA를 checkout한 상태에서 작성합니다. Thread 내 이전 commit은 비교 대상으로 사용할 수 있지만 final HEAD를 정답처럼 소급하지 않습니다.

### 1. `4d6b4e6d564e` — refactor(content): 홈 route view model 경계 추가

- **Importance:** A
- **Tags:** ARCH, CONTENT, ROUTING
- **Source-defined thread role:** Introduces centralized presentation-ready derivation and the route discriminant.
- **Source classification summary:** Introduce a dedicated home-route view model that computes presentation-ready selections once at the content boundary.
- **Source classification reason:** Significant because it standardizes a cross-route design, navigation, shell, or dispatch boundary instead of adding isolated page markup.

#### Source에서 확정된 구현 의도와 상태 변화

Home route 전용 view model이 featured fallback, lead project, metrics, current year, recent journey, placed links, preferred contacts를 content boundary에서 한 번 계산합니다. Route discriminant와 unrelated collection 제거도 시작합니다.

#### 해당 SHA에서 확인할 실제 코드

- Home view-model type, factory input/output, route discriminant를 확인합니다.
- Featured project 부재 시 fallback selection과 lead 결정 순서를 추적합니다.
- Metric, current year, recent journey, hero/footer/contact link selection helper를 찾습니다.
- Time-dependent year가 직접 `Date`를 읽는지 주입 가능한지 이 SHA에서 확인합니다.
- Renderer가 이전에 수행하던 derivation code와 비교해 owner 이동을 표시합니다.
- Unrelated collection을 빈 값으로 두거나 제거하는 초기 isolation 방식의 한계를 기록합니다.

확인 원칙:

- 먼저 `4d6b4e6d564e^`와 `4d6b4e6d564e`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Source field와 derived field 구분 | `src/lib/portfolio/view-models.ts`의 home type/factory가 featured fallback→lead project, metrics, recent journey, hero/footer/contact links와 `new Date().getFullYear()` 값을 계산합니다. |
| Fallback과 ordering 규칙 | home route discriminant와 presentation-ready fields를 만드는 factory를 도입했습니다. |
| Renderer에서 제거된 계산 | `src/lib/portfolio/view-models.ts`의 home type/factory가 featured fallback→lead project, metrics, recent journey, hero/footer/contact links와 `new Date().getFullYear()` 값을 계산합니다. |
| Route discriminant가 union에 제공하는 기반 | home route discriminant와 presentation-ready fields를 만드는 factory를 도입했습니다. `src/lib/portfolio/view-models.ts`의 home type/factory가 featured fallback→lead project, metrics, recent journey, hero/footer/contact links와 `new Date().getFullYear()` 값을 계산합니다. |
| 아직 broad compatibility가 남은 부분 | `RouteViewModelBase = PortfolioContent & ...`, `...content`, synthetic empty collections가 남아 실제 runtime isolation은 아직 아닙니다. Year도 주입 가능 clock이 아니라 직접 `Date`를 읽습니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 각 home renderer가 featured fallback, metrics, contact/link placement, recent journey와 year를 직접 계산했습니다.
- **해당 SHA 핵심 코드:** `src/lib/portfolio/view-models.ts`의 home type/factory가 featured fallback→lead project, metrics, recent journey, hero/footer/contact links와 `new Date().getFullYear()` 값을 계산합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `44e3b80b297f`과 `d4ad7ecd0d08`이 다른 route projection으로 확장하고 `5897b4b024da`가 broad base를 제거합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** 각 home renderer가 featured fallback, metrics, contact/link placement, recent journey와 year를 직접 계산했습니다. 다섯 renderer가 같은 source graph를 다르게 해석하거나 시간 값과 fallback을 중복 계산할 수 있었습니다.
- **구현 결정과 경로:** home route discriminant와 presentation-ready fields를 만드는 factory를 도입했습니다. `src/lib/portfolio/view-models.ts`의 home type/factory가 featured fallback→lead project, metrics, recent journey, hero/footer/contact links와 `new Date().getFullYear()` 값을 계산합니다.
- **소유권·실패 처리:** factory가 semantic selection을 소유하기 시작하고 renderer는 prepared fields를 소비합니다. featured가 없으면 enabled projects에서 fallback하고 lead는 그 결과의 첫 항목으로 결정됩니다.
- **보장:** home derivation과 route discriminant가 한 위치에 생깁니다.
- **보장하지 않는 범위:** `RouteViewModelBase = PortfolioContent & ...`, `...content`, synthetic empty collections가 남아 실제 runtime isolation은 아직 아닙니다. Year도 주입 가능 clock이 아니라 직접 `Date`를 읽습니다.
- **후속 연결:** `44e3b80b297f`과 `d4ad7ecd0d08`이 다른 route projection으로 확장하고 `5897b4b024da`가 broad base를 제거합니다.

### 2. `44e3b80b297f` — refactor(content): 프로젝트 목록 파생 모델 추가

- **Importance:** A
- **Tags:** ARCH, CONTENT, REFACTOR
- **Source-defined thread role:** Moves project partitioning and fallback grouping into content projection.
- **Source classification summary:** Add a projects-route view model that resolves featured and archive partitions, project groups, and metric values before rendering.
- **Source classification reason:** Significant because it materially narrows ownership or coupling at a boundary used by multiple routes and renderers while preserving established behavior.

#### Source에서 확정된 구현 의도와 상태 변화

Projects route view model이 featured/archive partition, group ordering, fallback groups, metric values를 rendering 전에 해결합니다. Empty configured group은 생략하지만 unknown group의 project는 보존합니다.

#### 해당 SHA에서 확인할 실제 코드

- Featured와 archive collection을 나누는 predicate와 duplicate 방지 방식을 확인합니다.
- Configured group order/metadata를 적용하고 empty group을 생략하는 loop를 추적합니다.
- Unknown group ID를 deterministic fallback group으로 보존하는 규칙을 확인합니다.
- Metric values가 selector를 통해 한 번 계산되어 model에 저장되는지 확인합니다.
- Design renderer의 이전 local grouping code와 비교합니다.

확인 원칙:

- 먼저 `44e3b80b297f^`와 `44e3b80b297f`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Configured taxonomy와 unknown data 보존의 균형 | projects route projection에서 partition/grouping/order/metric을 한 번 해결했습니다. `createProjectsViewModel`은 featured predicate로 한 collection을 분리하고 archive는 featured가 아닌 나머지로 만들어 중복을 막습니다. Configured group 순서대로 non-empty group만 넣고 unknown group IDs는 deterministic fallback groups로 뒤에 보존합니다. |
| Empty group omission과 project omission 차이 | `createProjectsViewModel`은 featured predicate로 한 collection을 분리하고 archive는 featured가 아닌 나머지로 만들어 중복을 막습니다. Configured group 순서대로 non-empty group만 넣고 unknown group IDs는 deterministic fallback groups로 뒤에 보존합니다. |
| Group/order/metric owner 이동 | projection이 taxonomy/ordering/metric value를 소유하고 renderer는 group collection을 배치합니다. |
| Featured와 archive 중복 방지 증거 | projects route projection에서 partition/grouping/order/metric을 한 번 해결했습니다. `createProjectsViewModel`은 featured predicate로 한 collection을 분리하고 archive는 featured가 아닌 나머지로 만들어 중복을 막습니다. Configured group 순서대로 non-empty group만 넣고 unknown group IDs는 deterministic fallback groups로 뒤에 보존합니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** projects renderer들이 featured/archive partition, group order, metrics와 unknown taxonomy fallback을 각자 계산했습니다.
- **해당 SHA 핵심 코드:** `createProjectsViewModel`은 featured predicate로 한 collection을 분리하고 archive는 featured가 아닌 나머지로 만들어 중복을 막습니다. Configured group 순서대로 non-empty group만 넣고 unknown group IDs는 deterministic fallback groups로 뒤에 보존합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `d4ad7ecd0d08`이 detail/about 관계 해석을 projection으로 이동합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** projects renderer들이 featured/archive partition, group order, metrics와 unknown taxonomy fallback을 각자 계산했습니다. configured empty group을 보여 주거나 unknown group project를 버리는 등 design별 behavior divergence가 가능했습니다.
- **구현 결정과 경로:** projects route projection에서 partition/grouping/order/metric을 한 번 해결했습니다. `createProjectsViewModel`은 featured predicate로 한 collection을 분리하고 archive는 featured가 아닌 나머지로 만들어 중복을 막습니다. Configured group 순서대로 non-empty group만 넣고 unknown group IDs는 deterministic fallback groups로 뒤에 보존합니다.
- **소유권·실패 처리:** projection이 taxonomy/ordering/metric value를 소유하고 renderer는 group collection을 배치합니다. configured empty group은 omission되지만 그 group이 unknown이라는 이유로 project 자체를 버리지는 않습니다.
- **보장:** 모든 design이 동일 featured/archive/group/metric 결과를 받습니다.
- **보장하지 않는 범위:** detail/about/journey/interview relationship은 아직 renderer 또는 다른 route에서 해결합니다.
- **후속 연결:** `d4ad7ecd0d08`이 detail/about 관계 해석을 projection으로 이동합니다.

### 3. `d4ad7ecd0d08` — refactor(content): 상세와 소개 파생 모델 추가

- **Importance:** A
- **Tags:** ARCH, CONTENT, REFACTOR
- **Source-defined thread role:** Resolves project and curation relationships before rendering.
- **Source classification summary:** Extend the route-model boundary to project detail and about pages.
- **Source classification reason:** Significant because it materially narrows ownership or coupling at a boundary used by multiple routes and renderers while preserving established behavior.

#### Source에서 확정된 구현 의도와 상태 변화

Project detail과 About projection을 추가합니다. Detail은 unknown project에 `null`, action links, stack fallback, secondary screenshots를 준비하고 About은 curation project reference를 indexed lookup으로 해결해 missing reference를 생략합니다.

#### 해당 SHA에서 확인할 실제 코드

- `createProjectDetailViewModel`의 lookup 실패 `null` branch를 확인합니다.
- Detail action links, technology fallback, lead image 제외 secondary screenshot 계산을 추적합니다.
- About curation project ID가 indexed lookup으로 해결되고 missing item이 filter되는 지점을 찾습니다.
- Renderer의 이전 unsafe non-null stack lookup과 raw reference resolution을 비교합니다.
- Detail null과 About omission이라는 서로 다른 absence policy를 구분합니다.

확인 원칙:

- 먼저 `d4ad7ecd0d08^`와 `d4ad7ecd0d08`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Detail null이 page-level 404로 이어질 준비 경계 | detail factory가 page-level absence를 표현하고 about factory가 curation join/order를 소유합니다. |
| Stack fallback과 screenshot exclusion 규칙 | project detail과 about projection을 추가하고 route semantics별 absence policy를 명시했습니다. |
| Curation reference order 보존 여부 | project detail과 about projection을 추가하고 route semantics별 absence policy를 명시했습니다. |
| Route semantics에 따른 missing-reference 정책 차이 | detail은 model 전체를 `null`로 반환할 수 있어 caller의 404 경계를 준비하고, about은 일부 missing curation reference만 omit합니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** detail renderer는 project/stack/link/screenshot을 직접 찾고 about renderer는 curation project IDs를 raw collection에서 해결했습니다.
- **해당 SHA 핵심 코드:** `createProjectDetailViewModel`은 unknown ID에 `null`, valid project에 enabled action links, technology stack fallback, lead image를 제외한 secondary screenshots를 만듭니다. About factory는 indexed project lookup으로 curation IDs를 source order대로 resolve하고 missing ID는 filter합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `d7eaa1ac401d`이 route/model correlation을 추가합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** detail renderer는 project/stack/link/screenshot을 직접 찾고 about renderer는 curation project IDs를 raw collection에서 해결했습니다. unsafe non-null lookup과 design별 missing-reference 처리 차이가 있었습니다.
- **구현 결정과 경로:** project detail과 about projection을 추가하고 route semantics별 absence policy를 명시했습니다. `createProjectDetailViewModel`은 unknown ID에 `null`, valid project에 enabled action links, technology stack fallback, lead image를 제외한 secondary screenshots를 만듭니다. About factory는 indexed project lookup으로 curation IDs를 source order대로 resolve하고 missing ID는 filter합니다.
- **소유권·실패 처리:** detail factory가 page-level absence를 표현하고 about factory가 curation join/order를 소유합니다. detail은 model 전체를 `null`로 반환할 수 있어 caller의 404 경계를 준비하고, about은 일부 missing curation reference만 omit합니다.
- **보장:** stack/link/screenshot/curation relationship이 renderer 전에 확정됩니다.
- **보장하지 않는 범위:** route literal과 exact model type correlation, journey/interview joins는 아직 남습니다.
- **후속 연결:** `d7eaa1ac401d`이 route/model correlation을 추가합니다.

### 4. `d7eaa1ac401d` — refactor(routes): renderer view model 요청 타입 추가

- **Importance:** A
- **Tags:** ARCH, ROUTING, RENDERER
- **Source-defined thread role:** Correlates each route literal with its exact projection.
- **Source classification summary:** Introduce a typed migration request that pairs each route literal with its corresponding view-model variant.
- **Source classification reason:** Significant because it standardizes a cross-route design, navigation, shell, or dispatch boundary instead of adding isolated page markup.

#### Source에서 확정된 구현 의도와 상태 변화

각 route literal을 정확한 view-model variant와 연결하는 typed migration request를 도입합니다. Registry는 새 discriminated request와 legacy props를 임시로 모두 받아 adapter합니다.

#### 해당 SHA에서 확인할 실제 코드

- Route literal에서 view-model type으로 매핑하는 generic/conditional type을 확인합니다.
- 새 request union과 legacy props의 discriminant 차이를 찾습니다.
- Adapter가 project detail에서만 project를 추출하는 branch를 확인합니다.
- Invalid route/model 조합이 compile time에 거부되는 예시를 작성합니다.
- Compatibility layer가 migration을 가능하게 하지만 broad input을 유지하는 부분을 기록합니다.

확인 원칙:

- 먼저 `d7eaa1ac401d^`와 `d7eaa1ac401d`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Route-to-model correlation의 TypeScript 표현 | design request union이 `{ route, viewModel: ViewModelForRoute<R> }` 형태의 correlation을 표현하고 registry adapter는 새 request와 legacy props를 모두 받아 detail일 때만 project를 추출합니다. |
| Legacy adapter lifecycle과 제거 조건 | `f8b0ab7b08aa`이 legacy content/request surface를 제거합니다. |
| Compile-time guarantee와 runtime guard 역할 | route literal을 conditional/generic type으로 model variant에 연결한 typed migration request를 추가했습니다. design request union이 `{ route, viewModel: ViewModelForRoute<R> }` 형태의 correlation을 표현하고 registry adapter는 새 request와 legacy props를 모두 받아 detail일 때만 project를 추출합니다. |
| 후속 `f8b0ab7b08aa`에서 제거될 surface | `f8b0ab7b08aa`이 legacy content/request surface를 제거합니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** route model factories가 생겼지만 registry request가 route literal과 exact model variant를 강하게 묶지 않았습니다.
- **해당 SHA 핵심 코드:** design request union이 `{ route, viewModel: ViewModelForRoute<R> }` 형태의 correlation을 표현하고 registry adapter는 새 request와 legacy props를 모두 받아 detail일 때만 project를 추출합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `f8b0ab7b08aa`이 legacy content/request surface를 제거합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** route model factories가 생겼지만 registry request가 route literal과 exact model variant를 강하게 묶지 않았습니다. 잘못된 route/model 조합이 adapter나 renderer까지 도달할 수 있고 migration 동안 broad legacy props가 남았습니다.
- **구현 결정과 경로:** route literal을 conditional/generic type으로 model variant에 연결한 typed migration request를 추가했습니다. design request union이 `{ route, viewModel: ViewModelForRoute<R> }` 형태의 correlation을 표현하고 registry adapter는 새 request와 legacy props를 모두 받아 detail일 때만 project를 추출합니다.
- **소유권·실패 처리:** type system이 새 request의 correlation을 소유하지만 legacy adapter가 broad input lifecycle을 임시로 유지합니다. 새 typed request는 invalid pair를 compile time에 막지만 runtime/legacy caller에는 adapter guard가 필요합니다.
- **보장:** migration caller는 route와 맞는 projection을 요청할 수 있습니다.
- **보장하지 않는 범위:** complete content input과 compatibility surface가 남아 strict renderer-only contract는 아닙니다.
- **후속 연결:** `f8b0ab7b08aa`이 legacy content/request surface를 제거합니다.

### 5. `bc0a718e2052` — refactor(content): 여정 근거 view model 추가

- **Importance:** A
- **Tags:** ARCH, CONTENT, REFACTOR
- **Source-defined thread role:** Removes raw project lookup from journey renderers.
- **Source classification summary:** Introduce a journey-specific view model that resolves content references before they reach a renderer.
- **Source classification reason:** Significant because it materially narrows ownership or coupling at a boundary used by multiple routes and renderers while preserving established behavior.

#### Source에서 확정된 구현 의도와 상태 변화

Journey 전용 view model이 milestone anchor ID를 existing project로 해결하고 unknown ID는 생략합니다. Timeline project는 resolved object 또는 explicit `null`로 표현하며 raw project collection은 제외합니다.

#### 해당 SHA에서 확인할 실제 코드

- Project lookup index와 milestone anchor mapping/filter 순서를 확인합니다.
- Timeline project field가 absent, valid, unknown일 때 각각 어떤 model value가 되는지 추적합니다.
- Full projects collection이 journey model output에서 제외되는지 runtime/type 모두 확인합니다.
- 각 renderer의 이전 anchor lookup code와 비교해 중복 제거를 표시합니다.
- Source order가 resolution/filter 후에도 유지되는지 확인합니다.

확인 원칙:

- 먼저 `bc0a718e2052^`와 `bc0a718e2052`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Milestone unknown reference omission 정책 | journey-specific projection이 project index를 한 번 만들고 evidence relationship을 resolve하게 했습니다. |
| Timeline explicit `null` 정책 | journey-specific projection이 project index를 한 번 만들고 evidence relationship을 resolve하게 했습니다. |
| Renderer에 필요한 evidence relationship만 남긴 payload | factory는 milestone anchor IDs를 map한 뒤 unresolved item을 filter해 source order를 보존하고, timeline project는 valid object 또는 explicit `null`로 저장합니다. 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다. |
| Project lookup의 단일 owner | projection이 project lookup을 단독 소유하고 renderer payload에는 필요한 milestone/timeline relationship만 남습니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** journey renderer마다 milestone anchor와 timeline project를 raw project collection에서 lookup했습니다.
- **해당 SHA 핵심 코드:** factory는 milestone anchor IDs를 map한 뒤 unresolved item을 filter해 source order를 보존하고, timeline project는 valid object 또는 explicit `null`로 저장합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `98f07b1c211d`이 같은 원칙을 interview hierarchy에 적용합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** journey renderer마다 milestone anchor와 timeline project를 raw project collection에서 lookup했습니다. unknown ID를 omit할지 placeholder로 보일지 design마다 달라질 수 있었습니다.
- **구현 결정과 경로:** journey-specific projection이 project index를 한 번 만들고 evidence relationship을 resolve하게 했습니다. factory는 milestone anchor IDs를 map한 뒤 unresolved item을 filter해 source order를 보존하고, timeline project는 valid object 또는 explicit `null`로 저장합니다.
- **소유권·실패 처리:** projection이 project lookup을 단독 소유하고 renderer payload에는 필요한 milestone/timeline relationship만 남습니다. unknown milestone anchor는 omit하고 absent/unknown timeline project는 `null`로 표현합니다.
- **보장:** journey renderer가 raw projects collection을 다시 조회하지 않아도 됩니다.
- **보장하지 않는 범위:** interview answer evidence는 아직 별도 projection이 필요합니다.
- **후속 연결:** `98f07b1c211d`이 같은 원칙을 interview hierarchy에 적용합니다.

### 6. `98f07b1c211d` — refactor(content): 인터뷰 근거 view model 추가

- **Importance:** A
- **Tags:** ARCH, CONTENT, REFACTOR
- **Source-defined thread role:** Preserves unresolved evidence explicitly while resolving valid answers once.
- **Source classification summary:** Introduce an interview-map view model that preserves the track, question, and answer hierarchy while resolving each answer’s project identifier to a project object or `null`.
- **Source classification reason:** Significant because it materially narrows ownership or coupling at a boundary used by multiple routes and renderers while preserving established behavior.

#### Source에서 확정된 구현 의도와 상태 변화

Interview-map view model이 track/question/answer hierarchy를 보존하면서 각 answer project ID를 project object 또는 `null`로 해결합니다. Missing evidence는 presentation boundary에 명시적으로 남습니다.

#### 해당 SHA에서 확인할 실제 코드

- Nested mapping에서 source identifier가 보존되는지 확인합니다.
- Project lookup이 한 번 만들어져 각 answer에 재사용되는지 확인합니다.
- Valid와 unknown reference가 object/`null`로 표현되는 branch를 추적합니다.
- Raw project collection이 model에 포함되지 않는지 확인합니다.
- Renderer가 unresolved ID를 visible no-evidence state로 표시할 field를 확인합니다.

확인 원칙:

- 먼저 `98f07b1c211d^`와 `98f07b1c211d`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Hierarchy 보존과 join resolution 분리 | track/question/answer hierarchy와 identifiers를 보존하면서 answer evidence만 object 또는 `null`로 resolve했습니다. interview factory는 project index를 한 번 만든 뒤 nested map에서 answer ID/depth note를 유지하고 `projectId`가 valid하면 object, 아니면 `project: null`을 넣습니다. |
| Missing evidence를 omission하지 않는 이유 | unresolved answer를 omit하지 않고 identifier와 `null`을 남겨 source의 evidence gap을 보존합니다. |
| Identifier, resolved project, depth note의 상관관계 | interview factory는 project index를 한 번 만든 뒤 nested map에서 answer ID/depth note를 유지하고 `projectId`가 valid하면 object, 아니면 `project: null`을 넣습니다. |
| Template별 project map 제거 전후 | track/question/answer hierarchy와 identifiers를 보존하면서 answer evidence만 object 또는 `null`로 resolve했습니다. interview factory는 project index를 한 번 만든 뒤 nested map에서 answer ID/depth note를 유지하고 `projectId`가 valid하면 object, 아니면 `project: null`을 넣습니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** interview renderer마다 answer의 project ID를 map으로 다시 해결했습니다.
- **해당 SHA 핵심 코드:** interview factory는 project index를 한 번 만든 뒤 nested map에서 answer ID/depth note를 유지하고 `projectId`가 valid하면 object, 아니면 `project: null`을 넣습니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `f8b0ab7b08aa`이 route model을 registry의 유일한 input으로 만듭니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** interview renderer마다 answer의 project ID를 map으로 다시 해결했습니다. missing evidence를 삭제하면 질문/답변 구조 자체가 바뀌고 design마다 표시가 달라질 수 있었습니다.
- **구현 결정과 경로:** track/question/answer hierarchy와 identifiers를 보존하면서 answer evidence만 object 또는 `null`로 resolve했습니다. interview factory는 project index를 한 번 만든 뒤 nested map에서 answer ID/depth note를 유지하고 `projectId`가 valid하면 object, 아니면 `project: null`을 넣습니다.
- **소유권·실패 처리:** projection이 join을 소유하고 renderer는 explicit no-evidence state를 표시할 수 있습니다. unresolved answer를 omit하지 않고 identifier와 `null`을 남겨 source의 evidence gap을 보존합니다.
- **보장:** 모든 design이 같은 hierarchy와 evidence resolution을 받습니다.
- **보장하지 않는 범위:** registry가 complete content를 함께 받을 수 있는 우회는 아직 남습니다.
- **후속 연결:** `f8b0ab7b08aa`이 route model을 registry의 유일한 input으로 만듭니다.

### 7. `f8b0ab7b08aa` — refactor(designs): renderer 입력을 route view model로 제한

- **Importance:** S
- **Tags:** ARCH, ROUTING, RENDERER
- **Source-defined thread role:** Makes projected route data the only registry input.
- **Source classification summary:** Change the common design contract from the complete portfolio content object to the discriminated union of route view models.
- **Source classification reason:** Critical because it forbids renderers from consuming the global content graph and makes prepared, discriminated route data the only legal design input.

#### Source에서 확정된 구현 의도와 상태 변화

Common design contract를 complete `PortfolioContent`에서 discriminated route-view-model union으로 바꾸고 shell도 projected `footerLinks`를 받도록 합니다. Journey/interview temporary request와 compatibility 경계를 제거합니다.

#### S-level source profile

- **Problem:** Full-site renderer가 complete portfolio aggregate를 받아 design별로 join, filter, fallback을 다시 수행할 수 있었습니다.
- **Decision:** Renderer props를 discriminated route-view-model union으로 교체하고 shell data도 명시적으로 projection합니다.
- **Why it mattered:** Composition의 자유는 유지하되 project membership, evidence resolution, contact precedence를 재해석할 우회를 막습니다.
- **What changed:** Registry contract와 shell adapter를 route-owned projections로 좁힙니다.

#### 해당 SHA에서 확인할 실제 코드

- Registry render function input type이 route-view-model union으로 바뀌는 diff를 확인합니다.
- 각 renderer entry가 route discriminant를 좁혀 exact model field만 접근하는지 확인합니다.
- Shell adapter가 raw links 대신 `footerLinks`를 소비하는 모든 design을 찾습니다.
- Legacy content props와 alternate journey/interview request가 제거됐는지 검색합니다.
- Renderer의 raw project lookup/grouping/contact filtering이 type error로 드러나는지 확인합니다.
- Route page가 model 없이 registry를 호출할 수 없는 compile-time path를 추적합니다.
- Visual composition은 바꿀 수 있지만 semantic selection을 재해석할 수 없는 concrete example을 입증합니다.

확인 원칙:

- 먼저 `f8b0ab7b08aa^`와 `f8b0ab7b08aa`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| View model이 있어도 complete content를 허용하던 우회 | registry와 모든 renderer props를 discriminated `PortfolioRouteViewModel` union 하나로 교체했습니다. `src/designs/types.ts`, `src/designs/registry.tsx`와 다섯 renderer entry가 route discriminant로 exact fields를 좁히며 shell은 raw links 대신 projected `footerLinks`를 받습니다. Journey/interview temporary request와 legacy content props가 제거됐습니다. |
| Design별 join/filter/fallback 재구현 문제 | registry와 모든 renderer props를 discriminated `PortfolioRouteViewModel` union 하나로 교체했습니다. |
| Discriminated route models only decision | registry와 모든 renderer props를 discriminated `PortfolioRouteViewModel` union 하나로 교체했습니다. |
| Registry contract, renderer props, shell adapters, removed compatibility | registry와 모든 renderer props를 discriminated `PortfolioRouteViewModel` union 하나로 교체했습니다. `src/designs/types.ts`, `src/designs/registry.tsx`와 다섯 renderer entry가 route discriminant로 exact fields를 좁히며 shell은 raw links 대신 projected `footerLinks`를 받습니다. Journey/interview temporary request와 legacy content props가 제거됐습니다. |
| Content graph, projection, renderer composition ownership | content graph는 loader/facade, semantic projection은 route factory, visual composition은 renderer가 소유합니다. |
| Unresolved references가 model에서 표현되는 방식 | `src/designs/types.ts`, `src/designs/registry.tsx`와 다섯 renderer entry가 route discriminant로 exact fields를 좁히며 shell은 raw links 대신 projected `footerLinks`를 받습니다. Journey/interview temporary request와 legacy content props가 제거됐습니다. |
| 보장하는 것: registry input 수준 semantic consistency | registry input 수준에서 route/model correlation과 semantic selection consistency를 보장합니다. |
| 아직 보장하지 않는 것: actual runtime payload 최소성 | 각 factory가 runtime에 실제로 full content를 spread하는지까지는 막지 못합니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** view model이 있어도 common design contract와 compatibility request가 complete `PortfolioContent`를 허용했습니다.
- **해당 SHA 핵심 코드:** `src/designs/types.ts`, `src/designs/registry.tsx`와 다섯 renderer entry가 route discriminant로 exact fields를 좁히며 shell은 raw links 대신 projected `footerLinks`를 받습니다. Journey/interview temporary request와 legacy content props가 제거됐습니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `5897b4b024da`가 runtime payload의 broad spread와 synthetic empty collections를 제거합니다.

#### SHA별 복원 결론

- **이전 상태:** view model이 있어도 common design contract와 compatibility request가 complete `PortfolioContent`를 허용했습니다.
- **문제와 위험:** renderer가 raw projects/links/groups를 다시 얻어 join, fallback, contact precedence를 재구현할 수 있었습니다.
- **핵심 결정:** registry와 모든 renderer props를 discriminated `PortfolioRouteViewModel` union 하나로 교체했습니다.
- **실제 구현 경로:** `src/designs/types.ts`, `src/designs/registry.tsx`와 다섯 renderer entry가 route discriminant로 exact fields를 좁히며 shell은 raw links 대신 projected `footerLinks`를 받습니다. Journey/interview temporary request와 legacy content props가 제거됐습니다.
- **소유권·상태 변화:** content graph는 loader/facade, semantic projection은 route factory, visual composition은 renderer가 소유합니다.
- **실패 경계:** unresolved relationship은 journey omission, timeline/interview `null`, detail `null`처럼 model에 이미 표현돼 renderer가 policy를 다시 정하지 않습니다.
- **보장:** registry input 수준에서 route/model correlation과 semantic selection consistency를 보장합니다.
- **보장하지 않는 범위:** 각 factory가 runtime에 실제로 full content를 spread하는지까지는 막지 못합니다.
- **후속 fix/test:** `5897b4b024da`가 runtime payload의 broad spread와 synthetic empty collections를 제거합니다.

### 8. `5897b4b024da` — refactor(content): route view model 공용 경계 제한

- **Importance:** S
- **Tags:** ARCH, CONTENT, ROUTING
- **Source-defined thread role:** Removes the global content spread and finalizes a small shared base.
- **Source classification summary:** Finish the route-model isolation by reducing the common base to presentation, profile, site, and prepared footer links.
- **Source classification reason:** Critical because it finalizes route-level data ownership: the shared payload is intentionally small and unrelated source collections are unavailable both at runtime and by type.

#### Source에서 확정된 구현 의도와 상태 변화

Route-model common base를 site, profile, presentation, prepared footer links로 축소하고 factory에서 complete content spread와 synthetic empty collections를 제거합니다. Unavailable key는 `never`로만 남깁니다.

#### S-level source profile

- **Problem:** Earlier view model이 broad common object와 synthetic empty collection을 유지해 actual runtime ownership을 숨길 수 있었습니다.
- **Decision:** Common base를 site, profile, presentation, footerLinks로 축소하고 unavailable key는 runtime에 복사하지 않습니다.
- **Why it mattered:** Route isolation을 완결해 renderer가 unrelated source를 복구하지 못하게 합니다.
- **What changed:** Full content spread와 empty compatibility arrays를 제거합니다.

#### 해당 SHA에서 확인할 실제 코드

- Common base type의 허용 field와 `never` 처리된 unavailable key를 확인합니다.
- Factory object construction에서 `...content` spread가 제거되는 diff를 찾습니다.
- Links, groups, projects, metrics용 synthetic empty array가 제거됐는지 확인합니다.
- 각 route factory가 필요한 source field만 명시적으로 copy하는지 runtime key로 확인합니다.
- `never` field가 compile-time 접근을 막지만 runtime key를 만들지 않는지 확인합니다.
- Footer links가 common prepared field로 남는 이유와 selection owner를 추적합니다.
- Legacy helper signature와 actual payload가 어떻게 공존하는지 확인합니다.

확인 원칙:

- 먼저 `5897b4b024da^`와 `5897b4b024da`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Broad common object와 empty collection이 ownership을 숨긴 방식 | shared shell fields는 small base가, route semantics는 각 return literal이 소유하며 runtime object에는 compatibility key가 만들어지지 않습니다. |
| Small shared base, explicit route fields, no runtime compatibility payload decision | common base를 `site/profile/presentation/footerLinks`로 제한하고 각 factory가 route field만 explicit copy하도록 바꿨습니다. |
| Base type, factory return literals, `never` declarations | common base를 `site/profile/presentation/footerLinks`로 제한하고 각 factory가 route field만 explicit copy하도록 바꿨습니다. `src/lib/portfolio/view-models.ts`에서 full spread와 synthetic links/groups/projects/metrics arrays가 제거되고 unavailable source keys는 type-level `never`로만 선언됩니다. |
| Runtime ownership과 type-level compatibility 차이 | shared shell fields는 small base가, route semantics는 각 return literal이 소유하며 runtime object에는 compatibility key가 만들어지지 않습니다. |
| Payload field 변화 | `src/lib/portfolio/view-models.ts`에서 full spread와 synthetic links/groups/projects/metrics arrays가 제거되고 unavailable source keys는 type-level `never`로만 선언됩니다. |
| 보장하는 것: unrelated collection 복구 불가 | renderer가 unrelated collection을 model에서 복구할 수 없는 type/runtime 경계를 함께 제공합니다. |
| 후속 test와 연결 | `527b9f872333`이 allowed runtime keys와 source-structure prohibition을 regression test로 고정합니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** type-level renderer input은 좁아졌지만 factory base가 `PortfolioContent` intersection과 `...content`를 사용하고 unrelated collections를 빈 배열로 덮었습니다.
- **해당 SHA 핵심 코드:** `src/lib/portfolio/view-models.ts`에서 full spread와 synthetic links/groups/projects/metrics arrays가 제거되고 unavailable source keys는 type-level `never`로만 선언됩니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `527b9f872333`이 allowed runtime keys와 source-structure prohibition을 regression test로 고정합니다.

#### SHA별 복원 결론

- **이전 상태:** type-level renderer input은 좁아졌지만 factory base가 `PortfolioContent` intersection과 `...content`를 사용하고 unrelated collections를 빈 배열로 덮었습니다.
- **문제와 위험:** 실제 object에 global graph가 남으면 casting, key enumeration, helper signature를 통해 ownership을 복구하거나 숨길 수 있었습니다.
- **핵심 결정:** common base를 `site/profile/presentation/footerLinks`로 제한하고 각 factory가 route field만 explicit copy하도록 바꿨습니다.
- **실제 구현 경로:** `src/lib/portfolio/view-models.ts`에서 full spread와 synthetic links/groups/projects/metrics arrays가 제거되고 unavailable source keys는 type-level `never`로만 선언됩니다.
- **소유권·상태 변화:** shared shell fields는 small base가, route semantics는 각 return literal이 소유하며 runtime object에는 compatibility key가 만들어지지 않습니다.
- **실패 경계:** `never`는 compile-time access를 막고 explicit object construction은 runtime key 자체를 없앱니다.
- **보장:** renderer가 unrelated collection을 model에서 복구할 수 없는 type/runtime 경계를 함께 제공합니다.
- **보장하지 않는 범위:** serialization byte나 visual behavior는 이 refactor만으로 측정하지 않습니다.
- **후속 fix/test:** `527b9f872333`이 allowed runtime keys와 source-structure prohibition을 regression test로 고정합니다.

### 9. `527b9f872333` — test(content): scoped view model과 연락처 회귀 검증

- **Importance:** A
- **Tags:** CONTENT, VALIDATION, TEST
- **Source-defined thread role:** Verifies allowed runtime fields and missing-reference behavior.
- **Source classification summary:** Lock down the route-view-model boundary at runtime rather than relying only on TypeScript declarations.
- **Source classification reason:** Significant because it strengthens the shared content trust boundary or a cross-file invariant used by every route, rather than validating one local component.

#### Source에서 확정된 구현 의도와 상태 변화

각 route model이 runtime에 보유해도 되는 source field를 열거하고 full `PortfolioContent` spread/intersection 재구성을 거부합니다. Contact fallback, journey omission, interview null behavior도 회귀 계약으로 고정합니다.

#### 해당 SHA에서 확인할 실제 코드

- Route별 allowed field fixture와 shared shell field assertion을 확인합니다.
- Runtime key enumeration 또는 source structural check가 full spread/intersection을 탐지하는 방식을 추적합니다.
- Projects/About model이 실제 필요한 contact data를 유지하는 test를 확인합니다.
- Journey unresolved anchor drop과 Interview identifier+`null` 유지 fixture를 비교합니다.
- Contact preferred link precedence와 placement fallback test를 확인합니다.
- Test가 호출하는 production factory와 isolated helper 범위를 구분합니다.

확인 원칙:

- 먼저 `527b9f872333^`와 `527b9f872333`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 대상 production invariant | route payload scope, contact selection과 omission/null policy가 runtime regression으로 고정됩니다. |
| 주입한 incomplete reference와 expected model shape | runtime key whitelist, source structural assertion, semantic incomplete-reference fixtures와 renderer matrix를 추가했습니다. `src/lib/portfolio/view-models.test.ts`는 8개 model의 allowed keys, shared fields, contact fallback, journey unresolved anchor omission, interview identifier+`project:null`을 검사하고 source text에서 `PortfolioContent &`와 `...content`를 거부합니다. `src/designs/route-view-models.test.tsx`는 5 design×8 route의 design root와 non-empty `h1`을 검사합니다. |
| Runtime key inspection, structural source assertion, semantic fixture | `src/lib/portfolio/view-models.test.ts`는 8개 model의 allowed keys, shared fields, contact fallback, journey unresolved anchor omission, interview identifier+`project:null`을 검사하고 source text에서 `PortfolioContent &`와 `...content`를 거부합니다. `src/designs/route-view-models.test.tsx`는 5 design×8 route의 design root와 non-empty `h1`을 검사합니다. 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다. |
| 통과하는 production factory path | `src/lib/portfolio/view-models.test.ts`는 8개 model의 allowed keys, shared fields, contact fallback, journey unresolved anchor omission, interview identifier+`project:null`을 검사하고 source text에서 `PortfolioContent &`와 `...content`를 거부합니다. `src/designs/route-view-models.test.tsx`는 5 design×8 route의 design root와 non-empty `h1`을 검사합니다. |
| 증명하는 것: route payload scope와 resolution policy | route payload scope, contact selection과 omission/null policy가 runtime regression으로 고정됩니다. |
| 증명하지 않는 것: visual behavior 또는 network payload size | visual fidelity, network payload byte, browser accessibility와 모든 source permutation은 증명하지 않습니다. |
| 후속 변경에서 막는 회귀 | 이 thread의 최종 boundary를 보호하며 이후 renderer/SEO/performance work가 같은 scoped model을 전제로 진행됩니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** route payload isolation과 missing-reference policy가 구현 convention과 TypeScript declaration에만 의존했습니다.
- **해당 SHA 핵심 코드:** `src/lib/portfolio/view-models.test.ts`는 8개 model의 allowed keys, shared fields, contact fallback, journey unresolved anchor omission, interview identifier+`project:null`을 검사하고 source text에서 `PortfolioContent &`와 `...content`를 거부합니다. `src/designs/route-view-models.test.tsx`는 5 design×8 route의 design root와 non-empty `h1`을 검사합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** 이 thread의 최종 boundary를 보호하며 이후 renderer/SEO/performance work가 같은 scoped model을 전제로 진행됩니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** route payload isolation과 missing-reference policy가 구현 convention과 TypeScript declaration에만 의존했습니다. 후속 refactor가 `...content`, intersection, extra key, omission/null policy를 조용히 되돌릴 수 있었습니다.
- **구현 결정과 경로:** runtime key whitelist, source structural assertion, semantic incomplete-reference fixtures와 renderer matrix를 추가했습니다. `src/lib/portfolio/view-models.test.ts`는 8개 model의 allowed keys, shared fields, contact fallback, journey unresolved anchor omission, interview identifier+`project:null`을 검사하고 source text에서 `PortfolioContent &`와 `...content`를 거부합니다. `src/designs/route-view-models.test.tsx`는 5 design×8 route의 design root와 non-empty `h1`을 검사합니다.
- **소유권·실패 처리:** production factories를 직접 호출해 payload shape/semantic resolution을 검사하며 renderer matrix는 registry→renderer integration을 소비합니다. incomplete reference를 fixture에 주입해 expected object shape를 비교합니다. 별도 allocator-style failure injection은 해당되지 않습니다.
- **보장:** route payload scope, contact selection과 omission/null policy가 runtime regression으로 고정됩니다.
- **보장하지 않는 범위:** visual fidelity, network payload byte, browser accessibility와 모든 source permutation은 증명하지 않습니다.
- **후속 연결:** 이 thread의 최종 boundary를 보호하며 이후 renderer/SEO/performance work가 같은 scoped model을 전제로 진행됩니다.

## 6. Invariant ledger

| Invariant | Source에서 확인된 변화 지점 | 해당 SHA의 실제 code/test evidence | 부족함이 드러난 시점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| Cross-content join, ordering, fallback은 route projection이 한 번만 수행합니다. | `4d6b4e6d564e → 44e3b80b297f → d4ad7ecd0d08` | home/projects/detail/about factories의 featured fallback, grouping/order, metric, links/stack/screenshots와 curation joins. | 초기 home projection은 broad content spread와 empty compatibility collections를 유지했고 다른 routes의 joins도 renderer에 남았습니다. | 각 route factory가 semantic selection/join/order/fallback을 한 번 수행하고 renderer에는 prepared data만 줍니다. |
| Route literal은 정확한 view-model variant와 상관관계를 가집니다. | `d7eaa1ac401d` | `d7eaa1ac401d`의 route-to-view-model conditional/generic request. | legacy props와 adapter가 migration 동안 broad input을 허용했습니다. | `f8b0ab7b08aa` 이후 registry input은 discriminated route model union 하나이며 route literal과 variant가 상관됩니다. |
| Journey와 interview renderer는 raw project collection을 조회하지 않습니다. | `bc0a718e2052 → 98f07b1c211d` | journey factory의 project index/anchor filtering/timeline `null`, interview factory의 nested project object 또는 `null`. | 직전 renderer마다 raw project map을 재구성했습니다. | journey/interview renderer는 model에 포함된 evidence relationship만 소비하고 raw projects collection을 받지 않습니다. |
| Registry renderer의 유일한 입력은 discriminated route view model입니다. | `f8b0ab7b08aa` | `f8b0ab7b08aa`의 common design props/registry renderer signature 변경과 legacy request 제거. | view models가 있어도 complete content를 같이 받을 수 있던 우회가 있었습니다. | registry entry와 모든 design route renderer의 legal input이 route model union으로 제한됩니다. |
| Common route base는 site/profile/presentation/footerLinks로 제한됩니다. | `5897b4b024da` | `5897b4b024da`의 base fields, explicit return literals, removed `...content`/synthetic arrays와 unavailable-key `never` declarations. | `f8b0ab7b08aa` 직후에도 actual model object는 broad spread를 가질 수 있었습니다. | runtime common payload는 site/profile/presentation/footerLinks와 route-owned fields만 포함합니다. |
| 허용 field와 missing-reference policy는 runtime regression test로 고정됩니다. | `527b9f872333` | `527b9f872333`의 runtime key whitelist, source text prohibitions, contact and unresolved-reference fixtures, 5×8 renderer matrix. | type declarations/convention만으로는 broad spread와 omission/null policy 회귀를 막지 못했습니다. | allowed runtime field set과 journey omission/interview null/contact fallback이 regression contract로 고정됩니다. |

Ledger 작성 원칙:

- Source가 명시한 invariant만 사용하고 새 invariant를 확정 사실처럼 추가하지 않습니다.
- 도입, 강화, 부족함 노출, fix, regression test가 서로 다른 commit이면 각 열에 분리해 기록합니다.
- Code evidence에는 실제 field, function, branch, selector, command 또는 assertion을 적습니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 위험 | 대응 commit | 실제 수정/강화 code에서 확인할 것 | Test 또는 실행 증거 |
| --- | --- | --- | --- |
| Design별로 featured fallback, group order, metric, contact precedence를 다르게 계산함 | 4d6b4e6d564e, 44e3b80b297f, d4ad7ecd0d08 | 동일 derivation이 renderer에서 factory로 이동하는 diff를 확인합니다. | 여러 design이 같은 prepared collection을 받는 caller를 기록합니다. |
| Journey/Interview가 raw project map을 재구성해 missing reference를 다르게 처리함 | bc0a718e2052, 98f07b1c211d | Omit과 explicit `null` 정책을 실제 field와 renderer branch로 구분합니다. | `527b9f872333`에서 identifier 보존과 null/omission test를 연결합니다. |
| Type은 제한됐지만 factory가 full content를 spread하거나 synthetic empty array를 넣음 | 5897b4b024da | Factory return object에서 spread/empty compatibility collection 제거를 확인합니다. | Runtime key enumeration test가 우회를 막는지 확인합니다. |

### 실제 연결 기록

- Journey missing anchor는 omit하지만 interview missing evidence는 identifier와 `project: null`을 유지합니다. Detail lookup failure는 entire model `null`로 page 404 경계를 준비합니다.
- `f8b0ab7b08aa`은 legal renderer input을 좁혔고 `5897b4b024da`는 실제 runtime object shape를 좁혔습니다. 둘은 같은 작업이 아닙니다.
- `527b9f872333`은 source structure와 runtime keys를 함께 검사하지만 visual/network-size 증거는 아닙니다.

## 8. Ownership / state / responsibility 변화

| Concern | Thread 초기 owner/state | Thread 최종 owner/state | 실제 symbol과 호출 경로 |
| --- | --- | --- | --- |
| Home selection과 시간 값 | 각 renderer | Home view-model factory | `createHomeViewModel`: portfolio content → featured/lead/metrics/recent journey/placed links/current year. |
| Projects partition/group/metric | Route와 design별 helper | Projects view model | `createProjectsViewModel`: enabled projects + configured groups → featured/archive/groups/metric values. |
| Detail links/stack/screenshots와 About curation refs | Renderer lookup | Detail/About projection | `createProjectDetailViewModel`/about factory: ID lookup, action links, stack fallback, secondary media와 curation resolution. |
| Journey anchor/timeline project | Renderer raw project lookup | Journey projection | journey factory: project index → milestone anchors/nullable timeline evidence. |
| Interview answer evidence | Renderer별 project map | Interview projection | interview factory: track/question/answer hierarchy → resolved project 또는 explicit `null`. |
| Renderer input | Complete content 또는 migration union | Discriminated route-view-model union | page factory call → `PortfolioRouteViewModel` → `renderDesignRoute` → route-discriminated renderer. |
| Shared runtime payload | Full content spread와 빈 배열 | Small common base + route-owned fields | `RouteViewModelBase` small fields + explicit route return literals; no runtime global content spread. |

## 9. Thread 최종 상태

### Source에서 확정된 최종 상태

Renderer가 전체 `PortfolioContent`를 받아 관계를 다시 해석하던 상태에서 route별 view model이 join, ordering, fallback, missing-reference policy를 한 번만 해결하고 필요한 데이터만 노출하는 상태로 발전하는 과정을 복원합니다.

### 학습자가 완성할 최종 설명

- **Thread 시작 시점의 설계와 위험:** 초기 multi-design renderer는 complete portfolio graph를 받아 featured selection, grouping, joins와 missing-reference policy를 각각 재해석할 수 있었습니다.
- **핵심 architecture/decision이 형성된 순서:** home/projects/detail/about projection부터 시작해 route/model correlation, journey/interview evidence resolution, registry input 제한, runtime base 축소 순으로 ownership을 이동했습니다.
- **실제 failure 또는 부족함이 드러난 지점:** `f8b0ab7b08aa`에서 type/registry input은 좁아졌지만 factory가 `...content`와 empty collections를 유지해 actual payload isolation이 아직 불완전했습니다.
- **Fix 또는 boundary 강화가 바꾼 invariant:** `5897b4b024da`가 full spread를 제거하고 `527b9f872333`이 runtime keys와 semantic absence policy를 회귀 test로 고정했습니다.
- **Test/build/browser evidence가 보장한 범위:** factory 및 test source를 정적 검토해 caller/callee와 expected shapes를 확인했습니다. Vitest/renderer matrix는 네트워크 제한으로 실행하지 않았습니다.
- **Thread 종료 시점에도 보장하지 않는 범위:** visual behavior, serialized network bytes, all possible incomplete content와 time determinism은 thread 종료 시점에도 별도 보장입니다.

## 10. 최종 architecture 또는 execution flow 정리

아래 source-backed flow의 각 단계에 실제 file path, symbol, input/output, failure branch를 추가합니다.

1. App Router page가 validated portfolio content를 로드합니다.
   - 실제 코드 위치: `src/lib/portfolio/content.ts`와 App Router pages
   - 입력과 출력: validated facade가 site/profile/projects/links/journey/interview/curation aggregate를 제공합니다.
   - 실패/absence 처리: invalid raw source는 이전 ingestion boundary에서 실패하고 disabled/absent records는 facade policy로 제외됩니다.
2. Route-specific factory가 route literal에 맞는 projection을 만듭니다.
   - 실제 코드 위치: `src/lib/portfolio/view-models.ts::create*ViewModel`
   - 입력과 출력: route literal에 맞는 source subset과 detail ID/current time context를 받아 exact model variant를 만듭니다.
   - 실패/absence 처리: detail lookup 실패는 `null`; other route factories는 route-specific absence 표현을 사용합니다.
3. Factory가 ordering, filtering, reference resolution, fallback, time 값을 확정합니다.
   - 실제 코드 위치: 각 route factory의 selectors/indexes
   - 입력과 출력: sorting, featured/archive partition, link placement, stack fallback, project reference resolution과 year를 계산합니다.
   - 실패/absence 처리: unknown configured relationship은 omission/fallback/null 중 해당 route policy로 변환합니다.
4. Unresolved reference를 route policy에 따라 omit 또는 explicit `null`로 표현합니다.
   - 실제 코드 위치: journey/interview/detail/about mapping branches
   - 입력과 출력: milestone missing project는 omit, timeline/interview evidence는 explicit `null`, detail unknown ID는 whole model `null`입니다.
   - 실패/absence 처리: renderer가 raw ID를 다시 lookup하지 않도록 absence가 output shape에 남습니다.
5. Common shell field와 route-owned field만 runtime model에 복사합니다.
   - 실제 코드 위치: small `RouteViewModelBase`와 explicit object literals
   - 입력과 출력: site/profile/presentation/footerLinks 및 route fields만 runtime object에 복사합니다.
   - 실패/absence 처리: unavailable source keys는 runtime에 생성되지 않고 type-level `never`가 access를 막습니다.
6. Registry가 discriminated model을 선택된 renderer에 전달합니다.
   - 실제 코드 위치: `src/designs/registry.tsx::renderDesignRoute`
   - 입력과 출력: discriminated model을 selected design route entry에 전달합니다.
   - 실패/absence 처리: route/model mismatch는 type contract와 renderer switch에서 드러납니다.
7. Renderer는 prepared data를 배치할 뿐 global content graph를 다시 조회하지 않습니다.
   - 실제 코드 위치: 각 design renderer
   - 입력과 출력: prepared collections/relationships를 visual hierarchy에 배치합니다.
   - 실패/absence 처리: global content graph가 input에 없어 join/filter/fallback을 독자 재구성할 수 없습니다.

### 코드 없이 설명하기

> 이 Thread의 최종 실행 흐름을 code snippet 없이 자신의 말로 작성합니다. 설계 → 구현 → failure/risk → 수정/강화 → 검증 순서가 드러나야 합니다.

처음에는 다섯 renderer가 broad portfolio object에서 featured project, groups, links와 evidence 관계를 직접 계산할 수 있었습니다. Route factories가 home부터 projects, detail/about, journey, interview 순으로 joins와 fallback을 소유했습니다. Typed route request가 literal과 model variant를 묶고, registry contract는 complete content를 제거했습니다. 마지막으로 common base에서 global spread와 fake empty arrays까지 없애 실제 runtime payload를 좁혔고 tests가 allowed keys와 missing-reference 정책을 고정했습니다. Renderer는 이제 의미를 다시 계산하지 않고 준비된 route data를 배치합니다.

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
