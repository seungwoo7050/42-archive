# Request
## Small project
Body → 같은 세션에서 Importance
### Commit bodies
````
Branch: 
Using prompts.md as the governing instructions, analyze this completed branch from root to head in manageable history chunks and create only commit-bodies.md.
Inspect the actual diff of every applicable commit as required by prompts.md. Do not create commit-importance.md yet.
Be academically complete and describe in detail.
To prevent a single document from becoming too long, limit it to 50 commits per document.
````
### Commit importance
````
Branch: 
Using prompts.md as the governing instructions and the repository evidence already established while creating commit-bodies.md, create only commit-importance.md.
Reuse the previous analysis where valid, inspect any additional evidence required for classification, and perform the full-history recalibration required by prompts.md.
Do not recreate commit-bodies.md.
````
## Large project
여러 Body 세션 → 결과 통합 → 별도 새 세션에서 전체 Importance
### Commit bodies
````
Branch: web/ft_transcendence
Using prompts.md as the governing instructions, analyze this completed branch
from root to head, but process only the raw Git history range specified below.
This branch contains 433 commits in the resolved root-to-head history.
Chunk: 1 of 4
Raw history positions: 1-100 inclusive
IMPORTANT HISTORY RANGE RULES
- Position 1 means the oldest commit in the resolved target branch history.
- Resolve the complete branch history first so that commit positions are stable.
- The requested range refers to raw commits before any exclusions.
- Do not renumber commits after excluding documentation-only, generated-only,
  merge-only, or otherwise inapplicable commits.
- Analyze and generate commit bodies only for commits whose raw history
  positions are 1-100.
- You may inspect commits outside this range only when necessary as read-only
  historical context for:
  - understanding an inherited architectural decision
  - understanding a later correction or regression
  - determining the meaning of a current commit
  - determining whether a change is temporary or durable
- Do not generate bodies for out-of-range commits.
- Do not duplicate work from another chunk.
ACTUAL DIFF INSPECTION
Inspect the actual diff of every applicable commit in this chunk as required by
prompts.md.
Do not infer a commit body from:
- the subject alone
- changed file names
- LOC
- GitHub-generated summaries
- final project state alone
For each applicable commit, inspect enough repository evidence to establish the
actual engineering meaning of the change.
For commits whose significance or rationale is not obvious from the immediate
diff, inspect as needed:
- parent-state implementation
- resulting implementation
- surrounding source
- interfaces and schemas
- tests
- configuration
- nearby commits
- later fixes or refactors
Do not invent undocumented intentions, failed attempts, motivations, commands,
or future plans.
GENERATED-NOISE OVERRIDE
For this task, the following rule explicitly overrides prompts.md where
prompts.md would otherwise require detailed treatment of a non-documentation
chore commit.
Do not spend detailed analysis budget on mechanically generated files such as:
- pnpm-lock.yaml
- package-lock.json
- yarn.lock
- generated dependency-resolution files
- generated build output
- compiler caches
- framework caches
- other mechanically generated artifacts whose authoritative semantic source is
  inspected elsewhere
If a commit changes only mechanically generated dependency/build artifacts and
contains no meaningful hand-authored source, configuration, schema, test,
runtime, or build decision:
- inspect enough of the commit to establish that it is generated-only
- exclude it from commit-body generation
For commits that change both semantic files and generated artifacts:
- inspect the semantic source/configuration/build/test changes fully
- inspect generated artifacts only enough to verify their resulting effect
- do not analyze individual generated entries line by line unless those entries
  themselves are technically significant
Examples:
1. package.json + pnpm-lock.yaml
   Analyze the dependency or workspace decision represented by package.json.
   Treat pnpm-lock.yaml primarily as evidence that dependency resolution was
   updated.
2. pnpm-lock.yaml only
   If the diff is merely mechanical dependency resolution with no distinct
   engineering decision, exclude the commit from commit-body generation.
3. A lockfile change that specifically fixes dependency resolution,
   runtime/platform compatibility, reproducibility, or a security issue
   may still be technically meaningful. Inspect and include it when repository
   evidence supports that significance.
Do not classify a file as generated noise merely because it is large.
DOCUMENTATION AND MERGE EXCLUSIONS
Follow prompts.md for documentation-only commits:
- exclude README-only commits
- exclude Markdown/documentation-only maintenance
- exclude comments-only documentation changes
Do not exclude a commit merely because documentation changes accompany
meaningful code, test, schema, configuration, build, or runtime changes.
Pure merge commits with no independent semantic integration may be omitted.
If a merge itself contains non-trivial conflict resolution, compatibility
correction, or behavior-changing reconciliation, inspect and document that
engineering work according to prompts.md.
OUTPUT
Create only commit-body Markdown documents for this chunk.
Do not create commit-importance.md yet.
Do not classify commits as S/A/B/C yet.
Do not create an importance profile.
Do not create Development Threads yet.
Do not create intermediate reports, analysis summaries, commit inventories,
scratch files, or supplementary documentation.
The final Markdown documents must follow the commit-bodies.md format from
prompts.md:
## <original commit subject>
<educational commit body>
Preserve every commit subject exactly.
Do not include in the body documents:
- SHA
- commit date
- author
- raw history position
- importance grade
- importance tags
- evidence notes
- confidence scores
- introductory text
- concluding text
- tables
- chunk summaries
ORDERING
Bodies must appear in development order from oldest to newest.
Preserve Git ancestry ordering exactly as required by prompts.md.
DOCUMENT SIZE
Limit each output document to at most 50 commit bodies.
For this chunk, use these filenames in order as needed:
- commit-bodies-001-100-01.md
- commit-bodies-001-100-02.md
Do not create an empty second document if 50 or fewer applicable commits remain.
QUALITY STANDARD
Be academically complete and technically detailed where repository evidence
supports detail.
The body should explain, when applicable:
- what changed
- the technical decision represented by the change
- why the chosen boundary or representation makes sense
- the problem or constraint addressed
- important state, lifecycle, protocol, persistence, security, or ownership
  invariants
