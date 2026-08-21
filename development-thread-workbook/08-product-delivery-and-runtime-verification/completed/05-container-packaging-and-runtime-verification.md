# Thread: Container packaging and runtime verification

> Project: 42 Archive Portfolio (`web/portfolio`)
>
> 이 문서는 원본 Development Thread를 변경하지 않고, 같은 branch history에 product-delivery 관점을 추가한 확장 workbook입니다.

## 0. 분류 출처와 변경 가능 범위

- Commit SHA, subject, importance, tags는 `commit/commit-importance.md`의 branch-scoped 분류를 사용합니다.
- Phase 1 audit에서 category/thread grouping과 commit set을 실제 history에 대조한 뒤 이 문서를 freeze했습니다.
- Phase 2는 freeze된 구조와 fixed metadata를 바꾸지 않고 learner-facing 기록만 완성합니다.
- 다른 branch의 구현이나 final HEAD를 과거 SHA 설명에 소급하지 않습니다.
- 실행하지 않은 build/test/CI/Docker 결과는 exact-SHA source inspection과 구분합니다.

## 1. Thread 목표

verified standalone output을 최소 runtime image로 옮기고, public assets를 명시적으로 포함하며, non-root process·실제 HTTP routes·content-derived assets를 ephemeral container에서 검증한 뒤 같은 contract를 CI에 연결하는 과정을 복원합니다.

### 계획된 핵심 invariant

- builder는 pinned Node/npm graph에서 production build와 standalone verification을 통과해야 runtime stage를 만들 수 있습니다.
- runner는 standalone server, `.next/static`, `public`만 명시적으로 가져오고 `node` user로 실행합니다.
- container test는 unique image/container name과 loopback ephemeral port를 사용하고 readiness를 bounded retry로 기다립니다.
- content JSON이 참조하는 `/content`·`/template` assets는 200, non-empty body와 supported MIME contract를 만족해야 합니다.
- 실패·성공 여부와 관계없이 started container와 temporary image cleanup을 시도합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- standalone output에 자동 포함되지 않는 `.next/static`과 `public`을 final image로 누가 복사하는가?
- Docker multi-stage build에서 dependency install, build args, artifact verification과 runtime user의 ownership이 어떻게 분리되는가?
- container verifier가 readiness, non-root identity, routes, dynamically discovered assets와 cleanup을 어떤 state machine으로 수행하는가?
- default template-mode image test가 production content/origin, image security, multi-architecture와 orchestrator behavior에 대해 무엇을 보장하지 않는가?

## 3. 완료 기준

- 각 SHA의 parent diff와 resulting tree에서 실제 변경 file, function, config, script와 workflow step을 확인했습니다.
- Source, generated artifact, CI gate, container/runtime owner를 구분했습니다.
- Missing artifact, portability failure, threshold violation, startup failure와 cleanup branch를 기록했습니다.
- Test/CI command의 technique, production path, proves/does-not-prove와 실제 실행 여부를 구분했습니다.
- 최종 product-delivery 흐름과 cross-thread handoff를 코드 없이 설명할 수 있습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | 확장 thread에서 확인할 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `b87a2b453741` | build(docker): public 자산을 포함한 비루트 standalone image 추가 | A | DEPLOY | deployable image boundary — verified standalone artifact, static/public assets와 non-root runtime을 multi-stage Dockerfile로 구성합니다. |
| 2 | `b94fa6dd0118` | test(docker): runtime route와 public 자산 검증 자동화 | A | ARCH, VALIDATION, ROUTING | end-to-end runtime contract — image build부터 non-root identity, HTTP routes/assets와 cleanup까지 자동화하고 CI에 연결합니다. |

## 5. Commit별 학습 기록

각 section은 반드시 해당 SHA의 tree와 parent diff를 기준으로 작성합니다. 다른 Thread의 later commit은 관계 설명에만 사용하고 과거 구현에 소급하지 않습니다.

### 1. `b87a2b453741` — build(docker): public 자산을 포함한 비루트 standalone image 추가

- **Full SHA:** `b87a2b4537418771530ae520df448ca84142f80c`
- **Importance:** A
- **Tags:** DEPLOY
- **확장 thread에서의 역할:** deployable image boundary — verified standalone artifact, static/public assets와 non-root runtime을 multi-stage Dockerfile로 구성합니다.

#### 해당 SHA에서 확인할 실제 코드

