# Category 02 — Routing, Navigation, and Page Lifecycle

## Scope

This category reconstructs the App Router lifecycle that turns URL state and validated page configuration into addressable routes, shared navigation, page availability, not-found recovery, and common page context.

It includes:

- query-state normalization and state-preserving internal URLs
- shared header, footer, mobile navigation, and active-route semantics
- native design-switcher disclosure, hydration, focus, and server/client ownership
- project index and dynamic detail addressability
- page capability gates for optional routes
- global not-found recovery
- common page-context consolidation

It excludes:

- typed content-link transport and external-anchor security, which belong to Category 03
- page body feature construction, which belongs to Category 04
- visual-system styling and complete renderer construction, which belong to Category 05
- generic test/performance strategy, which belongs to Category 07
- source-defined cross-cutting architecture narratives, which may reuse selected commits in Category 09

## Phase 1 audit outcome

The draft category had five generic Threads. Repository evidence required these material changes before freeze:

- removed `f63c978c71c9` from query navigation because Category 03 already owns the typed internal/external link transport story
- reordered `51806e1875e7` before the later mobile-menu and shared-switcher commits
- moved `42bef4e5783c` to the beginning of page-context consolidation because it is pre-refactor characterization
- added the omitted native design-switcher lifecycle from client disclosure through hydration regression and server-first reduction
- separated global 404 recovery from project dynamic-route creation
- consolidated duplicated page-enablement work into one availability Thread
- added exact URL helper tests from `3353032ba23b`
- retained only commits whose code materially belongs to this category boundary

The resulting seven-Thread scaffold is frozen for Phase 2.

## Frozen file set

| Thread | File | Engineering story | Commits |
| ---: | --- | --- | ---: |
| 01 | `01-query-state-and-route-preserving-navigation.md` | Query State and Route-Preserving Navigation | 4 |
| 02 | `02-shared-shell-navigation-and-mobile-menu.md` | Shared Shell Navigation and Mobile Menu | 6 |
| 03 | `03-native-design-switcher-page-lifecycle.md` | Native Design Switcher Page Lifecycle | 7 |
| 04 | `04-project-index-and-dynamic-detail-lifecycle.md` | Project Index and Dynamic Detail Lifecycle | 2 |
| 05 | `05-page-availability-and-auxiliary-route-lifecycle.md` | Page Availability and Auxiliary Route Lifecycle | 7 |
| 06 | `06-custom-not-found-recovery.md` | Custom Not-Found Recovery | 2 |
| 07 | `07-page-context-consolidation.md` | Page Context Consolidation | 5 |

`README.md` plus these seven files are the complete category file set. The completed directory must have the exact same relative paths and no extras.

## Historical validation basis

- Branch-local classification: `commit/commit-importance.md`
- Exact commit inspection through the GitHub connector
- The classification source describes `web/portfolio` as a complete independent linear root-to-head history
- Ancestry anchors were checked with GitHub compare: the earliest referenced `902eddcef875` and latest referenced `b669e04c0932` are merge-base ancestors of `web/portfolio` with `behind_by: 0`
- Every frozen SHA is present in the branch-local classification and was resolved to its exact commit subject/diff

## Completion and execution record

> **학습자 작성란:** [[LEARNER:README_STATUS]]
