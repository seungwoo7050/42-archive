# Thread 3 — Isolated runtime evidence and persistent-state verification

## Thread 목표

고정 identity를 제거해 독립 project를 만들고, isolated Docker harness로 request path와 persistent volume 보장을 실제 runtime에서 검증하는 흐름을 추적합니다.

**Source significance**

> Parameterization made independent test projects possible; the harness then turned those parameters into controlled Docker resources and private credentials. End-to-end and persistence scenarios prove distinct properties: one shows that the integrated request/data path works, while the other shows that container replacement does not replace authoritative volume state.

## 이 Thread를 이해하기 위한 핵심 질문

- fixed container/image/port/URL identity가 여러 test project를 막는 방식은 무엇입니까?
- test harness가 developer default project를 건드리지 않는다는 증거는 무엇입니까?
- source-level Compose validation과 live container inspection은 각각 무엇을 놓칠 수 있습니까?
- end-to-end request/data-path test와 restart/recreate persistence test가 증명하는 속성은 어떻게 다릅니까?
- port conflict recovery가 임의의 startup failure를 숨기지 않도록 어떤 조건으로 제한됩니까?

## 완료 기준

- project/image/port/URL parameter가 Compose resource naming과 WordPress canonical URL에 미치는 영향을 확인했습니다.
- harness의 private env/secret creation, timeout, diagnostics, teardown 경계를 코드로 추적했습니다.
- HTTPS → FastCGI → WordPress → MariaDB의 동일 데이터 round trip을 test assertion으로 복원했습니다.
- restart와 container recreation 뒤에도 같은 volume set이 유지되는지 기록했습니다.

## Commit map

| 순서 | SHA | Subject | Importance | Tags | Source-defined role |
| --- | --- | --- | --- | --- | --- |
| 1 | `9d75a34e290f` | feat(runtime): 프로젝트·이미지·포트·URL 격리 | **A** | `ARCH`<br>`STACK`<br>`OPERATIONS` | Removed fixed project, image, port, and URL identities. |
| 2 | `2c436f574712` | test(bootstrap): 격리된 런타임 하네스 추가 | **A** | `TEST`<br>`ARCH`<br>`OPERATIONS` | Created the isolated Docker runtime harness and secret-boundary inspection. |
| 3 | `8c9b5b9adef2` | test(e2e): HTTPS와 MariaDB를 잇는 WordPress 데이터 검증 | **A** | `TEST`<br>`INTEGRATION`<br>`STACK` | Verified the complete HTTPS, FastCGI, WordPress, and MariaDB data path. |
| 4 | `fb1a689cf969` | test(persistence): 재시작·재생성 뒤 상태 보존 검증 | **A** | `TEST`<br>`PERSISTENCE`<br>`RISK` | Verified database, option, upload, and volume identity across restart and recreation. |

> Commit 순서는 source의 Development Thread 정의를 그대로 따릅니다. 같은 SHA가 다른 Thread에도 있으면 이 문서의 관점으로 다시 확인합니다.

## Commit별 학습 기록

### 1. `9d75a34e290f` — feat(runtime): 프로젝트·이미지·포트·URL 격리

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `ARCH`, `STACK`, `OPERATIONS` |
| Source-defined role | Removed fixed project, image, port, and URL identities. |
| 이전 Thread commit | 없음 |
| 다음 Thread commit | `2c436f574712` |

#### 원문이 확정한 범위

