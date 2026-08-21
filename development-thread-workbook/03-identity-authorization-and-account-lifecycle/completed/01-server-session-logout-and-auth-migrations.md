# Server session·logout·인증 migration

- 카테고리: `03-identity-authorization-and-account-lifecycle` — 신원·권한·계정 수명주기
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

등록 사용자 session이 repository에 처음 저장되는 시점부터 HTTP login/logout에 연결되고, client-side cookie 삭제만으로는 끝나지 않던 logout이 server-side revocation으로 수정된 뒤, 인증 모델 변경 시 기존 session만 안전하게 만료하는 migration으로 마무리되는 과정을 복원합니다.

이 문서는 exact SHA를 순서대로 확인해 설계 → 구현 → 실패 → 수정 → 검증을 복원합니다.

### 직접 연결되는 불변식

- 등록 사용자 session의 생성·조회·폐기는 `AppRepository`가 소유합니다.
- logout 이후 동일한 server session credential은 다시 인증에 성공하지 않아야 합니다.
- 인증 migration은 legacy session을 폐기하되 사용자·경기·rating history를 변경하지 않아야 합니다.

## 2. 핵심 질문

- PostgreSQL과 memory repository가 session identity를 각각 어디에 저장하며 만료를 어떻게 판단합니까?
- 초기 logout이 cookie만 지웠을 때 bearer/query credential이 계속 유효했던 이유는 무엇입니까?
- `readSessionToken`과 `deleteSession`이 어떤 순서로 호출되며 DB 삭제 실패 시 response는 어디까지 진행됩니까?
- 005 migration이 왜 session 전체 삭제를 선택했고, 보존 대상 테이블은 테스트에서 어떻게 고정됩니까?

## 3. 완료 기준

- Commit map의 모든 SHA가 지정 브랜치 ancestry에 속하는지 확인합니다.
- 각 SHA의 diff와 parent 또는 직전 관련 SHA의 실제 state를 구분합니다.
- 아래 commit-specific 파일·함수·SQL·테스트를 확인하고 generic 설명으로 대체하지 않습니다.
- Fix는 이전 가정 → 실제 실패 → root cause → corrected invariant → regression evidence로 연결합니다.
- 실행하지 않은 test/command는 실행한 것처럼 기록하지 않습니다.
- 마지막 SHA까지만 사용해 Thread의 최종 owner, state transition, guarantee와 non-guarantee를 정리합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Thread 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `4f65c6214321` | `feat(db): 사용자 session 저장 구현` | B | AUTH, REALTIME, PERSISTENCE | session creation/resolution을 repository abstraction에 추가합니다. |
| 2 | `1779df300611` | `feat(api): 로그인과 로비 HTTP 경계 구현` | B | AUTH, PERSISTENCE, WEB | repository-backed identity와 초기 HTTP login/logout 경계를 구성합니다. |
| 3 | `252befef9527` | `fix(api): logout 시 server session 폐기` | A | AUTH, REALTIME, PERSISTENCE | logout을 server-side security transition으로 수정합니다. |
| 4 | `bc789124b20b` | `test(api): logout session invalidation 검증` | B | AUTH, SIMULATION, TEST | logout의 server-side session invalidation을 API integration 수준에서 검증합니다. |
| 5 | `b93910708330` | `feat(db): legacy session을 안전하게 만료` | A | AUTH, PERSISTENCE | 인증 계약 전환 뒤 기존 session credential을 명시적 migration으로 만료합니다. |
| 6 | `0649b63a1ca9` | `test(db): 인증 migration 중 데이터 보존 검증` | A | AUTH, PERSISTENCE, TEST | legacy session migration이 credential만 지우고 durable domain history를 보존하는지 PostgreSQL에서 검증합니다. |

## 5. Commit별 학습 기록