- relevant trade-offs
- meaningful verification provided by tests or surrounding code
Do not artificially lengthen trivial commits.
For mechanically straightforward but applicable changes, keep the explanation
short, factual, and conservative.
A long diff does not require a long body.
A small diff may require a detailed body when it restores or establishes an
important invariant.
COMPLETION REQUIREMENT
Do not stop after sampling the history.
Complete the entire requested raw history range, 1-100, before producing the
final response.
Before finishing, verify that:
- the complete branch history was resolved
- raw positions 1-100 were interpreted before exclusions
- every applicable in-range commit had its actual diff inspected
- generated-only exclusions were established from the actual diff
- documentation-only exclusions were established from actual content
- no out-of-range commit received a body
- no applicable in-range commit was silently skipped
- subjects are preserved exactly
- bodies contain no SHAs or importance metadata
- each output file contains at most 50 commit bodies
````
Earlier chunks have already been completed.
Do not regenerate or rewrite bodies from earlier raw history ranges.
You may inspect earlier commits as read-only context when necessary to understand the commits in this chunk.
### Commit importance
````
Branch:
Using prompts.md as the governing instructions, create only commit-importance.md.
Treat the completed commit-bodies documents from all history chunks as reusable analysis evidence, but independently resolve the complete root-to-head branch history so that every raw commit position and exclusion is stable.
Reuse the commit-body analysis where it is sufficient for classification, and inspect the actual repository diff or surrounding history whenever additional evidence is required to judge importance, dependencies, regressions, later corrections, or project-wide significance.
Perform the full-history recalibration required by prompts.md across the entire branch, not chunk by chunk. Importance levels must be assigned comparatively against all applicable commits in the completed branch.
Do not recreate or modify the commit-bodies documents.
Create only commit-importance.md.
````
# Git History Engineering Analysis and Educational Commit Documentation
Review the following completed Git repository branch:
Repository: https://github.com/seungwoo7050/42-final
Branch: 
Output Language: English
The target branch is already complete and must be treated as a fixed,
finished project.
Your task is to reconstruct the engineering history of the project from the
actual repository and Git history.
You must:
1. Determine the correct commit scope for the requested branch.
2. Understand the completed project as a whole.
3. Inspect the complete relevant development history of the target branch.
4. Establish project-specific importance criteria before final commit grading.
5. Inspect the actual diff of every classified commit.
6. Write educational commit bodies for applicable non-documentation commits.
7. Classify every commit in scope as S / A / B / C.
8. Identify meaningful multi-commit Development Threads.
9. Identify the commits that best explain the project's core engineering
   decisions, difficulties, corrections, and invariants.
10. Create exactly two Markdown files.
Do not modify:
- the repository
- Git history
- commit subjects
- branch structure
- files
- metadata
- tags
- commit contents
The repository is the primary evidence.
Do not invent undocumented development history, personal intentions, failed
attempts, command executions, motivations, or future plans that cannot be
established from repository evidence.
# 1. Deliverables
Create exactly two Markdown files:
1. `commit-bodies.md`
2. `commit-importance.md`
Do not create additional reports, summaries, intermediate analysis files,
alternative versions, or supplementary artifacts unless explicitly requested.
## 1.1 `commit-bodies.md`
This document contains educational commit bodies for applicable commits in the
resolved target history.
Use the existing commit subject exactly as the Markdown heading.
Format:
```markdown
## <existing commit subject>
<educational commit body>
## <existing commit subject>
<educational commit body>
```
Do not include:
- commit SHA
- commit dates
- author information
- importance grades
- importance tags
- evidence notes
- confidence scores
- analysis notes
- tables
- project summaries
- introductory text
- concluding text
The document must contain only commit subjects and their proposed educational
commit bodies.
### Normal Exclusions from `commit-bodies.md`
Exclude documentation-only commits whose primary purpose is:
- README changes
- Markdown documentation
- devlog changes
- comments-only documentation updates
- documentation formatting
- documentation wording corrections
- other documentation-only maintenance
Do not exclude a commit merely because it contains documentation changes
alongside meaningful code, configuration, build, test, or runtime changes.
Pure merge commits with no independent semantic change may also be omitted from
`commit-bodies.md`.
A merge commit should receive a body only when the merge operation itself
contains meaningful engineering work such as:
- semantic integration
- non-trivial conflict resolution
- behavior-changing reconciliation
- establishment of an integration boundary
- compatibility correction introduced by the merge
Do not attribute all changes from merged commits to the merge commit itself.
## 1.2 `commit-importance.md`
This document analyzes the complete resolved target commit set.
It must contain:
1. Project Importance Profile
2. Commit Classification
3. Development Threads
4. Most Important Commits
Every commit in the resolved target history must appear in the Commit
Classification, including:
- documentation-only commits
- trivial maintenance commits
- merge commits
- commits excluded from `commit-bodies.md`
Commits excluded from commit-body generation may legitimately receive C when
they have little engineering significance.
# 2. Output Language
Write both files in the language specified by `Output Language`.
Use natural, professional technical prose.
When the output language is Korean:
- preserve the complete technical meaning of repository evidence
- preserve rationale, constraints, invariants, and verification meaning
- do not shorten or simplify technical concepts merely for fluency
- keep code identifiers, APIs, protocol names, command names, library names,
  framework names, schema identifiers, and other precision-sensitive
  terminology unchanged when translation would reduce accuracy
- translate engineering terminology naturally when Korean terminology
  preserves the same meaning
