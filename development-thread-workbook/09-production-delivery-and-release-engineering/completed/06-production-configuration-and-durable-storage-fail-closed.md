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
| 직전 관련 상태 | production env test fixture는 mode와 secret 등은 제공했지만 durable DB URL을 명시하지 않았습니다. 당시 parser가 이를 요구하지 않아 valid production fixture로 사용됐습니다. |
| 해결하려던 문제 | 곧 production DB requirement를 fail-closed하면 기존 valid fixture가 모두 의도와 무관하게 실패해 핵심 regression case와 fixture maintenance failure가 섞입니다. |
| 핵심 결정 | 공통 explicit production fixture에 PostgreSQL `DATABASE_URL`을 먼저 추가했습니다. |
| build → package → execute 흐름 | test setup → valid production fixture 생성 → 후속 parser/tests가 durable DB가 있는 정상 production baseline으로 재사용합니다. |
| ownership/lifetime/cleanup | test fixture가 valid input baseline을 소유하고 production parser는 다음 commit까지 unchanged입니다. |
| failure/rollback/fail-closed | 이 SHA 단독으로 DB 없는 production을 거부하지 않습니다. |
| 보장하는 것 | production test baseline이 durable DB를 명시하는 새 의도에 준비됩니다. |
| 보장하지 않는 것 | runtime behavior, memory fallback 차단, PostgreSQL 연결을 증명하지 않습니다. |
| 후속 연결 | `eb675ef74af3`이 parser에 production DB requirement를 추가하고 이 fixture를 정상 path로 소비합니다. |

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
| 직전 관련 상태 | DB URL이 없을 때 repository composition은 memory implementation을 선택할 수 있었고 production mode도 configuration parsing을 통과했습니다. process가 시작·health 응답하면서 실제로는 durable PostgreSQL을 쓰지 않는 거짓 성공 상태가 가능했습니다. |
| 해결하려던 문제 | production match/tournament/profile 결과가 process memory에만 저장되면 restart·replica 이동에서 사라지고, operator는 healthy service를 durable deployment로 오인할 수 있습니다. 이는 단순 feature degradation이 아니라 data-integrity/release contract 위반입니다. |
| 핵심 결정 | resolved mode가 production이면 `DATABASE_URL`을 필수로 검사하고 부재 시 configuration parsing 자체를 실패시켰습니다. explicit `APP_MODE=production`과 `NODE_ENV=production` inference가 같은 requirement를 거칩니다. demo mode는 의도된 memory path로 남겼습니다. |
| build → package → execute 흐름 | raw process env → schema/basic parse → application mode resolve (`APP_MODE` 우선 또는 `NODE_ENV` inference) → production predicate → DB URL present 확인 → 없으면 error/throw 후 startup 중단; 있으면 parsed config 반환 → repository/application/server construction. |
| ownership/lifetime/cleanup | environment provider가 raw value를, parser가 mode/DB consistency invariant를, repository factory가 parser 성공 이후 backend lifetime을 소유합니다. fail-closed하면 backend·server resource는 아직 획득되지 않습니다. |
| failure/rollback/fail-closed | production + missing DB는 startup 전 deterministic configuration error입니다. 잘못된 URL·접속 거부·migration 누락은 URL 존재 검사를 통과한 뒤 DB connection/readiness 단계에서 별도로 실패해야 합니다. demo는 missing DB가 failure가 아닙니다. |
| 보장하는 것 | production process가 durable backend 주소 없이 memory repository로 조용히 기동하지 않습니다. 명시/추론 production 모두 동일하게 차단됩니다. |
| 보장하지 않는 것 | URL이 실제 PostgreSQL인지, credential이 유효한지, schema가 최신인지, writes가 transactionally durable한지는 보장하지 않습니다. production mode 자체의 모든 env/secret 요구도 이 한 branch가 포괄하지 않습니다. |
| 후속 연결 | `4633dfde208d`가 explicit production, inferred production, demo 세 boundary를 deterministic unit regression으로 고정합니다. |

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
| 직전 관련 상태 | parser fix는 존재했지만 explicit/inferred mode의 한쪽 branch가 후속 refactor에서 빠지거나 demo까지 과도하게 차단해도 별도 regression matrix가 없었습니다. |
| 해결하려던 문제 | mode resolution과 persistence requirement는 두 입력 경로와 하나의 의도된 예외를 포함합니다. 한 happy-path test만으로는 silent production fallback과 demo regression을 동시에 막을 수 없습니다. |
| 핵심 결정 | 세 deterministic unit case를 추가했습니다. explicit production missing DB 거부, NODE_ENV-inferred production missing DB 거부, demo missing DB 허용을 각각 assertion합니다. |
| build → package → execute 흐름 | 각 isolated env object → parser 호출 → production 두 case는 error/throw expectation → demo case는 parsed config/mode expectation. network·filesystem DB resource는 획득하지 않습니다. |
| ownership/lifetime/cleanup | unit test가 input env와 expected outcome을 소유하고 parser가 decision을 수행합니다. test 종료 시 external cleanup은 없습니다. |
| failure/rollback/fail-closed | production case가 성공하거나 demo case가 실패하면 test가 non-zero입니다. 이 test는 malformed URL, connection refusal, migration failure를 재현하지 않습니다. |
| 보장하는 것 | 테스트 실행 시 explicit/inferred production이 DB 없이 통과하지 않고 demo는 memory-capable mode로 남는 configuration matrix가 보호됩니다. |
| 보장하지 않는 것 | PostgreSQL reachability, schema version, write durability, container/CI production startup은 증명하지 않습니다. 실제 DB integration/process evidence는 다른 Threads의 책임입니다. |
| 후속 연결 | Thread 03 production Compose의 required DB/one-shot migration과 Thread 04 PostgreSQL process job이 URL 존재 이후의 delivery path를 보완합니다. |

