# Numeric formatting converges on one layout model

## 1. Thread 목표

decimal, hexadecimal, pointer에서 중복되던 prefix/precision/zero/width/alignment 배치 규칙이 하나의 numeric layout responsibility로 수렴하는 과정을 복원합니다.

### Source에서 확정된 significance

초기 decimal/hex 구현은 spaces, prefixes, field zeros, precision zeros, digits, trailing padding 순서를 중복 구현합니다. shared layout은 이 순서를 하나의 invariant로 만들고, 이후 portability 및 boundary 작업이 signed endpoint와 프로젝트 고유 pointer semantics에서도 이 공통 모델을 유지합니다.

### 이 Thread에 명시적으로 연결되는 source invariant / engineering difficulty

- Invariant: numeric output은 decimal, hexadecimal, pointer 전반에서 spaces, prefixes, field zeros, precision zeros, digits, trailing spaces를 일관된 순서로 출력합니다.
- Invariant: measurement와 rendering은 prefix, zero suppression, precision zeros, field width를 포함한 effective length에 동의해야 합니다.
- Engineering difficulty: prefix selection, zero precision, alternate form, zero padding, width, left alignment를 올바른 순서와 precedence로 합성하는 문제입니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- spaces, prefix, field zeroes, precision zeroes, digits, trailing spaces의 정확한 순서는 각 단계에서 어떻게 표현되는가?
- precision이 명시되면 field-level `0` flag가 왜/어디서 무효화되는가?
- zero value + precision zero의 digit suppression과 alternate-form prefix는 어떻게 결합되는가?
- decimal/hex duplication은 어떤 공통 입력으로 추상화되어 `ft_printf_write_numeric_layout`에 모이는가?
- `INT_MIN` magnitude 계산은 왜 signed type에서 직접 negation하면 안 되는가?
- libc differential oracle와 project-specific fixed expectation은 어느 경계에서 나뉘는가?

## 3. 완료 기준

- 각 layout component의 길이 계산과 emission 순서를 실제 code branch로 설명할 수 있습니다.
- `177c8d03b353` 전후로 decimal/hex 중복 코드가 어떤 shared responsibility로 이동했는지 비교할 수 있습니다.
- `ed3750fd081a`에서 `INT_MIN`을 signed overflow 없이 magnitude로 바꾸는 식을 실제 코드로 설명할 수 있습니다.
- `12d715eba77d`에서 zero precision, prefix, null pointer, narrow width가 어떤 public contract로 고정되는지 test case와 production path를 연결할 수 있습니다.

## 4. Commit map

| SHA | Subject | Importance | Tags | Source-defined role |
| --- | --- | --- | --- | --- |
| `ac27a26affaa` | feat(decimal): 10진수 너비와 정렬 적용 | `B` | `FORMAT, LAYOUT` | Adds prefix-aware width and alignment to decimal output. |
| `c5ef742b84de` | feat(hex): 16진수와 포인터 너비와 정렬 적용 | `B` | `FORMAT, LAYOUT` | Repeats the model for hexadecimal and pointer output. |
| `1fa064ca9d79` | feat(numeric): 숫자 정밀도와 0 채움 적용 | `A` | `FORMAT, LAYOUT, RISK` | Adds zero suppression, precision zeros, and zero-field padding rules. |
| `c5f627099ad9` | feat(flags): 숫자 플래그 우선순위 정규화 | `A` | `PARSER, FORMAT, LAYOUT` | Establishes prefix selection and flag precedence. |
| `f276ee73087c` | test(numeric): 접두사와 정밀도 배치 회귀 검증 | `B` | `FORMAT, TEST, EDGE` | Locks down representative prefix, precision, zero, and left-alignment interactions. |
| `177c8d03b353` | refactor(output): 숫자 출력 배치 로직 통합 | `A` | `ARCH, LAYOUT, REFACTOR` | Extracts one shared numeric layout writer for decimal, hexadecimal, and pointer conversions. |
| `ed3750fd081a` | fix(decimal): INT_MIN 크기를 unsigned 범위에서 계산 | `A` | `FORMAT, EDGE, RISK` | Removes signed-overflow dependence when formatting `INT_MIN`. |
| `12d715eba77d` | test(printf): 공개 계약 경계 사례 확대 | `A` | `FORMAT, TEST, EDGE` | Expands public boundary matrices for zero precision, prefixes, null pointers, and narrow fields. |

## 5. Commit별 학습 기록

> 원칙: 아래 기록은 final HEAD가 아니라 각 항목의 정확한 SHA에서 작성합니다. source가 확정하지 않은 파일명/함수명은 현재 골격에서 추측하지 않습니다.

## 5.1 `ac27a26affaa` — feat(decimal): 10진수 너비와 정렬 적용

- Importance: `B`
- Tags: `FORMAT, LAYOUT`
- Most Important Commits 목록: 미포함
- Thread 내 역할: Adds prefix-aware width and alignment to decimal output.
- Commit Classification summary: Builds decimal digit buffers and applies prefix-aware width and alignment.
- Importance 근거: The commit is necessary layout implementation but still local to decimal rendering and later consolidated.

### 학습 깊이
- 이 commit은 Thread 흐름에서 맡는 구현 역할과 필요한 state/code 변화에 집중합니다.
- 학습자 기록 — 직전 상태 대비 필요한 변화:
  - 직전 `src/ft_number.c`는 숫자를 역순 임시 배열에 만든 뒤 한 글자씩 바로 출력했고, 음수 부호도 digit 출력 전에 별도 `putchar`로 처리했습니다. 따라서 width가 부호를 포함한 전체 표현에 적용될 수 없었습니다.
- 학습자 기록 — 이 commit이 맡는 구현 책임:
  - decimal digit를 출력 순서의 buffer로 먼저 완성하고, 부호를 `prefix` 문자열로 취급해 `width - prefix_len - digit_len`만큼의 padding을 계산합니다.
- 학습자 기록 — 해당 SHA에서 확인한 핵심 상태/flow 변화:
  - `ft_decimal_digits`가 `reversed[20]`에서 `digits[20]`으로 순서를 뒤집어 반환합니다. `ft_write_decimal`은 right-aligned이면 spaces→prefix→digits, left-aligned이면 prefix→digits→spaces 순서로 shared output API를 호출합니다.
- 학습자 기록 — 이후 commit이 보강하거나 대체하는 부분:
  - `1fa064ca9d79`가 digit suppression, precision zero, field zero를 같은 함수에 추가합니다. `177c8d03b353`은 이 배치 책임을 decimal module에서 공통 numeric layout으로 옮깁니다.

