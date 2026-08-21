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
- **직전 상태:** Design과 Classic은 사이트의 초기 renderer였기 때문에 App Router page와 shared component가 shell·derived props·markup을 직접 소유했습니다. dedicated 세 디자인과 달리 public single-entry module 경계가 없었습니다.
- **경계 판단:** route별 extraction과 최종 Design/Classic dispatcher만 포함합니다. 새로운 visual feature construction이나 cross-design registry unification은 각각 다른 category/Thread에 둡니다.
- **복원 기준:** 각 commit의 parent와 exact SHA tree만 사용하고 final HEAD를 이전 상태에 소급하지 않았습니다.
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
- **직전 상태:** 동작 자체는 앞선 구현에 존재했지만 **App page의 Design branch, `HomeRoute` route guard, `createDesignShellProps`, private `HomeView`**의 조립·조회·공개 책임이 App Router, raw content consumer 또는 여러 module에 분산돼 있었습니다.
- **변경:** App Router가 Design home의 shell/section composition을 직접 조립하던 책임을 renderer module로 넘긴다. page는 content/template/debug를 준비하고 route props만 전달하며 module이 route discriminator와 shell을 소유한다.
- **inspection:** `src/app/page.tsx, src/designs/design/home-route.tsx`의 App page의 Design branch, `HomeRoute` route guard, `createDesignShellProps`, private `HomeView`를 확인했습니다.
- **책임/경계:** 표현·조립 책임은 `src/app/page.tsx, src/designs/design/home-route.tsx` 쪽으로 이동하고, 이전 caller는 framework/context 준비 또는 public entry 호출만 남습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **다음 관계:** 후속 `05e1cebd0b70` dispatcher가 이 module을 단일 Design entry 아래 묶는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
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
- **직전 상태:** 동작 자체는 앞선 구현에 존재했지만 **App page의 derived pageCopy/metrics/groups 제거, renderer route guard와 shell/derived field consumption**의 조립·조회·공개 책임이 App Router, raw content consumer 또는 여러 module에 분산돼 있었습니다.
- **변경:** Projects page에서 shell·copy·featured/group/metric 조립을 제거하고 prepared projects view model 전체를 renderer에 넘긴다. renderer가 route guard와 Design shell을 소유하고 내부 view는 private가 된다.
- **inspection:** `src/app/projects/page.tsx, src/designs/design/projects-route.tsx`의 App page의 derived pageCopy/metrics/groups 제거, renderer route guard와 shell/derived field consumption를 확인했습니다.
- **책임/경계:** 표현·조립 책임은 `src/app/projects/page.tsx, src/designs/design/projects-route.tsx` 쪽으로 이동하고, 이전 caller는 framework/context 준비 또는 public entry 호출만 남습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
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
- **직전 상태:** 동작 자체는 앞선 구현에 존재했지만 **App page의 StructuredData/notFound 유지, renderer guard/shell/hero/body, helper private화**의 조립·조회·공개 책임이 App Router, raw content consumer 또는 여러 module에 분산돼 있었습니다.
- **변경:** framework metadata·notFound·structured data는 App page에 남기고 visual hero/body/shell은 Design module로 이동한다. route discriminator가 `project-detail`이 아니면 null을 반환하며 내부 section helper는 공개되지 않는다.
- **inspection:** `src/app/projects/[projectId]/page.tsx, src/designs/design/project-detail-route.tsx`의 App page의 StructuredData/notFound 유지, renderer guard/shell/hero/body, helper private화를 확인했습니다.
- **책임/경계:** 표현·조립 책임은 `src/app/projects/[projectId]/page.tsx, src/designs/design/project-detail-route.tsx` 쪽으로 이동하고, 이전 caller는 framework/context 준비 또는 public entry 호출만 남습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
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
- **직전 상태:** 동작 자체는 앞선 구현에 존재했지만 **App page의 Design branch, renderer shell, experience/curation completion, private curation helpers**의 조립·조회·공개 책임이 App Router, raw content consumer 또는 여러 module에 분산돼 있었습니다.
- **변경:** App page는 content load·page enablement·template dispatch만 남기고 About identity/skills/experience/feature-gated curation 조립을 module로 넘긴다. Curation helper도 module-private가 된다.
- **inspection:** `src/app/about/page.tsx, src/designs/design/about-route.tsx`의 App page의 Design branch, renderer shell, experience/curation completion, private curation helpers를 확인했습니다.
- **책임/경계:** 표현·조립 책임은 `src/app/about/page.tsx, src/designs/design/about-route.tsx` 쪽으로 이동하고, 이전 caller는 framework/context 준비 또는 public entry 호출만 남습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
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
- **직전 상태:** 동작 자체는 앞선 구현에 존재했지만 **App branch 제거, renderer shell, optional experience/education/notes**의 조립·조회·공개 책임이 App Router, raw content consumer 또는 여러 module에 분산돼 있었습니다.
- **변경:** prepared resume view model을 Design renderer가 받아 shell과 전체 section 순서를 소유한다. optional arrays는 길이가 있을 때만 section을 추가하고 App page는 presentation markup에서 벗어난다.
- **inspection:** `src/app/resume/page.tsx, src/designs/design/resume-route.tsx`의 App branch 제거, renderer shell, optional experience/education/notes를 확인했습니다.
- **책임/경계:** 표현·조립 책임은 `src/app/resume/page.tsx, src/designs/design/resume-route.tsx` 쪽으로 이동하고, 이전 caller는 framework/context 준비 또는 public entry 호출만 남습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
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
- **직전 상태:** 동작 자체는 앞선 구현에 존재했지만 **page availability/context resolution 이후 Design route entry 호출**의 조립·조회·공개 책임이 App Router, raw content consumer 또는 여러 module에 분산돼 있었습니다.
- **변경:** Contact App page는 enablement·content·template/debug를 준비한 뒤 renderer를 호출한다. availability/preferred links/notes와 shell composition은 Design module 책임이 된다.
- **inspection:** `src/app/contact/page.tsx, src/designs/design/contact-route.tsx`의 page availability/context resolution 이후 Design route entry 호출를 확인했습니다.
- **책임/경계:** 표현·조립 책임은 `src/app/contact/page.tsx, src/designs/design/contact-route.tsx` 쪽으로 이동하고, 이전 caller는 framework/context 준비 또는 public entry 호출만 남습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
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
- **직전 상태:** 동작 자체는 앞선 구현에 존재했지만 **`createJourneyViewModel`, renderer route guard/shell/timeline/current, private `MilestoneCard`**의 조립·조회·공개 책임이 App Router, raw content consumer 또는 여러 module에 분산돼 있었습니다.
- **변경:** App page가 raw content가 아니라 journey-specific view model을 명시적으로 만들고 renderer에 전달한다. milestone project resolution은 view model에, visual order와 shell은 module에 위치한다.
- **inspection:** `src/app/journey/page.tsx, src/designs/design/journey-route.tsx, src/lib/portfolio/view-models.ts`의 `createJourneyViewModel`, renderer route guard/shell/timeline/current, private `MilestoneCard`를 확인했습니다.
- **책임/경계:** 표현·조립 책임은 `src/app/journey/page.tsx, src/designs/design/journey-route.tsx, src/lib/portfolio/view-models.ts` 쪽으로 이동하고, 이전 caller는 framework/context 준비 또는 public entry 호출만 남습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
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
- **직전 상태:** 동작 자체는 앞선 구현에 존재했지만 **`createInterviewMapViewModel`, renderer route guard/shell/gaps, private `TrackSection`**의 조립·조회·공개 책임이 App Router, raw content consumer 또는 여러 module에 분산돼 있었습니다.
- **변경:** App page가 interview-specific projection을 만들고 Design module이 intro/track table/gaps/shell을 소유한다. answer-project resolution은 view model에 남고 TrackSection은 module-private다.
- **inspection:** `src/app/interview-map/page.tsx, src/designs/design/interview-map-route.tsx, src/lib/portfolio/view-models.ts`의 `createInterviewMapViewModel`, renderer route guard/shell/gaps, private `TrackSection`를 확인했습니다.
- **책임/경계:** 표현·조립 책임은 `src/app/interview-map/page.tsx, src/designs/design/interview-map-route.tsx, src/lib/portfolio/view-models.ts` 쪽으로 이동하고, 이전 caller는 framework/context 준비 또는 public entry 호출만 남습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
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
- **직전 상태:** 동작 자체는 앞선 구현에 존재했지만 **`DesignRoute` switch와 home/projects/project-detail/about/resume/contact/journey/interview imports**의 조립·조회·공개 책임이 App Router, raw content consumer 또는 여러 module에 분산돼 있었습니다.
- **구현 결정:** route별 module extraction이 끝난 뒤 `DesignRoute` 하나가 prepared discriminated props를 정확한 module로 전달한다. registry나 App Router는 개별 Design file 경로를 알 필요가 없고, route 추가 시 dispatcher union과 module 집합이 명시적으로 함께 바뀌어야 한다.
- **파일·symbol:** `src/designs/design/index.tsx`에서 `DesignRoute` switch와 home/projects/project-detail/about/resume/contact/journey/interview imports를 확인했습니다.
- **소유권:** 표현·조립 책임은 `src/designs/design/index.tsx` 쪽으로 이동하고, 이전 caller는 framework/context 준비 또는 public entry 호출만 남습니다.
- **보장/비보장:** 이 SHA는 `Design의 여덟 독립 module을 하나의 public dispatcher로 통합` 경계를 고정합니다. 각 module 내부 empty-state/visual correctness는 dispatcher가 검증하지 않는다.
- **역사적 연결:** Thread 1의 `380b2a025070`이 이 dispatcher를 registry의 Design loader로 호출한다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.