- dependencies/builder/runner 세 stage의 base image, npm pin, workdir, copy와 command ordering을 추적합니다.
- `ARG PORTFOLIO_CONTENT_MODE=template`와 `ARG SITE_URL`이 builder environment에만 전달되고 final runtime environment에는 무엇이 남는지 확인합니다.
- builder의 `npm run build && npm run build:verify`가 image assembly를 fail-closed로 막는지 확인합니다.
- runner가 `USER node`와 `--chown=node:node` copy를 사용하고 standalone, static, public을 각각 별도 source에서 가져오는 이유를 기록합니다.
- `.dockerignore`가 credentials/local output을 build context에서 제외하지만 supply-chain/image scan을 제공하지 않는다는 범위를 명시합니다.

확인 원칙:

- 먼저 `b87a2b453741^`와 `b87a2b453741`를 비교하고, 필요한 file은 `b87a2b453741:<path>`의 resulting tree에서 읽습니다.
- Final HEAD의 workflow, script, Dockerfile 또는 generated output을 이 commit에 소급하지 않습니다.
- Commit subject나 body만으로 behavior를 추정하지 않고 실제 changed code/test/config를 기준으로 판단합니다.
- 실제 실행하지 않은 command 결과는 code inspection과 분리합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 전달 상태와 부족함 | standalone artifact와 CI file-layout check는 있었지만 이를 실행 가능한 image로 조립하는 Dockerfile이 없었습니다. 특히 Next standalone trace에 자동 포함되지 않는 `public` directory와 generated static assets의 배치 owner가 정의되지 않았습니다. |
| 실제 변경 file/symbol/command/artifact | Node 24.18.0 bookworm-slim 기반 3-stage Dockerfile과 `.dockerignore`를 추가했습니다. dependencies stage는 npm 11.16.0과 `npm ci`, builder는 content mode/origin args를 환경으로 전달하고 build+verify를 수행합니다. runner는 `USER node`, host 0.0.0.0, port 3100으로 standalone, `.next/static`, `public`을 `--chown=node:node`로 복사해 `node server.js`를 실행합니다. |
| Build/runtime/resource owner와 lifetime | dependencies stage가 install graph를, builder stage가 source/build output을, runner stage가 deployable filesystem/process identity를 소유합니다. multi-stage boundary에서 development node_modules/source는 final image로 직접 복사되지 않습니다. |
| Failure·missing output·cleanup 처리 | `npm ci`, content readiness/build 또는 `build:verify`가 실패하면 final image가 생성되지 않습니다. source path가 없으면 Docker COPY가 실패합니다. 이 SHA에는 built image를 실행하거나 UID/HTTP/assets를 검증하는 command가 없습니다. |
| 보장하는 것과 보장하지 않는 것 | image recipe는 pinned runtime, verified standalone entry, generated static, public assets와 named non-root user를 명시합니다. image vulnerability/signature, exact numeric UID, production content mode, runtime response, multi-arch build와 orchestrator policy는 보장하지 않습니다. |
| 다음 delivery commit 또는 관련 test 연결 | `b94fa6dd0118`이 actual image를 build/run하고 Config.User, routes와 content-derived assets를 검사합니다. |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** Parent에는 `Dockerfile`과 `.dockerignore`가 없습니다.
- **해당 SHA 핵심 코드:** `b87a2b4537418771530ae520df448ca84142f80c` · `Dockerfile`

```text
FROM node:24.18.0-bookworm-slim AS builder
ARG PORTFOLIO_CONTENT_MODE=template
ARG SITE_URL
ENV PORTFOLIO_CONTENT_MODE=$PORTFOLIO_CONTENT_MODE
ENV SITE_URL=$SITE_URL
COPY . .
RUN npm run build && npm run build:verify

FROM node:24.18.0-bookworm-slim AS runner
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3100
WORKDIR /app
USER node
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
CMD ["node", "server.js"]
```

- **관찰 근거의 성격:** Exact-SHA Dockerfile/build-context diff에서 직접 확인한 image assembly contract입니다.
- **실행·테스트 증거:** 실행하지 않음. 현재 작업 환경에서는 `web/portfolio`의 Git checkout, npm dependency tree, Chromium 및 Docker daemon을 사용할 수 없었습니다. GitHub connector로 해당 SHA의 commit diff와 resulting source를 검사했으며, command 성공 결과는 주장하지 않습니다.
- **다음 commit 연결:** `b94fa6dd0118`이 actual image를 build/run하고 Config.User, routes와 content-derived assets를 검사합니다.

### 2. `b94fa6dd0118` — test(docker): runtime route와 public 자산 검증 자동화

- **Full SHA:** `b94fa6dd0118322ff57dc84b180b1c179ca8a867`
- **Importance:** A
- **Tags:** ARCH, VALIDATION, ROUTING
- **확장 thread에서의 역할:** end-to-end runtime contract — image build부터 non-root identity, HTTP routes/assets와 cleanup까지 자동화하고 CI에 연결합니다.

