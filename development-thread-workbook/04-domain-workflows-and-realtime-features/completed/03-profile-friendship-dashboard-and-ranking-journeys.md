# 프로필·친구·대시보드·순위표 여정

원문 Development Thread: `Profile, friendship, dashboard, and ranking journeys`

## 1. Thread 목표

- profile·leaderboard·recent-match·dashboard read model이 repository와 HTTP route로 추가되는 과정을 추적합니다.
- sample user, 고정 그래프, 추정 연승처럼 서버 사실이 아닌 표시가 실제 데이터·명시적 empty/error state로 교체되는 과정을 확인합니다.
- React Query helper/key/invalidation이 identity-bound mutation 뒤 관련 read model을 어떻게 무효화하는지 복원합니다.

### Source에서 확정된 significance

> These screens look read-oriented, but they define which data is treated as fact. The history shows several fabricated fallbacks and metrics that could misrepresent authenticated state. Later commits replace them with repository-derived projections, explicit failure states, and cache ownership rules.

### 직접 연결되는 Critical Invariants

> Authenticated and public screens do not substitute sample identities, matches, rankings, or metrics when server reads fail.
>
> Dashboard metrics and charts are derived from the bounded recent-match read model and disclose that boundary instead of claiming broader history.

### 직접 연결되는 Major Engineering Difficulties

> Reconstructing chronological rating/streak state from a newest-first bounded match collection without inventing missing history.
>
> Keeping profile, session, lobby, dashboard, friends, leaderboard, tournament, and admin caches coherent after identity-affecting mutations.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- repository profile update는 현재 row와 optional input을 어떻게 결합하며 public/session projection을 어떻게 나눕니까?
- leaderboard rank와 win rate는 어떤 정렬·반올림·zero-game 규칙으로 계산됩니까?
- 초기 dashboard `bestStreak`와 rating chart는 실제 match history가 아니라 무엇에서 만들어졌습니까?
- `bestWinningStreak`는 newest-first 결과를 왜 reverse하고 loss에서 어떤 상태를 reset합니까?
- sample fallback 제거 후 loading, request failure, empty result는 화면에서 어떻게 구분됩니까?
- profile mutation은 어떤 query key들을 invalidate하며 session expiry는 어떤 cache를 제거합니까?

## 3. 완료 기준

- profile, leaderboard, recent matches, dashboard의 repository → route → browser adapter → 화면 흐름을 설명할 수 있습니다.
- 고정/sample/fabricated 데이터가 실제 서버 결과처럼 보였던 각 지점을 파일과 함수로 지적할 수 있습니다.
- 최고 연승과 rating chart가 recent-match 범위에서 계산되는 정확한 순서와 비보장을 설명할 수 있습니다.
- 친구 관계의 canonical persistence invariant가 이 Thread가 아니라 category 02에 있다는 경계를 구분할 수 있습니다.
- Commit map의 모든 SHA를 지정 브랜치 ancestry와 source classification에서 확인합니다.
- 각 SHA의 parent 또는 직전 관련 SHA와 비교해 변경 전후 상태를 구분합니다.
- 실행한 명령과 코드 검사만으로 확인한 사실을 구분하고 실행하지 않은 test를 통과했다고 기록하지 않습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `c5b96a06925c` | `feat(db): 프로필 조회와 변경 저장 구현` | B | PERSISTENCE | Extends identity access with public profile reads, authenticated profile updates, and active-user listing. |
| 2 | `0364c42f776b` | `feat(db): 순위 조회 구현` | B | PERSISTENCE | Adds a leaderboard projection to the repository contract. |
| 3 | `c7ea1ff241c8` | `feat(db): 최근 경기와 대시보드 조회 구현` | B | PERSISTENCE | Implements recent-match and dashboard reads behind the repository contract. |
| 4 | `0bcc487d949f` | `feat(api): 프로필과 친구 리소스 라우트 추가` | B | PERSISTENCE | Extends HTTP resources to profile, dashboard, and friendship while separating public reads from identity-bound mutations. |
| 5 | `cbe876359d31` | `feat(web): 플레이어 대시보드 구현` | B | WEB | Adds a dashboard route consuming the shared `DashboardSummary` read model. |
| 6 | `cb295396771f` | `feat(web): 순위표 화면 추가` | B | WEB | Renders rank, player record, rating, and win rate from the shared leaderboard contract. |
| 7 | `0afc0a0694bd` | `feat(web): 공개 프로필 화면 추가` | B | WEB | Adds a dynamic public-profile route keyed by handle. |
| 8 | `051eac1b4aee` | `feat(profile): 친구 요청 동작 연결` | B | AUTH, WEB | Connects the dynamic profile route to public-profile lookup and authenticated friend-request mutation. |
| 9 | `51e66cf1df80` | `fix(profile): 공개 프로필 상태 표현 개선` | B | PERSISTENCE, WEB | Stores and renders the recent-match collection returned with a public profile. |
| 10 | `8d79139a32da` | `fix(dashboard): 경기 상태 표현 개선` | B | WEB | Replaces a fixed chart with points reconstructed from current rating and recent match deltas. |
| 11 | `be31566ac0fd` | `fix(web): 로그인 화면의 sample fallback 제거` | A | AUTH, TOURNAMENT, WEB | Stops authenticated and server-backed screens from displaying sample data after request failure. |
| 12 | `035b97ca7c58` | `fix(db): 최근 경기에서 최고 연승 계산` | B | PERSISTENCE | Calculates dashboard best winning streak from actual recent match results instead of formulas/constants. |
| 13 | `6b661420e060` | `test(db): 최고 연승 계산 검증` | B | PERSISTENCE, TEST | Pins the winning-streak ordering and reset rules. |
| 14 | `7fe29f991a9b` | `fix(dashboard): 연승 지표 설명 정정` | C | - | Changes the dashboard hint from “this season” to “recent matches” so the label matches the data boundary. |
| 15 | `3c6c9134ee94` | `fix(dashboard): 빈 rating history를 정확히 표시` | B | PERSISTENCE, WEB | Treats empty match history as no rating evidence instead of fabricating a two-point chart. |
| 16 | `c17e7ad0fd84` | `feat(web): profile과 friend 조회 query 추가` | B | WEB | Adds schema-validated profile/friend browser helpers and scoped React Query options. |
| 17 | `8bc4d0cc32bd` | `test(web): profile과 friend 조회 규칙 검증` | B | AUTH, WEB, TEST | Verifies own-profile/friend request helpers and React Query ownership rules. |

