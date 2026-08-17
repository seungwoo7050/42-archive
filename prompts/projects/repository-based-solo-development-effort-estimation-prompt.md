# Repository-Based Solo Development Effort Estimation

## Objective

Estimate how long the provided projects would take to implement from scratch by a standardized solo developer.

The goal is **not** to reconstruct how long the original author actually spent on the projects.

The goal is to estimate the intrinsic implementation effort of each project under a consistent reference-developer model, then optionally map that independently estimated effort onto the logical regions of the project's commit history.

## Inputs

I will provide:

* one or more repository URLs;
* target branches, usually grouped by language, technology stack, or project family;
* optionally, the names of projects that belong to the group but whose implementation branches or repository artifacts are missing;
* the number of trailing commits that must be excluded from each target branch, if applicable.

For the current evaluation:

* **Trailing commits to exclude from each target branch:**
* These trailing commits are known to be final documentation-only commits.
* Documentation commits occurring earlier in the history are valid project work and must remain included.

For future evaluations, use the exclusion count explicitly supplied by me. Do not assume that every unrelated repository has two trailing commits to exclude.

# 1. Reference Developer

Use the same hypothetical developer for every project.

Define the reference developer as:

> A P50 mid-level software developer who is already practically competent with the project's primary programming language, framework, build tools, debugging workflow, version control, and ordinary development tooling.

Assume that this developer:

* can independently interpret requirements and design an implementation;
* is competent with common data structures, debugging, testing, and build systems;
* does not already know the specific project's solution;
* is not a domain specialist unless the technology itself normally requires that knowledge;
* does not copy an existing implementation of the same project;
* does not use AI to generate substantial portions of the implementation;
* may consult normal technical documentation when necessary;
* experiences ordinary implementation mistakes, debugging, integration problems, and reasonable redesign work.

Exclude time required to learn basic proficiency in the primary language or framework itself.

Include project-specific research and understanding that a competent developer would reasonably need.

Examples:

* learning C syntax: exclude;
* learning how this particular protocol behaves: include;
* learning basic Spring usage: exclude;
* researching a project-specific concurrency or transaction issue: include.

Use this exact reference-developer model consistently across all repositories.

Do not adjust the estimate based on assumptions about the original author's skill.

# 2. Fundamental Estimation Rule

Estimate:

> The total engineer-days required for the reference developer to independently implement the project from its requirements to the evaluated final state.

The estimate must be derived from the project's actual scope and engineering complexity.

Do **not** estimate from:

* commit count;
* commit dates;
* elapsed Git history;
* commit frequency;
* author dates;
* committer dates;
* contributor count;
* number of authors;
* observed development velocity;
* presumed skill of the repository owner;
* repository age.

These are completely invalid as effort-estimation inputs.

# 3. Repository Evidence

For projects whose implementation exists in the supplied repository, base the estimation only on the supplied repository and target branch.

Analyze relevant evidence such as:

* official requirements included in the repository;
* README/specification files;
* source code;
* repository structure;
* modules and subsystems;
* tests;
* build configuration;
* deployment or infrastructure configuration;
* database schemas;
* APIs;
* protocol implementation;
* error handling;
* edge cases;
* integration boundaries;
* documentation that forms part of the project work.

Do not use unrelated external implementations, community estimates, student reports, blog posts, forum discussions, or typical completion times.

Do not search for how long other people usually take to complete the project.

# 4. Trailing Commit Exclusion

If `N` trailing commits are explicitly designated as excluded:

1. completely exclude those `N` commits from the project effort estimate;
2. treat the repository state immediately before them as the evaluated final project state;
3. do not allocate any reconstructed development time to those commits;
4. retain earlier documentation work normally.

For example, when:

`Trailing commits to exclude = 2`

evaluate the project as it exists at:

`HEAD~2`

rather than `HEAD`.

The two excluded commits must contribute exactly zero effort to the estimate.

Do not inspect their diffs merely to reconfirm the exclusion if I have already stated that they are documentation-only.

# 5. Independent Project Decomposition

Before looking at Git history for timeline allocation, independently decompose each project into meaningful engineering work areas.

Consider at least:

* requirements interpretation;
* architecture and initial design;
* project/bootstrap structure;
* core functionality;
* algorithmic complexity;
* state-management complexity;
* concurrency/process/network complexity where applicable;
* parsing or protocol handling;
* persistence/data modeling;
* external-system integration;
* error handling;
* edge cases;
* security requirements where applicable;
* testing and verification;
* debugging and stabilization;
* build/infrastructure/deployment work;
* documentation that is part of the evaluated project.

