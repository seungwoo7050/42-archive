# Development Thread 06: process smoke·browser end-to-end 검증

English title: **Process Smoke and Browser End-to-End Verification**

## Thread 목표

실행 중 API/WebSocket/browser를 잇는 검증 경계가 초기 bearer/query 방식에서 최종 cookie-ticket-v1 방식으로 교정되고, guest browser 복구까지 확장되는 과정을 복원한다.

## 핵심 질문

- unit/Fastify injection 테스트와 실제 process smoke는 어떤 서로 다른 실패를 잡는가?
- 초기 smoke가 기능상 유효해도 최종 인증 계약과 어긋나면 왜 수정되어야 하는가?
- 두 socket이 같은 room을 관찰한다는 조건을 어떻게 확인하는가?
- Canvas element 존재가 아니라 pixel alpha를 확인하는 이유는 무엇인가?
- guest AI fallback 시간과 reconnect를 UI만이 아니라 WebSocket frame·routed socket으로 어떻게 관찰하는가?

## 완료 기준

- 초기 HTTP/WS smoke의 당시 credential/protocol을 역사적으로 정확히 설명한다.
- `17e7...`가 테스트를 cookie/ticket/v1로 migration한 이유와 구체 변경을 설명한다.
- Playwright desktop/mobile config와 Canvas paint evidence의 범위를 설명한다.
- 두 BrowserContext, frame timestamp, `routeWebSocket`을 사용한 guest flow를 설명한다.
- 실제 실행하지 않은 결과를 문서에서 주장하지 않는다.

## Commit map

| 순서 | Commit | Subject | Importance | Tags |
| --- | --- | --- | --- | --- |
| 1 | `9a0562d395db` | `test(smoke): HTTP API 실행 검사 추가` | B | AUTH, OPERATIONS, TEST |
| 2 | `8a462f6f05b3` | `test(smoke): WebSocket 경기 실행 검사 추가` | B | AUTH, PROTOCOL, SIMULATION |
| 3 | `d755b8dae2c1` | `test(e2e): 한국어 내비게이션과 캔버스 흐름 구성` | B | PERSISTENCE, TOURNAMENT, WEB |
| 4 | `17e7dab21a55` | `test(smoke): cookie 기반 realtime protocol 검증` | B | AUTH, PROTOCOL, SIMULATION |
| 5 | `1abda1299ad8` | `test(e2e): 비회원 체험 브라우저 흐름 검증` | A | AUTH, REALTIME, WEB |

> Commit 순서·subject·importance·tags는 Phase 1 감사 후 동결된 정보입니다. Phase 2에서는 변경하지 않습니다.

## Commit `9a0562d395db` — test(smoke): HTTP API 실행 검사 추가

- Full SHA: `9a0562d395db8a2a9d37fa8496c33207913f5576`
- Subject: `test(smoke): HTTP API 실행 검사 추가`
- Importance: **B**
- Tags: AUTH, OPERATIONS, TEST
- Source-defined role: 빌드된 실행 시스템에 대해 개발 로그인과 주요 HTTP read path가 응답하는지 확인하는 초기 process smoke를 추가한다.

### 정확한 조사 대상

- `tests/smoke-api.mjs`의 base URL, request helper, 실패 시 status/body 보고 방식을 확인한다.
- dev-login 후 `/me`, `/lobby`, `/dashboard`와 public leaderboard를 호출하는 순서를 확인한다.
- 당시 인증이 bearer token을 사용했다는 historical state를 그대로 기록한다.
- 비-2xx가 즉시 process failure로 변환되는지 확인한다.

### 학습자 복원

<!-- ANSWER:9a0562d395db:begin -->
#### 역사적 복원

unit/injection 테스트만으로는 실제로 빌드된 API process가 listen하고 route·repository composition을 완료했는지 알 수 없다. 이 커밋은 외부 HTTP client로 실행 중 service를 두드리는 최소 smoke boundary를 만든다.

