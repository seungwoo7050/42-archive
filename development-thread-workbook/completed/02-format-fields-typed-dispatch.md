# From format fields to typed conversion dispatch

## 1. Thread 목표

raw format text를 `t_format`으로 정규화하고, main traversal, typed `va_arg` dispatch, conversion renderer 사이의 책임 경계가 형성되는 과정을 복원합니다.

### Source에서 확정된 significance

parsing, argument extraction, rendering이 분리된 책임이 됩니다. 정규화된 field가 각 conversion의 raw format 재해석을 막고, dispatch가 specifier별 정확한 promoted type 소비를 중앙화합니다. parser 단계의 flag normalization은 renderer가 처리해야 할 충돌 상태를 줄입니다.

### 이 Thread에 명시적으로 연결되는 source invariant / engineering difficulty

- Invariant: `t_format`은 parser에서 measurement와 rendering으로 전달되는 normalized field representation입니다.
- Invariant: variadic argument는 conversion이 정의한 promoted type과 호환되는 방식으로 소비되어야 합니다.
- Invariant: format grammar와 overflow behavior는 main loop, 이후 measurement, renderer 사이에서 일관되어야 합니다.
- Engineering difficulty: normalized field grammar와 overflow behavior를 여러 소비자 사이에서 일관되게 유지하고, specifier마다 정확한 promoted type을 소비하도록 책임을 분리하는 문제입니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- `t_format`에는 어떤 상태가 저장되고 omitted precision과 `.0`은 어떻게 구분되는가?
- parser는 field의 어느 부분까지 소비하고 main loop는 parser가 반환한 cursor를 어떻게 사용하는가?
- `va_arg`의 promoted type 선택은 왜 main loop가 아니라 dispatch가 소유하는가?
- decimal, hex, pointer conversion은 기존 parser/dispatch/output boundary 안에 어떻게 추가되는가?
- 충돌 flag를 한 번 정규화하면 renderer의 상태 공간이 어떻게 줄어드는가?

## 3. 완료 기준

- 해당 SHA의 실제 `t_format` field와 parser 흐름을 raw format grammar 순서대로 추적할 수 있습니다.
- main traversal, parser, dispatch, renderer의 caller/callee 관계를 실제 함수명으로 그릴 수 있습니다.
- 각 specifier가 어떤 promoted type으로 `va_arg`를 소비하는지 해당 dispatch 코드에서 확인해 기록할 수 있습니다.
- `-`/`0`, `+`/space 충돌과 signed/alternate prefix 선택이 어느 책임 경계에서 해결되는지 설명할 수 있습니다.

## 4. Commit map

| SHA | Subject | Importance | Tags | Source-defined role |
| --- | --- | --- | --- | --- |
| `7984ddf2dd57` | feat(parser): 포맷 필드 모델과 해석기 추가 | `S` | `ARCH, PARSER, CORE` | Establishes the normalized `t_format` representation and overflow-checked field parser. |
| `9e6d785628f3` | feat(core): 포맷 필드 해석을 출력 루프에 연결 | `B` | `PARSER, INTEGRATION` | Connects field parsing to the main format traversal. |
| `03c3e6e09fa1` | feat(text): 문자·문자열·퍼센트 변환 추가 | `A` | `ARCH, FORMAT, VARARGS` | Introduces a dispatcher that owns `va_arg` type selection and routes to conversion renderers. |
| `95d6613a1c72` | feat(decimal): 부호 있는·없는 10진수 출력 추가 | `B` | `FORMAT, VARARGS` | Adds signed and unsigned decimal conversions inside that boundary. |
| `93c883070a1b` | feat(hex): 16진수와 포인터 출력 추가 | `B` | `FORMAT, VARARGS` | Adds hexadecimal and pointer conversions inside the same boundary. |
| `c5f627099ad9` | feat(flags): 숫자 플래그 우선순위 정규화 | `A` | `PARSER, FORMAT, LAYOUT` | Normalizes conflicting flags once and applies signed and alternate-form prefixes. |

## 5. Commit별 학습 기록

> 원칙: 아래 기록은 final HEAD가 아니라 각 항목의 정확한 SHA에서 작성합니다. source가 확정하지 않은 파일명/함수명은 현재 골격에서 추측하지 않습니다.

## 5.1 `7984ddf2dd57` — feat(parser): 포맷 필드 모델과 해석기 추가

