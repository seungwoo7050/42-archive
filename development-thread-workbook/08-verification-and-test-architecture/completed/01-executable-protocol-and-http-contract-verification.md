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
#### 역사적 복원

이 커밋 이전에는 공유 WebSocket 스키마가 존재했지만, 허용 이벤트 전체와 기본값·경계값을 한 자리에서 회귀 검증하는 증거가 부족했다.

`ws.test.ts`는 각 이벤트를 실제 `parseClientEvent` 경계에 넣는다. 특히 `queue.join`의 기본 mode, room 식별자와 입력 방향의 도메인, 채팅 공백 제거와 길이 제한을 정상·오류 사례로 분리한다. 따라서 TypeScript 타입이 아니라 실행 시 파서가 계약을 강제한다는 점을 확인한다.

서버 이벤트는 encode 후 다시 parse하는 왕복을 사용한다. 이는 생산자와 소비자가 동일한 공유 스키마를 사용한다는 기본 호환성 증거지만, 네트워크 연결·순서 뒤바뀜·버전 전환까지 재현하지는 않는다.

#### 이 커밋이 보장하는 것

- 지원하는 초기 client-event 형태와 값 범위를 파서 수준에서 고정한다.
- 잘못된 JSON과 계약 위반 객체가 처리기로 넘어가지 않음을 증명한다.

#### 이 커밋이 보장하지 않는 것

- 실제 소켓의 인증·전송·순서 보장은 검증하지 않는다.
- 뒤에 도입되는 `v: 1`, snapshot sequence, persistence discriminator는 아직 대상이 아니다.

#### 전후 관계

`f655969b0d36`이 이 기초 계약을 versioned realtime 형태로 확장하고, 구형 shape를 명시적으로 거부한다.

#### 증거 성격

- 공유 패키지 단위 경계 테스트
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
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
#### 역사적 복원

HTTP DTO와 Zod 스키마가 추가된 뒤, 이 커밋은 계약의 의미를 값 수준에서 고정한다. 로그인 입력에 임의 role·권한 필드를 섞거나 허용되지 않은 handle을 보내도 스키마가 이를 받아들이지 않아야 한다.

테스트는 session user projection, UUID 경로 변수, 비어 있지 않은 profile update, 공통 오류 envelope, 30초짜리 version-1 WebSocket ticket 응답을 직접 parse한다. 요청과 응답 모두 실제 런타임 스키마를 통과해야 한다.

다만 이 시점의 테스트는 공유 스키마 자체만 검증한다. API의 모든 라우트가 해당 스키마를 실제로 호출하는지는 `59d75fddcaa6`과 `1abbf7dcdde4`에서 별도로 확인된다.

#### 이 커밋이 보장하는 것

- 공유 HTTP schema가 권한 주입 필드, 잘못된 UUID, 빈 mutation을 거부한다.
- 공통 오류와 ticket 응답의 외부 shape가 고정된다.

#### 이 커밋이 보장하지 않는 것

- Fastify 라우트의 적용 누락을 탐지하지 않는다.
- DB나 인증 세션의 실제 상태 변화는 검증하지 않는다.

#### 전후 관계

`d07056e11871`이 모든 JSON 라우트용 strict request contract를 정의하고, 이후 API 적용·회귀 테스트가 이 단위 계약을 실행 경계로 확장한다.

#### 증거 성격

- 공유 HTTP schema 단위 테스트
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
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
#### 역사적 복원

versioned codec 도입 직후의 위험은 새 형식을 정상적으로 encode하는 것보다, 이전 형식이 느슨한 union이나 optional 필드 때문에 계속 통과하는 것이다. 이 커밋은 그 호환성 구멍을 negative test로 막는다.

테스트는 `v`가 없는 presence 이벤트, sequence가 없는 snapshot, 영속 결과를 주장하면서 `matchId`가 없는 완료 결과를 실제 파서에 넣어 실패를 요구한다. snapshot은 단순 상태 객체가 아니라 versioned envelope와 중첩 state를 가져야 하며, 영속성 discriminator는 결과 식별자와 결합된다.

