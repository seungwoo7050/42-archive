# 프로젝트 중요도 프로필
프로젝트: `web/inception` 브랜치의 `container-stack`  
도메인: 단일 호스트 컨테이너 기반 웹 애플리케이션 배포, stateful service lifecycle, 운영 복구  
주요 목적: Docker Compose에서 프로젝트 소유 Nginx, WordPress PHP-FPM, MariaDB 이미지를 빌드·운영하면서 서비스 경계, 영속 상태, secret 처리, 중단 복구, backup/restore, credential rotation, verification을 명시적으로 정의한다.  
확정된 커밋 범위: root commit `24408b74af38`부터 tip commit `e9fa836de879`까지 `web/inception`의 독립적이고 선형인 전체 이력으로, 총 87개 커밋으로 구성된다. merge commit이나 관련 없는 상위 이력은 없다. 문서 전용 경계 커밋 두 개는 commit body 생성에서는 제외했지만 분류에는 모두 포함한다.

## 핵심 기술 영역
- Nginx, WordPress, WP-CLI, PHP, MariaDB, Debian 패키지를 위한 Docker image 구성과 immutable supply-chain input.
- Docker Compose service topology, HTTPS 및 FastCGI 요청 흐름, frontend/backend network 분리, health check, runtime resource policy.
- 최초 bootstrap, readiness, completion marker, idempotent convergence, 중단 이후 restart.
- 호스트 secret-file validation, bootstrap 전용 credential 전달, steady-state secret 노출 방지, coordinated credential rotation.
- named-volume persistence, database/filesystem consistency, atomic backup publication, 검증된 fresh-project restore, failed-restore cleanup.
- 프로젝트별 management operation 직렬화, signal handling, timeout, rollback, compensation, resource ownership.
- runtime 진단, 민감 정보 마스킹, 파괴적 작업 보호, test isolation, resource leak 탐지, CI orchestration.

## 핵심 아키텍처
- Nginx만 호스트에 노출된다. container port 443에서 TLS를 종료하고 공유 WordPress document root를 read-only로 제공하며, frontend network를 통해 PHP 요청을 WordPress의 FastCGI로 전달한다.
- WordPress는 PHP-FPM 실행, WordPress application state, private `wordpress_config` volume을 소유한다. frontend와 backend network에 모두 연결되며, HTTP-facing 실행 계층과 MariaDB를 연결하는 유일한 runtime service다.
- MariaDB는 `mariadb_data`의 durable relational state를 소유하며 internal backend network에만 연결된다.
- 호스트 측 Python management tool은 Compose model을 렌더링하고, host secret source를 resolve하며, 프로젝트별 advisory lock을 획득한 뒤 one-off bootstrap container를 실행한다. credential은 long-running service environment, process argument, secret mount에 남기지 않고 해당 one-off container의 표준 입력으로 전달한다.
- completion marker와 health check를 통해 단순히 파일이나 프로세스가 존재하는 상태와 완전히 초기화된 service state를 구분한다. WordPress data와 configuration volume을 분리해 `wp-config.php`가 Nginx의 mount view 밖에 있도록 한다.
- 격리된 Docker runtime harness가 scenario마다 고유한 project, port, credential, image tag, volume, diagnostics를 생성한다. 로컬 및 CI verification에서 cleanup과 leak detection도 correctness의 일부로 취급한다.

## 핵심 불변 조건
- 호스트 포트를 publish하는 서비스는 Nginx뿐이다. MariaDB는 frontend network와 host port space에서 접근할 수 없어야 한다.
- durable initialization marker와 live process-level readiness condition이 모두 충족되기 전에는 service를 ready 상태로 간주하지 않는다.
- MariaDB와 WordPress completion marker는 필요한 data, configuration, account, credential을 생성하고 검증한 뒤에만 publish한다.
- long-running container는 host secret mount, 비밀번호가 포함된 environment variable, password command argument, log의 credential value를 유지하지 않는다. 애플리케이션에 필요한 유일한 DB credential은 private WordPress configuration volume에만 남으며 Nginx는 이를 mount할 수 없다.
- 같은 Compose project를 대상으로 하는 management operation은 직렬화하고, 서로 무관한 project는 독립적으로 동작할 수 있어야 한다.
- 실패하거나 취소된 backup은 완전해 보이는 최종 backup set을 publish하지 않으며, 중지한 application service를 복구해야 한다.
- restore는 private하고 checksum이 일치하며 구조가 유효한 backup과 빈 target project만 허용한다. 실패 후에는 부분적으로 생성된 모든 target resource를 제거한다.
- credential rotation은 모든 replacement credential이 동작하고 모든 previous credential이 실패하는 상태에 도달하거나, 검증된 이전 상태로 보상 복구해야 한다. rollback 중에는 추가 termination signal이 rollback을 중단해서는 안 된다.
- destructive cleanup과 test recovery는 명시적으로 소유한 resource만 제거한다. diagnostics는 private하고 redacted되어야 하며, secret material을 안전하게 읽을 수 없으면 fail closed해야 한다.
- reproducible source pin과 runtime version check를 함께 사용해 stale cache나 의도하지 않은 package resolution이 source-only validation을 조용히 통과하지 못하게 한다.

## 주요 엔지니어링 난점
- 갑작스러운 중단 이후 MariaDB system table, database grant, WordPress core file, configuration, site state, user를 수렴시키면서 부분적으로 기록된 상태를 완료된 것으로 취급하지 않는 것.
- 여러 credential을 bootstrap, backup, restore, rotation operation에 공급하면서도 엄격한 secret 경계를 유지하는 것.
- transactional database state와 filesystem volume에서 하나의 사용 가능한 backup을 만들고 이를 atomically publish한 뒤, 어떤 failure나 signal이 발생해도 live stack을 복구하는 것.
- 새 Docker resource로 restore하면서 name collision을 거부하고, 신뢰할 수 없는 archive 구조를 검증하며, 부분적으로 생성된 container, network, volume의 rollback을 보장하는 것.
- host file, MariaDB account, WordPress user, `wp-config.php`에 동시에 표현되는 credential을 회전하고, state를 바꾼 뒤 failure를 보고할 수 있는 command까지 처리하는 것.
- timing-dependent sleep이 아니라 synchronized pause point를 사용해 비동기 cancellation과 process death를 결정적으로 테스트하는 것.
- 무관한 개발자 또는 CI workload에 영향을 줄 수 있는 광범위한 `prune` 없이 Docker resource ownership과 cleanup을 증명하는 것.
- immutable build input의 유지보수 가능성을 확보하면서 실제 설치된 runtime package와 application version까지 검증하는 것.

## 실무 엔지니어링 영역
- 명시적인 input validation, no-follow semantics를 사용하는 안전한 file open, private permission, bounded read, atomic replacement, directory synchronization.
- health check, 재시도, command timeout, graceful stop period, signal 변환, `finally` path cleanup.
- 공개 설정과 credential의 분리, bootstrap-time state와 steady-state runtime state의 분리.
- 단순한 command success가 아니라 positive/negative authentication verification.
- fresh-target check, collision detection, 정확한 resource label/name, ownership-scoped cleanup.
- redacted diagnostics, bounded log collection, error propagation, cleanup이 불완전할 때 evidence 보존.
- static source contract, rendered Compose check, 실제 runtime scenario, control-flow probe, CI policy check를 결합한 layered verification.

## S 등급 기준
- 프로젝트를 정의하는 세 서비스 아키텍처 또는 핵심 state-management transaction인 interruption-safe bootstrap, atomic backup, rollback-safe restore, coordinated credential rotation 중 하나를 확립한다.
- 위반 시 persistent data, credential, Docker resource가 모호하고 안전하지 않은 상태에 남을 수 있는 핵심 cross-subsystem invariant를 복원한다.
- 이미 올바른 구현을 개선하는 수준이 아니라, 부분 실패 상황에서 완성된 프로젝트가 어떻게 올바른 상태를 유지하는지 설명하는 데 필수적인 결정을 내린다.

## A 등급 기준
- 중요한 security, persistence, lifecycle, concurrency, recovery, resource-ownership 경계를 확립하거나 강하게 검증한다.
- 핵심 mechanism에 대한 신뢰도를 실질적으로 바꾸는 non-trivial failure path, edge case, integration problem, verification weakness를 해결한다.
- 이후 작업 전반에서 널리 사용하는 foundational management/test abstraction을 도입하되 그 자체가 프로젝트를 정의하는 transaction은 아니다.

