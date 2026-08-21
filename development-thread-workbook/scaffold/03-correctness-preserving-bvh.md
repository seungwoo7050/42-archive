# Thread 3. Correctness-preserving BVH acceleration

## 1. Thread 목표

선형 탐색을 의미적 기준으로 유지한 채, 측정 가능한 work baseline에서 출발해 conservative bounds, deterministic build, owned derived state, explicit-stack traversal, equivalence tests, benchmark gate, stale-cache 방지까지 BVH의 전체 correctness story를 복원합니다.

### Source significance

> The thread shows that acceleration was treated as a semantic transformation, not merely a faster
> container. It first establishes comparable work metrics, then introduces conservative bounds,
> deterministic construction, and a traversal that reuses the linear candidate rule. The later
> ownership correction is crucial historical evidence: a BVH can be algorithmically correct yet still
> become wrong if its source geometry remains externally mutable. The final design therefore combines
> algorithm, result-ordering, bounded/unbounded partitioning, ownership, invalidation, fallback,
> rebuild, equivalence testing, and measured work reduction.

### 이 Thread에 연결된 source invariant

- A hit result must have the same semantic winner in linear and BVH modes, including exact equal-distance cases, regardless of BVH build or traversal order.
- Every acceleration bound must conservatively contain its shape. Unbounded geometry must never be forced into an arbitrary finite box.
- A ready BVH must describe the current shape set and current built-in geometry. Shape mutation must invalidate derived acceleration, and BVH requests against invalidated state must fall back to current linear geometry.
- Scene owns each shape exactly once, and callers cannot mutate built-in geometry or reorder shape storage behind the acceleration lifecycle.

### 이 Thread에 연결된 engineering difficulty

- Reordering primitive tests through a BVH without changing equal-distance selection, materials, normals, hit pointers, or final image bytes.
- Managing the BVH as derived state whose correctness depends on shape lifetime, geometry immutability, invalidation, rebuilding, and fallback behavior.
- Designing performance evidence that rejects behaviorally different results, separates primitive from AABB work, fixes workload configuration, and reports repeatable median measurements.
- Maintaining numerical validity across conservative cylinder bounds.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 가속 전 work counter는 어떤 경계에서 실제 primitive dispatch와 shadow query를 세는가?
- AABB slab test와 각 shape bounds가 false negative를 만들지 않기 위해 어떤 interval·padding 규칙을 사용하는가?
- deterministic median split은 centroid tie를 어떻게 원래 shape index로 해소하는가?
- BVH가 scene의 독립 상태가 아니라 derived cache인 이유와 build/invalidate/fallback/rebuild 상태 전이는 무엇인가?
- traversal 순서가 바뀌어도 exact equal-`t` winner, material, normal, shape identity가 유지되는 이유는 무엇인가?
- benchmark가 빠른데 다른 이미지를 만드는 구현이나 culling이 부족한 구현을 어떻게 거부하는가?
- 초기 lifecycle 설계가 public mutable geometry 때문에 불충분했던 root cause와 최종 API 차단은 무엇인가?

## 3. 완료 기준

- [ ] 선형과 BVH가 공유하는 candidate-update 규칙을 실제 함수 단위로 추적했습니다.
- [ ] sphere, plane, arbitrary-axis cylinder가 bounded/unbounded로 분류되는 코드와 bounds 계산을 확인했습니다.
- [ ] BVH build 결과의 node/primitive 저장 구조와 stable ordering 근거를 기록했습니다.
- [ ] Scene acceleration state의 build → ready → mutation invalidation → linear fallback → rebuild 전이를 코드와 테스트로 재현했습니다.
- [ ] hit record 전체, pixel buffer, checksum, primitive/AABB counts를 비교하는 검증 계층을 구분했습니다.
- [ ] schemaVersion 1 benchmark와 primitive-test ratio gate가 무엇을 증명하고 elapsed speedup이 왜 환경 의존적인지 설명할 수 있습니다.

## 4. Commit map

1. `f4dcb50939e2` — `perf(render): 광선과 교차 작업량 계측 추가`
   - Importance: A
   - Tags: PERF, RAY_PIPELINE
   - Source-defined role: Adds semantic work counters and timing before acceleration changes behavior.

2. `4fb2345c7d35` — `perf(benchmark): 조밀 장면 기준 workload 추가`
   - Importance: B
   - Tags: PERF, ACCEL
   - Source-defined role: Establishes a fixed dense-scene workload.

3. `f5a2c4ade16d` — `perf(benchmark): 반복 측정과 결정성 보고 구성`
   - Importance: A
   - Tags: PERF, DETERMINISM
   - Source-defined role: Defines repeated median measurement and rejects inconsistent results.

4. `7b19f2ad78e3` — `feat(accel): ray-box slab 교차 구현`
   - Importance: A
   - Tags: ACCEL, HARD, EDGE
   - Source-defined role: Implements the ray/AABB interval test.

5. `a40452885176` — `feat(accel): 도형 경계 계약과 구·평면 bounds 추가`
   - Importance: A
   - Tags: ARCH, ACCEL, GEOMETRY
   - Source-defined role: Defines which shapes provide finite bounds and which remain unbounded.

6. `b782e22450d8` — `feat(accel): 원기둥의 보수적 bounds 계산 추가`
   - Importance: A
   - Tags: ACCEL, GEOMETRY, HARD
   - Source-defined role: Adds conservative arbitrary-axis cylinder bounds.

7. `419d52d687fc` — `test(accel): AABB와 도형 경계 계산 검증`
   - Importance: A
   - Tags: TEST, ACCEL, RISK
   - Source-defined role: Verifies AABB edge behavior and the no-false-negative bounds contract.

8. `bb65e8092632` — `feat(accel): 결정적 중앙 분할 BVH 구축 구현`
   - Importance: A
   - Tags: ACCEL, HARD, DETERMINISM
   - Source-defined role: Builds a deterministic median-split BVH.

9. `9a7f29b5d78a` — `feat(accel): 선형·BVH 탐색 모드 계약 연결`
   - Importance: A
   - Tags: ARCH, ACCEL, DETERMINISM
   - Source-defined role: Preserves the linear equal-`t` winner through original shape indices and exposes both modes.

10. `f7e969537c10` — `feat(scene): 가속 구조 소유권과 rebuild 경계 구성`
   - Importance: S
   - Tags: ARCH, ACCEL, SCENE
   - Source-defined role: Makes acceleration owned, rebuildable derived scene state with an unbounded-shape path.

11. `d4f6ee5b6042` — `feat(accel): 결정적 BVH 최근접 순회 구현`
   - Importance: S
   - Tags: CORE, ACCEL, HARD
   - Source-defined role: Implements near-first explicit-stack traversal and pruning.

12. `41c9a59f27a6` — `test(accel): 선형 탐색과 BVH 결과 동치 검증`
   - Importance: A
   - Tags: TEST, ACCEL, DETERMINISM
   - Source-defined role: Proves linear/BVH hit and pixel equivalence while checking work reduction.

13. `da3e8b43d09e` — `perf(benchmark): 선형 탐색과 BVH 작업량 비교`
   - Importance: A
   - Tags: PERF, ACCEL, DETERMINISM
   - Source-defined role: Measures both modes under the same correctness constraints.

14. `9b77225cf6b7` — `perf(benchmark): 측정 schema와 가속 기준 검증 고정`
   - Importance: A
   - Tags: PERF, ACCEL, DETERMINISM
   - Source-defined role: Fixes a versioned benchmark schema and enforces a primitive-test reduction threshold.

