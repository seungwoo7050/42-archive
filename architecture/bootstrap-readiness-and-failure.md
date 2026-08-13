# 초기화·준비 상태·실패 경계

`make up`은 단순한 `docker compose up` 별칭이 아니다. host orchestrator가
credential을 장기 실행 container 밖에서 읽고, one-off container로 초기화한 뒤
runtime service를 시작하는 상태 전이 프로그램이다.

이 문서는 현재 source의 정상 흐름과 부분 실패 뒤 남는 상태를 연결한다. 일반적인
“transaction이면 모두 원상 복구된다”는 기대를 적용하지 않는다.

## 준비 상태라는 말의 범위

이 저장소에서는 비슷하게 보이는 네 상태가 서로 다르다.

| 상태 | 질문 | 대표 관찰 |
| --- | --- | --- |
| process liveness | PID 1이 살아 있는가 | `kill -0 1`, container state |
| transport availability | socket이나 TLS listener가 응답하는가 | MariaDB Unix socket, FastCGI `/ping`, nginx HTTPS |
| component readiness | 해당 component의 bootstrap prerequisite가 완료됐는가 | marker, socket, PHP-FPM response |
| application success | 실제 WordPress 요청과 database state가 맞는가 | e2e의 글 쓰기·HTTPS 읽기·SQL 대조 |

`ready`는 thread barrier 도달이나 file descriptor readiness와 같은 뜻으로 쓰지
않는다. 여기서는 service가 현재 healthcheck의 제한된 요청을 처리할 수 있다는
뜻이다. `healthy`도 종단 application 보장의 동의어가 아니다.

## host orchestrator의 순서

지원되는 진입점은 `make up`이 호출하는 `tools/start_stack.py`다.

```text
run_action
└── project_operation_lock(project)
    ├── rendered Compose model 읽기
    ├── host secret source 검증·읽기
    ├── start_database
    │   ├── 필요하면 mariadb bootstrap one-off
    │   └── mariadb up --wait
    └── start_application
        ├── nginx와 wordpress stop
        ├── wordpress bootstrap one-off
        └── wordpress, nginx up --wait
```

lock을 먼저 얻고 secret을 나중에 읽는다. 같은 project의 rotation이 host file을
교체하는 중간 시점과 start가 섞이지 않게 하는 순서다. lock 범위와 비참여
명령은 [영속 상태와 복구](persistent-state-and-recovery.md)에서 설명한다.

`ComposeProject`는 project name, env file, compose file을 모든 Docker command에
일관되게 붙인다. one-off bootstrap은 `compose run --rm --no-deps --no-TTY`로
실행하며 secret byte를 stdin으로 보낸다. password를 environment, argument나
temporary host command file에 넣지 않는다.

`start_database`는 MariaDB service가 이미 running이면 bootstrap과 credential
revalidation을 생략한다. `start_application`은 WordPress bootstrap 전에 기존
nginx와 WordPress를 멈춘다. 따라서 실행 중 `make up`도 application 중단 구간을
만들 수 있다.

## host secret source의 계약

`.env`는 password 값을 직접 담지 않고 네 path를 Compose extension
`x-secret-files`에 전달한다.

```text
DB_ROOT_PASSWORD_FILE
DB_PASSWORD_FILE
WP_ADMIN_PASSWORD_FILE
WP_USER_PASSWORD_FILE
```

`tools/stack_runtime.py`는 rendered Compose model에서 실제 path를 얻는다. 단순히
`.env` 문자열을 다시 parsing하지 않으므로 상대 경로 해석과 Compose interpolation
결과를 하나의 source로 사용한다.

각 source는 다음 조건을 만족해야 한다.

- parent directory가 현재 UID 소유이고 group/other 접근 bit가 없음
- symlink가 아닌 regular file
- 현재 UID 소유, mode `0600`, hard-link count 1
- 24~128자의 한 줄 값
- 허용 문자만 사용
- 네 값의 canonical path가 모두 다름

이 검사는 다른 local UID와 accidental link를 막는 입력 경계다. filesystem
administrator, compromised Docker daemon, host root에 대한 secret manager는
아니다.

one-off container가 끝난 뒤 host secret mount는 남지 않는다. runtime Compose
service에는 password environment도 없다. 그러나 WordPress가 database에
접속하려면 application password가 필요하므로 `wordpress_config` volume의
`wp-config.php`에는 평문으로 남는다. database에는 verifier와 계정 상태가,
WordPress database에는 admin/author 인증 상태가 남는다. “secret source가
runtime container에 없다”와 “credential state가 저장되지 않는다”를 구분한다.

## init process와 runtime process

같은 image가 두 종류의 process를 실행한다.

