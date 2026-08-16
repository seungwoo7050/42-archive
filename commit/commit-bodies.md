## chore(project): CXX17 실행 골격과 직접 빌드 구성
Establish a minimal C++17 executable and a direct Make-based build before introducing ray-tracing behavior. The build discovers the current source files, applies the project’s warning and optimization policy, and exposes a stable usage-only command-line boundary through `--help`; generated binaries, object files, dependency files, and build directories are kept outside version control.

Keeping this first runtime deliberately limited to argument validation gives later commits a reproducible compilation target and an observable CLI contract without conflating project scaffolding with domain implementation.

## feat(math): 벡터 값과 산술 연산 구현
Introduce `ray::Vec3` as the common value representation for geometry and color, together with the component-wise construction and basic arithmetic needed by every later ray-tracing subsystem. `Color` is an alias rather than a separate storage type, allowing the same three-component operations to serve spatial and radiometric calculations while retaining intent at call sites.

The public declarations are placed under `include/ray`, collected by the umbrella header, and made available to the direct build through an explicit include path. This establishes a reusable library boundary instead of leaving mathematical state embedded in the executable.

## feat(math): 벡터 길이와 기하 연산 구현
Extend the vector layer with norm, dot-product, cross-product, normalization, and near-zero predicates. These operations establish the geometric vocabulary required to construct camera bases, solve intersections, orient normals, and compare degenerate directions without duplicating coordinate formulas across subsystems.

Normalization returns the zero vector when the magnitude is at or below the shared epsilon. That policy prevents division by a numerically insignificant length and makes degeneracy explicit to callers through `isNearZero`, although later input validation remains responsible for rejecting directions that must be nonzero.

## feat(math): 벡터 비교와 색상 범위 연산 추가
Complete the vector value semantics needed by rendering and verification. Component-wise multiplication provides the Hadamard product used to combine albedo, light color, and ambient color; compound assignment supports accumulation without exposing repeated coordinate manipulation; exact comparison and stream formatting make deterministic values directly testable and diagnosable.

Scalar and color clamping are centralized in the math layer so pixel conversion and shading can enforce a common output range. The equality operators intentionally compare stored components exactly rather than introducing an implicit tolerance, leaving approximate geometric comparisons as an explicit responsibility of the caller.

## feat(ray): 광선 위치 계산 모델 추가
Add an explicit `Ray` value composed of an origin and direction, with `at(t)` as the single definition of parametric position. This gives every intersection routine the same relationship—`origin + t * direction`—and prevents individual shapes from reimplementing that mapping with subtly different conventions.

The type does not normalize its direction automatically. Preserving the supplied direction keeps ray construction inexpensive and general, while requiring camera generation and other callers to decide when unit-length directions are part of their own contract.

## feat(material): diffuse 재질 값 모델 추가
Introduce a material value that owns a surface albedo independently of any concrete shape. Separating appearance from geometry lets intersection code return both spatial information and the surface response selected by the scene, rather than hard-coding color behavior into sphere, plane, or cylinder implementations.

The initial material is deliberately limited to diffuse color, with white as a neutral default. This small representation forms a stable extension point for later material kinds without changing the fundamental shape interface.

## feat(geometry): hit와 도형 교차 계약 정의
Define the polymorphic shape boundary and the complete record produced by a successful intersection. Every shape must evaluate a ray only within the caller-supplied `[t_min, t_max]` interval and, on success, provide the parameter, point, oriented normal, material, originating shape, and front/back-face state.

`HitRecord::setFaceNormal` centralizes the rule that stored normals oppose the incoming ray while preserving whether the ray struck the exterior. This prevents each primitive from choosing its own orientation convention and gives shading a consistent normal contract. The virtual destructor and material accessor also make ownership through the abstract `Shape` interface safe and explicit.

## feat(geometry): 구 교차 계산 구현
Implement sphere intersection through the quadratic equation without assuming that ray directions are normalized. The coefficient `a` is therefore retained, degenerate directions and non-positive radii are rejected, and the nearer root is considered before the farther root while both remain constrained by the caller’s interval.

A successful hit is populated through the shared record contract, including the sphere’s material, source pointer, and face-oriented normal. Selecting roots against `t_min` and `t_max` makes the primitive usable both for nearest-hit searches and for bounded shadow queries without embedding traversal policy inside the sphere.

## feat(geometry): 평면 교차 계산 구현
Add an infinite-plane primitive whose normal is normalized once at construction and then reused for every ray query. Intersection rejects degenerate normals and directions effectively parallel to the plane before dividing by the denominator, then applies the same caller-controlled `t` interval and hit-record contract as the sphere.

Treating a plane as a point plus unit normal keeps the equation independent of any arbitrary finite extent. The oriented-normal helper preserves a consistent shading convention from either side of the plane.

## feat(geometry): 유한 원기둥 옆면 교차 구현
Implement the lateral surface of an arbitrarily oriented finite cylinder. The ray origin and direction are decomposed into components parallel and perpendicular to the normalized cylinder axis; solving the quadratic in the perpendicular plane finds candidates on the infinite tube, after which their axial coordinates are clipped to the finite height.

The routine rejects degenerate axes, dimensions, and rays parallel to the side surface, evaluates both roots within the progressively tightened hit interval, and derives the outward normal by removing the axial component from the hit point. This separates radial intersection from finite-length clipping and avoids assuming that the cylinder is aligned with a world axis.

## feat(geometry): 원기둥 cap과 최근접 hit 선택 완성
Complete the cylinder as a closed finite primitive by intersecting both end-cap planes and accepting only points within the cap radius. Side and cap candidates now pass through a shared closest-hit updater, so every surface applies the same interval check, record population, material assignment, normal orientation, and tightening of the current upper bound.

Unifying candidate selection is important because a ray can meet a side and a cap in the same query. The returned record must describe the nearest valid surface regardless of the order in which those analytical cases are evaluated; the small radial epsilon at the cap boundary also avoids rejecting points that lie on the rim only because of floating-point rounding.

