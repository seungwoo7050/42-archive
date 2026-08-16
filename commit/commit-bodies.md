## chore(repo): 컨테이너 스택 저장소 경계 설정
The repository now excludes the host-local `.env`, plaintext secret files, process logs, PID files, and operating-system metadata. This establishes a source-control boundary between reproducible stack definitions and deployment-specific or ephemeral state. In particular, credentials and runtime control files must be supplied or produced outside Git rather than becoming accidental build inputs or historical repository data.

## feat(env): 공개 스택 환경 변수 정의
A checked-in `.env.example` now defines the stack's public configuration contract: the external domain, database and application account identifiers, and WordPress site and user metadata. Keeping these non-secret values in an example file makes Compose substitution and local setup reproducible while leaving passwords outside the versioned configuration boundary. The distinction allows operators and tests to agree on stable variable names without treating a deployable credential set as source code.

## feat(mariadb): Debian 서버 이미지 추가
The MariaDB service now has a project-owned Debian `bookworm-slim` image containing the server, client, CA certificates, and `gosu`. The build removes package indexes and the distribution-provided database contents, then recreates the runtime and data directories with `mysql` ownership before starting `mariadbd` in the foreground and emitting logs to the container console.

Starting from an empty, correctly owned data directory makes the mounted database volume the authoritative persistent state rather than allowing image-layer data to leak into initialization. Running the daemon as `mysql` preserves the privilege boundary after any root-only setup, while foreground execution gives the container runtime direct lifecycle and log ownership.

## feat(mariadb): 네트워크 DB 서버 설정
MariaDB now installs an explicit server configuration into the image. The daemon listens on the container network interface while retaining fixed paths for its data directory, Unix socket, and PID file; client tools use the same socket and `utf8mb4` defaults. Name resolution is disabled, connection count and buffer-pool size are bounded, and the database collation is fixed to `utf8mb4_unicode_ci`.

This turns the image into a predictable network service rather than relying on distribution defaults that may assume a host-local installation. The path agreement keeps the entrypoint, health checks, and daemon aligned, while disabling reverse-DNS lookups removes an unnecessary dependency from authentication and connection startup. Explicit charset and resource settings also make persisted data semantics and container resource expectations stable across deployments.

## feat(mariadb): DB와 애플리케이션 계정 초기화
A MariaDB entrypoint now owns first-run database initialization. It accepts passwords either directly or through mutually exclusive `_FILE` variables, rejects missing inputs, constrains database and account identifiers before interpolating them into SQL, and escapes password literals. On an empty volume it initializes the system tables, starts a temporary socket-only server, waits for readiness, secures the root account, removes anonymous and remote-root access, deletes the test database, and creates the WordPress database and least-scoped application grant. The temporary server is then shut down before the normal foreground daemon is executed.

The existence of the MariaDB system directory is the idempotency boundary: a populated persistent volume is reused instead of being destructively initialized again. Bootstrapping over a local Unix socket with networking disabled prevents an incompletely secured server from becoming reachable. Separating one-time initialization from the long-running process also preserves clear lifecycle ownership and ensures the final daemon starts only after durable credentials and schema ownership are established.

## feat(wordpress): Debian PHP-FPM 이미지 추가
The WordPress service now has a Debian `bookworm-slim` runtime with PHP-FPM, the extensions required by WordPress, MySQL client tooling, FastCGI diagnostics, archive utilities, and WP-CLI. The image creates the PHP runtime and document-root directories with `www-data` ownership, uses `/var/www/html` as its working directory, exposes FastCGI port 9000, and runs PHP-FPM in the foreground.

This image separates application execution from the TLS frontend and database while retaining the tools needed for deterministic bootstrap and health verification inside the service boundary. Foreground PHP-FPM gives the container runtime direct control over termination and failure reporting, and pre-establishing directory ownership allows later initialization to write application state without making the steady-state worker depend on root privileges.

## feat(wordpress): PHP-FPM 풀 설정
The PHP-FPM pool is now configured as an explicit network service owned by `www-data`. It listens on port 9000, uses a bounded dynamic worker pool, retains the environment required by the application bootstrap, exposes a deterministic `/ping` response, and sends worker, access, and PHP error output to the container's standard error stream.

These settings replace host-oriented package defaults with container-oriented process and observability contracts. Bounding child processes prevents unbounded concurrency inside a small service container, the ping endpoint gives orchestration a service-level readiness signal, and stream-based logging keeps diagnostics attached to the container lifecycle instead of hidden in mutable files.

## feat(wordpress): 사이트와 사용자 계정 초기화
The WordPress entrypoint now converges an empty application volume and database into a usable site. It loads database, administrator, and author passwords through mutually exclusive direct or `_FILE` inputs, requires the remaining site metadata, waits for MariaDB authentication, downloads WordPress only when core files are absent, creates `wp-config.php` only when needed, fixes the canonical HTTPS home and site URLs, installs the site only when the database is uninitialized, and creates the author account only when it does not already exist. Ownership is normalized before PHP-FPM replaces the entrypoint process.

Filesystem checks and WP-CLI queries form separate idempotency boundaries for code, configuration, database installation, and user creation. This is more reliable than treating container startup as a one-shot installer: recreation can reuse persistent application and database state without overwriting it. WP-CLI also keeps WordPress-specific mutations at the application boundary while the entrypoint remains responsible for dependency readiness and process handoff.

## feat(nginx): TLS 프런트엔드 이미지 추가
The stack now has a dedicated Debian-based Nginx image that exposes only HTTPS. Its entrypoint creates the required runtime directories and generates a self-signed RSA certificate for the configured domain when either certificate artifact is missing, then executes Nginx in the foreground.

This establishes Nginx as the external trust and transport boundary rather than exposing PHP-FPM or MariaDB directly. Runtime certificate generation keeps private key material out of the image and repository, while the existence check makes repeated starts within the same container filesystem non-destructive. Disabling daemonization gives the container runtime authoritative ownership of the frontend process and its termination state.

## feat(nginx): PHP 요청을 WordPress로 전달
Nginx now implements the complete HTTPS request boundary. It accepts TLS 1.2 and 1.3 connections on IPv4 and IPv6, serves the shared WordPress document root, routes missing paths through WordPress's front controller, and forwards PHP scripts to the `wordpress:9000` FastCGI endpoint with the container-shared script path and HTTPS context. A lightweight `/healthz` endpoint, upload-size limit, browser security headers, and denial of dotfiles complete the initial frontend policy.

This assigns static-file delivery, TLS termination, and request routing to Nginx while keeping PHP execution inside the WordPress service. The explicit FastCGI parameters preserve agreement about the shared filesystem path and original scheme; without that contract, WordPress could resolve the wrong script or generate non-HTTPS URLs. Restricting hidden paths and exposing a frontend-local health endpoint reduces the external surface without coupling health checks to application rendering.

## feat(compose): 세 서비스 토폴로지 구성
Docker Compose now assembles the three custom images into a single stack. Nginx, WordPress, and MariaDB share a project bridge network, but only Nginx publishes a host port. Each service has a stable local image and container identity with restart behavior, and named volumes are declared for the database and WordPress state.

The topology makes the frontend the sole host-facing component while service-name DNS provides internal routing to PHP-FPM and MariaDB. This is the central responsibility boundary of the stack: transport termination, application execution, and persistence remain independently built and managed, yet Compose owns their shared network and durable-resource namespace.

## feat(compose): 공개 스택 설정 전달
Compose now passes each service only the public configuration it needs and marks every referenced value as required during interpolation. Nginx receives the domain, MariaDB receives database and account identifiers, and WordPress receives the domain, database identifiers, site metadata, and user identities.

Failing at Compose-render time turns missing configuration into an immediate deployment error instead of a partially initialized runtime failure. The per-service mapping also documents ownership and limits incidental configuration exposure: public values are centralized in the deployment contract, but each container sees only the subset required to perform its own responsibility.

