# 쿠키 신원과 일회용 WebSocket 입장

원문 Development Thread: `Cookie identity and one-time WebSocket admission`

## 1. Thread 목표

- 여러 transport로 노출되던 durable session을 HttpOnly cookie 하나로 제한하는 보안 전환을 추적합니다.
- cookie 인증 HTTP 요청이 hash-only, short-lived, single-use ticket을 발급하고 socket handshake가 이를 원자적으로 소비하는 전체 trust chain을 복원합니다.
- 인증 지연 중 early message 보존과 unauthenticated buffering 상한, credential log redaction이 같은 경계를 어떻게 완성하는지 확인합니다.

### Source에서 확정된 significance

> The branch visibly moves away from reusable tokens in JavaScript and URLs. Authentication becomes a two-stage trust chain: the cookie authenticates an HTTP ticket request, and an atomic one-time ticket authenticates exactly one socket. Buffer limits and log redaction complete the security boundary rather than treating ticket issuance alone as sufficient.

### 직접 연결되는 Critical Invariants

> The durable browser session is carried only by an HttpOnly cookie; raw WebSocket tickets are short-lived, single-use, hashed at rest, bounded during authentication, and excluded from logs.

### 직접 연결되는 Major Engineering Difficulties

> Authenticating WebSockets without exposing durable session credentials while preserving early messages and bounding unauthenticated buffering.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 초기 session은 cookie, bearer, query 중 어디에서 수용되었고 왜 하나의 cookie 경계로 축소되었습니까?
- 브라우저 JavaScript가 durable credential을 보유하지 않도록 API client와 socket 연결 흐름이 어떻게 바뀝니까?
- raw ticket, digest, expiry, protocol version, active-user check의 소유 계층은 각각 어디입니까?
- ticket 소비는 동시 요청과 replay에서도 정확히 한 번만 성공하도록 어떤 SQL/저장소 연산을 사용합니까?
- 인증 전 message buffering의 message-size, count, total-byte 제한은 어디에서 검사되고 어떤 close path로 수렴합니까?
- URL serializer와 redaction path가 서로 다른 credential 노출면을 어떻게 막습니까?

## 3. 완료 기준

- development login부터 cookie 설정, ticket 발급, digest 저장, handshake 소비, `GameHub` 등록까지의 trust chain을 그릴 수 있습니다.
- durable session과 one-time ticket의 수명·노출·저장·재사용 가능성 차이를 설명할 수 있습니다.
- forged, expired, reused, suspended, wrong-version ticket 각각의 처리와 소비 여부를 코드와 테스트로 구분할 수 있습니다.
- pre-auth buffering 제한과 listener/closed-socket cleanup을 실제 branch 순서로 기록할 수 있습니다.
- 인증 정보가 request URL 및 structured log에 남지 않는 근거를 제시할 수 있습니다.

> 검토 방식: 지정 브랜치에 속한 exact SHA의 diff와 해당 시점 파일을 GitHub에서 확인했습니다. 로컬 실행 환경은 GitHub clone이 차단되어 테스트 명령은 실행하지 않았으며, 아래 테스트 결과 설명은 test implementation 검토에 한정합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `1779df300611` | `feat(api): 로그인과 로비 HTTP 경계 구현` | B | AUTH, PERSISTENCE, WEB | Establishes repository-backed sessions and the initial browser identity boundary. |
| 2 | `d0531791406b` | `fix(auth): cookie-only session과 환경별 route 적용` | S | AUTH, ARCH, RISK | Restricts durable credentials to the HttpOnly cookie and scopes development login by mode. |
| 3 | `353ca9a17415` | `fix(web): browser token 저장 제거` | A | AUTH, PROTOCOL, REALTIME | Removes JavaScript-managed durable credentials from the browser. |
| 4 | `d9bde7485719` | `feat(auth): WebSocket ticket 생성과 HTTP 계약 정의` | A | AUTH, PROTOCOL, REALTIME | Defines high-entropy raw tickets and hash-only storage semantics. |
| 5 | `c89a455fee06` | `feat(db): PostgreSQL WebSocket ticket 저장 추가` | A | AUTH, SIMULATION, REALTIME | Makes ticket consumption atomic and single-use in PostgreSQL. |
| 6 | `306d1946afb7` | `feat(auth): ticket 기반 WebSocket 인증 연결` | S | AUTH, REALTIME, RISK | Completes the cookie-to-ticket-to-socket trust handoff with bounded pre-auth buffering. |
| 7 | `b0ee833313c1` | `test(auth): WebSocket ticket 경계 검증` | A | AUTH, PROTOCOL, REALTIME | Exercises replay, expiry, suspension, protocol version, and concurrent consumption. |
| 8 | `ec9cb39babef` | `fix(log): 요청 비밀 정보 redaction 적용` | A | AUTH, REALTIME, OBSERVABILITY | Prevents tickets and durable credentials from becoming operational log data. |

