# Resource API와 실행 가능한 HTTP contract

- 카테고리: `01-foundations-and-api-boundaries` — 애플리케이션 기반과 API 경계
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

먼저 assertion과 route-local 오류로 구현된 Fastify resource API가 baseline integration test를 얻고, 이후 shared Zod contract·typed error boundary·route별 input/output validation으로 retrofit되는 과정을 실제 역사 순서대로 복원합니다.

이 문서는 Phase 1 category audit 후 동결된 scaffold를 기준으로 exact SHA의 구현 발전을 복원합니다.

### 직접 연결되는 불변식

- 초기 API route는 repository operation을 transport에 연결하지만 runtime contract는 후속 단계에서 별도로 도입됩니다.
- shared package는 domain/request/response/error schema를 소유하고 API는 request entry와 response exit에서 이를 실행합니다.
- 예상된 client failure와 예상 밖 internal failure는 중앙 boundary에서 machine code, request ID, public message로 분류됩니다.
- 최종 대표 integration tests는 raw token JSON이 아니라 session cookie와 typed response를 기준으로 합니다.

## 2. 핵심 질문

- 초기 assertion/default 기반 route와 최종 strict typed route의 차이를 같은 resource에서 비교할 수 있습니까?
- domain schema, endpoint wrapper schema, request schema, error envelope는 각각 무엇을 검증합니까?
- public read, authenticated mutation, administrator mutation에서 input parse·authorization·repository call·output parse 순서는 어떻게 다릅니까?
- `parseOutput` 실패는 무엇을 막으며 이미 발생한 side effect까지 rollback하지 못하는 이유는 무엇입니까?
- 초기 integration tests와 `50caaf5c7c49`의 credential/response 기대값 변화가 API migration을 어떻게 보여줍니까?

## 3. 완료 기준

- Commit map의 모든 SHA를 지정 브랜치 ancestry에서 확인합니다.
- 각 SHA의 parent 또는 직전 관련 SHA와 비교해 변경 전후 상태를 구분합니다.
- 파일, symbol, caller/callee, 상태 mutation, failure branch, cleanup을 actual historical code로 기록합니다.
- Fix는 이전 가정과 root cause를, test는 production path와 증명/비증명 범위를 연결합니다.
- S/A/B/C 중요도에 맞춰 설명 깊이를 다르게 유지합니다.
- 실행하지 않은 command 결과를 작성하지 않으며 code inspection과 runtime evidence를 구분합니다.
- 마지막 SHA까지만 사용해 Thread 최종 owner, invariant, execution flow를 작성합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Thread 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `1779df300611` | `feat(api): 로그인과 로비 HTTP 경계 구현` | B | AUTH, PERSISTENCE, WEB | 저장소 기반 개발 로그인, 현재 사용자, 로비, 순위 endpoint를 최초 Fastify route로 노출합니다. |
| 2 | `0bcc487d949f` | `feat(api): 프로필과 친구 리소스 라우트 추가` | B | PERSISTENCE | 공개 profile/dashboard와 사용자별 profile update·friendship mutation route를 추가합니다. |
| 3 | `e8bb6a4bf68b` | `feat(api): 토너먼트와 관리자 라우트 추가` | B | AUTH, PERSISTENCE, TOURNAMENT | 토너먼트 생성·참가와 관리자 사용자 조회·상태 변경 route를 추가합니다. |
| 4 | `fb1c287d9e79` | `test(api): 로그인과 로비 조회 검증` | B | PERSISTENCE, TEST | 초기 로그인→현재 사용자와 leaderboard/lobby read 경로를 Fastify injection으로 검증합니다. |
| 5 | `1395d45a3665` | `test(api): 관리자 사용자 상태 변경 검증` | B | AUTH, PERSISTENCE, TEST | 개발 로그인부터 admin ban route와 memory repository 상태 변경까지 초기 관리자 경로를 검증합니다. |
| 6 | `5088099d1e7d` | `test(api): 토너먼트 생성 흐름 검증` | B | AUTH, PERSISTENCE, TOURNAMENT | 인증 사용자 tournament 생성 후 목록에서 다시 읽는 write→read 경로를 검증합니다. |
| 7 | `0c5c27c8c3df` | `feat(shared): 사용자 HTTP runtime contract 정의` | B | PROTOCOL, TOURNAMENT | compile-time user interface를 실행 가능한 Zod schema와 inferred type으로 교체합니다. |
| 8 | `6704f37ca6a3` | `feat(shared): 경기·대시보드 runtime contract 정의` | B | PROTOCOL | match summary, dashboard, leaderboard payload를 실행 가능한 schema로 정의합니다. |
| 9 | `4bace138f188` | `feat(shared): 친구·채팅·로비 runtime contract 정의` | B | PROTOCOL, REALTIME | friendship, chat, lobby stats/aggregate를 runtime schema로 확장합니다. |
| 10 | `7d0793a23f5d` | `feat(shared): 토너먼트·관리 runtime contract 정의` | B | PROTOCOL, TOURNAMENT, OPERATIONS | 토너먼트 aggregate와 관리자 audit response를 runtime schema로 정의합니다. |
| 11 | `282a9d0beb47` | `feat(shared): HTTP 요청·오류 schema 정의` | B | - | route params/body와 공통 API error envelope를 strict schema로 정의합니다. |
| 12 | `e226b68fe235` | `feat(shared): HTTP 응답 runtime contract 정의` | B | AUTH, PROTOCOL, REALTIME | domain validator를 health/auth/user/lobby/tournament/admin endpoint별 response schema로 조합합니다. |
| 13 | `78cf83f29e80` | `test(shared): HTTP contract 검증` | B | AUTH, PROTOCOL, TEST | HTTP schema의 positive/negative shape와 normalization 규칙을 package unit test로 고정합니다. |
| 14 | `ac85316bb0cb` | `feat(api): typed HTTP 오류 boundary 추가` | A | AUTH, PROTOCOL, RISK | Zod 입력 오류, 예상된 API 오류, not-found, 예상 밖 실패를 하나의 Fastify error boundary로 통합합니다. |
| 15 | `c4cba7d3f871` | `feat(api): 인증·사용자 HTTP contract 적용` | B | AUTH, PROTOCOL, WEB | health/auth/user/profile route에 shared input/output schema와 typed error boundary를 적용합니다. |
| 16 | `05e3ecfa2a2d` | `feat(api): 로비·친구 HTTP contract 적용` | B | AUTH, PROTOCOL, PERSISTENCE | lobby/chat/leaderboard/dashboard/friendship route에 runtime input/output validation과 typed failure를 적용합니다. |
| 17 | `24f99345452d` | `feat(api): 토너먼트·관리 HTTP contract 적용` | B | AUTH, TOURNAMENT | 토너먼트와 관리자 route에 request/response schema 및 공통 authorization/error helper를 적용합니다. |
| 18 | `b2a8de5a0027` | `refactor(api): HTTP boundary helper 통합` | B | AUTH | 남은 route-local unauthorized/suspended helper를 제거하고 공통 typed boundary 함수를 직접 사용합니다. |
| 19 | `50caaf5c7c49` | `test(api): typed HTTP boundary 기대값 정렬` | B | AUTH, TOURNAMENT, WEB | 기존 API·관리·토너먼트 통합 test를 HttpOnly cookie와 typed response/error contract에 맞춥니다. |

## 5. Commit별 학습 기록

