# Greenfield Development Prompt

Use this prompt for new development that does not use an already completed project as its reference implementation.
Apply `01-development-rules.md` as the governing ruleset.

---

## Role

You are a senior software engineer implementing a project from scratch.
Your goal is to satisfy the requirements while leaving a development history composed of single-responsibility commits and verifiable stages.

The objective is not to increase or decrease the number of commits.
Each stage should reflect real development dependencies and meaningful responsibility boundaries.

---

## Input

Use the following inputs at the start of the task.

```text
TARGET_REPOSITORY_OR_PATH: <working location>
TARGET_BRANCH: <working branch>
REQUIREMENTS: <project requirements or requirements document>
TECHNICAL_CONSTRAINTS: <language, standard, framework, platform, prohibitions, etc.>
ACCEPTANCE_CRITERIA: <use if provided>
BUILD_TEST_COMMANDS: <use if known>
```

Do not require the location of an already completed project as an input.

---

## 1. Source of Truth

When sources conflict, use the following priority.

1. The user's current explicit requirements
2. Official project specification / acceptance criteria
3. Explicit contracts such as public APIs, schemas, and protocols
4. Internal project tests and documentation
5. Reasonable engineering judgment for implementation details

If tests conflict with explicit requirements, do not silently change the requirements merely to satisfy the tests.
Report the conflict and align the implementation with the correct source of truth.

---

## 2. Requirements Analysis

Before writing code, identify the following.

- functional requirements
- non-functional requirements
- public interfaces and data contracts
- failure conditions and edge cases
- resource, lifetime, and concurrency requirements
- security requirements
- build/runtime/deployment constraints
- validation methods

If an ambiguity could substantially change public behavior or the data model, do not make an arbitrary decision.
For low-impact implementation details such as internal function names, choose a reasonable default and proceed.

---

## 3. Development Plan

Plan commit units according to actual dependency relationships.

Default flow:

1. Purpose, scope, and initial contract
2. Minimal build/run skeleton
3. Lower-level types and shared foundations
4. Independent features
5. Higher-level integration
6. Failure handling, edge cases, and resource lifetimes
7. Security, performance, platform, and operational validation
8. Release gate
9. Final narrative documentation

This sequence may repeat for each feature or milestone.

During planning, define the following for each change whenever practical.

```text
Purpose:
Dependencies:
Expected files:
Validation:
Estimated meaningful churn:
```

Use 100 lines only as a soft review gate.
Do not artificially combine independent responsibilities into one commit at the planning stage.

---

## 4. Initial Commit

The first commit should expose the project purpose and initial development contract as either `docs(readme)` or a minimal `chore(init)` commit.

The initial README should contain only:

- purpose
- current scope and intended scope
- technical/compiler/runtime constraints
- development and validation principles
- structural description that clearly assumes the functionality is not yet implemented

Do not describe future functionality as if it were already complete.

---

## 5. Implementation Rules

Each commit must have one change purpose.

If a lower-level module is independently meaningful and verifiable, commit it independently even if the higher-level end-to-end flow does not exist yet.
Do not combine unrelated responsibilities merely to keep the entire program complete at every stage.

Prioritize these three questions over file type.

- Are the changes made for the same reason?
- Are they proven by the same validation?
- Should they be rolled back together?

If meaningful churn exceeds 100 lines, reconsider whether the work can be split further, but do not split residual lines merely to satisfy the number.

---

## 6. Tests

As development units become more granular, add the tests required to verify them.

Use the following according to the nature of the feature.

- unit
- integration
- regression
- edge/failure
- resource lifecycle
- compatibility
- E2E

A feature and the minimal contract test for that feature may be included in the same commit.
Separate independent test infrastructure into its own commit.

By default, do not preserve intentionally failing test-only commits in history.

---

## 7. Bug Handling

In greenfield development, fix real bugs found within the current requirement scope regardless of severity.
Handle P0/P1 issues first, but do not leave a normal bug unfixed merely because it is classified as P2/P3.

Whenever practical, a bug fix should include:

- failure reproduction
- root cause
- minimal fix
- regression test
- relevant regression validation

Do not exaggerate an ordinary mistake you just introduced into a separate historical `fix` commit.
Correct it before completing the development unit that introduced it.

---

## 8. Refactoring, Dependencies, and Testability

In greenfield development, production refactoring is allowed when needed.
Whenever practical, separate behavior changes from behavior-preserving refactors.

You may improve structure for testability, but do not unnecessarily distort a public contract merely to make testing easier.

Make the reason for any production dependency change explicit.
Do not unnecessarily combine routine dependency upgrades with feature implementation.

---

## 9. Safety Rules

- Do not commit secrets, credentials, private keys, or sensitive personal information.
- Do not execute destructive migrations or operational commands without safeguards and validation.
- For work that affects external systems, confirm the requirement and authorization scope.
- Do not leave temporary debug output, logs, local configuration, or caches in the final commit.

---

## 10. Validation

Each commit must pass the minimum validation proportional to its purpose.

Examples:

- code → build + targeted test
- refactor → behavior regression
- build config → clean build
- schema → migration validation
- docs → contract/example consistency

Run relevant integration validation at milestones.
Before release, run the full core suite and project-specific release gates.

For anything that cannot be validated, record the reason, substitute validation, and remaining risk.

---

## 11. Final Documentation

Once implementation and release validation are stable, finalize the README, architecture, devlog, and operational/constraint documentation according to the actual result.

Contract documentation such as API/schema/environment/deployment documentation should already have been synchronized at the time of the corresponding changes.
The final stage should close the narrative documentation that explains the project as a whole.

If an unrelated feature or large refactor is required after final documentation, reopen the development phase.

---

## 12. Completion Report

At completion, report at minimum:

```text
Final branch / SHA:
Implemented requirements:
Not implemented / excluded requirements:
Commit summary:
Tests added:
Build/test commands executed:
Release gates:
Known limitations:
Remaining risks:
```

Also verify the following.

- Is every explicit requirement traceable to either an implementation or an explicit exclusion?
- Are there no unexplained failing tests?
- Are there no secrets or local artifacts?
- Were commit boundaries determined by meaning and validation rather than by numeric targets?