## 5. Commit별 학습 기록

### 5.1. `feat(api): 로그인과 로비 HTTP 경계 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `1779df300611` |
| Importance | B |
| Tags | AUTH, PERSISTENCE, WEB |
| 학습 깊이 | Thread 흐름에서 맡는 구현 역할과 필요한 상태 변화를 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Establishes repository-backed sessions and the initial browser identity boundary.
- Classification summary: Establish the first HTTP boundary around repository-backed identity and lobby data.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | repository user/session 기능은 있었지만 Fastify route에서 login·current user·lobby를 일관되게 연결하는 HTTP boundary가 없었습니다. |
| 핵심 boundary/decision | `apps/api/src/app.ts`의 dev-login이 user를 생성/재사용하고 server session을 만든 뒤 `pp_session` HttpOnly·SameSite=Lax cookie를 설정합니다. 동시에 JSON에 raw `token`도 반환합니다. |
| 상태 또는 ownership 변화 | repository가 durable session을 저장하고 app의 `currentUser`가 credential 해석을 중앙화합니다. 당시에는 cookie, Bearer header, `session` query/raw URL query를 모두 허용합니다. |
| 주요 failure/edge path | durable token이 response body·JavaScript·Authorization header·URL에 재사용될 수 있어 XSS·history·proxy/log 노출면이 넓습니다. |
| 보장/비보장 | repository-backed identity와 protected `/me`/optional lobby identity는 동작합니다. cookie-only, environment route 제한, WebSocket 전용 credential은 아직 보장하지 않습니다. |
| 다음 관련 commit 연결 | `d05317...`이 durable credential source를 HttpOnly cookie 하나로 축소하고 dev-login을 mode별로 제한합니다. |

비교 기준:
- 이 commit의 parent에서 동일 책임을 담당하던 코드를 비교했습니다.
- 다음 Thread 관련 SHA: `d0531791406b` — `fix(auth): cookie-only session과 환경별 route 적용`

### 5.2. `fix(auth): cookie-only session과 환경별 route 적용`

| 항목 | 값 |
| --- | --- |
| SHA | `d0531791406b` |
| Importance | S |
| Tags | AUTH, ARCH, RISK |
| 학습 깊이 | Architecture/invariant 중심으로 직전 상태, 결정, 핵심 전이, ownership, failure, 후속 검증까지 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Restricts durable credentials to the HttpOnly cookie and scopes development login by mode.
- Classification summary: Replace reusable cross-transport session tokens with a cookie-only durable identity boundary.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | dev-login이 raw token을 반환하고 `currentUser`가 cookie·Bearer·query를 모두 신뢰해 동일 durable credential이 여러 transport에 노출됐습니다. |
| 핵심 boundary/decision | `AppMode`를 도입해 dev-login은 development/test에서만 등록하고, response token과 CORS authorization 허용을 제거하며 `readSessionToken`은 `pp_session` cookie만 읽습니다. production/demo cookie에는 `secure:true`를 적용합니다. |
| 상태 또는 ownership 변화 | durable browser credential의 전달 owner가 browser cookie jar가 되고 JavaScript/URL/header는 더 이상 인증 source가 아닙니다. |
| 주요 failure/edge path | 해당 SHA의 `readAppMode`는 알 수 없는 값을 development로 떨어뜨려 mode typo가 fail-open할 수 있습니다. 이 문제는 guest runtime fix에서 별도로 수정됩니다. |
| 보장/비보장 | durable session은 HttpOnly cookie로만 읽히고 production/demo에서 secure cookie를 사용합니다. WebSocket 입장 자체는 아직 cookie를 대체할 one-time ticket이 없습니다. |
| 다음 관련 commit 연결 | `353ca9...`가 browser 저장/Authorization 사용을 제거하고, `d9bde7...`부터 one-time ticket chain을 구축합니다. |

