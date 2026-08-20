# Thread: Parallel stack state and operation invariants

## 1. Thread 목표
- **Source significance:** The thread progresses from representation to shared transition architecture, then to complete command semantics and two complementary levels of evidence. The decisive judgment is not any individual `memmove`; it is that original values and dense ranks remain one logical element across both stacks, allowing the sorter to reason about ranks while the checker and tests retain the original-value association.
- **학습 목표:** 병렬 `values`/`ranks` 표현이 어떻게 하나의 논리 원소를 구성하고, 모든 명령이 그 결합과 전체 원소 보존을 유지하는지 실제 commit 코드로 복원합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문
- `t_stack`의 live range, `size`, `capacity`, 두 버퍼의 ownership은 어떤 계약으로 묶여 있는가?
- silent primitive와 emit 가능한 wrapper의 경계가 generator와 checker의 공통 의미를 어떻게 만든는가?
- `swap`, `push`, `rotate`, `reverse rotate`가 두 배열을 항상 같은 논리 이동으로 처리하는가?
- 불충분한 stack에서 no-op이 되는 명령과 exact transition은 테스트에서 어떻게 분리 검증되는가?
- 보존 불변식 테스트와 exact-state 테스트가 각각 무엇을 증명하고 무엇을 놓치는가?

## 3. 완료 기준
- 해당 SHA의 `t_stack` 필드와 초기화/해제 경로를 코드 인용으로 설명할 수 있습니다.
- 11개 명령을 pair preservation, size 변화, capacity 유지 관점에서 추적할 수 있습니다.
- emit/no-emit 경계의 caller/callee와 generator/checker 재사용 이유를 실제 호출 경로로 설명할 수 있습니다.
- 보존 테스트와 exact-state/no-op 테스트의 증명 범위를 구분할 수 있습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Source-confirmed role |
| --- | --- | --- | --- | --- | --- |
| 1 | `96b5324448e4` | feat(model): 배열 기반 스택 상태를 구현 | S | ARCH, CORE, STACK_STATE | Establishes the parallel value/rank stack representation, ownership model, and completion predicate. |
| 2 | `c0de1a1b18bb` | feat(operation): 스택 교환 연산을 구현 | A | CORE, STACK_STATE, INTEGRATION | Introduces pair-preserving state transitions and the emit/no-emit wrapper boundary. |
| 3 | `73d2deb30224` | feat(operation): 스택 간 이동 연산을 구현 | B | CORE, STACK_STATE | Adds cross-stack push while conserving logical elements. |
| 4 | `745ec72850d2` | feat(operation): 스택 정방향 회전을 구현 | B | CORE, STACK_STATE | Adds forward rotation within the same representation. |
| 5 | `68dfd1b1fb58` | feat(operation): 스택 역방향 회전을 구현 | B | CORE, STACK_STATE | Completes the instruction vocabulary with reverse rotation. |
| 6 | `86364d27baac` | test(operation): 값과 순위의 보존 불변식을 검증 | A | TEST, STACK_STATE, RISK | Verifies pair association, element conservation, size bounds, and sequences across all commands. |
| 7 | `7eb6890c2c13` | test(operation): 정확한 상태 전이와 no-op을 검증 | B | TEST, STACK_STATE, EDGE | Locks down exact states and insufficient-stack no-op behavior. |

### Source에서 직접 연결된 invariant / engineering difficulty
- **Critical invariants**
  - `values[i]` and `ranks[i]` always describe the same logical element; operations must move them together.
  - Across A and B, every input pair is present exactly once, total active size is conserved, and each stack remains within capacity.
- **Major engineering difficulties**
  - Maintaining value-rank pairing and total-element conservation while array-backed push and rotation operations perform overlapping `memmove` operations.

## 5. Commit별 학습 기록

> 모든 코드 확인은 반드시 해당 commit SHA 시점에서 수행합니다. final HEAD의 구현을 소급해 해석하지 않습니다.

### `96b5324448e4` — feat(model): 배열 기반 스택 상태를 구현
- **Importance:** S
- **Tags:** ARCH, CORE, STACK_STATE
- **Source-confirmed role:** Establishes the parallel value/rank stack representation, ownership model, and completion predicate.
- **Classification summary:** Defines parallel value/rank arrays, stack ownership, capacity, and sorted-state predicates.

