# Production build와 package artifact

- 카테고리: `09-production-delivery-and-release-engineering` — 제품 전달과 릴리스 엔지니어링
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

TypeScript source를 직접 import하거나 실행하던 workspace를 shared/db/API/Web별 명시적인 production artifact로 전환하고, runtime에 필요한 JavaScript, declaration, migration, Next.js standalone output이 실제 build 결과에 포함되는지 검증하는 과정을 복원합니다.

이 문서는 완성된 해설이 아니라 exact SHA를 순서대로 확인해 제품 전달 구조의 발전을 복원하기 위한 scaffold입니다.

### 직접 연결되는 불변식

- production runtime은 workspace의 TypeScript source tree를 실행 계약으로 삼지 않습니다.
- `@pong-pong/shared`와 `@pong-pong/db`는 compiled JavaScript와 type declaration을 production export로 제공합니다.
- DB artifact에는 production migration 실행에 필요한 migration set이 함께 포함됩니다.
- API start는 compiled `dist/index.js`를 실행하고 Web은 Next.js standalone artifact를 생성합니다.
- root build는 shared → db → api → web의 dependency 순서를 보존합니다.
- CI는 compile 성공만 보지 않고 실제 runtime artifact의 존재와 형태를 별도 contract로 검증합니다.

## 2. 핵심 질문

- development export와 production `types`/`import`/`default` export는 package 소비 경로를 어떻게 분리합니까?
- NodeNext ESM build에서 상대 import에 `.js` 확장자를 붙이는 이유가 emitted artifact에서 어떻게 드러납니까?
- DB migration directory를 `dist/`에 포함하고 `migrate:prod`를 추가한 이유는 무엇입니까?
- Next.js `output: standalone`, tracing root, shared runtime alias가 monorepo production artifact에 어떤 영향을 줍니까?
- `verify:build`가 일반 `build` 성공과 별도로 무엇을 증명합니까?

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
| 1 | `37c735de0c37` | `build(shared): production package artifact 구성` | B | PROTOCOL | shared package를 compiled production dependency로 구성합니다. |
| 2 | `430389943b34` | `build(db): production package artifact 구성` | B | PERSISTENCE | DB package에 compiled artifact, migration copy, production migration CLI를 구성합니다. |
| 3 | `bb67a72882bf` | `build(app): API와 Web production artifact 구성` | A | PERSISTENCE, WEB, OPERATIONS | API를 compiled `dist` 실행으로, Web을 standalone output으로 전환하고 root build dependency 순서를 고정합니다. |
| 4 | `6ab091ffa815` | `test(build): production artifact 생성 검증` | B | PERSISTENCE, WEB, OPERATIONS | production runtime에 필요한 build output을 post-build contract로 검증합니다. |
| 5 | `09b305b49768` | `ci(build): production artifact 검증 실행` | B | PERSISTENCE, WEB, OPERATIONS | CI가 workspace build 직후 artifact verifier를 실행하도록 연결합니다. |

## 5. Commit별 학습 기록