#### Architecture / invariant 복원

| 축 | 복원 결과 |
| --- | --- |
| 문제 | 동일한 장기 session token이 cookie, JS response, header, URL에서 재사용돼 한 곳의 노출이 모든 HTTP/WebSocket 접근권으로 이어집니다. |
| 실패 위험 | XSS, browser storage, access log, referrer, proxy가 durable account credential을 획득할 수 있습니다. |
| 핵심 결정 | durable credential은 HttpOnly cookie 하나에만 두고 개발 login route를 runtime mode로 제한합니다. |
| 구현 경로 | dev-login → server session → cookie; subsequent `currentUser` → `request.cookies.pp_session`만 조회. |
| 수명주기·상태 | cookie 수명은 server session과 결합하고 JavaScript는 값을 읽거나 전달하지 않습니다. |
| 실패 처리 | unknown `APP_MODE` fail-open은 남아 있으며 WebSocket은 별도 short-lived credential이 필요합니다. |
| 후속 검증 | `353ca9...` browser token 제거, `b0ee83...` boundary tests, `ec9cb3...` log redaction이 전체 경계를 완성합니다. |
| Thread 전체 의미 | 인증 architecture가 ‘어디서든 제출 가능한 token’에서 ‘HTTP cookie로 신원을 증명한 뒤 목적별 capability 발급’으로 바뀝니다. |

#### Fix 재구성

| 단계 | 근거 |
| --- | --- |
| 이전 가정 | 개발 편의상 반환 token과 Bearer/query 인증을 함께 허용해도 안전 경계를 유지할 수 있다는 가정. |
| 실제 실패 또는 위험 | durable credential이 browser JavaScript와 URL/log를 통과해 재사용 가능한 비밀이 됩니다. |
| Root cause | credential transport를 route마다 허용해 identity resolution의 신뢰 source가 하나가 아니었습니다. |
| 수정된 invariant/decision | cookie-only session, mode-scoped dev route, secure cookie, no token response/header CORS. |
| 변경 코드 | `apps/api/src/app.ts::readSessionToken/readAppMode`, dev-login response/cookie/CORS 변경. |
| Regression evidence | `b0ee833...`은 WebSocket에서 session cookie/Bearer를 직접 수용하지 않고 ticket만 허용하는 경계를 검사합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `1779df300611` — `feat(api): 로그인과 로비 HTTP 경계 구현`
- 다음 Thread 관련 SHA: `353ca9a17415` — `fix(web): browser token 저장 제거`

### 5.3. `fix(web): browser token 저장 제거`

| 항목 | 값 |
| --- | --- |
| SHA | `353ca9a17415` |
| Importance | A |
| Tags | AUTH, PROTOCOL, REALTIME |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Removes JavaScript-managed durable credentials from the browser.
- Classification summary: Make browser HTTP and realtime clients consume cookie identity without storing a reusable token.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 서버가 cookie-only로 바뀌어도 browser code가 localStorage token·Bearer header·token URL을 유지하면 노출면과 불일치가 남습니다. |
| 핵심 boundary/decision | `apps/web/src/lib/api.ts`와 pages에서 token helper/localStorage/Bearer를 제거하고 모든 fetch에 `credentials:'include'`를 사용합니다. realtime은 `requestWsTicket`을 비동기로 호출하고 pending issuance를 `AbortController`로 취소합니다. |
| 상태 또는 ownership 변화 | browser는 durable credential 값을 소유하지 않고 cookie jar에 위임합니다. API client는 response schema와 `ApiError`, auth-loss event를 소유합니다. |
| 주요 failure/edge path | page unmount/replacement 중 ticket response가 늦게 도착하면 stale socket을 열 수 있으므로 abort cleanup으로 차단합니다. 이 commit 시점에는 server ticket route가 뒤 commit에 있어 consumer가 먼저 준비된 상태입니다. |
| 보장/비보장 | JavaScript storage/header에 durable token이 남지 않고 credentialed cookie request를 사용합니다. ticket의 entropy·storage·single-use는 아직 보장하지 않습니다. |
| 다음 관련 commit 연결 | `d9bde7...`가 raw ticket 형식과 HTTP handshake 계약을 정의합니다. |

