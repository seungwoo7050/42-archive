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

- [x] character/integer/floating/special 분류가 projection 이전에 끝나는 실제 경로를 추적할 수 있다.
- [x] float suffix, whitespace, trailing bytes, overflow, nonzero underflow 경계를 테스트와 parser 코드에서 대응시킬 수 있다.
- [x] float/double projection에서 representability 판단과 canonical rendering을 구분할 수 있다.
- [x] caller locale/format flags와 staged output의 관계를 테스트로 확인할 수 있다.

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
- [x] scalar literal parser가 character/integer/floating/special 종류를 결정하는 grammar branches를 찾으세요.
- [x] ASCII byte 기준 검사와 surrounding whitespace/trailing material rejection을 어떤 helper가 담당하는지 확인하세요.
- [x] lone non-digit character가 character literal로 우선되는 precedence를 실제 branch order에서 확인하세요.
- [x] parser가 즉시 출력하지 않고 normalized intermediate representation을 만드는 상태 필드/enum을 기록하세요.
- [x] special value와 negative-zero recognition이 여러 projection에 중복되지 않고 parser 단계에 모이는지 call graph로 확인하세요.
- [x] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [x] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `a863f4899a93`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼: `src/ScalarLiteral.hpp`의 `LiteralKind`, `ScalarLiteral`, `ScalarParseError`, `parseScalarLiteral()`; `src/ScalarLiteral.cpp`의 byte/grammar helpers.
- 핵심 코드 발췌 위치: `6a3d0461faab:src/ScalarLiteral.cpp`에서 입력 byte를 먼저 검사하고 special, lone printable non-digit character, finite grammar 순서로 분류합니다. 결과는 `kind`, `value`, `float_suffix`, `negative_zero`를 가진 intermediate object입니다.
- 변경 전/후 차이: input text를 target별 출력 함수에서 즉석 해석하는 대신, source literal의 종류와 의미를 먼저 하나의 parser가 결정하는 내부 representation이 생겼습니다.
- 직접 확인한 ownership/lifetime/state 관계: parser는 입력 `std::string`을 borrowed read-only source로 사용하고 값만 `ScalarLiteral`에 복사합니다. parser state는 호출 범위의 local value이며 아직 destination stream에 쓰지 않습니다.
- 직접 확인한 failure path: empty text, NUL, non-ASCII, surrounding/embedded whitespace, incomplete number, trailing bytes는 `ScalarParseError`로 끝납니다. lone non-digit character branch가 finite parsing보다 먼저라 printable 단일 문자는 character로 고정됩니다. 이 시점의 numeric extraction 경계는 후속 hardening 전 상태입니다.
- 실행한 테스트와 결과: 미실행. 지정 SHA의 parser declaration과 implementation을 검사했으며 command는 수행하지 않았습니다.
- 이 commit을 한 문장으로 설명: complete ASCII scalar grammar를 target projection 앞의 normalized semantic value로 분리했습니다.

### `a863f4899a93` — feat(scalar): locale 고정 수치 추출과 경계 보존

- Importance: **A**
- Tags: **NUMERIC, PARSING, HARD**
- Source 역할: locale independence, negative zero, overflow, nonzero-underflow 경계를 보존합니다.
- Source classification summary: Hardens locale-independent numeric extraction, suffix grammar, negative zero, overflow, and underflow handling.