## 5. Commit별 학습 기록

### 5.1. `feat(db): 프로필 조회와 변경 저장 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `c5b96a06925c` |
| Importance | B |
| Tags | PERSISTENCE |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Extends identity access with public profile reads, authenticated profile updates, and active-user listing.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.ts`의 `getUserById`, `getUserByHandle`, `updateProfile`, `listOnlineUsers`
- PostgreSQL normalized-handle lookup과 optional display/avatar update
- memory repository의 같은 contract
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:c5b96a06925c -->
- **직전 상태:** repository identity access는 development login/session 중심이어서 public handle 조회와 인증된 profile mutation이 없었습니다.
- **구현 결정:** ID/normalized handle 조회, 기존 값을 유지하는 optional displayName/avatar update, active user의 rating 내림차순 목록을 공통 interface에 추가했습니다.
- **상태/소유권 변화:** profile row mutation과 public/session projection은 repository가 소유하고 route는 이후 caller가 됩니다.
- **실패/edge:** 존재하지 않는 사용자와 비활성 상태 처리는 caller-visible null/error로 남고, `online` projection은 실제 WebSocket presence가 아닙니다.
- **보장/비보장:** PostgreSQL/memory의 기본 profile 동작은 맞추지만 friendship과 realtime presence는 별도 책임입니다.
- **다음 연결:** `0364c42f776b`이 같은 사용자 projection 위에 leaderboard read model을 추가합니다.
<!-- LEARNER-ANSWER END commit:c5b96a06925c -->

비교 기준:
- 이 commit의 parent와 비교합니다.
- 다음 Thread 관련 SHA: `0364c42f776b` — `feat(db): 순위 조회 구현`

### 5.2. `feat(db): 순위 조회 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `0364c42f776b` |
| Importance | B |
| Tags | PERSISTENCE |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Adds a leaderboard projection to the repository contract.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.ts`의 `listLeaderboard`
- PostgreSQL `ORDER BY rating DESC, wins DESC LIMIT 20`
- rank index와 win-rate 반올림/zero-game 처리
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:0364c42f776b -->
- **직전 상태:** active user 목록은 있었지만 순위 번호·승률을 포함한 전용 read model이 없었습니다.
- **구현 결정:** rating 내림차순, 동률 시 wins 내림차순으로 정렬하고 index+1을 rank로, `round(wins / total * 1000) / 10`을 승률로 계산합니다. 경기가 없으면 0입니다.
- **상태/소유권 변화:** 순위 계산은 web이 아니라 repository projection이 담당합니다.
- **실패/edge:** PostgreSQL은 20명 제한이고 memory 구현은 당시 전체 배열을 map해 backend별 limit 차이가 남을 수 있습니다.
- **보장/비보장:** 반환된 collection 안의 deterministic ordering/rank는 보장하지만 시즌·pagination 개념은 없습니다.
- **다음 연결:** `c7ea1ff241c8`이 match history와 dashboard projection을 추가합니다.
<!-- LEARNER-ANSWER END commit:0364c42f776b -->

비교 기준:
- 직전 Thread 관련 SHA: `c5b96a06925c` — `feat(db): 프로필 조회와 변경 저장 구현`
- 다음 Thread 관련 SHA: `c7ea1ff241c8` — `feat(db): 최근 경기와 대시보드 조회 구현`

### 5.3. `feat(db): 최근 경기와 대시보드 조회 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `c7ea1ff241c8` |
| Importance | B |
| Tags | PERSISTENCE |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Implements recent-match and dashboard reads behind the repository contract.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.ts`의 `listRecentMatches`와 `getDashboard`
- winner/loser join, optional user filter, `ended_at desc limit 8`
- 초기 PostgreSQL/memory `bestStreak` 계산 차이
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:c7ea1ff241c8 -->
- **직전 상태:** match 저장은 있어도 사용자 관점의 상대·결과·점수·rating delta를 묶은 최근 경기와 dashboard summary가 없었습니다.
- **구현 결정:** newest-first 최대 8경기를 사용자 관점으로 projection하고 dashboard에 me, wins/losses, winRate, bestStreak, recentMatches를 넣었습니다.
- **상태/소유권 변화:** match row를 사용자별 read model로 바꾸는 책임이 repository로 이동했습니다.
- **실패/edge:** 최고 연승은 실제 history가 아니라 PostgreSQL `max(1,min(12,wins-losses+3))`, memory 고정 `3`이어서 fabricated metric입니다.
- **보장/비보장:** 최근 경기 ordering과 기본 dashboard 구조는 제공하지만 bestStreak 정확성은 후속 fix 전까지 보장하지 않습니다.
- **다음 연결:** `0bcc487d949f`가 이 read model을 HTTP resource로 노출합니다.
<!-- LEARNER-ANSWER END commit:c7ea1ff241c8 -->

비교 기준:
- 직전 Thread 관련 SHA: `0364c42f776b` — `feat(db): 순위 조회 구현`
- 다음 Thread 관련 SHA: `0bcc487d949f` — `feat(api): 프로필과 친구 리소스 라우트 추가`

### 5.4. `feat(api): 프로필과 친구 리소스 라우트 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `0bcc487d949f` |
| Importance | B |
| Tags | PERSISTENCE |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Extends HTTP resources to profile, dashboard, and friendship while separating public reads from identity-bound mutations.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/app.ts`의 `/users/:id`, `/dashboard`, `/profile/:handle`, `/profile/me`
- `/friends`와 request/accept route
- `currentUser` 사용 여부와 public/authenticated response
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:0bcc487d949f -->
- **직전 상태:** repository operation은 있었지만 browser가 사용할 profile/dashboard/friend HTTP route가 없었습니다.
- **구현 결정:** public profile read와 인증된 own-profile read/update, dashboard, friends/list/request/accept를 별도 route로 연결했습니다.
- **상태/소유권 변화:** route는 인증 identity를 mutation target에 결합하고 repository는 저장/조회 로직을 유지합니다.
- **실패/edge:** 화면이 실패를 sample로 대체하면 route 권한·오류가 숨겨질 수 있으며, friendship canonicalization은 이후 category 02에서 강화됩니다.
- **보장/비보장:** 접근 형태는 구분하지만 web의 cache coherence와 honest failure display는 아직 없습니다.
- **다음 연결:** `cbe876359d31`–`051eac1b4aee`가 이 API를 화면 journey에 연결합니다.
<!-- LEARNER-ANSWER END commit:0bcc487d949f -->

비교 기준:
- 직전 Thread 관련 SHA: `c7ea1ff241c8` — `feat(db): 최근 경기와 대시보드 조회 구현`
- 다음 Thread 관련 SHA: `cbe876359d31` — `feat(web): 플레이어 대시보드 구현`

### 5.5. `feat(web): 플레이어 대시보드 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `cbe876359d31` |
| Importance | B |
| Tags | WEB |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Adds a dashboard route consuming the shared `DashboardSummary` read model.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/dashboard/page.tsx`의 sample 초기 state와 `getDashboard`
- 고정 SVG `polyline`
- stats와 recent match rendering
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:cbe876359d31 -->
- **직전 상태:** dashboard API는 있었지만 사용자 화면이 없었습니다.
- **구현 결정:** sample dashboard를 초기값으로 두고 실제 API 결과로 교체하며 승/패/승률/연승과 최근 경기를 표시했습니다.
- **상태/소유권 변화:** 화면이 서버 read model을 소비하지만 고정 SVG와 sample 초기값으로 일부 사실을 자체 생성합니다.
- **실패/edge:** request 실패 시 sample이 남고 chart는 실제 rating history와 무관한 고정 상승선입니다.
- **보장/비보장:** 기본 dashboard journey는 제공하지만 표시가 전부 서버 사실이라는 보장은 없습니다.
- **다음 연결:** `8d79139a32da`가 chart를 match delta에서 계산하고 `be31566ac0fd`가 sample fallback을 제거합니다.
<!-- LEARNER-ANSWER END commit:cbe876359d31 -->

비교 기준:
- 직전 Thread 관련 SHA: `0bcc487d949f` — `feat(api): 프로필과 친구 리소스 라우트 추가`
- 다음 Thread 관련 SHA: `cb295396771f` — `feat(web): 순위표 화면 추가`

### 5.6. `feat(web): 순위표 화면 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `cb295396771f` |
| Importance | B |
| Tags | WEB |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Renders rank, player record, rating, and win rate from the shared leaderboard contract.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/leaderboard/page.tsx`의 sample 초기 state
- `getLeaderboard` 호출과 entry rendering
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:cb295396771f -->
- **직전 상태:** repository/API가 순위를 계산해도 전용 web route가 없었습니다.
- **구현 결정:** `LeaderboardEntry`를 받아 rank, identity, wins, rating, winRate를 표로 표시했습니다.
- **상태/소유권 변화:** ranking 계산은 repository에 남고 web은 projection을 렌더링합니다.
- **실패/edge:** API 실패 시 sample leaderboard가 실제 현재 순위처럼 보일 수 있습니다.
- **보장/비보장:** 정상 응답 rendering은 제공하지만 실패의 진실성은 `be31566ac0fd` 전까지 부족합니다.
- **다음 연결:** sample fallback 제거 commit이 empty/error 상태로 바꿉니다.
<!-- LEARNER-ANSWER END commit:cb295396771f -->

비교 기준:
- 직전 Thread 관련 SHA: `cbe876359d31` — `feat(web): 플레이어 대시보드 구현`
- 다음 Thread 관련 SHA: `0afc0a0694bd` — `feat(web): 공개 프로필 화면 추가`

### 5.7. `feat(web): 공개 프로필 화면 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `0afc0a0694bd` |
| Importance | B |
| Tags | WEB |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Adds a dynamic public-profile route keyed by handle.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/profile/[handle]/page.tsx`의 sample user selection
- handle 길이 기반 선수 번호, 정적 play style, 초기 friend/share controls
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:0afc0a0694bd -->
- **직전 상태:** public profile API는 있었지만 handle route가 없었습니다.
- **구현 결정:** route handle에 따라 sample user를 선택하고 전적·rating·정적 style과 action UI를 표시했습니다.
- **상태/소유권 변화:** 초기 화면은 profile 사실을 서버가 아니라 sample module과 handle 길이에서 만들어 냅니다.
- **실패/edge:** 존재하지 않는 handle도 가짜 사용자로 표현되고 선수 번호·style에 repository 근거가 없습니다.
- **보장/비보장:** route shell만 제공하며 실제 identity/read-model 정확성은 보장하지 않습니다.
- **다음 연결:** `051eac1b4aee`가 API와 친구 요청을 연결하지만 실패 시 sample은 아직 남습니다.
<!-- LEARNER-ANSWER END commit:0afc0a0694bd -->

비교 기준:
- 직전 Thread 관련 SHA: `cb295396771f` — `feat(web): 순위표 화면 추가`
- 다음 Thread 관련 SHA: `051eac1b4aee` — `feat(profile): 친구 요청 동작 연결`

### 5.8. `feat(profile): 친구 요청 동작 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `051eac1b4aee` |
| Importance | B |
| Tags | AUTH, WEB |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Connects the dynamic profile route to public-profile lookup and authenticated friend-request mutation.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/profile/[handle]/page.tsx`의 `getProfile`, `requestFriend`
- route handle을 target으로 사용하는 friend action
- fetch/mutation catch와 sample fallback
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:051eac1b4aee -->
- **직전 상태:** profile page와 버튼은 정적 sample 동작이었습니다.
- **구현 결정:** resolved route handle로 public profile을 요청하고 같은 handle을 friend-request target으로 사용합니다.
- **상태/소유권 변화:** identity target은 URL과 server response로 이동하지만 initial/failure state는 sample user를 유지합니다.
- **실패/edge:** profile fetch failure가 sample 표시로 숨겨지고 friend mutation 실패도 일반 메시지로만 처리됩니다.
- **보장/비보장:** 정상 요청의 target 연결은 보장하지만 실패 화면이 실제 identity를 반영한다는 보장은 없습니다.
- **다음 연결:** `51e66cf1df80`이 최근 경기 표시를 실제 response에 연결하고 `be31566ac0fd`가 sample을 제거합니다.
<!-- LEARNER-ANSWER END commit:051eac1b4aee -->

비교 기준:
- 직전 Thread 관련 SHA: `0afc0a0694bd` — `feat(web): 공개 프로필 화면 추가`
- 다음 Thread 관련 SHA: `51e66cf1df80` — `fix(profile): 공개 프로필 상태 표현 개선`

### 5.9. `fix(profile): 공개 프로필 상태 표현 개선`

| 항목 | 값 |
| --- | --- |
| SHA | `51e66cf1df80` |
| Importance | B |
| Tags | PERSISTENCE, WEB |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Stores and renders the recent-match collection returned with a public profile.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/profile/[handle]/page.tsx`의 `recentMatches` state
- result/opponent/score list와 empty state
- 당시 fetch failure message와 남아 있는 sample user
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.
- Fix chain을 `이전 가정 → 실제 실패/위험 → root cause → 교정된 결정 → 남는 비보장` 순서로 복원합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:51e66cf1df80 -->
- **직전 상태:** 공개 프로필은 정적 play style을 보여 실제 match history를 사용하지 않았습니다.
- **구현 결정:** profile response의 `recentMatches`를 보관해 승패·상대·점수를 렌더링하고 없으면 명시적 empty state를 표시합니다.
- **상태/소유권 변화:** 플레이 상태 설명이 정적 문구에서 repository-backed match read model로 이동합니다.
- **실패/edge:** fetch 실패 시 메시지는 sample 표시를 인정하지만 sample user 자체는 여전히 남습니다.
- **보장/비보장:** 정상 response의 recent-match rendering은 정확하지만 실패 identity는 후속 fix 전까지 부정확합니다.
- **다음 연결:** `8d79139a32da`가 dashboard chart도 실제 match delta로 전환합니다.
<!-- LEARNER-ANSWER END commit:51e66cf1df80 -->

