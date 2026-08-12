#!/usr/bin/env python3
import ast
from contextlib import redirect_stderr
import importlib.util
import io
from pathlib import Path
from unittest import mock
import re
import stat
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]
COMPOSE = ROOT / "srcs" / "docker-compose.yml"


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    sys.exit(1)


def require_file(path: str) -> Path:
    full_path = ROOT / path
    if not full_path.is_file():
        fail(f"missing required file: {path}")
    return full_path


def require_text(path: str, patterns: list[str]) -> str:
    text = require_file(path).read_text()
    for pattern in patterns:
        if not re.search(pattern, text, re.MULTILINE):
            fail(f"{path} does not match {pattern!r}")
    return text


def require_executable(path: str) -> None:
    mode = require_file(path).stat().st_mode
    if not mode & stat.S_IXUSR:
        fail(f"{path} must be executable")


def compose_service_blocks(text: str) -> dict[str, str]:
    blocks: dict[str, list[str]] = {}
    current: str | None = None
    in_services = False
    for line in text.splitlines():
        if line == "services:":
            in_services = True
            continue
        if not in_services:
            continue
        if line and not line.startswith(" "):
            break
        service = re.fullmatch(r"  ([a-z0-9_-]+):", line)
        if service:
            current = service.group(1)
            blocks[current] = [line]
        elif current is not None:
            blocks[current].append(line)
    return {name: "\n".join(lines) for name, lines in blocks.items()}


def require_subprocess_timeouts(paths: tuple[str, ...]) -> None:
    for path in paths:
        tree = ast.parse(require_file(path).read_text(), filename=path)
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            function = node.func
            subprocess_call = (
                isinstance(function, ast.Attribute)
                and isinstance(function.value, ast.Name)
                and function.value.id == "subprocess"
                and function.attr in {"run", "check_call", "check_output"}
            )
            popen_wait = (
                isinstance(function, ast.Attribute)
                and function.attr in {"communicate", "wait"}
            )
            if not subprocess_call and not popen_wait:
                continue
            if not any(keyword.arg == "timeout" for keyword in node.keywords):
                fail(f"{path} has a subprocess call without an explicit timeout")


def validate_no_credential_arguments() -> None:
    paths = (
        "srcs/requirements/mariadb/tools/docker-entrypoint.sh",
        "srcs/requirements/wordpress/tools/docker-entrypoint.sh",
        "tools/start_stack.py",
        "tools/stack_backup.py",
        "tools/rotate_secrets.py",
    )
    patterns = (
        r"-p(?:assword)?(?:=)?[\"']?\$(?:\{)?[A-Za-z0-9_]*PASSWORD",
        r"--(?:dbpass|admin_password|user_pass)(?:=|\s+)[\"']?\$(?:\{)?",
        r"[\"']-p\{[^}\n]*(?:password|secret)[^}\n]*\}",
        r"[\"']--(?:password|dbpass|admin_password|user_pass)="
        r"\{[^}\n]*(?:password|secret)[^}\n]*\}",
    )
    for path in paths:
        text = require_file(path).read_text()
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                fail(f"{path} passes a credential through a process argument")


def validate_forbidden_project_wording() -> None:
    forbidden = ("Incep" + "tion").casefold()
    text_suffixes = {
        "",
        ".conf",
        ".example",
        ".md",
        ".py",
        ".sh",
        ".txt",
        ".yaml",
        ".yml",
    }
    try:
        tracked = subprocess.run(
            ["git", "-C", str(ROOT), "ls-files", "-z"],
            check=True,
            capture_output=True,
            text=True,
            timeout=30,
        ).stdout.split("\0")
    except (OSError, subprocess.SubprocessError) as error:
        fail(f"tracked source list could not be read: {error}")
    for name in tracked:
        if not name:
            continue
        path = ROOT / name
        if (
            not path.is_file()
            or (path.suffix not in text_suffixes and path.name not in {"Dockerfile", "Makefile"})
        ):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        if forbidden in text.casefold():
            fail(f"legacy assignment wording remains in {name}")


def validate_source_only() -> None:
    forbidden = [
        "docs",
        "notes",
        "evidence",
        "PLAN.md",
        "FAILURE_CASES.md",
        "COMMIT_SCENARIO.md",
        "TIMELINE.md",
        "docker-compose.yml",
        "conf",
        "src",
        "include",
    ]
    for item in forbidden:
        if (ROOT / item).exists():
            fail(f"forbidden final path exists: {item}")


