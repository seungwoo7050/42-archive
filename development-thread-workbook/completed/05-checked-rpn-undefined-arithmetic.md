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

- [x] signed decimal token accumulation이 `LONG_MIN`까지 안전하게 도달하는 코드를 설명할 수 있다.
- [x] +, -, *, / 각각의 precondition check와 실제 signed operation의 순서를 실제 코드로 증명할 수 있다.
- [x] right-then-left pop과 non-commutative result를 테스트 케이스로 연결할 수 있다.
- [x] overflow/underflow/division-by-zero/malformed stack의 regression coverage를 구분할 수 있다.

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
- [x] ASCII space 규칙에 따른 token separation과 complete signed-decimal recognition을 담당하는 코드를 찾으세요.
- [x] magnitude accumulation이 overflow 없이 `LONG_MAX`와 `LONG_MIN`의 asymmetric magnitude를 모두 허용하는 계산을 추적하세요.
- [x] malformed number/unknown token을 operator 단계 전에 거부하는 branch를 확인하세요.
- [x] evaluation stack push/pop과 expression 종료 시 exactly one result를 요구하는 구조적 validation을 기록하세요.
- [x] locale-sensitive stream prefix parsing을 피하기 위해 manual parser가 사용되는 지점을 확인하세요.
- [x] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [x] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `e1641a714172`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼: `include/cppf/RpnEvaluator.hpp`의 `RpnEvaluator::evaluate()`; `src/RpnEvaluator.cpp`의 `parseLong()`, token loop, `isOperator()`, local stack.
- 핵심 코드 발췌 위치: `57a25e8475ab:src/RpnEvaluator.cpp`의 `parseLong()`은 sign을 분리하고 `unsigned long magnitude`를 `(limit - digit) / 10`과 비교한 뒤 누적합니다. 음수 limit은 `LONG_MAX + 1`로 두어 `LONG_MIN`을 별도 branch에서 만듭니다.
- 변경 전/후 차이: locale-sensitive stream extraction 대신 ASCII space tokenization과 complete signed-decimal parser가 도입되었고, evaluator가 local `std::vector<long>` stack의 구조를 직접 검증하게 되었습니다.
- 직접 확인한 ownership/lifetime/state 관계: expression은 caller-owned borrowed string이고 token substring과 evaluation stack은 call-local state입니다. operand token은 완전히 파싱된 후에만 stack에 push되며 결과는 종료 시 stack에 정확히 하나 남을 때만 반환됩니다.
- 직접 확인한 failure path: sign만 있는 token, unknown byte가 섞인 number, unknown operator/token, operand 부족, 종료 시 0개 또는 2개 이상 결과는 `invalid_argument` 또는 range exception으로 끝납니다. local stack은 외부 객체에 publish되지 않습니다. 이 SHA의 산술 operator에는 아직 모든 overflow precondition이 추가되기 전입니다.
- 실행한 테스트와 결과: 미실행. 지정 SHA의 tokenizer/parser/stack code를 검사했으며 command는 수행하지 않았습니다.
- 이 commit을 한 문장으로 설명: `LONG_MIN`까지 안전하게 만드는 signed token parser와 RPN stack language를 확립했습니다.

### `e1641a714172` — feat(rpn): overflow 검사 산술 연산 구현

- Importance: **S**
- Tags: **NUMERIC, HARD, CORE**
- Source 역할: 모든 signed operator에 실행 전 precondition checks를 추가합니다.
- Source classification summary: Implements checked addition, subtraction, multiplication, and division before signed operations execute.

#### 이 commit 직전 상태와 문제
- 직전 관련 Thread SHA `57a25e8475ab`를 먼저 checkout하여 이 commit이 추가되기 전 representation/ownership/state-publication 방식을 확인하세요.
- Source가 확정한 Problem/Decision을 실제 diff와 대응시키되, source에 없는 동기를 추가로 추정하지 마세요.

#### 해당 SHA에서 확인할 실제 코드
- [x] addition/subtraction이 operand sign에 따라 `LONG_MIN`/`LONG_MAX` margin을 비교하는 helper/branch를 찾으세요.
- [x] multiplication이 signed multiplication 자체를 실행하기 전에 sign과 unsigned magnitude로 범위를 판단하는 과정을 단계별로 기록하세요.
- [x] division의 zero divisor와 `LONG_MIN / -1`을 실제 division 전에 차단하는 branch를 확인하세요.
- [x] operator 적용 시 stack에서 right operand를 먼저, left operand를 나중에 pop하는 코드를 확인하세요.
- [x] 각 helper에서 범위 검사가 통과한 뒤에만 signed operation expression이 평가됨을 실제 control flow로 증명하세요.
- [x] overflow/invalid operation exception이 local evaluation stack 밖에 partial result를 publish하지 않는 이유를 call scope로 설명하세요.