- Importance: `S`
- Tags: `ARCH, PARSER, CORE`
- Most Important Commits 목록: 포함
- Thread 내 역할: Establishes the normalized `t_format` representation and overflow-checked field parser.
- Commit Classification summary: Defines t_format and parses flags, width, precision, and specifiers with decimal overflow checks.
- Importance 근거: The parser creates the durable representation through which all conversions and both later passes communicate. It is indispensable to explaining the formatter's grammar and field-processing architecture.

### 학습 깊이
- 이 commit은 architecture/invariant의 핵심으로 취급합니다.
- 학습자 기록 — 직전 상태:
  - main loop는 literal과 `%%`만 직접 구분했으며, `%` 뒤의 flags/width/precision/specifier를 표현하는 공통 상태가 없었습니다.
- 학습자 기록 — 해결하려던 문제:
  - 각 conversion이 raw format을 다시 읽지 않도록 한 field를 한 번 해석해 전달하고, decimal field가 `int` 범위를 넘는 경우 cursor/state가 잘못 진행되지 않도록 해야 했습니다.
- 학습자 기록 — 기존 설계가 충분하지 않았던 이유:
  - raw cursor만으로는 omitted precision과 `.0`을 구분할 수 없고, 이후 renderer와 measurement가 같은 grammar를 재구현하면 서로 다른 결과와 다른 argument consumption이 생길 수 있습니다.
- 학습자 기록 — 선택한 핵심 decision:
  - private `t_format`에 `flags`, `width`, `precision`, `has_precision`, `spec`를 저장하고 `ft_printf_parse`가 flags→width→optional precision→specifier 순서로 한 field를 소비한 뒤 next cursor를 반환하도록 했습니다.
- 학습자 기록 — ownership / lifecycle / state transition:
  - caller가 stack `t_format`을 넘기고 parser가 먼저 zero/default state로 초기화합니다. flag는 OR로 누적되고, `.`를 만나면 값이 0이어도 `has_precision = 1`이 됩니다. parse 성공 시 `spec`와 next unread pointer가 확정됩니다.
- 학습자 기록 — failure scenario와 public consequence:
  - width 또는 precision 누적 전에 `value > (INT_MAX - digit) / 10`이면 parser가 null을 반환합니다. 이 SHA에서는 parser가 아직 public loop에 연결되지 않아 public consequence는 다음 integration commit에서 생깁니다.
- 학습자 기록 — 이 SHA가 보장하는 것:
  - parser API를 사용하는 caller는 repeated flags를 idempotent bit set으로 받고, omitted precision과 explicit zero를 구분하며, field integer overflow를 검출할 수 있습니다.
- 학습자 기록 — 아직 보장하지 않는 것:
  - main traversal integration, supported-specifier validation, flag conflict normalization, typed `va_arg` dispatch는 아직 없습니다.
- 학습자 기록 — 후속 fix/test로 이어지는 지점:
  - `9e6d785628f3`이 cursor/error를 main loop에 연결하고, `03c3e6e09fa1`이 dispatch를 추가합니다. `c5f627099ad9`이 parsed flag를 canonicalize하며, Thread 5의 preflight가 동일 parser를 measurement에도 사용합니다.

### 해당 SHA에서 확인할 코드
- 해당 SHA의 `t_format` 정의에서 flag bit set, width, precision value, `has_precision`, specifier에 대응하는 실제 field를 기록합니다.
- parser가 flags → width → optional precision → specifier 순서로 cursor를 이동하는 실제 함수 호출 흐름을 추적합니다.
- repeated flag가 bitwise OR로 idempotent하게 누적되는 지점을 확인합니다.
- width/precision decimal parsing에서 multiply/add 전에 `INT_MAX` overflow를 차단하는 조건식을 기록합니다.
- precision omitted와 `.0`을 `has_precision`로 구분하는 state transition을 확인합니다.
- parser가 반환하는 next unread position을 caller가 아직 사용하지 않는 이 SHA의 boundary와, 직후 `9e6d785628f3`에서의 integration을 비교할 준비를 합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `src/ft_printf_internal.h`: flag constants와 `t_format` 다섯 field, parser declarations.
  - `src/ft_parse.c`: `ft_flag_value`, decimal parser, `ft_printf_init_format`, `ft_printf_parse`. `while (ft_flag_value(*format))`에서 repeated flag를 OR하고, decimal helper를 width와 precision에 재사용합니다.
  - `Makefile`: `src/ft_parse.c`를 archive source에 추가하지만 `src/ft_printf.c`는 이 commit에서 parser를 호출하지 않습니다.
