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
- **직전 관련 상태:** stack model과 operation은 있지만 argv를 `t_stack`으로 만드는 parser가 없었습니다.
- **이 commit의 구현 역할:** `f36ad8899b5f:src/parser.c:parse_token`이 optional sign 뒤에 최소 한 자리 ASCII digit을 요구하고, 더 넓은 정수형 accumulator로 decimal magnitude를 누적합니다. 양수 한계는 `INT_MAX`, 음수 한계는 `INT_MAX + 1`이므로 `-2147483648`은 허용하고 그 밖의 범위 초과는 거절합니다.
- **핵심 state transition 또는 boundary:** `parse_arguments`는 인자 수만큼 A를 한 번 할당하고 각 token을 `values[index]`와 `ranks[index]` 양쪽에 임시로 복사한 뒤 size를 채웁니다. 인자가 없으면 allocation 없는 empty stack 성공입니다.
- **failure/no-op/edge:** `+`/`-`만 있는 문자열, 비 ASCII digit, suffix, 범위 초과가 실패합니다. allocation 뒤 어느 token에서든 실패하면 `stack_free`로 두 배열을 모두 해제하고 실패를 반환합니다.
- **이후 연결:** `3bfb465ebdb1`이 한 argv 안의 복수 token을 허용하고, `e09cf45e21cd`가 mirror rank를 실제 dense rank로 교체합니다.
- **Thread의 다음 관련 commit:** `3bfb465ebdb1`은 count pass와 fill pass가 같은 whitespace grammar를 공유해 exact capacity를 어떻게 보장하는가?

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
- **직전 관련 상태:** 각 argv가 정확히 하나의 정수 token이어야 했습니다. 따라서 `"3 2"`처럼 quoted group이나 tab/newline을 포함한 입력을 처리하지 못했습니다.
- **이 commit의 구현 역할:** `3bfb465ebdb1:src/parser.c:is_space`가 space, tab, newline, vertical tab, form feed, carriage return을 구분자로 정의합니다. 첫 pass는 각 argv의 `[start,end)` token span 수를 세고, 두 번째 pass는 같은 span을 `parse_token`에 직접 전달합니다.
- **핵심 state transition 또는 boundary:** 전체 token 수를 먼저 얻어 A를 exact capacity로 한 번만 할당하며, substring을 별도로 소유하지 않습니다. 빈 argv는 다른 token이 있으면 무시되지만 제공된 모든 argv에서 token 수가 0이면 오류입니다.
- **failure/no-op/edge:** token conversion 실패 시 이미 할당된 A를 `stack_free`합니다. 이 SHA의 count/index는 아직 `int`이므로 매우 큰 논리 token 수의 narrowing 위험은 남습니다.
- **이후 연결:** `e09cf45e21cd`가 채워진 값에 uniqueness와 dense rank를 부여하고, `049ecd429548`이 count와 allocation byte 계산의 타입 범위를 보강합니다.
- **Thread의 다음 관련 commit:** `e09cf45e21cd`는 arbitrary signed values를 원래 순서를 잃지 않고 `0..n-1` rank permutation으로 어떻게 바꾸는가?

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
- **이 commit 직전 상태:** `3bfb465ebdb1`은 strict token grammar와 exact token capacity를 제공하지만 `ranks[i] == values[i]`인 mirror 상태였습니다. duplicate도 허용했습니다.
- **해결하려던 문제:** tiny/radix sorter가 signed 32-bit 값 자체 대신 입력 크기로 제한된 비음수 순위를 다뤄야 했고, 각 원소가 유일한 최종 위치를 가져야 했습니다.
- **기존 설계가 충분하지 않았던 이유:** 원본 값에 직접 bit radix를 적용하면 음수 표현과 전체 32비트를 처리해야 합니다. mirror rank는 최대값이 입력 크기와 무관하고, duplicate가 있으면 `0..n-1`의 unique permutation과 단일 정렬 목표를 만들 수 없습니다.
- **핵심 결정:** `e09cf45e21cd:src/parser.c:assign_ranks`가 원본 `values`를 임시 배열에 복사해 `qsort`하고, 인접 값이 같으면 실패하며, 각 원본 값의 lower-bound index를 `ranks`에 씁니다. comparator는 뺄셈 overflow를 피하려고 관계 비교 결과만 반환합니다.

```c
/* e09cf45e21cd:src/parser.c:compare_ints */
return ((*left > *right) - (*left < *right));
```

