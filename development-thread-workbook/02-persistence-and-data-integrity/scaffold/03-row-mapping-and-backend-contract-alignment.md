# Row mapping과 backend contract 정렬

- 카테고리: `02-persistence-and-data-integrity` — 영속성·데이터 무결성
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

PostgreSQL row·join projection과 memory record가 같은 canonical type 및 relation assembly 경계로 정렬되는 구조 개선과 회귀 검증을 복원합니다.

이 문서는 완성된 해설이 아니라 exact SHA를 순서대로 확인해 구현 발전을 복원하기 위한 scaffold입니다.

### 직접 연결되는 불변식

- 관계형 row, relation assembly, public domain projection은 명시적인 단계로 분리됩니다.
- memory backend는 별도 alias가 아니라 canonical repository contract와 domain behavior를 따릅니다.
- mapper는 누락·nullable·enum 불일치를 application 경계 밖으로 유출하지 않습니다.

## 2. 핵심 질문

- canonical row type과 public domain type을 별도로 유지해야 하는 이유는 무엇입니까?
- nullable relation을 assembler가 먼저 resolve한 뒤 mapper에 전달하는 구조가 어떤 invalid state를 줄입니까?
- memory 구현이 SQL row 구조를 흉내 내는 것과 domain behavior parity를 보존하는 것은 어떻게 다릅니까?
- refactor 중 observable response/order/error semantics가 유지됐는지 어떤 테스트로 확인합니까?

## 3. 완료 기준

- Commit map의 모든 SHA를 지정 브랜치 ancestry에서 확인합니다.
- 각 SHA의 parent 또는 직전 관련 SHA와 비교해 변경 전후 상태를 구분합니다.
- 파일, symbol, caller/callee, 상태 mutation, failure branch, cleanup을 실제 코드로 기록합니다.
- Fix는 이전 가정과 root cause를, test는 production path와 증명/비증명 범위를 연결합니다.
- 마지막 SHA까지만 사용해 Thread 최종 owner, invariant, execution flow를 작성합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Thread 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `73b8ce0f0c26` | `refactor(db): repository user projection 타입 정렬` | B | AUTH, PERSISTENCE | memory user storage를 canonical `UserProjectionRow`로 정렬합니다. |
| 2 | `3d0ae79affd5` | `refactor(db): memory match record 계약 정렬` | B | PERSISTENCE | memory match record를 write command 상속 대신 explicit stored shape로 만듭니다. |
| 3 | `3e3f21129369` | `refactor(db): canonical row schema 타입 정렬` | B | PERSISTENCE, TOURNAMENT | DB enum과 row projection TypeScript representation을 중앙화합니다. |
| 4 | `212650b2863d` | `refactor(db): row mapper record 타입 정렬` | B | PERSISTENCE, TOURNAMENT | tournament match view type을 canonical row enum에서 파생합니다. |
| 5 | `45144a3719bc` | `refactor(db): dashboard와 friendship 조회 경계 정렬` | B | PERSISTENCE | optional SQL fragment 대신 participant/global 두 query shape를 명시합니다. |
| 6 | `ce41a880d6c6` | `refactor(db): PostgreSQL tournament helper와 admin 경계 정렬` | B | PERSISTENCE, TOURNAMENT | tournament relation을 조립하는 PostgreSQL helper를 추출합니다. |
| 7 | `5c8659ea233b` | `refactor(db): tournament relation mapper 계약 정렬` | B | PERSISTENCE, TOURNAMENT | row와 entries/matches/winner related data를 분리해 mapper에 전달합니다. |
| 8 | `f77e317de4c1` | `refactor(db): memory match completion과 admin 경계 정렬` | B | REALTIME, PERSISTENCE, TOURNAMENT | memory repository가 tournament와 match를 함께 resolve하는 helper를 사용합니다. |
| 9 | `9d64ea406b03` | `refactor(db): memory tournament 확정 경계 정렬` | B | PERSISTENCE, TOURNAMENT | tournament aggregate+match lookup result 중심으로 finalization을 통합합니다. |
| 10 | `b34fdaa1e9c2` | `refactor(db): memory chat과 tournament 진입 경계 정렬` | B | PERSISTENCE, TOURNAMENT | memory method를 DB implementation과 동일한 typed domain boundary로 맞춥니다. |
| 11 | `dc0e60e6aa35` | `test(db): database row mapping contract 검증` | B | PERSISTENCE, TOURNAMENT, TEST | relational row에서 shared API domain shape로의 변환을 고정합니다. |

