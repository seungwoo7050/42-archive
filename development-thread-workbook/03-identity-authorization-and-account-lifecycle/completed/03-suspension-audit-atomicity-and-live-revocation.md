# 계정 정지 audit atomicity와 live revocation

- 카테고리: `03-identity-authorization-and-account-lifecycle` — 신원·권한·계정 수명주기
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

account status를 HTTP mutation과 WebSocket admission에 실제 authorization state로 적용하고 감사 기록을 노출한 초기 구현에서 출발해, status update와 audit insert를 한 PostgreSQL transaction으로 수정하고, ban 직후 이미 열린 authoritative WebSocket과 관련 runtime resource까지 회수하는 과정을 복원합니다.

이 문서는 exact SHA를 순서대로 확인해 설계 → 구현 → 실패 → 수정 → 검증을 복원합니다.

### 직접 연결되는 불변식

- suspended user는 보호된 HTTP mutation과 새 realtime admission을 수행할 수 없습니다.
- user status 변경과 대응하는 administrator action은 PostgreSQL에서 함께 commit되거나 함께 rollback됩니다.
- ban 성공 뒤 현재 authoritative realtime connection은 즉시 제거되고 동일 session으로 새 ticket도 발급받지 못합니다.

## 2. 핵심 질문

- 초기 suspension enforcement는 어떤 HTTP routes와 WebSocket handshake에 적용됐고 어떤 route에는 빠져 있었습니까?
- 초기 PostgreSQL `setUserBan`의 두 statement 사이에서 audit insert가 실패하면 어떤 partial state가 남습니까?
- CHECK constraint failure injection은 어느 call을 실패시키고 rollback 후 어떤 rows를 직접 조회합니까?
- `GameHub.revokeUser`가 heartbeat, snapshot buffer, queue, tournament waiter, input gate, room side, socket, presence를 어떤 순서로 정리합니까?
- DB commit과 in-memory revocation 사이에는 왜 하나의 transaction이 존재할 수 없으며 남는 failure window는 무엇입니까?

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
| 1 | `42033a6f2f3a` | `feat(admin): 감사 가능한 사용자 상태 API 추가` | A | AUTH, REALTIME, PERSISTENCE | account suspension을 presentation flag가 아닌 enforced authorization state와 audit read model로 만듭니다. |
| 2 | `bf797871007c` | `feat(admin): 감사 기록과 상태 변경 UI 추가` | B | AUTH, WEB | administrator interface를 reason-bearing status mutation과 audit-capable API에 연결합니다. |
| 3 | `e07726592df5` | `test(app): 전체 서비스 흐름 검증` | B | AUTH, REALTIME, PERSISTENCE | 전체 서비스 회귀 중 administrator audit와 suspension enforcement 경로를 함께 검증합니다. |
| 4 | `d0137660cd9f` | `fix(db): 차단 감사 기록을 원자적으로 저장` | A | AUTH, PERSISTENCE, RISK | user status update와 administrator-action insert를 하나의 PostgreSQL transaction으로 이동합니다. |
| 5 | `9106abc10d0e` | `test(db): 차단 감사 기록 atomicity 검증` | A | AUTH, PERSISTENCE, TEST | audit insert를 deterministic constraint violation으로 실패시켜 user status rollback을 검증합니다. |
| 6 | `40e5c520d49c` | `fix(auth): 정지된 사용자의 열린 연결 폐기` | A | AUTH, REALTIME, TOURNAMENT | ban persistence 직후 `GameHub.revokeUser`로 current socket과 realtime ownership을 회수합니다. |
| 7 | `454cbf2c95e0` | `test(auth): 계정 정지의 기존 WebSocket 차단 검증` | A | AUTH, REALTIME, TEST | 실제 server/socket에서 suspension 뒤 기존 connection close와 새 ticket 거부를 검증합니다. |

## 5. Commit별 학습 기록

