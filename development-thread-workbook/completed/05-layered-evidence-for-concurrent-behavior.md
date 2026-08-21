# Thread: Layered evidence for concurrent behavior

이 문서는 source에 정의된 다섯 번째 Development Thread를 그대로 따릅니다. commit 순서, SHA, importance, tags는 변경하지 않습니다. 모든 test code와 workload는 해당 SHA에서 확인하며 final HEAD의 test harness를 과거 commit에 소급하지 않습니다. 이 Thread는 production mechanism을 새로 설명하는 문서가 아니라 서로 다른 failure class를 관찰하는 verification layer의 범위와 한계를 복원하는 문서입니다.

## 1. Thread 목표

이 Thread의 목표는 black-box smoke에서 output grammar, repeated concurrent schedules, focused logger race, ThreadSanitizer까지 verification이 어떻게 단계적으로 확장되는지 확인하고, 각 layer가 증명하는 것과 증명하지 않는 것을 분리하는 것입니다.

Source-confirmed significance는 다음과 같습니다.

- smoke layer는 public CLI와 termination/progress를 검사하며 timeout으로 hang을 bounded failure로 만듭니다.
- format layer는 다섯 required status phrase와 line grammar를 executable contract로 고정합니다.
- concurrency layer는 여러 philosopher 수, repeated progress/death workload, nondecreasing timestamp, terminal-line position을 검사합니다.
- focused race harness는 많은 logger와 death commit을 gate 뒤에서 겹치게 하여 terminal lock boundary를 직접 stress합니다.
- ThreadSanitizer layer는 지원되는 환경에서 exercised memory access를 관찰하고, capability probe와 skip status로 infrastructure limitation을 project race와 구분합니다.
- sanitizer workload도 semantic assertions를 유지하여 required work를 하지 않은 조기 실패가 false success가 되지 않게 합니다.
- 어떤 layer도 fairness, starvation freedom, all schedules, formal deadlock freedom을 단독으로 증명하지 않습니다.

### Source에 명시적으로 연결된 Critical Invariants

- observable log는 required grammar를 따르고 terminal death는 최대 한 번이며 뒤에 ordinary line이 없어야 합니다.
- finite meal workloads는 intended global progress를 달성하고 death 없이 종료해야 합니다.
- elapsed timestamps는 exercised output에서 nondecreasing이어야 합니다.
- dynamic race detection 결과는 실제 required behavior assertion과 함께 해석합니다.

### Source에 명시적으로 연결된 Major Engineering Difficulties

- schedule-dependent behavior를 test하면서 repeated success를 exhaustive proof로 과장하지 않는 문제
- timeout, deterministic overlap, repeated workload, sanitizer가 서로 다른 failure class를 관찰하도록 계층화하는 문제
- unsupported ThreadSanitizer compiler/runtime를 actual race 또는 project build failure와 구분하는 문제

## 2. 이 Thread를 이해하기 위한 핵심 질문

- smoke test가 internal implementation을 몰라도 잡을 수 있는 contract failure는 무엇인가?
- timeout은 hang과 missed terminal condition을 어떤 observable result로 바꾸는가?
- exact event order 대신 minimum work count를 사용하는 이유는 무엇인가?
- log grammar validator는 expected substring test보다 어떤 corrupted output을 더 잡는가?
- syntax validation과 event-order validation을 왜 분리하는가?
- repeated workload는 어떤 schedule-sensitive symptom을 노출하며 왜 proof가 아닌가?
- one-death/no-line-after-death assertion은 어떤 production terminal invariant와 연결되는가?
- gated 12-logger harness는 일반 repeated run보다 어떤 boundary overlap을 의도적으로 높이는가?
- ThreadSanitizer capability probe는 compiler unsupported, runtime unsupported, production failure를 어떻게 구분하는가?
- skip status 77은 무엇을 의미하며 무엇을 의미하지 않는가?
- sanitizer diagnostic 부재와 semantic progress assertion을 함께 유지해야 하는 이유는 무엇인가?
- deterministic failure injection, repeated behavior test, dynamic race detector의 역할은 어떻게 다르고 보완적인가?

## 3. 완료 기준

- [x] smoke suite의 CLI, one-philosopher, finite completion, timeout contract를 실제 command/assertion으로 설명할 수 있습니다.
- [x] minimum count와 exact schedule assertion의 차이를 설명할 수 있습니다.
- [x] `awk` grammar가 허용·거부하는 line을 실제 condition으로 설명할 수 있습니다.
- [x] finite/repeated/death workload matrix와 각 observable invariant를 표로 정리했습니다.
- [x] nondecreasing timestamp와 terminal-line-position check를 구현 수준에서 설명할 수 있습니다.
- [x] 12-logger gate와 death path가 실제 production logger/terminal path를 통과함을 확인했습니다.
- [x] TSAN probe, optional skip, required failure, production instrumentation을 구분할 수 있습니다.
- [x] sanitizer options와 semantic assertions를 함께 설명할 수 있습니다.
- [x] 각 layer의 증명 범위와 비증명 범위를 작성했습니다.
- [x] test 통과를 fairness, starvation freedom, all-schedule race freedom으로 확대하지 않았습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Source-defined role |
| --- | --- | --- | --- | --- | --- |
| 1 | `bd6bb8eb18f4` | `test(smoke): 주요 입력과 종료 조건 검증` | B | `TEST, CLI_CONTRACT, CORE` | Adds bounded public smoke cases for input, death, and finite completion. |
| 2 | `f145d33f2773` | `test(format): 필수 상태 로그 형식 검증` | B | `TEST, TERMINAL_STATE` | Treats the five-line status grammar as an executable output contract. |
| 3 | `3d24bea01441` | `test(concurrency): 철학자별 진행과 종료 로그 불변식 검증` | A | `TEST, CONCURRENCY, TERMINAL_STATE` | Repeats progress and death schedules and adds a gated logger-versus-death race harness. |
| 4 | `20f8270c78bb` | `test(tsan): ThreadSanitizer 검증 경로 추가` | A | `TEST, CONCURRENCY, PRACTICAL` | Adds capability-probed ThreadSanitizer workloads while retaining semantic log and progress assertions. |

## 5. Commit별 학습 기록

### 5.1 `bd6bb8eb18f4` — `test(smoke): 주요 입력과 종료 조건 검증`

- Importance: **B**
- Tags: `TEST, CLI_CONTRACT, CORE`
- Source-defined role: Adds bounded public smoke cases for input, death, and finite completion.
- 코드 기준: 반드시 `bd6bb8eb18f4` 시점
- 직접 parent 비교: `git diff bd6bb8eb18f4^ bd6bb8eb18f4 --`
- Thread 직전 관련 SHA: Thread 내 첫 commit

