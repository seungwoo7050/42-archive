# 실행 경계와 HTTPS 요청 경로

이 문서는 현재 HEAD의 실행 구조를 설명한다. 구현이 도입된 순서는
[개발 기록](../devlog/README.md), 초기화와 부분 실패는
[초기화·준비 상태·실패](bootstrap-readiness-and-failure.md), 삭제와 복구는
[영속 상태와 복구](persistent-state-and-recovery.md)에 둔다.

프로세스와 파일 디스크립터의 일반 수명은 선행 저장소에서 다뤘다. 여기서 새로
생기는 질문은 “어떤 프로세스가 실행되는가”에 더해 “그 프로세스를 어느 Docker
객체와 daemon이 소유하며, 객체가 교체될 때 무엇이 남는가”이다.

## 호스트, CLI와 daemon

```text
host operating system
├── 사용자 shell
│   ├── make
│   ├── Python 관리 도구
│   └── docker compose CLI
└── Docker daemon
    ├── image
    ├── container
    ├── user-defined network
    ├── named volume
    └── published port
```

Compose CLI는 container runtime 자체가 아니다. 호스트에서 Compose file과 환경
입력을 해석해 Docker daemon API에 요청한다. daemon이 image layer, container
객체와 그 writable layer, network endpoint, named volume, port publishing을
만들고 제거한다. 따라서 다음 용어를 구분한다.

| 용어 | 현재 프로젝트에서의 뜻 |
| --- | --- |
| image | Dockerfile을 build해 만든 read-only filesystem layer와 실행 metadata |
| container | image에 writable layer, namespace, mount와 process를 결합한 실행 객체 |
| Compose service | container를 어떤 image·network·volume·명령으로 만들지 선언한 model |
| server | nginx, PHP-FPM, MariaDB처럼 container 안에서 실제로 요청을 받는 process |
| project | Compose label과 파생 자원 이름을 공유하는 관리 단위 |

service 이름은 유지돼도 `down/up`이나 force recreate 뒤에는 container ID,
writable layer와 network IP가 달라질 수 있다. 반대로 named volume은 container
객체와 별도이므로 명시적으로 삭제하기 전까지 남는다.

`localhost`도 관찰 위치에 따라 다르다.

- host의 `127.0.0.1`은 published HTTPS port를 가리킨다.
- nginx container의 `127.0.0.1`은 nginx 자신의 network namespace다.
- WordPress container의 `127.0.0.1:9000`은 같은 container의 PHP-FPM이다.
- 다른 service는 `localhost`가 아니라 Compose DNS 이름을 사용한다.

## Dockerfile이 image로 바꾸는 입력

각 service는 자신의 directory만 build context로 사용한다.

| service | build context | 주요 image 산출물 |
| --- | --- | --- |
| nginx | `srcs/requirements/nginx` | nginx, OpenSSL, 설정, entrypoint |
| wordpress | `srcs/requirements/wordpress` | PHP-FPM, WP-CLI, 검증된 WordPress core와 manifest |
| mariadb | `srcs/requirements/mariadb` | MariaDB server/client, 설정, entrypoint |

build context는 daemon/build backend에 전달돼 `COPY`가 읽을 수 있는 파일
집합이다. 루트 `.env`와 `secrets/`는 세 context 밖에 있으므로 Dockerfile의
`COPY` 대상이 될 수 없다. 각 `.dockerignore`는 해당 context 안에서 불필요한
파일을 더 제외한다. “container에 mount하지 않는다”와 “build 입력에 들어가지
않는다”는 별개의 경계이며 둘 다 확인해야 한다.

세 Dockerfile은 같은 Debian tag와 digest를 사용한다.

```dockerfile
FROM debian:bookworm-20260803-slim@sha256:abd67ffcfa541b485a3dff59865ab629aa048a6c613e639d36e7456b0b229241
```

tag는 사람이 읽는 release 이름이고 digest는 받은 base image byte identity를
고정한다. APT source는 `20260812T000000Z` snapshot을 가리킨다. package마다
`name=version`을 쓰는 방식은 아니며, 같은 snapshot에서 dependency를 다시
해석하는 방식이다. snapshot 보존과 repository 가용성까지 이 저장소가 통제하는
것은 아니다.

검토한 snapshot의 최소 보안 지원선은 다음과 같다. 이는 Dockerfile의
`name=version` exact pin이 아니라 선택한 snapshot에서 확인한 하한이다.

| 구성 요소 | 검토한 최소 버전 |
| --- | --- |
| nginx | `1.22.1-9+deb12u9` |
| OpenSSL | `3.0.20-1~deb12u2` |
| PHP | `8.2.33-1~deb12u1` |
| MariaDB | `1:10.11.18-0+deb12u1` |

WordPress image는 build 중 두 외부 배포 파일을 받는다.

