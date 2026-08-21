# CI production process와 browser delivery 검증

- 카테고리: `09-production-delivery-and-release-engineering` — 제품 전달과 릴리스 엔지니어링
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

typecheck/unit/build 수준의 CI에서 production artifact를 실제 process로 기동하고 PostgreSQL migration, readiness, HTTP/WebSocket smoke, production Web, browser E2E까지 연결한 delivery verification으로 발전하는 과정을 복원합니다.

이 문서는 완성된 해설이 아니라 exact SHA를 순서대로 확인해 제품 전달 구조의 발전을 복원하기 위한 scaffold입니다.

### 직접 연결되는 불변식

- production delivery 검증은 source dev server가 아니라 build된 artifact/process를 실행해야 합니다.
- CI는 동일한 Node/pnpm toolchain과 frozen lockfile을 사용해 dependency resolution drift를 제한합니다.
- 실제 PostgreSQL을 준비하고 migration한 뒤 API readiness를 확인한 후 smoke/browser 검증을 진행합니다.
- guest/demo browser job도 production-style build/start 경로를 사용하되 PostgreSQL 없이 제한된 capability를 검증합니다.
- cookie origin은 HTTP session semantics와 일치해야 하며 CI의 hostname 차이도 contract로 취급합니다.
- workflow 자체의 필수 job/command/runtime 규칙은 정적 contract test로 보호됩니다.

## 2. 핵심 질문

- 초기 CI가 typecheck/unit/build만 수행할 때 production delivery에 대해 증명하지 못하는 것은 무엇입니까?
- PostgreSQL integration job과 process/browser job은 각각 어떤 persistence·delivery 경계를 검증합니까?
- process/browser job은 build, DB 준비, migration, process start, readiness, smoke, E2E를 어떤 순서로 수행합니까?
- workflow contract test는 Node/pnpm, frozen install, command 존재를 어떻게 고정합니까?
- guest-only browser job이 일반 process job과 분리되는 이유와 공유하는 production build/start 계약은 무엇입니까?
- `localhost`와 `127.0.0.1` 차이가 cookie origin에서 실제 failure가 되는 이유는 무엇입니까?

## 3. 완료 기준

- Commit map의 모든 SHA가 `web/ft_transcendence` ancestry에 속하는지 확인합니다.
- 각 SHA의 parent 또는 직전 관련 SHA와 비교해 development 실행과 production delivery 실행을 구분합니다.
- build artifact, package export, image layer, Compose service, workflow job, runtime config의 실제 owner를 파일과 command로 기록합니다.
- Fix는 이전 delivery 가정과 root cause를, test/CI는 실제 검증 대상과 증명/비증명 범위를 연결합니다.
- 실행하지 않은 build, Docker, Compose, CI 결과를 실행 증거처럼 기록하지 않습니다.
- 마지막 SHA까지만 사용해 Thread 최종 artifact/lifecycle/verification flow를 작성합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Thread 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `a9f8b8609711` | `build(repo): workspace 검증 명령 정리` | B | PROTOCOL, REALTIME, OPERATIONS | root script와 Make target을 verification layer별 entrypoint로 정리합니다. |
| 2 | `68404e51ea53` | `ci(repo): typecheck·unit·build workflow 추가` | B | PROTOCOL, PERSISTENCE, OPERATIONS | push/PR에서 typecheck, unit, build를 실행하는 첫 repository CI 경계를 추가합니다. |
| 3 | `0e360d333540` | `ci(db): PostgreSQL integration 검사 실행` | B | PERSISTENCE | PostgreSQL integration test를 독립 CI job에서 실행합니다. |
| 4 | `3367b4266049` | `ci(repo): process와 browser 검증 job 추가` | A | REALTIME, PERSISTENCE, WEB | production artifact와 PostgreSQL을 실제로 기동해 HTTP/WS smoke와 browser E2E까지 검증합니다. |
| 5 | `7cb0d32b5be3` | `test(ci): process 검증 job contract 확인` | B | PERSISTENCE, WEB, OPERATIONS | workflow의 toolchain, frozen install, unit/integration/process/browser command 존재를 contract로 고정합니다. |
| 6 | `bf0bc1199c84` | `ci(e2e): 비회원 체험 browser job 실행` | B | PERSISTENCE, WEB, OPERATIONS | API/Web을 demo mode로 build/start하고 PostgreSQL 없이 guest-only Playwright suite를 실행합니다. |
| 7 | `0ae1ded2c56f` | `test(ci): guest browser job 요구 검증` | B | WEB, OPERATIONS, TEST | 별도 guest job, mode 값, Playwright command와 guest spec 존재를 workflow contract로 검증합니다. |
| 8 | `f35728f4ef92` | `test(repo): 정적 계약 검사 명령 연결` | B | PERSISTENCE, OPERATIONS, TEST | CI, production Docker, load harness contract suite를 하나의 root command와 Make target으로 연결합니다. |
| 9 | `4f9e66c35586` | `ci(repo): 정적 계약 검사 실행` | B | PERSISTENCE | repository static contract suite를 CI에서 실행합니다. |
| 10 | `65512bc24161` | `fix(ci): 브라우저 E2E API origin 정렬` | B | AUTH, REALTIME, WEB | browser E2E API origin을 cookie semantics와 맞는 `localhost`로 정렬합니다. |
| 11 | `527921bc9d69` | `test(ci): 브라우저 E2E cookie origin 계약 검증` | B | AUTH, WEB, OPERATIONS | CI contract가 API base URL의 exact cookie origin을 고정하도록 합니다. |

