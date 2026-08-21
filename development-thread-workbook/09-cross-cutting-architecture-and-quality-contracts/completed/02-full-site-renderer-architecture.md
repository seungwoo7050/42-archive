# Thread: Full-site renderer architecture

> Project: 42 Archive Portfolio (`web/portfolio`)
>
> 이 문서는 source에서 확정된 thread 구조와 commit 역할만 미리 제공합니다. 실제 구현 해석, code evidence, failure 재현, test 결과, 최종 설명은 해당 SHA의 코드를 직접 확인해 작성합니다.

## 1. Thread 목표

다섯 시각 시스템이 전체 route composition을 독립적으로 소유하면서도 App Router의 loading, query, availability, not-found 책임을 복제하지 않도록 registry와 delegation 경계가 형성되는 과정을 복원합니다.

**Source-defined significance**

> This thread is not merely a sequence of visual additions. It defines the architectural mechanism that lets five designs own complete route composition while App Router pages retain framework responsibilities. Registry metadata, validation, lazy loading, exhaustive route contracts, and final unified dispatch must agree.

### 이 Thread에 직접 연결되는 Critical Invariants

- Content가 광고하는 design은 code registry가 지원하고 lazy loading할 수 있습니다. — `418e7bc1d8bb → 6fc28f4c6586 → c6acfe562694/dd71d28143a8/b8de57f130eb`
- Renderer input은 route discriminator, current path, debug state, detail context를 명시합니다. — `e14202198948`
- App Router page는 framework concern을, renderer는 complete composition을 소유합니다. — `dc2cf72a768d`
- 모든 route와 design은 하나의 registry dispatch path를 사용합니다. — `380b2a025070`

### 연결되는 Major Engineering Difficulty

- 다섯 개의 시각적으로 독립적인 renderer가 모든 route에서 동일 semantic behavior를 유지하도록 framework, selection, relationship logic 중복을 막는 문제
- 이미 구현된 route를 유지하면서 lazy registry와 full-page delegation architecture로 이동하는 문제

## 2. 이 Thread를 이해하기 위한 핵심 질문

- Design catalog, content validation, lazy loader, route dispatcher가 같은 identifier를 공유한다는 것을 코드에서 어떻게 보장하는가?
- App Router page와 full-site renderer의 책임 분리는 어느 commit에서 시작되고 최종적으로 어디서 예외가 제거되는가?
- Renderer가 URL을 직접 해석하지 않고 resolved route context를 받는 이유는 무엇인가?
- Dedicated renderer가 없는 design은 migration 중 어떤 fallback을 거치며 최종 구조에서 무엇이 사라지는가?
- Editorial, Brutalist, Cinematic 활성화가 단순 UI 추가가 아니라 registry invariant 검증인 이유는 무엇인가?

## 3. 완료 기준

- `SITE_DESIGNS`, supported IDs, presentation registry, lazy loader map, route dispatcher의 연결 지점을 모두 찾았습니다.
- 모든 public page에서 framework concern과 renderer concern을 실제 call graph로 구분했습니다.
- `dc2cf72a768d`의 migration delegation과 `380b2a025070`의 final unified dispatch 차이를 설명할 수 있습니다.
- Advertised-but-unloadable 또는 loadable-but-unvalidated design을 만드는 누락 지점을 열거할 수 있습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Source에서 확정된 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `418e7bc1d8bb` | feat(designs): site design 정의 registry 추가 | A | ARCH, RENDERER | Defines one authoritative design catalog. |
| 2 | `e14202198948` | feat(designs): route renderer 계약 추가 | A | ARCH, ROUTING, RENDERER | Defines the route-discriminated full-site renderer input. |
| 3 | `6fc28f4c6586` | refactor(designs): 확장 renderer lazy registry 추가 | A | ARCH, RENDERER, REFACTOR | Introduces lazy capability detection and loading. |
| 4 | `dc2cf72a768d` | refactor(routes): 확장 디자인 renderer 위임 경계 추가 | S | ARCH, ROUTING, RENDERER | Moves complete page composition behind one route delegation boundary. |
| 5 | `c6acfe562694` | feat(editorial): renderer를 디자인 registry에 활성화 | A | ARCH, RENDERER | Proves that a complete external renderer can be selected safely. |
| 6 | `dd71d28143a8` | feat(designs): Brutalist renderer 활성화 | A | ARCH, RENDERER | Applies the same registry invariant to a second expanded renderer. |
| 7 | `b8de57f130eb` | feat(designs): Cinematic renderer 활성화 | A | ARCH, RENDERER | Completes the five-design registry. |
| 8 | `380b2a025070` | refactor(designs): 모든 route를 registry renderer로 위임 | S | ARCH, ROUTING, RENDERER | Eliminates direct template special cases and establishes one dispatch path. |

## 5. Commit별 학습 기록

각 section은 반드시 해당 SHA를 checkout한 상태에서 작성합니다. Thread 내 이전 commit은 비교 대상으로 사용할 수 있지만 final HEAD를 정답처럼 소급하지 않습니다.

### 1. `418e7bc1d8bb` — feat(designs): site design 정의 registry 추가

- **Importance:** A
- **Tags:** ARCH, RENDERER
- **Source-defined thread role:** Defines one authoritative design catalog.
- **Source classification summary:** Established a single registry for the site's available visual designs and their preview palettes.
- **Source classification reason:** Significant because it standardizes a cross-route design, navigation, shell, or dispatch boundary instead of adding isolated page markup.

#### Source에서 확정된 구현 의도와 상태 변화

Available visual design과 preview palette를 ordered `SITE_DESIGNS` registry로 정의하고 validation용 identifier와 deterministic fallback lookup을 파생합니다.

#### 해당 SHA에서 확인할 실제 코드

- `SITE_DESIGNS` element shape, ordering, ID, palette fields를 확인합니다.
- Identifier list가 별도 수동 enum이 아니라 registry에서 파생되는지 확인합니다.
- `getSiteDesignDefinition`이 unknown ID에서 첫 item으로 fallback하는 branch를 추적합니다.
- Design switcher와 validation이 registry의 어떤 field를 소비하는지 caller를 찾습니다.

확인 원칙:

- 먼저 `418e7bc1d8bb^`와 `418e7bc1d8bb`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Authoritative design ordering과 metadata ownership | registry가 machine identity/order/palette를 소유하고 presentation content는 이후 user-facing copy를 소유합니다. |
| Unknown ID의 deterministic fallback | ordered `SITE_DESIGNS`를 authoritative catalog로 만들고 ID list와 fallback lookup을 파생했습니다. |
| 이 commit만으로는 full-route renderer loadability를 보장하지 않는 이유 | 해당 ID의 full-route module이 존재하거나 lazy-load 가능하다는 것은 아직 보장하지 않습니다. |
| 새 design 추가 시 아직 변경해야 하는 다른 boundary | 해당 ID의 full-route module이 존재하거나 lazy-load 가능하다는 것은 아직 보장하지 않습니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** design identity, display order, palette가 여러 consumer에 흩어질 가능성이 있었습니다.
- **해당 SHA 핵심 코드:** `src/designs/config.ts`의 registry는 이 SHA에서 `design`, `classic`과 palette metadata를 보유하며 `SITE_DESIGN_IDS`, `getSiteDesignDefinition`을 파생합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `e14202198948`가 full-route contract를, `6fc28f4c6586`가 loader registry를 추가합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** design identity, display order, palette가 여러 consumer에 흩어질 가능성이 있었습니다. selector와 validation이 서로 다른 design 집합·순서를 쓰면 advertised state와 code capability가 어긋납니다.
- **구현 결정과 경로:** ordered `SITE_DESIGNS`를 authoritative catalog로 만들고 ID list와 fallback lookup을 파생했습니다. `src/designs/config.ts`의 registry는 이 SHA에서 `design`, `classic`과 palette metadata를 보유하며 `SITE_DESIGN_IDS`, `getSiteDesignDefinition`을 파생합니다.
- **소유권·실패 처리:** registry가 machine identity/order/palette를 소유하고 presentation content는 이후 user-facing copy를 소유합니다. unknown ID는 exception이 아니라 registry 첫 항목으로 deterministic fallback합니다.
- **보장:** catalog 내부의 ID/order/metadata source가 하나로 정리됩니다.
- **보장하지 않는 범위:** 해당 ID의 full-route module이 존재하거나 lazy-load 가능하다는 것은 아직 보장하지 않습니다.
- **후속 연결:** `e14202198948`가 full-route contract를, `6fc28f4c6586`가 loader registry를 추가합니다.

### 2. `e14202198948` — feat(designs): route renderer 계약 추가

- **Importance:** A
- **Tags:** ARCH, ROUTING, RENDERER
- **Source-defined thread role:** Defines the route-discriminated full-site renderer input.
- **Source classification summary:** Defined the shared input contract for designs that render complete portfolio routes.
- **Source classification reason:** Significant because it standardizes a cross-route design, navigation, shell, or dispatch boundary instead of adding isolated page markup.

#### Source에서 확정된 구현 의도와 상태 변화

Full-site design renderer가 받을 closed route union과 shared props를 정의합니다. Route kind, content, debug state, current path, optional project를 명시해 renderer가 URL parsing이나 loading을 소유하지 않게 합니다.

#### 해당 SHA에서 확인할 실제 코드

- `PortfolioRouteId`의 모든 route literal과 dynamic project route 표현을 확인합니다.
- `DesignRouteProps` field별 owner가 App Router인지 renderer인지 표시합니다.
- Optional project가 detail route에서만 의미 있다는 제약이 type으로 완전히 강제되는지 확인합니다.
- Renderer가 current path를 받는 이유를 navigation/design switching caller에서 추적합니다.
- 이 초기 contract의 `content` input이 후속 view-model refactor 전 얼마나 broad한지 기록합니다.

확인 원칙:

- 먼저 `e14202198948^`와 `e14202198948`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Route discriminator와 exhaustive switch 기반 | 8개 route literal과 shared renderer props를 closed contract로 정의했습니다. `src/designs/types.ts`의 `PortfolioRouteId`와 `DesignRouteProps`가 `route`, broad `content`, `contentDebug`, `currentPath`, optional `project`를 명시합니다. |
| Props 밖에 남는 framework responsibility | App Router는 loading/query/availability/project lookup을 소유하고 renderer는 전달받은 context로 composition을 소유하도록 경계를 준비합니다. |
| Optional project의 valid/invalid 조합 | `project`가 optional field라 이 SHA의 type만으로는 non-detail route에 project를 주거나 detail route에서 빼는 invalid 조합을 완전히 막지 못합니다. |
| 후속 projection thread에서 좁혀질 broad input | `dc2cf72a768d`가 모든 public page에서 이 request를 실제 delegation에 사용합니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** design renderer가 page URL과 framework state를 자체 추론할 수 있는 느슨한 입력 상태였습니다.
- **해당 SHA 핵심 코드:** `src/designs/types.ts`의 `PortfolioRouteId`와 `DesignRouteProps`가 `route`, broad `content`, `contentDebug`, `currentPath`, optional `project`를 명시합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `dc2cf72a768d`가 모든 public page에서 이 request를 실제 delegation에 사용합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** design renderer가 page URL과 framework state를 자체 추론할 수 있는 느슨한 입력 상태였습니다. 각 renderer가 route parsing, debug query, current path, detail lookup을 다시 구현할 위험이 있었습니다.
- **구현 결정과 경로:** 8개 route literal과 shared renderer props를 closed contract로 정의했습니다. `src/designs/types.ts`의 `PortfolioRouteId`와 `DesignRouteProps`가 `route`, broad `content`, `contentDebug`, `currentPath`, optional `project`를 명시합니다.
- **소유권·실패 처리:** App Router는 loading/query/availability/project lookup을 소유하고 renderer는 전달받은 context로 composition을 소유하도록 경계를 준비합니다. `project`가 optional field라 이 SHA의 type만으로는 non-detail route에 project를 주거나 detail route에서 빼는 invalid 조합을 완전히 막지 못합니다.
- **보장:** renderer가 처리해야 할 route vocabulary와 shared context가 명시됩니다.
- **보장하지 않는 범위:** route-model correlation과 narrow payload는 아직 보장하지 않습니다.
- **후속 연결:** `dc2cf72a768d`가 모든 public page에서 이 request를 실제 delegation에 사용합니다.

### 3. `6fc28f4c6586` — refactor(designs): 확장 renderer lazy registry 추가

- **Importance:** A
- **Tags:** ARCH, RENDERER, REFACTOR
- **Source-defined thread role:** Introduces lazy capability detection and loading.
- **Source classification summary:** Introduced a registry boundary for design-specific route renderers.
- **Source classification reason:** Significant because it standardizes a cross-route design, navigation, shell, or dispatch boundary instead of adding isolated page markup.