## 5. Commit별 학습 기록

### 5.1. `refactor(db): repository user projection 타입 정렬`

| 항목 | 값 |
| --- | --- |
| SHA | `73b8ce0f0c26` |
| Importance | B |
| Tags | AUTH, PERSISTENCE |
| Source에서 확정된 역할 | memory user storage를 canonical `UserProjectionRow`로 정렬합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
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
- 이 commit의 parent와 비교합니다.
- 다음 관련 SHA: `3d0ae79affd5` — `refactor(db): memory match record 계약 정렬`

### 5.2. `refactor(db): memory match record 계약 정렬`

| 항목 | 값 |
| --- | --- |
| SHA | `3d0ae79affd5` |
| Importance | B |
| Tags | PERSISTENCE |
| Source에서 확정된 역할 | memory match record를 write command 상속 대신 explicit stored shape로 만듭니다. |

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
- 직전 관련 SHA: `73b8ce0f0c26` — `refactor(db): repository user projection 타입 정렬`
- 다음 관련 SHA: `3e3f21129369` — `refactor(db): canonical row schema 타입 정렬`

### 5.3. `refactor(db): canonical row schema 타입 정렬`

| 항목 | 값 |
| --- | --- |
| SHA | `3e3f21129369` |
| Importance | B |
| Tags | PERSISTENCE, TOURNAMENT |
| Source에서 확정된 역할 | DB enum과 row projection TypeScript representation을 중앙화합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.
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
- 직전 관련 SHA: `3d0ae79affd5` — `refactor(db): memory match record 계약 정렬`
- 다음 관련 SHA: `212650b2863d` — `refactor(db): row mapper record 타입 정렬`

### 5.4. `refactor(db): row mapper record 타입 정렬`

| 항목 | 값 |
| --- | --- |
| SHA | `212650b2863d` |
| Importance | B |
| Tags | PERSISTENCE, TOURNAMENT |
| Source에서 확정된 역할 | tournament match view type을 canonical row enum에서 파생합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.
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
- 직전 관련 SHA: `3e3f21129369` — `refactor(db): canonical row schema 타입 정렬`
- 다음 관련 SHA: `45144a3719bc` — `refactor(db): dashboard와 friendship 조회 경계 정렬`

### 5.5. `refactor(db): dashboard와 friendship 조회 경계 정렬`

| 항목 | 값 |
| --- | --- |
| SHA | `45144a3719bc` |
| Importance | B |
| Tags | PERSISTENCE |
| Source에서 확정된 역할 | optional SQL fragment 대신 participant/global 두 query shape를 명시합니다. |

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
- 직전 관련 SHA: `212650b2863d` — `refactor(db): row mapper record 타입 정렬`
- 다음 관련 SHA: `ce41a880d6c6` — `refactor(db): PostgreSQL tournament helper와 admin 경계 정렬`

### 5.6. `refactor(db): PostgreSQL tournament helper와 admin 경계 정렬`

| 항목 | 값 |
| --- | --- |
| SHA | `ce41a880d6c6` |
| Importance | B |
| Tags | PERSISTENCE, TOURNAMENT |
| Source에서 확정된 역할 | tournament relation을 조립하는 PostgreSQL helper를 추출합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.
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
- 직전 관련 SHA: `45144a3719bc` — `refactor(db): dashboard와 friendship 조회 경계 정렬`
- 다음 관련 SHA: `5c8659ea233b` — `refactor(db): tournament relation mapper 계약 정렬`

