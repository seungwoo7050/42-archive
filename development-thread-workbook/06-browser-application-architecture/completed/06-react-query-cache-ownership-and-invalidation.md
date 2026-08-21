# React Query cache ownership과 invalidation

- 카테고리: `06-browser-application-architecture` — 브라우저 애플리케이션 아키텍처
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

component-owned fetch effect를 하나의 `QueryClient`, stable query key, endpoint별 stale time, AbortSignal, mutation invalidation, session-expiry cache eviction, WebSocket cache update 규칙을 갖는 canonical browser server-state owner로 이동하는 과정을 복원합니다.

### 직접 연결되는 불변식

- browser server state는 application 수명 동안 하나의 `QueryClient`와 scope가 명시된 stable key가 소유합니다.
- query function은 React Query가 제공한 `AbortSignal`을 endpoint helper에 전달합니다.
- 401/session-expired는 private cache를 제거하고 `me`를 `null`로 만들되 public leaderboard/profile/tournament cache를 불필요하게 지우지 않습니다.
- mutation은 관련 exact key만 invalidation하며 WebSocket push도 같은 canonical cache를 갱신합니다.
- authentication error는 retry하지 않고 retry 가능한 일반 failure만 제한적으로 재시도합니다.

## 2. 핵심 질문

- query key가 global, handle, user, tournament scope를 어떤 tuple로 표현합니까?
- session expiry 중 fetching query를 제거할 때 current callback을 방해하지 않도록 어떤 scheduling을 사용합니까?
- lobby HTTP read, chat mutation, WebSocket push가 같은 cache entry를 어떻게 갱신합니까?
- 각 screen migration 뒤 local effect/data state가 실제로 제거됐습니까?
- test가 exact invalidation과 public/private cache 보존을 어떤 `QueryClient`/`QueryObserver`로 증명합니까?

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
| 1 | `e000e3d6a460` | `refactor(web): query key와 retry 정책 정의` | B | AUTH, TOURNAMENT, WEB | screen migration 전에 cache key vocabulary와 retry policy를 정의합니다. |
| 2 | `d05a962d8829` | `refactor(web): session query와 cache invalidation 추가` | A | TOURNAMENT, WEB, OBSERVABILITY | endpoint별 query option과 session-expiry invalidation을 정의합니다. |
| 3 | `80ec34fde74c` | `refactor(web): React Query provider 연결` | B | AUTH, WEB, OBSERVABILITY | application root에 단일 `QueryClient`를 설치합니다. |
| 4 | `931800f796e1` | `refactor(web): lobby와 login을 query cache로 전환` | B | AUTH, REALTIME, WEB | HTTP load, socket event, login/chat mutation이 동일 lobby/session cache owner를 갱신합니다. |
| 5 | `8a44c23f15de` | `refactor(web): dashboard와 leaderboard를 query cache로 전환` | B | WEB | dashboard와 leaderboard component effect를 shared cache로 이동합니다. |
| 6 | `e2ccee689642` | `refactor(web): profile 조회를 query cache로 전환` | B | WEB | route handle을 query identity로 사용합니다. |
| 7 | `045d0cd2c171` | `refactor(web): tournament 조회와 mutation을 query cache로 전환` | B | TOURNAMENT, WEB | tournament read와 create/join mutation을 cache로 이동합니다. |
| 8 | `0b1a6bcb4311` | `refactor(web): admin 조회와 mutation을 query cache로 전환` | B | AUTH, WEB | admin read/status mutation을 cache로 이동합니다. |
| 9 | `0e0c9645ab2d` | `refactor(web): shell의 session 소비를 query cache로 통합` | B | AUTH, WEB | `AppShell`의 private session effect를 shared `me` query로 교체합니다. |
| 10 | `1ebdce4cdf0a` | `test(web): query cache key·retry·invalidation 검증` | A | AUTH, TOURNAMENT, WEB | key scoping, retry exclusion, mutation/session invalidation을 검증합니다. |

## 5. Commit별 학습 기록