### 5.1. `build(shared): production package artifact 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `37c735de0c37` |
| Importance | B |
| Tags | PROTOCOL |
| Source에서 확정된 역할 | shared package를 compiled production dependency로 구성합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/shared/package.json`의 `main`, `types`, conditional `exports`에서 `development` source와 production `dist` consumer를 구분합니다.
- `packages/shared/tsconfig.build.json`의 declaration/source map/output 설정과 test exclusion을 확인합니다.
- `packages/shared/src/index.ts`와 내부 상대 import에 `.js` 확장자가 추가되어 NodeNext emitted ESM이 실제 파일을 해석할 수 있는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | shared package는 workspace TypeScript source를 직접 가리키는 개발 중심 경계였습니다. runtime JavaScript와 consumer용 declaration을 독립 artifact로 배포하는 계약이 없었습니다. |
| 해결하려던 문제 | API·DB·Web production build가 shared source tree와 TypeScript loader에 암묵적으로 의존하면 package 단위 artifact를 image나 Node process가 안정적으로 소비할 수 없습니다. |
| 핵심 결정 | `package.json`의 production entry를 `dist/index.js`와 `dist/index.d.ts`로 지정하고, conditional export의 `development`만 source를 가리키게 했습니다. build용 tsconfig가 JS·d.ts·map을 `dist`에 emit하며 tests는 제외합니다. |
| build → package → execute 흐름 | `pnpm --filter @pong-pong/shared build` → TypeScript compiler가 `src`를 `dist`로 emit → production resolver는 package export의 `import/default`와 `types`를 소비합니다. 개발 조건에서는 source export를 선택할 수 있습니다. |
| ownership/lifetime/cleanup | shared package build가 `dist`를 생성하고 downstream package가 이를 읽습니다. artifact lifetime은 build workspace 또는 이후 image layer까지이며 source와 독립적으로 교체할 수 있습니다. |
| failure/rollback/fail-closed | compiler error면 artifact가 생성되지 않습니다. NodeNext ESM 상대 import가 `.js`를 가리키지 않으면 emitted JS가 런타임에 module을 찾지 못할 수 있어 source import를 수정했습니다. |
| 보장하는 것 | shared protocol/types가 production JavaScript와 declaration으로 제공되고 test source는 artifact에서 제외됩니다. |
| 보장하지 않는 것 | artifact 존재를 post-build로 검사하거나 downstream API/Web가 올바른 순서로 build한다는 보장은 아직 없습니다. |
| 후속 연결 | `430389943b34`가 같은 경계를 DB package와 migration artifact에 적용합니다. |

비교 기준:
- 이 commit의 parent와 비교합니다.
- 다음 관련 SHA: `430389943b34` — `build(db): production package artifact 구성`

### 5.2. `build(db): production package artifact 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `430389943b34` |
| Importance | B |
| Tags | PERSISTENCE |
| Source에서 확정된 역할 | DB package에 compiled artifact, migration copy, production migration CLI를 구성합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/package.json`의 production exports, `build` script, `migrate:prod: node dist/cli.js migrate`를 확인합니다.
- build가 TypeScript emit 뒤 `migrations` directory를 `dist/migrations`로 복사하는 실제 command를 확인합니다.
- `packages/db/src/migrator.ts`의 `new URL('../migrations', import.meta.url)`가 compiled `dist` 기준으로 어떤 directory를 요구하는지 추적합니다.
- DB source 상대 import의 `.js` 확장자와 `tsconfig.build.json`의 declaration/output 범위를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | DB package도 source export와 source migration 경로에 의존했습니다. compiled CLI가 존재하더라도 runtime에서 읽을 SQL migration set이 같은 artifact에 포함된다는 보장이 없었습니다. |
| 해결하려던 문제 | production runner가 source tree를 복사하지 않으면 `import.meta.url` 기준 migration directory를 찾지 못합니다. DB API와 migration CLI를 독립 artifact로 실행할 수 있어야 했습니다. |
| 핵심 결정 | DB package를 `dist` export로 전환하고, build 후 SQL directory를 `dist/migrations`에 복사했습니다. `migrate:prod`는 `node dist/cli.js migrate`를 실행합니다. |
| build → package → execute 흐름 | shared build → DB TypeScript emit → migration SQL copy → production process가 `dist/cli.js migrate` → `migrator.ts`가 자신의 emitted 위치에서 `../migrations`를 URL로 해석해 SQL을 순서대로 소비합니다. |
| ownership/lifetime/cleanup | DB package build가 JavaScript·declaration·SQL set을 함께 소유합니다. migration process는 DB connection과 SQL 실행 lifetime을 소유하고 종료 후 process resource를 반환해야 합니다. |
| failure/rollback/fail-closed | SQL copy가 누락되면 compiled migrator가 directory를 찾지 못해 startup/migration이 실패합니다. 이 commit은 migration을 API startup과 자동 연결하거나 transaction rollback 정책을 새로 정의하지 않습니다. |
| 보장하는 것 | production artifact만 복사한 환경에서도 DB package API와 migration CLI에 필요한 파일 구조가 존재하도록 설계됩니다. |
| 보장하지 않는 것 | 모든 migration 파일의 존재를 자동 검사하거나 PostgreSQL 연결·migration 성공을 실행 검증하지 않습니다. |
| 후속 연결 | `bb67a72882bf`가 API/Web artifact와 root dependency build 순서를 추가하고, `6ab091ffa815`가 migration 포함 artifact 존재를 검사합니다. |

비교 기준:
- 직전 관련 SHA: `37c735de0c37` — `build(shared): production package artifact 구성`
- 다음 관련 SHA: `bb67a72882bf` — `build(app): API와 Web production artifact 구성`

### 5.3. `build(app): API와 Web production artifact 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `bb67a72882bf` |
| Importance | A |
| Tags | PERSISTENCE, WEB, OPERATIONS |
| Source에서 확정된 역할 | API를 compiled `dist` 실행으로, Web을 standalone output으로 전환하고 root build dependency 순서를 고정합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/package.json`의 `build`, `start: node dist/index.js`와 `apps/api/tsconfig.build.json`이 API source/test를 어떻게 분리하는지 확인합니다.
- API 내부 상대 import 전반의 `.js` suffix가 emitted NodeNext ESM dependency graph를 완성하는지 확인합니다.
- `apps/web/next.config.mjs`의 `output: 'standalone'`, tracing root, shared runtime alias, `transpilePackages`가 monorepo file tracing에 미치는 영향을 확인합니다.
- Web `predev`/`prebuild`/`pretypecheck`/`pretest`가 shared build를 선행하고, root `build`가 shared → db → api → web 순서를 고정하는지 확인합니다.
- 이 SHA에서 root `verify:build` entrypoint는 추가되지만 `tests/build-artifacts.mjs`는 아직 없다는 incomplete handoff를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | shared와 DB만 compiled package 경계를 갖고 API는 source 실행에 의존했습니다. Web도 monorepo dependency를 포함한 독립 standalone server artifact를 명시적으로 만들지 않았습니다. root build 순서도 delivery dependency를 한 곳에서 고정하지 않았습니다. |
| 해결하려던 문제 | API runner가 TypeScript loader/source를 요구하고, Next file tracing이 workspace shared runtime을 놓치면 image에서 server가 시작되지 않습니다. downstream package가 upstream artifact보다 먼저 build되면 alias와 type/runtime entry가 불완전해질 수 있습니다. |
| 핵심 결정 | API build/start를 `dist` 기반으로 전환하고 build tsconfig와 ESM `.js` import를 정리했습니다. Web은 standalone output, monorepo tracing root, shared `dist` alias를 사용합니다. root build가 shared→db→api→web을 직렬화합니다. |
| build → package → execute 흐름 | root `pnpm build` → shared `dist` → DB `dist`+migrations → API `dist/index.js` → Next build가 shared runtime을 trace해 `.next/standalone` server와 static output 생성 → API는 `node apps/api/dist/index.js`, Web은 standalone server consumer가 실행합니다. |
| ownership/lifetime/cleanup | 각 workspace가 자신의 artifact를 생성하지만 root script가 dependency ordering을 소유합니다. API artifact lifetime은 `dist`, Web server artifact는 `.next/standalone`; build workspace나 image builder가 정리 책임을 가집니다. |
| failure/rollback/fail-closed | upstream build 실패는 shell chain을 중단해 downstream artifact 생성을 막습니다. standalone tracing/alias가 잘못되면 build 성공 후 runtime module 누락이 생길 수 있습니다. `verify:build` script 이름은 생겼지만 verifier 파일이 아직 없어 호출 시 실패합니다. |
| 보장하는 것 | source loader 없이 실행할 API entry와 monorepo-aware standalone Web artifact, 그리고 재현 가능한 workspace build 순서가 코드로 고정됩니다. |
| 보장하지 않는 것 | 생성된 파일이 실제로 모두 존재하는지, standalone server가 기동하는지, migration이 적용되는지, static/public asset이 완전한지는 이 commit만으로 증명하지 않습니다. |
| 후속 연결 | `6ab091ffa815`가 누락된 verifier 구현을 추가하고 12개 핵심 artifact 존재를 검사합니다. `09b305b49768`이 이를 CI build 뒤에 연결합니다. |

비교 기준:
- 직전 관련 SHA: `430389943b34` — `build(db): production package artifact 구성`
- 다음 관련 SHA: `6ab091ffa815` — `test(build): production artifact 생성 검증`

### 5.4. `test(build): production artifact 생성 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `6ab091ffa815` |
| Importance | B |
| Tags | PERSISTENCE, WEB, OPERATIONS |
| Source에서 확정된 역할 | production runtime에 필요한 build output을 post-build contract로 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 새 `tests/build-artifacts.mjs`의 artifact path list를 확인해 shared JS/d.ts, DB JS/d.ts/CLI/migrator/migrations, API entry/modules, Web standalone server를 정확히 나열합니다.
- missing path를 수집해 한 번에 throw하는 failure 방식과 성공 시 verified count를 출력하는 방식을 확인합니다.
- 검사가 file existence만 확인하며 artifact 내용, executable startup, 모든 migration, `.next/static` 또는 public asset은 검사하지 않는 범위를 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | `bb67a72882bf`는 production artifact를 만들도록 구성하고 `verify:build` script까지 선언했지만 실제 verifier module이 없었습니다. build exit 0만으로 runtime 필수 파일의 누락을 구분할 수 없었습니다. |
| 해결하려던 문제 | compiler/Next build가 성공해도 copy script, migration directory, standalone tracing 결과가 기대 경로에 없으면 image assembly 또는 startup 단계에서 늦게 실패합니다. |
| 핵심 결정 | Node script가 12개 핵심 path의 존재를 검사하고 누락 목록이 있으면 exception으로 non-zero 종료하도록 했습니다. |
| build → package → execute 흐름 | production build 완료 → `node tests/build-artifacts.mjs` → repository root 기준 path별 `stat/access` 검사 → 누락 목록이면 throw → 모두 있으면 verified count log. |
| ownership/lifetime/cleanup | verifier는 artifact를 생성·수정하지 않고 관찰만 합니다. build command가 producer, script가 contract consumer이며 CI나 개발 shell이 process exit를 소유합니다. |
| failure/rollback/fail-closed | 한 파일이라도 없으면 누락 경로를 포함해 실패하므로 delivery pipeline을 차단합니다. cleanup이나 rebuild는 하지 않습니다. |
| 보장하는 것 | 선택된 shared/DB/API/Web production artifact와 일부 migration SQL이 expected path에 존재함을 결정적으로 확인합니다. |
| 보장하지 않는 것 | 파일이 유효한 JS/SQL인지, 모든 migration이 포함됐는지, process가 시작되는지, standalone static/public asset이 완전한지는 증명하지 않습니다. |
| 후속 연결 | `09b305b49768`이 CI의 build 직후 이 verifier를 실행해 회귀 차단 경계를 repository workflow로 올립니다. |

