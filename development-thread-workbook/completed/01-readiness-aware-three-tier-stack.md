# Thread 1 — From custom services to a readiness-aware three-tier stack

## Thread 목표

개별 MariaDB, WordPress, Nginx 서비스가 Docker Compose 안에서 하나의 상태를 갖는 시스템으로 결합되는 과정을 복원합니다. 핵심은 이미지 세 개의 존재가 아니라 외부 transport, 애플리케이션 실행, 영속 상태의 책임을 분리하고 readiness와 named volume으로 연결한 결정입니다.

**Source significance**

> The thread progresses from individually runnable containers to one stateful application system. The decisive step is not the existence of three images but the Compose responsibility boundary: Nginx owns external transport, WordPress owns application execution, and MariaDB owns durable relational state. Health-gated dependencies and mounted volumes then make the topology operationally meaningful rather than merely connected.

## 이 Thread를 이해하기 위한 핵심 질문

- 각 서비스는 어떤 책임을 독점하며, 어떤 책임을 갖지 않습니까?
- 외부 HTTPS 요청은 어떤 설정 계약을 거쳐 PHP-FPM과 MariaDB까지 도달합니까?
- 이미지 계층의 상태와 named volume의 권위 있는 상태는 어디에서 분리됩니까?
- 컨테이너 생성 순서와 실제 서비스 준비 상태는 어떻게 구분됩니까?
- 초기 idempotent entrypoint가 제공한 보장과 이후 interruption-safe bootstrap이 추가로 해결한 문제는 무엇입니까?

## 완료 기준

- 세 서비스의 build/runtime/volume/network 책임을 해당 SHA의 설정과 entrypoint로 설명할 수 있습니다.
- Nginx → FastCGI → WordPress → MariaDB 경로를 실제 directive와 service name으로 추적했습니다.
- 초기화 조건, volume 재사용 조건, health check 조건을 서로 혼동하지 않고 기록했습니다.
- 초기 설계가 interruption-safe하지 않았던 지점을 후속 bootstrap thread와 연결했습니다.

## Commit map

| 순서 | SHA | Subject | Importance | Tags | Source-defined role |
| --- | --- | --- | --- | --- | --- |
| 1 | `f8ec9621725c` | feat(mariadb): Debian 서버 이미지 추가 | **B** | `STACK`<br>`PERSISTENCE` | Established the project-owned MariaDB runtime and persistent-data ownership. |
| 2 | `e13b0357a21b` | feat(mariadb): DB와 애플리케이션 계정 초기화 | **A** | `BOOTSTRAP`<br>`SECRETS`<br>`CORE` | Added the first idempotent database and account bootstrap. |
| 3 | `d764d066167b` | feat(wordpress): 사이트와 사용자 계정 초기화 | **A** | `BOOTSTRAP`<br>`PERSISTENCE`<br>`CORE` | Added WordPress filesystem, site, and user convergence. |
| 4 | `99c03f54399a` | feat(nginx): PHP 요청을 WordPress로 전달 | **A** | `STACK`<br>`INTEGRATION`<br>`CORE` | Defined the HTTPS-to-FastCGI request boundary. |
| 5 | `a8b9f693c614` | feat(compose): 세 서비스 토폴로지 구성 | **S** | `ARCH`<br>`STACK`<br>`CORE` | Assembled the three service responsibilities into the core Compose topology. |
| 6 | `75590dedfb3a` | feat(compose): 준비 상태에 따라 영속 서비스 연결 | **A** | `PERSISTENCE`<br>`INTEGRATION`<br>`OPERATIONS` | Connected named volumes, health checks, and dependency readiness. |

> Commit 순서는 source의 Development Thread 정의를 그대로 따릅니다. 같은 SHA가 다른 Thread에도 있으면 이 문서의 관점으로 다시 확인합니다.

## Commit별 학습 기록

### 1. `f8ec9621725c` — feat(mariadb): Debian 서버 이미지 추가

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **B** |
| Tags | `STACK`, `PERSISTENCE` |
| Source-defined role | Established the project-owned MariaDB runtime and persistent-data ownership. |
| 이전 Thread commit | 없음 |
| 다음 Thread commit | `e13b0357a21b` |

#### 원문이 확정한 범위

- **Summary:** Creates the custom Debian MariaDB image and foreground daemon lifecycle.
- **Classification reason:** The image is required for the project-owned database service, yet it mainly establishes expected container packaging and ownership conventions.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `f8ec9621725c`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `srcs/requirements/mariadb/Dockerfile`의 `FROM / RUN / CMD`에서 이미지가 DB 실행 파일과 빈 데이터 경로만 제공하고 실제 데이터는 실행 시 경로가 소유하도록 준비합니다.
- `srcs/requirements/mariadb/Dockerfile`의 `mariadbd foreground command`에서 PID 1과 DB daemon lifecycle이 분리되지 않으며 컨테이너 종료가 daemon 종료로 이어집니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| f8ec9621725c | srcs/requirements/mariadb/Dockerfile | FROM / RUN / CMD | Debian 기반에 MariaDB server/client, CA, gosu를 설치하고 배포판의 초기 DB 내용을 제거한 뒤 runtime/data directory를 `mysql` 소유로 다시 만듭니다. | 이미지가 DB 실행 파일과 빈 데이터 경로만 제공하고 실제 데이터는 실행 시 경로가 소유하도록 준비합니다. |
| f8ec9621725c | srcs/requirements/mariadb/Dockerfile | mariadbd foreground command | 최종 명령은 `mariadbd`를 `mysql` 사용자로 foreground에서 실행합니다. | PID 1과 DB daemon lifecycle이 분리되지 않으며 컨테이너 종료가 daemon 종료로 이어집니다. |

