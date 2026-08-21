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
_첫 commit 직전의 실제 owner와 부족함을 기록합니다._
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
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
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
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
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
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
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
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
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
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
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
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
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
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
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
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
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
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
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
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
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
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
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
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
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
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
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
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
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
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
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
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:882a2f9d753e:END -->

## 5. Invariant evolution

<!-- LEARNER-ANSWER:thread:01-cross-design-token-shell-and-regression-contracts.md:invariant:BEGIN -->
_어느 SHA에서 invariant가 도입·확장·제한·검증됐는지 기록합니다._
<!-- LEARNER-ANSWER:thread:01-cross-design-token-shell-and-regression-contracts.md:invariant:END -->

## 6. Failure → Fix → Test and ownership relations

<!-- LEARNER-ANSWER:thread:01-cross-design-token-shell-and-regression-contracts.md:relations:BEGIN -->
_실패·부족함·수정·검증과 owner 이동 관계를 연결합니다._
<!-- LEARNER-ANSWER:thread:01-cross-design-token-shell-and-regression-contracts.md:relations:END -->

## 7. Final architecture or execution flow

<!-- LEARNER-ANSWER:thread:01-cross-design-token-shell-and-regression-contracts.md:flow:BEGIN -->
_최종 flow를 코드 없이 설명합니다._
<!-- LEARNER-ANSWER:thread:01-cross-design-token-shell-and-regression-contracts.md:flow:END -->

## 8. Runtime and verification evidence

<!-- LEARNER-ANSWER:thread:01-cross-design-token-shell-and-regression-contracts.md:runtime:BEGIN -->
_실제로 실행한 command와 정적 inspection을 구분해 기록합니다._
<!-- LEARNER-ANSWER:thread:01-cross-design-token-shell-and-regression-contracts.md:runtime:END -->

## 9. Learning-completion checks

<!-- LEARNER-ANSWER:thread:01-cross-design-token-shell-and-regression-contracts.md:checks:BEGIN -->
_완료한 항목만 체크합니다._
<!-- LEARNER-ANSWER:thread:01-cross-design-token-shell-and-regression-contracts.md:checks:END -->