### 5.1. `feat(admin): 감사 가능한 사용자 상태 API 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `42033a6f2f3a` |
| Importance | A |
| Tags | AUTH, REALTIME, PERSISTENCE |
| Source에서 확정된 역할 | account suspension을 presentation flag가 아닌 enforced authorization state와 audit read model로 만듭니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/app.ts` WebSocket session resolution 뒤 `user.status !== 'active'` close branch를 확인합니다.
- lobby chat, friend request, tournament create/join에 추가된 `isActive`/`suspended` guard와 빠진 read-only/admin route를 구분합니다.
- `/admin/actions` → `repo.listAdminActions`와 PostgreSQL row mapper의 actor/target lookup을 추적합니다.
- PostgreSQL `setUserBan`이 여전히 users UPDATE와 admin_actions INSERT를 별도 statement로 실행하는 점을 이후 atomicity fix와 연결합니다.
- memory `adminActions.unshift`와 target status mutation 순서 및 backend parity 한계를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | user status와 admin_actions schema/insert는 존재했지만 suspended 상태는 대부분 presentation data였고, protected mutations와 WebSocket admission에 일관되게 적용되지 않았습니다. |
| 해결하려던 문제 | ban된 account가 session을 이용해 chat/friend/tournament write나 새 realtime connection을 계속 시작할 수 있고, 운영자가 감사 기록을 조회할 API도 없었습니다. |
| 핵심 결정 | WebSocket authentication 직후 active status를 검사하고 주요 state-changing HTTP routes에 status guard를 추가했습니다. admin actions list API, repository read, row mapper, memory action storage도 연결했습니다. |
| 입력 → 상태 전이 → 출력 | HTTP mutation은 currentUser→active check→repository mutation으로 진행합니다. WebSocket은 session resolve→active check→inactive면 close 1008, active면 hub.connect입니다. admin audit read는 role check→listAdminActions→actor/target mapping입니다. |
| ownership/lifetime/cleanup | repository user row가 status를 소유하고 HTTP/WS admission boundary가 capability를 판정합니다. audit rows는 PostgreSQL 또는 memory list가 소유합니다. |
| failure/rollback/retry | PostgreSQL status UPDATE 뒤 audit INSERT가 실패하면 별도 autocommit 때문에 status만 남을 수 있습니다. 이미 hub에 연결된 socket은 이 handshake guard를 다시 통과하지 않으므로 계속 살아 있습니다. |
| 보장하는 것 | 이 SHA 이후 suspended user는 지정된 HTTP writes와 새 WebSocket admission을 통과하지 못하고 admin은 감사 목록을 읽을 수 있습니다. |
| 보장하지 않는 것 | admin status check, audit atomicity, 이미 열린 socket 회수, 모든 route의 중앙화된 status policy는 아직 보장하지 않습니다. |
| 후속 연결 | `bf797871007c`이 조치 사유 입력과 audit list를 browser admin 화면에 연결하고, `e07726592df5`가 초기 enforcement를 API test로 확인합니다. |

비교 기준:
- 이 commit의 parent와 비교합니다.
- 다음 관련 SHA: `bf797871007c` — `feat(admin): 감사 기록과 상태 변경 UI 추가`

### 5.2. `feat(admin): 감사 기록과 상태 변경 UI 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `bf797871007c` |
| Importance | B |
| Tags | AUTH, WEB |
| Source에서 확정된 역할 | administrator interface를 reason-bearing status mutation과 audit-capable API에 연결합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/admin/page.tsx`의 users/actions/reason/message local state와 initial `Promise.all` load를 확인합니다.
- `toggleUser`가 trimmed reason을 `setUserStatus`에 전달하고 users state를 교체한 뒤 `getAdminActions`로 refresh하는 순서를 추적합니다.
- `apps/web/src/lib/api.ts`의 `getAdminActions`, reason parameter 추가와 request body를 확인합니다.
- abort/cancellation, optimistic rollback, transaction enforcement가 browser에 없다는 점을 server invariant와 구분합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | server는 reason을 저장하고 actions를 읽을 수 있었지만 admin UI는 고정 reason으로 상태만 바꾸고 감사 목록을 표시하지 않았습니다. |
| 해결하려던 문제 | 운영자가 조치 사유를 명시하고 결과 audit trail을 확인할 browser workflow가 필요했습니다. |
| 핵심 결정 | admin page에 reason input과 action list state를 추가하고 users/actions를 함께 load합니다. 상태 변경 성공 뒤 target row를 갱신하고 audit list를 다시 가져옵니다. |
| 입력 → 상태 전이 → 출력 | page mount → users/actions Promise.all → local state. toggle → status/reason PATCH → users map replace → actions GET refresh → result message render. |
| ownership/lifetime/cleanup | 이 SHA에서는 component local state가 browser projection을 소유합니다. authoritative status/audit는 여전히 server repository입니다. |
| failure/rollback/retry | 초기 load 중 하나라도 실패하면 공통 권한 메시지로 처리됩니다. mutation 성공 뒤 audit refresh 실패는 catch로 들어가 이미 반영된 server status와 UI message가 어긋날 수 있습니다. |
| 보장하는 것 | 사용자 입력 reason이 API request에 포함되고 returned audit actions를 화면에 표시합니다. |
| 보장하지 않는 것 | server atomicity, stale request cancellation, optimistic rollback, live connection revocation은 보장하지 않습니다. |
| 후속 연결 | `e07726592df5`의 admin API test가 reason 저장과 suspended target의 write 거부를 확인합니다. |

비교 기준:
- 직전 관련 SHA: `42033a6f2f3a` — `feat(admin): 감사 가능한 사용자 상태 API 추가`
- 다음 관련 SHA: `e07726592df5` — `test(app): 전체 서비스 흐름 검증`

### 5.3. `test(app): 전체 서비스 흐름 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `e07726592df5` |
| Importance | B |
| Tags | AUTH, REALTIME, PERSISTENCE |
| Source에서 확정된 역할 | 전체 서비스 회귀 중 administrator audit와 suspension enforcement 경로를 함께 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 Thread에서는 `apps/api/src/admin.test.ts`에 추가된 actions GET와 blocked lobby chat assertion만 범위로 삼습니다.
- ban request reason `smoke`가 `/admin/actions` 첫 row에 나타나는 경로를 추적합니다.
- ban된 target의 기존 bearer token으로 `/chat/lobby`를 호출해 403을 확인하는 순서를 기록합니다.
- 같은 commit의 tournament, browser, smoke 변경은 이 Thread의 직접 근거와 분리합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 초기 suspension/audit 구현은 있었지만 ban→audit visibility→기존 session write denial을 한 test에서 연결하지 않았습니다. |
| 해결하려던 문제 | status가 단순 response field로만 바뀌고 실제 후속 mutation을 막지 못하는 회귀를 검출해야 했습니다. |
| 핵심 결정 | 기존 admin route test에 audit actions 조회와 banned target의 lobby chat 시도를 추가해 reason과 403을 확인했습니다. |
| 입력 → 상태 전이 → 출력 | admin ban(reason smoke) → admin token으로 `/admin/actions` → first reason assertion → target의 기존 token으로 `/chat/lobby` → 403 assertion. |
| ownership/lifetime/cleanup | memory repository와 Fastify app fixture가 test state를 소유합니다. broad commit의 다른 tests와 독립된 admin test block입니다. |
| failure/rollback/retry | audit reason이 저장되지 않거나 active guard가 빠지면 실패합니다. status/audit SQL partial failure는 주입하지 않습니다. |
| 보장하는 것 | memory/API 경로에서 ban audit가 읽히고 ban 전 발급된 target credential의 lobby write가 즉시 거부됩니다. |
| 보장하지 않는 것 | PostgreSQL transaction, WebSocket, 모든 protected route, process/network는 증명하지 않습니다. |
| 후속 연결 | `d0137660cd9f`은 initial PostgreSQL implementation의 partial-write 위험을 transaction으로 수정합니다. |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | ban action은 audit reason을 남기고 기존 session의 protected HTTP write를 거부합니다. |
| 재현하는 failure/boundary | ban 전 발급된 target bearer token의 ban 후 재사용입니다. |
| test technique | Fastify injection과 memory repository를 사용하는 broad integration regression의 admin 부분입니다. |
| 통과하는 production path | admin ban route → memory `setUserBan`/adminActions → actions route → target lobby-chat active guard. |
| 증명하는 것 | reason visibility와 HTTP write 403을 연결합니다. |
| 증명하지 않는 것 | PostgreSQL atomicity, real socket, 모든 capabilities는 검증하지 않습니다. |
| 후속 회귀 방지 | status가 UI field로만 남고 HTTP mutation enforcement가 사라지는 회귀를 막습니다. |

