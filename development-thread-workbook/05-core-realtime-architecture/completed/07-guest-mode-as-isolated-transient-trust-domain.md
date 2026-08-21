# 격리된 임시 신뢰 도메인으로서의 게스트 모드

원문 Development Thread: `Guest mode as an isolated transient trust domain`

## 1. Thread 목표

- guest를 약한 registered account가 아니라 별도의 signed identity, ticket, lease, capability, matchmaking, persistence domain으로 추적합니다.
- database 없이 발급·검증되는 guest cookie와 one-time ticket, IP/process capacity lease의 lifecycle을 복원합니다.
- registered data 조회와 write, mixed matchmaking, durable result를 차단하면서 제한된 reconnect recovery만 허용하는 경계를 확인합니다.

### Source에서 확정된 significance

> Guest mode is not implemented as a weaker registered account. It is a separate signed identity, capability, matchmaking, persistence, and resource domain. The sequence is significant because each integration point explicitly prevents transient public traffic from acquiring durable data or unbounded process state.

### 직접 연결되는 Critical Invariants

> Guest identities, matchmaking pools, capabilities, persistence, tickets, leases, and retained results remain isolated and resource-bounded.

> The durable browser session is carried only by an HttpOnly cookie; raw WebSocket tickets are short-lived, single-use, hashed at rest, bounded during authentication, and excluded from logs.

> Timers, schedulers, heartbeat handles, retry work, snapshot buffers, and database resources have explicit single-owner cleanup.

### 직접 연결되는 Major Engineering Difficulties

> Offering a public guest mode without allowing transient identities to cross into registered data, social features, ratings, or unbounded in-memory resources.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- guest token payload와 signature는 어떤 값으로 구성되며 address/version/expiry를 어디에서 검증합니까?
- ticket issuance limit과 live connection lease limit은 왜 별도이며 reconnect replacement에서 stale release를 어떻게 막습니까?
- demo mode가 registered session/database fallback을 하지 않는 branch는 어디입니까?
- guest route가 repository data를 조회한 뒤 필터링하는 것이 아니라 호출 자체를 피하는 근거는 무엇입니까?
- guest와 registered matchmaking pool 및 AI fallback source는 어떻게 분리됩니까?
- non-persisted result의 2분 보존은 어떤 map/timer ownership과 race guard를 사용합니까?
- IP window와 pending ticket map이 무한 증가하지 않도록 어떤 capacity와 prune path를 둡니까?

## 3. 완료 기준

- signed cookie → in-memory ticket → live lease의 trust chain과 각 TTL/capacity를 설명할 수 있습니다.
- guest가 접근 가능한 HTTP/WebSocket 기능과 registered-only 기능을 코드 branch로 구분할 수 있습니다.
- guest room이 registered user/NPC/persistence와 섞이지 않는 근거를 제시할 수 있습니다.
- transient result recovery가 durable history나 rating을 만들지 않는지 확인할 수 있습니다.
- fake-timer tests가 window/ticket/result cleanup과 reconnect intent를 어떻게 검증하는지 정리할 수 있습니다.