| mode | command | 수명과 결과 |
| --- | --- | --- |
| bootstrap | host가 CMD 대신 `bootstrap` 전달 | volume을 검사·수정하고 종료 |
| runtime | Dockerfile 기본 CMD | prerequisite를 검사한 뒤 server로 `exec` |

bootstrap이 성공해도 그 process가 장기 server가 되는 것은 아니다. 별도 runtime
container가 같은 named volume을 mount해 server를 시작한다. 반대로 runtime
entrypoint는 secret 없이 이미 게시된 marker와 필수 path만 검사한다. 빈 volume을
runtime command로 바로 시작할 수 없는 이유다.

## MariaDB: directory 단위 게시

fresh `mariadb_data`의 초기화는
`srcs/requirements/mariadb/tools/docker-entrypoint.sh`가 담당한다.

```text
/var/lib/mysql-volume/
├── .container-stack-bootstrap/   temporary datadir
└── data/                         published datadir
```

정상 순서는 다음과 같다.

1. 남아 있는 staging directory를 제거하고 mysql 소유 `0700`으로 다시 만든다.
2. `mariadb-install-db`로 system table을 staging에 만든다.
3. `--skip-networking` temporary server를 Unix socket으로 시작한다.
4. `/run/mysqld`의 `0600` client option file로 root/app database와 grant를
   설정한다.
5. root와 app credential로 실제 query를 실행해 결과를 검증한다.
6. 완료 marker를 staging에 기록하고 file과 directory를 fsync한다.
7. temporary server를 멈춘다.
8. 같은 volume 안에서 staging directory를 `data`로 rename하고 volume
   directory를 fsync한다.

같은 filesystem 안의 directory rename이므로 WordPress의 file별 교체보다 강한
게시 경계를 가진다. rename 전에 죽으면 `data`가 새 완성 상태를 가리키지 않고,
다음 bootstrap이 staging을 제거할 수 있다.

trap은 HUP, INT, TERM과 일반 EXIT에서 temporary server와 option file을
정리한다. `SIGKILL`에는 trap이 실행되지 않지만 다음 bootstrap의 staging cleanup이
계속할 기반을 만든다.

이미 `data`가 존재하면 다음을 확인한다.

- `data/mysql` system table directory 존재
- marker가 symlink가 아닌 regular file
- app user `%` row가 정확히 하나
- 입력한 app credential로 `SELECT 1` 성공

불완전한 published data를 임의로 새 DB와 합치거나 marker만 만들어 수리하지
않는다. 잘못된 상태를 거부하고 operator가 어느 state를 보존할지 결정하게 한다.

## WordPress: file별 수렴과 config 위치 migration

WordPress bootstrap은 세 volume/database 영역을 함께 다루므로 전체가 하나의
원자 rename으로 게시되지 않는다.

### database가 준비됐는지 확인

입력받은 DB app password를 `/run`의 private client option file에 두고
`mariadb:3306`에서 authenticated `SELECT 1`을 retry한다. TCP 연결 성공만으로
다음 단계에 들어가지 않는다.

### core file을 image 기준으로 수렴

`/usr/src/wordpress-core.sha256`을 읽어 각 core file을 확인한다.

1. destination이 symlink이거나 regular file이 아니면 거부한다.
2. 없거나 checksum이 다른 file은 같은 directory의 temporary file에 복사한다.
3. owner와 mode를 맞추고 fsync한 뒤 destination으로 rename한다.
4. 전체 manifest를 다시 검사한다.

이 방식은 file 하나가 half-written 상태로 보이는 것을 막지만 core tree 전체를
한 번에 교체하지 않는다. 임의 instruction에서 `SIGKILL`되면 이미 교체한 file과
아직 교체하지 않은 file이 섞일 수 있고, 다음 실행이 다시 manifest와 대조해
수렴한다.

`wp-content` 기본 file은 정책이 다르다. 없는 경우에만 image artifact를
복사하고 사용자가 만든 plugin, theme, upload를 checksum 기준으로 되돌리지
않는다.

### config를 별도 volume에 게시

실제 config는 `/var/www/config/wp-config.php`에 두고 웹 root의
`/var/www/html/wp-config.php`는 이를 향하는 absolute symlink다.

- config directory는 `www-data` 소유 `0700`
- config file은 `www-data` 소유 `0600`
- nginx에는 config volume을 mount하지 않아 symlink target을 읽을 수 없음

이전 구조의 regular web-root config가 있고 전용 config와 충돌하지 않으면
내용을 새 volume으로 옮긴 뒤 link를 게시한다. 이것은 config **위치 migration**이다.
일반적인 WordPress database schema/data migration framework가 아니다.

새 config는 core/automatic update 비활성화 값을 기록한다. 기존 config를
migration한 경우 같은 setting이 이미 있다고 일반화하지 않는다. DB credential이
현재 입력과 다르면 일반 start에서 몰래 덮어쓰지 않고 rotation을 요구한다.

