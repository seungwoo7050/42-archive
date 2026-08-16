# Project Importance Profile

Project: `ray-scene-tracer` (`cpp/miniRT`)  
Domain: C++17 CPU ray tracing, geometric intersection, correctness-preserving acceleration, deterministic parallel rendering, and safe image publication.  
Primary Purpose: Parse a miniRT-style `.rt` scene and deterministically render a P3 ASCII PPM image containing spheres, planes, finite arbitrary-axis cylinders, ambient and point lighting, hard shadows, diffuse materials, and depth-limited perfect-metal reflections. The finished project retains a linear reference path, adds BVH acceleration for bounded shapes, renders through 16×16 worker-owned tiles, and exposes strict CLI, test, benchmark, and failure contracts.  
Resolved Commit Scope: All 84 commits in the independent, linear history of `cpp/miniRT`, from root `8363adf068e0` through tip `04086a2ae050`, are in scope. No unrelated inherited history or merge commits are present. The scope contains 82 implementation, test, build, CI, or benchmark commits and two documentation-only commits. Twelve-character SHA abbreviations are unique across the complete set.

## Core Technical Areas

- **Numerical and ray foundations:** `Vec3`, color operations, ray parameterization, normalization, dot/cross products, finite-value handling, and tolerance-sensitive geometry.
- **Primitive geometry:** a shared hit contract plus sphere, plane, and finite arbitrary-axis cylinder intersection, including cylinder side/cap selection and conservative bounds.
- **Scene state and ownership:** camera, lights, shapes, closest-hit selection, equal-`t` tie behavior, exclusive shape ownership, and the lifecycle of derived acceleration data.
- **Scene parsing:** source-located errors, line tokenization, directive dispatch, duplicate and arity checks, range validation, required directives, file/text loaders, and optional material syntax.
- **Rendering and materials:** camera-frame projection, center-sampled primary rays, ambient and Lambertian direct lighting, shadow visibility, recursive perfect-metal reflection, image quantization, and render statistics.
- **Acceleration:** AABB representation and slab tests, bounded/unbounded shape separation, deterministic median-split BVH construction, explicit-stack traversal, linear reference mode, and work-count benchmarking.
- **Deterministic concurrency:** fixed tiles, atomic work distribution, disjoint pixel ownership, per-worker statistics, thread-count policy, worker joining, exception propagation, and cross-mode byte equivalence.
- **Image and output safety:** checked image dimensions and storage, FNV-1a regression checksums, P3 serialization, stream failure detection, temporary-file cleanup, and replacement that preserves an existing destination on failure.
- **Operational verification:** CLI option contracts, CMake/CTest structure, component and integration regressions, sanitizers, cross-platform CI, deterministic benchmarks, and committed reference evidence.

## Core Architecture

- `.rt` input is parsed into a move-only `Scene` that owns camera state, lights, and polymorphic shapes. Successful parsing builds acceleration after all shape additions are complete.
- Every shape implements one intersection interface and produces a `HitRecord` containing the selected parameter, point, oriented normal, material value, and a non-owning pointer to the hit shape.
- `Scene::intersect` is the authoritative candidate-selection boundary. Linear and BVH modes use the same update rule: smaller `t` wins, and an exact equal `t` is resolved by the later original shape index.
- Bounded shapes are represented in a contiguous BVH; unbounded shapes such as planes remain in a separate linear index list. Both paths rejoin through the same shape-testing function.
- The renderer builds one immutable camera frame, divides the image into fixed tiles, and gives each worker exclusive write ownership of the pixels in the tiles it claims. Shading and tracing read the scene concurrently; statistics accumulate per worker and merge after joining.
- `traceRay` returns background on a miss, computes ambient/direct/shadow lighting for diffuse materials, and recursively follows one reflected ray for metal while consuming `maxDepth`.
- `Image` owns contiguous RGB bytes and validates that storage is exactly `width × height × 3`. Output first serializes to a checked stream, then publishes through a same-directory temporary file and final replacement.
- `raycore` is a reusable CMake library linked by the CLI, component tests, acceleration/material/render/output tests, and the benchmark executable.

## Critical Invariants

- Parsed scene directives must be syntactically valid, finite, in range, and geometrically non-degenerate; required singleton directives must be present and not duplicated.
- A hit result must have the same semantic winner in linear and BVH modes, including exact equal-distance cases, regardless of BVH build or traversal order.
- Every acceleration bound must conservatively contain its shape. Unbounded geometry must never be forced into an arbitrary finite box.
- A ready BVH must describe the current shape set and current built-in geometry. Shape mutation must invalidate derived acceleration, and BVH requests against invalidated state must fall back to current linear geometry.
- `Scene` owns each shape exactly once, and callers cannot mutate built-in geometry or reorder shape storage behind the acceleration lifecycle.
- A pixel byte is written by exactly one worker; thread count and tile completion order must not change pixels, checksums, or semantic work counts for a fixed mode and scene.
- All started worker threads are joined. Worker failures are surfaced on the caller thread rather than escaping a worker or yielding a partial successful image.
- Valid image storage is positive and exactly sized without multiplication or index overflow.
- A final PPM path changes only after complete successful serialization, flush, close, and replacement. Any earlier failure preserves the existing destination and attempts to remove the temporary file.
- Golden checksums and exact PPM bytes remain stable across repeat runs, acceleration modes, and tested worker counts unless an intentional rendering contract changes.

## Major Engineering Difficulties

- Deriving robust side, cap, normal, and nearest-hit behavior for a finite cylinder with an arbitrary axis.
- Maintaining numerical validity across normalization, quadratic intersection, near-zero directions, large finite values, and conservative cylinder bounds.
- Reordering primitive tests through a BVH without changing equal-distance selection, materials, normals, hit pointers, or final image bytes.
- Managing the BVH as derived state whose correctness depends on shape lifetime, geometry immutability, invalidation, rebuilding, and fallback behavior.
- Parallelizing image generation without overlapping writes or schedule-dependent floating-point accumulation while still producing deterministic statistics.
- Recovering safely from thread creation or worker-body failure and transferring the original failure to the caller after complete thread cleanup.
- Publishing output atomically enough to avoid destroying a previous file when validation, serialization, flush, close, or replacement fails.
- Designing performance evidence that rejects behaviorally different results, separates primitive from AABB work, fixes workload configuration, and reports repeatable median measurements.

## Practical Engineering Areas

- Source-located validation and strict public-boundary error reporting.
- Explicit ownership, move-only aggregates, read-only views, and derived-cache invalidation.
- Linear reference implementations and equivalence tests for optimized paths.
- Golden checksums, exact byte comparisons, deterministic work counters, and injected failure tests.
- Checked integer arithmetic and buffer-size validation.
- RAII cleanup for shapes, worker threads, and temporary output files.
- Structured benchmark configuration, work metrics, correctness gates, and environment-specific reference results.
- Reproducible CMake/CTest builds, sanitizer-enabled checks, and Ubuntu/macOS CI.
- CLI duplicate detection, range checking, option-order independence, and stable exit statuses.

## S-level Criteria

