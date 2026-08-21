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

- [ ] CMake target graph와 public include/link dependency를 실제 설정에서 그렸습니다.
- [ ] CLI smoke와 native component test가 각각 통과하는 production path를 구분했습니다.
- [ ] source fixture lookup이 build-tree 실행에서도 재현되는 근거를 기록했습니다.
- [ ] ASan/UBSan enable path, compiler gate, frame pointer, runtime environment를 확인했습니다.
- [ ] push/PR에서 Ubuntu·macOS release와 Linux sanitizer CTest가 실제로 실행되는 workflow를 추적했습니다.
- [ ] 이 infrastructure가 algorithm correctness 자체를 대신 증명하지 않는다는 한계를 적었습니다.

## 4. Commit map

1. `2cf2f17980bb` — `build(cmake): 코어 라이브러리와 검증 타깃 구성`
   - Importance: B
   - Tags: BUILD, TEST
   - Source-defined role: Separates `raycore`, the executable, and CTest targets under CMake.

2. `0e8c3b51e3b7` — `test(core): 수학·기하·파서·출력 회귀 기준 추가`
   - Importance: B
   - Tags: TEST, DETERMINISM
   - Source-defined role: Adds broad component regression coverage.

3. `58d53cce0ee5` — `build(sanitizers): 메모리와 정의되지 않은 동작 검사 구성`
   - Importance: B
   - Tags: BUILD, TEST, RISK
   - Source-defined role: Adds an AddressSanitizer/UBSan configuration.

4. `4491bea4d93c` — `ci: 플랫폼별 빌드와 회귀 검사 자동화`
   - Importance: B
   - Tags: BUILD, TEST, INTEGRATION
   - Source-defined role: Runs release regressions on Ubuntu and macOS and sanitizer checks on Linux.

## 5. Commit별 학습 기록

### 5.1 `2cf2f17980bb` — `build(cmake): 코어 라이브러리와 검증 타깃 구성`

- Importance: B
- Tags: BUILD, TEST
- Thread order: 1/4

#### Source에서 확정된 역할

- Development Thread role: Separates `raycore`, the executable, and CTest targets under CMake.
- Classification summary: Introduces CMake, a reusable `raycore` library, CTest integration, and Make wrappers.
- Importance rationale: This materially improves reproducibility and modularity, but it is conventional build-system engineering rather than a core rendering decision.

#### 해당 SHA에서 확인할 실제 코드

- top-level CMake에서 C++17, extensions off, warning policy가 target별로 어떻게 설정되는지 기록합니다.
- `raycore` library source list와 public include directory boundary를 확인합니다.
- CLI executable이 core source를 다시 compile하지 않고 `raycore`를 link하는 target graph를 그립니다.
- native tests/benchmark가 same library를 재사용할 수 있는 linkage를 확인합니다.
- CTest smoke registration이 active configuration에서 built executable path를 script argument로 전달하는 code를 기록합니다.
- Makefile targets가 configure/build/test/clean을 CMake에 위임하며 competing source graph를 정의하지 않는지 확인합니다.
- MSVC와 non-MSVC warning branches를 구분합니다.

#### Source에서 확정된 이 SHA의 경계

- test가 nested rebuild로 다른 binary를 만들지 않고 active CMake output을 사용합니다.
- `raycore` 분리는 production logic을 test executables가 같은 object contract로 재사용하게 합니다.

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
- 다음 Thread commit: `0e8c3b51e3b7`
- 비교 지침: direct Make compilation 이전 상태와 비교해 CMake가 authoritative graph가 되는 경계를 기록하되 Make wrapper도 source에서 유지됨을 표시합니다.
- 직접 작성한 연결 설명:

### 5.2 `0e8c3b51e3b7` — `test(core): 수학·기하·파서·출력 회귀 기준 추가`

- Importance: B
- Tags: TEST, DETERMINISM
- Thread order: 2/4

#### Source에서 확정된 역할

- Development Thread role: Adds broad component regression coverage.
- Classification summary: Adds component regression coverage for math, primitives, parser errors, PPM encoding, and basic rendering.
- Importance rationale: The suite creates a useful broad baseline, but it mainly codifies expected component behavior rather than proving a difficult cross-subsystem invariant.

#### Test commit 분석 기준

