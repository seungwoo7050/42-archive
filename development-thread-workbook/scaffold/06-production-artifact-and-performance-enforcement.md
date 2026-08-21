# Thread: Production artifact and performance enforcement

> Project: 42 Archive Portfolio (`web/portfolio`)
>
> 이 문서는 source에서 확정된 thread 구조와 commit 역할만 미리 제공합니다. 실제 구현 해석, code evidence, failure 재현, test 결과, 최종 설명은 해당 SHA의 코드를 직접 확인해 작성합니다.

## 1. Thread 목표

Source-level green 상태를 넘어 실제 Next.js production output, route별 client asset, Lighthouse 결과, standalone package, non-root container와 public asset serving을 fail-closed release contract로 만드는 과정을 복원합니다.

**Source-defined significance**

> The release story moves from source validation to verification of the actual emitted artifact. Standalone checks, route-size accounting, Lighthouse thresholds, CI enforcement, and container HTTP tests close different gaps; none can be substituted by a development-server smoke test.

### 이 Thread에 직접 연결되는 Critical Invariants

- CI는 pinned toolchain과 reproducible install로 production path를 검사합니다. — `9fd3541c11dc`
- Standalone server entry와 static directory는 explicit artifact입니다. — `29508f4668ea → c0f7434467a0`
- Route budget은 emitted JS와 non-inlined CSS의 actual byte를 기준으로 합니다. — `605b64512edf`
- Baseline route coverage와 5% growth limit은 fail-closed입니다. — `518ff5b51ec5`
- Lighthouse는 production server와 five-design representative routes를 반복 측정합니다. — `1529ccf225c1`
- Release CI는 standalone, route budget, Lighthouse gate를 실제 build에 적용합니다. — `abbd530368a0`
- Final image는 public assets를 포함하고 non-root로 실행되며 real HTTP로 검증됩니다. — `b87a2b453741 → b94fa6dd0118`

### 연결되는 Major Engineering Difficulty

- Compiler-specific manifest, standalone packaging, route bundle cost, Lighthouse threshold, Docker asset serving을 actual production output에서 검증하는 문제

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 초기 CI gate와 later artifact/performance gate는 각각 어떤 검증 공백을 닫는가?
- Standalone output의 필수 file을 source config가 아니라 build artifact에서 어떻게 확인하는가?
- Route별 JS/CSS 측정은 어떤 manifest를 읽고 shared chunk, duplicate asset, inlined CSS를 어떻게 처리하는가?
- Committed baseline과 5% policy가 normal check에서 자동 갱신되지 않는 구조는 무엇인가?
- Lighthouse와 Docker HTTP test가 development-server smoke test로 대체될 수 없는 이유는 무엇인가?

## 3. 완료 기준

- Pinned install부터 CI build, standalone check, bundle check, Lighthouse, Docker test까지 command/artifact 흐름을 기록했습니다.
- Route asset collector의 manifest, route key, deduplication, byte-count 규칙을 실제 code로 추적했습니다.
- Budget evaluator의 missing/new route, JS/CSS overage branch를 확인했습니다.
- Lighthouse route/design coverage, run count, median, threshold, production server 시작 방식을 기록했습니다.
- Container copy boundary, runtime user, readiness, HTTP/MIME, cleanup path를 확인했습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Source에서 확정된 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `9fd3541c11dc` | ci: 기본 배포 품질 검사 추가 | A | DEPLOY, TEST | Establishes reproducible production checks in automation. |
| 2 | `29508f4668ea` | build: standalone server 산출물 생성 | B | DEPLOY | Defines the traced server artifact boundary. |
| 3 | `c0f7434467a0` | test(build): standalone 산출물 완전성 검증 | A | VALIDATION, DEPLOY, TEST | Makes required server and static outputs explicit. |
| 4 | `605b64512edf` | build(perf): route별 client asset 측정 추가 | A | ARCH, ROUTING, PERF | Measures emitted JS and non-inlined CSS per route. |
| 5 | `518ff5b51ec5` | build(perf): route bundle 성장 예산 평가 추가 | A | ARCH, ROUTING, PERF | Turns measurements into fail-closed growth limits. |
| 6 | `1529ccf225c1` | build(perf): desktop Lighthouse 실행 경계 추가 | A | PERF, DEPLOY | Defines repeatable route/design laboratory thresholds. |
| 7 | `abbd530368a0` | ci: 검증된 bundle과 Lighthouse gate 활성화 | A | VALIDATION, PERF, DEPLOY | Promotes artifact, size, and audit limits into the release path. |
| 8 | `b87a2b453741` | build(docker): public 자산을 포함한 비루트 standalone image 추가 | A | DEPLOY | Packages the verified artifact with explicit public assets and non-root runtime. |
| 9 | `b94fa6dd0118` | test(docker): runtime route와 public 자산 검증 자동화 | A | ARCH, VALIDATION, ROUTING | Exercises the final container and derives asset coverage from authoritative content. |

