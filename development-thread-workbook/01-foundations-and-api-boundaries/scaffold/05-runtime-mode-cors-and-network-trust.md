# Runtime mode·CORS·network trust

- 카테고리: `01-foundations-and-api-boundaries` — 애플리케이션 기반과 API 경계
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

초기 local environment default와 browser CORS 설정에서 출발해 development/test/production/demo mode, 강한 secret, explicit proxy trust, invalid mode fail-closed, production durable-storage requirement를 하나의 검증된 환경 parser로 수렴시키는 과정을 복원합니다.

이 문서는 Phase 1 category audit 후 동결된 scaffold를 기준으로 exact SHA의 구현 발전을 복원합니다.

### 직접 연결되는 불변식

- 환경별 capability는 `readAppMode`가 반환한 단일 validated mode에서 파생됩니다.
- explicit mode 오타는 development로 downgrade되지 않고 startup error가 됩니다.
- production은 강한 session secret과 `DATABASE_URL` 없이는 환경 parsing을 통과하지 못합니다.
- demo는 의도적으로 memory storage를 허용하며 proxy address parsing은 `TRUST_PROXY=1`일 때만 활성화됩니다.
- credentialed browser mutation에 필요한 origin, method, header는 CORS configuration에 명시됩니다.

## 2. 핵심 질문

- 초기 `readEnv` default와 mode-aware fail-closed parser 사이에 어떤 rule이 추가됩니까?
- explicit APP_MODE와 NODE_ENV fallback의 우선순위는 무엇이며 invalid explicit value를 왜 거부합니까?
- production과 demo의 persistence capability가 어떤 조건에서 갈라집니까?
- CORS method/header, `credentials: true`, proxy trust는 각각 다른 신뢰 결정을 어떻게 표현합니까?
- 이 Thread의 unit tests가 process startup·DB readiness·real browser를 증명하지 않는 이유는 무엇입니까?

## 3. 완료 기준

- Commit map의 모든 SHA를 지정 브랜치 ancestry에서 확인합니다.
- 각 SHA의 parent 또는 직전 관련 SHA와 비교해 변경 전후 상태를 구분합니다.
- 파일, symbol, caller/callee, 상태 mutation, failure branch, cleanup을 actual historical code로 기록합니다.
- Fix는 이전 가정과 root cause를, test는 production path와 증명/비증명 범위를 연결합니다.
- S/A/B/C 중요도에 맞춰 설명 깊이를 다르게 유지합니다.
- 실행하지 않은 command 결과를 작성하지 않으며 code inspection과 runtime evidence를 구분합니다.
- 마지막 SHA까지만 사용해 Thread 최종 owner, invariant, execution flow를 작성합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Thread 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `85ac2a949439` | `test(api): 실행 환경 기본값 검증` | B | PROTOCOL, PERSISTENCE, TEST | 명시적 환경 값과 local prototype default를 `readEnv` unit test로 고정합니다. |
| 2 | `66155cf8a27d` | `fix(api): 변경 요청용 CORS method와 header 허용` | B | AUTH, WEB | credentialed browser mutation에 필요한 method와 request header를 Fastify CORS 설정에 명시합니다. |
| 3 | `f801ccd09cf0` | `feat(guest): guest runtime 환경 경계 구성` | A | AUTH, WEB | `APP_MODE`, explicit proxy trust, 강한 session secret, browser-facing runtime URL을 환경 contract에 추가합니다. |
| 4 | `2b274686e6d4` | `fix(guest): 체험 환경의 runtime 복구 제한` | A | AUTH, REALTIME, RISK | 중복 runtime-mode parser를 제거하고 explicit `APP_MODE` 네 값을 허용하며 잘못된 값을 startup error로 처리합니다. |
| 5 | `eb675ef74af3` | `fix(config): production에서 영속 저장소 요구` | A | TOURNAMENT, OPERATIONS, RISK | production mode에서 `DATABASE_URL`이 없으면 memory repository로 fallback하지 않고 startup 전에 실패시킵니다. |
| 6 | `4633dfde208d` | `test(config): production memory fallback 거부 검증` | A | OPERATIONS, TEST | explicit `APP_MODE=production`과 inferred `NODE_ENV=production` 모두 DB URL 없이는 실패하고 demo만 null DB를 허용하는지 검증합니다. |