### 해당 SHA에서 확인할 코드
- decimal conversion이 먼저 magnitude digits를 materialize하고 length를 결정한 뒤 layout을 수행하도록 바뀐 diff를 찾습니다.
- minus sign이 별도 preliminary write가 아니라 explicit prefix로 표현되는 지점을 확인합니다.
- width 계산에서 prefix length + digit length가 어떻게 반영되는지 기록합니다.
- right alignment와 left alignment에서 spaces가 complete signed representation 앞/뒤 어디에 배치되는지 확인합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `src/ft_number.c`: `ft_decimal_digits`, `ft_write_decimal`, `ft_printf_print_signed`, `ft_printf_print_unsigned`.
  - signed renderer는 negative value에 `"-"`, nonnegative value에 `""`를 전달합니다. 모든 실제 byte 출력은 `ft_printf_putnchar` 또는 `ft_printf_write`를 통과합니다.
- 학습자 기록 — 필요한 최소 코드 발췌:
```c
/* ac27a26affaa, src/ft_number.c, ft_write_decimal */
padding = fmt->width - prefix_len - digit_len;
if (!(fmt->flags & FT_FLAG_LEFT)
    && ft_printf_putnchar(ctx, ' ', padding) < 0)
    return (-1);
if (ft_printf_write(ctx, prefix, (size_t)prefix_len) < 0)
    return (-1);
if (ft_printf_write(ctx, digits, (size_t)digit_len) < 0)
    return (-1);
```

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - decimal value를 먼저 완전한 digit representation으로 만든 뒤 prefix를 포함해 field width를 계산한 commit입니다. 배치 규칙은 아직 decimal 내부 구현이며 precision과 zero padding은 다루지 않습니다.

## 5.2 `c5ef742b84de` — feat(hex): 16진수와 포인터 너비와 정렬 적용

- Importance: `B`
- Tags: `FORMAT, LAYOUT`
- Most Important Commits 목록: 미포함
- Thread 내 역할: Repeats the model for hexadecimal and pointer output.
- Commit Classification summary: Applies width and alignment to hexadecimal and pointer output.
- Importance 근거: This repeats the established layout model for another conversion family and is normal supporting work.

### 학습 깊이
- 이 commit은 Thread 흐름에서 맡는 구현 역할과 필요한 state/code 변화에 집중합니다.
- 학습자 기록 — 직전 상태 대비 필요한 변화:
  - hex는 digit를 역순 buffer에서 한 글자씩 출력했고 pointer는 먼저 `0x`를 써 버렸기 때문에 width가 prefix와 digits 전체에 적용되지 않았습니다.
- 학습자 기록 — 이 commit이 맡는 구현 책임:
  - `x`, `X`, `p` 모두 digit를 materialize하고 explicit prefix와 함께 하나의 field로 배치합니다. 대소문자는 base alphabet이, pointer 여부는 caller가 넘기는 `"0x"`가 결정합니다.
- 학습자 기록 — 해당 SHA에서 확인한 핵심 상태/flow 변화:
  - `ft_hex_digits`가 lowercase/uppercase alphabet으로 출력 순서의 digits를 만들고, `ft_write_hex`가 `prefix_len + digit_len`을 기준으로 leading/trailing spaces를 배치합니다.
- 학습자 기록 — 이후 commit이 보강하거나 대체하는 부분:
  - `1fa064ca9d79`에서 decimal과 같은 precision/zero 규칙이 복제됩니다. `c5f627099ad9`에서 `#` prefix가 값에 따라 선택되고, `177c8d03b353`에서 중복 배치가 제거됩니다.

### 해당 SHA에서 확인할 코드
- hex/pointer가 digit materialization 이후 prefix + digit length로 width를 계산하는 path를 추적합니다.
- `x`, `X`, `p`가 동일 placement logic을 공유하면서 digit alphabet과 pointer prefix responsibility를 분리하는 코드를 기록합니다.
- 직전 decimal layout과 비교하여 중복된 placement sequence를 구체적으로 표시합니다. 이 비교는 이후 `177c8d03b353`의 refactor 근거가 됩니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `src/ft_hex.c`: `ft_hex_digits`, `ft_write_hex`, `ft_printf_print_hex`, `ft_printf_print_pointer`.
  - decimal의 `ft_write_decimal`과 마찬가지로 prefix length를 순회해 구하고 `padding = width - prefix_len - digit_len`을 계산한 뒤 spaces/prefix/digits/spaces를 직접 호출합니다.
- 학습자 기록 — 필요한 최소 코드 발췌:
```c
/* c5ef742b84de, src/ft_hex.c, ft_write_hex */
if (fmt->spec == 'X')
    digit_len = ft_hex_digits(digits, number, "0123456789ABCDEF");
else
    digit_len = ft_hex_digits(digits, number, "0123456789abcdef");
prefix_len = 0;
while (prefix[prefix_len])
    prefix_len++;
padding = fmt->width - prefix_len - digit_len;
```

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - decimal에서 도입한 prefix-aware width/alignment 방식을 hex와 pointer에 반복 적용한 commit입니다. 기능은 완성되지만 동일한 placement sequence가 두 module에 중복된 상태가 됩니다.

## 5.3 `1fa064ca9d79` — feat(numeric): 숫자 정밀도와 0 채움 적용

- Importance: `A`
- Tags: `FORMAT, LAYOUT, RISK`
- Most Important Commits 목록: 미포함
- Thread 내 역할: Adds zero suppression, precision zeros, and zero-field padding rules.
- Commit Classification summary: Adds zero suppression, precision zeros, and zero-padding order for decimal and hexadecimal output.
- Importance 근거: The interaction among prefix, precision, field width, left alignment, and the zero flag is one of the formatter's hardest local correctness problems. It is significant, though the duplicated implementation is later centralized.

### 학습 깊이
- 이 commit은 주요 subsystem/boundary/failure path/integration point 수준으로 추적합니다.
- 학습자 기록 — 직전 상태와 문제:
  - width/alignment만으로는 `%.0d`, `%08d`, `%08.5d`를 구분할 수 없습니다. 특히 prefix를 field zero보다 먼저 출력해야 하고, 명시적 precision이 있으면 `0` flag를 field padding에 사용하면 안 됩니다.
- 학습자 기록 — 설계 판단 / boundary 변화:
  - decimal과 hex writer가 각각 `digit_len`, `prefix_len`, `zero_len`, `padding`, `pad_char`를 계산하고 같은 component 순서를 직접 구현합니다.
