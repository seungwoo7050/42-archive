# Development Thread Study Scaffold Generation
Use this prompt after the following two English documents have been completed and technically validated:
- `commit-bodies.md`
- `commit-importance.md`
These documents are final inputs. Do not re-evaluate, correct, extend, or independently verify their technical conclusions.
## Input
```text
PROJECT_NAME: <project>
COMMIT_BODIES_PATH: <path/to/commit-bodies.md>
COMMIT_IMPORTANCE_PATH: <path/to/commit-importance.md>
OUTPUT_LANGUAGE: Korean
```
Do not require a repository path, branch, tag, or remote URL.
## Objective
Using only `commit-bodies.md` and `commit-importance.md`, create a Markdown study scaffold under `<project>_dev_thread/` for reviewing and reconstructing the project through its commit history.
The result is not a completed explanatory guide in which the AI explains the project on the learner's behalf.
It must be a stable learning structure that enables the learner to inspect the actual commit history and the code at each listed SHA, fill in the intentionally incomplete sections, and reconstruct the evolution of:
- design
- implementation
- failure handling
- corrections
- validation
When the learner completes the scaffold using the actual code, the learner should be able to explain the project's engineering progression without needing to relearn the project separately.
## Output Language
Write all learner-facing prose in Korean, including:
- study instructions
- guiding questions
- completion criteria
- record templates
- comparison prompts
- self-check items
Preserve the following exactly as written in the source documents:
- commit SHA
- commit subject
- importance grade
- importance tags
- filenames and paths
- code identifiers
- API, schema, protocol, command, library, and framework names
- source-defined Development Thread names when used as authoritative identifiers
Use natural Korean technical prose, but do not force translations of established technical terms when translation would reduce precision.
The output language must not change source facts, importance, tags, ordering, relationships, or evaluation depth.
## Source-of-Truth Rules
### `commit-importance.md`
Use `commit-importance.md` as the authoritative source for the complete document structure and all relationships among:
- Project Importance Profile
- Critical Invariants
- Major Engineering Difficulties
- Commit Classification
- Development Threads
- Most Important Commits
Preserve its judgments and relationships exactly.
### `commit-bodies.md`
Use `commit-bodies.md` only to enrich the scaffold with source-established information about:
- implementation intent
- state changes
- failure handling
- implementation details
- the role of a commit in the surrounding development sequence
Do not reclassify or reinterpret a commit in a way that conflicts with `commit-importance.md`.
### Prohibited Sources
Do not inspect or use:
- the GitHub repository
- the web
- any other document
- another branch or tag
- final HEAD source code
- unstated personal knowledge about the project
Do not independently validate the two source documents.
Do not invent facts, symbols, paths, invariants, failure paths, or commit relationships that the sources do not establish.
## Development Thread Rules
1. Use exactly the Development Threads defined in `commit-importance.md`.
2. Produce exactly one Markdown document for each Development Thread.
3. Do not add, remove, merge, split, rename, or reclassify a thread.
4. If the same commit appears in multiple threads, retain it in every listed thread. Each occurrence supports a different learning perspective.
5. Preserve the source-defined commit order inside every thread.
6. Preserve every source-defined SHA, subject, importance grade, tag, role, and relationship.
## Pre-Filled Content and Learner-Owned Content
Pre-fill only information already established by the source documents:
- Thread title
- Thread purpose and significance
- commit SHA
- commit subject
- importance grade
- tags
- position in the Thread
- source-established role of the commit
- Critical Invariants explicitly connected to the Thread
- Major Engineering Difficulties explicitly connected to the Thread
Leave the following for the learner to complete after inspecting the actual code:
- detailed interpretation of implementation code
- function-by-function execution tracing
- before/after code comparison
- observed ownership and lifetime relationships
- observed failure paths
- test execution results
- the learner's final explanation
Do not fill learner-owned sections with an AI-generated model answer.
## Code Inspection Scaffold
Do not use vague placeholders such as "write code here" or a bare `TODO`.
For each commit, use the source-established role and importance to tell the learner what kind of evidence to inspect at that exact SHA.
When relevant, direct the learner to identify and record:
- core state fields
- changed functions
- caller and callee relationships
- ownership-transfer code
- event registration, update, and removal points
- error and failure branches
- retry and backpressure behavior
- ordering before and after state mutation
- cleanup paths
- related test code
- the failure injected by a regression test
- corresponding code in the immediately preceding relevant SHA
Never substitute final HEAD code for code at the target SHA.
Always instruct the learner to inspect the listed SHA.
When useful, instruct the learner to compare it with the preceding relevant SHA.
If the sources do not establish an exact symbol or path, ask the learner to locate it at the SHA instead of inventing a name.
## Study Depth by Importance
### S — Critical
Treat the commit as part of the project's defining architecture or invariants.
Provide a deep scaffold that allows the learner to trace, when supported by the sources:
- Problem
- prior state
- failure possibility
- key decision
- actual core code to locate
- ownership, lifecycle, or state transition
- related follow-up fix
- related regression or integration test
### A — Significant
Provide enough structure to understand a major subsystem, boundary, failure path, or integration point, including the important code and design decision the learner must verify.
### B — Normal
Focus on the commit's implementation role in the Thread and the necessary code and state changes the learner should inspect.
### C — Minor
Use the commit only when it supplies necessary Thread context.
Do not mechanically create the same deep analysis sections used for S or A commits.
## Commit-Level Study Flow
Do not repeat an identical questionnaire for every commit.
Select only the sections appropriate to the commit's role and importance.
Across the Thread, the scaffold should allow the learner to trace, where relevant:
1. state immediately before the commit
2. problem being addressed
3. why the existing design was insufficient
4. selected decision
5. actual code to inspect at the listed SHA
6. change in state, invariant, ownership, or lifecycle
7. failure scenario
8. what the commit guarantees
9. what the commit still does not guarantee
10. relationship to the next relevant commit
## Fix Commit Rules
Do not present a fix as an independent new feature.
When the sources support the relationship, expose the following learning chain:
```text
previous assumption
→ actual failure or risk
→ root cause
→ corrected invariant or decision
→ code to inspect at the fix SHA
→ regression test
```
If the source documents do not identify a regression test, do not invent one.
## Test Commit Rules
For every test commit, provide a scaffold that enables the learner to distinguish and record:
- production invariant under test
- reproduced failure or boundary
- test technique
- production code path exercised
- what the test proves
- what the test does not prove
- whether it is a broad integration test or a deterministic regression test
- regression prevented in later work
Do not claim that a test proves behavior beyond what the source documents establish.
## Required Thread Document Structure
Each Thread document must include at least the following areas when they fit the Thread:
1. Thread goal
2. core questions required to understand the Thread
3. completion criteria
4. Commit map
5. per-commit study records
6. Invariant ledger
7. Failure → Fix → Test relationships
8. ownership, state, or responsibility changes
9. final state of the Thread
10. final architecture or execution-flow reconstruction
11. learner completion self-check
Do not force an area into a Thread when it has no meaningful relationship to that Thread.
## Invariant Ledger
Provide a learner-owned ledger for recording how important Thread invariants evolve over time.
When supported by the sources, allow the learner to record:
- commit that first introduced the invariant
- commit that strengthened it
- commit that exposed its insufficiency
- fix that restored it
- regression test that fixed the invariant as an executable expectation
Do not create a new invariant and present it as an established fact when it is absent from the source documents.
## README
Create `<project>_dev_thread/README.md` containing only:
- purpose of the study-document set
- recommended study order
- how to use each Thread document
- requirement to inspect code at the listed SHA
- prohibition on retroactively using final HEAD
- study depth for S/A/B/C importance
- criteria for inserting actual code excerpts
- method for studying test commits
- document-completion criteria
Do not turn the README into a separate project explanation or summary guide.
## Output Structure
Produce the following directory structure:
```text
<project>_dev_thread/
├── README.md
├── 01-<thread-name>.md
├── 02-<thread-name>.md
└── ...
```
Choose filenames that naturally reflect the meaning of each source-defined Development Thread.
Preserve the source-defined Thread order when assigning numeric prefixes.
Package the complete `<project>_dev_thread/` directory as a ZIP archive and provide the ZIP as the final artifact.
## Structural Validation Before Completion
Validate structure only. Do not re-validate the technical content of the source documents.
Confirm all of the following:
- every Development Thread has exactly one document
- no source-undefined Thread was added
- no Thread was removed, merged, split, renamed, or reclassified
- commit order in every Thread matches the source
- every SHA is exact
- no importance grade changed
- no tag changed
- a commit belonging to multiple Threads was retained in each Thread
- S/A/B/C study depth is meaningfully differentiated
- learner-owned code analysis was not filled with an AI-generated answer
- every important commit gives sufficiently specific guidance about what to inspect at its SHA
- fix and regression-test relationships have a usable learning structure
- Markdown structure is valid
- README contains only the allowed study-set guidance
- the ZIP contains the complete directory structure and no unrelated artifacts
## Final Objective
The highest-priority outcome is a learning scaffold that, once completed by the learner using the actual commit code, enables the learner to explain the project's progression from design to implementation, failure, correction, and validation using commit-history evidence.
Do not replace that learning process with a finished AI-authored explanation.