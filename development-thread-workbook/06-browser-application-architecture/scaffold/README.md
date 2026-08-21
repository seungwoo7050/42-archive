# 브라우저 애플리케이션 아키텍처

Next.js shell과 resource screen, browser HTTP adapter, game reducer/transport client, React hook migration, React Query cache, authoritative rendering/input, guest presentation policy를 다룹니다.

## 범위

- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`
- 상태: scaffold only
- 제품 전달 제외: Docker/Caddy/Compose image, CI 배포 job, release artifact, dependency patch, media asset 생성은 이 카테고리의 학습 대상에서 제외합니다.

## Thread

1. [Application shell·resource screen·API adapter](01-application-shell-resource-screens-and-api-adapters.md)
2. [Game connection reducer와 transport client](02-game-connection-reducer-and-transport-client.md)
3. [Game connection hook 전환과 legacy 제거](03-game-connection-hook-migration-and-legacy-removal.md)
4. [React Query cache ownership과 invalidation](04-react-query-cache-ownership-and-invalidation.md)
5. [Authoritative snapshot rendering과 입력](05-authoritative-snapshot-rendering-and-input.md)
6. [Guest browser policy와 transient result](06-guest-browser-policy-and-transient-results.md)

## 사용 원칙

- 각 문서의 Commit map 순서를 유지합니다.
- exact SHA의 코드와 parent 상태를 확인합니다.
- 다른 카테고리에서 같은 SHA를 교차 참조하더라도 해당 문서의 질문에 맞는 근거만 기록합니다.
- scaffold는 계획 문서이므로 실행 결과나 완성된 해설을 미리 채우지 않습니다.