스크립트는 개발 로그인 응답의 bearer token을 받아 `/me`, `/lobby`, `/dashboard`에 전달하고 public leaderboard도 호출한다. 비-2xx면 path, status, response text를 포함해 실패한다.

중요한 역사적 한계는 이 smoke가 당시의 bearer credential transport를 전제로 했다는 점이다. cookie-only 전환 뒤에는 보안 계약과 어긋나며 `17e7dab21a55`에서 수정된다.

#### 이 커밋이 보장하는 것

- 실행 중 HTTP process의 기본 인증·조회 경로가 연결되었는지 빠르게 확인한다.
- 실패가 shell/CI에서 non-zero로 드러나는 실행 경계를 제공한다.

#### 이 커밋이 보장하지 않는 것

- 응답의 모든 schema·side effect를 깊게 검증하지 않는다.
- 초기 bearer 인증 방식은 최종 보안 invariant가 아니다.

#### 전후 관계

`17e7dab21a55`가 이 smoke를 cookie-only session과 no-token response로 교정한다.

#### 증거 성격

- running-process HTTP smoke
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
<!-- ANSWER:9a0562d395db:end -->

## Commit `8a462f6f05b3` — test(smoke): WebSocket 경기 실행 검사 추가

- Full SHA: `8a462f6f05b3612a8058cd8d4d474c9910d2b487`
- Subject: `test(smoke): WebSocket 경기 실행 검사 추가`
- Importance: **B**
- Tags: AUTH, PROTOCOL, SIMULATION
- Source-defined role: 두 실행 중 WebSocket client가 로그인·매칭·준비·playing snapshot·room chat까지 통과하는 초기 realtime process smoke를 추가한다.

### 정확한 조사 대상

- `tests/smoke-ws.mjs`와 Makefile `smoke` target을 확인한다.
- 두 사용자 로그인 후 query session token으로 socket을 여는 당시 방식을 기록한다.
- 양쪽 `queue.join`, 동일 room의 `queue.matched`, 양쪽 `game.ready`, playing snapshot 대기를 확인한다.
- match-scope chat 전송·수신과 10초 polling timeout, finally socket close를 확인한다.

### 학습자 복원

<!-- ANSWER:8a462f6f05b3:begin -->
#### 역사적 복원

HTTP smoke만으로는 WebSocket upgrade, hub registration, matchmaking, room scheduling, simulation snapshot 경로가 실제 process에서 연결되었는지 알 수 없다.

스크립트는 두 사용자를 로그인하고 두 socket을 열어 양쪽이 같은 room assignment를 받는지 확인한다. 이어 ready를 보내 playing snapshot과 room chat을 기다리고, 모든 대기에는 bounded timeout이 있으며 finally에서 socket을 닫는다.

당시에는 session token을 query에 넣고 unversioned shape를 사용했다. 기능 연결 증거로는 유효하지만 최종 auth/protocol 계약으로는 obsolete이며 `17e7dab21a55`가 교정한다.

#### 이 커밋이 보장하는 것

- 실행 중 API의 socket upgrade→matchmaking→simulation→chat 경로가 최소한 연결됨을 확인한다.
- 양쪽 client가 같은 room을 관찰하도록 요구한다.

#### 이 커밋이 보장하지 않는 것

- 결정적 physics, reconnect, persistence atomicity를 증명하지 않는다.
- 초기 query-token/unversioned protocol은 후속 보안·프로토콜 전환을 반영하지 않는다.

#### 전후 관계

`17e7dab21a55`가 이 시나리오를 one-time ticket과 version-1 event로 다시 작성한다.

#### 증거 성격

- running-process WebSocket smoke
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
<!-- ANSWER:8a462f6f05b3:end -->

## Commit `d755b8dae2c1` — test(e2e): 한국어 내비게이션과 캔버스 흐름 구성

- Full SHA: `d755b8dae2c1a73507bc3526a510f51159fd2759`
- Subject: `test(e2e): 한국어 내비게이션과 캔버스 흐름 구성`
- Importance: **B**
- Tags: PERSISTENCE, TOURNAMENT, WEB
- Source-defined role: Playwright 기반 desktop/mobile browser runner와 한국어 핵심 navigation·Canvas paint 검증을 도입한다.

