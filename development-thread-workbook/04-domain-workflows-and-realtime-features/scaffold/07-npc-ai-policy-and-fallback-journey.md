# NPC·AI policy와 fallback journey

- 카테고리: `04-domain-workflows-and-realtime-features` — 도메인 워크플로와 실시간 기능
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

NPC를 persisted user subtype으로 모델링하고 rating band별 opponent/AI policy, queue timeout fallback, result identity와 browser 표시까지 연결하는 과정을 복원합니다.

이 문서는 완성된 해설이 아니라 exact SHA를 순서대로 확인해 구현 발전을 복원하기 위한 scaffold입니다.

### 직접 연결되는 불변식

- NPC는 explicit discriminator를 가진 server-managed user identity이며 일반 사용자와 혼동되지 않습니다.
- queue fallback은 bounded delay 후 rating-compatible opponent를 선택하고 stale timer를 정리합니다.
- AI command는 deterministic policy가 만들고 game mechanics authority는 simulation에 남습니다.

## 2. 핵심 질문

- NPC가 ordinary user row와 공유하는 필드와 leaderboard/social 기능에서 제외되는 필드는 무엇입니까?
- closest NPC 선택과 AI behavior profile이 rating을 어떤 서로 다른 목적으로 사용합니까?
- fallback timer cleanup이 normal match/leave/disconnect에서 stale AI room을 막는 근거는 무엇입니까?
- NPC socket이 없어도 room/result에서 opponent identity를 유지하는 owner는 누구입니까?

## 3. 완료 기준

- Commit map의 모든 SHA를 지정 브랜치 ancestry에서 확인합니다.
- 각 SHA의 parent 또는 직전 관련 SHA와 비교해 변경 전후 상태를 구분합니다.
- 파일, symbol, caller/callee, 상태 mutation, failure branch, cleanup을 실제 코드로 기록합니다.
- Fix는 이전 가정과 root cause를, test는 production path와 증명/비증명 범위를 연결합니다.
- 마지막 SHA까지만 사용해 Thread 최종 owner, invariant, execution flow를 작성합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Thread 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `72d23baefc3c` | `feat(db): NPC 사용자 contract와 schema 추가` | B | REALTIME, PERSISTENCE, TOURNAMENT | user persistence/public contract에 NPC discriminator를 추가합니다. |
| 2 | `b3239bae51e5` | `feat(db): rating 구간별 NPC 상대 저장` | B | REALTIME, PERSISTENCE | ascending rating band의 NPC seed와 repository query를 추가합니다. |
| 3 | `dec431822873` | `test(db): NPC seed와 leaderboard 분리 검증` | B | REALTIME, PERSISTENCE, TEST | NPC seed order와 leaderboard 제외/분류를 검증합니다. |
| 4 | `87b38e2f23c8` | `feat(game): NPC 상대를 경기 방에 연결` | B | REALTIME | anonymous AI label 대신 actual NPC user identity를 room/result에 연결합니다. |
| 5 | `1122e6a4b901` | `feat(game): 대기 플레이어 NPC fallback 구성` | B | REALTIME | human queue에서 6초 뒤 closest active NPC로 fallback하는 timer policy를 추가합니다. |
| 6 | `b159bcda3b83` | `feat(game): rating 기반 NPC AI policy 구현` | B | SIMULATION, REALTIME, WEB | rating band별 reaction/aim/error profile을 갖는 deterministic AI policy를 구성합니다. |
| 7 | `afd0a97c5c1c` | `feat(web): 대기열에서 NPC 상대 표시` | B | REALTIME, WEB | queue/match/result UI에 automated opponent identity를 표시합니다. |
| 8 | `cfb15fc84dee` | `test(app): NPC fallback matching 검증` | B | PROTOCOL, REALTIME, PERSISTENCE | human opponent가 없는 실제 WebSocket session으로 delayed fallback을 검증합니다. |

## 5. Commit별 학습 기록

### 5.1. `feat(db): NPC 사용자 contract와 schema 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `72d23baefc3c` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE, TOURNAMENT |
| Source에서 확정된 역할 | user persistence/public contract에 NPC discriminator를 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
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
- 다음 관련 SHA: `b3239bae51e5` — `feat(db): rating 구간별 NPC 상대 저장`

### 5.2. `feat(db): rating 구간별 NPC 상대 저장`

| 항목 | 값 |
| --- | --- |
| SHA | `b3239bae51e5` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE |
| Source에서 확정된 역할 | ascending rating band의 NPC seed와 repository query를 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
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
- 직전 관련 SHA: `72d23baefc3c` — `feat(db): NPC 사용자 contract와 schema 추가`
- 다음 관련 SHA: `dec431822873` — `test(db): NPC seed와 leaderboard 분리 검증`

