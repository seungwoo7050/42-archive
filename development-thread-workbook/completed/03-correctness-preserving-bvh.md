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

- [x] 선형과 BVH가 공유하는 candidate-update 규칙을 실제 함수 단위로 추적했습니다.
- [x] sphere, plane, arbitrary-axis cylinder가 bounded/unbounded로 분류되는 코드와 bounds 계산을 확인했습니다.
- [x] BVH build 결과의 node/primitive 저장 구조와 stable ordering 근거를 기록했습니다.
- [x] Scene acceleration state의 build → ready → mutation invalidation → linear fallback → rebuild 전이를 코드와 테스트로 재현했습니다.
- [x] hit record 전체, pixel buffer, checksum, primitive/AABB counts를 비교하는 검증 계층을 구분했습니다.
- [x] schemaVersion 1 benchmark와 primitive-test ratio gate가 무엇을 증명하고 elapsed speedup이 왜 환경 의존적인지 설명할 수 있습니다.
- [x] 모든 참조 SHA가 `cpp/miniRT` branch HEAD의 ancestry에 속하는지 확인했습니다.
- [ ] 해당 SHA checkout에서 build/test/benchmark 명령을 직접 실행했습니다. 로컬 외부 네트워크와 checkout이 제공되지 않아 실행 evidence는 만들지 않았습니다.

### 검증 범위

- 지정 branch HEAD: `7d08c7c13fa68c3e60eea3c7014658b0a133e6f0`
- 각 참조 SHA는 Thread 내부의 연속 compare chain에서 `behind_by = 0`, merge base가 선행 SHA였고, Thread 종료 SHA도 branch HEAD의 조상으로 확인했습니다.
- 구현 설명은 해당 commit의 diff/file content를 기준으로 작성했으며, final HEAD의 후속 API를 과거 SHA에 소급하지 않았습니다.
- 테스트와 benchmark는 source mechanism과 production path만 검사했습니다. 실행 결과, sanitizer 결과, wall-clock 수치는 기록하지 않았습니다.

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

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** BVH를 추가하기 전에 “빠르다”를 말하려면 동일한 renderer가 실제로 수행한 semantic work를 세는 기준이 필요합니다. scene size를 근사하거나 elapsed time만 재면 culling 정도와 환경 noise를 분리할 수 없습니다.
- **핵심 구현 결정:** `RenderStats`에 primary/secondary/shadow ray, primitive test, 향후 AABB test, elapsed milliseconds를 둡니다. optional stats sink를 render → trace/shade → scene intersection/occlusion 경로에 전달합니다. primitive counter는 각 `Shape::intersect` dispatch 직전에, shadow counter는 positive diffuse term 뒤 실제 occlusion query 직전에 증가합니다. elapsed interval은 complete image rendering을 steady clock으로 감쌉니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - include/ray/renderer.hpp — `RenderStats`, optional stats parameters
  - src/renderer.cpp — primary rays와 elapsed interval
  - src/shading.cpp — secondary/shadow counters
  - src/scene.cpp — primitive dispatch counter
- **caller → callee / data flow:** render entry → optional sink 전달 → 실제 ray/query/primitive dispatch에서 integer counter 증가 → image 완료 후 elapsed 기록
- **ownership·state transition:** sink가 null이면 기존 호출과 결과를 유지합니다. counters는 관찰용 derived data이며 image selection에 참여하지 않습니다. `aabbTests` field는 준비되지만 이 SHA에는 실제 box traversal이 없습니다.
- **failure/edge branch:** counter를 dispatch 뒤에 올리면 예외/early return work를 누락하고, scene size로 추정하면 실제 pruning을 측정하지 못합니다. 이 commit은 그런 위치 오류를 피하도록 semantic boundary에 계측을 둡니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 후속 acceleration이 같은 image를 만들면서 primitive work를 줄였는지 비교할 수 있는 기준을 제공합니다.
- **이 SHA가 보장하지 않는 것:** elapsed time은 환경 의존적이고, AABB work는 아직 0입니다.
- **직접 확인/후속 evidence:** 각 signature와 increment 위치를 해당 SHA diff에서 확인했습니다. runtime counter 값은 실행하지 않았습니다.

#### Thread 내 연결

- 이전 Thread commit: 이 Thread의 시작점
- 다음 Thread commit: `4fb2345c7d35`
- 이 commit이 다음 단계에 제공하는 것: `4fb2345c7d35`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.2 `4fb2345c7d35` — `perf(benchmark): 조밀 장면 기준 workload 추가`

- Importance: B
- Tags: PERF, ACCEL
- Thread order: 2/16

#### Source에서 확정된 역할

- Development Thread role: Establishes a fixed dense-scene workload.

#### B-level 구현 역할 복원

- **직전 관련 상태:** 계측만 있어도 장면이 작거나 매번 다르면 acceleration 전후를 반복 비교할 수 없습니다.
- **핵심 구현 결정:** `benchmarks/render_benchmark.cpp`에 640×360 camera, 두 light, plane, 20×20 sphere grid를 코드로 만드는 고정 dense scene을 추가하고 render stats와 checksum을 출력합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - benchmarks/render_benchmark.cpp — fixed dense scene construction and single measured render
  - CMakeLists.txt — benchmark target
- **caller → callee / data flow:** hard-coded configuration → dense Scene construction → render with stats → checksum/work/time report
- **ownership·state transition:** workload geometry와 resolution이 source에 고정되어 비교 입력이 됩니다. 이 시점에는 반복 median이나 linear/BVH 두 모드 비교가 아직 없습니다.
- **failure/edge branch:** 한 번의 elapsed measurement는 warm-up과 OS scheduling noise에 취약합니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** acceleration 전 semantic-work baseline을 재사용 가능한 executable로 만듭니다.
- **이 SHA가 보장하지 않는 것:** 반복 결정성, median, cross-mode equality와 gate는 후속 commit입니다.
- **직접 확인/후속 evidence:** scene 구성의 plane + 400 spheres, 해상도와 light 수를 source에서 확인했습니다. benchmark는 실행하지 않았습니다.

#### Thread 내 연결

- 이전 Thread commit: `f4dcb50939e2`
- 다음 Thread commit: `f5a2c4ade16d`
- 이 commit이 다음 단계에 제공하는 것: `f5a2c4ade16d`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.3 `f5a2c4ade16d` — `perf(benchmark): 반복 측정과 결정성 보고 구성`

- Importance: A
- Tags: PERF, DETERMINISM
- Thread order: 3/16

#### Source에서 확정된 역할