#### Source에서 확정된 구현 의도와 상태 변화

Design identifier를 asynchronous module loader에 매핑하고 capability detection과 rendering operation을 분리하는 lazy registry boundary를 만듭니다. Loader table은 비어 있어 extension contract만 먼저 확정합니다.

#### 해당 SHA에서 확인할 실제 코드

- Loader map의 key/value type과 dynamic import return contract를 확인합니다.
- Capability check와 actual render function이 분리된 control flow를 추적합니다.
- Unsupported design 또는 loader 부재 시 legacy renderer로 돌아가는 branch를 찾습니다.
- 빈 loader table에서도 existing route가 동작하는 fallback path를 확인합니다.
- Eager import가 제거되거나 아직 존재하는 지점을 bundle boundary 관점에서 기록합니다.

확인 원칙:

- 먼저 `6fc28f4c6586^`와 `6fc28f4c6586`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Registry가 정의하는 extension point | design ID에서 asynchronous module loader로 가는 registry와 capability check를 도입했습니다. `src/designs/registry.tsx`의 partial loader map과 `hasDedicatedRouteRenderer`/`renderDesignRoute`가 detection과 import/render를 분리합니다. 이 SHA의 loader table은 아직 비어 있습니다. |
| Detection과 loading 부재/failure 처리 | loader가 없으면 dedicated render path를 선택하지 않으며 기존 route는 fallback으로 계속 동작합니다. |
| Lazy loading이 보장하는 것과 module completeness를 보장하지 않는 것 | 등록 module의 route completeness나 advertised/validated ID 일치는 아직 보장하지 않습니다. |
| 첫 concrete activation에서 채워져야 할 항목 | design ID에서 asynchronous module loader로 가는 registry와 capability check를 도입했습니다. `src/designs/registry.tsx`의 partial loader map과 `hasDedicatedRouteRenderer`/`renderDesignRoute`가 detection과 import/render를 분리합니다. 이 SHA의 loader table은 아직 비어 있습니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** App Router page가 renderer를 직접 import하거나 template conditional을 소유했습니다.
- **해당 SHA 핵심 코드:** `src/designs/registry.tsx`의 partial loader map과 `hasDedicatedRouteRenderer`/`renderDesignRoute`가 detection과 import/render를 분리합니다. 이 SHA의 loader table은 아직 비어 있습니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `dc2cf72a768d`가 page delegation을 연결하고 이후 세 activation commit이 loader table을 채웁니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** App Router page가 renderer를 직접 import하거나 template conditional을 소유했습니다. 새 complete renderer를 추가할 때 page마다 eager import/branch를 복제할 가능성이 있었습니다.
- **구현 결정과 경로:** design ID에서 asynchronous module loader로 가는 registry와 capability check를 도입했습니다. `src/designs/registry.tsx`의 partial loader map과 `hasDedicatedRouteRenderer`/`renderDesignRoute`가 detection과 import/render를 분리합니다. 이 SHA의 loader table은 아직 비어 있습니다.
- **소유권·실패 처리:** registry는 module capability/loading을 소유하고 page는 unsupported design에서 기존 local renderer fallback을 유지합니다. loader가 없으면 dedicated render path를 선택하지 않으며 기존 route는 fallback으로 계속 동작합니다.
- **보장:** lazy module extension point와 unsupported capability 판정이 생깁니다.
- **보장하지 않는 범위:** 등록 module의 route completeness나 advertised/validated ID 일치는 아직 보장하지 않습니다.
- **후속 연결:** `dc2cf72a768d`가 page delegation을 연결하고 이후 세 activation commit이 loader table을 채웁니다.

### 4. `dc2cf72a768d` — refactor(routes): 확장 디자인 renderer 위임 경계 추가

- **Importance:** S
- **Tags:** ARCH, ROUTING, RENDERER
- **Source-defined thread role:** Moves complete page composition behind one route delegation boundary.
- **Source classification summary:** Added a common delegation boundary from every public route to design-specific renderers registered outside the App Router pages.
- **Source classification reason:** Critical because it separates framework responsibilities from full-site presentation across every public route, enabling independent visual systems without duplicating loading, routing, or not-found policy.

#### Source에서 확정된 구현 의도와 상태 변화

모든 public App Router page가 content, template, debug, route validity를 해결한 뒤 compact context를 `renderDesignRoute`에 넘기는 공통 delegation boundary를 도입합니다. Dedicated renderer가 없는 design은 migration 동안 legacy fallback을 사용합니다.

#### S-level source profile

- **Problem:** 각 App Router page 안에 complete visual system을 추가하면 query parsing, loading, route validation, not-found behavior가 design마다 복제될 수 있었습니다.
- **Decision:** Framework concern은 page에 남기고 compact route context를 registered full-page renderer에 위임합니다.
- **Why it mattered:** Expanded design이 alternate routing implementation이 되지 않고 composition만 독립적으로 소유할 수 있게 합니다.
- **What changed:** 모든 public route가 route kind, path, debug state, content, optional project를 `renderDesignRoute`에 전달합니다.

#### 해당 SHA에서 확인할 실제 코드

- Home, projects, project detail, about, resume, contact, journey, interview page에서 새 delegation call을 찾습니다.
- Delegation 전에 page가 수행하는 content loading, query resolution, page enablement, project lookup, `notFound`를 목록화합니다.
- Request에 current path, route kind, debug state, content, optional project가 어떻게 들어가는지 route별로 비교합니다.
- `renderDesignRoute`가 capability를 확인하고 dedicated output 또는 fallback을 선택하는 branch를 추적합니다.
- Project detail에서 unresolved project를 renderer 전에 차단하는지 확인합니다.
- Dedicated renderer가 metadata/static params/not-found를 다시 구현하지 않는다는 module boundary를 확인합니다.
- 직전 template conditionals와 비교해 migration이 아직 완결되지 않은 부분을 표시합니다.

확인 원칙:

- 먼저 `dc2cf72a768d^`와 `dc2cf72a768d`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 page가 composition과 framework concern을 함께 소유한 구조 | 각 App Router page가 framework concern과 complete visual composition을 함께 소유했고 expanded design을 넣으려면 route logic 복제가 필요했습니다. |
| Expanded design마다 route concern을 복제할 위험 | unsupported loader는 local legacy branch로 내려가고 disabled route/unknown project는 page에서 차단됩니다. |
| Page prepares, renderer composes, legacy fallback decision | page가 context를 준비하고 dedicated renderer가 complete composition을 담당하며 기존 Design/Classic은 migration fallback으로 남는 boundary를 만들었습니다. |
| Route request type, `renderDesignRoute`, 각 page call site | page가 context를 준비하고 dedicated renderer가 complete composition을 담당하며 기존 Design/Classic은 migration fallback으로 남는 boundary를 만들었습니다. 8개 `src/app/**/page.tsx`가 `hasDedicatedRouteRenderer`를 먼저 확인하고 `renderDesignRoute`에 route/path/debug/content/project를 전달합니다. Project detail은 위임 전에 lookup 실패를 `notFound()`로 처리합니다. |
| Unsupported loader, missing project, disabled route의 owner | unsupported loader는 local legacy branch로 내려가고 disabled route/unknown project는 page에서 차단됩니다. |
| 보장하는 것: 모든 public route의 동일 delegation entry | 모든 public route에 expanded renderer로 들어가는 동일 delegation entry가 생깁니다. |
| 아직 보장하지 않는 것: original templates의 direct special case 제거 | Design/Classic direct imports와 template conditionals가 남아 있어 단일 dispatch architecture는 아직 아닙니다. |
| 후속 activation과 `380b2a025070` 연결 | `c6acfe562694`, `dd71d28143a8`, `b8de57f130eb`가 concrete modules를 활성화하고 `380b2a025070`이 fallback 특례를 제거합니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 각 App Router page가 framework concern과 complete visual composition을 함께 소유했고 expanded design을 넣으려면 route logic 복제가 필요했습니다.
- **해당 SHA 핵심 코드:** 8개 `src/app/**/page.tsx`가 `hasDedicatedRouteRenderer`를 먼저 확인하고 `renderDesignRoute`에 route/path/debug/content/project를 전달합니다. Project detail은 위임 전에 lookup 실패를 `notFound()`로 처리합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `c6acfe562694`, `dd71d28143a8`, `b8de57f130eb`가 concrete modules를 활성화하고 `380b2a025070`이 fallback 특례를 제거합니다.

#### SHA별 복원 결론

- **이전 상태:** 각 App Router page가 framework concern과 complete visual composition을 함께 소유했고 expanded design을 넣으려면 route logic 복제가 필요했습니다.
- **문제와 위험:** design마다 query parsing, page availability, project lookup, `notFound`까지 재구현하면 semantic route behavior가 갈라집니다.
- **핵심 결정:** page가 context를 준비하고 dedicated renderer가 complete composition을 담당하며 기존 Design/Classic은 migration fallback으로 남는 boundary를 만들었습니다.
- **실제 구현 경로:** 8개 `src/app/**/page.tsx`가 `hasDedicatedRouteRenderer`를 먼저 확인하고 `renderDesignRoute`에 route/path/debug/content/project를 전달합니다. Project detail은 위임 전에 lookup 실패를 `notFound()`로 처리합니다.
- **소유권·상태 변화:** page는 content/query/availability/not-found를, registry는 capability/module selection을, design route renderer는 shell과 page composition을 소유합니다.
- **실패 경계:** unsupported loader는 local legacy branch로 내려가고 disabled route/unknown project는 page에서 차단됩니다.
- **보장:** 모든 public route에 expanded renderer로 들어가는 동일 delegation entry가 생깁니다.
- **보장하지 않는 범위:** Design/Classic direct imports와 template conditionals가 남아 있어 단일 dispatch architecture는 아직 아닙니다.
- **후속 fix/test:** `c6acfe562694`, `dd71d28143a8`, `b8de57f130eb`가 concrete modules를 활성화하고 `380b2a025070`이 fallback 특례를 제거합니다.

### 5. `c6acfe562694` — feat(editorial): renderer를 디자인 registry에 활성화

- **Importance:** A
- **Tags:** ARCH, RENDERER
- **Source-defined thread role:** Proves that a complete external renderer can be selected safely.
- **Source classification summary:** Promote the completed Editorial renderer into the site's selectable design contract.
- **Source classification reason:** Significant because it standardizes a cross-route design, navigation, shell, or dispatch boundary instead of adding isolated page markup.

#### Source에서 확정된 구현 의도와 상태 변화

Completed Editorial renderer를 selectable design contract에 등록하고 metadata, swatch, lazy loader, public export, validation acceptance를 함께 갱신하며 default template로 설정합니다.

#### 해당 SHA에서 확인할 실제 코드

- Editorial ID가 `SITE_DESIGNS`, presentation templates, supported IDs, loader map에 동일하게 추가되는지 대조합니다.
- Editorial module의 public entry가 exhaustive route dispatcher 하나인지 확인합니다.
- Default design 변경이 query resolver와 selector fallback에 미치는 caller를 추적합니다.
- 한 registration 지점을 빠뜨렸을 때 예상되는 compile/runtime/content validation failure를 기록합니다.
- Lazy import가 route module을 언제 load하는지 확인합니다.

확인 원칙:

- 먼저 `c6acfe562694^`와 `c6acfe562694`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Advertised/supported/loadable/renderable 네 조건의 source locations | `src/designs/config.ts`, `src/content/presentation.json`, `src/lib/content-loader.ts`, `src/designs/registry.tsx`, Editorial module entry가 같은 `editorial` ID를 공유합니다. |
| Editorial complete route set의 dispatcher 증거 | Editorial을 metadata, presentation, schema-supported ID, lazy loader, public route entry 전부에 동시에 등록하고 default로 선택했습니다. `src/designs/config.ts`, `src/content/presentation.json`, `src/lib/content-loader.ts`, `src/designs/registry.tsx`, Editorial module entry가 같은 `editorial` ID를 공유합니다. |
| Default 변경과 explicit query selection 관계 | `src/designs/config.ts`, `src/content/presentation.json`, `src/lib/content-loader.ts`, `src/designs/registry.tsx`, Editorial module entry가 같은 `editorial` ID를 공유합니다. |
| Registry invariant를 처음 실제로 증명한 지점 | Editorial이 advertised·validated·loadable·renderable인 complete selectable renderer가 됩니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** lazy registry와 delegation은 있었지만 실제 selectable expanded renderer가 등록되지 않았습니다.
- **해당 SHA 핵심 코드:** `src/designs/config.ts`, `src/content/presentation.json`, `src/lib/content-loader.ts`, `src/designs/registry.tsx`, Editorial module entry가 같은 `editorial` ID를 공유합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `dd71d28143a8`과 `b8de57f130eb`이 같은 checklist를 재사용합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** lazy registry와 delegation은 있었지만 실제 selectable expanded renderer가 등록되지 않았습니다. presentation에서 design을 광고하면서 loader/schema/config 중 하나가 빠지면 선택은 가능하지만 render/validation은 실패할 수 있습니다.
- **구현 결정과 경로:** Editorial을 metadata, presentation, schema-supported ID, lazy loader, public route entry 전부에 동시에 등록하고 default로 선택했습니다. `src/designs/config.ts`, `src/content/presentation.json`, `src/lib/content-loader.ts`, `src/designs/registry.tsx`, Editorial module entry가 같은 `editorial` ID를 공유합니다.
- **소유권·실패 처리:** catalog는 identity/palette, content는 copy/default, registry는 loading, `EditorialRoute`는 exhaustive route composition을 소유합니다. 등록 지점 누락은 validation reject, unavailable loader, missing copy 또는 selection fallback 중 하나로 드러납니다.
- **보장:** Editorial이 advertised·validated·loadable·renderable인 complete selectable renderer가 됩니다.
- **보장하지 않는 범위:** original Design/Classic의 별도 path와 다른 expanded renderer의 활성화는 남아 있습니다.
- **후속 연결:** `dd71d28143a8`과 `b8de57f130eb`이 같은 checklist를 재사용합니다.

### 6. `dd71d28143a8` — feat(designs): Brutalist renderer 활성화

- **Importance:** A
- **Tags:** ARCH, RENDERER
- **Source-defined thread role:** Applies the same registry invariant to a second expanded renderer.
- **Source classification summary:** Activate Brutalist across every registry boundary required for a selectable renderer.
- **Source classification reason:** Significant because it standardizes a cross-route design, navigation, shell, or dispatch boundary instead of adding isolated page markup.

#### Source에서 확정된 구현 의도와 상태 변화

Brutalist renderer를 metadata, module entry, palette, lazy loader, content-loader support까지 모든 registry boundary에 활성화합니다.

#### 해당 SHA에서 확인할 실제 코드

- Brutalist ID가 각 registry/validation/presentation 위치에 동일하게 등록되는지 Editorial과 비교합니다.
- `BrutalistRoute`가 route switch 뒤 shared shell을 적용하는 구조를 확인합니다.
- Internal helper가 module-private이고 public API가 renderer entry로 제한되는지 확인합니다.
- Design switcher가 ordered registry에서 Brutalist position/palette를 얻는 경로를 추적합니다.

확인 원칙:

- 먼저 `dd71d28143a8^`와 `dd71d28143a8`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 두 번째 expanded renderer에도 같은 activation checklist가 적용된 증거 | Brutalist를 config/presentation/validation/lazy loader/module entry에 동일하게 등록했습니다. `BrutalistRoute` public entry가 route switch와 shared shell을 소유하고 private helpers는 module 밖으로 노출하지 않습니다. |
| Complete route coverage와 shell uniformity | `BrutalistRoute` public entry가 route switch와 shared shell을 소유하고 private helpers는 module 밖으로 노출하지 않습니다. |
| Registration 누락이 만들 수 있는 불일치 | 어느 registration boundary든 누락되면 selector·schema·loader 중 한 단계에서 ID 불일치가 발생합니다. |
| 다른 visual language와 같은 semantic contract의 경계 | registry가 module 선택을, Brutalist route entry가 route-specific composition과 shell uniformity를 소유합니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** Editorial만 expanded registry invariant를 실제로 만족했습니다.
- **해당 SHA 핵심 코드:** `BrutalistRoute` public entry가 route switch와 shared shell을 소유하고 private helpers는 module 밖으로 노출하지 않습니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `b8de57f130eb`이 마지막 expanded renderer를 등록합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** Editorial만 expanded registry invariant를 실제로 만족했습니다. 두 번째 renderer에서 같은 activation checklist가 유지되지 않으면 architecture가 일회성 integration에 머뭅니다.
- **구현 결정과 경로:** Brutalist를 config/presentation/validation/lazy loader/module entry에 동일하게 등록했습니다. `BrutalistRoute` public entry가 route switch와 shared shell을 소유하고 private helpers는 module 밖으로 노출하지 않습니다.
- **소유권·실패 처리:** registry가 module 선택을, Brutalist route entry가 route-specific composition과 shell uniformity를 소유합니다. 어느 registration boundary든 누락되면 selector·schema·loader 중 한 단계에서 ID 불일치가 발생합니다.
- **보장:** 서로 다른 visual language가 동일 route contract로 확장될 수 있음을 두 번째 사례로 확인합니다.
- **보장하지 않는 범위:** five-design completeness와 unified dispatch는 아직 아닙니다.
- **후속 연결:** `b8de57f130eb`이 마지막 expanded renderer를 등록합니다.

### 7. `b8de57f130eb` — feat(designs): Cinematic renderer 활성화

- **Importance:** A
- **Tags:** ARCH, RENDERER
- **Source-defined thread role:** Completes the five-design registry.
- **Source classification summary:** Activate Cinematic as a complete selectable renderer and narrow its module API to the route entry point.
- **Source classification reason:** Significant because it standardizes a cross-route design, navigation, shell, or dispatch boundary instead of adding isolated page markup.

#### Source에서 확정된 구현 의도와 상태 변화

Cinematic renderer를 complete selectable renderer로 활성화하고 module API를 `CinematicRoute` entry point로 제한해 five-design registry를 완성합니다.

#### 해당 SHA에서 확인할 실제 코드

- Cinematic ID의 metadata, palette, presentation, loader, content validation 등록을 모두 확인합니다.
- `CinematicRoute`가 모든 supported route를 shared frame 안에서 dispatch하는 exhaustive switch인지 확인합니다.
- Module export에서 incidental helper가 노출되지 않는지 확인합니다.
- Registry가 정확히 다섯 design을 포함한다는 derived IDs와 selector rendering을 기록합니다.
- 다섯 design이 동일 current path/debug propagation contract를 받는지 확인합니다.

확인 원칙:

- 먼저 `b8de57f130eb^`와 `b8de57f130eb`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Five-design completeness의 source-of-truth | `CinematicRoute`가 shared Frame 안에서 8개 route를 exhaustive switch하고 config/presentation/loader/validation이 같은 `cinematic` ID를 사용합니다. |
| Cinematic activation이 architecture 수정 없이 확장되는 방식 | Cinematic을 모든 registry boundary에 등록하고 public API를 `CinematicRoute` 하나로 좁혔습니다. `CinematicRoute`가 shared Frame 안에서 8개 route를 exhaustive switch하고 config/presentation/loader/validation이 같은 `cinematic` ID를 사용합니다. |
| Route 누락을 compiler/exhaustive switch가 드러내는지 여부 | 지원 route 누락은 exhaustive switch/type 수준에서 드러날 기반이 있고 invalid query는 page resolver에서 fallback합니다. |
| Final unified dispatch 전에 남은 original template special case | Cinematic을 모든 registry boundary에 등록하고 public API를 `CinematicRoute` 하나로 좁혔습니다. `CinematicRoute`가 shared Frame 안에서 8개 route를 exhaustive switch하고 config/presentation/loader/validation이 같은 `cinematic` ID를 사용합니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** Cinematic이 완성되어도 registry의 advertised/supported/loadable contract에 포함되지 않았습니다.
- **해당 SHA 핵심 코드:** `CinematicRoute`가 shared Frame 안에서 8개 route를 exhaustive switch하고 config/presentation/loader/validation이 같은 `cinematic` ID를 사용합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `380b2a025070`이 다섯 design을 하나의 registry dispatch로 통합합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** Cinematic이 완성되어도 registry의 advertised/supported/loadable contract에 포함되지 않았습니다. module 구현과 selection contract가 분리되면 code는 존재하지만 사용 불가능한 renderer가 됩니다.
- **구현 결정과 경로:** Cinematic을 모든 registry boundary에 등록하고 public API를 `CinematicRoute` 하나로 좁혔습니다. `CinematicRoute`가 shared Frame 안에서 8개 route를 exhaustive switch하고 config/presentation/loader/validation이 같은 `cinematic` ID를 사용합니다.
- **소유권·실패 처리:** module entry가 route dispatch를 소유하고 incidental helper는 private으로 남습니다. 지원 route 누락은 exhaustive switch/type 수준에서 드러날 기반이 있고 invalid query는 page resolver에서 fallback합니다.
- **보장:** registry는 Design, Classic, Editorial, Brutalist, Cinematic 다섯 design의 selection metadata와 modules를 갖습니다.
- **보장하지 않는 범위:** App Router page에는 original template의 direct branches가 아직 남아 있습니다.
- **후속 연결:** `380b2a025070`이 다섯 design을 하나의 registry dispatch로 통합합니다.

### 8. `380b2a025070` — refactor(designs): 모든 route를 registry renderer로 위임

- **Importance:** S
- **Tags:** ARCH, ROUTING, RENDERER
- **Source-defined thread role:** Eliminates direct template special cases and establishes one dispatch path.
- **Source classification summary:** Route every application page through the design registry after resolving its template and building the corresponding view model.
- **Source classification reason:** Critical because it completes one dispatch architecture for all routes and designs, leaving App Router pages with framework concerns and renderers with presentation ownership.

#### Source에서 확정된 구현 의도와 상태 변화

모든 App Router page가 template resolution과 route view-model construction 후 design registry를 호출하도록 바꾸고 Classic/Design direct imports와 special-case selection을 제거합니다. Project detail의 `notFound`와 structured-data framing은 page에 남깁니다.

#### S-level source profile

- **Problem:** Expanded design은 registry를 사용했지만 Classic/Design은 direct import를 유지해 두 dispatch architecture가 공존했습니다.
- **Decision:** 모든 page가 view model을 만든 뒤 같은 registry를 호출하도록 합니다.
- **Why it mattered:** 모든 design과 route에 하나의 integration path를 제공하고 original template의 예외를 제거합니다.
- **What changed:** Direct template branch를 제거하고 discriminated projection을 registry에 전달합니다.

#### 해당 SHA에서 확인할 실제 코드

- 모든 public page에서 direct Classic/Design renderer import가 제거됐는지 검색합니다.
- Page별로 route view model을 만든 뒤 동일 registry function을 호출하는 순서를 확인합니다.
- Registry가 original Design/Classic까지 포함해 하나의 entry point로 dispatch하는 구현을 추적합니다.
- Project detail에서 project existence, `notFound`, metadata/JSON-LD wrapper가 renderer 밖에 남는 이유를 확인합니다.
- Registry design switch와 renderer route switch의 두 단계를 구분합니다.
- Legacy compatibility request 또는 fallback branch가 제거됐는지 확인합니다.
- Invalid/default template query가 registry selection 전에 해결되는지 확인합니다.

확인 원칙:

- 먼저 `380b2a025070^`와 `380b2a025070`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 expanded registry와 original direct branch의 이중 architecture | expanded designs는 registry를 사용하지만 Design/Classic은 page의 direct import/branch를 사용해 두 dispatch architecture가 공존했습니다. |
| Template class에 따라 route behavior/verification가 달라진 문제 | template class에 따라 integration path와 검증 범위가 달라져 original design이 privileged special case가 됐습니다. |
| All pages build projection then one registry dispatch decision | 모든 page가 route view model을 만든 뒤 동일 `renderDesignRoute` registry를 무조건 호출하도록 바꿨습니다. |
| Page calls, registry selection, renderer route dispatch | 모든 page가 route view model을 만든 뒤 동일 `renderDesignRoute` registry를 무조건 호출하도록 바꿨습니다. `src/designs/registry.tsx`는 다섯 ID의 complete `Record` loader/renderer entry를 가지며 8개 page에서 Design/Classic direct imports와 capability branch가 제거됩니다. Renderer 내부에서 design 선택 후 route discriminant로 두 단계 dispatch합니다. |
| App Router, registry, renderer, shell responsibility split | App Router는 lookup/not-found/metadata/JSON-LD를, registry는 design selection을, renderer는 route composition/shell을 소유합니다. |
| Invalid design, disabled route, unknown project failure handling | invalid design query는 registry 이전 resolver의 deterministic fallback으로 정리되고 disabled route/unknown project는 page에서 실패합니다. Project structured data는 page에 남습니다. |
| 보장하는 것: privileged template 없는 단일 path | 모든 public route와 다섯 design이 privileged template 없이 하나의 dispatch path를 사용합니다. |
| Route model input 제한 thread와의 연결 | 다음 thread의 `f8b0ab7b08aa`와 `5897b4b024da`가 registry input과 runtime payload를 좁힙니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** expanded designs는 registry를 사용하지만 Design/Classic은 page의 direct import/branch를 사용해 두 dispatch architecture가 공존했습니다.
- **해당 SHA 핵심 코드:** `src/designs/registry.tsx`는 다섯 ID의 complete `Record` loader/renderer entry를 가지며 8개 page에서 Design/Classic direct imports와 capability branch가 제거됩니다. Renderer 내부에서 design 선택 후 route discriminant로 두 단계 dispatch합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** 다음 thread의 `f8b0ab7b08aa`와 `5897b4b024da`가 registry input과 runtime payload를 좁힙니다.