### 5.1. `refactor(web): query key와 retry 정책 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `e000e3d6a460` |
| Importance | B |
| Tags | AUTH, TOURNAMENT, WEB |
| Source에서 확정된 역할 | screen migration 전에 cache key vocabulary와 retry policy를 정의합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/lib/query.ts`의 `queryKeys`, `mutationInvalidations`, `invalidateExactQueries`, retry predicate를 확인합니다.
- profile handle, tournament/admin/lobby/me key가 서로 prefix collision을 만들지 않는지 확인합니다.
- `ApiError` 401과 일반 failure의 retry 횟수를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 각 page가 effect/local state를 사용해 동일 endpoint를 중복 요청하고 cache identity와 invalidation 규칙이 없었습니다. |
| 해결하려던 문제 | screen을 옮기기 전에 server resource를 식별하고 mutation 영향 범위를 표현할 shared vocabulary가 필요했습니다. |
| 핵심 결정 | tuple 형태 query key, mutation별 invalidation key, `exact: true` helper, 401 무재시도/기타 1회 retry 정책을 정의했습니다. |
| 입력 → 상태 전이 → 출력 | query/mutation caller가 shared key/policy를 사용하지만 이 SHA에서는 아직 screen이 cache를 소비하지 않습니다. |
| ownership/lifetime/cleanup | query module이 key와 invalidation/retry 정책을 소유합니다. |
| failure/rollback/retry | 401은 즉시 종료하고 다른 failure는 제한 횟수만 retry합니다. 실제 fetch cancellation과 session eviction은 아직 없습니다. |
| 보장하는 것 | 이후 migration이 동일 key와 retry semantics를 사용할 기반을 제공합니다. |
| 보장하지 않는 것 | QueryClient instance나 endpoint option, screen adoption은 아직 보장하지 않습니다. |
| 후속 연결 | `d05a962d8829`가 query options와 session eviction을, `80ec34fde74c`가 application provider를 추가합니다. |

#### 비교 기준

- 이 commit의 parent를 `git show e000e3d6a460^` 및 `git diff e000e3d6a460^ e000e3d6a460`로 비교합니다.
- Thread 내 다음 관련 SHA: `d05a962d8829` — `refactor(web): session query와 cache invalidation 추가`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.2. `refactor(web): session query와 cache invalidation 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `d05a962d8829` |
| Importance | A |
| Tags | TOURNAMENT, WEB, OBSERVABILITY |
| Source에서 확정된 역할 | endpoint별 query option과 session-expiry invalidation을 정의합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `query.ts`의 `meQueryOptions`, lobby/dashboard/leaderboard/profile/tournament/admin options와 stale time을 확인합니다.
- 각 `queryFn({ signal })`이 API helper로 signal을 전달하는지 확인합니다.
- `expireSession`이 private keys를 remove하고 `me`를 `null`로 set하는 순서와 fetching query 제거 defer를 확인합니다.
- public key가 eviction 대상에서 제외되는 근거를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | key vocabulary는 있었지만 endpoint별 query function, cancellation, session-expiry cache transition이 정의되지 않았습니다. |
| 해결하려던 문제 | 401 이후 stale private data가 남거나 active fetch 제거가 observer callback을 비정상 상태에 둘 수 있었습니다. |
| 핵심 결정 | endpoint options를 만들고 React Query signal을 전달했으며 private cache를 선택적으로 제거하고 `me`를 null로 설정하는 `expireSession`을 추가했습니다. fetching query 제거는 다음 task로 미뤘습니다. |
| 입력 → 상태 전이 → 출력 | session-expired event → private query 상태 조사 → idle query 즉시 remove/fetching query deferred remove → `me` null set 순서입니다. |
| ownership/lifetime/cleanup | QueryClient가 server state를 소유하고 `expireSession`이 auth transition을 조정합니다. in-flight request lifetime은 query signal이 관리합니다. |
| failure/rollback/retry | public profile/leaderboard/tournament는 보존하고 private lobby/dashboard/admin 등은 제거합니다. current fetching callback을 동기 remove하지 않습니다. |
| 보장하는 것 | session expiry가 private cache를 명시적으로 무효화하고 active query를 pending에 가두지 않는 기반을 만듭니다. |
| 보장하지 않는 것 | root provider와 실제 screen adoption, exact behavior test는 아직 없습니다. |
| 후속 연결 | `80ec34fde74c`가 event listener/provider를 설치하고 `1ebdce4cdf0a`가 active unauthorized query까지 검증합니다. |

