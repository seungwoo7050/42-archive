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
| 직전 관련 상태 | 인증 분기는 있었지만 authenticated content는 단순 요약 수준이었고 lobby resource를 충분히 표시하지 않았습니다. |
| 해결하려던 문제 | 로그인 사용자가 online player, chat, matchmaking 진입 정보를 한 화면에서 볼 필요가 있었습니다. |
| 핵심 결정 | 공통 shell 내부에 hero, stat cards, player list, chat surface를 구성하고 lobby read를 연결했습니다. |
| 입력 → 상태 전이 → 출력 | session 확인 → lobby request → page local players/chat 갱신 → cards/list rendering 순서입니다. |
| ownership/lifetime/cleanup | page가 lobby resource와 presentation을 함께 소유하고 child stat card는 표시만 담당합니다. |
| failure/rollback/retry | request failure 시 sample players/chat가 남고 “30초”, progress copy 일부는 server와 무관한 상수입니다. |
| 보장하는 것 | authenticated lobby의 주요 presentation surface를 제공합니다. |
| 보장하지 않는 것 | 표시 값이 모두 authoritative server state라는 보장은 없습니다. |
| 후속 연결 | `be31566ac0fd`가 sample fallback을 제거하고 query Thread가 server state ownership을 이전합니다. |

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
| 직전 관련 상태 | lobby 밖에서 개인 전적과 최근 경기를 보는 route가 없었습니다. |
| 해결하려던 문제 | dashboard projection을 browser route로 제공할 필요가 있었습니다. |
| 핵심 결정 | sample dashboard를 initial state로 두고 mount effect에서 `getDashboard` 결과로 교체하는 화면을 추가했습니다. |
| 입력 → 상태 전이 → 출력 | mount → request → state replace → summary/recent match render 순서입니다. |
| ownership/lifetime/cleanup | page가 dashboard fetch와 data를 직접 소유합니다. |
| failure/rollback/retry | request 실패를 무시해 sample 전적이 남고 SVG graph는 server history를 반영하지 않습니다. |
| 보장하는 것 | dashboard route와 기본 read model presentation을 제공합니다. |
| 보장하지 않는 것 | 실패·loading·실제 history graph의 정확성은 보장하지 않습니다. |
| 후속 연결 | `be31566ac0fd`가 null/loading/error/empty branch로 교정합니다. |

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
| 직전 관련 상태 | 공개 ranking projection을 표시할 browser route가 없었습니다. |
| 해결하려던 문제 | 서버 leaderboard를 table/card 형태로 노출할 필요가 있었습니다. |
| 핵심 결정 | sample entries를 초기값으로 사용하고 effect가 성공하면 server entries로 교체했습니다. |
| 입력 → 상태 전이 → 출력 | mount → leaderboard request → local array replace → rank rows render 순서입니다. |
| ownership/lifetime/cleanup | page가 read request와 ranking array를 소유합니다. |
| failure/rollback/retry | 실패 시 sample ranking이 유지되어 public data가 존재하는 것처럼 보입니다. |
| 보장하는 것 | leaderboard route와 success presentation을 제공합니다. |
| 보장하지 않는 것 | failure와 genuine empty leaderboard의 차이는 보장하지 않습니다. |
| 후속 연결 | `be31566ac0fd`가 빈 초기값과 명시적 error/empty branch를 추가합니다. |

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
| 직전 관련 상태 | 토너먼트 list와 bracket을 보는 route가 없었습니다. |
| 해결하려던 문제 | 토너먼트 상태를 탐색하고 생성 intent를 표현할 초기 화면이 필요했습니다. |
| 핵심 결정 | sample tournament를 기반으로 list와 bracket-shaped presentation을 만들고 초기 create control을 배치했습니다. |
| 입력 → 상태 전이 → 출력 | page state에서 tournament/selection을 읽어 entries를 잘라 bracket card로 렌더링합니다. |
| ownership/lifetime/cleanup | page가 selected tournament와 임시 bracket projection을 소유합니다. |
| failure/rollback/retry | entry slicing은 실제 bracket match contract가 아니며 request failure를 sample로 가립니다. |
| 보장하는 것 | 초기 tournament browsing surface를 제공합니다. |
| 보장하지 않는 것 | 실제 bracket progression, create/join persistence, truthful failure는 보장하지 않습니다. |
| 후속 연결 | `a4f665fd2999`가 create/join action을 연결하고 `be31566ac0fd`가 sample fallback을 제거합니다. |

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
| 직전 관련 상태 | 사용자 handle로 접근하는 public profile route가 없었습니다. |
| 해결하려던 문제 | 개별 사용자의 표시 이름, rating, 전적, action surface를 제공할 필요가 있었습니다. |
| 핵심 결정 | dynamic route와 sample user 기반 profile card를 추가했습니다. |
| 입력 → 상태 전이 → 출력 | route params → local handle → sample/profile presentation 순서입니다. |
| ownership/lifetime/cleanup | route page가 handle과 displayed user를 소유합니다. |
| failure/rollback/retry | server lookup이 없거나 실패해도 sample user와 가짜 숫자·문구가 표시되고 action은 inert합니다. |
| 보장하는 것 | profile URL과 기본 presentation을 제공합니다. |
| 보장하지 않는 것 | target identity, 실제 user existence, friend action 성공은 보장하지 않습니다. |
| 후속 연결 | `051eac1b4aee`가 API lookup/friend action을 연결하고 `be31566ac0fd`가 fallback을 제거합니다. |

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
| 직전 관련 상태 | 관리자가 사용자 목록과 상태를 보는 browser route가 없었습니다. |
| 해결하려던 문제 | protected admin read model을 표시하는 초기 surface가 필요했습니다. |
| 핵심 결정 | sample user list를 초기값으로 두고 admin API가 성공하면 교체하는 route를 추가했습니다. |
| 입력 → 상태 전이 → 출력 | mount → protected list request → local array replace → row/control render 순서입니다. |
| ownership/lifetime/cleanup | page가 admin data와 control presentation을 소유합니다. |
| failure/rollback/retry | 권한·network failure를 무시하고 sample users를 유지하며 review button 일부는 inert합니다. |
| 보장하는 것 | admin route와 user status presentation을 제공합니다. |
| 보장하지 않는 것 | 실제 authorization 성공이나 action 적용을 보장하지 않습니다. |
| 후속 연결 | `bfea82733512`가 status mutation을 연결하고 `be31566ac0fd`가 fake rows를 제거합니다. |

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
| 직전 관련 상태 | profile route는 sample presentation과 inert friend control만 제공했습니다. |
| 해결하려던 문제 | route handle로 실제 profile을 조회하고 friend request를 보낼 필요가 있었습니다. |
| 핵심 결정 | mount/handle effect에서 profile을 조회하고 click handler가 `requestFriend`를 호출하도록 연결했습니다. |
| 입력 → 상태 전이 → 출력 | route handle → profile GET → displayed user; click → friend POST → notice 갱신 순서입니다. |
| ownership/lifetime/cleanup | page가 target handle, request pending, notice를 소유합니다. |
| failure/rollback/retry | profile GET 실패를 무시해 sample user가 남고 mutation failure는 notice만 바꿉니다. |
| 보장하는 것 | friend button이 실제 authenticated API call을 수행합니다. |
| 보장하지 않는 것 | displayed profile이 반드시 server response라는 보장은 아직 없습니다. |
| 후속 연결 | `be31566ac0fd`가 null initial state와 load error branch를 도입합니다. |

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
| 직전 관련 상태 | admin screen은 user status를 표시했지만 control이 server mutation을 수행하지 않았습니다. |
| 해결하려던 문제 | 관리자 intent를 target user/status update와 연결하고 결과를 화면에 반영해야 했습니다. |
| 핵심 결정 | 현재 status의 반대 값을 계산해 API를 호출하고 returned user로 local row를 교체했습니다. |
| 입력 → 상태 전이 → 출력 | button click → target status 계산 → authenticated mutation → matching row replace/message 순서입니다. |
| ownership/lifetime/cleanup | page가 pending target과 local row list를 소유합니다. |
| failure/rollback/retry | mutation failure는 명시하지만 초기 list failure 시 sample users가 남아 실제 권한 상태를 가장합니다. |
| 보장하는 것 | status control이 실제 endpoint와 response에 연결됩니다. |
| 보장하지 않는 것 | 초기 user list의 진실성과 audit persistence는 보장하지 않습니다. |
| 후속 연결 | `be31566ac0fd`가 admin data를 빈 상태에서 시작하고 load failure를 차단합니다. |

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
| 직전 관련 상태 | 토너먼트 화면은 sample bracket과 local presentation만 있었고 create/join이 server에 반영되지 않았습니다. |
| 해결하려던 문제 | 명시적 selection을 기준으로 생성·참가 intent를 실제 API와 연결해야 했습니다. |
| 핵심 결정 | selected tournament ID를 state로 두고 create 성공 항목을 list/selection에 반영하며 join mutation을 현재 selection에 보냈습니다. |
| 입력 → 상태 전이 → 출력 | form/button intent → API mutation → returned tournament 또는 list reload → selection/presentation 갱신 순서입니다. |
| ownership/lifetime/cleanup | page가 selection, form, pending/message를 소유합니다. |
| failure/rollback/retry | 초기 list load failure는 sample tournaments를 유지하고 bracket 자체는 실제 match contract가 아닙니다. |
| 보장하는 것 | create/join action이 실제 authenticated endpoint를 호출합니다. |
| 보장하지 않는 것 | server state의 canonical cache ownership과 truthful initial load는 보장하지 않습니다. |
| 후속 연결 | `be31566ac0fd`가 sample list를 제거하고 query Thread가 mutation invalidation을 정리합니다. |

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
| 직전 관련 상태 | 초기 browser suite는 navigation과 canvas만 검증해 새 action wiring의 회귀를 잡지 못했습니다. |
| 해결하려던 문제 | 화면 control이 실제 endpoint/WS command를 호출하고 visible feedback을 만드는지 넓게 확인할 필요가 있었습니다. |
| 핵심 결정 | Playwright scenario를 추가해 AI match/chat, friend request, tournament create/join, admin status를 조작했습니다. |
| 입력 → 상태 전이 → 출력 | browser action → network/realtime path → visible UI assertion 순서이며 일부 scenario는 기존 sample data도 허용합니다. |
| ownership/lifetime/cleanup | runner가 browser context를 소유하며 application state는 실제 실행 중 server/fixture에 의존합니다. |
| failure/rollback/retry | sample fallback을 허용하는 assertion 때문에 load failure가 있어도 일부 test가 통과할 수 있습니다. |
| 보장하는 것 | 주요 interactive control이 browser에서 작동하는 broad integration evidence를 제공합니다. |
| 보장하지 않는 것 | 모든 action의 durable commit, 권한 audit, failure state 진실성을 증명하지 않습니다. |
| 후속 연결 | `be31566ac0fd`가 이 suite의 false-positive 가능성을 만든 sample fallback을 제거합니다. |

