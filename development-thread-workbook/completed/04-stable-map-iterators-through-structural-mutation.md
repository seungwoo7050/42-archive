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
- swap 뒤 기존 element iterator가 새 owner의 end에 도달하려면 어떤 parent/header 연결이 필요한가?

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
- 확인한 파일/심볼: `include/ft_map.hpp`의 mutable `iterator`, iterator fields `_node`/`_root`, successor/predecessor helpers, `begin`, `end`.
- 필요한 경우 비교할 직전 관련 SHA/parent: iterator가 없던 직전 map 상태; limitation fix `15a8460ccdfe`.

#### 설계·상태 변화 기록

- 이 commit 직전 상태: tree ordering과 mutation은 있어도 public iterator로 in-order traversal할 수 없었습니다.
- 해결하려던 문제: 현재 node에서 다음/이전 key로 이동하고 null end에서 현재 최대 node로 되돌아갈 정보가 필요했습니다.
- 선택한 결정: iterator가 current node와 생성 시점의 root pointer를 함께 저장합니다. current가 null인 `end()`에서 `--`하면 copied root의 maximum을 찾습니다.
- 새로 생긴 책임 경계 또는 상태 변화: element traversal topology 일부를 iterator가 snapshot으로 소유합니다. element나 tree lifetime ownership은 갖지 않습니다.

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: static tree에서 bidirectional ordered traversal의 첫 public model입니다.
- 핵심 코드와 상태 변화: `++`는 right subtree minimum 또는 ancestor climb, `--`는 left subtree maximum 또는 ancestor climb입니다. null end만 root snapshot을 사용합니다.
- 다음 commit에 넘기는 전제: const/reverse iterator도 같은 topology와 root snapshot limitation을 상속합니다.

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
- 확인한 파일/심볼: `include/ft_map.hpp`의 `const_iterator`, const `begin/end`, reverse iterator typedefs와 `rbegin/rend`.
- 필요한 경우 비교할 직전 관련 SHA/parent: mutable iterator `4bbf81cecef4`와 공용 reverse adaptor `7a8e3d32bb4d`/`ae50e9038643`.

#### 설계·상태 변화 기록

- 이 commit 직전 상태: non-const map만 traversal할 수 있고 reverse public surface가 없었습니다.
- 해결하려던 문제: const map에서 key/value를 수정하지 않는 traversal과 기존 reverse adaptor 연결이 필요했습니다.
- 선택한 결정: const pointer/reference를 노출하는 별도 iterator를 두고 mutable iterator에서 converting construction을 허용합니다. reverse traversal은 `ft::reverse_iterator`에 end/begin을 base로 전달합니다.
- 새로 생긴 책임 경계 또는 상태 변화: constness는 exposed type에서 보장되지만 topology state는 mutable iterator와 같은 node/root snapshot입니다.

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: const-correct ordered/reverse traversal을 공개 API에 추가합니다.
- 핵심 코드와 상태 변화: runtime tree state는 바뀌지 않고 iterator wrapper와 accessors만 확장됩니다.
- 다음 commit에 넘기는 전제: mutable/const iterator가 같은 node identity를 표현하므로 서로 비교 가능해야 합니다.

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
- 확인한 파일/심볼: `include/ft_map.hpp`의 iterator/const_iterator mixed `operator==`와 `operator!=`.
- 필요한 경우 비교할 직전 관련 SHA/parent: `50e62b0e0298`의 별도 mutable/const iterator types.

#### 설계·상태 변화 기록

- 이 commit 직전 상태: 의미상 같은 위치라도 mutable iterator와 const iterator를 양쪽 operand 순서로 직접 비교할 수 없었습니다.
- 해결하려던 문제: standard iterator usage에서 `iterator == const_iterator`와 역순 비교가 모두 필요했습니다.
- 선택한 결정: exposed value type이 아니라 내부 current node pointer를 identity로 비교하고 필요한 friend/overload로 양방향 호출을 허용합니다.
- 새로 생긴 책임 경계 또는 상태 변화: iterator interoperability가 public API에 추가되며 tree state는 변하지 않습니다.

#### B-level 확인