비교 기준:
- 직전 관련 SHA: `bf797871007c` — `feat(admin): 감사 기록과 상태 변경 UI 추가`
- 다음 관련 SHA: `d0137660cd9f` — `fix(db): 차단 감사 기록을 원자적으로 저장`

### 5.4. `fix(db): 차단 감사 기록을 원자적으로 저장`

| 항목 | 값 |
| --- | --- |
| SHA | `d0137660cd9f` |
| Importance | A |
| Tags | AUTH, PERSISTENCE, RISK |
| Source에서 확정된 역할 | user status update와 administrator-action insert를 하나의 PostgreSQL transaction으로 이동합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.ts` `PostgresRepository.setUserBan`의 parent에서 두 `.execute(this.db)`가 분리돼 있던 상태를 확인합니다.
- 이 SHA에서 `this.db.transaction().execute` callback과 동일 `transaction` object로 UPDATE/INSERT를 실행하는지 확인합니다.
- `return toPublicUser(firstRow(result))`가 transaction callback 안에서 실행되고 성공 시에만 commit되는 순서를 기록합니다.
- memory implementation에는 같은 변경이 없고 failure rollback 모델이 다르다는 점을 구분합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | PostgreSQL `setUserBan`은 users UPDATE를 commit한 뒤 admin_actions INSERT를 별도로 실행했습니다. 두 번째 statement 실패 시 banned status만 남았습니다. |
| 해결하려던 문제 | 감사 기록 없이 account status만 바뀌는 durable partial state가 생겨 운영 조치의 추적 가능성과 복구 판단이 깨질 수 있었습니다. |
| 핵심 결정 | 두 SQL을 하나의 Kysely transaction callback 안으로 옮기고 동일 transaction handle로 실행했습니다. |
| 입력 → 상태 전이 → 출력 | transaction begin → target users UPDATE returning → admin_actions INSERT → mapped user return → callback 성공 시 commit. 어느 statement든 throw하면 callback reject와 rollback. |
| ownership/lifetime/cleanup | PostgreSQL transaction이 status row와 audit row의 commit/rollback을 함께 소유합니다. application caller는 하나의 Promise 결과만 봅니다. |
| failure/rollback/retry | UPDATE/INSERT/mapping 중 예외가 발생하면 transaction이 rollback됩니다. target-not-found의 정확한 error 표현은 별도 typed domain error로 정리되지 않았습니다. |
| 보장하는 것 | PostgreSQL에서 한 `setUserBan` 호출의 status와 audit insert는 함께 commit되거나 함께 rollback됩니다. |
| 보장하지 않는 것 | memory backend의 failure atomicity, DB commit 뒤 realtime revoke, audit read consistency across replicas는 보장하지 않습니다. |
| 후속 연결 | `9106abc10d0e`가 audit insert만 의도적으로 실패시켜 users update도 rollback되는지 실제 PostgreSQL에서 검증합니다. |

#### 최소 코드 근거

- SHA: `d0137660cd9f`
- 파일: `packages/db/src/index.ts`
- 위치: `PostgresRepository.setUserBan`
- 확인 목적: status와 audit write의 단일 transaction

```ts
return this.db.transaction().execute(async (transaction) => {
  const result = await sql<UserRow>`update users ... returning *`.execute(transaction);
  await sql`insert into admin_actions ...`.execute(transaction);
  return toPublicUser(firstRow(result));
});
```

#### Fix 연결

| 단계 | 기록 |
| --- | --- |
| 이전 가정 | 순차 await한 두 SQL이면 하나의 논리적 operation으로 충분하다는 가정이었습니다. |
| 실제 실패 또는 위험 | audit INSERT 실패 뒤 users status UPDATE는 이미 commit돼 감사 없는 ban이 남을 수 있었습니다. |
| Root cause | 두 statement가 동일 transaction/connection 범위에 없었습니다. |
| 수정된 invariant | status mutation과 audit action은 하나의 PostgreSQL transaction outcome을 공유합니다. |
| 변경 코드 | `packages/db/src/index.ts` `PostgresRepository.setUserBan`의 `this.db.transaction().execute`. |
| Regression evidence | `9106abc10d0e`의 CHECK constraint failure injection test. |

비교 기준:
- 직전 관련 SHA: `e07726592df5` — `test(app): 전체 서비스 흐름 검증`
- 다음 관련 SHA: `9106abc10d0e` — `test(db): 차단 감사 기록 atomicity 검증`

### 5.5. `test(db): 차단 감사 기록 atomicity 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `9106abc10d0e` |
| Importance | A |
| Tags | AUTH, PERSISTENCE, TEST |
| Source에서 확정된 역할 | audit insert를 deterministic constraint violation으로 실패시켜 user status rollback을 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/postgres.integration.test.ts`의 `rolls back a ban when its audit record cannot be written` test를 확인합니다.
- test 전용 CHECK constraint `reason <> 'force audit failure'`를 `admin_actions`에 추가하는 SQL을 기록합니다.
- `repository.setUserBan`이 constraint name으로 reject되는 assertion과, 이후 users status/banned_at 및 admin_actions count 직접 조회를 추적합니다.
- 실패가 users UPDATE가 아니라 두 번째 audit INSERT에서 발생한다는 점을 statement 순서로 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | transaction fix는 있었지만 실제 두 번째 write 실패 시 첫 번째 update가 rollback되는 deterministic evidence가 없었습니다. |
| 해결하려던 문제 | happy-path test만으로는 transaction handle 누락이나 한 statement의 잘못된 connection 사용을 검출할 수 없었습니다. |
| 핵심 결정 | 격리 PostgreSQL의 admin_actions에 특정 reason을 거부하는 CHECK constraint를 추가하고 그 reason으로 `setUserBan`을 호출했습니다. reject 뒤 target row와 action count를 SQL로 직접 확인했습니다. |
| 입력 → 상태 전이 → 출력 | actor/target 생성 → test CHECK constraint 설치 → `setUserBan(...,'force audit failure')` → INSERT constraint error → users row query active/null → admin_actions count 0. |
| ownership/lifetime/cleanup | isolated database fixture가 임시 constraint와 rows의 lifecycle을 소유합니다. production repository method를 그대로 호출합니다. |
| failure/rollback/retry | 예상 constraint name이 아니거나 promise가 resolve되거나 status/action rows가 남으면 test가 실패합니다. |
| 보장하는 것 | 실제 PostgreSQL에서 두 번째 statement의 deterministic failure가 첫 번째 users update까지 rollback함을 증명합니다. |
| 보장하지 않는 것 | process crash timing, network disconnect, memory backend, DB commit 후 realtime side effect는 검증하지 않습니다. |
| 후속 연결 | `40e5c520d49c`은 durable ban이 성공한 뒤 이미 열린 realtime control channel을 회수합니다. |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | status update와 audit insert는 원자적입니다. |
| 재현하는 failure/boundary | 첫 SQL 성공 뒤 두 번째 audit INSERT만 CHECK constraint로 실패하는 경계입니다. |
| test technique | 실제 PostgreSQL schema mutation을 이용한 deterministic failure-injection integration test입니다. |
| 통과하는 production path | `setUserBan` transaction → users UPDATE → failing admin_actions INSERT → rollback → direct SQL observation. |
| 증명하는 것 | target은 active/banned_at null이고 audit rows는 0입니다. |
| 증명하지 않는 것 | memory backend, crash recovery, realtime revocation은 검증하지 않습니다. |
| 후속 회귀 방지 | 둘 중 하나가 transaction handle 대신 base DB handle을 사용하는 회귀를 막습니다. |

비교 기준:
- 직전 관련 SHA: `d0137660cd9f` — `fix(db): 차단 감사 기록을 원자적으로 저장`
- 다음 관련 SHA: `40e5c520d49c` — `fix(auth): 정지된 사용자의 열린 연결 폐기`

### 5.6. `fix(auth): 정지된 사용자의 열린 연결 폐기`

| 항목 | 값 |
| --- | --- |
| SHA | `40e5c520d49c` |
| Importance | A |
| Tags | AUTH, REALTIME, TOURNAMENT |
| Source에서 확정된 역할 | ban persistence 직후 `GameHub.revokeUser`로 current socket과 realtime ownership을 회수합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/app.ts` 두 admin status routes에서 `repo.setUserBan` await 뒤 `if (banned) hub.revokeUser(id)`가 호출되는 순서를 확인합니다.
- `apps/api/src/gameHub.ts`의 `clientsByUser` lookup이 current authoritative client만 선택하는지 확인합니다.
- `revokeUser`의 heartbeat stop, snapshot buffer close, queue/tournament waiter leave, clients maps delete, input gate release를 순서대로 추적합니다.
- room client인 경우 `sideFor`와 `reserveRoomSide`로 reconnect/forfeit lifecycle에 넘기는 이유를 확인합니다.
- WebSocket OPEN일 때 close code 4003/reason과 마지막 presence broadcast를 확인하고, no-client/unban 분기를 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | ban 뒤 새 HTTP write와 새 WebSocket admission은 거부됐지만 ban 전에 이미 `GameHub`에 연결된 socket은 status를 다시 검사하지 않아 명령을 계속 보낼 수 있었습니다. |
| 해결하려던 문제 | account suspension과 realtime authority 사이에 revocation gap이 있어 suspended user가 열린 control channel을 유지했습니다. |
| 핵심 결정 | durable ban 성공 후 `hub.revokeUser`를 호출하고, user-indexed current client의 모든 runtime ownership을 해제한 뒤 4003으로 socket을 닫도록 했습니다. |
| 입력 → 상태 전이 → 출력 | admin request → requireAdmin → repository transaction commit → banned이면 `revokeUser` → current client lookup → timers/buffers/queue/waiters/maps/input gate cleanup → room side reservation → socket 4003 close → presence broadcast → response. |
| ownership/lifetime/cleanup | repository가 durable status/audit를 먼저 확정합니다. `GameHub`가 current socket, heartbeat, snapshots, matchmaking/tournament memberships, input budget와 room-side handoff를 소유합니다. |
| failure/rollback/retry | 대상 connection이 없으면 no-op입니다. unban은 revoke하지 않습니다. DB commit과 in-memory cleanup은 하나의 transaction이 아니므로 process failure가 그 사이에 발생하면 durable ban만 남고 현재 socket cleanup은 완료되지 않을 수 있습니다. |
| 보장하는 것 | 정상 실행 경로에서 ban 성공 직후 current authoritative connection이 hub indexes와 input/queue ownership을 잃고 4003으로 닫힙니다. |
| 보장하지 않는 것 | DB와 realtime side effect의 분산 원자성, socket close frame 전달 보장, 다른 process/instance의 connection revocation은 보장하지 않습니다. |
| 후속 연결 | `454cbf2c95e0`이 실제 server와 `ws` client로 open socket close와 새 ticket 거부를 함께 검증합니다. |

