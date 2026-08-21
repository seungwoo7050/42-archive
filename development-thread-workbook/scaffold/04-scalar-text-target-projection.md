# Scalar Text Is Separated from Target Projection

## Thread 목표

입력 text의 문법/의미 판정과 각 target type으로의 representability/rendering을 분리하고, locale·negative zero·overflow·underflow 경계를 보존한 뒤 완성된 4-line report만 publish하는 흐름을 복원합니다.

**Source significance:** parsing과 rendering을 별도 책임으로 발전시킵니다. permissive extraction이나 host locale가 source meaning을 바꾸지 못하게 하고, 4개 projection이 partial prefix가 아니라 하나의 deterministic report로 publish되게 합니다.

## 이 Thread를 이해하기 위한 핵심 질문

- 하나의 parser가 source literal의 의미를 먼저 정규화해야 하는 이유는 무엇인가?
- classic locale 고정과 complete-input 검증이 permissive stream parsing의 어떤 문제를 막는가?
- textual zero와 nonzero-underflow-to-zero를 어떻게 구분해야 하는가?
- negative zero의 sign을 일반 비교와 별개로 보존해야 하는 이유는 무엇인가?
- temporary stream staging이 보장하는 atomicity와 보장하지 않는 destination-stream 영역은 무엇인가?

## 완료 기준

- [ ] character/integer/floating/special 분류가 projection 이전에 끝나는 실제 경로를 추적할 수 있다.
- [ ] float suffix, whitespace, trailing bytes, overflow, nonzero underflow 경계를 테스트와 parser 코드에서 대응시킬 수 있다.
- [ ] float/double projection에서 representability 판단과 canonical rendering을 구분할 수 있다.
- [ ] caller locale/format flags와 staged output의 관계를 테스트로 확인할 수 있다.

## Source에 연결된 invariant / engineering difficulty

### Critical invariant

- accepted text는 complete ASCII grammar와 일치해야 하며 `LONG_MIN`, negative zero, finite overflow, nonzero underflow 같은 의미 경계를 보존한다.
- 완성되지 않은 report는 publish하지 않는다.
- deterministic rendering은 locale과 caller stream formatting state의 영향을 받지 않는다.

### Major engineering difficulty

- locale drift 없이 floating literal을 parsing하면서 negative zero를 보존하고 silent nonzero underflow를 거부.
- classic-locale rendering과 caller stream-state noninterference.

위 항목은 source가 확정한 범위입니다. 실제 코드에서 어떻게 구현되는지는 아래 학습 기록에서 직접 확인합니다.

## Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `6a3d0461faab` | feat(scalar): scalar 리터럴 문법과 종류 분류 | A | PARSING, ARCH, NUMERIC | 명시적 scalar grammar와 intermediate semantic representation을 만듭니다. |
| 2 | `a863f4899a93` | feat(scalar): locale 고정 수치 추출과 경계 보존 | A | NUMERIC, PARSING, HARD | locale independence, negative zero, overflow, nonzero-underflow 경계를 보존합니다. |
| 3 | `fc7faa10dc66` | test(scalar): literal 문법과 수치 범위 검증 | A | TEST, NUMERIC, EDGE | valid/invalid grammar와 numerical edge conditions를 고정합니다. |
| 4 | `7cdcec341fb1` | feat(scalar): 부동소수점 표현과 원자 출력 구현 | A | NUMERIC, DETERMINISM, EXCEPTION | canonical float/double projection과 staged whole-report rendering을 추가합니다. |
| 5 | `afea789fd753` | test(scalar): 변환 가능성·출력·CLI 오류 검증 | A | TEST, NUMERIC, DETERMINISM | exact output, stream noninterference, public headers, CLI failure를 검증합니다. |

## Commit별 학습 기록

### `6a3d0461faab` — feat(scalar): scalar 리터럴 문법과 종류 분류

- Importance: **A**
- Tags: **PARSING, ARCH, NUMERIC**
- Source 역할: 명시적 scalar grammar와 intermediate semantic representation을 만듭니다.
- Source classification summary: Introduces an intermediate scalar-literal model and explicit ASCII grammar.

