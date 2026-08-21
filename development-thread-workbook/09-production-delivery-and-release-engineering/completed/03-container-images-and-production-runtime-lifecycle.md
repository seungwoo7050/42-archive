# Container image와 production runtime lifecycle

- 카테고리: `09-production-delivery-and-release-engineering` — 제품 전달과 릴리스 엔지니어링
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

compiled artifact를 API/Web multi-stage image로 패키징하고 source mount와 startup-time install/build를 제거한 뒤, migration → API readiness → Web readiness → Caddy 공개 순서의 production Compose lifecycle로 전환하는 과정을 복원합니다.

이 문서는 완성된 해설이 아니라 exact SHA를 순서대로 확인해 제품 전달 구조의 발전을 복원하기 위한 scaffold입니다.

### 직접 연결되는 불변식

- production API/Web container는 startup 시 dependency install이나 source build를 수행하지 않습니다.
- runner image에는 실행에 필요한 artifact와 dependency만 포함되며 application process는 non-root로 실행됩니다.
- DB migration은 API와 분리된 one-shot service가 완료된 뒤 API가 시작됩니다.
- DB/API/Web 내부 port는 필요한 service 사이에만 노출되고 외부 공개 지점은 gateway로 제한됩니다.
- required secret은 default credential로 조용히 대체되지 않습니다.
- application room drain budget보다 container termination grace가 짧아서는 안 됩니다.

## 2. 핵심 질문

- API/Web Dockerfile의 dependencies → builder → runner stage가 각각 어떤 파일과 dependency를 소유합니까?
- `.dockerignore`가 build context에서 제외하는 항목은 무엇이며 final image와 context에 어떤 영향을 줍니까?
- Web의 `NEXT_PUBLIC_*` build argument가 runtime environment와 다른 lifecycle을 갖는 이유는 무엇입니까?
- Compose의 one-shot `migrate` service와 `service_healthy`/`service_completed_successfully` 조건이 startup 순서를 어떻게 강제합니까?
- source mount, startup install, host port 노출이 production lifecycle 전환에서 각각 어떻게 제거됩니까?
- `stop_grace_period`가 application의 60초 room drain과 어떤 관계를 갖습니까?

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
| 1 | `f8efb2656771` | `build(docker): production API image 구성` | B | PERSISTENCE, OPERATIONS | shared/db/API를 build한 뒤 non-root runner에 필요한 결과만 복사하는 multi-stage API image를 만듭니다. |
| 2 | `656893e8e1cb` | `build(docker): production Web image 구성` | B | REALTIME, WEB, OPERATIONS | Next.js standalone output과 static asset만 runner에 포함하는 multi-stage Web image를 만듭니다. |
| 3 | `2c44cb7cd71f` | `build(docker): production container lifecycle 구성` | A | PERSISTENCE, OPERATIONS | source-mounted Compose를 built images, one-shot migration, health-gated startup, required secrets로 교체합니다. |
| 4 | `e2c12ded1d5f` | `test(docker): production container contract 검증` | B | OPERATIONS, OBSERVABILITY, TEST | rendered Compose와 Dockerfile이 production image/lifecycle 규칙을 유지하는지 검사합니다. |
| 5 | `312ddbc6fbe2` | `fix(runtime): container 종료 유예를 room drain과 정렬` | A | REALTIME, OPERATIONS, RISK | API container termination grace를 application room-drain budget보다 길게 맞춥니다. |
| 6 | `73ba979841cd` | `test(docker): API 종료 유예 계약 검증` | B | OPERATIONS, TEST | Compose의 stop grace가 60초 application drain budget 이상인지 회귀 검증합니다. |

## 5. Commit별 학습 기록

### 5.1. `build(docker): production API image 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `f8efb2656771` |
| Importance | B |
| Tags | PERSISTENCE, OPERATIONS |
| Source에서 확정된 역할 | shared/db/API를 build한 뒤 non-root runner에 필요한 결과만 복사하는 multi-stage API image를 만듭니다. |

#### 해당 SHA에서 확인할 실제 코드