비교 기준:
- 직전 관련 SHA: `eb675ef74af3` — `fix(config): production에서 영속 저장소 요구`

## 6. Invariant evolution ledger

| 시점 | 불변식 | 상태 | 실제 근거 |
| --- | --- | --- | --- |
| `97d7ca714293` | production configuration fixture에 PostgreSQL URL을 명시합니다. | 준비 | `apps/api/src/env.test.ts`의 valid production fixture가 후속 fail-closed parser contract에 필요한 DB URL을 선행 포함합니다. |
| `eb675ef74af3` | `DATABASE_URL`이 없는 production configuration을 parsing 단계에서 거부합니다. | 수정 | `apps/api/src/env.ts`의 mode-resolved validation이 production missing DB를 application construction 전에 거부합니다. |
| `4633dfde208d` | 명시/추론 production의 DB 누락 거부와 demo memory 허용을 검증합니다. | 회귀 검증 | `apps/api/src/env.test.ts`의 세-case matrix가 production fail-closed와 demo exception을 결정적으로 보호합니다. |

## 7. Failure → Fix → Test 연결

| 이전 가정 또는 failure | Fix | Regression/contract evidence | 학습자 설명 |
| --- | --- | --- | --- |
| production에서 DB URL 부재를 memory repository로 fallback해도 process가 정상처럼 시작할 수 있음 | `eb675ef74af3` | `4633dfde208d` | mode resolution 직후 fail-closed하고 explicit/inferred production 두 경로를 test합니다. |
| production requirement를 강화하면서 demo까지 DB 필수로 만들 위험 | `eb675ef74af3`의 mode-specific branch | `4633dfde208d` demo case | durability requirement를 production에만 적용하고 demo의 제한된 transient storage contract를 유지합니다. |

## 8. Artifact·process·resource ownership

| 대상 | 생성/빌드 주체 | 소비/실행 주체 | lifetime | 실패 시 정리/차단 |
| --- | --- | --- | --- | --- |
| raw environment | process/Compose/CI operator | `apps/api/src/env.ts` parser | process startup lifetime | schema/mode/DB invariant 실패 시 parsed config 미생성 |
| resolved application mode | env parser | repository/application composition | API process lifetime | production missing DB는 consumer 호출 전 차단 |
| durable repository config | `DATABASE_URL` provider | PostgreSQL repository/pool | process/connection lifetime | URL 부재는 parse fail; 접속/migration failure는 후속 DB layer |
| regression evidence | `apps/api/src/env.test.ts` | unit test/CI | test process lifetime | three-case matrix mismatch 시 test failure; external DB evidence 없음 |

## 9. Thread 최종 상태

- 최종 delivery owner: environment parser가 production mode와 durable DB requirement의 fail-closed boundary를, repository composition이 parser 성공 후 backend lifetime을, unit tests가 mode matrix regression을 소유합니다.
- source와 production artifact의 관계: compiled API artifact도 startup에서 동일 env parser를 실행하므로 source/build 형식과 무관하게 production DB requirement가 적용됩니다.
- build-time과 runtime configuration의 관계: `DATABASE_URL`, `APP_MODE`, `NODE_ENV`는 API runtime configuration이며 Web build-time public mode와 별도입니다.
- startup/readiness/shutdown contract: configuration parse가 가장 앞선 gate입니다. 통과 후에만 DB pool/repository/server startup과 readiness가 진행됩니다. shutdown 동작은 이 Thread 범위가 아닙니다.
- fail-closed 조건: explicit 또는 inferred production에서 DB URL이 없으면 startup 전에 거부합니다. demo missing DB는 의도된 허용 조건입니다.
- 검증 가능한 것과 외부 배포 환경에 남는 것: exact SHA parser/test diff로 decision matrix를 확인했습니다. unit command, PostgreSQL connection, migration, process startup은 이 세션에서 실행하지 않았습니다.

## 10. 최종 execution/delivery flow

```text
process environment
→ basic schema parse
→ application mode resolve
   ├─ `APP_MODE=production`
   └─ `APP_MODE` absent + `NODE_ENV=production`
→ production? `DATABASE_URL` required
   ├─ missing → configuration error → no repository/server acquisition
   └─ present → parsed config → PostgreSQL repository/startup path
`APP_MODE=demo` + no DB
→ parsed demo config → intentional memory repository path
unit matrix protects explicit production / inferred production / demo
```

위 흐름을 각 단계의 실제 파일, command, artifact, process와 연결해 다시 작성합니다.

## 11. 교차 카테고리 연결

- `03-container-images-and-production-runtime-lifecycle.md`: production Compose의 required DB secret, one-shot migration, API startup gate
- `04-ci-production-process-and-browser-delivery-verification.md`: 실제 PostgreSQL과 compiled process를 기동하는 delivery evidence
- `01-foundations-and-api-boundaries`: runtime mode와 configuration parsing 자체의 API boundary

## 12. 학습 완료 체크

- [x] 모든 Commit map SHA를 exact historical state에서 확인했습니다.
- [x] build와 runtime을 final HEAD에서 과거로 소급하지 않았습니다.
- [x] artifact producer/consumer와 package/image/process owner를 설명할 수 있습니다.
- [x] production config와 secret의 fail-closed 조건을 설명할 수 있습니다.
- [x] CI/test가 실제로 증명하는 delivery 범위와 증명하지 않는 범위를 구분할 수 있습니다.
- [x] fix와 regression evidence를 실제 이전 failure/가정에 연결했습니다.
- [x] 실행하지 않은 Docker/CI 결과를 실행 증거로 기록하지 않았습니다.