- WP-CLI `2.11.0`
- WordPress `6.7.7`

각 URL의 version과 예상 SHA-256을 함께 고정하고 `sha256sum -c`가 성공한
byte만 image에 넣는다. WordPress core는 `/usr/src/wordpress`, core file
manifest는 `/usr/src/wordpress-core.sha256`에 남는다. runtime entrypoint는
인터넷에서 core를 내려받지 않고 이 image artifact를 volume에 복사한다.

Dockerfile의 각 `RUN`, `COPY`는 image filesystem 변화와 cache 경계를 만든다.
build가 끝난 뒤 삭제한 APT index와 download archive는 최종 filesystem에 남지
않지만 이전 build layer와 builder cache의 보관 정책 전체를 이 저장소가
정의하지는 않는다. image layer와 runtime secret 전달을 같은 문제로 취급하면
안 되는 이유다.

## image 파일, writable layer와 volume

container를 만들면 image 위에 writable layer가 생긴다. mount가 같은 path를
덮으면 process는 mount 쪽 내용을 본다.

| path | image에 준비된 것 | runtime에서 보이는 것 |
| --- | --- | --- |
| `/usr/src/wordpress` | 검증된 WordPress core | image의 read-only artifact |
| `/var/www/html` | 빈 mount point | `wordpress_data` volume |
| `/var/www/config` | 빈 mount point | WordPress에서만 `wordpress_config` volume |
| `/var/lib/mysql-volume` | 빈 mount point | `mariadb_data` volume |
| `/etc/nginx/ssl` | 빈 directory | nginx writable layer에 생성한 certificate/key |
| `/run/php`, `/run/mysqld` | runtime directory | container 수명 동안의 socket·pid·client temp |

Docker가 빈 volume을 처음 mount할 때 image directory의 기존 내용을 copy-up할
수 있지만, 이 프로젝트는 그 암묵적 동작으로 WordPress를 설치하지 않는다.
entrypoint가 image manifest를 읽어 허용한 file type과 checksum을 검증하며
명시적으로 수렴시킨다.

제품 Compose에는 host bind mount가 없다. `tests/runtime_stack.py`가 bootstrap
중단 지점을 제어할 때만 test 전용 pause path를 bind mount한다. 따라서 bind
mount의 일반적인 host path 공유를 production state model로 설명하지 않는다.

## ENTRYPOINT, CMD와 PID 1

세 Dockerfile의 마지막 두 명령은 같은 형태다.

```dockerfile
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["실제-server", "foreground-option"]
```

별도 override가 없으면 JSON exec form `ENTRYPOINT`가 준비 script로 실행되고
기본 `CMD`가 argument로 전달된다. host orchestrator가 start 과정의 one-off
container에 `bootstrap` command를 주면 CMD만 바뀌고 같은 entrypoint가 bootstrap
branch를 실행한다.

반면 backup archive, restore extract와 rotation compensation helper는 Dockerfile의
entrypoint를 각각 `tar`, `sh`, `php`로 override한다. 이 경로는 준비 script의
branch와 마지막 `exec "$@"`를 거치지 않으며, override process 또는 그 process가
`exec`한 명령이 one-off container의 PID 1을 맡는다.

runtime branch의 마지막은 현재 source의 다음 형태다.

```sh
exec "$@"
```

`exec`는 shell process image를 실제 server로 교체한다. wrapper가 부모로 남아
signal을 중계하는 구조가 아니므로 server가 container namespace의 PID 1이 되고
그 exit status가 container exit status가 된다.

| service | runtime PID 1 | stop signal | grace |
| --- | --- | --- | --- |
| nginx | `nginx -g "daemon off;"` | `SIGQUIT` | 15초 |
| wordpress | `php-fpm8.2 -F` | `SIGQUIT` | 30초 |
| mariadb | `mariadbd --user=mysql --console` | `SIGTERM` | 60초 |

foreground option이 없으면 daemon이 background로 분리되고 원래 PID 1이
끝나면서 container 수명과 server 수명이 갈라질 수 있다. 현재 명령은 server가
foreground에 남도록 한다.

Docker stop은 service별 signal을 PID 1에 보내고 grace 동안 기다린다. 제한 안에
끝나지 않으면 강제 종료할 수 있다. 이는 POSIX signal handler의 일반 원리를
대체하지 않고 container runtime이 추가한 시간·namespace 조건이다.

`restart: unless-stopped`는 process가 종료돼 container가 멈춘 사건에 반응한다.
healthcheck가 `unhealthy`를 기록했다는 사실만으로 Docker가 이 service를
재시작하는 정책은 아니다. 여기서 process liveness와 service readiness가
갈린다.