비교 기준:
- 직전 Thread 관련 SHA: `051eac1b4aee` — `feat(profile): 친구 요청 동작 연결`
- 다음 Thread 관련 SHA: `8d79139a32da` — `fix(dashboard): 경기 상태 표현 개선`

### 5.10. `fix(dashboard): 경기 상태 표현 개선`

| 항목 | 값 |
| --- | --- |
| SHA | `8d79139a32da` |
| Importance | B |
| Tags | WEB |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Replaces a fixed chart with points reconstructed from current rating and recent match deltas.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/dashboard/page.tsx`의 `buildRatingPoints`
- `toChartPoints`의 min/max/range 및 640×150 scaling
- empty history 당시 `[currentRating - 1, currentRating]` fallback
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.
- Fix chain을 `이전 가정 → 실제 실패/위험 → root cause → 교정된 결정 → 남는 비보장` 순서로 복원합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:8d79139a32da -->
- **직전 상태:** chart는 고정 좌표라 사용자 rating history와 무관했습니다.
- **구현 결정:** newest-first matches를 reverse하고 delta 합을 현재 rating에서 빼 시작 rating을 구한 뒤 시간순으로 누적합니다. 화면 좌표는 min/max range를 640×150 영역으로 정규화합니다.
- **상태/소유권 변화:** chart shape는 실제 recent-match delta에서 유도됩니다.
- **실패/edge:** match가 없으면 `[current-1,current]` 두 점을 만들어 여전히 근거 없는 상승선을 표시합니다.
- **보장/비보장:** bounded recent history의 변화는 반영하지만 전체 rating history와 empty truthfulness는 보장하지 않습니다.
- **다음 연결:** `3c6c9134ee94`가 empty history fabrication을 제거합니다.
<!-- LEARNER-ANSWER END commit:8d79139a32da -->

비교 기준:
- 직전 Thread 관련 SHA: `51e66cf1df80` — `fix(profile): 공개 프로필 상태 표현 개선`
- 다음 Thread 관련 SHA: `be31566ac0fd` — `fix(web): 로그인 화면의 sample fallback 제거`

### 5.11. `fix(web): 로그인 화면의 sample fallback 제거`

| 항목 | 값 |
| --- | --- |
| SHA | `be31566ac0fd` |
| Importance | A |
| Tags | AUTH, TOURNAMENT, WEB |
| 학습 깊이 | 주요 subsystem, 구현 경로, ownership/failure/non-guarantee를 구체적으로 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Stops authenticated and server-backed screens from displaying sample data after request failure.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- admin/dashboard/leaderboard/lobby/profile/tournaments page의 sample import 제거
- nullable dashboard/profile와 empty arrays
- loading/error/empty message 및 mutation error handling
- parent 상태와 비교해 이전 가정, 새 boundary, caller/callee, ownership 또는 failure path를 기록합니다.
- 이 commit이 보장하지 않는 상태와 다음 fix/test가 보강하는 지점을 구분합니다.
- Fix chain을 `이전 가정 → 실제 실패/위험 → root cause → 교정된 결정 → 남는 비보장` 순서로 복원합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:be31566ac0fd -->
- **직전 가정:** 개발 편의를 위해 request가 실패해도 sample user·match·chat·ranking·tournament를 보여 주는 것이 허용됐습니다.
- **실제 위험:** 인증 실패, 권한 거부, 서버 장애, 빈 데이터가 모두 성공한 제품 상태처럼 보이고 사용자가 가짜 identity/action target을 볼 수 있었습니다.
- **교정:** server-backed state를 null/empty로 시작하고 성공 시에만 채웁니다. 실패는 명시적 메시지, empty는 별도 문구로 표시하며 profile은 user가 없으면 본문을 렌더링하지 않습니다.
- **상태/소유권 변화:** sample module이 read-model authority에서 제거되고 server response만 제품 데이터가 됩니다. web은 loading/error/empty 표현만 소유합니다.
- **보장/비보장:** 실패 은폐는 제거하지만 server 데이터 자체의 정확성은 repository invariant와 tests에 의존합니다.
- **다음 연결:** `035b97ca7c58`이 여전히 fabricated였던 backend 최고 연승을 실제 recent matches에서 계산합니다.
<!-- LEARNER-ANSWER END commit:be31566ac0fd -->

비교 기준:
- 직전 Thread 관련 SHA: `8d79139a32da` — `fix(dashboard): 경기 상태 표현 개선`
- 다음 Thread 관련 SHA: `035b97ca7c58` — `fix(db): 최근 경기에서 최고 연승 계산`

### 5.12. `fix(db): 최근 경기에서 최고 연승 계산`

| 항목 | 값 |
| --- | --- |
| SHA | `035b97ca7c58` |
| Importance | B |
| Tags | PERSISTENCE |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Calculates dashboard best winning streak from actual recent match results instead of formulas/constants.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.ts`의 양 repository `getDashboard`
- `bestWinningStreak` helper
- newest-first collection reverse, win increment, loss reset
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.
- Fix chain을 `이전 가정 → 실제 실패/위험 → root cause → 교정된 결정 → 남는 비보장` 순서로 복원합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:035b97ca7c58 -->
- **직전 가정:** 누적 wins/losses formula나 고정 3이 최고 연승을 근사할 수 있다고 봤습니다.
- **실제 오류:** 동일 누적 전적이라도 경기 순서에 따라 연승이 달라지며 PostgreSQL/memory가 서로 다른 값을 반환했습니다.
- **교정:** `listRecentMatches` 결과를 reverse해 시간순으로 순회하고 win이면 current/max를 증가, loss이면 current를 0으로 reset합니다.
- **상태/소유권 변화:** metric은 repository별 임의 값이 아니라 공유 result sequence에서 계산됩니다.
- **보장/비보장:** 반환된 최근 경기 범위 안의 최고 연승만 정확하며 전체 시즌 기록은 아닙니다.
- **다음 연결:** `6b661420e060`이 ordering과 loss reset을 W/L/W/W sequence로 고정합니다.
<!-- LEARNER-ANSWER END commit:035b97ca7c58 -->

