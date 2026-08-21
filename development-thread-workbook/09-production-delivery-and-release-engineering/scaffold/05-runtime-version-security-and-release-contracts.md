# Runtime version·security·release contract

- 카테고리: `09-production-delivery-and-release-engineering` — 제품 전달과 릴리스 엔지니어링
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

Node/pnpm/runtime dependency version을 재현 가능하게 고정하고 production mode가 durable PostgreSQL을 반드시 사용하도록 fail-closed configuration을 강화하며, security patch가 package/image/CI 전체의 release contract와 함께 움직이도록 하는 과정을 복원합니다.

이 문서는 완성된 해설이 아니라 exact SHA를 순서대로 확인해 제품 전달 구조의 발전을 복원하기 위한 scaffold입니다.

### 직접 연결되는 불변식

- local version file, package manager, package engine, Docker image, CI가 같은 runtime version contract를 사용합니다.
- production mode는 `DATABASE_URL` 없이 memory repository로 조용히 fallback하지 않습니다.
- demo mode와 production mode의 persistence requirement는 configuration parsing 단계에서 명시적으로 분리됩니다.
- runtime/dependency security patch는 manifest, lockfile, image/CI 기대값과 일관성을 유지해야 합니다.
- runtime version 기대값은 여러 contract test에 literal로 복제하지 않고 canonical version file에서 읽습니다.

## 2. 핵심 질문

- Node/pnpm 범위를 처음 고정한 파일과 이후 exact engine pin이 추가로 필요했던 이유는 무엇입니까?
- production에서 memory fallback이 허용되면 durable match/tournament state에 어떤 거짓 성공 상태가 생길 수 있습니까?
- 명시적인 `APP_MODE=production`과 `NODE_ENV` 기반 production이 동일한 DB requirement를 어떻게 거칩니까?
- CI/Docker contract test가 `.node-version`을 읽도록 바뀌면 어떤 version drift를 제거합니까?
- Node, Next.js, `ws`, Fastify/PostCSS 계열 security patch가 manifest/lock/override에 어떻게 반영됩니까?

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
| 3 | `97d7ca714293` | `test(config): production fixture에 영속 DB 명시` | C | - | production configuration fixture에 PostgreSQL URL을 명시합니다. |
| 4 | `eb675ef74af3` | `fix(config): production에서 영속 저장소 요구` | A | TOURNAMENT, OPERATIONS, RISK | `DATABASE_URL`이 없는 production configuration을 parsing 단계에서 거부합니다. |
| 5 | `4633dfde208d` | `test(config): production memory fallback 거부 검증` | A | OPERATIONS, TEST | 명시/추론 production의 DB 누락 거부와 demo memory 허용을 검증합니다. |
| 6 | `48c2188eb42a` | `test(runtime): Node 버전 계약을 기준 파일에서 읽음` | B | OPERATIONS, TEST | CI/Docker contract test가 중복 literal 대신 canonical version file을 사용하도록 합니다. |
| 7 | `3a8cd06a1098` | `build(runtime): Node.js 보안 패치 적용` | C | - | 고정된 Node patch를 version file, engine, CI, API/Web/load image에 함께 적용합니다. |
| 8 | `69e22da94cb4` | `build(web): Next.js 보안 패치 적용` | C | - | Next.js direct requirement와 resolved compiler package를 patched version으로 갱신합니다. |
| 9 | `0066e48ea3c9` | `build(api): WebSocket 보안 패치 적용` | C | - | API `ws` dependency와 workspace resolution을 patched version으로 갱신합니다. |
| 10 | `4c4f7df2242a` | `build(security): 프로덕션 의존성 취약점 패치` | B | WEB, OPERATIONS | Fastify/Next.js/PostCSS와 취약한 transitive dependency override를 production graph에 반영합니다. |

## 5. Commit별 학습 기록

### 5.1. `build(runtime): 지원 Node.js·pnpm 범위 고정`

| 항목 | 값 |
| --- | --- |
| SHA | `ee4bebc84f95` |
| Importance | B |
| Tags | OPERATIONS |
| Source에서 확정된 역할 | local version manager, package metadata, container runtime을 Node/pnpm 기준에 맞춥니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 실행 방식, 변경 파일, build/runtime entrypoint를 기록합니다.
- 실제 `package.json`, workflow, Dockerfile, Compose, Caddyfile, config/test script에서 producer와 consumer를 연결합니다.
- process/container lifecycle, health/readiness, exposed port, shutdown/grace, 운영 endpoint 노출 규칙을 확인합니다.

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

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 실행 방식, 변경 파일, build/runtime entrypoint를 기록합니다.
- 실제 `package.json`, workflow, Dockerfile, Compose, Caddyfile, config/test script에서 producer와 consumer를 연결합니다.
- migration 실행 시점, database dependency, persistent volume/credential, 실패 시 startup 차단 여부를 확인합니다.
- process/container lifecycle, health/readiness, exposed port, shutdown/grace, 운영 endpoint 노출 규칙을 확인합니다.

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
- 다음 관련 SHA: `97d7ca714293` — `test(config): production fixture에 영속 DB 명시`

