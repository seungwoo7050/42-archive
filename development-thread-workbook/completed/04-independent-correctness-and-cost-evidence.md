# Thread: Independent correctness and cost evidence

## 1. Thread 목표
- **Source significance:** Verification deliberately broadens from functional outcomes to independence, reproducibility, and cost. The Python model reduces common-mode risk from the product checker, deterministic fixtures make regressions comparable, resource instrumentation exposes the array representation's hidden movement cost, and sanitizers cover invalid memory behavior that explicit assertions may miss.
- **학습 목표:** product checker와 공유 구현만으로는 잡기 어려운 common-mode risk를 independent replay로 줄이고, correctness뿐 아니라 determinism, command cost, movement cost, allocation cost, sanitizer evidence를 분리해 기록합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문
- Python replay model은 C product code와 무엇을 공유하지 않아 독립 oracle이 되는가?
- tiny exhaustive permutations와 larger fixed cases가 각각 어떤 영역을 커버하는가?
- command budget이 wall-clock time 대신 사용되는 이유와 검증 순서는 무엇인가?
- specified PRNG/permutation generator가 reproducibility와 stream determinism을 어떻게 고정하는가?
- 6569949742eb의 command/movement/peak-allocation metric이 서로 다른 어떤 비용을 나타내는가?
- ASan/UBSan 경로가 fault/resource suite를 대체하지 않는 이유는 무엇인가?

## 3. 완료 기준
- 독립 Python interpreter의 11개 command semantics와 final predicate를 production C와 나란히 비교했습니다.
- 각 test layer가 증명하는 것과 증명하지 않는 것을 구분해 기록했습니다.
- deterministic fixture 생성기와 repeated-stream equality를 직접 추적했습니다.
- resource hooks가 normal build에서 no-op이고 fault build에서만 측정되는 경계를 확인했습니다.
- sanitizer build의 object-tree 분리와 실행 대상 범위를 확인했습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Source-confirmed role |
| --- | --- | --- | --- | --- | --- |
| 1 | `5b7559278909` | test(sort): 생성 명령의 정렬 결과를 독립 검증 | A | TEST, SORT, RISK | Adds an independent Python command interpreter and exhaustive permutations through size five. |
| 2 | `a16dde75d935` | test(sort): 큰 입력의 명령 수 상한을 검증 | B | TEST, PERF, SORT | Adds command-count ceilings for large deterministic cases. |
| 3 | `23198a9cdd55` | test(sort): 결정적 다중 시드 동치 검사를 추가 | B | TEST, SORT | Replaces ambient randomness with a specified permutation generator and checks repeated-stream determinism. |
| 4 | `6569949742eb` | test(resource): 명령과 배열 이동 및 할당량을 기준화 | A | TEST, RESOURCE, PERF | Separately baselines emitted commands, logical pair movements, peak project allocation, and final cleanup. |
| 5 | `5505adf3e469` | build(sanitize): C99 sanitizer 검증 경로를 추가 | B | TEST, RUNTIME, PRACTICAL | Runs the operation and functional suites against isolated ASan/UBSan builds. |

### Source에서 직접 연결된 invariant / engineering difficulty
- **Critical invariants**
  - Resource metrics count only successfully emitted commands and remain reproducible for the fixed deterministic fixtures.
- **Major engineering difficulties**
  - Sharing operation semantics between generator and checker without allowing that sharing to become the sole correctness oracle.
  - Instrumenting allocation, operation, and movement costs in C while preserving normal-build behavior and separating logical command cost from physical array movement.

## 5. Commit별 학습 기록

> 모든 코드 확인은 반드시 해당 commit SHA 시점에서 수행합니다. final HEAD의 구현을 소급해 해석하지 않습니다.

### `5b7559278909` — test(sort): 생성 명령의 정렬 결과를 독립 검증
- **Importance:** A
- **Tags:** TEST, SORT, RISK
- **Source-confirmed role:** Adds an independent Python command interpreter and exhaustive permutations through size five.
- **Classification summary:** Replays emitted commands in an independent Python model and exhausts all permutations through size five.