#### Test 복원

| 항목 | 근거 |
| --- | --- |
| 검증 대상 production 불변식 | 화면 control이 inert markup이 아니라 실제 HTTP/WS action을 호출합니다. |
| 재현한 실패/경계 | AI start, chat, friend, tournament, admin status의 browser integration입니다. |
| 테스트 기법 | Playwright user action과 visible feedback assertion입니다. |
| 증명하는 것 | 여러 UI→adapter/transport 경로의 broad integration을 증명합니다. |
| 증명하지 않는 것 | sample fallback이 없는 truthful load나 DB durable side effect 전부를 증명하지 않습니다. |
| 검증 분류 | 브라우저 action 통합 테스트 |

> 실행 상태: 이 workbook 작성 환경에서는 repository test command를 실행하지 않았습니다. 위 내용은 해당 SHA의 test source와 production path를 정적 조사해 복원한 것이며 pass 결과를 주장하지 않습니다.

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
| 직전 관련 상태 | 로비는 chat을 읽어 표시했지만 controlled input이나 실제 writer가 없었고 `getLobby` 자체가 실패를 sample response로 대체했습니다. |
| 해결하려던 문제 | 사용자 입력을 trim해 server에 보내고 성공 message를 local history에 반영하되 API helper가 read failure를 성공 response로 만들지 않아야 했습니다. |
| 핵심 결정 | `sendLobbyChat` adapter와 controlled form을 추가하고 성공 시 기존 배열의 최근 19개 뒤에 응답 message를 붙였습니다. `getLobby` helper의 fallback은 제거했습니다. |
| 입력 → 상태 전이 → 출력 | form submit → trim/empty guard → POST `/chat/lobby` → returned message append/입력 clear; 실패 → notice 유지 순서입니다. |
| ownership/lifetime/cleanup | HomePage가 input, notice, local chat array를 소유합니다. HTTP request cancellation이나 shared cache ownership은 없습니다. |
| failure/rollback/retry | 빈 입력은 전송하지 않고 POST 실패는 notice로 표시합니다. 그러나 initial page state는 sample chat/users이므로 read failure 뒤 fabricated content가 남습니다. |
| 보장하는 것 | 로비 chat control이 실제 HTTP writer와 연결되고 history가 20개로 제한됩니다. |
| 보장하지 않는 것 | 실시간 fan-out, duplicate suppression, truthful initial read state는 아직 보장하지 않습니다. |
| 후속 연결 | `4f9b3b312d0e`가 metric presentation을 고치고 `cd3787eefd6a`가 WebSocket fan-out을 추가하며 `be31566ac0fd`가 남은 sample state를 제거합니다. |

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
| 직전 관련 상태 | 로비는 실제 server 상태와 무관한 “이번 주 +2”, 고정 30초 wait, list 길이 기반 online 수를 사실처럼 표시했습니다. |
| 해결하려던 문제 | 운영 상태를 browser가 임의로 만들지 말고 `/lobby` read model의 live metric만 표시해야 했습니다. |
| 핵심 결정 | `LobbyStats`를 별도 state로 받아 online/playing/queued/activeRooms/averageWaitSeconds를 렌더링하고 알 수 없는 상태는 “확인 중” 또는 “대기 없음”으로 구분했습니다. |
| 입력 → 상태 전이 → 출력 | lobby response → `stats` state → 각 StatCard 값/힌트; null metric → explicit unknown/no-wait presentation 순서입니다. |
| ownership/lifetime/cleanup | server가 metric 계산을, page가 현재 response projection만 소유합니다. |
| failure/rollback/retry | stats가 아직 없으면 fabricated number를 쓰지 않습니다. stale response나 realtime refresh는 다음 commit 전까지 해결하지 않습니다. |
| 보장하는 것 | 로비 상태 카드가 고정 문구 대신 server read model을 표시합니다. |
| 보장하지 않는 것 | 지표의 서버 계산 정확성이나 live update cadence는 보장하지 않습니다. |
| 후속 연결 | `cd3787eefd6a`가 presence event에서 lobby를 reload해 실시간 갱신합니다. |

