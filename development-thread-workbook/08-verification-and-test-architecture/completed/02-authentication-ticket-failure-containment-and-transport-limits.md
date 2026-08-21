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
#### 역사적 복원

이전 구조는 동일한 장기 세션을 cookie, bearer header, URL query에서 받아들였다. 이 구조에서는 JavaScript 저장소, access log, referrer, 프록시 기록 등 여러 경로로 재사용 가능한 credential이 노출될 수 있고, 개발 로그인도 배포 모드에서 실수로 살아남을 수 있었다.

이 커밋은 인증 credential의 소유권을 브라우저의 HttpOnly `pp_session` cookie로 단일화한다. request 인증은 cookie만 읽고 bearer/query fallback과 CORS Authorization 허용을 제거한다. 외부 모드의 cookie는 Secure가 적용되며, dev-login route는 development/test에서만 등록된다.

상태 전이는 로그인 성공 시 서버가 cookie를 설정하고, 이후 HTTP 요청은 브라우저가 cookie를 자동 전송하는 방식으로 바뀐다. JavaScript는 장기 세션 값을 읽거나 URL에 붙일 책임을 잃는다. production/demo에서 개발용 route를 아예 등록하지 않는 것은 handler 내부 권한 검사보다 강한 비노출 경계다.

그러나 WebSocket 업그레이드에 장기 cookie 값을 그대로 URL에 넣을 수는 없다. 이 커밋은 그 문제를 일부러 남기며, `306d1946afb7`의 one-time ticket handoff가 이를 해결한다.

#### 이 커밋이 보장하는 것

- 지속 세션은 HttpOnly cookie로만 운반된다.
- 개발 로그인은 development/test 모드에만 존재한다.
- bearer·query 기반 재사용 토큰 경로와 관련 CORS 표면이 제거된다.

#### 이 커밋이 보장하지 않는 것

- WebSocket 인증 자체는 아직 완성하지 않는다.
- cookie를 발급한 세션의 서버 측 폐기·계정 정지 후 열린 연결 회수까지 모두 보장하는 커밋은 아니다.

#### 전후 관계

`401cf13d9d17`이 cookie 속성·금지 transport·모드 격리를 검증하고, `306d1946afb7`이 cookie에서 one-time WebSocket ticket으로 권한을 넘긴다.

#### 증거 성격

- 핵심 credential ownership 전환
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
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
#### 역사적 복원

테스트는 내부 cookie helper를 직접 호출하지 않고 실제 라우트 등록과 Fastify 응답을 통해 cookie 속성과 인증 결과를 관찰한다. 개발 모드 로그인은 HttpOnly session cookie를 설정하지만 bearer/query만 제시한 요청은 인증되지 않는다.

또한 `admin`이라는 문자열을 handle로 선택하는 것과 실제 관리 role은 분리된다. production/demo에서는 dev-login handler가 실패하는 것이 아니라 route 자체가 등록되지 않아야 한다.

이 테스트가 보호하는 핵심은 허용 경로 한 개와 금지 경로 여러 개를 동시에 고정하는 것이다. 단순 로그인 성공 테스트만으로는 credential 표면 축소를 증명할 수 없다.

#### 이 커밋이 보장하는 것

- cookie 속성, 금지 bearer/query transport, 환경별 route 비노출을 통합적으로 증명한다.
- handle과 authorization role이 분리되어 있음을 확인한다.

#### 이 커밋이 보장하지 않는 것

- 브라우저에서 HttpOnly가 실제로 JavaScript 접근을 막는지 직접 실행하지 않는다.
- WebSocket ticket이나 동시 소비는 대상이 아니다.

#### 전후 관계

`d0531791406b`의 보안 경계를 고정하고, 뒤의 ticket 테스트와 결합되어 HTTP→WebSocket trust chain을 구성한다.

#### 증거 성격

- Fastify authentication boundary regression
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
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
#### 역사적 복원

cookie-only 모델은 HTTP에는 적합하지만 WebSocket URL에서 지속 credential을 노출하거나 JavaScript가 cookie 값을 읽게 만들 수 없다. 또한 ticket 검증이 비동기인 동안 초기 client message를 잃거나 무제한 버퍼링하면 기능·메모리 안전성이 깨진다.