비교 기준:
- 직전 관련 SHA: `bb67a72882bf` — `build(app): API와 Web production artifact 구성`
- 다음 관련 SHA: `09b305b49768` — `ci(build): production artifact 검증 실행`

### 5.5. `ci(build): production artifact 검증 실행`

| 항목 | 값 |
| --- | --- |
| SHA | `09b305b49768` |
| Importance | B |
| Tags | PERSISTENCE, WEB, OPERATIONS |
| Source에서 확정된 역할 | CI가 workspace build 직후 artifact verifier를 실행하도록 연결합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `.github/workflows/ci.yml`의 build step 직후 `pnpm verify:build` step이 배치되는지 확인합니다.
- 동일 checkout/install/build workspace의 artifact를 verifier가 소비하므로 job filesystem lifetime과 step failure propagation을 확인합니다.
- workflow가 verifier의 정적 존재 검사만 추가하며 process startup, Docker image build, PostgreSQL migration은 아직 수행하지 않는 점을 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | artifact verifier는 로컬 command로만 존재해 호출하지 않으면 build 성공 상태가 그대로 통과했습니다. |
| 해결하려던 문제 | 중요 artifact의 copy/export/tracing 경로가 깨져도 CI가 단순 build exit 0만 보고 release candidate를 허용할 수 있었습니다. |
| 핵심 결정 | repository CI build 직후 `pnpm verify:build`를 같은 job에 추가했습니다. |
| build → package → execute 흐름 | checkout → pinned install → typecheck/unit → root build → 같은 workspace에서 verifier → missing artifact면 step과 job 실패. |
| ownership/lifetime/cleanup | CI runner filesystem이 build output과 verifier evidence를 job lifetime 동안 소유합니다. workflow가 invocation order와 실패 전파를 소유합니다. |
| failure/rollback/fail-closed | build 실패 또는 verifier failure가 이후 성공 상태를 차단합니다. 별도 artifact upload나 cleanup 정책은 없고 hosted runner 종료로 workspace가 폐기됩니다. |
| 보장하는 것 | push/PR CI에서 production build와 선택된 artifact existence contract가 함께 통과해야 합니다. |
| 보장하지 않는 것 | artifact runtime 실행, Docker packaging, 실제 DB migration, browser delivery는 이 job이 증명하지 않습니다. |
| 후속 연결 | Thread 03의 image commits가 이 artifact를 runner layer로 복사하고, Thread 04의 process/browser job이 실제 production process를 기동합니다. |