### 정확한 조사 대상

- `playwright.config.ts`의 testDir, timeout, baseURL, trace/screenshot 정책을 확인한다.
- desktop Chromium viewport와 Pixel 7 mobile project를 확인한다.
- `tests/e2e/pong-pong.spec.ts`에서 개발 로그인 후 dashboard/leaderboard/tournament 이동을 확인한다.
- Canvas의 2D pixel alpha를 직접 읽어 실제 paint가 존재하는지 확인한다.
- package script와 Makefile `e2e` target을 확인한다.

### 학습자 복원

<!-- ANSWER:d755b8dae2c1:begin -->
#### 역사적 복원

process smoke는 API와 protocol 연결을 확인하지만 실제 browser rendering, accessible name, client navigation, Canvas drawing을 보지 않는다. 이 커밋은 Playwright를 repository-level E2E runner로 도입한다.

첫 시나리오는 한국어 heading/label/role을 사용해 로그인과 주요 화면 이동을 수행한다. 두 번째는 경기 화면의 canvas context에서 pixel data를 읽고 alpha가 0이 아닌 픽셀이 존재하는지 확인한다. 단순 element 존재가 아니라 renderer가 실제로 draw했다는 최소 증거다.

desktop과 mobile Chromium project, failure trace, failure screenshot, configurable base URL이 실행·진단 계약을 만든다.

#### 이 커밋이 보장하는 것

- 핵심 한국어 navigation과 Canvas paint가 실제 browser에서 연결됨을 검증한다.
- desktop/mobile viewport에서 같은 시나리오를 실행할 수 있는 runner를 제공한다.

#### 이 커밋이 보장하지 않는 것

- pixel 내용이 물리 상태와 정확히 일치하는지 비교하지 않는다.
- 다른 browser engine과 전체 접근성 규칙을 검증하지 않는다.

#### 전후 관계

후속 E2E가 API action, 사용자 격리, guest/reconnect 흐름을 추가하지만 이 category thread는 최초 browser execution boundary와 최종 guest high-risk flow를 대표로 연결한다.

#### 증거 성격

- browser end-to-end rendering/navigation evidence
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
<!-- ANSWER:d755b8dae2c1:end -->

## Commit `17e7dab21a55` — test(smoke): cookie 기반 realtime protocol 검증

- Full SHA: `17e7dab21a550d4bcd85fa1c4f93a57bf4381942`
- Subject: `test(smoke): cookie 기반 realtime protocol 검증`
- Importance: **B**
- Tags: AUTH, PROTOCOL, SIMULATION
- Source-defined role: 기존 process smoke와 E2E를 cookie-only session, one-time WebSocket ticket, version-1 realtime protocol에 맞게 교정한다.

### 정확한 조사 대상

- `tests/smoke-api.mjs`가 `Set-Cookie`를 추출하고 JSON token 노출을 명시적으로 거부하는지 확인한다.
- `/me`, `/lobby`, chat, dashboard, tournament 요청이 cookie를 사용하고 admin handle이 403인지 확인한다.
- `tests/smoke-ws.mjs`가 cookie로 `/auth/ws-ticket`을 호출한 뒤 `?ticket=...&v=1`로 연결하는지 확인한다.
- 모든 outbound command에 `v: 1`을 붙이고 nested snapshot state/sequence를 parse하는지 확인한다.
- presence, 동일 room match, ready, ball acceleration, pause/resume, match chat, AI fallback을 확인한다.

### 학습자 복원

<!-- ANSWER:17e7dab21a55:begin -->
#### 역사적 복원

초기 smoke는 실행 연결을 보여 주었지만 bearer/query session과 구형 event shape에 고정되어 최종 보안·프로토콜 계약을 오히려 우회했다. 이 커밋은 테스트 자체를 production boundary에 맞게 수정한다.

HTTP smoke는 dev-login의 `Set-Cookie`를 사용하고 response body에 `token` 필드가 있으면 실패한다. 모든 protected request는 cookie를 보내며, `admin` handle만으로 admin route를 호출하면 403을 요구한다.