#### Fix 재구성

| 단계 | 근거 |
| --- | --- |
| 이전 가정 | 서버만 cookie-only로 바꾸면 browser에 남은 token code는 무해하다는 가정. |
| 실제 실패 또는 위험 | localStorage와 Authorization header가 XSS·extension·debug tooling에 durable secret을 계속 노출합니다. |
| Root cause | client auth state가 server cookie policy와 별개로 token 값을 소유했습니다. |
| 수정된 invariant/decision | browser auth는 cookie transport와 ephemeral ticket request만 사용합니다. |
| 변경 코드 | `apps/web/src/lib/api.ts`, lobby/play/admin call sites, ticket request cleanup. |
| Regression evidence | API client tests가 credentials inclusion, schema error, session expiry event, abort behavior를 고정합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `d0531791406b` — `fix(auth): cookie-only session과 환경별 route 적용`
- 다음 Thread 관련 SHA: `d9bde7485719` — `feat(auth): WebSocket ticket 생성과 HTTP 계약 정의`

### 5.4. `feat(auth): WebSocket ticket 생성과 HTTP 계약 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `d9bde7485719` |
| Importance | A |
| Tags | AUTH, PROTOCOL, REALTIME |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Defines high-entropy raw tickets and hash-only storage semantics.
- Classification summary: Define the raw one-time WebSocket ticket and strict HTTP/handshake shape.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | cookie-only session은 browser HTTP에는 적합하지만 WebSocket URL에 durable cookie 값을 직접 복제하지 않고 입장시킬 capability가 없었습니다. |
| 핵심 boundary/decision | `apps/api/src/wsTicket.ts`는 `randomBytes(32).toString('base64url')`로 43자 raw ticket을 만들고 SHA-256 digest만 저장하도록 helper를 제공합니다. TTL은 30초입니다. shared schema는 strict `{ticket, v:'1'}`를 정의합니다. |
| 상태 또는 ownership 변화 | raw ticket은 발급 response와 client가 짧게 소유하고 repository에는 digest만 전달됩니다. protocol version은 shared schema가 소유합니다. |
| 주요 failure/edge path | raw ticket 형식·TTL·version을 명시하지 않으면 약한 entropy, 장기 replay, handshake ambiguity가 생깁니다. 실제 atomic consumption은 아직 구현되지 않았습니다. |
| 보장/비보장 | high-entropy opaque raw value와 hash-only persistence contract, 30초 TTL, version-one query shape를 정의합니다. DB single-use와 socket integration은 다음 SHAs 범위입니다. |
| 다음 관련 commit 연결 | `c89a45...`가 digest table과 atomic consume를 PostgreSQL에 구현합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `353ca9a17415` — `fix(web): browser token 저장 제거`
- 다음 Thread 관련 SHA: `c89a455fee06` — `feat(db): PostgreSQL WebSocket ticket 저장 추가`

