# Thread: Cross-design token, shell, and regression contracts

> Project: 42 Archive Portfolio (`web/portfolio`)
>
> Category: `05-full-site-visual-systems`
>
> Phase 1 audit에서 확정한 authoritative scaffold입니다. Phase 2에서는 answer marker 내부만 채웁니다.

## 0. Scope and authority

- Commit SHA, subject, importance, tags는 branch의 `commit/commit-importance.md`와 exact commit metadata를 기준으로 고정했습니다.
- **Thread boundary:** 공통 registry·renderer input·App Router delegation·Design/Classic shell boundary·activation·cross-design regression만 포함합니다. Editorial/Brutalist/Cinematic 내부 조립은 각 전용 Thread에, Design/Classic의 route별 extraction은 Thread 5에 둡니다.
- 다른 branch, final HEAD의 후대 구현, 실행하지 않은 command 결과를 사용하지 않습니다.

## 1. Thread goal

다섯 디자인이 독립적인 full-site renderer로 동작하면서도 route vocabulary, prepared input, shell state, token 역할과 회귀 검증 경계를 공유하게 되는 과정을 복원합니다.

### Frozen invariant target

최종 invariant는 App Router가 framework concerns와 exact route view model을 소유하고, registry가 디자인을 선택하며, 각 renderer는 discriminated prepared input만 받아 자체 shell/presentation을 반환한다는 것입니다.

## 2. Commit map

| 순서 | Commit | Subject | Importance | Tags | 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `418e7bc1d8bb` | feat(designs): site design 정의 registry 추가 | A | ARCH, RENDERER | 사이트 디자인 vocabulary와 선택 registry의 시작점 |
| 2 | `e14202198948` | feat(designs): route renderer 계약 추가 | A | ARCH, ROUTING, RENDERER | 여덟 public route를 닫힌 union으로 표현하는 첫 renderer 계약 |
| 3 | `6fc28f4c6586` | refactor(designs): 확장 renderer lazy registry 추가 | A | ARCH, RENDERER, REFACTOR | 확장 디자인의 capability 조회와 lazy loader 경계 |
| 4 | `dc2cf72a768d` | refactor(routes): 확장 디자인 renderer 위임 경계 추가 | S | ARCH, ROUTING, RENDERER | 모든 public route에서 framework 책임과 full-site presentation을 분리한 최초의 공통 경계 |
| 5 | `c6acfe562694` | feat(editorial): renderer를 디자인 registry에 활성화 | A | ARCH, RENDERER | 완성된 Editorial을 selectable full-site renderer로 승격 |
| 6 | `dd71d28143a8` | feat(designs): Brutalist renderer 활성화 | A | ARCH, RENDERER | 완성된 Brutalist를 registry·content 계약에 연결 |
| 7 | `b8de57f130eb` | feat(designs): Cinematic renderer 활성화 | A | ARCH, RENDERER | Cinematic의 선택 가능 상태와 module API 축소 |
| 8 | `1598a87702f6` | test(design): view model 기반 renderer matrix 검증 | A | ARCH, VALIDATION, RENDERER | 다섯 디자인×여섯 migrated route의 정적 DOM compatibility matrix |
| 9 | `4732301a7d2c` | style(designs): route renderer 디자인 토큰 확장 | A | ARCH, ROUTING, RENDERER | color 외 일곱 cross-design token family의 도입 |
| 10 | `969741c3469d` | refactor(shell): 디자인 renderer 셸 경계 추가 | A | ARCH, ROUTING, RENDERER | Design·Classic도 prepared shell props를 받아 독립 root marker를 갖는 전환 |
| 11 | `8a48460df4c3` | refactor(journey): 모든 renderer에 여정 view model 적용 | A | ARCH, RENDERER, REFACTOR | 여정 reference resolution을 renderer 밖으로 이동 |
| 12 | `aef265b9bd01` | refactor(interview): 모든 renderer에 인터뷰 view model 적용 | A | ARCH, RENDERER, REFACTOR | 인터뷰 answer-project join을 route view model에 통일 |
| 13 | `f8b0ab7b08aa` | refactor(designs): renderer 입력을 route view model로 제한 | S | ARCH, ROUTING, RENDERER | renderer가 전역 content graph를 읽지 못하게 하는 discriminated input invariant |
| 14 | `380b2a025070` | refactor(designs): 모든 route를 registry renderer로 위임 | S | ARCH, ROUTING, RENDERER | 여덟 App Router page와 다섯 디자인을 하나의 dispatch architecture로 폐쇄 |
| 15 | `055b733cbb7e` | test(design): 독립 renderer와 design token 경계 검증 | A | ARCH, VALIDATION, RENDERER | 8×5 route matrix와 token/renderer marker의 정적 회귀 계약 |
| 16 | `882a2f9d753e` | test(visual): 다섯 디자인 회귀 기준 추가 | A | TEST | Playwright screenshot baseline과 snapshot manifest 계약 |

## 3. Historical baseline

<!-- LEARNER-ANSWER:thread:01-cross-design-token-shell-and-regression-contracts.md:baseline:BEGIN -->
- **직전 상태:** 초기에는 `SiteDesignId`와 route-specific presentation ownership이 App Router와 shared components에 분산돼 있었고, 확장 디자인은 registry 후보일 뿐 public route에서 실행되지 않았습니다.
- **경계 판단:** 공통 registry·renderer input·App Router delegation·Design/Classic shell boundary·activation·cross-design regression만 포함합니다. Editorial/Brutalist/Cinematic 내부 조립은 각 전용 Thread에, Design/Classic의 route별 extraction은 Thread 5에 둡니다.
- **복원 기준:** 각 commit의 parent와 exact SHA tree만 사용하고 final HEAD를 이전 상태에 소급하지 않았습니다.
<!-- LEARNER-ANSWER:thread:01-cross-design-token-shell-and-regression-contracts.md:baseline:END -->

## 4. Commit-by-commit reconstruction

### 1. `418e7bc1d8bb` — feat(designs): site design 정의 registry 추가

- **Importance:** A
- **Tags:** ARCH, RENDERER
- **Thread role:** 사이트 디자인 vocabulary와 선택 registry의 시작점

#### Commit-specific investigation

