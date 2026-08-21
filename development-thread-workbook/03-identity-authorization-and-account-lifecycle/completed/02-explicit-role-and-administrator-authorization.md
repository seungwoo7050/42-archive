# 명시적 role과 관리자 권한

- 카테고리: `03-identity-authorization-and-account-lifecycle` — 신원·권한·계정 수명주기
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

초기 administrator user listing/status mutation과 inline role check에서 시작해, 사용자 handle이 암묵적으로 privilege를 부여하던 규칙을 제거하고 repository/CLI의 명시적 role assignment와 현재 account status를 함께 검사하는 administrator authorization으로 발전하는 과정을 복원합니다.

이 문서는 exact SHA를 순서대로 확인해 설계 → 구현 → 실패 → 수정 → 검증을 복원합니다.

### 직접 연결되는 불변식

- 사용자가 선택하는 handle은 administrator privilege source가 될 수 없습니다.
- administrator route는 현재 session user가 존재하고 active이며 role이 `admin`인 경우에만 통과합니다.
- role assignment는 ordinary login과 분리된 repository/CLI operation을 통해서만 수행됩니다.

## 2. 핵심 질문

- 초기 `upsertDevUser`가 `admin` handle을 어떤 방식으로 role에 연결했고 테스트가 그 가정을 어떻게 사용했습니까?
- `setUserRoleByHandle`은 handle normalization, NPC 제외, not-found를 어떻게 처리합니까?
- dev seed의 admin 승격과 ordinary dev login의 role reset은 서로 어떤 차이가 있습니까?
- `requireAdmin`의 authentication → active status → role 검사 순서가 어떤 error code를 만듭니까?

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
| 1 | `fa6e7de259cf` | `feat(db): 관리자 상태 변경 저장 구현` | B | AUTH, PERSISTENCE | administrator user listing과 ban-state mutation을 repository에 추가합니다. |
| 2 | `e8bb6a4bf68b` | `feat(api): 토너먼트와 관리자 라우트 추가` | B | AUTH, PERSISTENCE, TOURNAMENT | administrator resource에 authentication과 inline role authorization을 적용합니다. |
| 3 | `1395d45a3665` | `test(api): 관리자 사용자 상태 변경 검증` | B | AUTH, PERSISTENCE, TEST | login부터 admin route와 memory repository status mutation까지 검증합니다. |
| 4 | `45225adcfcd9` | `feat(db): 명시적 사용자 role 할당 추가` | A | AUTH, PERSISTENCE | handle 기반 privilege를 제거하고 repository/CLI role assignment를 도입합니다. |
| 5 | `dae31d4a223c` | `test(auth): 명시적 role assignment 검증` | B | AUTH, PERSISTENCE, TEST | `admin` handle만으로 privilege가 생기지 않는지 PostgreSQL에서 검증합니다. |
| 6 | `c577fe2603e3` | `fix(auth): 정지된 관리자 login 거부` | A | AUTH, RISK | administrator authorization에 현재 account status를 포함합니다. |
| 7 | `aa037c5291fe` | `test(auth): 정지된 관리자 session 거부 검증` | B | AUTH, TEST | 정지 후 기존 administrator session의 privilege가 거부되는지 검증합니다. |

## 5. Commit별 학습 기록