- Development Thread role: Defines repeated median measurement and rejects inconsistent results.

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** 단일 benchmark run은 cache/warm-up과 scheduling 변동을 대표값으로 오인할 수 있고, 반복마다 다른 image/work를 만들어도 단순 시간 출력만으로는 알아차리지 못합니다.
- **핵심 구현 결정:** 한 번의 warm-up 뒤 5회 측정하고 elapsed 값을 정렬해 median을 보고합니다. 각 run의 checksum과 primitive count가 첫 측정과 같지 않으면 benchmark를 실패시켜 시간 비교 전에 결과와 deterministic work를 검증합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - benchmarks/render_benchmark.cpp — warm-up, five samples, consistency checks, median/report
- **caller → callee / data flow:** warm-up(discard) → measured render ×5 → per-run checksum/work equality → elapsed sort → median output
- **ownership·state transition:** checksum과 integer work는 deterministic contract이고 elapsed는 관찰값입니다. benchmark가 mismatch를 발견하면 representative time을 성공값으로 보고하지 않습니다.
- **failure/edge branch:** 결과가 다른 빠른 implementation이나 nondeterministic work를 시간 개선으로 받아들이는 것을 거부합니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 같은 모드·workload 안에서 반복 결과와 work 일치 후 median time을 제공합니다.
- **이 SHA가 보장하지 않는 것:** 아직 BVH mode가 없으므로 acceleration cross-mode equivalence는 증명하지 않습니다.
- **직접 확인/후속 evidence:** warm-up 횟수, 5회 sample, checksum/primitive consistency와 median 로직을 확인했습니다. 실제 median은 측정하지 않았습니다.

#### Thread 내 연결

- 이전 Thread commit: `4fb2345c7d35`
- 다음 Thread commit: `7b19f2ad78e3`
- 이 commit이 다음 단계에 제공하는 것: `7b19f2ad78e3`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.4 `7b19f2ad78e3` — `feat(accel): ray-box slab 교차 구현`

- Importance: A
- Tags: ACCEL, HARD, EDGE
- Thread order: 4/16

#### Source에서 확정된 역할

- Development Thread role: Implements the ray/AABB interval test.

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** BVH node를 pruning하려면 ray와 axis-aligned box의 겹치는 parameter interval을 false negative 없이 계산해야 합니다.
- **핵심 구현 결정:** `Aabb`와 slab intersection을 구현합니다. caller의 `[tMin,tMax]`에서 시작해 x/y/z 각 축의 near/far를 교집합합니다. direction component가 0이면 origin이 slab 안인지 직접 검사하고, 음수 방향은 near/far를 swap합니다. `far < near`일 때만 miss이므로 `far == near`인 접촉도 hit로 보존합니다. 필요하면 entry distance를 반환합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - include/ray/accel.hpp — `Aabb`와 intersection API
  - src/accel.cpp — slab test
- **caller → callee / data flow:** ray + valid box + caller interval → axis별 slab interval → running near/far 교집합 → optional entry + hit/miss
- **ownership·state transition:** running near/far가 축을 지날 때마다 좁아지는 local state입니다. box invalidity와 parallel-outside는 즉시 miss입니다.
- **failure/edge branch:** `far <= near`로 거부하면 tangent/contact traversal을 false negative로 만들 수 있습니다. 0으로 나누기 전에 parallel branch를 분리해야 합니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 닫힌 interval 기준의 ray-box candidate test를 제공합니다.
- **이 SHA가 보장하지 않는 것:** shape bounds의 보수성과 BVH build/traversal correctness는 아직 별도입니다.
- **직접 확인/후속 evidence:** 후속 boundary tests가 parallel, negative direction, exact contact를 고정하는 것을 연결했습니다.

#### Thread 내 연결

- 이전 Thread commit: `f5a2c4ade16d`
- 다음 Thread commit: `a40452885176`
- 이 commit이 다음 단계에 제공하는 것: `a40452885176`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.5 `a40452885176` — `feat(accel): 도형 경계 계약과 구·평면 bounds 추가`

- Importance: A
- Tags: ARCH, ACCEL, GEOMETRY
- Thread order: 5/16

#### Source에서 확정된 역할

- Development Thread role: Defines which shapes provide finite bounds and which remain unbounded.

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** AABB test가 있어도 모든 shape가 유한 bounds를 갖는다는 잘못된 가정은 무한 평면을 임의 box로 잘라 hit를 누락시킵니다.
- **핵심 구현 결정:** `Shape::bounds` 계약을 추가해 finite bounds가 있으면 value를, 없으면 `std::nullopt`를 반환하도록 합니다. Sphere는 center ± radius의 정확한 box를 제공하고 Plane은 무한 geometry이므로 `nullopt`를 반환합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - include/ray/geometry.hpp — virtual `bounds` contract
  - src/geometry.cpp — `Sphere::bounds`, `Plane::bounds`
- **caller → callee / data flow:** shape → optional bounds → bounded shape는 BVH 후보, unbounded shape는 별도 linear path
- **ownership·state transition:** bounds는 source geometry에서 계산되는 derived value입니다. `nullopt`는 오류가 아니라 acceleration partition 정보입니다.
- **failure/edge branch:** Plane에 arbitrary finite box를 부여하면 box 밖의 실제 hit가 pruning되어 false negative가 됩니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 가속 가능한 유한 geometry와 별도 검사해야 하는 무한 geometry를 type-polymorphic하게 구분합니다.
- **이 SHA가 보장하지 않는 것:** 원기둥 bounds와 Scene partition/lifecycle은 다음 commit들에 있습니다.
- **직접 확인/후속 evidence:** Sphere exact bounds와 Plane `nullopt`를 해당 SHA에서 확인했습니다.

#### Thread 내 연결

- 이전 Thread commit: `7b19f2ad78e3`
- 다음 Thread commit: `b782e22450d8`
- 이 commit이 다음 단계에 제공하는 것: `b782e22450d8`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.6 `b782e22450d8` — `feat(accel): 원기둥의 보수적 bounds 계산 추가`

- Importance: A
- Tags: ACCEL, GEOMETRY, HARD
- Thread order: 6/16

#### Source에서 확정된 역할

- Development Thread role: Adds conservative arbitrary-axis cylinder bounds.

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** arbitrary-axis finite cylinder는 center±radius 같은 단순 box로 감쌀 수 없습니다. side radius와 half-height가 각 world axis에 다르게 투영됩니다.
- **핵심 구현 결정:** 정규화된 cylinder axis의 각 component에 대해 cap 방향 extent와 축에 수직인 원의 최대 projection을 결합합니다. side extent는 radius와 `sqrt(max(0, 1-axis_i²))` 계열로, cap extent는 half-height·`abs(axis_i)`로 계산합니다. epsilon을 반영하고 `std::nextafter`로 min/max를 바깥쪽으로 한 단계 확장해 rounding으로 shape를 잘라내지 않게 합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - src/geometry.cpp — `Cylinder::bounds`
  - include/ray/geometry.hpp — cylinder bounds override
