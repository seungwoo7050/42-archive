# Standalone Exercises Reconstruction

## Target

Repository:

`https://github.com/seungwoo7050/guides`

Target branch:

`<TARGET_BRANCH>`

Primary target:

`exercises/`

Work on the specified branch only. Do not inspect, compare with, or use any other branch.

---

# Objective

Reconstruct the branch's current `exercises/` directory under a new and strict definition:

> An exercise is not an assignment, a starter project, a learner workspace, or a problem with an answer.
>
> Each `exercises/<project>/` directory must be a completed implementation artifact that can be treated as a small standalone public repository.

Project size is irrelevant.

A very small program may remain an independent exercise if it has a clear purpose and represents a meaningful completed implementation.

The resulting `exercises/` directory should contain completed projects, not an educational scaffolding system.

---

# 1. Language Policy

This policy is strict.

## English

Perform all of the following in English:

* analysis;
* architectural reasoning;
* exercise classification;
* project-boundary decisions;
* source-code construction;
* filenames;
* directory names;
* identifiers;
* API names;
* protocol names;
* build configuration;
* test names;
* technical anchors;
* Implementation Order labels;
* Implementation Order descriptions;
* final work summary.

All `[Implementation N]` source annotations must be in English.

## Korean

Korean may be used only for:

1. explanatory prose inside exercise documentation such as `README.md`;
2. selective source comments that explain non-obvious rationale, invariants, ownership, ordering constraints, failure-state guarantees, or intentional limitations.

Do not translate established identifiers, symbols, filenames, API names, protocol names, command names, or technical terms merely to make the surrounding sentence fully Korean.

Prefer natural Korean technical prose such as:

```text
Connection이 socket과 pending output buffer의 수명을 소유한다.
```

over forced translations of established technical terminology.

Do not use special tags such as:

```text
[Learning]
[Explanation]
[Tutorial]
```

for Korean comments.

Only `[Implementation N]` is a special source annotation.

---

# 2. Scope

You may read:

* the complete current `exercises/` directory;
* `docs/` only when necessary to understand the intended concept, domain, or exercise scope;
* existing completed/reference implementations necessary to reconstruct the final project;
* build and test files necessary to understand how the current implementation works.

You may write or modify:

* `exercises/` only.

Do not modify:

* `docs/`;
* the root `README.md`;
* root-level scripts;
* repository-level verification infrastructure;
* root build configuration;
* any other directory.

Broken links outside `exercises/` caused by renamed, merged, removed, or flattened exercise paths are explicitly out of scope.

Do not spend effort repairing those links.

The quality of the reconstructed `exercises/` projects takes priority over repository-wide link compatibility.

---

# 3. New Definition of `exercises/`

The old educational model is discarded.

Do not preserve this model:

```text
problem
→ skeleton
→ learner workspace
→ verifier
→ reference answer
```

The new model is:

```text
docs/
    concepts and explanations

exercises/
    completed standalone implementations
```

Each direct project directory under `exercises/` should feel like a repository that could be published independently.

A visitor entering:

```text
exercises/<project>/
```

must encounter a completed project, not a lesson-management system.

---

# 4. Existing Exercise Boundaries Have No Preservation Value

Do not preserve a directory merely because the current repository calls it a separate exercise.

Existing exercise boundaries are evidence about the current curriculum, not authoritative project boundaries.

Determine boundaries from the identity of the final implemented artifact.

Ask:

> Is this a different completed program or system, or merely another stage in the construction of the same final artifact?

If multiple current exercises are successive versions of the same program, merge them.

For example:

```text
01-parser
02-router
03-nonblocking-server
04-cgi
05-integrated-server
```

should become one project if they are successive stages of the same final HTTP server:

```text
exercises/http-server/
```

Do not preserve intermediate snapshots.

Preserve their meaningful engineering responsibilities through the final source code and project-wide Implementation Order.

Conversely, keep projects separate when they have genuinely independent purposes, interfaces, behaviors, or final artifacts, even when they are small.

---

# 5. Classify the Current Exercises

Before reconstructing anything, internally classify every current exercise or stage as one of:

### KEEP

Already represents a meaningful independent completed project.

Keep its topic, but reconstruct its directory under the new standalone-project rules.

### MERGE

Represents a stage or partial snapshot of a larger final project.

Merge all such stages into the final standalone project.

### RECAST

The underlying subject is valuable, but the current presentation is framed as an assignment, observation task, learner exercise, or educational harness.