#### 핵심 설계 / failure boundary 확인
- [x] 필요하면 직전 관련 SHA `6a3d0461faab`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [x] numeric extraction stream/locale가 classic locale로 고정되는 지점을 찾고 host locale 사용을 차단하는 방식을 기록하세요.
- [x] `f` suffix를 허용하기 전에 decimal point 또는 exponent 존재를 요구하는 grammar branch를 확인하세요.
- [x] textual zero와 nonzero mantissa가 machine zero로 underflow한 경우를 구분하는 검사 순서를 추적하세요.
- [x] overflow와 silent nonzero underflow rejection이 stream extraction success 여부와 별도로 검사되는지 확인하세요.
- [x] negative zero lexeme의 sign이 일반 `value == 0` 비교와 별도 상태로 보존되는 코드를 찾으세요.
- [x] non-ASCII/malformed byte rejection과 printable single-character precedence가 충돌하지 않는 분기 순서를 확인하세요.
- [x] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [x] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `fc7faa10dc66`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼: `src/ScalarLiteral.cpp`의 `validateFiniteGrammar()`, `allMantissaDigitsAreZero()`, `extractFiniteValue()`, `parseScalarLiteral()`; `src/ScalarLiteral.hpp`의 `negative_zero`.
- 핵심 코드 발췌 위치: `a863f4899a93:src/ScalarLiteral.cpp`는 numeric stream에 `std::locale::classic()`을 적용하고 `input.fail() || !input.eof()`를 검사합니다. `f` suffix는 point나 exponent가 있을 때만 허용하며, nonzero mantissa가 extraction 후 `0.0`이면 underflow로 거부합니다.
- 변경 전/후 차이: permissive numeric extraction에 의존하던 경계를 classic-locale complete parse, finite overflow, nonzero-underflow, suffix grammar, negative-zero 보존으로 강화했습니다.
- 직접 확인한 ownership/lifetime/state 관계: lexeme의 sign과 mantissa-zero 여부는 machine `double`과 별도로 `negative_zero`에 보존됩니다. textual all-zero는 parser가 직접 `+0.0`/`-0.0`을 만들고, nonzero lexeme만 stream extraction을 거칩니다.
- 직접 확인한 failure path: `42f`는 point/exponent가 없어 거부되고 `1e309` 같은 finite overflow는 fail/non-finite 검사로 거부됩니다. `1e-9999`처럼 nonzero digits가 machine zero가 되면 all-zero가 아니므로 거부됩니다. `-0`, `-0.0`, `-0e10`은 zero이면서 sign metadata를 유지합니다.
- 실행한 테스트와 결과: 미실행. 지정 SHA의 grammar 및 numeric boundary code를 검사했으며 command는 수행하지 않았습니다.
- 이 commit을 한 문장으로 설명: locale와 machine conversion이 source text의 overflow, underflow, negative-zero 의미를 바꾸지 못하게 했습니다.

### `fc7faa10dc66` — test(scalar): literal 문법과 수치 범위 검증

- Importance: **A**
- Tags: **TEST, NUMERIC, EDGE**
- Source 역할: valid/invalid grammar와 numerical edge conditions를 고정합니다.
- Source classification summary: Adds exhaustive scalar grammar and numerical-boundary tests.

#### 핵심 설계 / failure boundary 확인
- [x] 필요하면 직전 관련 SHA `a863f4899a93`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [x] character precedence, signed integer, decimal/exponent, float suffix, negative zero, inf/NaN의 accepted cases를 test table/fixtures에서 분류하세요.
- [x] whitespace, embedded NUL/non-ASCII, trailing garbage, malformed exponent, overflow, nonzero-underflow rejection cases를 각각 production parser branch에 연결하세요.
- [x] complete token 소비를 증명하는 test가 stream prefix-parse만 성공하는 잘못된 구현을 어떻게 잡는지 확인하세요.
- [x] literal grammar failure와 numerical representability failure가 test expectation에서 구분되는지 기록하세요.
- [x] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [x] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

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
- 확인한 파일/심볼: `tests/test_scalar_literal.cpp`; test suite registration; literal parser 관련 expected exception helpers.
- 핵심 코드 발췌 위치: `fc7faa10dc66:tests/test_scalar_literal.cpp`의 accepted tables/cases는 character, signed integer, point/exponent, `f` suffix, specials, negative zero를 다루고 rejected cases는 whitespace, NUL/non-ASCII, trailing garbage, malformed exponent, `42f`, overflow와 nonzero underflow를 포함합니다.
- 변경 전/후 차이: parser implementation의 분기별 source-language boundary가 deterministic unit regression으로 고정되었습니다. 최종 4-line rendering과 CLI output은 아직 이 commit의 주 대상이 아닙니다.
- 직접 확인한 ownership/lifetime/state 관계: tests는 반환 `ScalarLiteral`의 kind/value/suffix/sign metadata를 직접 비교하며 destination stream이나 외부 state를 만들지 않습니다.
- 직접 확인한 failure path: prefix만 읽는 parser라면 통과할 `1.0x`, malformed exponent, embedded NUL을 expected rejection으로 둬 complete consumption을 검사합니다. overflow와 nonzero-underflow도 grammar success와 별개로 exception을 기대해 numerical boundary를 분리합니다.
- 실행한 테스트와 결과: 미실행. test cases와 production branch mapping을 검사했으나 unit binary는 실행하지 않았습니다.
- 이 commit을 한 문장으로 설명: scalar source language의 승인·거부 경계를 수치 한계까지 회귀 테스트로 고정했습니다.

### `7cdcec341fb1` — feat(scalar): 부동소수점 표현과 원자 출력 구현

