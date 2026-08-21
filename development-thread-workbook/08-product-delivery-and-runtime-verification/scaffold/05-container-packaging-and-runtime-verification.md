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
| 직전 전달 상태와 부족함 | <!-- LEARNER:b87a2b453741:previous --> |
| 실제 변경 file/symbol/command/artifact | <!-- LEARNER:b87a2b453741:changed --> |
| Build/runtime/resource owner와 lifetime | <!-- LEARNER:b87a2b453741:owner --> |
| Failure·missing output·cleanup 처리 | <!-- LEARNER:b87a2b453741:failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- LEARNER:b87a2b453741:guarantee --> |
| 다음 delivery commit 또는 관련 test 연결 | <!-- LEARNER:b87a2b453741:relation --> |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** <!-- LEARNER:b87a2b453741:before_code -->
- **해당 SHA 핵심 코드:** <!-- LEARNER:b87a2b453741:excerpt -->
- **관찰 근거의 성격:** <!-- LEARNER:b87a2b453741:evidence_kind -->
- **실행·테스트 증거:** <!-- LEARNER:b87a2b453741:execution -->
- **다음 commit 연결:** <!-- LEARNER:b87a2b453741:next -->

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
| 직전 전달 상태와 부족함 | <!-- LEARNER:b94fa6dd0118:previous --> |
| 실제 변경 file/symbol/command/artifact | <!-- LEARNER:b94fa6dd0118:changed --> |
| Build/runtime/resource owner와 lifetime | <!-- LEARNER:b94fa6dd0118:owner --> |
| Failure·missing output·cleanup 처리 | <!-- LEARNER:b94fa6dd0118:failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- LEARNER:b94fa6dd0118:guarantee --> |
| 다음 delivery commit 또는 관련 test 연결 | <!-- LEARNER:b94fa6dd0118:relation --> |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** <!-- LEARNER:b94fa6dd0118:before_code -->
- **해당 SHA 핵심 코드:** <!-- LEARNER:b94fa6dd0118:excerpt -->
- **관찰 근거의 성격:** <!-- LEARNER:b94fa6dd0118:evidence_kind -->
- **실행·테스트 증거:** <!-- LEARNER:b94fa6dd0118:execution -->
- **다음 commit 연결:** <!-- LEARNER:b94fa6dd0118:next -->

## 6. Invariant ledger

| Invariant | 이전 상태 | 도입·수정 | 검증·소비 | 남은 비보장 |
| --- | --- | --- | --- | --- |
| Image assembly | <!-- LEARNER:ledger:1:before --> | <!-- LEARNER:ledger:1:change --> | <!-- LEARNER:ledger:1:verify --> | <!-- LEARNER:ledger:1:gap --> |
| Runtime identity | <!-- LEARNER:ledger:2:before --> | <!-- LEARNER:ledger:2:change --> | <!-- LEARNER:ledger:2:verify --> | <!-- LEARNER:ledger:2:gap --> |
| Static/public delivery | <!-- LEARNER:ledger:3:before --> | <!-- LEARNER:ledger:3:change --> | <!-- LEARNER:ledger:3:verify --> | <!-- LEARNER:ledger:3:gap --> |
| Temporary resource lifetime | <!-- LEARNER:ledger:4:before --> | <!-- LEARNER:ledger:4:change --> | <!-- LEARNER:ledger:4:verify --> | <!-- LEARNER:ledger:4:gap --> |
| CI runtime gate | <!-- LEARNER:ledger:5:before --> | <!-- LEARNER:ledger:5:change --> | <!-- LEARNER:ledger:5:verify --> | <!-- LEARNER:ledger:5:gap --> |

## 7. Failure → Fix → Test 연결

| Failure 또는 위험 | Fix/decision | Test·gate evidence | 한계 |
| --- | --- | --- | --- |
| standalone image에 public/static 누락 | <!-- LEARNER:failure:1:fix --> | <!-- LEARNER:failure:1:test --> | <!-- LEARNER:failure:1:limit --> |
| container가 root로 실행 | <!-- LEARNER:failure:2:fix --> | <!-- LEARNER:failure:2:test --> | <!-- LEARNER:failure:2:limit --> |
| server startup 지연/실패 | <!-- LEARNER:failure:3:fix --> | <!-- LEARNER:failure:3:test --> | <!-- LEARNER:failure:3:limit --> |
| temporary image/container 누적 | <!-- LEARNER:failure:4:fix --> | <!-- LEARNER:failure:4:test --> | <!-- LEARNER:failure:4:limit --> |
| local-only image confidence | <!-- LEARNER:failure:5:fix --> | <!-- LEARNER:failure:5:test --> | <!-- LEARNER:failure:5:limit --> |

## 8. Ownership / state / responsibility 변화

| 대상 | 이전 owner/state | 중간 변화 | 최종 owner/state |
| --- | --- | --- | --- |
| Dependency graph | <!-- LEARNER:owner:1:before --> | <!-- LEARNER:owner:1:middle --> | <!-- LEARNER:owner:1:final --> |
| Build artifact | <!-- LEARNER:owner:2:before --> | <!-- LEARNER:owner:2:middle --> | <!-- LEARNER:owner:2:final --> |
| Runtime process/files | <!-- LEARNER:owner:3:before --> | <!-- LEARNER:owner:3:middle --> | <!-- LEARNER:owner:3:final --> |
| Asset inventory | <!-- LEARNER:owner:4:before --> | <!-- LEARNER:owner:4:middle --> | <!-- LEARNER:owner:4:final --> |
| Temporary resources | <!-- LEARNER:owner:5:before --> | <!-- LEARNER:owner:5:middle --> | <!-- LEARNER:owner:5:final --> |

## 9. Thread 최종 상태

<!-- LEARNER:thread:final_state -->

## 10. 최종 product-delivery flow 정리

<!-- LEARNER:thread:flow -->

## 11. 학습 완료 자가 점검

- [ ] standalone, generated static과 public의 서로 다른 copy ownership을 설명했습니다.
- [ ] multi-stage build의 build-time args와 final runtime environment를 구분했습니다.
- [ ] container verifier의 state transition, retry, failure와 cleanup을 복원했습니다.
- [ ] content-derived asset discovery/MIME coverage와 누락 범위를 기록했습니다.
- [ ] template-mode CI image test와 production deployment 보장을 혼동하지 않았습니다.
- [ ] Exact-SHA runtime command를 직접 실행했다면 command, environment와 실제 결과를 기록했습니다. 실행하지 못했다면 이유를 명시했습니다.