## 5. Commit별 학습 기록

### 5.1. `build(repo): workspace 검증 명령 정리`

| 항목 | 값 |
| --- | --- |
| SHA | `a9f8b8609711` |
| Importance | B |
| Tags | PROTOCOL, REALTIME, OPERATIONS |
| Source에서 확정된 역할 | root script와 Make target을 verification layer별 entrypoint로 정리합니다. |

#### 해당 SHA에서 확인할 실제 코드

- root `package.json`에서 typecheck, unit, PostgreSQL integration, build, aggregate test command가 어떤 workspace command를 호출하는지 확인합니다.
- `Makefile`의 `check`, `integration`, `build`, `test` target이 package script의 stable operator entrypoint가 되는지 확인합니다.
- unit과 실제 PostgreSQL integration이 별도 command로 분리되어 필요한 external resource와 failure scope를 구분하는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | workspace마다 검증 command는 존재했지만 repository 사용자가 typecheck, unit, PostgreSQL integration, build를 어떤 순서·경계로 호출해야 하는지 root entrypoint가 정리되지 않았습니다. |
| 해결하려던 문제 | CI와 개발자가 서로 다른 command 조합을 사용하면 일부 verification layer가 누락되고, unit failure와 external DB integration failure를 구분하기 어렵습니다. |
| 핵심 결정 | root package script와 Make targets를 verification layer별로 명명하고 aggregate command가 동일 entrypoint를 재사용하도록 정리했습니다. |
| build → package → execute 흐름 | operator/CI → root script 또는 Make target → workspace typecheck/unit/postgres-integration/build. 각 command의 exit status가 상위 shell로 전달됩니다. |
| ownership/lifetime/cleanup | root package metadata가 canonical command graph를, Makefile이 CLI alias를, 각 workspace가 실제 test/build implementation을 소유합니다. |
| failure/rollback/fail-closed | 하위 command non-zero면 상위 target이 실패합니다. 이 commit은 CI runner, database service, browser process를 만들지 않습니다. |
| 보장하는 것 | 검증 층을 반복 가능한 repository command로 호출할 수 있고 unit과 DB integration 경계를 구분합니다. |
| 보장하지 않는 것 | 어떤 command가 push/PR에서 자동 실행되는지, production process가 시작되는지, external PostgreSQL이 준비되는지는 보장하지 않습니다. |
| 후속 연결 | `68404e51ea53`이 typecheck/unit/build를 첫 CI job에 연결하고 `0e360d333540`이 PostgreSQL integration을 독립 job으로 추가합니다. |

비교 기준:
- 이 commit의 parent와 비교합니다.
- 다음 관련 SHA: `68404e51ea53` — `ci(repo): typecheck·unit·build workflow 추가`

### 5.2. `ci(repo): typecheck·unit·build workflow 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `68404e51ea53` |
| Importance | B |
| Tags | PROTOCOL, PERSISTENCE, OPERATIONS |
| Source에서 확정된 역할 | push/PR에서 typecheck, unit, build를 실행하는 첫 repository CI 경계를 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 새 `.github/workflows/ci.yml`의 push/pull_request trigger, verify job, timeout, checkout→pnpm→Node→frozen install 순서를 확인합니다.
- toolchain이 pnpm `10.32.1`, Node `24.18.0`으로 고정되고 cache key가 lockfile과 연결되는지 확인합니다.
- verify job이 `pnpm typecheck`, `pnpm unit`, `pnpm build`만 실행해 PostgreSQL·process startup·browser delivery는 아직 검증하지 않는 범위를 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | repository command는 정리됐지만 push/PR에 대한 자동 gate가 없었습니다. |
| 해결하려던 문제 | review 전에 type error, deterministic unit failure, build breakage가 합쳐지지 않을 수 있었고 toolchain/install 방식도 사용자 환경에 따라 달랐습니다. |
| 핵심 결정 | GitHub Actions verify job이 exact pnpm/Node와 frozen lockfile을 사용해 typecheck→unit→build를 실행하도록 했습니다. |
| build → package → execute 흐름 | push/PR → hosted runner checkout → pnpm setup → Node setup/cache → `pnpm install --frozen-lockfile` → typecheck → unit → build. |
| ownership/lifetime/cleanup | workflow가 toolchain과 step order를, hosted runner가 temporary dependency/artifact filesystem을, job status가 merge signal을 소유합니다. |
| failure/rollback/fail-closed | install/typecheck/unit/build 중 하나라도 non-zero면 job이 종료됩니다. runner 종료 시 workspace는 폐기되며 별도 rollback이 필요하지 않습니다. |
| 보장하는 것 | 동일 pinned toolchain과 lockfile로 static/type/unit/build gate를 push/PR에 적용합니다. |
| 보장하지 않는 것 | 실제 PostgreSQL backend, migration, compiled process start, health/readiness, HTTP/WS/browser traffic은 검증하지 않습니다. |
| 후속 연결 | `0e360d333540`이 DB integration을 별도 job으로 추가하고 `3367b4266049`가 production-style process/browser delivery를 추가합니다. |