이 증거는 wire shape의 fail-closed 성질을 보여 준다. 그러나 같은 sequence가 실제 클라이언트 reducer에서 역행을 막는지, 서버가 stale input을 버리는지는 이 커밋만으로 증명되지 않는다.

#### 이 커밋이 보장하는 것

- 구형 unversioned 이벤트와 불완전 persistence metadata가 다시 수용되지 않는다.
- version, snapshot sequence, persisted-result discriminator가 독립 optional 값이 아니라 결합된 계약임을 고정한다.

#### 이 커밋이 보장하지 않는 것

- 실제 WebSocket 연결이나 재전송 순서를 시험하지 않는다.
- 프로토콜 버전 2와 같은 향후 호환 정책은 정의하지 않는다.

#### 전후 관계

초기 `60c38090effc`의 이벤트 범위를 versioned·monotonic·persistence-aware 계약으로 강화한다.

#### 증거 성격

- 고위험 negative protocol regression
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
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
#### 역사적 복원

이전 공유 HTTP 스키마는 주요 DTO와 일부 요청을 검증했지만, 모든 라우트가 동일한 params/query/body 틀을 갖지는 않았다. 입력이 없다고 가정한 위치는 unknown query나 body를 조용히 무시할 여지가 있었다.

이 커밋은 `defineHttpRequestContract`를 통해 세 입력 영역을 하나의 계약으로 만들고, 입력이 없는 라우트도 `emptyHttpRequestContract`로 명시한다. UUID 경로를 쓰는 라우트는 `idHttpRequestContract`를 재사용한다. 각 object가 strict이므로 정의되지 않은 키는 strip되지 않고 validation failure가 된다.

소유권은 공유 패키지에 있다. API는 라우트별 schema를 재정의하지 않고 이 계약을 소비해야 한다. 그러나 이 SHA는 계약 정의만 추가하므로 실제 라우트 적용 누락 가능성은 남는다.

#### 이 커밋이 보장하는 것

- 모든 JSON 라우트의 외부 입력 표면이 열거되고 unknown field 정책이 fail-closed가 된다.
- 입력이 없는 params/query/body도 검증 대상이라는 규칙을 세운다.

#### 이 커밋이 보장하지 않는 것

- API handler가 계약을 반드시 호출한다는 보장은 아직 없다.
- 응답 schema 적용이나 비즈니스 authorization까지 대신하지 않는다.

#### 전후 관계

`59d75fddcaa6`이 이 공유 계약을 Fastify 라우트 전면에 연결하며, `1abbf7dcdde4`가 누락 여부를 표 기반으로 보호한다.

#### 증거 성격

- 실행 계약 정의; 후속 integration 검증 필요
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
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
#### 역사적 복원

직전 상태에서는 모든 strict contract가 공유 패키지에 있었지만 라우트가 개별적으로 body만 parse하거나 입력을 직접 읽을 수 있었다. 즉 schema 정의와 실제 trust boundary 사이에 적용 공백이 있었다.

`parseHttpRequest`는 Fastify request의 params, query, body를 라우트별 공유 contract에 한 번에 넣고, 성공한 값만 handler에 반환한다. `app.ts`의 JSON 라우트들은 저장소나 GameHub를 호출하기 전에 이 함수를 거친다. 파싱 실패는 공통 typed 오류 경계에서 `validation_error`와 400 응답으로 정규화된다.

이 수정으로 검증 책임은 handler 내부의 임시 검사에서 하나의 HTTP boundary helper로 이동한다. unknown query/body가 조용히 버려지지 않으며 invalid path parameter가 저장소 호출 전에 차단된다.

#### 이 커밋이 보장하는 것

- 모든 당시 JSON 라우트의 params/query/body가 공유 strict contract를 통과한 뒤에만 비즈니스 로직에 도달한다.
- 검증 실패 응답이 공통 오류 envelope로 수렴한다.

#### 이 커밋이 보장하지 않는 것

