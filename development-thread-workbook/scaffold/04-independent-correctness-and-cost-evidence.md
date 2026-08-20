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
- **대상 production invariant:** [이 테스트가 직접 대상으로 삼는 production contract를 실제 assertion과 연결해 작성]
- **재현하는 failure/boundary:** [fixture 또는 injected condition이 어떤 실패/경계를 만드는지 작성]
- **test technique:** [unit / CLI integration / exhaustive enumeration / independent replay / fault injection / deterministic baseline / sanitizer 중 실제 사용 기법 기록]
- **통과하는 production path:** [실행 파일 또는 함수 entry부터 핵심 production branch까지 caller → callee 순서로 기록]
- **이 테스트가 증명하는 것:** [assertion과 관찰 가능한 결과에 근거해 작성]
- **이 테스트가 증명하지 않는 것:** [공유 구현, 입력 범위, fault 종류, resource 종류 등 실제 한계를 작성]
- **성격:** [broad integration / deterministic regression / exhaustive small-state / fault regression 중 근거와 함께 분류]
- **막는 후속 회귀:** [이 테스트가 실패해야 하는 구체적 잘못된 변경 예를 작성]

#### 학습자가 복원할 핵심 기록 — A
- **직전 관련 상태와 문제:** [parent 또는 직전 관련 SHA의 실제 코드로 작성]
- **주요 boundary/decision:** [subsystem, ownership, failure, integration 경계 중 이 commit의 핵심을 작성]
- **state / ownership / failure 변화:** [변경 전 → 변경 후를 실제 symbol과 함께 작성]
- **보장 / 비보장:** [이 commit의 책임 경계와 남은 risk를 분리해 작성]
- **후속 검증 또는 수정 연결:** [같은 thread 또는 source가 명시한 cross-thread evidence와 연결]
- **Thread의 다음 관련 commit:** `a16dde75d935`와 비교할 질문을 한 문장으로 작성합니다.

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
- **대상 production invariant:** [이 테스트가 직접 대상으로 삼는 production contract를 실제 assertion과 연결해 작성]
- **재현하는 failure/boundary:** [fixture 또는 injected condition이 어떤 실패/경계를 만드는지 작성]
- **test technique:** [unit / CLI integration / exhaustive enumeration / independent replay / fault injection / deterministic baseline / sanitizer 중 실제 사용 기법 기록]
- **통과하는 production path:** [실행 파일 또는 함수 entry부터 핵심 production branch까지 caller → callee 순서로 기록]
- **이 테스트가 증명하는 것:** [assertion과 관찰 가능한 결과에 근거해 작성]
- **이 테스트가 증명하지 않는 것:** [공유 구현, 입력 범위, fault 종류, resource 종류 등 실제 한계를 작성]
- **성격:** [broad integration / deterministic regression / exhaustive small-state / fault regression 중 근거와 함께 분류]
- **막는 후속 회귀:** [이 테스트가 실패해야 하는 구체적 잘못된 변경 예를 작성]

#### 학습자가 복원할 구현 기록 — B
- **직전 관련 상태:** [이 기능이 들어오기 전 필요한 최소 코드 상태를 작성]
- **이 commit의 구현 역할:** [Source-confirmed role을 실제 변경 함수/호출 관계로 확인해 작성]
- **핵심 state transition 또는 boundary:** [이 commit에서 필요한 부분만 기록]
- **failure/no-op/edge:** [source에 관련 경계가 있으면 실제 branch를 기록. 없으면 억지로 추가하지 않음]
- **이후 연결:** [다음 관련 commit이 이 결과를 어떻게 사용하거나 검증하는지 기록]
- **Thread의 다음 관련 commit:** `23198a9cdd55`와 비교할 질문을 한 문장으로 작성합니다.

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
- **대상 production invariant:** [이 테스트가 직접 대상으로 삼는 production contract를 실제 assertion과 연결해 작성]
- **재현하는 failure/boundary:** [fixture 또는 injected condition이 어떤 실패/경계를 만드는지 작성]
- **test technique:** [unit / CLI integration / exhaustive enumeration / independent replay / fault injection / deterministic baseline / sanitizer 중 실제 사용 기법 기록]
- **통과하는 production path:** [실행 파일 또는 함수 entry부터 핵심 production branch까지 caller → callee 순서로 기록]
- **이 테스트가 증명하는 것:** [assertion과 관찰 가능한 결과에 근거해 작성]
- **이 테스트가 증명하지 않는 것:** [공유 구현, 입력 범위, fault 종류, resource 종류 등 실제 한계를 작성]
- **성격:** [broad integration / deterministic regression / exhaustive small-state / fault regression 중 근거와 함께 분류]
- **막는 후속 회귀:** [이 테스트가 실패해야 하는 구체적 잘못된 변경 예를 작성]

