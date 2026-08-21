# Thread: Cinematic design system construction

> Project: 42 Archive Portfolio (`web/portfolio`)
>
> Category: `05-full-site-visual-systems`
>
> Phase 1 audit에서 확정한 authoritative scaffold입니다. Phase 2에서는 answer marker 내부만 채웁니다.

## 0. Scope and authority

- Commit SHA, subject, importance, tags는 branch의 `commit/commit-importance.md`와 exact commit metadata를 기준으로 고정했습니다.
- **Thread boundary:** Cinematic CSS module과 route module construction을 포함합니다. registry activation/API 연결은 Thread 1에 둡니다.
- 다른 branch, final HEAD의 후대 구현, 실행하지 않은 command 결과를 사용하지 않습니다.

## 1. Thread goal

Cinematic의 암실 palette와 image-led chapter grammar, shared frame/media, full-site route composition과 reference/empty-state 경계를 복원합니다.

### Frozen invariant target

최종 invariant는 route가 공통 `Frame`과 `Media` boundary를 사용하고 internal link가 선택 상태를 보존하며, route별 content join과 absence는 명시적으로 처리하되 각 route가 보장하지 않는 empty/reference 상태도 그대로 남긴다는 것입니다.

## 2. Commit map

| 순서 | Commit | Subject | Importance | Tags | 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `74a27c95eb1c` | style(cinematic): 암실 palette와 shell 기초 구성 | B | ROUTING, RENDERER | Cinematic 시각 계약의 dark scoped tokens·selection/focus/skip-link·sticky glass header |
| 2 | `197c0781f1b9` | feat(cinematic): 링크와 chapter 표기 프리미티브 추가 | B | RENDERER | navigation primitives |
| 3 | `3b72294a0fd7` | style(cinematic): 모바일 탐색과 hero 매체 구성 | B | ROUTING, RENDERER | Cinematic 시각 계약의 native mobile disclosure와 image-led hero |
| 4 | `e2dbb1b7c7d0` | feat(cinematic): 공용 frame과 media 추가 | B | RENDERER | shared full-site frame |
| 5 | `22c4593809bf` | feat(cinematic): 프로젝트 chapter 추가 | B | RENDERER | reusable project chapter |
| 6 | `bb7a742122fd` | style(cinematic): chapter와 archive 지면 구성 | B | RENDERER | Cinematic 시각 계약의 long-form chapter/archive/sticky copy/media hover/dual panel |
| 7 | `29430d7dfe67` | feat(cinematic-home): 소개와 대표 프로젝트 구성 | B | RENDERER | Home route |
| 8 | `f417e3e70b1f` | feat(cinematic-projects): 프로젝트 archive 구성 | B | RENDERER | Projects archive |
| 9 | `1f4c35853502` | style(cinematic): 상세와 이력 grid 구성 | B | RENDERER | Cinematic 시각 계약의 project evidence·profile essays·resume grid |
| 10 | `2e9f70067daf` | feat(cinematic-project): 상세 hero와 매체 구성 | B | RENDERER | Project detail boundary |
| 11 | `2f404402a2ea` | feat(cinematic-project): 상세 서사와 gallery 구성 | B | RENDERER | Project detail completion |
| 12 | `95ee01decc8f` | style(cinematic): 프로필과 콘텐츠 section 구성 | B | CONTENT, RENDERER | Cinematic 시각 계약의 profile facts·long-form sections·chronology·evidence/contact/gaps |
| 13 | `4eefc512d05c` | feat(cinematic-about): 프로필과 경력 소개 구성 | B | RENDERER | About route |
| 14 | `ee692d893a11` | feat(cinematic-about): 큐레이션 archive 구성 | B | CONTENT, RENDERER | feature-gated curation |
| 15 | `52f13fcc5a12` | style(cinematic): 여정 timeline과 답변 근거 구성 | B | RENDERER | Cinematic 시각 계약의 milestone/timeline/current-position/interview evidence grammar |
| 16 | `7cc23349f59f` | feat(cinematic): 이력과 연락 route 구성 | B | ROUTING, RENDERER | Resume and Contact |
| 17 | `c3aba5da6a10` | style(cinematic): 인터뷰 근거와 반응형 동작 구성 | B | RENDERER | Cinematic 시각 계약의 Interview evidence completion·980/640 reflow·reduced motion |
| 18 | `bddb3cc18eed` | feat(cinematic-journey): 여정 archive 구성 | B | RENDERER | Journey route |
| 19 | `2a0f0aadee1c` | feat(cinematic-interview): 인터뷰 근거 map 구성 | B | RENDERER | Interview route |

