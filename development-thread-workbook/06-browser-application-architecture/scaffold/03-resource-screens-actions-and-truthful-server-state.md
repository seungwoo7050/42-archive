# Resource screens·actions·truthful server state

- 카테고리: `06-browser-application-architecture` — 브라우저 애플리케이션 아키텍처
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

lobby, dashboard, leaderboard, tournament, profile, admin 화면을 server read/action에 연결하고 request failure를 sample success로 위장하던 초기 설계를 loading/error/empty state로 교정하는 과정을 복원합니다.

### 직접 연결되는 불변식

- server-backed screen은 request 실패나 미확정 상태를 sample user, ranking, tournament, chat으로 대체하지 않습니다.
- 각 route는 route parameter와 user intent를 소유하되 resource의 진실성은 API response에서만 얻습니다.
- mutation 성공·실패 feedback은 실제 response 결과와 연결되며 inert control을 성공처럼 표시하지 않습니다.

## 2. 핵심 질문

- 각 초기 screen의 sample initial state가 실제 request failure를 어떻게 가렸습니까?
- profile handle, selected tournament, admin target user가 mutation 입력으로 어떻게 전달됩니까?
- loading, error, empty, success가 어떤 state 조합과 rendering branch로 구분됩니까?
- 초기 E2E action test가 sample fallback을 허용한 구체적 assertion은 무엇입니까?

## 3. 완료 기준

- Commit map의 모든 SHA를 지정 브랜치 ancestry에서 확인합니다.
- 각 SHA의 parent 또는 직전 관련 SHA와 비교해 변경 전후 상태를 구분합니다.
- 파일, 함수, class, state, caller/callee, failure branch, cleanup을 실제 코드로 기록합니다.
- Fix는 이전 가정과 root cause를, test는 production path와 증명/비증명 범위를 연결합니다.
- 마지막 SHA까지만 사용해 Thread 최종 owner, invariant, execution flow를 작성합니다.
- 중요도는 A-level의 위험·소유권·회귀 근거를 B-level보다 깊게 기록합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Thread 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `ea1f1b7ba543` | `feat(web): 로그인 사용자 로비 화면 구성` | B | REALTIME, WEB, OPERATIONS | authenticated home route를 lobby read model과 action을 갖는 화면으로 만듭니다. |
| 2 | `cbe876359d31` | `feat(web): 플레이어 대시보드 구현` | B | WEB | dashboard read model을 표시하는 route를 만듭니다. |
| 3 | `cb295396771f` | `feat(web): 순위표 화면 추가` | B | WEB | leaderboard projection을 표시합니다. |
| 4 | `4370ac3162b2` | `feat(web): 토너먼트 대진표 화면 추가` | B | TOURNAMENT, WEB | tournament list/create를 연결한 초기 bracket screen을 만듭니다. |
| 5 | `0afc0a0694bd` | `feat(web): 공개 프로필 화면 추가` | B | WEB | handle-scoped profile route를 만듭니다. |
| 6 | `5e11e944244d` | `feat(web): 관리자 화면 추가` | B | WEB | user/status를 표시하는 protected admin screen을 만듭니다. |
| 7 | `051eac1b4aee` | `feat(profile): 친구 요청 동작 연결` | B | AUTH, WEB | profile target을 friendship mutation에 연결합니다. |
| 8 | `bfea82733512` | `feat(admin): 사용자 상태 변경 동작 연결` | B | AUTH, WEB | admin status control을 authenticated mutation에 연결합니다. |
| 9 | `a4f665fd2999` | `feat(tournament): 생성과 참가 동작 연결` | B | AUTH, TOURNAMENT | selected tournament state와 create/join action을 연결합니다. |
| 10 | `8b2679d9e190` | `test(e2e): 화면 action의 실제 API 연결 검증` | B | REALTIME, TOURNAMENT, WEB | AI 시작, match chat, friendship, tournament, admin action을 browser에서 검증합니다. |
| 11 | `e0ef3fec89a6` | `feat(chat): 로비 채팅 입력 화면 추가` | B | WEB | 로비 채팅 writer와 bounded local history를 HomePage에 연결하고 lobby read fallback 일부를 제거합니다. |
| 12 | `4f9b3b312d0e` | `fix(lobby): 로비 상태 표현 개선` | B | REALTIME | 고정 wait/주간 증가 문구를 제거하고 server `LobbyStats`를 화면 지표의 source로 사용합니다. |
| 13 | `cd3787eefd6a` | `feat(chat): 로비 채팅과 접속 상태 실시간 반영` | B | AUTH, REALTIME, WEB | HomePage가 lobby WebSocket을 직접 소유해 chat fan-out과 presence-triggered reload를 local state에 반영합니다. |
| 14 | `be31566ac0fd` | `fix(web): 로그인 화면의 sample fallback 제거` | A | AUTH, TOURNAMENT, WEB | authenticated/server-backed screen이 failure를 sample success data로 대체하지 않게 합니다. |

