# 런타임 관측성과 서비스 상태

애플리케이션 startup/readiness, migration health, Prometheus observer boundary, event-loop 및 realtime delivery 측정, GameHub runtime limiter 통합과 failure containment를 다룹니다. 배포 artifact 자체는 `09-production-delivery-and-release-engineering`에서 다룹니다.

## 범위

- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`
- 상태: scaffold only
- 제품 전달 제외: Docker/Caddy/Compose image, CI 배포 job, release artifact, dependency patch, media asset 생성은 이 카테고리의 학습 대상에서 제외합니다.

## Thread

1. [Startup·liveness·readiness·storage state](01-startup-liveness-readiness-and-storage-state.md)
2. [Metrics observer boundary와 cardinality](02-metrics-observer-boundaries-and-cardinality.md)
3. [Runtime limit 통합과 failure containment](03-runtime-limit-integration-and-failure-containment.md)

## 사용 원칙

- 각 문서의 Commit map 순서를 유지합니다.
- exact SHA의 코드와 parent 상태를 확인합니다.
- 다른 카테고리에서 같은 SHA를 교차 참조하더라도 해당 문서의 질문에 맞는 근거만 기록합니다.
- scaffold는 계획 문서이므로 실행 결과나 완성된 해설을 미리 채우지 않습니다.