- `.dockerignore`가 `.git`, `.github`, `node_modules`, `.next`, `dist`, coverage/report, `.env*`, log와 문서를 build context에서 제외하는지 확인합니다.
- `apps/api/Dockerfile`의 base/dependencies/builder/runner stage에서 root manifests, workspace package files, frozen install, shared→db→api build가 어떻게 이어지는지 확인합니다.
- runner가 API/DB/shared `dist`, migration, workspace manifests와 `node_modules`를 복사하고 `USER node`, `EXPOSE 4000`, `CMD node apps/api/dist/index.js`를 선택하는지 확인합니다.
- runner에 전체 install 결과가 복사되어 dev dependency까지 남을 수 있는 범위와 Dockerfile healthcheck 부재를 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | API production command와 compiled artifact는 있었지만 runtime은 source-mounted Compose에서 startup마다 install했습니다. 실행 환경을 build 단계에서 고정하는 API image가 없었습니다. |
| 해결하려던 문제 | startup network/install/source 상태에 따라 runtime이 달라지고 TypeScript source 및 build toolchain이 production container lifetime에 남았습니다. image가 DB/shared workspace artifact까지 정확히 포함해야 했습니다. |
| 핵심 결정 | multi-stage API Dockerfile을 추가했습니다. dependencies stage가 frozen lockfile로 workspace dependency를 설치하고 builder가 shared→db→api를 build한 뒤 runner가 manifests, install tree와 세 package의 compiled output을 복사해 non-root Node process를 실행합니다. |
| build → package → execute 흐름 | Docker context 정리 → base에서 exact Node/pnpm 준비 → dependencies에서 frozen install → builder에서 shared/DB/API artifact 생성 → runner에 필요한 tree 복사 → `USER node` → `node apps/api/dist/index.js`. |
| ownership/lifetime/cleanup | image builder가 dependency cache와 artifact 생성 lifetime을, final image layer가 copied files를, container runtime이 Node process를 소유합니다. `USER node`로 application write 권한을 제한합니다. |
| failure/rollback/fail-closed | frozen install 또는 어느 workspace build든 실패하면 image가 생성되지 않습니다. copy path가 없으면 Docker build가 실패합니다. runtime healthcheck와 DB/migration dependency는 이 image 자체에 없습니다. |
| 보장하는 것 | API container가 startup-time install/build 없이 compiled JS로 시작하고 root가 아닌 `node` 사용자로 실행됩니다. |
| 보장하지 않는 것 | production-only dependency pruning, image vulnerability scan, healthcheck, secret 주입, migration 완료, API readiness는 보장하지 않습니다. |
| 후속 연결 | `656893e8e1cb`가 Web standalone image를 추가하고 `2c44cb7cd71f`가 두 image를 production Compose lifecycle에 연결합니다. |

비교 기준:
- 이 commit의 parent와 비교합니다.
- 다음 관련 SHA: `656893e8e1cb` — `build(docker): production Web image 구성`

