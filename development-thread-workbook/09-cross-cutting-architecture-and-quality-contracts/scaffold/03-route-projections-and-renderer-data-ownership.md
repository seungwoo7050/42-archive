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
| Source field와 derived field 구분 |  |
| Fallback과 ordering 규칙 |  |
| Renderer에서 제거된 계산 |  |
| Route discriminant가 union에 제공하는 기반 |  |
| 아직 broad compatibility가 남은 부분 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

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
| Configured taxonomy와 unknown data 보존의 균형 |  |
| Empty group omission과 project omission 차이 |  |
| Group/order/metric owner 이동 |  |
| Featured와 archive 중복 방지 증거 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

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
| Detail null이 page-level 404로 이어질 준비 경계 |  |
| Stack fallback과 screenshot exclusion 규칙 |  |
| Curation reference order 보존 여부 |  |
| Route semantics에 따른 missing-reference 정책 차이 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

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
| Route-to-model correlation의 TypeScript 표현 |  |
| Legacy adapter lifecycle과 제거 조건 |  |
| Compile-time guarantee와 runtime guard 역할 |  |
| 후속 `f8b0ab7b08aa`에서 제거될 surface |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

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
| Milestone unknown reference omission 정책 |  |
| Timeline explicit `null` 정책 |  |
| Renderer에 필요한 evidence relationship만 남긴 payload |  |
| Project lookup의 단일 owner |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

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
| Hierarchy 보존과 join resolution 분리 |  |
| Missing evidence를 omission하지 않는 이유 |  |
| Identifier, resolved project, depth note의 상관관계 |  |
| Template별 project map 제거 전후 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

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
| View model이 있어도 complete content를 허용하던 우회 |  |
| Design별 join/filter/fallback 재구현 문제 |  |
| Discriminated route models only decision |  |
| Registry contract, renderer props, shell adapters, removed compatibility |  |
| Content graph, projection, renderer composition ownership |  |
| Unresolved references가 model에서 표현되는 방식 |  |
| 보장하는 것: registry input 수준 semantic consistency |  |
| 아직 보장하지 않는 것: actual runtime payload 최소성 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

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
| Broad common object와 empty collection이 ownership을 숨긴 방식 |  |
| Small shared base, explicit route fields, no runtime compatibility payload decision |  |
| Base type, factory return literals, `never` declarations |  |
| Runtime ownership과 type-level compatibility 차이 |  |
| Payload field 변화 |  |
| 보장하는 것: unrelated collection 복구 불가 |  |
| 후속 test와 연결 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

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
| 대상 production invariant |  |
| 주입한 incomplete reference와 expected model shape |  |
| Runtime key inspection, structural source assertion, semantic fixture |  |
| 통과하는 production factory path |  |
| 증명하는 것: route payload scope와 resolution policy |  |
| 증명하지 않는 것: visual behavior 또는 network payload size |  |
| 후속 변경에서 막는 회귀 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

## 6. Invariant ledger

| Invariant | Source에서 확인된 변화 지점 | 해당 SHA의 실제 code/test evidence | 부족함이 드러난 시점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| Cross-content join, ordering, fallback은 route projection이 한 번만 수행합니다. | `4d6b4e6d564e → 44e3b80b297f → d4ad7ecd0d08` |  |  |  |
| Route literal은 정확한 view-model variant와 상관관계를 가집니다. | `d7eaa1ac401d` |  |  |  |
| Journey와 interview renderer는 raw project collection을 조회하지 않습니다. | `bc0a718e2052 → 98f07b1c211d` |  |  |  |
| Registry renderer의 유일한 입력은 discriminated route view model입니다. | `f8b0ab7b08aa` |  |  |  |
| Common route base는 site/profile/presentation/footerLinks로 제한됩니다. | `5897b4b024da` |  |  |  |
| 허용 field와 missing-reference policy는 runtime regression test로 고정됩니다. | `527b9f872333` |  |  |  |

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

## 8. Ownership / state / responsibility 변화

| Concern | Thread 초기 owner/state | Thread 최종 owner/state | 실제 symbol과 호출 경로 |
| --- | --- | --- | --- |
| Home selection과 시간 값 | 각 renderer | Home view-model factory |  |
| Projects partition/group/metric | Route와 design별 helper | Projects view model |  |
| Detail links/stack/screenshots와 About curation refs | Renderer lookup | Detail/About projection |  |
| Journey anchor/timeline project | Renderer raw project lookup | Journey projection |  |
| Interview answer evidence | Renderer별 project map | Interview projection |  |
| Renderer input | Complete content 또는 migration union | Discriminated route-view-model union |  |
| Shared runtime payload | Full content spread와 빈 배열 | Small common base + route-owned fields |  |

## 9. Thread 최종 상태

### Source에서 확정된 최종 상태

Renderer가 전체 `PortfolioContent`를 받아 관계를 다시 해석하던 상태에서 route별 view model이 join, ordering, fallback, missing-reference policy를 한 번만 해결하고 필요한 데이터만 노출하는 상태로 발전하는 과정을 복원합니다.

### 학습자가 완성할 최종 설명

- Thread 시작 시점의 설계와 위험:
- 핵심 architecture/decision이 형성된 순서:
- 실제 failure 또는 부족함이 드러난 지점:
- Fix 또는 boundary 강화가 바꾼 invariant:
- Test/build/browser evidence가 보장한 범위:
- Thread 종료 시점에도 보장하지 않는 범위:

## 10. 최종 architecture 또는 execution flow 정리

아래 source-backed flow의 각 단계에 실제 file path, symbol, input/output, failure branch를 추가합니다.

1. App Router page가 validated portfolio content를 로드합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
2. Route-specific factory가 route literal에 맞는 projection을 만듭니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
3. Factory가 ordering, filtering, reference resolution, fallback, time 값을 확정합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
4. Unresolved reference를 route policy에 따라 omit 또는 explicit `null`로 표현합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
5. Common shell field와 route-owned field만 runtime model에 복사합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
6. Registry가 discriminated model을 선택된 renderer에 전달합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
7. Renderer는 prepared data를 배치할 뿐 global content graph를 다시 조회하지 않습니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:

### 코드 없이 설명하기

> 이 Thread의 최종 실행 흐름을 code snippet 없이 자신의 말로 작성합니다. 설계 → 구현 → failure/risk → 수정/강화 → 검증 순서가 드러나야 합니다.

## 11. 학습 완료 자가 점검

- [ ] Commit map의 모든 SHA를 실제로 checkout하거나 diff로 확인했습니다.
- [ ] Thread 내 commit 순서를 source와 동일하게 유지했습니다.
- [ ] 각 A/S commit에서 직전 상태, decision, failure boundary, guarantee와 non-guarantee를 구분했습니다.
- [ ] B commit은 thread 흐름에서 필요한 구현 역할과 state change를 확인했습니다.
- [ ] Fix commit을 독립 feature가 아니라 기존 가정 → failure → root cause → corrected invariant로 설명했습니다.
- [ ] Test commit에서 production invariant, failure injection, technique, traversed production path, proves/does-not-prove를 구분했습니다.
- [ ] Invariant ledger의 모든 주장에 해당 SHA의 code/test evidence가 있습니다.
- [ ] Final HEAD의 code를 과거 commit 설명에 소급하지 않았습니다.
- [ ] Thread 최종 흐름을 code 없이 설명할 수 있습니다.
