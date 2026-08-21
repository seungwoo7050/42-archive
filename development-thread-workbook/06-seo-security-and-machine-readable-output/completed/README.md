# 06-seo-security-and-machine-readable-output

> Repository: `seungwoo7050/42-archive`
>
> Branch: `web/portfolio`
>
> Artifact scope: this category only

## Category purpose

Canonical metadata, crawler indexing policy, content-declared URL integrity, production publication trust, and safely embedded machine-readable claims를 historical implementation sequence로 학습합니다.

## Phase 1 category audit and frozen boundary

- **Category boundary:** SEO/crawler/publication URL/structured-data safety로 한정했습니다.
- **Removed from this category:** `902eddcef875`, `ba8da56d3fcf`, `f63c978c71c9`는 query navigation과 UI link transport의 owner인 category 02/03과 중복되어 제거했습니다.
- **Split:** 기존 혼합 Thread 01을 content-declared internal route integrity와 production origin/publication URL safety로 분리했습니다.
- **Moved within category:** `adc392157f70`은 route metadata Thread에서 sitemap/indexing Thread로 이동했습니다.
- **Added material commits:** route validation regression `3353032ba23b`, publication readiness chain, metadata ownership transfer `55b6061e0052 → 67aabeab1553`, indexing unit/E2E evidence를 추가했습니다.
- **Intentional reuse:** `55b6061e0052`는 metadata shape와 indexing directive, `67aabeab1553`는 metadata-origin integration과 page-indexing integration, `fb3d18fd660b`는 readiness regression과 indexing regression이라는 서로 다른 file/decision 관점에서 두 Thread에 등장합니다. 같은 code claim은 중복 서술하지 않습니다.
- **Final coverage:** 5 Threads, 31 unique SHAs. URL integrity, publication trust, canonical metadata, crawler policy, safe JSON-LD를 독립 engineering stories로 덮습니다.

## Frozen Thread index

| 순서 | 파일 | Thread | Commits |
| --- | --- | --- | --- |
| 1 | `01-content-declared-internal-route-integrity.md` | Content-declared internal route integrity | 4 |
| 2 | `02-production-origin-and-publication-url-safety.md` | Production origin and publication URL safety | 9 |
| 3 | `03-route-aware-metadata-and-canonical-identity.md` | Route-aware metadata and canonical identity | 8 |
| 4 | `04-indexing-robots-and-sitemap-policy.md` | Indexing, robots, and sitemap policy | 7 |
| 5 | `05-safe-jsonld-serialization-and-structured-claims.md` | Safe JSON-LD serialization and structured claims | 6 |

## Historical validation basis

- `commit/commit-importance.md` on `web/portfolio` describes the branch as one independent, linear 476-commit history from `cce7dd020563` through `aff0acdd4cf9`. Every SHA below was matched to that branch-local classification and its exact commit object/diff.
- Exact commit objects/diffs and relevant exact-SHA files were retrieved through the connected GitHub repository interface.
- Earliest selected ancestry anchors were additionally compared against `web/portfolio`; the branch was ahead with the selected SHA as merge base.
- Direct local clone failed because the execution container could not resolve `github.com`; therefore no project command result is claimed in this workbook.

## Phase 2 status

<!-- learner:start readme-phase2-status -->
### Phase 2 completion result

- Frozen scaffold files: `6`
- Completed counterparts: `6`
- Development Threads: `5`
- Unique referenced SHAs: `31`
- Project test execution: not performed because repository checkout failed with DNS resolution error.
- Historical evidence: exact commit diffs/files retrieved through the GitHub connector; no later HEAD code was projected backward.
- Local deliverable validation: file-set equality, fixed-field normalization, frozen SHA-256 hashes, marker completion, commit-map metadata, Markdown fence balance, and ZIP path constraints were executed by this generator.
<!-- learner:end readme-phase2-status -->

## Validation matrix

<!-- learner:start readme-validation -->
| 검증 | 결과 |
| --- | --- |
| scaffold/completed file set | PASS — README와 5 Thread의 relative paths가 정확히 일치합니다. |
| frozen scaffold hash unchanged | PASS — completed 생성 전후 SHA-256 manifest가 동일합니다. |
| fixed fields preserved | PASS — learner marker 내부를 제거한 normalized text가 pair마다 동일합니다. |
| all SHAs branch-scoped | PASS — 31 unique SHAs를 branch-local complete classification 및 exact commit retrieval로 교차 확인했습니다. |
| no unfinished learner region | PASS — completed에 blank learner table/checklist가 남지 않습니다. |
| ZIP contains only category | PASS — top-level은 category 하나이며 scaffold/completed만 포함합니다. |
<!-- learner:end readme-validation -->

## Reading order

1. Start with content-declared internal route integrity to understand route vocabulary before publication.
2. Continue to production origin/readiness because metadata and crawler output trust this boundary.
3. Study canonical metadata ownership and per-route exports.
4. Study aligned page robots, robots.txt, and sitemap publication.
5. Finish with JSON-LD semantic restraint and script-context safety.