비교 기준:
- 직전 Thread 관련 SHA: `be31566ac0fd` — `fix(web): 로그인 화면의 sample fallback 제거`
- 다음 Thread 관련 SHA: `6b661420e060` — `test(db): 최고 연승 계산 검증`

### 5.13. `test(db): 최고 연승 계산 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `6b661420e060` |
| Importance | B |
| Tags | PERSISTENCE, TEST |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Pins the winning-streak ordering and reset rules.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.test.ts`의 memory repository case
- chronological W,L,W,W 생성과 newest-first 반환 assertion
- `bestStreak === 2` assertion
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.
- Test technique, failure/boundary fixture, production path, proves/does-not-prove를 실제 assertion으로 구분합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:6b661420e060 -->
- **직전 상태:** helper는 구현됐지만 newest-first read model을 잘못 순회하거나 loss reset을 빠뜨리는 regression을 막을 test가 없었습니다.
- **기법:** 시간순 W,L,W,W를 저장하고 read model이 newest-first W,W,L,W인지 확인한 뒤 dashboard 최고 연승이 2인지 검사합니다.
- **생산 경로:** memory repository의 match 저장·recent projection·dashboard calculation을 함께 통과합니다.
- **증명/비증명:** ordering과 reset rule을 검증하도록 작성됐지만 PostgreSQL query ordering은 별도 integration 근거가 필요합니다.
- **보장:** formula/constant로 돌아가는 regression을 감지합니다.
- **다음 연결:** `7fe29f991a9b`이 화면 설명을 실제 bounded metric에 맞춥니다.
<!-- LEARNER-ANSWER END commit:6b661420e060 -->

비교 기준:
- 직전 Thread 관련 SHA: `035b97ca7c58` — `fix(db): 최근 경기에서 최고 연승 계산`
- 다음 Thread 관련 SHA: `7fe29f991a9b` — `fix(dashboard): 연승 지표 설명 정정`

### 5.14. `fix(dashboard): 연승 지표 설명 정정`

| 항목 | 값 |
| --- | --- |
| SHA | `7fe29f991a9b` |
| Importance | C |
| Tags | - |
| 학습 깊이 | Thread 이해에 필요한 제한된 문맥만 기록합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Changes the dashboard hint from “this season” to “recent matches” so the label matches the data boundary.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/dashboard/page.tsx`의 최고 연승 `StatCard` hint 한 줄
- 이 한정된 변경이 Thread의 실제 의미 또는 설명 정확성에 기여하는 부분만 기록합니다.
- Fix chain을 `이전 가정 → 실제 실패/위험 → root cause → 교정된 결정 → 남는 비보장` 순서로 복원합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:7fe29f991a9b -->
- **변경:** 최고 연승 설명을 `이번 시즌`에서 `최근 경기`로 바꿨습니다.
- **이유:** repository는 최대 최근 8경기만 계산하므로 시즌 전체라는 주장은 근거가 없습니다.
- **범위:** 계산·저장·API 동작은 바꾸지 않는 표시 정확성 보정입니다.
<!-- LEARNER-ANSWER END commit:7fe29f991a9b -->