### 5.5. `feat(db): PostgreSQL WebSocket ticket 저장 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `c89a455fee06` |
| Importance | A |
| Tags | AUTH, SIMULATION, REALTIME |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Makes ticket consumption atomic and single-use in PostgreSQL.
- Classification summary: Persist only ticket digests and consume them with one destructive database operation.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | ticket 형식은 정의됐지만 process/DB race에서 두 handshake가 같은 ticket을 동시에 사용할 수 있는 storage semantics가 없었습니다. |
| 핵심 boundary/decision | `packages/db/migrations/002_ws_tickets.sql`에 digest/user/expiry를 저장하고 `PostgresRepository.consumeWsTicket`은 `DELETE ... RETURNING` CTE로 row를 먼저 제거한 뒤 active user와 expiry를 확인합니다. |
| 상태 또는 ownership 변화 | PostgreSQL unique row가 pending capability의 authoritative owner이고 소비 시 row 삭제가 ownership 이전의 선형화 지점입니다. |
| 주요 failure/edge path | expired 또는 suspended user ticket도 destructive consume 뒤 null을 반환하므로 반복 시도에 남지 않습니다. transaction race에서 한 DELETE만 row를 획득합니다. |
| 보장/비보장 | at-rest에는 64-char digest만 남고 동일 digest 소비는 최대 한 번 성공합니다. HTTP issue route와 pre-auth buffer는 아직 연결되지 않았습니다. |
| 다음 관련 commit 연결 | `306d19...`가 cookie-authenticated issue route와 `/ws` admission을 연결합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `d9bde7485719` — `feat(auth): WebSocket ticket 생성과 HTTP 계약 정의`
- 다음 Thread 관련 SHA: `306d1946afb7` — `feat(auth): ticket 기반 WebSocket 인증 연결`

### 5.6. `feat(auth): ticket 기반 WebSocket 인증 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `306d1946afb7` |
| Importance | S |
| Tags | AUTH, REALTIME, RISK |
| 학습 깊이 | Architecture/invariant 중심으로 직전 상태, 결정, 핵심 전이, ownership, failure, 후속 검증까지 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Completes the cookie-to-ticket-to-socket trust handoff with bounded pre-auth buffering.
- Classification summary: Integrate cookie-authenticated issuance, atomic ticket consumption, and bounded asynchronous WebSocket admission.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | ticket generator와 DB consume는 존재하지만 browser cookie에서 socket authority로 이어지는 complete route/handshake가 없었습니다. |
| 핵심 boundary/decision | `POST /auth/ws-ticket`은 cookie-derived active user만 허용해 raw ticket을 한 번 반환하고 digest/30초를 저장합니다. `/ws`는 version을 먼저 검증한 후 ticket을 consume하고 성공 시 buffered payload와 함께 `GameHub.connect`로 handoff합니다. |
| 상태 또는 ownership 변화 | HTTP app이 issue/admission boundary를, DB가 pending digest를, GameHub가 authenticated socket 이후 lifecycle을 소유합니다. pre-auth listener와 buffers는 handoff 또는 close 전까지 app이 소유합니다. |
| 주요 failure/edge path | 인증 중 message는 item 8KiB, count 16, total 32KiB로 제한합니다. malformed/version/ticket/size/DB error는 idempotent `closeAuthentication`으로 listener 제거와 close code 1008/1009/1011에 수렴합니다. closed socket에는 handoff하지 않습니다. |
| 보장/비보장 | durable cookie → short-lived raw ticket → hash-only atomic consume → exactly one authenticated socket handoff가 완성됩니다. cross-process ticket issuance capacity와 operational logging은 별도 문제입니다. |
| 다음 관련 commit 연결 | `b0ee83...`이 replay·expiry·suspension·wrong version·concurrency·buffer limits를 실제 integration fixture로 검증합니다. |

#### Architecture / invariant 복원

| 축 | 복원 결과 |
| --- | --- |
| 문제 | WebSocket upgrade 동안 DB 인증이 비동기인데 client는 즉시 message를 보낼 수 있어 credential handoff와 memory bounds를 동시에 해결해야 합니다. |
| 실패 위험 | ticket replay, wrong-version consumption, early-message loss, unauthenticated memory growth, close/handoff race. |
| 핵심 결정 | version-first validation, destructive consume, bounded message buffer, 단일 idempotent close/handoff owner를 둡니다. |
| 구현 경로 | cookie-auth HTTP ticket issue → raw response/digest insert → `/ws?v=1&ticket=...` → query validation → digest consume → active user → `GameHub.connect(pendingPayloads)`. |
| 수명주기·상태 | pending raw value는 client가 보유하고 DB row는 consume 시 삭제되며 pre-auth listener/buffer는 성공 handoff 또는 close에서 한 번 정리됩니다. |
| 실패 처리 | 8KiB/16/32KiB 상한, unsupported version before consume, DB failure 1011, invalid auth 1008, oversize 1009. |
| 후속 검증 | `b0ee833...` live Fastify/WebSocket와 memory/PostgreSQL concurrent consumption tests. |
| Thread 전체 의미 | 장기 account identity와 socket-specific admission capability가 분리되어 한 ticket 노출의 피해 범위가 한 socket/30초로 제한됩니다. |