- Establishes a foundational contract or ownership boundary used by geometry, scene traversal, shading, acceleration, and tests.
- Implements the first complete image-generating or lighting mechanism central to the ray tracer's purpose.
- Implements the correctness-preserving BVH lifecycle or traversal that defines the project's primary algorithmic improvement.
- Establishes the deterministic parallel scheduling model, including exclusive pixel ownership and stable result aggregation.
- Restores a critical cross-subsystem invariant whose violation can make a ready acceleration structure inconsistent with its source geometry.

## A-level Criteria

- Solves a non-trivial geometric, numerical, failure-path, lifecycle, or performance problem with meaningful project-wide or subsystem-wide risk.
- Establishes an important parser, material, output, benchmark, or verification contract that materially increases correctness or reproducibility.
- Provides strong evidence that a core optimization preserves behavior, handles a dangerous edge case, or meets an explicit work-reduction criterion.
- Makes a significant interface, safety, or resource-management improvement without being indispensable to the entire architecture.

## Typical B-level Work

- Implements standard mathematical operations, individual primitives or directives, normal integration plumbing, contained feature syntax, CLI options, or localized optimizations inside an established design.
- Adds ordinary regression coverage, build organization, sanitizer configuration, or CI around already defined behavior.
- Supplies supporting representations or preparatory refactors for a larger mechanism whose decisive judgment appears in another commit.

## Typical C-level Work

- Documentation-only commits, narrowly mechanical test maintenance, or environment-specific evidence snapshots that do not change a reusable mechanism or invariant.
- Changes that are useful for maintenance or explanation but contribute little to understanding how the renderer works, stays correct, or manages risk.

## Project-specific Tags

The common tags from the governing rubric are reused. The branch-specific tags are:

RAY_PIPELINE — camera projection, ray tracing, shading, sampling, quantization, and image generation  
GEOMETRY — primitive intersection, normals, hit semantics, and shape bounds  
SCENE — scene aggregation, closest-hit selection, shape ownership, and derived-state lifecycle  
PARSER — `.rt` grammar, tokenization, semantic validation, diagnostics, and loading  
MATERIAL — diffuse/metal representation and reflection-depth behavior  
ACCEL — AABB and BVH construction, traversal, correctness, and performance  
DETERMINISM — exact result, checksum, byte, or work equivalence across runs and execution modes  
CONCURRENCY — tile scheduling, worker-local state, thread cleanup, and failure propagation  
OUTPUT — image representation, checksums, PPM serialization, and file publication  
CLI — command-line option, usage, and exit-status contracts  
BUILD — build graph, test registration, sanitizers, and CI


# Commit Classification

