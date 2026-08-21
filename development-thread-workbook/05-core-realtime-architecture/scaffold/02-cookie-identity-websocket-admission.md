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
| 학습 깊이 | Thread 내 구현 역할을 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Establishes repository-backed sessions and the initial browser identity boundary.
- Classification summary: Establish the first HTTP boundary around repository-backed identity and lobby data.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- page, component, hook, reducer, query cache 중 실제 state owner와 teardown 시 stale update 방지 경로를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 boundary/decision | [파일·심볼·조건·관찰 결과 작성] |
| 상태 또는 ownership 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 주요 failure/edge path | [파일·심볼·조건·관찰 결과 작성] |
| 보장/비보장 | [파일·심볼·조건·관찰 결과 작성] |
| 다음 관련 commit 연결 | [파일·심볼·조건·관찰 결과 작성] |

비교 기준:
- 이 commit의 parent와 비교합니다.
- 다음 Thread 관련 SHA: `d0531791406b` — `fix(auth): cookie-only session과 환경별 route 적용`

### 5.2. `fix(auth): cookie-only session과 환경별 route 적용`

| 항목 | 값 |
| --- | --- |
| SHA | `d0531791406b` |
| Importance | S |
| Tags | AUTH, ARCH, RISK |
| 학습 깊이 | Architecture/invariant를 깊게 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Restricts durable credentials to the HttpOnly cookie and scopes development login by mode.
- Classification summary: Replace reusable cross-transport session tokens with a cookie-only durable identity boundary.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- 수정 전 가정 → 실제 실패 또는 위험 → root cause → 수정된 invariant를 parent와 이 SHA에서 비교합니다.
- 후속 regression test가 같은 실패를 어떤 fixture 또는 failure injection으로 고정하는지 연결합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 boundary/decision | [파일·심볼·조건·관찰 결과 작성] |
| 상태 또는 ownership 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 주요 failure/edge path | [파일·심볼·조건·관찰 결과 작성] |
| 보장/비보장 | [파일·심볼·조건·관찰 결과 작성] |
| 다음 관련 commit 연결 | [파일·심볼·조건·관찰 결과 작성] |

#### Fix 연결 골격

- 기존 가정: [작성]
- 실제 실패 또는 위험: [작성]
- Root cause: [작성]
- 수정된 invariant: [작성]
- 실제 수정 코드: [작성]
- Regression 연결: [작성]

비교 기준:
- 직전 Thread 관련 SHA: `1779df300611` — `feat(api): 로그인과 로비 HTTP 경계 구현`
- 다음 Thread 관련 SHA: `353ca9a17415` — `fix(web): browser token 저장 제거`

### 5.3. `fix(web): browser token 저장 제거`

| 항목 | 값 |
| --- | --- |
| SHA | `353ca9a17415` |
| Importance | A |
| Tags | AUTH, PROTOCOL, REALTIME |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Removes JavaScript-managed durable credentials from the browser.
- Classification summary: Make browser HTTP and realtime clients consume cookie identity without storing a reusable token.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- runtime schema의 strictness, negative branch, producer/consumer의 공통 contract 사용 여부를 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- 수정 전 가정 → 실제 실패 또는 위험 → root cause → 수정된 invariant를 parent와 이 SHA에서 비교합니다.
- 후속 regression test가 같은 실패를 어떤 fixture 또는 failure injection으로 고정하는지 연결합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 boundary/decision | [파일·심볼·조건·관찰 결과 작성] |
| 상태 또는 ownership 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 주요 failure/edge path | [파일·심볼·조건·관찰 결과 작성] |
| 보장/비보장 | [파일·심볼·조건·관찰 결과 작성] |
| 다음 관련 commit 연결 | [파일·심볼·조건·관찰 결과 작성] |

#### Fix 연결 골격

- 기존 가정: [작성]
- 실제 실패 또는 위험: [작성]
- Root cause: [작성]
- 수정된 invariant: [작성]
- 실제 수정 코드: [작성]
- Regression 연결: [작성]

비교 기준:
- 직전 Thread 관련 SHA: `d0531791406b` — `fix(auth): cookie-only session과 환경별 route 적용`
- 다음 Thread 관련 SHA: `d9bde7485719` — `feat(auth): WebSocket ticket 생성과 HTTP 계약 정의`

