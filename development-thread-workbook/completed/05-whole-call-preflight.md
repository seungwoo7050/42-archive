# Per-field validation becomes whole-call preflight

## 1. Thread 목표

한 field의 parser overflow check에서 출발해, 전체 format과 total output length를 첫 write 전에 검증하는 two-pass `va_list` architecture로 발전하는 과정을 복원합니다.

### Source에서 확정된 significance

한 field의 local parse validation만으로는 뒤쪽 invalid field가 있을 때 public no-output guarantee를 만들 수 없습니다. 두 번째 pass가 architecture를 바꾸어 format/length error는 preflight failure가 되고, device error만 partial external output을 남길 수 있게 됩니다.

### 이 Thread에 명시적으로 연결되는 source invariant / engineering difficulty

- Invariant: unsupported specifier, unterminated field, field-number overflow, total result > `INT_MAX`는 output 없이 `-1`을 반환합니다.
- Invariant: 시작되거나 copy된 각 `va_list`는 독립적으로 traversal되고 정확히 한 번 종료되며 measurement와 output은 호환되는 promoted type으로 argument를 소비합니다.
- Invariant: measurement와 rendering은 prefixes, zero suppression, precision zeros, field width를 포함한 effective length에 동의해야 합니다.
- Engineering difficulty: total output length를 미리 계산하여 late format error를 첫 write 전에 거부하면서도, variadic sequence를 두 번 독립적으로 소비하고 runtime device failure의 non-atomicity는 별도로 인정하는 문제입니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- field width/precision overflow를 한 field에서 막는 것만으로 왜 late invalid format의 no-output guarantee를 만들 수 없는가?
- `va_copy` measurement pass와 original `va_list` rendering pass는 각각 어떤 argument state를 소유하는가?
- measurement는 parser/rendering과 어떤 semantics를 반드시 동일하게 재현해야 하는가?
- format/length error와 runtime device/write error의 atomicity 경계는 어디인가?
- late invalid specifier나 total `INT_MAX` overflow test는 “renderer가 도달해서 실패”하는 구현과 어떻게 구별되는가?

## 3. 완료 기준

- `7984ddf2dd57`의 local field overflow validation과 `2d773acc5bd6`의 whole-call preflight 차이를 설명할 수 있습니다.
- `ft_printf`의 두 traversal과 모든 `va_start`/`va_copy`/`va_end` ownership을 success/failure path별로 기록할 수 있습니다.
- measurement와 rendering의 length model이 prefix, zero suppression, precision, width, bounded string read까지 일치하는지 실제 코드를 대조할 수 있습니다.
- `14059bd24f3e`의 late-failure cases가 zero emitted bytes를 요구한다는 점을 capture harness 결과와 연결할 수 있습니다.
- preflight error는 atomic하지만 runtime write failure는 이미 accepted byte를 rollback하지 못한다는 한계를 구분할 수 있습니다.

## 4. Commit map

| SHA | Subject | Importance | Tags | Source-defined role |
| --- | --- | --- | --- | --- |
| `7984ddf2dd57` | feat(parser): 포맷 필드 모델과 해석기 추가 | `S` | `ARCH, PARSER, CORE` | Rejects decimal width or precision values that overflow `int` while parsing one field. |
| `1b8049e411bb` | test(printf): 기본 변환과 포맷 경계 검증 | `A` | `FORMAT, TEST, VERIFY` | Adds parser-boundary tests and a differential harness, but errors later in a format can still follow earlier output. |
| `2d773acc5bd6` | fix(format): 지원 문법과 전체 출력 크기 선검증 | `S` | `ARCH, VARARGS, ATOMIC` | Adds a `va_copy` measurement pass that validates every field and the total result before any write. |
| `14059bd24f3e` | test(format): 잘못된 포맷의 무출력 실패 검증 | `A` | `ATOMIC, TEST, RISK` | Verifies that late unsupported fields and unrepresentable total lengths fail with zero emitted bytes. |

## 5. Commit별 학습 기록

> 원칙: 아래 기록은 final HEAD가 아니라 각 항목의 정확한 SHA에서 작성합니다. source가 확정하지 않은 파일명/함수명은 현재 골격에서 추측하지 않습니다.

## 5.1 `7984ddf2dd57` — feat(parser): 포맷 필드 모델과 해석기 추가

- Importance: `S`
- Tags: `ARCH, PARSER, CORE`
- Most Important Commits 목록: 포함
- Thread 내 역할: Rejects decimal width or precision values that overflow `int` while parsing one field.
- Commit Classification summary: Defines t_format and parses flags, width, precision, and specifiers with decimal overflow checks.
- Importance 근거: The parser creates the durable representation through which all conversions and both later passes communicate. It is indispensable to explaining the formatter's grammar and field-processing architecture.

