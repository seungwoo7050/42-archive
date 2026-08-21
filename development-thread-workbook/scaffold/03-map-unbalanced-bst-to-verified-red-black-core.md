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
- 확인한 파일/심볼: [직접 기록]
- 필요한 경우 비교할 직전 관련 SHA/parent: [직접 기록]

#### 설계·상태 변화 기록

- 이 commit 직전 상태: [직접 작성]
- 해결하려던 문제: [직접 작성]
- 선택한 결정: [직접 작성]
- 새로 생긴 책임 경계 또는 상태 변화: [직접 작성]

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: [직접 작성]
- 핵심 코드와 상태 변화: [직접 작성]
- 다음 commit에 넘기는 전제: [직접 작성]


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
- 확인한 파일/심볼: [직접 기록]
- 필요한 경우 비교할 직전 관련 SHA/parent: [직접 기록]

#### 설계·상태 변화 기록

- 이 commit 직전 상태: [직접 작성]
- 해결하려던 문제: [직접 작성]
- 선택한 결정: [직접 작성]
- 새로 생긴 책임 경계 또는 상태 변화: [직접 작성]

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: [직접 작성]
- 핵심 코드와 상태 변화: [직접 작성]
- 다음 commit에 넘기는 전제: [직접 작성]


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

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: [직접 작성]
- 핵심 코드와 상태 변화: [직접 작성]
- 다음 commit에 넘기는 전제: [직접 작성]


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

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: [직접 작성]
- 핵심 코드와 상태 변화: [직접 작성]
- 다음 commit에 넘기는 전제: [직접 작성]


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

- Map keys remain strictly ordered according to the comparator; the root is black; red nodes have no red children; every null-leaf path has the same black height; parent/child links agree; and the number of reachable value nodes equals `size()`.
- The map header sentinel is black and value-free. For an empty map it self-references as both extrema; for a non-empty map it points to the current root, minimum, and maximum, and the root points back to the header.

### 시간에 따른 변화 기록

| Invariant | 처음 도입된 commit | 부족함이 드러난 commit/상태 | 강화·복구한 fix | 고정한 test/perf | 직접 확인한 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| Map keys remain strictly ordered according to the comparator; the root is black; red no... | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| The map header sentinel is black and value-free. For an empty map it self-references as... | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |

## 7. Failure → Fix → Test 연결

| 기존 상태/production change | fix 또는 verification | Source에서 확정된 연결 관점 | 실제 failure/root cause | 실제 test production path |
| --- | --- | --- | --- | --- |
| `f29fd8a91523` | `8f8b67961819` | adversarial sorted insertion과 query boundary stress | [직접 작성] | [직접 작성] |
| `a055cb19500b` | `86922f1ddfa0` | repeated erase/copy/assignment/swap stress | [직접 작성] | [직접 작성] |
| `red-black structure` | `cd67e6a31bb7` | white-box invariant validation after every operation | [직접 작성] | [직접 작성] |
| `red-black complexity` | `cd8ebbb2c01e` | height/comparator-count deterministic upper bounds | [직접 작성] | [직접 작성] |

## 8. Ownership / state / responsibility 변화

| 시점 | Owner / state / responsibility | 변경 전 | 변경 후 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| `2c6dd8acdd20` | Establishes individually allocated nodes and single-root ownership. | [직접 작성] | [직접 작성] | [직접 작성] |
| `f29fd8a91523` | Introduces rotations and insertion recoloring. | [직접 작성] | [직접 작성] | [직접 작성] |
| `a055cb19500b` | Adds deletion transplant state and double-black correction. | [직접 작성] | [직접 작성] | [직접 작성] |
| `cd67e6a31bb7` | Validates all structural red-black invariants after deterministic random operations. | [직접 작성] | [직접 작성] | [직접 작성] |
| `cd8ebbb2c01e` | Enforces red-black height and comparator-count upper bounds. | [직접 작성] | [직접 작성] | [직접 작성] |

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
| Node ownership | `2c6dd8acdd20` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Unbalanced BST insertion | `c0fdb8e3f84c` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Unbalanced erase/swap | `0f70c1fcc520` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| RB insertion repair | `f29fd8a91523` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Adversarial insertion stress | `8f8b67961819` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| RB deletion repair | `a055cb19500b` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Deletion/lifecycle stress | `86922f1ddfa0` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| White-box invariant validation | `cd67e6a31bb7` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Structural complexity limits | `cd8ebbb2c01e` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |

## 11. 학습 완료 자가 점검

- [ ] Commit map의 모든 SHA를 source 순서대로 확인했습니다.
- [ ] 각 commit 기록에 final HEAD가 아니라 해당 SHA의 실제 코드 근거가 있습니다.
- [ ] S/A commit은 decision, failure boundary, ownership/state transition을 설명할 수 있습니다.
- [ ] Test/perf commit은 production invariant, technique, production path, 증명/비증명 범위를 구분했습니다.
- [ ] Fix가 있는 경우 기존 가정 → failure/risk → root cause → 수정 → regression 연결을 설명할 수 있습니다.
- [ ] Invariant ledger가 commit history에 따라 어떻게 변했는지 설명할 수 있습니다.
- [ ] Thread 최종 상태와 architecture/execution flow를 실제 코드 근거로 자기 말로 설명할 수 있습니다.