15. `ef5320a83c27` — `fix(accel): 가속 구조의 도형 불변식 보호`
   - Importance: S
   - Tags: ARCH, ACCEL, SCENE
   - Source-defined role: Prevents callers from mutating geometry behind a ready BVH.

16. `13f153e23920` — `test(accel): 장면 변경과 가속 상태 불변식 검증`
   - Importance: A
   - Tags: TEST, ACCEL, SCENE
   - Source-defined role: Verifies immutability, invalidation, linear fallback, and rebuild as one state transition.

## 5. Commit별 학습 기록

### 5.1 `f4dcb50939e2` — `perf(render): 광선과 교차 작업량 계측 추가`

- Importance: A
- Tags: PERF, RAY_PIPELINE
- Thread order: 1/16

#### Source에서 확정된 역할

- Development Thread role: Adds semantic work counters and timing before acceleration changes behavior.
- Classification summary: Threads optional ray, primitive, AABB, and timing statistics through rendering and intersection.
- Importance rationale: The instrumentation is carefully placed at semantic work boundaries and makes later acceleration claims measurable without altering normal behavior.

#### 해당 SHA에서 확인할 실제 코드

- `RenderStats` field에서 primary, secondary, shadow rays, primitive tests, future AABB tests, elapsed time이 각각 어떻게 표현되는지 기록합니다.
- optional stats sink가 render, trace/shade, occlusion, scene intersection signatures를 따라 전달되는 경로를 그립니다.
- null sink branch가 기존 call sites와 behavior를 유지하는지 확인합니다.
- primitive-test counter가 각 `Shape::intersect` dispatch 직전에 증가하는지 실제 loop에서 확인합니다.
- shadow-ray counter가 positive diffuse term 이후 실제 occlusion query가 발생할 때만 증가하는 branch order를 추적합니다.
- steady clock의 start/end가 complete image rendering interval을 어디까지 포함하는지 기록합니다.

#### Source에서 확정된 이 SHA의 경계

- 계측은 normal rendering behavior를 바꾸지 않아야 하며 null sink가 원래 path입니다.
- AABB counter field는 준비되지만 이 SHA에서 실제 box tests는 아직 없습니다.

#### 추가 확인 포인트

- counter를 scene size로 추정하는지 actual dispatch를 세는지 코드로 구분합니다.
- elapsed time과 semantic counters 중 deterministic contract가 무엇인지 후속 benchmark와 연결 준비합니다.

#### A-level 학습 기록

- 직전 관련 상태:
- 핵심 problem/edge:
- 선택한 algorithm 또는 boundary decision:
- 실제 state/data/control-flow 변화:
- 실패하거나 잘못될 수 있는 branch:
- 후속 test/benchmark가 확인해야 하는 항목:

#### 직접 확인 증거

- 확인한 file path와 symbol:
- 변경 전/후 핵심 차이:
- state 또는 boundary 변화:
- failure/edge branch:
- 관련 production test path:
- 이 SHA가 보장하는 것과 남은 공백:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: 이 Thread의 시작점
- 다음 Thread commit: `4fb2345c7d35`
- 비교 지침: 가속 구현 전의 linear renderer를 계측하는 commit이므로 후속 BVH code를 소급하지 말고 baseline counter semantics를 저장합니다.
- 직접 작성한 연결 설명:

### 5.2 `4fb2345c7d35` — `perf(benchmark): 조밀 장면 기준 workload 추가`

- Importance: B
- Tags: PERF, ACCEL
- Thread order: 2/16

#### Source에서 확정된 역할

- Development Thread role: Establishes a fixed dense-scene workload.
- Classification summary: Adds a deterministic dense 400-sphere benchmark workload.
- Importance rationale: This is important supporting evidence infrastructure, but it does not yet define a measurement protocol or alter runtime behavior.

#### 해당 SHA에서 확인할 실제 코드

- benchmark executable/target이 parser나 file I/O 없이 scene을 직접 구성하는 entry point를 찾습니다.
- ground plane, two lights, 20×20 sphere grid, camera, resolution의 fixed workload 구성 코드를 기록합니다.
- object placement와 material variation이 loop/index에 의해 어떻게 결정되는지 확인합니다.
- production `renderScene` API와 stats sink, checksum API를 사용하는 호출 경로를 추적합니다.
- 출력되는 field와 아직 출력하지 않는 timing/result consistency 정보를 구분합니다.

#### Source에서 확정된 이 SHA의 경계

- parser와 hierarchy build 비용은 이 workload construction 방식으로 measured render path에서 분리됩니다.
- single checksum print를 timing claim이나 acceleration evidence로 해석하지 않습니다.

#### B-level 학습 기록

- Thread에서 이 commit이 맡는 구현 역할:
- 실제 추가/수정된 핵심 symbol:
- 입력·상태·출력의 변화:
- 다음 related commit이 의존하는 결과:

#### 직접 확인 증거

- 확인한 file path와 symbol:
- Thread에서 필요한 핵심 변화:
- 직접 확인한 caller/callee 또는 state change:
- 다음 commit에 제공하는 것:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `f4dcb50939e2`
- 다음 Thread commit: `f5a2c4ade16d`
- 비교 지침: 이 commit은 fixed workload만 추가하며 다음 `f5a2c4ade16d` 전에는 repeat/median protocol이 없음을 명시합니다.
- 직접 작성한 연결 설명:

### 5.3 `f5a2c4ade16d` — `perf(benchmark): 반복 측정과 결정성 보고 구성`

- Importance: A
- Tags: PERF, DETERMINISM
- Thread order: 3/16

#### Source에서 확정된 역할

- Development Thread role: Defines repeated median measurement and rejects inconsistent results.
- Classification summary: Adds warm-up, repeated median measurement, result-consistency checks, and structured benchmark output.
- Importance rationale: The commit turns a workload into a defensible performance experiment whose timing is rejected if image or work results differ.

#### 해당 SHA에서 확인할 실제 코드

- unreported warm-up 1회와 measured run 5회의 loop structure를 확인합니다.
- elapsed samples의 sorting/median selection implementation을 기록하고 mean을 사용하지 않는지 확인합니다.
- 각 measured run의 checksum과 primitive-test count를 첫 sample과 비교해 mismatch 시 report를 거부하는 branch를 추적합니다.
- structured report의 workload identity, resolution, run counts, ray counts, primitive work, median time, checksum fields를 기록합니다.
- render interval과 scene construction/initialization이 measurement에 포함되는지 caller order로 확인합니다.

#### Source에서 확정된 이 SHA의 경계

- 이 SHA는 아직 linear/BVH side-by-side comparison을 수행하지 않습니다.
- median time은 환경 영향을 받지만 checksum과 work count consistency는 benchmark acceptance 조건입니다.

#### A-level 학습 기록

- 직전 관련 상태:
- 핵심 problem/edge:
- 선택한 algorithm 또는 boundary decision:
- 실제 state/data/control-flow 변화:
- 실패하거나 잘못될 수 있는 branch:
- 후속 test/benchmark가 확인해야 하는 항목:

#### 직접 확인 증거

- 확인한 file path와 symbol:
- 변경 전/후 핵심 차이:
- state 또는 boundary 변화:
- failure/edge branch:
- 관련 production test path:
- 이 SHA가 보장하는 것과 남은 공백:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `4fb2345c7d35`
- 다음 Thread commit: `7b19f2ad78e3`
- 비교 지침: fixed workload commit과 비교해 workload 자체는 유지되고 measurement protocol과 correctness gate만 추가되는지 확인합니다.
- 직접 작성한 연결 설명:

### 5.4 `7b19f2ad78e3` — `feat(accel): ray-box slab 교차 구현`

