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
| 직전 전달 상태와 부족함 | `package.json`과 lockfile은 있었지만 repository가 지원 Node.js/npm의 단일 값을 선언하지 않았습니다. 따라서 개발자 shell과 자동화가 서로 다른 runtime/package-manager로 같은 lockfile을 해석할 여지가 있었습니다. |
| 실제 변경 file/symbol/command/artifact | `.node-version`과 `.nvmrc`에 `24.18.0`을 추가하고, `package.json`의 `packageManager`를 `npm@11.16.0`, `engines.node`를 `24.18.0`, `engines.npm`을 `11.16.0`으로 고정했습니다. `package-lock.json`의 root package metadata에도 같은 engines가 기록됩니다. |
| Build/runtime/resource owner와 lifetime | 버전 값의 owner는 repository metadata입니다. `.node-version`/`.nvmrc`는 version manager와 CI setup step이 읽고, `packageManager`/`engines`는 package tooling이 읽습니다. 이 commit은 process나 resource lifetime을 새로 만들지 않습니다. |
| Failure·missing output·cleanup 처리 | 이 SHA에는 version mismatch를 직접 검사해 실패시키는 command가 없습니다. npm의 engine 처리는 환경 설정에 따라 warning에 그칠 수 있고, 현재 shell이 실제로 선언값을 사용했는지도 보장하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | 네 곳의 runtime 선언과 lockfile root metadata가 같은 값으로 수렴합니다. 그러나 dependency 설치의 네트워크 가용성, OS 차이, 또는 잘못된 runtime의 강제 차단까지 보장하지 않습니다. |
| 다음 delivery commit 또는 관련 test 연결 | `f81691072413`이 production build/test command를 만들고, `9fd3541c11dc`가 `.nvmrc`로 Node를 설정한 뒤 npm 11.16.0을 설치해 이 선언을 실행 경로로 승격합니다. |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** Parent에는 `.node-version`과 `.nvmrc`가 없고 `package.json`에도 `packageManager`/`engines`가 없습니다.
- **해당 SHA 핵심 코드:** `f66b880a8f975443974896891a71e1dfd70fbe32` · `package.json 및 version files`

```text
.node-version / .nvmrc
24.18.0

package.json
"packageManager": "npm@11.16.0",
"engines": {
  "node": "24.18.0",
  "npm": "11.16.0"
}
```

- **관찰 근거의 성격:** Exact-SHA diff에서 직접 확인한 repository metadata입니다.
- **실행·테스트 증거:** 실행하지 않음. 현재 작업 환경에서는 `web/portfolio`의 Git checkout, npm dependency tree, Chromium 및 Docker daemon을 사용할 수 없었습니다. GitHub connector로 해당 SHA의 commit diff와 resulting source를 검사했으며, command 성공 결과는 주장하지 않습니다.
- **다음 commit 연결:** `f81691072413`이 production build/test command를 만들고, `9fd3541c11dc`가 `.nvmrc`로 Node를 설정한 뒤 npm 11.16.0을 설치해 이 선언을 실행 경로로 승격합니다.

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
| 직전 전달 상태와 부족함 | 기존 Playwright 경로는 있었지만 production build를 먼저 만들고 최적화된 `next start` process를 별도 port에서 검증하는 command/config가 없었습니다. 따라서 development compiler에서 통과한 route matrix가 production serving에서도 동작하는지는 별도 계약이 아니었습니다. |
| 실제 변경 file/symbol/command/artifact | `start:e2e`를 `next start -p 3200`으로 추가하고, `test:e2e:production`을 `npm run build && playwright test --config=playwright.production.config.ts`로 연결했습니다. 새 config는 `http://localhost:3200`, `reuseExistingServer: false`, server timeout 120초, worker 1, Desktop Chrome와 Pixel 7을 사용합니다. |
| Build/runtime/resource owner와 lifetime | package script가 build 선행 조건을 소유하고, Playwright `webServer`가 server process의 시작·readiness 대기·test 종료 시 정리를 소유합니다. E2E specification은 기존 `tests/e2e`가 그대로 소유합니다. |
| Failure·missing output·cleanup 처리 | `npm run build`가 실패하면 browser phase로 진행하지 않습니다. server가 120초 안에 URL을 제공하지 못하면 Playwright가 실패하며, 기존 server 재사용을 금지해 다른 process의 성공을 오인하지 않습니다. test assertion 실패도 command exit를 실패로 만듭니다. |
| 보장하는 것과 보장하지 않는 것 | 동일한 desktop/mobile E2E matrix가 optimized production server를 대상으로 실행될 수 있습니다. standalone artifact 구조, container, 성능 budget, 운영 환경 네트워크나 production content mode는 아직 검증하지 않습니다. |
| 다음 delivery commit 또는 관련 test 연결 | `9fd3541c11dc`가 이 exact command를 CI의 마지막 검증 step으로 호출합니다. 뒤의 standalone/container Thread는 같은 build output을 더 좁은 artifact/runtime 경계에서 검증합니다. |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** Parent의 `package.json`에는 `test:e2e`만 있고 production-specific build/start command와 `playwright.production.config.ts`가 없습니다.
- **해당 SHA 핵심 코드:** `f81691072413c11707251491fdb5af0c67e716ec` · `package.json, playwright.production.config.ts`

