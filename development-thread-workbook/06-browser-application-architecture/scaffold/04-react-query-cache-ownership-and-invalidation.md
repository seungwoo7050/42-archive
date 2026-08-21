# React Query cache ownership과 invalidation

- 카테고리: `06-browser-application-architecture` — 브라우저 애플리케이션 아키텍처
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

component-owned fetch effect를 하나의 `QueryClient`, stable query key, retry/abort, mutation invalidation과 WebSocket cache update 규칙을 갖는 server-state owner로 이동하는 과정을 복원합니다.

이 문서는 완성된 해설이 아니라 exact SHA를 순서대로 확인해 구현 발전을 복원하기 위한 scaffold입니다.

### 직접 연결되는 불변식

- browser server state는 단일 QueryClient와 stable scoped key가 소유합니다.
- authentication transition은 관련 private cache를 명시적으로 제거하거나 다시 조회하게 합니다.
- query lifecycle은 AbortSignal로 stale in-flight request를 취소합니다.

## 2. 핵심 질문

- query key가 user/handle/tournament scope를 충분히 포함해 cache collision을 막습니까?
- 401/session-expired와 login/logout mutation이 어떤 private cache를 remove/invalidate합니까?
- retry 가능한 network failure와 retry하면 안 되는 auth/validation failure를 어떻게 구분합니까?
- WebSocket event가 HTTP cache를 갱신할 때 canonical server-state owner를 깨지 않습니까?

## 3. 완료 기준

- Commit map의 모든 SHA를 지정 브랜치 ancestry에서 확인합니다.
- 각 SHA의 parent 또는 직전 관련 SHA와 비교해 변경 전후 상태를 구분합니다.
- 파일, symbol, caller/callee, 상태 mutation, failure branch, cleanup을 실제 코드로 기록합니다.
- Fix는 이전 가정과 root cause를, test는 production path와 증명/비증명 범위를 연결합니다.
- 마지막 SHA까지만 사용해 Thread 최종 owner, invariant, execution flow를 작성합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Thread 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `e000e3d6a460` | `refactor(web): query key와 retry 정책 정의` | B | AUTH, TOURNAMENT, WEB | screen migration 전에 cache key vocabulary와 retry policy를 정의합니다. |
| 2 | `d05a962d8829` | `refactor(web): session query와 cache invalidation 추가` | A | TOURNAMENT, WEB, OBSERVABILITY | endpoint별 query option과 session-expiry invalidation을 정의합니다. |
| 3 | `80ec34fde74c` | `refactor(web): React Query provider 연결` | B | AUTH, WEB, OBSERVABILITY | application root에 단일 `QueryClient`를 설치합니다. |
| 4 | `931800f796e1` | `refactor(web): lobby와 login을 query cache로 전환` | B | AUTH, REALTIME, WEB | HTTP load, socket event, login mutation이 동일 cache owner를 갱신합니다. |
| 5 | `8a44c23f15de` | `refactor(web): dashboard와 leaderboard를 query cache로 전환` | B | WEB | component effect를 shared cache로 이동합니다. |
| 6 | `e2ccee689642` | `refactor(web): profile 조회를 query cache로 전환` | B | WEB | route handle을 query identity로 사용합니다. |
| 7 | `045d0cd2c171` | `refactor(web): tournament 조회와 mutation을 query cache로 전환` | B | TOURNAMENT, WEB | tournament read와 create/join mutation을 cache로 이동합니다. |
| 8 | `0b1a6bcb4311` | `refactor(web): admin 조회와 mutation을 query cache로 전환` | B | AUTH, WEB | admin read/status mutation을 cache로 이동합니다. |
| 9 | `0e0c9645ab2d` | `refactor(web): shell의 session 소비를 query cache로 통합` | B | AUTH, WEB | AppShell의 private session effect를 shared query로 교체합니다. |
| 10 | `1ebdce4cdf0a` | `test(web): query cache key·retry·invalidation 검증` | A | AUTH, TOURNAMENT, WEB | key scoping, retry exclusion, login/logout/session-expiry invalidation을 검증합니다. |