### 학습 깊이
- 이 commit은 architecture/invariant의 핵심으로 취급합니다.
- 학습자 기록 — 직전 상태:
  - public loop는 literal과 `%%`만 직접 처리했고 flags, width, optional precision, specifier를 보존하는 field state가 없었습니다.
- 학습자 기록 — 해결하려던 문제:
  - raw decimal text를 `int` field로 변환할 때 overflow를 일으키지 않고, omitted precision과 `.0`을 구분하며, 이후 여러 consumer가 같은 grammar 결과를 사용해야 했습니다.
- 학습자 기록 — 기존 설계가 충분하지 않았던 이유:
  - conversion별 raw parsing은 grammar와 overflow behavior를 중복시키고, width/precision을 이미 overflow한 뒤 검사하면 잘못된 state/cursor를 만들 수 있습니다.
- 학습자 기록 — 선택한 핵심 decision:
  - `t_format`을 normalized representation으로 두고 decimal digit를 더하기 전에 `value > (INT_MAX - digit) / 10`을 검사하는 parser를 별도 module로 추가했습니다.
- 학습자 기록 — ownership / lifecycle / state transition:
  - caller가 stack `t_format`을 넘기며 parser가 초기화합니다. flags는 OR로 누적되고 width를 읽은 뒤 `.`가 있으면 `has_precision = 1`과 precision을 설정합니다. 마지막 specifier와 next cursor가 반환됩니다.
- 학습자 기록 — failure scenario와 public consequence:
  - 한 field의 width/precision이 `INT_MAX`를 넘으면 parser가 null을 반환합니다. 이 정확한 SHA에서는 parser가 아직 `ft_printf`에 연결되지 않았으므로 public no-output 결과는 아직 형성되지 않습니다.
- 학습자 기록 — 이 SHA가 보장하는 것:
  - parser API를 사용하는 consumer는 한 field의 decimal overflow를 state mutation 전에 검출하고 normalized field를 받을 수 있습니다.
- 학습자 기록 — 아직 보장하지 않는 것:
  - supported specifier 검증, 전체 format 검사, 모든 conversion length의 합, late failure 전 zero output, independent variadic traversal은 없습니다.
- 학습자 기록 — 후속 fix/test로 이어지는 지점:
  - `9e6d785628f3`에서 parser가 single-pass output loop에 연결되고 `1b8049e411bb`가 field-at-start overflow를 검사합니다. `2d773acc5bd6`가 동일 parser를 whole-call measurement에 재사용합니다.

### 해당 SHA에서 확인할 코드
- 해당 SHA의 `t_format` 정의에서 flag bit set, width, precision value, `has_precision`, specifier에 대응하는 실제 field를 기록합니다.
- parser가 flags → width → optional precision → specifier 순서로 cursor를 이동하는 실제 함수 호출 흐름을 추적합니다.
- repeated flag가 bitwise OR로 idempotent하게 누적되는 지점을 확인합니다.
- width/precision decimal parsing에서 multiply/add 전에 `INT_MAX` overflow를 차단하는 조건식을 기록합니다.
- precision omitted와 `.0`을 `has_precision`로 구분하는 state transition을 확인합니다.
- parser가 반환하는 next unread position을 caller가 아직 사용하지 않는 이 SHA의 boundary와, 직후 `9e6d785628f3`에서의 integration을 비교할 준비를 합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `src/ft_printf_internal.h`: flag constants, `t_format`, parser prototypes.
  - `src/ft_parse.c`: `ft_printf_init_format`, flag parser, decimal parser, `ft_printf_parse`.
  - `Makefile`: parser source를 archive에 추가하지만 `src/ft_printf.c`는 이 commit에서 호출하지 않습니다.
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
  - 이전: format field를 나타내는 state와 decimal overflow guard가 없었습니다.
  - 이후: parser module은 한 field를 안전하게 normalize하지만, public loop에는 아직 integration되지 않았습니다.

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - whole-call preflight의 공통 grammar 기반을 만든 commit입니다. 다만 이 단계의 validation 단위는 한 field이고, 외부 효과 전 전체 call을 판정하는 architecture는 아직 아닙니다.

## 5.2 `1b8049e411bb` — test(printf): 기본 변환과 포맷 경계 검증

- Importance: `A`
- Tags: `FORMAT, TEST, VERIFY`
- Most Important Commits 목록: 미포함
- Thread 내 역할: Adds parser-boundary tests and a differential harness, but errors later in a format can still follow earlier output.
- Commit Classification summary: Creates stdout capture, libc differential checks, fixed expectations, and parser-overflow tests.
- Importance 근거: The harness materially changes confidence in all core conversions and return counts and becomes the basis for later regression matrices. It is significant verification rather than a defining runtime mechanism.

