# Generalized Development Rules

This document defines the high-level development rules that apply to both greenfield development and reconstruction of existing projects.
Project-specific prompts use this document as their baseline and add stricter constraints only when necessary.

---

## 0. Rule Priority

When rules conflict, apply them in the following order.

1. Safety, security, and legal requirements
2. Explicit project requirements and public contracts
3. Functional correctness, data integrity, and compatibility
4. Separation of change responsibilities and verifiability
5. Build, test, and release quality
6. History conventions such as commit size, format, and documentation placement

Do not compromise correctness, safety, or atomicity merely to satisfy the 100-line budget or a commit-format convention.

---

## 1. Starting Rules

- In the first stage, establish the project purpose, scope, constraints, and development contract.
- Depending on the nature of the project, the first commit may be a `docs(readme)` or `chore(init)`-type commit.
- Do not describe unimplemented features in the initial README as if they were already complete.
- Initial documentation must contain only information that is true at that point in time.
- A minimal scaffold should include only what is actually required, such as the README, build configuration, ignore/config files, and a minimal entry point.
- Do not commit temporary debug output, local-only configuration, caches, credentials, or commented-out experimental code.

---

## 2. Default Development Flow

The following is not a strict waterfall that the entire project passes through only once. It is the default flow that may repeat for each feature or milestone.

1. Analyze requirements, contracts, and constraints
2. Establish the minimal build/run skeleton
3. Implement lower-level types, interfaces, and shared foundations
4. Implement independent domain features
5. Build higher-level execution flow and integration
6. Strengthen failure handling, edge cases, and resource lifetimes
7. Validate security, performance, platform, and operational concerns
8. Run the full release gate
9. Finalize narrative documentation
10. If necessary, validate documentation and release contracts

In real development, repeatedly cycle through `feature → test → integration → fix discovered issues`.
If actual dependency relationships differ from the sequence above, prioritize the real dependencies.

---

## 3. Single Responsibility per Commit

Each commit must have one change purpose and one primary review question.

Changes may belong in the same commit when the answers to all three questions below are the same.

1. Why are these changes made together?
2. How are they validated together?
3. Why should they be reverted together?

Do not split changes merely because they affect different file types.
Conversely, even if only one file is changed, split the work if that file contains multiple independent responsibilities.

Whenever practical, separate independent `feat`, `fix`, `refactor`, `perf`, `format/style`, `dependency`, `build`, `CI`, and bulk asset changes.

---

## 4. Commit Completeness

- Commit completeness does **not** mean that the entire product must be end-to-end complete.
- It is sufficient for the responsibility introduced by the commit to be logically complete and independently explainable and verifiable.
- A lower-level module that is not yet wired into a higher-level feature may still be committed independently if it has its own contract and validation.
- Do not combine multiple subsystems into one enormous initial commit merely to keep the whole program complete at every commit.
- Do not deliberately leave a broken state so that a later commit can appear to fix it.
- Reconstruction mistakes or ordinary work-in-progress mistakes should be corrected before the change is considered complete rather than preserved as a separate `fix` history entry.

### Test-First Exception

By default, do not commit a test-only state that is intentionally failing.
If the project explicitly preserves TDD red commits in history, declare that policy separately.
Otherwise, failing tests may be used locally, but the committed state should pass the validation expected for that stage.

---

## 5. 100-Line Meaningful-Change Budget

100 lines is not a hard limit. It is a **soft review gate for reconsidering whether the change can be divided into meaningful units**.

### 5.1 Default Rules

- When hand-authored meaningful change exceeds roughly 100 lines, always reconsider whether it can be split into natural, independent responsibilities.
- Do not split residual lines merely to hit the number, such as `101 → 100 + 1` or `102 → 100 + 2`.
- Regardless of how far the change exceeds 100 lines, split only when each resulting commit is independently explainable, reviewable, verifiable, and revertible.
- Even below 100 lines, split the commit if it mixes independent responsibilities.
- If no valid semantic boundary exists, exceeding 100 lines is allowed.
- Do not treat increasing or decreasing the number of commits as a quality objective in itself.