- **Summary:** Parameterizes project names, image tags, HTTPS binding, port, and canonical WordPress URL while removing fixed container names.
- **Classification reason:** This enables multiple isolated stacks and makes later runtime testing and fresh-project restore possible; it is a significant deployment-boundary improvement.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `9d75a34e290f`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `srcs/docker-compose.yml`의 `container_name removal / image variables`에서 Compose project namespace가 container/resource names를 소유하고 test별 image tag가 충돌하지 않습니다.
- `srcs/docker-compose.yml`의 `HTTPS_BIND_ADDRESS / HTTPS_PORT`에서 여러 stack이 서로 다른 host port에서 동시에 실행될 수 있습니다.
- `.env.example / WordPress environment`의 `WORDPRESS_URL`에서 runtime endpoint와 WordPress home/site URL이 같은 test identity를 사용합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 9d75a34e290f | srcs/docker-compose.yml | container_name removal / image variables | 고정 `container_name`을 제거하고 `STACK_IMAGE_PREFIX`와 `STACK_IMAGE_TAG`로 local image identity를 parameterize합니다. | Compose project namespace가 container/resource names를 소유하고 test별 image tag가 충돌하지 않습니다. |
| 9d75a34e290f | srcs/docker-compose.yml | HTTPS_BIND_ADDRESS / HTTPS_PORT | host publish address와 port를 environment parameter로 만들고 loopback/non-default port를 허용합니다. | 여러 stack이 서로 다른 host port에서 동시에 실행될 수 있습니다. |
| 9d75a34e290f | .env.example / WordPress environment | WORDPRESS_URL | canonical WordPress URL을 명시적으로 요구해 domain과 non-default HTTPS port를 site state에 반영합니다. | runtime endpoint와 WordPress home/site URL이 같은 test identity를 사용합니다. |

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | 고정 project/container/image/443 port/canonical URL은 두 test stack이 같은 Docker names와 host socket을 차지하게 했습니다. |
| 선택한 boundary / decision | Compose project name과 image prefix/tag, bind address/port, canonical URL을 모두 외부 parameter로 바꾸고 fixed container name을 제거했습니다. |
| 핵심 caller/callee 또는 configuration consumer | `srcs/docker-compose.yml`의 `container_name removal / image variables`; `srcs/docker-compose.yml`의 `HTTPS_BIND_ADDRESS / HTTPS_PORT`; `.env.example / WordPress environment`의 `WORDPRESS_URL` |
| state / ownership / lifecycle 변화 | caller가 project identity를 선택하고 Compose가 그 이름으로 containers/networks/volumes를 namespace합니다. WordPress DB state에는 caller가 제공한 URL이 저장됩니다. |
| 주요 failure branch | 잘못 조합된 domain/port/URL은 stack이 뜨더라도 redirect와 test request가 어긋날 수 있습니다. parameterization 자체는 isolation을 실제로 사용했는지 증명하지 않습니다. |
| 이 commit의 보장 | 독립된 project/image/port/URL 조합을 만들 수 있고 default stack과 test stack이 이름을 공유하지 않게 합니다. |
| 한계와 다음 관련 commit | 실제 secret isolation, port reservation race, project-scoped teardown, request/data path correctness는 보장하지 않습니다. `2c436f574712`가 이 parameter를 사용해 private isolated harness를 만들고 후속 e2e/persistence scenario가 runtime 보장을 검사합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: 실제 secret isolation, port reservation race, project-scoped teardown, request/data path correctness는 보장하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `2c436f574712`가 이 parameter를 사용해 private isolated harness를 만들고 후속 e2e/persistence scenario가 runtime 보장을 검사합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: 독립된 project/image/port/URL 조합을 만들 수 있고 default stack과 test stack이 이름을 공유하지 않게 합니다.

### 2. `2c436f574712` — test(bootstrap): 격리된 런타임 하네스 추가

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `TEST`, `ARCH`, `OPERATIONS` |
| Source-defined role | Created the isolated Docker runtime harness and secret-boundary inspection. |
| 이전 Thread commit | `9d75a34e290f` |
| 다음 Thread commit | `8c9b5b9adef2` |

#### 원문이 확정한 범위