- **caller → callee / data flow:** center/normalized axis/radius/half-height → 축별 cap+side 최대 extent → conservative min/max → outward `nextafter`
- **ownership·state transition:** bounds는 cylinder geometry의 derived snapshot입니다. 이후 geometry mutation이 허용되면 이 snapshot과 BVH가 stale해질 수 있다는 문제가 Thread 후반에 드러납니다.
- **failure/edge branch:** projection 일부를 빼거나 rounding inward가 되면 실제 surface point가 box 밖에 놓여 traversal false negative가 발생합니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 지원하는 arbitrary-axis cylinder를 포함하는 보수적 finite box를 제공합니다.
- **이 SHA가 보장하지 않는 것:** tightest possible box나 모든 floating-point non-finite geometry 정책을 목표로 하지 않습니다.
- **직접 확인/후속 evidence:** 후속 test가 sampled/exact cylinder points가 bounds 안인지 검사하는 경로와 연결했습니다.

#### Thread 내 연결

- 이전 Thread commit: `a40452885176`
- 다음 Thread commit: `419d52d687fc`
- 이 commit이 다음 단계에 제공하는 것: `419d52d687fc`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.7 `419d52d687fc` — `test(accel): AABB와 도형 경계 계산 검증`

- Importance: A
- Tags: TEST, ACCEL, RISK
- Thread order: 7/16

#### Source에서 확정된 역할

- Development Thread role: Verifies AABB edge behavior and the no-false-negative bounds contract.

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** slab와 bounds 수식이 추가됐지만 접촉·parallel·negative direction과 cylinder containment를 자동으로 고정하지 않으면 작은 비교 연산 변경이 false negative를 만들 수 있습니다.
- **핵심 구현 결정:** `tests/core_tests.cpp`에 AABB forward entry 2, negative direction, boundary contact hit, parallel outside miss를 추가합니다. Sphere exact bounds, Plane no-bounds, arbitrary-axis Cylinder의 계산된 surface points가 box 안에 있고 허용 오차 내에 있는지도 검증합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - tests/core_tests.cpp — AABB and shape-bounds regression cases
  - src/accel.cpp — slab production path
  - src/geometry.cpp — shape bounds
- **caller → callee / data flow:** deterministic ray/box cases → slab result/entry assertions; geometry construction → bounds → containment assertions
- **ownership·state transition:** fixture는 local value objects이며 external state가 없습니다.
- **failure/edge branch:** contact를 miss로 바꾸거나 cylinder extent를 작게 만들면 assertion이 실패합니다.

#### Test commit 분석 기준

- **대상 production invariant:** AABB interval과 shape bounds가 유효한 hit 후보를 거짓으로 제거하지 않습니다.
- **test technique:** deterministic boundary testing + geometry containment assertions
- **통과하는 production path:** `Aabb` slab test, `Sphere::bounds`, `Plane::bounds`, `Cylinder::bounds`
- **이 test가 증명하는 것:** parallel/negative/contact 사례와 대표 shape bounds behavior를 고정합니다.
- **이 test가 증명하지 않는 것:** BVH build/traversal 전체 또는 연속 공간의 모든 point를 증명하지 않습니다.
- **실행 상태:** 테스트 구현과 production 호출 경로는 해당 SHA에서 확인했지만, 이 환경에서는 checkout/build가 불가능해 명령을 실행하지 않았습니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 선택된 edge와 shape samples에서 no-false-negative bounds 계약을 고정합니다.
- **이 SHA가 보장하지 않는 것:** 모든 방향·모든 surface point의 수학적 증명이나 실제 BVH traversal equivalence를 대신하지 않습니다.
- **직접 확인/후속 evidence:** 테스트 코드와 production path를 검사했습니다. executable은 실행하지 않았습니다.

#### Thread 내 연결

- 이전 Thread commit: `b782e22450d8`
- 다음 Thread commit: `bb65e8092632`
- 이 commit이 다음 단계에 제공하는 것: `bb65e8092632`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.8 `bb65e8092632` — `feat(accel): 결정적 중앙 분할 BVH 구축 구현`

- Importance: A
- Tags: ACCEL, HARD, DETERMINISM
- Thread order: 8/16

#### Source에서 확정된 역할

- Development Thread role: Builds a deterministic median-split BVH.

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** bounded primitive 목록과 AABB가 있어도 build order가 비결정적이거나 leaf에 너무 많은 primitive를 두면 reproducibility와 work reduction을 확보할 수 없습니다.
- **핵심 구현 결정:** `Bvh::build`가 입력 primitive reference와 original shape index를 복사하고 기존 nodes/indices를 지운 뒤 recursive median split을 수행합니다. node bounds와 centroid bounds를 합치고, centroid extent가 가장 큰 축을 선택합니다. centroid가 같으면 original shape index로 tie-break하며 stable ordering을 유지합니다. count ≤ 4는 leaf로 만들고 그 외에는 median `count/2`에서 나눕니다. leaf는 flattened primitive index range를 가리킵니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - include/ray/accel.hpp — BVH node/primitive storage
  - src/accel.cpp — `Bvh::build` and recursive builder
- **caller → callee / data flow:** bounded primitive refs → node bounds/centroid bounds → deterministic split axis → stable sort `(centroid, shapeIndex)` → median recursion → flat nodes + primitive indices
- **ownership·state transition:** BVH owns node/index arrays but shapes 자체는 소유하지 않고 scene-owned objects를 참조합니다. empty build는 empty state로 종료합니다.
- **failure/edge branch:** centroid-only unstable sort는 동률에서 build shape를 바꿀 수 있고, original index를 잃으면 exact equal-`t` semantics를 복원하기 어렵습니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 같은 ordered shape input에서 결정적인 median-split tree와 leaf ordering을 만듭니다.
- **이 SHA가 보장하지 않는 것:** 이 commit은 아직 Scene mode/lifecycle이나 traversal winner를 완성하지 않습니다.
- **직접 확인/후속 evidence:** node/leaf limit, axis selection, index tie-break와 storage layout을 해당 SHA diff에서 확인했습니다.

#### Thread 내 연결

