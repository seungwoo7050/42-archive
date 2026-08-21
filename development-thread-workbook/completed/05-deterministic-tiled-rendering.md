# Thread 5. Deterministic tiled rendering and worker failure recovery

## 1. Thread 목표

row-major serial renderer를 고정 tile work unit으로 바꾼 뒤, atomic claim과 worker-owned pixels로 병렬화하고, worker count와 schedule이 pixels·checksums·semantic counters를 바꾸지 않으며 worker failure도 caller로 복구되는 과정을 복원합니다.

### Source significance

> The preparatory tile refactor separates pixel addressing from execution order, after which the
> scheduler can claim tiles without overlapping writes. Determinism follows from per-pixel
> independence, fixed intra-pixel operation order, explicit hit tie-breaking, and integer statistic
> merging—not from deterministic thread scheduling. The later exception fix closes the lifecycle gap
> left by the initial parallel implementation: a failure inside `traceRay` must not escape a worker,
> terminate the process, or return a partial successful image.

### 이 Thread에 연결된 source invariant

- A pixel byte is written by exactly one worker; thread count and tile completion order must not change pixels, checksums, or semantic work counts for a fixed mode and scene.
- All started worker threads are joined. Worker failures are surfaced on the caller thread rather than escaping a worker or yielding a partial successful image.

### 이 Thread에 연결된 engineering difficulty

- Parallelizing image generation without overlapping writes or schedule-dependent floating-point accumulation while still producing deterministic statistics.
- Recovering safely from thread creation or worker-body failure and transferring the original failure to the caller after complete thread cleanup.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 16×16 tile decomposition이 image edge에서 모든 픽셀을 정확히 한 번 방문하는 근거는 무엇인가?
- relaxed atomic counter만으로 tile assignment가 충분한 이유와 pixel memory race가 없는 이유는 무엇인가?
- scene/camera shared-read와 worker-local stats가 schedule-dependent 결과를 어떻게 피하는가?
- worker count auto/explicit/cap policy가 scheduler semantics와 benchmark reproducibility에 어떤 영향을 주는가?
- in-process pixel/work equivalence와 CLI PPM byte equivalence가 서로 다른 무엇을 검증하는가?
- 초기 worker body에서 exception이 발생하면 왜 `std::terminate`가 문제였고, 최종 fix는 어떤 cleanup ordering을 보장하는가?

## 3. 완료 기준

- [x] serial tile loop와 parallel worker loop의 동일한 pixel kernel을 비교했습니다.
- [x] tile index → tile bounds → `(x, y)` → RGB offset의 ownership 경로를 기록했습니다.
- [x] atomic ordering, per-worker stats, join, merge 순서를 실제 코드에서 확인했습니다.
- [x] one/four workers와 linear/BVH 조합에서 image와 counters가 같아야 하는 이유를 테스트별로 설명할 수 있습니다.
- [x] worker creation failure와 worker-body failure의 cleanup 경로를 구분했습니다.
- [x] throwing shape regression이 원래 예외 type/message, stop-assignment, join, rethrow를 어떻게 증명하는지 연결했습니다.
- [x] 모든 참조 SHA가 `cpp/miniRT` branch HEAD의 ancestry에 속하는지 확인했습니다.
- [ ] 해당 SHA checkout에서 build/test/benchmark 명령을 직접 실행했습니다. 로컬 외부 네트워크와 checkout이 제공되지 않아 실행 evidence는 만들지 않았습니다.

### 검증 범위

- 지정 branch HEAD: `7d08c7c13fa68c3e60eea3c7014658b0a133e6f0`
- 각 참조 SHA는 Thread 내부의 연속 compare chain에서 `behind_by = 0`, merge base가 선행 SHA였고, Thread 종료 SHA도 branch HEAD의 조상으로 확인했습니다.
- 구현 설명은 해당 commit의 diff/file content를 기준으로 작성했으며, final HEAD의 후속 API를 과거 SHA에 소급하지 않았습니다.
- 테스트와 benchmark는 source mechanism과 production path만 검사했습니다. 실행 결과, sanitizer 결과, wall-clock 수치는 기록하지 않았습니다.

## 4. Commit map