- `418e7bc1d8bb^`와 `418e7bc1d8bb`를 비교하고 `src/designs/config.ts`에서 **`SiteDesignDefinition`, 디자인 ID 목록, 기본 디자인 선택과 unknown ID fallback**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `사이트 디자인 vocabulary와 선택 registry의 시작점` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `등록된 디자인이 실제 모든 route를 렌더링한다는 보장은 아직 없다.`라는 한계를 코드와 test 범위에서 확인합니다.
- 후속 관계: 다음 `e14202198948`가 이 ID vocabulary 위에 route renderer 입력 계약을 얹는다.
- 같은 contract를 소비하는 다른 route/design과 비교하되, 이 SHA 이후 코드를 현재 commit의 구현으로 소급하지 않습니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:418e7bc1d8bb:BEGIN -->
- **직전 상태:** 직전 상태에는 **`SiteDesignDefinition`, 디자인 ID 목록, 기본 디자인 선택과 unknown ID fallback**에 해당하는 실행 가능한 route/component 경계가 아직 없었습니다.
- **구현 결정:** 이 커밋은 `design`과 `classic`을 데이터 정의로 등록하고, 조회 실패 시 첫 정의를 반환하는 registry를 만든다. 디자인 선택은 더 이상 route별 문자열 분기에만 의존하지 않지만, 아직 route renderer 계약은 없다.
- **파일·symbol:** `src/designs/config.ts`에서 `SiteDesignDefinition`, 디자인 ID 목록, 기본 디자인 선택과 unknown ID fallback를 확인했습니다.
- **소유권:** `src/designs/config.ts`가 이 기능의 DOM 조립·분기·링크/상태 표현을 소유하며 source content의 원본 수명은 변경하지 않습니다.
- **보장/비보장:** 이 SHA는 `사이트 디자인 vocabulary와 선택 registry의 시작점` 경계를 고정합니다. 등록된 디자인이 실제 모든 route를 렌더링한다는 보장은 아직 없다.
- **역사적 연결:** 다음 `e14202198948`가 이 ID vocabulary 위에 route renderer 입력 계약을 얹는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:418e7bc1d8bb:END -->

### 2. `e14202198948` — feat(designs): route renderer 계약 추가

- **Importance:** A
- **Tags:** ARCH, ROUTING, RENDERER
- **Thread role:** 여덟 public route를 닫힌 union으로 표현하는 첫 renderer 계약

#### Commit-specific investigation

- `e14202198948^`와 `e14202198948`를 비교하고 `src/designs/types.ts`에서 **`DesignRouteName`, `DesignRouteProps`, route별 optional project/currentPath/contentDebug 입력**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `여덟 public route를 닫힌 union으로 표현하는 첫 renderer 계약` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `타입 정의만으로 App Router가 위임하거나 미지원 renderer를 처리하지는 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.
- 후속 관계: `6fc28f4c6586`가 이 타입을 lazy registry의 loader 경계로 사용하고, `f8b0ab7b08aa`가 나중에 raw-content 접근을 금지한다.
- 같은 contract를 소비하는 다른 route/design과 비교하되, 이 SHA 이후 코드를 현재 commit의 구현으로 소급하지 않습니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:e14202198948:BEGIN -->
- **직전 상태:** 직전 상태에는 **`DesignRouteName`, `DesignRouteProps`, route별 optional project/currentPath/contentDebug 입력**에 해당하는 실행 가능한 route/component 경계가 아직 없었습니다.
- **구현 결정:** home, projects, project-detail, about, resume, contact, journey, interview-map을 닫힌 route union으로 고정하고 renderer가 받을 공통 props를 정의한다. 이 시점 입력은 여전히 전체 `PortfolioContent`라서 renderer가 전역 콘텐츠 그래프에 접근할 수 있다.
- **파일·symbol:** `src/designs/types.ts`에서 `DesignRouteName`, `DesignRouteProps`, route별 optional project/currentPath/contentDebug 입력를 확인했습니다.
- **소유권:** `src/designs/types.ts`가 이 기능의 DOM 조립·분기·링크/상태 표현을 소유하며 source content의 원본 수명은 변경하지 않습니다.
- **보장/비보장:** 이 SHA는 `여덟 public route를 닫힌 union으로 표현하는 첫 renderer 계약` 경계를 고정합니다. 타입 정의만으로 App Router가 위임하거나 미지원 renderer를 처리하지는 않는다.
- **역사적 연결:** `6fc28f4c6586`가 이 타입을 lazy registry의 loader 경계로 사용하고, `f8b0ab7b08aa`가 나중에 raw-content 접근을 금지한다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:e14202198948:END -->

### 3. `6fc28f4c6586` — refactor(designs): 확장 renderer lazy registry 추가

- **Importance:** A
- **Tags:** ARCH, RENDERER, REFACTOR
- **Thread role:** 확장 디자인의 capability 조회와 lazy loader 경계

#### Commit-specific investigation

- `6fc28f4c6586^`와 `6fc28f4c6586`를 비교하고 `src/designs/registry.tsx`에서 **`routeLoaders`, `hasDedicatedRouteRenderer`, `renderDesignRoute`의 null 반환 경로**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `확장 디자인의 capability 조회와 lazy loader 경계` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `lazy registry는 fallback UI나 오류 보고를 제공하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.
- 후속 관계: `dc2cf72a768d`가 public route에서 이 null 가능 경계를 소비하고, 각 activation 커밋이 loader를 채운다.
- 같은 contract를 소비하는 다른 route/design과 비교하되, 이 SHA 이후 코드를 현재 commit의 구현으로 소급하지 않습니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:6fc28f4c6586:BEGIN -->
- **직전 상태:** 동작 자체는 앞선 구현에 존재했지만 **`routeLoaders`, `hasDedicatedRouteRenderer`, `renderDesignRoute`의 null 반환 경로**의 조립·조회·공개 책임이 App Router, raw content consumer 또는 여러 module에 분산돼 있었습니다.
- **구현 결정:** Editorial·Brutalist·Cinematic을 dedicated renderer 후보로 분류하지만 `routeLoaders`가 비어 있어 실제 loader가 없으면 `renderDesignRoute`는 `null`을 반환한다. capability와 구현 등록을 분리해 점진적 활성화가 가능해졌으나, 이 시점에는 확장 디자인을 선택해도 전용 화면이 보장되지 않는다.
- **파일·symbol:** `src/designs/registry.tsx`에서 `routeLoaders`, `hasDedicatedRouteRenderer`, `renderDesignRoute`의 null 반환 경로를 확인했습니다.
- **소유권:** 표현·조립 책임은 `src/designs/registry.tsx` 쪽으로 이동하고, 이전 caller는 framework/context 준비 또는 public entry 호출만 남습니다.
- **보장/비보장:** 이 SHA는 `확장 디자인의 capability 조회와 lazy loader 경계` 경계를 고정합니다. lazy registry는 fallback UI나 오류 보고를 제공하지 않는다.
- **역사적 연결:** `dc2cf72a768d`가 public route에서 이 null 가능 경계를 소비하고, 각 activation 커밋이 loader를 채운다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.

```tsx
// 6fc28f4c6586 · src/designs/registry.tsx
const loader = routeLoaders[designId];
if (!loader) return null;
```
<!-- LEARNER-ANSWER:commit:6fc28f4c6586:END -->

