# Metrics observer boundary와 cardinality

- 카테고리: `07-runtime-observability-and-service-health` — 런타임 관측성과 서비스 상태
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

runtime, HTTP, repository, room/reconnect, finalization, snapshot delivery, event-loop lag를 Prometheus에 노출하되 domain code와 high-cardinality identity를 metric label에 결합하지 않는 구조를 복원합니다.

이 문서는 완성된 해설이 아니라 exact SHA를 순서대로 확인해 구현 발전을 복원하기 위한 scaffold입니다.

### 직접 연결되는 불변식

- 관측 코드는 domain state machine 내부 규칙을 소유하거나 변경하지 않습니다.
- metric label은 bounded vocabulary를 사용해 cardinality가 user/room 수에 비례하지 않습니다.
- delivery/finalization/readiness metric은 해당 결과가 실제 결정되는 경계에서 기록됩니다.

## 2. 핵심 질문

- metric registry와 collector lifecycle은 app startup/close에서 누가 소유합니까?
- HTTP raw URL 대신 route template을 label로 사용하는 이유는 무엇입니까?
- repository proxy가 method return type, `this`, throw/rejection semantics를 보존합니까?
- room/user/request ID를 metric label로 쓰지 않으면서 correlation은 log/observer에서 어떻게 유지합니까?
- snapshot drop과 send callback delay를 측정하는 위치가 실제 semantics owner와 일치합니까?

## 3. 완료 기준

- Commit map의 모든 SHA를 지정 브랜치 ancestry에서 확인합니다.
- 각 SHA의 parent 또는 직전 관련 SHA와 비교해 변경 전후 상태를 구분합니다.
- 파일, symbol, caller/callee, 상태 mutation, failure branch, cleanup을 실제 코드로 기록합니다.
- Fix는 이전 가정과 root cause를, test는 production path와 증명/비증명 범위를 연결합니다.
- 마지막 SHA까지만 사용해 Thread 최종 owner, invariant, execution flow를 작성합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Thread 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `69278d8fc456` | `feat(metrics): runtime gauge registry 추가` | B | REALTIME, OPERATIONS, OBSERVABILITY | Node collector와 live GameHub gauge를 위한 전용 registry를 만듭니다. |
| 2 | `02b3b3a32f14` | `feat(metrics): HTTP와 readiness 측정 추가` | B | OPERATIONS, OBSERVABILITY, PERF | normalized route/method/status로 request duration과 readiness를 측정합니다. |
| 3 | `843d355afc69` | `feat(metrics): repository operation 측정 추가` | B | PERSISTENCE, OBSERVABILITY | transparent proxy로 sync/async repository method duration/result를 측정합니다. |
| 4 | `e08367a1be5e` | `feat(metrics): game room과 reconnect 관측 추가` | B | AUTH, PROTOCOL, REALTIME | GameHub lifecycle 주변 observer로 room/reconnect event를 관측합니다. |
| 5 | `e850b3356b9b` | `feat(metrics): match finalization 결과 관측 추가` | B | REALTIME, PERSISTENCE, OBSERVABILITY | guest memory result와 DB-backed finalization success/failure를 구분해 측정합니다. |
| 6 | `c0d184bcc928` | `feat(metrics): snapshot delivery와 drop 관측 추가` | B | REALTIME, OBSERVABILITY, PERF | latest-buffer가 실제 delivery/drop을 결정하는 지점에서 측정합니다. |
| 7 | `685d85c863a4` | `test(metrics): database와 snapshot 지표 검증` | B | AUTH, REALTIME, PERSISTENCE | user/room ID를 label로 만들지 않고 DB/realtime behavior를 관측하는지 검증합니다. |
| 8 | `1baf4c5a57ba` | `feat(metrics): event-loop lag 측정 추가` | B | OBSERVABILITY | Node event-loop delay histogram의 p95를 gauge로 노출합니다. |

## 5. Commit별 학습 기록

### 5.1. `feat(metrics): runtime gauge registry 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `69278d8fc456` |
| Importance | B |
| Tags | REALTIME, OPERATIONS, OBSERVABILITY |
| Source에서 확정된 역할 | Node collector와 live GameHub gauge를 위한 전용 registry를 만듭니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- 측정 위치, label cardinality, threshold, time source와 측정 자체가 동작을 바꾸지 않는지 확인합니다.

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
- 다음 관련 SHA: `02b3b3a32f14` — `feat(metrics): HTTP와 readiness 측정 추가`

### 5.2. `feat(metrics): HTTP와 readiness 측정 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `02b3b3a32f14` |
| Importance | B |
| Tags | OPERATIONS, OBSERVABILITY, PERF |
| Source에서 확정된 역할 | normalized route/method/status로 request duration과 readiness를 측정합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- 측정 위치, label cardinality, threshold, time source와 측정 자체가 동작을 바꾸지 않는지 확인합니다.

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
- 직전 관련 SHA: `69278d8fc456` — `feat(metrics): runtime gauge registry 추가`
- 다음 관련 SHA: `843d355afc69` — `feat(metrics): repository operation 측정 추가`