- 학습자 기록 — 필요한 최소 코드 발췌:
```c
/* 7984ddf2dd57, src/ft_parse.c, ft_parse_decimal */
while (ft_is_digit(**format))
{
    digit = **format - '0';
    if (*value > (INT_MAX - digit) / 10)
        return (-1);
    *value = *value * 10 + digit;
    (*format)++;
}
```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전: `src/ft_printf.c`가 raw `%`/`%%` branch만 가졌고 field state가 없었습니다.
  - 이후: 별도 parser module과 normalized `t_format`이 생겼지만 public traversal은 아직 기존 동작을 유지합니다.

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - formatter grammar의 공통 데이터 모델을 만든 S-level commit입니다. 한 field의 raw bytes를 bounded integer와 명시적 optional-precision 상태로 변환하지만, 이 시점에는 독립 모듈 도입 단계라 public 출력 경로를 아직 바꾸지 않습니다.

## 5.2 `9e6d785628f3` — feat(core): 포맷 필드 해석을 출력 루프에 연결

- Importance: `B`
- Tags: `PARSER, INTEGRATION`
- Most Important Commits 목록: 미포함
- Thread 내 역할: Connects field parsing to the main format traversal.
- Commit Classification summary: Connects parsed fields to the main traversal with temporary fallback output.
- Importance 근거: This is normal integration of the parser into the loop; actual conversion responsibility and final invalid-format policy are established later.

### 학습 깊이
- 이 commit은 Thread 흐름에서 맡는 구현 역할과 필요한 state/code 변화에 집중합니다.
- 학습자 기록 — 직전 상태 대비 필요한 변화:
  - parser가 archive에는 들어갔지만 호출되지 않아 normalized field와 overflow failure가 public behavior에 영향을 주지 않았습니다.
- 학습자 기록 — 이 commit이 맡는 구현 책임:
  - `%`를 만난 main loop가 `ft_printf_parse(format + 1, &fmt)`를 호출하고, 성공 시 반환 cursor를 다음 traversal 위치로 사용합니다.
- 학습자 기록 — 해당 SHA에서 확인한 핵심 상태/flow 변화:
  - null parser result는 `ctx.error = 1` 후 loop를 중단합니다. 성공 field는 임시 fallback으로 `%`와 specifier를 다시 출력하며, 기존 special `%%` branch는 parser보다 먼저 처리됩니다.
- 학습자 기록 — 이후 commit이 보강하거나 대체하는 부분:
  - temporary echo는 `03c3e6e09fa1`의 typed dispatch로 대체됩니다. unsupported/trailing field를 whole-call no-output error로 확정하는 정책은 Thread 5의 preflight 이전에는 없습니다.

### 해당 SHA에서 확인할 코드
- main loop가 `%` field를 parser에 넘기고 parser가 반환한 cursor로 traversal을 전진시키는 지점을 기록합니다.
- parse failure가 output context의 sticky error로 승격되는 path를 확인합니다.
- dedicated dispatch가 아직 없기 때문에 temporary rendering이 percent와 available specifier를 echo하는 코드를 찾고, 무엇이 아직 final syntax policy가 아닌지 기록합니다.
- parser와 main loop의 responsibility를 “field consumption”과 “overall sequencing/termination”으로 실제 code boundary에 대응시킵니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `src/ft_printf.c`, `ft_printf`: `t_format fmt`; `%` branch에서 parser 호출, null이면 `ctx.error = 1`; 성공하면 `format`을 returned pointer로 바꾸고 `%`/`fmt.spec`를 shared output으로 임시 출력합니다.
- 학습자 기록 — 필요한 최소 코드 발췌:
```c
/* 9e6d785628f3, src/ft_printf.c */
format = ft_printf_parse(format + 1, &fmt);
if (format == 0)
{
    ctx.error = 1;
    break ;
}
```

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - parser를 main sequencing에 연결한 integration commit입니다. parser가 한 field의 소비 범위와 실패를 결정하고 main loop는 반환 cursor와 sticky error를 관리하지만, conversion semantics는 아직 echo fallback뿐입니다.

## 5.3 `03c3e6e09fa1` — feat(text): 문자·문자열·퍼센트 변환 추가

- Importance: `A`
- Tags: `ARCH, FORMAT, VARARGS`
- Most Important Commits 목록: 미포함
- Thread 내 역할: Introduces a dispatcher that owns `va_arg` type selection and routes to conversion renderers.
- Commit Classification summary: Introduces conversion dispatch and concrete c, s, and percent renderers.
- Importance 근거: Separating va_arg selection from rendering becomes the integration boundary used by every later conversion. It is significant architecture, though subordinate to the parser and two-pass core.

