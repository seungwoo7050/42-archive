# Development Thread Study Category Refinement and Completion

Use this prompt to refine and complete one Development Thread category whose
current scaffold is still a candidate scaffold.

This prompt has two strictly sequential phases:

1. repository-backed category scaffold refinement;
2. completion of the frozen refined scaffold.

The governing completion rules come from:

`<BASE_COMPLETION_PROMPT>`

The normal value is:

```text
prompts/projects/development-thread-study-completion-prompt.md
```

Read `<BASE_COMPLETION_PROMPT>` completely before starting.

## Configuration

Base completion prompt:

`<BASE_COMPLETION_PROMPT>`

Repository:

`<REPOSITORY>`

Branch:

`<BRANCH>`

Category:

`<CATEGORY_NAME>`

Candidate category scaffold:

`<CATEGORY_SCAFFOLD_DIR>`

Optional category index:

`<CATEGORY_INDEX_PATH>`

Refined scaffold directory:

`<REFINED_SCAFFOLD_DIR>`

Completed directory:

`<COMPLETED_DIR>`

Output archive:

`<OUTPUT_ZIP>`

Use `NONE` for `<CATEGORY_INDEX_PATH>` when no category index is supplied.

Use only the specified repository and branch unless explicitly instructed
otherwise.

Do not commit, push, open a pull request, or otherwise modify the remote
repository.

# 1. Relationship to the Base Completion Prompt

`<BASE_COMPLETION_PROMPT>` remains authoritative for workbook completion.

However, its scaffold-immutability rules begin only after Phase A of this prompt
has finished.

During Phase A:

* `<CATEGORY_SCAFFOLD_DIR>` is a candidate scaffold;
* its Thread structure and commit selection may be corrected when repository
  evidence justifies the correction.

At the end of Phase A:

* freeze the entire refined scaffold;
* treat `<REFINED_SCAFFOLD_DIR>` as the authoritative scaffold.

During Phase B:

* apply `<BASE_COMPLETION_PROMPT>` to that frozen scaffold exactly;
* do not modify it again.

This phase boundary is mandatory.

# 2. Repository and Branch Scope

Treat `<BRANCH>` as the exclusive historical scope.

Inspect only commits reachable from `<BRANCH>`.

Before retaining or adding a SHA, verify that it belongs to the ancestry of the
specified branch.

Do not:

* substitute another branch;
* borrow code from another branch;
* use another branch to fill missing history;
* use final HEAD code as evidence for an earlier historical state.

For every historical claim, inspect the repository state that actually existed
at the relevant SHA.

# 3. Category Boundary

If `<CATEGORY_INDEX_PATH>` is supplied, read the category definition before
modifying the candidate scaffold.

Treat the category purpose and boundary defined there as fixed for this task.

Phase A may refine Development Threads inside the category.

Phase A must not redesign the project-wide category system.

Do not silently move work into another category.

If repository evidence shows that:

* a Thread belongs primarily to another category;
* a missing Thread belongs primarily to another category;
* two category boundaries substantially overlap;

record the problem separately in the final validation report.

Do not modify another category.

If no category index is supplied, infer the intended category boundary from
`<CATEGORY_NAME>` and the candidate scaffold, then keep that boundary stable
throughout this task.

# 4. Phase A — Category Scaffold Audit and Refinement

Before applying scaffold immutability, treat every Development Thread under
`<CATEGORY_SCAFFOLD_DIR>` as a candidate.

Review the entire category against the actual repository history.

The purpose of Phase A is not stylistic rewriting.

The purpose is to make the category scaffold historically accurate,
appropriately scoped, and sufficiently specific for serious repository-based
study.

## 4.1 Category-Level Review

Verify:

* the category covers its intended engineering area adequately;
* no materially necessary Development Thread is missing;
* no Thread exists without a coherent engineering progression;
* Thread boundaries are meaningful;
* Thread ordering is defensible;
* unnecessary overlap is removed;
* independent engineering stories are not incorrectly combined.

There is no fixed required number of Threads.

Do not preserve a bad batch-generated Thread split merely because it already
exists.

Do not change the scaffold merely to make documents similar in size.