#### Source-confirmed test 역할

이 B-level smoke suite는 `make test`에서 executable의 public CLI와 output을 black-box로 검사합니다. temporary output은 trap으로 정리하고, potentially blocking simulation마다 separate timeout process를 사용해 deadlock 또는 missed termination을 bounded failure로 바꿉니다.

cases는 invalid philosopher count, numeric overflow, one-philosopher fork acquisition과 death, finite meal schedules의 no-death completion을 포함합니다. meal assertion은 scheduler-dependent exact event order가 아니라 required global work threshold에 도달했음을 보이는 minimum count를 사용합니다.


#### Test commit 분석

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 public contract | §12 완료 기록의 대응 근거 참조 |
| invalid-input cases | §12 완료 기록의 대응 근거 참조 |
| overflow case | §12 완료 기록의 대응 근거 참조 |
| single-philosopher case | §12 완료 기록의 대응 근거 참조 |
| finite completion cases | §12 완료 기록의 대응 근거 참조 |
| timeout technique와 종료 기준 | §12 완료 기록의 대응 근거 참조 |
| temporary output lifecycle | §12 완료 기록의 대응 근거 참조 |
| 실제로 실행하는 production path | §12 완료 기록의 대응 근거 참조 |
| minimum-count assertion 이유 | §12 완료 기록의 대응 근거 참조 |
| 이 테스트가 증명하는 것 | §12 완료 기록의 대응 근거 참조 |
| 이 테스트가 증명하지 않는 것 | §12 완료 기록의 대응 근거 참조 |
| broad black-box integration 분류 | §12 완료 기록의 대응 근거 참조 |
| 후속 회귀 방지 대상 | §12 완료 기록의 대응 근거 참조 |

#### 해당 SHA에서 직접 확인할 코드
- [x] `make test`가 어떤 script 또는 target을 실행하는지 Makefile과 test file에서 확인합니다.
- [x] temporary file/directory 생성과 trap cleanup을 확인합니다.
- [x] 각 potentially blocking run에 timeout이 별도 process로 적용되는지 확인합니다.
- [x] invalid philosopher count와 overflow input의 exact command, exit status, stderr assertion을 기록합니다.
- [x] single-philosopher run에서 fork event와 `died`를 각각 어떻게 검사하는지 확인합니다.
- [x] finite meal schedules의 philosopher count, timing, meal target을 기록합니다.
- [x] no-death assertion과 per-run completion 판단을 확인합니다.
- [x] meal log를 exact count가 아니라 minimum count로 검사하는 이유를 test implementation과 scheduler variability로 설명합니다.
- [x] timeout expiration을 ordinary nonzero exit와 어떻게 구분하는지 확인합니다.
- [x] test가 internal lock order나 race detector를 사용하지 않는 black-box boundary임을 확인합니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol | §12 완료 기록의 대응 근거 참조 |
| 최소 코드 구간 | §12 완료 기록의 대응 근거 참조 |
| caller → callee | §12 완료 기록의 대응 근거 참조 |
| state 또는 ownership 변화 | §12 완료 기록의 대응 근거 참조 |
| failure/cleanup 경로 | §12 완료 기록의 대응 근거 참조 |
| 직전 상태와의 차이 | §12 완료 기록의 대응 근거 참조 |

#### 보장 범위

이 commit이 source 기준으로 보장하는 것:
- 주요 invalid CLI, overflow, one-philosopher death, finite no-death completion을 executable public interface에서 반복 가능한 baseline으로 검증합니다.
- hang 또는 missed terminal condition을 timeout으로 bounded test failure로 바꿉니다.
- scheduler-dependent exact ordering을 요구하지 않으면서 intended global work threshold를 검사합니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- race freedom, all possible schedules, fairness, deadlock freedom 전체를 증명하지 않습니다.
- internal lock order나 exact state linearization을 직접 검증하지 않습니다.
- log grammar 전체와 terminal-line ordering은 후속 layers에서 강화됩니다.

#### 학습자 결론
- [x] black-box smoke가 production internals를 몰라도 잡을 수 있는 failure 종류를 설명합니다.
- [x] timeout이 hang을 관찰 가능한 test result로 바꾸는 방식을 설명합니다.
- [x] minimum meal-count assertion이 exact interleaving assertion보다 적절한 이유와 남는 한계를 설명합니다.

### 5.2 `f145d33f2773` — `test(format): 필수 상태 로그 형식 검증`

- Importance: **B**
- Tags: `TEST, TERMINAL_STATE`
- Source-defined role: Treats the five-line status grammar as an executable output contract.
- 코드 기준: 반드시 `f145d33f2773` 시점
- 직접 parent 비교: `git diff f145d33f2773^ f145d33f2773 --`
- Thread 직전 관련 SHA: `bd6bb8eb18f4`

#### Source-confirmed test 역할

이 B-level commit은 textual log grammar를 executable contract로 만듭니다. `awk` validator는 각 line이 numeric timestamp, positive philosopher identifier, 다섯 required status phrase 중 하나만 포함하는지 검사합니다. single-philosopher, finite-meal, larger no-death run에 적용되어 expected substring이 존재하더라도 malformed 또는 interleaved output이 함께 있으면 실패합니다.

validator는 valid scheduler ordering을 하나로 고정하지 않고 syntax만 검사합니다. nondecreasing timestamp와 terminal-line position은 후속 concurrency suite가 담당합니다.


#### Test commit 분석

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariant | §12 완료 기록의 대응 근거 참조 |
| numeric timestamp grammar | §12 완료 기록의 대응 근거 참조 |
| positive philosopher id grammar | §12 완료 기록의 대응 근거 참조 |
| 허용하는 다섯 status phrase | §12 완료 기록의 대응 근거 참조 |
| reject하는 extra/malformed line | §12 완료 기록의 대응 근거 참조 |
| 적용 workload | §12 완료 기록의 대응 근거 참조 |
| 실제로 통과하는 production logging path | §12 완료 기록의 대응 근거 참조 |
| syntax-only 설계 이유 | §12 완료 기록의 대응 근거 참조 |
| 이 테스트가 증명하는 것 | §12 완료 기록의 대응 근거 참조 |
| 이 테스트가 증명하지 않는 것 | §12 완료 기록의 대응 근거 참조 |
| black-box grammar regression 분류 | §12 완료 기록의 대응 근거 참조 |
| 후속 회귀 방지 대상 | §12 완료 기록의 대응 근거 참조 |