### 학습 깊이
- 이 commit은 주요 subsystem/boundary/failure path/integration point 수준으로 추적합니다.
- 학습자 기록 — 직전 상태와 문제:
  - main loop가 parsed specifier를 직접 echo했고, 어떤 specifier가 argument를 어떤 type으로 소비하는지 소유하는 경계가 없었습니다.
- 학습자 기록 — 설계 판단 / boundary 변화:
  - `ft_printf_dispatch(ctx, fmt, va_list *)`가 specifier selection과 `va_arg`를 소유하고, text renderer는 이미 추출된 값과 normalized field만 받도록 분리했습니다.
- 학습자 기록 — 핵심 state/invariant 변화:
  - `c`는 default promotion에 맞춰 `int`, `s`는 `char *`를 소비하고 `%`는 argument를 소비하지 않습니다. renderer는 모두 같은 output context를 사용합니다.
- 학습자 기록 — failure 또는 edge case:
  - null string은 renderer에서 `(null)`로 치환됩니다. unknown/trailing specifier는 아직 `%`와 spec을 literal로 쓰는 fallback이므로 final validity rejection은 아닙니다.
- 학습자 기록 — 보장하는 것 / 보장하지 않는 것:
  - 보장: 지원된 text conversion의 type extraction과 rendering 책임이 분리되고 main entry에는 type-specific `va_arg`가 남지 않습니다.
  - 미보장: decimal/hex/pointer, width/precision layout 전체, unsupported syntax의 whole-call rejection은 아직 없습니다.
- 학습자 기록 — 다음 관련 commit 연결:
  - `95d6613a1c72`와 `93c883070a1b`이 같은 dispatch boundary에 numeric types를 추가하고, 후속 text/layout commits가 renderer semantics를 확장합니다.

### 해당 SHA에서 확인할 코드
- conversion dispatcher의 실제 함수와 main loop call site를 찾습니다.
- `c`, `s`, `%` 각각에서 `va_arg` 수행 여부를 확인하고, argument를 소비하는 경우 어떤 promoted type/argument form으로 renderer에 전달되는지 기록합니다.
- null string이 `(null)` representation으로 mapping되는 branch와 shared output path를 확인합니다.
- unknown field가 아직 prior literal fallback을 유지하는 branch를 찾아 final syntax validation이 아직 아님을 기록합니다.
- entry point에 type-specific `va_arg`가 남아 있는지 diff로 확인합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `src/ft_printf.c`: parse 성공 뒤 `ft_printf_dispatch(&ctx, &fmt, &args)`만 호출합니다.
  - `src/ft_dispatch.c`: `c`, `s`, `%`, fallback branches와 두 `va_arg` call.
  - `src/ft_text.c`: `ft_printf_print_char`, `ft_printf_print_string`, `ft_printf_print_percent`; null string mapping 및 shared write.
- 학습자 기록 — 필요한 최소 코드 발췌:
```c
/* 03c3e6e09fa1, src/ft_dispatch.c */
if (fmt->spec == 'c')
    return (ft_printf_print_char(ctx, fmt, va_arg(*args, int)));
if (fmt->spec == 's')
    return (ft_printf_print_string(ctx, fmt, va_arg(*args, char *)));
if (fmt->spec == '%')
    return (ft_printf_print_percent(ctx, fmt));
```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전: `ft_printf`가 parsed field를 `%`와 specifier로 직접 출력했습니다.
  - 이후: main은 dispatcher만 호출하고, dispatcher가 promoted type을 추출해 conversion renderer로 전달합니다.

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - variadic extraction을 conversion routing 지점에 중앙화한 A-level boundary commit입니다. parser는 field를 만들고, dispatch는 type을 소비하며, renderer는 값 표현과 output만 처리하는 기본 분리가 이때 성립합니다.

## 5.4 `95d6613a1c72` — feat(decimal): 부호 있는·없는 10진수 출력 추가

- Importance: `B`
- Tags: `FORMAT, VARARGS`
- Most Important Commits 목록: 미포함
- Thread 내 역할: Adds signed and unsigned decimal conversions inside that boundary.
- Commit Classification summary: Adds d, i, and u dispatch and decimal digit emission.
- Importance 근거: This is normal core-feature implementation within the established dispatch and output model.

### 학습 깊이
- 이 commit은 Thread 흐름에서 맡는 구현 역할과 필요한 state/code 변화에 집중합니다.
- 학습자 기록 — 직전 상태 대비 필요한 변화:
  - dispatch와 text conversions만 있어 `d`, `i`, `u`가 fallback으로 처리됐고 numeric argument를 올바른 type으로 소비하지 않았습니다.
