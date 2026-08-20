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
  - 
- 학습자 기록 — 이 commit이 맡는 구현 책임:
  - 
- 학습자 기록 — 해당 SHA에서 확인한 핵심 상태/flow 변화:
  - 
- 학습자 기록 — 이후 commit이 보강하거나 대체하는 부분:
  - 

### 해당 SHA에서 확인할 코드
- decimal conversion이 먼저 magnitude digits를 materialize하고 length를 결정한 뒤 layout을 수행하도록 바뀐 diff를 찾습니다.
- minus sign이 별도 preliminary write가 아니라 explicit prefix로 표현되는 지점을 확인합니다.
- width 계산에서 prefix length + digit length가 어떻게 반영되는지 기록합니다.
- right alignment와 left alignment에서 spaces가 complete signed representation 앞/뒤 어디에 배치되는지 확인합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - 
- 학습자 기록 — 필요한 최소 코드 발췌:
```c

```

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 

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
  - 
- 학습자 기록 — 이 commit이 맡는 구현 책임:
  - 
- 학습자 기록 — 해당 SHA에서 확인한 핵심 상태/flow 변화:
  - 
- 학습자 기록 — 이후 commit이 보강하거나 대체하는 부분:
  - 

### 해당 SHA에서 확인할 코드
- hex/pointer가 digit materialization 이후 prefix + digit length로 width를 계산하는 path를 추적합니다.
- `x`, `X`, `p`가 동일 placement logic을 공유하면서 digit alphabet과 pointer prefix responsibility를 분리하는 코드를 기록합니다.
- 직전 decimal layout과 비교하여 중복된 placement sequence를 구체적으로 표시합니다. 이 비교는 이후 `177c8d03b353`의 refactor 근거가 됩니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - 
- 학습자 기록 — 필요한 최소 코드 발췌:
```c

```

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 

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
- numeric layout에서 prefix bytes, precision zeroes, field padding, value digits를 각각 어떤 변수로 계산하는지 기록합니다.
- `has_precision`이 true일 때 field-level `0` flag가 억제되는 조건을 확인합니다.
- zero value + precision zero에서 effective digit count가 0이 되는 branch를 추적합니다.
- leading spaces → prefix → field zeroes → precision zeroes → digits → trailing spaces의 실제 emission call 순서를 기록합니다.
- decimal/hex가 같은 rule을 각자 구현하는 중복 지점을 표시하여 이후 shared layout과 비교합니다.
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
- parse 이후 flag normalization이 수행되는 정확한 함수/위치를 찾습니다.
- left alignment가 `0` padding을 제거하고 explicit `+`가 space-sign request를 제거하는 bit mutation을 기록합니다.
- positive signed value의 prefix 선택(`+`, space, none)과 negative value의 `-` 유지 branch를 확인합니다.
- hex alternate form이 nonzero value에만 `0x`/`0X`를 추가하는 조건을 기록합니다.
- 이 normalized field/prefix decision이 decimal/hex shared layout 또는 각 renderer에 어떻게 전달되는지 caller/callee path로 기록합니다.
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
  - 
- 학습자 기록 — 이 commit이 맡는 구현 책임:
  - 
- 학습자 기록 — 해당 SHA에서 확인한 핵심 상태/flow 변화:
  - 
- 학습자 기록 — 이후 commit이 보강하거나 대체하는 부분:
  - 

### 해당 SHA에서 확인할 코드
- 각 regression case가 sign, alternate prefix, field zero, precision zero, left alignment 중 어떤 조합을 만드는지 표로 기록합니다.
- expected value가 `snprintf` differential인지 explicit expected output인지 test code에서 확인합니다.
- sign/`0x`가 zero padding 앞에 오는지, precision이 field `0`을 무효화하는지, zero hex + precision zero에서 alternate prefix가 사라지는지, trailing spaces가 complete prefixed value 밖에 오는지 assertion으로 연결합니다.
- 이 test가 shared layout 도입 전의 duplicated implementation을 검증하는지, 이후 같은 test가 regression gate로 남는지 기록합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - 
- 학습자 기록 — 필요한 최소 코드 발췌:
```c

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
  - 
- 학습자 기록 — 직접 실행했다면 command / 환경 / 결과:
  - command:
  - environment:
  - result:

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 

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
- parent SHA에서 decimal과 hex가 각각 갖고 있던 placement sequence를 나란히 비교합니다.
- `ft_printf_write_numeric_layout`의 실제 signature에서 prefix, prepared digits, digit length, zero-value fact, normalized field 중 어떤 정보가 전달되는지 기록합니다.
- shared helper가 effective digit length, precision zeroes, field padding, emission order, error propagation을 소유하는 코드 지점을 추적합니다.
- decimal/hex/pointer conversion 쪽에서 제거된 책임과 여전히 남은 responsibility를 diff로 구분합니다.
- 후속 measurement pass가 이 one layout model을 mirror해야 하는 이유를 실제 component 계산을 기준으로 메모합니다.
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
- fix 직전 signed negative magnitude 계산에서 `-value` 또는 equivalent positive counterpart가 어떤 signed type에서 형성되는지 확인합니다.
- `INT_MIN`의 positive counterpart가 같은 signed type에 representable하지 않을 수 있는 이유를 해당 platform-independent integer range로 설명합니다.
- fix SHA에서 `value + 1`을 먼저 negation하고 `unsigned long`으로 변환한 뒤 마지막 1을 unsigned domain에서 더하는 정확한 expression을 기록합니다.
- sign selection과 shared decimal layout은 바뀌지 않았는지 diff로 확인하여 fix scope를 분리합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - 
- 학습자 기록 — 필요한 최소 코드 발췌:
```c