## 5. Commit별 학습 기록

### 5.1. `feat(web): 로그인 사용자 로비 화면 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `ea1f1b7ba543` |
| Importance | B |
| Tags | REALTIME, WEB, OPERATIONS |
| Source에서 확정된 역할 | authenticated home route를 lobby read model과 action을 갖는 화면으로 만듭니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/page.tsx`의 players/chat/stat state와 `getLobby` 호출을 확인합니다.
- `StatCard`, player list, lobby chat, fixed wait/progress copy가 실제 server field와 연결되는지 확인합니다.
- sample initial value와 catch branch가 화면에 남기는 상태를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

#### 비교 기준

- 이 commit의 parent를 `git show ea1f1b7ba543^` 및 `git diff ea1f1b7ba543^ ea1f1b7ba543`로 비교합니다.
- Thread 내 다음 관련 SHA: `cbe876359d31` — `feat(web): 플레이어 대시보드 구현`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.2. `feat(web): 플레이어 대시보드 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `cbe876359d31` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | dashboard read model을 표시하는 route를 만듭니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/dashboard/page.tsx`의 `getDashboard` effect와 sample initial state를 확인합니다.
- rating/win/loss/recent match field가 실제 response에서 읽히는지 확인합니다.
- SVG rating graph가 response history가 아니라 고정 coordinate인지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

#### 비교 기준

- Thread 내 직전 관련 SHA: `ea1f1b7ba543` — `feat(web): 로그인 사용자 로비 화면 구성`
- Thread 내 다음 관련 SHA: `cb295396771f` — `feat(web): 순위표 화면 추가`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.3. `feat(web): 순위표 화면 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `cb295396771f` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | leaderboard projection을 표시합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/leaderboard/page.tsx`의 `getLeaderboard` effect와 sample entries를 확인합니다.
- rank, display name, rating, wins/losses rendering과 key를 확인합니다.
- request failure와 empty ranking이 구분되는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

#### 비교 기준

- Thread 내 직전 관련 SHA: `cbe876359d31` — `feat(web): 플레이어 대시보드 구현`
- Thread 내 다음 관련 SHA: `4370ac3162b2` — `feat(web): 토너먼트 대진표 화면 추가`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.4. `feat(web): 토너먼트 대진표 화면 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `4370ac3162b2` |
| Importance | B |
| Tags | TOURNAMENT, WEB |
| Source에서 확정된 역할 | tournament list/create를 연결한 초기 bracket screen을 만듭니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/tournaments/page.tsx`의 sample tournaments, selected item, create control을 확인합니다.
- bracket column이 첫 tournament의 entries를 `slice`해 임의 배치하는지 확인합니다.
- create button이 실제 API mutation인지 local-only인지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

#### 비교 기준

- Thread 내 직전 관련 SHA: `cb295396771f` — `feat(web): 순위표 화면 추가`
- Thread 내 다음 관련 SHA: `0afc0a0694bd` — `feat(web): 공개 프로필 화면 추가`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.5. `feat(web): 공개 프로필 화면 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `0afc0a0694bd` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | handle-scoped profile route를 만듭니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/profile/[handle]/page.tsx`의 params 처리와 sample user 초기값을 확인합니다.
- handle 길이 등에서 파생한 가짜 statistic/prose가 있는지 확인합니다.
- 친구 요청·공유 button이 실제 handler와 연결됐는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

#### 비교 기준

- Thread 내 직전 관련 SHA: `4370ac3162b2` — `feat(web): 토너먼트 대진표 화면 추가`
- Thread 내 다음 관련 SHA: `5e11e944244d` — `feat(web): 관리자 화면 추가`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.6. `feat(web): 관리자 화면 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `5e11e944244d` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | user/status를 표시하는 protected admin screen을 만듭니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/admin/page.tsx`의 sample users와 `getAdminUsers` 호출을 확인합니다.
- request error를 catch한 뒤 sample rows가 유지되는지 확인합니다.
- status/review control이 실제 mutation과 연결됐는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

#### 비교 기준

- Thread 내 직전 관련 SHA: `0afc0a0694bd` — `feat(web): 공개 프로필 화면 추가`
- Thread 내 다음 관련 SHA: `051eac1b4aee` — `feat(profile): 친구 요청 동작 연결`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.7. `feat(profile): 친구 요청 동작 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `051eac1b4aee` |
| Importance | B |
| Tags | AUTH, WEB |
| Source에서 확정된 역할 | profile target을 friendship mutation에 연결합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `profile/[handle]/page.tsx`의 `getProfile(handle)`와 `requestFriend(handle)` 호출을 확인합니다.
- request pending/notice와 button disabled 조건을 확인합니다.
- profile load failure가 sample user를 그대로 두는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