### 학습 깊이
- 이 commit은 주요 subsystem/boundary/failure path/integration point 수준으로 추적합니다.
- 학습자 기록 — 직전 상태와 문제:
  - conversion과 flag 기능은 구현됐지만 public return, embedded NUL을 포함한 exact bytes, parser boundary를 한 fixture에서 비교할 repository test target이 없었습니다.
- 학습자 기록 — 설계 판단 / boundary 변화:
  - stdout을 pipe로 redirect해 `ft_printf` bytes를 캡처하고, portable supported cases는 `snprintf`, repository-specific null/pointer behavior는 explicit output과 비교합니다.
- 학습자 기록 — 핵심 state/invariant 변화:
  - production code는 바뀌지 않습니다. test가 return count, captured length, byte sequence를 동시에 검사하며 width/precision parser overflow가 `-1`과 zero output인지 확인합니다.
- 학습자 기록 — failure 또는 edge case:
  - literal/escaped percent, `%c`의 embedded NUL, null string/pointer, signed extrema, all integer bases, flags/width/precision/mixed normalization, `2147483648` width/precision가 포함됩니다.
- 학습자 기록 — 보장하는 것 / 보장하지 않는 것:
  - 보장: 실행에 성공한다면 이 suite의 broad supported surface와 field-at-start overflow contract가 일치합니다.
  - 미보장: format 앞부분이 이미 valid output을 만든 뒤 뒤쪽 unsupported/incomplete field가 나오는 경우 zero-output을 요구하지 않습니다. total length overflow를 whole-call 수준에서 검증하지도 않습니다.
- 학습자 기록 — 다음 관련 commit 연결:
  - `2d773acc5bd6`이 preflight를 도입하고, `14059bd24f3e`가 기존 capture fixture에 late-fault 전용 macro/cases를 추가합니다.

### 해당 SHA에서 확인할 코드
- stdout redirection/pipe capture harness가 output bytes, captured byte count, `ft_printf` return을 어떤 순서로 수집/비교하는지 기록합니다.
- `snprintf`를 independent behavioral oracle로 사용하는 supported cases와 project-defined null string/pointer fixed expectations를 구분합니다.
- literal, escaped percent, embedded NUL, integer extrema, width/alignment/precision/zero/alternate/sign/mixed flag coverage를 test grouping으로 기록합니다.
- width/precision > `INT_MAX` field가 `-1`과 zero output을 요구하는 case를 확인합니다.
- 이 시점의 harness가 late invalid field 앞에서 이미 출력된 bytes까지 막는 whole-call preflight를 증명하지는 못함을 Thread 5 관점에서 기록합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `Makefile`: test binary/`test` target 추가.
  - `tests/test_ft_printf.c`: `t_capture`, `capture_begin`, `capture_end`, `check_case`, `EXPECT_PRINTF`, `EXPECT_OUTPUT`, `expect_field_error`, grouped case runners.
  - capture는 stdout을 pipe write end로 바꾸고 호출 뒤 원래 descriptor를 복원한 후 read end에서 bytes를 수집합니다. comparison은 public return, captured byte count, exact memory bytes를 분리합니다.
- 학습자 기록 — 필요한 최소 코드 발췌:
```c
/* 1b8049e411bb, tests/test_ft_printf.c */
expect_field_error(__LINE__, "%2147483648d");
expect_field_error(__LINE__, "%.2147483648d");
```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전: repository 안에서 전체 public pipeline을 재현하는 automated harness가 없었습니다.
  - 이후: broad differential/fixed verification이 생겼지만 parser overflow cases는 invalid field가 출력의 첫 위치에 있어 late-error atomicity를 구별하지 않습니다.

### Test commit 학습 기록
- production invariant 대상: supported formatting의 exact bytes, captured byte count, public return count 및 parser field-overflow behavior
- 재현하는 failure / boundary: conversion/flag/width/precision 조합의 visible mismatch, count mismatch, tested field overflow의 partial/invalid result
- test technique: stdout pipe capture + `snprintf` differential oracle + project-defined fixed expectations
- 통과하는 production path: public `ft_printf` 전체 conversion pipeline
- 이 test가 source상 증명하려는 것: 넓은 정상/edge formatting surface와 return-count consistency, tested parser overflow boundary
- 이 test가 증명하지 않는 것: late invalid field의 whole-call no-output preflight, deterministic syscall retry sequence, release artifact boundary를 아직 증명하지 않습니다.
- 분류: broad integration/differential harness입니다.
- 후속 회귀 방지 역할: 후속 conversion/layout changes가 기존 public formatting surface를 깨는 회귀를 막는 기반 harness가 됩니다.
- 학습자 기록 — 실제 test 함수/fixture/seam/assertion:
  - `EXPECT_PRINTF`는 `snprintf` expected buffer/return과 captured implementation bytes를 `check_case`에서 비교합니다. `EXPECT_OUTPUT`은 libc와 다를 수 있는 explicit bytes를 사용합니다. `expect_field_error`는 `-1`과 captured length 0을 요구합니다.
