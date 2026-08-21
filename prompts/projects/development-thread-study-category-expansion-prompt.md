# Development Thread Study Category Expansion

Use this prompt when a project already has one completed flat
`development-thread-workbook/scaffold` and
`development-thread-workbook/completed` pair, but the project's engineering
history is too broad to be represented adequately by that single workbook.

The purpose of this prompt is to introduce one category level between
`development-thread-workbook/` and the `scaffold/` / `completed/` directories.

This prompt does not complete newly created categories.

It:

1. determines what engineering area the existing workbook actually represents;
2. preserves that existing scaffold/completed pair unchanged as one category;
3. analyzes the complete target project history for materially important areas
   not adequately represented by that category;
4. defines additional categories where justified;
5. creates candidate scaffolds for the additional categories;
6. produces a category-structured workbook suitable for later category-specific
   scaffold refinement and completion.

## Configuration

Repository:

`<REPOSITORY>`

Branch:

`<BRANCH>`

Existing scaffold directory:

`<EXISTING_SCAFFOLD_DIR>`

Existing completed directory:

`<EXISTING_COMPLETED_DIR>`

Output workbook directory:

`<OUTPUT_WORKBOOK_DIR>`

Output archive:

`<OUTPUT_ZIP>`

Optional category scope constraints:

`<CATEGORY_SCOPE_CONSTRAINTS>`

Use `NONE` when no additional inclusion or exclusion rule is required.

Use only the specified repository and branch unless explicitly instructed
otherwise.

Do not commit, push, open a pull request, or otherwise modify the remote
repository.

# 1. Repository and Branch Scope

Treat `<BRANCH>` as the exclusive historical scope.

Inspect only commits reachable from `<BRANCH>`.

Do not borrow implementation, tests, documentation, configuration, commit
classification, or historical evidence from another branch.

Resolve the complete relevant root-to-head history before defining categories.

Do not derive category coverage from commit count alone.

Do not assume that every commit requires representation in a Development Thread.

Documentation-only maintenance, generated-only changes, trivial mechanical
changes, and other commits with no meaningful role in an engineering progression
may legitimately remain outside every Development Thread.

# 2. Existing Workbook Is a Fixed Historical Artifact

Treat the pair:

* `<EXISTING_SCAFFOLD_DIR>`
* `<EXISTING_COMPLETED_DIR>`

as an already finished workbook.

Inspect both directories completely before performing category planning.

Determine:

* which Development Threads they contain;
* which engineering problems those Threads reconstruct;
* which major project areas they cover;
* which commits they reference;
* which invariants, failures, fixes, tests, ownership changes, state transitions,
  or integration problems they explain.

Do not modify the contents of either existing directory.

Do not:

* add or remove existing Threads;
* split or merge existing Threads;
* rename existing Thread documents;
* change existing commit SHAs;
* change commit subjects;
* change importance levels;
* change tags;
* rewrite existing scaffold wording;
* rewrite existing completed answers.

The category layer may change the directory containing this pair.

It must not change the pair itself.

Before using the pair, validate that scaffold and completed files correspond
structurally.

If they are inconsistent, report the inconsistency rather than silently
repairing either directory.

# 3. Determine the Existing Category

Infer the narrowest useful category boundary that accurately describes the
existing workbook as a whole.

The category name must describe the engineering area reconstructed by the
existing Development Threads.

Do not name the category merely after:

* a directory;
* a framework;
* a language;
* one incidental subsystem;
* a single commit;
* an arbitrary generic label such as `core`.

Use the actual engineering concerns represented by the workbook.

Examples of possible category concepts include:

* foundations and API boundaries;
* persistence and data integrity;
* identity and account lifecycle;
* realtime state and session management;
* browser application architecture;
* runtime observability;
* verification and test architecture;
* deployment and release engineering.

These are examples only.

Do not force these categories onto an unrelated project.

## Category Ordering

Do not assume that the existing workbook becomes category `01`.

First determine the complete category set.

Then assign numeric prefixes according to the most defensible learning,
dependency, architectural, or development progression of the project.