### 5.1. `feat(api): 로그인과 로비 HTTP 경계 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `1779df300611` |
| Importance | B |
| Tags | AUTH, PERSISTENCE, WEB |
| Source에서 확정된 역할 | 저장소 기반 개발 로그인, 현재 사용자, 로비, 순위 endpoint를 최초 Fastify route로 노출합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/app.ts`에서 CORS/cookie 등록과 `/auth/dev-login`, `/me`, `/lobby`, `/leaderboard` handler를 확인합니다.
- `request.body` type assertion과 fallback, token을 JSON과 cookie로 동시에 반환하는 초기 contract를 기록합니다.
- `getCurrentUser`가 cookie, bearer header, query token을 어떤 우선순위로 읽고 route-local 오류를 만드는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | API package와 bootstrap은 있었지만 외부 요청을 repository operation에 연결하는 HTTP resource가 없었습니다. |
| 해결하려던 문제 | 로그인·현재 사용자·로비 read model을 browser가 사용할 transport 경계가 필요했습니다. |
| 핵심 결정 | Fastify app에 개발 로그인, logout, 사용자 조회, 로비, leaderboard route를 추가하고 repository session을 연결했습니다. |
| 입력 → 상태 전이 → 출력 | 로그인 body를 type assertion으로 읽어 user/session을 만들고 cookie와 JSON token을 반환합니다. 보호 route는 여러 token source를 조회한 뒤 repository에서 사용자를 찾습니다. |
| ownership/lifetime/cleanup | Fastify app이 request/response lifecycle을 소유하고 repository가 session과 data를 소유합니다. app 자체 close는 composition root가 처리합니다. |
| failure/rollback/retry | 입력은 runtime schema를 통과하지 않으며 unauthorized/not-found가 route별 body로 반환됩니다. logout은 이 SHA에서 cookie만 지웁니다. |
| 보장하는 것 | 실제 repository-backed identity와 read model을 HTTP로 호출할 수 있습니다. |
| 보장하지 않는 것 | unknown field, 잘못된 값, output shape, cookie-only credential, 중앙 error envelope는 보장하지 않습니다. |
| 후속 연결 | `0bcc487d949f`와 `e8bb6a4bf68b`가 resource를 확장하고 후속 contract retrofit의 비교 기준이 됩니다. |

#### 최소 코드 근거

`1779df300611`, `apps/api/src/app.ts`의 `buildApp`, `/auth/dev-login`, `getCurrentUser`를 확인했습니다.

비교 기준:
- 이 commit의 parent와 비교합니다.
- 다음 관련 SHA: `0bcc487d949f` — `feat(api): 프로필과 친구 리소스 라우트 추가`

### 5.2. `feat(api): 프로필과 친구 리소스 라우트 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `0bcc487d949f` |
| Importance | B |
| Tags | PERSISTENCE |
| Source에서 확정된 역할 | 공개 profile/dashboard와 사용자별 profile update·friendship mutation route를 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/app.ts`의 `/users/:id`, `/dashboard`, `/profile/:handle`, `/profile/me`, `/friends` 계열을 확인합니다.
- 공개 read와 현재 사용자 mutation이 어떤 session 검사를 거치는지 비교합니다.
- params/body type assertion과 route-local 404·401 응답이 남아 있는지 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 초기 API는 로그인·로비에 한정되어 profile과 social repository operation을 transport로 노출하지 않았습니다. |
| 해결하려던 문제 | 공개 프로필 조회와 현재 사용자 변경, friend request/accept를 서로 다른 권한 수준으로 연결해야 했습니다. |
| 핵심 결정 | 공개 lookup, authenticated dashboard/update, friendship list/request/accept route를 추가했습니다. |
| 입력 → 상태 전이 → 출력 | handler가 params/body를 assertion으로 읽고 session user를 확인한 뒤 해당 repository method를 호출해 JSON을 반환합니다. |
| ownership/lifetime/cleanup | repository가 profile/friend state를 소유하고 Fastify handler는 인증된 caller identity를 operation에 전달합니다. |
| failure/rollback/retry | 잘못된 UUID나 body shape는 handler 이전에 거부되지 않으며 route별 error body가 다를 수 있습니다. |
| 보장하는 것 | 공개 read와 identity-bound mutation의 resource 구분을 API 표면에 만듭니다. |
| 보장하지 않는 것 | 실행 가능한 input/output contract와 중앙 authorization helper는 아직 없습니다. |
| 후속 연결 | `e8bb6a4bf68b`가 고권한 resource를 추가하고 later Zod commits가 같은 route를 retrofit합니다. |

#### 최소 코드 근거

`apps/api/src/app.ts`의 profile/friends handler와 repository 호출 위치를 확인했습니다.

비교 기준:
- 직전 관련 SHA: `1779df300611` — `feat(api): 로그인과 로비 HTTP 경계 구현`
- 다음 관련 SHA: `e8bb6a4bf68b` — `feat(api): 토너먼트와 관리자 라우트 추가`

### 5.3. `feat(api): 토너먼트와 관리자 라우트 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `e8bb6a4bf68b` |
| Importance | B |
| Tags | AUTH, PERSISTENCE, TOURNAMENT |
| Source에서 확정된 역할 | 토너먼트 생성·참가와 관리자 사용자 조회·상태 변경 route를 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/app.ts`의 tournament GET/POST/join과 admin list/ban/status handler를 확인합니다.
- 인증과 admin role 검사 순서, malformed name/reason에 적용되는 초기 default를 확인합니다.
- route-local authorization/error response가 다른 resource와 중복되는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | profile/social route는 있었지만 tournament와 administrator operation은 HTTP에서 호출할 수 없었습니다. |
| 해결하려던 문제 | 일반 authenticated mutation과 관리자 전용 mutation을 같은 app 안에서 구분해야 했습니다. |
| 핵심 결정 | 토너먼트 목록·생성·참가와 관리자 사용자 목록·상태 변경 route를 추가하고 role check를 배치했습니다. |
| 입력 → 상태 전이 → 출력 | handler가 현재 사용자를 조회하고 role/status를 검사한 뒤 repository에 tournament 또는 admin mutation을 요청합니다. |
| ownership/lifetime/cleanup | repository가 tournament/user state를 소유하며 route가 actor identity와 target ID를 전달합니다. |
| failure/rollback/retry | body/params는 assertion과 default에 의존해 malformed input이 의도치 않은 값으로 바뀔 수 있고 error envelope가 통일되지 않습니다. |
| 보장하는 것 | 고권한 resource가 명시적 route와 repository operation을 통해 접근됩니다. |
| 보장하지 않는 것 | handle 기반 초기 admin seed의 안전성, strict input, audit atomicity는 보장하지 않습니다. |
| 후속 연결 | `1395d45a3665`와 `5088099d1e7d`가 초기 경로를 고정하고 후속 contract commit이 validation을 적용합니다. |

#### 최소 코드 근거

`apps/api/src/app.ts`의 tournament/admin route와 role 검사 코드를 확인했습니다.

비교 기준:
- 직전 관련 SHA: `0bcc487d949f` — `feat(api): 프로필과 친구 리소스 라우트 추가`
- 다음 관련 SHA: `fb1c287d9e79` — `test(api): 로그인과 로비 조회 검증`

### 5.4. `test(api): 로그인과 로비 조회 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `fb1c287d9e79` |
| Importance | B |
| Tags | PERSISTENCE, TEST |
| Source에서 확정된 역할 | 초기 로그인→현재 사용자와 leaderboard/lobby read 경로를 Fastify injection으로 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/app.test.ts`의 memory repository setup, `app.ready`, `app.close`, `repo.close` 순서를 확인합니다.
- 로그인 response token을 bearer header로 `/me`에 재사용하는 당시 contract를 확인합니다.
- leaderboard와 lobby 검사가 status와 최소 데이터 존재만 증명하는 범위를 구분합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 초기 route는 구현됐지만 request부터 repository까지 연결되는 자동 검증이 없었습니다. |
| 해결하려던 문제 | route helper가 아니라 실제 Fastify registration, session, memory state가 함께 동작하는 기준이 필요했습니다. |
| 핵심 결정 | 각 test마다 memory repository와 app을 만들고 Fastify injection으로 로그인·현재 사용자·read endpoint를 호출했습니다. |
| 입력 → 상태 전이 → 출력 | `POST /auth/dev-login`이 token을 반환하고 `GET /me`가 이를 bearer로 해석해 같은 handle을 반환합니다. read test는 leaderboard/lobby를 호출합니다. |
| ownership/lifetime/cleanup | test fixture가 app/repository lifetime을 소유하고 `afterEach`에서 둘을 닫습니다. |
| failure/rollback/retry | 실패 injection은 없으며 assertion 실패 시 test가 종료됩니다. 실제 network, cookie agent, PostgreSQL은 사용하지 않습니다. |
| 보장하는 것 | 초기 bearer/token 기반 API의 happy path와 read resource registration을 고정합니다. |
| 보장하지 않는 것 | 입력 rejection, 권한 negative path, output schema, real DB consistency는 증명하지 않습니다. |
| 후속 연결 | 후속 `50caaf5c7c49`가 같은 test를 cookie 기반 typed boundary에 맞춥니다. |

#### 최소 코드 근거

`apps/api/src/app.test.ts`의 `app.inject`와 memory repository fixture가 근거입니다.

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | 로그인 session이 현재 사용자 조회에 연결되고 lobby/leaderboard route가 등록되어야 합니다. |
| 재현하는 failure/boundary | 개발 로그인 후 bearer token으로 `/me`를 호출하고 두 read endpoint가 200과 데이터를 반환하는 경계입니다. |
| test technique | in-process Fastify integration test + memory repository |
| 통과하는 production path | `buildApp` → Fastify route → repository session/read operation → JSON response |
| 증명하는 것 | 당시 초기 API의 대표 happy path와 fixture cleanup을 증명합니다. |
| 증명하지 않는 것 | 실제 socket, browser cookie behavior, PostgreSQL, malformed input을 증명하지 않습니다. |
| 후속 회귀 방지 | 후속 route/contract refactor가 기본 로그인·read 경로를 깨뜨리지 않도록 합니다. |

비교 기준:
- 직전 관련 SHA: `e8bb6a4bf68b` — `feat(api): 토너먼트와 관리자 라우트 추가`
- 다음 관련 SHA: `1395d45a3665` — `test(api): 관리자 사용자 상태 변경 검증`

### 5.5. `test(api): 관리자 사용자 상태 변경 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `1395d45a3665` |
| Importance | B |
| Tags | AUTH, PERSISTENCE, TEST |
| Source에서 확정된 역할 | 개발 로그인부터 admin ban route와 memory repository 상태 변경까지 초기 관리자 경로를 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/admin.test.ts`에서 admin/target login, token 추출, ban request를 확인합니다.
- 관리자 권한이 당시 seed handle에 의존하는지와 target status 결과를 확인합니다.
- 권한 거부·audit·동시성은 이 test가 다루지 않는다는 범위를 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 관리자 route는 있었지만 실제 로그인과 repository mutation을 통과하는 test가 없었습니다. |
| 해결하려던 문제 | route 등록·actor session·target ID·status update가 연결되지 않으면 고권한 기능이 조용히 깨질 수 있었습니다. |
| 핵심 결정 | admin과 target을 dev-login으로 만든 뒤 bearer token으로 ban route를 호출하고 반환 user status를 검사했습니다. |
| 입력 → 상태 전이 → 출력 | 두 로그인 → admin token/target ID 추출 → `POST /admin/users/:id/ban` → memory repository update → banned response 순입니다. |
| ownership/lifetime/cleanup | fixture가 app/repo를 소유·정리하고 repository가 target 상태를 소유합니다. |
| failure/rollback/retry | 권한이 없는 caller와 실패 rollback은 주입하지 않습니다. 당시 admin handle seed 가정을 그대로 사용합니다. |
| 보장하는 것 | 초기 관리자 상태 변경의 end-to-end-in-process happy path를 증명합니다. |
| 보장하지 않는 것 | 명시적 role assignment, audit atomicity, PostgreSQL row effect는 증명하지 않습니다. |
| 후속 연결 | 후속 auth category가 handle privilege를 제거하며 `50caaf5c7c49`가 test fixture를 명시적 seed/cookie 방식으로 갱신합니다. |

#### 최소 코드 근거

`apps/api/src/admin.test.ts`의 두 로그인과 ban injection을 확인했습니다.

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | 인증된 관리자가 대상 계정 상태를 repository를 통해 변경할 수 있어야 합니다. |
| 재현하는 failure/boundary | admin login, target login, bearer authorization, ban mutation, returned status의 연결입니다. |
| test technique | in-process API integration test + memory repository |
| 통과하는 production path | Fastify login routes → session lookup → admin route → repository update → response |
| 증명하는 것 | 당시 admin happy path가 route와 repository를 관통함을 증명합니다. |
| 증명하지 않는 것 | 비관리자 거부, audit record, transaction, real PostgreSQL은 증명하지 않습니다. |
| 후속 회귀 방지 | 관리자 route나 repository signature 변경 시 대표 mutation 회귀를 감지합니다. |

비교 기준:
- 직전 관련 SHA: `fb1c287d9e79` — `test(api): 로그인과 로비 조회 검증`
- 다음 관련 SHA: `5088099d1e7d` — `test(api): 토너먼트 생성 흐름 검증`

### 5.6. `test(api): 토너먼트 생성 흐름 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `5088099d1e7d` |
| Importance | B |
| Tags | AUTH, PERSISTENCE, TOURNAMENT |
| Source에서 확정된 역할 | 인증 사용자 tournament 생성 후 목록에서 다시 읽는 write→read 경로를 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/tournament.test.ts`의 login fixture와 token lifetime을 확인합니다.
- 생성 request가 repository state를 바꾸고 바로 뒤 list request에서 같은 이름을 관찰하는지 확인합니다.
- capacity, duplicate join, bracket transition은 이 test 범위 밖임을 구분합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 토너먼트 route는 구현됐지만 생성 결과가 repository list projection에 반영되는 자동 증거가 없었습니다. |
| 해결하려던 문제 | write response만 성공하고 이후 read에서 사라지는 연결 오류를 탐지할 기준이 필요했습니다. |
| 핵심 결정 | fixture 로그인으로 token을 얻고 tournament 생성 후 공개 list를 호출해 첫 항목 이름을 검사했습니다. |
| 입력 → 상태 전이 → 출력 | login → authenticated create → memory repository mutation → public list → 동일 이름 관찰 순입니다. |
| ownership/lifetime/cleanup | memory repository가 tournament lifetime을 소유하고 fixture가 app/repo를 닫습니다. |
| failure/rollback/retry | 동시 join, persistence durability, rollback failure는 주입하지 않습니다. |
| 보장하는 것 | 초기 tournament write-to-read HTTP contract를 고정합니다. |
| 보장하지 않는 것 | PostgreSQL, transaction, bracket creation, authorization negative path는 증명하지 않습니다. |
| 후속 연결 | 후속 tournament schema/API contract 적용과 `50caaf5c7c49`의 cookie fixture 정렬로 이어집니다. |

#### 최소 코드 근거

`apps/api/src/tournament.test.ts`의 create/list 연속 injection이 근거입니다.

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | 인증된 생성 mutation이 이후 tournament list projection에서 관찰되어야 합니다. |
| 재현하는 failure/boundary | create 성공 후 같은 app/repository에서 list가 생성 이름을 반환하는 경계입니다. |
| test technique | in-process write-to-read integration test + memory repository |
| 통과하는 production path | login → create route → repository create → list route → repository list |
| 증명하는 것 | 초기 route와 memory backend의 observable write/read 연결을 증명합니다. |
| 증명하지 않는 것 | 실제 DB durability, concurrent capacity, bracket 상태 전이는 증명하지 않습니다. |
| 후속 회귀 방지 | API 또는 repository refactor가 생성 데이터를 list에서 잃는 회귀를 막습니다. |

비교 기준:
- 직전 관련 SHA: `1395d45a3665` — `test(api): 관리자 사용자 상태 변경 검증`
- 다음 관련 SHA: `0c5c27c8c3df` — `feat(shared): 사용자 HTTP runtime contract 정의`

### 5.7. `feat(shared): 사용자 HTTP runtime contract 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `0c5c27c8c3df` |
| Importance | B |
| Tags | PROTOCOL, TOURNAMENT |
| Source에서 확정된 역할 | compile-time user interface를 실행 가능한 Zod schema와 inferred type으로 교체합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/shared/src/http.ts`에서 user role/status, UUID, integer 통계, 공개/세션 schema를 확인합니다.
- `z.infer`가 기존 interface 대신 type source가 되는지 확인합니다.
- unknown field 정책과 nested object strictness가 이 SHA에서 어느 수준인지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 초기 API는 TypeScript interface와 assertion만 사용해 runtime JSON을 거부하지 못했습니다. |
| 해결하려던 문제 | 외부·repository 값이 선언된 user shape와 달라도 handler가 그대로 전달할 수 있었습니다. |
| 핵심 결정 | user field를 Zod schema로 정의하고 공개/세션 schema 차이를 유지한 채 type을 schema에서 추론했습니다. |
| 입력 → 상태 전이 → 출력 | producer 또는 consumer가 schema `parse`/`safeParse`를 호출하면 UUID·enum·integer·nullable 조건이 runtime에서 검사됩니다. |
| ownership/lifetime/cleanup | shared package가 user contract의 runtime·compile-time source를 함께 소유합니다. |
| failure/rollback/retry | route가 아직 schema를 호출하지 않으면 보장은 적용되지 않습니다. |
| 보장하는 것 | user shape에 실행 가능한 검증 규칙을 부여하고 type/schema drift를 줄입니다. |
| 보장하지 않는 것 | 다른 domain과 endpoint별 request/response, 중앙 error handling은 아직 없습니다. |
| 후속 연결 | `6704f37ca6a3`부터 나머지 domain을 확장하고 `c4cba7d3f871`이 route에 적용합니다. |

#### 최소 코드 근거

`packages/shared/src/http.ts`의 Zod user schema와 `z.infer` type alias가 근거입니다.

비교 기준:
- 직전 관련 SHA: `5088099d1e7d` — `test(api): 토너먼트 생성 흐름 검증`
- 다음 관련 SHA: `6704f37ca6a3` — `feat(shared): 경기·대시보드 runtime contract 정의`

### 5.8. `feat(shared): 경기·대시보드 runtime contract 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `6704f37ca6a3` |
| Importance | B |
| Tags | PROTOCOL |
| Source에서 확정된 역할 | match summary, dashboard, leaderboard payload를 실행 가능한 schema로 정의합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/shared/src/http.ts`의 match result/mode/date, dashboard stats, leaderboard rank/rate 범위를 확인합니다.
- zero game과 percentage 범위 같은 derived value가 schema에 어떻게 제한되는지 확인합니다.
- nested user schema 재사용을 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | user만 runtime schema였고 match/dashboard/leaderboard는 compile-time shape에 머물렀습니다. |
| 해결하려던 문제 | 복합 read model의 숫자·enum·날짜 값이 잘못돼도 transport 경계에서 탐지되지 않았습니다. |
| 핵심 결정 | 기존 user schema를 조합해 match, dashboard, leaderboard의 runtime constraint를 추가했습니다. |
| 입력 → 상태 전이 → 출력 | aggregate output을 schema에 전달하면 nested user와 통계 범위를 재귀적으로 검사합니다. |
| ownership/lifetime/cleanup | shared가 aggregate shape를 소유하고 repository/API는 값을 생산합니다. |
| failure/rollback/retry | 실제 winRate 계산 정확성이나 repository query는 검사하지 않습니다. |
| 보장하는 것 | 복합 read response의 허용 값 범위를 실행 가능하게 표현합니다. |
| 보장하지 않는 것 | route output parse를 호출하기 전에는 잘못된 producer 결과가 여전히 통과할 수 있습니다. |
| 후속 연결 | `e226b68fe235`가 endpoint response schema를 조합하고 API apply commits가 이를 사용합니다. |

#### 최소 코드 근거

`packages/shared/src/http.ts`의 match/dashboard/leaderboard schema를 확인했습니다.

비교 기준:
- 직전 관련 SHA: `0c5c27c8c3df` — `feat(shared): 사용자 HTTP runtime contract 정의`
- 다음 관련 SHA: `4bace138f188` — `feat(shared): 친구·채팅·로비 runtime contract 정의`

### 5.9. `feat(shared): 친구·채팅·로비 runtime contract 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `4bace138f188` |
| Importance | B |
| Tags | PROTOCOL, REALTIME |
| Source에서 확정된 역할 | friendship, chat, lobby stats/aggregate를 runtime schema로 확장합니다. |

