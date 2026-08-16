# Project Importance Profile
Project: `container-stack` on branch `web/inception`  
Domain: Single-host containerized web application deployment, stateful service lifecycle, and operational recovery  
Primary Purpose: Build and operate project-owned Nginx, WordPress PHP-FPM, and MariaDB images under Docker Compose while making service boundaries, persistent state, secret handling, interruption recovery, backup/restore, credential rotation, and verification explicit.  
Resolved Commit Scope: The complete independent, linear history of `web/inception`, from root commit `24408b74af38` through tip commit `e9fa836de879`, comprising 87 commits. The history contains no merge commits and no inherited unrelated ancestry. Both documentation-only boundary commits are included in classification even though they were excluded from commit-body generation.

## Core Technical Areas
- Docker image construction and immutable supply-chain inputs for Nginx, WordPress, WP-CLI, PHP, MariaDB, and Debian packages.
- Docker Compose service topology, HTTPS and FastCGI request flow, frontend/backend network separation, health checks, and runtime resource policy.
- First-run bootstrap, readiness, completion markers, idempotent convergence, and restart after interruption.
- Host secret-file validation, bootstrap-only credential delivery, steady-state secret exposure prevention, and coordinated credential rotation.
- Named-volume persistence, database/filesystem consistency, atomic backup publication, verified fresh-project restore, and failed-restore cleanup.
- Per-project management-operation serialization, signal handling, timeouts, rollback, compensation, and resource ownership.
- Runtime diagnostics, redaction, destructive-operation safeguards, test isolation, leak detection, and CI orchestration.

## Core Architecture
- Nginx is the only host-facing service. It terminates TLS on container port 443, serves the shared WordPress document root read-only, and forwards PHP requests to WordPress over FastCGI on the frontend network.
- WordPress owns PHP-FPM execution, WordPress application state, and the private `wordpress_config` volume. It connects to both frontend and backend networks and is the only runtime service that bridges HTTP-facing execution to MariaDB.
- MariaDB owns durable relational state in `mariadb_data` and is attached only to the internal backend network.
- Host-side Python management tools render the Compose model, resolve host secret sources, acquire a per-project advisory lock, and run one-off bootstrap containers. Credentials are sent to those one-off containers through standard input rather than retained in long-running service environments, process arguments, or secret mounts.
- Completion markers and health checks distinguish merely existing files or processes from fully initialized service state. Separate WordPress data and configuration volumes keep `wp-config.php` outside Nginx's mounted view.
- An isolated Docker runtime harness creates unique projects, ports, credentials, image tags, volumes, and diagnostics for each scenario. Local and CI verification treat cleanup and leak detection as part of correctness.

## Critical Invariants
- Only Nginx publishes a host port; MariaDB remains unreachable from the frontend network and host port space.
- A service is not considered ready until both its durable initialization marker and its live process-level readiness condition hold.
- MariaDB and WordPress completion markers are published only after required data, configuration, accounts, and credentials have been created and verified.
- Long-running containers do not retain host secret mounts, password-bearing environment variables, password command arguments, or credential values in logs. The one required application DB credential remains only in the private WordPress configuration volume, which Nginx cannot mount.
- Management operations addressing the same Compose project are serialized, while unrelated projects remain independently operable.
- A failed or cancelled backup never publishes a plausible final backup set, and stopped application services are recovered.
- Restore accepts only a private, checksummed, structurally valid backup and an empty target project; any partial target resources are removed after failure.
- Credential rotation either reaches a state in which all replacement credentials work and all previous credentials fail, or compensates back to a verified prior state. Additional termination signals must not interrupt rollback.
- Destructive cleanup and test recovery remove only explicitly owned resources. Diagnostics are private, redacted, non-overwriting, and fail closed when secret material cannot be safely read.
- Reproducible source pins are matched by runtime version checks so stale caches or unintended package resolution cannot silently satisfy source-only validation.

## Major Engineering Difficulties
- Converging MariaDB system tables, database grants, WordPress core files, configuration, site state, and users after abrupt interruption without treating partially written state as complete.
- Maintaining a strict secret boundary while still supplying several credentials to bootstrap, backup, restore, and rotation operations.
- Producing one usable backup from transactional database state plus filesystem volumes, then publishing it atomically and recovering the live stack after any failure or signal.
- Restoring into newly created Docker resources while rejecting name collisions, validating untrusted archive structure, and guaranteeing rollback of partially created containers, networks, and volumes.
- Rotating credentials that are represented simultaneously in host files, MariaDB accounts, WordPress users, and `wp-config.php`, including commands that may have changed state before reporting failure.
- Testing asynchronous cancellation and process death deterministically through synchronized pause points rather than timing-dependent sleeps.
- Proving Docker resource ownership and cleanup without broad `prune` operations that could affect unrelated developer or CI workloads.
- Keeping immutable build inputs maintainable while also verifying the actual installed runtime packages and application versions.

## Practical Engineering Areas
- Explicit input validation, safe file opening with no-follow semantics, private permissions, bounded reads, atomic replacement, and directory synchronization.
- Health checks, retries, command timeouts, graceful stop periods, signal conversion, and cleanup in `finally` paths.
- Separation of public configuration from credentials and of bootstrap-time state from steady-state runtime state.
- Positive and negative authentication verification, not merely command-success checks.
- Fresh-target checks, collision detection, exact resource labels and names, and ownership-scoped cleanup.
- Redacted diagnostics, bounded log collection, error propagation, and preservation of evidence when cleanup is incomplete.
- Layered verification through static source contracts, rendered Compose checks, real runtime scenarios, control-flow probes, and CI policy checks.

## S-level Criteria
- Establishes the defining three-service architecture or one of the project's core state-management transactions: interruption-safe bootstrap, atomic backup, rollback-safe restore, or coordinated credential rotation.
- Restores a critical cross-subsystem invariant whose violation can leave persistent data, credentials, or Docker resources in an ambiguous and unsafe state.
- Makes a decision indispensable to explaining how the finished project becomes correct under partial failure, rather than merely improving an already-correct implementation.

## A-level Criteria
- Establishes or strongly verifies an important security, persistence, lifecycle, concurrency, recovery, or resource-ownership boundary.
- Solves a non-trivial failure path, edge case, integration problem, or verification weakness that materially changes confidence in a core mechanism.
- Introduces a foundational management or test abstraction used broadly by later work without itself being the defining project transaction.

## Typical B-level Work
- Implements a required service, configuration, helper, CLI connection, or test within an architecture whose main decisions are already established.
- Applies an existing safety or serialization pattern to another subsystem.
- Adds useful but routine validation, observability, packaging, or operator ergonomics.

## Typical C-level Work
- Documentation-only commits, simple naming or ignore-file maintenance, and narrowly mechanical regression assertions.
- Changes with negligible effect on runtime behavior, state ownership, security, recovery, or the project's explanatory architecture.