- Importance: A
- Tags: ACCEL, HARD, EDGE
- Thread order: 4/16

#### Source에서 확정된 역할

- Development Thread role: Implements the ray/AABB interval test.
- Classification summary: Implements ray-box slab intersection with parallel-axis handling and entry distance.
- Importance rationale: This is a correctness-critical acceleration primitive whose false negatives would change rendered results, and it requires non-trivial interval reasoning.

#### 해당 SHA에서 확인할 실제 코드

- AABB representation이 제공하는 min/max extents와 ray-box hit function signature를 기록합니다.
- 세 coordinate axis를 순회하며 `[t_min, t_max]`를 entry/exit interval로 clip하는 실제 식을 옮깁니다.
- negative direction에서 entry/exit swap이 일어나는 branch를 확인합니다.
- zero direction에서 division 대신 ray origin이 slab 안에 있는지 검사하는 branch를 추적합니다.
- interval이 empty가 되는 비교 연산과 face-contact equality 처리 방식을 기록합니다.
- optional entry value가 어느 parameter를 반환하고 후속 traversal ordering에 어떻게 쓰일 준비가 되는지 확인합니다.

#### Source에서 확정된 이 SHA의 경계

- false negative는 rendered result를 바꾸므로 parallel-axis와 boundary equality를 반드시 실제 조건으로 확인합니다.
- 이 commit은 BVH build/traversal을 아직 수행하지 않습니다.

#### A-level 학습 기록

- 직전 관련 상태:
- 핵심 problem/edge:
- 선택한 algorithm 또는 boundary decision:
- 실제 state/data/control-flow 변화:
- 실패하거나 잘못될 수 있는 branch:
- 후속 test/benchmark가 확인해야 하는 항목:

#### 직접 확인 증거

- 확인한 file path와 symbol:
- 변경 전/후 핵심 차이:
- state 또는 boundary 변화:
- failure/edge branch:
- 관련 production test path:
- 이 SHA가 보장하는 것과 남은 공백:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `f5a2c4ade16d`
- 다음 Thread commit: `a40452885176`
- 비교 지침: AABB value/union scaffolding은 이미 존재하므로 이 SHA에서는 box construction이 아니라 ray-box culling contract에 집중합니다.
- 직접 작성한 연결 설명:

### 5.5 `a40452885176` — `feat(accel): 도형 경계 계약과 구·평면 bounds 추가`

- Importance: A
- Tags: ARCH, ACCEL, GEOMETRY
- Thread order: 5/16

#### Source에서 확정된 역할

- Development Thread role: Defines which shapes provide finite bounds and which remain unbounded.
- Classification summary: Adds the shape bounds contract, exact sphere boxes, and explicit unbounded planes.
- Importance rationale: The commit establishes how heterogeneous geometry enters or stays outside acceleration, a key responsibility boundary for the later mixed BVH/linear design.

#### 해당 SHA에서 확인할 실제 코드

- `Shape` interface에 finite bounds를 표현하는 optional contract가 어떤 method/type으로 추가되는지 기록합니다.
- default implementation 또는 base behavior가 unbounded를 어떻게 나타내는지 확인합니다.
- sphere bounds가 center ± radius로 계산되는 각 component를 확인합니다.
- plane이 invalid box가 아니라 explicit no-bounds를 반환하는 branch를 기록합니다.
- callers가 `std::optional<Aabb>`의 no-value와 invalid box를 어떻게 구분할 수 있는지 이 SHA의 API로 설명합니다.

#### Source에서 확정된 이 SHA의 경계

- unbounded geometry는 임의의 finite box로 강제되지 않습니다.
- cylinder bounds는 다음 commit에서 추가되며 이 SHA 기준으로 누락 상태를 정확히 기록합니다.

#### A-level 학습 기록

- 직전 관련 상태:
- 핵심 problem/edge:
- 선택한 algorithm 또는 boundary decision:
- 실제 state/data/control-flow 변화:
- 실패하거나 잘못될 수 있는 branch:
- 후속 test/benchmark가 확인해야 하는 항목:

#### 직접 확인 증거

- 확인한 file path와 symbol:
- 변경 전/후 핵심 차이:
- state 또는 boundary 변화:
- failure/edge branch:
- 관련 production test path:
- 이 SHA가 보장하는 것과 남은 공백:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `7b19f2ad78e3`
- 다음 Thread commit: `b782e22450d8`
- 비교 지침: 직전 common hit contract와 비교해 intersection semantics는 유지되고 acceleration capability만 shape property로 추가되는지 확인합니다.
- 직접 작성한 연결 설명:

### 5.6 `b782e22450d8` — `feat(accel): 원기둥의 보수적 bounds 계산 추가`

- Importance: A
- Tags: ACCEL, GEOMETRY, HARD
- Thread order: 6/16

#### Source에서 확정된 역할

- Development Thread role: Adds conservative arbitrary-axis cylinder bounds.
- Classification summary: Computes conservative arbitrary-axis cylinder bounds and pads them outward.
- Importance rationale: A too-small box would silently remove real hits, so the numerical derivation and conservative policy are significant correctness work.

#### 해당 SHA에서 확인할 실제 코드

- cylinder axis가 normalized stored state인지 constructor/invariant에서 확인합니다.
- 각 world axis extent가 projected half-height와 circular cross-section의 projected radius를 결합하는 실제 식을 기록합니다.
- side range와 cap radius를 포함하기 위한 epsilon padding 위치를 확인합니다.
- `std::nextafter`가 min/max를 어느 방향의 representable value로 확장하는지 component별로 추적합니다.
- calculated AABB가 side와 both caps를 모두 포함하는 근거를 geometry sketch와 코드 식으로 연결합니다.
- tightness보다 conservativeness를 우선하는 branch/constant를 기록합니다.

#### Source에서 확정된 이 SHA의 경계

- box의 empty space는 허용되지만 real hit를 제외하는 under-bound는 허용되지 않습니다.
- axis-aligned cylinder만 가정하지 않고 arbitrary normalized axis의 projected extent를 사용합니다.

#### A-level 학습 기록

- 직전 관련 상태:
- 핵심 problem/edge:
- 선택한 algorithm 또는 boundary decision:
- 실제 state/data/control-flow 변화:
- 실패하거나 잘못될 수 있는 branch:
- 후속 test/benchmark가 확인해야 하는 항목:

#### 직접 확인 증거

- 확인한 file path와 symbol:
- 변경 전/후 핵심 차이:
- state 또는 boundary 변화:
- failure/edge branch:
- 관련 production test path:
- 이 SHA가 보장하는 것과 남은 공백:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `a40452885176`
- 다음 Thread commit: `419d52d687fc`
- 비교 지침: cylinder intersection commits의 accepted side/cap range와 이 bounds formula를 비교해 false negative가 없는지 확인하되, final HEAD의 후속 private fields는 소급하지 않습니다.
- 직접 작성한 연결 설명:

### 5.7 `419d52d687fc` — `test(accel): AABB와 도형 경계 계산 검증`

- Importance: A
- Tags: TEST, ACCEL, RISK
- Thread order: 7/16

#### Source에서 확정된 역할

- Development Thread role: Verifies AABB edge behavior and the no-false-negative bounds contract.
- Classification summary: Tests slab edge cases and sphere, plane, and arbitrary-axis cylinder bounds.
- Importance rationale: The suite locks down the no-false-negative boundary that acceleration correctness depends on, especially the difficult cylinder calculation.

#### Test commit 분석 기준