WebSocket smoke는 각 cookie로 one-time ticket을 발급하고 version 1 handshake를 연다. command는 `v: 1`을 가지며 snapshot은 `snapshot.state`와 sequence 구조로 읽는다. 두 client의 presence, same-room matchmaking, readiness, 공 가속, pause/resume, match chat과 한 명 queue의 AI fallback까지 실제 process에서 관찰한다.

따라서 이 커밋은 기능 추가가 아니라 obsolete verification transport를 교정한다. 테스트가 제품 보안 경계를 우회하지 않아야 한다는 원칙을 보여 준다.

#### 이 커밋이 보장하는 것

- process smoke가 cookie-only/no-JSON-token/one-time-ticket/v1 protocol을 실제로 따른다.
- handle 기반 권한 획득이 실행 시스템에서도 거부된다.
- 핵심 realtime state와 simulation behavior를 end-to-end로 관찰한다.

#### 이 커밋이 보장하지 않는 것

- 모든 negative protocol·concurrency·DB rollback을 process 수준에서 반복하지 않는다.
- 실제 browser reconnect UX는 `1abda1299ad8` 범위다.

#### 전후 관계

`9a0562d395db`과 `8a462f6f05b3`의 obsolete credential/protocol 가정을 수정하고 final auth/realtime execution evidence로 정렬한다.

#### 증거 성격

- historical smoke-contract migration and running-system regression
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
<!-- ANSWER:17e7dab21a55:end -->

## Commit `1abda1299ad8` — test(e2e): 비회원 체험 브라우저 흐름 검증

- Full SHA: `1abda1299ad80e299e79297060531eee90112fb8`
- Subject: `test(e2e): 비회원 체험 브라우저 흐름 검증`
- Importance: **A**
- Tags: AUTH, REALTIME, WEB
- Source-defined role: demo mode에서 guest 진입·capability 제한·두 browser PvP·6초 AI fallback·fresh-ticket reconnect를 실제 browser lifecycle로 검증한다.

### 정확한 조사 대상

- `tests/e2e/guest-demo.spec.ts`의 demo-mode skip과 serial execution 설정을 확인한다.
- 입력 없이 guest로 진입하고 navigation이 lobby/play로 제한되는지 확인한다.
- 독립 BrowserContext 두 개를 생성해 두 guest가 같은 PvP room에 들어가 ready/playing까지 진행하는지 확인한다.
- WebSocket frame observer로 `queue.join`부터 `queue.matched`까지 5.5~10초 범위를 측정하는지 확인한다.
- `page.routeWebSocket`으로 진행 중 socket을 code 1012로 닫고 두 번째 연결·재개 상태를 확인한다.
- 각 context와 routed socket의 cleanup을 확인한다.

### 학습자 복원

<!-- ANSWER:1abda1299ad8:begin -->
#### 역사적 복원

unit guest 테스트는 서명, lease, capability를 검증하지만 browser가 실제 demo policy를 소비하고 fresh ticket reconnect를 수행하는지 보지 못한다. 이 suite는 `E2E_APP_MODE=demo`일 때만 serial로 실행된다.

첫 시나리오는 credential field 없이 guest session을 만들고 제한된 navigation만 보여 주는지 확인한다. 두 개의 독립 BrowserContext 시나리오는 cookie/session 격리를 유지한 두 guest가 같은 PvP room에 배정되고 양쪽 ready 뒤 playing이 되는지 검증한다.

AI fallback은 UI text만 기다리지 않고 WebSocket frame의 `queue.join`과 `queue.matched` timestamp 차이를 기록해 5.5초 이상 10초 미만을 요구한다. reconnect 시나리오는 `routeWebSocket`으로 진행 중 connection을 1012로 닫고, 재연결 대기 표시·두 번째 socket 생성·fresh ticket을 통한 동일 경기 복구·command 활성화를 확인한다.