- **Summary:** Adds an isolated Docker runtime harness with private credentials, random project names, dynamic ports, cleanup, and secret-boundary inspection.
- **Classification reason:** The harness becomes the foundation for the branch's later behavioral evidence and materially changes the project from source-validated configuration to reproducible runtime verification.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `2c436f574712`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `tests/runtime_stack.py`의 `RuntimeStack.__init__ / _prepare_environment`에서 fixture의 credentials와 Docker identity가 developer defaults와 분리됩니다.
- `tests/runtime_stack.py`의 `reserve_port / run_compose / _run_start`에서 hang과 fixed-port collision을 test process의 명시적 failure로 바꿉니다.
- `tests/runtime_stack.py`의 `assert_runtime_secret_boundary / inspect_service`에서 source string만이 아니라 effective container configuration을 검사합니다.
- `tests/runtime_stack.py`의 `close / project-scoped down`에서 default project나 unrelated Docker resource를 teardown 대상으로 사용하지 않습니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 2c436f574712 | tests/runtime_stack.py | RuntimeStack.__init__ / _prepare_environment | PID와 random token으로 unique project/image prefix를 만들고 temporary directory `0700`, secret files `0600`, private env file, loopback port를 준비합니다. | fixture의 credentials와 Docker identity가 developer defaults와 분리됩니다. |
| 2c436f574712 | tests/runtime_stack.py | reserve_port / run_compose / _run_start | loopback socket으로 candidate port를 찾고 모든 subprocess/Compose command에 bounded timeout을 적용합니다. | hang과 fixed-port collision을 test process의 명시적 failure로 바꿉니다. |
| 2c436f574712 | tests/runtime_stack.py | assert_runtime_secret_boundary / inspect_service | live container inspect와 rendered Compose를 사용해 runtime service의 password env와 `/run/secrets` mount가 없는지 확인합니다. | source string만이 아니라 effective container configuration을 검사합니다. |
| 2c436f574712 | tests/runtime_stack.py | close / project-scoped down | scenario가 만든 project name으로 `down --volumes --remove-orphans`하고 private temporary files를 제거합니다. | default project나 unrelated Docker resource를 teardown 대상으로 사용하지 않습니다. |

#### 비교 기준