### 5.2. `build(docker): production Web image 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `656893e8e1cb` |
| Importance | B |
| Tags | REALTIME, WEB, OPERATIONS |
| Source에서 확정된 역할 | Next.js standalone output과 static asset만 runner에 포함하는 multi-stage Web image를 만듭니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/Dockerfile`에서 frozen workspace install과 shared build, Web build가 stage별로 어떻게 수행되는지 확인합니다.
- builder의 `ARG`/`ENV NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_APP_MODE`가 Next build에 주입되어 browser bundle에 고정되는 시점을 확인합니다.
- runner가 `.next/standalone`을 root로, `.next/static`을 `apps/web/.next/static`으로 복사하고 `USER node`, `CMD node apps/web/server.js`를 사용하는지 확인합니다.
- runtime env 변경만으로 public variable을 바꿀 수 없는 점, image healthcheck와 `public/` copy가 이 diff에 없는 점을 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | Web standalone artifact는 만들어졌지만 container runner가 없었고 source-mounted Compose가 startup마다 Next build를 수행했습니다. |
| 해결하려던 문제 | browser-visible origin/mode와 server artifact를 하나의 immutable image에 고정하지 않으면 배포 시점마다 build 결과가 달라집니다. monorepo standalone layout을 올바른 path로 복사해야 했습니다. |
| 핵심 결정 | multi-stage Web image가 shared와 Next app을 build하고, runner에는 standalone server tree와 static output만 복사합니다. public API/WS/mode 값은 build ARG/ENV로 주입하며 non-root Node가 `apps/web/server.js`를 실행합니다. |
| build → package → execute 흐름 | frozen install → shared build → Next build with `NEXT_PUBLIC_*` → `.next/standalone` + `.next/static` 생성 → runner copy → `USER node` → standalone server start on port 3000. |
| ownership/lifetime/cleanup | image build가 public browser configuration과 server/static artifact를 소유합니다. final image가 배포 단위이며 container process는 artifact를 읽기만 합니다. |
| failure/rollback/fail-closed | 필수 upstream artifact나 Next build가 실패하면 image가 생성되지 않습니다. 잘못된 public URL도 build 자체는 성공할 수 있어 browser runtime에서 늦게 드러날 수 있습니다. |
| 보장하는 것 | source mount와 startup build 없이 Next standalone process를 non-root로 실행할 image 구조를 제공합니다. |
| 보장하지 않는 것 | runtime 환경변수로 browser URL을 교체할 수 없고, readiness/healthcheck, 실제 static/public asset 완전성, browser cookie origin은 이 commit에서 검증하지 않습니다. |
| 후속 연결 | `2c44cb7cd71f`가 Compose build args와 health-gated service로 이 image를 소비합니다. |

비교 기준:
- 직전 관련 SHA: `f8efb2656771` — `build(docker): production API image 구성`
- 다음 관련 SHA: `2c44cb7cd71f` — `build(docker): production container lifecycle 구성`

### 5.3. `build(docker): production container lifecycle 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `2c44cb7cd71f` |
| Importance | A |
| Tags | PERSISTENCE, OPERATIONS |
| Source에서 확정된 역할 | source-mounted Compose를 built images, one-shot migration, health-gated startup, required secrets로 교체합니다. |

#### 해당 SHA에서 확인할 실제 코드

- parent의 source-mounted `docker-compose.yml`과 비교해 API/Web/Caddy `build`, bind mount 제거, startup install/build 제거, internal `expose`와 단일 Caddy host port를 확인합니다.
- DB `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?required}`와 API `SESSION_SECRET: ${SESSION_SECRET:?required}`가 Compose interpolation 단계에서 fail-fast하는지 확인합니다.
- `migrate` service가 API image의 `node packages/db/dist/cli.js migrate`를 one-shot으로 실행하고 DB `service_healthy` 뒤, API는 `service_completed_successfully` 뒤 시작하는지 확인합니다.
- API/Web HTTP healthcheck와 Caddy의 `service_healthy` dependencies가 DB → migrate → API → Web → gateway ordering을 형성하는지 확인합니다.
- DB volume 외 source/node_modules/.next volume이 제거되고 rollback/backup/automatic migration recovery가 별도로 없다는 점을 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | API/Web image는 존재했지만 Compose는 source bind mount, startup install/build, 여러 host port와 Caddy config bind mount를 사용했습니다. migration이 독립 startup gate가 아니었고 required secret에 fail-fast interpolation이 없었습니다. |
| 해결하려던 문제 | 배포 runtime이 host source와 network install에 의존하고 API가 schema 준비 전에 시작할 수 있었습니다. 내부 DB/API/Web port가 host에 공개되고 gateway가 unhealthy upstream보다 먼저 열릴 수 있었습니다. 기본 credential로 잘못된 production이 시작할 위험도 있었습니다. |
| 핵심 결정 | Compose를 built API/Web/Caddy images로 교체하고 DB password/session secret을 required interpolation로 만들었습니다. API image를 재사용하는 one-shot migrate service, HTTP healthchecks, dependency conditions, internal `expose`, Caddy만 8080 publish를 구성했습니다. |
| build → package → execute 흐름 | Compose interpolation에서 secret 검사 → DB volume/container → `pg_isready` healthy → migrate container가 compiled CLI 실행 후 exit 0 → API image start·readiness → Web image start·readiness → Caddy image start·host 8080 publish. failure 단계 뒤 service는 condition 때문에 시작하지 않습니다. |
| ownership/lifetime/cleanup | DB service와 named volume이 durable data를, one-shot migrate process가 schema transition을, API/Web images가 immutable artifact를, Caddy가 외부 port를 소유합니다. Compose가 dependency graph와 container lifetime을 소유합니다. |
| failure/rollback/fail-closed | required interpolation 누락은 container creation 전 실패합니다. DB unhealthy는 migration을, migration non-zero는 API를, API/Web unhealthy는 downstream service를 차단합니다. 자동 rollback, backup restore, partially applied migration 복구는 정의하지 않습니다. |
| 보장하는 것 | production 조립에서 source/startup build를 제거하고 schema completion·readiness에 의해 공개 순서를 fail-closed로 만듭니다. host에는 gateway만 publish됩니다. |
| 보장하지 않는 것 | health endpoint의 의미가 실제 traffic readiness와 완전히 같다는 보장, migration atomicity/rollback, orchestrator 다중 replica ordering, TLS·secret manager·image signature는 없습니다. 종료 grace도 아직 application drain과 정렬되지 않았습니다. |
| 후속 연결 | `e2c12ded1d5f`가 rendered Compose/Dockerfile 정적 계약을 추가합니다. `312ddbc6fbe2`는 종료 시 application drain보다 짧은 container grace 위험을 수정합니다. |