- **state / invariant / ownership / lifecycle 변화:** parser 성공 후 `values`는 원본 정수를 유지하고 `ranks`는 `0..n-1`의 permutation이 됩니다. 임시 sorted buffer는 `assign_ranks`가 생성하고 성공·duplicate 실패 모두에서 해제합니다. `parse_arguments`는 rank assignment 실패를 받으면 A의 두 영구 buffer도 해제해 caller에 partial stack을 넘기지 않습니다.
- **failure scenario:** subtraction comparator는 `INT_MAX - INT_MIN`에서 overflow할 수 있고, duplicate 검사를 건너뛰면 같은 rank가 여러 원소에 배정될 수 있습니다. lower-bound가 잘못되면 value order와 rank order가 어긋나 radix가 rank를 정렬해도 원본 값은 정렬되지 않습니다.
- **이 commit이 보장하는 것:** unique input 크기 `n`에 대해 각 rank가 정확히 한 번 나타나고 `values[i] < values[j]`이면 `ranks[i] < ranks[j]`입니다. 예를 들어 `[30,-5,10]`은 sorted copy `[-5,10,30]`, rank `[2,0,1]`이 됩니다.
- **아직 보장하지 않는 것:** 이 SHA 자체에는 parser test가 없고, 거대한 token count와 `capacity * sizeof(int)`의 representability guard도 없습니다. sorting command의 correctness 역시 별도 Thread가 검증합니다.
- **후속 fix/test:** `4cc9783286c0`과 `44a4da8bc63d`가 accepted/rejected CLI grammar와 duplicate를 검증합니다. `049ecd429548`은 token count narrowing과 allocation byte overflow 위험을 수정합니다. Thread 4의 independent replay가 rank 기반 sorter의 최종 값 정렬을 간접 확인합니다.
- **Thread의 다음 관련 commit:** `4cc9783286c0`은 parser의 내부 rank 배열을 직접 보지 않고 어떤 public CLI 관찰로 grammar와 uniqueness를 검증하는가?

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
- **대상 production invariant:** accepted argv는 generator가 성공하고 그 command stream을 checker가 `OK`로 판정하며, invalid argv는 public error protocol을 지켜야 합니다.
- **재현하는 failure/boundary:** mixed `['3 2','1']`, no-argument success와 duplicate, int overflow, `12a`, sign-only `+`, zero-token argv, argv 경계를 넘는 duplicate를 사용합니다.
- **test technique:** Python CLI integration test입니다. generator stdout을 그대로 product checker stdin에 연결합니다.
- **통과하는 production path:** Python subprocess → `push_swap main` → `parse_arguments`/rank assignment → sort/output → `checker main` → 같은 parser와 command replay입니다.
- **이 테스트가 증명하는 것:** 나열된 valid/invalid 외부 입력에서 status, stdout, exact `Error\n`, checker verdict가 의도대로임을 확인합니다.
- **이 테스트가 증명하지 않는 것:** 내부 rank bijection을 직접 검사하지 않고 generator/checker가 parser와 operation을 공유합니다. 모든 whitespace·numeric spelling·크기 overflow·allocation failure도 다루지 않습니다.
- **성격:** 대표 acceptance/rejection을 묶은 broad CLI integration regression입니다.
- **막는 후속 회귀:** quoted token 분할 실패, duplicate 누락, invalid input에서 command를 일부 출력하는 변경, 오류 stream/status 변경을 막습니다.