#### 해당 SHA에서 직접 확인할 코드
- [x] `awk` validator의 field count, numeric pattern, id positivity, allowed phrase 조건을 실제 code로 분해합니다.
- [x] 다섯 status phrase를 test source에서 정확히 기록합니다.
- [x] 빈 line, extra token, unknown phrase, nonnumeric timestamp가 각각 어떤 condition으로 reject되는지 확인합니다.
- [x] validator exit status가 shell suite의 failure로 전파되는 방식을 확인합니다.
- [x] single, finite-meal, larger no-death workload output 각각에 validator가 적용되는 위치를 확인합니다.
- [x] expected substring 검사가 통과해도 malformed extra line이 있으면 validator가 실패하는 이유를 확인합니다.
- [x] event order를 검사하지 않는다는 것을 assertion 부재로 확인합니다.
- [x] line interleaving이 grammar를 깨뜨릴 때 이 validator가 어떤 형태로 감지하는지 예시를 학습자가 직접 작성합니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol | §12 완료 기록의 대응 근거 참조 |
| 최소 코드 구간 | §12 완료 기록의 대응 근거 참조 |
| caller → callee | §12 완료 기록의 대응 근거 참조 |
| state 또는 ownership 변화 | §12 완료 기록의 대응 근거 참조 |
| failure/cleanup 경로 | §12 완료 기록의 대응 근거 참조 |
| 직전 상태와의 차이 | §12 완료 기록의 대응 근거 참조 |

#### 보장 범위

이 commit이 source 기준으로 보장하는 것:
- 모든 관찰된 line이 required status grammar에 맞는지 검증합니다.
- expected event substring과 함께 malformed, extra, corrupted line이 섞이는 회귀를 잡습니다.
- valid thread schedule의 event order를 불필요하게 고정하지 않습니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- timestamp가 nondecreasing인지 검증하지 않습니다.
- `died`가 유일하고 마지막인지 검증하지 않습니다.
- semantic progress, race freedom, all schedules를 증명하지 않습니다.

#### 학습자 결론
- [x] content assertion과 grammar assertion이 잡는 failure가 어떻게 다른지 설명합니다.
- [x] validator의 정확한 accepted language를 field 수준으로 설명합니다.
- [x] syntax를 검사하면서 valid interleaving order를 고정하지 않는 이유를 설명합니다.

### 5.3 `3d24bea01441` — `test(concurrency): 철학자별 진행과 종료 로그 불변식 검증`

- Importance: **A**
- Tags: `TEST, CONCURRENCY, TERMINAL_STATE`
- Source-defined role: Repeats progress and death schedules and adds a gated logger-versus-death race harness.
- 코드 기준: 반드시 `3d24bea01441` 시점
- 직접 parent 비교: `git diff 3d24bea01441^ 3d24bea01441 --`
- Thread 직전 관련 SHA: `f145d33f2773`

#### Source-confirmed test 역할

이 A-level concurrency suite는 public schedule stress와 focused race harness를 결합합니다. finite runs는 2, 5, 17 philosophers가 death 없이 meal target을 모두 달성해야 하며, 7-philosopher workload를 여러 번 반복해 schedule-sensitive progress failure를 노출합니다. death workloads도 반복하며 정확히 하나의 `died` line과 그 뒤 line 부재를 요구합니다. 모든 log는 grammar와 nondecreasing timestamp를 검사합니다.

별도 harness는 12 logger thread를 gate 뒤에서 동시에 출발시켜 각자 수백 개 normal status write를 시도하는 동안 다른 path가 같은 table에 death를 commit합니다. stream은 여전히 terminal death 하나와 post-terminal status 부재를 만족해야 합니다.


#### Test commit 분석

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariants | §12 완료 기록의 대응 근거 참조 |
| finite workload matrix | §12 완료 기록의 대응 근거 참조 |
| repeated seven-philosopher workload | §12 완료 기록의 대응 근거 참조 |
| death workload matrix와 반복 | §12 완료 기록의 대응 근거 참조 |
| per-philosopher progress assertion | §12 완료 기록의 대응 근거 참조 |
| grammar assertion | §12 완료 기록의 대응 근거 참조 |
| nondecreasing timestamp assertion | §12 완료 기록의 대응 근거 참조 |
| unique terminal death assertion | §12 완료 기록의 대응 근거 참조 |
| no-line-after-death assertion | §12 완료 기록의 대응 근거 참조 |
| 12-logger gated race harness | §12 완료 기록의 대응 근거 참조 |
| 실제로 통과하는 production logger/death path | §12 완료 기록의 대응 근거 참조 |
| 이 테스트가 증명하는 것 | §12 완료 기록의 대응 근거 참조 |
| 이 테스트가 증명하지 않는 것 | §12 완료 기록의 대응 근거 참조 |
| repeated integration vs focused contention harness 구분 | §12 완료 기록의 대응 근거 참조 |
| 후속 회귀 방지 대상 | §12 완료 기록의 대응 근거 참조 |

#### 해당 SHA에서 직접 확인할 코드
- [x] finite runs의 2, 5, 17 philosopher command와 meal target을 확인합니다.
- [x] 각 philosopher가 target을 달성했는지 output을 어떻게 group/count하는지 확인합니다.
- [x] 7-philosopher workload의 반복 횟수와 failure aggregation 방식을 확인합니다.
- [x] death workload의 configuration, 반복 횟수, exact-one-death assertion을 확인합니다.
- [x] `died` line index 이후 다른 line이 없는지 어떤 shell/awk logic으로 검사하는지 확인합니다.
- [x] timestamp sequence를 numeric nondecreasing으로 검사하는 implementation을 확인합니다.
- [x] focused harness에서 12 logger thread를 생성하고 gate로 overlap을 높이는 순서를 확인합니다.
- [x] 각 logger가 시도하는 normal status 횟수와 production logging symbol을 확인합니다.
- [x] death commit path가 actual production `philo_try_log_death` 또는 해당 SHA의 symbol을 통과하는지 확인합니다.
- [x] harness output capture가 unique death와 post-terminal suppression을 어떻게 검사하는지 확인합니다.
- [x] repeated executable workloads와 in-process focused harness가 서로 다른 failure class를 겨냥하는 이유를 기록합니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol | §12 완료 기록의 대응 근거 참조 |
| 최소 코드 구간 | §12 완료 기록의 대응 근거 참조 |
| caller → callee | §12 완료 기록의 대응 근거 참조 |
| state 또는 ownership 변화 | §12 완료 기록의 대응 근거 참조 |
| failure/cleanup 경로 | §12 완료 기록의 대응 근거 참조 |
| 직전 상태와의 차이 | §12 완료 기록의 대응 근거 참조 |

#### Evidence matrix

