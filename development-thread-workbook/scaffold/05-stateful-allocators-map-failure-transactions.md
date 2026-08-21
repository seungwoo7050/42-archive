# Stateful Allocators and Map Failure Transactions

## 1. Thread 목표

### Source-established significance

Map correctness depends on more than key/value ordering: allocator identity determines which state owns each node, and comparator state determines whether the same links describe a valid ordering. The thread first repairs lost allocator state, then ensures a comparator cannot throw after an allocation has no owner. It next makes construction and assignment transactional, and finally addresses a subtler policy failure where comparator assignment can interrupt swap. The resulting rule is consistent across the sequence: policy state must be settled before physical tree ownership is committed, and every failure path must leave each node associated with exactly one valid owner.

### 이 Thread에서 복원할 것

- 위 significance가 설명하는 변화 과정을 각 commit의 실제 SHA 코드로 재구성합니다.
- source가 확정한 commit 역할과 importance를 바꾸지 않고, 실제 implementation/failure/test 근거만 직접 채웁니다.

### Source에서 직접 연결되는 architecture

- The map's comparator defines key equivalence and tree ordering; the rebound node allocator defines physical node ownership. Copy, assignment, and swap must keep policy state and owned tree state coherent.

### Source에서 직접 연결되는 Major Engineering Difficulties

- Preserving stateful allocator and comparator semantics through node rebinding, insertion, construction, copy assignment, and public swap, including exceptions raised at comparator-call and comparator-assignment boundaries.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- allocator rebind 후에도 ownership identity를 유지해야 하는 이유는 무엇인가?
- comparator call과 node allocation의 순서를 어떻게 배치해야 unowned-node failure window가 사라지는가?
- constructor/copy assignment에서 temporary tree가 ownership transaction을 어떻게 격리하는가?
- comparator assignment 자체가 throw할 수 있을 때 policy state와 physical tree ownership 중 무엇을 먼저 commit해야 하는가?

## 3. 완료 기준

- A: 주요 subsystem/boundary/failure path/integration point를 실제 코드와 설계 판단으로 연결하고, 관련 regression 또는 다음 fix와의 관계를 설명할 수 있어야 합니다.
- 모든 commit은 해당 SHA의 코드 또는 test/build diff를 근거로 기록합니다.
- Thread 최종 설명은 source 요약을 복사하는 것으로 끝내지 않고, 직접 확인한 코드 근거와 commit 간 변화로 재구성합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source-established role |
| --- | --- | --- | --- | --- | --- |
| 1 | `ae180871b160` | `fix(map): 값 allocator 상태로 노드 allocator 구성` | A | RB_TREE, ALLOCATOR, RISK | Preserves value-allocator state when rebinding to node allocation. |
| 2 | `cb08194d17b0` | `fix(map): 삽입 위치를 노드 할당 전에 확정` | A | RB_TREE, EXCEPTION, DEBUG | Finishes comparator search before allocating an unlinked node. |
| 3 | `55d3b3e7c104` | `fix(map): 생성과 복사 대입 실패를 임시 tree로 격리` | A | RB_TREE, EXCEPTION, ALLOCATOR | Cleans partial constructors and builds copy-assignment replacement trees off to the side. |
| 4 | `d72b04c5ddc6` | `test(map): 비교·할당 실패 시 노드 소유권 검증` | A | TEST, RB_TREE, EXCEPTION | Injects comparison and allocation failures and accounts for every node. |
| 5 | `0f4dd84e44ed` | `fix(map): 비교자 교환 실패 전에 tree 소유권 유지` | A | RB_TREE, EXCEPTION, DEBUG | Exchanges comparator state before allocator and tree ownership can move. |
| 6 | `55d4ba1fb493` | `test(map): 비교자 대입 실패 뒤 컨테이너 상태 검증` | A | TEST, RB_TREE, EXCEPTION | Verifies copy assignment and public swap under comparator-assignment failure. |

## 5. Commit별 학습 기록

### 1. fix(map): 값 allocator 상태로 노드 allocator 구성

- SHA: `ae180871b160`
- Importance: A
- Tags: RB_TREE, ALLOCATOR, RISK
- Source-established role: Preserves value-allocator state when rebinding to node allocation.
- Source summary: Constructs the rebound node allocator from the map's value allocator state.
- Source rationale: Default-constructing the node allocator silently lost state for custom allocators, separating allocation ownership from the public allocator contract. This small fix restores a significant resource-ownership invariant.

#### 해당 SHA에서 확인할 실제 코드

- default/range/copy constructor에서 node allocator를 value allocator state로부터 구성하는 initializer를 확인합니다.
- rebind가 allocated type만 바꾸고 ownership identity는 유지한다는 점을 allocator constructor 호출과 `get_allocator()` 관계로 확인합니다.
- 이 SHA 이전 구현이 node allocator를 default-construct하던 지점을 parent diff에서 찾아 stateful allocator에서 어떤 불일치가 생길 수 있었는지 기록합니다.
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


