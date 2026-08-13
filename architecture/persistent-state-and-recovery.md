# 영속 상태와 복구 경계

container를 멈추는 것, 다시 만드는 것, volume을 지우는 것은 서로 다른
상태 전이다. backup·restore·credential rotation은 이 상태 전이에 database와
filesystem의 일관성 조건을 더한다.

이 문서는 현재 구현의 소유자, 수명과 실패 뒤 정리 범위를 설명한다.

## 상태 소유권 지도

| 상태 | 실제 위치와 소유자 | 삭제·교체 조건 |
| --- | --- | --- |
| image artifact | Docker daemon의 image/layer store | image remove |
| container metadata·writable layer | Docker daemon의 container 객체 | container remove/recreate |
| nginx certificate/key | nginx writable layer `/etc/nginx/ssl` | nginx container remove/recreate |
| MariaDB data·marker | `mariadb_data:/var/lib/mysql-volume` | volume remove |
| WordPress core/content/upload·marker | `wordpress_data:/var/www/html` | volume remove |
| WordPress config와 DB app password | `wordpress_config:/var/www/config` | volume remove |
| database credential/user/content | MariaDB data file | dump/SQL/volume 변화 |
| host secret source | `.env`가 가리키는 host filesystem | host operator |
| operation lock inode | host `/tmp/container-stack-operation-locks-UID` | host operator; unlock 뒤 path는 남음 |
| runtime socket·client temp | container `/run` | process/container 종료 |
| backup set | operator가 지정한 host directory | host backup policy |

여기서 ownership은 C++ object의 단독 메모리 소유권과 다르다. daemon이 volume
객체의 lifecycle을 관리하고 container process가 그 안의 file을 읽고 쓰며 host
operator가 삭제 권한을 갖는 식으로 책임이 나뉜다.

nginx는 `wordpress_data`를 read-only로 보지만 file 내용의 confidentiality를
얻는 것은 아니다. config volume을 아예 mount하지 않기 때문에 DB password가
든 target file을 볼 수 없다.

주요 permission 경계는 다음과 같다.

| path | process owner와 mode |
| --- | --- |
| MariaDB staging/final data directory | `mysql`, bootstrap이 `0700` staging을 final로 rename |
| MariaDB marker | `mysql`, private umask로 생성 |
| WordPress data/core/content | `www-data`; directory는 대체로 `0755`, file은 image mode를 보존해 게시 |
| WordPress marker | `www-data`, private umask로 만든 regular file |
| WordPress config directory/file | `www-data`, 각각 `0700`/`0600` |
| host secret source | 현재 UID, file `0600`; parent는 group/other 접근 bit 없음 |
| host operation lock directory/file | 현재 UID, 생성 mode `0700`/`0600` |

entrypoint가 root로 시작해 이 owner와 mode를 준비한 뒤 실제 MariaDB와 PHP-FPM
worker가 제한된 account로 접근한다. `no-new-privileges`는 이 초기 root 단계를
없애지 않는다.

## restart, recreate, down과 fclean

| 작업 | container | network | named volume | nginx certificate | image |
| --- | --- | --- | --- | --- | --- |
| process/container restart | 같은 객체 | 유지 | 유지 | 유지 | 유지 |
| force recreate | 새 객체 | endpoint 재연결 | 재사용 | 새로 생성 | 재사용 |
| `make down` | 제거 | 제거 | 보존 | 제거 | 보존 |
| `make up` after down | 새 객체 | 새 network | 재사용 | 새로 생성 | 재사용 |
| `make fclean` | 제거 | 제거 | 삭제 | 제거 | local 분류 image 제거 요청 |

network를 새로 만들면 container IP가 달라질 수 있지만 service DNS name은
Compose model의 계약으로 유지된다. WordPress와 MariaDB data는 volume에 있어
container ID나 writable layer와 함께 사라지지 않는다.

