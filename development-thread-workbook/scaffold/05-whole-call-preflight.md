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
  - 
- 학습자 기록 — 해결하려던 문제:
  - 
- 학습자 기록 — 기존 설계가 충분하지 않았던 이유:
  - 
- 학습자 기록 — 선택한 핵심 decision:
  - 
- 학습자 기록 — ownership / lifecycle / state transition:
  - 
- 학습자 기록 — failure scenario와 public consequence:
  - 
- 학습자 기록 — 이 SHA가 보장하는 것:
  - 
- 학습자 기록 — 아직 보장하지 않는 것:
  - 
- 학습자 기록 — 후속 fix/test로 이어지는 지점:
  - 

### 해당 SHA에서 확인할 코드
- 해당 SHA의 `t_format` 정의에서 flag bit set, width, precision value, `has_precision`, specifier에 대응하는 실제 field를 기록합니다.
- parser가 flags → width → optional precision → specifier 순서로 cursor를 이동하는 실제 함수 호출 흐름을 추적합니다.
- repeated flag가 bitwise OR로 idempotent하게 누적되는 지점을 확인합니다.
- width/precision decimal parsing에서 multiply/add 전에 `INT_MAX` overflow를 차단하는 조건식을 기록합니다.
- precision omitted와 `.0`을 `has_precision`로 구분하는 state transition을 확인합니다.
- parser가 반환하는 next unread position을 caller가 아직 사용하지 않는 이 SHA의 boundary와, 직후 `9e6d785628f3`에서의 integration을 비교할 준비를 합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - 
- 학습자 기록 — 필요한 최소 코드 발췌:
```c

```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전:
  - 이후:

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 

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
  - 
- 학습자 기록 — 설계 판단 / boundary 변화:
  - 
- 학습자 기록 — 핵심 state/invariant 변화:
  - 
- 학습자 기록 — failure 또는 edge case:
  - 
- 학습자 기록 — 보장하는 것 / 보장하지 않는 것:
  - 보장:
  - 미보장:
- 학습자 기록 — 다음 관련 commit 연결:
  - 

### 해당 SHA에서 확인할 코드
- stdout redirection/pipe capture harness가 output bytes, captured byte count, `ft_printf` return을 어떤 순서로 수집/비교하는지 기록합니다.
- `snprintf`를 independent behavioral oracle로 사용하는 supported cases와 project-defined null string/pointer fixed expectations를 구분합니다.
- literal, escaped percent, embedded NUL, integer extrema, width/alignment/precision/zero/alternate/sign/mixed flag coverage를 test grouping으로 기록합니다.
- width/precision > `INT_MAX` field가 `-1`과 zero output을 요구하는 case를 확인합니다.
- 이 시점의 harness가 late invalid field 앞에서 이미 출력된 bytes까지 막는 whole-call preflight를 증명하지는 못함을 Thread 5 관점에서 기록합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - 
- 학습자 기록 — 필요한 최소 코드 발췌:
```c

```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전:
  - 이후:

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
  - 
- 학습자 기록 — 직접 실행했다면 command / 환경 / 결과:
  - command:
  - environment:
  - result:

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 

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
  - 
- 학습자 기록 — 해결하려던 문제:
  - 
- 학습자 기록 — 기존 설계가 충분하지 않았던 이유:
  - 
- 학습자 기록 — 선택한 핵심 decision:
  - 
- 학습자 기록 — ownership / lifecycle / state transition:
  - 
- 학습자 기록 — failure scenario와 public consequence:
  - 
- 학습자 기록 — 이 SHA가 보장하는 것:
  - 
- 학습자 기록 — 아직 보장하지 않는 것:
  - 
- 학습자 기록 — 후속 fix/test로 이어지는 지점:
  - 

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
  - 
- 학습자 기록 — 필요한 최소 코드 발췌:
```c

```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전:
  - 이후:

### Failure → Fix 추적
- 기존 가정/상태: single pass에서 field를 발견하는 즉시 validate/render해도 public failure contract를 충분히 만족할 수 있다는 상태
- 실제 failure 또는 위험: late invalid syntax 또는 total `INT_MAX` overflow가 earlier output 이후에 발견되어 format/length error가 partial output을 남길 수 있음
- source가 지목한 root cause: whole-call grammar/length를 external effect 전에 알 수 있는데도 rendering과 discovery가 같은 pass에 묶여 있음
- 수정된 decision/invariant: copied `va_list` measurement pass로 전체 grammar/argument length를 먼저 검증하고, 성공 후 original `va_list`로 output
- 학습자 기록 — 실제 수정 코드:
  - 
- 학습자 기록 — regression test 연결:
  - source에 직접 연결된 후속 test가 있으면 SHA와 test case를 기록하고, 직접 대응 test가 명시되지 않았다면 그렇게 구분해서 기록합니다.

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 

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
  - 
- 학습자 기록 — 설계 판단 / boundary 변화:
  - 
- 학습자 기록 — 핵심 state/invariant 변화:
  - 
- 학습자 기록 — failure 또는 edge case:
  - 
- 학습자 기록 — 보장하는 것 / 보장하지 않는 것:
  - 보장:
  - 미보장:
- 학습자 기록 — 다음 관련 commit 연결:
  - 

### 해당 SHA에서 확인할 코드
- invalid specifier, trailing percent, width/precision > `INT_MAX`, total formatted length > `INT_MAX` case를 test file에서 식별합니다.
- fault가 literal text 뒤 또는 valid argument-consuming conversion 뒤에 위치하도록 만든 format을 기록합니다.
- each case가 return `-1`뿐 아니라 captured emitted bytes = 0을 요구하는 assertion을 확인합니다.
- overflow cases에서 literal, suffix, sign, alternate prefix, precision이 total length에 기여하는 test를 분류합니다.
- 이 test가 format/length preflight atomicity를 증명하지만 runtime device failure rollback은 증명하지 않는다는 경계를 기록합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - 
- 학습자 기록 — 필요한 최소 코드 발췌:
```c

```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전:
  - 이후:

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
  - 
