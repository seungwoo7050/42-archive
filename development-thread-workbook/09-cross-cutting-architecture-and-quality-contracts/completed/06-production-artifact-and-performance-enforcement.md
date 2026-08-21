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
| Reproducible CI environment | pinned Node/npm, reproducible install과 production checks를 GitHub Actions required path로 만들었습니다. `.github/workflows/ci.yml`은 push/PR trigger, contents read-only permission, concurrency cancel, 30-minute timeout을 두고 `.nvmrc`, npm 11.16.0, `npm ci`, lint, typecheck, content check, Playwright Chromium install, production E2E 순으로 실행합니다. |
| Required checks와 실행 순서 | `.github/workflows/ci.yml`은 push/PR trigger, contents read-only permission, concurrency cancel, 30-minute timeout을 두고 `.nvmrc`, npm 11.16.0, `npm ci`, lint, typecheck, content check, Playwright Chromium install, production E2E 순으로 실행합니다. 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다. |
| Workflow 권한/자원 경계 | workflow가 environment/order/failure propagation을 소유하고 repository manifest/lockfile이 dependency resolution을 소유합니다. |
| 초기 gate가 검증하지 않는 final artifact 속성 | 배포 품질 검사가 개발자 로컬 실행과 환경 차이에 의존했습니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 배포 품질 검사가 개발자 로컬 실행과 환경 차이에 의존했습니다.
- **해당 SHA 핵심 코드:** `.github/workflows/ci.yml`은 push/PR trigger, contents read-only permission, concurrency cancel, 30-minute timeout을 두고 `.nvmrc`, npm 11.16.0, `npm ci`, lint, typecheck, content check, Playwright Chromium install, production E2E 순으로 실행합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `29508f4668ea`부터 emitted artifact boundary를 명시적으로 다룹니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** 배포 품질 검사가 개발자 로컬 실행과 환경 차이에 의존했습니다. lockfile/toolchain과 production E2E를 자동화하지 않으면 source-level green이 release path를 대표하지 못합니다.
- **구현 결정과 경로:** pinned Node/npm, reproducible install과 production checks를 GitHub Actions required path로 만들었습니다. `.github/workflows/ci.yml`은 push/PR trigger, contents read-only permission, concurrency cancel, 30-minute timeout을 두고 `.nvmrc`, npm 11.16.0, `npm ci`, lint, typecheck, content check, Playwright Chromium install, production E2E 순으로 실행합니다.
- **소유권·실패 처리:** workflow가 environment/order/failure propagation을 소유하고 repository manifest/lockfile이 dependency resolution을 소유합니다. 각 shell step의 non-zero status가 job failure로 전파되고 stale run은 concurrency로 취소됩니다.
- **보장:** 동일 pinned environment에서 basic production build/E2E quality path를 재현합니다.
- **보장하지 않는 범위:** standalone artifact completeness, route budget, Lighthouse와 final Docker runtime은 아직 검사하지 않습니다.
- **후속 연결:** `29508f4668ea`부터 emitted artifact boundary를 명시적으로 다룹니다.

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
| Standalone artifact directory/file boundary | Next trace output이 runtime dependency boundary를 소유하고 source/development tree는 artifact 밖에 남을 수 있습니다. |
| Traced runtime과 development tree 차이 | `next.config.ts`의 standalone setting이 build 시 `.next/standalone/server.js`와 traced runtime tree를 생성하도록 요청합니다. |
| Static/public asset packaging 상태 | Next config에서 `output: "standalone"`을 선택했습니다. `next.config.ts`의 standalone setting이 build 시 `.next/standalone/server.js`와 traced runtime tree를 생성하도록 요청합니다. |
| 후속 verifier가 필요한 implicit assumption | `c0f7434467a0`이 required output existence를 fail-closed check로 만듭니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** Next build output은 일반 server deployment tree였고 container가 사용할 traced runtime boundary가 명시되지 않았습니다.
- **해당 SHA 핵심 코드:** `next.config.ts`의 standalone setting이 build 시 `.next/standalone/server.js`와 traced runtime tree를 생성하도록 요청합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `c0f7434467a0`이 required output existence를 fail-closed check로 만듭니다.

#### SHA별 복원 결론