## Project-specific Tags
ARCH — Establishes or materially changes a responsibility or execution boundary.  
CORE — Implements functionality central to the stack's primary purpose.  
HARD — Contains unusually difficult cross-state, lifecycle, or failure reasoning.  
RISK — Protects a high-impact correctness, security, persistence, or destructive-operation boundary.  
TEST — Establishes meaningful static, integration, runtime, or CI evidence.  
EDGE — Handles a substantive boundary condition, malformed input, collision, or race.  
INTEGRATION — Defines or verifies behavior spanning multiple services or state stores.  
STACK — Concerns the Nginx, WordPress, MariaDB, Compose, network, or request-path structure.  
BOOTSTRAP — Concerns first-run state creation, readiness, completion markers, or convergence.  
SECRETS — Concerns credential sources, exposure boundaries, authentication state, or rotation.  
PERSISTENCE — Concerns named volumes, durable data, backup, or restore.  
RECOVERY — Concerns interruption, compensation, rollback, cleanup, or retry safety.  
SUPPLY_CHAIN — Concerns immutable build artifacts, dependency inputs, or runtime version assurance.  
OPERATIONS — Concerns management commands, limits, observability, cleanup, diagnostics, or CI lifecycle.

# Commit Classification
| Commit | Subject | Importance | Tags | Summary | Why |
| --- | --- | --- | --- | --- | --- |
| `24408b74af38` | docs(readme): 컨테이너 스택 목적과 개발 규약 정의 | C | - | Introduces a README describing the intended stack boundaries and repository rules. | It is documentation-only and precedes the implementation; it provides context but does not itself establish a runtime mechanism or invariant. |
| `038d2dc22373` | chore(repo): 컨테이너 스택 저장소 경계 설정 | B | SECRETS, OPERATIONS | Ignores local environment files, plaintext secrets, logs, PID files, and host metadata. | This is a necessary repository trust boundary, but the implementation is a straightforward application of source-control hygiene rather than a defining runtime decision. |
| `7fec90fdafed` | feat(env): 공개 스택 환경 변수 정의 | B | STACK, OPERATIONS | Adds the checked-in public environment-variable contract for domain, database, and WordPress metadata. | It makes deployment inputs reproducible and separates public configuration from credentials, but it remains normal configuration scaffolding within the later architecture. |
| `f8ec9621725c` | feat(mariadb): Debian 서버 이미지 추가 | B | STACK, PERSISTENCE | Creates the custom Debian MariaDB image and foreground daemon lifecycle. | The image is required for the project-owned database service, yet it mainly establishes expected container packaging and ownership conventions. |
| `1beb8e3c51d0` | feat(mariadb): 네트워크 DB 서버 설정 | B | STACK, PERSISTENCE | Installs explicit MariaDB network, path, charset, and resource settings. | The settings make the database predictable inside containers, but they refine one service rather than determine the stack-wide design. |
| `e13b0357a21b` | feat(mariadb): DB와 애플리케이션 계정 초기화 | A | BOOTSTRAP, SECRETS, CORE | Adds first-run MariaDB initialization, account hardening, database creation, and idempotent volume reuse. | This is the first substantial state-creation mechanism and establishes least-privilege database ownership, even though the later staged bootstrap redesign supersedes parts of it. |
| `2227e6595e99` | feat(wordpress): Debian PHP-FPM 이미지 추가 | B | STACK | Creates the custom Debian PHP-FPM and WP-CLI image for WordPress. | It is necessary service construction, but it follows the established custom-image pattern without introducing a difficult cross-service invariant. |
| `ff3ce464395f` | feat(wordpress): PHP-FPM 풀 설정 | B | STACK, OPERATIONS | Defines the PHP-FPM network listener, bounded worker pool, ping endpoint, and stream logging. | These are competent container-runtime settings and readiness support, but they remain local to the application service. |
| `d764d066167b` | feat(wordpress): 사이트와 사용자 계정 초기화 | A | BOOTSTRAP, PERSISTENCE, CORE | Adds idempotent WordPress core, configuration, site, and user initialization. | It introduces the application half of persistent first-run convergence and separates filesystem, database, and account idempotency boundaries, although later commits make the process interruption-safe. |
| `b32397121bb1` | feat(nginx): TLS 프런트엔드 이미지 추가 | B | STACK, SECRETS | Creates the HTTPS-only Nginx image and runtime self-signed certificate generation. | It establishes the external TLS process, but the core request-routing and stack integration decisions arrive in later commits. |
| `99c03f54399a` | feat(nginx): PHP 요청을 WordPress로 전달 | A | STACK, INTEGRATION, CORE | Adds TLS policy, static delivery, WordPress front-controller routing, FastCGI forwarding, and a health endpoint. | This defines the actual external request path and the Nginx-to-PHP responsibility boundary, making it significant to understanding how the stack serves WordPress. |
| `a8b9f693c614` | feat(compose): 세 서비스 토폴로지 구성 | S | ARCH, STACK, CORE | Introduces the three custom services, shared network, sole HTTPS publication, and named persistent resources in Compose. | This is the foundational system topology. Removing it would leave a major gap in explaining the separation of transport, application execution, and durable state. |
| `968099138c58` | feat(compose): 공개 스택 설정 전달 | B | STACK, OPERATIONS | Maps required public configuration values to the services that consume them. | The commit improves failure timing and least exposure of non-secret settings, but it applies ordinary configuration ownership inside the topology already chosen. |
| `75590dedfb3a` | feat(compose): 준비 상태에 따라 영속 서비스 연결 | A | PERSISTENCE, INTEGRATION, OPERATIONS | Mounts durable data, adds service health checks, and gates startup on dependency health. | It turns the service list into a stateful, readiness-aware stack and establishes important persistence and lifecycle integration across all three containers. |
| `916391b9f8db` | feat(secrets): 비밀번호를 비밀 파일에서 로드 | B | SECRETS, RISK | Replaces password environment values with Compose secret files and `_FILE` inputs. | This is a meaningful intermediate security improvement, but the later one-off bootstrap architecture removes steady-state secret mounts and becomes the durable project boundary. |
| `41372f52d3d6` | build(make): 스택 수명주기 명령 추가 | B | OPERATIONS | Adds Make targets for common Compose lifecycle operations. | It standardizes operator entry points but contains little independent technical judgment beyond wrapping the established Compose model. |
| `5d461e4e9555` | test(static): 스택 소스 계약 검사 | B | TEST, OPERATIONS | Adds static source-contract validation for the stack layout, Dockerfiles, configuration, and secret policy. | The validator provides useful regression coverage, but its initial checks mainly codify already-established structure. |
| `b697bc2523bb` | test(compose): 렌더링된 Compose 설정 검사 | B | TEST, STACK | Extends `make test` to render the Compose model when Docker Compose is available. | This catches interpolation and schema errors earlier, but it is a normal validation layer rather than a project-defining mechanism. |
| `1d0155f0362b` | test(smoke): HTTPS 상태 엔드포인트 검사 | B | TEST, STACK | Adds a retrying HTTPS health smoke check and a Make target. | It provides the first executable frontend check, yet it verifies only a narrow normal path and does not establish the deeper end-to-end guarantees added later. |
| `8804ac547b4a` | build(docker): 임시 파일을 빌드 컨텍스트에서 제외 | C | - | Adds identical `.dockerignore` files for the three service build contexts. | The change is mechanical build-context cleanup with negligible effect on the project's architecture or correctness story. |
| `06d702396c5b` | test(docker): 서비스별 빌드 필터 검사 | C | - | Requires each service build context to contain a `.dockerignore` file. | This is a small regression check for the immediately preceding mechanical files and contributes little to the larger engineering narrative. |
| `a8b7275457fc` | refactor(runtime): Compose 프로젝트 실행 경계 공통화 | A | ARCH, OPERATIONS | Introduces a shared `ComposeProject` abstraction for command construction, timeouts, rendered configuration, and running-service discovery. | Later startup and management tooling depend on this execution boundary; it materially reduces duplicated lifecycle semantics without itself defining the stack's core state model. |
| `486ffb5c65aa` | refactor(secrets): 비밀 파일 로딩 경계 공통화 | A | SECRETS, RISK, ARCH | Adds hardened secret-file reading, rendered secret-path resolution, environment extraction, and stdin payload construction. | This centralizes a critical trust boundary used by startup, backup, restore, rotation, and diagnostics, but it supports rather than alone defines the project-wide lifecycle architecture. |
| `e77c6f151b07` | refactor(runtime): 프로젝트 관리 작업 잠금 공통화 | A | RECOVERY, OPERATIONS, RISK | Adds a per-user, per-project non-blocking advisory lock in a private fixed directory. | Serializing management operations is a critical concurrency invariant across later startup, backup, restore, and rotation flows, though the change is a focused mechanism rather than the whole project architecture. |
| `dc9601f5e670` | fix(init): 중단된 단계별 초기화를 수렴 | S | ARCH, BOOTSTRAP, RECOVERY | Replaces in-container first-run setup with locked, staged one-off bootstrap orchestration, completion markers, and convergent restart behavior. | This is the decisive lifecycle redesign: it removes runtime secret mounts, separates configuration state, survives interrupted initialization, and determines how persistent services are safely brought to readiness. |
| `3beebbfc4723` | test(init): 단계별 초기화 계약 검사 | B | TEST, BOOTSTRAP | Adds static assertions for staged MariaDB and WordPress bootstrap markers and recovery structure. | The checks protect the new design at a source-pattern level, but they do not yet prove real interruption recovery. |
| `9d75a34e290f` | feat(runtime): 프로젝트·이미지·포트·URL 격리 | A | ARCH, STACK, OPERATIONS | Parameterizes project names, image tags, HTTPS binding, port, and canonical WordPress URL while removing fixed container names. | This enables multiple isolated stacks and makes later runtime testing and fresh-project restore possible; it is a significant deployment-boundary improvement. |
| `2c436f574712` | test(bootstrap): 격리된 런타임 하네스 추가 | A | TEST, ARCH, OPERATIONS | Adds an isolated Docker runtime harness with private credentials, random project names, dynamic ports, cleanup, and secret-boundary inspection. | The harness becomes the foundation for the branch's later behavioral evidence and materially changes the project from source-validated configuration to reproducible runtime verification. |
| `8c9b5b9adef2` | test(e2e): HTTPS와 MariaDB를 잇는 WordPress 데이터 검증 | A | TEST, INTEGRATION, STACK | Extends the harness to test HTTPS health, WordPress post creation and rendering, MariaDB persistence, port-conflict recovery, and legacy configuration migration. | It verifies the complete browser-to-database path and catches integration failures that static checks cannot, making it significant but not an architectural implementation commit. |
| `8ca2cc2b9d7d` | chore(test): Python 캐시 산출물 제외 | C | - | Ignores Python bytecode and `__pycache__` directories. | This is routine repository maintenance with no meaningful behavioral or structural consequence. |
| `fb1a689cf969` | test(persistence): 재시작·재생성 뒤 상태 보존 검증 | A | TEST, PERSISTENCE, RISK | Verifies posts, options, uploads, and all three named volumes across container restart and recreation. | The test locks down a central durable-state invariant and distinguishes container lifecycle from volume lifecycle, providing strong evidence for a core project guarantee. |
| `fdd55605ba74` | feat(backup): 백업 무결성과 비공개 파일 I/O 정의 | B | PERSISTENCE, OPERATIONS | Introduces SHA-256 helpers, directory synchronization, and exclusive private-file output primitives for backup work. | These are necessary low-level safety utilities, but they are supporting pieces whose project significance depends on later backup publication and restore orchestration. |
| `d26c885c5cd5` | feat(backup): 관리 작업 신호와 테스트 중단 경계 추가 | A | RECOVERY, TEST, HARD | Adds controlled signal handling plus deterministic failure and pause stages for management-operation tests. | It creates a reliable way to exercise asynchronous cancellation through the same cleanup paths as ordinary errors, a significant failure-path engineering boundary used throughout backup and rotation testing. |
| `2a42e5bc0c32` | feat(backup): 백업용 Compose 실행 어댑터 추가 | B | PERSISTENCE, OPERATIONS | Adds a backup-specific Compose execution adapter with streaming input/output and bounded command categories. | It is substantial support code, but largely reproduces an already-established execution pattern in preparation for the backup mechanism. |
| `13548226f748` | feat(backup): WordPress 아카이브 입력 검증 | A | PERSISTENCE, RISK, EDGE | Validates WordPress tar streams against absolute paths, traversal, duplicates, and non-regular archive members. | This closes a meaningful restore-input attack and corruption boundary; a malformed archive could otherwise write outside intended volumes or create unsupported filesystem objects. |
| `3a0995ff0d4f` | feat(backup): 프로젝트별 백업 작업 잠금 적용 | B | RECOVERY, OPERATIONS, PERSISTENCE | Applies the per-project advisory lock model to backup operations. | The lock is important, but this commit mainly extends an existing serialization decision to another management path rather than introducing a new project-wide mechanism. |
| `b478b5243c5a` | feat(backup): DB 덤프와 WordPress 볼륨 수집 | A | PERSISTENCE, CORE, INTEGRATION | Streams a transactional MariaDB dump and a WordPress data/config archive into private files. | This implements the substantive data-capture path spanning database and filesystem state, a major component of backup functionality but not yet its atomic publication guarantee. |
| `0540ff1b5a4b` | feat(backup): 백업 출력 경로를 안전하게 예약 | A | PERSISTENCE, RISK, EDGE | Normalizes and reserves a new backup output directory while tracking its exact inode identity. | The small interface prevents overwrite, symlink, and path-substitution races at the publication boundary, protecting the integrity of a high-risk destructive and archival workflow. |
| `6999190ffd34` | feat(backup): 백업 세트를 원자적으로 게시 | S | PERSISTENCE, RECOVERY, HARD | Stops application writers, captures database and WordPress state, writes a checksummed manifest, atomically publishes the set, and recovers services on failure. | This is the defining backup transaction. It establishes the all-or-nothing publication and service-recovery guarantees needed to treat a directory as a valid backup. |
| `81ce9acf5fa0` | feat(backup): 백업 CLI와 Make 타깃 연결 | B | PERSISTENCE, OPERATIONS | Exposes backup through a validated CLI and `make backup` target. | The change makes the completed mechanism operable, but it primarily connects existing implementation to user-facing command dispatch. |
| `b6920a0c918c` | test(backup): 게시 실패와 중단 정리 검증 | A | TEST, RECOVERY, PERSISTENCE | Adds runtime checks for failed backup publication, signal cancellation, service recovery, temporary cleanup, and cross-`TMPDIR` lock contention. | It materially validates the negative guarantees of atomic backup: failure must publish nothing, restore the live stack, and release scoped synchronization resources. |
| `e5cb60c7d743` | feat(restore): Compose 리소스 이름과 기존 객체 조회 | B | PERSISTENCE, OPERATIONS | Adds discovery of rendered Compose resource names and existing labelled or conventionally named objects. | This is necessary restore plumbing, but it mainly inventories resources within the restore architecture developed by subsequent commits. |
| `851dc1708881` | feat(restore): 대상 프로젝트 자원 충돌 사전 차단 | A | PERSISTENCE, RISK, EDGE | Rejects restore targets that already contain matching containers, volumes, or networks. | Fresh-project enforcement prevents restore from overwriting or mixing with live state and establishes a significant safety precondition for all later restore steps. |
| `953a0f6bd571` | feat(restore): 백업 입력의 형식과 체크섬 검증 | A | PERSISTENCE, RISK, EDGE | Opens a private backup set with no-follow and locking checks, validates its exact files, manifest format, checksums, and archive structure. | This creates the restore trust boundary. It ensures restoration consumes one stable, owner-controlled, internally consistent backup rather than mutable or substituted input. |
| `1250fcf7c006` | feat(restore): DB와 WordPress 데이터를 새 볼륨에 주입 | B | PERSISTENCE, INTEGRATION | Imports the SQL stream into MariaDB and extracts the WordPress archive only into empty data and config volumes. | It is core restore work, but the implementation follows the already-defined verified-input and fresh-target contracts; rollback and lifecycle safety arrive later. |
| `9ca04b1c30cd` | feat(restore): 실패한 복원 자원을 정리하고 롤백 | S | PERSISTENCE, RECOVERY, HARD | Orchestrates fresh database bootstrap, SQL import, WordPress extraction, application startup, and complete resource cleanup on any restore failure. | This is the defining restore mechanism and its critical failure invariant. Without it, partial restoration could leave plausible but unusable project resources and make retries unsafe. |
| `3a37a491ecea` | feat(restore): 복원 CLI와 Make 타깃 연결 | B | PERSISTENCE, OPERATIONS | Adds `restore` CLI dispatch and a guarded Make target. | It exposes the completed restore path without materially changing its correctness or recovery model. |
| `4f8eb9aff842` | test(restore): 거부·롤백·복원 상태 검증 | A | TEST, RECOVERY, RISK | Tests symlinked backup rejection, injected and signalled restore failure cleanup, successful data recovery, and refusal to restore twice. | These scenarios validate the restore security and rollback contracts against real Docker resources, significantly increasing confidence in a high-risk mechanism. |
| `a2d20b8c2c03` | feat(secrets): 교체 비밀 파일을 안전하게 읽고 게시 | A | SECRETS, RISK, OPERATIONS | Adds hardened replacement-secret reads and per-file atomic, durable host-secret publication. | This establishes the host filesystem side of credential rotation and prevents partial individual files or unsafe input types from entering a multi-system state transition. |
| `8a41f018e6c3` | feat(secrets): Compose 자격증명 경로와 계정 설정 해석 | B | SECRETS, STACK | Resolves active secret paths and account identities from the rendered Compose model. | It is necessary configuration interpretation for rotation, but it is supporting work within the previously established rendered-model boundary. |
| `832d182743ea` | feat(secrets): MariaDB 계정 비밀번호 원자 교체 | A | SECRETS, RISK, INTEGRATION | Adds root-authenticated MariaDB SQL execution and coordinated application/root password changes through private option files. | This implements a high-risk part of credential rotation while keeping credentials out of process arguments and preserving SQL literal correctness. |
| `0aa998fdd344` | feat(secrets): WordPress 설정과 사용자 비밀번호 교체 | A | SECRETS, RISK, INTEGRATION | Adds atomic `wp-config.php` DB-password replacement and WordPress administrator/author password changes. | The commit coordinates filesystem configuration and application database state, establishing the WordPress side of the cross-subsystem rotation problem. |
| `2d4afddfdc8f` | feat(secrets): 교체 전후 자격증명 동작 검사 | B | TEST, SECRETS | Adds probes for MariaDB application credentials, WordPress user passwords, and the DB password stored in WordPress configuration. | These helpers are important verification support, but they do not yet define the rotation transaction or its rollback behavior. |
| `617c5bd4c58a` | feat(secrets): 런타임 비밀 노출 경계 검사 | A | SECRETS, RISK, TEST | Inspects mounts, container and process environments, command lines, and Nginx-visible files for secret leakage. | This locks down a project-defining steady-state security boundary: bootstrap credentials must not persist in long-running containers, while private WordPress configuration remains inaccessible to Nginx. |
| `64844c583211` | feat(secrets): 신규 자격증명 수용과 기존 값 거부 검증 | A | TEST, SECRETS, RISK | Verifies new credentials work, old credentials fail, configuration matches, and no accepted or rejected value leaks into runtime metadata. | Successful rotation requires both positive and negative authentication evidence; this commit makes that state transition verifiable rather than inferred from command success. |
| `c68486d55f30` | feat(secrets): 회전 실패 시 기존 자격증명 복구 | A | SECRETS, RECOVERY, HARD | Adds compensation that restores database accounts, WordPress configuration and users, host files, and a verified running stack after rotation failure. | This is significant multi-store rollback engineering, though the following correction handles additional ambiguous command and signal states not yet covered here. |
| `9934b478c79a` | feat(secrets): 스택 자격증명 회전 절차 연결 | S | SECRETS, RECOVERY, CORE | Coordinates the complete credential rotation sequence, serializes it, recreates services, verifies new values and rejection of old ones, and invokes compensation on failure. | Credential rotation is a defining management mechanism spanning four host files, MariaDB accounts, WordPress users, and application configuration; this commit establishes that transaction. |
| `2e6649a7706d` | fix(secrets): 회전 중단과 불명확한 상태를 보상 | S | SECRETS, RECOVERY, HARD | Adds stage-level failure injection, interruption handling, ambiguous post-write compensation, and deferred signals during rollback. | This corrects non-obvious partial-state hazards in the rotation transaction. It is essential to explaining how the project prevents operator cancellation or uncertain command outcomes from interrupting recovery itself. |
| `0da35c72add5` | test(secrets): 회전 롤백과 재시도 검증 | A | TEST, SECRETS, RECOVERY | Exercises successful rotation, multiple post-write failures, signal interruption during host-file publication, rollback, leak checks, and retry with the same inputs. | The scenario provides strong real-system evidence for one of the project's hardest state transitions and protects against regressions in compensation ordering. |
| `3e29fbd34389` | build(images): Debian 이미지와 패키지 입력 고정 | A | SUPPLY_CHAIN, RISK, ARCH | Pins all service base images by digest and redirects Debian packages to an immutable dated snapshot. | This changes the build trust model from moving upstream inputs to reviewed immutable inputs, a significant reproducibility and supply-chain decision despite not changing application behavior. |
| `f60ac8061c01` | build(wordpress): WordPress 산출물을 고정해 게시 | A | SUPPLY_CHAIN, BOOTSTRAP, RISK | Pins WP-CLI and WordPress archives with checksums, stages WordPress core in the image, atomically reconciles files at bootstrap, and disables automatic core updates. | It removes runtime downloads from initialization and makes the application artifact an immutable, verified build input, significantly strengthening both reproducibility and recovery semantics. |
| `7b28cccaec1d` | test(supply-chain): 불변 image 입력 검증 | A | TEST, SUPPLY_CHAIN, RISK | Checks immutable Debian and WordPress pins statically and verifies the running WordPress and WP-CLI versions. | The commit protects the newly established supply-chain contract from silent reversion to moving inputs or runtime downloads. |
| `27a3dca01d3b` | feat(network): DB 트래픽을 내부 backend로 격리 | A | STACK, RISK, ARCH | Splits frontend and backend networks, attaching MariaDB only to an internal backend. | This materially narrows the database communication boundary and makes WordPress the sole bridge between request-serving and persistence networks. |
| `911544133fb4` | feat(runtime): 서비스 자원과 종료 한계 적용 | B | OPERATIONS, RISK, STACK | Applies CPU, memory, PID, file-descriptor, stop-signal, privilege, and log-rotation limits to all services. | The policy is broad and useful, but it applies standard operational hardening to the already-defined runtime rather than changing core state or data flow. |
| `dd3be1036017` | feat(nginx): 접근·오류 로그를 컨테이너 스트림에 게시 | B | OPERATIONS, STACK | Routes Nginx access and error logs to the container output streams. | This improves observability through a conventional container logging pattern without introducing a new lifecycle or correctness mechanism. |
| `102af1f113ed` | refactor(nginx): 스택 전용 TLS 산출물 이름 사용 | C | - | Renames the generated TLS certificate and key from project-legacy names to `container-stack` names. | The change is a mechanical naming cleanup with no security, routing, or lifecycle effect. |
| `74c285925325` | fix(make): 볼륨 삭제 전에 확인을 요구 | A | OPERATIONS, RISK, EDGE | Requires an exact project-name confirmation before `fclean` deletes volumes and local images. | A very small diff protects the project's most destructive operator action and restores an important ownership and data-loss boundary. |
| `fe313b9a452d` | build(compose): 엄격한 설정 검사 추가 | B | TEST, OPERATIONS | Adds a strict Compose-rendering target that fails when Docker or Compose v2 is unavailable. | It provides a reliable preflight check but remains normal build and configuration validation. |
| `ef74ad47ea81` | feat(diagnostics): Compose 비밀값과 민감 항목 마스킹 | A | OPERATIONS, SECRETS, RISK | Derives secret paths and values from rendered Compose configuration and defines fail-closed redaction of credentials and sensitive assignments. | Diagnostics can themselves become a leakage channel; this commit establishes the critical rule that collection stops when required secrets cannot be read and redacted. |
| `511f5e62e5e7` | feat(diagnostics): 컨테이너 런타임 상태 수집 | B | OPERATIONS | Collects selected container lifecycle, health, limit, logging, security, and network state. | It adds useful diagnostic content, but the private publication and redaction guarantees are established in adjacent commits. |
| `27a083d91c87` | feat(diagnostics): 비공개 진단 세트와 CLI 연결 | A | OPERATIONS, SECRETS, RISK | Publishes an exclusive private diagnostic directory with allowlisted, redacted Compose, log, version, and container-state files. | This completes a safe observability mechanism: failure evidence becomes actionable without overwriting existing output or exposing credential material. |
| `7fbd41fe5af4` | test(operations): 자원·격리·삭제 보호·진단 검증 | A | TEST, OPERATIONS, RISK | Verifies runtime limits, network membership, destructive-action refusal, fail-closed redaction, file permissions, overwrite refusal, and symlink-output rejection. | The scenario materially validates several operational and security boundaries that configuration inspection alone cannot prove. |
| `9ddd4317e3b9` | fix(smoke): HTTPS 연결과 응답 대기시간 제한 | B | OPERATIONS, EDGE | Adds connection and total-response timeouts to the HTTPS smoke loop. | The small fix prevents an unavailable endpoint from hanging each retry indefinitely, a useful reliability correction but not a project-defining change. |
| `f905e83f915e` | test(smoke): HTTPS timeout 계약 검사 | C | - | Adds static checks that the smoke script retains both curl timeout options. | This is a narrow regression assertion for a two-option shell change and contributes little independent engineering significance. |
| `98e4af62e884` | test(runtime): 프로세스·비밀값·정리 제어 흐름 강화 | A | TEST, RECOVERY, OPERATIONS | Makes private fixture replacement durable, separates start command construction, improves timeout diagnostics, and treats cleanup failure as test failure. | It strengthens the verification control plane so successful scenarios cannot hide leaked resources or incomplete teardown, a significant reliability property for the extensive runtime suite. |
| `2bf6d3f11337` | test(init): 안정 단계별 초기화 중단 복구 검증 | A | TEST, BOOTSTRAP, RECOVERY | Kills MariaDB and WordPress bootstrap containers at every durable stage, reruns startup, and verifies state, credentials, markers, and temporary-file cleanup. | This is unusually strong evidence for the staged-convergence invariant and demonstrates that the core initialization design survives abrupt process death rather than only graceful errors. |
| `030e7310c665` | test(backup): 자원 충돌과 시그널 경계 검증 | A | TEST, PERSISTENCE, EDGE | Adds signal-race checks, labelled and name-only restore-collision refusal, large filesystem and database fixtures, checksums, and stricter secondary cleanup reporting. | It tests boundary conditions that small normal-path fixtures and simple cancellation cannot cover, protecting the integrity and lifecycle guarantees of backup and restore. |
| `2557079c2d19` | test(secrets): 회전 후 런타임 비밀 경계 고정 | B | TEST, SECRETS | Statically forbids rotation tests from depending on obsolete runtime secret mounts and requires post-rotation cleanup checks. | It preserves the intended secret architecture, but the change is a focused regression guard rather than a new security mechanism. |
| `2b35aa3d2217` | test(cleanup): 테스트 프로젝트 소유 자원만 정리 | A | OPERATIONS, RECOVERY, RISK | Records exact test project ownership, removes only owned Compose resources and image tags, and adds a scoped crash-recovery cleanup tool with private reports. | This solves a high-risk verification-lifecycle problem without broad Docker pruning, ensuring failed tests cannot damage unrelated developer or CI resources. |
| `43ccded05e4f` | test(verify): 전체 스택 검증을 직렬 실행 | A | TEST, OPERATIONS, RECOVERY | Runs static checks and all runtime scenarios serially with per-scenario timeouts, shared project records, and mandatory final leak recovery. | It defines the complete local verification transaction and makes resource cleanliness part of success, significantly improving confidence and failure attribution. |
| `1238479a40f2` | ci(stack): 커밋 범위 공백 검사 도구 추가 | B | TEST, OPERATIONS | Adds a validated commit-range `git diff --check` helper with safe fallback behavior. | It is useful CI plumbing that scopes whitespace checks to introduced changes, but it has little bearing on the stack's runtime engineering. |
| `18508c25eef0` | ci(stack): 정적·런타임·복구 검증 자동화 | A | TEST, OPERATIONS, SUPPLY_CHAIN | Adds a least-privilege, pinned-action GitHub Actions workflow running all static and runtime scenarios, scoped cleanup, and allowlisted failure diagnostics. | This is significant integration of the project's verification, supply-chain, and resource-ownership policies into automation, though it does not alter product runtime behavior. |
| `8a6c07988160` | test(ci): workflow 검증 계약 추가 | A | TEST, OPERATIONS, RISK | Expands static and AST-based checks to enforce workflow permissions, action pins, scenario ordering, timeouts, secret boundaries, cleanup semantics, and safe subprocess use. | The commit protects the verification system itself from subtle weakening and provides layered evidence for security and lifecycle properties across many tools. |
| `8d028040544e` | test(docs): README 운영 안내 계약 검증 | C | - | Requires the README to retain basic project, service, secret, and verification terminology in Korean. | This is documentation-contract maintenance; it improves discoverability but carries little technical significance relative to runtime and recovery work. |
| `cd5982c8ea42` | fix(supply-chain): 보안 지원 runtime pin 갱신 | B | SUPPLY_CHAIN, RISK | Advances the reviewed Debian digest, package snapshot, WordPress version, checksum, and matching assertions. | The update is security- and support-relevant, but it follows the immutable-input mechanism already established rather than introducing a new trust model. |
| `127a70f6e4b2` | test(supply-chain): 검토된 runtime 최소 버전 검증 | A | TEST, SUPPLY_CHAIN, RISK | Verifies installed package minimums plus the live PHP and MariaDB compatibility floors inside the built stack. | This closes the gap between source pins and actual runtime contents, catching stale caches or unexpected package resolution in a security-sensitive build path. |
| `e9fa836de879` | docs(project): 프로젝트 문서 정리 | C | - | Replaces the initial README with comprehensive architecture, operation, recovery, and development-history documentation. | The material is valuable operator documentation, but it is documentation-only and does not change the completed system or its verified invariants. |

