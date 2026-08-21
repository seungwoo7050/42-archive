# Runtime version과 dependency security contract

- 카테고리: `09-production-delivery-and-release-engineering` — 제품 전달과 릴리스 엔지니어링
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

Node/pnpm toolchain을 local metadata, package engine, CI, Docker image와 contract test 사이에서 하나의 release contract로 고정하고, Node·Next.js·WebSocket·production dependency security patch가 manifest와 lock/override graph에 일관되게 반영되는 과정을 복원합니다.

이 문서는 완성된 해설이 아니라 exact SHA를 순서대로 확인해 제품 전달 구조의 발전을 복원하기 위한 scaffold입니다.

### 직접 연결되는 불변식

- local version file, package manager, package engine, CI, Docker image가 같은 exact runtime version contract를 사용합니다.
- runtime version 기대값은 여러 contract test에 literal로 복제하지 않고 canonical `.node-version`에서 읽습니다.
- CI install은 exact pnpm과 frozen lockfile을 사용해 manifest와 resolved graph의 drift를 차단합니다.
- direct dependency security patch는 해당 workspace manifest와 `pnpm-lock.yaml` resolution을 함께 갱신합니다.
- 취약한 transitive dependency는 root `pnpm.overrides`와 lockfile graph에서 최소 patched version으로 강제할 수 있습니다.
- version 변경 commit은 dependency/runtime graph를 바꾸지만 vulnerability scan 통과나 application runtime 성공 자체를 증명하지 않습니다.

## 2. 핵심 질문

- Node/pnpm 범위를 처음 고정한 파일과 이후 exact engine pin이 추가로 필요했던 이유는 무엇입니까?
- `.node-version`을 canonical source로 읽는 contract test가 어떤 duplicated literal drift를 제거합니까?
- Node patch가 local file, engine, CI, API/Web/load image에 어떤 순서로 반영됩니까?
- Next.js와 `@next/swc` platform package, API `ws`, Fastify/PostCSS direct requirement가 lockfile에서 어떻게 함께 이동합니까?
- root `pnpm.overrides`는 `fast-uri`, `nanoid`, `postcss`, `sharp`의 transitive resolution을 어떻게 강제합니까?
- manifest/lock consistency와 실제 취약점 부재·runtime compatibility 사이에는 어떤 증거 차이가 있습니까?

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
| 1 | `ee4bebc84f95` | `build(runtime): 지원 Node.js·pnpm 범위 고정` | B | OPERATIONS | local version manager, package metadata, container runtime을 Node/pnpm 기준에 맞춥니다. |
| 2 | `9693b2a9ad3d` | `build(runtime): Node.js engine version을 정확히 고정` | B | PERSISTENCE, OPERATIONS | package engine을 repository가 실제 사용하는 exact Node version으로 좁힙니다. |
| 3 | `48c2188eb42a` | `test(runtime): Node 버전 계약을 기준 파일에서 읽음` | B | OPERATIONS, TEST | CI/Docker contract test가 중복 literal 대신 canonical version file을 사용하도록 합니다. |
| 4 | `3a8cd06a1098` | `build(runtime): Node.js 보안 패치 적용` | C | - | 고정된 Node patch를 version file, engine, CI, API/Web/load image에 함께 적용합니다. |
| 5 | `69e22da94cb4` | `build(web): Next.js 보안 패치 적용` | C | - | Next.js direct requirement와 resolved compiler package를 patched version으로 갱신합니다. |
| 6 | `0066e48ea3c9` | `build(api): WebSocket 보안 패치 적용` | C | - | API `ws` dependency와 workspace resolution을 patched version으로 갱신합니다. |
| 7 | `4c4f7df2242a` | `build(security): 프로덕션 의존성 취약점 패치` | B | WEB, OPERATIONS | Fastify/Next.js/PostCSS와 취약한 transitive dependency override를 production graph에 반영합니다. |

## 5. Commit별 학습 기록

### 5.1. `build(runtime): 지원 Node.js·pnpm 범위 고정`