#### B-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| Thread에서 맡은 구현 역할 | Established the project-owned MariaDB runtime and persistent-data ownership. |
| 핵심 input / output / state | 이미지는 실행 파일과 초기 디렉터리 권한을 소유하지만, `/var/lib/mysql`에 실제 데이터가 생긴 뒤의 내용과 수명은 runtime 또는 후속 volume mount가 소유합니다. |
| 변경된 directive / helper / command | `srcs/requirements/mariadb/Dockerfile`의 `FROM / RUN / CMD`; `srcs/requirements/mariadb/Dockerfile`의 `mariadbd foreground command` |
| immediate failure 또는 boundary | 이 SHA에는 first-run database/account bootstrap이 없습니다. 빈 경로에서 daemon이 어떤 스키마와 계정을 가져야 하는지는 아직 정의되지 않았습니다. |
| 다음 commit에 넘긴 한계 | 초기 스키마, root hardening, application database/user, interruption recovery, named-volume persistence는 보장하지 않습니다. `e13b0357a21b`가 같은 이미지에 idempotent first-run entrypoint를 추가하고, `75590dedfb3a`가 data directory를 named volume에 연결합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: 초기 스키마, root hardening, application database/user, interruption recovery, named-volume persistence는 보장하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `e13b0357a21b`가 같은 이미지에 idempotent first-run entrypoint를 추가하고, `75590dedfb3a`가 data directory를 named volume에 연결합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: 프로젝트가 직접 빌드한 MariaDB가 foreground process로 실행되고, 데이터 경로가 `mysql` 사용자에게 쓰기 가능하다는 점을 보장합니다.

### 2. `e13b0357a21b` — feat(mariadb): DB와 애플리케이션 계정 초기화

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `BOOTSTRAP`, `SECRETS`, `CORE` |
| Source-defined role | Added the first idempotent database and account bootstrap. |
| 이전 Thread commit | `f8ec9621725c` |
| 다음 Thread commit | `d764d066167b` |

#### 원문이 확정한 범위

- **Summary:** Adds first-run MariaDB initialization, account hardening, database creation, and idempotent volume reuse.
- **Classification reason:** This is the first substantial state-creation mechanism and establishes least-privilege database ownership, even though the later staged bootstrap redesign supersedes parts of it.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `e13b0357a21b`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `srcs/requirements/mariadb/tools/docker-entrypoint.sh`의 `secret input / identifier validation`에서 초기화 SQL에 들어가는 입력을 entrypoint가 먼저 정규화합니다.
- `srcs/requirements/mariadb/tools/docker-entrypoint.sh`의 `first-run branch / temporary server`에서 외부 TCP 요청을 받기 전에 bootstrap SQL을 실행합니다.
- `srcs/requirements/mariadb/tools/docker-entrypoint.sh`의 `hardening SQL / final exec`에서 초기화 process와 장기 실행 daemon 사이의 handoff가 명시됩니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| e13b0357a21b | srcs/requirements/mariadb/tools/docker-entrypoint.sh | secret input / identifier validation | 직접 값과 `_FILE` 입력의 동시 사용을 거부하고, 필수 값 누락·잘못된 DB/user 식별자·SQL literal을 검사하거나 escape합니다. | 초기화 SQL에 들어가는 입력을 entrypoint가 먼저 정규화합니다. |
| e13b0357a21b | srcs/requirements/mariadb/tools/docker-entrypoint.sh | first-run branch / temporary server | system database directory가 없을 때만 `mariadb-install-db`를 실행하고, networking을 끈 socket-only 임시 서버를 띄워 readiness를 기다립니다. | 외부 TCP 요청을 받기 전에 bootstrap SQL을 실행합니다. |
| e13b0357a21b | srcs/requirements/mariadb/tools/docker-entrypoint.sh | hardening SQL / final exec | anonymous user·remote root·test DB를 제거하고 application DB/user/grant를 만든 뒤 임시 서버를 종료하고 최종 `mariadbd`로 `exec`합니다. | 초기화 process와 장기 실행 daemon 사이의 handoff가 명시됩니다. |

#### 비교 기준

