# 영속성·데이터 무결성

AppRepository 추상화, memory/PostgreSQL parity, migration/seed lifecycle, row mapping, friendship canonical identity, tournament admission concurrency와 destructive test reset 안전성을 다룹니다.

## 범위

- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`
- 상태: scaffold only
- 제품 전달 제외: Docker/Caddy/Compose image, CI 배포 job, release artifact, dependency patch, media asset 생성은 이 카테고리의 학습 대상에서 제외합니다.

## Thread

1. [Repository 추상화·backend parity·read model](01-repository-abstraction-backend-parity-and-read-models.md)
2. [Migration·seed·readiness·reset lifecycle](02-migration-seed-readiness-and-reset-lifecycle.md)
3. [Row mapping과 backend contract 정렬](03-row-mapping-and-backend-contract-alignment.md)
4. [Canonical friendship과 동시 요청](04-canonical-friendship-and-concurrent-requests.md)
5. [Tournament admission과 capacity concurrency](05-tournament-admission-and-capacity-concurrency.md)

## 사용 원칙

- 각 문서의 Commit map 순서를 유지합니다.
- exact SHA의 코드와 parent 상태를 확인합니다.
- 다른 카테고리에서 같은 SHA를 교차 참조하더라도 해당 문서의 질문에 맞는 근거만 기록합니다.
- scaffold는 계획 문서이므로 실행 결과나 완성된 해설을 미리 채우지 않습니다.
