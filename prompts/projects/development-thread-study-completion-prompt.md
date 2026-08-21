# Development Thread Study Completion

Complete the project's development-thread workbook by reconstructing the implementation history from the actual repository.

## Configuration

Repository:

`<REPOSITORY>`

Branch:

`<BRANCH>`

Scaffold directory:

`<SCAFFOLD_DIR>`

Completed directory:

`<COMPLETED_DIR>`

Output archive:

`<OUTPUT_ZIP>`

Use only the specified repository and branch unless explicitly instructed otherwise.

## Repository and branch scope

Treat `<BRANCH>` as the exclusive historical scope for repository inspection.

Inspect only commits reachable from `<BRANCH>`.

Do not inspect, compare against, or borrow implementations, tests, documentation, or build logic from another branch, even if related code exists elsewhere in the same repository.

Before relying on a referenced commit SHA, verify that it belongs to the ancestry of `<BRANCH>`.

If a scaffold SHA cannot be resolved within the specified branch history, report it as a validation problem rather than searching another branch for an equivalent implementation.

## Source of truth

Treat the files under `<SCAFFOLD_DIR>` as authoritative for the workbook structure and all information already fixed there.

Do not change or reinterpret:

- Development Threads
- document structure
- commit SHAs
- commit order
- commit subjects
- importance levels
- tags
- source-defined commit roles
- source-defined invariants or engineering difficulties

Do not add, remove, merge, split, rename, or reorder threads.

Treat `<COMPLETED_DIR>` as a completed copy of `<SCAFFOLD_DIR>`.

Preserve all scaffold filenames and all already completed scaffold content.

Fill only learner-facing unfinished sections.

Do not rewrite fixed scaffold text merely to improve wording, organization, style, or technical explanation.

If repository evidence appears inconsistent with fixed scaffold information, do not silently alter the scaffold. Preserve the fixed information and record the observed discrepancy in the relevant learner-facing section.

## Historical inspection rule

For every referenced commit, inspect the repository at that exact SHA.

Do not use final HEAD code to explain an earlier commit.

When necessary, compare the commit with its parent or with an earlier related SHA identified by the workbook.

Use historical Git inspection such as:

- `git show <sha>`
- `git diff <parent> <sha>`
- `git show <sha>:<path>`
- detached checkouts
- temporary worktrees

Any implementation claim must be supported by code that exists at the SHA being discussed.

Do not infer an earlier implementation from code introduced by a later commit.

## Complete the workbook

Fill the incomplete learning sections using concrete repository evidence.

Depending on the commit and the questions already present in the scaffold, reconstruct:

- the state before the commit
- the problem being solved
- why the previous state was insufficient
- the implementation decision
- changed files and functions
- caller/callee relationships
- ownership and lifetime
- state transitions
- resource acquisition and cleanup
- failure branches
- arithmetic or range reasoning
- retry or progress behavior
- relevant tests
- what the commit guarantees
- what it does not guarantee
- its relationship to later related commits

Do not replace repository-specific investigation with generic explanations of how such a feature is normally implemented.

When a scaffold section asks the learner to inspect something concrete, answer it using evidence from the corresponding historical SHA rather than replacing the section with a general summary.

If a section is genuinely not applicable after repository inspection, state that briefly and explain why instead of leaving it silently unfinished.

## Evidence discipline

Make concrete implementation findings traceable to historical evidence.

Where useful, identify the relevant:

- commit SHA
- file path
- function
- test
- Make target
- script
- build rule
- other meaningful implementation location

Do not claim that a function, cleanup path, retry rule, test technique, ownership transfer, failure mechanism, or build behavior exists unless it is present at the SHA being discussed.

Distinguish clearly between:

- facts directly established by repository inspection
- conclusions reconstructed from multiple historical states
- runtime evidence produced by commands actually executed

Do not present inference as directly observed code.

## Importance depth

Preserve the importance levels defined by the scaffold.

For **S-level** commits, reconstruct the major architecture or invariant deeply, including:

- previous state
- problem and failure risk
- core implementation decision
- relevant implementation path
- ownership, lifecycle, or state changes
- failure handling
- later fix or verification
- what the resulting invariant means for the rest of the thread

For **A-level** commits, inspect the significant subsystem, design decision, implementation path, and relevant failure, ownership, arithmetic, portability, or integration concerns.

For **B-level** commits, explain the concrete implementation role and the code/state changes necessary to understand its place in the thread.

For **C-level** commits, include only the context necessary for the thread unless the scaffold explicitly asks for more.

Do not artificially give every commit the same depth.

## Fix commits

Treat fixes as corrections to an earlier assumption or implementation.

Where applicable, reconstruct:

previous assumption

→ actual failure or risk

→ root cause

→ corrected invariant or decision

→ changed code

→ regression evidence

Inspect both the earlier and corrected historical states when necessary.

Do not describe a fix as an unrelated new feature.

## Test commits

For test commits, distinguish:

- the production invariant being tested
- the failure or boundary being reproduced
- the test technique
- the production code path exercised
- what the test proves
- what it does not prove
- whether it is broad integration evidence, deterministic regression evidence, differential testing, boundary testing, sanitizer evidence, release verification, or another justified category
- which regression it is intended to prevent

Base this on the actual test implementation at that SHA.

Do not infer the test mechanism only from its commit message or subject.

## Failure injection

When the repository contains deterministic failure injection, inspect the mechanism itself.

Explain:

- how the failure is introduced
- which call or acquisition attempt is made to fail
- what state is observed
- which production path is exercised
- how cleanup or retry behavior is measured
- how leaks, invalid frees, duplicate work, zero progress, permanent errors, source mutation, or other relevant effects are detected

Do not infer these details only from commit messages.

## Code evidence

Include actual code excerpts only when they materially help reconstruct the design, state transition, ownership rule, failure behavior, or test mechanism.

Keep excerpts minimal.

For each excerpt, identify the relevant:

- commit SHA
- file path
- function or location

Never insert code from a later commit into an earlier commit's section.

Do not turn the workbook into a source-code dump.

## Tests and commands

Run relevant tests or verification commands when feasible and useful.

When recording runtime evidence, include:

- exact commit SHA
- exact command
- relevant result

Never fabricate execution results.

If a command cannot be executed because of environment, platform, unavailable tooling, unsupported sanitizer, missing system utility, or another external limitation, distinguish clearly between:

- what was verified by code inspection
- what was actually executed
- what could not be executed and why

Do not mark an execution-oriented checklist item as completed unless the corresponding command or equivalent verification was actually performed.

## Thread-level completion

Complete the thread-level sections already defined by the scaffold, including where applicable:

- invariant evolution
- Failure → Fix → Test relationships
- ownership/state/responsibility changes
- final thread state
- final architecture or execution flow
- learning-completion checks

Reconstruct these sections from the historical sequence.

Do not derive the entire thread explanation from final HEAD and then project that design backward onto earlier commits.

For invariant evolution, distinguish where an invariant was:

- introduced
- extended
- shown to be insufficient
- corrected
- deterministically verified
- protected by later regression or release checks

Only record such transitions when supported by the scaffold and repository history.

## Completed directory rules

Create the completed workbook under `<COMPLETED_DIR>`.

Start from the exact file set present in `<SCAFFOLD_DIR>`.

The completed directory must contain exactly the corresponding scaffold workbook files, including `README.md` when it exists in the scaffold.

Preserve:

- filenames
- relative paths
- thread count
- document structure

Do not create additional explanatory Markdown documents unless the scaffold explicitly requires them.

Do not modify `<SCAFFOLD_DIR>`.

If `<COMPLETED_DIR>` contains placeholder files such as `.gitkeep`, exclude those placeholders from the completed deliverable once real workbook files are present unless they also exist in the scaffold source set.

Do not include temporary inspection files, generated test artifacts, binaries, object files, sanitizer output, worktrees, or repository metadata in `<COMPLETED_DIR>`.

## Completion validation

Before packaging, verify structural and historical consistency.

Confirm that:

- every scaffold thread has exactly one completed document
- no extra thread exists
- filenames and relative paths match the scaffold
- `README.md` is preserved when present
- commit SHAs are unchanged
- every referenced SHA belongs to the specified branch history
- commit order is unchanged
- commit subjects are unchanged
- importance values are unchanged
- tags are unchanged
- fixed scaffold roles and invariants were not reinterpreted
- historical claims refer to the correct SHA
- later code was not retroactively used to explain earlier commits
- test results were not fabricated
- execution claims distinguish actual execution from inspection
- unfinished learner-facing sections have been addressed
- S/A/B/C depth remains meaningfully differentiated
- fix commits are connected to the assumptions or failures they correct
- regression and failure-injection tests are connected to the production behavior they verify
- Markdown remains valid
- `<SCAFFOLD_DIR>` was not modified

Validation is for structural and historical consistency, not for redefining the scaffold's authoritative classifications.

## Packaging

Create `<OUTPUT_ZIP>` with `<COMPLETED_DIR>` as the single top-level workbook directory.

The archive should have the conceptual structure:

```text
<COMPLETED_DIR>/
├── README.md
├── 01-...
├── 02-...
└── ...
```

Include only files belonging to the completed workbook.

Do not package:

- `<SCAFFOLD_DIR>`
- `.git`
- repository source files
- temporary worktrees
- build artifacts
- test binaries
- generated sanitizer or coverage files
- unrelated documentation

## Deliverable

Create `<OUTPUT_ZIP>` containing the completed workbook directory and return it as the final downloadable artifact.

Do not merely describe how to complete the workbook.

Inspect the repository, reconstruct the historical implementation, complete the files, validate the result, and provide the ZIP.

Do not commit, push, open a pull request, or otherwise modify the remote repository unless explicitly requested.