## 5. Commit별 학습 기록

각 section은 반드시 해당 SHA를 checkout한 상태에서 작성합니다. Thread 내 이전 commit은 비교 대상으로 사용할 수 있지만 final HEAD를 정답처럼 소급하지 않습니다.

### 1. `9fd3541c11dc` — ci: 기본 배포 품질 검사 추가

- **Importance:** A
- **Tags:** DEPLOY, TEST
- **Source-defined thread role:** Establishes reproducible production checks in automation.
- **Source classification summary:** Establish a deployment-quality CI gate using the repository's pinned toolchain.
- **Source classification reason:** Significant because it verifies the production artifact or release path itself, closing a gap that source-level and development-server tests cannot cover.

#### Source에서 확정된 구현 의도와 상태 변화

Pinned toolchain을 사용하는 deployment-quality CI를 만들고 `npm ci`, lint, type check, content validation, production build, Chromium E2E를 required path로 구성합니다.

#### 해당 SHA에서 확인할 실제 코드

- Workflow trigger, concurrency/cancellation, read-only permission, timeout을 확인합니다.
- Node/npm setup이 repository pin과 일치하는지 확인합니다.
- `npm ci` 이후 lint/type/content/build/E2E command 순서와 failure propagation을 추적합니다.
- Playwright browser setup이 어느 단계에서 수행되는지 확인합니다.
- 아직 standalone/budget/Lighthouse/Docker가 없는 초기 gate 범위를 기록합니다.

확인 원칙:

- 먼저 `9fd3541c11dc^`와 `9fd3541c11dc`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Reproducible CI environment |  |
| Required checks와 실행 순서 |  |
| Workflow 권한/자원 경계 |  |
| 초기 gate가 검증하지 않는 final artifact 속성 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

### 2. `29508f4668ea` — build: standalone server 산출물 생성

- **Importance:** B
- **Tags:** DEPLOY
- **Source-defined thread role:** Defines the traced server artifact boundary.
- **Source classification summary:** Configure Next.js to emit a standalone server bundle.
- **Source classification reason:** Supporting build or maintenance work inside the established release process; useful, but not a defining architectural or correctness decision.

#### Source에서 확정된 구현 의도와 상태 변화

Next.js가 traced runtime file을 포함한 standalone server bundle을 생성하도록 output mode를 설정합니다. 이후 container와 artifact check가 사용할 deployment boundary입니다.

#### 해당 SHA에서 확인할 실제 코드

- Next configuration에서 standalone output을 선택하는 setting을 확인합니다.
- Production build 후 standalone tree와 server entry를 filesystem에서 확인합니다.
- Development dependency tree 없이 runtime traced file이 포함되는지 구조를 기록합니다.
- Public/static asset이 standalone bundle에 자동 포함되는지 이 SHA output으로 확인합니다.
- Artifact를 생성하지만 existence/completeness를 아직 fail-closed로 검사하지 않는 점을 기록합니다.

확인 원칙:

- 먼저 `29508f4668ea^`와 `29508f4668ea`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Standalone artifact directory/file boundary |  |
| Traced runtime과 development tree 차이 |  |
| Static/public asset packaging 상태 |  |
| 후속 verifier가 필요한 implicit assumption |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

### 3. `c0f7434467a0` — test(build): standalone 산출물 완전성 검증

- **Importance:** A
- **Tags:** VALIDATION, DEPLOY, TEST
- **Source-defined thread role:** Makes required server and static outputs explicit.
- **Source classification summary:** Add an explicit post-build check for the standalone server entry point and static asset directory.
- **Source classification reason:** Significant because it verifies the production artifact or release path itself, closing a gap that source-level and development-server tests cannot cover.

#### Source에서 확정된 구현 의도와 상태 변화

Production build 뒤 standalone server entry와 static asset directory가 실제로 존재하는지 검사하고 누락 시 실패하는 post-build contract를 추가합니다.

