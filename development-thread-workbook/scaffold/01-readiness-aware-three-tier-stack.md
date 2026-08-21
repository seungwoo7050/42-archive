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

- 이 SHA가 추가한 MariaDB Dockerfile과 entry command를 열어 Debian base, server/client/CA/`gosu` package 입력을 식별합니다.
- distribution-provided database contents를 제거한 뒤 runtime/data directory를 다시 만들고 `mysql` ownership을 부여하는 명령 순서를 표시합니다.
- `mariadbd`가 foreground로 실행되고 log ownership이 container runtime으로 넘어가는 최종 `CMD`/entrypoint 경계를 확인합니다.
- image layer의 초기 data와 mounted `/var/lib/mysql` state가 섞이지 않도록 하는 코드를 parent commit과 비교합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| `[학습자 작성]` | `[학습자 작성]` | `[학습자 작성]` | `[학습자 삽입]` | `[학습자 작성]` |

#### B-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| Thread에서 맡은 구현 역할 | `[학습자 작성]` |
| 핵심 input / output / state | `[학습자 작성]` |
| 변경된 directive / helper / command | `[학습자 작성]` |
| immediate failure 또는 boundary | `[학습자 작성]` |
| 다음 commit에 넘긴 한계 | `[학습자 작성]` |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: `[학습자 작성]`
- 다음 관련 commit이 바꾸거나 검증하는 지점: `[학습자 작성]`
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: `[학습자 작성]`

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

- MariaDB entrypoint에서 direct password와 mutually exclusive `_FILE` input을 해석하는 branch, missing-input rejection, identifier constraints, SQL literal escaping을 찾습니다.
- empty-volume 판정에 사용하는 MariaDB system directory와 이미 populated volume을 재사용하는 branch를 나란히 기록합니다.
- temporary socket-only server의 start → readiness wait → root hardening → anonymous/remote-root/test DB 제거 → application DB/grant 생성 순서를 실제 shell 함수/SQL로 추적합니다.
- networking이 disabled된 bootstrap server와 최종 foreground daemon 사이의 shutdown/handoff를 확인합니다.
- 각 failure branch가 temporary server, client option, partial state를 어떻게 처리하는지 해당 SHA만 기준으로 기록합니다.

#### 비교 기준

- exact commit diff: `git diff e13b0357a21b^ e13b0357a21b -- <path>`
- 이전 Thread 상태와 비교: `git diff f8ec9621725c e13b0357a21b -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| `[학습자 작성]` | `[학습자 작성]` | `[학습자 작성]` | `[학습자 삽입]` | `[학습자 작성]` |

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | `[학습자 작성]` |
| 선택한 boundary / decision | `[학습자 작성]` |
| 핵심 caller/callee 또는 configuration consumer | `[학습자 작성]` |
| state / ownership / lifecycle 변화 | `[학습자 작성]` |
| 주요 failure branch | `[학습자 작성]` |
| 이 commit의 보장 | `[학습자 작성]` |
| 한계와 다음 관련 commit | `[학습자 작성]` |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: `[학습자 작성]`
- 다음 관련 commit이 바꾸거나 검증하는 지점: `[학습자 작성]`
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: `[학습자 작성]`

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

- WordPress entrypoint에서 DB/admin/author password direct/`_FILE` 입력과 remaining site metadata validation을 찾습니다.
- MariaDB authentication wait의 caller/callee, retry 종료 조건, 실패 결과를 확인합니다.
- core files 부재, `wp-config.php` 부재, site uninstalled, author absent를 각각 판정하는 filesystem/WP-CLI query를 구분합니다.
- canonical HTTPS home/site URL mutation과 site/user creation이 어떤 order로 실행되는지 표시합니다.
- ownership normalization 뒤 PHP-FPM으로 process replacement하는 `exec` 경계를 확인하고, 재시작 시 어떤 단계가 skip되는지 기록합니다.

#### 비교 기준

- exact commit diff: `git diff d764d066167b^ d764d066167b -- <path>`
- 이전 Thread 상태와 비교: `git diff e13b0357a21b d764d066167b -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| `[학습자 작성]` | `[학습자 작성]` | `[학습자 작성]` | `[학습자 삽입]` | `[학습자 작성]` |

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | `[학습자 작성]` |
| 선택한 boundary / decision | `[학습자 작성]` |
| 핵심 caller/callee 또는 configuration consumer | `[학습자 작성]` |
| state / ownership / lifecycle 변화 | `[학습자 작성]` |
| 주요 failure branch | `[학습자 작성]` |
| 이 commit의 보장 | `[학습자 작성]` |
| 한계와 다음 관련 commit | `[학습자 작성]` |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: `[학습자 작성]`
- 다음 관련 commit이 바꾸거나 검증하는 지점: `[학습자 작성]`
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: `[학습자 작성]`

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

