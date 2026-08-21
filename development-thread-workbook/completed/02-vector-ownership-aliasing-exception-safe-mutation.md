# Vector Ownership, Aliasing, and Exception-safe Mutation

## 1. Thread 목표

### Source-established significance

The original representation is durable, but the first modifier implementations reveal why vector is primarily a lifetime-management problem rather than only an indexed sequence. Capacity overflow, null-storage arithmetic, self-aliasing, and exceptions from user-defined types each expose a different way that logical size can diverge from actual constructed objects. The thread progressively moves input capture and replacement construction before mutation, separates construction in raw slots from assignment in live slots, and adds failure-injection evidence. The final test-oracle correction also demonstrates that tests for a deliberately extended self-range contract must derive expected values independently rather than assuming another container defines the same overlap behavior.

### 이 Thread에서 복원할 것

- 위 significance가 설명하는 변화 과정을 각 commit의 실제 SHA 코드로 재구성합니다.
- source가 확정한 commit 역할과 importance를 바꾸지 않고, 실제 implementation/failure/test 근거만 직접 채웁니다.

### Source에서 직접 연결되는 architecture

- `ft::vector` owns an allocator, a contiguous allocation pointer, a constructed-element count, and an allocation capacity. The range `[data, data + size)` contains live objects; `[data + size, data + capacity)` is raw storage and must never be treated as constructed.

### Source에서 직접 연결되는 Major Engineering Difficulties

- Implementing vector insertion across both spare-capacity and reallocation paths while distinguishing assignment into live objects from construction into raw storage, preserving aliased input, and cleaning partially constructed tails after exceptions.
- Making vector's general construction, assignment, resize, and growth paths transactional enough to preserve lifetime and ownership invariants when user-defined copies, assignments, or allocations throw.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- `size`가 단순 길이가 아니라 live-object ownership count가 되는 이유는 무엇인가?
- reallocation과 in-place insertion에서 exception guarantee가 달라지는 이유를 실제 lifetime operation으로 설명할 수 있는가?
- self-range/aliased value를 mutation 전에 snapshot해야 하는 정확한 invalidation 지점은 어디인가?
- `allocator::max_size()`와 null-backed empty storage가 각각 어떤 비정상 경계를 만든다?
- 최종 insertion path에서 raw storage와 live object를 어떻게 구분해 construct/assign/destroy하는가?

## 3. 완료 기준

- S: 핵심 architecture/invariant를 직전 상태 → failure 가능성 → 결정 → 실제 핵심 코드 → ownership/lifecycle/state transition → 후속 fix/test까지 코드 근거로 설명할 수 있어야 합니다.
- A: 주요 subsystem/boundary/failure path/integration point를 실제 코드와 설계 판단으로 연결하고, 관련 regression 또는 다음 fix와의 관계를 설명할 수 있어야 합니다.
- 모든 commit은 해당 SHA의 코드 또는 test/build diff를 근거로 기록합니다.
- Thread 최종 설명은 source 요약을 복사하는 것으로 끝내지 않고, 직접 확인한 코드 근거와 commit 간 변화로 재구성합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source-established role |
| --- | --- | --- | --- | --- | --- |
| 1 | `2eb9cb6c4273` | `feat(vector): allocator 기반 저장소 수명 관리` | S | CORE, VECTOR, ALLOCATOR | Establishes allocator-backed contiguous storage and the constructed-object ownership boundary. |
| 2 | `9db46550b13d` | `feat(vector): 용량 확장과 원소 재배치 구현` | A | VECTOR, ALLOCATOR, CORE | Adds replacement-block reallocation and geometric capacity growth. |
| 3 | `6f3cbf4794c9` | `fix(vector): 용량 계산을 allocator 상한에서 포화` | A | VECTOR, ALLOCATOR, EDGE | Corrects growth arithmetic at the allocator limit. |
| 4 | `bdc4c3123bc9` | `fix(vector): 자기 범위 assign과 insert 입력 보존` | A | VECTOR, EDGE, DEBUG | Snapshots self-range input before mutation invalidates it. |
| 5 | `bc3a74b9342e` | `fix(vector): allocator 형식과 빈 반복자 연산 보정` | A | VECTOR, ALLOCATOR, EDGE | Removes empty-storage pointer arithmetic and adopts allocator-provided size types. |
| 6 | `b3124b3808d5` | `fix(vector): 저장소 교체와 크기 증가를 트랜잭션으로 처리` | A | VECTOR, EXCEPTION, ALLOCATOR | Makes construction, assignment, resize growth, and aliased push-back transactional. |
| 7 | `9051be26db5e` | `test(vector): 생성·대입·크기 변경 실패 주입` | A | TEST, VECTOR, EXCEPTION | Injects element and allocation failures to validate rollback and live-object counts. |
| 8 | `797c33904db3` | `fix(vector): fill·range 삽입의 객체 수명 보존` | S | CORE, VECTOR, HARD | Rebuilds fill/range insertion around explicit live-object and raw-storage paths. |
| 9 | `8df3d8e067c0` | `test(vector): 삽입 복사·대입·할당 실패 sweep` | A | TEST, VECTOR, EXCEPTION | Sweeps insertion copy, assignment, and allocation failures across both capacity branches. |
| 10 | `5bdb6eb81a89` | `test(vector): 자기 범위 기대값을 명시적 snapshot으로 구성` | A | TEST, VECTOR, DEBUG | Replaces a questionable reference modifier with an explicit snapshot-derived test oracle. |

## 5. Commit별 학습 기록

### 1. feat(vector): allocator 기반 저장소 수명 관리

- SHA: `2eb9cb6c4273`
- Importance: S
- Tags: CORE, VECTOR, ALLOCATOR
- Source-established role: Establishes allocator-backed contiguous storage and the constructed-object ownership boundary.
- Source summary: Establishes vector's allocator-backed contiguous storage, size/capacity state, construction rollback, and destruction path.
- Source rationale: This commit defines the ownership representation on which every later vector operation depends: allocated storage is distinct from constructed elements, and cleanup is centralized. Omitting it would leave a major gap in explaining the container's architecture and lifetime model.

#### Source에서 확정된 핵심 판단

- Problem: A C++98 vector implementation must own raw contiguous storage while separately tracking which positions contain live `T` objects. Allocation alone does not create elements, and destruction must never be applied to unconstructed slots or omitted for constructed ones.
- Decision: The commit represents vector as allocator state, a data pointer, a constructed size, and an allocation capacity. Fill construction allocates one block and constructs elements sequentially, while the failure path destroys the completed prefix and deallocates the block. Destruction centralizes reverse element teardown and storage release.
- Why it mattered: Every later vector operation—reserve, resize, assignment, insertion, erasure, swap, and exception rollback—depends on this separation between storage ownership and object lifetime. It is the core invariant that later fixes refine rather than replace.

#### 해당 SHA에서 확인할 실제 코드

