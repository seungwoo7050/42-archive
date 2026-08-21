# CI production process와 browser delivery 검증

- 카테고리: `09-production-delivery-and-release-engineering` — 제품 전달과 릴리스 엔지니어링
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

typecheck/unit/build 수준의 CI에서 production artifact를 실제 process로 기동하고 PostgreSQL migration, readiness, HTTP/WebSocket smoke, production Web, browser E2E까지 연결한 delivery verification으로 발전하는 과정을 복원합니다.

이 문서는 완성된 해설이 아니라 exact SHA를 순서대로 확인해 제품 전달 구조의 발전을 복원하기 위한 scaffold입니다.

### 직접 연결되는 불변식

- production delivery 검증은 source dev server가 아니라 build된 artifact/process를 실행해야 합니다.
- CI는 동일한 Node/pnpm toolchain과 frozen lockfile을 사용해 dependency resolution drift를 제한합니다.
- 실제 PostgreSQL을 준비하고 migration한 뒤 API readiness를 확인한 후 smoke/browser 검증을 진행합니다.
- guest/demo browser job도 production-style build/start 경로를 사용하되 PostgreSQL 없이 제한된 capability를 검증합니다.
- cookie origin은 HTTP session semantics와 일치해야 하며 CI의 hostname 차이도 contract로 취급합니다.
- workflow 자체의 필수 job/command/runtime 규칙은 정적 contract test로 보호됩니다.

## 2. 핵심 질문

- 초기 CI가 typecheck/unit/build만 수행할 때 production delivery에 대해 증명하지 못하는 것은 무엇입니까?
- PostgreSQL integration job과 process/browser job은 각각 어떤 persistence·delivery 경계를 검증합니까?
- process/browser job은 build, DB 준비, migration, process start, readiness, smoke, E2E를 어떤 순서로 수행합니까?
- workflow contract test는 Node/pnpm, frozen install, command 존재를 어떻게 고정합니까?
- guest-only browser job이 일반 process job과 분리되는 이유와 공유하는 production build/start 계약은 무엇입니까?
- `localhost`와 `127.0.0.1` 차이가 cookie origin에서 실제 failure가 되는 이유는 무엇입니까?

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
| 1 | `a9f8b8609711` | `build(repo): workspace 검증 명령 정리` | B | PROTOCOL, REALTIME, OPERATIONS | root script와 Make target을 verification layer별 entrypoint로 정리합니다. |
| 2 | `68404e51ea53` | `ci(repo): typecheck·unit·build workflow 추가` | B | PROTOCOL, PERSISTENCE, OPERATIONS | push/PR에서 typecheck, unit, build를 실행하는 첫 repository CI 경계를 추가합니다. |
| 3 | `0e360d333540` | `ci(db): PostgreSQL integration 검사 실행` | B | PERSISTENCE | PostgreSQL integration test를 독립 CI job에서 실행합니다. |
| 4 | `3367b4266049` | `ci(repo): process와 browser 검증 job 추가` | A | REALTIME, PERSISTENCE, WEB | production artifact와 PostgreSQL을 실제로 기동해 HTTP/WS smoke와 browser E2E까지 검증합니다. |
| 5 | `7cb0d32b5be3` | `test(ci): process 검증 job contract 확인` | B | PERSISTENCE, WEB, OPERATIONS | workflow의 toolchain, frozen install, unit/integration/process/browser command 존재를 contract로 고정합니다. |
| 6 | `bf0bc1199c84` | `ci(e2e): 비회원 체험 browser job 실행` | B | PERSISTENCE, WEB, OPERATIONS | API/Web을 demo mode로 build/start하고 PostgreSQL 없이 guest-only Playwright suite를 실행합니다. |
| 7 | `0ae1ded2c56f` | `test(ci): guest browser job 요구 검증` | B | WEB, OPERATIONS, TEST | 별도 guest job, mode 값, Playwright command와 guest spec 존재를 workflow contract로 검증합니다. |
| 8 | `f35728f4ef92` | `test(repo): 정적 계약 검사 명령 연결` | B | PERSISTENCE, OPERATIONS, TEST | CI, production Docker, load harness contract suite를 하나의 root command와 Make target으로 연결합니다. |
| 9 | `4f9e66c35586` | `ci(repo): 정적 계약 검사 실행` | B | PERSISTENCE | repository static contract suite를 CI에서 실행합니다. |
| 10 | `65512bc24161` | `fix(ci): 브라우저 E2E API origin 정렬` | B | AUTH, REALTIME, WEB | browser E2E API origin을 cookie semantics와 맞는 `localhost`로 정렬합니다. |
| 11 | `527921bc9d69` | `test(ci): 브라우저 E2E cookie origin 계약 검증` | B | AUTH, WEB, OPERATIONS | CI contract가 API base URL의 exact cookie origin을 고정하도록 합니다. |

