# Thread: Wall-clock helper to one shared monotonic start epoch

이 문서는 source에 정의된 두 번째 Development Thread를 그대로 따릅니다. commit 순서, SHA, importance, tags는 변경하지 않습니다. time field와 barrier field는 반드시 해당 SHA에서 확인하고 final HEAD의 완성된 protocol을 이전 commit에 소급하지 않습니다.

## 1. Thread 목표

이 Thread의 목표는 단순한 millisecond helper가 어떻게 monotonic elapsed-time model로 교정되고, 다시 worker readiness barrier와 결합해 모든 philosopher가 하나의 valid start epoch를 공유하게 되는지 복원하는 것입니다.

Source-confirmed significance는 다음과 같습니다.

- 초기 helper는 time logic을 한곳에 모으고 terminal-aware polling sleep을 제공하지만 wall clock과 unchecked failure를 사용합니다.
- near-deadline polling refinement는 program-controlled overshoot를 줄이지만 time source나 scheduler guarantee를 바꾸지 않습니다.
- `CLOCK_MONOTONIC`과 `int64_t`가 elapsed-time arithmetic을 calendar correction 및 platform `long` width와 분리합니다.
- start barrier는 thread object creation과 worker readiness를 구분하고, 모든 worker가 ready인 뒤 하나의 timestamp와 initial starvation reference를 publish합니다.
- partial creation과 condition-wait failure도 release predicate를 publish하여 barrier가 failure deadlock으로 변하지 않게 합니다.
- tests는 clock-domain correctness, delayed-start regression, wait-failure propagation을 각각 다른 technique으로 고정합니다.

### Source에 명시적으로 연결된 Critical Invariants

- 모든 worker는 creation 또는 scheduling delay와 무관하게 같은 published monotonic start epoch와 initial `last_meal_ms`에서 시작합니다.
- elapsed time과 starvation decision은 monotonic clock을 사용하며 clock acquisition failure를 fabricated time으로 대체하지 않습니다.
- barrier predicate, `ready_count`, `start_released`, `run_error`의 관찰과 변경은 정의된 `state_mutex` 경계에서 수행합니다.

### Source에 명시적으로 연결된 Major Engineering Difficulties

- successful thread creation과 actual worker readiness를 구분하는 문제
- partial start 및 condition-wait failure 상황에서도 common temporal origin 또는 abort release를 일관되게 publish하는 문제
- timing correctness를 scheduler fairness, starvation freedom, strict latency guarantee로 과장하지 않는 문제

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 처음 time abstraction은 어떤 중복을 제거하고 어떤 clock-domain 문제를 그대로 남기는가?
- deadline polling sleep은 terminal responsiveness와 wakeup precision 사이에서 어떤 trade-off를 선택하는가?
- wall clock adjustment가 starvation, deadline, log offset에 어떤 잘못된 state transition을 만들 수 있는가?
- monotonic time과 fixed-width field가 runtime 전 영역에 어떻게 전파되는가?
- clock acquisition failure가 왜 ordinary recoverable error가 아니라 process-fatal인가?
- `pthread_create` 성공과 worker readiness가 왜 다른 lifecycle event인가?
- common timestamp는 어떤 lock boundary와 predicate transition에서 publish되는가?
- condition variable의 spurious wakeup과 lost notification 문제를 predicate loop가 어떻게 다루는가?
- barrier failure가 peer release, joining, final return status로 어떻게 전파되는가?
- tests가 clock source, startup skew, wait failure를 각각 어떻게 결정적으로 구성하는가?

## 3. 완료 기준

- [ ] `philo_now_ms`와 `philo_sleep_ms`의 최초 구현과 당시 한계를 해당 SHA에서 설명할 수 있습니다.
- [ ] polling quantum refinement가 바꾸는 것과 바꾸지 않는 것을 구분할 수 있습니다.
- [ ] wall-clock failure scenario와 monotonic correction을 call-site 전파까지 설명할 수 있습니다.
- [ ] `int64_t`로 바뀐 timing state를 실제 field와 signature로 제시할 수 있습니다.
- [ ] clock failure의 `write` + `_exit` 경로를 설명할 수 있습니다.
- [ ] barrier의 readiness, publication, release, abort state transition을 실제 field로 그릴 수 있습니다.
- [ ] common timestamp가 table 및 모든 philosopher에 설정된 뒤 worker가 fork activity를 시작함을 증명할 수 있습니다.
- [ ] delayed-start test의 150 ms와 80 ms 관계가 regression을 민감하게 만드는 이유를 설명할 수 있습니다.
- [ ] wait-failure test가 peer deadlock을 bounded error로 바꾸는 경로를 설명할 수 있습니다.
- [ ] monotonic/common epoch guarantee와 fairness/strict latency non-guarantee를 구분할 수 있습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Source-defined role |
| --- | --- | --- | --- | --- | --- |
| 1 | `509453b01515` | `feat(time): 밀리초 시각 계산 함수 추가` | B | `TIME_MODEL, CORE` | Centralizes millisecond time and interruptible deadline waits, initially with `gettimeofday`. |
| 2 | `a21e4cc75272` | `fix(time): 짧은 대기 시간의 초과 지연 완화` | B | `TIME_MODEL, PRACTICAL` | Reduces final-interval polling granularity for short waits. |
| 3 | `5b32d5bdb955` | `fix(time): 단조 시계로 경과 시간 계산` | A | `TIME_MODEL, RISK, CORE` | Replaces wall time with `CLOCK_MONOTONIC`, widens time state, and makes clock failure fatal. |
| 4 | `f01d62cde8ce` | `test(time): 단조 시계와 시계 실패 경로 검증` | B | `TEST, TIME_MODEL` | Verifies the monotonic clock identifier, conversion, and failure exit. |
| 5 | `e7e62cbe185f` | `fix(thread): 시작 장벽으로 기준 시각 통일` | S | `START_BARRIER, CONCURRENCY, TIME_MODEL` | Adds a readiness barrier and publishes one start timestamp to all workers after they are actually ready. |
| 6 | `bfbfa0431732` | `test(thread): 지연된 작업자의 공통 시작 시각 검증` | A | `TEST, START_BARRIER, EDGE` | Deliberately delays one worker and verifies that the shared release prevents pre-start starvation accounting. |
| 7 | `f57f6ec0be87` | `test(thread): 시작 대기 실패 전파 검증` | B | `TEST, START_BARRIER, RESOURCE_LIFECYCLE` | Injects a condition-wait failure and checks that the barrier aborts and propagates the error. |