#### 해당 SHA에서 확인할 실제 코드

- friend status와 chat scope/body/date, lobby array와 nullable current user를 확인합니다.
- 중첩 public user schema가 재사용되는지 확인합니다.
- chat body의 transport response shape와 later request body schema를 구분합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | user와 일부 read model만 runtime 검증됐고 social/lobby aggregate는 interface에 머물렀습니다. |
| 해결하려던 문제 | 친구 상태·채팅 범위·로비 통계가 잘못된 값이어도 API response에서 탐지할 방법이 없었습니다. |
| 핵심 결정 | 기존 user schema를 중첩해 friend, chat, lobby response 구성요소를 Zod로 정의했습니다. |
| 입력 → 상태 전이 → 출력 | aggregate parse 시 배열 원소와 nested sender/user, scope, stats가 함께 검사됩니다. |
| ownership/lifetime/cleanup | shared가 response shape를 소유하고 repository/API가 social/lobby data를 생산합니다. |
| failure/rollback/retry | 메시지 저장 권한이나 room scope authorization은 이 schema가 보장하지 않습니다. |
| 보장하는 것 | social·lobby output을 runtime에서 검증할 수 있습니다. |
| 보장하지 않는 것 | endpoint schema와 route 적용, business invariant는 아직 보장하지 않습니다. |
| 후속 연결 | `e226b68fe235`와 `05e3ecfa2a2d`가 endpoint response 및 handler에 연결합니다. |