## 5. Commit별 학습 기록

### 5.1. `build(repo): workspace 검증 명령 정리`

| 항목 | 값 |
| --- | --- |
| SHA | `a9f8b8609711` |
| Importance | B |
| Tags | PROTOCOL, REALTIME, OPERATIONS |
| Source에서 확정된 역할 | root script와 Make target을 verification layer별 entrypoint로 정리합니다. |

#### 해당 SHA에서 확인할 실제 코드

- root `package.json`에서 typecheck, unit, PostgreSQL integration, build, aggregate test command가 어떤 workspace command를 호출하는지 확인합니다.
- `Makefile`의 `check`, `integration`, `build`, `test` target이 package script의 stable operator entrypoint가 되는지 확인합니다.
- unit과 실제 PostgreSQL integration이 별도 command로 분리되어 필요한 external resource와 failure scope를 구분하는지 확인합니다.

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
- 다음 관련 SHA: `68404e51ea53` — `ci(repo): typecheck·unit·build workflow 추가`

### 5.2. `ci(repo): typecheck·unit·build workflow 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `68404e51ea53` |
| Importance | B |
| Tags | PROTOCOL, PERSISTENCE, OPERATIONS |
| Source에서 확정된 역할 | push/PR에서 typecheck, unit, build를 실행하는 첫 repository CI 경계를 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 새 `.github/workflows/ci.yml`의 push/pull_request trigger, verify job, timeout, checkout→pnpm→Node→frozen install 순서를 확인합니다.
- toolchain이 pnpm `10.32.1`, Node `24.18.0`으로 고정되고 cache key가 lockfile과 연결되는지 확인합니다.
- verify job이 `pnpm typecheck`, `pnpm unit`, `pnpm build`만 실행해 PostgreSQL·process startup·browser delivery는 아직 검증하지 않는 범위를 기록합니다.

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
- 직전 관련 SHA: `a9f8b8609711` — `build(repo): workspace 검증 명령 정리`
- 다음 관련 SHA: `0e360d333540` — `ci(db): PostgreSQL integration 검사 실행`

### 5.3. `ci(db): PostgreSQL integration 검사 실행`

| 항목 | 값 |
| --- | --- |
| SHA | `0e360d333540` |
| Importance | B |
| Tags | PERSISTENCE |
| Source에서 확정된 역할 | PostgreSQL integration test를 독립 CI job에서 실행합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `.github/workflows/ci.yml`의 새 `postgres-integration` job 이름, 15분 timeout과 verify job과 독립된 execution boundary를 확인합니다.
- checkout, pnpm `10.32.1`, Node `24.18.0`, frozen install 뒤 `pnpm postgres-integration`을 실행하는지 확인합니다.
- 이 job diff에는 PostgreSQL service 선언이 보이지 않으므로 test command 자체가 어떤 DB provision mechanism을 사용하는지 해당 SHA의 package/test source에서 확인해야 함을 기록합니다.
- 후속 `7cb0d32b5be3` contract가 이 독립 job/command 존재를 요구하는 연결을 확인합니다.

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
- 직전 관련 SHA: `68404e51ea53` — `ci(repo): typecheck·unit·build workflow 추가`
- 다음 관련 SHA: `3367b4266049` — `ci(repo): process와 browser 검증 job 추가`