entrypoint는 root로 시작해 mount의 owner와 mode를 준비한다. MariaDB runtime
argument는 `--user=mysql`, PHP-FPM worker pool은 `www-data`, nginx는 master와
worker 권한을 distro 설정에 따라 나눈다. `no-new-privileges:true`는 실행 중
추가 privilege 획득을 제한하지만 “모든 process가 non-root” 또는 “모든 Linux
capability가 제거됨”을 뜻하지 않는다.

## Compose network와 이름

현재 Compose model은 두 user-defined bridge network를 만든다.

```text
frontend: nginx ───────── wordpress
backend:                  wordpress ───────── mariadb
                          (internal: true)
```

Docker의 embedded DNS가 같은 network에 연결된 service 이름을 현재 container
address로 해석한다. nginx는 `wordpress:9000`, WordPress는 `mariadb:3306`을
사용한다. recreate 뒤 IP가 달라질 수 있으므로 fixed IP가 아니라 service name과
port가 계약이다.

Dockerfile의 `EXPOSE 443/9000/3306`은 image가 예상하는 listening port를 알리는
metadata다. host 접근을 만들지 않는다. host socket을 실제로 만드는 설정은
Compose의 다음 `ports` entry다.

```yaml
ports:
  - "${HTTPS_BIND_ADDRESS:-127.0.0.1}:${HTTPS_PORT:-443}:443"
```

기본 bind address가 loopback이므로 외부 interface에는 직접 listen하지 않는다.
WordPress와 MariaDB에는 `ports`가 없지만 같은 user-defined network의 peer는
해당 container port로 연결할 수 있다. Compose `expose`가 없다는 사실도
network peer 통신을 금지하지 않는다.

`backend.internal: true`는 이 network에서 외부 route를 만들지 않는 Docker
network 속성이다. WordPress와 MariaDB 사이의 application credential이나 host
사용자의 daemon 권한을 대신하지 않는다.

## HTTPS에서 database까지

동적 WordPress 요청 하나는 다음 경계를 지난다.

```text
1. client
   HTTPS /index.php?... → host loopback published port

2. Docker daemon
   host socket → nginx container:443

3. nginx
   TLS 1.2/1.3 handshake와 복호화
   location/try_files 선택
   PHP path이면 FastCGI record 생성

4. frontend network
   FastCGI → wordpress:9000

5. PHP-FPM / WordPress
   SCRIPT_FILENAME으로 /var/www/html의 PHP file 실행
   wp-config.php의 DB 설정 사용

6. backend network
   MariaDB protocol/TCP → mariadb:3306

7. MariaDB
   /var/lib/mysql-volume/data의 table 읽기·쓰기
```

nginx의 `root`와 WordPress의 `/var/www/html`은 같은 named volume을 서로 다른
mode로 본다. nginx는 read-only, WordPress는 read-write다. 두 path가 다르면
FastCGI 연결 자체가 성공해도 `SCRIPT_FILENAME`이 가리키는 file을 PHP-FPM이
찾지 못한다.

TLS handshake는 nginx에서 끝난다. nginx→WordPress는 HTTP가 아니라 plaintext
FastCGI이고 WordPress→MariaDB도 별도 TLS가 없는 MariaDB/TCP다. TLS, TCP,
FastCGI와 WordPress application success는 서로 다른 계층이다.

정적 file은 nginx가 `wordpress_data`에서 직접 읽으므로 PHP-FPM과 database를
거치지 않는다. `/healthz`도 nginx가 고정 response를 직접 만든다. 이 두 경로의
성공을 WordPress/database 종단 성공으로 일반화할 수 없다.

## certificate의 소유자와 한계

nginx entrypoint는 certificate나 key가 없거나 비어 있을 때 RSA-2048 자체 서명
pair를 `/etc/nginx/ssl`에 만든다. 이 directory는 named volume이 아니라 nginx
container writable layer다.

- 같은 container restart에서는 layer가 유지돼 같은 file을 사용한다.
- `down/up`이나 recreate에서는 새 layer에 새 certificate를 만든다.
- backup에는 certificate가 포함되지 않는다.
- client는 공인 CA trust를 얻지 못하므로 개발 smoke가 `curl -k`를 사용한다.

entrypoint는 기존 pair의 public/private key 일치, SAN, hostname과 expiry를
완전하게 검증하거나 갱신하지 않는다. public CA 발급, renewal, secret storage와
무중단 reload는 현재 범위가 아니다.

## runtime 제한의 위치

Compose는 각 service에 CPU, memory, PID와 `nofile` 제한, `json-file` log
rotation, stop signal/grace, `no-new-privileges`를 선언한다. 이 설정은 daemon이
container를 만들 때 적용한다. application 내부의 query limit, request timeout,
database backup retention 같은 정책을 대신하지 않는다.

network 연결 가능성, process liveness, healthcheck 통과와 실제 WordPress 요청
성공의 차이는 [초기화·준비 상태·실패](bootstrap-readiness-and-failure.md)에서
이어 설명한다.
