# Checked RPN Evaluation Avoids Undefined Arithmetic

## Thread 목표

signed `long` 연산을 실행한 뒤 overflow를 검사하는 잘못된 접근을 피하고, token parser와 stack grammar 위에서 모든 산술 precondition을 먼저 검증하는 구현을 복원합니다.

**Source significance:** signed overflow를 실행한 뒤 감지하면 이미 늦습니다. evaluator는 `LONG_MIN`의 비대칭 magnitude까지 고려해 limit/magnitude reasoning을 실제 arithmetic 실행 전에 수행합니다.

## 이 Thread를 이해하기 위한 핵심 질문

- `LONG_MIN`이 양수 최대값보다 magnitude가 1 큰 사실이 parsing과 multiplication에 어떤 영향을 주는가?
- operand pop 순서가 subtraction/division 의미에 어떻게 반영되는가?
- 각 연산에서 overflow 여부를 실제 연산 전에 어떻게 판정하는가?
- division의 두 특수 실패 조건은 무엇이며 왜 별도 검사가 필요한가?
- malformed token과 stack-shape 오류가 arithmetic helper까지 도달하지 않도록 어떤 계층이 막는가?

## 완료 기준

- [ ] signed decimal token accumulation이 `LONG_MIN`까지 안전하게 도달하는 코드를 설명할 수 있다.
- [ ] +, -, *, / 각각의 precondition check와 실제 signed operation의 순서를 실제 코드로 증명할 수 있다.
- [ ] right-then-left pop과 non-commutative result를 테스트 케이스로 연결할 수 있다.
- [ ] overflow/underflow/division-by-zero/malformed stack의 regression coverage를 구분할 수 있다.

## Source에 연결된 invariant / engineering difficulty

### Critical invariant

- signed arithmetic은 실행 전에 검사되어 error detection 자체가 undefined overflow에 의존하지 않는다.
- accepted integer token은 complete ASCII grammar와 `LONG_MIN`/`LONG_MAX` 경계를 보존한다.

### Major engineering difficulty

- overflowing expression을 먼저 평가하지 않고 모든 signed `long` arithmetic 검사.
- `LONG_MIN`의 비대칭 magnitude를 고려한 multiplication/division 처리.

위 항목은 source가 확정한 범위입니다. 실제 코드에서 어떻게 구현되는지는 아래 학습 기록에서 직접 확인합니다.

## Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `57a25e8475ab` | feat(rpn): signed token과 stack 문법 처리 | A | PARSING, NUMERIC, CORE | complete signed decimal operand parsing과 stack-shape rules를 확립합니다. |
| 2 | `e1641a714172` | feat(rpn): overflow 검사 산술 연산 구현 | S | NUMERIC, HARD, CORE | 모든 signed operator에 실행 전 precondition checks를 추가합니다. |
| 3 | `aa0cc5e3e063` | test(rpn): 산술 경계와 잘못된 token 검증 | A | TEST, NUMERIC, EDGE | literal limits, overflow directions, operand order, malformed expression을 검증합니다. |

## Commit별 학습 기록

### `57a25e8475ab` — feat(rpn): signed token과 stack 문법 처리

- Importance: **A**
- Tags: **PARSING, NUMERIC, CORE**
- Source 역할: complete signed decimal operand parsing과 stack-shape rules를 확립합니다.
- Source classification summary: Introduces signed decimal token parsing and the structural RPN stack language.

#### 핵심 설계 / failure boundary 확인
- [ ] ASCII space 규칙에 따른 token separation과 complete signed-decimal recognition을 담당하는 코드를 찾으세요.
- [ ] magnitude accumulation이 overflow 없이 `LONG_MAX`와 `LONG_MIN`의 asymmetric magnitude를 모두 허용하는 계산을 추적하세요.
- [ ] malformed number/unknown token을 operator 단계 전에 거부하는 branch를 확인하세요.
- [ ] evaluation stack push/pop과 expression 종료 시 exactly one result를 요구하는 구조적 validation을 기록하세요.
- [ ] locale-sensitive stream prefix parsing을 피하기 위해 manual parser가 사용되는 지점을 확인하세요.
- [ ] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [ ] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `e1641a714172`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `e1641a714172` — feat(rpn): overflow 검사 산술 연산 구현