## feat(compose): 준비 상태에 따라 영속 서비스 연결
The Compose topology now connects services through explicit health and persistence contracts. MariaDB stores `/var/lib/mysql` in a named volume, WordPress owns a writable application volume, and Nginx mounts the same application data read-only. Service-specific health checks authenticate to MariaDB, query the PHP-FPM ping endpoint, and verify the HTTPS frontend. WordPress waits for a healthy database, and Nginx waits for a healthy WordPress service rather than merely for container creation.

This changes startup ordering from process presence to usable-service readiness. It prevents dependent services from racing initialization, while the shared-volume modes preserve ownership: WordPress may mutate application state, but the frontend can only serve it. The example configuration also introduces explicit placeholder passwords so the initial bootstrap inputs are complete, although deployments must replace those values before use.

## feat(secrets): 비밀번호를 비밀 파일에서 로드
Passwords are removed from the public environment template and replaced with configurable host file paths. Compose publishes those files as named secrets, gives MariaDB only the root and application database credentials, gives WordPress only the database and two WordPress user credentials, and points the existing `_FILE` entrypoint interface at `/run/secrets`. The MariaDB health check likewise reads the root password from the mounted secret file instead of inheriting it as an environment value.

This preserves the public configuration contract while moving credential contents out of Compose interpolation and the container environment, where they would be exposed through rendered configuration and process metadata. Per-service secret attachment narrows access to the credentials each bootstrap path actually requires. The change does not make the mounted files ephemeral by itself, but it establishes the file-based secret boundary that later lifecycle hardening can enforce.

## build(make): 스택 수명주기 명령 추가
A Makefile now centralizes all Compose invocations around one selectable environment file and the project Compose definition. It exposes consistent targets for startup, shutdown, image building, logs, status, rendered-configuration inspection, ordinary cleanup, and full removal of local images and volumes.

The wrapper is more than command abbreviation: it prevents lifecycle operations from silently using different Compose files or environment sources. `config` provides a pre-runtime validation path, while the distinction between `down` and the destructive `fclean` target makes persistence removal an explicit operational action.

## test(static): 스택 소스 계약 검사
A Python validator and `make test` target now encode the stack's source-level architecture as executable checks. The validator requires the prescribed repository layout, custom service images and executable entrypoints, the three-service Compose topology, HTTPS-only publication, health-gated dependencies, named volumes, secret-file configuration, local-socket MariaDB health probing, the PHP-FPM ping request shape, and the expected Nginx, MariaDB, and PHP-FPM configuration directives. It also rejects embedded placeholder passwords and direct use of official application images.

These tests protect structural invariants without requiring Docker to start. They deliberately inspect declarations rather than runtime behavior, so they cannot prove that services actually interoperate; their value is fast detection of architectural drift, incompatible configuration syntax, missing executable permissions, or accidental weakening of the repository and secret boundaries.

## test(compose): 렌더링된 Compose 설정 검사
The test target now asks Docker Compose to render the stack with `.env.example` whenever the Docker CLI and Compose plugin are available. Environments without Docker report an explicit skip instead of failing the source-only validation.

This complements regular-expression checks with the authoritative Compose parser, catching YAML, interpolation, and schema errors that textual assertions cannot detect. Making the runtime-dependent layer conditional preserves a useful test path on lightweight development hosts while still exercising the real configuration semantics wherever the required toolchain exists.

## test(smoke): HTTPS 상태 엔드포인트 검사
A configurable smoke-check script now retries the external HTTPS health endpoint until it succeeds or a bounded attempt count is exhausted. It verifies that `curl` is available, tolerates the stack's self-signed development certificate, supports alternate URLs and retry timing, and is wired through a Make target whose presence and executable permission are covered by the static validator.

The check validates the stack from the client-facing side of the TLS boundary rather than trusting container state alone. Retrying accounts for asynchronous startup, while a finite failure result prevents an unavailable frontend from being mistaken for a slow one. Its scope is intentionally narrow: it proves HTTPS reachability and Nginx health handling, leaving database-backed application behavior to later integration tests.

## build(docker): 임시 파일을 빌드 컨텍스트에서 제외
Each service build context now excludes Git metadata, logs, and PID files. These files are unrelated to image behavior and may contain host-specific history or runtime state, so preventing their transfer to the Docker daemon reduces context size and avoids accidental cache invalidation or image-layer leakage.

Applying the same filter to all three custom images establishes a uniform build boundary rather than relying on developers to keep temporary files out of each service directory manually.

## test(docker): 서비스별 빌드 필터 검사
The static validator now requires every service build context to contain a `.dockerignore` file. This locks the newly established context-filtering policy across Nginx, MariaDB, and WordPress so a later service change cannot silently fall back to sending repository and runtime artifacts to the Docker builder.

The check verifies the presence of the boundary, not every ignore rule's semantic effect, which keeps it lightweight while preventing complete removal of the per-service safeguard.

## refactor(runtime): Compose 프로젝트 실행 경계 공통화
A reusable `ComposeProject` abstraction now defines how management code addresses and executes a stack. It validates Compose project names and command timeouts, resolves the environment and Compose files before use, constructs every command with an explicit project namespace, and provides one subprocess boundary supporting either buffered or streamed standard input, optional output capture, exit checking, and bounded execution. It also exposes typed helpers for parsed JSON configuration and the current set of running services.

Centralizing these rules prevents backup, restore, bootstrap, and diagnostic tools from drifting into incompatible command construction or accidentally targeting Docker's implicit default project. Strict path resolution fails before a destructive command can run against missing inputs, and the project-name constraint makes resource naming predictable. Treating timeout and malformed configuration as domain-specific runtime errors gives higher-level workflows one consistent failure model instead of leaking raw subprocess and JSON exceptions.

## refactor(secrets): 비밀 파일 로딩 경계 공통화
Secret handling is consolidated into the shared runtime module instead of being reimplemented by each management command. The new boundary resolves the four secret sources from rendered Compose metadata, requires their canonical paths to be distinct, and reads each value through a descriptor opened without following symbolic links. It rejects non-regular files, additional hard links, foreign ownership, permissions other than `0600`, permissive parent directories, oversized or multiline input, and passwords outside the stack's explicit length and character policy.

This turns a path supplied by configuration into a verified private input rather than assuming that any readable file is trustworthy. Descriptor-based validation narrows the window for path substitution and avoids accepting FIFOs, devices, or symlink targets as credentials. Shared helpers also define how service environment is obtained and how validated secrets are serialized to standard input, giving bootstrap, backup, restore, and rotation tools one security contract instead of several subtly different ones.

## refactor(runtime): 프로젝트 관리 작업 잠금 공통화
A shared per-project operation lock now serializes management workflows that can mutate stack resources. The lock lives in a private per-user directory, derives an opaque filename from the project name, opens both the directory and lock file without following symbolic links, verifies ownership and file type, and acquires an exclusive non-blocking `flock`. Lock release and descriptor cleanup are guaranteed by the context manager.

The project name is the correct granularity: bootstrap, backup, restore, and credential rotation for the same Compose namespace must not overlap, while independent project namespaces should remain operable in parallel. Failing immediately on contention is safer than allowing two workflows to race over volumes, containers, markers, or credentials and then report an apparently successful but internally inconsistent result.

## fix(init): 중단된 단계별 초기화를 수렴
Initialization is restructured from side effects performed by long-running service entrypoints into explicit, locked database and application bootstrap stages. `start_stack.py` resolves and validates host secret files, supplies their values only over standard input to labeled one-off containers, starts MariaDB to health before WordPress, and starts the frontend only after application bootstrap completes. The regular MariaDB and WordPress containers no longer receive password environment variables or mounted secret files, so steady-state processes retain only the configuration needed to serve requests.

MariaDB now builds a fresh data directory under a private staging path, starts a socket-only temporary server, creates and verifies the database accounts, writes a completion marker, synchronizes the staged state, and publishes it by renaming the directory into its durable location. Existing marked data is opened through the same temporary server and verified instead of being reinitialized; unmarked or malformed data is rejected. Cleanup traps stop temporary processes and remove transient client option files, so interruption before publication leaves disposable staging state rather than an ambiguous live database.

