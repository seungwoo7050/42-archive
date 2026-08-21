# 애플리케이션 기반과 API 경계

모노레포 package ownership, shared executable contract, Fastify resource API, typed failure, strict request validation, runtime mode와 CORS 같은 HTTP 애플리케이션 기반을 다룹니다.

## 범위

- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`
- 상태: scaffold only
- 제품 전달 제외: Docker/Caddy/Compose image, CI 배포 job, release artifact, dependency patch, media asset 생성은 이 카테고리의 학습 대상에서 제외합니다.

## Thread

1. [Workspace·package·composition 경계](01-workspace-package-and-composition-boundaries.md)
2. [실행 가능한 HTTP contract와 resource API](02-executable-http-contracts-and-resource-api.md)
3. [Strict request validation과 내부 오류 격리](03-strict-request-validation-and-error-containment.md)
4. [Runtime mode·CORS·network trust](04-runtime-mode-cors-and-network-trust.md)

## 사용 원칙

- 각 문서의 Commit map 순서를 유지합니다.
- exact SHA의 코드와 parent 상태를 확인합니다.
- 다른 카테고리에서 같은 SHA를 교차 참조하더라도 해당 문서의 질문에 맞는 근거만 기록합니다.
- scaffold는 계획 문서이므로 실행 결과나 완성된 해설을 미리 채우지 않습니다.