## feat(scene): 카메라·조명과 장면 aggregate 구성
Introduce `Scene` as the aggregate that binds image dimensions, required-directive state, ambient terms, background, camera, lights, and owned shape references into one renderable model. Camera and light values receive explicit defaults, while `hasResolution`, `hasAmbient`, and `hasCamera` remain separate from their stored values so parsing can distinguish “not supplied” from a numerically valid default.

Centralizing these elements gives the parser a single construction target and later gives rendering a read-only snapshot of all scene inputs. At this stage shape ownership is shared, which permits heterogeneous primitives through the common interface while postponing stricter ownership decisions.

## feat(scene): 선형 최근접 교차 탐색 구현
Make the scene responsible for selecting the nearest primitive hit rather than requiring callers to traverse shape storage themselves. The search starts with the caller’s `t_max`, passes the current closest value into each shape, and replaces the result whenever a valid candidate is returned.

This establishes the linear reference behavior used by shading and, later, by acceleration verification. Because primitives accept a candidate exactly at the current upper bound, a later shape in scene order can replace an equal-`t` hit; that observable selection rule becomes part of the behavior an accelerated traversal must preserve.

## feat(parser): 소스 위치 오류와 line tokenization 구성
Establish the parser boundary around an input stream and a caller-provided source name. `ParseError` retains structured source and line information while formatting the same context into `what()`, allowing the CLI to report useful diagnostics and tests to assert the exact failure location without parsing an error string.

Whitespace trimming and line tokenization are introduced as parser-local utilities. Keeping lexical preparation private separates scene syntax from the public model and prepares the parser to process one physical line at a time, which is essential for attributing validation failures to the correct source line.

## feat(parser): 유한 수와 범위 값 해석 구현
Add strict scalar conversion helpers for scene syntax. Numeric tokens must be consumed in full, floating-point values must be finite, dimensions must fit a positive `int`, ratios are limited to `[0, 1]`, and geometric sizes must be strictly positive; every failure is translated into a field-specific `ParseError` at the current source location.

Performing these checks before values enter `Scene` prevents `NaN`, infinity, trailing characters, overflow, and invalid ranges from leaking into geometry or rendering. The exact token-count helper likewise makes each directive responsible for a closed grammar instead of silently accepting missing or surplus arguments.

## feat(parser): 벡터와 색상 token 해석 구현
Implement the comma-separated compound tokens used by the scene format. Vectors require exactly three nonempty finite components and retain field-specific component names in diagnostics, while colors require three integral byte channels in `[0, 255]` and convert them once to the renderer’s normalized `[0, 1]` representation.

The comma splitter preserves empty fields, allowing malformed forms such as missing components or trailing separators to be rejected rather than normalized away. Keeping color decoding distinct from arbitrary vectors also prevents fractional or out-of-range source channels from being accepted accidentally.

## feat(parser): 줄 단위 지시어 dispatch 기반 구성
Create the parser’s physical-line loop: comments are removed, surrounding whitespace is trimmed, empty lines are ignored, and remaining lines are tokenized before directive dispatch. Duplicate-singleton and nonzero-vector validators are introduced alongside this loop so individual handlers can enforce scene-wide and geometric constraints with the same location-aware error type.

At this intermediate stage no directive handler is installed yet, so every nonempty identifier reaches the unknown-directive error. That fail-closed scaffold is preferable to returning a partially populated scene for unrecognized syntax and provides the control-flow boundary that subsequent commits fill one directive family at a time.

## feat(parser): 해상도와 환경광 지시어 지원
Install the first concrete scene directives on the line-dispatch scaffold. `R` requires exactly two positive integer dimensions and may appear only once; `A` requires one bounded ratio and one byte-encoded color and is likewise a singleton. The corresponding presence flags are set only after all fields have been parsed successfully.

This ordering prevents a malformed first occurrence from poisoning duplicate detection and keeps stored scene state synchronized with validation state. Unknown identifiers continue to fail at their own source line rather than being ignored.

## feat(parser): 카메라와 광원 지시어 지원
Parse camera and point-light directives into normalized runtime values. The camera is a singleton with an exact arity, a nonzero direction, and an open FOV range `(0, 180)`; its direction is normalized at the input boundary so camera construction receives a stable orientation. Lights remain repeatable and require a position, bounded brightness, and normalized color.

The distinction reflects the scene model: there is one active camera but an arbitrary light list. Rejecting degenerate directions and singular FOV values in the parser prevents the camera-basis and perspective calculations from receiving inputs for which no meaningful frame exists.

## feat(parser): 구와 평면 지시어 지원
Connect sphere and plane syntax to the polymorphic geometry model. Source diameters are validated as positive and converted to the internal radius convention exactly once; plane normals are rejected when degenerate before the constructor normalizes them. Both directives decode their colors into material values and append the resulting shape through the scene boundary.

Keeping syntax-specific units and validation in the parser lets intersection classes operate only on their native, already-validated representation. Exact token counts also prevent accidental acceptance of trailing fields that might otherwise be mistaken for unsupported material options.

## feat(parser): 원기둥 지시어 지원
Add the finite-cylinder directive with explicit center, axis, diameter, height, and color fields. The parser rejects a degenerate axis and non-positive dimensions, converts the source diameter to the geometry layer’s radius representation, and constructs the arbitrary-axis cylinder only after every field has passed validation.

This completes the initial shape grammar while preserving the same separation used for spheres and planes: file-format conventions stay at the input boundary, and the primitive receives normalized, internally meaningful values.

## feat(parser): 필수 지시어 검증과 입력 loader 완성
Complete scene construction by requiring resolution, ambient lighting, and a camera before a parsed scene can be returned. Missing-directive failures use line zero because they describe a whole-file omission rather than a malformed physical line, preserving the distinction in the structured error contract.

Add stream-, text-, and file-oriented entry points around the same parser implementation, with file-open failures reported as `ParseError` against the requested path. Valid and intentionally invalid scene fixtures provide reusable end-to-end inputs: one exercises every initial directive family, while the other anchors a range failure at a known line. The top-level `loadScene` function gives the executable a narrow loading boundary without exposing file handling to rendering code.

## feat(camera): 화면 좌표를 카메라 광선으로 변환
Introduce perspective camera-frame construction and map image-space sample coordinates to normalized world-space rays. The frame derives an orthonormal `forward`/`right`/`up` basis, computes viewport dimensions from vertical FOV and aspect ratio, and flips the image-space vertical coordinate so increasing pixel rows map downward while camera up remains positive.

