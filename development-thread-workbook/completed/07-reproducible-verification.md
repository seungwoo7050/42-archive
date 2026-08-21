# Thread 7. Reproducible verification infrastructure

## 1. Thread 목표

production core와 검증 executable을 같은 build graph에 묶고, component regressions, sanitizer instrumentation, Ubuntu/macOS CI까지 이어지는 재현 가능한 검증 경로를 복원합니다.

### Source significance

> These commits do not define the renderer's algorithms, but they turn local checks into a repeatable
> project-wide verification path. The progression matters because later geometry, BVH, concurrency,
> and output failure tests all depend on a stable library/test build and can be exercised under
> multiple platforms and runtime instrumentation rather than only through one command-line smoke path.

### 이 Thread에 연결된 source invariant

- Verification targets reuse the same production `raycore` objects rather than a separate implementation.
- Release portability checks and sanitizer diagnostics run as explicit automated jobs.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- `raycore` library와 CLI/test/benchmark targets의 dependency 경계는 어떻게 구성되는가?
- CTest가 active CMake configuration에서 실제로 빌드된 executable을 smoke script에 어떻게 전달하는가?
- native core regression은 shell integration test와 어떤 책임을 나누는가?
- fixture path가 process working directory에 의존하지 않도록 어떤 compile/configuration 정보가 전달되는가?
- sanitizer option은 compile과 link 양쪽에 어떻게 전파되고 unsupported compiler를 어떻게 처리하는가?
- release portability와 sanitizer diagnostics를 CI job으로 분리한 이유와 실행 test set은 무엇인가?

## 3. 완료 기준

- [x] CMake target graph와 public include/link dependency를 실제 설정에서 그렸습니다.
- [x] CLI smoke와 native component test가 각각 통과하는 production path를 구분했습니다.
- [x] source fixture lookup이 build-tree 실행에서도 재현되는 근거를 기록했습니다.
- [x] ASan/UBSan enable path, compiler gate, frame pointer, runtime environment를 확인했습니다.
- [x] push/PR에서 Ubuntu·macOS release와 Linux sanitizer CTest가 실제로 실행되는 workflow를 추적했습니다.
- [x] 이 infrastructure가 algorithm correctness 자체를 대신 증명하지 않는다는 한계를 적었습니다.
- [x] 모든 참조 SHA가 `cpp/miniRT` branch HEAD의 ancestry에 속하는지 확인했습니다.
- [ ] 해당 SHA checkout에서 build/test/benchmark 명령을 직접 실행했습니다. 로컬 외부 네트워크와 checkout이 제공되지 않아 실행 evidence는 만들지 않았습니다.

### 검증 범위

- 지정 branch HEAD: `7d08c7c13fa68c3e60eea3c7014658b0a133e6f0`
- 각 참조 SHA는 Thread 내부의 연속 compare chain에서 `behind_by = 0`, merge base가 선행 SHA였고, Thread 종료 SHA도 branch HEAD의 조상으로 확인했습니다.
- 구현 설명은 해당 commit의 diff/file content를 기준으로 작성했으며, final HEAD의 후속 API를 과거 SHA에 소급하지 않았습니다.
- 테스트와 benchmark는 source mechanism과 production path만 검사했습니다. 실행 결과, sanitizer 결과, wall-clock 수치는 기록하지 않았습니다.

## 4. Commit map

1. `2cf2f17980bb` — `build(cmake): 코어 라이브러리와 검증 타깃 구성`
   - Importance: B
   - Tags: BUILD, TEST
   - Source-defined role: Separates `raycore`, executable, CTest targets under CMake.

2. `0e8c3b51e3b7` — `test(core): 수학·기하·파서·출력 회귀 기준 추가`
   - Importance: B
   - Tags: TEST, DETERMINISM
   - Source-defined role: Adds broad component regression coverage.

3. `58d53cce0ee5` — `build(sanitizers): 메모리와 정의되지 않은 동작 검사 구성`
   - Importance: B
   - Tags: BUILD, TEST, RISK
   - Source-defined role: Adds ASan/UBSan config.

4. `4491bea4d93c` — `ci: 플랫폼별 빌드와 회귀 검사 자동화`
   - Importance: B
   - Tags: BUILD, TEST, INTEGRATION
   - Source-defined role: Runs release regressions Ubuntu/macOS and sanitizer checks Linux.

## 5. Commit별 학습 기록

