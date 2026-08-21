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
| 직전 관련 상태 | [해당 SHA의 parent 또는 직전 관련 SHA에서 파일·심볼·조건을 작성합니다.] |
| 해결하려던 문제 | [commit-specific failure/risk를 작성합니다.] |
| 핵심 결정 | [변경된 책임·조건·자료구조·SQL을 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [실제 caller/callee 순서를 작성합니다.] |
| ownership/lifetime/cleanup | [resource/state의 owner와 cleanup을 작성합니다.] |
| failure/rollback/retry | [실패 분기와 남는 상태를 작성합니다.] |
| 보장하는 것 | [해당 SHA의 코드가 보장하는 범위를 작성합니다.] |
| 보장하지 않는 것 | [아직 남은 제한을 작성합니다.] |
| 후속 연결 | [다음 fix/test/통합 SHA와 연결합니다.] |

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
| 직전 관련 상태 | [해당 SHA의 parent 또는 직전 관련 SHA에서 파일·심볼·조건을 작성합니다.] |
| 해결하려던 문제 | [commit-specific failure/risk를 작성합니다.] |
| 핵심 결정 | [변경된 책임·조건·자료구조·SQL을 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [실제 caller/callee 순서를 작성합니다.] |
| ownership/lifetime/cleanup | [resource/state의 owner와 cleanup을 작성합니다.] |
| failure/rollback/retry | [실패 분기와 남는 상태를 작성합니다.] |
| 보장하는 것 | [해당 SHA의 코드가 보장하는 범위를 작성합니다.] |
| 보장하지 않는 것 | [아직 남은 제한을 작성합니다.] |
| 후속 연결 | [다음 fix/test/통합 SHA와 연결합니다.] |

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
| 직전 관련 상태 | [해당 SHA의 parent 또는 직전 관련 SHA에서 파일·심볼·조건을 작성합니다.] |
| 해결하려던 문제 | [commit-specific failure/risk를 작성합니다.] |
| 핵심 결정 | [변경된 책임·조건·자료구조·SQL을 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [실제 caller/callee 순서를 작성합니다.] |
| ownership/lifetime/cleanup | [resource/state의 owner와 cleanup을 작성합니다.] |
| failure/rollback/retry | [실패 분기와 남는 상태를 작성합니다.] |
| 보장하는 것 | [해당 SHA의 코드가 보장하는 범위를 작성합니다.] |
| 보장하지 않는 것 | [아직 남은 제한을 작성합니다.] |
| 후속 연결 | [다음 fix/test/통합 SHA와 연결합니다.] |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | [작성] |
| 재현하는 failure/boundary | [작성] |
| test technique | [작성] |
| 통과하는 production path | [작성] |
| 증명하는 것 | [작성] |
| 증명하지 않는 것 | [작성] |
| 후속 회귀 방지 | [작성] |

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
| 직전 관련 상태 | [해당 SHA의 parent 또는 직전 관련 SHA에서 파일·심볼·조건을 작성합니다.] |
| 해결하려던 문제 | [commit-specific failure/risk를 작성합니다.] |
| 핵심 결정 | [변경된 책임·조건·자료구조·SQL을 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [실제 caller/callee 순서를 작성합니다.] |
| ownership/lifetime/cleanup | [resource/state의 owner와 cleanup을 작성합니다.] |
| failure/rollback/retry | [실패 분기와 남는 상태를 작성합니다.] |
| 보장하는 것 | [해당 SHA의 코드가 보장하는 범위를 작성합니다.] |
| 보장하지 않는 것 | [아직 남은 제한을 작성합니다.] |
| 후속 연결 | [다음 fix/test/통합 SHA와 연결합니다.] |

#### 최소 코드 근거

[위 조사 항목을 설명하는 최소 코드만 해당 SHA에서 인용하고 파일·symbol·확인 목적을 기록합니다.]

#### Fix 연결

| 단계 | 기록 |
| --- | --- |
| 이전 가정 | [작성] |
| 실제 실패 또는 위험 | [작성] |
| Root cause | [작성] |
| 수정된 invariant | [작성] |
| 변경 코드 | [작성] |
| Regression evidence | [작성] |

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
| 직전 관련 상태 | [해당 SHA의 parent 또는 직전 관련 SHA에서 파일·심볼·조건을 작성합니다.] |
| 해결하려던 문제 | [commit-specific failure/risk를 작성합니다.] |
| 핵심 결정 | [변경된 책임·조건·자료구조·SQL을 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [실제 caller/callee 순서를 작성합니다.] |
| ownership/lifetime/cleanup | [resource/state의 owner와 cleanup을 작성합니다.] |
| failure/rollback/retry | [실패 분기와 남는 상태를 작성합니다.] |
| 보장하는 것 | [해당 SHA의 코드가 보장하는 범위를 작성합니다.] |
| 보장하지 않는 것 | [아직 남은 제한을 작성합니다.] |
| 후속 연결 | [다음 fix/test/통합 SHA와 연결합니다.] |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | [작성] |
| 재현하는 failure/boundary | [작성] |
| test technique | [작성] |
| 통과하는 production path | [작성] |
| 증명하는 것 | [작성] |
| 증명하지 않는 것 | [작성] |
| 후속 회귀 방지 | [작성] |

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
| 직전 관련 상태 | [해당 SHA의 parent 또는 직전 관련 SHA에서 파일·심볼·조건을 작성합니다.] |
| 해결하려던 문제 | [commit-specific failure/risk를 작성합니다.] |
| 핵심 결정 | [변경된 책임·조건·자료구조·SQL을 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [실제 caller/callee 순서를 작성합니다.] |
| ownership/lifetime/cleanup | [resource/state의 owner와 cleanup을 작성합니다.] |
| failure/rollback/retry | [실패 분기와 남는 상태를 작성합니다.] |
| 보장하는 것 | [해당 SHA의 코드가 보장하는 범위를 작성합니다.] |
| 보장하지 않는 것 | [아직 남은 제한을 작성합니다.] |
| 후속 연결 | [다음 fix/test/통합 SHA와 연결합니다.] |

#### 최소 코드 근거

[위 조사 항목을 설명하는 최소 코드만 해당 SHA에서 인용하고 파일·symbol·확인 목적을 기록합니다.]

#### Fix 연결

| 단계 | 기록 |
| --- | --- |
| 이전 가정 | [작성] |
| 실제 실패 또는 위험 | [작성] |
| Root cause | [작성] |
| 수정된 invariant | [작성] |
| 변경 코드 | [작성] |
| Regression evidence | [작성] |

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
| 직전 관련 상태 | [해당 SHA의 parent 또는 직전 관련 SHA에서 파일·심볼·조건을 작성합니다.] |
| 해결하려던 문제 | [commit-specific failure/risk를 작성합니다.] |
| 핵심 결정 | [변경된 책임·조건·자료구조·SQL을 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [실제 caller/callee 순서를 작성합니다.] |
| ownership/lifetime/cleanup | [resource/state의 owner와 cleanup을 작성합니다.] |
| failure/rollback/retry | [실패 분기와 남는 상태를 작성합니다.] |
| 보장하는 것 | [해당 SHA의 코드가 보장하는 범위를 작성합니다.] |
| 보장하지 않는 것 | [아직 남은 제한을 작성합니다.] |
| 후속 연결 | [다음 fix/test/통합 SHA와 연결합니다.] |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | [작성] |
| 재현하는 failure/boundary | [작성] |
| test technique | [작성] |
| 통과하는 production path | [작성] |
| 증명하는 것 | [작성] |
| 증명하지 않는 것 | [작성] |
| 후속 회귀 방지 | [작성] |

비교 기준:
- 직전 관련 SHA: `40e5c520d49c` — `fix(auth): 정지된 사용자의 열린 연결 폐기`
- 이 Thread의 최종 상태와 비교합니다.

## 6. Invariant ledger

| Invariant | 도입/수정 SHA | 변화 | 검증/후속 보호 |
| --- | --- | --- | --- |
| suspended user는 protected write와 새 WS admission을 잃는다 | `42033a6f2f3a` | [작성] | [작성] |
| status와 audit action은 원자적이다 | `d0137660cd9f` | [작성] | [작성] |
| ban은 현재 realtime authority를 회수한다 | `40e5c520d49c` | [작성] | [작성] |

## 7. Failure → Fix → Test

| Failure/Risk | Fix | Test | 연결 근거 |
| --- | --- | --- | --- |
| ban 후 기존 HTTP credential이 write를 계속 수행 | `42033a6f2f3a` | `e07726592df5` | [작성] |
| users UPDATE만 commit되고 audit INSERT 실패 | `d0137660cd9f` | `9106abc10d0e` | [작성] |
| ban 전에 열린 WebSocket이 계속 명령 가능 | `40e5c520d49c` | `454cbf2c95e0` | [작성] |

## 8. Ownership·state·responsibility 변화

| 관심사 | 최종 owner와 변화 |
| --- | --- |
| durable account status/audit | [각 SHA의 ownership 이전과 cleanup을 작성합니다.] |
| HTTP/WS capability decision | [각 SHA의 ownership 이전과 cleanup을 작성합니다.] |
| live realtime authority | [각 SHA의 ownership 이전과 cleanup을 작성합니다.] |
| browser projection | [각 SHA의 ownership 이전과 cleanup을 작성합니다.] |
| failure boundary | [각 SHA의 ownership 이전과 cleanup을 작성합니다.] |

## 9. Thread 최종 상태

### 최종 owner

[마지막 SHA 기준 owner를 작성합니다.]

### 최종 execution flow

[입력부터 상태 변경·cleanup·출력까지 실제 caller 순서로 작성합니다.]

### 최종 guarantee

[코드와 test로 입증된 범위를 작성합니다.]

### 최종 non-guarantee

[이 Thread가 보장하지 않는 failure window와 범위를 작성합니다.]

## 10. Learning completion check

- [ ] 모든 Commit map SHA의 exact diff와 관련 code path를 확인했습니다.
- [ ] Importance별 depth를 구분했습니다.
- [ ] Fix와 regression test를 이전 failure에 연결했습니다.
- [ ] 실행한 command와 code inspection을 구분했습니다.
- [ ] 최종 guarantee/non-guarantee를 작성했습니다.