- exact commit diff: `git diff 2c436f574712^ 2c436f574712 -- <path>`
- 이전 Thread 상태와 비교: `git diff 9d75a34e290f 2c436f574712 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### 테스트 학습 기록

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariant | test scenario는 developer/default stack과 resource identity를 공유하지 않고 runtime service는 bootstrap secret을 보유하지 않습니다. |
| 재현하는 failure / boundary | fixed project/image/port/credential 또는 source/effective config 불일치 경계입니다. |
| test technique | live Docker harness + rendered config + container inspect |
| fixture와 failure injection | private temp directory에서 random project/image/secret과 loopback port를 만들고 production staged start를 실행합니다. |
| 실제 통과하는 production path | RuntimeStack 준비→`start_stack.py`→Compose services→inspect/health→project-scoped teardown 경로입니다. |
| 핵심 assertion | unique names/paths/modes, command timeouts, runtime secret env/mount 부재를 확인합니다. |
| 이 테스트가 증명하는 것 | isolated runtime fixture와 secret-boundary inspection이 실제 Docker objects에 적용됨을 증명합니다. |
| 이 테스트가 증명하지 않는 것 | WordPress content round trip, named-volume persistence, all cleanup failure modes는 증명하지 않습니다. |
| 성격 | integration harness foundation |
| 막는 후속 regression | default namespace 사용, world-readable secret fixture, timeout 없는 subprocess, runtime secret 재도입을 막습니다. |
| 직접 실행 command와 결과 | 실행하지 않았습니다. 현재 환경에는 Docker와 로컬 repository checkout이 없습니다. 해당 SHA의 test code와 command wiring만 검사했습니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: 특정 application request/data path나 container recreation 뒤 state 보존은 이 harness 도입만으로 증명하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `8c9b5b9adef2`와 `fb1a689cf969`이 같은 harness에 서로 다른 runtime properties를 추가합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: 각 scenario가 고유 project와 credentials로 실제 stack을 만들고 effective secret boundary를 검사할 수 있게 합니다.

### 3. `8c9b5b9adef2` — test(e2e): HTTPS와 MariaDB를 잇는 WordPress 데이터 검증

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `TEST`, `INTEGRATION`, `STACK` |
| Source-defined role | Verified the complete HTTPS, FastCGI, WordPress, and MariaDB data path. |
| 이전 Thread commit | `2c436f574712` |
| 다음 Thread commit | `fb1a689cf969` |

#### 원문이 확정한 범위

- **Summary:** Extends the harness to test HTTPS health, WordPress post creation and rendering, MariaDB persistence, port-conflict recovery, and legacy configuration migration.
- **Classification reason:** It verifies the complete browser-to-database path and catches integration failures that static checks cannot, making it significant but not an architectural implementation commit.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `8c9b5b9adef2`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `tests/runtime_stack.py`의 `verify_e2e / blocked-port fixture`에서 임의 startup error를 port retry로 숨기지 않습니다.
- `tests/runtime_stack.py`의 `WP-CLI post creation`에서 fixture가 다른 run의 data와 혼동되지 않습니다.
- `tests/runtime_stack.py`의 `HTTPS fetch / MariaDB query`에서 Nginx→FastCGI→WordPress→MariaDB의 동일 data round trip을 연결합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 8c9b5b9adef2 | tests/runtime_stack.py | verify_e2e / blocked-port fixture | candidate port를 실제 listener로 점유한 상태에서 start를 시도해 genuine bind conflict만 분류하고 bounded 횟수 안에서 새 port로 재시도합니다. | 임의 startup error를 port retry로 숨기지 않습니다. |
| 8c9b5b9adef2 | tests/runtime_stack.py | WP-CLI post creation | unique token이 포함된 published post를 WordPress application interface로 생성하고 post ID/title/content를 기록합니다. | fixture가 다른 run의 data와 혼동되지 않습니다. |
| 8c9b5b9adef2 | tests/runtime_stack.py | HTTPS fetch / MariaDB query | HTTPS response에서 token을 확인하고 MariaDB에서 동일 post ID의 row와 content를 query해 비교합니다. | Nginx→FastCGI→WordPress→MariaDB의 동일 data round trip을 연결합니다. |

#### 비교 기준

- exact commit diff: `git diff 8c9b5b9adef2^ 8c9b5b9adef2 -- <path>`
- 이전 Thread 상태와 비교: `git diff 2c436f574712 8c9b5b9adef2 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### 테스트 학습 기록

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariant | 외부 HTTPS request가 Nginx와 FastCGI를 거쳐 WordPress에서 실행되고 결과가 MariaDB row와 일치합니다. |
| 재현하는 failure / boundary | host port가 실제로 점유된 경우의 bounded recovery와 integrated data-path 단절입니다. |
| test technique | live end-to-end integration + uniquely identifiable fixture + DB differential assertion |
| fixture와 failure injection | 점유 listener로 첫 port를 막고, 새 port에서 stack을 시작한 뒤 unique post를 WP-CLI로 생성합니다. |
| 실제 통과하는 production path | HTTPS listener→Nginx routing→`wordpress:9000`→WordPress mutation/read→MariaDB query를 통과합니다. |
| 핵심 assertion | port 변경, health, HTTPS body token, DB post ID/title/content 일치를 확인합니다. |
| 이 테스트가 증명하는 것 | public response와 authoritative relational row가 동일 application operation을 반영함을 증명합니다. |
| 이 테스트가 증명하지 않는 것 | restart/recreate persistence, high concurrency, browser semantics 전체는 증명하지 않습니다. |
| 성격 | broad integration with bounded edge regression |
| 막는 후속 regression | routing/service-name/URL mismatch, false port-error retry, DB write와 public response 분리를 막습니다. |
| 직접 실행 command와 결과 | 실행하지 않았습니다. 현재 환경에는 Docker와 로컬 repository checkout이 없습니다. 해당 SHA의 test code와 command wiring만 검사했습니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: 컨테이너 restart/recreation 뒤에도 data가 남는지, backup/restore를 거치는지는 증명하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `fb1a689cf969`이 같은 stack에서 restart와 recreation을 별도 persistence property로 검증합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: 실제 integrated request/data path와 canonical non-default URL/port가 하나의 test project 안에서 일치함을 증명합니다.

### 4. `fb1a689cf969` — test(persistence): 재시작·재생성 뒤 상태 보존 검증

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `TEST`, `PERSISTENCE`, `RISK` |
| Source-defined role | Verified database, option, upload, and volume identity across restart and recreation. |
| 이전 Thread commit | `8c9b5b9adef2` |
| 다음 Thread commit | 없음 |

#### 원문이 확정한 범위