WordPress applies the same convergence rule across its filesystem and database state. Core files are validated against unexpected symbolic links, `wp-config.php` is migrated or generated in a separate private configuration volume and exposed to the web tree only through a controlled symlink, database settings are verified against the supplied credential, and URL changes are published through a temporary file and rename. Site installation, author creation, and both account passwords are verified before an atomically replaced completion marker declares the application ready. A completed installation with inconsistent credentials is refused and directed to the rotation workflow rather than silently rewritten.

Compose health checks now require those completion markers in addition to the MariaDB socket or PHP-FPM ping, making readiness mean that durable initialization committed, not merely that a process accepted connections. The hidden pause hooks expose stable interruption points for recovery tests, while stale bootstrap containers are removed only after their ownership labels prove that they belong to the selected project. Together, these changes establish a recoverable state machine: retrying a stopped stage either verifies already committed state or rebuilds unpublished work, and never treats a partially initialized volume as healthy.

## test(init): 단계별 초기화 계약 검사
The static validator now locks down the source-level elements required for recoverable staged bootstrap. It requires MariaDB's completion marker, staging directory, bounded temporary-server wait, publish checkpoint, and account reconciliation, and it requires WordPress's completion marker, authenticated database wait, installation-state query, and separate configuration directory.

These checks do not replace interruption testing, but they prevent the core convergence mechanism from being removed or reduced to a simple process-readiness check without immediate feedback. The assertions focus on the durable-state protocol introduced by the preceding correction rather than merely checking that the entrypoint scripts still exist.

## feat(runtime): 프로젝트·이미지·포트·URL 격리
Runtime identity is made explicit and configurable across the stack. Compose no longer assigns fixed container names, allowing its project namespace to own resource naming; locally built image names gain a configurable prefix and tag; the HTTPS listener binds to a selectable host address and port; and WordPress receives an explicit canonical HTTPS URL instead of deriving it implicitly from the certificate domain.

Removing fixed container names is essential for running multiple isolated instances because Compose can now scope containers, networks, and volumes consistently by project. Parameterized image names avoid cross-project build collisions, while the default loopback bind prevents an evaluation or test stack from being exposed on every host interface. Separating `DOMAIN_NAME` from `WORDPRESS_URL` also supports non-default ports without producing incorrect WordPress links or redirects, and making the URL required prevents silent disagreement between routing and persisted application configuration.

## test(bootstrap): 격리된 런타임 하네스 추가
A Docker-backed runtime harness now creates a complete stack in a private temporary environment rather than exercising the developer's default project. It generates owner-only secret and environment files, selects a unique Compose project and image prefix, reserves a loopback HTTPS port, invokes the real staged startup tool, and retries with a new port only when Docker reports a genuine bind conflict. Every command is bounded by explicit control, process, or build timeouts.

The bootstrap scenario inspects the live containers instead of trusting Compose declarations. It verifies completion markers, confirms that long-running services have no `/run/secrets` mounts or password variables, searches process arguments for credential values, requires the private WordPress configuration volume to be visible only to WordPress, and checks that `wp-config.php` retains only the database credential it actually needs. Project-scoped teardown and optional diagnostics keep failures observable without allowing the test to delete unrelated Docker resources.

This harness establishes an executable boundary between source validation and end-to-end behavior. It proves that isolation, staged startup, secret lifetime, and cleanup rules survive Docker's rendered configuration and container runtime semantics, which textual tests alone cannot establish.

## test(e2e): HTTPS와 MariaDB를 잇는 WordPress 데이터 검증
The runtime harness now verifies the complete request and persistence path. It deliberately occupies the initially selected HTTPS port to exercise conflict recovery, confirms that startup chooses a new isolated port, forces a legacy in-volume `wp-config.php` layout and verifies its migration into the private configuration volume, and rechecks the runtime secret boundary after convergence.

The test then creates a uniquely identifiable published post through WP-CLI, fetches it through Nginx over HTTPS using explicit DNS resolution to loopback, and queries MariaDB through WordPress to confirm that the same content reached durable database state. This connects the external TLS endpoint, FastCGI handoff, WordPress execution, and database persistence in one assertion rather than treating healthy processes as evidence of a functioning application. The migration case additionally protects compatibility with state created before the configuration-volume split.

## chore(test): Python 캐시 산출물 제외
Python bytecode files and `__pycache__` directories are added to the repository ignore policy. The growing validation and management toolchain creates these interpreter artifacts during normal execution, but they are host- and version-specific outputs with no role in the stack's source contract.

Excluding them keeps test execution from producing unrelated working-tree changes and prevents generated cache files from being mistaken for reviewed tooling.

## test(persistence): 재시작·재생성 뒤 상태 보존 검증
A dedicated persistence scenario now writes representative state into both durable layers: a published post and custom WordPress option in MariaDB, plus an uploaded file in the WordPress data volume. It records the three project-owned volume names, verifies the values through HTTPS and WP-CLI, restarts all services, and then tears down and recreates the containers without deleting volumes.

The same values must remain readable after each lifecycle transition, and the project must still reference exactly the original volume set. This distinguishes process recovery from storage durability: a healthy replacement container is not sufficient if it silently acquired an empty or differently named volume. Covering database rows, application options, and filesystem content demonstrates that the Compose volume model preserves all state classes on which the finished stack depends.

## feat(backup): 백업 무결성과 비공개 파일 I/O 정의
A backup module begins with explicit durability and confidentiality primitives rather than ordinary high-level file writes. SHA-256 helpers operate on seekable streams and restore the caller's position, output files are created exclusively with mode `0600`, file contents are flushed and synchronized before return, and directory synchronization is available for persisting later rename operations. A dedicated error type separates backup-domain failures from raw operating-system exceptions.

These primitives establish the assumptions required by the later backup protocol: no existing path may be overwritten accidentally, backup material is private from creation rather than repaired afterward, checksums can be computed without invalidating subsequent readers, and successful publication can include both file and directory metadata durability. Centralizing those operations also prevents individual backup stages from silently omitting an `fsync` or choosing weaker permissions.

## feat(backup): 관리 작업 신호와 테스트 중단 경계 추가
The backup module now converts `SIGINT` and `SIGTERM` into controlled operation failures and restores the caller's previous handlers afterward. It also defines explicit failure-injection and pause stages. The pause helper blocks termination signals while atomically creating and synchronizing its ready file, then restores the mask before waiting so a test can deliver an interruption only after the operation has reached the intended state; cleanup removes the ready file even when setup or interruption fails.

This creates deterministic boundaries for testing asynchronous failure without adding timing-dependent sleeps to the test suite. More importantly, treating signals as exceptions lets the same `finally` paths handle operator cancellation, injected faults, and ordinary errors, so service recovery, temporary-file removal, lock release, and rollback can share one correctness path rather than depending on abrupt process termination semantics.

## feat(backup): 백업용 Compose 실행 어댑터 추가
The backup tool receives its own explicit Compose execution adapter with validated project names, resolved environment and Compose files, JSON configuration access, running-service queries, and separate timeout classes for metadata queries, control operations, and long data transfers. Its subprocess interface supports byte input, streaming input, streaming output, or captured output while rejecting incompatible combinations.

Backup and restore move data sets that should not be buffered wholly in memory, so the ability to connect a private file directly to a Compose subprocess is a functional requirement rather than a convenience. At the same time, every invocation remains pinned to a named project and configuration source. This prevents a transfer command from falling back to Docker's implicit namespace and provides bounded failure semantics appropriate to the expected duration of each operation.

## feat(backup): WordPress 아카이브 입력 검증
A gzip tar validator now treats archive structure as untrusted input. It rejects empty archives, absolute paths, parent-directory traversal, duplicate normalized names, and every member type other than a regular file or directory, then rewinds the stream for its next consumer.