## 5. Commit별 학습 기록

### 5.1. `test(api): 실행 환경 기본값 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `85ac2a949439` |
| Importance | B |
| Tags | PROTOCOL, PERSISTENCE, TEST |
| Source에서 확정된 역할 | 명시적 환경 값과 local prototype default를 `readEnv` unit test로 고정합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/env.test.ts`에서 explicit port/DB/origin과 empty input default assertion을 확인합니다.
- input object를 직접 주입해 process-global environment mutation 없이 parser를 검사하는지 확인합니다.
- 이 시점에 mode/trust/strong-secret/production DB rule이 아직 없다는 범위를 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | [대상 production invariant를 test implementation과 production caller에서 확인해 작성합니다.] |
| 재현하는 failure/boundary | [재현하는 failure/boundary를 test implementation과 production caller에서 확인해 작성합니다.] |
| test technique | [test technique를 test implementation과 production caller에서 확인해 작성합니다.] |
| 통과하는 production path | [통과하는 production path를 test implementation과 production caller에서 확인해 작성합니다.] |
| 증명하는 것 | [증명하는 것를 test implementation과 production caller에서 확인해 작성합니다.] |
| 증명하지 않는 것 | [증명하지 않는 것를 test implementation과 production caller에서 확인해 작성합니다.] |
| 후속 회귀 방지 | [후속 회귀 방지를 test implementation과 production caller에서 확인해 작성합니다.] |

비교 기준:
- 이 commit의 parent와 비교합니다.
- 다음 관련 SHA: `66155cf8a27d` — `fix(api): 변경 요청용 CORS method와 header 허용`

### 5.2. `fix(api): 변경 요청용 CORS method와 header 허용`

| 항목 | 값 |
| --- | --- |
| SHA | `66155cf8a27d` |
| Importance | B |
| Tags | AUTH, WEB |
| Source에서 확정된 역할 | credentialed browser mutation에 필요한 method와 request header를 Fastify CORS 설정에 명시합니다. |

#### 해당 SHA에서 확인할 실제 코드

- parent와 `apps/api/src/app.ts`의 CORS option을 비교합니다.
- origin allowlist, `credentials: true`, methods, allowedHeaders가 함께 설정되는지 확인합니다.
- PATCH/DELETE preflight와 content-type/authorization header가 이전 default에서 막힐 수 있던 조건을 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

#### Fix 연결

| 단계 | 기록 |
| --- | --- |
| 이전 가정 | [이전 가정를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |
| 실제 실패 또는 위험 | [실제 실패 또는 위험를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |
| Root cause | [Root cause를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |
| 수정된 invariant | [수정된 invariant를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |
| 변경 코드 | [변경 코드를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |
| Regression evidence | [Regression evidence를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |

비교 기준:
- 직전 관련 SHA: `85ac2a949439` — `test(api): 실행 환경 기본값 검증`
- 다음 관련 SHA: `f801ccd09cf0` — `feat(guest): guest runtime 환경 경계 구성`

### 5.3. `feat(guest): guest runtime 환경 경계 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `f801ccd09cf0` |
| Importance | A |
| Tags | AUTH, WEB |
| Source에서 확정된 역할 | `APP_MODE`, explicit proxy trust, 강한 session secret, browser-facing runtime URL을 환경 contract에 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `.env.example`과 `apps/api/src/env.ts`에서 APP_MODE, TRUST_PROXY, API/web URL을 확인합니다.
- demo/production에서 UTF-8 32-byte 이상 secret을 요구하는 분기를 확인합니다.
- 초기 `readAppMode`가 explicit demo만 특별 취급하고 NODE_ENV production/test에 fallback하는 제한을 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

비교 기준:
- 직전 관련 SHA: `66155cf8a27d` — `fix(api): 변경 요청용 CORS method와 header 허용`
- 다음 관련 SHA: `2b274686e6d4` — `fix(guest): 체험 환경의 runtime 복구 제한`