The selected output language changes only the language of explanation.
It must not change:
- technical content
- evidence standards
- grading criteria
- reasoning depth
- level of detail
# 3. Commit Scope
Determine the target commit set before performing commit-level analysis.
Do not assume that every commit reachable from the branch tip necessarily
represents work belonging to the target project.
## 3.1 Independent Project History
If the target branch represents an independent project history, analyze its
complete relevant reachable history.
## 3.2 Branch Created from Existing History
If the branch was created from a pre-existing development branch whose earlier
history is unrelated to the target project, use:
- branch topology
- merge bases
- commit ancestry
- repository structure
- project context
to distinguish:
- commits introduced as part of the target project's development
- inherited ancestor commits that provide context only
Inherited commits may be inspected when necessary to understand the starting
state, but must not be silently classified as target-branch work.
## 3.3 Default Branch
Do not silently substitute the default branch history for the requested branch.
## 3.4 Ambiguous History
If the repository topology makes the intended scope ambiguous:
1. derive the most defensible scope supported by repository evidence
2. use that scope consistently
3. record the resolved scope in the Project Importance Profile
## 3.5 Merge Commits
For merge commits, distinguish between:
- the merge operation itself
- the individual commits introduced through the merge
Evaluate the merge commit independently.
A merge commit may be important when the integration action itself performs
meaningful engineering work.
Do not assign the significance of every merged commit to the merge commit.
For merge commits, inspect the merge result against each relevant parent as
needed to distinguish changes merely introduced through ancestry from semantic
integration performed by the merge operation itself.
# 4. Commit Ordering
Unless a section explicitly requires another structure, present commits in
development order from oldest to newest while preserving Git ancestry.
A parent commit must appear before its descendant whenever both are in scope.
For commits that are not ancestrally ordered with respect to each other, use
commit timestamps as the secondary ordering criterion.
Use the same resolved order in:
- `commit-bodies.md`
- the Commit Classification table
Development Threads must follow their actual engineering progression.
Most Important Commits may be ordered according to their role in explaining the
engineering story rather than strict history order.
Preserve repeated commit subjects exactly.
If multiple commits use the same subject, do not modify the headings to
disambiguate them. Their history position and SHA remain authoritative.
# 5. SHA Format
Use 12-character abbreviated commit SHAs throughout `commit-importance.md`
when that length uniquely identifies every commit in the resolved target
history.
Verify uniqueness before producing the final document.
If 12 characters are insufficient, increase the abbreviation length to the
shortest length that uniquely identifies every commit in scope, and use that
same length consistently throughout `commit-importance.md`.
Do not include SHAs in `commit-bodies.md`.
# 6. Repository Analysis Comes First
Do not begin final commit classification immediately.
First understand the project as a whole.
Inspect as needed:
- README and project requirements
- directory structure
- source files
- headers and type definitions
- configuration
- tests
- build system
- languages
- frameworks
- libraries
- runtime structure
- module/component/service relationships
- major data flows
- lifecycle boundaries
- external interfaces
- protocols
- persistence model
- concurrency model
- authentication model
- authorization model
- error handling
- deployment structure
- test architecture
- complete relevant Git history
README descriptions are evidence, not unquestionable truth.
Compare documentation with:
- actual implementation
- configuration
- tests
- runtime structure
- Git history
The finished project may be used to understand:
- final architecture
- terminology
- responsibility boundaries
- subsystem relationships
- final invariants
However, do not use the final state to invent historical intentions that are
not supported by the commit being analyzed.
# 7. Project Importance Profile
Before assigning final S / A / B / C grades, construct a
`Project Importance Profile`.
This profile defines what is technically important in this specific project.
Do not reuse a generic importance model without adapting it to the repository.
## 7.1 Project
Record:
```text
Project:
Domain:
Primary Purpose:
Resolved Commit Scope:
```
## 7.2 Core Technical Areas
Identify the technical areas required to understand the project.
Possible examples include:
- parsing
- networking
- protocol state
- rendering
- authentication
- authorization
- persistence
- transactions
- concurrency
- lifecycle management
- process management
- deployment
- resource ownership
- caching
- event processing
These are examples only.
Select only areas that actually exist in the repository.
## 7.3 Core Architecture
Describe the major components and their responsibility boundaries.
Examples may include:
- client vs. server
- transport vs. domain logic
- API vs. persistence
- state owner vs. state consumer
- simulation vs. rendering
- authentication vs. authorization
- controller vs. service
- runtime vs. build infrastructure
Use the architecture that is actually present in the project.
## 7.4 Critical Invariants
Identify conditions whose violation would break:
- correctness
- state consistency
- security
- reliability
- ownership
- lifecycle behavior
- persistence guarantees
- protocol validity
Possible examples include:
- authoritative state has one owner
- resources are released exactly once
- transactions remain atomic
- protocol transitions occur only from valid states
- suspended users cannot retain privileged access
- persisted state reflects committed domain state
- shutdown does not abandon active work
- identity and authorization remain consistent
- ordering guarantees remain valid
Do not manufacture invariants that are not supported by repository evidence.
## 7.5 Major Engineering Difficulties
Identify engineering problems that actually required meaningful reasoning.
Look especially for:
- interacting state machines
- lifecycle management
- concurrency
- partial failure
- difficult protocols
- complex parsing
- algorithms
- subsystem integration
- resource ownership
- distributed or shared state consistency
- security boundaries
- persistence consistency
- deployment/runtime constraints
- performance bottlenecks
- difficult debugging
- failure recovery
Code volume alone does not make an area difficult.
## 7.6 Practical Engineering Areas
Identify engineering practices that repeatedly matter in this project.
Examples may include:
- validation
- error propagation
- cleanup
- observability
- transaction boundaries
- API contracts
- retries
- timeouts
- configuration
- test isolation
- regression testing
- dependency boundaries
- migration safety
- graceful shutdown
- input limits
- compatibility checks
Include only project-relevant areas.
## 7.7 Project-specific Importance Rules
Before final commit grading, define:
```text
S-level Criteria:
- ...
A-level Criteria:
- ...
Typical B-level Work:
- ...
Typical C-level Work:
- ...
```
These criteria must be derived from the completed project as a whole.
Do not create them after deciding which commits should receive high grades.
## 7.8 Project-specific Tags
Define a small, stable set of project-specific tags when useful.
Examples might include:
```text
REALTIME — authoritative or latency-sensitive realtime behavior
GAME_STATE — simulation or match-state correctness
AUTH — authentication or authorization boundaries
PERSISTENCE — durable state and database consistency
TOURNAMENT — tournament lifecycle and bracket progression
WEBSOCKET — WebSocket transport or connection lifecycle
DEPLOY — runtime and deployment behavior
```
These are examples only.
Derive tags from the actual repository.
# 8. Importance Profile Stability
Establish the Project Importance Profile before final commit grading.
After it is established, treat it as the grading rubric for the branch.
Full-history recalibration may change individual commit grades.
It must not silently change the Project Importance Profile merely to justify
those grades.
Revise the profile only when further repository evidence demonstrates that the
original project-level analysis itself was incomplete or incorrect.
If the profile changes for that reason, apply the revised criteria consistently
to the entire history again.
# 9. Tag Vocabulary Stability
Finalize the common and project-specific tag vocabulary before producing the
final Commit Classification.
Afterward, reuse that vocabulary consistently.
Introduce a new tag only when full-history analysis reveals a genuinely
distinct engineering concern that existing tags cannot express adequately.
Prefer broad, stable concepts over near-synonymous labels.
Avoid unnecessary vocabularies such as:
```text
SOCKET
NETWORK
NETWORKING
IO
EVENT
EVENT_LOOP
```
when a smaller number of meaningful tags can describe the same engineering
concerns.
Tags explain the nature of significance.
Tags do not justify the grade by themselves.
# 10. Minimum Commit Inspection
Every commit that receives an importance classification must be inspected
through its actual diff.
For every commit:
- inspect the existing subject
- inspect the actual diff
- determine its primary behavioral, structural, test, build, configuration,
  maintenance, merge, or documentation effect