비교 기준:
- 직전 관련 SHA: `6ab091ffa815` — `test(build): production artifact 생성 검증`

## 6. Invariant evolution ledger

| 시점 | 불변식 | 상태 | 실제 근거 |
| --- | --- | --- | --- |
| `37c735de0c37` | shared package를 compiled production dependency로 구성합니다. | 도입 | `packages/shared/package.json` production exports와 `tsconfig.build.json`이 source와 compiled consumer를 분리합니다. |
| `430389943b34` | DB package에 compiled artifact, migration copy, production migration CLI를 구성합니다. | 확장 | `packages/db/package.json`, `tsconfig.build.json`, `migrator.ts`가 compiled code와 SQL migration을 하나의 production package로 결합합니다. |
| `bb67a72882bf` | API를 compiled `dist` 실행으로, Web을 standalone output으로 전환하고 root build dependency 순서를 고정합니다. | 도입·불충분 | API `dist`, Web standalone, root build 순서는 도입됐지만 새 `verify:build` command의 target file은 이 SHA에 아직 없습니다. |
| `6ab091ffa815` | production runtime에 필요한 build output을 post-build contract로 검증합니다. | 검증 | `tests/build-artifacts.mjs`가 production consumer가 요구하는 선택된 path의 존재를 post-build contract로 검사합니다. |
| `09b305b49768` | CI가 workspace build 직후 artifact verifier를 실행하도록 연결합니다. | 통합 검증 | `.github/workflows/ci.yml`이 root build의 결과를 `pnpm verify:build`로 소비해 artifact contract 실패를 CI 상태에 반영합니다. |