- exact commit diff: `git diff e13b0357a21b^ e13b0357a21b -- <path>`
- 이전 Thread 상태와 비교: `git diff f8ec9621725c e13b0357a21b -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | `f8ec9621725c`의 이미지는 빈 DB 경로와 daemon만 제공했으므로 WordPress가 인증할 database/account가 없었습니다. |
| 선택한 boundary / decision | entrypoint가 빈 volume과 이미 채워진 volume을 구분하고, 빈 경우에만 socket-only 임시 서버를 이용해 DB와 계정을 생성하도록 했습니다. |
| 핵심 caller/callee 또는 configuration consumer | `srcs/requirements/mariadb/tools/docker-entrypoint.sh`의 `secret input / identifier validation`; `srcs/requirements/mariadb/tools/docker-entrypoint.sh`의 `first-run branch / temporary server`; `srcs/requirements/mariadb/tools/docker-entrypoint.sh`의 `hardening SQL / final exec` |
| state / ownership / lifecycle 변화 | first run에서는 entrypoint가 데이터 디렉터리와 temporary server를 관리합니다. 재시작에서는 system directory 존재를 근거로 bootstrap을 건너뛰고 기존 DB state를 권위자로 취급합니다. |
| 주요 failure branch | 임시 서버 start/readiness/SQL/shutdown 중 오류가 나면 entrypoint는 실패하지만, 데이터 디렉터리에 이미 쓰인 일부 상태가 남을 수 있습니다. 단순 system-directory 존재 검사는 이 partial state를 완료로 오인할 수 있습니다. |
| 이 commit의 보장 | 정상 종료된 첫 실행 뒤에는 hardened root account, application database/user/grant가 존재하고 같은 volume 재사용 시 중복 생성하지 않습니다. |
| 한계와 다음 관련 commit | SIGKILL 등 cleanup trap을 실행하지 못하는 중단 뒤의 수렴, completion marker, staging publication은 보장하지 않습니다. `dc9601f5e670`이 partial persistent state 문제를 staging directory와 verified marker로 교정합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: SIGKILL 등 cleanup trap을 실행하지 못하는 중단 뒤의 수렴, completion marker, staging publication은 보장하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `dc9601f5e670`이 partial persistent state 문제를 staging directory와 verified marker로 교정합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: 정상 종료된 첫 실행 뒤에는 hardened root account, application database/user/grant가 존재하고 같은 volume 재사용 시 중복 생성하지 않습니다.

### 3. `d764d066167b` — feat(wordpress): 사이트와 사용자 계정 초기화

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `BOOTSTRAP`, `PERSISTENCE`, `CORE` |
| Source-defined role | Added WordPress filesystem, site, and user convergence. |
| 이전 Thread commit | `e13b0357a21b` |
| 다음 Thread commit | `99c03f54399a` |

#### 원문이 확정한 범위

- **Summary:** Adds idempotent WordPress core, configuration, site, and user initialization.
- **Classification reason:** It introduces the application half of persistent first-run convergence and separates filesystem, database, and account idempotency boundaries, although later commits make the process interruption-safe.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `d764d066167b`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `srcs/requirements/wordpress/tools/docker-entrypoint.sh`의 `password/metadata validation`에서 WordPress 초기화 입력의 실패를 PHP-FPM start 전에 차단합니다.
- `srcs/requirements/wordpress/tools/docker-entrypoint.sh`의 `DB wait / core-config-site-user branches`에서 파일 존재, config 존재, DB의 site 설치, user 존재를 하나의 조건으로 뭉개지 않습니다.
- `srcs/requirements/wordpress/tools/docker-entrypoint.sh`의 `URL update / chown / exec php-fpm`에서 entrypoint 완료 뒤 장기 실행 책임이 PHP-FPM으로 넘어갑니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| d764d066167b | srcs/requirements/wordpress/tools/docker-entrypoint.sh | password/metadata validation | DB, admin, author password의 직접 값과 `_FILE` 입력을 해석하고 URL, title, email, user name 등 필수 metadata를 검증합니다. | WordPress 초기화 입력의 실패를 PHP-FPM start 전에 차단합니다. |
| d764d066167b | srcs/requirements/wordpress/tools/docker-entrypoint.sh | DB wait / core-config-site-user branches | MariaDB 인증이 될 때까지 bounded retry한 뒤 core files, `wp-config.php`, site 설치, author 존재 여부를 각각 별도 query로 판단하고 필요한 단계만 실행합니다. | 파일 존재, config 존재, DB의 site 설치, user 존재를 하나의 조건으로 뭉개지 않습니다. |
| d764d066167b | srcs/requirements/wordpress/tools/docker-entrypoint.sh | URL update / chown / exec php-fpm | canonical HTTPS home/site URL을 맞추고 ownership을 정규화한 뒤 PHP-FPM을 foreground로 `exec`합니다. | entrypoint 완료 뒤 장기 실행 책임이 PHP-FPM으로 넘어갑니다. |

#### 비교 기준

- exact commit diff: `git diff d764d066167b^ d764d066167b -- <path>`
- 이전 Thread 상태와 비교: `git diff e13b0357a21b d764d066167b -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | MariaDB 계정은 생겼지만 WordPress core, private config, site rows, admin/author 계정이 존재하지 않았습니다. |
| 선택한 boundary / decision | filesystem, configuration, site, user를 서로 다른 idempotency 조건으로 검사하고 누락된 항목만 생성하는 application bootstrap을 도입했습니다. |
| 핵심 caller/callee 또는 configuration consumer | `srcs/requirements/wordpress/tools/docker-entrypoint.sh`의 `password/metadata validation`; `srcs/requirements/wordpress/tools/docker-entrypoint.sh`의 `DB wait / core-config-site-user branches`; `srcs/requirements/wordpress/tools/docker-entrypoint.sh`의 `URL update / chown / exec php-fpm` |
| state / ownership / lifecycle 변화 | WordPress entrypoint가 writable web tree와 DB application state를 생성합니다. PHP-FPM은 초기화가 끝난 뒤 serving만 담당합니다. |
| 주요 failure branch | DB wait timeout, WP-CLI 실패, 중간 파일 생성 뒤 종료가 발생하면 일부 filesystem/DB state가 남습니다. 각 단계의 존재 검사는 정상 완료를 완전히 증명하지 않습니다. |
| 이 commit의 보장 | 정상 첫 실행 뒤 core/config/site/admin/author가 준비되고 재시작은 이미 존재하는 항목을 재생성하지 않습니다. |
| 한계와 다음 관련 commit | 중단 시점별 durable completion, config 분리 volume, secret-free long-running service는 아직 보장하지 않습니다. `99c03f54399a`가 이 PHP-FPM에 외부 HTTPS 요청을 연결하고, `dc9601f5e670`이 bootstrap lifecycle을 one-off convergence로 바꿉니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: 중단 시점별 durable completion, config 분리 volume, secret-free long-running service는 아직 보장하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `99c03f54399a`가 이 PHP-FPM에 외부 HTTPS 요청을 연결하고, `dc9601f5e670`이 bootstrap lifecycle을 one-off convergence로 바꿉니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: 정상 첫 실행 뒤 core/config/site/admin/author가 준비되고 재시작은 이미 존재하는 항목을 재생성하지 않습니다.