## 일반적인 B 등급 작업
- 주요 아키텍처 결정이 이미 확립된 상태에서 필요한 service, configuration, helper, CLI 연결, test를 구현한다.
- 기존 safety 또는 serialization pattern을 다른 subsystem에 적용한다.
- 유용하지만 통상적인 validation, observability, packaging, operator ergonomics를 추가한다.

## 일반적인 C 등급 작업
- documentation-only commit, 단순 naming/ignore-file maintenance, 범위가 좁은 mechanical regression assertion.
- runtime behavior, state ownership, security, recovery, 프로젝트 설명 구조에 거의 영향을 주지 않는 변경.

## 프로젝트 전용 태그
ARCH — 책임 또는 실행 경계를 확립하거나 실질적으로 변경한다.  
CORE — 스택의 주요 목적에 핵심적인 기능을 구현한다.  
HARD — cross-state, lifecycle, failure reasoning의 난도가 특히 높다.  
RISK — 영향이 큰 correctness, security, persistence, destructive-operation 경계를 보호한다.  
TEST — 의미 있는 static, integration, runtime, CI evidence를 확립한다.  
EDGE — 중요한 boundary condition, malformed input, collision, race를 처리한다.  
INTEGRATION — 여러 service 또는 state store에 걸친 동작을 정의하거나 검증한다.  
STACK — Nginx, WordPress, MariaDB, Compose, network, request path 구조와 관련된다.  
BOOTSTRAP — 최초 state 생성, readiness, completion marker, convergence와 관련된다.  
SECRETS — credential source, exposure boundary, authentication state, rotation과 관련된다.  
PERSISTENCE — named volume, durable data, backup, restore와 관련된다.  
RECOVERY — interruption, compensation, rollback, cleanup, retry safety와 관련된다.  
SUPPLY_CHAIN — immutable build artifact, dependency input, runtime version assurance와 관련된다.  
OPERATIONS — management command, limit, observability, cleanup, diagnostics, CI lifecycle과 관련된다.

