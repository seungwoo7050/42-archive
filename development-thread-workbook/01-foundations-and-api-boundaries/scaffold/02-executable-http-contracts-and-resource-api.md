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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | [대상 production invariant를 test implementation과 production caller에서 확인해 작성합니다.] |
| 재현하는 failure/boundary | [재현하는 failure/boundary를 test implementation과 production caller에서 확인해 작성합니다.] |
| test technique | [test technique를 test implementation과 production caller에서 확인해 작성합니다.] |
| 통과하는 production path | [통과하는 production path를 test implementation과 production caller에서 확인해 작성합니다.] |
| 증명하는 것 | [증명하는 것를 test implementation과 production caller에서 확인해 작성합니다.] |
| 증명하지 않는 것 | [증명하지 않는 것를 test implementation과 production caller에서 확인해 작성합니다.] |
| 후속 회귀 방지 | [후속 회귀 방지를 test implementation과 production caller에서 확인해 작성합니다.] |

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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | [대상 production invariant를 test implementation과 production caller에서 확인해 작성합니다.] |
| 재현하는 failure/boundary | [재현하는 failure/boundary를 test implementation과 production caller에서 확인해 작성합니다.] |
| test technique | [test technique를 test implementation과 production caller에서 확인해 작성합니다.] |
| 통과하는 production path | [통과하는 production path를 test implementation과 production caller에서 확인해 작성합니다.] |
| 증명하는 것 | [증명하는 것를 test implementation과 production caller에서 확인해 작성합니다.] |
| 증명하지 않는 것 | [증명하지 않는 것를 test implementation과 production caller에서 확인해 작성합니다.] |
| 후속 회귀 방지 | [후속 회귀 방지를 test implementation과 production caller에서 확인해 작성합니다.] |

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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | [대상 production invariant를 test implementation과 production caller에서 확인해 작성합니다.] |
| 재현하는 failure/boundary | [재현하는 failure/boundary를 test implementation과 production caller에서 확인해 작성합니다.] |
| test technique | [test technique를 test implementation과 production caller에서 확인해 작성합니다.] |
| 통과하는 production path | [통과하는 production path를 test implementation과 production caller에서 확인해 작성합니다.] |
| 증명하는 것 | [증명하는 것를 test implementation과 production caller에서 확인해 작성합니다.] |
| 증명하지 않는 것 | [증명하지 않는 것를 test implementation과 production caller에서 확인해 작성합니다.] |
| 후속 회귀 방지 | [후속 회귀 방지를 test implementation과 production caller에서 확인해 작성합니다.] |

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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | [대상 production invariant를 test implementation과 production caller에서 확인해 작성합니다.] |
| 재현하는 failure/boundary | [재현하는 failure/boundary를 test implementation과 production caller에서 확인해 작성합니다.] |
| test technique | [test technique를 test implementation과 production caller에서 확인해 작성합니다.] |
| 통과하는 production path | [통과하는 production path를 test implementation과 production caller에서 확인해 작성합니다.] |
| 증명하는 것 | [증명하는 것를 test implementation과 production caller에서 확인해 작성합니다.] |
| 증명하지 않는 것 | [증명하지 않는 것를 test implementation과 production caller에서 확인해 작성합니다.] |
| 후속 회귀 방지 | [후속 회귀 방지를 test implementation과 production caller에서 확인해 작성합니다.] |

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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | [대상 production invariant를 test implementation과 production caller에서 확인해 작성합니다.] |
| 재현하는 failure/boundary | [재현하는 failure/boundary를 test implementation과 production caller에서 확인해 작성합니다.] |
| test technique | [test technique를 test implementation과 production caller에서 확인해 작성합니다.] |
| 통과하는 production path | [통과하는 production path를 test implementation과 production caller에서 확인해 작성합니다.] |
| 증명하는 것 | [증명하는 것를 test implementation과 production caller에서 확인해 작성합니다.] |
| 증명하지 않는 것 | [증명하지 않는 것를 test implementation과 production caller에서 확인해 작성합니다.] |
| 후속 회귀 방지 | [후속 회귀 방지를 test implementation과 production caller에서 확인해 작성합니다.] |

비교 기준:
- 직전 관련 SHA: `b2a8de5a0027` — `refactor(api): HTTP boundary helper 통합`

## 6. Invariant evolution