### 5.1 `2cf2f17980bb` — `build(cmake): 코어 라이브러리와 검증 타깃 구성`

- Importance: B
- Tags: BUILD, TEST
- Thread order: 1/4

#### Source에서 확정된 역할

- Development Thread role: Separates `raycore`, executable, CTest targets under CMake.

#### B-level 구현 역할 복원

- **직전 관련 상태:** Make 기반 단일 executable과 shell smoke만으로는 production sources를 여러 test/benchmark target이 안정적으로 재사용하거나 IDE/CTest/CI가 같은 dependency graph를 구성하기 어렵습니다.
- **핵심 구현 결정:** CMake 3.16, C++17, extensions off를 기준으로 production sources를 `raycore` library로 모읍니다. public include directory와 compiler별 warning flags를 library에 연결하고, CLI는 `raycore`를 link합니다. `BUILD_TESTING`/CTest 아래 smoke test는 configure 시 실제 target path를 전달하도록 generator expression을 사용합니다. Make targets는 CMake configure/build/ctest에 위임하고 nested rebuild를 만들지 않게 인자를 전달합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - CMakeLists.txt — `raycore`, CLI, testing, warnings and standard
  - Makefile — CMake delegation
  - tests/render_smoke.sh — built executable argument
- **caller → callee / data flow:** CMake configure → raycore compile → CLI link → CTest test registration with built target path → `ctest` execution
- **ownership·state transition:** production implementation의 authoritative object graph는 `raycore` 하나입니다. executable/test가 별도 source copy를 컴파일하지 않고 link dependency를 공유합니다.
- **failure/edge branch:** test가 hard-coded `./ray` 경로를 사용하면 multi-config/build-tree 환경에서 다른 binary를 실행하거나 찾지 못할 수 있습니다. source 목록 중복은 production/test drift를 만듭니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** CLI와 verification targets가 동일 production core를 사용하고 CTest가 active build artifact를 가리키는 재현 가능한 build 경계를 제공합니다.
- **이 SHA가 보장하지 않는 것:** 이 commit 자체가 algorithm correctness나 sanitizer clean을 증명하지는 않습니다.
- **직접 확인/후속 evidence:** target graph, public include/link, warning branch, smoke target path와 Make delegation을 source에서 확인했습니다. CMake/CTest 명령은 실행하지 않았습니다.

#### Thread 내 연결

- 이전 Thread commit: 이 Thread의 시작점
- 다음 Thread commit: `0e8c3b51e3b7`
- 이 commit이 다음 단계에 제공하는 것: `0e8c3b51e3b7`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.2 `0e8c3b51e3b7` — `test(core): 수학·기하·파서·출력 회귀 기준 추가`

- Importance: B
- Tags: TEST, DETERMINISM
- Thread order: 2/4

#### Source에서 확정된 역할

- Development Thread role: Adds broad component regression coverage.

#### B-level 구현 역할 복원

- **직전 관련 상태:** shell smoke은 process-level valid/invalid rendering을 검증하지만 수학, primitive distance, parser line attribution, P3 local representation을 작은 실패 단위로 구분하기 어렵습니다.
- **핵심 구현 결정:** native `ray-core-tests` executable을 추가해 `raycore`를 link합니다. source fixture를 build working directory와 무관하게 찾도록 `RAY_SOURCE_DIR` compile definition을 제공합니다. tests는 vector/math, primitive intersection distance, invalid fixture의 line 3 ParseError, exact P3 text, parsed basic scene dimensions를 포함합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - CMakeLists.txt — `ray-core-tests`, `RAY_SOURCE_DIR`, CTest registration
  - tests/core_tests.cpp — component regressions
- **caller → callee / data flow:** CTest → native test executable → direct raycore API calls/fixture parse → assertions; shell smoke는 별도 CLI process path 유지
- **ownership·state transition:** test executable은 production library를 link하되 fixture location만 compile-time source root를 전달받습니다. process current directory가 fixture authority가 아닙니다.
- **failure/edge branch:** source root가 없으면 out-of-tree build에서 fixture lookup이 깨질 수 있습니다. broad smoke만 있으면 local failure가 checksum mismatch 하나로만 보일 수 있습니다.

#### Test commit 분석 기준