비교 기준:
- 직전 관련 SHA: `a9f8b8609711` — `build(repo): workspace 검증 명령 정리`
- 다음 관련 SHA: `0e360d333540` — `ci(db): PostgreSQL integration 검사 실행`

### 5.3. `ci(db): PostgreSQL integration 검사 실행`

| 항목 | 값 |
| --- | --- |
| SHA | `0e360d333540` |
| Importance | B |
| Tags | PERSISTENCE |
| Source에서 확정된 역할 | PostgreSQL integration test를 독립 CI job에서 실행합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `.github/workflows/ci.yml`의 새 `postgres-integration` job 이름, 15분 timeout과 verify job과 독립된 execution boundary를 확인합니다.
- checkout, pnpm `10.32.1`, Node `24.18.0`, frozen install 뒤 `pnpm postgres-integration`을 실행하는지 확인합니다.
- 이 job diff에는 PostgreSQL service 선언이 보이지 않으므로 test command 자체가 어떤 DB provision mechanism을 사용하는지 해당 SHA의 package/test source에서 확인해야 함을 기록합니다.
- 후속 `7cb0d32b5be3` contract가 이 독립 job/command 존재를 요구하는 연결을 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 첫 CI는 DB-independent unit/build만 실행했습니다. root에는 PostgreSQL integration command가 있었지만 workflow consumer가 없었습니다. |
| 해결하려던 문제 | memory repository나 mock을 통과해도 SQL schema, PostgreSQL query/transaction behavior가 깨질 수 있었습니다. |
| 핵심 결정 | `postgres-integration`을 verify와 분리된 15분 job으로 추가하고 동일 pinned toolchain/frozen install 뒤 root integration command를 실행했습니다. |
| build → package → execute 흐름 | push/PR → independent runner setup/install → `pnpm postgres-integration` → test command가 준비한 PostgreSQL integration path 실행 → exit status를 job에 반영합니다. |
| ownership/lifetime/cleanup | workflow가 job isolation과 timeout을, integration harness가 DB resource lifecycle을, runner가 dependency workspace를 소유합니다. |
| failure/rollback/fail-closed | DB provision/connect/query/test failure는 해당 job만 non-zero로 만듭니다. verify job과 분리되어 failure category를 식별할 수 있습니다. |
| 보장하는 것 | CI에 PostgreSQL-backed integration command가 별도 mandatory status로 존재합니다. |
| 보장하지 않는 것 | production API/Web process, migration-before-start ordering, browser journey를 검증하지 않습니다. 이 diff만으로 external DB provision의 모든 세부도 확정할 수 없습니다. |
| 후속 연결 | `3367b4266049`가 명시적 PostgreSQL service, migration, compiled API/Web, smoke/E2E를 하나의 delivery job에 연결합니다. |

비교 기준:
- 직전 관련 SHA: `68404e51ea53` — `ci(repo): typecheck·unit·build workflow 추가`
- 다음 관련 SHA: `3367b4266049` — `ci(repo): process와 browser 검증 job 추가`

### 5.4. `ci(repo): process와 browser 검증 job 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `3367b4266049` |
| Importance | A |
| Tags | REALTIME, PERSISTENCE, WEB |
| Source에서 확정된 역할 | production artifact와 PostgreSQL을 실제로 기동해 HTTP/WS smoke와 browser E2E까지 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `.github/workflows/ci.yml`의 `process-and-browser` job PostgreSQL service, health option, environment와 25분 timeout을 확인합니다.
- frozen install/build 뒤 package migration command, compiled API `dist` start, Next production/standalone Web start를 background process로 기동하는 shell을 확인합니다.
- PID capture와 `trap`/`kill` cleanup, API readiness와 Web root polling이 downstream smoke/E2E 전에 실행되는지 확인합니다.
- HTTP smoke, WebSocket smoke, Playwright browser suite의 실제 command와 public API/WS build-time values를 연결합니다.
- compiled production artifact를 실행하지만 `APP_MODE=development`와 package migration command를 사용하므로 full production configuration/Compose image lifecycle과 동일하지 않다는 점을 명시합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | CI는 type/unit/build와 독립 PostgreSQL integration을 수행했지만 build artifact가 실제 Node/Next process로 시작되는지, migration 후 browser가 HTTP session과 WebSocket journey를 완료하는지는 보지 않았습니다. |
| 해결하려던 문제 | artifact path, environment, startup order, readiness, process cleanup, browser-visible URL의 통합 오류는 compile/unit 단계에서 드러나지 않습니다. release candidate가 build는 되지만 실행 불가능할 수 있었습니다. |
| 핵심 결정 | PostgreSQL service가 포함된 `process-and-browser` job을 추가했습니다. build와 migration 후 compiled API와 production Web을 background로 시작하고 readiness를 polling한 다음 HTTP/WS smoke와 Playwright를 실행하며 trap으로 process를 정리합니다. |
| build → package → execute 흐름 | pinned setup/frozen install → root production build → PostgreSQL health → package migration → API `dist` process + Web production process start/PID capture → readiness/root polling → HTTP smoke → WS smoke → browser E2E → trap이 background process 종료. |
| ownership/lifetime/cleanup | Actions service container가 PostgreSQL lifetime을, shell이 API/Web PID와 cleanup trap을, build가 artifact를, smoke/Playwright가 client connection lifetime을 소유합니다. hosted runner 종료가 최종 cleanup boundary입니다. |
| failure/rollback/fail-closed | DB health/migration/build/start/readiness/smoke/E2E 어느 단계든 non-zero면 job이 실패하고 trap이 시작된 process를 kill합니다. readiness timeout은 downstream test를 차단합니다. crash 전 partial DB state rollback은 정의하지 않습니다. |
| 보장하는 것 | CI 환경에서 compiled API와 production-style Web이 실제 PostgreSQL schema 위에서 시작하고 HTTP/WS/browser 경로가 성공해야 합니다. 이는 단순 static contract보다 강한 실행 증거입니다. |
| 보장하지 않는 것 | Docker image/Compose networking, `APP_MODE=production`의 fail-closed DB contract, TLS, production secret manager, real deployment load를 증명하지 않습니다. `APP_MODE=development`를 사용하므로 production configuration 전체와 동일하지 않습니다. |
| 후속 연결 | `7cb0d32b5be3`가 이 workflow의 필수 job/command를 정적으로 고정하고 `bf0bc1199c84`가 DB 없는 demo guest delivery를 별도 job으로 추가합니다. |