#### Fix 복원

| 항목 | 근거 |
| --- | --- |
| 이전 가정 | player 배열 길이와 고정 문구로 live lobby 상태를 충분히 표현할 수 있다고 봤습니다. |
| 실제 실패/위험 | 실제 queue/room/wait 상태와 무관한 숫자를 사용자에게 사실처럼 보여 줍니다. |
| 근본 원인 | browser presentation 상수와 server metric source가 분리되지 않았습니다. |
| 수정된 불변식 | 온라인·경기 중·queue·room·wait 표현은 `LobbyStats` 또는 명시적 unknown/no-wait 상태에서만 나옵니다. |
| 회귀 근거 | 이 SHA에는 별도 test가 없고 이후 E2E/query migration에서 화면을 재사용합니다. |

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
| 직전 관련 상태 | HTTP-only writer는 다른 browser의 chat과 presence를 반영하지 못했고 live metric도 재요청 계기가 없었습니다. |
| 해결하려던 문제 | 인증된 사용자 수명에 맞춰 lobby socket을 열고 fan-out event를 local state에 반영하면서 unmount/user change에서 정확히 정리해야 했습니다. |
| 핵심 결정 | `loadLobby` callback과 `socketRef`를 도입해 lobby chat을 dedupe/append하고 presence event마다 read model을 reload했습니다. writer는 socket open 여부에 따라 WS/HTTP를 선택했습니다. |
| 입력 → 상태 전이 → 출력 | session user resolve → token 기반 socket open → raw event parse → chat local update 또는 presence reload; cleanup → handlers 제거 → socket close → current ref clear 순서입니다. |
| ownership/lifetime/cleanup | HomePage effect가 lobby socket과 local server-state 복사본을 함께 소유합니다. user ID 변화/unmount가 socket lifetime을 끝냅니다. |
| failure/rollback/retry | socket이 열리지 않으면 HTTP writer로 fallback하고 reload 실패는 notice로 표시합니다. malformed event parsing은 catch 없이 effect callback을 실패시킬 수 있습니다. |
| 보장하는 것 | 여러 browser의 lobby chat과 presence 변화가 현재 화면에 반영되고 obsolete socket은 cleanup됩니다. |
| 보장하지 않는 것 | cookie-only credential, one-time ticket, runtime parser, shared Query cache owner는 아직 보장하지 않습니다. |
| 후속 연결 | `353ca9a17415`가 token/raw parse 경계를 고치고 `931800f796e1`이 같은 live update를 canonical query cache로 이전합니다. |