## 5. Commit별 학습 기록

### 5.1 `509453b01515` — `feat(time): 밀리초 시각 계산 함수 추가`

- Importance: **B**
- Tags: `TIME_MODEL, CORE`
- Source-defined role: Centralizes millisecond time and interruptible deadline waits, initially with `gettimeofday`.
- 코드 기준: 반드시 `509453b01515` 시점
- 직접 parent 비교: `git diff 509453b01515^ 509453b01515 --`
- Thread 직전 관련 SHA: Thread 내 첫 commit

#### Source-confirmed 맥락

이 B-level commit은 `philo_now_ms`와 `philo_sleep_ms`로 time access를 중앙화합니다. current time, start time, last-meal time, log offset, deadline을 밀리초 표현으로 다루며, sleep은 한 번의 긴 block 대신 deadline loop로 구현됩니다. 각 iteration은 `state_mutex` 경계에서 terminal flag를 확인하고, 종료되지 않았다면 500 microsecond 단위로 양보합니다.

이 SHA의 clock은 `gettimeofday`입니다. wall-clock adjustment를 그대로 받으며 clock call failure도 처리하지 않습니다. 또한 common worker start epoch은 아직 없으므로 이 abstraction의 도입과 최종 time model을 구분해야 합니다.


#### 변화 연결

| 단계 | Source-confirmed 기준 | 해당 SHA 코드 근거 |
| --- | --- | --- |
| 문제 | worker, monitor, logger에 흩어진 time conversion과 uninterruptible wait는 일관된 elapsed-time reasoning과 responsive shutdown을 어렵게 합니다. |  |
| 핵심 결정 | time acquisition과 deadline wait를 공통 helper로 묶고 terminal-aware polling sleep을 사용합니다. |  |
| 즉시 얻는 역할 | start, last meal, deadline, log timestamp가 같은 millisecond representation을 사용합니다. |  |
| 남은 한계 | wall clock, unchecked clock failure, sequential worker startup skew가 남습니다. |  |

#### 해당 SHA에서 직접 확인할 코드
- [ ] `git show --name-status 509453b01515`로 time helper와 public declaration이 추가된 파일을 식별합니다.
- [ ] `philo_now_ms`가 seconds와 microseconds를 millisecond로 변환하는 실제 산식을 확인합니다.
- [ ] 반환 type과 table/philosopher timing field의 당시 type을 기록합니다.
- [ ] `philo_sleep_ms`가 deadline을 계산하고 current time을 반복 비교하는 순서를 확인합니다.
- [ ] 각 iteration에서 terminal flag를 읽을 때 실제로 어떤 helper 또는 `state_mutex` 경계를 사용하는지 확인합니다.
- [ ] 500-microsecond `usleep` 호출과 loop 종료 조건을 확인합니다.
- [ ] clock call의 return value가 무시되는지, 실패 시 어떤 값이 사용될 수 있는지 확인합니다.
- [ ] 이 SHA에서 start time이 언제 설정되는지는 orchestration code가 아직 없을 수 있으므로 실제 call site 범위를 확인합니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol |  |
| 최소 코드 구간 |  |
| caller → callee |  |
| state 또는 ownership 변화 |  |
| failure/cleanup 경로 |  |
| 직전 상태와의 차이 |  |

#### Time state 추적

| 값 또는 operation | 해당 SHA의 producer | consumer 또는 비교 지점 | clock domain / type | 학습자 근거 |
| --- | --- | --- | --- | --- |
| current milliseconds |  |  | wall clock /  |  |
| sleep deadline |  |  |  |  |
| terminal flag polling |  |  | `state_mutex` boundary |  |
| configured duration |  |  |  |  |


#### 보장 범위

이 commit이 source 기준으로 보장하는 것:
- time acquisition과 interruptible deadline wait의 공통 abstraction이 생깁니다.
- terminal state가 설정되면 worker wait가 전체 configured interval을 계속 잠들 필요가 없습니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- wall-clock adjustment로부터 elapsed time을 보호하지 않습니다.
- clock acquisition failure를 처리하지 않습니다.
- 모든 worker가 같은 실제 start epoch에서 출발한다고 보장하지 않습니다.
- real-time wakeup 또는 strict latency를 보장하지 않습니다.

#### 학습자 결론
- [ ] 왜 deadline loop가 단일 `usleep(duration)`보다 terminal responsiveness에 유리한지 설명합니다.
- [ ] wall time을 elapsed-time truth로 사용했을 때 가능한 backward/forward adjustment 영향을 적습니다.
- [ ] abstraction의 도입과 correct clock source의 선택을 별도 단계로 설명합니다.

### 5.2 `a21e4cc75272` — `fix(time): 짧은 대기 시간의 초과 지연 완화`

