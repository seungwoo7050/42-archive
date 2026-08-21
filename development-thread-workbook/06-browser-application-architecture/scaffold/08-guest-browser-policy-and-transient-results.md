# Guest browser policy와 transient results

- 카테고리: `06-browser-application-architecture` — 브라우저 애플리케이션 아키텍처
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

deployment mode를 browser capability policy로 변환하고 guest login, route/navigation restriction, lobby/play presentation, non-persisted result notice, active room 복귀, reconnect를 연결한 뒤 abuse·recovery·browser E2E로 검증하는 과정을 복원합니다.

### 직접 연결되는 불변식

- server `APP_MODE`와 browser `NEXT_PUBLIC_APP_MODE`는 같은 demo capability를 선택합니다.
- demo navigation과 middleware는 registered-only 화면을 각각 presentation과 direct URL 경계에서 차단합니다.
- guest UI는 durable 전적·rating·ranking·chat을 제공하는 것처럼 표시하지 않습니다.
- `persisted: false` 결과는 임시 결과로 명시하며 dashboard/history로 취급하지 않습니다.
- lobby socket에서 active room event를 회수하면 새 matchmaking intent를 만들지 않고 `/play`로 복귀합니다.
- 최종 browser E2E는 guest entry, restricted navigation, PvP, 6초 AI fallback, fresh-ticket reconnect를 분리 검증합니다.

### 범위 주의

이 Thread는 browser-owned guest capability와 그 통합 evidence를 다룹니다. `eaa4fdaba361`의 server-side guest result producer(`persisted: false`, `matchId: null`, 2분 retention)와 `2b274686e6d4`의 server runtime bound는 upstream 근거로만 참조하며 이 카테고리의 commit map에는 넣지 않습니다. `9f49db1d9f1d`와 `06d2eb7a93cc`는 mixed test commits이므로 browser policy/transport 관련 test만 학습 범위로 삼고 server-only assertion을 browser 보장으로 해석하지 않습니다.

### 교차 Thread 주의

`4f5199097284`는 Thread 04와 의도적으로 중복됩니다. 여기서는 `HomePage`와 `demoPolicy`의 guest route/result handling만 고정하고 transport/reducer/hook 구현은 Thread 04에서만 해설합니다.

## 2. 핵심 질문

- runtime mode와 session secret/proxy trust가 어떤 config에서 fail-closed로 선택됩니까?
- `createNavigation`, restricted paths, presentation flags가 shell/page/middleware에서 어떻게 공유됩니까?
- guest login은 사용자 입력 없이 server-named identity를 cookie session으로 어떻게 수신합니까?
- lobby가 `game.finished persisted:false`, `queue.matched`, `game.snapshot`을 각각 어떻게 처리합니까?
- mixed guest tests에서 browser policy와 server resource abuse evidence를 어떻게 구분합니까?
- Playwright가 실제 WebSocket frame timing과 forced reconnect를 어떤 technique로 관찰합니까?

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
| 1 | `f801ccd09cf0` | `feat(guest): guest runtime 환경 경계 구성` | A | AUTH, WEB | application mode와 proxy trust를 runtime/public browser configuration에 명시합니다. |
| 2 | `e39316254e44` | `feat(web): 비회원 체험 정책 경계 추가` | B | WEB | guest demo surface용 centralized browser policy module을 도입합니다. |
| 3 | `a9fc8a8328b2` | `feat(web): guest login API와 middleware 연결` | B | AUTH, PROTOCOL, TOURNAMENT | guest session adapter와 registered-only screen 차단 middleware를 연결합니다. |
| 4 | `7fdef5d224c4` | `feat(web): LoginPanel guest 진입 연결` | B | WEB | demo mode에서 login panel을 server-managed guest entry에 연결합니다. |
| 5 | `584d17f3aad1` | `feat(web): guest lobby presentation 적용` | B | REALTIME, WEB | guest lobby가 durable progress와 unsupported interaction을 광고하지 않게 합니다. |
| 6 | `658fafd43f88` | `feat(web): demo navigation 정책 연결` | B | WEB | `AppShell`이 capability에 맞는 navigation만 구성합니다. |
| 7 | `fe0f3e0ad0ad` | `feat(web): guest play presentation 적용` | B | WEB | demo mode에서 지원하지 않는 match chat을 숨깁니다. |
| 8 | `618330916629` | `test(web): 비회원 체험 진입 흐름 검증` | B | AUTH, WEB, TEST | guest entry와 browser API boundary를 검증합니다. |
| 9 | `9f49db1d9f1d` | `test(guest): 체험 기능 오용 방지 검증` | A | AUTH, WEB, RISK | guest-mode abuse와 browser capability isolation의 negative boundary를 확장 검증합니다. |
| 10 | `4f5199097284` | `fix(web): 중단된 game reconnect 복구` | A | AUTH, REALTIME, WEB | guest lobby에서 transient result를 명시하고 active room event를 회수하면 game screen으로 복귀합니다. |
| 11 | `06d2eb7a93cc` | `test(guest): 체험 환경의 복구 경계 검증` | A | AUTH, SIMULATION, REALTIME | fresh-ticket reconnect, duplicate match 차단, transient result presentation을 확장 검증합니다. |
| 12 | `1abda1299ad8` | `test(e2e): 비회원 체험 브라우저 흐름 검증` | A | AUTH, REALTIME, WEB | demo-mode guest entry, restricted navigation, two-browser PvP, 6초 AI fallback, ticket-based reconnect를 Playwright로 검증합니다. |