#### A-level 불변식 종합

- **핵심 책임:** endpoint별 query option과 session-expiry invalidation을 정의합니다.
- **실패 영향:** 401 이후 stale private data가 남거나 active fetch 제거가 observer callback을 비정상 상태에 둘 수 있었습니다.
- **결과 불변식:** session expiry가 private cache를 명시적으로 무효화하고 active query를 pending에 가두지 않는 기반을 만듭니다.
- **남은 제한:** root provider와 실제 screen adoption, exact behavior test는 아직 없습니다.

#### 핵심 코드 근거

| 항목 | 값 |
| --- | --- |
| SHA | `d05a962d8829` |
| 파일 | `apps/web/src/lib/query.ts` |
| 함수/위치 | `expireSession / query options` |
| 근거 요약 | query function은 제공된 `signal`을 API helper에 전달하고, session expiry는 private keys만 제거한 뒤 `me`를 `null`로 설정합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `e000e3d6a460` — `refactor(web): query key와 retry 정책 정의`
- Thread 내 다음 관련 SHA: `80ec34fde74c` — `refactor(web): React Query provider 연결`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.3. `refactor(web): React Query provider 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `80ec34fde74c` |
| Importance | B |
| Tags | AUTH, WEB, OBSERVABILITY |
| Source에서 확정된 역할 | application root에 단일 `QueryClient`를 설치합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/components/QueryProvider.tsx`의 `useState(() => new QueryClient(...))`를 확인합니다.
- default query/mutation options와 window focus refetch 설정을 확인합니다.
- session-expired event listener 등록/해제와 `expireSession(client)` 호출을 확인합니다.
- `layout.tsx`에서 provider가 application children을 감싸는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | query options는 존재했지만 React tree에 stable client가 없어 screen이 shared cache를 사용할 수 없었습니다. |
| 해결하려던 문제 | rerender마다 client가 재생성되지 않고 session event를 한 곳에서 처리하는 application lifetime owner가 필요했습니다. |
| 핵심 결정 | `useState` initializer로 QueryClient를 한 번 만들고 root provider와 session-expired listener를 연결했습니다. |
| 입력 → 상태 전이 → 출력 | application mount → QueryClient 생성 → Context 제공 → event listener; unmount → listener 제거 순서입니다. |
| ownership/lifetime/cleanup | provider component가 QueryClient와 global event listener lifetime을 소유합니다. |
| failure/rollback/retry | mutation은 기본 retry하지 않고 query는 shared retry policy를 사용하며 focus refetch 정책을 고정합니다. |
| 보장하는 것 | application 수명 동안 canonical cache client 하나를 제공합니다. |
| 보장하지 않는 것 | 각 screen이 실제로 local effect를 제거하는지는 아직 보장하지 않습니다. |
| 후속 연결 | `931800f796e1`부터 screen별 migration이 진행됩니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `d05a962d8829` — `refactor(web): session query와 cache invalidation 추가`
- Thread 내 다음 관련 SHA: `931800f796e1` — `refactor(web): lobby와 login을 query cache로 전환`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.4. `refactor(web): lobby와 login을 query cache로 전환`