- 해당 SHA의 첫 vector header에서 allocator, storage pointer, live-element count, capacity를 나타내는 핵심 상태 필드를 찾습니다.
- raw allocation과 element construction이 분리되는 helper/constructor 경로를 따라가며, `_size`가 언제 증가하는지 확인합니다.
- fill construction 중 copy/construct가 실패할 때 이미 생성된 prefix를 역순 destroy하고 block을 deallocate하는 failure branch를 추적합니다.
- destructor/cleanup helper가 정확히 live prefix만 destroy한 뒤 storage를 해제하는지 확인합니다.
- 확인한 파일/심볼: `include/ft_vector.hpp`의 `_alloc`, `_data`, `_size`, `_capacity`, fill constructor/`_assign_fill`, `_destroy_elements`, destructor.
- 필요한 경우 비교할 직전 관련 SHA/parent: parent에는 vector header가 없으며 이 commit이 representation을 처음 추가합니다.

#### 설계·상태 변화 기록

- 이 commit 직전 상태: vector 객체, 연속 storage 소유권, live-object count가 전혀 정의되지 않았습니다.
- 해결하려던 문제: allocator가 반환한 raw memory와 실제로 constructor가 완료된 `T` 객체를 분리해 추적해야 했습니다.
- 선택한 결정: 한 allocation block을 `_data`가 소유하고, `_capacity`는 slot 수, `_size`는 `[0, _size)`에 존재하는 live object 수로 정의했습니다. construction 성공 직후에만 `_size`를 증가시킵니다.
- 새로 생긴 책임 경계 또는 상태 변화: allocator는 block과 element construction/destruction을 수행하고, vector는 그 호출 순서와 완료된 prefix 길이를 소유합니다.

#### S-level 심화 추적

- 기존 설계가 충분하지 않았던 이유: 이 commit 이전에는 설계 자체가 없었습니다. `capacity`를 곧 live count로 취급하면 uninitialized slot을 destroy하거나 construction에 실패한 slot까지 size가 가리키게 됩니다.
- 핵심 state/ownership/lifetime transition: `NULL/0/0` → block allocate 후 아직 live object 0개 → element별 construct 성공마다 `_size` 증가 → 완성된 `_data/_size/_capacity`; 실패하면 완성 prefix를 역순 destroy하고 block deallocate 후 예외 재전파입니다.
- failure scenario별 cleanup/rollback: allocate 실패 전에는 소유권을 얻지 않습니다. construct 실패 후에는 `[0, _size)`만 destroy하며 allocation 전체를 같은 `_alloc`로 해제합니다.
- 이 commit이 보장하는 것: 정상 생성/소멸과 fill construction 실패에서 live prefix와 raw tail을 구분합니다.
- 이 commit이 아직 보장하지 않는 것: capacity growth, self-aliasing, empty null arithmetic, 일반 modifier의 exception transaction, insertion lifetime은 아직 없습니다.
- 후속 fix/test와 연결되는 구조: 모든 후속 helper가 `_size`를 commit marker로 사용합니다. `9051be26db5e`가 live count/invalid destroy를 계측하고 `797c33904db3`가 insertion에 같은 경계를 적용합니다.
- 프로젝트 architecture 설명에 반드시 포함할 코드 근거: 네 상태 필드와 construction loop의 성공 후 `_size` 증가, catch의 prefix destroy/deallocate 순서입니다.

### 2. feat(vector): 용량 확장과 원소 재배치 구현

- SHA: `9db46550b13d`
- Importance: A
- Tags: VECTOR, ALLOCATOR, CORE
- Source-established role: Adds replacement-block reallocation and geometric capacity growth.
- Source summary: Adds capacity queries, reserve, geometric growth, and exception-aware reallocation.
- Source rationale: Reallocation is the central dynamic mechanism of vector: values must be copied into a new block before the old block is released. The decision is significant, though later commits strengthen arithmetic and transactional edge cases.

#### 해당 SHA에서 확인할 실제 코드

- `reserve`, `max_size`, growth helper, relocation helper의 caller/callee 관계를 그립니다.
- 새 block allocate → 기존 element copy-construct → 성공 후 old element destroy/deallocate → state publish 순서를 확인합니다.
- copy construction 실패 시 new block의 constructed prefix만 정리되고 original storage가 그대로 owner인지 확인합니다.
- 이 SHA의 doubling arithmetic가 allocator limit에서 아직 hardened되지 않았다는 source 명시를 기록하고, 후속 `6f3cbf4794c9`에서 같은 계산을 비교합니다.
- 확인한 파일/심볼: `include/ft_vector.hpp`의 `capacity`, `max_size`, `reserve`, `_next_capacity`, `_reallocate`.
- 필요한 경우 비교할 직전 관련 SHA/parent: `2eb9cb6c4273`의 fixed block representation과 비교합니다.

#### 설계·상태 변화 기록

- 이 commit 직전 상태: 초기 allocation 이후 capacity를 늘리거나 원소를 다른 block으로 옮길 경로가 없었습니다.
- 해결하려던 문제: 기존 값과 ownership을 잃지 않고 더 큰 연속 block으로 교체해야 했습니다.
- 선택한 결정: 새 block을 allocate하고 기존 live prefix를 copy-construct합니다. 전부 성공한 뒤 기존 live objects와 block을 정리하고 새 pointer/capacity를 publish합니다.
- 새로 생긴 책임 경계 또는 상태 변화: reallocation helper가 old/new block이 동시에 존재하는 transaction 구간과 최종 ownership transfer를 담당합니다.

#### A-level 핵심 확인

- 중요 boundary/failure path: copy constructor가 중간에 던지는 경우입니다. new block의 완료 prefix만 destroy/deallocate하며 old state는 건드리지 않습니다.
- state/ownership/lifecycle 영향: 성공 전에는 old vector가 owner이고 new block은 helper의 임시 소유입니다. 성공 시 old를 release하고 `_data/_capacity`를 교체합니다. `_size` 값은 동일합니다.
- 이 commit이 보장하는 것과 남은 한계: reallocation construction failure의 strong guarantee를 제공합니다. 하지만 doubling 계산이 `max_size()` 인접 구간에서 overflow할 위험은 남습니다.
- 다음 관련 commit과의 연결: `6f3cbf4794c9`가 growth arithmetic을 allocator 상한에서 포화시킵니다.

### 3. fix(vector): 용량 계산을 allocator 상한에서 포화

- SHA: `6f3cbf4794c9`
- Importance: A
- Tags: VECTOR, ALLOCATOR, EDGE
- Source-established role: Corrects growth arithmetic at the allocator limit.
- Source summary: Makes vector length checks and growth arithmetic saturate safely at the allocator's `max_size()`.
- Source rationale: The fix closes a non-obvious unsigned-overflow boundary that could select an invalid capacity or report the wrong failure. It restores an important allocator-limit contract without changing the core representation.

#### 해당 SHA에서 확인할 실제 코드

