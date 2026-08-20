# Thread: Input grammar, coordinate compression, and size safety

## 1. Thread 목표
- **Source significance:** Parsing evolves from lexical validity into the normalization contract required by sorting. Coordinate compression is the turning point: arbitrary signed values become a permutation over `0..n-1`. Later tests define the external grammar precisely, and the size fix closes the remaining gap between logically counted tokens and safely allocated storage.
- **학습 목표:** 입력 문자열이 strict integer grammar를 통과해 unique dense rank permutation으로 정규화되고, 그 과정의 allocation과 크기 계산이 안전하게 닫히는 과정을 복원합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문
- 숫자 token의 sign, digit, `INT_MIN`/`INT_MAX` 경계는 어떤 계산 순서로 검증되는가?
- argv 내부 C whitespace tokenization이 왜 count pass와 fill pass로 나뉘며, 임시 substring을 만들지 않는가?
- duplicate rejection과 lower-bound rank assignment가 `0..n-1` bijection을 어떻게 만든는가?
- parser의 all-or-nothing ownership은 어느 failure branch에서 보장되는가?
- 049ecd429548이 logical token count와 allocation byte count 양쪽을 왜 따로 방어하는가?

## 3. 완료 기준
- 허용/거절 입력을 실제 parser branch와 연결할 수 있습니다.
- coordinate compression 전후의 `values`와 `ranks`를 한 입력 예제로 직접 추적할 수 있습니다.
- temporary sorted buffer의 생성/해제와 parser 실패 시 A cleanup을 코드로 확인했습니다.
- 크기 narrowing/곱셈 overflow 방어가 들어간 정확한 위치와 이전 코드의 위험을 비교했습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Source-confirmed role |
| --- | --- | --- | --- | --- | --- |
| 1 | `f36ad8899b5f` | feat(parse): 개별 인자의 부호 있는 정수를 파싱 | B | INPUT, EDGE | Establishes strict signed ASCII integer parsing and `int` range checks. |
| 2 | `3bfb465ebdb1` | feat(parse): 공백으로 결합된 인자 토큰을 처리 | B | INPUT, EDGE | Extends the grammar to mixed argv and C-whitespace token spans with exact allocation sizing. |
| 3 | `e09cf45e21cd` | feat(parse): 중복 입력을 거절하고 상대 순위를 계산 | S | CORE, INPUT, SORT | Rejects duplicates and establishes the dense order-preserving rank bijection. |
| 4 | `4cc9783286c0` | test(parser): 정상 입력과 오류 입력을 검증 | B | TEST, INPUT | Adds public parser acceptance and rejection tests. |
| 5 | `44a4da8bc63d` | test(cli): 입력 경계와 무인자 실행을 검증 | B | TEST, INPUT, EDGE | Expands boundary evidence for signs, zero spellings, whitespace, integer endpoints, timeouts, and no-argument stdin behavior. |
| 6 | `049ecd429548` | fix(parse): 토큰 수와 배열 크기 계산을 방어 | A | INPUT, EDGE, RISK | Hardens logical token counts and byte-size calculations against narrowing and overflow. |

### Source에서 직접 연결된 invariant / engineering difficulty
- **Critical invariants**
  - After parsing unique input of size `n`, ranks form a bijection over `0..n-1` and preserve the ordering of original values.
  - Parser construction is all-or-nothing, and every owned allocation is released on every exit path.

## 5. Commit별 학습 기록

> 모든 코드 확인은 반드시 해당 commit SHA 시점에서 수행합니다. final HEAD의 구현을 소급해 해석하지 않습니다.

