# String precision changes from output truncation to bounded access

## 1. Thread 목표

`%s` precision이 “출력 후 truncation”이 아니라 “caller object를 읽을 수 있는 최대 범위”까지 제한하는 memory-access contract로 교정되는 과정을 복원합니다.

### Source에서 확정된 significance

이 history는 출력 길이 제한과 메모리 접근 제한이 다르다는 점을 드러냅니다. precision은 단순한 사후 truncation이 아니라 renderer가 caller object를 얼마나 멀리 읽을 수 있는지 제한하며, focused regression이 다시 full `strlen` 방식으로 돌아가는 것을 방지합니다.

### 이 Thread에 명시적으로 연결되는 source invariant / engineering difficulty

- Invariant: `%s`는 precision이 있을 때 그 limit보다 더 멀리 읽지 않으며, 그 readable range 밖의 NUL terminator를 요구하지 않습니다.
- Engineering difficulty: `%s` precision을 단순 output truncation rule로 구현하지 않고 memory access 자체를 bound하는 문제입니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 초기 implementation은 string의 full NUL-terminated length를 언제 계산하고 precision을 언제 적용하는가?
- 왜 `%.3s`는 NUL terminator가 없는 정확히 3-byte readable object에도 안전해야 하는가?
- fix는 출력 call만 막는 것이 아니라 length discovery 자체를 어떻게 바꾸는가?
- non-NUL three-byte regression은 ordinary NUL-terminated string test가 잡지 못한 무엇을 드러내는가?

## 3. 완료 기준

- `8e1cee3ed7f0`과 `9ac825379180`의 string length discovery를 실제 코드로 비교할 수 있습니다.
- precision이 width 계산과 output length뿐 아니라 memory read bound에도 사용됨을 설명할 수 있습니다.
- `e040e69db535`의 source object, precision, expected bytes, production path를 추적할 수 있습니다.
- functional regression만으로 보장되는 것과 sanitizer 아래에서 추가로 관찰 가능한 것을 구분할 수 있습니다.

## 4. Commit map

| SHA | Subject | Importance | Tags | Source-defined role |
| --- | --- | --- | --- | --- |
| `8e1cee3ed7f0` | feat(text): 문자열 정밀도와 퍼센트 0 채움 적용 | `B` | `FORMAT, EDGE` | Initially computes the full string length and truncates the emitted length afterward. |
| `9ac825379180` | fix(text): 문자열 정밀도 범위까지만 읽기 | `A` | `FORMAT, EDGE, RISK` | Moves the precision bound into the scan itself so memory beyond the permitted object range is never read. |
| `e040e69db535` | test(text): NUL 없는 제한 문자열 회귀 검증 | `B` | `FORMAT, TEST, EDGE` | Uses a non-NUL-terminated three-byte object to prove that `%.3s` requires only those three readable bytes. |

## 5. Commit별 학습 기록

> 원칙: 아래 기록은 final HEAD가 아니라 각 항목의 정확한 SHA에서 작성합니다. source가 확정하지 않은 파일명/함수명은 현재 골격에서 추측하지 않습니다.

## 5.1 `8e1cee3ed7f0` — feat(text): 문자열 정밀도와 퍼센트 0 채움 적용

- Importance: `B`
- Tags: `FORMAT, EDGE`
- Most Important Commits 목록: 미포함
- Thread 내 역할: Initially computes the full string length and truncates the emitted length afterward.
- Commit Classification summary: Adds string truncation and zero padding for the project's percent extension.
- Importance 근거: The semantics matter, but the initial string implementation still scans to NUL before truncating and is corrected later; this is an intermediate feature step.

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
- string renderer가 full NUL-terminated length를 먼저 계산하는 helper/call을 찾습니다.
- precision을 full length 계산 이후 emitted length에 적용하는 조건을 기록합니다.
- post-precision length가 width calculation에 사용되는 지점을 확인합니다.
- 이 SHA에서 precision이 output limit이지만 memory-read bound는 아닌 이유를 실제 scan loop로 설명합니다.
- 직후 `9ac825379180`과 비교할 수 있도록 scan termination condition을 그대로 기록합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - 
- 학습자 기록 — 필요한 최소 코드 발췌:
```c

```

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 

## 5.2 `9ac825379180` — fix(text): 문자열 정밀도 범위까지만 읽기

- Importance: `A`
- Tags: `FORMAT, EDGE, RISK`
- Most Important Commits 목록: 포함
- Thread 내 역할: Moves the precision bound into the scan itself so memory beyond the permitted object range is never read.
- Commit Classification summary: Stops the string scan at precision instead of finding NUL first and truncating afterward.
- Importance 근거: The previous approach could read beyond the caller's valid bounded object even when the requested output was safe. This root-cause fix restores the memory-access contract at the renderer boundary.

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
- fix 직전 full scan → truncate 순서를 다시 확인하고 failure/risk의 root cause를 “length discovery 자체가 unbounded”로 기록합니다.
- fix SHA에서 local length scan이 NUL 또는 precision limit 중 먼저 만나는 조건에서 멈추는 loop를 기록합니다.
- 같은 bounded length가 width calculation과 output length 양쪽에 전달되는 path를 추적합니다.
- precision outside의 byte가 readable하지 않아도 되는 contract가 어떤 memory access 조건으로 보장되는지 설명합니다.
- 후속 `e040e69db535`가 이 exact boundary를 어떤 object로 재현하는지 연결합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - 
- 학습자 기록 — 필요한 최소 코드 발췌:
```c

```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전:
  - 이후:

### Failure → Fix 추적
- 기존 가정/상태: precision은 full string length를 구한 뒤 emitted length만 줄여도 된다는 구현
- 실제 failure 또는 위험: precision 범위만 readable한 caller object에서 NUL을 찾기 위해 범위 밖을 읽을 수 있음
- source가 지목한 root cause: precision이 length discovery가 아니라 post-scan truncation에만 적용됨
- 수정된 decision/invariant: NUL 또는 precision 중 먼저 도달하면 scan을 멈추고 같은 bounded length를 width/output에 사용
- 학습자 기록 — 실제 수정 코드:
  - 
- 학습자 기록 — regression test 연결:
  - source에 직접 연결된 후속 test가 있으면 SHA와 test case를 기록하고, 직접 대응 test가 명시되지 않았다면 그렇게 구분해서 기록합니다.

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 

## 5.3 `e040e69db535` — test(text): NUL 없는 제한 문자열 회귀 검증

- Importance: `B`
- Tags: `FORMAT, TEST, EDGE`
- Most Important Commits 목록: 미포함
- Thread 내 역할: Uses a non-NUL-terminated three-byte object to prove that `%.3s` requires only those three readable bytes.
- Commit Classification summary: Formats a three-byte non-NUL array with a matching string precision.
- Importance 근거: The focused regression proves the bounded-read fix, but it is supporting evidence for the preceding A-level correction.

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
- test source가 NUL terminator 없는 정확히 3-byte array를 어떻게 구성하는지 기록합니다.
- format `%.3s`와 expected `snprintf` result를 만드는 code를 확인합니다.
- project implementation이 exactly three bytes를 emit하는 assertion과 captured return/count를 확인합니다.
- 이 case가 `9ac825379180`의 bounded scan production path를 통과하는지 call path를 기록합니다.
- sanitizer와 함께 실행할 때 out-of-bounds regression이 더 직접적으로 관찰될 수 있다는 범위와, 이 한 case가 모든 string precision 조합을 증명하지는 않는다는 한계를 기록합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - 
- 학습자 기록 — 필요한 최소 코드 발췌:
```c

```

### Test commit 학습 기록
- production invariant 대상: `%s` precision이 memory access와 emitted length를 같은 bound로 제한
- 재현하는 failure / boundary: NUL 없는 3-byte object에서 precision 3인데 full NUL scan이 object 밖으로 진행하는 regression
- test technique: non-NUL bounded object + `snprintf` expected result + functional comparison; memory instrumentation과 결합 시 OOB 관찰 강화
- 통과하는 production path: string conversion → precision-aware length discovery → width/output
- 이 test가 source상 증명하려는 것: 이 exact bounded object case에서 exactly three bytes를 요구하고 bounded-scan fix의 regression target을 제공함
- 이 test가 증명하지 않는 것: 모든 string length/precision/width 조합의 memory safety를 단독으로 증명하지 않습니다.
- 분류: focused deterministic regression입니다.
- 후속 회귀 방지 역할: string length helper가 다시 full NUL scan 방식으로 돌아가는 회귀를 막습니다.
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
| string precision 의미 | `8e1cee3ed7f0`에서 full length를 먼저 찾고 emitted length를 이후 truncate | `9ac825379180`에서 scan 자체를 precision으로 bound | `e040e69db535`에서 non-NUL 3-byte object로 회귀 고정 |  |

### 학습자 추가 기록

- source가 명시한 invariant 범위 안에서만 필요한 행을 추가합니다. 새 invariant를 확정 사실처럼 만들지 않습니다.
- 추가 기록:
  - 

## 7. Failure → Fix → Test 연결

| 기존 failure / risk | Fix / change | 수정 decision | Test / 학습 확인 |
| --- | --- | --- | --- |
| visible output은 3 byte인데 full NUL scan이 caller object 밖을 읽을 수 있음 | `9ac825379180` | length discovery가 NUL 또는 precision에서 즉시 종료 | `e040e69db535`의 non-NUL bounded object case |

- 학습자 기록 — 실제 failure branch와 regression assertion을 연결한 추가 설명:
  - 

## 8. Ownership / state / responsibility 변화

| 시점 | Source상 owner / boundary | Source상 responsibility 변화 | 해당 SHA 코드 근거 |
| --- | --- | --- | --- |
| 초기 | string renderer의 length discovery | full logical string length를 먼저 구한 뒤 output만 truncate |  |
| fix 이후 | precision-aware length discovery | 읽기 범위와 width/output에 쓰일 effective length를 같은 bounded scan이 결정 |  |

## 9. Thread 최종 상태

- Source가 확정한 도달점: string precision이 emitted-byte 제한과 memory-access 제한을 동시에 정의하고, precision 범위 밖 NUL terminator를 요구하지 않는 상태입니다.
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
