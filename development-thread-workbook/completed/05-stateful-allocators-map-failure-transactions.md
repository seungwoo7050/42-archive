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
- 확인한 파일/심볼: `include/ft_map.hpp`의 value allocator `_alloc`, rebound `_node_alloc`, default/range/copy constructor initializer lists, `get_allocator`.
- 필요한 경우 비교할 직전 관련 SHA/parent: 초기 node model `2c6dd8acdd20`은 `_node_alloc()`을 독립 default construction했습니다.

#### Failure → Fix 추적

- 기존 가정 또는 직전 구현 상태: allocator rebind type을 default-construct해도 public value allocator와 같은 resource owner라고 가정했습니다.
- 실제 failure 또는 위험: allocator가 pool id, arena pointer, accounting state를 보유하면 value allocator와 node allocator가 서로 다른 state를 가집니다. node를 잘못된 owner로 allocate/deallocate하거나 public allocator contract와 실제 ownership이 분리될 수 있습니다.
- root cause: rebind를 단순 type 변환으로만 보고 state 전파를 누락했습니다.
- 수정된 invariant/decision: 모든 map constructor에서 `_node_alloc(_alloc)` 또는 제공된 value allocator에서 rebound allocator를 구성해 type만 node로 바꾸고 identity/state는 이어갑니다.
- mutation/commit 순서의 변경: node allocation이 시작되기 전에 두 allocator object의 compatible state가 constructor initializer 단계에서 확정됩니다.
- 실제 수정 코드 근거: constructor initializer list의 `_alloc(alloc), _node_alloc(_alloc)` 계열 변경입니다.
- 연결되는 regression test SHA/근거: `d72b04c5ddc6`의 tracking allocator state가 rebind 후에도 같은 shared block counter와 failure point를 관찰합니다.

#### A-level 핵심 확인

- 중요 boundary/failure path: public allocator type과 internal node allocator type 사이의 rebind boundary입니다. 컴파일은 통과하지만 stateful allocator에서만 드러나는 silent ownership 오류입니다.
- state/ownership/lifecycle 영향: node allocation과 destruction/deallocation이 같은 allocator family state에 귀속됩니다.
- 이 commit이 보장하는 것과 남은 한계: constructor에서 rebind identity를 유지합니다. insertion/constructor/assignment 실패 시 ownership transaction 자체는 다음 commits에서 강화됩니다.
- 다음 관련 commit과의 연결: `cb08194d17b0`은 node가 allocator에서 나온 직후 tree owner에 연결되기 전의 orphan window를 제거합니다.

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
- 확인한 파일/심볼: `include/ft_map.hpp`의 `insert` search loop, `parent`, `insert_left` local state, `_create_node`, child link와 insertion fix-up.
- 필요한 경우 비교할 직전 관련 SHA/parent: `c0fdb8e3f84c`는 node allocation 뒤 parent side를 결정하려 comparator를 다시 호출했습니다.

#### Failure → Fix 추적

- 기존 가정 또는 직전 구현 상태: search로 parent를 찾은 뒤 node를 만들고, 어느 child에 붙일지 comparator를 한 번 더 호출했습니다.
- 실제 failure 또는 위험: node allocation/construction이 끝난 뒤 그 comparator call이 던지면 node는 아직 tree에 연결되지 않았고 catch owner도 없어 orphan/leak가 됩니다.
- root cause: potentially throwing policy operation을 resource acquisition 뒤, ownership commit 전 구간에 남겼습니다.
- 수정된 invariant/decision: search 중 매 비교 결과로 `insert_left`를 함께 기록하고 duplicate 판정까지 끝냅니다. 이후 node를 만든 뒤에는 저장된 side로 즉시 link하고 pointer/color repair만 수행합니다.
- mutation/commit 순서의 변경: 모든 comparator calls → allocation/construction → parent child link → size/fix-up입니다. allocate 후 compare가 사라집니다.
- 실제 수정 코드 근거: search loop의 `bool insert_left` 갱신과 `_create_node` 뒤 comparator가 없는 link branch입니다.
- 연결되는 regression test SHA/근거: `d72b04c5ddc6`이 comparator fail point를 sweep하고 allocation 이후 comparator invocation이 발생하면 outstanding node count로 드러나게 합니다.