- **Summary:** Verifies posts, options, uploads, and all three named volumes across container restart and recreation.
- **Classification reason:** The test locks down a central durable-state invariant and distinguishes container lifecycle from volume lifecycle, providing strong evidence for a core project guarantee.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `fb1a689cf969`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `tests/runtime_stack.py`의 `verify_persistence / project_volumes`에서 state 값뿐 아니라 authoritative volume identity를 비교할 기준을 만듭니다.
- `tests/runtime_stack.py`의 `persistent fixtures`에서 서로 다른 persistence class를 한 scenario에서 검사합니다.
- `tests/runtime_stack.py`의 `restart then down/up recreation`에서 process restart와 container replacement를 구분해 증명합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| fb1a689cf969 | tests/runtime_stack.py | verify_persistence / project_volumes | 초기 MariaDB/WordPress data/config named volume set과 concrete names를 기록합니다. | state 값뿐 아니라 authoritative volume identity를 비교할 기준을 만듭니다. |
| fb1a689cf969 | tests/runtime_stack.py | persistent fixtures | unique post, WordPress option, upload file을 각각 relational DB, application option, filesystem state로 만듭니다. | 서로 다른 persistence class를 한 scenario에서 검사합니다. |
| fb1a689cf969 | tests/runtime_stack.py | restart then down/up recreation | 먼저 service restart 후 값을 검사하고, 이어 `down`(volume 미삭제)과 `up`으로 container를 재생성한 뒤 exact volume set과 모든 값을 다시 확인합니다. | process restart와 container replacement를 구분해 증명합니다. |

#### 비교 기준

- exact commit diff: `git diff fb1a689cf969^ fb1a689cf969 -- <path>`
- 이전 Thread 상태와 비교: `git diff 8c9b5b9adef2 fb1a689cf969 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### 테스트 학습 기록

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariant | container lifecycle과 persistent volume lifecycle은 분리되어 container replacement가 authoritative state를 교체하지 않습니다. |
| 재현하는 failure / boundary | restart 또는 `down`/`up` recreation 뒤 새 empty volume이나 누락된 application/filesystem state를 받는 경계입니다. |
| test technique | live persistence integration + identity/value comparison |
| fixture와 failure injection | unique post, option, upload를 만들고 initial volume set을 기록한 뒤 restart와 container recreation을 수행합니다. |
| 실제 통과하는 production path | WordPress/MariaDB writes→named volumes→restart/recreate→WP-CLI/DB/filesystem reads를 통과합니다. |
| 핵심 assertion | exact volume set, post row, option value, upload checksum/content를 전후 비교합니다. |
| 이 테스트가 증명하는 것 | container replacement와 process restart 뒤 동일 named-volume state가 유지됨을 증명합니다. |
| 이 테스트가 증명하지 않는 것 | explicit volume deletion, host failure, backup/restore correctness는 증명하지 않습니다. |
| 성격 | deterministic persistence regression |
| 막는 후속 regression | anonymous/new volume mount, down 시 volume 삭제, state class 일부만 보존되는 회귀를 막습니다. |
| 직접 실행 command와 결과 | 실행하지 않았습니다. 현재 환경에는 Docker와 로컬 repository checkout이 없습니다. 해당 SHA의 test code와 command wiring만 검사했습니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: host disk loss, explicit volume deletion, backup consistency, migration across Docker hosts는 증명하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: Thread 1에서 도입된 named-volume ownership을 runtime evidence로 고정하고 backup/restore Thread의 기준 state를 제공합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: process restart와 container recreation이 authoritative named-volume identity와 세 종류의 state를 바꾸지 않음을 증명합니다.

## Invariant ledger

| Source에서 연결된 invariant | 처음/초기 단계 | 강화·교정 단계 | 검증 단계 | 학습자가 확인한 실제 근거 |
| --- | --- | --- | --- | --- |
| 각 runtime scenario는 고유 Compose project, image prefix, port, credential을 사용합니다. | 9d75a34e290f | 2c436f574712 | 8c9b5b9adef2, fb1a689cf969 | parameterized Compose와 RuntimeStack random identity/private fixture가 실제 scenario 전 과정에 사용됩니다. |
| loopback HTTPS bind와 explicit WordPress URL은 non-default port에서도 일치합니다. | 9d75a34e290f | 2c436f574712 | 8c9b5b9adef2 | env file의 bind/port/URL이 public fetch와 WordPress canonical state에서 같은 값을 사용합니다. |
| 통합 request path 성공과 persistence는 별도 속성입니다. | 8c9b5b9adef2 | fb1a689cf969가 durable evidence 추가 | fb1a689cf969 | e2e는 순간 round trip, persistence는 restart/recreate 전후 volume ID와 값 비교를 수행합니다. |
| container replacement는 authoritative named volume identity를 바꾸지 않습니다. | 75590dedfb3a에서 구조 도입 | fb1a689cf969 | fb1a689cf969 | `project_volumes()`의 exact set과 post/option/upload 값을 recreation 전후 비교합니다. |

### Ledger 보완 기록

- source에 명시되지 않은 새 invariant를 확정 사실로 추가하지 않습니다.
- invariant가 실제로 부족했음을 드러낸 commit 또는 failure stage: fixed project/container/image/port/URL identity는 동시에 두 stack을 만들 수 없고 developer default resources를 test fixture와 분리하지 못했습니다.
- marker, rename, lock, health, authentication, cleanup 등 invariant를 고정하는 concrete mechanism: parameterized Compose identity와 harness의 private credentials, random project name, loopback port, bounded command, exact teardown이 isolation을 고정합니다.
- 후속 commit이 invariant를 약화하지 못하게 하는 regression evidence: `8c9b5b9adef2`가 전체 request/data path를, `fb1a689cf969`가 restart와 `down`/`up` 뒤 동일 volume identity와 values를 검증합니다.
## Failure → Fix → Test 연결

| failure / 위험 | fix 또는 mechanism | test / evidence | 학습자 연결 기록 |
| --- | --- | --- | --- |
| fixed names/ports/images로 test stack 간 충돌 | 9d75a34e290f가 identity parameterization | 2c436f574712가 unique private harness로 사용 | 가능성을 선언한 것과 실제 isolation을 사용한 것을 분리했습니다. |
| healthy process만으로 application data path를 추정 | 8c9b5b9adef2가 unique post를 public HTTPS와 DB row로 연결 | 동일 scenario의 HTTPS/DB assertions | service health와 business data round trip은 다른 evidence입니다. |
| container recreation 뒤 새 empty volume을 받아도 이전 e2e는 통과 | fb1a689cf969가 volume names와 세 state class를 기록 | restart/down-up 뒤 exact identity/value assertions | container와 authoritative state의 lifecycle을 분리합니다. |

### 직접 재구성할 chain

```text
기존 가정: 고정 이름과 기본 포트로도 runtime test를 반복할 수 있다는 가정
  → 실제 failure 또는 위험: 병렬·연속 실행에서 resource/port 충돌과 developer stack 오염 위험이 발생했습니다.
  → root cause: Compose resource identity와 test fixture ownership이 parameterized project namespace에 묶여 있지 않았습니다.
  → 수정된 invariant / decision: 매 실행마다 project/image prefix/port/URL/secrets를 분리하고 genuine bind conflict만 제한적으로 재시도합니다.
  → 해당 SHA의 실제 수정 코드: `9d75a34e290f` parameterization과 `2c436f574712` isolated harness
  → failure injection 또는 regression test: `8c9b5b9adef2` e2e 및 `fb1a689cf969` persistence scenarios
  → 증명된 보장 / 남은 비보장: 선택된 project의 통합 경로와 volume lifecycle은 검증하지만 Docker daemon crash나 physical storage durability는 증명하지 않습니다.