비교 기준:
- 직전 관련 SHA: `0e360d333540` — `ci(db): PostgreSQL integration 검사 실행`
- 다음 관련 SHA: `7cb0d32b5be3` — `test(ci): process 검증 job contract 확인`

### 5.5. `test(ci): process 검증 job contract 확인`

| 항목 | 값 |
| --- | --- |
| SHA | `7cb0d32b5be3` |
| Importance | B |
| Tags | PERSISTENCE, WEB, OPERATIONS |
| Source에서 확정된 역할 | workflow의 toolchain, frozen install, unit/integration/process/browser command 존재를 contract로 고정합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 새 `tests/ci-contract.test.mjs`가 `.github/workflows/ci.yml` text를 읽고 exact Node/pnpm version, frozen install을 assertion하는지 확인합니다.
- verify, PostgreSQL integration, process/browser job 이름과 production build/start, migration, smoke, Playwright command literal을 검사하는지 확인합니다.
- YAML semantic execution이 아니라 text/literal contract이므로 command가 실제 성공하거나 correct order로 실행된다는 것을 독립적으로 증명하지 않는 범위를 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 실행 job은 존재했지만 workflow edit로 pinned version, frozen install, separate DB job, production process command가 삭제돼도 해당 YAML을 별도로 검사하는 unit contract가 없었습니다. |
| 해결하려던 문제 | delivery verification 자체가 configuration file이므로, test code 변경 없이 CI 경계가 약화되는 회귀를 빠르게 감지할 필요가 있었습니다. |
| 핵심 결정 | Node test가 workflow source의 필수 literal과 job/command를 정적으로 assertion하도록 했습니다. |
| build → package → execute 흐름 | test runner → workflow text read → version/install/job/command assertion → mismatch 시 non-zero. workflow process는 이 test에서 기동하지 않습니다. |
| ownership/lifetime/cleanup | contract test가 workflow source schema의 selected requirements를 소유하고 Actions가 actual execution을 소유합니다. |
| failure/rollback/fail-closed | literal rename/삭제/version drift면 test가 실패합니다. YAML이 문법적으로 실행 가능하더라도 assertion 밖의 ordering/permission/cache 문제는 놓칠 수 있습니다. |
| 보장하는 것 | 테스트 실행 시 pinned toolchain, frozen install, unit/DB/process/browser command의 존재가 정적으로 보호됩니다. |
| 보장하지 않는 것 | Actions service health, process startup, browser result, command semantics는 이 static test가 증명하지 않습니다. |
| 후속 연결 | `bf0bc1199c84`와 `0ae1ded2c56f`가 guest job과 그 정적 contract를 추가합니다. `f35728f4ef92`가 모든 static contract를 root command로 묶습니다. |

비교 기준:
- 직전 관련 SHA: `3367b4266049` — `ci(repo): process와 browser 검증 job 추가`
- 다음 관련 SHA: `bf0bc1199c84` — `ci(e2e): 비회원 체험 browser job 실행`

### 5.6. `ci(e2e): 비회원 체험 browser job 실행`