1. `498266fc0abf` — `refactor(render): 직렬 렌더링을 고정 tile 순회로 전환`
   - Importance: B
   - Tags: REFACTOR, CONCURRENCY, DETERMINISM
   - Source-defined role: Converts serial row loop into fixed tile traversal without threads.

2. `849f878ca0b0` — `feat(render): 원자적 tile 분배와 작업자 통계 병합 구현`
   - Importance: S
   - Tags: ARCH, CONCURRENCY, DETERMINISM
   - Source-defined role: Distributes tiles atomically, assigns disjoint pixel writes, merges worker-local stats.

3. `18459bfda416` — `feat(renderer): 작업자 수 설정과 자동 선택 추가`
   - Importance: B
   - Tags: CONCURRENCY, PERF
   - Source-defined role: Adds explicit/automatic worker-count policy.

4. `3619550fa354` — `test(render): 작업자 수에 따른 함수 결과 동치 검증`
   - Importance: A
   - Tags: TEST, CONCURRENCY, DETERMINISM
   - Source-defined role: Verifies equal pixels/work 1 vs 4 workers in both accel modes.

5. `ca2d108f2255` — `test(render): 실행 모드별 PPM byte 결정성 검증`
   - Importance: A
   - Tags: TEST, DETERMINISM, OUTPUT
   - Source-defined role: Verifies exact PPM-byte equality through CLI.

6. `0536e4829070` — `fix(renderer): 작업자 예외를 호출자에게 전달`
   - Importance: A
   - Tags: CONCURRENCY, RISK, DEBUG
   - Source-defined role: Captures worker failures, stops new work, joins all workers, rethrows caller.

7. `b5c708ac981a` — `test(renderer): 작업자 실패 전파와 회수 검증`
   - Importance: A
   - Tags: TEST, CONCURRENCY, RISK
   - Source-defined role: Injects throwing shape to lock propagation/recovery.

## 5. Commit별 학습 기록

### 5.1 `498266fc0abf` — `refactor(render): 직렬 렌더링을 고정 tile 순회로 전환`

- Importance: B
- Tags: REFACTOR, CONCURRENCY, DETERMINISM
- Thread order: 1/7

#### Source에서 확정된 역할

- Development Thread role: Converts serial row loop into fixed tile traversal without threads.

#### B-level 구현 역할 복원

- **직전 관련 상태:** row-major serial loop는 정확하지만 병렬 scheduler가 나눌 명시적인 work unit이 없습니다. 바로 thread를 추가하면 pixel addressing 변화와 scheduling 변화가 한 commit에 섞여 결과 drift 원인을 구분하기 어렵습니다.
- **핵심 구현 결정:** thread를 추가하지 않고 image를 고정 16×16 tile grid로 분해합니다. tile index를 `(tileX,tileY)`로 바꾸고 마지막 tile의 end를 image width/height로 clamp한 뒤 tile 내부를 안정된 y/x 순서로 순회합니다. pixel center, camera ray, trace, clamp, quantization, global RGB offset은 기존과 동일합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - src/renderer.cpp — serial 16×16 tile decomposition and unchanged pixel kernel
- **caller → callee / data flow:** image dimensions → ceil-div tile counts → row-major tile index → clipped tile bounds → each pixel → existing ray/color/byte path
- **ownership·state transition:** execution은 여전히 한 thread이며 Image가 유일한 mutable output입니다. 각 pixel은 정확히 한 tile에 속합니다.
- **failure/edge branch:** edge tile을 fixed size로 처리하면 image 밖을 쓰거나 마지막 row/column을 누락할 수 있습니다. global offset 대신 tile-local offset을 쓰면 storage 위치가 달라집니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 병렬화 전 work partition을 고정하면서 serial image semantics를 유지합니다.
- **이 SHA가 보장하지 않는 것:** worker, atomic claim, stats merge, failure recovery는 아직 없습니다.
- **직접 확인/후속 evidence:** tile count ceiling, clipped bounds와 기존 pixel kernel 재사용을 해당 SHA에서 확인했습니다.

#### Thread 내 연결

- 이전 Thread commit: 이 Thread의 시작점
- 다음 Thread commit: `849f878ca0b0`
- 이 commit이 다음 단계에 제공하는 것: `849f878ca0b0`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.2 `849f878ca0b0` — `feat(render): 원자적 tile 분배와 작업자 통계 병합 구현`