#### Source-confirmed context
- **Problem:** The project needs one representation that can serve parsing, command generation, silent checker replay, sortedness checks, and resource cleanup. Sorting can use relative order, but the implementation must not lose the original integer associated with that order.
- **Decision:** Represent each stack as parallel `values` and `ranks` arrays with explicit `size` and `capacity`, and make stack initialization, cleanup, sortedness, and complete-state checks part of the model boundary.
- **Why it mattered:** Every later operation moves these arrays together, every sorter reads ranks, both executables own stacks through the same lifecycle, and the invariant tests are written around this representation. The decision determines both correctness obligations and the later physical cost of array-backed push and rotation.
- **What changed:** The commit adds `t_stack`, empty and allocated initialization, paired cleanup, rank-based sortedness, the A-sorted/B-empty completion predicate, and the first strict C99 build structure.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only 96b5324448e4`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `96b5324448e4` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- `t_stack`의 `values`, `ranks`, `size`, `capacity` 필드와 active prefix가 실제로 어떻게 해석되는지 확인합니다.
- `stack_init`, `stack_init_empty`, `stack_free`에서 두 allocation의 성공/실패 순서와 cleanup/reset 순서를 추적합니다.
- 정렬 판정과 complete-state 판정 함수가 `ranks` 및 B-empty 조건을 어떻게 사용하고 있는지 확인합니다.
- non-positive capacity 경로가 empty lifecycle과 어떻게 합쳐지는지 확인합니다.
- 해당 SHA의 Makefile에서 strict C99/warning scaffold와 model source가 정상 build에 포함되는 위치를 확인합니다.
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
- **Thread의 다음 관련 commit:** `c0de1a1b18bb`와 비교할 질문을 한 문장으로 작성합니다.

### `c0de1a1b18bb` — feat(operation): 스택 교환 연산을 구현
- **Importance:** A
- **Tags:** CORE, STACK_STATE, INTEGRATION
- **Source-confirmed role:** Introduces pair-preserving state transitions and the emit/no-emit wrapper boundary.
- **Classification summary:** Implements pair-preserving swap and introduces optionally emitting operation wrappers.

#### Source-confirmed context
- **Problem:** The generator must mutate stacks and emit commands, while the checker must replay the same command semantics without emitting them. Separate implementations would create an avoidable semantic divergence risk.
- **Decision:** Split the silent stack transition from an operation wrapper controlled by an `emit` flag, beginning with `sa`, `sb`, and `ss`, while always moving value and rank entries together.
- **Why it mattered:** The pattern becomes the integration boundary for every later command. `push_swap` uses the wrappers as state transition plus serialization, and checker uses the same wrappers as silent replay. Combined commands also remain one public instruction even when they apply two internal transitions.
- **What changed:** The commit adds `stack_swap`, optional command emission, and the single- and dual-stack swap wrappers, then registers the operation module as common code.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only c0de1a1b18bb`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `c0de1a1b18bb` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- `stack_swap`이 top의 `values`와 `ranks`를 같은 인덱스 단위로 교환하는지 확인합니다.
- `sa`, `sb`, `ss` wrapper의 caller/callee와 `emit` 분기를 추적합니다.
- `ss`가 두 stack mutation을 수행하되 public command는 한 번만 emit하는 위치를 확인합니다.
- size < 2에서 primitive와 wrapper가 어떤 상태/출력 결과를 만드는지 확인합니다.
- 직전 관련 SHA `96b5324448e4`의 model contract가 operation API에서 어떤 전제로 사용되는지 비교합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### 학습자가 복원할 핵심 기록 — A
- **직전 관련 상태와 문제:** [parent 또는 직전 관련 SHA의 실제 코드로 작성]
- **주요 boundary/decision:** [subsystem, ownership, failure, integration 경계 중 이 commit의 핵심을 작성]
- **state / ownership / failure 변화:** [변경 전 → 변경 후를 실제 symbol과 함께 작성]
- **보장 / 비보장:** [이 commit의 책임 경계와 남은 risk를 분리해 작성]
- **후속 검증 또는 수정 연결:** [같은 thread 또는 source가 명시한 cross-thread evidence와 연결]
- **Thread의 다음 관련 commit:** `73d2deb30224`와 비교할 질문을 한 문장으로 작성합니다.