각 browser context는 finally에서 닫혀 session/socket ownership을 정리한다. 테스트는 demo mode의 실제 API, browser policy, transport client, GameHub recovery를 한 흐름으로 연결한다.

#### 이 커밋이 보장하는 것

- guest가 credential 없이 진입하되 등록 사용자 기능을 보지 않는다.
- guest PvP pool, bounded AI fallback, fresh-ticket reconnect가 browser에서 작동한다.
- 서로 다른 browser context의 identity/cookie가 격리된다.

#### 이 커밋이 보장하지 않는 것

- 실제 외부 네트워크 단절 패턴 전체나 장시간 load를 재현하지 않는다.
- Chromium 외 browser engine을 검증하지 않는다.
- CI job wiring 자체는 category 09 범위다.

#### 전후 관계

process smoke보다 높은 사용자 흐름 증거이며, auth/reconnect/matchmaking invariant를 browser boundary에서 결합한다.

#### 증거 성격

- multi-browser end-to-end recovery regression
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
<!-- ANSWER:1abda1299ad8:end -->


## Thread-level invariant evolution

다음 표에서 불변식이 도입·확장·교정·검증된 SHA를 구분합니다.

<!-- ANSWER:thread-06-invariants:begin -->
### 복원 결과

| SHA | 변화 | 불변식 |
| --- | --- | --- |
| `9a0562d395db` | 초기 HTTP process 경계 | 빌드된 API의 로그인·주요 read path가 외부 client에서 실패를 드러낸다. |
| `8a462f6f05b3` | 초기 realtime process 경계 | 두 socket이 same-room match→ready→playing snapshot→chat을 통과한다. |
| `d755b8dae2c1` | browser 경계 | desktop/mobile Chromium에서 한국어 navigation과 실제 Canvas paint가 검증된다. |
| `17e7dab21a55` | 계약 교정 | process tests가 bearer/query token을 버리고 cookie→one-time ticket→v1 protocol을 따른다. |
| `1abda1299ad8` | guest high-risk E2E | 제한된 guest UI, 두 browser PvP, bounded fallback, fresh-ticket reconnect가 결합 검증된다. |

각 변화는 이전 커밋의 최종 상태를 다음 커밋이 단순 반복한 것이 아니라, 새 경계를 도입·확장·교정하거나 regression으로 보호한 시점을 나타냅니다.
<!-- ANSWER:thread-06-invariants:end -->

## Failure → Fix → Test 관계

구현 추가를 독립 기능으로 나열하지 말고, 이전 가정과 실제 실패 위험, 수정된 결정, 회귀 증거를 연결합니다.

<!-- ANSWER:thread-06-failure-relations:begin -->
### 복원 결과

| Failure / 이전 가정 | Fix / 결정 | Verification |
| --- | --- | --- |
| unit test는 통과하지만 production process composition/listen/build가 깨질 수 있음 | 외부 HTTP/WS smoke | `9a0562...` + `8a462...` |
| 초기 smoke가 obsolete bearer/query credential로 보안 경계를 우회 | `17e7dab21a55` cookie/ticket/v1 migration | 동일 smoke의 no-JSON-token·admin 403·nested snapshot assertions |
| DOM에 Canvas만 있고 실제 draw가 없음 | pixel alpha 관찰 | `d755b8dae2c1` browser test |
| guest reconnect가 새 matchmaking intent를 만들거나 같은 room을 잃음 | fresh-ticket connection recovery | `1abda1299ad8` routed socket close/second connection |
<!-- ANSWER:thread-06-failure-relations:end -->

## Ownership·state·responsibility 변화

자원과 상태를 누가 만들고, 보유하고, 이전하고, 정리하는지 커밋 순서에 따라 정리합니다.

<!-- ANSWER:thread-06-ownership:begin -->
### 복원 결과