# 커밋 분류
| 커밋 | 제목 | 중요도 | 태그 | 요약 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `24408b74af38` | docs(readme): 컨테이너 스택 목적과 개발 규약 정의 | C | - | 의도한 스택 경계와 저장소 규칙을 설명하는 README를 추가한다. | 문서 전용이며 구현보다 앞선 커밋이다. 맥락은 제공하지만 runtime mechanism이나 invariant를 직접 확립하지는 않는다. |
| `038d2dc22373` | chore(repo): 컨테이너 스택 저장소 경계 설정 | B | SECRETS, OPERATIONS | 로컬 환경 파일, 평문 secret, log, PID file, host metadata를 ignore한다. | 필요한 저장소 trust boundary이지만, 프로젝트를 정의하는 runtime 결정이라기보다 일반적인 source-control hygiene를 적용한 구현이다. |
| `7fec90fdafed` | feat(env): 공개 스택 환경 변수 정의 | B | STACK, OPERATIONS | domain, database, WordPress metadata를 위한 버전 관리되는 공개 환경 변수 계약을 추가한다. | 배포 입력을 재현 가능하게 만들고 공개 설정과 credential을 분리하지만, 이후 아키텍처 안에서 일반적인 configuration scaffolding에 해당한다. |
| `f8ec9621725c` | feat(mariadb): Debian 서버 이미지 추가 | B | STACK, PERSISTENCE | custom Debian MariaDB image와 foreground daemon lifecycle을 만든다. | 프로젝트 소유 database service에 필요한 image지만, 주로 예상되는 container packaging과 ownership 규칙을 확립한다. |
| `1beb8e3c51d0` | feat(mariadb): 네트워크 DB 서버 설정 | B | STACK, PERSISTENCE | 명시적인 MariaDB network, path, charset, resource 설정을 설치한다. | database를 container 내부에서 예측 가능하게 만들지만, stack 전체 설계를 결정하기보다 하나의 service를 구체화한다. |
| `e13b0357a21b` | feat(mariadb): DB와 애플리케이션 계정 초기화 | A | BOOTSTRAP, SECRETS, CORE | 최초 MariaDB 초기화, account hardening, database 생성, idempotent volume 재사용을 추가한다. | 이후 staged bootstrap redesign이 일부를 대체하지만, 최초의 실질적인 state-creation mechanism이며 least-privilege database ownership을 확립한다. |
| `2227e6595e99` | feat(wordpress): Debian PHP-FPM 이미지 추가 | B | STACK | WordPress용 custom Debian PHP-FPM 및 WP-CLI image를 만든다. | 필요한 service 구성이나, 어려운 cross-service invariant를 도입하지 않고 이미 확립된 custom-image pattern을 따른다. |
| `ff3ce464395f` | feat(wordpress): PHP-FPM 풀 설정 | B | STACK, OPERATIONS | PHP-FPM network listener, 제한된 worker pool, ping endpoint, stream logging을 정의한다. | 적절한 container runtime 설정과 readiness 지원이지만 application service 내부에 국한된다. |
| `d764d066167b` | feat(wordpress): 사이트와 사용자 계정 초기화 | A | BOOTSTRAP, PERSISTENCE, CORE | idempotent WordPress core, configuration, site, user 초기화를 추가한다. | 영속 first-run convergence의 애플리케이션 측 절반을 도입하고 filesystem, database, account의 idempotency 경계를 분리한다. 이후 커밋에서 interruption-safe하게 강화된다. |
| `b32397121bb1` | feat(nginx): TLS 프런트엔드 이미지 추가 | B | STACK, SECRETS | HTTPS 전용 Nginx image와 runtime self-signed certificate 생성을 추가한다. | 외부 TLS 프로세스를 확립하지만 핵심 request routing과 stack integration 결정은 이후 커밋에서 이뤄진다. |
| `99c03f54399a` | feat(nginx): PHP 요청을 WordPress로 전달 | A | STACK, INTEGRATION, CORE | TLS policy, static delivery, WordPress front-controller routing, FastCGI forwarding, health endpoint를 추가한다. | 실제 외부 request path와 Nginx-to-PHP 책임 경계를 정의하므로 스택이 WordPress를 제공하는 방식을 이해하는 데 중요하다. |
| `a8b9f693c614` | feat(compose): 세 서비스 토폴로지 구성 | S | ARCH, STACK, CORE | Compose에 세 custom service, shared network, HTTPS 단일 publish, named persistent resource를 도입한다. | 시스템의 기반 topology다. 이 커밋이 빠지면 transport, application execution, durable state의 분리를 설명하는 핵심이 사라진다. |
| `968099138c58` | feat(compose): 공개 스택 설정 전달 | B | STACK, OPERATIONS | 필요한 공개 configuration value를 이를 사용하는 service에 매핑한다. | failure가 더 이른 시점에 드러나고 비밀이 아닌 설정의 노출도 줄이지만, 이미 선택된 topology 안에서 일반적인 configuration ownership을 적용한 작업이다. |
| `75590dedfb3a` | feat(compose): 준비 상태에 따라 영속 서비스 연결 | A | PERSISTENCE, INTEGRATION, OPERATIONS | durable data를 mount하고 service health check를 추가하며 dependency health에 따라 startup을 제어한다. | 단순 service 목록을 stateful하고 readiness-aware한 stack으로 바꾸며 세 container 전체의 중요한 persistence/lifecycle integration을 확립한다. |
| `916391b9f8db` | feat(secrets): 비밀번호를 비밀 파일에서 로드 | B | SECRETS, RISK | password environment value를 Compose secret file과 `_FILE` input으로 교체한다. | 의미 있는 중간 보안 개선이지만, 이후 one-off bootstrap architecture가 steady-state secret mount를 제거하며 최종적인 프로젝트 경계가 된다. |
| `41372f52d3d6` | build(make): 스택 수명주기 명령 추가 | B | OPERATIONS | 일반적인 Compose lifecycle operation을 위한 Make target을 추가한다. | operator entry point를 표준화하지만 확립된 Compose model을 감싸는 것 외에 독립적인 기술 판단은 크지 않다. |
| `5d461e4e9555` | test(static): 스택 소스 계약 검사 | B | TEST, OPERATIONS | stack layout, Dockerfile, configuration, secret policy에 대한 static source-contract validation을 추가한다. | 유용한 regression coverage를 제공하지만 초기 검사는 주로 이미 확립된 구조를 코드화한다. |
| `b697bc2523bb` | test(compose): 렌더링된 Compose 설정 검사 | B | TEST, STACK | Docker Compose를 사용할 수 있을 때 `make test`가 Compose model을 렌더링하도록 확장한다. | interpolation과 schema error를 더 일찍 잡지만 프로젝트를 정의하는 mechanism보다는 일반적인 validation layer다. |
| `1d0155f0362b` | test(smoke): HTTPS 상태 엔드포인트 검사 | B | TEST, STACK | 재시도하는 HTTPS health smoke check와 Make target을 추가한다. | 최초의 실행 가능한 frontend check지만 좁은 정상 경로만 검증하며 이후의 더 깊은 end-to-end guarantee까지 확립하지는 않는다. |
| `8804ac547b4a` | build(docker): 임시 파일을 빌드 컨텍스트에서 제외 | C | - | 세 service build context에 동일한 `.dockerignore` 파일을 추가한다. | 프로젝트 아키텍처나 correctness 설명에 미치는 영향이 거의 없는 기계적인 build-context 정리다. |
| `06d702396c5b` | test(docker): 서비스별 빌드 필터 검사 | C | - | 각 service build context에 `.dockerignore` 파일이 있어야 한다고 요구한다. | 바로 앞의 기계적인 파일 변경을 보호하는 작은 regression check로, 더 큰 엔지니어링 흐름에 기여하는 바가 적다. |
| `a8b7275457fc` | refactor(runtime): Compose 프로젝트 실행 경계 공통화 | A | ARCH, OPERATIONS | command 구성, timeout, rendered configuration, running-service discovery를 위한 공통 `ComposeProject` 추상화를 도입한다. | 이후 startup 및 management tooling이 이 실행 경계에 의존한다. 중복 lifecycle semantics를 크게 줄이지만 그 자체가 stack의 핵심 state model을 정의하지는 않는다. |
| `486ffb5c65aa` | refactor(secrets): 비밀 파일 로딩 경계 공통화 | A | SECRETS, RISK, ARCH | hardened secret-file read, rendered secret-path resolution, environment extraction, stdin payload 구성을 추가한다. | startup, backup, restore, rotation, diagnostics가 사용하는 중요한 trust boundary를 중앙화하지만 프로젝트 전체 lifecycle architecture를 단독으로 정의하기보다는 이를 지원한다. |
| `e77c6f151b07` | refactor(runtime): 프로젝트 관리 작업 잠금 공통화 | A | RECOVERY, OPERATIONS, RISK | private fixed directory에 사용자별·프로젝트별 non-blocking advisory lock을 추가한다. | 이후 startup, backup, restore, rotation 전체에서 management operation 직렬화는 핵심 concurrency invariant다. 다만 변경 자체는 전체 프로젝트 아키텍처가 아니라 집중된 mechanism이다. |
| `dc9601f5e670` | fix(init): 중단된 단계별 초기화를 수렴 | S | ARCH, BOOTSTRAP, RECOVERY | container 내부 first-run setup을 lock된 staged one-off bootstrap orchestration, completion marker, convergent restart 동작으로 교체한다. | 결정적인 lifecycle redesign이다. runtime secret mount를 제거하고 configuration state를 분리하며 interrupted initialization을 복구하고, persistent service를 안전하게 readiness까지 올리는 방식을 결정한다. |
| `3beebbfc4723` | test(init): 단계별 초기화 계약 검사 | B | TEST, BOOTSTRAP | staged MariaDB/WordPress bootstrap marker와 recovery structure에 대한 static assertion을 추가한다. | source pattern 수준에서 새 설계를 보호하지만 실제 interruption recovery까지 증명하지는 않는다. |
| `9d75a34e290f` | feat(runtime): 프로젝트·이미지·포트·URL 격리 | A | ARCH, STACK, OPERATIONS | fixed container name을 제거하면서 project name, image tag, HTTPS bind/port, canonical WordPress URL을 parameterize한다. | 여러 격리 stack을 가능하게 하고 이후 runtime test와 fresh-project restore의 기반이 되는 중요한 deployment-boundary 개선이다. |
| `2c436f574712` | test(bootstrap): 격리된 런타임 하네스 추가 | A | TEST, ARCH, OPERATIONS | private credential, random project name, dynamic port, cleanup, secret-boundary inspection을 갖는 격리 Docker runtime harness를 추가한다. | 이후 branch의 behavioral evidence를 위한 기반이 되며, 프로젝트를 source-validated configuration에서 재현 가능한 runtime verification으로 실질적으로 확장한다. |
| `8c9b5b9adef2` | test(e2e): HTTPS와 MariaDB를 잇는 WordPress 데이터 검증 | A | TEST, INTEGRATION, STACK | harness를 확장해 HTTPS health, WordPress post 생성/렌더링, MariaDB persistence, port-conflict recovery, legacy configuration migration을 테스트한다. | browser-to-database 전체 경로를 검증하고 static check가 잡을 수 없는 integration failure를 발견하므로 중요하지만 architectural implementation commit은 아니다. |
| `8ca2cc2b9d7d` | chore(test): Python 캐시 산출물 제외 | C | - | Python bytecode와 `__pycache__` directory를 ignore한다. | 동작이나 구조에 의미 있는 영향이 없는 일반적인 저장소 maintenance다. |
| `fb1a689cf969` | test(persistence): 재시작·재생성 뒤 상태 보존 검증 | A | TEST, PERSISTENCE, RISK | container restart/recreation 전후의 post, option, upload와 세 named volume을 모두 검증한다. | 핵심 durable-state invariant를 고정하고 container lifecycle과 volume lifecycle을 구분해 프로젝트의 주요 보장에 강한 근거를 제공한다. |
| `fdd55605ba74` | feat(backup): 백업 무결성과 비공개 파일 I/O 정의 | B | PERSISTENCE, OPERATIONS | backup 작업을 위한 SHA-256 helper, directory synchronization, exclusive private-file output primitive를 도입한다. | 필요한 low-level safety utility지만 프로젝트에서의 중요도는 이후 backup publication과 restore orchestration을 지원한다는 데 있다. |
| `d26c885c5cd5` | feat(backup): 관리 작업 신호와 테스트 중단 경계 추가 | A | RECOVERY, TEST, HARD | management-operation test를 위한 제어된 signal handling과 결정적인 failure/pause stage를 추가한다. | 일반 error와 동일한 cleanup path로 asynchronous cancellation을 안정적으로 검증할 수 있게 하는 중요한 failure-path engineering 경계이며 backup과 rotation test 전반에서 사용된다. |
| `2a42e5bc0c32` | feat(backup): 백업용 Compose 실행 어댑터 추가 | B | PERSISTENCE, OPERATIONS | streaming input/output과 bounded command category를 지원하는 backup 전용 Compose execution adapter를 추가한다. | 상당한 support code지만 backup mechanism을 준비하면서 이미 확립된 execution pattern을 주로 재구현한다. |
| `13548226f748` | feat(backup): WordPress 아카이브 입력 검증 | A | PERSISTENCE, RISK, EDGE | WordPress tar stream에서 absolute path, traversal, duplicate, non-regular archive member를 검증한다. | 잘못된 archive가 의도한 volume 밖에 쓰거나 지원하지 않는 filesystem object를 만들 수 있는 의미 있는 restore-input 공격 및 corruption 경계를 차단한다. |
| `3a0995ff0d4f` | feat(backup): 프로젝트별 백업 작업 잠금 적용 | B | RECOVERY, OPERATIONS, PERSISTENCE | per-project advisory lock model을 backup operation에 적용한다. | lock 자체는 중요하지만 새로운 프로젝트 전체 mechanism을 도입하기보다 기존 serialization 결정을 다른 management path로 확장한 작업이다. |
| `b478b5243c5a` | feat(backup): DB 덤프와 WordPress 볼륨 수집 | A | PERSISTENCE, CORE, INTEGRATION | transactional MariaDB dump와 WordPress data/config archive를 private file로 streaming한다. | database와 filesystem state를 아우르는 실질적인 data-capture path를 구현한 backup의 주요 구성요소지만 아직 atomic publication 보장까지 완성하지는 않는다. |
| `0540ff1b5a4b` | feat(backup): 백업 출력 경로를 안전하게 예약 | A | PERSISTENCE, RISK, EDGE | 새 backup output directory를 정규화·예약하고 정확한 inode identity를 추적한다. | 작은 interface지만 publication boundary에서 overwrite, symlink, path-substitution race를 막아 위험도가 높은 destructive/archive workflow의 무결성을 보호한다. |
| `6999190ffd34` | feat(backup): 백업 세트를 원자적으로 게시 | S | PERSISTENCE, RECOVERY, HARD | application writer를 중지하고 database/WordPress state를 수집하며 checksummed manifest를 작성해 set을 atomically publish하고 failure 시 service를 복구한다. | backup을 정의하는 transaction이다. directory를 유효한 backup으로 간주하기 위해 필요한 all-or-nothing publication과 service recovery 보장을 확립한다. |
| `81ce9acf5fa0` | feat(backup): 백업 CLI와 Make 타깃 연결 | B | PERSISTENCE, OPERATIONS | 검증된 CLI와 `make backup` target으로 backup을 노출한다. | 완성된 mechanism을 운영 가능하게 하지만 주로 기존 구현을 사용자 대상 command dispatch에 연결한다. |
| `b6920a0c918c` | test(backup): 게시 실패와 중단 정리 검증 | A | TEST, RECOVERY, PERSISTENCE | backup publication 실패, signal cancellation, service recovery, temporary cleanup, cross-`TMPDIR` lock contention에 대한 runtime check를 추가한다. | failure가 아무것도 publish하지 않고 live stack을 복구하며 scoped synchronization resource를 해제해야 한다는 atomic backup의 negative guarantee를 실질적으로 검증한다. |
| `e5cb60c7d743` | feat(restore): Compose 리소스 이름과 기존 객체 조회 | B | PERSISTENCE, OPERATIONS | 렌더링된 Compose resource name과 label 또는 관례적인 이름을 가진 기존 object를 탐색한다. | 필요한 restore plumbing이지만 주로 이후 커밋에서 개발되는 restore architecture 안의 resource inventory를 제공한다. |
| `851dc1708881` | feat(restore): 대상 프로젝트 자원 충돌 사전 차단 | A | PERSISTENCE, RISK, EDGE | 일치하는 container, volume, network가 이미 있는 restore target을 거부한다. | fresh-project enforcement는 live state를 덮어쓰거나 섞는 것을 방지하며 이후 모든 restore 단계의 중요한 safety precondition을 확립한다. |
| `953a0f6bd571` | feat(restore): 백업 입력의 형식과 체크섬 검증 | A | PERSISTENCE, RISK, EDGE | no-follow 및 lock 검사로 private backup set을 열고 정확한 file, manifest format, checksum, archive structure를 검증한다. | restore trust boundary를 만든다. 변경 가능하거나 대체된 input이 아니라 안정적이고 owner-controlled이며 내부적으로 일관된 하나의 backup을 사용하도록 보장한다. |
| `1250fcf7c006` | feat(restore): DB와 WordPress 데이터를 새 볼륨에 주입 | B | PERSISTENCE, INTEGRATION | SQL stream을 MariaDB에 import하고 WordPress archive를 비어 있는 data/config volume에만 추출한다. | 핵심 restore 작업이지만 이미 정의된 verified-input과 fresh-target 계약을 따르는 구현이며 rollback과 lifecycle safety는 이후에 추가된다. |
| `9ca04b1c30cd` | feat(restore): 실패한 복원 자원을 정리하고 롤백 | S | PERSISTENCE, RECOVERY, HARD | fresh database bootstrap, SQL import, WordPress extraction, application startup과 restore failure 시 전체 resource cleanup을 orchestration한다. | restore를 정의하는 mechanism이자 핵심 failure invariant다. 없으면 partial restoration이 그럴듯하지만 사용할 수 없는 project resource를 남겨 retry를 위험하게 만들 수 있다. |
| `3a37a491ecea` | feat(restore): 복원 CLI와 Make 타깃 연결 | B | PERSISTENCE, OPERATIONS | `restore` CLI dispatch와 guard가 있는 Make target을 추가한다. | 완성된 restore path를 노출하지만 correctness나 recovery model을 실질적으로 바꾸지는 않는다. |
| `4f8eb9aff842` | test(restore): 거부·롤백·복원 상태 검증 | A | TEST, RECOVERY, RISK | symlinked backup 거부, injected/signalled restore failure cleanup, 성공적인 data recovery, 두 번째 restore 거부를 테스트한다. | 실제 Docker resource에서 restore security와 rollback contract를 검증해 위험도가 높은 mechanism에 대한 신뢰를 크게 높인다. |
| `a2d20b8c2c03` | feat(secrets): 교체 비밀 파일을 안전하게 읽고 게시 | A | SECRETS, RISK, OPERATIONS | hardened replacement-secret read와 파일별 atomic/durable host-secret publication을 추가한다. | credential rotation의 host filesystem 측 경계를 확립하고 부분 기록된 개별 file이나 unsafe input type이 multi-system state transition에 들어오는 것을 막는다. |
| `8a41f018e6c3` | feat(secrets): Compose 자격증명 경로와 계정 설정 해석 | B | SECRETS, STACK | 렌더링된 Compose model에서 active secret path와 account identity를 resolve한다. | rotation에 필요한 configuration interpretation이지만 이미 확립된 rendered-model 경계 안의 support work다. |
| `832d182743ea` | feat(secrets): MariaDB 계정 비밀번호 원자 교체 | A | SECRETS, RISK, INTEGRATION | private option file을 통해 root-authenticated MariaDB SQL 실행과 application/root password 변경을 추가한다. | credential을 process argument에서 배제하고 SQL literal correctness를 유지하면서 credential rotation의 위험도가 높은 부분을 구현한다. |
| `0aa998fdd344` | feat(secrets): WordPress 설정과 사용자 비밀번호 교체 | A | SECRETS, RISK, INTEGRATION | atomic `wp-config.php` DB-password 교체와 WordPress 관리자/작성자 password 변경을 추가한다. | filesystem configuration과 application database state를 조정해 cross-subsystem rotation 문제의 WordPress 측을 확립한다. |
| `2d4afddfdc8f` | feat(secrets): 교체 전후 자격증명 동작 검사 | B | TEST, SECRETS | MariaDB application credential, WordPress user password, WordPress configuration의 DB password를 검사하는 probe를 추가한다. | 중요한 verification support지만 아직 rotation transaction이나 rollback 동작 자체를 정의하지는 않는다. |
| `617c5bd4c58a` | feat(secrets): 런타임 비밀 노출 경계 검사 | A | SECRETS, RISK, TEST | secret leakage를 찾기 위해 mount, container/process environment, command line, Nginx-visible file을 검사한다. | 프로젝트를 정의하는 steady-state security boundary를 고정한다. bootstrap credential은 long-running container에 남지 않아야 하고 private WordPress configuration은 Nginx가 접근할 수 없어야 한다. |
| `64844c583211` | feat(secrets): 신규 자격증명 수용과 기존 값 거부 검증 | A | TEST, SECRETS, RISK | 새 credential이 동작하고 기존 값은 실패하며 configuration이 일치하고 accepted/rejected value가 runtime metadata에 노출되지 않는지 검증한다. | 성공한 rotation에는 positive/negative authentication evidence가 모두 필요하다. command success에서 추론하는 대신 state transition을 직접 검증할 수 있게 한다. |
| `c68486d55f30` | feat(secrets): 회전 실패 시 기존 자격증명 복구 | A | SECRETS, RECOVERY, HARD | rotation failure 후 database account, WordPress configuration/user, host file, 검증된 running stack을 복원하는 compensation을 추가한다. | 중요한 multi-store rollback engineering이지만 다음 correction에서 아직 다루지 못한 모호한 command/signal state를 추가로 해결한다. |
| `9934b478c79a` | feat(secrets): 스택 자격증명 회전 절차 연결 | S | SECRETS, RECOVERY, CORE | 전체 credential rotation sequence를 조정·직렬화하고 service를 recreate하며 새 값 수용/기존 값 거부를 검증하고 failure 시 compensation을 실행한다. | credential rotation은 네 host file, MariaDB account, WordPress user, application configuration을 아우르는 프로젝트의 핵심 management mechanism이며 이 커밋이 그 transaction을 확립한다. |
| `2e6649a7706d` | fix(secrets): 회전 중단과 불명확한 상태를 보상 | S | SECRETS, RECOVERY, HARD | stage-level failure injection, interruption handling, 모호한 post-write compensation, rollback 중 signal defer를 추가한다. | rotation transaction의 눈에 잘 드러나지 않는 partial-state hazard를 수정한다. operator cancellation이나 불확실한 command 결과가 recovery 자체를 중단하지 않도록 하는 방식을 설명하는 데 필수적이다. |
| `0da35c72add5` | test(secrets): 회전 롤백과 재시도 검증 | A | TEST, SECRETS, RECOVERY | 성공한 rotation, 여러 post-write failure, host-file publication 중 signal interruption, rollback, leak check, 동일 input 재시도를 실행한다. | 프로젝트에서 가장 어려운 state transition 중 하나에 강한 실제 시스템 근거를 제공하고 compensation ordering regression을 방지한다. |
| `3e29fbd34389` | build(images): Debian 이미지와 패키지 입력 고정 | A | SUPPLY_CHAIN, RISK, ARCH | 모든 service base image를 digest로 pin하고 Debian package를 immutable dated snapshot으로 전환한다. | application behavior를 바꾸지는 않지만 build trust model을 moving upstream input에서 검토된 immutable input으로 바꾸는 중요한 reproducibility/supply-chain 결정이다. |
| `f60ac8061c01` | build(wordpress): WordPress 산출물을 고정해 게시 | A | SUPPLY_CHAIN, BOOTSTRAP, RISK | WP-CLI와 WordPress archive를 checksum으로 pin하고 WordPress core를 image에 staging하며 bootstrap에서 file을 atomically reconcile하고 자동 core update를 비활성화한다. | initialization의 runtime download를 제거하고 application artifact를 immutable하고 검증된 build input으로 만들어 reproducibility와 recovery semantics를 크게 강화한다. |
| `7b28cccaec1d` | test(supply-chain): 불변 image 입력 검증 | A | TEST, SUPPLY_CHAIN, RISK | immutable Debian/WordPress pin을 static하게 검사하고 실행 중인 WordPress 및 WP-CLI version을 검증한다. | 새로 확립한 supply-chain contract가 moving input이나 runtime download로 조용히 되돌아가는 것을 방지한다. |
| `27a3dca01d3b` | feat(network): DB 트래픽을 내부 backend로 격리 | A | STACK, RISK, ARCH | frontend/backend network를 분리하고 MariaDB를 internal backend에만 연결한다. | database communication boundary를 실질적으로 좁히고 WordPress를 request-serving network와 persistence network 사이의 유일한 bridge로 만든다. |
| `911544133fb4` | feat(runtime): 서비스 자원과 종료 한계 적용 | B | OPERATIONS, RISK, STACK | 모든 service에 CPU, memory, PID, file descriptor, stop signal, privilege, log rotation 제한을 적용한다. | 폭넓고 유용한 policy지만 core state나 data flow를 바꾸기보다 이미 정의된 runtime에 표준 operational hardening을 적용한다. |
| `dd3be1036017` | feat(nginx): 접근·오류 로그를 컨테이너 스트림에 게시 | B | OPERATIONS, STACK | Nginx access/error log를 container output stream으로 보낸다. | 새로운 lifecycle이나 correctness mechanism을 도입하지 않고 일반적인 container logging pattern으로 observability를 개선한다. |
| `102af1f113ed` | refactor(nginx): 스택 전용 TLS 산출물 이름 사용 | C | - | 생성되는 TLS certificate/key를 기존 project 이름에서 `container-stack` 이름으로 변경한다. | security, routing, lifecycle에 영향이 없는 기계적인 naming cleanup이다. |
| `74c285925325` | fix(make): 볼륨 삭제 전에 확인을 요구 | A | OPERATIONS, RISK, EDGE | `fclean`이 volume과 local image를 삭제하기 전에 정확한 project-name confirmation을 요구한다. | 매우 작은 diff지만 프로젝트에서 가장 파괴적인 operator action을 보호하고 중요한 ownership/data-loss 경계를 복원한다. |
| `fe313b9a452d` | build(compose): 엄격한 설정 검사 추가 | B | TEST, OPERATIONS | Docker 또는 Compose v2를 사용할 수 없으면 실패하는 strict Compose-rendering target을 추가한다. | 신뢰할 수 있는 preflight check를 제공하지만 일반적인 build/configuration validation 범위에 해당한다. |
| `ef74ad47ea81` | feat(diagnostics): Compose 비밀값과 민감 항목 마스킹 | A | OPERATIONS, SECRETS, RISK | 렌더링된 Compose configuration에서 secret path/value를 파생하고 credential 및 민감 assignment의 fail-closed redaction을 정의한다. | diagnostics 자체가 leakage channel이 될 수 있으므로 필요한 secret을 읽어 redact할 수 없으면 수집을 중단한다는 핵심 규칙을 확립한다. |
| `511f5e62e5e7` | feat(diagnostics): 컨테이너 런타임 상태 수집 | B | OPERATIONS | 선택된 container lifecycle, health, limit, logging, security, network state를 수집한다. | 유용한 diagnostic content를 추가하지만 private publication과 redaction 보장은 인접한 커밋에서 확립된다. |
| `27a083d91c87` | feat(diagnostics): 비공개 진단 세트와 CLI 연결 | A | OPERATIONS, SECRETS, RISK | allowlist된 redacted Compose/log/version/container-state file로 구성된 exclusive private diagnostic directory를 publish한다. | 기존 output을 덮어쓰거나 credential material을 노출하지 않고 failure evidence를 활용할 수 있게 하여 안전한 observability mechanism을 완성한다. |
| `7fbd41fe5af4` | test(operations): 자원·격리·삭제 보호·진단 검증 | A | TEST, OPERATIONS, RISK | runtime limit, network membership, destructive-action refusal, fail-closed redaction, file permission, overwrite refusal, symlink-output rejection을 검증한다. | configuration inspection만으로는 증명할 수 없는 여러 operational/security boundary를 실제로 검증한다. |
| `9ddd4317e3b9` | fix(smoke): HTTPS 연결과 응답 대기시간 제한 | B | OPERATIONS, EDGE | HTTPS smoke loop에 connection 및 total-response timeout을 추가한다. | unavailable endpoint가 retry 하나를 무기한 멈추는 것을 방지하는 유용한 reliability correction이지만 프로젝트를 정의하는 변경은 아니다. |
| `f905e83f915e` | test(smoke): HTTPS timeout 계약 검사 | C | - | smoke script가 두 curl timeout option을 모두 유지하는지 static check를 추가한다. | 두 option의 shell 변경을 위한 좁은 regression assertion으로 독립적인 엔지니어링 중요도는 낮다. |
| `98e4af62e884` | test(runtime): 프로세스·비밀값·정리 제어 흐름 강화 | A | TEST, RECOVERY, OPERATIONS | private fixture replacement를 durable하게 만들고 start command 구성을 분리하며 timeout diagnostics를 개선하고 cleanup failure를 test failure로 처리한다. | 성공한 scenario가 leaked resource나 incomplete teardown을 숨기지 못하도록 verification control plane을 강화하며, 광범위한 runtime suite에 중요한 reliability property다. |
| `2bf6d3f11337` | test(init): 안정 단계별 초기화 중단 복구 검증 | A | TEST, BOOTSTRAP, RECOVERY | 모든 durable stage에서 MariaDB/WordPress bootstrap container를 종료하고 startup을 재실행해 state, credential, marker, temporary-file cleanup을 검증한다. | staged-convergence invariant에 매우 강한 근거를 제공하며 핵심 initialization 설계가 graceful error뿐 아니라 abrupt process death에서도 살아남음을 보여 준다. |
| `030e7310c665` | test(backup): 자원 충돌과 시그널 경계 검증 | A | TEST, PERSISTENCE, EDGE | signal race, label/name 기반 restore collision 거부, 큰 filesystem/database fixture, checksum, 강화된 secondary cleanup reporting을 추가한다. | 작은 정상 경로 fixture와 단순 cancellation로는 다루지 못하는 boundary condition을 테스트해 backup/restore의 integrity와 lifecycle guarantee를 보호한다. |
| `2557079c2d19` | test(secrets): 회전 후 런타임 비밀 경계 고정 | B | TEST, SECRETS | rotation test가 obsolete runtime secret mount에 의존하지 못하게 하고 post-rotation cleanup check를 요구한다. | 의도한 secret architecture를 보존하지만 새로운 security mechanism보다 집중된 regression guard에 가깝다. |
| `2b35aa3d2217` | test(cleanup): 테스트 프로젝트 소유 자원만 정리 | A | OPERATIONS, RECOVERY, RISK | 정확한 test project ownership을 기록하고 소유한 Compose resource/image tag만 제거하며 private report를 남기는 scoped crash-recovery cleanup tool을 추가한다. | 광범위한 Docker pruning 없이 위험도가 높은 verification-lifecycle 문제를 해결해 failed test가 무관한 developer/CI resource를 손상하지 못하게 한다. |
| `43ccded05e4f` | test(verify): 전체 스택 검증을 직렬 실행 | A | TEST, OPERATIONS, RECOVERY | static check와 모든 runtime scenario를 scenario별 timeout, shared project record, 필수 final leak recovery와 함께 직렬 실행한다. | 완전한 local verification transaction을 정의하고 resource cleanliness를 성공 조건에 포함해 신뢰도와 failure attribution을 크게 높인다. |
| `1238479a40f2` | ci(stack): 커밋 범위 공백 검사 도구 추가 | B | TEST, OPERATIONS | 안전한 fallback 동작을 갖는 검증된 commit-range `git diff --check` helper를 추가한다. | 새 변경 범위로 whitespace check를 제한하는 유용한 CI plumbing이지만 stack runtime engineering과의 관련성은 낮다. |
| `18508c25eef0` | ci(stack): 정적·런타임·복구 검증 자동화 | A | TEST, OPERATIONS, SUPPLY_CHAIN | 모든 static/runtime scenario, scoped cleanup, allowlisted failure diagnostics를 실행하는 least-privilege pinned-action GitHub Actions workflow를 추가한다. | product runtime behavior를 바꾸지는 않지만 프로젝트의 verification, supply-chain, resource-ownership policy를 automation으로 통합하는 중요한 변경이다. |
| `8a6c07988160` | test(ci): workflow 검증 계약 추가 | A | TEST, OPERATIONS, RISK | workflow permission, action pin, scenario ordering, timeout, secret boundary, cleanup semantics, safe subprocess use를 enforce하도록 static/AST-based check를 확장한다. | verification system 자체가 미묘하게 약화되는 것을 막고 여러 tool에 걸친 security/lifecycle property에 layered evidence를 제공한다. |
| `8d028040544e` | test(docs): README 운영 안내 계약 검증 | C | - | README가 기본 project, service, secret, verification 용어를 한국어로 유지하도록 요구한다. | discoverability는 개선하지만 runtime/recovery 작업에 비해 기술적 중요도가 낮은 documentation-contract maintenance다. |
| `cd5982c8ea42` | fix(supply-chain): 보안 지원 runtime pin 갱신 | B | SUPPLY_CHAIN, RISK | 검토된 Debian digest, package snapshot, WordPress version/checksum, 대응 assertion을 갱신한다. | security/support 측면에서 중요하지만 새로운 trust model을 도입하지 않고 이미 확립된 immutable-input mechanism을 따른 update다. |
| `127a70f6e4b2` | test(supply-chain): 검토된 runtime 최소 버전 검증 | A | TEST, SUPPLY_CHAIN, RISK | 설치된 package minimum과 실행 중인 PHP/MariaDB compatibility floor를 검증한다. | source pin과 실제 runtime content 사이의 간극을 닫아 security-sensitive build path의 stale cache나 예상치 못한 package resolution을 잡는다. |
| `e9fa836de879` | docs(project): 프로젝트 문서 정리 | C | - | 초기 README를 포괄적인 architecture, operation, recovery, development-history 문서로 교체한다. | 유용한 operator documentation이지만 문서 전용이며 완성된 system이나 검증된 invariant를 바꾸지 않는다. |