발급 경로는 HttpOnly cookie로 HTTP 사용자를 인증한 뒤 cryptographically random raw ticket을 반환하고 repository에는 hash만 저장한다. upgrade 경로는 `ticket`과 protocol version을 strict하게 검증하고 repository의 consume 작업으로 한 번만 사용자 identity를 얻는다. raw ticket은 장기 세션이 아니며 TTL 이후 또는 한 번 소비된 뒤 재사용할 수 없다.

pre-auth 단계는 별도 수명주기를 가진다. 메시지 하나는 8KiB, 개수는 16, 누적은 32KiB로 제한된다. 초과 시 정책 위반 또는 payload-too-large close code로 닫고 listener와 임시 버퍼를 정리한다. 성공하면 임시 listener를 제거한 뒤 버퍼를 도착 순서대로 GameHub 경계에 재생한다. socket이 먼저 닫혔다면 인증 결과가 돌아와도 client ownership을 만들지 않는다.

이 설계에서 HTTP 세션은 ticket 발급 권한만 소유하고, repository는 ticket single-use 상태를 소유하며, GameHub는 consume 성공 후의 realtime connection만 소유한다. 권한과 자원 수명이 단계별로 분리된다.

#### 이 커밋이 보장하는 것

- 장기 session credential을 URL/JavaScript에 노출하지 않고 WebSocket identity를 확립한다.
- ticket은 짧은 수명·hash-at-rest·single-use이며 인증 전 메모리 사용은 명시적으로 제한된다.
- 비동기 인증 중 초기 메시지의 순서와 cleanup이 정의된다.

#### 이 커밋이 보장하지 않는 것

- 네트워크 중간자의 TLS 보호 자체를 제공하지 않는다.
- repository 구현이 atomic consume을 지키는지는 별도 테스트가 필요하다.
- 인증 후의 모든 frame 크기 제한은 이 SHA의 application buffer만으로 완전하지 않아 `8ea18a1b92db`가 transport 상한을 추가한다.

#### 전후 관계

`b0ee833313c1`이 replay·expiry·suspension·동시 소비·pre-auth 한계를 실제 경계에서 검증하고, `8ea18a1b92db`이 underlying ws transport에도 같은 8KiB 상한을 적용한다.

#### 증거 성격

- 핵심 HTTP-to-realtime authentication handoff
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
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
#### 역사적 복원

이 테스트 묶음은 ticket helper의 정상 결과만 보는 것이 아니라 trust chain 전체의 실패 모델을 재현한다. 발급 응답은 43자 raw ticket, 30초 만료, protocol version 1을 가져야 하고, 저장소 조회에서는 raw 값이 발견되지 않고 hash만 남아야 한다.

replay·위조·만료·정지 계정은 handshake를 얻지 못한다. 지원되지 않는 protocol version은 consume 전에 거부되어 같은 유효 ticket으로 올바른 version handshake를 다시 시도할 수 있다. 반대로 한 번 성공한 ticket은 재사용할 수 없다.

memory와 PostgreSQL 구현 모두 동일 ticket을 병렬 consume하며 fulfilled 결과가 정확히 하나여야 한다. 이는 single-use가 프로세스 로컬 check-then-delete가 아니라 repository 원자성으로 보호된다는 핵심 증거다.

실제 socket 테스트는 cookie/session token만 query에 넣는 구형 경로를 거부하고, 인증 전 메시지 수·누적 바이트·단일 메시지 한계를 close code와 함께 확인한다.

#### 이 커밋이 보장하는 것

- 발급부터 socket admission까지 ticket security invariant를 통합적으로 증명한다.
- memory와 PostgreSQL이 동시 소비에서도 one winner semantics를 보존한다.
- version 검증이 ticket 상태를 불필요하게 소모하지 않는다.

#### 이 커밋이 보장하지 않는 것

- TLS, 프록시 로그 정책, 브라우저 재연결 UX는 검증하지 않는다.
- 인증 성공 뒤 8KiB를 넘는 단일 transport frame은 이후 별도 fix/test가 필요했다.

#### 전후 관계

`306d1946afb7`의 설계를 고위험 regression evidence로 닫고, 후속 `8ea18a1b92db`/`1afec49052b6`가 인증 후 transport payload 공백을 보완한다.