비교 기준:
- 직전 관련 SHA: `656893e8e1cb` — `build(docker): production Web image 구성`
- 다음 관련 SHA: `e2c12ded1d5f` — `test(docker): production container contract 검증`

### 5.4. `test(docker): production container contract 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `e2c12ded1d5f` |
| Importance | B |
| Tags | OPERATIONS, OBSERVABILITY, TEST |
| Source에서 확정된 역할 | rendered Compose와 Dockerfile이 production image/lifecycle 규칙을 유지하는지 검사합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `tests/docker-production.test.mjs`가 required env를 주입해 `docker compose config`를 render하고, secret 누락 시 render 실패를 별도로 검사하는 방식을 확인합니다.
- rendered model에서 migrate completion, API/Web health dependency, published port가 Caddy뿐인지, bind mount가 없는지 검사하는 assertion을 확인합니다.
- API/Web Dockerfile source text에서 exact Node/toolchain, frozen install, non-root runner, expected CMD와 Caddy metrics block을 정적으로 검사하는지 확인합니다.
- test가 image를 build하거나 container를 기동하지 않으므로 healthcheck 성공, migration 실행, network isolation의 runtime 결과는 증명하지 않는다고 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | production Compose 구조는 사람이 YAML/Dockerfile을 읽어야 했고, source mount 재도입·secret default·dependency condition 삭제 같은 회귀가 build 단계에서 자동으로 차단되지 않았습니다. |
| 해결하려던 문제 | 구성 파일은 문법적으로 유효해도 delivery invariant를 깨뜨릴 수 있습니다. 특히 Compose interpolation 이후 실제 model을 기준으로 port, mount, dependency를 확인할 필요가 있었습니다. |
| 핵심 결정 | Node test가 `docker compose config` 성공/실패와 rendered model을 검사하고 Dockerfile/Caddyfile source assertion을 결합했습니다. |
| build → package → execute 흐름 | test env 구성 → required secret 누락 case는 compose config non-zero 기대 → 정상 env로 rendered config parse → service/dependency/port/volume assertion → Dockerfile/Caddyfile text assertion. |
| ownership/lifetime/cleanup | test process가 temporary command output과 parsed model을 소유하며 production files는 읽기 전용입니다. failure evidence는 assertion/exit status로 test runner에 반환됩니다. |
| failure/rollback/fail-closed | command 실행 불가 또는 assertion mismatch면 test가 실패합니다. 이 환경에서는 해당 command를 실제 실행하지 않았고 exact SHA source만 검사했습니다. |
| 보장하는 것 | 테스트를 실행하는 환경에서는 selected production Compose/image/gateway 정적 규칙의 회귀를 결정적으로 감지합니다. |
| 보장하지 않는 것 | Docker daemon에서 image가 build되는지, healthcheck가 통과하는지, signal/cleanup, migration·browser traffic이 동작하는지는 증명하지 않습니다. |
| 후속 연결 | `312ddbc6fbe2`가 기존 contract가 보지 못하던 termination budget을 수정하고 `73ba979841cd`가 새 duration assertion을 추가합니다. |

