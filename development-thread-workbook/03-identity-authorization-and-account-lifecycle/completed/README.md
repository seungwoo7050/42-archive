# 신원·권한·계정 수명주기

등록 사용자 session, server-side logout/revocation, explicit role assignment, administrator authorization, suspension audit, 이미 열린 realtime connection 회수까지 등록 계정의 수명주기를 다룹니다.

## 범위

- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`
- 상태: Phase 1 repository audit 후 동결된 authoritative scaffold
- 제품 전달 제외: Docker/Caddy/Compose image, CI delivery job, release artifact, dependency patch, media asset 생성은 이 카테고리의 학습 대상에서 제외합니다.

## Phase 1 category audit 결과

- 카테고리 경계는 적절합니다. durable registered-account session, role, suspension과 revocation에 한정합니다.
- cookie-only session·one-time WebSocket ticket과 guest transient trust domain은 이미 `05-core-realtime-architecture`의 source-defined Thread이므로 이 카테고리에 복제하지 않습니다.
- 기존 Thread 수는 3개로 유지합니다. 별도 독립 story를 추가할 repository evidence는 없었습니다.
- `42033a6f2f3a`와 `bf797871007c`는 role provisioning보다 suspension/audit lifecycle에 직접 속하므로 Thread 2에서 Thread 3으로 이동했습니다.
- 초기 ban→audit visibility→protected-write denial을 검증하는 `e07726592df5`를 Thread 3에 추가했습니다.
- 각 Thread의 commit 순서를 실제 branch chronology에 맞추고 generic 조사 문장을 concrete file/function/SQL/test task로 교체했습니다.
- source classification의 subject, importance, tags와 role은 변경하지 않았습니다.

## Thread

1. [Server session·logout·인증 migration](01-server-session-logout-and-auth-migrations.md)
2. [명시적 role과 관리자 권한](02-explicit-role-and-administrator-authorization.md)
3. [계정 정지 audit atomicity와 live revocation](03-suspension-audit-atomicity-and-live-revocation.md)

## 사용 원칙

- 각 문서의 frozen Commit map 순서를 유지합니다.
- exact SHA의 코드와 parent 또는 직전 관련 state를 확인합니다.
- 다른 카테고리에서 같은 SHA를 다루더라도 이 문서의 account-lifecycle 질문에 필요한 근거만 기록합니다.
- final HEAD code를 과거 SHA 설명에 소급하지 않습니다.
- 실행하지 않은 command는 성공한 것으로 기록하지 않습니다.

## Phase 2 completion evidence

| 검증 항목 | 결과 |
| --- | --- |
| Exact SHA inspection | 20개 frozen commit을 각 exact SHA의 GitHub commit diff로 확인했습니다. |
| Branch ancestry | source classification이 `72ac4c1870f`→`71c5c13480f0`의 complete linear branch history임을 확인했고, `71c5c13480f0`이 현재 `web/ft_transcendence` head의 ancestor임을 compare로 확인했습니다. |
| Runtime commands | 실행하지 않았습니다. sandbox의 GitHub DNS/network 제한으로 checkout과 dependency installation이 불가능했습니다. |
| Evidence discipline | runtime 성공을 주장하지 않고 code inspection과 repository test implementation만 기록했습니다. |
| Structure | frozen scaffold 4개 파일과 completed 4개 파일이 같은 상대 경로·Commit map을 가집니다. |