#### 학습자가 복원할 구현 기록 — B
- **직전 관련 상태:** parser와 rank assignment는 있었지만 public executable 기준의 정상·오류 증거가 없었습니다.
- **이 commit의 구현 역할:** `tests/run_tests.py`와 Make `test` 경로를 추가해 parser 결과를 generator와 checker를 통해 관찰합니다.
- **핵심 state transition 또는 boundary:** valid 입력은 command stream을 생성하고 checker가 최종 state를 판정하며, invalid 입력은 sort/replay로 진입하지 않고 status 1·empty stdout·`Error\n`로 끝납니다.
- **failure/no-op/edge:** no-argument `push_swap`은 status 0과 빈 출력입니다. zero-token argument가 제공된 경우는 오류입니다.
- **이후 연결:** `44a4da8bc63d`가 numeric/whitespace/no-values stdin 경계를 더 세밀하게 확장합니다.
- **Thread의 다음 관련 commit:** `44a4da8bc63d`는 같은 grammar에서 허용되는 여러 zero/sign/whitespace 표기와 no-values checker behavior를 어떻게 분리하는가?

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
- **대상 production invariant:** strict ASCII integer grammar, 여섯 C whitespace의 동일 tokenization, `INT_MIN`/`INT_MAX` 경계, no-values checker의 stdin non-consumption입니다.
- **재현하는 failure/boundary:** `+7`, `-0`, leading zero, empty argv 혼합, 모든 C whitespace, exact endpoints를 허용하고, whitespace-only, 4096자리 decimal, non-ASCII digit, 반복·혼합 sign, 서로 다른 zero spelling duplicate를 거절합니다. no-values checker에는 `sa\n`이 든 seekable stdin을 줍니다.
- **test technique:** timeout이 있는 deterministic CLI boundary test와 file-position observation입니다.
- **통과하는 production path:** accepted helper는 generator→checker를 통과하고, rejected helper는 parser error path를 관찰합니다. no-values case는 checker `main`의 argc early return까지만 통과합니다.
- **이 테스트가 증명하는 것:** 나열된 lexical 경계와 no-values에서 stdin offset이 0으로 유지됨을 확인합니다. child timeout은 hang을 failure로 만듭니다.
- **이 테스트가 증명하지 않는 것:** `INT_MAX`개 token이나 byte-size overflow처럼 현실적으로 거대한 입력, allocation/read/write fault, 모든 Unicode 입력을 exhaustively 다루지 않습니다.
- **성격:** deterministic CLI edge regression입니다.
- **막는 후속 회귀:** locale digit 허용, whitespace 집합 축소, endpoint off-by-one, no-values checker가 command stdin을 읽는 변경을 막습니다.

#### 학습자가 복원할 구현 기록 — B
- **직전 관련 상태:** 기본 accepted/rejected parser cases는 있었지만 여러 동치 표기와 정확한 외부 경계가 충분히 고정되지 않았습니다.
- **이 commit의 구현 역할:** 허용되는 표기와 거절되는 표기를 확장하고 모든 subprocess에 timeout을 적용하며, no-values checker의 stdin consumption을 file position으로 검사합니다.
- **핵심 state transition 또는 boundary:** no-values는 parser·reader allocation과 command loop 전에 정상 반환하므로 stdin이 그대로 남습니다.
- **failure/no-op/edge:** signed zero는 numeric value가 같으므로 두 spelling을 함께 주면 duplicate로 거절됩니다. 빈 argv 하나는 다른 token이 있으면 허용되지만 whitespace-only 전체 입력은 오류입니다.
- **이후 연결:** `049ecd429548`은 이 테스트들이 직접 만들기 어려운 count/byte representability 위험을 코드 guard로 닫습니다.
- **Thread의 다음 관련 commit:** `049ecd429548`은 lexical validity 이후 logical count와 allocation byte 수를 각각 어느 타입 경계에서 거절하는가?

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
- **기존 가정:** `3bfb465ebdb1` 계열 코드는 string index와 token count를 `int`로 누적하고, `stack_init`은 양수 capacity라면 곧바로 `capacity * sizeof(int)`를 allocation size로 사용했습니다.
- **실제 failure 또는 위험:** 실제 token 수가 `INT_MAX`를 넘으면 count가 stack model의 `int`에 들어가지 않습니다. 또한 `capacity`가 표현 가능해도 byte 곱셈이 `size_t`를 넘으면 작은 크기로 wrap되어 이후 fill이 allocation 밖에 쓸 수 있습니다.
- **root cause:** 논리 개수의 표현 범위(`int`)와 memory byte 수의 표현 범위(`size_t`)를 서로 다른 단계에서 검증하지 않고, narrow type로 scan/count한 뒤 곱셈을 신뢰한 것이 원인입니다.
- **수정된 invariant/decision:** scan position과 per-argument count는 `size_t`로 유지하고, aggregate count는 `INT_MAX` 이하임을 확인한 뒤에만 `int` capacity로 변환합니다. `stack_init`은 두 allocation 전에 `capacity <= SIZE_MAX / sizeof(int)`를 확인합니다.
- **실제 수정 코드:** `049ecd429548:src/parser.c:count_arguments`는 `argument_count > (size_t)INT_MAX - count`를 실패 조건으로 사용합니다. `049ecd429548:src/stack.c:stack_init`의 핵심 guard는 다음과 같습니다.

```c
/* 049ecd429548:src/stack.c:stack_init */
if ((size_t)capacity > (size_t)-1 / sizeof(int))
    return (0);
```