| 항목 | 값 |
| --- | --- |
| SHA | `ee4bebc84f95` |
| Importance | B |
| Tags | OPERATIONS |
| Source에서 확정된 역할 | local version manager, package metadata, container runtime을 Node/pnpm 기준에 맞춥니다. |

#### 해당 SHA에서 확인할 실제 코드

- 새 `.node-version`과 `.nvmrc`가 `24.18.0`을 동일하게 기록하는지 확인합니다.
- root `package.json`의 `engines.node: >=24 <25`와 `packageManager: pnpm@10.32.1`이 local version file보다 넓거나 정확한 범위를 어떻게 표현하는지 확인합니다.
- `.github/workflows/ci.yml`의 각 setup step이 Node `24.18.0`, pnpm `10.32.1`을 사용하는지 확인합니다.
- 이 SHA에서 Dockerfiles가 아직 version contract consumer인지 실제 diff로 구분하고, 존재하지 않는 consumer를 소급해 설명하지 않습니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 개발자 local runtime, package manager metadata와 CI setup이 하나의 repository-level version source로 명시되지 않았습니다. |
| 해결하려던 문제 | Node major/minor 또는 pnpm resolver가 달라지면 install graph, ESM/Next build, native package 결과가 달라질 수 있고 CI와 local reproduction이 분리됩니다. |
| 핵심 결정 | `.node-version`/`.nvmrc`에 Node 24.18.0을 추가하고 package engine을 Node 24 범위로, package manager를 pnpm 10.32.1로 명시하며 CI setup 값을 맞췄습니다. |
| build → package → execute 흐름 | version manager가 canonical file 선택 → Corepack/package metadata가 pnpm version 안내 → CI가 exact Node/pnpm setup → frozen lockfile install → verification/build. |
| ownership/lifetime/cleanup | repository version files가 local selection을, root package metadata가 compatibility/pnpm contract를, workflow가 CI runtime을 소유합니다. |
| failure/rollback/fail-closed | unsupported engine은 package manager 경고/차단 정책에 따라 드러나고 CI는 exact setup 실패 시 job을 차단합니다. `>=24 <25`는 patch drift를 허용합니다. |
| 보장하는 것 | local tooling과 CI가 같은 Node patch/pnpm을 선택할 수 있는 명시적 기준이 생깁니다. |
| 보장하지 않는 것 | package engine은 아직 exact patch가 아니며 모든 Docker/load consumer가 자동으로 이 파일을 읽는 것도 아닙니다. runtime compatibility test도 추가하지 않습니다. |
| 후속 연결 | `9693b2a9ad3d`가 package engine을 exact patch로 좁히고 `48c2188eb42a`가 CI/Docker contract tests의 expected version을 canonical file에서 읽게 합니다. |

비교 기준:
- 이 commit의 parent와 비교합니다.
- 다음 관련 SHA: `9693b2a9ad3d` — `build(runtime): Node.js engine version을 정확히 고정`

### 5.2. `build(runtime): Node.js engine version을 정확히 고정`

| 항목 | 값 |
| --- | --- |
| SHA | `9693b2a9ad3d` |
| Importance | B |
| Tags | PERSISTENCE, OPERATIONS |
| Source에서 확정된 역할 | package engine을 repository가 실제 사용하는 exact Node version으로 좁힙니다. |

#### 해당 SHA에서 확인할 실제 코드