#### 증거 성격

- real socket + repository concurrency security regression
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
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
#### 역사적 복원

이전에는 WebSocket command 처리 중 발생한 예외 문자열이 동일한 오류 응답 경로를 통해 client로 전달될 수 있었다. 저장소 예외에는 SQL, host, schema, 내부 필드명이 포함될 수 있어 protocol 입력 오류와 같은 방식으로 노출하면 안 된다.

수정은 파서가 보고하는 client-caused validation failure와 handler/repository가 던지는 internal failure를 분리한다. 전자는 안정된 protocol error code로 설명하지만, 후자는 client에 generic message와 `internal_error`만 보낸다. 내부 진단은 server-side 관측 경계에 남는다.

오류 소유권을 나눔으로써 protocol은 예상 가능한 외부 실패만 표현하고 infrastructure detail은 운영 로그의 책임으로 유지된다.

#### 이 커밋이 보장하는 것

- repository·내부 예외 문자열이 client realtime payload로 직접 새지 않는다.
- client validation 오류와 server failure의 외부 code가 구분된다.

#### 이 커밋이 보장하지 않는 것

- 로그 자체의 credential redaction 전체를 검증하지 않는다.
- 모든 비-WebSocket HTTP 오류 노출 정책까지 변경하지 않는다.

#### 전후 관계

`20933b1393f3`이 SQL과 내부 hostname을 포함한 강제 repository 실패로 이 비노출 경계를 검증한다.

#### 증거 성격

- failure containment and error redaction fix
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
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
#### 역사적 복원

테스트는 parse 단계에서 실패시키지 않는다. 유효한 realtime command가 repository를 호출한 뒤 `password_hash`와 내부 host 정보를 포함한 오류를 던지게 하여 내부 failure branch를 직접 통과한다.

client는 versioned error event와 generic `internal_error`만 받아야 하며, 원래 예외 텍스트는 직렬화된 payload 어디에도 나타나지 않아야 한다. 따라서 단순 정상 경로가 아니라 실제 정보 노출 회귀를 재현한다.

#### 이 커밋이 보장하는 것

- 내부 repository 오류 상세가 WebSocket client 응답으로 노출되지 않음을 증명한다.

#### 이 커밋이 보장하지 않는 것

- server log에 기록되는 메타데이터의 전체 redaction 규칙은 이 테스트 범위가 아니다.
- 모든 종류의 infrastructure error를 열거하지 않는다.

#### 전후 관계

`fe62962d65d9`의 내부/외부 오류 경계에 대한 deterministic regression이다.

#### 증거 성격

- deterministic failure injection / information-disclosure regression
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
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
#### 역사적 복원

기존 코드에는 인증 전 수동 buffer가 8KiB 제한을 적용했지만, 인증이 끝난 뒤에는 underlying WebSocket transport가 더 큰 frame을 받아 메모리에 조립할 수 있었다. 같은 시스템에 두 개의 서로 다른 payload 한계가 존재한 셈이다.

수정은 `ws` server의 `maxPayload`를 기존 8KiB 상수에 맞춘다. 제한은 JSON parse나 GameHub dispatch 이전의 transport 계층에서 적용되므로, 인증 상태와 무관하게 oversized frame이 전체 수신·할당되는 것을 막는다.

자원 경계의 소유권은 application callback이 아니라 실제 frame decoder로 내려간다. 결과적으로 pre-auth와 authenticated transport가 동일한 최대 메시지 크기를 공유한다.

#### 이 커밋이 보장하는 것

- 인증 전후 모든 WebSocket frame에 8KiB hard limit가 적용된다.
- oversized payload가 business handler에 도달하기 전에 transport에서 종료된다.

#### 이 커밋이 보장하지 않는 것

- 메시지 빈도·누적 처리량·정상 크기 frame의 rate limit까지 해결하지 않는다.
- 프록시가 더 큰 raw network buffer를 가지는 문제와는 별개다.

#### 전후 관계

`1afec49052b6`이 인증된 실제 socket에서 8,193-byte frame을 보내 close code 1009를 요구한다.

#### 증거 성격

- transport-layer resource limit fix
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
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
#### 역사적 복원