#### Ownership / lifecycle / state transition
- [x] 상태 필드별 owner, lifetime, valid state를 표로 직접 정리하세요.
- [x] throw 가능한 연산과 non-throwing commit operation의 순서를 실제 코드 라인 기준으로 적으세요.
- [x] 성공 전 temporary/candidate state와 성공 후 published state를 구분해 그리세요.

#### Failure scenario와 보장 경계
- [x] source가 지목한 failure를 하나 이상 실제 제어 흐름으로 따라가고, exception 직전/직후 observable state를 기록하세요.
- [x] 이 commit이 보장하는 것과 아직 보장하지 않는 것을 source와 해당 SHA 코드에 근거해 구분하세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `aa0cc5e3e063`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼: `src/RpnEvaluator.cpp`의 `magnitudeOf()`, `checkedAdd()`, `checkedSubtract()`, `checkedMultiply()`, `checkedDivide()`, `applyOperator()`, `evaluate()`.
- 핵심 코드 발췌 위치: `e1641a714172:src/RpnEvaluator.cpp`에서 add/subtract는 sign별 limit 식을 먼저 검사합니다. multiply는 `-(value + 1) + 1` 형태의 unsigned magnitude로 `LONG_MIN`을 처리하고 `left_magnitude > limit / right_magnitude`를 실제 곱셈 전에 검사합니다.
- 변경 전/후 차이: 직전 parser/stack 구현 위에 모든 signed operator의 precondition-first arithmetic이 추가되었습니다. 결과를 계산한 뒤 overflow를 판정하는 방식은 사용하지 않습니다.
- 직접 확인한 ownership/lifetime/state 관계: operator token 처리 시 stack에서 `right`를 먼저, `left`를 나중에 꺼내 `applyOperator(left, right, op)`에 전달합니다. checked helper가 성공한 값만 다시 local stack에 push하므로 실패 결과는 외부나 stack에 게시되지 않습니다.
- 직접 확인한 failure path: addition/subtraction은 limit subtraction/addition으로 margin을 검사하고, multiplication은 sign에 따라 `LONG_MAX` 또는 `LONG_MAX + 1` magnitude limit을 사용합니다. division은 `right == 0`과 `LONG_MIN / -1`을 실제 `/` 전에 거부합니다. 모든 signed `+ - * /` expression은 해당 검사 뒤에만 평가됩니다.
- 실행한 테스트와 결과: 미실행. 지정 SHA의 checked helper와 call order를 검사했으며 command는 수행하지 않았습니다.
- 이 commit을 한 문장으로 설명: signed arithmetic을 실행하기 전에 모든 overflow와 invalid division 조건을 판정하도록 만들었습니다.

### `aa0cc5e3e063` — test(rpn): 산술 경계와 잘못된 token 검증

- Importance: **A**
- Tags: **TEST, NUMERIC, EDGE**
- Source 역할: literal limits, overflow directions, operand order, malformed expression을 검증합니다.
- Source classification summary: Covers RPN syntax, operand order, all arithmetic boundaries, division by zero, and malformed stacks.

#### 핵심 설계 / failure boundary 확인
- [x] 필요하면 직전 관련 SHA `e1641a714172`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [x] 정상 +,-,*,/와 subtraction/division operand order를 구분하는 test cases를 찾으세요.
- [x] `LONG_MIN`/`LONG_MAX` literal parsing과 모든 overflow/underflow direction을 각각 어떤 expression으로 재현하는지 기록하세요.
- [x] division by zero와 `LONG_MIN / -1` case가 별도 regression으로 존재하는지 확인하세요.
- [x] malformed number, unknown token, insufficient/extra operands, spacing boundaries가 parser/stack grammar의 어느 branch를 통과하는지 매핑하세요.
- [x] 테스트가 UB 발생 뒤 결과를 검사하는 것이 아니라 UB expression 자체가 실행되지 않도록 error path를 관찰하는 방식을 확인하세요.
- [x] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [x] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### Test commit 학습 구분
- 대상 production invariant: source가 확정한 방향은 **RPN grammar와 precondition-first checked arithmetic**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 재현 failure / boundary: source가 확정한 방향은 **all overflow/underflow directions, division by zero, malformed stack/tokens**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- test technique: source가 확정한 방향은 **boundary unit suite**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 통과하는 production path: source가 확정한 방향은 **token parser, stack evaluator, checked operator helpers**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하는 것: source가 확정한 방향은 **exercised signed operations이 UB 경계를 넘기 전에 거부됨**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하지 않는 것: source가 확정한 방향은 **모든 가능한 긴 expression/state-space를 exhaustive하게 증명하지는 않음**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 성격: source가 확정한 방향은 **deterministic boundary regression**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.