- 학습자 기록 — 이 commit이 맡는 구현 책임:
  - dispatch에 signed `int`와 `unsigned int` extraction을 추가하고, 공통 unsigned decimal digit routine으로 값을 출력합니다.
- 학습자 기록 — 해당 SHA에서 확인한 핵심 상태/flow 변화:
  - local fixed buffer에 least-significant digit부터 저장한 뒤 index를 역방향으로 `ft_printf_putchar`에 넘깁니다. signed renderer는 negative sign을 먼저 쓰고 magnitude를 unsigned routine에 전달합니다.
- 학습자 기록 — 이후 commit이 보강하거나 대체하는 부분:
  - width/prefix/layout은 후속 commits에서 sign을 prefix representation으로 바꾸며, `ed3750fd081a`가 `INT_MIN` magnitude 계산의 `long` width 가정을 제거합니다.

### 해당 SHA에서 확인할 코드
- dispatch에 `d`, `i`, `u` case가 추가되는 위치와 각 `va_arg` type을 확인합니다.
- 하나의 unsigned digit routine이 signed magnitude와 unsigned value 모두에 사용되는 caller/callee 관계를 기록합니다.
- least-significant-first로 fixed local buffer에 digits를 만든 뒤 reverse emission하는 loop를 추적합니다.
- negative `int`를 `long`으로 widen한 뒤 negation하는 magnitude path와 sign emission 분리를 확인합니다.
- 이 시점의 `INT_MIN` 처리에 `long`이 `int`보다 넓다는 portability assumption이 남아 있음을 코드와 type model로 기록합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `src/ft_dispatch.c`: `d`/`i`에서 `va_arg(*args, int)`, `u`에서 `va_arg(*args, unsigned int)`.
  - `src/ft_number.c`: unsigned digit helper, `ft_printf_print_signed`, `ft_printf_print_unsigned`. negative path는 `(long)number`, `-value`를 사용합니다.
- 학습자 기록 — 필요한 최소 코드 발췌:
```c
/* 95d6613a1c72, src/ft_number.c */
value = (long)number;
if (value < 0)
{
    if (ft_printf_putchar(ctx, '-') < 0)
        return (-1);
    value = -value;
}
return (ft_print_unsigned_digits(ctx, (unsigned long)value));
```

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - established dispatch/output 경계 안에 decimal conversion을 추가한 구현 commit입니다. type extraction은 정확하지만, `long`이 `int`보다 넓지 않은 구현에서는 `INT_MIN` negation이 안전하지 않다는 후속 portability 과제가 남습니다.

## 5.5 `93c883070a1b` — feat(hex): 16진수와 포인터 출력 추가

- Importance: `B`
- Tags: `FORMAT, VARARGS`
- Most Important Commits 목록: 미포함
- Thread 내 역할: Adds hexadecimal and pointer conversions inside the same boundary.
- Commit Classification summary: Adds x, X, and p formatting with uintptr_t conversion.
- Importance 근거: The feature completes the base conversion set but follows existing dispatch and output boundaries.

### 학습 깊이
- 이 commit은 Thread 흐름에서 맡는 구현 역할과 필요한 state/code 변화에 집중합니다.
- 학습자 기록 — 직전 상태 대비 필요한 변화:
  - `x`, `X`, `p`가 지원되지 않았고, unsigned integer와 pointer를 base 16 representation으로 변환하는 renderer가 없었습니다.
- 학습자 기록 — 이 commit이 맡는 구현 책임:
  - dispatch가 `x`/`X`의 `unsigned int`, `p`의 `void *`를 소비하고, hex renderer가 alphabet과 pointer prefix를 처리합니다.
- 학습자 기록 — 해당 SHA에서 확인한 핵심 상태/flow 변화:
  - hex digits는 fixed buffer에 reverse order로 생성됩니다. `X`는 uppercase alphabet을 선택하고, pointer는 `void * → uintptr_t → unsigned long` 변환 후 `0x`를 먼저 출력합니다.
- 학습자 기록 — 이후 commit이 보강하거나 대체하는 부분:
  - width/precision와 prefix placement는 후속 numeric layout commits에서 통합되고, alternate `#` prefix는 `c5f627099ad9`에서 nonzero 조건과 함께 추가됩니다.

