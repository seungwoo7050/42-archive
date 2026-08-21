# Chat scope·storage·room authorization

- 카테고리: `04-domain-workflows-and-realtime-features` — 도메인 워크플로와 실시간 기능
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

chat scope와 room ID 조합을 protocol, database, GameHub authorization, browser filtering의 네 경계에서 일관되게 강제하는 과정을 복원합니다.

이 문서는 완성된 해설이 아니라 exact SHA를 순서대로 확인해 구현 발전을 복원하기 위한 scaffold입니다.

### 직접 연결되는 불변식

- lobby chat은 room identity를 가질 수 없고 match chat은 valid room identity를 반드시 가집니다.
- match chat의 sender/audience는 server-owned room membership으로 결정됩니다.
- 다른 room message는 현재 match UI state에 섞이지 않습니다.

## 2. 핵심 질문

- protocol discriminator와 database check constraint가 각각 어떤 invalid state를 막습니까?
- sender가 임의 roomId를 보내도 실제 seat/membership으로 authorization하는 위치는 어디입니까?
- match audience 목록은 room state에서 어떻게 계산되며 disconnected/replaced client를 포함합니까?
- browser filtering은 security boundary가 아니라 presentation isolation이라는 점을 어떻게 구분합니까?

## 3. 완료 기준

- Commit map의 모든 SHA를 지정 브랜치 ancestry에서 확인합니다.
- 각 SHA의 parent 또는 직전 관련 SHA와 비교해 변경 전후 상태를 구분합니다.
- 파일, symbol, caller/callee, 상태 mutation, failure branch, cleanup을 실제 코드로 기록합니다.
- Fix는 이전 가정과 root cause를, test는 production path와 증명/비증명 범위를 연결합니다.
- 마지막 SHA까지만 사용해 Thread 최종 owner, invariant, execution flow를 작성합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Thread 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `00d0d7941382` | `fix(protocol): 채팅 scope와 room 식별자 조합 제한` | A | PROTOCOL, REALTIME, WEB | lobby는 roomId를 금지하고 match는 UUID roomId를 요구하는 discriminated protocol로 바꿉니다. |
| 2 | `5a3819aec8d0` | `test(protocol): 채팅 scope와 room 조합 검증` | B | AUTH, PROTOCOL, REALTIME | invalid lobby/match room combination을 parser negative case로 고정합니다. |
| 3 | `2ff750fa4ff8` | `fix(db): 채팅 행의 scope와 room 불변식 강제` | A | REALTIME, PERSISTENCE, RISK | legacy row 정리 후 scope/room 조합을 check constraint로 강제합니다. |
| 4 | `1cead7cc9f35` | `test(db): 채팅 저장 불변식 검증` | B | REALTIME, PERSISTENCE, TEST | 두 repository에서 chat scope/room consistency를 검증합니다. |
| 5 | `7759eef59b67` | `fix(game): 매치 채팅의 좌석과 audience 검증` | A | REALTIME, PERSISTENCE, RISK | client room ID를 신뢰하지 않고 authoritative room membership으로 sender/audience를 결정합니다. |
| 6 | `4a98bd1e4f22` | `test(game): 타 경기방 채팅 주입 차단 검증` | B | REALTIME, TEST | 동시에 두 room을 만든 뒤 cross-room injection을 거부하는지 검증합니다. |
| 7 | `85edd6d1e26a` | `fix(web): 현재 경기방의 채팅만 표시` | B | REALTIME, WEB | active room predicate로 inbound chat을 reducer 전에 filter합니다. |
| 8 | `02775797ab63` | `test(web): 매치 채팅 room filtering 검증` | B | REALTIME, WEB, TEST | browser room filter boundary를 unit test합니다. |

## 5. Commit별 학습 기록

### 5.1. `fix(protocol): 채팅 scope와 room 식별자 조합 제한`

