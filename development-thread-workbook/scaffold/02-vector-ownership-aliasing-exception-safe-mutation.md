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
- 확인한 파일/심볼: [직접 기록]
- 필요한 경우 비교할 직전 관련 SHA/parent: [직접 기록]

#### 설계·상태 변화 기록

- 이 commit 직전 상태: [직접 작성]
- 해결하려던 문제: [직접 작성]
- 선택한 결정: [직접 작성]
- 새로 생긴 책임 경계 또는 상태 변화: [직접 작성]

#### S-level 심화 추적

- 기존 설계가 충분하지 않았던 이유: [직접 작성]
- 핵심 state/ownership/lifetime transition: [변경 전 → 변경 중 → commit 후]
- failure scenario별 cleanup/rollback: [직접 작성]
- 이 commit이 보장하는 것: [직접 작성]
- 이 commit이 아직 보장하지 않는 것: [직접 작성]
- 후속 fix/test와 연결되는 구조: [직접 작성]
- 프로젝트 architecture 설명에 반드시 포함할 코드 근거: [직접 작성]


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
- 확인한 파일/심볼: [직접 기록]
- 필요한 경우 비교할 직전 관련 SHA/parent: [직접 기록]

#### 설계·상태 변화 기록

- 이 commit 직전 상태: [직접 작성]
- 해결하려던 문제: [직접 작성]
- 선택한 결정: [직접 작성]
- 새로 생긴 책임 경계 또는 상태 변화: [직접 작성]

#### A-level 핵심 확인

- 중요 boundary/failure path: [직접 작성]
- state/ownership/lifecycle 영향: [직접 작성]
- 이 commit이 보장하는 것과 남은 한계: [직접 작성]
- 다음 관련 commit과의 연결: [직접 작성]


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
- 확인한 파일/심볼: [직접 기록]
- 필요한 경우 비교할 직전 관련 SHA/parent: [직접 기록]

#### Failure → Fix 추적

- 기존 가정 또는 직전 구현 상태: [직접 작성]
- 실제 failure 또는 위험: [직접 작성]
- root cause: [source 설명을 실제 코드와 대조해 작성]
- 수정된 invariant/decision: [직접 작성]
- mutation/commit 순서의 변경: [직접 작성]
- 실제 수정 코드 근거: [파일·함수·핵심 구문]
- 연결되는 regression test SHA/근거: [직접 작성]

#### A-level 핵심 확인

- 중요 boundary/failure path: [직접 작성]
- state/ownership/lifecycle 영향: [직접 작성]
- 이 commit이 보장하는 것과 남은 한계: [직접 작성]
- 다음 관련 commit과의 연결: [직접 작성]


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
- 확인한 파일/심볼: [직접 기록]
- 필요한 경우 비교할 직전 관련 SHA/parent: [직접 기록]

#### Failure → Fix 추적

- 기존 가정 또는 직전 구현 상태: [직접 작성]
- 실제 failure 또는 위험: [직접 작성]
- root cause: [source 설명을 실제 코드와 대조해 작성]
- 수정된 invariant/decision: [직접 작성]
- mutation/commit 순서의 변경: [직접 작성]
- 실제 수정 코드 근거: [파일·함수·핵심 구문]
- 연결되는 regression test SHA/근거: [직접 작성]

#### A-level 핵심 확인

- 중요 boundary/failure path: [직접 작성]
- state/ownership/lifecycle 영향: [직접 작성]
- 이 commit이 보장하는 것과 남은 한계: [직접 작성]
- 다음 관련 commit과의 연결: [직접 작성]


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
- 확인한 파일/심볼: [직접 기록]
- 필요한 경우 비교할 직전 관련 SHA/parent: [직접 기록]

#### Failure → Fix 추적