| Evidence path | Workload 또는 injection | 관찰 invariant | 강점 | 남는 한계 |
| --- | --- | --- | --- | --- |
| finite executable runs | 2, 5, 17 philosophers | all reach target, no death | broad integration | schedule exhaustive 아님 |
| repeated progress run | 7 philosophers 반복 | schedule-sensitive progress symptom | 반복으로 exposure 증가 | fairness proof 아님 |
| repeated death runs | forced death | one `died`, no later line | terminal behavior | 모든 interleaving 아님 |
| gated logger harness | 12 logger threads + death | lock-order/terminal suppression | focused overlap | static proof 아님 |


#### 보장 범위

이 commit이 source 기준으로 보장하는 것:
- 여러 finite workload에서 모든 philosopher의 observable target progress와 no-death completion을 반복 검증합니다.
- death workload에서 exactly one terminal death와 이후 line 부재를 검증합니다.
- grammar와 nondecreasing monotonic timestamp를 함께 검사합니다.
- focused logger-versus-death overlap으로 terminal lock-order decision을 직접 stress합니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- 모든 scheduler interleaving, starvation freedom, fairness를 증명하지 않습니다.
- 반복 통과가 formal deadlock-freedom proof는 아닙니다.
- dynamic data race detection은 다음 TSAN layer가 보완하지만 그것도 exhaustive하지 않습니다.

#### 학습자 결론
- [x] broad repeated workloads와 focused race harness의 목적을 분리해 설명합니다.
- [x] one-death/no-post-line assertion이 terminal linearization과 어떻게 연결되는지 설명합니다.
- [x] nondecreasing timestamp가 monotonic time과 serialized output의 어떤 observable 결과를 검사하는지 설명합니다.
- [x] 반복 횟수가 confidence를 높여도 proof가 되지 않는 이유를 설명합니다.

### 5.4 `20f8270c78bb` — `test(tsan): ThreadSanitizer 검증 경로 추가`

- Importance: **A**
- Tags: `TEST, CONCURRENCY, PRACTICAL`
- Source-defined role: Adds capability-probed ThreadSanitizer workloads while retaining semantic log and progress assertions.
- 코드 기준: 반드시 `20f8270c78bb` 시점
- 직접 parent 비교: `git diff 20f8270c78bb^ 20f8270c78bb --`
- Thread 직전 관련 SHA: `3d24bea01441`

#### Source-confirmed test 역할

이 A-level commit은 optional ThreadSanitizer build/workload path를 `make test-tsan`으로 추가합니다. compiler는 configurable하며 `TSAN_REQUIRED`가 optional local capability와 mandatory environment를 구분합니다.

script는 먼저 작은 pthread probe를 instrumented build/run합니다. compiler가 `-fsanitize=thread`를 지원하지 않거나 runtime이 instrumented binary를 실행하지 못하면, required가 아닌 경우 documented skip status 77로 끝납니다. probe가 성공하면 complete executable을 thread instrumentation과 debug information으로 rebuild하고 finite, forced-death, contention workloads를 `halt_on_error`와 dedicated error exit code로 실행합니다. sanitizer diagnostic 부재뿐 아니라 log grammar, progress, no-death, one-terminal-death semantic assertion도 다시 수행합니다.


#### Test commit 분석

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariant | §12 완료 기록의 대응 근거 참조 |
| compiler configuration | §12 완료 기록의 대응 근거 참조 |
| `TSAN_REQUIRED` 의미 | §12 완료 기록의 대응 근거 참조 |
| pthread capability probe | §12 완료 기록의 대응 근거 참조 |
| compile failure 처리 | §12 완료 기록의 대응 근거 참조 |
| runtime probe failure 처리 | §12 완료 기록의 대응 근거 참조 |
| skip status 77 조건 | §12 완료 기록의 대응 근거 참조 |
| instrumented production build flags | §12 완료 기록의 대응 근거 참조 |
| TSAN runtime options와 dedicated exit code | §12 완료 기록의 대응 근거 참조 |
| finite/death/contention workloads | §12 완료 기록의 대응 근거 참조 |
| sanitizer diagnostic assertion | §12 완료 기록의 대응 근거 참조 |
| semantic behavior assertions | §12 완료 기록의 대응 근거 참조 |
| 실제로 통과하는 production paths | §12 완료 기록의 대응 근거 참조 |
| 이 테스트가 증명하는 것 | §12 완료 기록의 대응 근거 참조 |
| 이 테스트가 증명하지 않는 것 | §12 완료 기록의 대응 근거 참조 |
| dynamic schedule-dependent verification 분류 | §12 완료 기록의 대응 근거 참조 |
| 후속 회귀 방지 대상 | §12 완료 기록의 대응 근거 참조 |

#### 해당 SHA에서 직접 확인할 코드
- [x] `make test-tsan` target에서 compiler와 flags가 어떻게 전달되는지 확인합니다.
- [x] `TSAN_REQUIRED`의 default와 required mode 분기를 확인합니다.
- [x] 작은 pthread probe source, compile command, run command를 확인합니다.
- [x] compiler unsupported와 runtime unsupported를 project build/test failure와 구분하는 조건을 확인합니다.
- [x] optional mode에서 skip message와 exit status 77이 나오는 모든 path를 기록합니다.
- [x] required mode에서는 같은 capability failure가 어떤 non-skip failure로 전환되는지 확인합니다.
- [x] complete executable rebuild에 `-fsanitize=thread`와 debug information이 compile/link 모두 적용되는지 확인합니다.
- [x] `TSAN_OPTIONS`의 `halt_on_error`와 dedicated `exitcode` 값을 확인합니다.
- [x] finite, forced-death, higher-contention workload command를 기록합니다.
- [x] sanitizer output/exit status뿐 아니라 grammar, per-philosopher progress, no-death, one-terminal-death assertion을 다시 실행하는 위치를 확인합니다.
- [x] instrumented run이 required work를 하지 않고 조기 종료해도 통과하지 못하도록 semantic assertions가 어떻게 보완하는지 설명합니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol | §12 완료 기록의 대응 근거 참조 |
| 최소 코드 구간 | §12 완료 기록의 대응 근거 참조 |
| caller → callee | §12 완료 기록의 대응 근거 참조 |
| state 또는 ownership 변화 | §12 완료 기록의 대응 근거 참조 |
| failure/cleanup 경로 | §12 완료 기록의 대응 근거 참조 |
| 직전 상태와의 차이 | §12 완료 기록의 대응 근거 참조 |

#### Capability와 correctness 결과 구분