- Importance: **A**
- Tags: **NUMERIC, DETERMINISM, EXCEPTION**
- Source 역할: canonical float/double projection과 staged whole-report rendering을 추가합니다.
- Source classification summary: Adds float and double projections plus classic-locale staged rendering.

#### 핵심 설계 / failure boundary 확인
- [x] 필요하면 직전 관련 SHA `fc7faa10dc66`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [x] float와 double projection의 finite-range 및 nonzero-underflow checks를 casting 전에 수행하는 위치를 찾으세요.
- [x] negative zero, NaN, infinity, finite precision, `.0` suffix를 canonical spelling으로 만드는 rendering helpers를 확인하세요.
- [x] caller stream이 아니라 classic-locale temporary stream에 4개 projection line을 먼저 쓰는 순서를 추적하세요.
- [x] temporary rendering이 성공한 뒤 caller destination에 한 번에 bytes를 전달하는 publication point를 찾으세요.
- [x] destination 자체가 final write 중 fail하는 경우까지 rollback하지 않는 boundary를 실제 write structure에서 확인하세요.
- [x] caller locale/precision/flags를 읽거나 수정하지 않고 result가 고정되는지 implementation을 확인하세요.
- [x] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [x] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `afea789fd753`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼: `src/ScalarConverter.cpp`의 `canProjectChar()`, `canProjectInt()`, `canProjectFloat()`, `finiteNumber()`, projection writers, `ScalarConverter::write()`.
- 핵심 코드 발췌 위치: `7cdcec341fb1:src/ScalarConverter.cpp`에서 float projection은 range를 검사하고 cast 결과가 zero가 되는 nonzero 값을 거부합니다. 네 projection은 classic-locale `std::ostringstream rendered`에 모두 기록된 뒤 `result` bytes가 destination에 한 번 `output.write()` 됩니다.
- 변경 전/후 차이: normalized literal에 char/int/float/double representability와 canonical spelling을 적용하는 출력 계층이 추가되었습니다. caller stream에 line을 하나씩 직접 쓰지 않고 report 전체를 먼저 staging합니다.
- 직접 확인한 ownership/lifetime/state 관계: parser result와 `rendered`/`result`는 local candidate state입니다. caller stream은 final write 전까지 변경되지 않습니다. caller의 locale, precision, flags는 읽거나 바꾸지 않고 temporary stream만 classic locale과 자체 precision을 사용합니다.
- 직접 확인한 failure path: parse/projection/rendering 중 예외가 나면 destination write에 도달하지 않아 partial line이 없습니다. float overflow나 nonzero-underflow는 `impossible` projection으로 표현됩니다. 그러나 final `output.write()` 자체가 중간에 실패한 경우 destination bytes나 stream position을 rollback하는 코드는 없습니다.
- 실행한 테스트와 결과: 미실행. projection과 staged publication implementation을 검사했으며 command는 수행하지 않았습니다.
- 이 commit을 한 문장으로 설명: source 의미를 target별로 투영해 classic-locale 4-line report를 완성한 뒤 한 번에 게시합니다.

### `afea789fd753` — test(scalar): 변환 가능성·출력·CLI 오류 검증

- Importance: **A**
- Tags: **TEST, NUMERIC, DETERMINISM**
- Source 역할: exact output, stream noninterference, public headers, CLI failure를 검증합니다.
- Source classification summary: Verifies exact projections, locale independence, stream-state preservation, public headers, and CLI errors.

#### 핵심 설계 / failure boundary 확인
- [x] 필요하면 직전 관련 SHA `7cdcec341fb1`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [x] printable/control character, escapes, integer bounds, finite float/double, NaN/inf, negative zero, one-target-only representability cases의 exact 4-line expectations를 확인하세요.
- [x] test가 locale와 stream formatting state를 변경한 뒤에도 canonical output과 caller state 보존을 어떻게 assert하는지 기록하세요.
- [x] public-header compile test가 converter를 private parser 없이 사용할 수 있음을 어떻게 확인하는지 보세요.
- [x] CLI invalid literal이 nonzero status와 empty stdout를 보장하는 fixture를 찾으세요.
- [x] unit/compile/CLI 각각이 parser, projection, integration 중 어느 production path를 증명하는지 구분하세요.
- [x] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [x] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### Test commit 학습 구분
- 대상 production invariant: source가 확정한 방향은 **scalar representability, canonical output, caller stream noninterference**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 재현 failure / boundary: source가 확정한 방향은 **type-specific impossible cases, locale/flags drift, invalid CLI input**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- test technique: source가 확정한 방향은 **exact-output unit + stream-state manipulation + public compile + CLI fixture**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 통과하는 production path: source가 확정한 방향은 **ScalarConverter projection/render + process adapter**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하는 것: source가 확정한 방향은 **완성된 scalar subsystem의 public/process contract**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하지 않는 것: source가 확정한 방향은 **destination stream final-write rollback까지 보장하지는 않음**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 성격: source가 확정한 방향은 **broad integration + deterministic regression**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.

