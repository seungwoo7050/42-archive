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
  - 
- 학습자 기록 — 이 commit이 맡는 구현 책임:
  - 
- 학습자 기록 — 해당 SHA에서 확인한 핵심 상태/flow 변화:
  - 
- 학습자 기록 — 이후 commit이 보강하거나 대체하는 부분:
  - 

### 해당 SHA에서 확인할 코드
- main loop가 `%` field를 parser에 넘기고 parser가 반환한 cursor로 traversal을 전진시키는 지점을 기록합니다.
- parse failure가 output context의 sticky error로 승격되는 path를 확인합니다.
- dedicated dispatch가 아직 없기 때문에 temporary rendering이 percent와 available specifier를 echo하는 코드를 찾고, 무엇이 아직 final syntax policy가 아닌지 기록합니다.
- parser와 main loop의 responsibility를 “field consumption”과 “overall sequencing/termination”으로 실제 code boundary에 대응시킵니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - 
- 학습자 기록 — 필요한 최소 코드 발췌:
```c

```

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 

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
- conversion dispatcher의 실제 함수와 main loop call site를 찾습니다.
- `c`, `s`, `%` 각각에서 `va_arg` 수행 여부를 확인하고, argument를 소비하는 경우 어떤 promoted type/argument form으로 renderer에 전달되는지 기록합니다.
- null string이 `(null)` representation으로 mapping되는 branch와 shared output path를 확인합니다.
- unknown field가 아직 prior literal fallback을 유지하는 branch를 찾아 final syntax validation이 아직 아님을 기록합니다.
- entry point에 type-specific `va_arg`가 남아 있는지 diff로 확인합니다.
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
  - 
- 학습자 기록 — 이 commit이 맡는 구현 책임:
  - 
- 학습자 기록 — 해당 SHA에서 확인한 핵심 상태/flow 변화:
  - 
- 학습자 기록 — 이후 commit이 보강하거나 대체하는 부분:
  - 

### 해당 SHA에서 확인할 코드
- dispatch에 `d`, `i`, `u` case가 추가되는 위치와 각 `va_arg` type을 확인합니다.
- 하나의 unsigned digit routine이 signed magnitude와 unsigned value 모두에 사용되는 caller/callee 관계를 기록합니다.
- least-significant-first로 fixed local buffer에 digits를 만든 뒤 reverse emission하는 loop를 추적합니다.
- negative `int`를 `long`으로 widen한 뒤 negation하는 magnitude path와 sign emission 분리를 확인합니다.
- 이 시점의 `INT_MIN` 처리에 `long`이 `int`보다 넓다는 portability assumption이 남아 있음을 코드와 type model로 기록합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - 
- 학습자 기록 — 필요한 최소 코드 발췌:
```c

```

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 

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
  - 
- 학습자 기록 — 이 commit이 맡는 구현 책임:
  - 
- 학습자 기록 — 해당 SHA에서 확인한 핵심 상태/flow 변화:
  - 
- 학습자 기록 — 이후 commit이 보강하거나 대체하는 부분:
  - 

### 해당 SHA에서 확인할 코드
- dispatch의 `x`, `X`, `p` case와 specifier별 `va_arg` type을 기록합니다.
- base-16 routine이 lowercase/uppercase digit alphabet을 선택하는 지점을 확인합니다.
- pointer가 `uintptr_t`로 conversion된 뒤 numeric formatting으로 넘어가는 경로를 추적합니다.
- `0x` prefix가 address digits와 별도 representation으로 출력되는 코드와 이후 width/padding에 사용할 수 있는 boundary를 기록합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - 
- 학습자 기록 — 필요한 최소 코드 발췌:
```c

```

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 

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

## 6. Invariant ledger

Source가 확정한 변화 축을 아래에 배치했습니다. “실제 코드 근거”는 학습자가 해당 SHA를 읽고 채웁니다.

| Invariant / concern | 도입 또는 초기 상태 | 강화 / 수정 | 고정한 검증 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| field representation | `7984ddf2dd57`에서 `t_format` 도입 | `9e6d785628f3`에서 main traversal과 연결 | 이후 dispatch/rendering이 raw text 대신 normalized field 사용 |  |
| argument extraction | `03c3e6e09fa1`에서 dispatch가 `va_arg` type selection 소유 | `95d6613a1c72`와 `93c883070a1b`에서 decimal/hex/pointer로 확대 | 학습자가 specifier별 정확한 promoted type을 코드에서 기록 |  |
| flag conflict states | parser가 flag bit를 idempotent하게 수집 | `c5f627099ad9`에서 conflicting flag normalization 추가 | renderer가 canonical flag set을 받는지 실제 호출 흐름으로 확인 |  |

### 학습자 추가 기록

- source가 명시한 invariant 범위 안에서만 필요한 행을 추가합니다. 새 invariant를 확정 사실처럼 만들지 않습니다.
- 추가 기록:
  - 

## 7. Failure → Fix → Test 연결

| 기존 failure / risk | Fix / change | 수정 decision | Test / 학습 확인 |
| --- | --- | --- | --- |
| width/precision decimal accumulation overflow | `7984ddf2dd57` | `INT_MAX` 기준 pre-multiplication check로 field parse 실패 처리 | 이 Thread에서는 parser code를 확인하고 whole-call no-output 검증은 Thread 5에서 다시 추적 |
| 각 renderer가 raw field를 독립 해석할 경우 grammar/type 책임이 분산될 위험 | `7984ddf2dd57` + `03c3e6e09fa1` | normalized field + typed dispatch로 책임 분리 | 후속 conversion commits에서 동일 boundary 재사용 여부 확인 |
| conflicting flag를 renderer마다 다시 해석할 위험 | `c5f627099ad9` | `-`가 `0`을, `+`가 space를 제거하도록 한 번 정규화 | numeric layout Thread와 public-boundary tests에서 상호작용을 다시 확인 |

- 학습자 기록 — 실제 failure branch와 regression assertion을 연결한 추가 설명:
  - 

## 8. Ownership / state / responsibility 변화

| 시점 | Source상 owner / boundary | Source상 responsibility 변화 | 해당 SHA 코드 근거 |
| --- | --- | --- | --- |
| raw format cursor | main traversal + parser | main loop는 전체 sequencing, parser는 한 field 소비와 next unread position을 책임 |  |
| normalized field state | `t_format` | flags, width, optional precision, specifier를 renderer가 다시 parse하지 않도록 전달 |  |
| variadic extraction | dispatch | specifier별 promoted type 선택과 renderer routing을 한 경계에서 수행 |  |
| conversion-specific representation | text/decimal/hex renderer | 각 conversion은 자신의 text/digit 생성에 집중하고 shared output path를 사용 |  |

## 9. Thread 최종 상태

- Source가 확정한 도달점: parsing, argument extraction, rendering이 분리되고, normalized field와 typed dispatch가 공통 boundary가 되며 parser-side flag normalization이 renderer의 conflicting states를 줄인 상태입니다.
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