- `resize`, fill assignment, insertion, growth helper에서 `max_size()`를 넘는 요청을 mutation 전에 거부하는 branch를 확인합니다.
- doubling을 먼저 수행하지 않고 allocator limit에서 saturate하는 조건식과, validated minimum을 선택하는 순서를 추적합니다.
- 직전 관련 구현 `9db46550b13d`와 비교해 unsigned capacity arithmetic의 failure window가 정확히 어디서 사라졌는지 기록합니다.
- 확인한 파일/심볼: `include/ft_vector.hpp`의 요청 길이 preflight와 `_next_capacity`.
- 필요한 경우 비교할 직전 관련 SHA/parent: `9db46550b13d`의 먼저 doubling하는 계산.

#### Failure → Fix 추적

- 기존 가정 또는 직전 구현 상태: 현재 capacity를 두 배로 만든 뒤 allocator limit과 비교해도 안전하다고 가정했습니다.
- 실제 failure 또는 위험: unsigned multiplication/addition이 먼저 wrap되면 작은 capacity가 선택되거나 잘못된 failure 경로로 들어갈 수 있습니다.
- root cause: arithmetic 자체가 유효한지 확인하기 전에 overflow 가능한 표현식을 평가했습니다.
- 수정된 invariant/decision: requested minimum을 먼저 `max_size()`와 비교하고, doubling 가능 여부를 `limit - _capacity` 형태로 판단해 계산 자체가 overflow하지 않게 합니다. 두 배가 불가능하면 limit에서 포화합니다.
- mutation/commit 순서의 변경: invalid length는 allocation이나 state mutation 전에 `length_error`로 거부됩니다.
- 실제 수정 코드 근거: `_next_capacity`의 `if (_capacity > limit - _capacity)` 계열 분기와 각 public modifier의 size preflight입니다.
- 연결되는 regression test SHA/근거: source가 연결한 `0ce21f9cf12d`의 bounded allocator가 max 5에서 포화와 `reserve(6)` 거부, 최종 outstanding block 0을 검사합니다.

#### A-level 핵심 확인

- 중요 boundary/failure path: allocator가 작은 `max_size()`를 반환하거나 capacity가 limit 절반을 넘는 경계입니다.
- state/ownership/lifecycle 영향: 잘못된 요청을 mutation 전에 거부하므로 기존 block과 live objects는 변하지 않습니다.
- 이 commit이 보장하는 것과 남은 한계: capacity 선택 arithmetic은 allocator limit 안에서 안전합니다. 실제 allocation 실패는 여전히 allocator 예외로 처리됩니다.
- 다음 관련 commit과의 연결: 이후 insertion/resize transaction은 이 validated capacity를 전제로 새 block을 준비합니다.

### 4. fix(vector): 자기 범위 assign과 insert 입력 보존

- SHA: `bdc4c3123bc9`
- Importance: A
- Tags: VECTOR, EDGE, DEBUG
- Source-established role: Snapshots self-range input before mutation invalidates it.
- Source summary: Snapshots range input before vector assign or insert mutates the source container.
- Source rationale: The prior implementation could invalidate its own iterators or read overwritten values during self-range modification. Separating input capture from mutation is a significant aliasing correction that establishes the library's chosen snapshot contract.

#### 해당 SHA에서 확인할 실제 코드

- range assign이 destination clear/mutation 전에 source range 전체를 독립 temporary vector로 materialize하는지 확인합니다.
- range insert가 source range와 insertion point 이후 suffix를 mutation 전에 어떤 독립 storage에 보존하는지 확인합니다.
- self-reference일 때 invalidation 이전에 input을 모두 소비한다는 순서를 표시하고, reconstruction이 여전히 incremental mutation이라는 한계도 기록합니다.
- 확인한 파일/심볼: `include/ft_vector.hpp`의 range `assign`, range `insert`, 입력 snapshot temporary와 tail snapshot.
- 필요한 경우 비교할 직전 관련 SHA/parent: self-range를 직접 소비하던 직전 구현 및 regression `61e8b46e668f`.

#### Failure → Fix 추적

- 기존 가정 또는 직전 구현 상태: `first`/`last`가 destination과 무관하다고 보고 clear/shift/reallocation 중에도 계속 읽었습니다.
- 실제 failure 또는 위험: source가 같은 vector이면 clear, overwrite 또는 reallocation 순간 iterator가 무효화되거나 아직 읽지 않은 값이 바뀝니다.
- root cause: input consumption과 destination mutation이 같은 시간 구간에 섞여 있었습니다.
- 수정된 invariant/decision: mutation 전에 source range를 독립 temporary에 모두 복사합니다. insert는 source뿐 아니라 position 이후 suffix도 보존한 뒤 reconstruction합니다.
- mutation/commit 순서의 변경: capture 완료 → destination mutation/rebuild 순으로 분리됩니다.
- 실제 수정 코드 근거: range overload 첫 부분의 temporary vector 생성과 insert tail snapshot입니다.
- 연결되는 regression test SHA/근거: `61e8b46e668f`가 self-range assign/insert 결과를 검사하고, `5bdb6eb81a89`가 그 expected oracle을 독립 snapshot 방식으로 교정합니다.

#### A-level 핵심 확인

- 중요 boundary/failure path: destination range가 source range와 동일하거나 부분 중첩될 때입니다.
- state/ownership/lifecycle 영향: snapshot이 완성되기 전 destination은 변하지 않습니다. snapshot 자체의 construction failure는 temporary destructor가 정리합니다.
- 이 commit이 보장하는 것과 남은 한계: chosen snapshot semantics의 입력 보존을 보장합니다. 이 시점 insert reconstruction은 여전히 public operations를 통한 incremental mutation이라 일반 exception guarantee는 완성되지 않았습니다.
- 다음 관련 commit과의 연결: `797c33904db3`가 snapshot을 유지하면서 insertion lifetime algorithm 자체를 재설계합니다.

### 5. fix(vector): allocator 형식과 빈 반복자 연산 보정

- SHA: `bc3a74b9342e`
- Importance: A
- Tags: VECTOR, ALLOCATOR, EDGE
- Source-established role: Removes empty-storage pointer arithmetic and adopts allocator-provided size types.
- Source summary: Uses allocator-provided size types and avoids pointer arithmetic/subtraction on an unallocated empty vector.
- Source rationale: The fix addresses both custom-allocator interface correctness and undefined empty-storage arithmetic. Although compact, it restores a fundamental boundary invariant used by end, insert, and erase.

#### 해당 SHA에서 확인할 실제 코드

- public `size_type`/`difference_type`가 allocator-provided type으로 바뀐 선언을 찾습니다.
- `_iterator_at`, `_index_of`, empty-range erase에서 null-backed empty state를 별도 처리하는 branch를 확인합니다.
- 해당 SHA의 empty `begin()==end()`, zero-count insert, empty erase 경로에서 null pointer addition/subtraction이 실제로 사라졌는지 추적합니다.
- 확인한 파일/심볼: `include/ft_vector.hpp`의 allocator typedefs, `_iterator_at`, `_index_of`, empty erase/no-op modifier branches.
- 필요한 경우 비교할 직전 관련 SHA/parent: parent의 `_data + index`, `position - _data` 직접 연산과 regression `ccb98587e777`.