- **regression test:** 이 commit의 changed-file 목록에는 test 변경이 없습니다. `44a4da8bc63d`의 4096자리 decimal 등은 lexical magnitude를 다루지만 `INT_MAX`개 token이나 `SIZE_MAX` 곱셈을 직접 재현하지 않으므로 이 fix의 정확한 overflow branch를 실행 증명하지 않습니다.

#### 학습자가 복원할 핵심 기록 — A
- **직전 관련 상태와 문제:** grammar와 ordinary boundary는 검증됐지만, 매우 큰 입력의 count/narrowing 및 allocation-size 산술은 별도 전제가 없었습니다.
- **주요 boundary/decision:** parser의 logical token domain을 `size_t`로 세다가 model이 수용할 수 있는 `INT_MAX`에서 명시적으로 거절하고, model allocation은 byte 곱셈 representability를 다시 검사합니다.
- **state / ownership / failure 변화:** 성공 state는 바뀌지 않습니다. 실패는 allocation 전에 발생하므로 partial buffer ownership이 생기지 않거나, 기존 all-or-nothing cleanup으로 종료됩니다.
- **보장 / 비보장:** count cast와 `sizeof(int)` 곱셈 wrap으로 인한 under-allocation을 막습니다. 운영체제가 큰 정상 allocation을 거절하는 경우는 여전히 allocator failure로 처리하며, 이 SHA에는 direct regression test가 없습니다.
- **후속 검증 또는 수정 연결:** 별도 post-fix test는 source에 지정되지 않았습니다. Thread 6의 allocation fault sweep은 allocator가 `NULL`을 반환하는 cleanup을 다루지만 이 산술 guard 자체의 경계 입력을 대체하지 않습니다.
- **Thread 내 다음 commit:** 없음. Thread 최종 상태에서 이 commit의 남은 역할을 정리합니다.

## 6. Invariant ledger

| Invariant / contract | 처음 도입 | 강화 | 부족함이 드러난 지점 | fix | regression / evidence | 학습자 확인 메모 |
| --- | --- | --- | --- | --- | --- | --- |
| parser construction all-or-nothing | f36ad8899b5f | 3bfb465ebdb1, e09cf45e21cd | - | - | 4cc9783286c0, 44a4da8bc63d | token 실패는 `stack_free`, rank temporary는 성공·중복 실패 모두 free, rank 실패는 A까지 free합니다. CLI tests는 invalid input에서 빈 stdout과 `Error\n`을 확인합니다. |
| dense rank bijection `0..n-1` | e09cf45e21cd | - | - | - | 4cc9783286c0 및 sorting verification으로 간접 확인 | sorted copy의 adjacent duplicate reject 후 각 원본 value의 lower-bound index를 rank로 사용하므로 unique input에서 permutation과 order preservation이 성립합니다. |
| logical count / allocation byte representability | - | - | 049ecd429548 이전 설계의 잠재 위험 | 049ecd429548 | source는 별도 post-fix regression commit을 지정하지 않음 | aggregate count를 cast 전에 `INT_MAX`와 비교하고, `stack_init`이 `SIZE_MAX / sizeof(int)`를 넘는 capacity를 allocation 전에 거절합니다. |

## 7. Failure → Fix → Test 연결

| Failure / risk | 기존 또는 선택한 대응 | Fix commit | Test / evidence | 학습자 root-cause 기록 |
| --- | --- | --- | --- | --- |
| 잘못된 sign/digit 또는 `int` 범위 초과 | f36ad8899b5f의 numeric parser | - | 4cc9783286c0 / 44a4da8bc63d | optional sign 뒤 digit 필수, ASCII digit만 허용, 부호별 magnitude limit을 누적 전에 검사합니다. |
| duplicate input | e09cf45e21cd의 sorted-copy duplicate rejection | - | 4cc9783286c0 / 44a4da8bc63d | 정렬된 임시 copy에서 인접 equality를 검사하므로 argv 경계나 zero spelling과 무관하게 같은 numeric value를 거절합니다. |
| token 수 narrowing 또는 `capacity * sizeof(int)` overflow | 049ecd429548 | 049ecd429548 | 직접 regression coverage 존재 여부를 해당 SHA에서 확인 | 원인은 scan/count와 model/allocator의 타입 범위를 구분하지 않은 것입니다. fix는 `size_t` scan, `INT_MAX` aggregate guard, byte multiplication guard를 각각 둡니다. test 변경은 없습니다. |

## 8. Ownership / state / responsibility 변화