## 5. Commit별 학습 기록

### 5.1. `refactor(web): query key와 retry 정책 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `e000e3d6a460` |
| Importance | B |
| Tags | AUTH, TOURNAMENT, WEB |
| Source에서 확정된 역할 | screen migration 전에 cache key vocabulary와 retry policy를 정의합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- page, component, hook, reducer, query cache 중 실제 state owner와 teardown 시 stale update 방지 경로를 확인합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.
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
- 이 commit의 parent와 비교합니다.
- 다음 관련 SHA: `d05a962d8829` — `refactor(web): session query와 cache invalidation 추가`

### 5.2. `refactor(web): session query와 cache invalidation 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `d05a962d8829` |
| Importance | A |
| Tags | TOURNAMENT, WEB, OBSERVABILITY |
| Source에서 확정된 역할 | endpoint별 query option과 session-expiry invalidation을 정의합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- page, component, hook, reducer, query cache 중 실제 state owner와 teardown 시 stale update 방지 경로를 확인합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.
- 측정 위치, label cardinality, threshold, time source와 측정 자체가 동작을 바꾸지 않는지 확인합니다.
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
- 직전 관련 SHA: `e000e3d6a460` — `refactor(web): query key와 retry 정책 정의`
- 다음 관련 SHA: `80ec34fde74c` — `refactor(web): React Query provider 연결`

### 5.3. `refactor(web): React Query provider 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `80ec34fde74c` |
| Importance | B |
| Tags | AUTH, WEB, OBSERVABILITY |
| Source에서 확정된 역할 | application root에 단일 `QueryClient`를 설치합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- page, component, hook, reducer, query cache 중 실제 state owner와 teardown 시 stale update 방지 경로를 확인합니다.
- 측정 위치, label cardinality, threshold, time source와 측정 자체가 동작을 바꾸지 않는지 확인합니다.
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
- 직전 관련 SHA: `d05a962d8829` — `refactor(web): session query와 cache invalidation 추가`
- 다음 관련 SHA: `931800f796e1` — `refactor(web): lobby와 login을 query cache로 전환`

### 5.4. `refactor(web): lobby와 login을 query cache로 전환`

| 항목 | 값 |
| --- | --- |
| SHA | `931800f796e1` |
| Importance | B |
| Tags | AUTH, REALTIME, WEB |
| Source에서 확정된 역할 | HTTP load, socket event, login mutation이 동일 cache owner를 갱신합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- page, component, hook, reducer, query cache 중 실제 state owner와 teardown 시 stale update 방지 경로를 확인합니다.
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
- 직전 관련 SHA: `80ec34fde74c` — `refactor(web): React Query provider 연결`
- 다음 관련 SHA: `8a44c23f15de` — `refactor(web): dashboard와 leaderboard를 query cache로 전환`

### 5.5. `refactor(web): dashboard와 leaderboard를 query cache로 전환`

| 항목 | 값 |
| --- | --- |
| SHA | `8a44c23f15de` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | component effect를 shared cache로 이동합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- page, component, hook, reducer, query cache 중 실제 state owner와 teardown 시 stale update 방지 경로를 확인합니다.
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
- 직전 관련 SHA: `931800f796e1` — `refactor(web): lobby와 login을 query cache로 전환`
- 다음 관련 SHA: `e2ccee689642` — `refactor(web): profile 조회를 query cache로 전환`

### 5.6. `refactor(web): profile 조회를 query cache로 전환`

| 항목 | 값 |
| --- | --- |
| SHA | `e2ccee689642` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | route handle을 query identity로 사용합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- page, component, hook, reducer, query cache 중 실제 state owner와 teardown 시 stale update 방지 경로를 확인합니다.
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
- 직전 관련 SHA: `8a44c23f15de` — `refactor(web): dashboard와 leaderboard를 query cache로 전환`
- 다음 관련 SHA: `045d0cd2c171` — `refactor(web): tournament 조회와 mutation을 query cache로 전환`