- root `package.json`의 `engines.node`가 `>=24 <25`에서 exact `24.18.0`으로 바뀌는 단일 diff를 확인합니다.
- `.node-version`, `.nvmrc`, CI value는 이미 24.18.0이므로 package consumer validation만 뒤늦게 exact contract에 합류하는지 확인합니다.
- 이 commit은 Dockerfile, Compose, persistence code를 변경하지 않으므로 container lifecycle Thread에 중복 배치하지 않습니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | local/CI는 24.18.0을 사용했지만 package engine은 모든 Node 24 patch를 허용했습니다. |
| 해결하려던 문제 | 설치 환경이 24.x의 다른 patch를 선택해도 engine check를 통과하므로 repository가 검증한 runtime과 실제 consumer runtime이 달라질 수 있었습니다. |
| 핵심 결정 | root `engines.node`를 exact `24.18.0`으로 좁혔습니다. |
| build → package → execute 흐름 | package manager가 root metadata read → Node version exact comparison → mismatch 시 configured enforcement/warning → matching runtime에서 frozen install/build. |
| ownership/lifetime/cleanup | root package metadata가 workspace-wide compatibility gate를 소유합니다. 실제 runtime installation은 developer/CI/image builder가 소유합니다. |
| failure/rollback/fail-closed | 다른 patch는 engine mismatch가 됩니다. 다만 engine-strict 설정이 없으면 일부 package manager는 경고만 할 수 있습니다. |
| 보장하는 것 | repository가 지원 대상으로 선언한 Node version이 local/CI exact patch와 일치합니다. |
| 보장하지 않는 것 | Node binary integrity, automatic installation, Docker base alignment, security 상태를 단독으로 보장하지 않습니다. |
| 후속 연결 | `48c2188eb42a`가 version assertions의 expected value를 `.node-version` 한 곳에서 읽도록 합니다. |

비교 기준:
- 직전 관련 SHA: `ee4bebc84f95` — `build(runtime): 지원 Node.js·pnpm 범위 고정`
- 다음 관련 SHA: `48c2188eb42a` — `test(runtime): Node 버전 계약을 기준 파일에서 읽음`

### 5.3. `test(runtime): Node 버전 계약을 기준 파일에서 읽음`

| 항목 | 값 |
| --- | --- |
| SHA | `48c2188eb42a` |
| Importance | B |
| Tags | OPERATIONS, TEST |
| Source에서 확정된 역할 | CI/Docker contract test가 중복 literal 대신 canonical version file을 사용하도록 합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `tests/ci-contract.test.mjs`와 `tests/docker-production.test.mjs`가 hardcoded Node literal을 제거하고 `.node-version`을 read/trim하는지 확인합니다.
- workflow setup, package engine, API/Web Dockerfile base assertions이 같은 `expectedNodeVersion`을 소비하는지 확인합니다.
- canonical file만 변경하고 consumer files가 갱신되지 않은 경우 test가 어떤 mismatch를 보고하는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | Node expected value가 CI contract와 Docker contract test에 각각 literal로 복제돼 version patch 때 test 자체도 수동 수정해야 했습니다. |
| 해결하려던 문제 | 여러 expected literal이 서로 달라지면 실제 consumer drift를 놓치거나, 올바른 version patch가 stale test 때문에 잘못 실패할 수 있었습니다. |
| 핵심 결정 | 두 contract test가 repository `.node-version`을 canonical expected value로 읽고 package/CI/Docker consumer text를 비교하도록 변경했습니다. |
| build → package → execute 흐름 | test startup → `.node-version` read/trim → workflow/package/Dockerfile source read → expected version assertion → mismatch list/exception. |
| ownership/lifetime/cleanup | `.node-version`이 expected version source를, contract tests가 consumer alignment evidence를 소유합니다. |
| failure/rollback/fail-closed | canonical file이 없거나 비어 있거나 consumer 값이 다르면 test가 실패합니다. |
| 보장하는 것 | 테스트 실행 시 Node patch expected value의 duplicated literal drift를 제거하고 여러 delivery consumer의 정렬을 확인합니다. |
| 보장하지 않는 것 | 해당 Node binary가 실제 설치·실행되는지, application이 호환되는지, base image digest가 안전한지는 증명하지 않습니다. |
| 후속 연결 | `3a8cd06a1098`의 24.18.1 security patch가 canonical file과 모든 consumer를 함께 갱신하며 이 contract를 통과하도록 구성됩니다. |

비교 기준:
- 직전 관련 SHA: `9693b2a9ad3d` — `build(runtime): Node.js engine version을 정확히 고정`
- 다음 관련 SHA: `3a8cd06a1098` — `build(runtime): Node.js 보안 패치 적용`

### 5.4. `build(runtime): Node.js 보안 패치 적용`