- **Thread 내 역할:** Next config에서 `output: "standalone"`을 선택했습니다.
- **실제 변경:** `next.config.ts`의 standalone setting이 build 시 `.next/standalone/server.js`와 traced runtime tree를 생성하도록 요청합니다.
- **현재 보장:** 후속 verifier/container가 사용할 standalone artifact convention을 정의합니다.
- **남은 범위:** 실제 build 결과, `.next/static`, `public` 포함과 runtime serving은 보장하지 않습니다. `c0f7434467a0`이 required output existence를 fail-closed check로 만듭니다.

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
| 대상 production invariant | standalone server entry와 static path가 검사 시점에 존재함을 보장합니다. |
| Failure injection과 diagnostic | missing path를 temporary removal로 주입할 수 있으며 script throw/non-zero가 diagnostic을 제공합니다. |
| Post-build filesystem assertion technique | build verification script는 required paths array를 `existsSync`로 검사해 missing list를 error로 throw하고 `package.json`에 `build:verify` command를 추가합니다. 실제로 file/directory type까지 구분하지는 않습니다. 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다. |
| 증명하는 artifact와 아직 확인하지 않는 runtime serving/public asset | server가 실제 기동하거나 `public` asset을 serve하는지는 검사하지 않으며 이 SHA에서는 CI gate도 아직 아닙니다. |
| CI 연결 전 command usage | `abbd530368a0`이 verifier를 CI에 올리고 `b94fa6dd0118`이 actual runtime serving을 검사합니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** standalone config만 존재해 compiler/version/config 변화로 required output이 누락돼도 별도 diagnostic이 없었습니다.
- **해당 SHA 핵심 코드:** build verification script는 required paths array를 `existsSync`로 검사해 missing list를 error로 throw하고 `package.json`에 `build:verify` command를 추가합니다. 실제로 file/directory type까지 구분하지는 않습니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `abbd530368a0`이 verifier를 CI에 올리고 `b94fa6dd0118`이 actual runtime serving을 검사합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** standalone config만 존재해 compiler/version/config 변화로 required output이 누락돼도 별도 diagnostic이 없었습니다. build 성공 status가 deployable server entry/static directory의 존재를 뜻하지 않을 수 있었습니다.
- **구현 결정과 경로:** post-build verifier에서 `.next/standalone/server.js`와 `.next/static` existence를 explicit contract로 검사했습니다. build verification script는 required paths array를 `existsSync`로 검사해 missing list를 error로 throw하고 `package.json`에 `build:verify` command를 추가합니다. 실제로 file/directory type까지 구분하지는 않습니다.
- **소유권·실패 처리:** Next build가 artifact를 생성하고 verifier가 release-required path 존재를 소유합니다. missing path를 temporary removal로 주입할 수 있으며 script throw/non-zero가 diagnostic을 제공합니다.
- **보장:** standalone server entry와 static path가 검사 시점에 존재함을 보장합니다.
- **보장하지 않는 범위:** server가 실제 기동하거나 `public` asset을 serve하는지는 검사하지 않으며 이 SHA에서는 CI gate도 아직 아닙니다.
- **후속 연결:** `abbd530368a0`이 verifier를 CI에 올리고 `b94fa6dd0118`이 actual runtime serving을 검사합니다.

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
| Authoritative measurement input과 source size 차이 | `scripts/route-budgets.mjs`는 `app-paths-manifest.json`에서 page route를 찾고 internal entries를 제외하며 build manifest root chunks와 route client-reference assets를 합칩니다. `Set`으로 route 내 asset을 deduplicate하고 `stat.size`의 uncompressed bytes를 더하며 inlined CSS는 separate transfer count에서 제외합니다. |
| Public route discovery 규칙 | production manifests와 filesystem stat에서 public route별 JS/non-inlined CSS bytes를 계산했습니다. |
| Shared/deduplicated asset accounting | production manifests와 filesystem stat에서 public route별 JS/non-inlined CSS bytes를 계산했습니다. `scripts/route-budgets.mjs`는 `app-paths-manifest.json`에서 page route를 찾고 internal entries를 제외하며 build manifest root chunks와 route client-reference assets를 합칩니다. `Set`으로 route 내 asset을 deduplicate하고 `stat.size`의 uncompressed bytes를 더하며 inlined CSS는 separate transfer count에서 제외합니다. |
| Inlined/non-inlined CSS 구분 | `scripts/route-budgets.mjs`는 `app-paths-manifest.json`에서 page route를 찾고 internal entries를 제외하며 build manifest root chunks와 route client-reference assets를 합칩니다. `Set`으로 route 내 asset을 deduplicate하고 `stat.size`의 uncompressed bytes를 더하며 inlined CSS는 separate transfer count에서 제외합니다. |
| Malformed/missing manifest failure path | missing/malformed manifest, unresolved file 또는 unsupported generated syntax는 parse/read failure로 command를 중단합니다. |
| 아직 policy failure를 만들지 않는 범위 | threshold/policy failure를 만들지 않고 compressed network cost나 runtime execution cost도 측정하지 않습니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** client cost를 source size나 generic build 성공으로만 판단했고 route별 emitted asset 비용을 알 수 없었습니다.
- **해당 SHA 핵심 코드:** `scripts/route-budgets.mjs`는 `app-paths-manifest.json`에서 page route를 찾고 internal entries를 제외하며 build manifest root chunks와 route client-reference assets를 합칩니다. `Set`으로 route 내 asset을 deduplicate하고 `stat.size`의 uncompressed bytes를 더하며 inlined CSS는 separate transfer count에서 제외합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `518ff5b51ec5`가 measurement를 committed growth policy로 전환합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** client cost를 source size나 generic build 성공으로만 판단했고 route별 emitted asset 비용을 알 수 없었습니다. shared chunk, duplicate assets와 CSS inlining 때문에 source-level estimate는 실제 transfer boundary와 다를 수 있었습니다.
- **구현 결정과 경로:** production manifests와 filesystem stat에서 public route별 JS/non-inlined CSS bytes를 계산했습니다. `scripts/route-budgets.mjs`는 `app-paths-manifest.json`에서 page route를 찾고 internal entries를 제외하며 build manifest root chunks와 route client-reference assets를 합칩니다. `Set`으로 route 내 asset을 deduplicate하고 `stat.size`의 uncompressed bytes를 더하며 inlined CSS는 separate transfer count에서 제외합니다.
- **소유권·실패 처리:** Next emitted manifests가 route/asset membership을, filesystem artifact가 byte truth를 소유합니다. missing/malformed manifest, unresolved file 또는 unsupported generated syntax는 parse/read failure로 command를 중단합니다.
- **보장:** 각 emitted public route의 counted JS와 non-inlined CSS actual artifact bytes를 report합니다.
- **보장하지 않는 범위:** threshold/policy failure를 만들지 않고 compressed network cost나 runtime execution cost도 측정하지 않습니다.
- **후속 연결:** `518ff5b51ec5`가 measurement를 committed growth policy로 전환합니다.

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
| 5% policy 계산식과 rounding | committed per-route baseline과 fixed 5% allowance를 비교하는 fail-closed evaluator를 추가했습니다. |
| Route coverage와 size growth failure 구분 | 정확히 floor limit은 통과하고 limit+1 byte는 실패합니다. Routine check는 current result로 baseline을 자동 rewrite하지 않습니다. |
| Structured diagnostic fields | `BUDGET_GROWTH_FACTOR = 1.05`, allowed limit는 `Math.floor(baseline * 1.05)`이고 actual이 allowed보다 클 때 위반입니다. Expected route missing, emitted new route, JS overage, CSS overage를 별도 structured record로 저장하며 baseline/allowed/actual/asset class를 보존합니다. |
| Exactly limit / limit+1 behavior | committed per-route baseline과 fixed 5% allowance를 비교하는 fail-closed evaluator를 추가했습니다. `BUDGET_GROWTH_FACTOR = 1.05`, allowed limit는 `Math.floor(baseline * 1.05)`이고 actual이 allowed보다 클 때 위반입니다. Expected route missing, emitted new route, JS overage, CSS overage를 별도 structured record로 저장하며 baseline/allowed/actual/asset class를 보존합니다. |
| Reviewable baseline update가 필요한 이유 | `abbd530368a0`이 evaluator를 release CI에 연결합니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** route measurement는 가능했지만 현재 값을 그대로 받아들이면 growth regression을 차단할 기준이 없었습니다.
- **해당 SHA 핵심 코드:** `BUDGET_GROWTH_FACTOR = 1.05`, allowed limit는 `Math.floor(baseline * 1.05)`이고 actual이 allowed보다 클 때 위반입니다. Expected route missing, emitted new route, JS overage, CSS overage를 별도 structured record로 저장하며 baseline/allowed/actual/asset class를 보존합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `abbd530368a0`이 evaluator를 release CI에 연결합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** route measurement는 가능했지만 현재 값을 그대로 받아들이면 growth regression을 차단할 기준이 없었습니다. route가 사라지거나 새 route가 생기고 JS/CSS가 커져도 report만 생성하면 build는 성공했습니다.
- **구현 결정과 경로:** committed per-route baseline과 fixed 5% allowance를 비교하는 fail-closed evaluator를 추가했습니다. `BUDGET_GROWTH_FACTOR = 1.05`, allowed limit는 `Math.floor(baseline * 1.05)`이고 actual이 allowed보다 클 때 위반입니다. Expected route missing, emitted new route, JS overage, CSS overage를 별도 structured record로 저장하며 baseline/allowed/actual/asset class를 보존합니다.
- **소유권·실패 처리:** committed baseline이 reviewable policy state를 소유하고 routine checker는 current result만 읽어 비교합니다. 정확히 floor limit은 통과하고 limit+1 byte는 실패합니다. Routine check는 current result로 baseline을 자동 rewrite하지 않습니다.
- **보장:** route coverage와 5% growth limit이 fail-closed violation으로 변환됩니다.
- **보장하지 않는 범위:** baseline 자체가 최적이라는 사실, compressed bytes와 runtime UX는 보장하지 않습니다.
- **후속 연결:** `abbd530368a0`이 evaluator를 release CI에 연결합니다.

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
| Route/design coverage matrix | Lighthouse config는 authoritative content의 첫 enabled project ID를 사용하고 dedicated port 3300의 production server를 시작합니다. 각 URL은 3 runs, median이고 thresholds는 performance 0.90, accessibility 0.95, LCP 2500ms, TBT 200ms, CLS 0.1입니다. |
| Production server lifecycle | content가 representative detail route를, config가 matrix/run/threshold/server lifecycle을 소유합니다. |
| Run count와 aggregation policy | production server에서 5 design×home/detail 10 URLs를 3회 측정하고 median threshold를 적용하는 desktop Lighthouse matrix를 정의했습니다. |
| 각 threshold와 failure condition | server readiness 또는 Chrome binary가 없거나 median assertion을 위반하면 audit command가 실패합니다. |
| Lab result가 real-user field data를 증명하지 않는 범위 | real-user field data, 네트워크/기기 전체 분포와 모든 route 성능은 증명하지 않습니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** bundle byte gate만으로 rendered production page의 lab performance/accessibility를 판단할 수 없었습니다.
- **해당 SHA 핵심 코드:** Lighthouse config는 authoritative content의 첫 enabled project ID를 사용하고 dedicated port 3300의 production server를 시작합니다. 각 URL은 3 runs, median이고 thresholds는 performance 0.90, accessibility 0.95, LCP 2500ms, TBT 200ms, CLS 0.1입니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `abbd530368a0`이 Playwright Chromium을 제공하고 audit를 CI gate로 승격합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** bundle byte gate만으로 rendered production page의 lab performance/accessibility를 판단할 수 없었습니다. 개발 서버 한 번의 수동 audit는 production mode, route/design variation과 measurement noise를 반영하지 못했습니다.
- **구현 결정과 경로:** production server에서 5 design×home/detail 10 URLs를 3회 측정하고 median threshold를 적용하는 desktop Lighthouse matrix를 정의했습니다. Lighthouse config는 authoritative content의 첫 enabled project ID를 사용하고 dedicated port 3300의 production server를 시작합니다. 각 URL은 3 runs, median이고 thresholds는 performance 0.90, accessibility 0.95, LCP 2500ms, TBT 200ms, CLS 0.1입니다.
- **소유권·실패 처리:** content가 representative detail route를, config가 matrix/run/threshold/server lifecycle을 소유합니다. server readiness 또는 Chrome binary가 없거나 median assertion을 위반하면 audit command가 실패합니다.
- **보장:** 고정된 lab 환경에서 대표 route/design의 configured threshold를 반복 평가합니다.
- **보장하지 않는 범위:** real-user field data, 네트워크/기기 전체 분포와 모든 route 성능은 증명하지 않습니다.
- **후속 연결:** `abbd530368a0`이 Playwright Chromium을 제공하고 audit를 CI gate로 승격합니다.

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
| Build-once artifact reuse | production E2E build를 한 번 만들고 같은 `.next` artifact에 verifier, budget, Lighthouse를 순서대로 적용했습니다. CI의 `test:e2e:ci`가 build+production E2E를 수행하며 `@visual` snapshot은 일반 command에서 제외합니다. 뒤이어 `build:verify`, bundle check, Playwright-installed Chromium path를 `CHROME_PATH`로 export한 Lighthouse audit가 같은 artifact를 사용합니다. |
| CI release gate sequence | production E2E build를 한 번 만들고 같은 `.next` artifact에 verifier, budget, Lighthouse를 순서대로 적용했습니다. CI의 `test:e2e:ci`가 build+production E2E를 수행하며 `@visual` snapshot은 일반 command에서 제외합니다. 뒤이어 `build:verify`, bundle check, Playwright-installed Chromium path를 `CHROME_PATH`로 export한 Lighthouse audit가 같은 artifact를 사용합니다. |
| Browser binary source | CI의 `test:e2e:ci`가 build+production E2E를 수행하며 `@visual` snapshot은 일반 command에서 제외합니다. 뒤이어 `build:verify`, bundle check, Playwright-installed Chromium path를 `CHROME_PATH`로 export한 Lighthouse audit가 같은 artifact를 사용합니다. |
| Visual regression 분리 이유 | production E2E build를 한 번 만들고 같은 `.next` artifact에 verifier, budget, Lighthouse를 순서대로 적용했습니다. CI의 `test:e2e:ci`가 build+production E2E를 수행하며 `@visual` snapshot은 일반 command에서 제외합니다. 뒤이어 `build:verify`, bundle check, Playwright-installed Chromium path를 `CHROME_PATH`로 export한 Lighthouse audit가 같은 artifact를 사용합니다. |
| Failure propagation과 diagnostic artifact | 어느 gate든 non-zero면 job/release path가 실패하며 browser path 부재도 명시적 failure가 됩니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** standalone/budget/Lighthouse tooling은 로컬 command였고 기본 CI release path가 실행하지 않았습니다.
- **해당 SHA 핵심 코드:** CI의 `test:e2e:ci`가 build+production E2E를 수행하며 `@visual` snapshot은 일반 command에서 제외합니다. 뒤이어 `build:verify`, bundle check, Playwright-installed Chromium path를 `CHROME_PATH`로 export한 Lighthouse audit가 같은 artifact를 사용합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `b87a2b453741`과 `b94fa6dd0118`이 final image와 real HTTP contract를 닫습니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** standalone/budget/Lighthouse tooling은 로컬 command였고 기본 CI release path가 실행하지 않았습니다. 검사 도구가 있어도 required automation에서 빠지면 regression을 merge 전에 막지 못합니다.
- **구현 결정과 경로:** production E2E build를 한 번 만들고 같은 `.next` artifact에 verifier, budget, Lighthouse를 순서대로 적용했습니다. CI의 `test:e2e:ci`가 build+production E2E를 수행하며 `@visual` snapshot은 일반 command에서 제외합니다. 뒤이어 `build:verify`, bundle check, Playwright-installed Chromium path를 `CHROME_PATH`로 export한 Lighthouse audit가 같은 artifact를 사용합니다.
- **소유권·실패 처리:** CI가 build-once artifact lifecycle과 gate order를 소유하고 visual snapshot은 별도 환경-sensitive suite로 분리됩니다. 어느 gate든 non-zero면 job/release path가 실패하며 browser path 부재도 명시적 failure가 됩니다.
- **보장:** standalone existence, route growth와 Lighthouse thresholds가 실제 release CI에 적용됩니다.
- **보장하지 않는 범위:** Docker packaging/runtime, external deployment, visual snapshots의 일반 CI 실행은 아직 보장하지 않습니다.
- **후속 연결:** `b87a2b453741`과 `b94fa6dd0118`이 final image와 real HTTP contract를 닫습니다.

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
| Stage별 artifact ownership | deps stage는 installed dependency, builder는 verified build output, runner는 minimal runtime files와 ownership을 소유합니다. |
| Build-time publication inputs | pinned multi-stage Docker build로 dependency/builder/runtime를 나누고 standalone/static/public만 non-root image에 복사했습니다. `Dockerfile`은 `node:24.18.0-bookworm-slim`, npm 11.16.0, `npm ci`, build args/env `PORTFOLIO_CONTENT_MODE`/`SITE_URL`, build+verify를 사용합니다. Runner는 `.next/standalone`, `.next/static`, `public`을 복사하고 `USER node`, port 3100, `node server.js`로 시작합니다. `.dockerignore`는 git, deps, tests, logs, env 등을 제외합니다. |
| Public asset을 explicit copy해야 하는 이유 | pinned multi-stage Docker build로 dependency/builder/runtime를 나누고 standalone/static/public만 non-root image에 복사했습니다. `Dockerfile`은 `node:24.18.0-bookworm-slim`, npm 11.16.0, `npm ci`, build args/env `PORTFOLIO_CONTENT_MODE`/`SITE_URL`, build+verify를 사용합니다. Runner는 `.next/standalone`, `.next/static`, `public`을 복사하고 `USER node`, port 3100, `node server.js`로 시작합니다. `.dockerignore`는 git, deps, tests, logs, env 등을 제외합니다. |
| Non-root runtime boundary | deps stage는 installed dependency, builder는 verified build output, runner는 minimal runtime files와 ownership을 소유합니다. |
| Image에 포함되지 않는 development/source material | 실제 image build, process startup, route/asset HTTP/MIME은 아직 실행 검증하지 않습니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** verified `.next` artifact가 있어도 runtime image의 copy boundary, publication env와 user가 명시되지 않았습니다.
- **해당 SHA 핵심 코드:** `Dockerfile`은 `node:24.18.0-bookworm-slim`, npm 11.16.0, `npm ci`, build args/env `PORTFOLIO_CONTENT_MODE`/`SITE_URL`, build+verify를 사용합니다. Runner는 `.next/standalone`, `.next/static`, `public`을 복사하고 `USER node`, port 3100, `node server.js`로 시작합니다. `.dockerignore`는 git, deps, tests, logs, env 등을 제외합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `b94fa6dd0118`이 container를 실제 build/start하고 contract를 검사합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** verified `.next` artifact가 있어도 runtime image의 copy boundary, publication env와 user가 명시되지 않았습니다. public assets 누락, root 실행 또는 source/development material 과포장이 가능했습니다.
- **구현 결정과 경로:** pinned multi-stage Docker build로 dependency/builder/runtime를 나누고 standalone/static/public만 non-root image에 복사했습니다. `Dockerfile`은 `node:24.18.0-bookworm-slim`, npm 11.16.0, `npm ci`, build args/env `PORTFOLIO_CONTENT_MODE`/`SITE_URL`, build+verify를 사용합니다. Runner는 `.next/standalone`, `.next/static`, `public`을 복사하고 `USER node`, port 3100, `node server.js`로 시작합니다. `.dockerignore`는 git, deps, tests, logs, env 등을 제외합니다.
- **소유권·실패 처리:** deps stage는 installed dependency, builder는 verified build output, runner는 minimal runtime files와 ownership을 소유합니다. readiness/build/verify가 실패하면 runtime stage가 완성되지 않고 non-root user가 final process identity가 됩니다.
- **보장:** image definition이 explicit public assets와 non-root standalone runtime을 포함합니다.
- **보장하지 않는 범위:** 실제 image build, process startup, route/asset HTTP/MIME은 아직 실행 검증하지 않습니다.
- **후속 연결:** `b94fa6dd0118`이 container를 실제 build/start하고 contract를 검사합니다.

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
| 대상 invariant: deployable image의 user/routes/assets | packaged standalone/public serving, configured non-root user와 selected routes/assets의 actual HTTP/MIME contract를 검증하도록 구현됐습니다. |
| Docker build + real process + HTTP/MIME technique | container test script는 PID+random 이름, Docker build/run, 60회×1초 readiness polling, `.Config.User === "node"`, `/`와 `/projects/example-project?view=classic`의 200/non-empty/text-html을 검사합니다. 모든 `src/content/*.json`을 재귀 순회해 `content\|template/` asset 문자열을 Set으로 deduplicate/sort하고 extension별 MIME, 200, non-empty body를 검사합니다. 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다. |
| Production path와 content source traversal | container test script는 PID+random 이름, Docker build/run, 60회×1초 readiness polling, `.Config.User === "node"`, `/`와 `/projects/example-project?view=classic`의 200/non-empty/text-html을 검사합니다. 모든 `src/content/*.json`을 재귀 순회해 `content\|template/` asset 문자열을 Set으로 deduplicate/sort하고 extension별 MIME, 200, non-empty body를 검사합니다. |
| 증명하는 것: packaged standalone/public serving/non-root | packaged standalone/public serving, configured non-root user와 selected routes/assets의 actual HTTP/MIME contract를 검증하도록 구현됐습니다. |
| 증명하지 않는 것: orchestration, TLS, external proxy, production load | orchestration, TLS, reverse proxy, production load, all route/content combinations는 증명하지 않습니다. |
| Failure logs와 cleanup lifecycle | 실패 시 started container logs를 수집하고 main failure 여부와 별개로 `finally`에서 container 후 image를 제거합니다. Cleanup error는 기존 main failure가 없을 때만 rethrow합니다. |
| CI에서 막는 회귀 | unique image/container를 build/start하고 ephemeral loopback port에서 runtime user, routes, content-derived assets와 cleanup을 검증했습니다. container test script는 PID+random 이름, Docker build/run, 60회×1초 readiness polling, `.Config.User === "node"`, `/`와 `/projects/example-project?view=classic`의 200/non-empty/text-html을 검사합니다. 모든 `src/content/*.json`을 재귀 순회해 `content\|template/` asset 문자열을 Set으로 deduplicate/sort하고 extension별 MIME, 200, non-empty body를 검사합니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** Dockerfile의 copy/user 설정은 정적 선언이라 실제 process와 HTTP serving이 성공한다는 증거가 없었습니다.
- **해당 SHA 핵심 코드:** container test script는 PID+random 이름, Docker build/run, 60회×1초 readiness polling, `.Config.User === "node"`, `/`와 `/projects/example-project?view=classic`의 200/non-empty/text-html을 검사합니다. 모든 `src/content/*.json`을 재귀 순회해 `content|template/` asset 문자열을 Set으로 deduplicate/sort하고 extension별 MIME, 200, non-empty body를 검사합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** 이 commit으로 source checks에서 final runnable image까지 release contract가 연결됩니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** Dockerfile의 copy/user 설정은 정적 선언이라 실제 process와 HTTP serving이 성공한다는 증거가 없었습니다. image가 build돼도 route가 비거나 asset MIME/body가 잘못되고 cleanup이 누락될 수 있었습니다.
- **구현 결정과 경로:** unique image/container를 build/start하고 ephemeral loopback port에서 runtime user, routes, content-derived assets와 cleanup을 검증했습니다. container test script는 PID+random 이름, Docker build/run, 60회×1초 readiness polling, `.Config.User === "node"`, `/`와 `/projects/example-project?view=classic`의 200/non-empty/text-html을 검사합니다. 모든 `src/content/*.json`을 재귀 순회해 `content|template/` asset 문자열을 Set으로 deduplicate/sort하고 extension별 MIME, 200, non-empty body를 검사합니다.
- **소유권·실패 처리:** authoritative JSON이 asset coverage를, running container가 user/process/HTTP behavior를, script `finally`가 container/image cleanup을 소유합니다. 실패 시 started container logs를 수집하고 main failure 여부와 별개로 `finally`에서 container 후 image를 제거합니다. Cleanup error는 기존 main failure가 없을 때만 rethrow합니다.
- **보장:** packaged standalone/public serving, configured non-root user와 selected routes/assets의 actual HTTP/MIME contract를 검증하도록 구현됐습니다.
- **보장하지 않는 범위:** orchestration, TLS, reverse proxy, production load, all route/content combinations는 증명하지 않습니다.
- **후속 연결:** 이 commit으로 source checks에서 final runnable image까지 release contract가 연결됩니다.