```tsx
// 05e1cebd0b70 · src/designs/design/index.tsx
export default function DesignRoute(props: DesignRouteProps) {
  switch (props.route) {
    case "home": return <HomeRoute {...props} />;
    // ... seven remaining routes
  }
}
```
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
- **직전 상태:** 동작 자체는 앞선 구현에 존재했지만 **App page의 Classic branch, route guard/shell, configured section order, Classic-only shared component 삭제/흡수**의 조립·조회·공개 책임이 App Router, raw content consumer 또는 여러 module에 분산돼 있었습니다.
- **변경:** Classic 전용 Home section들이 공용 component 폴더에 흩어진 상태를 module 안으로 흡수하고 원래 files를 삭제한다. App page는 prepared props를 넘기고 Classic module이 shell·section order·visual helper를 소유한다.
- **inspection:** `src/app/page.tsx, src/designs/classic/home-route.tsx, 삭제된 src/components/portfolio/home-*.tsx`의 App page의 Classic branch, route guard/shell, configured section order, Classic-only shared component 삭제/흡수를 확인했습니다.
- **책임/경계:** 표현·조립 책임은 `src/app/page.tsx, src/designs/classic/home-route.tsx, 삭제된 src/components/portfolio/home-*.tsx` 쪽으로 이동하고, 이전 caller는 framework/context 준비 또는 public entry 호출만 남습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
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
- **직전 상태:** 동작 자체는 앞선 구현에 존재했지만 **App page의 PageShell/metrics/groups 제거, renderer route guard/shell, prepared tuples**의 조립·조회·공개 책임이 App Router, raw content consumer 또는 여러 module에 분산돼 있었습니다.
- **변경:** App page에서 pageCopy·featured·grouped projects·metric 값을 해석하던 코드를 제거한다. Classic renderer가 prepared model과 shell을 소비하고 내부 view는 private가 된다.
- **inspection:** `src/app/projects/page.tsx, src/designs/classic/projects-route.tsx`의 App page의 PageShell/metrics/groups 제거, renderer route guard/shell, prepared tuples를 확인했습니다.
- **책임/경계:** 표현·조립 책임은 `src/app/projects/page.tsx, src/designs/classic/projects-route.tsx` 쪽으로 이동하고, 이전 caller는 framework/context 준비 또는 public entry 호출만 남습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
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
- **직전 상태:** 동작 자체는 앞선 구현에 존재했지만 **StructuredData는 page에 유지, renderer guard/shell/hero/body와 private section helpers**의 조립·조회·공개 책임이 App Router, raw content consumer 또는 여러 module에 분산돼 있었습니다.
- **변경:** App page는 structured data와 framework 경계를 유지하고 Classic module이 route discriminator, shell, project hero/body를 소유한다. visual helper는 외부 API에서 제거된다.
- **inspection:** `src/app/projects/[projectId]/page.tsx, src/designs/classic/project-detail-route.tsx`의 StructuredData는 page에 유지, renderer guard/shell/hero/body와 private section helpers를 확인했습니다.
- **책임/경계:** 표현·조립 책임은 `src/app/projects/[projectId]/page.tsx, src/designs/classic/project-detail-route.tsx` 쪽으로 이동하고, 이전 caller는 framework/context 준비 또는 public entry 호출만 남습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
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
- **직전 상태:** 동작 자체는 앞선 구현에 존재했지만 **App page에서 제거된 300여 line identity/principles/journey/skills/experience/curation markup, route module shell**의 조립·조회·공개 책임이 App Router, raw content consumer 또는 여러 module에 분산돼 있었습니다.
- **변경:** About page에 직접 있던 Classic 전체 presentation과 curation helper를 dedicated module로 옮긴다. App page는 Classic/Design 구현을 선택하고 동일 prepared props를 전달하는 얇은 adapter가 된다.
- **inspection:** `src/app/about/page.tsx, src/designs/classic/about-route.tsx`의 App page에서 제거된 300여 line identity/principles/journey/skills/experience/curation markup, route module shell를 확인했습니다.
- **책임/경계:** 표현·조립 책임은 `src/app/about/page.tsx, src/designs/classic/about-route.tsx` 쪽으로 이동하고, 이전 caller는 framework/context 준비 또는 public entry 호출만 남습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
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
- **직전 상태:** 동작 자체는 앞선 구현에 존재했지만 **App page에서 제거된 hero/summary/projects/training/experience/education/notes, module shell**의 조립·조회·공개 책임이 App Router, raw content consumer 또는 여러 module에 분산돼 있었습니다.
- **변경:** Resume의 200여 line presentation을 Classic module로 이동해 prepared resume model과 shell 조립을 한 owner에 둔다. App page는 enablement/context/template selection만 남긴다.
- **inspection:** `src/app/resume/page.tsx, src/designs/classic/resume-route.tsx`의 App page에서 제거된 hero/summary/projects/training/experience/education/notes, module shell를 확인했습니다.
- **책임/경계:** 표현·조립 책임은 `src/app/resume/page.tsx, src/designs/classic/resume-route.tsx` 쪽으로 이동하고, 이전 caller는 framework/context 준비 또는 public entry 호출만 남습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
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
- **직전 상태:** 동작 자체는 앞선 구현에 존재했지만 **App page의 hero/availability/preferred link/empty/notes 제거와 module route guard**의 조립·조회·공개 책임이 App Router, raw content consumer 또는 여러 module에 분산돼 있었습니다.
- **변경:** Classic Contact markup과 empty-contact-links branch를 module로 옮긴다. page는 Design/Classic route component를 선택하고 prepared props만 전달한다.
- **inspection:** `src/app/contact/page.tsx, src/designs/classic/contact-route.tsx`의 App page의 hero/availability/preferred link/empty/notes 제거와 module route guard를 확인했습니다.
- **책임/경계:** 표현·조립 책임은 `src/app/contact/page.tsx, src/designs/classic/contact-route.tsx` 쪽으로 이동하고, 이전 caller는 framework/context 준비 또는 public entry 호출만 남습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
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
- **직전 상태:** 동작 자체는 앞선 구현에 존재했지만 **App page의 raw milestone resolution 제거, `createJourneyViewModel`, module `MilestoneCard`**의 조립·조회·공개 책임이 App Router, raw content consumer 또는 여러 module에 분산돼 있었습니다.
- **변경:** Classic/Design 모두 같은 prepared journey model을 받도록 App page에서 projection을 한 번 만든다. Classic module은 shell·milestone/timeline/current presentation을 소유하고 raw project lookup을 하지 않는다.
- **inspection:** `src/app/journey/page.tsx, src/designs/classic/journey-route.tsx`의 App page의 raw milestone resolution 제거, `createJourneyViewModel`, module `MilestoneCard`를 확인했습니다.
- **책임/경계:** 표현·조립 책임은 `src/app/journey/page.tsx, src/designs/classic/journey-route.tsx` 쪽으로 이동하고, 이전 caller는 framework/context 준비 또는 public entry 호출만 남습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
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
- **직전 상태:** 동작 자체는 앞선 구현에 존재했지만 **App page의 project Map/table markup 제거, `createInterviewMapViewModel`, module `TrackSection`**의 조립·조회·공개 책임이 App Router, raw content consumer 또는 여러 module에 분산돼 있었습니다.
- **변경:** Classic/Design이 동일 interview projection을 소비하도록 하고 App page에서 200여 line table presentation과 project lookup을 제거한다. module은 shell과 semantic table/gaps를 소유한다.
- **inspection:** `src/app/interview-map/page.tsx, src/designs/classic/interview-map-route.tsx`의 App page의 project Map/table markup 제거, `createInterviewMapViewModel`, module `TrackSection`를 확인했습니다.
- **책임/경계:** 표현·조립 책임은 `src/app/interview-map/page.tsx, src/designs/classic/interview-map-route.tsx` 쪽으로 이동하고, 이전 caller는 framework/context 준비 또는 public entry 호출만 남습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
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
- **직전 상태:** 동작 자체는 앞선 구현에 존재했지만 **`ClassicRoute` exhaustive switch와 8 module imports**의 조립·조회·공개 책임이 App Router, raw content consumer 또는 여러 module에 분산돼 있었습니다.
- **구현 결정:** route-by-route extraction 후 `ClassicRoute`가 prepared discriminated props를 각 module로 전달한다. 외부 registry는 Classic 내부 file 구조를 알지 않고 single entry만 lazy-load할 수 있다.
- **파일·symbol:** `src/designs/classic/index.tsx`에서 `ClassicRoute` exhaustive switch와 8 module imports를 확인했습니다.
- **소유권:** 표현·조립 책임은 `src/designs/classic/index.tsx` 쪽으로 이동하고, 이전 caller는 framework/context 준비 또는 public entry 호출만 남습니다.
- **보장/비보장:** 이 SHA는 `Classic의 여덟 독립 route module을 하나의 public entry로 통합` 경계를 고정합니다. dispatcher는 module 반환값의 내용이나 runtime unknown string을 별도 검증하지 않는다.
- **역사적 연결:** Thread 1의 `380b2a025070`이 Design과 함께 registry path로 통일한다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.