- 학습자 기록 — 직접 실행했다면 command / 환경 / 결과:
  - command: 미실행
  - environment: exact SHA의 repository checkout을 로컬에 확보하지 못해 GitHub connector로 Makefile/test/production diff를 검사했습니다.
  - result: 실행 결과를 기록하지 않습니다.

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 후속 모든 regression의 기반이 되는 broad public harness입니다. field 자체가 처음부터 invalid한 경우는 확인하지만, single-pass가 이미 쓴 앞부분까지 되돌리지 못하는 문제는 아직 노출하지 않습니다.

## 5.3 `2d773acc5bd6` — fix(format): 지원 문법과 전체 출력 크기 선검증

- Importance: `S`
- Tags: `ARCH, VARARGS, ATOMIC`
- Most Important Commits 목록: 포함
- Thread 내 역할: Adds a `va_copy` measurement pass that validates every field and the total result before any write.
- Commit Classification summary: Adds a va_copy measurement pass that validates grammar and total int length before output.
- Importance 근거: This changes the formatter from incremental discovery to a two-pass architecture: malformed, unsupported, or unrepresentable output is rejected with no external effect. The final correctness and failure contract cannot be explained without it.

### 학습 깊이
- 이 commit은 architecture/invariant의 핵심으로 취급합니다.
- 학습자 기록 — 직전 상태:
  - `ft_printf`는 original `va_list` 하나로 parse→dispatch→write를 반복했습니다. unsupported specifier는 dispatcher fallback으로 literal처럼 출력될 수 있었고, late parse/length failure는 earlier bytes가 이미 external fd에 전달된 뒤 발견될 수 있었습니다.
- 학습자 기록 — 해결하려던 문제:
  - supported grammar와 모든 conversion의 exact effective length를 첫 write 전에 확정하고, total public `int` count가 표현 가능한지 검증하면서 original variadic position을 rendering용으로 보존해야 했습니다.
- 학습자 기록 — 기존 설계가 충분하지 않았던 이유:
  - per-field parser guard는 현재 field만 판정합니다. single pass에서는 뒤쪽 `%q`, trailing `%`, 전체 합 overflow를 알 때 이미 literal/valid conversion을 썼으며, 한 `va_list`를 사전 순회하면 rendering argument cursor가 소진됩니다.
- 학습자 기록 — 선택한 핵심 decision:
  - `va_start(args)` 뒤 `va_copy(measure_args, args)`를 만들고 `ft_printf_measure`로 whole format을 순회합니다. 성공한 경우에만 original `args`와 output context로 기존 rendering loop를 실행합니다.
- 학습자 기록 — ownership / lifecycle / state transition:
  - null format은 variadic initialization 전에 `-1`입니다. 그 외 original `args`는 `va_start`로 생성되고 copied `measure_args`는 independent cursor입니다. preflight failure는 copy와 original을 각각 한 번 `va_end`하고 반환합니다. 성공은 copy를 끝낸 뒤 original만 rendering에서 소비하고 loop 종료 후 한 번 끝냅니다.
- 학습자 기록 — failure scenario와 public consequence:
  - parser null, unsupported/incomplete specifier, conversion measurement failure, component/total `INT_MAX` overflow는 measurement에서 `-1`; output context가 아직 초기화되거나 호출되지 않아 emitted byte 0입니다. preflight 성공 뒤 `write` 실패는 이미 accepted bytes가 남을 수 있고 public return만 `-1`입니다.
- 학습자 기록 — 이 SHA가 보장하는 것:
  - stable input과 defined variadic arguments를 전제로 grammar/length failure는 첫 write 전 판정되고, measurement/rendering은 specifier별 호환되는 promoted type으로 독립 소비됩니다.
- 학습자 기록 — 아직 보장하지 않는 것:
  - runtime device failure의 transactional rollback, 모든 OS timing, mutable input이 두 pass 사이에서 외부에 의해 바뀌는 상황은 보장하지 않습니다. measurement와 renderer는 별도 구현이므로 semantic parity를 tests로 계속 보호해야 합니다.
