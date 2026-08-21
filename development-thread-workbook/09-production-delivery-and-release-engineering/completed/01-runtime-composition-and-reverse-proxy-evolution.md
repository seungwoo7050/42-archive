# 런타임 조립과 reverse proxy의 발전

- 카테고리: `09-production-delivery-and-release-engineering` — 제품 전달과 릴리스 엔지니어링
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

PostgreSQL, Fastify API, Next.js Web, Caddy를 하나의 실행 단위로 조립한 초기 Compose에서 시작해, 개발용 source-mounted runtime과 외부 gateway가 production delivery 구조로 발전하는 과정을 복원합니다.

이 문서는 완성된 해설이 아니라 exact SHA를 순서대로 확인해 제품 전달 구조의 발전을 복원하기 위한 scaffold입니다.

### 직접 연결되는 불변식

- 브라우저가 접근하는 외부 진입점은 Caddy의 단일 origin이며 API, WebSocket, Web UI의 전달 경로가 구분됩니다.
- API는 DB availability 이후에 시작하고 Web은 API와 함께 재현 가능한 multi-service runtime으로 조립됩니다.
- production start를 선택한 runtime은 Web build 결과를 실제 production server로 실행해야 합니다.
- 외부에 공개하면 안 되는 내부 운영 endpoint는 gateway에서 명시적으로 차단됩니다.
- 초기 source-mounted Compose와 최종 immutable image 기반 runtime의 차이를 구분할 수 있어야 합니다.

## 2. 핵심 질문

- 초기 `docker-compose.yml`은 어떤 service, port, volume, dependency를 소유합니까?
- Caddy의 `/api/*`, `/ws`, default handler가 외부 URL을 내부 service로 어떻게 전달합니까?
- API/Web가 dev command에서 production start 경로로 이동하면서 build와 실행 순서가 어떻게 달라집니까?
- Caddy configuration이 bind mount에서 image-owned artifact로 바뀌는 이유는 무엇입니까?
- `/api/metrics` 같은 내부 endpoint가 외부 gateway에서 차단되는 실제 route rule을 확인할 수 있습니까?

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
| 1 | `19b4d9f9083d` | `build(runtime): Compose와 Caddy 라우팅 추가` | B | REALTIME, PERSISTENCE, WEB | PostgreSQL, API, Web, Caddy를 하나의 multi-service runtime으로 구성합니다. |
| 2 | `ec000bed0414` | `build(web): production start와 TS cache 정책 구성` | B | WEB | Web package에 production server 실행 경계를 마련합니다. |
| 3 | `be15e937d718` | `fix(runtime): Compose에서 build 결과 실행` | B | WEB, OPERATIONS | Compose가 API production start와 Web build→production start 순서를 실제로 사용하도록 수정합니다. |
| 4 | `576eb97f8041` | `build(docker): Caddy reverse proxy 구성` | B | REALTIME, OPERATIONS, OBSERVABILITY | Caddy configuration을 immutable image로 옮기고 내부 metrics 경로의 외부 노출을 차단합니다. |

## 5. Commit별 학습 기록

### 5.1. `build(runtime): Compose와 Caddy 라우팅 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `19b4d9f9083d` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE, WEB |
| Source에서 확정된 역할 | PostgreSQL, API, Web, Caddy를 하나의 multi-service runtime으로 구성합니다. |

#### 해당 SHA에서 확인할 실제 코드