- Importance: S
- Tags: ARCH, CONCURRENCY, DETERMINISM
- Thread order: 2/7

#### Source에서 확정된 역할

- Development Thread role: Distributes tiles atomically, assigns disjoint pixel writes, merges worker-local stats.

#### S-level architecture와 invariant 복원

- **직전 관련 상태:** fixed tiles가 있어도 여러 worker가 같은 tile/pixel을 처리하지 않게 분배하고, semantic counters를 race 없이 합치며, thread creation 중간 실패 시 시작한 thread를 회수해야 합니다.
- **핵심 구현 결정:** atomic `nextTile.fetch_add(1, memory_order_relaxed)`로 각 tile index를 한 worker에게만 배정합니다. tile partition이 서로 겹치지 않으므로 worker는 lock 없이 global Image의 disjoint byte range를 씁니다. Scene/camera/frame은 shared read-only이고 worker마다 cache-line 정렬된 `RenderStats`를 보유합니다. caller는 모든 worker를 join한 뒤 integer counters를 정해진 순서로 합칩니다. `ThreadJoiner` RAII가 thread construction 또는 caller-side failure에서도 이미 시작한 thread를 join합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - src/renderer.cpp — worker function, atomic tile claim, thread creation/join, stats merge
  - CMakeLists.txt — Threads dependency
- **caller → callee / data flow:** tile_count + worker_count → threads start → relaxed atomic unique claims → disjoint pixel kernel + local stats → join all → deterministic integer merge → Image/stats return
- **ownership·state transition:** shared mutable scheduler state는 atomic counter 하나이고, shared Image writes는 주소가 disjoint합니다. worker-local stats만 각 thread가 변경합니다. merge 전까지 global stats를 동시 수정하지 않습니다.
- **failure/edge branch:** 이 초기 implementation은 thread 생성/호출자 예외의 join은 처리하지만 worker body 안에서 `traceRay`가 던진 예외는 thread entry 밖으로 빠져 `std::terminate`를 유발합니다. 이 gap은 `0536e4829070`에서 수정됩니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 정상 경로에서 tile 중복 없이 병렬 pixel 생성, race-free local stats, complete join 후 deterministic integer aggregation을 제공합니다.
- **이 SHA가 보장하지 않는 것:** worker exception을 caller에게 전달하지 못합니다. schedule 자체는 nondeterministic이지만 pixel 결과는 independent kernel과 tie rule에 의존합니다.
- **직접 확인/후속 evidence:** atomic memory order, disjoint tile writes, local stats array, join/merge와 RAII joiner를 해당 SHA에서 확인했습니다.

#### Thread 내 연결

- 이전 Thread commit: `498266fc0abf`
- 다음 Thread commit: `18459bfda416`
- 이 commit이 다음 단계에 제공하는 것: `18459bfda416`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.3 `18459bfda416` — `feat(renderer): 작업자 수 설정과 자동 선택 추가`

- Importance: B
- Tags: CONCURRENCY, PERF
- Thread order: 3/7

#### Source에서 확정된 역할

- Development Thread role: Adds explicit/automatic worker-count policy.

#### B-level 구현 역할 복원

- **직전 관련 상태:** 병렬 renderer가 내부에서 worker 수를 고정하면 작은 image에서 과도한 thread를 만들고 benchmark가 머신마다 다른 worker 수를 사용해 비교하기 어렵습니다.
- **핵심 구현 결정:** `RenderSettings::threadCount`를 추가합니다. 0은 `hardware_concurrency()` 기반 자동 선택이며 API가 0을 반환하면 1로 fallback합니다. explicit/auto 모두 최소 1이고 tile count보다 크게 만들지 않습니다. benchmark는 reproducible comparison을 위해 explicit 1 worker를 지정합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - include/ray/renderer.hpp — `threadCount` setting
  - src/renderer.cpp — auto/fallback/cap policy
  - benchmarks/render_benchmark.cpp — explicit one-worker setting
