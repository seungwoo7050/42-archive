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

`src/app/about/page.tsx`가 처음 생기며 content를 읽고 optional `searchParams`를 await해 active template과 debug mode를 계산합니다. `PageShell`에는 current path `/about`과 같은 template/debug state가 전달되고, body는 profile identity와 presentation-owned principles를 렌더링합니다.

중요한 이전 상태는 page availability 검사 부재입니다. 이 SHA의 function에는 `isSitePageEnabled("about", ...)`나 `notFound()`가 없습니다. 따라서 content configuration에 page flag 개념이 나중에 생기더라도 이 시점의 About 직접 요청은 route 자체에서 차단되지 않습니다.

후속 profile photo, skills, experience, curation section은 page feature construction이며 이 Thread의 route lifecycle 핵심에서 제외했습니다.

### 2. `e655951b0706` — feat(resume): 이력 소개와 요약 추가

- Importance: **B**
- Tags: `RENDERER`
- Fixed role: Create the Resume route with profile identity, presentation-owned hero copy, an optional download action, and structured summary paragraphs.

#### Historical inspection tasks

- `src/app/resume/page.tsx`의 표준 query/shell lifecycle과 `/resume` currentPath를 확인합니다.
- `downloadUrl`이 truthy일 때만 anchor를 렌더링하는 분기를 적습니다.
- 이 SHA에는 page enablement gate가 없다는 이전 상태를 확인합니다.

#### Reconstruction result

Resume route도 초기 표준 lifecycle을 따릅니다. content를 읽고 `view`/`debug`를 해석한 뒤 `/resume` current path를 가진 `PageShell` 안에 identity, hero copy, structured summary를 렌더링합니다. `content.resume.downloadUrl`이 존재할 때만 download anchor를 표시하므로 optional content branch는 명시적입니다.

그러나 page capability 검사는 없습니다. 이 시점에는 navigation 노출 여부와 직접 URL 접근을 route에서 통제하는 공통 selector가 적용되지 않았습니다. 따라서 “later config에서 disabled이면 404”라는 final behavior를 이 commit에 적용하면 chronology 오류입니다.

### 3. `bfcdf44eb34c` — feat(contact): 연락 페이지 소개 추가

- Importance: **B**
- Tags: `RENDERER`
- Fixed role: Create the Contact route with profile identity and contact-owned title and introductory text.

#### Historical inspection tasks

- `src/app/contact/page.tsx`의 표준 query/shell lifecycle과 `/contact` currentPath를 확인합니다.
- content source hint와 profile/contact source ownership을 구분합니다.
- 이 SHA에는 page enablement gate가 없다는 이전 상태를 확인합니다.

#### Reconstruction result

Contact route는 content aggregate에서 profile과 `contact` source를 읽고 query-state-aware `PageShell`을 구성합니다. current path는 `/contact`이며 intro 단계에서는 title과 introductory text가 중심입니다. `ContentHint`는 source location을 사용자에게 노출할 수 있지만 route availability를 결정하지 않습니다.

About/Resume와 동일하게 `isSitePageEnabled`와 `notFound()`가 없습니다. 그러므로 세 early auxiliary route는 route creation 시점에 default-open이 아니라 사실상 unconditional-open이었습니다. 후속 selector 및 gate가 이 상태를 정규화합니다.

### 4. `3e2e95a3a28c` — feat(content): 페이지 활성화 selector 추가

- Importance: **B**
- Tags: `CONTENT, ROUTING`
- Fixed role: Add a typed selector for the site's optional page flags.

#### Historical inspection tasks

- `src/lib/portfolio/selectors.ts`와 facade export에서 `isSitePageEnabled`가 추가되는지 확인합니다.
- `content.site.pages?.[pageId] !== false`의 default-open 의미를 truth table로 적습니다.
- selector 추가만으로 기존 route가 차단되는 것은 아니라는 caller ownership 경계를 확인합니다.

#### Reconstruction result

`src/lib/portfolio/selectors.ts`와 public facade에 다음 typed selector가 추가됩니다.

```ts
export function isSitePageEnabled(
  pageId: SitePageId,
  content: PortfolioContent = getPortfolioContent(),
) {
  return content.site.pages?.[pageId] !== false;
}
```

truth table은 명확합니다.