- 학습자 기록 — 후속 fix/test로 이어지는 지점:
  - `14059bd24f3e`가 literal/valid conversion 뒤 fault와 total overflow를 배치해 zero-output contract를 직접 검증합니다. `12d715eba77d` matrices와 release/sanitizer targets도 two-pass 경로를 통과합니다.

### 해당 SHA에서 확인할 코드
- fix 직전 single-pass `ft_printf`가 parse/render를 진행하며 late invalid field를 언제 발견하는지 parent code로 확인합니다.
- fix SHA에서 `va_copy`로 measurement traversal을 만들고 original `va_list`를 output용으로 보존하는 entry-point flow를 기록합니다.
- measurement module이 field parser를 재사용/호출하는 방식과 unsupported/incomplete syntax rejection 지점을 추적합니다.
- specifier별 argument를 rendering과 동일한 promoted type으로 소비하는 measurement dispatch를 기록합니다.
- string precision bound, numeric prefix, zero suppression, precision, width를 반영해 exact length를 계산하는 component를 실제 함수별로 기록합니다.
- component와 total을 `INT_MAX` 범위에서 누적하는 guard를 추적합니다.
- 성공/실패 모든 path에서 copied/original variadic traversal의 `va_end`가 balanced되는지 ownership table로 기록합니다.
- preflight failure에는 write가 시작되지 않고 runtime `write` failure만 partial external output이 가능한 execution split을 기록합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `src/ft_printf.c`: `va_start`, `va_copy`, measurement failure cleanup, copy cleanup, rendering loop, original cleanup.
  - `src/ft_measure.c`: `ft_is_supported_specifier`, `ft_add_length`, digit-length helpers, `ft_measure_numeric`, `ft_measure_string`, signed/hex helpers, `ft_measure_conversion`, `ft_printf_measure`.
  - `src/ft_printf_internal.h`: measurement prototype. `Makefile`: new source inclusion.
  - type map: `c:int`, `s:char *`, `d/i:int`, `u/x/X:unsigned int`, `p:void *`, `%`: no `va_arg`. Renderer dispatch와 동일합니다.
- 학습자 기록 — 필요한 최소 코드 발췌:
```c
/* 2d773acc5bd6, src/ft_printf.c */
va_start(args, format);
va_copy(measure_args, args);
if (ft_printf_measure(format, &measure_args) < 0)
{
    va_end(measure_args);
    va_end(args);
    return (-1);
}
va_end(measure_args);
ft_printf_init(&ctx, 1);
```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전: original `args`를 한 번 순회하며 field를 발견하는 즉시 rendering/output했습니다.
  - 이후: copied `measure_args`가 whole grammar와 exact total을 먼저 검증하고, 성공한 경우에만 untouched original `args`가 같은 format을 rendering합니다.

### Failure → Fix 추적
- 기존 가정/상태: single pass에서 field를 발견하는 즉시 validate/render해도 public failure contract를 충분히 만족할 수 있다는 상태
- 실제 failure 또는 위험: late invalid syntax 또는 total `INT_MAX` overflow가 earlier output 이후에 발견되어 format/length error가 partial output을 남길 수 있음
- source가 지목한 root cause: whole-call grammar/length를 external effect 전에 알 수 있는데도 rendering과 discovery가 같은 pass에 묶여 있음
- 수정된 decision/invariant: copied `va_list` measurement pass로 전체 grammar/argument length를 먼저 검증하고, 성공 후 original `va_list`로 output
- 학습자 기록 — 실제 수정 코드:
  - entry의 `va_copy`/early cleanup과 `src/ft_measure.c` 전체가 fix입니다. `ft_add_length`는 `amount > INT_MAX || total > INT_MAX - amount`를 검사하고, `ft_printf_measure`가 parse/support/conversion/total 중 하나라도 실패하면 즉시 `-1`을 반환합니다.
- 학습자 기록 — regression test 연결:
  - `14059bd24f3e`가 직접 연결됩니다. `EXPECT_FORMAT_ERROR`는 return `-1`과 captured length 0을 함께 요구하며 prefix/valid conversion 뒤 invalid syntax와 component 합 overflow를 검사합니다.

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - formatter를 incremental single pass에서 measure-then-render two pass로 바꾼 S-level architecture fix입니다. format/length 오류와 device 오류를 서로 다른 시점과 atomicity class로 분리합니다.

## 5.4 `14059bd24f3e` — test(format): 잘못된 포맷의 무출력 실패 검증