## 6. Invariant ledger

| Invariant | Source에서 확인된 변화 지점 | 해당 SHA의 실제 code/test evidence | 부족함이 드러난 시점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| CI는 pinned toolchain과 reproducible install로 production path를 검사합니다. | `9fd3541c11dc` | `.github/workflows/ci.yml`: `.nvmrc`, npm 11.16.0, `npm ci`, ordered lint/type/content/build/E2E, read-only/concurrency/timeout. | 개발자 로컬 품질 실행은 environment/order가 재현되지 않았습니다. | pinned install과 basic production path가 automation failure status로 연결됩니다. |
| Standalone server entry와 static directory는 explicit artifact입니다. | `29508f4668ea → c0f7434467a0` | `next.config.ts output:"standalone"` 및 post-build required paths `.next/standalone/server.js`, `.next/static`. | config만으로 actual artifact 존재를 알 수 없었습니다. | verifier가 두 path의 existence를 explicit release contract로 만듭니다. Type/content까지는 검사하지 않습니다. |
| Route budget은 emitted JS와 non-inlined CSS의 actual byte를 기준으로 합니다. | `605b64512edf` | `route-budgets.mjs`의 app/build/client-reference manifests, route discovery, Set dedup, `stat.size`, non-inlined CSS branch. | source size나 build success가 route transfer assets를 나타내지 못했습니다. | emitted artifact membership과 uncompressed actual bytes를 route별 measurement truth로 사용합니다. |
| Baseline route coverage와 5% growth limit은 fail-closed입니다. | `518ff5b51ec5` | baseline schema/evaluator의 `Math.floor(baseline*1.05)`, missing/new route, JS/CSS violation records. | measurement만 보고 current result를 자동 수용할 위험이 있었습니다. | committed route set과 exact 5% floor limit을 초과하거나 coverage가 달라지면 fail-closed입니다. |
| Lighthouse는 production server와 five-design representative routes를 반복 측정합니다. | `1529ccf225c1` | Lighthouse config의 5 design×home/detail 10 URLs, 3 runs median, production port와 five thresholds. | one-off dev-server audit는 production artifact와 variation/noise를 대표하지 못했습니다. | representative production routes를 repeatable desktop lab policy로 평가합니다. |
| Release CI는 standalone, route budget, Lighthouse gate를 실제 build에 적용합니다. | `abbd530368a0` | CI에서 build-once production E2E 후 artifact verify, bundle check, Playwright Chromium Lighthouse gate. | tooling이 local-only면 merge/release를 차단하지 못했습니다. | 동일 emitted artifact에 세 release gates가 순차 적용되고 non-zero가 job failure가 됩니다. |
| Final image는 public assets를 포함하고 non-root로 실행되며 real HTTP로 검증됩니다. | `b87a2b453741 → b94fa6dd0118` | Dockerfile standalone/static/public copies, `USER node`, runtime test의 inspect/routes/content-derived assets/MIME/finally cleanup. | 정적 Dockerfile만으로 actual process/serving을 증명하지 못했습니다. | final image의 configured user와 selected real HTTP routes/assets를 running container contract로 검사하도록 구현됐습니다. |

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