#### 핵심 코드 근거

| 항목 | 값 |
| --- | --- |
| SHA | `cd3787eefd6a` |
| 파일 | `apps/web/src/app/page.tsx` |
| 함수/위치 | `lobby WebSocket effect` |
| 근거 요약 | 현재 user가 있을 때 socket을 열고 lobby chat ID를 중복 제거해 최근 20개만 유지합니다. cleanup은 handler를 끊고 open/connecting socket을 닫은 뒤 current ref를 비웁니다. |

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
| 직전 관련 상태 | 여러 resource screen이 sample object를 초기값으로 사용하고 load error를 무시해 존재하지 않는 사용자·전적·순위·토너먼트·관리 데이터를 정상처럼 표시했습니다. |
| 해결하려던 문제 | 실패와 empty를 success로 위장하면 사용자 action이 잘못된 target에 적용되고 E2E도 false positive가 될 수 있었습니다. |
| 핵심 결정 | server-backed state를 빈 배열/`null`에서 시작하고 loading/error/empty/success를 명시적으로 렌더링하며 data가 없을 때 action을 차단했습니다. |
| 입력 → 상태 전이 → 출력 | mount/request → loading branch → success data 또는 error branch → empty/success presentation 순서로 바뀝니다. |
| ownership/lifetime/cleanup | 각 page는 아직 request state를 직접 소유하지만 displayed resource는 server response만 채울 수 있습니다. sample fixture ownership은 server-backed screen에서 제거됩니다. |
| failure/rollback/retry | request 실패는 visible error로 남고 이전 sample 성공 상태로 rollback하지 않습니다. retry mechanism은 화면별로 제한적입니다. |
| 보장하는 것 | server-backed screen이 fabricated success data를 표시하지 않고 loading/error/empty를 구분합니다. |
| 보장하지 않는 것 | component effect 중복, shared cache, automatic cancellation은 아직 보장하지 않습니다. |
| 후속 연결 | React Query Thread가 같은 truthful state를 단일 cache owner와 AbortSignal로 이전합니다. |