# 개발 흐름

## 흐름: custom service에서 readiness-aware three-tier stack으로
`f8ec9621725c` B — 프로젝트 소유 MariaDB runtime과 persistent-data ownership을 확립했다.
↓
`e13b0357a21b` A — 최초 idempotent database/account bootstrap을 추가했다.
↓
`d764d066167b` A — WordPress filesystem, site, user convergence를 추가했다.
↓
`99c03f54399a` A — HTTPS-to-FastCGI request boundary를 정의했다.
↓
`a8b9f693c614` S — 세 service의 책임을 핵심 Compose topology로 구성했다.
↓
`75590dedfb3a` A — named volume, health check, dependency readiness를 연결했다.

**의의**
이 흐름은 개별적으로 실행 가능한 container에서 하나의 stateful application system으로 발전한다. 결정적인 단계는 세 image의 존재가 아니라 Compose 책임 경계다. Nginx는 외부 transport, WordPress는 application execution, MariaDB는 durable relational state를 담당한다. health-gated dependency와 mounted volume이 더해지면서 topology는 단순히 연결된 구성이 아니라 운영 의미를 갖는 시스템이 된다.

## 흐름: runtime secret mount에서 convergent one-off bootstrap으로
`916391b9f8db` B — 일반 environment value의 비밀번호를 Compose secret file로 옮겼다.
↓
`486ffb5c65aa` A — hardened host secret-file resolution/read를 중앙화했다.
↓
`e77c6f151b07` A — 프로젝트별 management-operation serialization을 확립했다.
↓
`dc9601f5e670` S — steady-state secret mount와 one-shot initialization을 staged one-off bootstrap으로 교체했다.
↓
`3beebbfc4723` B — completion marker와 staged recovery의 source contract를 추가했다.
↓
`2bf6d3f11337` A — 모든 durable stage에서 bootstrap container를 종료하고 rerun convergence를 증명했다.