| 항목 | 값 |
| --- | --- |
| SHA | `bf0bc1199c84` |
| Importance | B |
| Tags | PERSISTENCE, WEB, OPERATIONS |
| Source에서 확정된 역할 | API/Web을 demo mode로 build/start하고 PostgreSQL 없이 guest-only Playwright suite를 실행합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `.github/workflows/ci.yml`의 새 guest browser job이 PostgreSQL service 없이 `APP_MODE=demo`와 guest/session secret을 사용하는지 확인합니다.
- demo public values로 Web을 build하고 API `dist`와 Web standalone/production server를 기동한 뒤 readiness와 `pnpm e2e:guest-demo`를 실행하는지 확인합니다.
- 일반 process/browser job과 PID/trap/readiness pattern을 공유하면서 persistence capability를 의도적으로 제거한 차이를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 일반 browser job은 PostgreSQL과 authenticated/full application path에 묶여 있어 DB 없이 제공하는 guest/demo delivery contract를 독립적으로 검증하지 못했습니다. |
| 해결하려던 문제 | demo mode가 memory-backed 제한 capability로 기동돼야 하는데 일반 job 성공만으로는 DB absence, guest secret, guest-only browser journey가 유지되는지 알 수 없었습니다. |
| 핵심 결정 | PostgreSQL service 없이 `APP_MODE=demo`로 API/Web production artifacts를 build/start하고 guest Playwright spec만 실행하는 별도 job을 추가했습니다. |
| build → package → execute 흐름 | pinned setup/install → demo public env로 build → compiled API와 production Web start → readiness → guest-only E2E → trap cleanup. |
| ownership/lifetime/cleanup | job shell이 in-memory API process와 Web process/PID를, guest test가 temporary browser/session을 소유합니다. persistent DB resource는 의도적으로 없습니다. |
| failure/rollback/fail-closed | demo configuration/start/readiness/guest journey가 실패하면 job이 non-zero입니다. trap이 process를 정리합니다. |
| 보장하는 것 | DB 없이도 intended demo production-style process와 guest browser journey가 CI에서 실행됩니다. |
| 보장하지 않는 것 | durable persistence, authenticated user journey, production DB requirement, Docker Compose는 이 job 범위가 아닙니다. |
| 후속 연결 | `0ae1ded2c56f`가 guest job, mode, command와 spec 존재를 static contract로 고정합니다. |

비교 기준:
- 직전 관련 SHA: `7cb0d32b5be3` — `test(ci): process 검증 job contract 확인`
- 다음 관련 SHA: `0ae1ded2c56f` — `test(ci): guest browser job 요구 검증`

### 5.7. `test(ci): guest browser job 요구 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `0ae1ded2c56f` |
| Importance | B |
| Tags | WEB, OPERATIONS, TEST |
| Source에서 확정된 역할 | 별도 guest job, mode 값, Playwright command와 guest spec 존재를 workflow contract로 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `tests/ci-contract.test.mjs`에 guest job 이름, `APP_MODE: demo`, public app mode, guest Playwright command assertion이 추가되는지 확인합니다.
- guest spec file 존재 검사와 workflow text literal 검사가 어떤 producer/consumer 경계를 보호하는지 확인합니다.
- static assertion이 guest browser process를 실제로 실행하거나 DB 비접속을 network level에서 증명하지 않는다고 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | guest job은 실행됐지만 workflow에서 job/mode/spec가 제거되거나 full E2E로 잘못 대체돼도 별도 source-level guard가 없었습니다. |
| 해결하려던 문제 | demo delivery는 production/full mode와 다른 capability contract이므로 generic process job assertion만으로 보호할 수 없습니다. |
| 핵심 결정 | CI contract test에 guest job·demo env·guest command·spec existence assertions를 추가했습니다. |
| build → package → execute 흐름 | contract test가 workflow/spec source read → guest job/mode/command literal 및 file existence 검사 → mismatch 시 failure. |
| ownership/lifetime/cleanup | static test가 guest delivery configuration contract를, actual guest job이 process/browser execution을 소유합니다. |
| failure/rollback/fail-closed | job rename, mode drift, command/spec 삭제 시 contract test가 실패합니다. |
| 보장하는 것 | 테스트 실행 시 guest-only CI path의 필수 configuration이 존재합니다. |
| 보장하지 않는 것 | Playwright 성공, memory isolation, PostgreSQL 미사용을 runtime 관찰로 증명하지 않습니다. |
| 후속 연결 | `f35728f4ef92`가 CI/Docker/load static tests를 한 root contract command로 묶습니다. |

비교 기준:
- 직전 관련 SHA: `bf0bc1199c84` — `ci(e2e): 비회원 체험 browser job 실행`
- 다음 관련 SHA: `f35728f4ef92` — `test(repo): 정적 계약 검사 명령 연결`

### 5.8. `test(repo): 정적 계약 검사 명령 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `f35728f4ef92` |
| Importance | B |
| Tags | PERSISTENCE, OPERATIONS, TEST |
| Source에서 확정된 역할 | CI, production Docker, load harness contract suite를 하나의 root command와 Make target으로 연결합니다. |

#### 해당 SHA에서 확인할 실제 코드

- root `package.json`의 `test:contracts`가 CI contract, Docker production contract, load/fault harness static tests를 어떤 순서로 호출하는지 확인합니다.
- `Makefile` target이 동일 package script를 재사용해 local/CI entrypoint drift를 줄이는지 확인합니다.
- 한 하위 static test의 non-zero가 aggregate command를 중단시키는 shell semantics와 실행 증거가 아닌 source contract 성격을 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | CI/Docker/guest/load 관련 정적 test가 개별 command로 흩어져 있어 일괄 실행을 누락할 수 있었습니다. |
| 해결하려던 문제 | release configuration 회귀를 확인하려면 여러 파일을 수동으로 호출해야 했고 CI에 연결할 안정적인 단일 entrypoint가 없었습니다. |
| 핵심 결정 | root `test:contracts`와 Make target이 selected static contract suites를 직렬 호출하도록 했습니다. |
| build → package → execute 흐름 | operator/CI → `pnpm test:contracts` → CI workflow assertions → Docker/Compose assertions → load/fault harness assertions; 첫 failure가 aggregate exit를 실패시킵니다. |
| ownership/lifetime/cleanup | root script가 static contract suite composition을, 각 test file이 domain assertion을 소유합니다. |
| failure/rollback/fail-closed | 하위 test non-zero면 aggregate command도 non-zero입니다. runtime process cleanup은 이 static suite의 책임이 아닙니다. |
| 보장하는 것 | 한 command로 주요 delivery configuration contract를 반복 실행할 수 있습니다. |
| 보장하지 않는 것 | production process/image/browser/load를 실제 실행하는 것은 아니며 assertion에 포함되지 않은 drift는 감지하지 못합니다. |
| 후속 연결 | `4f9e66c35586`이 이 root contract command를 verify CI job에 추가합니다. |