The implementation explicitly repairs degenerate camera inputs: a zero forward direction falls back to the default view axis, and an absent or nearly parallel up vector is replaced by an axis that can produce a stable cross product. Clamping dimensions to at least one prevents division by zero, making the function defensive even though the parser normally supplies positive sizes.

## feat(render): 직접광과 그림자 추적 구현
Introduce the first complete radiance path from a ray to a surface color. A miss returns the scene background; a hit begins with ambient albedo modulation and accumulates Lambertian contributions from each point light only when the light lies above the oriented surface and no primitive blocks the segment.

Shadow rays originate at a small normal offset and stop just before the light. Those two bounds address self-intersection at the source and prevent geometry behind the light from casting a false shadow. Nearest-hit and occlusion helpers both delegate to the scene’s interval-based intersection contract, so shading policy does not gain a separate traversal implementation. The public depth parameter is present but intentionally has no effect before reflective materials are introduced.

## feat(renderer): 직렬 이미지 렌더링 구현
Add the image and render-settings value types and implement a deterministic row-major renderer. Each pixel is sampled once at its center, converted through the camera model, traced through the scene, clamped, rounded to the nearest byte, and stored in an interleaved RGB buffer.

This creates a simple serial reference pipeline whose output order is independent of allocation or traversal details. The explicit image buffer decouples rendering from file encoding, while the settings object provides a stable place for ray bounds, sampling, and recursion controls even though this initial loop only consumes the depth setting.

## feat(output): PPM 직렬화와 이미지 체크섬 구현
Separate image persistence and regression identity from rendering. `writePpm` emits the in-memory RGB buffer as a P3 image with an explicit header and one pixel per line, and reports an output-open failure through an exception rather than silently producing no artifact.

`checksumHex` applies a fixed 64-bit FNV-1a-style sequence to image dimensions and pixel bytes and formats a stable 16-digit hexadecimal key. Including dimensions prevents differently shaped byte buffers from being treated as the same rendered image, while hashing the already-quantized storage makes the checksum describe the exact observable output rather than floating-point intermediates.

## feat(cli): 장면 렌더링 명령 연결
Connect the parser, renderer, output writer, and checksum components into the executable's complete scene-to-image command. The interface accepts a scene path, an output path, and only the optional `--checksum` flag; malformed invocation is reported as a usage error with status 2, whereas exceptions raised while loading, rendering, or writing are reported as runtime failures with status 1.

The command performs loading before rendering and rendering before writing, so invalid scene input cannot create an image through this path. Exception translation is kept at the process boundary, preserving detailed lower-level diagnostics while giving every runtime failure a consistent executable prefix. The Make smoke target now exercises this real pipeline rather than only the argument parser.

## test(render): 장면 렌더링 smoke 검사 추가
Replace the minimal executable invocation with an end-to-end smoke test that covers both failure isolation and deterministic success. An unknown directive must make the command fail without leaving a rendered image, locking down the ordering in which scene validation completes before output creation.

A representative lit scene is then rendered twice into independent files. The test verifies the P3 magic, dimensions, maximum channel value, checksum syntax, checksum stability, and byte-for-byte equality of the two PPM files. Temporary artifacts are isolated and removed unconditionally, so the check exercises the parser, camera, intersections, shading, image conversion, and serialization without polluting the working tree.

## build(cmake): 코어 라이브러리와 검증 타깃 구성
Introduce CMake as the authoritative build graph and separate reusable rendering code from the command-line entry point. The implementation sources form a `raycore` library with a public include boundary, while the executable links that library instead of compiling all translation units as one undifferentiated target. This structure allows later unit and benchmark executables to reuse the same production objects without duplicating `main`.

The configuration fixes the language contract at standard C++17 without compiler extensions and preserves strict warning levels across MSVC and non-MSVC toolchains. CTest owns the smoke-test registration and passes the exact built executable to the script, avoiding a nested rebuild and ensuring that the tested binary is the one produced by the active CMake configuration. The Makefile remains a thin convenience wrapper over the same configure, build, test, and cleanup operations rather than defining a competing build model.

## test(core): 수학·기하·파서·출력 회귀 기준 추가
Add a native regression executable linked against the same `raycore` library as production. The checks establish numerical expectations for vector operations, nearest distances for every supported primitive, source-line reporting for an invalid scene fixture, and the exact textual encoding of a small P3 image. A basic scene render also verifies that the parsed resolution propagates to the image boundary.

Keeping these checks below the CLI separates component contracts from shell-level integration behavior. The source directory is supplied by CMake rather than inferred from the process working directory, making fixture lookup reproducible when CTest runs from the build tree.

## perf(render): 광선과 교차 작업량 계측 추가
Thread an optional `RenderStats` sink through rendering, shading, occlusion, and scene intersection without changing the normal call sites. Counters distinguish primary, secondary, and shadow rays from primitive and future AABB tests, while a steady clock records the complete image-rendering interval. Passing a null sink retains the original behavior and avoids making instrumentation mandatory in production use.

Primitive tests are counted at the scene boundary immediately before each shape intersection, so the metric represents actual dispatches rather than inferred work from scene size. Shadow rays are counted only after the light contributes a positive diffuse term and therefore actually performs an occlusion query. This placement makes later acceleration changes comparable against the same semantic workload while checksums can still detect accidental image changes.

## perf(benchmark): 조밀 장면 기준 workload 추가
Create a dedicated benchmark target around a deterministic dense scene containing a ground plane, two lights, and a 20-by-20 sphere grid. Constructing the workload directly in code removes parser and file-I/O variance and keeps object placement, material variation, camera, and resolution fixed across implementation changes.

The benchmark renders through the production API with statistics enabled and computes the normal image checksum. At this stage it prints the checksum rather than claiming a timing result, establishing a correctness anchor before later commits compare performance modes. Linking against `raycore` ensures the workload exercises the same intersection and shading implementation as the executable.

