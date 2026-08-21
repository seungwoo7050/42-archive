# Map from Unbalanced Search Tree to Verified Red-black Core

## 1. Thread 목표

### Source-established significance

The public map surface first exists as an ordinary BST, which is sufficient to establish comparator semantics and observable ordering but not the required worst-case complexity. Insertion balancing supplies the first red-black mechanism; deletion then adds the more difficult state restoration for removed black nodes and null replacements. The later tests intentionally move beyond output comparison: a white-box inspector proves parent links, header state, red constraints, black height, and node reachability, while complexity tests prove that the structure remains logarithmic under ascending, descending, and shuffled input. The sequence distinguishes functional ordering from structural correctness and asymptotic correctness.

### 이 Thread에서 복원할 것

- 위 significance가 설명하는 변화 과정을 각 commit의 실제 SHA 코드로 재구성합니다.
- source가 확정한 commit 역할과 importance를 바꾸지 않고, 실제 implementation/failure/test 근거만 직접 채웁니다.

### Source에서 직접 연결되는 architecture

- `ft::map` stores values in allocator-created nodes linked as a red-black tree. A value-free header sentinel owns the root, minimum, and maximum links and is also the stable representation of `end()`.

### Source에서 직접 연결되는 Major Engineering Difficulties

- Implementing red-black insertion and deletion, especially deletion where a removed black node may leave a null replacement and the algorithm must carry explicit parent context through symmetric sibling, recoloring, and rotation cases.
- Verifying properties that public sorted output cannot establish: red-black color rules, black height, parent links, header extrema, node reachability, iterator stability, and logarithmic structural bounds.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- ordinary BST가 public ordering은 만족하면서도 map의 asymptotic requirement를 위반할 수 있는 이유는 무엇인가?
- red-black insertion과 deletion이 각각 어떤 state를 보존/복구해야 하는가?
- null replacement가 있는 deletion에서 explicit parent context가 필요한 이유는 무엇인가?
- sorted output parity만으로 증명할 수 없는 structural property는 무엇이며 inspector가 무엇을 추가로 증명하는가?
- height/comparator upper bound가 timing benchmark보다 어떤 회귀를 안정적으로 잡는가?

## 3. 완료 기준

- A: 주요 subsystem/boundary/failure path/integration point를 실제 코드와 설계 판단으로 연결하고, 관련 regression 또는 다음 fix와의 관계를 설명할 수 있어야 합니다.
- B: Thread 흐름에서 맡는 구현 역할, 필요한 상태 변화와 핵심 코드 위치를 해당 SHA 기준으로 확인할 수 있어야 합니다.
- S: 핵심 architecture/invariant를 직전 상태 → failure 가능성 → 결정 → 실제 핵심 코드 → ownership/lifecycle/state transition → 후속 fix/test까지 코드 근거로 설명할 수 있어야 합니다.
- 모든 commit은 해당 SHA의 코드 또는 test/build diff를 근거로 기록합니다.
- Thread 최종 설명은 source 요약을 복사하는 것으로 끝내지 않고, 직접 확인한 코드 근거와 commit 간 변화로 재구성합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source-established role |
| --- | --- | --- | --- | --- | --- |
| 1 | `2c6dd8acdd20` | `feat(map): 노드 소유권과 빈 tree 상태 구현` | A | RB_TREE, ALLOCATOR, ARCH | Establishes individually allocated nodes and single-root ownership. |
| 2 | `c0fdb8e3f84c` | `feat(map): 삽입과 첨자 및 복사 동작 구현` | B | RB_TREE | Adds comparator-defined BST insertion, indexing, and copying. |
| 3 | `0f70c1fcc520` | `feat(map): 삭제와 clear 및 swap 구현` | B | RB_TREE, ALLOCATOR | Adds ordinary BST erasure and tree exchange. |
| 4 | `f29fd8a91523` | `feat(map): 레드-블랙 삽입 회전과 색 보정 구현` | S | CORE, RB_TREE, HARD | Introduces rotations and insertion recoloring. |
| 5 | `8f8b67961819` | `test(map): 정렬 입력 삽입과 검색 경계 stress 검증` | B | TEST, RB_TREE | Exercises adversarial sorted insertion and query boundaries. |
| 6 | `a055cb19500b` | `feat(map): 레드-블랙 삭제 보정 구현` | S | CORE, RB_TREE, HARD | Adds deletion transplant state and double-black correction. |
| 7 | `86922f1ddfa0` | `test(map): 반복 삭제·복사·대입·교환 stress 검증` | B | TEST, RB_TREE | Stresses repeated erasure, copying, assignment, and swap against `std::map`. |
| 8 | `cd67e6a31bb7` | `test(map): 무작위 연산마다 레드-블랙 불변식 검증` | A | TEST, RB_TREE, RISK | Validates all structural red-black invariants after deterministic random operations. |
| 9 | `cd8ebbb2c01e` | `perf(map): 높이와 비교 횟수 회귀 상한 추가` | A | PERF, RB_TREE, TEST | Enforces red-black height and comparator-count upper bounds. |

## 5. Commit별 학습 기록

### 1. feat(map): 노드 소유권과 빈 tree 상태 구현

- SHA: `2c6dd8acdd20`
- Importance: A
- Tags: RB_TREE, ALLOCATOR, ARCH
- Source-established role: Establishes individually allocated nodes and single-root ownership.
- Source summary: Introduces map's individually allocated nodes, parent/child links, null-root empty state, and recursive ownership cleanup.
- Source rationale: This is the associative container's foundational ownership substrate and enables stable value addresses. It is significant, but the final defining architecture arrives later with red-black balancing and a value-free header sentinel.