# Development Threads

## Thread: From custom services to a readiness-aware three-tier stack
`f8ec9621725c` B — Established the project-owned MariaDB runtime and persistent-data ownership.
↓
`e13b0357a21b` A — Added the first idempotent database and account bootstrap.
↓
`d764d066167b` A — Added WordPress filesystem, site, and user convergence.
↓
`99c03f54399a` A — Defined the HTTPS-to-FastCGI request boundary.
↓
`a8b9f693c614` S — Assembled the three service responsibilities into the core Compose topology.
↓
`75590dedfb3a` A — Connected named volumes, health checks, and dependency readiness.

**Significance**
The thread progresses from individually runnable containers to one stateful application system. The decisive step is not the existence of three images but the Compose responsibility boundary: Nginx owns external transport, WordPress owns application execution, and MariaDB owns durable relational state. Health-gated dependencies and mounted volumes then make the topology operationally meaningful rather than merely connected.

## Thread: From runtime secret mounts to convergent one-off bootstrap
`916391b9f8db` B — Moved passwords out of ordinary environment values into Compose secret files.
↓
`486ffb5c65aa` A — Centralized hardened host secret-file resolution and reading.
↓
`e77c6f151b07` A — Established per-project management-operation serialization.
↓
`dc9601f5e670` S — Replaced steady-state secret mounts and one-shot initialization with staged one-off bootstrap.
↓
`3beebbfc4723` B — Added a source contract for completion markers and staged recovery.
↓
`2bf6d3f11337` A — Killed bootstrap containers at every durable stage and proved rerun convergence.