## perf(benchmark): 반복 측정과 결정성 보고 구성
Turn the single benchmark render into a repeatable measurement protocol. One unreported warm-up run precedes five measured runs, reducing one-time initialization effects, and the median elapsed sample is selected instead of an outlier-sensitive mean.

Every measured run must agree on both the image checksum and primitive-test count before any result is reported. This makes correctness and executed work part of the benchmark contract rather than allowing a faster but behaviorally different render to pass unnoticed. The structured report records the workload identity, resolution, run counts, ray counts, primitive work, median time, and checksum so later acceleration changes can be compared against an explicit baseline.

## fix(math): 큰 유한 벡터를 안정적으로 정규화
Compute vector magnitude with the scaled `std::hypot` algorithm instead of first forming `x*x + y*y + z*z`. Squaring a component near the upper finite range can overflow to infinity even when the vector itself has a meaningful finite direction; normalization would then divide finite components by infinity and collapse them toward zero.

`std::hypot` avoids that avoidable intermediate overflow and underflow while preserving the existing length and normalization interface. The change therefore restores the invariant that a non-negligible finite vector can be converted to its unit direction, which is relied on by camera frames, surface normals, cylinder axes, and ray directions.

## test(math): 큰 유한 벡터 정규화 검증
Add a regression case at a magnitude where the previous sum-of-squares implementation overflowed. Normalizing `(1e308, 0, 0)` must produce the exact positive x unit vector rather than a zero-like or non-finite result.

The case targets the numerical mechanism fixed by the preceding change, not merely ordinary normalization accuracy. It protects every geometry path that accepts finite but very large coordinates or direction components from silently reintroducing overflow through a simpler magnitude formula.

## fix(parser): 임계값 이하 방향 벡터 거부
Validate camera directions and cylinder axes by Euclidean magnitude rather than by checking each component independently. A vector can have several individually small components whose combined length is still usable, while a genuinely degenerate direction should be rejected according to the same scalar tolerance used by normalization and intersection code.

The parser now rejects any direction with length at or below `kEpsilon` before normalizing or constructing geometry. This keeps invalid orientation data out of the scene model and prevents it from being silently converted into a zero direction, where later camera-frame or cylinder calculations would have no well-defined axis.

## test(parser): 퇴화한 카메라와 원기둥 방향 검증
Lock down the parser's magnitude-based direction boundary for both consumers of orientation vectors. In-memory scenes with a camera direction or cylinder axis of length `1e-6` must raise `ParseError`, demonstrating that syntactically finite vectors are not automatically geometrically valid.

Testing camera and cylinder directives separately matters because both normalize their inputs but feed different downstream algorithms. The regression ensures the validation remains centralized at the input boundary and prevents either directive from bypassing the shared nondegeneracy rule.

## fix(image): 이미지 할당과 픽셀 인덱스 overflow 방지
Make image storage sizing an explicitly checked operation. Dimensions must be positive, and the multiplication `width * height * 3` is validated in `std::size_t` before allocation so signed integer overflow or wraparound cannot produce an undersized pixel buffer for a nominally large image.

PPM indexing is likewise promoted to `std::size_t` before multiplying row, width, and channel count. Casting only after the original integer expression, as before, could preserve an already-overflowed value. Performing every operand conversion first keeps allocation and serialization on the same index domain and preserves the invariant that every computed RGB offset lies within storage for a valid `Image`.

## test(image): 잘못된 차원과 저장 크기 계산 검증
Verify both sides of the new image-allocation contract. A valid 2-by-3 image must own exactly eighteen channel bytes, while zero and negative dimensions must be rejected with `std::invalid_argument` rather than producing an empty, wrapped, or misleadingly valid buffer.

These tests focus on observable construction behavior rather than attempting platform-dependent allocations near `std::size_t` limits. They protect the checked sizing path and make positivity an explicit invariant for every rendered or serialized image.

## fix(output): 표준 FNV-1a 기준값 적용
Correct the 64-bit FNV-1a offset basis used by image checksums. The previous decimal constant omitted a digit, so the byte-mixing operation resembled FNV-1a but did not implement its standard initialization and could not be compared with independent implementations.

Keeping the established prime and byte order while fixing the basis gives the checksum a documented, reproducible definition. The digest remains a compact regression fingerprint rather than a cryptographic integrity mechanism, but standardizing its constants removes an avoidable source of incompatible golden values.

## test(output): PPM과 렌더링 체크섬 기준 고정
Pin the checksum contract at two levels. A hand-constructed two-pixel image fixes the exact relationship between dimensions, pixel bytes, and the FNV-1a digest, while the basic scene checksum captures the complete deterministic rendering result after parsing, camera projection, intersections, lighting, quantization, and image layout.

The small golden localizes changes to checksum encoding; the scene golden exposes behavior changes anywhere in the rendering pipeline. Using both prevents an implementation from preserving one high-level digest accidentally while changing the checksum definition or pixel semantics underneath it.

## refactor(scene): 장면 도형의 단독 소유권 적용
Replace shared ownership of polymorphic shapes with exclusive ownership by `Scene`. Shapes are created with `std::make_unique`, transferred into the scene, and traversed through `unique_ptr`; no other subsystem retains ownership or requires reference-counted lifetime extension.

The type now makes this model explicit by deleting copy operations and retaining noexcept moves. A scene can be returned from the parser or moved into a benchmark without duplicating heterogeneous objects, while destruction releases every shape exactly once. This narrows the resource boundary and prepares acceleration structures to hold non-owning references without obscuring which object controls shape lifetime.

## perf(camera): 픽셀별 카메라 프레임 재계산 제거
Split camera-ray generation into a convenience overload that builds a frame and a lower-level overload that consumes an existing `CameraFrame`. Full-image rendering now computes the orthonormal basis, aspect-scaled viewport, and field-of-view projection once, then reuses those immutable values for every pixel.

The per-pixel calculation still owns screen-coordinate conversion and direction normalization, so the optimization removes only camera-invariant work. Retaining the original overload preserves the simple public contract for isolated callers while exposing the reusable representation needed by the hot rendering loop.

## test(camera): 재사용한 카메라 프레임의 동치 검증
Compare the original ray-generation path with the new precomputed-frame overload for a nontrivial camera, aspect ratio, and fractional pixel location. Both origin and normalized direction must be exactly equal.