#### 해당 SHA에서 확인할 실제 코드

- map node의 parent/left/right link와 stored key/value의 위치, root/size empty state를 확인합니다.
- value allocator에서 node type으로 rebound된 allocator가 node allocate/construct/destroy/deallocate에 사용되는 경로를 추적합니다.
- node construction throw 시 allocation을 즉시 해제하는 failure branch와 recursive clear의 single-root ownership 경로를 확인합니다.
- 이 SHA의 tree가 아직 unbalanced이며 node allocator state construction은 후속 fix 대상이라는 source-defined 한계를 기록합니다.
- 확인한 파일/심볼: `include/ft_map.hpp`의 nested `node`, `_root`, `_size`, `_alloc`, `_node_alloc`, `_create_node`, `_destroy_node`, recursive `_clear`.
- 필요한 경우 비교할 직전 관련 SHA/parent: parent에는 map header가 없고 이 commit이 초기 ownership representation을 추가합니다. allocator state 문제는 `ae180871b160`에서 고칩니다.

#### 설계·상태 변화 기록

- 이 commit 직전 상태: map object와 node ownership이 정의되지 않았습니다.
- 해결하려던 문제: key/value의 안정된 주소를 유지하면서 각 tree node를 독립적으로 생성·파괴하고, root 하나에서 전체 ownership을 도달 가능하게 해야 했습니다.
- 선택한 결정: node가 value와 parent/left/right link를 함께 보유하고 map이 `_root`와 `_size`를 소유합니다. value allocator를 node type으로 rebind해 node 단위로 allocate/construct합니다.
- 새로 생긴 책임 경계 또는 상태 변화: map의 root가 모든 reachable node의 단일 ownership entry가 되고, `_clear`가 post-order로 subtree를 해제합니다.

#### A-level 핵심 확인

- 중요 boundary/failure path: allocate 성공 뒤 node construction이 던지는 경우입니다. `_create_node`가 방금 받은 block을 즉시 deallocate하고 예외를 재전파합니다.
- state/ownership/lifecycle 영향: successful node만 tree에 연결되며 clear는 child subtree를 먼저 해제한 뒤 해당 node를 destroy/deallocate합니다.
- 이 commit이 보장하는 것과 남은 한계: 개별 node lifetime과 빈 `_root == NULL`, `_size == 0` 상태를 정의합니다. tree는 unbalanced이고 `_node_alloc`을 기본 생성해 stateful value allocator와 상태가 분리되는 결함이 있습니다.
- 다음 관련 commit과의 연결: `c0fdb8e3f84c`가 comparator search와 link를 추가하고, `f29fd8a91523`이 color/rotation을 추가합니다. allocator state는 Thread 05에서 교정됩니다.

### 2. feat(map): 삽입과 첨자 및 복사 동작 구현

- SHA: `c0fdb8e3f84c`
- Importance: B
- Tags: RB_TREE
- Source-established role: Adds comparator-defined BST insertion, indexing, and copying.
- Source summary: Adds unbalanced BST insertion, `operator[]`, range/copy construction, and copy assignment.
- Source rationale: These operations establish map's observable uniqueness and insertion semantics, but they operate within an unbalanced and weakly transactional design that later commits replace or harden.

#### 해당 SHA에서 확인할 실제 코드

- insertion search가 comparator로 왼쪽/오른쪽을 결정하고, 양방향 less가 모두 false일 때 duplicate로 판단하는 조건을 확인합니다.
- `operator[]`가 default mapped value를 만들어 insertion path를 재사용하는 호출 관계를 확인합니다.
- range/copy construction과 assignment가 visible element insertion을 어떻게 반복하는지 추적합니다.
- node allocation 뒤 parent side를 결정하기 위해 comparator를 다시 호출하는 위치를 표시하고, 후속 `cb08194d17b0`의 fix 대상임을 기록합니다.
- 확인한 파일/심볼: `include/ft_map.hpp`의 `insert`, `operator[]`, range/copy constructor, `operator=`.
- 필요한 경우 비교할 직전 관련 SHA/parent: `2c6dd8acdd20`의 node-only state; comparator-after-allocation fix `cb08194d17b0`.

#### 설계·상태 변화 기록

- 이 commit 직전 상태: nodes를 만들고 지울 수는 있지만 key로 위치를 찾거나 public insertion/copy를 수행할 수 없었습니다.
- 해결하려던 문제: comparator만으로 strict ordering과 key equivalence를 정의하고 map API가 tree search를 재사용해야 했습니다.
- 선택한 결정: `_comp(value.first, current.first)`이면 left, 반대 비교면 right, 둘 다 false면 duplicate입니다. `operator[]`는 `(key, mapped_type())`를 insert하고 returned iterator의 second를 반환합니다.
- 새로 생긴 책임 경계 또는 상태 변화: comparator가 tree ordering/equivalence를 결정하고 insertion이 root 또는 parent child link와 `_size`를 갱신합니다.

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: balanced 여부와 무관하게 map의 observable uniqueness, sorted traversal에 필요한 BST ordering을 확립합니다.
- 핵심 코드와 상태 변화: duplicate에서는 allocation 없이 기존 node를 반환하고, 새 key는 search parent 아래 link 후 size 증가입니다. range/copy는 같은 public insertion을 반복합니다.
- 다음 commit에 넘기는 전제: erase는 node identity와 parent/child links를 기반으로 transplant할 수 있습니다. 다만 allocation 뒤 comparator 재호출과 destructive assignment는 후속 exception fix 대상입니다.