### 4. `dc2cf72a768d` — refactor(routes): 확장 디자인 renderer 위임 경계 추가

- **Importance:** S
- **Tags:** ARCH, ROUTING, RENDERER
- **Thread role:** 모든 public route에서 framework 책임과 full-site presentation을 분리한 최초의 공통 경계

#### Commit-specific investigation

- `dc2cf72a768d^`와 `dc2cf72a768d`를 비교하고 `src/app/page.tsx 외 7개 public route page, src/designs/registry.tsx`에서 **각 page의 content loading/notFound/metadata 이후 `hasDedicatedRouteRenderer`와 `renderDesignRoute` 호출, null 결과와 Design·Classic fallback**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `모든 public route에서 framework 책임과 full-site presentation을 분리한 최초의 공통 경계` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 단계의 공통 입력은 raw content이며, route별 view model 제한과 단일 dispatch는 아직 아니다.`라는 한계를 코드와 test 범위에서 확인합니다.
- 후속 관계: Editorial/Brutalist/Cinematic activation이 이 경계를 실제 구현에 연결하고, `380b2a025070`이 최종적으로 Design·Classic까지 같은 경로로 통일한다.
- App Router → view-model/content boundary → registry/dispatcher → shell/view의 전체 call path를 parent와 비교합니다.
- 호환 branch가 남아 있는지, 제거되는 시점은 언제인지, 이 invariant가 다른 네 Thread에 미치는 영향을 연결합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:dc2cf72a768d:BEGIN -->
#### 복원 결과
- **직전 상태와 위험:** 동작 자체는 앞선 구현에 존재했지만 **각 page의 content loading/notFound/metadata 이후 `hasDedicatedRouteRenderer`와 `renderDesignRoute` 호출, null 결과와 Design·Classic fallback**의 조립·조회·공개 책임이 App Router, raw content consumer 또는 여러 module에 분산돼 있었습니다. 이 분산 상태는 route/design마다 다른 파생·fallback·shell 처리를 허용해 같은 입력이 다른 실행 경로를 탈 위험이 있었습니다.
- **핵심 결정:** 직전에는 registry가 있어도 public route가 이를 호출하지 않아 확장 디자인이 실행될 수 없었다. 이 커밋은 여덟 App Router page가 route 이름·현재 경로·필요한 project를 준비한 뒤 registry로 넘기게 한다. App Router는 framework 정책을 유지하고, dedicated renderer는 전체 presentation을 소유한다. 아직 Design·Classic은 기존 shared path로 남고 loader 미등록 결과는 기존 화면으로 후퇴한다.
- **실제 inspection 지점:** `src/app/page.tsx 외 7개 public route page, src/designs/registry.tsx`에서 각 page의 content loading/notFound/metadata 이후 `hasDedicatedRouteRenderer`와 `renderDesignRoute` 호출, null 결과와 Design·Classic fallback를 parent diff와 resulting tree로 추적했습니다.
- **책임과 상태 전환:** 표현·조립 책임은 `src/app/page.tsx 외 7개 public route page, src/designs/registry.tsx` 쪽으로 이동하고, 이전 caller는 framework/context 준비 또는 public entry 호출만 남습니다.
- **실패·비보장:** 이 단계의 공통 입력은 raw content이며, route별 view model 제한과 단일 dispatch는 아직 아니다.
- **후속 폐쇄:** Editorial/Brutalist/Cinematic activation이 이 경계를 실제 구현에 연결하고, `380b2a025070`이 최종적으로 Design·Classic까지 같은 경로로 통일한다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.

```tsx
// dc2cf72a768d · public route pages
const rendered = await renderDesignRoute(activeTemplate, {
  route: "...",
  content,
  currentPath,
  contentDebug,
});
if (rendered) return rendered;
```
<!-- LEARNER-ANSWER:commit:dc2cf72a768d:END -->

### 5. `c6acfe562694` — feat(editorial): renderer를 디자인 registry에 활성화

- **Importance:** A
- **Tags:** ARCH, RENDERER
- **Thread role:** 완성된 Editorial을 selectable full-site renderer로 승격

#### Commit-specific investigation

- `c6acfe562694^`와 `c6acfe562694`를 비교하고 `src/designs/registry.tsx, src/designs/config.ts, src/content/presentation.json, src/lib/portfolio/content-loader.ts`에서 **Editorial loader 등록, 디자인 정의·표시 copy·content validation의 동시 확장**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `완성된 Editorial을 selectable full-site renderer로 승격` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `활성화는 시각 정확성이나 모든 content 조합을 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.
- 후속 관계: Thread 2의 `46e23d922c2e` dispatcher가 선행 구현이며, 이 커밋은 그 결과를 공통 선택 경계에 연결한다.
- 같은 contract를 소비하는 다른 route/design과 비교하되, 이 SHA 이후 코드를 현재 commit의 구현으로 소급하지 않습니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:c6acfe562694:BEGIN -->
- **직전 상태:** 직전 상태에는 **Editorial loader 등록, 디자인 정의·표시 copy·content validation의 동시 확장**에 해당하는 실행 가능한 route/component 경계가 아직 없었습니다.
- **구현 결정:** Editorial module이 존재하는 것과 사용자가 선택 가능한 것은 별개였다. 이 커밋은 registry loader와 config/content 경계를 함께 갱신해 `editorial` 선택이 여덟 route renderer로 도달하도록 한다.
- **파일·symbol:** `src/designs/registry.tsx, src/designs/config.ts, src/content/presentation.json, src/lib/portfolio/content-loader.ts`에서 Editorial loader 등록, 디자인 정의·표시 copy·content validation의 동시 확장를 확인했습니다.
- **소유권:** `src/designs/registry.tsx, src/designs/config.ts, src/content/presentation.json, src/lib/portfolio/content-loader.ts`가 이 기능의 DOM 조립·분기·링크/상태 표현을 소유하며 source content의 원본 수명은 변경하지 않습니다.
- **보장/비보장:** 이 SHA는 `완성된 Editorial을 selectable full-site renderer로 승격` 경계를 고정합니다. 활성화는 시각 정확성이나 모든 content 조합을 검증하지 않는다.
- **역사적 연결:** Thread 2의 `46e23d922c2e` dispatcher가 선행 구현이며, 이 커밋은 그 결과를 공통 선택 경계에 연결한다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:c6acfe562694:END -->

### 6. `dd71d28143a8` — feat(designs): Brutalist renderer 활성화

- **Importance:** A
- **Tags:** ARCH, RENDERER
- **Thread role:** 완성된 Brutalist를 registry·content 계약에 연결

#### Commit-specific investigation

