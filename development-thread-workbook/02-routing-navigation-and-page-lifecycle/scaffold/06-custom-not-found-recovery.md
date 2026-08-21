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

> **학습자 작성란:** [[LEARNER:commit:154b7e6cb54b]]

### 2. `850e084b3911` — test(site): 404 복귀 동선 검증

- Importance: **B**
- Tags: `VALIDATION, TEST`
- Fixed role: Verify that the custom not-found page communicates the error through its primary heading and exposes a semantic link back to `/`.

#### Historical inspection tasks

- `src/app/not-found.test.tsx`가 component를 직접 render하고 level-1 heading 및 named link의 href를 확인하는지 적습니다.
- 이 테스트가 HTTP 404 status, Next router의 `notFound()` 연동, metadata export를 검증하지 않는다는 범위를 구분합니다.
- 검증 유형을 focused component regression/semantic recovery evidence로 분류합니다.

#### Reconstruction result

> **학습자 작성란:** [[LEARNER:commit:850e084b3911]]

## 6. Invariant evolution

Record where each invariant was introduced, extended, shown insufficient, corrected, and verified.

> **학습자 작성란:** [[LEARNER:thread:6:invariants]]

## 7. Failure → Fix → Test relationships

Connect fixes and tests to the exact earlier assumption or implementation they correct or verify.

> **학습자 작성란:** [[LEARNER:thread:6:relations]]

## 8. Ownership, state, and responsibility changes

Track caller/callee ownership, browser/framework state, resource lifetime, and boundaries that deliberately remain outside the Thread.

> **학습자 작성란:** [[LEARNER:thread:6:ownership]]

## 9. Final Thread state

> **학습자 작성란:** [[LEARNER:thread:6:final]]

## 10. Final architecture or execution flow

> **학습자 작성란:** [[LEARNER:thread:6:flow]]

## 11. Learning-completion checks

> **학습자 작성란:** [[LEARNER:thread:6:checks]]
