# Development Thread 01: 실행 가능한 프로토콜·HTTP 계약 검증

English title: **Executable Protocol and HTTP Contract Verification**

## Thread 목표

공유 schema가 실제 API와 realtime 신뢰 경계에서 fail-closed로 적용되고, 구형·unknown·불완전 입력이 비즈니스 로직에 도달하지 않는 과정을 복원한다.

## 핵심 질문

- compile-time TypeScript 타입과 runtime parser의 보장 범위는 어떻게 다른가?
- strict schema를 정의하는 것과 모든 route가 그 schema를 실제 호출하는 것은 왜 별도 단계인가?
- version, sequence, persisted-result discriminator가 어떤 잘못된 상태 조합을 막는가?
- table-driven route regression은 적용 누락을 어떤 방식으로 탐지하며 무엇을 자동으로 포괄하지 못하는가?

## 완료 기준

- WebSocket·HTTP schema 단위 테스트와 실제 route integration 테스트의 역할을 구분한다.
- 각 SHA에서 허용·거부되는 concrete shape를 해당 시점 코드로 설명한다.
- Contract → Apply → Route-wide regression의 순서를 재구성한다.
- unknown field, invalid path, unversioned event, incomplete persistence metadata의 실패 위치를 설명한다.

## Commit map

| 순서 | Commit | Subject | Importance | Tags |
| --- | --- | --- | --- | --- |
| 1 | `60c38090effc` | `test(shared): WebSocket 프로토콜 검증` | B | PROTOCOL, SIMULATION, REALTIME |
| 2 | `78cf83f29e80` | `test(shared): HTTP contract 검증` | B | AUTH, PROTOCOL, TEST |
| 3 | `f655969b0d36` | `test(protocol): versioned realtime contract 검증` | A | PROTOCOL, REALTIME, PERSISTENCE |
| 4 | `d07056e11871` | `feat(shared): 모든 HTTP request schema를 strict하게 정의` | A | PROTOCOL |
| 5 | `59d75fddcaa6` | `fix(api): 모든 route input을 runtime 검증` | A | PROTOCOL, RISK |
| 6 | `1abbf7dcdde4` | `test(api): strict request contract 검증` | B | TEST |

> Commit 순서·subject·importance·tags는 Phase 1 감사 후 동결된 정보입니다. Phase 2에서는 변경하지 않습니다.

## Commit `60c38090effc` — test(shared): WebSocket 프로토콜 검증

- Full SHA: `60c38090effc2af3df2670d4d96d3d30a49e95cc`
- Subject: `test(shared): WebSocket 프로토콜 검증`
- Importance: **B**
- Tags: PROTOCOL, SIMULATION, REALTIME
- Source-defined role: 초기 WebSocket 런타임 파서의 정상·거부 입력 범위를 table-driven 테스트로 고정한다.

### 정확한 조사 대상

- `packages/shared/src/ws.test.ts`에서 `parseClientEvent`를 호출하는 표 기반 사례를 확인한다.
- `queue.join`, `game.ready`, `game.input`, `game.pause`, `game.resume`, `chat.send`의 필수 필드와 enum 범위를 대조한다.
- 방향 값이 정확히 `-1 | 0 | 1`인지, 채팅 본문이 trim되고 1~240자로 제한되는지 확인한다.
- 잘못된 JSON과 서버 이벤트 encode/decode 왕복이 어떤 방식으로 검증되는지 확인한다.

### 학습자 복원

<!-- ANSWER:60c38090effc:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:60c38090effc:end -->

## Commit `78cf83f29e80` — test(shared): HTTP contract 검증

- Full SHA: `78cf83f29e80fb9fde1cb8ec73382d832c7abd56`
- Subject: `test(shared): HTTP contract 검증`
- Importance: **B**
- Tags: AUTH, PROTOCOL, TEST
- Source-defined role: 공유 HTTP 요청·응답 스키마의 보안 및 값 경계를 실행 가능한 단위 테스트로 고정한다.

### 정확한 조사 대상

- `packages/shared/src/http.test.ts`에서 session user, login, profile update, UUID params, error envelope를 확인한다.
- 로그인 입력의 알 수 없는 privilege 필드와 금지된 handle 형태가 거부되는지 확인한다.
- 프로필 수정이 비어 있는 객체를 허용하지 않는지, 문자열 trim이 언제 일어나는지 확인한다.
- WebSocket ticket 응답의 TTL 30초와 protocol version 1 조건을 확인한다.

### 학습자 복원

<!-- ANSWER:78cf83f29e80:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:78cf83f29e80:end -->

## Commit `f655969b0d36` — test(protocol): versioned realtime contract 검증

- Full SHA: `f655969b0d36b23b95aad350c6500dbfa3c3a8e8`
- Subject: `test(protocol): versioned realtime contract 검증`
- Importance: **A**
- Tags: PROTOCOL, REALTIME, PERSISTENCE
- Source-defined role: version-1 realtime migration이 구형·불완전 shape를 다시 허용하지 않도록 negative protocol 사례를 추가한다.

### 정확한 조사 대상