## 7. Failure → Fix → Test 연결

| 이전 가정 또는 failure | Fix | Regression/contract evidence | 학습자 설명 |
| --- | --- | --- | --- |
| production package가 source export와 loader에 의존함 | `37c735de0c37`, `430389943b34`, `bb67a72882bf` | `6ab091ffa815` | workspace별 `dist`와 migration/standalone artifact를 만든 뒤 selected path를 정적으로 검사합니다. |
| `verify:build` command만 선언되고 verifier file이 없음 | `6ab091ffa815` | `09b305b49768` | 구현을 추가하고 CI build 직후 실행해 호출 누락도 막습니다. |
| build exit 0이면 runtime artifact가 완전하다고 가정함 | `6ab091ffa815` | 후속 Thread 04 process/browser job | existence 검사는 늦은 path 누락을 막지만 runtime validity는 별도 process 검증이 필요합니다. |

## 8. Artifact·process·resource ownership

| 대상 | 생성/빌드 주체 | 소비/실행 주체 | lifetime | 실패 시 정리/차단 |
| --- | --- | --- | --- | --- |
| shared package artifact | `@pong-pong/shared` build | DB/API/Web production resolver | `packages/shared/dist` 또는 image layer | compiler failure 시 downstream build 차단 |
| DB code + migrations | `@pong-pong/db` build와 SQL copy | production migration CLI/API | `packages/db/dist` 또는 image layer | copy 누락은 verifier 또는 runtime migrator 실패 |
| API/Web artifacts | API tsc와 Next build | Node API process와 standalone Web server | `dist`/`.next`에서 image copy까지 | root shell 순서가 upstream failure에서 중단 |
| CI verification evidence | `tests/build-artifacts.mjs` exit status | GitHub Actions build job | 단일 job lifetime | 누락 시 job failure; artifact 업로드는 없음 |

