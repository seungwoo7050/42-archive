# Browser HTTP adapter·runtime validation·cookie credentials

- 카테고리: `06-browser-application-architecture` — 브라우저 애플리케이션 아키텍처
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

여러 화면이 공유하는 HTTP adapter를 만들고 body/header 규칙, structured error, runtime response parsing, AbortSignal, HttpOnly cookie와 one-time WebSocket ticket 경계로 발전시키는 과정을 복원합니다.

### 직접 연결되는 불변식

- durable session credential은 browser JavaScript가 저장하거나 읽지 않고 `credentials: "include"`로 cookie를 전달합니다.
- 성공 응답도 shared runtime schema를 통과해야 하며 malformed payload를 TypeScript 단언만으로 성공 처리하지 않습니다.
- body가 없는 request에는 adapter가 임의로 JSON content type을 붙이지 않습니다.
- WebSocket 연결은 durable credential 대신 짧은 수명의 one-time ticket을 AbortSignal과 함께 요청합니다.

## 2. 핵심 질문

- 초기 `apiFetch`가 request header, credential, generic response를 어떤 가정으로 처리합니까?
- body 없는 request와 caller-supplied header가 `Headers`에서 어떻게 보존됩니까?
- cookie-only 전환에서 token helper, Authorization header, WebSocket URL이 어떻게 제거됩니까?
- schema violation, structured API error, 401 session expiry, request abort가 각각 어떤 branch로 나뉩니까?

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
| 1 | `20618b30eda9` | `feat(web): 인증 API client 구현` | B | AUTH, REALTIME, TOURNAMENT | authentication과 초기 read model용 공통 browser HTTP adapter를 구현합니다. |
| 2 | `bfae9539cfe5` | `feat(web): 사용자 동작용 API 함수 추가` | B | TOURNAMENT, WEB | tournament join, profile/friend, admin mutation adapter를 추가합니다. |
| 3 | `177fa0b8502a` | `fix(web): body 없는 요청에서 JSON header 제외` | B | AUTH, WEB | body 없는 요청에서 JSON content type을 선언하지 않도록 request header construction을 수정합니다. |
| 4 | `4bc5bba93c4a` | `test(web): API client 동작 검증` | B | AUTH, PROTOCOL, WEB | request headers/body, response parsing, error, abort behavior를 검증합니다. |
| 5 | `353ca9a17415` | `fix(web): browser token 저장 제거` | A | AUTH, PROTOCOL, REALTIME | browser-managed durable token을 제거하고 cookie-only HTTP 및 one-time WebSocket ticket 경계로 전환합니다. |
| 6 | `2aa5fbca9890` | `test(web): cookie 기반 API 경계 검증` | B | AUTH, REALTIME, WEB | cookie-only와 runtime-validated browser API 경계를 확장 검증합니다. |

## 5. Commit별 학습 기록