비교 기준:
- 직전 관련 SHA: `2c44cb7cd71f` — `build(docker): production container lifecycle 구성`
- 다음 관련 SHA: `312ddbc6fbe2` — `fix(runtime): container 종료 유예를 room drain과 정렬`

### 5.5. `fix(runtime): container 종료 유예를 room drain과 정렬`

| 항목 | 값 |
| --- | --- |
| SHA | `312ddbc6fbe2` |
| Importance | A |
| Tags | REALTIME, OPERATIONS, RISK |
| Source에서 확정된 역할 | API container termination grace를 application room-drain budget보다 길게 맞춥니다. |

#### 해당 SHA에서 확인할 실제 코드

- `docker-compose.yml`의 API service에 `stop_grace_period: 70s`가 추가되는 exact diff를 확인합니다.
- 동일 historical state의 application room drain budget 60초와 container orchestrator의 SIGTERM→grace→SIGKILL sequence를 연결합니다.
- 이전 Compose가 명시적 grace를 두지 않아 Docker 기본 timeout이 application cleanup 완료 전 강제 종료할 수 있었던 가정을 복원합니다.
- 70초가 60초 drain보다 10초 큰 이유를 process close와 scheduling overhead를 위한 최소 headroom으로 해석하되 실제 종료 시간 측정은 없다고 구분합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | production lifecycle은 startup readiness를 갖췄지만 API service에 `stop_grace_period`가 없었습니다. application은 room drain에 최대 60초를 사용할 수 있었으므로 container 기본 종료 예산이 더 짧을 수 있었습니다. |
| 해결하려던 문제 | orchestrator가 SIGTERM 뒤 grace 만료 시 SIGKILL하면 active room drain, final snapshot/result handoff, socket close가 중간에 끊길 수 있습니다. application의 graceful shutdown 보장은 외부 process manager 예산보다 길 수 없습니다. |
| 핵심 결정 | API service에 70초 stop grace를 명시해 60초 room-drain budget보다 긴 container termination window를 부여했습니다. |
| build → package → execute 흐름 | Compose stop → API process에 SIGTERM → application이 새 admission을 닫고 room drain/connection cleanup 수행 → 최대 60초 budget 안에 server close/exit 기대 → container는 70초까지 기다린 뒤에만 강제 종료 가능. |
| ownership/lifetime/cleanup | application이 room/session cleanup state를, Compose/Docker가 signal과 최종 process lifetime을 소유합니다. 수정은 두 owner의 timeout 계약을 정렬합니다. |
| failure/rollback/fail-closed | 이전에는 Docker grace가 먼저 만료해 cleanup을 절단할 위험이 있었습니다. 수정 후에도 application이 70초 안에 exit하지 못하면 SIGKILL될 수 있으며, crash/OOM에는 graceful path가 적용되지 않습니다. |
| 보장하는 것 | 정적 configuration에서 container grace가 known 60초 drain budget보다 깁니다. 외부 runtime이 Compose semantics를 따른다면 application에 명시된 cleanup window를 제공합니다. |
| 보장하지 않는 것 | 실제 room이 60초 안에 drain되는지, 모든 signal handler가 완료되는지, process가 70초 전에 exit하는지, 강제 종료 후 data recovery가 가능한지는 이 commit이 증명하지 않습니다. |
| 후속 연결 | `73ba979841cd`가 stop grace duration을 parse해 60초 이상이라는 회귀 계약을 추가합니다. |

비교 기준:
- 직전 관련 SHA: `e2c12ded1d5f` — `test(docker): production container contract 검증`
- 다음 관련 SHA: `73ba979841cd` — `test(docker): API 종료 유예 계약 검증`