### 5.1. `feat(db): 사용자 session 저장 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `4f65c6214321` |
| Importance | B |
| Tags | AUTH, REALTIME, PERSISTENCE |
| Source에서 확정된 역할 | session creation/resolution을 repository abstraction에 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.ts`의 `AppRepository.createSession`, `getSessionUser` 추가 전후를 비교합니다.
- `PostgresRepository.createSession`의 `randomUUID` 생성, `sessions` insert, 14일 `expires_at` 계산을 추적합니다.
- `PostgresRepository.getSessionUser`의 sessions/users join, token equality, `expires_at > now()` 조건과 `toSessionUser` 호출을 확인합니다.
- `MemoryRepository.sessions` Map의 key/value와 memory 구현에 만료 시간이 없는 차이를 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | `AppRepository`는 개발 사용자 upsert까지만 제공했고, 여러 HTTP 요청에 걸쳐 동일 사용자를 복원할 저장된 session identity가 없었습니다. |
| 해결하려던 문제 | API가 login 뒤의 요청을 사용자와 연결하려면 concrete DB에 직접 의존하지 않는 session 생성·해석 연산이 필요했습니다. |
| 핵심 결정 | 공통 interface에 `createSession(userId)`와 `getSessionUser(token)`을 추가하고 PostgreSQL과 memory 구현을 동시에 제공했습니다. PostgreSQL은 UUID token과 14일 만료를 저장하고, 조회 시 users와 join합니다. |
| 입력 → 상태 전이 → 출력 | caller가 user id로 `createSession` 호출 → UUID 생성 → PostgreSQL `sessions(token,user_id,expires_at)` insert 또는 memory Map 저장 → 이후 token으로 `getSessionUser` 호출 → 유효 row/user를 `SessionUser`로 변환하거나 `null` 반환. |
| ownership/lifetime/cleanup | repository가 token→user 연결을 보유합니다. caller는 raw token만 받습니다. PostgreSQL row는 DB 수명주기를 따르고 memory Map은 repository instance가 닫힐 때 함께 소멸합니다. |
| failure/rollback/retry | token이 없으면 `null`입니다. PostgreSQL insert/query 오류는 caller로 전파됩니다. memory에서 user가 사라졌거나 mapping이 없으면 `null`입니다. 이 SHA에는 session 삭제 API가 없습니다. |
| 보장하는 것 | PostgreSQL에서는 만료 전 token만 사용자로 해석하며, 두 repository가 같은 interface를 제공합니다. |
| 보장하지 않는 것 | token hash 저장, server-side logout, session row 청소, memory session 만료, 사용자 status 기반 거부는 아직 보장하지 않습니다. |
| 후속 연결 | `1779df300611`에서 HTTP login이 session을 만들고 여러 credential transport로 이를 읽습니다. |

비교 기준:
- 이 commit의 parent와 비교합니다.
- 다음 관련 SHA: `1779df300611` — `feat(api): 로그인과 로비 HTTP 경계 구현`

### 5.2. `feat(api): 로그인과 로비 HTTP 경계 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `1779df300611` |
| Importance | B |
| Tags | AUTH, PERSISTENCE, WEB |
| Source에서 확정된 역할 | repository-backed identity와 초기 HTTP login/logout 경계를 구성합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/app.ts`의 `buildApp`, `/auth/dev-login`, `/auth/logout`, `/me`, `/auth/me`, `/lobby` route를 확인합니다.
- dev login에서 `repo.upsertDevUser` → `repo.createSession` → `reply.setCookie('pp_session', ...)` 순서를 추적합니다.
- `currentUser`가 cookie, bearer header, parsed query, raw query를 어떤 우선순위로 선택하는지 확인합니다.
- logout route가 이 SHA에서는 `clearCookie`만 수행하고 repository를 호출하지 않는 점을 parent/후속 fix와 연결합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | session 저장 연산은 존재했지만 HTTP caller가 이를 생성·전달·해석하는 route가 없었습니다. |
| 해결하려던 문제 | 브라우저 login과 인증된 resource read를 repository session에 연결할 API composition이 필요했습니다. |
| 핵심 결정 | Fastify cookie/CORS 설정과 개발 login, logout, me/lobby route를 추가했습니다. login은 HttpOnly `pp_session` cookie를 설정하는 동시에 response body에도 raw token을 반환했습니다. |
| 입력 → 상태 전이 → 출력 | POST `/auth/dev-login` → body 기본값 적용 → user upsert → session 생성 → 14일 cookie 설정 → `{ user, token }` 반환. 인증 read는 `currentUser`가 cookie→bearer→query 순으로 token을 골라 repository 조회를 호출합니다. |
| ownership/lifetime/cleanup | repository가 session row를 소유하고 Fastify reply가 browser cookie 설정을 소유합니다. request별 identity 해석은 `currentUser` helper가 담당합니다. |
| failure/rollback/retry | body는 runtime schema로 검증되지 않고 기본값으로 대체됩니다. repository 오류는 route 오류로 전파됩니다. logout은 cookie만 지우므로 다른 transport나 보관된 token은 계속 유효합니다. |
| 보장하는 것 | login이 만든 repository session을 cookie·header·query를 통해 후속 route가 해석할 수 있습니다. |
| 보장하지 않는 것 | credential transport 단일화, secure cookie, server-side logout, active status 검사, production에서 dev login 차단은 아직 없습니다. |
| 후속 연결 | `252befef9527`이 logout의 client-only 삭제를 server-side revocation으로 수정합니다. |

비교 기준:
- 직전 관련 SHA: `4f65c6214321` — `feat(db): 사용자 session 저장 구현`
- 다음 관련 SHA: `252befef9527` — `fix(api): logout 시 server session 폐기`

### 5.3. `fix(api): logout 시 server session 폐기`

| 항목 | 값 |
| --- | --- |
| SHA | `252befef9527` |
| Importance | A |
| Tags | AUTH, REALTIME, PERSISTENCE |
| Source에서 확정된 역할 | logout을 server-side security transition으로 수정합니다. |

#### 해당 SHA에서 확인할 실제 코드

- parent의 `/auth/logout`가 `clearCookie`만 호출하는 상태와 이 SHA의 `repo.deleteSession(readSessionToken(request))`를 비교합니다.
- `apps/api/src/app.ts`의 `readSessionToken`이 기존 cookie/header/query 우선순위를 그대로 추출 helper로 분리하는 이유를 확인합니다.
- `packages/db/src/index.ts`의 interface, PostgreSQL `delete from sessions where token = ...`, memory `Map.delete`를 함께 추적합니다.
- DB delete await가 cookie clear보다 먼저 실행되므로 삭제 실패 시 어떤 response/cookie 상태가 남는지 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | logout은 browser의 `pp_session` cookie만 제거했습니다. response body나 storage에 남은 bearer/query token은 repository row가 유지되는 동안 `/me`에 재사용할 수 있었습니다. |
| 해결하려던 문제 | 사용자가 logout을 수행해도 server-side credential이 유효한 보안 결함이 있었습니다. |
| 핵심 결정 | credential 추출을 `readSessionToken`으로 공통화하고, logout에서 해당 token을 repository에서 삭제한 뒤 cookie를 지우도록 변경했습니다. 두 repository에 `deleteSession`을 추가했습니다. |
| 입력 → 상태 전이 → 출력 | POST `/auth/logout` → request에서 한 개 token 선택 → `repo.deleteSession` await → PostgreSQL DELETE 또는 Map.delete → `clearCookie` → `{ ok: true }`. |
| ownership/lifetime/cleanup | logout route가 revocation 명령을 시작하지만 실제 session state 변경은 repository가 소유합니다. cookie 정리는 DB 삭제 성공 뒤 Fastify reply가 수행합니다. |
| failure/rollback/retry | token이 없으면 repository 삭제는 no-op입니다. PostgreSQL DELETE가 실패하면 route는 cookie clear와 성공 response에 도달하지 않습니다. 선택된 한 token만 폐기합니다. |
| 보장하는 것 | 성공한 logout 뒤 그 요청에 제시된 server session token은 repository에서 더 이상 사용자로 해석되지 않습니다. |
| 보장하지 않는 것 | 동일 사용자의 다른 session 전체 폐기, 이미 열린 WebSocket 회수, 만료 row 일괄 정리, DB와 cookie 삭제의 원자성은 보장하지 않습니다. |
| 후속 연결 | `bc789124b20b`이 동일 bearer token의 logout 전 200·후 401 전이를 고정합니다. |

#### 최소 코드 근거

- SHA: `252befef9527`
- 파일: `apps/api/src/app.ts`
- 위치: `POST /auth/logout`
- 확인 목적: server revocation이 cookie clear보다 먼저 수행되는 순서

```ts
app.post("/auth/logout", async (request, reply) => {
  await repo.deleteSession(readSessionToken(request));
  reply.clearCookie("pp_session", { path: "/" });
  return { ok: true };
});
```

#### Fix 연결

| 단계 | 기록 |
| --- | --- |
| 이전 가정 | cookie를 지우면 logout이 완료된다는 가정이었습니다. |
| 실제 실패 또는 위험 | cookie 밖에 복사된 token을 다시 보내면 server session이 계속 인증되었습니다. |
| Root cause | logout route가 repository의 session row/Map entry를 변경하지 않았습니다. |
| 수정된 invariant | logout 성공은 client cookie 정리뿐 아니라 제시된 server session의 폐기를 포함합니다. |
| 변경 코드 | `apps/api/src/app.ts` `/auth/logout`, `readSessionToken`; `packages/db/src/index.ts` `deleteSession` implementations. |
| Regression evidence | `bc789124b20b`의 `invalidates the server session on logout` Fastify injection test. |

비교 기준:
- 직전 관련 SHA: `1779df300611` — `feat(api): 로그인과 로비 HTTP 경계 구현`
- 다음 관련 SHA: `bc789124b20b` — `test(api): logout session invalidation 검증`

### 5.4. `test(api): logout session invalidation 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `bc789124b20b` |
| Importance | B |
| Tags | AUTH, SIMULATION, TEST |
| Source에서 확정된 역할 | logout의 server-side session invalidation을 API integration 수준에서 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/app.test.ts`의 `invalidates the server session on logout` test를 확인합니다.
- login response의 raw token을 bearer header로 `/me` → `/auth/logout` → `/me`에 동일하게 재사용하는 순서를 기록합니다.
- test fixture가 memory repository와 `app.inject`를 사용하며 실제 browser cookie·network·PostgreSQL을 사용하지 않는 범위를 구분합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | production fix는 추가됐지만 같은 token을 logout 뒤 재사용하는 회귀를 자동으로 막는 테스트가 없었습니다. |
| 해결하려던 문제 | client cookie 상태와 무관하게 server credential 자체가 폐기되는지를 직접 검증해야 했습니다. |
| 핵심 결정 | dev login으로 받은 token을 bearer로 재사용해 logout 전 `/me` 200, logout 200, logout 후 `/me` 401을 확인하는 Fastify injection test를 추가했습니다. |
| 입력 → 상태 전이 → 출력 | login injection → token 추출 → bearer `/me` 200 → bearer logout → 같은 bearer `/me` 401. |
| ownership/lifetime/cleanup | test lifecycle은 기존 suite의 app/repository fixture가 소유합니다. 별도의 socket·DB container resource는 만들지 않습니다. |
| failure/rollback/retry | status code 하나라도 기대와 다르면 test가 실패합니다. delete 호출 횟수나 cookie header는 직접 관찰하지 않습니다. |
| 보장하는 것 | memory repository를 통과하는 실제 route path에서 동일 server token이 logout 뒤 인증되지 않음을 증명합니다. |
| 보장하지 않는 것 | PostgreSQL DELETE, real HTTP transport, browser cookie 제거, 여러 session 동시 revocation은 증명하지 않습니다. |
| 후속 연결 | `b93910708330`은 개별 logout이 아니라 인증 계약 변경 시 모든 legacy session을 migration으로 폐기합니다. |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | logout 성공 뒤 제시한 server session token은 재사용할 수 없습니다. |
| 재현하는 failure/boundary | cookie 삭제와 무관하게 동일 bearer token을 다시 보내는 경계입니다. |
| test technique | memory repository를 포함한 Fastify injection integration regression입니다. |
| 통과하는 production path | `/auth/dev-login` → `createSession` → `/me` → `/auth/logout` → `deleteSession` → `/me`. |
| 증명하는 것 | route와 memory repository가 200→401 state transition을 만듭니다. |
| 증명하지 않는 것 | PostgreSQL, 브라우저, 실제 network, 전체 사용자 session 폐기는 검증하지 않습니다. |
| 후속 회귀 방지 | logout을 다시 cookie-only 처리로 퇴행시키는 변경을 막습니다. |

비교 기준:
- 직전 관련 SHA: `252befef9527` — `fix(api): logout 시 server session 폐기`
- 다음 관련 SHA: `b93910708330` — `feat(db): legacy session을 안전하게 만료`

### 5.5. `feat(db): legacy session을 안전하게 만료`

| 항목 | 값 |
| --- | --- |
| SHA | `b93910708330` |
| Importance | A |
| Tags | AUTH, PERSISTENCE |
| Source에서 확정된 역할 | 인증 계약 전환 뒤 기존 session credential을 명시적 migration으로 만료합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/migrations/005_expire_legacy_sessions.sql`의 유일한 statement와 영향 table을 확인합니다.
- `packages/db/src/migrator.ts`의 `migrateDatabase(databaseUrl, targetMigration?)`와 `migrateTo`/`migrateToLatest` 분기를 확인합니다.
- migration이 users, matches, rating_history를 수정하지 않는다는 점을 SQL 자체와 후속 integration test로 연결합니다.
- 부분 session 선택이 아니라 `delete from sessions` 전체 삭제를 택한 운영 의미를 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | cookie-only·ticket 기반 인증으로 계약이 바뀌었지만 이전 방식으로 발급된 session rows는 DB에 남아 계속 해석될 가능성이 있었습니다. |
| 해결하려던 문제 | credential transport·trust model 변경 뒤 legacy session을 선택적으로 판별할 metadata가 없어, 기존 credential을 안전하게 계속 신뢰할 수 없었습니다. |
| 핵심 결정 | 005 migration에서 `sessions` table 전체를 비우고 모든 등록 사용자가 재인증하도록 했습니다. 테스트가 이전 migration 상태를 만들 수 있도록 migrator에 optional target을 추가했습니다. |
| 입력 → 상태 전이 → 출력 | migration provider가 005를 선택 → `delete from sessions` 실행 → Kysely migration metadata에 적용 기록. 테스트용 호출은 `migrateTo('004_...')`로 pre-migration state를 구성할 수 있습니다. |
| ownership/lifetime/cleanup | schema evolution은 migrator가 소유하고 session invalidation 범위는 SQL migration이 소유합니다. 사용자·경기 데이터의 owner table은 건드리지 않습니다. |
| failure/rollback/retry | migration 실행 오류는 migrator error로 보고되고 적용 완료로 기록되지 않습니다. 전체 삭제이므로 정상·비정상 legacy session을 구분하지 않습니다. |
| 보장하는 것 | 005가 성공한 PostgreSQL database에서는 기존 session row가 하나도 남지 않습니다. |
| 보장하지 않는 것 | memory repository session, 사용자별 선택적 유지, 무중단 reauthentication, concurrent request와의 application-level coordination은 보장하지 않습니다. |
| 후속 연결 | `0649b63a1ca9`이 004 상태의 실제 PostgreSQL에 session과 경기 이력을 만든 뒤 005의 최소 삭제 범위를 검증합니다. |