#### A-level 불변식 종합

- **핵심 책임:** authenticated/server-backed screen이 failure를 sample success data로 대체하지 않게 합니다.
- **실패 영향:** 실패와 empty를 success로 위장하면 사용자 action이 잘못된 target에 적용되고 E2E도 false positive가 될 수 있었습니다.
- **결과 불변식:** server-backed screen이 fabricated success data를 표시하지 않고 loading/error/empty를 구분합니다.
- **남은 제한:** component effect 중복, shared cache, automatic cancellation은 아직 보장하지 않습니다.

#### Fix 복원

| 항목 | 근거 |
| --- | --- |
| 이전 가정 | sample 초기값을 두면 API가 없어도 화면을 계속 사용할 수 있다고 봤습니다. |
| 실제 실패/위험 | network/auth failure가 실제 사용자·전적·권한·토너먼트가 존재하는 것처럼 표시되고 action/test도 잘못된 성공을 만듭니다. |
| 근본 원인 | demo fixture와 server-backed resource state를 같은 변수에 넣고 catch에서 상태를 비우지 않았습니다. |
| 수정된 불변식 | server-backed data는 server success만 채우며 pending/error/empty는 별도 상태로 표시합니다. |
| 회귀 근거 | 기존 E2E의 허점은 code branch로 닫혔고 후속 query tests가 cache-level consistency를 검증합니다. |