- `dd71d28143a8^`와 `dd71d28143a8`를 비교하고 `src/designs/registry.tsx, src/designs/config.ts, presentation/content validation files`에서 **Brutalist loader와 selectable design metadata, route entry point**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `완성된 Brutalist를 registry·content 계약에 연결` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `CSS breakpoint와 route별 empty state의 품질은 activation 자체가 보장하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.
- 후속 관계: Thread 3의 `caa7df81d899` 단일 entry point를 소비한다.
- 같은 contract를 소비하는 다른 route/design과 비교하되, 이 SHA 이후 코드를 현재 commit의 구현으로 소급하지 않습니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:dd71d28143a8:BEGIN -->
- **직전 상태:** 직전 상태에는 **Brutalist loader와 selectable design metadata, route entry point**에 해당하는 실행 가능한 route/component 경계가 아직 없었습니다.
- **구현 결정:** Brutalist의 내부 route 집합이 완성된 뒤 registry가 module entry를 lazy-load하도록 바뀐다. 선택 ID, 사용자 노출 copy, loader가 한 commit에서 일치하므로 unknown/registered/implemented 상태가 갈라지지 않는다.
- **파일·symbol:** `src/designs/registry.tsx, src/designs/config.ts, presentation/content validation files`에서 Brutalist loader와 selectable design metadata, route entry point를 확인했습니다.
- **소유권:** `src/designs/registry.tsx, src/designs/config.ts, presentation/content validation files`가 이 기능의 DOM 조립·분기·링크/상태 표현을 소유하며 source content의 원본 수명은 변경하지 않습니다.
- **보장/비보장:** 이 SHA는 `완성된 Brutalist를 registry·content 계약에 연결` 경계를 고정합니다. CSS breakpoint와 route별 empty state의 품질은 activation 자체가 보장하지 않는다.
- **역사적 연결:** Thread 3의 `caa7df81d899` 단일 entry point를 소비한다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:dd71d28143a8:END -->

### 7. `b8de57f130eb` — feat(designs): Cinematic renderer 활성화

- **Importance:** A
- **Tags:** ARCH, RENDERER
- **Thread role:** Cinematic의 선택 가능 상태와 module API 축소

#### Commit-specific investigation

- `b8de57f130eb^`와 `b8de57f130eb`를 비교하고 `src/designs/registry.tsx, src/designs/config.ts, src/designs/cinematic/cinematic-route.tsx, content files`에서 **Cinematic loader 등록과 route entry export만 남기는 공개 범위**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Cinematic의 선택 가능 상태와 module API 축소` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `별도 exhaustive dispatcher 함수가 추가되는 것은 아니며, route entry 내부의 switch/분기 품질에 의존한다.`라는 한계를 코드와 test 범위에서 확인합니다.
- 후속 관계: Thread 4의 route composition 전체를 공통 registry에 연결한다.
- 같은 contract를 소비하는 다른 route/design과 비교하되, 이 SHA 이후 코드를 현재 commit의 구현으로 소급하지 않습니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:b8de57f130eb:BEGIN -->
- **직전 상태:** 직전 상태에는 **Cinematic loader 등록과 route entry export만 남기는 공개 범위**에 해당하는 실행 가능한 route/component 경계가 아직 없었습니다.
- **구현 결정:** Cinematic을 selectable design으로 등록하면서 내부 view/helper export를 제거하고 registry가 route entry 하나만 알도록 정리한다. activation과 module ownership 축소가 함께 일어나 registry가 내부 조립 세부사항에 결합되지 않는다.
- **파일·symbol:** `src/designs/registry.tsx, src/designs/config.ts, src/designs/cinematic/cinematic-route.tsx, content files`에서 Cinematic loader 등록과 route entry export만 남기는 공개 범위를 확인했습니다.
- **소유권:** `src/designs/registry.tsx, src/designs/config.ts, src/designs/cinematic/cinematic-route.tsx, content files`가 이 기능의 DOM 조립·분기·링크/상태 표현을 소유하며 source content의 원본 수명은 변경하지 않습니다.
- **보장/비보장:** 이 SHA는 `Cinematic의 선택 가능 상태와 module API 축소` 경계를 고정합니다. 별도 exhaustive dispatcher 함수가 추가되는 것은 아니며, route entry 내부의 switch/분기 품질에 의존한다.
- **역사적 연결:** Thread 4의 route composition 전체를 공통 registry에 연결한다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:b8de57f130eb:END -->

### 8. `1598a87702f6` — test(design): view model 기반 renderer matrix 검증

- **Importance:** A
- **Tags:** ARCH, VALIDATION, RENDERER
- **Thread role:** 다섯 디자인×여섯 migrated route의 정적 DOM compatibility matrix

#### Commit-specific investigation

- `1598a87702f6^`와 `1598a87702f6`를 비교하고 `src/designs/route-view-models.test.tsx`에서 **`designIds`, `routes`, Testing Library render, `data-site-design`와 non-empty `h1` assertion**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `다섯 디자인×여섯 migrated route의 정적 DOM compatibility matrix` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `브라우저 레이아웃, CSS 적용, interaction, journey/interview는 이 SHA의 검증 범위가 아니다.`라는 한계를 코드와 test 범위에서 확인합니다.
- 후속 관계: `055b733cbb7e`가 journey/interview를 추가하고 Design·Classic 독립 renderer marker를 검증한다.
- 같은 contract를 소비하는 다른 route/design과 비교하되, 이 SHA 이후 코드를 현재 commit의 구현으로 소급하지 않습니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:1598a87702f6:BEGIN -->
- **직전 상태:** 관련 production 경계는 존재했지만 **`designIds`, `routes`, Testing Library render, `data-site-design`와 non-empty `h1` assertion**를 실패 시 자동으로 탐지하는 회귀 증거가 없었습니다.
- **구현 결정:** Vitest/jsdom에서 home·projects·project-detail·about·resume·contact를 다섯 디자인으로 직접 호출한다. enabled project가 없으면 fixture 전제 오류를 내고, 각 조합에서 디자인 root와 비어 있지 않은 `h1`을 확인한다. 이는 30개 조합의 server component 결과가 기본 HTML 경계를 유지함을 증명한다.
- **파일·symbol:** `src/designs/route-view-models.test.tsx`에서 `designIds`, `routes`, Testing Library render, `data-site-design`와 non-empty `h1` assertion를 확인했습니다.
- **소유권:** production owner는 변경하지 않고 `src/designs/route-view-models.test.tsx`가 회귀 판정과 fixture 전제를 소유합니다.
- **보장/비보장:** 이 SHA는 `다섯 디자인×여섯 migrated route의 정적 DOM compatibility matrix` 경계를 고정합니다. 브라우저 레이아웃, CSS 적용, interaction, journey/interview는 이 SHA의 검증 범위가 아니다.
- **역사적 연결:** `055b733cbb7e`가 journey/interview를 추가하고 Design·Classic 독립 renderer marker를 검증한다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:1598a87702f6:END -->