### 해당 SHA에서 확인할 코드
- dispatch의 `x`, `X`, `p` case와 specifier별 `va_arg` type을 기록합니다.
- base-16 routine이 lowercase/uppercase digit alphabet을 선택하는 지점을 확인합니다.
- pointer가 `uintptr_t`로 conversion된 뒤 numeric formatting으로 넘어가는 경로를 추적합니다.
- `0x` prefix가 address digits와 별도 representation으로 출력되는 코드와 이후 width/padding에 사용할 수 있는 boundary를 기록합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `src/ft_dispatch.c`: `x`/`X`는 `unsigned int`, `p`는 `void *`를 `va_arg`로 소비합니다.
  - `src/ft_hex.c`: hex digit routine, `ft_printf_print_hex`, `ft_printf_print_pointer`; pointer cast는 `(unsigned long)(uintptr_t)pointer`입니다.
- 학습자 기록 — 필요한 최소 코드 발췌:
```c
/* 93c883070a1b, src/ft_dispatch.c */
if (fmt->spec == 'x' || fmt->spec == 'X')
    return (ft_printf_print_hex(ctx, fmt,
            va_arg(*args, unsigned int)));
if (fmt->spec == 'p')
    return (ft_printf_print_pointer(ctx, fmt,
            va_arg(*args, void *)));
```

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 같은 typed dispatch boundary를 hex와 pointer로 확장한 commit입니다. pointer는 `uintptr_t`를 거쳐 정수 representation으로 바뀌고, prefix와 digit alphabet은 renderer가 소유합니다.

## 5.6 `c5f627099ad9` — feat(flags): 숫자 플래그 우선순위 정규화

- Importance: `A`
- Tags: `PARSER, FORMAT, LAYOUT`
- Most Important Commits 목록: 미포함
- Thread 내 역할: Normalizes conflicting flags once and applies signed and alternate-form prefixes.
- Commit Classification summary: Normalizes conflicting flags and adds signed and alternate-form prefixes.
- Importance 근거: Resolving '-' over '0' and '+' over space at the parser boundary simplifies every renderer, while nonzero-only hexadecimal prefixes fix public semantics. This is significant cross-conversion judgment.

### 학습 깊이
- 이 commit은 주요 subsystem/boundary/failure path/integration point 수준으로 추적합니다.
- 학습자 기록 — 직전 상태와 문제:
  - parser는 raw flags를 모두 보존하여 `-`와 `0`, `+`와 space가 동시에 설정될 수 있었고, renderer마다 충돌 우선순위를 다시 판단해야 했습니다. positive sign/alternate prefix도 없었습니다.
- 학습자 기록 — 설계 판단 / boundary 변화:
  - parse 완료 직후 한 번 flag bit를 canonicalize하고, numeric renderer는 canonical flags에서 prefix string만 선택합니다.
- 학습자 기록 — 핵심 state/invariant 변화:
  - `LEFT`가 있으면 `ZERO` bit를 제거하고 `PLUS`가 있으면 `SPACE` bit를 제거합니다. signed positive는 `+`/space/empty 중 하나, negative는 `-`; hex `#`는 nonzero일 때만 case에 맞는 prefix를 선택합니다.
- 학습자 기록 — failure 또는 edge case:
  - repeated flags는 기존 OR semantics를 유지합니다. zero hex에서 alternate prefix가 생기지 않으며, negative signed 값은 plus/space 요청보다 `-`가 우선합니다.
- 학습자 기록 — 보장하는 것 / 보장하지 않는 것:
  - 보장: renderer가 `LEFT|ZERO` 또는 `PLUS|SPACE` 충돌을 받지 않고, signed/hex prefix 선택이 conversion value와 normalized flags에 맞습니다.
  - 미보장: precision과 zero padding의 전체 배치, zero-value suppression, shared layout 중복 제거는 이후 Thread 3에서 해결됩니다.
- 학습자 기록 — 다음 관련 commit 연결:
  - `1fa064ca9d79`가 precision/zero layout과 prefix 순서를 구현하고 `177c8d03b353`이 decimal/hex 배치 코드를 공유 helper로 통합합니다.