## 5. Commit별 학습 기록

### 5.1. `feat(guest): guest runtime 환경 경계 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `f801ccd09cf0` |
| Importance | A |
| Tags | AUTH, WEB |
| Source에서 확정된 역할 | application mode와 proxy trust를 runtime/public browser configuration에 명시합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `.env.example`, `apps/api/src/env.ts`, browser public env 사용 위치를 확인합니다.
- `APP_MODE`의 development/test/production/demo 값과 `NEXT_PUBLIC_APP_MODE` 연결을 확인합니다.
- demo/production에서 `SESSION_SECRET` 32바이트 이상을 요구하고 `TRUST_PROXY`가 explicit opt-in인지 확인합니다.
- browser build-time public mode와 server runtime mode가 서로 독립적으로 잘못 설정될 가능성도 기록합니다.

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

#### 핵심 코드 근거

| 항목 | 값 |
| --- | --- |
| SHA | `f801ccd09cf0` |
| 파일 | `apps/api/src/env.ts` |
| 함수/위치 | `readEnv / readAppMode` |
| 근거 요약 | [학습자 작성: 이 위치가 상태·소유권·실패 규칙을 어떻게 증명하는지 기록] |

#### 비교 기준

- 이 commit의 parent를 `git show f801ccd09cf0^` 및 `git diff f801ccd09cf0^ f801ccd09cf0`로 비교합니다.
- Thread 내 다음 관련 SHA: `e39316254e44` — `feat(web): 비회원 체험 정책 경계 추가`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.2. `feat(web): 비회원 체험 정책 경계 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `e39316254e44` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | guest demo surface용 centralized browser policy module을 도입합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/lib/demoPolicy.ts`의 registered navigation, demo navigation, restricted path, presentation flags를 확인합니다.
- `createNavigation(demoMode, profileHref)`, `isDemoRestrictedPath`, `isDemoMode`의 pure/input-dependent 범위를 확인합니다.
- demo mode에서 lobby/play만 남고 persisted progress, leaderboard, lobby/match chat flags가 false인지 확인합니다.

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

- Thread 내 직전 관련 SHA: `f801ccd09cf0` — `feat(guest): guest runtime 환경 경계 구성`
- Thread 내 다음 관련 SHA: `a9fc8a8328b2` — `feat(web): guest login API와 middleware 연결`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.3. `feat(web): guest login API와 middleware 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `a9fc8a8328b2` |
| Importance | B |
| Tags | AUTH, PROTOCOL, TOURNAMENT |
| Source에서 확정된 역할 | guest session adapter와 registered-only screen 차단 middleware를 연결합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/lib/api.ts`의 `guestLogin` endpoint, HTTP method/body, shared response schema를 확인합니다.
- `apps/web/src/middleware.ts`가 demo mode에서 `isDemoRestrictedPath`를 사용해 어떤 status/response를 반환하는지 확인합니다.
- navigation 숨김과 direct URL 차단이 별도 계층임을 확인합니다.

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