- 학습자 기록 — 직접 실행했다면 command / 환경 / 결과:
  - command:
  - environment:
  - result:

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 

## 6. Invariant ledger

Source가 확정한 변화 축을 아래에 배치했습니다. “실제 코드 근거”는 학습자가 해당 SHA를 읽고 채웁니다.

| Invariant / concern | 도입 또는 초기 상태 | 강화 / 수정 | 고정한 검증 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| field-local validation | `7984ddf2dd57`에서 width/precision decimal overflow를 parse 시 거부 | `1b8049e411bb`에서 parser boundary tests 추가 | late invalid field 앞의 earlier output까지 막지는 못하는 한계 기록 |  |
| whole-call preflight | `2d773acc5bd6`에서 `va_copy` measurement pass 추가 | grammar + promoted types + exact effective lengths + total `INT_MAX`를 첫 write 전 검증 | `14059bd24f3e`에서 late invalid/overflow zero-output 보장 고정 |  |
| atomicity boundary | format/length error는 preflight에서 external effect 이전에 판정 | runtime `write` failure는 output context가 처리하지만 이미 accepted bytes rollback 불가 | 학습자가 두 failure class를 execution flow에서 분리 |  |

### 학습자 추가 기록

- source가 명시한 invariant 범위 안에서만 필요한 행을 추가합니다. 새 invariant를 확정 사실처럼 만들지 않습니다.
- 추가 기록:
  - 

## 7. Failure → Fix → Test 연결

| 기존 failure / risk | Fix / change | 수정 decision | Test / 학습 확인 |
| --- | --- | --- | --- |
| 한 field는 유효해도 뒤쪽 unsupported/incomplete field가 earlier bytes 뒤에 발견될 수 있음 | `2d773acc5bd6` | whole-format measurement before rendering | `14059bd24f3e`에서 literal/valid conversion 뒤에 fault를 배치하여 zero-output 검증 |
| 각 field 길이는 `int`여도 전체 합이 `INT_MAX`를 넘을 수 있음 | `2d773acc5bd6` | component/total length accumulation을 preflight에서 검증 | `14059bd24f3e`에서 literal/suffix/sign/prefix/precision 기여까지 포함한 overflow cases |
| measurement가 original `va_list`를 소비하면 output pass argument state가 깨질 위험 | `2d773acc5bd6` | `va_copy`로 independent traversal 생성 후 balanced `va_end` | 학습자가 success/failure 모든 cleanup path를 실제 코드에서 확인 |

- 학습자 기록 — 실제 failure branch와 regression assertion을 연결한 추가 설명:
  - 

## 8. Ownership / state / responsibility 변화

| 시점 | Source상 owner / boundary | Source상 responsibility 변화 | 해당 SHA 코드 근거 |
| --- | --- | --- | --- |
| single-pass 이전 | original variadic traversal | parse/render가 진행되며 late error가 이미 출력된 byte 뒤에 발견될 수 있음 |  |
| `2d773acc5bd6` 이후 measurement | copied `va_list` | whole-format grammar/length validation과 동일 promoted type 소비 |  |
| `2d773acc5bd6` 이후 rendering | original `va_list` | preflight 성공 후 실제 output만 수행 |  |
| parser/measure/render | shared semantics contract | 같은 normalized field와 conversion length model을 서로 일치시켜야 함 |  |

## 9. Thread 최종 상태

- Source가 확정한 도달점: final entry point가 `va_copy` measurement와 original-argument rendering의 두 traversal을 수행하여 format/length error를 output 전에 거부하고, runtime device failure만 non-atomic하게 남기는 상태입니다.
- 학습자 기록 — 마지막 commit 기준 실제 코드에서 확인한 최종 state:
  - 
- 학습자 기록 — 이 Thread 밖에서만 해결되는 남은 문제를 source 범위 안에서 구분:
  - 

## 10. 최종 architecture 또는 execution flow 정리

실제 SHA 코드를 읽은 뒤 아래 흐름을 완성합니다. source 설명만 복사하지 말고 함수/상태/branch를 연결합니다.

```text
[caller / entry]
    -> [구체 함수 또는 state]
    -> [변환 / mutation / validation]
    -> [failure branch 또는 next stage]
    -> [public consequence]
```

- 각 단계에 대응하는 SHA / file / function:
  - 
- 핵심 state transition:
  - 
- failure가 끊기는 지점:
  - 
- 후속 fix/test가 보장한 지점:
  - 

## 11. 학습 완료 자가 점검

- [ ] Commit map의 모든 SHA를 정확한 시점의 코드로 확인했습니다.
- [ ] 각 commit의 subject, importance, tags를 source와 그대로 유지했습니다.
- [ ] final HEAD의 코드를 과거 commit 설명에 소급 사용하지 않았습니다.
- [ ] 필요한 parent/직전 관련 SHA 비교를 실제 diff로 수행했습니다.
- [ ] source가 확정한 사실과 내가 코드에서 확인한 사실을 구분했습니다.
- [ ] fix의 기존 가정 → failure/risk → root cause → decision → code → test 연결을 필요한 곳에서 완성했습니다.
- [ ] test commit의 target invariant, technique, production path, proves/not-proves를 구분했습니다.
- [ ] Invariant ledger에 실제 코드 근거를 채웠습니다.
- [ ] 이 Thread의 최종 architecture/execution flow를 commit history 순서로 설명할 수 있습니다.