#### Source-confirmed context
- **Problem:** The product checker and generator share the C operation implementation. A defect in push or rotation semantics could therefore cause both programs to accept the same incorrect behavior.
- **Decision:** Implement the eleven commands again using Python lists, reject unknown emitted commands, replay every stream independently, require sorted A and empty B, and still pass the same stream through the product checker.
- **Why it mattered:** The two representations fail differently. Exhausting every permutation for sizes two through five strongly covers the direct sorting branches, while fixed larger cases exercise the radix path. The checker remains valuable for integration, but it is no longer the only oracle.
- **What changed:** The test suite adds command parsing, an independent A/B state model, fixed cases including integer extremes, the no-command already-sorted case, and all 152 permutations for sizes two through five.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only 5b7559278909`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `5b7559278909` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- Python list 기반 A/B model에서 11개 command를 각각 구현한 부분을 확인합니다.
- unknown emitted command를 reject하고 final A == Python numeric sort, B empty를 검사하는 path를 확인합니다.
- 같은 stream을 product checker에도 전달하는 second-oracle 흐름을 확인합니다.
- fixed cases와 sizes 2..5의 모든 permutation 152개를 구성하는 loop를 확인합니다.
- already sorted input에서 zero command를 요구하는 assertion을 확인합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### Test commit 학습 기록
- **대상 production invariant:** `push_swap`이 출력한 각 줄은 11개 합법 command 중 하나이고, 독립 replay 후 A가 Python의 numeric sort 결과와 같고 B가 비어 있어야 합니다. 같은 stream을 product checker도 `OK`로 판정해야 합니다.
- **재현하는 failure/boundary:** integer extremes를 포함한 fixed cases, already-sorted five-element zero-command case, radix 경로의 size 6/10, size 2~5의 모든 permutation 152개를 사용합니다.
- **test technique:** independent Python list replay + exhaustive small-state enumeration + product checker CLI integration입니다.
- **통과하는 production path:** test subprocess가 `push_swap` 실행 → stdout command split/validation → Python `apply_moves` → final A/B assertion → 같은 stream을 checker stdin으로 전달합니다.
- **이 테스트가 증명하는 것:** 나열한 모든 input에서 emitted vocabulary, independent final state, B-empty, product checker integration을 함께 확인합니다. tiny sorter의 전체 입력 상태 공간을 size 5까지 exhaust합니다.
- **이 테스트가 증명하지 않는 것:** size 6 이상 전체 상태, 최적 command 수, allocation/read/write failure, undefined behavior 부재는 증명하지 않습니다. Python 구현 자체의 결함 가능성도 0은 아니지만 C shared-operation common-mode risk는 크게 줄입니다.
- **성격:** exhaustive small-state evidence와 broad dual-oracle integration evidence를 결합한 regression입니다.
- **막는 후속 회귀:** generator와 checker가 같은 잘못된 rotate/push를 공유해도 Python final state가 실패하며, tiny branch 누락·unknown command·sorted input 불필요 출력도 잡습니다.

#### 학습자가 복원할 핵심 기록 — A
- **직전 관련 상태와 문제:** parser/sorter/checker와 operation tests는 있었지만 generator와 checker가 같은 C operation semantics를 공유해 공통 결함을 함께 수용할 수 있었습니다.
- **주요 boundary/decision:** product C와 자료구조를 공유하지 않는 Python list A/B model을 새 oracle로 두고, product checker는 별도 integration oracle로 유지했습니다.
- **state / ownership / failure 변화:** production code에는 변화가 없습니다. test harness가 command list를 소유하고 unknown line을 즉시 실패시키며 두 oracle에 순차 전달합니다.
- **보장 / 비보장:** tiny 전체 permutation과 selected radix cases의 functional correctness를 강하게 증명하지만, 일반 크기의 완전성·performance·resource·runtime fault는 남습니다.
- **후속 검증 또는 수정 연결:** `a16dde75d935`가 큰 입력의 command ceiling, `23198a9cdd55`가 specified fixture와 stream determinism, `6569949742eb`가 movement/allocation, `5505adf3e469`가 sanitizer evidence를 추가합니다.
- **Thread의 다음 관련 commit:** `a16dde75d935`는 correctness를 먼저 확인한 뒤 command count를 평가함으로써 빠르지만 잘못된 stream을 어떻게 배제하는가?

### `a16dde75d935` — test(sort): 큰 입력의 명령 수 상한을 검증
- **Importance:** B
- **Tags:** TEST, PERF, SORT
- **Source-confirmed role:** Adds command-count ceilings for large deterministic cases.
- **Classification summary:** Adds reproducible command-count ceilings for 100- and 500-element inputs.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only a16dde75d935`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `a16dde75d935` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- 100/500 unique value fixture와 fixed seed 생성 방식을 확인합니다.
- command budget 비교 전에 independent correctness helper가 먼저 stream correctness를 검증하는 순서를 확인합니다.
- configured command-count ceiling과 실제 emitted line 수 비교 위치를 확인합니다.
- wall-clock time이 pass criterion에 사용되지 않는지 확인합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### Test commit 학습 기록
- **대상 production invariant:** 100/500 unique input에서 stream이 먼저 정확히 정렬되고, 그 뒤 command line 수가 각각 설정된 ceiling 이하이어야 합니다.
- **재현하는 failure/boundary:** Python `random.seed(4242)`와 unique sample로 크기 100, 500 fixture를 고정합니다.
- **test technique:** deterministic large-case command-budget regression이며 correctness helper를 선행합니다.
- **통과하는 production path:** fixture 생성 → `assert_sorted_by_program`의 independent replay/checker → stdout line count → ceiling 비교입니다.
- **이 테스트가 증명하는 것:** 해당 두 fixture에서 정확성과 command-count 상한을 함께 확인합니다. wall-clock 변동에 영향받지 않습니다.
- **이 테스트가 증명하지 않는 것:** 모든 100/500 permutation의 worst case, CPU 시간, array movement, memory, 다른 Python 구현의 random algorithm 차이까지 고정하지는 않습니다.
- **성격:** fixed-seed deterministic performance regression입니다.
- **막는 후속 회귀:** correctness는 유지하지만 불필요한 pass/command가 크게 늘어 ceiling을 넘는 변경을 막습니다.