- Thread 내 직전 관련 SHA: `e39316254e44` — `feat(web): 비회원 체험 정책 경계 추가`
- Thread 내 다음 관련 SHA: `7fdef5d224c4` — `feat(web): LoginPanel guest 진입 연결`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.4. `feat(web): LoginPanel guest 진입 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `7fdef5d224c4` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | demo mode에서 login panel을 server-managed guest entry에 연결합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `LoginPanel.tsx`의 `demoMode`, mutationFn branch, guest response `.user` 사용을 확인합니다.
- demo mode에서 handle/displayName input이 렌더링되지 않는지 확인합니다.
- success 시 `queryKeys.me()` set과 login invalidation, pending/error button label을 확인합니다.

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

- Thread 내 직전 관련 SHA: `a9fc8a8328b2` — `feat(web): guest login API와 middleware 연결`
- Thread 내 다음 관련 SHA: `584d17f3aad1` — `feat(web): guest lobby presentation 적용`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.5. `feat(web): guest lobby presentation 적용`

| 항목 | 값 |
| --- | --- |
| SHA | `584d17f3aad1` |
| Importance | B |
| Tags | REALTIME, WEB |
| Source에서 확정된 역할 | guest lobby가 durable progress와 unsupported interaction을 광고하지 않게 합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/page.tsx`가 `isDemoMode`와 `demoLobbyPresentation`을 소비하는 위치를 확인합니다.
- “전적 저장”→“결과 미저장”, description, leaderboard link, wins/rating cards, lobby chat 조건을 확인합니다.
- online/wait metrics와 play entry는 guest에게 계속 노출되는지 확인합니다.

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

- Thread 내 직전 관련 SHA: `7fdef5d224c4` — `feat(web): LoginPanel guest 진입 연결`
- Thread 내 다음 관련 SHA: `658fafd43f88` — `feat(web): demo navigation 정책 연결`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.6. `feat(web): demo navigation 정책 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `658fafd43f88` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | `AppShell`이 capability에 맞는 navigation만 구성합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `AppShell.tsx`가 inline nav array 대신 `createNavigation(isDemoMode(), profileHref)`를 호출하는지 확인합니다.
- `NavigationId`→Lucide icon mapping이 policy data와 presentation dependency를 분리하는지 확인합니다.
- demo mode에서 lobby/play 두 link만 DOM에 있는지 확인합니다.

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

- Thread 내 직전 관련 SHA: `584d17f3aad1` — `feat(web): guest lobby presentation 적용`
- Thread 내 다음 관련 SHA: `fe0f3e0ad0ad` — `feat(web): guest play presentation 적용`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.7. `feat(web): guest play presentation 적용`

| 항목 | 값 |
| --- | --- |
| SHA | `fe0f3e0ad0ad` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | demo mode에서 지원하지 않는 match chat을 숨깁니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/play/page.tsx`의 `demoMode`와 `showMatchChat` 조건을 확인합니다.
- match chat aside/form 전체가 조건부 렌더링되는지 확인합니다.
- game controls/opponent/canvas는 guest에게 유지되는지 확인합니다.

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

- Thread 내 직전 관련 SHA: `658fafd43f88` — `feat(web): demo navigation 정책 연결`
- Thread 내 다음 관련 SHA: `618330916629` — `test(web): 비회원 체험 진입 흐름 검증`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.8. `test(web): 비회원 체험 진입 흐름 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `618330916629` |
| Importance | B |
| Tags | AUTH, WEB, TEST |
| Source에서 확정된 역할 | guest entry와 browser API boundary를 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/lib/api.test.ts`의 “starts a server-named guest session without profile input” case를 확인합니다.
- URL `/auth/guest`, method POST, `credentials: include`, body undefined, response schema result를 확인합니다.
- endpoint helper table에 `guestLogin`이 포함돼 malformed response parsing도 공유하는지 확인합니다.

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

