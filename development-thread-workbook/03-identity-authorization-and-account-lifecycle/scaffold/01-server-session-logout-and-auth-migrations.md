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
- 직전 관련 SHA: `b93910708330` — `feat(db): legacy session을 안전하게 만료`
- 이 Thread의 최종 상태와 비교합니다.

## 6. Invariant ledger

| Invariant | 도입/수정 SHA | 변화 | 검증/후속 보호 |
| --- | --- | --- | --- |
| session identity는 repository가 소유한다 | `4f65c6214321` | [작성] | [작성] |
| logout은 server credential을 폐기한다 | `252befef9527` | [작성] | [작성] |
| auth migration은 credential만 만료한다 | `b93910708330` | [작성] | [작성] |

## 7. Failure → Fix → Test

| Failure/Risk | Fix | Test | 연결 근거 |
| --- | --- | --- | --- |
| cookie만 삭제해 bearer/query token이 계속 유효 | `252befef9527` | `bc789124b20b` | [작성] |
| 새 인증 계약 뒤 legacy session이 DB에 잔존 | `b93910708330` | `0649b63a1ca9` | [작성] |

## 8. Ownership·state·responsibility 변화

| 관심사 | 최종 owner와 변화 |
| --- | --- |
| session state | [각 SHA의 ownership 이전과 cleanup을 작성합니다.] |
| HTTP credential 전달 | [각 SHA의 ownership 이전과 cleanup을 작성합니다.] |
| schema 전환 | [각 SHA의 ownership 이전과 cleanup을 작성합니다.] |
| test resource | [각 SHA의 ownership 이전과 cleanup을 작성합니다.] |

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