| Commit | Subject | Importance | Tags | Summary | Why |
| --- | --- | --- | --- | --- | --- |
| `8363adf068e0` | `docs(readme): 프로젝트 목표와 초기 개발 규약 정의` | C | - | Defines the project goal, scope, and early repository conventions in the README. | Documentation-only context does not establish executable behavior or a durable implementation boundary. |
| `4afc85202c6e` | `chore(project): CXX17 실행 골격과 직접 빌드 구성` | B | BUILD | Creates the C++17 executable skeleton, warning policy, direct Make build, and placeholder CLI. | The scaffold is necessary for later work but uses conventional build and argument-handling structure rather than project-defining judgment. |
| `85d1bc18037b` | `feat(math): 벡터 값과 산술 연산 구현` | B | RAY_PIPELINE | Introduces `Vec3`/`Color` storage and basic component-wise arithmetic. | This is foundational reusable work, but the representation and operations are standard support rather than a distinctive architectural decision. |
| `ee555641b641` | `feat(math): 벡터 길이와 기하 연산 구현` | B | RAY_PIPELINE, GEOMETRY | Adds vector magnitude, normalization, dot product, and cross product. | These operations enable every geometric subsystem, yet their implementation is normal mathematical infrastructure within the established value type. |
| `1a6cd29938e1` | `feat(math): 벡터 비교와 색상 범위 연산 추가` | B | RAY_PIPELINE, OUTPUT | Adds exact vector comparison and color-range/component operations. | The change supports testing and color handling without changing the renderer's responsibility boundaries or core algorithms. |
| `bcf3952838ae` | `feat(ray): 광선 위치 계산 모델 추가` | B | RAY_PIPELINE | Defines a ray as origin plus direction and provides parameterized position evaluation. | The model is essential vocabulary for the project but is a compact, conventional abstraction with limited project-specific risk. |
| `4fa4d2401ee6` | `feat(material): diffuse 재질 값 모델 추가` | B | MATERIAL | Introduces the diffuse material value carrying surface albedo. | This is normal domain modeling that prepares shading but does not yet define material behavior or rendering architecture. |
| `f3f1d04cc836` | `feat(geometry): hit와 도형 교차 계약 정의` | S | ARCH, GEOMETRY, SCENE | Defines the polymorphic `Shape` intersection contract, `HitRecord`, material transfer, and face-normal orientation. | Every primitive, scene query, shading path, acceleration structure, and regression test depends on this contract. Omitting it would leave a central gap in how geometric results become renderer-visible state. |
| `dfb5b010ed54` | `feat(geometry): 구 교차 계산 구현` | B | GEOMETRY | Implements quadratic sphere intersection against the shared hit contract. | It is required core functionality, but it is a standard primitive implementation inside the architecture established by the preceding contract. |
| `d89812d9173a` | `feat(geometry): 평면 교차 계산 구현` | B | GEOMETRY | Implements plane intersection with parallel rejection and oriented normals. | The work is competent and necessary but follows the existing shape protocol without establishing a new system-level mechanism. |
| `7265686c18ee` | `feat(geometry): 유한 원기둥 옆면 교차 구현` | A | GEOMETRY, HARD | Implements the finite arbitrary-axis cylinder side intersection and axial clipping. | The decomposition into axial and perpendicular components is one of the project's genuinely difficult geometric calculations and carries substantial correctness risk, though it remains one primitive implementation. |
| `197dbf694170` | `feat(geometry): 원기둥 cap과 최근접 hit 선택 완성` | A | GEOMETRY, HARD | Adds both cylinder caps and selects the nearest valid side-or-cap hit. | This completes the hardest primitive while handling seams, opposing cap normals, and closest-candidate selection; it is significant geometry work but not a cross-project architecture change. |
| `2a01cb406d9d` | `feat(scene): 카메라·조명과 장면 aggregate 구성` | A | ARCH, SCENE | Introduces the scene aggregate for resolution, ambient state, camera, lights, and shapes. | This creates the central state boundary consumed by parsing and rendering. Later ownership and acceleration changes refine it, but the aggregate is the first meaningful system composition point. |
| `41a1d6bbe5ef` | `feat(scene): 선형 최근접 교차 탐색 구현` | A | CORE, SCENE | Implements linear nearest-hit search over scene shapes. | The linear path defines the canonical closest-hit and equal-distance behavior that later BVH traversal must preserve, giving this simple loop lasting semantic importance. |
| `3545eb1e82df` | `feat(parser): 소스 위치 오류와 line tokenization 구성` | B | PARSER, PRACTICAL | Adds source-located parse errors, comment handling, and line tokenization. | The input and diagnostics boundary is useful and durable, but line tokenization and source locations are normal parser infrastructure relative to the later dispatch and loader milestones. |
| `7bba0af26d17` | `feat(parser): 유한 수와 범위 값 해석 구현` | B | PARSER, EDGE | Adds finite-number parsing plus positive and bounded range validation. | The validation is important input hygiene but is expected implementation inside the already established parser structure. |
| `d4a24901051a` | `feat(parser): 벡터와 색상 token 해석 구현` | B | PARSER | Parses comma-separated vectors and normalized RGB colors. | This is normal syntax support that reuses the numeric validators without changing parser architecture. |
| `6bff18bf0bac` | `feat(parser): 줄 단위 지시어 dispatch 기반 구성` | A | ARCH, PARSER | Builds line-oriented directive dispatch, arity checks, duplicate rejection, and unknown-directive errors. | The dispatcher becomes the extensible grammar boundary for the whole scene format, so later directives are applications of this decision rather than separate parser architectures. |
| `9aef46929554` | `feat(parser): 해상도와 환경광 지시어 지원` | B | PARSER | Implements resolution and ambient-light directives. | This is straightforward grammar and validation work within the established dispatch model. |
| `5e21e6900fd9` | `feat(parser): 카메라와 광원 지시어 지원` | B | PARSER | Implements camera and point-light directives. | The commit connects parsed values to scene state but does not introduce a new parsing or rendering mechanism. |
| `c17a4b5737d2` | `feat(parser): 구와 평면 지시어 지원` | B | PARSER, GEOMETRY | Implements sphere and plane directives and creates corresponding shapes. | It is normal integration of existing geometry with the parser contract. |
| `d0cc38dd5762` | `feat(parser): 원기둥 지시어 지원` | B | PARSER, GEOMETRY | Implements the finite-cylinder directive and diameter-to-radius conversion. | The work applies established validators and shape construction to the remaining primitive. |
| `1e1fda47d913` | `feat(parser): 필수 지시어 검증과 입력 loader 완성` | A | PARSER, INTEGRATION | Requires the mandatory scene directives and completes text/file loading with valid and invalid fixtures. | This turns partial directive parsing into a reliable scene-loading boundary used by the CLI, tests, and later acceleration build, making it a significant integration milestone. |
| `e6da5f987b97` | `feat(camera): 화면 좌표를 카메라 광선으로 변환` | A | CORE, RAY_PIPELINE | Builds a stable camera frame and converts pixel coordinates into normalized primary rays. | The projection mechanism is central to image formation and handles degenerate camera orientation, but it remains one component of the full rendering pipeline. |
| `e8b7dc42a52c` | `feat(render): 직접광과 그림자 추적 구현` | S | CORE, RAY_PIPELINE, RISK | Implements ambient and diffuse direct lighting, shadow-ray occlusion, and primary ray tracing. | This defines the renderer's principal visual semantics and the self-intersection/visibility rules used by every image. Without it, the project would not yet be a lit ray tracer. |
| `c742b2401e52` | `feat(renderer): 직렬 이미지 렌더링 구현` | S | ARCH, CORE, RAY_PIPELINE | Introduces `Image`, render settings, and the complete serial pixel-to-ray-to-RGB loop. | This is the first end-to-end image-generation mechanism and the execution structure later optimized by camera caching, BVH traversal, materials, and tile workers. |
| `1bc7cacd30aa` | `feat(output): PPM 직렬화와 이미지 체크섬 구현` | A | OUTPUT, DETERMINISM | Adds P3 PPM serialization and a deterministic image checksum. | The commit establishes the external artifact and the compact correctness fingerprint subsequently used by tests and benchmarks, giving it significance beyond routine file output. |
| `b983f0ea2744` | `feat(cli): 장면 렌더링 명령 연결` | B | CLI, INTEGRATION | Connects scene loading, rendering, PPM writing, checksum output, and exit-status handling. | This is necessary product integration, but it composes already established subsystem APIs without changing their semantics. |
| `d05a6ab48bb1` | `test(render): 장면 렌더링 smoke 검사 추가` | B | TEST, INTEGRATION | Adds an end-to-end smoke script for parser failure, PPM headers, and deterministic output. | The test provides useful integration confidence, but it covers expected behavior rather than a difficult invariant or discovered regression. |
| `2cf2f17980bb` | `build(cmake): 코어 라이브러리와 검증 타깃 구성` | B | BUILD, TEST | Introduces CMake, a reusable `raycore` library, CTest integration, and Make wrappers. | This materially improves reproducibility and modularity, but it is conventional build-system engineering rather than a core rendering decision. |
| `0e8c3b51e3b7` | `test(core): 수학·기하·파서·출력 회귀 기준 추가` | B | TEST, DETERMINISM | Adds component regression coverage for math, primitives, parser errors, PPM encoding, and basic rendering. | The suite creates a useful broad baseline, but it mainly codifies expected component behavior rather than proving a difficult cross-subsystem invariant. |
| `f4dcb50939e2` | `perf(render): 광선과 교차 작업량 계측 추가` | A | PERF, RAY_PIPELINE | Threads optional ray, primitive, AABB, and timing statistics through rendering and intersection. | The instrumentation is carefully placed at semantic work boundaries and makes later acceleration claims measurable without altering normal behavior. |
| `4fb2345c7d35` | `perf(benchmark): 조밀 장면 기준 workload 추가` | B | PERF, ACCEL | Adds a deterministic dense 400-sphere benchmark workload. | This is important supporting evidence infrastructure, but it does not yet define a measurement protocol or alter runtime behavior. |
| `f5a2c4ade16d` | `perf(benchmark): 반복 측정과 결정성 보고 구성` | A | PERF, DETERMINISM | Adds warm-up, repeated median measurement, result-consistency checks, and structured benchmark output. | The commit turns a workload into a defensible performance experiment whose timing is rejected if image or work results differ. |
| `aa92a87c98a3` | `fix(math): 큰 유한 벡터를 안정적으로 정규화` | A | DEBUG, EDGE, RAY_PIPELINE | Replaces sum-of-squares magnitude with `std::hypot` for stable large-vector normalization. | This is a small but non-obvious numerical root-cause fix affecting cameras, normals, cylinder axes, and rays; it restores a broadly relied-on mathematical invariant. |
| `ff18d1cc3afc` | `test(math): 큰 유한 벡터 정규화 검증` | B | TEST, EDGE | Adds the large-finite-vector normalization regression. | The test precisely protects the preceding fix, but its significance remains localized to one numerical boundary. |
| `438ee0cb48f6` | `fix(parser): 임계값 이하 방향 벡터 거부` | B | PARSER, EDGE | Rejects camera and cylinder directions whose Euclidean length is at or below `kEpsilon`. | This is a sound validation correction, but it is a straightforward refinement within the established parser boundary. |
| `10e617f98b33` | `test(parser): 퇴화한 카메라와 원기둥 방향 검증` | B | TEST, PARSER | Adds regressions for near-zero camera directions and cylinder axes. | The tests cover meaningful edge cases but do not establish a new system invariant beyond the preceding validator. |
| `71096cd311d5` | `fix(image): 이미지 할당과 픽셀 인덱스 overflow 방지` | A | OUTPUT, RISK, EDGE | Checks image allocation multiplication and performs pixel indexing in `std::size_t`. | The commit closes signed-overflow and undersized-buffer risks at a public representation boundary, making it significant safety work despite its limited scope. |
| `3d2e6a5becb7` | `test(image): 잘못된 차원과 저장 크기 계산 검증` | B | TEST, OUTPUT | Verifies image storage size and rejection of zero or negative dimensions. | This is expected regression coverage for the checked constructor rather than an independent architectural decision. |
| `89c3c7269877` | `fix(output): 표준 FNV-1a 기준값 적용` | B | DEBUG, OUTPUT | Corrects the 64-bit FNV-1a offset basis. | The fix restores a standard checksum definition, but it is a narrow constant correction with limited effect on project architecture. |
| `eac2ecd13c33` | `test(output): PPM과 렌더링 체크섬 기준 고정` | A | TEST, DETERMINISM, OUTPUT | Pins both a hand-built image checksum and the complete basic-scene render checksum. | These dual goldens make checksum semantics and full-pipeline pixels explicit regression contracts, which later performance and concurrency changes rely on. |
| `93167ba2bd94` | `refactor(scene): 장면 도형의 단독 소유권 적용` | S | ARCH, SCENE, RISK | Moves shapes to `unique_ptr`, deletes scene copying, and makes scene ownership exclusive and movable. | This establishes the sole-owner lifetime model that later BVH indices and non-owning hit pointers depend on. Removing it would obscure who controls heterogeneous shape lifetime and derived acceleration state. |
| `54b6afe44070` | `perf(camera): 픽셀별 카메라 프레임 재계산 제거` | B | PERF, RAY_PIPELINE | Caches the camera frame once per image and adds an overload that reuses it per pixel. | The optimization is sound and useful, but it is a localized hot-loop improvement within an already complete renderer and lacks the project-defining impact of the later BVH and concurrency changes. |
| `d9af892971ff` | `test(camera): 재사용한 카메라 프레임의 동치 검증` | B | TEST, RAY_PIPELINE | Checks exact equivalence between rebuilt and cached camera-frame ray generation. | The test protects the optimization but is ordinary verification of a localized refactor. |
| `b993a587dac7` | `feat(accel): AABB 값과 결합 연산 구현` | B | ACCEL | Introduces AABB values, validation, centroids, and surrounding-box composition. | This is necessary acceleration scaffolding, but it is a straightforward supporting representation before intersection or BVH behavior exists. |
| `7b19f2ad78e3` | `feat(accel): ray-box slab 교차 구현` | A | ACCEL, HARD, EDGE | Implements ray-box slab intersection with parallel-axis handling and entry distance. | This is a correctness-critical acceleration primitive whose false negatives would change rendered results, and it requires non-trivial interval reasoning. |
| `a40452885176` | `feat(accel): 도형 경계 계약과 구·평면 bounds 추가` | A | ARCH, ACCEL, GEOMETRY | Adds the shape bounds contract, exact sphere boxes, and explicit unbounded planes. | The commit establishes how heterogeneous geometry enters or stays outside acceleration, a key responsibility boundary for the later mixed BVH/linear design. |
| `b782e22450d8` | `feat(accel): 원기둥의 보수적 bounds 계산 추가` | A | ACCEL, GEOMETRY, HARD | Computes conservative arbitrary-axis cylinder bounds and pads them outward. | A too-small box would silently remove real hits, so the numerical derivation and conservative policy are significant correctness work. |
| `419d52d687fc` | `test(accel): AABB와 도형 경계 계산 검증` | A | TEST, ACCEL, RISK | Tests slab edge cases and sphere, plane, and arbitrary-axis cylinder bounds. | The suite locks down the no-false-negative boundary that acceleration correctness depends on, especially the difficult cylinder calculation. |
| `e4292997eb1a` | `feat(accel): BVH node와 연속 저장소 구성` | B | ARCH, ACCEL | Defines compact BVH nodes and contiguous primitive-index storage. | The contiguous layout is a competent supporting choice, but the decisive acceleration behavior is established by the builder, Scene lifecycle, and traversal commits. |
| `bb65e8092632` | `feat(accel): 결정적 중앙 분할 BVH 구축 구현` | A | ACCEL, HARD, DETERMINISM | Builds a stable median-split BVH with bounded leaf size and deterministic tie ordering. | This is the main construction algorithm and establishes reproducible tree shape, but it does not yet alter scene queries until traversal is integrated. |
| `9a7f29b5d78a` | `feat(accel): 선형·BVH 탐색 모드 계약 연결` | A | ARCH, ACCEL, DETERMINISM | Introduces linear/BVH modes and makes closest-hit ties depend on original shape index. | The explicit reference mode and order-independent tie rule are essential semantic preparation for reordered traversal, though the BVH path is not yet active. |
| `f7e969537c10` | `feat(scene): 가속 구조 소유권과 rebuild 경계 구성` | S | ARCH, ACCEL, SCENE | Makes `Scene` own the BVH and unbounded index set, with explicit build, invalidation, and readiness state. | This establishes the critical lifecycle invariant that acceleration is derived from current owned geometry and must be rebuilt after mutation; it also defines how infinite planes remain correct. |
| `d4f6ee5b6042` | `feat(accel): 결정적 BVH 최근접 순회 구현` | S | CORE, ACCEL, HARD | Implements deterministic near-first BVH traversal with pruning, leaf testing, and a final unbounded pass. | This is the project-defining acceleration mechanism: it changes asymptotic work while preserving the linear path's hit semantics and mixed bounded/unbounded geometry. |
| `41c9a59f27a6` | `test(accel): 선형 탐색과 BVH 결과 동치 검증` | A | TEST, ACCEL, DETERMINISM | Compares linear and BVH hits, equal-distance ties, full pixels, checksums, and primitive-test reduction. | The tests provide unusually strong evidence that the core optimization preserves observable semantics and actually reduces work. |
| `da3e8b43d09e` | `perf(benchmark): 선형 탐색과 BVH 작업량 비교` | A | PERF, ACCEL, DETERMINISM | Measures linear and BVH modes under the same scene and rejects checksum divergence. | This makes the acceleration result externally comparable in both work and time, rather than relying on algorithmic claims alone. |
| `85583e1e9beb` | `feat(material): metal 모델과 깊이 제한 반사 구현` | A | CORE, MATERIAL, RAY_PIPELINE | Adds diffuse/metal material types and depth-limited perfect reflection with secondary-ray accounting. | The commit changes the tracing model from terminal direct lighting to deterministic recursion, a significant capability and control-flow extension. |
| `a90130a5b030` | `feat(parser): 선택적 도형 재질 문법 추가` | B | PARSER, MATERIAL | Adds optional `diffuse`/`metal` tokens to all shape directives. | This is normal syntax integration for an already defined material model, with backward-compatible diffuse defaults. |
| `9a352ffe8233` | `test(material): 재질 파싱과 반사 깊이 검증` | B | TEST, MATERIAL, DETERMINISM | Tests material parsing, unknown types, reflection depth, secondary rays, and the unchanged diffuse golden. | The suite usefully covers parsing, depth, and backward compatibility, but it verifies a contained feature rather than a project-wide invariant. |
| `498266fc0abf` | `refactor(render): 직렬 렌더링을 고정 tile 순회로 전환` | B | REFACTOR, CONCURRENCY, DETERMINISM | Rewrites the serial row loop as fixed 16×16 tile traversal with coordinate-based pixel writes. | This is a deliberate preparatory refactor for concurrency, but behavior remains serial and the core scheduling mechanism arrives in the next commit. |
| `849f878ca0b0` | `feat(render): 원자적 tile 분배와 작업자 통계 병합 구현` | S | ARCH, CONCURRENCY, DETERMINISM | Distributes tiles through an atomic index, gives workers disjoint pixels and local stats, and joins all threads. | This is the defining parallel-rendering architecture. It preserves deterministic bytes without shared floating-point accumulation while adding explicit thread-lifecycle and aggregation boundaries. |
| `18459bfda416` | `feat(renderer): 작업자 수 설정과 자동 선택 추가` | B | CONCURRENCY, PERF | Adds explicit worker-count configuration and automatic hardware-based selection. | This exposes a useful policy control within the established scheduler but does not change its ownership or determinism model. |
| `3619550fa354` | `test(render): 작업자 수에 따른 함수 결과 동치 검증` | A | TEST, CONCURRENCY, DETERMINISM | Compares linear/BVH rendering with one and four workers, including identical pixels and work counters. | The test directly validates the central concurrency claim that scheduling changes execution order but not results or semantic work. |
| `f0c6be8f963f` | `refactor(cli): 위치 인자와 checksum option 모델 구성` | B | REFACTOR, CLI | Introduces `CliOptions` and a reusable option-parsing loop. | The refactor provides a clean extension point for later flags but is straightforward interface organization. |
| `146749c5b8f5` | `feat(cli): 가속 방식 선택 option 추가` | B | CLI, ACCEL | Adds `--accel linear\|bvh` with duplicate and value validation. | The option exposes an existing runtime contract; it does not create the acceleration mechanism. |
| `e7b1bd2e8982` | `feat(cli): 작업자 수 option 추가` | B | CLI, CONCURRENCY | Adds strict `--threads N\|auto` parsing and range checks. | This is competent boundary validation for an existing renderer setting, not a major project decision. |
| `3aa806753cc4` | `feat(cli): 반사 깊이 option과 기본값 추가` | B | CLI, MATERIAL | Adds `--max-depth 0..32` and changes the default reflection depth to four. | The flag makes recursive rendering configurable, but the material mechanism and depth semantics were established earlier. |
| `3abce94f2c06` | `test(cli): 렌더링 옵션과 오류 종료 계약 검증` | B | TEST, CLI, EDGE | Tests missing, duplicate, malformed, and boundary options plus exit-status behavior. | The coverage is thorough but represents normal validation of the CLI surface rather than a core rendering invariant. |
| `749fad098394` | `test(render): smoke 검사의 fixture와 실행 경로 정리` | C | TEST, PRACTICAL | Reuses the committed invalid fixture and replaces shell-specific header reading with portable commands. | This is useful test maintenance with little effect on the project's major mechanisms, contracts, or engineering story. |
| `ca2d108f2255` | `test(render): 실행 모드별 PPM byte 결정성 검증` | A | TEST, DETERMINISM, OUTPUT | Compares checksums and exact PPM bytes across linear/BVH and one/four-worker CLI runs. | This is end-to-end evidence for the project's defining determinism guarantee at the actual published-file boundary. |
| `58d53cce0ee5` | `build(sanitizers): 메모리와 정의되지 않은 동작 검사 구성` | B | BUILD, TEST, RISK | Adds an opt-in AddressSanitizer/UBSan build and ignores multiple build directories. | Sanitizer support is important practical engineering, but it is standard verification infrastructure rather than a project-specific mechanism. |
| `4491bea4d93c` | `ci: 플랫폼별 빌드와 회귀 검사 자동화` | B | BUILD, TEST, INTEGRATION | Automates release builds and regression tests on Ubuntu and macOS plus sanitizer checks on Linux. | The CI materially improves reproducibility and platform confidence, yet it does not alter runtime architecture or establish a unique invariant. |
| `9b77225cf6b7` | `perf(benchmark): 측정 schema와 가속 기준 검증 고정` | A | PERF, ACCEL, DETERMINISM | Versions the benchmark schema, verifies all work counters, and enforces a primitive-test ratio below 25 percent. | The commit converts acceleration effectiveness from an informal observation into a repeatable, machine-checked performance criterion tied to unchanged output. |
| `9ddd3419cac1` | `perf(benchmark): 참조 측정값 기록` | C | PERF | Records one AppleClang/arm64 reference benchmark result. | The snapshot is useful evidence and context, but it neither changes behavior nor establishes a reusable measurement mechanism. |
| `4eb50073bc3e` | `fix(output): 불일치한 이미지 저장소 거부` | A | OUTPUT, RISK, EDGE | Adds `Image::validate` and requires exact pixel-storage consistency before checksum or serialization. | This closes a public-API memory-safety gap at both output entry points and restores the invariant that dimensions and storage agree. |
| `918dd1efeaf3` | `test(output): 잘못된 이미지 저장소 처리 검증` | B | TEST, OUTPUT, RISK | Tests short and oversized image storage and verifies invalid output cannot truncate an existing file. | The regression is important supporting coverage for the validation fix, but the representation invariant itself is established by the preceding implementation commit. |
| `053235a7a5e1` | `fix(output): PPM 출력 실패 시 기존 파일 보존` | A | OUTPUT, RISK, PRACTICAL | Serializes through a checked stream, writes a same-directory temporary file, and atomically replaces the destination only after success. | This establishes a strong publication guarantee: partial writes, flush/close failures, or replacement failures do not destroy the prior output. |
| `c6a6a7562a4d` | `test(output): 출력 실패의 대상 보존과 정리 검증` | A | TEST, OUTPUT, RISK | Injects stream and replacement failures, verifies destination preservation, and checks temporary-file cleanup. | These tests exercise the difficult negative paths of atomic publication rather than only the normal serializer behavior. |
| `0536e4829070` | `fix(renderer): 작업자 예외를 호출자에게 전달` | A | CONCURRENCY, RISK, DEBUG | Captures worker exceptions, stops new tile assignment, joins every worker, and rethrows on the caller thread. | This corrects a severe concurrency failure mode that could otherwise terminate the process or abandon workers; it is significant lifecycle engineering but not the original scheduler architecture. |
| `b5c708ac981a` | `test(renderer): 작업자 실패 전파와 회수 검증` | A | TEST, CONCURRENCY, RISK | Uses a throwing shape to verify worker exception propagation and thread recovery. | The injected failure locks down the dangerous lifecycle path fixed by the preceding commit and ensures failure does not remain trapped in a worker. |
| `ef5320a83c27` | `fix(accel): 가속 구조의 도형 불변식 보호` | S | ARCH, ACCEL, SCENE | Privatizes scene shape storage and built-in geometry, exposing only read-only accessors. | This closes the stale-BVH hole at its root by making every structural mutation pass through invalidation. It converts a convention into an enforceable ownership and derived-state invariant across scene, geometry, and acceleration. |
| `13f153e23920` | `test(accel): 장면 변경과 가속 상태 불변식 검증` | A | TEST, ACCEL, SCENE | Adds compile-time immutability assertions and runtime invalidation, fallback, and rebuild checks. | The tests prove the complete acceleration state transition and prevent callers from bypassing the S-level ownership correction. |
| `04086a2ae050` | `docs(project): 프로젝트 문서 정리` | C | - | Rewrites the README and adds architecture, format, verification, and development-history documentation. | The documentation is unusually comprehensive but does not change executable behavior; under the fixed grading rules it remains minor relative to implementation decisions. |