#### 핵심 코드 근거

| 항목 | 값 |
| --- | --- |
| SHA | `be31566ac0fd` |
| 파일 | `apps/web/src/app/*/page.tsx` |
| 함수/위치 | `resource initialization/render branches` |
| 근거 요약 | 각 화면은 sample object 대신 `null` 또는 빈 배열에서 시작하고 `isLoading`, error, empty, success 조건을 별도로 렌더링합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `cd3787eefd6a` — `feat(chat): 로비 채팅과 접속 상태 실시간 반영`
- 이 SHA가 이 Thread의 마지막 고정 commit입니다.
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

## 6. 불변식 발전 기록

| 단계 | 관련 SHA | 학습 기록 |
| --- | --- | --- |
| resource surface 도입 | `ea1f1b7ba543` → `5e11e944244d` | 각 route가 lobby/dashboard/leaderboard/tournament/profile/admin read model을 표시하지만 sample 초기값을 사용했습니다. |
| action wiring | `051eac1b4aee` → `a4f665fd2999` | profile/admin/tournament intent가 실제 endpoint로 연결됐습니다. |
| lobby writer와 live metric | `e0ef3fec89a6` → `4f9b3b312d0e` | chat writer를 연결하고 고정 wait/온라인 표현을 server LobbyStats로 교체했습니다. |
| component-owned realtime state | `cd3787eefd6a` | HomePage가 socket, deduplicated chat, presence reload를 직접 소유하는 선행 상태가 생겼습니다. |
| broad browser evidence | `8b2679d9e190` | 주요 control은 E2E에서 조작됐지만 sample fallback을 허용했습니다. |
| truthful state 교정 | `be31566ac0fd` | sample success를 제거하고 loading/error/empty/success를 분리했습니다. |

## 7. Failure → Fix → Test 관계