- parent에 없던 `docker-compose.yml`의 `db`, `api`, `web`, `caddy` service와 `pong-pong-db`, `api-node-modules`, `web-node-modules` volume의 소유 관계를 확인합니다.
- `api`/`web` command가 `corepack enable`, frozen install, `dev`를 startup마다 수행하는지와 source bind mount가 image보다 우선하는 범위를 확인합니다.
- DB `pg_isready` healthcheck와 `depends_on` 조건, host port 4000/3000/8080 공개, 고정 credential 및 migration 부재를 기록합니다.
- `Caddyfile`의 `handle_path /api/*`, `handle /ws`, default `reverse_proxy`가 prefix와 WebSocket upgrade를 어떻게 전달하는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | parent에는 네 서비스를 함께 기동하는 Compose와 외부 gateway가 없었습니다. API/Web는 repository source와 package script를 개별 실행해야 했고, DB·origin·WebSocket 경로를 한 번에 조립하는 실행 계약도 없었습니다. |
| 해결하려던 문제 | 브라우저, API, WebSocket, PostgreSQL을 동일한 개발 환경에서 재현할 표준 진입점이 없었습니다. 각 개발자가 port와 dependency를 따로 맞추면 URL·startup 순서·DB 상태가 달라질 수 있었습니다. |
| 핵심 결정 | `docker-compose.yml`에 PostgreSQL 16, Node 기반 API/Web, Caddy를 추가하고 `Caddyfile`이 `:8080` 단일 origin에서 API·WS·Web을 분기하도록 했습니다. DB healthcheck 뒤 API가 시작하고, Web/Caddy는 service-start 조건으로 연결했습니다. |
| build → package → execute 흐름 | `docker compose up` → DB volume 생성과 `pg_isready` → API/Web container가 source를 bind mount하고 startup마다 pnpm frozen install → 각각 dev server 실행 → Caddy가 `/api/*`를 prefix 제거 후 `api:4000`, `/ws`를 upgrade 가능한 채로 API, 나머지를 `web:3000`에 전달합니다. |
| ownership/lifetime/cleanup | Compose가 container·network·named volume lifetime을 소유합니다. PostgreSQL data는 `pong-pong-db`에 남고, API/Web dependency cache는 각각 named volume에 남습니다. source와 `Caddyfile`은 host bind mount라 host가 내용을 소유합니다. |
| failure/rollback/fail-closed | DB healthcheck 실패 시 API 시작이 막히지만 migration은 실행하지 않습니다. API/Web는 install 또는 dev process 실패 시 해당 container가 종료될 뿐 rollback이 없습니다. Caddy는 API/Web의 readiness가 아니라 시작 여부만 보고 기동합니다. |
| 보장하는 것 | 한 명령으로 네 service와 단일 browser origin을 조립하며, API는 DB health 이후 시작합니다. route precedence와 내부 service 이름은 파일로 재현됩니다. |
| 보장하지 않는 것 | production artifact, immutable image, required secret, migration success, API/Web readiness, 외부 port 최소화, metrics 차단을 보장하지 않습니다. 고정 개발 credential과 source mount를 사용합니다. |
| 후속 연결 | `ec000bed0414`가 Web package에 production `start` 경계를 추가하고, `be15e937d718`이 이 Compose가 실제 build 결과를 실행하도록 바꿉니다. |

비교 기준:
- 이 commit의 parent와 비교합니다.
- 다음 관련 SHA: `ec000bed0414` — `build(web): production start와 TS cache 정책 구성`

### 5.2. `build(web): production start와 TS cache 정책 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `ec000bed0414` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | Web package에 production server 실행 경계를 마련합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/package.json`에서 `build: next build`와 새 `start: next start --hostname 0.0.0.0 --port 3000`의 producer/consumer 관계를 확인합니다.
- `apps/web/tsconfig.json`의 `incremental: false`가 `.tsbuildinfo` cache를 production build 계약에서 제외하는지 확인합니다.
- 같은 SHA의 `docker-compose.yml`은 여전히 Web `dev`를 실행하므로 새 `start` script의 runtime consumer가 아직 없다는 점을 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 초기 Compose와 Web package는 `next dev`만 runtime entrypoint로 사용했습니다. `next build` 결과를 독립 production server로 소비하는 package script가 없었습니다. |
| 해결하려던 문제 | delivery 환경이 dev server를 그대로 사용하면 build-time 검증과 production process 동작을 분리할 수 없고, container나 CI가 어떤 command로 결과물을 실행해야 하는지 명시되지 않습니다. |
| 핵심 결정 | Web package에 `start`를 추가해 `next build`가 만든 `.next`를 `0.0.0.0:3000`에서 실행하도록 했고, TypeScript incremental cache를 끄는 정책을 적용했습니다. |
| build → package → execute 흐름 | producer는 `pnpm --filter @pong-pong/web build`, consumer는 `pnpm --filter @pong-pong/web start`입니다. 이 SHA에서는 package-level 경계만 생겼고 Compose는 아직 `dev`를 호출합니다. |
| ownership/lifetime/cleanup | Next build가 `.next` artifact를 생성하고 Web package가 이를 소비합니다. process lifetime은 `next start` 호출자가 소유합니다. incremental cache를 끄므로 `.tsbuildinfo` 재사용은 이 경로의 입력이 아닙니다. |
| failure/rollback/fail-closed | `start` 전에 build가 없거나 `.next`가 없으면 server는 실행할 수 없습니다. 이 commit은 호출 순서를 강제하지 않으며 artifact 정리·rollback도 추가하지 않습니다. |
| 보장하는 것 | Web package가 dev server와 production server를 서로 다른 명령으로 표현합니다. |
| 보장하지 않는 것 | Compose·Docker·CI가 이 명령을 실제로 사용한다는 보장은 없고, standalone artifact나 static asset packaging도 아직 구성하지 않습니다. |
| 후속 연결 | `be15e937d718`이 Compose Web command를 `build && start`로 바꾸고 `.next` volume을 추가합니다. |