#### 해당 SHA에서 확인할 실제 코드

- `scripts/verify-container-runtime.mjs`의 random suffix, image/container names와 `docker()` child-process wrapper의 capture/non-capture behavior를 추적합니다.
- `discoverAssets`가 top-level `src/content/*.json`을 recursive value traversal해 `/content/`·`/template/` string만 deduplicate하는지 확인합니다.
- build → detached run → ephemeral loopback port parse → 최대 60×1초 readiness → Config.User → two routes → every asset 순서를 state transition으로 기록합니다.
- `verifyResponse`의 status 200, non-empty body, extension-based MIME checks와 supported extension set을 확인합니다.
- `failed`/`containerStarted` flags, failure log, `finally`의 container/image removal과 cleanup error precedence를 설명합니다.
- workflow 마지막 `npm run test:container`이 Docker availability를 CI precondition으로 만드는지 확인합니다.

확인 원칙:

- 먼저 `b94fa6dd0118^`와 `b94fa6dd0118`를 비교하고, 필요한 file은 `b94fa6dd0118:<path>`의 resulting tree에서 읽습니다.
- Final HEAD의 workflow, script, Dockerfile 또는 generated output을 이 commit에 소급하지 않습니다.
- Commit subject나 body만으로 behavior를 추정하지 않고 실제 changed code/test/config를 기준으로 판단합니다.
- 실제 실행하지 않은 command 결과는 code inspection과 분리합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 전달 상태와 부족함 | Dockerfile은 있었지만 image를 실제로 시작해 non-root user, standalone HTTP routes와 copied public assets를 검증하거나 temporary resources를 정리하는 automated contract가 없었습니다. |
| 실제 변경 file/symbol/command/artifact | `test:container`, 203-line verifier와 CI step을 추가했습니다. script는 unique tag/name으로 image를 build하고 host loopback의 random published port로 container를 시작합니다. readiness 후 Docker inspect user가 `node`인지 확인하고 `/`, `/projects/example-project?view=classic`, 그리고 content JSON에서 발견한 모든 supported public asset을 요청합니다. |
| Build/runtime/resource owner와 lifetime | test script가 temporary Docker resources의 full lifecycle을 소유합니다. `docker()`가 child process exit/stdout/stderr를, flags가 state를, `finally`가 cleanup을 관리합니다. content JSON은 asset set source of truth이고 MIME map은 supported serving contract를 소유합니다. |
| Failure·missing output·cleanup 처리 | Docker command non-zero, asset set empty, port parse 실패, 60초 readiness timeout, root/empty user, non-200, empty body, MIME mismatch/unsupported extension이 test를 실패시킵니다. failure 시 container logs를 best-effort 출력합니다. started container와 image는 `finally`에서 제거하고, primary failure가 이미 있으면 cleanup error는 원인을 가리지 않도록 억제합니다. |
| 보장하는 것과 보장하지 않는 것 | default Docker build로 만들어진 image가 named `node` user로 시작하고 두 HTML routes와 content-referenced public assets를 실제 HTTP로 제공합니다. default build는 template mode이며 production `SITE_URL` readiness, numeric UID/capabilities, image CVEs/signing, healthcheck, multi-arch, load/concurrency, redirect semantics과 orchestrator restart는 보장하지 않습니다. |
| 다음 delivery commit 또는 관련 test 연결 | Thread 3의 standalone contract와 이 Thread의 Dockerfile을 actual runtime evidence로 연결하며, CI workflow의 마지막 gate가 됩니다. |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** Parent에는 container verification script/package command/CI step이 없습니다.
- **해당 SHA 핵심 코드:** `b94fa6dd0118322ff57dc84b180b1c179ca8a867` · `scripts/verify-container-runtime.mjs`

```text
} finally {
  if (containerStarted) {
    try {
      await docker(["rm", "--force", containerName], { capture: true });
    } catch (error) {
      if (!failed) throw error;
    }
  }
  try {
    await docker(["image", "rm", "--force", imageName], { capture: true });
  } catch (error) {
    if (!failed) throw error;
  }
}
```

- **관찰 근거의 성격:** Exact-SHA verifier/workflow implementation에서 직접 확인한 Docker E2E state machine입니다.
- **실행·테스트 증거:** 실행하지 않음. 현재 작업 환경에서는 `web/portfolio`의 Git checkout, npm dependency tree, Chromium 및 Docker daemon을 사용할 수 없었습니다. GitHub connector로 해당 SHA의 commit diff와 resulting source를 검사했으며, command 성공 결과는 주장하지 않습니다.
- **다음 commit 연결:** Thread 3의 standalone contract와 이 Thread의 Dockerfile을 actual runtime evidence로 연결하며, CI workflow의 마지막 gate가 됩니다.

