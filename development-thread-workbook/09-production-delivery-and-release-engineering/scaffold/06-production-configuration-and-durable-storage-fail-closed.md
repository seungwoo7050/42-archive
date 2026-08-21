# Production configuration과 durable storage fail-closed

- 카테고리: `09-production-delivery-and-release-engineering` — 제품 전달과 릴리스 엔지니어링
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

production configuration fixture를 먼저 durable PostgreSQL 전제에 맞춘 뒤, 명시적 `APP_MODE=production`과 `NODE_ENV=production` 모두에서 `DATABASE_URL`이 없으면 API startup 전에 거부하고, demo mode의 의도된 memory repository만 허용하는 release boundary를 복원합니다.

이 문서는 완성된 해설이 아니라 exact SHA를 순서대로 확인해 제품 전달 구조의 발전을 복원하기 위한 scaffold입니다.

### 직접 연결되는 불변식

- 명시적인 `APP_MODE=production`과 `NODE_ENV=production`에서 추론된 production은 모두 durable database URL을 요구합니다.
- production은 `DATABASE_URL` 부재를 memory repository 선택으로 조용히 대체하지 않습니다.
- DB requirement는 application/repository construction 이전 configuration parsing 단계에서 fail-closed합니다.
- demo mode는 PostgreSQL 없이 memory repository를 사용할 수 있는 별도의 제한된 trust/capability mode입니다.
- configuration unit test는 mode decision과 rejection을 증명하지만 PostgreSQL reachability, migration, transaction durability는 증명하지 않습니다.

## 2. 핵심 질문

- production fixture에 DB URL을 먼저 추가한 commit은 후속 parser 강화와 어떤 준비 관계를 가집니까?
- `APP_MODE`가 명시된 경우와 `NODE_ENV`에서 mode가 추론되는 경우는 어떤 동일 predicate로 DB requirement를 통과합니까?
- configuration parser가 언제 error를 반환하며 repository factory와 server startup은 그 이후에만 실행됩니까?
- production memory fallback이 match/tournament 결과에 어떤 거짓 성공과 durability 손실을 만들 수 있습니까?
- demo mode가 DB 없이 허용되는 것은 production 예외가 아니라 어떤 명시적 capability contract입니까?
- unit regression이 증명하는 configuration boundary와 실제 PostgreSQL delivery 검증 사이의 차이는 무엇입니까?

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
| 1 | `97d7ca714293` | `test(config): production fixture에 영속 DB 명시` | C | - | production configuration fixture에 PostgreSQL URL을 명시합니다. |
| 2 | `eb675ef74af3` | `fix(config): production에서 영속 저장소 요구` | A | TOURNAMENT, OPERATIONS, RISK | `DATABASE_URL`이 없는 production configuration을 parsing 단계에서 거부합니다. |
| 3 | `4633dfde208d` | `test(config): production memory fallback 거부 검증` | A | OPERATIONS, TEST | 명시/추론 production의 DB 누락 거부와 demo memory 허용을 검증합니다. |

## 5. Commit별 학습 기록

### 5.1. `test(config): production fixture에 영속 DB 명시`