#### 비교 기준

- Thread 내 직전 관련 SHA: `5e11e944244d` — `feat(web): 관리자 화면 추가`
- Thread 내 다음 관련 SHA: `bfea82733512` — `feat(admin): 사용자 상태 변경 동작 연결`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.8. `feat(admin): 사용자 상태 변경 동작 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `bfea82733512` |
| Importance | B |
| Tags | AUTH, WEB |
| Source에서 확정된 역할 | admin status control을 authenticated mutation에 연결합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `admin/page.tsx`의 active↔banned target 계산과 `setUserStatus` 호출을 확인합니다.
- 성공 response로 row를 교체하는지, 실패 시 어떤 message를 남기는지 확인합니다.
- admin list load failure 뒤 sample row action이 계속 가능한지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

#### 비교 기준

- Thread 내 직전 관련 SHA: `051eac1b4aee` — `feat(profile): 친구 요청 동작 연결`
- Thread 내 다음 관련 SHA: `a4f665fd2999` — `feat(tournament): 생성과 참가 동작 연결`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.9. `feat(tournament): 생성과 참가 동작 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `a4f665fd2999` |
| Importance | B |
| Tags | AUTH, TOURNAMENT |
| Source에서 확정된 역할 | selected tournament state와 create/join action을 연결합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `tournaments/page.tsx`의 selected ID, create form, `createTournament`, `joinTournament` 호출을 확인합니다.
- 생성 성공 후 새 tournament를 selection에 반영하는 순서를 확인합니다.
- join target이 현재 selection과 current user/session을 어떻게 요구하는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

#### 비교 기준

- Thread 내 직전 관련 SHA: `bfea82733512` — `feat(admin): 사용자 상태 변경 동작 연결`
- Thread 내 다음 관련 SHA: `8b2679d9e190` — `test(e2e): 화면 action의 실제 API 연결 검증`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.10. `test(e2e): 화면 action의 실제 API 연결 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `8b2679d9e190` |
| Importance | B |
| Tags | REALTIME, TOURNAMENT, WEB |
| Source에서 확정된 역할 | AI 시작, match chat, friendship, tournament, admin action을 browser에서 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `tests/e2e`의 action별 scenario와 locator/assertion을 확인합니다.
- admin test가 실제 row와 sample fallback 중 하나를 허용하는 assertion인지 확인합니다.
- server mutation 이후 어떤 visible text/state만 확인하고 persistence는 직접 확인하지 않는지 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

#### Test 복원

| 항목 | 근거 |
| --- | --- |
| 검증 대상 production 불변식 | [학습자 작성: 검증 대상 production 불변식] |
| 재현한 실패/경계 | [학습자 작성: 재현한 실패/경계] |
| 테스트 기법 | [학습자 작성: 테스트 기법] |
| 증명하는 것 | [학습자 작성: 증명하는 것] |
| 증명하지 않는 것 | [학습자 작성: 증명하지 않는 것] |
| 검증 분류 | [학습자 작성: 검증 분류] |

#### 비교 기준

- Thread 내 직전 관련 SHA: `a4f665fd2999` — `feat(tournament): 생성과 참가 동작 연결`
- Thread 내 다음 관련 SHA: `e0ef3fec89a6` — `feat(chat): 로비 채팅 입력 화면 추가`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.11. `feat(chat): 로비 채팅 입력 화면 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `e0ef3fec89a6` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | 로비 채팅 writer와 bounded local history를 HomePage에 연결하고 lobby read fallback 일부를 제거합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/page.tsx`의 `chatInput`, `notice`, `submitLobbyChat`과 최근 20개 유지 식을 확인합니다.
- `apps/web/src/lib/api.ts`에서 `getLobby`의 sample fallback이 제거되고 `sendLobbyChat`가 `/chat/lobby` POST를 호출하는지 확인합니다.
- page의 `players`/`chat` 초기값은 여전히 sample이며 load 실패 notice도 “샘플 화면”을 유지한다고 명시하는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

#### 비교 기준

- Thread 내 직전 관련 SHA: `8b2679d9e190` — `test(e2e): 화면 action의 실제 API 연결 검증`
- Thread 내 다음 관련 SHA: `4f9b3b312d0e` — `fix(lobby): 로비 상태 표현 개선`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.12. `fix(lobby): 로비 상태 표현 개선`

| 항목 | 값 |
| --- | --- |
| SHA | `4f9b3b312d0e` |
| Importance | B |
| Tags | REALTIME |
| Source에서 확정된 역할 | 고정 wait/주간 증가 문구를 제거하고 server `LobbyStats`를 화면 지표의 source로 사용합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/page.tsx`의 `LobbyStats | null` state와 lobby response에서 `stats`를 설정하는 위치를 확인합니다.
- “이번 주 +2”, 고정 “30초”, `players.length` 기반 online count가 어떤 server-derived 표현으로 바뀌는지 확인합니다.
- `averageWaitSeconds == null`을 “대기 없음”으로 표시하고 queued/activeRooms/playingPlayers를 함께 노출하는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