> 검토 방식: 지정 브랜치에 속한 exact SHA의 diff와 해당 시점 파일을 GitHub에서 확인했습니다. 로컬 실행 환경은 GitHub clone이 차단되어 테스트 명령은 실행하지 않았으며, 아래 테스트 결과 설명은 test implementation 검토에 한정합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `cacd4c22d705` | `feat(guest): signed guest session token 정의` | A | AUTH, PERSISTENCE | Creates tamper-evident, address-bound, expiring guest identity without database sessions. |
| 2 | `17a1dd501b1b` | `feat(guest): guest resource lease 수명주기 추가` | A | AUTH, PROTOCOL, REALTIME | Binds guest connection limits to lease identity and socket lifetime. |
| 3 | `a5c06c561e00` | `feat(guest): guest session과 WebSocket 인증 연결` | A | AUTH, REALTIME, PERSISTENCE | Connects signed cookies, one-time tickets, and bounded live leases. |
| 4 | `27ddc3fca2f1` | `feat(guest): guest 조회 범위와 lobby 격리` | A | AUTH, PERSISTENCE, TOURNAMENT | Avoids fetching registered social and historical data for demo traffic. |
| 5 | `77a7c205ccd0` | `feat(game): guest matchmaking과 room을 격리` | A | REALTIME, PERSISTENCE, RISK | Partitions matchmaking and AI fallback by identity kind. |
| 6 | `eaa4fdaba361` | `feat(game): guest 경기 결과 영속화 차단과 임시 보존` | A | SIMULATION, REALTIME | Skips durable finalization while retaining a short in-memory recovery result. |
| 7 | `2b274686e6d4` | `fix(guest): 체험 환경의 runtime 복구 제한` | A | AUTH, REALTIME, RISK | Bounds IP windows and pending ticket structures and validates runtime mode. |
| 8 | `06d2eb7a93cc` | `test(guest): 체험 환경의 복구 경계 검증` | A | AUTH, SIMULATION, REALTIME | Verifies bounded cleanup, fresh-ticket reconnect, and no duplicate match intent. |

## 5. Commit별 학습 기록

### 5.1. `feat(guest): signed guest session token 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `cacd4c22d705` |
| Importance | A |
| Tags | AUTH, PERSISTENCE |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Creates tamper-evident, address-bound, expiring guest identity without database sessions.
- Classification summary: Introduce a self-contained signed session representation for transient guests.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | public demo identity를 만들려면 DB account/session을 생성하거나 검증 없는 client-supplied identity를 신뢰해야 하는 상태였습니다. |
| 핵심 boundary/decision | `apps/api/src/guestAccess.ts`가 server-generated guest ID/handle/displayName과 `{v:1,user,ip,expiresAtMs}` payload를 Base64URL로 직렬화하고 HMAC-SHA-256으로 서명합니다. TTL은 2시간이며 secret은 최소 32 bytes입니다. |
| 상태 또는 ownership 변화 | server가 identity fields와 signature를 만들고 HttpOnly guest cookie가 signed payload를 운반합니다. database는 guest identity를 소유하지 않습니다. |
| 주요 failure/edge path | verify는 malformed, signature length/mismatch, wrong version, non-guest/non-user/non-active, nonfinite/expired, request IP mismatch를 거부하며 `timingSafeEqual`을 사용합니다. |
| 보장/비보장 | DB 없이 tamper-evident·address-bound·expiring guest identity를 제공합니다. live connection 수와 ticket issuance capacity는 아직 제한하지 않습니다. |
| 다음 관련 commit 연결 | `17a1dd...`가 guest WebSocket connection capacity를 lease identity와 socket lifetime에 결합합니다. |

비교 기준:
- 이 commit의 parent에서 동일 책임을 담당하던 코드를 비교했습니다.
- 다음 Thread 관련 SHA: `17a1dd501b1b` — `feat(guest): guest resource lease 수명주기 추가`

### 5.2. `feat(guest): guest resource lease 수명주기 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `17a1dd501b1b` |
| Importance | A |
| Tags | AUTH, PROTOCOL, REALTIME |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Binds guest connection limits to lease identity and socket lifetime.
- Classification summary: Add bounded live-connection leases with stale-release protection.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | signed identity만으로는 같은 IP나 process 전체에서 무제한 live guest sockets을 만들어 memory/socket 자원을 소모할 수 있었습니다. |
| 핵심 boundary/decision | GuestAccess가 default IP당 4, process 전체 200 live connection limit을 두고 `connections: Map<guestId,{ip,leaseId}>`에서 lease를 획득합니다. reconnect는 새 leaseId로 current record를 교체합니다. |
| 상태 또는 ownership 변화 | GuestAccess connection map이 live capacity를 소유하고 각 socket admission은 opaque lease handle을 보유합니다. |
| 주요 failure/edge path | release는 current record의 `leaseId`가 일치할 때만 delete해 old socket의 stale close가 replacement lease를 제거하지 못합니다. IP가 바뀌는 replacement도 target IP capacity를 다시 검사합니다. |
| 보장/비보장 | live guest sockets이 per-IP/process 상한을 따르고 replacement stale release가 current lease를 깨지 않습니다. signed cookie와 ticket/route integration은 다음 commit입니다. |
| 다음 관련 commit 연결 | `a5c06c...`이 signed guest cookie, one-time ticket, admission lease를 실제 HTTP/WebSocket boundary에 연결합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `cacd4c22d705` — `feat(guest): signed guest session token 정의`
- 다음 Thread 관련 SHA: `a5c06c561e00` — `feat(guest): guest session과 WebSocket 인증 연결`