**Significance**
The earlier `_FILE` and Compose-secret model reduced direct environment exposure but still attached credential material to service startup. The later architecture resolves secrets on the host while holding the project lock, sends only required values to short-lived bootstrap containers, and lets long-running services start from verified persistent state. The final SIGKILL scenario is important because it validates the design's intended convergence after process death, not only after controlled errors.

## Thread: Isolated runtime evidence and persistent-state verification
`9d75a34e290f` A — Removed fixed project, image, port, and URL identities.
↓
`2c436f574712` A — Created the isolated Docker runtime harness and secret-boundary inspection.
↓
`8c9b5b9adef2` A — Verified the complete HTTPS, FastCGI, WordPress, and MariaDB data path.
↓
`fb1a689cf969` A — Verified database, option, upload, and volume identity across restart and recreation.

**Significance**
Parameterization made independent test projects possible; the harness then turned those parameters into controlled Docker resources and private credentials. End-to-end and persistence scenarios prove distinct properties: one shows that the integrated request/data path works, while the other shows that container replacement does not replace authoritative volume state.

## Thread: Atomic backup publication under failure and cancellation
`fdd55605ba74` B — Defined private output, synchronization, and checksum primitives.
↓
`d26c885c5cd5` A — Created deterministic signal and failure-test boundaries.
↓
`3a0995ff0d4f` B — Serialized backup with other operations on the same project.
↓
`b478b5243c5a` A — Captured transactional MariaDB and WordPress volume streams.
↓
`0540ff1b5a4b` A — Reserved and identity-checked the destination path.
↓
`6999190ffd34` S — Published a complete checksummed backup set atomically and recovered services.
↓
`b6920a0c918c` A — Verified non-publication, cleanup, recovery, and shared-lock behavior on failure.
↓
`030e7310c665` A — Extended evidence to signal races, large data, and collision boundaries.