### 3. feat(map): 삭제와 clear 및 swap 구현

- SHA: `0f70c1fcc520`
- Importance: B
- Tags: RB_TREE, ALLOCATOR
- Source-established role: Adds ordinary BST erasure and tree exchange.
- Source summary: Adds node erasure, range erasure, clear, and map swap for the initial BST.
- Source rationale: The commit completes normal mutation and ownership operations, but deletion is not yet red-black aware and swap is later revised for iterator and policy-exception correctness.

#### 해당 SHA에서 확인할 실제 코드

- 0/1-child erase의 transplant와 2-child erase의 in-order successor physical transplant 경로를 구분합니다.
- `pair<const Key, T>`의 immutable key 때문에 key assignment 대신 node transplant를 택한 코드 위치를 확인합니다.
- range erase에서 current node destroy 전에 successor iterator/node를 저장하는 순서를 확인합니다.
- `clear`와 `swap`이 root/size/allocator/node allocator/comparator 상태를 어떻게 이동시키는지 확인하고, deletion balancing은 아직 없음을 기록합니다.
- 확인한 파일/심볼: `include/ft_map.hpp`의 erase overloads, minimum/successor lookup, transplant helper, `clear`, member `swap`.
- 필요한 경우 비교할 직전 관련 SHA/parent: `c0fdb8e3f84c`의 unbalanced insertion; RB deletion fix `a055cb19500b`.

#### 설계·상태 변화 기록

- 이 commit 직전 상태: insert된 node를 개별/범위로 제거하거나 두 map의 tree ownership을 교환할 public mutation이 없었습니다.
- 해결하려던 문제: const key를 수정하지 않고 BST ordering을 유지한 채 0/1/2-child node를 제거해야 했습니다.
- 선택한 결정: target value를 successor value로 대입하지 않고 successor node 자체를 target 위치로 transplant합니다. range erase는 다음 위치를 먼저 확보한 뒤 현재 node를 지웁니다.
- 새로 생긴 책임 경계 또는 상태 변화: erase가 link repair, size 감소, node destroy/deallocate를 담당하고 swap이 전체 tree/policy/allocator state를 교환합니다.

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: ordinary BST의 ownership mutation 표면을 완성합니다.
- 핵심 코드와 상태 변화: transplant는 parent의 child 또는 root를 교체하고 replacement parent를 고칩니다. 실제 removed node만 한 번 destroy/deallocate합니다.
- 다음 commit에 넘기는 전제: node physical movement 방식은 RB deletion에도 유지되지만 color와 black-height repair가 추가돼야 합니다.

### 4. feat(map): 레드-블랙 삽입 회전과 색 보정 구현

- SHA: `f29fd8a91523`
- Importance: S
- Tags: CORE, RB_TREE, HARD
- Source-established role: Introduces rotations and insertion recoloring.
- Source summary: Adds red/black node state, rotations, and insertion fix-up to keep the map balanced.
- Source rationale: This commit turns the map from a potentially linear BST into the project's defining ordered-container mechanism. The rotation and recoloring cases establish the core logarithmic structure and red-black invariants; omitting it would make the final architecture incomprehensible.

#### Source에서 확정된 핵심 판단

- Problem: The baseline map is an ordered BST, so ascending or descending insertion can make its height linear. Correct sorted iteration alone is insufficient because map's defining performance depends on maintaining a balanced search structure.
- Decision: Nodes gain red/black state. New non-root nodes begin red, the root remains black, and insertion repair handles red-uncles through recoloring and black-uncles through the appropriate single or double rotations. Left and right cases are implemented symmetrically.
- Why it mattered: This commit introduces the mechanism that makes map a red-black tree rather than merely a sorted linked structure. It establishes the logarithmic architecture that later deletion, invariant validation, and complexity tests must preserve.

#### 해당 SHA에서 확인할 실제 코드

- node color state가 추가된 지점과 new node/root의 초기 color 규칙을 확인합니다.
- left/right rotation이 parent-child links와 root를 갱신하는 모든 assignment를 순서대로 추적합니다.
- red parent에서 red uncle recolor case와 black uncle의 inner/outer rotation case를 좌우 대칭으로 표로 정리합니다.
- repair 종료 후 root black 강제가 어디서 수행되는지 확인하고, stored value를 이동하지 않고 links만 바꾸는지 확인합니다.
- 확인한 파일/심볼: `include/ft_map.hpp`의 node `red` field, left/right rotation helpers, insertion fix-up, `insert`의 fix-up 호출.
- 필요한 경우 비교할 직전 관련 SHA/parent: `c0fdb8e3f84c`의 ordinary BST insertion과 test `8f8b67961819`.

#### 설계·상태 변화 기록

- 이 commit 직전 상태: comparator ordering은 맞지만 sorted input에서 높이가 node 수까지 증가하는 ordinary BST였습니다.
- 해결하려던 문제: insertion 후 red-red 위반을 제거하면서 in-order ordering, parent links, root ownership을 유지해야 했습니다.
- 선택한 결정: 새 node는 red로 link하고 parent가 red인 동안 uncle color에 따라 recolor 또는 rotation합니다. root는 항상 black으로 normalize합니다.
- 새로 생긴 책임 경계 또는 상태 변화: insertion은 단순 link 이후 color/shape repair 단계까지 책임집니다. rotations는 value/object ownership을 이동하지 않고 links만 재배열합니다.

#### S-level 심화 추적