# Development Threads

## Thread: From geometric contracts to the first rendered image

`f3f1d04cc836` S — Establishes the common shape/hit contract that lets scene traversal and shading consume heterogeneous geometry.  
↓  
`2a01cb406d9d` A — Creates the scene aggregate that owns the state needed to trace an image.  
↓  
`41a1d6bbe5ef` A — Defines the linear closest-hit reference semantics later preserved by acceleration.  
↓  
`3545eb1e82df` B — Establishes source-located parser diagnostics and line tokenization.  
↓  
`6bff18bf0bac` A — Defines the directive-dispatch grammar boundary.  
↓  
`1e1fda47d913` A — Completes required-directive validation and file/text scene loading.  
↓  
`e6da5f987b97` A — Converts pixel coordinates into camera rays.  
↓  
`e8b7dc42a52c` S — Defines ambient/direct lighting and shadow visibility.  
↓  
`c742b2401e52` S — Executes the complete serial image-rendering loop.  
↓  
`1bc7cacd30aa` A — Publishes a P3 representation and deterministic checksum.  
↓  
`b983f0ea2744` B — Connects the pipeline to the CLI.  
↓  
`d05a6ab48bb1` B — Verifies the first complete valid and invalid command paths.

**Significance**

This progression turns isolated mathematical and geometric types into an externally usable renderer. The important sequence is not merely feature accumulation: the shape contract gives every primitive one result model, the scene supplies one authoritative selection boundary, the parser constructs that state, camera and shading transform it into pixel colors, and the renderer/output/CLI layers preserve a deterministic artifact. The serial implementation also becomes the semantic baseline against which later BVH and threaded versions are judged.