| 항목 | 값 |
| --- | --- |
| SHA | `97d7ca714293` |
| Importance | C |
| Tags | - |
| Source에서 확정된 역할 | production configuration fixture에 PostgreSQL URL을 명시합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/env.test.ts`의 shared `explicitProductionEnv` fixture에 `DATABASE_URL`이 추가되는 exact diff를 확인합니다.
- 이 commit은 parser behavior를 아직 변경하지 않고 기존 production tests의 valid input contract만 선행 정렬한다는 점을 확인합니다.
- 후속 `eb675ef74af3`에서 DB requirement를 추가해도 unrelated production test가 fixture 누락으로 깨지지 않게 하는 준비 commit으로 해석합니다.

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
- 다음 관련 SHA: `eb675ef74af3` — `fix(config): production에서 영속 저장소 요구`

### 5.2. `fix(config): production에서 영속 저장소 요구`

| 항목 | 값 |
| --- | --- |
| SHA | `eb675ef74af3` |
| Importance | A |
| Tags | TOURNAMENT, OPERATIONS, RISK |
| Source에서 확정된 역할 | `DATABASE_URL`이 없는 production configuration을 parsing 단계에서 거부합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/env.ts`에서 raw env schema parse 뒤 application mode를 명시값 또는 `NODE_ENV`로 결정하는 흐름을 확인합니다.
- resolved mode가 `production`이고 `DATABASE_URL`이 없을 때 issue/error를 추가하거나 throw해 parsed config 반환을 차단하는 exact branch를 확인합니다.
- `demo` mode는 DB URL 없이 허용되고 이후 repository selection이 memory backend를 선택할 수 있는 경계를 확인합니다.
- configuration parsing이 `apps/api/src/index.ts`의 application/repository/server construction보다 앞서 호출되어 실패 시 port bind·memory state 생성·background runtime 시작이 없는지 caller를 추적합니다.
- 이전 assumption → production에서 silent memory fallback → process는 healthy지만 durable match/tournament state는 사라지는 risk → parser fail-closed invariant를 연결합니다.

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

### 5.3. `test(config): production memory fallback 거부 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `4633dfde208d` |
| Importance | A |
| Tags | OPERATIONS, TEST |
| Source에서 확정된 역할 | 명시/추론 production의 DB 누락 거부와 demo memory 허용을 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/env.test.ts`에서 `APP_MODE=production`이 명시됐지만 DB URL이 없는 case의 expected error를 확인합니다.
- `APP_MODE`가 없고 `NODE_ENV=production`으로 mode가 추론될 때도 동일하게 DB 누락을 거부하는 case를 확인합니다.
- `APP_MODE=demo` 또는 demo fixture에서 DB URL 없이 parse가 성공하고 memory repository 선택에 필요한 mode가 유지되는 case를 확인합니다.
- test가 parser function을 직접 호출해 외부 DB 없이 결정적으로 boundary를 재현하지만 actual PostgreSQL connection/migration/durability는 실행하지 않는다고 기록합니다.

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

## 6. Invariant evolution ledger

| 시점 | 불변식 | 상태 | 실제 근거 |
| --- | --- | --- | --- |
| `97d7ca714293` | production configuration fixture에 PostgreSQL URL을 명시합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `eb675ef74af3` | `DATABASE_URL`이 없는 production configuration을 parsing 단계에서 거부합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |
| `4633dfde208d` | 명시/추론 production의 DB 누락 거부와 demo memory 허용을 검증합니다. | [도입/확장/불충분/수정/검증] | [파일·command·assertion 작성] |

## 7. Failure → Fix → Test 연결

| 이전 가정 또는 failure | Fix | Regression/contract evidence | 학습자 설명 |
| --- | --- | --- | --- |
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
raw environment → mode resolution
production → durable DB requirement → startup allow/reject
demo → explicit transient memory path
configuration regression tests → delivery handoff
```

위 흐름을 각 단계의 실제 파일, command, artifact, process와 연결해 다시 작성합니다.

## 11. 교차 카테고리 연결

- `03-container-images-and-production-runtime-lifecycle.md`: production Compose의 required DB secret, one-shot migration, API startup gate
- `04-ci-production-process-and-browser-delivery-verification.md`: 실제 PostgreSQL과 compiled process를 기동하는 delivery evidence
- `01-foundations-and-api-boundaries`: runtime mode와 configuration parsing 자체의 API boundary

## 12. 학습 완료 체크

- [ ] 모든 Commit map SHA를 exact historical state에서 확인했습니다.
- [ ] build와 runtime을 final HEAD에서 과거로 소급하지 않았습니다.
- [ ] artifact producer/consumer와 package/image/process owner를 설명할 수 있습니다.
- [ ] production config와 secret의 fail-closed 조건을 설명할 수 있습니다.
- [ ] CI/test가 실제로 증명하는 delivery 범위와 증명하지 않는 범위를 구분할 수 있습니다.
- [ ] fix와 regression evidence를 실제 이전 failure/가정에 연결했습니다.
- [ ] 실행하지 않은 Docker/CI 결과를 실행 증거로 기록하지 않았습니다.