`fclean`은 `DESTROY_CONFIRM`이 현재 `PROJECT_NAME`과 같을 때만 `down -v --rmi
local`을 실행한다. 이는 다른 project name을 우발적으로 지우는 일을 줄이지만
삭제 전 backup의 존재나 내용까지 자동 확인하지 않는다. Compose가 local로
분류하지 않는 custom image tag는 남을 수 있다.

## 초기화 상태와 일반 migration

MariaDB marker와 WordPress marker는 각 bootstrap의 완료 checkpoint다. marker가
없다고 기존 data를 자동으로 새 형식으로 migration하지 않는다.

- MariaDB는 published `data`가 불완전하면 임의 수리를 거부한다.
- WordPress는 image manifest가 소유하는 core file을 수렴시킨다.
- `wp-content` 사용자 상태는 없는 기본 file만 보충한다.
- legacy regular `wp-config.php`는 충돌하지 않을 때 전용 config volume으로
  위치를 옮긴다.
- site URL은 현재 환경으로 맞추지만 임의 database schema나 content migration을
  제공하지 않는다.

재실행은 “모든 상태를 이전 snapshot으로 되돌린다”가 아니라 현재 checkpoint와
실제 data를 다시 검사해 허용한 부분을 목표 상태로 수렴시킨다.

## operation lock의 범위

lock path는 다음 구조다.

```text
/tmp/container-stack-operation-locks-<uid>/<project-hash>.lock
```

parent는 `0700`, lock file은 `0600`이며 nonblocking `flock`을 사용한다. 같은
host, 같은 UID, 같은 project의 다음 작업을 직렬화한다.

- start
- backup
- restore
- credential rotation

secret file도 lock을 얻은 뒤 읽는다. unlock 뒤 lock file 자체는 남아 다음
process가 같은 inode를 다시 사용할 수 있다.

다음 작업은 이 lock에 참여하지 않는다.

- `make build`
- `make down`, `make fclean`
- 직접 Docker/Compose command
- 다른 UID의 관리 작업
- 다른 host나 remote Docker daemon의 작업

따라서 distributed lock이나 daemon 전체의 배타 제어가 아니다. preflight가
끝난 뒤 비참여 명령이 resource를 바꾸는 TOCTOU 가능성도 남는다.

구현은 하나의 완전히 공통된 management class만 사용하지 않는다.
`tools/start_stack.py`는 `tools/stack_runtime.py`의 `ComposeProject`와 lock을
사용하지만 backup tool에도 자체 `ComposeProject`/lock code가 있고 rotation은
backup 쪽 구현을 import한다. 현재 key derivation은 일치하지만 중복 구현은
향후 drift를 별도로 점검해야 할 지점이다.

## backup의 일관성 경계

backup은 세 runtime service가 모두 running인지 확인하고 다음 순서로 진행한다.

```text
operation lock
→ 예약된 새 output path
→ private sibling temporary directory
→ nginx와 WordPress stop
→ MariaDB --single-transaction dump
→ database.sql stream
→ wordpress_data와 wordpress_config를 단일 wordpress.tar.gz로 stream
→ 두 payload의 SHA-256 manifest 작성
→ wordpress.tar.gz의 path/type 검사
→ fsync
→ os.replace로 최종 directory 게시
→ service restart
```

nginx와 WordPress를 멈추는 이유는 이 stack의 application writer가 database와
filesystem을 동시에 바꾸지 않게 하기 위해서다. MariaDB는 online 상태에서
`--single-transaction` logical dump를 만든다.

“한 논리 시점”이라는 설명에는 전제가 있다. 외부 client가 MariaDB에 직접
쓰거나 volume을 별도로 수정하면 WordPress writer만 멈춘 것으로 database와
filesystem의 application-level consistency를 보장할 수 없다.

dump와 tar output은 memory에 전부 모으지 않고 `0600` file로 stream한다.
`wordpress.tar.gz` 안에는 data를 `html`, 전용 config를 `config` tree로 담되
web-root의 `wp-config.php` symlink는 제외한다. 두 payload checksum을 담은
manifest를 쓴 뒤 tar member를 다시 검사하고, temporary directory를 fsync해
예약한 final path에 게시한다. 이미 존재하는
output path를 덮어쓰지 않는다.

