# 실행 가능한 HTTP contract와 resource API

- 카테고리: `01-foundations-and-api-boundaries` — 애플리케이션 기반과 API 경계
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

compile-time DTO에서 endpoint별 runtime schema로 발전하고 Fastify route가 profile, friendship, lobby, tournament, administration resource를 typed contract로 제공하는 과정을 복원합니다.

이 문서는 완성된 해설이 아니라 exact SHA를 순서대로 확인해 구현 발전을 복원하기 위한 scaffold입니다.

### 직접 연결되는 불변식

- 모든 JSON resource는 shared runtime contract를 통해 입력과 출력을 검증할 수 있습니다.
- route는 persistence 또는 internal error를 임의의 성공 response로 변환하지 않습니다.
- HTTP failure는 machine-readable code와 request correlation 정보를 갖습니다.

## 2. 핵심 질문

- domain schema와 endpoint response schema는 어떤 방식으로 조합됩니까?
- public read, authenticated read, identity-bound mutation, administrator mutation은 route에서 어떻게 구분됩니까?
- Fastify handler가 untyped repository value를 response로 내보내기 전에 어떤 output validation을 수행합니까?
- typed error boundary가 validation, unauthenticated, forbidden, not-found, internal failure를 어떻게 분류합니까?

## 3. 완료 기준

- Commit map의 모든 SHA를 지정 브랜치 ancestry에서 확인합니다.
- 각 SHA의 parent 또는 직전 관련 SHA와 비교해 변경 전후 상태를 구분합니다.
- 파일, symbol, caller/callee, 상태 mutation, failure branch, cleanup을 실제 코드로 기록합니다.
- Fix는 이전 가정과 root cause를, test는 production path와 증명/비증명 범위를 연결합니다.
- 마지막 SHA까지만 사용해 Thread 최종 owner, invariant, execution flow를 작성합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Thread 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `0c5c27c8c3df` | `feat(shared): 사용자 HTTP runtime contract 정의` | B | PROTOCOL, TOURNAMENT | user interface를 실행 가능한 Zod schema로 교체합니다. |
| 2 | `6704f37ca6a3` | `feat(shared): 경기·대시보드 runtime contract 정의` | B | PROTOCOL | match, dashboard, leaderboard response contract를 정의합니다. |
| 3 | `4bace138f188` | `feat(shared): 친구·채팅·로비 runtime contract 정의` | B | PROTOCOL, REALTIME | friendship, chat, lobby stats/response의 runtime validation을 추가합니다. |
| 4 | `7d0793a23f5d` | `feat(shared): 토너먼트·관리 runtime contract 정의` | B | PROTOCOL, TOURNAMENT, OPERATIONS | tournament aggregate와 admin audit response schema를 정의합니다. |
| 5 | `282a9d0beb47` | `feat(shared): HTTP 요청·오류 schema 정의` | B | - | route parameter, request body, 공통 error envelope schema를 정의합니다. |
| 6 | `e226b68fe235` | `feat(shared): HTTP 응답 runtime contract 정의` | B | AUTH, PROTOCOL, REALTIME | domain validator를 endpoint별 response schema로 조합합니다. |
| 7 | `78cf83f29e80` | `test(shared): HTTP contract 검증` | B | AUTH, PROTOCOL, TEST | HTTP schema에 포함된 behavioral rule과 negative shape를 검증합니다. |
| 8 | `1779df300611` | `feat(api): 로그인과 로비 HTTP 경계 구현` | B | AUTH, PERSISTENCE, WEB | repository-backed identity와 lobby를 첫 Fastify HTTP resource로 노출합니다. |
| 9 | `0bcc487d949f` | `feat(api): 프로필과 친구 리소스 라우트 추가` | B | PERSISTENCE | public profile/dashboard와 identity-bound friendship mutation을 구분합니다. |
| 10 | `e8bb6a4bf68b` | `feat(api): 토너먼트와 관리자 라우트 추가` | B | AUTH, PERSISTENCE, TOURNAMENT | tournament와 administration resource에 authentication/authorization을 적용합니다. |
| 11 | `ac85316bb0cb` | `feat(api): typed HTTP 오류 boundary 추가` | A | AUTH, PROTOCOL, RISK | route failure를 status/code/request ID/field error를 갖는 중앙 typed boundary로 통합합니다. |
| 12 | `c4cba7d3f871` | `feat(api): 인증·사용자 HTTP contract 적용` | B | AUTH, PROTOCOL, WEB | health/auth/user/profile route에 shared contract와 typed error를 적용합니다. |
| 13 | `05e3ecfa2a2d` | `feat(api): 로비·친구 HTTP contract 적용` | B | AUTH, PROTOCOL, PERSISTENCE | lobby/chat/leaderboard/dashboard/friendship route에 contract를 적용합니다. |
| 14 | `24f99345452d` | `feat(api): 토너먼트·관리 HTTP contract 적용` | B | AUTH, TOURNAMENT | tournament/admin route의 request/response/error contract를 통합합니다. |
| 15 | `b2a8de5a0027` | `refactor(api): HTTP boundary helper 통합` | B | AUTH | route-local failure helper를 제거하고 공통 typed boundary를 직접 사용합니다. |