Do not classify a commit only from:
- its subject
- its commit type
- changed file count
- LOC
- a generated diff summary
## 10.1 Deeper Inspection for S/A Candidates
For commits that may qualify as S or A, or whose significance remains
ambiguous, additionally inspect as needed:
- parent-state implementation
- resulting implementation
- surrounding subsystem code
- relevant interfaces
- relevant tests
- later fixes
- later refactors
- later regression coverage
- code that subsequently depends on the decision
Do not assign S or A from a commit subject or superficial diff summary alone.
## 10.2 Root and Merge Commit Diff Inspection
For a root commit, inspect the commit against the empty tree.
For a merge commit, do not assume that a normal first-parent diff alone
represents the engineering work performed by the merge.
Inspect as needed:
- the merge result relative to the first parent
- the merge result relative to other relevant parents
- the combined merge diff
- conflict-resolution changes
- semantic differences introduced specifically by the merge result
The goal is to distinguish changes already present in the merged histories from
engineering decisions introduced by the merge operation itself.
# 11. Educational Commit Body Analysis
Generate a commit body for every applicable non-documentation commit.
The goal is not to paraphrase the diff.
A useful body explains the engineering meaning of the change.
## 11.1 Goal of Each Commit Body
Whenever repository evidence supports it, capture:
- the factual change
- the technical or design decision embodied by the change
- why that decision is appropriate
- the problem, limitation, or constraint it addresses
- the invariant or contract it establishes or preserves
- the responsibility boundary it clarifies
- relevant trade-offs or reasonable alternatives
- meaningful verification evidence
Prefer decision-and-rationale explanations over descriptive summaries.
A technically competent reader should be able to answer:
1. What changed?
2. What technical decision does this represent?
3. Why does that decision make sense in this project?
4. What problem or constraint does it address?
5. Which invariant, contract, or responsibility boundary matters?
6. How was the important property established or verified?
7. What engineering concept can be learned from the change?
## 11.2 Information vs. Rationale
Avoid bodies that merely restate the diff.
Weak:
```text
The parser now consumes a token stream instead of accessing the lexer cursor
directly.
```
Preferred:
```text
The parser now consumes an explicit token stream instead of advancing the
lexer's mutable cursor directly.
This separates tokenization state from parsing state, allowing parsing to
operate against a stable input representation and making parser behavior easier
to test independently. Keeping cursor access behind additional lexer methods
would reduce direct field access but would preserve the same underlying state
coupling.
```
Whenever justified by repository evidence, preserve:
```text
change
→ technical decision
→ rationale
→ constraint / invariant / trade-off / verification
```
# 12. Evidence Rules
Base every commit body and importance classification on repository evidence.
Inspect as needed:
- existing subject
- actual diff
- parent state
- resulting state
- surrounding code
- tests
- build definitions
- configuration
- migrations
- generated artifacts
- lint/static-analysis configuration
- nearby commits
- later fixes
- later refactors
- later regression tests
- final architecture
The commit subject is a clue, not sufficient evidence.
## 12.1 Historical Reasoning
Do not fabricate:
- undocumented personal thought processes
- private developer intentions
- failed attempts not visible in Git history
- historical motivations that cannot be established
- plans for later work not recorded in the repository
- command executions without evidence
Avoid wording such as:
```text
The developer decided...
I decided...
The developer originally intended...
The developer first tried...
The developer planned to...
The developer ran...
```
Prefer technically grounded wording such as:
```text
The previous implementation couples...
This change establishes...
The parser now...
This preserves...
This representation avoids...
Keeping the previous structure would...
Separating these responsibilities makes...
The migration establishes...
The generated code provides...
The test covers...
The build configuration enforces...
```
# 13. Meaningful CLI and Tooling Context
Command-line tools are relevant only when they materially strengthen the
technical explanation.
Relevant cases include:
- generating committed output
- establishing project structure
- creating or applying migrations
- source/schema generation
- correctness verification
- target-platform validation
- static-property enforcement
- sanitizer checks
- memory checks
- race/concurrency checks
- benchmarking
- profiling
- container/runtime verification
Potentially meaningful tool categories include:
- test runners
- compilers
- build systems
- type checkers
- linters
- static analyzers
- sanitizers
- migration frameworks
- scaffolding tools
- code generators
- schema generators
- package/dependency tooling
- benchmark tools
- container tooling
Do not add tool information merely because a command is common in that
ecosystem.
## 13.1 Do Not Produce Command Logs
Avoid:
```text
Ran make.
Ran tests.
Ran clang-format.
```
Prefer:
```text
The failure path is covered by parser tests and remains compatible with the
sanitizer-enabled build used to detect invalid buffer access.
```
Or:
```text
The schema transition is represented as an explicit migration rather than an
implicit runtime adjustment, keeping the persistent-state transition
reproducible.
```
Include an exact command only when the command itself materially defines:
- generated output
- migration behavior
- target platform
- benchmark conditions
- verification semantics
- sanitizer configuration
# 14. Commit Body Guidance by Commit Type
Commit type does not determine importance.
Use commit type only as guidance for what the body should explain.
## 14.1 Feature Commits
Explain:
- the behavior introduced
- how it integrates into the system
- which contract or representation it establishes
- why the chosen integration boundary matters
## 14.2 Bug-fix Commits
Explain:
- the underlying cause
- the violated assumption or invariant
- how the fix restores intended behavior
- why the fix belongs at that layer
- meaningful regression evidence when available
## 14.3 Refactoring Commits
Explain:
- the structural decision that changed
- which responsibilities became clearer
- which coupling, ownership, state, or interface problem was reduced
- what behavior intentionally remained unchanged
## 14.4 Test Commits
Explain:
- the invariant, regression, or boundary condition being locked down
- why the behavior matters
- what class of future regression the test prevents
Do not merely state that tests were added.
## 14.5 Migration Commits
Explain:
- the persistent contract change
- why explicit migration is required
- compatibility or ordering constraints
- whether existing data is preserved
- which invariant the migration establishes
## 14.6 Scaffolding and Generation Commits
Explain:
- the structure or generated contract being introduced
- why generation is preferable to manual maintenance
- which source is authoritative
- which output is generated
## 14.7 Build and Dependency Commits
Explain:
- the build, compatibility, dependency, security, or platform property changed
- why the change is necessary
- what reproducibility or validation property it provides
## 14.8 Performance Commits
Explain:
- the cost or bottleneck being reduced
- why the new structure changes that cost
- meaningful memory, complexity, latency, or maintainability trade-offs
- benchmark or profiling evidence when available
## 14.9 Chore Commits
Non-documentation chore commits remain part of `commit-bodies.md`.
When the change contains meaningful technical rationale, explain it normally.
When the change is mechanically straightforward and the repository provides
little additional reasoning, keep the body short, factual, and conservative.
Do not manufacture architectural importance, design intent, or educational
depth merely to make minor maintenance sound more significant.
Documentation-only commits remain the normal content-based exclusion from
commit-body generation.
# 15. When to Keep a Commit Body Short
Not every commit requires a long explanation.
A short body is appropriate when:
- the subject already captures most of the meaning
- the implementation is mechanically straightforward
- little additional rationale is supported
- tooling involvement is routine
- the change has little architectural consequence
Do not invent sophistication merely to make every body equally long.
# 16. Commit Importance Classification
Every commit in the resolved target history must receive exactly one grade:
```text
S
A
B
C
```
Importance is not a measure of:
- LOC
- changed file count
- commit-message length
- commit type
- estimated implementation time
- apparent code complexity
- how long the educational body is
The central question is:
> How important is the technical judgment represented by this commit to solving
> this project's actual engineering problems?
# 17. Fixed Meaning of S / A / B / C
Project-specific criteria determine which changes qualify, but the meaning of
the four grades remains fixed.
## 17.1 S — Critical
A commit is S-level only when it is essential to understanding the project's
core engineering story.
It should strongly satisfy one or more of:
- establishes or changes core architecture
- implements a core project mechanism
- establishes or restores a critical invariant
- makes a major decision affecting multiple subsystems
- solves a particularly difficult correctness problem
- solves a difficult concurrency, lifecycle, ownership, or state problem
- introduces a foundational abstraction used by later development
- performs a major structural change that affects how the project should be
  understood