manifest는 format version, artifact 이름과 SHA-256을 기록한다. checksum은
manifest가 가리키는 byte와 file이 같음을 확인할 뿐 누가 backup을 만들었는지,
악의적 manifest인지 또는 application 의미가 맞는지는 인증하지 않는다.

backup에 포함되는 것:

- MariaDB logical dump
- WordPress core/content/upload archive
- WordPress config와 그 안의 DB app password

포함되지 않는 것:

- host `.env`와 secret source file
- nginx certificate
- image
- encryption key, retention/schedule/off-host copy policy

final backup을 게시한 뒤 service restart가 실패하면 완성된 backup은 보존하고
operation은 실패로 보고한다. publish 전 실패는 temporary/reservation을 정리한다.

## restore는 왜 fresh project만 받는가

restore가 기존 volume에 덮어쓰면 old file, restored file과 database row가
섞이고 실패 시 어느 쪽이 원본인지 판별하기 어렵다. 현재 도구는 container,
volume, network가 하나도 없는 project만 받아 rollback 대상을 “이번 실행이 만든
resource”로 제한한다.

preflight는 다음을 검사한다.

- source directory와 file owner, mode, regular type, hard-link count, nofollow
- 정확히 `database.sql`, `wordpress.tar.gz`, `manifest.json`만 존재
- manifest format, size와 checksum
- tar member의 absolute path, `..`, 중복 name와 특수 file 거부
- Compose V1/V2와 bootstrap 이름까지 포함한 대상 resource 충돌 부재

정상 흐름:

1. target credential로 fresh MariaDB를 bootstrap한다.
2. logical dump를 stdin stream으로 복원한다.
3. empty WordPress data/config volume에 archive를 푼다.
4. application bootstrap으로 config, site, user와 current URL을 검증한다.
5. WordPress와 nginx runtime을 시작한다.

target의 `MYSQL_DATABASE`, `MYSQL_USER`와 DB application password는 복원된
`wp-config.php`와 일치해야 한다. 복원된 site는 이미 설치된 상태이므로
bootstrap은 없는 admin을 새로 만들지 않는다. 설정한 admin login이 복원된
database에 존재하고 admin password가 맞아야 하지만, admin role·email은
reconciliation하지 않는다.

설정한 author가 없으면 target login·email·password로 새 계정을 만들고, 이미
있으면 password만 확인한다. 따라서 새 author를 선택한 target은 author
identity와 password를 snapshot에 맞출 필요가 없다. MariaDB system database는
dump하지 않으므로 target root password도 snapshot과 달라도 된다.

restore source의 DB name prefix를 별도 의미 검증하는 기능은 없으므로 identity
계약과 최종 application bootstrap 검증이 중요하다.

## restore 실패와 signal

구현은 resource별 생성 ledger를 두지 않고, fresh-project preflight를 통과한 뒤
복원을 시작했다는 `restoration_started` 상태만 기록한다. 그 뒤 operation
error나 처리 가능한 `SIGINT`·`SIGTERM`을 받으면 이 project에서 보이는
container·volume·network 전체를 `down --volumes`로 제거하고 label과 정확한
resource name으로 잔여 항목을 다시 확인한다. fresh 조건 때문에 이 시점의
matching resource를 이번 restore가 만든 것으로 다룰 수 있다. restore 실패와
cleanup 실패가 둘 다 있으면 둘을 함께 보고한다.

자동 정리할 수 없는 범위:

- `SIGKILL`
- host power loss
- Docker daemon loss
- cleanup과 경합한 비참여 Docker command

build된 image는 restore 실패 cleanup 뒤에도 남을 수 있다. 이 경우 같은 project
식별자와 image tag를 기준으로 operator가 확인해야 한다.

## credential rotation은 전역 transaction이 아니다

rotation은 기존 secret과 신규 secret이 동시에 필요한 상태 전이다.