비교 기준:
- 직전 관련 SHA: `0ae1ded2c56f` — `test(ci): guest browser job 요구 검증`
- 다음 관련 SHA: `4f9e66c35586` — `ci(repo): 정적 계약 검사 실행`

### 5.9. `ci(repo): 정적 계약 검사 실행`

| 항목 | 값 |
| --- | --- |
| SHA | `4f9e66c35586` |
| Importance | B |
| Tags | PERSISTENCE |
| Source에서 확정된 역할 | repository static contract suite를 CI에서 실행합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `.github/workflows/ci.yml` verify job에서 unit 뒤, build 전 `pnpm test:contracts`가 실행되는 exact 위치를 확인합니다.
- static contract failure가 production build/process jobs 전에 repository gate를 fail-fast하는지 확인합니다.
- hosted runner에서 실제 command 결과를 이 환경에서는 재실행하지 않았음을 구분합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | aggregate static contract command는 존재했지만 CI가 자동 호출하지 않았습니다. |
| 해결하려던 문제 | 개발자가 local contract suite를 생략하면 workflow/Docker/load configuration drift가 merge gate를 통과할 수 있었습니다. |
| 핵심 결정 | verify job에 `pnpm test:contracts` step을 추가했습니다. |
| build → package → execute 흐름 | frozen install → typecheck → unit → static contracts → production build. contract failure는 build와 후속 CI 결과 전에 job을 종료합니다. |
| ownership/lifetime/cleanup | CI workflow가 invocation을, test suite가 assertions를, job status가 gate evidence를 소유합니다. |
| failure/rollback/fail-closed | 어느 contract test든 non-zero면 verify job이 실패합니다. |
| 보장하는 것 | push/PR에서 selected static delivery contracts가 항상 실행되도록 workflow가 연결됩니다. |
| 보장하지 않는 것 | static pass가 process/browser/Docker runtime 성공을 대체하지 않습니다. |
| 후속 연결 | `65512bc24161`은 실제 browser process job에서 드러난 hostname/cookie boundary를 수정하고 `527921bc9d69`가 그 exact origin을 static contract에 추가합니다. |

비교 기준:
- 직전 관련 SHA: `f35728f4ef92` — `test(repo): 정적 계약 검사 명령 연결`
- 다음 관련 SHA: `65512bc24161` — `fix(ci): 브라우저 E2E API origin 정렬`

### 5.10. `fix(ci): 브라우저 E2E API origin 정렬`

| 항목 | 값 |
| --- | --- |
| SHA | `65512bc24161` |
| Importance | B |
| Tags | AUTH, REALTIME, WEB |
| Source에서 확정된 역할 | browser E2E API origin을 cookie semantics와 맞는 `localhost`로 정렬합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `.github/workflows/ci.yml` process/browser env에서 `API_BASE_URL`이 `http://127.0.0.1:4000`에서 `http://localhost:4000`으로 바뀌는 exact diff를 확인합니다.
- browser가 Web/login을 `localhost`로 방문하고 host-only HttpOnly session cookie를 받은 뒤 API request host가 달라 cookie를 보내지 않는 previous failure를 연결합니다.
- WebSocket URL은 one-time ticket admission path라 동일 cookie transport 요구가 없는 범위를 구분합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | Web과 login origin은 `localhost`였지만 browser E2E의 API base는 `127.0.0.1`이었습니다. 두 문자열은 같은 loopback interface라도 cookie host matching에서는 다른 host입니다. |
| 해결하려던 문제 | login response가 `localhost`에 host-only HttpOnly session cookie를 설정하면 browser는 `127.0.0.1` API request에 그 cookie를 보내지 않습니다. 인증된 E2E가 unauthorized로 실패할 수 있었습니다. |
| 핵심 결정 | API base URL을 `http://localhost:4000`으로 바꿔 browser page/login/API가 같은 cookie host를 사용하게 했습니다. |
| build → package → execute 흐름 | Playwright가 localhost Web 방문 → localhost API/login response가 session cookie 설정 → 이후 localhost API request에 cookie 자동 첨부 → authenticated HTTP flow → ticket을 받아 WS 연결. |
| ownership/lifetime/cleanup | browser cookie jar가 host-bound credential lifetime을, workflow env가 client base URL을, API가 session validation을 소유합니다. |
| failure/rollback/fail-closed | 이전 host mismatch는 network connectivity와 무관하게 cookie omission을 만들었습니다. 수정 후에도 scheme, port, SameSite/Secure/CORS 설정이 잘못되면 다른 인증 failure는 남습니다. |
| 보장하는 것 | CI browser HTTP calls의 host가 login cookie host와 일치합니다. |
| 보장하지 않는 것 | 외부 production domain, HTTPS cookie, proxy origin, all browser 정책을 검증하지 않습니다. WS origin은 별도 ticket contract를 따릅니다. |
| 후속 연결 | `527921bc9d69`가 workflow에서 exact `http://localhost:4000` literal을 요구해 127.0.0.1 회귀를 차단합니다. |