- Importance: **S**
- Tags: **NUMERIC, HARD, CORE**
- Source 역할: 모든 signed operator에 실행 전 precondition checks를 추가합니다.
- Source classification summary: Implements checked addition, subtraction, multiplication, and division before signed operations execute.

#### 이 commit 직전 상태와 문제
- 직전 관련 Thread SHA `57a25e8475ab`를 먼저 checkout하여 이 commit이 추가되기 전 representation/ownership/state-publication 방식을 확인하세요.
- Source가 확정한 Problem/Decision을 실제 diff와 대응시키되, source에 없는 동기를 추가로 추정하지 마세요.

#### 해당 SHA에서 확인할 실제 코드
- [ ] addition/subtraction이 operand sign에 따라 `LONG_MIN`/`LONG_MAX` margin을 비교하는 helper/branch를 찾으세요.
- [ ] multiplication이 signed multiplication 자체를 실행하기 전에 sign과 unsigned magnitude로 범위를 판단하는 과정을 단계별로 기록하세요.
- [ ] division의 zero divisor와 `LONG_MIN / -1`을 실제 division 전에 차단하는 branch를 확인하세요.
- [ ] operator 적용 시 stack에서 right operand를 먼저, left operand를 나중에 pop하는 코드를 확인하세요.
- [ ] 각 helper에서 범위 검사가 통과한 뒤에만 signed operation expression이 평가됨을 실제 control flow로 증명하세요.
- [ ] overflow/invalid operation exception이 local evaluation stack 밖에 partial result를 publish하지 않는 이유를 call scope로 설명하세요.

#### Ownership / lifecycle / state transition
- [ ] 상태 필드별 owner, lifetime, valid state를 표로 직접 정리하세요.
- [ ] throw 가능한 연산과 non-throwing commit operation의 순서를 실제 코드 라인 기준으로 적으세요.
- [ ] 성공 전 temporary/candidate state와 성공 후 published state를 구분해 그리세요.

#### Failure scenario와 보장 경계
- [ ] source가 지목한 failure를 하나 이상 실제 제어 흐름으로 따라가고, exception 직전/직후 observable state를 기록하세요.
- [ ] 이 commit이 보장하는 것과 아직 보장하지 않는 것을 source와 해당 SHA 코드에 근거해 구분하세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `aa0cc5e3e063`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `aa0cc5e3e063` — test(rpn): 산술 경계와 잘못된 token 검증

- Importance: **A**
- Tags: **TEST, NUMERIC, EDGE**
- Source 역할: literal limits, overflow directions, operand order, malformed expression을 검증합니다.
- Source classification summary: Covers RPN syntax, operand order, all arithmetic boundaries, division by zero, and malformed stacks.

#### 핵심 설계 / failure boundary 확인
- [ ] 필요하면 직전 관련 SHA `e1641a714172`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [ ] 정상 +,-,*,/와 subtraction/division operand order를 구분하는 test cases를 찾으세요.
- [ ] `LONG_MIN`/`LONG_MAX` literal parsing과 모든 overflow/underflow direction을 각각 어떤 expression으로 재현하는지 기록하세요.
- [ ] division by zero와 `LONG_MIN / -1` case가 별도 regression으로 존재하는지 확인하세요.
- [ ] malformed number, unknown token, insufficient/extra operands, spacing boundaries가 parser/stack grammar의 어느 branch를 통과하는지 매핑하세요.
- [ ] 테스트가 UB 발생 뒤 결과를 검사하는 것이 아니라 UB expression 자체가 실행되지 않도록 error path를 관찰하는 방식을 확인하세요.
- [ ] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [ ] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### Test commit 학습 구분
- 대상 production invariant: source가 확정한 방향은 **RPN grammar와 precondition-first checked arithmetic**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 재현 failure / boundary: source가 확정한 방향은 **all overflow/underflow directions, division by zero, malformed stack/tokens**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- test technique: source가 확정한 방향은 **boundary unit suite**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 통과하는 production path: source가 확정한 방향은 **token parser, stack evaluator, checked operator helpers**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하는 것: source가 확정한 방향은 **exercised signed operations이 UB 경계를 넘기 전에 거부됨**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하지 않는 것: source가 확정한 방향은 **모든 가능한 긴 expression/state-space를 exhaustive하게 증명하지는 않음**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 성격: source가 확정한 방향은 **deterministic boundary regression**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