```tsx
// 6b193d084e69 · src/designs/classic/index.tsx
export default function ClassicRoute(props: DesignRouteProps) {
  switch (props.route) {
    case "home": return <HomeRoute {...props} />;
    // ... seven remaining routes
  }
}
```
<!-- LEARNER-ANSWER:commit:6b193d084e69:END -->

## 5. Invariant evolution

<!-- LEARNER-ANSWER:thread:05-design-and-classic-renderer-extraction.md:invariant:BEGIN -->
최종 invariant는 App Router가 content/metadata/notFound/structured-data/view-model 생성만 소유하고, Design·Classic module이 route guard·shell·presentation·private helper를 소유하며, 외부는 각 `index.tsx` dispatcher 하나만 호출한다는 것입니다.

- 도입·확장·폐쇄의 순서는 commit map에 고정했습니다.
- B-level construction은 route/style surface를 단계적으로 넓히고, A/S-level commit은 owner·dispatch·검증 invariant를 바꿉니다.
<!-- LEARNER-ANSWER:thread:05-design-and-classic-renderer-extraction.md:invariant:END -->

## 6. Failure → Fix → Test and ownership relations

<!-- LEARNER-ANSWER:thread:05-design-and-classic-renderer-extraction.md:relations:BEGIN -->
Design은 route별 dedicated module을 연결한 뒤 `05e1cebd0b70`에서 dispatcher를 만들고, Classic은 page/shared components의 대규모 presentation을 이동한 뒤 `6b193d084e69`에서 동일 경계를 만듭니다. 이후 Thread 1의 `380b2a025070`이 둘을 registry path로 통일합니다.
<!-- LEARNER-ANSWER:thread:05-design-and-classic-renderer-extraction.md:relations:END -->