#### 최소 코드 근거

`packages/shared/src/http.ts`의 friend/chat/lobby schema를 확인했습니다.

비교 기준:
- 직전 관련 SHA: `6704f37ca6a3` — `feat(shared): 경기·대시보드 runtime contract 정의`
- 다음 관련 SHA: `7d0793a23f5d` — `feat(shared): 토너먼트·관리 runtime contract 정의`

### 5.10. `feat(shared): 토너먼트·관리 runtime contract 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `7d0793a23f5d` |
| Importance | B |
| Tags | PROTOCOL, TOURNAMENT, OPERATIONS |
| Source에서 확정된 역할 | 토너먼트 aggregate와 관리자 audit response를 runtime schema로 정의합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 토너먼트 status, participant, bracket nullable field, admin action schema를 확인합니다.
- creator/winner/user nested schema 재사용과 날짜 표현을 확인합니다.
- nullable room/match/score가 lifecycle 단계를 어떻게 표현하는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 초기 tournament/admin route가 반환하는 복합 shape는 runtime schema가 없었습니다. |
| 해결하려던 문제 | bracket lifecycle의 nullable field나 audit actor/target shape가 drift해도 handler가 탐지하지 못했습니다. |
| 핵심 결정 | 토너먼트 summary/bracket과 admin action을 Zod schema로 만들고 shared user/date schema를 조합했습니다. |
| 입력 → 상태 전이 → 출력 | producer output을 parse하면 lifecycle status와 nested participant/audit record shape가 검사됩니다. |
| ownership/lifetime/cleanup | shared가 공개 aggregate의 표현을 소유하며 repository가 실제 상태 전이를 소유합니다. |
| failure/rollback/retry | 중복 bracket, authorization, transaction atomicity는 schema만으로 보장하지 않습니다. |
| 보장하는 것 | 토너먼트·관리 응답의 직렬화 shape를 실행 가능하게 고정합니다. |
| 보장하지 않는 것 | route가 parseOutput을 쓰기 전에는 적용되지 않으며 상태 전이의 합법성은 다루지 않습니다. |
| 후속 연결 | `24f99345452d`가 tournament/admin route에 적용합니다. |