### `73d2deb30224` — feat(operation): 스택 간 이동 연산을 구현
- **Importance:** B
- **Tags:** CORE, STACK_STATE
- **Source-confirmed role:** Adds cross-stack push while conserving logical elements.
- **Classification summary:** Implements `pa` and `pb` by moving the top pair between fixed-capacity array stacks.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only 73d2deb30224`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `73d2deb30224` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- `stack_push`의 source top 저장, destination/source `memmove`, pair copy, 두 `size` update 순서를 확인합니다.
- destination/source의 `values`와 `ranks`가 같은 논리 이동을 하는지 인덱스별로 기록합니다.
- empty source no-op branch와 `pa`/`pb` wrapper의 `emit` 처리 방식을 확인합니다.
- operation 중 새 allocation이 없는지, 기존 stack buffers만 재사용하는지 확인합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### 학습자가 복원할 구현 기록 — B
- **직전 관련 상태:** [이 기능이 들어오기 전 필요한 최소 코드 상태를 작성]
- **이 commit의 구현 역할:** [Source-confirmed role을 실제 변경 함수/호출 관계로 확인해 작성]
- **핵심 state transition 또는 boundary:** [이 commit에서 필요한 부분만 기록]
- **failure/no-op/edge:** [source에 관련 경계가 있으면 실제 branch를 기록. 없으면 억지로 추가하지 않음]
- **이후 연결:** [다음 관련 commit이 이 결과를 어떻게 사용하거나 검증하는지 기록]
- **Thread의 다음 관련 commit:** `745ec72850d2`와 비교할 질문을 한 문장으로 작성합니다.

### `745ec72850d2` — feat(operation): 스택 정방향 회전을 구현
- **Importance:** B
- **Tags:** CORE, STACK_STATE
- **Source-confirmed role:** Adds forward rotation within the same representation.
- **Classification summary:** Adds forward rotation for one or both stacks while preserving value-rank pairing.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only 745ec72850d2`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `745ec72850d2` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- forward rotation에서 top pair 저장 → active prefix shift → tail 복원의 정확한 범위를 확인합니다.
- size 0/1 no-op과 `ra`/`rb`/`rr` wrapper를 추적합니다.
- `rr`의 두 내부 transition과 한 번의 public emission이 분리되는 지점을 확인합니다.
- capacity와 total logical element 수가 변하지 않는지 코드 기준으로 기록합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### 학습자가 복원할 구현 기록 — B
- **직전 관련 상태:** [이 기능이 들어오기 전 필요한 최소 코드 상태를 작성]
- **이 commit의 구현 역할:** [Source-confirmed role을 실제 변경 함수/호출 관계로 확인해 작성]
- **핵심 state transition 또는 boundary:** [이 commit에서 필요한 부분만 기록]
- **failure/no-op/edge:** [source에 관련 경계가 있으면 실제 branch를 기록. 없으면 억지로 추가하지 않음]
- **이후 연결:** [다음 관련 commit이 이 결과를 어떻게 사용하거나 검증하는지 기록]
- **Thread의 다음 관련 commit:** `68dfd1b1fb58`와 비교할 질문을 한 문장으로 작성합니다.

### `68dfd1b1fb58` — feat(operation): 스택 역방향 회전을 구현
- **Importance:** B
- **Tags:** CORE, STACK_STATE
- **Source-confirmed role:** Completes the instruction vocabulary with reverse rotation.
- **Classification summary:** Adds reverse rotation and the `rra`, `rrb`, and `rrr` command wrappers.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only 68dfd1b1fb58`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `68dfd1b1fb58` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- reverse rotation에서 last active pair 저장 → preceding pairs tail shift → top 복원의 인덱스를 확인합니다.
- size >= 2에서 forward rotation과 inverse 관계가 실제 transition으로 성립하는 예를 직접 추적합니다.
- `rra`/`rrb`/`rrr`의 optional emission 경계를 확인합니다.
- empty/single-element no-op이 checker replay에서 별도 command error를 만들지 않는지 확인합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### 학습자가 복원할 구현 기록 — B
- **직전 관련 상태:** [이 기능이 들어오기 전 필요한 최소 코드 상태를 작성]
- **이 commit의 구현 역할:** [Source-confirmed role을 실제 변경 함수/호출 관계로 확인해 작성]
- **핵심 state transition 또는 boundary:** [이 commit에서 필요한 부분만 기록]
- **failure/no-op/edge:** [source에 관련 경계가 있으면 실제 branch를 기록. 없으면 억지로 추가하지 않음]
- **이후 연결:** [다음 관련 commit이 이 결과를 어떻게 사용하거나 검증하는지 기록]
- **Thread의 다음 관련 commit:** `86364d27baac`와 비교할 질문을 한 문장으로 작성합니다.

### `86364d27baac` — test(operation): 값과 순위의 보존 불변식을 검증
- **Importance:** A
- **Tags:** TEST, STACK_STATE, RISK
- **Source-confirmed role:** Verifies pair association, element conservation, size bounds, and sequences across all commands.
- **Classification summary:** Checks pair preservation, element conservation, size bounds, and multi-operation sequences.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only 86364d27baac`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `86364d27baac` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- fixture가 5개의 distinct value-rank pair를 A/B에 어떻게 분배하는지 확인합니다.
- pair association, combined size, per-stack capacity bound, rank uniqueness를 검사하는 helper/loop를 찾습니다.
- 11개 command 각각의 isolated 실행과 all-command sequence 실행이 어떤 차이로 구성되는지 확인합니다.
- `emit = 0`을 사용해 output과 state semantics를 분리하는 지점을 확인합니다.
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