- **caller → callee / data flow:** settings.threadCount → explicit or hardware count → zero fallback → cap to tile count → worker launch
- **ownership·state transition:** thread count는 scheduling policy이고 pixel semantics에는 참여하지 않습니다. no-work/empty tile count에서 불필요한 worker를 만들지 않는 경계가 생깁니다.
- **failure/edge branch:** `hardware_concurrency()==0`을 그대로 사용하면 worker가 없어 image가 채워지지 않습니다. tile 수보다 많은 worker는 의미 없이 resource를 소모합니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** portable auto policy와 deterministic benchmark용 explicit override를 제공합니다.
- **이 SHA가 보장하지 않는 것:** thread affinity, work stealing, adaptive tile size는 제공하지 않습니다.
- **직접 확인/후속 evidence:** 0 semantics, fallback 1, tile cap, benchmark explicit setting을 확인했습니다.

#### Thread 내 연결

- 이전 Thread commit: `849f878ca0b0`
- 다음 Thread commit: `3619550fa354`
- 이 commit이 다음 단계에 제공하는 것: `3619550fa354`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.4 `3619550fa354` — `test(render): 작업자 수에 따른 함수 결과 동치 검증`

- Importance: A
- Tags: TEST, CONCURRENCY, DETERMINISM
- Thread order: 4/7

#### Source에서 확정된 역할

- Development Thread role: Verifies equal pixels/work 1 vs 4 workers in both accel modes.

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** parallel design reasoning만으로 one/four workers가 exact same pixels와 work를 만든다고 보장할 수 없습니다. Linear/Bvh traversal mode도 함께 바뀌면 race나 counter 누락이 mode-specific하게 드러날 수 있습니다.
- **핵심 구현 결정:** `tests/render_tests.cpp`가 96×54 scene에 diffuse/metal/plane/cylinder를 넣고 Linear/Bvh 각각 threadCount 1과 4를 렌더합니다. pixel vector와 checksum을 exact 비교하고 primary/secondary/shadow/primitive/AABB counters도 같은 mode의 worker 수 사이에서 비교합니다. primary count가 `96*54`인지도 확인합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - tests/render_tests.cpp — worker-count differential render tests
  - src/renderer.cpp — scheduler/pixel kernel/stats merge
  - src/scene.cpp — both acceleration modes
- **caller → callee / data flow:** same Scene/settings except threadCount → mode별 1-worker baseline → 4-worker result → bytes/checksum/work equality
- **ownership·state transition:** worker count만 독립 변수이고 Scene, mode, depth, resolution은 고정됩니다.
- **failure/edge branch:** tile overlap/missing tile, shared stats race, schedule-dependent floating accumulation이 있으면 pixels 또는 counters가 달라집니다.

#### Test commit 분석 기준

- **대상 production invariant:** 고정 scene/mode에서 thread count는 pixels/checksum/work counters를 바꾸지 않습니다.
- **test technique:** 1-vs-4 worker exact buffer/checksum/counter comparison across Linear/Bvh
- **통과하는 production path:** `renderScene` scheduler → full ray/scene/shading pipeline
- **이 test가 증명하는 것:** 대표 scene에서 disjoint-write와 local-stats design의 결과 동치를 증명합니다.
- **이 test가 증명하지 않는 것:** CLI bytes, worker failure, data-race sanitizer 결과를 증명하지 않습니다.
- **실행 상태:** 테스트 구현과 production 호출 경로는 해당 SHA에서 확인했지만, 이 환경에서는 checkout/build가 불가능해 명령을 실행하지 않았습니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 선택된 mixed-material scene에서 worker schedule이 exact output과 semantic work를 바꾸지 않음을 고정합니다.
- **이 SHA가 보장하지 않는 것:** worker exception, CLI option parsing, every thread count/platform을 증명하지 않습니다.
- **직접 확인/후속 evidence:** 테스트 성격: in-process deterministic differential integration. 소스를 검사했으며 실행하지 않았습니다.

#### Thread 내 연결

- 이전 Thread commit: `18459bfda416`
- 다음 Thread commit: `ca2d108f2255`
- 이 commit이 다음 단계에 제공하는 것: `ca2d108f2255`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.5 `ca2d108f2255` — `test(render): 실행 모드별 PPM byte 결정성 검증`

- Importance: A
- Tags: TEST, DETERMINISM, OUTPUT
- Thread order: 5/7

#### Source에서 확정된 역할