#### 학습자가 복원할 구현 기록 — B
- **직전 관련 상태:** correctness evidence는 있었지만 large input command growth를 수치로 제한하지 않았습니다.
- **이 commit의 구현 역할:** fixed-seed 100/500 fixture와 1500/8000 command ceiling을 추가합니다.
- **핵심 state transition 또는 boundary:** budget assertion 전에 independent correctness가 완료되므로 잘못된 짧은 stream은 performance 성공으로 계산되지 않습니다.
- **failure/no-op/edge:** elapsed wall-clock은 pass/fail에 쓰지 않습니다. 이 SHA의 fixture reproducibility는 Python `random` 구현에 기대며 generator specification 자체는 아직 문서화되지 않았습니다.
- **이후 연결:** `23198a9cdd55`가 명시적 32-bit PRNG/Fisher–Yates로 fixture 생성 규칙을 고정하고 seed를 늘립니다.
- **Thread의 다음 관련 commit:** `23198a9cdd55`는 Python ambient randomness 대신 어떤 명시적 상태 전이와 permutation 규칙을 사용하며 동일 input의 stream equality를 어떻게 확인하는가?

### `23198a9cdd55` — test(sort): 결정적 다중 시드 동치 검사를 추가
- **Importance:** B
- **Tags:** TEST, SORT
- **Source-confirmed role:** Replaces ambient randomness with a specified permutation generator and checks repeated-stream determinism.
- **Classification summary:** Uses an explicit deterministic permutation generator and checks repeatable streams across seeds and sizes.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only 23198a9cdd55`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `23198a9cdd55` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- specified 32-bit LCG state update와 Fisher–Yates permutation 구현을 확인합니다.
- permutation 값을 unique signed integers로 변환하는 규칙을 확인합니다.
- tiny/radix boundary 양쪽 size와 multiple seed coverage를 확인합니다.
- 같은 fixture를 두 번 실행해 command list equality를 검사하는 assertion을 확인합니다.
- 100/500 budgets가 세 seed로 확장되는 부분과 executable path env override를 확인합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### Test commit 학습 기록
- **대상 production invariant:** 동일한 입력은 동일한 command list를 생성하며, 여러 seed/size에서 독립 replay correctness와 budget을 유지해야 합니다.
- **재현하는 failure/boundary:** seed 1, 7, 97, 4242, 9001과 size 2,3,5,6,17,64로 tiny/radix 경계를 가로지릅니다. budget은 size 100/500에 seed 7,4242,9001을 사용합니다.
- **test technique:** specified deterministic fixture generation, repeated-run stream equality, multi-seed CLI regression입니다.
- **통과하는 production path:** 32-bit LCG → Fisher–Yates permutation → `value * 37 - size * 23` unique signed values → generator 두 번 실행 → command list equality와 independent replay/checker입니다.
- **이 테스트가 증명하는 것:** 같은 generator specification으로 fixture가 재현되고 동일 input의 command sequence가 반복 실행에서 정확히 같으며 여러 경계 size가 정렬됩니다.
- **이 테스트가 증명하지 않는 것:** process scheduling이나 환경과 무관한 모든 형태의 determinism, 모든 seed, 최적 sequence는 증명하지 않습니다.
- **성격:** deterministic equivalence 및 multi-seed regression입니다.
- **막는 후속 회귀:** uninitialized state나 ambient random에 의한 command variation, 특정 seed/boundary size에만 나타나는 sorter 오류를 막습니다.

#### 학습자가 복원할 구현 기록 — B
- **직전 관련 상태:** fixed seed는 있었지만 fixture algorithm이 Python library behavior에 기대고 같은 input의 stream equality도 직접 검사하지 않았습니다.
- **이 commit의 구현 역할:** `tests/run_tests.py:deterministic_values`에 다음 명시적 update를 두고 executable path도 environment override로 바꿉니다.

```python
# 23198a9cdd55:tests/run_tests.py:deterministic_values
state = (1664525 * state + 1013904223) & 0xFFFFFFFF
```

- **핵심 state transition 또는 boundary:** Fisher–Yates가 `0..size-1` permutation을 만들고 affine mapping이 uniqueness를 유지한 signed values를 만듭니다. 같은 argv를 두 번 실행해 parsed command list 자체를 비교합니다.
- **failure/no-op/edge:** size 5/6이 tiny/radix dispatch 경계입니다. path override는 후속 sanitizer binaries에 같은 functional suite를 재사용할 기반이 됩니다.
- **이후 연결:** `6569949742eb`이 동일 deterministic cases를 resource baseline으로 확장하고, `5505adf3e469`가 path override로 sanitizer 실행 파일을 사용합니다.
- **Thread의 다음 관련 commit:** `6569949742eb`은 emitted command 수와 array pair movement 및 peak requested bytes를 어떤 서로 다른 hook에서 기록하는가?

### `6569949742eb` — test(resource): 명령과 배열 이동 및 할당량을 기준화
- **Importance:** A
- **Tags:** TEST, RESOURCE, PERF
- **Source-confirmed role:** Separately baselines emitted commands, logical pair movements, peak project allocation, and final cleanup.
- **Classification summary:** Instruments successful commands, logical pair movements, peak project allocation, and deterministic resource baselines.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only 6569949742eb`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `6569949742eb` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- fault build에서 command count가 text emission 성공 뒤에만 증가하는 hook 위치를 확인합니다.
- array operation에서 logical value-rank pair movement/rewrite를 세는 instrumentation 지점을 확인합니다.
- current/peak requested allocation bytes가 instrumentation header를 제외해 계산되는지 확인합니다.
- versioned JSON baseline의 10/100/500 × 3 seed case, exact command count, movement/peak upper bound를 확인합니다.
- zero live allocations와 recorded operation count == emitted command line count 검증을 확인합니다.
- normal build에서 instrumentation hooks가 no-op으로 컴파일되는 경계를 확인합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### Test commit 학습 기록
- **대상 production invariant:** counter는 성공적으로 출력된 command만 세고, fixed fixture의 command 수는 exact baseline과 같으며, pair movement·peak requested bytes는 upper bound 이내이고 종료 시 live allocation은 0이어야 합니다.
- **재현하는 failure/boundary:** versioned JSON에 size 10/100/500 × seed 7/4242/9001을 고정합니다. exact command 수는 각각 65/1084/6784이며 movement 상한은 650/105000/3200000, peak bytes 상한은 160/1600/8000입니다.
- **test technique:** compile-time instrumentation + deterministic resource baseline + subprocess report parsing입니다.
- **통과하는 production path:** fault-build generator → successful `ps_putstr_fd` 뒤 `ps_record_operation` → operation primitive의 `ps_record_movements` → `ps_malloc` current/peak tracking → exit `ps_test_finish` report → Python baseline comparison입니다.
- **이 테스트가 증명하는 것:** selected fixtures에서 emitted line 수와 recorded operation 수가 같고 exact command determinism, movement/peak ceiling, zero live allocation을 확인합니다.
- **이 테스트가 증명하지 않는 것:** libc 내부 allocation, actual bytes copied by libc, CPU time, 모든 input worst case, normal build binary의 instrumentation 없는 runtime behavior를 직접 측정하지 않습니다.
- **성격:** deterministic resource/performance regression입니다.
- **막는 후속 회귀:** command counter가 실패 전 증가하는 변경, array movement 급증, project allocation peak 증가, cleanup 누락, fixture stream 변화가 baseline을 깨뜨립니다.