Retain the useful implementation artifact and present it as an actual project.

For example, a network observation exercise containing a real capture/analyzer utility may become a standalone network analysis project rather than an instruction to "observe the following behavior."

### REMOVE

The entry has no independent implementation value after another project already contains its meaningful functionality.

Do not retain redundant snapshots merely for curriculum symmetry.

### EXCLUDE FROM EXERCISES

The entry consists primarily of:

* worksheet answers;
* expected-evidence documents;
* scenario responses;
* manually completed questionnaires;
* plans;
* review answers;
* synthetic answer files;
* educational-only artifacts;

and does not itself constitute an implemented, executable, reusable, or operationally meaningful standalone artifact.

Do not invent a fake project simply to preserve such an entry.

Because writing outside `exercises/` is forbidden, simply omit it from the replacement.

Report the omission in the final summary.

---

# 6. What Qualifies as a Standalone Project

A project does not have to be a conventional application.

The following may qualify:

* CLI application;
* library;
* parser;
* simulator;
* data structure implementation;
* state machine;
* network utility;
* protocol analyzer;
* reproducible systems experiment;
* deployment tool;
* backup/restore utility;
* infrastructure automation tool;
* database implementation;
* server;
* browser application;
* testing utility;
* operational tool.

However, the directory must contain a real completed artifact.

A completed YAML worksheet, answer document, expected-evidence response, or manually filled scenario report alone is not enough.

Do not preserve an item as a project merely because the current curriculum gives it an exercise number.

---

# 7. Prefer Artifact Identity Over Curriculum Categories

Curriculum directories should not define the project hierarchy unless they are genuinely part of the project identity.

Prefer:

```text
exercises/
├── number-report/
├── owned-string/
├── command-pipeline/
├── http-server/
└── account-simulator/
```

over:

```text
exercises/
├── 01-foundations/
├── 02-language/
├── 03-systems/
└── 04-concurrency/
```

when the latter directories exist only to mirror the order of `docs/`.

Learning order belongs to documentation.

`exercises/` should expose project identity.

Do not flatten directories when a nested structure is genuinely part of one project's architecture.

---

# 8. Completed Source Only

Each final project should contain only files that belong to the completed project itself.

## Allowed

Depending on the technology:

* `README.md`;
* completed source code;
* public headers;
* `Makefile`;
* `CMakeLists.txt`;
* `package.json`;
* `pyproject.toml`;
* lockfiles when appropriate for reproducibility;
* `tsconfig.json`;
* `Dockerfile`;
* `compose.yaml`;
* migrations;
* runtime configuration;
* tests that are genuinely part of project quality;
* minimal sample data or fixtures required by normal project execution or tests;
* other files genuinely required to build, run, or verify the standalone project.

## Remove

Remove educational and repository-maintenance scaffolding such as:

* `skeleton/`;
* `workspace/`;
* `work/`;
* `reference/`;
* `reference.patch`;
* `patches/`;
* `walkthrough-base/`;
* answer/solution directories;
* learner templates;
* stage snapshots;
* educational mutation tests;
* maintainer-only checkers;
* repository-wide verification helpers;
* source-state capture tools;
* generated artifacts;
* caches;
* dependency directories;
* build outputs.

Do not remove tests merely because they were previously used by an exercise verifier.

If a test is a useful normal project test, retain or rewrite it as part of the standalone project.

---

# 9. Reconstruct From the Best Existing Implementation

Use the current repository's completed implementation as the technical source of truth whenever available.

When the current structure contains:

```text
skeleton/
reference/
tests/
```

the final standalone project should normally be reconstructed from the completed implementation and useful project tests, not from the skeleton.

However:

* do not blindly copy the old directory structure;
* do not retain learner-management concepts;
* do not preserve intermediate stages;
* do not reduce technically valid behavior without reason;
* do not fabricate functionality merely to make a project appear larger.

For cumulative projects, identify the most complete final implementation and incorporate unique responsibilities from earlier stages where they remain architecturally meaningful.

---

# 10. Project-Wide Implementation Order

Every final exercise project must expose a single global Implementation Order covering the whole project.

This is not:

* file order;
* function order;
* class order;
* Git commit history;
* the old exercise-stage numbering.

It is a reconstructed, architecture-driven construction sequence.

The sequence must represent how a competent developer could build the completed project from zero to the final design.

It must cross file boundaries.

Example:

```text
Implementation 1     Request model
Implementation 2     Incremental parser state
Implementation 2-1   Request-line parsing
Implementation 2-2   Header validation
Implementation 2-3   Body framing
Implementation 3     Router model
Implementation 4     Connection ownership
Implementation 5     Non-blocking input
Implementation 6     Non-blocking output
Implementation 7     Event polling
Implementation 8     CGI lifecycle
Implementation 9     Integrated server composition
```

The same global numbering continues regardless of which source file contains the responsibility.

Never restart the sequence for each file.

---

# 11. What Deserves an Implementation Number

Create a new major Implementation number when a meaningful engineering responsibility is introduced, such as:

* core domain/data model;
* state ownership;
* public contract;
* parser state;
* important invariant;
* major validation boundary;
* algorithm;
* persistence model;
* resource lifecycle;
* concurrency boundary;
* protocol state;
* external-system adapter;
* transaction boundary;
* integration/composition boundary;
* meaningful verification layer.

Use substeps when one responsibility naturally consists of several implementation boundaries:

```text
Implementation 4
Implementation 4-1
Implementation 4-2
```

Do not assign numbers to trivial helper functions merely because they exist.

Implementation numbers describe engineering responsibilities, not source-code granularity.

# 11A. Meaningful Development-Time Commands

Implementation Order may include development-time CLI steps when the command establishes, generates, or transforms a persistent and architecturally meaningful part of the final project.

Examples include:

* project or workspace scaffolding that establishes a meaningful package, runtime, or build boundary;
* database migration initialization or migration generation;
* schema-driven code generation;
* protocol/interface generation such as Protobuf, OpenAPI, or similar tooling;
* framework generators that create persistent project structure subsequently maintained as part of the implementation;
* commands that materialize or update required project metadata or artifacts whose state is part of the completed project.

Do not include ordinary shell usage or mechanically reproducible commands that carry no meaningful implementation responsibility, such as:

* creating directories;
* copying or moving files;
* installing dependencies;
* invoking the ordinary build;
* running tests;
* generating a lockfile;
* starting the application;
* generic package-manager usage.

The Implementation step should describe the engineering responsibility or persistent project transition, while preserving the concrete CLI command when that command is necessary to reproduce the step.

For example:

```text
Implementation 0     Application workspace scaffold
                     `npx create-next-app@latest ...`

Implementation 3     Database migration baseline
                     `prisma migrate dev --name initial-schema`

Implementation 5     API client generation
                     `openapi-generator-cli generate ...`
```

Do not assign an Implementation number merely because a command was executed during development. The command must correspond to a meaningful, persistent step in constructing the completed project.

---

# 12. `Implementation 0`

Use:

```text
[Implementation 0]
```

only when the initial bootstrap establishes a meaningful architectural or persistent project boundary.

Examples:

* workspace/package boundary;
* build-target architecture;
* application composition root;
* dependency ownership;
* process/runtime boundary;
* meaningful framework or workspace scaffolding whose generated structure becomes part of the maintained project.

Do not use Implementation 0 for ordinary actions such as:

* creating a directory;
* installing dependencies;
* generating a lockfile;
* generic package-manager usage.

When a bootstrap CLI is included, the Implementation responsibility must describe what architectural or persistent project structure it establishes, not merely the fact that the command was executed.

If bootstrap contains no meaningful engineering responsibility, start at Implementation 1.

---

# 13. Source-Level Implementation Annotations

Place the Implementation annotation at the exact source location where the responsibility is established.

Example:

```cpp
// [Implementation 6]
// Connection becomes the sole owner of the socket and pending I/O state.
class Connection {
```

Another file may continue:

```cpp
// [Implementation 9]
// Event readiness is coordinated without transferring descriptor ownership
// away from Connection.
void Server::run() {
```

Annotations must be:

* concise;
* technical;
* written in English;
* architecture-oriented;
* globally ordered across the project.

Do not turn these annotations into tutorials.

Do not explain basic syntax.

Do not annotate every function.

For formats that do not allow comments, such as JSON, do not insert invalid comments.

Represent those steps only in the README Implementation Order table.

---

# 14. Selective Rationale and Invariant Comments

In addition to the mandatory English Implementation annotations, add ordinary Korean source comments only when they materially improve understanding of non-obvious code.

Good reasons to add a Korean rationale comment include:

### Invariant

Why a state combination must never occur.

### Ownership

Who owns and releases:

* memory;
* file descriptors;
* sockets;
* timers;
* processes;
* transactions;
* resources.

### Ordering constraint

Why operation A must happen before operation B.

### Failure-state guarantee

What is allowed to remain when a multi-step operation fails.

### Non-obvious algorithm

Why the implementation takes this form.

### Protocol rule

Why a specific validation, byte order, sequence, or state transition is necessary.

### Performance decision

Why a less obvious structure avoids a real performance problem.

### Intentional limitation

Why the implementation deliberately does not support a broader behavior.

Example:

```cpp
// 출력할 데이터가 있을 때만 writable interest를 등록한다.
// 항상 writable인 socket을 계속 감시하면 event loop가 불필요하게 반복될 수 있다.
poller.setWritable(fd, !connection.outputEmpty());
```

Do not add comments that merely restate:

* variable names;
* function names;
* obvious branches;
* loops;
* syntax;
* trivial assignments.

The goal is production-quality annotated source, not a textbook embedded inside the code.

---

# 15. README Policy

Every final `exercises/<project>/README.md` must read like the README of an independently published project.

It is not an assignment sheet.

Remove language such as:

* "implement this";
* "complete the skeleton";
* "your workspace";
* "check the answer later";
* "compare against reference";
* "the initial test should fail";
* "learner";
* "solution";
* "expected answer."

The README should describe the completed artifact.

Use sections appropriate to the project, generally including:

* project overview;
* purpose;
* features;
* architecture or component responsibilities;
* build/install;
* usage;
* tests or verification;
* major design decisions;
* Implementation Order;
* known scope and limitations.

README explanatory prose should be written naturally in Korean.

Do not force established technical terms into unnatural Korean translations.

Technical identifiers and code references remain exactly as they exist in source.

---

# 16. README Implementation Order

Every project README must include an Implementation Order table corresponding exactly to the source annotations.

Example:

| Order | Responsibility           | Primary anchor       |
| ----: | ------------------------ | -------------------- |
|     1 | Request model            | `src/request.hpp`    |
|     2 | Incremental parser state | `src/parser.cpp`     |
|   2-1 | Header validation        | `src/parser.cpp`     |
|     3 | Route resolution         | `src/router.cpp`     |
|     4 | Connection ownership     | `src/connection.cpp` |
|     5 | Event-loop integration   | `src/server.cpp`     |

The following must agree:

* number;
* order;
* responsibility;
* primary source location.

The table's technical responsibility names must remain in English so that they match source annotations consistently.

Explanatory prose surrounding the table may be Korean.

---

# 17. Cumulative Projects

When several current exercises are incremental stages of one final artifact, preserve only the final integrated project.

Do not keep:

```text
project-01/
project-02/
project-03/
project-04/
project-final/
```

when all five represent versions of the same program.

Produce:

```text
project/
```

containing:

* final implementation;
* useful final tests;
* final build configuration;
* one project README;
* one global Implementation Order.

The Implementation Order must preserve the meaningful construction logic that the old stages attempted to teach.

The final project should make it possible to understand:

```text
foundation
→ model
→ core behavior
→ resource ownership
→ failure handling
→ integration
→ final composition
```

without retaining intermediate source snapshots.

---

# 18. Observation-Oriented Existing Exercises

Do not automatically delete an exercise merely because the old README described it as an observation exercise.

Inspect the actual artifact.

If it contains a meaningful utility, analyzer, simulator, reproducible systems experiment, or operational tool, RECAST it as a standalone project.

For example, instead of:

> Run the supplied scripts and observe TCP retransmission.

the final README may describe:

> This project creates an isolated Linux network topology that deterministically reproduces routing, NAT, packet loss, and TCP retransmission behavior.

The implementation then becomes the project itself.

However, if an item contains only an answer sheet or observation record without a meaningful reusable artifact, exclude it from `exercises/`.

---

# 19. Tests

Tests should be treated as project code when they materially demonstrate the project's engineering guarantees.

Retain or improve tests for important behaviors such as:

* parsers;
* edge cases;
* concurrency;
* transaction atomicity;
* failure recovery;
* protocol validation;
* resource cleanup;
* persistence;
* data-structure invariants;
* integration boundaries.

Remove tests whose only purpose is to:

* verify that the skeleton is incomplete;
* mutate an answer and prove an educational checker catches it;
* validate repository-maintainer metadata;
* inspect old stage scaffolding.