- Thread 내 직전 관련 SHA: `fe0f3e0ad0ad` — `feat(web): guest play presentation 적용`
- Thread 내 다음 관련 SHA: `9f49db1d9f1d` — `test(guest): 체험 기능 오용 방지 검증`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.9. `test(guest): 체험 기능 오용 방지 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `9f49db1d9f1d` |
| Importance | A |
| Tags | AUTH, WEB, RISK |
| Source에서 확정된 역할 | guest-mode abuse와 browser capability isolation의 negative boundary를 확장 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 Thread에서는 `apps/web/src/lib/demoPolicy.test.ts`와 `apps/api/src/env.test.ts`의 mode/secret/proxy case를 우선 조사합니다.
- `createNavigation(true/false)`, presentation flags, restricted path positive/negative case를 확인합니다.
- 같은 commit의 `GuestAccess`, `GameHub`, HTTP abuse tests는 server-side evidence이며 browser policy 보장과 구분해 기록합니다.
- strong secret과 explicit proxy trust가 false/true input에서 어떻게 test되는지 확인합니다.

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

#### Test 복원

| 항목 | 근거 |
| --- | --- |
| 검증 대상 production 불변식 | [학습자 작성: 검증 대상 production 불변식] |
| 재현한 실패/경계 | [학습자 작성: 재현한 실패/경계] |
| 테스트 기법 | [학습자 작성: 테스트 기법] |
| 증명하는 것 | [학습자 작성: 증명하는 것] |
| 증명하지 않는 것 | [학습자 작성: 증명하지 않는 것] |
| 검증 분류 | [학습자 작성: 검증 분류] |

#### 핵심 코드 근거

| 항목 | 값 |
| --- | --- |
| SHA | `9f49db1d9f1d` |
| 파일 | `apps/web/src/lib/demoPolicy.test.ts` |
| 함수/위치 | `guest demo presentation policy` |
| 근거 요약 | [학습자 작성: 이 위치가 상태·소유권·실패 규칙을 어떻게 증명하는지 기록] |

#### 비교 기준

- Thread 내 직전 관련 SHA: `618330916629` — `test(web): 비회원 체험 진입 흐름 검증`
- Thread 내 다음 관련 SHA: `4f5199097284` — `fix(web): 중단된 game reconnect 복구`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.10. `fix(web): 중단된 game reconnect 복구`

| 항목 | 값 |
| --- | --- |
| SHA | `4f5199097284` |
| Importance | A |
| Tags | AUTH, REALTIME, WEB |
| Source에서 확정된 역할 | guest lobby에서 transient result를 명시하고 active room event를 회수하면 game screen으로 복귀합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 Thread에서는 `apps/web/src/app/page.tsx`와 `apps/web/src/lib/demoPolicy.ts`만 조사합니다. 같은 SHA의 client/reducer/hook reconnect는 Thread 04에서 다룹니다.
- `formatTransientResultNotice`가 `persisted: false`, score를 어떤 문구로 표시하는지 확인합니다.
- `shouldResumeGameFromLobby`가 `queue.matched`와 `game.snapshot`만 true인지 확인합니다.
- HomePage lobby socket handler가 resume event를 `/play` redirect보다 먼저 처리하고 transient finish는 notice로 표시하는지 확인합니다.
- upstream `eaa4fdaba361`의 guest result `persisted:false` contract를 later code로 역투영하지 말고 producer dependency로만 연결합니다.

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
| SHA | `4f5199097284` |
| 파일 | `apps/web/src/lib/demoPolicy.ts` |
| 함수/위치 | `formatTransientResultNotice / shouldResumeGameFromLobby` |
| 근거 요약 | [학습자 작성: 이 위치가 상태·소유권·실패 규칙을 어떻게 증명하는지 기록] |

#### 비교 기준

- Thread 내 직전 관련 SHA: `9f49db1d9f1d` — `test(guest): 체험 기능 오용 방지 검증`
- Thread 내 다음 관련 SHA: `06d2eb7a93cc` — `test(guest): 체험 환경의 복구 경계 검증`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.11. `test(guest): 체험 환경의 복구 경계 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `06d2eb7a93cc` |
| Importance | A |
| Tags | AUTH, SIMULATION, REALTIME |
| Source에서 확정된 역할 | fresh-ticket reconnect, duplicate match 차단, transient result presentation을 확장 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/lib/demoPolicy.test.ts`의 transient notice와 lobby resume event case를 확인합니다.
- `apps/web/src/game/GameSocketClient.test.ts`가 close 후 fresh ticket으로 reconnect하고 original queue command를 보내지 않는지 확인합니다.
- `apps/web/src/game/gameConnection.test.ts`의 `canStartNewMatch` reconnecting/current-room negative case를 확인합니다.
- 같은 commit의 GuestAccess cleanup/env tests는 upstream `2b274686e6d4`를 검증하는 server evidence이며 browser guarantee와 구분합니다.

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

- Thread 내 직전 관련 SHA: `4f5199097284` — `fix(web): 중단된 game reconnect 복구`
- Thread 내 다음 관련 SHA: `1abda1299ad8` — `test(e2e): 비회원 체험 브라우저 흐름 검증`
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

### 5.12. `test(e2e): 비회원 체험 브라우저 흐름 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `1abda1299ad8` |
| Importance | A |
| Tags | AUTH, REALTIME, WEB |
| Source에서 확정된 역할 | demo-mode guest entry, restricted navigation, two-browser PvP, 6초 AI fallback, ticket-based reconnect를 Playwright로 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `package.json`의 `e2e:guest-demo` command와 `E2E_APP_MODE=demo`, single worker 조건을 확인합니다.
- `tests/e2e/guest-demo.spec.ts`의 `enterAsGuest`, two isolated contexts, frame watcher, `routeWebSocket` forced close를 확인합니다.
- guest name regex, navigation link text, hidden admin, PvP ready/playing, AI fallback 5.5~10초, reconnecting→playing assertion을 확인합니다.
- test skip 조건이 demo mode/chromium desktop에 어떻게 제한되는지 확인합니다.

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

