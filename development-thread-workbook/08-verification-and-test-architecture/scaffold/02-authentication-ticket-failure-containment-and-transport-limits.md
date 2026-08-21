# Development Thread 02: 인증·ticket·실패 격리·transport 상한 검증

English title: **Authentication, Ticket, Failure Containment, and Transport Limits**

## Thread 목표

지속 session을 cookie로 제한하고 one-time ticket으로 realtime 권한을 이전하며, 오류 정보와 미인증·oversized 입력의 자원 사용을 제한하는 검증 구조를 복원한다.

## 핵심 질문

- 왜 HttpOnly cookie를 WebSocket URL credential로 재사용하지 않고 ticket handoff를 두는가?
- ticket single-use는 application check가 아니라 어떤 저장소 원자성으로 증명되는가?
- 비동기 인증 중 메시지 보존과 memory bound를 어떻게 동시에 만족하는가?
- client-caused parse 오류와 repository/internal 오류의 외부 정보 수준은 왜 달라야 하는가?
- application buffer limit만으로 인증 후 oversized frame을 막지 못한 이유는 무엇인가?

## 완료 기준

- cookie→HTTP ticket issuance→hash storage→atomic consume→GameHub ownership transfer를 설명한다.
- pre-auth message/개수/누적 상한과 transport `maxPayload`의 계층 차이를 설명한다.
- replay·expiry·suspension·unsupported version·동시 consume의 상태 결과를 재구성한다.
- internal error redaction과 deterministic failure injection을 연결한다.
- S/A/B 중요도에 맞춰 credential ownership과 cleanup을 깊이 구분한다.

## Commit map

| 순서 | Commit | Subject | Importance | Tags |
| --- | --- | --- | --- | --- |
| 1 | `d0531791406b` | `fix(auth): cookie-only session과 환경별 route 적용` | S | AUTH, ARCH, RISK |
| 2 | `401cf13d9d17` | `test(auth): cookie session 경계 검증` | A | AUTH, RISK, TEST |
| 3 | `306d1946afb7` | `feat(auth): ticket 기반 WebSocket 인증 연결` | S | AUTH, REALTIME, RISK |
| 4 | `b0ee833313c1` | `test(auth): WebSocket ticket 경계 검증` | A | AUTH, PROTOCOL, REALTIME |
| 5 | `fe62962d65d9` | `fix(api): 내부 WebSocket 오류 숨김` | A | PROTOCOL, REALTIME, PERSISTENCE |
| 6 | `20933b1393f3` | `test(api): WebSocket repository error redaction 검증` | B | PROTOCOL, REALTIME, PERSISTENCE |
| 7 | `8ea18a1b92db` | `fix(realtime): WebSocket transport payload 상한 설정` | A | AUTH, REALTIME, RISK |
| 8 | `1afec49052b6` | `test(realtime): oversized WebSocket frame 거부 검증` | B | AUTH, REALTIME, TEST |

> Commit 순서·subject·importance·tags는 Phase 1 감사 후 동결된 정보입니다. Phase 2에서는 변경하지 않습니다.

## Commit `d0531791406b` — fix(auth): cookie-only session과 환경별 route 적용

- Full SHA: `d0531791406bd9809f15363c8542b1583cf7f564`
- Subject: `fix(auth): cookie-only session과 환경별 route 적용`
- Importance: **S**
- Tags: AUTH, ARCH, RISK
- Source-defined role: 내구성 세션 credential을 HttpOnly cookie 하나로 제한하고 개발 전용 인증 기능을 실행 모드로 격리한다.

### 정확한 조사 대상

- `apps/api/src/app.ts`에서 세션 읽기가 `pp_session` cookie만 허용하도록 바뀐 지점을 확인한다.
- Authorization bearer와 URL query session fallback 제거, CORS 허용 header 축소를 함께 추적한다.
- development/test에서만 dev-login route가 등록되고 production/demo에서는 노출되지 않는지 확인한다.
- cookie의 HttpOnly, SameSite, Secure, Path, expiry 속성이 실행 모드별로 어떻게 설정되는지 확인한다.
- 이 변경 전 브라우저·smoke 코드가 토큰을 직접 보관하던 상태와 비교한다.

### 학습자 복원

<!-- ANSWER:d0531791406b:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:d0531791406b:end -->

## Commit `401cf13d9d17` — test(auth): cookie session 경계 검증