- identifies and fixes a severe non-obvious bug at its root cause
- materially determines later development structure
An S-level commit should normally satisfy both:
1. It is important to the project's core technical story.
2. Removing it from an explanation of the project would leave a meaningful gap
   in explaining how the project works, became correct, or acquired its
   defining architecture.
Implementation difficulty alone is insufficient.
S must remain selective.
## 17.2 S-level Guardrail
S is not a synonym for excellent engineering.
A commit may demonstrate excellent engineering practice and still be A-level
when the project's core architecture, mechanism, invariants, and correctness
story can be explained without it.
Excellent failure handling, validation, testing, debugging, or maintainability
work does not automatically make a commit S.
S identifies project-defining engineering significance, not general quality.
## 17.3 A — Significant
A-level commits provide strong evidence of meaningful engineering judgment but
are not indispensable to explaining the entire project.
Typical examples include:
- meaningful edge-case handling
- important failure-path engineering
- resource lifecycle improvements
- significant validation
- non-trivial debugging
- important regression prevention
- improvements made for testability
- difficult component integration
- important API/interface changes
- meaningful maintainability refactors
- meaningful performance improvements
- important security-boundary fixes
- restoration of significant but non-project-defining invariants
## 17.4 B — Normal
B-level commits are necessary, competent project work performed largely within
an established design.
Typical examples include:
- normal feature implementation
- implementation inside an existing architecture
- straightforward bug fixes
- expected validation
- ordinary tests
- small refactors
- repeated application of an existing pattern
- supporting implementation of a larger mechanism
These commits may still contain useful technical work.
They simply contain limited project-defining engineering judgment.
## 17.5 C — Minor
C-level commits contribute little to understanding the project's major
technical decisions.
Typical examples include:
- formatting
- typo fixes
- simple renaming
- mechanical repetitive changes
- boilerplate
- trivial accessors
- simple file moves
- insignificant cleanup
- routine generated-file adjustments
- documentation-only maintenance
- changes with almost no behavioral or structural consequence
A small diff is not automatically C.
A few lines restoring a critical state, security, lifecycle, resource, or
correctness invariant may deserve S or A.
# 18. Commit Body Depth and Importance Are Independent
Do not infer importance from how much can be written about a commit.
A long body does not imply high importance.
A short body does not imply low importance.
A B- or C-level commit may still require an accurate educational explanation.
A high-importance commit may require only a concise body when its decision is
simple but foundational.
Do not allow the body-writing process to bias the importance grade.
# 19. Important Subsystem Is Not Automatically an Important Commit
A commit is not important merely because it modifies a core subsystem.
Distinguish between:
- touching a core area
- implementing ordinary behavior inside an established core design
- establishing or changing the mechanism, invariant, ownership rule,
  responsibility boundary, state model, protocol contract, or architecture of
  that area