| 상황 | Optional mode 결과 | Required mode 결과 | project race로 해석하는가 | 학습자 코드 근거 |
| --- | --- | --- | --- | --- |
| compiler가 TSAN flag 미지원 | skip 77 | §12 완료 기록의 대응 근거 참조 | 아니오 | §12 완료 기록의 대응 근거 참조 |
| instrumented pthread probe runtime 실패 | skip 77 | §12 완료 기록의 대응 근거 참조 | 아니오 | §12 완료 기록의 대응 근거 참조 |
| production instrumented build 실패 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| TSAN diagnostic 발생 | failure | failure | exercised race evidence | §12 완료 기록의 대응 근거 참조 |
| semantic assertion 실패 | failure | failure | behavioral failure | §12 완료 기록의 대응 근거 참조 |
| diagnostics 없이 모든 workload/assertion 통과 | success | success | exercised schedules에서 evidence | §12 완료 기록의 대응 근거 참조 |


#### 보장 범위

이 commit이 source 기준으로 보장하는 것:
- 지원되는 환경에서 instrumented production workloads의 exercised memory access에 대해 ThreadSanitizer 검사를 수행합니다.
- sanitizer support 부재를 project race 또는 build defect와 혼동하지 않도록 capability probe와 skip semantics를 둡니다.
- instrumented run도 required observable work와 terminal invariants를 수행해야 통과합니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- ThreadSanitizer 통과가 모든 schedule의 race freedom을 증명하지 않습니다.
- deadlock freedom, fairness, starvation freedom, strict timing을 증명하지 않습니다.
- unsupported environment의 skip은 project correctness success를 의미하지 않습니다.

#### 학습자 결론
- [x] capability probe가 project test result의 해석을 정직하게 만드는 이유를 설명합니다.
- [x] optional skip과 mandatory failure의 차이를 실제 branch/status로 설명합니다.
- [x] sanitizer diagnostic 부재와 semantic work completion을 함께 검사해야 하는 이유를 설명합니다.
- [x] deterministic boundary tests, repeated workload, TSAN이 서로 대체되지 않고 보완하는 이유를 설명합니다.

## 6. Invariant ledger

이 Thread에서는 production invariant 자체보다 그것을 관찰하는 evidence layer의 도입 순서를 기록합니다.

| Production invariant 또는 risk | 최초 evidence | 강화된 evidence | 동적 evidence | 실제 test code 근거 | 최종 해석 |
| --- | --- | --- | --- | --- | --- |
| invalid input과 overflow가 public boundary에서 거부됨 | `bd6bb8eb18f4` | 기존 smoke 유지 | TSAN 범위의 핵심 대상은 아님 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| one-philosopher run이 hang하지 않고 fork/death behavior를 보임 | `bd6bb8eb18f4` timeout + content | format validator 적용 | instrumented death workload 일부와 구분 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| finite meal run이 death 없이 intended work threshold에 도달 | `bd6bb8eb18f4` | `3d24bea01441`의 2/5/17 및 반복 workload | `20f8270c78bb` instrumented finite workload | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| 모든 line이 required grammar를 따름 | expected substring baseline | `f145d33f2773` | concurrency/TSAN workloads에서도 재검사 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| timestamp가 nondecreasing | 초기 smoke에는 없음 | `3d24bea01441` | TSAN semantic assertions에서 유지 여부 확인 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| death가 하나이며 이후 line이 없음 | smoke의 single death content | `3d24bea01441` repeated death + focused harness | `20f8270c78bb` instrumented death/contention | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| exercised shared access에 data-race diagnostic이 없음 | behavioral tests만 존재 | focused contention은 symptom/contract stress | `20f8270c78bb` ThreadSanitizer | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| unsupported sanitizer infrastructure와 project failure를 구분 | 없음 | 없음 | `20f8270c78bb` probe + skip 77 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |

## 7. Failure → Fix → Test 연결

이 Development Thread의 commit map에는 production fix commit이 없습니다. 따라서 이 영역은 source가 확정한 verification progression을 `위험 또는 관찰 한계 → 다음 evidence layer`로 연결합니다. 다른 Thread의 commit을 이 Thread map에 추가하지 않습니다.

### 7.1 Hang와 public contract failure

```text
potential deadlock / missed terminal / invalid CLI
→ `bd6bb8eb18f4`
public commands + timeout + exit/output assertions
```

- bounded failure로 바꾸는 timeout: §12 완료 기록의 대응 근거에 정리했습니다.
- public path: §12 완료 기록의 대응 근거에 정리했습니다.
- observable success/failure: §12 완료 기록의 대응 근거에 정리했습니다.
- internal root cause를 직접 증명하지 못하는 범위: §12 완료 기록의 대응 근거에 정리했습니다.

### 7.2 Expected substring의 한계

```text
expected event가 존재해도 malformed/extra/interleaved line 가능
→ `f145d33f2773`
strict line grammar validator
```

- smoke content assertion: §12 완료 기록의 대응 근거에 정리했습니다.
- grammar validator: §12 완료 기록의 대응 근거에 정리했습니다.
- malformed example: §12 완료 기록의 대응 근거에 정리했습니다.
- event order를 의도적으로 고정하지 않는 범위: §12 완료 기록의 대응 근거에 정리했습니다.

### 7.3 Schedule-sensitive terminal behavior

```text
한 번의 정상 run은 schedule-sensitive regression을 놓칠 수 있음
→ `3d24bea01441`
repeated progress/death workloads
+ nondecreasing timestamps
+ gated 12-logger-versus-death harness
```

- repeated matrix: §12 완료 기록의 대응 근거에 정리했습니다.
- focused overlap: §12 완료 기록의 대응 근거에 정리했습니다.
- terminal assertions: §12 완료 기록의 대응 근거에 정리했습니다.
- proof가 아닌 이유: §12 완료 기록의 대응 근거에 정리했습니다.

### 7.4 Behavioral evidence와 dynamic race detection

```text
observable behavior가 정상이어도 exercised data race가 있을 수 있음
→ `20f8270c78bb`
capability-probed ThreadSanitizer
+ semantic assertions 유지
```

- capability probe: §12 완료 기록의 대응 근거에 정리했습니다.
- optional skip: §12 완료 기록의 대응 근거에 정리했습니다.
- required mode: §12 완료 기록의 대응 근거에 정리했습니다.
- diagnostic failure: §12 완료 기록의 대응 근거에 정리했습니다.
- semantic failure: §12 완료 기록의 대응 근거에 정리했습니다.
- TSAN 통과가 증명하지 않는 범위: §12 완료 기록의 대응 근거에 정리했습니다.

## 8. Verification responsibility 변화