- 대상 production invariant: ray-box test는 admissible hits를 누락하지 않고, bounded shape box는 actual geometry를 보수적으로 포함하며 plane은 unbounded로 남는다.
- 재현하는 failure/boundary: direction sign, face contact, parallel outside slab, arbitrary-axis cylinder extent.
- test technique: deterministic unit cases, exact sphere/plane checks, analytic cylinder extent with small upper allowance.
- 통과하는 production path: AABB slab function 및 sphere/plane/cylinder bounds provider.
- 이 test가 증명하는 것: acceleration input 단계의 no-false-negative boundary와 지나치게 느슨하지 않은 cylinder formula.
- 이 test가 증명하지 않는 것: BVH builder/traversal, full-scene hit equivalence, performance reduction을 증명하지 않는다.
- test 성격: deterministic component regression at acceleration boundary.
- 막는 regression: parallel-axis division error, boundary rejection, plane boxing, cylinder under-bound 또는 과도한 loosening.

#### 학습자 검증 기록

- 실제 test case/function과 file path:
- fixture 또는 test double 구성:
- assertion 전에 통과하는 production function 순서:
- failure가 실제로 주입되는 정확한 지점:
- test 실행 명령과 결과:
- false positive 또는 미검증 범위:

#### 해당 SHA에서 확인할 실제 코드

- AABB slab tests에서 positive direction, negative direction, exact face contact, parallel outside case의 ray/box inputs를 기록합니다.
- entry-distance assertion이 expected nearest admissible parameter를 어떻게 고정하는지 확인합니다.
- sphere exact bounds와 plane no-bounds assertion을 확인합니다.
- diagonal cylinder의 analytically expected extents와 test tolerance/upper allowance를 기록합니다.
- test target이 실제 production AABB/bounds implementations를 링크하는 경로를 확인합니다.

#### 직접 확인 증거

- 확인한 file path와 symbol:
- 변경 전/후 핵심 차이:
- state 또는 boundary 변화:
- failure/edge branch:
- 관련 production test path:
- 이 SHA가 보장하는 것과 남은 공백:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `b782e22450d8`
- 다음 Thread commit: `bb65e8092632`
- 비교 지침: AABB and bounds features를 hierarchy build 전에 검증하는 순서를 보존하고, 이 test가 BVH traversal을 아직 다루지 않음을 명시합니다.
- 직접 작성한 연결 설명:

### 5.8 `bb65e8092632` — `feat(accel): 결정적 중앙 분할 BVH 구축 구현`

- Importance: A
- Tags: ACCEL, HARD, DETERMINISM
- Thread order: 8/16

#### Source에서 확정된 역할

- Development Thread role: Builds a deterministic median-split BVH.
- Classification summary: Builds a stable median-split BVH with bounded leaf size and deterministic tie ordering.
- Importance rationale: This is the main construction algorithm and establishes reproducible tree shape, but it does not yet alter scene queries until traversal is integrated.

#### 해당 SHA에서 확인할 실제 코드

- BVH build input이 scene shape index와 bounds를 어떤 `BvhPrimitive` representation으로 받는지 기록합니다.
- 각 recursive range에서 node bounds를 exact union으로 누적하는 loop를 확인합니다.
- primitive count가 four or fewer일 때 contiguous leaf range를 만드는 branch를 기록합니다.
- larger range에서 longest centroid axis를 선택하는 계산과 median index를 확인합니다.
- stable sort comparator가 selected coordinate 다음 original scene shape index를 tie-breaker로 쓰는지 기록합니다.
- node reservation과 child append order가 node index stability에 미치는 영향을 확인합니다.
- coincident centroid input으로 build를 반복해 primitive order/tree topology가 같은지 가능한 범위에서 관찰합니다.

#### Source에서 확정된 이 SHA의 경계

- builder는 traversal을 아직 production scene query에 연결하지 않습니다.
- determinism은 performance reproduction과 later equal-hit semantics의 기반이지만 hit winner는 별도 candidate rule로 보존됩니다.

#### A-level 학습 기록

- 직전 관련 상태:
- 핵심 problem/edge:
- 선택한 algorithm 또는 boundary decision:
- 실제 state/data/control-flow 변화:
- 실패하거나 잘못될 수 있는 branch:
- 후속 test/benchmark가 확인해야 하는 항목:

#### 직접 확인 증거

- 확인한 file path와 symbol:
- 변경 전/후 핵심 차이:
- state 또는 boundary 변화:
- failure/edge branch:
- 관련 production test path:
- 이 SHA가 보장하는 것과 남은 공백:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `419d52d687fc`
- 다음 Thread commit: `9a7f29b5d78a`
- 비교 지침: supporting contiguous node/storage representation은 이전 commit에서 준비되어 있으므로 이 Thread의 commit map에 새 항목을 추가하지 말고 이 SHA에서 builder가 소비하는 형태만 확인합니다.
- 직접 작성한 연결 설명:

### 5.9 `9a7f29b5d78a` — `feat(accel): 선형·BVH 탐색 모드 계약 연결`

- Importance: A
- Tags: ARCH, ACCEL, DETERMINISM
- Thread order: 9/16

#### Source에서 확정된 역할

- Development Thread role: Preserves the linear equal-`t` winner through original shape indices and exposes both modes.
- Classification summary: Introduces linear/BVH modes and makes closest-hit ties depend on original shape index.
- Importance rationale: The explicit reference mode and order-independent tie rule are essential semantic preparation for reordered traversal, though the BVH path is not yet active.

#### 해당 SHA에서 확인할 실제 코드

- `AccelMode` enum/value가 render settings, tracing, shading, occlusion, scene intersection APIs를 따라 전파되는 signature change를 기록합니다.
- default setting이 BVH로 바뀌는 initialization을 확인합니다.
- 이 intermediate SHA에서 BVH 선택을 해도 실제 implementation이 linear path를 사용하는 branch를 확인합니다.
- shape test helper가 original scene index를 어떻게 전달받고 current hit와 candidate `t`를 비교하는지 추적합니다.
- exact equal `t`일 때 later original shape index가 winner가 되는 condition을 코드로 옮깁니다.
- linear loop의 observable insertion-order behavior와 order-independent explicit rule이 동치인지 overlapping case로 설명합니다.

#### Source에서 확정된 이 SHA의 경계

- API default는 BVH지만 이 commit에서는 optimized traversal이 아직 활성화되지 않습니다.
- mode propagation과 tie contract를 traversal보다 먼저 확정하는 준비 단계입니다.

#### A-level 학습 기록

- 직전 관련 상태:
- 핵심 problem/edge:
- 선택한 algorithm 또는 boundary decision:
- 실제 state/data/control-flow 변화:
- 실패하거나 잘못될 수 있는 branch:
- 후속 test/benchmark가 확인해야 하는 항목:

#### 직접 확인 증거

- 확인한 file path와 symbol:
- 변경 전/후 핵심 차이:
- state 또는 boundary 변화:
- failure/edge branch:
- 관련 production test path:
- 이 SHA가 보장하는 것과 남은 공백:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `bb65e8092632`
- 다음 Thread commit: `f7e969537c10`
- 비교 지침: Thread 1의 `41a1d6bbe5ef` linear reference와 비교해 implicit order effect가 explicit shape-index tie rule로 바뀌는 지점을 기록합니다.
- 직접 작성한 연결 설명:

### 5.10 `f7e969537c10` — `feat(scene): 가속 구조 소유권과 rebuild 경계 구성`

- Importance: S
- Tags: ARCH, ACCEL, SCENE
- Thread order: 10/16

#### Source에서 확정된 역할

