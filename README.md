# container-stack

`container-stack`은 Docker Compose로 nginx, WordPress PHP-FPM, MariaDB를
한 Docker 호스트에서 실행하는 학습용 웹 스택이다. 세 이미지를 직접 빌드하고,
처음 설치할 때의 상태 생성부터 재시작, 백업·복원, 자격증명 교체와 장애 자료
수집까지 같은 저장소의 명령으로 관리한다.

이 README는 현재 사용법과 운영 범위만 설명한다. 처음 Docker를 접한다면 다음
순서로 읽는다.

1. [실행 경계와 요청 경로](architecture/runtime-boundaries-and-request-path.md)
2. [초기화·준비 상태·실패](architecture/bootstrap-readiness-and-failure.md)
3. [영속 상태와 복구](architecture/persistent-state-and-recovery.md)
4. [구현이 형성된 순서](devlog/README.md)


## 실행 구조

```text
브라우저 또는 HTTPS client
        │  host 127.0.0.1:${HTTPS_PORT}
        ▼
Docker daemon의 published port
        │  container 443 / TLS
        ▼
nginx ── frontend ── WordPress PHP-FPM
                            │
                         backend
                            │
                         MariaDB
```

- Compose CLI는 호스트에서 Docker daemon에 이미지, 컨테이너, network와 volume
  작업을 요청한다. Compose `service`는 실행 선언이고 container는 daemon이 그
  선언으로 만든 실행 객체다.
- nginx만 호스트 포트를 게시한다. 기본값은 `127.0.0.1:443`이므로 같은 호스트의
  loopback client에서만 바로 접근할 수 있다.
- nginx는 TLS를 끝내고 정적 파일을 직접 제공하거나 `wordpress:9000`에 FastCGI
  record를 보낸다. 현재 설정에는 HTTP `proxy_pass`가 없으므로 nginx를 일반적인
  HTTP reverse proxy라고 부르지 않는다.
- WordPress는 `mariadb:3306`에 MariaDB protocol로 연결한다. nginx 이후의
  FastCGI와 MariaDB TCP에는 별도 TLS가 없다.
- `backend`는 Docker의 internal network지만 애플리케이션 인증 경계나 Docker
  daemon 관리 권한을 대신하지 않는다.

자세한 프로세스·network·protocol 경계는
[실행 경계 문서](architecture/runtime-boundaries-and-request-path.md)에 있다.

## 준비

필요한 도구는 Docker Engine, Docker Compose v2, Python 3.10 이상, `make`,
`curl`이다. 현재 관리 도구는 Compose의 `up --wait`, `--wait-timeout`,
`config --format json`, `config --no-interpolate`를 사용한다. 첫 build 때는
Debian snapshot과 WordPress·WP-CLI 배포 서버에 접근한다.

환경 파일과 secrets는 Git에 넣지 않는다.

```sh
cp .env.example .env
umask 077
install -d -m 0700 secrets
printf 'replace-root-password-01\n' > secrets/db_root_password.txt
printf 'replace-database-password-01\n' > secrets/db_password.txt
printf 'replace-admin-password-01\n' > secrets/wp_admin_password.txt
printf 'replace-author-password-01\n' > secrets/wp_user_password.txt
chmod 600 secrets/*.txt
```

네 값은 계정 사이에서 재사용하지 않도록 서로 다르게 준비한다. 관리 도구가
강제하는 값 형식은 허용 문자로 된 24~128자의 한 줄이다. start·backup·restore와
diagnostics가 공유하는 reader는 secret parent directory가 현재 사용자 소유이고
group/other 접근 bit가 없는지도 확인한다(`0700`으로 준비하는 것이 기본이다).
rotation은 current file의 owner·`0600`·단일-link regular-file 조건과 nofollow를
확인하고 replacement directory에는 별도의 private-directory 검사를 적용한다.
모든 reader가 secret file 자체의 symlink는 거부하며, 시작 경로는 중복
canonical path도 거부한다. rotation의 current secret reader는 parent path
component의 symlink까지 별도로 검사하지 않는다.

`.env`의 `DOMAIN_NAME`, `WORDPRESS_URL`, `HTTPS_PORT`는 같은 공개 주소를
가리켜야 한다. `srcs/docker-compose.yml`을 기준으로 secret 기본 경로
`../secrets/*.txt`는 저장소 루트의 `secrets/`를 가리킨다.

## 빌드와 시작

`make up`은 image를 자동으로 build하지 않는다. 처음에는 다음 순서로 실행한다.

```sh
make build
make up
make ps
```

`make up`은 `tools/start_stack.py`를 통해 같은 project의 operation lock을
잡고 다음 순서로 진행한다.