비교 기준:
- 직전 관련 SHA: `19b4d9f9083d` — `build(runtime): Compose와 Caddy 라우팅 추가`
- 다음 관련 SHA: `be15e937d718` — `fix(runtime): Compose에서 build 결과 실행`

### 5.3. `fix(runtime): Compose에서 build 결과 실행`

| 항목 | 값 |
| --- | --- |
| SHA | `be15e937d718` |
| Importance | B |
| Tags | WEB, OPERATIONS |
| Source에서 확정된 역할 | Compose가 API production start와 Web build→production start 순서를 실제로 사용하도록 수정합니다. |

#### 해당 SHA에서 확인할 실제 코드

- parent의 `docker-compose.yml`과 비교해 API command가 `dev`에서 `start`로, Web command가 `dev`에서 `build && start`로 바뀐 정확한 shell chain을 확인합니다.
- 새 `web-next` named volume이 `/workspace/apps/web/.next` artifact를 소유하고 source bind mount와 어떤 순서로 결합되는지 확인합니다.
- install은 여전히 startup마다 수행되고 API/Web source도 bind mount된다는 점을 기록해 production-like process와 immutable delivery를 구분합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | `ec000bed0414`에서 Web `start`가 생겼지만 Compose는 API/Web 모두 dev command를 사용했습니다. 따라서 Compose 성공은 production server가 build 결과를 실행할 수 있다는 증거가 아니었습니다. |
| 해결하려던 문제 | runtime 선언과 package delivery 경계가 불일치했습니다. Web artifact를 만들지 않고 `start`할 수 없고, dev server를 계속 쓰면 production process 전환이 실제 조립 경로에 반영되지 않습니다. |
| 핵심 결정 | API는 package `start`, Web은 startup shell에서 `build && start`를 실행하도록 바꿨습니다. `.next`를 보존할 `web-next` volume도 추가했습니다. |
| build → package → execute 흐름 | container 시작 → corepack/frozen install → API `start`; Web은 install → `next build` 성공 → `next start`. `&&` 때문에 build가 실패하면 production server는 실행되지 않습니다. |
| ownership/lifetime/cleanup | Web container가 startup 중 `.next`를 만들고 `web-next` volume이 container 재생성 사이 artifact를 보유합니다. Compose가 process와 volume lifecycle을 소유하지만 source는 계속 host가 소유합니다. |
| failure/rollback/fail-closed | Web build 실패는 `&&`에서 startup을 차단합니다. API start 실패도 container 종료로 드러납니다. 다만 startup마다 install/build하므로 느린 기동·network dependency·stale volume 위험은 남습니다. |
| 보장하는 것 | 이 Compose 경로에서는 dev server 대신 API production start와 Web build 결과 실행이 선택됩니다. |
| 보장하지 않는 것 | image build 시점의 artifact 고정, one-shot migration, readiness-gated gateway, non-root runner를 보장하지 않습니다. `.next` volume의 오래된 파일 정리 정책도 없습니다. |
| 후속 연결 | `576eb97f8041`이 gateway config 자체를 image artifact로 만들고 metrics 차단을 추가합니다. source mount 제거와 built image 소비는 `2c44cb7cd71f`에서 완성됩니다. |

비교 기준:
- 직전 관련 SHA: `ec000bed0414` — `build(web): production start와 TS cache 정책 구성`
- 다음 관련 SHA: `576eb97f8041` — `build(docker): Caddy reverse proxy 구성`