| 시점 | Test boundary | Failure를 만드는 방식 | 관찰 대상 | 한계 관리 | 학습자 근거 |
| --- | --- | --- | --- | --- | --- |
| `bd6bb8eb18f4` | executable public interface | input/workload + timeout | exit, output content, bounded termination | black-box/non-exhaustive 명시 | §12 완료 기록의 대응 근거 참조 |
| `f145d33f2773` | captured output language | malformed line을 validator가 reject | line grammar | order를 고정하지 않음 | §12 완료 기록의 대응 근거 참조 |
| `3d24bea01441` | repeated executable + in-process contention | 반복 schedule + gate overlap | progress, timestamps, terminal position | fairness/proof claim 배제 | §12 완료 기록의 대응 근거 참조 |
| `20f8270c78bb` | instrumented executable/runtime | TSAN instrumentation | exercised memory access + behavior | capability probe, skip semantics, schedule dependence | §12 완료 기록의 대응 근거 참조 |

## 9. Thread 최종 상태

### Source-confirmed 최종 상태

- public smoke, grammar validation, repeated schedule stress, focused terminal contention, ThreadSanitizer가 서로 다른 evidence layer를 이룹니다.
- timeout은 hangs를 bounded failures로 만들고 grammar validator는 expected substring만으로 놓치는 malformed output을 잡습니다.
- repeated workloads와 logger gate는 schedule-sensitive observable invariants를 더 강하게 자극합니다.
- supported environment의 TSAN은 exercised memory access를 관찰하며 semantic progress와 terminal assertions를 함께 요구합니다.
- unsupported sanitizer infrastructure는 skip status로 project race와 분리됩니다.
- 이 verification stack은 fairness, starvation freedom, deadlock freedom의 formal proof 또는 all-schedule race freedom을 제공하지 않습니다.

### 학습자가 작성할 최종 설명

- public smoke layer: §12 완료 기록의 대응 근거에 정리했습니다.
- grammar layer: §12 완료 기록의 대응 근거에 정리했습니다.
- repeated schedule layer: §12 완료 기록의 대응 근거에 정리했습니다.
- focused contention layer: §12 완료 기록의 대응 근거에 정리했습니다.
- dynamic race layer: §12 완료 기록의 대응 근거에 정리했습니다.
- capability/skip semantics: §12 완료 기록의 대응 근거에 정리했습니다.
- semantic assertions: §12 완료 기록의 대응 근거에 정리했습니다.
- 각 layer가 잡는 failure: §12 완료 기록의 대응 근거에 정리했습니다.
- 각 layer가 놓치는 failure: §12 완료 기록의 대응 근거에 정리했습니다.
- 전체 evidence를 해석하는 기준: §12 완료 기록의 대응 근거에 정리했습니다.

## 10. 최종 architecture 또는 execution flow 정리

```text
make test
    ↓ public CLI and workload execution
    ↓ timeout으로 hangs bounded
    ↓ content assertions
    ↓ required line grammar
    ↓ repeated finite/death schedules
    ↓ per-philosopher progress
    ↓ nondecreasing timestamps
    ↓ one terminal death / no later line
    ↓ focused 12-logger-versus-death overlap

make test-tsan
    ↓ configurable compiler
    ↓ instrumented pthread capability probe
        ├─ unsupported + optional
        │      → documented skip 77
        ├─ unsupported + required
        │      → failure
        └─ supported
               ↓ full instrumented build
               ↓ finite/death/contention workloads
               ↓ TSAN diagnostic check
               ↓ grammar/progress/terminal semantic checks
```

- 실제 Make targets: §12 완료 기록의 대응 근거에 정리했습니다.
- smoke script: §12 완료 기록의 대응 근거에 정리했습니다.
- timeout command: §12 완료 기록의 대응 근거에 정리했습니다.
- grammar function: §12 완료 기록의 대응 근거에 정리했습니다.
- workload loop: §12 완료 기록의 대응 근거에 정리했습니다.
- timestamp validator: §12 완료 기록의 대응 근거에 정리했습니다.
- terminal-position validator: §12 완료 기록의 대응 근거에 정리했습니다.
- logger harness entry: §12 완료 기록의 대응 근거에 정리했습니다.
- TSAN probe compile/run: §12 완료 기록의 대응 근거에 정리했습니다.
- skip branch: §12 완료 기록의 대응 근거에 정리했습니다.
- required branch: §12 완료 기록의 대응 근거에 정리했습니다.
- instrumentation flags/options: §12 완료 기록의 대응 근거에 정리했습니다.
- semantic assertion reuse: §12 완료 기록의 대응 근거에 정리했습니다.

## 11. 학습 완료 자가 점검

- [x] `bd6bb8eb18f4`의 commands, timeout, trap, positive/negative assertions를 확인했습니다.
- [x] smoke suite가 race freedom을 증명하지 않는다고 명시했습니다.
- [x] `f145d33f2773`의 accepted line grammar를 정확히 설명했습니다.
- [x] syntax와 event order를 구분했습니다.
- [x] `3d24bea01441`의 2/5/17, repeated 7, death workload와 logger harness를 분리해 기록했습니다.
- [x] per-philosopher progress, nondecreasing timestamp, unique terminal death, no-later-line assertion을 확인했습니다.
- [x] 12 logger threads가 actual production logging path를 통과하는지 확인했습니다.
- [x] `20f8270c78bb`의 compiler/runtime probe와 skip 77을 설명했습니다.
- [x] optional environment limitation과 project race/build failure를 구분했습니다.
- [x] instrumented run의 semantic assertions가 required work를 재검사하는 이유를 설명했습니다.
- [x] repeated success나 TSAN success를 fairness, deadlock freedom, all-schedule proof로 확대하지 않았습니다.

## 12. 저장소 기반 완료 기록

### 12.1 검토 범위와 실행 상태

- 이 Thread의 4개 SHA는 모두 `c/philo` HEAD의 조상으로 확인했습니다.
- `Makefile`, `tests/smoke.sh`, `tests/concurrency.sh`, `tests/log_terminal_race.c`, `tests/tsan.sh`를 각각 도입 SHA에서 확인했습니다.
- 저장소 checkout이 불가능해 `make test`와 `make test-tsan`은 실행하지 않았습니다. 따라서 아래에는 script가 수행하도록 작성된 명령·assertion과 그 증명 범위만 기록합니다.

### 12.2 `bd6bb8eb18f4` — public black-box smoke

`Makefile`의 `test` target은 project를 build한 뒤 `tests/smoke.sh`를 실행합니다. script는 `mktemp -d`로 output directory를 만들고 `trap cleanup EXIT INT TERM`으로 정리합니다.

#### timeout mechanism

`run_timeout`은 target command를 background로 실행하고 별도 guard process가 limit 뒤 `SIGTERM`을 보냅니다. command가 먼저 끝나면 guard를 종료합니다. deadlock, single-philosopher self-block, missed completion을 무한 test hang이 아니라 bounded failure로 바꿉니다.