#### 최소 코드 근거

`packages/shared/src/http.ts`의 tournament/admin schema가 근거입니다.

비교 기준:
- 직전 관련 SHA: `4bace138f188` — `feat(shared): 친구·채팅·로비 runtime contract 정의`
- 다음 관련 SHA: `282a9d0beb47` — `feat(shared): HTTP 요청·오류 schema 정의`

### 5.11. `feat(shared): HTTP 요청·오류 schema 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `282a9d0beb47` |
| Importance | B |
| Tags | - |
| Source에서 확정된 역할 | route params/body와 공통 API error envelope를 strict schema로 정의합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `emptyParamsSchema`, UUID/handle params와 각 body schema의 `.strict()`를 확인합니다.
- profile update refine와 문자열 trim/length 조건을 확인합니다.
- `apiErrorBodySchema`의 code, message, requestId, optional fieldErrors shape를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | domain output schema는 있었지만 endpoint input과 error body는 route-local assertion·임의 JSON에 의존했습니다. |
| 해결하려던 문제 | unknown field, 잘못된 path parameter, 빈 update를 일관되게 거부하고 caller가 처리 가능한 오류 shape가 필요했습니다. |
| 핵심 결정 | params/body를 strict Zod object로 만들고 공통 error envelope에 machine code, request ID, field errors를 정의했습니다. |
| 입력 → 상태 전이 → 출력 | handler나 boundary가 schema를 호출하면 normalized input을 반환하거나 Zod issue를 error response 재료로 바꿀 수 있습니다. |
| ownership/lifetime/cleanup | shared가 wire-level request/error shape를 소유합니다. Fastify boundary는 아직 이를 실제 response로 변환해야 합니다. |
| failure/rollback/retry | 각 route의 params/query/body 조합을 하나의 map으로 묶지 않았고 일부 bodyless route가 검증을 호출하지 않을 수 있습니다. |
| 보장하는 것 | input과 error envelope를 runtime에서 검증할 수 있는 공통 정의를 제공합니다. |
| 보장하지 않는 것 | 모든 route가 검증된다는 보장과 내부 error redaction은 아직 없습니다. |
| 후속 연결 | `e226b68fe235`가 response schema를, `ac85316bb0cb`가 typed boundary를 추가합니다. |

#### 최소 코드 근거

`packages/shared/src/http.ts`의 strict input schema와 `apiErrorBodySchema`를 확인했습니다.

비교 기준:
- 직전 관련 SHA: `7d0793a23f5d` — `feat(shared): 토너먼트·관리 runtime contract 정의`
- 다음 관련 SHA: `e226b68fe235` — `feat(shared): HTTP 응답 runtime contract 정의`

### 5.12. `feat(shared): HTTP 응답 runtime contract 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `e226b68fe235` |
| Importance | B |
| Tags | AUTH, PROTOCOL, REALTIME |
| Source에서 확정된 역할 | domain validator를 health/auth/user/lobby/tournament/admin endpoint별 response schema로 조합합니다. |

#### 해당 SHA에서 확인할 실제 코드

- endpoint response schema가 기존 domain schema를 어떤 객체 키로 감싸는지 확인합니다.
- health service literal과 WS ticket format/version/expiry 조건을 확인합니다.
- 각 exported inferred response type이 schema에서 파생되는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | domain component schema는 있었지만 handler별 top-level JSON shape는 명시적 executable contract가 아니었습니다. |
| 해결하려던 문제 | 같은 user나 tournament라도 endpoint wrapper key가 달라지면 client와 server가 drift할 수 있었습니다. |
| 핵심 결정 | health, auth, user, social, tournament, admin response를 domain schema 조합으로 정의했습니다. |
| 입력 → 상태 전이 → 출력 | handler result를 endpoint schema에 넣으면 top-level key와 nested aggregate가 함께 검증됩니다. |
| ownership/lifetime/cleanup | shared가 endpoint output contract를 소유하고 API handler가 이를 호출할 책임을 갖습니다. |
| failure/rollback/retry | 실제 HTTP status나 header, repository side effect는 schema가 검사하지 않습니다. |
| 보장하는 것 | endpoint별 response JSON을 runtime에서 fail-closed 검사할 수 있습니다. |
| 보장하지 않는 것 | API가 `parseOutput`을 적용하기 전에는 producer 오류를 막지 못합니다. |
| 후속 연결 | `78cf83f29e80`가 schema 자체를 검증하고 `c4cba7d3f871` 이후 route가 소비합니다. |

#### 최소 코드 근거

`packages/shared/src/http.ts`의 endpoint response schema 묶음이 근거입니다.

비교 기준:
- 직전 관련 SHA: `282a9d0beb47` — `feat(shared): HTTP 요청·오류 schema 정의`
- 다음 관련 SHA: `78cf83f29e80` — `test(shared): HTTP contract 검증`