## 6. Invariant ledger

| Invariant | 이전 상태 | 도입·수정 | 검증·소비 | 남은 비보장 |
| --- | --- | --- | --- | --- |
| Image assembly | artifact files만 local `.next`에 존재 | `b87a2b453741` multi-stage build가 verified output을 runtime stage로 copy | Docker build가 build+verify 실패를 차단 | supply-chain·multiarch |
| Runtime identity | standalone process user 미검증 | Dockerfile `USER node` + chowned files | `b94fa6dd0118`이 Config.User를 actual container에서 확인 | numeric UID/capabilities |
| Static/public delivery | standalone trace 외부 | static/public explicit copy | content-derived HTTP/MIME verification | JSON 밖 assets·unsupported types |
| Temporary resource lifetime | manual Docker lifecycle | unique names + state flags | failure logs + finally removal | daemon-level leaked state on hard termination |
| CI runtime gate | image recipe local-only | `test:container` package command | workflow last step에서 actual Docker contract 실행 | external registry/deployment |

## 7. Failure → Fix → Test 연결

| Failure 또는 위험 | Fix/decision | Test·gate evidence | 한계 |
| --- | --- | --- | --- |
| standalone image에 public/static 누락 | three explicit COPY boundaries | content-derived HTTP/MIME test | JSON이 참조하지 않는 public file은 미검사 |
| container가 root로 실행 | `USER node` + chown | Docker inspect Config.User equality | numeric UID/capability policy 없음 |
| server startup 지연/실패 | bounded 60-attempt readiness loop | last error를 포함해 timeout failure | dedicated health endpoint 없음 |
| temporary image/container 누적 | random unique names + finally cleanup | primary error 보존, success cleanup failure는 표면화 | process kill/daemon crash는 제외 |
| local-only image confidence | CI `npm run test:container` | build/run/routes/assets가 integration gate | registry push/orchestrator는 없음 |

## 8. Ownership / state / responsibility 변화

| 대상 | 이전 owner/state | 중간 변화 | 최종 owner/state |
| --- | --- | --- | --- |
| Dependency graph | host install | Docker dependencies stage | builder가 consume |
| Build artifact | local `.next` | Docker builder + `build:verify` | runner에 selected copy |
| Runtime process/files | 정의 없음 | runner stage + `node` user | container verifier가 observe |
| Asset inventory | manual list 가능성 | authoritative content JSON traversal | MIME map + HTTP verifier |
| Temporary resources | manual | test script flags/names | `finally` cleanup |

## 9. Thread 최종 상태

pinned runtime에서 build/verify된 standalone artifact, generated static과 public directory를 포함한 image가 named non-root `node` user로 실행됩니다. CI는 실제 image를 ephemeral loopback port에서 시작해 two routes와 content-derived assets의 200/non-empty/MIME contract를 검사하고 resources를 정리합니다. 이는 image runtime contract이지 production hosting, registry, security scan 또는 production content publication 증명은 아닙니다.

## 10. 최종 product-delivery flow 정리

Docker context filtering → pinned Node/npm dependency stage의 `npm ci` → builder가 content args를 받고 production build + standalone verify → runner가 standalone/static/public만 chown-copy → unique image build → detached non-root container를 random loopback port에 publish → bounded readiness → user inspect → HTML routes → JSON-derived assets/MIME 검증 → failure log → container/image cleanup → CI exit status.

## 11. 학습 완료 자가 점검

- [x] standalone, generated static과 public의 서로 다른 copy ownership을 설명했습니다.
- [x] multi-stage build의 build-time args와 final runtime environment를 구분했습니다.
- [x] container verifier의 state transition, retry, failure와 cleanup을 복원했습니다.
- [x] content-derived asset discovery/MIME coverage와 누락 범위를 기록했습니다.
- [x] template-mode CI image test와 production deployment 보장을 혼동하지 않았습니다.
- [ ] Exact-SHA runtime command를 직접 실행해 결과를 기록했습니다. — 실행하지 않음. 현재 작업 환경에서는 `web/portfolio`의 Git checkout, npm dependency tree, Chromium 및 Docker daemon을 사용할 수 없었습니다. GitHub connector로 해당 SHA의 commit diff와 resulting source를 검사했으며, command 성공 결과는 주장하지 않습니다.