1. rendered Compose model에서 secret file 경로를 얻어 호스트에서 검증한다.
2. one-off MariaDB container에 필요한 값을 stdin으로 보내 bootstrap한다.
3. MariaDB runtime container를 시작하고 health를 기다린다.
4. 기존 nginx와 WordPress를 멈춘 뒤 one-off WordPress container를 실행한다.
5. WordPress와 nginx runtime container를 시작하고 health를 기다린다.

`make start-database`와 `make start-application`으로 두 구간을 나눠 실행할 수
있다. 이미 MariaDB container가 실행 중이면 database 단계는 bootstrap과
credential 재검증을 생략한다.

중간 실패에 대한 전역 rollback은 없다. MariaDB만 실행되거나 nginx와 WordPress가
멈춰 있거나 일부 container가 unhealthy인 상태가 남을 수 있다. `make ps`와 아래
로그로 현재 상태를 확인한 뒤 다시 실행한다.

```sh
make logs
```

재실행은 이전 작업을 역순으로 되감는 보상 transaction이 아니다. volume의 현재
상태를 다시 판별해 목표 상태로 수렴시키는 새 시도다. 준비된 volume에서 직접
`docker compose up`이 실행될 수는 있지만 lock, secret 검증과 core/config
reconciliation을 우회하므로 지원되는 관리 경로가 아니다. 빈 volume에서는
bootstrap 입력이 없어 실패한다.

## 상태 확인과 종료

기본 상태 URL은 `https://localhost/healthz`다. nginx가 runtime에 만든 자체 서명
인증서를 사용하므로 개발용 smoke는 인증서 신뢰 검사를 생략한다.

```sh
make smoke
SMOKE_URL=https://example.test/healthz make smoke
```

`make smoke`는 HTTPS status 성공을 확인하지만 응답 body가 정확히 `ok`인지까지
검사하지 않는다. 실제 WordPress 쓰기·읽기와 MariaDB 저장값은 e2e 시나리오의
범위다. 각 healthcheck가 증명하는 범위는
[초기화·준비 상태 문서](architecture/bootstrap-readiness-and-failure.md)에
정리돼 있다.

container와 network만 내리고 named volume과 image를 보존한다.

```sh
make down
```

volume까지 삭제하려면 project 이름을 다시 입력해야 한다.

```sh
make fclean DESTROY_CONFIRM=container-stack
```

이 명령은 WordPress와 MariaDB의 영속 데이터를 삭제한다. `PROJECT_NAME`을
바꿨다면 `DESTROY_CONFIRM`에도 같은 값을 사용한다. Compose가 local image로
분류하지 않는 명시적 custom tag는 `--rmi local` 뒤에도 남을 수 있다.

## 상태가 저장되는 위치

| 상태 | 소유 위치 | container 재생성 뒤 |
| --- | --- | --- |
| MariaDB data와 완료 marker | `mariadb_data` named volume | 유지 |
| WordPress core, content와 upload | `wordpress_data` named volume | 유지 |
| `wp-config.php` | `wordpress_config` named volume | 유지 |
| nginx self-signed certificate | nginx container writable layer | 새 container에서 재생성 |
| host secret source | `.env`가 가리키는 host file | Compose가 관리하지 않음 |
| bootstrap client option/temp file | one-off container의 `/run` | container 종료와 함께 제거 |

nginx에는 `wordpress_data`만 read-only로 mount한다. 웹 루트의
`wp-config.php` symlink 대상인 `wordpress_config`는 nginx에 mount하지 않는다.

장기 실행 container에는 host secret file mount, password environment variable,
password command-line argument가 없다. 그러나 credential 상태가 사라진다는 뜻은
아니다. WordPress DB application password는 `wordpress_config/wp-config.php`에
평문으로 남고, MariaDB와 WordPress database에는 인증 상태가 남는다. backup에도
이 상태가 포함된다.

## 백업과 복원

세 service가 모두 running일 때만 backup을 시작한다.

```sh
make backup BACKUP_DIR=/secure/backups/container-stack-20250104
```

같은 project의 start, backup, restore, credential rotation은 local operation
lock으로 직렬화된다. backup은 nginx와 WordPress를 멈춰 이 스택의 application
writer를 제거한 뒤 MariaDB `--single-transaction` dump와 WordPress data/config
archive를 stream으로 기록한다. `0600` 산출물과 SHA-256 manifest를 sibling
temporary directory에서 완성한 뒤 예약한 최종 경로에 게시한다.

이는 외부 DB writer가 없다는 조건에서만 database와 filesystem의 application
일관성을 제공한다. backup은 암호화, 예약 실행, 보존 기간, 원격 복제, nginx
인증서, image, host `.env`와 secret source를 포함하지 않는다.

restore는 container, volume, network가 없는 fresh project만 받는다.

```sh
make down PROJECT_NAME=container-stack ENV_FILE=.env
make restore \
  PROJECT_NAME=container-stack-restore \
  ENV_FILE=.env \
  BACKUP_DIR=/secure/backups/container-stack-20250104
```