- Importance: `A`
- Tags: `ATOMIC, TEST, RISK`
- Most Important Commits 목록: 미포함
- Thread 내 역할: Verifies that late unsupported fields and unrepresentable total lengths fail with zero emitted bytes.
- Commit Classification summary: Verifies late invalid fields and INT_MAX length failures produce no bytes.
- Importance 근거: These cases specifically prove the new preflight atomicity guarantee, including errors after otherwise valid prefixes and conversions. They materially protect an S-level contract.

### 학습 깊이
- 이 commit은 주요 subsystem/boundary/failure path/integration point 수준으로 추적합니다.
- 학습자 기록 — 직전 상태와 문제:
  - existing `expect_field_error`는 invalid field가 첫 위치에 있어 single-pass implementation도 zero output으로 통과할 수 있었습니다. preflight의 distinguishing property를 검증하려면 fault 앞에 valid output-producing content가 있어야 했습니다.
- 학습자 기록 — 설계 판단 / boundary 변화:
  - capture fixture 위에 `EXPECT_FORMAT_ERROR`를 추가해 actual return이 `-1`이고 captured length가 정확히 0인지 한 번에 검사합니다. cases는 late syntax와 total-length overflow를 별도로 구성합니다.
- 학습자 기록 — 핵심 state/invariant 변화:
  - production state는 바뀌지 않습니다. test는 preflight가 entire format을 통과하기 전에는 rendering pass가 시작되지 않는다는 observable invariant를 고정합니다.
- 학습자 기록 — failure 또는 edge case:
  - literal 뒤 oversized width, `%q`, trailing `%`; valid `%d` argument consumption 뒤 `%q`; `INT_MAX` width 앞/뒤 literal; sign/hash prefix와 `INT_MAX` precision이 total에 더해지는 경우입니다.
- 학습자 기록 — 보장하는 것 / 보장하지 않는 것:
  - 보장: 열거된 malformed/unsupported/total-overflow calls는 public `-1`과 zero captured bytes를 함께 만족해야 합니다.
  - 미보장: preflight를 통과한 뒤 실제 `write`가 partial progress 후 실패할 때 bytes가 0이어야 한다는 보장은 하지 않습니다. variadic misuse나 concurrent source mutation도 검사하지 않습니다.
- 학습자 기록 — 다음 관련 commit 연결:
  - 이 Thread의 마지막 직접 regression입니다. 후속 functional matrices와 release/sanitizer targets가 same entry를 실행하지만 no-output contract를 새로 정의하지 않습니다.

### 해당 SHA에서 확인할 코드
- invalid specifier, trailing percent, width/precision > `INT_MAX`, total formatted length > `INT_MAX` case를 test file에서 식별합니다.
- fault가 literal text 뒤 또는 valid argument-consuming conversion 뒤에 위치하도록 만든 format을 기록합니다.
- each case가 return `-1`뿐 아니라 captured emitted bytes = 0을 요구하는 assertion을 확인합니다.
- overflow cases에서 literal, suffix, sign, alternate prefix, precision이 total length에 기여하는 test를 분류합니다.
- 이 test가 format/length preflight atomicity를 증명하지만 runtime device failure rollback은 증명하지 않는다는 경계를 기록합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `tests/test_ft_printf.c`: `EXPECT_FORMAT_ERROR` macro와 `run_parser_boundary_cases`의 여덟 추가 calls.
  - field/local syntax: `prefix:%2147483648d`, `prefix:%q`, `prefix:%`.
  - valid argument 뒤 syntax: `value:%d bad:%q`.
  - total overflow: `x%2147483647d`, `%2147483647dX`, `%+.2147483647d`, `%#.2147483647x`.
- 학습자 기록 — 필요한 최소 코드 발췌:
```c
/* 14059bd24f3e, tests/test_ft_printf.c, EXPECT_FORMAT_ERROR */
#define EXPECT_FORMAT_ERROR(FORMAT, ...) do { \
    char        actual[16]; \
    t_capture   capture; \
    int         actual_ret; \
    ssize_t     actual_len; \
    capture_begin(&capture, __LINE__); \
    actual_ret = ft_printf(FORMAT, ##__VA_ARGS__); \
    actual_len = capture_end(&capture, actual, sizeof(actual), __LINE__); \
    if (actual_ret != -1 || actual_len != 0) \
        fail_test(__LINE__, "invalid format produced output"); \
} while (0)
```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전: field-at-start overflow만 zero-output fixture로 검사했습니다.
  - 이후: earlier literal/valid conversion이 있는 late faults와 individually valid `INT_MAX` component에 추가 byte/prefix가 결합되는 total overflow를 검사합니다.

