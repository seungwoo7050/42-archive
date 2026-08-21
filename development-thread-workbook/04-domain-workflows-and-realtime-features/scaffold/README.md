# 도메인 워크플로와 실시간 기능

토너먼트 진행, profile/friend/dashboard read model, lobby presence/chat, chat authorization, pause/resume, NPC·AI 상대처럼 핵심 아키텍처 위에서 실제 제품 동작을 구성하는 웹 도메인 흐름을 다룹니다.

## 범위

- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`
- 상태: scaffold only
- 제품 전달 제외: Docker/Caddy/Compose image, CI 배포 job, release artifact, dependency patch, media asset 생성은 이 카테고리의 학습 대상에서 제외합니다.

## Thread

1. [Tournament contract·schema·bracket 구성](01-tournament-contract-schema-and-bracket-construction.md)
2. [Tournament room 시작·rollback·finalization handoff](02-tournament-room-start-rollback-and-finalization-handoff.md)
3. [Profile·friendship·dashboard·ranking journey](03-profile-friendship-dashboard-and-ranking-journeys.md)
4. [Lobby presence·chat·live statistics](04-lobby-presence-chat-and-live-statistics.md)
5. [Chat scope·storage·room authorization](05-chat-scope-storage-and-room-authorization.md)
6. [Pause·resume과 입력 neutralization](06-pause-resume-and-input-neutralization.md)
7. [NPC·AI policy와 fallback journey](07-npc-ai-policy-and-fallback-journey.md)

## 사용 원칙

- 각 문서의 Commit map 순서를 유지합니다.
- exact SHA의 코드와 parent 상태를 확인합니다.
- 다른 카테고리에서 같은 SHA를 교차 참조하더라도 해당 문서의 질문에 맞는 근거만 기록합니다.
- scaffold는 계획 문서이므로 실행 결과나 완성된 해설을 미리 채우지 않습니다.