manifest와 checksum은 파일이 manifest와 같다는 사실만 증명하며 backup 출처의
신뢰성을 증명하지 않는다. restore는 archive의 절대 경로, `..`, 중복 entry와
특수 파일을 거부한다. 오류나 처리 가능한 `SIGINT`·`SIGTERM` 뒤에는 새 project의
container, volume, network를 제거하려고 시도한다. `SIGKILL`, host 종료와 Docker
daemon 손실 뒤의 자동 정리는 보장하지 않는다.

대상 `MYSQL_DATABASE`, `MYSQL_USER`와 application secret은 복원된
`wp-config.php`와 맞아야 한다. 설정한 admin login은 복원된 database에 이미
존재하고 admin secret으로 인증돼야 하며, bootstrap은 없는 admin을 새로 만들거나
기존 role·email을 맞추지 않는다. 설정한 author가 없으면 대상 환경의
login·email·secret으로 새로 만들고, 이미 있으면 author secret으로 인증만
확인한다. MariaDB system database는 dump하지 않으므로 대상 root password는
snapshot과 달라도 된다. `WORDPRESS_URL`은 시작 과정에서 대상 환경 값으로
수렴한다.

## 자격증명 교체

새 secret 네 개를 현재 파일과 다른 private directory에 준비한다.

```sh
make rotate-secrets NEW_SECRETS_DIR=/secure/container-stack-next-secrets
```

도구는 현재 값이 성공하고 교체 값이 거부되는지 먼저 확인한 뒤 nginx를 멈춘다.
WordPress admin/author, `wp-config.php`, MariaDB application/root, host secret
file 순으로 바꾸고 세 runtime container를 force recreate한다. 작업 중에는 서로
다른 시점의 값이 섞인 상태가 존재하므로 전역 원자 transaction이 아니다.

실패하면 실제로 동작하는 root credential을 찾아 이전 상태로 보상하고 old
success/new rejection을 검증한다. `SIGINT`·`SIGTERM`은 보상 경로로 들어가지만
`SIGKILL`, host/daemon loss에는 durable journal이나 별도 old-value 사본이 없다.
강제 중단 뒤에는 기존 입력과 교체 입력을 기준으로 DB, `wp-config.php`,
WordPress 계정과 host file을 직접 대조해야 한다.

## 장애 자료

```sh
make diagnostics DIAGNOSTICS_DIR=diagnostics/incident-001
```

새 `0700` directory와 `0600` file에 Compose 상태, 최근 log와 resource 설정을
수집한다. 가릴 secret을 하나라도 읽지 못하면 일부 자료를 남기지 않고 전체
수집을 중단한다. allowlist와 redaction은 project 밖에서 log에 기록한 모든 민감
정보를 탐지한다는 보장이 아니므로 공유 전 사람이 다시 확인한다.

## 검증 명령

| 명령 | 확인하는 범위 |
| --- | --- |
| `make test` | source 정적 계약, 그리고 Compose v2가 설치된 경우 `.env.example` model parse |
| `make config-strict ENV_FILE=.env.example` | 설치된 Docker Compose가 model을 해석하는지 |
| `make smoke` | 실행 중인 nginx의 host HTTPS status |
| `make bootstrap-test` | 계측한 bootstrap 경계의 `SIGKILL` 뒤 수렴과 runtime secret source 부재 |
| `make e2e` | HTTPS WordPress 쓰기·읽기와 MariaDB 저장값 |
| `make persistence` | restart와 `down/up` 뒤 database·upload·volume identity |
| `make backup-restore-test` | backup/restore 정상·실패·signal·경로 방어와 fresh restore |
| `make rotation-test` | old/new credential 검증, 실패 보상과 재시도 |
| `make operations-test` | network, resource, log, stop, destructive command와 diagnostics |
| `make verify` | 정적 검사와 runtime 시나리오를 직렬 실행하고 잔여 자원을 회수 |

테스트가 관찰하는 범위와 관찰하지 않는 범위는
[CI·진단 기록](devlog/05-ci-diagnostics-and-cleanup.md)에 정리했다.

## 현재 범위

지원 범위는 한 사용자와 한 Docker daemon이 관리하는 단일 host project다.
operation lock도 같은 host, 같은 UID, 같은 project 안에서만 동작한다. `make
build`, `down`, `fclean`과 직접 Docker/Compose 명령은 이 lock에 참여하지 않는다.

다음 기능은 제공하지 않는다.

- public CA 인증서 발급·신뢰·갱신·영속 보관
- external secret manager와 무중단 이중 credential rotation
- encrypted, scheduled, retained, off-host backup
- MariaDB replication, point-in-time recovery와 multi-instance HA
- multi-host distributed lock, scheduler와 Kubernetes
- production ingress/load balancer와 browser application 동작
- 임의의 WordPress schema/data migration framework
