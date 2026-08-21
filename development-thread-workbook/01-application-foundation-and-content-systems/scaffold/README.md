# Application foundation and content systems

## 범위

실행 가능한 Next.js 애플리케이션의 시작점부터 domain content, presentation contract, loader, selector, runtime schema vocabulary와 starter catalog migration까지 다룹니다.

## 분류 원칙

- 이 category/thread 구조는 원본 7개 Development Thread를 대체하거나 수정하지 않는 확장 계획입니다.
- Commit SHA, subject, importance와 tags는 branch의 `commit/commit-importance.md`를 따릅니다.
- Thread grouping과 목표는 웹 개발 학습 범위를 넓히기 위해 새로 계획했습니다.
- Product delivery 전용 작업은 `08-product-delivery-and-runtime-verification`에서 별도로 다룹니다.

## 권장 학습 순서

1. [Runnable Next application boundary](01-runnable-next-application-boundary.md)
2. [Portfolio domain and aggregate model](02-portfolio-domain-and-aggregate-model.md)
3. [Presentation contracts for multi-route UI](03-presentation-contracts-for-multi-route-ui.md)
4. [Selectors, links, and derived content policy](04-selectors-links-and-derived-content-policy.md)
5. [Runtime schema vocabulary](05-runtime-schema-vocabulary.md)
6. [Starter catalog migration](06-starter-catalog-migration.md)

## 문서 사용법

1. Thread 목표와 commit map을 먼저 읽습니다.
2. 각 SHA를 parent와 비교하고 해당 SHA의 resulting tree를 확인합니다.
3. learner-facing table과 code evidence를 채웁니다.
4. Invariant ledger, Failure → Fix → Test, ownership 변화를 연결합니다.
5. 마지막에 코드 없이 최종 흐름을 설명합니다.