The restore path will eventually extract this archive into persistent WordPress volumes. Validating before extraction prevents path escape and excludes symbolic links, hard links, devices, and other tar features whose semantics could redirect writes or create special filesystem objects. Duplicate-name rejection also avoids archive-order ambiguity, ensuring that one logical path has one authoritative payload.

## feat(backup): 프로젝트별 백업 작업 잠금 적용
Backup operations now acquire the same per-project, per-user advisory lock model used by startup management. The lock directory and file are checked for private permissions, ownership, regular-file type, and safe no-follow opening, and contention fails immediately through non-blocking `flock`.

A backup must observe a coherent relationship between running containers, MariaDB state, WordPress volumes, and later restore metadata. Serializing it with other management work prevents concurrent bootstrap, backup, restore, or rotation from changing that relationship mid-capture. Keying the lock by project preserves concurrency between independent stacks while protecting all workflows that address the same Docker namespace.

## feat(backup): DB 덤프와 WordPress 볼륨 수집
The backup tool can now capture the two distinct persistence domains. MariaDB is dumped through the running database container with `--single-transaction` and coverage for routines, events, triggers, binary data, and database recreation statements. The root password enters over standard input, is placed in a private temporary client option file inside the container, and is removed by a signal-aware trap; the SQL stream is written directly to a private synchronized host file and checked for recognizable dump syntax.

WordPress data and its private configuration volume are streamed from a one-off service container as a gzip archive. The web-volume `wp-config.php` symlink is excluded because the authoritative regular file already resides in the configuration volume, avoiding a dangling or redundant archive member. Keeping database export and filesystem archival separate respects their consistency mechanisms: MariaDB receives a transactional logical dump, while WordPress files are collected through the volume mount topology.

## feat(backup): 백업 출력 경로를 안전하게 예약
Backup destinations are normalized without resolving the final component, while the existing parent directory is resolved and required to be a real directory. The tool rejects ambiguous terminal names and records a destination directory's device and inode so later stages can determine whether the originally reserved object still occupies the path.

This separates trusted parent resolution from creation of a new output name. A plain string comparison would not detect replacement of the reservation by another directory, symlink, or mount between validation and publication; inode comparison gives the later atomic-publish step an object-identity check before it replaces anything.

## feat(backup): 백업 세트를 원자적으로 게시
The complete backup transaction is now implemented. It requires all three services to be running, reserves an empty private output directory, creates database and WordPress artifacts in a sibling temporary directory, stops Nginx and WordPress while leaving MariaDB available for a transactional dump, and writes a versioned manifest containing UTC creation metadata and SHA-256 digests. The archive is structurally validated and the temporary directory synchronized before publication.

Publication occurs only if the reserved destination is still the same empty inode; the validated temporary directory then replaces it in one rename and the parent directory is synchronized. Until that point, callers can observe either no backup or an empty reservation, never a partially populated set that appears complete. On every failure path, the tool removes unpublished temporary state and its own reservation, and it attempts to return the application services to healthy operation. A failure to recover service availability is surfaced separately rather than hidden behind the original backup error.

Wrapping the workflow in signal handling and the project operation lock makes cancellation and concurrency obey the same transaction boundary. The resulting invariant is that a published backup contains exactly a database dump, WordPress archive, and matching manifest, while an unsuccessful attempt leaves no misleading output set and does not intentionally leave the stack stopped.

## feat(backup): 백업 CLI와 Make 타깃 연결
The backup transaction is exposed as a command-line operation with required project, environment, and output arguments, optional Compose-file selection, and hidden failure or pause controls reserved for deterministic tests. The entry point verifies Docker availability, validates paired pause arguments, constructs the explicit project boundary, maps domain and subprocess failures to a non-zero result, and emits a focused diagnostic. A Make target requires `BACKUP_DIR` before invoking the tool.

This turns the internal transaction into a reproducible operational interface without weakening its safety defaults. Requiring an output path prevents accidental use of an implicit working-directory location, while retaining project and environment parameters makes the target suitable for isolated test or evaluation stacks as well as the default deployment.

## test(backup): 게시 실패와 중단 정리 검증
The Docker runtime suite gains a backup/restore scenario and the process-control machinery needed to test real cancellation. It can launch the backup tool as a child, wait for a synchronized stage-ready file, deliver `SIGINT` or `SIGTERM`, bound graceful termination before escalating to a kill, enumerate all project containers, volumes, and networks, and verify that every service has returned to a healthy state. It also exercises the project lock from processes with different `TMPDIR` values, proving that lock identity is shared rather than accidentally scoped to a caller-specific temporary directory.

The scenario covers failed database-dump publication and interruption after application services stop, checking that no final backup or temporary sibling remains and that the source project recovers. These assertions target the negative guarantee on which an atomic backup interface depends: unsuccessful or cancelled work must not publish a plausible backup set, leak synchronization artifacts, leave management locks held, or strand the live stack in a degraded lifecycle state.

## feat(restore): Compose 리소스 이름과 기존 객체 조회
Restore preparation now derives the concrete volume and network names from rendered Compose JSON, calculates possible service and bootstrap container names for both current and legacy Compose naming forms, and can query Docker resources either by project label or by exact expected name.

Labels alone are insufficient for a destructive freshness check because manually created or partially failed objects may have the names Compose will claim without carrying the expected labels. Conversely, hard-coding names would ignore explicit resource names or Compose rendering rules. Combining rendered names, conventional container names, and labels provides the evidence needed to identify collisions before restore creates or removes anything.

## feat(restore): 대상 프로젝트 자원 충돌 사전 차단
A restore target must now be completely fresh. Before mutation, the tool checks for project-labelled containers, volumes, and networks, exact container names including bootstrap helpers, and rendered volume or network names already present in Docker. Any match aborts with a resource-count summary.

Restoring into existing state would make overwrite and rollback semantics ambiguous: an error could destroy data that predates the operation, while successful extraction could merge two unrelated installations. Requiring an empty namespace gives restore a simple ownership invariant—all resources created after the check belong to this attempt and may be removed safely if it fails.

## feat(restore): 백업 입력의 형식과 체크섬 검증
Restore input is opened as a descriptor-anchored, verified object rather than repeatedly resolving user paths. The source must be a private, user-owned, non-symlink directory containing exactly the three expected files. Each entry is opened relative to the directory descriptor without following links, required to be a private single-link regular file owned by the current user, and held under a non-blocking shared lock so another process cannot legitimately update it during verification and consumption.

The manifest has a bounded size, valid UTF-8 JSON, and supported format version. Its checksum table must match streamed SHA-256 values for both data artifacts, and the WordPress archive receives the earlier structural validation. The returned `VerifiedBackup` retains the already opened database and archive streams plus the directory descriptor until restore completes, narrowing path-substitution races between validation and use. A malformed, over-permissive, incomplete, extra-file, concurrently modified, or corrupted backup is rejected before any target resource is created.

## feat(restore): DB와 WordPress 데이터를 새 볼륨에 주입
Restore gains streaming primitives for both state domains. The database path prepends the root credential to the SQL stream in a private temporary file, sends that stream to the running MariaDB container, creates an ephemeral client option file from the first line, and feeds the remaining dump to the local socket client. This keeps the password out of command arguments and avoids loading an arbitrarily large dump into process memory.

The WordPress path runs a one-off service container against the newly created volumes, requires both data and configuration mount points to be empty, and extracts the previously validated gzip stream under `/var/www`. The empty-volume precondition prevents an archive from merging with bootstrap leftovers or unrelated files. Reusing the established database and application startup functions aligns restored resources with the same completion-marker, health, and secret-lifetime contracts as a newly initialized stack.

## feat(restore): 실패한 복원 자원을 정리하고 롤백
The restore transaction is now assembled under signal handling and the project operation lock. It verifies the backup and target freshness before mutation, loads current target credentials, bootstraps a fresh MariaDB volume, imports the database dump, injects the WordPress volumes, and then runs normal application bootstrap to reconcile configuration, accounts, markers, and service health. Failure and pause hooks expose the point after database import for deterministic recovery testing.