#### A-level 핵심 확인

- 중요 boundary/failure path: acquired node가 아직 root/parent에서 reachable하지 않은 짧은 구간입니다.
- state/ownership/lifecycle 영향: comparator failure는 acquisition 전에 발생하므로 map state/allocator blocks가 변하지 않습니다. acquisition 성공 후 node는 즉시 map reachability에 들어갑니다.
- 이 commit이 보장하는 것과 남은 한계: normal insertion에서 post-allocation comparator throw orphan을 제거합니다. bulk construction과 assignment가 여러 successful inserts 뒤 실패하는 rollback은 별도입니다.
- 다음 관련 commit과의 연결: `55d3b3e7c104`가 여러 insertion으로 만든 partial tree 전체의 transaction을 처리합니다.

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
- 확인한 파일/심볼: `include/ft_map.hpp`의 range/copy constructors, `operator=`, private tree/comparator exchange helper, `clear`.
- 필요한 경우 비교할 직전 관련 SHA/parent: clear-then-insert assignment `c0fdb8e3f84c`; failure tests `d72b04c5ddc6`; ordering fix `0f4dd84e44ed`.

#### Failure → Fix 추적

- 기존 가정 또는 직전 구현 상태: constructor body에서 successful inserts가 자동으로 정리될 것이라 가정했고, assignment는 destination을 먼저 clear했습니다.
- 실제 failure 또는 위험: constructor가 완성되지 않으면 map destructor가 호출되지 않아 partial nodes가 남을 수 있습니다. assignment 실패는 original target을 잃고 partial replacement만 남깁니다.
- root cause: multi-node build의 temporary ownership과 commit point가 명시되지 않았습니다.
- 수정된 invariant/decision: constructor catch가 현재 reachable tree를 clear합니다. assignment는 target allocator와 source comparator로 complete temporary를 만들고 성공 후에만 policy/tree state를 exchange합니다.
- mutation/commit 순서의 변경: temporary build → complete 확인 → exchange commit → temporary destructor가 old target tree cleanup입니다. build failure면 target untouched, temporary/constructor partial tree만 clear합니다.
- 실제 수정 코드 근거: constructor `try { insert(...) } catch (...) { clear(); throw; }`, `operator=`의 temporary map과 private exchange 호출입니다.
- 연결되는 regression test SHA/근거: `d72b04c5ddc6`이 range/copy construction comparison/allocation failures와 assignment target preservation/outstanding nodes를 검사합니다.

#### A-level 핵심 확인

- 중요 boundary/failure path: object construction이 완료되기 전 destructor 자동 호출이 없는 구간과 assignment replacement build 구간입니다.
- state/ownership/lifecycle 영향: partial constructor nodes는 under-construction object가 clear하고, replacement nodes는 temporary가 소유합니다. commit 후 temporary가 old target owner가 됩니다.
- 이 commit이 보장하는 것과 남은 한계: comparator/allocation failure에서 partial constructor cleanup과 target preservation을 제공합니다. comparator exchange 자체가 throw할 때 tree/allocator보다 뒤에서 수행되면 partial commit 위험이 남아 `0f4dd84e44ed`가 순서를 고칩니다.
- 다음 관련 commit과의 연결: `d72b04c5ddc6`이 transaction을 검증하고, `0f4dd84e44ed`/`55d4ba1fb493`가 policy-assignment failure를 별도로 다룹니다.

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
- 확인한 파일/심볼: `tests/test_map_exceptions.cpp`의 `throwing_less`, shared comparator state, tracking allocator/shared block state, generated input iterator, insertion/constructor/copy/assignment failure tests.
- 필요한 경우 비교할 직전 관련 SHA/parent: production fixes `ae180871b160`, `cb08194d17b0`, `55d3b3e7c104`.

