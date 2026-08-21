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
- **이 commit 직전 상태:** 이 SHA의 parent에는 `t_stack`, 공통 헤더, stack model source, strict C99 Makefile이 없었습니다. 따라서 입력을 담을 소유 객체도, 정렬 완료를 판정할 공통 함수도 존재하지 않았습니다.
- **해결하려던 문제:** 원본 정수와 정렬 알고리즘이 사용할 상대 순위를 같은 논리 원소로 유지하면서 A/B 두 스택을 동일 API로 생성·해제·검사할 표현이 필요했습니다.
- **기존 설계가 충분하지 않았던 이유:** 단일 값 배열만 두면 이후 radix가 값 자체의 부호와 폭을 직접 처리해야 하고, 별도 rank 배열을 두더라도 이동 규칙이 정의되지 않으면 원본 값과 순위의 대응이 쉽게 깨집니다. 또한 `size`와 `capacity`가 없으면 active prefix와 할당 범위를 구분할 수 없습니다.
- **핵심 결정:** `96b5324448e4:include/push_swap.h:t_stack`에서 두 `int *` 버퍼와 `size`/`capacity`를 하나의 구조체에 묶고, `96b5324448e4:src/stack.c:stack_init_empty`를 모든 생명주기의 기준 상태로 사용했습니다.

```c
/* 96b5324448e4:include/push_swap.h:t_stack */
typedef struct s_stack
{
    int *values;
    int *ranks;
    int size;
    int capacity;
}   t_stack;
```