### 4. `99c03f54399a` — feat(nginx): PHP 요청을 WordPress로 전달

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `STACK`, `INTEGRATION`, `CORE` |
| Source-defined role | Defined the HTTPS-to-FastCGI request boundary. |
| 이전 Thread commit | `d764d066167b` |
| 다음 Thread commit | `a8b9f693c614` |

#### 원문이 확정한 범위

- **Summary:** Adds TLS policy, static delivery, WordPress front-controller routing, FastCGI forwarding, and a health endpoint.
- **Classification reason:** This defines the actual external request path and the Nginx-to-PHP responsibility boundary, making it significant to understanding how the stack serves WordPress.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `99c03f54399a`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `srcs/requirements/nginx/conf/nginx.conf`의 `server / listen / ssl_protocols`에서 외부 transport와 TLS termination을 Nginx가 독점합니다.
- `srcs/requirements/nginx/conf/nginx.conf`의 `root / try_files / location ~ \.php$`에서 Nginx는 PHP를 실행하지 않고 service DNS를 통해 PHP-FPM에 요청을 넘깁니다.
- `srcs/requirements/nginx/conf/nginx.conf`의 `/healthz / nginx foreground`에서 transport process의 liveness를 독립적으로 검사할 수 있습니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 99c03f54399a | srcs/requirements/nginx/conf/nginx.conf | server / listen / ssl_protocols | IPv4·IPv6 HTTPS listener와 TLS 1.2/1.3, certificate/key path를 정의합니다. | 외부 transport와 TLS termination을 Nginx가 독점합니다. |
| 99c03f54399a | srcs/requirements/nginx/conf/nginx.conf | root / try_files / location ~ \.php$ | shared WordPress document root에서 static file을 찾고, 없으면 front controller로 보내며 PHP request는 `wordpress:9000` FastCGI로 전달합니다. | Nginx는 PHP를 실행하지 않고 service DNS를 통해 PHP-FPM에 요청을 넘깁니다. |
| 99c03f54399a | srcs/requirements/nginx/conf/nginx.conf | /healthz / nginx foreground | application과 분리된 간단한 health endpoint가 있고 Nginx는 daemon-off foreground로 실행됩니다. | transport process의 liveness를 독립적으로 검사할 수 있습니다. |

#### 비교 기준