A routine implementation inside a core protocol may remain B.
A very small correction restoring a critical lifecycle, security, state, or
resource invariant may deserve A or S.
Tags describe the nature of significance.
They do not justify the grade by themselves.
# 20. Importance Tags
Use the smallest set of tags that explains why a commit matters.
Normally assign 1–3 tags.
## 20.1 Common Tags
Possible common tags include:
```text
ARCH        — architecture or major structural decision
CORE        — project core functionality
HARD        — unusually difficult implementation or reasoning
DEBUG       — non-trivial debugging or root-cause correction
PRACTICAL   — recurring practical engineering value
LEARNING    — strong conceptual learning value
RISK        — high correctness, reliability, or security risk
TEST        — important verification or regression work
EDGE        — meaningful edge or boundary condition
INTEGRATION — interaction between subsystems
PERF        — meaningful performance work
REFACTOR    — significant structural improvement
```
Use only tags that meaningfully describe the commit.
## 20.2 Secondary Tag Restrictions
`HARD`, `LEARNING`, and `PRACTICAL` are secondary descriptive tags.
They must never by themselves raise a commit from:
- C to B
- B to A
- A to S
Use `HARD` only when repository evidence demonstrates genuinely non-trivial
reasoning through:
- interacting state
- algorithms
- difficult failure behavior
- non-trivial debugging
- repeated correction
- complex lifecycle interaction
Do not infer difficulty from code length.
Use `LEARNING` only as a secondary property.
Educational value alone does not establish project importance.
# 21. Special Classification Rules
## 21.1 Tests
Do not automatically assign high importance to tests of an important
subsystem.
Evaluate what new evidence the test establishes.
A test may deserve S or A when it:
- locks down a critical invariant
- reproduces a non-trivial regression
- validates a difficult failure path
- protects an important architecture boundary
- materially changes confidence in a core mechanism
Routine coverage of already established behavior is normally B.
## 21.2 Security and Dependency Changes
Do not automatically promote every security or dependency update.
Evaluate whether the commit:
- closes an actually reachable project risk
- changes a security boundary
- restores a security invariant
- requires architectural adaptation
- fixes a runtime compatibility problem
- changes deployment or trust assumptions
- or merely updates a version mechanically
A mechanical version update is not automatically significant.
## 21.3 Refactors
Do not promote a refactor merely because it changes many files.
A refactor becomes significant when it materially improves:
- responsibility boundaries
- coupling
- cohesion
- ownership
- state management
- testability
- failure handling
- architectural clarity
Mechanical relocation or renaming is normally B or C.
## 21.4 Documentation
Documentation-only commits still receive an importance grade in
`commit-importance.md`.
They are normally C unless repository evidence provides an exceptional reason
for greater project-level significance.
Do not generate educational commit bodies for documentation-only commits.
## 21.5 Merge Commits
Do not grade a merge highly merely because it introduces important commits.
Evaluate whether the merge itself contains meaningful engineering judgment.
A clean structural merge with no semantic integration is normally minor.
A merge that resolves incompatible assumptions, behavior, contracts, or
subsystem boundaries may deserve a higher grade.
# 22. Analyze Commits in Historical Context
Whenever useful, evaluate a commit using:
```text
previous state
    ↓
commit
    ↓
resulting state
    ↓
later fixes / refactors / tests
```
Investigate:
- what the commit introduces for the first time
- what structure it replaces
- which later code depends on the decision
- whether later fixes reveal limitations
- whether regressions follow
- whether tests are added
- whether the issue is resolved across several commits
- whether the commit represents a temporary step or a durable design decision
Later commits may help explain the significance of earlier work.
Do not use later history to invent intentions that were not evidenced at the
time.
# 23. Development Threads
Identify meaningful multi-commit engineering stories.
Examples:
```text
initial implementation
→ edge case discovered
→ root cause identified
→ structural correction
→ regression test
```
```text
initial architecture
→ limitation discovered
→ abstraction introduced
→ dependent modules migrated
```
```text
core protocol introduced
→ integration failure
→ lifecycle correction
→ failure-path verification
```
Not every commit needs to belong to a Development Thread.
## 23.1 Development Thread Guardrail
Do not create a Development Thread merely because several commits modify the
same subsystem.
A thread must represent an actual engineering progression such as:
- dependency
- integration
- discovered limitation
- regression
- root-cause correction
- structural refinement
- invariant restoration
- failure-path hardening
- verification
A sequence of unrelated feature additions inside the same directory is not a
Development Thread.
## 23.2 Importance Does Not Propagate Through a Development Thread
Do not promote a commit merely because it belongs to an important thread.
When a major mechanism is implemented across multiple atomic commits,
determine which commits actually establish the decisive:
- architecture
- invariant
- state transition
- ownership rule
- protocol contract
- failure guarantee
- integration boundary
Supporting implementation steps should remain B or A when their individual
technical judgment does not independently justify a higher grade.
Do not double-count one engineering decision by assigning the same importance
to every commit involved in implementing it.
A valid Development Thread may contain:
```text
B → A → S → A → B
```
# 24. Patterns Worth Actively Looking For
Actively identify the following when repository evidence supports them.
## 24.1 Architecture Decision
A change that determines later structure or responsibility boundaries.
## 24.2 Core Mechanism
Implementation of behavior central to the project's purpose.
## 24.3 Difficult Debugging
A bug fix that identifies and corrects the actual cause rather than masking the
symptom.
## 24.4 Failed Approach → Correction
A visible historical progression where an earlier implementation is shown by
later repository evidence to be insufficient and is replaced with a better
structure.
Do not call something a failed approach unless the history supports that
interpretation.
## 24.5 Invariant Restoration
A commit restoring a correctness, security, ownership, lifecycle, resource, or
state condition that could previously be violated.
## 24.6 Edge-case Discovery
A meaningful boundary condition discovered after normal-path implementation.
## 24.7 Test-driven Structural Change
Tests or verification requirements lead to an interface or architecture
improvement.
## 24.8 Integration Problem
A real problem emerges when previously independent subsystems interact.
## 24.9 Failure-path Engineering
Meaningful handling of:
- timeout
- disconnect
- cleanup
- rollback
- shutdown
- malformed input
- partial failure
- retry exhaustion
- stale state
- interrupted lifecycle
- invalid ordering
# 25. Do Not Force an Importance Distribution
Do not impose quotas such as:
```text
S = 10%
A = 20%
B = 50%
C = 20%
```
Projects differ.
However, if S becomes common, reassess whether the meaning of S has been
diluted.
S should remain a limited set of commits capable of explaining the core
technical development of the project.
# 26. Uncertainty
Every classified commit must still receive exactly one grade:
```text
S / A / B / C
```
Uncertainty modifies confidence in the supporting evidence.
It does not replace the importance grade.
When repository evidence remains genuinely incomplete after the required
inspection:
1. assign the most defensible S / A / B / C grade
2. begin the classification `Why` with:
```text
uncertain:
```
3. briefly explain which material evidence remains ambiguous or unavailable
Do not use `uncertain` merely because comparative grading is difficult.
Before marking uncertainty, inspect as applicable:
- actual diff
- parent state
- resulting state
- nearby commits
- relevant source code
- relevant tests
# 27. Recalibrate After Reviewing the Entire History
Do not permanently finalize grades during the first pass.
After analyzing the full target history:
1. compare all S candidates
2. reconsider the S/A boundary
3. reconsider the A/B boundary
4. compare commits solving similar problems
5. verify consistency across subsystems
6. confirm that actual core technical areas are represented appropriately
7. remove grades inflated by LOC
8. remove grades inflated by commit wording
9. remove grades inflated merely by touching a core subsystem
10. check whether small but critical fixes were undervalued
11. verify that implementation difficulty was not confused with project
    importance