This regression protects the optimization's central requirement: moving frame construction out of the pixel loop must alter cost, not projection semantics. Testing the two APIs directly localizes any future divergence before it appears only as a changed full-scene checksum.

## feat(accel): AABB 값과 결합 연산 구현
Introduce axis-aligned bounding boxes as the value foundation for spatial acceleration. An invalid default box uses inverted infinite extents, allowing a caller to distinguish “no accumulated bounds yet” from a real zero-volume box. Explicit boxes expose validity and centroid calculations, and `surroundingBox` forms the component-wise union needed to aggregate primitive bounds into tree nodes.

Keeping this representation independent of shapes and traversal separates geometric extent from ownership and intersection policy. The centroid supplies a stable spatial key for later partitioning, while validity prevents uninitialized bounds from entering acceleration decisions unnoticed.

## feat(accel): ray-box slab 교차 구현
Implement ray–AABB intersection by progressively clipping the caller's `[t_min, t_max]` interval against the three coordinate slabs. Negative directions swap each axis's entry and exit values, and an empty interval terminates immediately.

A zero direction is handled without division: the ray can continue only when its origin already lies within that slab. This explicitly covers parallel rays and avoids relying on infinities or NaNs from floating-point division. The optional entry value exposes the nearest surviving box boundary for future traversal ordering without changing the boolean culling contract.

## feat(accel): 도형 경계 계약과 구·평면 bounds 추가
Extend the polymorphic shape contract with optional finite bounds. The default is unbounded, allowing existing or inherently infinite geometry to remain correct without fabricating a box. Spheres provide the exact center-plus/minus-radius AABB, while planes explicitly return no bounds.

Using `std::optional<Aabb>` separates “unbounded” from an invalid box and lets a future accelerator partition shapes safely: bounded objects may enter the hierarchy, whereas planes must remain in a direct intersection path. The decision preserves the common `Shape` interface while making acceleration capability a property supplied by each geometry implementation.

## feat(accel): 원기둥의 보수적 bounds 계산 추가
Make every concrete shape state its bounding behavior and provide a finite AABB for an arbitrarily oriented capped cylinder. Each world-axis extent combines the cylinder's projected half-height with the projected radius of the circular cross-section, accounting for both the side surface and caps.

The result is deliberately conservative: epsilon padding covers the intersection implementation's accepted side range, cap radius is expanded consistently, and each bound is advanced one representable value outward with `std::nextafter`. A BVH box may include empty space, but it must never exclude a real primitive hit; false-positive traversal costs performance, whereas a false-negative bound changes the rendered image.

## test(accel): AABB와 도형 경계 계산 검증
Exercise the acceleration boundary conditions before constructing a hierarchy. Slab tests cover positive and negative ray directions, contact exactly on a box face, and a parallel ray outside the slab. The entry-distance assertion also verifies that clipping retains the nearest admissible parameter.

Shape checks establish exact sphere bounds, the plane's unbounded status, and a tight but outward-conservative box for a diagonally oriented cylinder. The cylinder assertions compare against analytically derived extents with a small upper allowance, preventing both under-bounding correctness failures and unnecessarily loose formulas from going unnoticed.

## feat(accel): BVH node와 연속 저장소 구성
Define the non-owning, index-based storage model for a bounding-volume hierarchy. `BvhPrimitive` pairs a scene shape index with its bounds; `BvhNode` stores either child indices for an interior node or a contiguous primitive range for a leaf. A positive primitive count is the leaf discriminator, avoiding per-node polymorphism or pointers.

Nodes and primitive indices live in contiguous vectors owned by `Bvh`, while the scene remains the sole owner of shapes. This representation supports cache-friendly iterative traversal and safe movement of the hierarchy, and it makes clearing both arrays the complete reset operation. Read-only accessors expose the built structure for traversal and verification without allowing external mutation.

## feat(accel): 결정적 중앙 분할 BVH 구축 구현
Build the hierarchy recursively from bounded primitives using a longest-centroid-axis median split. Each node first accumulates the exact union of its primitive bounds; ranges of four or fewer become contiguous leaves, while larger ranges are divided into balanced subranges. Reserving roughly two nodes per primitive keeps node indices stable while recursion appends children.

Construction is deterministic even when centroids coincide. A stable sort orders by the selected centroid coordinate and then by the original scene shape index, so equivalent input produces the same primitive order and tree topology. Determinism is important not only for reproducible performance data but also for preserving well-defined equal-distance hit behavior once traversal no longer follows scene insertion order.

## feat(accel): 선형·BVH 탐색 모드 계약 연결
Introduce `AccelMode` throughout the render, trace, shading, occlusion, and scene-intersection APIs so callers can select a linear reference path or BVH traversal without changing higher-level rendering code. BVH becomes the default setting, while the implementation still uses the linear path at this intermediate stage.

At the same time, make nearest-hit tie behavior explicit. Shape tests carry their original scene indices, and an exactly equal `t` replaces the previous hit only when the later shape index wins, matching the earlier sequential loop's effective semantics. Establishing this rule before changing traversal order prevents acceleration from silently changing which overlapping material or normal is selected.

## feat(scene): 가속 구조 소유권과 rebuild 경계 구성
Make `Scene` own the BVH, the list of unbounded shape indices, and an explicit readiness state. Building acceleration classifies each live shape by its optional valid bounds: finite primitives are copied into the BVH build input, while planes and other unbounded shapes remain in a separate direct-test list. The hierarchy stores indices only, preserving `Scene` as the single lifetime owner.

Adding any shape clears both derived structures and marks acceleration stale. This invalidation is essential because a BVH built over an earlier shape set cannot be queried safely as if current. Parsed scenes build only after all required directives and shapes have been validated, so a successfully returned scene is ready for the default accelerated render path while programmatically mutated scenes must rebuild.

## feat(accel): 결정적 BVH 최근접 순회 구현
Implement the accelerated nearest-hit path as an iterative traversal over the contiguous BVH. Linear mode and stale or unbuilt acceleration deliberately fall back to the complete shape scan, preserving correctness for programmatically modified scenes. The root and child boxes are clipped against the current closest hit, and stack entries whose box begins beyond that distance are discarded.