| 항목 | 값 |
| --- | --- |
| SHA | `931800f796e1` |
| Importance | B |
| Tags | AUTH, REALTIME, WEB |
| Source에서 확정된 역할 | HTTP load, socket event, login/chat mutation이 동일 lobby/session cache owner를 갱신합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `HomePage`의 `useQuery(meQueryOptions/lobbyQueryOptions)`와 제거된 fetch effect/local data state를 확인합니다.
- login mutation이 `me` cache를 set하고 어떤 exact keys를 invalidation하는지 확인합니다.
- lobby chat mutation과 WebSocket `chat.message`가 `queryKeys.lobby()`를 dedupe하고 최근 20개로 제한하는지 확인합니다.
- presence event가 lobby key를 invalidation하는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | home/login이 page effect와 local arrays를 소유해 HTTP response, mutation result, WebSocket push가 서로 다른 state를 갱신했습니다. |
| 해결하려던 문제 | lobby의 canonical state를 한 cache entry로 통합하고 auth/chat mutation과 push event가 같은 owner를 사용해야 했습니다. |
| 핵심 결정 | `me`/`lobby` queries로 읽기를 옮기고 login/chat mutation 및 WebSocket event가 query cache를 set/invalidate하도록 바꿨습니다. |
| 입력 → 상태 전이 → 출력 | query fetch → lobby cache; chat POST/WS event → current cache update(dedupe/last20) → exact invalidation; login success → me set → related invalidation 순서입니다. |
| ownership/lifetime/cleanup | QueryClient가 session/lobby server state를, page는 chat input/notice와 socket ref만 소유합니다. |
| failure/rollback/retry | duplicate message ID는 제거되고 최근 20개만 유지됩니다. mutation error는 cache success로 위장하지 않습니다. |
| 보장하는 것 | HTTP와 realtime update가 하나의 lobby cache를 공유합니다. |
| 보장하지 않는 것 | lobby WebSocket 자체의 transport lifetime은 여전히 page effect가 소유합니다. |
| 후속 연결 | 후속 commits가 나머지 screen을 같은 cache model로 옮깁니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `80ec34fde74c` — `refactor(web): React Query provider 연결`
- Thread 내 다음 관련 SHA: `8a44c23f15de` — `refactor(web): dashboard와 leaderboard를 query cache로 전환`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.5. `refactor(web): dashboard와 leaderboard를 query cache로 전환`

| 항목 | 값 |
| --- | --- |
| SHA | `8a44c23f15de` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | dashboard와 leaderboard component effect를 shared cache로 이동합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 두 page에서 `useEffect`, local resource/error/loading state가 제거되는지 확인합니다.
- `dashboardQueryOptions`, `leaderboardQueryOptions`와 `useQuery` result branch를 확인합니다.
- 기존 truthful loading/error/empty rendering이 query status로 보존되는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | truthful state fix 뒤에도 dashboard/leaderboard는 route mount마다 직접 fetch하고 서로 독립 lifecycle을 가졌습니다. |
| 해결하려던 문제 | 동일 read model을 shared cache, stale time, cancellation 규칙으로 이동해야 했습니다. |
| 핵심 결정 | local effect/data state를 제거하고 endpoint query options를 `useQuery`로 소비했습니다. |
| 입력 → 상태 전이 → 출력 | page render → cache hit 또는 query fetch(signal) → query status/data → existing loading/error/empty/success UI 순서입니다. |
| ownership/lifetime/cleanup | QueryClient가 resource와 request lifetime을 소유하고 page는 presentation만 소유합니다. |
| failure/rollback/retry | unmount/stale query는 signal로 cancellation될 수 있으며 error는 query state로 남습니다. |
| 보장하는 것 | dashboard/leaderboard가 canonical cache와 retry/abort 정책을 사용합니다. |
| 보장하지 않는 것 | mutation이나 realtime update는 이 두 read-only screen에서 다루지 않습니다. |
| 후속 연결 | `1ebdce4cdf0a`가 key와 retry policy를 직접 검증합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `931800f796e1` — `refactor(web): lobby와 login을 query cache로 전환`
- Thread 내 다음 관련 SHA: `e2ccee689642` — `refactor(web): profile 조회를 query cache로 전환`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.6. `refactor(web): profile 조회를 query cache로 전환`

