# Migration·seed·readiness·reset lifecycle

- 카테고리: `02-persistence-and-data-integrity` — 영속성·데이터 무결성
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

runtime에서 schema를 직접 초기화하던 방식에서 file-based migration과 seed profile을 분리하고 migration set readiness 및 fail-closed test reset을 구성하는 과정을 복원합니다.

이 문서는 완성된 해설이 아니라 exact SHA를 순서대로 확인해 구현 발전을 복원하기 위한 scaffold입니다.

### 직접 연결되는 불변식

- schema evolution, seed data, application startup은 서로 다른 lifecycle로 관리됩니다.
- migration set divergence는 service readiness 실패로 드러나며 조용히 실행되지 않습니다.
- destructive reset은 검증된 test target에서만 실행됩니다.
- API startup은 암묵적으로 durable data를 생성하지 않습니다.

## 2. 핵심 질문

- migration와 seed는 각각 어떤 CLI command와 transaction/lifecycle을 소유합니까?
- applied migration record가 bundle과 diverged될 때 readiness는 어떤 상태를 반환합니까?
- destructive reset target이 test 전용임을 URL, DB name, schema/search path로 어떻게 검증합니까?
- application startup에서 schema/seed mutation을 제거한 뒤 누가 사전 준비를 책임집니까?

## 3. 완료 기준

- Commit map의 모든 SHA를 지정 브랜치 ancestry에서 확인합니다.
- 각 SHA의 parent 또는 직전 관련 SHA와 비교해 변경 전후 상태를 구분합니다.
- 파일, symbol, caller/callee, 상태 mutation, failure branch, cleanup을 실제 코드로 기록합니다.
- Fix는 이전 가정과 root cause를, test는 production path와 증명/비증명 범위를 연결합니다.
- 마지막 SHA까지만 사용해 Thread 최종 owner, invariant, execution flow를 작성합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Thread 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `1140fb868714` | `feat(db): migration 실행 경계 구성` | B | PERSISTENCE | runtime에서 schema initialization을 실행할 첫 migration 경계를 제공합니다. |
| 2 | `dea169d587a3` | `feat(db): 데이터베이스 CLI 명령 연결` | B | PERSISTENCE | migration/seed setup과 verification을 package CLI로 노출합니다. |
| 3 | `f9bb622a1117` | `refactor(db): SQL migration lifecycle 분리` | A | PERSISTENCE, RISK, REFACTOR | schema evolution과 seeding을 분리하고 SQL file을 Kysely migration lifecycle로 이동합니다. |
| 4 | `8da6edef28eb` | `feat(db): 환경별 seed profile 분리` | B | AUTH, REALTIME, PERSISTENCE | development/demo seed profile을 명시적으로 분리합니다. |
| 5 | `981ee655559b` | `refactor(db): migration과 seed CLI 연결` | B | PERSISTENCE | 분리된 migration·seed lifecycle을 CLI command에 연결합니다. |
| 6 | `30aac132e14e` | `feat(db): migration set 상태 검사 추가` | A | PERSISTENCE, OPERATIONS, RISK | bundle SQL name과 적용 record를 current/pending/diverged로 분류합니다. |
| 7 | `2f05d5d79c64` | `feat(db): repository readiness 경계 추가` | A | PERSISTENCE, OPERATIONS | storage health와 migration 상태를 repository-level readiness로 노출합니다. |
| 8 | `113b3c422192` | `feat(db): test database reset target guard 추가` | A | PERSISTENCE | destructive reset 대상 URL/schema를 fail-closed 방식으로 검증합니다. |
| 9 | `434403a7c16a` | `feat(db): test schema reset과 migration 실행 연결` | A | PERSISTENCE, RISK | 명시적인 `reset:test` CLI가 safe target에만 schema reset/migrate를 수행하도록 합니다. |
| 10 | `527b5f137425` | `test(db): test database reset guard 검증` | B | PERSISTENCE, TEST | non-test runtime, 일반 DB name, ambiguous search path를 거부하는지 검증합니다. |
| 11 | `e1a0316fbe84` | `fix(api): startup seed 생성을 제거` | B | PERSISTENCE | API process startup에서 implicit seed mutation을 제거합니다. |
| 12 | `5cac4843fd9b` | `test(api): startup seed 금지 검증` | B | REALTIME, TEST | entrypoint가 `ensureSeedData`를 호출하지 않는 source-level guard를 추가합니다. |

## 5. Commit별 학습 기록

### 5.1. `feat(db): migration 실행 경계 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `1140fb868714` |
| Importance | B |
| Tags | PERSISTENCE |
| Source에서 확정된 역할 | runtime에서 schema initialization을 실행할 첫 migration 경계를 제공합니다. |

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
- 다음 관련 SHA: `dea169d587a3` — `feat(db): 데이터베이스 CLI 명령 연결`

### 5.2. `feat(db): 데이터베이스 CLI 명령 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `dea169d587a3` |
| Importance | B |
| Tags | PERSISTENCE |
| Source에서 확정된 역할 | migration/seed setup과 verification을 package CLI로 노출합니다. |

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
- 직전 관련 SHA: `1140fb868714` — `feat(db): migration 실행 경계 구성`
- 다음 관련 SHA: `f9bb622a1117` — `refactor(db): SQL migration lifecycle 분리`

### 5.3. `refactor(db): SQL migration lifecycle 분리`