def validate_compose() -> None:
    text = require_text(
        "srcs/docker-compose.yml",
        [
            r"services:",
            r"^\s+nginx:",
            r"^\s+mariadb:",
            r"^\s+wordpress:",
            r"HTTPS_BIND_ADDRESS:-127\.0\.0\.1",
            r"HTTPS_PORT:-443",
            r"condition: service_healthy",
            r"healthcheck:",
            r"^x-secret-files:",
            r"mariadb_data:",
            r"wordpress_data:",
            r"wordpress_config:",
        ],
    )
    service_blocks = compose_service_blocks(text)
    if set(service_blocks) != {"nginx", "mariadb", "wordpress"}:
        fail("compose must define exactly the three runtime services")
    for service, block in service_blocks.items():
        if re.search(r"^    secrets:", block, re.MULTILINE):
            fail(f"{service} runtime service must not mount Compose secrets")
        if "/run/secrets" in block:
            fail(f"{service} runtime service must not reference /run/secrets")
        environment = re.search(
            r"^    environment:\n((?:      .*(?:\n|$))*)",
            block,
            re.MULTILINE,
        )
        if environment:
            for key in re.findall(
                r"^      (?:-\s*)?([A-Za-z0-9_]+)(?:=|:)",
                environment.group(1),
                re.MULTILINE,
            ):
                if re.search(r"(?:PASSWORD|SECRET|TOKEN)", key):
                    fail(
                        f"{service} runtime environment must not contain credential key {key}"
                    )
    if "/var/www/config" in service_blocks["nginx"]:
        fail("nginx must not mount the WordPress configuration volume")
    if "wordpress_config:/var/www/config" not in service_blocks["wordpress"]:
        fail("wordpress must mount its configuration in a dedicated volume")
    if re.search(r"(^|\s)-\s*[\"']?80:", text):
        fail("nginx must not publish port 80")
    if "mysqladmin ping -h127.0.0.1 -uroot" in text:
        fail("mariadb healthcheck must not require TCP root login")
    if not re.search(
        r"test -f /var/lib/mysql(?:-volume/data)?/\.container-stack-initialized"
        r".+test -S /run/mysqld/mysqld\.sock.+kill -0 1",
        text,
    ):
        fail("mariadb healthcheck must require the completed bootstrap marker")
    if not re.search(
        r"test -f /var/www/html/\.container-stack-initialized.+REQUEST_METHOD=GET\s+SCRIPT_NAME=/ping\s+SCRIPT_FILENAME=/ping\s+cgi-fcgi",
        text,
    ):
        fail("wordpress healthcheck must require bootstrap completion before FPM ping")
    for image in ("wordpress:", "mariadb:", "nginx:"):
        if re.search(rf"image:\s*{image}", text):
            fail(f"compose must not use the official {image.rstrip(':')} image directly")
    if "container_name:" in text:
        fail("compose services must use project-scoped generated container names")
    for pattern in (r"WORDPRESS_URL:", r"STACK_IMAGE_PREFIX", r"STACK_IMAGE_TAG"):
        if not re.search(pattern, text):
            fail(f"compose does not match {pattern!r}")
    for required in (
        "cpus:",
        "mem_limit:",
        "pids_limit:",
        "no-new-privileges:true",
        "driver: json-file",
        'max-size: "10m"',
        'max-file: "3"',
        "stop_grace_period:",
    ):
        if text.count(required) != 3:
            fail(f"all three services must set the runtime policy: {required}")
    if not re.search(r"backend:\s+driver: bridge\s+internal: true", text):
        fail("database network must be an internal bridge")