### `f36ad8899b5f` — feat(parse): 개별 인자의 부호 있는 정수를 파싱
- **Importance:** B
- **Tags:** INPUT, EDGE
- **Source-confirmed role:** Establishes strict signed ASCII integer parsing and `int` range checks.
- **Classification summary:** Parses one signed ASCII decimal integer per argument with explicit `int` bounds.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only f36ad8899b5f`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `f36ad8899b5f` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- optional `+`/`-`, sign-only reject, ASCII digit loop를 담당하는 numeric parser를 확인합니다.
- wider accumulator와 positive/negative magnitude limit 비교 순서가 `INT_MIN`을 허용하는 방식을 추적합니다.
- no arguments가 valid empty stack으로 끝나는 control flow를 확인합니다.
- stack allocation 후 token failure가 발생했을 때 partial stack을 free하고 failure만 반환하는 경로를 확인합니다.
- 이 SHA에서 `ranks`가 아직 original values를 임시 mirror하는 위치를 기록합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### 학습자가 복원할 구현 기록 — B
- **직전 관련 상태:** [이 기능이 들어오기 전 필요한 최소 코드 상태를 작성]
- **이 commit의 구현 역할:** [Source-confirmed role을 실제 변경 함수/호출 관계로 확인해 작성]
- **핵심 state transition 또는 boundary:** [이 commit에서 필요한 부분만 기록]
- **failure/no-op/edge:** [source에 관련 경계가 있으면 실제 branch를 기록. 없으면 억지로 추가하지 않음]
- **이후 연결:** [다음 관련 commit이 이 결과를 어떻게 사용하거나 검증하는지 기록]
- **Thread의 다음 관련 commit:** `3bfb465ebdb1`와 비교할 질문을 한 문장으로 작성합니다.

### `3bfb465ebdb1` — feat(parse): 공백으로 결합된 인자 토큰을 처리
- **Importance:** B
- **Tags:** INPUT, EDGE
- **Source-confirmed role:** Extends the grammar to mixed argv and C-whitespace token spans with exact allocation sizing.
- **Classification summary:** Extends parsing to all C whitespace separators and mixed quoted or split arguments.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only 3bfb465ebdb1`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `3bfb465ebdb1` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- C whitespace 판별과 각 argv 안의 token `[start, end)` span discovery를 확인합니다.
- 첫 pass의 token count와 두 번째 pass의 direct parse/fill가 동일한 grammar를 사용하는지 확인합니다.
- temporary substring allocation 없이 exact final capacity로 stack을 한 번 할당하는 흐름을 추적합니다.
- empty argument는 허용하지만 supplied argv 전체가 zero token이면 reject하는 분기를 확인합니다.
- conversion failure 시 allocated stack cleanup을 확인합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### 학습자가 복원할 구현 기록 — B
- **직전 관련 상태:** [이 기능이 들어오기 전 필요한 최소 코드 상태를 작성]
- **이 commit의 구현 역할:** [Source-confirmed role을 실제 변경 함수/호출 관계로 확인해 작성]
- **핵심 state transition 또는 boundary:** [이 commit에서 필요한 부분만 기록]
- **failure/no-op/edge:** [source에 관련 경계가 있으면 실제 branch를 기록. 없으면 억지로 추가하지 않음]
- **이후 연결:** [다음 관련 commit이 이 결과를 어떻게 사용하거나 검증하는지 기록]
- **Thread의 다음 관련 commit:** `e09cf45e21cd`와 비교할 질문을 한 문장으로 작성합니다.

### `e09cf45e21cd` — feat(parse): 중복 입력을 거절하고 상대 순위를 계산
- **Importance:** S
- **Tags:** CORE, INPUT, SORT
- **Source-confirmed role:** Rejects duplicates and establishes the dense order-preserving rank bijection.
- **Classification summary:** Rejects duplicates and maps arbitrary values to a dense, order-preserving rank permutation.