이 timeout은 내부 root cause를 식별하지 않습니다. 단지 public command가 제한 안에 종료하지 못했다는 observable failure를 만듭니다.

#### workload와 assertion

| case | command | assertion | 관찰 범위 |
| --- | --- | --- | --- |
| invalid count | `./philo 0 100 10 10` | success이면 실패, usage text 필요 | CLI validation |
| numeric overflow | 매우 긴 `time_to_die` argument | success이면 실패 | parser overflow rejection |
| one philosopher | `./philo 1 80 40 40` | 2초 안 clean exit, fork line, death line | edge topology와 terminal behavior |
| finite two | `./philo 2 250 50 50 2` | 3초 안 exit, no death, `is eating` 최소 4개 | global target work |
| finite five | `./philo 5 800 100 100 3` | 5초 안 exit, no death, `is eating` 최소 15개 | larger no-death completion |

meal log 수는 exact count가 아니라 lower bound입니다. final target 이후 terminal publication 직전 추가 attempt가 보일 수 있고 scheduler ordering은 고정되지 않으므로, required global work를 했는지만 검사합니다. 반대로 최소 count는 philosopher별 공정한 progress를 보장하지 않으며 후속 concurrency suite가 per-id count를 강화합니다.

#### 증명 범위

smoke는 public executable의 argument handling, bounded termination, basic single/final-meal behavior를 폭넓게 잡습니다. internal lock order, data race, 모든 schedule, fairness는 검사하지 않습니다.

### 12.3 `f145d33f2773` — output language를 executable contract로 고정

`tests/smoke.sh::check_log_format`은 각 line 전체가 다음 regex와 일치해야 통과합니다.

```text
^[0-9]+ [1-9][0-9]* (has taken a fork|is eating|is sleeping|is thinking|died)$
```

#### accepted grammar

- field 1: 0 이상의 decimal timestamp
- field 2: leading zero 없는 positive philosopher id
- remainder: 다섯 phrase 중 정확히 하나
- line 앞뒤에 extra token이나 임의 text 없음

#### rejected examples

```text
abc 1 is eating          # timestamp가 숫자가 아님
10 0 is eating           # id가 positive가 아님
10 1 is running          # unknown status
10 1 is eating extra     # extra token
10 1 is eat10 2 died     # interleaved/corrupted line
```

validator는 every line에 적용되므로 required substring이 존재해도 malformed extra line이 하나 있으면 실패합니다. single, finite, larger no-death workload output에 적용됩니다.

이 commit은 syntax만 검증합니다. timestamp ordering, `died`의 유일성·마지막 위치, philosopher별 progress는 의도적으로 후속 layer에 남깁니다. valid scheduler event order를 하나로 강제하지 않습니다.

### 12.4 `3d24bea01441` — repeated schedules와 focused terminal contention

`tests/concurrency.sh`는 `check_log`, `check_progress`, `check_terminal_line`을 추가합니다.

#### `check_log`

- 모든 line이 required grammar와 일치해야 합니다.
- 이전 timestamp를 기억하고 현재 `$1 < previous`이면 실패합니다.
- 따라서 captured output의 timestamp는 numeric nondecreasing이어야 합니다.

이 check는 monotonic clock과 serialized line order가 외부에 만든 결과를 검사합니다. 같은 millisecond timestamp는 허용합니다.

#### `check_progress`

`is eating` line을 philosopher id별로 count하고, `1..N` 모두 target 이상인지 확인합니다. aggregate lower bound보다 강하며 한 philosopher가 모든 work를 독점한 output을 통과시키지 않습니다. 다만 `is eating`은 operation start이므로 internal committed counter와 완전히 동일한 evidence는 아닙니다. finite no-death workload에서 intended progress symptom을 검사합니다.

#### `check_terminal_line`

line을 순서대로 읽으면서 `died`를 본 뒤 다음 line이 하나라도 있으면 `after = 1`로 실패하고, death count가 정확히 1인지 확인합니다. terminal-state linearization의 observable contract를 겨냥합니다.

#### workload matrix

| workload | 반복 | timeout | assertion |
| --- | --- | --- | --- |
| `N = 2, 5, 17`, `2000 5 5 4` | 각 1회 | 6초 | grammar/monotonic log, no death, 각 id 4 meals 이상 |
| `N = 7`, `1000 4 4 3` | 8회 | 4초 | no death, 각 id 3 meals 이상 |
| `N = 5`, `60 80 10` | 10회 | 3초 | exactly one death, no later line |

반복은 schedule-sensitive regression 노출 확률을 높입니다. 8회 또는 10회 성공이 모든 scheduler interleaving의 proof는 아닙니다.

#### focused `log_terminal_race` harness

`tests/log_terminal_race.c`는 다음 상수를 사용합니다.

```text
LOGGER_COUNT = 12
LOGS_PER_LOGGER = 200
```

각 logger thread는 test gate에서 모두 ready가 될 때까지 기다린 뒤 동시에 release됩니다. 각자 actual production `philo_log(philo, "is thinking")`을 최대 200회 시도합니다.

main thread는 같은 table을 death-eligible 상태로 seed합니다.

- `time_to_die = 1`
- `start_ms = now - 100`
- `last_meal_ms = start_ms`

loggers를 release한 직후 production `philo_try_log_death`를 호출합니다. 따라서 ordinary logger의 `print_mutex → state_mutex` path와 death commit의 같은 lock order가 강하게 겹칩니다. output은 여전히 grammar, exactly one death, no line after death를 만족해야 합니다.

이 harness는 target boundary의 overlap을 의도적으로 높이지만 static lock-order proof나 모든 interleaving 검증은 아닙니다.

### 12.5 `20f8270c78bb` — capability-probed ThreadSanitizer

#### entry point와 configuration

- Make target: `make test-tsan`
- compiler: `TSAN_CC`, default `cc`
- capability policy: `TSAN_REQUIRED`, default `0`
- accepted `TSAN_REQUIRED`: `0` 또는 `1`만 허용

#### capability probe

script는 작은 pthread program을 `-pthread -fsanitize=thread -g`로 compile합니다. program은 worker가 `g_value = 1`을 쓰고 main이 join 뒤 값을 확인합니다. probe 목적은 race를 만들기 위한 것이 아니라 compiler와 runtime이 basic instrumented pthread binary를 build/run할 수 있는지 확인하는 것입니다.

capability 결과는 다음과 같이 해석합니다.

