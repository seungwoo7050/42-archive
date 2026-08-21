# Development Thread 06 — Custom Not-Found Recovery

## 0. Source and frozen audit scope

- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/portfolio`
- Category: `02-routing-navigation-and-page-lifecycle`
- Change range for directed inspection: `154b7e6cb54b^..850e084b3911`
- Classification source: `commit/commit-importance.md` on `web/portfolio`
- Historical rule: inspect every commit at its exact SHA; do not project later code backward.
- Phase 1 status: audited and frozen before learner-facing completion.
- Thread boundary: Next App Router global not-found presentation과 semantic recovery link를 다룹니다. 개별 route가 `notFound()`를 호출하는 availability 정책은 이전 Thread의 책임입니다.
- Execution note: source inspection and runtime command evidence must be recorded separately.

### Phase 1 audit decisions

- project dynamic-detail story에 잘못 결합된 global 404를 독립 Thread로 분리했습니다.

## 1. Learning goal and planned invariants

framework not-found boundary에 portfolio shell, no-index metadata, 명시적 home recovery path를 추가하고 focused component test로 최소 계약을 보호한 과정을 재구성합니다.

- global not-found page는 configured default design의 shared shell을 사용합니다.
- crawler metadata는 index/follow를 모두 false로 둡니다.
- 사용자에게 level-1 error heading과 semantic `/` link를 제공합니다.
- focused test는 heading/link contract만 증명하며 HTTP status와 router integration은 별도입니다.

## 2. Questions to answer

- global 404가 project detail Thread와 독립이어야 하는 이유는 무엇입니까?
- not-found page가 query state를 보존하지 않고 default design을 쓰는 실제 구현은 무엇입니까?
- component test의 assertion과 metadata/HTTP 비보장은 어떻게 구분됩니까?

## 3. Completion criteria

- feature와 test commit을 연결합니다.
- metadata, shell, recovery link의 소유 위치를 적습니다.
- 실행하지 않은 Next server behavior를 검증했다고 쓰지 않습니다.
- test가 증명하지 않는 범위를 명시합니다.

## 4. Fixed commit map

| # | Commit | Subject | Importance | Tags | Source-defined role |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `154b7e6cb54b` | feat(site): 사용자 정의 404 페이지 추가 | B | - | Provide a portfolio-styled not-found page with an explicit route back to the home page. |
| 2 | `850e084b3911` | test(site): 404 복귀 동선 검증 | B | VALIDATION, TEST | Verify that the custom not-found page communicates the error through its primary heading and exposes a semantic link back to `/`. |

The commit SHA, order, subject, importance, tags, and source-defined role in this map are frozen.

## 5. Commit-by-commit reconstruction

### 1. `154b7e6cb54b` — feat(site): 사용자 정의 404 페이지 추가

- Importance: **B**
- Tags: `-`
- Fixed role: Provide a portfolio-styled not-found page with an explicit route back to the home page.

#### Historical inspection tasks

- `src/app/not-found.tsx`의 metadata, content load, `PageShell`, heading/body, `Link href="/"`를 확인합니다.
- `robots: { index: false, follow: false }`가 page component와 별도 export인지 확인합니다.
- 404 component가 request query를 받지 않고 configured default design으로 shell을 구성하는지 확인합니다.

#### Reconstruction result

`src/app/not-found.tsx`가 App Router global not-found component로 추가됩니다.

**metadata**

- title: `Page not found`
- robots: `index: false`, `follow: false`

**render path**

component는 `getPortfolioContent()`를 호출하고 `content.presentation.defaultHomeTemplate`을 `PageShell`의 home template으로 사용합니다. profile, site, presentation UI도 shell에 전달합니다. request `searchParams`를 받지 않으므로 failed URL의 `view`/`debug`를 보존하지 않습니다.

body는 visible `404`, level-1 `Page not found` heading, 설명, Next `Link` 기반 `Return home` action을 렌더링합니다. home href는 정확히 `/`입니다.

이 route는 특정 project missing-ID 전용이 아닙니다. unknown route, page gate, dynamic lookup 등 Next의 not-found boundary로 들어오는 여러 실패의 공통 presentation입니다. 따라서 project lifecycle에서 분리하는 것이 맞습니다.

코드 inspection으로 component와 metadata export를 확인했으며 HTTP status를 실제 server에서 실행하지 않았습니다.

### 2. `850e084b3911` — test(site): 404 복귀 동선 검증

- Importance: **B**
- Tags: `VALIDATION, TEST`
- Fixed role: Verify that the custom not-found page communicates the error through its primary heading and exposes a semantic link back to `/`.

#### Historical inspection tasks

- `src/app/not-found.test.tsx`가 component를 직접 render하고 level-1 heading 및 named link의 href를 확인하는지 적습니다.
- 이 테스트가 HTTP 404 status, Next router의 `notFound()` 연동, metadata export를 검증하지 않는다는 범위를 구분합니다.
- 검증 유형을 focused component regression/semantic recovery evidence로 분류합니다.

#### Reconstruction result

`src/app/not-found.test.tsx`는 `NotFound` component를 직접 Testing Library로 render합니다. assertion은 두 개입니다.

- role `heading`, level 1, accessible name `Page not found`
- role `link`, name `Return home`, attribute `href="/"`

이것은 사용자에게 오류가 semantic heading으로 전달되고 명확한 recovery path가 존재하는지를 보호하는 focused component regression입니다. raw text snapshot보다 role/name을 사용하므로 accessibility-facing contract를 직접 확인합니다.

다만 다음은 테스트하지 않습니다.

- 실제 unknown URL의 HTTP status가 404인지
- route의 `notFound()`가 이 component를 선택하는지
- exported metadata의 noindex/nofollow
- design query preservation
- browser click 후 home이 성공적으로 로드되는지

이 환경에서는 test command를 실행하지 않았습니다. exact test source와 assertion을 inspection했습니다.

## 6. Invariant evolution

Record where each invariant was introduced, extended, shown insufficient, corrected, and verified.

| 단계 | invariant |
| --- | --- |
| `154b...` | global not-found boundary가 portfolio shell, no-index metadata, `/` recovery link 제공 |
| `850e...` | H1 error communication과 semantic home link를 focused test로 고정 |

최종 invariant는 “not-found presentation은 index 대상이 아니며, 사용자가 semantic heading으로 실패를 인지하고 root로 복귀할 수 있다”입니다.

## 7. Failure → Fix → Test relationships

Connect fixes and tests to the exact earlier assumption or implementation they correct or verify.

- **Failure → Recovery UI:** route gate나 missing lookup이 `notFound()`를 호출하면 global component가 공통 recovery surface를 제공합니다.
- **Feature → Test:** heading과 home link를 `850e...`가 직접 assertion합니다.
- **검증 공백:** metadata, HTTP status, App Router integration은 selected test가 증명하지 않습니다.

## 8. Ownership, state, and responsibility changes

Track caller/callee ownership, browser/framework state, resource lifetime, and boundaries that deliberately remain outside the Thread.

| 책임 | 소유자 |
| --- | --- |
| not-found transition 결정 | individual route/Next router |
| global failure presentation | `src/app/not-found.tsx` |
| default design choice | `content.presentation.defaultHomeTemplate` |
| crawler policy | exported metadata |
| recovery navigation | Next `Link` to `/` |
| focused semantic regression | `not-found.test.tsx` |

## 9. Final Thread state

- 모든 App Router not-found path가 사용할 수 있는 portfolio-styled recovery page가 있습니다.
- failed request query를 재구성하지 않고 configured default design을 사용합니다.
- page는 noindex/nofollow metadata를 선언합니다.
- component test는 H1과 root link만 보호합니다.

## 10. Final architecture or execution flow

1. route 또는 framework가 요청을 not-found lifecycle로 전환합니다.
2. global `NotFound`가 portfolio content를 읽습니다.
3. configured default design으로 shared shell을 구성합니다.
4. H1 error message와 `/` recovery link를 렌더링합니다.
5. 사용자가 link를 선택하면 root route로 새 navigation을 시작합니다.

## 11. Learning-completion checks

- [x] global 404를 project detail과 분리했습니다.
- [x] metadata와 component body를 구분했습니다.
- [x] test의 정확한 role/name/href assertion을 설명했습니다.
- [x] HTTP/router integration 비보장을 명시했습니다.
- [x] test를 실행했다고 주장하지 않았습니다.