#### Source-confirmed context
- **Problem:** The input domain contains arbitrary signed integers, but the sorting strategies need only a compact, non-negative representation of relative order. Duplicate values would make a unique target permutation undefined under the project's contract.
- **Decision:** Copy and sort the values, reject adjacent duplicates, and assign each original value the lower-bound index in the sorted copy as its rank.
- **Why it mattered:** The result is a bijection over `0..n-1` that preserves ordering. Tiny sorting can compare small relative ranks, radix sorting can traverse finite non-negative bit patterns, and the maximum required bit count depends only on input size.
- **What changed:** The parser adds an overflow-safe comparator, a binary lower-bound search, temporary sorted storage, duplicate rejection, rank assignment, and cleanup on every outcome.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only e09cf45e21cd`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `e09cf45e21cd` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- original `values` copy를 정렬하는 temporary buffer의 allocation, fill, `qsort`, free 경로를 확인합니다.
- `qsort` comparator가 subtraction이 아닌 relational result를 사용하는지 확인합니다.
- sorted copy의 adjacent equality로 duplicate를 reject하는 위치를 확인합니다.
- lower-bound binary search가 각 original value를 dense rank로 바꾸는 과정을 입력 하나로 추적합니다.
- ranking/duplicate failure의 temporary buffer와 stack cleanup 순서를 확인합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### 학습자가 복원할 핵심 기록 — S
- **이 commit 직전 상태:** [직전 관련 SHA에서 representation/API/algorithm이 어디까지 존재했는지 코드로 작성]
- **해결하려던 문제:** [Source-confirmed Problem과 실제 이전 코드의 한계를 연결해 작성]
- **기존 설계가 충분하지 않았던 이유:** [구체적 state/protocol/algorithm gap 기록]
- **핵심 결정:** [Source-confirmed Decision이 실제 코드 구조로 어떻게 나타나는지 작성]
- **state / invariant / ownership / lifecycle 변화:** [변경 전 → 변경 후를 실제 필드·소유자·호출 순서로 작성]
- **failure scenario:** [이 결정이 없거나 잘못 구현됐을 때 깨지는 구체적 경로를 작성]
- **이 commit이 보장하는 것:** [이 SHA의 code+tests 범위에서만 작성]
- **아직 보장하지 않는 것:** [후속 commit이 필요했던 부분을 source와 history에 근거해 작성]
- **후속 fix/test:** [source에서 연결되는 후속 commit과 무엇을 강화/검증하는지 기록]
- **Thread의 다음 관련 commit:** `4cc9783286c0`와 비교할 질문을 한 문장으로 작성합니다.

### `4cc9783286c0` — test(parser): 정상 입력과 오류 입력을 검증
- **Importance:** B
- **Tags:** TEST, INPUT
- **Source-confirmed role:** Adds public parser acceptance and rejection tests.
- **Classification summary:** Adds end-to-end parser acceptance and rejection cases through both executables.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only 4cc9783286c0`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `4cc9783286c0` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- Python harness가 `push_swap`의 stdout program을 checker stdin으로 전달하는 integration 흐름을 확인합니다.
- accepted mixed split/quoted input과 no-argument case가 어떤 status/stdout/stderr 조건으로 검증되는지 확인합니다.
- duplicate, overflow, suffix, sign-only, zero-token, cross-argv duplicate rejection case를 확인합니다.
- invalid case에서 status 1, empty stdout, exact `Error\n` stderr를 동시에 검사하는 assertion을 확인합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### Test commit 학습 기록
- **대상 production invariant:** [이 테스트가 직접 대상으로 삼는 production contract를 실제 assertion과 연결해 작성]
- **재현하는 failure/boundary:** [fixture 또는 injected condition이 어떤 실패/경계를 만드는지 작성]
- **test technique:** [unit / CLI integration / exhaustive enumeration / independent replay / fault injection / deterministic baseline / sanitizer 중 실제 사용 기법 기록]
- **통과하는 production path:** [실행 파일 또는 함수 entry부터 핵심 production branch까지 caller → callee 순서로 기록]
- **이 테스트가 증명하는 것:** [assertion과 관찰 가능한 결과에 근거해 작성]
- **이 테스트가 증명하지 않는 것:** [공유 구현, 입력 범위, fault 종류, resource 종류 등 실제 한계를 작성]
- **성격:** [broad integration / deterministic regression / exhaustive small-state / fault regression 중 근거와 함께 분류]
- **막는 후속 회귀:** [이 테스트가 실패해야 하는 구체적 잘못된 변경 예를 작성]

#### 학습자가 복원할 구현 기록 — B
- **직전 관련 상태:** [이 기능이 들어오기 전 필요한 최소 코드 상태를 작성]
- **이 commit의 구현 역할:** [Source-confirmed role을 실제 변경 함수/호출 관계로 확인해 작성]
- **핵심 state transition 또는 boundary:** [이 commit에서 필요한 부분만 기록]
- **failure/no-op/edge:** [source에 관련 경계가 있으면 실제 branch를 기록. 없으면 억지로 추가하지 않음]
- **이후 연결:** [다음 관련 commit이 이 결과를 어떻게 사용하거나 검증하는지 기록]
- **Thread의 다음 관련 commit:** `44a4da8bc63d`와 비교할 질문을 한 문장으로 작성합니다.