| 항목 | 값 |
| --- | --- |
| SHA | `e2ccee689642` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | route handle을 query identity로 사용합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `profile/[handle]/page.tsx`에서 params handle을 `profileQueryOptions(handle)`에 직접 전달하는지 확인합니다.
- handle 변경용 별도 effect/local profile state가 제거되는지 확인합니다.
- friend mutation 성공 뒤 어떤 exact key를 invalidation하는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | profile page가 route handle 변화와 fetch를 effect/local state로 동기화했습니다. |
| 해결하려던 문제 | resource identity 자체인 handle을 query key에 포함해 다른 profile cache collision과 stale effect를 피해야 했습니다. |
| 핵심 결정 | route handle을 query option 입력으로 직접 사용하고 friend mutation은 관련 friendship/profile key만 invalidation하도록 옮겼습니다. |
| 입력 → 상태 전이 → 출력 | params resolve → handle-scoped query key → fetch(signal) → profile data; friend action → mutation → exact invalidation 순서입니다. |
| ownership/lifetime/cleanup | QueryClient가 handle별 profile state를, page는 clipboard/action notice만 소유합니다. |
| failure/rollback/retry | handle이 바뀌면 다른 key가 선택돼 이전 profile을 같은 state variable에 덮지 않습니다. |
| 보장하는 것 | profile cache가 route identity로 분리되고 request cancellation을 상속합니다. |
| 보장하지 않는 것 | server가 handle uniqueness를 보장하는지는 browser query가 증명하지 않습니다. |
| 후속 연결 | `1ebdce4cdf0a`가 key scoping을 회귀로 고정합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `8a44c23f15de` — `refactor(web): dashboard와 leaderboard를 query cache로 전환`
- Thread 내 다음 관련 SHA: `045d0cd2c171` — `refactor(web): tournament 조회와 mutation을 query cache로 전환`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.7. `refactor(web): tournament 조회와 mutation을 query cache로 전환`

| 항목 | 값 |
| --- | --- |
| SHA | `045d0cd2c171` |
| Importance | B |
| Tags | TOURNAMENT, WEB |
| Source에서 확정된 역할 | tournament read와 create/join mutation을 cache로 이동합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `tournaments/page.tsx`의 tournaments/me queries와 selected ID local state를 구분합니다.
- create/join mutation 성공 후 `mutationInvalidations`의 exact key를 확인합니다.
- pending 상태에서 중복 submit/join을 막는 disabled 조건을 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | tournament list와 mutation result를 page local array가 소유해 다른 route/cache와 일관된 갱신 규칙이 없었습니다. |
| 해결하려던 문제 | read state는 QueryClient로 옮기고 화면 고유 selection만 local에 남겨야 했습니다. |
| 핵심 결정 | tournaments/me를 query로, create/join을 mutation으로 바꾸고 success 후 정의된 exact keys를 invalidation했습니다. |
| 입력 → 상태 전이 → 출력 | query cache → list; selection local; action → mutation → exact invalidation/refetch → updated list 순서입니다. |
| ownership/lifetime/cleanup | QueryClient가 server list/session을, page가 selected tournament ID와 controlled input을 소유합니다. |
| failure/rollback/retry | pending 중 duplicate action을 막고 mutation failure는 query data를 임의로 성공 상태로 바꾸지 않습니다. |
| 보장하는 것 | tournament read/mutation이 cache invalidation contract를 따릅니다. |
| 보장하지 않는 것 | server-side bracket atomicity는 browser cache가 보장하지 않습니다. |
| 후속 연결 | `1ebdce4cdf0a`가 invalidation 범위를 검증합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `e2ccee689642` — `refactor(web): profile 조회를 query cache로 전환`
- Thread 내 다음 관련 SHA: `0b1a6bcb4311` — `refactor(web): admin 조회와 mutation을 query cache로 전환`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.8. `refactor(web): admin 조회와 mutation을 query cache로 전환`