### 해당 SHA에서 확인할 코드
- parse 이후 flag normalization이 수행되는 정확한 함수/위치를 찾습니다.
- left alignment가 `0` padding을 제거하고 explicit `+`가 space-sign request를 제거하는 bit mutation을 기록합니다.
- positive signed value의 prefix 선택(`+`, space, none)과 negative value의 `-` 유지 branch를 확인합니다.
- hex alternate form이 nonzero value에만 `0x`/`0X`를 추가하는 조건을 기록합니다.
- 이 normalized field/prefix decision이 decimal/hex shared layout 또는 각 renderer에 어떻게 전달되는지 caller/callee path로 기록합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `src/ft_parse.c`: parse 끝에서 호출되는 `ft_normalize_flags`; bit clear operations.
  - `src/ft_number.c`: signed renderer가 negative/plus/space/none prefix를 선택합니다.
  - `src/ft_hex.c`: hash와 `number != 0`, `X` 여부에 따라 `0X`/`0x`/empty를 선택합니다. 이 SHA에는 아직 shared layout helper가 없고 각 renderer의 기존 output path로 전달됩니다.
- 학습자 기록 — 필요한 최소 코드 발췌:
```c
/* c5f627099ad9, src/ft_parse.c */
if (fmt->flags & FT_FLAG_LEFT)
    fmt->flags &= ~FT_FLAG_ZERO;
if (fmt->flags & FT_FLAG_PLUS)
    fmt->flags &= ~FT_FLAG_SPACE;
```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전: parser가 충돌 flag bit를 그대로 넘겼고 signed/hex prefix가 없었습니다.
  - 이후: parser가 canonical flag set을 만들고 renderer가 value-dependent prefix string을 선택합니다.

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 여러 renderer에 흩어질 우선순위 판단을 parser boundary에서 한 번 끝내고, 숫자 prefix semantics를 추가한 cross-conversion commit입니다. 이후 layout은 충돌하지 않는 flag와 이미 결정된 prefix를 입력으로 받을 수 있습니다.

## 6. Invariant ledger

Source가 확정한 변화 축을 아래에 배치했습니다. “실제 코드 근거”는 학습자가 해당 SHA를 읽고 채웁니다.

| Invariant / concern | 도입 또는 초기 상태 | 강화 / 수정 | 고정한 검증 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| field representation | `7984ddf2dd57`에서 `t_format` 도입 | `9e6d785628f3`에서 main traversal과 연결 | 이후 dispatch/rendering이 raw text 대신 normalized field 사용 | `src/ft_printf_internal.h`의 다섯 field; `ft_printf_parse` 반환 cursor; main의 `t_format fmt`와 dispatch 전달 |
| argument extraction | `03c3e6e09fa1`에서 dispatch가 `va_arg` type selection 소유 | `95d6613a1c72`와 `93c883070a1b`에서 decimal/hex/pointer로 확대 | 학습자가 specifier별 정확한 promoted type을 코드에서 기록 | `c:int`, `s:char *`, `d/i:int`, `u/x/X:unsigned int`, `p:void *`, `%`: no argument가 모두 `src/ft_dispatch.c`에 위치 |
| flag conflict states | parser가 flag bit를 idempotent하게 수집 | `c5f627099ad9`에서 conflicting flag normalization 추가 | renderer가 canonical flag set을 받는지 실제 호출 흐름으로 확인 | parser 끝의 LEFT→clear ZERO, PLUS→clear SPACE; main은 같은 `fmt`를 dispatch에 넘기고 numeric renderer가 prefix를 선택 |

### 학습자 추가 기록

- source가 명시한 invariant 범위 안에서만 필요한 행을 추가합니다. 새 invariant를 확정 사실처럼 만들지 않습니다.
- 추가 기록:
  - 추가 행은 만들지 않았습니다. overflow는 field representation 행의 parser 근거와 Failure 표에서 구체화했습니다.

## 7. Failure → Fix → Test 연결

| 기존 failure / risk | Fix / change | 수정 decision | Test / 학습 확인 |
| --- | --- | --- | --- |
| width/precision decimal accumulation overflow | `7984ddf2dd57` | `INT_MAX` 기준 pre-multiplication check로 field parse 실패 처리 | 이 Thread에서는 parser code를 확인하고 whole-call no-output 검증은 Thread 5에서 다시 추적 |
| 각 renderer가 raw field를 독립 해석할 경우 grammar/type 책임이 분산될 위험 | `7984ddf2dd57` + `03c3e6e09fa1` | normalized field + typed dispatch로 책임 분리 | 후속 conversion commits에서 동일 boundary 재사용 여부 확인 |
| conflicting flag를 renderer마다 다시 해석할 위험 | `c5f627099ad9` | `-`가 `0`을, `+`가 space를 제거하도록 한 번 정규화 | numeric layout Thread와 public-boundary tests에서 상호작용을 다시 확인 |