## 3. Historical baseline

<!-- LEARNER-ANSWER:thread:04-cinematic-design-system-construction.md:baseline:BEGIN -->
_첫 commit 직전의 실제 owner와 부족함을 기록합니다._
<!-- LEARNER-ANSWER:thread:04-cinematic-design-system-construction.md:baseline:END -->

## 4. Commit-by-commit reconstruction

### 1. `74a27c95eb1c` — style(cinematic): 암실 palette와 shell 기초 구성

- **Importance:** B
- **Tags:** ROUTING, RENDERER
- **Thread role:** Cinematic 시각 계약의 dark scoped tokens·selection/focus/skip-link·sticky glass header

#### Commit-specific investigation

- `74a27c95eb1c^`와 `74a27c95eb1c`를 비교하고 `src/designs/cinematic/cinematic.module.css`에서 **parent diff에서 dark scoped tokens·selection/focus/skip-link·sticky glass header에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Cinematic 시각 계약의 dark scoped tokens·selection/focus/skip-link·sticky glass header` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:74a27c95eb1c:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:74a27c95eb1c:END -->

### 2. `197c0781f1b9` — feat(cinematic): 링크와 chapter 표기 프리미티브 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** navigation primitives

#### Commit-specific investigation

- `197c0781f1b9^`와 `197c0781f1b9`를 비교하고 `src/designs/cinematic/cinematic-route.tsx`에서 **`routeHref`, `isCurrentNavigation`, `CinematicLink`, `ChapterLabel`**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `navigation primitives` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:197c0781f1b9:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:197c0781f1b9:END -->

### 3. `3b72294a0fd7` — style(cinematic): 모바일 탐색과 hero 매체 구성

- **Importance:** B
- **Tags:** ROUTING, RENDERER
- **Thread role:** Cinematic 시각 계약의 native mobile disclosure와 image-led hero

#### Commit-specific investigation

- `3b72294a0fd7^`와 `3b72294a0fd7`를 비교하고 `src/designs/cinematic/cinematic.module.css`에서 **parent diff에서 native mobile disclosure와 image-led hero에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Cinematic 시각 계약의 native mobile disclosure와 image-led hero` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:3b72294a0fd7:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:3b72294a0fd7:END -->

### 4. `e2dbb1b7c7d0` — feat(cinematic): 공용 frame과 media 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** shared full-site frame

#### Commit-specific investigation

- `e2dbb1b7c7d0^`와 `e2dbb1b7c7d0`를 비교하고 `src/designs/cinematic/cinematic-route.tsx`에서 **`Frame`, `Media`, canonical nav/footer, root/main shell**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `shared full-site frame` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.
- 후속 관계: 후속 route view들이 `Frame` 안에 body만 제공한다.

#### Learning record

<!-- LEARNER-ANSWER:commit:e2dbb1b7c7d0:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:e2dbb1b7c7d0:END -->

### 5. `22c4593809bf` — feat(cinematic): 프로젝트 chapter 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** reusable project chapter

#### Commit-specific investigation

- `22c4593809bf^`와 `22c4593809bf`를 비교하고 `src/designs/cinematic/cinematic-route.tsx`에서 **`ProjectChapter`, sticky evidence copy, media link, accessible aria-label**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `reusable project chapter` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:22c4593809bf:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:22c4593809bf:END -->

### 6. `bb7a742122fd` — style(cinematic): chapter와 archive 지면 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Cinematic 시각 계약의 long-form chapter/archive/sticky copy/media hover/dual panel

#### Commit-specific investigation

- `bb7a742122fd^`와 `bb7a742122fd`를 비교하고 `src/designs/cinematic/cinematic.module.css`에서 **parent diff에서 long-form chapter/archive/sticky copy/media hover/dual panel에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Cinematic 시각 계약의 long-form chapter/archive/sticky copy/media hover/dual panel` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:bb7a742122fd:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:bb7a742122fd:END -->

### 7. `29430d7dfe67` — feat(cinematic-home): 소개와 대표 프로젝트 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Home route

#### Commit-specific investigation

- `29430d7dfe67^`와 `29430d7dfe67`를 비교하고 `src/designs/cinematic/cinematic-route.tsx`에서 **`HomeView`, presentation section order, featured→all fallback, `slice(0, 4)`**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Home route` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:29430d7dfe67:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:29430d7dfe67:END -->