### `44a4da8bc63d` — test(cli): 입력 경계와 무인자 실행을 검증
- **Importance:** B
- **Tags:** TEST, INPUT, EDGE
- **Source-confirmed role:** Expands boundary evidence for signs, zero spellings, whitespace, integer endpoints, timeouts, and no-argument stdin behavior.
- **Classification summary:** Expands numeric, whitespace, sign, timeout, and no-argument stdin-consumption coverage.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only 44a4da8bc63d`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `44a4da8bc63d` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- accepted `+`, negative zero, leading zero, empty argv, 모든 C whitespace, exact int endpoint 케이스를 확인합니다.
- whitespace-only, long decimal, non-ASCII digit, repeated/mixed sign, duplicate zero spelling rejection을 확인합니다.
- accepted input을 두 executable로 검증하는 helper 경로와 child timeout 사용 위치를 확인합니다.
- `checker` no-values 실행이 stdin을 소비하지 않는다는 file-position check를 실제로 추적합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### Test commit 학습 기록
- **대상 production invariant:** [이 테스트가 직접 대상으로 삼는 production contract를 실제 assertion과 연결해 작성]
- **재현하는 failure/boundary:** [fixture 또는 injected condition이 어떤 실패/경계를 만드는지 작성]
- **test technique:** [unit / CLI integration / exhaustive enumeration / independent replay / fault injection / deterministic baseline / sanitizer 중 실제 사용 기법 기록]
- **통과하는 production path:** [실행 파일 또는 함수 entry부터 핵심 production branch까지 caller → callee 순서로 기록]
- **이 테스트가 증명하는 것:** [assertion과 관찰 가능한 결과에 근거해 작성]
- **이 테스트가 증명하지 않는 것:** [공유 구현, 입력 범위, fault 종류, resource 종류 등 실제 한계를 작성]
- **성격:** [broad integration / deterministic regression / exhaustive small-state / fault regression 중 근거와 함께 분류]
- **막는 후속 회귀:** [이 테스트가 실패해야 하는 구체적 잘못된 변경 예를 작성]

#### 학습자가 복원할 구현 기록 — B
- **직전 관련 상태:** [이 기능이 들어오기 전 필요한 최소 코드 상태를 작성]
- **이 commit의 구현 역할:** [Source-confirmed role을 실제 변경 함수/호출 관계로 확인해 작성]
- **핵심 state transition 또는 boundary:** [이 commit에서 필요한 부분만 기록]
- **failure/no-op/edge:** [source에 관련 경계가 있으면 실제 branch를 기록. 없으면 억지로 추가하지 않음]
- **이후 연결:** [다음 관련 commit이 이 결과를 어떻게 사용하거나 검증하는지 기록]
- **Thread의 다음 관련 commit:** `049ecd429548`와 비교할 질문을 한 문장으로 작성합니다.

### `049ecd429548` — fix(parse): 토큰 수와 배열 크기 계산을 방어
- **Importance:** A
- **Tags:** INPUT, EDGE, RISK
- **Source-confirmed role:** Hardens logical token counts and byte-size calculations against narrowing and overflow.
- **Classification summary:** Prevents token-count narrowing and allocation-size overflow before filling stack arrays.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only 049ecd429548`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `049ecd429548` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- 직전 관련 parser 코드와 비교해 string position/per-argument count가 `size_t`로 바뀐 위치를 확인합니다.
- aggregate token count가 stack model의 `int` size에 들어가는지 변환 전에 검증하는 branch를 확인합니다.
- `stack_init`에서 `capacity * sizeof(int)`의 `size_t` representability를 두 buffer allocation 전에 검사하는지 확인합니다.
- guard가 없던 이전 코드에서 wrapped count/byte size가 어떤 under-allocation으로 이어질 수 있는지 직접 계산 예로 기록합니다.
- 이 SHA에 직접 regression test 변경이 있는지 `git show --name-only`와 test diff로 확인하고, 없다면 기존 boundary tests의 coverage 한계를 기록합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### Fix chain 복원
- **기존 가정:** [직전 관련 SHA의 코드가 어떤 조건을 안전하다고 가정했는지 실제 코드로 작성]
- **실제 failure 또는 위험:** [source가 지적한 위험을 해당 이전 코드의 branch/계산과 연결해 작성]
- **root cause:** [추상적 설명이 아니라 잘못된 타입/경계/return contract/reader policy 등 실제 원인 기록]
- **수정된 invariant/decision:** [이 fix 이후 반드시 성립해야 하는 조건을 작성]
- **실제 수정 코드:** [변경 전/후 `SHA:path:symbol`과 핵심 차이를 짧게 기록]
- **regression test:** [동일 SHA 또는 후속 commit에서 직접 재현하는 test가 있으면 연결. source가 특정 test를 지정하지 않으면 임의로 있다고 쓰지 말고 확인 결과를 기록]

#### 학습자가 복원할 핵심 기록 — A
- **직전 관련 상태와 문제:** [parent 또는 직전 관련 SHA의 실제 코드로 작성]
- **주요 boundary/decision:** [subsystem, ownership, failure, integration 경계 중 이 commit의 핵심을 작성]
- **state / ownership / failure 변화:** [변경 전 → 변경 후를 실제 symbol과 함께 작성]
- **보장 / 비보장:** [이 commit의 책임 경계와 남은 risk를 분리해 작성]
- **후속 검증 또는 수정 연결:** [같은 thread 또는 source가 명시한 cross-thread evidence와 연결]
- **Thread 내 다음 commit:** 없음. Thread 최종 상태에서 이 commit의 남은 역할을 정리합니다.

## 6. Invariant ledger