- Development Thread role: Verifies exact PPM-byte equality through CLI.

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** in-process Image equality가 같아도 CLI option routing이나 PPM serialization이 mode/worker setting에 따라 다른 artifact를 만들 수 있습니다.
- **핵심 구현 결정:** `tests/render_determinism.sh`가 같은 scene을 Linear/Bvh × 1/4 workers 네 조합으로 CLI 실행합니다. 각 checksum을 비교하고 `cmp -s`로 PPM bytes를 exact 비교합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - tests/render_determinism.sh — four-mode CLI regression
  - src/main.cpp — accel/thread options
  - src/output.cpp — PPM serialization
- **caller → callee / data flow:** temporary scene/output paths → four CLI invocations → checksum capture/equality → PPM byte comparisons → cleanup
- **ownership·state transition:** process boundary, argument parsing, rendering, serialization 전체가 포함됩니다. output files는 temp area에 격리됩니다.
- **failure/edge branch:** CLI가 setting을 잘못 전달하거나 writer ordering이 달라지면 in-process test는 통과해도 byte comparison이 실패합니다.

#### Test commit 분석 기준

- **대상 production invariant:** acceleration mode와 worker count는 external PPM bytes/checksum을 바꾸지 않습니다.
- **test technique:** 네 CLI process 실행, checksum equality, `cmp -s` exact bytes
- **통과하는 production path:** `main` option parsing → render → output
- **이 test가 증명하는 것:** process boundary를 포함한 deterministic artifact equivalence를 증명합니다.
- **이 test가 증명하지 않는 것:** 실패 cleanup, sanitizer, 성능 향상을 증명하지 않습니다.
- **실행 상태:** 테스트 구현과 production 호출 경로는 해당 SHA에서 확인했지만, 이 환경에서는 checkout/build가 불가능해 명령을 실행하지 않았습니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 테스트된 mode/worker 조합의 externally published PPM과 checksum이 동일합니다.
- **이 SHA가 보장하지 않는 것:** atomic writer failure나 worker exception을 주입하지 않습니다.
- **직접 확인/후속 evidence:** 테스트 성격: end-to-end deterministic CLI integration. 스크립트를 검사했으며 실행하지 않았습니다.

#### Thread 내 연결

- 이전 Thread commit: `3619550fa354`
- 다음 Thread commit: `0536e4829070`
- 이 commit이 다음 단계에 제공하는 것: `0536e4829070`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.6 `0536e4829070` — `fix(renderer): 작업자 예외를 호출자에게 전달`

- Importance: A
- Tags: CONCURRENCY, RISK, DEBUG
- Thread order: 6/7

#### Source에서 확정된 역할

- Development Thread role: Captures worker failures, stops new work, joins all workers, rethrows caller.

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** 초기 worker lambda는 `traceRay`/shape code가 던진 예외를 catch하지 않습니다. C++ thread entry를 빠져나간 예외는 caller가 catch할 수 없고 `std::terminate`를 호출하므로 RAII joiner만으로는 정상 recovery가 불가능합니다.
- **핵심 구현 결정:** worker별 `std::exception_ptr` slot을 만들고 worker body 전체를 try/catch로 감쌉니다. catch는 `std::current_exception()`을 저장하고 `nextTile.store(tileCount)`로 새 work claim을 중단시킵니다. caller는 시작한 모든 thread를 먼저 join한 다음 error slots를 deterministic order로 검사해 첫 예외를 `std::rethrow_exception`합니다. stats merge와 successful Image 반환은 error scan 뒤에만 수행됩니다.

#### Failure → Fix 연결