- 이전 Thread commit: `419d52d687fc`
- 다음 Thread commit: `9a7f29b5d78a`
- 이 commit이 다음 단계에 제공하는 것: `9a7f29b5d78a`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.9 `9a7f29b5d78a` — `feat(accel): 선형·BVH 탐색 모드 계약 연결`

- Importance: A
- Tags: ARCH, ACCEL, DETERMINISM
- Thread order: 9/16

#### Source에서 확정된 역할

- Development Thread role: Preserves the linear equal-`t` winner through original shape indices and exposes both modes.

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** BVH가 primitive 순서를 바꾸면 단순 “먼저 발견한 최소 t” 규칙은 선형 traversal의 exact equal-distance winner를 바꿀 수 있습니다.
- **핵심 구현 결정:** `AccelMode`를 호출 경로에 노출하고 candidate 비교를 `(smaller t) OR (equal t AND larger original shape index)`로 명시합니다. 이는 `41a1d6bbe5ef`에서 inclusive upper bound 때문에 생긴 “뒤 저장 index가 exact tie winner” 규칙을 traversal order와 분리합니다. 이 SHA에서는 mode parameter wiring이 생기지만 실제 BVH traversal은 아직 다음 commit들에 있습니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - include/ray/renderer.hpp — `AccelMode`/settings
  - include/ray/accel.hpp — indexed primitive representation
  - src/scene.cpp — candidate update helper/linear path
  - src/renderer.cpp, src/shading.cpp — mode 전달
- **caller → callee / data flow:** candidate `(t,index)` → current winner와 비교 → smaller t 또는 exact tie/larger index만 authoritative record 교체
- **ownership·state transition:** winner state가 거리뿐 아니라 original index를 포함합니다. traversal order는 더 이상 semantic tie-break source가 아닙니다.
- **failure/edge branch:** `<=` 또는 discovery order만 쓰면 tree shape/near-first order에 따라 material·normal·shape identity가 바뀔 수 있습니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 선형 semantics를 가속 traversal에서도 재사용할 수 있는 explicit candidate rule을 정의합니다.
- **이 SHA가 보장하지 않는 것:** BVH ready state와 traversal은 아직 완성되지 않았으며 mode가 실제 다른 path를 선택하지 않는 단계입니다.
- **직접 확인/후속 evidence:** 선형 baseline과 candidate helper의 tie 방향을 대조했습니다.

#### Thread 내 연결

- 이전 Thread commit: `bb65e8092632`
- 다음 Thread commit: `f7e969537c10`
- 이 commit이 다음 단계에 제공하는 것: `f7e969537c10`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.10 `f7e969537c10` — `feat(scene): 가속 구조 소유권과 rebuild 경계 구성`

- Importance: S
- Tags: ARCH, ACCEL, SCENE
- Thread order: 10/16

#### Source에서 확정된 역할

- Development Thread role: Makes acceleration owned, rebuildable derived scene state with an unbounded-shape path.

#### S-level architecture와 invariant 복원

- **직전 관련 상태:** BVH object만 존재하면 누가 build하고 shape mutation 뒤 언제 invalidated되는지, Plane 같은 unbounded geometry를 어디서 검사하는지 불명확합니다.
- **핵심 구현 결정:** `Scene`이 BVH와 unbounded shape index 목록, ready flag를 소유합니다. `addShape`가 shape를 Scene에 넣고 acceleration을 invalidated state로 바꿉니다. `buildAcceleration`은 현재 shapes에서 finite bounds와 unbounded를 partition하고 bounded refs로 BVH를 rebuild한 뒤 ready를 true로 만듭니다. parser는 scene 구성이 끝난 뒤 build를 호출합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - include/ray/scene.hpp — BVH/unbounded indices/ready state
  - src/scene.cpp — `addShape`, invalidation, `buildAcceleration`
  - src/parser.cpp — complete scene 뒤 acceleration build
- **caller → callee / data flow:** Scene shape mutation → ready=false → build: bounded/unbounded partition + BVH rebuild → ready=true → query가 derived state 사용 가능
- **ownership·state transition:** shape objects는 Scene이 소유하고 BVH는 그 수명 안에서 non-owning references/indices를 가진 derived cache입니다. unbounded list도 같은 source set에서 파생됩니다.
- **failure/edge branch:** ready cache가 source geometry와 다르면 false negative가 가능합니다. 이 초기 설계는 public mutable built-in geometry를 완전히 차단하지 못해 `ef5320a83c27`에서 수정됩니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** shape set 변경을 통한 invalidation, explicit rebuild, bounded/unbounded 두 query path의 lifecycle을 정의합니다.
- **이 SHA가 보장하지 않는 것:** 외부가 이미 보유한 shape 또는 public geometry field를 변경하는 stale-cache 경로는 남아 있습니다. 실제 BVH traversal은 다음 SHA입니다.
- **직접 확인/후속 evidence:** build/invalidate/partition 순서를 확인하고 후속 immutability fix의 root cause와 연결했습니다.

#### Thread 내 연결

- 이전 Thread commit: `9a7f29b5d78a`
- 다음 Thread commit: `d4f6ee5b6042`
- 이 commit이 다음 단계에 제공하는 것: `d4f6ee5b6042`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.11 `d4f6ee5b6042` — `feat(accel): 결정적 BVH 최근접 순회 구현`

- Importance: S
- Tags: CORE, ACCEL, HARD
- Thread order: 11/16

#### Source에서 확정된 역할

- Development Thread role: Implements near-first explicit-stack traversal and pruning.

#### S-level architecture와 invariant 복원

- **직전 관련 상태:** Scene-owned ready BVH가 있어도 node traversal, pruning, leaf dispatch, unbounded merge가 없으면 mode가 의미 있는 acceleration을 수행하지 않습니다.
- **핵심 구현 결정:** `Scene::intersect`가 Linear mode이거나 ready가 아니면 기존 전체 선형 path로 fallback합니다. ready BVH에서는 explicit stack으로 root부터 순회하고 node AABB entry가 현재 closest보다 크면 prune합니다. leaf는 indexed primitive를 실제 intersect하고 공통 `(t,index)` rule로 winner를 갱신합니다. 두 child가 hit하면 entry가 먼 child를 먼저 push하고 가까운 child를 나중에 push해 stack에서 near-first로 pop되게 하며, entry tie는 node index로 결정합니다. 마지막에 unbounded indices도 같은 candidate rule로 검사합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - src/scene.cpp — mode-aware `Scene::intersect`, explicit-stack BVH traversal, unbounded pass
  - include/ray/accel.hpp — nodes/primitive indices