Once resource creation begins, any exception triggers a project-scoped `compose down --volumes` rollback. Cleanup then independently enumerates labelled and expected-name containers, volumes, and networks; success is accepted only when both Compose returns successfully and no target resource remains. This secondary verification matters because a failed `down` command or partially labelled object cannot be treated as rollback merely because cleanup was attempted.

The fresh-project precondition makes deletion safe: every discovered target object belongs to the failed restore rather than to pre-existing user state. If both restoration and cleanup fail, the tool preserves the original exception as context while reporting the cleanup failure explicitly, avoiding a false claim that the target returned to an empty state. The final contract is all-or-nothing at the project level: a successful restore yields a healthy complete stack, and a failed one must leave no owned Docker state behind.

## feat(restore): 복원 CLI와 Make 타깃 연결
The backup tool's public interface now supports both `backup` and `restore` operations. Input and output paths are mutually exclusive, hidden failure and pause stages are validated against the selected operation, and errors are reported with the actual operation name. A Make target requires `BACKUP_DIR` and passes it as restore input together with the explicit project and environment boundary.

Operation-specific argument validation prevents a test-only database-dump stage from being accepted by restore, or a restore pause point from silently doing nothing during backup. Exposing restore only after verification, freshness checks, streaming injection, and rollback are in place keeps the CLI boundary aligned with the transaction semantics rather than publishing an incomplete recovery command.

## test(restore): 거부·롤백·복원 상태 검증
The backup/restore runtime scenario now exercises the restore contract against a second isolated project using the same credentials as the source. It first replaces the SQL artifact with a symbolic link and verifies rejection before any target resource appears. It then injects a failure after database import and sends `SIGINT` at the same synchronized stage, requiring both paths to remove every target container, volume, and network.

A normal restore must recover the previously backed-up database values and uploaded file through the fresh target stack. A second restore into that now-active project must be refused, proving that successful state is protected by the same freshness check as arbitrary pre-existing state. Static assertions additionally preserve the tool's path-safety, checksum, lock, signal, timeout, credential-argument, publication, and rollback mechanisms.

This test connects the positive and negative sides of the transaction: valid input produces an equivalent healthy installation, while unsafe input, injected failure, operator interruption, or a non-empty target produces no destructive merge and no leaked partial project.

## feat(secrets): 교체 비밀 파일을 안전하게 읽고 게시
Credential rotation now has a hardened host-file boundary for both incoming replacement values and the stack's active secret files. Each secret is opened without following symbolic links, required to be a single-link regular file with mode `0600`, optionally required to belong to the invoking user, read through a bounded stream, and accepted only as one password-shaped line. These checks prevent rotation from treating a device, pipe, linked file, overlarge input, or broadly readable path as trusted credential material.

Secret publication uses a same-directory temporary file, applies private permissions before writing, flushes and `fsync`s the contents, replaces the destination atomically, and synchronizes the parent directory. The resulting guarantee is per-file rather than a four-file transaction, but readers cannot observe a partially written credential at any individual path, and a completed replacement is made durable across a crash boundary. This low-level contract is necessary before coordinating the corresponding database and WordPress mutations.

## feat(secrets): Compose 자격증명 경로와 계정 설정 해석
The rotation tool now derives its operating context from the fully rendered Compose model. It parses `docker compose config --format json`, delegates secret-source resolution to the same `secret_source_paths` logic used by normal stack startup, and reads account identifiers from each service's rendered environment.

Using rendered configuration as the authority avoids maintaining a second interpretation of `.env`, relative secret paths, interpolation, and service settings inside the rotation command. Rotation therefore targets the exact files and account names that the selected Compose project would use, preserving the existing boundary between configuration resolution and credential mutation.

## feat(secrets): MariaDB 계정 비밀번호 원자 교체
MariaDB credential changes now run through an authenticated local-socket session inside the database container. The root password and SQL program are supplied over standard input, a private temporary option file carries client authentication, and the file is removed by a shell trap. This keeps credentials out of command arguments and the container's long-lived environment while still allowing the management tool to execute explicit account changes.

Application and root account updates are constructed with SQL-literal escaping and `NO_BACKSLASH_ESCAPES`, with the application credential changed before the root credential that authorizes the operation. The helper can also force a SQL error after the writes, making an ambiguous "command failed after state changed" outcome reproducible. That distinction is essential for later compensation logic, which must determine actual account state rather than equating a nonzero exit status with no mutation.

## feat(secrets): WordPress 설정과 사용자 비밀번호 교체
Rotation now updates the two WordPress-owned credential domains through WordPress and PHP rather than editing their storage representations externally. Administrator and author passwords are changed with `wp_set_password`, preserving WordPress's password-hashing and account semantics, while the database password is updated in the private `wp-config.php` volume through a narrowly scoped PHP program.

The configuration update verifies that its target is a regular file, replaces exactly one `DB_PASSWORD` definition, writes a private temporary file on the same filesystem, preserves ownership and mode, synchronizes the new contents, and publishes them with `rename`. JSON payloads are supplied over standard input, so replacement values do not become process arguments. Both user and configuration operations can also run in one-off WordPress containers, which gives later rollback code a way to repair persistent state even when the steady-state application container cannot remain running with the current credentials.

Injected post-write failures deliberately distinguish command completion from state completion. The surrounding rotation procedure must consequently inspect the resulting credential state and compensate it instead of assuming that a failed subprocess left WordPress unchanged.

## feat(secrets): 교체 전후 자격증명 동작 검사
Credential state can now be verified through the interfaces that consume it. The tool authenticates the database application user with a private client option file, checks WordPress user passwords through `wp_check_password` after clearing the relevant cache, and confirms the private configuration's database password with a constant-time comparison.

These probes turn rotation correctness into observable behavior rather than a comparison of host files or command exit codes. A credential is considered installed only when MariaDB, WordPress authentication, and `wp-config.php` independently agree on it, which provides the evidence needed to recognize successful mutation, partial mutation, and later rollback.

## feat(secrets): 런타임 비밀 노출 경계 검사
The rotation tool now revalidates the stack's secret-isolation contract against the live containers. It inspects mounts to ensure no service retains `/run/secrets`, requires the private WordPress configuration volume to be visible only to WordPress, and verifies that Nginx sees the public `wp-config.php` link without being able to resolve its private target.

Container configuration, every readable process environment under `/proc`, and process arguments reported by Docker are searched for both forbidden password-variable names and the actual credential values under consideration. This check matters after rotation because successful authentication does not prove that a recreate operation preserved the intended exposure boundary. Rotation is complete only when the new state works without leaving either old or new credentials in runtime metadata or unrelated services.

## feat(secrets): 신규 자격증명 수용과 기존 값 거부 검증
Rotation verification now asserts both halves of a credential transition. The expected root and application database passwords must authenticate, the private WordPress configuration must contain the expected database password, and both WordPress account passwords must validate. When a prior credential set is supplied, every corresponding old database and WordPress credential must also fail.

Requiring rejection is stronger than checking only the new values: a duplicate account entry, stale password hash, incomplete `ALTER USER`, or partially recreated service could otherwise leave both generations usable. The same change adds a root-password probe that tests candidate values without duplication, allowing recovery code to discover whether an interrupted root update left the old or replacement credential authoritative before attempting compensation.

## feat(secrets): 회전 실패 시 기존 자격증명 복구
A failed rotation now invokes a compensating procedure that reconstructs the previously verified credential set across all participating stores. It first makes MariaDB available without recreating it, discovers which root password currently works, restores the database application credential, repairs `wp-config.php` and both WordPress accounts through one-off application containers, restores the root credential, and atomically republishes the original host secret files.