비교 기준:
- 직전 Thread 관련 SHA: `c89a455fee06` — `feat(db): PostgreSQL WebSocket ticket 저장 추가`
- 다음 Thread 관련 SHA: `b0ee833313c1` — `test(auth): WebSocket ticket 경계 검증`

### 5.7. `test(auth): WebSocket ticket 경계 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `b0ee833313c1` |
| Importance | A |
| Tags | AUTH, PROTOCOL, REALTIME |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Exercises replay, expiry, suspension, protocol version, and concurrent consumption.
- Classification summary: Add deterministic integration and repository tests for the complete ticket boundary.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | trust chain은 구현됐지만 replay·concurrent consume·pre-auth pressure·version order가 회귀하지 않는다는 자동 증거가 없었습니다. |
| 핵심 boundary/decision | live Fastify/WebSocket fixture와 memory/PostgreSQL repository tests가 cookie-only issue, hash-at-rest, valid-once, forged/expired/suspended, unsupported version non-consumption, direct session rejection, pre-auth limits, concurrent one-winner를 검사합니다. |
| 상태 또는 ownership 변화 | test의 delayed consume gate가 인증 지연을 제어하고 fake/real socket payload가 buffer path를 재현합니다. |
| 주요 failure/edge path | 같은 ticket을 동시 consume해 정확히 한 non-null 결과만 허용하며, wrong version은 ticket을 쓰지 않아 뒤의 valid version이 소비할 수 있는지 구분합니다. |
| 보장/비보장 | ticket trust boundary의 핵심 failure와 memory limits가 deterministic regression으로 보호됩니다. 인터넷 proxy·multi-region latency·장기 capacity는 증명하지 않습니다. |
| 다음 관련 commit 연결 | `ec9cb3...`가 성공적인 security control이 로그를 통해 다시 비밀을 노출하지 않도록 redaction을 추가합니다. |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | raw ticket은 hash-only, 30초, one-time이며 version-one admission에서만 exactly one socket에 권한을 넘깁니다. |
| 재현하는 failure/boundary | replay, forged/expired/suspended, wrong version, direct cookie/Bearer WS, message size/count/total, concurrent consume. |
| test technique | Fastify/WebSocket integration, delayed authentication gate, memory and PostgreSQL concurrent repository tests. |
| 통과하는 production path | login cookie → issue → DB digest → WS handshake/pre-auth messages → consume → GameHub handoff 또는 close. |
| 증명하는 것 | 검사한 storage와 process 경로에서 single-use 및 bounded admission이 유지됩니다. |
| 증명하지 않는 것 | cross-region deployment, production proxy logs, sustained load capacity는 증명하지 않습니다. |
| test 성격 | Deterministic boundary integration plus PostgreSQL concurrency regression. |
| 후속 회귀 방지 설명 | credential source를 다시 늘리거나, consume order/limits/listener cleanup을 약화하면 테스트가 실패해야 합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `306d1946afb7` — `feat(auth): ticket 기반 WebSocket 인증 연결`
- 다음 Thread 관련 SHA: `ec9cb39babef` — `fix(log): 요청 비밀 정보 redaction 적용`

### 5.8. `fix(log): 요청 비밀 정보 redaction 적용`