#### 학습자가 복원할 핵심 기록 — A
- **직전 관련 상태와 문제:** command line 수만으로는 array-backed operation의 `memmove` 비용과 memory peak가 보이지 않았습니다.
- **주요 boundary/decision:** logical command, logical value-rank pair rewrite, project-requested allocation bytes를 서로 다른 metric으로 분리하고 fault build에만 hook을 활성화했습니다.
- **state / ownership / failure 변화:** normal build에서는 hook macro가 no-op이라 production semantics를 바꾸지 않습니다. fault build allocator header가 requested size를 보관하되 peak 계산에서는 header를 제외하고 caller가 요청한 bytes만 사용합니다.
- **보장 / 비보장:** fixed cases에서 재현 가능한 relative cost를 제공합니다. movement metric은 실제 CPU/cache cost가 아니라 구현이 정의한 pair 이동/재작성 횟수입니다.
- **후속 검증 또는 수정 연결:** `5505adf3e469`의 sanitizer는 invalid memory/UB를 다루지만 baseline cost나 deterministic fault cleanup을 대체하지 않습니다. Thread 6의 I/O fault tests는 write 실패에서 counter와 cleanup 의미를 보강합니다.
- **Thread의 다음 관련 commit:** `5505adf3e469`는 normal/fault objects와 섞이지 않는 별도 object tree에서 어떤 executable/test를 ASan/UBSan으로 재실행하는가?