### 5.4. `build(docker): Caddy reverse proxy 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `576eb97f8041` |
| Importance | B |
| Tags | REALTIME, OPERATIONS, OBSERVABILITY |
| Source에서 확정된 역할 | Caddy configuration을 immutable image로 옮기고 내부 metrics 경로의 외부 노출을 차단합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 새 `Caddy.Dockerfile`의 `FROM caddy:2-alpine`과 `COPY Caddyfile /etc/caddy/Caddyfile`로 config ownership이 image layer로 이동하는지 확인합니다.
- `Caddyfile`의 `route`, `@metrics path /api/metrics`, `respond @metrics 404`가 일반 `/api/*` proxy보다 먼저 평가되는지 확인합니다.
- 이 SHA의 `docker-compose.yml`은 Caddy image build를 아직 소비하지 않고 기존 `caddy:2-alpine`과 bind mount를 유지한다는 historical gap을 명시합니다.
- 후속 `2c44cb7cd71f`에서야 Compose `caddy.build.dockerfile: Caddy.Dockerfile`이 연결되는 handoff를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | gateway는 upstream Caddy image와 host `Caddyfile` bind mount에 의존했고 `/api/*`가 metrics endpoint까지 그대로 API로 전달했습니다. |
| 해결하려던 문제 | host config 변경이 runtime behavior를 바꿀 수 있어 배포 artifact와 route 정책이 분리됐고, 내부 운영 endpoint가 공개 gateway를 통해 노출될 수 있었습니다. |
| 핵심 결정 | Caddy config를 전용 image에 COPY하고, route 첫 단계에서 `/api/metrics`를 404로 종료한 뒤 나머지 API/WS/Web proxy를 유지했습니다. |
| build → package → execute 흐름 | image build가 Caddyfile을 `/etc/caddy/Caddyfile`에 고정 → request가 `route`에 진입 → metrics exact path는 404 → `/api/*`는 API → `/ws`는 WebSocket upstream → default는 Web입니다. |
| ownership/lifetime/cleanup | 정의상 Caddy image layer가 config를 소유합니다. 그러나 이 exact SHA의 Compose는 아직 새 image를 선택하지 않아 실제 조립 runtime의 config owner는 계속 host bind mount입니다. |
| failure/rollback/fail-closed | 잘못된 Caddyfile은 image build 또는 Caddy startup에서 실패할 수 있습니다. metrics는 gateway에서 fail-closed 404가 되지만 직접 API port 접근은 이 SHA의 Compose가 여전히 host 4000을 공개하므로 차단되지 않습니다. |
| 보장하는 것 | 전용 image를 사용하는 consumer는 route config와 metrics 차단을 immutable artifact로 받을 수 있습니다. |
| 보장하지 않는 것 | 이 commit만으로 Compose가 그 image를 사용하거나 내부 API port를 닫는 것은 아닙니다. route runtime test도 추가하지 않습니다. |
| 후속 연결 | `2c44cb7cd71f`이 Caddy image build를 production Compose에 연결하고 API/Web host port와 bind mount를 제거하며, `e2c12ded1d5f`이 그 정적 계약을 검사합니다. |

비교 기준:
- 직전 관련 SHA: `be15e937d718` — `fix(runtime): Compose에서 build 결과 실행`

## 6. Invariant evolution ledger

| 시점 | 불변식 | 상태 | 실제 근거 |
| --- | --- | --- | --- |
| `19b4d9f9083d` | PostgreSQL, API, Web, Caddy를 하나의 multi-service runtime으로 구성합니다. | 도입 | `docker-compose.yml`의 네 service, DB health dependency, named volume과 `Caddyfile`의 세 route가 최초 multi-service runtime을 정의합니다. |
| `ec000bed0414` | Web package에 production server 실행 경계를 마련합니다. | 확장 | `apps/web/package.json`의 `start`가 build artifact 소비 경계를 만들지만 같은 SHA의 Compose는 아직 이를 사용하지 않습니다. |
| `be15e937d718` | Compose가 API production start와 Web build→production start 순서를 실제로 사용하도록 수정합니다. | 수정 | `docker-compose.yml`의 command와 `web-next` volume이 package-level production start를 실제 runtime consumer에 연결합니다. |
| `576eb97f8041` | Caddy configuration을 immutable image로 옮기고 내부 metrics 경로의 외부 노출을 차단합니다. | 확장 | `Caddy.Dockerfile`과 route 우선순위가 immutable gateway artifact와 metrics fail-closed 정책을 정의하지만 Compose 소비는 후속 Thread로 이관됩니다. |

## 7. Failure → Fix → Test 연결

| 이전 가정 또는 failure | Fix | Regression/contract evidence | 학습자 설명 |
| --- | --- | --- | --- |
| Web package에 `start`는 생겼지만 Compose가 계속 `dev`를 호출함 | `be15e937d718` | 동일 SHA의 `docker-compose.yml` command | Web은 `build && start`를 거치므로 build 실패 시 server가 시작되지 않습니다. 다만 artifact 존재 회귀 검사는 Thread 02에서 추가됩니다. |
| host bind-mounted gateway config와 `/api/metrics` 외부 전달 | `576eb97f8041` | 후속 `2c44cb7cd71f` + `e2c12ded1d5f` | 전용 Caddy image와 404 route가 정책을 정의하고, 후속 production Compose/contract test가 실제 consumer와 정적 회귀를 연결합니다. |