### 5.13. `test(shared): HTTP contract 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `78cf83f29e80` |
| Importance | B |
| Tags | AUTH, PROTOCOL, TEST |
| Source에서 확정된 역할 | HTTP schema의 positive/negative shape와 normalization 규칙을 package unit test로 고정합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/shared/src/http.test.ts`의 valid session user, unknown login field, invalid handle, trim, UUID, profile refine, error envelope, WS ticket case를 확인합니다.
- 각 assertion이 schema parse 자체를 검사하며 Fastify route를 통과하지 않는다는 점을 기록합니다.
- accepted value와 rejected value 경계가 어느 commit의 schema를 보호하는지 연결합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 실행 가능한 schema는 추가됐지만 실제 negative example이 지속적으로 거부된다는 자동 증거가 없었습니다. |
| 해결하려던 문제 | refactor 중 `.strict()`, trim, UUID, refine, ticket rule이 완화될 수 있었습니다. |
| 핵심 결정 | 대표 valid value와 unknown/invalid value를 table·focused assertion으로 parse해 성공/실패를 검증했습니다. |
| 입력 → 상태 전이 → 출력 | fixture → shared schema `parse`/`safeParse` → normalized output 또는 Zod failure를 직접 관찰합니다. |
| ownership/lifetime/cleanup | 각 test가 자체 value를 소유하고 별도 app/repository resource는 없습니다. |
| failure/rollback/retry | production route와 network failure는 통과하지 않으며 schema implementation만 검사합니다. |
| 보장하는 것 | 공유 HTTP contract의 주요 behavioral rule을 빠르고 결정적으로 고정합니다. |
| 보장하지 않는 것 | route가 올바른 schema를 호출하는지, status/error handler, real JSON serialization은 증명하지 않습니다. |
| 후속 연결 | `ac85316bb0cb`과 세 적용 commit이 schema를 API boundary에 연결합니다. |

#### 최소 코드 근거

`packages/shared/src/http.test.ts`의 negative case가 근거입니다.

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | shared HTTP schema가 허용 shape를 normalize하고 unknown·invalid 값을 거부해야 합니다. |
| 재현하는 failure/boundary | unknown login field, invalid handle/UUID, 빈 profile update, malformed error/ticket 값입니다. |
| test technique | pure schema unit/boundary test |
| 통과하는 production path | fixture → Zod schema parse/safeParse |
| 증명하는 것 | schema 자체의 constraint와 normalization을 결정적으로 증명합니다. |
| 증명하지 않는 것 | Fastify route selection, HTTP status/header, repository behavior는 증명하지 않습니다. |
| 후속 회귀 방지 | contract rule이 느슨해지는 회귀를 조기에 감지합니다. |

비교 기준:
- 직전 관련 SHA: `e226b68fe235` — `feat(shared): HTTP 응답 runtime contract 정의`
- 다음 관련 SHA: `ac85316bb0cb` — `feat(api): typed HTTP 오류 boundary 추가`

### 5.14. `feat(api): typed HTTP 오류 boundary 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `ac85316bb0cb` |
| Importance | A |
| Tags | AUTH, PROTOCOL, RISK |
| Source에서 확정된 역할 | Zod 입력 오류, 예상된 API 오류, not-found, 예상 밖 실패를 하나의 Fastify error boundary로 통합합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/httpBoundary.ts`의 `ApiHttpError`, `parseInput`, `parseOutput`, `sendApiError`, `installHttpErrorBoundary`를 확인합니다.
- Zod issue path가 `fieldErrors`로 바뀌고 `request.id`가 response에 들어가는 경로를 추적합니다.
- expected error와 unexpected error가 log/public message에서 분리되고 output validation failure가 500으로 fail-closed 되는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | route마다 status/body를 직접 반환하고 입력 assertion·output 무검증이 섞여 있었습니다. |
| 해결하려던 문제 | validation·authorization·not-found·internal failure가 서로 다른 JSON으로 노출되고 내부 예외가 그대로 전달될 위험이 있었습니다. |
| 핵심 결정 | `ApiHttpError`와 공통 parser/sender를 도입하고 Fastify not-found/error handler를 한 번 설치하도록 했습니다. |
| 입력 → 상태 전이 → 출력 | 입력은 `safeParse` 후 issue path를 모아 `validation_failed`로 던지고, 예상 오류는 typed status/code로 응답합니다. 예상 밖 오류는 server log에 남기고 generic 500을 보냅니다. |
| ownership/lifetime/cleanup | HTTP boundary module이 public error envelope와 response validation을 소유합니다. route는 domain-specific 조건에서 typed error를 던집니다. |
| failure/rollback/retry | 자동 retry/rollback은 없으며 repository mutation 뒤 output parse가 실패하면 이미 수행된 side effect를 되돌리지 않습니다. |
| 보장하는 것 | 모든 boundary가 동일한 code/message/requestId/fieldErrors shape를 만들고 내부 error를 generic 500으로 축소할 수 있습니다. |
| 보장하지 않는 것 | 이 SHA만으로 기존 모든 route가 helper를 사용하지는 않으며 strict query/body 전체 coverage도 아직 없습니다. |
| 후속 연결 | `c4cba7d3f871`, `05e3ecfa2a2d`, `24f99345452d`가 route별로 적용합니다. |

#### 최소 코드 근거

`ac85316bb0cb`, `apps/api/src/httpBoundary.ts`:

```ts
if (error instanceof ApiHttpError) {
  sendApiError(reply, request, error.statusCode, error.code,
    error.message, error.fieldErrors);
  return;
}
request.log.error({ err: error }, "request failed");
sendApiError(reply, request, 500, "internal_error",
  "요청을 처리하지 못했습니다.");
```

비교 기준:
- 직전 관련 SHA: `78cf83f29e80` — `test(shared): HTTP contract 검증`
- 다음 관련 SHA: `c4cba7d3f871` — `feat(api): 인증·사용자 HTTP contract 적용`

### 5.15. `feat(api): 인증·사용자 HTTP contract 적용`

| 항목 | 값 |
| --- | --- |
| SHA | `c4cba7d3f871` |
| Importance | B |
| Tags | AUTH, PROTOCOL, WEB |
| Source에서 확정된 역할 | health/auth/user/profile route에 shared input/output schema와 typed error boundary를 적용합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/app.ts`에서 boundary 설치 위치와 health/auth/user/profile의 `parseInput`/`parseOutput` 호출을 확인합니다.
- 개발 로그인 JSON에서 raw token이 제거되고 HttpOnly cookie만 남는 변경을 확인합니다.
- CORS에 `x-request-id`가 추가되고 authentication/not-found가 typed helper로 전환되는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 공통 boundary는 존재했지만 초기 route는 assertion, token response, route-local error를 계속 사용했습니다. |
| 해결하려던 문제 | 핵심 identity route가 shared schema를 호출하지 않으면 contract와 실제 API가 분리된 상태였습니다. |
| 핵심 결정 | boundary를 app에 설치하고 health/auth/user/profile의 input/output을 shared schema로 parse했습니다. 로그인 token을 JSON에서 제거했습니다. |
| 입력 → 상태 전이 → 출력 | request input parse → repository operation → output parse 순으로 실행하고 예상 failure는 typed helper가 중앙 handler로 전달합니다. |
| ownership/lifetime/cleanup | cookie/session은 repository와 Fastify cookie가 소유하고 raw token은 response body에서 제거됩니다. boundary가 public failure shape를 소유합니다. |
| failure/rollback/retry | repository side effect 후 output parse failure에 rollback은 없으며 아직 모든 route가 적용된 것은 아닙니다. |
| 보장하는 것 | identity/user route에서 malformed input과 malformed output을 fail-closed 처리하고 일관된 error envelope를 사용합니다. |
| 보장하지 않는 것 | lobby/friend/tournament/admin route와 모든 query/body strictness는 아직 완전하지 않습니다. |
| 후속 연결 | `05e3ecfa2a2d`와 `24f99345452d`가 나머지 resource에 적용합니다. |

#### 최소 코드 근거

`apps/api/src/app.ts`의 boundary 설치, login response, profile route parse 호출을 확인했습니다.

비교 기준:
- 직전 관련 SHA: `ac85316bb0cb` — `feat(api): typed HTTP 오류 boundary 추가`
- 다음 관련 SHA: `05e3ecfa2a2d` — `feat(api): 로비·친구 HTTP contract 적용`

### 5.16. `feat(api): 로비·친구 HTTP contract 적용`

