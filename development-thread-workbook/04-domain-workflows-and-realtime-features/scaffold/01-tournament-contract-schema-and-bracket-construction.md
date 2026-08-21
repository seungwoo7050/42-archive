# Tournament contract·schema·bracket 구성

- 카테고리: `04-domain-workflows-and-realtime-features` — 도메인 워크플로와 실시간 기능
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

초기 tournament aggregate에서 전용 match contract/schema/mapper, 4인 준결승 bracket 생성, memory parity와 browser bracket 소비까지의 흐름을 복원합니다.

이 문서는 완성된 해설이 아니라 exact SHA를 순서대로 확인해 구현 발전을 복원하기 위한 scaffold입니다.

### 직접 연결되는 불변식

- bracket match는 entry list에서 매번 추론하지 않고 별도 durable lifecycle을 갖습니다.
- 같은 tournament의 round/slot은 하나의 match identity만 가집니다.
- browser가 표시하는 bracket/status/participant는 server persistence projection을 따릅니다.

## 2. 핵심 질문

- tournament aggregate와 individual bracket match는 어떤 ID와 상태로 연결됩니까?
- capacity 도달 시 semifinal participant/seed를 어떤 deterministic rule로 배정합니까?
- round/slot unique identity가 duplicate bracket row를 어떻게 막습니까?
- browser는 participant eligibility와 play link를 server summary에서 어떻게 파생합니까?

## 3. 완료 기준

- Commit map의 모든 SHA를 지정 브랜치 ancestry에서 확인합니다.
- 각 SHA의 parent 또는 직전 관련 SHA와 비교해 변경 전후 상태를 구분합니다.
- 파일, symbol, caller/callee, 상태 mutation, failure branch, cleanup을 실제 코드로 기록합니다.
- Fix는 이전 가정과 root cause를, test는 production path와 증명/비증명 범위를 연결합니다.
- 마지막 SHA까지만 사용해 Thread 최종 owner, invariant, execution flow를 작성합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Thread 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `34c80874f13f` | `feat(db): 토너먼트 row contract 정의` | B | PERSISTENCE, TOURNAMENT | tournament row를 public aggregate로 mapping하기 위한 typed persistence contract를 정의합니다. |
| 2 | `11e4c3dda1aa` | `feat(tournament): 대진 경기 contract 정의` | B | REALTIME, TOURNAMENT, WEB | round/slot/status/participants/winner/score/room/match ID를 포함한 shared tournament-match summary를 정의합니다. |
| 3 | `138e5b8590b6` | `feat(tournament): 대진 경기 schema 추가` | B | REALTIME, PERSISTENCE, TOURNAMENT | bracket state 전용 `tournament_matches` persistence model을 추가합니다. |
| 4 | `4021a437e7e0` | `feat(tournament): 대진 row mapper 정의` | B | REALTIME, PERSISTENCE, TOURNAMENT | database row를 application match record/public summary로 변환합니다. |
| 5 | `53579ad0f0bf` | `feat(tournament): 대진 경기 lifecycle 저장 구현` | A | REALTIME, PERSISTENCE, TOURNAMENT | tournament match 조회·시작·완료 repository operation을 두 backend에 추가합니다. |
| 6 | `0d6824683677` | `feat(tournament): 준결승 대진 생성과 조회 구현` | A | TOURNAMENT | 4인 capacity가 차면 semifinal 두 개를 만들고 summary에 persisted match를 포함합니다. |
| 7 | `b01adf728ca0` | `feat(tournament): memory 대진 진행 구현` | B | PERSISTENCE, TOURNAMENT | memory repository를 PostgreSQL bracket lifecycle과 behavior상 맞춥니다. |
| 8 | `b0a1505c6a0f` | `feat(tournament): 플레이 가능한 대진 UI 연결` | B | PROTOCOL, REALTIME, TOURNAMENT | placeholder bracket을 persisted match model로 교체하고 eligible participant를 play route에 연결합니다. |

## 5. Commit별 학습 기록

### 5.1. `feat(db): 토너먼트 row contract 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `34c80874f13f` |
| Importance | B |
| Tags | PERSISTENCE, TOURNAMENT |
| Source에서 확정된 역할 | tournament row를 public aggregate로 mapping하기 위한 typed persistence contract를 정의합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.

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
- 다음 관련 SHA: `11e4c3dda1aa` — `feat(tournament): 대진 경기 contract 정의`