| 대상 | 이 Thread 시작 시 | 변화 commit | 이 Thread 종료 시 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| parser가 생성하는 stack A | parser 없음 | f36ad8899b5f → e09cf45e21cd → 049ecd429548 | unique values와 dense ranks를 소유하며 모든 실패에서 empty/해제 상태만 caller에 남김 | `049ecd429548:src/parser.c:parse_arguments` |
| temporary sorted copy | 없음 | e09cf45e21cd | rank assignment 동안만 parser가 소유하고 모든 결과에서 해제 | `e09cf45e21cd:src/parser.c:assign_ranks` |
| argv token span | argv 전체를 단일 token으로 해석 | 3bfb465ebdb1, 049ecd429548 | C whitespace로 찾은 `[start,end)` view이며 별도 allocation 없음; index는 `size_t` | `049ecd429548:src/parser.c` token scan helpers |
| stack allocation byte calculation | capacity 기반 직접 곱셈 | 049ecd429548 | representability 확인 뒤 두 동일 크기 buffer 할당 | `049ecd429548:src/stack.c:stack_init` |

## 9. Thread 최종 상태
- **Source 기준 최종 상태:** `049ecd429548` 시점의 parser는 모든 argv에서 여섯 C whitespace를 기준으로 token span을 두 번 순회하고, optional sign과 ASCII decimal 및 `int` 범위를 엄격히 검사합니다. 전체 token 수가 model의 `int` capacity에 들어가고 allocation byte가 `size_t`에 표현될 때만 A를 구성합니다. unique values는 sorted temporary와 lower-bound로 `0..n-1` dense rank가 되며, 어느 실패에서도 partial ownership을 반환하지 않습니다.
- **남아 있는 한계 / 다른 Thread로 넘어가는 책임:** count/byte safety fix에는 직접 regression test가 없습니다. parser tests는 public grammar를 넓게 확인하지만 내부 rank permutation과 극단적 count branch를 직접 관찰하지 않습니다. 정렬 결과와 독립 replay는 Thread 3·4, allocator 실패 cleanup은 Thread 6이 담당합니다. 이 환경에서는 checkout 제한으로 테스트를 실행하지 않았고 코드·test assertion만 확인했습니다.

## 10. 최종 architecture 또는 execution flow 정리
- Source-derived flow anchor: `argv/whitespace scan → signed integer parse → exact-size stack allocation → duplicate rejection → dense rank assignment → size-safety hardening`
- **학습자 최종 flow:** `049ecd429548:src/parser.c`의 count pass가 `size_t`로 token 수를 계산하고 `INT_MAX`를 넘으면 거절합니다 → `stack_init`이 byte 곱셈을 검증하고 A의 두 buffer를 할당합니다 → fill pass가 각 `[start,end)`를 `parse_token`으로 읽어 original values를 채웁니다 → `e09cf45e21cd:assign_ranks`가 sorted copy를 만들고 duplicate를 거절한 뒤 lower-bound rank를 씁니다 → temporary를 해제하고 완성 A를 caller에 넘기거나 모든 owned buffer를 정리합니다.
- **실제 코드 삽입:** 핵심 코드는 overflow 없는 comparator, lower-bound rank assignment, `argument_count > INT_MAX - count`, `capacity > SIZE_MAX / sizeof(int)`의 두 단계 크기 guard입니다. 후자의 최소 구문은 `049ecd429548:src/stack.c:stack_init`에 위와 같이 기록했습니다.

## 11. 학습 완료 자가 점검
- [x] Thread commit 순서를 source와 동일하게 유지했습니다.
- [x] 모든 commit에서 지정된 SHA의 코드를 직접 확인했습니다.
- [x] final HEAD를 과거 commit 설명에 소급 사용하지 않았습니다.
- [x] Source-confirmed fact와 직접 코드 확인 결과를 구분했습니다.
- [x] S/A commit은 decision, invariant, ownership/failure, 후속 evidence까지 추적했습니다.
- [x] B commit은 Thread 흐름에서 맡는 구현 역할과 필요한 state/boundary만 충분히 확인했습니다.
- [x] test commit마다 production invariant, failure/boundary, technique, production path, 증명/비증명 범위를 구분했습니다.
- [x] fix commit은 기존 가정 → failure/risk → root cause → 수정 invariant → 실제 코드 → regression evidence 순서로 연결했습니다.
- [x] Invariant ledger와 Failure → Fix → Test 표를 실제 코드 근거로 채웠습니다.
- [x] 별도 프로젝트 재학습 없이 이 Thread의 설계 → 구현 → 실패/위험 → 수정/검증 흐름을 commit history에 근거해 설명할 수 있습니다.