| 항목 | 값 |
| --- | --- |
| SHA | `3a8cd06a1098` |
| Importance | C |
| Tags | - |
| Source에서 확정된 역할 | 고정된 Node patch를 version file, engine, CI, API/Web/load image에 함께 적용합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `.node-version`, `.nvmrc`, root engine, 모든 CI setup, API/Web Docker stage와 load bootstrap image가 `24.18.0`에서 `24.18.1`로 함께 이동하는지 확인합니다.
- `48c2188eb42a`의 canonical version contract가 이 mechanical patch에서 어떤 stale consumer를 감지할 수 있는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | release contract 전체가 Node 24.18.0에 고정돼 있었습니다. |
| 해결하려던 문제 | security patch를 일부 consumer에만 적용하면 local·CI·image·load 환경이 다시 달라집니다. |
| 핵심 결정 | canonical files, engine, workflow, API/Web/load image 값을 24.18.1로 일괄 갱신했습니다. |
| build → package → execute 흐름 | canonical version patch → local/CI/image/load consumer 갱신 → 이후 contract test가 일치 여부 검사. |
| ownership/lifetime/cleanup | 각 delivery file이 자신의 runtime selector를 소유하며 canonical test가 정렬을 관찰합니다. |
| failure/rollback/fail-closed | 한 consumer가 stale하면 contract test가 실패할 수 있습니다. |
| 보장하는 것 | repository에 기록된 Node selectors가 24.18.1로 일치합니다. |
| 보장하지 않는 것 | Node 보안 advisory 해소 여부나 application runtime 성공을 commit 자체가 실행 증거로 제공하지 않습니다. |
| 후속 연결 | 같은 날 `69e22da94cb4`, `0066e48ea3c9`가 framework/WebSocket dependency graph를 patch합니다. |

비교 기준:
- 직전 관련 SHA: `48c2188eb42a` — `test(runtime): Node 버전 계약을 기준 파일에서 읽음`
- 다음 관련 SHA: `69e22da94cb4` — `build(web): Next.js 보안 패치 적용`

### 5.5. `build(web): Next.js 보안 패치 적용`

| 항목 | 값 |
| --- | --- |
| SHA | `69e22da94cb4` |
| Importance | C |
| Tags | - |
| Source에서 확정된 역할 | Next.js direct requirement와 resolved compiler package를 patched version으로 갱신합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/package.json`의 Next requirement가 `^15.3.2`에서 `^15.5.21`로 바뀌는지 확인합니다.
- `pnpm-lock.yaml`의 resolved Next 15.5.21과 Darwin/Linux/Windows별 `@next/swc-*` package가 동일 patch line으로 갱신되는지 확인합니다.
- source/API contract 변경이 없고 dependency graph만 바뀌는 C급 release maintenance 범위를 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | Web manifest의 direct range와 lockfile은 이전 Next/SWC resolution을 가리켰습니다. |
| 해결하려던 문제 | manifest만 patch하거나 lockfile만 바꾸면 frozen install이 기대한 patched framework/compiler graph를 재현하지 못합니다. |
| 핵심 결정 | Next direct requirement와 lockfile의 Next 및 platform compiler packages를 15.5.21 계열로 갱신했습니다. |
| build → package → execute 흐름 | manifest range 변경 → pnpm resolution refresh → frozen install이 Next와 host platform SWC artifact를 lockfile대로 선택 → existing Next build가 이를 소비합니다. |
| ownership/lifetime/cleanup | Web manifest가 direct intent를, lockfile이 exact cross-platform resolution을 소유합니다. |
| failure/rollback/fail-closed | manifest-lock 불일치면 frozen install이 실패하거나 stale graph가 남습니다. |
| 보장하는 것 | repository dependency graph가 patched Next/SWC versions를 재현합니다. |
| 보장하지 않는 것 | 취약점 scanner 결과, framework compatibility, build/E2E pass는 이 diff만으로 증명하지 않습니다. |
| 후속 연결 | `0066e48ea3c9`가 API WebSocket library를 patch하고 `4c4f7df2242a`가 더 넓은 direct/transitive graph를 갱신합니다. |

비교 기준:
- 직전 관련 SHA: `3a8cd06a1098` — `build(runtime): Node.js 보안 패치 적용`
- 다음 관련 SHA: `0066e48ea3c9` — `build(api): WebSocket 보안 패치 적용`

### 5.6. `build(api): WebSocket 보안 패치 적용`

| 항목 | 값 |
| --- | --- |
| SHA | `0066e48ea3c9` |
| Importance | C |
| Tags | - |
| Source에서 확정된 역할 | API `ws` dependency와 workspace resolution을 patched version으로 갱신합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/package.json`의 `ws` requirement가 patched `^8.21.0`으로 이동하는지 확인합니다.
- `pnpm-lock.yaml`에서 API direct resolution과 `@fastify/websocket`이 공유하는 `ws` resolution이 8.21.0으로 정렬되는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | API direct `ws`와 lockfile의 shared/transitive WebSocket runtime이 이전 8.x patch에 고정돼 있었습니다. |
| 해결하려던 문제 | direct requirement와 Fastify WebSocket consumer가 서로 다른 stale resolution을 쓰면 patched runtime graph를 보장할 수 없습니다. |
| 핵심 결정 | API manifest와 lockfile의 relevant `ws` resolution을 8.21.0으로 갱신했습니다. |
| build → package → execute 흐름 | manifest change → lock resolution → frozen install → Fastify/WebSocket runtime이 patched `ws` package 소비. |
| ownership/lifetime/cleanup | API manifest가 direct requirement를, lockfile이 workspace-wide exact resolution을 소유합니다. |
| failure/rollback/fail-closed | lock mismatch면 frozen install이 실패하거나 예상하지 않은 version이 선택될 수 있습니다. |
| 보장하는 것 | repository가 설치할 WebSocket runtime graph가 patched `ws` version으로 정렬됩니다. |
| 보장하지 않는 것 | WebSocket protocol regression, load behavior, advisory scan 통과는 증명하지 않습니다. |
| 후속 연결 | `4c4f7df2242a`가 Fastify/Next/PostCSS와 transitive overrides를 함께 patch합니다. |