테스트는 pre-auth 상태가 아니라 유효 ticket으로 인증된 실제 socket을 사용한다. 이후 8,193-byte frame을 보내 underlying `maxPayload` 경계를 한 바이트 초과한다.

기대 결과는 application-level validation error가 아니라 WebSocket close code 1009다. 이 차이는 제한이 handler가 아니라 transport decoder에서 작동함을 보여 준다.

#### 이 커밋이 보장하는 것

- authenticated connection에도 hard payload limit가 동일하게 적용됨을 증명한다.

#### 이 커밋이 보장하지 않는 것

- 8KiB 이하 payload의 의미 검증이나 rate limit은 증명하지 않는다.

#### 전후 관계

`8ea18a1b92db`의 transport-level fix를 실제 socket 회귀로 고정한다.

#### 증거 성격

- real transport boundary regression
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
<!-- ANSWER:1afec49052b6:end -->


## Thread-level invariant evolution

다음 표에서 불변식이 도입·확장·교정·검증된 SHA를 구분합니다.

<!-- ANSWER:thread-02-invariants:begin -->
### 복원 결과

| SHA | 변화 | 불변식 |
| --- | --- | --- |
| `d0531791406b` | 도입 | 지속 credential은 HttpOnly `pp_session` cookie 한 경로로만 운반되고 dev-login은 실행 모드로 격리된다. |
| `401cf13d9d17` | 회귀 보호 | cookie 속성·금지 bearer/query transport·route 비노출·role 분리가 검증된다. |
| `306d1946afb7` | 소유권 이전 | HTTP session은 ticket 발급만 허용하고 repository가 hash·single-use를 소유하며 consume 뒤 GameHub가 connection을 소유한다. |
| `b0ee833313c1` | 경계 검증 | replay·expiry·suspension·version·동시 소비·pre-auth limits가 실제 socket/DB에서 검증된다. |
| `fe62962d65d9` | 실패 격리 | client validation과 internal/repository failure의 외부 오류 정보가 분리된다. |
| `20933b1393f3` | 정보 노출 회귀 | SQL/내부 host를 가진 강제 실패에서도 generic event만 보인다. |
| `8ea18a1b92db` | 상한 교정 | 8KiB 제한이 pre-auth application buffer에서 underlying transport 전체로 내려간다. |
| `1afec49052b6` | transport 회귀 | 인증 후 8,193-byte frame이 1009로 종료된다. |

각 변화는 이전 커밋의 최종 상태를 다음 커밋이 단순 반복한 것이 아니라, 새 경계를 도입·확장·교정하거나 regression으로 보호한 시점을 나타냅니다.
<!-- ANSWER:thread-02-invariants:end -->

## Failure → Fix → Test 관계

구현 추가를 독립 기능으로 나열하지 말고, 이전 가정과 실제 실패 위험, 수정된 결정, 회귀 증거를 연결합니다.

<!-- ANSWER:thread-02-failure-relations:begin -->
### 복원 결과

| Failure / 이전 가정 | Fix / 결정 | Verification |
| --- | --- | --- |
| 재사용 session을 header/query/URL에서 수용 | `d0531791406b` — cookie-only + mode-scoped route | `401cf13d9d17` — 금지 transport 검증 |
| WebSocket identity에 지속 credential 노출 위험 | `306d1946afb7` — short-lived hash-only single-use ticket | `b0ee833313c1` — replay/expiry/concurrency/socket regression |
| repository 예외 상세가 client로 노출 | `fe62962d65d9` — internal error genericization | `20933b1393f3` — SQL/host failure injection |
| pre-auth에는 8KiB 제한이 있지만 인증 후 transport에는 공백 | `8ea18a1b92db` — `ws.maxPayload` 적용 | `1afec49052b6` — authenticated 8,193-byte frame 1009 |
<!-- ANSWER:thread-02-failure-relations:end -->

## Ownership·state·responsibility 변화

자원과 상태를 누가 만들고, 보유하고, 이전하고, 정리하는지 커밋 순서에 따라 정리합니다.

<!-- ANSWER:thread-02-ownership:begin -->
### 복원 결과