**의의**
초기 `_FILE` 및 Compose-secret model은 직접적인 environment 노출을 줄였지만 여전히 credential material을 service startup에 연결했다. 이후 아키텍처는 project lock을 보유한 상태에서 host에서 secret을 resolve하고, 필요한 값만 short-lived bootstrap container로 보내며, long-running service는 검증된 persistent state에서 시작한다. 마지막 SIGKILL scenario는 controlled error뿐 아니라 process death 이후에도 설계 의도대로 수렴하는지를 검증한다는 점에서 중요하다.

## 흐름: 격리된 runtime evidence와 persistent-state verification
`9d75a34e290f` A — 고정된 project, image, port, URL identity를 제거했다.
↓
`2c436f574712` A — 격리 Docker runtime harness와 secret-boundary inspection을 만들었다.
↓
`8c9b5b9adef2` A — HTTPS, FastCGI, WordPress, MariaDB 전체 data path를 검증했다.
↓
`fb1a689cf969` A — restart/recreation 전후의 database, option, upload, volume identity를 검증했다.

**의의**
parameterization으로 독립적인 test project를 만들 수 있게 되었고, harness는 이 parameter를 제어된 Docker resource와 private credential로 구체화했다. end-to-end scenario와 persistence scenario는 서로 다른 속성을 증명한다. 전자는 통합된 request/data path가 동작함을 확인하고, 후자는 container 교체가 authoritative volume state를 교체하지 않음을 확인한다.

