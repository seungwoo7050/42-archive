# 영속성·데이터 무결성

AppRepository 추상화, memory/PostgreSQL parity, migration·seed lifecycle, row mapping,
friendship canonical identity, tournament admission concurrency와 destructive test reset
안전성을 다룹니다.

## 범위

- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`
- Category: `02-persistence-and-data-integrity`
- 상태: Phase 1 감사 완료 후 동결된 scaffold
- 제품 전달 제외: Docker/Caddy/Compose image, 배포 job, release artifact, dependency
  보안 패치와 media asset 생성은 이 카테고리의 학습 대상에서 제외합니다.

## Category 감사 결론

- 카테고리 경계는 적절합니다. 영속성의 공통 repository·migration·row-mapping
  기반과 데이터 무결성 경쟁 상태만 포함합니다.
- 5개 Thread를 유지합니다. match finalization, 인증 session·WebSocket ticket,
  guest 격리, chat room 무결성, admin audit atomicity와 tournament match progression은
  독립된 engineering story이므로 다른 카테고리의 책임으로 남깁니다.
- Thread 1에는 `035b97ca7c58`, `6b661420e060`을 추가해 가짜 `bestStreak`
  구현의 fix와 regression test를 연결하고, `e935054ce0c9`를 추가해
  PostgreSQL integration 실행 경계를 포함했습니다.
- Thread 2에서는 `e1a0316fbe84`, `5cac4843fd9b`를 2026년 1월의 reset
  guard 작업보다 앞에 배치해 실제 branch history 순서를 복구했습니다.
- `9b62117a6909`, `d8050004e4ce`, `d2329e8dfc1d`,
  `7926b1366993`, `1b60b0a79963` 등 C-level formatting-only DB
  refactor는 독립적인 상태·책임 변화가 없어 Thread 3에 추가하지 않았습니다.
- 같은 `cdaca35ccf7f`는 friendship identity와 tournament capacity를 한 시험 파일에서
  함께 검증하므로 Thread 4와 Thread 5에서 각 불변식 관점으로 교차 참조합니다.

## Thread

1. [Repository 추상화·backend parity·read model](01-repository-abstraction-backend-parity-and-read-models.md)
2. [Migration·seed·readiness·reset lifecycle](02-migration-seed-readiness-and-reset-lifecycle.md)
3. [Row mapping과 backend contract 정렬](03-row-mapping-and-backend-contract-alignment.md)
4. [Canonical friendship과 동시 요청](04-canonical-friendship-and-concurrent-requests.md)
5. [Tournament admission과 capacity concurrency](05-tournament-admission-and-capacity-concurrency.md)

## 사용 원칙

- 각 문서의 Commit map 순서를 유지합니다.
- exact SHA의 코드와 parent 상태를 확인합니다.
- 다른 카테고리에서 같은 SHA를 교차 참조하더라도 이 문서의 질문에 맞는 근거만 기록합니다.
- Phase 2는 이 디렉터리의 동결 이후 scaffold를 수정하지 않고 completed counterpart만 채웁니다.