- 대상 production invariant: core math/geometry/parser/output APIs have a reproducible baseline below the CLI and use the same production library.
- 재현하는 failure/boundary: representative vector operations, primitive distances, source-line error, exact small P3 encoding, parsed resolution propagation.
- test technique: native regression executable linked to `raycore`, direct API assertions, CMake-provided fixture path.
- 통과하는 production path: component APIs directly, without CLI argument/process boundary.
- 이 test가 증명하는 것: broad component baseline and reproducible fixture lookup from build tree.
- 이 test가 증명하지 않는 것: all subsystem edge cases, concurrency, acceleration, transactional output failure를 아직 증명하지 않는다.
- test 성격: broad component regression suite.
- 막는 regression: basic math/geometry/parser/PPM contract drift or working-directory-dependent fixture failures.

#### 학습자 검증 기록

- 실제 test case/function과 file path:
- fixture 또는 test double 구성:
- assertion 전에 통과하는 production function 순서:
- failure가 실제로 주입되는 정확한 지점:
- test 실행 명령과 결과:
- false positive 또는 미검증 범위:

#### 해당 SHA에서 확인할 실제 코드

- native regression executable target이 `raycore`를 link하는 CMake 설정을 확인합니다.
- vector operations, sphere/plane/cylinder nearest distances, invalid fixture source line, small P3 text, basic scene resolution cases를 test list로 정리합니다.
- 각 case가 shell CLI를 거치지 않고 호출하는 production API를 기록합니다.
- source directory path가 CMake definition/configuration으로 test binary에 전달되는 방식과 fixture lookup code를 확인합니다.
- CTest working directory가 build tree여도 fixture를 찾는 근거를 재현합니다.
- broad suite가 exact golden/edge regressions 이전에 제공하는 baseline 범위를 기록합니다.

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

- 이전 Thread commit: `2cf2f17980bb`
- 다음 Thread commit: `58d53cce0ee5`
- 비교 지침: shell smoke와 native component test의 failure localization 차이를 비교합니다.
- 직접 작성한 연결 설명:

### 5.3 `58d53cce0ee5` — `build(sanitizers): 메모리와 정의되지 않은 동작 검사 구성`

- Importance: B
- Tags: BUILD, TEST, RISK
- Thread order: 3/4

#### Source에서 확정된 역할

- Development Thread role: Adds an AddressSanitizer/UBSan configuration.
- Classification summary: Adds an opt-in AddressSanitizer/UBSan build and ignores multiple build directories.
- Importance rationale: Sanitizer support is important practical engineering, but it is standard verification infrastructure rather than a project-specific mechanism.

#### 해당 SHA에서 확인할 실제 코드

- `RAY_ENABLE_SANITIZERS` option declaration, default OFF, configuration condition을 기록합니다.
- Clang/GCC detection branch와 unsupported compiler `FATAL_ERROR` path를 확인합니다.
- AddressSanitizer와 UndefinedBehaviorSanitizer compile flags가 core target에 어떻게 설정되는지 기록합니다.
- link flags가 dependent executables/tests까지 전파되는 target property/scope를 확인합니다.
- frame pointer retention flag와 diagnostics 목적을 기록합니다.
- multiple `build*` directories가 version control에서 제외되는 change를 확인합니다.
- ordinary build와 instrumented separate build directory의 command/configuration 차이를 실제로 작성합니다.

#### Source에서 확정된 이 SHA의 경계

- sanitizers are disabled by default.
- availability alone does not prove the suite is run under instrumentation; next CI commit supplies automated execution.

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

- 이전 Thread commit: `0e8c3b51e3b7`
- 다음 Thread commit: `4491bea4d93c`
- 비교 지침: CMake core graph을 유지한 채 opt-in instrumentation만 추가되는지 확인하고, unsupported compiler에서 silent no-op이 아닌 configuration failure임을 기록합니다.
- 직접 작성한 연결 설명:

### 5.4 `4491bea4d93c` — `ci: 플랫폼별 빌드와 회귀 검사 자동화`

- Importance: B
- Tags: BUILD, TEST, INTEGRATION
- Thread order: 4/4

#### Source에서 확정된 역할

- Development Thread role: Runs release regressions on Ubuntu and macOS and sanitizer checks on Linux.
- Classification summary: Automates release builds and regression tests on Ubuntu and macOS plus sanitizer checks on Linux.
- Importance rationale: The CI materially improves reproducibility and platform confidence, yet it does not alter runtime architecture or establish a unique invariant.

#### 해당 SHA에서 확인할 실제 코드

