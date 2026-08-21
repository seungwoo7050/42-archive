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
| Authoritative design ordering과 metadata ownership |  |
| Unknown ID의 deterministic fallback |  |
| 이 commit만으로는 full-route renderer loadability를 보장하지 않는 이유 |  |
| 새 design 추가 시 아직 변경해야 하는 다른 boundary |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

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
| Route discriminator와 exhaustive switch 기반 |  |
| Props 밖에 남는 framework responsibility |  |
| Optional project의 valid/invalid 조합 |  |
| 후속 projection thread에서 좁혀질 broad input |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

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
| Registry가 정의하는 extension point |  |
| Detection과 loading 부재/failure 처리 |  |
| Lazy loading이 보장하는 것과 module completeness를 보장하지 않는 것 |  |
| 첫 concrete activation에서 채워져야 할 항목 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

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
| 직전 page가 composition과 framework concern을 함께 소유한 구조 |  |
| Expanded design마다 route concern을 복제할 위험 |  |
| Page prepares, renderer composes, legacy fallback decision |  |
| Route request type, `renderDesignRoute`, 각 page call site |  |
| Unsupported loader, missing project, disabled route의 owner |  |
| 보장하는 것: 모든 public route의 동일 delegation entry |  |
| 아직 보장하지 않는 것: original templates의 direct special case 제거 |  |
| 후속 activation과 `380b2a025070` 연결 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

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
| Advertised/supported/loadable/renderable 네 조건의 source locations |  |
| Editorial complete route set의 dispatcher 증거 |  |
| Default 변경과 explicit query selection 관계 |  |
| Registry invariant를 처음 실제로 증명한 지점 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

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
| 두 번째 expanded renderer에도 같은 activation checklist가 적용된 증거 |  |
| Complete route coverage와 shell uniformity |  |
| Registration 누락이 만들 수 있는 불일치 |  |
| 다른 visual language와 같은 semantic contract의 경계 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

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
| Five-design completeness의 source-of-truth |  |
| Cinematic activation이 architecture 수정 없이 확장되는 방식 |  |
| Route 누락을 compiler/exhaustive switch가 드러내는지 여부 |  |
| Final unified dispatch 전에 남은 original template special case |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

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
| 직전 expanded registry와 original direct branch의 이중 architecture |  |
| Template class에 따라 route behavior/verification가 달라진 문제 |  |
| All pages build projection then one registry dispatch decision |  |
| Page calls, registry selection, renderer route dispatch |  |
| App Router, registry, renderer, shell responsibility split |  |
| Invalid design, disabled route, unknown project failure handling |  |
| 보장하는 것: privileged template 없는 단일 path |  |
| Route model input 제한 thread와의 연결 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

## 6. Invariant ledger

| Invariant | Source에서 확인된 변화 지점 | 해당 SHA의 실제 code/test evidence | 부족함이 드러난 시점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| Content가 광고하는 design은 code registry가 지원하고 lazy loading할 수 있습니다. | `418e7bc1d8bb → 6fc28f4c6586 → c6acfe562694/dd71d28143a8/b8de57f130eb` |  |  |  |
| Renderer input은 route discriminator, current path, debug state, detail context를 명시합니다. | `e14202198948` |  |  |  |
| App Router page는 framework concern을, renderer는 complete composition을 소유합니다. | `dc2cf72a768d` |  |  |  |
| 모든 route와 design은 하나의 registry dispatch path를 사용합니다. | `380b2a025070` |  |  |  |

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

## 8. Ownership / state / responsibility 변화

| Concern | Thread 초기 owner/state | Thread 최종 owner/state | 실제 symbol과 호출 경로 |
| --- | --- | --- | --- |
| Design 목록과 순서 | 분산 상수 가능성 | `SITE_DESIGNS`와 파생 identifier |  |
| Route shape | Renderer가 URL/page를 추론 | `PortfolioRouteId`와 renderer props |  |
| Module loading | Static 또는 page별 import | Lazy renderer registry |  |
| Framework concern | Design 구현에 섞일 위험 | App Router page |  |
| Complete composition | Page 내부 template conditional | Design-specific route renderer |  |
| Selection | Original/expanded design별 별도 경로 | 단일 registry dispatch |  |

## 9. Thread 최종 상태

### Source에서 확정된 최종 상태

다섯 시각 시스템이 전체 route composition을 독립적으로 소유하면서도 App Router의 loading, query, availability, not-found 책임을 복제하지 않도록 registry와 delegation 경계가 형성되는 과정을 복원합니다.

### 학습자가 완성할 최종 설명

- Thread 시작 시점의 설계와 위험:
- 핵심 architecture/decision이 형성된 순서:
- 실제 failure 또는 부족함이 드러난 지점:
- Fix 또는 boundary 강화가 바꾼 invariant:
- Test/build/browser evidence가 보장한 범위:
- Thread 종료 시점에도 보장하지 않는 범위:

## 10. 최종 architecture 또는 execution flow 정리

아래 source-backed flow의 각 단계에 실제 file path, symbol, input/output, failure branch를 추가합니다.

1. App Router page가 content와 query state를 해결합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
2. Page enablement와 project existence를 검사하고 필요한 `notFound`를 처리합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
3. Route kind, path, debug state, detail context를 renderer request로 구성합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
4. Design registry가 identifier의 capability와 lazy module을 선택합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
5. 선택된 design의 exhaustive route dispatcher가 전용 route renderer를 호출합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
6. Design shell과 route composition을 렌더링하고 metadata/JSON-LD는 page 경계에 유지합니다.
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