| 항목 | 값 |
| --- | --- |
| SHA | `0b1a6bcb4311` |
| Importance | B |
| Tags | AUTH, WEB |
| Source에서 확정된 역할 | admin read/status mutation을 cache로 이동합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `admin/page.tsx`의 users/actions queries와 status mutation을 확인합니다.
- mutation success 후 admin users와 actions key를 모두 exact invalidation하는지 확인합니다.
- message가 local copied users가 아니라 query/mutation status에서 파생되는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | admin page가 protected users를 local array로 복제하고 mutation 결과로 직접 교체했습니다. |
| 해결하려던 문제 | authorization-sensitive server state를 shared cache와 session eviction 규칙에 포함해야 했습니다. |
| 핵심 결정 | admin users/actions를 query로, status 변경을 mutation으로 옮기고 관련 두 key를 invalidation했습니다. |
| 입력 → 상태 전이 → 출력 | query → protected rows; action → mutation → users/actions invalidation → refetch/render 순서입니다. |
| ownership/lifetime/cleanup | QueryClient가 protected admin state를 소유하고 page는 pending target/notice를 소유합니다. |
| failure/rollback/retry | session-expired 시 private admin keys가 eviction 대상이 되고 mutation failure는 cache를 성공으로 덮지 않습니다. |
| 보장하는 것 | admin state가 auth transition과 exact invalidation 규칙을 따릅니다. |
| 보장하지 않는 것 | server authorization/audit atomicity 자체는 증명하지 않습니다. |
| 후속 연결 | `0e0c9645ab2d`가 shell session까지 같은 cache owner로 통합합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `045d0cd2c171` — `refactor(web): tournament 조회와 mutation을 query cache로 전환`
- Thread 내 다음 관련 SHA: `0e0c9645ab2d` — `refactor(web): shell의 session 소비를 query cache로 통합`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.9. `refactor(web): shell의 session 소비를 query cache로 통합`

| 항목 | 값 |
| --- | --- |
| SHA | `0e0c9645ab2d` |
| Importance | B |
| Tags | AUTH, WEB |
| Source에서 확정된 역할 | `AppShell`의 private session effect를 shared `me` query로 교체합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `AppShell.tsx`에서 `useEffect`, local me state, direct `getMe` import가 제거되는지 확인합니다.
- `useQuery(meQueryOptions())` 결과로 profile href와 disabled state를 계산하는지 확인합니다.
- HomePage/LoginPanel과 shell이 동일 `queryKeys.me()`를 소비하는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | screen은 QueryClient를 사용하지만 shell만 별도 `getMe` effect/state를 가져 current identity owner가 둘이었습니다. |
| 해결하려던 문제 | navigation profile identity도 login/session-expiry와 같은 canonical cache를 사용해야 했습니다. |
| 핵심 결정 | `AppShell`의 direct effect를 제거하고 shared me query를 소비했습니다. |
| 입력 → 상태 전이 → 출력 | login/session event가 me cache를 갱신 → shell observer가 rerender → profile href/disabled navigation 갱신 순서입니다. |
| ownership/lifetime/cleanup | QueryClient가 current session의 유일한 browser server-state owner가 됩니다. |
| failure/rollback/retry | session expiry eviction과 query status가 shell에도 동일하게 반영됩니다. |
| 보장하는 것 | home, login, shell이 동일 session cache를 공유합니다. |
| 보장하지 않는 것 | browser navigation의 server authorization 자체는 보장하지 않습니다. |
| 후속 연결 | `1ebdce4cdf0a`가 session-expiry behavior를 direct client/observer test로 고정합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `0b1a6bcb4311` — `refactor(web): admin 조회와 mutation을 query cache로 전환`
- Thread 내 다음 관련 SHA: `1ebdce4cdf0a` — `test(web): query cache key·retry·invalidation 검증`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.10. `test(web): query cache key·retry·invalidation 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `1ebdce4cdf0a` |
| Importance | A |
| Tags | AUTH, TOURNAMENT, WEB |
| Source에서 확정된 역할 | key scoping, retry exclusion, mutation/session invalidation을 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/lib/query.test.ts`에서 fresh `QueryClient`와 `QueryObserver`를 만드는 setup을 확인합니다.
- query key tuple exact equality와 adjacent/prefix key가 invalidation되지 않는 case를 확인합니다.
- 401 retry count, private eviction/public preservation, fetching unauthorized query가 error/idle로 settle하는지 확인합니다.
- mutation invalidation table이 login/friend/tournament/admin 영향 범위를 검증하는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | screen migration은 완료됐지만 key typo, broad prefix invalidation, auth retry, session-expiry 중 active observer 정지 같은 회귀를 막는 직접 증거가 없었습니다. |
| 해결하려던 문제 | cache는 보이지 않는 global state이므로 exact identity와 transition을 real QueryClient로 검증해야 했습니다. |
| 핵심 결정 | isolated QueryClient에 public/private/active queries를 심고 mutation invalidation과 `expireSession`을 호출하며 observer 상태와 fetch count를 관찰했습니다. |
| 입력 → 상태 전이 → 출력 | test setup → cache seed/observer subscribe → production policy 실행 → exact cache entries/status/retry count assertion 순서입니다. |
| ownership/lifetime/cleanup | 각 test가 QueryClient/observer를 생성·정리하고 production functions를 직접 호출합니다. |
| failure/rollback/retry | 401은 retry하지 않고 private data만 제거되며 public keys는 남습니다. fetching unauthorized query도 pending에 고정되지 않습니다. |
| 보장하는 것 | key contract, exact invalidation, auth retry exclusion, session cache eviction의 high-value invariant를 증명합니다. |
| 보장하지 않는 것 | 실제 browser focus/network timing과 server response correctness는 증명하지 않습니다. |
| 후속 연결 | 이 test가 Thread의 canonical cache ownership을 최종 회귀로 보호합니다. |