### 5.1. `feat(web): 인증 API client 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `20618b30eda9` |
| Importance | B |
| Tags | AUTH, REALTIME, TOURNAMENT |
| Source에서 확정된 역할 | authentication과 초기 read model용 공통 browser HTTP adapter를 구현합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/lib/api.ts`의 `API_BASE`, token storage helper, generic `apiFetch<T>`를 확인합니다.
- `fetch` option의 `credentials`, `Authorization`, `Content-Type` 설정 조건을 확인합니다.
- `devLogin`, `getMe`, `getLobby`, `getDashboard`, `getLeaderboard`, `getTournaments`의 반환 타입과 fallback을 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 각 화면이 HTTP request를 직접 만들거나 아직 sample data만 사용했고 공통 인증·오류 처리가 없었습니다. |
| 해결하려던 문제 | 중복 request 설정을 줄이고 초기 service endpoint를 typed helper로 노출할 adapter가 필요했습니다. |
| 핵심 결정 | `apiFetch<T>`를 만들고 localStorage token, `credentials: "include"`, JSON header, generic response cast를 한곳에 결합했습니다. |
| 입력 → 상태 전이 → 출력 | helper 호출 → localStorage token 조회 → fetch → non-OK error → `response.json() as T` 반환 순서입니다. |
| ownership/lifetime/cleanup | browser localStorage가 durable token을, adapter가 request construction을 소유합니다. in-flight request cancellation은 없습니다. |
| failure/rollback/retry | 모든 request에 JSON header를 붙이고 성공 payload를 runtime 검증하지 않습니다. 일부 read helper는 실패 시 sample data를 반환합니다. |
| 보장하는 것 | 초기 endpoint 호출 방식과 오류 throw를 한 모듈로 통합합니다. |
| 보장하지 않는 것 | credential 노출 방지, body별 header 정확성, malformed response 거부는 보장하지 않습니다. |
| 후속 연결 | `177fa0b8502a`가 header 규칙을 고치고 `353ca9a17415`가 credential·parsing 경계를 재설계합니다. |

#### 비교 기준

- 이 commit의 parent를 `git show 20618b30eda9^` 및 `git diff 20618b30eda9^ 20618b30eda9`로 비교합니다.
- Thread 내 다음 관련 SHA: `bfae9539cfe5` — `feat(web): 사용자 동작용 API 함수 추가`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.2. `feat(web): 사용자 동작용 API 함수 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `bfae9539cfe5` |
| Importance | B |
| Tags | TOURNAMENT, WEB |
| Source에서 확정된 역할 | tournament join, profile/friend, admin mutation adapter를 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `api.ts`의 `joinTournament`, `getProfile`, `requestFriend`, `setUserStatus` path/method/body를 확인합니다.
- 각 helper가 기존 generic `apiFetch`의 token/header/response 가정을 그대로 상속하는지 확인합니다.
- route parameter와 mutation body가 URL encoding 또는 JSON serialization되는 위치를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 공통 adapter는 login과 read model만 지원해 profile, tournament, admin UI가 실제 action을 보낼 수 없었습니다. |
| 해결하려던 문제 | 화면별 user intent를 동일한 request/error 규칙으로 연결할 endpoint helper가 필요했습니다. |
| 핵심 결정 | 동적 path와 JSON body를 조립하는 helper를 추가하고 기존 `apiFetch`를 재사용했습니다. |
| 입력 → 상태 전이 → 출력 | page action → endpoint helper → `apiFetch` → typed response 반환 순서입니다. |
| ownership/lifetime/cleanup | adapter가 endpoint URL/method/body serialization을 소유하고 screen은 user intent와 local feedback을 소유합니다. |
| failure/rollback/retry | 기반 adapter의 unchecked response와 browser token 문제는 그대로 전파됩니다. |
| 보장하는 것 | profile/friend, tournament, admin action을 한 공통 HTTP boundary로 보냅니다. |
| 보장하지 않는 것 | mutation invalidation, abort, runtime schema는 아직 보장하지 않습니다. |
| 후속 연결 | `051eac1b4aee`, `bfea82733512`, `a4f665fd2999`가 이 helper를 화면에 연결합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `20618b30eda9` — `feat(web): 인증 API client 구현`
- Thread 내 다음 관련 SHA: `177fa0b8502a` — `fix(web): body 없는 요청에서 JSON header 제외`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.3. `fix(web): body 없는 요청에서 JSON header 제외`