Do not use LOC as the primary estimator.

LOC may be supporting evidence, but it must never dominate the estimate.

Two projects with similar LOC may require very different effort.

# 6. Effort Estimation

For every project, produce:

* **P50 estimated effort** in engineer-days;
* a **reasonable uncertainty range**;
* a work-breakdown estimate whose components sum to the P50 estimate.

Avoid false precision.

Prefer increments such as approximately 0.5 or 1 engineer-day unless finer precision is genuinely justified.

Example:

| Work area                   | P50 effort |
| --------------------------- | ---------: |
| Requirements / architecture |      2.0 d |
| Parser                      |      4.5 d |
| Core execution              |      6.0 d |
| Error / edge handling       |      3.0 d |
| Integration                 |      2.5 d |
| Testing / stabilization     |      3.0 d |
| Documentation               |      1.0 d |
| **Total**                   | **22.0 d** |

The total must reflect implementation effort, not historical elapsed time.

# 7. Project Groups

Projects may be supplied as groups such as:

* C
* C++
* Web
* backend services
* infrastructure
* graphics
* or any unrelated future project collection.

Always estimate each project independently first.

Then aggregate the project estimates into the group total.

Do not initially treat the entire group as one monolithic project.

Do not reduce later-project estimates merely because the same hypothetical developer completed earlier projects in the group.

In other words, do not apply an implicit learning-curve discount.

The purpose is to compare intrinsic project effort under a consistent developer model.

Report:

* project-level estimates;
* group P50 total;
* group uncertainty where meaningful;
* number of evaluated projects;
* any missing projects and how they were handled.

# 8. Missing Project Rule

A project may belong to the requested group even though its implementation branch or repository artifact is missing.

For such a project, and **only for such a project**, the following exception is allowed.

You may obtain and use the project's **official requirements or official specification** solely to establish what must be implemented.

This is the only external-information exception.

For missing projects:

### Allowed

* official project specification;
* official assignment/subject document;
* official documentation issued by the organization responsible for defining that project.

### Forbidden

* other people's repositories;
* GitHub implementations by other developers;
* tutorials implementing the project;
* blog posts;
* Reddit;
* Stack Overflow descriptions of the project scope;
* student reports;
* community estimates;
* completion-time surveys;
* typical development durations;
* course statistics;
* benchmark repositories;
* third-party summaries used as substitutes for the official specification.

Most importantly:

> Never search for or use information about how long the project normally takes other developers to complete.

The official requirements are used only to reconstruct the project's intrinsic scope.

Then estimate its effort using the same reference-developer model used for repository-backed projects.

# 9. If Official Requirements Cannot Be Obtained

If a project's implementation is missing and no authoritative official requirements can be found, do not fabricate an estimate.

Report:

`Not estimable from permitted evidence.`

Explain briefly what evidence is missing.

Do not substitute unofficial sources merely to produce a number.

# 10. Confidence Classification

Distinguish estimates based on evidence quality.

Suggested classifications:

### High

Repository implementation, requirements, architecture, and tests provide substantial evidence.

### Medium

Repository implementation is available but requirements or verification evidence are incomplete.

### Low

The project implementation is missing and the estimate is reconstructed only from official requirements.

Do not artificially widen or narrow confidence based on Git commit dates or contributor information.

For a missing project based only on its official specification, explicitly mark that its estimate has lower confidence than repository-backed projects.

# 11. Git History Must Not Influence the Estimate

Only after the project's independent P50 effort has been fully determined may Git history be consulted.

The Git history is used solely as a **logical allocation framework** for the already-computed effort.

It must never change the independently calculated total merely because:

* there are many or few commits;
* certain commits are close together;
* the author worked quickly or slowly;
* a commit occurred after a long gap;
* several contributors appear;
* the repository was developed over a long calendar period.

The causal direction must always be:

`project scope → independent effort estimate → history allocation`

Never:

`Git history → effort estimate`

# 12. Git History Analysis Rules

For history allocation, inspect only:

* commit ordering;
* commit messages.

Assume that each commit message completely and accurately describes the work contained in that commit, with no material omissions or incorrect descriptions.

Do **not** inspect individual commit diffs for this allocation unless I explicitly request it.

Do **not** use:

* author dates;
* commit dates;
* timestamps;
* intervals between commits;
* contributor identities;
* historical elapsed duration.

Also do not assign equal effort per commit.

Commit count is not a proxy for work.