- **state / invariant / ownership / lifecycle 변화:** `stack_init_empty`는 두 포인터를 `NULL`, 두 정수를 0으로 만듭니다. `stack_init`은 먼저 empty 상태를 만든 뒤 capacity가 양수일 때 두 배열을 할당하고, 어느 한쪽이라도 실패하면 `stack_free`로 이미 얻은 버퍼까지 해제해 다시 empty 상태로 돌아갑니다. 성공하면 호출자가 두 버퍼를 소유하며 active range는 `[0, size)`이고 allocated range는 `[0, capacity)`입니다. `stack_free`는 두 버퍼를 모두 해제한 뒤 같은 empty 상태를 복원합니다.
- **failure scenario:** 두 번째 배열 할당 실패 때 첫 번째 배열만 남기거나, 해제 후 필드를 초기화하지 않으면 이후 오류 경로에서 누수·중복 해제·stale capacity가 발생할 수 있습니다. 한편 `values`와 `ranks`를 다른 길이로 다루면 이후 operation이 같은 인덱스를 논리 원소로 취급할 수 없습니다.
- **이 commit이 보장하는 것:** capacity가 양수인 정상 초기화에서는 동일 capacity의 두 버퍼를 한 `t_stack`이 소유하고, 실패 또는 해제 뒤에는 empty 상태가 됩니다. `stack_is_sorted`는 active `ranks`만 비내림차순인지 검사하며, `stack_is_complete_sorted`는 A 정렬과 B empty를 동시에 요구합니다. non-positive capacity는 할당 없는 valid empty stack으로 처리됩니다.
- **아직 보장하지 않는 것:** parser가 실제 pair를 채우는 방법, 두 배열을 함께 이동하는 명령, capacity를 넘지 않는다는 동작 증거, allocation byte overflow 방어는 아직 없습니다. 후자는 `049ecd429548`에서 보강됩니다.
- **후속 fix/test:** `c0de1a1b18bb`부터 모든 primitive가 두 배열을 함께 이동합니다. `86364d27baac`은 pair/원소/범위 보존을, `7eb6890c2c13`은 exact state와 no-op을 검증합니다. allocation 실패 cleanup은 Thread 6의 `63969f770a21`에서 fault sweep으로 별도 검증됩니다.
- **Thread의 다음 관련 commit:** `c0de1a1b18bb`는 이 model의 pair invariant를 실제 swap transition과 emit/no-emit API에서 어떻게 보존하는가?

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
- **직전 관련 상태와 문제:** `96b5324448e4`에는 병렬 배열 model만 있고 명령 의미가 없었습니다. generator와 checker가 앞으로 각각 swap을 구현하면 동일 command가 서로 다른 상태 전이를 만들 위험이 있었습니다.
- **주요 boundary/decision:** `c0de1a1b18bb:src/operations.c:stack_swap`은 출력 없는 state primitive이고, `op_sa`/`op_sb`/`op_ss`는 `emit`에 따라 command text를 추가하는 public wrapper입니다. `op_ss`는 A와 B에 primitive를 각각 적용한 뒤 `ss\n`을 한 번만 출력합니다.
- **state / ownership / failure 변화:** `stack_swap`은 size가 2 미만이면 즉시 반환하며 소유권·size·capacity를 바꾸지 않습니다. 그 외에는 top 두 `values`와 top 두 `ranks`를 같은 순서로 교환합니다. 이 SHA의 wrapper와 출력 helper는 `void`라 출력 실패를 표현하지 못하며, no-op 상태에서도 `emit=1`이면 명령 문자열은 출력됩니다.
- **보장 / 비보장:** swap 계열은 active top pair의 정확한 교환과 combined command의 단일 emission을 보장합니다. 아직 push/rotate/reverse-rotate가 없고, exact postcondition이나 출력 실패는 검증되지 않았습니다.
- **후속 검증 또는 수정 연결:** `73d2deb30224`~`68dfd1b1fb58`가 같은 wrapper 패턴을 전체 명령으로 확장합니다. `86364d27baac`과 `7eb6890c2c13`이 state semantics를 검증하고, 출력 실패 반환은 `315f4b91779b`에서 추가됩니다.
- **Thread의 다음 관련 commit:** `73d2deb30224`의 cross-stack 이동은 두 배열과 두 `size`를 어떤 순서로 갱신해 전체 원소 수를 보존하는가?

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
- **직전 관련 상태:** swap 계열만 존재하고 A/B 사이에 원소를 옮길 방법은 없었습니다.
- **이 commit의 구현 역할:** `73d2deb30224:src/operations.c:stack_push`가 source top pair를 지역 변수에 보존하고, destination active prefix를 오른쪽으로 한 칸 민 뒤 index 0에 pair를 씁니다. source는 나머지 prefix를 왼쪽으로 당기고 `dst->size++`, `src->size--`로 마칩니다. `op_pa`는 B→A, `op_pb`는 A→B를 연결합니다.
- **핵심 state transition 또는 boundary:** `values`와 `ranks`에 같은 길이·방향의 `memmove`를 적용하므로 pair가 분리되지 않고, 두 size의 합은 변하지 않습니다. operation 중 새 allocation은 없습니다.
- **failure/no-op/edge:** `src->size == 0`이면 primitive는 상태를 그대로 둡니다. 다만 이 SHA의 emitting wrapper는 no-op 여부와 무관하게 합법 command를 출력합니다. destination capacity 검사는 없으며 두 스택이 전체 입력 크기의 buffer를 갖는다는 상위 전제를 사용합니다.
- **이후 연결:** 회전 계열이 같은 배열 표현을 완성하고, `86364d27baac`이 모든 command에서 pair·원소 수·capacity 범위를 검사합니다.
- **Thread의 다음 관련 commit:** `745ec72850d2`는 같은 스택 내부의 순환 이동에서 active prefix와 tail을 어떻게 보존하는가?

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
- **직전 관련 상태:** top pair 교환과 A/B 간 push만 있고, top을 bottom으로 보내는 명령은 없었습니다.
- **이 commit의 구현 역할:** `745ec72850d2:src/operations.c:stack_rotate`가 index 0의 value/rank를 저장하고 `[1, size)`를 `[0, size-1)`로 이동한 뒤 저장 pair를 `size - 1`에 복원합니다. `op_ra`, `op_rb`, `op_rr`가 이를 노출합니다.
- **핵심 state transition 또는 boundary:** size와 capacity는 그대로이고 active pair의 순환 순서만 바뀝니다. `rr`는 두 primitive를 호출하지만 public output은 `rr\n` 한 줄입니다.
- **failure/no-op/edge:** size가 0 또는 1이면 primitive는 no-op입니다. 이 시점에는 출력 API가 실패를 반환하지 않습니다.
- **이후 연결:** `68dfd1b1fb58`의 reverse rotate와 서로 역연산 관계를 이루며, 두 테스트 commit이 exact transition과 no-op을 잠급니다.
- **Thread의 다음 관련 commit:** `68dfd1b1fb58`은 마지막 pair를 top으로 올릴 때 겹치는 이동 범위를 어떻게 계산하는가?

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
- **직전 관련 상태:** forward rotate까지 있어 top→bottom은 가능하지만 bottom→top 명령이 없었습니다.
- **이 commit의 구현 역할:** `68dfd1b1fb58:src/operations.c:stack_reverse_rotate`가 `size - 1`의 pair를 저장하고 `[0, size-1)`를 한 칸 오른쪽으로 이동한 뒤 index 0에 복원합니다. `op_rra`, `op_rrb`, `op_rrr`가 전체 명령 어휘를 완성합니다.
- **핵심 state transition 또는 boundary:** 예를 들어 `[a,b,c]`에 rotate를 적용하면 `[b,c,a]`, 이어 reverse rotate를 적용하면 `[a,b,c]`가 됩니다. 두 배열에 같은 처리를 하므로 pair·size·capacity가 유지됩니다.
- **failure/no-op/edge:** size 0/1에서는 no-op이며 command 자체는 합법입니다. 후속 checker의 exact dispatch는 이를 invalid command로 바꾸지 않고 silent no-op으로 재생합니다.
- **이후 연결:** `86364d27baac`이 11개 command 전체의 보존 성질을, `7eb6890c2c13`이 정확한 배열 상태와 inactive entry 보존까지 확인합니다.
- **Thread의 다음 관련 commit:** `86364d27baac`의 보존 검사는 exact ordering 오류까지 잡는가, 아니면 pair·개수·범위만 잡는가?

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
- **대상 production invariant:** `values[i]`와 `ranks[i]`의 고정 대응, A/B 합계 5, 각 stack의 `0 <= size <= capacity`, rank 0..4의 정확히 한 번 존재입니다. fixture는 A에 `(40,4),(10,1),(30,3)`, B에 `(20,2),(0,0)`을 둡니다.
- **재현하는 failure/boundary:** 각 command를 초기 fixture에 독립 적용하고, 별도로 11개 command를 연속 적용해 겹치는 `memmove`, 양 stack size 변경, combined operation의 조합을 통과시킵니다.
- **test technique:** C 함수 단위 invariant test입니다. `emit=0`으로 stdout을 배제하고 shared production operation을 직접 호출합니다.
- **통과하는 production path:** `tests/operation_invariants.c`의 command 적용 helper → `op_*` wrapper → `stack_swap`/`stack_push`/`stack_rotate`/`stack_reverse_rotate`입니다.
- **이 테스트가 증명하는 것:** 각 관찰 지점에서 알려진 five-pair 집합이 유실·복제·오결합되지 않고 size/capacity 범위를 지키며, 단일 command와 한 복합 sequence가 invariant를 유지한다는 점입니다.
- **이 테스트가 증명하지 않는 것:** 명령별 exact post-state, no-op에서 backing array가 전혀 바뀌지 않는지, 모든 가능한 state, emitted text, write failure는 증명하지 않습니다. production operation과 같은 C 구현을 호출하므로 독립 oracle도 아닙니다.
- **성격:** 대표 fixture를 사용한 deterministic invariant regression입니다. exhaustive state-space test는 아닙니다.
- **막는 후속 회귀:** value만 이동하고 rank를 빠뜨리는 변경, push에서 size 한쪽만 갱신하는 변경, active 원소를 유실·복제하는 잘못된 `memmove`를 막습니다.