## 흐름: failure와 cancellation 상황의 atomic backup publication
`fdd55605ba74` B — private output, synchronization, checksum primitive를 정의했다.
↓
`d26c885c5cd5` A — 결정적인 signal/failure test boundary를 만들었다.
↓
`3a0995ff0d4f` B — 같은 project의 다른 operation과 backup을 직렬화했다.
↓
`b478b5243c5a` A — transactional MariaDB 및 WordPress volume stream을 수집했다.
↓
`0540ff1b5a4b` A — destination path를 예약하고 identity를 검증했다.
↓
`6999190ffd34` S — 완전한 checksummed backup set을 atomically publish하고 service를 복구했다.
↓
`b6920a0c918c` A — failure 시 non-publication, cleanup, recovery, shared-lock 동작을 검증했다.
↓
`030e7310c665` A — signal race, large data, collision boundary까지 evidence를 확장했다.

**의의**
구현은 data capture와 publication을 의도적으로 분리한다. private streaming file, 정확한 output reservation, manifest, directory replacement를 통해 완전한 set만 외부에 보이게 한다. signal-aware recovery와 negative runtime test는 반대 방향의 보장도 확립한다. 취소되거나 실패한 작업은 그럴듯한 backup이나 degraded source stack을 남겨서는 안 된다.

## 흐름: 검증된 fresh-project restore와 cleanup rollback
`e5cb60c7d743` B — 렌더링된 이름과 관례적인 이름의 Docker resource를 매핑했다.
↓
`851dc1708881` A — 빈 target project를 restore의 precondition으로 만들었다.
↓
`953a0f6bd571` A — private하고 lock되며 checksum으로 검증되는 backup input boundary를 확립했다.
↓
`1250fcf7c006` B — SQL 및 WordPress stream을 비어 있는 새 volume에 주입했다.
↓
`9ca04b1c30cd` S — startup을 orchestration하고 failure 후 모든 partial resource를 제거했다.
↓
`3a37a491ecea` B — CLI와 Makefile로 restore를 노출했다.
↓
`4f8eb9aff842` A — malformed input 거부, failure cleanup, interruption, successful state를 검증했다.
↓
`030e7310c665` A — stopped/unlabelled collision case와 large restored fixture를 추가했다.

**의의**
restore는 in-place overwrite가 아니라 새 project 생성으로 취급한다. 이 제약 덕분에 rollback이 단순해진다. collision check 이후에만 verified input을 적용하고, failure가 발생하면 해당 시도가 만든 resource를 제거할 수 있다. 이후 test는 거부 과정에서 pre-existing object가 보존되고 streaming implementation이 작은 fixture를 넘어선 데이터에서도 올바르게 동작함을 보여 준다.