#### 핵심 설계 / failure boundary 확인
- [ ] scalar literal parser가 character/integer/floating/special 종류를 결정하는 grammar branches를 찾으세요.
- [ ] ASCII byte 기준 검사와 surrounding whitespace/trailing material rejection을 어떤 helper가 담당하는지 확인하세요.
- [ ] lone non-digit character가 character literal로 우선되는 precedence를 실제 branch order에서 확인하세요.
- [ ] parser가 즉시 출력하지 않고 normalized intermediate representation을 만드는 상태 필드/enum을 기록하세요.
- [ ] special value와 negative-zero recognition이 여러 projection에 중복되지 않고 parser 단계에 모이는지 call graph로 확인하세요.
- [ ] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [ ] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `a863f4899a93`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `a863f4899a93` — feat(scalar): locale 고정 수치 추출과 경계 보존

- Importance: **A**
- Tags: **NUMERIC, PARSING, HARD**
- Source 역할: locale independence, negative zero, overflow, nonzero-underflow 경계를 보존합니다.
- Source classification summary: Hardens locale-independent numeric extraction, suffix grammar, negative zero, overflow, and underflow handling.

#### 핵심 설계 / failure boundary 확인
- [ ] 필요하면 직전 관련 SHA `6a3d0461faab`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [ ] numeric extraction stream/locale가 classic locale로 고정되는 지점을 찾고 host locale 사용을 차단하는 방식을 기록하세요.
- [ ] `f` suffix를 허용하기 전에 decimal point 또는 exponent 존재를 요구하는 grammar branch를 확인하세요.
- [ ] textual zero와 nonzero mantissa가 machine zero로 underflow한 경우를 구분하는 검사 순서를 추적하세요.
- [ ] overflow와 silent nonzero underflow rejection이 stream extraction success 여부와 별도로 검사되는지 확인하세요.
- [ ] negative zero lexeme의 sign이 일반 `value == 0` 비교와 별도 상태로 보존되는 코드를 찾으세요.
- [ ] non-ASCII/malformed byte rejection과 printable single-character precedence가 충돌하지 않는 분기 순서를 확인하세요.
- [ ] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [ ] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `fc7faa10dc66`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `fc7faa10dc66` — test(scalar): literal 문법과 수치 범위 검증

- Importance: **A**
- Tags: **TEST, NUMERIC, EDGE**
- Source 역할: valid/invalid grammar와 numerical edge conditions를 고정합니다.
- Source classification summary: Adds exhaustive scalar grammar and numerical-boundary tests.

#### 핵심 설계 / failure boundary 확인
- [ ] 필요하면 직전 관련 SHA `a863f4899a93`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [ ] character precedence, signed integer, decimal/exponent, float suffix, negative zero, inf/NaN의 accepted cases를 test table/fixtures에서 분류하세요.
- [ ] whitespace, embedded NUL/non-ASCII, trailing garbage, malformed exponent, overflow, nonzero-underflow rejection cases를 각각 production parser branch에 연결하세요.
- [ ] complete token 소비를 증명하는 test가 stream prefix-parse만 성공하는 잘못된 구현을 어떻게 잡는지 확인하세요.
- [ ] literal grammar failure와 numerical representability failure가 test expectation에서 구분되는지 기록하세요.
- [ ] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [ ] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### Test commit 학습 구분
- 대상 production invariant: source가 확정한 방향은 **scalar complete grammar와 numeric boundary preservation**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 재현 failure / boundary: source가 확정한 방향은 **malformed tokens, overflow, nonzero underflow, negative-zero/special boundaries**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- test technique: source가 확정한 방향은 **boundary-oriented unit suite**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 통과하는 production path: source가 확정한 방향은 **literal parser and numeric extraction paths**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하는 것: source가 확정한 방향은 **accepted/rejected source language 경계가 고정됨**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하지 않는 것: source가 확정한 방향은 **최종 4-line rendering/CLI atomicity는 후속 commits가 담당**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 성격: source가 확정한 방향은 **deterministic boundary regression**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `7cdcec341fb1`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `7cdcec341fb1` — feat(scalar): 부동소수점 표현과 원자 출력 구현

- Importance: **A**
- Tags: **NUMERIC, DETERMINISM, EXCEPTION**
- Source 역할: canonical float/double projection과 staged whole-report rendering을 추가합니다.
- Source classification summary: Adds float and double projections plus classic-locale staged rendering.