12. verify that Development Thread membership did not inflate supporting
    commits
13. verify that one engineering decision was not counted as S/A repeatedly
    across multiple atomic commits
Recalibration may alter commit grades.
It must not silently redefine the Project Importance Profile merely to make the
results fit.
# 28. `commit-importance.md` Output Format
Use the following structure.
## A. Project Importance Profile
```markdown
# Project Importance Profile
Project:
Domain:
Primary Purpose:
Resolved Commit Scope:
## Core Technical Areas
- ...
## Core Architecture
- ...
## Critical Invariants
- ...
## Major Engineering Difficulties
- ...
## Practical Engineering Areas
- ...
## S-level Criteria
- ...
## A-level Criteria
- ...
## Typical B-level Work
- ...
## Typical C-level Work
- ...
## Project-specific Tags
TAG — definition
TAG — definition
...
```
## B. Commit Classification
Include every commit in the resolved target history.
Use:
```markdown
# Commit Classification
| Commit | Subject | Importance | Tags | Summary | Why |
| --- | --- | --- | --- | --- | --- |
| `abc123def456` | `<existing subject>` | S | ARCH, CORE | ... | ... |
| `def456abc123` | `<existing subject>` | A | DEBUG, EDGE | ... | ... |
| `123abc456def` | `<existing subject>` | B | CORE | ... | ... |
| `456def123abc` | `<existing subject>` | C | - | ... | ... |
```
`Summary` briefly states what the commit does.
`Why` explains why the work deserves the assigned grade relative to this
project.
Do not use `Why` as a second commit body.
The distinction is:
```text
Commit body:
Why was this implementation or technical decision appropriate?
Classification Why:
Why is this decision Critical, Significant, Normal, or Minor relative to the
rest of this project's development?
```
For genuinely incomplete evidence:
```text
uncertain: <brief explanation>
```
may appear at the beginning of `Why`.
The Importance column must still contain S / A / B / C.
## C. Development Threads
Use:
```markdown
# Development Threads
## Thread: <name>
`abc123def456` B — <role in thread>
↓
`def456abc123` A — <role in thread>
↓
`123abc456def` S — <role in thread>
↓
`456def123abc` A — <role in thread>
**Significance**
<Explain the engineering progression and why the sequence matters.>
```
Include only meaningful threads.
## D. Most Important Commits
Select the commits that most strongly explain the project's engineering story.
Do not force a fixed:
- Top 5
- Top 10
- percentage
- subsystem quota
Most Important Commits should normally come from S-level commits.
An exceptional A-level commit may be included when it reveals an important:
- debugging sequence
- failure-path correction
- integration problem
- engineering lesson
that is not otherwise represented.
For each selected commit:
```markdown
## <existing commit subject>
Commit: `abc123def456`
Importance: S
Tags: ARCH, CORE
### Problem
...
### Decision
...
### Why it mattered
...
### What changed
...
### Why this is important for understanding the project
...
```
`Problem` does not require a pre-existing defect.
For foundational commits, it may describe the design requirement,
architectural constraint, correctness risk, or system property that the commit
must satisfy.
Do not invent an earlier bug, failed implementation, or historical problem
when repository evidence shows that the commit is foundational rather than
corrective.
# 29. Most Important Commit Selection Guardrail
Do not select commits merely to provide one representative from every:
- subsystem
- technical area
- commit type
- directory
Selection must reflect actual engineering significance.
It is acceptable for several selected commits to come from the same subsystem
when that subsystem contains most of the project's defining engineering work.
A subsystem does not require representation when none of its commits meet the
selection standard.
# 30. Final Verification
Before producing the final files, verify all of the following.
## Scope and Ordering
- the target commit scope was resolved before classification
- unrelated inherited history was not silently classified
- merge commits were treated according to their own engineering significance
- parent commits appear before descendants whenever both are in scope
- timestamp is used only as a secondary order for commits without an ancestry
  relationship