## Thread: Large finite vectors and normalization stability

`aa92a87c98a3` A — Replaces overflow-prone sum-of-squares magnitude with `std::hypot`.  
↓  
`ff18d1cc3afc` B — Fixes the exact large-finite-vector regression as a permanent test case.

**Significance**

This is a compact root-cause correction thread. The original mathematical interface was already shared by camera directions, normals, axes, and rays; the later test demonstrates that ordinary unit-vector cases were insufficient to protect it. The thread matters because a small implementation detail in a foundational value type could silently turn a meaningful finite direction into a zero-like result throughout the renderer.

## Thread: Correctness-preserving BVH acceleration

`f4dcb50939e2` A — Adds semantic work counters and timing before acceleration changes behavior.  
↓  
`4fb2345c7d35` B — Establishes a fixed dense-scene workload.  
↓  
`f5a2c4ade16d` A — Defines repeated median measurement and rejects inconsistent results.  
↓  
`7b19f2ad78e3` A — Implements the ray/AABB interval test.  
↓  
`a40452885176` A — Defines which shapes provide finite bounds and which remain unbounded.  
↓  
`b782e22450d8` A — Adds conservative arbitrary-axis cylinder bounds.  
↓  
`419d52d687fc` A — Verifies AABB edge behavior and the no-false-negative bounds contract.  
↓  
`bb65e8092632` A — Builds a deterministic median-split BVH.  
↓  
`9a7f29b5d78a` A — Preserves the linear equal-`t` winner through original shape indices and exposes both modes.  
↓  
`f7e969537c10` S — Makes acceleration owned, rebuildable derived scene state with an unbounded-shape path.  
↓  
`d4f6ee5b6042` S — Implements near-first explicit-stack traversal and pruning.  
↓  
`41c9a59f27a6` A — Proves linear/BVH hit and pixel equivalence while checking work reduction.  
↓  
`da3e8b43d09e` A — Measures both modes under the same correctness constraints.  
↓  
`9b77225cf6b7` A — Fixes a versioned benchmark schema and enforces a primitive-test reduction threshold.  
↓  
`ef5320a83c27` S — Prevents callers from mutating geometry behind a ready BVH.  
↓  
`13f153e23920` A — Verifies immutability, invalidation, linear fallback, and rebuild as one state transition.