- 기존 가정 또는 직전 구현 상태: [직접 작성]
- 실제 failure 또는 위험: [직접 작성]
- root cause: [source 설명을 실제 코드와 대조해 작성]
- 수정된 invariant/decision: [직접 작성]
- mutation/commit 순서의 변경: [직접 작성]
- 실제 수정 코드 근거: [파일·함수·핵심 구문]
- 연결되는 regression test SHA/근거: [직접 작성]

#### A-level 핵심 확인

- 중요 boundary/failure path: [직접 작성]
- state/ownership/lifecycle 영향: [직접 작성]
- 이 commit이 보장하는 것과 남은 한계: [직접 작성]
- 다음 관련 commit과의 연결: [직접 작성]


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
- 확인한 파일/심볼: [직접 기록]
- 필요한 경우 비교할 직전 관련 SHA/parent: [직접 기록]

#### Failure → Fix 추적

- 기존 가정 또는 직전 구현 상태: [직접 작성]
- 실제 failure 또는 위험: [직접 작성]
- root cause: [source 설명을 실제 코드와 대조해 작성]
- 수정된 invariant/decision: [직접 작성]
- mutation/commit 순서의 변경: [직접 작성]
- 실제 수정 코드 근거: [파일·함수·핵심 구문]
- 연결되는 regression test SHA/근거: [직접 작성]

#### A-level 핵심 확인

- 중요 boundary/failure path: [직접 작성]
- state/ownership/lifecycle 영향: [직접 작성]
- 이 commit이 보장하는 것과 남은 한계: [직접 작성]
- 다음 관련 commit과의 연결: [직접 작성]


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
- 확인한 파일/심볼: [직접 기록]
- 필요한 경우 비교할 직전 관련 SHA/parent: [직접 기록]

#### Test/verification 학습 기록

- 대상 production invariant: [직접 작성]
- 재현하는 failure 또는 boundary: [직접 작성]
- test technique: [differential / failure injection / white-box / deterministic random / structural bound 등 실제 코드 기준]
- 통과하는 production 코드 경로: [직접 작성]
- 이 테스트가 증명하는 것: [직접 작성]
- 이 테스트가 증명하지 않는 것: [직접 작성]
- 성격: [broad integration인지 deterministic regression인지 근거 포함]
- 후속 변경에서 막아야 하는 회귀: [직접 작성]

#### A-level 핵심 확인

- 중요 boundary/failure path: [직접 작성]
- state/ownership/lifecycle 영향: [직접 작성]
- 이 commit이 보장하는 것과 남은 한계: [직접 작성]
- 다음 관련 commit과의 연결: [직접 작성]


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
- 확인한 파일/심볼: [직접 기록]
- 필요한 경우 비교할 직전 관련 SHA/parent: [직접 기록]

#### Failure → Fix 추적

- 기존 가정 또는 직전 구현 상태: [직접 작성]
- 실제 failure 또는 위험: [직접 작성]
- root cause: [source 설명을 실제 코드와 대조해 작성]
- 수정된 invariant/decision: [직접 작성]
- mutation/commit 순서의 변경: [직접 작성]
- 실제 수정 코드 근거: [파일·함수·핵심 구문]
- 연결되는 regression test SHA/근거: [직접 작성]

#### S-level 심화 추적

- 기존 설계가 충분하지 않았던 이유: [직접 작성]
- 핵심 state/ownership/lifetime transition: [변경 전 → 변경 중 → commit 후]
- failure scenario별 cleanup/rollback: [직접 작성]
- 이 commit이 보장하는 것: [직접 작성]
- 이 commit이 아직 보장하지 않는 것: [직접 작성]
- 후속 fix/test와 연결되는 구조: [직접 작성]
- 프로젝트 architecture 설명에 반드시 포함할 코드 근거: [직접 작성]


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
- 확인한 파일/심볼: [직접 기록]
- 필요한 경우 비교할 직전 관련 SHA/parent: [직접 기록]

#### Test/verification 학습 기록