#### SHA별 복원 결론

- **이전 상태:** expanded designs는 registry를 사용하지만 Design/Classic은 page의 direct import/branch를 사용해 두 dispatch architecture가 공존했습니다.
- **문제와 위험:** template class에 따라 integration path와 검증 범위가 달라져 original design이 privileged special case가 됐습니다.
- **핵심 결정:** 모든 page가 route view model을 만든 뒤 동일 `renderDesignRoute` registry를 무조건 호출하도록 바꿨습니다.
- **실제 구현 경로:** `src/designs/registry.tsx`는 다섯 ID의 complete `Record` loader/renderer entry를 가지며 8개 page에서 Design/Classic direct imports와 capability branch가 제거됩니다. Renderer 내부에서 design 선택 후 route discriminant로 두 단계 dispatch합니다.
- **소유권·상태 변화:** App Router는 lookup/not-found/metadata/JSON-LD를, registry는 design selection을, renderer는 route composition/shell을 소유합니다.
- **실패 경계:** invalid design query는 registry 이전 resolver의 deterministic fallback으로 정리되고 disabled route/unknown project는 page에서 실패합니다. Project structured data는 page에 남습니다.
- **보장:** 모든 public route와 다섯 design이 privileged template 없이 하나의 dispatch path를 사용합니다.
- **보장하지 않는 범위:** 이 시점의 renderer input은 여전히 broad content일 수 있어 semantic data ownership 최소성은 보장하지 않습니다.
- **후속 fix/test:** 다음 thread의 `f8b0ab7b08aa`와 `5897b4b024da`가 registry input과 runtime payload를 좁힙니다.

## 6. Invariant ledger

| Invariant | Source에서 확인된 변화 지점 | 해당 SHA의 실제 code/test evidence | 부족함이 드러난 시점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| Content가 광고하는 design은 code registry가 지원하고 lazy loading할 수 있습니다. | `418e7bc1d8bb → 6fc28f4c6586 → c6acfe562694/dd71d28143a8/b8de57f130eb` | `SITE_DESIGNS`/derived IDs, partial lazy loader registry, Editorial·Brutalist·Cinematic activation diff에서 같은 identifiers가 config/presentation/validation/module loader에 등록됩니다. | `418e7bc1d8bb`에서는 catalog만, `6fc28f4c6586`에서는 빈 extension point만 존재했습니다. | `380b2a025070` 시점에는 다섯 advertised designs 모두 complete registry entry와 route dispatcher를 가집니다. |
| Renderer input은 route discriminator, current path, debug state, detail context를 명시합니다. | `e14202198948` | `e14202198948::PortfolioRouteId`와 renderer props의 `route/currentPath/contentDebug/project` fields. | optional project는 route-correlated union이 아니며 broad `content`도 남았습니다. | framework가 resolved route context를 명시적으로 전달한다는 contract가 생겼고 payload correlation/minimization은 다음 thread에서 강화됩니다. |
| App Router page는 framework concern을, renderer는 complete composition을 소유합니다. | `dc2cf72a768d` | `dc2cf72a768d`의 8개 page delegation: page에서 loading/query/availability/project lookup/`notFound`, renderer에서 shell/composition. | 이 commit에는 Design/Classic local branch가 migration fallback으로 남았습니다. | framework concern은 App Router page에 유지되고 complete visual system은 external route renderer가 소유합니다. |
| 모든 route와 design은 하나의 registry dispatch path를 사용합니다. | `380b2a025070` | `380b2a025070`에서 8개 page의 direct Design/Classic imports와 capability branch가 제거되고 complete registry를 무조건 호출합니다. | 직전에는 original templates와 expanded designs가 서로 다른 dispatch path를 사용했습니다. | 모든 route와 five designs가 registry design selection → renderer route switch의 동일 two-stage path를 사용합니다. |

Ledger 작성 원칙:

- Source가 명시한 invariant만 사용하고 새 invariant를 확정 사실처럼 추가하지 않습니다.
- 도입, 강화, 부족함 노출, fix, regression test가 서로 다른 commit이면 각 열에 분리해 기록합니다.
- Code evidence에는 실제 field, function, branch, selector, command 또는 assertion을 적습니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 위험 | 대응 commit | 실제 수정/강화 code에서 확인할 것 | Test 또는 실행 증거 |
| --- | --- | --- | --- |
| Design ID는 selector에 보이지만 loader나 validation이 모름 | c6acfe562694, dd71d28143a8, b8de57f130eb | Metadata, swatch, schema acceptance, module export, loader map을 같은 SHA에서 대조합니다. | 각 activation에서 full-route entry point가 실제 등록되는지 기록합니다. |
| 각 page가 design별 분기와 route concern을 중복 구현함 | dc2cf72a768d | `renderDesignRoute` 전후로 page가 유지하는 책임과 넘기는 context를 구분합니다. | Legacy fallback이 어떤 design에 남아 있는지 기록합니다. |
| Classic/Design만 direct import되어 두 dispatch 체계가 공존함 | 380b2a025070 | Direct template branch 제거와 모든 page의 registry request 생성을 확인합니다. | Project detail의 `notFound`와 structured data가 page에 남는 이유를 설명합니다. |

### 실제 연결 기록

- Advertised/supported/loadable/renderable 불일치는 각 activation commit에서 config, presentation, loader, content support와 module entry를 같은 SHA에서 대조해 닫았습니다.
- `dc2cf72a768d`은 migration boundary이며 original templates의 direct fallback을 의도적으로 유지합니다. `380b2a025070`이 그 특례를 제거한 commit입니다.
- Unknown project/disabled route는 renderer 내부 fallback이 아니라 App Router page의 `notFound` owner에 남습니다.

## 8. Ownership / state / responsibility 변화

