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
- 직전 관련 SHA: `c577fe2603e3` — `fix(auth): 정지된 관리자 login 거부`
- 이 Thread의 최종 상태와 비교합니다.

## 6. Invariant ledger

| Invariant | 도입/수정 SHA | 변화 | 검증/후속 보호 |
| --- | --- | --- | --- |
| administrator operation은 server-side role gate 뒤 실행된다 | `e8bb6a4bf68b` | [작성] | [작성] |
| handle은 privilege source가 아니다 | `45225adcfcd9` | [작성] | [작성] |
| 기존 session도 현재 status를 따른다 | `c577fe2603e3` | [작성] | [작성] |

## 7. Failure → Fix → Test

| Failure/Risk | Fix | Test | 연결 근거 |
| --- | --- | --- | --- |
| `admin` handle만으로 role 획득 | `45225adcfcd9` | `dae31d4a223c` | [작성] |
| banned administrator의 기존 session이 admin route 통과 | `c577fe2603e3` | `aa037c5291fe` | [작성] |

## 8. Ownership·state·responsibility 변화

| 관심사 | 최종 owner와 변화 |
| --- | --- |
| identity creation | [각 SHA의 ownership 이전과 cleanup을 작성합니다.] |
| role state | [각 SHA의 ownership 이전과 cleanup을 작성합니다.] |
| administrator capability | [각 SHA의 ownership 이전과 cleanup을 작성합니다.] |
| provisioning lifecycle | [각 SHA의 ownership 이전과 cleanup을 작성합니다.] |

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
