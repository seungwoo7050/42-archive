# WebSocket client error boundary와 내부 오류 격리

- 카테고리: `01-foundations-and-api-boundaries` — 애플리케이션 기반과 API 경계
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

WebSocket message parse failure와 command/repository processing failure가 한 catch에 결합되어 있던 상태를 분리하고, 내부 예외 원문을 고정된 public message로 redaction한 뒤 deterministic repository failure injection으로 검증하는 과정을 복원합니다.

이 문서는 Phase 1 category audit 후 동결된 scaffold를 기준으로 exact SHA의 구현 발전을 복원합니다.

### 직접 연결되는 불변식

- 잘못된 client payload는 `invalid_event`, server-side processing failure는 `internal_error`로 구분됩니다.
- repository·SQL·internal host·raw exception message는 client-facing WebSocket event에 포함되지 않습니다.
- parse 실패는 command dispatch 전에 즉시 반환하고 processing failure는 동일 connection의 public error event로 격리됩니다.

## 2. 핵심 질문

- 기존 단일 catch가 왜 client fault와 server fault를 동시에 오분류했습니까?
- parse 단계와 async repository command 단계를 분리하면 public code와 failure owner가 어떻게 달라집니까?
- failure injection test는 어느 repository call을 실패시키고 어떤 문자열 부재를 검사합니까?
- 이 redaction이 보장하지 않는 rollback·logging·다른 async callback 범위는 무엇입니까?

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
| 1 | `fe62962d65d9` | `fix(api): 내부 WebSocket 오류 숨김` | A | PROTOCOL, REALTIME, PERSISTENCE | client event parse failure와 command/repository processing failure를 분리하고 raw exception을 WebSocket response에서 제거합니다. |
| 2 | `20933b1393f3` | `test(api): WebSocket repository error redaction 검증` | B | PROTOCOL, REALTIME, PERSISTENCE | chat repository method에 내부 SQL·host 문자열이 든 예외를 주입하고 client event가 generic error만 포함하는지 검증합니다. |

## 5. Commit별 학습 기록

### 5.1. `fix(api): 내부 WebSocket 오류 숨김`

| 항목 | 값 |
| --- | --- |
| SHA | `fe62962d65d9` |
| Importance | A |
| Tags | PROTOCOL, REALTIME, PERSISTENCE |
| Source에서 확정된 역할 | client event parse failure와 command/repository processing failure를 분리하고 raw exception을 WebSocket response에서 제거합니다. |

#### 해당 SHA에서 확인할 실제 코드

- parent와 `apps/api/src/gameHub.ts::receive`를 비교해 단일 catch가 parse와 processing을 함께 처리하던 상태를 확인합니다.
- `INVALID_EVENT_MESSAGE`, `INTERNAL_ERROR_MESSAGE`와 `invalid_event`/`internal_error` code가 어떤 catch에서 사용되는지 확인합니다.
- AI fallback promise catch도 raw error message 대신 같은 internal message를 사용하는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | `GameHub.receive`의 한 catch가 JSON/schema parse와 repository/command 실패를 모두 `invalid_event`로 처리하며 `error.message`를 client에게 보냈습니다. |
| 해결하려던 문제 | SQL text, host, stack 단서 같은 내부 정보가 wire response에 노출되고 client 입력 오류와 server failure가 같은 code로 오분류될 수 있었습니다. |
| 핵심 결정 | event parse를 첫 try/catch로 분리하고 processing을 두 번째 try/catch로 감쌌으며 두 public message를 상수화했습니다. |
| 입력 → 상태 전이 → 출력 | payload parse 실패는 generic `invalid_event`를 보내고 즉시 반환합니다. parse 성공 후 command/repository 실패는 generic `internal_error`를 보냅니다. |
| ownership/lifetime/cleanup | GameHub가 WebSocket public failure classification을 소유합니다. repository exception 내용은 server 내부에 남고 socket event에는 복사되지 않습니다. |
| failure/rollback/retry | processing failure의 rollback이나 retry는 추가하지 않습니다. chat write가 일부 수행된 뒤 후속 broadcast가 실패하는 경우의 atomicity도 보장하지 않습니다. |
| 보장하는 것 | 잘못된 client event와 내부 처리 실패가 다른 code로 분리되고 raw exception message가 client event에 포함되지 않습니다. |
| 보장하지 않는 것 | 서버 log에 오류가 기록된다는 보장, 모든 async callback의 redaction, repository rollback은 이 commit 범위 밖입니다. |
| 후속 연결 | `20933b1393f3`가 repository error를 결정적으로 주입해 redaction을 검증합니다. |