### 5.1. `feat(db): 관리자 상태 변경 저장 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `fa6e7de259cf` |
| Importance | B |
| Tags | AUTH, PERSISTENCE |
| Source에서 확정된 역할 | administrator user listing과 ban-state mutation을 repository에 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.ts`의 `AppRepository.listAdminUsers`, `setUserBan` 추가와 PostgreSQL/memory 구현을 비교합니다.
- PostgreSQL의 users UPDATE와 admin_actions INSERT가 이 SHA에서는 별도 `this.db` statement인 점을 확인합니다.
- `packages/db/src/schema.ts`의 `AdminActionTable` actor/target nullability, action enum, reason, created_at을 확인합니다.
- memory 구현이 actor/reason을 저장하지 않고 user status만 바꾸는 backend 차이를 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | repository에는 administrator 전용 사용자 조회나 account status mutation operation이 없었습니다. |
| 해결하려던 문제 | 관리 기능이 concrete storage를 우회하지 않고 user status와 audit row를 변경할 공통 persistence API가 필요했습니다. |
| 핵심 결정 | `listAdminUsers`와 `setUserBan`을 interface에 추가했습니다. PostgreSQL은 최근 사용자 50명을 조회하고 status update 뒤 admin_actions insert를 실행하며, memory는 status만 변경했습니다. |
| 입력 → 상태 전이 → 출력 | caller가 actor/target/banned/reason 전달 → PostgreSQL users status/banned_at UPDATE returning → admin_actions INSERT → mapped target 반환. memory는 target Map row를 찾아 status만 변경합니다. |
| ownership/lifetime/cleanup | repository가 user status mutation을 소유합니다. PostgreSQL은 audit row도 저장하지만 이 SHA의 memory backend는 audit identity를 소유하지 않습니다. |
| failure/rollback/retry | target이 없으면 PostgreSQL update result/foreign-key 또는 `firstRow` 경로에서 실패할 수 있고 memory는 명시적으로 throw합니다. 두 SQL이 별도이므로 audit insert 실패 뒤 status만 반영될 위험이 있습니다. |
| 보장하는 것 | 두 backend에서 target status를 active/banned로 바꾸는 공통 호출 지점을 제공합니다. |
| 보장하지 않는 것 | route authorization, 명시적 role provisioning, PostgreSQL atomicity, memory audit parity는 아직 없습니다. |
| 후속 연결 | `e8bb6a4bf68b`이 repository operation을 role-gated HTTP routes에 연결합니다. |

비교 기준:
- 이 commit의 parent와 비교합니다.
- 다음 관련 SHA: `e8bb6a4bf68b` — `feat(api): 토너먼트와 관리자 라우트 추가`

### 5.2. `feat(api): 토너먼트와 관리자 라우트 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `e8bb6a4bf68b` |
| Importance | B |
| Tags | AUTH, PERSISTENCE, TOURNAMENT |
| Source에서 확정된 역할 | administrator resource에 authentication과 inline role authorization을 적용합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/app.ts`의 `/admin/users`, `/admin/users/:id/ban`, `/admin/users/:id/status` route를 확인합니다.
- 각 route의 `currentUser` null 검사와 `user.role !== 'admin'` 403 분기를 순서대로 기록합니다.
- request body의 optional `banned/status/reason` cast와 `manual review` 기본값이 runtime 검증 없이 repository로 전달되는 점을 확인합니다.
- 이 시점의 `upsertDevUser`가 handle `admin`에 role을 부여하는 전제와 route authorization을 연결합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | repository operation은 존재했지만 HTTP caller가 administrator identity를 증명하고 호출할 route가 없었습니다. |
| 해결하려던 문제 | 관리자 사용자 목록과 상태 변경을 authentication/authorization 뒤에 노출해야 했습니다. |
| 핵심 결정 | 세 admin route를 추가하고 `currentUser`가 없으면 401, role이 admin이 아니면 403을 반환한 뒤 repository를 호출하도록 했습니다. |
| 입력 → 상태 전이 → 출력 | request → session user resolve → null이면 401 → role 비교 → non-admin이면 403 → params/body cast → `listAdminUsers` 또는 `setUserBan` → response. |
| ownership/lifetime/cleanup | HTTP layer가 route-level authorization을 소유하고 repository가 durable mutation을 소유합니다. 검사 로직은 각 route에 중복돼 있습니다. |
| failure/rollback/retry | active/banned status는 검사하지 않습니다. malformed params/body도 strict schema로 막지 않습니다. repository 오류는 route error로 전파됩니다. |
| 보장하는 것 | 인증된 `admin` role 사용자만 admin resources를 호출하는 최초의 server-side gate를 제공합니다. |
| 보장하지 않는 것 | handle과 role 분리, suspended admin 차단, centralized authorization helper, audit atomicity는 아직 보장하지 않습니다. |
| 후속 연결 | `1395d45a3665`이 초기 handle-derived admin 경로의 happy path를 검증합니다. |

비교 기준:
- 직전 관련 SHA: `fa6e7de259cf` — `feat(db): 관리자 상태 변경 저장 구현`
- 다음 관련 SHA: `1395d45a3665` — `test(api): 관리자 사용자 상태 변경 검증`

### 5.3. `test(api): 관리자 사용자 상태 변경 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `1395d45a3665` |
| Importance | B |
| Tags | AUTH, PERSISTENCE, TEST |
| Source에서 확정된 역할 | login부터 admin route와 memory repository status mutation까지 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/admin.test.ts`의 suite setup/teardown과 memory repository seed를 확인합니다.
- handle `admin`으로 dev login한 뒤 response token을 bearer로 보내는 초기 privilege 가정을 기록합니다.
- target login → `/admin/users/:id/ban` → status `banned` assertion을 추적합니다.
- non-admin 거부, audit row, PostgreSQL, active status를 검증하지 않는 범위를 명시합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 관리 route가 추가됐지만 login부터 repository mutation까지 이어지는 자동 회귀 증거가 없었습니다. |
| 해결하려던 문제 | 초기 administrator happy path가 실제 Fastify route와 memory backend를 통과하는지 확인해야 했습니다. |
| 핵심 결정 | seeded memory repository에서 handle `admin`으로 login하고 target을 생성한 뒤 bearer token으로 ban route를 호출해 200과 `banned` status를 확인했습니다. |
| 입력 → 상태 전이 → 출력 | memory seed → admin dev login → target dev login → admin token/target id 추출 → POST ban → response status assertion. |
| ownership/lifetime/cleanup | test suite가 app/repository lifecycle을 setup/teardown합니다. authorization credential은 login response token입니다. |
| failure/rollback/retry | route가 200이 아니거나 returned status가 banned가 아니면 실패합니다. role의 출처 자체는 검증하지 않습니다. |
| 보장하는 것 | 초기 handle-derived admin happy path와 memory status mutation이 연결됩니다. |
| 보장하지 않는 것 | non-admin denial, explicit role assignment, audit persistence, PostgreSQL, suspended admin denial은 증명하지 않습니다. |
| 후속 연결 | `45225adcfcd9`이 이 테스트의 handle privilege 전제를 제거하고 fixture에 명시적 role assignment를 추가합니다. |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | admin role 사용자만 상태 변경 route의 성공 경로를 사용할 수 있습니다. |
| 재현하는 failure/boundary | 초기 구현의 login→authorization→memory mutation 통합 경계입니다. |
| test technique | Fastify injection과 memory repository를 사용하는 API integration happy-path test입니다. |
| 통과하는 production path | dev login → session lookup → inline role check → `setUserBan` → response mapping. |
| 증명하는 것 | 당시 `admin` handle fixture가 ban route를 성공시키고 target status를 변경합니다. |
| 증명하지 않는 것 | privilege source의 안전성, denial path, audit/transaction, PostgreSQL은 검증하지 않습니다. |
| 후속 회귀 방지 | 기본 admin route wiring과 status response가 끊기는 회귀를 막습니다. |

비교 기준:
- 직전 관련 SHA: `e8bb6a4bf68b` — `feat(api): 토너먼트와 관리자 라우트 추가`
- 다음 관련 SHA: `45225adcfcd9` — `feat(db): 명시적 사용자 role 할당 추가`

### 5.4. `feat(db): 명시적 사용자 role 할당 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `45225adcfcd9` |
| Importance | A |
| Tags | AUTH, PERSISTENCE |
| Source에서 확정된 역할 | handle 기반 privilege를 제거하고 repository/CLI role assignment를 도입합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.ts`의 PostgreSQL/memory `upsertDevUser`에서 handle 비교가 제거되고 role이 `user`로 설정·reset되는 diff를 확인합니다.
- `setUserRoleByHandle`의 `normalizeHandle`, `is_npc = false`, `returning *`, not-found error를 두 backend에서 비교합니다.
- development seed가 ordinary upsert 뒤 seed admin을 별도로 `admin`으로 승격하는 memory/PostgreSQL 경로를 확인합니다.
- `packages/db/src/cli.ts`와 package script `user:set-role`의 argument validation 및 repository close를 추적합니다.
- `apps/api/src/admin.test.ts` fixture가 login 뒤 `repo.setUserRoleByHandle`을 명시적으로 호출하도록 바뀐 이유를 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | ordinary dev login/upsert가 handle이 `admin`인지 검사해 role과 rating을 자동 부여했습니다. 사용자가 선택 가능한 문자열이 privilege source였습니다. |
| 해결하려던 문제 | `admin` handle을 선택하는 것만으로 administrator 권한을 얻는 privilege escalation 경로가 있었습니다. |
| 핵심 결정 | 모든 ordinary upsert를 `user` role로 고정하고, non-NPC user만 대상으로 하는 `setUserRoleByHandle` repository operation과 검증된 CLI command를 추가했습니다. development seed 승격은 별도 provisioning 단계로 남겼습니다. |
| 입력 → 상태 전이 → 출력 | ordinary login/upsert → role `user` 저장/갱신. 운영 provisioning은 CLI args 검증 → repository open → normalized handle로 non-NPC UPDATE/Map mutation → result 출력 → repository close. |
| ownership/lifetime/cleanup | ordinary identity creation은 privilege를 소유하지 않습니다. role state는 users row/MemoryUserRow가 소유하고, role 변경 권한은 application login과 분리된 repository/CLI 실행 경계에 있습니다. |
| failure/rollback/retry | handle 누락·role enum 위반은 CLI에서 즉시 실패합니다. 대상이 없거나 NPC뿐이면 repository가 `user not found`를 throw합니다. role 변경 자체의 actor/audit authorization은 이 operation에 없습니다. |
| 보장하는 것 | 사용자 입력 handle만으로 admin role이 생기지 않으며, 명시적 operation을 호출해야 role이 바뀝니다. |
| 보장하지 않는 것 | role-change audit, CLI 실행자의 OS-level 권한, concurrent provisioning, ordinary upsert가 기존 role을 유지하는 정책은 보장하지 않습니다. 실제로 dev upsert는 role을 `user`로 reset합니다. |
| 후속 연결 | `dae31d4a223c`이 실제 PostgreSQL에서 `admin` handle login은 user이고 명시적 assignment 뒤에만 admin이 됨을 검증합니다. |

#### 최소 코드 근거

- SHA: `45225adcfcd9`
- 파일: `packages/db/src/index.ts`
- 위치: `PostgresRepository.upsertDevUser / setUserRoleByHandle`
- 확인 목적: identity creation과 privilege assignment의 분리

```ts
values (..., 'user', false)
...
update users
set role = ${role}
where handle = ${normalizeHandle(handle)} and is_npc = false
returning *
```

비교 기준:
- 직전 관련 SHA: `1395d45a3665` — `test(api): 관리자 사용자 상태 변경 검증`
- 다음 관련 SHA: `dae31d4a223c` — `test(auth): 명시적 role assignment 검증`

### 5.5. `test(auth): 명시적 role assignment 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `dae31d4a223c` |
| Importance | B |
| Tags | AUTH, PERSISTENCE, TEST |
| Source에서 확정된 역할 | `admin` handle만으로 privilege가 생기지 않는지 PostgreSQL에서 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/postgres.integration.test.ts`의 `grants administrator access only through an explicit role assignment` test를 확인합니다.
- development seed 뒤 `upsertDevUser({ handle: 'admin' })`가 role `user`를 반환하는 assertion을 기록합니다.
- `setUserRoleByHandle('admin','admin')` 뒤 role `admin` assertion과 실제 route/CLI를 통과하지 않는 범위를 구분합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 코드는 handle privilege를 제거했지만 실제 PostgreSQL upsert와 role update가 그 invariant를 보존하는 integration evidence가 없었습니다. |
| 해결하려던 문제 | schema/query 차이로 PostgreSQL에서만 handle-based privilege가 남거나 assignment가 적용되지 않는 회귀를 막아야 했습니다. |
| 핵심 결정 | 격리 PostgreSQL에서 development seed를 만들고 같은 `admin` handle로 ordinary upsert한 결과가 user인지 확인한 뒤 explicit role operation 결과가 admin인지 확인했습니다. |
| 입력 → 상태 전이 → 출력 | isolated repository → development seed → `upsertDevUser(admin)` → expect user → `setUserRoleByHandle` → expect admin. |
| ownership/lifetime/cleanup | isolated PostgreSQL fixture가 DB lifecycle을 소유합니다. test는 repository interface만 사용합니다. |
| failure/rollback/retry | 두 role assertion 중 하나라도 다르면 실패합니다. HTTP authorization 또는 CLI parser는 실행하지 않습니다. |
| 보장하는 것 | PostgreSQL repository에서 handle과 role이 분리되고 explicit operation이 role을 변경함을 증명합니다. |
| 보장하지 않는 것 | memory parity, CLI authorization, role-change audit, admin route 성공/거부는 증명하지 않습니다. |
| 후속 연결 | `c577fe2603e3`은 role만 맞으면 정지된 account도 admin route를 통과하던 별도 authorization 결함을 수정합니다. |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | handle 문자열은 privilege source가 아니며 role 변경에는 explicit assignment가 필요합니다. |
| 재현하는 failure/boundary | `admin`이라는 공격 가능한 handle과 stored role 사이의 PostgreSQL boundary입니다. |
| test technique | 실제 PostgreSQL repository integration regression입니다. |
| 통과하는 production path | development seed/upsert SQL → role mapping → explicit role UPDATE → mapping. |
| 증명하는 것 | ordinary `admin` upsert는 user, explicit operation 뒤에는 admin입니다. |
| 증명하지 않는 것 | HTTP/CLI 실행 권한, audit, memory backend는 검증하지 않습니다. |
| 후속 회귀 방지 | handle 비교를 privilege assignment에 다시 도입하는 회귀를 막습니다. |

비교 기준:
- 직전 관련 SHA: `45225adcfcd9` — `feat(db): 명시적 사용자 role 할당 추가`
- 다음 관련 SHA: `c577fe2603e3` — `fix(auth): 정지된 관리자 login 거부`

### 5.6. `fix(auth): 정지된 관리자 login 거부`

| 항목 | 값 |
| --- | --- |
| SHA | `c577fe2603e3` |
| Importance | A |
| Tags | AUTH, RISK |
| Source에서 확정된 역할 | administrator authorization에 현재 account status를 포함합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/app.ts`의 `requireAdmin` parent와 이 SHA를 비교해 `isActive(user)` 검사가 추가된 정확한 위치를 확인합니다.
- 검사 순서가 no user→`unauthorized`, inactive→`suspended`, non-admin→`forbidden`임을 error helper와 연결합니다.
- 기존 session cookie가 있어도 `currentUser`가 현재 users row status를 다시 mapping하는지 해당 SHA의 session lookup을 확인합니다.
- 이 fix가 session row 자체를 삭제하거나 이미 열린 WebSocket을 닫지는 않는 범위를 후속 live-revocation Thread와 구분합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | `requireAdmin`은 session user 존재와 role만 검사했습니다. 계정이 banned로 바뀌어도 기존 session이 admin role을 계속 포함하면 admin route에 접근할 수 있었습니다. |
| 해결하려던 문제 | account suspension이 ordinary mutations에는 적용돼도 administrator capability에는 적용되지 않는 authorization bypass가 있었습니다. |
| 핵심 결정 | `requireAdmin`에서 role 검사 전에 `isActive(user)`를 호출하고 inactive user에는 typed `account_suspended` 403을 발생시키도록 했습니다. |
| 입력 → 상태 전이 → 출력 | admin request → `currentUser`로 현재 user projection 해석 → 없으면 401 → inactive면 403 account_suspended → role이 admin 아니면 403 forbidden → handler 실행. |
| ownership/lifetime/cleanup | current account status는 repository user row가 소유하고 `requireAdmin`이 매 요청마다 capability 결정을 소유합니다. session cookie는 identity pointer일 뿐 privilege snapshot이 아닙니다. |
| failure/rollback/retry | repository/session lookup 오류는 request failure로 전파됩니다. banned admin은 role이 맞아도 handler에 도달하지 않습니다. |
| 보장하는 것 | 기존 session을 보유한 suspended administrator도 다음 admin HTTP request에서 거부됩니다. |
| 보장하지 않는 것 | session 삭제, 이미 열린 realtime channel 즉시 회수, DB status change와 request race의 전역 직렬화는 보장하지 않습니다. |
| 후속 연결 | `aa037c5291fe`이 기존 admin cookie를 그대로 사용해 `/admin/actions`가 typed 403을 반환하는지 검증합니다. |