### 5.2 Measurement

- `raw churn` = lines added + lines deleted according to Git
- `meaningful churn` = the actual amount of hand-authored or semantically changed content

The 100-line gate applies by default to the **total hand-authored meaningful churn of the commit**.
If production code and its minimal test form one atomic change, do not mechanically split them merely because the combined total exceeds 100 lines.
When useful during planning, record the following separately.

- production meaningful churn
- test meaningful churn
- docs/config meaningful churn
- total meaningful churn

### 5.3 Items Evaluated Separately

Evaluate the following separately from raw churn.

- lockfiles and reproducible generated files
- binary, minified, or vendored assets
- content-preserving rename/move operations
- mechanical formatting or global mechanical replacement
- large-scale straightforward deletions

Even for these categories, separate them into their own commits when they serve a different change purpose.

### 5.4 Representative Examples

- Cohesive parser, 102 lines → may remain one commit
- Feature, 99 lines + unrelated rename, 3 lines → split
- Bug fix, 70 lines + regression test, 40 lines → may remain one atomic commit
- Independent feature A, 55 lines + feature B, 40 lines → split even though total is 95 lines
- Manifest, 5 lines + lockfile, 500 lines → may stay together if they represent the same dependency change
- Final architecture documentation, 300 lines → may be allowed if it is one coherent documentation-finalization responsibility

---

## 6. Combining Code, Tests, Documentation, and Assets

Do not divide commits by file type alone.

Examples that naturally belong in the same commit:

- feature + the minimal contract test that proves it
- bug fix + regression test
- API change + the contract documentation for that API
- schema change + inseparable migration/compatibility handling
- dependency manifest + the resulting lockfile
- asset + license/attribution that is required for that asset

Examples that are more naturally separated:

- feature + unrelated large-scale formatting
- introduction of independent test infrastructure
- unrelated refactor
- independent CI change
- bulk asset replacement
- general dependency upgrade

---

## 7. Testing Rules

Tests are not merely accessories to development; they are deliverables that verify each responsibility.

Use the following as appropriate.

- unit tests
- integration tests
- regression tests
- edge/failure-path tests
- resource-lifecycle tests
- compatibility/platform tests
- E2E tests
- characterization tests
- fixtures/mocks/test harnesses

### Validation Principles

- For each commit, run the minimum validation that proves its purpose.
- Validate using the relevant tests that exist at that point in history.
- Run the full regression suite at milestones or release gates.
- Do not weaken assertions or delete failing cases merely to make tests pass.
- If a flaky test is discovered, resolve its cause or do not treat it as passing without clear justification.
- Make tests that depend on time, randomness, or networks reproducible whenever possible through seeds, fake clocks, fixtures, local services, or equivalent mechanisms.

---

## 8. Fixes, Refactoring, and Performance Changes

### Fix

- Clearly define the actual failure condition and expected behavior.
- Include a reproduction test or regression test when possible.
- Do not include unrelated cleanup in the fix scope.

### Refactor

- Validate the claim that externally observable behavior remains unchanged.
- Whenever possible, separate large moves/renames from actual behavior changes.

### Performance

- When claiming a performance improvement, record the baseline, measurement conditions, workload, and before/after results.
- Do not document a change as "faster" without measurement.

### Security

- For security changes, record the threat or failure boundary and the validation result.
- Do not commit credentials, secrets, private keys, or sensitive personal information to the repository.

---

## 9. Dependencies, Build, and Generated Artifacts

- A production dependency change must have an independent reason.
- A dependency required by a feature may be included with that feature, but an upgrade performed only to stay current should be treated as separate work.
- Distinguish test-only dependencies from production dependencies.
- If generated files are intentionally tracked by the repository, make the source of truth and generation procedure explicit.
- Do not commit build artifacts, caches, or local environment files unless the project intentionally tracks them.
- Test-only build targets or instrumentation must not change production build/runtime semantics.