### 실제 연결 기록

- Standalone verifier는 `existsSync`를 사용하므로 이름이 맞는 path의 file/directory type 또는 runtime serving은 증명하지 않습니다. Container test가 다른 계층의 공백을 닫습니다.
- Budget limit은 `floor(baseline × 1.05)`이고 actual이 정확히 limit이면 통과, limit+1이면 실패합니다. Baseline update는 normal check와 분리됩니다.
- Container asset set은 hard-coded list가 아니라 all content JSON의 `content|template/` strings를 재귀 수집하며 failure 여부와 무관하게 cleanup합니다.

## 8. Ownership / state / responsibility 변화

| Concern | Thread 초기 owner/state | Thread 최종 owner/state | 실제 symbol과 호출 경로 |
| --- | --- | --- | --- |
| General quality gate | Developer local execution | CI workflow | `.github/workflows/ci.yml`: pinned environment, install/check order와 release status. |
| Runtime package boundary | Implicit Next build output | Standalone output + verifier | `next.config.ts` output + build verifier script: traced runtime convention과 required path existence. |
| Client cost measurement | Source size/estimate | Emitted manifests와 asset bytes | `scripts/route-budgets.mjs`: Next manifests/assets → route JS/CSS byte measurement. |
| Growth policy | Check가 current value를 수용할 위험 | Committed baseline + separate baseline/check | committed baseline + evaluator/check command: reviewable route set와 5% growth policy. |
| Lab performance | One-off manual audit | Repeatable Lighthouse matrix | Lighthouse config/CI: production server lifecycle, URL matrix, browser path, 3-run median thresholds. |
| Deployable image | Artifact copy assumption | Multi-stage Dockerfile + HTTP contract test | `Dockerfile` → container contract script: minimal image assembly → non-root process/readiness/routes/assets/MIME → cleanup. |