- **기존 가정:** RAII joiner가 있으면 worker 내부 production exception도 caller가 처리할 수 있습니다.
- **실제 failure 또는 위험:** thread entry 밖으로 빠지는 예외는 caller로 전파되지 않고 `std::terminate`를 호출합니다.
- **root cause:** exception transport channel과 post-join rethrow 순서가 없었습니다.
- **수정된 decision/invariant:** worker-local `exception_ptr` capture, global new-work stop, complete join, caller rethrow를 추가합니다.
- **regression 연결:** `b5c708ac981a`의 throwing shape가 exact type/message recovery를 고정합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - src/renderer.cpp — worker error slots, stop signal, join, post-join rethrow
- **caller → callee / data flow:** worker production exception → catch/store → scheduler stop → other workers finish current tile/exit → caller joins all → error scan → original exception rethrow
- **ownership·state transition:** exception ownership은 worker stack에서 `exception_ptr` value로 이전됩니다. Image 일부가 이미 써졌을 수 있지만 caller에게 성공값으로 반환되지 않습니다. 모든 thread resource cleanup이 rethrow보다 앞섭니다.
- **failure/edge branch:** join 전에 rethrow하면 아직 실행 중인 thread와 joinable thread destructor 문제가 남습니다. catch 없이 thread boundary를 넘으면 process가 terminate됩니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** worker-body failure를 original dynamic type/message로 caller thread에 전달하고, 모든 started worker를 회수한 뒤 실패합니다.
- **이 SHA가 보장하지 않는 것:** 이미 계산된 partial bytes를 rollback하지는 않지만 실패 결과로 노출하지 않습니다. worker가 cooperative stop 전에 진행 중인 tile은 끝낼 수 있습니다.
- **직접 확인/후속 evidence:** catch/store/stop, join-all, post-join error scan/rethrow ordering을 해당 SHA에서 확인하고 throwing-shape test와 연결했습니다.

#### Thread 내 연결

- 이전 Thread commit: `ca2d108f2255`
- 다음 Thread commit: `b5c708ac981a`
- 이 commit이 다음 단계에 제공하는 것: `b5c708ac981a`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.7 `b5c708ac981a` — `test(renderer): 작업자 실패 전파와 회수 검증`

- Importance: A
- Tags: TEST, CONCURRENCY, RISK
- Thread order: 7/7

#### Source에서 확정된 역할

- Development Thread role: Injects throwing shape to lock propagation/recovery.

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** exception transport fix가 있어도 실제 `Shape::intersect` 호출 중 worker thread에서 던져지는 실패를 deterministic하게 재현하지 않으면 catch boundary가 빠져도 검출하기 어렵습니다.
- **핵심 구현 결정:** `tests/render_tests.cpp`에 unbounded `ThrowingShape`를 두고 `intersect`가 `std::runtime_error("worker exception sentinel")`를 던지게 합니다. 32×16 image와 4 workers로 render를 호출해 동일 exception type/message가 caller에서 관찰되는지 확인합니다. 호출이 test assertion까지 돌아온다는 사실은 process termination이 없고 renderer의 join/rethrow path가 완료됐음을 전제로 합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - tests/render_tests.cpp — `ThrowingShape` and worker-failure regression
  - src/renderer.cpp — worker catch/stop/join/rethrow
  - src/scene.cpp — unbounded shape dispatch
- **caller → callee / data flow:** parallel render → worker tile → ray trace → Scene dispatch → `ThrowingShape::intersect` throws → renderer capture/stop/join → caller catches sentinel
- **ownership·state transition:** failure injection은 매번 같은 production acquisition/dispatch 지점에서 발생합니다. 외부 mutable flag나 timing에 의존하지 않습니다.
- **failure/edge branch:** fix 전에는 expected catch로 돌아오지 않고 process termination이 발생합니다. wrong message/type 또는 swallowed failure도 assertion이 잡습니다.

#### Test commit 분석 기준

- **대상 production invariant:** worker production failure는 process를 종료하거나 성공 image를 반환하지 않고 caller에 재전파됩니다.
- **test technique:** custom throwing Shape를 실제 scene dispatch에 삽입하고 exact exception type/message assertion
- **통과하는 production path:** parallel `renderScene` → `traceRay` → `Scene::intersect` → Shape virtual dispatch → worker recovery
- **이 test가 증명하는 것:** worker-body 예외가 caller에서 관찰되고 renderer가 control을 되돌립니다.
- **이 test가 증명하지 않는 것:** 모든 thread resource를 external leak detector로 측정하거나 partial pixels rollback을 증명하지 않습니다.
- **실행 상태:** 테스트 구현과 production 호출 경로는 해당 SHA에서 확인했지만, 이 환경에서는 checkout/build가 불가능해 명령을 실행하지 않았습니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 실제 production worker path에서 deterministic exception propagation과 caller recovery를 고정합니다.
- **이 SHA가 보장하지 않는 것:** 모든 worker가 정확히 어느 tile에서 멈췄는지, partial pixel count, thread leak을 별도 counter로 직접 측정하지는 않습니다. join은 성공적인 caller return/rethrow 경로와 production code 검사로 확인합니다.
- **직접 확인/후속 evidence:** 테스트 성격: deterministic failure injection + concurrency lifecycle regression. 실행은 하지 않았습니다.

