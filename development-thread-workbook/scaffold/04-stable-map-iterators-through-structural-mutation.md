# Stable Map Iterators through Structural Mutation

## 1. Thread 목표

### Source-established significance

The initial iterator can traverse a static tree, but `--end()` depends on a root pointer copied into the iterator. Rotations, root erasure, and swap make that snapshot stale even though element nodes remain valid. The header-sentinel refactor moves end-state and extrema ownership into the container, lets nodes navigate to the current end through parent links, and removes any need to construct a key merely to represent the sentinel. The follow-up tests target exactly the structural operations that invalidate the earlier model, making this a clear limitation-to-architecture-correction progression.

### 이 Thread에서 복원할 것

- 위 significance가 설명하는 변화 과정을 각 commit의 실제 SHA 코드로 재구성합니다.
- source가 확정한 commit 역할과 importance를 바꾸지 않고, 실제 implementation/failure/test 근거만 직접 채웁니다.

### Source에서 직접 연결되는 architecture

- `ft::map` stores values in allocator-created nodes linked as a red-black tree. A value-free header sentinel owns the root, minimum, and maximum links and is also the stable representation of `end()`.

### Source에서 직접 연결되는 Major Engineering Difficulties

- Replacing a root-carrying/null-end iterator design with a value-free header sentinel that remains correct through rotations, root replacement, erasure, clear, and swap and does not require a default-constructible key.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- static tree에서는 동작하던 root-snapshot iterator가 rotation/root erase/swap에서 왜 실패하는가?
- value-free header sentinel이 `end()`, extrema, empty state, non-default key 문제를 한 번에 어떻게 해결하는가?
- element iterator identity와 container-owned end sentinel 책임은 어떻게 분리되는가?
- swap 뒤 기존 element iterator가 새 owner의 end에 도달하려면 어떤 parent/header 연결이 필요하는가?

## 3. 완료 기준

- B: Thread 흐름에서 맡는 구현 역할, 필요한 상태 변화와 핵심 코드 위치를 해당 SHA 기준으로 확인할 수 있어야 합니다.
- S: 핵심 architecture/invariant를 직전 상태 → failure 가능성 → 결정 → 실제 핵심 코드 → ownership/lifecycle/state transition → 후속 fix/test까지 코드 근거로 설명할 수 있어야 합니다.
- A: 주요 subsystem/boundary/failure path/integration point를 실제 코드와 설계 판단으로 연결하고, 관련 regression 또는 다음 fix와의 관계를 설명할 수 있어야 합니다.
- 모든 commit은 해당 SHA의 코드 또는 test/build diff를 근거로 기록합니다.
- Thread 최종 설명은 source 요약을 복사하는 것으로 끝내지 않고, 직접 확인한 코드 근거와 commit 간 변화로 재구성합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source-established role |
| --- | --- | --- | --- | --- | --- |
| 1 | `4bbf81cecef4` | `feat(map): 가변 반복자와 tree 순회 구현` | B | RB_TREE, ITERATOR | Implements traversal with a null end state plus a copied root pointer. |
| 2 | `50e62b0e0298` | `feat(map): 상수와 역방향 반복자 구현` | B | RB_TREE, ITERATOR | Extends that model to const and reverse iteration. |
| 3 | `048ada8fe1c5` | `feat(map): 가변·상수 반복자 상호 비교 지원` | B | ITERATOR, PUBLIC_API | Adds mutable/const comparison interoperability. |
| 4 | `15a8460ccdfe` | `fix(map): 값 없는 header로 끝 반복자 상태 안정화` | S | ARCH, ITERATOR, RB_TREE | Replaces the root snapshot with a value-free, container-owned header sentinel. |
| 5 | `81d8c4489c16` | `test(map): 회전·삭제·교환 뒤 반복자 상태 검증` | A | TEST, ITERATOR, RB_TREE | Verifies saved end positions, element iterators, swap migration, empty reset, and non-default keys. |

## 5. Commit별 학습 기록

### 1. feat(map): 가변 반복자와 tree 순회 구현

- SHA: `4bbf81cecef4`
- Importance: B
- Tags: RB_TREE, ITERATOR
- Source-established role: Implements traversal with a null end state plus a copied root pointer.
- Source summary: Adds mutable bidirectional tree traversal using successor/predecessor navigation and a root-bearing end iterator.
- Source rationale: The commit provides necessary ordered traversal, but the root snapshot coupled into each iterator is later shown to be structurally insufficient. It is an intermediate implementation rather than the final iterator model.