## 9. Thread 최종 상태

### Source에서 확정된 최종 상태

Source-level green 상태를 넘어 실제 Next.js production output, route별 client asset, Lighthouse 결과, standalone package, non-root container와 public asset serving을 fail-closed release contract로 만드는 과정을 복원합니다.

### 학습자가 완성할 최종 설명

- **Thread 시작 시점의 설계와 위험:** 초기 CI는 reproducible source/build/E2E checks를 제공했지만 emitted standalone tree, route cost와 final image behavior까지는 확인하지 않았습니다.
- **핵심 architecture/decision이 형성된 순서:** standalone output/verification, route measurement/baseline, production Lighthouse, CI promotion, multi-stage image, real container HTTP test 순서로 release boundary가 확장됐습니다.
- **실제 failure 또는 부족함이 드러난 지점:** build success가 deployable entry/static path를 뜻하지 않고 source size가 emitted route cost를 뜻하지 않으며 Dockerfile 선언이 실제 serving을 뜻하지 않는 각각의 공백이 드러났습니다.
- **Fix 또는 boundary 강화가 바꾼 invariant:** 각 공백을 artifact existence, manifest byte accounting, committed policy, repeated audit, actual process/HTTP assertion으로 별도 강화했습니다.
- **Test/build/browser evidence가 보장한 범위:** 스크립트와 workflow의 exact commands, predicates, thresholds, cleanup을 정적으로 확인했습니다. Node/Chromium/Docker command는 환경 제한 때문에 실행하지 않았습니다.
- **Thread 종료 시점에도 보장하지 않는 범위:** field performance, orchestration/TLS/proxy, production load, 모든 route와 compressed/runtime execution cost는 최종 contract 범위 밖입니다.