### 5.4. `ci(repo): process와 browser 검증 job 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `3367b4266049` |
| Importance | A |
| Tags | REALTIME, PERSISTENCE, WEB |
| Source에서 확정된 역할 | production artifact와 PostgreSQL을 실제로 기동해 HTTP/WS smoke와 browser E2E까지 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `.github/workflows/ci.yml`의 `process-and-browser` job PostgreSQL service, health option, environment와 25분 timeout을 확인합니다.
- frozen install/build 뒤 package migration command, compiled API `dist` start, Next production/standalone Web start를 background process로 기동하는 shell을 확인합니다.
- PID capture와 `trap`/`kill` cleanup, API readiness와 Web root polling이 downstream smoke/E2E 전에 실행되는지 확인합니다.
- HTTP smoke, WebSocket smoke, Playwright browser suite의 실제 command와 public API/WS build-time values를 연결합니다.
- compiled production artifact를 실행하지만 `APP_MODE=development`와 package migration command를 사용하므로 full production configuration/Compose image lifecycle과 동일하지 않다는 점을 명시합니다.

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
- 직전 관련 SHA: `0e360d333540` — `ci(db): PostgreSQL integration 검사 실행`
- 다음 관련 SHA: `7cb0d32b5be3` — `test(ci): process 검증 job contract 확인`

### 5.5. `test(ci): process 검증 job contract 확인`

| 항목 | 값 |
| --- | --- |
| SHA | `7cb0d32b5be3` |
| Importance | B |
| Tags | PERSISTENCE, WEB, OPERATIONS |
| Source에서 확정된 역할 | workflow의 toolchain, frozen install, unit/integration/process/browser command 존재를 contract로 고정합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 새 `tests/ci-contract.test.mjs`가 `.github/workflows/ci.yml` text를 읽고 exact Node/pnpm version, frozen install을 assertion하는지 확인합니다.
- verify, PostgreSQL integration, process/browser job 이름과 production build/start, migration, smoke, Playwright command literal을 검사하는지 확인합니다.
- YAML semantic execution이 아니라 text/literal contract이므로 command가 실제 성공하거나 correct order로 실행된다는 것을 독립적으로 증명하지 않는 범위를 기록합니다.

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
- 직전 관련 SHA: `3367b4266049` — `ci(repo): process와 browser 검증 job 추가`
- 다음 관련 SHA: `bf0bc1199c84` — `ci(e2e): 비회원 체험 browser job 실행`

### 5.6. `ci(e2e): 비회원 체험 browser job 실행`

| 항목 | 값 |
| --- | --- |
| SHA | `bf0bc1199c84` |
| Importance | B |
| Tags | PERSISTENCE, WEB, OPERATIONS |
| Source에서 확정된 역할 | API/Web을 demo mode로 build/start하고 PostgreSQL 없이 guest-only Playwright suite를 실행합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `.github/workflows/ci.yml`의 새 guest browser job이 PostgreSQL service 없이 `APP_MODE=demo`와 guest/session secret을 사용하는지 확인합니다.
- demo public values로 Web을 build하고 API `dist`와 Web standalone/production server를 기동한 뒤 readiness와 `pnpm e2e:guest-demo`를 실행하는지 확인합니다.
- 일반 process/browser job과 PID/trap/readiness pattern을 공유하면서 persistence capability를 의도적으로 제거한 차이를 확인합니다.

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
- 직전 관련 SHA: `7cb0d32b5be3` — `test(ci): process 검증 job contract 확인`
- 다음 관련 SHA: `0ae1ded2c56f` — `test(ci): guest browser job 요구 검증`

