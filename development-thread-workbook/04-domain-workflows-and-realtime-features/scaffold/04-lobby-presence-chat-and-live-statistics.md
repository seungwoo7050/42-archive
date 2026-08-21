# Lobby presence·chat·live statistics

- 카테고리: `04-domain-workflows-and-realtime-features` — 도메인 워크플로와 실시간 기능
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

persistent user listing이 아니라 active WebSocket hub를 presence authority로 삼고 lobby chat과 queue/room statistics를 HTTP·WebSocket·browser에 연결하는 과정을 복원합니다.

이 문서는 완성된 해설이 아니라 exact SHA를 순서대로 확인해 구현 발전을 복원하기 위한 scaffold입니다.

### 직접 연결되는 불변식

- 현재 접속 상태의 authority는 realtime connection hub입니다.
- lobby statistics는 live queue/room state를 반영하며 fabricated 값으로 보충하지 않습니다.
- chat message는 authenticated sender와 명시적인 scope를 가진 persistence record입니다.

## 2. 핵심 질문

- online presence가 database `online` field가 아니라 current socket map에서 파생되는 근거는 무엇입니까?
- HTTP lobby response와 realtime presence event가 같은 GameHub state를 읽습니까?
- queue wait sample의 생성·보존·average 계산 범위는 무엇입니까?
- chat persistence 성공과 broadcast/cache update 순서는 어떻게 정해집니까?

## 3. 완료 기준

- Commit map의 모든 SHA를 지정 브랜치 ancestry에서 확인합니다.
- 각 SHA의 parent 또는 직전 관련 SHA와 비교해 변경 전후 상태를 구분합니다.
- 파일, symbol, caller/callee, 상태 mutation, failure branch, cleanup을 실제 코드로 기록합니다.
- Fix는 이전 가정과 root cause를, test는 production path와 증명/비증명 범위를 연결합니다.
- 마지막 SHA까지만 사용해 Thread 최종 owner, invariant, execution flow를 작성합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Thread 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `a6fa5a187eec` | `feat(db): 채팅 메시지 저장 구현` | B | REALTIME, PERSISTENCE | lobby/match scope chat persistence operation을 repository에 추가합니다. |
| 2 | `dabd8d5c2a49` | `feat(game): 실시간 경기 채팅 전달` | B | PROTOCOL, REALTIME, PERSISTENCE | validated `chat.send`를 async repository-backed realtime operation으로 처리합니다. |
| 3 | `cd3787eefd6a` | `feat(chat): 로비 채팅과 접속 상태 실시간 반영` | B | AUTH, REALTIME, WEB | lobby가 authenticated WebSocket으로 chat/presence event를 구독합니다. |
| 4 | `8debb1ea3ad3` | `feat(lobby): 연결 중인 WebSocket 사용자 목록 추가` | B | REALTIME | GameHub current clients를 lobby presence authority로 사용합니다. |
| 5 | `c3ff9ed2402f` | `test(lobby): WebSocket 사용자 목록 검증` | B | REALTIME, PERSISTENCE, TEST | socket이 없으면 online list가 비어 있는지 검증합니다. |
| 6 | `1d9aa3902614` | `feat(lobby): 실시간 로비 지표 API 추가` | B | REALTIME | online/playing/queued/rooms/average wait를 GameHub live stats로 제공합니다. |
| 7 | `de9a173e6eb1` | `feat(chat): 쓰기 가능한 로비 채팅 API 추가` | B | REALTIME, PERSISTENCE | authenticated lobby message validation과 persistence를 HTTP mutation으로 제공합니다. |
| 8 | `e0ef3fec89a6` | `feat(chat): 로비 채팅 입력 화면 추가` | B | WEB | controlled lobby chat form과 bounded local history update를 추가합니다. |
| 9 | `4f9b3b312d0e` | `fix(lobby): 로비 상태 표현 개선` | B | REALTIME | server live statistics와 missing average-wait 상태를 정확히 표시합니다. |
| 10 | `8078ac6f92ba` | `test(app): 실시간 지표·채팅·경기 기록 검증` | B | REALTIME, PERSISTENCE, WEB | stats, lobby/match attribution, recent match ordering을 통합 검증합니다. |

## 5. Commit별 학습 기록

### 5.1. `feat(db): 채팅 메시지 저장 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `a6fa5a187eec` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE |
| Source에서 확정된 역할 | lobby/match scope chat persistence operation을 repository에 추가합니다. |

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
- 이 commit의 parent와 비교합니다.
- 다음 관련 SHA: `dabd8d5c2a49` — `feat(game): 실시간 경기 채팅 전달`

### 5.2. `feat(game): 실시간 경기 채팅 전달`

| 항목 | 값 |
| --- | --- |
| SHA | `dabd8d5c2a49` |
| Importance | B |
| Tags | PROTOCOL, REALTIME, PERSISTENCE |
| Source에서 확정된 역할 | validated `chat.send`를 async repository-backed realtime operation으로 처리합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- runtime schema의 strictness, negative branch, producer/consumer의 공통 contract 사용 여부를 확인합니다.
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
- 직전 관련 SHA: `a6fa5a187eec` — `feat(db): 채팅 메시지 저장 구현`
- 다음 관련 SHA: `cd3787eefd6a` — `feat(chat): 로비 채팅과 접속 상태 실시간 반영`

### 5.3. `feat(chat): 로비 채팅과 접속 상태 실시간 반영`