| 이전 상태/가정 | 실패 또는 위험 | Fix 연결 | Test/후속 근거 | 관계 해설 |
| --- | --- | --- | --- | --- |
| 고정 wait/주간 증가/players.length 지표 | server와 다른 lobby 상태 표시 | `4f9b3b312d0e` | 후속 query/cache와 browser scenario | 고정 wait/주간 증가/players.length 지표 → server와 다른 lobby 상태 표시 → `4f9b3b312d0e` → 후속 query/cache와 browser scenario |
| sample initial state + ignored load error | failure가 valid resource로 보임 | `be31566ac0fd` | 후속 query/cache test와 explicit rendering branch | sample initial state + ignored load error → failure가 valid resource로 보임 → `be31566ac0fd` → 후속 query/cache test와 explicit rendering branch |
| inert profile/admin/tournament controls | user intent가 server에 도달하지 않음 | `051eac1b4aee`, `bfea82733512`, `a4f665fd2999` | `8b2679d9e190` | inert profile/admin/tournament controls → user intent가 server에 도달하지 않음 → `051eac1b4aee`, `bfea82733512`, `a4f665fd2999` → `8b2679d9e190` |
| E2E가 sample row도 허용 | 실패해도 action test 일부가 통과 | `be31566ac0fd`가 fallback 제거 | 완전한 durable 검증은 아님 | E2E가 sample row도 허용 → 실패해도 action test 일부가 통과 → `be31566ac0fd`가 fallback 제거 → 완전한 durable 검증은 아님 |

## 8. Ownership·state·lifetime 변화

| 대상 | 이전 owner/state | 이후 owner/state | 수명/cleanup |
| --- | --- | --- | --- |
| lobby resource | sample fixture + page effect | page의 빈 state + server response | route mount 수명 |
| lobby realtime socket | 없음/HTTP-only | `HomePage.socketRef`와 local state | user ID 또는 route mount 수명 |
| dashboard/leaderboard | sample object/array | null/empty → success response | route mount 수명 |
| profile target | sample user | route handle + server profile 또는 explicit error | handle별 route 수명 |
| tournament selection | sample first item | server list + explicit selected ID | page 수명 |
| admin rows | sample users | server list only | protected route 수명 |

## 9. Thread 최종 상태

마지막 SHA에서 lobby/dashboard/leaderboard/profile/tournament/admin 화면은 server response가 오기 전 fabricated resource를 표시하지 않습니다. 로비 chat writer와 presence-triggered live reload는 먼저 HomePage local state/socket으로 구현됐고 profile/admin/tournament action도 실제 adapter에 연결됐습니다. 고정 wait·주간 증가 문구는 server LobbyStats projection으로 교체됐습니다. 다만 request/socket/cache lifecycle은 route component가 직접 소유하므로 다음 Thread에서 cookie/runtime adapter와 React Query owner로 이전됩니다.

### 최종 실행 흐름

1. 로비는 초기 HTTP read로 users/chat/stats를 받고 현재 user 수명에 맞춰 lobby socket을 엽니다.
2. chat event는 ID 중복을 제거해 최근 20개 local history를 만들고 presence event는 lobby read를 다시 수행합니다.
3. route가 mount되면 resource state는 `null` 또는 빈 배열에서 시작합니다.
4. request pending 동안 loading branch를 렌더링하고 action target이 없으면 control을 비활성화합니다.
5. success payload만 resource state를 채우며 genuine empty는 별도 empty presentation으로 나타납니다.
6. non-OK/network failure는 error branch를 렌더링하고 sample data로 대체하지 않습니다.
7. 사용자 action은 현재 route handle/selected ID/target user를 endpoint helper에 전달하고 success response로 화면을 갱신합니다.

## 10. 학습 완료 점검

- [x] 모든 commit을 지정 SHA의 parent/diff와 비교했습니다.
- [x] 후속 HEAD 코드를 이전 SHA 설명에 역투영하지 않았습니다.
- [x] owner, lifetime, cleanup, failure branch와 non-guarantee를 기록했습니다.
- [x] fix는 이전 가정과 root cause에, test는 production path와 증명 범위에 연결했습니다.
- [x] A/B importance 깊이를 구분했고 source subject/tag/role을 유지했습니다.
- [x] 실행하지 않은 project test에 pass 결과를 만들지 않았습니다.