비교 기준:
- 직전 관련 SHA: `69e22da94cb4` — `build(web): Next.js 보안 패치 적용`
- 다음 관련 SHA: `4c4f7df2242a` — `build(security): 프로덕션 의존성 취약점 패치`

### 5.7. `build(security): 프로덕션 의존성 취약점 패치`

| 항목 | 값 |
| --- | --- |
| SHA | `4c4f7df2242a` |
| Importance | B |
| Tags | WEB, OPERATIONS |
| Source에서 확정된 역할 | Fastify/Next.js/PostCSS와 취약한 transitive dependency override를 production graph에 반영합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/package.json` Fastify `^5.11.3`, `apps/web/package.json` Next `^15.5.23`와 PostCSS `^8.5.26` direct patch를 확인합니다.
- root `package.json`의 `pnpm.overrides`가 `fast-uri@<3.1.5`, `nanoid@<3.3.17`, `postcss@<8.5.23`, `sharp@<0.35.0`을 patched minimum으로 강제하는지 확인합니다.
- `pnpm-lock.yaml`의 top-level overrides, importer versions, Fastify/Next/PostCSS 및 platform-specific Sharp/Next compiler graph가 함께 refresh되는지 확인합니다.
- commit에 vulnerability scanner report나 executed build/test evidence가 포함되지 않으므로 resolution graph 변경과 실제 보안/호환성 증거를 구분합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 직접 의존성 Fastify/Next/PostCSS와 여러 transitive package가 이전 resolution에 남아 있었습니다. direct manifest만 올려도 nested package가 vulnerable range를 선택할 수 있었습니다. |
| 해결하려던 문제 | production graph는 workspace direct dependency뿐 아니라 validator/asset/build chain의 transitive dependency로 구성됩니다. lockfile refresh와 override가 없으면 frozen install이 vulnerable nested version을 계속 재현할 수 있습니다. |
| 핵심 결정 | API/Web direct requirements를 patch하고 root pnpm overrides로 fast-uri, nanoid, postcss, sharp의 최소 안전 resolution을 강제했습니다. lockfile 전체 importer/package graph를 새 resolution에 맞췄습니다. |
| build → package → execute 흐름 | root/workspace manifest + overrides → pnpm resolution → lockfile에 exact direct/transitive/platform graph 기록 → CI/Docker frozen install → API/Web build와 runtime이 그 graph를 소비합니다. |
| ownership/lifetime/cleanup | workspace manifests가 direct compatibility intent를, root overrides가 cross-workspace transitive policy를, lockfile이 exact resolved graph를 소유합니다. |
| failure/rollback/fail-closed | override와 상위 package의 peer/engine 요구가 충돌하면 install/build/runtime에서 실패할 수 있습니다. frozen install은 manifest-lock mismatch를 fail-closed합니다. |
| 보장하는 것 | repository가 재현하는 production dependency graph에서 named vulnerable ranges가 patched versions로 강제되고 direct requirements와 lockfile이 일치합니다. |
| 보장하지 않는 것 | 모든 알려진/미공개 취약점 부재, scanner pass, API/Web behavior compatibility, image SBOM/signature는 증명하지 않습니다. 실제 install/build/test를 이 세션에서 실행하지 않았습니다. |
| 후속 연결 | 최종 release flow에서는 이 graph가 Thread 02 build, Thread 03 image, Thread 04 CI process 검증의 입력이 됩니다. |

비교 기준:
- 직전 관련 SHA: `0066e48ea3c9` — `build(api): WebSocket 보안 패치 적용`

## 6. Invariant evolution ledger

| 시점 | 불변식 | 상태 | 실제 근거 |
| --- | --- | --- | --- |
| `ee4bebc84f95` | local version manager, package metadata, container runtime을 Node/pnpm 기준에 맞춥니다. | 도입·불충분 | `.node-version`, `.nvmrc`, root package와 CI가 기준을 공유하지만 engine range는 patch drift를 허용합니다. |
| `9693b2a9ad3d` | package engine을 repository가 실제 사용하는 exact Node version으로 좁힙니다. | 수정 | root package engine이 exact 24.18.0으로 좁아져 declared compatibility와 verified runtime을 정렬합니다. |
| `48c2188eb42a` | CI/Docker contract test가 중복 literal 대신 canonical version file을 사용하도록 합니다. | 회귀 검증 | 두 static contract test가 `.node-version`을 단일 expected source로 사용해 version consumer drift를 검사합니다. |
| `3a8cd06a1098` | 고정된 Node patch를 version file, engine, CI, API/Web/load image에 함께 적용합니다. | 갱신 | canonical file과 local/CI/API/Web/load runtime selectors가 24.18.1로 함께 이동합니다. |
| `69e22da94cb4` | Next.js direct requirement와 resolved compiler package를 patched version으로 갱신합니다. | 갱신 | Web manifest와 lockfile의 Next 및 platform SWC resolution이 patched version으로 정렬됩니다. |
| `0066e48ea3c9` | API `ws` dependency와 workspace resolution을 patched version으로 갱신합니다. | 갱신 | API direct 및 Fastify WebSocket dependency graph의 `ws` resolution이 patched version으로 이동합니다. |
| `4c4f7df2242a` | Fastify/Next.js/PostCSS와 취약한 transitive dependency override를 production graph에 반영합니다. | 확장·갱신 | direct manifest, root overrides와 lockfile의 exact graph가 production dependency security policy를 함께 표현합니다. |

## 7. Failure → Fix → Test 연결

| 이전 가정 또는 failure | Fix | Regression/contract evidence | 학습자 설명 |
| --- | --- | --- | --- |
| local/CI exact patch와 package engine의 넓은 Node 24 range가 공존 | `9693b2a9ad3d` | `48c2188eb42a` | engine을 exact patch로 좁히고 contract tests가 canonical `.node-version`과 consumer를 비교합니다. |
| Node expected version이 여러 test literal에 복제됨 | `48c2188eb42a` | `3a8cd06a1098`의 일괄 patch | canonical file 하나를 읽어 stale CI/Docker consumer를 감지합니다. |
| direct patch만으로 transitive vulnerable resolution을 제거할 수 있다고 가정 | `4c4f7df2242a` | frozen lockfile install + existing CI build/process gates | root overrides와 lockfile graph를 함께 갱신하지만 vulnerability scan 자체는 별도 evidence가 필요합니다. |

## 8. Artifact·process·resource ownership

| 대상 | 생성/빌드 주체 | 소비/실행 주체 | lifetime | 실패 시 정리/차단 |
| --- | --- | --- | --- | --- |
| Node/pnpm version contract | `.node-version`, `.nvmrc`, root package | developer, CI, Docker/load builders | checkout/build lifetime | consumer mismatch는 static contract 또는 setup/install failure |
| direct dependency intent | workspace `package.json` | pnpm resolver/build/runtime | release manifest lifetime | manifest-lock mismatch는 frozen install 차단 |
| transitive resolution policy | root `pnpm.overrides` | all workspace dependency graphs | lockfile/release lifetime | incompatible override는 install/build/runtime failure 가능 |
| release contract evidence | CI/Docker static tests와 lockfile diff | CI gate/reviewer | test/job/commit lifetime | runtime/security scan 결과는 별도 evidence |

## 9. Thread 최종 상태

- 최종 delivery owner: canonical version files와 root package가 toolchain policy를, workspace manifests/root overrides/lockfile이 dependency graph를, static tests와 frozen CI install이 consistency gate를 소유합니다.
- source와 production artifact의 관계: source dependency declarations과 lockfile resolution이 Thread 02 build와 Thread 03 image에 들어가는 정확한 runtime graph를 결정합니다.
- build-time과 runtime configuration의 관계: Node/pnpm과 framework/build dependencies는 install/build-time release 입력이며 결과 image/process는 그 resolution을 포함합니다. runtime env는 이 Thread 범위가 아닙니다.
- startup/readiness/shutdown contract: version/security contract는 startup sequencing을 직접 정의하지 않고, downstream build/process가 동일 graph를 사용하게 합니다.
- fail-closed 조건: engine mismatch 정책, frozen install, static version assertions와 manifest-lock consistency가 drift를 차단합니다. 취약점 scanner fail-closed는 구성되지 않았습니다.
- 검증 가능한 것과 외부 배포 환경에 남는 것: exact SHA manifest/version/workflow/Dockerfile/lockfile diff를 검사했습니다. package install, build, audit/scanner, runtime compatibility를 재실행하지 않았습니다.

## 10. 최종 execution/delivery flow

```text
`.node-version` / `.nvmrc`
→ exact root `engines.node` + `packageManager`
→ CI setup / API-Web-load Docker selectors
→ contract tests compare all consumers with canonical version
workspace direct manifests + root `pnpm.overrides`
→ pnpm resolver → exact `pnpm-lock.yaml`
→ frozen CI/Docker install
→ shared/DB/API/Web build → image/process verification
(security patch graph is verified structurally; vulnerability scan result is not present)
```

위 흐름을 각 단계의 실제 파일, command, artifact, process와 연결해 다시 작성합니다.

## 11. 교차 카테고리 연결

- `03-container-images-and-production-runtime-lifecycle.md`: pinned runtime과 resolved dependencies가 실제 image에 포함되는 위치
- `04-ci-production-process-and-browser-delivery-verification.md`: exact toolchain/frozen graph가 CI에서 소비되는 위치
- `02-production-build-and-package-artifacts.md`: patched graph로 production artifacts를 생성하는 위치

## 12. 학습 완료 체크

- [x] 모든 Commit map SHA를 exact historical state에서 확인했습니다.
- [x] build와 runtime을 final HEAD에서 과거로 소급하지 않았습니다.
- [x] artifact producer/consumer와 package/image/process owner를 설명할 수 있습니다.
- [x] production config와 secret의 fail-closed 조건을 설명할 수 있습니다.
- [x] CI/test가 실제로 증명하는 delivery 범위와 증명하지 않는 범위를 구분할 수 있습니다.
- [x] fix와 regression evidence를 실제 이전 failure/가정에 연결했습니다.
- [x] 실행하지 않은 Docker/CI 결과를 실행 증거로 기록하지 않았습니다.