### 5.3. `test(config): production fixture에 영속 DB 명시`

| 항목 | 값 |
| --- | --- |
| SHA | `97d7ca714293` |
| Importance | C |
| Tags | - |
| Source에서 확정된 역할 | production configuration fixture에 PostgreSQL URL을 명시합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 실행 방식, 변경 파일, build/runtime entrypoint를 기록합니다.
- 실제 `package.json`, workflow, Dockerfile, Compose, Caddyfile, config/test script에서 producer와 consumer를 연결합니다.
- 어떤 production artifact/process를 실제로 실행하거나 정적으로 검사하는지, 그리고 무엇을 증명하지 못하는지도 기록합니다.

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
- 다음 관련 SHA: `eb675ef74af3` — `fix(config): production에서 영속 저장소 요구`

### 5.4. `fix(config): production에서 영속 저장소 요구`

| 항목 | 값 |
| --- | --- |
| SHA | `eb675ef74af3` |
| Importance | A |
| Tags | TOURNAMENT, OPERATIONS, RISK |
| Source에서 확정된 역할 | `DATABASE_URL`이 없는 production configuration을 parsing 단계에서 거부합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 실행 방식, 변경 파일, build/runtime entrypoint를 기록합니다.
- 실제 `package.json`, workflow, Dockerfile, Compose, Caddyfile, config/test script에서 producer와 consumer를 연결합니다.
- process/container lifecycle, health/readiness, exposed port, shutdown/grace, 운영 endpoint 노출 규칙을 확인합니다.
- 이전 상태의 가정 → 실제 실패/위험 → root cause → 수정된 release invariant → regression evidence를 연결합니다.
- A급 변경이므로 단순 파일 나열을 넘어서 delivery ownership, failure boundary, rollback/cleanup 또는 fail-closed 조건을 깊게 추적합니다.

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
- 직전 관련 SHA: `97d7ca714293` — `test(config): production fixture에 영속 DB 명시`
- 다음 관련 SHA: `4633dfde208d` — `test(config): production memory fallback 거부 검증`

### 5.5. `test(config): production memory fallback 거부 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `4633dfde208d` |
| Importance | A |
| Tags | OPERATIONS, TEST |
| Source에서 확정된 역할 | 명시/추론 production의 DB 누락 거부와 demo memory 허용을 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 실행 방식, 변경 파일, build/runtime entrypoint를 기록합니다.
- 실제 `package.json`, workflow, Dockerfile, Compose, Caddyfile, config/test script에서 producer와 consumer를 연결합니다.
- process/container lifecycle, health/readiness, exposed port, shutdown/grace, 운영 endpoint 노출 규칙을 확인합니다.
- 어떤 production artifact/process를 실제로 실행하거나 정적으로 검사하는지, 그리고 무엇을 증명하지 못하는지도 기록합니다.
- A급 변경이므로 단순 파일 나열을 넘어서 delivery ownership, failure boundary, rollback/cleanup 또는 fail-closed 조건을 깊게 추적합니다.

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
- 직전 관련 SHA: `eb675ef74af3` — `fix(config): production에서 영속 저장소 요구`
- 다음 관련 SHA: `48c2188eb42a` — `test(runtime): Node 버전 계약을 기준 파일에서 읽음`

### 5.6. `test(runtime): Node 버전 계약을 기준 파일에서 읽음`

| 항목 | 값 |
| --- | --- |
| SHA | `48c2188eb42a` |
| Importance | B |
| Tags | OPERATIONS, TEST |
| Source에서 확정된 역할 | CI/Docker contract test가 중복 literal 대신 canonical version file을 사용하도록 합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 실행 방식, 변경 파일, build/runtime entrypoint를 기록합니다.
- 실제 `package.json`, workflow, Dockerfile, Compose, Caddyfile, config/test script에서 producer와 consumer를 연결합니다.
- process/container lifecycle, health/readiness, exposed port, shutdown/grace, 운영 endpoint 노출 규칙을 확인합니다.
- 어떤 production artifact/process를 실제로 실행하거나 정적으로 검사하는지, 그리고 무엇을 증명하지 못하는지도 기록합니다.

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
- 직전 관련 SHA: `4633dfde208d` — `test(config): production memory fallback 거부 검증`
- 다음 관련 SHA: `3a8cd06a1098` — `build(runtime): Node.js 보안 패치 적용`

### 5.7. `build(runtime): Node.js 보안 패치 적용`