- 학습자 기록 — 핵심 state/invariant 변화:
  - zero value이면서 explicit precision이 0이면 effective `digit_len = 0`; precision이 digit보다 크면 `zero_len = precision - digit_len`; field width는 prefix, precision zeros, digits를 뺀 값입니다. field `0`은 LEFT가 없고 precision도 없을 때만 선택됩니다.
- 학습자 기록 — failure 또는 edge case:
  - prefix 뒤에 field zero가 와야 하는 signed/alternate form, zero digit suppression, precision이 `0` flag를 무효화하는 경우가 핵심입니다. 각 output call 실패는 즉시 `-1`로 반환됩니다.
- 학습자 기록 — 보장하는 것 / 보장하지 않는 것:
  - 보장: 이 SHA의 decimal/hex writer는 leading spaces→prefix→field zeros→precision zeros→digits→trailing spaces 순서를 유지합니다.
  - 미보장: 동일 규칙이 두 파일에 복제되어 있어 후속 수정 시 drift할 가능성이 남습니다. flag conflict와 `+`/space/`#` prefix 선택은 다음 commit 범위입니다.
- 학습자 기록 — 다음 관련 commit 연결:
  - `c5f627099ad9`가 canonical flags와 value-dependent prefix를 공급하고, `f276ee73087c`가 조합을 고정합니다. `177c8d03b353`은 중복 계산을 하나의 helper로 이동합니다.

### 해당 SHA에서 확인할 코드
- numeric layout에서 prefix bytes, precision zeroes, field padding, value digits를 각각 어떤 변수로 계산하는지 기록합니다.
- `has_precision`이 true일 때 field-level `0` flag가 억제되는 조건을 확인합니다.
- zero value + precision zero에서 effective digit count가 0이 되는 branch를 추적합니다.
- leading spaces → prefix → field zeroes → precision zeroes → digits → trailing spaces의 실제 emission call 순서를 기록합니다.
- decimal/hex가 같은 rule을 각자 구현하는 중복 지점을 표시하여 이후 shared layout과 비교합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `src/ft_number.c`의 `ft_write_decimal`과 `src/ft_hex.c`의 `ft_write_hex`에 사실상 같은 branch와 emission calls가 추가됩니다.
  - `ft_printf_putnchar`는 spaces/zeros를, `ft_printf_write`는 prefix/digits를 출력하므로 기존 shared count/error state는 우회하지 않습니다.
- 학습자 기록 — 필요한 최소 코드 발췌:
```c
/* 1fa064ca9d79, src/ft_number.c, ft_write_decimal */
if (fmt->has_precision && fmt->precision == 0 && number == 0)
    digit_len = 0;
prefix_len = 0;
while (prefix[prefix_len])
    prefix_len++;
zero_len = 0;
if (fmt->has_precision && fmt->precision > digit_len)
    zero_len = fmt->precision - digit_len;
padding = fmt->width - prefix_len - zero_len - digit_len;
pad_char = ' ';
if ((fmt->flags & FT_FLAG_ZERO) && !(fmt->flags & FT_FLAG_LEFT)
    && !fmt->has_precision)
    pad_char = '0';
```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전: width는 prefix와 raw digit length만 빼고 spaces로 채웠습니다.
  - 이후: effective digits, precision zeros, field padding을 별도 길이로 계산하며 field zero와 precision zero를 서로 다른 emission 단계로 둡니다.

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 숫자 field를 여섯 component로 분해해 precision과 zero padding의 precedence를 구현한 A-level commit입니다. 올바른 visible order를 만들지만 decimal과 hex에 같은 correctness logic이 중복됩니다.

## 5.4 `c5f627099ad9` — feat(flags): 숫자 플래그 우선순위 정규화

- Importance: `A`
- Tags: `PARSER, FORMAT, LAYOUT`
- Most Important Commits 목록: 미포함
- Thread 내 역할: Establishes prefix selection and flag precedence.
- Commit Classification summary: Normalizes conflicting flags and adds signed and alternate-form prefixes.
- Importance 근거: Resolving '-' over '0' and '+' over space at the parser boundary simplifies every renderer, while nonzero-only hexadecimal prefixes fix public semantics. This is significant cross-conversion judgment.

### 학습 깊이
- 이 commit은 주요 subsystem/boundary/failure path/integration point 수준으로 추적합니다.
- 학습자 기록 — 직전 상태와 문제:
  - parser가 LEFT+ZERO, PLUS+SPACE를 모두 보존해 renderer마다 precedence를 다시 판단해야 했고, signed positive prefix와 hex alternate prefix도 아직 선택되지 않았습니다.
- 학습자 기록 — 설계 판단 / boundary 변화:
  - parser가 한 field를 다 읽은 뒤 LEFT이면 ZERO를, PLUS이면 SPACE를 지웁니다. renderer는 canonical flags만 받고 값과 specifier에 따라 하나의 prefix 문자열을 고릅니다.
- 학습자 기록 — 핵심 state/invariant 변화:
  - signed는 negative `-`, otherwise PLUS `+`, SPACE ` `, none 순서입니다. hex는 HASH이면서 number가 0이 아닐 때만 specifier case에 맞는 `0x`/`0X`를 선택합니다.
- 학습자 기록 — failure 또는 edge case:
  - `%#x`의 zero에는 prefix가 없어야 하며, `%-05d`는 left-aligned space padding이어야 하고 `%+ d`는 plus만 남아야 합니다.
- 학습자 기록 — 보장하는 것 / 보장하지 않는 것:
  - 보장: renderer는 conflicting flag 조합을 받지 않고 prefix가 width/precision 계산 전에 명시됩니다.
  - 미보장: placement 계산은 여전히 decimal/hex 내부에 중복되어 있습니다. project-specific pointer precision 계약과 broad matrix는 후속 test에서 고정됩니다.
- 학습자 기록 — 다음 관련 commit 연결:
  - `f276ee73087c`가 prefix와 zero/precision 조합을 differential test로 고정하고, `177c8d03b353`가 선택된 prefix를 공통 layout input으로 받습니다.

### 해당 SHA에서 확인할 코드
- parse 이후 flag normalization이 수행되는 정확한 함수/위치를 찾습니다.
- left alignment가 `0` padding을 제거하고 explicit `+`가 space-sign request를 제거하는 bit mutation을 기록합니다.
- positive signed value의 prefix 선택(`+`, space, none)과 negative value의 `-` 유지 branch를 확인합니다.
- hex alternate form이 nonzero value에만 `0x`/`0X`를 추가하는 조건을 기록합니다.
- 이 normalized field/prefix decision이 decimal/hex shared layout 또는 각 renderer에 어떻게 전달되는지 caller/callee path로 기록합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `src/ft_parse.c`: `ft_normalize_flags`가 parse 종료 전에 bit를 제거합니다.
  - `src/ft_number.c`: `ft_printf_print_signed`가 value/sign flags로 prefix를 선택해 local decimal writer에 전달합니다.
  - `src/ft_hex.c`: `ft_printf_print_hex`가 HASH, nonzero value, `X` 여부로 prefix를 선택합니다. 이 SHA의 배치 대상은 아직 각 module의 local writer입니다.