### site와 user 상태를 검증

site가 없으면 install 과정에서 admin을 만들고, 설정한 author가 없으면 site
설치 여부와 관계없이 새로 만든다. 이미 설치된 site에서는 없는 admin을 만들지
않으므로 설정한 admin login이 존재하고 password가 맞아야 한다. 기존 author가
있으면 password만 확인한다. `home`과 `siteurl`은 현재 `WORDPRESS_URL`에 맞추지만
기존 title, email, role은 environment만으로 전부 reconciliation하지 않는다.

core, config, site와 두 user가 확인된 뒤 WordPress marker를 마지막에 기록한다.
marker는 “모든 미래 요청이 성공한다”가 아니라 bootstrap의 필수 단계가 그
실행에서 끝났다는 checkpoint다.

## healthcheck가 실제로 보는 것

| service | 현재 probe | 확인 | 확인하지 않음 |
| --- | --- | --- | --- |
| MariaDB | marker, Unix socket, `kill -0 1` | publish된 bootstrap marker, local socket, PID 1 | app credential query, WordPress 연결, query 의미 |
| WordPress | marker와 local FastCGI `/ping` | bootstrap marker, PHP-FPM FastCGI 응답 | 실제 PHP file, DB query, nginx path |
| nginx | local HTTPS `/healthz` | certificate load, TLS listener, nginx 고정 200 | FastCGI, WordPress, database |

MariaDB marker는 bootstrap 때 credential을 검증한 뒤 기록하지만 runtime
healthcheck 자체가 매번 credential query를 실행하는 것은 아니다. credential이
나중에 어긋나도 process/socket/marker probe가 즉시 그 차이를 찾는다고 단정할 수
없다.

Compose의 `depends_on: condition: service_healthy`는 container 생성·시작
순서에서 다음 dependency의 health를 기다린다. 이미 시작된 dependency가 나중에
unhealthy가 됐을 때 dependent service를 자동 중지·재시작·rollback하지 않는다.

host `make smoke`는 nginx status를 확인하고 response body는 버린다.
`tests/runtime_stack.py`의 e2e만 고유 WordPress data를 쓰고 HTTPS response와
MariaDB 저장값을 대조한다. 그 역시 외부 browser, public certificate나 장기
부하를 증명하지 않는다.

## 부분 실패 뒤 남는 상태

start 작업에는 전체 project transaction이 없다.

| 실패 위치 | 남을 수 있는 상태 | 다음 판단 |
| --- | --- | --- |
| secret 검증 전후 | service 변화 없음, lock file은 path에 남음 | 입력 권한·경로 수정 |
| MariaDB bootstrap | staging/temp 흔적, runtime DB 미시작 | 다음 bootstrap이 staging 판별·정리 |
| MariaDB `up --wait` | created/running/unhealthy DB container | `ps`, log와 health 원인 확인 |
| WordPress bootstrap | MariaDB running, nginx/WordPress stopped, 일부 file/DB 상태 | 같은 input으로 application 수렴 재시도 |
| application `up --wait` | 일부 runtime container running/unhealthy | 현재 state를 확인하고 재시도 |

orchestrator는 실패 직전까지 성공한 Docker action을 자동으로 역순 실행하지
않는다. 사용자가 `make up`을 다시 실행하면 persistent state를 검사해 계속한다.
이를 rollback이라고 부르면 실제 남은 외부 효과를 숨긴다.

## interruption 검증의 한계

bootstrap scenario는 MariaDB와 WordPress 각각 계측된 다섯 안정 경계에서
one-off container를 `SIGKILL`하고 같은 volume으로 재시도한다. 이 검사는 다음을
관찰한다.

- MariaDB staging 재처리
- WordPress core/config/site/user 수렴
- 중복 없이 정상 인증
- runtime에서 host secret mount·password env/argv 부재

모든 machine instruction 사이의 강제 종료와 모든 temporary filename을
exhaustive하게 증명하지 않는다. 관찰한 경계 밖의 `.bootstrap.*` 또는 `.tmp.*`
잔여물이 절대로 생기지 않는다고 문서화하지 않는다.

## 직접 Compose와 지원 경계

빈 volume에서 `docker compose up`을 직접 실행하면 runtime entrypoint가 marker와
필수 data를 찾지 못해 실패한다. 이미 준비된 volume이면 server가 시작될 수
있다. 두 경우 모두 host operation lock, secret source 검증, credential 확인과
WordPress core/config reconciliation을 우회한다.

따라서 direct Compose는 “항상 기술적으로 실행 불가능”해서가 아니라 현재
project가 보장하는 시작 절차를 건너뛰기 때문에 지원 경로가 아니다.