def validate_dockerfiles() -> None:
    services = {
        "nginx": [
            r"FROM\s+debian:bookworm(?:-\d{8})?-slim|FROM\s+alpine:",
            r"apt-get install|apk add",
            r"COPY conf/nginx\.conf",
            r"EXPOSE 443",
        ],
        "mariadb": [
            r"FROM\s+debian:bookworm(?:-\d{8})?-slim|FROM\s+alpine:",
            r"mariadb-server",
            r"rm -rf /var/lib/mysql(?:/\*)?",
            r"COPY conf/50-server\.cnf",
            r"ENTRYPOINT",
        ],
        "wordpress": [
            r"FROM\s+debian:bookworm(?:-\d{8})?-slim|FROM\s+alpine:",
            r"php8\.2-fpm|php-fpm",
            r"wp-cli-\$\{WP_CLI_VERSION\}\.phar",
            r"EXPOSE 9000",
        ],
    }
    for service, patterns in services.items():
        require_file(f"srcs/requirements/{service}/.dockerignore")
        dockerfile = require_text(f"srcs/requirements/{service}/Dockerfile", patterns)
        if "bookworm-20260803-slim@sha256:abd67ffcfa541b485a3dff59865ab629aa048a6c613e639d36e7456b0b229241" not in dockerfile:
            fail(f"{service} must pin the Debian base image digest")
        if "snapshot.debian.org/archive/debian/20260812T000000Z" not in dockerfile:
            fail(f"{service} must use the immutable Debian package snapshot")
        require_executable(f"srcs/requirements/{service}/tools/docker-entrypoint.sh")

    wordpress = require_file("srcs/requirements/wordpress/Dockerfile").read_text()
    for required in (
        "WP_CLI_VERSION=2.11.0",
        "WORDPRESS_VERSION=6.7.7",
        "a39021ac809530ea607580dbf93afbc46ba02f86b6cffd03de4b126ca53079f6",
        "dadac21d0fd6f54f7c0565d8935d3e4baea5e649486ac6f40fe89792da498350",
        "sha256sum -c -",
    ):
        if required not in wordpress:
            fail(f"wordpress image is missing pinned artifact data: {required}")
    entrypoint = require_file(
        "srcs/requirements/wordpress/tools/docker-entrypoint.sh"
    ).read_text()
    if "wp core download" in entrypoint:
        fail("WordPress must use the image artifact instead of downloading at runtime")
    for required in (
        "/usr/src/wordpress-core.sha256",
        "sha256sum -c",
        'mv -- "$temporary" "$target"',
    ):
        if required not in entrypoint:
            fail(f"WordPress atomic artifact publication is missing {required!r}")

    runtime = require_file("tests/runtime_stack.py").read_text()
    for required in (
        "DEBIAN_PACKAGE_MINIMUMS",
        "1.22.1-9+deb12u9",
        "3.0.20-1~deb12u2",
        "8.2.33-1~deb12u1",
        "1:10.11.18-0+deb12u1",
        "dpkg --compare-versions",
        "WORDPRESS_REQUIRED_PHP = (7, 2, 24)",
        "WORDPRESS_REQUIRED_MYSQL = (5, 5, 5)",
    ):
        if required not in runtime:
            fail(f"runtime supply-chain check is missing {required!r}")


def validate_configs() -> None:
    require_text(
        "srcs/requirements/nginx/conf/nginx.conf",
        [
            r"listen 443 ssl http2",
            r"fastcgi_pass wordpress:9000",
            r"ssl_certificate",
            r"location = /healthz",
            r"access_log /dev/stdout",
            r"error_log /dev/stderr warn",
        ],
    )
    if "http2 on;" in require_file("srcs/requirements/nginx/conf/nginx.conf").read_text():
        fail("nginx config must use Debian-compatible listen http2 syntax")
    require_text(
        "srcs/requirements/mariadb/conf/50-server.cnf",
        [r"bind-address=0\.0\.0\.0", r"character-set-server=utf8mb4"],
    )
    require_text(
        "srcs/requirements/wordpress/conf/www.conf",
        [
            r"listen = 0\.0\.0\.0:9000",
            r"ping\.path = /ping",
            r"^clear_env\s*=\s*yes$",
        ],
    )


def validate_env_policy() -> None:
    env_text = require_file(".env.example").read_text()
    for key in (
        "DOMAIN_NAME",
        "WORDPRESS_URL",
        "HTTPS_BIND_ADDRESS",
        "HTTPS_PORT",
        "MYSQL_DATABASE",
        "MYSQL_USER",
        "DB_ROOT_PASSWORD_FILE",
        "DB_PASSWORD_FILE",
        "WP_ADMIN_PASSWORD_FILE",
        "WP_USER_PASSWORD_FILE",
    ):
        if f"{key}=" not in env_text:
            fail(f".env.example is missing {key}")
    if re.search(r"PASSWORD=change-me", env_text):
        fail(".env.example must point to secret files instead of embedding passwords")