| 항목 | 값 |
| --- | --- |
| SHA | `00d0d7941382` |
| Importance | A |
| Tags | PROTOCOL, REALTIME, WEB |
| Source에서 확정된 역할 | lobby는 roomId를 금지하고 match는 UUID roomId를 요구하는 discriminated protocol로 바꿉니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- runtime schema의 strictness, negative branch, producer/consumer의 공통 contract 사용 여부를 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- page, component, hook, reducer, query cache 중 실제 state owner와 teardown 시 stale update 방지 경로를 확인합니다.
- 수정 전 가정 → 실제 실패 또는 위험 → root cause → 수정된 invariant를 parent와 이 SHA에서 비교합니다.
- 후속 regression test가 같은 실패를 어떤 fixture 또는 failure injection으로 고정하는지 연결합니다.

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

#### Fix 연결

| 단계 | 기록 |
| --- | --- |
| 이전 가정 | [작성] |
| 실제 실패 또는 위험 | [작성] |
| Root cause | [작성] |
| 수정된 invariant | [작성] |
| 변경 코드 | [SHA·파일·심볼 작성] |
| Regression evidence | [후속 test SHA·fixture 작성] |

비교 기준:
- 이 commit의 parent와 비교합니다.
- 다음 관련 SHA: `5a3819aec8d0` — `test(protocol): 채팅 scope와 room 조합 검증`

### 5.2. `test(protocol): 채팅 scope와 room 조합 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `5a3819aec8d0` |
| Importance | B |
| Tags | AUTH, PROTOCOL, REALTIME |
| Source에서 확정된 역할 | invalid lobby/match room combination을 parser negative case로 고정합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
- runtime schema의 strictness, negative branch, producer/consumer의 공통 contract 사용 여부를 확인합니다.
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
- 직전 관련 SHA: `00d0d7941382` — `fix(protocol): 채팅 scope와 room 식별자 조합 제한`
- 다음 관련 SHA: `2ff750fa4ff8` — `fix(db): 채팅 행의 scope와 room 불변식 강제`

### 5.3. `fix(db): 채팅 행의 scope와 room 불변식 강제`

| 항목 | 값 |
| --- | --- |
| SHA | `2ff750fa4ff8` |
| Importance | A |
| Tags | REALTIME, PERSISTENCE, RISK |
| Source에서 확정된 역할 | legacy row 정리 후 scope/room 조합을 check constraint로 강제합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- 수정 전 가정 → 실제 실패 또는 위험 → root cause → 수정된 invariant를 parent와 이 SHA에서 비교합니다.
- 후속 regression test가 같은 실패를 어떤 fixture 또는 failure injection으로 고정하는지 연결합니다.

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

#### Fix 연결

| 단계 | 기록 |
| --- | --- |
| 이전 가정 | [작성] |
| 실제 실패 또는 위험 | [작성] |
| Root cause | [작성] |
| 수정된 invariant | [작성] |
| 변경 코드 | [SHA·파일·심볼 작성] |
| Regression evidence | [후속 test SHA·fixture 작성] |

비교 기준:
- 직전 관련 SHA: `5a3819aec8d0` — `test(protocol): 채팅 scope와 room 조합 검증`
- 다음 관련 SHA: `1cead7cc9f35` — `test(db): 채팅 저장 불변식 검증`

### 5.4. `test(db): 채팅 저장 불변식 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `1cead7cc9f35` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE, TEST |
| Source에서 확정된 역할 | 두 repository에서 chat scope/room consistency를 검증합니다. |

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
- 직전 관련 SHA: `2ff750fa4ff8` — `fix(db): 채팅 행의 scope와 room 불변식 강제`
- 다음 관련 SHA: `7759eef59b67` — `fix(game): 매치 채팅의 좌석과 audience 검증`

### 5.5. `fix(game): 매치 채팅의 좌석과 audience 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `7759eef59b67` |
| Importance | A |
| Tags | REALTIME, PERSISTENCE, RISK |
| Source에서 확정된 역할 | client room ID를 신뢰하지 않고 authoritative room membership으로 sender/audience를 결정합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- 수정 전 가정 → 실제 실패 또는 위험 → root cause → 수정된 invariant를 parent와 이 SHA에서 비교합니다.
- 후속 regression test가 같은 실패를 어떤 fixture 또는 failure injection으로 고정하는지 연결합니다.

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

