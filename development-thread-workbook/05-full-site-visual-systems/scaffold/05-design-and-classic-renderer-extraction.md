# Thread: Design and Classic renderer extraction

> Project: 42 Archive Portfolio (`web/portfolio`)
>
> Category: `05-full-site-visual-systems`
>
> Phase 1 audit에서 확정한 authoritative scaffold입니다. Phase 2에서는 answer marker 내부만 채웁니다.

## 0. Scope and authority

- Commit SHA, subject, importance, tags는 branch의 `commit/commit-importance.md`와 exact commit metadata를 기준으로 고정했습니다.
- **Thread boundary:** route별 extraction과 최종 Design/Classic dispatcher만 포함합니다. 새로운 visual feature construction이나 cross-design registry unification은 각각 다른 category/Thread에 둡니다.
- 다른 branch, final HEAD의 후대 구현, 실행하지 않은 command 결과를 사용하지 않습니다.

## 1. Thread goal

App Router와 공용 component에 남아 있던 Design·Classic presentation을 route module로 옮기고, 각 디자인을 단일 dispatcher 아래 닫는 ownership transfer를 복원합니다.

### Frozen invariant target

최종 invariant는 App Router가 content/metadata/notFound/structured-data/view-model 생성만 소유하고, Design·Classic module이 route guard·shell·presentation·private helper를 소유하며, 외부는 각 `index.tsx` dispatcher 하나만 호출한다는 것입니다.

## 2. Commit map

| 순서 | Commit | Subject | Importance | Tags | 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `b8d35db40ed1` | refactor(routes): Design 홈 renderer로 위임 | B | ROUTING, RENDERER, REFACTOR | Home ownership transfer |
| 2 | `29943a185465` | refactor(routes): Design 프로젝트 목록 renderer로 위임 | B | ROUTING, RENDERER, REFACTOR | Projects ownership transfer |
| 3 | `b76fa3f1d6be` | refactor(routes): Design 프로젝트 상세 renderer로 위임 | B | ROUTING, RENDERER, REFACTOR | Project detail ownership transfer |
| 4 | `e4feecdc7a04` | refactor(routes): Design 소개 renderer로 위임 | B | ROUTING, RENDERER, REFACTOR | About ownership transfer |
| 5 | `43fac33fdda3` | refactor(routes): Design 이력 renderer로 위임 | B | ROUTING, RENDERER, REFACTOR | Resume ownership transfer |
| 6 | `b11a4e4a3d72` | refactor(routes): Design 연락 renderer로 위임 | B | ROUTING, RENDERER, REFACTOR | Contact ownership transfer |
| 7 | `8a0bd21f7557` | refactor(routes): Design 여정 renderer로 위임 | B | ROUTING, RENDERER, REFACTOR | Journey ownership transfer |
| 8 | `2fee9efda711` | refactor(routes): Design 인터뷰 renderer로 위임 | B | ROUTING, RENDERER, REFACTOR | Interview ownership transfer |
| 9 | `05e1cebd0b70` | refactor(design): Design route dispatcher 추가 | A | ARCH, ROUTING, RENDERER | Design의 여덟 독립 module을 하나의 public dispatcher로 통합 |
| 10 | `15ab994dabfd` | refactor(classic-home): 홈 renderer를 독립 모듈로 이동 | B | RENDERER, REFACTOR | Classic Home ownership transfer and shared-component cleanup |
| 11 | `91e44a4de72c` | refactor(classic-projects): 프로젝트 목록 renderer를 이동 | B | RENDERER, REFACTOR | Classic Projects ownership transfer |
| 12 | `7a65f0522061` | refactor(classic-project): 상세 renderer를 독립 모듈로 완성 | B | RENDERER, REFACTOR | Classic Project detail ownership transfer |
| 13 | `25fa6b575c31` | refactor(classic-about): 소개 renderer를 독립 모듈로 이동 | B | RENDERER, REFACTOR | Classic About large presentation transfer |
| 14 | `88fb0a09db5e` | refactor(classic-resume): 이력 renderer를 독립 모듈로 이동 | B | RENDERER, REFACTOR | Classic Resume large presentation transfer |
| 15 | `17e0a9ad0acb` | refactor(classic-contact): 연락 renderer를 독립 모듈로 이동 | B | RENDERER, REFACTOR | Classic Contact transfer |
| 16 | `c44f91b0d40d` | refactor(classic-journey): 여정 renderer를 독립 모듈로 이동 | B | RENDERER, REFACTOR | Classic Journey transfer and shared prepared model |
| 17 | `a5d8f288baa2` | refactor(classic-interview): 인터뷰 renderer를 독립 모듈로 이동 | B | RENDERER, REFACTOR | Classic Interview transfer and shared prepared model |
| 18 | `6b193d084e69` | refactor(classic): Classic route dispatcher 추가 | A | ARCH, ROUTING, RENDERER | Classic의 여덟 독립 route module을 하나의 public entry로 통합 |