#### A-level 불변식 종합

- **핵심 책임:** key scoping, retry exclusion, mutation/session invalidation을 검증합니다.
- **실패 영향:** cache는 보이지 않는 global state이므로 exact identity와 transition을 real QueryClient로 검증해야 했습니다.
- **결과 불변식:** key contract, exact invalidation, auth retry exclusion, session cache eviction의 high-value invariant를 증명합니다.
- **남은 제한:** 실제 browser focus/network timing과 server response correctness는 증명하지 않습니다.

#### Test 복원

| 항목 | 근거 |
| --- | --- |
| 검증 대상 production 불변식 | stable scoped keys, exact invalidation, 401 무재시도, private-only session eviction이 유지됩니다. |
| 재현한 실패/경계 | prefix/adjacent key 오염, active unauthorized fetch, public cache 과잉 제거입니다. |
| 테스트 기법 | real `QueryClient`/`QueryObserver`, seeded cache, controlled query function입니다. |
| 증명하는 것 | cache transition과 observer settle 상태를 library implementation 위에서 deterministic하게 증명합니다. |
| 증명하지 않는 것 | 실제 network/browser focus/refetch cadence와 server data correctness는 증명하지 않습니다. |
| 검증 분류 | cache consistency·auth regression evidence |

> 실행 상태: 이 workbook 작성 환경에서는 repository test command를 실행하지 않았습니다. 위 내용은 해당 SHA의 test source와 production path를 정적 조사해 복원한 것이며 pass 결과를 주장하지 않습니다.

#### 핵심 코드 근거

| 항목 | 값 |
| --- | --- |
| SHA | `1ebdce4cdf0a` |
| 파일 | `apps/web/src/lib/query.test.ts` |
| 함수/위치 | `session expiration tests` |
| 근거 요약 | private queries를 제거하고 `me`를 `null`로 만들면서 leaderboard/profile/tournament cache는 유지하며 active unauthorized observer가 pending에 남지 않는지 확인합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `0e0c9645ab2d` — `refactor(web): shell의 session 소비를 query cache로 통합`
- 이 SHA가 이 Thread의 마지막 고정 commit입니다.
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

## 6. 불변식 발전 기록

| 단계 | 관련 SHA | 학습 기록 |
| --- | --- | --- |
| key/retry vocabulary | `e000e3d6a460` | resource identity와 mutation 영향 범위가 코드로 정의됐습니다. |
| query/session transition | `d05a962d8829` | AbortSignal, stale time, private cache eviction이 추가됐습니다. |
| application owner | `80ec34fde74c` | browser 수명 동안 QueryClient 하나가 설치됐습니다. |
| screen migration | `931800f796e1` → `0e0c9645ab2d` | lobby부터 shell session까지 component effect ownership이 cache로 이동했습니다. |
| cache regression | `1ebdce4cdf0a` | exact keys, retry, invalidation, eviction, active observer settle이 검증됐습니다. |