| `site.pages`/값 | 결과 |
| --- | --- |
| `pages` 없음 | enabled |
| 해당 key 없음 | enabled |
| `true` | enabled |
| `false` | disabled |

정책은 fail-closed가 아니라 **explicit-disable, default-open**입니다. optional starter content에서 flag가 누락되어도 기존 route를 깨지 않기 위한 호환 정책입니다.

이 commit은 selector만 추가합니다. existing About/Resume/Contact/Projects callers를 수정하지 않으므로 selector 존재가 곧 enforcement를 의미하지 않습니다. route가 직접 호출해야만 policy가 실행됩니다. 이 caller gap이 후속 비대칭의 핵심입니다.

### 5. `0facaf123f29` — feat(journey): 여정 route 소개 추가

- Importance: **B**
- Tags: `ROUTING, RENDERER`
- Fixed role: Introduce the journey narrative as an optional route using the portfolio's standard page lifecycle.

#### Historical inspection tasks

- `JourneyPage`가 content를 읽은 직후 `isSitePageEnabled("journey", content)`를 검사하고 실패 시 `notFound()`를 호출하는 순서를 확인합니다.
- gate가 search params 처리와 renderer 준비보다 먼저 실행되는지 확인합니다.
- 이 route는 도입 시점부터 fail-closed였다는 점을 이전 About/Resume/Contact와 비교합니다.

#### Reconstruction result

Journey route는 도입 순간부터 availability-aware입니다. function은 content를 읽은 직후 다음 순서로 실행됩니다.

1. `isSitePageEnabled("journey", content)` 확인
2. false이면 `notFound()` 호출
3. gate 통과 후에만 search params await
4. template/debug 계산
5. journey presentation/narrative 준비
6. shell과 body 렌더링

따라서 disabled Journey 요청은 query parsing이나 renderer/data 준비를 하지 않습니다. 이 lifecycle은 earlier About/Resume/Contact와 다릅니다. selector가 이미 존재하는 시점에 route가 추가되어 처음부터 caller contract를 따랐기 때문입니다.

### 6. `ddba753f7f51` — feat(interview-map): 근거 route 소개 추가

- Importance: **B**
- Tags: `ROUTING, RENDERER`
- Fixed role: Introduce the interview-evidence map as an optional, independently addressable route.

#### Historical inspection tasks

- `InterviewMapPage`의 `interviewMap` page ID와 gate 위치를 확인합니다.
- gate 통과 후 query/shell/data 준비가 이어지는 순서를 적습니다.
- 외부 reference link와 page body 기능이 아니라 route availability lifecycle에 초점을 맞춥니다.

#### Reconstruction result

Interview Map route도 동일한 도입 패턴을 사용합니다. content load 직후 `isSitePageEnabled("interviewMap", content)`를 검사하고 false이면 `notFound()`로 종료합니다. 그 뒤에만 query state, presentation copy, interview data, shell props를 준비합니다.

page ID가 URL segment 문자열 `interview-map`이 아니라 typed content key `interviewMap`이라는 점이 중요합니다. route path와 content capability key의 mapping은 caller가 명시적으로 소유합니다.

외부 reference repository link와 track feature는 route body 기능입니다. 이 Thread에서 중요한 사실은 route가 최초 commit부터 disabled capability를 직접 접근할 수 없게 했다는 것입니다.

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

**이전 비대칭**

- Journey/Interview Map: 도입 시점부터 gate 존재
- About/Resume/Contact/Projects index/detail: 이미 존재하지만 selector를 호출하지 않음

따라서 같은 `site.pages` configuration이 route마다 다르게 적용될 수 있었습니다. navigation에서 숨겼더라도 사용자가 URL을 직접 입력하면 old routes가 렌더링될 위험이 있었습니다.

**cross-route correction**

각 page는 content load 직후 다음 gate를 받습니다.

| Route | capability key |
| --- | --- |
| `/about` | `about` |
| `/contact` | `contact` |
| `/projects` | `projects` |
| `/projects/[projectId]` | `projects` |
| `/resume` | `resume` |

project detail의 gate는 `params` await, query parsing, project lookup보다 먼저입니다. disabled projects capability에서는 존재 여부를 조사하거나 renderer context를 만들지 않고 바로 not-found lifecycle로 전환합니다. index와 detail이 한 capability를 공유하므로 list만 막고 deep link를 남기는 불일치도 제거됩니다.