### 5.7. `refactor(db): tournament relation mapper 계약 정렬`

| 항목 | 값 |
| --- | --- |
| SHA | `5c8659ea233b` |
| Importance | B |
| Tags | PERSISTENCE, TOURNAMENT |
| Source에서 확정된 역할 | row와 entries/matches/winner related data를 분리해 mapper에 전달합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.
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
- 직전 관련 SHA: `ce41a880d6c6` — `refactor(db): PostgreSQL tournament helper와 admin 경계 정렬`
- 다음 관련 SHA: `f77e317de4c1` — `refactor(db): memory match completion과 admin 경계 정렬`

### 5.8. `refactor(db): memory match completion과 admin 경계 정렬`

| 항목 | 값 |
| --- | --- |
| SHA | `f77e317de4c1` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE, TOURNAMENT |
| Source에서 확정된 역할 | memory repository가 tournament와 match를 함께 resolve하는 helper를 사용합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.
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
- 직전 관련 SHA: `5c8659ea233b` — `refactor(db): tournament relation mapper 계약 정렬`
- 다음 관련 SHA: `9d64ea406b03` — `refactor(db): memory tournament 확정 경계 정렬`

### 5.9. `refactor(db): memory tournament 확정 경계 정렬`

| 항목 | 값 |
| --- | --- |
| SHA | `9d64ea406b03` |
| Importance | B |
| Tags | PERSISTENCE, TOURNAMENT |
| Source에서 확정된 역할 | tournament aggregate+match lookup result 중심으로 finalization을 통합합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.
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
- 직전 관련 SHA: `f77e317de4c1` — `refactor(db): memory match completion과 admin 경계 정렬`
- 다음 관련 SHA: `b34fdaa1e9c2` — `refactor(db): memory chat과 tournament 진입 경계 정렬`

### 5.10. `refactor(db): memory chat과 tournament 진입 경계 정렬`

| 항목 | 값 |
| --- | --- |
| SHA | `b34fdaa1e9c2` |
| Importance | B |
| Tags | PERSISTENCE, TOURNAMENT |
| Source에서 확정된 역할 | memory method를 DB implementation과 동일한 typed domain boundary로 맞춥니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.
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
- 직전 관련 SHA: `9d64ea406b03` — `refactor(db): memory tournament 확정 경계 정렬`
- 다음 관련 SHA: `dc0e60e6aa35` — `test(db): database row mapping contract 검증`

### 5.11. `test(db): database row mapping contract 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `dc0e60e6aa35` |
| Importance | B |
| Tags | PERSISTENCE, TOURNAMENT, TEST |
| Source에서 확정된 역할 | relational row에서 shared API domain shape로의 변환을 고정합니다. |

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
- 직전 관련 SHA: `b34fdaa1e9c2` — `refactor(db): memory chat과 tournament 진입 경계 정렬`
- 이 Thread의 최종 상태와 비교합니다.

## 6. Invariant ledger

| Invariant | 도입 SHA | 강화 SHA | 부족함이 드러난 SHA | 복구 fix | 고정 test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| 관계형 row, relation assembly, public domain projection은 명시적인 단계로 분리됩니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| memory backend는 별도 alias가 아니라 canonical repository contract와 domain behavior를 따릅니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| mapper는 누락·nullable·enum 불일치를 application 경계 밖으로 유출하지 않습니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| [작성] | [SHA 순서 작성] | [test/failure injection 작성] | [작성] |

## 8. Ownership / state / responsibility 변화

| 축 | 초기 owner/state | 중간 전환 | 최종 owner/state | cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| canonical row types | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| relation assembler | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| public mapper | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| memory stored records | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| backend parity tests | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |

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