**Significance**

The thread shows that acceleration was treated as a semantic transformation, not merely a faster container. It first establishes comparable work metrics, then introduces conservative bounds, deterministic construction, and a traversal that reuses the linear candidate rule. The later ownership correction is crucial historical evidence: a BVH can be algorithmically correct yet still become wrong if its source geometry remains externally mutable. The final design therefore combines algorithm, result-ordering, bounded/unbounded partitioning, ownership, invalidation, fallback, rebuild, equivalence testing, and measured work reduction.

## Thread: Material syntax to bounded recursive reflection

`85583e1e9beb` A — Extends tracing with a deterministic perfect-metal branch and depth consumption.  
↓  
`a90130a5b030` B — Adds optional material tokens while retaining diffuse defaults.  
↓  
`9a352ffe8233` B — Verifies parsing, unknown-material failure, recursion depth, secondary-ray counts, and diffuse compatibility.  
↓  
`3aa806753cc4` B — Exposes reflection depth through the CLI and adopts a default of four.

**Significance**

The material thread changes `traceRay` from a terminal direct-light computation into bounded recursion without introducing randomness or schedule-dependent sampling. Keeping omitted material tokens diffuse preserves existing scenes, while the depth contract makes recursive work finite and externally configurable. The tests show both the new metal path and the unchanged diffuse golden, which is the relevant compatibility boundary.

## Thread: Deterministic tiled rendering and worker failure recovery

`498266fc0abf` B — Converts the serial row loop into fixed tile traversal without adding threads.  
↓  
`849f878ca0b0` S — Distributes tiles atomically, assigns disjoint pixel writes, and merges worker-local statistics.  
↓  
`18459bfda416` B — Adds explicit and automatic worker-count policy.  
↓  
`3619550fa354` A — Verifies equal pixels and work for one versus four workers in both acceleration modes.  
↓  
`ca2d108f2255` A — Verifies exact PPM-byte equality through the CLI.  
↓  
`0536e4829070` A — Captures worker failures, stops new work, joins all workers, and rethrows on the caller.  
↓  
`b5c708ac981a` A — Injects a throwing shape to lock down propagation and recovery.