- exact commit diff: `git diff 99c03f54399a^ 99c03f54399a -- <path>`
- 이전 Thread 상태와 비교: `git diff d764d066167b 99c03f54399a -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | WordPress는 PHP-FPM으로 실행 가능했지만 host-facing TLS listener와 static/front-controller/FastCGI routing이 없었습니다. |
| 선택한 boundary / decision | Nginx가 HTTPS·static delivery·routing만 소유하고, PHP execution은 `wordpress:9000`에 위임하도록 경계를 고정했습니다. |
| 핵심 caller/callee 또는 configuration consumer | `srcs/requirements/nginx/conf/nginx.conf`의 `server / listen / ssl_protocols`; `srcs/requirements/nginx/conf/nginx.conf`의 `root / try_files / location ~ \.php$`; `srcs/requirements/nginx/conf/nginx.conf`의 `/healthz / nginx foreground` |
| state / ownership / lifecycle 변화 | certificate와 listener는 Nginx image/runtime가 소유합니다. WordPress web files는 공유 경로에서 읽히지만 application write responsibility는 WordPress에 남습니다. |
| 주요 failure branch | FastCGI service가 준비되지 않았거나 파일 path가 일치하지 않으면 5xx가 발생합니다. 이 SHA 자체는 startup dependency나 shared volume을 아직 결합하지 않습니다. |
| 이 commit의 보장 | 외부 HTTPS request가 static 또는 WordPress front controller로 분기되고 PHP는 별도 service에서 실행된다는 책임 분리를 보장합니다. |
| 한계와 다음 관련 commit | Compose DNS, mounted shared files, health-gated startup, persistent DB/data는 보장하지 않습니다. `a8b9f693c614`이 세 서비스를 하나의 topology로 묶고 `75590dedfb3a`가 mount와 health gate를 완성합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: Compose DNS, mounted shared files, health-gated startup, persistent DB/data는 보장하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `a8b9f693c614`이 세 서비스를 하나의 topology로 묶고 `75590dedfb3a`가 mount와 health gate를 완성합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: 외부 HTTPS request가 static 또는 WordPress front controller로 분기되고 PHP는 별도 service에서 실행된다는 책임 분리를 보장합니다.

### 5. `a8b9f693c614` — feat(compose): 세 서비스 토폴로지 구성

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **S** |
| Tags | `ARCH`, `STACK`, `CORE` |
| Source-defined role | Assembled the three service responsibilities into the core Compose topology. |
| 이전 Thread commit | `99c03f54399a` |
| 다음 Thread commit | `75590dedfb3a` |

#### 원문이 확정한 범위

- **Summary:** Introduces the three custom services, shared network, sole HTTPS publication, and named persistent resources in Compose.
- **Classification reason:** This is the foundational system topology. Removing it would leave a major gap in explaining the separation of transport, application execution, and durable state.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `a8b9f693c614`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `srcs/docker-compose.yml`의 `services: nginx, wordpress, mariadb`에서 개별 이미지를 하나의 project namespace와 network 안에 배치합니다.
- `srcs/docker-compose.yml`의 `network / volumes declarations`에서 영속 자원 이름의 소유자가 Compose project로 이동합니다.
- `srcs/docker-compose.yml`의 `initial topology limitation`에서 토폴로지의 존재와 operational readiness를 소급해 같은 것으로 취급하면 안 됩니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| a8b9f693c614 | srcs/docker-compose.yml | services: nginx, wordpress, mariadb | 세 custom build context와 service DNS, restart policy, Nginx host port, service dependency를 한 Compose model에 선언합니다. | 개별 이미지를 하나의 project namespace와 network 안에 배치합니다. |
| a8b9f693c614 | srcs/docker-compose.yml | network / volumes declarations | 공유 network와 MariaDB·WordPress용 named volume 이름을 선언합니다. | 영속 자원 이름의 소유자가 Compose project로 이동합니다. |
| a8b9f693c614 | srcs/docker-compose.yml | initial topology limitation | 이 commit에서는 volume 이름을 선언했지만 이후 commit에서 추가되는 실제 mount/environment/health 연결은 아직 없습니다. | 토폴로지의 존재와 operational readiness를 소급해 같은 것으로 취급하면 안 됩니다. |

#### 비교 기준

- exact commit diff: `git diff a8b9f693c614^ a8b9f693c614 -- <path>`
- 이전 Thread 상태와 비교: `git diff 99c03f54399a a8b9f693c614 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### S-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 이 commit 직전 상태 | 세 이미지와 설정은 존재했지만 build/run/network/port/resource naming을 한 번에 소유하는 system-level model이 없었습니다. |
| 해결하려던 문제 | 서비스가 생성되는 순서는 표현할 수 있지만 실제 데이터 mount와 health-based readiness가 없어 “연결됐다”가 “준비됐다”를 뜻하지 않습니다. |
| 기존 설계가 충분하지 않았던 이유 | 세 이미지와 설정은 존재했지만 build/run/network/port/resource naming을 한 번에 소유하는 system-level model이 없었습니다. 서비스가 생성되는 순서는 표현할 수 있지만 실제 데이터 mount와 health-based readiness가 없어 “연결됐다”가 “준비됐다”를 뜻하지 않습니다. |
| 핵심 결정 | Compose가 Nginx, WordPress, MariaDB의 build context, service DNS, restart, dependency, host port, resource namespace를 통합하도록 했습니다. |
| 주요 caller → callee / producer → consumer | `srcs/docker-compose.yml`의 `services: nginx, wordpress, mariadb`; `srcs/docker-compose.yml`의 `network / volumes declarations`; `srcs/docker-compose.yml`의 `initial topology limitation` |
| authoritative state와 publication boundary | Nginx는 host-facing service, WordPress는 application service, MariaDB는 DB service로 배치됩니다. Compose project가 container/network/volume naming을 소유합니다. 세 서비스의 책임과 호출 방향을 하나의 배포 topology로 고정하고 Nginx만 host port를 갖는 핵심 architecture를 도입합니다. |
| ownership / lifetime / responsibility 변화 | Nginx는 host-facing service, WordPress는 application service, MariaDB는 DB service로 배치됩니다. Compose project가 container/network/volume naming을 소유합니다. |
| failure scenario와 recovery path | 서비스가 생성되는 순서는 표현할 수 있지만 실제 데이터 mount와 health-based readiness가 없어 “연결됐다”가 “준비됐다”를 뜻하지 않습니다. |
| 이 commit이 보장하는 것 | 세 서비스의 책임과 호출 방향을 하나의 배포 topology로 고정하고 Nginx만 host port를 갖는 핵심 architecture를 도입합니다. |
| 아직 보장하지 않는 것 | 이 SHA만으로 persistent mount, application environment, health gate, restart 뒤 데이터 보존을 보장하지 않습니다. |
| 후속 fix / test와 연결 | `75590dedfb3a`가 선언된 named volume을 실제 경로에 mount하고 service-specific health를 dependency 조건으로 연결합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: 이 SHA만으로 persistent mount, application environment, health gate, restart 뒤 데이터 보존을 보장하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `75590dedfb3a`가 선언된 named volume을 실제 경로에 mount하고 service-specific health를 dependency 조건으로 연결합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: 세 서비스의 책임과 호출 방향을 하나의 배포 topology로 고정하고 Nginx만 host port를 갖는 핵심 architecture를 도입합니다.