- Thread 흐름에서 맡는 구현 역할: mutable→const conversion과 위치 비교를 실제 generic code에서 사용할 수 있게 합니다.
- 핵심 코드와 상태 변화: equality는 node identity만 확인합니다. root snapshot이 같거나 최신인지까지 확인하지 않으므로 기존 end limitation은 남습니다.
- 다음 commit에 넘기는 전제: sentinel refactor에서도 위치 identity는 하나의 structural pointer로 유지할 수 있습니다.

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
- 확인한 파일/심볼: `include/ft_map.hpp`의 `node_base`, derived `node`, embedded `_header`, header reset/refresh helpers, iterator next/previous, `begin/end`, insert/erase/clear/swap header repair.
- 필요한 경우 비교할 직전 관련 SHA/parent: root-snapshot iterator commits `4bbf81cecef4`, `50e62b0e0298`, `048ada8fe1c5`; regression `81d8c4489c16`.

#### Failure → Fix 추적

- 기존 가정 또는 직전 구현 상태: iterator마다 root pointer를 복사하면 `--end()`에 충분하다고 가정했습니다. end는 null current node였습니다.
- 실제 failure 또는 위험: rotation/root erase는 root를 바꾸고 swap은 tree owner를 바꾸므로 saved iterator의 root snapshot이 stale합니다. null end는 container identity와 current extrema를 스스로 표현하지 못합니다. value-bearing sentinel은 key default construction을 강제합니다.
- root cause: end/extrema 책임이 container가 아니라 개별 iterator snapshot에 분산됐습니다.
- 수정된 invariant/decision: container가 value-free embedded header를 영구 소유하고 모든 structural path가 header↔root/min/max links를 유지합니다. iterator는 current `node_base*` 하나만 저장합니다.
- mutation/commit 순서의 변경: mutation/rotation/transplant 후 root parent를 header로 붙이고 extrema cache를 갱신합니다. swap 후에는 교환된 각 root의 parent를 새 owner header로 재부착합니다.
- 실제 수정 코드 근거: `_header.is_header`, empty self-links, `_header.parent/left/right`, root parent assignment, iterator `_previous(header)`와 `_next(max)`입니다.
- 연결되는 regression test SHA/근거: `81d8c4489c16`이 saved end, rotations, former-root erase, swap migration, clear reset, non-default key를 직접 검사합니다.

#### S-level 심화 추적

- 기존 설계가 충분하지 않았던 이유: element node identity는 rotation에서 유지되지만 iterator가 별도 root snapshot을 들고 있으면 topology의 현재 container boundary와 분리됩니다. local patch로 각 iterator snapshot을 갱신할 방법도 없습니다.
- 핵심 state/ownership/lifetime transition: 기존 `_root`/null end + `(node, root snapshot)` → embedded `_header` 생성 → root parent를 header로 변경하고 extrema cache 설정 → iterator를 single node_base pointer로 축소 → end는 header address입니다.
- failure scenario별 cleanup/rollback: 이 fix의 핵심 failure는 exception이 아니라 structural stale state입니다. allocation/value lifetime은 derived `node`만 담당하며 header는 allocator로 생성/파괴하지 않습니다. clear는 value nodes를 해제하고 header를 empty self-reference로 reset합니다.
- 이 commit이 보장하는 것: saved container end가 current maximum을 찾고, element iterators가 updated parent links를 따라 end에 도달하며, swap 후 node iterators가 destination header에 연결됩니다. empty map 생성은 key constructor를 호출하지 않습니다.
- 이 commit이 아직 보장하지 않는 것: erased element를 가리키는 iterator는 무효입니다. 다른 container의 iterator 비교나 invalid dereference는 precondition 밖입니다. policy/allocator swap exception은 Thread 05에서 다룹니다.
- 후속 fix/test와 연결되는 구조: `81d8c4489c16`이 architecture promise를 deterministic scenarios로 고정하고, `cd67e6a31bb7` inspector가 header/root/extrema를 every operation 검사합니다.
- 프로젝트 architecture 설명에 반드시 포함할 코드 근거: value-free base/derived split, embedded header links, root parent termination, max→header/header→max traversal, swap reattachment입니다.

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
- 확인한 파일/심볼: `tests/test_map_iterators.cpp`의 saved-end, rotation/root-erase, element-iterator, swap, clear, non-default-key scenarios.
- 필요한 경우 비교할 직전 관련 SHA/parent: production refactor `15a8460ccdfe`.

#### Test/verification 학습 기록

