# 검증·테스트 아키텍처

제품 전달 CI의 artifact/process 관점은 `09`에서 다루고, 여기서는 코드와 실제 service behavior를 검증하는 deterministic unit/contract test, PostgreSQL concurrency/failure injection, process smoke, browser E2E, load/fault evidence의 설계를 다룹니다.

## 범위

- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`
- 상태: scaffold only
- 제품 전달 제외: Docker/Caddy/Compose image, CI 배포 job, release artifact, dependency patch, media asset 생성은 이 카테고리의 학습 대상에서 제외합니다.

## Thread

1. [Deterministic contract·concurrency·failure-injection test](01-deterministic-contract-concurrency-and-failure-injection-tests.md)
2. [Process·browser·load·fault evidence](02-process-browser-load-and-fault-evidence.md)

## 사용 원칙

- 각 문서의 Commit map 순서를 유지합니다.
- exact SHA의 코드와 parent 상태를 확인합니다.
- 다른 카테고리에서 같은 SHA를 교차 참조하더라도 해당 문서의 질문에 맞는 근거만 기록합니다.
- scaffold는 계획 문서이므로 실행 결과나 완성된 해설을 미리 채우지 않습니다.