def validate_tools() -> None:
    require_executable("tools/smoke_https.sh")
    require_text(
        "tools/smoke_https.sh",
        [
            r"curl .+--connect-timeout",
            r"curl .+--max-time",
        ],
    )
    require_executable("tools/start_stack.py")
    require_executable("tools/stack_runtime.py")
    require_text(
        "Makefile",
        [
            r"^up:\s*\n\s+python3 tools/start_stack\.py start",
            r"^start-database:\s*\n\s+python3 tools/start_stack\.py database",
            r"^start-application:\s*\n\s+python3 tools/start_stack\.py application",
            r"^smoke:",
            r"tools/smoke_https\.sh",
            r"^bootstrap-test:",
            r"runtime_stack\.py bootstrap",
            r"^e2e:",
            r"runtime_stack\.py e2e",
            r"^persistence:",
            r"runtime_stack\.py persistence",
            r"^backup:",
            r"stack_backup\.py backup",
            r"^restore:",
            r"stack_backup\.py restore",
            r"^backup-restore-test:",
            r"runtime_stack\.py backup-restore",
            r"^rotate-secrets:",
            r"rotate_secrets\.py",
            r"^rotation-test:",
            r"runtime_stack\.py rotation",
            r"^config-strict:",
            r"config --quiet",
            r"^diagnostics:",
            r"diagnose_stack\.py",
            r"^operations-test:",
            r"runtime_stack\.py operations",
            r"DESTROY_CONFIRM",
        ],
    )
    require_text(
        "tools/stack_runtime.py",
        [
            r"DEFAULT_COMPOSE_FILE\s*=\s*ROOT\s*/",
            r"def load_secret_values",
            r"def secret_source_paths",
            r"config\.get\([\"']x-secret-files[\"']",
            r"def secret_payload",
            r"input_stream",
            r"subprocess\.TimeoutExpired",
            r"timeout=",
            r"O_NOFOLLOW",
            r"project_operation_lock",
        ],
    )
    require_text(
        "tools/start_stack.py",
        [
            r"load_secret_values",
            r"secret_payload",
            r"project_operation_lock",
            r"input_data=",
            r"--wait-timeout",
            r"choices=.*start.*database.*application",
        ],
    )
    start_tree = ast.parse(
        require_file("tools/start_stack.py").read_text(),
        filename="tools/start_stack.py",
    )
    run_action = next(
        (
            node
            for node in start_tree.body
            if isinstance(node, ast.FunctionDef) and node.name == "run_action"
        ),
        None,
    )
    if run_action is None:
        fail("start tool is missing run_action")
    lock_blocks = [node for node in ast.walk(run_action) if isinstance(node, ast.With)]
    secret_reads = [
        node
        for node in ast.walk(run_action)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Name)
        and node.func.id == "load_secret_values"
    ]
    if (
        len(secret_reads) != 1
        or not any(
            block.lineno < secret_reads[0].lineno <= (block.end_lineno or block.lineno)
            for block in lock_blocks
        )
    ):
        fail("start tool must read secret files while holding the project operation lock")
    require_text(
        "tools/stack_backup.py",
        [
            r"--single-transaction",
            r"sha256",
            r"ensure_fresh_project",
            r"validate_archive",
            r"os\.replace",
            r"O_NOFOLLOW",
            r"fcntl\.flock",
            r"defaults-extra-file",
            r"mktemp /run/container-stack",
            r"output\.mkdir\(mode=0o700\)",
            r"fsync_directory",
            r"cleanup_failed_restore",
            r"expected_container_names",
            r"existing_named_containers",
            r"database-restore",
            r"input_stream",
            r"output_stream",
            r"def private_output",
            r"TRANSFER_TIMEOUT_SECONDS",
            r"operation_signal_handlers",
            r"signal\.SIGINT",
            r"signal\.SIGTERM",
            r"project_operation_lock",
            r"Path\([\"']\/tmp[\"']\)",
            r"pause_for_test",
            r"--pause-after",
            r"--pause-ready-file",
        ],
    )
    backup_tool = require_file("tools/stack_backup.py").read_text()
    option_password_literal = r"password=\"%s\""
    if backup_tool.count(option_password_literal) != 2:
        fail("backup and restore option files must quote database passwords")
    if "/run/secrets" in backup_tool:
        fail("backup tool must use rendered host secret sources, not runtime mounts")
    if backup_tool.count("output_stream=output") < 2:
        fail("database and WordPress backups must stream directly to private files")
    require_text(
        "tools/rotate_secrets.py",
        [
            r"def atomic_secret_write",
            r"def verify_rotation",
            r"def maybe_fail",
            r"rollback_errors",
            r"--new-secrets-dir",
            r"project_operation_lock",
            r"tempnam",
            r"SIGNAL SQLSTATE",
            r"admin-user-command",
            r"root-password-command",
            r"host-file",
            r"DEFAULT_COMPOSE_FILE",
            r"default=DEFAULT_COMPOSE_FILE",
            r"O_NOFOLLOW",
            r"signal\.SIGINT",
            r"signal\.SIGTERM",
            r"one_off",
            r'"run",\s*\n\s*"--rm"',
            r'"--entrypoint",\s*\n\s*"php"',
            r"recreate-wordpress-removed",
            r'project\.run\("rm", "--stop", "--force", "wordpress"\)',
            r'"rollback_active"',
            r'"deferred"',
            r"--pause-after",
            r"--rollback-ready-file",
        ],
    )
    rotation_tool = require_file("tools/rotate_secrets.py").read_text()
    if rotation_tool.count(option_password_literal) != 2:
        fail("rotation option files must quote database passwords")
    forbidden_mount_reads = (
        r"verify_mounted_secret",
        r"[\"']verify-secret[\"']",
        r"\bcat\b[^\n]*/run/secrets(?:/|\b)",
        r"[\"'](?:cat|head|tail|readlink)[\"'][^\n]{0,160}"
        r"[\"']/run/secrets(?:/|[\"'])",
    )
    if any(re.search(pattern, rotation_tool) for pattern in forbidden_mount_reads):
        fail("rotation must not read credentials from runtime secret mounts")
    if re.search(r"auth=/tmp/container-stack-(?:root|app)\.\$\$", rotation_tool):
        fail("rotation database clients must use unpredictable private option files")
    require_text(
        "tools/diagnose_stack.py",
        [
            r"secret_values",
            r"def redact",
            r"0o600",
            r"0o700",
            r"--no-interpolate",
            r"--tail",
            r"container_state",
            r"destination\.mkdir\(mode=0o700\)",
            r"except FileExistsError",
            r"def rendered_compose_config",
            r'"config",\s*"--format",\s*"json"',
            r"x-secret-files",
            r"config\s*=\s*rendered_compose_config\(",
            r"secret_values\(config\)",
            r"COMPOSE_FILE\.parent",
            r"read_private_secret",
        ],
    )
    diagnostics = require_file("tools/diagnose_stack.py").read_text()
    if re.search(r"def parse_env|endswith\([\"']_FILE[\"']\)", diagnostics):
        fail("diagnostics must derive secret sources from rendered Compose configuration")
    if re.search(r"except[^\n]*OSError[^\n]*:\s*\n\s*continue", diagnostics):
        fail("diagnostics must stop when a secret value cannot be read")
    require_executable("tools/diagnose_stack.py")
    require_text(
        "tests/runtime_stack.py",
        [
            r"--project-name",
            r"--resolve",
            r'"post",\s*\n\s*"create"',
            r'"down",\s*\n\s*"--volumes"',
            r"def verify_persistence",
            r"def verify_bootstrap_recovery",
            r"database-publish",
            r"wordpress-marker",
            r'command = \["docker", kind, "ls"\]',
            r'"restart"',
            r'"down", "--remove-orphans"',
            r"def verify_backup_restore",
            r"missing-backup-target",
            r"database-dump",
            r"database-restore",
            r"PROCESS_TIMEOUT_SECONDS\s*=\s*120",
            r"time\.monotonic\(\)",
            r"process\.kill\(\)",
            r"--pause-after",
            r"--pause-ready-file",
            r"backup-stop",
            r"signal\.SIGTERM",
            r"signal\.SIGINT",
            r"def project_resources",
            r"def verify_services_running",
            r'"ps", "--status", "running", "--services"',
            r"\(\"container\", \"volume\", \"network\"\)",
            r"command\.append\(\"--all\"\)",
            r"TMPDIR",
            r"다른 관리 작업이 실행 중입니다",
            r"def verify_secret_rotation",
            r"timeout=600",
            r"def _assert_rotation_state",
            r"admin-user-command",
            r"root-password-command",
            r"host-file",
            r"config-command",
            r"recreate-wordpress-removed",
            r"def _interrupt_rotation_tool",
            r"rotation-host-files\.ready",
            r"rotation-rollback\.ready",
            r"추가 종료 신호 지연 처리",
            r"def verify_operations",
            r"no-new-privileges:true",
            r"operations-diagnostics",
            r"def assert_runtime_secret_boundary",
            r"destination == [\"']/run/secrets[\"']",
            r"Config",
            r"Env",
            r"\[\"docker\", \"top\", container_id, \"-eo\", \"pid,args\"\]",
            r"self\.image_prefix\s*=\s*image_prefix\s+or\s+f[\"']\{self\.project\}-image",
            r"[\"']STACK_IMAGE_PREFIX[\"']:\s*self\.image_prefix",
            r"[\"']docker[\"],\s*[\"']image[\"],\s*[\"']rm[\"']",
            r"timeout=",
        ],
    )
    runtime_tool = require_file("tests/runtime_stack.py").read_text()
    hash_secret_markers = (
        "root#-{secrets.token_urlsafe(24)}",
        "db#-{secrets.token_urlsafe(24)}",
        "{prefix}-root#-{secrets.token_urlsafe(24)}",
        "{prefix}-db#-{secrets.token_urlsafe(24)}",
    )
    if runtime_tool.count(option_password_literal) != 1 or any(
        marker not in runtime_tool for marker in hash_secret_markers
    ):
        fail("runtime scenarios must exercise quoted # database passwords")
    runtime_tree = ast.parse(runtime_tool, filename="tests/runtime_stack.py")
    runtime_main = next(
        node
        for node in runtime_tree.body
        if isinstance(node, ast.FunctionDef) and node.name == "main"
    )
    runtime_main_text = ast.get_source_segment(runtime_tool, runtime_main) or ""
    if runtime_main_text.count(
        "except (OSError, StackError, subprocess.SubprocessError)"
    ) != 2:
        fail("runtime scenarios must classify every subprocess failure")
    require_subprocess_timeouts(
        (
            "tools/stack_runtime.py",
            "tools/start_stack.py",
            "tools/stack_backup.py",
            "tools/diagnose_stack.py",
            "tools/cleanup_test_resources.py",
            "tools/verify_stack.py",
            "tests/runtime_stack.py",
        )
    )
    validate_no_credential_arguments()