## 3. Historical baseline

<!-- LEARNER-ANSWER:thread:05-design-and-classic-renderer-extraction.md:baseline:BEGIN -->
_첫 commit 직전의 실제 owner와 부족함을 기록합니다._
<!-- LEARNER-ANSWER:thread:05-design-and-classic-renderer-extraction.md:baseline:END -->

## 4. Commit-by-commit reconstruction

### 1. `b8d35db40ed1` — refactor(routes): Design 홈 renderer로 위임

- **Importance:** B
- **Tags:** ROUTING, RENDERER, REFACTOR
- **Thread role:** Home ownership transfer

#### Commit-specific investigation

- `b8d35db40ed1^`와 `b8d35db40ed1`를 비교하고 `src/app/page.tsx, src/designs/design/home-route.tsx`에서 **App page의 Design branch, `HomeRoute` route guard, `createDesignShellProps`, private `HomeView`**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Home ownership transfer` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.
- 후속 관계: 후속 `05e1cebd0b70` dispatcher가 이 module을 단일 Design entry 아래 묶는다.

#### Learning record

<!-- LEARNER-ANSWER:commit:b8d35db40ed1:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:b8d35db40ed1:END -->

### 2. `29943a185465` — refactor(routes): Design 프로젝트 목록 renderer로 위임

- **Importance:** B
- **Tags:** ROUTING, RENDERER, REFACTOR
- **Thread role:** Projects ownership transfer

#### Commit-specific investigation

- `29943a185465^`와 `29943a185465`를 비교하고 `src/app/projects/page.tsx, src/designs/design/projects-route.tsx`에서 **App page의 derived pageCopy/metrics/groups 제거, renderer route guard와 shell/derived field consumption**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Projects ownership transfer` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:29943a185465:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:29943a185465:END -->

### 3. `b76fa3f1d6be` — refactor(routes): Design 프로젝트 상세 renderer로 위임

- **Importance:** B
- **Tags:** ROUTING, RENDERER, REFACTOR
- **Thread role:** Project detail ownership transfer

#### Commit-specific investigation