비교 기준:
- 직전 관련 SHA: `4f9e66c35586` — `ci(repo): 정적 계약 검사 실행`
- 다음 관련 SHA: `527921bc9d69` — `test(ci): 브라우저 E2E cookie origin 계약 검증`

### 5.11. `test(ci): 브라우저 E2E cookie origin 계약 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `527921bc9d69` |
| Importance | B |
| Tags | AUTH, WEB, OPERATIONS |
| Source에서 확정된 역할 | CI contract가 API base URL의 exact cookie origin을 고정하도록 합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `tests/ci-contract.test.mjs`에 `API_BASE_URL: http://localhost:4000` exact assertion이 추가되는지 확인합니다.
- generic loopback reachability가 아니라 browser cookie host invariant를 literal로 보호하는 이유를 `65512bc24161`의 failure와 연결합니다.
- static source assertion은 실제 Set-Cookie, browser cookie attachment, authenticated response를 관찰하지 않는다고 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | origin fix는 workflow 한 줄에만 존재해 후속 정리에서 `127.0.0.1`로 되돌아가도 generic CI contract가 감지하지 못했습니다. |
| 해결하려던 문제 | hostname 차이는 network test가 아니라 credential transport contract이므로 exact value를 보호할 regression evidence가 필요했습니다. |
| 핵심 결정 | CI contract test가 API base URL의 exact localhost literal을 요구하도록 했습니다. |
| build → package → execute 흐름 | static test가 workflow text read → exact origin assertion → mismatch 시 test/verify job failure. actual browser proof는 process/browser job이 담당합니다. |
| ownership/lifetime/cleanup | static test가 configuration regression을, Playwright/browser가 runtime cookie behavior를 소유합니다. |
| failure/rollback/fail-closed | origin literal이 삭제·변경되면 contract suite가 실패합니다. |
| 보장하는 것 | 테스트 실행 시 known cookie-host-safe CI origin이 유지됩니다. |
| 보장하지 않는 것 | cookie flags, login success, browser engine별 behavior나 production domain은 static assertion이 증명하지 않습니다. |
| 후속 연결 | 이 Thread의 최종 상태에서 static contract와 process/browser runtime job이 서로 다른 증거 층으로 함께 남습니다. |

비교 기준:
- 직전 관련 SHA: `65512bc24161` — `fix(ci): 브라우저 E2E API origin 정렬`

## 6. Invariant evolution ledger

| 시점 | 불변식 | 상태 | 실제 근거 |
| --- | --- | --- | --- |
| `a9f8b8609711` | root script와 Make target을 verification layer별 entrypoint로 정리합니다. | 도입 | root `package.json`과 `Makefile`이 verification layer별 stable entrypoint를 정의합니다. |
| `68404e51ea53` | push/PR에서 typecheck, unit, build를 실행하는 첫 repository CI 경계를 추가합니다. | 도입·불충분 | `.github/workflows/ci.yml` verify job이 compile-level gate를 만들지만 external service와 process delivery는 포함하지 않습니다. |
| `0e360d333540` | PostgreSQL integration test를 독립 CI job에서 실행합니다. | 확장 | 독립 `postgres-integration` job이 DB-specific regression을 compile/unit gate와 분리해 실행합니다. |
| `3367b4266049` | production artifact와 PostgreSQL을 실제로 기동해 HTTP/WS smoke와 browser E2E까지 검증합니다. | 확장·실행 검증 | `process-and-browser` job이 build artifact, PostgreSQL migration, process readiness, HTTP/WS/browser client를 실제 실행 순서로 연결합니다. |
| `7cb0d32b5be3` | workflow의 toolchain, frozen install, unit/integration/process/browser command 존재를 contract로 고정합니다. | 정적 회귀 검증 | `tests/ci-contract.test.mjs`가 workflow delivery gate의 selected literal contract를 repository test로 만듭니다. |
| `bf0bc1199c84` | API/Web을 demo mode로 build/start하고 PostgreSQL 없이 guest-only Playwright suite를 실행합니다. | 확장·실행 검증 | 별도 guest job이 DB-less demo capability를 production-style artifact/process와 browser journey로 검증합니다. |
| `0ae1ded2c56f` | 별도 guest job, mode 값, Playwright command와 guest spec 존재를 workflow contract로 검증합니다. | 회귀 검증 | guest mode/job/spec의 selected source contract가 `tests/ci-contract.test.mjs`에 추가됩니다. |
| `f35728f4ef92` | CI, production Docker, load harness contract suite를 하나의 root command와 Make target으로 연결합니다. | 통합 | root package/Make entrypoint가 여러 static delivery contract의 invocation ownership을 하나로 묶습니다. |
| `4f9e66c35586` | repository static contract suite를 CI에서 실행합니다. | CI 통합 | verify job이 root static contract suite를 mandatory step으로 소비합니다. |
| `65512bc24161` | browser E2E API origin을 cookie semantics와 맞는 `localhost`로 정렬합니다. | 수정 | workflow API base의 host를 cookie를 발급받은 `localhost`와 동일하게 만들어 browser session transport를 복구합니다. |
| `527921bc9d69` | CI contract가 API base URL의 exact cookie origin을 고정하도록 합니다. | 회귀 검증 | exact localhost assertion이 hostname/cookie regression을 static CI contract로 보호합니다. |

