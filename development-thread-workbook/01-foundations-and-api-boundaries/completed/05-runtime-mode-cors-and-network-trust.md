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
| 직전 관련 상태 | bootstrap이 환경 값을 읽었지만 default와 explicit override가 자동 검증되지 않았습니다. |
| 해결하려던 문제 | 환경 parser refactor가 local port, memory fallback, web origin을 조용히 바꿀 수 있었습니다. |
| 핵심 결정 | `readEnv`에 object를 직접 넘겨 명시 값과 빈 환경의 기본값을 unit test로 고정했습니다. |
| 입력 → 상태 전이 → 출력 | fixture object → `readEnv` → parsed port/databaseUrl/webOrigin assertion 순입니다. |
| ownership/lifetime/cleanup | 함수 호출이 반환 object만 만들며 외부 resource나 cleanup은 없습니다. |
| failure/rollback/retry | 잘못된 numeric port나 secret은 이 시점 test하지 않습니다. |
| 보장하는 것 | local default 4000, null DB, localhost origin과 explicit override를 증명합니다. |
| 보장하지 않는 것 | production safety, runtime mode, proxy trust는 증명하지 않습니다. |
| 후속 연결 | `f801ccd09cf0` 이후 test가 mode·secret·trust rule로 확장됩니다. |

#### 최소 코드 근거

`apps/api/src/env.test.ts`의 두 초기 test가 근거입니다.

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | 환경 parser가 explicit value를 우선하고 정해진 local default를 사용해야 합니다. |
| 재현하는 failure/boundary | 명시된 port/DB/origin과 빈 environment object입니다. |
| test technique | pure unit test with injected environment object |
| 통과하는 production path | input object → `readEnv` → `ApiEnv` |
| 증명하는 것 | 초기 precedence와 local defaults를 증명합니다. |
| 증명하지 않는 것 | process startup, invalid values, production resource availability는 증명하지 않습니다. |
| 후속 회귀 방지 | 환경 parser refactor가 기본 실행 계약을 바꾸는 회귀를 방지합니다. |

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
| 직전 관련 상태 | CORS는 origin과 credentials만 설정해 mutation method/header 허용을 plugin default에 맡겼습니다. |
| 해결하려던 문제 | browser preflight가 PATCH/DELETE 또는 JSON/authorization header를 허용받지 못해 route가 존재해도 호출 전에 차단될 수 있었습니다. |
| 핵심 결정 | GET, POST, PATCH, DELETE, OPTIONS와 content-type, authorization header를 명시했습니다. |
| 입력 → 상태 전이 → 출력 | browser preflight가 app CORS plugin에 도착하면 allowlist origin과 method/header 조건으로 response header가 생성됩니다. |
| ownership/lifetime/cleanup | Fastify CORS plugin 설정이 browser cross-origin admission rule을 소유합니다. |
| failure/rollback/retry | origin 배열은 고정 값과 configured origin을 포함하며 wildcard를 쓰지 않습니다. 실제 browser test는 이 commit에 없습니다. |
| 보장하는 것 | 정의된 origin에서 credentialed mutation에 필요한 method/header를 허용합니다. |
| 보장하지 않는 것 | CSRF 방어, cookie SameSite, arbitrary custom header, proxy trust는 보장하지 않습니다. |
| 후속 연결 | `f801ccd09cf0`이 mode/trust를 환경 contract에 추가하고 later HTTP boundary가 request-id header를 확장합니다. |

#### 최소 코드 근거

`apps/api/src/app.ts`의 CORS `methods`와 `allowedHeaders` diff가 근거입니다.

#### Fix 연결