#### 최소 코드 근거

- SHA: `c577fe2603e3`
- 파일: `apps/api/src/app.ts`
- 위치: `requireAdmin`
- 확인 목적: authentication·status·role의 fail-closed 검사 순서

```ts
const user = await currentUser(repo, request);
if (!user) unauthorized();
if (!isActive(user)) suspended();
if (user.role !== "admin") forbidden();
return user;
```

#### Fix 연결

| 단계 | 기록 |
| --- | --- |
| 이전 가정 | admin role이 있으면 현재 account status와 무관하게 administrator capability가 유효하다는 가정이었습니다. |
| 실제 실패 또는 위험 | banned administrator의 이미 발급된 session이 admin actions에 계속 접근할 수 있었습니다. |
| Root cause | `requireAdmin`이 `currentUser`와 role만 검사하고 status를 누락했습니다. |
| 수정된 invariant | administrator capability는 active status와 admin role을 동시에 요구합니다. |
| 변경 코드 | `apps/api/src/app.ts` `requireAdmin`의 `if (!isActive(user)) suspended();`. |
| Regression evidence | `aa037c5291fe`의 existing administrator session test. |

비교 기준:
- 직전 관련 SHA: `dae31d4a223c` — `test(auth): 명시적 role assignment 검증`
- 다음 관련 SHA: `aa037c5291fe` — `test(auth): 정지된 관리자 session 거부 검증`