## 5. Commit별 학습 기록

### 5.1. `feat(shared): 사용자 HTTP runtime contract 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `0c5c27c8c3df` |
| Importance | B |
| Tags | PROTOCOL, TOURNAMENT |
| Source에서 확정된 역할 | user interface를 실행 가능한 Zod schema로 교체합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- runtime schema의 strictness, negative branch, producer/consumer의 공통 contract 사용 여부를 확인합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

비교 기준:
- 이 commit의 parent와 비교합니다.
- 다음 관련 SHA: `6704f37ca6a3` — `feat(shared): 경기·대시보드 runtime contract 정의`

### 5.2. `feat(shared): 경기·대시보드 runtime contract 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `6704f37ca6a3` |
| Importance | B |
| Tags | PROTOCOL |
| Source에서 확정된 역할 | match, dashboard, leaderboard response contract를 정의합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- runtime schema의 strictness, negative branch, producer/consumer의 공통 contract 사용 여부를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

비교 기준:
- 직전 관련 SHA: `0c5c27c8c3df` — `feat(shared): 사용자 HTTP runtime contract 정의`
- 다음 관련 SHA: `4bace138f188` — `feat(shared): 친구·채팅·로비 runtime contract 정의`

### 5.3. `feat(shared): 친구·채팅·로비 runtime contract 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `4bace138f188` |
| Importance | B |
| Tags | PROTOCOL, REALTIME |
| Source에서 확정된 역할 | friendship, chat, lobby stats/response의 runtime validation을 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- runtime schema의 strictness, negative branch, producer/consumer의 공통 contract 사용 여부를 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

비교 기준:
- 직전 관련 SHA: `6704f37ca6a3` — `feat(shared): 경기·대시보드 runtime contract 정의`
- 다음 관련 SHA: `7d0793a23f5d` — `feat(shared): 토너먼트·관리 runtime contract 정의`

### 5.4. `feat(shared): 토너먼트·관리 runtime contract 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `7d0793a23f5d` |
| Importance | B |
| Tags | PROTOCOL, TOURNAMENT, OPERATIONS |
| Source에서 확정된 역할 | tournament aggregate와 admin audit response schema를 정의합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- runtime schema의 strictness, negative branch, producer/consumer의 공통 contract 사용 여부를 확인합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

비교 기준:
- 직전 관련 SHA: `4bace138f188` — `feat(shared): 친구·채팅·로비 runtime contract 정의`
- 다음 관련 SHA: `282a9d0beb47` — `feat(shared): HTTP 요청·오류 schema 정의`

### 5.5. `feat(shared): HTTP 요청·오류 schema 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `282a9d0beb47` |
| Importance | B |
| Tags | - |
| Source에서 확정된 역할 | route parameter, request body, 공통 error envelope schema를 정의합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

비교 기준:
- 직전 관련 SHA: `7d0793a23f5d` — `feat(shared): 토너먼트·관리 runtime contract 정의`
- 다음 관련 SHA: `e226b68fe235` — `feat(shared): HTTP 응답 runtime contract 정의`

### 5.6. `feat(shared): HTTP 응답 runtime contract 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `e226b68fe235` |
| Importance | B |
| Tags | AUTH, PROTOCOL, REALTIME |
| Source에서 확정된 역할 | domain validator를 endpoint별 response schema로 조합합니다. |

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
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

비교 기준:
- 직전 관련 SHA: `282a9d0beb47` — `feat(shared): HTTP 요청·오류 schema 정의`
- 다음 관련 SHA: `78cf83f29e80` — `test(shared): HTTP contract 검증`