- `packages/shared/src/ws.test.ts`에서 version 없는 presence/event가 거부되는지 확인한다.
- snapshot의 sequence 누락·잘못된 값과 중첩된 `snapshot.state` 구조를 검사한다.
- `persisted: true` 결과가 유효한 `matchId` 없이 통과할 수 없는 discriminator를 확인한다.
- 이전 이벤트 형식과 version-1 형식의 차이를 해당 SHA에서 직접 비교한다.

### 학습자 복원

<!-- ANSWER:f655969b0d36:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:f655969b0d36:end -->

## Commit `d07056e11871` — feat(shared): 모든 HTTP request schema를 strict하게 정의

- Full SHA: `d07056e118716fe7537dd92636d1740867f486b9`
- Subject: `feat(shared): 모든 HTTP request schema를 strict하게 정의`
- Importance: **A**
- Tags: PROTOCOL
- Source-defined role: 모든 JSON HTTP 라우트에 params/query/body의 strict 런타임 계약을 한 곳에서 정의한다.

### 정확한 조사 대상

- `packages/shared/src/http.ts`의 `defineHttpRequestContract`, `emptyHttpRequestContract`, `idHttpRequestContract`를 확인한다.
- 각 라우트가 params, query, body를 모두 명시하며 입력이 없는 위치도 strict empty object로 표현되는지 확인한다.
- unknown key가 Zod 기본 strip으로 사라지는 대신 거부되는지 확인한다.
- 라우트 목록과 request-contract export 사이의 누락 여부를 검사한다.

### 학습자 복원

<!-- ANSWER:d07056e11871:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:d07056e11871:end -->

## Commit `59d75fddcaa6` — fix(api): 모든 route input을 runtime 검증

- Full SHA: `59d75fddcaa66da998e23ae6f47c373652143ba2`
- Subject: `fix(api): 모든 route input을 runtime 검증`
- Importance: **A**
- Tags: PROTOCOL, RISK
- Source-defined role: 정의만 존재하던 strict HTTP request contract를 모든 API 라우트의 실제 신뢰 경계에 적용한다.

### 정확한 조사 대상

- `apps/api/src/httpBoundary.ts`의 `parseHttpRequest`가 params/query/body를 함께 parse하는지 확인한다.
- `apps/api/src/app.ts`의 각 JSON 라우트가 비즈니스 로직 전에 올바른 contract를 호출하는지 확인한다.
- Zod 실패가 공통 `validation_error` envelope로 변환되는 경로를 추적한다.
- unknown query가 handler에서 무시되지 않고 400으로 종료되는지 해당 SHA의 테스트 변경과 비교한다.

### 학습자 복원

<!-- ANSWER:59d75fddcaa6:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:59d75fddcaa6:end -->

## Commit `1abbf7dcdde4` — test(api): strict request contract 검증

- Full SHA: `1abbf7dcdde497172790fe23a057a8b326417793`
- Subject: `test(api): strict request contract 검증`
- Importance: **B**
- Tags: TEST
- Source-defined role: API 전 라우트가 strict request contract를 실제로 사용하는지 table-driven regression으로 확인한다.

### 정확한 조사 대상

- `apps/api/src/http-contract.test.ts`의 라우트 표와 요청 생성 방식을 확인한다.
- 각 JSON 라우트에 unknown query/body를 주입하고 공통 400 `validation_error`를 요구하는지 확인한다.
- 잘못된 path parameter가 비즈니스 저장소 호출 전에 차단되는지 확인한다.
- untrusted `X-Forwarded-For`가 guest/client-address 경계에 영향을 주지 않는 별도 사례를 확인한다.

### 학습자 복원

<!-- ANSWER:1abbf7dcdde4:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:1abbf7dcdde4:end -->


## Thread-level invariant evolution

다음 표에서 불변식이 도입·확장·교정·검증된 SHA를 구분합니다.

<!-- ANSWER:thread-01-invariants:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-01-invariants:end -->

## Failure → Fix → Test 관계

구현 추가를 독립 기능으로 나열하지 말고, 이전 가정과 실제 실패 위험, 수정된 결정, 회귀 증거를 연결합니다.

<!-- ANSWER:thread-01-failure-relations:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-01-failure-relations:end -->

## Ownership·state·responsibility 변화

자원과 상태를 누가 만들고, 보유하고, 이전하고, 정리하는지 커밋 순서에 따라 정리합니다.

<!-- ANSWER:thread-01-ownership:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-01-ownership:end -->

## 최종 Thread 상태

최종 HEAD를 과거 커밋에 투영하지 말고, 위 SHA 순서에서 도달한 보장을 요약합니다.

<!-- ANSWER:thread-01-final-state:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-01-final-state:end -->

## 최종 architecture / execution flow

실제 caller→boundary→state transition→cleanup 흐름을 순서대로 작성합니다.

<!-- ANSWER:thread-01-flow:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-01-flow:end -->

## 학습 완료 확인

<!-- ANSWER:thread-01-checks:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-01-checks:end -->

## 실행 증거 기록

<!-- ANSWER:thread-01-execution:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-01-execution:end -->