- Full SHA: `401cf13d9d17e5a6095e311f3564dba6d4ca0c46`
- Subject: `test(auth): cookie session 경계 검증`
- Importance: **A**
- Tags: AUTH, RISK, TEST
- Source-defined role: cookie-only 전환의 허용·금지 credential transport와 실행 모드 격리를 Fastify 경계에서 검증한다.

### 정확한 조사 대상

- Fastify injection으로 dev-login 응답의 `Set-Cookie` 속성을 검사한다.
- cookie 없는 bearer header와 query token이 인증되지 않는지 확인한다.
- `admin` handle만으로 role을 획득하지 못하는지 확인한다.
- production/demo에서 dev-login route가 404인지, 공통 오류 envelope가 유지되는지 확인한다.

### 학습자 복원

<!-- ANSWER:401cf13d9d17:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:401cf13d9d17:end -->

## Commit `306d1946afb7` — feat(auth): ticket 기반 WebSocket 인증 연결

- Full SHA: `306d1946afb76665fa42f5443cfd56d10516d83a`
- Subject: `feat(auth): ticket 기반 WebSocket 인증 연결`
- Importance: **S**
- Tags: AUTH, REALTIME, RISK
- Source-defined role: HttpOnly cookie로 인증된 HTTP 세션을 짧고 단일 사용인 WebSocket ticket으로 원자적으로 넘긴다.

### 정확한 조사 대상

- `apps/api/src/app.ts`의 `/auth/ws-ticket` 발급 route와 `/ws` upgrade/handshake 경로를 추적한다.
- raw ticket 생성 길이·TTL·protocol version과 repository의 hash 저장/consume 계약을 확인한다.
- 인증 전 message buffer의 8KiB per-message, 16개, 총 32KiB 제한과 1008/1009 close code를 확인한다.
- 비동기 consume 중 도착한 메시지를 보존한 뒤 인증 성공 시 순서대로 넘기고 listener를 제거하는지 확인한다.
- socket이 인증 완료 전에 닫힌 경우 GameHub에 client를 등록하지 않는 cleanup 경로를 확인한다.

### 학습자 복원

<!-- ANSWER:306d1946afb7:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:306d1946afb7:end -->

## Commit `b0ee833313c1` — test(auth): WebSocket ticket 경계 검증

- Full SHA: `b0ee833313c1d1529828e4b1802207fc3bc08a88`
- Subject: `test(auth): WebSocket ticket 경계 검증`
- Importance: **A**
- Tags: AUTH, PROTOCOL, REALTIME
- Source-defined role: ticket 발급·저장·소비·handshake·pre-auth 제한을 실제 server/socket와 memory/PostgreSQL 저장소에서 검증한다.

### 정확한 조사 대상

- ticket 길이, 30초 TTL, protocol version 1 응답을 검사한다.
- DB에는 raw ticket이 아니라 hash만 저장되는지 SQL 조회로 확인한다.
- replay, forged, expired, suspended ticket이 거부되고 unsupported version이 ticket을 소비하지 않는지 확인한다.
- memory와 PostgreSQL에서 동일 ticket의 동시 consume 중 정확히 한 호출만 성공하는지 확인한다.
- 실제 WebSocket에서 durable session만으로 인증되지 않으며 pre-auth count/bytes/message 제한이 정확한지 확인한다.

### 학습자 복원

<!-- ANSWER:b0ee833313c1:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:b0ee833313c1:end -->

## Commit `fe62962d65d9` — fix(api): 내부 WebSocket 오류 숨김

- Full SHA: `fe62962d65d90c136f826a6b271d17c991a5ffd6`
- Subject: `fix(api): 내부 WebSocket 오류 숨김`
- Importance: **A**
- Tags: PROTOCOL, REALTIME, PERSISTENCE
- Source-defined role: client parse 오류와 내부 처리·저장소 오류를 분리하여 내부 상세가 realtime 응답으로 노출되지 않게 한다.

### 정확한 조사 대상

- `apps/api/src/gameHub.ts`의 message 처리 try/catch와 오류 분류를 확인한다.
- protocol validation 실패가 안정된 client error code/message로 변환되는지 확인한다.
- repository/내부 예외가 generic Korean message와 `internal_error`로 변환되는지 확인한다.
- 로그와 client response가 서로 다른 정보 경계를 갖는지 확인한다.

### 학습자 복원

<!-- ANSWER:fe62962d65d9:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:fe62962d65d9:end -->