- 학습자 기록 — 필요한 최소 코드 발췌:
```c
/* c5f627099ad9, src/ft_parse.c */
if (fmt->flags & FT_FLAG_LEFT)
    fmt->flags &= ~FT_FLAG_ZERO;
if (fmt->flags & FT_FLAG_PLUS)
    fmt->flags &= ~FT_FLAG_SPACE;
```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전: conflicting bits가 함께 남았고 numeric prefix는 negative sign/pointer를 제외하면 비어 있었습니다.
  - 이후: parser가 canonical state를 만들고 renderer가 signed/alternate prefix를 explicit string으로 배치 함수에 넘깁니다.

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - flag conflict를 parser에서 한 번 해소하고 prefix 선택을 value-aware renderer 책임으로 둔 commit입니다. 공통 layout 추출 전에 입력 상태를 정규화한 단계입니다.

## 5.5 `f276ee73087c` — test(numeric): 접두사와 정밀도 배치 회귀 검증

- Importance: `B`
- Tags: `FORMAT, TEST, EDGE`
- Most Important Commits 목록: 미포함
- Thread 내 역할: Locks down representative prefix, precision, zero, and left-alignment interactions.
- Commit Classification summary: Adds focused prefix, precision, zero, and alignment regression cases.
- Importance 근거: The cases protect tricky established layout semantics but do not introduce the shared layout mechanism.

### 학습 깊이
- 이 commit은 Thread 흐름에서 맡는 구현 역할과 필요한 state/code 변화에 집중합니다.
- 학습자 기록 — 직전 상태 대비 필요한 변화:
  - layout 구현은 존재했지만 sign/alternate prefix와 두 종류의 zero padding이 결합되는 대표 사례를 별도로 묶어 보호하지 않았습니다.
- 학습자 기록 — 이 commit이 맡는 구현 책임:
  - focused numeric cases를 `run_numeric_layout_cases`로 묶어 `snprintf` 결과와 return/byte sequence를 비교합니다.
- 학습자 기록 — 해당 SHA에서 확인한 핵심 상태/flow 변화:
  - `%+08d`, `%#08x`, `%-#10.4x`, `% 08.5d`, `%#.0x` 등의 포맷이 public `ft_printf`에서 당시 중복 decimal/hex writer까지 통과합니다.
- 학습자 기록 — 이후 commit이 보강하거나 대체하는 부분:
  - `177c8d03b353` 이후 동일 test가 shared helper refactor의 external behavior regression gate가 됩니다. `12d715eba77d`는 값을 배열로 순회하는 더 넓은 boundary matrix를 추가합니다.

### 해당 SHA에서 확인할 코드
- 각 regression case가 sign, alternate prefix, field zero, precision zero, left alignment 중 어떤 조합을 만드는지 표로 기록합니다.
- expected value가 `snprintf` differential인지 explicit expected output인지 test code에서 확인합니다.
- sign/`0x`가 zero padding 앞에 오는지, precision이 field `0`을 무효화하는지, zero hex + precision zero에서 alternate prefix가 사라지는지, trailing spaces가 complete prefixed value 밖에 오는지 assertion으로 연결합니다.
- 이 test가 shared layout 도입 전의 duplicated implementation을 검증하는지, 이후 같은 test가 regression gate로 남는지 기록합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `tests/test_ft_printf.c`: `run_numeric_layout_cases`, `EXPECT_PRINTF` macro, stdout capture/check helper.
  - 모든 추가 case는 explicit output이 아니라 `snprintf` differential입니다.
  - 조합 대응: `%+08d`=sign before field zeros, `%#08x`=`0x` before field zeros, `%-#10.4x`=prefix+precision zeros then trailing spaces, `% 08.5d`=precision disables field zero, `%#.0x` with zero=digits/prefix both absent.
- 학습자 기록 — 필요한 최소 코드 발췌:
```c
/* f276ee73087c, tests/test_ft_printf.c, run_numeric_layout_cases */
EXPECT_PRINTF("empty:'%#.0x' '%#.0X' '% .0d'", 0u, 0u, 0);
EXPECT_PRINTF("signed-zero:'%+08d'", 42);
EXPECT_PRINTF("hex-zero:'%#08x'", 42u);
EXPECT_PRINTF("hex-left-precision:'%-#10.4x'", 42u);
```

### Test commit 학습 기록
- production invariant 대상: numeric prefix와 field/precision zero, left alignment의 ordering
- 재현하는 failure / boundary: sign/`0x` 앞뒤 zero placement 오류, precision과 `0` 충돌, zero-precision alternate-form 오류, trailing-space 위치 오류
- test technique: `snprintf`와 focused differential regression cases
- 통과하는 production path: numeric conversion → 당시 decimal/hex placement implementation → shared output context
- 이 test가 source상 증명하려는 것: 대표적인 다중-flag 조합의 visible ordering이 intended semantics와 일치함
- 이 test가 증명하지 않는 것: 모든 값/format 조합이나 이후 shared-layout refactor의 내부 구조 자체를 증명하지 않습니다.
- 분류: focused deterministic regression입니다.
- 후속 회귀 방지 역할: layout 중앙화/수정 시 prefix–padding–precision 조합의 회귀를 막습니다.
- 학습자 기록 — 실제 test 함수/fixture/seam/assertion:
  - `EXPECT_PRINTF`는 `snprintf`로 expected bytes/return을 만들고 pipe로 `ft_printf` stdout을 캡처해 return, captured length, `memcmp`를 모두 확인합니다. `run_numeric_layout_cases`는 여섯 focused format을 이 fixture로 실행합니다.
- 학습자 기록 — 직접 실행했다면 command / 환경 / 결과:
  - command: 미실행
  - environment: 실행 가능한 exact checkout을 만들 수 없는 환경이어서 GitHub connector로 해당 SHA의 test와 production diff만 검사했습니다.
  - result: 실행 결과를 주장하지 않습니다. test mechanism과 대상 production branch만 코드로 확인했습니다.

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - shared layout 도입 전 중복 구현이 보여 주어야 할 핵심 ordering을 focused differential cases로 고정한 commit입니다. 이후 구조가 바뀌어도 동일 public bytes를 요구합니다.