```text
"start:e2e": "next start -p 3200",
"test:e2e:production":
  "npm run build && playwright test --config=playwright.production.config.ts"

webServer: {
  command: "npm run start:e2e",
  url: "http://localhost:3200",
  reuseExistingServer: false,
  timeout: 120_000,
}
```

- **관찰 근거의 성격:** Exact-SHA package/config diff에서 직접 확인한 production E2E contract입니다.
- **실행·테스트 증거:** 실행하지 않음. 현재 작업 환경에서는 `web/portfolio`의 Git checkout, npm dependency tree, Chromium 및 Docker daemon을 사용할 수 없었습니다. GitHub connector로 해당 SHA의 commit diff와 resulting source를 검사했으며, command 성공 결과는 주장하지 않습니다.
- **다음 commit 연결:** `9fd3541c11dc`가 이 exact command를 CI의 마지막 검증 step으로 호출합니다. 뒤의 standalone/container Thread는 같은 build output을 더 좁은 artifact/runtime 경계에서 검증합니다.

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
| 직전 전달 상태와 부족함 | production E2E command는 local opt-in 경로였고 push/pull request에서 동일한 toolchain과 command를 강제하는 workflow가 없었습니다. 검증을 수행했다는 사실이 integration 조건이 아니었습니다. |
| 실제 변경 file/symbol/command/artifact | read-only `CI` workflow를 추가했습니다. push와 pull request에서 `.nvmrc` 기반 Node setup, npm 11.16.0 global pin, version 출력, `npm ci`, lint, typecheck, content validation, Chromium 설치, `npm run test:e2e:production`을 순서대로 실행합니다. job은 30분 timeout과 ref별 concurrency cancellation을 갖습니다. |
| Build/runtime/resource owner와 lifetime | GitHub Actions `verify` job이 fresh runner와 step ordering을 소유합니다. repository는 command만 제공하고, Actions runner가 checkout·tool cache·process lifecycle을 관리합니다. `permissions: contents: read`로 workflow authority를 제한합니다. |
| Failure·missing output·cleanup 처리 | 각 shell step의 non-zero exit가 후속 step을 막습니다. 30분을 넘으면 job이 중단되고, 같은 ref의 이전 run은 새 run으로 취소됩니다. Chromium 설치나 dependency registry 접근 실패도 delivery gate 실패로 표면화됩니다. |
| 보장하는 것과 보장하지 않는 것 | push/PR마다 pinned toolchain에서 fresh install과 production browser path가 자동 요구됩니다. 이 시점에는 `npm test`, standalone file completeness, performance gate, Docker runtime 또는 외부 hosting 배포가 포함되지 않습니다. |
| 다음 delivery commit 또는 관련 test 연결 | Thread 3의 `c5e73853a1b6`, Thread 4의 `abbd530368a0`, Thread 5의 `b94fa6dd0118`이 같은 workflow에 artifact, performance, container gate를 단계적으로 추가합니다. |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** Parent에는 `.github/workflows/ci.yml`이 없습니다.
- **해당 SHA 핵심 코드:** `9fd3541c11dc8fa86561c3cd0b7116449b8f0f03` · `.github/workflows/ci.yml`

```text
- uses: actions/setup-node@v4
  with:
    node-version-file: .nvmrc
    cache: npm
- run: npm install --global npm@11.16.0
- run: npm ci
- run: npm run lint
- run: npm run typecheck
- run: npm run content:check
- run: npx playwright install --with-deps chromium
- run: npm run test:e2e:production
```