- `b76fa3f1d6be^`와 `b76fa3f1d6be`를 비교하고 `src/app/projects/[projectId]/page.tsx, src/designs/design/project-detail-route.tsx`에서 **App page의 StructuredData/notFound 유지, renderer guard/shell/hero/body, helper private화**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Project detail ownership transfer` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:b76fa3f1d6be:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:b76fa3f1d6be:END -->

### 4. `e4feecdc7a04` — refactor(routes): Design 소개 renderer로 위임

- **Importance:** B
- **Tags:** ROUTING, RENDERER, REFACTOR
- **Thread role:** About ownership transfer

#### Commit-specific investigation

- `e4feecdc7a04^`와 `e4feecdc7a04`를 비교하고 `src/app/about/page.tsx, src/designs/design/about-route.tsx`에서 **App page의 Design branch, renderer shell, experience/curation completion, private curation helpers**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `About ownership transfer` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:e4feecdc7a04:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:e4feecdc7a04:END -->

### 5. `43fac33fdda3` — refactor(routes): Design 이력 renderer로 위임

- **Importance:** B
- **Tags:** ROUTING, RENDERER, REFACTOR
- **Thread role:** Resume ownership transfer

#### Commit-specific investigation

- `43fac33fdda3^`와 `43fac33fdda3`를 비교하고 `src/app/resume/page.tsx, src/designs/design/resume-route.tsx`에서 **App branch 제거, renderer shell, optional experience/education/notes**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Resume ownership transfer` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:43fac33fdda3:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:43fac33fdda3:END -->

### 6. `b11a4e4a3d72` — refactor(routes): Design 연락 renderer로 위임

- **Importance:** B
- **Tags:** ROUTING, RENDERER, REFACTOR
- **Thread role:** Contact ownership transfer

#### Commit-specific investigation

- `b11a4e4a3d72^`와 `b11a4e4a3d72`를 비교하고 `src/app/contact/page.tsx, src/designs/design/contact-route.tsx`에서 **page availability/context resolution 이후 Design route entry 호출**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Contact ownership transfer` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:b11a4e4a3d72:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:b11a4e4a3d72:END -->

### 7. `8a0bd21f7557` — refactor(routes): Design 여정 renderer로 위임

- **Importance:** B
- **Tags:** ROUTING, RENDERER, REFACTOR
- **Thread role:** Journey ownership transfer

#### Commit-specific investigation

- `8a0bd21f7557^`와 `8a0bd21f7557`를 비교하고 `src/app/journey/page.tsx, src/designs/design/journey-route.tsx, src/lib/portfolio/view-models.ts`에서 **`createJourneyViewModel`, renderer route guard/shell/timeline/current, private `MilestoneCard`**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Journey ownership transfer` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:8a0bd21f7557:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:8a0bd21f7557:END -->

### 8. `2fee9efda711` — refactor(routes): Design 인터뷰 renderer로 위임

- **Importance:** B
- **Tags:** ROUTING, RENDERER, REFACTOR
- **Thread role:** Interview ownership transfer

#### Commit-specific investigation

- `2fee9efda711^`와 `2fee9efda711`를 비교하고 `src/app/interview-map/page.tsx, src/designs/design/interview-map-route.tsx, src/lib/portfolio/view-models.ts`에서 **`createInterviewMapViewModel`, renderer route guard/shell/gaps, private `TrackSection`**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Interview ownership transfer` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:2fee9efda711:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:2fee9efda711:END -->

### 9. `05e1cebd0b70` — refactor(design): Design route dispatcher 추가

- **Importance:** A
- **Tags:** ARCH, ROUTING, RENDERER
- **Thread role:** Design의 여덟 독립 module을 하나의 public dispatcher로 통합

#### Commit-specific investigation

- `05e1cebd0b70^`와 `05e1cebd0b70`를 비교하고 `src/designs/design/index.tsx`에서 **`DesignRoute` switch와 home/projects/project-detail/about/resume/contact/journey/interview imports**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Design의 여덟 독립 module을 하나의 public dispatcher로 통합` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `각 module 내부 empty-state/visual correctness는 dispatcher가 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.
- 후속 관계: Thread 1의 `380b2a025070`이 이 dispatcher를 registry의 Design loader로 호출한다.
- 같은 contract를 소비하는 다른 route/design과 비교하되, 이 SHA 이후 코드를 현재 commit의 구현으로 소급하지 않습니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:05e1cebd0b70:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:05e1cebd0b70:END -->

### 10. `15ab994dabfd` — refactor(classic-home): 홈 renderer를 독립 모듈로 이동

- **Importance:** B
- **Tags:** RENDERER, REFACTOR
- **Thread role:** Classic Home ownership transfer and shared-component cleanup

#### Commit-specific investigation

- `15ab994dabfd^`와 `15ab994dabfd`를 비교하고 `src/app/page.tsx, src/designs/classic/home-route.tsx, 삭제된 src/components/portfolio/home-*.tsx`에서 **App page의 Classic branch, route guard/shell, configured section order, Classic-only shared component 삭제/흡수**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Classic Home ownership transfer and shared-component cleanup` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:15ab994dabfd:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:15ab994dabfd:END -->

