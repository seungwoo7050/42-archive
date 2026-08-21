# Strict JSON request validation

- 카테고리: `01-foundations-and-api-boundaries` — 애플리케이션 기반과 API 경계
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

bodyless route의 국소 normalization 문제에서 출발해 모든 JSON route의 params/query/body를 strict shared contract로 정의하고 business logic 전에 공통 parser로 집행한 뒤 route-wide regression test로 고정하는 과정을 복원합니다.

이 문서는 Phase 1 category audit 후 동결된 scaffold를 기준으로 exact SHA의 구현 발전을 복원합니다.

### 직접 연결되는 불변식

- 모든 현재 JSON route는 untrusted params/query/body를 business logic 전에 strict schema로 검증합니다.
- bodyless route도 명시적 empty-object contract를 가져 unknown query/body를 허용하지 않습니다.
- validation failure는 repository mutation 전에 공통 typed error envelope로 종료됩니다.
- forwarded client address는 explicit proxy trust가 없을 때 identity/rate-limit key를 바꾸지 못합니다.

## 2. 핵심 질문

- `request.body ?? {}`라는 local fix가 왜 route-wide contract map으로 일반화되어야 했습니까?
- empty params/query/body contract가 bodyless GET/POST의 unknown field를 어떻게 거부합니까?
- `parseHttpRequest`가 반환한 값만 repository call에 쓰인다는 근거는 무엇입니까?
- route matrix test가 증명하는 coverage와 새 route 추가 시 남는 수동 책임은 무엇입니까?

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
| 1 | `8ce1199ffd12` | `fix(api): body 없는 로비 채팅 요청 처리` | B | - | 선택적 request body를 `{}`로 정규화해 route-local Zod parse가 `undefined`에서 실패하던 문제를 수정합니다. |
| 2 | `d07056e11871` | `feat(shared): 모든 HTTP request schema를 strict하게 정의` | A | PROTOCOL | 모든 JSON route에 params/query/body 세 schema를 가진 strict request contract map을 정의합니다. |
| 3 | `59d75fddcaa6` | `fix(api): 모든 route input을 runtime 검증` | A | PROTOCOL, RISK | 공통 `parseHttpRequest`를 모든 JSON handler의 business logic 전에 호출해 params/query/body strictness를 실제로 집행합니다. |
| 4 | `1abbf7dcdde4` | `test(api): strict request contract 검증` | B | TEST | 전체 JSON route의 unknown query/body와 invalid path parameter, untrusted forwarded address를 table-driven Fastify injection으로 검증합니다. |

## 5. Commit별 학습 기록

### 5.1. `fix(api): body 없는 로비 채팅 요청 처리`

| 항목 | 값 |
| --- | --- |
| SHA | `8ce1199ffd12` |
| Importance | B |
| Tags | - |
| Source에서 확정된 역할 | 선택적 request body를 `{}`로 정규화해 route-local Zod parse가 `undefined`에서 실패하던 문제를 수정합니다. |

#### 해당 SHA에서 확인할 실제 코드

- parent와 `apps/api/src/app.ts`의 lobby chat handler를 비교해 `request.body`와 `request.body ?? {}` 차이를 확인합니다.
- body가 없을 때 Fastify가 전달하는 값과 empty-object schema가 기대하는 입력을 연결합니다.
- 이 수정이 해당 route에만 적용되고 전체 route contract는 만들지 않는다는 한계를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 로비 채팅 route는 request body가 없을 때 `undefined`를 그대로 empty-object schema에 전달했습니다. |
| 해결하려던 문제 | bodyless 호출도 허용하려는 route에서 parser가 object 대신 `undefined`를 받아 validation failure가 발생했습니다. |
| 핵심 결정 | `request.body ?? {}`로 optional body를 empty object에 정규화한 뒤 기존 schema에 전달했습니다. |
| 입력 → 상태 전이 → 출력 | Fastify request body가 `undefined`이면 `{}`로 대체되고 schema parse 후 handler가 계속 진행합니다. |
| ownership/lifetime/cleanup | route handler가 normalization을 소유하며 새 장기 resource는 없습니다. |
| failure/rollback/retry | 잘못된 non-empty body는 기존 schema에서 거부되지만 다른 route의 params/query/body에는 적용되지 않습니다. |
| 보장하는 것 | 해당 bodyless lobby chat 경로가 missing body를 empty object로 해석합니다. |
| 보장하지 않는 것 | 모든 route에 같은 normalization·strictness가 적용된다는 보장은 없습니다. |
| 후속 연결 | `d07056e11871`과 `59d75fddcaa6`가 이 local rule을 공통 request contract로 일반화합니다. |