| 단계 | 기록 |
| --- | --- |
| 이전 가정 | origin과 credentials만 지정해도 필요한 mutation preflight가 모두 허용될 것이라 가정했습니다. |
| 실제 실패 또는 위험 | PATCH/DELETE와 JSON/authorization header를 쓰는 browser request가 preflight에서 거부될 수 있었습니다. |
| Root cause | 허용 method/header가 application contract에 명시되지 않았습니다. |
| 수정된 invariant | browser가 실제 사용하는 method/header를 CORS allowlist에 명시해야 합니다. |
| 변경 코드 | `apps/api/src/app.ts` CORS registration options입니다. |
| Regression evidence | 이 commit에는 독립 browser regression test가 없으며 later API/browser suites가 통합 경로를 간접 검증합니다. |

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
| 직전 관련 상태 | 환경 parser는 port/DB/origin/secret만 반환하고 development/test/production/demo capability와 proxy trust를 구분하지 않았습니다. |
| 해결하려던 문제 | guest/demo와 production이 약한 default secret이나 forwarded header 신뢰를 암묵적으로 사용할 위험이 있었습니다. |
| 핵심 결정 | `ApiEnv`에 appMode와 trustProxy를 추가하고 demo/production에서 명시적 32-byte secret을 요구했으며 `.env.example`에 server/browser 값을 문서화했습니다. |
| 입력 → 상태 전이 → 출력 | `readEnv`가 mode를 먼저 결정하고 secret guard를 통과한 뒤 URL·trust 값을 반환합니다. `TRUST_PROXY`는 정확히 `"1"`일 때만 true입니다. |
| ownership/lifetime/cleanup | 환경 parser가 capability source를 소유하고 composition/app builder가 반환 값을 소비합니다. 생성되는 장기 resource는 없습니다. |
| failure/rollback/retry | unknown explicit `APP_MODE`는 이 SHA에서 development로 떨어질 수 있고 production DB 부재도 허용합니다. |
| 보장하는 것 | demo/production의 약한 secret을 startup 전에 거부하고 proxy trust를 opt-in으로 만듭니다. |
| 보장하지 않는 것 | 모든 explicit mode validation, single parser ownership, production persistence requirement는 아직 없습니다. |
| 후속 연결 | `2b274686e6d4`가 mode parser를 중앙화·fail-closed하고 `eb675ef74af3`가 DB requirement를 추가합니다. |

#### 최소 코드 근거

`f801ccd09cf0`, `apps/api/src/env.ts`의 핵심 guard:

```ts
if ((appMode === "demo" || appMode === "production") &&
    (!configuredSecret || Buffer.byteLength(configuredSecret, "utf8") < 32)) {
  throw new Error("SESSION_SECRET must be at least 32 bytes...");
}
```

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
| 직전 관련 상태 | env와 app에 mode 결정 로직이 중복되고 explicit `APP_MODE`는 demo 외 값을 제대로 표현하지 못했습니다. |
| 해결하려던 문제 | 오타나 unsupported mode가 development로 조용히 복구되면 secure cookie, route exposure, guest capability가 잘못 파생될 수 있었습니다. |
| 핵심 결정 | `readAppMode`를 export한 단일 함수로 만들고 explicit development/test/production/demo만 허용하며 그 외 값은 throw했습니다. |
| 입력 → 상태 전이 → 출력 | `APP_MODE` 존재 → allowlist 검사 → 반환/throw, 부재 → NODE_ENV production/test → development default 순입니다. app은 같은 함수를 import합니다. |
| ownership/lifetime/cleanup | env module이 runtime mode 해석을 단독 소유합니다. app은 결과로 capability를 파생합니다. |
| failure/rollback/retry | 잘못된 값은 startup 전에 예외로 중단됩니다. fallback recovery는 의도적으로 하지 않습니다. |
| 보장하는 것 | explicit mode가 오타로 약한 환경으로 downgrade되지 않고 모든 소비자가 같은 parser를 사용할 수 있습니다. |
| 보장하지 않는 것 | 이 commit에 함께 포함된 guest rate/ticket resource limit의 전체 correctness는 이 category가 보장하지 않습니다. |
| 후속 연결 | `eb675ef74af3`이 production mode의 storage capability를 fail-closed로 연결합니다. |

#### 최소 코드 근거

`2b274686e6d4`, `apps/api/src/env.ts`:

```ts
if (input.APP_MODE !== undefined) {
  if (["development", "test", "production", "demo"]
      .includes(input.APP_MODE)) return input.APP_MODE as ApiEnv["appMode"];
  throw new Error(`APP_MODE must be ...`);
}
```

#### Fix 연결