- 대상 production invariant: [직접 작성]
- 재현하는 failure 또는 boundary: [직접 작성]
- test technique: [differential / failure injection / white-box / deterministic random / structural bound 등 실제 코드 기준]
- 통과하는 production 코드 경로: [직접 작성]
- 이 테스트가 증명하는 것: [직접 작성]
- 이 테스트가 증명하지 않는 것: [직접 작성]
- 성격: [broad integration인지 deterministic regression인지 근거 포함]
- 후속 변경에서 막아야 하는 회귀: [직접 작성]

#### A-level 핵심 확인

- 중요 boundary/failure path: [직접 작성]
- state/ownership/lifecycle 영향: [직접 작성]
- 이 commit이 보장하는 것과 남은 한계: [직접 작성]
- 다음 관련 commit과의 연결: [직접 작성]


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
- 확인한 파일/심볼: [직접 기록]
- 필요한 경우 비교할 직전 관련 SHA/parent: [직접 기록]

#### Test/verification 학습 기록

- 대상 production invariant: [직접 작성]
- 재현하는 failure 또는 boundary: [직접 작성]
- test technique: [differential / failure injection / white-box / deterministic random / structural bound 등 실제 코드 기준]
- 통과하는 production 코드 경로: [직접 작성]
- 이 테스트가 증명하는 것: [직접 작성]
- 이 테스트가 증명하지 않는 것: [직접 작성]
- 성격: [broad integration인지 deterministic regression인지 근거 포함]
- 후속 변경에서 막아야 하는 회귀: [직접 작성]

#### A-level 핵심 확인

- 중요 boundary/failure path: [직접 작성]
- state/ownership/lifecycle 영향: [직접 작성]
- 이 commit이 보장하는 것과 남은 한계: [직접 작성]
- 다음 관련 commit과의 연결: [직접 작성]


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
| Every vector element in `[0, size)` is constructed exactly once and destroyed exactly o... | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Vector storage is deallocated by allocator state compatible with the state that allocat... | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Reallocation commits only after the replacement block is complete. Where the supported ... | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Range assignment and insertion must snapshot self-referential input before mutating the... | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Requested vector sizes and growth calculations must respect `allocator::max_size()` wit... | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |

## 7. Failure → Fix → Test 연결

| 기존 상태/production change | fix 또는 verification | Source에서 확정된 연결 관점 | 실제 failure/root cause | 실제 test production path |
| --- | --- | --- | --- | --- |
| `6f3cbf4794c9` | `0ce21f9cf12d` | bounded allocator로 capacity saturation/length rejection/block cleanup 검증 | [직접 작성] | [직접 작성] |
| `bdc4c3123bc9` | `61e8b46e668f` | self-range insert/assign 결과 회귀 검증 | [직접 작성] | [직접 작성] |
| `bc3a74b9342e` | `ccb98587e777` | null-storage no-op modifier와 allocator 상태 검증 | [직접 작성] | [직접 작성] |
| `b3124b3808d5` | `9051be26db5e` | construction/assignment/resize/aliased push-back failure injection | [직접 작성] | [직접 작성] |
| `797c33904db3` | `8df3d8e067c0` | insert copy/assignment/allocation failure sweep | [직접 작성] | [직접 작성] |
| `bdc4c3123bc9 → 61e8b46e668f` | `5bdb6eb81a89` | self-range oracle를 explicit snapshot expected value로 교정 | [직접 작성] | [직접 작성] |

- `0ce21f9cf12d`, `61e8b46e668f`, `ccb98587e777`는 이 Development Thread의 commit map에는 포함되지 않지만, source가 확정한 관련 regression commit입니다. Thread membership을 변경하지 않고 fix의 검증 연결만 기록합니다.

## 8. Ownership / state / responsibility 변화