#### Test/verification 학습 기록

- 대상 production invariant: rebind allocator identity가 유지되고, every allocation은 tree/temporary owner에 연결되거나 released되며, failed bulk operation이 target을 보존해야 합니다.
- 재현하는 failure 또는 boundary: comparator call index, allocator allocation index, range/copy constructor progress, copy assignment replacement progress입니다.
- test technique: deterministic comparator/allocation failure injection과 outstanding-node accounting입니다.
- 통과하는 production 코드 경로: insertion search/acquisition/link, range/copy constructor catch/clear, temporary-tree assignment build/exchange입니다.
- 이 테스트가 증명하는 것: 검사한 fail points에서 insertion은 leak 없이 실패하고, constructors는 residual block 0이며, assignment target keys와 baseline target allocation count가 유지됩니다. rebind된 allocator copies가 같은 shared owner state를 사용합니다.
- 이 테스트가 증명하지 않는 것: comparator assignment 중 failure와 public swap commit ordering은 이 SHA의 suite 범위가 아닙니다. 모든 third-party allocator/comparator behavior도 exhaustive하지 않습니다.
- 성격: transaction boundary를 고정하는 deterministic failure-injection regression입니다.
- 후속 변경에서 막아야 하는 회귀: allocate-after/compare ordering 역전, constructor catch 제거, assignment target 조기 clear, rebind state 단절입니다.
- 실행 증거: fixture와 fail-point loops를 코드로 확인했습니다. test binary를 실행하지 않았습니다.

#### A-level 핵심 확인

- 중요 boundary/failure path: `throwing_less`는 지정 call에서 던지고 tracking allocator는 지정 acquisition에서 던집니다. generated iterator는 external container behavior 없이 range construction을 진행시킵니다.
- state/ownership/lifecycle 영향: shared allocator state가 rebound type마다 같은 outstanding count를 보므로 node block leak를 직접 계측합니다.
- 이 commit이 보장하는 것과 남은 한계: preceding fixes의 compare/allocation transaction을 강하게 뒷받침합니다. policy object assignment failure는 다음 fix/test가 필요합니다.
- 다음 관련 commit과의 연결: `0f4dd84e44ed`가 comparator assignment를 ownership commit보다 앞으로 옮기고 `55d4ba1fb493`가 그 failure를 주입합니다.

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
- 확인한 파일/심볼: `include/ft_map.hpp`의 public `swap`과 private tree/comparator exchange helper; comparator swap line과 allocator/header/size swap/refresh lines.
- 필요한 경우 비교할 직전 관련 SHA/parent: transaction commit `55d3b3e7c104`; regression `55d4ba1fb493`.

#### Failure → Fix 추적

- 기존 가정 또는 직전 구현 상태: tree/header/allocator ownership을 먼저 교환한 뒤 comparator를 교환해도 된다고 봤습니다.
- 실제 failure 또는 위험: comparator assignment가 그 뒤 던지면 physical tree는 상대 map으로 이동했는데 ordering policy 또는 allocator state는 원래 위치에 남아 search ordering과 deallocation ownership이 분리됩니다.
- root cause: potentially throwing policy commit을 irreversible physical ownership movement 뒤에 배치했습니다.
- 수정된 invariant/decision: comparator exchange를 public swap과 private assignment commit의 첫 단계로 수행합니다. 이 단계가 완료되기 전 root/header/size/allocator는 움직이지 않습니다.
- mutation/commit 순서의 변경: comparator policy exchange → allocator/tree/header/size ownership exchange → moved root를 new header에 reattach/refresh입니다.
- 실제 수정 코드 근거: 두 exchange function에서 comparator swap line이 physical state swaps보다 위로 이동한 diff입니다.
- 연결되는 regression test SHA/근거: `55d4ba1fb493`이 comparator assignment throw를 copy assignment와 public swap에 주입하고 contents/allocator/node counts/usability를 검사합니다.