## 10. 최종 architecture 또는 execution flow 정리

아래 source-backed flow의 각 단계에 실제 file path, symbol, input/output, failure branch를 추가합니다.

1. Pinned Node/npm 환경에서 reproducible dependency install을 수행합니다.
   - 실제 코드 위치: `.github/workflows/ci.yml`, `.nvmrc`, `package.json`
   - 입력과 출력: pinned Node/npm과 lockfile에서 `npm ci`로 dependency tree를 재현합니다.
   - 실패/absence 처리: install/version mismatch는 첫 단계에서 job을 실패시킵니다.
2. Lint, type, content/readiness, production build를 실행합니다.
   - 실제 코드 위치: CI/package scripts
   - 입력과 출력: lint, typecheck, content check/readiness, production build/E2E를 ordered shell steps로 실행합니다.
   - 실패/absence 처리: 어느 command든 non-zero면 뒤 gate로 진행하지 않습니다.
3. Build output에서 standalone server entry와 static directory를 확인합니다.
   - 실제 코드 위치: standalone verifier script
   - 입력과 출력: `.next/standalone/server.js`와 `.next/static` existence를 검사합니다.
   - 실패/absence 처리: missing paths를 목록으로 throw합니다. Path type/runtime serving은 후속 test가 담당합니다.