| 항목 | 값 |
| --- | --- |
| SHA | `177fa0b8502a` |
| Importance | B |
| Tags | AUTH, WEB |
| Source에서 확정된 역할 | body 없는 요청에서 JSON content type을 선언하지 않도록 request header construction을 수정합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apiFetch`가 plain object 대신 `Headers`를 생성하는 변경을 확인합니다.
- `init.body !== undefined`와 caller-supplied `content-type` 조건을 확인합니다.
- Authorization header 추가가 content type 조건과 독립적인지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 초기 adapter는 GET과 body 없는 POST에도 `Content-Type: application/json`을 무조건 붙였습니다. |
| 해결하려던 문제 | 실제 body representation과 header가 불일치하면 preflight/cache/server parsing 동작을 불필요하게 바꿀 수 있었습니다. |
| 핵심 결정 | caller header를 `Headers`로 정규화하고 body가 있으면서 content type이 없을 때만 JSON을 설정했습니다. |
| 입력 → 상태 전이 → 출력 | request init → `Headers(init.headers)` → 조건부 JSON header → 조건부 Authorization → fetch 순서입니다. |
| ownership/lifetime/cleanup | adapter가 최종 header set을 소유하지만 caller가 명시한 content type은 보존합니다. |
| failure/rollback/retry | body가 문자열이라고 해서 항상 JSON인지 검증하지 않으며 runtime response cast 문제도 남습니다. |
| 보장하는 것 | body 없는 request가 JSON payload를 보낸다고 거짓 선언하지 않습니다. |
| 보장하지 않는 것 | cookie-only credential과 response schema 검증은 보장하지 않습니다. |
| 후속 연결 | `4bc5bba93c4a`가 이 규칙을 unit test로 고정하고 `353ca9a17415`가 token을 제거합니다. |

#### Fix 복원

| 항목 | 근거 |
| --- | --- |
| 이전 가정 | 공통 API request는 모두 JSON이라고 가정했습니다. |
| 실제 실패/위험 | GET/body-less POST까지 JSON content type을 선언해 request 의미가 실제 body와 불일치합니다. |
| 근본 원인 | header construction이 body 존재 여부와 분리되어 있었습니다. |
| 수정된 불변식 | adapter는 body가 있을 때만 기본 JSON content type을 추가하고 caller 값을 덮지 않습니다. |
| 회귀 근거 | `4bc5bba93c4a`의 header test가 후속 증거입니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `bfae9539cfe5` — `feat(web): 사용자 동작용 API 함수 추가`
- Thread 내 다음 관련 SHA: `4bc5bba93c4a` — `test(web): API client 동작 검증`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.4. `test(web): API client 동작 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `4bc5bba93c4a` |
| Importance | B |
| Tags | AUTH, PROTOCOL, WEB |
| Source에서 확정된 역할 | request headers/body, response parsing, error, abort behavior를 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/lib/api.test.ts`의 fake Storage와 mocked fetch setup을 확인합니다.
- token/credentials/header/body, non-OK error, endpoint envelope test가 실제 어떤 production helper를 호출하는지 확인합니다.
- 당시 test가 runtime schema가 아니라 JSON object equality만 확인하는 한계를 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | adapter의 token·header·error 규칙이 code inspection에만 의존했습니다. |
| 해결하려던 문제 | 공통 helper의 작은 변경이 모든 browser endpoint에 퍼지므로 deterministic regression이 필요했습니다. |
| 핵심 결정 | storage와 fetch를 mock하고 대표 endpoint를 통해 request init과 반환/error를 관찰했습니다. |
| 입력 → 상태 전이 → 출력 | test helper 호출 → mocked fetch call 기록 → URL/init/return 또는 rejection assertion 순서입니다. |
| ownership/lifetime/cleanup | test가 mock lifecycle을 소유하고 production adapter는 실제 branch를 그대로 실행합니다. |
| failure/rollback/retry | 네트워크/browser cookie stack은 실행하지 않으며 당시 token storage 자체를 올바른 계약으로 전제합니다. |
| 보장하는 것 | 초기 adapter의 header/body/credential/error behavior를 deterministic하게 고정합니다. |
| 보장하지 않는 것 | malformed successful payload 거부와 cookie-only 인증은 증명하지 않습니다. |
| 후속 연결 | `353ca9a17415`가 전제를 바꾸므로 `2aa5fbca9890`에서 test contract도 다시 작성됩니다. |

#### Test 복원

| 항목 | 근거 |
| --- | --- |
| 검증 대상 production 불변식 | 공통 adapter가 당시 정의된 token, credentials, header, error 규칙을 모든 helper에 적용합니다. |
| 재현한 실패/경계 | body 없는 request의 header, non-OK response, endpoint envelope 처리입니다. |
| 테스트 기법 | fake Storage와 mocked `fetch` call inspection입니다. |
| 증명하는 것 | browser-independent deterministic request construction을 증명합니다. |
| 증명하지 않는 것 | 실제 cookie 보안 속성, server runtime schema, browser CORS 동작은 증명하지 않습니다. |
| 검증 분류 | adapter 단위 회귀 테스트 |

> 실행 상태: 이 workbook 작성 환경에서는 repository test command를 실행하지 않았습니다. 위 내용은 해당 SHA의 test source와 production path를 정적 조사해 복원한 것이며 pass 결과를 주장하지 않습니다.

#### 비교 기준

- Thread 내 직전 관련 SHA: `177fa0b8502a` — `fix(web): body 없는 요청에서 JSON header 제외`
- Thread 내 다음 관련 SHA: `353ca9a17415` — `fix(web): browser token 저장 제거`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.5. `fix(web): browser token 저장 제거`

| 항목 | 값 |
| --- | --- |
| SHA | `353ca9a17415` |
| Importance | A |
| Tags | AUTH, PROTOCOL, REALTIME |
| Source에서 확정된 역할 | browser-managed durable token을 제거하고 cookie-only HTTP 및 one-time WebSocket ticket 경계로 전환합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/lib/api.ts`에서 token storage/get/set와 Authorization header가 제거되는지 확인합니다.
- `apiFetch`의 shared schema parameter, `safeParse`/parse failure, `ApiError`, session-expired event를 확인합니다.
- `requestWsTicket(signal)`과 play/lobby socket URL이 raw session token 대신 ticket을 사용하는지 확인합니다.
- ticket request의 `AbortController`, 교체 시 abort, stale completion 방지 경로를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | durable session token을 localStorage에서 JavaScript가 읽고 HTTP Authorization과 WebSocket query에 재사용했습니다. 성공 응답도 generic cast만 거쳤습니다. |
| 해결하려던 문제 | XSS가 durable credential을 읽을 수 있고, WebSocket URL에 장기 credential이 노출되며, malformed success payload가 내부 state로 들어오는 복합 위험이 있었습니다. |
| 핵심 결정 | HTTP는 HttpOnly cookie만 전달하고, WebSocket은 authenticated HTTP로 받은 짧은 one-time ticket을 사용하며, 모든 성공 응답을 shared runtime schema로 검증하도록 바꿨습니다. |
| 입력 → 상태 전이 → 출력 | endpoint helper → `apiFetch(path, schema, init)` → cookie 포함 fetch → non-OK structured `ApiError` 또는 schema parse → typed value; socket은 `requestWsTicket(signal)` → ticket URL → 연결 순서입니다. |
| ownership/lifetime/cleanup | browser는 durable credential을 소유하지 않습니다. adapter가 response trust boundary와 session-expired event를, caller/client가 AbortController와 socket lifetime을 소유합니다. |
| failure/rollback/retry | 401은 session-expired event를 발생시키고 structured error를 보존합니다. abort는 caller가 구분할 수 있게 전달합니다. schema mismatch는 성공으로 반환하지 않습니다. |
| 보장하는 것 | JavaScript가 durable session secret을 저장하지 않고 HTTP/WS credential 역할이 분리되며 successful response shape가 runtime에 강제됩니다. |
| 보장하지 않는 것 | server가 cookie/ticket을 안전하게 발급·소비하는지 자체적으로 증명하지 않으며, 모든 caller가 event를 올바르게 처리한다는 보장도 없습니다. |
| 후속 연결 | `2aa5fbca9890`이 schema, error, abort, 모든 endpoint helper를 새 계약으로 검증하고 transport Thread가 ticket cancellation을 더 깊게 다룹니다. |