**Significance**

The preparatory tile refactor separates pixel addressing from execution order, after which the scheduler can claim tiles without overlapping writes. Determinism follows from per-pixel independence, fixed intra-pixel operation order, explicit hit tie-breaking, and integer statistic merging—not from deterministic thread scheduling. The later exception fix closes the lifecycle gap left by the initial parallel implementation: a failure inside `traceRay` must not escape a worker, terminate the process, or return a partial successful image.

## Thread: Image representation and atomic PPM publication

`71096cd311d5` A — Makes allocation sizing and pixel offsets overflow-aware.  
↓  
`3d2e6a5becb7` B — Verifies positive dimensions and exact storage size.  
↓  
`89c3c7269877` B — Corrects the FNV-1a definition.  
↓  
`eac2ecd13c33` A — Pins checksum and full-render goldens.  
↓  
`4eb50073bc3e` A — Validates that public image dimensions and byte storage agree before use.  
↓  
`918dd1efeaf3` B — Exercises short and oversized storage and preservation of an existing destination.  
↓  
`053235a7a5e1` A — Writes through a checked stream and publishes through a temporary file plus final replacement.  
↓  
`c6a6a7562a4d` A — Injects serialization and replacement failures and verifies cleanup and preservation.

**Significance**

This thread expands the output contract from “write bytes” to “publish only a complete, internally consistent image.” Allocation and indexing safety prevent buffer mismatch at construction; later validation protects callers that mutate public `Image` fields directly. Standardized checksums make deterministic regressions comparable, while temporary-file publication ensures validation, stream, flush, close, or replacement failures do not destroy a previously valid output.

## Thread: Reproducible verification infrastructure

`2cf2f17980bb` B — Separates `raycore`, the executable, and CTest targets under CMake.  
↓  
`0e8c3b51e3b7` B — Adds broad component regression coverage.  
↓  
`58d53cce0ee5` B — Adds an AddressSanitizer/UBSan configuration.  
↓  
`4491bea4d93c` B — Runs release regressions on Ubuntu and macOS and sanitizer checks on Linux.

**Significance**

These commits do not define the renderer's algorithms, but they turn local checks into a repeatable project-wide verification path. The progression matters because later geometry, BVH, concurrency, and output failure tests all depend on a stable library/test build and can be exercised under multiple platforms and runtime instrumentation rather than only through one command-line smoke path.


# Most Important Commits

## feat(geometry): hit와 도형 교차 계약 정의

Commit: `f3f1d04cc836`  
Importance: S  
Tags: ARCH, GEOMETRY, SCENE

### Problem

The renderer needed multiple heterogeneous primitives to participate in one scene query and then provide shading with a consistent point, normal, material, and identity. Primitive-specific return types or ad hoc output parameters would have coupled scene traversal and shading to every concrete shape.

### Decision

The commit defines one polymorphic `Shape::intersect` contract and one `HitRecord` representation. It also centralizes front/back-face handling so a hit normal is oriented consistently relative to the incoming ray, while material state is copied into the record and the shape pointer remains explicitly non-owning.

### Why it mattered

This contract is the seam between geometry and the rest of the system. Sphere, plane, cylinder, linear scene traversal, BVH traversal, diffuse shading, metal reflection, tie-breaking tests, and acceleration equivalence all consume the same result model.

### What changed

The public geometry API gained the abstract shape boundary, hit state, face-normal helper, and concrete primitive declarations needed by subsequent intersection commits.

### Why this is important for understanding the project

The project is not organized around three unrelated intersection functions. It is organized around one authoritative hit protocol. Understanding that protocol explains why later acceleration can reorder tests without changing shading and why scene ownership can change without changing primitive semantics.

## feat(render): 직접광과 그림자 추적 구현

Commit: `e8b7dc42a52c`  
Importance: S  
Tags: CORE, RAY_PIPELINE, RISK

### Problem

Intersection alone only identifies visible surfaces. A ray tracer also needs a stable rule for misses, ambient contribution, light visibility, diffuse response, and avoidance of immediate self-intersection when tracing shadows.

### Decision

The commit starts shading from ambient albedo, adds Lambertian point-light contributions only for front-facing lights, offsets shadow origins along the hit normal, and limits occlusion tests to the light distance. `traceRay` returns the scene background on a miss and delegates a hit to the shared shading path.

### Why it mattered

This establishes the project's principal visual contract. The later image checksum, BVH equivalence, material compatibility, and threaded determinism tests all assume these exact lighting and shadow semantics.

### What changed

A renderer-facing API for nearest hits, occlusion, shading, and tracing was added, together with the first implementation that integrates scene intersection, light iteration, shadow rays, color multiplication, and clamping.

### Why this is important for understanding the project

The commit shows where geometric correctness becomes observable rendering behavior. It also introduces the offset and bounded-shadow conventions that must remain stable under every later optimization.

## feat(renderer): 직렬 이미지 렌더링 구현

Commit: `c742b2401e52`  
Importance: S  
Tags: ARCH, CORE, RAY_PIPELINE

### Problem

The project had scene parsing, camera rays, and single-ray shading, but no mechanism that covered an entire resolution and produced owned pixel storage.

### Decision

The commit introduces a contiguous RGB `Image`, a render-settings boundary, and a deterministic serial loop that samples each pixel center, traces exactly one ray, clamps the color, and quantizes it to bytes.

### Why it mattered

This is the first complete renderer and therefore the semantic reference for later camera caching, tile traversal, multithreading, checksums, PPM output, and acceleration benchmarks. Later performance work changes execution cost and order but is repeatedly tested against the bytes established by this path.

### What changed

`renderScene` now allocates the final image and fills every pixel through the production camera and trace APIs. `Image` and `RenderSettings` become the public renderer-level data types.

### Why this is important for understanding the project

The core architecture is easiest to see here: immutable scene input, deterministic per-pixel computation, and an owned byte image returned to the caller. The later threaded implementation is a reorganization of this reference computation, not a separate rendering model.

## refactor(scene): 장면 도형의 단독 소유권 적용

Commit: `93167ba2bd94`  
Importance: S  
Tags: ARCH, SCENE, RISK

### Problem

Shared pointers allowed shape lifetime to be extended or shared without any subsystem actually requiring shared ownership. That ambiguity becomes dangerous once acceleration structures store indices or non-owning references to scene-owned geometry.

### Decision

`Scene` becomes the sole owner of shapes through `unique_ptr`. Copy operations are deleted, move operations are retained, and all creation sites transfer ownership into the scene.

### Why it mattered

The decision gives shape destruction exactly one owner and keeps object addresses stable for non-owning `HitRecord::shape` pointers and BVH indexing. It also makes the later acceleration lifecycle understandable: the BVH derives from geometry whose lifetime is controlled by the same object.

### What changed

Parser and benchmark construction move from `make_shared` to `make_unique`; scene storage and traversal use `unique_ptr`; and scene copy semantics are explicitly prohibited.