#### Thread 내 연결

- 이전 Thread commit: `0536e4829070`
- 다음 Thread commit: 이 Thread의 종료점
- 이 commit이 Thread 종료에 제공하는 것: Thread-level invariant ledger와 최종 실행 흐름에서 이 SHA의 결과를 최종 상태에 반영했습니다.

## 6. Invariant ledger

| Invariant | 최초 도입/기준 | 강화 또는 수정 | 부족함/위험 노출 | 고정한 test/evidence | 실제 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| 각 pixel은 정확히 한 tile에 속함 | 498266fc0abf | 849f878ca0b0 | edge tile 누락/overlap | 3619550fa354/ca2d108f2255 | ceil grid, clipped bounds, unique atomic claim |
| worker count/schedule은 bytes와 work를 바꾸지 않음 | 849f878ca0b0 | 18459bfda416 | shared writes/stats race | 3619550fa354/ca2d108f2255 | disjoint pixels, local stats, exact comparisons |
| started threads는 모두 join됨 | 849f878ca0b0 creation-path RAII | 0536e4829070 worker-body path | worker exception이 `std::terminate` | b5c708ac981a | capture→stop→join→rethrow |
| worker failure는 성공 image로 반환되지 않음 | 0536e4829070 | 0536e4829070 | partial bytes가 존재할 수 있음 | b5c708ac981a | post-join error scan precedes result return |

### Ledger 보완 기록

- 각 invariant는 위 표의 SHA에서 observable behavior 또는 state로 처음 나타났습니다.
- 후속 commit이 같은 용어를 사용하더라도 그 보장을 과거 SHA에 소급하지 않았습니다.
- test/evidence 열은 production path와 assertion 또는 deterministic work gate를 함께 가리킵니다.
- 실행하지 않은 test는 source-level evidence로만 기록했습니다.

## 7. Failure → Fix → Test 연결

| Failure 또는 위험 | Decision/Fix | Test 또는 evidence | 실제 failure path와 assertion |
| --- | --- | --- | --- |
| tile edge 계산 오류/중복 claim | clipped fixed tiles + atomic fetch_add | 3619550fa354 | 1/4 worker exact pixels and primary count |
| schedule-dependent stats | worker-local counters + post-join integer merge | 3619550fa354 | mode별 counter equality |
| CLI setting 또는 serialization drift | same pixel kernel and output path | ca2d108f2255 | four-mode checksum/PPM `cmp -s` |
| worker production exception이 process terminate | `exception_ptr` capture, stop, join, rethrow | b5c708ac981a | throwing Shape sentinel recovered at caller |

### 연결 검토

- feature commit도 어떤 잘못된 state 또는 semantic drift를 막는지 production path에 연결했습니다.
- fix commit은 기존 가정 → 실제 위험 → root cause → corrected decision → regression 순서로 기록했습니다.
- test가 broad integration인지 deterministic boundary/differential/failure-injection regression인지 commit 기록에서 구분했습니다.
- assertion이 증명하지 않는 범위와 실행하지 못한 항목을 별도로 남겼습니다.

## 8. Ownership / state / responsibility 변화

`Image`는 caller-side renderer invocation이 소유하지만 각 tile의 byte range는 claim한 worker에게
일시적으로 독점됩니다. Scene, camera frame과 acceleration은 shared read-only입니다. atomic
counter는 tile ownership만 배정하고 pixel ordering을 동기화하지 않습니다. 각 worker가 자체
`RenderStats`와 `exception_ptr` slot을 소유합니다. caller는 thread objects의 owner이며 모든
started thread를 join한 뒤 stats/error ownership을 회수합니다. 실패 시 exception value만
caller로 전송되고 partial Image는 성공 결과로 반환되지 않습니다.

### 학습자 최종 기록