### 5.6. `test(docker): API 종료 유예 계약 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `73ba979841cd` |
| Importance | B |
| Tags | OPERATIONS, TEST |
| Source에서 확정된 역할 | Compose의 stop grace가 60초 application drain budget 이상인지 회귀 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `tests/docker-production.test.mjs`의 duration parser가 `s`, `m` 등 Compose duration을 seconds로 변환하는 실제 구현을 확인합니다.
- rendered API service의 `stop_grace_period`가 존재하고 parsed value가 `>= 60`인지 assertion하는지 확인합니다.
- 정적 duration contract는 SIGTERM delivery, active room drain, actual exit time이나 SIGKILL 부재를 관찰하지 않는다고 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | `312ddbc6fbe2`가 70초 grace를 추가했지만 기존 Docker contract test는 그 값을 보지 않아 후속 YAML 수정으로 삭제·축소돼도 회귀를 놓칠 수 있었습니다. |
| 해결하려던 문제 | application drain과 container timeout의 교차 계층 invariant가 문서/코드 상수에만 분산돼 있었습니다. |
| 핵심 결정 | contract test에 duration parser와 API stop grace `>= 60s` assertion을 추가했습니다. |
| build → package → execute 흐름 | Compose config render → API service stop grace 문자열/normalized value 획득 → seconds 변환 → 60 이상 assertion → 미지정·짧은 값이면 test failure. |
| ownership/lifetime/cleanup | test가 cross-layer timeout relation의 정적 evidence를 소유하고 Compose가 actual runtime timeout을 소유합니다. |
| failure/rollback/fail-closed | 값이 없거나 parser가 지원하지 않는 형식이거나 60초 미만이면 contract test가 실패합니다. runtime signal test나 cleanup observation은 없습니다. |
| 보장하는 것 | 테스트 실행 시 known application drain budget보다 짧은 Compose grace 회귀를 차단합니다. |
| 보장하지 않는 것 | graceful shutdown 성공, room/result persistence, 실제 signal timing은 증명하지 않습니다. |
| 후속 연결 | Thread 04의 CI static contract command가 이 test를 workflow에서 실행하도록 연결합니다. |

비교 기준:
- 직전 관련 SHA: `312ddbc6fbe2` — `fix(runtime): container 종료 유예를 room drain과 정렬`

## 6. Invariant evolution ledger

| 시점 | 불변식 | 상태 | 실제 근거 |
| --- | --- | --- | --- |
| `f8efb2656771` | shared/db/API를 build한 뒤 non-root runner에 필요한 결과만 복사하는 multi-stage API image를 만듭니다. | 도입 | `.dockerignore`와 `apps/api/Dockerfile`이 build-time producer와 non-root compiled runtime을 분리합니다. |
| `656893e8e1cb` | Next.js standalone output과 static asset만 runner에 포함하는 multi-stage Web image를 만듭니다. | 확장 | `apps/web/Dockerfile`이 public config의 build-time lifetime과 standalone runner를 production image로 고정합니다. |
| `2c44cb7cd71f` | source-mounted Compose를 built images, one-shot migration, health-gated startup, required secrets로 교체합니다. | 도입 | `docker-compose.yml`의 required interpolation, one-shot migration, health conditions, image builds와 단일 published gateway가 production lifecycle을 정의합니다. |
| `e2c12ded1d5f` | rendered Compose와 Dockerfile이 production image/lifecycle 규칙을 유지하는지 검사합니다. | 검증·불충분 | `tests/docker-production.test.mjs`가 lifecycle 구조를 정적으로 보호하지만 stop grace와 실제 runtime behavior는 아직 검사하지 않습니다. |
| `312ddbc6fbe2` | API container termination grace를 application room-drain budget보다 길게 맞춥니다. | 수정 | API `stop_grace_period: 70s`가 orchestrator termination budget을 application 60초 drain invariant보다 크게 만듭니다. |
| `73ba979841cd` | Compose의 stop grace가 60초 application drain budget 이상인지 회귀 검증합니다. | 회귀 검증 | duration parser와 `>= 60s` assertion이 수정된 termination invariant를 정적 contract로 보호합니다. |

## 7. Failure → Fix → Test 연결

| 이전 가정 또는 failure | Fix | Regression/contract evidence | 학습자 설명 |
| --- | --- | --- | --- |
| source mount·startup install/build·다중 host port에 의존한 runtime | `2c44cb7cd71f` | `e2c12ded1d5f` | built image, one-shot migration, readiness dependencies, required secret, 단일 gateway port로 전환하고 rendered config를 정적으로 검사합니다. |
| application 60초 drain보다 container termination grace가 짧을 수 있음 | `312ddbc6fbe2` | `73ba979841cd` | API grace를 70초로 올리고 test가 60초 이상인지 검사합니다. actual signal/drain 성공은 별도 runtime evidence가 필요합니다. |