#### Failure → Fix 추적

- 기존 가정 또는 직전 구현 상태: empty vector의 `_data == NULL`이어도 0을 더하거나 두 null pointer를 빼는 식이 harmless하다고 가정했습니다.
- 실제 failure 또는 위험: C++ pointer arithmetic/subtraction은 유효한 array object 범위라는 전제가 있어 null-backed empty state에는 적용할 수 없습니다. custom allocator의 size/difference type도 무시됐습니다.
- root cause: 논리적으로 0이라는 결과와 language-level pointer operation의 유효성을 동일시했습니다.
- 수정된 invariant/decision: empty/null state는 explicit branch로 iterator/index를 반환하고, public size types는 allocator가 제공하는 형식을 사용합니다.
- mutation/commit 순서의 변경: zero-count/empty-range modifier는 pointer 계산 전에 no-op로 종료됩니다.
- 실제 수정 코드 근거: `_iterator_at`과 `_index_of`의 `_data == NULL` 검사, empty erase branch입니다.
- 연결되는 regression test SHA/근거: `ccb98587e777`가 empty begin/end, zero-count insert, empty range erase와 allocator 상태를 검사합니다.

#### A-level 핵심 확인

- 중요 boundary/failure path: default-constructed vector와 모든 원소를 지운 뒤 null storage인 상태입니다.
- state/ownership/lifecycle 영향: no-op 경로가 storage나 live count를 건드리지 않습니다.
- 이 commit이 보장하는 것과 남은 한계: empty API 경로에서 invalid pointer arithmetic을 제거합니다. dereferenceable iterator를 제공하는 것은 아니며 empty begin/end는 비교만 가능합니다.
- 다음 관련 commit과의 연결: 이후 transaction/insertion helper가 위치를 index로 바꿀 때 이 safe conversion을 사용합니다.

### 6. fix(vector): 저장소 교체와 크기 증가를 트랜잭션으로 처리

- SHA: `b3124b3808d5`
- Importance: A
- Tags: VECTOR, EXCEPTION, ALLOCATOR
- Source-established role: Makes construction, assignment, resize growth, and aliased push-back transactional.
- Source summary: Makes fill construction, assignment, resize growth, and aliased push-back use rollback or temporary-storage transactions.
- Source rationale: This substantially raises vector's failure guarantees by committing state only after construction succeeds and by snapshotting aliased values before reallocation. It is significant core hardening, but insertion requires a separate, still more defining lifetime redesign.

#### Source에서 확정된 핵심 판단

- Problem: The initial vector surface could clear or partially extend the active sequence before all replacement construction succeeded. A throwing element copy could therefore lose the original assignment target, leave a partially grown suffix, or read an aliased push-back argument after reallocation invalidated it.
- Decision: Fill construction now builds a complete block before publishing state. Fill and range assignment build a temporary vector and exchange storage only after success. Resize growth records the old size and destroys only the newly completed suffix on failure. Reallocating push-back copies an aliased argument before reserve can invalidate it.
- Why it mattered: This commit applies a consistent transaction pattern across several high-risk paths: prepare replacement state, track completed construction, and commit only when the new state is valid. It is not the final insertion solution, but it establishes the failure-handling method that the later insertion redesign follows.

#### 해당 SHA에서 확인할 실제 코드

- `_initialize_fill`가 complete block을 만들기 전 `_data/_size/_capacity`를 publish하지 않는지 확인합니다.
- fill/range assignment가 destination allocator를 유지한 temporary vector를 만들고 storage-only exchange로 commit하는 순서를 추적합니다.
- `resize` growth에서 old size를 기준으로 새 suffix만 rollback하는 branch를 확인합니다.
- reallocation이 필요한 `push_back(values[i])` 같은 aliased argument를 `reserve` 전에 복사하는 코드 위치를 확인합니다.
- 확인한 파일/심볼: `include/ft_vector.hpp`의 `_initialize_fill`, assignment overloads, `_swap_storage`, `resize`, `push_back`.
- 필요한 경우 비교할 직전 관련 SHA/parent: 기존 clear-then-build/partial growth 경로와 후속 `9051be26db5e`.

#### Failure → Fix 추적

- 기존 가정 또는 직전 구현 상태: destination state를 먼저 비우거나 `_size`를 진행시키면서 replacement를 만들었습니다. push argument가 자기 원소여도 reserve 후 읽을 수 있다고 가정했습니다.
- 실제 failure 또는 위험: copy/construct 예외로 원래 assignment 대상이 사라지거나 partially grown suffix가 남고, aliased reference는 reallocation 후 dangling이 됩니다.
- root cause: prepare와 commit이 분리되지 않았고, 외부처럼 보이는 reference가 내부 storage를 가리킬 가능성을 고려하지 않았습니다.
- 수정된 invariant/decision: replacement temporary/block을 완성한 뒤 storage만 교환합니다. resize는 old size를 commit 기준으로 삼고, push는 reallocation 전에 value snapshot을 만듭니다.
- mutation/commit 순서의 변경: prepare/snapshot → construct with progress count → success 후 publish; failure 시 newly constructed suffix/block만 정리합니다.
- 실제 수정 코드 근거: `_initialize_fill`의 local pointer/progress, assignment의 temporary + `_swap_storage`, resize catch, push snapshot입니다.
- 연결되는 regression test SHA/근거: `9051be26db5e`가 fill/copy assignment, resize, aliased push-back에 copy/allocation failure를 주입합니다.

#### A-level 핵심 확인

- 중요 boundary/failure path: replacement construction, resize suffix construction, reserve 중 allocation/copy, self-aliased push argument입니다.
- state/ownership/lifecycle 영향: `_size`는 성공한 live object만 포함하며, failed temporary가 자신의 allocator로 block을 정리합니다. destination allocator object는 assignment commit에서 바뀌지 않습니다.
- 이 commit이 보장하는 것과 남은 한계: 여러 일반 modifier에서 original preservation 또는 정확한 suffix rollback을 제공합니다. 복잡한 fill/range insertion의 in-place lifetime은 아직 해결되지 않았습니다.
- 다음 관련 commit과의 연결: `797c33904db3`가 같은 transaction 원리를 insertion reallocation에 적용하고 in-place 경로는 별도 basic guarantee로 설계합니다.

### 7. test(vector): 생성·대입·크기 변경 실패 주입

- SHA: `9051be26db5e`
- Importance: A
- Tags: TEST, VECTOR, EXCEPTION
- Source-established role: Injects element and allocation failures to validate rollback and live-object counts.
- Source summary: Adds tracked-object and allocator failure injection for construction, assignment, resize, and aliased push-back.
- Source rationale: The suite validates live-object counts, invalid copies/destructions, block release, and preservation of original values. It materially changes confidence in vector's lifetime guarantees rather than merely adding normal-path coverage.

#### 해당 SHA에서 확인할 실제 코드