### 5.3. `feat(metrics): repository operation 측정 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `843d355afc69` |
| Importance | B |
| Tags | PERSISTENCE, OBSERVABILITY |
| Source에서 확정된 역할 | transparent proxy로 sync/async repository method duration/result를 측정합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- 측정 위치, label cardinality, threshold, time source와 측정 자체가 동작을 바꾸지 않는지 확인합니다.

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
- 직전 관련 SHA: `02b3b3a32f14` — `feat(metrics): HTTP와 readiness 측정 추가`
- 다음 관련 SHA: `e08367a1be5e` — `feat(metrics): game room과 reconnect 관측 추가`

### 5.4. `feat(metrics): game room과 reconnect 관측 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `e08367a1be5e` |
| Importance | B |
| Tags | AUTH, PROTOCOL, REALTIME |
| Source에서 확정된 역할 | GameHub lifecycle 주변 observer로 room/reconnect event를 관측합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- runtime schema의 strictness, negative branch, producer/consumer의 공통 contract 사용 여부를 확인합니다.
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
- 직전 관련 SHA: `843d355afc69` — `feat(metrics): repository operation 측정 추가`
- 다음 관련 SHA: `e850b3356b9b` — `feat(metrics): match finalization 결과 관측 추가`

### 5.5. `feat(metrics): match finalization 결과 관측 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `e850b3356b9b` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE, OBSERVABILITY |
| Source에서 확정된 역할 | guest memory result와 DB-backed finalization success/failure를 구분해 측정합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- 측정 위치, label cardinality, threshold, time source와 측정 자체가 동작을 바꾸지 않는지 확인합니다.

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
- 직전 관련 SHA: `e08367a1be5e` — `feat(metrics): game room과 reconnect 관측 추가`
- 다음 관련 SHA: `c0d184bcc928` — `feat(metrics): snapshot delivery와 drop 관측 추가`

### 5.6. `feat(metrics): snapshot delivery와 drop 관측 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `c0d184bcc928` |
| Importance | B |
| Tags | REALTIME, OBSERVABILITY, PERF |
| Source에서 확정된 역할 | latest-buffer가 실제 delivery/drop을 결정하는 지점에서 측정합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- 측정 위치, label cardinality, threshold, time source와 측정 자체가 동작을 바꾸지 않는지 확인합니다.

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
- 직전 관련 SHA: `e850b3356b9b` — `feat(metrics): match finalization 결과 관측 추가`
- 다음 관련 SHA: `685d85c863a4` — `test(metrics): database와 snapshot 지표 검증`

### 5.7. `test(metrics): database와 snapshot 지표 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `685d85c863a4` |
| Importance | B |
| Tags | AUTH, REALTIME, PERSISTENCE |
| Source에서 확정된 역할 | user/room ID를 label로 만들지 않고 DB/realtime behavior를 관측하는지 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
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
- 직전 관련 SHA: `c0d184bcc928` — `feat(metrics): snapshot delivery와 drop 관측 추가`
- 다음 관련 SHA: `1baf4c5a57ba` — `feat(metrics): event-loop lag 측정 추가`

### 5.8. `feat(metrics): event-loop lag 측정 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `1baf4c5a57ba` |
| Importance | B |
| Tags | OBSERVABILITY |
| Source에서 확정된 역할 | Node event-loop delay histogram의 p95를 gauge로 노출합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- 측정 위치, label cardinality, threshold, time source와 측정 자체가 동작을 바꾸지 않는지 확인합니다.

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
- 직전 관련 SHA: `685d85c863a4` — `test(metrics): database와 snapshot 지표 검증`
- 이 Thread의 최종 상태와 비교합니다.

## 6. Invariant ledger

| Invariant | 도입 SHA | 강화 SHA | 부족함이 드러난 SHA | 복구 fix | 고정 test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| 관측 코드는 domain state machine 내부 규칙을 소유하거나 변경하지 않습니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| metric label은 bounded vocabulary를 사용해 cardinality가 user/room 수에 비례하지 않습니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| delivery/finalization/readiness metric은 해당 결과가 실제 결정되는 경계에서 기록됩니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| [작성] | [SHA 순서 작성] | [test/failure injection 작성] | [작성] |

## 8. Ownership / state / responsibility 변화

| 축 | 초기 owner/state | 중간 전환 | 최종 owner/state | cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| Prometheus registry | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| HTTP route labels | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| repository proxy | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| GameHub observer | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| finalization outcome | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| snapshot delivery/drop | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| event-loop histogram | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |

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
