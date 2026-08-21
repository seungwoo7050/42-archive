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
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
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
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
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
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
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
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
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
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:1abda1299ad8:end -->


## Thread-level invariant evolution

다음 표에서 불변식이 도입·확장·교정·검증된 SHA를 구분합니다.

<!-- ANSWER:thread-06-invariants:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-06-invariants:end -->

## Failure → Fix → Test 관계

구현 추가를 독립 기능으로 나열하지 말고, 이전 가정과 실제 실패 위험, 수정된 결정, 회귀 증거를 연결합니다.

<!-- ANSWER:thread-06-failure-relations:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-06-failure-relations:end -->

## Ownership·state·responsibility 변화

자원과 상태를 누가 만들고, 보유하고, 이전하고, 정리하는지 커밋 순서에 따라 정리합니다.

<!-- ANSWER:thread-06-ownership:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-06-ownership:end -->

## 최종 Thread 상태

최종 HEAD를 과거 커밋에 투영하지 말고, 위 SHA 순서에서 도달한 보장을 요약합니다.

<!-- ANSWER:thread-06-final-state:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-06-final-state:end -->

## 최종 architecture / execution flow

실제 caller→boundary→state transition→cleanup 흐름을 순서대로 작성합니다.

<!-- ANSWER:thread-06-flow:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-06-flow:end -->

## 학습 완료 확인

<!-- ANSWER:thread-06-checks:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-06-checks:end -->

## 실행 증거 기록

<!-- ANSWER:thread-06-execution:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-06-execution:end -->