### 6. `75590dedfb3a` — feat(compose): 준비 상태에 따라 영속 서비스 연결

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `PERSISTENCE`, `INTEGRATION`, `OPERATIONS` |
| Source-defined role | Connected named volumes, health checks, and dependency readiness. |
| 이전 Thread commit | `a8b9f693c614` |
| 다음 Thread commit | 없음 |

#### 원문이 확정한 범위

- **Summary:** Mounts durable data, adds service health checks, and gates startup on dependency health.
- **Classification reason:** It turns the service list into a stateful, readiness-aware stack and establishes important persistence and lifecycle integration across all three containers.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `75590dedfb3a`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `srcs/docker-compose.yml`의 `volumes mounts`에서 container filesystem이 아니라 named volume이 authoritative state가 됩니다.
- `srcs/docker-compose.yml`의 `healthcheck blocks`에서 단순 container-created 상태와 process/application readiness를 구분합니다.
- `srcs/docker-compose.yml`의 `depends_on.condition: service_healthy`에서 request path의 consumer가 producer 준비 전에 시작되는 race를 줄입니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 75590dedfb3a | srcs/docker-compose.yml | volumes mounts | MariaDB data directory, WordPress writable web tree를 named volume에 mount하고 Nginx는 WordPress document를 읽는 쪽으로 연결합니다. | container filesystem이 아니라 named volume이 authoritative state가 됩니다. |
| 75590dedfb3a | srcs/docker-compose.yml | healthcheck blocks | MariaDB, WordPress/PHP-FPM, Nginx에 각 service-specific command와 interval/retry/start-period를 설정합니다. | 단순 container-created 상태와 process/application readiness를 구분합니다. |
| 75590dedfb3a | srcs/docker-compose.yml | depends_on.condition: service_healthy | WordPress는 healthy MariaDB 뒤에, Nginx는 healthy WordPress 뒤에 시작하도록 gate를 둡니다. | request path의 consumer가 producer 준비 전에 시작되는 race를 줄입니다. |

#### 비교 기준