## Commit `20933b1393f3` — test(api): WebSocket repository error redaction 검증

- Full SHA: `20933b1393f3a49ff73138c3770d0abcf44d28ca`
- Subject: `test(api): WebSocket repository error redaction 검증`
- Importance: **B**
- Tags: PROTOCOL, REALTIME, PERSISTENCE
- Source-defined role: 민감한 내부 문자열을 가진 repository 실패를 실제 WebSocket command 경로에 주입해 redaction을 검증한다.

### 정확한 조사 대상

- 테스트 repository가 어떤 오류 문자열(SQL·내부 host)을 던지는지 확인한다.
- protocol-valid command를 통해 해당 production handler가 실행되는지 확인한다.
- client가 받는 event의 `code`, message, version을 확인한다.
- raw payload 어디에도 `password_hash`나 내부 hostname이 없는지 확인한다.

### 학습자 복원

<!-- ANSWER:20933b1393f3:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:20933b1393f3:end -->

## Commit `8ea18a1b92db` — fix(realtime): WebSocket transport payload 상한 설정

- Full SHA: `8ea18a1b92db8d3a92232a98aae22c0f3cd1a9a1`
- Subject: `fix(realtime): WebSocket transport payload 상한 설정`
- Importance: **A**
- Tags: AUTH, REALTIME, RISK
- Source-defined role: application pre-auth buffer 제한과 동일한 8KiB 상한을 underlying `ws` server transport에도 적용한다.

### 정확한 조사 대상

- Fastify WebSocket plugin/server 생성 옵션의 `maxPayload` 값을 확인한다.
- 기존 `PRE_AUTH_MESSAGE_MAX_BYTES` 상수를 재사용하는지 확인한다.
- 인증 전 application 검사와 인증 후 transport 검사 사이의 이전 공백을 비교한다.
- oversized frame이 application JSON parser 전에 어떤 close path를 타는지 확인한다.

### 학습자 복원

<!-- ANSWER:8ea18a1b92db:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:8ea18a1b92db:end -->

## Commit `1afec49052b6` — test(realtime): oversized WebSocket frame 거부 검증

- Full SHA: `1afec49052b60103508e22ca9ff57a87013566e5`
- Subject: `test(realtime): oversized WebSocket frame 거부 검증`
- Importance: **B**
- Tags: AUTH, REALTIME, TEST
- Source-defined role: 인증된 실제 WebSocket에서도 8KiB를 넘는 frame이 transport close 1009로 거부되는지 검증한다.

### 정확한 조사 대상

- 테스트가 정상 ticket handshake를 완료한 뒤 frame을 보내는 순서를 확인한다.
- payload 길이가 정확히 8,193 bytes인지 확인한다.
- server가 보내는 application error가 아니라 socket close code 1009를 관찰하는지 확인한다.
- GameHub/repository side effect가 발생하지 않는 경로인지 확인한다.

### 학습자 복원

<!-- ANSWER:1afec49052b6:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:1afec49052b6:end -->


## Thread-level invariant evolution

다음 표에서 불변식이 도입·확장·교정·검증된 SHA를 구분합니다.

<!-- ANSWER:thread-02-invariants:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-02-invariants:end -->

## Failure → Fix → Test 관계

구현 추가를 독립 기능으로 나열하지 말고, 이전 가정과 실제 실패 위험, 수정된 결정, 회귀 증거를 연결합니다.

<!-- ANSWER:thread-02-failure-relations:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-02-failure-relations:end -->

## Ownership·state·responsibility 변화

자원과 상태를 누가 만들고, 보유하고, 이전하고, 정리하는지 커밋 순서에 따라 정리합니다.

<!-- ANSWER:thread-02-ownership:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-02-ownership:end -->

## 최종 Thread 상태

최종 HEAD를 과거 커밋에 투영하지 말고, 위 SHA 순서에서 도달한 보장을 요약합니다.

<!-- ANSWER:thread-02-final-state:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-02-final-state:end -->

## 최종 architecture / execution flow

실제 caller→boundary→state transition→cleanup 흐름을 순서대로 작성합니다.

<!-- ANSWER:thread-02-flow:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-02-flow:end -->

## 학습 완료 확인

<!-- ANSWER:thread-02-checks:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-02-checks:end -->

## 실행 증거 기록

<!-- ANSWER:thread-02-execution:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-02-execution:end -->