### `5505adf3e469` — build(sanitize): C99 sanitizer 검증 경로를 추가
- **Importance:** B
- **Tags:** TEST, RUNTIME, PRACTICAL
- **Source-confirmed role:** Runs the operation and functional suites against isolated ASan/UBSan builds.
- **Classification summary:** Builds separate ASan and UBSan binaries and runs operation and functional suites against them.

#### 해당 SHA에서 확인할 코드
- 먼저 `git show --name-only 5505adf3e469`로 이 commit이 실제로 건드린 파일을 확정합니다.
- 아래 항목은 반드시 `5505adf3e469` 시점의 파일에서 확인합니다. final HEAD의 같은 함수로 대체하지 않습니다.
- Makefile의 sanitizer 전용 object directory와 normal object reuse 방지 구조를 확인합니다.
- ASan/UBSan compile/link flags, debug info, optimization, frame-pointer 설정을 확인합니다.
- 두 executable과 C operation-invariant test가 sanitizer target에 포함되는지 확인합니다.
- configurable executable paths로 full Python functional suite를 sanitizer binaries에 재사용하는 흐름을 확인합니다.
- fault/resource suites와 sanitizer가 서로 다른 defect class를 다룬다는 실행 경계를 확인합니다.
- 코드 인용을 남길 때는 `SHA:path:symbol` 형식으로 위치를 기록하고, 설명에 필요한 최소 구문만 삽입합니다.