#### 해당 SHA에서 확인할 실제 코드

- mutable iterator가 current node 외에 root snapshot을 어떤 필드로 보관하는지 확인합니다.
- successor는 right-subtree minimum 또는 parent climb, predecessor는 대칭 경로를 사용하는지 추적합니다.
- `begin()`의 minimum 선택과 null `end()` 표현, `--end()`가 copied root에서 maximum을 찾는 경로를 확인합니다.
- root가 rotation/replacement/swap으로 바뀌었을 때 saved iterator의 root snapshot이 왜 stale해질 수 있는지 이 SHA의 state만 근거로 기록합니다.
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


### 2. feat(map): 상수와 역방향 반복자 구현

- SHA: `50e62b0e0298`
- Importance: B
- Tags: RB_TREE, ITERATOR
- Source-established role: Extends that model to const and reverse iteration.
- Source summary: Adds const and reverse map iterators and const-qualified traversal accessors.
- Source rationale: The change extends the initial traversal design with expected const correctness and reverse iteration. It remains ordinary API work and inherits the earlier end-state coupling.

#### 해당 SHA에서 확인할 실제 코드

- const iterator의 reference/pointer type과 mutable→const converting constructor를 확인합니다.
- const successor/predecessor가 mutable traversal과 같은 topology를 사용하되 write access를 노출하지 않는지 확인합니다.
- `rbegin()`이 `end()`, `rend()`가 `begin()`을 base로 shared `reverse_iterator`에 연결하는 코드 위치를 확인합니다.
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


### 3. feat(map): 가변·상수 반복자 상호 비교 지원

- SHA: `048ada8fe1c5`
- Importance: B
- Tags: ITERATOR, PUBLIC_API
- Source-established role: Adds mutable/const comparison interoperability.
- Source summary: Allows mutable and const map iterators to compare symmetrically.
- Source rationale: The change restores an expected interoperability property of the public iterator interface, but it is localized and later subsumed by the sentinel-based iterator refactor.

#### 해당 SHA에서 확인할 실제 코드

- const iterator가 mutable iterator에 대해 equality/inequality를 제공하는 overload를 찾습니다.
- 반대 operand ordering을 friend/non-member overload가 어떤 conversion으로 처리하는지 확인합니다.
- 비교 identity가 exposed reference type이 아니라 current node에 기반하는지 확인합니다.
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


### 4. fix(map): 값 없는 header로 끝 반복자 상태 안정화

- SHA: `15a8460ccdfe`
- Importance: S
- Tags: ARCH, ITERATOR, RB_TREE
- Source-established role: Replaces the root snapshot with a value-free, container-owned header sentinel.
- Source summary: Refactors map to a value-free header sentinel that owns root/minimum/maximum links and represents `end()`.
- Source rationale: This is a major architectural correction: end iterators no longer carry stale root snapshots, rotations and swap can preserve element iterators, empty maps need no default key, and extrema become container-owned state. It defines the final map representation.

#### Source에서 확정된 핵심 판단

- Problem: The initial `end()` was represented by null plus a root pointer copied into each iterator. Rotations, root deletion, and swap could change the owning root while saved iterators retained stale topology. A sentinel containing a full value would also impose an invalid default-construction requirement on the key.
- Decision: The map is refactored around `node_base` and a value-free header sentinel. `header.parent` owns the root, `header.left` and `header.right` cache extrema, and `end()` points to the header. Root parent links terminate at the header, allowing successor and predecessor traversal to discover the current container boundary through topology.
- Why it mattered: This commit resolves iterator stability, current-maximum lookup from a saved end iterator, empty-state representation, swap migration, and non-default key support with one structural decision. It is the final map architecture, not a local iterator patch.

#### 해당 SHA에서 확인할 실제 코드

- `node_base`의 structural links/color/header marker와 value-bearing derived node의 분리를 확인합니다.
- header의 `parent=root`, `left=min`, `right=max` 관계와 empty state에서 extrema self-reference를 만드는 초기화/refresh 코드를 찾습니다.
- iterator state가 single `node_base*`로 줄어든 뒤 maximum increment → header, header decrement → current maximum이 되는 traversal을 추적합니다.
- insert/rotation/transplant/erase/clear/swap이 header/root/extrema invariant를 갱신하는 모든 주요 지점을 연결합니다.
- swap 뒤 moved root의 parent가 새 container header로 재부착되는 순서와 saved element iterator가 destination end에 도달하는 구조를 확인합니다.
- empty map이 default-constructible key를 요구하지 않게 된 이유를 header에 value가 없다는 실제 type layout으로 확인합니다.
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