#### 학습자가 복원할 핵심 기록 — A
- **직전 관련 상태와 문제:** 11개 명령 구현은 완성됐지만 pair와 전체 원소 보존을 자동으로 확인하는 증거가 없었습니다.
- **주요 boundary/decision:** exact 배열을 먼저 고정하지 않고, 어떤 합법 transition에서도 유지되어야 하는 집합·pair·size invariant를 공통 검사 함수로 분리했습니다.
- **state / ownership / failure 변화:** production state나 ownership은 바뀌지 않습니다. Makefile에 operation test executable과 `test` 실행 경로가 추가되어 shared operation의 상태 변경을 출력 없이 관찰할 수 있게 됐습니다.
- **보장 / 비보장:** 위 invariant는 대표 fixture의 모든 command와 한 sequence에서 검증되지만, 서로 다른 잘못된 순열처럼 보존 성질만 만족하는 오류는 통과할 수 있습니다.
- **후속 검증 또는 수정 연결:** `7eb6890c2c13`이 command별 exact-state/no-op 검사를 추가해 이 빈틈을 보완하고, Thread 4의 `5b7559278909`가 Python 독립 replay로 shared-implementation risk를 낮춥니다.
- **Thread의 다음 관련 commit:** `7eb6890c2c13`은 보존 검사를 통과할 수 있는 잘못된 순서를 어떤 expected-state 비교로 잡는가?

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
- **대상 production invariant:** 각 command의 정확한 `values`/`ranks` active 순서, 두 `size`, 변경되지 않는 capacity, insufficient-stack 명령의 완전한 no-op입니다.
- **재현하는 failure/boundary:** 11개 command의 expected A/B state를 table로 고정하고, capacity 2의 작은 fixture로 empty/single-element swap·rotate와 empty-source push를 실행합니다.
- **test technique:** table-driven C unit regression입니다. command enum/name/application을 공통화하고 exact array comparison을 사용합니다.
- **통과하는 production path:** command table → operation wrapper(`emit=0`) → 해당 primitive → `stack_has_exact_state` 또는 `small_stack_is_unchanged`입니다.
- **이 테스트가 증명하는 것:** 선택 fixture에서 command별 정확한 순서·size·capacity를 확인하며, no-op에서는 active range뿐 아니라 inactive backing entries도 그대로임을 확인합니다.
- **이 테스트가 증명하지 않는 것:** 모든 크기와 모든 배열 상태, emitted stream, I/O 실패, allocation 실패, 독립 semantics는 증명하지 않습니다.
- **성격:** deterministic exact-state 및 edge/no-op regression입니다.
- **막는 후속 회귀:** rotate 방향 반전, source/destination 혼동, combined command 한쪽 누락, no-op에서 backing array를 건드리는 변경을 막습니다.

