# Development Thread 05 — Page Availability and Auxiliary Route Lifecycle

## 0. Source and frozen audit scope

- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/portfolio`
- Category: `02-routing-navigation-and-page-lifecycle`
- Change range for directed inspection: `7fe913796acb^..50199be241c8`
- Classification source: `commit/commit-importance.md` on `web/portfolio`
- Historical rule: inspect every commit at its exact SHA; do not project later code backward.
- Phase 1 status: audited and frozen before learner-facing completion.
- Thread boundary: about/resume/contact/journey/interview-map 및 projects capability의 route-level enablement를 다룹니다. 각 페이지의 풍부한 화면 기능은 Category 04 범위입니다.
- Execution note: source inspection and runtime command evidence must be recorded separately.

### Phase 1 audit decisions

- 기존 project/auxiliary Thread에 중복 배치된 `50199...`를 단일 ownership Thread로 통합했습니다.
- route 생성 commit 중 availability lifecycle을 설명하는 최소 commit만 남기고 feature-section commit은 제외했습니다.

## 1. Learning goal and planned invariants

초기 항상-open 보조 route와 도입 시점부터 gated인 route의 비대칭을 확인하고, selector와 cross-route gate가 이를 하나의 page availability 정책으로 통합한 과정을 재구성합니다.

- page flag가 없거나 true이면 enabled이고 오직 explicit false만 disabled입니다.
- disabled route는 query parsing, renderer preparation, page-specific lookup 전에 `notFound()`로 종료됩니다.
- journey/interview-map은 도입 시부터 gated이며 기존 about/resume/contact/projects는 후속 commit에서 이관됩니다.
- project index와 detail은 동일한 `projects` capability를 공유합니다.
- route gate는 navigation discovery, sitemap, static params를 자동으로 변경하지 않습니다.

## 2. Questions to answer

- 왜 `!== false`가 default-open 정책입니까?
- selector 존재와 caller 적용 사이의 시간차가 어떤 비대칭을 만들었습니까?
- 도입 시 gated인 route와 retrofit된 route의 lifecycle 순서는 어떻게 다릅니까?
- `50199...`에서 gate가 가장 먼저 실행되는 것이 어떤 work를 방지합니까?
- route availability와 navigation/sitemap publication은 왜 별도 정책입니까?

## 3. Completion criteria

- 일곱 commit을 exact chronology로 설명합니다.
- 초기 route에 gate가 없었다는 사실을 final code로 덮지 않습니다.
- 각 page ID와 gate 위치를 구체적으로 적습니다.
- `50199...`이 하지 않은 작업을 명시합니다.
- runtime test 실행 여부와 source inspection을 구분합니다.

## 4. Fixed commit map

| # | Commit | Subject | Importance | Tags | Source-defined role |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `7fe913796acb` | feat(about): 프로필과 원칙 소개 추가 | B | RENDERER | Create the About route from profile and presentation content. |
| 2 | `e655951b0706` | feat(resume): 이력 소개와 요약 추가 | B | RENDERER | Create the Resume route with profile identity, presentation-owned hero copy, an optional download action, and structured summary paragraphs. |
| 3 | `bfcdf44eb34c` | feat(contact): 연락 페이지 소개 추가 | B | RENDERER | Create the Contact route with profile identity and contact-owned title and introductory text. |
| 4 | `3e2e95a3a28c` | feat(content): 페이지 활성화 selector 추가 | B | CONTENT, ROUTING | Add a typed selector for the site's optional page flags. |
| 5 | `0facaf123f29` | feat(journey): 여정 route 소개 추가 | B | ROUTING, RENDERER | Introduce the journey narrative as an optional route using the portfolio's standard page lifecycle. |
| 6 | `ddba753f7f51` | feat(interview-map): 근거 route 소개 추가 | B | ROUTING, RENDERER | Introduce the interview-evidence map as an optional, independently addressable route. |
| 7 | `50199be241c8` | feat(routes): 비활성 페이지 route 차단 | A | ARCH, ROUTING | Enforce page-enablement settings at the route boundary for about, contact, projects, project details, and resume. |

The commit SHA, order, subject, importance, tags, and source-defined role in this map are frozen.

## 5. Commit-by-commit reconstruction

### 1. `7fe913796acb` — feat(about): 프로필과 원칙 소개 추가

- Importance: **B**
- Tags: `RENDERER`
- Fixed role: Create the About route from profile and presentation content.

#### Historical inspection tasks

- `src/app/about/page.tsx`의 content load, query resolution, shell currentPath `/about`, profile/principles rendering을 확인합니다.
- 이 SHA에는 page enablement 검사와 `notFound()`가 없어 직접 접근이 항상 렌더링되는지 확인합니다.
- 이 commit에서는 route lifecycle만 다루고 후속 About feature sections는 다른 카테고리임을 구분합니다.

#### Reconstruction result

> **학습자 작성란:** [[LEARNER:commit:7fe913796acb]]

### 2. `e655951b0706` — feat(resume): 이력 소개와 요약 추가

- Importance: **B**
- Tags: `RENDERER`
- Fixed role: Create the Resume route with profile identity, presentation-owned hero copy, an optional download action, and structured summary paragraphs.

#### Historical inspection tasks

- `src/app/resume/page.tsx`의 표준 query/shell lifecycle과 `/resume` currentPath를 확인합니다.
- `downloadUrl`이 truthy일 때만 anchor를 렌더링하는 분기를 적습니다.
- 이 SHA에는 page enablement gate가 없다는 이전 상태를 확인합니다.

#### Reconstruction result

> **학습자 작성란:** [[LEARNER:commit:e655951b0706]]

### 3. `bfcdf44eb34c` — feat(contact): 연락 페이지 소개 추가

- Importance: **B**
- Tags: `RENDERER`
- Fixed role: Create the Contact route with profile identity and contact-owned title and introductory text.

#### Historical inspection tasks

- `src/app/contact/page.tsx`의 표준 query/shell lifecycle과 `/contact` currentPath를 확인합니다.
- content source hint와 profile/contact source ownership을 구분합니다.
- 이 SHA에는 page enablement gate가 없다는 이전 상태를 확인합니다.

#### Reconstruction result

> **학습자 작성란:** [[LEARNER:commit:bfcdf44eb34c]]

### 4. `3e2e95a3a28c` — feat(content): 페이지 활성화 selector 추가

- Importance: **B**
- Tags: `CONTENT, ROUTING`
- Fixed role: Add a typed selector for the site's optional page flags.

#### Historical inspection tasks

- `src/lib/portfolio/selectors.ts`와 facade export에서 `isSitePageEnabled`가 추가되는지 확인합니다.
- `content.site.pages?.[pageId] !== false`의 default-open 의미를 truth table로 적습니다.
- selector 추가만으로 기존 route가 차단되는 것은 아니라는 caller ownership 경계를 확인합니다.

#### Reconstruction result

> **학습자 작성란:** [[LEARNER:commit:3e2e95a3a28c]]

### 5. `0facaf123f29` — feat(journey): 여정 route 소개 추가

- Importance: **B**
- Tags: `ROUTING, RENDERER`
- Fixed role: Introduce the journey narrative as an optional route using the portfolio's standard page lifecycle.

#### Historical inspection tasks

- `JourneyPage`가 content를 읽은 직후 `isSitePageEnabled("journey", content)`를 검사하고 실패 시 `notFound()`를 호출하는 순서를 확인합니다.
- gate가 search params 처리와 renderer 준비보다 먼저 실행되는지 확인합니다.
- 이 route는 도입 시점부터 fail-closed였다는 점을 이전 About/Resume/Contact와 비교합니다.

#### Reconstruction result

> **학습자 작성란:** [[LEARNER:commit:0facaf123f29]]

### 6. `ddba753f7f51` — feat(interview-map): 근거 route 소개 추가

- Importance: **B**
- Tags: `ROUTING, RENDERER`
- Fixed role: Introduce the interview-evidence map as an optional, independently addressable route.

#### Historical inspection tasks

- `InterviewMapPage`의 `interviewMap` page ID와 gate 위치를 확인합니다.
- gate 통과 후 query/shell/data 준비가 이어지는 순서를 적습니다.
- 외부 reference link와 page body 기능이 아니라 route availability lifecycle에 초점을 맞춥니다.

#### Reconstruction result

> **학습자 작성란:** [[LEARNER:commit:ddba753f7f51]]

### 7. `50199be241c8` — feat(routes): 비활성 페이지 route 차단

- Importance: **A**
- Tags: `ARCH, ROUTING`
- Fixed role: Enforce page-enablement settings at the route boundary for about, contact, projects, project details, and resume.

#### Historical inspection tasks

- `about`, `contact`, `projects`, `projects/[projectId]`, `resume`의 각 route에서 content load 직후 어떤 page ID로 gate가 추가되는지 표로 정리합니다.
- project index와 detail이 동일한 `projects` capability를 공유하며 detail은 params/query/project lookup보다 먼저 차단되는지 확인합니다.
- Journey/Interview에는 변경이 없는 이유가 이미 도입 시 gate를 가진 상태인지 이전 SHA와 비교합니다.
- 이 commit이 navigation 항목 제거, sitemap 정책, `generateStaticParams` filtering까지 수행하는지 여부를 diff로 구분합니다.
- 이전 비대칭 → 실제 risk → 공통 route-boundary invariant로의 correction을 재구성합니다.

#### Reconstruction result

> **학습자 작성란:** [[LEARNER:commit:50199be241c8]]

## 6. Invariant evolution

Record where each invariant was introduced, extended, shown insufficient, corrected, and verified.

> **학습자 작성란:** [[LEARNER:thread:5:invariants]]

## 7. Failure → Fix → Test relationships

Connect fixes and tests to the exact earlier assumption or implementation they correct or verify.

> **학습자 작성란:** [[LEARNER:thread:5:relations]]

## 8. Ownership, state, and responsibility changes

Track caller/callee ownership, browser/framework state, resource lifetime, and boundaries that deliberately remain outside the Thread.

> **학습자 작성란:** [[LEARNER:thread:5:ownership]]

## 9. Final Thread state

> **학습자 작성란:** [[LEARNER:thread:5:final]]

## 10. Final architecture or execution flow

> **학습자 작성란:** [[LEARNER:thread:5:flow]]

## 11. Learning-completion checks

> **학습자 작성란:** [[LEARNER:thread:5:checks]]