### 5. test(map): 회전·삭제·교환 뒤 반복자 상태 검증

- SHA: `81d8c4489c16`
- Importance: A
- Tags: TEST, ITERATOR, RB_TREE
- Source-established role: Verifies saved end positions, element iterators, swap migration, empty reset, and non-default keys.
- Source summary: Tests saved end iterators, element iterators through rotations, root erasure, swap, empty reset, and non-default-constructible keys.
- Source rationale: These cases validate the exact structural promises that motivated the header sentinel. The suite protects an architecture boundary that ordinary result comparison cannot observe.

#### 해당 SHA에서 확인할 실제 코드

- saved end iterator를 rotation을 일으키는 insertion 전후 및 former-root erase 전후에 유지한 test를 찾고 `--end()` expected maximum을 확인합니다.
- clear 뒤 `begin()==end()` reset assertion을 확인합니다.
- element iterator를 rotations 동안 유지하고 parent links를 통해 header까지 advance하는 test를 확인합니다.
- 두 map swap 후 held element iterators가 original node를 dereference하고 새 owner의 end sentinel까지 도달하는지 확인합니다.
- non-default-constructible key fixture가 empty map creation과 insertion을 검증하는 이유를 기록합니다.
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

- The map header sentinel is black and value-free. For an empty map it self-references as both extrema; for a non-empty map it points to the current root, minimum, and maximum, and the root points back to the header.
- Rotations and non-erasing structural changes preserve element-node identity. Saved element iterators follow updated parent links, and `end()` remains attached to container-owned sentinel state rather than a stale root snapshot.

### 시간에 따른 변화 기록

| Invariant | 처음 도입된 commit | 부족함이 드러난 commit/상태 | 강화·복구한 fix | 고정한 test/perf | 직접 확인한 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| The map header sentinel is black and value-free. For an empty map it self-references as... | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Rotations and non-erasing structural changes preserve element-node identity. Saved elem... | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |

## 7. Failure → Fix → Test 연결

| 기존 상태/production change | fix 또는 verification | Source에서 확정된 연결 관점 | 실제 failure/root cause | 실제 test production path |
| --- | --- | --- | --- | --- |
| `4bbf81cecef4 / 50e62b0e0298 / 048ada8fe1c5` | `15a8460ccdfe` | root-snapshot/null-end limitation을 header sentinel architecture로 교정 | [직접 작성] | [직접 작성] |
| `15a8460ccdfe` | `81d8c4489c16` | rotation/root erase/swap/clear/non-default key iterator-state regression | [직접 작성] | [직접 작성] |

## 8. Ownership / state / responsibility 변화

| 시점 | Owner / state / responsibility | 변경 전 | 변경 후 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| `15a8460ccdfe` | Replaces the root snapshot with a value-free, container-owned header sentinel. | [직접 작성] | [직접 작성] | [직접 작성] |
| `81d8c4489c16` | Verifies saved end positions, element iterators, swap migration, empty reset, and non-default keys. | [직접 작성] | [직접 작성] | [직접 작성] |

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
| Root-snapshot mutable iterator | `4bbf81cecef4` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Const/reverse extension | `50e62b0e0298` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Mixed iterator comparison | `048ada8fe1c5` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Header-sentinel refactor | `15a8460ccdfe` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |
| Mutation/swap iterator regressions | `81d8c4489c16` | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] | [직접 작성] |

## 11. 학습 완료 자가 점검

- [ ] Commit map의 모든 SHA를 source 순서대로 확인했습니다.
- [ ] 각 commit 기록에 final HEAD가 아니라 해당 SHA의 실제 코드 근거가 있습니다.
- [ ] S/A commit은 decision, failure boundary, ownership/state transition을 설명할 수 있습니다.
- [ ] Test/perf commit은 production invariant, technique, production path, 증명/비증명 범위를 구분했습니다.
- [ ] Fix가 있는 경우 기존 가정 → failure/risk → root cause → 수정 → regression 연결을 설명할 수 있습니다.
- [ ] Invariant ledger가 commit history에 따라 어떻게 변했는지 설명할 수 있습니다.
- [ ] Thread 최종 상태와 architecture/execution flow를 실제 코드 근거로 자기 말로 설명할 수 있습니다.
