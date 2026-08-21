# Routing, navigation, and page lifecycle

## 범위

App Router query state, internal URL construction, shared shell navigation, dynamic routes, page enablement, not-found behavior와 공용 page context를 다룹니다.

## 분류 원칙

- 이 category/thread 구조는 원본 7개 Development Thread를 대체하거나 수정하지 않는 확장 계획입니다.
- Commit SHA, subject, importance와 tags는 branch의 `commit/commit-importance.md`를 따릅니다.
- Thread grouping과 목표는 웹 개발 학습 범위를 넓히기 위해 새로 계획했습니다.
- Product delivery 전용 작업은 `08-product-delivery-and-runtime-verification`에서 별도로 다룹니다.

## 권장 학습 순서

1. [Query state and route-preserving navigation](01-query-state-and-route-preserving-navigation.md)
2. [Shared shell navigation and mobile menu](02-shared-shell-navigation-and-mobile-menu.md)
3. [Project index and dynamic detail lifecycle](03-project-index-and-dynamic-detail-lifecycle.md)
4. [Auxiliary route lifecycle](04-auxiliary-route-lifecycle.md)
5. [Page context consolidation](05-page-context-consolidation.md)

## 문서 사용법

1. Thread 목표와 commit map을 먼저 읽습니다.
2. 각 SHA를 parent와 비교하고 해당 SHA의 resulting tree를 확인합니다.
3. learner-facing table과 code evidence를 채웁니다.
4. Invariant ledger, Failure → Fix → Test, ownership 변화를 연결합니다.
5. 마지막에 코드 없이 최종 흐름을 설명합니다.