#### 학습자가 복원할 구현 기록 — B
- **직전 관련 상태:** `86364d27baac`은 pair·개수·범위는 잡지만 순서가 잘못돼도 같은 pair 집합이면 통과할 수 있었습니다.
- **이 commit의 구현 역할:** command별 expected state와 작은 no-op fixture를 추가해 transition의 정확한 결과를 고정합니다.
- **핵심 state transition 또는 boundary:** active 배열, size, capacity를 함께 비교하고, no-op 검사는 inactive slot까지 비교합니다.
- **failure/no-op/edge:** A/B 모두 empty, 한쪽만 single-element인 push, single-element swap/rotate 등 불충분 state를 합법 no-op으로 확인합니다.
- **이후 연결:** Thread 1의 state semantics는 이 commit으로 두 수준의 증거를 갖추지만, 독립 correctness와 I/O 실패는 Thread 4와 6이 맡습니다.
- **Thread 내 다음 commit:** 없음. Thread 최종 상태에서 이 commit의 남은 역할을 정리합니다.

## 6. Invariant ledger

| Invariant / contract | 처음 도입 | 강화 | 부족함이 드러난 지점 | fix | regression / evidence | 학습자 확인 메모 |
| --- | --- | --- | --- | --- | --- | --- |
| value-rank pairing | 96b5324448e4 | c0de1a1b18bb → 73d2deb30224 → 745ec72850d2 → 68dfd1b1fb58 | - | - | 86364d27baac, 7eb6890c2c13 | `96b5324448e4:include/push_swap.h:t_stack`에서 병렬 배열로 도입되고, 각 primitive가 동일 인덱스·동일 이동을 수행합니다. 첫 테스트는 pair 집합을, 둘째 테스트는 exact 배열을 확인합니다. |
| A/B 전체 원소 보존과 capacity 범위 | 96b5324448e4 | 73d2deb30224 및 회전 계열에서 유지 | - | - | 86364d27baac, 7eb6890c2c13 | push는 두 size를 반대 방향으로 한 번씩 갱신하고 회전은 size를 바꾸지 않습니다. 테스트는 합계 5와 각 capacity bound 및 exact size를 확인합니다. |

## 7. Failure → Fix → Test 연결

| Failure / risk | 기존 또는 선택한 대응 | Fix commit | Test / evidence | 학습자 root-cause 기록 |
| --- | --- | --- | --- | --- |
| 한 배열만 이동하여 value-rank association 손상 | 모든 operation이 pair를 함께 이동 | - | 86364d27baac / 7eb6890c2c13 | primitive마다 value와 rank에 대응되는 swap/copy/`memmove`가 쌍으로 존재합니다. 하나를 누락하면 mapping 또는 exact-state assertion이 실패합니다. |
| push/rotation의 size 또는 active prefix 손상 | operation state transition 규칙 | - | 86364d27baac / 7eb6890c2c13 | push는 저장→destination shift/copy→source shift→두 size 갱신 순서이고, rotation은 size를 유지한 채 active prefix만 순환합니다. 합계·bounds·exact-state 검사가 이를 잠급니다. |
| generator와 checker가 서로 다른 명령 의미를 가짐 | c0de1a1b18bb의 shared wrapper 경계 | - | 후속 independent oracle은 Thread 4의 5b7559278909 | 두 실행 파일이 같은 `op_*`를 emit on/off로 재사용합니다. 공유 결함 가능성은 남으므로 Python list model이 별도 oracle이 됩니다. |