## 7. Failure → Fix → Test 관계

| 이전 상태/가정 | 실패 또는 위험 | Fix 연결 | Test/후속 근거 | 관계 해설 |
| --- | --- | --- | --- | --- |
| component별 effect/local copy | 중복 fetch·stale identity·일관되지 않은 mutation | QueryClient/key/options + screen migration | `1ebdce4cdf0a` | component별 effect/local copy → 중복 fetch·stale identity·일관되지 않은 mutation → QueryClient/key/options + screen migration → `1ebdce4cdf0a` |
| 401도 일반 failure처럼 retry | 불필요한 auth traffic과 stale private data | retry predicate + `expireSession` | `1ebdce4cdf0a` | 401도 일반 failure처럼 retry → 불필요한 auth traffic과 stale private data → retry predicate + `expireSession` → `1ebdce4cdf0a` |
| fetching query를 동기 remove | current callback/observer가 불안정 상태 가능 | `d05a962d8829` deferred removal | active unauthorized observer test | fetching query를 동기 remove → current callback/observer가 불안정 상태 가능 → `d05a962d8829` deferred removal → active unauthorized observer test |
| WS/HTTP가 별도 lobby state | message/presence 불일치 | `931800f796e1` same cache update/invalidation | query cache tests는 key 범위, WS integration은 code inspection | WS/HTTP가 별도 lobby state → message/presence 불일치 → `931800f796e1` same cache update/invalidation → query cache tests는 key 범위, WS integration은 code inspection |

## 8. Ownership·state·lifetime 변화

| 대상 | 이전 owner/state | 이후 owner/state | 수명/cleanup |
| --- | --- | --- | --- |
| QueryClient | 없음/각 component | `QueryProvider`의 단일 instance | application mount 수명 |
| server resource data | route local state | query key별 cache entry | stale/cache lifecycle |
| request cancellation | 대부분 없음 | query context `AbortSignal` | observer/query lifetime |
| session transition | 각 component 독립 처리 | `expireSession` + provider event listener | browser session lifetime |
| mutation refresh | local array patch/reload | exact invalidation policy | mutation completion 후 |
| lobby push | 별도 local chat state | `queryKeys.lobby()` cache update | socket event lifetime |

## 9. Thread 최종 상태

마지막 SHA에서 browser server state는 root의 단일 QueryClient가 소유합니다. route handle과 resource scope가 stable key에 포함되고 query function은 AbortSignal을 전달합니다. login, mutation, WebSocket push, session expiry는 정의된 exact key를 set/invalidate/remove하며 401은 retry하지 않습니다. screen에는 selection, form input, notice 같은 presentation state만 남습니다.

### 최종 실행 흐름

1. root `QueryProvider`가 QueryClient를 한 번 생성하고 session-expired listener를 설치합니다.
2. screen이 endpoint별 query option을 사용하면 cache hit 또는 signal-aware fetch가 실행됩니다.
3. HTTP success가 key별 cache entry를 채우고 observer가 loading/error/empty/success UI를 갱신합니다.
4. mutation success는 정의된 exact keys만 invalidation해 필요한 query만 refetch합니다.
5. lobby WebSocket event는 같은 lobby cache를 dedupe/update하거나 exact invalidation합니다.
6. 401 event는 private keys를 제거하고 current user cache를 `null`로 전환하며 public cache는 보존합니다.

## 10. 학습 완료 점검

- [x] 모든 commit을 지정 SHA의 parent/diff와 비교했습니다.
- [x] 후속 HEAD 코드를 이전 SHA 설명에 역투영하지 않았습니다.
- [x] owner, lifetime, cleanup, failure branch와 non-guarantee를 기록했습니다.
- [x] fix는 이전 가정과 root cause에, test는 production path와 증명 범위에 연결했습니다.
- [x] A/B importance 깊이를 구분했고 source subject/tag/role을 유지했습니다.
- [x] 실행하지 않은 project test에 pass 결과를 만들지 않았습니다.