- Importance: **B**
- Tags: `TIME_MODEL, PRACTICAL`
- Source-defined role: Reduces final-interval polling granularity for short waits.
- 코드 기준: 반드시 `a21e4cc75272` 시점
- 직접 parent 비교: `git diff a21e4cc75272^ a21e4cc75272 --`
- Thread 직전 관련 SHA: `509453b01515`

#### Source-confirmed 맥락

이 B-level fix는 기존 cooperative polling model을 유지하면서 deadline까지 남은 시간이 1 millisecond를 초과하면 500 microseconds, 마지막 구간이면 100 microseconds로 polling interval을 줄입니다. 목적은 짧은 configured duration과 near-deadline wakeup에서 프로그램 자체가 추가하는 overshoot를 줄이는 것입니다.


#### 변화 연결

| 단계 | Source-confirmed 기준 | 해당 SHA 코드 근거 |
| --- | --- | --- |
| 기존 상태 | 모든 남은 시간 구간에서 500-microsecond polling quantum을 사용합니다. |  |
| 관찰된 한계 | 짧은 wait에서는 고정 quantum이 전체 duration에 비해 커서 avoidable overshoot 비중이 커질 수 있습니다. |  |
| 수정 결정 | remaining time에 따라 500 또는 100 microseconds를 선택합니다. |  |
| 유지되는 한계 | scheduler latency와 real-time guarantee 부재는 그대로입니다. |  |

#### 해당 SHA에서 직접 확인할 코드
- [ ] `509453b01515` 대비 sleep loop의 조건식과 `usleep` argument 변화만 분리해 확인합니다.
- [ ] remaining time이 어떤 type과 산식으로 계산되는지 확인합니다.
- [ ] 1-millisecond 경계에서 어떤 branch가 선택되는지 `remaining == 1`, `< 1`, `> 1` 상황으로 나눠 기록합니다.
- [ ] terminal flag 확인 빈도와 lock 경계가 변경되지 않았는지 확인합니다.
- [ ] deadline 도달 판정이 polling branch 앞뒤 중 어디에 있는지 확인합니다.
- [ ] polling interval 조정이 clock source나 worker start semantics를 바꾸지 않는다는 것을 diff로 확인합니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol |  |
| 최소 코드 구간 |  |
| caller → callee |  |
| state 또는 ownership 변화 |  |
| failure/cleanup 경로 |  |
| 직전 상태와의 차이 |  |

#### 보장 범위

이 commit이 source 기준으로 보장하는 것:
- deadline 마지막 구간에서 프로그램이 선택하는 polling sleep 단위를 줄여 avoidable overshoot를 완화합니다.
- terminal-aware polling 구조는 유지됩니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- scheduler가 정확한 시각에 thread를 재개한다고 보장하지 않습니다.
- wall-clock source 문제와 common start skew를 해결하지 않습니다.
- strict death-detection latency 또는 real-time scheduling을 보장하지 않습니다.

#### 학습자 결론
- [ ] 이 commit이 time model 변경이 아니라 local precision refinement인 이유를 설명합니다.
- [ ] 각 branch의 sleep quantum과 remaining-time 경계를 실제 조건식으로 제시합니다.
- [ ] 개선 가능한 program-controlled delay와 통제할 수 없는 scheduler delay를 구분합니다.

### 5.3 `5b32d5bdb955` — `fix(time): 단조 시계로 경과 시간 계산`

- Importance: **A**
- Tags: `TIME_MODEL, RISK, CORE`
- Source-defined role: Replaces wall time with `CLOCK_MONOTONIC`, widens time state, and makes clock failure fatal.
- 코드 기준: 반드시 `5b32d5bdb955` 시점
- 직접 parent 비교: `git diff 5b32d5bdb955^ 5b32d5bdb955 --`
- Thread 직전 관련 SHA: `a21e4cc75272`

#### Source-confirmed 맥락

이 A-level fix는 elapsed-time source를 `gettimeofday`에서 `clock_gettime(CLOCK_MONOTONIC)`으로 교체하고 timing field와 parser intermediate를 `int64_t`로 통일합니다. simulation start, last meal, sleep deadline, monitor starvation decision, log offset이 calendar adjustment의 영향을 받지 않는 하나의 clock domain을 사용합니다.

monotonic clock을 얻지 못하면 fixed diagnostic을 `write`로 출력하고 `_exit`합니다. 모든 worker와 monitor decision이 동일 time source에 의존하므로 fabricated 또는 stale timestamp로 계속 실행하지 않는 결정입니다.


#### 변화 연결

| 단계 | Source-confirmed 기준 | 해당 SHA 코드 근거 |
| --- | --- | --- |
| 기존 가정 | wall clock이 elapsed-time ordering을 안정적으로 제공한다고 간주했습니다. |  |
| 실제 failure/위험 | calendar correction이 backward/forward jump를 만들어 starvation, wait, log offset을 왜곡할 수 있습니다. |  |
| root cause | civil time과 elapsed time을 같은 source로 취급했습니다. |  |
| 수정 결정 | `CLOCK_MONOTONIC`과 fixed-width millisecond state를 사용합니다. |  |
| failure decision | clock source 부재는 simulation correctness를 유지할 수 없으므로 process-fatal입니다. |  |
| 후속 한계 | worker가 실제로 준비되기 전에 start timestamp가 잡히는 문제는 `e7e62cbe185f`까지 남습니다. |  |