#### Test 복원

| 항목 | 근거 |
| --- | --- |
| 검증 대상 production 불변식 | [학습자 작성: 검증 대상 production 불변식] |
| 재현한 실패/경계 | [학습자 작성: 재현한 실패/경계] |
| 테스트 기법 | [학습자 작성: 테스트 기법] |
| 증명하는 것 | [학습자 작성: 증명하는 것] |
| 증명하지 않는 것 | [학습자 작성: 증명하지 않는 것] |
| 검증 분류 | [학습자 작성: 검증 분류] |

#### 핵심 코드 근거

| 항목 | 값 |
| --- | --- |
| SHA | `1abda1299ad8` |
| 파일 | `tests/e2e/guest-demo.spec.ts` |
| 함수/위치 | `guest demo browser flow` |
| 근거 요약 | [학습자 작성: 이 위치가 상태·소유권·실패 규칙을 어떻게 증명하는지 기록] |

#### 비교 기준

- Thread 내 직전 관련 SHA: `06d2eb7a93cc` — `test(guest): 체험 환경의 복구 경계 검증`
- 이 SHA가 이 Thread의 마지막 고정 commit입니다.
- 설명은 이 SHA에서 존재하는 코드만 사용하며 후속 HEAD 구현을 역투영하지 않습니다.

## 6. 불변식 발전 기록

| 단계 | 관련 SHA | 학습 기록 |
| --- | --- | --- |
| runtime mode/secret 경계 | `f801ccd09cf0` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| browser policy 도입 | `e39316254e44` → `a9fc8a8328b2` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| UI capability 적용 | `7fdef5d224c4` → `fe0f3e0ad0ad` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| entry/abuse evidence | `618330916629` → `9f49db1d9f1d` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| transient/recovery 교정 | `4f5199097284` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| recovery regression | `06d2eb7a93cc` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |
| browser E2E | `1abda1299ad8` | [학습자 작성: introduced/extended/insufficient/corrected/verified 상태를 구분] |

## 7. Failure → Fix → Test 관계

| 이전 상태/가정 | 실패 또는 위험 | Fix 연결 | Test/후속 근거 | 관계 해설 |
| --- | --- | --- | --- | --- |
| [학습자 작성: 이전 가정] | [학습자 작성: actual failure/risk] | `f801ccd09cf0` | `9f49db1d9f1d`, `06d2eb7a93cc` env tests | [학습자 작성: root cause와 corrected invariant를 한 문장으로 연결] |
| [학습자 작성: 이전 가정] | [학습자 작성: actual failure/risk] | `584d17f3aad1`, `658fafd43f88`, `fe0f3e0ad0ad` | `9f49db1d9f1d`, `1abda1299ad8` | [학습자 작성: root cause와 corrected invariant를 한 문장으로 연결] |
| [학습자 작성: 이전 가정] | [학습자 작성: actual failure/risk] | `4f5199097284` | `06d2eb7a93cc`, `1abda1299ad8` | [학습자 작성: root cause와 corrected invariant를 한 문장으로 연결] |
| [학습자 작성: 이전 가정] | [학습자 작성: actual failure/risk] | Thread 04 범위의 `4f5199097284` | `06d2eb7a93cc`, `1abda1299ad8` | [학습자 작성: root cause와 corrected invariant를 한 문장으로 연결] |

## 8. Ownership·state·lifetime 변화

| 대상 | 이전 owner/state | 이후 owner/state | 수명/cleanup |
| --- | --- | --- | --- |
| deployment capability | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| browser capability matrix | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| direct route presentation | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| guest identity entry | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| transient result presentation | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| active room recovery navigation | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |
| reconnect transport | [학습자 작성: 이전 owner/state] | [학습자 작성: 이후 owner/state] | [학습자 작성: lifetime/cleanup] |

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