When both children are hit, the nearer entry is processed first; equal entries use the node index as a deterministic tie-breaker. The farther child remains on the stack and may later be pruned after a closer primitive is found. Leaves reuse the existing shape-index-aware hit selection, and unbounded primitives are tested after the tree, so traversal order changes cost without changing nearest-hit or equal-distance semantics. AABB tests are counted at the exact culling sites.

## test(accel): 선형 탐색과 BVH 결과 동치 검증
Add a dedicated acceleration regression suite that treats the linear scan as the semantic reference. For empty, single-bounded, unbounded-only, and arbitrary-axis-cylinder scenes, both modes must agree not only on hit existence and distance but also on point, normal, material, and the exact winning shape.

An overlapping-sphere case locks down the later-shape equal-distance rule independently of traversal order. A dense mixed scene then compares complete pixel buffers and checksums while requiring at least a fourfold reduction in primitive intersection calls. This combination verifies that the BVH is an optimization of the same rendering contract and that its measured benefit comes from culling rather than altered output.

## perf(benchmark): 선형 탐색과 BVH 작업량 비교
Extend the benchmark into a controlled side-by-side comparison of the linear reference and BVH paths over the same prebuilt dense scene. Each mode receives its own warm-up and five-run median, and every repeated sample must agree on checksum, primitive-test count, and AABB-test count.

The benchmark refuses to report if the two modes produce different images. Its structured output places elapsed time beside primary and shadow ray counts and both categories of intersection work, making it possible to distinguish true primitive-culling gains from extra box-testing overhead. Reusing one immutable scene also excludes parsing and hierarchy construction from the measured render interval.

## feat(material): metal 모델과 깊이 제한 반사 구현
Extend the material value with an explicit `Diffuse` or `Metal` type while retaining diffuse as the default, so existing scene construction and rendering behavior remain compatible. Diffuse hits continue through direct-light shading; metal hits instead create a perfect specular reflection using the incident direction and oriented surface normal.

Reflection is handled inside `traceRay`, where the remaining depth already defines recursive transport. A metal hit at depth zero returns black, preventing unbounded reflection chains. Otherwise the reflected ray starts one `kRayTMin` step along the normal to avoid immediately re-hitting the originating surface, inherits the selected acceleration mode and statistics sink, and decrements the depth. Multiplying the recursively traced color by albedo models a tinted mirror and records each spawned ray as secondary work.

## feat(parser): 선택적 도형 재질 문법 추가
Extend the `sp`, `pl`, and `cy` directives with one optional trailing material token while preserving the original forms. Exact-arity validation now accepts only the base field count or that count plus one; this keeps malformed extra arguments from being silently ignored.

Omitting the token maps to `Diffuse`, maintaining backward compatibility with existing `.rt` files. Explicit `diffuse` and `metal` values are converted at the parser boundary into `MaterialType`, while any other identifier raises a source- and line-aware `ParseError`. Applying the same helper to every shape keeps material syntax uniform and leaves geometry constructors consuming an already validated material value.

## test(material): 재질 파싱과 반사 깊이 검증
Add a material-focused regression target covering the grammar, recursive transport contract, and backward compatibility. Parsing tests establish that omitted material names remain diffuse, that all three shape directives accept explicit diffuse or metal values, and that an unknown material is rejected rather than treated as a default.

A one-surface mirror scene verifies the depth boundary and reflection calculation independently of direct lighting: depth zero must terminate in black, while one allowed bounce returns the background multiplied component-wise by the metal albedo. Repeating the trace checks determinism and the statistics assertion confirms exactly one secondary ray. The existing all-diffuse scene checksum is also retained, protecting the pre-material rendering path from unintended changes.

## refactor(render): 직렬 렌더링을 고정 tile 순회로 전환
Replace the row-major serial loop with a deterministic sequence of 16-by-16 tiles while intentionally keeping execution single-threaded. Edge tiles clamp their end coordinates to the image dimensions, so every valid pixel is visited exactly once even when the resolution is not divisible by the tile size.

Pixel storage is now addressed from `(x, y)` rather than a monotonically advanced cursor. That makes each tile an independent unit of work and removes any dependence between processing order and buffer position, which is the prerequisite for later concurrent scheduling. Camera rays, shading, color conversion, and statistics remain unchanged, preserving the existing image checksum while changing only the work decomposition.

## feat(render): 원자적 tile 분배와 작업자 통계 병합 구현
Parallelize the fixed tile decomposition with a pool of `std::thread` workers. A relaxed atomic counter assigns each tile index to exactly one worker; stronger memory ordering is unnecessary because the counter only distributes unique work and tile ownership guarantees that no two workers write the same pixel bytes. The shared scene and camera frame are read-only during rendering.

Each worker accumulates a separate, cache-line-aligned `RenderStats` instance, avoiding races and reducing contention on frequently incremented counters. After all workers join, the caller-visible statistics are reset and formed by summing those local values. The build now links the platform thread library explicitly. An RAII joiner also stops further allocation and joins already-created threads if worker construction exits early, preventing joinable-thread destruction during setup failure.

## feat(renderer): 작업자 수 설정과 자동 선택 추가
Expose renderer parallelism through `RenderSettings::threadCount`. A value of zero selects the platform-reported hardware concurrency, falling back to one when the platform cannot report it; an explicit nonzero value gives callers reproducible control over the worker count. In either case, the count is capped by the number of tiles so the renderer does not create workers that can never receive work.

The acceleration benchmark explicitly selects one worker. This keeps its linear-versus-BVH comparison focused on intersection work and avoids allowing scheduler variability or different amounts of parallel execution to obscure the acceleration measurement, while normal rendering retains automatic CPU utilization by default.

## test(render): 작업자 수에 따른 함수 결과 동치 검증
Add a renderer regression that crosses both independent execution choices: linear versus BVH intersection and one versus four worker threads. The scene includes multiple lights, bounded and unbounded geometry, diffuse shading, and a recursive metal path, ensuring the comparison exercises shared read-only scene state and all major statistics counters.