Journey/Interview files에는 diff가 없습니다. 이미 같은 invariant를 만족했기 때문입니다.

**보장**

- explicit false인 page의 direct route request는 route boundary에서 `notFound()`를 호출합니다.
- gate가 expensive/irrelevant page work보다 먼저 실행됩니다.
- 기존 unconditional route와 newer gated route의 policy가 통일됩니다.

**비보장**

diff는 `site.navigation`을 필터링하지 않고 `generateStaticParams`를 바꾸지 않으며 sitemap/indexing 정책도 다루지 않습니다. 즉 “request rendering gate”만 보장합니다. discovery/publication은 별도 selector/SEO 정책의 책임입니다.

이 commit에는 새 route-gate test가 포함되지 않았습니다. exact route diffs로 enforcement를 확인했으며 runtime server 결과는 실행하지 않았습니다.

## 6. Invariant evolution

Record where each invariant was introduced, extended, shown insufficient, corrected, and verified.

| 단계 | 상태 |
| --- | --- |
| early auxiliary routes | About, Resume, Contact가 gate 없이 생성됨 |
| selector 도입 | missing/true는 enabled, false만 disabled |
| new optional routes | Journey와 Interview Map이 도입 시부터 gate 사용 |
| cross-route correction | 기존 About/Contact/Projects/Resume도 content load 직후 gate 적용 |

최종 invariant는 “optional page flag가 explicit false이면 해당 capability의 모든 owned route가 page-specific work 전에 `notFound()`로 종료한다”입니다.

## 7. Failure → Fix → Test relationships

Connect fixes and tests to the exact earlier assumption or implementation they correct or verify.

- **Previous assumption:** navigation/config가 route 접근 가능성도 자연스럽게 통제할 것이라는 암묵적 상태.
- **Actual risk:** 기존 route는 selector가 생긴 뒤에도 caller가 아니어서 direct URL 접근이 계속 가능.
- **Root cause:** page availability가 data model에만 있고 route boundary enforcement가 일관되지 않음.
- **Correction:** `50199...`가 early routes와 project deep link 모두에 같은 gate를 추가.
- **Regression evidence:** 이 selected thread에는 전용 test commit이 없습니다. later route matrix가 존재하더라도 실행하거나 이 commit의 직접 regression으로 소급하지 않았습니다.

## 8. Ownership, state, and responsibility changes

Track caller/callee ownership, browser/framework state, resource lifetime, and boundaries that deliberately remain outside the Thread.

| 책임 | 소유자 |
| --- | --- |
| page flags | validated `content.site.pages` |
| default-open 해석 | `isSitePageEnabled` |
| path→capability key mapping | 각 App Router page |
| request 차단 | 각 route의 early `notFound()` |
| navigation 노출 | site navigation consumer, 별도 |
| static params/sitemap/indexing | 별도 build/SEO policy |
| not-found presentation | global `not-found.tsx` |

## 9. Final Thread state

- explicit false는 route rendering을 차단합니다.
- 누락 flag는 compatibility상 enabled입니다.
- Journey/Interview는 처음부터 정책을 지켰고 older routes는 retrofit됐습니다.
- project index와 detail이 동일한 capability 아래 묶입니다.
- route gate만으로 navigation, sitemap, static generation이 자동 동기화된다고 가정하지 않습니다.

## 10. Final architecture or execution flow

1. App Router page가 validated portfolio content를 읽습니다.
2. path가 소유한 `SitePageId`로 `isSitePageEnabled`를 호출합니다.
3. false이면 즉시 `notFound()`로 global recovery boundary에 넘깁니다.
4. enabled이면 그때 search params, renderer context, page-specific data를 준비합니다.
5. route body가 선택된 shell/renderer로 출력됩니다.

## 11. Learning-completion checks

- [x] early ungated state를 final code로 덮지 않았습니다.
- [x] selector의 default-open truth table을 설명했습니다.
- [x] Journey/Interview와 retrofit routes의 chronology 차이를 적었습니다.
- [x] project index/detail capability 공유를 확인했습니다.
- [x] route gate가 하지 않는 navigation/sitemap/static-param 작업을 명시했습니다.