비교 기준:
- 직전 Thread 관련 SHA: `6b661420e060` — `test(db): 최고 연승 계산 검증`
- 다음 Thread 관련 SHA: `3c6c9134ee94` — `fix(dashboard): 빈 rating history를 정확히 표시`

### 5.15. `fix(dashboard): 빈 rating history를 정확히 표시`

| 항목 | 값 |
| --- | --- |
| SHA | `3c6c9134ee94` |
| Importance | B |
| Tags | PERSISTENCE, WEB |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Treats empty match history as no rating evidence instead of fabricating a two-point chart.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/dashboard/page.tsx`의 `hasRatingHistory`
- empty chart message와 polyline 조건
- `buildRatingPoints`의 가짜 `[current-1,current]` 제거
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.
- Fix chain을 `이전 가정 → 실제 실패/위험 → root cause → 교정된 결정 → 남는 비보장` 순서로 복원합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:3c6c9134ee94 -->
- **직전 가정:** chart component를 항상 그리기 위해 empty history에도 1점 상승한 두 좌표를 만들었습니다.
- **실제 위험:** 경기가 없는 사용자에게 rating 상승 이력이 존재하는 것처럼 보였습니다.
- **교정:** history 존재 여부를 별도로 계산하고 없으면 polyline 대신 “표시할 경기 이력 없음” 상태를 렌더링하며 helper는 실제 point만 반환합니다.
- **상태/소유권 변화:** presentation이 데이터 부재를 숨기지 않습니다.
- **보장/비보장:** empty truthfulness는 보장하지만 bounded recent history 이전의 변화는 여전히 표시하지 않습니다.
- **다음 연결:** `c17e7ad0fd84`이 profile/friend reads와 mutation invalidation을 React Query로 구조화합니다.
<!-- LEARNER-ANSWER END commit:3c6c9134ee94 -->

비교 기준:
- 직전 Thread 관련 SHA: `7fe29f991a9b` — `fix(dashboard): 연승 지표 설명 정정`
- 다음 Thread 관련 SHA: `c17e7ad0fd84` — `feat(web): profile과 friend 조회 query 추가`

### 5.16. `feat(web): profile과 friend 조회 query 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `c17e7ad0fd84` |
| Importance | B |
| Tags | WEB |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Adds schema-validated profile/friend browser helpers and scoped React Query options.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/lib/api.ts`의 `getFriends`, `getOwnProfile`, `updateOwnProfile`
- `apps/web/src/lib/query.ts`의 keys/options
- profile update 성공 시 me/own/public/lobby/dashboard/friends/leaderboard/tournaments/admin invalidation
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:c17e7ad0fd84 -->
- **직전 상태:** profile/friend 요청은 page effect와 ad-hoc state에 흩어져 cache ownership과 mutation 후 refresh 범위가 명시적이지 않았습니다.
- **구현 결정:** typed API helper와 query key factory/options를 추가하고 own-profile mutation 뒤 identity가 반영될 수 있는 모든 read model을 invalidate합니다. session expiry는 own-profile cache도 제거합니다.
- **상태/소유권 변화:** server state freshness는 React Query cache/key가, 화면 local state는 presentation만 담당합니다.
- **실패/edge:** 넓은 invalidation은 추가 요청 비용이 있지만 stale display를 방지합니다. 서버 mutation 자체의 원자성은 이 layer 범위가 아닙니다.
- **보장/비보장:** 공식 helper를 쓰는 화면의 cache coherence를 높이지만 임의 direct fetch caller까지 강제하지는 않습니다.
- **다음 연결:** `8bc4d0cc32bd`가 URL/credentials/body/key/invalidation/session-expiry 규칙을 테스트합니다.
<!-- LEARNER-ANSWER END commit:c17e7ad0fd84 -->

비교 기준:
- 직전 Thread 관련 SHA: `3c6c9134ee94` — `fix(dashboard): 빈 rating history를 정확히 표시`
- 다음 Thread 관련 SHA: `8bc4d0cc32bd` — `test(web): profile과 friend 조회 규칙 검증`

### 5.17. `test(web): profile과 friend 조회 규칙 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `8bc4d0cc32bd` |
| Importance | B |
| Tags | AUTH, WEB, TEST |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Verifies own-profile/friend request helpers and React Query ownership rules.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- web API helper test의 URL, credentials, AbortSignal, PATCH body assertion
- query key/options test
- profile update invalidation과 session expiry cache removal
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.
- Test technique, failure/boundary fixture, production path, proves/does-not-prove를 실제 assertion으로 구분합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:8bc4d0cc32bd -->
- **직전 상태:** helper와 invalidation 목록은 구현됐지만 URL·credential·body·cache 범위가 후속 refactor에서 바뀌어도 잡을 test가 없었습니다.
- **기법:** fetch를 대체해 own profile/friends 요청의 URL, credential, signal과 PATCH JSON body를 확인하고 query client spy로 invalidate/remove 호출을 검사합니다.
- **생산 경로:** browser adapter와 React Query option/mutation lifecycle을 직접 실행합니다.
- **증명/비증명:** client request/cache ownership을 검증하도록 작성됐지만 실제 HTTP 서버와 DB friendship invariant는 검증하지 않습니다.
- **보장:** profile mutation/session expiry 뒤 stale identity 관련 cache가 남는 regression을 감지합니다.
- **Thread 종료:** read model의 사실성, bounded metric 설명, client cache ownership이 연결됩니다.
<!-- LEARNER-ANSWER END commit:8bc4d0cc32bd -->