#### 학습자가 복원할 구현 기록 — B
- **직전 관련 상태:** functional, deterministic, resource evidence는 있었지만 ASan/UBSan instrumented object를 분리해 build/run하는 경로가 없었습니다.
- **이 commit의 구현 역할:** Makefile이 `.build/sanitize` 전용 object tree와 `-O1 -g -fno-omit-frame-pointer -fsanitize=address,undefined` compile/link flags를 사용해 sanitized `push_swap`, `checker`, operation invariant test를 만듭니다.
- **핵심 state transition 또는 boundary:** sanitizer target은 operation C test를 실행하고, `PS_PUSH_SWAP`/`PS_CHECKER` environment override로 full Python functional suite를 sanitized executables에 재사용합니다. normal object와 섞이지 않습니다.
- **failure/no-op/edge:** sanitizer target은 fault-injection 및 resource suite를 대신 실행하지 않습니다. ASan/UBSan은 invalid access/UB 관찰이고 deterministic injected failure·metric baseline은 별도 build의 책임입니다.
- **이후 연결:** 이 Thread의 최종 evidence stack은 independent replay, deterministic budgets/resources, sanitizer가 서로 다른 결함 종류를 담당하는 형태입니다.
- **Thread 내 다음 commit:** 없음. Thread 최종 상태에서 이 commit의 남은 역할을 정리합니다.

## 6. Invariant ledger

| Invariant / contract | 처음 도입 | 강화 | 부족함이 드러난 지점 | fix | regression / evidence | 학습자 확인 메모 |
| --- | --- | --- | --- | --- | --- | --- |
| product checker가 유일한 correctness oracle이 아님 | 5b7559278909 | 23198a9cdd55에서 deterministic repetition 강화 | - | - | Python replay + product checker의 dual evidence | Python list model이 11개 semantics와 final predicate를 독립 구현하고 checker는 integration oracle로 병행됩니다. |
| fixed fixtures에서 resource metrics reproducible | 6569949742eb | - | - | - | versioned JSON baseline | specified generator와 JSON의 exact command/upper bounds를 사용하며 operation count는 emitted line 수와 비교됩니다. |
| sanitizer instrumentation과 normal objects 분리 | 5505adf3e469 | - | - | - | sanitizer target 실행 | `.build/sanitize` 전용 objects와 flags를 사용해 normal/fault objects의 flag 혼합을 방지합니다. |

## 7. Failure → Fix → Test 연결

| Failure / risk | 기존 또는 선택한 대응 | Fix commit | Test / evidence | 학습자 root-cause 기록 |
| --- | --- | --- | --- | --- |
| generator와 checker가 같은 잘못된 operation semantics를 공유 | 5b7559278909의 independent Python model | - | 5b7559278909 자체가 regression evidence | shared C implementation만 oracle로 사용한 common-mode risk를 자료구조와 코드가 다른 Python replay로 낮춥니다. |
| ambient randomness로 fixture/stream 비교가 불안정 | 23198a9cdd55의 specified generator | - | 반복 실행 command-list equality | 32-bit LCG와 Fisher–Yates를 test code에 직접 규정하고 같은 argv를 두 번 실행해 stream을 비교합니다. |
| command count만 보면 array movement/memory trade-off가 숨음 | 6569949742eb의 분리 instrumentation | - | versioned resource baseline | output success 뒤 command counter, primitive별 pair movement, allocator requested bytes를 별도 metric으로 둡니다. |

## 8. Ownership / state / responsibility 변화