- handler 이후의 도메인 authorization이나 DB constraint를 대체하지 않는다.
- 새 라우트가 후속에 추가될 때 자동으로 contract 적용을 강제하는 타입 수준 증명은 아니다.

#### 전후 관계

`d07056e11871`의 정의-적용 공백을 수정하고, `1abbf7dcdde4`가 라우트 목록 전체를 회귀 테스트한다.

#### 증거 성격

- 실제 API 신뢰 경계 수정
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
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
#### 역사적 복원

이 테스트는 특정 helper의 단위 동작이 아니라 라우트 등록 결과를 Fastify injection으로 통과한다. 각 JSON endpoint에 unknown query 또는 body field를 넣고 동일한 validation envelope를 요구한다.

invalid UUID와 같은 path 오류도 handler의 저장소 호출보다 먼저 실패해야 한다. 이 방식은 `parseHttpRequest`를 추가하고도 특정 라우트에서 호출을 빠뜨리는 회귀를 잡는다.

`X-Forwarded-For` 사례는 proxy trust가 없는 환경에서 외부 헤더를 주소 권한의 근거로 삼지 않는다는 별도 입력 경계도 고정한다.

#### 이 커밋이 보장하는 것

- 당시 JSON route set 전체의 strict 적용 누락을 탐지한다.
- unknown field와 invalid path가 공통 400 오류로 수렴함을 증명한다.

#### 이 커밋이 보장하지 않는 것

- 라우트의 성공 응답 의미나 DB side effect 전체를 검증하지 않는다.
- 후속 신규 라우트는 표에 추가되지 않으면 자동으로 포함되지 않는다.

#### 전후 관계

`d07056e11871` → `59d75fddcaa6`의 Contract → Apply 흐름을 회귀 증거로 닫는다.

#### 증거 성격

- table-driven API boundary integration regression
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
<!-- ANSWER:1abbf7dcdde4:end -->


## Thread-level invariant evolution

다음 표에서 불변식이 도입·확장·교정·검증된 SHA를 구분합니다.

<!-- ANSWER:thread-01-invariants:begin -->
### 복원 결과

| SHA | 변화 | 불변식 |
| --- | --- | --- |
| `60c38090effc` | 도입 | 초기 WebSocket client-event vocabulary가 runtime parser와 표 기반 사례로 고정된다. |
| `78cf83f29e80` | 확장 | HTTP 요청·응답의 인증·식별자·mutation 값 경계가 executable schema test가 된다. |
| `f655969b0d36` | 강화 | version·snapshot sequence·persisted result 조합이 구형 shape를 fail-closed로 거부한다. |
| `d07056e11871` | 정의 확대 | 모든 JSON route의 params/query/body가 strict contract로 열거된다. |
| `59d75fddcaa6` | 적용 수정 | 공유 contract가 실제 Fastify handler 앞의 단일 `parseHttpRequest` 경계로 이동한다. |
| `1abbf7dcdde4` | 회귀 보호 | route table 전체가 unknown/invalid input을 공통 400 envelope로 거부한다. |

각 변화는 이전 커밋의 최종 상태를 다음 커밋이 단순 반복한 것이 아니라, 새 경계를 도입·확장·교정하거나 regression으로 보호한 시점을 나타냅니다.
<!-- ANSWER:thread-01-invariants:end -->

## Failure → Fix → Test 관계

구현 추가를 독립 기능으로 나열하지 말고, 이전 가정과 실제 실패 위험, 수정된 결정, 회귀 증거를 연결합니다.

<!-- ANSWER:thread-01-failure-relations:begin -->
### 복원 결과

| Failure / 이전 가정 | Fix / 결정 | Verification |
| --- | --- | --- |
| strict schema 정의만 존재 | `59d75fddcaa6` — route 전면 runtime 적용 | `1abbf7dcdde4` — table-driven route regression |
| version migration 중 구형 shape 재수용 위험 | `f655969b0d36`의 negative cases로 직접 차단 | 동일 커밋의 parser regression |
| 입력이 없는 route가 unknown query/body를 무시할 가능성 | `d07056e11871`의 strict empty contract | `1abbf7dcdde4`의 unknown field 주입 |
<!-- ANSWER:thread-01-failure-relations:end -->

