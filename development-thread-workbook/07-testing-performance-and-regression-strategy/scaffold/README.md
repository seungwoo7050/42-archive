# Testing, performance, and regression strategy

## 범위

Unit/content contracts, route characterization, component interaction, browser matrices, visual regression와 client-performance optimization을 다룹니다. CI·Docker·standalone delivery는 `08-product-delivery-and-runtime-verification`에서 별도로 다룹니다.

## 분류 원칙

- 이 category/thread 구조는 원본 7개 Development Thread를 대체하거나 수정하지 않는 확장 계획입니다.
- Commit SHA, subject, importance와 tags는 branch의 `commit/commit-importance.md`를 따릅니다.
- Thread grouping과 목표는 웹 개발 학습 범위를 넓히기 위해 새로 계획했습니다.
- Product delivery 전용 작업은 `08-product-delivery-and-runtime-verification`에서 별도로 다룹니다.

## 권장 학습 순서

1. [Content contract test harness](01-content-contract-test-harness.md)
2. [Route presentation characterization](02-route-presentation-characterization.md)
3. [Component interaction and hydration regression](03-component-interaction-and-hydration-regression.md)
4. [Browser accessibility route matrix](04-browser-accessibility-route-matrix.md)
5. [Client performance and server-first optimization](05-client-performance-and-server-first-optimization.md)
6. [Visual regression and responsive baselines](06-visual-regression-and-responsive-baselines.md)

## 문서 사용법

1. Thread 목표와 commit map을 먼저 읽습니다.
2. 각 SHA를 parent와 비교하고 해당 SHA의 resulting tree를 확인합니다.
3. learner-facing table과 code evidence를 채웁니다.
4. Invariant ledger, Failure → Fix → Test, ownership 변화를 연결합니다.
5. 마지막에 코드 없이 최종 흐름을 설명합니다.