### 8. `f417e3e70b1f` — feat(cinematic-projects): 프로젝트 archive 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Projects archive

#### Commit-specific investigation

- `f417e3e70b1f^`와 `f417e3e70b1f`를 비교하고 `src/designs/cinematic/cinematic-route.tsx`에서 **`ProjectsView`, all projects as `ProjectChapter`, padded count**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Projects archive` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `빈 project archive는 단순 빈 목록이 되며 명시적 recovery copy를 보장하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:f417e3e70b1f:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:f417e3e70b1f:END -->

### 9. `1f4c35853502` — style(cinematic): 상세와 이력 grid 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Cinematic 시각 계약의 project evidence·profile essays·resume grid

#### Commit-specific investigation

- `1f4c35853502^`와 `1f4c35853502`를 비교하고 `src/designs/cinematic/cinematic.module.css`에서 **parent diff에서 project evidence·profile essays·resume grid에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Cinematic 시각 계약의 project evidence·profile essays·resume grid` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:1f4c35853502:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:1f4c35853502:END -->

### 10. `2e9f70067daf` — feat(cinematic-project): 상세 hero와 매체 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Project detail boundary

#### Commit-specific investigation

- `2e9f70067daf^`와 `2e9f70067daf`를 비교하고 `src/designs/cinematic/cinematic-route.tsx`에서 **`ProjectDetailView`, unresolved guard, archive back link, facts, hero media**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Project detail boundary` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.
- 후속 관계: `2f404402a2ea`가 full narrative와 galleries를 추가한다.

#### Learning record

<!-- LEARNER-ANSWER:commit:2e9f70067daf:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:2e9f70067daf:END -->

### 11. `2f404402a2ea` — feat(cinematic-project): 상세 서사와 gallery 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Project detail completion

#### Commit-specific investigation

- `2f404402a2ea^`와 `2f404402a2ea`를 비교하고 `src/designs/cinematic/cinematic-route.tsx`에서 **optional narrative/evidence arrays, resolved stack fallback, detail links, hero screenshot de-duplication**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Project detail completion` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:2f404402a2ea:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:2f404402a2ea:END -->

### 12. `95ee01decc8f` — style(cinematic): 프로필과 콘텐츠 section 구성

- **Importance:** B
- **Tags:** CONTENT, RENDERER
- **Thread role:** Cinematic 시각 계약의 profile facts·long-form sections·chronology·evidence/contact/gaps

#### Commit-specific investigation

- `95ee01decc8f^`와 `95ee01decc8f`를 비교하고 `src/designs/cinematic/cinematic.module.css`에서 **parent diff에서 profile facts·long-form sections·chronology·evidence/contact/gaps에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Cinematic 시각 계약의 profile facts·long-form sections·chronology·evidence/contact/gaps` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:95ee01decc8f:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:95ee01decc8f:END -->

### 13. `4eefc512d05c` — feat(cinematic-about): 프로필과 경력 소개 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** About route

#### Commit-specific investigation

- `4eefc512d05c^`와 `4eefc512d05c`를 비교하고 `src/designs/cinematic/cinematic-route.tsx`에서 **`AboutView`, optional profile photo, facts, principles, skills/groups, experience**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `About route` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:4eefc512d05c:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:4eefc512d05c:END -->

### 14. `ee692d893a11` — feat(cinematic-about): 큐레이션 archive 구성

- **Importance:** B
- **Tags:** CONTENT, RENDERER
- **Thread role:** feature-gated curation

#### Commit-specific investigation

- `ee692d893a11^`와 `ee692d893a11`를 비교하고 `src/designs/cinematic/cinematic-route.tsx`에서 **`isSitePageEnabled`, category projectIds resolution/filter, omissions/nextReview**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `feature-gated curation` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:ee692d893a11:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:ee692d893a11:END -->

### 15. `52f13fcc5a12` — style(cinematic): 여정 timeline과 답변 근거 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Cinematic 시각 계약의 milestone/timeline/current-position/interview evidence grammar

#### Commit-specific investigation