## 8. Ownership / state / responsibility 변화

| 대상 | 이 Thread 시작 시 | 변화 commit | 이 Thread 종료 시 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| A/B의 `values` 버퍼 | 소유 객체와 lifecycle이 없음 | 96b5324448e4 | 각 stack이 capacity 크기의 버퍼를 소유하고 active prefix를 operation이 이동하며 `stack_free`가 해제 | `96b5324448e4:src/stack.c:stack_init/stack_free` |
| A/B의 `ranks` 버퍼 | 없음 | 96b5324448e4 및 operation commits | `values`와 동일 lifetime·인덱스 이동을 갖는 병렬 버퍼 | `96b5324448e4:include/push_swap.h:t_stack`, `68dfd1b1fb58:src/operations.c` |
| operation primitive | 없음 | c0de1a1b18bb → 68dfd1b1fb58 | swap/push/rotate/reverse-rotate가 출력 없이 pair state를 변경 | `68dfd1b1fb58:src/operations.c:stack_*` |
| emit 가능한 command wrapper | 없음 | c0de1a1b18bb → 68dfd1b1fb58 | 11개 wrapper가 primitive를 재사용하고 `emit`으로 generator/checker 동작을 분리 | `68dfd1b1fb58:src/operations.c:op_*` |

## 9. Thread 최종 상태
- **Source 기준 최종 상태:** `7eb6890c2c13` 시점에는 A/B가 각각 `values`와 `ranks`의 병렬 buffer, `size`, `capacity`를 가지며 11개 command가 두 배열을 같은 논리 이동으로 처리합니다. push만 두 stack의 size를 반대 방향으로 바꾸고 나머지는 size를 유지합니다. shared wrapper의 `emit`은 generator의 serialization과 checker의 silent replay를 같은 transition에 연결합니다. 보존 invariant test와 exact-state/no-op test가 서로 다른 오류 범위를 담당합니다.
- **남아 있는 한계 / 다른 Thread로 넘어가는 책임:** 이 Thread에는 fix commit이 없고 테스트는 shared C operation을 직접 사용합니다. 입력이 유효한 pair/rank를 만드는 책임은 Thread 2, 정렬 sequence의 독립 correctness는 Thread 4, allocation·read·write failure는 Thread 6에 남습니다. 이 작업 환경에서는 repository checkout이 불가능해 테스트 executable을 실행하지 않았으며, 실행 결과를 주장하지 않고 각 SHA의 코드와 assertion만 확인했습니다.

## 10. 최종 architecture 또는 execution flow 정리
- Source-derived flow anchor: ``t_stack` 생성 → pair-preserving primitive → `sa/sb/ss`, `pa/pb`, rotate 계열 wrapper → invariant test → exact transition/no-op test``
- **학습자 최종 flow:** `96b5324448e4:stack_init`가 두 병렬 buffer를 소유하는 empty/allocated state를 만듭니다 → `c0de1a1b18bb`~`68dfd1b1fb58:stack_*`가 active pair를 silent mutation합니다 → 같은 SHA들의 `op_*`가 `emit`에 따라 하나의 public command를 직렬화하거나 silent replay합니다 → `86364d27baac:tests/operation_invariants.c`가 pair·합계·bounds를 확인합니다 → `7eb6890c2c13:tests/operation_invariants.c`가 exact state와 backing-array no-op을 확인합니다.
- **실제 코드 삽입:** 핵심 결정은 `t_stack`의 병렬 배열과 각 primitive의 동일 이동입니다. 예를 들어 `c0de1a1b18bb:src/operations.c:stack_swap`은 size 2 미만에서 반환한 뒤 `values[0/1]`과 `ranks[0/1]`을 각각 같은 방식으로 교환합니다. 이후 command도 이 pair 단위를 유지합니다.

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