| 항목 | 값 |
| --- | --- |
| SHA | `f9bb622a1117` |
| Importance | A |
| Tags | PERSISTENCE, RISK, REFACTOR |
| Source에서 확정된 역할 | schema evolution과 seeding을 분리하고 SQL file을 Kysely migration lifecycle로 이동합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- 기존 경로와 새 경로가 공존하는 migration 구간 및 최종 duplicate implementation 제거 여부를 확인합니다.

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
- 직전 관련 SHA: `dea169d587a3` — `feat(db): 데이터베이스 CLI 명령 연결`
- 다음 관련 SHA: `8da6edef28eb` — `feat(db): 환경별 seed profile 분리`

### 5.4. `feat(db): 환경별 seed profile 분리`

| 항목 | 값 |
| --- | --- |
| SHA | `8da6edef28eb` |
| Importance | B |
| Tags | AUTH, REALTIME, PERSISTENCE |
| Source에서 확정된 역할 | development/demo seed profile을 명시적으로 분리합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.

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
- 직전 관련 SHA: `f9bb622a1117` — `refactor(db): SQL migration lifecycle 분리`
- 다음 관련 SHA: `981ee655559b` — `refactor(db): migration과 seed CLI 연결`

### 5.5. `refactor(db): migration과 seed CLI 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `981ee655559b` |
| Importance | B |
| Tags | PERSISTENCE |
| Source에서 확정된 역할 | 분리된 migration·seed lifecycle을 CLI command에 연결합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- 기존 경로와 새 경로가 공존하는 migration 구간 및 최종 duplicate implementation 제거 여부를 확인합니다.

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
- 직전 관련 SHA: `8da6edef28eb` — `feat(db): 환경별 seed profile 분리`
- 다음 관련 SHA: `30aac132e14e` — `feat(db): migration set 상태 검사 추가`

### 5.6. `feat(db): migration set 상태 검사 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `30aac132e14e` |
| Importance | A |
| Tags | PERSISTENCE, OPERATIONS, RISK |
| Source에서 확정된 역할 | bundle SQL name과 적용 record를 current/pending/diverged로 분류합니다. |

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
- 직전 관련 SHA: `981ee655559b` — `refactor(db): migration과 seed CLI 연결`
- 다음 관련 SHA: `2f05d5d79c64` — `feat(db): repository readiness 경계 추가`

### 5.7. `feat(db): repository readiness 경계 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `2f05d5d79c64` |
| Importance | A |
| Tags | PERSISTENCE, OPERATIONS |
| Source에서 확정된 역할 | storage health와 migration 상태를 repository-level readiness로 노출합니다. |

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
- 직전 관련 SHA: `30aac132e14e` — `feat(db): migration set 상태 검사 추가`
- 다음 관련 SHA: `113b3c422192` — `feat(db): test database reset target guard 추가`

### 5.8. `feat(db): test database reset target guard 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `113b3c422192` |
| Importance | A |
| Tags | PERSISTENCE |
| Source에서 확정된 역할 | destructive reset 대상 URL/schema를 fail-closed 방식으로 검증합니다. |

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
- 직전 관련 SHA: `2f05d5d79c64` — `feat(db): repository readiness 경계 추가`
- 다음 관련 SHA: `434403a7c16a` — `feat(db): test schema reset과 migration 실행 연결`

### 5.9. `feat(db): test schema reset과 migration 실행 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `434403a7c16a` |
| Importance | A |
| Tags | PERSISTENCE, RISK |
| Source에서 확정된 역할 | 명시적인 `reset:test` CLI가 safe target에만 schema reset/migrate를 수행하도록 합니다. |

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
- 직전 관련 SHA: `113b3c422192` — `feat(db): test database reset target guard 추가`
- 다음 관련 SHA: `527b5f137425` — `test(db): test database reset guard 검증`

### 5.10. `test(db): test database reset guard 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `527b5f137425` |
| Importance | B |
| Tags | PERSISTENCE, TEST |
| Source에서 확정된 역할 | non-test runtime, 일반 DB name, ambiguous search path를 거부하는지 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
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
- 직전 관련 SHA: `434403a7c16a` — `feat(db): test schema reset과 migration 실행 연결`
- 다음 관련 SHA: `e1a0316fbe84` — `fix(api): startup seed 생성을 제거`

### 5.11. `fix(api): startup seed 생성을 제거`

| 항목 | 값 |
| --- | --- |
| SHA | `e1a0316fbe84` |
| Importance | B |
| Tags | PERSISTENCE |
| Source에서 확정된 역할 | API process startup에서 implicit seed mutation을 제거합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
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
- 직전 관련 SHA: `527b5f137425` — `test(db): test database reset guard 검증`
- 다음 관련 SHA: `5cac4843fd9b` — `test(api): startup seed 금지 검증`

### 5.12. `test(api): startup seed 금지 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `5cac4843fd9b` |
| Importance | B |
| Tags | REALTIME, TEST |
| Source에서 확정된 역할 | entrypoint가 `ensureSeedData`를 호출하지 않는 source-level guard를 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
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
- 직전 관련 SHA: `e1a0316fbe84` — `fix(api): startup seed 생성을 제거`
- 이 Thread의 최종 상태와 비교합니다.

## 6. Invariant ledger

| Invariant | 도입 SHA | 강화 SHA | 부족함이 드러난 SHA | 복구 fix | 고정 test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| schema evolution, seed data, application startup은 서로 다른 lifecycle로 관리됩니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| migration set divergence는 service readiness 실패로 드러나며 조용히 실행되지 않습니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| destructive reset은 검증된 test target에서만 실행됩니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| API startup은 암묵적으로 durable data를 생성하지 않습니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| [작성] | [SHA 순서 작성] | [test/failure injection 작성] | [작성] |

## 8. Ownership / state / responsibility 변화

| 축 | 초기 owner/state | 중간 전환 | 최종 owner/state | cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| migration files/records | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| seed profiles | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| database CLI | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| readiness status | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| test reset guard | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| startup composition | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |

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
