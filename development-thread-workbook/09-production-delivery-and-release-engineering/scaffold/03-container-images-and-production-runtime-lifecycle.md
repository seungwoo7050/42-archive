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
- 직전 관련 SHA: `312ddbc6fbe2` — `fix(runtime): container 종료 유예를 room drain과 정렬`

## 6. Invariant evolution ledger

| 시점 | 불변식 | 상태 | 실제 근거 |
| --- | --- | --- | --- |
| `f8efb2656771` | shared/db/API를 build한 뒤 non-root runner에 필요한 결과만 복사하는 multi-stage API image를 만듭니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `656893e8e1cb` | Next.js standalone output과 static asset만 runner에 포함하는 multi-stage Web image를 만듭니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `2c44cb7cd71f` | source-mounted Compose를 built images, one-shot migration, health-gated startup, required secrets로 교체합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `e2c12ded1d5f` | rendered Compose와 Dockerfile이 production image/lifecycle 규칙을 유지하는지 검사합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `312ddbc6fbe2` | API container termination grace를 application room-drain budget보다 길게 맞춥니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `73ba979841cd` | Compose의 stop grace가 60초 application drain budget 이상인지 회귀 검증합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |

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
build context → dependencies stage → builder stage → runner
DB healthy
→ migration one-shot success
→ API healthy
→ Web healthy
→ Caddy publish
SIGTERM → application drain → process close before container grace expires
```

위 흐름을 각 단계의 실제 파일, command, artifact, process와 연결해 다시 작성합니다.

## 11. 교차 카테고리 연결

- `02-production-build-and-package-artifacts.md`: image가 복사하는 compiled artifact의 생성 규칙
- `01-runtime-composition-and-reverse-proxy-evolution.md`: 초기 source-mounted Compose와 gateway의 출발점
- `07-runtime-observability-and-service-health`: readiness, drain, graceful shutdown의 application semantics

## 12. 학습 완료 체크

- [ ] 모든 Commit map SHA를 exact historical state에서 확인했습니다.
- [ ] build와 runtime을 final HEAD에서 과거로 소급하지 않았습니다.
- [ ] artifact producer/consumer와 package/image/process owner를 설명할 수 있습니다.
- [ ] production config와 secret의 fail-closed 조건을 설명할 수 있습니다.
- [ ] CI/test가 실제로 증명하는 delivery 범위와 증명하지 않는 범위를 구분할 수 있습니다.
- [ ] fix와 regression evidence를 실제 이전 failure/가정에 연결했습니다.
- [ ] 실행하지 않은 Docker/CI 결과를 실행 증거로 기록하지 않았습니다.