### 5.7. `refactor(web): tournament 조회와 mutation을 query cache로 전환`

| 항목 | 값 |
| --- | --- |
| SHA | `045d0cd2c171` |
| Importance | B |
| Tags | TOURNAMENT, WEB |
| Source에서 확정된 역할 | tournament read와 create/join mutation을 cache로 이동합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- page, component, hook, reducer, query cache 중 실제 state owner와 teardown 시 stale update 방지 경로를 확인합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.
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
- 직전 관련 SHA: `e2ccee689642` — `refactor(web): profile 조회를 query cache로 전환`
- 다음 관련 SHA: `0b1a6bcb4311` — `refactor(web): admin 조회와 mutation을 query cache로 전환`

### 5.8. `refactor(web): admin 조회와 mutation을 query cache로 전환`

| 항목 | 값 |
| --- | --- |
| SHA | `0b1a6bcb4311` |
| Importance | B |
| Tags | AUTH, WEB |
| Source에서 확정된 역할 | admin read/status mutation을 cache로 이동합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- page, component, hook, reducer, query cache 중 실제 state owner와 teardown 시 stale update 방지 경로를 확인합니다.
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
- 직전 관련 SHA: `045d0cd2c171` — `refactor(web): tournament 조회와 mutation을 query cache로 전환`
- 다음 관련 SHA: `0e0c9645ab2d` — `refactor(web): shell의 session 소비를 query cache로 통합`

### 5.9. `refactor(web): shell의 session 소비를 query cache로 통합`

| 항목 | 값 |
| --- | --- |
| SHA | `0e0c9645ab2d` |
| Importance | B |
| Tags | AUTH, WEB |
| Source에서 확정된 역할 | AppShell의 private session effect를 shared query로 교체합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- page, component, hook, reducer, query cache 중 실제 state owner와 teardown 시 stale update 방지 경로를 확인합니다.
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
- 직전 관련 SHA: `0b1a6bcb4311` — `refactor(web): admin 조회와 mutation을 query cache로 전환`
- 다음 관련 SHA: `1ebdce4cdf0a` — `test(web): query cache key·retry·invalidation 검증`

### 5.10. `test(web): query cache key·retry·invalidation 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `1ebdce4cdf0a` |
| Importance | A |
| Tags | AUTH, TOURNAMENT, WEB |
| Source에서 확정된 역할 | key scoping, retry exclusion, login/logout/session-expiry invalidation을 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- page, component, hook, reducer, query cache 중 실제 state owner와 teardown 시 stale update 방지 경로를 확인합니다.
- entry, bracket, room, winner, status가 어떤 조건과 순서로 전이되며 중복 진행을 어떻게 막는지 확인합니다.
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
- 직전 관련 SHA: `0e0c9645ab2d` — `refactor(web): shell의 session 소비를 query cache로 통합`
- 이 Thread의 최종 상태와 비교합니다.

## 6. Invariant ledger

| Invariant | 도입 SHA | 강화 SHA | 부족함이 드러난 SHA | 복구 fix | 고정 test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| browser server state는 단일 QueryClient와 stable scoped key가 소유합니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| authentication transition은 관련 private cache를 명시적으로 제거하거나 다시 조회하게 합니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| query lifecycle은 AbortSignal로 stale in-flight request를 취소합니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| [작성] | [SHA 순서 작성] | [test/failure injection 작성] | [작성] |

## 8. Ownership / state / responsibility 변화

| 축 | 초기 owner/state | 중간 전환 | 최종 owner/state | cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| QueryClient | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| query key | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| retry policy | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| AbortSignal | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| mutation invalidation | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| WebSocket cache update | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |

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
