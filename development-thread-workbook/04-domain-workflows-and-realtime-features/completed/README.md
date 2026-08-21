# 04 — Domain Workflows and Realtime Features

Repository: `seungwoo7050/42-archive`  
Branch: `web/ft_transcendence`  
Category path: `development-thread-workbook/04-domain-workflows-and-realtime-features`

## Phase 1 감사 결과와 동결 범위

- 이 category boundary는 유지했습니다. 제품 사용자가 거치는 tournament, profile/dashboard/ranking, lobby/chat, pause/resume, NPC/AI journey와 realtime 기능 통합이 대상입니다.
- canonical friendship pair 및 tournament admission/capacity concurrency는 `02-persistence-and-data-integrity`가 주 소유자입니다.
- simulation loop, connection lifecycle, Matchmaker reservation ownership, scheduler, finalization retry와 process drain은 `05-core-realtime-architecture`가 주 소유자입니다.
- 이 category는 위 subsystem을 중복 재구성하지 않고 제품 workflow에서 호출·표시·rollback·handoff되는 지점만 포함합니다.
- Thread 수와 파일명은 7개로 유지했습니다. 독립 Thread를 합치거나 분리하거나 다른 category commit을 흡수하지 않았습니다.

### Scaffold 보정 내역

- 기존 60개 reference에 repository evidence상 필요한 10개 intermediate/fix/test commit을 추가해 총 70개를 동결했습니다.
- Thread 01에 `9b1dabcc4bb4`, `4370ac3162b2`를 추가해 entry-only repository와 UI-fabricated bracket이라는 선행 상태를 보존했습니다.
- Thread 02에 `e338ea32b2a6`, `582a1615a2c6`, `10bf15723591`을 추가해 atomic finalization 구현·동시성/rollback 검증·GameHub handoff를 포함했습니다.
- Thread 03에 `8d79139a32da`, `be31566ac0fd`, `7fe29f991a9b`을 추가하고 실제 시간순으로 재배치해 fixed/sample read model 교정 chain을 복원했습니다.
- Thread 04에 `8ce1199ffd12`, `23a978879b81`을 추가하고 실제 시간순으로 재배치해 missing-body fix와 eventual presence smoke regression을 포함했습니다.
- commit을 삭제하거나 다른 Thread로 이동하지 않았습니다. cross-cutting `be31566ac0fd`는 profile/dashboard/ranking read-model 정직성 Thread에 한 번만 두고 lobby/tournament Thread에서 참조합니다.
- generic investigation 문구를 exact file, function, SQL, schema, test, timer, state owner, cleanup/failure/non-guarantee 질문으로 교체했습니다.

### Thread boundary와 ordering 판단

- Thread 01과 02는 분리했습니다. 전자는 tournament-match contract/schema/bracket topology의 생성과 소비를, 후자는 그 persisted match를 realtime room으로 publish하고 durable result로 인계하는 cross-boundary lifecycle을 소유합니다.
- Thread 03은 분리하지 않았습니다. profile, dashboard, leaderboard, friendship journey가 동일한 user/recent-match read model과 identity/cache invalidation에 연결되기 때문입니다. 단, friendship canonical pair와 동시성은 category 02를 참조합니다.
- Thread 04와 05는 분리했습니다. Thread 04는 `/lobby`와 한 화면에서 durable chat history, process-local presence, live statistics, HTTP/WebSocket 반영을 합치는 제품 journey를 소유합니다. Thread 05는 lobby/match scope-room 저장 불변식과 current-seat authorization이라는 독립 보안 story를 소유합니다.
- Thread 06은 scheduler/phase/input state를 함께 전환하는 독립 temporal lifecycle이고, Thread 07은 persisted NPC identity, queue timer, simulation policy, UI disclosure를 잇는 독립 fallback journey입니다.
- 전체 Thread 순서는 contract/storage → realtime handoff → user read journey → lobby composition → chat hardening → pause lifecycle → NPC fallback 순으로 유지했습니다. 서로 다른 기능의 commit은 branch에서 교차하지만 각 Thread 내부 commit map은 actual commit chronology로 정렬했습니다.