All four runs must produce byte-identical images and identical checksums. Within each acceleration mode, changing the worker count must also preserve primary, secondary, shadow, primitive-test, and AABB-test totals, proving that tile scheduling changes neither rendered semantics nor accounting. The explicit width-times-height primary-ray assertion additionally guards against skipped or duplicated pixels.

## refactor(cli): 위치 인자와 checksum option 모델 구성
Move command-line interpretation into a dedicated `CliOptions` value and `parseCli` boundary. The two required positional paths are separated from optional behavior, and render settings travel with the parsed options instead of being constructed implicitly at the call site. The execution path can therefore consume validated values without reinterpreting `argv`.

The parser accepts `--checksum` at most once and rejects every unknown or duplicated option through the existing usage-error exit path. Runtime failures remain distinct from syntax failures. Although behavior is intentionally unchanged, the option loop establishes a scalable contract for later value-bearing renderer switches without accumulating positional special cases in `main`.

## feat(cli): 가속 방식 선택 option 추가
Add `--accel linear|bvh` as a value-bearing command-line option and map it directly to `RenderSettings::accelMode`. This exposes the semantic reference implementation and the optimized implementation through the same executable, making output comparison and performance diagnosis possible without changing scene files or rebuilding.

The option parser rejects a missing value, an unsupported value, and repeated acceleration selections. It remains order-independent with `--checksum`, while the default render setting still selects BVH when the option is absent. Keeping validation in the CLI boundary ensures the renderer receives a valid enum rather than raw strings.

## feat(cli): 작업자 수 option 추가
Add `--threads N|auto` and translate it into the renderer's established thread-count contract. `auto` uses the sentinel value zero, while an explicit count must be a strictly positive decimal integer representable by `unsigned int`.

The shared unsigned parser first requires every character to be a digit, then checks complete conversion and an option-specific maximum while treating conversion exceptions as invalid input. This rejects signs, trailing text, overflow, zero, missing values, and duplicate thread options before rendering begins. The CLI therefore cannot pass a truncated or nonsensical worker count into thread creation.

## feat(cli): 반사 깊이 option과 기본값 추가
Expose recursive reflection depth as `--max-depth 0..32` and raise the default from one bounce to four. The default permits visibly useful multi-surface metal reflections without requiring an option, while the explicit setting lets callers terminate metal transport entirely at zero or explore deeper paths.

The existing bounded unsigned parser enforces the inclusive upper limit and rejects negative, malformed, missing, or duplicate values. Capping the value at 32 places a clear operational bound on recursively generated secondary rays rather than accepting arbitrary command-line integers that could cause excessive work.

## test(cli): 렌더링 옵션과 오류 종료 계약 검증
Add an executable-level CLI contract test that distinguishes invalid invocation from successful rendering. Missing positional arguments, unknown options, duplicate flags, missing option values, unsupported acceleration modes, nonpositive or overflowing thread counts, and malformed or out-of-range depths must all return status 2 and print the usage prefix on standard error.

Two valid boundary combinations then exercise the complete load-render-write path. A single-threaded linear render at depth zero and an automatic-threaded BVH render at depth 32 must both create nonempty files and emit a 16-digit lowercase checksum; because the fixture is diffuse-only, the checksums must match. This verifies option plumbing and exit semantics without allowing acceleration, scheduling, or irrelevant reflection depth to alter the image.

## test(render): smoke 검사의 fixture와 실행 경로 정리
Use the repository's maintained invalid scene as the smoke test's parser-failure fixture and assert that the diagnostic identifies `invalid.rt` line 3. The test continues to require that a rejected scene leaves no rendered output, now covering a concrete range-validation failure rather than constructing an unrelated unknown directive inline.

Read the three PPM header lines explicitly with `sed` before checking the magic value, dimensions, and maximum channel. This keeps the smoke test focused on the executable's observable parse and serialization contracts while removing duplicated fixture content from the script.

## test(render): 실행 모드별 PPM byte 결정성 검증
Add an end-to-end determinism test around the installed command path and serialized artifact, complementing the in-process pixel comparison. The same mixed diffuse, metal, bounded, and unbounded scene is rendered with linear or BVH intersection and with one or four workers at a fixed reflection depth.

Every run must emit the same checksum and `cmp` must find the complete P3 PPM files byte-for-byte identical to the single-threaded linear baseline. Checking serialized bytes catches differences in dimensions, channel ordering, formatting, or write behavior that an internal image-buffer assertion alone would not detect.

## build(sanitizers): 메모리와 정의되지 않은 동작 검사 구성
Add an opt-in `RAY_ENABLE_SANITIZERS` CMake configuration for AddressSanitizer and UndefinedBehaviorSanitizer. On Clang and GCC, the core target exports the sanitizer compile and link flags to dependent executables and tests, while retaining frame pointers for useful diagnostics. Unsupported compilers fail configuration explicitly instead of appearing to honor an ineffective option.

Keeping the setting disabled by default preserves ordinary builds, but a separate `build*` directory can now hold an instrumented configuration without entering version control. The instrumentation is particularly relevant to this renderer's manual buffer indexing, recursive rays, polymorphic ownership, BVH index traversal, and multithreaded execution.

## ci: 플랫폼별 빌드와 회귀 검사 자동화
Add continuous verification for every push and pull request. Release configurations build and run the full CTest suite independently on current Ubuntu and macOS runners, exercising the supported CMake path, platform thread integration, shell-based executable contracts, and deterministic rendering on both operating systems.

A separate Ubuntu debug job enables AddressSanitizer and UndefinedBehaviorSanitizer, turns leak detection and halt-on-error behavior on, and runs the same regression suite under instrumentation. Keeping release portability and sanitizer diagnostics as distinct jobs makes failures attributable while ensuring neither configuration is merely available locally but unused.

## perf(benchmark): 측정 schema와 가속 기준 검증 고정
Turn the renderer benchmark into a versioned, self-describing measurement contract. Repeated samples must now agree on every ray category as well as primitive tests, AABB tests, and checksum. The output records scene population, resolution, worker count, reflection depth, tile size, warm-up count, and measured-run count under `schemaVersion` 1, so reported numbers can be interpreted against the workload that produced them.