- Nginx server block에서 IPv4/IPv6 HTTPS listener, TLS 1.2/1.3, certificate path를 확인합니다.
- shared WordPress document root, `try_files` 또는 front-controller fallback, PHP location의 FastCGI endpoint `wordpress:9000`을 추적합니다.
- container-shared script path를 만드는 `SCRIPT_FILENAME` 계열 parameter와 original HTTPS scheme을 전달하는 parameter를 표시합니다.
- `/healthz`, upload limit, security headers, dotfile denial이 request routing과 분리된 지점을 확인합니다.
- 잘못된 shared path 또는 scheme parameter가 어떤 application behavior를 깨뜨릴지 코드 근거와 함께 기록합니다.

#### 비교 기준

- exact commit diff: `git diff 99c03f54399a^ 99c03f54399a -- <path>`
- 이전 Thread 상태와 비교: `git diff d764d066167b 99c03f54399a -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| `[학습자 작성]` | `[학습자 작성]` | `[학습자 작성]` | `[학습자 삽입]` | `[학습자 작성]` |

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | `[학습자 작성]` |
| 선택한 boundary / decision | `[학습자 작성]` |
| 핵심 caller/callee 또는 configuration consumer | `[학습자 작성]` |
| state / ownership / lifecycle 변화 | `[학습자 작성]` |
| 주요 failure branch | `[학습자 작성]` |
| 이 commit의 보장 | `[학습자 작성]` |
| 한계와 다음 관련 commit | `[학습자 작성]` |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: `[학습자 작성]`
- 다음 관련 commit이 바꾸거나 검증하는 지점: `[학습자 작성]`
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: `[학습자 작성]`

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

- 이 SHA의 `docker-compose.yml` 전체를 기준으로 세 custom build context와 service responsibility를 표로 옮깁니다.
- host port publication이 Nginx에만 존재하고 WordPress/MariaDB에는 없는지 exact service block으로 확인합니다.
- service-name DNS가 Nginx→WordPress와 WordPress→MariaDB 연결에 사용되는 configuration을 찾습니다.
- initial bridge network, restart behavior, image/container identity, named MariaDB/WordPress volume declarations와 mount points를 표시합니다.
- Compose가 소유하게 된 resource namespace와 각 image/entrypoint가 여전히 소유하는 lifecycle을 분리합니다.
- parent SHA의 독립 서비스 상태와 비교해 이 commit이 처음으로 system-level architecture를 확정한 최소 diff를 추출합니다.

#### 비교 기준

- exact commit diff: `git diff a8b9f693c614^ a8b9f693c614 -- <path>`
- 이전 Thread 상태와 비교: `git diff 99c03f54399a a8b9f693c614 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| `[학습자 작성]` | `[학습자 작성]` | `[학습자 작성]` | `[학습자 삽입]` | `[학습자 작성]` |

#### S-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 이 commit 직전 상태 | `[학습자 작성]` |
| 해결하려던 문제 | `[학습자 작성]` |
| 기존 설계가 충분하지 않았던 이유 | `[학습자 작성]` |
| 핵심 결정 | `[학습자 작성]` |
| 주요 caller → callee / producer → consumer | `[학습자 작성]` |
| authoritative state와 publication boundary | `[학습자 작성]` |
| ownership / lifetime / responsibility 변화 | `[학습자 작성]` |
| failure scenario와 recovery path | `[학습자 작성]` |
| 이 commit이 보장하는 것 | `[학습자 작성]` |
| 아직 보장하지 않는 것 | `[학습자 작성]` |
| 후속 fix / test와 연결 | `[학습자 작성]` |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: `[학습자 작성]`
- 다음 관련 commit이 바꾸거나 검증하는 지점: `[학습자 작성]`
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: `[학습자 작성]`

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