| 단계 | 관련 SHA | 기록 |
| --- | --- | --- |
| Resource API 도입 | `1779df300611` → `0bcc487d949f` → `e8bb6a4bf68b` | [해당 단계에서 invariant가 도입·확장·수정·검증된 근거를 작성합니다.] |
| 초기 행동 기준 | `fb1c287d9e79`, `1395d45a3665`, `5088099d1e7d` | [해당 단계에서 invariant가 도입·확장·수정·검증된 근거를 작성합니다.] |
| Executable domain contract | `0c5c27c8c3df` → `7d0793a23f5d` | [해당 단계에서 invariant가 도입·확장·수정·검증된 근거를 작성합니다.] |
| Wire contract 완성 | `282a9d0beb47` → `e226b68fe235` → `78cf83f29e80` | [해당 단계에서 invariant가 도입·확장·수정·검증된 근거를 작성합니다.] |
| API boundary 적용 | `ac85316bb0cb` → `c4cba7d3f871` → `05e3ecfa2a2d` → `24f99345452d` → `b2a8de5a0027` | [해당 단계에서 invariant가 도입·확장·수정·검증된 근거를 작성합니다.] |
| 최종 통합 기대값 | `50caaf5c7c49` | [해당 단계에서 invariant가 도입·확장·수정·검증된 근거를 작성합니다.] |

## 7. Failure → Fix → Test 관계

| Failure 또는 불충분한 상태 | Fix/구현 SHA | Test 또는 후속 증거 |
| --- | --- | --- |
| [이전 failure 또는 불충분한 상태를 작성합니다.] | `282a9d0beb47` + route 적용 commits | [fix가 만든 invariant와 test/후속 evidence를 작성합니다.] |
| [이전 failure 또는 불충분한 상태를 작성합니다.] | `ac85316bb0cb` | [fix가 만든 invariant와 test/후속 evidence를 작성합니다.] |
| [이전 failure 또는 불충분한 상태를 작성합니다.] | `c4cba7d3f871` → `24f99345452d` | [fix가 만든 invariant와 test/후속 evidence를 작성합니다.] |
| [이전 failure 또는 불충분한 상태를 작성합니다.] | `b2a8de5a0027` | [fix가 만든 invariant와 test/후속 evidence를 작성합니다.] |
| [이전 failure 또는 불충분한 상태를 작성합니다.] | `50caaf5c7c49` | [fix가 만든 invariant와 test/후속 evidence를 작성합니다.] |

## 8. Ownership·state·responsibility 변화

| Owner | 최종 책임 | 명시적 비책임 |
| --- | --- | --- |
| Shared domain/request/response schema | [최종 책임을 exact SHA로 작성합니다.] | [소유하지 않는 책임을 작성합니다.] |
| Fastify route | [최종 책임을 exact SHA로 작성합니다.] | [소유하지 않는 책임을 작성합니다.] |
| HTTP boundary module | [최종 책임을 exact SHA로 작성합니다.] | [소유하지 않는 책임을 작성합니다.] |
| Repository | [최종 책임을 exact SHA로 작성합니다.] | [소유하지 않는 책임을 작성합니다.] |
| Integration tests | [최종 책임을 exact SHA로 작성합니다.] | [소유하지 않는 책임을 작성합니다.] |

## 9. Thread 최종 상태

- [마지막 SHA 기준 architecture와 owner를 작성합니다.]
- [최종 invariant와 남은 non-guarantee를 작성합니다.]
- [다른 category로 넘기는 책임을 작성합니다.]

### 실행 검증 기록

- [실제로 실행한 exact SHA·command·결과를 작성합니다. 실행하지 못했다면 code inspection과 환경 제한을 구분해 작성합니다.]

## 10. 최종 실행 흐름

1. [첫 caller 또는 입력 경계를 작성합니다.]
2. [검증·상태 전이·resource 획득 순서를 작성합니다.]
3. [callee·output·failure 분기를 작성합니다.]
4. [cleanup 또는 최종 owner를 작성합니다.]

## 11. 학습 완료 확인

- [ ] 모든 Commit map SHA의 historical code를 확인했습니다.
- [ ] parent/직전 관련 상태와 현재 SHA를 구분했습니다.
- [ ] fix의 이전 가정·root cause·corrected invariant를 연결했습니다.
- [ ] test가 통과하는 production path와 비증명 범위를 구분했습니다.
- [ ] ownership/lifetime/cleanup과 failure path를 기록했습니다.
- [ ] 실행 evidence와 code inspection을 구분했습니다.
- [ ] 마지막 SHA 기준 최종 flow와 non-guarantee를 설명할 수 있습니다.