#### 학습자가 복원할 구현 기록 — B
- **직전 관련 상태:** [이 기능이 들어오기 전 필요한 최소 코드 상태를 작성]
- **이 commit의 구현 역할:** [Source-confirmed role을 실제 변경 함수/호출 관계로 확인해 작성]
- **핵심 state transition 또는 boundary:** [이 commit에서 필요한 부분만 기록]
- **failure/no-op/edge:** [source에 관련 경계가 있으면 실제 branch를 기록. 없으면 억지로 추가하지 않음]
- **이후 연결:** [다음 관련 commit이 이 결과를 어떻게 사용하거나 검증하는지 기록]
- **Thread의 다음 관련 commit:** `6569949742eb`와 비교할 질문을 한 문장으로 작성합니다.

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
- **대상 production invariant:** [이 테스트가 직접 대상으로 삼는 production contract를 실제 assertion과 연결해 작성]
- **재현하는 failure/boundary:** [fixture 또는 injected condition이 어떤 실패/경계를 만드는지 작성]
- **test technique:** [unit / CLI integration / exhaustive enumeration / independent replay / fault injection / deterministic baseline / sanitizer 중 실제 사용 기법 기록]
- **통과하는 production path:** [실행 파일 또는 함수 entry부터 핵심 production branch까지 caller → callee 순서로 기록]
- **이 테스트가 증명하는 것:** [assertion과 관찰 가능한 결과에 근거해 작성]
- **이 테스트가 증명하지 않는 것:** [공유 구현, 입력 범위, fault 종류, resource 종류 등 실제 한계를 작성]
- **성격:** [broad integration / deterministic regression / exhaustive small-state / fault regression 중 근거와 함께 분류]
- **막는 후속 회귀:** [이 테스트가 실패해야 하는 구체적 잘못된 변경 예를 작성]

#### 학습자가 복원할 핵심 기록 — A
- **직전 관련 상태와 문제:** [parent 또는 직전 관련 SHA의 실제 코드로 작성]
- **주요 boundary/decision:** [subsystem, ownership, failure, integration 경계 중 이 commit의 핵심을 작성]
- **state / ownership / failure 변화:** [변경 전 → 변경 후를 실제 symbol과 함께 작성]
- **보장 / 비보장:** [이 commit의 책임 경계와 남은 risk를 분리해 작성]
- **후속 검증 또는 수정 연결:** [같은 thread 또는 source가 명시한 cross-thread evidence와 연결]
- **Thread의 다음 관련 commit:** `5505adf3e469`와 비교할 질문을 한 문장으로 작성합니다.

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
- **직전 관련 상태:** [이 기능이 들어오기 전 필요한 최소 코드 상태를 작성]
- **이 commit의 구현 역할:** [Source-confirmed role을 실제 변경 함수/호출 관계로 확인해 작성]
- **핵심 state transition 또는 boundary:** [이 commit에서 필요한 부분만 기록]
- **failure/no-op/edge:** [source에 관련 경계가 있으면 실제 branch를 기록. 없으면 억지로 추가하지 않음]
- **이후 연결:** [다음 관련 commit이 이 결과를 어떻게 사용하거나 검증하는지 기록]
- **Thread 내 다음 commit:** 없음. Thread 최종 상태에서 이 commit의 남은 역할을 정리합니다.

## 6. Invariant ledger

| Invariant / contract | 처음 도입 | 강화 | 부족함이 드러난 지점 | fix | regression / evidence | 학습자 확인 메모 |
| --- | --- | --- | --- | --- | --- | --- |
| product checker가 유일한 correctness oracle이 아님 | 5b7559278909 | 23198a9cdd55에서 deterministic repetition 강화 | - | - | Python replay + product checker의 dual evidence | [해당 SHA 코드 근거 작성] |
| fixed fixtures에서 resource metrics reproducible | 6569949742eb | - | - | - | versioned JSON baseline | [해당 SHA 코드 근거 작성] |
| sanitizer instrumentation과 normal objects 분리 | 5505adf3e469 | - | - | - | sanitizer target 실행 | [해당 SHA 코드 근거 작성] |