#### 핵심 설계 / failure boundary 확인
- [ ] 필요하면 직전 관련 SHA `fc7faa10dc66`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [ ] float와 double projection의 finite-range 및 nonzero-underflow checks를 casting 전에 수행하는 위치를 찾으세요.
- [ ] negative zero, NaN, infinity, finite precision, `.0` suffix를 canonical spelling으로 만드는 rendering helpers를 확인하세요.
- [ ] caller stream이 아니라 classic-locale temporary stream에 4개 projection line을 먼저 쓰는 순서를 추적하세요.
- [ ] temporary rendering이 성공한 뒤 caller destination에 한 번에 bytes를 전달하는 publication point를 찾으세요.
- [ ] destination 자체가 final write 중 fail하는 경우까지 rollback하지 않는 boundary를 실제 write structure에서 확인하세요.
- [ ] caller locale/precision/flags를 읽거나 수정하지 않고 result가 고정되는지 implementation을 확인하세요.
- [ ] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [ ] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `afea789fd753`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `afea789fd753` — test(scalar): 변환 가능성·출력·CLI 오류 검증

- Importance: **A**
- Tags: **TEST, NUMERIC, DETERMINISM**
- Source 역할: exact output, stream noninterference, public headers, CLI failure를 검증합니다.
- Source classification summary: Verifies exact projections, locale independence, stream-state preservation, public headers, and CLI errors.

#### 핵심 설계 / failure boundary 확인
- [ ] 필요하면 직전 관련 SHA `7cdcec341fb1`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [ ] printable/control character, escapes, integer bounds, finite float/double, NaN/inf, negative zero, one-target-only representability cases의 exact 4-line expectations를 확인하세요.
- [ ] test가 locale와 stream formatting state를 변경한 뒤에도 canonical output과 caller state 보존을 어떻게 assert하는지 기록하세요.
- [ ] public-header compile test가 converter를 private parser 없이 사용할 수 있음을 어떻게 확인하는지 보세요.
- [ ] CLI invalid literal이 nonzero status와 empty stdout를 보장하는 fixture를 찾으세요.
- [ ] unit/compile/CLI 각각이 parser, projection, integration 중 어느 production path를 증명하는지 구분하세요.
- [ ] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [ ] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### Test commit 학습 구분
- 대상 production invariant: source가 확정한 방향은 **scalar representability, canonical output, caller stream noninterference**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 재현 failure / boundary: source가 확정한 방향은 **type-specific impossible cases, locale/flags drift, invalid CLI input**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- test technique: source가 확정한 방향은 **exact-output unit + stream-state manipulation + public compile + CLI fixture**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 통과하는 production path: source가 확정한 방향은 **ScalarConverter projection/render + process adapter**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하는 것: source가 확정한 방향은 **완성된 scalar subsystem의 public/process contract**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하지 않는 것: source가 확정한 방향은 **destination stream final-write rollback까지 보장하지는 않음**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 성격: source가 확정한 방향은 **broad integration + deterministic regression**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.

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
| `6a3d0461faab` | ASCII scalar grammar와 intermediate semantic representation 도입 |  |  |
| `a863f4899a93` | classic locale, suffix grammar, negative zero, overflow/nonzero-underflow 경계 강화 |  |  |
| `fc7faa10dc66` | 문법과 수치 경계를 boundary-oriented tests로 고정 |  |  |
| `7cdcec341fb1` | float/double projection과 temporary-stream staged whole-report rendering 도입 |  |  |
| `afea789fd753` | exact output, locale independence, stream-state noninterference, CLI failure 검증 |  |  |

## Failure → Fix → Test 연결

- 명시적 fix commit은 이 Thread에 없습니다. parsing boundary를 `6a3d0461faab`/`a863f4899a93`에서 강화하고, `fc7faa10dc66`에서 grammar/numeric regression을 고정합니다.
- `7cdcec341fb1`은 whole-report staging을 도입하고, `afea789fd753`은 exact output/stream-state/CLI failure를 검증합니다.

### 학습자 연결 기록
- 최초 위험/맹점:
- 이를 드러낸 실제 failure 또는 test gap:
- 수정/강화된 decision:
- 해당 코드 위치:
- 이를 고정하는 regression/evidence:

## Responsibility 변화

- Source 기준 흐름: parser가 source literal 의미를 정규화하고, projection이 target representability를 판단하며, renderer가 classic-locale canonical report를 staging합니다.
- [ ] 각 책임이 실제 어떤 class/helper/function에 위치하는지 SHA별로 기록하세요.
- [ ] parsing failure, projection impossibility, formatting failure의 경계를 구분하세요.

## Thread 최종 상태

- Source가 확정한 최종 흐름: `ASCII token → literal classification/normalized meaning → per-target representability → canonical render → staged four-line publication`
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