#### 최소 코드 근거

`fe62962d65d9`, `apps/api/src/gameHub.ts::receive`:

```ts
try { event = parseClientEvent(payload); }
catch { sendInvalidEvent(); return; }
try { /* command와 repository 호출 */ }
catch { sendInternalError(); }
```

#### Fix 연결

| 단계 | 기록 |
| --- | --- |
| 이전 가정 | 모든 receive failure를 잘못된 client event로 취급하고 예외 message를 진단 정보로 보내도 된다고 가정했습니다. |
| 실제 실패 또는 위험 | repository exception의 SQL·host·민감한 column 정보가 WebSocket client에게 노출될 수 있었습니다. |
| Root cause | parse failure와 내부 processing failure가 한 catch에 결합되어 public classification과 redaction owner가 없었습니다. |
| 수정된 invariant | client parse failure와 server internal failure는 분리하고 public message는 고정된 generic 값만 사용해야 합니다. |
| 변경 코드 | `apps/api/src/gameHub.ts::receive`, AI fallback catch입니다. |
| Regression evidence | `20933b1393f3`의 injected repository rejection과 secret-string negative assertion입니다. |

비교 기준:
- 이 commit의 parent와 비교합니다.
- 다음 관련 SHA: `20933b1393f3` — `test(api): WebSocket repository error redaction 검증`