- 대상 production invariant: header가 current root/min/max와 end identity를 소유하고 non-erasing structural mutation이 element node identity와 traversal boundary를 보존해야 합니다.
- 재현하는 failure 또는 boundary: saved end 후 rotation, root replacement/erase, clear; held element iterators 후 rotation/swap; non-default-constructible key의 empty map입니다.
- test technique: architecture-specific deterministic regression입니다. 일부는 iterator state를 통해 internal topology를 간접 관찰합니다.
- 통과하는 production 코드 경로: insert rotations/header refresh, erase/transplant/header refresh, iterator next/previous, swap root reattachment, clear reset, map constructor입니다.
- 이 테스트가 증명하는 것: 해당 scenarios에서 saved end와 element iterator가 current/new owner header를 따라가며 extrema와 empty reset이 맞고 header가 key value를 요구하지 않습니다.
- 이 테스트가 증명하지 않는 것: erased node iterator validity, 모든 possible rotation/deletion sequence, allocator/policy exception safety는 증명하지 않습니다.
- 성격: root-snapshot limitation을 직접 재현하는 deterministic architectural regression입니다.
- 후속 변경에서 막아야 하는 회귀: iterator에 root snapshot 재도입, header extrema 갱신 누락, swap 후 root parent stale, clear 후 header self-link 누락, value-bearing sentinel입니다.
- 실행 증거: test source와 production path를 검사했으며 binary를 실제 실행하지 않았습니다.

#### A-level 핵심 확인

- 중요 boundary/failure path: 저장한 iterator를 만든 뒤 topology/owner가 바뀌는 시간적 경계입니다. 단순히 mutation 후 새 iterator를 얻는 test로는 검출되지 않습니다.
- state/ownership/lifecycle 영향: header는 container lifetime에 고정되고 value nodes만 owner 간 이동합니다. swap 뒤 held element iterator는 node와 함께 새 owner topology에 속합니다.
- 이 commit이 보장하는 것과 남은 한계: exact motivating cases에 대한 evidence를 제공합니다. exhaustive iterator conformance suite는 아닙니다.
- 다음 관련 commit과의 연결: 이후 randomized inspector와 consumer tests가 same final representation을 더 넓게 사용합니다.

## 6. Invariant ledger

### Source에서 확정된 관련 invariant

- The map header sentinel is black and value-free. For an empty map it self-references as both extrema; for a non-empty map it points to the current root, minimum, and maximum, and the root points back to the header.
- Rotations and non-erasing structural changes preserve element-node identity. Saved element iterators follow updated parent links, and `end()` remains attached to container-owned sentinel state rather than a stale root snapshot.

### 시간에 따른 변화 기록

| Invariant | 처음 도입된 commit | 부족함이 드러난 commit/상태 | 강화·복구한 fix | 고정한 test/perf | 직접 확인한 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| The map header sentinel is black and value-free; empty extrema self-reference; non-empty header caches root/min/max | `15a8460ccdfe` | `4bbf81cecef4`의 null end/root snapshot은 container-owned current state가 아님 | `15a8460ccdfe` | `81d8c4489c16`, `cd67e6a31bb7` | `node_base`, embedded `_header`, reset/refresh, inspector header checks |
| Rotations and non-erasing structural changes preserve element-node identity; iterators follow updated links | node identity는 초기 node model부터 유지, iterator traversal은 `4bbf81cecef4` | root snapshot이 rotation/root erase/swap 후 stale | `15a8460ccdfe` | `81d8c4489c16` | single-pointer iterator, root parent header, swap reattachment, saved iterator tests |

## 7. Failure → Fix → Test 연결

| 기존 상태/production change | fix 또는 verification | Source에서 확정된 연결 관점 | 실제 failure/root cause | 실제 test production path |
| --- | --- | --- | --- | --- |
| `4bbf81cecef4 / 50e62b0e0298 / 048ada8fe1c5` | `15a8460ccdfe` | root-snapshot/null-end limitation을 header sentinel architecture로 교정 | end/extrema를 iterator snapshot이 소유해 topology change 후 stale; value sentinel은 key default construction 강제 | iterator state 제거 → header links → structural paths의 refresh/reattach |
| `15a8460ccdfe` | `81d8c4489c16` | rotation/root erase/swap/clear/non-default key iterator-state regression | refactor의 핵심 promise가 ordinary post-mutation result test로는 보이지 않음 | mutation 전 saved iterator/key fixture → mutation → decrement/advance/dereference/end assertions |