| 항목 | 값 |
| --- | --- |
| SHA | `ec9cb39babef` |
| Importance | A |
| Tags | AUTH, REALTIME, OBSERVABILITY |
| 학습 깊이 | 주요 subsystem·boundary·failure path의 코드와 설계 판단을 복원했습니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Prevents tickets and durable credentials from becoming operational log data.
- Classification summary: Redact credential-bearing headers, query objects, ticket fields, and raw URL query strings.

#### 해당 SHA에서 확인한 실제 코드

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | ticket 자체는 짧고 one-time이어도 Fastify/Pino request serializer와 structured fields에 URL query·cookie·Authorization·ticket이 기록될 수 있었습니다. |
| 핵심 boundary/decision | `apps/api/src/requestLogging.ts::createLoggerOptions`가 cookie, authorization, query variants, `ticket`, `*.ticket`을 redact하고 request serializer는 URL의 `?` 이후를 제거합니다. |
| 상태 또는 ownership 변화 | logger configuration이 operational serialization boundary를 소유하며 application route가 개별적으로 비밀을 지울 필요를 줄입니다. |
| 주요 failure/edge path | structured query field와 raw URL은 별도 노출면이므로 둘 다 차단합니다. 임의 application message에 비밀을 복사하면 이 path 밖일 수 있습니다. |
| 보장/비보장 | 표준 request log와 지정 structured paths에서 durable cookie와 raw ticket이 제외됩니다. 모든 제3자 로그·custom string까지 자동 sanitize하지는 않습니다. |
| 다음 관련 commit 연결 | Thread 최종 trust chain은 cookie-only durable identity, hash-only one-time ticket, bounded admission, request-log redaction입니다. |

#### Fix 재구성

| 단계 | 근거 |
| --- | --- |
| 이전 가정 | ticket이 short-lived/single-use이면 URL 또는 request log에 남아도 위험이 제한적이라는 가정. |
| 실제 실패 또는 위험 | valid window 내 replay와 credential telemetry 보존, durable cookie/header 노출이 가능합니다. |
| Root cause | security boundary가 storage/handshake만 다루고 observability serializer를 포함하지 않았습니다. |
| 수정된 invariant/decision | field redaction과 raw URL query stripping을 logger의 공통 serializer에서 수행합니다. |
| 변경 코드 | `apps/api/src/requestLogging.ts::createLoggerOptions`, Fastify logger wiring. |
| Regression evidence | request logging tests가 cookie/header/query/ticket과 query string이 serialized output에 없는지 확인해야 합니다. |

비교 기준:
- 직전 Thread 관련 SHA: `b0ee833313c1` — `test(auth): WebSocket ticket 경계 검증`
- 이 Thread의 마지막 상태와 비교해 최종 보장을 정리했습니다.

## 6. Invariant ledger

Source에서 확정된 invariant를 commit 시점별로 연결했습니다. `해당 없음`은 해당 Thread 안에서 별도 fix/test가 없음을 뜻합니다.

| Invariant | 처음 도입/관찰한 SHA | 강화한 SHA | 부족함이 드러난 SHA | 복구한 fix | 고정한 regression test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| The durable browser session is carried only by an HttpOnly cookie; raw WebSocket tickets are short-lived, single-use, hashed at rest, bounded during authentication, and excluded from logs. | `1779df300611` cookie/session | `d0531791406b` cookie-only → `d9bde7485719` ticket → `c89a455fee06` atomic storage → `306d1946afb7` admission → `ec9cb39babef` logging | `1779df300611` token/header/query 노출 | `d0531791406b`, `353ca9a17415`, `ec9cb39babef` | `b0ee833313c1` | `app.ts::readSessionToken,/auth/ws-ticket,/ws`, `postgresRepository::consumeWsTicket`, `requestLogging.ts` |

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| durable session을 cookie·Bearer·query와 JSON token으로 재사용 | `d053179...` cookie-only + `353ca9...` browser token 제거 | API/auth tests | JavaScript와 URL에 durable secret 없음 |
| WebSocket이 account credential을 직접 사용 | `d9bde7...` raw/hash contract → `c89a45...` atomic consume → `306d19...` handoff | `b0ee83...` replay/concurrency integration | 30초 one-time capability만 socket에 사용 |
| 비동기 인증 중 unbounded early messages | `306d19...` 8KiB/16/32KiB 및 idempotent close | delayed consume fixture | unauthenticated memory work bounded |
| 비밀이 request log로 재노출 | `ec9cb3...` redaction + URL strip | logging regression inspection | 표준 operational log에 credential 제외 |