## Invariant ledger

| SHA | Source에서 확정된 invariant 변화 | 해당 SHA에서 직접 확인한 코드 근거 | 아직 남은 위험/미보장 |
| --- | --- | --- | --- | --- |
| `57a25e8475ab` | signed decimal token grammar, exact limits, stack-shape language 도입 |  |  |
| `e1641a714172` | 모든 operator에 precondition-first overflow/invalid-operation checks 도입 |  |  |
| `aa0cc5e3e063` | long extremes, overflow directions, operand order, malformed expressions 검증 |  |  |

## Failure → Fix → Test 연결

- 명시적 fix commit은 이 Thread에 없습니다. `e1641a714172`가 undefined signed overflow를 피하는 precondition-first decision을 구현합니다.
- `aa0cc5e3e063`이 long limits, 모든 overflow direction, division boundary, malformed expression을 회귀 검증합니다.

### 학습자 연결 기록
- 최초 위험/맹점:
- 이를 드러낸 실제 failure 또는 test gap:
- 수정/강화된 decision:
- 해당 코드 위치:
- 이를 고정하는 regression/evidence:

## State / responsibility 변화

- Source 기준 흐름: token parser가 complete signed operands를 만들고, evaluator stack이 구조를 소유하며, arithmetic helper가 signed operation 이전의 range precondition을 책임집니다.
- [ ] parser stack과 arithmetic helper 사이에서 어떤 값이 전달되고 어디서 exception이 발생하는지 기록하세요.

## Thread 최종 상태

- Source가 확정한 최종 흐름: `ASCII-space tokenization → signed operand parse → stack-shape validation → checked operator precondition → signed operation → single-result validation`
- [ ] 마지막 Thread SHA 시점에서 실제 type/function 호출 관계를 사용해 위 흐름을 다시 그리세요.
- [ ] Thread 시작 시점과 비교해 새로 보장되는 invariant를 정리하세요.
- [ ] source가 보장하지 않는 영역이나 외부 side effect/stream position 등 남는 경계를 실제 코드 근거로 적으세요.

## 최종 architecture 또는 execution flow 정리

다음 항목은 학습자가 실제 commit code를 읽은 뒤 완성합니다. 완성형 정답을 source 밖에서 추정해 채우지 않습니다.

```text
[입력/호출자]
    ↓
[검증/생성/후보 상태]
    ↓
[핵심 ownership/state transition]
    ↓
[commit/publication point]
    ↓
[output / observable state]

실패 분기:
[throw/failure source] → [cleanup owner] → [보존되는 prior state]
```

- 실제 caller → callee 흐름:
- 핵심 상태 필드:
- resource owner / borrowed view:
- commit point:
- cleanup path:
- 최종 invariant 설명:

## 학습 완료 자가 점검

- [ ] Commit map의 SHA/순서를 그대로 따라 모든 관련 code tree를 확인했습니다.
- [ ] final HEAD를 과거 commit 설명에 소급해서 사용하지 않았습니다.
- [ ] S/A/B importance에 맞는 깊이로 code/test evidence를 채웠습니다.
- [ ] source가 확정한 invariant와 제가 실제 코드에서 확인한 증거를 구분했습니다.
- [ ] failure path에서 state mutation 전후와 cleanup owner를 설명할 수 있습니다.
- [ ] test commit마다 production invariant, technique, production path, 증명/비증명 범위를 구분했습니다.
- [ ] Thread 마지막 상태를 commit history에 근거해 처음부터 끝까지 설명할 수 있습니다.