### 5.3. `feat(guest): guest session과 WebSocket 인증 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `a5c06c561e00` |
| Importance | A |
| Tags | AUTH, REALTIME, PERSISTENCE |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Connects signed cookies, one-time tickets, and bounded live leases.
- Classification summary: Integrate demo guest identity with HTTP login/logout, in-memory one-time tickets, and WebSocket admission.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | guest token과 lease는 독립 primitives였고 route가 DB session fallback을 하거나 WebSocket admission이 registered path와 섞일 수 있었습니다. |
| 핵심 boundary/decision | demo `POST /auth/guest`가 secure HttpOnly SameSite=Lax `pp_guest`를 설정합니다. ws-ticket은 guest면 in-memory ticket을 발급하고 `/ws`는 guest ticket을 먼저 consume해 lease를 획득하며 close에서 정확히 한 번 release합니다. demo mode는 registered DB fallback을 하지 않습니다. |
| 상태 또는 ownership 변화 | GuestAccess가 signed identity·pending ticket·lease를, app route가 cookie/trust handoff를, GameHub가 admitted socket 이후를 소유합니다. |
| 주요 failure/edge path | lease acquisition failure는 socket auth close로 수렴하고 logout은 guest에서 DB session delete를 호출하지 않으며 두 auth cookies를 지웁니다. `requireRegistered`가 durable-only route의 공통 guard가 됩니다. |
| 보장/비보장 | signed cookie → in-memory one-time ticket → bounded live lease trust chain이 동작하고 demo guest는 DB session으로 승격되지 않습니다. data/read/match/persistence isolation은 뒤 commits입니다. |
| 다음 관련 commit 연결 | `27ddc3...`가 HTTP read surface에서 registered repository calls를 호출 전에 차단합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `17a1dd501b1b` — `feat(guest): guest resource lease 수명주기 추가`
- 다음 Thread 관련 SHA: `27ddc3fca2f1` — `feat(guest): guest 조회 범위와 lobby 격리`

### 5.4. `feat(guest): guest 조회 범위와 lobby 격리`

| 항목 | 값 |
| --- | --- |
| SHA | `27ddc3fca2f1` |
| Importance | A |
| Tags | AUTH, PERSISTENCE, TOURNAMENT |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Avoids fetching registered social and historical data for demo traffic.
- Classification summary: Partition public guest reads from registered profile, social, leaderboard, history, and tournament data.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 인증이 guest여도 일반 route가 repository를 조회한 뒤 response에서 일부 field만 숨기면 transient traffic이 registered data access와 DB load를 획득합니다. |
| 핵심 boundary/decision | `/me`는 guest identity를 허용하지만 profile, leaderboard, tournaments, social/history routes는 `requireRegistered`로 repository 호출 전에 거부합니다. demo/guest lobby는 repository match/chat/history를 조회하지 않고 제한된 empty/ephemeral view를 반환합니다. |
| 상태 또는 ownership 변화 | HTTP mode/identity guard가 capability boundary를 소유하고 repository는 registered data만 처리합니다. |
| 주요 failure/edge path | post-filter 방식이 아니라 call-before-data branch이므로 accidental leakage와 guest-triggered durable read workload를 함께 막습니다. |
| 보장/비보장 | guest가 registered social/history/leaderboard/tournament data를 조회하지 않습니다. realtime matchmaking과 AI/persistence isolation은 다음 commits입니다. |
| 다음 관련 commit 연결 | `77a7c2...`가 guest/registered pool과 AI fallback source를 분리합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `a5c06c561e00` — `feat(guest): guest session과 WebSocket 인증 연결`
- 다음 Thread 관련 SHA: `77a7c205ccd0` — `feat(game): guest matchmaking과 room을 격리`