### 5.4. `fix(guest): 체험 환경의 runtime 복구 제한`

| 항목 | 값 |
| --- | --- |
| SHA | `2b274686e6d4` |
| Importance | A |
| Tags | AUTH, REALTIME, RISK |
| Source에서 확정된 역할 | 중복 runtime-mode parser를 제거하고 explicit `APP_MODE` 네 값을 허용하며 잘못된 값을 startup error로 처리합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/env.ts::readAppMode`와 `app.ts`에서 local parser가 제거된 diff를 확인합니다.
- APP_MODE가 있으면 네 값만 통과하고, 없을 때만 NODE_ENV production/test에 fallback하는 우선순위를 확인합니다.
- 같은 commit의 guest rolling-window/ticket 제한은 이 Thread의 주 역할이 아니며 별도 guest category로 교차 참조함을 명시합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

#### Fix 연결

| 단계 | 기록 |
| --- | --- |
| 이전 가정 | [이전 가정를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |
| 실제 실패 또는 위험 | [실제 실패 또는 위험를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |
| Root cause | [Root cause를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |
| 수정된 invariant | [수정된 invariant를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |
| 변경 코드 | [변경 코드를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |
| Regression evidence | [Regression evidence를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |

비교 기준:
- 직전 관련 SHA: `f801ccd09cf0` — `feat(guest): guest runtime 환경 경계 구성`
- 다음 관련 SHA: `eb675ef74af3` — `fix(config): production에서 영속 저장소 요구`

### 5.5. `fix(config): production에서 영속 저장소 요구`

| 항목 | 값 |
| --- | --- |
| SHA | `eb675ef74af3` |
| Importance | A |
| Tags | TOURNAMENT, OPERATIONS, RISK |
| Source에서 확정된 역할 | production mode에서 `DATABASE_URL`이 없으면 memory repository로 fallback하지 않고 startup 전에 실패시킵니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/env.ts`에서 database URL을 먼저 local 변수로 만들고 production guard를 적용하는 위치를 확인합니다.
- demo mode는 null DB를 계속 허용하는지 확인합니다.
- composition root가 이 parser 결과를 사용하므로 guard가 repository factory 선택 전에 실행되는지 연결합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

#### Fix 연결