def validate_runtime_control_flow() -> None:
    spec = importlib.util.spec_from_file_location(
        "container_stack_runtime_test", ROOT / "tests" / "runtime_stack.py"
    )
    if spec is None or spec.loader is None:
        fail("runtime control test module could not be loaded")
    runtime = importlib.util.module_from_spec(spec)
    sys.path.insert(0, str(ROOT / "tools"))
    try:
        spec.loader.exec_module(runtime)
    finally:
        sys.path.pop(0)

    arguments = runtime.argparse.Namespace(
        scenario="e2e",
        keep=False,
        diagnostics_dir=None,
        project_record_dir=None,
    )

    class FakeStack:
        def __init__(self, error=None, cleanup_failures=None):
            self.error = error
            self.cleanup_failures = cleanup_failures or []
            self.close_calls = []

        def verify_e2e(self):
            if self.error is not None:
                raise self.error

        def close(self, *, failed):
            self.close_calls.append(failed)
            return self.cleanup_failures

    def execute(fake_stack):
        completed = runtime.subprocess.CompletedProcess(
            ["docker", "compose", "version"], 0
        )
        with (
            mock.patch.object(runtime, "parse_arguments", return_value=arguments),
            mock.patch.object(runtime, "require_command"),
            mock.patch.object(runtime, "RuntimeStack", return_value=fake_stack),
            mock.patch.object(runtime.subprocess, "run", return_value=completed),
            redirect_stderr(io.StringIO()),
        ):
            return runtime.main()

    with (
        mock.patch.object(runtime, "parse_arguments", return_value=arguments),
        mock.patch.object(runtime, "require_command"),
        mock.patch.object(
            runtime.subprocess,
            "run",
            side_effect=runtime.subprocess.TimeoutExpired("docker compose version", 1),
        ),
        redirect_stderr(io.StringIO()),
    ):
        if runtime.main() != 2:
            fail("runtime preparation timeout must return 2")

    scenario_timeout = FakeStack(
        runtime.subprocess.TimeoutExpired("runtime scenario", 1)
    )
    if execute(scenario_timeout) != 1 or scenario_timeout.close_calls != [True]:
        fail("runtime scenario timeout must return 1 and clean failed state")

    cleanup_failure = FakeStack(cleanup_failures=["injected cleanup failure"])
    if execute(cleanup_failure) != 1 or cleanup_failure.close_calls != [False]:
        fail("runtime cleanup failure must change a successful result to 1")

    for error in (ValueError("injected parse failure"), KeyboardInterrupt()):
        unexpected = FakeStack(error)
        try:
            execute(unexpected)
        except type(error):
            pass
        else:
            fail("unexpected runtime failures must propagate after cleanup")
        if unexpected.close_calls != [True]:
            fail("unexpected runtime failures must still clean failed state")