## 흐름: coordinated credential rotation과 compensation
`a2d20b8c2c03` A — 안전한 replacement input과 atomic host-file publication을 확립했다.
↓
`832d182743ea` A — MariaDB application/root credential 변경을 구현했다.
↓
`0aa998fdd344` A — WordPress configuration/user credential 변경을 구현했다.
↓
`64844c583211` A — replacement credential은 동작하고 previous value는 실패하도록 요구했다.
↓
`c68486d55f30` A — 이전 verified state로의 cross-store rollback을 추가했다.
↓
`9934b478c79a` S — ordered, locked, verified rotation transaction을 연결했다.
↓
`2e6649a7706d` S — ambiguous post-write failure를 보상하고 rollback 중 signal을 지연했다.
↓
`0da35c72add5` A — 정상 rotation, injected failure, interruption, rollback, leak check, retry를 실행했다.
↓
`2557079c2d19` B — test가 steady-state secret boundary를 약화하지 못하게 했다.

**의의**
credential은 네 host file, 두 MariaDB account, 두 WordPress user, WordPress configuration에 걸쳐 표현된다. 따라서 이 흐름은 개별 mutation primitive에서 verified state transition으로 발전하고, state를 변경한 뒤 실패할 수 있는 command까지 처리하는 compensation으로 이어진다. rollback 중 추가 termination을 지연하는 것이 recovery 자체가 다시 중단되는 것을 막는 핵심 보정이다.

## 흐름: immutable build input과 runtime supply-chain evidence
`3e29fbd34389` A — Debian base image와 package repository를 immutable input으로 pin했다.
↓
`f60ac8061c01` A — WordPress/WP-CLI artifact를 pin하고 core publication을 bootstrap reconciliation으로 옮겼다.
↓
`7b28cccaec1d` A — source pin과 실행 중인 application version을 test로 고정했다.
↓
`cd5982c8ea42` B — moving input으로 돌아가지 않고 검토된 immutable runtime set을 갱신했다.
↓
`127a70f6e4b2` A — 설치된 package minimum과 live PHP/MariaDB compatibility floor를 검증했다.

**의의**
reproducibility를 일회성 freeze가 아니라 유지보수되는 contract로 취급한다. 초기 commit은 upstream identity를 명시하고, 이후 update는 supported version을 어떻게 올리는지 보여 주며, runtime inspection은 Dockerfile의 문자열과 container에서 실제 실행되는 software 사이의 간극을 닫는다.

## 흐름: operational hardening, private diagnostics, bounded automation
`27a3dca01d3b` A — public request traffic과 internal database network를 분리했다.
↓
`911544133fb4` B — resource, stop, privilege, log-rotation policy를 적용했다.
↓
`74c285925325` A — 정확한 project confirmation으로 파괴적 volume 삭제를 보호했다.
↓
`ef74ad47ea81` A — fail-closed diagnostic redaction을 확립했다.
↓
`27a083d91c87` A — exclusive private diagnostic set을 publish했다.
↓
`7fbd41fe5af4` A — runtime limit, network membership, deletion refusal, diagnostic safety를 검증했다.
↓
`98e4af62e884` A — scenario cleanup failure가 verification result에 반영되도록 했다.
↓
`2b35aa3d2217` A — 정확한 project ownership을 추적하고 scoped leak recovery를 추가했다.
↓
`43ccded05e4f` A — 전체 local verification lifecycle을 직렬화했다.
↓
`18508c25eef0` A — least-privilege 및 pinned CI action 아래에서 모든 scenario를 자동화했다.
↓
`8a6c07988160` A — workflow, tool timeout, secret boundary, cleanup, artifact allowlist를 검증했다.

**의의**
이 흐름은 운영 policy를 실행 가능한 evidence로 바꾼다. live container에서 runtime limit과 network boundary를 검사하고, destructive command와 diagnostics는 안전하게 실패하며, local/CI runner 모두 자신이 만든 모든 project resource를 추적한다. cleanup tooling은 global Docker pruning을 의도적으로 피하고 제품 management path와 동일한 ownership discipline을 유지한다.

# 가장 중요한 커밋

## feat(compose): 세 서비스 토폴로지 구성
커밋: `a8b9f693c614`  
중요도: S  
태그: ARCH, STACK, CORE

### 문제
프로젝트에는 독립적으로 빌드된 Nginx, WordPress, MariaDB container가 있었지만, 이들의 책임이 하나의 시스템을 어떻게 구성하는지, 어느 service가 host에 노출될 수 있는지, 어떤 resource가 stack에 속하는지를 정의하는 authoritative declaration은 없었다.

### 결정
Compose가 세 service topology를 소유하도록 했다. Nginx만 HTTPS를 publish하고 service-name DNS로 container를 연결하며, durable application/database state를 위한 named volume을 선언했다.

### 중요한 이유
이후의 모든 lifecycle, security, persistence, test 결정은 이 분리를 전제로 한다. backup은 Nginx와 WordPress를 중지한 채 MariaDB를 dump하고, 이후 network hardening은 같은 topology를 분리하며, runtime test는 Compose project를 기준으로 resource를 식별한다.

### 변경 사항
custom image build, restart policy, 하나의 bridge network, Nginx만의 port 443 publication, MariaDB/WordPress named volume을 포함하는 초기 `docker-compose.yml`을 추가했다.

### 프로젝트 이해에 중요한 이유
transport terminator, application runtime, persistence owner, internal service discovery, 단일 external entry point를 가장 짧고 완전하게 표현한 프로젝트 아키텍처다.

## refactor(runtime): 프로젝트 관리 작업 잠금 공통화
커밋: `e77c6f151b07`  
중요도: A  
태그: RECOVERY, OPERATIONS, RISK

### 문제
startup, backup, restore, credential rotation은 모두 같은 container, volume, account, configuration을 검사하고 변경한다. 두 작업이 각각은 올바르더라도 서로 interleave되면 각자의 전제를 깨뜨릴 수 있다.

### 결정
`/tmp` 아래 사용자별 lock directory와 project name에서 파생한 lock file을 사용해 non-blocking exclusive `flock` 직렬화를 제공한다. lock을 신뢰하기 전에 ownership, permission, file type, no-follow open을 검증한다.

### 중요한 이유
이 lock은 host-side management의 concurrency boundary를 정의한다. 서로 다른 project name은 동시에 동작할 수 있지만, 하나의 project를 경쟁하는 management process가 동시에 bootstrap, backup, restore, rotation할 수는 없다.

### 변경 사항
공유 runtime module에 `project_operation_lock`을 추가했다. 이후 backup과 rotation code도 같은 고정 lock identity를 사용하고, test는 서로 다른 `TMPDIR`을 사용해도 같은 lock에서 경합함을 증명했다.

### 프로젝트 이해에 중요한 이유
이 A 등급 커밋은 각 management tool을 따로 읽으면 놓치기 쉬운 cross-cutting invariant를 설명하기 때문에 선정했다. consistency는 내부 rollback뿐 아니라 concurrent state transition을 배제하는 데도 의존한다.

## fix(init): 중단된 단계별 초기화를 수렴
커밋: `dc9601f5e670`  
중요도: S  
태그: ARCH, BOOTSTRAP, RECOVERY

### 문제
초기 entrypoint는 일반 service startup 중 persistent volume을 초기화하고 mounted secret file을 사용했다. 갑작스러운 종료 시 부분적으로 생성된 data가 재사용 가능한 것처럼 남을 수 있었고, steady-state container도 bootstrap credential에 대한 접근 경로를 유지했다.

### 결정
초기화를 `start_stack.py`가 구동하는 명시적으로 이름 붙은 one-off container로 옮겼다. MariaDB는 staging directory에서 state를 만든 뒤 검증 후에만 publish하고, WordPress는 completion marker를 기록하기 전에 core file, private configuration, site state, user를 reconcile한다. secret은 host에서 읽어 bootstrap command에만 표준 입력으로 전달한다.

### 중요한 이유
lifecycle model을 '시작하고 first-run setup이 끝나기를 기대하는 방식'에서 'persistent state를 수렴시키고 완료 표시를 남긴 뒤 service를 실행하는 방식'으로 바꾼다. 또한 최종 bootstrap/runtime secret boundary를 확립한다.

### 변경 사항
Compose에 별도 WordPress configuration storage와 marker-aware health check를 추가하고, MariaDB/WordPress entrypoint를 크게 재작성했으며, Make target이 staged startup을 호출하도록 했다. 새 orchestrator는 project lock 아래에서 database와 application 단계를 순서대로 실행한다.