4. Manifest를 읽어 route별 emitted JS와 non-inlined CSS byte를 계산합니다.
   - 실제 코드 위치: `scripts/route-budgets.mjs` measurement
   - 입력과 출력: manifests에서 public route와 shared/route assets를 수집하고 deduplicated JS/CSS filesystem bytes를 계산합니다.
   - 실패/absence 처리: missing/malformed manifest 또는 asset read failure는 command failure가 됩니다.
5. Committed baseline과 5% policy로 route coverage와 growth를 평가합니다.
   - 실제 코드 위치: route baseline evaluator/check
   - 입력과 출력: measured routes를 committed JS/CSS baselines와 floor 5% limits로 비교합니다.
   - 실패/absence 처리: missing expected route, new route, actual > allowed가 structured violation/non-zero status가 됩니다.
6. Production server에서 five-design home/detail Lighthouse matrix를 실행합니다.
   - 실제 코드 위치: Lighthouse CI config
   - 입력과 출력: production server에서 five-design home/detail URLs를 3회 audit하고 median categories/metrics를 threshold와 비교합니다.
   - 실패/absence 처리: server/browser/readiness 또는 threshold failure가 audit failure로 전파됩니다.
7. Verified standalone/static/public을 non-root image로 조립합니다.
   - 실제 코드 위치: `Dockerfile`
   - 입력과 출력: verified standalone, static, public을 `node` owner의 runtime image로 복사하고 port 3100 server를 정의합니다.
   - 실패/absence 처리: builder build/verify 실패면 runner image가 완성되지 않습니다.