## 8. Artifact·process·resource ownership

| 대상 | 생성/빌드 주체 | 소비/실행 주체 | lifetime | 실패 시 정리/차단 |
| --- | --- | --- | --- | --- |
| API/Web image artifact | multi-stage Docker builder | non-root Node runner | image/container lifetime | install/build failure 시 image 생성 차단; runtime health는 Compose가 관찰 |
| schema migration | compiled DB CLI를 실행하는 `migrate` service | PostgreSQL | one-shot container lifetime | non-zero exit면 API `service_completed_successfully` dependency가 차단 |
| secret/config | Compose caller env와 Web build args | DB/API/Web/Caddy | Compose project 또는 image build lifetime | required DB password/session secret 누락은 interpolation fail-fast |
| termination evidence | Compose `stop_grace_period`와 static test | Docker daemon/test runner | container stop 또는 test process lifetime | 60초 미만은 test 실패; actual cleanup failure는 측정하지 않음 |

## 9. Thread 최종 상태

- 최종 delivery owner: Dockerfiles가 immutable API/Web artifacts를, Compose가 DB/migration/readiness/gateway/termination lifecycle을, static contract test가 selected configuration invariant를 소유합니다.
- source와 production artifact의 관계: runtime container에는 source bind mount나 startup build가 없고 builder가 만든 compiled/standalone artifact만 runner에 복사됩니다.
- build-time과 runtime configuration의 관계: Web `NEXT_PUBLIC_*`는 image build-time, DB URL과 session secret은 container runtime입니다. required secret은 Compose interpolation에서 먼저 검사됩니다.
- startup/readiness/shutdown contract: DB healthy → migration success → API healthy → Web healthy → Caddy publish이며, API stop grace는 70초로 60초 room drain보다 깁니다.
- fail-closed 조건: secret 누락, DB unhealthy, migration non-zero, API/Web unhealthy는 downstream 공개를 막습니다. grace 60초 미만은 contract test를 실패시킵니다.
- 검증 가능한 것과 외부 배포 환경에 남는 것: exact SHA Dockerfile/Compose/test source와 diff를 검사했습니다. Docker daemon을 사용한 image build, Compose startup, signal/drain command는 실행하지 않았습니다.

## 10. 최종 execution/delivery flow

```text
build context (`.dockerignore`)
→ dependencies stage (frozen workspace install)
→ builder (shared → DB/API 또는 shared → Next)
→ non-root API/Web runner images
Compose interpolation: required secrets
→ PostgreSQL healthy
→ one-shot compiled migration exit 0
→ API healthcheck healthy
→ Web healthcheck healthy
→ Caddy image가 :8080만 publish
stop: SIGTERM → application drain ≤ 60s → expected process exit before 70s grace
```

위 흐름을 각 단계의 실제 파일, command, artifact, process와 연결해 다시 작성합니다.

## 11. 교차 카테고리 연결

- `02-production-build-and-package-artifacts.md`: image가 복사하는 compiled artifact의 생성 규칙
- `01-runtime-composition-and-reverse-proxy-evolution.md`: 초기 source-mounted Compose와 gateway의 출발점
- `07-runtime-observability-and-service-health`: readiness, drain, graceful shutdown의 application semantics

## 12. 학습 완료 체크

- [x] 모든 Commit map SHA를 exact historical state에서 확인했습니다.
- [x] build와 runtime을 final HEAD에서 과거로 소급하지 않았습니다.
- [x] artifact producer/consumer와 package/image/process owner를 설명할 수 있습니다.
- [x] production config와 secret의 fail-closed 조건을 설명할 수 있습니다.
- [x] CI/test가 실제로 증명하는 delivery 범위와 증명하지 않는 범위를 구분할 수 있습니다.
- [x] fix와 regression evidence를 실제 이전 failure/가정에 연결했습니다.
- [x] 실행하지 않은 Docker/CI 결과를 실행 증거로 기록하지 않았습니다.