| 대상 | 소유자 | 책임·수명 |
| --- | --- | --- |
| HTTP process smoke | `tests/smoke-api.mjs` | 실행 중 API origin·cookie jar·핵심 request 결과를 소유한다. |
| WebSocket process smoke | `tests/smoke-ws.mjs` | 두 client의 ticket/socket/event timeout과 finally cleanup을 소유한다. |
| Browser runner | Playwright config | project viewport, base URL, timeout, trace/screenshot lifecycle을 소유한다. |
| Browser identity isolation | separate BrowserContext | guest cookie/session/socket 수명을 각 context에 격리한다. |
| Reconnect fault | `page.routeWebSocket` | 진행 중 connection을 의도적으로 닫고 두 번째 연결을 관찰한다. |
| Fallback timing evidence | WebSocket frame observer | `queue.join`/`queue.matched` timestamp 차이를 소유한다. |
<!-- ANSWER:thread-06-ownership:end -->

## 최종 Thread 상태

최종 HEAD를 과거 커밋에 투영하지 말고, 위 SHA 순서에서 도달한 보장을 요약합니다.

<!-- ANSWER:thread-06-final-state:begin -->
### 최종 상태

- process smoke는 실제 빌드된 API의 HTTP와 versioned WebSocket 경로를 cookie/ticket 인증으로 통과한다.
- browser E2E는 한국어 navigation, Canvas paint, desktop/mobile execution boundary를 제공한다.
- guest demo E2E는 capability 제한, 두 context PvP, 약 6초 AI fallback, 진행 중 socket 단절 후 fresh-ticket 복구를 사용자 흐름으로 검증한다.
- 초기 bearer/query smoke는 역사적 단계로 보존되지만 최종 보장으로 오해하지 않는다.
<!-- ANSWER:thread-06-final-state:end -->

## 최종 architecture / execution flow

실제 caller→boundary→state transition→cleanup 흐름을 순서대로 작성합니다.

<!-- ANSWER:thread-06-flow:begin -->
### 최종 실행 흐름

1. 실행 중 API/Web process readiness 확보
2. 브라우저/스크립트가 dev 또는 guest login으로 cookie 획득
3. HTTP read/action을 cookie로 호출
4. cookie로 one-time WebSocket ticket 발급
5. version-1 socket에서 queue/ready/input/chat/pause/reconnect 수행
6. smoke는 protocol/state를, Playwright는 UI/rendering/context lifecycle을 관찰
7. timeout/finally에서 socket·context 정리
<!-- ANSWER:thread-06-flow:end -->

## 학습 완료 확인

<!-- ANSWER:thread-06-checks:begin -->
### 완료 확인

- [x] Fastify injection과 실제 process smoke의 failure surface를 비교할 수 있다.
- [x] 초기 smoke의 bearer/query 방식을 최종 invariant로 서술하면 왜 역사 왜곡인지 설명할 수 있다.
- [x] Canvas pixel alpha가 무엇을 증명하고 무엇을 증명하지 않는지 설명할 수 있다.
- [x] guest fallback의 5.5~10초 범위와 reconnect second-connection 관찰 방식을 설명할 수 있다.
- [x] CI job 실행 여부와 테스트 구현 존재를 구분할 수 있다.

체크는 repository code inspection을 통해 설명이 문서에 작성되었음을 뜻합니다. 실제 repository test suite 실행 완료를 뜻하지 않습니다.
<!-- ANSWER:thread-06-checks:end -->

## 실행 증거 기록

<!-- ANSWER:thread-06-execution:begin -->
- Historical inspection: 각 참조 SHA의 GitHub commit diff와 변경 파일을 개별 조회했습니다.
- Repository test execution: 실행하지 않았습니다. 로컬 환경에서 지정 branch의 전체 checkout을 materialize하지 못해 pnpm, PostgreSQL, Playwright, k6, Toxiproxy 명령 결과를 만들 수 없었습니다.
- Runtime claims: 기록하지 않았습니다. 위의 `증거 성격`은 test 구현과 production code path에 대한 정적·역사적 검사입니다.
- Artifact validation: scaffold/completed 대응, fixed metadata, answer completion, SHA uniqueness, Markdown fence, ZIP 구조는 로컬 검증 스크립트로 검사했습니다.
<!-- ANSWER:thread-06-execution:end -->