#### 해당 SHA에서 직접 확인할 코드
- [ ] `a21e4cc75272` 대비 header의 timing field와 parser intermediate type이 `int64_t`로 바뀌는 모든 위치를 찾습니다.
- [ ] `philo_now_ms`가 `clock_gettime`에 전달하는 clock identifier를 확인합니다.
- [ ] `timespec.tv_sec`와 `tv_nsec`의 millisecond conversion 산식을 확인합니다.
- [ ] monitor, logger, sleeper, parser의 function signature와 format conversion이 fixed-width type에 맞게 변경되는지 추적합니다.
- [ ] log formatting에서 explicit cast 또는 format type이 어떻게 처리되는지 해당 SHA 코드로 확인합니다.
- [ ] `clock_gettime` failure branch의 fixed message, `write` destination, `_exit` status를 확인합니다.
- [ ] fatal path가 ordinary cleanup이나 cross-thread unwinding을 시도하지 않는지 확인합니다.
- [ ] start timestamp의 sampling 위치가 아직 thread creation 전 또는 during creation인지 확인하여 barrier fix 전 상태를 기록합니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol |  |
| 최소 코드 구간 |  |
| caller → callee |  |
| state 또는 ownership 변화 |  |
| failure/cleanup 경로 |  |
| 직전 상태와의 차이 |  |

#### Clock-domain migration 기록

| 영역 | 변경 전 | `5b32d5bdb955` | 실제 파일·symbol |
| --- | --- | --- | --- |
| current time source | `gettimeofday` | `CLOCK_MONOTONIC` |  |
| time field type | host `long` 기반 | `int64_t` |  |
| sleep deadline |  | monotonic millisecond domain |  |
| starvation comparison |  | monotonic millisecond domain |  |
| log offset |  | monotonic millisecond domain |  |
| clock failure | unchecked | diagnostic + `_exit` |  |


#### 보장 범위

이 commit이 source 기준으로 보장하는 것:
- elapsed-time, starvation, deadline, log offset이 calendar adjustment와 분리된 monotonic domain을 사용합니다.
- timing state의 intended numeric width가 platform `long` width와 분리됩니다.
- clock acquisition failure가 unchecked time으로 runtime을 계속 진행하지 않습니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- 모든 worker가 같은 readiness 시점에서 start budget을 받는 것은 아직 보장하지 않습니다.
- monotonic clock은 scheduler fairness나 exact wakeup latency를 보장하지 않습니다.

#### Regression 연결

- `f01d62cde8ce`는 requested clock identifier, known `timespec` conversion, fatal failure exit를 검증합니다.
- `e7e62cbe185f`는 monotonic timestamp가 concurrency 상으로도 유효한 common start epoch가 되도록 barrier를 추가합니다.


#### 학습자 결론
- [ ] civil time과 elapsed time을 분리해야 하는 이유를 starvation 예시로 설명합니다.
- [ ] 모든 timing field가 같은 domain과 type을 사용한다는 것을 call-site 목록으로 증명합니다.
- [ ] clock failure를 ordinary error return이 아니라 process-fatal로 취급하는 source-confirmed 판단을 설명합니다.
- [ ] monotonic source만으로 sequential-start skew가 해결되지 않는 이유를 설명합니다.

### 5.4 `f01d62cde8ce` — `test(time): 단조 시계와 시계 실패 경로 검증`

- Importance: **B**
- Tags: `TEST, TIME_MODEL`
- Source-defined role: Verifies the monotonic clock identifier, conversion, and failure exit.
- 코드 기준: 반드시 `f01d62cde8ce` 시점
- 직접 parent 비교: `git diff f01d62cde8ce^ f01d62cde8ce --`
- Thread 직전 관련 SHA: `5b32d5bdb955`

#### Source-confirmed test 역할

이 test는 compile-time replacement로 `clock_gettime`을 대체합니다. success stub은 requested clock identifier를 기록하고 known `timespec`을 반환하여 정확한 millisecond conversion을 검사합니다. failure mode는 child process에서 `philo_now_ms`를 호출하고 parent가 child의 `PHILO_ERR` termination을 요구합니다. intentional `_exit`가 test runner 자체를 종료하지 않도록 process boundary를 사용합니다.


#### Test commit 분석

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariant |  |
| success stub이 기록하는 값 |  |
| known `timespec`과 expected milliseconds |  |
| failure stub의 동작 |  |
| child process 사용 이유 |  |
| 실제로 통과하는 production 함수 |  |
| clock identifier assertion |  |
| conversion assertion |  |
| fatal exit assertion |  |
| 이 테스트가 증명하는 것 |  |
| 이 테스트가 증명하지 않는 것 |  |
| deterministic unit/boundary regression 분류 |  |
| 후속 회귀 방지 대상 |  |

#### 해당 SHA에서 직접 확인할 코드
- [ ] test build에서 `clock_gettime` replacement가 production time object에 어떻게 적용되는지 확인합니다.
- [ ] success stub이 clock id와 호출 횟수를 저장하는 자료구조를 확인합니다.
- [ ] known seconds/nanoseconds를 expected milliseconds로 직접 계산합니다.
- [ ] parent/child 분기와 child의 intentional fatal call을 확인합니다.
- [ ] parent가 `wait` 계열 API 결과에서 exit status를 어떻게 해석하는지 확인합니다.
- [ ] `PHILO_ERR` 값과 `_exit` argument가 실제로 일치하는지 확인합니다.
- [ ] test가 wall-clock API 호출 부재까지 직접 검사하는지 여부를 실제 assertion으로 구분합니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol |  |
| 최소 코드 구간 |  |
| caller → callee |  |
| state 또는 ownership 변화 |  |
| failure/cleanup 경로 |  |
| 직전 상태와의 차이 |  |

#### 보장 범위

