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
- 직전 관련 SHA: `0066e48ea3c9` — `build(api): WebSocket 보안 패치 적용`

## 6. Invariant evolution ledger

| 시점 | 불변식 | 상태 | 실제 근거 |
| --- | --- | --- | --- |
| `ee4bebc84f95` | local version manager, package metadata, container runtime을 Node/pnpm 기준에 맞춥니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `9693b2a9ad3d` | package engine을 repository가 실제 사용하는 exact Node version으로 좁힙니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `48c2188eb42a` | CI/Docker contract test가 중복 literal 대신 canonical version file을 사용하도록 합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `3a8cd06a1098` | 고정된 Node patch를 version file, engine, CI, API/Web/load image에 함께 적용합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `69e22da94cb4` | Next.js direct requirement와 resolved compiler package를 patched version으로 갱신합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `0066e48ea3c9` | API `ws` dependency와 workspace resolution을 patched version으로 갱신합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `4c4f7df2242a` | Fastify/Next.js/PostCSS와 취약한 transitive dependency override를 production graph에 반영합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |

## 7. Failure → Fix → Test 연결

| 이전 가정 또는 failure | Fix | Regression/contract evidence | 학습자 설명 |
| --- | --- | --- | --- |
| [실제 이전 상태] | [관련 fix SHA] | [관련 test/CI SHA] | [왜 다시 깨지지 않는지와 남은 비보장 작성] |
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
canonical runtime version → package metadata → CI setup → Docker base image → contract test
security patch → direct manifest + transitive override → lockfile
→ frozen install → build/process verification
```

위 흐름을 각 단계의 실제 파일, command, artifact, process와 연결해 다시 작성합니다.

## 11. 교차 카테고리 연결

- `03-container-images-and-production-runtime-lifecycle.md`: pinned runtime과 resolved dependencies가 실제 image에 포함되는 위치
- `04-ci-production-process-and-browser-delivery-verification.md`: exact toolchain/frozen graph가 CI에서 소비되는 위치
- `02-production-build-and-package-artifacts.md`: patched graph로 production artifacts를 생성하는 위치

## 12. 학습 완료 체크

- [ ] 모든 Commit map SHA를 exact historical state에서 확인했습니다.
- [ ] build와 runtime을 final HEAD에서 과거로 소급하지 않았습니다.
- [ ] artifact producer/consumer와 package/image/process owner를 설명할 수 있습니다.
- [ ] production config와 secret의 fail-closed 조건을 설명할 수 있습니다.
- [ ] CI/test가 실제로 증명하는 delivery 범위와 증명하지 않는 범위를 구분할 수 있습니다.
- [ ] fix와 regression evidence를 실제 이전 failure/가정에 연결했습니다.
- [ ] 실행하지 않은 Docker/CI 결과를 실행 증거로 기록하지 않았습니다.