The benchmark also enforces its central acceleration requirement: BVH primitive tests must be below 25 percent of the linear count. It reports the primitive-test ratio and median time speedup separately, distinguishing the deterministic algorithmic reduction from environment-sensitive elapsed time. A run with a matching image but inadequate culling therefore fails instead of producing a superficially valid report.

## perf(benchmark): 참조 측정값 기록
Record one release-mode reference run using the benchmark's versioned schema, including the exact AppleClang, arm64, and logical-thread environment. Both traversal modes produced the same checksum and the same primary, shadow, and secondary ray counts, while the BVH reduced primitive intersections from 205,904,678 to 904,630 at the cost of 1,696,156 AABB tests.

The stored `0.004` primitive-test ratio captures the environment-independent work reduction for this fixed scene, whereas the measured `26.744` median speedup is explicitly tied to the recorded machine and toolchain. Preserving configuration and environment beside the results prevents the timing from being mistaken for a universal performance guarantee.

## fix(output): 불일치한 이미지 저장소 거부
Give `Image` an explicit representation check requiring its pixel vector to contain exactly `width * height * 3` bytes, with dimension and overflow rules delegated to the existing storage-size calculation. This closes a gap left by public image fields: callers could previously shrink or enlarge the vector after construction and then make output code index storage that no longer matched the declared dimensions.

Both checksum generation and PPM writing validate before consuming pixels. A malformed image is therefore rejected consistently rather than producing an out-of-bounds read, a partial file, or a checksum that appears to describe the declared image. Performing validation before opening the destination also avoids truncating an existing file for data that was invalid before I/O began.

## test(output): 잘못된 이미지 저장소 처리 검증
Add regression coverage for both directions of the image-storage invariant. Removing one byte from a two-pixel image must make checksum generation and PPM writing throw `std::invalid_argument`; adding excess bytes must also make direct validation fail.

The writer case starts with an existing file and verifies its contents remain unchanged after the malformed image is rejected. This locks down the ordering established by validation: representation errors must be detected before the destination is opened or truncated, not merely before the first invalid pixel access.

## fix(output): PPM 출력 실패 시 기존 파일 보존
Separate PPM serialization from destination-file replacement by adding an `std::ostream` overload, then make path-based writes transactional. The complete image is validated and serialized to a uniquely named temporary file beside the destination. Stream exceptions, an explicit post-write state check, `flush`, and `close` ensure all output has succeeded before replacement is attempted.

Only the finished temporary file replaces the target: POSIX uses same-directory `rename`, while Windows uses `MoveFileEx` with replace-existing and write-through flags. A scope guard removes the temporary artifact on every uncommitted path, including open, serialization, flush, close, or replacement failure. Consequently an earlier valid PPM remains intact until a complete successor is ready, and callers receive the underlying replacement error instead of being left with a silently truncated destination.

## test(output): 출력 실패의 대상 보존과 정리 검증
Add a dedicated failure-path suite for the transactional PPM writer. A custom stream buffer that refuses all writes verifies that the stream overload reports serialization failure rather than accepting a bad stream state. A successful path replaces pre-existing contents with the exact expected P3 bytes and leaves no temporary sibling behind.

Replacement failure is forced by making the requested destination an existing directory containing a sentinel file. The writer must raise an error, preserve both the destination type and its contents, and remove the temporary file it had already written. These cases establish that cleanup and destination preservation hold on both sides of the commit point, not only for invalid image input.

## fix(renderer): 작업자 예외를 호출자에게 전달
Catch every exception at the worker-thread boundary instead of allowing it to escape a thread function and invoke `std::terminate`. Each worker owns one `std::exception_ptr` slot, so recording the original exception requires no shared lock. On failure, the worker advances the atomic tile cursor to the terminal value, preventing unclaimed tiles from being assigned while other workers finish work already in progress.

The calling thread joins every worker before inspecting the error slots, then rethrows the captured exception before merging statistics or returning a partially rendered image. This preserves the original exception type and message, guarantees thread reclamation, and restores `renderScene`'s ordinary synchronous contract: rendering failures are reported to its caller rather than terminating the process.

## test(renderer): 작업자 실패 전파와 회수 검증
Introduce a test-only `Shape` whose intersection method throws a distinctive runtime error and whose unbounded classification guarantees it is evaluated by the BVH-mode scene path. Rendering a multi-tile image with multiple requested workers must return that exact error to the `renderScene` caller.

Reaching the assertion after the call demonstrates that the exception did not escape a worker and terminate the process, while the call's completion requires the renderer to stop assigning work and join its worker threads before rethrowing. The sentinel message also confirms that propagation preserves the originating failure rather than replacing it with a generic concurrency error.

## fix(accel): 가속 구조의 도형 불변식 보호
Make both shape geometry and the scene's shape container externally read-only so a built acceleration structure cannot silently outlive the data from which its bounds and primitive indices were derived. Sphere, plane, and cylinder parameters move behind const accessors, while construction remains the point that establishes stored values such as normalized plane normals and cylinder axes. Intersection and bounds calculations are migrated to the private representation without changing their geometric contracts.

`Scene` now owns its shape vector privately and exposes only a count plus checked, const element access. All structural mutation therefore passes through `addShape`, which clears the BVH, clears the unbounded-shape index set, and marks acceleration unavailable. This converts cache invalidation from a convention that callers could bypass into an enforceable ownership boundary: external code can inspect current geometry, but it cannot mutate geometry or reorder the shape storage while stale BVH bounds and indices remain marked usable.

## test(accel): 장면 변경과 가속 상태 불변식 검증
Lock down the acceleration ownership boundary at both compile time and runtime. Type-trait assertions verify that `Scene` no longer exposes mutable shape storage, that indexed shape access returns `const Shape&`, and that representative sphere, plane, and cylinder geometry accessors cannot be assigned through. These checks protect the API property that prevents callers from changing data behind an already built BVH.

The runtime regression builds acceleration for one shape, adds another shape through the supported scene boundary, and verifies that the addition increases the visible shape count while invalidating acceleration. A BVH-mode query must then fall back to the current linear geometry and find the newly added shape rather than consulting stale indices. Rebuilding acceleration must preserve the same hit, demonstrating that invalidation, fallback, and reconstruction form one coherent state transition and that the rebuilt BVH indexes the current scene.