### 5.7. `test(ci): guest browser job 요구 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `0ae1ded2c56f` |
| Importance | B |
| Tags | WEB, OPERATIONS, TEST |
| Source에서 확정된 역할 | 별도 guest job, mode 값, Playwright command와 guest spec 존재를 workflow contract로 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `tests/ci-contract.test.mjs`에 guest job 이름, `APP_MODE: demo`, public app mode, guest Playwright command assertion이 추가되는지 확인합니다.
- guest spec file 존재 검사와 workflow text literal 검사가 어떤 producer/consumer 경계를 보호하는지 확인합니다.
- static assertion이 guest browser process를 실제로 실행하거나 DB 비접속을 network level에서 증명하지 않는다고 기록합니다.

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
- 직전 관련 SHA: `bf0bc1199c84` — `ci(e2e): 비회원 체험 browser job 실행`
- 다음 관련 SHA: `f35728f4ef92` — `test(repo): 정적 계약 검사 명령 연결`

### 5.8. `test(repo): 정적 계약 검사 명령 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `f35728f4ef92` |
| Importance | B |
| Tags | PERSISTENCE, OPERATIONS, TEST |
| Source에서 확정된 역할 | CI, production Docker, load harness contract suite를 하나의 root command와 Make target으로 연결합니다. |

#### 해당 SHA에서 확인할 실제 코드

- root `package.json`의 `test:contracts`가 CI contract, Docker production contract, load/fault harness static tests를 어떤 순서로 호출하는지 확인합니다.
- `Makefile` target이 동일 package script를 재사용해 local/CI entrypoint drift를 줄이는지 확인합니다.
- 한 하위 static test의 non-zero가 aggregate command를 중단시키는 shell semantics와 실행 증거가 아닌 source contract 성격을 기록합니다.

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
- 직전 관련 SHA: `0ae1ded2c56f` — `test(ci): guest browser job 요구 검증`
- 다음 관련 SHA: `4f9e66c35586` — `ci(repo): 정적 계약 검사 실행`

### 5.9. `ci(repo): 정적 계약 검사 실행`

| 항목 | 값 |
| --- | --- |
| SHA | `4f9e66c35586` |
| Importance | B |
| Tags | PERSISTENCE |
| Source에서 확정된 역할 | repository static contract suite를 CI에서 실행합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `.github/workflows/ci.yml` verify job에서 unit 뒤, build 전 `pnpm test:contracts`가 실행되는 exact 위치를 확인합니다.
- static contract failure가 production build/process jobs 전에 repository gate를 fail-fast하는지 확인합니다.
- hosted runner에서 실제 command 결과를 이 환경에서는 재실행하지 않았음을 구분합니다.

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
- 직전 관련 SHA: `f35728f4ef92` — `test(repo): 정적 계약 검사 명령 연결`
- 다음 관련 SHA: `65512bc24161` — `fix(ci): 브라우저 E2E API origin 정렬`

### 5.10. `fix(ci): 브라우저 E2E API origin 정렬`

| 항목 | 값 |
| --- | --- |
| SHA | `65512bc24161` |
| Importance | B |
| Tags | AUTH, REALTIME, WEB |
| Source에서 확정된 역할 | browser E2E API origin을 cookie semantics와 맞는 `localhost`로 정렬합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `.github/workflows/ci.yml` process/browser env에서 `API_BASE_URL`이 `http://127.0.0.1:4000`에서 `http://localhost:4000`으로 바뀌는 exact diff를 확인합니다.
- browser가 Web/login을 `localhost`로 방문하고 host-only HttpOnly session cookie를 받은 뒤 API request host가 달라 cookie를 보내지 않는 previous failure를 연결합니다.
- WebSocket URL은 one-time ticket admission path라 동일 cookie transport 요구가 없는 범위를 구분합니다.

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
- 직전 관련 SHA: `4f9e66c35586` — `ci(repo): 정적 계약 검사 실행`
- 다음 관련 SHA: `527921bc9d69` — `test(ci): 브라우저 E2E cookie origin 계약 검증`