### 2. fix(map): 삽입 위치를 노드 할당 전에 확정

- SHA: `cb08194d17b0`
- Importance: A
- Tags: RB_TREE, EXCEPTION, DEBUG
- Source-established role: Finishes comparator search before allocating an unlinked node.
- Source summary: Records the insertion side during tree search so no comparator call occurs after node allocation.
- Source rationale: A comparator exception after allocation could orphan an unlinked node. Moving all comparisons before allocation fixes the root cause at the transaction boundary and restores one-owner-at-all-times behavior.

#### 해당 SHA에서 확인할 실제 코드

- insertion traversal 중 최종 attachment side를 비교 결과와 함께 저장하는 local state를 확인합니다.
- duplicate detection과 모든 comparator call이 `_create_node` 또는 equivalent allocation 이전에 끝나는지 호출 순서를 추적합니다.
- allocation 이후 linking/red-black repair에는 pointer/color operation만 남는지 확인하여 comparator throw 뒤 unowned node window가 사라졌는지 검증합니다.
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


### 3. fix(map): 생성과 복사 대입 실패를 임시 tree로 격리

- SHA: `55d3b3e7c104`
- Importance: A
- Tags: RB_TREE, EXCEPTION, ALLOCATOR
- Source-established role: Cleans partial constructors and builds copy-assignment replacement trees off to the side.
- Source summary: Adds constructor rollback and copy-and-swap-style temporary-tree assignment for map.
- Source rationale: Range/copy construction now clears partial trees on failure, while assignment preserves the destination until a complete replacement exists. This is significant resource and state transaction engineering, though it does not redefine the tree structure itself.

#### Source에서 확정된 핵심 판단

- Problem: Range and copy construction inserted nodes incrementally without cleaning the partially built tree when comparison or allocation failed. Copy assignment cleared the destination before rebuilding, so failure destroyed the original value and could leave a partial replacement.
- Decision: Constructors catch failures, clear every reachable new node, and rethrow. Assignment builds a complete temporary map using the destination allocator and source comparator, then exchanges comparator and tree state only after construction succeeds.
- Why it mattered: The change establishes map's transaction boundary for bulk ownership changes. It preserves the destination under failure and ensures that a partially built tree never escapes without an owner.

#### 해당 SHA에서 확인할 실제 코드

- range/copy constructor에서 insertion failure를 catch하고 `clear()` 후 rethrow하는 rollback 경로를 확인합니다.
- copy assignment가 destination allocator와 source comparator로 temporary map을 먼저 완성하는지 확인합니다.
- complete temporary tree 이후 private exchange가 새 tree를 install하고 temporary가 old destination을 destroy하는 ownership 흐름을 그립니다.
- source가 comparator policy swap 자체의 throw ordering은 후속 commit에서 hardened된다고 명시하므로, 이 SHA에서 그 residual risk를 표시합니다.
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


### 4. test(map): 비교·할당 실패 시 노드 소유권 검증

- SHA: `d72b04c5ddc6`
- Importance: A
- Tags: TEST, RB_TREE, EXCEPTION
- Source-established role: Injects comparison and allocation failures and accounts for every node.
- Source summary: Adds comparator and allocator failure injection for insertion, constructors, copying, and assignment.
- Source rationale: The suite verifies that every allocated node remains owned or is released and that failed assignment preserves the target. It directly validates the map transaction boundaries established by the preceding fixes.

#### 해당 SHA에서 확인할 실제 코드

- stateful comparator와 rebound-surviving allocator fixture의 identity/failure counter/outstanding node tracking을 확인합니다.
- insertion comparator failure sweep가 allocation 이후 comparator call이 없다는 production invariant를 어떻게 검증하는지 확인합니다.
- range/copy construction의 comparison/allocation failure 후 residual node count가 zero인지 확인합니다.
- copy assignment failure에서 pre-existing target keys와 baseline allocation count가 보존되는지 확인합니다.
- generated input iterator가 다른 container implementation에 의존하지 않고 test values를 공급하는 방식을 확인합니다.
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


### 5. fix(map): 비교자 교환 실패 전에 tree 소유권 유지

- SHA: `0f4dd84e44ed`
- Importance: A
- Tags: RB_TREE, EXCEPTION, DEBUG
- Source-established role: Exchanges comparator state before allocator and tree ownership can move.
- Source summary: Moves comparator exchange before allocator and tree ownership exchange in map swap and assignment commit.
- Source rationale: If comparator assignment throws after tree pointers move, ordering policy and physical ownership can diverge. This small ordering fix prevents partial ownership transfer and restores a high-risk exception invariant.

#### 해당 SHA에서 확인할 실제 코드

- public swap과 private assignment exchange에서 comparator exchange가 allocator/root/size ownership exchange보다 먼저 수행되는 순서를 확인합니다.
- comparator assignment throw 시점에 두 map의 original root/size/allocator가 아직 움직이지 않았는지 state mutation 순서를 표시합니다.
- comparator step 성공 후 ownership swap과 header refresh가 수행되는 commit phase를 구분합니다.
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