#### A-level 핵심 확인

- 중요 boundary/failure path: comparator copy/assignment가 throw 가능한 policy operation이라는 점입니다.
- state/ownership/lifecycle 영향: failure 시 physical node tree와 allocator owners는 원래 map에 남고 complete replacement temporary는 자신의 allocator로 해제됩니다.
- 이 commit이 보장하는 것과 남은 한계: tree ownership이 comparator exchange failure 뒤 부분 이동하지 않게 합니다. comparator type 자체가 assignment 전에 state를 변형한 뒤 던지는 경우까지 일반적인 strong guarantee를 구현이 별도로 복원하지는 않습니다. regression fixture는 throw 전에 자기 state를 유지하는 동작을 검증합니다.
- 다음 관련 commit과의 연결: `55d4ba1fb493`가 distinct ordering directions/allocator owners로 policy-tree mismatch를 observable하게 만듭니다.

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
- 확인한 파일/심볼: `tests/test_map_policy_exceptions.cpp`의 stateful/throwing comparator, tracking allocator owner state, copy-assignment failure와 public-swap failure tests.
- 필요한 경우 비교할 직전 관련 SHA/parent: production ordering fix `0f4dd84e44ed`.

#### Test/verification 학습 기록

- 대상 production invariant: comparator assignment failure 전에 policy/tree/allocator ownership이 partial exchange되지 않고 각 map이 original ordering과 node owner를 유지해야 합니다.
- 재현하는 failure 또는 boundary: opposite ordering directions를 가진 comparators, distinct allocator ids, completed replacement temporary, comparator assignment throw입니다.
- test technique: deterministic policy-assignment failure injection + allocator ownership accounting + post-failure usability check입니다.
- 통과하는 production 코드 경로: copy assignment temporary construction/private exchange, public swap, comparator swap, temporary destructor, subsequent insert/traversal입니다.
- 이 테스트가 증명하는 것: chosen throwing comparator에서 failed copy assignment는 original target sequence/allocator/count를 유지하고 temporary nodes를 release하며, failed public swap은 양쪽 contents/allocator/count를 유지합니다. 두 maps는 이후 insert/search/traversal에 사용 가능합니다.
- 이 테스트가 증명하지 않는 것: comparator가 자기 assignment 중 state를 부분 변경한 뒤 던지는 arbitrary behavior, allocator swap 자체의 throw, concurrent access는 다루지 않습니다.
- 성격: subtle commit-ordering fix를 직접 고정하는 deterministic regression입니다.
- 후속 변경에서 막아야 하는 회귀: comparator exchange를 tree/allocator swap 뒤로 이동하거나, failed temporary ownership을 target에 일부 연결하고 cleanup을 누락하는 회귀입니다.
- 실행 증거: test fixture와 assertions를 코드로 검사했으며 실행하지 않았습니다.

#### A-level 핵심 확인

- 중요 boundary/failure path: temporary tree가 완성된 뒤 최종 commit 첫 policy assignment에서 실패하는 late failure입니다.
- state/ownership/lifecycle 영향: target/source physical trees는 그대로이고 temporary가 replacement nodes를 소유한 채 scope unwinding으로 해제됩니다. allocator counters가 이 ownership 분리를 확인합니다.
- 이 commit이 보장하는 것과 남은 한계: 해당 comparator/allocator 모델에서 state preservation과 leak absence를 증명합니다. 언어 수준의 모든 policy implementation을 일반화하지는 않습니다.
- 다음 관련 commit과의 연결: 이 Thread의 최종 transaction rule을 검증하며 이후 acceptance/sanitizer suite에 포함됩니다.

## 6. Invariant ledger

### Source에서 확정된 관련 invariant