Compensation is best-effort at each intermediate step, so individual errors are accumulated rather than aborting the remaining repairs. The procedure does not report recovery merely because those commands were attempted: it force-recreates the stack, verifies that every original credential works, verifies that every replacement credential is rejected, rechecks the runtime exposure boundary, and rereads all host files. Only that end-state verification marks rollback as complete.

This is a compensating transaction rather than database-level atomicity. Its correctness depends on identifying the currently valid root credential, restoring dependencies in an order that keeps later repair operations possible, and treating the verified final system state as authoritative when subprocess outcomes are ambiguous.

## feat(secrets): 스택 자격증명 회전 절차 연결
The individual mutation and verification primitives are now assembled into a project-scoped rotation workflow and exposed through a CLI and Make target. The command resolves four distinct active secret paths, requires a private replacement directory owned by the caller, validates every replacement, rejects unchanged values, and confirms that the database and WordPress account identities form a safe configuration before touching runtime state.

After verifying the old state, the workflow stops Nginx to close the public request path while dependent credentials can temporarily disagree. It updates the WordPress account passwords and private database configuration, changes the MariaDB application password, changes the root password last, publishes the four host files, and force-recreates the services so the stack converges on the new generation. Completion requires the new credentials to work, the old credentials to fail, the host files to match, and the runtime secret boundary to remain intact.

All of this executes under the same per-project operation lock used by other destructive management actions. Any exception enters compensating rollback and reports whether the previous generation was fully re-established or remained uncertain. The ordering therefore minimizes the inconsistency window while making success and failure explicit end states rather than a sequence of unverified writes.

## fix(secrets): 회전 중단과 불명확한 상태를 보상
The rotation failure model now covers interruptions and commands that fail after performing their write. Failure injection points surround WordPress user updates, configuration publication, database application and root changes, each host-file publication boundary, and service recreation; a synchronized pause after host-file publication allows signals to arrive in a genuinely mixed state. These stages expose cases where a subprocess result alone cannot reveal which credential generation is active.

`SIGINT` and `SIGTERM` are converted into normal rotation failures while forward mutation is active, so they enter the same compensation path as implementation errors. Once rollback begins, additional termination signals are deferred instead of interrupting the recovery sequence. This preserves the stronger invariant that an operator cancellation must not strand the stack between credential generations merely because the compensating work was itself cancellable.

Rollback completion is now judged by final behavioral verification. Intermediate compensation errors are retained for diagnostics, but they do not make the outcome indeterminate when the old credentials, host files, services, and rejection checks all prove that recovery succeeded. Conversely, the tool reports incomplete rollback when that end state cannot be established. Test-only ready markers and strictly coupled hidden arguments make these timing-sensitive boundaries reproducible without changing the production interface.

## test(secrets): 회전 롤백과 재시도 검증
A dedicated runtime scenario now validates credential rotation against an isolated, live stack. It performs a successful rotation first, then injects failures after WordPress user publication, configuration publication, database application-password publication, root-password publication, the first host-file replacement, and removal of the WordPress container before recreation. Every failure must report verified rollback and leave the previously active generation authoritative.

The scenario also pauses after all host files have changed, sends `SIGTERM` to initiate compensation, waits until rollback is active, and sends `SIGINT` again. The second signal must be deferred rather than abort recovery. After this interrupted attempt, the same untouched replacement directory is reused for a normal retry, proving that compensation neither consumes nor corrupts operator input and that the project lock and residual state do not make the operation permanently unrecoverable.

State verification is intentionally end to end: host files must contain the expected values with private ownership and permissions; expected database and WordPress credentials must work while rejected values fail; `wp-config.php` must agree with MariaDB; HTTPS and a WordPress write/read round trip must remain functional; no temporary credential files may survive on the host or in containers; no tested secret may appear in process metadata, runtime environments, logs, or tool output. This suite locks down the difference between "rollback was attempted" and "the complete previous system state was actually restored."

## build(images): Debian 이미지와 패키지 입력 고정
All three service images now start from the same dated Debian base image identified by an immutable digest. Their APT sources are replaced with a timestamped Debian snapshot for the main, updates, and security repositories, and validity-date checking is explicitly disabled because archived snapshot metadata naturally expires.

This change makes a rebuild consume the same base filesystem and package repository state instead of whatever `bookworm-slim` and the live mirrors happen to provide later. The trade-off is deliberate maintenance: security and compatibility updates no longer arrive implicitly and must be reviewed by advancing the pins. Removing an unused WordPress `unzip` dependency also narrows the fixed package surface rather than carrying software that the image no longer needs.

## build(wordpress): WordPress 산출물을 고정해 게시
The WordPress image now downloads explicit WP-CLI and WordPress releases during the image build and verifies both artifacts with committed SHA-256 digests. WordPress core is unpacked into an image-owned source directory, and a sorted checksum manifest records every core file outside `wp-content`. Automatic WordPress updates are disabled so the running installation cannot silently diverge from this reviewed image input.

Bootstrap no longer performs `wp core download`. Instead, it validates every manifest path, refuses symbolic-link or non-regular targets, copies changed core files through same-directory temporary files, synchronizes each publication, and verifies the complete installed core against the image manifest. This lets a persistent volume converge back to the image's known core version after interruption or drift without depending on network availability at startup.

`wp-content` follows a different ownership rule: the image creates missing default directories and files but does not overwrite existing content. Core files are image-controlled and reproducible, while uploads, plugins, themes, and other application data remain volume-controlled. Separating those policies preserves user state without allowing persisted core binaries to bypass the image's integrity contract.

## test(supply-chain): 불변 image 입력 검증
Static validation now requires every service Dockerfile to retain the reviewed Debian digest and package-snapshot timestamp. The WordPress image must also retain the exact WP-CLI and WordPress versions, their checksums, checksum verification, and the image-generated core manifest; the entrypoint is rejected if it returns to runtime download instead of copying the verified artifact.

The end-to-end runtime scenario independently asks WordPress and WP-CLI for their active versions. Combining source-contract checks with live version checks protects against both obvious pin removal and subtler integration errors where a pinned artifact exists in the Dockerfile but is not the software ultimately executed by the container.

## feat(network): DB 트래픽을 내부 backend로 격리
The single shared bridge is split into a frontend network for Nginx-to-WordPress traffic and an internal backend network for WordPress-to-MariaDB traffic. Nginx joins only the frontend, MariaDB joins only the backend, and WordPress is the sole dual-homed service because it is the application boundary that legitimately communicates with both tiers.

Marking the backend network as internal removes direct external connectivity from the database segment and prevents the TLS proxy from addressing MariaDB at all. This topology expresses least privilege in Compose itself: a compromise or configuration error in one tier does not automatically grant network reachability to every other service, while the required request and database paths remain intact.

## feat(runtime): 서비스 자원과 종료 한계 적용
Each long-running service now has explicit CPU, memory, process-count, and file-descriptor limits with defaults appropriate to its role. `no-new-privileges` prevents processes from gaining additional privilege through executable metadata, and bounded `json-file` rotation prevents unbounded container logs from consuming host storage.

Shutdown behavior is also made service-specific. Nginx and PHP-FPM receive `SIGQUIT` for graceful worker termination, MariaDB receives `SIGTERM`, and each service has a grace period sized for its expected cleanup work. These settings convert implicit Docker defaults into an operational contract: overload is contained per container, log growth is bounded, and normal stop or recreate operations have a defined opportunity to drain work and persist state before forced termination.

## feat(nginx): 접근·오류 로그를 컨테이너 스트림에 게시
Nginx access and warning-or-higher error logs now go to standard output and standard error instead of remaining in container-local files. Docker's logging driver can therefore apply the stack's rotation limits, and operational tooling can collect the proxy's request and failure history through `docker compose logs` without mounting or discovering internal log paths.

## refactor(nginx): 스택 전용 TLS 산출물 이름 사용
The generated certificate and private-key paths are renamed from the legacy `inception` basename to `container-stack`, with both the Nginx configuration and entrypoint updated together. TLS behavior is unchanged, but the producer and consumer now use names that identify the current stack rather than an earlier project label, reducing ambiguity in diagnostics and future certificate management.