## 5.6 `177c8d03b353` — refactor(output): 숫자 출력 배치 로직 통합

- Importance: `A`
- Tags: `ARCH, LAYOUT, REFACTOR`
- Most Important Commits 목록: 포함
- Thread 내 역할: Extracts one shared numeric layout writer for decimal, hexadecimal, and pointer conversions.
- Commit Classification summary: Extracts one numeric layout writer shared by decimal, hexadecimal, and pointer conversions.
- Importance 근거: Centralizing prefix, precision-zero, field-padding, and digit ordering removes duplicated correctness logic and creates one responsibility boundary later mirrored by measurement. This is a significant structural improvement, though not independently project-defining.

### 학습 깊이
- 이 commit은 주요 subsystem/boundary/failure path/integration point 수준으로 추적합니다.
- 학습자 기록 — 직전 상태와 문제:
  - `ft_write_decimal`과 `ft_write_hex`가 suppression, `zero_len`, `padding`, `pad_char`, 여섯 단계 emission과 실패 반환을 각각 보유했습니다. 어느 한쪽만 수정되면 visible semantics가 달라질 수 있었습니다.
- 학습자 기록 — 설계 판단 / boundary 변화:
  - 새 `src/ft_numeric_layout.c`의 `ft_printf_write_numeric_layout`이 normalized `fmt`, prefix, prepared digits, digit length, `is_zero`를 입력으로 받아 모든 placement를 소유합니다.
- 학습자 기록 — 핵심 state/invariant 변화:
  - decimal/hex/pointer가 같은 함수에서 zero suppression, precision zero, field padding과 output ordering을 수행합니다. 각 conversion은 value를 digits로 바꾸고 prefix/zero 사실만 제공합니다.
- 학습자 기록 — failure 또는 edge case:
  - helper의 각 `putnchar`/`write`가 실패하면 즉시 `-1`이므로 중간 실패 이후 후속 component가 출력되지 않습니다. 이미 accepted된 bytes는 rollback하지 않습니다.
- 학습자 기록 — 보장하는 것 / 보장하지 않는 것:
  - 보장: 세 numeric family의 layout 판단과 failure propagation이 한 구현을 공유합니다.
  - 미보장: digit conversion, signed magnitude portability, prefix selection은 각 renderer에 남고 measurement와 rendering 일치는 아직 별도 선검증 도입 전입니다.
- 학습자 기록 — 다음 관련 commit 연결:
  - `ed3750fd081a`가 layout 앞의 signed magnitude 변환을 수정합니다. 후속 `2d773acc5bd6` measurement는 동일 component length 계산을 mirror해야 하며, `12d715eba77d` matrix가 public semantics를 확대 검증합니다.

### 해당 SHA에서 확인할 코드
- parent SHA에서 decimal과 hex가 각각 갖고 있던 placement sequence를 나란히 비교합니다.
- `ft_printf_write_numeric_layout`의 실제 signature에서 prefix, prepared digits, digit length, zero-value fact, normalized field 중 어떤 정보가 전달되는지 기록합니다.
- shared helper가 effective digit length, precision zeroes, field padding, emission order, error propagation을 소유하는 코드 지점을 추적합니다.
- decimal/hex/pointer conversion 쪽에서 제거된 책임과 여전히 남은 responsibility를 diff로 구분합니다.
- 후속 measurement pass가 이 one layout model을 mirror해야 하는 이유를 실제 component 계산을 기준으로 메모합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `Makefile`: `src/ft_numeric_layout.c` 추가.
  - `src/ft_numeric_layout.c`: `ft_printf_write_numeric_layout`이 prefix length, suppression, precision zero, padding, emission을 담당합니다.
  - `src/ft_number.c`: decimal digits와 signed/unsigned prefix/magnitude 선택 후 helper 호출.
  - `src/ft_hex.c`: hex digits/alphabet, alternate/pointer prefix 선택 후 helper 호출.
  - `src/ft_printf_internal.h`: shared helper prototype.
- 학습자 기록 — 필요한 최소 코드 발췌:
```c
/* 177c8d03b353, src/ft_numeric_layout.c,
 * ft_printf_write_numeric_layout */
if (fmt->has_precision && fmt->precision == 0 && is_zero)
    digit_len = 0;
prefix_len = ft_prefix_length(prefix);
zero_len = 0;
if (fmt->has_precision && fmt->precision > digit_len)
    zero_len = fmt->precision - digit_len;
padding = fmt->width - prefix_len - zero_len - digit_len;
pad_char = ' ';
if ((fmt->flags & FT_FLAG_ZERO) && !(fmt->flags & FT_FLAG_LEFT)
    && !fmt->has_precision)
    pad_char = '0';
```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전: decimal/hex local writer가 각각 suppression부터 trailing spaces까지 전부 수행했습니다.
  - 이후: local writer 자체가 제거되고 conversion은 prepared representation을 공통 helper에 넘깁니다. 숫자 base 변환과 prefix 선택은 원래 module에 남습니다.

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 중복된 visible-layout correctness를 하나의 함수로 중앙화한 refactor입니다. 입력은 conversion-specific representation이고, 출력 component 계산·순서·실패 전파는 shared layout의 단일 책임이 됩니다.

## 5.7 `ed3750fd081a` — fix(decimal): INT_MIN 크기를 unsigned 범위에서 계산

- Importance: `A`
- Tags: `FORMAT, EDGE, RISK`
- Most Important Commits 목록: 미포함
- Thread 내 역할: Removes signed-overflow dependence when formatting `INT_MIN`.
- Commit Classification summary: Forms negative magnitude as -(value + 1) + 1 before unsigned conversion.
- Importance 근거: The correction removes signed-overflow dependence on platforms where long cannot represent -INT_MIN. It restores portable numeric correctness with a small but material fix.

### 학습 깊이
- 이 commit은 주요 subsystem/boundary/failure path/integration point 수준으로 추적합니다.
- 학습자 기록 — 직전 상태와 문제:
  - negative `int`를 `long`으로 옮긴 뒤 `-value`를 먼저 signed domain에서 계산했습니다. `long`과 `int`의 폭이 같은 data model에서는 `INT_MIN`의 양수 counterpart가 `long`에 표현되지 않습니다.
- 학습자 기록 — 설계 판단 / boundary 변화:
  - sign/prefix는 그대로 결정하되 magnitude만 `-(value + 1)`로 representable한 signed 값까지 계산한 후 `unsigned long`으로 바꾸고 마지막 1을 unsigned domain에서 더합니다.