| 항목 | 값 |
| --- | --- |
| SHA | `cd3787eefd6a` |
| Importance | B |
| Tags | AUTH, REALTIME, WEB |
| Source에서 확정된 역할 | lobby가 authenticated WebSocket으로 chat/presence event를 구독합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- credential, identity, role 또는 capability가 어느 경계에서 생성·검증·폐기되는지 확인합니다.
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
- 직전 관련 SHA: `dabd8d5c2a49` — `feat(game): 실시간 경기 채팅 전달`
- 다음 관련 SHA: `8debb1ea3ad3` — `feat(lobby): 연결 중인 WebSocket 사용자 목록 추가`

### 5.4. `feat(lobby): 연결 중인 WebSocket 사용자 목록 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `8debb1ea3ad3` |
| Importance | B |
| Tags | REALTIME |
| Source에서 확정된 역할 | GameHub current clients를 lobby presence authority로 사용합니다. |

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
- 직전 관련 SHA: `cd3787eefd6a` — `feat(chat): 로비 채팅과 접속 상태 실시간 반영`
- 다음 관련 SHA: `c3ff9ed2402f` — `test(lobby): WebSocket 사용자 목록 검증`

### 5.5. `test(lobby): WebSocket 사용자 목록 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `c3ff9ed2402f` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE, TEST |
| Source에서 확정된 역할 | socket이 없으면 online list가 비어 있는지 검증합니다. |

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
- 직전 관련 SHA: `8debb1ea3ad3` — `feat(lobby): 연결 중인 WebSocket 사용자 목록 추가`
- 다음 관련 SHA: `1d9aa3902614` — `feat(lobby): 실시간 로비 지표 API 추가`

### 5.6. `feat(lobby): 실시간 로비 지표 API 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `1d9aa3902614` |
| Importance | B |
| Tags | REALTIME |
| Source에서 확정된 역할 | online/playing/queued/rooms/average wait를 GameHub live stats로 제공합니다. |

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
- 직전 관련 SHA: `c3ff9ed2402f` — `test(lobby): WebSocket 사용자 목록 검증`
- 다음 관련 SHA: `de9a173e6eb1` — `feat(chat): 쓰기 가능한 로비 채팅 API 추가`

### 5.7. `feat(chat): 쓰기 가능한 로비 채팅 API 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `de9a173e6eb1` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE |
| Source에서 확정된 역할 | authenticated lobby message validation과 persistence를 HTTP mutation으로 제공합니다. |

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
- 직전 관련 SHA: `1d9aa3902614` — `feat(lobby): 실시간 로비 지표 API 추가`
- 다음 관련 SHA: `e0ef3fec89a6` — `feat(chat): 로비 채팅 입력 화면 추가`

### 5.8. `feat(chat): 로비 채팅 입력 화면 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `e0ef3fec89a6` |
| Importance | B |
| Tags | WEB |
| Source에서 확정된 역할 | controlled lobby chat form과 bounded local history update를 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
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
- 직전 관련 SHA: `de9a173e6eb1` — `feat(chat): 쓰기 가능한 로비 채팅 API 추가`
- 다음 관련 SHA: `4f9b3b312d0e` — `fix(lobby): 로비 상태 표현 개선`

### 5.9. `fix(lobby): 로비 상태 표현 개선`

| 항목 | 값 |
| --- | --- |
| SHA | `4f9b3b312d0e` |
| Importance | B |
| Tags | REALTIME |
| Source에서 확정된 역할 | server live statistics와 missing average-wait 상태를 정확히 표시합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
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
- 직전 관련 SHA: `e0ef3fec89a6` — `feat(chat): 로비 채팅 입력 화면 추가`
- 다음 관련 SHA: `8078ac6f92ba` — `test(app): 실시간 지표·채팅·경기 기록 검증`

### 5.10. `test(app): 실시간 지표·채팅·경기 기록 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `8078ac6f92ba` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE, WEB |
| Source에서 확정된 역할 | stats, lobby/match attribution, recent match ordering을 통합 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA의 diff와 parent 상태를 비교해 변경 전 소유자, 변경된 파일, 핵심 symbol을 기록합니다.
- 새 caller와 callee를 따라 입력 검증, 상태 변경, 반환 또는 side effect의 실제 순서를 기록합니다.
- transaction, lock, unique/check constraint, row mapping, rollback 범위를 실제 SQL과 repository method로 확인합니다.
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
- 직전 관련 SHA: `4f9b3b312d0e` — `fix(lobby): 로비 상태 표현 개선`
- 이 Thread의 최종 상태와 비교합니다.

## 6. Invariant ledger

| Invariant | 도입 SHA | 강화 SHA | 부족함이 드러난 SHA | 복구 fix | 고정 test | 코드 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| 현재 접속 상태의 authority는 realtime connection hub입니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| lobby statistics는 live queue/room state를 반영하며 fabricated 값으로 보충하지 않습니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |
| chat message는 authenticated sender와 명시적인 scope를 가진 persistence record입니다. | [작성] | [작성] | [작성] | [작성] | [작성] | [파일·심볼] |

## 7. Failure → Fix → Test 연결

| 기존 상태/가정 | Fix 또는 강화 과정 | Test/evidence | 최종 보장 |
| --- | --- | --- | --- |
| [작성] | [SHA 순서 작성] | [test/failure injection 작성] | [작성] |

## 8. Ownership / state / responsibility 변화

| 축 | 초기 owner/state | 중간 전환 | 최종 owner/state | cleanup 책임 | 근거 |
| --- | --- | --- | --- | --- | --- |
| current client map | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| presence projection | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| queue wait samples | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| lobby stats | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| chat persistence/broadcast | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |
| browser lobby cache | [작성] | [작성] | [작성] | [작성] | [SHA·파일·심볼] |

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