### 5.2. `test(api): WebSocket repository error redaction 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `20933b1393f3` |
| Importance | B |
| Tags | PROTOCOL, REALTIME, PERSISTENCE |
| Source에서 확정된 역할 | chat repository method에 내부 SQL·host 문자열이 든 예외를 주입하고 client event가 generic error만 포함하는지 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/gameHub.runtime.test.ts`에서 memory repository method spy와 rejected error 문자열을 확인합니다.
- `FakeSocket.receive`가 실제 `GameHub.receive` message listener를 통과하는지 확인합니다.
- error event code/message와 serialized event 전체의 secret-string 부재를 함께 검사하는 이유를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | redaction code는 구현됐지만 repository가 실제로 민감한 message를 던질 때 wire event가 안전하다는 결정적 증거가 없었습니다. |
| 해결하려던 문제 | 단순 expected message assertion만으로는 다른 event field에 원문이 남는 회귀를 놓칠 수 있었습니다. |
| 핵심 결정 | `createChatMessage`를 SQL·host 문자열을 포함한 rejected promise로 바꾸고 FakeSocket으로 `chat.send`를 전달했습니다. |
| 입력 → 상태 전이 → 출력 | fake socket message → GameHub parse → repository spy rejection → processing catch → generic error event → poll/assert 순입니다. |
| ownership/lifetime/cleanup | fixture가 memory repo, GameHub, FakeSocket을 소유하고 test 끝에 socket을 terminate합니다. |
| failure/rollback/retry | 실제 PostgreSQL이나 network socket은 사용하지 않습니다. 내부 error가 server log에 남는지는 검사하지 않습니다. |
| 보장하는 것 | 이 production path에서 client는 `internal_error`와 고정 message만 받고 `password_hash`·internal host를 관찰하지 못합니다. |
| 보장하지 않는 것 | 다른 repository method·async callback·HTTP error path 전체의 redaction은 증명하지 않습니다. |
| 후속 연결 | `fe62962d65d9`의 보안 invariant를 deterministic failure injection으로 고정합니다. |

#### 최소 코드 근거

`apps/api/src/gameHub.runtime.test.ts`의 `vi.spyOn(...).mockRejectedValue`와 serialized event negative assertions가 근거입니다.

#### Test commit 학습 기록

| 구분 | 기록 |
| --- | --- |
| 대상 production invariant | WebSocket processing failure는 repository exception 원문을 client에게 노출하지 않아야 합니다. |
| 재현하는 failure/boundary | chat write가 SQL text와 internal host를 포함한 예외로 실패하는 경계입니다. |
| test technique | deterministic failure injection + in-memory GameHub/FakeSocket integration test |
| 통과하는 production path | FakeSocket message → `GameHub.receive` → `repo.createChatMessage` rejection → internal catch → socket event |
| 증명하는 것 | 주입한 민감 문자열이 모든 emitted event serialization에 없고 generic code/message만 존재함을 증명합니다. |
| 증명하지 않는 것 | 실제 DB driver, real WebSocket transport, 다른 command path, server logging은 증명하지 않습니다. |
| 후속 회귀 방지 | raw exception을 다시 response에 넣거나 parse/internal code를 합치는 회귀를 방지합니다. |

비교 기준:
- 직전 관련 SHA: `fe62962d65d9` — `fix(api): 내부 WebSocket 오류 숨김`

## 6. Invariant evolution

| 단계 | 관련 SHA | 기록 |
| --- | --- | --- |
| 불충분한 상태 | `fe62962d65d9` parent | parse와 processing failure가 모두 `invalid_event`이며 raw exception message가 전송될 수 있습니다. |
| Corrected boundary | `fe62962d65d9` | 두 catch와 두 고정 public message로 client/internal failure를 분리합니다. |
| Deterministic verification | `20933b1393f3` | repository rejection에 민감 문자열을 넣고 emitted event 전체에서 부재를 검사합니다. |

## 7. Failure → Fix → Test 관계

| Failure 또는 불충분한 상태 | Fix/구현 SHA | Test 또는 후속 증거 |
| --- | --- | --- |
| 한 catch가 parse와 repository error를 합침 | `fe62962d65d9` | parse catch와 processing catch를 분리하고 raw message 사용을 제거합니다. |
| 정적 코드만으로 redaction 회귀를 놓칠 수 있음 | `20933b1393f3` | 민감 문자열이 든 repository failure를 주입하고 serialized event를 검사합니다. |

## 8. Ownership·state·responsibility 변화

| Owner | 최종 책임 | 명시적 비책임 |
| --- | --- | --- |
| Shared WS parser | client payload JSON/schema validation | repository command 결과를 소유하지 않습니다. |
| GameHub receive | public failure classification과 socket error event | repository rollback을 소유하지 않습니다. |
| Repository | chat write 등 command side effect | exception 원문을 public contract로 정의하지 않습니다. |
| Failure-injection test | rejected repository call과 FakeSocket event 관찰 | 실제 DB/network를 대신하지 않습니다. |

## 9. Thread 최종 상태

- 최종 SHA 기준으로 malformed payload와 내부 processing failure는 서로 다른 public code를 사용합니다.
- repository exception의 SQL/host text는 client event에 복사되지 않습니다.
- 이 Thread는 response redaction을 다루며 command rollback, retry, server logging completeness는 보장하지 않습니다.

### 실행 검증 기록

- Source inspection: GitHub connector로 Commit map의 exact SHA diff와 필요한 historical file을 조회했습니다.
- Branch validation: branch-local `commit/commit-importance.md`가 선언한 433개 선형 이력에서 모든 참조 SHA와 source classification을 대조했고, 가장 이른 참조 `b625c4f9dfdc`는 branch HEAD 비교에서 merge base가 동일 SHA임을 확인했습니다.
- 실제 실행 시도: `git clone --branch web/ft_transcendence --single-branch https://github.com/seungwoo7050/42-archive.git /tmp/ft-transcendence-audit`
- 결과: exit status 128, `Could not resolve host: github.com`. 따라서 repository checkout, package install, test command는 실행하지 않았으며 runtime 결과를 주장하지 않습니다.

## 10. 최종 실행 흐름

1. 소켓 message가 `GameHub.receive`에 들어옵니다.
2. `parseClientEvent`가 JSON과 schema를 검증합니다.
3. parse 실패면 generic `invalid_event`를 보내고 종료합니다.
4. parse 성공이면 event type에 맞는 command/repository operation을 실행합니다.
5. processing 실패면 exception 원문을 버리고 generic `internal_error`를 보냅니다.
6. 성공한 command만 정상 broadcast/state transition으로 이어집니다.

## 11. 학습 완료 확인

- [x] 모든 Commit map SHA의 historical code를 확인했습니다.
- [x] parent/직전 관련 상태와 현재 SHA를 구분했습니다.
- [x] fix의 이전 가정·root cause·corrected invariant를 연결했습니다.
- [x] test가 통과하는 production path와 비증명 범위를 구분했습니다.
- [x] ownership/lifetime/cleanup과 failure path를 기록했습니다.
- [x] 실행 evidence와 code inspection을 구분했습니다.
- [x] 마지막 SHA 기준 최종 flow와 non-guarantee를 설명할 수 있습니다.