### 5.7. `test(shared): HTTP contract 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `78cf83f29e80` |
| Importance | B |
| Tags | AUTH, PROTOCOL, TEST |
| Source에서 확정된 역할 | HTTP schema에 포함된 behavioral rule과 negative shape를 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- runtime schema의 strictness, negative branch, producer/consumer의 공통 contract 사용 여부를 확인합니다.
- 테스트가 주입하는 입력·시간·동시성·오류와 실제 production path를 구분해 기록합니다.
- 테스트가 증명하는 범위와 실제 process/network/database까지는 증명하지 않는 범위를 함께 기록합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | [작성] |
| 재현하는 failure/boundary | [작성] |
| test technique | [unit/integration/concurrency/failure injection/process/browser/load 중 구분] |
| 통과하는 production path | [caller 순서 작성] |
| 증명하는 것 | [작성] |
| 증명하지 않는 것 | [작성] |
| 후속 회귀 방지 | [작성] |

비교 기준:
- 직전 관련 SHA: `e226b68fe235` — `feat(shared): HTTP 응답 runtime contract 정의`
- 다음 관련 SHA: `1779df300611` — `feat(api): 로그인과 로비 HTTP 경계 구현`

### 5.8. `feat(api): 로그인과 로비 HTTP 경계 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `1779df300611` |
| Importance | B |
| Tags | AUTH, PERSISTENCE, WEB |
| Source에서 확정된 역할 | repository-backed identity와 lobby를 첫 Fastify HTTP resource로 노출합니다. |

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
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

비교 기준:
- 직전 관련 SHA: `78cf83f29e80` — `test(shared): HTTP contract 검증`
- 다음 관련 SHA: `0bcc487d949f` — `feat(api): 프로필과 친구 리소스 라우트 추가`

### 5.9. `feat(api): 프로필과 친구 리소스 라우트 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `0bcc487d949f` |
| Importance | B |
| Tags | PERSISTENCE |
| Source에서 확정된 역할 | public profile/dashboard와 identity-bound friendship mutation을 구분합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

비교 기준:
- 직전 관련 SHA: `1779df300611` — `feat(api): 로그인과 로비 HTTP 경계 구현`
- 다음 관련 SHA: `e8bb6a4bf68b` — `feat(api): 토너먼트와 관리자 라우트 추가`

### 5.10. `feat(api): 토너먼트와 관리자 라우트 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `e8bb6a4bf68b` |
| Importance | B |
| Tags | AUTH, PERSISTENCE, TOURNAMENT |
| Source에서 확정된 역할 | tournament와 administration resource에 authentication/authorization을 적용합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

비교 기준:
- 직전 관련 SHA: `0bcc487d949f` — `feat(api): 프로필과 친구 리소스 라우트 추가`
- 다음 관련 SHA: `ac85316bb0cb` — `feat(api): typed HTTP 오류 boundary 추가`

### 5.11. `feat(api): typed HTTP 오류 boundary 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `ac85316bb0cb` |
| Importance | A |
| Tags | AUTH, PROTOCOL, RISK |
| Source에서 확정된 역할 | route failure를 status/code/request ID/field error를 갖는 중앙 typed boundary로 통합합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- runtime schema의 strictness, negative branch, producer/consumer의 공통 contract 사용 여부를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

비교 기준:
- 직전 관련 SHA: `e8bb6a4bf68b` — `feat(api): 토너먼트와 관리자 라우트 추가`
- 다음 관련 SHA: `c4cba7d3f871` — `feat(api): 인증·사용자 HTTP contract 적용`

### 5.12. `feat(api): 인증·사용자 HTTP contract 적용`

| 항목 | 값 |
| --- | --- |
| SHA | `c4cba7d3f871` |
| Importance | B |
| Tags | AUTH, PROTOCOL, WEB |
| Source에서 확정된 역할 | health/auth/user/profile route에 shared contract와 typed error를 적용합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- runtime schema의 strictness, negative branch, producer/consumer의 공통 contract 사용 여부를 확인합니다.
- page, component, hook, reducer, query cache 중 실제 state owner와 teardown 시 stale update 방지 경로를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

비교 기준:
- 직전 관련 SHA: `ac85316bb0cb` — `feat(api): typed HTTP 오류 boundary 추가`
- 다음 관련 SHA: `05e3ecfa2a2d` — `feat(api): 로비·친구 HTTP contract 적용`

### 5.13. `feat(api): 로비·친구 HTTP contract 적용`