- The map's comparator defines key equivalence and tree ordering; the rebound node allocator defines physical node ownership. Copy, assignment, and swap must keep policy state and owned tree state coherent.
- At every failure boundary, each map node has exactly one owner or has been released. Comparator, allocator, and tree ownership must not become partially exchanged when policy assignment throws.

### 시간에 따른 변화 기록

| Invariant | 처음 도입된 commit | 부족함이 드러난 commit/상태 | 강화·복구한 fix | 고정한 test/perf | 직접 확인한 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| Comparator defines ordering; rebound allocator defines physical ownership; bulk operations keep them coherent | comparator/tree는 `c0fdb8e3f84c`, node allocator는 `2c6dd8acdd20` | node allocator default construction으로 public allocator state 상실; assignment/swap commit 순서 위험 | `ae180871b160`, `55d3b3e7c104`, `0f4dd84e44ed` | `d72b04c5ddc6`, `55d4ba1fb493` | constructor allocator initializers, temporary assignment, policy-first exchange, owner counters |
| Every failure leaves each node with exactly one owner or released; no partial policy/tree exchange | node create rollback은 `2c6dd8acdd20` | post-allocation comparator throw orphan, partial constructors, clear-first assignment, tree-first comparator swap | `cb08194d17b0`, `55d3b3e7c104`, `0f4dd84e44ed` | `d72b04c5ddc6`, `55d4ba1fb493` | compare-before-allocate, catch-clear, temporary owner, policy-first commit, block counts |

## 7. Failure → Fix → Test 연결

| 기존 상태/production change | fix 또는 verification | Source에서 확정된 연결 관점 | 실제 failure/root cause | 실제 test production path |
| --- | --- | --- | --- | --- |
| `ae180871b160` | `d72b04c5ddc6` | stateful allocator ownership이 failure suite에서 간접 검증 | rebind type default construction이 allocator identity를 끊음 | tracking allocator copy/rebind → node operations → shared outstanding counts |
| `cb08194d17b0` | `d72b04c5ddc6` | comparator failure after allocation이 없음을 sweep | attachment-side comparator가 acquired unlinked node 뒤 throw | compare fail sweep → allocation count/owned node assertions |
| `55d3b3e7c104` | `d72b04c5ddc6` | constructor rollback과 assignment target preservation 검증 | partial constructor cleanup 부재, target clear-first | range/copy/assignment failure → clear/temp destruction → keys/counts |
| `0f4dd84e44ed` | `55d4ba1fb493` | comparator-assignment failure에서 policy/tree ownership 보존 검증 | physical ownership을 policy보다 먼저 옮긴 partial commit | comparator assignment throw → original contents/allocator/count/usability |

## 8. Ownership / state / responsibility 변화

| 시점 | Owner / state / responsibility | 변경 전 | 변경 후 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| `ae180871b160` | Preserves value-allocator state when rebinding to node allocation. | node allocator 독립 default state | value allocator family state로 node allocator 구성 | constructor initializers |
| `cb08194d17b0` | Finishes comparator search before allocating an unlinked node. | acquired node와 link 사이 policy throw 가능 | all compare before acquisition, then immediate link | `insert_left`, `_create_node` ordering |
| `55d3b3e7c104` | Cleans partial constructors and builds copy-assignment replacement trees off to the side. | under-construction/target가 partial state 소유 | constructor clear 또는 temporary가 replacement 소유 | catch-clear, temporary assignment |
| `d72b04c5ddc6` | Injects comparison and allocation failures and accounts for every node. | ownership 근거가 코드 추론 | shared test state가 every block 계측 | map exception fixtures |
| `0f4dd84e44ed` | Exchanges comparator state before allocator and tree ownership can move. | physical ownership 먼저 교환 | policy 성공 뒤에만 physical commit | swap/exchange order |
| `55d4ba1fb493` | Verifies copy assignment and public swap under comparator-assignment failure. | late policy failure evidence 부족 | distinct owner/order tests가 preservation 고정 | policy exception tests |

## 9. Thread 최종 상태

