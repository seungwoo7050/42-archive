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

- [ ] serial tile loop와 parallel worker loop의 동일한 pixel kernel을 비교했습니다.
- [ ] tile index → tile bounds → `(x, y)` → RGB offset의 ownership 경로를 기록했습니다.
- [ ] atomic ordering, per-worker stats, join, merge 순서를 실제 코드에서 확인했습니다.
- [ ] one/four workers와 linear/BVH 조합에서 image와 counters가 같아야 하는 이유를 테스트별로 설명할 수 있습니다.
- [ ] worker creation failure와 worker-body failure의 cleanup 경로를 구분했습니다.
- [ ] throwing shape regression이 원래 예외 type/message, stop-assignment, join, rethrow를 어떻게 증명하는지 연결했습니다.

## 4. Commit map

1. `498266fc0abf` — `refactor(render): 직렬 렌더링을 고정 tile 순회로 전환`
   - Importance: B
   - Tags: REFACTOR, CONCURRENCY, DETERMINISM
   - Source-defined role: Converts the serial row loop into fixed tile traversal without adding threads.

2. `849f878ca0b0` — `feat(render): 원자적 tile 분배와 작업자 통계 병합 구현`
   - Importance: S
   - Tags: ARCH, CONCURRENCY, DETERMINISM
   - Source-defined role: Distributes tiles atomically, assigns disjoint pixel writes, and merges worker-local statistics.

3. `18459bfda416` — `feat(renderer): 작업자 수 설정과 자동 선택 추가`
   - Importance: B
   - Tags: CONCURRENCY, PERF
   - Source-defined role: Adds explicit and automatic worker-count policy.

4. `3619550fa354` — `test(render): 작업자 수에 따른 함수 결과 동치 검증`
   - Importance: A
   - Tags: TEST, CONCURRENCY, DETERMINISM
   - Source-defined role: Verifies equal pixels and work for one versus four workers in both acceleration modes.

5. `ca2d108f2255` — `test(render): 실행 모드별 PPM byte 결정성 검증`
   - Importance: A
   - Tags: TEST, DETERMINISM, OUTPUT
   - Source-defined role: Verifies exact PPM-byte equality through the CLI.

6. `0536e4829070` — `fix(renderer): 작업자 예외를 호출자에게 전달`
   - Importance: A
   - Tags: CONCURRENCY, RISK, DEBUG
   - Source-defined role: Captures worker failures, stops new work, joins all workers, and rethrows on the caller.

7. `b5c708ac981a` — `test(renderer): 작업자 실패 전파와 회수 검증`
   - Importance: A
   - Tags: TEST, CONCURRENCY, RISK
   - Source-defined role: Injects a throwing shape to lock down propagation and recovery.

## 5. Commit별 학습 기록

### 5.1 `498266fc0abf` — `refactor(render): 직렬 렌더링을 고정 tile 순회로 전환`

- Importance: B
- Tags: REFACTOR, CONCURRENCY, DETERMINISM
- Thread order: 1/7

#### Source에서 확정된 역할

- Development Thread role: Converts the serial row loop into fixed tile traversal without adding threads.
- Classification summary: Rewrites the serial row loop as fixed 16×16 tile traversal with coordinate-based pixel writes.
- Importance rationale: This is a deliberate preparatory refactor for concurrency, but behavior remains serial and the core scheduling mechanism arrives in the next commit.

#### 해당 SHA에서 확인할 실제 코드

- 이 SHA 이전 row-major loop와 16×16 tile loops의 nesting/order를 diff로 비교합니다.
- image dimensions에서 tile count를 계산하는 식과 edge tile end coordinate를 clamp하는 코드를 기록합니다.
- tile index 또는 tile coordinates가 pixel `(x, y)` 범위로 변환되는 순서를 추적합니다.
- monotonic cursor 대신 `(x, y)`에서 RGB storage offset을 계산하는 code path를 확인합니다.
- 모든 valid pixel이 exactly once 방문되는지 non-multiple dimensions 예시로 loop bounds를 검산합니다.
- camera ray, trace, clamp, quantization, stats logic가 row-major version과 동일하게 유지되는지 확인합니다.

#### Source에서 확정된 이 SHA의 경계

- 이 commit은 thread를 생성하지 않는 preparatory refactor입니다.
- fixed tile size는 16×16이며 edge tiles는 image bounds에 맞게 줄어듭니다.

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