### 5.7. `test(auth): 정지된 관리자 session 거부 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `aa037c5291fe` |
| Importance | B |
| Tags | AUTH, TEST |
| Source에서 확정된 역할 | 정지 후 기존 administrator session의 privilege가 거부되는지 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/admin.test.ts`의 `rejects an existing administrator session after the account is banned` test를 확인합니다.
- suite가 미리 만든 `adminCookie`를 ban 전후 동일하게 사용한다는 점을 기록합니다.
- repository에서 admin self-ban → `/admin/actions` injection → 403 typed error envelope의 code/message/requestId assertion을 추적합니다.
- WebSocket·session deletion·PostgreSQL을 검증하지 않는 범위를 구분합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | `requireAdmin` status check가 추가됐지만 already-issued cookie가 실제 route에서 current status를 반영하는 회귀 테스트가 없었습니다. |
| 해결하려던 문제 | ban 이후 새 login만 막고 기존 session은 통과하는 퇴행을 방지해야 했습니다. |
| 핵심 결정 | 기존 admin cookie를 유지한 채 repository로 admin account를 ban하고 `/admin/actions`를 호출해 `account_suspended` 403 envelope를 확인했습니다. |
| 입력 → 상태 전이 → 출력 | seed admin/session cookie → `setUserBan(admin, admin, true)` → same cookie로 GET `/admin/actions` → requireAdmin status gate → 403. |
| ownership/lifetime/cleanup | suite fixture가 app/repository/cookie를 소유합니다. status mutation은 repository operation으로 수행합니다. |
| failure/rollback/retry | status code나 typed error fields가 다르면 실패합니다. session row가 남아 있는지는 의도적으로 허용합니다. |
| 보장하는 것 | 기존 administrator session도 현재 user status가 banned면 admin HTTP capability를 얻지 못합니다. |
| 보장하지 않는 것 | real PostgreSQL, network, 열린 WebSocket, 모든 non-admin route는 검증하지 않습니다. |
| 후속 연결 | 이 Thread의 최종 검증입니다. ordinary suspended user의 audit atomicity와 live socket 회수는 다음 Thread가 다룹니다. |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | active status와 admin role을 모두 만족해야 administrator route에 접근할 수 있습니다. |
| 재현하는 failure/boundary | 이미 발급된 admin session cookie를 account ban 뒤 재사용하는 boundary입니다. |
| test technique | memory repository를 포함한 Fastify injection authorization regression입니다. |
| 통과하는 production path | `setUserBan` → same-cookie `/admin/actions` → `currentUser` → `requireAdmin` → typed error boundary. |
| 증명하는 것 | old session이 403 `account_suspended`로 거부됩니다. |
| 증명하지 않는 것 | session row 삭제, WebSocket revocation, PostgreSQL은 검증하지 않습니다. |
| 후속 회귀 방지 | `requireAdmin`에서 status check가 빠지는 회귀를 막습니다. |

비교 기준:
- 직전 관련 SHA: `c577fe2603e3` — `fix(auth): 정지된 관리자 login 거부`
- 이 Thread의 최종 상태와 비교합니다.

## 6. Invariant ledger

| Invariant | 도입/수정 SHA | 변화 | 검증/후속 보호 |
| --- | --- | --- | --- |
| administrator operation은 server-side role gate 뒤 실행된다 | `e8bb6a4bf68b` | inline currentUser/role check로 도입 | `c577fe2603e3`에서 active status까지 확장 |
| handle은 privilege source가 아니다 | `45225adcfcd9` | ordinary upsert role을 user로 고정하고 explicit assignment 추가 | `dae31d4a223c` PostgreSQL test로 검증 |
| 기존 session도 현재 status를 따른다 | `c577fe2603e3` | requireAdmin이 status를 매 요청 검사 | `aa037c5291fe` same-cookie regression으로 검증 |

## 7. Failure → Fix → Test

| Failure/Risk | Fix | Test | 연결 근거 |
| --- | --- | --- | --- |
| `admin` handle만으로 role 획득 | `45225adcfcd9` | `dae31d4a223c` | ordinary upsert와 explicit assignment 결과를 분리 |
| banned administrator의 기존 session이 admin route 통과 | `c577fe2603e3` | `aa037c5291fe` | same cookie로 `/admin/actions` 403 검증 |

## 8. Ownership·state·responsibility 변화

| 관심사 | 최종 owner와 변화 |
| --- | --- |
| identity creation | ordinary `upsertDevUser`는 user role만 만들며 privilege를 소유하지 않습니다. |
| role state | users row/MemoryUserRow가 authoritative하고 `setUserRoleByHandle`이 명시적으로 변경합니다. |
| administrator capability | HTTP `requireAdmin`이 현재 identity, active status, role을 순서대로 판정합니다. |
| provisioning lifecycle | CLI가 args validation, repository open/call/close를 소유하지만 actor audit은 제공하지 않습니다. |

## 9. Thread 최종 상태

### 최종 owner

stored role과 account status는 repository user row가 소유합니다. ordinary login은 privilege를 만들지 않고, administrator capability는 request 시점의 `requireAdmin`이 current status와 role을 함께 읽어 결정합니다.

### 최종 execution flow

사용자는 ordinary login으로 user role session을 얻습니다. 별도 provisioning operation/CLI가 non-NPC user role을 변경합니다. admin request는 current user를 해석한 뒤 unauthenticated, suspended, non-admin을 차례로 거부하고 handler가 repository operation을 호출합니다.

### 최종 guarantee

handle-based privilege가 제거되고, explicit role assignment와 active-status-aware admin authorization이 PostgreSQL/API regression으로 보호됩니다.

### 최종 non-guarantee

role change audit·approval, CLI 호출자 인증, role 변경과 active session의 즉시 강제 logout, 이미 열린 realtime connection 회수는 이 Thread 범위 밖입니다.

## 10. Learning completion check

- [x] 모든 Commit map SHA의 exact diff와 관련 code path를 확인했습니다.
- [x] Importance별로 A commit은 failure/ownership을 깊게, B commit은 Thread 역할 중심으로 기록했습니다.
- [x] Fix와 regression test를 이전 failure에 연결했습니다.
- [x] 실제 실행 증거와 code inspection을 구분했습니다.
- [ ] Runtime test command 실행 — 로컬 checkout을 만들 GitHub network/DNS가 차단되어 실행하지 못했습니다. 따라서 문서에는 실행 성공을 주장하지 않습니다.