The existing workbook may therefore naturally become:

* `01-...`
* `04-...`
* `05-...`
* or another position.

Its contents must remain unchanged regardless of its category number.

# 4. Project-Wide Coverage Analysis

After understanding the existing workbook, inspect the complete project and its
history as a whole.

Identify materially important engineering areas that are not adequately
reconstructed by the existing category.

Inspect as needed:

* source layout;
* application entry points;
* APIs;
* schemas;
* persistence code;
* migrations;
* authentication;
* authorization;
* state management;
* realtime behavior;
* networking;
* browser/client behavior;
* background processing;
* resource lifecycle;
* failure handling;
* recovery;
* observability;
* build rules;
* runtime configuration;
* tests;
* test infrastructure;
* deployment;
* service health;
* security-sensitive behavior;
* integration boundaries;
* major historical fixes and regressions.

The specific areas depend on the project.

Do not force irrelevant areas into the category system.

Apply `<CATEGORY_SCOPE_CONSTRAINTS>` when provided.

# 5. Category Design Rules

Create a new category only when the repository contains enough coherent
engineering history to justify studying it separately.

A category must represent a meaningful development area, not merely a convenient
folder grouping.

Prefer categories whose Development Threads share meaningful concerns such as:

* related invariants;
* related state ownership;
* related lifecycle behavior;
* related data consistency requirements;
* related security boundaries;
* related runtime responsibilities;
* related verification concerns.

Do not create categories merely to make them similar in size.

Do not impose a fixed category count.

Do not target equal commit counts.

Do not target equal Thread counts.

A small category may be valid when it contains an independent engineering story.

A large category may be valid when its Threads genuinely belong together.

## Separation Test

Two areas should normally be separate categories when understanding one does not
materially require reconstructing the detailed implementation progression of the
other.

Two areas should normally remain in the same category when separating them would
break important:

* Failure → Fix → Test chains;
* state-transition reasoning;
* ownership or lifecycle progression;
* persistence invariants;
* protocol progression;
* integration histories.

# 6. Category Coverage Is Not Commit Partitioning

Categories organize Development Threads, not raw commits.

Do not attempt to assign every repository commit to exactly one category.

A commit may be absent from all category scaffolds when it has no meaningful
learning role.

A commit may appear in multiple Threads or categories when the exact same
historical change materially participates in multiple independent engineering
stories.

Such duplication must be justified by distinct investigation purposes.

Do not duplicate commits simply to increase apparent coverage.

# 7. Detect Missing Development Threads

For every proposed additional category, inspect the repository history and
identify meaningful multi-commit engineering progressions.

A Development Thread should normally expose a progression such as:

```text
initial implementation
→ limitation
→ correction
→ verification
```

or:

```text
foundation
→ subsystem integration
→ failure discovered
→ ownership or state correction
→ regression protection
```

or:

```text
schema or state model
→ dependent implementation
→ consistency problem
→ migration or transactional correction
→ validation
```

Do not create a Thread merely because several commits modify the same directory
or subsystem.

A Thread must tell a coherent engineering story.

There is no fixed number of Threads per category.

# 8. Candidate Scaffold Generation

Create a candidate scaffold for every newly added category.

Do not create completed documents for new categories in this phase.

The candidate scaffold must be detailed enough to undergo repository-backed
refinement later.

For each category:

* create exactly one Markdown document per Development Thread;
* create a category `scaffold/README.md`;
* preserve actual commit SHAs;
* preserve actual commit subjects;
* use chronological and dependency-aware Thread ordering;
* assign importance levels conservatively;
* use a small stable tag vocabulary;
* identify each commit's role in its Thread;
* identify relevant invariants and engineering difficulties;
* provide concrete code-investigation targets where repository evidence supports
  them;
* leave learner-facing implementation answers unfinished.

## Importance

Use S/A/B/C according to project-wide engineering significance, not merely
importance within one category.

Do not promote commits merely because a newly created category needs an S-level
commit.

S must remain project-defining and selective.