### 5.5. `feat(game): guest matchmaking과 room을 격리`

| 항목 | 값 |
| --- | --- |
| SHA | `77a7c205ccd0` |
| Importance | A |
| Tags | REALTIME, PERSISTENCE, RISK |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Partitions matchmaking and AI fallback by identity kind.
- Classification summary: Prevent guest and registered players or persistent NPC sources from entering the same room.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | common queue/AI fallback이 identity kind를 고려하지 않으면 guest가 registered user/NPC와 매칭돼 durable ratings·identity가 room에 섞일 수 있었습니다. |
| 핵심 boundary/decision | matchmaking candidate selection은 guest kind가 일치하지 않으면 skip하고 room에 `guest` flag를 저장합니다. guest fallback은 repository NPC lookup 대신 process-local practice opponent를 사용합니다. |
| 상태 또는 ownership 변화 | Matchmaker/GameHub가 pool kind와 room trust domain을 소유합니다. DB NPC repository는 registered rooms에만 사용됩니다. |
| 주요 failure/edge path | mixed pair나 guest의 durable NPC lookup을 candidate 단계에서 차단해 room 생성 후 filtering에 의존하지 않습니다. |
| 보장/비보장 | guest room participant source와 registered queue가 격리됩니다. terminal result가 DB finalize를 우회하는 것은 다음 commit입니다. |
| 다음 관련 commit 연결 | `eaa4fd...`가 guest finalization을 non-persisted result와 2분 process-local retention으로 분리합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `27ddc3fca2f1` — `feat(guest): guest 조회 범위와 lobby 격리`
- 다음 Thread 관련 SHA: `eaa4fdaba361` — `feat(game): guest 경기 결과 영속화 차단과 임시 보존`

### 5.6. `feat(game): guest 경기 결과 영속화 차단과 임시 보존`

| 항목 | 값 |
| --- | --- |
| SHA | `eaa4fdaba361` |
| Importance | A |
| Tags | SIMULATION, REALTIME |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Skips durable finalization while retaining a short in-memory recovery result.
- Classification summary: Return a non-persisted guest result and retain it briefly for reconnect recovery without touching ratings/history.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | common terminal path가 `repo.finalizeMatch`를 호출하면 guest identity가 match/rating/history/tournament persistence에 들어갑니다. 반대로 즉시 폐기하면 disconnect 직후 결과를 못 받을 수 있습니다. |
| 핵심 boundary/decision | guest room은 repository finalize 전에 branch해 `{matchId:null,persisted:false,ratingDelta:0}`를 만들고 user별 recent result map에 2분 timer와 함께 보존합니다. |
| 상태 또는 ownership 변화 | GameHub process memory가 transient result와 cleanup timer를 소유합니다. 같은 guest의 새 result는 이전 timer를 clear하고 교체합니다. |
| 주요 failure/edge path | timer callback은 stored `expiresAtMs` identity를 다시 확인해 replacement entry를 stale timer가 삭제하지 못합니다. reconnect 시 active/recovered room이 없을 때만 retained result를 전송합니다. |
| 보장/비보장 | guest match는 DB match/rating/history/tournament를 만들지 않으며 2분 안에서 result recovery가 가능합니다. process restart/multi-instance를 넘는 보존은 의도적으로 없습니다. |
| 다음 관련 commit 연결 | `2b2746...`가 ticket/rate IP maps와 runtime mode를 fail-closed bounded state로 강화합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `77a7c205ccd0` — `feat(game): guest matchmaking과 room을 격리`
- 다음 Thread 관련 SHA: `2b274686e6d4` — `fix(guest): 체험 환경의 runtime 복구 제한`

### 5.7. `fix(guest): 체험 환경의 runtime 복구 제한`

