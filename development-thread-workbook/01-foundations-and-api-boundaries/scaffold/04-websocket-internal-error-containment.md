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
- 직전 관련 SHA: `fe62962d65d9` — `fix(api): 내부 WebSocket 오류 숨김`

## 6. Invariant evolution

| 단계 | 관련 SHA | 기록 |
| --- | --- | --- |
| 불충분한 상태 | `fe62962d65d9` parent | [해당 단계에서 invariant가 도입·확장·수정·검증된 근거를 작성합니다.] |
| Corrected boundary | `fe62962d65d9` | [해당 단계에서 invariant가 도입·확장·수정·검증된 근거를 작성합니다.] |
| Deterministic verification | `20933b1393f3` | [해당 단계에서 invariant가 도입·확장·수정·검증된 근거를 작성합니다.] |

## 7. Failure → Fix → Test 관계

| Failure 또는 불충분한 상태 | Fix/구현 SHA | Test 또는 후속 증거 |
| --- | --- | --- |
| [이전 failure 또는 불충분한 상태를 작성합니다.] | `fe62962d65d9` | [fix가 만든 invariant와 test/후속 evidence를 작성합니다.] |
| [이전 failure 또는 불충분한 상태를 작성합니다.] | `20933b1393f3` | [fix가 만든 invariant와 test/후속 evidence를 작성합니다.] |

## 8. Ownership·state·responsibility 변화

| Owner | 최종 책임 | 명시적 비책임 |
| --- | --- | --- |
| Shared WS parser | [최종 책임을 exact SHA로 작성합니다.] | [소유하지 않는 책임을 작성합니다.] |
| GameHub receive | [최종 책임을 exact SHA로 작성합니다.] | [소유하지 않는 책임을 작성합니다.] |
| Repository | [최종 책임을 exact SHA로 작성합니다.] | [소유하지 않는 책임을 작성합니다.] |
| Failure-injection test | [최종 책임을 exact SHA로 작성합니다.] | [소유하지 않는 책임을 작성합니다.] |

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