### 5.2. `feat(tournament): 대진 경기 contract 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `11e4c3dda1aa` |
| Importance | B |
| Tags | REALTIME, TOURNAMENT, WEB |
| Source에서 확정된 역할 | round/slot/status/participants/winner/score/room/match ID를 포함한 shared tournament-match summary를 정의합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- page, component, hook, reducer, query cache 중 실제 state owner와 teardown 시 stale update 방지 경로를 확인합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.

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
- 직전 관련 SHA: `34c80874f13f` — `feat(db): 토너먼트 row contract 정의`
- 다음 관련 SHA: `138e5b8590b6` — `feat(tournament): 대진 경기 schema 추가`

### 5.3. `feat(tournament): 대진 경기 schema 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `138e5b8590b6` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE, TOURNAMENT |
| Source에서 확정된 역할 | bracket state 전용 `tournament_matches` persistence model을 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.

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
- 직전 관련 SHA: `11e4c3dda1aa` — `feat(tournament): 대진 경기 contract 정의`
- 다음 관련 SHA: `4021a437e7e0` — `feat(tournament): 대진 row mapper 정의`

### 5.4. `feat(tournament): 대진 row mapper 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `4021a437e7e0` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE, TOURNAMENT |
| Source에서 확정된 역할 | database row를 application match record/public summary로 변환합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.

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
- 직전 관련 SHA: `138e5b8590b6` — `feat(tournament): 대진 경기 schema 추가`
- 다음 관련 SHA: `53579ad0f0bf` — `feat(tournament): 대진 경기 lifecycle 저장 구현`

### 5.5. `feat(tournament): 대진 경기 lifecycle 저장 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `53579ad0f0bf` |
| Importance | A |
| Tags | REALTIME, PERSISTENCE, TOURNAMENT |
| Source에서 확정된 역할 | tournament match 조회·시작·완료 repository operation을 두 backend에 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.

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
- 직전 관련 SHA: `4021a437e7e0` — `feat(tournament): 대진 row mapper 정의`
- 다음 관련 SHA: `0d6824683677` — `feat(tournament): 준결승 대진 생성과 조회 구현`

### 5.6. `feat(tournament): 준결승 대진 생성과 조회 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `0d6824683677` |
| Importance | A |
| Tags | TOURNAMENT |
| Source에서 확정된 역할 | 4인 capacity가 차면 semifinal 두 개를 만들고 summary에 persisted match를 포함합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.

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
- 직전 관련 SHA: `53579ad0f0bf` — `feat(tournament): 대진 경기 lifecycle 저장 구현`
- 다음 관련 SHA: `b01adf728ca0` — `feat(tournament): memory 대진 진행 구현`

### 5.7. `feat(tournament): memory 대진 진행 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `b01adf728ca0` |
| Importance | B |
| Tags | PERSISTENCE, TOURNAMENT |
| Source에서 확정된 역할 | memory repository를 PostgreSQL bracket lifecycle과 behavior상 맞춥니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.

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
- 직전 관련 SHA: `0d6824683677` — `feat(tournament): 준결승 대진 생성과 조회 구현`
- 다음 관련 SHA: `b0a1505c6a0f` — `feat(tournament): 플레이 가능한 대진 UI 연결`

### 5.8. `feat(tournament): 플레이 가능한 대진 UI 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `b0a1505c6a0f` |
| Importance | B |
| Tags | PROTOCOL, REALTIME, TOURNAMENT |
| Source에서 확정된 역할 | placeholder bracket을 persisted match model로 교체하고 eligible participant를 play route에 연결합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- runtime schema의 strictness, negative branch, producer/consumer의 공통 contract 사용 여부를 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.

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
- 직전 관련 SHA: `b01adf728ca0` — `feat(tournament): memory 대진 진행 구현`
- 이 Thread의 최종 상태와 비교합니다.

## 6. Invariant ledger

| Invariant | 도입 SHA | 강화 SHA | 부족함이 드러난 SHA | 복구 fix | 고정 test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| bracket match는 entry list에서 매번 추론하지 않고 별도 durable lifecycle을 갖습니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| 같은 tournament의 round/slot은 하나의 match identity만 가집니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| browser가 표시하는 bracket/status/participant는 server persistence projection을 따릅니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| [작성] | [SHA 순서 작성] | [test/failure injection 작성] | [작성] |

## 8. Ownership / state / responsibility 변화

| 축 | 초기 owner/state | 중간 전환 | 최종 owner/state | cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| tournament aggregate | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| tournament_matches rows | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| round/slot identity | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| bracket creation | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| row/public mapper | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| browser eligibility | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |

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