- Development Thread role: Makes acceleration owned, rebuildable derived scene state with an unbounded-shape path.
- Classification summary: Makes `Scene` own the BVH and unbounded index set, with explicit build, invalidation, and readiness state.
- Importance rationale: This establishes the critical lifecycle invariant that acceleration is derived from current owned geometry and must be rebuilt after mutation; it also defines how infinite planes remain correct.
- Most Important Commit anchors:
  - Problem: A BVH is not independent domain state: it is derived from current shapes and their bounds. The project also contains planes that cannot be placed in finite AABBs. Without an explicit lifecycle, a scene could query incomplete, stale, or improperly bounded acceleration data.
  - Decision: `Scene` owns a `Bvh`, a separate list of unbounded shape indices, and an acceleration-readiness flag. Adding a shape clears derived data and marks it unavailable; `buildAcceleration` partitions bounded from unbounded geometry and rebuilds the tree; parsed scenes build once after all directives succeed.
  - Why it mattered: This is the state-management half of acceleration correctness. It prevents the renderer from treating a built tree as permanently authoritative and defines the safe fallback condition used when BVH mode is requested before rebuilding.

#### 해당 SHA에서 확인할 실제 코드

- `Scene` 내부의 `Bvh`, unbounded shape index collection, acceleration-ready state field를 기록합니다.
- `addShape`가 shape insertion 후 derived arrays를 clear하고 readiness를 false로 만드는 순서를 추적합니다.
- `buildAcceleration`이 각 live shape의 optional valid bounds를 검사해 bounded build input과 unbounded list로 분류하는 코드를 확인합니다.
- BVH가 shape object 대신 scene index만 보관하는지 storage와 builder input을 통해 확인합니다.
- parser가 all directives/shape additions를 성공적으로 마친 뒤 build를 호출하는 위치를 기록합니다.
- programmatic scene mutation 이후 default BVH request를 위한 intended state transition을 diagram으로 작성합니다.
- Scene move/copy semantics와 shape ownership이 derived indices의 lifetime에 어떤 전제를 제공하는지 이전 ownership commit과 연결해 확인합니다.

#### Source에서 확정된 이 SHA의 경계

- planes와 other unbounded shapes는 tree에 fabricated box로 들어가지 않고 separate direct-test path를 가집니다.
- adding any shape makes existing acceleration stale; ready 상태는 explicit rebuild 후에만 복구됩니다.
- public mutable geometry가 readiness를 우회하는 문제는 아직 최종적으로 차단되지 않았고 `ef5320a83c27`에서 복구됩니다.

#### 추가 확인 포인트

- state machine을 `not built → ready → addShape invalidated → rebuild ready`로 작성하되 actual methods/fields를 해당 SHA에서 채웁니다.
- fallback query implementation의 실제 동작은 다음 traversal commit과 함께 확인합니다.

#### S-level 학습 기록

##### 직전 상태와 문제

- 이 commit 직전의 relevant architecture/state:
- 해결하려던 문제와 observable risk:
- 기존 설계가 충분하지 않았던 이유:

##### 핵심 decision과 상태 변화

- 선택한 decision:
- 새로 생긴 authoritative boundary:
- ownership/lifetime/state transition의 before → after:
- 다른 subsystem이 이 contract를 소비하는 방식:

##### 보장 범위

- 이 SHA가 보장하는 것:
- 이 SHA가 아직 보장하지 않는 것:
- failure path에서 유지해야 하는 invariant:
- 후속 fix/test가 보완하거나 고정하는 항목:

#### 직접 확인 증거

- 확인한 file path:
- 핵심 symbol과 caller/callee:
- 변경 전 대응 코드:
- 이 SHA의 변경 코드:
- ownership/lifecycle/state transition:
- failure branch와 cleanup:
- 이 코드가 보장하는 invariant:
- 이 코드만으로는 보장하지 않는 것:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `9a7f29b5d78a`
- 다음 Thread commit: `d4f6ee5b6042`
- 비교 지침: 이 SHA 전후를 비교해 acceleration이 독립 global/temporary structure가 아니라 Scene-owned derived state가 되는 경계를 표시합니다.
- 직접 작성한 연결 설명:

### 5.11 `d4f6ee5b6042` — `feat(accel): 결정적 BVH 최근접 순회 구현`

- Importance: S
- Tags: CORE, ACCEL, HARD
- Thread order: 11/16

#### Source에서 확정된 역할

- Development Thread role: Implements near-first explicit-stack traversal and pruning.
- Classification summary: Implements deterministic near-first BVH traversal with pruning, leaf testing, and a final unbounded pass.
- Importance rationale: This is the project-defining acceleration mechanism: it changes asymptotic work while preserving the linear path's hit semantics and mixed bounded/unbounded geometry.
- Most Important Commit anchors:
  - Problem: The renderer needed to skip large groups of shapes without allowing traversal order to change the selected hit. It also had to combine bounded BVH content with unbounded planes and preserve the current closest distance for pruning.
  - Decision: The commit implements an explicit stack, tests the root and child AABBs, visits the nearer child first, prunes nodes whose entry exceeds the current closest hit, tests leaf shape indices through the common candidate function, and finally tests unbounded shapes. Equal-entry child ordering is deterministic, while equal-hit selection remains governed by original shape indices.
  - Why it mattered: This is the algorithm that realizes the project's main performance improvement. It changes the amount and order of work while preserving the linear renderer's exact semantic result.

#### 해당 SHA에서 확인할 실제 코드

- `Scene::intersect`가 explicit linear mode, stale/unbuilt state, ready BVH state를 선택하는 top-level branch를 기록합니다.
- root AABB test와 initial stack entry creation을 확인합니다.
- stack loop에서 entry distance가 current closest보다 큰 node를 discard하는 condition을 기록합니다.
- interior node의 두 child box를 current interval로 검사하고 near-first order를 정하는 logic을 추적합니다.
- child entry가 같을 때 node index로 deterministic tie-break하는 branch를 기록합니다.
- far child가 stack에 남았다가 closer hit 이후 prune될 수 있는 흐름을 예시로 설명합니다.
- leaf primitive range가 common shape-index-aware candidate updater를 호출하는 경로를 확인합니다.
- tree traversal 뒤 unbounded shape indices를 직접 테스트하는 순서와 equal-hit rule 적용을 기록합니다.
- AABB counters가 root/child culling site에서 정확히 증가하는지 확인합니다.

#### Source에서 확정된 이 SHA의 경계

- stale or unbuilt acceleration은 incomplete tree를 사용하지 않고 complete linear scan으로 fallback합니다.
- bounded and unbounded paths가 same winner rule로 다시 합류해야 합니다.
- near-first는 pruning efficiency를 위한 순서이며 semantic winner는 original shape index tie rule이 결정합니다.

#### 추가 확인 포인트

- empty BVH, unbounded-only scene, one leaf, two-child tree 각각의 control flow를 해당 SHA 코드로 추적합니다.
- stack capacity/representation과 node index validity 검사를 실제 구현에서 기록합니다.

#### S-level 학습 기록

##### 직전 상태와 문제

- 이 commit 직전의 relevant architecture/state:
- 해결하려던 문제와 observable risk:
- 기존 설계가 충분하지 않았던 이유:

##### 핵심 decision과 상태 변화

- 선택한 decision:
- 새로 생긴 authoritative boundary:
- ownership/lifetime/state transition의 before → after:
- 다른 subsystem이 이 contract를 소비하는 방식:

##### 보장 범위

- 이 SHA가 보장하는 것:
- 이 SHA가 아직 보장하지 않는 것:
- failure path에서 유지해야 하는 invariant:
- 후속 fix/test가 보완하거나 고정하는 항목:

#### 직접 확인 증거