| 대상 | 이 Thread 시작 시 | 변화 commit | 이 Thread 종료 시 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| C generator/checker product code | shared operation만으로 상호 검증 | 5b7559278909 이후 test layers | product code는 그대로이고 외부 독립·resource·sanitizer oracle이 둘러쌈 | `5b7559278909:tests/run_tests.py` |
| independent Python A/B model | 없음 | 5b7559278909 | command list를 독립 replay하고 sorted A/B-empty를 판정 | `5b7559278909:tests/run_tests.py:apply_moves` |
| fault-build instrumentation counters | allocation fault 기본 counter만 존재 | 6569949742eb | command, movement, current/peak bytes, live allocation을 보고 | `6569949742eb:src/runtime.c`, `src/operations.c` |
| resource baseline JSON | 없음 | 6569949742eb | versioned deterministic cases와 exact/upper bounds 소유 | `6569949742eb:tests/resource_baseline.json` |
| sanitizer object tree | 없음 | 5505adf3e469 | normal/fault와 분리된 ASan/UBSan objects와 binaries | `5505adf3e469:Makefile` |

## 9. Thread 최종 상태
- **Source 기준 최종 상태:** emitted stream은 Python list model과 product checker 두 경로로 검증되고, tiny size 2~5는 152개 permutation을 exhaust합니다. specified LCG/Fisher–Yates fixture는 repeated command equality와 multi-seed budget을 고정합니다. fault build는 성공 command, pair movement, project allocation peak, final live count를 versioned JSON과 비교하며, 별도 sanitizer object tree가 operation/functional suite를 ASan/UBSan binaries로 재실행하도록 구성됩니다.
- **남아 있는 한계 / 다른 Thread로 넘어가는 책임:** 각 layer의 증명 범위는 교환 불가능합니다. sanitizer는 deterministic fault injection이나 resource ceiling을 대체하지 않고, selected deterministic cases는 모든 input의 worst case를 증명하지 않습니다. 이 환경에서는 GitHub source checkout이 불가능해 targets를 실제 실행하지 않았으므로 문서의 결과 설명은 test 코드의 assertion/expected baseline을 정적으로 확인한 것이며 새 runtime evidence가 아닙니다.

## 10. 최종 architecture 또는 execution flow 정리
- Source-derived flow anchor: `emitted stream → independent Python replay + checker → deterministic fixture repetition → command/resource baseline → ASan/UBSan functional replay`
- **학습자 최종 flow:** `5b7559278909:run_tests.py`가 generator stream을 legal command로 제한하고 Python A/B에 replay한 뒤 checker에도 전달합니다 → `23198a9cdd55:deterministic_values`가 fixture와 두 번의 stream equality를 고정합니다 → `6569949742eb` fault build가 output-success command, primitive movement, requested allocation metrics를 report하고 JSON과 비교합니다 → `5505adf3e469:Makefile` sanitizer target이 별도 binaries로 C operation test와 같은 Python functional suite를 실행하도록 연결합니다.
- **실제 코드 삽입:** 독립성의 핵심은 Python list operation이고, 재현성의 핵심은 `state = (1664525 * state + 1013904223) & 0xFFFFFFFF`입니다. resource 측정은 command 출력 성공 뒤에만 operation counter를 증가시키는 hook 배치로 external stream과 metric을 일치시킵니다.

## 11. 학습 완료 자가 점검
- [x] Thread commit 순서를 source와 동일하게 유지했습니다.
- [x] 모든 commit에서 지정된 SHA의 코드를 직접 확인했습니다.
- [x] final HEAD를 과거 commit 설명에 소급 사용하지 않았습니다.
- [x] Source-confirmed fact와 직접 코드 확인 결과를 구분했습니다.
- [x] S/A commit은 decision, invariant, ownership/failure, 후속 evidence까지 추적했습니다.
- [x] B commit은 Thread 흐름에서 맡는 구현 역할과 필요한 state/boundary만 충분히 확인했습니다.
- [x] test commit마다 production invariant, failure/boundary, technique, production path, 증명/비증명 범위를 구분했습니다.
- [x] fix commit은 기존 가정 → failure/risk → root cause → 수정 invariant → 실제 코드 → regression evidence 순서로 연결했습니다.
- [x] Invariant ledger와 Failure → Fix → Test 표를 실제 코드 근거로 채웠습니다.
- [x] 별도 프로젝트 재학습 없이 이 Thread의 설계 → 구현 → 실패/위험 → 수정/검증 흐름을 commit history에 근거해 설명할 수 있습니다.