## 4.2 Allowed Thread Changes

When actual repository history clearly justifies it, Phase A may:

* add a Thread;
* remove a Thread;
* split a Thread;
* merge Threads;
* rename a Thread;
* reorder Threads;
* change Thread start or end points;
* move commits between Threads inside this category.

Every structural change must improve historical or engineering accuracy.

Do not make structural changes merely for wording, aesthetics, or symmetry.

## 4.3 Commit Verification

For every retained or added commit:

* verify the SHA;
* verify branch membership;
* verify the exact commit subject;
* inspect the actual diff;
* inspect parent or surrounding historical states when required;
* verify chronological and dependency relationships;
* verify its material role in the Thread.

Do not infer commit significance from:

* subject alone;
* file names alone;
* diff size;
* LOC;
* final HEAD behavior.

## 4.4 Commit Selection

Add materially necessary commits when repository evidence shows that the
candidate scaffold skips an important step such as:

* initial implementation;
* intermediate implementation;
* integration;
* ownership transfer;
* lifecycle change;
* persistence change;
* state transition;
* failure handling;
* root-cause fix;
* regression;
* deterministic test;
* integration test;
* migration;
* cleanup correction;
* retry or recovery behavior.

Remove commits that do not materially contribute to the Thread's engineering
progression.

Do not retain low-value commits merely because the candidate scaffold contains
them.

Do not add commits merely to increase history coverage.

## 4.5 Importance and Tags

Review importance levels and tags against the actual repository evidence and
project-wide significance.

Preserve meaningful S/A/B/C differentiation.

S remains selective.

Do not raise a commit merely because:

* it belongs to an important category;
* it belongs to an important Thread;
* its diff is large;
* its implementation was difficult;
* the category would otherwise contain no S-level commit.

Tags describe the nature of significance.

Tags do not determine significance.

## 4.6 Thread Relationships

Where supported by repository evidence, make historical relationships explicit:

```text
previous state
→ implementation
→ limitation
→ failure
→ correction
→ regression test
```

or other relevant progressions involving:

* ownership;
* lifetime;
* state;
* transactions;
* protocol transitions;
* cleanup;
* authorization;
* persistence;
* retry behavior;
* integration;
* resource lifecycle.

Do not invent a failure or failed approach merely to create a more interesting
story.

# 5. Investigation Quality

Replace generic candidate-scaffold wording with concrete repository-specific
investigation tasks.

Where repository evidence supports it, identify:

* file paths;
* functions;
* classes;
* types;
* fields;
* schemas;
* SQL statements;
* migrations;
* handlers;
* routes;
* tests;
* fixtures;
* scripts;
* configuration;
* workflow files;
* build rules;
* runtime rules.

For important commits, direct the learner to reconstruct applicable aspects such
as:

* state immediately before the commit;
* problem being addressed;
* why the previous implementation was insufficient;
* implementation decision;
* state mutation;
* ownership and lifetime;
* resource acquisition and cleanup;
* failure branches;
* ordering;
* arithmetic or range behavior;
* retry and progress behavior;
* guarantees;
* non-guarantees;
* later correction;
* regression evidence.

Do not fill learner-facing answers during Phase A.

# 6. S/A/B/C Investigation Depth

Preserve materially different investigation depth.

## S — Critical

Require enough investigation to reconstruct the major architecture, mechanism,
or invariant, including where applicable:

* previous state;
* core problem;
* failure risk;
* major implementation decision;
* relevant code path;
* ownership, lifecycle, or state changes;
* failure behavior;
* later correction;
* verification;
* impact on subsequent development.

## A — Significant

Require concrete inspection of the major subsystem decision, implementation
path, and important failure, ownership, persistence, portability, security,
arithmetic, lifecycle, or integration concerns.

## B — Normal

Require enough investigation to understand the commit's concrete implementation
role and its place in the Thread.

## C — Minor

Include only context materially needed by the Thread unless deeper treatment is
specifically justified.

Do not mechanically give every commit the same questionnaire.

# 7. Phase A Validation

Before freezing the scaffold, review the complete category again.

Confirm:

* the category boundary is preserved;
* every Thread represents a coherent engineering progression;
* important category work is not omitted without justification;
* independent stories are not improperly merged;
* duplicated responsibility between Threads is minimized;
* all referenced SHAs belong to `<BRANCH>`;
* commit subjects are exact;
* chronological relationships are correct;
* fix commits connect to the implementations or assumptions they correct;
* test commits connect to the behavior they verify;
* importance and tags are defensible;
* investigation tasks are repository-specific;
* learner-facing answers remain unfinished;
* no work was silently transferred to another category.

Write the complete refined scaffold to:

`<REFINED_SCAFFOLD_DIR>`

Once this validation succeeds, freeze the entire directory.

From this point onward:

`<REFINED_SCAFFOLD_DIR>` is authoritative.

Do not modify it again.

# 8. Phase B — Category Completion

Apply `<BASE_COMPLETION_PROMPT>` exactly to the frozen
`<REFINED_SCAFFOLD_DIR>`.

For Phase B, interpret the base prompt configuration as:

```text
Repository:
<REPOSITORY>

Branch:
<BRANCH>

Scaffold directory:
<REFINED_SCAFFOLD_DIR>

Completed directory:
<COMPLETED_DIR>
```

All base-prompt rules concerning preservation of:

* Development Threads;
* filenames;
* document structure;
* commit SHAs;
* commit order;
* commit subjects;
* importance levels;
* tags;
* commit roles;
* invariants;
* engineering difficulties;

apply to the frozen Phase A result.

No Phase A structural freedom remains during Phase B.

# 9. Historical Completion Rules

Inspect every referenced commit at its exact historical SHA.

Do not use final HEAD code to explain an earlier commit.

When required, inspect:

* the parent state;
* preceding relevant SHA;
* corrected SHA;
* regression-test SHA;
* related integration state.

Fill learner-facing unfinished sections using actual repository evidence.

Distinguish:

* directly observed historical code;
* conclusions reconstructed from multiple historical states;
* runtime evidence from commands actually executed.

Do not fabricate execution evidence.

# 10. Tests and Verification

Run relevant tests or verification commands only when feasible and useful.

Record only commands actually executed.

For execution evidence, preserve:

* exact SHA;
* exact command;
* relevant result.

If execution is impossible because of platform, dependencies, unavailable
tooling, environment restrictions, or another external reason, state the
limitation.

Do not convert code inspection into a claim that a runtime test passed.

# 11. Phase B Validation

Before packaging, verify:

* every frozen scaffold Thread has exactly one completed counterpart;
* scaffold/completed filenames match;
* relative paths match;
* no extra completed Thread exists;
* no frozen Thread is missing;
* commit SHAs remain unchanged;
* commit order remains unchanged;
* commit subjects remain unchanged;
* importance remains unchanged;
* tags remain unchanged;
* fixed scaffold roles and invariants remain unchanged;
* historical explanations refer to the correct SHA;
* later code was not projected backward;
* fixes are connected to the earlier behavior they correct;
* tests are connected to the production behavior they verify;
* unfinished learner-facing sections have been addressed or explicitly marked
  not applicable with an explanation;
* S/A/B/C depth remains meaningfully differentiated;
* execution evidence is not fabricated;
* `<REFINED_SCAFFOLD_DIR>` remained unchanged throughout Phase B.

# 12. Packaging

Create `<OUTPUT_ZIP>` with this structure:

```text
<CATEGORY_NAME>/
├── scaffold/
│   ├── README.md
│   └── ...
└── completed/
    ├── README.md
    └── ...
```

The `scaffold/` directory in the archive must be the exact frozen Phase A
result.

The `completed/` directory must be the Phase B completed counterpart.

Include only this category.

Do not include:

* candidate scaffold files superseded by Phase A;
* `.git`;
* repository source files;
* temporary worktrees;
* build artifacts;
* binaries;
* test output;
* intermediate reports;
* unrelated categories.

# 13. Final Deliverable

Return `<OUTPUT_ZIP>` containing:

1. the authoritative refined scaffold used for Phase B;
2. its completed counterpart.

Do not merely describe the refinement or completion.

Perform both phases sequentially.

Do not modify the remote repository.