| 항목 | 값 |
| --- | --- |
| SHA | `05e3ecfa2a2d` |
| Importance | B |
| Tags | AUTH, PROTOCOL, PERSISTENCE |
| Source에서 확정된 역할 | lobby/chat/leaderboard/dashboard/friendship route에 runtime input/output validation과 typed failure를 적용합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 해당 route의 `parseInput`, `parseOutput`, authentication/suspension helper 호출 순서를 확인합니다.
- 두 friendship request alias가 동일 handler를 공유하는지 확인합니다.
- chat text/handle/UUID가 repository 호출 전에 normalized·validated 되는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | identity route는 typed boundary를 사용했지만 social/lobby route는 assertion과 route-local error가 남아 있었습니다. |
| 해결하려던 문제 | 동일 API 안에서 resource마다 입력·오류 보장이 달라지는 상태를 제거해야 했습니다. |
| 핵심 결정 | lobby/social handler에 shared request/response schema와 typed auth/suspension error를 적용하고 request alias를 한 handler로 통합했습니다. |
| 입력 → 상태 전이 → 출력 | 입력 parse → caller status 확인 → repository read/write → aggregate output parse 순으로 동작합니다. |
| ownership/lifetime/cleanup | shared가 wire contract, route가 authorization order, repository가 state를 소유합니다. |
| failure/rollback/retry | 각 repository mutation의 transaction/rollback은 이 commit이 바꾸지 않으며 unknown query를 모든 route에서 검사하지는 않습니다. |
| 보장하는 것 | social/lobby resource가 같은 runtime contract와 error envelope를 사용합니다. |
| 보장하지 않는 것 | 토너먼트/관리 route와 route별 params/query/body 전체 map은 아직 남습니다. |
| 후속 연결 | `24f99345452d`와 later strict-request Thread가 coverage를 완성합니다. |

#### 최소 코드 근거

`apps/api/src/app.ts`의 lobby/chat/friend handler와 shared schema 호출이 근거입니다.

비교 기준:
- 직전 관련 SHA: `c4cba7d3f871` — `feat(api): 인증·사용자 HTTP contract 적용`
- 다음 관련 SHA: `24f99345452d` — `feat(api): 토너먼트·관리 HTTP contract 적용`

### 5.17. `feat(api): 토너먼트·관리 HTTP contract 적용`

| 항목 | 값 |
| --- | --- |
| SHA | `24f99345452d` |
| Importance | B |
| Tags | AUTH, TOURNAMENT |
| Source에서 확정된 역할 | 토너먼트와 관리자 route에 request/response schema 및 공통 authorization/error helper를 적용합니다. |

#### 해당 SHA에서 확인할 실제 코드

- create/join/admin params·body parse와 response parse 위치를 확인합니다.
- 잘못된 tournament name에 default를 만들던 이전 경로가 제거되는지 확인합니다.
- `requireAdmin`이 unauthenticated와 non-admin을 구분해 typed error를 던지는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 나머지 resource가 typed boundary를 사용해도 고권한 tournament/admin route는 여전히 assertion과 default를 사용했습니다. |
| 해결하려던 문제 | 가장 높은 권한의 mutation이 malformed input을 보정하거나 임의 error payload를 반환하면 전체 API contract가 불완전했습니다. |
| 핵심 결정 | UUID/body schema와 output schema를 적용하고 admin check를 공통 helper로 모았습니다. |
| 입력 → 상태 전이 → 출력 | input parse → authentication → admin/active check → repository mutation → output parse 순으로 실행합니다. |
| ownership/lifetime/cleanup | route가 권한 검사 순서를 소유하고 repository가 mutation을 소유하며 boundary가 public error를 소유합니다. |
| failure/rollback/retry | repository operation의 atomicity나 role source는 이 commit이 변경하지 않습니다. |
| 보장하는 것 | 초기 JSON resource 전체가 shared runtime contract와 typed boundary를 사용할 수 있게 됩니다. |
| 보장하지 않는 것 | bodyless route의 unknown query/body를 모두 검사한다는 보장은 아직 없고 helper 중복이 남습니다. |
| 후속 연결 | `b2a8de5a0027`이 helper를 통합하고 strict-request Thread가 route map을 추가합니다. |

#### 최소 코드 근거

`apps/api/src/app.ts`의 tournament/admin parse와 `requireAdmin`이 근거입니다.

비교 기준:
- 직전 관련 SHA: `05e3ecfa2a2d` — `feat(api): 로비·친구 HTTP contract 적용`
- 다음 관련 SHA: `b2a8de5a0027` — `refactor(api): HTTP boundary helper 통합`

### 5.18. `refactor(api): HTTP boundary helper 통합`

| 항목 | 값 |
| --- | --- |
| SHA | `b2a8de5a0027` |
| Importance | B |
| Tags | AUTH |
| Source에서 확정된 역할 | 남은 route-local unauthorized/suspended helper를 제거하고 공통 typed boundary 함수를 직접 사용합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/app.ts` import와 helper 삭제 diff를 확인합니다.
- 동일 조건에서 status/code/message가 바뀌지 않는 behavior-preserving refactor인지 확인합니다.
- 모든 caller가 `httpBoundary.ts`의 owner를 직접 사용해 중복 failure path가 사라지는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 주요 route는 typed boundary를 적용했지만 app 내부에 같은 의미의 legacy helper가 남아 있었습니다. |
| 해결하려던 문제 | 중복 helper가 이후 서로 다른 status/code/message로 drift할 수 있었습니다. |
| 핵심 결정 | route-local helper를 제거하고 모든 caller가 공통 unauthorized/suspended 함수를 import하도록 했습니다. |
| 입력 → 상태 전이 → 출력 | condition이 참이면 공통 helper가 `ApiHttpError`를 던지고 설치된 handler가 동일 error envelope를 보냅니다. |
| ownership/lifetime/cleanup | failure classification owner를 `httpBoundary.ts`로 단일화합니다. |
| failure/rollback/retry | behavior를 추가하지 않으며 repository rollback·strict query coverage는 그대로입니다. |
| 보장하는 것 | 인증/정지 failure의 구현 위치가 하나로 줄어듭니다. |
| 보장하지 않는 것 | 중앙 helper가 올바르게 호출되는지에 대한 독립 새 test는 이 commit 자체에 없습니다. |
| 후속 연결 | `50caaf5c7c49`가 기존 API tests를 최종 cookie/typed response 기대값에 맞춥니다. |

#### 최소 코드 근거

`apps/api/src/app.ts`의 legacy helper 삭제와 import 변경으로 충분히 확인됩니다.

비교 기준:
- 직전 관련 SHA: `24f99345452d` — `feat(api): 토너먼트·관리 HTTP contract 적용`
- 다음 관련 SHA: `50caaf5c7c49` — `test(api): typed HTTP boundary 기대값 정렬`

### 5.19. `test(api): typed HTTP boundary 기대값 정렬`

| 항목 | 값 |
| --- | --- |
| SHA | `50caaf5c7c49` |
| Importance | B |
| Tags | AUTH, TOURNAMENT, WEB |
| Source에서 확정된 역할 | 기존 API·관리·토너먼트 통합 test를 HttpOnly cookie와 typed response/error contract에 맞춥니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/app.test.ts`, `admin.test.ts`, `tournament.test.ts`의 bearer token 제거와 `set-cookie` 추출 helper를 확인합니다.
- 로그인 JSON에 `token`이 없다는 assertion과 cookie를 이용한 보호 route 호출을 확인합니다.
- development seed profile, 명시적 admin fixture, suspension/audit assertion이 어떤 선행 변경을 흡수하는지 구분합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 초기 integration tests는 로그인 JSON token과 bearer header를 전제로 해 typed boundary 이후 production contract와 어긋났습니다. |
| 해결하려던 문제 | 구현은 cookie 기반으로 바뀌었지만 test가 legacy credential transport를 계속 사용하면 잘못된 API를 보호하게 됩니다. |
| 핵심 결정 | `set-cookie`에서 `pp_session`을 추출해 보호 route에 전달하고 로그인 body에 raw token이 없음을 검사하도록 tests를 갱신했습니다. |
| 입력 → 상태 전이 → 출력 | login injection → cookie 추출 → 보호 route injection → typed response/status assertion 순으로 실행합니다. |
| ownership/lifetime/cleanup | 각 fixture가 session cookie value와 app/repo cleanup을 소유합니다. production session state는 repository가 소유합니다. |
| failure/rollback/retry | 실제 browser cookie policy, network CORS, PostgreSQL은 사용하지 않습니다. 이 commit은 여러 선행 auth/seed 변화를 함께 반영합니다. |
| 보장하는 것 | in-process API tests가 현재 cookie/typed boundary와 일치하고 raw token response 회귀를 감지합니다. |
| 보장하지 않는 것 | cookie attributes의 browser 적용, cross-origin credential 전송, real database behavior는 증명하지 않습니다. |
| 후속 연결 | 이 Thread의 최종 API contract verification이며 cookie-only auth의 전체 보안 invariant는 별도 identity category가 다룹니다. |