이 commit이 source 기준으로 보장하는 것:
- `philo_now_ms`가 requested clock으로 `CLOCK_MONOTONIC`을 사용하고 known time을 정확히 millisecond로 바꾸는지 검증합니다.
- clock failure가 unchecked return이 아니라 process-level fatal status로 끝나는지 검증합니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- worker start barrier나 multi-thread timing semantics를 검증하지 않습니다.
- scheduler delay, sleep precision, real-world clock implementation의 모든 동작을 검증하지 않습니다.

#### 학습자 결론
- [ ] 왜 failure branch를 같은 process에서 직접 호출할 수 없는지 설명합니다.
- [ ] stubbed `timespec` 계산과 production conversion을 수식으로 대조합니다.
- [ ] 이 test가 time source decision의 두 절반인 정상 domain과 실패 contract를 각각 어떻게 고정하는지 설명합니다.

### 5.5 `e7e62cbe185f` — `fix(thread): 시작 장벽으로 기준 시각 통일`

- Importance: **S**
- Tags: `START_BARRIER, CONCURRENCY, TIME_MODEL`
- Source-defined role: Adds a readiness barrier and publishes one start timestamp to all workers after they are actually ready.
- 코드 기준: 반드시 `e7e62cbe185f` 시점
- 직접 parent 비교: `git diff e7e62cbe185f^ e7e62cbe185f --`
- Thread 직전 관련 SHA: `f01d62cde8ce`

#### Source-confirmed 맥락

이 S-level fix는 thread object creation과 worker readiness를 분리하는 condition-variable barrier를 도입합니다. 각 worker는 `state_mutex`를 잡고 `ready_count`를 증가시킨 뒤 coordinator에 알리고, `start_released` predicate가 true가 될 때까지 loop에서 기다립니다. coordinator는 성공적으로 생성된 worker가 모두 ready가 된 뒤 monotonic timestamp 하나를 sampling하고 table의 `start_ms`와 모든 philosopher의 initial `last_meal_ms`에 배치한 다음 broadcast합니다.

partial creation 또는 condition wait failure에서는 `run_error`, `ended`, `start_released`를 publish하고 peers를 broadcast하여 impossible ready count를 기다리거나 worker를 영구 block하지 않습니다. condition variable의 spurious wakeup 가능성 때문에 notification 횟수가 아니라 predicate loop가 correctness 기준입니다.


#### 변화 연결

| 단계 | Source-confirmed 기준 | 해당 SHA 코드 근거 |
| --- | --- | --- |
| 기존 상태 | start timestamp가 creation loop 전에 잡히고 worker는 각 `pthread_create` 직후 실행을 시작할 수 있습니다. |  |
| 실제 failure/위험 | 늦게 생성·scheduled된 worker가 준비되기 전 시간을 starvation budget으로 잃고 false death가 날 수 있습니다. |  |
| root cause | successful thread creation을 worker readiness 및 common simulation epoch와 동일시했습니다. |  |
| 핵심 결정 | `ready_count`, `start_released`, `start_cond`, `state_mutex`로 readiness barrier를 구성합니다. |  |
| start linearization | 모든 intended worker가 ready인 상태에서 한 timestamp와 initial last-meal 값을 publish한 뒤 broadcast합니다. |  |
| failure protocol | partial create/wait failure도 terminal·release predicate를 publish하여 peers가 빠져나오고 join될 수 있게 합니다. |  |
| condition semantics | signal/broadcast는 stored event가 아니므로 predicate loop가 실제 state를 재검사합니다. |  |

#### 해당 SHA에서 직접 확인할 코드
- [ ] `t_table`에 추가된 `start_cond`, `ready_count`, `start_released`, `run_error`와 readiness flag를 모두 찾습니다.
- [ ] condition variable initialization과 destruction이 기존 resource ledger에 어떤 순서로 편입되는지 확인합니다.
- [ ] worker entry가 fork acquisition 전에 barrier helper를 호출하는지 확인합니다.
- [ ] worker가 `state_mutex` 아래에서 `ready_count`를 증가시키고 coordinator notification을 보내는 순서를 기록합니다.
- [ ] `pthread_cond_wait`가 predicate loop 안에 있는지, wakeup 후 어떤 state를 재검사하는지 확인합니다.
- [ ] coordinator가 full readiness를 기다리는 predicate와 partial creation failure 시 expected ready count를 어떻게 다루는지 확인합니다.
- [ ] 한 monotonic timestamp가 table `start_ms`와 모든 philosopher `last_meal_ms`에 설정되는 loop를 확인합니다.
- [ ] timestamp publication, `start_released = true`, broadcast가 어느 lock boundary 안에서 일어나는지 확인합니다.
- [ ] worker wait failure와 coordinator wait failure 각각에서 `run_error`, `ended`, `start_released`, broadcast가 어떻게 설정되는지 추적합니다.
- [ ] abort된 worker가 barrier를 빠져나온 뒤 fork activity 없이 종료하고 join 가능한지 확인합니다.
- [ ] creation failure, wait failure, monitor entry, join result 사이의 return precedence를 기록합니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol |  |
| 최소 코드 구간 |  |
| caller → callee |  |
| state 또는 ownership 변화 |  |
| failure/cleanup 경로 |  |
| 직전 상태와의 차이 |  |

#### Barrier state machine

| 상태 | predicate / count | 허용되는 transition | mutation owner와 lock | 학습자 코드 근거 |
| --- | --- | --- | --- | --- |
| worker created, not ready |  | ready count 증가 |  |  |
| worker ready, release 대기 |  | cond wait / spurious wakeup 재검사 |  |  |
| all intended workers ready |  | common timestamp publication |  |  |
| normal release | `start_released` true | worker fork activity 시작 |  |  |
| partial create abort |  | ended + release + broadcast |  |  |
| wait failure abort | `run_error` | ended + release + broadcast |  |  |

