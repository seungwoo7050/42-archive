# 런타임 관측성과 서비스 상태

이 카테고리는 application startup/readiness, migration health, Prometheus observer boundary, event-loop 및 realtime delivery 측정, bounded runtime work, GameHub scheduler ownership, graceful drain, load/fault recovery와 database pool error containment를 다룹니다.

## 범위

- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`
- Category: `07-runtime-observability-and-service-health`
- 상태: Phase 1 audit 완료, frozen scaffold
- 제외: 일반적인 Docker/Caddy image 구성, CI 배포 job, release artifact, dependency patch, media asset 생성은 `09-production-delivery-and-release-engineering`의 범위입니다.
- 교차 참조 허용: application drain guarantee를 직접 성립시키는 container grace, runtime health를 직접 검증하는 load/fault harness는 이 카테고리에 포함합니다.

## Phase 1 감사 결과

초기 draft는 3개 Thread, 31개 selected commit으로 구성돼 있었습니다. 실제 `web/ft_transcendence`의 linear history와 `commit/commit-importance.md` 분류를 대조한 뒤 6개 Thread, 57개 unique selected commit으로 보정했습니다.

- Startup/readiness Thread는 기존 10개 commit을 유지했습니다.
- Metrics Thread는 `prom-client` dependency와 event-loop load exposure/threshold evidence를 추가했습니다.
- 기존 runtime-limit Thread는 primitive, GameHub 통합/shared scheduling, drain, load/fault/pool containment의 독립된 이야기로 분리했습니다.
- room별 timer에서 shared scheduler로 이동한 근거인 scheduler benchmark와 deterministic lifecycle tests를 추가했습니다.
- application의 60초 drain과 container의 70초 grace를 하나의 cross-layer invariant로 연결했습니다.
- 기존에 잘못 배열된 late history를 실제 branch 순서에 맞게 이동했습니다. 특히 cadence/load/fault/pool fix와 callback-congestion fix의 순서를 분리했습니다.
- draft에 있던 commit은 제거하지 않았으며, DB pool 관련 commit은 올바른 fault-containment Thread로 이동했습니다.
- 일반 logging redaction, build image, CI delivery와 dependency patch는 이 카테고리의 독립 engineering story가 아니므로 추가하지 않았습니다.

Phase 1 종료 뒤 이 `scaffold/` 파일 집합을 동결했습니다. `completed/`는 동일한 파일명·구조·fixed text를 보존하고 learner-facing block만 채운 사본입니다.

## Thread

1. [Startup·liveness·readiness·storage state](01-startup-liveness-readiness-and-storage-state.md)
2. [Metrics observer boundary와 cardinality](02-metrics-observer-boundaries-and-cardinality.md)
3. [Runtime limiter primitive와 bounded work](03-runtime-limiter-primitives-and-bounded-work.md)
4. [GameHub runtime 통합, shared scheduling과 congestion](04-gamehub-runtime-integration-shared-scheduling-and-congestion.md)
5. [Draining readiness와 graceful shutdown](05-draining-readiness-and-graceful-shutdown.md)
6. [Load·fault recovery와 pool error containment](06-load-fault-recovery-and-pool-error-containment.md)

## 사용 원칙

- 각 문서의 Commit map 순서를 유지합니다.
- exact SHA의 코드와 parent 또는 직전 관련 SHA를 확인합니다.
- 다른 카테고리에서 같은 SHA를 교차 참조하더라도 이 문서의 runtime health/ownership/failure 질문에 맞는 근거만 기록합니다.
- 실행하지 않은 test·benchmark·fault scenario의 결과는 기록하지 않습니다.
- `scaffold/`의 learner block 외 fixed text는 Phase 2에서 변경하지 않습니다.