### 5.3. `test(db): NPC seed와 leaderboard 분리 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `dec431822873` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE, TEST |
| Source에서 확정된 역할 | NPC seed order와 leaderboard 제외/분류를 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
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
- 직전 관련 SHA: `b3239bae51e5` — `feat(db): rating 구간별 NPC 상대 저장`
- 다음 관련 SHA: `87b38e2f23c8` — `feat(game): NPC 상대를 경기 방에 연결`

### 5.4. `feat(game): NPC 상대를 경기 방에 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `87b38e2f23c8` |
| Importance | B |
| Tags | REALTIME |
| Source에서 확정된 역할 | anonymous AI label 대신 actual NPC user identity를 room/result에 연결합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
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
- 직전 관련 SHA: `dec431822873` — `test(db): NPC seed와 leaderboard 분리 검증`
- 다음 관련 SHA: `1122e6a4b901` — `feat(game): 대기 플레이어 NPC fallback 구성`

### 5.5. `feat(game): 대기 플레이어 NPC fallback 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `1122e6a4b901` |
| Importance | B |
| Tags | REALTIME |
| Source에서 확정된 역할 | human queue에서 6초 뒤 closest active NPC로 fallback하는 timer policy를 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
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
- 직전 관련 SHA: `87b38e2f23c8` — `feat(game): NPC 상대를 경기 방에 연결`
- 다음 관련 SHA: `b159bcda3b83` — `feat(game): rating 기반 NPC AI policy 구현`

### 5.6. `feat(game): rating 기반 NPC AI policy 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `b159bcda3b83` |
| Importance | B |
| Tags | SIMULATION, REALTIME, WEB |
| Source에서 확정된 역할 | rating band별 reaction/aim/error profile을 갖는 deterministic AI policy를 구성합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
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
- 직전 관련 SHA: `1122e6a4b901` — `feat(game): 대기 플레이어 NPC fallback 구성`
- 다음 관련 SHA: `afd0a97c5c1c` — `feat(web): 대기열에서 NPC 상대 표시`

### 5.7. `feat(web): 대기열에서 NPC 상대 표시`

| 항목 | 값 |
| --- | --- |
| SHA | `afd0a97c5c1c` |
| Importance | B |
| Tags | REALTIME, WEB |
| Source에서 확정된 역할 | queue/match/result UI에 automated opponent identity를 표시합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
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
- 직전 관련 SHA: `b159bcda3b83` — `feat(game): rating 기반 NPC AI policy 구현`
- 다음 관련 SHA: `cfb15fc84dee` — `test(app): NPC fallback matching 검증`

### 5.8. `test(app): NPC fallback matching 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `cfb15fc84dee` |
| Importance | B |
| Tags | PROTOCOL, REALTIME, PERSISTENCE |
| Source에서 확정된 역할 | human opponent가 없는 실제 WebSocket session으로 delayed fallback을 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- runtime schema의 strictness, negative branch, producer/consumer의 공통 contract 사용 여부를 확인합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
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
- 직전 관련 SHA: `afd0a97c5c1c` — `feat(web): 대기열에서 NPC 상대 표시`
- 이 Thread의 최종 상태와 비교합니다.

## 6. Invariant ledger

| Invariant | 도입 SHA | 강화 SHA | 부족함이 드러난 SHA | 복구 fix | 고정 test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| NPC는 explicit discriminator를 가진 server-managed user identity이며 일반 사용자와 혼동되지 않습니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| queue fallback은 bounded delay 후 rating-compatible opponent를 선택하고 stale timer를 정리합니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| AI command는 deterministic policy가 만들고 game mechanics authority는 simulation에 남습니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| [작성] | [SHA 순서 작성] | [test/failure injection 작성] | [작성] |

## 8. Ownership / state / responsibility 변화

| 축 | 초기 owner/state | 중간 전환 | 최종 owner/state | cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| NPC user rows/seeds | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| rating lookup | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| fallback timer/queue entry | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| room NPC identity | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| PongAi profile | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| browser opponent projection | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |

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

### 교차 참조

- Matchmaker reservation ownership과 deterministic simulation/AI는 Core Category를 교차 참조합니다.

## 11. 학습 완료 자가 점검

- [ ] 모든 SHA를 지정 브랜치에서 확인했습니다.
- [ ] commit subject, importance, tags를 변경하지 않았습니다.
- [ ] final HEAD 코드를 과거 SHA에 소급하지 않았습니다.
- [ ] S/A/B/C에 맞게 조사 깊이를 구분했습니다.
- [ ] fix와 test를 실제 production path에 연결했습니다.
- [ ] 실행하지 않은 명령의 결과를 작성하지 않았습니다.
- [ ] Thread 최종 owner와 execution flow를 실제 근거로 설명할 수 있습니다.