**Significance**
The implementation deliberately separates data capture from publication. Private streaming files, an exact output reservation, a manifest, and directory replacement ensure that only a complete set becomes visible. Signal-aware recovery and negative runtime tests establish the equally important converse: cancelled or failed work must not leave a plausible backup or a degraded source stack.

## Thread: Verified fresh-project restore with cleanup rollback
`e5cb60c7d743` B — Mapped rendered and conventionally named Docker resources.
↓
`851dc1708881` A — Made an empty target project a restore precondition.
↓
`953a0f6bd571` A — Established the private, locked, checksummed backup input boundary.
↓
`1250fcf7c006` B — Injected SQL and WordPress streams into empty new volumes.
↓
`9ca04b1c30cd` S — Orchestrated startup and removed every partial resource after failure.
↓
`3a37a491ecea` B — Exposed restore through the CLI and Makefile.
↓
`4f8eb9aff842` A — Verified malformed input refusal, failure cleanup, interruption, and successful state.
↓
`030e7310c665` A — Added stopped and unlabelled collision cases plus large restored fixtures.

**Significance**
Restore is treated as creation of a new project, not as an in-place overwrite. That constraint makes rollback tractable: verified input is applied only after collision checks, and any failure removes the resources created by the attempt. The later tests show that refusal preserves pre-existing objects and that the streaming implementation remains correct beyond small fixtures.