## 7. Final architecture or execution flow

<!-- LEARNER-ANSWER:thread:05-design-and-classic-renderer-extraction.md:flow:BEGIN -->
App Router page → route-specific view model/context → Design 또는 Classic dispatcher → dedicated route module → `createDesignShellProps` → design-owned body 순서입니다.

각 단계에서 optional/empty/missing reference가 처리되지 않는 경우도 보장으로 포장하지 않았으며, 해당 commit의 non-guarantee에 남겼습니다.
<!-- LEARNER-ANSWER:thread:05-design-and-classic-renderer-extraction.md:flow:END -->

## 8. Runtime and verification evidence

<!-- LEARNER-ANSWER:thread:05-design-and-classic-renderer-extraction.md:runtime:BEGIN -->
- **실행한 repository test/build:** 없음.
- **정적 확인:** 지정 branch의 commit classification, commit bodies, exact commit diff와 historical file 변경을 GitHub 연결을 통해 확인했습니다.
- **실행하지 못한 이유:** 작업 container에서 직접 clone 시 DNS가 `github.com`을 해석하지 못해 historical worktree를 만들 수 없었습니다. 따라서 Vitest, Playwright, Next build 결과를 성공으로 기록하지 않았습니다.
- **검증 수준:** code/test implementation의 존재와 범위는 inspection으로 확인했고, runtime pass/fail은 주장하지 않습니다.
<!-- LEARNER-ANSWER:thread:05-design-and-classic-renderer-extraction.md:runtime:END -->

## 9. Learning-completion checks

<!-- LEARNER-ANSWER:thread:05-design-and-classic-renderer-extraction.md:checks:BEGIN -->
- [x] 모든 고정 SHA·subject·importance·tags를 commit map과 commit section에서 동일하게 유지했습니다.
- [x] 각 SHA에 concrete file과 symbol/selector/route focus를 기록했습니다.
- [x] 이전 상태, owner, absence/fallback, guarantee/non-guarantee, 후속 관계를 채웠습니다.
- [x] S/A/B depth를 구분했습니다.
- [x] 실행하지 않은 test를 통과로 표시하지 않았습니다.
<!-- LEARNER-ANSWER:thread:05-design-and-classic-renderer-extraction.md:checks:END -->