| 단계 | 기록 |
| --- | --- |
| 이전 가정 | unknown explicit mode도 development default로 복구해도 된다고 가정했고 env/app가 각자 mode를 해석했습니다. |
| 실제 실패 또는 위험 | 오타가 security capability를 낮추고 두 parser가 서로 다른 mode를 선택할 위험이 있었습니다. |
| Root cause | explicit-value allowlist와 single owner가 없었습니다. |
| 수정된 invariant | 명시된 mode는 유효할 때만 사용하고 잘못되면 startup을 중단하며 mode parsing은 한 함수가 소유해야 합니다. |
| 변경 코드 | `apps/api/src/env.ts::readAppMode`, `apps/api/src/app.ts` local parser 삭제입니다. |
| Regression evidence | 같은 SHA의 `env.test.ts`가 strong secret과 trust switch를 검사하고 later startup/config tests가 mode failure를 보호합니다. |

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
| 직전 관련 상태 | composition root는 DB URL이 없으면 모든 mode에서 memory repository를 선택했고 strong secret만 production을 구분했습니다. |
| 해결하려던 문제 | production이 정상 시작된 것처럼 보이면서 모든 사용자·경기 상태가 process 종료와 함께 사라질 수 있었습니다. |
| 핵심 결정 | `readEnv`가 production mode와 null `DATABASE_URL` 조합을 즉시 거부하도록 했습니다. |
| 입력 → 상태 전이 → 출력 | mode/secret parse → database URL 읽기 → production/null guard → 유효 `ApiEnv` 반환 → composition root factory 선택 순입니다. |
| ownership/lifetime/cleanup | env parser가 production storage capability 검증을 소유하고 repository factory는 이미 검증된 URL/null을 소비합니다. |
| failure/rollback/retry | guard failure는 startup 전에 throw합니다. DB 연결 가능성·migration readiness는 이 guard가 확인하지 않습니다. |
| 보장하는 것 | production은 memory fallback으로 시작할 수 없고 demo는 의도적으로 transient storage를 유지할 수 있습니다. |
| 보장하지 않는 것 | URL이 실제 DB에 연결되는지, schema가 current인지, data durability가 보장되는지는 별도 startup/readiness 책임입니다. |
| 후속 연결 | `4633dfde208d`가 explicit/inferred production과 demo 예외를 unit test로 고정합니다. |

#### 최소 코드 근거

`eb675ef74af3`, `apps/api/src/env.ts`:

```ts
const databaseUrl = input.DATABASE_URL ?? null;
if (appMode === "production" && !databaseUrl) {
  throw new Error("DATABASE_URL is required in production mode");
}
```

#### Fix 연결

| 단계 | 기록 |
| --- | --- |
| 이전 가정 | DB URL이 없으면 mode와 무관하게 memory repository로 실행해도 된다고 가정했습니다. |
| 실제 실패 또는 위험 | production state가 비영속 memory에 저장되어 process restart에서 사라질 수 있었습니다. |
| Root cause | runtime mode와 repository capability 사이 startup validation이 없었습니다. |
| 수정된 invariant | production은 durable repository URL 없이는 시작하지 않아야 하며 demo만 transient fallback을 허용할 수 있습니다. |
| 변경 코드 | `apps/api/src/env.ts::readEnv` production database guard입니다. |
| Regression evidence | `4633dfde208d`의 explicit/inferred production test입니다. |

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
| 직전 관련 상태 | production DB guard가 추가됐지만 mode 결정 두 경로와 demo 예외가 함께 유지되는지 자동 증거가 없었습니다. |
| 해결하려던 문제 | 한 경로만 test하면 inferred production이 memory로 빠지거나 demo까지 잘못 금지하는 회귀를 놓칠 수 있었습니다. |
| 핵심 결정 | 동일한 strong secret으로 explicit/inferred production을 각각 호출해 `DATABASE_URL` error를 기대하고 demo의 null DB를 확인했습니다. |
| 입력 → 상태 전이 → 출력 | environment fixture → `readAppMode` → secret guard 통과 → DB guard throw/return 순을 직접 실행합니다. |
| ownership/lifetime/cleanup | pure function test로 외부 resource와 cleanup이 없습니다. |
| failure/rollback/retry | 실제 DB 연결·process exit code·repository factory는 실행하지 않습니다. |
| 보장하는 것 | 두 production mode source가 모두 memory fallback을 거부하고 demo는 허용함을 결정적으로 증명합니다. |
| 보장하지 않는 것 | DATABASE_URL 유효성, connection readiness, migration 상태는 증명하지 않습니다. |
| 후속 연결 | 이 Thread의 production/demo storage capability 차이를 회귀 방지합니다. |

#### 최소 코드 근거

`apps/api/src/env.test.ts`의 세 environment object assertion이 근거입니다.

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | production은 mode 결정 방식과 무관하게 durable DB URL 없이는 환경 parsing에 실패해야 하고 demo만 null DB를 허용해야 합니다. |
| 재현하는 failure/boundary | explicit APP_MODE production, inferred NODE_ENV production, APP_MODE demo의 세 경계입니다. |
| test technique | pure configuration unit/boundary test |
| 통과하는 production path | environment object → `readEnv` → mode/secret/database guards |
| 증명하는 것 | production memory fallback 거부와 demo 예외를 정확히 증명합니다. |
| 증명하지 않는 것 | 실제 process startup, DB connection, migration/readiness는 증명하지 않습니다. |
| 후속 회귀 방지 | 환경 parser refactor가 production을 transient storage로 downgrade하는 회귀를 막습니다. |

비교 기준:
- 직전 관련 SHA: `eb675ef74af3` — `fix(config): production에서 영속 저장소 요구`

## 6. Invariant evolution