- 확인한 file path:
- 핵심 symbol과 caller/callee:
- 변경 전 대응 코드:
- 이 SHA의 변경 코드:
- ownership/lifecycle/state transition:
- failure branch와 cleanup:
- 이 코드가 보장하는 invariant:
- 이 코드만으로는 보장하지 않는 것:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `f7e969537c10`
- 다음 Thread commit: `41c9a59f27a6`
- 비교 지침: linear reference와 same candidate helper를 비교해 traversal order만 바뀌고 hit semantics는 유지되는지 실제 caller chain으로 증명합니다.
- 직접 작성한 연결 설명:

### 5.12 `41c9a59f27a6` — `test(accel): 선형 탐색과 BVH 결과 동치 검증`

- Importance: A
- Tags: TEST, ACCEL, DETERMINISM
- Thread order: 12/16

#### Source에서 확정된 역할

- Development Thread role: Proves linear/BVH hit and pixel equivalence while checking work reduction.
- Classification summary: Compares linear and BVH hits, equal-distance ties, full pixels, checksums, and primitive-test reduction.
- Importance rationale: The tests provide unusually strong evidence that the core optimization preserves observable semantics and actually reduces work.

#### Test commit 분석 기준

- 대상 production invariant: linear와 BVH는 hit record 전체와 final pixels를 동일하게 선택하며 BVH는 primitive dispatch를 실질적으로 줄인다.
- 재현하는 failure/boundary: empty/single/unbounded/mixed geometry, arbitrary cylinder, overlapping equal-`t` shapes, dense full render.
- test technique: reference-mode differential testing, exact identity/tie case, full buffer/checksum comparison, work-count threshold.
- 통과하는 production path: `Scene::intersect` linear and BVH paths, AABB traversal, unbounded pass, renderer.
- 이 test가 증명하는 것: optimization이 semantic behavior를 바꾸지 않고 culling으로 primitive work를 줄임.
- 이 test가 증명하지 않는 것: 모든 possible scene topology나 universal wall-clock speedup을 증명하지 않는다.
- test 성격: deterministic differential regression plus algorithmic work check.
- 막는 regression: tie-order drift, lost unbounded hits, cylinder bound/traversal miss, changed material/normal/shape pointer, fake speedup through changed output.

#### 학습자 검증 기록

- 실제 test case/function과 file path:
- fixture 또는 test double 구성:
- assertion 전에 통과하는 production function 순서:
- failure가 실제로 주입되는 정확한 지점:
- test 실행 명령과 결과:
- false positive 또는 미검증 범위:

#### 해당 SHA에서 확인할 실제 코드

- empty, single bounded, unbounded-only, arbitrary-axis cylinder scene construction을 각각 기록합니다.
- linear/BVH 비교 helper가 hit existence, `t`, point, normal, material, exact shape identity를 어떻게 assertion하는지 확인합니다.
- overlapping spheres의 insertion order와 equal-distance expected winner를 기록합니다.
- dense mixed scene의 complete pixel buffer와 checksum 비교 경로를 추적합니다.
- primitive-test reduction이 at least fourfold임을 계산하거나 assert하는 식을 확인합니다.
- AABB work가 존재함에도 output equivalence와 culling benefit을 분리해 검사하는 방식을 기록합니다.

#### 직접 확인 증거

- 확인한 file path와 symbol:
- 변경 전/후 핵심 차이:
- state 또는 boundary 변화:
- failure/edge branch:
- 관련 production test path:
- 이 SHA가 보장하는 것과 남은 공백:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `d4f6ee5b6042`
- 다음 Thread commit: `da3e8b43d09e`
- 비교 지침: 이 suite는 linear mode를 semantic oracle로 사용하므로, expected 값을 BVH 구현 자체에서 재사용하지 않는지 확인합니다.
- 직접 작성한 연결 설명:

### 5.13 `da3e8b43d09e` — `perf(benchmark): 선형 탐색과 BVH 작업량 비교`

- Importance: A
- Tags: PERF, ACCEL, DETERMINISM
- Thread order: 13/16

#### Source에서 확정된 역할

- Development Thread role: Measures both modes under the same correctness constraints.
- Classification summary: Measures linear and BVH modes under the same scene and rejects checksum divergence.
- Importance rationale: This makes the acceleration result externally comparable in both work and time, rather than relying on algorithmic claims alone.

#### 해당 SHA에서 확인할 실제 코드

- one immutable prebuilt dense scene이 linear와 BVH modes에 재사용되는 setup을 확인합니다.
- 각 mode별 warm-up과 five measured runs가 독립적으로 수행되는 loop를 기록합니다.
- mode 내부 repeated checksum, primitive count, AABB count consistency gate를 확인합니다.
- linear와 BVH final checksum이 다르면 report를 거부하는 cross-mode branch를 추적합니다.
- primary/shadow/secondary ray counts와 primitive/AABB work, elapsed median을 structured output에서 구분합니다.
- parsing과 hierarchy build가 measured render interval 밖에 있는지 call order로 확인합니다.

#### Source에서 확정된 이 SHA의 경계

- elapsed speed은 environment-sensitive이며 correctness/work counters와 별도로 해석합니다.
- one prebuilt scene을 재사용해 build cost가 제외된 render traversal comparison입니다.

#### A-level 학습 기록

- 직전 관련 상태:
- 핵심 problem/edge:
- 선택한 algorithm 또는 boundary decision:
- 실제 state/data/control-flow 변화:
- 실패하거나 잘못될 수 있는 branch:
- 후속 test/benchmark가 확인해야 하는 항목:

#### 직접 확인 증거

- 확인한 file path와 symbol:
- 변경 전/후 핵심 차이:
- state 또는 boundary 변화:
- failure/edge branch:
- 관련 production test path:
- 이 SHA가 보장하는 것과 남은 공백:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `41c9a59f27a6`
- 다음 Thread commit: `9b77225cf6b7`
- 비교 지침: 이 commit 이전 single-mode protocol과 비교해 same workload에서 controlled side-by-side mode comparison이 추가된 부분만 기록합니다.
- 직접 작성한 연결 설명:

### 5.14 `9b77225cf6b7` — `perf(benchmark): 측정 schema와 가속 기준 검증 고정`

- Importance: A
- Tags: PERF, ACCEL, DETERMINISM
- Thread order: 14/16

#### Source에서 확정된 역할

- Development Thread role: Fixes a versioned benchmark schema and enforces a primitive-test reduction threshold.
- Classification summary: Versions the benchmark schema, verifies all work counters, and enforces a primitive-test ratio below 25 percent.
- Importance rationale: The commit converts acceleration effectiveness from an informal observation into a repeatable, machine-checked performance criterion tied to unchanged output.

#### 해당 SHA에서 확인할 실제 코드

- structured report의 `schemaVersion` 1과 workload population, resolution, worker count, depth, tile size, warm-up, measured-run fields를 기록합니다.
- repeated samples가 every ray category, primitive tests, AABB tests, checksum에서 일치해야 하는 validation code를 확인합니다.
- BVH primitive tests가 linear count의 25 percent 미만인지 계산하는 exact comparison을 기록합니다.
- primitive-test ratio와 median-time speedup이 별도 fields로 출력되는 이유를 result schema에서 확인합니다.
- matching image라도 culling threshold를 넘으면 benchmark가 failure를 반환하는 control flow를 추적합니다.

#### Source에서 확정된 이 SHA의 경계

- algorithmic reduction criterion은 machine-checked이지만 timing speedup은 universal guarantee가 아닙니다.
- schema fields 없이는 stored/reference result의 configuration을 해석할 수 없습니다.

#### A-level 학습 기록