#### A-level 불변식 종합

- **핵심 책임:** browser-managed durable token을 제거하고 cookie-only HTTP 및 one-time WebSocket ticket 경계로 전환합니다.
- **실패 영향:** XSS가 durable credential을 읽을 수 있고, WebSocket URL에 장기 credential이 노출되며, malformed success payload가 내부 state로 들어오는 복합 위험이 있었습니다.
- **결과 불변식:** JavaScript가 durable session secret을 저장하지 않고 HTTP/WS credential 역할이 분리되며 successful response shape가 runtime에 강제됩니다.
- **남은 제한:** server가 cookie/ticket을 안전하게 발급·소비하는지 자체적으로 증명하지 않으며, 모든 caller가 event를 올바르게 처리한다는 보장도 없습니다.

#### Fix 복원

| 항목 | 근거 |
| --- | --- |
| 이전 가정 | localStorage token 하나를 HTTP와 WebSocket에 재사용해도 된다고 가정했습니다. |
| 실제 실패/위험 | durable credential이 JavaScript와 URL에 노출되고 successful payload도 검증되지 않았습니다. |
| 근본 원인 | session identity, realtime admission, response typing을 한 browser token/generic cast에 결합했습니다. |
| 수정된 불변식 | durable identity는 HttpOnly cookie, realtime admission은 one-time ticket, response trust는 runtime schema가 각각 소유합니다. |
| 회귀 근거 | `2aa5fbca9890`의 cookie/schema/AbortSignal table-driven tests입니다. |