### 9. `4732301a7d2c` — style(designs): route renderer 디자인 토큰 확장

- **Importance:** A
- **Tags:** ARCH, ROUTING, RENDERER
- **Thread role:** color 외 일곱 cross-design token family의 도입

#### Commit-specific investigation

- `4732301a7d2c^`와 `4732301a7d2c`를 비교하고 `src/app/globals.css`에서 **`--type-display`, `--type-body`, `--space-section`, `--breakpoint-content`, `--motion-fast`, `--layer-navigation`, `--content-width`의 design scope**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `color 외 일곱 cross-design token family의 도입` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `모든 renderer가 모든 토큰을 실제 소비하거나 시각적으로 동일한 의미를 갖는다는 보장은 없다.`라는 한계를 코드와 test 범위에서 확인합니다.
- 후속 관계: `055b733cbb7e`의 정적 token contract가 이름 존재와 Design·Classic scope를 보호한다.
- 같은 contract를 소비하는 다른 route/design과 비교하되, 이 SHA 이후 코드를 현재 commit의 구현으로 소급하지 않습니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:4732301a7d2c:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **`--type-display`, `--type-body`, `--space-section`, `--breakpoint-content`, `--motion-fast`, `--layer-navigation`, `--content-width`의 design scope**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **구현 결정:** 각 `[data-site-design]` scope에 typography, rhythm, breakpoint value, motion, navigation layer, content width를 정의한다. 공통 consumer는 특히 content width를 사용하지만, CSS custom property에 breakpoint 숫자를 둔 것만으로 media query가 자동 적용되지는 않는다.
- **파일·symbol:** `src/app/globals.css`에서 `--type-display`, `--type-body`, `--space-section`, `--breakpoint-content`, `--motion-fast`, `--layer-navigation`, `--content-width`의 design scope를 확인했습니다.
- **소유권:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/app/globals.css`의 scoped stylesheet가 소유합니다.
- **보장/비보장:** 이 SHA는 `color 외 일곱 cross-design token family의 도입` 경계를 고정합니다. 모든 renderer가 모든 토큰을 실제 소비하거나 시각적으로 동일한 의미를 갖는다는 보장은 없다.
- **역사적 연결:** `055b733cbb7e`의 정적 token contract가 이름 존재와 Design·Classic scope를 보호한다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:4732301a7d2c:END -->

### 10. `969741c3469d` — refactor(shell): 디자인 renderer 셸 경계 추가

- **Importance:** A
- **Tags:** ARCH, ROUTING, RENDERER
- **Thread role:** Design·Classic도 prepared shell props를 받아 독립 root marker를 갖는 전환

#### Commit-specific investigation

- `969741c3469d^`와 `969741c3469d`를 비교하고 `src/components/portfolio/site-shell.tsx, src/designs/shell-props.ts`에서 **`createDesignShellProps`, `data-route-renderer`, footerLinks/templateSwitcher/currentPath 조립**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Design·Classic도 prepared shell props를 받아 독립 root marker를 갖는 전환` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `Editorial·Brutalist·Cinematic의 자체 shell을 이 helper로 강제하지는 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.
- 후속 관계: Thread 5의 Design·Classic extraction이 이 helper를 소비하고, `055b733cbb7e`가 marker를 검사한다.
- 같은 contract를 소비하는 다른 route/design과 비교하되, 이 SHA 이후 코드를 현재 commit의 구현으로 소급하지 않습니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:969741c3469d:BEGIN -->
- **직전 상태:** 동작 자체는 앞선 구현에 존재했지만 **`createDesignShellProps`, `data-route-renderer`, footerLinks/templateSwitcher/currentPath 조립**의 조립·조회·공개 책임이 App Router, raw content consumer 또는 여러 module에 분산돼 있었습니다.
- **구현 결정:** 공용 `PageShell`에 renderer marker를 선택적으로 붙이고, route renderer가 필요한 shell props를 한 helper에서 조립한다. footer/navigation/debug/current path의 반복 해석이 App Router나 개별 section에서 분산되지 않게 된다.
- **파일·symbol:** `src/components/portfolio/site-shell.tsx, src/designs/shell-props.ts`에서 `createDesignShellProps`, `data-route-renderer`, footerLinks/templateSwitcher/currentPath 조립를 확인했습니다.
- **소유권:** 표현·조립 책임은 `src/components/portfolio/site-shell.tsx, src/designs/shell-props.ts` 쪽으로 이동하고, 이전 caller는 framework/context 준비 또는 public entry 호출만 남습니다.
- **보장/비보장:** 이 SHA는 `Design·Classic도 prepared shell props를 받아 독립 root marker를 갖는 전환` 경계를 고정합니다. Editorial·Brutalist·Cinematic의 자체 shell을 이 helper로 강제하지는 않는다.
- **역사적 연결:** Thread 5의 Design·Classic extraction이 이 helper를 소비하고, `055b733cbb7e`가 marker를 검사한다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:969741c3469d:END -->

### 11. `8a48460df4c3` — refactor(journey): 모든 renderer에 여정 view model 적용

- **Importance:** A
- **Tags:** ARCH, RENDERER, REFACTOR
- **Thread role:** 여정 reference resolution을 renderer 밖으로 이동

#### Commit-specific investigation

- `8a48460df4c3^`와 `8a48460df4c3`를 비교하고 `src/app/journey/page.tsx, src/lib/portfolio/view-models.ts, 다섯 renderer의 journey path`에서 **`createJourneyViewModel`, resolved milestones/anchor projects, raw `PortfolioContent` 의존 제거**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `여정 reference resolution을 renderer 밖으로 이동` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `표현 방식과 empty-state copy는 각 renderer가 계속 소유한다.`라는 한계를 코드와 test 범위에서 확인합니다.
- 후속 관계: `f8b0ab7b08aa`가 이 전환을 공통 type contract로 강제한다.
- 같은 contract를 소비하는 다른 route/design과 비교하되, 이 SHA 이후 코드를 현재 commit의 구현으로 소급하지 않습니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:8a48460df4c3:BEGIN -->
- **직전 상태:** 동작 자체는 앞선 구현에 존재했지만 **`createJourneyViewModel`, resolved milestones/anchor projects, raw `PortfolioContent` 의존 제거**의 조립·조회·공개 책임이 App Router, raw content consumer 또는 여러 module에 분산돼 있었습니다.
- **구현 결정:** Journey route가 prepared view model을 만들고 다섯 renderer가 동일한 resolved milestone 구조를 소비하도록 바뀐다. project ID lookup과 누락 판단이 renderer별로 반복되지 않아 같은 source가 디자인마다 다른 링크 결과를 만들 위험을 줄인다.
- **파일·symbol:** `src/app/journey/page.tsx, src/lib/portfolio/view-models.ts, 다섯 renderer의 journey path`에서 `createJourneyViewModel`, resolved milestones/anchor projects, raw `PortfolioContent` 의존 제거를 확인했습니다.
- **소유권:** 표현·조립 책임은 `src/app/journey/page.tsx, src/lib/portfolio/view-models.ts, 다섯 renderer의 journey path` 쪽으로 이동하고, 이전 caller는 framework/context 준비 또는 public entry 호출만 남습니다.
- **보장/비보장:** 이 SHA는 `여정 reference resolution을 renderer 밖으로 이동` 경계를 고정합니다. 표현 방식과 empty-state copy는 각 renderer가 계속 소유한다.
- **역사적 연결:** `f8b0ab7b08aa`가 이 전환을 공통 type contract로 강제한다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:8a48460df4c3:END -->

### 12. `aef265b9bd01` — refactor(interview): 모든 renderer에 인터뷰 view model 적용

- **Importance:** A
- **Tags:** ARCH, RENDERER, REFACTOR
- **Thread role:** 인터뷰 answer-project join을 route view model에 통일

#### Commit-specific investigation

- `aef265b9bd01^`와 `aef265b9bd01`를 비교하고 `src/app/interview-map/page.tsx, src/lib/portfolio/view-models.ts, 다섯 renderer의 interview path`에서 **`createInterviewMapViewModel`, answer의 resolved project 또는 null, track/question hierarchy 보존**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `인터뷰 answer-project join을 route view model에 통일` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `null을 어떤 문구·레이아웃으로 보여 줄지는 cross-design 공통 보장이 아니다.`라는 한계를 코드와 test 범위에서 확인합니다.
- 후속 관계: `f8b0ab7b08aa`의 discriminated union에 interview variant가 들어간다.
- 같은 contract를 소비하는 다른 route/design과 비교하되, 이 SHA 이후 코드를 현재 commit의 구현으로 소급하지 않습니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:aef265b9bd01:BEGIN -->
- **직전 상태:** 동작 자체는 앞선 구현에 존재했지만 **`createInterviewMapViewModel`, answer의 resolved project 또는 null, track/question hierarchy 보존**의 조립·조회·공개 책임이 App Router, raw content consumer 또는 여러 module에 분산돼 있었습니다.
- **구현 결정:** 각 renderer가 `Map`이나 `find`로 answer project를 다시 찾던 책임을 view-model boundary로 옮긴다. 누락 참조는 `null`로 명시되어 presentation은 링크 생성이 아니라 표시 정책만 결정한다.
- **파일·symbol:** `src/app/interview-map/page.tsx, src/lib/portfolio/view-models.ts, 다섯 renderer의 interview path`에서 `createInterviewMapViewModel`, answer의 resolved project 또는 null, track/question hierarchy 보존를 확인했습니다.
- **소유권:** 표현·조립 책임은 `src/app/interview-map/page.tsx, src/lib/portfolio/view-models.ts, 다섯 renderer의 interview path` 쪽으로 이동하고, 이전 caller는 framework/context 준비 또는 public entry 호출만 남습니다.
- **보장/비보장:** 이 SHA는 `인터뷰 answer-project join을 route view model에 통일` 경계를 고정합니다. null을 어떤 문구·레이아웃으로 보여 줄지는 cross-design 공통 보장이 아니다.
- **역사적 연결:** `f8b0ab7b08aa`의 discriminated union에 interview variant가 들어간다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:aef265b9bd01:END -->

### 13. `f8b0ab7b08aa` — refactor(designs): renderer 입력을 route view model로 제한

- **Importance:** S
- **Tags:** ARCH, ROUTING, RENDERER
- **Thread role:** renderer가 전역 content graph를 읽지 못하게 하는 discriminated input invariant

#### Commit-specific investigation

- `f8b0ab7b08aa^`와 `f8b0ab7b08aa`를 비교하고 `src/designs/types.ts, src/designs/registry.tsx, src/lib/portfolio/view-models.ts, renderer entry files`에서 **`PreparedDesignRouteProps`, route discriminator별 view-model variant, footerLinks와 resolved references**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `renderer가 전역 content graph를 읽지 못하게 하는 discriminated input invariant` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `런타임 외부 JSON이 이미 검증됐다는 사실이나 CSS/DOM 품질을 이 타입만으로 보장하지는 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.
- 후속 관계: `380b2a025070`이 모든 App Router page를 이 계약의 단일 caller로 만든다.
- App Router → view-model/content boundary → registry/dispatcher → shell/view의 전체 call path를 parent와 비교합니다.
- 호환 branch가 남아 있는지, 제거되는 시점은 언제인지, 이 invariant가 다른 네 Thread에 미치는 영향을 연결합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:f8b0ab7b08aa:BEGIN -->
#### 복원 결과
- **직전 상태와 위험:** 동작 자체는 앞선 구현에 존재했지만 **`PreparedDesignRouteProps`, route discriminator별 view-model variant, footerLinks와 resolved references**의 조립·조회·공개 책임이 App Router, raw content consumer 또는 여러 module에 분산돼 있었습니다. 이 분산 상태는 route/design마다 다른 파생·fallback·shell 처리를 허용해 같은 입력이 다른 실행 경로를 탈 위험이 있었습니다.
- **핵심 결정:** 직전까지 migration 호환 때문에 raw `PortfolioContent`와 prepared model이 함께 통과할 수 있었다. 이 커밋은 공통 props를 route discriminator와 정확히 대응하는 view-model union으로 바꿔 renderer가 다른 route 데이터나 전역 content graph를 읽는 것을 타입 수준에서 금지한다. 데이터 파생·참조 해석은 route/content boundary가 소유하고 renderer는 presentation만 소유한다.
- **실제 inspection 지점:** `src/designs/types.ts, src/designs/registry.tsx, src/lib/portfolio/view-models.ts, renderer entry files`에서 `PreparedDesignRouteProps`, route discriminator별 view-model variant, footerLinks와 resolved references를 parent diff와 resulting tree로 추적했습니다.
- **책임과 상태 전환:** 표현·조립 책임은 `src/designs/types.ts, src/designs/registry.tsx, src/lib/portfolio/view-models.ts, renderer entry files` 쪽으로 이동하고, 이전 caller는 framework/context 준비 또는 public entry 호출만 남습니다.
- **실패·비보장:** 런타임 외부 JSON이 이미 검증됐다는 사실이나 CSS/DOM 품질을 이 타입만으로 보장하지는 않는다.
- **후속 폐쇄:** `380b2a025070`이 모든 App Router page를 이 계약의 단일 caller로 만든다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.