- 기존 설계가 충분하지 않았던 이유: ascending/descending input에서는 모든 node가 한쪽 child가 되어 search/insert가 O(n)입니다. sorted output만으로 이 문제는 보이지 않습니다.
- 핵심 state/ownership/lifetime transition: red leaf link → parent red 여부 검사 → red uncle이면 parent/uncle black, grandparent red 후 위로 진행 → black uncle이면 inner case를 먼저 rotate해 outer case로 만든 뒤 parent/grandparent recolor와 rotation → root black입니다.
- failure scenario별 cleanup/rollback: balancing 단계 자체는 allocation이나 user copy를 하지 않고 pointer/color만 바꿉니다. comparator와 node construction은 repair 전에 끝납니다. 따라서 fix-up 중 일반 exception cleanup 경로는 없습니다.
- 이 commit이 보장하는 것: insertion 뒤 root black, no red-red path, ordering/parent links를 유지하는 red-black insertion mechanism입니다.
- 이 commit이 아직 보장하지 않는 것: erase 후 black-height 복구, internal invariant white-box proof, explicit height bound는 아직 없습니다.
- 후속 fix/test와 연결되는 구조: `8f8b67961819`가 adversarial output/query를 검사하고, `a055cb19500b`가 deletion repair, `cd67e6a31bb7`/`cd8ebbb2c01e`가 structure/complexity를 직접 검증합니다.
- 프로젝트 architecture 설명에 반드시 포함할 코드 근거: 양방향 rotation의 root/parent/child assignment와 red-uncle vs inner/outer black-uncle cases입니다.

### 5. test(map): 정렬 입력 삽입과 검색 경계 stress 검증

- SHA: `8f8b67961819`
- Importance: B
- Tags: TEST, RB_TREE
- Source-established role: Exercises adversarial sorted insertion and query boundaries.
- Source summary: Stress-tests ascending and descending insertion plus query boundaries against `std::map`.
- Source rationale: The scenarios are well chosen to expose an ordinary BST's worst case and broaden functional confidence, but they do not directly validate height or every red-black invariant.

#### 해당 SHA에서 확인할 실제 코드

- ascending 96 keys와 descending 96 keys scenario가 각각 어떻게 구성되는지 확인합니다.
- 각 insertion 결과와 in-order sequence를 `std::map`과 비교하는 assertion을 찾습니다.
- present/absent query spread에서 `find`, bounds, `equal_range`, end parity를 확인합니다.
- 이 stress가 rotation/recoloring을 많이 유발하지만 직접 height/black-height proof는 아니라는 증명 범위를 기록합니다.
- 확인한 파일/심볼: map tests의 ascending/descending insertion scenario와 comparison/query helper.
- 필요한 경우 비교할 직전 관련 SHA/parent: production balancing `f29fd8a91523`.

#### Test/verification 학습 기록

- 대상 production invariant: adversarial insertion order에서도 map의 observable ordering, uniqueness, query boundary가 `std::map`과 일치해야 합니다.
- 재현하는 failure 또는 boundary: 1부터 96까지 정렬/역정렬 삽입, 존재/부재 key의 `find`, `lower_bound`, `upper_bound`, `equal_range`, `end`입니다.
- test technique: deterministic adversarial input을 사용한 differential integration test입니다.
- 통과하는 production 코드 경로: insert search/link/fix-up, in-order iterator, lookup/bounds입니다.
- 이 테스트가 증명하는 것: 많은 rotation/recolor가 필요한 입력에서도 public contents와 query 결과가 reference와 일치합니다.
- 이 테스트가 증명하지 않는 것: 실제 height, root color, red adjacency, black height, parent-link consistency는 직접 보지 않습니다.
- 성격: broad functional stress입니다. structure-specific proof는 아닙니다.
- 후속 변경에서 막아야 하는 회귀: sorted input에서 값 누락/중복, ordering 깨짐, lookup boundary 오류입니다.
- 실행 증거: test code 검사만 수행했으며 binary 실행 결과는 없습니다.

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: insertion balancing 직후 public behavior가 유지되는지 확인합니다.
- 핵심 코드와 상태 변화: test가 두 map에 같은 insertion/query를 적용하고 결과만 비교합니다.
- 다음 commit에 넘기는 전제: erase balancing은 별도 mechanism이며 이 insertion stress로 검증되지 않습니다.

### 6. feat(map): 레드-블랙 삭제 보정 구현

- SHA: `a055cb19500b`
- Importance: S
- Tags: CORE, RB_TREE, HARD
- Source-established role: Adds deletion transplant state and double-black correction.
- Source summary: Implements red-black deletion transplant bookkeeping and symmetric double-black fix-up.
- Source rationale: Deletion is the most intricate core state transition in the tree: removed color, replacement child, parent context, sibling cases, rotations, and recoloring must remain coherent even when the child is null. This is indispensable to the map's correctness story.

#### Source에서 확정된 핵심 판단

- Problem: Deleting a node from a red-black tree can reduce the black count on one root-to-leaf path. The replacement may be null, so the repair cannot rely on a normal node object to carry color and parent context. Incorrect handling can silently preserve sorted output while corrupting black height or future rotations.
- Decision: Erasure records the node physically moved, its original color, the replacement child, and an explicit replacement parent. If a black node was removed, a symmetric double-black repair examines sibling color and near/far child colors, performs recoloring or rotations, and finally forces the replacement and root black.
- Why it mattered: Deletion is a separate defining mechanism from insertion balancing and is substantially more failure-prone. This commit preserves the red-black invariants across all erase forms and enables repeated arbitrary deletion without degrading or corrupting the tree.