```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전:
  - 이후:

### Failure → Fix 추적
- 기존 가정/상태: negative `int`를 더 넓은 `long`으로 옮겨 negation하면 `INT_MIN` magnitude를 항상 안전하게 만들 수 있다는 assumption
- 실제 failure 또는 위험: `long`이 `int`보다 넓지 않은 data model에서는 positive counterpart가 signed type에 representable하지 않을 수 있음
- source가 지목한 root cause: signed domain에서 unrepresentable positive magnitude를 직접 형성하려는 계산
- 수정된 decision/invariant: `-(value + 1)`의 representable result를 unsigned로 변환하고 마지막 1을 unsigned domain에서 더함
- 학습자 기록 — 실제 수정 코드:
  - 
- 학습자 기록 — regression test 연결:
  - source에 직접 연결된 후속 test가 있으면 SHA와 test case를 기록하고, 직접 대응 test가 명시되지 않았다면 그렇게 구분해서 기록합니다.

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 

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
- precision zero, digit-count transition, signs, alternate prefix, content-width boundary에 대한 differential matrix를 찾아 입력 축과 expected oracle을 기록합니다.
- null format, empty format, null string, null pointer, formatted percent처럼 fixed project expectation으로 분리된 case를 식별합니다.
- 이 Thread 관점에서는 특히 null pointer의 `0x` prefix와 precision-zero digit suppression, width가 content보다 작은/큰 경우의 production layout path를 추적합니다.
- libc와 비교하지 않는 fixed expectation이 “왜 project contract인지” source description과 test implementation을 대응시킵니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - 
- 학습자 기록 — 필요한 최소 코드 발췌:
```c

```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전:
  - 이후:

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
| width/alignment layout | `ac27a26affaa`에서 decimal에 도입 | `c5ef742b84de`에서 hex/pointer에 반복 | 중복의 실제 형태를 두 SHA에서 비교 |  |
| precision/zero composition | `1fa064ca9d79`에서 zero suppression, precision zeros, field-zero ordering 도입 | `c5f627099ad9`의 prefix/flag precedence와 결합 | `f276ee73087c`에서 대표 상호작용 회귀 검증 |  |
| shared layout responsibility | `177c8d03b353`에서 공통 numeric layout writer로 중앙화 | decimal/hex/pointer가 prepared digits/prefix/zero fact를 공급 | `12d715eba77d`에서 boundary matrix로 public semantics 확대 검증 |  |
| signed endpoint portability | 초기 decimal magnitude는 `long`이 더 넓다는 가정에 의존 | `ed3750fd081a`에서 unsigned domain 계산으로 복구 | 학습자가 sanitizer/functional coverage와 연결 여부를 별도 기록 |  |

### 학습자 추가 기록

- source가 명시한 invariant 범위 안에서만 필요한 행을 추가합니다. 새 invariant를 확정 사실처럼 만들지 않습니다.
- 추가 기록:
  - 

## 7. Failure → Fix → Test 연결

| 기존 failure / risk | Fix / change | 수정 decision | Test / 학습 확인 |
| --- | --- | --- | --- |
| decimal과 hex가 동일한 placement rule을 중복 구현하여 edge case drift 가능 | `177c8d03b353` | shared `ft_printf_write_numeric_layout`에 authoritative ordering 집중 | `12d715eba77d` 및 기존 focused regressions가 어떤 공통 path를 통과하는지 확인 |
| zero precision/prefix/zero-padding 조합이 순서를 깨뜨릴 위험 | `1fa064ca9d79` + `c5f627099ad9` | component count 분리 + normalized prefix/flag precedence | `f276ee73087c`와 `12d715eba77d`에서 서로 다른 범위로 검증 |
| `INT_MIN`을 signed type에서 직접 양수 magnitude로 만들 수 없는 portability 위험 | `ed3750fd081a` | `-(value + 1)`을 representable하게 계산한 뒤 unsigned로 전환하고 1을 더함 | 학습자가 해당 fix를 통과하는 endpoint test를 실제 suite에서 찾아 기록 |

- 학습자 기록 — 실제 failure branch와 regression assertion을 연결한 추가 설명:
  - 

## 8. Ownership / state / responsibility 변화

| 시점 | Source상 owner / boundary | Source상 responsibility 변화 | 해당 SHA 코드 근거 |
| --- | --- | --- | --- |
| 초기 decimal/hex renderer | 각 conversion module | digit 생성과 field placement를 함께 소유하여 유사 rule이 중복 |  |
| `177c8d03b353` 이후 | conversion module vs shared layout | conversion은 prefix/prepared digits/length/zero fact를 공급하고 shared layout이 suppression, precision, padding, ordering, failure propagation을 소유 |  |
| signed magnitude | decimal conversion | layout과 분리된 value-to-magnitude 경계에서 `INT_MIN` portability를 책임 |  |

## 9. Thread 최종 상태

- Source가 확정한 도달점: numeric placement가 하나의 shared layout invariant로 수렴하고, signed endpoint 및 project-specific pointer/precision boundary까지 후속 fix와 tests로 보강된 상태입니다.
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