```ts
// f8b0ab7b08aa · renderer contract
type PreparedDesignRouteProps =
  | { route: "home"; content: HomeViewModel; ... }
  | { route: "projects"; content: ProjectsViewModel; ... }
  | ...;
```
<!-- LEARNER-ANSWER:commit:f8b0ab7b08aa:END -->

### 14. `380b2a025070` — refactor(designs): 모든 route를 registry renderer로 위임

- **Importance:** S
- **Tags:** ARCH, ROUTING, RENDERER
- **Thread role:** 여덟 App Router page와 다섯 디자인을 하나의 dispatch architecture로 폐쇄

#### Commit-specific investigation

- `380b2a025070^`와 `380b2a025070`를 비교하고 `src/app/page.tsx 외 7개 page, src/designs/registry.tsx, Design/Classic entry modules`에서 **page별 exact view-model creation → `renderDesignRoute` → registry loader/dispatcher; direct Design·Classic imports 제거**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `여덟 App Router page와 다섯 디자인을 하나의 dispatch architecture로 폐쇄` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `registry가 반환한 DOM의 pixel-level correctness나 client interaction은 별도 test 책임이다.`라는 한계를 코드와 test 범위에서 확인합니다.
- 후속 관계: `055b733cbb7e`가 8×5 matrix와 독립 marker를 확인하며, Thread 5의 dispatchers가 Design·Classic branch를 제공한다.
- App Router → view-model/content boundary → registry/dispatcher → shell/view의 전체 call path를 parent와 비교합니다.
- 호환 branch가 남아 있는지, 제거되는 시점은 언제인지, 이 invariant가 다른 네 Thread에 미치는 영향을 연결합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:380b2a025070:BEGIN -->
#### 복원 결과
- **직전 상태와 위험:** 동작 자체는 앞선 구현에 존재했지만 **page별 exact view-model creation → `renderDesignRoute` → registry loader/dispatcher; direct Design·Classic imports 제거**의 조립·조회·공개 책임이 App Router, raw content consumer 또는 여러 module에 분산돼 있었습니다. 이 분산 상태는 route/design마다 다른 파생·fallback·shell 처리를 허용해 같은 입력이 다른 실행 경로를 탈 위험이 있었습니다.
- **핵심 결정:** 이전에는 dedicated 세 디자인만 registry를 쓰고 Design·Classic은 page별 직접 분기로 남아 있었다. 이 커밋은 각 page가 framework 책임(content load, enablement, params, metadata/notFound)을 처리한 뒤 정확한 route view model을 만들고, 모든 디자인을 registry 하나로 호출하게 한다. renderer 선택과 presentation ownership이 App Router에서 제거된다.
- **실제 inspection 지점:** `src/app/page.tsx 외 7개 page, src/designs/registry.tsx, Design/Classic entry modules`에서 page별 exact view-model creation → `renderDesignRoute` → registry loader/dispatcher; direct Design·Classic imports 제거를 parent diff와 resulting tree로 추적했습니다.
- **책임과 상태 전환:** 표현·조립 책임은 `src/app/page.tsx 외 7개 page, src/designs/registry.tsx, Design/Classic entry modules` 쪽으로 이동하고, 이전 caller는 framework/context 준비 또는 public entry 호출만 남습니다.
- **실패·비보장:** registry가 반환한 DOM의 pixel-level correctness나 client interaction은 별도 test 책임이다.
- **후속 폐쇄:** `055b733cbb7e`가 8×5 matrix와 독립 marker를 확인하며, Thread 5의 dispatchers가 Design·Classic branch를 제공한다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.

