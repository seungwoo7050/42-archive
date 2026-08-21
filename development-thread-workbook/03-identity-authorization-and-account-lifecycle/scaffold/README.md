# 신원·권한·계정 수명주기

등록 사용자 session, logout/revocation, role assignment, administrator authorization, suspension audit, 이미 열린 realtime connection 회수까지 계정의 전체 수명주기를 다룹니다.

## 범위

- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`
- 상태: scaffold only
- 제품 전달 제외: Docker/Caddy/Compose image, CI 배포 job, release artifact, dependency patch, media asset 생성은 이 카테고리의 학습 대상에서 제외합니다.

## Thread

1. [Server session·logout·인증 migration](01-server-session-logout-and-auth-migrations.md)
2. [명시적 role과 관리자 권한](02-explicit-role-and-administrator-authorization.md)
3. [계정 정지 audit atomicity와 live revocation](03-suspension-audit-atomicity-and-live-revocation.md)

## 사용 원칙

- 각 문서의 Commit map 순서를 유지합니다.
- exact SHA의 코드와 parent 상태를 확인합니다.
- 다른 카테고리에서 같은 SHA를 교차 참조하더라도 해당 문서의 질문에 맞는 근거만 기록합니다.
- scaffold는 계획 문서이므로 실행 결과나 완성된 해설을 미리 채우지 않습니다.