#### 학습자 기록
- 확인한 파일/심볼: `tests/test_scalar_converter.cpp`, `tests/compile/scalar_headers.cpp`, scalar private-construction compile-fail case, `tests/check_cli.sh`의 scalar fixtures, `Makefile` targets.
- 핵심 코드 발췌 위치: `afea789fd753:tests/test_scalar_converter.cpp`는 printable/control char, escapes, int bounds, finite/special float/double, negative zero, target별 impossible output의 정확한 네 줄을 비교합니다. caller stream locale/flags/precision을 변경한 뒤 output과 기존 state도 비교합니다.
- 변경 전/후 차이: parser unit 경계 위에 projection correctness, byte-level canonical output, stream noninterference, public header visibility, invalid CLI behavior가 추가되었습니다.
- 직접 확인한 ownership/lifetime/state 관계: tests는 동일 input의 report가 caller formatting state와 무관하고, `ScalarConverter` 내부 private parser를 외부 consumer가 알 필요 없음을 compile contract로 확인합니다.
- 직접 확인한 failure path: invalid literal은 `InvalidScalar`를 기대하고 destination buffer가 empty인지 검사합니다. CLI fixture는 nonzero status와 empty stdout, diagnostic stderr를 비교합니다. 이 evidence도 destination의 final write failure rollback까지는 다루지 않습니다.
- 실행한 테스트와 결과: 미실행. exact expectations, compile units, CLI fixtures를 검사했으나 binary/command는 실행하지 않았습니다.
- 이 commit을 한 문장으로 설명: scalar subsystem의 target별 표현 가능성, canonical bytes, public/process contract를 검증했습니다.

## Invariant ledger

| SHA | Source에서 확정된 invariant 변화 | 해당 SHA에서 직접 확인한 코드 근거 | 아직 남은 위험/미보장 |
| --- | --- | --- | --- | --- |
| `6a3d0461faab` | ASCII scalar grammar와 intermediate semantic representation 도입 | `LiteralKind`/`ScalarLiteral`과 explicit ASCII branch order로 character/finite/special 의미를 projection 전에 정규화합니다. | numeric extraction의 locale·overflow·underflow·suffix 세부 경계는 아직 강화 전입니다. |
| `a863f4899a93` | classic locale, suffix grammar, negative zero, overflow/nonzero-underflow 경계 강화 | classic-locale complete extraction, point/exponent 없는 `f` rejection, all-zero 판정, finite overflow 및 nonzero-underflow rejection을 확인했습니다. | 최종 target representability와 four-line publication은 아직 없습니다. |
| `fc7faa10dc66` | 문법과 수치 경계를 boundary-oriented tests로 고정 | accepted/rejected tables가 whitespace/NUL/trailing/malformed/overflow/underflow/negative-zero/special 분기를 production parser에 연결합니다. | rendering bytes와 CLI/output atomicity는 검증하지 않습니다. |
| `7cdcec341fb1` | float/double projection과 temporary-stream staged whole-report rendering 도입 | char/int/float/double projection, canonical finite/special spelling, classic temporary stream, final single `write()`를 확인했습니다. | destination stream의 실제 final-write partial failure는 rollback하지 않습니다. |
| `afea789fd753` | exact output, locale independence, stream-state noninterference, CLI failure 검증 | exact four-line output, locale/flags preservation, public compile, invalid CLI empty stdout를 검사합니다. | 모든 possible destination streambuf failure와 platform floating implementation을 형식적으로 증명하지는 않습니다. |

## Failure → Fix → Test 연결

- 명시적 fix commit은 이 Thread에 없습니다. parsing boundary를 `6a3d0461faab`/`a863f4899a93`에서 강화하고, `fc7faa10dc66`에서 grammar/numeric regression을 고정합니다.
- `7cdcec341fb1`은 whole-report staging을 도입하고, `afea789fd753`은 exact output/stream-state/CLI failure를 검증합니다.