## 9. Thread 최종 상태

- 최종 delivery owner: root `build` script가 workspace producer 순서를, 각 package가 자신의 artifact를, `verify:build`와 CI가 selected output contract를 소유합니다.
- source와 production artifact의 관계: development conditional export는 source를 유지하지만 production export/start는 `dist`와 `.next/standalone`을 소비합니다.
- build-time과 runtime configuration의 관계: Next standalone과 public configuration은 build 단계에서 만들어지고 API/DB는 compiled JS를 runtime에 소비합니다. 이 Thread는 runtime secret 주입을 다루지 않습니다.
- startup/readiness/shutdown contract: artifact producer/consumer만 정의하며 process readiness와 shutdown은 후속 Threads의 책임입니다.
- fail-closed 조건: root build의 선행 단계 실패와 post-build missing path가 shell/CI를 non-zero로 종료합니다.
- 검증 가능한 것과 외부 배포 환경에 남는 것: exact SHA diff로 export, build script, verifier path와 CI invocation을 확인했습니다. 실제 pnpm build나 artifact verifier를 실행하지 않았으므로 runtime evidence는 기록하지 않습니다.

## 10. 최종 execution/delivery flow

```text
root `pnpm build`
→ `@pong-pong/shared` TypeScript → `packages/shared/dist`
→ `@pong-pong/db` TypeScript + SQL copy → `packages/db/dist`
→ API TypeScript → `apps/api/dist/index.js`
→ Next standalone build → `apps/web/.next/standalone` + `.next/static`
→ `pnpm verify:build`가 12개 핵심 path 검사
→ CI build job이 exit status를 delivery gate로 소비
```

위 흐름을 각 단계의 실제 파일, command, artifact, process와 연결해 다시 작성합니다.

## 11. 교차 카테고리 연결

- `01-runtime-composition-and-reverse-proxy-evolution.md`: source-driven runtime의 이전 상태
- `03-container-images-and-production-runtime-lifecycle.md`: 생성된 artifact를 image runner가 소비하는 후속 단계
- `08-verification-and-test-architecture`: artifact verifier를 테스트 관점에서 해석하는 카테고리

## 12. 학습 완료 체크

- [x] 모든 Commit map SHA를 exact historical state에서 확인했습니다.
- [x] build와 runtime을 final HEAD에서 과거로 소급하지 않았습니다.
- [x] artifact producer/consumer와 package/image/process owner를 설명할 수 있습니다.
- [x] production config와 secret의 fail-closed 조건을 설명할 수 있습니다.
- [x] CI/test가 실제로 증명하는 delivery 범위와 증명하지 않는 범위를 구분할 수 있습니다.
- [x] fix와 regression evidence를 실제 이전 failure/가정에 연결했습니다.
- [x] 실행하지 않은 Docker/CI 결과를 실행 증거로 기록하지 않았습니다.