- **대상 production invariant:** 핵심 수학·기하·parser location·P3 encoding·basic fixture behavior가 production library에서 재현됩니다.
- **test technique:** single native assertion executable linked to raycore with source-root fixture definition
- **통과하는 production path:** direct public/core APIs, parser, output serialization
- **이 test가 증명하는 것:** selected component regressions를 shell process 없이 빠르게 고정합니다.
- **이 test가 증명하지 않는 것:** threading, BVH equivalence, sanitizer diagnostics, all CLI behavior를 증명하지 않습니다.
- **실행 상태:** 테스트 구현과 production 호출 경로는 해당 SHA에서 확인했지만, 이 환경에서는 checkout/build가 불가능해 명령을 실행하지 않았습니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** core component와 parser/output representation의 빠른 deterministic regression layer를 추가합니다.
- **이 SHA가 보장하지 않는 것:** 이 시점 test set은 이후 BVH, materials, concurrency, transactional output 전체를 아직 포함하지 않습니다.
- **직접 확인/후속 evidence:** 테스트 성격: broad native component regression. target/source definition과 production calls를 검사했으며 실행하지 않았습니다.

#### Thread 내 연결

- 이전 Thread commit: `2cf2f17980bb`
- 다음 Thread commit: `58d53cce0ee5`
- 이 commit이 다음 단계에 제공하는 것: `58d53cce0ee5`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.3 `58d53cce0ee5` — `build(sanitizers): 메모리와 정의되지 않은 동작 검사 구성`

- Importance: B
- Tags: BUILD, TEST, RISK
- Thread order: 3/4

#### Source에서 확정된 역할

- Development Thread role: Adds ASan/UBSan config.

#### B-level 구현 역할 복원

- **직전 관련 상태:** 기능 tests가 통과해도 out-of-bounds, use-after-free, signed overflow 같은 memory/undefined behavior가 입력에서 관찰되지 않거나 platform별로 잠복할 수 있습니다.
- **핵심 구현 결정:** `RAY_ENABLE_SANITIZERS` CMake option을 default OFF로 추가합니다. GCC/Clang 계열에서 `-fsanitize=address,undefined`와 `-fno-omit-frame-pointer`를 `raycore`의 compile/link interface에 적용해 이를 link하는 executable/tests에도 runtime instrumentation이 이어지게 합니다. unsupported compiler에서는 silent ignore가 아니라 configure fatal error를 냅니다. sanitizer build directory를 ignore합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - CMakeLists.txt — sanitizer option, compiler gate, compile/link options
  - .gitignore — sanitizer build tree
- **caller → callee / data flow:** configure option ON → compiler-family validation → instrumented raycore compile/link interface → linked tests/CLI instrumentation → CTest runtime diagnostics
- **ownership·state transition:** option OFF인 normal build와 ON인 diagnostic build가 별도 build tree에서 공존합니다. frame pointer가 diagnostic stack trace를 지원합니다.
- **failure/edge branch:** compile flags만 적용하고 link flags를 빼면 sanitizer runtime link가 실패할 수 있습니다. unsupported toolchain에서 option을 무시하면 user가 검사됐다고 오인합니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 지원 compiler에서 ASan/UBSan-enabled verification configuration을 명시적으로 구성합니다.
- **이 SHA가 보장하지 않는 것:** ThreadSanitizer, leak sanitizer portability, 모든 UB 검출, test coverage가 닿지 않는 path를 보장하지 않습니다. option 존재 자체가 clean run evidence는 아닙니다.
- **직접 확인/후속 evidence:** compile/link propagation과 fatal compiler gate를 확인했습니다. sanitizer binary를 빌드·실행하지 않았습니다.

#### Thread 내 연결

- 이전 Thread commit: `0e8c3b51e3b7`
- 다음 Thread commit: `4491bea4d93c`
- 이 commit이 다음 단계에 제공하는 것: `4491bea4d93c`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.4 `4491bea4d93c` — `ci: 플랫폼별 빌드와 회귀 검사 자동화`

- Importance: B
- Tags: BUILD, TEST, INTEGRATION
- Thread order: 4/4

#### Source에서 확정된 역할

- Development Thread role: Runs release regressions Ubuntu/macOS and sanitizer checks Linux.

#### B-level 구현 역할 복원