#### 해당 SHA에서 확인할 실제 코드

- erase에서 physically moved node, original color, replacement child, replacement parent를 어떤 local state로 보존하는지 확인합니다.
- replacement child가 null일 때도 parent context를 유지하여 fix-up을 계속하는 caller/callee 흐름을 추적합니다.
- red sibling, black sibling with two black children, near/far red child cases를 좌우 대칭으로 정리하고 각 case의 rotate/recolor 순서를 기록합니다.
- two-child deletion에서 successor node를 transplant하고 target color를 복사하되 immutable value object는 유지하는지 확인합니다.
- repair 후 replacement/root black normalization이 수행되는 지점을 확인합니다.
- 확인한 파일/심볼: `include/ft_map.hpp`의 erase node path, `_transplant`, `_is_black`, deletion fix-up, rotations.
- 필요한 경우 비교할 직전 관련 SHA/parent: ordinary erase `0f70c1fcc520`, repeated deletion test `86922f1ddfa0`.

#### 설계·상태 변화 기록

- 이 commit 직전 상태: insertion은 red-black이지만 erase는 ordinary BST transplant만 수행해 black-height와 color rules를 깨뜨릴 수 있었습니다.
- 해결하려던 문제: 실제 removed black contribution을 replacement path에 복구하고, replacement가 null이어도 sibling case를 계산해야 했습니다.
- 선택한 결정: `moved`, `moved_was_red`, `fix`, `fix_parent`를 별도로 추적합니다. removed effective node가 black일 때만 double-black repair를 호출합니다.
- 새로 생긴 책임 경계 또는 상태 변화: erase는 structural transplant와 color deficit repair를 분리하고, null child의 parent context는 local state가 소유합니다.

#### S-level 심화 추적

- 기존 설계가 충분하지 않았던 이유: black node 제거는 한쪽 root-to-null path의 black count를 줄입니다. sorted order와 node count는 맞아도 RB invariant가 무너질 수 있습니다.
- 핵심 state/ownership/lifetime transition: target 선택 → 0/1-child면 replacement와 parent 기록, 2-child면 successor를 physically transplant하고 successor의 original color/replacement 기록 → black 제거이면 fix loop → target node destroy/deallocate입니다.
- failure scenario별 cleanup/rollback: erase repair는 allocation/comparator/value assignment를 하지 않으므로 일반 exception branch는 없습니다. 핵심 위험은 wrong link/color transition이지 예외 rollback이 아닙니다. node는 link에서 완전히 분리된 뒤 정확히 한 번 해제됩니다.
- 이 commit이 보장하는 것: null replacement를 포함한 erase 후 red-black color/black-height 복구와 immutable key 보존입니다.
- 이 commit이 아직 보장하지 않는 것: public output tests만으로 모든 parent/header/black-height property를 입증하지는 않습니다. 그 evidence는 `cd67e6a31bb7`에서 추가됩니다.
- 후속 fix/test와 연결되는 구조: `86922f1ddfa0`이 반복 erase/copy/swap behavior를, `cd67e6a31bb7`이 매 operation structure를 검사합니다.
- 프로젝트 architecture 설명에 반드시 포함할 코드 근거: explicit `fix_parent`, symmetric sibling cases, successor color transfer, final black normalization입니다.

### 7. test(map): 반복 삭제·복사·대입·교환 stress 검증

- SHA: `86922f1ddfa0`
- Importance: B
- Tags: TEST, RB_TREE
- Source-established role: Stresses repeated erasure, copying, assignment, and swap against `std::map`.
- Source summary: Adds repeated key/iterator erasure and copy, assignment, and swap stress comparisons.
- Source rationale: The tests exercise broad map behavior after deletion balancing, but later invariant-aware randomized verification provides the stronger architectural evidence. This remains solid normal regression work.

#### 해당 SHA에서 확인할 실제 코드

- ascending/descending map의 copy, assignment, swap 시나리오와 standard counterpart 비교 지점을 확인합니다.
- mixed insertion sequence를 repeated key erase로 줄이는 흐름과 min/max iterator erase를 번갈아 수행하는 흐름을 확인합니다.
- 각 단계에서 contents/boundary queries가 검증되는지 확인하고, 이 test가 internal color/black-height를 직접 보는지 여부를 구분합니다.
- 확인한 파일/심볼: map test source의 copy/assignment/swap, repeated key erase, alternating begin/`--end()` erase scenarios.
- 필요한 경우 비교할 직전 관련 SHA/parent: production deletion repair `a055cb19500b`.

#### Test/verification 학습 기록

- 대상 production invariant: repeated erase와 ownership-moving operations 뒤에도 contents, ordering, query results가 reference와 일치해야 합니다.
- 재현하는 failure 또는 boundary: mixed 32-key tree에서 every-third key erase, 이후 min/max 교대 erase로 empty; ascending/descending copy, assignment, swap입니다.
- test technique: deterministic differential stress against `std::map`입니다.
- 통과하는 production 코드 경로: key/iterator erase, deletion fix-up, copy constructor, assignment, swap, iterator traversal, bounds입니다.
- 이 테스트가 증명하는 것: 반복 mutation과 map-to-map operation 후 observable state가 일치하고 끝까지 empty로 정리됩니다.
- 이 테스트가 증명하지 않는 것: internal red/black color와 black height, unreachable node, stale header를 직접 검사하지 않습니다.
- 성격: broad normal-path regression입니다.
- 후속 변경에서 막아야 하는 회귀: deletion sequence 특정 case에서 key 누락/중복, iterator traversal 깨짐, copy/swap contents 오류입니다.
- 실행 증거: test implementation을 검사했으며 실행하지 않았습니다.

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: deletion mechanism을 다양한 tree shape와 public ownership operation에서 압박합니다.
- 핵심 코드와 상태 변화: reference/ft map을 같은 sequence로 변경하고 단계별 parity를 확인합니다.
- 다음 commit에 넘기는 전제: public parity가 통과해도 latent structural corruption이 남을 수 있으므로 inspector가 필요합니다.