#### 핵심 코드 근거

| 항목 | 값 |
| --- | --- |
| SHA | `353ca9a17415` |
| 파일 | `apps/web/src/lib/api.ts` |
| 함수/위치 | `apiFetch / requestWsTicket` |
| 근거 요약 | HTTP 요청은 `credentials: "include"`를 사용하고 성공 payload는 endpoint별 schema로 parse합니다. `requestWsTicket`은 선택적 `AbortSignal`을 그대로 fetch에 전달합니다. |

#### 비교 기준

- Thread 내 직전 관련 SHA: `4bc5bba93c4a` — `test(web): API client 동작 검증`
- Thread 내 다음 관련 SHA: `2aa5fbca9890` — `test(web): cookie 기반 API 경계 검증`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.6. `test(web): cookie 기반 API 경계 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `2aa5fbca9890` |
| Importance | B |
| Tags | AUTH, REALTIME, WEB |
| Source에서 확정된 역할 | cookie-only와 runtime-validated browser API 경계를 확장 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `api.test.ts`에서 Authorization header 부재와 `credentials: "include"`를 확인합니다.
- schema-invalid 2xx, structured non-2xx, 401 session-expired event, aborted fetch를 각각 확인합니다.
- `it.each` endpoint table이 모든 helper의 runtime parsing과 signal 전달을 실행하는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | production adapter는 cookie/schema/ticket 경계로 바뀌었지만 기존 token 중심 test는 새 불변식을 충분히 설명하지 못했습니다. |
| 해결하려던 문제 | 보안 전환의 성공 조건과 negative branch를 각 endpoint에서 deterministic하게 고정해야 했습니다. |
| 핵심 결정 | mocked fetch 응답을 success, malformed success, structured error, abort로 바꾸고 모든 endpoint helper를 table-driven 방식으로 호출했습니다. |
| 입력 → 상태 전이 → 출력 | helper call → mocked response/signal → schema parse 또는 `ApiError`/abort → event 및 call init assertion 순서입니다. |
| ownership/lifetime/cleanup | test가 fetch mock과 event listener를 소유하며 production adapter의 실제 parse/error branch를 실행합니다. |
| failure/rollback/retry | 실제 browser cookie jar와 server ticket consumption은 실행하지 않습니다. mocked fetch가 전달 계약만 증명합니다. |
| 보장하는 것 | Authorization 부재, cookie 전달, schema fail-closed, structured error, session expiry, AbortSignal forwarding을 증명합니다. |
| 보장하지 않는 것 | cross-origin deployment와 실제 WebSocket handshake 성공은 증명하지 않습니다. |
| 후속 연결 | 이 test가 Thread의 cookie-only adapter invariant를 회귀로 보호합니다. |

#### Test 복원

| 항목 | 근거 |
| --- | --- |
| 검증 대상 production 불변식 | HTTP credential은 cookie이며 successful payload는 endpoint schema를 통과하고 request cancellation이 caller signal을 따릅니다. |
| 재현한 실패/경계 | malformed 2xx, structured error, 401, abort, endpoint별 잘못된 envelope입니다. |
| 테스트 기법 | mocked fetch, event listener, table-driven endpoint helper 호출입니다. |
| 증명하는 것 | adapter 내부의 fail-closed parsing과 request init을 deterministic하게 증명합니다. |
| 증명하지 않는 것 | 실제 Set-Cookie 속성, CORS, server-side ticket one-time consumption은 증명하지 않습니다. |
| 검증 분류 | runtime contract·boundary unit regression |

> 실행 상태: 이 workbook 작성 환경에서는 repository test command를 실행하지 않았습니다. 위 내용은 해당 SHA의 test source와 production path를 정적 조사해 복원한 것이며 pass 결과를 주장하지 않습니다.

#### 비교 기준

- Thread 내 직전 관련 SHA: `353ca9a17415` — `fix(web): browser token 저장 제거`
- 이 SHA가 이 Thread의 마지막 고정 commit입니다.
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

## 6. 불변식 발전 기록

| 단계 | 관련 SHA | 학습 기록 |
| --- | --- | --- |
| 공통 adapter 도입 | `20618b30eda9` | request construction은 통합됐지만 browser token과 unchecked cast를 사용했습니다. |
| endpoint surface 확장 | `bfae9539cfe5` | profile/tournament/admin action도 같은 불완전한 adapter 계약을 공유했습니다. |
| header 의미 교정 | `177fa0b8502a` → `4bc5bba93c4a` | body 유무와 JSON header가 일치하고 초기 regression test가 생겼습니다. |
| credential·trust 경계 재설계 | `353ca9a17415` | HttpOnly cookie, one-time WS ticket, runtime schema, structured error로 역할을 분리했습니다. |
| 새 경계 검증 | `2aa5fbca9890` | negative schema/error/abort와 모든 endpoint helper가 새 invariant에 맞는지 고정했습니다. |

## 7. Failure → Fix → Test 관계

| 이전 상태/가정 | 실패 또는 위험 | Fix 연결 | Test/후속 근거 | 관계 해설 |
| --- | --- | --- | --- | --- |
| 모든 request에 JSON header | body 없는 요청 의미 불일치 | `177fa0b8502a` | `4bc5bba93c4a` | 모든 request에 JSON header → body 없는 요청 의미 불일치 → `177fa0b8502a` → `4bc5bba93c4a` |
| localStorage bearer token과 unchecked cast | durable credential 노출·malformed success 수용 | `353ca9a17415` | `2aa5fbca9890` | localStorage bearer token과 unchecked cast → durable credential 노출·malformed success 수용 → `353ca9a17415` → `2aa5fbca9890` |
| ticket request가 교체 중 완료 | stale socket 생성 가능 | `353ca9a17415`에서 AbortSignal 도입, transport client에서 generation fencing | `b5691b01a09b` | ticket request가 교체 중 완료 → stale socket 생성 가능 → `353ca9a17415`에서 AbortSignal 도입, transport client에서 generation fencing → `b5691b01a09b` |

## 8. Ownership·state·lifetime 변화

| 대상 | 이전 owner/state | 이후 owner/state | 수명/cleanup |
| --- | --- | --- | --- |
| durable session | browser localStorage | HttpOnly cookie/server | session cookie lifetime |
| HTTP request construction | 화면별 또는 초기 generic helper | `apiFetch` | request lifetime |
| response trust | TypeScript generic cast | endpoint별 shared runtime schema | response parse lifetime |
| realtime credential | durable token query | one-time ticket response | 짧은 ticket TTL/한 번 소비 |
| cancellation | 없음 | caller AbortController → fetch signal | caller operation lifetime |

## 9. Thread 최종 상태

마지막 SHA에서 browser HTTP adapter는 durable token을 저장하거나 Authorization으로 재전송하지 않습니다. 모든 request는 cookie를 포함하고 body가 있을 때만 기본 JSON header를 붙이며, 성공 payload도 endpoint별 shared schema로 검증합니다. WebSocket은 abort 가능한 ticket request를 통해 one-time credential을 얻습니다.

### 최종 실행 흐름

1. screen/hook이 endpoint helper를 호출하고 필요하면 `AbortSignal`을 전달합니다.
2. `apiFetch`가 caller headers를 보존하면서 body가 있는 경우에만 기본 JSON content type을 추가합니다.
3. `fetch`는 `credentials: "include"`로 HttpOnly cookie를 자동 전달합니다.
4. non-OK 응답은 structured `ApiError`로 변환되고 401은 session-expired event를 발생시킵니다.
5. 2xx payload는 shared schema를 통과해야 typed value가 caller에 반환됩니다.
6. realtime caller는 `requestWsTicket(signal)` 결과의 one-time ticket으로 socket을 엽니다.

## 10. 학습 완료 점검

- [x] 모든 commit을 지정 SHA의 parent/diff와 비교했습니다.
- [x] 후속 HEAD 코드를 이전 SHA 설명에 역투영하지 않았습니다.
- [x] owner, lifetime, cleanup, failure branch와 non-guarantee를 기록했습니다.
- [x] fix는 이전 가정과 root cause에, test는 production path와 증명 범위에 연결했습니다.
- [x] A/B importance 깊이를 구분했고 source subject/tag/role을 유지했습니다.
- [x] 실행하지 않은 project test에 pass 결과를 만들지 않았습니다.