#### 최소 코드 근거

- SHA: `40e5c520d49c`
- 파일: `apps/api/src/gameHub.ts`
- 위치: `GameHub.revokeUser`
- 확인 목적: 현재 realtime client가 보유한 resource의 회수 순서

```ts
client.heartbeat.stop();
client.snapshots.close();
this.leaveQueue(client);
this.leaveTournamentWaiters(client);
this.clients.delete(client.id);
this.clientsByUser.delete(userId);
this.inputGate.releaseUser(userId);
```

#### Fix 연결

| 단계 | 기록 |
| --- | --- |
| 이전 가정 | 새 요청/handshake에서 status를 검사하면 suspension enforcement가 충분하다는 가정이었습니다. |
| 실제 실패 또는 위험 | ban 전에 열린 WebSocket은 다시 인증하지 않아 계속 game commands를 보낼 수 있었습니다. |
| Root cause | account status mutation path가 `GameHub`의 current connection ownership에 알리지 않았습니다. |
| 수정된 invariant | ban 성공은 durable status change와 현재 realtime authority 회수를 순서대로 수행합니다. |
| 변경 코드 | `apps/api/src/app.ts` admin handlers; `apps/api/src/gameHub.ts` `revokeUser`. |
| Regression evidence | `454cbf2c95e0`의 real WebSocket close 4003 및 new-ticket 403 test. |