Where an existing workbook already fixes metadata for a reused commit, preserve
that metadata unless the new Thread is explicitly using another already
authoritative classification source.

Do not silently create contradictory classifications for the same commit.

# 9. Investigation Quality

Avoid generic investigation prompts such as:

* inspect the implementation;
* review the changed code;
* understand how this works.

When repository evidence permits, direct the learner toward concrete:

* files;
* functions;
* classes;
* types;
* state fields;
* schemas;
* SQL statements;
* migrations;
* APIs;
* handlers;
* tests;
* scripts;
* configuration;
* build rules;
* workflow definitions.

For each important commit, make clear what should be reconstructed where
applicable:

* previous state;
* insufficiency of the previous implementation;
* selected implementation decision;
* ownership or lifetime;
* state transition;
* ordering requirement;
* cleanup behavior;
* failure path;
* retry behavior;
* non-guarantee;
* later correction;
* regression test;
* integration effect.

Do not fill the learner's final answers.

# 10. Category Index

Create `<OUTPUT_WORKBOOK_DIR>/README.md`.

This document exists only to define the category hierarchy.

For every category record:

* numeric order;
* category name;
* category purpose;
* principal engineering areas;
* relationship to neighboring categories;
* status.

Use one of these statuses:

```text
existing-completed
candidate-scaffold
```

The existing scaffold/completed pair must have status:

```text
existing-completed
```

Every newly generated category must have status:

```text
candidate-scaffold
```

Also state any deliberate scope exclusions caused by
`<CATEGORY_SCOPE_CONSTRAINTS>`.

Do not turn this README into a separate project tutorial.

# 11. Cross-Category Validation

After all categories and candidate scaffolds have been created, review the
category system as a whole.

Verify:

* the existing workbook belongs coherently to its assigned category;
* its files remain byte-for-byte unchanged where feasible;
* important project areas are not missing without explanation;
* new categories have distinct purposes;
* neighboring categories do not duplicate the same Development Threads;
* cross-category commit reuse is justified;
* no category exists only to balance size;
* category ordering is defensible;
* Development Threads remain coherent engineering stories;
* new scaffolds contain concrete repository-specific investigation tasks;
* S/A/B/C remains project-relative;
* learner-facing answers remain unfinished;
* all referenced SHAs belong to `<BRANCH>`;
* no evidence was borrowed from another branch.

If a category boundary remains ambiguous, choose the most defensible structure
from repository evidence and record the ambiguity in the category index.

# 12. Output Structure

Produce:

```text
<OUTPUT_WORKBOOK_DIR>/
├── README.md
├── <NN-existing-category>/
│   ├── scaffold/
│   │   ├── README.md
│   │   └── ...
│   └── completed/
│       ├── README.md
│       └── ...
├── <NN-new-category>/
│   └── scaffold/
│       ├── README.md
│       └── ...
├── <NN-new-category>/
│   └── scaffold/
│       ├── README.md
│       └── ...
└── ...
```

Do not create `completed/` directories for newly generated categories unless
explicitly instructed otherwise.

The existing category must contain both its original scaffold and completed
directories.

# 13. Packaging

Create `<OUTPUT_ZIP>` containing the complete category-structured workbook.

Include only:

* the category index;
* the preserved existing category scaffold;
* the preserved existing category completed workbook;
* candidate scaffolds for newly created categories.

Do not include:

* `.git`;
* source code;
* temporary analysis files;
* intermediate reports;
* worktrees;
* binaries;
* build artifacts;
* test output;
* unrelated documentation.

# 14. Final Objective

The resulting structure should transform:

```text
development-thread-workbook/
├── scaffold/
└── completed/
```

into a project-appropriate hierarchy:

```text
development-thread-workbook/
├── README.md
├── <category>/
│   ├── scaffold/
│   └── completed/
├── <category>/
│   └── scaffold/
└── ...
```

without rewriting the already completed workbook.

The existing workbook becomes one category within a broader study model.

The newly identified categories remain candidate scaffolds until each is audited,
refined, frozen, and completed by the category refinement and completion phase.