#### 학습자가 복원할 핵심 기록 — A
- **직전 관련 상태와 문제:** [parent 또는 직전 관련 SHA의 실제 코드로 작성]
- **주요 boundary/decision:** [subsystem, ownership, failure, integration 경계 중 이 commit의 핵심을 작성]
- **state / ownership / failure 변화:** [변경 전 → 변경 후를 실제 symbol과 함께 작성]
- **보장 / 비보장:** [이 commit의 책임 경계와 남은 risk를 분리해 작성]
- **후속 검증 또는 수정 연결:** [같은 thread 또는 source가 명시한 cross-thread evidence와 연결]
- **Thread의 다음 관련 commit:** `7eb6890c2c13`와 비교할 질문을 한 문장으로 작성합니다.

### `7eb6890c2c13` — test(operation): 정확한 상태 전이와 no-op을 검증
- **Importance:** B
- **Tags:** TEST, STACK_STATE, EDGE
- **Source-confirmed role:** Locks down exact states and insufficient-stack no-op behavior.
- **Classification summary:** Adds exact expected states and empty or single-element no-op cases for every operation.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only 7eb6890c2c13`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `7eb6890c2c13` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- table-driven expected state가 active `values`, `ranks`, `size`, unchanged `capacity`를 어떻게 표현하는지 확인합니다.
- 11개 command에 대한 exact postcondition 비교와 command enum/name/application 공통화 구조를 확인합니다.
- empty/single-element에서 swap/rotate no-op, empty-source push no-op 케이스를 추적합니다.
- no-op 검증이 inactive backing entries까지 확인하는지 실제 assertion을 확인합니다.
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
- **Thread 내 다음 commit:** 없음. Thread 최종 상태에서 이 commit의 남은 역할을 정리합니다.

## 6. Invariant ledger

| Invariant / contract | 처음 도입 | 강화 | 부족함이 드러난 지점 | fix | regression / evidence | 학습자 확인 메모 |
| --- | --- | --- | --- | --- | --- | --- |
| value-rank pairing | 96b5324448e4 | c0de1a1b18bb → 73d2deb30224 → 745ec72850d2 → 68dfd1b1fb58 | - | - | 86364d27baac, 7eb6890c2c13 | [해당 SHA 코드 근거 작성] |
| A/B 전체 원소 보존과 capacity 범위 | 96b5324448e4 | 73d2deb30224 및 회전 계열에서 유지 | - | - | 86364d27baac, 7eb6890c2c13 | [해당 SHA 코드 근거 작성] |

## 7. Failure → Fix → Test 연결

| Failure / risk | 기존 또는 선택한 대응 | Fix commit | Test / evidence | 학습자 root-cause 기록 |
| --- | --- | --- | --- | --- |
| 한 배열만 이동하여 value-rank association 손상 | 모든 operation이 pair를 함께 이동 | - | 86364d27baac / 7eb6890c2c13 | [실제 branch와 연결] |
| push/rotation의 size 또는 active prefix 손상 | operation state transition 규칙 | - | 86364d27baac / 7eb6890c2c13 | [실제 branch와 연결] |
| generator와 checker가 서로 다른 명령 의미를 가짐 | c0de1a1b18bb의 shared wrapper 경계 | - | 후속 independent oracle은 Thread 4의 5b7559278909 | [실제 branch와 연결] |

## 8. Ownership / state / responsibility 변화

| 대상 | 이 Thread 시작 시 | 변화 commit | 이 Thread 종료 시 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| A/B의 `values` 버퍼 | [시작 상태 확인] | [관련 SHA 기록] | [종료 상태 확인] | `[SHA:path:symbol]` |
| A/B의 `ranks` 버퍼 | [시작 상태 확인] | [관련 SHA 기록] | [종료 상태 확인] | `[SHA:path:symbol]` |
| operation primitive | [시작 상태 확인] | [관련 SHA 기록] | [종료 상태 확인] | `[SHA:path:symbol]` |
| emit 가능한 command wrapper | [시작 상태 확인] | [관련 SHA 기록] | [종료 상태 확인] | `[SHA:path:symbol]` |

## 9. Thread 최종 상태
- **Source 기준 최종 상태:** [이 Thread의 마지막 commit까지 source가 확정한 상태를 commit map과 invariant ledger를 이용해 학습자가 한 문단으로 재구성]
- **남아 있는 한계 / 다른 Thread로 넘어가는 책임:** [source가 명시한 후속 hardening 또는 verification만 연결하고 임의의 개선안을 정답처럼 추가하지 않음]

## 10. 최종 architecture 또는 execution flow 정리
- Source-derived flow anchor: ``t_stack` 생성 → pair-preserving primitive → `sa/sb/ss`, `pa/pb`, rotate 계열 wrapper → invariant test → exact transition/no-op test`
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