- both files use consistent history ordering where applicable
- abbreviated SHAs uniquely identify every commit in scope
- one consistent SHA abbreviation length is used throughout
  `commit-importance.md`
## Project Analysis
- the project was analyzed before importance criteria were finalized
- the Project Importance Profile reflects the actual domain and implementation
- README claims were checked against actual code and history
- project-specific criteria were established before final grading
- the grading rubric was not changed merely to justify preferred results
## Commit Inspection
- every classified commit's actual diff was inspected
- root commits were compared against the empty tree
- merge commits were inspected against relevant parents when needed to isolate
  semantic integration performed by the merge itself
- S/A candidates received deeper contextual inspection
- no S/A grade was assigned from subject or diff summary alone
- historical context was used without inventing private intentions
## Commit Bodies
- documentation-only commits were excluded
- pure non-semantic merge commits were not given invented rationale
- non-documentation chore commits were not silently omitted merely for being
  minor
- trivial changes were kept short instead of being artificially deep
- bodies explain decisions and rationale when repository evidence supports them
- no body merely narrates the diff line by line
## Importance Classification
- every commit received S / A / B / C
- large diffs were not automatically promoted
- small diffs were not automatically demoted
- commit type did not determine importance
- important subsystem membership did not automatically determine importance
- implementation difficulty was not confused with project importance
- S remained selective
- excellent engineering practice was not automatically classified as S
- tests were graded according to what they establish
- dependency/security commits were graded according to actual project impact
- refactors were graded according to structural significance rather than size
## Tags
- the tag vocabulary is stable
- near-synonymous tags were avoided
- tags describe significance rather than justify the grade
- HARD, LEARNING, and PRACTICAL did not independently increase importance
## Historical Development
- meaningful debugging work was identified
- failure paths and edge cases were considered
- lifecycle, state, security, persistence, protocol, ownership, or other
  project-relevant invariants were recognized
- Development Threads represent real engineering progression
- commits were not grouped merely because they touch the same subsystem
- thread importance did not propagate automatically to all member commits
- one major engineering decision was not double-counted across every supporting
  atomic commit
## Recalibration
- all S candidates were compared against each other
- S/A and A/B boundaries were revisited
- similar commits were graded consistently
- small but important corrections were not undervalued
- LOC and commit-message wording did not inflate grades
- the final classification remains internally consistent within the project
## Uncertainty
- every uncertain classification still has S / A / B / C
- uncertainty is stated only when material evidence genuinely remains
  incomplete
- uncertainty was not used to avoid comparative judgment
## Output Integrity
- exactly two Markdown files were created unless additional artifacts were
  explicitly requested
- existing commit subjects are preserved exactly
- duplicate subjects were not modified
- `commit-bodies.md` contains no SHA or importance metadata
- `commit-importance.md` contains every commit in the resolved target scope
- no unsupported personal motivations or historical narratives were invented
- the selected output language did not alter technical content, evidence
  standards, grading criteria, reasoning depth, or level of detail
# 31. Final Objective
The purpose of this task is not merely to summarize commits or rank them.
The purpose is to reconstruct from Git history:
> which engineering decisions actually mattered,
> which mechanisms, invariants, and responsibility boundaries shaped the
> project,
> which difficult problems emerged during development,
> how those problems were corrected or verified,
> how important technical decisions evolved across multiple commits,
> and which commits best explain the finished project's engineering history.
`commit-bodies.md` explains the engineering meaning of individual changes.
`commit-importance.md` explains the relative significance of those changes
within the development of the entire project.
The final result should allow a technically competent reader to understand both:
1. why each relevant change was technically appropriate, and
2. which parts of the Git history actually represent the project's most
   important engineering decisions.