| 항목 | 값 |
| --- | --- |
| SHA | `2b274686e6d4` |
| Importance | A |
| Tags | AUTH, REALTIME, RISK |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Bounds IP windows and pending ticket structures and validates runtime mode.
- Classification summary: Close unbounded in-memory growth and fail-open runtime-mode behavior in the public guest surface.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | TTL이 있어도 공격자가 계속 새 IP/window/ticket key를 만들면 cleanup 전에 maps가 무한 증가할 수 있고 unknown `APP_MODE`가 development로 해석될 수 있었습니다. |
| 핵심 boundary/decision | tracked IP windows는 10,000개, pending guest tickets는 IP당 4개, issuance는 IP당 분당 30회로 제한합니다. ticket map/reverse index/timer는 공통 delete path로 정리하고 runtime mode는 알려진 enum만 허용합니다. |
| 상태 또는 ownership 변화 | GuestAccess가 rate window·pending ticket·reverse index·timer capacity를 명시적으로 소유하며 app startup mode parser가 deployment capability를 fail-closed합니다. |
| 주요 failure/edge path | capacity 초과는 새 state 할당 전에 거부합니다. consume/expiry/replacement/close가 같은 cleanup 함수를 사용해 timer와 양방향 index를 동시에 제거합니다. unknown mode는 development route를 열지 않고 error입니다. |
| 보장/비보장 | guest public endpoint의 주요 process-local maps가 TTL뿐 아니라 hard cardinality/rate/pending limits를 갖습니다. distributed IP identity와 proxy correctness는 별도 trust 설정에 의존합니다. |
| 다음 관련 commit 연결 | `06d2eb...`가 fake timers와 browser recovery fixture로 bounded cleanup과 fresh-ticket/no-duplicate-intent를 검증합니다. |

#### Fix 재구성

| 단계 | 근거 |
| --- | --- |
| 이전 가정 | 각 entry에 TTL이 있으면 public guest runtime state가 충분히 bounded하다는 가정. |
| 실제 실패 또는 위험 | expiry 속도보다 빠르게 distinct IP/ticket keys를 만들면 map/timer 수가 계속 증가하고 mode typo가 dev capability를 노출합니다. |
| Root cause | 시간 제한은 있었지만 cardinality·issuance rate·per-IP pending 상한과 shared cleanup invariant가 없었습니다. |
| 수정된 invariant/decision | 10,000 tracked IP, 30/min issuance, 4 pending/IP, 공통 delete path, strict runtime mode validation. |
| 변경 코드 | `apps/api/src/guestAccess.ts` capacity/rate/ticket indexes 및 environment mode parser. |
| Regression evidence | `06d2eb...` fake-timer window/ticket cleanup과 limit tests가 보호합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `eaa4fdaba361` — `feat(game): guest 경기 결과 영속화 차단과 임시 보존`
- 다음 Thread 관련 SHA: `06d2eb7a93cc` — `test(guest): 체험 환경의 복구 경계 검증`