| 대상 | 소유자 | 책임·수명 |
| --- | --- | --- |
| Durable browser identity | HttpOnly `pp_session` cookie | 브라우저가 자동 전송하며 JavaScript·URL은 값을 소유하지 않는다. |
| Ticket issuance authority | Authenticated HTTP route | 현재 session을 확인한 뒤 raw one-time ticket을 잠시 client에 반환한다. |
| Ticket state | Memory/PostgreSQL repository | hash, expiry, user, consumed 상태와 atomic one-winner consume을 소유한다. |
| Pre-auth buffer | WebSocket route | consume 완료 전 message 순서와 8KiB/16개/32KiB cleanup을 소유한다. |
| Authenticated connection | GameHub | consume 성공·socket open 후 command lifecycle을 소유한다. |
| Frame hard limit | underlying `ws` server | 인증 상태와 무관하게 decoder 단계에서 8KiB를 강제한다. |
| Internal diagnostics | server observability boundary | client에게는 generic code만 주고 내부 상세를 외부 protocol에서 분리한다. |
<!-- ANSWER:thread-02-ownership:end -->

## 최종 Thread 상태

최종 HEAD를 과거 커밋에 투영하지 말고, 위 SHA 순서에서 도달한 보장을 요약합니다.

<!-- ANSWER:thread-02-final-state:begin -->
### 최종 상태

- 지속 credential은 cookie-only이며 개발 인증 route는 production/demo에 존재하지 않는다.
- WebSocket은 HTTP session으로 발급한 짧은 raw ticket을 hash-at-rest로 저장하고 원자적으로 한 번 소비한다.
- 인증 전 메시지는 손실 없이 bounded buffer에 보관되며 인증 후 전체 frame도 transport 8KiB 상한을 따른다.
- protocol 오류와 internal failure가 분리되고 repository 상세는 client payload로 노출되지 않는다.
<!-- ANSWER:thread-02-final-state:end -->

## 최종 architecture / execution flow

실제 caller→boundary→state transition→cleanup 흐름을 순서대로 작성합니다.

<!-- ANSWER:thread-02-flow:begin -->
### 최종 실행 흐름

1. 브라우저가 HttpOnly cookie로 ticket HTTP 요청
2. 서버가 random raw ticket 반환·repository에 hash/expiry 저장
3. client가 `ticket` + supported version으로 WebSocket handshake
4. route가 bounded pre-auth buffer를 유지하며 atomic consume
5. 성공 시 listener 교체·버퍼 순서 재생·GameHub ownership 생성
6. protocol 오류는 stable client error, 내부 오류는 generic `internal_error`
7. 모든 frame은 underlying transport 8KiB 상한 적용
<!-- ANSWER:thread-02-flow:end -->

## 학습 완료 확인

<!-- ANSWER:thread-02-checks:begin -->
### 완료 확인

- [x] unsupported protocol version이 유효 ticket을 소비하면 안 되는 이유를 설명할 수 있다.
- [x] 동시 consume에서 exactly one success를 memory와 PostgreSQL 모두 확인해야 하는 이유를 설명할 수 있다.
- [x] pre-auth cumulative limit와 `maxPayload`가 해결하는 공격 표면의 차이를 설명할 수 있다.
- [x] send/parse/repository 실패 중 어떤 정보가 client와 server에 각각 남아야 하는지 설명할 수 있다.

체크는 repository code inspection을 통해 설명이 문서에 작성되었음을 뜻합니다. 실제 repository test suite 실행 완료를 뜻하지 않습니다.
<!-- ANSWER:thread-02-checks:end -->

## 실행 증거 기록

<!-- ANSWER:thread-02-execution:begin -->
- Historical inspection: 각 참조 SHA의 GitHub commit diff와 변경 파일을 개별 조회했습니다.
- Repository test execution: 실행하지 않았습니다. 로컬 환경에서 지정 branch의 전체 checkout을 materialize하지 못해 pnpm, PostgreSQL, Playwright, k6, Toxiproxy 명령 결과를 만들 수 없었습니다.
- Runtime claims: 기록하지 않았습니다. 위의 `증거 성격`은 test 구현과 production code path에 대한 정적·역사적 검사입니다.
- Artifact validation: scaffold/completed 대응, fixed metadata, answer completion, SHA uniqueness, Markdown fence, ZIP 구조는 로컬 검증 스크립트로 검사했습니다.
<!-- ANSWER:thread-02-execution:end -->