### 동결된 파일과 commit 수

| 파일 | Commit 수 |
| --- | ---: |
| `01-tournament-contract-schema-and-bracket-construction.md` | 10 |
| `02-tournament-room-start-rollback-and-finalization-handoff.md` | 10 |
| `03-profile-friendship-dashboard-and-ranking-journeys.md` | 17 |
| `04-lobby-presence-chat-and-live-statistics.md` | 12 |
| `05-chat-scope-storage-and-room-authorization.md` | 8 |
| `06-pause-resume-and-input-neutralization.md` | 5 |
| `07-npc-ai-policy-and-fallback-journey.md` | 8 |
| **합계** | **70** |

- Frozen commit manifest SHA-256: `16394a851a8ac4eae148544ffed672a2f47f717ec21af4b7bee53244da9fbf00`
- Phase 2에서는 위 commit map, 제목, 순서, Importance, Tags, source-defined 역할과 문서 구조를 변경하지 않습니다.

## 읽는 순서

1. [`01-tournament-contract-schema-and-bracket-construction.md`](01-tournament-contract-schema-and-bracket-construction.md) — 토너먼트 계약·스키마와 대진 구성
2. [`02-tournament-room-start-rollback-and-finalization-handoff.md`](02-tournament-room-start-rollback-and-finalization-handoff.md) — 토너먼트 경기방 시작 롤백과 결과 확정 인계
3. [`03-profile-friendship-dashboard-and-ranking-journeys.md`](03-profile-friendship-dashboard-and-ranking-journeys.md) — 프로필·친구·대시보드·순위표 여정
4. [`04-lobby-presence-chat-and-live-statistics.md`](04-lobby-presence-chat-and-live-statistics.md) — 로비 접속 상태·채팅과 실시간 지표
5. [`05-chat-scope-storage-and-room-authorization.md`](05-chat-scope-storage-and-room-authorization.md) — 채팅 scope 저장 불변식과 경기방 권한
6. [`06-pause-resume-and-input-neutralization.md`](06-pause-resume-and-input-neutralization.md) — 일시정지·재개와 입력 무효화
7. [`07-npc-ai-policy-and-fallback-journey.md`](07-npc-ai-policy-and-fallback-journey.md) — NPC AI 정책과 fallback 여정

## Evidence discipline

- 모든 구현 설명은 해당 SHA의 commit diff와 그 시점 파일/심볼을 기준으로 작성합니다.
- later refactor가 있는 경우 earlier section에 역투영하지 않고, 해당 commit에서 실제로 존재한 표현과 비보장을 기록합니다.
- test commit은 fixture/failure injection, production path, assertion, 증명/비증명 범위를 분리합니다.
- 로컬 checkout을 만들 수 없어 repository command나 test runner를 실행하지 않았습니다. 실행 결과를 만들지 않았으며 코드·test 구현 검사와 runtime evidence를 구분합니다.

## Phase 2 완료 및 검증 기록

<!-- LEARNER-ANSWER START readme:phase2-validation -->
- [x] frozen scaffold 8개 파일(README + 7 Threads)에 정확히 대응하는 completed 8개 파일을 생성했습니다.
- [x] 총 70개 commit reference의 SHA/subject/order/Importance/Tags/source role이 scaffold와 completed에서 일치합니다.
- [x] 모든 referenced SHA는 branch source classification과 exact commit 조회에서 `web/ft_transcendence` 이력의 commit으로 확인했습니다.
- [x] completed의 learner-facing placeholder를 모두 채웠으며 S/A/B/C 깊이를 구분했습니다.
- [x] fix/test 관계, historical SHA, 실행하지 않은 test의 비실행 표기를 검사했습니다.
- [x] Phase 2 전후 frozen scaffold tree SHA-256이 `cc53210489e51fe33c556628828cb23e680e7e35a4c7ce59b5c555889364629c`로 동일합니다.
- [x] remote repository에는 commit/push/PR/파일 변경을 수행하지 않았습니다.
<!-- LEARNER-ANSWER END readme:phase2-validation -->