## fix(make): 볼륨 삭제 전에 확인을 요구
The destructive `fclean` target now requires `DESTROY_CONFIRM` to match the selected `PROJECT_NAME` exactly before it removes volumes, local images, and orphaned resources. A generic confirmation flag would not identify which Compose namespace is about to lose persistent data; echoing the active project name forces the operator or automation to acknowledge that specific target.

This guard does not weaken normal `down` or `clean` behavior. It is placed only around the command that includes `down -v`, preserving convenient lifecycle operations while adding friction at the point where MariaDB and WordPress persistence becomes irrecoverable without a backup.

## build(compose): 엄격한 설정 검사 추가
A `config-strict` target now performs an explicit Compose preflight. It fails with a distinct setup error when the Docker CLI or Compose v2 is unavailable, then runs the selected project, environment file, and Compose file through `docker compose config --quiet` so interpolation, required variables, and schema validity are checked without producing the rendered configuration.

Unlike an opportunistic local test path that may skip Docker-dependent checks, this target defines a contract for callers that require configuration validation to have actually occurred. It provides a deterministic gate for deployment and CI workflows before any image build or container mutation begins.

## feat(diagnostics): Compose 비밀값과 민감 항목 마스킹
A new diagnostics tool establishes redaction before it begins collecting operational data. It renders the selected Compose project, resolves secret files through the same shared path logic used by startup, and builds a masking set containing each raw configured path, its resolved host path, and the current secret value. If those values cannot be read safely, diagnostics cannot later prove that its output is sanitized.

Redaction replaces longer known values first to avoid a shorter credential or path exposing part of a longer one, then applies a generic assignment rule to fields whose names contain `password`, `secret`, or `token`. Combining exact-value masking with structural masking covers both the stack's known credentials and sensitive material introduced by Docker, Compose, service logs, or future configuration fields.

## feat(diagnostics): 컨테이너 런타임 상태 수집
Diagnostics can now capture command outcomes and a deliberately selected view of container state. Command records preserve the exit code, standard output, standard error, and timeout failures so a broken diagnostic command remains useful evidence rather than silently disappearing from the bundle.

Container inspection is reduced to operational fields: image, lifecycle and health status, exit and restart information, OOM state, resource limits, logging policy, security options, shutdown settings, and attached networks. Selecting these fields instead of publishing raw `docker inspect` output limits the disclosure surface while retaining the data needed to explain crashes, resource enforcement, restart loops, shutdown behavior, and topology errors.

## feat(diagnostics): 비공개 진단 세트와 CLI 연결
The diagnostics command now publishes a complete incident bundle for an explicit Compose project. It records Docker and Compose versions, all service states, a bounded tail of timestamped logs, the non-interpolated Compose model, and the selected container runtime state. A Make target provides a stable project-specific output location, while the default diagnostics directory is excluded from version control.

Publication is fail-closed. The destination must be newly created with mode `0700`; each file is created exclusively with mode `0600`; every output is redacted and then checked again for any known secret; and any collection failure removes the incomplete directory. Refusing an existing destination prevents a diagnostic run from overwriting earlier incident evidence or following a pre-positioned output path.

The resulting boundary is explicit: diagnostics may contain sensitive operational context, but they are private by default, bounded in volume, sanitized against the actual selected stack, and either published as a complete set or not retained at all.

## test(operations): 자원·격리·삭제 보호·진단 검증
A new live operations scenario verifies that Docker applies the policies declared in Compose rather than merely accepting the file. It compares each service's effective memory, CPU, PID, descriptor, stop-signal, stop-timeout, log-rotation, and `no-new-privileges` settings, then inspects both networks to require the exact membership and internal-backend flag established by the topology.

The scenario invokes `fclean` without the project-name confirmation and requires refusal while the running HTTPS stack remains healthy. It also puts a real credential into the Nginx access log, proving that diagnostics redact values originating from runtime output rather than only from configuration. When one source secret is unreadable, collection must fail and publish nothing, because continuing would make sanitization unverifiable.

A successful bundle must contain exactly the expected regular files under `0700`/`0600` permissions, include visible redaction evidence, and contain neither credential values nor their host paths. Re-running against the same destination and targeting a dangling symbolic link must both be rejected without modifying the original bundle or creating the link target. The runtime harness also delegates automatic failure collection to this same tool, so test diagnostics and operator diagnostics share one privacy and publication contract.

## fix(smoke): HTTPS 연결과 응답 대기시간 제한
Each HTTPS smoke attempt now has a five-second connection limit and a fifteen-second total transfer limit. Without per-attempt bounds, a reachable-but-stalled endpoint could consume the entire outer retry budget inside one `curl` invocation and make readiness checks or automation hang unpredictably.

The retry loop still tolerates transient startup failures, but every observation now completes within a known interval. This separates "the service is not ready yet" from "the probe itself has stopped making progress" and gives the surrounding command a finite worst-case duration.

## test(smoke): HTTPS timeout 계약 검사
Static validation now requires the smoke probe to retain both connection and total-request timeouts. This protects the bounded-wait property from a later simplification that preserves the retry loop but reintroduces an unbounded individual network call.

## test(runtime): 프로세스·비밀값·정리 제어 흐름 강화
The runtime harness now publishes private fixture replacements through exclusively created temporary files, synchronizes their contents, atomically replaces the destination, and always removes remnants. Test-generated credential state therefore follows the same no-partial-file assumption that production rotation and diagnostics are expected to satisfy.

Start command construction is separated from command execution so interruption scenarios can launch the exact production startup invocation under `Popen` and add synchronized pause controls without duplicating project arguments. Compose timeout errors also identify the operation that stalled, making failures in build, up, down, or exec distinguishable in diagnostics.

Most importantly, harness cleanup now returns and propagates its own failures. Diagnostic-collection errors and nonzero `compose down --volumes` results are accumulated, and a scenario that otherwise passed is converted to failure when its resources could not be removed. Cleanup is part of test correctness: silently leaving volumes, networks, or containers would contaminate later scenarios and falsely report that lifecycle guarantees held.

## test(init): 안정 단계별 초기화 중단 복구 검증
The bootstrap scenario is replaced with systematic crash-recovery testing. MariaDB bootstrap is paused and killed with `SIGKILL` after system-table creation, temporary-server startup, database/account convergence, completion-marker creation, and final data publication. WordPress is independently killed after core-file installation, configuration publication, core installation, account convergence, and marker creation.

Before terminating a bootstrap container, the harness verifies both its Compose project label and its stack-specific bootstrap label. This prevents a timing or naming error in the test from killing an unrelated container. Each failed start must surface as a failure, after which the ordinary start command is rerun against the interrupted volume state.

Recovery succeeds only when MariaDB publishes a completed data directory without leaving its staging area, and WordPress restores its marker, private configuration, public link, user authentication, and absence of bootstrap temporary files. The final stack must have all services running and preserve the runtime secret boundary. The test therefore proves that each documented durable stage is convergent after abrupt process death, not merely after a cooperative shell error.

## test(backup): 자원 충돌과 시그널 경계 검증
Backup and restore verification now exercises two boundaries that can otherwise fail only under timing or namespace pressure. A repeated pause/signal race alternates `SIGINT` and `SIGTERM` immediately after the ready marker is observed, requiring the management helper to report the signal and remove the marker every time. This protects the synchronization primitive used by interruption tests from leaving stale evidence or swallowing a signal at the handoff point.

Fresh-target enforcement is tested against both Compose-labelled stopped containers and unlabelled resources that occupy the exact rendered container, volume, or network names. Restore must refuse each collision without deleting or altering the pre-existing object. The test thus covers both ownership discovery and raw Docker namespace conflicts, which are distinct ways a supposedly fresh project can be unsafe.