- workflow triggers가 every push와 pull request에 설정되는지 확인합니다.
- Ubuntu release job의 configure/build/CTest commands와 runner/toolchain context를 기록합니다.
- macOS release job이 same regression suite와 platform thread integration을 실행하는지 확인합니다.
- separate Ubuntu debug sanitizer job이 `RAY_ENABLE_SANITIZERS`를 enable하는 command를 기록합니다.
- ASan leak detection와 halt-on-error, UBSan halt behavior environment settings를 확인합니다.
- release portability jobs와 sanitizer diagnostics job이 separate failure surfaces를 갖는 workflow structure를 그립니다.
- shell-based CLI tests와 native tests가 각 platform에서 full CTest로 함께 실행되는지 확인합니다.

#### Source에서 확정된 이 SHA의 경계

- Ubuntu/macOS release와 Linux sanitizer jobs는 서로 다른 failure attribution을 제공합니다.
- CI automation은 tests가 정의한 behavior를 반복 실행하지만 누락된 test case를 자동으로 보완하지는 않습니다.

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

- 이전 Thread commit: `58d53cce0ee5`
- 다음 Thread commit: 이 Thread의 종료점
- 비교 지침: sanitizer option commit과 비교해 local capability가 automated project contract로 실제 사용되는 전환을 기록합니다.
- 직접 작성한 연결 설명:

## 6. Invariant ledger

source가 연결한 invariant의 시간상 변화를 실제 코드 근거로 완성합니다.

| Invariant | 최초 도입/기준 | 강화 또는 수정 | 부족함/위험 노출 | 고정한 test/evidence | 실제 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| 검증이 production `raycore`를 재사용 | 2cf2f17980bb | 0e8c3b51e3b7 | 별도 main/중복 object 사용 위험 | CTest target execution | 작성 |
| instrumented configuration이 실제 suite를 실행 | 58d53cce0ee5 | 4491bea4d93c | option만 존재하고 사용되지 않을 위험 | Linux sanitizer CI job | 작성 |
| 지원 플랫폼에서 release regressions 반복 | 2cf2f17980bb | 4491bea4d93c | local-only validation | Ubuntu/macOS CI jobs | 작성 |

### Ledger 보완 기록

- 각 invariant가 처음 observable behavior가 된 SHA:
- invariant를 우회하거나 깨뜨릴 수 있었던 실제 code path:
- fix 뒤 새로 금지되거나 강제된 state transition:
- test가 invariant를 직접 고정하는 assertion:
- source가 명시하지 않은 invariant를 추가했다면 삭제하거나 근거를 재확인:

## 7. Failure → Fix → Test 연결

| Failure 또는 위험 | Decision/Fix | Test 또는 evidence | 실제 failure path와 assertion |
| --- | --- | --- | --- |
| test가 다른 binary 또는 중복 구현을 검증 | `raycore` 공통 링크와 exact built executable 전달 | CTest 구성과 smoke invocation 확인 | 작성 |
| sanitizer option이 compiler에서 무시됨 | unsupported compiler configuration failure | CI debug sanitizer job | 작성 |
| 한 플랫폼에서만 우연히 통과 | Ubuntu와 macOS release jobs 분리 | 각 job의 full CTest 결과 | 작성 |

### 연결 검토

- feature를 독립적인 성공 경로로만 읽지 않고 어떤 failure를 예방하는지 기록:
- fix가 기존 assumption을 어떻게 수정했는지 기록:
- test가 symptom이 아니라 root cause를 재현하는지 확인:
- test가 증명하지 않는 범위를 별도로 기록:

## 8. Ownership / state / responsibility 변화

- production source object를 어느 target이 빌드하고, executable/test가 무엇을 링크해 재사용하는지 target ownership 관점에서 기록합니다.
- Makefile, CMake, CTest, shell script, CI workflow 중 authoritative build/test responsibility를 구분합니다.

### 학습자 최종 기록

- source state:
- derived/cache state:
- owner와 non-owner:
- mutation 또는 transition boundary:
- failure 시 복구되는 상태:

## 9. Thread 최종 상태

CMake가 authoritative build graph가 되고 `raycore`를 CLI와 tests가 공통으로 링크합니다. CTest component/integration regressions는 로컬과 CI에서 같은 경로로 실행되며, Ubuntu/macOS release와 Linux ASan/UBSan job이 별도로 실패 원인을 드러냅니다.

### 직접 작성

- Thread 시작 시점과 종료 시점의 behavior 차이:
- 최종적으로 authoritative한 contract:
- 아직 다른 Thread가 보완해야 하는 항목:

## 10. 최종 architecture 또는 execution flow 정리

### Source가 확정한 흐름 anchor

`CMake `raycore` target → CLI/component/smoke targets → CTest registration → ASan/UBSan opt-in configuration → Ubuntu/macOS release CI + Linux sanitizer CI`

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