- 이전 Thread commit: 이 Thread의 시작점
- 다음 Thread commit: `849f878ca0b0`
- 비교 지침: parent serial renderer와 비교해 work decomposition만 바뀌고 execution은 여전히 single-threaded인지 기록합니다.
- 직접 작성한 연결 설명:

### 5.2 `849f878ca0b0` — `feat(render): 원자적 tile 분배와 작업자 통계 병합 구현`

- Importance: S
- Tags: ARCH, CONCURRENCY, DETERMINISM
- Thread order: 2/7

#### Source에서 확정된 역할

- Development Thread role: Distributes tiles atomically, assigns disjoint pixel writes, and merges worker-local statistics.
- Classification summary: Distributes tiles through an atomic index, gives workers disjoint pixels and local stats, and joins all threads.
- Importance rationale: This is the defining parallel-rendering architecture. It preserves deterministic bytes without shared floating-point accumulation while adding explicit thread-lifecycle and aggregation boundaries.
- Most Important Commit anchors:
  - Problem: Full-image rendering was serial, but naive parallelization could create overlapping writes, shared statistic races, schedule-dependent accumulation, or unjoined threads. The optimization also had to preserve exact image bytes.
  - Decision: The renderer uses fixed 16×16 tiles and an atomic next-tile index. A claimed tile gives one worker exclusive ownership of its pixels; scene and camera data are shared read-only; each worker accumulates separate statistics; and all workers are joined before statistics are merged or the image is returned.
  - Why it mattered: This defines how the project obtains parallelism without changing rendering semantics. Determinism is derived from ownership and per-pixel independence, not from a fixed scheduling order.

#### 해당 SHA에서 확인할 실제 코드

- tile count와 shared atomic next-tile counter의 type/initialization을 기록합니다.
- worker loop가 relaxed atomic operation으로 unique tile index를 claim하고 terminal condition을 검사하는 코드를 추적합니다.
- claimed tile의 pixel region이 다른 tile과 겹치지 않는 근거를 tile-coordinate formula로 확인합니다.
- shared `Scene`과 precomputed camera frame이 const/read-only로 worker body에 전달되는지 기록합니다.
- worker마다 별도 cache-line-aligned `RenderStats`가 어디에 할당되고 어떤 counters가 local하게 증가하는지 확인합니다.
- thread creation loop, RAII joiner, normal join, local stats merge 순서를 lifecycle diagram으로 작성합니다.
- worker construction 중 allocation/creation failure가 발생했을 때 이미 시작한 threads가 join되는 path를 확인합니다.
- CMake/build에서 platform thread library가 production/test targets에 연결되는 변경을 기록합니다.

#### Source에서 확정된 이 SHA의 경계

- relaxed ordering은 counter가 unique work distribution만 담당하고 pixels/stats가 worker-owned이기 때문에 선택됩니다.
- stats는 shared floating-point accumulation이 아니라 post-join integer merge를 사용합니다.
- 이 initial implementation은 worker-body exception propagation을 아직 안전하게 처리하지 않으며 `0536e4829070`에서 수정됩니다.

#### 추가 확인 포인트

- worker count와 tile count가 같은지 가정하지 말고 actual construction loop를 기록합니다.
- join 전 caller-visible stats/image 반환이 가능한 branch가 없는지 확인합니다.

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

- 이전 Thread commit: `498266fc0abf`
- 다음 Thread commit: `18459bfda416`
- 비교 지침: serial tile commit과 diff해 same tile kernel이 workers로 이동하는 지점을 확인하고, schedule order가 pixel result에 관여하지 않는 이유를 ownership으로 설명합니다.
- 직접 작성한 연결 설명:

### 5.3 `18459bfda416` — `feat(renderer): 작업자 수 설정과 자동 선택 추가`

- Importance: B
- Tags: CONCURRENCY, PERF
- Thread order: 3/7

#### Source에서 확정된 역할

- Development Thread role: Adds explicit and automatic worker-count policy.
- Classification summary: Adds explicit worker-count configuration and automatic hardware-based selection.
- Importance rationale: This exposes a useful policy control within the established scheduler but does not change its ownership or determinism model.

#### 해당 SHA에서 확인할 실제 코드