## 8. Ownership / state / responsibility 변화

| 축 | 초기 SHA의 owner/state | 중간 전환 | Thread 최종 owner/state | 해제·cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| durable browser session | `1779df...` cookie + returned token | `d053179...` cookie-only, `353ca9...` JS 제거 | HttpOnly `pp_session` cookie/server repository | logout/expiry가 session과 cookie 정리 | `app.ts::readSessionToken`, web `apiFetch` |
| pending WS capability | 없음 | `d9bde7...` raw/hash/TTL | PostgreSQL digest row | `DELETE ... RETURNING` consume 또는 expiry cleanup | `002_ws_tickets.sql`, `consumeWsTicket` |
| pre-auth messages | 직접 handoff 또는 미정 | `306d19...` bounded listener/buffer | Fastify `/ws` admission | success handoff/`closeAuthentication` | `apps/api/src/app.ts` |
| credential logging | default request serializer | `ec9cb3...` centralized redaction | Pino/Fastify logger options | serializer lifetime follows app | `requestLogging.ts` |

## 9. Thread 최종 상태

- 최종 authoritative owner: repository-backed session은 HttpOnly cookie가, pending socket capability는 digest store가, authenticated connection은 GameHub가 각각 소유합니다.
- 최종 상태/invariant: durable credential은 JavaScript·Bearer·query로 수용되지 않고 raw ticket은 30초·single-use·hash-only·bounded·log-excluded입니다.
- 남아 있는 의도적 제한 또는 비보장: DB/process outage, multi-region capability storage, custom application log 문자열까지 자동으로 해결하지 않습니다.
- 후속 Thread가 의존하는 contract: HTTP cookie로 `/auth/ws-ticket`을 호출한 active user만 version-one `/ws` admission을 한 번 획득할 수 있습니다.
- 대표 코드 근거: `d0531791406b apps/api/src/app.ts::readSessionToken`, `c89a455fee06 PostgresRepository.consumeWsTicket`, `306d1946afb7 /auth/ws-ticket,/ws`, `b0ee833313c1 ws-ticket.test.ts`, `ec9cb39babef requestLogging.ts`

## 10. 최종 architecture 또는 execution flow 정리

```text
[HttpOnly pp_session cookie]
    ↓  d0531791406b currentUser
[POST /auth/ws-ticket: raw 32-byte Base64URL 생성]
    ↓  d9bde7485719 / c89a455fee06
[SHA-256 digest + expiry 저장]
    ↓  306d1946afb7 /ws?v=1&ticket=raw
[version 검증 → DELETE RETURNING atomic consume → active user 확인]
    ↓  bounded pre-auth buffer handoff
[GameHub.connect authenticated socket]
    ↓
[ec9cb39babef request URL/fields redaction]
```

- unsupported protocol version은 ticket consume 전에 거부돼 valid version 재시도를 막지 않습니다.
- invalid·expired·suspended ticket은 consume 후 재사용할 수 없습니다.

## 11. 학습 완료 자가 점검

- [x] Commit map의 모든 SHA를 원문 순서대로 확인했습니다.
- [x] 각 commit의 subject, importance, tags를 변경하지 않았습니다.
- [x] S/A/B 깊이를 구분해 코드 근거를 남겼습니다.
- [x] final HEAD의 구현을 과거 SHA에 소급하지 않았습니다.
- [x] 핵심 상태 필드, caller/callee, ownership, failure branch, cleanup을 실제 코드로 확인했습니다.
- [x] Fix를 기존 가정 → failure/risk → root cause → decision → code → regression 순서로 연결했습니다.
- [x] Test commit에서 production invariant, failure, technique, path, 증명/비증명 범위를 구분했습니다.
- [x] Thread 최종 execution flow를 별도 프로젝트 재학습 없이 설명할 수 있습니다.