| 상황 | optional `TSAN_REQUIRED=0` | required `TSAN_REQUIRED=1` | project race로 해석 |
| --- | --- | --- | --- |
| compiler가 probe build 실패 | message + exit 77 | failure exit 1 | 아니오 |
| probe executable 누락 | failure | failure | toolchain inconsistency |
| instrumented probe runtime 실패 | message + exit 77 | failure exit 1 | 아니오 |
| probe stderr에 TSAN runtime error | exit 77 | failure | infrastructure/runtime 문제 |
| probe 통과 뒤 project build 실패 | failure | failure | project/toolchain integration failure |

skip status 77은 sanitizer evidence를 얻지 못했다는 뜻입니다. project correctness success나 race absence를 뜻하지 않습니다.

#### production instrumentation

probe 통과 후 모든 production source를 다음 핵심 flags로 다시 compile/link합니다.

```text
-Wall -Wextra -Werror -pthread -fsanitize=thread -g
```

project build failure는 더 이상 capability skip으로 처리하지 않습니다. probe가 통과했으므로 actual project instrumentation/build failure입니다.

#### runtime options

각 workload는 다음 options를 사용합니다.

```text
TSAN_OPTIONS=halt_on_error=1:exitcode=66
```

TSAN이 issue를 발견하면 첫 diagnostic에서 멈추고 dedicated status 66을 사용합니다. script는 nonzero status와 stderr의 `ThreadSanitizer` marker를 모두 검사합니다.

#### instrumented workloads와 semantic checks

| name | command arguments | semantic assertion |
| --- | --- | --- |
| finite | `7 1000 5 5 4` | valid/nondecreasing log, no death, 각 id 4 eating lines 이상 |
| death | `5 60 80 10` | valid log, exactly one death, no line after |
| contention | `17 2000 5 5 3` | valid/nondecreasing log, no death, 각 id 3 eating lines 이상 |

sanitizer diagnostic이 없다는 이유만으로 통과하지 않습니다. instrumented binary가 조기 종료하거나 required work를 하지 않으면 semantic assertion이 실패합니다. 반대로 semantic output이 정상이어도 TSAN diagnostic이 있으면 실패합니다.

#### 증명 범위

TSAN success는 실행된 workloads와 실제로 발생한 memory accesses에 대한 dynamic evidence입니다. 실행되지 않은 schedule, deadlock, fairness, starvation freedom, strict timing을 증명하지 않습니다.

### 12.6 Verification progression 완성

| risk 또는 invariant | smoke | format | concurrency/focused | TSAN |
| --- | --- | --- | --- | --- |
| invalid CLI/overflow | exit와 usage/content | 해당 없음 | 해당 없음 | 핵심 대상 아님 |
| one-philosopher hang/death | timeout + fork/death substring | line grammar | 별도 workload가 주 대상은 아님 | instrumented death workload와 구분 |
| finite global progress | aggregate minimum count | grammar | per-id target, 여러 N, 반복 | instrumented per-id progress |
| malformed/interleaved output | 일부 substring만으로 부족 | every-line regex | 같은 validator + ordering | instrumented output에도 재검사 |
| nondecreasing timestamps | 없음 | 없음 | `check_log` | semantic validator 유지 |
| unique/final death line | single death substring | syntax만 | repeated death + focused harness | instrumented death workload |
| terminal logger overlap | chance에 의존 | syntax symptom만 | 12×200 gated actual logger calls | general instrumented contention |
| data race diagnostic | 없음 | 없음 | behavior symptom만 | exercised accesses에 TSAN |
| infrastructure limitation | timeout 정도 | 해당 없음 | 해당 없음 | probe + optional skip 77/required failure |

### 12.7 각 layer가 잡는 실패와 놓치는 실패

#### public smoke

잡는 것:

- 명백한 CLI acceptance/rejection 회귀
- bounded time 안에 종료하지 않는 public scenario
- single fork/death와 finite work의 기본 observable failure

놓치는 것:

- internal race가 아직 output symptom을 만들지 않은 경우
- exact line grammar의 모든 위반
- philosopher별 progress imbalance

#### grammar

잡는 것:

- interleaved, truncated, unknown, extra-token line
- required phrase가 있어도 함께 섞인 malformed line

놓치는 것:

- syntactically valid하지만 timestamp가 감소하는 output
- unique death, terminal position, semantic progress

#### repeated concurrency와 focused harness

잡는 것:

- 여러 N과 반복에서 드러나는 progress/death symptom
- timestamp ordering과 terminal-line-position 회귀
- logger/death lock boundary의 high-contention symptom

놓치는 것:

- 반복 중 선택되지 않은 schedule
- symptom이 없는 latent data race
- formal fairness/deadlock proof

#### ThreadSanitizer

잡는 것:

- instrumented runs에서 실제 발생한 conflicting memory access
- sanitizer 진단 없이 조기 종료하는 false success를 semantic assertions로 차단

놓치는 것:

- 실행되지 않은 code/schedule의 race
- deadlock, starvation, fairness, real-time timing
- unsupported environment에서의 project correctness 판단

### 12.8 최종 verification flow

```text
make test
    ↓ build
    ↓ smoke public commands
    ↓ timeout guard
    ↓ exit/content/minimum-work assertions
    ↓ every-line grammar
    ↓ concurrency workloads: 2/5/17 finite
    ↓ repeated 7-philosopher progress ×8
    ↓ forced-death schedule ×10
    ↓ nondecreasing timestamps
    ↓ per-id progress
    ↓ exactly one death / no later line
    ↓ in-process 12 logger × 200 + production death commit

make test-tsan
    ↓ TSAN_CC / TSAN_REQUIRED validation
    ↓ instrumented pthread probe build/run
        ├─ unsupported optional → exit 77
        ├─ unsupported required → failure
        └─ supported
             ↓ full production instrumented build
             ↓ finite/death/contention workloads
             ↓ halt-on-error TSAN diagnostic check
             ↓ grammar/progress/terminal semantic checks
```

### 12.9 최종 해석

이 Thread의 결과는 하나의 “test가 충분하다”는 결론이 아닙니다. 각 layer가 다른 관찰 실패를 줄입니다.

- deterministic failure injection은 특정 error branch와 ledger mutation을 직접 만듭니다.
- boundary injection은 오래된 synchronization gap을 정확히 재현합니다.
- repeated black-box workloads는 wider integration과 schedule-sensitive symptom을 관찰합니다.
- focused gated harness는 특정 contention boundary의 overlap을 높입니다.
- TSAN은 supported environment에서 exercised memory access를 동적으로 검사합니다.

이 evidence stack이 모두 통과해도 all-schedule race freedom, formal deadlock freedom, fairness, starvation freedom을 증명한 것으로 해석하면 안 됩니다. 반대로 TSAN이 unsupported여서 77로 skip된 경우에도 project가 통과했다고 볼 수 없습니다.