- 학습자 기록 — 실제 failure branch와 regression assertion을 연결한 추가 설명:
  - parser overflow branch는 null을 반환하고 main integration 이후 sticky error가 됩니다. typed dispatch 재사용은 decimal/hex commits의 diff에서 확인했습니다. flag normalization의 조합은 `1b8049e411bb`의 `"norm:'%-05d' '%+ d'"` differential case 및 후속 numeric boundary matrix가 간접적으로 보호합니다.

## 8. Ownership / state / responsibility 변화

| 시점 | Source상 owner / boundary | Source상 responsibility 변화 | 해당 SHA 코드 근거 |
| --- | --- | --- | --- |
| raw format cursor | main traversal + parser | main loop는 전체 sequencing, parser는 한 field 소비와 next unread position을 책임 | `9e6d785628f3` `ft_printf`가 `%` 뒤 pointer를 넘기고 parser 반환값을 다음 `format`으로 사용 |
| normalized field state | `t_format` | flags, width, optional precision, specifier를 renderer가 다시 parse하지 않도록 전달 | `7984ddf2dd57`의 `t_format`과 `ft_printf_init_format`; 이후 dispatch signatures가 `t_format *`를 받음 |
| variadic extraction | dispatch | specifier별 promoted type 선택과 renderer routing을 한 경계에서 수행 | `03c3e6e09fa1` 이후 `src/ft_dispatch.c`의 모든 `va_arg`; entry에는 type-specific extraction 없음 |
| conversion-specific representation | text/decimal/hex renderer | 각 conversion은 자신의 text/digit 생성에 집중하고 shared output path를 사용 | `src/ft_text.c`, `src/ft_number.c`, `src/ft_hex.c`가 extracted value와 `fmt`로 representation을 만들고 `ft_printf_*output` API 호출 |

## 9. Thread 최종 상태

- Source가 확정한 도달점: parsing, argument extraction, rendering이 분리되고, normalized field와 typed dispatch가 공통 boundary가 되며 parser-side flag normalization이 renderer의 conflicting states를 줄인 상태입니다.
- 학습자 기록 — 마지막 commit 기준 실제 코드에서 확인한 최종 state:
  - main loop는 전체 cursor/variadic lifetime/output result를 관리하고, parser는 overflow-checked `t_format`과 next cursor를 만들며, parser 끝에서 conflict flags를 제거합니다. dispatch는 specifier별 promoted type을 정확히 소비하고 text/decimal/hex renderer에 전달합니다.
- 학습자 기록 — 이 Thread 밖에서만 해결되는 남은 문제를 source 범위 안에서 구분:
  - unsupported/trailing field를 전체 호출 전에 거부하는 정책과 measurement/rendering의 argument 동기화는 Thread 5에서 완성됩니다. 숫자 prefix/precision/width의 공유 배치와 bounded string scan은 각각 Thread 3·4의 책임입니다.

## 10. 최종 architecture 또는 execution flow 정리

실제 SHA 코드를 읽은 뒤 아래 흐름을 완성합니다. source 설명만 복사하지 말고 함수/상태/branch를 연결합니다.

```text
[ft_printf의 전체 format cursor]
    -> [ft_printf_parse: flags/width/precision/spec + normalization]
    -> [ft_printf_dispatch: specifier별 va_arg promoted type 소비]
    -> [text/decimal/hex renderer: representation 생성, shared output 호출]
    -> [parse/output failure는 sticky error와 public -1, 성공은 다음 cursor]
```

- 각 단계에 대응하는 SHA / file / function:
  - `7984ddf2dd57` `src/ft_parse.c::ft_printf_parse`; `9e6d785628f3` `src/ft_printf.c::ft_printf`; `03c3e6e09fa1` `src/ft_dispatch.c::ft_printf_dispatch`; `95d6613a1c72`/`93c883070a1b` numeric renderers; `c5f627099ad9` normalization/prefix paths입니다.
- 핵심 state transition:
  - raw pointer → initialized `t_format` → OR된 flags와 parsed integer fields → canonical flags/spec → 해당 conversion type만큼 `va_list` 진행 → output context mutation입니다.
- failure가 끊기는 지점:
  - decimal overflow로 parser가 null이면 main이 `ctx.error`를 설정합니다. renderer/output 실패는 dispatch return `< 0`으로 main loop를 끊습니다. 이 Thread 시점의 unknown fallback은 실패로 끊기지 않습니다.
- 후속 fix/test가 보장한 지점:
  - later preflight가 supported syntax와 total length를 사전 확인하고, numeric/text differential/public-boundary suites가 normalized field와 type dispatch 결과를 `snprintf` 또는 explicit bytes와 비교합니다.

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