- **caller → callee / data flow:** query → linear/not-ready fallback OR root box → explicit stack → node box/prune → leaves primitive dispatch → bounded winner → unbounded dispatch → shared candidate result
- **ownership·state transition:** stack은 query-local이며 Scene/BVH를 변경하지 않습니다. `closest`와 original winner index가 pruning과 semantic selection의 authoritative state입니다. stats sink가 있으면 AABB/primitive work를 실제 dispatch 시점에 셉니다.
- **failure/edge branch:** far child를 잘못된 순서로 push하거나 equal-entry tie를 비결정적으로 두어도 image winner는 candidate rule로 보호되지만 work sequence가 흔들릴 수 있습니다. unbounded pass를 생략하면 Plane hit가 사라집니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** ready BVH에서 near-first pruning을 수행하면서 선형 equal-`t` winner와 unbounded geometry를 보존합니다. stale/invalid state에서는 current geometry의 선형 결과를 반환합니다.
- **이 SHA가 보장하지 않는 것:** algorithm이 source geometry와 동기화돼 있다는 가정은 public mutation 때문에 아직 완전하지 않으며 `ef5320a83c27`에서 닫힙니다.
- **직접 확인/후속 evidence:** 후속 differential tests가 hit record 전체와 pixels를 비교하고 primitive work reduction을 확인하는 경로와 연결했습니다.

#### Thread 내 연결

- 이전 Thread commit: `f7e969537c10`
- 다음 Thread commit: `41c9a59f27a6`
- 이 commit이 다음 단계에 제공하는 것: `41c9a59f27a6`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.12 `41c9a59f27a6` — `test(accel): 선형 탐색과 BVH 결과 동치 검증`

- Importance: A
- Tags: TEST, ACCEL, DETERMINISM
- Thread order: 12/16

#### Source에서 확정된 역할

- Development Thread role: Proves linear/BVH hit and pixel equivalence while checking work reduction.

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** BVH traversal이 compile되고 빨라 보여도 hit boolean만 같다고 material, oriented normal, source shape identity, final bytes가 같다는 뜻은 아닙니다.
- **핵심 구현 결정:** `tests/accel_tests.cpp`가 empty/single/unbounded Plane/arbitrary-axis Cylinder/exact overlapping sphere cases에서 Linear과 Bvh의 hit boolean, `t`, point, normal, material, shape pointer를 비교합니다. dense scene은 전체 pixel vector와 checksum을 exact 비교하고, BVH primitive tests가 linear의 1/4 미만인지 검사합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - tests/accel_tests.cpp — differential hit and render tests
  - src/scene.cpp — both intersection modes
  - src/renderer.cpp — full image path
- **caller → callee / data flow:** 동일 Scene/ray 또는 settings → Linear result/stats → Bvh result/stats → full-record/pixel/checksum/work assertions
- **ownership·state transition:** 동일 source Scene에서 두 derived execution mode만 바뀝니다. exact overlapping sphere case는 original index tie rule을 직접 노립니다.
- **failure/edge branch:** 다른 hit pointer/material/normal이나 다른 pixel을 만드는 “빠른” BVH는 work gate 전에 실패합니다.

#### Test commit 분석 기준

- **대상 production invariant:** Linear/BVH는 traversal order와 무관하게 같은 semantic winner와 image bytes를 만듭니다.
- **test technique:** full-record differential assertions, exact buffer/checksum comparison, primitive-count ratio assertion
- **통과하는 production path:** `Scene::intersect` 두 mode와 full `renderScene`
- **이 test가 증명하는 것:** 대표 edge와 dense workload에서 결과 동치 및 primitive pruning을 증명합니다.
- **이 test가 증명하지 않는 것:** 전체 입력 공간, wall-clock portability, source geometry immutability를 아직 증명하지 않습니다.
- **실행 상태:** 테스트 구현과 production 호출 경로는 해당 SHA에서 확인했지만, 이 환경에서는 checkout/build가 불가능해 명령을 실행하지 않았습니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 선택된 geometry edge와 dense render에서 semantic equivalence와 유의미한 primitive work reduction을 함께 고정합니다.
- **이 SHA가 보장하지 않는 것:** 모든 가능한 scene과 platform time speedup을 증명하지 않습니다. stale geometry mutation은 별도 test가 필요합니다.
- **직접 확인/후속 evidence:** 테스트 코드 분류: deterministic differential regression + integration pixel equivalence + semantic-work gate. 실행은 하지 않았습니다.

#### Thread 내 연결

- 이전 Thread commit: `d4f6ee5b6042`
- 다음 Thread commit: `da3e8b43d09e`
- 이 commit이 다음 단계에 제공하는 것: `da3e8b43d09e`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.13 `da3e8b43d09e` — `perf(benchmark): 선형 탐색과 BVH 작업량 비교`

- Importance: A
- Tags: PERF, ACCEL, DETERMINISM
- Thread order: 13/16

#### Source에서 확정된 역할

- Development Thread role: Measures both modes under the same correctness constraints.

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** 기존 benchmark는 단일 execution path만 반복하므로 BVH가 들어온 뒤 같은 workload에서 결과와 work를 직접 나란히 비교하지 못합니다.
- **핵심 구현 결정:** dense Scene의 acceleration을 build하고 Linear/Bvh 각각 warm-up과 5회 측정을 수행합니다. 각 mode 내부 checksum/primitive/AABB counts 일치와 두 mode 간 checksum equality를 확인한 뒤 median elapsed와 work를 한 report에 냅니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - benchmarks/render_benchmark.cpp — two-mode measurement/report
- **caller → callee / data flow:** same built Scene → Linear warmup/samples → Bvh warmup/samples → internal consistency → cross-mode checksum equality → paired report
- **ownership·state transition:** workload와 output semantics는 공유되고 mode만 독립 변수입니다. elapsed는 mode별 median, counters는 deterministic work입니다.
- **failure/edge branch:** 다른 image를 만드는 acceleration은 speed comparison 전에 거부됩니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 동일 correctness constraints 아래 두 mode의 work/time을 비교하는 benchmark 구조를 제공합니다.
- **이 SHA가 보장하지 않는 것:** 아직 versioned schema나 hard primitive ratio gate가 없습니다.
- **직접 확인/후속 evidence:** 두 mode loop와 cross-mode checksum check를 source에서 확인했습니다. benchmark를 실행하지 않았습니다.

#### Thread 내 연결

- 이전 Thread commit: `41c9a59f27a6`
- 다음 Thread commit: `9b77225cf6b7`
- 이 commit이 다음 단계에 제공하는 것: `9b77225cf6b7`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.14 `9b77225cf6b7` — `perf(benchmark): 측정 schema와 가속 기준 검증 고정`