### Test commit 학습 기록
- production invariant 대상: format/length error는 whole-call preflight에서 첫 output 전에 실패해야 함
- 재현하는 failure / boundary: late invalid/unsupported/incomplete field 또는 total `INT_MAX` overflow가 earlier valid bytes 뒤에 발견되어 partial output을 남기는 regression
- test technique: late-fault format + stdout capture + zero-byte assertion
- 통과하는 production path: public `ft_printf` → copied-`va_list` measurement/preflight; failure 시 rendering pass 미진입
- 이 test가 source상 증명하려는 것: source에 열거된 malformed/overflow cases가 `-1`과 zero emitted bytes를 만족함
- 이 test가 증명하지 않는 것: runtime `write` failure의 rollback/atomicity는 증명하지 않으며 source도 이를 보장하지 않습니다.
- 분류: deterministic regression focused on S-level atomic preflight contract입니다.
- 후속 회귀 방지 역할: measurement/parser/length model 변경이 late error를 rendering 중 발견하도록 퇴행하는 것을 막습니다.
- 학습자 기록 — 실제 test 함수/fixture/seam/assertion:
  - macro는 16-byte capture buffer면 충분합니다. invariant가 맞으면 output은 0이고, 틀린 single-pass implementation이라도 prefix 몇 byte를 관찰할 수 있습니다. 모든 case는 `capture_begin` 전후 actual return/length를 직접 검사합니다.
- 학습자 기록 — 직접 실행했다면 command / 환경 / 결과:
  - command: 미실행
  - environment: exact SHA checkout을 로컬에 만들 수 없어 connector로 test macro/cases와 production preflight를 검사했습니다.
  - result: test pass를 주장하지 않습니다.

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 단순 `-1` 검사가 아니라 fault 앞의 valid content가 한 byte도 나오지 않았는지를 검사해 two-pass architecture를 single-pass late failure와 구별하는 deterministic regression입니다.

## 6. Invariant ledger

Source가 확정한 변화 축을 아래에 배치했습니다. “실제 코드 근거”는 학습자가 해당 SHA를 읽고 채웁니다.

| Invariant / concern | 도입 또는 초기 상태 | 강화 / 수정 | 고정한 검증 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| field-local validation | `7984ddf2dd57`에서 width/precision decimal overflow를 parse 시 거부 | `1b8049e411bb`에서 parser boundary tests 추가 | late invalid field 앞의 earlier output까지 막지는 못하는 한계 기록 | decimal precheck와 field-at-start `expect_field_error`; parser는 당시 single-pass에서 field 도달 시점에만 호출 |
| whole-call preflight | `2d773acc5bd6`에서 `va_copy` measurement pass 추가 | grammar + promoted types + exact effective lengths + total `INT_MAX`를 첫 write 전 검증 | `14059bd24f3e`에서 late invalid/overflow zero-output 보장 고정 | `src/ft_measure.c` support/type/length functions, `src/ft_printf.c` measure-before-init/write, eight `EXPECT_FORMAT_ERROR` cases |
| atomicity boundary | format/length error는 preflight에서 external effect 이전에 판정 | runtime `write` failure는 output context가 처리하지만 이미 accepted bytes rollback 불가 | 학습자가 두 failure class를 execution flow에서 분리 | preflight failure branch는 `ft_printf_init`보다 앞; rendering의 `ft_printf_write`는 positive progress를 count/offset에 반영하고 later failure 시 public `-1` |

### 학습자 추가 기록

- source가 명시한 invariant 범위 안에서만 필요한 행을 추가합니다. 새 invariant를 확정 사실처럼 만들지 않습니다.
- 추가 기록:
  - 추가 행은 만들지 않았습니다. copied/original `va_list` ownership은 아래 responsibility 표에 구체화했습니다.

## 7. Failure → Fix → Test 연결

| 기존 failure / risk | Fix / change | 수정 decision | Test / 학습 확인 |
| --- | --- | --- | --- |
| 한 field는 유효해도 뒤쪽 unsupported/incomplete field가 earlier bytes 뒤에 발견될 수 있음 | `2d773acc5bd6` | whole-format measurement before rendering | `14059bd24f3e`에서 literal/valid conversion 뒤에 fault를 배치하여 zero-output 검증 |
| 각 field 길이는 `int`여도 전체 합이 `INT_MAX`를 넘을 수 있음 | `2d773acc5bd6` | component/total length accumulation을 preflight에서 검증 | `14059bd24f3e`에서 literal/suffix/sign/prefix/precision 기여까지 포함한 overflow cases |
| measurement가 original `va_list`를 소비하면 output pass argument state가 깨질 위험 | `2d773acc5bd6` | `va_copy`로 independent traversal 생성 후 balanced `va_end` | 학습자가 success/failure 모든 cleanup path를 실제 코드에서 확인 |