- 직전 관련 상태:
- 핵심 problem/edge:
- 선택한 algorithm 또는 boundary decision:
- 실제 state/data/control-flow 변화:
- 실패하거나 잘못될 수 있는 branch:
- 후속 test/benchmark가 확인해야 하는 항목:

#### 직접 확인 증거

- 확인한 file path와 symbol:
- 변경 전/후 핵심 차이:
- state 또는 boundary 변화:
- failure/edge branch:
- 관련 production test path:
- 이 SHA가 보장하는 것과 남은 공백:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `da3e8b43d09e`
- 다음 Thread commit: `ef5320a83c27`
- 비교 지침: 이 commit은 timing snapshot을 기록하는 다음 C-level commit과 달리 reusable measurement contract를 강화합니다. Thread map에는 source가 포함한 이 commit만 유지합니다.
- 직접 작성한 연결 설명:

### 5.15 `ef5320a83c27` — `fix(accel): 가속 구조의 도형 불변식 보호`

- Importance: S
- Tags: ARCH, ACCEL, SCENE
- Thread order: 15/16

#### Source에서 확정된 역할

- Development Thread role: Prevents callers from mutating geometry behind a ready BVH.
- Classification summary: Privatizes scene shape storage and built-in geometry, exposing only read-only accessors.
- Importance rationale: This closes the stale-BVH hole at its root by making every structural mutation pass through invalidation. It converts a convention into an enforceable ownership and derived-state invariant across scene, geometry, and acceleration.
- Most Important Commit anchors:
  - Problem: `Scene` tracked acceleration readiness, but public mutable shape storage and public primitive geometry allowed callers to change or reorder the source data without calling `addShape`. A ready flag could therefore remain true while BVH bounds and indices described obsolete geometry.
  - Decision: The shape vector becomes private, scene inspection becomes count plus checked `const Shape&` access, and built-in sphere, plane, and cylinder parameters move behind const accessors. Structural mutation must pass through `addShape`, which already invalidates derived acceleration.
  - Why it mattered: This closes a severe non-obvious correctness hole at the root cause. The lifecycle from `f7e969537c10` is now enforceable through the type interface rather than relying on callers to remember an undocumented convention.

#### Failure → Fix 연결

- 기존 가정: callers가 shape mutation 시 항상 `addShape`/rebuild lifecycle을 자발적으로 지킨다.
- 실제 failure 또는 위험: public container 또는 public primitive fields를 직접 수정하면 readiness는 true인데 BVH bounds/indices는 obsolete해진다.
- root cause: derived cache invalidation을 우회할 수 있는 mutable public source state.
- 수정된 decision/invariant: shape storage와 built-in geometry를 private로 만들고 const-only inspection만 노출한다.
- regression test 연결: `13f153e23920`의 compile-time API assertions와 runtime invalidation/fallback/rebuild test.

#### 학습자 root-cause 기록

- fix 직전 SHA에서 가정이 코드로 드러나는 지점:
- failure를 유발하는 입력/state/event:
- failure가 observable behavior로 나타나는 순서:
- 수정 코드가 root cause를 차단하는 정확한 branch:
- symptom 완화가 아니라 root cause 수정임을 보여주는 근거:
- regression test가 같은 failure mechanism을 재현하는 지점:

#### 해당 SHA에서 확인할 실제 코드

- fix 직전 Scene public shape container와 sphere/plane/cylinder public geometry가 어떻게 mutation/reordering을 허용했는지 API를 캡처합니다.
- ready flag가 true인 채 bounds source나 shape indices가 stale해질 수 있는 concrete mutation path를 작성합니다.
- 이 SHA에서 Scene shape vector가 private로 이동하고 count plus checked const element access가 제공되는 interface를 기록합니다.
- sphere, plane, cylinder parameters가 private fields와 const accessors로 바뀐 부분을 확인합니다.
- intersection과 bounds implementation이 private representation을 사용하도록 migration된 코드를 추적합니다.
- 모든 structural addition이 `addShape`를 통과해 existing invalidation을 실행하는지 public mutation surface를 검토합니다.
- custom shape extension과 built-in geometry immutability 범위를 actual type interface에서 구분합니다.

#### Source에서 확정된 이 SHA의 경계

- root cause는 BVH algorithm이 아니라 source geometry를 invalidation 없이 바꿀 수 있던 public API입니다.
- external code는 current geometry를 inspect할 수 있지만 built-in geometry나 shape order를 mutate할 수 없습니다.
- Scene sole ownership은 이전 `93167ba2bd94`에서 확립되었고 이 fix는 mutation control을 완성합니다.

#### S-level 학습 기록

##### 직전 상태와 문제

- 이 commit 직전의 relevant architecture/state:
- 해결하려던 문제와 observable risk:
- 기존 설계가 충분하지 않았던 이유:

##### 핵심 decision과 상태 변화

- 선택한 decision:
- 새로 생긴 authoritative boundary:
- ownership/lifetime/state transition의 before → after:
- 다른 subsystem이 이 contract를 소비하는 방식:

##### 보장 범위

- 이 SHA가 보장하는 것:
- 이 SHA가 아직 보장하지 않는 것:
- failure path에서 유지해야 하는 invariant:
- 후속 fix/test가 보완하거나 고정하는 항목:

#### 직접 확인 증거

- 확인한 file path:
- 핵심 symbol과 caller/callee:
- 변경 전 대응 코드:
- 이 SHA의 변경 코드:
- ownership/lifecycle/state transition:
- failure branch와 cleanup:
- 이 코드가 보장하는 invariant:
- 이 코드만으로는 보장하지 않는 것:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `9b77225cf6b7`
- 다음 Thread commit: `13f153e23920`
- 비교 지침: 초기 lifecycle commit `f7e969537c10`과 비교해 readiness convention이 type-enforced boundary로 완성되는 변화만 집중 기록합니다.
- 직접 작성한 연결 설명:

### 5.16 `13f153e23920` — `test(accel): 장면 변경과 가속 상태 불변식 검증`

- Importance: A
- Tags: TEST, ACCEL, SCENE
- Thread order: 16/16

#### Source에서 확정된 역할

- Development Thread role: Verifies immutability, invalidation, linear fallback, and rebuild as one state transition.
- Classification summary: Adds compile-time immutability assertions and runtime invalidation, fallback, and rebuild checks.
- Importance rationale: The tests prove the complete acceleration state transition and prevent callers from bypassing the S-level ownership correction.

#### Test commit 분석 기준

- 대상 production invariant: ready acceleration은 current immutable geometry만 설명하며 structural mutation은 invalidation, fallback, rebuild를 거친다.
- 재현하는 failure/boundary: API-level direct mutation bypass와 build 후 supported shape addition.
- test technique: compile-time type traits/static assertions plus runtime state-transition regression.
- 통과하는 production path: Scene public API → `addShape` invalidation → BVH-mode `Scene::intersect` fallback → `buildAcceleration` → rebuilt traversal.
- 이 test가 증명하는 것: built-in geometry/storage immutability와 invalidated-state correctness가 하나의 enforceable lifecycle로 동작한다.
- 이 test가 증명하지 않는 것: 모든 third-party `Shape` subtype 내부 mutation 정책까지 자동으로 보증한다고 단정하지 않는다; 실제 interface 범위를 기록한다.
- test 성격: compile-time contract regression plus deterministic lifecycle integration test.
- 막는 regression: mutable API 재노출, invalidation 누락, stale BVH use, fallback omission, rebuild indexing old shape set.

#### 학습자 검증 기록