- Importance: A
- Tags: PERF, ACCEL, DETERMINISM
- Thread order: 14/16

#### Source에서 확정된 역할

- Development Thread role: Fixes a versioned benchmark schema and enforces a primitive-test reduction threshold.

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** 사람이 읽는 benchmark 출력만 있으면 field 의미와 workload가 drift할 수 있고, BVH가 거의 pruning하지 않아도 checksum만 같으면 성공할 수 있습니다.
- **핵심 구현 결정:** report에 `schemaVersion: 1`과 고정 configuration을 넣고 reference JSON을 추가합니다. per-run consistency를 유지한 채 `bvhPrimitiveTests * 4 < linearPrimitiveTests`를 강제하고 primitive ratio와 elapsed speedup을 별도 field로 냅니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - benchmarks/render_benchmark.cpp — versioned schema and gate
  - benchmarks/reference.json — fixed reference shape/configuration
- **caller → callee / data flow:** correctness-consistent samples → schema/config report → primitive ratio gate → ratios/speedup output
- **ownership·state transition:** schema와 workload metadata가 machine-comparable contract가 됩니다. gate는 deterministic integer work에 걸리고 elapsed speedup은 보고만 합니다.
- **failure/edge branch:** image가 같지만 culling이 부족한 regression은 primitive ratio gate에서 실패합니다. 환경이 느려 wall-clock speedup이 작아도 deterministic gate와 구분됩니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** benchmark contract drift와 심각한 pruning regression을 자동으로 감지합니다.
- **이 SHA가 보장하지 않는 것:** wall-clock 성능을 모든 머신에서 보장하지 않으며 reference 수치는 환경 결과로 재생성될 수 있습니다.
- **직접 확인/후속 evidence:** schema version, configuration fields와 4× inequality를 확인했습니다. 실제 reference run은 수행하지 않았습니다.

#### Thread 내 연결

- 이전 Thread commit: `da3e8b43d09e`
- 다음 Thread commit: `ef5320a83c27`
- 이 commit이 다음 단계에 제공하는 것: `ef5320a83c27`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.15 `ef5320a83c27` — `fix(accel): 가속 구조의 도형 불변식 보호`

- Importance: S
- Tags: ARCH, ACCEL, SCENE
- Thread order: 15/16

#### Source에서 확정된 역할

- Development Thread role: Prevents callers from mutating geometry behind a ready BVH.

#### S-level architecture와 invariant 복원

- **직전 관련 상태:** 초기 lifecycle은 `addShape`를 통한 shape-set 변경은 invalidated했지만, public shape storage나 public Sphere/Plane/Cylinder geometry field를 caller가 직접 바꾸면 ready BVH bounds가 stale해질 수 있었습니다. algorithm 자체가 맞아도 source와 cache가 달라지는 correctness hole입니다.
- **핵심 구현 결정:** built-in geometry fields와 Scene shape storage를 private `*_` 상태로 바꾸고 const getter만 노출합니다. Scene은 shape를 정확히 한 번 소유하며 `shapeCount`와 `const Shape& shapeAt` 같은 read-only 접근만 제공합니다. 외부 code가 geometry를 재배치하거나 bounds-affecting field를 대입할 수 없게 compile-time API를 닫습니다.

#### Failure → Fix 연결

- **기존 가정:** `addShape` invalidation만 있으면 ready BVH가 항상 current geometry를 표현합니다.
- **실제 failure 또는 위험:** public geometry/storage mutation은 `addShape`를 거치지 않아 ready cache가 stale해집니다.
- **root cause:** derived cache source의 mutation 권한이 acceleration owner 밖에 노출돼 있었습니다.
- **수정된 decision/invariant:** Scene 단일 소유와 built-in geometry const-only API로 mutation channel을 제거합니다.
- **regression 연결:** `13f153e23920`이 compile-time 비공개성과 build→invalidate→fallback→rebuild를 함께 검증합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - include/ray/geometry.hpp — private geometry fields/const getters
  - src/geometry.cpp — getter-backed implementations
  - include/ray/scene.hpp — private shape storage and read-only access
  - src/scene.cpp — ownership/access adaptation
- **caller → callee / data flow:** validated geometry construction → Scene ownership transfer → immutable built-in geometry read → acceleration build; 이후 변경은 Scene mutation API를 통해서만 일어나 invalidation 가능
- **ownership·state transition:** authoritative source geometry는 Scene-owned shape object이고 BVH는 그 immutable snapshot의 derived cache입니다. caller는 non-owning const view만 받습니다.
- **failure/edge branch:** 수정 전에는 ready flag가 true인 채 geometry center/radius/axis가 바뀌어 old box가 new shape를 cull할 수 있었습니다. 단순 rebuild 빈도 증가가 아니라 mutation channel 차단이 root cause 수정입니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 지원 built-in geometry와 shape ordering이 acceleration lifecycle 뒤에서 변하지 않습니다. Scene mutation API가 cache invalidation의 단일 경계가 됩니다.
- **이 SHA가 보장하지 않는 것:** 새로운 mutable custom Shape type이 내부적으로 geometry를 바꾸는 경우까지 일반적으로 막는 type system은 아닙니다.
- **직접 확인/후속 evidence:** `13f153e23920`의 compile-time accessibility checks와 runtime state transition test로 연결했습니다.

#### Thread 내 연결

- 이전 Thread commit: `9b77225cf6b7`
- 다음 Thread commit: `13f153e23920`
- 이 commit이 다음 단계에 제공하는 것: `13f153e23920`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.16 `13f153e23920` — `test(accel): 장면 변경과 가속 상태 불변식 검증`

- Importance: A
- Tags: TEST, ACCEL, SCENE
- Thread order: 16/16

#### Source에서 확정된 역할

- Development Thread role: Verifies immutability, invalidation, linear fallback, and rebuild as one state transition.

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** immutability fix가 선언 변경만으로 끝나면 실제 invalidation/fallback/rebuild 전이가 깨졌는지 알기 어렵고, public field가 실수로 다시 노출돼도 runtime test만으로는 잡지 못할 수 있습니다.
- **핵심 구현 결정:** `tests/accel_tests.cpp`에 public `shapes` 접근 불가, `shapeAt` 결과의 const성, geometry getter 비대입 가능성을 compile-time trait/assertion으로 고정합니다. runtime에서는 acceleration build 후 shape 추가가 ready를 끄는지, Bvh 요청이 stale tree를 쓰지 않고 current linear geometry로 fallback하는지, rebuild 뒤 같은 hit를 내는지 연속으로 확인합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - tests/accel_tests.cpp — immutability compile-time checks and acceleration lifecycle regression
  - src/scene.cpp — `addShape`, ready flag, fallback, rebuild