#### 학습자 기록
- 확인한 파일/심볼: `tests/test_rpn_evaluator.cpp`, `tests/compile/rpn_headers.cpp`, RPN private-construction compile-fail unit, test registration/Make target.
- 핵심 코드 발췌 위치: `aa0cc5e3e063:tests/test_rpn_evaluator.cpp`는 normal operators와 `8 3 -`, `8 3 /` 같은 operand order, `LONG_MIN`/`LONG_MAX` literals, add/subtract/multiply 양방향 overflow, division by zero, `LONG_MIN -1 /`, malformed stack/token을 구분합니다.
- 변경 전/후 차이: checked-arithmetic implementation의 각 branch와 parser/stack shape가 deterministic boundary unit suite로 고정되었습니다. production code는 변경되지 않습니다.
- 직접 확인한 ownership/lifetime/state 관계: success case는 반환 `long`만 비교하고 failure case는 exception을 기대합니다. evaluator state는 매 호출마다 local stack이므로 실패 뒤 persistent target이나 partial result를 검사할 외부 객체는 없습니다.
- 직접 확인한 failure path: overflow expression은 결과 값을 관찰하지 않고 exception path를 기대하므로 checked helper가 실제 undefined expression을 실행하지 않아야 test가 sanitizer/정상 실행에서도 끝납니다. tab/newline, malformed sign, extra/insufficient operands도 parser 또는 final-size branch에 연결됩니다. 모든 가능한 긴 expression을 exhaustive하게 다루지는 않습니다.
- 실행한 테스트와 결과: 미실행. boundary cases와 public compile units를 검사했으나 unit binary는 실행하지 않았습니다.
- 이 commit을 한 문장으로 설명: token limit, operand order, 모든 산술 방향과 malformed stack을 UB 전 거부 계약으로 고정했습니다.

## Invariant ledger

| SHA | Source에서 확정된 invariant 변화 | 해당 SHA에서 직접 확인한 코드 근거 | 아직 남은 위험/미보장 |
| --- | --- | --- | --- | --- |
| `57a25e8475ab` | signed decimal token grammar, exact limits, stack-shape language 도입 | manual sign/magnitude parser가 `LONG_MAX + 1` negative limit과 pre-multiply digit guard로 exact signed bounds를 만들고 local stack shape를 검사합니다. | operator overflow precondition은 아직 완전하지 않아 arithmetic safety는 후속 commit에 남습니다. |
| `e1641a714172` | 모든 operator에 precondition-first overflow/invalid-operation checks 도입 | add/sub sign margins, unsigned magnitude multiplication limit, zero 및 `LONG_MIN / -1` division guards가 실제 operation보다 먼저 실행됩니다. | 모든 긴 expression/state-space에 대한 exhaustive proof와 외부 caller side effect는 다루지 않습니다. |
| `aa0cc5e3e063` | long extremes, overflow directions, operand order, malformed expressions 검증 | literal extremes, non-commutative order, overflow/underflow directions, invalid division, malformed tokens/stacks를 deterministic cases로 검사합니다. | finite case set이므로 모든 가능한 token 길이와 expression 조합을 형식적으로 증명하지는 않습니다. |

## Failure → Fix → Test 연결

- 명시적 fix commit은 이 Thread에 없습니다. `e1641a714172`가 undefined signed overflow를 피하는 precondition-first decision을 구현합니다.
- `aa0cc5e3e063`이 long limits, 모든 overflow direction, division boundary, malformed expression을 회귀 검증합니다.

### 학습자 연결 기록
- 최초 위험/맹점: signed overflow를 먼저 계산한 뒤 결과 범위를 검사하면 검사 자체가 이미 undefined behavior 뒤에 실행됩니다. 또한 `LONG_MIN`은 양의 `long`으로 직접 magnitude를 표현할 수 없습니다.
- 이를 드러낸 실제 failure 또는 test gap: 일반적인 `-value`나 `left * right` 기반 검사는 `LONG_MIN`과 overflow product에서 안전하지 않고, commutative operator만 시험하면 right/left pop 순서 오류도 놓칩니다.
- 수정/강화된 decision: token은 unsigned magnitude와 asymmetric limit으로 파싱하고, 각 operator는 sign·limit·magnitude precondition을 통과한 뒤에만 signed expression을 실행합니다.
- 해당 코드 위치: `57a25e8475ab:src/RpnEvaluator.cpp`의 `parseLong()`, `e1641a714172:src/RpnEvaluator.cpp`의 checked helpers와 `evaluate()` pop order.
- 이를 고정하는 regression/evidence: `aa0cc5e3e063:tests/test_rpn_evaluator.cpp`의 long extremes, 모든 overflow 방향, division special cases, malformed expression tests.