- 학습자 기록 — 핵심 state/invariant 변화:
  - 모든 `int` negative endpoint의 magnitude가 signed overflow 없이 `unsigned long`에 형성됩니다. shared layout이 받는 digits/prefix interface는 바뀌지 않습니다.
- 학습자 기록 — failure 또는 edge case:
  - 위험 대상은 정확히 minimum signed value입니다. 일반 negative 값에서는 이전과 새 식이 같은 magnitude를 만듭니다.
- 학습자 기록 — 보장하는 것 / 보장하지 않는 것:
  - 보장: `int`와 `long`이 같은 폭인 구현에서도 `INT_MIN` magnitude 계산 자체가 unrepresentable signed positive value를 만들지 않습니다.
  - 미보장: 이 fix는 출력 retry, layout ordering, parser 또는 pointer conversion을 바꾸지 않습니다.
- 학습자 기록 — 다음 관련 commit 연결:
  - 기존 core suite의 `INT_MIN` case와 후속 sanitizer targets가 이 path를 통과할 수 있고, `12d715eba77d`의 signed matrix가 추가 조합을 보호합니다. 다만 이 commit에 전용 신규 test는 포함되지 않았습니다.

### 해당 SHA에서 확인할 코드
- fix 직전 signed negative magnitude 계산에서 `-value` 또는 equivalent positive counterpart가 어떤 signed type에서 형성되는지 확인합니다.
- `INT_MIN`의 positive counterpart가 같은 signed type에 representable하지 않을 수 있는 이유를 해당 platform-independent integer range로 설명합니다.
- fix SHA에서 `value + 1`을 먼저 negation하고 `unsigned long`으로 변환한 뒤 마지막 1을 unsigned domain에서 더하는 정확한 expression을 기록합니다.
- sign selection과 shared decimal layout은 바뀌지 않았는지 diff로 확인하여 fix scope를 분리합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `src/ft_number.c`, `ft_printf_print_signed`: negative branch가 `ft_write_decimal`에 넘기는 magnitude expression만 의미 있게 바뀝니다. prefix `"-"`, digit creation, `ft_printf_write_numeric_layout` 호출은 유지됩니다.
- 학습자 기록 — 필요한 최소 코드 발췌:
```c
/* ed3750fd081a, src/ft_number.c, ft_printf_print_signed */
if (value < 0)
    return (ft_write_decimal(ctx, fmt, "-",
            (unsigned long)(-(value + 1)) + 1));
```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전: `(unsigned long)(-value)`처럼 positive magnitude를 signed `long`에서 먼저 만들었습니다.
  - 이후: representable한 `-(value + 1)`까지만 signed로 계산하고 최종 `+ 1`은 unsigned arithmetic으로 수행합니다.

### Failure → Fix 추적
- 기존 가정/상태: negative `int`를 더 넓은 `long`으로 옮겨 negation하면 `INT_MIN` magnitude를 항상 안전하게 만들 수 있다는 assumption
- 실제 failure 또는 위험: `long`이 `int`보다 넓지 않은 data model에서는 positive counterpart가 signed type에 representable하지 않을 수 있음
- source가 지목한 root cause: signed domain에서 unrepresentable positive magnitude를 직접 형성하려는 계산
- 수정된 decision/invariant: `-(value + 1)`의 representable result를 unsigned로 변환하고 마지막 1을 unsigned domain에서 더함
- 학습자 기록 — 실제 수정 코드:
  - 실제 expression은 `(unsigned long)(-(value + 1)) + 1`입니다. cast 뒤의 `+ 1`은 usual arithmetic conversion에 따라 unsigned domain에서 수행됩니다.
- 학습자 기록 — regression test 연결:
  - 이 fix commit 자체에는 전용 test 추가가 없습니다. 이전 `1b8049e411bb`의 core `INT_MIN` differential case가 해당 path를 통과하고, 후속 `12d715eba77d` signed matrix와 `1b474fa2a5e3` sanitizer suite가 broader coverage를 제공합니다. 동일 폭 `int`/`long` 플랫폼 전용 실행 증거는 repository test code에서 확인되지 않았습니다.

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - layout이 아니라 value-to-magnitude boundary를 수정한 portability fix입니다. minimum signed value의 양수 counterpart를 signed domain에 만들지 않고 unsigned representation으로 넘긴 뒤 기존 shared layout을 그대로 사용합니다.

## 5.8 `12d715eba77d` — test(printf): 공개 계약 경계 사례 확대

- Importance: `A`
- Tags: `FORMAT, TEST, EDGE`
- Most Important Commits 목록: 미포함
- Thread 내 역할: Expands public boundary matrices for zero precision, prefixes, null pointers, and narrow fields.
- Commit Classification summary: Locks down zero precision, prefixes, null values, percent extensions, and width/precision boundary matrices.
- Importance 근거: Several expectations are deliberate project contracts rather than portable libc behavior. Fixing them explicitly is significant for preserving the library's actual public semantics.

### 학습 깊이
- 이 commit은 주요 subsystem/boundary/failure path/integration point 수준으로 추적합니다.
- 학습자 기록 — 직전 상태와 문제:
  - focused cases만으로는 width가 content와 같거나 작을 때, zero precision에서 value가 0/비0일 때, sign/hash가 있는 여러 value를 체계적으로 교차하지 못했습니다. null pointer/string과 formatted percent는 libc oracle에 맡길 수 없는 프로젝트 계약입니다.
- 학습자 기록 — 설계 판단 / boundary 변화:
  - signed, unsigned, hex에 format 배열×value 배열 differential matrix를 추가하고, null format/empty/null pointer/null string/percent는 explicit expected output으로 분리합니다.
- 학습자 기록 — 핵심 state/invariant 변화:
  - production code는 바뀌지 않습니다. tests가 shared layout의 suppression/prefix/precision/width semantics와 project-specific pointer representation을 public return/bytes 계약으로 고정합니다.
- 학습자 기록 — failure 또는 edge case:
  - `%.0p` null이 `"0x"`, `%8.4p` null이 `"  0x0000"`; `%#.0x` zero는 empty digits/prefix; narrow width는 content를 truncate하지 않고 padding만 0 이하가 됩니다. null string precision은 `(null)`을 같은 string 규칙으로 제한합니다.
- 학습자 기록 — 보장하는 것 / 보장하지 않는 것:
  - 보장: 명시된 matrices와 fixed cases에서 output bytes와 return count가 oracle/프로젝트 expectation과 같습니다.
  - 미보장: 모든 가능한 width/precision/value 조합, system-call fault behavior, archive ABI/dependency를 증명하지 않습니다.