- 최종적으로 성립한 representation/state: map은 comparator policy, public value allocator, compatible rebound node allocator, header-owned tree를 함께 보유합니다. replacement tree는 target 밖 temporary에서 완성되고 commit 전까지 독립 owner입니다.
- 최종적으로 보장하는 invariant: comparator calls는 insertion acquisition 전에 끝납니다. partial constructors는 reachable nodes를 clear합니다. failed assignment/swap은 physical tree/allocator ownership을 부분 교환하지 않으며 각 node는 original map 또는 temporary에 속하거나 해제됩니다.
- 남아 있는 precondition 또는 보장하지 않는 범위: comparator/allocator의 자체 copy/assignment semantics가 내부 state를 바꾸고 throw하는 임의 구현에 대해 별도 universal rollback은 없습니다. tests는 repository의 deterministic fixtures가 정의한 failure behavior를 검증합니다.
- 최종 verification evidence: comparator/allocation fail-point sweeps, constructor residual count 0, assignment target preservation, distinct allocator/comparator swap failure tests를 코드로 확인했습니다. 실제 실행은 수행하지 않았습니다.
- 이 상태에 도달하기 위해 필요했던 핵심 turning point commit: unowned acquisition window를 제거한 `cb08194d17b0`, temporary-tree transaction `55d3b3e7c104`, policy-first commit `0f4dd84e44ed`입니다.

## 10. 최종 architecture 또는 execution flow 정리

아래 단계명은 source가 정의한 Thread progression을 따라가는 탐색 순서입니다. 실제 함수·상태·분기·코드 조각은 해당 SHA에서 직접 채웁니다.

| 단계 | 관련 commit | 실제 코드 위치 | 입력/기존 상태 | 핵심 transition | failure/cleanup | 다음 단계에 남기는 invariant |
| --- | --- | --- | --- | --- | --- | --- |
| Allocator rebind identity | `ae180871b160` | map constructor initializers | value allocator state | rebound node allocator를 value allocator에서 구성 | construction 전 policy 단계 | allocation/deallocation owner compatibility |
| Comparison-before-allocation boundary | `cb08194d17b0` | `insert` search/link | key, comparator, current tree | parent와 side 확정 후 node acquire/link | compare throw는 acquisition 전 | no unowned node after policy throw |
| Temporary-tree construction/assignment | `55d3b3e7c104` | constructors, `operator=`, exchange | input/source와 original target | temporary complete 후 commit | partial clear/temp destructor | original target preserved until commit |
| Failure-injection ownership proof | `d72b04c5ddc6` | map exception tests | compare/alloc fail index | production path 반복 주입 | outstanding nodes/keys 관찰 | transaction evidence |
| Comparator-before-ownership exchange | `0f4dd84e44ed` | public/private swap | two policies and trees | comparator exchange 먼저, then physical ownership | policy throw 시 trees untouched | no partial physical transfer |
| Comparator-assignment regression | `55d4ba1fb493` | policy exception tests | opposite ordering/distinct allocators | late failure 후 original state 검사 | temporary nodes released | policy/tree/owner coherence evidence |

## 11. 학습 완료 자가 점검

- [x] Commit map의 모든 SHA를 source 순서대로 확인했습니다.
- [x] 각 commit 기록에 final HEAD가 아니라 해당 SHA의 실제 코드 근거가 있습니다.
- [x] S/A commit은 decision, failure boundary, ownership/state transition을 설명할 수 있습니다.
- [x] Test/perf commit은 production invariant, technique, production path, 증명/비증명 범위를 구분했습니다.
- [x] Fix가 있는 경우 기존 가정 → failure/risk → root cause → 수정 → regression 연결을 설명할 수 있습니다.
- [x] Invariant ledger가 commit history에 따라 어떻게 변했는지 설명할 수 있습니다.
- [x] Thread 최종 상태와 architecture/execution flow를 실제 코드 근거로 자기 말로 설명할 수 있습니다.