### 5.8. `test(guest): 체험 환경의 복구 경계 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `06d2eb7a93cc` |
| Importance | A |
| Tags | AUTH, SIMULATION, REALTIME |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Verifies bounded cleanup, fresh-ticket reconnect, and no duplicate match intent.
- Classification summary: Add deterministic guest runtime and browser recovery regressions for bounded transient state.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | guest domain은 격리·bounded하도록 구현됐지만 rate window, pending tickets, leases, retained result timers와 browser reconnect intent가 함께 회귀하지 않는 evidence가 부족했습니다. |
| 핵심 boundary/decision | fake timers와 guest/app/GameHub/browser fixtures가 issuance rate/pending cap/expiry cleanup, stale lease release, retained result expiry/replacement, fresh-ticket reconnect, reconnect 시 queue intent 미재전송을 검사합니다. |
| 상태 또는 ownership 변화 | test clock이 window/ticket/result timer를 deterministic하게 전진시키고 spies가 repository 호출 부재와 ticket/queue call counts를 관찰합니다. |
| 주요 failure/edge path | limit에 도달한 뒤 expiry/window 이동으로 capacity가 실제 반환되는지, old timer/lease가 new entry를 지우지 않는지, reconnect가 매 attempt fresh ticket을 쓰면서 duplicate match를 만들지 않는지 확인합니다. |
| 보장/비보장 | 검사한 process/browser 경계에서 isolation과 bounded cleanup을 증명합니다. source IP spoofing 방지, proxy configuration, multi-instance/global cap은 증명하지 않습니다. |
| 다음 관련 commit 연결 | Thread 최종 상태는 database-independent signed identity와 bounded transient capability domain입니다. |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | guest identity/tickets/leases/results는 registered data와 분리되고 모든 process-local state는 bounded·cleanup됩니다. |
| 재현하는 failure/boundary | rate window, pending per-IP cap, expiry, replacement stale release/timer, retained result, fresh-ticket reconnect/no queue replay. |
| test technique | Vitest fake timers, app/GameHub fixtures, repository spies, browser socket-client tests. |
| 통과하는 production path | guest cookie → in-memory ticket → lease → guest room → non-persisted result → reconnect/expiry cleanup. |
| 증명하는 것 | 검사한 single-process trust domain과 browser recovery behavior가 의도한 bounds를 지킵니다. |
| 증명하지 않는 것 | multi-instance aggregate capacity, real reverse proxy IP trust, internet adversarial load는 증명하지 않습니다. |
| test 성격 | Deterministic bounded-resource, isolation, and reconnect regression. |
| 후속 회귀 방지 설명 | TTL-only growth, stale release deletion, DB access, durable result, duplicate matchmaking intent가 생기면 실패해야 합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `2b274686e6d4` — `fix(guest): 체험 환경의 runtime 복구 제한`
- 이 Thread의 마지막 상태와 비교해 최종 보장을 정리했습니다.

## 6. Invariant ledger

Source에서 확정된 invariant를 commit 시점별로 연결했습니다. `해당 없음`은 해당 Thread 안에서 별도 fix/test가 없음을 뜻합니다.

| Invariant | 처음 도입/관찰한 SHA | 강화한 SHA | 부족함이 드러난 SHA | 복구한 fix | 고정한 regression test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| Guest identities, matchmaking pools, capabilities, persistence, tickets, leases, and retained results remain isolated and resource-bounded. | `cacd4c22d705` signed identity | `17a1dd501b1b` leases → `a5c06c561e00` trust handoff → `27ddc3fca2f1` reads → `77a7c205ccd0` matchmaking → `eaa4fdaba361` persistence → `2b274686e6d4` hard bounds | TTL-only structures와 unknown mode fail-open | `2b274686e6d4` | `06d2eb7a93cc` | `guestAccess.ts`, app guards, GameHub guest branches |
| The durable browser session is carried only by an HttpOnly cookie; raw WebSocket tickets are short-lived, single-use, hashed at rest, bounded during authentication, and excluded from logs. | Thread 02 contract 재사용 | `a5c06c561e00` guest in-memory ticket/lease, `2b274686e6d4` pending/rate bounds | guest public issuance의 별도 capacity 문제 | `2b274686e6d4` | `06d2eb7a93cc` | guest cookie/ticket/admission paths |
| Timers, schedulers, heartbeat handles, retry work, snapshot buffers, and database resources have explicit single-owner cleanup. | `17a1dd501b1b` lease handle | `eaa4fdaba361` result timer guard, `2b274686e6d4` shared ticket cleanup | stale close/timer가 replacement 삭제 위험 | leaseId/expiresAt identity guards | `06d2eb7a93cc` | GuestAccess maps/timers, recentGuestResults |

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| guest를 DB registered session의 약한 변형으로 취급 | signed DB-less identity + no DB fallback + registered-only guards | guest route/repository spy tests | 별도 trust/capability domain |
| guest/registered pool·NPC·result가 섞임 | pool kind/room guest flag + transient finalization branch | GameHub guest tests | mixed matchmaking/durable result 없음 |
| TTL만으로 public in-memory state를 제한 | `2b274...` hard cardinality/rate/pending caps + shared cleanup | `06d2eb...` fake-timer/limit tests | process-local state bounded |
| old socket/timer가 replacement resource를 삭제 | leaseId/expiresAt identity checks | stale release/timer regression | current owner만 cleanup 가능 |