#### 최소 코드 근거

- SHA: `b93910708330`
- 파일: `packages/db/migrations/005_expire_legacy_sessions.sql`
- 위치: `migration body`
- 확인 목적: credential state만 전부 폐기하는 최소 migration

```sql
delete from sessions;
```

비교 기준:
- 직전 관련 SHA: `bc789124b20b` — `test(api): logout session invalidation 검증`
- 다음 관련 SHA: `0649b63a1ca9` — `test(db): 인증 migration 중 데이터 보존 검증`

### 5.6. `test(db): 인증 migration 중 데이터 보존 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `0649b63a1ca9` |
| Importance | A |
| Tags | AUTH, PERSISTENCE, TEST |
| Source에서 확정된 역할 | legacy session migration이 credential만 지우고 durable domain history를 보존하는지 PostgreSQL에서 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/postgres.integration.test.ts`의 `expires legacy sessions without changing users or match history` test를 확인합니다.
- `migrateDatabase(..., '004_friendship_tournament_invariants')`로 pre-005 schema를 만든 뒤 users/session/finalized match를 구성하는 순서를 추적합니다.
- `authMigrationSnapshot`의 users, matches, rating_history SQL column 집합과 정렬 기준을 기록합니다.
- 005 적용 뒤 `getSessionUser` null, sessions count 0, before/after snapshot equality, migration metadata 포함을 각각 어떤 assertion이 증명하는지 구분합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 005 SQL은 한 줄로 최소 범위를 보였지만 실제 migration lifecycle에서 다른 durable rows가 보존되는 자동 증거가 없었습니다. |
| 해결하려던 문제 | 인증 credential 폐기가 사용자 rating·경기 결과·rating history까지 손상시키지 않는지 실제 PostgreSQL에서 재현해야 했습니다. |
| 핵심 결정 | 격리 database를 004까지만 migration하고 두 사용자, 유효 session, finalized match를 만든 뒤 snapshot을 저장합니다. latest migration 후 session invalidation과 세 domain query 결과의 완전 동일성을 함께 검증합니다. |
| 입력 → 상태 전이 → 출력 | isolated DB → migrate to 004 → users/session/finalizeMatch 생성 → snapshot 및 session 유효성 확인 → migrate latest → session null/count 0 → users/matches/rating_history snapshot equality → migration name 확인. |
| ownership/lifetime/cleanup | `withIsolatedDatabase` fixture가 database/pool/repository cleanup을 소유합니다. test가 생성한 pre-migration state는 해당 isolated schema에 한정됩니다. |
| failure/rollback/retry | 005가 session을 남기거나 보존 column 중 하나를 바꾸거나 migration metadata를 기록하지 않으면 각각 독립 assertion이 실패합니다. |
| 보장하는 것 | 실제 PostgreSQL migration 경로에서 session rows만 제거되고 선택한 사용자·경기·rating history columns는 그대로임을 증명합니다. |
| 보장하지 않는 것 | 테스트에 포함되지 않은 모든 table/column, production traffic 중 migration, backup/restore, memory repository는 증명하지 않습니다. |
| 후속 연결 | 이 Thread의 최종 검증입니다. cookie-only transport와 WebSocket ticket 상세는 별도 core realtime Thread의 범위입니다. |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | auth migration은 legacy credential을 폐기하면서 durable account/game history를 보존합니다. |
| 재현하는 failure/boundary | 구버전 schema에 유효 session과 이미 확정된 경기 이력이 함께 존재하는 migration 경계입니다. |
| test technique | 격리된 실제 PostgreSQL을 사용하는 migration integration regression입니다. |
| 통과하는 production path | `migrateDatabase(target=004)` → repository writes/finalizeMatch → `migrateDatabase(latest)` → repository/SQL reads. |
| 증명하는 것 | session 0개, old token 무효, users/matches/rating_history selected state 보존, 005 적용 기록입니다. |
| 증명하지 않는 것 | 온라인 migration concurrency, 모든 schema object, memory backend, 운영 backup은 검증하지 않습니다. |
| 후속 회귀 방지 | 인증 migration이 account/history table을 함께 삭제하거나 005를 누락하는 회귀를 막습니다. |

비교 기준:
- 직전 관련 SHA: `b93910708330` — `feat(db): legacy session을 안전하게 만료`
- 이 Thread의 최종 상태와 비교합니다.

## 6. Invariant ledger

| Invariant | 도입/수정 SHA | 변화 | 검증/후속 보호 |
| --- | --- | --- | --- |
| session identity는 repository가 소유한다 | `4f65c6214321` | PostgreSQL row와 memory Map으로 도입 | `252befef9527`에서 삭제 연산까지 확장 |
| logout은 server credential을 폐기한다 | `252befef9527` | client cookie-only logout 결함을 수정 | `bc789124b20b`에서 동일 token 재사용으로 검증 |
| auth migration은 credential만 만료한다 | `b93910708330` | 005가 sessions 전체 삭제 | `0649b63a1ca9`에서 users/matches/rating_history 보존 검증 |

## 7. Failure → Fix → Test

| Failure/Risk | Fix | Test | 연결 근거 |
| --- | --- | --- | --- |
| cookie만 삭제해 bearer/query token이 계속 유효 | `252befef9527` | `bc789124b20b` | 동일 token으로 `/me` 200→logout→401 |
| 새 인증 계약 뒤 legacy session이 DB에 잔존 | `b93910708330` | `0649b63a1ca9` | 005 적용 전후 실제 PostgreSQL snapshot 비교 |

## 8. Ownership·state·responsibility 변화

| 관심사 | 최종 owner와 변화 |
| --- | --- |
| session state | `AppRepository`와 concrete repository가 token→user mapping 및 삭제를 소유합니다. |
| HTTP credential 전달 | Fastify route/helper가 request token 선택과 cookie 설정·삭제를 소유하지만 session validity는 결정하지 않습니다. |
| schema 전환 | Kysely migrator와 005 SQL이 legacy credential 전체 폐기를 소유합니다. |
| test resource | API test는 suite fixture, migration test는 isolated PostgreSQL fixture가 lifecycle을 소유합니다. |

## 9. Thread 최종 상태

### 최종 owner

등록 session의 authoritative state는 repository입니다. HTTP layer는 token을 전달하고 login/logout 명령을 조정하며, migration layer는 trust model 변경 시 기존 credential을 일괄 폐기합니다.

### 최종 execution flow

login에서 user upsert와 session 생성 후 cookie를 설정합니다. 인증 요청은 repository가 token을 현재 사용자로 해석합니다. logout은 제시된 token을 repository에서 먼저 삭제하고 cookie를 지웁니다. 인증 계약 전환 시 005 migration이 남은 legacy sessions를 전부 제거합니다.

### 최종 guarantee

성공한 logout token의 재사용 차단과, 005 적용 시 모든 PostgreSQL legacy session 폐기 및 핵심 durable history 보존이 코드와 regression test로 연결됩니다.

### 최종 non-guarantee

사용자 전체 device logout, session row TTL 청소, DB 삭제와 client cookie 삭제의 분산 원자성, 온라인 migration 무중단성은 이 Thread가 보장하지 않습니다.

## 10. Learning completion check

- [x] 모든 Commit map SHA의 exact diff와 관련 code path를 확인했습니다.
- [x] Importance별로 A commit은 failure/ownership을 깊게, B commit은 Thread 역할 중심으로 기록했습니다.
- [x] Fix와 regression test를 이전 failure에 연결했습니다.
- [x] 실제 실행 증거와 code inspection을 구분했습니다.
- [ ] Runtime test command 실행 — 로컬 checkout을 만들 GitHub network/DNS가 차단되어 실행하지 못했습니다. 따라서 문서에는 실행 성공을 주장하지 않습니다.