| 단계 | 관련 SHA | 기록 |
| --- | --- | --- |
| Local defaults | `85ac2a949439` | port, DB null, web origin과 explicit override를 unit test로 고정합니다. |
| Browser mutation allowlist | `66155cf8a27d` | CORS methods와 headers를 명시합니다. |
| Mode/secret/trust introduction | `f801ccd09cf0` | appMode, strong secret, explicit proxy trust를 환경 contract에 추가합니다. |
| Single fail-closed mode owner | `2b274686e6d4` | 중복 parser를 제거하고 invalid explicit mode를 거부합니다. |
| Production storage capability | `eb675ef74af3` | production의 memory fallback을 startup 전에 금지합니다. |
| Boundary verification | `4633dfde208d` | explicit/inferred production과 demo 차이를 unit test로 고정합니다. |

## 7. Failure → Fix → Test 관계

| Failure 또는 불충분한 상태 | Fix/구현 SHA | Test 또는 후속 증거 |
| --- | --- | --- |
| CORS default가 mutation preflight와 불일치 | `66155cf8a27d` | 실제 method/header allowlist를 추가합니다. |
| Mode parser 중복과 unknown value fallback | `2b274686e6d4` | single exported parser와 explicit allowlist/throw를 도입합니다. |
| Production이 memory로 정상 시작 가능 | `eb675ef74af3` → `4633dfde208d` | DB URL guard와 두 production source regression test를 추가합니다. |

## 8. Ownership·state·responsibility 변화

| Owner | 최종 책임 | 명시적 비책임 |
| --- | --- | --- |
| `readEnv`/`readAppMode` | 환경 값 parsing, mode/secret/storage/trust validation | DB connection readiness를 소유하지 않습니다. |
| Fastify CORS plugin | origin/method/header/credentialed preflight response | CSRF·cookie browser enforcement를 소유하지 않습니다. |
| Composition root | 검증된 env로 repository/app option 선택 | mode 문자열 해석을 중복하지 않습니다. |
| Configuration tests | pure environment fixture와 guard 결과 | 실제 process/browser/DB를 실행하지 않습니다. |

## 9. Thread 최종 상태

- 최종 SHA 기준으로 mode는 한 parser에서 결정되고 explicit 오타는 거부됩니다.
- demo/production은 강한 secret을 요구하며 production만 durable DB URL을 반드시 요구합니다.
- proxy trust는 명시적으로 opt-in이고 browser mutation용 CORS method/header가 선언됩니다.
- 실제 DB 연결·migration readiness·browser preflight 실행은 이 Thread의 code inspection과 unit tests만으로 증명되지 않습니다.

### 실행 검증 기록

- Source inspection: GitHub connector로 Commit map의 exact SHA diff와 필요한 historical file을 조회했습니다.
- Branch validation: branch-local `commit/commit-importance.md`가 선언한 433개 선형 이력에서 모든 참조 SHA와 source classification을 대조했고, 가장 이른 참조 `b625c4f9dfdc`는 branch HEAD 비교에서 merge base가 동일 SHA임을 확인했습니다.
- 실제 실행 시도: `git clone --branch web/ft_transcendence --single-branch https://github.com/seungwoo7050/42-archive.git /tmp/ft-transcendence-audit`
- 결과: exit status 128, `Could not resolve host: github.com`. 따라서 repository checkout, package install, test command는 실행하지 않았으며 runtime 결과를 주장하지 않습니다.

## 10. 최종 실행 흐름

1. environment object에서 explicit APP_MODE를 우선 검사합니다.
2. 없으면 NODE_ENV production/test를 해석하고 그 외는 development를 사용합니다.
3. demo/production이면 session secret byte length를 검사합니다.
4. production이면 DATABASE_URL 존재를 검사합니다.
5. TRUST_PROXY가 정확히 `1`인지 읽어 env object를 반환합니다.
6. composition root가 검증된 mode/DB/trust 값을 repository와 Fastify option에 전달합니다.
7. browser request는 configured CORS origin/method/header 규칙을 통과한 뒤 route에 도달합니다.

## 11. 학습 완료 확인

- [x] 모든 Commit map SHA의 historical code를 확인했습니다.
- [x] parent/직전 관련 상태와 현재 SHA를 구분했습니다.
- [x] fix의 이전 가정·root cause·corrected invariant를 연결했습니다.
- [x] test가 통과하는 production path와 비증명 범위를 구분했습니다.
- [x] ownership/lifetime/cleanup과 failure path를 기록했습니다.
- [x] 실행 evidence와 code inspection을 구분했습니다.
- [x] 마지막 SHA 기준 최종 flow와 non-guarantee를 설명할 수 있습니다.