| 시점 | Owner / state / responsibility | 변경 전 | 변경 후 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| `2eb9cb6c4273` | Establishes allocator-backed contiguous storage and the constructed-object ownership boundary. | [직접 작성] | [직접 작성] | [직접 작성] |
| `9db46550b13d` | Adds replacement-block reallocation and geometric capacity growth. | [직접 작성] | [직접 작성] | [직접 작성] |
| `6f3cbf4794c9` | Corrects growth arithmetic at the allocator limit. | [직접 작성] | [직접 작성] | [직접 작성] |
| `bdc4c3123bc9` | Snapshots self-range input before mutation invalidates it. | [직접 작성] | [직접 작성] | [직접 작성] |
| `bc3a74b9342e` | Removes empty-storage pointer arithmetic and adopts allocator-provided size types. | [직접 작성] | [직접 작성] | [직접 작성] |
| `b3124b3808d5` | Makes construction, assignment, resize growth, and aliased push-back transactional. | [직접 작성] | [직접 작성] | [직접 작성] |
| `9051be26db5e` | Injects element and allocation failures to validate rollback and live-object counts. | [직접 작성] | [직접 작성] | [직접 작성] |
| `797c33904db3` | Rebuilds fill/range insertion around explicit live-object and raw-storage paths. | [직접 작성] | [직접 작성] | [직접 작성] |
| `8df3d8e067c0` | Sweeps insertion copy, assignment, and allocation failures across both capacity branches. | [직접 작성] | [직접 작성] | [직접 작성] |
| `5bdb6eb81a89` | Replaces a questionable reference modifier with an explicit snapshot-derived test oracle. | [직접 작성] | [직접 작성] | [직접 작성] |

## 9. Thread 최종 상태

- 최종적으로 성립한 representation/state: [직접 작성]
- 최종적으로 보장하는 invariant: [위 ledger와 실제 코드 근거로 작성]
- 남아 있는 precondition 또는 보장하지 않는 범위: [직접 작성]
- 최종 verification evidence: [직접 작성]
- 이 상태에 도달하기 위해 필요했던 핵심 turning point commit: [직접 작성]

## 10. 최종 architecture 또는 execution flow 정리

아래 단계명은 source가 정의한 Thread progression을 따라가는 탐색 순서입니다. 실제 함수·상태·분기·코드 조각은 해당 SHA에서 직접 채웁니다.

| 단계 | 관련 commit | 실제 코드 위치 | 입력/기존 상태 | 핵심 transition | failure/cleanup | 다음 단계에 남기는 invariant |
| --- | --- | --- | --- | --- | --- | --- |
| Allocation ownership model | `2eb9cb6c4273` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Replacement-block reallocation | `9db46550b13d` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Allocator-limit growth | `6f3cbf4794c9` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Aliased range capture | `bdc4c3123bc9` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Empty-storage boundary | `bc3a74b9342e` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Transactional general mutation | `b3124b3808d5` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Failure injection | `9051be26db5e` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Insertion lifetime redesign | `797c33904db3` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Insertion failure sweep | `8df3d8e067c0` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Independent self-range oracle | `5bdb6eb81a89` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |

## 11. 학습 완료 자가 점검

- [ ] Commit map의 모든 SHA를 source 순서대로 확인했습니다.
- [ ] 각 commit 기록에 final HEAD가 아니라 해당 SHA의 실제 코드 근거가 있습니다.
- [ ] S/A commit은 decision, failure boundary, ownership/state transition을 설명할 수 있습니다.
- [ ] Test/perf commit은 production invariant, technique, production path, 증명/비증명 범위를 구분했습니다.
- [ ] Fix가 있는 경우 기존 가정 → failure/risk → root cause → 수정 → regression 연결을 설명할 수 있습니다.
- [ ] Invariant ledger가 commit history에 따라 어떻게 변했는지 설명할 수 있습니다.
- [ ] Thread 최종 상태와 architecture/execution flow를 실제 코드 근거로 자기 말로 설명할 수 있습니다.