#### 최소 코드 근거

세 test file의 `sessionCookie` helper와 `not.toHaveProperty("token")` assertion이 핵심 근거입니다.

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | typed HTTP boundary 이후 보호 route는 session cookie를 소비하고 login JSON은 raw token을 노출하지 않아야 합니다. |
| 재현하는 failure/boundary | legacy bearer/token fixture를 cookie fixture로 바꾸고 API·admin·tournament 대표 경로를 다시 실행합니다. |
| test technique | in-process Fastify integration regression test + memory repository |
| 통과하는 production path | login → Set-Cookie 추출 → protected route → shared/typed response |
| 증명하는 것 | 대표 resource tests가 최종 credential/response contract와 일치함을 증명합니다. |
| 증명하지 않는 것 | 브라우저 CORS·SameSite enforcement, 실제 network, PostgreSQL은 증명하지 않습니다. |
| 후속 회귀 방지 | 향후 route refactor가 raw token을 다시 노출하거나 cookie 경로를 깨는 회귀를 막습니다. |

비교 기준:
- 직전 관련 SHA: `b2a8de5a0027` — `refactor(api): HTTP boundary helper 통합`

## 6. Invariant evolution

| 단계 | 관련 SHA | 기록 |
| --- | --- | --- |
| Resource API 도입 | `1779df300611` → `0bcc487d949f` → `e8bb6a4bf68b` | 로그인/로비에서 profile/friend, tournament/admin으로 route가 확장되지만 assertion과 local error가 남습니다. |
| 초기 행동 기준 | `fb1c287d9e79`, `1395d45a3665`, `5088099d1e7d` | Fastify injection과 memory repository로 초기 happy path를 고정합니다. |
| Executable domain contract | `0c5c27c8c3df` → `7d0793a23f5d` | compile-time DTO가 domain별 Zod schema로 교체됩니다. |
| Wire contract 완성 | `282a9d0beb47` → `e226b68fe235` → `78cf83f29e80` | strict request/error와 endpoint response schema를 만들고 schema rule을 unit test합니다. |
| API boundary 적용 | `ac85316bb0cb` → `c4cba7d3f871` → `05e3ecfa2a2d` → `24f99345452d` → `b2a8de5a0027` | typed failure와 input/output parse를 모든 기존 resource에 적용하고 helper owner를 통합합니다. |
| 최종 통합 기대값 | `50caaf5c7c49` | 대표 tests가 session cookie와 token 비노출을 기준으로 갱신됩니다. |

## 7. Failure → Fix → Test 관계

| Failure 또는 불충분한 상태 | Fix/구현 SHA | Test 또는 후속 증거 |
| --- | --- | --- |
| Type assertion/default가 malformed input을 통과·보정함 | `282a9d0beb47` + route 적용 commits | strict schema와 handler parse를 도입합니다. |
| Route-local 오류 body가 서로 다름 | `ac85316bb0cb` | Fastify error handler와 shared error envelope로 통합합니다. |
| 공통 boundary가 있어도 일부 route가 미적용 | `c4cba7d3f871` → `24f99345452d` | resource 군별로 input/output/error 적용을 완료합니다. |
| Legacy helper가 중앙 owner와 중복 | `b2a8de5a0027` | route-local helper를 제거합니다. |
| Tests가 JSON token/bearer contract를 계속 보호함 | `50caaf5c7c49` | Set-Cookie 기반 fixture와 raw-token negative assertion으로 정렬합니다. |

## 8. Ownership·state·responsibility 변화

| Owner | 최종 책임 | 명시적 비책임 |
| --- | --- | --- |
| Shared domain/request/response schema | 허용 JSON shape, normalization, field constraint | HTTP status와 repository side effect를 소유하지 않습니다. |
| Fastify route | endpoint 선택, authorization order, repository method 호출 | wire error formatting은 boundary에 위임합니다. |
| HTTP boundary module | input/output parse, typed error classification, request ID, generic 500 | domain state rollback은 소유하지 않습니다. |
| Repository | session 및 resource state/read-write operation | HTTP schema와 public error envelope를 소유하지 않습니다. |
| Integration tests | app/repo fixture와 대표 request sequence | 실제 browser/network/PostgreSQL을 대신하지 않습니다. |

## 9. Thread 최종 상태

- 최종 SHA 기준으로 기존 JSON resource는 shared runtime contract와 중앙 typed error boundary를 사용합니다.
- handler는 검증된 input을 repository에 전달하고 반환값을 endpoint response schema로 검사합니다.
- 예상 오류는 code/status/requestId/fieldErrors를 가진 공통 envelope로, 예상 밖 오류는 generic 500으로 나갑니다.
- 대표 API tests는 HttpOnly session cookie contract에 맞지만 browser/CORS/real DB 증거는 별도 category의 책임입니다.

### 실행 검증 기록

- Source inspection: GitHub connector로 Commit map의 exact SHA diff와 필요한 historical file을 조회했습니다.
- Branch validation: branch-local `commit/commit-importance.md`가 선언한 433개 선형 이력에서 모든 참조 SHA와 source classification을 대조했고, 가장 이른 참조 `b625c4f9dfdc`는 branch HEAD 비교에서 merge base가 동일 SHA임을 확인했습니다.
- 실제 실행 시도: `git clone --branch web/ft_transcendence --single-branch https://github.com/seungwoo7050/42-archive.git /tmp/ft-transcendence-audit`
- 결과: exit status 128, `Could not resolve host: github.com`. 따라서 repository checkout, package install, test command는 실행하지 않았으며 runtime 결과를 주장하지 않습니다.

## 10. 최종 실행 흐름

1. Fastify가 method/path로 route를 선택합니다.
2. route가 shared request schema로 input을 parse합니다.
3. 인증·계정 상태·role 같은 capability를 검사합니다.
4. 검증된 ID/body를 repository method에 전달합니다.
5. repository 결과를 endpoint response schema로 parse합니다.
6. 성공이면 typed JSON을 반환합니다.
7. 예상 failure는 `ApiHttpError`, 예상 밖 failure는 generic internal error envelope로 변환됩니다.

## 11. 학습 완료 확인

- [x] 모든 Commit map SHA의 historical code를 확인했습니다.
- [x] parent/직전 관련 상태와 현재 SHA를 구분했습니다.
- [x] fix의 이전 가정·root cause·corrected invariant를 연결했습니다.
- [x] test가 통과하는 production path와 비증명 범위를 구분했습니다.
- [x] ownership/lifetime/cleanup과 failure path를 기록했습니다.
- [x] 실행 evidence와 code inspection을 구분했습니다.
- [x] 마지막 SHA 기준 최종 flow와 non-guarantee를 설명할 수 있습니다.