## Thread: Coordinated credential rotation and compensation
`a2d20b8c2c03` A — Established safe replacement input and atomic host-file publication.
↓
`832d182743ea` A — Implemented MariaDB application and root credential changes.
↓
`0aa998fdd344` A — Implemented WordPress configuration and user credential changes.
↓
`64844c583211` A — Required replacement credentials to work and previous values to fail.
↓
`c68486d55f30` A — Added cross-store rollback to the prior verified state.
↓
`9934b478c79a` S — Connected the ordered, locked, verified rotation transaction.
↓
`2e6649a7706d` S — Compensated ambiguous post-write failures and deferred signals during rollback.
↓
`0da35c72add5` A — Exercised successful rotation, injected failures, interruption, rollback, leak checks, and retry.
↓
`2557079c2d19` B — Prevented tests from weakening the steady-state secret boundary.

**Significance**
Credentials are represented in four host files, two MariaDB accounts, two WordPress users, and WordPress configuration. The thread therefore evolves from individual mutation primitives to a verified state transition and then to compensation for commands that may change state before failing. Deferring further termination while rollback is active is the key correction that prevents recovery itself from being interrupted.

## Thread: Immutable build inputs and runtime supply-chain evidence
`3e29fbd34389` A — Pinned Debian base images and package repositories to immutable inputs.
↓
`f60ac8061c01` A — Pinned WordPress and WP-CLI artifacts and moved core publication into bootstrap reconciliation.
↓
`7b28cccaec1d` A — Locked the source pins and running application versions in tests.
↓
`cd5982c8ea42` B — Advanced the reviewed immutable runtime set without returning to moving inputs.
↓
`127a70f6e4b2` A — Verified installed package minimums and live PHP/MariaDB compatibility floors.