```

## Ownership / state / responsibility 변화

| 대상 | 이전 상태 | 이후 책임/authoritative state | 확인할 근거 | 학습자 결론 |
| --- | --- | --- | --- | --- |
| Compose project namespace | fixed names의 암묵적 공유 | scenario별 container/network/volume identity 소유 | 9d75a34e290f project parameter와 rendered names | default project와 test project가 이름을 공유하지 않습니다. |
| Harness temporary directory | developer environment에 의존 | env, secrets, diagnostics, control files의 private owner | 2c436f574712 mode/creation/cleanup | host-side test material은 0700/0600 범위에 남습니다. |
| Runtime data | health로 간접 추정 | post/option/upload와 volume identity로 명시적 검증 | 8c9b5b9adef2/fb1a689cf969 assertions | 관계형·application·filesystem state를 분리해 확인합니다. |
| Port selection | fixed host port | loopback candidate와 genuine bind-conflict-only retry | 8c9b5b9adef2 listener/error classification | 다른 startup error는 재시도로 숨기지 않습니다. |

## Thread 최종 상태

- **Source-confirmed endpoint:** Parameterization made independent test projects possible; the harness then turned those parameters into controlled Docker resources and private credentials. End-to-end and persistence scenarios prove distinct properties: one shows that the integrated request/data path works, while the other shows that container replacement does not replace authoritative volume state.
- 최종 authoritative state와 owner: Compose project가 Docker resource identity를, private RuntimeStack fixture가 test env/secrets/port/expected values를, named volumes가 persistent state를 소유합니다.
- 정상 실행의 entry point와 완료 조건: scenario별 production staged start가 healthy해지고 해당 e2e 또는 persistence assertion을 모두 통과하면 정상 완료입니다.
- failure 또는 interruption 뒤 retry/rollback/compensation 조건: start failure는 genuine bind conflict일 때만 bounded port retry하며 다른 failure는 즉시 보고합니다. 종료 시 project-scoped teardown을 수행합니다.
- 이 Thread가 다른 Thread에 제공하는 전제: 후속 backup/restore/rotation/operations scenarios가 default stack과 충돌하지 않고 live evidence를 만들 수 있는 harness를 제공합니다.
- 이 Thread 단독으로는 증명하지 않는 것: Docker가 없는 현재 환경에서는 실제 scenario result를 새로 증명하지 않았으며 코드에 표현된 test mechanism만 확인했습니다.

## 최종 architecture 또는 execution flow 정리

| 단계 | 확인할 흐름 | 실제 코드 근거 | 정상 전이 | 실패·정리·재시도 |
| --- | --- | --- | --- | --- |
| 1 | private fixture 생성 | 2c436f574712 RuntimeStack preparation | 0700 temp dir, 0600 secrets, unique env를 만듭니다. | unsafe permission/file creation 실패면 Docker mutation 전 종료합니다. |
| 2 | project/image/port 선택 | 9d75a34e290f parameters + 2c436f574712 random identity | Compose resources와 host endpoint를 scenario별 분리합니다. | 8c9b5b9adef2가 genuine bind conflict만 새 port로 재시도합니다. |
| 3 | production startup | 2c436f574712 `_run_start` | `start_stack.py`를 bounded timeout으로 실행합니다. | timeout/start failure는 StackError로 전파됩니다. |
| 4 | runtime secret/marker inspect | 2c436f574712 live inspect | effective containers가 bootstrap boundary를 유지하는지 확인합니다. | secret env/mount나 marker/health mismatch면 실패합니다. |
| 5 | e2e round trip | 8c9b5b9adef2 `verify_e2e` | unique post가 HTTPS와 MariaDB에서 일치합니다. | 어느 layer든 token/ID가 다르면 path failure입니다. |
| 6 | persistence round trip | fb1a689cf969 `verify_persistence` | restart/recreate 뒤 같은 volumes와 values를 확인합니다. | identity/value mismatch는 persistence regression입니다. |
| 7 | teardown | RuntimeStack.close | scenario project와 private files만 제거합니다. | 후속 Thread 8에서는 cleanup failure도 scenario result에 합칩니다. |

### 학습자의 최종 설명

> 고정 이름과 포트를 없앤 것만으로 isolation이 증명되지는 않습니다. `RuntimeStack`은 random project/image identity, loopback port, private env/secrets, bounded subprocess, project-scoped teardown을 실제 fixture로 만들고 production startup을 호출합니다. e2e scenario는 unique post를 WordPress로 만든 뒤 public HTTPS와 MariaDB row에서 같은 값을 확인해 전체 request/data path를 증명합니다. persistence scenario는 별도로 initial volume set과 DB option/upload state를 기록하고 process restart와 container recreation 뒤 다시 비교합니다. 따라서 “현재 요청이 동작한다”와 “교체 뒤에도 권위 있는 state가 남는다”는 서로 다른 evidence로 유지됩니다.

## 학습 완료 자가 점검

- [x] e2e test가 persistence까지 자동 증명한다고 합쳤습니까?
- [x] port retry가 모든 startup error에 적용된다고 잘못 기록하지 않았습니까?
- [x] volume 이름의 동일성과 volume 안 값의 동일성을 모두 확인했습니까?
- [x] test harness가 default Compose namespace를 사용할 가능성을 코드로 배제했습니까?
- [x] 모든 code snippet에 SHA와 path/symbol을 기록했습니다.
- [x] final HEAD의 field/helper/test를 이전 SHA에 소급하지 않았습니다.
- [x] source가 확정하지 않은 사실을 추정으로 채우지 않았습니다.
- [x] test가 증명하는 것과 증명하지 않는 것을 구분했습니다.
- [x] 이 Thread를 commit 순서대로 구두 설명할 수 있습니다.