- `tracked_value`가 live object 수, dead-source copy, duplicate destruction, 선택적 copy/assignment throw를 어떻게 기록하는지 확인합니다.
- tracking allocator가 outstanding block, allocation failure, small `max_size`를 독립적으로 계측하는지 확인합니다.
- fill construction/assignment/copy assignment/resize growth/aliased push_back failure가 어떤 production path를 통과하는지 각각 연결합니다.
- 각 실패 뒤 original value 보존 여부와 live/block count zero 조건을 분리해서 기록합니다.
- 확인한 파일/심볼: `tests/test_vector_exceptions.cpp`의 `tracked_value`, tracking/bounded allocator state, 각 `test_*` 함수.
- 필요한 경우 비교할 직전 관련 SHA/parent: production fix `b3124b3808d5`; allocator-limit regression에는 `6f3cbf4794c9`가 연결됩니다.

#### Test/verification 학습 기록

- 대상 production invariant: `_size`는 live object 수와 일치하고 실패한 construction/assignment/growth가 block 또는 object를 누수하거나 invalid destroy하지 않아야 합니다.
- 재현하는 failure 또는 boundary: 지정한 copy/assignment attempt와 allocation attempt에서 예외, 작은 `max_size`, aliased push-back입니다.
- test technique: shared counters를 이용한 deterministic failure injection과 lifetime instrumentation입니다.
- 통과하는 production 코드 경로: fill/copy construction, fill/range/copy assignment, resize growth, reserve/push-back, allocator limit checks입니다.
- 이 테스트가 증명하는 것: 주입 지점에서 예외가 발생해도 expected original value가 보존되는 경로, live address 집합, invalid copy/destroy count, outstanding block count가 일관됩니다.
- 이 테스트가 증명하지 않는 것: 모든 element type/allocator 구현, 모든 possible failure interleaving, insertion의 복잡한 in-place branch는 아직 증명하지 않습니다.
- 성격: 특정 transaction fix를 고정하는 deterministic regression suite입니다.
- 후속 변경에서 막아야 하는 회귀: state를 성공 전에 publish하거나 failed prefix/suffix/block cleanup을 누락하고, reallocation 뒤 aliased value를 읽는 회귀입니다.
- 실행 증거: test source와 production diff만 검사했습니다. repository checkout 제약으로 binary는 실행하지 않았습니다.

#### A-level 핵심 확인

- 중요 boundary/failure path: allocator가 아예 block을 주지 않는 경우와 element construction 후 일부 progress가 있는 경우를 분리합니다.
- state/ownership/lifecycle 영향: `tracked_value`의 live-address registry와 allocator block counter가 서로 다른 차원의 leak/invalid lifetime을 검출합니다.
- 이 commit이 보장하는 것과 남은 한계: 검사한 deterministic 지점의 rollback을 증명합니다. sanitizer나 실제 표준 allocator 전 조합을 대체하지 않습니다.
- 다음 관련 commit과의 연결: insertion redesign 뒤에는 `8df3d8e067c0`이 같은 기법을 fill/range insert 양쪽 capacity branch로 확장합니다.

### 8. fix(vector): fill·range 삽입의 객체 수명 보존

- SHA: `797c33904db3`
- Importance: S
- Tags: CORE, VECTOR, HARD
- Source-established role: Rebuilds fill/range insertion around explicit live-object and raw-storage paths.
- Source summary: Replaces vector fill/range insertion with explicit reallocation and in-place algorithms that distinguish live objects from uninitialized storage.
- Source rationale: This solves a project-defining object-lifetime problem. The new paths track constructed tails, snapshot aliased input, preserve spare capacity when possible, and clean partial construction on failure; without it the completed vector's correctness under non-trivial element types cannot be explained.

#### Source에서 확정된 핵심 판단

- Problem: The first insertion algorithm shifted values by constructing and destroying positions without consistently distinguishing already-live elements from raw capacity. Range insertion also rebuilt a tail through multiple public operations. With non-trivial or throwing element types, these approaches could violate lifetime bookkeeping, leak constructed objects, or leave invalid state.
- Decision: Insertion is split by both input form and capacity condition. Reallocation paths construct prefix, inserted values, and suffix into a fresh block and publish it only after completion. In-place paths construct only into the uninitialized tail, assign within the live range, track how many tail objects were completed, and destroy that tail if construction fails. Fill values and range inputs are snapshotted before mutation.
- Why it mattered: This is the decisive vector modifier design. It reconciles contiguous layout, capacity preservation, aliasing, construction versus assignment, and exception cleanup in one mechanism. The final vector cannot be considered correct for general element types without it.

#### 해당 SHA에서 확인할 실제 코드

- fill/range 각각에서 reallocation path와 spare-capacity in-place path가 분리된 helper 구조를 찾습니다.
- reallocation path의 prefix → inserted values → suffix construction 순서와 complete 후에만 old storage를 교체하는 commit boundary를 추적합니다.
- in-place path에서 raw tail slot에는 `construct`, 이미 live인 위치에는 assignment를 사용하는 구간 경계를 인덱스로 표시합니다.
- 부분 tail construction 또는 assignment failure 시 실제로 destroy되는 객체 범위와 `_size` bookkeeping을 확인하고 strong/basic guarantee를 구분합니다.
- fill value와 range input이 mutation 전에 snapshot되는 위치를 확인합니다.
- 확인한 파일/심볼: `include/ft_vector.hpp`의 fill/range `insert`, reallocation helpers, in-place helpers, `_replace_storage`/tail cleanup 경로.
- 필요한 경우 비교할 직전 관련 SHA/parent: `bdc4c3123bc9`의 incremental reconstruction, transaction pattern `b3124b3808d5`, regression `8df3d8e067c0`.

#### Failure → Fix 추적

- 기존 가정 또는 직전 구현 상태: move 대상 slot이 live인지 raw인지와 무관하게 construct/destroy를 섞고, range tail을 여러 public modifier로 다시 만들었습니다.
- 실제 failure 또는 위험: live object 위에 placement construction, raw slot에 assignment, partially constructed tail leak, `_size`와 실제 live objects 불일치가 가능합니다.
- root cause: insertion을 단일 shift 문제로 취급하고 object lifetime 영역 `[0,size)`와 raw 영역 `[size,capacity)`의 다른 연산 규칙을 분리하지 않았습니다.
- 수정된 invariant/decision: capacity 조건으로 reallocate/in-place를 나누고, in-place에서도 `count <= tail_size`와 `count > tail_size`를 구분합니다. raw tail에만 construct하고 live range에는 assignment합니다.
- mutation/commit 순서의 변경: input snapshot → 필요한 raw tail construction(progress 기록) → live assignment/shift → 최종 `_size` publish입니다. reallocation은 new block 전체 완성 후 old 교체입니다.
- 실제 수정 코드 근거: prefix/inserted/suffix construction loop, `constructed` progress counter, catch의 tail destroy, 성공 마지막의 `_size += count`입니다.
- 연결되는 regression test SHA/근거: `8df3d8e067c0`이 copy/assignment/allocation failure positions를 sweep하고 capacity/address/lifetime counters를 검사합니다.