### Why this is important for understanding the project

The finished design depends on distinguishing owned source state from non-owning derived structures. This commit establishes that distinction before the BVH is introduced.

## feat(scene): 가속 구조 소유권과 rebuild 경계 구성

Commit: `f7e969537c10`  
Importance: S  
Tags: ARCH, ACCEL, SCENE

### Problem

A BVH is not independent domain state: it is derived from current shapes and their bounds. The project also contains planes that cannot be placed in finite AABBs. Without an explicit lifecycle, a scene could query incomplete, stale, or improperly bounded acceleration data.

### Decision

`Scene` owns a `Bvh`, a separate list of unbounded shape indices, and an acceleration-readiness flag. Adding a shape clears derived data and marks it unavailable; `buildAcceleration` partitions bounded from unbounded geometry and rebuilds the tree; parsed scenes build once after all directives succeed.

### Why it mattered

This is the state-management half of acceleration correctness. It prevents the renderer from treating a built tree as permanently authoritative and defines the safe fallback condition used when BVH mode is requested before rebuilding.

### What changed

New build/readiness APIs and private acceleration storage were added, `addShape` became the invalidation boundary, and the parser's successful completion became the normal rebuild boundary.

### Why this is important for understanding the project

The BVH is best understood as a cache with correctness obligations, not simply a faster container. This commit explains who owns that cache, when it is valid, and how infinite geometry participates.

## feat(accel): 결정적 BVH 최근접 순회 구현

Commit: `d4f6ee5b6042`  
Importance: S  
Tags: CORE, ACCEL, HARD

### Problem

The renderer needed to skip large groups of shapes without allowing traversal order to change the selected hit. It also had to combine bounded BVH content with unbounded planes and preserve the current closest distance for pruning.

### Decision

The commit implements an explicit stack, tests the root and child AABBs, visits the nearer child first, prunes nodes whose entry exceeds the current closest hit, tests leaf shape indices through the common candidate function, and finally tests unbounded shapes. Equal-entry child ordering is deterministic, while equal-hit selection remains governed by original shape indices.

### Why it mattered

This is the algorithm that realizes the project's main performance improvement. It changes the amount and order of work while preserving the linear renderer's exact semantic result.

### What changed

`Scene::intersect` now selects a real BVH path when acceleration is ready, records AABB work, maintains a traversal stack, and retains linear fallback when requested or when derived state is unavailable.

### Why this is important for understanding the project

The commit connects every prior acceleration decision—bounds, builder, mode contract, tie rule, ownership, and unbounded partition—into the production query path. It is the central algorithmic commit of the branch.

## feat(render): 원자적 tile 분배와 작업자 통계 병합 구현

Commit: `849f878ca0b0`  
Importance: S  
Tags: ARCH, CONCURRENCY, DETERMINISM

### Problem

Full-image rendering was serial, but naive parallelization could create overlapping writes, shared statistic races, schedule-dependent accumulation, or unjoined threads. The optimization also had to preserve exact image bytes.

### Decision

The renderer uses fixed 16×16 tiles and an atomic next-tile index. A claimed tile gives one worker exclusive ownership of its pixels; scene and camera data are shared read-only; each worker accumulates separate statistics; and all workers are joined before statistics are merged or the image is returned.

### Why it mattered

This defines how the project obtains parallelism without changing rendering semantics. Determinism is derived from ownership and per-pixel independence, not from a fixed scheduling order.

### What changed

Thread support entered the build, the tile loop became a worker body, the image was filled concurrently at coordinate-derived offsets, and worker-local counters were aggregated after completion.

### Why this is important for understanding the project

The final renderer's concurrency model is visible in this commit. It explains why different worker counts can produce identical bytes and why later tests compare both images and semantic work counters.

## fix(renderer): 작업자 예외를 호출자에게 전달

Commit: `0536e4829070`  
Importance: A  
Tags: CONCURRENCY, RISK, DEBUG

### Problem

An exception escaping a `std::thread` body calls `std::terminate`; it does not naturally reach `renderScene` or the CLI's normal error path. The initial scheduler therefore had a dangerous failure mode even though its successful path joined workers correctly.

### Decision

Each worker catches failures into its own `exception_ptr`, signals the shared tile counter to stop assigning new work, and exits. The caller joins every worker first, then rethrows the stored failure on the caller thread.

### Why it mattered

The correction turns worker failure from process termination into an ordinary rendering failure with deterministic cleanup. It also ensures a failed render cannot be mistaken for a partial successful image.

### What changed

Worker error slots and catch/rethrow logic were added around the complete worker body, while the existing join boundary remains authoritative for cleanup.

### Why this is important for understanding the project

This commit exposes the difference between successful concurrency and reliable concurrency. It is the clearest failure-path correction in the renderer history and explains the final CLI statement that worker `std::exception` failures return through the normal status-1 path.

## fix(accel): 가속 구조의 도형 불변식 보호

Commit: `ef5320a83c27`  
Importance: S  
Tags: ARCH, ACCEL, SCENE

### Problem

`Scene` tracked acceleration readiness, but public mutable shape storage and public primitive geometry allowed callers to change or reorder the source data without calling `addShape`. A ready flag could therefore remain true while BVH bounds and indices described obsolete geometry.

### Decision

The shape vector becomes private, scene inspection becomes count plus checked `const Shape&` access, and built-in sphere, plane, and cylinder parameters move behind const accessors. Structural mutation must pass through `addShape`, which already invalidates derived acceleration.

### Why it mattered

This closes a severe non-obvious correctness hole at the root cause. The lifecycle from `f7e969537c10` is now enforceable through the type interface rather than relying on callers to remember an undocumented convention.

### What changed

Geometry implementations were migrated to private fields; tests and dependent code use read-only accessors; scene traversal uses private storage; and the public API no longer exposes mutable shape ownership.

### Why this is important for understanding the project

The finished BVH architecture is defined as much by what callers cannot mutate as by its traversal algorithm. This commit completes the ownership and cache-coherency story.

## fix(output): PPM 출력 실패 시 기존 파일 보존

Commit: `053235a7a5e1`  
Importance: A  
Tags: OUTPUT, RISK, PRACTICAL

### Problem

Opening the final output path directly with truncation can destroy an existing valid image before serialization, flush, or close succeeds. Validation before opening protects one failure class but not stream and replacement failures.

### Decision

PPM serialization is separated into a checked stream API. File output writes to a uniquely suffixed temporary path in the same directory, verifies stream completion, and only then replaces the destination. An RAII guard removes the temporary file unless the replacement commits.

### Why it mattered

The output boundary gains transactional behavior: either a complete new PPM becomes visible or the prior destination remains. This is a substantial reliability improvement for a command whose main external effect is writing an image.

### What changed

The output module adds stream serialization, temporary-name generation, platform-specific replacement, error reasons, flush/close checking, and cleanup-on-failure.

### Why this is important for understanding the project

The commit demonstrates that correctness extends beyond pixel computation. The finished program also defines what happens when publication fails, and that guarantee is backed by later injected stream and replacement failures.