- **직전 관련 상태:** 로컬 CMake/CTest와 sanitizer option이 있어도 어떤 platform/configuration에서 지속적으로 실행되는지 자동화되지 않으면 portability와 diagnostic contract가 사람의 명령에 의존합니다.
- **핵심 구현 결정:** `.github/workflows/ci.yml`이 push와 pull request에서 실행됩니다. Release job은 Ubuntu와 macOS matrix로 CMake configure(`BUILD_TESTING=ON`), build, `ctest --output-on-failure`를 수행합니다. 별도 Linux Debug sanitizer job은 `RAY_ENABLE_SANITIZERS=ON`으로 configure하고 ASAN/UBSAN 환경 변수를 설정해 leak detection, halt-on-error, stack trace와 함께 같은 CTest graph를 실행합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - .github/workflows/ci.yml — release matrix and sanitizer job
  - CMakeLists.txt — consumed configuration options/tests
- **caller → callee / data flow:** push/PR → platform checkout/configure → build → CTest; Linux sanitizer branch → instrumented Debug build → ASAN/UBSAN runtime env → CTest
- **ownership·state transition:** release portability와 runtime instrumentation은 독립 jobs라 한쪽 실패가 다른 증거로 대체되지 않습니다. 동일 registered tests를 다른 configuration에서 실행합니다.
- **failure/edge branch:** macOS/Ubuntu compile 차이, release-only issues, sanitizer diagnostics는 각 job에서 별도 failure status가 됩니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 지정 workflow가 유지되는 동안 두 OS의 release regression과 Linux ASan/UBSan regression을 자동으로 요청합니다.
- **이 SHA가 보장하지 않는 것:** Windows, 다른 compiler/version, race detector, 실제 workflow run 성공을 이 source 검사만으로 증명하지 않습니다. 이 작업에서는 과거 CI run이나 명령 결과를 성공으로 기록하지 않았습니다.
- **직접 확인/후속 evidence:** workflow triggers, matrix, configure/build/ctest commands와 sanitizer environment를 source에서 확인했습니다. CI는 새로 실행하지 않았습니다.

#### Thread 내 연결

- 이전 Thread commit: `58d53cce0ee5`
- 다음 Thread commit: 이 Thread의 종료점
- 이 commit이 Thread 종료에 제공하는 것: Thread-level invariant ledger와 최종 실행 흐름에서 이 SHA의 결과를 최종 상태에 반영했습니다.

## 6. Invariant ledger

| Invariant | 최초 도입/기준 | 강화 또는 수정 | 부족함/위험 노출 | 고정한 test/evidence | 실제 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| tests가 동일 production core를 사용 | 2cf2f17980bb | 0e8c3b51e3b7에서 native tests 확장 | 별도 source list/drift | CTest target graph | `raycore` public link dependency |
| fixture lookup은 working directory와 무관 | 0e8c3b51e3b7 | 0e8c3b51e3b7 | out-of-tree CTest에서 relative path 실패 | native parser fixture test | `RAY_SOURCE_DIR` definition |
| memory/UB instrumentation은 explicit config | 58d53cce0ee5 | 4491bea4d93c CI job | option 존재만으로 clean run 오인 | Linux sanitizer CTest job | compile+link flags and runtime env |
| release portability는 Ubuntu/macOS에서 자동 검사 | 4491bea4d93c | 4491bea4d93c | 한 platform local build만 확인 | release matrix | configure/build/ctest per OS |

### Ledger 보완 기록

- 각 invariant는 위 표의 SHA에서 observable behavior 또는 state로 처음 나타났습니다.
- 후속 commit이 같은 용어를 사용하더라도 그 보장을 과거 SHA에 소급하지 않았습니다.
- test/evidence 열은 production path와 assertion 또는 deterministic work gate를 함께 가리킵니다.
- 실행하지 않은 test는 source-level evidence로만 기록했습니다.

## 7. Failure → Fix → Test 연결

| Failure 또는 위험 | Decision/Fix | Test 또는 evidence | 실제 failure path와 assertion |
| --- | --- | --- | --- |
| test가 다른 source copy 또는 binary 실행 | `raycore` link + generated target path | CTest smoke/native tests | active build artifact path |
| out-of-tree fixture lookup 실패 | compile-time source root | 0e8c3b51e3b7 core test | invalid fixture line assertion |
| sanitizer compile만 되고 link/runtime 누락 | PUBLIC compile+link options and explicit job | 4491bea4d93c sanitizer job | instrumented CTest with ASAN/UBSAN env |
| single-platform portability blind spot | Ubuntu/macOS release matrix | CI workflow | 각 OS configure/build/ctest status |

### 연결 검토