| Invariant / contract | 처음 도입 | 강화 | 부족함이 드러난 지점 | fix | regression / evidence | 학습자 확인 메모 |
| --- | --- | --- | --- | --- | --- | --- |
| parser construction all-or-nothing | f36ad8899b5f | 3bfb465ebdb1, e09cf45e21cd | - | - | 4cc9783286c0, 44a4da8bc63d | [해당 SHA 코드 근거 작성] |
| dense rank bijection `0..n-1` | e09cf45e21cd | - | - | - | 4cc9783286c0 및 sorting verification으로 간접 확인 | [해당 SHA 코드 근거 작성] |
| logical count / allocation byte representability | - | - | 049ecd429548 이전 설계의 잠재 위험 | 049ecd429548 | source는 별도 post-fix regression commit을 지정하지 않음 | [해당 SHA 코드 근거 작성] |

## 7. Failure → Fix → Test 연결

| Failure / risk | 기존 또는 선택한 대응 | Fix commit | Test / evidence | 학습자 root-cause 기록 |
| --- | --- | --- | --- | --- |
| 잘못된 sign/digit 또는 `int` 범위 초과 | f36ad8899b5f의 numeric parser | - | 4cc9783286c0 / 44a4da8bc63d | [실제 branch와 연결] |
| duplicate input | e09cf45e21cd의 sorted-copy duplicate rejection | - | 4cc9783286c0 / 44a4da8bc63d | [실제 branch와 연결] |
| token 수 narrowing 또는 `capacity * sizeof(int)` overflow | 049ecd429548 | 049ecd429548 | 직접 regression coverage 존재 여부를 해당 SHA에서 확인 | [실제 branch와 연결] |

## 8. Ownership / state / responsibility 변화

| 대상 | 이 Thread 시작 시 | 변화 commit | 이 Thread 종료 시 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| parser가 생성하는 stack A | [시작 상태 확인] | [관련 SHA 기록] | [종료 상태 확인] | `[SHA:path:symbol]` |
| temporary sorted copy | [시작 상태 확인] | [관련 SHA 기록] | [종료 상태 확인] | `[SHA:path:symbol]` |
| argv token span | [시작 상태 확인] | [관련 SHA 기록] | [종료 상태 확인] | `[SHA:path:symbol]` |
| stack allocation byte calculation | [시작 상태 확인] | [관련 SHA 기록] | [종료 상태 확인] | `[SHA:path:symbol]` |

## 9. Thread 최종 상태
- **Source 기준 최종 상태:** [이 Thread의 마지막 commit까지 source가 확정한 상태를 commit map과 invariant ledger를 이용해 학습자가 한 문단으로 재구성]
- **남아 있는 한계 / 다른 Thread로 넘어가는 책임:** [source가 명시한 후속 hardening 또는 verification만 연결하고 임의의 개선안을 정답처럼 추가하지 않음]

## 10. 최종 architecture 또는 execution flow 정리
- Source-derived flow anchor: `argv/whitespace scan → signed integer parse → exact-size stack allocation → duplicate rejection → dense rank assignment → size-safety hardening`
- **학습자 최종 flow:** [각 화살표마다 실제 `SHA:path:symbol`을 붙여 호출·state mutation·ownership·failure 경로를 다시 작성]
- **실제 코드 삽입:** [핵심 decision을 설명하는 최소 코드만 해당 SHA에서 인용. full function 또는 final HEAD 코드 복사는 피함]

## 11. 학습 완료 자가 점검
- [ ] Thread commit 순서를 source와 동일하게 유지했습니다.
- [ ] 모든 commit에서 지정된 SHA의 코드를 직접 확인했습니다.
- [ ] final HEAD를 과거 commit 설명에 소급 사용하지 않았습니다.
- [ ] Source-confirmed fact와 직접 코드 확인 결과를 구분했습니다.
- [ ] S/A commit은 decision, invariant, ownership/failure, 후속 evidence까지 추적했습니다.
- [ ] B commit은 Thread 흐름에서 맡는 구현 역할과 필요한 state/boundary만 충분히 확인했습니다.
- [ ] test commit마다 production invariant, failure/boundary, technique, production path, 증명/비증명 범위를 구분했습니다.
- [ ] fix commit은 기존 가정 → failure/risk → root cause → 수정 invariant → 실제 코드 → regression evidence 순서로 연결했습니다.
- [ ] Invariant ledger와 Failure → Fix → Test 표를 실제 코드 근거로 채웠습니다.
- [ ] 별도 프로젝트 재학습 없이 이 Thread의 설계 → 구현 → 실패/위험 → 수정/검증 흐름을 commit history에 근거해 설명할 수 있습니다.