def validate_bootstrap_recovery() -> None:
    mariadb = require_text(
        "srcs/requirements/mariadb/tools/docker-entrypoint.sh",
        [
            r"\.container-stack-initialized",
            r"timed out waiting for temporary MariaDB server",
            r"staging_dir=",
            r"mariadb-install-db.+--datadir=[\"']?\$staging_dir",
            r"staging_marker=",
            r"sync -f [\"']?\$staging_marker",
            r"mv -- [\"']?\$staging_dir[\"']? [\"']?\$data_dir",
            r"IFS= read -r root_password",
            r"IFS= read -r app_password",
            r"--defaults-extra-file=",
            r"trap cleanup EXIT",
            r"ALTER USER '\$\{MYSQL_USER\}'@'%'",
        ],
    )
    fresh_database = mariadb[mariadb.index("mariadb-install-db") :]
    database_steps = (
        "start_temporary_server",
        "verify_database",
        "staging_marker=",
        'mv -- "$staging_dir" "$data_dir"',
    )
    missing_database_steps = [
        step for step in database_steps if step not in fresh_database
    ]
    if missing_database_steps:
        fail(f"MariaDB staged bootstrap is missing {missing_database_steps}")
    database_offsets = [fresh_database.index(step) for step in database_steps]
    if database_offsets != sorted(database_offsets):
        fail("MariaDB must verify staged data and publish its marker before the data path")

    wordpress = require_text(
        "srcs/requirements/wordpress/tools/docker-entrypoint.sh",
        [
            r"\.container-stack-initialized",
            r"timed out waiting for authenticated MariaDB access",
            r"wp core is-installed",
            r"IFS= read -r db_password",
            r"IFS= read -r admin_password",
            r"IFS= read -r user_password",
            r"--defaults-extra-file=",
            r"\.bootstrap\.\$\$",
            r"cp -[ap] -- [\"']?\$source[\"']? [\"']?\$temporary",
            r"mv (?:-f )?-- [\"']?\$temporary[\"']? [\"']?\$target",
            r"\.wp-config\.bootstrap\.\$\$",
            r"config_dir=.*?/var/www/config",
            r"publish_config_link",
            r"--prompt=admin_password",
            r"--prompt=user_pass",
            r"marker_tmp=",
            r"sync -f [\"']?\$marker_tmp",
            r"mv -f -- [\"']?\$marker_tmp[\"']? [\"']?\$marker",
            r"trap cleanup EXIT",
        ],
    )
    wordpress_bootstrap = wordpress[wordpress.index("install_core_files\n") :]
    wordpress_steps = (
        "install_core_files",
        "converge_wordpress_config",
        "install_wordpress",
        "ensure_author",
        "marker_tmp=",
    )
    missing_wordpress_steps = [
        step for step in wordpress_steps if step not in wordpress_bootstrap
    ]
    if missing_wordpress_steps:
        fail(f"WordPress atomic bootstrap is missing {missing_wordpress_steps}")
    wordpress_offsets = [
        wordpress_bootstrap.index(step) for step in wordpress_steps
    ]
    if wordpress_offsets != sorted(wordpress_offsets):
        fail("WordPress must publish files and verified state before its completion marker")