## 8. Artifact·process·resource ownership

| 대상 | 생성/빌드 주체 | 소비/실행 주체 | lifetime | 실패 시 정리/차단 |
| --- | --- | --- | --- | --- |
| Web `.next` artifact | Compose Web startup의 `next build` | 같은 container의 `next start` | `web-next` named volume lifetime | build 실패 시 `&&`가 start를 차단; stale artifact 정리는 없음 |
| Caddy configuration | 처음에는 host file, `576...`부터 image build | Caddy process | bind mount 또는 image layer lifetime | config 오류 시 Caddy startup 실패; exact SHA의 Compose handoff는 아직 없음 |
| PostgreSQL data/credential | Postgres service와 Compose env | API DB client | `pong-pong-db` volume | DB health 실패 시 API start 차단; migration·secret fail-closed는 없음 |
| route contract evidence | exact SHA의 Caddyfile diff 검사 | 학습자/후속 contract test | repository history | 실행하지 않았으므로 runtime routing 성공은 주장하지 않음 |

## 9. Thread 최종 상태

- 최종 delivery owner: 이 Thread 마지막 SHA 기준으로 Compose가 service 조립을, package scripts가 API/Web process를, Caddy image 정의가 gateway config artifact를 소유합니다. 실제 Caddy image 소비는 후속 `2c44cb7cd71f`의 책임입니다.
- source와 production artifact의 관계: API/Web는 여전히 source bind mount와 startup install에 의존하지만 production package command를 실행합니다. gateway config만 image artifact로 정의되었습니다.
- build-time과 runtime configuration의 관계: Web build와 start가 같은 startup shell에 있어 `NEXT_PUBLIC_*` 값은 startup build 시 고정됩니다. Caddy route는 image build 시 고정될 수 있으나 이 SHA의 Compose는 bind mount를 사용합니다.
- startup/readiness/shutdown contract: DB health 뒤 API가 시작하지만 API/Web/Caddy는 readiness gate가 없고 shutdown budget도 없습니다.
- fail-closed 조건: Web build 실패는 start를 막고 gateway metrics path는 404입니다. required secret·migration·내부 port 공개는 아직 fail-closed가 아닙니다.
- 검증 가능한 것과 외부 배포 환경에 남는 것: exact SHA 파일/diff로 command, dependency, route를 확인했습니다. Docker/Compose/Caddy process는 실행하지 않았으므로 image build·route runtime·network 동작 증거는 없습니다.

## 10. 최종 execution/delivery flow

```text
browser → Caddy :8080
Caddy `/api/metrics` → 404
Caddy `/api/*` → Fastify :4000 (`handle_path`가 `/api` 제거)
Caddy `/ws` → Fastify WebSocket :4000
Caddy default → Next.js :3000
PostgreSQL health → API production start
Web startup → frozen install → `next build` → `next start`
Caddy image 정의 → 후속 `2c44cb7cd71f`에서 Compose consumer 연결
```

위 흐름을 각 단계의 실제 파일, command, artifact, process와 연결해 다시 작성합니다.

## 11. 교차 카테고리 연결

- `02-production-build-and-package-artifacts.md`: source 실행이 compiled artifact 실행으로 바뀌는 단계
- `03-container-images-and-production-runtime-lifecycle.md`: source-mounted service와 Caddy image 정의가 built image와 health-gated lifecycle로 연결되는 단계
- `07-runtime-observability-and-service-health`: readiness와 graceful drain 자체의 애플리케이션 의미

## 12. 학습 완료 체크

- [x] 모든 Commit map SHA를 exact historical state에서 확인했습니다.
- [x] build와 runtime을 final HEAD에서 과거로 소급하지 않았습니다.
- [x] artifact producer/consumer와 package/image/process owner를 설명할 수 있습니다.
- [x] production config와 secret의 fail-closed 조건을 설명할 수 있습니다.
- [x] CI/test가 실제로 증명하는 delivery 범위와 증명하지 않는 범위를 구분할 수 있습니다.
- [x] fix와 regression evidence를 실제 이전 failure/가정에 연결했습니다.
- [x] 실행하지 않은 Docker/CI 결과를 실행 증거로 기록하지 않았습니다.