The data set now includes a 32 MiB random WordPress upload and a 4 MiB MariaDB value. Their restored checksum and length verify that streaming, archive validation, dump transport, and import do not accidentally pass only because earlier fixtures fit in small buffers. Cleanup failures from the secondary restore project are also surfaced, so a successful data comparison cannot hide leaked recovery resources.

## test(secrets): 회전 후 런타임 비밀 경계 고정
Static validation now forbids rotation tests from reintroducing assumptions about obsolete `/run/secrets` mounts or helper functions that compare mounted secret files. It instead requires verification of private WordPress configuration temporary-file cleanup and the full post-rotation runtime boundary check.

This guards the architectural distinction between bootstrap and steady state. Secret mounts are intentionally short-lived bootstrap inputs; validating rotation by mounting them back into long-running services would make the test pass by weakening the property it is supposed to protect.

## test(cleanup): 테스트 프로젝트 소유 자원만 정리
Each runtime scenario can now record its randomly generated Compose project before environment preparation begins. Records are written as exact project-name files inside a non-symlinked private directory, with restrictive directory and file permissions. Image-prefix ownership is tracked separately so a stack removes only the tags it created, while secondary stacks can share or independently own images without ambiguous cleanup responsibility.

Normal harness shutdown now removes the selected project's Compose resources, its owned service-image tags, and its private temporary directory, reporting each cleanup failure instead of falling back to broad Docker operations. The `--keep` path deliberately skips those deletions for investigation. This keeps cleanup behavior aligned with explicit ownership rather than assuming every similarly named object belongs to the current test.

A separate recovery utility handles leaks left by crashed or externally terminated verification processes. It accepts only strictly formatted private project records, discovers containers, volumes, and networks through the exact Compose project label, and discovers images through exact per-service tags. It never invokes a Docker `prune` operation. A private report records every attempted deletion, with distinct exit statuses for no leak, successfully recovered leaks, and incomplete recovery. That distinction allows automation to fail on leakage without risking unrelated developer or runner resources.

## test(verify): 전체 스택 검증을 직렬 실행
A single `verify` entry point now runs static validation, strict Compose rendering, and all six runtime scenarios in a fixed sequence with scenario-specific time limits. Every runtime invocation writes its project identity into one private record directory, giving the final leak check a complete and bounded ownership set even if an earlier scenario fails or times out.

Cleanup runs from `finally`, independent of the primary result. An incomplete cleanup overrides any other outcome; a detected-and-recovered leak turns an otherwise successful run into failure; and evidence is preserved when resource accounting is not clean. Only a verification with no residual recorded resources removes the temporary control directory.

Serial execution makes the result easier to attribute and keeps Docker resource accounting deterministic. The command represents the complete verification lifecycle, not merely a list of tests: configuration must be valid, every behavioral scenario must pass, each command must terminate within its budget, and the runner must finish without leaving owned containers, volumes, networks, or images.

## ci(stack): 커밋 범위 공백 검사 도구 추가
A CI helper now applies `git diff --check` to the commit range that triggered the run. It accepts only full SHA-1 or SHA-256 object identifiers, verifies that the requested base is available as a commit, and otherwise falls back to `HEAD^`; an empty or all-zero event base uses the same fallback. This handles initial-push and unavailable-base cases without interpolating an unchecked revision expression into Git commands.

Checking the event range focuses whitespace-error enforcement on newly introduced changes instead of requiring unrelated historical cleanup. The selected base and resolved head are printed on success, making the exact validation boundary visible in CI output.

## ci(stack): 정적·런타임·복구 검증 자동화
A GitHub Actions workflow now runs the stack's full engineering contract on pull requests, main-branch pushes, and manual dispatch. It uses an Ubuntu 24.04 runner, grants only read access to repository contents, disables persisted checkout credentials, fetches complete history for range validation, pins third-party actions to reviewed commit SHAs, and cancels superseded runs for the same workflow and ref.

Static source checks and strict Compose rendering run before six separate runtime stages covering end-to-end behavior, forced bootstrap recovery, persistence, backup and restore, credential rotation, and operations. Each stage has its own timeout and diagnostic directory while all stages share a private project-record directory. This preserves failure attribution and gives the final always-run cleanup step an exact list of resources the job may reclaim.

Diagnostic upload occurs only on failure and uses an explicit allowlist of redacted files plus the cleanup report, with hidden files excluded and short retention. The workflow therefore automates not only functional testing but also bounded execution, scoped cleanup, minimum permissions, immutable CI dependencies, and controlled failure evidence.

## test(ci): workflow 검증 계약 추가
Static validation now treats the CI workflow and its support tools as part of the system's security and lifecycle contract. It requires the reviewed runner, top-level read-only permission, immutable action revisions, complete-history checkout, serial scenario commands with dedicated diagnostic paths, unconditional scoped cleanup, and the exact diagnostic artifact allowlist. Unsafe alternatives such as secret contexts, `pull_request_target`, shell tracing, environment dumping, or broad Docker pruning are explicitly rejected.

The same pass strengthens source-level invariants that CI is expected to enforce. Compose is parsed into exact service blocks to prevent runtime secret mounts, password-bearing environments, or Nginx access to the private WordPress configuration volume. Python AST inspection requires explicit timeouts on subprocess waits, verifies that startup reads secrets while holding the project lock, and exercises runtime main-path behavior with mocks so preparation timeouts, scenario failures, cleanup failures, and unexpected exceptions retain the correct exit and cleanup semantics. Credential-bearing process-argument patterns are prohibited across bootstrap and management tools.

Verification of verification is intentionally layered. Text checks preserve stable public mechanisms and critical failure stages; AST checks cover control-flow properties that simple matching cannot establish; imported unit-style probes test result propagation; and workflow-specific checks constrain permissions, ordering, cleanup, and evidence publication. This prevents a green CI file from becoming weaker through seemingly harmless edits to the workflow or the tools it orchestrates.

## test(docs): README 운영 안내 계약 검증
Static validation now requires the README to retain the stack identity, Docker Compose context, all three services, secret handling, and the basic `make test` and `make smoke` verification commands. It also requires Korean text, preserving the repository's intended operator-facing language.

This is a minimum discoverability contract rather than a proof that every documentation statement matches runtime behavior. Its value is to prevent later documentation rewrites from omitting the components and commands a reader needs to identify, validate, and operate the project at a basic level.

## fix(supply-chain): 보안 지원 runtime pin 갱신
The immutable runtime inputs are advanced as a coordinated set instead of being relaxed back to moving tags. All three images now use the dated Debian `bookworm-20260803-slim` base at a reviewed digest and the `20260812T000000Z` Debian package snapshot. WordPress core moves from 6.7.1 to 6.7.7 with the corresponding archive checksum, while the independently pinned WP-CLI version remains unchanged.

Static pin checks and the live WordPress version assertion move with the artifacts, preserving reproducibility and verification together. This commit demonstrates the maintenance requirement created by immutable supply-chain inputs: security and support updates must be adopted through an explicit, reviewable pin change rather than arriving invisibly during a rebuild.

## test(supply-chain): 검토된 runtime 최소 버전 검증
The end-to-end scenario now verifies the installed package versions inside the built containers, not only the source pins used to construct them. `dpkg-query` obtains the active Nginx, OpenSSL, `libssl3`, PHP-FPM, PHP CLI, and MariaDB package versions, and `dpkg --compare-versions` requires each one to meet its reviewed Debian minimum. The observed values are printed for auditability.

WordPress also reports its actual PHP version and database server version. Those values must parse as semantic version triples, satisfy the declared WordPress compatibility floors, and identify the database as MariaDB. This catches stale image caches, unexpected snapshot resolution, or a build path that bypasses the intended package inputs even when the Dockerfiles still contain the correct strings.

Static validation preserves the minimum-version table and comparison mechanisms themselves. The supply-chain contract therefore has three layers: immutable artifact identity, runtime identity checks for WordPress and WP-CLI, and minimum supported versions for the packages and platforms that actually execute the application.