- **caller → callee / data flow:** Scene build → acceleration ready → shape addition → ready false → Bvh-mode query/linear fallback sees new shape → rebuild → ready true → same semantic hit
- **ownership·state transition:** source set과 derived state의 다섯 단계가 하나의 test 안에서 observable합니다. compile-time 부분은 mutation API가 아예 형성되지 않음을 검사합니다.
- **failure/edge branch:** stale BVH를 그대로 사용하면 new/changed shape hit가 누락되고, fallback이 old tree를 참조하면 pre/post rebuild 결과가 달라집니다.

#### Test commit 분석 기준

- **대상 production invariant:** ready BVH는 current immutable source를 설명하고, source-set mutation 뒤에는 사용되지 않습니다.
- **test technique:** type traits/static assertions + build/invalidate/fallback/rebuild runtime sequence
- **통과하는 production path:** Scene ownership/accessors, `addShape`, `buildAcceleration`, mode-aware `intersect`
- **이 test가 증명하는 것:** 공개 mutation channel 차단과 stale-cache fallback/recovery를 증명합니다.
- **이 test가 증명하지 않는 것:** concurrent mutation이나 user-defined mutable Shape 내부를 증명하지 않습니다.
- **실행 상태:** 테스트 구현과 production 호출 경로는 해당 SHA에서 확인했지만, 이 환경에서는 checkout/build가 불가능해 명령을 실행하지 않았습니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 지원 API에서 geometry immutability, mutation invalidation, safe fallback, rebuild recovery를 하나의 lifecycle invariant로 고정합니다.
- **이 SHA가 보장하지 않는 것:** arbitrary custom shape의 내부 mutable state와 concurrent Scene mutation은 범위 밖입니다.
- **직접 확인/후속 evidence:** 테스트 성격: compile-time API regression + deterministic state-transition regression. 실행은 하지 않았습니다.

#### Thread 내 연결

- 이전 Thread commit: `ef5320a83c27`
- 다음 Thread commit: 이 Thread의 종료점
- 이 commit이 Thread 종료에 제공하는 것: Thread-level invariant ledger와 최종 실행 흐름에서 이 SHA의 결과를 최종 상태에 반영했습니다.

## 6. Invariant ledger

| Invariant | 최초 도입/기준 | 강화 또는 수정 | 부족함/위험 노출 | 고정한 test/evidence | 실제 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| 비교 가능한 semantic work | f4dcb50939e2 | f5a2c4ade16d | 시간만으로 correctness/work를 판단할 위험 | 4fb2345c7d35/f5a2c4ade16d | actual dispatch counters, warm-up, five-run median |
| 보수적 ray-box/shape bounds | 7b19f2ad78e3 | b782e22450d8 | parallel/contact 비교와 cylinder rounding false negative | 419d52d687fc | closed slab interval, nullopt plane, outward nextafter |
| 결정적 BVH build | bb65e8092632 | bb65e8092632 | centroid tie에서 unstable order | 41c9a59f27a6 | largest extent axis, centroid+shapeIndex stable ordering, leaf≤4 |
| 선형과 동일한 semantic winner | 41a1d6bbe5ef | 9a7f29b5d78a/d4f6ee5b6042 | tree traversal order가 equal-`t` winner 변경 | 41c9a59f27a6 | smaller t 또는 equal t/larger original index |
| BVH는 Scene source의 derived state | f7e969537c10 | ef5320a83c27 | public mutation 뒤 ready cache stale | 13f153e23920 | Scene single ownership, const geometry, invalidate/fallback/rebuild |
| 동일 결과와 충분한 work reduction | 41c9a59f27a6/da3e8b43d09e | 9b77225cf6b7 | 다른 image 또는 미미한 pruning을 성능 성공으로 오인 | versioned benchmark gate | checksum equality + `bvh*4 < linear` |

### Ledger 보완 기록

- 각 invariant는 위 표의 SHA에서 observable behavior 또는 state로 처음 나타났습니다.
- 후속 commit이 같은 용어를 사용하더라도 그 보장을 과거 SHA에 소급하지 않았습니다.
- test/evidence 열은 production path와 assertion 또는 deterministic work gate를 함께 가리킵니다.
- 실행하지 않은 test는 source-level evidence로만 기록했습니다.

## 7. Failure → Fix → Test 연결

| Failure 또는 위험 | Decision/Fix | Test 또는 evidence | 실제 failure path와 assertion |
| --- | --- | --- | --- |
| AABB contact/parallel 처리 오류 | closed slab interval과 zero-direction branch | 419d52d687fc | boundary hit/parallel miss/entry assertions |
| cylinder bounds가 실제 geometry를 자름 | axis projection + outward expansion | 419d52d687fc | 대표 surface point containment |
| BVH reorder가 exact tie winner 변경 | original shape index 포함 candidate rule | 41c9a59f27a6 | overlapping shape full-record differential |
| unbounded Plane가 BVH에서 누락 | bounded/unbounded partition과 final linear pass | 41c9a59f27a6 | Plane case와 full pixel equivalence |
| shape mutation 뒤 stale ready BVH | private immutable source + mutation invalidation/fallback | 13f153e23920 | compile-time API checks + build→add→fallback→rebuild |
| checksum은 같지만 culling 회귀 | versioned primitive-count ratio gate | 9b77225cf6b7 benchmark | `bvhPrimitiveTests*4 < linearPrimitiveTests` |

### 연결 검토

- feature commit도 어떤 잘못된 state 또는 semantic drift를 막는지 production path에 연결했습니다.
- fix commit은 기존 가정 → 실제 위험 → root cause → corrected decision → regression 순서로 기록했습니다.
- test가 broad integration인지 deterministic boundary/differential/failure-injection regression인지 commit 기록에서 구분했습니다.
- assertion이 증명하지 않는 범위와 실행하지 못한 항목을 별도로 남겼습니다.

## 8. Ownership / state / responsibility 변화

최종 상태에서 `Scene`이 shape를 정확히 한 번 소유하고 built-in geometry를 const-only로
노출합니다. `Bvh` node/index 배열과 unbounded index list는 source shape set에서 파생된
Scene-owned cache입니다. BVH leaf references는 shape를 소유하지 않으므로 Scene lifetime에
종속됩니다. `addShape`는 source mutation과 cache invalidation의 단일 경계이고,
`buildAcceleration`은 current source를 partition/build한 뒤 ready를 commit합니다.
ready가 false인 Bvh-mode query는 stale cache를 읽지 않고 current source의 linear path로
fallback합니다. query-local stack, closest distance, winner index는 traversal 중에만 변합니다.