### 8. test(map): 무작위 연산마다 레드-블랙 불변식 검증

- SHA: `cd67e6a31bb7`
- Importance: A
- Tags: TEST, RB_TREE, RISK
- Source-established role: Validates all structural red-black invariants after deterministic random operations.
- Source summary: Adds a constrained white-box inspector and deterministic differential/randomized validation of every red-black invariant after structural operations.
- Source rationale: This materially changes confidence in the core tree: public sorted output alone cannot prove parent links, header extrema, red constraints, black height, or reachable-node counts. Reproducible operation logs make failures diagnosable.

#### Source에서 확정된 핵심 판단

- Problem: Sorted output and parity with `std::map` cannot prove that the internal tree is valid. Parent links may be inconsistent, header extrema stale, red nodes adjacent, black heights unequal, or unreachable nodes excluded from iteration until a later operation exposes the corruption.
- Decision: A narrowly scoped friend inspector validates header state, root linkage and color, extrema, strict subtree bounds, parent/child consistency, red-child rules, equal black height, and reachable-node count. Fixed deletion sequences, repeated current-root deletion, and 3,000 deterministic mixed operations validate both primary and secondary maps after every step.
- Why it mattered: This test changes the evidence standard for the project from output equivalence to representation correctness. The fixed seed, step number, and operation prefix also make deep balancing regressions reproducible rather than intermittent.

#### 해당 SHA에서 확인할 실제 코드

- test-only inspector가 header marker/color, empty extrema, root parent/color, cached extrema, parent-child consistency, strict subtree bounds, red-child rule, black height, reachable count를 각각 검사하는 코드를 찾습니다.
- fixed structural sequences, current-root repeated deletion, 3,000 deterministic pseudo-random operations의 실행 경로를 구분합니다.
- random stream의 operation 종류와 primary/secondary map 모두를 매 step 검증하는 위치를 확인합니다.
- fixed seed, current step, operation prefix가 failure reproduction에 어떻게 출력되는지 확인합니다.
- 확인한 파일/심볼: `tests/support/map_inspector.hpp`의 inspector와 `tests/test_map_randomized.cpp`의 fixed/random scenarios, seed `0x5EED1234`.
- 필요한 경우 비교할 직전 관련 SHA/parent: RB insertion/deletion commits와 sentinel commit `15a8460ccdfe`의 header representation.

#### Test/verification 학습 기록

- 대상 production invariant: strict key ordering, black root/header, no red-red, equal black height, bidirectional parent links, correct header root/min/max, reachable node count == size입니다.
- 재현하는 failure 또는 boundary: fixed difficult deletion shapes, repeatedly deleting current root, insert/erase/find/copy/assignment/swap 계열의 3,000-step deterministic mixed operations입니다.
- test technique: constrained white-box structural validation + deterministic randomized differential test입니다.
- 통과하는 production 코드 경로: insertion/deletion rotations and fix-ups, header refresh, clear/copy/assignment/swap, lookup and iterator traversal입니다.
- 이 테스트가 증명하는 것: 검사한 every step에서 tree representation 전체가 명시한 invariants와 public reference state를 동시에 만족합니다.
- 이 테스트가 증명하지 않는 것: 모든 possible operation sequence를 exhaustive하게 탐색하거나 wall-clock complexity, exception safety를 증명하지 않습니다.
- 성격: 고정 seed와 operation prefix를 갖는 reproducible structural regression입니다.
- 후속 변경에서 막아야 하는 회귀: public output에는 즉시 안 보이는 stale parent/extrema, red-red, unequal black height, unreachable/extra node입니다.
- 실행 증거: inspector와 deterministic driver 코드를 검사했으나 3,000 operations를 실제 실행하지 않았습니다.

#### A-level 핵심 확인

- 중요 boundary/failure path: null leaves의 black-height base case, empty header self-reference, root parent가 header인 non-empty case, swap 후 두 header 갱신입니다.
- state/ownership/lifecycle 영향: reachable node count가 size와 같아야 하므로 detached leak 또는 duplicate reachability를 구조 수준에서 탐지합니다. allocator block 자체는 별도 test 대상입니다.
- 이 commit이 보장하는 것과 남은 한계: deterministic sequences에 대한 강한 structure evidence입니다. exception injection과 asymptotic upper bound는 각각 다른 test가 필요합니다.
- 다음 관련 commit과의 연결: `cd8ebbb2c01e`가 same inspector의 height 접근과 counting comparator로 complexity claim을 executable bound로 만듭니다.

### 9. perf(map): 높이와 비교 횟수 회귀 상한 추가

- SHA: `cd8ebbb2c01e`
- Importance: A
- Tags: PERF, RB_TREE, TEST
- Source-established role: Enforces red-black height and comparator-count upper bounds.
- Source summary: Adds executable red-black height and comparator-count upper bounds for adversarial and shuffled insertion orders.
- Source rationale: The test converts the map's logarithmic complexity claim into deterministic structural and operation-count limits. It can detect disabled balancing or hidden linear searches that functional tests would miss.