- `RenderSettings::threadCount` field와 zero sentinel meaning을 기록합니다.
- zero일 때 hardware concurrency를 읽고 zero result이면 one으로 fallback하는 branch를 확인합니다.
- explicit nonzero count가 그대로 후보 worker count가 되는 path를 기록합니다.
- worker count를 number of tiles로 cap하는 expression과 zero-tile possibility 처리 여부를 확인합니다.
- acceleration benchmark가 explicitly one worker를 설정하는 code change를 기록합니다.
- normal CLI/default rendering과 controlled benchmark의 policy 차이를 설명합니다.

#### Source에서 확정된 이 SHA의 경계

- zero means auto이며 explicit zero workers를 의미하지 않습니다.
- benchmark의 one-worker setting은 acceleration comparison에서 scheduling variability를 배제합니다.

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

- 이전 Thread commit: `849f878ca0b0`
- 다음 Thread commit: `3619550fa354`
- 비교 지침: scheduler architecture는 유지되고 worker-count selection policy만 추가되는지 `849f878ca0b0`과 비교합니다.
- 직접 작성한 연결 설명:

### 5.4 `3619550fa354` — `test(render): 작업자 수에 따른 함수 결과 동치 검증`

- Importance: A
- Tags: TEST, CONCURRENCY, DETERMINISM
- Thread order: 4/7

#### Source에서 확정된 역할

- Development Thread role: Verifies equal pixels and work for one versus four workers in both acceleration modes.
- Classification summary: Compares linear/BVH rendering with one and four workers, including identical pixels and work counters.
- Importance rationale: The test directly validates the central concurrency claim that scheduling changes execution order but not results or semantic work.

#### Test commit 분석 기준

- 대상 production invariant: worker count는 fixed scene/mode의 pixels와 semantic work counts를 바꾸지 않고 모든 pixels를 정확히 한 번 처리한다.
- 재현하는 failure/boundary: linear/BVH modes, one/four workers, diffuse/direct/shadow/metal recursion, bounded/unbounded geometry.
- test technique: four-way differential render, exact image/checksum comparison, per-mode counter equality, primary-ray cardinality assertion.
- 통과하는 production path: `renderScene` tile scheduler → camera/trace/Scene intersection → worker-local stats merge.
- 이 test가 증명하는 것: schedule/worker-count independence of in-memory output and counters for a representative mixed scene.
- 이 test가 증명하지 않는 것: serialized PPM formatting이나 worker exception path는 이 test alone으로 증명하지 않는다.
- test 성격: deterministic in-process concurrency differential regression.
- 막는 regression: skipped/duplicate pixels, shared-stat races, mode-dependent scheduling drift, changed recursive work.

#### 학습자 검증 기록

- 실제 test case/function과 file path:
- fixture 또는 test double 구성:
- assertion 전에 통과하는 production function 순서:
- failure가 실제로 주입되는 정확한 지점:
- test 실행 명령과 결과:
- false positive 또는 미검증 범위:

#### 해당 SHA에서 확인할 실제 코드

- test scene이 multiple lights, bounded/unbounded geometry, diffuse path, recursive metal path를 포함하는 setup을 기록합니다.
- linear/BVH × one/four workers의 four render invocations와 settings matrix를 작성합니다.
- all four image buffers와 checksums를 비교하는 assertions를 확인합니다.
- 같은 acceleration mode 안에서 thread count change 전후 primary/secondary/shadow/primitive/AABB counters를 어떻게 비교하는지 기록합니다.
- primary ray count가 width × height와 같다는 explicit assertion과 overflow/domain을 확인합니다.
- test가 shared read-only scene와 prebuilt acceleration을 어떻게 재사용하는지 기록합니다.

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

- 이전 Thread commit: `18459bfda416`
- 다음 Thread commit: `ca2d108f2255`
- 비교 지침: this in-process test와 later CLI byte test의 boundary를 구분해 internal image/counters와 serialized artifact coverage를 나눕니다.
- 직접 작성한 연결 설명:

### 5.5 `ca2d108f2255` — `test(render): 실행 모드별 PPM byte 결정성 검증`

- Importance: A
- Tags: TEST, DETERMINISM, OUTPUT
- Thread order: 5/7

#### Source에서 확정된 역할