## 8. Ownership / state / responsibility 변화

| 시점 | Owner / state / responsibility | 변경 전 | 변경 후 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| `15a8460ccdfe` | Replaces the root snapshot with a value-free, container-owned header sentinel. | iterator가 current node와 root snapshot 소유; null end | container header가 root/min/max/end 소유; iterator는 node_base pointer만 소유 | `node_base`, `_header`, iterator fields, refresh/swap |
| `81d8c4489c16` | Verifies saved end positions, element iterators, swap migration, empty reset, and non-default keys. | architecture promise가 code inspection에만 의존 | regression scenarios가 시간적 iterator state를 고정 | `tests/test_map_iterators.cpp` |

## 9. Thread 최종 상태

- 최종적으로 성립한 representation/state: map object 안에 value가 없는 black header가 영구 존재합니다. empty이면 `left/right`가 자신을 가리키고 root는 없으며, non-empty이면 `parent=root`, `left=min`, `right=max`, `root.parent=&header`입니다. iterator는 단일 `node_base*`를 저장합니다.
- 최종적으로 보장하는 invariant: rotations와 non-erasing link changes는 element node address를 바꾸지 않습니다. saved element iterator는 current parent chain을 따라 container header에 도달하고, saved end는 container header이므로 current maximum을 찾습니다.
- 남아 있는 precondition 또는 보장하지 않는 범위: erased element iterator는 무효입니다. iterator owner가 사라진 뒤 사용하거나 unrelated container iterators를 비교하는 동작은 보장하지 않습니다.
- 최종 verification evidence: saved end before rotations/root erase, held element iterator through rotations/swap, clear reset, non-default key scenarios를 코드로 확인했습니다. 실행 결과는 생성하지 못했습니다.
- 이 상태에 도달하기 위해 필요했던 핵심 turning point commit: `15a8460ccdfe`입니다. 앞선 세 commit은 limitation이 생기는 root-snapshot model을 구성합니다.

## 10. 최종 architecture 또는 execution flow 정리

아래 단계명은 source가 정의한 Thread progression을 따라가는 탐색 순서입니다. 실제 함수·상태·분기·코드 조각은 해당 SHA에서 직접 채웁니다.

| 단계 | 관련 commit | 실제 코드 위치 | 입력/기존 상태 | 핵심 transition | failure/cleanup | 다음 단계에 남기는 invariant |
| --- | --- | --- | --- | --- | --- | --- |
| Root-snapshot mutable iterator | `4bbf81cecef4` | iterator fields, next/previous | node와 creation-time root | subtree minimum/maximum 또는 parent climb | exception 없음; stale snapshot risk | static tree bidirectional traversal |
| Const/reverse extension | `50e62b0e0298` | const iterator, rbegin/rend | mutable topology model | const view와 shared reverse adaptor 연결 | same stale-root limitation | const/reverse public surface |
| Mixed iterator comparison | `048ada8fe1c5` | mixed equality operators | mutable/const positions | current node identity 비교 | owner/root validity는 검사 안 함 | interoperability |
| Header-sentinel refactor | `15a8460ccdfe` | node_base/header/iterators/refresh/swap | root snapshot/null end | container-owned header와 topology termination으로 전환 | clear reset; structural path마다 header repair | stable end/extrema/value-free sentinel |
| Mutation/swap iterator regressions | `81d8c4489c16` | iterator tests | mutation 전에 저장한 end/element iterator | rotation/erase/swap/clear 후 동일 object로 traversal | assertion failure로 regression 검출 | final iterator architecture evidence |

## 11. 학습 완료 자가 점검

- [x] Commit map의 모든 SHA를 source 순서대로 확인했습니다.
- [x] 각 commit 기록에 final HEAD가 아니라 해당 SHA의 실제 코드 근거가 있습니다.
- [x] S/A commit은 decision, failure boundary, ownership/state transition을 설명할 수 있습니다.
- [x] Test/perf commit은 production invariant, technique, production path, 증명/비증명 범위를 구분했습니다.
- [x] Fix가 있는 경우 기존 가정 → failure/risk → root cause → 수정 → regression 연결을 설명할 수 있습니다.
- [x] Invariant ledger가 commit history에 따라 어떻게 변했는지 설명할 수 있습니다.
- [x] Thread 최종 상태와 architecture/execution flow를 실제 코드 근거로 자기 말로 설명할 수 있습니다.