#### S-level 심화 추적

- 기존 설계가 충분하지 않았던 이유: trivial `int`에서는 byte-like shift가 통과해도 non-trivial `T`의 constructor/destructor contract에는 맞지 않았습니다. public operations를 조합하면 중간 state가 외부 exception에 노출됩니다.
- 핵심 state/ownership/lifetime transition: reallocation은 old owner 유지 + new temporary block → prefix/insert/suffix live count 증가 → 완성 후 old destroy/deallocate → new publish입니다. in-place는 기존 live prefix 유지 → raw tail 일부 construct → live slots assignment → size commit입니다.
- failure scenario별 cleanup/rollback: reallocation copy/construct failure는 new prefix만 destroy/deallocate하고 old unchanged입니다. in-place tail construction failure는 새 tail만 destroy하며 original size를 유지합니다. live assignment failure는 이미 바뀐 값은 복구하지 못하지만 constructed tail을 정리하고 `_size`를 old size로 유지해 container를 destructible/usable한 valid state로 둡니다.
- 이 commit이 보장하는 것: raw/live 영역에 맞는 lifetime operation, aliased input capture, reallocation strong guarantee, in-place lifetime bookkeeping의 basic guarantee, spare capacity 유지입니다.
- 이 commit이 아직 보장하지 않는 것: throwing assignment를 포함한 in-place insertion에서 original 값의 strong guarantee는 제공하지 않습니다. arbitrary invalid iterators는 precondition 밖입니다.
- 후속 fix/test와 연결되는 구조: `8df3d8e067c0`이 두 branch와 failure 종류를 직접 sweep하고, `5bdb6eb81a89`가 self-range expected oracle 신뢰성을 고칩니다.
- 프로젝트 architecture 설명에 반드시 포함할 코드 근거: `_size` 전후의 live/raw 경계, tail construction progress, reallocation publish boundary, in-place assignment failure 시 보장 수준입니다.

### 9. test(vector): 삽입 복사·대입·할당 실패 sweep

- SHA: `8df3d8e067c0`
- Importance: A
- Tags: TEST, VECTOR, EXCEPTION
- Source-established role: Sweeps insertion copy, assignment, and allocation failures across both capacity branches.
- Source summary: Sweeps copy, assignment, and allocation failures across fill and range insertion, including aliasing and spare-capacity behavior.
- Source rationale: The test matrix probes both reallocation and in-place branches, checks post-failure usability, and verifies no leaked or double-destroyed objects. It provides high-value regression evidence for the most complex vector modifier.

#### 해당 SHA에서 확인할 실제 코드

- copy/assignment/allocation failure position을 sweep하는 반복 구조와 각 injection counter reset 지점을 확인합니다.
- spare-capacity range insertion에서 capacity와 unaffected prefix 주소가 유지되는 assertion을 찾습니다.
- reallocating insertion sweep에서 허용되는 post-state가 unchanged original 또는 full inserted result뿐인지 확인합니다.
- 각 scenario 종료 후 live object, invalid lifetime operation, outstanding allocation이 zero인지 확인합니다.
- 확인한 파일/심볼: `tests/test_vector_exceptions.cpp`의 insertion test 함수, failure counter loops, capacity/address assertions, final tracker assertions.
- 필요한 경우 비교할 직전 관련 SHA/parent: production redesign `797c33904db3`.

#### Test/verification 학습 기록

- 대상 production invariant: fill/range insertion이 reallocation과 spare-capacity 양쪽에서 live/raw lifetime을 지키고 실패 후 소유 자원을 정확히 정리해야 합니다.
- 재현하는 failure 또는 boundary: fill value alias, self/range snapshot, new-block copy construction, in-place tail construction, live assignment, allocator allocation failure입니다.
- test technique: fail-at index를 증가시키는 deterministic failure sweep과 lifetime/allocation instrumentation입니다.
- 통과하는 production 코드 경로: fill/range reallocation helpers와 in-place helpers의 두 tail-size branch입니다.
- 이 테스트가 증명하는 것: reallocation 실패는 unchanged/full-result만 남고, in-place assignment failure에서도 size/lifetime bookkeeping과 이후 사용 가능성이 유지되며, leak/double-destroy가 없습니다. spare capacity와 unaffected prefix address도 지정 scenario에서 유지됩니다.
- 이 테스트가 증명하지 않는 것: 모든 possible `T` semantics나 무한 failure positions, throwing destructor, invalid input iterator는 다루지 않습니다.
- 성격: 가장 복잡한 modifier의 deterministic regression/failure-injection matrix입니다.
- 후속 변경에서 막아야 하는 회귀: raw slot assignment, live slot construct, size 조기 publish, partial tail cleanup 누락, 불필요한 reallocation, aliased input 재독취입니다.
- 실행 증거: code inspection만 수행했습니다. 실제 sweep binary 결과를 생성하지 않았습니다.

#### A-level 핵심 확인

- 중요 boundary/failure path: failure가 new block publish 전인지, raw tail construction 중인지, live assignment 중인지에 따라 보장 수준이 다릅니다.
- state/ownership/lifecycle 영향: trackers가 object address와 allocation block을 따로 세어 logical size만으로 놓칠 수 있는 문제를 검출합니다.
- 이 commit이 보장하는 것과 남은 한계: 구현이 의도한 strong/basic guarantee 분리를 테스트합니다. 성능 복잡도나 모든 iterator invalidation 규칙은 별도입니다.
- 다음 관련 commit과의 연결: self-range scenario의 expected result가 독립적인지 `5bdb6eb81a89`에서 교정됩니다.

### 10. test(vector): 자기 범위 기대값을 명시적 snapshot으로 구성

- SHA: `5bdb6eb81a89`
- Importance: A
- Tags: TEST, VECTOR, DEBUG
- Source-established role: Replaces a questionable reference modifier with an explicit snapshot-derived test oracle.
- Source summary: Builds self-range expected values explicitly instead of asking `std::vector` to perform overlapping modifiers.
- Source rationale: The previous oracle coupled the regression to implementation- or version-sensitive overlapping-range behavior. This correction makes the chosen snapshot contract independently testable and restores trust in a significant edge-case test.

#### 해당 SHA에서 확인할 실제 코드

- self-range insertion expected sequence를 unchanged prefix + snapshotted source + unchanged suffix로 직접 조립하는 코드를 확인합니다.
- self-range assignment expected sequence를 selected interior range에서 독립적으로 만드는 코드를 확인합니다.
- `std::vector`에 overlapping modifier를 호출하던 이전 oracle을 제거한 diff를 직전 parent와 비교합니다.
- 이 테스트가 project-defined snapshot semantics를 검증하지만 일반적인 모든 overlapping operation의 표준 의미를 증명하는 것은 아니라는 범위를 기록합니다.
- 확인한 파일/심볼: `tests/test_containers.cpp` 또는 해당 vector regression source의 self-range expected construction.
- 필요한 경우 비교할 직전 관련 SHA/parent: `61e8b46e668f`의 reference-container modifier oracle.

