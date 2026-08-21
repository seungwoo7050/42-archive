# Thread: Reproducible toolchain and production-server verification

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

개발 환경의 암묵적 버전 차이를 제거하고, 최적화된 production server를 실제 browser test 대상으로 만든 뒤 같은 검증을 CI의 기본 전달 gate로 승격하는 과정을 복원합니다.

### 계획된 핵심 invariant

- 지원 Node.js와 npm 버전은 repository metadata와 CI가 같은 값으로 해석합니다.
- 브라우저 검증은 development server가 아니라 production build를 시작한 server를 대상으로 수행할 수 있습니다.
- CI는 fresh install부터 정적 검사, content validation, production browser verification까지 하나의 재현 가능한 경로로 수행합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 버전 파일과 `package.json` 선언은 어떤 소비자에게 읽히며, 잘못된 local runtime을 실제로 차단하는가?
- `test:e2e:production`은 build, server 시작, readiness와 browser matrix를 어떤 순서로 소유하는가?
- CI가 local production E2E 경로를 재사용하는 지점과 아직 포함하지 않는 release 검증은 무엇인가?
- 각 단계의 timeout, cancellation, server reuse와 권한 경계는 failure를 어떻게 제한하는가?

## 3. 완료 기준

- 각 SHA의 parent diff와 resulting tree에서 실제 변경 file, function, config, script와 workflow step을 확인했습니다.
- Source, generated artifact, CI gate, container/runtime owner를 구분했습니다.
- Missing artifact, portability failure, threshold violation, startup failure와 cleanup branch를 기록했습니다.
- Test/CI command의 technique, production path, proves/does-not-prove와 실제 실행 여부를 구분했습니다.
- 최종 product-delivery 흐름과 cross-thread handoff를 코드 없이 설명할 수 있습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | 확장 thread에서 확인할 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `f66b880a8f97` | chore(runtime): 지원 Node.js와 npm 버전 고정 | B | DEPLOY | 초기 전달 경계 — runtime/package-manager 버전을 repository contract로 고정합니다. |
| 2 | `f81691072413` | test(e2e): production server 검증 경로 추가 | A | VALIDATION, DEPLOY, TEST | 회귀·artifact 검증 — production build와 별도 server port를 사용하는 browser verification 경로를 만듭니다. |
| 3 | `9fd3541c11dc` | ci: 기본 배포 품질 검사 추가 | A | DEPLOY, TEST | 통합 gate — 고정 toolchain과 production E2E를 GitHub Actions의 기본 delivery gate로 연결합니다. |

## 5. Commit별 학습 기록

각 section은 반드시 해당 SHA의 tree와 parent diff를 기준으로 작성합니다. 다른 Thread의 later commit은 관계 설명에만 사용하고 과거 구현에 소급하지 않습니다.

### 1. `f66b880a8f97` — chore(runtime): 지원 Node.js와 npm 버전 고정

- **Full SHA:** `f66b880a8f975443974896891a71e1dfd70fbe32`
- **Importance:** B
- **Tags:** DEPLOY
- **확장 thread에서의 역할:** 초기 전달 경계 — runtime/package-manager 버전을 repository contract로 고정합니다.

#### 해당 SHA에서 확인할 실제 코드

- `f66b880a8f97^`와 비교해 `.node-version`, `.nvmrc`, `package.json`, `package-lock.json`에 추가된 정확한 Node/npm 값을 대조합니다.
- `packageManager`와 `engines`가 npm/version manager/CI에서 각각 어떤 방식으로 소비되는지 구분합니다.
- 이 SHA 자체에는 잘못된 runtime을 강제 종료하는 script나 CI가 있는지 확인하고, 선언과 enforcement를 혼동하지 않습니다.
- 후속 `9fd3541c11dc`가 `.nvmrc`와 npm pin을 실제 workflow 입력으로 소비하는 연결을 기록합니다.

확인 원칙:

- 먼저 `f66b880a8f97^`와 `f66b880a8f97`를 비교하고, 필요한 file은 `f66b880a8f97:<path>`의 resulting tree에서 읽습니다.
- Final HEAD의 workflow, script, Dockerfile 또는 generated output을 이 commit에 소급하지 않습니다.
- Commit subject나 body만으로 behavior를 추정하지 않고 실제 changed code/test/config를 기준으로 판단합니다.
- 실제 실행하지 않은 command 결과는 code inspection과 분리합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 전달 상태와 부족함 | <!-- LEARNER:f66b880a8f97:previous --> |
| 실제 변경 file/symbol/command/artifact | <!-- LEARNER:f66b880a8f97:changed --> |
| Build/runtime/resource owner와 lifetime | <!-- LEARNER:f66b880a8f97:owner --> |
| Failure·missing output·cleanup 처리 | <!-- LEARNER:f66b880a8f97:failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- LEARNER:f66b880a8f97:guarantee --> |
| 다음 delivery commit 또는 관련 test 연결 | <!-- LEARNER:f66b880a8f97:relation --> |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** <!-- LEARNER:f66b880a8f97:before_code -->
- **해당 SHA 핵심 코드:** <!-- LEARNER:f66b880a8f97:excerpt -->
- **관찰 근거의 성격:** <!-- LEARNER:f66b880a8f97:evidence_kind -->
- **실행·테스트 증거:** <!-- LEARNER:f66b880a8f97:execution -->
- **다음 commit 연결:** <!-- LEARNER:f66b880a8f97:next -->

### 2. `f81691072413` — test(e2e): production server 검증 경로 추가

- **Full SHA:** `f81691072413c11707251491fdb5af0c67e716ec`
- **Importance:** A
- **Tags:** VALIDATION, DEPLOY, TEST
- **확장 thread에서의 역할:** 회귀·artifact 검증 — production build와 별도 server port를 사용하는 browser verification 경로를 만듭니다.

#### 해당 SHA에서 확인할 실제 코드

- `package.json`의 `start:e2e`와 `test:e2e:production`을 추적해 build가 server 시작보다 먼저 실패할 수 있는 경계를 확인합니다.
- `playwright.production.config.ts`의 `webServer.command`, `url`, `reuseExistingServer`, `timeout`, `workers`와 두 device project를 기록합니다.
- 기존 `tests/e2e`를 재사용한다는 사실과 production 전용 fixture를 새로 만드는 것이 아니라는 점을 구분합니다.
- 이 경로가 `next start`를 검증하지만 `.next/standalone/server.js`나 container image를 실행하지 않는다는 non-guarantee를 명시합니다.

확인 원칙:

- 먼저 `f81691072413^`와 `f81691072413`를 비교하고, 필요한 file은 `f81691072413:<path>`의 resulting tree에서 읽습니다.
- Final HEAD의 workflow, script, Dockerfile 또는 generated output을 이 commit에 소급하지 않습니다.
- Commit subject나 body만으로 behavior를 추정하지 않고 실제 changed code/test/config를 기준으로 판단합니다.
- 실제 실행하지 않은 command 결과는 code inspection과 분리합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 전달 상태와 부족함 | <!-- LEARNER:f81691072413:previous --> |
| 실제 변경 file/symbol/command/artifact | <!-- LEARNER:f81691072413:changed --> |
| Build/runtime/resource owner와 lifetime | <!-- LEARNER:f81691072413:owner --> |
| Failure·missing output·cleanup 처리 | <!-- LEARNER:f81691072413:failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- LEARNER:f81691072413:guarantee --> |
| 다음 delivery commit 또는 관련 test 연결 | <!-- LEARNER:f81691072413:relation --> |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** <!-- LEARNER:f81691072413:before_code -->
- **해당 SHA 핵심 코드:** <!-- LEARNER:f81691072413:excerpt -->
- **관찰 근거의 성격:** <!-- LEARNER:f81691072413:evidence_kind -->
- **실행·테스트 증거:** <!-- LEARNER:f81691072413:execution -->
- **다음 commit 연결:** <!-- LEARNER:f81691072413:next -->

### 3. `9fd3541c11dc` — ci: 기본 배포 품질 검사 추가

- **Full SHA:** `9fd3541c11dc8fa86561c3cd0b7116449b8f0f03`
- **Importance:** A
- **Tags:** DEPLOY, TEST
- **확장 thread에서의 역할:** 통합 gate — 고정 toolchain과 production E2E를 GitHub Actions의 기본 delivery gate로 연결합니다.

#### 해당 SHA에서 확인할 실제 코드

- `.github/workflows/ci.yml`의 trigger, permissions, concurrency, timeout과 step 순서를 parent diff에서 확인합니다.
- `actions/setup-node`가 `.nvmrc`를 읽고, 별도 global install이 npm 11.16.0을 고정하는 이중 소비 관계를 추적합니다.
- `npm ci` 이후 lint → typecheck → content check → Chromium install → production E2E 순서와 fail-fast 성질을 기록합니다.
- 이 SHA의 workflow가 unit test, standalone verify, bundle/Lighthouse, Docker를 아직 실행하지 않는다는 범위를 명시합니다.

확인 원칙:

- 먼저 `9fd3541c11dc^`와 `9fd3541c11dc`를 비교하고, 필요한 file은 `9fd3541c11dc:<path>`의 resulting tree에서 읽습니다.
- Final HEAD의 workflow, script, Dockerfile 또는 generated output을 이 commit에 소급하지 않습니다.
- Commit subject나 body만으로 behavior를 추정하지 않고 실제 changed code/test/config를 기준으로 판단합니다.
- 실제 실행하지 않은 command 결과는 code inspection과 분리합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 전달 상태와 부족함 | <!-- LEARNER:9fd3541c11dc:previous --> |
| 실제 변경 file/symbol/command/artifact | <!-- LEARNER:9fd3541c11dc:changed --> |
| Build/runtime/resource owner와 lifetime | <!-- LEARNER:9fd3541c11dc:owner --> |
| Failure·missing output·cleanup 처리 | <!-- LEARNER:9fd3541c11dc:failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- LEARNER:9fd3541c11dc:guarantee --> |
| 다음 delivery commit 또는 관련 test 연결 | <!-- LEARNER:9fd3541c11dc:relation --> |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** <!-- LEARNER:9fd3541c11dc:before_code -->
- **해당 SHA 핵심 코드:** <!-- LEARNER:9fd3541c11dc:excerpt -->
- **관찰 근거의 성격:** <!-- LEARNER:9fd3541c11dc:evidence_kind -->
- **실행·테스트 증거:** <!-- LEARNER:9fd3541c11dc:execution -->
- **다음 commit 연결:** <!-- LEARNER:9fd3541c11dc:next -->

## 6. Invariant ledger

| Invariant | 이전 상태 | 도입·수정 | 검증·소비 | 남은 비보장 |
| --- | --- | --- | --- | --- |
| Runtime version discovery | <!-- LEARNER:ledger:1:before --> | <!-- LEARNER:ledger:1:change --> | <!-- LEARNER:ledger:1:verify --> | <!-- LEARNER:ledger:1:gap --> |
| Browser target | <!-- LEARNER:ledger:2:before --> | <!-- LEARNER:ledger:2:change --> | <!-- LEARNER:ledger:2:verify --> | <!-- LEARNER:ledger:2:gap --> |
| Delivery gate ownership | <!-- LEARNER:ledger:3:before --> | <!-- LEARNER:ledger:3:change --> | <!-- LEARNER:ledger:3:verify --> | <!-- LEARNER:ledger:3:gap --> |

## 7. Failure → Fix → Test 연결

| Failure 또는 위험 | Fix/decision | Test·gate evidence | 한계 |
| --- | --- | --- | --- |
| 서로 다른 Node/npm이 lockfile을 해석 | <!-- LEARNER:failure:1:fix --> | <!-- LEARNER:failure:1:test --> | <!-- LEARNER:failure:1:limit --> |
| dev server 통과를 production 성공으로 오인 | <!-- LEARNER:failure:2:fix --> | <!-- LEARNER:failure:2:test --> | <!-- LEARNER:failure:2:limit --> |
| 검증이 local 선택사항 | <!-- LEARNER:failure:3:fix --> | <!-- LEARNER:failure:3:test --> | <!-- LEARNER:failure:3:limit --> |

## 8. Ownership / state / responsibility 변화

| 대상 | 이전 owner/state | 중간 변화 | 최종 owner/state |
| --- | --- | --- | --- |
| Toolchain 선택 | <!-- LEARNER:owner:1:before --> | <!-- LEARNER:owner:1:middle --> | <!-- LEARNER:owner:1:final --> |
| Production process | <!-- LEARNER:owner:2:before --> | <!-- LEARNER:owner:2:middle --> | <!-- LEARNER:owner:2:final --> |
| Integration 판정 | <!-- LEARNER:owner:3:before --> | <!-- LEARNER:owner:3:middle --> | <!-- LEARNER:owner:3:final --> |

## 9. Thread 최종 상태

<!-- LEARNER:thread:final_state -->

## 10. 최종 product-delivery flow 정리

<!-- LEARNER:thread:flow -->

## 11. 학습 완료 자가 점검

- [ ] 네 runtime metadata 위치와 같은 값이 반복되는 이유를 설명했습니다.
- [ ] production E2E의 build/server/readiness/test lifecycle owner를 구분했습니다.
- [ ] CI의 step 순서, 권한, timeout과 cancellation을 확인했습니다.
- [ ] 이 Thread가 standalone, performance, container, hosting을 보장하지 않는다고 기록했습니다.
- [ ] Exact-SHA runtime command를 직접 실행했다면 command, environment와 실제 결과를 기록했습니다. 실행하지 못했다면 이유를 명시했습니다.