## State / responsibility 변화

- Source 기준 흐름: token parser가 complete signed operands를 만들고, evaluator stack이 구조를 소유하며, arithmetic helper가 signed operation 이전의 range precondition을 책임집니다.
- [x] parser stack과 arithmetic helper 사이에서 어떤 값이 전달되고 어디서 exception이 발생하는지 기록하세요.

### 코드 검사로 복원한 변화

1. `57a25e8475ab`: ASCII-space tokenizer와 unsigned magnitude parser가 complete signed operands를 만들고 local stack이 expression structure를 소유합니다.
2. `e1641a714172`: arithmetic responsibility가 checked helper로 분리되고, stack에는 precondition을 통과한 결과만 다시 들어갑니다.
3. `aa0cc5e3e063`: parser limits, pop order, 각 operator의 success/failure boundary가 deterministic unit cases로 연결됩니다.

## Thread 최종 상태

- Source가 확정한 최종 흐름: `ASCII-space tokenization → signed operand parse → stack-shape validation → checked operator precondition → signed operation → single-result validation`
- [x] 마지막 Thread SHA 시점에서 실제 type/function 호출 관계를 사용해 위 흐름을 다시 그리세요.
- [x] Thread 시작 시점과 비교해 새로 보장되는 invariant를 정리하세요.
- [x] source가 보장하지 않는 영역이나 외부 side effect/stream position 등 남는 경계를 실제 코드 근거로 적으세요.

### 완성된 Thread 해석

마지막 Thread SHA 기준으로 `RpnEvaluator::evaluate()`는 ASCII space만 separator로 사용해 token을 완전히 분리합니다. signed number는 `parseLong()`이 unsigned magnitude로 범위를 확인하고, operator는 stack에서 right와 left를 꺼낸 뒤 checked helper에 전달합니다. helper가 성공한 경우에만 result를 push하며 종료 시 exactly one value를 요구합니다.

시작 시점과 비교하면 token grammar와 stack grammar 위에 UB를 발생시키지 않는 arithmetic boundary가 생겼습니다. 실패는 call-local state에서 exception으로 끝나며 partial result를 외부에 게시하지 않습니다. 남는 경계는 유한한 regression suite 밖 expression 조합과 caller가 exception 이후 수행하는 외부 side effect입니다.

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

- 실제 caller → callee 흐름: expression string → `RpnEvaluator::evaluate()` token loop → `parseLong()` 또는 operator branch → right/left pop → `checkedAdd/Subtract/Multiply/Divide()` → validated result push → single final result 반환.
- 핵심 상태 필드: call-local `std::vector<long> stack`, token index, unsigned `magnitude`/`limit`, checked helper의 left/right values.
- resource owner / borrowed view: expression은 borrowed input이고 token strings와 stack은 evaluator call이 소유합니다. persistent heap ownership이나 external target은 없습니다.
- commit point: 각 operator는 checked helper 성공 뒤 `stack.push_back(result)`하고, 전체 evaluation은 final stack size가 1일 때 반환합니다.
- cleanup path: malformed token/stack, range failure, zero division, `LONG_MIN / -1`은 exception으로 local stack을 파괴합니다. overflowed signed expression은 실행되지 않습니다.
- 최종 invariant 설명: accepted operands는 exact `long` grammar와 limits를 만족하고, 모든 signed operation은 정의된 결과 범위가 확인된 뒤에만 실행되며 non-commutative operand order가 보존됩니다.

### 실행 검증 범위

이 문서의 구현·테스트 설명은 지정 SHA의 diff와 당시 파일을 GitHub 저장소에서 직접 검사해 복원했습니다. 현재 컨테이너에서는 GitHub checkout에 필요한 네트워크 연결이 차단되어 build/test command를 실행하지 못했습니다. 따라서 아래 체크 표시는 코드·테스트 구현을 확인했다는 의미이며, 실행 결과를 의미하지 않습니다.

## 학습 완료 자가 점검

- [x] Commit map의 SHA/순서를 그대로 따라 모든 관련 code tree를 확인했습니다.
- [x] final HEAD를 과거 commit 설명에 소급해서 사용하지 않았습니다.
- [x] S/A/B importance에 맞는 깊이로 code/test evidence를 채웠습니다.
- [x] source가 확정한 invariant와 제가 실제 코드에서 확인한 증거를 구분했습니다.
- [x] failure path에서 state mutation 전후와 cleanup owner를 설명할 수 있습니다.
- [x] test commit마다 production invariant, technique, production path, 증명/비증명 범위를 구분했습니다.
- [x] Thread 마지막 상태를 commit history에 근거해 처음부터 끝까지 설명할 수 있습니다.