#### 해당 SHA에서 확인할 실제 코드

- counting comparator가 insertion/search comparison count를 어떤 state에 누적하는지 확인합니다.
- inspector height 측정과 1,024 ascending/descending/shuffled scenario 구성을 확인합니다.
- height upper bound `2 * ceil(log2(n + 1))`와 conservative `n log n` insertion comparison bound를 실제 test 식에서 확인합니다.
- successful/unsuccessful `find`가 measured height의 constant multiple 안에 있어야 하는 assertion을 확인하고, wall-clock timing을 쓰지 않는 이유를 기록합니다.
- 확인한 파일/심볼: `tests/test_complexity.cpp`의 `counting_less`, `ceil_log2`, scenario builder, height/comparison assertions; inspector height helper.
- 필요한 경우 비교할 직전 관련 SHA/parent: `cd67e6a31bb7`의 white-box inspector와 RB production core.

#### Test/verification 학습 기록

- 대상 production invariant: insertion order와 무관하게 red-black height가 logarithmic bound 안이고 search comparator count가 height의 constant multiple 안이어야 합니다.
- 재현하는 failure 또는 boundary: 1,024 ascending, descending, fixed shuffle insertion과 present/absent find입니다.
- test technique: structural bound + operation-count bound입니다. wall-clock benchmark가 아닙니다.
- 통과하는 production 코드 경로: comparator-driven insert search, insertion fix-up/rotations, find search, inspector height traversal입니다.
- 이 테스트가 증명하는 것: test scenarios에서 height가 `2 * ceil(log2(n + 1))` 이하이고 insertion/search comparison count가 설정된 conservative upper bound 안입니다.
- 이 테스트가 증명하지 않는 것: 실제 latency, cache behavior, allocator cost, 모든 n/ordering을 측정하지 않습니다.
- 성격: deterministic asymptotic regression입니다.
- 후속 변경에서 막아야 하는 회귀: balancing 호출 제거, root/link bug로 height 폭증, hidden linear scan 또는 redundant comparator explosion입니다.
- 실행 증거: bound 식과 scenario code를 검사했으며 perf test를 실행하지 않았습니다.

#### A-level 핵심 확인

- 중요 boundary/failure path: ordinary BST여도 functional tests가 통과할 수 있는 sorted input이 핵심 adversarial boundary입니다.
- state/ownership/lifecycle 영향: production ownership을 바꾸지 않으며 height와 comparator state만 관찰합니다.
- 이 commit이 보장하는 것과 남은 한계: deterministic structural/operation complexity evidence를 제공합니다. timing performance를 보장하지 않습니다.
- 다음 관련 commit과의 연결: 이 Thread의 최종 red-black architecture가 correctness와 asymptotic evidence를 모두 갖추게 합니다.

## 6. Invariant ledger

### Source에서 확정된 관련 invariant

- Map keys remain strictly ordered according to the comparator; the root is black; red nodes have no red children; every null-leaf path has the same black height; parent/child links agree; and the number of reachable value nodes equals `size()`.
- The map header sentinel is black and value-free. For an empty map it self-references as both extrema; for a non-empty map it points to the current root, minimum, and maximum, and the root points back to the header.

### 시간에 따른 변화 기록

| Invariant | 처음 도입된 commit | 부족함이 드러난 commit/상태 | 강화·복구한 fix | 고정한 test/perf | 직접 확인한 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| Map keys remain strictly ordered; root black; no red-red; equal black height; consistent links; reachable count == size | ordering은 `c0fdb8e3f84c`, insertion RB rules는 `f29fd8a91523` | ordinary erase `0f70c1fcc520`은 black-height를 복구하지 않음; public parity만으로 internal corruption을 못 봄 | deletion rules `a055cb19500b` | `8f8b67961819`, `86922f1ddfa0`, 결정적으로 `cd67e6a31bb7`, `cd8ebbb2c01e` | comparator search, rotations/fix-ups, inspector recursive validation, height/count bounds |
| The map header sentinel is black and value-free; root/min/max links remain current | 이 Thread 밖의 관련 commit `15a8460ccdfe` | 이전 root-snapshot iterator/NULL-root representation은 stable end와 cached extrema를 통합하지 못함 | `15a8460ccdfe` | `81d8c4489c16`, 그리고 `cd67e6a31bb7` inspector | `node_base` header, `_refresh_header`, header/root/extrema checks |

## 7. Failure → Fix → Test 연결

| 기존 상태/production change | fix 또는 verification | Source에서 확정된 연결 관점 | 실제 failure/root cause | 실제 test production path |
| --- | --- | --- | --- | --- |
| `f29fd8a91523` | `8f8b67961819` | adversarial sorted insertion과 query boundary stress | ordinary BST worst case와 rotation/recolor functional regression 위험 | sorted insert → fix-up → traversal/find/bounds differential |
| `a055cb19500b` | `86922f1ddfa0` | repeated erase/copy/assignment/swap stress | null replacement와 varying sibling case에서 observable state corruption 위험 | repeated key/iterator erase → deletion fix → parity |
| `red-black structure` | `cd67e6a31bb7` | white-box invariant validation after every operation | sorted output가 stale links/color/black height/unreachable nodes를 숨김 | every operation → inspector full structure + std parity |
| `red-black complexity` | `cd8ebbb2c01e` | height/comparator-count deterministic upper bounds | balancing 비활성화나 hidden linear search가 normal tests를 통과할 수 있음 | adversarial/shuffle insert → height/count assertions; find count |