```tsx
// 380b2a025070 · App Router pages
return renderDesignRoute(activeTemplate, {
  route: "...",
  content: viewModel,
  currentPath,
  contentDebug,
});
```
<!-- LEARNER-ANSWER:commit:380b2a025070:END -->

### 15. `055b733cbb7e` — test(design): 독립 renderer와 design token 경계 검증

- **Importance:** A
- **Tags:** ARCH, VALIDATION, RENDERER
- **Thread role:** 8×5 route matrix와 token/renderer marker의 정적 회귀 계약

#### Commit-specific investigation

- `055b733cbb7e^`와 `055b733cbb7e`를 비교하고 `src/designs/design-tokens.test.ts, src/designs/route-view-models.test.tsx`에서 **일곱 token family 문자열 검사, journey/interview 추가, Design·Classic `data-route-renderer` assertion**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `8×5 route matrix와 token/renderer marker의 정적 회귀 계약` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `정규식 기반 CSS 검사는 token 소비·계산값·시각 대비를 증명하지 않고, jsdom은 layout을 계산하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.
- 후속 관계: `882a2f9d753e`가 실제 Chromium screenshot surface를 추가한다.
- 같은 contract를 소비하는 다른 route/design과 비교하되, 이 SHA 이후 코드를 현재 commit의 구현으로 소급하지 않습니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:055b733cbb7e:BEGIN -->
- **직전 상태:** 관련 production 경계는 존재했지만 **일곱 token family 문자열 검사, journey/interview 추가, Design·Classic `data-route-renderer` assertion**를 실패 시 자동으로 탐지하는 회귀 증거가 없었습니다.
- **구현 결정:** 기존 여섯 route matrix를 journey와 interview-map까지 늘려 40개 조합을 렌더링하고, Design·Classic이 shared fallback이 아니라 독립 renderer root를 냈는지 확인한다. 별도 test는 globals.css에 일곱 token family가 있고 두 renderer scope에 content-width가 있는지 정적으로 검사한다.
- **파일·symbol:** `src/designs/design-tokens.test.ts, src/designs/route-view-models.test.tsx`에서 일곱 token family 문자열 검사, journey/interview 추가, Design·Classic `data-route-renderer` assertion를 확인했습니다.
- **소유권:** production owner는 변경하지 않고 `src/designs/design-tokens.test.ts, src/designs/route-view-models.test.tsx`가 회귀 판정과 fixture 전제를 소유합니다.
- **보장/비보장:** 이 SHA는 `8×5 route matrix와 token/renderer marker의 정적 회귀 계약` 경계를 고정합니다. 정규식 기반 CSS 검사는 token 소비·계산값·시각 대비를 증명하지 않고, jsdom은 layout을 계산하지 않는다.
- **역사적 연결:** `882a2f9d753e`가 실제 Chromium screenshot surface를 추가한다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:055b733cbb7e:END -->

### 16. `882a2f9d753e` — test(visual): 다섯 디자인 회귀 기준 추가

- **Importance:** A
- **Tags:** TEST
- **Thread role:** Playwright screenshot baseline과 snapshot manifest 계약

#### Commit-specific investigation

- `882a2f9d753e^`와 `882a2f9d753e`를 비교하고 `tests/e2e/visual.spec.ts, src/designs/visual-regression-contract.test.ts, playwright.config.ts, tests/e2e/visual.spec.ts-snapshots/`에서 **`prepareStablePage`, reduced motion/networkidle/font/image 대기, 15 PNG manifest, `maxDiffPixelRatio: 0.01`**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Playwright screenshot baseline과 snapshot manifest 계약` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `모든 route, 모든 project, accessibility, 동적 interaction을 포괄하지 않으며 이 작업 환경에서는 실행하지 않았다.`라는 한계를 코드와 test 범위에서 확인합니다.
- 후속 관계: 이 test는 `380b2a025070` 이후 cross-design presentation의 브라우저 회귀 방어다.
- 같은 contract를 소비하는 다른 route/design과 비교하되, 이 SHA 이후 코드를 현재 commit의 구현으로 소급하지 않습니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:882a2f9d753e:BEGIN -->
- **직전 상태:** 관련 production 경계는 존재했지만 **`prepareStablePage`, reduced motion/networkidle/font/image 대기, 15 PNG manifest, `maxDiffPixelRatio: 0.01`**를 실패 시 자동으로 탐지하는 회귀 증거가 없었습니다.
- **구현 결정:** 다섯 디자인의 home을 Chromium desktop/mobile로, 첫 enabled project detail을 desktop Chromium으로 캡처한다. 안정화를 위해 reduced motion을 강제하고 network idle·font·image 완료를 기다린다. Vitest manifest test는 정확히 15개 baseline 이름이 존재하는지 확인한다.
- **파일·symbol:** `tests/e2e/visual.spec.ts, src/designs/visual-regression-contract.test.ts, playwright.config.ts, tests/e2e/visual.spec.ts-snapshots/`에서 `prepareStablePage`, reduced motion/networkidle/font/image 대기, 15 PNG manifest, `maxDiffPixelRatio: 0.01`를 확인했습니다.
- **소유권:** production owner는 변경하지 않고 `tests/e2e/visual.spec.ts, src/designs/visual-regression-contract.test.ts, playwright.config.ts, tests/e2e/visual.spec.ts-snapshots/`가 회귀 판정과 fixture 전제를 소유합니다.
- **보장/비보장:** 이 SHA는 `Playwright screenshot baseline과 snapshot manifest 계약` 경계를 고정합니다. 모든 route, 모든 project, accessibility, 동적 interaction을 포괄하지 않으며 이 작업 환경에서는 실행하지 않았다.
- **역사적 연결:** 이 test는 `380b2a025070` 이후 cross-design presentation의 브라우저 회귀 방어다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:882a2f9d753e:END -->