- Development Thread role: Verifies exact PPM-byte equality through the CLI.
- Classification summary: Compares checksums and exact PPM bytes across linear/BVH and one/four-worker CLI runs.
- Importance rationale: This is end-to-end evidence for the project's defining determinism guarantee at the actual published-file boundary.

#### Test commit 분석 기준

- 대상 production invariant: acceleration mode와 worker count가 published P3 bytes와 checksum을 바꾸지 않는다.
- 재현하는 failure/boundary: linear/BVH, one/four workers, fixed-depth mixed material scene, complete CLI-to-file path.
- test technique: process-level matrix execution, checksum comparison, byte-for-byte `cmp` against baseline.
- 통과하는 production path: CLI options → scene load → render scheduler/acceleration/material → checksum → PPM writer.
- 이 test가 증명하는 것: external serialized artifact determinism across tested execution modes.
- 이 test가 증명하지 않는 것: worker-body exception recovery나 output replacement failure를 검증하지 않는다.
- test 성격: end-to-end deterministic artifact regression.
- 막는 regression: header/format/channel-order/write differences or mode/schedule-dependent pixels.

#### 학습자 검증 기록

- 실제 test case/function과 file path:
- fixture 또는 test double 구성:
- assertion 전에 통과하는 production function 순서:
- failure가 실제로 주입되는 정확한 지점:
- test 실행 명령과 결과:
- false positive 또는 미검증 범위:

#### 해당 SHA에서 확인할 실제 코드

- mixed diffuse/metal, bounded/unbounded fixture와 fixed reflection depth를 기록합니다.
- CLI를 linear/BVH and one/four workers로 실행하는 command matrix를 작성합니다.
- 각 run의 checksum output을 baseline과 비교하는 shell assertions를 확인합니다.
- single-threaded linear output을 baseline file로 삼아 all P3 files를 `cmp`하는 순서를 기록합니다.
- temporary output paths와 cleanup behavior를 확인합니다.
- in-process image equality로는 포착하지 못하는 header, dimensions, channel order, line formatting, write path를 test가 실제로 통과하는지 추적합니다.

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

- 이전 Thread commit: `3619550fa354`
- 다음 Thread commit: `0536e4829070`
- 비교 지침: preceding function-level test와 비교해 executable option parsing과 PPM serialization boundary가 새로 포함되는 범위를 기록합니다.
- 직접 작성한 연결 설명:

### 5.6 `0536e4829070` — `fix(renderer): 작업자 예외를 호출자에게 전달`

- Importance: A
- Tags: CONCURRENCY, RISK, DEBUG
- Thread order: 6/7

#### Source에서 확정된 역할

- Development Thread role: Captures worker failures, stops new work, joins all workers, and rethrows on the caller.
- Classification summary: Captures worker exceptions, stops new tile assignment, joins every worker, and rethrows on the caller thread.
- Importance rationale: This corrects a severe concurrency failure mode that could otherwise terminate the process or abandon workers; it is significant lifecycle engineering but not the original scheduler architecture.
- Most Important Commit anchors:
  - Problem: An exception escaping a `std::thread` body calls `std::terminate`; it does not naturally reach `renderScene` or the CLI's normal error path. The initial scheduler therefore had a dangerous failure mode even though its successful path joined workers correctly.
  - Decision: Each worker catches failures into its own `exception_ptr`, signals the shared tile counter to stop assigning new work, and exits. The caller joins every worker first, then rethrows the stored failure on the caller thread.
  - Why it mattered: The correction turns worker failure from process termination into an ordinary rendering failure with deterministic cleanup. It also ensures a failed render cannot be mistaken for a partial successful image.

#### Failure → Fix 연결

- 기존 가정: worker body가 성공하거나 exception이 ordinary caller stack으로 전달된다.
- 실제 failure 또는 위험: `std::thread` function 밖으로 exception이 escape하면 `std::terminate`가 호출되어 `renderScene`/CLI error path로 돌아오지 못한다.
- root cause: thread boundary에는 automatic exception propagation이 없다.
- 수정된 decision/invariant: per-worker `exception_ptr` capture, work-stop signal, full join, caller-thread rethrow 순서를 도입한다.
- regression test 연결: `b5c708ac981a`의 throwing-shape failure injection.

#### 학습자 root-cause 기록