- feature commit도 어떤 잘못된 state 또는 semantic drift를 막는지 production path에 연결했습니다.
- fix commit은 기존 가정 → 실제 위험 → root cause → corrected decision → regression 순서로 기록했습니다.
- test가 broad integration인지 deterministic boundary/differential/failure-injection regression인지 commit 기록에서 구분했습니다.
- assertion이 증명하지 않는 범위와 실행하지 못한 항목을 별도로 남겼습니다.

## 8. Ownership / state / responsibility 변화

CMake target graph가 production source 목록의 authority를 `raycore`에 둡니다. CLI, native tests, benchmark는 library를 소유하지 않고 link dependency로 소비합니다. CTest가 executable invocation metadata를 소유하고 workflow가 build directories/configurations를 job별로 격리합니다. sanitizer option은 `raycore` public usage requirement로 linked targets에 전파됩니다.

### 학습자 최종 기록

- **source state와 derived state:** CMake target graph가 production source 목록의 authority를 `raycore`에 둡니다. CLI, native tests, benchmark는 library를 소유하지 않고 link dependency로 소비합니다. CTest가 executable invocation metadata를 소유하고 workflow가 build directories/configurations를 job별로 격리합니다. sanitizer option은 `raycore` public usage requirement로 linked targets에 전파됩니다.
- **mutation/transition boundary:** commit별 `ownership·state transition`과 위 invariant ledger에 표시했습니다.
- **failure 시 복구 상태:** Failure → Fix → Test 표와 각 fix/test section에 정상·오류 상태를 구분했습니다.

## 9. Thread 최종 상태

동일 production `raycore`를 사용하는 CLI·native tests·benchmark가 CMake graph에 있고 CTest가 shell integration과 component regressions를 실행합니다. 별도 sanitizer configuration은 GCC/Clang compile/link instrumentation을 적용하고, CI는 Ubuntu/macOS Release와 Linux ASan/UBSan jobs를 분리합니다. source inspection은 이 자동화의 구성만 확인하며 실제 workflow/test 성공을 대신하지 않습니다.

### 직접 작성한 결론

- **Thread 시작과 종료의 behavior 차이:** 동일 production `raycore`를 사용하는 CLI·native tests·benchmark가 CMake graph에 있고 CTest가 shell integration과 component regressions를 실행합니다. 별도 sanitizer configuration은 GCC/Clang compile/link instrumentation을 적용하고, CI는 Ubuntu/macOS Release와 Linux ASan/UBSan jobs를 분리합니다. source inspection은 이 자동화의 구성만 확인하며 실제 workflow/test 성공을 대신하지 않습니다.
- **아직 다른 Thread 또는 외부 검증이 보완해야 하는 항목:** 이 작업에서는 로컬 build/test/sanitizer/CI를 실행하지 않았습니다. Windows, TSan, 추가 compiler와 actual historical run status는 별도 evidence가 필요합니다.

## 10. 최종 architecture 또는 execution flow 정리

### Source가 확정한 흐름 anchor

```text
CMake configure → `raycore` → CLI/tests/benchmark link → CTest registration → optional sanitizer compile/link instrumentation → GitHub Actions release matrix and sanitizer job
```

### 실제 코드로 완성한 흐름

1. CMake가 C++17/no-extensions와 compiler warnings를 설정합니다.
2. production sources를 `raycore` library로 컴파일합니다.
3. CLI, tests, benchmark가 같은 library와 public include dependency를 link합니다.
4. CTest가 native core tests와 built executable을 받는 shell smoke를 등록합니다.
5. optional sanitizer configuration이 supported compiler인지 확인하고 compile/link flags를 전파합니다.
6. GitHub Actions release matrix가 Ubuntu/macOS에서 configure, build, CTest를 실행합니다.
7. Linux sanitizer job이 Debug/instrumented graph를 만들고 ASAN/UBSAN runtime options로 CTest를 실행합니다.

### 학습자의 최종 설명

동일 production `raycore`를 사용하는 CLI·native tests·benchmark가 CMake graph에 있고 CTest가 shell integration과 component regressions를 실행합니다. 별도 sanitizer configuration은 GCC/Clang compile/link instrumentation을 적용하고, CI는 Ubuntu/macOS Release와 Linux ASan/UBSan jobs를 분리합니다. source inspection은 이 자동화의 구성만 확인하며 실제 workflow/test 성공을 대신하지 않습니다.

남은 경계는 다음과 같습니다. 이 작업에서는 로컬 build/test/sanitizer/CI를 실행하지 않았습니다. Windows, TSan, 추가 compiler와 actual historical run status는 별도 evidence가 필요합니다.

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