#### Fix 복원

| 항목 | 근거 |
| --- | --- |
| 이전 가정 | [학습자 작성: 이전 가정] |
| 실제 실패/위험 | [학습자 작성: 실제 실패/위험] |
| 근본 원인 | [학습자 작성: 근본 원인] |
| 수정된 불변식 | [학습자 작성: 수정된 불변식] |
| 회귀 근거 | [학습자 작성: 회귀 근거] |

#### 비교 기준

- Thread 내 직전 관련 SHA: `e0ef3fec89a6` — `feat(chat): 로비 채팅 입력 화면 추가`
- Thread 내 다음 관련 SHA: `cd3787eefd6a` — `feat(chat): 로비 채팅과 접속 상태 실시간 반영`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.13. `feat(chat): 로비 채팅과 접속 상태 실시간 반영`

| 항목 | 값 |
| --- | --- |
| SHA | `cd3787eefd6a` |
| Importance | B |
| Tags | AUTH, REALTIME, WEB |
| Source에서 확정된 역할 | HomePage가 lobby WebSocket을 직접 소유해 chat fan-out과 presence-triggered reload를 local state에 반영합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/page.tsx`의 `socketRef`, `userId`, `loadLobby`, WebSocket effect dependency를 확인합니다.
- 당시 `getToken()`을 query string으로 넣고 raw `JSON.parse(... as ServerEvent)`를 사용하는 인증·validation 한계를 확인합니다.
- `chat.message` duplicate ID 제거/최근 20개 유지, `presence.changed`의 lobby reload, cleanup에서 handler null/close/current ref clear 순서를 확인합니다.
- chat submit이 open socket이면 realtime command를, 아니면 HTTP fallback을 사용하는 branch를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

#### 핵심 코드 근거

| 항목 | 값 |
| --- | --- |
| SHA | `cd3787eefd6a` |
| 파일 | `apps/web/src/app/page.tsx` |
| 함수/위치 | `lobby WebSocket effect` |
| 근거 요약 | [학습자 작성: 이 위치가 상태·소유권·실패 규칙을 어떻게 증명하는지 기록] |

#### 비교 기준

- Thread 내 직전 관련 SHA: `4f9b3b312d0e` — `fix(lobby): 로비 상태 표현 개선`
- Thread 내 다음 관련 SHA: `be31566ac0fd` — `fix(web): 로그인 화면의 sample fallback 제거`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.14. `fix(web): 로그인 화면의 sample fallback 제거`

| 항목 | 값 |
| --- | --- |
| SHA | `be31566ac0fd` |
| Importance | A |
| Tags | AUTH, TOURNAMENT, WEB |
| Source에서 확정된 역할 | authenticated/server-backed screen이 failure를 sample success data로 대체하지 않게 합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `home`, `dashboard`, `leaderboard`, `profile`, `tournaments`, `admin` page의 initial state가 빈 배열/`null`로 바뀌는지 확인합니다.
- 각 page의 loading, error, empty, success rendering branch와 action disabled 조건을 확인합니다.
- `apps/web/src/lib/sample.ts` import 제거 범위와 아직 남은 canvas-only sample 용도를 구분합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

#### A-level 불변식 종합

- [학습자 작성: 이 A-level commit이 교정하거나 이전한 핵심 책임]
- [학습자 작성: 실패 시 영향 범위와 남은 비보장]
- [학습자 작성: later fix/test와 연결되는 불변식]

#### Fix 복원

| 항목 | 근거 |
| --- | --- |
| 이전 가정 | [학습자 작성: 이전 가정] |
| 실제 실패/위험 | [학습자 작성: 실제 실패/위험] |
| 근본 원인 | [학습자 작성: 근본 원인] |
| 수정된 불변식 | [학습자 작성: 수정된 불변식] |
| 회귀 근거 | [학습자 작성: 회귀 근거] |

#### 핵심 코드 근거

| 항목 | 값 |
| --- | --- |
| SHA | `be31566ac0fd` |
| 파일 | `apps/web/src/app/*/page.tsx` |
| 함수/위치 | `resource initialization/render branches` |
| 근거 요약 | [학습자 작성: 이 위치가 상태·소유권·실패 규칙을 어떻게 증명하는지 기록] |

#### 비교 기준

- Thread 내 직전 관련 SHA: `cd3787eefd6a` — `feat(chat): 로비 채팅과 접속 상태 실시간 반영`
- 이 SHA가 이 Thread의 마지막 고정 commit입니다.
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

## 6. 불변식 발전 기록

| 단계 | 관련 SHA | 학습 기록 |
| --- | --- | --- |
| resource surface 도입 | `ea1f1b7ba543` → `5e11e944244d` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| action wiring | `051eac1b4aee` → `a4f665fd2999` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| lobby writer와 live metric | `e0ef3fec89a6` → `4f9b3b312d0e` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| component-owned realtime state | `cd3787eefd6a` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| broad browser evidence | `8b2679d9e190` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| truthful state 교정 | `be31566ac0fd` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |

## 7. Failure → Fix → Test 관계

| 이전 상태/가정 | 실패 또는 위험 | Fix 연결 | Test/후속 근거 | 관계 해설 |
| --- | --- | --- | --- | --- |
| [학습자 작성: 이전 가정] | [학습자 작성: actual failure/risk] | `4f9b3b312d0e` | 후속 query/cache와 browser scenario | [학습자 작성: root cause와 corrected invariant를 한 문장으로 연결] |
| [학습자 작성: 이전 가정] | [학습자 작성: actual failure/risk] | `be31566ac0fd` | 후속 query/cache test와 explicit rendering branch | [학습자 작성: root cause와 corrected invariant를 한 문장으로 연결] |
| [학습자 작성: 이전 가정] | [학습자 작성: actual failure/risk] | `051eac1b4aee`, `bfea82733512`, `a4f665fd2999` | `8b2679d9e190` | [학습자 작성: root cause와 corrected invariant를 한 문장으로 연결] |
| [학습자 작성: 이전 가정] | [학습자 작성: actual failure/risk] | `be31566ac0fd`가 fallback 제거 | 완전한 durable 검증은 아님 | [학습자 작성: root cause와 corrected invariant를 한 문장으로 연결] |

## 8. Ownership·state·lifetime 변화

| 대상 | 이전 owner/state | 이후 owner/state | 수명/cleanup |
| --- | --- | --- | --- |
| lobby resource | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| lobby realtime socket | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| dashboard/leaderboard | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| profile target | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| tournament selection | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| admin rows | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |

## 9. Thread 최종 상태

[학습자 작성: 마지막 고정 SHA에서 실제로 성립하는 최종 상태]

### 최종 실행 흐름

1. [학습자 작성: 입력 또는 route 진입]
2. [학습자 작성: validation/state transition]
3. [학습자 작성: resource acquisition/cleanup]
4. [학습자 작성: output/presentation]
5. [학습자 작성: failure/non-guarantee]

## 10. 학습 완료 점검

- [ ] 모든 commit을 지정 SHA의 parent/diff와 비교했습니다.
- [ ] 후속 HEAD 코드를 이전 SHA 설명에 역투영하지 않았습니다.
- [ ] owner, lifetime, cleanup, failure branch와 non-guarantee를 기록했습니다.
- [ ] fix는 이전 가정과 root cause에, test는 production path와 증명 범위에 연결했습니다.
- [ ] A/B importance 깊이를 구분했고 source subject/tag/role을 유지했습니다.
- [ ] 실행하지 않은 project test에 pass 결과를 만들지 않았습니다.