8. Container를 기동하고 user, routes, content-derived assets, MIME, cleanup을 검증합니다.
   - 실제 코드 위치: container contract script
   - 입력과 출력: unique image/container를 시작하고 inspect user, readiness, routes, JSON-derived assets/body/MIME를 확인합니다.
   - 실패/absence 처리: 실패 로그를 수집하고 성공/실패 모두 `finally`에서 container와 image를 정리합니다.

### 코드 없이 설명하기

> 이 Thread의 최종 실행 흐름을 code snippet 없이 자신의 말로 작성합니다. 설계 → 구현 → failure/risk → 수정/강화 → 검증 순서가 드러나야 합니다.

basic CI로 pinned install과 production E2E를 재현한 뒤 Next standalone output을 만들고 required entry/static path를 검사했습니다. Compiler manifests와 actual files에서 route별 JS와 non-inlined CSS를 계산하고 committed baseline의 5% limit으로 fail-closed policy를 만들었습니다. Production server의 five-design home/detail을 Lighthouse로 세 번씩 측정해 median thresholds를 적용하고 이 gates를 CI에 올렸습니다. 마지막에는 verified standalone/static/public만 non-root image로 조립하고 real container에서 user, HTML routes, content-derived assets와 MIME를 검사한 뒤 항상 정리합니다.

> **실행 증거 구분:** 참조 SHA의 diff와 해당 SHA 파일은 GitHub connector로 확인했습니다. 로컬 clone은 실행 환경의 DNS 차단으로 실패해 build, unit/E2E, browser, Lighthouse, Docker command는 실행하지 않았습니다. 따라서 위 test 결과는 구현된 test technique과 assertion의 정적 검토이며 실제 통과 결과가 아닙니다.

## 11. 학습 완료 자가 점검

- [x] Commit map의 모든 SHA를 실제로 checkout하거나 diff로 확인했습니다.
- [x] Thread 내 commit 순서를 source와 동일하게 유지했습니다.
- [x] 각 A/S commit에서 직전 상태, decision, failure boundary, guarantee와 non-guarantee를 구분했습니다.
- [x] B commit은 thread 흐름에서 필요한 구현 역할과 state change를 확인했습니다.
- [x] Fix commit을 독립 feature가 아니라 기존 가정 → failure → root cause → corrected invariant로 설명했습니다.
- [x] Test commit에서 production invariant, failure injection, technique, traversed production path, proves/does-not-prove를 구분했습니다.
- [x] Invariant ledger의 모든 주장에 해당 SHA의 code/test evidence가 있습니다.
- [x] Final HEAD의 code를 과거 commit 설명에 소급하지 않았습니다.
- [x] Thread 최종 흐름을 code 없이 설명할 수 있습니다.