#### Fix 연결

| 단계 | 기록 |
| --- | --- |
| 이전 가정 | [작성] |
| 실제 실패 또는 위험 | [작성] |
| Root cause | [작성] |
| 수정된 invariant | [작성] |
| 변경 코드 | [SHA·파일·심볼 작성] |
| Regression evidence | [후속 test SHA·fixture 작성] |

비교 기준:
- 직전 관련 SHA: `1cead7cc9f35` — `test(db): 채팅 저장 불변식 검증`
- 다음 관련 SHA: `4a98bd1e4f22` — `test(game): 타 경기방 채팅 주입 차단 검증`

### 5.6. `test(game): 타 경기방 채팅 주입 차단 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `4a98bd1e4f22` |
| Importance | B |
| Tags | REALTIME, TEST |
| Source에서 확정된 역할 | 동시에 두 room을 만든 뒤 cross-room injection을 거부하는지 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
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
- 직전 관련 SHA: `7759eef59b67` — `fix(game): 매치 채팅의 좌석과 audience 검증`
- 다음 관련 SHA: `85edd6d1e26a` — `fix(web): 현재 경기방의 채팅만 표시`

### 5.7. `fix(web): 현재 경기방의 채팅만 표시`

| 항목 | 값 |
| --- | --- |
| SHA | `85edd6d1e26a` |
| Importance | B |
| Tags | REALTIME, WEB |
| Source에서 확정된 역할 | active room predicate로 inbound chat을 reducer 전에 filter합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- page, component, hook, reducer, query cache 중 실제 state owner와 teardown 시 stale update 방지 경로를 확인합니다.
- 수정 전 가정 → 실제 실패 또는 위험 → root cause → 수정된 invariant를 parent와 이 SHA에서 비교합니다.
- 후속 regression test가 같은 실패를 어떤 fixture 또는 failure injection으로 고정하는지 연결합니다.

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

#### Fix 연결

| 단계 | 기록 |
| --- | --- |
| 이전 가정 | [작성] |
| 실제 실패 또는 위험 | [작성] |
| Root cause | [작성] |
| 수정된 invariant | [작성] |
| 변경 코드 | [SHA·파일·심볼 작성] |
| Regression evidence | [후속 test SHA·fixture 작성] |

비교 기준:
- 직전 관련 SHA: `4a98bd1e4f22` — `test(game): 타 경기방 채팅 주입 차단 검증`
- 다음 관련 SHA: `02775797ab63` — `test(web): 매치 채팅 room filtering 검증`

### 5.8. `test(web): 매치 채팅 room filtering 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `02775797ab63` |
| Importance | B |
| Tags | REALTIME, WEB, TEST |
| Source에서 확정된 역할 | browser room filter boundary를 unit test합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- socket, room, timer, queue 또는 connection state의 owner와 disconnect/replace/cleanup path를 추적합니다.
- page, component, hook, reducer, query cache 중 실제 state owner와 teardown 시 stale update 방지 경로를 확인합니다.
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
- 직전 관련 SHA: `85edd6d1e26a` — `fix(web): 현재 경기방의 채팅만 표시`
- 이 Thread의 최종 상태와 비교합니다.

## 6. Invariant ledger

| Invariant | 도입 SHA | 강화 SHA | 부족함이 드러난 SHA | 복구 fix | 고정 test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| lobby chat은 room identity를 가질 수 없고 match chat은 valid room identity를 반드시 가집니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| match chat의 sender/audience는 server-owned room membership으로 결정됩니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| 다른 room message는 현재 match UI state에 섞이지 않습니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| [작성] | [SHA 순서 작성] | [test/failure injection 작성] | [작성] |

## 8. Ownership / state / responsibility 변화

| 축 | 초기 owner/state | 중간 전환 | 최종 owner/state | cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| protocol discriminator | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| chat row check constraint | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| room membership authorization | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| audience broadcast | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| browser active-room filter | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |

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
