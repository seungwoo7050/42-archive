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

#### Fix 연결

| 단계 | 기록 |
| --- | --- |
| 이전 가정 | [이전 가정를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |
| 실제 실패 또는 위험 | [실제 실패 또는 위험를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |
| Root cause | [Root cause를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |
| 수정된 invariant | [수정된 invariant를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |
| 변경 코드 | [변경 코드를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |
| Regression evidence | [Regression evidence를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |

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

#### Fix 연결

| 단계 | 기록 |
| --- | --- |
| 이전 가정 | [이전 가정를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |
| 실제 실패 또는 위험 | [실제 실패 또는 위험를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |
| Root cause | [Root cause를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |
| 수정된 invariant | [수정된 invariant를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |
| 변경 코드 | [변경 코드를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |
| Regression evidence | [Regression evidence를 parent·현재 SHA·후속 test에서 확인해 작성합니다.] |

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
- 직전 관련 SHA: `59d75fddcaa6` — `fix(api): 모든 route input을 runtime 검증`

## 6. Invariant evolution

| 단계 | 관련 SHA | 기록 |
| --- | --- | --- |
| Local normalization | `8ce1199ffd12` | [해당 단계에서 invariant가 도입·확장·수정·검증된 근거를 작성합니다.] |
| Route-wide contract definition | `d07056e11871` | [해당 단계에서 invariant가 도입·확장·수정·검증된 근거를 작성합니다.] |
| Runtime enforcement | `59d75fddcaa6` | [해당 단계에서 invariant가 도입·확장·수정·검증된 근거를 작성합니다.] |
| Deterministic verification | `1abbf7dcdde4` | [해당 단계에서 invariant가 도입·확장·수정·검증된 근거를 작성합니다.] |

## 7. Failure → Fix → Test 관계

| Failure 또는 불충분한 상태 | Fix/구현 SHA | Test 또는 후속 증거 |
| --- | --- | --- |
| [이전 failure 또는 불충분한 상태를 작성합니다.] | `8ce1199ffd12` | [fix가 만든 invariant와 test/후속 evidence를 작성합니다.] |
| [이전 failure 또는 불충분한 상태를 작성합니다.] | `d07056e11871` + `59d75fddcaa6` | [fix가 만든 invariant와 test/후속 evidence를 작성합니다.] |
| [이전 failure 또는 불충분한 상태를 작성합니다.] | `1abbf7dcdde4` | [fix가 만든 invariant와 test/후속 evidence를 작성합니다.] |

## 8. Ownership·state·responsibility 변화

| Owner | 최종 책임 | 명시적 비책임 |
| --- | --- | --- |
| Shared request map | [최종 책임을 exact SHA로 작성합니다.] | [소유하지 않는 책임을 작성합니다.] |
| HTTP boundary parser | [최종 책임을 exact SHA로 작성합니다.] | [소유하지 않는 책임을 작성합니다.] |
| Route handler | [최종 책임을 exact SHA로 작성합니다.] | [소유하지 않는 책임을 작성합니다.] |
| Regression suite | [최종 책임을 exact SHA로 작성합니다.] | [소유하지 않는 책임을 작성합니다.] |

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