- 학습자 기록 — 실제 failure branch와 regression assertion을 연결한 추가 설명:
  - support/parser/conversion/`ft_add_length` 중 하나가 measurement에서 실패하면 entry가 두 lists를 종료하고 output context 초기화 전에 반환합니다. tests의 prefix/valid conversion bytes가 0이라는 assertion이 rendering 미진입을 관찰합니다. copy는 measurement에서 소비되고 성공 시 끝나며, original은 untouched 상태로 dispatch가 동일 type sequence를 소비합니다.

## 8. Ownership / state / responsibility 변화

| 시점 | Source상 owner / boundary | Source상 responsibility 변화 | 해당 SHA 코드 근거 |
| --- | --- | --- | --- |
| single-pass 이전 | original variadic traversal | parse/render가 진행되며 late error가 이미 출력된 byte 뒤에 발견될 수 있음 | parent `src/ft_printf.c`가 `va_start(args)` 후 바로 output context/loop에 진입하고 dispatch가 `args`를 소비 |
| `2d773acc5bd6` 이후 measurement | copied `va_list` | whole-format grammar/length validation과 동일 promoted type 소비 | `va_copy(measure_args, args)`와 `ft_printf_measure(format, &measure_args)`; failure/success 모두 copy를 한 번 `va_end` |
| `2d773acc5bd6` 이후 rendering | original `va_list` | preflight 성공 후 실제 output만 수행 | measurement 성공 뒤에만 `ft_printf_init`; dispatch는 original `args`, loop 후 `va_end(args)` |
| parser/measure/render | shared semantics contract | 같은 normalized field와 conversion length model을 서로 일치시켜야 함 | measurement와 rendering 모두 `ft_printf_parse`; type map 동일; bounded string scan과 numeric prefix/suppression/precision/width 계산이 renderer model을 mirror |

## 9. Thread 최종 상태

- Source가 확정한 도달점: final entry point가 `va_copy` measurement와 original-argument rendering의 두 traversal을 수행하여 format/length error를 output 전에 거부하고, runtime device failure만 non-atomic하게 남기는 상태입니다.
- 학습자 기록 — 마지막 commit 기준 실제 코드에서 확인한 최종 state:
  - entry는 null format을 즉시 거부하고, copied list로 complete grammar/type/effective length/total count를 검사합니다. 실패하면 두 list를 정리하고 zero output으로 `-1`; 성공하면 copy를 끝내고 original list로 rendering합니다. late-fault tests는 valid prefix/conversion이 있어도 captured length 0을 요구합니다.
- 학습자 기록 — 이 Thread 밖에서만 해결되는 남은 문제를 source 범위 안에서 구분:
  - actual syscall의 short write/EINTR/permanent failure와 accepted-byte nonrollback은 Thread 1, numeric layout authority는 Thread 3, archive/sanitizer execution 범위는 Thread 6에 속합니다.

## 10. 최종 architecture 또는 execution flow 정리

실제 SHA 코드를 읽은 뒤 아래 흐름을 완성합니다. source 설명만 복사하지 말고 함수/상태/branch를 연결합니다.

```text
[ft_printf: null check -> va_start(args) -> va_copy(measure_args)]
    -> [ft_printf_measure: parser + supported grammar + matching va_arg types + exact lengths]
    -> [failure: both va_end, no output, -1 / success: va_end(copy)]
    -> [original args로 parser -> dispatch -> renderer -> output state]
    -> [format/length 성공 count 또는 runtime write failure -1]
```

- 각 단계에 대응하는 SHA / file / function:
  - `7984ddf2dd57` `src/ft_parse.c`가 field grammar를 제공합니다. `2d773acc5bd6` `src/ft_measure.c::ft_printf_measure`와 `src/ft_printf.c::ft_printf`가 two-pass를 구성합니다. `14059bd24f3e` test macro/cases가 observable no-output을 고정합니다.
- 핵심 state transition:
  - original list initialized→copied list independently consumed→preflight result→copy ended→original list rendered/ended입니다. total은 `size_t`로 계산하되 매 add마다 `INT_MAX` representability를 유지합니다.
- failure가 끊기는 지점:
  - format/length failure는 `ft_printf_init`과 모든 output call 전에 끊깁니다. runtime failure는 rendering의 shared output loop에서 끊기므로 앞선 accepted bytes는 남을 수 있습니다.
- 후속 fix/test가 보장한 지점:
  - late `%q`, trailing `%`, oversized field와 literal/sign/hash/precision 때문에 total이 넘는 cases에서 return `-1`뿐 아니라 captured bytes 0을 확인하도록 설계됐습니다.

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