### 프로젝트 이해에 중요한 이유
이 branch의 핵심 correctness 전환점이다. service recreation이 안전한 이유, partial initialization을 재시도할 수 있는 이유, health check가 durable marker를 포함하는 이유, long-running container에 host secret mount가 필요하지 않은 이유를 설명한다.

## feat(backup): 백업 세트를 원자적으로 게시
커밋: `6999190ffd34`  
중요도: S  
태그: PERSISTENCE, RECOVERY, HARD

### 문제
database dump와 filesystem archive 명령이 모두 성공했다고 해서 곧바로 backup이 되는 것은 아니다. 한쪽을 capture하는 동안 application이 다른 쪽을 변경할 수 있고, partial file이 완전한 set으로 오인될 수 있으며, interruption으로 live stack이 중지된 채 남을 수도 있다.

### 결정
backup operation은 세 service가 모두 실행 중이어야 한다. application writer를 제거하기 위해 Nginx와 WordPress를 중지하고, single-transaction MariaDB dump와 WordPress archive를 sibling temporary directory에 streaming한다. checksum과 manifest를 작성하고 directory를 동기화한 뒤, 미리 예약한 빈 destination을 atomically replace한다. `finally` path는 service를 재시작하고 불완전한 temporary state를 제거한다.

### 중요한 이유
외부에서 보이는 backup directory 자체가 publication boundary가 된다. 완전하고 내부적으로 기술된 set으로 존재하거나 아예 publish되지 않는다. source stack 복구도 같은 operation contract의 일부다.

### 변경 사항
secret loading, service-state check, temporary storage, capture function, manifest 생성, archive validation, inode-identity verification, atomic rename, service restart, cleanup을 signal-aware lock 아래에서 하나로 연결했다.

### 프로젝트 이해에 중요한 이유
이 프로젝트에서 'backup correctness'가 무엇인지 정의한다. 이 커밋이 신뢰할 수 있는 backup publication unit을 먼저 확립했기 때문에 이후 restore checksum과 runtime test가 의미를 갖는다.

## feat(restore): 실패한 복원 자원을 정리하고 롤백
커밋: `9ca04b1c30cd`  
중요도: S  
태그: PERSISTENCE, RECOVERY, HARD

### 문제
restore는 container, network, volume, database state, WordPress file을 순서대로 생성한다. 어느 단계에서든 실패하면 점유된 것처럼 보이지만 안전하게 실행할 수도, 다시 시도할 수도 없는 project가 남을 수 있다.

### 결정
restore는 verified-input 및 fresh-project check를 통과한 뒤에만 실행한다. MariaDB를 bootstrap하고 database를 import하며 WordPress data를 추출하고 application을 시작한다. resource 생성 이후 failure가 발생하면 이를 잡아 cleanup한다. cleanup은 `compose down --volumes`를 수행한 뒤 label과 관례적인 이름으로 resource를 독립적으로 다시 확인하고, 하나라도 남으면 실패로 처리한다.

### 중요한 이유
재시도 가능한 명확한 경계를 만든다. 실패한 restore는 이후 시도가 old/new state의 알 수 없는 혼합을 해석하도록 두는 대신 자신이 만든 target resource를 제거한다.

### 변경 사항
`cleanup_failed_restore`와 전체 `restore_backup` orchestration을 추가했다. 여기에는 project locking, secret loading, database/application startup 재사용, injected failure point, restore와 cleanup이 함께 실패할 때의 error chaining이 포함된다.

### 프로젝트 이해에 중요한 이유
atomic backup publication에 대응하는 restore 측 핵심이다. 두 mechanism을 함께 보면 partial target이 완료된 recovery처럼 보이는 것을 허용하지 않으면서 persistent state가 project 사이를 이동하는 방식을 이해할 수 있다.

## feat(secrets): 스택 자격증명 회전 절차 연결
커밋: `9934b478c79a`  
중요도: S  
태그: SECRETS, RECOVERY, CORE

### 문제
credential rotation은 비밀번호 하나를 대입하는 작업이 아니다. 같은 logical credential set이 host file, MariaDB root/application account, WordPress administrator/author hash, `wp-config.php`에 분산되어 있다.

### 결정
management command가 완전한 replacement set을 검증하고 현재 state를 먼저 확인한 뒤 Nginx를 중지한다. WordPress user와 configuration을 변경하고 MariaDB application/root credential을 갱신한 뒤 host file을 atomically publish하고 service를 force-recreate한다. 마지막으로 replacement value는 동작하고 previous value는 실패하는지 검증한다. 예외가 발생하면 project lock 아래에서 cross-store rollback을 수행한다.

### 중요한 이유
credential이 일시적으로 불일치하는 동안 public frontend가 요청을 처리하지 못하게 하며, 최종 positive/negative check를 통해 결과 authentication state를 명시적으로 확정한다.

### 변경 사항
이전의 모든 rotation primitive를 `_rotate`에 연결하고 CLI와 Make target을 추가했다. distinct replacement value와 account identity를 강제하고 host-file verification 및 compensation을 연결했다.

### 프로젝트 이해에 중요한 이유
프로젝트를 정의하는 state transaction 중 하나다. 이를 이해하면 저장소가 bootstrap, backup, restore와 동일한 lifecycle 엄격성으로 운영 보안 변경을 다루는 방식을 알 수 있다.

## fix(secrets): 회전 중단과 불명확한 상태를 보상
커밋: `2e6649a7706d`  
중요도: S  
태그: SECRETS, RECOVERY, HARD

### 문제
failure를 보고한 command가 이미 password를 변경하거나 file을 replace했을 수 있다. host file 변경 이후 또는 compensation 실행 중에도 signal이 도착할 수 있다. 기존 rollback path는 이러한 모호한 post-write state를 모두 구분하지 못했다.

### 결정
rotation tool에 개별 write 전후의 명시적인 failure stage, synchronized pause marker, 제어된 `SIGINT`/`SIGTERM` handling, `rollback_active` state를 추가했다. 첫 signal은 compensation으로 진입시키고 rollback이 끝날 때까지 추가 termination signal은 지연한다. recovery probe로 현재 동작하는 root credential을 찾아 각 state store를 그에 맞게 복원한다.

### 중요한 이유
프로젝트에서 가장 어려운 failure class를 처리한다. caller는 command exit status만으로 state를 추론할 수 없다. compensation은 실제 state를 검사해 수렴시켜야 하며 recovery 자체도 interruption으로부터 보호해야 한다.

### 변경 사항
WordPress user, configuration, MariaDB application/root credential, host-file publication, service recreation 전반에 failure injection을 확장했다. rollback-ready synchronization과 complete/incomplete compensation 구분도 더 명확하게 만들었다.

### 프로젝트 이해에 중요한 이유
실제 transaction manager를 공유하지 않는 여러 시스템에서 일반적인 error handling과 robust transaction-like recovery가 어떻게 다른지 보여 준다. 최종 credential-rotation guarantee를 설명하는 데 필수적인 correction이다.

## test(init): 안정 단계별 초기화 중단 복구 검증
커밋: `2bf6d3f11337`  
중요도: A  
태그: TEST, BOOTSTRAP, RECOVERY

### 문제
static pattern과 graceful failure injection만으로는 data, marker, temporary directory가 publish되는 정확한 시점의 abrupt process death에서도 staged initialization이 살아남는지 증명할 수 없다.

### 결정
runtime harness가 synchronized pause stage와 함께 실제 production bootstrap command를 실행하고, one-off container의 ownership label을 검증한 뒤 `SIGKILL`로 종료한다. 이어 해당 database/application stage를 다시 실행하고 completion marker, staging residue 부재, configuration linkage, credential, service health를 확인한다.

### 중요한 이유
shell trap에 의존하는 cleanup과 durable convergence를 구분한다. `SIGKILL`은 trap을 우회하므로 rerun 성공은 graceful exit code가 아니라 persistent-state layout과 publication ordering이 recovery를 제공한다는 뜻이다.

### 변경 사항
MariaDB 다섯 stage와 WordPress 다섯 stage를 모두 실행한다. application-stage case 사이에는 WordPress volume을 reset하고, 마지막에는 secret-boundary 및 running-service assertion을 다시 수행한다.

### 프로젝트 이해에 중요한 이유
이 특별한 A 등급 test는 branch의 핵심 bootstrap 주장에 가장 강한 evidence를 제공하기 때문에 선정했다. 일반 integration test가 거의 다루지 않는 failure boundary에서 아키텍처가 실제로 어떻게 동작하는지 보여 준다.