비교 기준:
- 직전 Thread 관련 SHA: `c17e7ad0fd84` — `feat(web): profile과 friend 조회 query 추가`
- 이 commit을 Thread의 마지막 상태로 사용합니다.

## 6. Thread 종합

다음 항목을 commit 순서에서 재구성합니다: invariant evolution, Failure → Fix → Test 관계, ownership/state 변화, 최종 실행 흐름, 비보장, 실제 실행 증거.

<!-- LEARNER-ANSWER START thread:03-profile-friendship-dashboard-and-ranking-journeys.md:synthesis -->
- **불변식 진화:** 초기 repository는 profile/leaderboard/recent-match/dashboard를 제공했지만 `getDashboard`의 최고 연승은 PostgreSQL에서 `wins - losses + 3`을 제한한 값, memory에서 고정 3이었습니다. web은 sample user와 고정 SVG 그래프를 사용하고 API 실패를 sample로 숨겼습니다. `be31566ac0fd`가 이 실패 은폐를 제거하고, `035b97ca7c58`–`7fe29f991a9b`가 실제 recent-match 순서에서 연승을 계산하고 범위를 “최근 경기”로 설명하며, `3c6c9134ee94`가 빈 이력에 가짜 그래프를 만들지 않게 했습니다.
- **소유권:** repository는 read model의 계산·정렬·projection을, HTTP route는 public/authenticated 접근 구분을, browser adapter와 React Query는 parsing·cache key·invalidation을, 화면은 loading/error/empty/rendering을 소유합니다. sample data는 더 이상 실패 대체 authority가 아닙니다.
- **Failure → Fix → Test:** 추정 최고 연승 → 실제 chronological scan → W/L/W/W test. 고정 chart → rating delta 역산 → empty history를 별도 상태로 수정. sample fallback → nullable/empty/error 화면. query ownership → helper/key/invalidation test로 연결됩니다.
- **최종 흐름:** repository가 public profile, leaderboard, newest-first recent matches, dashboard를 생성 → API가 공개/인증 route로 노출 → typed browser helper와 query option이 읽음 → mutation은 관련 identity/read-model cache를 무효화 → 화면은 실제 결과 또는 명시적 실패/empty state만 표시합니다.
- **비보장:** 최고 연승과 chart는 repository가 반환한 최근 최대 8경기 범위입니다. 전체 시즌/전체 계정 이력을 의미하지 않습니다. friendship canonical pair/동시성은 category 02 Thread 04가 주 소유자입니다.
- **실행 증거:** exact SHA의 repository·route·web helper·test 구현을 검사했으며 로컬 test runner는 실행하지 않았습니다.
<!-- LEARNER-ANSWER END thread:03-profile-friendship-dashboard-and-ranking-journeys.md:synthesis -->

## 7. 학습 완료 확인

<!-- LEARNER-ANSWER START thread:03-profile-friendship-dashboard-and-ranking-journeys.md:checklist -->
- [x] 모든 SHA를 지정 브랜치의 exact commit으로 검사했습니다.
- [x] fixed commit map과 source classification을 보존했습니다.
- [x] earlier commit을 later HEAD 코드로 설명하지 않았습니다.
- [x] fix와 test를 원래 failure/production path에 연결했습니다.
- [x] 실제 실행하지 않은 test를 통과했다고 기록하지 않았습니다.
- [x] Thread 최종 owner, invariant, flow, non-guarantee를 작성했습니다.
<!-- LEARNER-ANSWER END thread:03-profile-friendship-dashboard-and-ranking-journeys.md:checklist -->