#### 최소 코드 근거

`8ce1199ffd12`, `apps/api/src/app.ts`의 `request.body ?? {}` 변경이 근거입니다.

#### Fix 연결

| 단계 | 기록 |
| --- | --- |
| 이전 가정 | empty object schema를 호출하면 request body도 항상 object일 것이라고 가정했습니다. |
| 실제 실패 또는 위험 | body가 생략된 요청에서 Fastify가 `undefined`를 제공해 validation이 실패했습니다. |
| Root cause | optional transport field와 schema input 사이 normalization이 route에 없었습니다. |
| 수정된 invariant | bodyless request는 parsing 전에 `{}`로 정규화해야 합니다. |
| 변경 코드 | `apps/api/src/app.ts` lobby chat handler의 nullish fallback입니다. |
| Regression evidence | 후속 `1abbf7dcdde4`의 body/route matrix가 공통 strict parser 적용 뒤 body contract를 보호합니다. |

비교 기준:
- 이 commit의 parent와 비교합니다.
- 다음 관련 SHA: `d07056e11871` — `feat(shared): 모든 HTTP request schema를 strict하게 정의`

### 5.2. `feat(shared): 모든 HTTP request schema를 strict하게 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `d07056e11871` |
| Importance | A |
| Tags | PROTOCOL |
| Source에서 확정된 역할 | 모든 JSON route에 params/query/body 세 schema를 가진 strict request contract map을 정의합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/shared/src/http.ts`의 `defineHttpRequestContract`, empty/id contract와 `jsonHttpRequestContracts` 전체 key를 확인합니다.
- bodyless route도 empty strict object를 명시해 unknown query/body를 거부할 수 있는지 확인합니다.
- route 목록과 contract map이 일대일로 대응하고 params 종류가 올바른지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 개별 input schema는 있었지만 route마다 params/query/body 중 일부만 직접 parse했고 bodyless route는 아무 검증도 하지 않았습니다. |
| 해결하려던 문제 | unknown query나 body field가 route에 따라 통과하고 새 route가 validation 호출을 빠뜨릴 수 있었습니다. |
| 핵심 결정 | 모든 JSON route key를 params/query/body contract에 매핑하고 empty route도 세 축 모두 strict empty object를 사용하도록 했습니다. |
| 입력 → 상태 전이 → 출력 | API가 contract를 선택해 Fastify request의 세 부분을 각각 parse하면 normalized typed tuple을 얻습니다. |
| ownership/lifetime/cleanup | shared package가 route별 wire contract map을 소유합니다. API는 실제 route와 올바른 key를 연결할 책임을 가집니다. |
| failure/rollback/retry | 이 SHA는 map만 정의하므로 route가 호출하지 않으면 runtime behavior는 바뀌지 않습니다. route registry와 자동 일치 검사도 없습니다. |
| 보장하는 것 | 모든 기존 JSON endpoint에 명시적 strict params/query/body 정의가 존재합니다. |
| 보장하지 않는 것 | Fastify handler 전부가 이를 사용한다는 보장은 다음 commit 전에는 없습니다. |
| 후속 연결 | `59d75fddcaa6`이 map을 모든 handler의 business logic 앞에 적용합니다. |

#### 최소 코드 근거

`d07056e11871`, `packages/shared/src/http.ts`:

```ts
const emptyHttpRequestContract = defineHttpRequestContract(
  emptyParamsSchema, emptyParamsSchema, emptyParamsSchema
);
export const jsonHttpRequestContracts = { /* 모든 JSON route */ } as const;
```

비교 기준:
- 직전 관련 SHA: `8ce1199ffd12` — `fix(api): body 없는 로비 채팅 요청 처리`
- 다음 관련 SHA: `59d75fddcaa6` — `fix(api): 모든 route input을 runtime 검증`

### 5.3. `fix(api): 모든 route input을 runtime 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `59d75fddcaa6` |
| Importance | A |
| Tags | PROTOCOL, RISK |
| Source에서 확정된 역할 | 공통 `parseHttpRequest`를 모든 JSON handler의 business logic 전에 호출해 params/query/body strictness를 실제로 집행합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/httpBoundary.ts`의 `parseHttpRequest`가 `request.params/query/body ?? {}`를 각각 parse하는지 확인합니다.
- `apps/api/src/app.ts`의 health부터 admin까지 모든 JSON route가 올바른 contract key를 호출하는지 확인합니다.
- parsed params/body를 이후 repository call에 사용하며 raw request assertion이 제거되는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | shared contract map은 존재했지만 app handler는 기존 부분 parse를 계속 사용해 unknown input이 route마다 다르게 처리됐습니다. |
| 해결하려던 문제 | 정의만 있고 소비되지 않는 schema는 신뢰 경계를 만들지 못하며 business logic이 untrusted raw input을 먼저 볼 수 있었습니다. |
| 핵심 결정 | `parseHttpRequest`가 세 request component를 공통 방식으로 parse하도록 하고 모든 JSON route 첫 단계에 배치했습니다. |
| 입력 → 상태 전이 → 출력 | route contract 선택 → params/query/body nullish normalization → 세 strict parse → typed 값 추출 → 인증·repository logic → output parse 순입니다. |
| ownership/lifetime/cleanup | HTTP boundary가 request parsing을 소유하고 handler는 parser가 반환한 값만 business operation에 전달합니다. |
| failure/rollback/retry | validation 실패는 `ApiHttpError`로 중단되며 mutation 전이므로 rollback이 필요 없습니다. schema map과 route 목록의 자동 compile-time 완전성은 제한적입니다. |
| 보장하는 것 | 모든 현재 JSON route에서 unknown query/body와 invalid path가 business logic 전에 거부됩니다. |
| 보장하지 않는 것 | multipart, WebSocket payload, future route가 map 적용을 누락하는 경우까지 자동 보장하지 않습니다. |
| 후속 연결 | `1abbf7dcdde4`가 전체 route matrix로 이 invariant를 회귀 검증합니다. |

#### 최소 코드 근거

`59d75fddcaa6`, `apps/api/src/httpBoundary.ts`:

```ts
return {
  params: parseInput(contract.params, request.params ?? {}),
  query: parseInput(contract.query, request.query ?? {}),
  body: parseInput(contract.body, request.body ?? {})
};
```

#### Fix 연결

| 단계 | 기록 |
| --- | --- |
| 이전 가정 | route별로 필요한 field만 parse하면 전체 input boundary가 충분하다고 가정했습니다. |
| 실제 실패 또는 위험 | 검사하지 않은 query/body field와 bodyless route input이 handler마다 다르게 통과했습니다. |
| Root cause | route 단위 세 축 contract가 실제 handler entry에서 호출되지 않았습니다. |
| 수정된 invariant | 모든 JSON route는 business logic 전에 params/query/body를 동일 parser로 검증해야 합니다. |
| 변경 코드 | `httpBoundary.ts::parseHttpRequest`와 `app.ts` 전 route 호출입니다. |
| Regression evidence | `1abbf7dcdde4`의 table-driven route matrix입니다. |

비교 기준:
- 직전 관련 SHA: `d07056e11871` — `feat(shared): 모든 HTTP request schema를 strict하게 정의`
- 다음 관련 SHA: `1abbf7dcdde4` — `test(api): strict request contract 검증`

### 5.4. `test(api): strict request contract 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `1abbf7dcdde4` |
| Importance | B |
| Tags | TEST |
| Source에서 확정된 역할 | 전체 JSON route의 unknown query/body와 invalid path parameter, untrusted forwarded address를 table-driven Fastify injection으로 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/http-contract.test.ts`의 `jsonRoutes`, `jsonBodyRoutes`, invalid params case를 확인합니다.
- 각 request가 실제 `buildApp` route와 shared error envelope를 통과하는지 확인합니다.
- `guest-demo.test.ts`의 `trustProxy` false에서 forwarded address spoof가 rate-limit identity를 바꾸지 못하는 case를 구분합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 공통 parser가 적용됐지만 일부 route key 누락·잘못된 schema 연결을 정적 코드만으로 모두 탐지하기 어려웠습니다. |
| 해결하려던 문제 | 특정 route가 unknown query/body나 invalid path를 받아들이는 회귀를 route 수만큼 반복 확인할 필요가 있었습니다. |
| 핵심 결정 | 27개 JSON route와 body-bearing subset을 table로 만들고 unknown field를 주입했으며 invalid UUID/handle과 bodyless contract를 별도로 검사했습니다. |
| 입력 → 상태 전이 → 출력 | Fastify injection → 실제 route → `parseHttpRequest` → typed boundary error envelope를 관찰합니다. proxy case는 두 spoofed header 요청이 같은 direct IP rate key를 공유하는지 확인합니다. |
| ownership/lifetime/cleanup | fixture가 memory repo와 app을 소유·정리합니다. proxy identity는 Fastify 설정과 `request.ip`가 결정합니다. |
| failure/rollback/retry | 실제 reverse proxy/network는 없고 in-process injection입니다. 새 route가 table에 추가되지 않으면 자동 coverage는 생기지 않습니다. |
| 보장하는 것 | 현재 route set의 strict query/body/path와 trustProxy false behavior를 결정적으로 검증합니다. |
| 보장하지 않는 것 | 실제 browser, CORS preflight, PostgreSQL, WebSocket input은 증명하지 않습니다. |
| 후속 연결 | 이 Thread의 공통 strict boundary를 고정하며 WS payload는 별도 Thread가 다룹니다. |

#### 최소 코드 근거

`apps/api/src/http-contract.test.ts`의 route matrix와 `guest-demo.test.ts`의 forwarded-address case가 근거입니다.

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | 모든 현재 JSON route가 params/query/body strict contract를 business logic 전에 집행해야 합니다. |
| 재현하는 failure/boundary | unknown query/body, invalid UUID/handle, bodyless route의 explicit empty body contract와 untrusted forwarded address입니다. |
| test technique | in-process table-driven API integration/boundary test |
| 통과하는 production path | Fastify inject → route → `parseHttpRequest` → `parseInput` → shared error envelope |
| 증명하는 것 | 현재 table에 열거된 route에서 strict input rejection과 trustProxy false identity behavior를 증명합니다. |
| 증명하지 않는 것 | 실제 proxy hop, browser, real DB, future route 자동 등록은 증명하지 않습니다. |
| 후속 회귀 방지 | route별 parser 누락·잘못된 contract key·strictness 완화 회귀를 방지합니다. |

비교 기준:
- 직전 관련 SHA: `59d75fddcaa6` — `fix(api): 모든 route input을 runtime 검증`

## 6. Invariant evolution

| 단계 | 관련 SHA | 기록 |
| --- | --- | --- |
| Local normalization | `8ce1199ffd12` | 한 bodyless route에서 missing body를 `{}`로 처리합니다. |
| Route-wide contract definition | `d07056e11871` | 모든 JSON route에 strict params/query/body map을 정의합니다. |
| Runtime enforcement | `59d75fddcaa6` | 모든 handler entry가 공통 parser를 실행하고 raw request assertion을 제거합니다. |
| Deterministic verification | `1abbf7dcdde4` | route matrices가 unknown field와 invalid path, untrusted forwarded address를 거부하는지 검증합니다. |

## 7. Failure → Fix → Test 관계

| Failure 또는 불충분한 상태 | Fix/구현 SHA | Test 또는 후속 증거 |
| --- | --- | --- |
| Absent body가 `undefined`라 local parse 실패 | `8ce1199ffd12` | body를 `{}`로 정규화합니다. |
| Route마다 일부 input만 검사 | `d07056e11871` + `59d75fddcaa6` | 세 축 contract map과 공통 parser를 도입합니다. |
| 적용 누락을 코드 리뷰만으로 찾기 어려움 | `1abbf7dcdde4` | 모든 현행 route를 table-driven injection으로 순회합니다. |

## 8. Ownership·state·responsibility 변화

| Owner | 최종 책임 | 명시적 비책임 |
| --- | --- | --- |
| Shared request map | route별 params/query/body schema | Fastify route registration을 자동 생성하지 않습니다. |
| HTTP boundary parser | nullish normalization과 세 schema 실행 | business mutation을 소유하지 않습니다. |
| Route handler | parser 반환값으로 authorization/repository logic 수행 | raw request 값을 직접 신뢰하지 않습니다. |
| Regression suite | 현행 route 목록과 negative input matrix | future route 자동 발견은 하지 않습니다. |

## 9. Thread 최종 상태

- 최종 SHA 기준으로 현재 JSON route는 strict params/query/body를 모두 검증합니다.
- unknown field와 invalid path는 repository operation 전에 validation error로 중단됩니다.
- in-process route matrix가 current coverage를 보호하지만 future route를 test table과 contract map에 추가하는 책임은 남습니다.

### 실행 검증 기록

- Source inspection: GitHub connector로 Commit map의 exact SHA diff와 필요한 historical file을 조회했습니다.
- Branch validation: branch-local `commit/commit-importance.md`가 선언한 433개 선형 이력에서 모든 참조 SHA와 source classification을 대조했고, 가장 이른 참조 `b625c4f9dfdc`는 branch HEAD 비교에서 merge base가 동일 SHA임을 확인했습니다.
- 실제 실행 시도: `git clone --branch web/ft_transcendence --single-branch https://github.com/seungwoo7050/42-archive.git /tmp/ft-transcendence-audit`
- 결과: exit status 128, `Could not resolve host: github.com`. 따라서 repository checkout, package install, test command는 실행하지 않았으며 runtime 결과를 주장하지 않습니다.

## 10. 최종 실행 흐름

1. route가 `jsonHttpRequestContracts`에서 자신의 contract를 선택합니다.
2. `parseHttpRequest`가 missing params/query/body를 `{}`로 정규화합니다.
3. 세 strict schema가 각각 값을 parse합니다.
4. 하나라도 실패하면 typed validation error로 종료합니다.
5. 모두 성공하면 parsed 값만 authorization과 repository operation에 전달합니다.
6. output은 기존 typed HTTP boundary를 통해 검증·반환됩니다.

## 11. 학습 완료 확인

- [x] 모든 Commit map SHA의 historical code를 확인했습니다.
- [x] parent/직전 관련 상태와 현재 SHA를 구분했습니다.
- [x] fix의 이전 가정·root cause·corrected invariant를 연결했습니다.
- [x] test가 통과하는 production path와 비증명 범위를 구분했습니다.
- [x] ownership/lifetime/cleanup과 failure path를 기록했습니다.
- [x] 실행 evidence와 code inspection을 구분했습니다.
- [x] 마지막 SHA 기준 최종 flow와 non-guarantee를 설명할 수 있습니다.