#### Common epoch 증명 기록

- timestamp sampling symbol:
- initial `last_meal_ms`를 설정하는 loop:
- `start_released` publication:
- worker가 publication 후 처음 관찰하는 state:
- barrier 이전에 실행할 수 없는 fork/log operation:


#### 보장 범위

이 commit이 source 기준으로 보장하는 것:
- 모든 successfully created intended worker가 readiness barrier에 도달한 뒤 하나의 monotonic start epoch를 공유합니다.
- thread creation과 scheduling delay before readiness가 starvation budget에 포함되지 않습니다.
- partial creation과 condition-wait failure가 peers를 영구 대기시키지 않고 run-level error로 전파됩니다.
- predicate loop가 spurious wakeup에도 released state를 재검사합니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- scheduler fairness, starvation freedom, strict start latency를 보장하지 않습니다.
- barrier release 이후 각 worker가 동일 시각에 CPU를 얻는다고 보장하지 않습니다.
- 모든 pthread failure 종류를 완전히 처리한다는 뜻은 아닙니다.

#### 후속 regression evidence

- `bfbfa0431732`는 한 worker를 `time_to_die`보다 오래 지연시켜 pre-start time이 starvation으로 계산되지 않는지 검증합니다.
- `f57f6ec0be87`는 worker-side condition wait failure가 run-level error와 peer release로 전파되는지 검증합니다.


#### 학습자 결론
- [ ] `pthread_create` 성공과 worker readiness가 다른 사건인 이유를 실제 control flow로 설명합니다.
- [ ] common epoch publication의 linearization point를 lock, field mutation, broadcast 순서로 제시합니다.
- [ ] 왜 condition variable notification 수가 아니라 predicate state를 기준으로 해야 하는지 설명합니다.
- [ ] normal release와 partial-start abort가 같은 barrier state를 어떻게 다르게 종료하는지 설명합니다.
- [ ] barrier가 time model, thread lifecycle, starvation semantics를 동시에 연결하는 이유를 설명합니다.

### 5.6 `bfbfa0431732` — `test(thread): 지연된 작업자의 공통 시작 시각 검증`

- Importance: **A**
- Tags: `TEST, START_BARRIER, EDGE`
- Source-defined role: Deliberately delays one worker and verifies that the shared release prevents pre-start starvation accounting.
- 코드 기준: 반드시 `bfbfa0431732` 시점
- 직접 parent 비교: `git diff bfbfa0431732^ bfbfa0431732 --`
- Thread 직전 관련 SHA: `e7e62cbe185f`

#### Source-confirmed test 역할

이 deterministic skew test는 `pthread_create`를 wrap하여 모든 created thread를 test gate 뒤에 두고, 다섯 번째 worker에 150-millisecond 추가 delay를 주입합니다. configured `time_to_die`는 80 milliseconds로 delay보다 짧습니다. barrier가 없다면 delayed worker가 ready가 되기 전에 death budget을 소진할 수 있지만, test는 다섯 worker가 모두 one-meal completion으로 성공하고 `ready_count`가 full worker count에 도달했는지 요구합니다.


#### Test commit 분석

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariant |  |
| 주입하는 startup skew |  |
| `time_to_die`와 delay의 수치 관계 |  |
| test gate가 만드는 실행 순서 |  |
| 실제로 통과하는 production barrier 경로 |  |
| full readiness 관찰 |  |
| one-meal completion assertion |  |
| false death 부재 assertion |  |
| 이 테스트가 증명하는 것 |  |
| 이 테스트가 증명하지 않는 것 |  |
| deterministic regression 분류 |  |
| 후속 회귀 방지 대상 |  |

#### 해당 SHA에서 직접 확인할 코드
- [ ] `pthread_create` wrapper가 real thread object 생성과 test gate 대기를 어떤 순서로 결합하는지 확인합니다.
- [ ] 왜 모든 다섯 thread object가 존재한 뒤 routines가 release되는지 확인합니다.
- [ ] 다섯 번째 worker만 150 milliseconds 지연되는 조건을 확인합니다.
- [ ] 80-millisecond death budget과 injected delay를 test configuration에서 직접 확인합니다.
- [ ] production `ready_count`가 다섯에 도달했다는 assertion을 확인합니다.
- [ ] successful finite meal completion을 어떤 return/output/state로 판단하는지 확인합니다.
- [ ] death가 없어야 한다는 negative assertion을 확인합니다.
- [ ] barrier implementation이 pre-start timestamp를 사용하면 test가 실패하는 경로를 설명합니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol |  |
| 최소 코드 구간 |  |
| caller → callee |  |
| state 또는 ownership 변화 |  |
| failure/cleanup 경로 |  |
| 직전 상태와의 차이 |  |

#### 보장 범위

이 commit이 source 기준으로 보장하는 것:
- 구성된 startup skew에서 delayed worker가 common release 전 시간 때문에 false death 처리되지 않음을 검증합니다.
- 모든 worker가 production readiness count에 참여하고 one-meal target을 완료하는지 검증합니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- 모든 가능한 scheduler delay나 barrier interleaving을 포괄하지 않습니다.
- barrier 이후 fairness, strict timing precision, starvation freedom을 증명하지 않습니다.

#### 학습자 결론
- [ ] 이 test가 chance-based repeated run이 아니라 barrier 목적을 직접 겨냥한 이유를 설명합니다.
- [ ] delay가 death budget보다 길어야 regression이 민감해지는 이유를 설명합니다.
- [ ] test gate와 production start barrier의 역할을 혼동하지 않고 각각의 경계를 설명합니다.