- `52f13fcc5a12^`와 `52f13fcc5a12`를 비교하고 `src/designs/cinematic/cinematic.module.css`에서 **parent diff에서 milestone/timeline/current-position/interview evidence grammar에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Cinematic 시각 계약의 milestone/timeline/current-position/interview evidence grammar` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:52f13fcc5a12:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:52f13fcc5a12:END -->

### 16. `7cc23349f59f` — feat(cinematic): 이력과 연락 route 구성

- **Importance:** B
- **Tags:** ROUTING, RENDERER
- **Thread role:** Resume and Contact

#### Commit-specific investigation

- `7cc23349f59f^`와 `7cc23349f59f`를 비교하고 `src/designs/cinematic/cinematic-route.tsx`에서 **resume selected-project ID resolution/filter, optional download, contact preferred→placement fallback, empty channels**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Resume and Contact` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `Resume의 모든 선택 배열이 빈 경우 각각 별도 empty-state를 제공하는 것은 아니며 notes에만 명시적 fallback이 있다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:7cc23349f59f:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:7cc23349f59f:END -->

### 17. `c3aba5da6a10` — style(cinematic): 인터뷰 근거와 반응형 동작 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Cinematic 시각 계약의 Interview evidence completion·980/640 reflow·reduced motion

#### Commit-specific investigation

- `c3aba5da6a10^`와 `c3aba5da6a10`를 비교하고 `src/designs/cinematic/cinematic.module.css`에서 **parent diff에서 Interview evidence completion·980/640 reflow·reduced motion에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Cinematic 시각 계약의 Interview evidence completion·980/640 reflow·reduced motion` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `reduced-motion·focus·semantic 보조는 CSS/DOM 계약의 일부만 다루며, 실제 WCAG 적합성이나 모든 보조기기 동작을 단독으로 보장하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:c3aba5da6a10:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:c3aba5da6a10:END -->

### 18. `bddb3cc18eed` — feat(cinematic-journey): 여정 archive 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Journey route

#### Commit-specific investigation

- `bddb3cc18eed^`와 `bddb3cc18eed`를 비교하고 `src/designs/cinematic/cinematic-route.tsx`에서 **milestone anchor project resolution/filter, dated archive, direct `item.projectId` URL, current position**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Journey route` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `archive `projectId`가 canonical project에 존재한다는 보장은 이 renderer에서 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:bddb3cc18eed:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:bddb3cc18eed:END -->

### 19. `2a0f0aadee1c` — feat(cinematic-interview): 인터뷰 근거 map 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Interview route

#### Commit-specific investigation

- `2a0f0aadee1c^`와 `2a0f0aadee1c`를 비교하고 `src/designs/cinematic/cinematic-route.tsx`에서 **`projectsById` Map, external reference, track/question answers, missing/empty evidence, gaps**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Interview route` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.
- 후속 관계: Thread 1의 `b8de57f130eb`가 완성된 route entry를 registry에 활성화한다.

#### Learning record

<!-- LEARNER-ANSWER:commit:2a0f0aadee1c:BEGIN -->
_해당 SHA의 parent diff와 resulting tree를 확인한 뒤 작성합니다._
<!-- LEARNER-ANSWER:commit:2a0f0aadee1c:END -->

## 5. Invariant evolution

<!-- LEARNER-ANSWER:thread:04-cinematic-design-system-construction.md:invariant:BEGIN -->
_어느 SHA에서 invariant가 도입·확장·제한·검증됐는지 기록합니다._
<!-- LEARNER-ANSWER:thread:04-cinematic-design-system-construction.md:invariant:END -->

## 6. Failure → Fix → Test and ownership relations

<!-- LEARNER-ANSWER:thread:04-cinematic-design-system-construction.md:relations:BEGIN -->
_실패·부족함·수정·검증과 owner 이동 관계를 연결합니다._
<!-- LEARNER-ANSWER:thread:04-cinematic-design-system-construction.md:relations:END -->

## 7. Final architecture or execution flow

<!-- LEARNER-ANSWER:thread:04-cinematic-design-system-construction.md:flow:BEGIN -->
_최종 flow를 코드 없이 설명합니다._
<!-- LEARNER-ANSWER:thread:04-cinematic-design-system-construction.md:flow:END -->

## 8. Runtime and verification evidence

<!-- LEARNER-ANSWER:thread:04-cinematic-design-system-construction.md:runtime:BEGIN -->
_실제로 실행한 command와 정적 inspection을 구분해 기록합니다._
<!-- LEARNER-ANSWER:thread:04-cinematic-design-system-construction.md:runtime:END -->

## 9. Learning-completion checks

<!-- LEARNER-ANSWER:thread:04-cinematic-design-system-construction.md:checks:BEGIN -->
_완료한 항목만 체크합니다._
<!-- LEARNER-ANSWER:thread:04-cinematic-design-system-construction.md:checks:END -->