**Significance**
Reproducibility is treated as a maintained contract rather than a one-time freeze. The first commits make upstream identities explicit; the later update demonstrates how supported versions advance; and runtime inspection closes the gap between strings in Dockerfiles and the software actually executing inside containers.

## Thread: Operational hardening, private diagnostics, and bounded automation
`27a3dca01d3b` A — Separated public request traffic from the internal database network.
↓
`911544133fb4` B — Applied resource, stop, privilege, and log-rotation policy.
↓
`74c285925325` A — Guarded destructive volume deletion with exact project confirmation.
↓
`ef74ad47ea81` A — Established fail-closed diagnostic redaction.
↓
`27a083d91c87` A — Published exclusive private diagnostic sets.
↓
`7fbd41fe5af4` A — Verified runtime limits, network membership, deletion refusal, and diagnostic safety.
↓
`98e4af62e884` A — Made scenario cleanup failures affect verification results.
↓
`2b35aa3d2217` A — Tracked exact project ownership and added scoped leak recovery.
↓
`43ccded05e4f` A — Serialized the complete local verification lifecycle.
↓
`18508c25eef0` A — Automated all scenarios under least-privilege, pinned CI actions.
↓
`8a6c07988160` A — Validated the workflow, tool timeouts, secret boundaries, cleanup, and artifact allowlist.

**Significance**
This progression turns operational policy into executable evidence. Runtime limits and network boundaries are inspected on live containers; destructive commands and diagnostics fail safely; and both local and CI runners account for every project resource they create. The cleanup tooling deliberately avoids global Docker pruning, preserving the same ownership discipline used by the product management paths.

# Most Important Commits

## feat(compose): 세 서비스 토폴로지 구성
Commit: `a8b9f693c614`  
Importance: S  
Tags: ARCH, STACK, CORE

### Problem
The project had independently built Nginx, WordPress, and MariaDB containers, but no authoritative declaration yet defined how their responsibilities formed one system, which service could face the host, or which resources belonged to the stack.

### Decision
Compose became the owner of the three-service topology. Nginx alone published HTTPS, service-name DNS connected the containers, and named volumes were declared for durable application and database state.

### Why it mattered
Every later lifecycle, security, persistence, and test decision assumes this division. Backup stops Nginx and WordPress but dumps MariaDB; network hardening later splits the same topology; runtime tests identify resources through the Compose project.

### What changed
The commit added the initial `docker-compose.yml` with custom image builds, restart policy, one bridge network, port 443 publication only on Nginx, and named MariaDB and WordPress volumes.

### Why this is important for understanding the project
It is the shortest complete statement of the project's architecture: transport terminator, application runtime, persistence owner, internal service discovery, and one external entry point.

## refactor(runtime): 프로젝트 관리 작업 잠금 공통화
Commit: `e77c6f151b07`  
Importance: A  
Tags: RECOVERY, OPERATIONS, RISK

### Problem
Startup, backup, restore, and credential rotation all inspect and mutate the same containers, volumes, accounts, and configuration. Two such operations can each be locally correct yet collectively corrupt their assumptions if they interleave.

### Decision
A per-user lock directory under `/tmp` and a project-name-derived lock file provide non-blocking exclusive `flock` serialization. Ownership, permissions, file type, and no-follow opening are validated before the lock is trusted.

### Why it mattered
The lock defines the concurrency boundary for host-side management. Independent project names retain concurrency, while one project cannot be bootstrapped, backed up, restored, or rotated by competing management processes.

### What changed
The shared runtime module gained `project_operation_lock`; later backup and rotation code adopted the same fixed lock identity and tests proved that different `TMPDIR` values still contend.

### Why this is important for understanding the project
This A-level commit is selected because it explains a cross-cutting invariant that is easy to miss when reading each management tool separately: consistency depends not only on internal rollback but also on excluding concurrent state transitions.

## fix(init): 중단된 단계별 초기화를 수렴
Commit: `dc9601f5e670`  
Importance: S  
Tags: ARCH, BOOTSTRAP, RECOVERY

### Problem
The initial entrypoints initialized persistent volumes during ordinary service startup and consumed mounted secret files. Abrupt termination could leave partially created data that looked reusable, and steady-state containers retained access paths to bootstrap credentials.