#### 해당 SHA에서 확인할 실제 코드

- Verifier가 기대하는 exact output paths를 확인합니다.
- File/directory existence/type 검사와 error/exit branch를 추적합니다.
- Package command가 build 후 verifier를 실행하는 순서를 확인합니다.
- Standalone config만 있을 때와 verifier 이후의 explicit contract를 비교합니다.
- Temporary output 누락으로 failure를 재현합니다.

확인 원칙:

- 먼저 `c0f7434467a0^`와 `c0f7434467a0`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 대상 production invariant |  |
| Failure injection과 diagnostic |  |
| Post-build filesystem assertion technique |  |
| 증명하는 artifact와 아직 확인하지 않는 runtime serving/public asset |  |
| CI 연결 전 command usage |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

### 4. `605b64512edf` — build(perf): route별 client asset 측정 추가

- **Importance:** A
- **Tags:** ARCH, ROUTING, PERF
- **Source-defined thread role:** Measures emitted JS and non-inlined CSS per route.
- **Source classification summary:** Add production-build measurement that reports the client JavaScript and non-inlined CSS attributable to each application route.
- **Source classification reason:** Significant because it removes a systematic loading cost or converts production performance into measured, reviewable, and enforceable output constraints.

#### Source에서 확정된 구현 의도와 상태 변화

Production build manifest를 읽어 각 public route의 client JavaScript와 non-inlined CSS actual uncompressed byte를 측정합니다. Shared chunk와 duplicate asset은 route 안에서 한 번만 계산합니다.

#### 해당 SHA에서 확인할 실제 코드

- `app-paths-manifest.json`에서 public route를 파생하고 framework internal entry를 제외하는 predicate를 확인합니다.
- Page output에서 client-reference manifest를 찾는 path/key mapping을 추적합니다.
- Route-specific JS와 root shared chunks를 합치는 순서를 확인합니다.
- Asset deduplication key와 actual filesystem byte read를 확인합니다.
- CSS inlining flag가 separate transfer count에서 제외되는 branch를 확인합니다.
- Dynamic route key와 generated manifest syntax를 처리하는 parser dependency를 기록합니다.
- 한 route result를 실제 file size 합으로 수동 검산합니다.

확인 원칙:

- 먼저 `605b64512edf^`와 `605b64512edf`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Authoritative measurement input과 source size 차이 |  |
| Public route discovery 규칙 |  |
| Shared/deduplicated asset accounting |  |
| Inlined/non-inlined CSS 구분 |  |
| Malformed/missing manifest failure path |  |
| 아직 policy failure를 만들지 않는 범위 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

### 5. `518ff5b51ec5` — build(perf): route bundle 성장 예산 평가 추가

- **Importance:** A
- **Tags:** ARCH, ROUTING, PERF
- **Source-defined thread role:** Turns measurements into fail-closed growth limits.
- **Source classification summary:** Define route bundle growth as a comparison against committed per-route JavaScript and CSS baselines, with a fixed five-percent allowance.
- **Source classification reason:** Significant because it removes a systematic loading cost or converts production performance into measured, reviewable, and enforceable output constraints.

#### Source에서 확정된 구현 의도와 상태 변화

Committed per-route baseline과 fixed 5% allowance를 비교해 missing route, new route, JavaScript/CSS growth를 structured violation으로 보고하는 fail-closed evaluator를 정의합니다.

#### 해당 SHA에서 확인할 실제 코드

- Baseline schema, route key, JS/CSS byte field, policy literal을 확인합니다.
- Allowed limit의 rounding과 정확히 5% 경계를 확인합니다.
- Expected route missing, emitted new route, JS overage, CSS overage branch를 각각 추적합니다.
- Violation record가 baseline/allowed/actual/asset class를 보존하는지 확인합니다.
- Baseline generation과 routine check가 별도 command가 되는 구조를 확인합니다.
- Evaluator가 current result로 baseline을 자동 rewrite하지 않는지 확인합니다.

확인 원칙:

- 먼저 `518ff5b51ec5^`와 `518ff5b51ec5`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 5% policy 계산식과 rounding |  |
| Route coverage와 size growth failure 구분 |  |
| Structured diagnostic fields |  |
| Exactly limit / limit+1 behavior |  |
| Reviewable baseline update가 필요한 이유 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

### 6. `1529ccf225c1` — build(perf): desktop Lighthouse 실행 경계 추가