## 8. Ownership / state / responsibility 변화

| 시점 | Owner / state / responsibility | 변경 전 | 변경 후 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| `2c6dd8acdd20` | Establishes individually allocated nodes and single-root ownership. | map/node ownership 부재 | root에서 모든 individually allocated node 도달 | node links, `_root`, `_clear` |
| `f29fd8a91523` | Introduces rotations and insertion recoloring. | unbalanced shape | color와 rotations가 logarithmic shape 책임 | node `red`, rotations, insertion fix-up |
| `a055cb19500b` | Adds deletion transplant state and double-black correction. | ordinary transplant만 수행 | erase local state가 removed color/null parent context 소유 | moved/fix/fix_parent, deletion fix-up |
| `cd67e6a31bb7` | Validates all structural red-black invariants after deterministic random operations. | public results만 관찰 | inspector가 representation correctness 관찰 | `map_inspector.hpp`, randomized driver |
| `cd8ebbb2c01e` | Enforces red-black height and comparator-count upper bounds. | complexity claim이 암묵적 | test가 height/comparison upper bound 소유 | `test_complexity.cpp` |

## 9. Thread 최종 상태

- 최종적으로 성립한 representation/state: allocator-created value nodes가 parent/left/right/color link로 red-black tree를 이루며, 관련 sentinel commit 이후 embedded value-free header가 root/min/max와 `end()`를 나타냅니다.
- 최종적으로 보장하는 invariant: comparator strict ordering, black root/header, red node의 black children, 모든 null path의 같은 black height, 양방향 parent/child 일치, reachable node count와 size 일치, logarithmic structural height입니다.
- 남아 있는 precondition 또는 보장하지 않는 범위: comparator는 tree lifetime 동안 ordering semantics를 일관되게 유지해야 합니다. 이 Thread의 structural/perf tests는 exception safety와 allocator state compatibility를 대신하지 않습니다.
- 최종 verification evidence: sorted/differential stress, repeated deletion stress, every-step white-box deterministic random validation, height/comparator-count upper bounds를 코드로 확인했습니다. 실제 test command는 실행하지 않았습니다.
- 이 상태에 도달하기 위해 필요했던 핵심 turning point commit: insertion balancing `f29fd8a91523`, deletion balancing `a055cb19500b`, evidence 기준을 바꾼 `cd67e6a31bb7`입니다.

## 10. 최종 architecture 또는 execution flow 정리

아래 단계명은 source가 정의한 Thread progression을 따라가는 탐색 순서입니다. 실제 함수·상태·분기·코드 조각은 해당 SHA에서 직접 채웁니다.

| 단계 | 관련 commit | 실제 코드 위치 | 입력/기존 상태 | 핵심 transition | failure/cleanup | 다음 단계에 남기는 invariant |
| --- | --- | --- | --- | --- | --- | --- |
| Node ownership | `2c6dd8acdd20` | node/create/destroy/clear | key/value와 empty root | node allocate/construct, root 도달성 | construct failure deallocate; post-order clear | individually owned nodes |
| Unbalanced BST insertion | `c0fdb8e3f84c` | `insert`, `operator[]` | key/comparator, root | compare search → duplicate 또는 parent child link | node construction rollback; later comparator risk 남음 | strict ordering/uniqueness |
| Unbalanced erase/swap | `0f70c1fcc520` | erase/transplant/clear/swap | target node | 0/1-child replace 또는 successor transplant | removed node one-time destroy | immutable key 유지, balancing 미완성 |
| RB insertion repair | `f29fd8a91523` | rotations/fix-up | red inserted node | recolor 또는 inner/outer rotations | allocation 없음 | insertion 후 RB rules |
| Adversarial insertion stress | `8f8b67961819` | sorted scenarios | 96 ordered keys | ft/std insert와 query 비교 | assertion failure | public insertion/query parity |
| RB deletion repair | `a055cb19500b` | erase + double-black fix | target, moved color, replacement/parent | sibling cases로 black deficit 이동/해소 | link repair 후 node release | erase 후 RB rules |
| Deletion/lifecycle stress | `86922f1ddfa0` | repeated erase/copy/swap tests | mixed trees | key/iterator erase와 ownership operations 반복 | test assertion | observable mutation parity |
| White-box invariant validation | `cd67e6a31bb7` | inspector/random driver | each operation result | header/root/subtree/color/black height/count recursive 검사 | seed/step/prefix로 failure 진단 | representation correctness evidence |
| Structural complexity limits | `cd8ebbb2c01e` | complexity test | 1,024 ordered/shuffled keys | height와 comparator calls 측정 | deterministic bound assertion | logarithmic regression boundary |

## 11. 학습 완료 자가 점검

- [x] Commit map의 모든 SHA를 source 순서대로 확인했습니다.
- [x] 각 commit 기록에 final HEAD가 아니라 해당 SHA의 실제 코드 근거가 있습니다.
- [x] S/A commit은 decision, failure boundary, ownership/state transition을 설명할 수 있습니다.
- [x] Test/perf commit은 production invariant, technique, production path, 증명/비증명 범위를 구분했습니다.
- [x] Fix가 있는 경우 기존 가정 → failure/risk → root cause → 수정 → regression 연결을 설명할 수 있습니다.
- [x] Invariant ledger가 commit history에 따라 어떻게 변했는지 설명할 수 있습니다.
- [x] Thread 최종 상태와 architecture/execution flow를 실제 코드 근거로 자기 말로 설명할 수 있습니다.