### Decision
Initialization moved into explicitly named one-off containers driven by `start_stack.py`. MariaDB builds in a staging directory and publishes it only after verification; WordPress reconciles core files, private configuration, site state, and users before writing completion markers. Secrets are read on the host and sent through standard input only to the bootstrap command.

### Why it mattered
This changes the lifecycle model from 'start and hope first-run setup completes' to 'converge persistent state, mark it complete, then run the service.' It also establishes the final bootstrap-versus-runtime secret boundary.

### What changed
Compose gained separate WordPress configuration storage and marker-aware health checks; MariaDB and WordPress entrypoints were extensively rewritten; Make targets invoked staged startup; and the new orchestrator sequenced database and application phases under the project lock.

### Why this is important for understanding the project
The commit is the central correctness pivot of the branch. It explains why service recreation is safe, why partial initialization can be retried, why health checks include durable markers, and why long-running containers do not need host secret mounts.

## feat(backup): 백업 세트를 원자적으로 게시
Commit: `6999190ffd34`  
Importance: S  
Tags: PERSISTENCE, RECOVERY, HARD

### Problem
A database dump and a filesystem archive are not a backup merely because both commands succeeded. The application can modify one side while the other is captured, partial files can be mistaken for a complete set, and interruption can leave the live stack stopped.

### Decision
The backup operation requires all services running, stops Nginx and WordPress to remove application writers, streams a single-transaction MariaDB dump and WordPress archive into a sibling temporary directory, computes checksums, writes a manifest, synchronizes the directory, and atomically replaces a previously reserved empty destination. A `finally` path restarts services and removes incomplete temporary state.

### Why it mattered
The visible backup directory becomes a publication boundary: it exists as a complete, internally described set or it is not published. Recovery of the source stack is part of the same operation contract.

### What changed
The commit connected secret loading, service-state checks, temporary storage, capture functions, manifest creation, archive validation, inode-identity verification, atomic rename, service restart, and cleanup under signal-aware locking.

### Why this is important for understanding the project
It defines what 'backup correctness' means in this project. Later restore checksums and runtime tests are meaningful because this commit first establishes a trustworthy unit of backup publication.

## feat(restore): 실패한 복원 자원을 정리하고 롤백
Commit: `9ca04b1c30cd`  
Importance: S  
Tags: PERSISTENCE, RECOVERY, HARD

### Problem
Restore creates containers, networks, volumes, database state, and WordPress files in sequence. A failure after any step can leave an apparently occupied project that is neither safely runnable nor safely retryable.

### Decision
Restore runs only after verified-input and fresh-project checks, bootstraps MariaDB, imports the database, extracts WordPress data, starts the application, and catches any failure after resource creation. Cleanup performs `compose down --volumes`, then independently checks labelled and conventionally named resources and fails if anything remains.

### Why it mattered
The operation therefore has a usable retry boundary: unsuccessful restoration removes the target resources rather than asking later attempts to reason about an unknown mixture of old and new state.

### What changed
The commit added `cleanup_failed_restore` and the full `restore_backup` orchestration, including project locking, secret loading, database/application startup reuse, injected failure points, and error chaining when restoration and cleanup both fail.

### Why this is important for understanding the project
This is the restore counterpart to atomic backup publication. Together they explain how persistent state moves between projects without allowing a partial target to masquerade as completed recovery.

## feat(secrets): 스택 자격증명 회전 절차 연결
Commit: `9934b478c79a`  
Importance: S  
Tags: SECRETS, RECOVERY, CORE

### Problem
Rotating credentials is not one password assignment. The same logical credential set is distributed across host files, MariaDB root and application accounts, WordPress administrator and author hashes, and `wp-config.php`.

### Decision
The management command validates a complete replacement set, verifies the current state first, stops Nginx, changes WordPress users and configuration, changes MariaDB application and root credentials, atomically publishes host files, force-recreates services, and verifies that replacement values work while previous values fail. Any exception invokes cross-store rollback under the project lock.

### Why it mattered
The ordering prevents the public frontend from serving during an internally inconsistent credential transition, and the final positive/negative checks make the resulting authentication state explicit.

### What changed
The commit connected all prior rotation primitives into `_rotate`, added the CLI and Make target, enforced distinct replacement values and account identities, and wired host-file verification and compensation.

### Why this is important for understanding the project
It is one of the project's defining state transactions. Understanding it reveals how the repository treats operational security changes with the same lifecycle rigor as bootstrap, backup, and restore.

## fix(secrets): 회전 중단과 불명확한 상태를 보상
Commit: `2e6649a7706d`  
Importance: S  
Tags: SECRETS, RECOVERY, HARD

### Problem
A command that reports failure may already have changed a password or replaced a file. Signals can also arrive after host files change or while compensation is running. The earlier rollback path did not distinguish all of these ambiguous post-write states.

### Decision
The rotation tool gained explicit failure stages before and after individual writes, synchronized pause markers, controlled `SIGINT` and `SIGTERM` handling, and a `rollback_active` state. The first signal enters compensation; further termination signals are deferred until rollback completes. Recovery probes discover which root credential currently works and restore every state store accordingly.

### Why it mattered
This addresses the hardest failure class in the project: the caller cannot infer state solely from a command's exit status. Compensation must inspect and converge the actual state, and recovery itself must be protected from interruption.

### What changed
The commit expanded failure injection across WordPress users, configuration, MariaDB application/root credentials, host-file publication, and service recreation. It also added rollback-ready synchronization and clearer distinction between complete and incomplete compensation.

### Why this is important for understanding the project
It demonstrates the difference between ordinary error handling and robust transaction-like recovery across systems that do not share a real transaction manager. The correction is indispensable to the final credential-rotation guarantee.

## test(init): 안정 단계별 초기화 중단 복구 검증
Commit: `2bf6d3f11337`  
Importance: A  
Tags: TEST, BOOTSTRAP, RECOVERY

### Problem
Static patterns and graceful failure injection cannot prove that staged initialization survives abrupt process death at the exact point where data, markers, or temporary directories are being published.

### Decision
The runtime harness starts the real production bootstrap command with a synchronized pause stage, verifies ownership labels on the one-off container, kills it with `SIGKILL`, reruns the corresponding database or application stage, and checks completion markers, absence of staging remnants, configuration linkage, credentials, and service health.

### Why it mattered
The test distinguishes durable convergence from cleanup that depends on shell traps. `SIGKILL` bypasses those traps, so successful rerun shows that persistent-state layout and publication ordering, rather than graceful exit code, provide recovery.

### What changed
All five MariaDB stages and all five WordPress stages are exercised. WordPress volumes are reset between application-stage cases, and final checks repeat the secret-boundary and running-service assertions.

### Why this is important for understanding the project
This exceptional A-level test is selected because it supplies the strongest evidence for the branch's core bootstrap claim. It shows how the architecture behaves at failure boundaries that ordinary integration tests rarely exercise.