| 단계 | 기록 |
| --- | --- |
| 이전 가정 | [이전 가정를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |
| 실제 실패 또는 위험 | [실제 실패 또는 위험를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |
| Root cause | [Root cause를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |
| 수정된 invariant | [수정된 invariant를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |
| 변경 코드 | [변경 코드를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |
| Regression evidence | [Regression evidence를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |

비교 기준:
- 직전 관련 SHA: `2b274686e6d4` — `fix(guest): 체험 환경의 runtime 복구 제한`
- 다음 관련 SHA: `4633dfde208d` — `test(config): production memory fallback 거부 검증`

### 5.6. `test(config): production memory fallback 거부 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `4633dfde208d` |
| Importance | A |
| Tags | OPERATIONS, TEST |
| Source에서 확정된 역할 | explicit `APP_MODE=production`과 inferred `NODE_ENV=production` 모두 DB URL 없이는 실패하고 demo만 null DB를 허용하는지 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/env.test.ts`에서 strong secret을 제공해 secret guard가 아닌 DB guard만 격리하는지 확인합니다.
- explicit production과 NODE_ENV fallback production 두 경로를 각각 검사합니다.
- demo case가 null databaseUrl을 반환해 의도적 차이를 보호하는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | [대상 production invariant를 test implementation과 production caller에서 확인해 작성합니다.] |
| 재현하는 failure/boundary | [재현하는 failure/boundary를 test implementation과 production caller에서 확인해 작성합니다.] |
| test technique | [test technique를 test implementation과 production caller에서 확인해 작성합니다.] |
| 통과하는 production path | [통과하는 production path를 test implementation과 production caller에서 확인해 작성합니다.] |
| 증명하는 것 | [증명하는 것를 test implementation과 production caller에서 확인해 작성합니다.] |
| 증명하지 않는 것 | [증명하지 않는 것를 test implementation과 production caller에서 확인해 작성합니다.] |
| 후속 회귀 방지 | [후속 회귀 방지를 test implementation과 production caller에서 확인해 작성합니다.] |

비교 기준:
- 직전 관련 SHA: `eb675ef74af3` — `fix(config): production에서 영속 저장소 요구`

## 6. Invariant evolution

| 단계 | 관련 SHA | 기록 |
| --- | --- | --- |
| Local defaults | `85ac2a949439` | [해당 단계에서 invariant가 도입·확장·수정·검증된 근거를 작성합니다.] |
| Browser mutation allowlist | `66155cf8a27d` | [해당 단계에서 invariant가 도입·확장·수정·검증된 근거를 작성합니다.] |
| Mode/secret/trust introduction | `f801ccd09cf0` | [해당 단계에서 invariant가 도입·확장·수정·검증된 근거를 작성합니다.] |
| Single fail-closed mode owner | `2b274686e6d4` | [해당 단계에서 invariant가 도입·확장·수정·검증된 근거를 작성합니다.] |
| Production storage capability | `eb675ef74af3` | [해당 단계에서 invariant가 도입·확장·수정·검증된 근거를 작성합니다.] |
| Boundary verification | `4633dfde208d` | [해당 단계에서 invariant가 도입·확장·수정·검증된 근거를 작성합니다.] |

## 7. Failure → Fix → Test 관계

| Failure 또는 불충분한 상태 | Fix/구현 SHA | Test 또는 후속 증거 |
| --- | --- | --- |
| [이전 failure 또는 불충분한 상태를 작성합니다.] | `66155cf8a27d` | [fix가 만든 invariant와 test/후속 evidence를 작성합니다.] |
| [이전 failure 또는 불충분한 상태를 작성합니다.] | `2b274686e6d4` | [fix가 만든 invariant와 test/후속 evidence를 작성합니다.] |
| [이전 failure 또는 불충분한 상태를 작성합니다.] | `eb675ef74af3` → `4633dfde208d` | [fix가 만든 invariant와 test/후속 evidence를 작성합니다.] |

## 8. Ownership·state·responsibility 변화

| Owner | 최종 책임 | 명시적 비책임 |
| --- | --- | --- |
| `readEnv`/`readAppMode` | [최종 책임을 exact SHA로 작성합니다.] | [소유하지 않는 책임을 작성합니다.] |
| Fastify CORS plugin | [최종 책임을 exact SHA로 작성합니다.] | [소유하지 않는 책임을 작성합니다.] |
| Composition root | [최종 책임을 exact SHA로 작성합니다.] | [소유하지 않는 책임을 작성합니다.] |
| Configuration tests | [최종 책임을 exact SHA로 작성합니다.] | [소유하지 않는 책임을 작성합니다.] |

## 9. Thread 최종 상태

- [마지막 SHA 기준 architecture와 owner를 작성합니다.]
- [최종 invariant와 남은 non-guarantee를 작성합니다.]
- [다른 category로 넘기는 책임을 작성합니다.]

### 실행 검증 기록

- [실제로 실행한 exact SHA·command·결과를 작성합니다. 실행하지 못했다면 code inspection과 환경 제한을 구분해 작성합니다.]

## 10. 최종 실행 흐름

1. [첫 caller 또는 입력 경계를 작성합니다.]
2. [검증·상태 전이·resource 획득 순서를 작성합니다.]
3. [callee·output·failure 분기를 작성합니다.]
4. [cleanup 또는 최종 owner를 작성합니다.]

## 11. 학습 완료 확인

- [ ] 모든 Commit map SHA의 historical code를 확인했습니다.
- [ ] parent/직전 관련 상태와 현재 SHA를 구분했습니다.
- [ ] fix의 이전 가정·root cause·corrected invariant를 연결했습니다.
- [ ] test가 통과하는 production path와 비증명 범위를 구분했습니다.
- [ ] ownership/lifetime/cleanup과 failure path를 기록했습니다.
- [ ] 실행 evidence와 code inspection을 구분했습니다.
- [ ] 마지막 SHA 기준 최종 flow와 non-guarantee를 설명할 수 있습니다.
