# 계정 정지 audit atomicity와 live revocation

- 카테고리: `03-identity-authorization-and-account-lifecycle` — 신원·권한·계정 수명주기
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

사용자 상태 변경과 감사 기록을 하나의 transaction으로 묶고 정지된 사용자의 이미 열린 WebSocket control channel까지 즉시 회수하는 과정을 복원합니다.

이 문서는 완성된 해설이 아니라 exact SHA를 순서대로 확인해 구현 발전을 복원하기 위한 scaffold입니다.

### 직접 연결되는 불변식

- 계정 상태와 해당 상태 변경의 감사 기록은 원자적으로 반영됩니다.
- suspended user는 새 HTTP 권한 작업뿐 아니라 이미 열린 realtime control channel도 유지하지 못합니다.
- realtime revocation은 현재 authoritative connection만 대상으로 하며 stale socket을 다시 활성화하지 않습니다.

## 2. 핵심 질문

- status update와 audit insert가 같은 transaction/connection을 사용하는지 확인할 수 있습니까?
- audit insert 실패가 user status까지 rollback되도록 failure injection이 어디에 적용됩니까?
- persistence 성공과 realtime revocation 사이에서 실패하면 어떤 상태가 남으며 어떻게 보고됩니까?
- revoke된 socket의 queue, reservation, room, heartbeat, snapshot buffer가 어떤 cleanup path를 따릅니까?

## 3. 완료 기준

- Commit map의 모든 SHA를 지정 브랜치 ancestry에서 확인합니다.
- 각 SHA의 parent 또는 직전 관련 SHA와 비교해 변경 전후 상태를 구분합니다.
- 파일, symbol, caller/callee, 상태 mutation, failure branch, cleanup을 실제 코드로 기록합니다.
- Fix는 이전 가정과 root cause를, test는 production path와 증명/비증명 범위를 연결합니다.
- 마지막 SHA까지만 사용해 Thread 최종 owner, invariant, execution flow를 작성합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Thread 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `d0137660cd9f` | `fix(db): 차단 감사 기록을 원자적으로 저장` | A | AUTH, PERSISTENCE, RISK | user status update와 administrator-action insert를 하나의 PostgreSQL transaction으로 이동합니다. |
| 2 | `9106abc10d0e` | `test(db): 차단 감사 기록 atomicity 검증` | A | AUTH, PERSISTENCE, TEST | audit insert를 constraint 위반으로 실패시켜 user status rollback을 검증합니다. |
| 3 | `40e5c520d49c` | `fix(auth): 정지된 사용자의 열린 연결 폐기` | A | AUTH, REALTIME, TOURNAMENT | ban persistence 직후 `GameHub.revokeUser`로 current socket과 room control을 회수합니다. |
| 4 | `454cbf2c95e0` | `test(auth): 계정 정지의 기존 WebSocket 차단 검증` | A | AUTH, REALTIME, TEST | 실제 server/socket에서 suspension 뒤 기존 connection이 command를 계속할 수 없는지 검증합니다. |

## 5. Commit별 학습 기록

### 5.1. `fix(db): 차단 감사 기록을 원자적으로 저장`

| 항목 | 값 |
| --- | --- |
| SHA | `d0137660cd9f` |
| Importance | A |
| Tags | AUTH, PERSISTENCE, RISK |
| Source에서 확정된 역할 | user status update와 administrator-action insert를 하나의 PostgreSQL transaction으로 이동합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- 수정 전 가정 → 실제 실패 또는 위험 → root cause → 수정된 invariant를 parent와 이 SHA에서 비교합니다.
- 후속 regression test가 같은 실패를 어떤 fixture 또는 failure injection으로 고정하는지 연결합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

#### Fix 연결

| 단계 | 기록 |
| --- | --- |
| 이전 가정 | [작성] |
| 실제 실패 또는 위험 | [작성] |
| Root cause | [작성] |
| 수정된 invariant | [작성] |
| 변경 코드 | [SHA·파일·심볼 작성] |
| Regression evidence | [후속 test SHA·fixture 작성] |

비교 기준:
- 이 commit의 parent와 비교합니다.
- 다음 관련 SHA: `9106abc10d0e` — `test(db): 차단 감사 기록 atomicity 검증`

### 5.2. `test(db): 차단 감사 기록 atomicity 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `9106abc10d0e` |
| Importance | A |
| Tags | AUTH, PERSISTENCE, TEST |
| Source에서 확정된 역할 | audit insert를 constraint 위반으로 실패시켜 user status rollback을 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- 테스트가 주입하는 입력·시간·동시성·오류와 실제 production path를 구분해 기록합니다.
- 테스트가 증명하는 범위와 실제 process/network/database까지는 증명하지 않는 범위를 함께 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | [작성] |
| 재현하는 failure/boundary | [작성] |
| test technique | [unit/integration/concurrency/failure injection/process/browser/load 중 구분] |
| 통과하는 production path | [caller 순서 작성] |
| 증명하는 것 | [작성] |
| 증명하지 않는 것 | [작성] |
| 후속 회귀 방지 | [작성] |