## Ownership·state·responsibility 변화

자원과 상태를 누가 만들고, 보유하고, 이전하고, 정리하는지 커밋 순서에 따라 정리합니다.

<!-- ANSWER:thread-01-ownership:begin -->
### 복원 결과

| 대상 | 소유자 | 책임·수명 |
| --- | --- | --- |
| Wire/HTTP contract | `packages/shared` | request·response·client/server event의 executable shape와 version을 소유한다. |
| HTTP trust boundary | `apps/api/src/httpBoundary.ts` | Fastify raw params/query/body를 parse한 값으로 변환하거나 handler 진입 전에 종료한다. |
| Route coverage evidence | API contract test table | 새·기존 JSON route의 적용 누락을 회귀로 탐지한다. |
| Domain logic | route handler/repository/GameHub | 이미 검증된 값을 소비하되 authorization·transaction invariant는 별도로 소유한다. |
<!-- ANSWER:thread-01-ownership:end -->

## 최종 Thread 상태

최종 HEAD를 과거 커밋에 투영하지 말고, 위 SHA 순서에서 도달한 보장을 요약합니다.

<!-- ANSWER:thread-01-final-state:begin -->
### 최종 상태

- WebSocket와 HTTP의 외부 shape는 공유 runtime schema가 소유한다.
- 모든 당시 JSON API route는 strict params/query/body를 business logic 전에 parse한다.
- version 없는 realtime event, sequence 없는 snapshot, 불완전 persisted result, unknown HTTP field는 fail-closed로 종료된다.
- schema unit test와 route integration test가 분리되어 contract 자체 오류와 적용 누락을 각각 탐지한다.
<!-- ANSWER:thread-01-final-state:end -->

## 최종 architecture / execution flow

실제 caller→boundary→state transition→cleanup 흐름을 순서대로 작성합니다.

<!-- ANSWER:thread-01-flow:begin -->
### 최종 실행 흐름

1. 외부 JSON/HTTP 입력 수신
2. 공유 strict schema 선택
3. version·discriminator·params/query/body runtime parse
4. 실패 시 공통 protocol/HTTP validation error
5. 성공한 typed value만 handler로 전달
6. route-wide regression이 누락·unknown field를 보호
<!-- ANSWER:thread-01-flow:end -->

## 학습 완료 확인

<!-- ANSWER:thread-01-checks:begin -->
### 완료 확인

- [x] 초기 unversioned event와 version-1 event의 차이를 예로 설명할 수 있다.
- [x] Zod object가 strict하지 않을 때 unknown key가 왜 위험한지 해당 route 적용 흐름으로 설명할 수 있다.
- [x] `d070...`만으로 완료가 아니며 `59d...`가 필요한 이유를 설명할 수 있다.
- [x] `1abb...`가 무엇을 증명하고 신규 route 자동 포괄은 왜 보장하지 않는지 설명할 수 있다.

체크는 repository code inspection을 통해 설명이 문서에 작성되었음을 뜻합니다. 실제 repository test suite 실행 완료를 뜻하지 않습니다.
<!-- ANSWER:thread-01-checks:end -->

## 실행 증거 기록

<!-- ANSWER:thread-01-execution:begin -->
- Historical inspection: 각 참조 SHA의 GitHub commit diff와 변경 파일을 개별 조회했습니다.
- Repository test execution: 실행하지 않았습니다. 로컬 환경에서 지정 branch의 전체 checkout을 materialize하지 못해 pnpm, PostgreSQL, Playwright, k6, Toxiproxy 명령 결과를 만들 수 없었습니다.
- Runtime claims: 기록하지 않았습니다. 위의 `증거 성격`은 test 구현과 production code path에 대한 정적·역사적 검사입니다.
- Artifact validation: scaffold/completed 대응, fixed metadata, answer completion, SHA uniqueness, Markdown fence, ZIP 구조는 로컬 검증 스크립트로 검사했습니다.
<!-- ANSWER:thread-01-execution:end -->