- fix 직전 SHA에서 가정이 코드로 드러나는 지점:
- failure를 유발하는 입력/state/event:
- failure가 observable behavior로 나타나는 순서:
- 수정 코드가 root cause를 차단하는 정확한 branch:
- symptom 완화가 아니라 root cause 수정임을 보여주는 근거:
- regression test가 같은 failure mechanism을 재현하는 지점:

#### 해당 SHA에서 확인할 실제 코드

- fix 이전 worker lambda/body에서 `std::exception`이 escape할 수 있는 call boundary를 찾습니다.
- 각 worker가 own `std::exception_ptr` slot을 갖는 storage와 indexing을 기록합니다.
- worker body 전체를 감싸는 catch block이 original exception을 capture하는 코드를 추적합니다.
- failure 시 atomic tile cursor를 terminal value로 advance/store해 unclaimed work assignment를 중지하는 mechanism을 확인합니다.
- other workers가 already claimed/in-progress tiles를 어떻게 종료하는지 actual loop condition으로 기록합니다.
- calling thread가 every worker를 join한 뒤 error slots를 검사하는 순서를 확인합니다.
- first/selected captured exception을 stats merge와 successful return보다 앞서 rethrow하는 branch를 기록합니다.
- original type/message가 preserved되는지 exception handling code와 test expectation을 연결합니다.

#### Source에서 확정된 이 SHA의 경계

- render failure는 partial image를 successful return하지 않습니다.
- all workers are joined before rethrow, so thread reclamation precedes caller-visible failure.
- new work assignment is stopped, but already in-progress work may finish before join.

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

- 이전 Thread commit: `ca2d108f2255`
- 다음 Thread commit: `b5c708ac981a`
- 비교 지침: initial parallel commit의 success-path join과 비교해 worker-body failure path가 왜 별도 설계가 필요했는지 root cause 중심으로 기록합니다.
- 직접 작성한 연결 설명:

### 5.7 `b5c708ac981a` — `test(renderer): 작업자 실패 전파와 회수 검증`

- Importance: A
- Tags: TEST, CONCURRENCY, RISK
- Thread order: 7/7

#### Source에서 확정된 역할

- Development Thread role: Injects a throwing shape to lock down propagation and recovery.
- Classification summary: Uses a throwing shape to verify worker exception propagation and thread recovery.
- Importance rationale: The injected failure locks down the dangerous lifecycle path fixed by the preceding commit and ensures failure does not remain trapped in a worker.

#### Test commit 분석 기준

- 대상 production invariant: worker failure는 process termination이나 partial success가 아니라 caller-thread exception으로 보고되고 started threads는 회수된다.
- 재현하는 failure/boundary: BVH-mode unbounded shape intersection inside multi-worker, multi-tile rendering.
- test technique: test double/throwing shape failure injection, exact exception message assertion, process survival.
- 통과하는 production path: worker tile loop → `traceRay`/Scene unbounded intersection → thrown runtime error → `exception_ptr` → join → rethrow.
- 이 test가 증명하는 것: originating failure propagation and recovery path for an injected worker-body exception.
- 이 test가 증명하지 않는 것: 모든 simultaneous multi-worker failure ordering이나 OS-level thread creation failure를 이 test alone으로 증명하지 않는다.
- test 성격: deterministic injected concurrency failure regression.
- 막는 regression: `std::terminate`, generic error replacement, unjoined thread destruction, partial successful render.

#### 학습자 검증 기록

- 실제 test case/function과 file path:
- fixture 또는 test double 구성:
- assertion 전에 통과하는 production function 순서:
- failure가 실제로 주입되는 정확한 지점:
- test 실행 명령과 결과:
- false positive 또는 미검증 범위:

#### 해당 SHA에서 확인할 실제 코드

- test-only `Shape` subtype의 intersection method가 던지는 exact runtime error와 message를 기록합니다.
- shape가 unbounded로 분류되어 BVH mode에서도 direct path로 반드시 평가되는 setup을 확인합니다.
- multi-tile dimensions와 multiple requested workers를 사용해 worker body 안에서 failure가 발생하도록 구성한 근거를 기록합니다.
- `renderScene` call을 감싸는 expected-exception assertion과 exact sentinel message 비교를 확인합니다.
- call 이후 assertion에 도달함이 process termination이 없었음을 어떻게 보여주는지 기록합니다.
- render call completion 전에 threads가 join되어야만 하는 resource/lifecycle 근거를 production code와 함께 연결합니다.

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