### 11. `91e44a4de72c` — refactor(classic-projects): 프로젝트 목록 renderer를 이동

- **Importance:** B
- **Tags:** RENDERER, REFACTOR
- **Thread role:** Classic Projects ownership transfer

#### Commit-specific investigation

- `91e44a4de72c^`와 `91e44a4de72c`를 비교하고 `src/app/projects/page.tsx, src/designs/classic/projects-route.tsx`에서 **App page의 PageShell/metrics/groups 제거, renderer route guard/shell, prepared tuples**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Classic Projects ownership transfer` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:91e44a4de72c:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:91e44a4de72c:END -->

### 12. `7a65f0522061` — refactor(classic-project): 상세 renderer를 독립 모듈로 완성

- **Importance:** B
- **Tags:** RENDERER, REFACTOR
- **Thread role:** Classic Project detail ownership transfer

#### Commit-specific investigation

- `7a65f0522061^`와 `7a65f0522061`를 비교하고 `src/app/projects/[projectId]/page.tsx, src/designs/classic/project-detail-route.tsx`에서 **StructuredData는 page에 유지, renderer guard/shell/hero/body와 private section helpers**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Classic Project detail ownership transfer` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:7a65f0522061:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:7a65f0522061:END -->

### 13. `25fa6b575c31` — refactor(classic-about): 소개 renderer를 독립 모듈로 이동

- **Importance:** B
- **Tags:** RENDERER, REFACTOR
- **Thread role:** Classic About large presentation transfer

#### Commit-specific investigation

- `25fa6b575c31^`와 `25fa6b575c31`를 비교하고 `src/app/about/page.tsx, src/designs/classic/about-route.tsx`에서 **App page에서 제거된 300여 line identity/principles/journey/skills/experience/curation markup, route module shell**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Classic About large presentation transfer` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:25fa6b575c31:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:25fa6b575c31:END -->

### 14. `88fb0a09db5e` — refactor(classic-resume): 이력 renderer를 독립 모듈로 이동

- **Importance:** B
- **Tags:** RENDERER, REFACTOR
- **Thread role:** Classic Resume large presentation transfer

#### Commit-specific investigation

- `88fb0a09db5e^`와 `88fb0a09db5e`를 비교하고 `src/app/resume/page.tsx, src/designs/classic/resume-route.tsx`에서 **App page에서 제거된 hero/summary/projects/training/experience/education/notes, module shell**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Classic Resume large presentation transfer` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:88fb0a09db5e:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:88fb0a09db5e:END -->

### 15. `17e0a9ad0acb` — refactor(classic-contact): 연락 renderer를 독립 모듈로 이동

- **Importance:** B
- **Tags:** RENDERER, REFACTOR
- **Thread role:** Classic Contact transfer

#### Commit-specific investigation

- `17e0a9ad0acb^`와 `17e0a9ad0acb`를 비교하고 `src/app/contact/page.tsx, src/designs/classic/contact-route.tsx`에서 **App page의 hero/availability/preferred link/empty/notes 제거와 module route guard**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Classic Contact transfer` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:17e0a9ad0acb:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:17e0a9ad0acb:END -->

### 16. `c44f91b0d40d` — refactor(classic-journey): 여정 renderer를 독립 모듈로 이동

- **Importance:** B
- **Tags:** RENDERER, REFACTOR
- **Thread role:** Classic Journey transfer and shared prepared model

#### Commit-specific investigation

- `c44f91b0d40d^`와 `c44f91b0d40d`를 비교하고 `src/app/journey/page.tsx, src/designs/classic/journey-route.tsx`에서 **App page의 raw milestone resolution 제거, `createJourneyViewModel`, module `MilestoneCard`**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Classic Journey transfer and shared prepared model` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:c44f91b0d40d:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:c44f91b0d40d:END -->

