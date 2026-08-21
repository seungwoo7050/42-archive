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

#### 핵심 코드 근거

| 항목 | 값 |
| --- | --- |
| SHA | `d05a962d8829` |
| 파일 | `apps/web/src/lib/query.ts` |
| 함수/위치 | `expireSession / query options` |
| 근거 요약 | [학습자 작성: 이 위치가 상태·소유권·실패 규칙을 어떻게 증명하는지 기록] |

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

#### Test 복원

| 항목 | 근거 |
| --- | --- |
| 검증 대상 production 불변식 | [학습자 작성: 검증 대상 production 불변식] |
| 재현한 실패/경계 | [학습자 작성: 재현한 실패/경계] |
| 테스트 기법 | [학습자 작성: 테스트 기법] |
| 증명하는 것 | [학습자 작성: 증명하는 것] |
| 증명하지 않는 것 | [학습자 작성: 증명하지 않는 것] |
| 검증 분류 | [학습자 작성: 검증 분류] |

#### 핵심 코드 근거

| 항목 | 값 |
| --- | --- |
| SHA | `1ebdce4cdf0a` |
| 파일 | `apps/web/src/lib/query.test.ts` |
| 함수/위치 | `session expiration tests` |
| 근거 요약 | [학습자 작성: 이 위치가 상태·소유권·실패 규칙을 어떻게 증명하는지 기록] |

#### 비교 기준

- Thread 내 직전 관련 SHA: `0e0c9645ab2d` — `refactor(web): shell의 session 소비를 query cache로 통합`
- 이 SHA가 이 Thread의 마지막 고정 commit입니다.
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

## 6. 불변식 발전 기록

| 단계 | 관련 SHA | 학습 기록 |
| --- | --- | --- |
| key/retry vocabulary | `e000e3d6a460` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| query/session transition | `d05a962d8829` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| application owner | `80ec34fde74c` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| screen migration | `931800f796e1` → `0e0c9645ab2d` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| cache regression | `1ebdce4cdf0a` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |

## 7. Failure → Fix → Test 관계

| 이전 상태/가정 | 실패 또는 위험 | Fix 연결 | Test/후속 근거 | 관계 해설 |
| --- | --- | --- | --- | --- |
| [학습자 작성: 이전 가정] | [학습자 작성: actual failure/risk] | QueryClient/key/options + screen migration | `1ebdce4cdf0a` | [학습자 작성: root cause와 corrected invariant를 한 문장으로 연결] |
| [학습자 작성: 이전 가정] | [학습자 작성: actual failure/risk] | retry predicate + `expireSession` | `1ebdce4cdf0a` | [학습자 작성: root cause와 corrected invariant를 한 문장으로 연결] |
| [학습자 작성: 이전 가정] | [학습자 작성: actual failure/risk] | `d05a962d8829` deferred removal | active unauthorized observer test | [학습자 작성: root cause와 corrected invariant를 한 문장으로 연결] |
| [학습자 작성: 이전 가정] | [학습자 작성: actual failure/risk] | `931800f796e1` same cache update/invalidation | query cache tests는 key 범위, WS integration은 code inspection | [학습자 작성: root cause와 corrected invariant를 한 문장으로 연결] |

## 8. Ownership·state·lifetime 변화

| 대상 | 이전 owner/state | 이후 owner/state | 수명/cleanup |
| --- | --- | --- | --- |
| QueryClient | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| server resource data | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| request cancellation | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| session transition | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| mutation refresh | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| lobby push | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |

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