비교 기준:
- 직전 관련 SHA: `d0137660cd9f` — `fix(db): 차단 감사 기록을 원자적으로 저장`
- 다음 관련 SHA: `40e5c520d49c` — `fix(auth): 정지된 사용자의 열린 연결 폐기`

### 5.3. `fix(auth): 정지된 사용자의 열린 연결 폐기`

| 항목 | 값 |
| --- | --- |
| SHA | `40e5c520d49c` |
| Importance | A |
| Tags | AUTH, REALTIME, TOURNAMENT |
| Source에서 확정된 역할 | ban persistence 직후 `GameHub.revokeUser`로 current socket과 room control을 회수합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.
- 수정 전 가정 → 실제 실패 또는 위험 → root cause → 수정된 invariant를 parent와 이 SHA에서 비교합니다.
- 후속 regression test가 같은 실패를 어떤 fixture 또는 failure injection으로 고정하는지 연결합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

#### Fix 연결

| 단계 | 기록 |
| --- | --- |
| 이전 가정 | [작성] |
| 실제 실패 또는 위험 | [작성] |
| Root cause | [작성] |
| 수정된 invariant | [작성] |
| 변경 코드 | [SHA·파일·심볼 작성] |
| Regression evidence | [후속 test SHA·fixture 작성] |

비교 기준:
- 직전 관련 SHA: `9106abc10d0e` — `test(db): 차단 감사 기록 atomicity 검증`
- 다음 관련 SHA: `454cbf2c95e0` — `test(auth): 계정 정지의 기존 WebSocket 차단 검증`

### 5.4. `test(auth): 계정 정지의 기존 WebSocket 차단 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `454cbf2c95e0` |
| Importance | A |
| Tags | AUTH, REALTIME, TEST |
| Source에서 확정된 역할 | 실제 server/socket에서 suspension 뒤 기존 connection이 command를 계속할 수 없는지 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- 테스트가 주입하는 입력·시간·동시성·오류와 실제 production path를 구분해 기록합니다.
- 테스트가 증명하는 범위와 실제 process/network/database까지는 증명하지 않는 범위를 함께 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | [작성] |
| 재현하는 failure/boundary | [작성] |
| test technique | [unit/integration/concurrency/failure injection/process/browser/load 중 구분] |
| 통과하는 production path | [caller 순서 작성] |
| 증명하는 것 | [작성] |
| 증명하지 않는 것 | [작성] |
| 후속 회귀 방지 | [작성] |

비교 기준:
- 직전 관련 SHA: `40e5c520d49c` — `fix(auth): 정지된 사용자의 열린 연결 폐기`
- 이 Thread의 최종 상태와 비교합니다.

## 6. Invariant ledger

| Invariant | 도입 SHA | 강화 SHA | 부족함이 드러난 SHA | 복구 fix | 고정 test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| 계정 상태와 해당 상태 변경의 감사 기록은 원자적으로 반영됩니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| suspended user는 새 HTTP 권한 작업뿐 아니라 이미 열린 realtime control channel도 유지하지 못합니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| realtime revocation은 현재 authoritative connection만 대상으로 하며 stale socket을 다시 활성화하지 않습니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| [작성] | [SHA 순서 작성] | [test/failure injection 작성] | [작성] |

## 8. Ownership / state / responsibility 변화

| 축 | 초기 owner/state | 중간 전환 | 최종 owner/state | cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| status transaction | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| administrator audit row | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| failure injection | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| GameHub user index | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| socket/room revocation cleanup | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |

## 9. Thread 최종 상태

- 최종 authoritative owner: [작성]
- 최종 상태/invariant: [작성]
- 남아 있는 의도적 제한 또는 비보장: [작성]
- 다른 Thread가 의존하는 contract: [작성]
- 대표 코드 근거: [SHA·파일·심볼 작성]

## 10. 최종 execution flow

```text
[입력/이벤트]
    ↓
[검증·권한·소유권 경계]
    ↓
[상태 전이·DB 작업·브라우저 반영]
    ↓
[출력·관측·rollback·cleanup]
```

## 11. 학습 완료 자가 점검

- [ ] 모든 SHA를 지정 브랜치에서 확인했습니다.
- [ ] commit subject, importance, tags를 변경하지 않았습니다.
- [ ] final HEAD 코드를 과거 SHA에 소급하지 않았습니다.
- [ ] S/A/B/C에 맞게 조사 깊이를 구분했습니다.
- [ ] fix와 test를 실제 production path에 연결했습니다.
- [ ] 실행하지 않은 명령의 결과를 작성하지 않았습니다.
- [ ] Thread 최종 owner와 execution flow를 실제 근거로 설명할 수 있습니다.