- 학습자 기록 — 다음 관련 commit 연결:
  - 이 Thread의 마지막 test입니다. 이후 release/sanitizer verification은 같은 functional suite를 산출물·runtime 계층에서 다시 실행하지만 numeric contract 자체를 재정의하지 않습니다.

### 해당 SHA에서 확인할 코드
- precision zero, digit-count transition, signs, alternate prefix, content-width boundary에 대한 differential matrix를 찾아 입력 축과 expected oracle을 기록합니다.
- null format, empty format, null string, null pointer, formatted percent처럼 fixed project expectation으로 분리된 case를 식별합니다.
- 이 Thread 관점에서는 특히 null pointer의 `0x` prefix와 precision-zero digit suppression, width가 content보다 작은/큰 경우의 production layout path를 추적합니다.
- libc와 비교하지 않는 fixed expectation이 “왜 project contract인지” source description과 test implementation을 대응시킵니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `tests/test_ft_printf.c`: `run_signed_boundary_matrix`, `run_unsigned_boundary_matrix`, `run_hex_boundary_matrix`, `run_public_contract_boundary_cases`.
  - signed matrix: 12 formats×5 values; unsigned: 10×5; hex: 11×5를 `EXPECT_PRINTF`/`snprintf`와 비교합니다.
  - fixed `EXPECT_OUTPUT`은 null pointer/string과 `%` extension의 repository-defined bytes를 검사합니다. `EXPECT_FORMAT_ERROR(NULL)`은 public null-format failure를 검사합니다.
- 학습자 기록 — 필요한 최소 코드 발췌:
```c
/* 12d715eba77d, tests/test_ft_printf.c,
 * run_public_contract_boundary_cases */
EXPECT_OUTPUT("0x", "%.0p", (void *)0);
EXPECT_OUTPUT("      0x", "%8.0p", (void *)0);
EXPECT_OUTPUT("0x      ", "%-8.0p", (void *)0);
EXPECT_OUTPUT("  0x0000", "%8.4p", (void *)0);
```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전: 개별 focused/differential cases가 있었지만 systematic signed/unsigned/hex boundary cross-product와 fixed public-contract group은 없었습니다.
  - 이후: matrices가 shared numeric path를 넓게 반복하고 libc 비호환/비이식 expectation은 explicit bytes로 분리됩니다.

### Test commit 학습 기록
- production invariant 대상: public formatting boundary에서 zero precision, prefixes, null values, percent extension, width/precision edge semantics 유지
- 재현하는 failure / boundary: libc-comparable boundary interaction 오류 또는 project-specific null/pointer/percent semantics drift
- test technique: differential matrices + fixed project-specific expectations
- 통과하는 production path: public `ft_printf` → parser/dispatch → text 또는 numeric layout/output path
- 이 test가 source상 증명하려는 것: source에 명시된 public boundary cases가 byte/return contract대로 유지됨
- 이 test가 증명하지 않는 것: system-call retry state machine이나 archive symbol/dependency boundary까지 증명하지 않습니다.
- 분류: broad boundary regression이며 일부는 deterministic fixed-contract regression입니다.
- 후속 회귀 방지 역할: numeric/text edge semantics와 deliberate project extensions가 후속 refactor에서 libc behavior와 혼동되어 바뀌는 것을 막습니다.
- 학습자 기록 — 실제 test 함수/fixture/seam/assertion:
  - 세 matrix는 static format/value arrays의 모든 조합을 `EXPECT_PRINTF`로 실행합니다. fixed group은 null pointer의 `0x` 유지, precision zero digits suppression, width/alignment, null string truncation, percent width/precision extension을 `EXPECT_OUTPUT`으로 exact byte 비교합니다.
- 학습자 기록 — 직접 실행했다면 command / 환경 / 결과:
  - command: 미실행
  - environment: exact SHA checkout을 로컬에 구성할 수 없어 connector로 commit patch와 당시 test implementation을 검사했습니다.
  - result: runtime pass/fail을 기록하지 않았습니다.

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - libc와 비교 가능한 numeric 경계는 matrix로, repository가 의도적으로 정한 null pointer/string/percent semantics는 fixed expected bytes로 검증한 public-contract commit입니다.

## 6. Invariant ledger

Source가 확정한 변화 축을 아래에 배치했습니다. “실제 코드 근거”는 학습자가 해당 SHA를 읽고 채웁니다.

| Invariant / concern | 도입 또는 초기 상태 | 강화 / 수정 | 고정한 검증 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| width/alignment layout | `ac27a26affaa`에서 decimal에 도입 | `c5ef742b84de`에서 hex/pointer에 반복 | 중복의 실제 형태를 두 SHA에서 비교 | 두 local writer가 모두 `padding = width - prefix_len - digit_len`과 spaces→prefix→digits→spaces를 구현 |
| precision/zero composition | `1fa064ca9d79`에서 zero suppression, precision zeros, field-zero ordering 도입 | `c5f627099ad9`의 prefix/flag precedence와 결합 | `f276ee73087c`에서 대표 상호작용 회귀 검증 | local decimal/hex의 `digit_len`, `zero_len`, `padding`, `pad_char`; parser normalization과 renderer prefix; focused `EXPECT_PRINTF` cases |
| shared layout responsibility | `177c8d03b353`에서 공통 numeric layout writer로 중앙화 | decimal/hex/pointer가 prepared digits/prefix/zero fact를 공급 | `12d715eba77d`에서 boundary matrix로 public semantics 확대 검증 | `src/ft_numeric_layout.c` helper와 세 conversion caller; signed/unsigned/hex matrices 및 fixed null-pointer cases |
| signed endpoint portability | 초기 decimal magnitude는 `long`이 더 넓다는 가정에 의존 | `ed3750fd081a`에서 unsigned domain 계산으로 복구 | 학습자가 sanitizer/functional coverage와 연결 여부를 별도 기록 | `src/ft_number.c`의 `(unsigned long)(-(value + 1)) + 1`; 기존 INT_MIN functional case는 path를 통과하지만 same-width model 전용 test는 없음 |

### 학습자 추가 기록

- source가 명시한 invariant 범위 안에서만 필요한 행을 추가합니다. 새 invariant를 확정 사실처럼 만들지 않습니다.
- 추가 기록:
  - 추가 행은 만들지 않았습니다. measurement와 rendering의 길이 일치는 Thread 5의 preflight에서 별도로 추적합니다.

## 7. Failure → Fix → Test 연결