### 학습자 최종 기록

- **source state와 derived state:** 최종 상태에서 `Scene`이 shape를 정확히 한 번 소유하고 built-in geometry를 const-only로 노출합니다. `Bvh` node/index 배열과 unbounded index list는 source shape set에서 파생된 Scene-owned cache입니다. BVH leaf references는 shape를 소유하지 않으므로 Scene lifetime에 종속됩니다. `addShape`는 source mutation과 cache invalidation의 단일 경계이고, `buildAcceleration`은 current source를 partition/build한 뒤 ready를 commit합니다. ready가 false인 Bvh-mode query는 stale cache를 읽지 않고 current source의 linear path로 fallback합니다. query-local stack, closest distance, winner index는 traversal 중에만 변합니다.
- **mutation/transition boundary:** commit별 `ownership·state transition`과 위 invariant ledger에 표시했습니다.
- **failure 시 복구 상태:** Failure → Fix → Test 표와 각 fix/test section에 정상·오류 상태를 구분했습니다.

## 9. Thread 최종 상태

BVH는 선형 renderer를 대체하는 별도 의미가 아니라 같은 candidate rule을 더 적은 primitive
dispatch로 실행하는 derived structure입니다. conservative bounds와 unbounded partition이
hit 누락을 막고, deterministic build/near-first stack이 reproducible work order를 제공하며,
original index tie-break가 traversal order로부터 semantic winner를 분리합니다. ownership fix는
source geometry를 cache 뒤에서 바꾸는 API를 제거했고, lifecycle test는 invalidation, fallback,
rebuild를 고정합니다. correctness equality가 먼저 통과한 뒤에만 versioned benchmark가 work
reduction과 환경 의존적 elapsed speedup을 보고합니다.

### 직접 작성한 결론

- **Thread 시작과 종료의 behavior 차이:** BVH는 선형 renderer를 대체하는 별도 의미가 아니라 같은 candidate rule을 더 적은 primitive dispatch로 실행하는 derived structure입니다. conservative bounds와 unbounded partition이 hit 누락을 막고, deterministic build/near-first stack이 reproducible work order를 제공하며, original index tie-break가 traversal order로부터 semantic winner를 분리합니다. ownership fix는 source geometry를 cache 뒤에서 바꾸는 API를 제거했고, lifecycle test는 invalidation, fallback, rebuild를 고정합니다. correctness equality가 먼저 통과한 뒤에만 versioned benchmark가 work reduction과 환경 의존적 elapsed speedup을 보고합니다.
- **아직 다른 Thread 또는 외부 검증이 보완해야 하는 항목:** concurrent Scene mutation과 arbitrary user-defined mutable Shape 내부 상태는 지원 contract 밖입니다. elapsed speedup은 실행 환경에서 별도 측정해야 합니다.

## 10. 최종 architecture 또는 execution flow 정리

### Source가 확정한 흐름 anchor

```text
work baseline → `Aabb`/shape bounds → deterministic `Bvh` build → Scene-owned derived state → mode-aware `Scene::intersect` → explicit-stack traversal → differential tests/benchmark → geometry immutability fix
```

### 실제 코드로 완성한 흐름

1. 계측된 직렬 renderer가 ray 종류, primitive dispatch와 elapsed baseline을 수집합니다.
2. 각 finite shape는 conservative optional AABB를 제공하고 Plane은 unbounded로 남습니다.
3. Scene build가 bounded refs와 unbounded indices를 분리합니다.
4. BVH builder가 longest centroid extent를 고르고 original index tie-break로 median split합니다.
5. query는 Linear/not-ready이면 full linear path, ready Bvh이면 explicit stack path를 고릅니다.
6. node AABB entry와 current closest로 prune하고 near child를 먼저 처리합니다.
7. leaf와 unbounded candidate 모두 `(t, original index)` 규칙으로 authoritative record를 갱신합니다.
8. differential tests가 full record, pixels, checksum을 비교하고 work reduction을 검사합니다.
9. source mutation은 ready를 끄며 fallback 뒤 explicit rebuild로 cache를 다시 commit합니다.
10. benchmark는 correctness-consistent samples에서 schema와 primitive ratio/median time을 냅니다.

### 학습자의 최종 설명

BVH는 선형 renderer를 대체하는 별도 의미가 아니라 같은 candidate rule을 더 적은 primitive
dispatch로 실행하는 derived structure입니다. conservative bounds와 unbounded partition이
hit 누락을 막고, deterministic build/near-first stack이 reproducible work order를 제공하며,
original index tie-break가 traversal order로부터 semantic winner를 분리합니다. ownership fix는
source geometry를 cache 뒤에서 바꾸는 API를 제거했고, lifecycle test는 invalidation, fallback,
rebuild를 고정합니다. correctness equality가 먼저 통과한 뒤에만 versioned benchmark가 work
reduction과 환경 의존적 elapsed speedup을 보고합니다.

남은 경계는 다음과 같습니다. concurrent Scene mutation과 arbitrary user-defined mutable Shape 내부 상태는 지원 contract 밖입니다. elapsed speedup은 실행 환경에서 별도 측정해야 합니다.

## 11. 학습 완료 자가 점검

- [x] 모든 commit을 source 순서대로 확인했습니다.
- [x] 각 commit의 SHA, subject, importance, tags를 그대로 유지했습니다.
- [x] 모든 핵심 설명에 해당 SHA의 file path와 symbol 근거를 기록했습니다.
- [x] final HEAD의 구조를 과거 SHA에 소급하지 않았습니다.
- [x] S/A/B importance에 맞춰 architecture, subsystem, localized role의 깊이를 구분했습니다.
- [x] source에서 확정하지 않은 실행 결과나 runtime 수치를 사실로 채우지 않았습니다.
- [x] failure와 fix/test를 실제 production path로 연결했습니다.
- [x] test가 증명하는 것과 증명하지 않는 것을 구분했습니다.
- [x] invariant ledger의 각 변화를 commit evidence와 연결했습니다.
- [ ] 해당 SHA checkout에서 테스트·benchmark·sanitizer를 직접 실행했습니다. 환경 제한 때문에 미실행 상태입니다.
- [x] 별도의 프로젝트 재학습 없이 이 Thread의 설계 → 구현 → 위험 → 수정 → 검증 발전을 설명할 수 있는 기록을 남겼습니다.