def validate_ci() -> None:
    workflow = require_file(".github/workflows/container-stack.yml").read_text()
    required = (
        "runs-on: ubuntu-24.04",
        "timeout-minutes: 210",
        "permissions:\n  contents: read",
        "persist-credentials: false",
        "fetch-depth: 0",
        'tools/check_commit_range.py --base "${{ github.event.pull_request.base.sha || github.event.before }}"',
        "make test",
        "make config-strict ENV_FILE=.env.example",
        "if: ${{ always() }}",
        "if: ${{ failure() }}",
        "retention-days: 7",
        "include-hidden-files: false",
        "install -d -m 0700 artifacts artifacts/projects",
        "tools/cleanup_test_resources.py --project-record-dir artifacts/projects --report artifacts/cleanup.txt",
    )
    for value in required:
        if value not in workflow:
            fail(f"container stack workflow is missing {value!r}")
    expected_actions = [
        "actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683",
        "actions/upload-artifact@65c4c4a1ddee5b72f698fdd19549f0f0fb45cf08",
    ]
    actions = re.findall(r"^[ \t]*uses:[ \t]*(\S+)", workflow, re.MULTILINE)
    if actions != expected_actions:
        fail("workflow actions must use the reviewed immutable revisions")
    if workflow.count("permissions:") != 1 or re.search(
        r"^[ \t]+permissions:", workflow, re.MULTILINE
    ):
        fail("workflow must define permissions once at the top level")
    workflow_lines = workflow.splitlines()
    permissions_index = workflow_lines.index("permissions:")
    permission_values: list[str] = []
    for line in workflow_lines[permissions_index + 1 :]:
        if line and not line.startswith(" "):
            break
        if line.strip():
            permission_values.append(line.strip())
    if permission_values != ["contents: read"]:
        fail("workflow permissions must contain only contents: read")
    scenarios = (
        "e2e",
        "bootstrap",
        "persistence",
        "backup-restore",
        "rotation",
        "operations",
    )
    offsets = []
    for scenario in scenarios:
        command = (
            f"python3 tests/runtime_stack.py {scenario} "
            f"--diagnostics-dir artifacts/{scenario} "
            "--project-record-dir artifacts/projects"
        )
        if workflow.count(command) != 1:
            fail(f"workflow must run {scenario} once with a dedicated diagnostic path")
        offsets.append(workflow.index(command))
    if offsets != sorted(offsets):
        fail("workflow runtime scenarios must remain sequential")
    allowed_artifacts = {
        "artifacts/**/versions.txt",
        "artifacts/**/compose-ps.txt",
        "artifacts/**/compose-logs.txt",
        "artifacts/**/compose-model.txt",
        "artifacts/**/container-state.txt",
        "artifacts/cleanup.txt",
    }
    path_indexes = [
        index
        for index, line in enumerate(workflow_lines)
        if line.strip().startswith("path:")
    ]
    if len(path_indexes) != 1 or workflow_lines[path_indexes[0]] != "          path: |":
        fail("workflow must define exactly one allowlisted artifact path block")
    artifact_paths: list[str] = []
    for line in workflow_lines[path_indexes[0] + 1 :]:
        if line.strip() and len(line) - len(line.lstrip(" ")) <= 10:
            break
        if line.strip():
            artifact_paths.append(line.strip())
    if artifact_paths != [
        "artifacts/**/versions.txt",
        "artifacts/**/compose-ps.txt",
        "artifacts/**/compose-logs.txt",
        "artifacts/**/compose-model.txt",
        "artifacts/**/container-state.txt",
        "artifacts/cleanup.txt",
    ] or set(artifact_paths) != allowed_artifacts:
        fail("workflow artifact paths must use the diagnostic allowlist")
    for forbidden in (
        "pull_request_target",
        "${{ secrets.",
        "set -x",
        "printenv",
        "docker system prune",
        "docker volume prune",
    ):
        if forbidden in workflow:
            fail(f"workflow contains unsafe construct: {forbidden}")

    require_executable("tools/cleanup_test_resources.py")
    cleanup = require_file("tools/cleanup_test_resources.py").read_text()
    for value in (
        r"^container-stack-[0-9]+-[0-9a-f]{6}$",
        "com.docker.compose.project",
        'IMAGE_SERVICES = ("nginx", "wordpress", "mariadb")',
        "def load_projects",
        "--project-record-dir",
        'f"label={PROJECT_LABEL}={project}"',
        'f"{project}-image-{service}:local"',
        'f"reference={tag}"',
        "tag in result.stdout.splitlines()",
        '"docker", "rm", "--force"',
        '"docker", "volume", "rm"',
        '"docker", "network", "rm"',
        '"docker", "image", "rm"',
        "0o600",
        "timeout=30",
    ):
        if value not in cleanup:
            fail(f"cleanup tool is missing the scoped policy: {value}")
    if "prune" in cleanup:
        fail("cleanup tool must not use broad Docker prune operations")
    if 'if failures:' not in cleanup or "return 2" not in cleanup:
        fail("cleanup tool must distinguish resource removal failures")

    require_executable("tools/check_commit_range.py")
    require_text(
        "tools/check_commit_range.py",
        [
            r"OBJECT_ID",
            r"cat-file",
            r"available\.returncode == 0",
            r"return fallback_base\(\)",
            r"git\(\"diff\", \"--check\"",
        ],
    )

    require_executable("tools/verify_stack.py")
    verify = require_file("tools/verify_stack.py").read_text()
    verify_tree = ast.parse(verify, filename="tools/verify_stack.py")
    configured_scenarios: tuple[str, ...] | None = None
    for node in verify_tree.body:
        if (
            isinstance(node, ast.Assign)
            and any(
                isinstance(target, ast.Name) and target.id == "SCENARIOS"
                for target in node.targets
            )
        ):
            value = ast.literal_eval(node.value)
            if isinstance(value, tuple) and all(
                isinstance(item, str) for item in value
            ):
                configured_scenarios = value
            break
    if configured_scenarios != (
        "bootstrap",
        "e2e",
        "persistence",
        "backup-restore",
        "rotation",
        "operations",
    ):
        fail("serial verification tool must run every runtime scenario in order")
    for value in (
        '["make", "test"]',
        '["make", "config-strict", "ENV_FILE=.env.example"]',
        '"--project-record-dir"',
        '"cleanup_test_resources.py"',
        '"--report"',
        "누수 재확인 자료를 보존했습니다",
    ):
        if value not in verify:
            fail(f"serial verification tool is missing {value!r}")
    require_text("Makefile", [r"^verify:\s+python3 tools/verify_stack\.py"])