### 5.4. `feat(auth): WebSocket ticket 생성과 HTTP 계약 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `d9bde7485719` |
| Importance | A |
| Tags | AUTH, PROTOCOL, REALTIME |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Defines high-entropy raw tickets and hash-only storage semantics.
- Classification summary: Define the raw one-time WebSocket ticket and strict HTTP/handshake shape.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- runtime schema의 strictness, negative branch, producer/consumer의 공통 contract 사용 여부를 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 boundary/decision | [파일·심볼·조건·관찰 결과 작성] |
| 상태 또는 ownership 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 주요 failure/edge path | [파일·심볼·조건·관찰 결과 작성] |
| 보장/비보장 | [파일·심볼·조건·관찰 결과 작성] |
| 다음 관련 commit 연결 | [파일·심볼·조건·관찰 결과 작성] |

비교 기준:
- 직전 Thread 관련 SHA: `353ca9a17415` — `fix(web): browser token 저장 제거`
- 다음 Thread 관련 SHA: `c89a455fee06` — `feat(db): PostgreSQL WebSocket ticket 저장 추가`

### 5.5. `feat(db): PostgreSQL WebSocket ticket 저장 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `c89a455fee06` |
| Importance | A |
| Tags | AUTH, SIMULATION, REALTIME |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Makes ticket consumption atomic and single-use in PostgreSQL.
- Classification summary: Persist only ticket digests and consume them with one destructive database operation.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 boundary/decision | [파일·심볼·조건·관찰 결과 작성] |
| 상태 또는 ownership 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 주요 failure/edge path | [파일·심볼·조건·관찰 결과 작성] |
| 보장/비보장 | [파일·심볼·조건·관찰 결과 작성] |
| 다음 관련 commit 연결 | [파일·심볼·조건·관찰 결과 작성] |

비교 기준:
- 직전 Thread 관련 SHA: `d9bde7485719` — `feat(auth): WebSocket ticket 생성과 HTTP 계약 정의`
- 다음 Thread 관련 SHA: `306d1946afb7` — `feat(auth): ticket 기반 WebSocket 인증 연결`

### 5.6. `feat(auth): ticket 기반 WebSocket 인증 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `306d1946afb7` |
| Importance | S |
| Tags | AUTH, REALTIME, RISK |
| 학습 깊이 | Architecture/invariant를 깊게 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Completes the cookie-to-ticket-to-socket trust handoff with bounded pre-auth buffering.
- Classification summary: Integrate cookie-authenticated issuance, atomic ticket consumption, and bounded asynchronous WebSocket admission.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 boundary/decision | [파일·심볼·조건·관찰 결과 작성] |
| 상태 또는 ownership 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 주요 failure/edge path | [파일·심볼·조건·관찰 결과 작성] |
| 보장/비보장 | [파일·심볼·조건·관찰 결과 작성] |
| 다음 관련 commit 연결 | [파일·심볼·조건·관찰 결과 작성] |

비교 기준:
- 직전 Thread 관련 SHA: `c89a455fee06` — `feat(db): PostgreSQL WebSocket ticket 저장 추가`
- 다음 Thread 관련 SHA: `b0ee833313c1` — `test(auth): WebSocket ticket 경계 검증`

### 5.7. `test(auth): WebSocket ticket 경계 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `b0ee833313c1` |
| Importance | A |
| Tags | AUTH, PROTOCOL, REALTIME |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Exercises replay, expiry, suspension, protocol version, and concurrent consumption.
- Classification summary: Add deterministic integration and repository tests for the complete ticket boundary.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- runtime schema의 strictness, negative branch, producer/consumer의 공통 contract 사용 여부를 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- 테스트가 주입하는 입력·시간·동시성·오류와 실제 production path를 구분해 기록합니다.
- 테스트가 증명하는 범위와 실제 process/network/database까지는 증명하지 않는 범위를 함께 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 boundary/decision | [파일·심볼·조건·관찰 결과 작성] |
| 상태 또는 ownership 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 주요 failure/edge path | [파일·심볼·조건·관찰 결과 작성] |
| 보장/비보장 | [파일·심볼·조건·관찰 결과 작성] |
| 다음 관련 commit 연결 | [파일·심볼·조건·관찰 결과 작성] |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | [작성] |
| 재현하는 failure/boundary | [작성] |
| test technique | [작성] |
| 통과하는 production path | [작성] |
| 증명하는 것 | [작성] |
| 증명하지 않는 것 | [작성] |
| 후속 회귀 방지 | [작성] |