## 7. Failure → Fix → Test 연결

| Failure / risk | 기존 또는 선택한 대응 | Fix commit | Test / evidence | 학습자 root-cause 기록 |
| --- | --- | --- | --- | --- |
| generator와 checker가 같은 잘못된 operation semantics를 공유 | 5b7559278909의 independent Python model | - | 5b7559278909 자체가 regression evidence | [실제 branch와 연결] |
| ambient randomness로 fixture/stream 비교가 불안정 | 23198a9cdd55의 specified generator | - | 반복 실행 command-list equality | [실제 branch와 연결] |
| command count만 보면 array movement/memory trade-off가 숨음 | 6569949742eb의 분리 instrumentation | - | versioned resource baseline | [실제 branch와 연결] |

## 8. Ownership / state / responsibility 변화

| 대상 | 이 Thread 시작 시 | 변화 commit | 이 Thread 종료 시 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| C generator/checker product code | [시작 상태 확인] | [관련 SHA 기록] | [종료 상태 확인] | `[SHA:path:symbol]` |
| independent Python A/B model | [시작 상태 확인] | [관련 SHA 기록] | [종료 상태 확인] | `[SHA:path:symbol]` |
| fault-build instrumentation counters | [시작 상태 확인] | [관련 SHA 기록] | [종료 상태 확인] | `[SHA:path:symbol]` |
| resource baseline JSON | [시작 상태 확인] | [관련 SHA 기록] | [종료 상태 확인] | `[SHA:path:symbol]` |
| sanitizer object tree | [시작 상태 확인] | [관련 SHA 기록] | [종료 상태 확인] | `[SHA:path:symbol]` |

## 9. Thread 최종 상태
- **Source 기준 최종 상태:** [이 Thread의 마지막 commit까지 source가 확정한 상태를 commit map과 invariant ledger를 이용해 학습자가 한 문단으로 재구성]
- **남아 있는 한계 / 다른 Thread로 넘어가는 책임:** [source가 명시한 후속 hardening 또는 verification만 연결하고 임의의 개선안을 정답처럼 추가하지 않음]

## 10. 최종 architecture 또는 execution flow 정리
- Source-derived flow anchor: `emitted stream → independent Python replay + checker → deterministic fixture repetition → command/resource baseline → ASan/UBSan functional replay`
- **학습자 최종 flow:** [각 화살표마다 실제 `SHA:path:symbol`을 붙여 호출·state mutation·ownership·failure 경로를 다시 작성]
- **실제 코드 삽입:** [핵심 decision을 설명하는 최소 코드만 해당 SHA에서 인용. full function 또는 final HEAD 코드 복사는 피함]

## 11. 학습 완료 자가 점검
- [ ] Thread commit 순서를 source와 동일하게 유지했습니다.
- [ ] 모든 commit에서 지정된 SHA의 코드를 직접 확인했습니다.
- [ ] final HEAD를 과거 commit 설명에 소급 사용하지 않았습니다.
- [ ] Source-confirmed fact와 직접 코드 확인 결과를 구분했습니다.
- [ ] S/A commit은 decision, invariant, ownership/failure, 후속 evidence까지 추적했습니다.
- [ ] B commit은 Thread 흐름에서 맡는 구현 역할과 필요한 state/boundary만 충분히 확인했습니다.
- [ ] test commit마다 production invariant, failure/boundary, technique, production path, 증명/비증명 범위를 구분했습니다.
- [ ] fix commit은 기존 가정 → failure/risk → root cause → 수정 invariant → 실제 코드 → regression evidence 순서로 연결했습니다.
- [ ] Invariant ledger와 Failure → Fix → Test 표를 실제 코드 근거로 채웠습니다.
- [ ] 별도 프로젝트 재학습 없이 이 Thread의 설계 → 구현 → 실패/위험 → 수정/검증 흐름을 commit history에 근거해 설명할 수 있습니다.
