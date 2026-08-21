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
| 직전 관련 상태 | [파일·command·artifact·process 상태 작성] |
| 해결하려던 문제 | [development/runtime 또는 delivery gap 작성] |
| 핵심 결정 | [build/package/image/workflow/config 변경 작성] |
| build → package → execute 흐름 | [producer/consumer command 순서 작성] |
| ownership/lifetime/cleanup | [artifact·process·container·resource owner 작성] |
| failure/rollback/fail-closed | [실패 분기와 startup/cleanup 동작 작성] |
| 보장하는 것 | [실제 코드/contract로 증명되는 범위 작성] |
| 보장하지 않는 것 | [환경 외부 또는 아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

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
| 직전 관련 상태 | [파일·command·artifact·process 상태 작성] |
| 해결하려던 문제 | [development/runtime 또는 delivery gap 작성] |
| 핵심 결정 | [build/package/image/workflow/config 변경 작성] |
| build → package → execute 흐름 | [producer/consumer command 순서 작성] |
| ownership/lifetime/cleanup | [artifact·process·container·resource owner 작성] |
| failure/rollback/fail-closed | [실패 분기와 startup/cleanup 동작 작성] |
| 보장하는 것 | [실제 코드/contract로 증명되는 범위 작성] |
| 보장하지 않는 것 | [환경 외부 또는 아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

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
| 직전 관련 상태 | [파일·command·artifact·process 상태 작성] |
| 해결하려던 문제 | [development/runtime 또는 delivery gap 작성] |
| 핵심 결정 | [build/package/image/workflow/config 변경 작성] |
| build → package → execute 흐름 | [producer/consumer command 순서 작성] |
| ownership/lifetime/cleanup | [artifact·process·container·resource owner 작성] |
| failure/rollback/fail-closed | [실패 분기와 startup/cleanup 동작 작성] |
| 보장하는 것 | [실제 코드/contract로 증명되는 범위 작성] |
| 보장하지 않는 것 | [환경 외부 또는 아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

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
| 직전 관련 상태 | [파일·command·artifact·process 상태 작성] |
| 해결하려던 문제 | [development/runtime 또는 delivery gap 작성] |
| 핵심 결정 | [build/package/image/workflow/config 변경 작성] |
| build → package → execute 흐름 | [producer/consumer command 순서 작성] |
| ownership/lifetime/cleanup | [artifact·process·container·resource owner 작성] |
| failure/rollback/fail-closed | [실패 분기와 startup/cleanup 동작 작성] |
| 보장하는 것 | [실제 코드/contract로 증명되는 범위 작성] |
| 보장하지 않는 것 | [환경 외부 또는 아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

비교 기준:
- 직전 관련 SHA: `be15e937d718` — `fix(runtime): Compose에서 build 결과 실행`

## 6. Invariant evolution ledger

| 시점 | 불변식 | 상태 | 실제 근거 |
| --- | --- | --- | --- |
| `19b4d9f9083d` | PostgreSQL, API, Web, Caddy를 하나의 multi-service runtime으로 구성합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `ec000bed0414` | Web package에 production server 실행 경계를 마련합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `be15e937d718` | Compose가 API production start와 Web build→production start 순서를 실제로 사용하도록 수정합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `576eb97f8041` | Caddy configuration을 immutable image로 옮기고 내부 metrics 경로의 외부 노출을 차단합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |

## 7. Failure → Fix → Test 연결

| 이전 가정 또는 failure | Fix | Regression/contract evidence | 학습자 설명 |
| --- | --- | --- | --- |
| [실제 이전 상태] | [관련 fix SHA] | [관련 test/CI SHA] | [왜 다시 깨지지 않는지와 남은 비보장 작성] |
| [실제 이전 상태] | [관련 fix SHA] | [관련 test/CI SHA] | [왜 다시 깨지지 않는지와 남은 비보장 작성] |

## 8. Artifact·process·resource ownership

| 대상 | 생성/빌드 주체 | 소비/실행 주체 | lifetime | 실패 시 정리/차단 |
| --- | --- | --- | --- | --- |
| package artifact | [작성] | [작성] | [작성] | [작성] |
| process/image/container | [작성] | [작성] | [작성] | [작성] |
| migration/config/secret | [작성] | [작성] | [작성] | [작성] |
| CI verification evidence | [작성] | [작성] | [작성] | [작성] |

## 9. Thread 최종 상태

- 최종 delivery owner: [작성]
- source와 production artifact의 관계: [작성]
- build-time과 runtime configuration의 관계: [작성]
- startup/readiness/shutdown contract: [작성]
- fail-closed 조건: [작성]
- 검증 가능한 것과 외부 배포 환경에 남는 것: [작성]

## 10. 최종 execution/delivery flow

```text
browser → Caddy :8080
Caddy `/api/*` → Fastify :4000
Caddy `/ws` → Fastify WebSocket upgrade
Caddy default → Next.js :3000
DB availability → API → Web → gateway
```

위 흐름을 각 단계의 실제 파일, command, artifact, process와 연결해 다시 작성합니다.

## 11. 교차 카테고리 연결

- `02-production-build-and-package-artifacts.md`: source 실행이 compiled artifact 실행으로 바뀌는 단계
- `03-container-images-and-production-runtime-lifecycle.md`: source-mounted service와 Caddy image 정의가 built image와 health-gated lifecycle로 연결되는 단계
- `07-runtime-observability-and-service-health`: readiness와 graceful drain 자체의 애플리케이션 의미

## 12. 학습 완료 체크

- [ ] 모든 Commit map SHA를 exact historical state에서 확인했습니다.
- [ ] build와 runtime을 final HEAD에서 과거로 소급하지 않았습니다.
- [ ] artifact producer/consumer와 package/image/process owner를 설명할 수 있습니다.
- [ ] production config와 secret의 fail-closed 조건을 설명할 수 있습니다.
- [ ] CI/test가 실제로 증명하는 delivery 범위와 증명하지 않는 범위를 구분할 수 있습니다.
- [ ] fix와 regression evidence를 실제 이전 failure/가정에 연결했습니다.
- [ ] 실행하지 않은 Docker/CI 결과를 실행 증거로 기록하지 않았습니다.
