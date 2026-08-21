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
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

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
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

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
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

#### Fix 복원

| 항목 | 근거 |
| --- | --- |
| 이전 가정 | [학습자 작성: 이전 가정] |
| 실제 실패/위험 | [학습자 작성: 실제 실패/위험] |
| 근본 원인 | [학습자 작성: 근본 원인] |
| 수정된 불변식 | [학습자 작성: 수정된 불변식] |
| 회귀 근거 | [학습자 작성: 회귀 근거] |

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
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

#### Test 복원

| 항목 | 근거 |
| --- | --- |
| 검증 대상 production 불변식 | [학습자 작성: 검증 대상 production 불변식] |
| 재현한 실패/경계 | [학습자 작성: 재현한 실패/경계] |
| 테스트 기법 | [학습자 작성: 테스트 기법] |
| 증명하는 것 | [학습자 작성: 증명하는 것] |
| 증명하지 않는 것 | [학습자 작성: 증명하지 않는 것] |
| 검증 분류 | [학습자 작성: 검증 분류] |

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
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

#### A-level 불변식 종합

- [학습자 작성: 이 A-level commit이 교정하거나 이전한 핵심 책임]
- [학습자 작성: 실패 시 영향 범위와 남은 비보장]
- [학습자 작성: later fix/test와 연결되는 불변식]

#### Fix 복원

| 항목 | 근거 |
| --- | --- |
| 이전 가정 | [학습자 작성: 이전 가정] |
| 실제 실패/위험 | [학습자 작성: 실제 실패/위험] |
| 근본 원인 | [학습자 작성: 근본 원인] |
| 수정된 불변식 | [학습자 작성: 수정된 불변식] |
| 회귀 근거 | [학습자 작성: 회귀 근거] |

#### 핵심 코드 근거

| 항목 | 값 |
| --- | --- |
| SHA | `353ca9a17415` |
| 파일 | `apps/web/src/lib/api.ts` |
| 함수/위치 | `apiFetch / requestWsTicket` |
| 근거 요약 | [학습자 작성: 이 위치가 상태·소유권·실패 규칙을 어떻게 증명하는지 기록] |

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
| 직전 관련 상태 | [학습자 작성: 직전 관련 상태] |
| 해결하려던 문제 | [학습자 작성: 해결하려던 문제] |
| 핵심 결정 | [학습자 작성: 핵심 결정] |
| 입력 → 상태 전이 → 출력 | [학습자 작성: 입력 → 상태 전이 → 출력] |
| ownership/lifetime/cleanup | [학습자 작성: ownership/lifetime/cleanup] |
| failure/rollback/retry | [학습자 작성: failure/rollback/retry] |
| 보장하는 것 | [학습자 작성: 보장하는 것] |
| 보장하지 않는 것 | [학습자 작성: 보장하지 않는 것] |
| 후속 연결 | [학습자 작성: 후속 연결] |

#### Test 복원

| 항목 | 근거 |
| --- | --- |
| 검증 대상 production 불변식 | [학습자 작성: 검증 대상 production 불변식] |
| 재현한 실패/경계 | [학습자 작성: 재현한 실패/경계] |
| 테스트 기법 | [학습자 작성: 테스트 기법] |
| 증명하는 것 | [학습자 작성: 증명하는 것] |
| 증명하지 않는 것 | [학습자 작성: 증명하지 않는 것] |
| 검증 분류 | [학습자 작성: 검증 분류] |

#### 비교 기준

- Thread 내 직전 관련 SHA: `353ca9a17415` — `fix(web): browser token 저장 제거`
- 이 SHA가 이 Thread의 마지막 고정 commit입니다.
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

## 6. 불변식 발전 기록

| 단계 | 관련 SHA | 학습 기록 |
| --- | --- | --- |
| 공통 adapter 도입 | `20618b30eda9` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| endpoint surface 확장 | `bfae9539cfe5` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| header 의미 교정 | `177fa0b8502a` → `4bc5bba93c4a` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| credential·trust 경계 재설계 | `353ca9a17415` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| 새 경계 검증 | `2aa5fbca9890` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |

## 7. Failure → Fix → Test 관계

| 이전 상태/가정 | 실패 또는 위험 | Fix 연결 | Test/후속 근거 | 관계 해설 |
| --- | --- | --- | --- | --- |
| [학습자 작성: 이전 가정] | [학습자 작성: actual failure/risk] | `177fa0b8502a` | `4bc5bba93c4a` | [학습자 작성: root cause와 corrected invariant를 한 문장으로 연결] |
| [학습자 작성: 이전 가정] | [학습자 작성: actual failure/risk] | `353ca9a17415` | `2aa5fbca9890` | [학습자 작성: root cause와 corrected invariant를 한 문장으로 연결] |
| [학습자 작성: 이전 가정] | [학습자 작성: actual failure/risk] | `353ca9a17415`에서 AbortSignal 도입, transport client에서 generation fencing | `b5691b01a09b` | [학습자 작성: root cause와 corrected invariant를 한 문장으로 연결] |

## 8. Ownership·state·lifetime 변화

| 대상 | 이전 owner/state | 이후 owner/state | 수명/cleanup |
| --- | --- | --- | --- |
| durable session | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| HTTP request construction | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| response trust | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| realtime credential | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| cancellation | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |

## 9. Thread 최종 상태

[학습자 작성: 마지막 고정 SHA에서 실제로 성립하는 최종 상태]

### 최종 실행 흐름

1. [학습자 작성: 입력 또는 route 진입]
2. [학습자 작성: validation/state transition]
3. [학습자 작성: resource acquisition/cleanup]
4. [학습자 작성: output/presentation]
5. [학습자 작성: failure/non-guarantee]

## 10. 학습 완료 점검

- [ ] 모든 commit을 지정 SHA의 parent/diff와 비교했습니다.
- [ ] 후속 HEAD 코드를 이전 SHA 설명에 역투영하지 않았습니다.
- [ ] owner, lifetime, cleanup, failure branch와 non-guarantee를 기록했습니다.
- [ ] fix는 이전 가정과 root cause에, test는 production path와 증명 범위에 연결했습니다.
- [ ] A/B importance 깊이를 구분했고 source subject/tag/role을 유지했습니다.
- [ ] 실행하지 않은 project test에 pass 결과를 만들지 않았습니다.