- 실제 test case/function과 file path:
- fixture 또는 test double 구성:
- assertion 전에 통과하는 production function 순서:
- failure가 실제로 주입되는 정확한 지점:
- test 실행 명령과 결과:
- false positive 또는 미검증 범위:

#### 해당 SHA에서 확인할 실제 코드

- type-trait/static assertions가 mutable shape storage 노출 여부, indexed access return type, geometry accessor assignability를 어떻게 검사하는지 기록합니다.
- runtime scene에 first shape를 추가하고 acceleration을 build하는 setup을 확인합니다.
- second shape를 supported `addShape` boundary로 추가한 뒤 count 증가와 ready-state invalidation assertion을 기록합니다.
- BVH-mode query가 not-ready 상태에서 current linear geometry로 fallback해 new shape를 hit하는지 추적합니다.
- rebuild 후 같은 hit가 유지되는 assertion과 shape identity/distance 비교를 확인합니다.
- compile-time and runtime halves가 각각 API bypass prevention과 state transition behavior를 맡는 이유를 구분합니다.

#### 직접 확인 증거

- 확인한 file path와 symbol:
- 변경 전/후 핵심 차이:
- state 또는 boundary 변화:
- failure/edge branch:
- 관련 production test path:
- 이 SHA가 보장하는 것과 남은 공백:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `ef5320a83c27`
- 다음 Thread commit: 이 Thread의 종료점
- 비교 지침: fix commit의 private/const API와 이 test의 static assertions를 일대일로 연결하고, runtime half는 `f7e969537c10` state machine 전체를 다시 검증하는지 확인합니다.
- 직접 작성한 연결 설명:

## 6. Invariant ledger

source가 연결한 invariant의 시간상 변화를 실제 코드 근거로 완성합니다.

| Invariant | 최초 도입/기준 | 강화 또는 수정 | 부족함/위험 노출 | 고정한 test/evidence | 실제 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| linear/BVH semantic winner 동치 | 9a7f29b5d78a | d4f6ee5b6042 | traversal reordering에서 위험 노출 | 41c9a59f27a6 / 13f153e23920 | 작성 |
| bounds는 real hit를 절대 배제하지 않음 | a40452885176 | b782e22450d8 | under-bound가 image correctness를 훼손할 위험 | 419d52d687fc | 작성 |
| ready BVH는 current shape set만 설명 | f7e969537c10 | ef5320a83c27 | public mutable storage/geometry가 invalidation을 우회 | 13f153e23920 | 작성 |
| 가속 효과는 동일 output 하의 work reduction | f4dcb50939e2 / f5a2c4ade16d | da3e8b43d09e | checksum 또는 work counter 불일치 시 결과 거부 | 9b77225cf6b7 | 작성 |

### Ledger 보완 기록

- 각 invariant가 처음 observable behavior가 된 SHA:
- invariant를 우회하거나 깨뜨릴 수 있었던 실제 code path:
- fix 뒤 새로 금지되거나 강제된 state transition:
- test가 invariant를 직접 고정하는 assertion:
- source가 명시하지 않은 invariant를 추가했다면 삭제하거나 근거를 재확인:

## 7. Failure → Fix → Test 연결

| Failure 또는 위험 | Decision/Fix | Test 또는 evidence | 실제 failure path와 assertion |
| --- | --- | --- | --- |
| AABB 또는 cylinder bound가 실제 primitive보다 작음 | conservative extent, epsilon padding, `nextafter` outward expansion | 419d52d687fc edge/bounds regression | 작성 |
| traversal reordering이 equal-`t` winner를 바꿈 | original scene shape index를 candidate tie rule에 포함 | 41c9a59f27a6 overlapping-sphere regression | 작성 |
| shape 추가 후 stale BVH를 그대로 사용 | `addShape` invalidation과 not-ready linear fallback | 13f153e23920 runtime state-transition regression | 작성 |
| geometry를 외부에서 직접 수정해 readiness를 우회 | private storage와 const accessors로 root cause 차단 | 13f153e23920 compile-time immutability assertions | 작성 |
| BVH가 같은 이미지를 만들지만 work를 충분히 줄이지 못함 | versioned benchmark에서 primitive-test ratio < 0.25 강제 | 9b77225cf6b7 benchmark failure gate | 작성 |

### 연결 검토

- feature를 독립적인 성공 경로로만 읽지 않고 어떤 failure를 예방하는지 기록:
- fix가 기존 assumption을 어떻게 수정했는지 기록:
- test가 symptom이 아니라 root cause를 재현하는지 확인:
- test가 증명하지 않는 범위를 별도로 기록:

## 8. Ownership / state / responsibility 변화

- `Scene`이 shape source state와 `Bvh`/unbounded indices derived state를 각각 어떻게 소유하는지 그립니다.
- `BvhPrimitive`와 `BvhNode`가 shape object를 소유하지 않고 어떤 index/range만 보관하는지 확인합니다.
- `HitRecord::shape`, BVH primitive index, Scene shape storage의 lifetime 관계를 기록합니다.
- public mutable geometry가 readiness flag를 우회했던 경로와 const-only API가 이를 어떻게 차단하는지 before/after로 비교합니다.

### 학습자 최종 기록

- source state:
- derived/cache state:
- owner와 non-owner:
- mutation 또는 transition boundary:
- failure 시 복구되는 상태:

## 9. Thread 최종 상태

bounded shapes는 contiguous BVH에, unbounded shapes는 별도 index path에 남고, `Scene`이 둘의 lifetime과 readiness를 관리합니다. ready BVH는 current immutable geometry만 설명하며, mutation은 반드시 invalidation을 거칩니다. linear/BVH 결과 동치와 primitive-work 감소는 tests와 versioned benchmark gate로 동시에 검증됩니다.

### 직접 작성

- Thread 시작 시점과 종료 시점의 behavior 차이:
- 최종적으로 authoritative한 contract:
- 아직 다른 Thread가 보완해야 하는 항목:

## 10. 최종 architecture 또는 execution flow 정리

### Source가 확정한 흐름 anchor

`semantic counters/workload → AABB slab and shape bounds → deterministic BVH build → `Scene` build/readiness/invalidation → near-first stack traversal + unbounded pass → linear/BVH equivalence → benchmark gate → geometry immutability and rebuild regression`

### 실제 코드로 완성할 흐름

1. entry point와 입력 state:
2. 핵심 caller → callee:
3. state/ownership mutation:
4. success result:
5. failure branch와 cleanup/fallback:
6. test/benchmark가 통과하는 동일 production path:

### 학습자의 최종 설명

이 영역에는 source 문장을 복사하지 말고, 확인한 SHA별 코드와 연결 관계를 근거로
설계 → 구현 → 실패 또는 위험 → 수정 → 검증의 발전 과정을 직접 작성합니다.

## 11. 학습 완료 자가 점검

- [ ] 모든 commit을 source 순서대로 확인했습니다.
- [ ] 각 commit의 SHA, subject, importance, tags를 그대로 유지했습니다.
- [ ] 모든 핵심 설명에 해당 SHA의 file path와 symbol 근거가 있습니다.
- [ ] final HEAD의 구조를 과거 SHA에 소급하지 않았습니다.
- [ ] S/A/B importance에 맞는 깊이로 기록했습니다.
- [ ] source에서 확정하지 않은 구현 세부를 정답처럼 채우지 않았습니다.
- [ ] failure와 fix/test가 실제 production path로 연결됩니다.
- [ ] test가 증명하는 것과 증명하지 않는 것을 구분했습니다.
- [ ] invariant ledger의 각 변화가 commit evidence와 연결됩니다.
- [ ] 별도의 프로젝트 재학습 없이 이 Thread의 발전 과정을 설명할 수 있습니다.