- MariaDB data volume, writable WordPress volume, Nginx read-only shared mount의 exact mount mode를 확인합니다.
- MariaDB authentication probe, PHP-FPM ping request, external HTTPS probe의 command와 success condition을 각각 기록합니다.
- `depends_on` 또는 동등한 condition에서 container creation이 아니라 `service_healthy`를 요구하는 edge를 찾습니다.
- health interval/retry/timeout/start period가 있다면 이 SHA의 실제 값과 worst-case wait를 계산합니다.
- placeholder password 도입 위치를 확인하되 후속 secret-file architecture를 이 SHA에 소급하지 않습니다.

#### 비교 기준

- exact commit diff: `git diff 75590dedfb3a^ 75590dedfb3a -- <path>`
- 이전 Thread 상태와 비교: `git diff a8b9f693c614 75590dedfb3a -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| `[학습자 작성]` | `[학습자 작성]` | `[학습자 작성]` | `[학습자 삽입]` | `[학습자 작성]` |

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | `[학습자 작성]` |
| 선택한 boundary / decision | `[학습자 작성]` |
| 핵심 caller/callee 또는 configuration consumer | `[학습자 작성]` |
| state / ownership / lifecycle 변화 | `[학습자 작성]` |
| 주요 failure branch | `[학습자 작성]` |
| 이 commit의 보장 | `[학습자 작성]` |
| 한계와 다음 관련 commit | `[학습자 작성]` |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: `[학습자 작성]`
- 다음 관련 commit이 바꾸거나 검증하는 지점: `[학습자 작성]`
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: `[학습자 작성]`

## Invariant ledger

| Source에서 연결된 invariant | 처음/초기 단계 | 강화·교정 단계 | 검증 단계 | 학습자가 확인한 실제 근거 |
| --- | --- | --- | --- | --- |
| 호스트 포트를 게시하는 서비스는 Nginx뿐입니다. | `a8b9f693c614` | `75590dedfb3a` | `후속 runtime/e2e 검증에서 확인` | `[학습자: 실제 code/test evidence]` |
| MariaDB 영속 상태는 이미지 계층이 아니라 mounted data volume이 권위자입니다. | `f8ec9621725c` | `a8b9f693c614, 75590dedfb3a` | `fb1a689cf969` | `[학습자: 실제 code/test evidence]` |
| WordPress는 애플리케이션 상태를 쓸 수 있고 Nginx는 공유 문서를 읽는 경계에 놓입니다. | `d764d066167b` | `75590dedfb3a` | `8c9b5b9adef2, fb1a689cf969` | `[학습자: 실제 code/test evidence]` |
| 준비 상태는 단순 container creation이 아니라 service-specific health로 판단합니다. | `75590dedfb3a` | `dc9601f5e670에서 marker까지 강화` | `2bf6d3f11337` | `[학습자: 실제 code/test evidence]` |

### Ledger 보완 기록

- source에 명시되지 않은 새 invariant를 확정 사실로 추가하지 않습니다.
- invariant가 실제로 부족했음을 드러낸 commit 또는 failure stage: `[학습자 작성]`
- marker, rename, lock, health, authentication, cleanup 등 invariant를 고정하는 concrete mechanism: `[학습자 작성]`
- 후속 commit이 invariant를 약화하지 못하게 하는 regression evidence: `[학습자 작성]`

## Failure → Fix → Test 연결

| failure / 위험 | fix 또는 mechanism | test / evidence | 학습자 연결 기록 |
| --- | --- | --- | --- |
| 개별 컨테이너만 존재하고 시스템 경계가 없음 | a8b9f693c614가 Compose topology를 확정 | 8c9b5b9adef2가 전체 request/data path를 검증 | `[학습자: root cause와 code/test 연결]` |
| entrypoint의 조건부 재실행만으로는 abrupt interruption 뒤 partial state를 판정하기 어려움 | dc9601f5e670가 staged one-off bootstrap과 completion marker로 교정 | 2bf6d3f11337가 각 durable stage에서 SIGKILL 후 수렴을 검증 | `[학습자: root cause와 code/test 연결]` |
| 컨테이너가 생성됐다는 사실을 dependency readiness로 오인 | 75590dedfb3a가 health-gated dependency로 변경 | 후속 runtime harness에서 live health와 통합 경로를 확인 | `[학습자: root cause와 code/test 연결]` |

### 직접 재구성할 chain

```text
[기존 가정]
  → [실제 failure 또는 위험]
  → [root cause]
  → [수정된 invariant / decision]
  → [해당 SHA의 실제 수정 코드]
  → [failure injection 또는 regression test]
  → [증명된 보장 / 남은 비보장]