### 5.11. `test(ci): 브라우저 E2E cookie origin 계약 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `527921bc9d69` |
| Importance | B |
| Tags | AUTH, WEB, OPERATIONS |
| Source에서 확정된 역할 | CI contract가 API base URL의 exact cookie origin을 고정하도록 합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `tests/ci-contract.test.mjs`에 `API_BASE_URL: http://localhost:4000` exact assertion이 추가되는지 확인합니다.
- generic loopback reachability가 아니라 browser cookie host invariant를 literal로 보호하는 이유를 `65512bc24161`의 failure와 연결합니다.
- static source assertion은 실제 Set-Cookie, browser cookie attachment, authenticated response를 관찰하지 않는다고 기록합니다.

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
- 직전 관련 SHA: `65512bc24161` — `fix(ci): 브라우저 E2E API origin 정렬`

## 6. Invariant evolution ledger

| 시점 | 불변식 | 상태 | 실제 근거 |
| --- | --- | --- | --- |
| `a9f8b8609711` | root script와 Make target을 verification layer별 entrypoint로 정리합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `68404e51ea53` | push/PR에서 typecheck, unit, build를 실행하는 첫 repository CI 경계를 추가합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `0e360d333540` | PostgreSQL integration test를 독립 CI job에서 실행합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `3367b4266049` | production artifact와 PostgreSQL을 실제로 기동해 HTTP/WS smoke와 browser E2E까지 검증합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `7cb0d32b5be3` | workflow의 toolchain, frozen install, unit/integration/process/browser command 존재를 contract로 고정합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `bf0bc1199c84` | API/Web을 demo mode로 build/start하고 PostgreSQL 없이 guest-only Playwright suite를 실행합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `0ae1ded2c56f` | 별도 guest job, mode 값, Playwright command와 guest spec 존재를 workflow contract로 검증합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `f35728f4ef92` | CI, production Docker, load harness contract suite를 하나의 root command와 Make target으로 연결합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `4f9e66c35586` | repository static contract suite를 CI에서 실행합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `65512bc24161` | browser E2E API origin을 cookie semantics와 맞는 `localhost`로 정렬합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `527921bc9d69` | CI contract가 API base URL의 exact cookie origin을 고정하도록 합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |

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
checkout → pinned toolchain → frozen install
→ typecheck/unit/integration/static contracts
→ production build + artifact verification
→ PostgreSQL + migration
→ compiled API + production Web start
→ readiness → HTTP smoke → WebSocket smoke → browser E2E
```

위 흐름을 각 단계의 실제 파일, command, artifact, process와 연결해 다시 작성합니다.

## 11. 교차 카테고리 연결

- `08-verification-and-test-architecture`: smoke/E2E 자체의 test design과 증명 범위
- `02-production-build-and-package-artifacts.md`: CI가 먼저 생성하고 검사하는 artifact
- `03-container-images-and-production-runtime-lifecycle.md`: Docker/Compose delivery contract와의 연결

## 12. 학습 완료 체크

- [ ] 모든 Commit map SHA를 exact historical state에서 확인했습니다.
- [ ] build와 runtime을 final HEAD에서 과거로 소급하지 않았습니다.
- [ ] artifact producer/consumer와 package/image/process owner를 설명할 수 있습니다.
- [ ] production config와 secret의 fail-closed 조건을 설명할 수 있습니다.
- [ ] CI/test가 실제로 증명하는 delivery 범위와 증명하지 않는 범위를 구분할 수 있습니다.
- [ ] fix와 regression evidence를 실제 이전 failure/가정에 연결했습니다.
- [ ] 실행하지 않은 Docker/CI 결과를 실행 증거로 기록하지 않았습니다.