## 5. Invariant evolution

<!-- LEARNER-ANSWER:thread:01-cross-design-token-shell-and-regression-contracts.md:invariant:BEGIN -->
최종 invariant는 App Router가 framework concerns와 exact route view model을 소유하고, registry가 디자인을 선택하며, 각 renderer는 discriminated prepared input만 받아 자체 shell/presentation을 반환한다는 것입니다.

- 도입·확장·폐쇄의 순서는 commit map에 고정했습니다.
- B-level construction은 route/style surface를 단계적으로 넓히고, A/S-level commit은 owner·dispatch·검증 invariant를 바꿉니다.
<!-- LEARNER-ANSWER:thread:01-cross-design-token-shell-and-regression-contracts.md:invariant:END -->

## 6. Failure → Fix → Test and ownership relations

<!-- LEARNER-ANSWER:thread:01-cross-design-token-shell-and-regression-contracts.md:relations:BEGIN -->
`dc2cf72a768d`가 최초 위임 경계를 만들고 세 activation이 dedicated renderer를 연결합니다. `8a48460df4c3`·`aef265b9bd01`이 마지막 raw-reference join을 제거한 뒤 `f8b0ab7b08aa`가 타입으로 제한하고 `380b2a025070`이 모든 route/design을 통일합니다. `1598a87702f6`·`055b733cbb7e`·`882a2f9d753e`가 정적 DOM, token, browser screenshot의 서로 다른 층을 보호합니다.
<!-- LEARNER-ANSWER:thread:01-cross-design-token-shell-and-regression-contracts.md:relations:END -->

## 7. Final architecture or execution flow

<!-- LEARNER-ANSWER:thread:01-cross-design-token-shell-and-regression-contracts.md:flow:BEGIN -->
요청 route → content load/enablement/params 처리 → route view model 생성 → template resolve → registry loader → 디자인 dispatcher → design-owned shell/body → static/visual contract 검증 순서입니다.

각 단계에서 optional/empty/missing reference가 처리되지 않는 경우도 보장으로 포장하지 않았으며, 해당 commit의 non-guarantee에 남겼습니다.
<!-- LEARNER-ANSWER:thread:01-cross-design-token-shell-and-regression-contracts.md:flow:END -->

## 8. Runtime and verification evidence

<!-- LEARNER-ANSWER:thread:01-cross-design-token-shell-and-regression-contracts.md:runtime:BEGIN -->
- **실행한 repository test/build:** 없음.
- **정적 확인:** 지정 branch의 commit classification, commit bodies, exact commit diff와 historical file 변경을 GitHub 연결을 통해 확인했습니다.
- **실행하지 못한 이유:** 작업 container에서 직접 clone 시 DNS가 `github.com`을 해석하지 못해 historical worktree를 만들 수 없었습니다. 따라서 Vitest, Playwright, Next build 결과를 성공으로 기록하지 않았습니다.
- **검증 수준:** code/test implementation의 존재와 범위는 inspection으로 확인했고, runtime pass/fail은 주장하지 않습니다.
<!-- LEARNER-ANSWER:thread:01-cross-design-token-shell-and-regression-contracts.md:runtime:END -->

## 9. Learning-completion checks

<!-- LEARNER-ANSWER:thread:01-cross-design-token-shell-and-regression-contracts.md:checks:BEGIN -->
- [x] 모든 고정 SHA·subject·importance·tags를 commit map과 commit section에서 동일하게 유지했습니다.
- [x] 각 SHA에 concrete file과 symbol/selector/route focus를 기록했습니다.
- [x] 이전 상태, owner, absence/fallback, guarantee/non-guarantee, 후속 관계를 채웠습니다.
- [x] S/A/B depth를 구분했습니다.
- [x] 실행하지 않은 test를 통과로 표시하지 않았습니다.
<!-- LEARNER-ANSWER:thread:01-cross-design-token-shell-and-regression-contracts.md:checks:END -->