### 17. `a5d8f288baa2` — refactor(classic-interview): 인터뷰 renderer를 독립 모듈로 이동

- **Importance:** B
- **Tags:** RENDERER, REFACTOR
- **Thread role:** Classic Interview transfer and shared prepared model

#### Commit-specific investigation

- `a5d8f288baa2^`와 `a5d8f288baa2`를 비교하고 `src/app/interview-map/page.tsx, src/designs/classic/interview-map-route.tsx`에서 **App page의 project Map/table markup 제거, `createInterviewMapViewModel`, module `TrackSection`**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Classic Interview transfer and shared prepared model` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:a5d8f288baa2:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:a5d8f288baa2:END -->

### 18. `6b193d084e69` — refactor(classic): Classic route dispatcher 추가

- **Importance:** A
- **Tags:** ARCH, ROUTING, RENDERER
- **Thread role:** Classic의 여덟 독립 route module을 하나의 public entry로 통합

#### Commit-specific investigation

- `6b193d084e69^`와 `6b193d084e69`를 비교하고 `src/designs/classic/index.tsx`에서 **`ClassicRoute` exhaustive switch와 8 module imports**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Classic의 여덟 독립 route module을 하나의 public entry로 통합` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `dispatcher는 module 반환값의 내용이나 runtime unknown string을 별도 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.
- 후속 관계: Thread 1의 `380b2a025070`이 Design과 함께 registry path로 통일한다.
- 같은 contract를 소비하는 다른 route/design과 비교하되, 이 SHA 이후 코드를 현재 commit의 구현으로 소급하지 않습니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:6b193d084e69:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:6b193d084e69:END -->

## 5. Invariant evolution

<!-- LEARNER-ANSWER:thread:05-design-and-classic-renderer-extraction.md:invariant:BEGIN -->
_어느 SHA에서 invariant가 도입·확장·제한·검증됐는지 기록합니다._
<!-- LEARNER-ANSWER:thread:05-design-and-classic-renderer-extraction.md:invariant:END -->

## 6. Failure → Fix → Test and ownership relations

<!-- LEARNER-ANSWER:thread:05-design-and-classic-renderer-extraction.md:relations:BEGIN -->
_실패·부족함·수정·검증과 owner 이동 관계를 연결합니다._
<!-- LEARNER-ANSWER:thread:05-design-and-classic-renderer-extraction.md:relations:END -->

## 7. Final architecture or execution flow

<!-- LEARNER-ANSWER:thread:05-design-and-classic-renderer-extraction.md:flow:BEGIN -->
_최종 flow를 코드 없이 설명합니다._
<!-- LEARNER-ANSWER:thread:05-design-and-classic-renderer-extraction.md:flow:END -->

## 8. Runtime and verification evidence

<!-- LEARNER-ANSWER:thread:05-design-and-classic-renderer-extraction.md:runtime:BEGIN -->
_실제로 실행한 command와 정적 inspection을 구분해 기록합니다._
<!-- LEARNER-ANSWER:thread:05-design-and-classic-renderer-extraction.md:runtime:END -->

## 9. Learning-completion checks

<!-- LEARNER-ANSWER:thread:05-design-and-classic-renderer-extraction.md:checks:BEGIN -->
_완료한 항목만 체크합니다._
<!-- LEARNER-ANSWER:thread:05-design-and-classic-renderer-extraction.md:checks:END -->