비교 기준:
- 직전 Thread 관련 SHA: `306d1946afb7` — `feat(auth): ticket 기반 WebSocket 인증 연결`
- 다음 Thread 관련 SHA: `ec9cb39babef` — `fix(log): 요청 비밀 정보 redaction 적용`

### 5.8. `fix(log): 요청 비밀 정보 redaction 적용`

| 항목 | 값 |
| --- | --- |
| SHA | `ec9cb39babef` |
| Importance | A |
| Tags | AUTH, REALTIME, OBSERVABILITY |
| 학습 깊이 | 주요 subsystem과 failure path를 확인합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Prevents tickets and durable credentials from becoming operational log data.
- Classification summary: Redact credential-bearing headers, query objects, ticket fields, and raw URL query strings.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- 측정 위치, label cardinality, threshold, time source와 측정 자체가 동작을 바꾸지 않는지 확인합니다.
- 수정 전 가정 → 실제 실패 또는 위험 → root cause → 수정된 invariant를 parent와 이 SHA에서 비교합니다.
- 후속 regression test가 같은 실패를 어떤 fixture 또는 failure injection으로 고정하는지 연결합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 핵심 boundary/decision | [파일·심볼·조건·관찰 결과 작성] |
| 상태 또는 ownership 변화 | [파일·심볼·조건·관찰 결과 작성] |
| 주요 failure/edge path | [파일·심볼·조건·관찰 결과 작성] |
| 보장/비보장 | [파일·심볼·조건·관찰 결과 작성] |
| 다음 관련 commit 연결 | [파일·심볼·조건·관찰 결과 작성] |

#### Fix 연결 골격

- 기존 가정: [작성]
- 실제 실패 또는 위험: [작성]
- Root cause: [작성]
- 수정된 invariant: [작성]
- 실제 수정 코드: [작성]
- Regression 연결: [작성]

비교 기준:
- 직전 Thread 관련 SHA: `b0ee833313c1` — `test(auth): WebSocket ticket 경계 검증`
- 이 Thread의 최종 상태와 비교합니다.

## 6. Invariant ledger

| Invariant | 도입 SHA | 강화 SHA | 부족함이 드러난 SHA | 복구 fix | 고정 test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| The durable browser session is carried only by an HttpOnly cookie; raw WebSocket tickets are short-lived, single-use, hashed at rest, bounded during authentication, and excluded from logs. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| [작성] | [작성] | [작성] | [작성] |

## 8. Ownership / state / responsibility 변화

| 축 | 초기 owner/state | 중간 전환 | 최종 owner/state | cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| durable browser session | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| pending WS capability | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| pre-auth messages | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| credential logging | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |

## 9. Thread 최종 상태

- 최종 authoritative owner: [작성]
- 최종 상태/invariant: [작성]
- 남아 있는 의도적 제한 또는 비보장: [작성]
- 후속 Thread가 의존하는 contract: [작성]
- 대표 코드 근거: [SHA·파일·심볼 작성]

## 10. 최종 architecture 또는 execution flow 정리

```text
[입력/이벤트]
    ↓
[소유 boundary와 validation]
    ↓
[상태 전이 또는 side effect]
    ↓
[출력/관측/cleanup]
```

## 11. 학습 완료 자가 점검

- [ ] Commit map의 모든 SHA를 원문 순서대로 확인했습니다.
- [ ] 각 commit의 subject, importance, tags를 변경하지 않았습니다.
- [ ] final HEAD 코드를 과거 SHA에 소급하지 않았습니다.
- [ ] S/A/B/C 깊이를 구분해 근거를 남겼습니다.
- [ ] fix와 test를 실제 production path에 연결했습니다.
- [ ] 실행하지 않은 명령 결과를 작성하지 않았습니다.
- [ ] Thread 최종 flow를 실제 코드로 설명할 수 있습니다.