Final tests should look like tests that belong in the standalone public project.

---

# 20. Standalone Independence

Every final exercise must be independently usable outside the `guides` repository.

For every final project, copy it conceptually or actually to a temporary directory:

```sh
cp -R exercises/<project> /tmp/<project>
cd /tmp/<project>
```

Then verify that the README's documented build, run, and test commands work without access to:

* parent `guides` scripts;
* sibling exercises;
* root configuration;
* hidden reference implementations;
* repository-level fixtures.

If a dependency on the parent repository exists, remove or localize it.

The exercise is not complete until it behaves as a standalone project.

---

# 21. Project Quality

Do not optimize for the number of exercise directories.

Do not add projects merely to cover every documentation chapter one-to-one.

Do not preserve weak projects merely to maintain symmetric numbering.

Prefer a smaller number of coherent, technically meaningful projects over a large number of curriculum fragments.

At the same time, do not merge genuinely independent projects merely because they use similar concepts.

Project identity and engineering cohesion are the deciding criteria.

---

# 22. Preserve Valid Subject Coverage

The purpose of this task is not to redesign the entire curriculum from scratch.

Existing exercise topics that already represent useful engineering subjects should normally remain.

Change the topic itself only when necessary because:

* multiple entries are really one artifact;
* the current item is not an implementation artifact at all;
* the subject is fully redundant with another final project;
* a recast produces a much more coherent standalone artifact.

Do not introduce unrelated new projects simply because they would make the exercise collection look more comprehensive.

---

# 23. Technical Integrity

Do not use Git history, commit count, commit dates, or historical author behavior to determine Implementation Order.

Implementation Order must come from:

* architecture;
* data dependencies;
* ownership;
* state dependencies;
* initialization requirements;
* protocol flow;
* resource lifecycle;
* integration order.

Do not intentionally simplify verified behavior merely to make the reconstructed directory easier to understand.

Preserve important correctness, security, failure-handling, concurrency, and cleanup behavior from the best existing implementation.

---

# 24. No External Implementations

Do not use other developers' repositories or unrelated external implementations as source material.

The target branch is the source of truth for the existing implementation and intended subject coverage.

Normal official documentation may be consulted only if necessary to correctly interpret a technology or protocol already used by the branch.

Do not replace the branch's implementation with a third-party project.

---

# 25. Replacement, Not Overlay

The final `exercises/` output is a complete replacement.

It must not assume that old files remain present.

Do not create an overlay that merely adds new files on top of the existing exercise tree.

The intended application procedure is conceptually:

```sh
rm -rf exercises
unzip <replacement-archive>
```

Therefore the archive's `exercises/` directory must represent the complete desired final state.

Any old directory that should no longer exist must simply be absent from the replacement.

---

# 26. Output Archive

Create one ZIP archive:

```text
guides-<TARGET_BRANCH>-exercises-replacement.zip
```

The archive must contain:

```text
exercises/
```

and nothing outside the reconstructed exercise tree unless technically unavoidable.

Do not include:

* analysis reports;
* migration notes;
* temporary files;
* generated files;
* build outputs;
* caches;
* old educational scaffolding.

---

# 27. Verification Before Delivery

Before producing the ZIP:

1. verify the final directory structure;
2. verify that no obsolete educational scaffolding remains;
3. verify all README paths internal to each project;
4. verify Implementation Order consistency between README and source;
5. verify source syntax;
6. build every project that can be built in the available environment;
7. run every reasonable project-local test;
8. test standalone execution outside the parent repository;
9. check for accidental parent-directory dependencies;
10. check for generated or dependency artifacts that should not be distributed.

If a required runtime, OS capability, Docker daemon, privileged network environment, external service, compiler, or dependency cannot be used in the current environment, do not fabricate successful verification.

Report the exact limitation.

---

# 28. Final Response

Write the final response in English.

Keep it concise.

Report:

### Final projects

List the final `exercises/<project>/` directories.

### Structural changes

Summarize old → new transformations, especially:

* merged stages;
* renamed projects;
* recast observation exercises;
* excluded non-project educational artifacts;
* removed redundant entries.

This mapping is for the response only.

Do not add a migration report to the ZIP.

### Verification

State which standalone build/run/test checks were successfully executed.

State any checks that could not be executed and why.

### Archive

Provide the download link to:

```text
guides-<TARGET_BRANCH>-exercises-replacement.zip
```

Do not modify or deliver `docs/` as part of this task.