### 5.7 `f57f6ec0be87` — `test(thread): 시작 대기 실패 전파 검증`

- Importance: **B**
- Tags: `TEST, START_BARRIER, RESOURCE_LIFECYCLE`
- Source-defined role: Injects a condition-wait failure and checks that the barrier aborts and propagates the error.
- 코드 기준: 반드시 `f57f6ec0be87` 시점
- 직접 parent 비교: `git diff f57f6ec0be87^ f57f6ec0be87 --`
- Thread 직전 관련 SHA: `bfbfa0431732`

#### Source-confirmed test 역할

이 test는 routine object의 첫 번째 `pthread_cond_wait`를 `EINVAL`로 실패시킵니다. one-shot injection flag 자체는 mutex로 보호되어 test가 새로운 data race를 만들지 않습니다. 이후 wait는 real pthread function에 위임됩니다. run은 external timeout 안에 `PHILO_ERR`로 끝나고 `run_error`를 보존하며 모든 peer를 release해야 합니다.


#### Test commit 분석

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariant |  |
| 주입하는 API failure |  |
| one-shot flag synchronization |  |
| 실제로 실패하는 worker-side production path |  |
| peer release 경로 |  |
| `run_error` 관찰 |  |
| `PHILO_ERR` propagation |  |
| external timeout의 역할 |  |
| 이 테스트가 증명하는 것 |  |
| 이 테스트가 증명하지 않는 것 |  |
| deterministic failure regression 분류 |  |
| 후속 회귀 방지 대상 |  |

#### 해당 SHA에서 직접 확인할 코드
- [ ] `pthread_cond_wait` replacement가 routine object에만 적용되는 build 방식을 확인합니다.
- [ ] 첫 호출만 `EINVAL`을 반환하고 이후 call은 real function으로 위임하는 조건을 확인합니다.
- [ ] injection flag를 보호하는 test mutex와 접근 순서를 확인합니다.
- [ ] production worker가 failed wait를 받은 뒤 어떤 helper가 `run_error`, `ended`, `start_released`를 설정하는지 확인합니다.
- [ ] broadcast가 peer waiters를 깨우는지 실제 production call path로 추적합니다.
- [ ] coordinator 또는 `philo_run`이 `run_error`를 최종 `PHILO_ERR`로 전파하는지 확인합니다.
- [ ] external timeout이 hang을 bounded failure로 바꾸는 구성을 확인합니다.
- [ ] test가 normal completion이나 false death가 아니라 run-level error를 요구하는 assertion을 확인합니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol |  |
| 최소 코드 구간 |  |
| caller → callee |  |
| state 또는 ownership 변화 |  |
| failure/cleanup 경로 |  |
| 직전 상태와의 차이 |  |

#### 보장 범위

이 commit이 source 기준으로 보장하는 것:
- 주입된 worker-side condition wait failure가 barrier 내부에 갇히지 않고 run-level error로 전파됨을 검증합니다.
- peer release와 bounded termination을 검증합니다.
- test injection 자체가 unrelated race를 만들지 않도록 flag access를 synchronization합니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- 모든 condition-variable API failure 위치를 포괄하지 않습니다.
- scheduler fairness나 정상 barrier의 모든 schedule을 증명하지 않습니다.

#### 학습자 결론
- [ ] wait failure를 단순 worker-local return으로 끝내면 peers가 왜 block될 수 있는지 설명합니다.
- [ ] `run_error`, `ended`, `start_released`, broadcast의 실제 mutation 순서를 제시합니다.
- [ ] test harness synchronization이 production race 검증을 오염시키지 않는 이유를 설명합니다.

## 6. Invariant ledger

| Invariant | 최초 도입 또는 부족함 | 강화·복구 | regression evidence | 해당 SHA 코드 근거 | 최종 설명 |
| --- | --- | --- | --- | --- | --- |
| time access와 deadline wait가 공통 abstraction을 사용 | `509453b01515` | `a21e4cc75272`에서 near-deadline polling refinement | 별도 deterministic sleep test는 이 Thread source에 없음 |  |  |
| elapsed-time state는 monotonic clock domain을 사용 | `509453b01515`에서 wall-clock 한계 존재 | `5b32d5bdb955` | `f01d62cde8ce` |  |  |
| timing state는 fixed-width millisecond representation을 사용 | 초기 host `long` 기반 | `5b32d5bdb955` | `f01d62cde8ce`의 conversion 확인 |  |  |
| clock acquisition failure는 unchecked time으로 계속 진행하지 않음 | `509453b01515`에서 미처리 | `5b32d5bdb955`의 fatal path | `f01d62cde8ce` child process |  |  |
| 모든 worker가 같은 start와 initial starvation reference를 공유 | creation-loop 이전 timestamp로 부족함 | `e7e62cbe185f` | `bfbfa0431732` |  |  |
| barrier failure는 peer release와 run-level error로 전파 | barrier 도입 시 함께 정의 | `e7e62cbe185f` abort protocol | `f57f6ec0be87` |  |  |
| condition wait는 notification이 아니라 predicate loop를 기준으로 함 | `e7e62cbe185f` | 동일 commit의 readiness/release protocol | wait-failure test는 failure propagation을 검증 |  |  |

## 7. Failure → Fix → Test 연결

### 7.1 Wall clock에서 monotonic elapsed time으로

```text
`509453b01515`
gettimeofday 기반 millisecond helper
→ calendar adjustment와 unchecked failure 위험
→ `5b32d5bdb955`
CLOCK_MONOTONIC + int64_t + fatal clock failure
→ `f01d62cde8ce`
clock id, conversion, child-process failure exit 검증
```