- **Importance:** A
- **Tags:** PERF, DEPLOY
- **Source-defined thread role:** Defines repeatable route/design laboratory thresholds.
- **Source classification summary:** Add a reproducible desktop Lighthouse CI matrix for the home page and one enabled project detail page in all five designs.
- **Source classification reason:** Significant because it removes a systematic loading cost or converts production performance into measured, reviewable, and enforceable output constraints.

#### Source에서 확정된 구현 의도와 상태 변화

Production server를 대상으로 home과 enabled project detail을 five designs에서 세 번씩 측정하고 median으로 performance/accessibility/LCP/TBT/CLS threshold를 평가하는 desktop Lighthouse CI matrix를 정의합니다.

#### 해당 SHA에서 확인할 실제 코드

- Project identifier를 authoritative content에서 파생하는 config를 확인합니다.
- Production server start command, dedicated port, readiness/reuse behavior를 확인합니다.
- Five-design home/detail URL 생성과 query state를 확인합니다.
- Number of runs와 median aggregation을 확인합니다.
- Performance 0.90, accessibility 0.95, LCP 2.5s, TBT 200ms, CLS 0.1을 exact config로 기록합니다.
- Headless Chrome binary/environment dependency를 확인합니다.

확인 원칙:

- 먼저 `1529ccf225c1^`와 `1529ccf225c1`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Route/design coverage matrix |  |
| Production server lifecycle |  |
| Run count와 aggregation policy |  |
| 각 threshold와 failure condition |  |
| Lab result가 real-user field data를 증명하지 않는 범위 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

### 7. `abbd530368a0` — ci: 검증된 bundle과 Lighthouse gate 활성화

- **Importance:** A
- **Tags:** VALIDATION, PERF, DEPLOY
- **Source-defined thread role:** Promotes artifact, size, and audit limits into the release path.
- **Source classification summary:** Promote the production bundle and Lighthouse checks from local tooling into the CI release path.
- **Source classification reason:** Significant because it removes a systematic loading cost or converts production performance into measured, reviewable, and enforceable output constraints.

#### Source에서 확정된 구현 의도와 상태 변화

Standalone verification, route bundle budget, Lighthouse gate를 CI release path에 올립니다. Production E2E build를 한 번 사용하고 Playwright Chromium을 Lighthouse browser로 재사용하며 visual snapshots는 일반 CI E2E에서 제외합니다.

#### 해당 SHA에서 확인할 실제 코드

- Workflow가 production build를 한 번 만들고 이후 단계가 같은 artifact를 쓰는지 확인합니다.
- Standalone check, bundle check, Lighthouse command 순서를 추적합니다.
- Playwright-installed Chromium path를 Lighthouse에 전달하는 environment를 확인합니다.
- Visual snapshot test가 general CI command에서 제외되는 filter를 확인합니다.
- 각 gate failure가 job status로 전파되는지 확인합니다.
- 이전 기본 CI와 비교해 확장된 boundary를 목록화합니다.

확인 원칙:

- 먼저 `abbd530368a0^`와 `abbd530368a0`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Build-once artifact reuse |  |
| CI release gate sequence |  |
| Browser binary source |  |
| Visual regression 분리 이유 |  |
| Failure propagation과 diagnostic artifact |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

### 8. `b87a2b453741` — build(docker): public 자산을 포함한 비루트 standalone image 추가

- **Importance:** A
- **Tags:** DEPLOY
- **Source-defined thread role:** Packages the verified artifact with explicit public assets and non-root runtime.
- **Source classification summary:** Add a multi-stage container build around the verified Next.js standalone artifact.
- **Source classification reason:** Significant because it changes or hardens the reproducible production-build and runtime boundary rather than merely adjusting local tooling.

#### Source에서 확정된 구현 의도와 상태 변화

Verified standalone artifact를 multi-stage Docker image로 package합니다. Builder는 pinned Node/npm과 build-time content mode/origin을 사용하고 runtime image는 unprivileged `node` user로 standalone, static, public만 포함합니다.

#### 해당 SHA에서 확인할 실제 코드

- Dependency, builder, runtime stage의 base image와 copy boundary를 확인합니다.
- Pinned Node/npm version과 install command가 repository contract와 일치하는지 확인합니다.
- Content mode와 public origin build args/env가 readiness에 전달되는지 추적합니다.
- Builder가 production build와 standalone verifier를 통과해야 runtime stage가 만들어지는지 확인합니다.
- Runtime stage의 `.next/standalone`, `.next/static`, `public` copy를 각각 확인합니다.
- Final `USER node`, port, startup command, filesystem ownership을 확인합니다.
- Docker ignore가 git, local deps, tests, logs, env files를 제외하는지 확인합니다.