비교 기준:
- 직전 관련 SHA: `9106abc10d0e` — `test(db): 차단 감사 기록 atomicity 검증`
- 다음 관련 SHA: `454cbf2c95e0` — `test(auth): 계정 정지의 기존 WebSocket 차단 검증`

### 5.7. `test(auth): 계정 정지의 기존 WebSocket 차단 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `454cbf2c95e0` |
| Importance | A |
| Tags | AUTH, REALTIME, TEST |
| Source에서 확정된 역할 | 실제 server/socket에서 suspension 뒤 기존 connection close와 새 ticket 거부를 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/admin.test.ts` setup이 `app.ready` 대신 loopback ephemeral port `app.listen`을 사용하도록 바뀐 이유를 확인합니다.
- target dev login → cookie로 `/auth/ws-ticket` → real `ws` client open → close promise 등록 순서를 추적합니다.
- admin ban injection 뒤 close `{ code: 4003, reason: 'account suspended' }`와 동일 old cookie의 새 ticket 403 assertion을 구분합니다.
- afterEach가 sockets를 terminate하고 app/repository를 닫는 cleanup ownership을 확인합니다.
- queue/room 내부 상태, PostgreSQL transaction, DB→hub failure window를 직접 검증하지 않는 범위를 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | live revocation code는 추가됐지만 실제 WebSocket transport가 close event를 받고 old session이 새 ticket을 얻지 못하는 end-to-end regression evidence가 없었습니다. |
| 해결하려던 문제 | mock socket이나 method-level assertion만으로는 HTTP ban, ticket auth, hub connection index, close frame의 통합을 검증할 수 없었습니다. |
| 핵심 결정 | Fastify를 실제 loopback port에 listen하고 `ws` client를 ticket으로 연결한 뒤 admin ban route를 호출했습니다. close code/reason과 새 ticket 403을 모두 확인했습니다. |
| 입력 → 상태 전이 → 출력 | target login → ws-ticket issue → real socket open → close listener → admin ban → repository ban + hub revoke → socket close 4003 → old cookie로 ws-ticket request 403. |
| ownership/lifetime/cleanup | test의 sockets 배열이 client cleanup을 소유하고 Fastify listen/close와 memory repository lifecycle을 suite가 소유합니다. |
| failure/rollback/retry | socket open/error와 close promise가 transport failure를 드러냅니다. cleanup은 closed가 아니면 terminate합니다. |
| 보장하는 것 | 한 process의 실제 HTTP/WebSocket 통합에서 ban이 open socket을 4003으로 닫고 기존 session의 신규 realtime admission을 403으로 차단함을 증명합니다. |
| 보장하지 않는 것 | PostgreSQL atomicity, multi-instance revocation, 모든 room/queue cleanup field, network packet delivery 보장은 증명하지 않습니다. |
| 후속 연결 | 이 Thread의 최종 회귀 증거입니다. |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | suspended user는 현재 realtime control channel과 새 WebSocket admission을 모두 잃습니다. |
| 재현하는 failure/boundary | ban 전에 이미 ticket-authenticated socket이 OPEN인 상태입니다. |
| test technique | loopback Fastify server와 real `ws` client를 사용하는 process-local integration regression입니다. |
| 통과하는 production path | login/session → ws-ticket → WebSocket handshake/GameHub connect → admin ban → repository → `revokeUser` → close; 이후 ticket route active-status gate. |
| 증명하는 것 | close code 4003/reason과 old-cookie new-ticket 403입니다. |
| 증명하지 않는 것 | PostgreSQL, multi-process, queue/room 모든 internal state, DB-hub atomicity는 검증하지 않습니다. |
| 후속 회귀 방지 | ban route에서 `hub.revokeUser` 호출이나 cleanup/close code가 빠지는 회귀를 막습니다. |

비교 기준:
- 직전 관련 SHA: `40e5c520d49c` — `fix(auth): 정지된 사용자의 열린 연결 폐기`
- 이 Thread의 최종 상태와 비교합니다.

## 6. Invariant ledger

| Invariant | 도입/수정 SHA | 변화 | 검증/후속 보호 |
| --- | --- | --- | --- |
| suspended user는 protected write와 새 WS admission을 잃는다 | `42033a6f2f3a` | HTTP active guards와 handshake close로 도입 | `e07726592df5`에서 old token write 403 검증 |
| status와 audit action은 원자적이다 | `d0137660cd9f` | 동일 PostgreSQL transaction으로 수정 | `9106abc10d0e`에서 second-write failure injection으로 검증 |
| ban은 현재 realtime authority를 회수한다 | `40e5c520d49c` | GameHub resource cleanup과 close 4003 도입 | `454cbf2c95e0` real socket/ticket regression으로 검증 |

## 7. Failure → Fix → Test

| Failure/Risk | Fix | Test | 연결 근거 |
| --- | --- | --- | --- |
| ban 후 기존 HTTP credential이 write를 계속 수행 | `42033a6f2f3a` | `e07726592df5` | target old token의 lobby chat 403 |
| users UPDATE만 commit되고 audit INSERT 실패 | `d0137660cd9f` | `9106abc10d0e` | CHECK constraint로 audit insert 실패 후 active/0 actions 확인 |
| ban 전에 열린 WebSocket이 계속 명령 가능 | `40e5c520d49c` | `454cbf2c95e0` | real socket close 4003와 new ticket 403 |

## 8. Ownership·state·responsibility 변화

| 관심사 | 최종 owner와 변화 |
| --- | --- |
| durable account status/audit | PostgreSQL `setUserBan` transaction이 status와 action row의 commit/rollback을 소유합니다. |
| HTTP/WS capability decision | API active guards와 ticket/handshake boundary가 current status를 읽어 새 work를 거부합니다. |
| live realtime authority | `GameHub.clientsByUser`가 current client를 선택하고 heartbeat/snapshot/queue/waiter/input/room/socket cleanup을 소유합니다. |
| browser projection | admin page local state는 users/actions/reason presentation만 소유하며 authoritative state가 아닙니다. |
| failure boundary | DB commit과 GameHub revoke는 순차 side effects이며 하나의 distributed transaction으로 묶이지 않습니다. |

## 9. Thread 최종 상태

### 최종 owner

repository transaction이 durable status와 audit record를 소유하고, API가 새 HTTP/WS capability를 판정하며, GameHub가 이미 열린 current realtime connection과 관련 in-memory resource를 회수합니다.

### 최종 execution flow

active administrator request가 ban을 요청하면 repository transaction이 target status와 audit action을 함께 commit합니다. ban인 경우 handler가 `GameHub.revokeUser`를 호출해 current client의 timers, buffers, memberships, indexes, input state를 해제하고 room side를 예약한 뒤 socket을 4003으로 닫습니다. 이후 같은 session의 새 ticket request는 current banned status 때문에 403입니다.

### 최종 guarantee

정상 단일-process 경로에서 감사 없는 partial ban을 막고, protected HTTP/WS admission과 이미 열린 authoritative connection을 모두 차단하는 회귀 증거가 연결됩니다.

### 최종 non-guarantee

DB commit과 in-memory revocation의 분산 원자성, multi-instance connection broadcast, close frame 전달, process crash 직후 자동 보상은 이 Thread가 보장하지 않습니다.

## 10. Learning completion check

- [x] 모든 Commit map SHA의 exact diff와 관련 code path를 확인했습니다.
- [x] Importance별로 A commit은 failure/ownership을 깊게, B commit은 Thread 역할 중심으로 기록했습니다.
- [x] Fix와 regression test를 이전 failure에 연결했습니다.
- [x] 실제 실행 증거와 code inspection을 구분했습니다.
- [ ] Runtime test command 실행 — 로컬 checkout을 만들 GitHub network/DNS가 차단되어 실행하지 못했습니다. 따라서 문서에는 실행 성공을 주장하지 않습니다.
