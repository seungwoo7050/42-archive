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

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 실행 방식, 변경 파일, build/runtime entrypoint를 기록합니다.
- 실제 `package.json`, workflow, Dockerfile, Compose, Caddyfile, config/test script에서 producer와 consumer를 연결합니다.
- migration 실행 시점, database dependency, persistent volume/credential, 실패 시 startup 차단 여부를 확인합니다.

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

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 실행 방식, 변경 파일, build/runtime entrypoint를 기록합니다.
- 실제 `package.json`, workflow, Dockerfile, Compose, Caddyfile, config/test script에서 producer와 consumer를 연결합니다.
- migration 실행 시점, database dependency, persistent volume/credential, 실패 시 startup 차단 여부를 확인합니다.
- Web build-time 값과 runtime 값, standalone/static artifact, browser origin/cookie 영향 범위를 확인합니다.
- process/container lifecycle, health/readiness, exposed port, shutdown/grace, 운영 endpoint 노출 규칙을 확인합니다.
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

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 실행 방식, 변경 파일, build/runtime entrypoint를 기록합니다.
- 실제 `package.json`, workflow, Dockerfile, Compose, Caddyfile, config/test script에서 producer와 consumer를 연결합니다.
- migration 실행 시점, database dependency, persistent volume/credential, 실패 시 startup 차단 여부를 확인합니다.
- Web build-time 값과 runtime 값, standalone/static artifact, browser origin/cookie 영향 범위를 확인합니다.
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

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 실행 방식, 변경 파일, build/runtime entrypoint를 기록합니다.
- 실제 `package.json`, workflow, Dockerfile, Compose, Caddyfile, config/test script에서 producer와 consumer를 연결합니다.
- migration 실행 시점, database dependency, persistent volume/credential, 실패 시 startup 차단 여부를 확인합니다.
- Web build-time 값과 runtime 값, standalone/static artifact, browser origin/cookie 영향 범위를 확인합니다.
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
- 직전 관련 SHA: `6ab091ffa815` — `test(build): production artifact 생성 검증`

## 6. Invariant evolution ledger

| 시점 | 불변식 | 상태 | 실제 근거 |
| --- | --- | --- | --- |
| `37c735de0c37` | shared package를 compiled production dependency로 구성합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `430389943b34` | DB package에 compiled artifact, migration copy, production migration CLI를 구성합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `bb67a72882bf` | API를 compiled `dist` 실행으로, Web을 standalone output으로 전환하고 root build dependency 순서를 고정합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `6ab091ffa815` | production runtime에 필요한 build output을 post-build contract로 검증합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `09b305b49768` | CI가 workspace build 직후 artifact verifier를 실행하도록 연결합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |

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
root build
→ shared `dist`
→ db `dist` + migrations
→ API `dist`
→ Web `.next/standalone` + static
→ post-build artifact verification
```

위 흐름을 각 단계의 실제 파일, command, artifact, process와 연결해 다시 작성합니다.

## 11. 교차 카테고리 연결

- `01-runtime-composition-and-reverse-proxy-evolution.md`: source-driven runtime의 이전 상태
- `03-container-images-and-production-runtime-lifecycle.md`: 생성된 artifact를 image runner가 소비하는 후속 단계
- `08-verification-and-test-architecture`: artifact verifier를 테스트 관점에서 해석하는 카테고리

## 12. 학습 완료 체크

- [ ] 모든 Commit map SHA를 exact historical state에서 확인했습니다.
- [ ] build와 runtime을 final HEAD에서 과거로 소급하지 않았습니다.
- [ ] artifact producer/consumer와 package/image/process owner를 설명할 수 있습니다.
- [ ] production config와 secret의 fail-closed 조건을 설명할 수 있습니다.
- [ ] CI/test가 실제로 증명하는 delivery 범위와 증명하지 않는 범위를 구분할 수 있습니다.
- [ ] fix와 regression evidence를 실제 이전 failure/가정에 연결했습니다.
- [ ] 실행하지 않은 Docker/CI 결과를 실행 증거로 기록하지 않았습니다.