### 6. test(map): 비교자 대입 실패 뒤 컨테이너 상태 검증

- SHA: `55d4ba1fb493`
- Importance: A
- Tags: TEST, RB_TREE, EXCEPTION
- Source-established role: Verifies copy assignment and public swap under comparator-assignment failure.
- Source summary: Injects comparator-assignment failure into copy assignment and public swap with distinct allocator owners and order directions.
- Source rationale: The tests make partial policy exchange observable and verify both maps retain contents, allocator identity, node counts, and usability. They strongly validate the subtle commit-ordering fix.

#### 해당 SHA에서 확인할 실제 코드

- assignment에서 throw할 수 있는 comparator와 distinct allocator identity/outstanding block을 추적하는 fixture를 확인합니다.
- copy assignment failure에서 target의 original descending sequence, allocator node count, 추가 insertion 가능성이 보존되는지 확인합니다.
- public swap failure에서 두 map의 contents, allocator identity, node ownership count가 모두 original 상태인지 확인합니다.
- completed temporary tree가 failure 뒤 release되는 assertion을 확인합니다.
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

- The map's comparator defines key equivalence and tree ordering; the rebound node allocator defines physical node ownership. Copy, assignment, and swap must keep policy state and owned tree state coherent.
- At every failure boundary, each map node has exactly one owner or has been released. Comparator, allocator, and tree ownership must not become partially exchanged when policy assignment throws.

### 시간에 따른 변화 기록

| Invariant | 처음 도입된 commit | 부족함이 드러난 commit/상태 | 강화·복구한 fix | 고정한 test/perf | 직접 확인한 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| The map's comparator defines key equivalence and tree ordering; the rebound node alloca... | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| At every failure boundary, each map node has exactly one owner or has been released. Co... | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |

## 7. Failure → Fix → Test 연결

| 기존 상태/production change | fix 또는 verification | Source에서 확정된 연결 관점 | 실제 failure/root cause | 실제 test production path |
| --- | --- | --- | --- | --- |
| `ae180871b160` | `d72b04c5ddc6` | stateful allocator ownership이 failure suite에서 간접 검증 | [직접 작성] | [직접 작성] |
| `cb08194d17b0` | `d72b04c5ddc6` | comparator failure after allocation이 없음을 sweep | [직접 작성] | [직접 작성] |
| `55d3b3e7c104` | `d72b04c5ddc6` | constructor rollback과 assignment target preservation 검증 | [직접 작성] | [직접 작성] |
| `0f4dd84e44ed` | `55d4ba1fb493` | comparator-assignment failure에서 policy/tree ownership 보존 검증 | [직접 작성] | [직접 작성] |

## 8. Ownership / state / responsibility 변화

| 시점 | Owner / state / responsibility | 변경 전 | 변경 후 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| `ae180871b160` | Preserves value-allocator state when rebinding to node allocation. | [직접 작성] | [직접 작성] | [직접 작성] |
| `cb08194d17b0` | Finishes comparator search before allocating an unlinked node. | [직접 작성] | [직접 작성] | [직접 작성] |
| `55d3b3e7c104` | Cleans partial constructors and builds copy-assignment replacement trees off to the side. | [직접 작성] | [직접 작성] | [직접 작성] |
| `d72b04c5ddc6` | Injects comparison and allocation failures and accounts for every node. | [직접 작성] | [직접 작성] | [직접 작성] |
| `0f4dd84e44ed` | Exchanges comparator state before allocator and tree ownership can move. | [직접 작성] | [직접 작성] | [직접 작성] |
| `55d4ba1fb493` | Verifies copy assignment and public swap under comparator-assignment failure. | [직접 작성] | [직접 작성] | [직접 작성] |

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
| Allocator rebind identity | `ae180871b160` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Comparison-before-allocation boundary | `cb08194d17b0` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Temporary-tree construction/assignment | `55d3b3e7c104` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Failure-injection ownership proof | `d72b04c5ddc6` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Comparator-before-ownership exchange | `0f4dd84e44ed` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Comparator-assignment regression | `55d4ba1fb493` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |

## 11. 학습 완료 자가 점검

- [ ] Commit map의 모든 SHA를 source 순서대로 확인했습니다.
- [ ] 각 commit 기록에 final HEAD가 아니라 해당 SHA의 실제 코드 근거가 있습니다.
- [ ] S/A commit은 decision, failure boundary, ownership/state transition을 설명할 수 있습니다.
- [ ] Test/perf commit은 production invariant, technique, production path, 증명/비증명 범위를 구분했습니다.
- [ ] Fix가 있는 경우 기존 가정 → failure/risk → root cause → 수정 → regression 연결을 설명할 수 있습니다.
- [ ] Invariant ledger가 commit history에 따라 어떻게 변했는지 설명할 수 있습니다.
- [ ] Thread 최종 상태와 architecture/execution flow를 실제 코드 근거로 자기 말로 설명할 수 있습니다.