| Concern | Thread 초기 owner/state | Thread 최종 owner/state | 실제 symbol과 호출 경로 |
| --- | --- | --- | --- |
| Design 목록과 순서 | 분산 상수 가능성 | `SITE_DESIGNS`와 파생 identifier | `src/designs/config.ts::SITE_DESIGNS` → derived IDs/lookup → switcher/validation callers. |
| Route shape | Renderer가 URL/page를 추론 | `PortfolioRouteId`와 renderer props | `src/designs/types.ts::PortfolioRouteId`와 request props; page가 값들을 준비하고 renderer가 discriminator를 소비합니다. |
| Module loading | Static 또는 page별 import | Lazy renderer registry | `src/designs/registry.tsx`의 loader record와 dynamic imports가 module loading을 소유합니다. |
| Framework concern | Design 구현에 섞일 위험 | App Router page | `src/app/**/page.tsx`: content/query/availability/project lookup/`notFound`/metadata framing. |
| Complete composition | Page 내부 template conditional | Design-specific route renderer | 각 design의 `*Route` entry: exhaustive route switch, shared shell과 full composition. |
| Selection | Original/expanded design별 별도 경로 | 단일 registry dispatch | 최종 page → route view-model factory → `renderDesignRoute` → selected design route entry. |

## 9. Thread 최종 상태

### Source에서 확정된 최종 상태

다섯 시각 시스템이 전체 route composition을 독립적으로 소유하면서도 App Router의 loading, query, availability, not-found 책임을 복제하지 않도록 registry와 delegation 경계가 형성되는 과정을 복원합니다.

### 학습자가 완성할 최종 설명

- **Thread 시작 시점의 설계와 위험:** 초기에는 design catalog와 page-local templates가 있었지만 complete alternate renderer를 추가하면 framework route logic까지 복제할 위험이 있었습니다.
- **핵심 architecture/decision이 형성된 순서:** authoritative catalog, route input contract, lazy registry, all-page delegation, 세 expanded renderer activation, original template 통합 순서로 architecture가 완성됐습니다.
- **실제 failure 또는 부족함이 드러난 지점:** `dc2cf72a768d` 이후에도 Design/Classic direct branch가 남아 두 dispatch 체계가 공존한 것이 핵심 미완성 지점이었습니다.
- **Fix 또는 boundary 강화가 바꾼 invariant:** `380b2a025070`이 direct special cases를 제거해 page는 framework concern만, registry/renderer는 design과 route composition만 소유하도록 강화했습니다.
- **Test/build/browser evidence가 보장한 범위:** 각 activation SHA의 changed files와 final page/registry call graph를 정적 검토했습니다. 실제 browser render matrix는 이 thread의 해당 commit에서 실행하지 않았습니다.
- **Thread 종료 시점에도 보장하지 않는 범위:** route payload의 semantic 최소성, visual equality, runtime performance와 accessibility는 이 architecture 자체가 보장하지 않습니다.

## 10. 최종 architecture 또는 execution flow 정리

아래 source-backed flow의 각 단계에 실제 file path, symbol, input/output, failure branch를 추가합니다.

1. App Router page가 content와 query state를 해결합니다.
   - 실제 코드 위치: `src/app/**/page.tsx`와 portfolio content/query helpers
   - 입력과 출력: validated content와 search params에서 selected design, debug state, current path를 계산합니다.
   - 실패/absence 처리: invalid design은 deterministic fallback, malformed/disabled state는 page/helper policy로 정리됩니다.
2. Page enablement와 project existence를 검사하고 필요한 `notFound`를 처리합니다.
   - 실제 코드 위치: 각 public page의 availability/project lookup branch
   - 입력과 출력: optional page enablement와 dynamic project ID를 확인합니다.
   - 실패/absence 처리: disabled page나 unknown project는 renderer 호출 전 `notFound()` 처리합니다.
3. Route kind, path, debug state, detail context를 renderer request로 구성합니다.
   - 실제 코드 위치: route view-model factory 및 registry request construction
   - 입력과 출력: route literal, current path, debug state와 route-specific detail context를 묶습니다.
   - 실패/absence 처리: required detail context가 없으면 page/model factory에서 absence가 드러납니다.
4. Design registry가 identifier의 capability와 lazy module을 선택합니다.
   - 실제 코드 위치: `src/designs/registry.tsx::renderDesignRoute`
   - 입력과 출력: selected design ID로 five-design registry entry를 고르고 lazy module/renderer를 호출합니다.
   - 실패/absence 처리: final structure에는 advertised design의 null fallback이 없고 invalid ID는 upstream resolver가 처리합니다.
5. 선택된 design의 exhaustive route dispatcher가 전용 route renderer를 호출합니다.
   - 실제 코드 위치: 각 `DesignRoute`/`ClassicRoute`/`EditorialRoute`/`BrutalistRoute`/`CinematicRoute`
   - 입력과 출력: discriminated route request를 exhaustive switch해 exact route component로 전달합니다.
   - 실패/absence 처리: unsupported route literal은 closed union/exhaustive switch 수준에서 드러납니다.
6. Design shell과 route composition을 렌더링하고 metadata/JSON-LD는 page 경계에 유지합니다.
   - 실제 코드 위치: App Router page wrapper + selected design shell
   - 입력과 출력: renderer output을 반환하고 project JSON-LD/metadata/static params 같은 framework framing은 page에 유지합니다.
   - 실패/absence 처리: rendering exception은 normal server render failure로 전파되며 renderer가 `notFound` policy를 재구현하지 않습니다.

### 코드 없이 설명하기

> 이 Thread의 최종 실행 흐름을 code snippet 없이 자신의 말로 작성합니다. 설계 → 구현 → failure/risk → 수정/강화 → 검증 순서가 드러나야 합니다.

design 목록과 route input contract를 먼저 고정한 뒤 lazy registry를 만들었습니다. 모든 App Router page가 framework 상태를 해결하고 dedicated renderer에 complete composition을 넘기는 migration boundary를 도입했으며, Editorial·Brutalist·Cinematic을 같은 registration checklist로 활성화했습니다. 마지막에는 Design과 Classic의 direct page branches까지 registry로 이동해 다섯 design 모두 동일한 design dispatch와 route dispatch를 사용합니다. 따라서 renderer는 시각 시스템을 독립적으로 구성하지만 query, availability, project lookup과 not-found를 다시 구현하지 않습니다.

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