- **source state와 derived state:** `Image`는 caller-side renderer invocation이 소유하지만 각 tile의 byte range는 claim한 worker에게 일시적으로 독점됩니다. Scene, camera frame과 acceleration은 shared read-only입니다. atomic counter는 tile ownership만 배정하고 pixel ordering을 동기화하지 않습니다. 각 worker가 자체 `RenderStats`와 `exception_ptr` slot을 소유합니다. caller는 thread objects의 owner이며 모든 started thread를 join한 뒤 stats/error ownership을 회수합니다. 실패 시 exception value만 caller로 전송되고 partial Image는 성공 결과로 반환되지 않습니다.
- **mutation/transition boundary:** commit별 `ownership·state transition`과 위 invariant ledger에 표시했습니다.
- **failure 시 복구 상태:** Failure → Fix → Test 표와 각 fix/test section에 정상·오류 상태를 구분했습니다.

## 9. Thread 최종 상태

renderer는 fixed 16×16 tiles를 nondeterministic schedule로 처리하지만 tile ownership과 pixel
writes는 disjoint하고 각 pixel의 floating operation order는 serial baseline과 같습니다.
counters는 worker-local integer state라 join 후 merge order가 결과를 바꾸지 않습니다. one/four
workers와 Linear/Bvh의 in-process 및 CLI exact comparison이 이 성질을 고정합니다. worker가
production path에서 실패하면 새 work를 중단하고 모든 worker를 join한 뒤 original exception을
caller에서 rethrow하므로 process termination이나 partial-success 반환을 막습니다.

### 직접 작성한 결론

- **Thread 시작과 종료의 behavior 차이:** renderer는 fixed 16×16 tiles를 nondeterministic schedule로 처리하지만 tile ownership과 pixel writes는 disjoint하고 각 pixel의 floating operation order는 serial baseline과 같습니다. counters는 worker-local integer state라 join 후 merge order가 결과를 바꾸지 않습니다. one/four workers와 Linear/Bvh의 in-process 및 CLI exact comparison이 이 성질을 고정합니다. worker가 production path에서 실패하면 새 work를 중단하고 모든 worker를 join한 뒤 original exception을 caller에서 rethrow하므로 process termination이나 partial-success 반환을 막습니다.
- **아직 다른 Thread 또는 외부 검증이 보완해야 하는 항목:** ThreadSanitizer evidence, cooperative cancellation 중 진행 중 tile의 조기 중단, partial buffer rollback은 제공하지 않습니다.

## 10. 최종 architecture 또는 execution flow 정리

### Source가 확정한 흐름 anchor

```text
16×16 tile decomposition → atomic tile claim → worker-exclusive pixel region → worker-local `RenderStats` → join → integer merge → caller result or post-join rethrow
```

### 실제 코드로 완성한 흐름

1. renderer가 image를 16×16 tiles와 clipped edge tiles로 분해합니다.
2. settings에서 explicit/automatic worker 수를 계산하고 tile count로 cap합니다.
3. 각 worker가 relaxed atomic counter로 unique tile index를 claim합니다.
4. claim한 worker만 tile의 global RGB byte range를 씁니다.
5. Scene/camera는 읽기만 하고 worker-local stats에 semantic work를 기록합니다.
6. worker failure는 local `exception_ptr`에 저장하고 counter를 tileCount로 보내 새 claim을 막습니다.
7. caller는 모든 threads를 join합니다.
8. error가 있으면 merge/success return 전에 original exception을 rethrow합니다.
9. 정상 시 local integer stats를 합치고 complete Image를 반환합니다.
10. in-process와 CLI tests가 thread/mode 조합의 exact 결과를 비교합니다.

### 학습자의 최종 설명

renderer는 fixed 16×16 tiles를 nondeterministic schedule로 처리하지만 tile ownership과 pixel
writes는 disjoint하고 각 pixel의 floating operation order는 serial baseline과 같습니다.
counters는 worker-local integer state라 join 후 merge order가 결과를 바꾸지 않습니다. one/four
workers와 Linear/Bvh의 in-process 및 CLI exact comparison이 이 성질을 고정합니다. worker가
production path에서 실패하면 새 work를 중단하고 모든 worker를 join한 뒤 original exception을
caller에서 rethrow하므로 process termination이나 partial-success 반환을 막습니다.

남은 경계는 다음과 같습니다. ThreadSanitizer evidence, cooperative cancellation 중 진행 중 tile의 조기 중단, partial buffer rollback은 제공하지 않습니다.

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