- exact commit diff: `git diff 75590dedfb3a^ 75590dedfb3a -- <path>`
- 이전 Thread 상태와 비교: `git diff a8b9f693c614 75590dedfb3a -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | `a8b9f693c614`은 topology와 resource names만 만들었고 실제 state mount와 readiness semantics가 불완전했습니다. |
| 선택한 boundary / decision | named volume mount와 health-gated dependency를 추가해 topology를 stateful application system으로 바꿨습니다. |
| 핵심 caller/callee 또는 configuration consumer | `srcs/docker-compose.yml`의 `volumes mounts`; `srcs/docker-compose.yml`의 `healthcheck blocks`; `srcs/docker-compose.yml`의 `depends_on.condition: service_healthy` |
| state / ownership / lifecycle 변화 | MariaDB volume은 relational state, WordPress volume은 application files를 소유합니다. 컨테이너는 교체 가능하고 health command가 다음 service start 허용 여부를 결정합니다. |
| 주요 failure branch | health command가 현재 process에 응답한다는 것은 first-run initialization이 interruption-safe하다는 뜻이 아닙니다. 당시 health는 후속 completion marker 수준까지 강하지 않습니다. |
| 이 commit의 보장 | 서비스별 state가 named volume에 남고, dependency는 container creation이 아니라 health success를 기다립니다. |
| 한계와 다음 관련 commit | abrupt bootstrap interruption 수렴, volume identity의 실제 유지, end-to-end data path는 후속 tests 없이는 증명하지 않습니다. `fb1a689cf969`이 restart/recreate 뒤 volume identity와 값 보존을 검증하고 `dc9601f5e670`이 health에 durable marker를 결합합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: abrupt bootstrap interruption 수렴, volume identity의 실제 유지, end-to-end data path는 후속 tests 없이는 증명하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `fb1a689cf969`이 restart/recreate 뒤 volume identity와 값 보존을 검증하고 `dc9601f5e670`이 health에 durable marker를 결합합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: 서비스별 state가 named volume에 남고, dependency는 container creation이 아니라 health success를 기다립니다.

## Invariant ledger

| Source에서 연결된 invariant | 처음/초기 단계 | 강화·교정 단계 | 검증 단계 | 학습자가 확인한 실제 근거 |
| --- | --- | --- | --- | --- |
| 호스트 포트를 게시하는 서비스는 Nginx뿐입니다. | a8b9f693c614 | 75590dedfb3a | 8c9b5b9adef2 | Compose의 `ports`는 Nginx service에만 있고 runtime e2e는 해당 HTTPS endpoint를 사용합니다. |
| MariaDB 영속 상태는 이미지 계층이 아니라 mounted data volume이 권위자입니다. | f8ec9621725c | a8b9f693c614, 75590dedfb3a | fb1a689cf969 | Dockerfile은 빈 data path만 준비하고 Compose가 named volume을 mount하며 persistence scenario가 동일 volume ID와 row를 재검사합니다. |
| WordPress는 애플리케이션 상태를 쓸 수 있고 Nginx는 공유 문서를 읽는 경계에 놓입니다. | d764d066167b | 75590dedfb3a | 8c9b5b9adef2, fb1a689cf969 | WordPress entrypoint가 files/site/users를 만들고 Nginx는 동일 document root에서 static/FastCGI routing만 수행합니다. |
| 준비 상태는 단순 container creation이 아니라 service-specific health로 판단합니다. | 75590dedfb3a | dc9601f5e670에서 marker까지 강화 | 2bf6d3f11337 | Compose healthchecks와 `condition: service_healthy`, 이후 marker+process probe가 start gate를 구성합니다. |

### Ledger 보완 기록

- source에 명시되지 않은 새 invariant를 확정 사실로 추가하지 않습니다.
- invariant가 실제로 부족했음을 드러낸 commit 또는 failure stage: `a8b9f693c614` 전에는 서비스별 이미지가 있었지만 host-facing service, shared network, named-volume mount가 하나의 시스템으로 결합되지 않았고, `75590dedfb3a` 전에는 container creation과 service readiness가 구분되지 않았습니다.
- marker, rename, lock, health, authentication, cleanup 등 invariant를 고정하는 concrete mechanism: Compose의 sole port publication, service DNS, read/write mount mode, service-specific health check와 `service_healthy` dependency가 invariant를 관측 가능한 설정으로 고정합니다.
- 후속 commit이 invariant를 약화하지 못하게 하는 regression evidence: `8c9b5b9adef2`의 전체 request/data path와 `fb1a689cf969`의 restart/recreate persistence가 후속 회귀를 검출합니다.
## Failure → Fix → Test 연결

| failure / 위험 | fix 또는 mechanism | test / evidence | 학습자 연결 기록 |
| --- | --- | --- | --- |
| 개별 컨테이너만 존재하고 시스템 경계가 없음 | a8b9f693c614가 세 service topology와 유일한 host-facing Nginx를 확정 | 8c9b5b9adef2가 HTTPS→WordPress→MariaDB data path를 검증 | root cause는 buildable image와 integrated system을 같은 것으로 본 데 있습니다. |
| entrypoint의 existence check가 abrupt interruption 뒤 partial state를 완료로 오인 | dc9601f5e670가 staging, verified marker, one-off bootstrap으로 교정 | 2bf6d3f11337가 durable stage마다 SIGKILL 후 재실행 수렴을 검증 | graceful cleanup에 의존하지 않고 durable publication order로 완료를 판정합니다. |
| 컨테이너 생성 순서를 readiness로 오인 | 75590dedfb3a가 service health gate를 추가 | 후속 runtime harness가 live health와 integrated request path를 검사 | dependency는 process/application probe가 성공해야 해제됩니다. |

### 직접 재구성할 chain

```text
기존 가정: 개별 container가 존재하면 stack이 구성됐다고 볼 수 있다는 가정
  → 실제 failure 또는 위험: host publication, service routing, durable mount, readiness dependency가 분리되어 system-level 보장이 없었습니다.
  → root cause: 개별 Dockerfile과 entrypoint는 다른 서비스의 network·volume·startup state를 소유하지 않습니다.
  → 수정된 invariant / decision: Nginx만 host-facing transport를 소유하고 WordPress와 MariaDB는 service DNS와 named volume으로 연결되며 dependency는 health를 기준으로 합니다.
  → 해당 SHA의 실제 수정 코드: `a8b9f693c614`의 Compose topology와 `75590dedfb3a`의 volume/health/dependency blocks
  → failure injection 또는 regression test: `8c9b5b9adef2`, `fb1a689cf969` runtime scenarios
  → 증명된 보장 / 남은 비보장: HTTPS→FastCGI→WordPress→MariaDB 통합 경로와 container 교체 뒤 volume state 보존은 검증하지만 abrupt bootstrap convergence는 Thread 2가 보강합니다.