```

## Ownership / state / responsibility 변화

| 대상 | 이전 상태 | 이후 책임/authoritative state | 확인할 근거 | 학습자 결론 |
| --- | --- | --- | --- | --- |
| Nginx | 독립 이미지/프로세스 | 유일한 host-facing TLS 및 static/FastCGI routing 책임 | 설정 파일과 Compose port/network evidence | `[학습자 작성]` |
| WordPress | 독립 PHP-FPM 이미지와 초기 entrypoint | 애플리케이션 실행 및 writable application state | entrypoint, PHP-FPM pool, volume mount evidence | `[학습자 작성]` |
| MariaDB | 독립 DB 이미지와 초기 entrypoint | 관계형 영속 상태와 DB/account 소유 | data directory, socket, grant, volume evidence | `[학습자 작성]` |
| Compose | 서비스별 실행 단위가 분리됨 | network, service DNS, port, volume namespace와 dependency를 통합 소유 | docker-compose.yml의 exact block evidence | `[학습자 작성]` |

## Thread 최종 상태

- **Source-confirmed endpoint:** The thread progresses from individually runnable containers to one stateful application system. The decisive step is not the existence of three images but the Compose responsibility boundary: Nginx owns external transport, WordPress owns application execution, and MariaDB owns durable relational state. Health-gated dependencies and mounted volumes then make the topology operationally meaningful rather than merely connected.
- 최종 authoritative state와 owner: `[학습자 작성]`
- 정상 실행의 entry point와 완료 조건: `[학습자 작성]`
- failure 또는 interruption 뒤 retry/rollback/compensation 조건: `[학습자 작성]`
- 이 Thread가 다른 Thread에 제공하는 전제: `[학습자 작성]`
- 이 Thread 단독으로는 증명하지 않는 것: `[학습자 작성]`

## 최종 architecture 또는 execution flow 정리

| 단계 | 확인할 흐름 | 실제 코드 근거 | 정상 전이 | 실패·정리·재시도 |
| --- | --- | --- | --- | --- |
| 1 | 호스트의 HTTPS 요청이 Nginx에 도달하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 2 | Nginx가 static path와 WordPress front controller를 선택하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 3 | PHP 요청이 `wordpress:9000` FastCGI로 전달되는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 4 | WordPress가 MariaDB service name과 credential/config를 사용해 접근하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 5 | MariaDB와 WordPress state가 named volume에 남는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 6 | health check와 dependency gate가 다음 서비스를 허용하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |

### 학습자의 최종 설명

> `[학습자 작성: 위 표와 commit evidence만 사용해 이 Thread의 설계 → 구현 → 실패 → 수정 → 검증 발전을 설명합니다.]`

## 학습 완료 자가 점검

- [ ] 세 이미지의 존재와 세 계층 architecture의 성립을 같은 것으로 설명하지 않았습니까?
- [ ] Nginx가 PHP를 실행한다고 잘못 설명하지 않았습니까?
- [ ] WordPress data volume과 MariaDB data volume의 상태 종류를 구분했습니까?
- [ ] 초기 health check가 completion marker까지 포함한다고 소급해서 쓰지 않았습니까?
- [ ] 모든 code snippet에 SHA와 path/symbol을 기록했습니다.
- [ ] final HEAD의 field/helper/test를 이전 SHA에 소급하지 않았습니다.
- [ ] source가 확정하지 않은 사실을 추정으로 채우지 않았습니다.
- [ ] test가 증명하는 것과 증명하지 않는 것을 구분했습니다.
- [ ] 이 Thread를 commit 순서대로 구두 설명할 수 있습니다.