def validate_rotation_runtime_boundary() -> None:
    runtime = require_file("tests/runtime_stack.py").read_text()
    forbidden = (
        "def _mounted_secret_matches",
        "/run/secrets/db_root_password",
        "/run/secrets/wp_admin_password",
    )
    for fragment in forbidden:
        if fragment in runtime:
            fail(f"rotation validation depends on an obsolete secret mount: {fragment}")
    for required in (
        "find /var/www/config -maxdepth 1 -type f",
        ".wp-config.rotate.*",
        "self.assert_runtime_secret_boundary(expected)",
    ):
        if required not in runtime:
            fail(f"rotation runtime boundary is missing {required!r}")


def validate_readme() -> None:
    text = require_file("README.md").read_text()
    for phrase in (
        "container-stack",
        "Docker Compose",
        "nginx",
        "MariaDB",
        "WordPress",
        "secrets",
        "make test",
        "make smoke",
    ):
        if phrase not in text:
            fail(f"README.md must mention {phrase}")
    if not re.search(r"[가-힣]", text):
        fail("README.md must be written in Korean")

def main() -> None:
    validate_source_only()
    validate_forbidden_project_wording()
    validate_compose()
    validate_dockerfiles()
    validate_configs()
    validate_env_policy()
    validate_tools()
    validate_runtime_control_flow()
    validate_bootstrap_recovery()
    validate_ci()
    validate_readme()
    validate_rotation_runtime_boundary()
    print("static stack validation passed")


if __name__ == "__main__":
    main()