---

## 10. Documentation Rules

### 10.1 Truth at the Point in History

Documentation in each commit must describe only behavior and contracts that actually exist at that point in history.
Do not document future functionality as if it had already been implemented.

### 10.2 Contract Documentation Updated with the Change

The following may be updated in the same development stage as the related implementation change.

- public API
- schema/migration contract
- environment/configuration contract
- CLI contract
- deployment/recovery procedure
- security constraints

### 10.3 Narrative Documentation Consolidated at the End

The following may be consolidated during the final documentation phase once the project is stable.

- final README
- architecture explanation
- final devlog
- operational-results summary
- retrospective/limitations

Do not add unrelated features or large refactors after final documentation is closed.
If necessary, explicitly reopen the development phase.
A documentation or release-contract validation commit may follow documentation finalization.

---

## 11. Validation Stages

Each commit should, in principle, be buildable and pass the minimum validation appropriate to its responsibility.
For docs-only or asset-only changes, where a build is not the relevant verification mechanism, use validation proportional to the change.

Examples:

- code → build + targeted test
- refactor → build + behavior regression
- docs → link/example/contract consistency
- schema → migration/compatibility validation
- build config → clean build
- asset → path/license/consumer validation

For anything that cannot be validated, record:

- reason
- substitute validation
- deferred validation
- remaining risk

---

## 12. Release Gate

Before promoting a release candidate, run at minimum:

- clean build
- core regression suite
- project-specific core integration/E2E tests
- required platform/compiler/runtime matrix

Add the following when appropriate to the project.

- sanitizer/leak/resource checks
- external consumer/public API verification
- browser/protocol tests
- deploy/restart/shutdown smoke tests
- backup/restore
- security validation
- performance baseline

If a required gate fails, block the release.
For any skipped gate, record the reason and residual risk.

---

## 13. Commit Message and Body

Default format:

```text
type(scope): subject
```

Representative types:

- feat
- fix
- test
- refactor
- perf
- build
- docs
- chore
- style
- ci

The subject should describe the outcome and responsibility rather than the act of working on it.

Do not require a commit body for every commit.
However, a body is recommended for:

- non-obvious design decisions
- P0/P1 or other important bug fixes
- migration/compatibility changes
- security/performance changes
- cohesive changes that exceed the 100-line gate but are intentionally not split
- validation exceptions or known risks

When needed, use the following form.

```text
Reason:
Validation:
Risk:
```

---

## 14. Prohibited Optimization Targets

Do not optimize for any of the following as an objective in itself.

- maximizing the number of commits
- minimizing the number of commits
- forcing every commit to stay at or below exactly 100 lines
- combining responsibilities merely to make every commit end-to-end executable
- inventing unnecessary bugs, reverts, or experimental commits to make history look more realistic or aesthetically pleasing

The quality criteria are **meaningful responsibility boundaries, verifiability, correctness, and safe rollback**.

---

## 15. Completion Checklist

- [ ] Are the requirements and public contracts reflected in the implementation?
- [ ] Can the purpose of each commit be expressed as one review question?
- [ ] Is there no artificial splitting or combining merely to hit a target commit count or 100-line number?
- [ ] For changes exceeding 100 lines, was the possibility of a meaningful split actually reconsidered?
- [ ] Is each commit buildable/validatable at the level of responsibility it introduces?
- [ ] Are unrelated refactor/format/build/CI changes kept out of feature commits?
- [ ] Do fixes have reproduction or regression evidence?
- [ ] Has behavior preservation been validated for refactors?
- [ ] Is contract documentation synchronized with the implementation stage?
- [ ] Does final documentation describe only the actual implementation and validation results?
- [ ] Are credentials, secrets, and local artifacts absent?
- [ ] Has the release gate passed?