### 학습자 연결 기록
- 최초 위험/맹점: stream extraction이 prefix만 받아들이거나 caller/host locale에 의존하면 동일 text가 다른 의미로 승인될 수 있고, projection을 즉시 출력하면 뒤 단계 failure 전에 partial report가 노출됩니다.
- 이를 드러낸 실제 failure 또는 test gap: suffix·trailing byte·overflow·nonzero-underflow·negative zero는 단순 `double` 값만으로 구분되지 않으며, 정상 output case만으로 caller formatting state 오염이나 invalid input의 partial stdout을 잡을 수 없습니다.
- 수정/강화된 decision: parser가 complete ASCII grammar와 semantic metadata를 먼저 만들고, projection은 target representability만 판단합니다. renderer는 classic-locale temporary stream에서 네 줄을 완성한 뒤 destination에 한 번 씁니다.
- 해당 코드 위치: `6a3d0461faab`/`a863f4899a93:src/ScalarLiteral.cpp`, `7cdcec341fb1:src/ScalarConverter.cpp`.
- 이를 고정하는 regression/evidence: `fc7faa10dc66:tests/test_scalar_literal.cpp`, `afea789fd753:tests/test_scalar_converter.cpp`, compile/CLI fixtures.

## Responsibility 변화

- Source 기준 흐름: parser가 source literal 의미를 정규화하고, projection이 target representability를 판단하며, renderer가 classic-locale canonical report를 staging합니다.
- [x] 각 책임이 실제 어떤 class/helper/function에 위치하는지 SHA별로 기록하세요.
- [x] parsing failure, projection impossibility, formatting failure의 경계를 구분하세요.

### 코드 검사로 복원한 변화

1. `6a3d0461faab`: parser가 source token의 kind와 normalized value를 만들고 destination output 책임을 갖지 않습니다.
2. `a863f4899a93`: parser 책임에 classic locale, complete consumption, negative-zero metadata, finite overflow와 nonzero-underflow 판정이 추가됩니다.
3. `fc7faa10dc66`: source-language acceptance boundary가 parser-level tests로 고정됩니다.
4. `7cdcec341fb1`: converter가 target별 representability와 canonical rendering을 담당하고 complete report만 destination에 게시합니다.
5. `afea789fd753`: exact bytes, caller stream noninterference, public header, process failure behavior가 별도 evidence로 추가됩니다.

## Thread 최종 상태

- Source가 확정한 최종 흐름: `ASCII token → literal classification/normalized meaning → per-target representability → canonical render → staged four-line publication`
- [x] 마지막 Thread SHA 시점에서 실제 type/function 호출 관계를 사용해 위 흐름을 다시 그리세요.
- [x] Thread 시작 시점과 비교해 새로 보장되는 invariant를 정리하세요.
- [x] source가 보장하지 않는 영역이나 외부 side effect/stream position 등 남는 경계를 실제 코드 근거로 적으세요.

### 완성된 Thread 해석

마지막 Thread SHA 기준으로 `ScalarConverter::write()`는 먼저 `scalar_detail::parseScalarLiteral()`을 호출해 source text를 `ScalarLiteral`로 정규화합니다. 이후 char/int/float/double writer가 동일 semantic value를 각 target 범위에 맞춰 `impossible`, `Non displayable`, canonical finite/special text로 변환합니다. 네 줄은 local classic-locale stream에서 완성된 후 destination에 전달됩니다.

시작 시점과 비교하면 text parsing과 target projection이 분리되어 locale, trailing input, negative zero, overflow와 underflow 경계를 잃지 않습니다. invalid input이나 local rendering failure는 destination에 아무 prefix도 쓰지 않습니다. 남는 경계는 destination stream의 final write failure rollback과 테스트 matrix 밖 floating/platform 차이입니다.

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

- 실제 caller → callee 흐름: input `std::string` → `ScalarConverter::write()` → `parseScalarLiteral()` → `ScalarLiteral` → char/int/float/double projection helpers → local `ostringstream rendered` → destination `output.write()`.
- 핵심 상태 필드: `ScalarLiteral::{kind, value, float_suffix, negative_zero}`와 local rendered byte string.
- resource owner / borrowed view: input text와 destination stream은 caller-owned borrowed objects이고 parser result, temporary stream, result string은 call-local owners입니다.
- commit point: 네 projection line을 모두 성공적으로 만든 뒤 실행하는 final `output.write(result.data(), result.size())`입니다.
- cleanup path: grammar/numeric failure는 `ScalarParseError`에서 public `InvalidScalar`로 변환되고 local candidates가 자동 파괴됩니다. projection/rendering failure도 final write 전이면 destination은 untouched입니다.
- 최종 invariant 설명: accepted text는 complete classic ASCII grammar와 semantic sign/range를 보존하고, target별 판단과 canonical rendering은 caller stream state와 무관하며 incomplete report는 publish되지 않습니다.

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
