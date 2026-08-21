# Canonical friendship과 동시 요청

- 카테고리: `02-persistence-and-data-integrity` — 영속성·데이터 무결성
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

방향성 있는 friendship row에서 unordered canonical pair와 atomic upsert로 이동해 반복·역방향·동시 요청을 하나의 관계로 수렴시키는 과정을 복원합니다.

이 문서는 완성된 해설이 아니라 exact SHA를 순서대로 확인해 구현 발전을 복원하기 위한 scaffold입니다.

### 직접 연결되는 불변식

- 두 사용자 사이 friendship은 방향과 호출 순서에 무관한 하나의 canonical identity를 갖습니다.
- 반복·역방향·동시 요청은 duplicate relationship을 만들지 않습니다.
- memory와 PostgreSQL은 같은 상태 전이 결과를 제공합니다.

## 2. 핵심 질문

- 두 user ID를 canonical order로 정렬하는 시점과 database constraint는 무엇입니까?
- A→B와 B→A 동시 request가 duplicate row 또는 contradictory status를 만들지 않는 근거는 무엇입니까?
- request/accept 상태 전이가 upsert clause에서 어떻게 표현됩니까?
- memory implementation의 key와 PostgreSQL unique key가 같은 relation identity를 나타냅니까?

## 3. 완료 기준

- Commit map의 모든 SHA를 지정 브랜치 ancestry에서 확인합니다.
- 각 SHA의 parent 또는 직전 관련 SHA와 비교해 변경 전후 상태를 구분합니다.
- 파일, symbol, caller/callee, 상태 mutation, failure branch, cleanup을 실제 코드로 기록합니다.
- Fix는 이전 가정과 root cause를, test는 production path와 증명/비증명 범위를 연결합니다.
- 마지막 SHA까지만 사용해 Thread 최종 owner, invariant, execution flow를 작성합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Thread 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `645e5a3c8e96` | `feat(db): 친구 관계 저장 구현` | B | PERSISTENCE | friend list, request, accept operation의 초기 저장 모델을 추가합니다. |
| 2 | `ffb0a8275a4f` | `feat(db): friendship canonical pair 제약 추가` | A | PERSISTENCE, RISK | unordered user pair당 하나의 canonical relationship이 되도록 migration/constraint를 추가합니다. |
| 3 | `77c555aba9a0` | `feat(db): PostgreSQL friendship 요청을 원자화` | A | PERSISTENCE, RISK | canonical pair 하나에 대한 upsert로 request transition을 원자화합니다. |
| 4 | `34db79005f30` | `feat(db): memory friendship invariant 적용` | B | PERSISTENCE | memory에서도 caller-specific summary가 아니라 user pair 관계를 저장합니다. |
| 5 | `cdaca35ccf7f` | `test(db): friendship와 tournament 경쟁 상태 검증` | A | PERSISTENCE, TOURNAMENT, RISK | repeated/reversed/concurrent friendship request가 하나의 identity로 수렴하는지 두 backend에서 검증합니다. |

## 5. Commit별 학습 기록

### 5.1. `feat(db): 친구 관계 저장 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `645e5a3c8e96` |
| Importance | B |
| Tags | PERSISTENCE |
| Source에서 확정된 역할 | friend list, request, accept operation의 초기 저장 모델을 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.

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

비교 기준:
- 이 commit의 parent와 비교합니다.
- 다음 관련 SHA: `ffb0a8275a4f` — `feat(db): friendship canonical pair 제약 추가`

### 5.2. `feat(db): friendship canonical pair 제약 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `ffb0a8275a4f` |
| Importance | A |
| Tags | PERSISTENCE, RISK |
| Source에서 확정된 역할 | unordered user pair당 하나의 canonical relationship이 되도록 migration/constraint를 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.

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

비교 기준:
- 직전 관련 SHA: `645e5a3c8e96` — `feat(db): 친구 관계 저장 구현`
- 다음 관련 SHA: `77c555aba9a0` — `feat(db): PostgreSQL friendship 요청을 원자화`

### 5.3. `feat(db): PostgreSQL friendship 요청을 원자화`

| 항목 | 값 |
| --- | --- |
| SHA | `77c555aba9a0` |
| Importance | A |
| Tags | PERSISTENCE, RISK |
| Source에서 확정된 역할 | canonical pair 하나에 대한 upsert로 request transition을 원자화합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.

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

비교 기준:
- 직전 관련 SHA: `ffb0a8275a4f` — `feat(db): friendship canonical pair 제약 추가`
- 다음 관련 SHA: `34db79005f30` — `feat(db): memory friendship invariant 적용`

### 5.4. `feat(db): memory friendship invariant 적용`

| 항목 | 값 |
| --- | --- |
| SHA | `34db79005f30` |
| Importance | B |
| Tags | PERSISTENCE |
| Source에서 확정된 역할 | memory에서도 caller-specific summary가 아니라 user pair 관계를 저장합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.

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

비교 기준:
- 직전 관련 SHA: `77c555aba9a0` — `feat(db): PostgreSQL friendship 요청을 원자화`
- 다음 관련 SHA: `cdaca35ccf7f` — `test(db): friendship와 tournament 경쟁 상태 검증`

### 5.5. `test(db): friendship와 tournament 경쟁 상태 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `cdaca35ccf7f` |
| Importance | A |
| Tags | PERSISTENCE, TOURNAMENT, RISK |
| Source에서 확정된 역할 | repeated/reversed/concurrent friendship request가 하나의 identity로 수렴하는지 두 backend에서 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.
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
- 직전 관련 SHA: `34db79005f30` — `feat(db): memory friendship invariant 적용`
- 이 Thread의 최종 상태와 비교합니다.

## 6. Invariant ledger

| Invariant | 도입 SHA | 강화 SHA | 부족함이 드러난 SHA | 복구 fix | 고정 test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| 두 사용자 사이 friendship은 방향과 호출 순서에 무관한 하나의 canonical identity를 갖습니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| 반복·역방향·동시 요청은 duplicate relationship을 만들지 않습니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| memory와 PostgreSQL은 같은 상태 전이 결과를 제공합니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| [작성] | [SHA 순서 작성] | [test/failure injection 작성] | [작성] |

## 8. Ownership / state / responsibility 변화

| 축 | 초기 owner/state | 중간 전환 | 최종 owner/state | cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| canonical user pair | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| friendship row/status | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| atomic upsert | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| memory relationship key | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| concurrency regression | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |

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