- wall-clock dependency가 있는 실제 code:
- starvation/deadline/log에 전파되는 call sites:
- fixed-width migration 범위:
- fatal branch의 process contract:
- test stub의 expected values:
- 이 연결이 보장하지 않는 scheduler 속성:

### 7.2 Created thread에서 ready worker로

```text
start timestamp를 creation 전에 설정
→ delayed worker가 pre-start 시간을 death budget으로 잃음
→ `e7e62cbe185f`
ready_count + start_cond + start_released
→ all ready 상태에서 한 timestamp publish
→ `bfbfa0431732`
150 ms startup skew / 80 ms time_to_die
→ false death 없이 one-meal completion
```

- 기존 start sampling 위치:
- delayed worker가 false death에 이르는 계산:
- barrier의 normal predicate:
- common timestamp publication 순서:
- test gate와 production barrier의 관계:
- test가 증명하지 않는 fairness 범위:

### 7.3 Barrier wait failure

```text
worker가 condition wait 중 API failure
→ worker-local return만 하면 peers가 영구 대기할 위험
→ `e7e62cbe185f`
run_error + ended + start_released + broadcast
→ `f57f6ec0be87`
첫 wait에 EINVAL 주입 + timeout
→ peer release와 PHILO_ERR propagation
```

- failed wait를 받는 actual symbol:
- abort state mutation 순서:
- broadcast 대상:
- coordinator/join/final return 연결:
- timeout이 탐지하는 실패:
- injection flag가 test race를 만들지 않는 근거:

## 8. Ownership / state / responsibility 변화

| 시점 | Time source 책임 | Start state 책임 | Worker가 관찰하는 predicate | Failure 책임 | 학습자 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| `509453b01515` | common helper, wall clock | orchestration에 아직 common barrier 없음 | terminal flag polling | clock failure 미처리 |  |
| `a21e4cc75272` | 기존 helper 유지 | 변화 없음 | terminal flag polling | 변화 없음 |  |
| `5b32d5bdb955` | monotonic helper가 elapsed-time truth 제공 | 아직 sequential-start skew 존재 | 동일 clock domain | clock failure는 process-fatal |  |
| `e7e62cbe185f` | monotonic timestamp sampling | coordinator가 all-ready 후 publish | ready/released predicate loop | worker/coordinator wait failure가 run-level abort publish |  |
| barrier release 후 | workers가 published state를 소비 | `start_ms`, initial `last_meal_ms` 확정 | `start_released == true` | 이후 run/monitor lifecycle로 이동 |  |

## 9. Thread 최종 상태

### Source-confirmed 최종 상태

- time acquisition은 monotonic millisecond abstraction을 사용하며 timing state는 `int64_t`입니다.
- clock failure는 simulation을 계속할 수 없는 process-fatal 상태입니다.
- workers는 readiness barrier에서 all-ready가 확인된 뒤 하나의 `start_ms`와 initial `last_meal_ms`를 공유합니다.
- partial creation과 wait failure는 terminal/release predicate와 broadcast를 통해 peers를 해제하고 error를 전파합니다.
- 이 설계는 scheduler fairness, starvation freedom, strict wakeup 또는 death-detection latency를 보장하지 않습니다.

### 학습자가 작성할 최종 설명

- clock domain:
- numeric representation:
- interruptible wait:
- readiness predicate:
- common epoch linearization:
- partial-start abort:
- wait-failure propagation:
- guarantees:
- non-guarantees:

## 10. 최종 architecture 또는 execution flow 정리

```text
worker thread objects 생성
    ↓
각 worker가 state_mutex 아래 ready_count 증가
    ↓
start_released predicate loop에서 대기
    ↓
coordinator가 all-ready 확인
    ↓
CLOCK_MONOTONIC timestamp 한 번 sampling
    ↓
table.start_ms + 모든 philo.last_meal_ms publish
    ↓
start_released = true + broadcast
    ↓
workers가 fork activity 시작

failure:
partial create 또는 cond wait failure
    ↓
run_error + ended + start_released publish
    ↓
broadcast
    ↓
workers return
    ↓
join 및 run-level error propagation
```

- 실제 worker barrier symbol:
- 실제 coordinator barrier symbol:
- `state_mutex` hold 범위:
- condition wait predicate:
- timestamp assignment loop:
- normal broadcast:
- abort broadcast:
- join으로 이어지는 path:
- monitor가 common epoch를 소비하는 지점:

## 11. 학습 완료 자가 점검

- [ ] `509453b01515`의 wall-clock helper와 polling sleep을 당시 코드로 확인했습니다.
- [ ] `a21e4cc75272`의 500/100 microsecond branch 경계를 정확히 기록했습니다.
- [ ] `5b32d5bdb955`의 `CLOCK_MONOTONIC`, `int64_t`, fatal failure를 모든 주요 call site와 연결했습니다.
- [ ] `f01d62cde8ce`의 known `timespec` 계산과 child exit assertion을 설명했습니다.
- [ ] `e7e62cbe185f`의 barrier state machine과 common epoch linearization을 실제 code order로 제시했습니다.
- [ ] `bfbfa0431732`의 injected delay가 death budget보다 긴 이유를 설명했습니다.
- [ ] `f57f6ec0be87`의 wait failure가 peer release와 final error로 전파되는 경로를 설명했습니다.
- [ ] condition variable을 stored event처럼 설명하지 않았습니다.
- [ ] common start와 simultaneous scheduling을 혼동하지 않았습니다.
- [ ] monotonic timing과 real-time guarantee를 혼동하지 않았습니다.
