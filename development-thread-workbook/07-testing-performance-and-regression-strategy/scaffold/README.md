# Testing, performance, and regression strategy

## 범위

이 category는 production behavior를 검증·특성화하거나 client/runtime cost를 줄인 뒤 회귀 evidence로 고정하는 source-level engineering stories를 다룹니다.

- 포함: content/unit contracts, route characterization, component interaction와 hydration, browser accessibility matrix, server-first/client performance, visual regression.
- 제외: production bundle baseline, route growth budget, Lighthouse threshold, CI activation, standalone/Docker delivery. 이 연속 이력은 `08-product-delivery-and-runtime-verification/04-release-performance-gates.md` 및 category 08이 소유합니다.

## Phase 1 category audit 결과

- Category boundary는 적절합니다. Test/optimization 자체와 release enforcement를 분리해 category 08과 중복하지 않습니다.
- Thread 수와 filename은 6개로 유지했습니다. 독립 engineering story를 새로 합치거나 분리할 근거는 없었습니다.
- `03-component-interaction-and-hydration-regression.md`에 초기 selector ownership을 보여 주는 `e43e8addd7f3`, `c69ef85c98b2`를 앞에 추가했습니다.
- `06-visual-regression-and-responsive-baselines.md`는 actual chronology에 맞춰 `31c438b52e4b` → `055b733cbb7e` → `882a2f9d753e`로 고쳤습니다.
- `31c438b52e4b`는 route-browser foundation, accessibility foundation, visual foundation이라는 서로 다른 파일/검증 역할로 Threads 2·4·6에 의도적으로 재사용됩니다.
- `055b733cbb7e`는 renderer characterization과 visual structural precondition이라는 서로 다른 역할로 Threads 2·6에 재사용됩니다.
- 나머지 commit은 이동·삭제하지 않았고, 범용 조사 문구만 exact file/symbol/test/config 단위 질문으로 교체했습니다.
- Source 분류상 이 category의 고유 commit은 A-level 24개, B-level 1개이며 S/C-level은 없습니다. 중요도를 인위적으로 재분류하지 않았습니다.

## 동결된 Thread 순서

1. [Content contract test harness](01-content-contract-test-harness.md)
2. [Route presentation characterization](02-route-presentation-characterization.md)
3. [Component interaction and hydration regression](03-component-interaction-and-hydration-regression.md)
4. [Browser accessibility route matrix](04-browser-accessibility-route-matrix.md)
5. [Client performance and server-first optimization](05-client-performance-and-server-first-optimization.md)
6. [Visual regression and responsive baselines](06-visual-regression-and-responsive-baselines.md)

## Commit coverage

| 항목 | 값 |
| --- | ---: |
| Thread 수 | 6 |
| Commit 참조 수 | 28 |
| 고유 SHA 수 | 25 |
| A-level 고유 SHA | 24 |
| B-level 고유 SHA | 1 |
| 추가된 SHA | 2 |
| 제거된 SHA | 0 |
| 순서가 수정된 Thread | 1 |

## Phase 2 completion record

| 검증 항목 | 기록 |
| --- | --- |
| Scaffold/completed counterpart |  |
| Frozen scaffold integrity |  |
| Commit identity |  |
| Branch scope |  |
| Historical evidence |  |
| Runtime tests |  |
| Execution limitation |  |
| Markdown/package |  |

## 문서 사용법

1. Thread 목표·invariant·commit map을 먼저 읽습니다.
2. 각 SHA를 parent와 비교하고 해당 SHA의 changed files/resulting locations만 설명합니다.
3. Fix는 이전 assumption과, test는 실제 production path 및 non-guarantee와 연결합니다.
4. Runtime command가 없으면 정적 inspection만 수행했다는 사실을 유지합니다.
5. 마지막에 invariant ledger, ownership transfer와 코드 없는 final flow로 학습을 마칩니다.