```

## Ownership / state / responsibility 변화

| 대상 | 이전 상태 | 이후 책임/authoritative state | 확인할 근거 | 학습자 결론 |
| --- | --- | --- | --- | --- |
| Nginx | 독립 이미지/프로세스 | 유일한 host-facing TLS 및 static/FastCGI routing 책임 | 99c03f54399a 설정과 a8b9f693c614/75590dedfb3a Compose port | PHP 실행이나 DB state를 소유하지 않습니다. |
| WordPress | 독립 PHP-FPM 이미지와 초기 entrypoint | application execution과 writable application state | d764d066167b entrypoint, PHP-FPM pool, WordPress volume | site/files/users를 쓰고 FastCGI request를 처리합니다. |
| MariaDB | 독립 DB image | 관계형 durable state와 DB/account 소유 | e13b0357a21b bootstrap, 75590dedfb3a data mount | application query에 필요한 DB와 grant를 유지합니다. |
| Compose | 서비스별 수동 실행 | network, service DNS, port, volume namespace, health dependency 통합 소유 | a8b9f693c614 및 75590dedfb3a의 `docker-compose.yml` | 컨테이너 교체와 resource naming을 project 단위로 관리합니다. |

## Thread 최종 상태

- **Source-confirmed endpoint:** The thread progresses from individually runnable containers to one stateful application system. The decisive step is not the existence of three images but the Compose responsibility boundary: Nginx owns external transport, WordPress owns application execution, and MariaDB owns durable relational state. Health-gated dependencies and mounted volumes then make the topology operationally meaningful rather than merely connected.
- 최종 authoritative state와 owner: MariaDB named volume이 relational state, WordPress named volume이 application files를 소유하며 Nginx는 state owner가 아닙니다.
- 정상 실행의 entry point와 완료 조건: Compose 또는 후속 `start_stack.py`가 서비스를 시작하고, MariaDB→WordPress→Nginx health gate가 모두 성공하면 정상 완료입니다.
- failure 또는 interruption 뒤 retry/rollback/compensation 조건: 이 Thread의 초기 entrypoint만으로는 abrupt interruption 수렴이 충분하지 않으며 Thread 2의 marker/staging bootstrap이 재시도 조건을 정의합니다.
- 이 Thread가 다른 Thread에 제공하는 전제: Thread 2의 bootstrap, Thread 3의 runtime/persistence test, Thread 4~6의 management transaction이 사용할 기본 topology와 state ownership을 제공합니다.
- 이 Thread 단독으로는 증명하지 않는 것: 백업의 atomicity, restore rollback, credential compensation, supply-chain identity는 이 Thread만으로 증명하지 않습니다.

## 최종 architecture 또는 execution flow 정리

| 단계 | 확인할 흐름 | 실제 코드 근거 | 정상 전이 | 실패·정리·재시도 |
| --- | --- | --- | --- | --- |
| 1 | 호스트 HTTPS 요청 | 99c03f54399a `nginx.conf` listener | Nginx가 TLS를 종료하고 server block을 선택합니다. | listener/certificate 오류면 Nginx health가 실패하고 downstream request가 열리지 않습니다. |
| 2 | static/front controller 분기 | 99c03f54399a `try_files` | 실제 file은 static으로, 나머지는 `index.php`로 이동합니다. | 잘못된 root/path는 404 또는 FastCGI 오류로 드러납니다. |
| 3 | FastCGI 전달 | 99c03f54399a `fastcgi_pass wordpress:9000` | service DNS가 WordPress PHP-FPM에 request를 전달합니다. | WordPress health가 실패하면 75590dedfb3a의 gate가 Nginx start를 막습니다. |
| 4 | WordPress DB 접근 | d764d066167b config 생성과 MariaDB service name | application credential로 MariaDB service에 연결합니다. | DB auth/readiness failure는 bounded wait 또는 WP-CLI failure로 종료합니다. |
| 5 | 상태 저장 | 75590dedfb3a volume mounts | DB rows와 WordPress files가 named volume에 남습니다. | 컨테이너 교체는 volume을 제거하지 않는 한 state owner를 바꾸지 않습니다. |
| 6 | readiness gate | 75590dedfb3a healthcheck/depends_on | 각 producer health가 성공해야 다음 consumer가 시작됩니다. | timeout/retry 소진은 startup failure이며 후속 bootstrap design이 partial state를 판정합니다. |

### 학습자의 최종 설명

> 이미지 세 개를 만든 것만으로 계층형 시스템은 완성되지 않았습니다. MariaDB image가 durable DB 경로를 준비하고 first-run account를 만들며, WordPress가 filesystem·site·users를 수렴시키고, Nginx가 TLS와 FastCGI routing만 맡은 뒤에야 책임이 나뉩니다. `a8b9f693c614`은 이 책임을 하나의 Compose namespace에 모았지만 mount와 readiness는 부족했습니다. `75590dedfb3a`에서 named volume과 service-specific health gate가 추가되어 컨테이너 교체 가능한 실행 단위와 권위 있는 persistent state가 분리됐습니다. 다만 초기 entrypoint는 abrupt interruption 뒤 partial state를 완전하게 판정하지 못하므로, Thread 2의 staged one-off bootstrap이 이 architecture의 실제 재시도 안전성을 완성합니다.

## 학습 완료 자가 점검

- [x] 세 이미지의 존재와 세 계층 architecture의 성립을 같은 것으로 설명하지 않았습니까?
- [x] Nginx가 PHP를 실행한다고 잘못 설명하지 않았습니까?
- [x] WordPress data volume과 MariaDB data volume의 상태 종류를 구분했습니까?
- [x] 초기 health check가 completion marker까지 포함한다고 소급해서 쓰지 않았습니까?
- [x] 모든 code snippet에 SHA와 path/symbol을 기록했습니다.
- [x] final HEAD의 field/helper/test를 이전 SHA에 소급하지 않았습니다.
- [x] source가 확정하지 않은 사실을 추정으로 채우지 않았습니다.
- [x] test가 증명하는 것과 증명하지 않는 것을 구분했습니다.
- [x] 이 Thread를 commit 순서대로 구두 설명할 수 있습니다.