#### Test/verification 학습 기록

- 대상 production invariant: project가 선택한 self-range snapshot contract에서 destination mutation 전 source values가 고정돼야 합니다.
- 재현하는 failure 또는 boundary: insertion source/destination이 같은 vector이고 source가 position 전후와 중첩되는 경우, interior self-range assignment입니다.
- test technique: expected sequence를 prefix/source snapshot/suffix로 직접 만드는 independent oracle입니다.
- 통과하는 production 코드 경로: `bdc4c3123bc9` 이후 range input snapshot과 `797c33904db3`의 range insertion implementation입니다.
- 이 테스트가 증명하는 것: 구현 결과가 명시한 snapshot semantics와 일치합니다.
- 이 테스트가 증명하지 않는 것: `std::vector`의 overlapping modifier 표준 의미나 모든 임의 중첩 조합을 증명하지 않습니다.
- 성격: 기존 regression test 자체의 oracle 결함을 고친 deterministic test correction입니다.
- 후속 변경에서 막아야 하는 회귀: expected 값을 구현과 같은 잘못된 modifier 호출로 계산해 양쪽이 함께 틀리거나 platform별 behavior에 의존하는 회귀입니다.
- 실행 증거: 수정된 expected-building code를 diff로 확인했으며 실행하지 않았습니다.

#### A-level 핵심 확인

- 중요 boundary/failure path: production failure가 아니라 verification 신뢰성의 경계입니다. oracle이 정의되지 않은/지원 범위 밖 동작에 기대면 test pass가 근거가 되지 않습니다.
- state/ownership/lifecycle 영향: production state 변화는 없지만 self-aliasing contract의 기대 sequence가 독립적으로 고정됩니다.
- 이 commit이 보장하는 것과 남은 한계: 이 테스트의 expected 값이 project contract에서 직접 유도됩니다. 전체 standard conformance oracle은 아닙니다.
- 다음 관련 commit과의 연결: vector Thread의 최종 evidence에서 self-range 결과와 failure/lifetime evidence를 분리해 신뢰할 수 있게 합니다.

## 6. Invariant ledger

### Source에서 확정된 관련 invariant

- Every vector element in `[0, size)` is constructed exactly once and destroyed exactly once; storage beyond `size` remains uninitialized until explicitly constructed.
- Vector storage is deallocated by allocator state compatible with the state that allocated it. A failed allocation or construction must not leak a block or leave `size` claiming ownership of an unconstructed object.
- Reallocation commits only after the replacement block is complete. Where the supported contract requires preservation, failed construction leaves the original vector unchanged; in-place operations at minimum keep lifetime bookkeeping valid and the container destructible.
- Range assignment and insertion must snapshot self-referential input before mutating the source vector, so source iterators and aliased values are not invalidated before they are consumed.
- Requested vector sizes and growth calculations must respect `allocator::max_size()` without unsigned overflow or invalid capacity selection.

### 시간에 따른 변화 기록

| Invariant | 처음 도입된 commit | 부족함이 드러난 commit/상태 | 강화·복구한 fix | 고정한 test/perf | 직접 확인한 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| Every vector element in `[0, size)` is constructed exactly once and destroyed exactly once | `2eb9cb6c4273` | 초기 insert/general mutation이 live/raw slot을 일관되게 구분하지 않음 | `b3124b3808d5`, 결정적으로 `797c33904db3` | `9051be26db5e`, `8df3d8e067c0` | state fields, construction progress, tail cleanup, `_size` commit |
| Vector storage is deallocated by allocator state compatible with the state that allocated it | `2eb9cb6c4273` | replacement/temporary 실패에서 block cleanup을 검증할 evidence 부족 | `9db46550b13d`, `b3124b3808d5`, `797c33904db3` | `0ce21f9cf12d`, `9051be26db5e`, `8df3d8e067c0` | `_alloc.allocate/deallocate`, tracking allocator block counter |
| Reallocation commits only after the replacement block is complete | `9db46550b13d` | assignment/resize/push/insert에 같은 transaction이 일관되게 적용되지 않음 | `b3124b3808d5`, `797c33904db3` | `9051be26db5e`, `8df3d8e067c0` | new block prefix/insert/suffix construction 후 `_replace_storage` |
| Range assignment and insertion must snapshot self-referential input before mutating the source vector | `bdc4c3123bc9` | 초기 regression oracle가 reference container의 overlapping modifier에 의존 | production은 `797c33904db3`에서 유지, oracle은 `5bdb6eb81a89`에서 교정 | `61e8b46e668f`, `5bdb6eb81a89` | temporary source capture, explicit prefix/source/suffix expected values |
| Requested vector sizes and growth calculations must respect `allocator::max_size()` without unsigned overflow | `6f3cbf4794c9` | `9db46550b13d`의 doubling-first arithmetic | `6f3cbf4794c9` | `0ce21f9cf12d` 및 `9051be26db5e` bounded allocator | `limit - _capacity` 포화 분기와 length preflight |

## 7. Failure → Fix → Test 연결

| 기존 상태/production change | fix 또는 verification | Source에서 확정된 연결 관점 | 실제 failure/root cause | 실제 test production path |
| --- | --- | --- | --- | --- |
| `6f3cbf4794c9` | `0ce21f9cf12d` | bounded allocator로 capacity saturation/length rejection/block cleanup 검증 | doubling overflow와 limit 초과 요청이 mutation 전 분리되지 않을 위험 | bounded `max_size` → growth/reserve preflight → final block counter |
| `bdc4c3123bc9` | `61e8b46e668f` | self-range insert/assign 결과 회귀 검증 | mutation 중 source iterator/value invalidation | range snapshot → assign/insert result comparison |
| `bc3a74b9342e` | `ccb98587e777` | null-storage no-op modifier와 allocator 상태 검증 | null pointer addition/subtraction | empty begin/end, zero insert, empty erase no-op branch |
| `b3124b3808d5` | `9051be26db5e` | construction/assignment/resize/aliased push-back failure injection | state 조기 publish와 incomplete cleanup | tracked copy/assign/alloc throw → rollback → value/live/block assertions |
| `797c33904db3` | `8df3d8e067c0` | insert copy/assignment/allocation failure sweep | live/raw slot 혼동과 partial tail leak | reallocation/in-place fill/range helpers → fail-at sweep |
| `bdc4c3123bc9 → 61e8b46e668f` | `5bdb6eb81a89` | self-range oracle를 explicit snapshot expected value로 교정 | oracle가 overlapping reference modifier에 의존 | explicit expected assembly → production self-range result comparison |

- `0ce21f9cf12d`, `61e8b46e668f`, `ccb98587e777`는 이 Development Thread의 commit map에는 포함되지 않지만, source가 확정한 관련 regression commit입니다. Thread membership을 변경하지 않고 fix의 검증 연결만 기록합니다.

## 8. Ownership / state / responsibility 변화