| 항목 | 값 |
| --- | --- |
| SHA | `3a8cd06a1098` |
| Importance | C |
| Tags | - |
| Source에서 확정된 역할 | 고정된 Node patch를 version file, engine, CI, API/Web/load image에 함께 적용합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 실행 방식, 변경 파일, build/runtime entrypoint를 기록합니다.
- 실제 `package.json`, workflow, Dockerfile, Compose, Caddyfile, config/test script에서 producer와 consumer를 연결합니다.

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

### 5.8. `build(web): Next.js 보안 패치 적용`

| 항목 | 값 |
| --- | --- |
| SHA | `69e22da94cb4` |
| Importance | C |
| Tags | - |
| Source에서 확정된 역할 | Next.js direct requirement와 resolved compiler package를 patched version으로 갱신합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 실행 방식, 변경 파일, build/runtime entrypoint를 기록합니다.
- 실제 `package.json`, workflow, Dockerfile, Compose, Caddyfile, config/test script에서 producer와 consumer를 연결합니다.

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

### 5.9. `build(api): WebSocket 보안 패치 적용`

| 항목 | 값 |
| --- | --- |
| SHA | `0066e48ea3c9` |
| Importance | C |
| Tags | - |
| Source에서 확정된 역할 | API `ws` dependency와 workspace resolution을 patched version으로 갱신합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 실행 방식, 변경 파일, build/runtime entrypoint를 기록합니다.
- 실제 `package.json`, workflow, Dockerfile, Compose, Caddyfile, config/test script에서 producer와 consumer를 연결합니다.

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

### 5.10. `build(security): 프로덕션 의존성 취약점 패치`

| 항목 | 값 |
| --- | --- |
| SHA | `4c4f7df2242a` |
| Importance | B |
| Tags | WEB, OPERATIONS |
| Source에서 확정된 역할 | Fastify/Next.js/PostCSS와 취약한 transitive dependency override를 production graph에 반영합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 실행 방식, 변경 파일, build/runtime entrypoint를 기록합니다.
- 실제 `package.json`, workflow, Dockerfile, Compose, Caddyfile, config/test script에서 producer와 consumer를 연결합니다.
- Web build-time 값과 runtime 값, standalone/static artifact, browser origin/cookie 영향 범위를 확인합니다.
- process/container lifecycle, health/readiness, exposed port, shutdown/grace, 운영 endpoint 노출 규칙을 확인합니다.

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
| `97d7ca714293` | production configuration fixture에 PostgreSQL URL을 명시합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `eb675ef74af3` | `DATABASE_URL`이 없는 production configuration을 parsing 단계에서 거부합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `4633dfde208d` | 명시/추론 production의 DB 누락 거부와 demo memory 허용을 검증합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `48c2188eb42a` | CI/Docker contract test가 중복 literal 대신 canonical version file을 사용하도록 합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `3a8cd06a1098` | 고정된 Node patch를 version file, engine, CI, API/Web/load image에 함께 적용합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `69e22da94cb4` | Next.js direct requirement와 resolved compiler package를 patched version으로 갱신합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `0066e48ea3c9` | API `ws` dependency와 workspace resolution을 patched version으로 갱신합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `4c4f7df2242a` | Fastify/Next.js/PostCSS와 취약한 transitive dependency override를 production graph에 반영합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |

## 7. Failure → Fix → Test 연결

| 이전 가정 또는 failure | Fix | Regression/contract evidence | 학습자 설명 |
| --- | --- | --- | --- |
| [실제 이전 상태] | [관련 fix SHA] | [관련 test/CI SHA] | [왜 다시 깨지지 않는지 작성] |
| [실제 이전 상태] | [관련 fix SHA] | [관련 test/CI SHA] | [무엇은 아직 보장하지 않는지 작성] |

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
production env parse → durable DB requirement → startup allow/reject
security patch → manifest/lock/override → build → process/container verification
```

위 흐름을 각 단계의 실제 파일, command, artifact, process와 연결해 다시 작성합니다.

## 11. 교차 카테고리 연결

- `03-container-images-and-production-runtime-lifecycle.md`: pinned runtime과 required secret이 실제 image/Compose에 적용되는 위치
- `04-ci-production-process-and-browser-delivery-verification.md`: release contract가 CI에서 확인되는 위치
- `01-foundations-and-api-boundaries`: runtime mode와 configuration parsing 자체의 애플리케이션 설계

## 12. 학습 완료 체크

- [ ] 모든 Commit map SHA를 exact historical state에서 확인했습니다.
- [ ] build와 runtime을 final HEAD에서 과거로 소급하지 않았습니다.
- [ ] artifact producer/consumer와 package/image/process owner를 설명할 수 있습니다.
- [ ] production config와 secret의 fail-closed 조건을 설명할 수 있습니다.
- [ ] CI/test가 실제로 증명하는 delivery 범위와 증명하지 않는 범위를 구분할 수 있습니다.
- [ ] fix와 regression evidence를 실제 이전 failure/가정에 연결했습니다.
- [ ] 실행하지 않은 Docker/CI 결과를 실행 증거로 기록하지 않았습니다.