```text
1. current credential 모두 성공 확인
2. replacement credential 모두 거부 확인
3. nginx stop
4. WordPress admin/author password 변경
5. wp-config.php DB password 원자 교체
6. MariaDB app password 변경
7. MariaDB root password 변경
8. host secret file 각각 fsync + replace
9. 세 runtime container force recreate
10. new success + old rejection 검증
```

중간에는 old/new 값이 섞인 mixed state가 존재한다. nginx를 멈춰 외부 요청이 이
상태를 관찰할 가능성을 줄이지만 모든 database·volume·host file을 한 원자
commit으로 바꾸지는 않는다.

실패하면 도구가 실제로 동작하는 root credential을 탐색해 application account,
config, WordPress user, root와 host file을 이전 값으로 다시 수렴시킨다. 완료
flag만 역순으로 취소하는 방식이 아니라 현재 작동 상태를 다시 확인한다.
rotation 도구의 `verify_rotation()`은 DB·config·WordPress account의 expected
credential, rejected credential의 거부와 runtime environment/argv secret
부재를 검사한다. 별도의 runtime rotation scenario가 그 뒤 HTTPS status와
application write/read를 관찰한다. 제품 도구 하나가 이 두 계층을 모두
검증한다고 합치지 않는다.

`SIGINT`·`SIGTERM`은 rollback 진입 전이면 보상 절차를 시작한다. 보상 중 추가
signal은 즉시 중단하지 않고 기록해 보상이 끝날 기회를 준다. `SIGKILL`,
host/daemon loss에는 durable journal이나 별도 old-value copy가 없어 자동
복구를 보장하지 않는다. 이 기능은 zero-downtime dual credential rotation이
아니다.

## file과 archive 방어가 결합되는 이유

owner/mode만으로 file 내용의 무결성을 알 수 없고 checksum만으로 path가 안전한지
알 수 없다. 관리 도구는 다음 검사를 목적별로 결합한다.

| 검사 | 막으려는 문제 | 보장하지 않는 것 |
| --- | --- | --- |
| `nofollow`, regular type | symlink와 특수 file 추적 | file 작성자의 신뢰 |
| owner/mode | 다른 local user의 접근·교체 | host root와 daemon 침해 |
| hard-link count | 다른 name을 통한 동일 inode 공유 | filesystem 전체 snapshot |
| `flock` | 참여한 local operation 동시 실행 | 비참여·remote operation |
| tar path/type 검사 | path escape와 device/FIFO 추출 | archive 내용의 application 의미 |
| SHA-256 | manifest 대비 byte 변화 | manifest 출처와 confidentiality |

## 운영 제한과 diagnostics

Compose는 CPU, memory, PID, open-file limit, log rotation, stop grace와
`no-new-privileges`를 service별로 적용한다. limit 도달은 application error,
OOM, process 생성 실패나 connection 실패로 나타날 수 있으며 자동 recovery나
capacity planning을 제공하지 않는다.

diagnostics tool은 version, rendered Compose 상태, 최근 log와 container
resource 정보를 allowlist로 수집한다. output directory가 이미 있으면 거부하고
새 `0700` directory와 `0600` file만 만든다. redaction할 secret을 읽을 수 없으면
가리지 못한 일부 자료를 남기지 않고 전체 수집을 중단한다.

redaction은 알고 있는 secret value와 path를 지우는 fail-closed 경계다. 외부
plugin, request parameter나 project 밖 process가 log에 쓴 모든 민감 정보를
자동 분류하는 data-loss-prevention system은 아니다.

## 현재 복구 범위 밖

- public certificate 저장·갱신과 신뢰 체인
- encrypted, scheduled, retained, off-host backup
- MariaDB replication과 point-in-time recovery
- multi-host HA와 distributed operation lock
- external secret manager와 durable rotation journal
- arbitrary WordPress schema/data migration

이 항목은 일반적으로 유용해서가 아니라 현재 code와 test가 소유하지 않는
state이므로 비대상이다.