| 기존 failure / risk | Fix / change | 수정 decision | Test / 학습 확인 |
| --- | --- | --- | --- |
| decimal과 hex가 동일한 placement rule을 중복 구현하여 edge case drift 가능 | `177c8d03b353` | shared `ft_printf_write_numeric_layout`에 authoritative ordering 집중 | `12d715eba77d` 및 기존 focused regressions가 어떤 공통 path를 통과하는지 확인 |
| zero precision/prefix/zero-padding 조합이 순서를 깨뜨릴 위험 | `1fa064ca9d79` + `c5f627099ad9` | component count 분리 + normalized prefix/flag precedence | `f276ee73087c`와 `12d715eba77d`에서 서로 다른 범위로 검증 |
| `INT_MIN`을 signed type에서 직접 양수 magnitude로 만들 수 없는 portability 위험 | `ed3750fd081a` | `-(value + 1)`을 representable하게 계산한 뒤 unsigned로 전환하고 1을 더함 | 학습자가 해당 fix를 통과하는 endpoint test를 실제 suite에서 찾아 기록 |

- 학습자 기록 — 실제 failure branch와 regression assertion을 연결한 추가 설명:
  - `177c8d03b353` 이후 focused/matrix cases는 모두 한 helper의 component ordering을 통과합니다. zero+precision zero는 helper의 `digit_len = 0` branch와 `%#.0x`, `%1.0d/u` cases가 연결됩니다. signed minimum fix는 기존 core `INT_MIN` differential을 통과하지만 해당 portability data model을 강제하는 deterministic fixture는 없습니다.

## 8. Ownership / state / responsibility 변화

| 시점 | Source상 owner / boundary | Source상 responsibility 변화 | 해당 SHA 코드 근거 |
| --- | --- | --- | --- |
| 초기 decimal/hex renderer | 각 conversion module | digit 생성과 field placement를 함께 소유하여 유사 rule이 중복 | `src/ft_number.c::ft_write_decimal`과 `src/ft_hex.c::ft_write_hex`에 동일 length variables/emission branches 존재 |
| `177c8d03b353` 이후 | conversion module vs shared layout | conversion은 prefix/prepared digits/length/zero fact를 공급하고 shared layout이 suppression, precision, padding, ordering, failure propagation을 소유 | 두 renderer가 `ft_printf_write_numeric_layout`을 호출하고 새 `src/ft_numeric_layout.c`가 여섯 component와 return checks를 보유 |
| signed magnitude | decimal conversion | layout과 분리된 value-to-magnitude 경계에서 `INT_MIN` portability를 책임 | `src/ft_number.c::ft_printf_print_signed`가 prefix/magnitude를 정한 뒤 digits와 shared layout으로 넘기며 `ed3750fd081a`가 그 계산만 수정 |

## 9. Thread 최종 상태

- Source가 확정한 도달점: numeric placement가 하나의 shared layout invariant로 수렴하고, signed endpoint 및 project-specific pointer/precision boundary까지 후속 fix와 tests로 보강된 상태입니다.
- 학습자 기록 — 마지막 commit 기준 실제 코드에서 확인한 최종 state:
  - decimal/hex/pointer는 각자 typed value를 digits와 prefix로 변환한 뒤 `ft_printf_write_numeric_layout` 하나를 통과합니다. helper가 zero suppression, precision zeros, field padding, byte 순서와 실패 반환을 소유합니다. signed minimum magnitude는 unsigned-safe 식을 사용하며, public matrices/fixed cases가 대표 경계를 고정합니다.
- 학습자 기록 — 이 Thread 밖에서만 해결되는 남은 문제를 source 범위 안에서 구분:
  - measurement가 같은 effective length를 계산하고 전체 call을 선검증하는 문제는 Thread 5, write retry/count/signal은 Thread 1, archive와 sanitizer 실행 경계는 Thread 6의 범위입니다.

## 10. 최종 architecture 또는 execution flow 정리

실제 SHA 코드를 읽은 뒤 아래 흐름을 완성합니다. source 설명만 복사하지 말고 함수/상태/branch를 연결합니다.

```text
[ft_printf / ft_printf_dispatch]
    -> [decimal 또는 hex/pointer renderer가 typed value를 digits·prefix·is_zero로 변환]
    -> [ft_printf_write_numeric_layout가 suppression·zero_len·padding 계산]
    -> [spaces -> prefix -> field zeroes -> precision zeroes -> digits -> trailing spaces]
    -> [각 output 실패 시 -1, 성공 시 shared context count가 public return으로 전달]
```

- 각 단계에 대응하는 SHA / file / function:
  - `ac27a26affaa` `src/ft_number.c`, `c5ef742b84de` `src/ft_hex.c`에서 local field model이 시작됩니다. `1fa064ca9d79`가 precision/zero components를 추가하고 `177c8d03b353` `src/ft_numeric_layout.c`로 중앙화합니다. `ed3750fd081a`가 decimal magnitude를 고칩니다.
- 핵심 state transition:
  - raw numeric value→prepared digits/prefix/is_zero→effective digit suppression→precision/field padding lengths→순차 output calls입니다. prefix와 precision zero는 field zero와 서로 다른 component입니다.
- failure가 끊기는 지점:
  - shared layout의 각 `ft_printf_putnchar`/`ft_printf_write` 반환을 즉시 검사해 후속 component를 중단합니다. output context의 sticky error가 최종 public `-1`을 만듭니다.
- 후속 fix/test가 보장한 지점:
  - `ed3750fd081a`가 minimum signed magnitude 경계를 수정하고, `f276ee73087c`와 `12d715eba77d`가 focused ordering 및 broad/fixed public boundary를 각각 보호합니다.

## 11. 학습 완료 자가 점검

- [x] Commit map의 모든 SHA를 정확한 시점의 코드로 확인했습니다.
- [x] 각 commit의 subject, importance, tags를 source와 그대로 유지했습니다.
- [x] final HEAD의 코드를 과거 commit 설명에 소급 사용하지 않았습니다.
- [x] 필요한 parent/직전 관련 SHA 비교를 실제 diff로 수행했습니다.
- [x] source가 확정한 사실과 내가 코드에서 확인한 사실을 구분했습니다.
- [x] fix의 기존 가정 → failure/risk → root cause → decision → code → test 연결을 필요한 곳에서 완성했습니다.
- [x] test commit의 target invariant, technique, production path, proves/not-proves를 구분했습니다.
- [x] Invariant ledger에 실제 코드 근거를 채웠습니다.
- [x] 이 Thread의 최종 architecture/execution flow를 commit history 순서로 설명할 수 있습니다.