확인 원칙:

- 먼저 `b87a2b453741^`와 `b87a2b453741`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Stage별 artifact ownership |  |
| Build-time publication inputs |  |
| Public asset을 explicit copy해야 하는 이유 |  |
| Non-root runtime boundary |  |
| Image에 포함되지 않는 development/source material |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

### 9. `b94fa6dd0118` — test(docker): runtime route와 public 자산 검증 자동화

- **Importance:** A
- **Tags:** ARCH, VALIDATION, ROUTING
- **Source-defined thread role:** Exercises the final container and derives asset coverage from authoritative content.
- **Source classification summary:** Add an end-to-end container contract that builds the image, starts it on an isolated ephemeral port, waits for readiness, and verifies that the configured runtime user is `node`.
- **Source classification reason:** Significant because it standardizes a cross-route design, navigation, shell, or dispatch boundary instead of adding isolated page markup.

#### Source에서 확정된 구현 의도와 상태 변화

Container image를 실제 build/start하고 isolated port에서 readiness를 기다린 뒤 runtime user, home/detail HTML, 모든 content-derived public asset의 body와 MIME을 검증합니다. Unique names, failure logs, `finally` cleanup도 포함합니다.

#### 해당 SHA에서 확인할 실제 코드

- Image/container name과 ephemeral host port 생성 방식을 확인합니다.
- Docker build/run, readiness polling, timeout/failure log collection을 추적합니다.
- Configured user가 `node`인지 inspect하는 command를 확인합니다.
- Home와 enabled project detail route의 non-empty successful HTML assertion을 확인합니다.
- Authoritative JSON을 recursive traversal해 asset URL set을 만드는 code와 dedup을 확인합니다.
- Extension별 expected MIME과 response body assertion을 확인합니다.
- `finally` cleanup이 성공/실패 모두에서 container/image를 제거하는지 확인합니다.

확인 원칙:

- 먼저 `b94fa6dd0118^`와 `b94fa6dd0118`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 대상 invariant: deployable image의 user/routes/assets |  |
| Docker build + real process + HTTP/MIME technique |  |
| Production path와 content source traversal |  |
| 증명하는 것: packaged standalone/public serving/non-root |  |
| 증명하지 않는 것: orchestration, TLS, external proxy, production load |  |
| Failure logs와 cleanup lifecycle |  |
| CI에서 막는 회귀 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

## 6. Invariant ledger

| Invariant | Source에서 확인된 변화 지점 | 해당 SHA의 실제 code/test evidence | 부족함이 드러난 시점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| CI는 pinned toolchain과 reproducible install로 production path를 검사합니다. | `9fd3541c11dc` |  |  |  |
| Standalone server entry와 static directory는 explicit artifact입니다. | `29508f4668ea → c0f7434467a0` |  |  |  |
| Route budget은 emitted JS와 non-inlined CSS의 actual byte를 기준으로 합니다. | `605b64512edf` |  |  |  |
| Baseline route coverage와 5% growth limit은 fail-closed입니다. | `518ff5b51ec5` |  |  |  |
| Lighthouse는 production server와 five-design representative routes를 반복 측정합니다. | `1529ccf225c1` |  |  |  |
| Release CI는 standalone, route budget, Lighthouse gate를 실제 build에 적용합니다. | `abbd530368a0` |  |  |  |
| Final image는 public assets를 포함하고 non-root로 실행되며 real HTTP로 검증됩니다. | `b87a2b453741 → b94fa6dd0118` |  |  |  |

Ledger 작성 원칙:

- Source가 명시한 invariant만 사용하고 새 invariant를 확정 사실처럼 추가하지 않습니다.
- 도입, 강화, 부족함 노출, fix, regression test가 서로 다른 commit이면 각 열에 분리해 기록합니다.
- Code evidence에는 실제 field, function, branch, selector, command 또는 assertion을 적습니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 위험 | 대응 commit | 실제 수정/강화 code에서 확인할 것 | Test 또는 실행 증거 |
| --- | --- | --- | --- |
| Source checks는 통과하지만 server entry/static asset이 없음 | 29508f4668ea → c0f7434467a0 | Standalone output과 post-build filesystem check를 확인합니다. | 필수 path 누락의 message와 exit를 기록합니다. |
| Route chunk가 커졌거나 route가 사라졌지만 build는 성공 | 605b64512edf → 518ff5b51ec5 | Manifest/asset byte를 측정해 committed baseline과 비교합니다. | 정확히 5%와 5%+1 byte 경계를 확인합니다. |
| Development server는 빠르지만 production route/design이 기준 미달 | 1529ccf225c1 → abbd530368a0 | Production server, 3 runs, median, explicit thresholds를 확인합니다. | CI가 audit failure를 release failure로 전달하는 chain을 기록합니다. |
| Image가 public asset을 누락하거나 root로 실행 | b87a2b453741 → b94fa6dd0118 | Docker copy/user contract와 runtime HTTP/MIME/user 검증을 확인합니다. | Failure logs와 `finally` cleanup을 확인합니다. |

## 8. Ownership / state / responsibility 변화

| Concern | Thread 초기 owner/state | Thread 최종 owner/state | 실제 symbol과 호출 경로 |
| --- | --- | --- | --- |
| General quality gate | Developer local execution | CI workflow |  |
| Runtime package boundary | Implicit Next build output | Standalone output + verifier |  |
| Client cost measurement | Source size/estimate | Emitted manifests와 asset bytes |  |
| Growth policy | Check가 current value를 수용할 위험 | Committed baseline + separate baseline/check |  |
| Lab performance | One-off manual audit | Repeatable Lighthouse matrix |  |
| Deployable image | Artifact copy assumption | Multi-stage Dockerfile + HTTP contract test |  |

## 9. Thread 최종 상태

### Source에서 확정된 최종 상태

Source-level green 상태를 넘어 실제 Next.js production output, route별 client asset, Lighthouse 결과, standalone package, non-root container와 public asset serving을 fail-closed release contract로 만드는 과정을 복원합니다.

### 학습자가 완성할 최종 설명

- Thread 시작 시점의 설계와 위험:
- 핵심 architecture/decision이 형성된 순서:
- 실제 failure 또는 부족함이 드러난 지점:
- Fix 또는 boundary 강화가 바꾼 invariant:
- Test/build/browser evidence가 보장한 범위:
- Thread 종료 시점에도 보장하지 않는 범위:

## 10. 최종 architecture 또는 execution flow 정리

아래 source-backed flow의 각 단계에 실제 file path, symbol, input/output, failure branch를 추가합니다.

1. Pinned Node/npm 환경에서 reproducible dependency install을 수행합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
2. Lint, type, content/readiness, production build를 실행합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
3. Build output에서 standalone server entry와 static directory를 확인합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
4. Manifest를 읽어 route별 emitted JS와 non-inlined CSS byte를 계산합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
5. Committed baseline과 5% policy로 route coverage와 growth를 평가합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
6. Production server에서 five-design home/detail Lighthouse matrix를 실행합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
7. Verified standalone/static/public을 non-root image로 조립합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
8. Container를 기동하고 user, routes, content-derived assets, MIME, cleanup을 검증합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:

### 코드 없이 설명하기

> 이 Thread의 최종 실행 흐름을 code snippet 없이 자신의 말로 작성합니다. 설계 → 구현 → failure/risk → 수정/강화 → 검증 순서가 드러나야 합니다.

## 11. 학습 완료 자가 점검

- [ ] Commit map의 모든 SHA를 실제로 checkout하거나 diff로 확인했습니다.
- [ ] Thread 내 commit 순서를 source와 동일하게 유지했습니다.
- [ ] 각 A/S commit에서 직전 상태, decision, failure boundary, guarantee와 non-guarantee를 구분했습니다.
- [ ] B commit은 thread 흐름에서 필요한 구현 역할과 state change를 확인했습니다.
- [ ] Fix commit을 독립 feature가 아니라 기존 가정 → failure → root cause → corrected invariant로 설명했습니다.
- [ ] Test commit에서 production invariant, failure injection, technique, traversed production path, proves/does-not-prove를 구분했습니다.
- [ ] Invariant ledger의 모든 주장에 해당 SHA의 code/test evidence가 있습니다.
- [ ] Final HEAD의 code를 과거 commit 설명에 소급하지 않았습니다.
- [ ] Thread 최종 흐름을 code 없이 설명할 수 있습니다.