- **관찰 근거의 성격:** Exact-SHA workflow diff에서 직접 확인한 CI step graph입니다.
- **실행·테스트 증거:** 실행하지 않음. 현재 작업 환경에서는 `web/portfolio`의 Git checkout, npm dependency tree, Chromium 및 Docker daemon을 사용할 수 없었습니다. GitHub connector로 해당 SHA의 commit diff와 resulting source를 검사했으며, command 성공 결과는 주장하지 않습니다.
- **다음 commit 연결:** Thread 3의 `c5e73853a1b6`, Thread 4의 `abbd530368a0`, Thread 5의 `b94fa6dd0118`이 같은 workflow에 artifact, performance, container gate를 단계적으로 추가합니다.

## 6. Invariant ledger

| Invariant | 이전 상태 | 도입·수정 | 검증·소비 | 남은 비보장 |
| --- | --- | --- | --- | --- |
| Runtime version discovery | 환경별 암묵값 | `f66b880a8f97`에서 Node 24.18.0/npm 11.16.0을 여러 metadata 경계에 선언 | `9fd3541c11dc`가 `.nvmrc`와 npm pin을 실제 CI 입력으로 사용 | local shell의 강제 일치 여부 |
| Browser target | development path만 존재 | `f81691072413`에서 build 후 `next start`를 별도 port로 실행 | `9fd3541c11dc`가 production E2E command를 push/PR gate로 실행 | standalone/container runtime |
| Delivery gate ownership | local 수행 여부에 의존 | `9fd3541c11dc`에서 read-only, bounded CI job이 순서를 소유 | 후속 artifact/performance/container gate로 확장 | 외부 배포와 운영 |

## 7. Failure → Fix → Test 연결

| Failure 또는 위험 | Fix/decision | Test·gate evidence | 한계 |
| --- | --- | --- | --- |
| 서로 다른 Node/npm이 lockfile을 해석 | `f66b880a8f97`의 네 metadata 경계 | `9fd3541c11dc`의 version setup·출력·fresh install | 잘못된 local shell은 강제 차단하지 않음 |
| dev server 통과를 production 성공으로 오인 | `f81691072413`의 build-first production Playwright config | `9fd3541c11dc`가 exact command를 CI에서 실행 | standalone/container는 별도 Thread |
| 검증이 local 선택사항 | `9fd3541c11dc`의 push/PR workflow | step non-zero/timeout/cancellation이 integration을 차단 | unit test와 후속 release gate는 아직 없음 |

## 8. Ownership / state / responsibility 변화

| 대상 | 이전 owner/state | 중간 변화 | 최종 owner/state |
| --- | --- | --- | --- |
| Toolchain 선택 | 개발자/runner의 설치 상태 | repository version metadata | GitHub Actions setup + npm pin |
| Production process | production-specific owner 없음 | Playwright `webServer`가 `next start` lifecycle 소유 | CI가 같은 command를 호출 |
| Integration 판정 | 수동 local 결과 | local production E2E command | bounded `verify` job의 exit status |

## 9. Thread 최종 상태

브랜치는 지원 Node/npm을 명시하고, production build를 만든 뒤 별도 `next start` process에서 기존 desktop/mobile route matrix를 실행할 수 있습니다. CI는 fresh checkout에서 같은 버전과 command를 사용해 push/PR을 판정합니다. 다만 이 Thread의 마지막 SHA만으로는 standalone 파일 배치, 성능 budget, container image, production hosting을 검증하지 않습니다.

## 10. 최종 product-delivery flow 정리

version metadata → Actions가 Node/npm 선택 → `npm ci` → lint/type/content checks → `npm run build` → Playwright가 port 3200의 `next start`를 시작하고 기다림 → 기존 E2E matrix 실행 → command/job exit status가 integration 결과가 됩니다.

## 11. 학습 완료 자가 점검

- [x] 네 runtime metadata 위치와 같은 값이 반복되는 이유를 설명했습니다.
- [x] production E2E의 build/server/readiness/test lifecycle owner를 구분했습니다.
- [x] CI의 step 순서, 권한, timeout과 cancellation을 확인했습니다.
- [x] 이 Thread가 standalone, performance, container, hosting을 보장하지 않는다고 기록했습니다.
- [ ] Exact-SHA runtime command를 직접 실행해 결과를 기록했습니다. — 실행하지 않음. 현재 작업 환경에서는 `web/portfolio`의 Git checkout, npm dependency tree, Chromium 및 Docker daemon을 사용할 수 없었습니다. GitHub connector로 해당 SHA의 commit diff와 resulting source를 검사했으며, command 성공 결과는 주장하지 않습니다.