## 8. Ownership / state / responsibility 변화

| 축 | 초기 SHA의 owner/state | 중간 전환 | Thread 최종 owner/state | 해제·cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| guest identity | 없음/DB account 가능성 | `cacd4c...` signed payload | GuestAccess + HttpOnly guest cookie | expiry/logout | `guestAccess.ts::issue/verify` |
| pending ticket | registered DB ticket | `a5c06...` in-memory guest ticket | GuestAccess bounded maps | consume/expiry/shared delete | guest ticket methods |
| live capacity | 없음 | `17a1dd...` lease map | GuestAccess leaseId record | current lease release/socket close | connection lease methods |
| read/match capability | common route/queue | `27ddc...` route guards, `77a7c...` pool kind | app guard + Matchmaker/GameHub | request/room lifetime | registered guards/guest flag |
| result | common DB finalize | `eaa4fd...` transient branch | GameHub recentGuestResults | 2분 timer/replacement | guest finalization path |

## 9. Thread 최종 상태

- 최종 authoritative owner: GuestAccess가 signed identity·pending tickets·live leases·rate windows를, app guards가 capabilities를, GameHub가 guest room/transient result를 소유합니다.
- 최종 상태/invariant: guest는 registered data·pool·NPC·ratings·history·tournament와 섞이지 않고 모든 transient state는 TTL과 hard capacity를 함께 가집니다.
- 남아 있는 의도적 제한 또는 비보장: single-process state라 restart/multi-instance 복구·global capacity를 제공하지 않으며 IP binding은 trusted proxy 설정에 의존합니다.
- 후속 Thread가 의존하는 contract: signed `pp_guest` cookie는 in-memory one-time ticket을 발급할 수 있고 admitted lease 범위 안에서 guest-only room과 non-persisted result만 사용합니다.
- 대표 코드 근거: `cacd4c22d705`/`17a1dd501b1b`/`2b274686e6d4 apps/api/src/guestAccess.ts`, `27ddc3fca2f1 app.ts`, `77a7c205ccd0`/`eaa4fdaba361 gameHub.ts`, `06d2eb7a93cc` tests

## 10. 최종 architecture 또는 execution flow 정리

```text
[POST /auth/guest: server-generated identity + HMAC cookie, IP/2h bound]
    ↓
[guest-only in-memory ws ticket: 30/min, 4 pending/IP, tracked-IP cap]
    ↓ one-time consume
[live lease: 4/IP, 200/process, leaseId stale-release guard]
    ↓
[registered data call-before-read guards + guest-only matchmaking/AI]
    ↓
[guest room simulation]
    ↓ terminal
[no DB finalize → persisted:false, matchId:null, ratingDelta:0]
    ↓ 2-minute process-local retained result → cleanup/reconnect
```

- demo mode는 registered session/database fallback을 하지 않습니다.
- hard caps는 TTL cleanup이 따라가지 못하는 공격에서도 state cardinality를 제한합니다.

## 11. 학습 완료 자가 점검

- [x] Commit map의 모든 SHA를 원문 순서대로 확인했습니다.
- [x] 각 commit의 subject, importance, tags를 변경하지 않았습니다.
- [x] S/A/B 깊이를 구분해 코드 근거를 남겼습니다.
- [x] final HEAD의 구현을 과거 SHA에 소급하지 않았습니다.
- [x] 핵심 상태 필드, caller/callee, ownership, failure branch, cleanup을 실제 코드로 확인했습니다.
- [x] Fix를 기존 가정 → failure/risk → root cause → decision → code → regression 순서로 연결했습니다.
- [x] Test commit에서 production invariant, failure, technique, path, 증명/비증명 범위를 구분했습니다.
- [x] Thread 최종 execution flow를 별도 프로젝트 재학습 없이 설명할 수 있습니다.