For example:

* `implement core event loop`
* `fix documentation typo`

must not receive equal effort merely because both are one commit.

Infer the relative engineering significance of each message from the already-understood project architecture and work breakdown.

# 13. Commit-History Region Allocation

Prefer meaningful contiguous **commit regions** rather than pretending that every individual commit has a precisely measurable duration.

For example:

* Foundation
* Parser
* Core engine
* Networking
* Integration
* Error handling
* Edge cases
* Testing
* Stabilization
* Documentation

Group consecutive commits into coherent development regions based on their messages.

Then map the independently estimated P50 engineer-days onto those regions.

The allocated durations must sum exactly to the independently estimated project P50.

Example:

| Standard timeline | Commit region   | Work                         |
| ----------------- | --------------- | ---------------------------- |
| Day 1.0–3.0       | commits 001–008 | Foundation                   |
| Day 3.0–8.5       | commits 009–025 | Parser                       |
| Day 8.5–16.0      | commits 026–051 | Core implementation          |
| Day 16.0–20.0     | commits 052–067 | Integration                  |
| Day 20.0–23.0     | commits 068–079 | Edge cases / debugging       |
| Day 23.0–25.0     | commits 080–089 | Verification / documentation |

This is a **reconstructed standard timeline**, not the repository's historical timeline.

Make that distinction explicit.

# 14. Missing Projects and Git History

If a project has no implementation branch and therefore no Git history:

* estimate only its overall intrinsic effort from the permitted official requirements;
* do not fabricate commit phases;
* do not invent a development history;
* do not invent commit counts;
* do not create a reconstructed commit allocation.

It may still receive:

* P50 engineer-days;
* uncertainty range;
* high-level work breakdown;
* confidence classification.

Its lack of Git history affects only the timeline-allocation detail, not whether a rough intrinsic project-effort estimate can be produced from official requirements.

# 15. Calendar Duration

Treat `engineer-days` as the primary measurement.

If calendar duration is also reported, assume:

* one developer;
* full-time work;
* five working days per week.

For example:

`20 engineer-days ≈ 4 working weeks`

Do not confuse calendar duration with actual historical elapsed time.

# 16. Required Output

For each project, report in this order:

## Project: `<name>`

### Evidence

* repository-backed or missing-project/specification-only;
* evaluated branch/revision;
* excluded trailing commits;
* confidence level.

### Independent effort estimate

* P50 engineer-days;
* reasonable range;
* approximate full-time working weeks.

### Work breakdown

A table of meaningful engineering work areas and their estimated effort.

### Complexity drivers

Briefly identify the factors that contribute most strongly to the estimate.

### Reconstructed standard timeline

For repository-backed projects only:

* logical commit regions;
* commit ranges;
* corresponding standard-development-day ranges;
* allocated effort.

Explicitly state that commit dates and historical development duration were ignored.

For missing projects, state:

`Commit-history allocation unavailable because no implementation history is present.`

# 17. Group Summary

After all projects in the requested group are evaluated, provide a table containing:

| Project | Evidence type | P50 | Range | Confidence |
| ------- | ------------- | --: | ----: | ---------- |

Then report:

* total group P50 engineer-days;
* approximate full-time working weeks;
* number of repository-backed projects;
* number of missing projects estimated from official requirements;
* any projects that remained non-estimable.

Do not hide lower-confidence missing-project estimates inside the total. Mark them clearly.

# 18. Methodological Constraints

The following rules are strict:

1. Never infer implementation duration from Git timestamps.
2. Never infer implementation duration from commit count.
3. Never infer implementation duration from contributor count.
4. Never use the original author's apparent velocity.
5. Never use typical completion times found online.
6. Never use other developers' implementations to estimate missing projects.
7. Never use unofficial descriptions when official requirements are available.
8. Never inspect commit diffs merely for history allocation.
9. Never let Git history alter an independently established project-effort total.
10. Never fabricate evidence merely to provide a complete-looking result.
11. Always estimate projects independently before aggregating a group.
12. Always distinguish intrinsic implementation effort from reconstructed history allocation.
13. Always distinguish repository-backed estimates from specification-only missing-project estimates.

If available evidence is insufficient, reduce confidence or report that the project is not estimable rather than silently introducing unsupported assumptions.

c/ft_printf
c/libft
c/minishell
c/philo
c/push_swap
cpp/cpp-foundation
cpp/ft_container
cpp/ft_irc
cpp/miniRT
main
web/ft_transcendence
web/inception
web/portfolio