| 항목 | 값 |
| --- | --- |
| SHA | `05e3ecfa2a2d` |
| Importance | B |
| Tags | AUTH, PROTOCOL, PERSISTENCE |
| Source에서 확정된 역할 | lobby/chat/leaderboard/dashboard/friendship route에 contract를 적용합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- runtime schema의 strictness, negative branch, producer/consumer의 공통 contract 사용 여부를 확인합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

비교 기준:
- 직전 관련 SHA: `c4cba7d3f871` — `feat(api): 인증·사용자 HTTP contract 적용`
- 다음 관련 SHA: `24f99345452d` — `feat(api): 토너먼트·관리 HTTP contract 적용`

### 5.14. `feat(api): 토너먼트·관리 HTTP contract 적용`

| 항목 | 값 |
| --- | --- |
| SHA | `24f99345452d` |
| Importance | B |
| Tags | AUTH, TOURNAMENT |
| Source에서 확정된 역할 | tournament/admin route의 request/response/error contract를 통합합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

비교 기준:
- 직전 관련 SHA: `05e3ecfa2a2d` — `feat(api): 로비·친구 HTTP contract 적용`
- 다음 관련 SHA: `b2a8de5a0027` — `refactor(api): HTTP boundary helper 통합`

### 5.15. `refactor(api): HTTP boundary helper 통합`

| 항목 | 값 |
| --- | --- |
| SHA | `b2a8de5a0027` |
| Importance | B |
| Tags | AUTH |
| Source에서 확정된 역할 | route-local failure helper를 제거하고 공통 typed boundary를 직접 사용합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- 기존 경로와 새 경로가 공존하는 migration 구간 및 최종 duplicate implementation 제거 여부를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | [파일·심볼·조건·관찰 결과 작성] |
| 해결하려던 문제 | [기존 동작과 부족함 작성] |
| 핵심 결정 | [변경된 책임·조건·자료구조 작성] |
| 입력 → 상태 전이 → 출력 | [caller/callee 순서 작성] |
| ownership/lifetime/cleanup | [획득·이전·해제 주체 작성] |
| failure/rollback/retry | [실패 분기와 복구 작성] |
| 보장하는 것 | [실제 코드로 증명되는 범위 작성] |
| 보장하지 않는 것 | [아직 남은 제한 작성] |
| 후속 연결 | [다음 fix/test/통합 commit과 연결] |

비교 기준:
- 직전 관련 SHA: `24f99345452d` — `feat(api): 토너먼트·관리 HTTP contract 적용`
- 이 Thread의 최종 상태와 비교합니다.

## 6. Invariant ledger

| Invariant | 도입 SHA | 강화 SHA | 부족함이 드러난 SHA | 복구 fix | 고정 test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| 모든 JSON resource는 shared runtime contract를 통해 입력과 출력을 검증할 수 있습니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| route는 persistence 또는 internal error를 임의의 성공 response로 변환하지 않습니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| HTTP failure는 machine-readable code와 request correlation 정보를 갖습니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| [작성] | [SHA 순서 작성] | [test/failure injection 작성] | [작성] |

## 8. Ownership / state / responsibility 변화

| 축 | 초기 owner/state | 중간 전환 | 최종 owner/state | cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| shared schema composition | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| Fastify route authorization | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| request/output parsing | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| typed error mapping | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| repository-to-response projection | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |

## 9. Thread 최종 상태

- 최종 authoritative owner: [작성]
- 최종 상태/invariant: [작성]
- 남아 있는 의도적 제한 또는 비보장: [작성]
- 다른 Thread가 의존하는 contract: [작성]
- 대표 코드 근거: [SHA·파일·심볼 작성]

## 10. 최종 execution flow

```text
[입력/이벤트]
    ↓
[검증·권한·소유권 경계]
    ↓
[상태 전이·DB 작업·브라우저 반영]
    ↓
[출력·관측·rollback·cleanup]
```

## 11. 학습 완료 자가 점검

- [ ] 모든 SHA를 지정 브랜치에서 확인했습니다.
- [ ] commit subject, importance, tags를 변경하지 않았습니다.
- [ ] final HEAD 코드를 과거 SHA에 소급하지 않았습니다.
- [ ] S/A/B/C에 맞게 조사 깊이를 구분했습니다.
- [ ] fix와 test를 실제 production path에 연결했습니다.
- [ ] 실행하지 않은 명령의 결과를 작성하지 않았습니다.
- [ ] Thread 최종 owner와 execution flow를 실제 근거로 설명할 수 있습니다.