| 시점 | Owner / state / responsibility | 변경 전 | 변경 후 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| `2eb9cb6c4273` | Establishes allocator-backed contiguous storage and the constructed-object ownership boundary. | vector state 부재 | `_data` block과 `_size` live prefix 분리 | vector fields, constructor/destructor |
| `9db46550b13d` | Adds replacement-block reallocation and geometric capacity growth. | fixed capacity | new block 임시 소유 후 성공 시 transfer | `_reallocate`, `reserve` |
| `6f3cbf4794c9` | Corrects growth arithmetic at the allocator limit. | overflow 가능한 doubling | limit-safe saturated capacity | `_next_capacity`, preflight |
| `bdc4c3123bc9` | Snapshots self-range input before mutation invalidates it. | source와 destination mutation 결합 | temporary가 input lifetime 소유 | range assign/insert snapshot |
| `bc3a74b9342e` | Removes empty-storage pointer arithmetic and adopts allocator-provided size types. | null pointer 산술 가능 | empty branch와 allocator typedefs | `_iterator_at`, `_index_of` |
| `b3124b3808d5` | Makes construction, assignment, resize growth, and aliased push-back transactional. | destination 조기 mutation | temporary/new suffix가 commit 전 책임 | `_initialize_fill`, `_swap_storage`, resize/push catch |
| `9051be26db5e` | Injects element and allocation failures to validate rollback and live-object counts. | failure behavior 추론 | test state가 objects/blocks를 계측 | `tracked_value`, tracking allocator |
| `797c33904db3` | Rebuilds fill/range insertion around explicit live-object and raw-storage paths. | insertion shift가 lifetime 영역 혼동 | reallocate/in-place helper가 각 영역 책임 | insertion helpers, `constructed` counter |
| `8df3d8e067c0` | Sweeps insertion copy, assignment, and allocation failures across both capacity branches. | 일부 normal-path evidence | branch/failure별 regression matrix | fail-at loops, capacity/address/lifetime assertions |
| `5bdb6eb81a89` | Replaces a questionable reference modifier with an explicit snapshot-derived test oracle. | oracle가 다른 modifier behavior에 의존 | test가 expected sequence를 직접 소유 | explicit expected assembly |

## 9. Thread 최종 상태

- 최종적으로 성립한 representation/state: vector는 allocator, contiguous block pointer, live prefix count, raw slot capacity를 소유합니다. 모든 modifier는 `[0,size)`와 `[size,capacity)`의 연산 규칙을 구분합니다.
- 최종적으로 보장하는 invariant: construct 성공한 object만 size에 포함되고 같은 allocator family가 block을 해제합니다. reallocation은 replacement 완성 후 commit하며, self-referential input은 mutation 전에 snapshot됩니다. growth는 `max_size()`를 overflow 없이 존중합니다.
- 남아 있는 precondition 또는 보장하지 않는 범위: in-place insertion 중 element assignment가 던지면 값의 strong guarantee는 없습니다. 대신 newly constructed tail을 정리하고 old size를 유지하는 basic lifetime guarantee입니다. invalid iterator와 throwing destructor는 지원 범위 밖입니다.
- 최종 verification evidence: tracked object/allocator failure injection, insertion sweep, bounded allocator, empty-state regression, independent self-range oracle를 코드로 확인했습니다. 이 작업에서는 test executable을 실제 실행하지 않았습니다.
- 이 상태에 도달하기 위해 필요했던 핵심 turning point commit: representation을 만든 `2eb9cb6c4273`, 일반 transaction을 만든 `b3124b3808d5`, insertion lifetime을 결정적으로 고친 `797c33904db3`입니다.

## 10. 최종 architecture 또는 execution flow 정리

아래 단계명은 source가 정의한 Thread progression을 따라가는 탐색 순서입니다. 실제 함수·상태·분기·코드 조각은 해당 SHA에서 직접 채웁니다.

| 단계 | 관련 commit | 실제 코드 위치 | 입력/기존 상태 | 핵심 transition | failure/cleanup | 다음 단계에 남기는 invariant |
| --- | --- | --- | --- | --- | --- | --- |
| Allocation ownership model | `2eb9cb6c4273` | vector fields/construct/destruct | allocator와 element count | raw block allocate 후 성공 element만 size 증가 | completed prefix destroy + block deallocate | size == live count |
| Replacement-block reallocation | `9db46550b13d` | `reserve`, `_reallocate` | old live block, larger capacity | new block copy 완료 후 owner 교체 | new prefix rollback, old unchanged | reallocation commit boundary |
| Allocator-limit growth | `6f3cbf4794c9` | `_next_capacity`, preflights | requested minimum/current capacity/limit | overflow 없는 saturation 및 reject | mutation 전 `length_error` | capacity <= max_size |
| Aliased range capture | `bdc4c3123bc9` | range assign/insert | source가 destination일 수 있음 | temporary에 source와 필요 tail capture | temporary construction failure 시 destination unchanged | mutation 전 input 고정 |
| Empty-storage boundary | `bc3a74b9342e` | `_iterator_at`, `_index_of` | `_data == NULL`, size 0 | pointer 산술 없이 empty 결과 반환 | no-op | empty begin/end/modifier 유효 |
| Transactional general mutation | `b3124b3808d5` | init/assign/resize/push | replacement 또는 suffix 필요 | prepare → construct → publish | temporary/suffix rollback | 일반 mutation의 commit-after-success |
| Failure injection | `9051be26db5e` | vector exception tests | 선택된 fail attempt | production 예외 경로 실행 및 counters 관찰 | scope 종료 후 live/block zero | rollback evidence |
| Insertion lifetime redesign | `797c33904db3` | insert helpers | position/count/range/capacity | reallocate 또는 raw-tail construct + live assignment | new block/tail cleanup, size 마지막 publish | insertion lifetime 유효 |
| Insertion failure sweep | `8df3d8e067c0` | insertion regressions | copy/assign/alloc fail index | 모든 주요 branch 반복 실행 | trackers와 post-state 검사 | 복잡한 modifier regression 고정 |
| Independent self-range oracle | `5bdb6eb81a89` | self-range expected builder | original values와 selected range | prefix + snapshot + suffix 직접 조립 | production mutation 사용 안 함 | test oracle 독립성 |

## 11. 학습 완료 자가 점검

- [x] Commit map의 모든 SHA를 source 순서대로 확인했습니다.
- [x] 각 commit 기록에 final HEAD가 아니라 해당 SHA의 실제 코드 근거가 있습니다.
- [x] S/A commit은 decision, failure boundary, ownership/state transition을 설명할 수 있습니다.
- [x] Test/perf commit은 production invariant, technique, production path, 증명/비증명 범위를 구분했습니다.
- [x] Fix가 있는 경우 기존 가정 → failure/risk → root cause → 수정 → regression 연결을 설명할 수 있습니다.
- [x] Invariant ledger가 commit history에 따라 어떻게 변했는지 설명할 수 있습니다.
- [x] Thread 최종 상태와 architecture/execution flow를 실제 코드 근거로 자기 말로 설명할 수 있습니다.