- 이전 Thread commit: `0536e4829070`
- 다음 Thread commit: 이 Thread의 종료점
- 비교 지침: fix commit의 capture/stop/join/rethrow 각 단계가 이 test에서 직접 또는 간접적으로 관찰되는 항목을 표로 매핑합니다.
- 직접 작성한 연결 설명:

## 6. Invariant ledger

source가 연결한 invariant의 시간상 변화를 실제 코드 근거로 완성합니다.

| Invariant | 최초 도입/기준 | 강화 또는 수정 | 부족함/위험 노출 | 고정한 test/evidence | 실제 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| 각 pixel byte는 정확히 한 worker가 기록 | 498266fc0abf | 849f878ca0b0 | 중복 claim 또는 좌표 기반 indexing 오류 위험 | 3619550fa354 / ca2d108f2255 | 작성 |
| thread count가 semantic work와 output을 바꾸지 않음 | 849f878ca0b0 / 18459bfda416 | 3619550fa354 | schedule variability | ca2d108f2255 | 작성 |
| started worker는 모두 join되고 failure는 caller로 전달 | 849f878ca0b0의 success-path join | 0536e4829070 | worker exception escape로 `std::terminate` | b5c708ac981a | 작성 |

### Ledger 보완 기록

- 각 invariant가 처음 observable behavior가 된 SHA:
- invariant를 우회하거나 깨뜨릴 수 있었던 실제 code path:
- fix 뒤 새로 금지되거나 강제된 state transition:
- test가 invariant를 직접 고정하는 assertion:
- source가 명시하지 않은 invariant를 추가했다면 삭제하거나 근거를 재확인:

## 7. Failure → Fix → Test 연결

| Failure 또는 위험 | Decision/Fix | Test 또는 evidence | 실제 failure path와 assertion |
| --- | --- | --- | --- |
| 두 worker가 같은 pixel을 씀 | atomic unique tile claim과 tile-level exclusive ownership | 3619550fa354 primary-ray count 및 image/work equivalence | 작성 |
| serialized artifact가 mode/worker count에 따라 달라짐 | same per-pixel kernel과 deterministic output | ca2d108f2255 checksum + full PPM `cmp` | 작성 |
| worker body exception이 thread 밖으로 탈출 | `exception_ptr` capture, terminal cursor, full join, caller rethrow | b5c708ac981a throwing-shape regression | 작성 |

### 연결 검토

- feature를 독립적인 성공 경로로만 읽지 않고 어떤 failure를 예방하는지 기록:
- fix가 기존 assumption을 어떻게 수정했는지 기록:
- test가 symptom이 아니라 root cause를 재현하는지 확인:
- test가 증명하지 않는 범위를 별도로 기록:

## 8. Ownership / state / responsibility 변화

- tile claim 이후 pixel 범위를 누가 단독으로 쓰는지 memory 영역 기준으로 표시합니다.
- worker-local `RenderStats`, shared immutable `Scene`/camera frame, atomic tile cursor의 접근 권한을 구분합니다.
- thread object와 exception slot을 누가 소유하고 언제 join/rethrow하는지 lifecycle diagram으로 작성합니다.

### 학습자 최종 기록

- source state:
- derived/cache state:
- owner와 non-owner:
- mutation 또는 transition boundary:
- failure 시 복구되는 상태:

## 9. Thread 최종 상태

fixed tiles는 atomic index로 한 worker에게만 배정되고, 각 worker는 disjoint pixels와 local stats를 소유합니다. 모든 thread가 join된 뒤 stats가 병합되며, worker exception은 caller thread에서 원형 그대로 rethrow됩니다. worker count와 acceleration mode의 조합은 최종 image bytes를 바꾸지 않습니다.

### 직접 작성

- Thread 시작 시점과 종료 시점의 behavior 차이:
- 최종적으로 authoritative한 contract:
- 아직 다른 Thread가 보완해야 하는 항목:

## 10. 최종 architecture 또는 execution flow 정리

### Source가 확정한 흐름 anchor

`serial fixed-tile decomposition → atomic tile claim → worker-exclusive pixel writes + local stats → join → stats merge → cross-worker/cross-mode equivalence → worker exception capture → join → caller rethrow`

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