## 7. Failure → Fix → Test 연결

| 이전 가정 또는 failure | Fix | Regression/contract evidence | 학습자 설명 |
| --- | --- | --- | --- |
| typecheck/unit/build만 통과하면 delivery 가능하다고 간주 | `0e360d333540`, `3367b4266049` | `7cb0d32b5be3` + 실제 jobs | DB integration을 분리하고 compiled process·migration·readiness·smoke·browser를 실행합니다. static test는 job 존재를, job은 runtime을 증명합니다. |
| workflow configuration이 조용히 약화될 수 있음 | `7cb0d32b5be3`, `0ae1ded2c56f`, `f35728f4ef92` | `4f9e66c35586` | selected job/version/command를 source test로 고정하고 root command를 CI에서 실행합니다. |
| `localhost` cookie를 `127.0.0.1` API에 보낼 수 있다고 가정 | `65512bc24161` | `527921bc9d69` + process/browser job | host-only cookie semantics에 맞춰 origin을 통일하고 exact literal 회귀를 차단합니다. |

## 8. Artifact·process·resource ownership

| 대상 | 생성/빌드 주체 | 소비/실행 주체 | lifetime | 실패 시 정리/차단 |
| --- | --- | --- | --- | --- |
| CI toolchain/dependencies | workflow setup + frozen install | all verification jobs | hosted runner job lifetime | setup/install failure 시 해당 job 차단 |
| PostgreSQL/migration | Actions service 또는 integration harness + DB CLI | integration/API process | job lifetime | health/migration non-zero면 downstream start/test 차단 |
| API/Web/browser processes | production build와 job shell | smoke scripts/Playwright | background PID와 browser context lifetime | trap/runner teardown이 process 정리 |
| workflow contract evidence | static Node tests | verify job/merge gate | test process와 commit history | literal drift 시 non-zero; runtime success는 별도 job |

## 9. Thread 최종 상태

- 최종 delivery owner: workflow가 toolchain·service·process·test ordering을, root scripts가 stable command를, shell trap이 process cleanup을, static tests가 selected workflow contract를 소유합니다.
- source와 production artifact의 관계: jobs는 root build 뒤 compiled API와 production/standalone Web을 실행합니다. dev source server가 delivery evidence가 되지 않습니다.
- build-time과 runtime configuration의 관계: Web public API/WS/mode는 build 전에 주입되고 API mode/DB/session 값은 process runtime에 주입됩니다. 일반 job은 compiled artifact라도 `APP_MODE=development`입니다.
- startup/readiness/shutdown contract: PostgreSQL health와 migration 뒤 API/Web process를 시작하고 polling 성공 후 smoke/browser를 실행하며 trap이 PID를 정리합니다.
- fail-closed 조건: install/build/migration/readiness/smoke/E2E/static assertion 중 하나라도 실패하면 job이 non-zero입니다. exact localhost origin도 static gate입니다.
- 검증 가능한 것과 외부 배포 환경에 남는 것: repository exact SHA에서 workflow와 test implementation을 검사했습니다. 이 세션에서 GitHub Actions·pnpm·PostgreSQL·Playwright를 재실행하지 않았으므로 새 runtime result는 주장하지 않습니다.

## 10. 최종 execution/delivery flow

```text
push/PR
→ pinned Node/pnpm + frozen install
→ typecheck/unit/static contracts/build + artifact verification
├─ PostgreSQL integration job
├─ process/browser job:
│  PostgreSQL health → package migration → compiled API + production Web
│  → readiness → HTTP smoke → WS smoke → authenticated Playwright
└─ guest browser job:
   demo build → compiled API + production Web → readiness → guest-only Playwright
all background processes → shell trap/hosted-runner teardown
workflow source → `tests/ci-contract.test.mjs` exact contract assertions
```

위 흐름을 각 단계의 실제 파일, command, artifact, process와 연결해 다시 작성합니다.

## 11. 교차 카테고리 연결

- `08-verification-and-test-architecture`: smoke/E2E 자체의 test design과 증명 범위
- `02-production-build-and-package-artifacts.md`: CI가 먼저 생성하고 검사하는 artifact
- `03-container-images-and-production-runtime-lifecycle.md`: Docker/Compose delivery contract와의 연결

## 12. 학습 완료 체크

- [x] 모든 Commit map SHA를 exact historical state에서 확인했습니다.
- [x] build와 runtime을 final HEAD에서 과거로 소급하지 않았습니다.
- [x] artifact producer/consumer와 package/image/process owner를 설명할 수 있습니다.
- [x] production config와 secret의 fail-closed 조건을 설명할 수 있습니다.
- [x] CI/test가 실제로 증명하는 delivery 범위와 증명하지 않는 범위를 구분할 수 있습니다.
- [x] fix와 regression evidence를 실제 이전 failure/가정에 연결했습니다.
- [x] 실행하지 않은 Docker/CI 결과를 실행 증거로 기록하지 않았습니다.
