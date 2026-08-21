# Thread: Core routine to committed and range-safe meal progress

이 문서는 source에 정의된 세 번째 Development Thread를 그대로 따릅니다. commit 순서, SHA, importance, tags는 변경하지 않습니다. worker routine의 완성된 final HEAD를 첫 구현 commit에 소급하지 않고, 각 fix가 어떤 기존 가정과 transaction boundary를 수정했는지 해당 SHA에서 확인합니다.

## 1. Thread 목표

이 Thread의 목표는 최초 eat-sleep-think worker가 어떻게 fork identity edge, global completion transition, interrupted operation, internal counter range 문제를 드러내고, 최종적으로 committed and range-safe meal progress를 갖게 되는지 복원하는 것입니다.

Source-confirmed significance는 다음과 같습니다.

- 최초 routine은 parity-dependent fork order와 worker-local state transition을 도입하여 domain core를 만듭니다.
- `N == 1`에서는 ring mapping 때문에 두 fork pointer가 같은 mutex가 되어 general two-lock path가 실패합니다.
- final required meal과 global `ended` publication을 같은 critical section으로 묶어 post-completion work를 막습니다.
- eating log 또는 fork ownership이 meal completion의 증거가 아니며, full interval과 synchronized active-state check를 통과해야 counter가 commit됩니다.
- public `INT_MAX` target과 그 이후에도 증가할 수 있는 internal counter의 numeric range를 분리합니다.
- deterministic tests는 interrupted meal과 former overflow boundary에서 local/global counter invariant를 직접 검증합니다.

### Source에 명시적으로 연결된 Critical Invariants

- fork 하나는 두 neighbor가 공유하는 하나의 mutex identity입니다.
- 두 명 이상에서는 acquisition order가 uniform all-left circular wait를 깨야 하며, 한 명에서는 같은 mutex를 재잠금하지 않아야 합니다.
- meal은 eating interval이 끝까지 완료되고 synchronized commit point에서 simulation이 active인 경우에만 count합니다.
- `full_count`는 각 philosopher가 target에 처음 도달할 때만 한 번 증가합니다.
- internal meal accumulation은 public `INT_MAX` target 이후에도 defined 상태로 유지되고 second `full_count` contribution을 만들지 않아야 합니다.
- meal state와 terminal state는 정의된 `state_mutex` boundary에서 관찰·변경됩니다.

### Source에 명시적으로 연결된 Major Engineering Difficulties

- circular wait를 끊으면서 fairness 또는 starvation freedom까지 보장한다고 과장하지 않는 문제
- fork 획득, `is eating` log, eating wait, counter mutation 사이에서 operation commit 지점을 정의하는 문제
- valid public bound와 장기간 증가하는 internal state의 numeric range를 분리하는 문제

## 2. 이 Thread를 이해하기 위한 핵심 질문

- odd/even fork order가 ring lock graph에서 어떤 circular-wait edge를 제거하는가?
- parity rule과 initial stagger가 각각 correctness와 contention에 어떤 다른 역할을 하는가?
- `N == 1`에서 왜 left/right fork pointer가 aliasing되며 general routine은 어디서 self-deadlock하는가?
- final required meal을 기록한 worker가 global completion을 언제 publish해야 하는가?
- fork를 두 개 보유했다는 사실이 terminal 이후 새 meal을 허용하지 않는 이유는 무엇인가?
- `is eating` log와 completed meal counter는 왜 동일한 사건이 아닌가?
- eating wait가 interruption과 deadline completion을 어떻게 구분해야 하는가?
- sleep 완료 직후 counter lock을 잡기 전 terminal이 바뀌는 race는 어디서 다시 확인해야 하는가?
- 모든 abort path에서 fork ownership은 어떻게 해제되는가?
- `must_eat <= INT_MAX`인데 internal `meals`가 `INT_MAX + 1`이 될 수 있는 valid scenario는 무엇인가?
- regression tests가 counter mutation을 scheduler luck 없이 어떻게 직접 자극하는가?

## 3. 완료 기준

- [x] 최초 routine의 fork lock graph와 worker state transition을 실제 code order로 설명할 수 있습니다.
- [x] parity order가 circular wait를 깨는 범위와 fairness non-guarantee를 구분할 수 있습니다.
- [x] `N == 1` pointer aliasing과 dedicated path를 before/after로 제시할 수 있습니다.
- [x] final meal commit, `full_count`, global `ended` publication의 critical section을 설명할 수 있습니다.
- [x] fork acquisition 후 terminal recheck와 post-meal terminal recheck의 역할을 구분할 수 있습니다.
- [x] interrupted eating이 counter를 변경하지 않는 operation transaction을 그릴 수 있습니다.
- [x] wait success 뒤 mutation 전 terminal race를 locked recheck로 설명할 수 있습니다.
- [x] 모든 logical abort에서 두 fork가 release되는지 path별로 확인했습니다.
- [x] public target과 internal accumulated counter의 range를 구분할 수 있습니다.
- [x] `INT_MAX + 1` test가 numeric width와 duplicate contribution을 동시에 확인하는 이유를 설명할 수 있습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Source-defined role |
| --- | --- | --- | --- | --- | --- |
| 1 | `b68f40819af4` | `feat(routine): 철학자의 식사·수면·사고 흐름 구현` | S | `CORE, CONCURRENCY, FORK_ORDER` | Introduces the eat-sleep-think worker and parity-dependent fork order. |
| 2 | `c8531c91f0fb` | `fix(single): 철학자가 한 명일 때 포크 재잠금 방지` | A | `FORK_ORDER, EDGE, RISK` | Handles the ring aliasing edge where one philosopher's two fork pointers are the same mutex. |
| 3 | `fe0a2d15b29b` | `fix(meals): 식사 제한 도달 시 작업 루프 즉시 중단` | A | `MEAL_ACCOUNTING, TERMINAL_STATE, RISK` | Commits global completion in the final meal critical section and prevents post-completion loop states. |
| 4 | `53e591effb4a` | `fix(routine): 중단된 식사를 완료 횟수에서 제외` | A | `MEAL_ACCOUNTING, TERMINAL_STATE, RISK` | Separates an eating attempt from a committed meal and rejects progress after interruption or terminal state. |
| 5 | `73b5551a76f4` | `test(routine): 중단된 식사의 카운터 불변식 검증` | B | `TEST, MEAL_ACCOUNTING` | Injects an interrupted eating wait and verifies that neither local nor global counters advance. |
| 6 | `4c224ae86f2b` | `fix(state): 식사 완료 횟수의 정수 범위 확장` | A | `MEAL_ACCOUNTING, EDGE, RISK` | Widens accumulated meals so a valid `INT_MAX` target can be exceeded without signed overflow. |
| 7 | `054ef46f80c7` | `test(routine): 최대 목표 이후 식사 카운터 검증` | B | `TEST, MEAL_ACCOUNTING, EDGE` | Verifies `INT_MAX + 1` and confirms the philosopher does not contribute to `full_count` twice. |

## 5. Commit별 학습 기록

### 5.1 `b68f40819af4` — `feat(routine): 철학자의 식사·수면·사고 흐름 구현`

- Importance: **S**
- Tags: `CORE, CONCURRENCY, FORK_ORDER`
- Source-defined role: Introduces the eat-sleep-think worker and parity-dependent fork order.
- 코드 기준: 반드시 `b68f40819af4` 시점
- 직접 parent 비교: `git diff b68f40819af4^ b68f40819af4 --`
- Thread 직전 관련 SHA: Thread 내 첫 commit

#### Source-confirmed 맥락

이 S-level commit은 Dining Philosophers domain의 핵심 worker mechanism을 처음 완성합니다. philosopher는 두 fork mutex를 획득하고, `state_mutex` 아래에서 meal start를 기록하며, eating log와 wait를 수행한 뒤 meal completion을 기록하고 fork를 release합니다. 이후 sleeping과 thinking을 반복하며 terminal flag를 관찰합니다.

fork acquisition order는 philosopher parity에 따라 달라집니다. even identifier는 right→left, odd identifier는 left→right 순서로 lock하여 모든 worker가 같은 left-first circular wait를 만드는 구조를 끊습니다. even worker의 1-millisecond initial delay는 contention 완화 장치일 뿐 fairness guarantee가 아닙니다.

이 최초 구현은 left/right fork가 서로 다르다고 가정하고, interruptible wait가 completion status를 반환하지 않으므로 interrupted eating도 완료된 meal로 count할 수 있습니다. 이 두 한계는 후속 fix의 출발점입니다.


#### 변화 연결

| 단계 | Source-confirmed 기준 | 해당 SHA 코드 근거 |
| --- | --- | --- |
| 문제 | 각 worker가 shared fork 두 개를 사용해 eat-sleep-think state를 진행하고 monitor가 신뢰할 meal state를 publish해야 합니다. | §12 완료 기록의 대응 근거 참조 |
| deadlock 위험 | 모든 philosopher가 left fork를 먼저 잡으면 ring 전체가 one-fork hold 상태로 circular wait할 수 있습니다. | §12 완료 기록의 대응 근거 참조 |
| 핵심 결정 | identifier parity에 따라 fork acquisition order를 반대로 배치합니다. | §12 완료 기록의 대응 근거 참조 |
| meal state 결정 | `last_meal_ms`는 eating 시작 시 갱신하고, meal counter와 `full_count`는 shared state lock 아래 갱신합니다. | §12 완료 기록의 대응 근거 참조 |
| 남은 edge | `N == 1`에서 두 fork pointer가 같은 mutex를 가리킵니다. | §12 완료 기록의 대응 근거 참조 |
| 남은 transaction 결함 | interruptible wait가 끝까지 완료되었는지 구분하지 못해 aborted eating도 count될 수 있습니다. | §12 완료 기록의 대응 근거 참조 |

#### 해당 SHA에서 직접 확인할 코드
- [x] `git show --name-status b68f40819af4`로 worker routine이 추가된 실제 파일과 public entry symbol을 확인합니다.
- [x] routine의 outer loop와 terminal check 위치를 순서대로 기록합니다.
- [x] odd/even identifier별 첫 번째·두 번째 fork pointer와 실제 `pthread_mutex_lock` 순서를 표로 만듭니다.
- [x] fork acquisition 후 각 fork status log가 어느 lock 성공 뒤에 호출되는지 확인합니다.
- [x] `last_meal_ms`가 eating log, eating wait, counter increment 중 어느 시점에 갱신되는지 확인합니다.
- [x] meal start와 meal completion state mutation이 `state_mutex` 아래에서 이뤄지는지 확인합니다.
- [x] `full_count`가 philosopher의 `meals == must_eat` 조건에서만 증가하는지 확인합니다.
- [x] 두 fork의 release 순서와 모든 early return/failure branch에서의 release 여부를 확인합니다.
- [x] even worker initial delay가 어느 identifier 조건에서, barrier 또는 fork lock 전후 중 어디에 위치하는지 확인합니다.
- [x] `left_fork == right_fork`인 `N == 1`에서 실행되는 lock sequence를 실제 pointer mapping과 결합해 재구성합니다.
- [x] eating wait의 반환 type과 호출자가 그 결과를 사용하는지 확인하여 interrupted-meal 결함을 증명합니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol | §12 완료 기록의 대응 근거 참조 |
| 최소 코드 구간 | §12 완료 기록의 대응 근거 참조 |
| caller → callee | §12 완료 기록의 대응 근거 참조 |
| state 또는 ownership 변화 | §12 완료 기록의 대응 근거 참조 |
| failure/cleanup 경로 | §12 완료 기록의 대응 근거 참조 |
| 직전 상태와의 차이 | §12 완료 기록의 대응 근거 참조 |

#### Worker state transition 기록

| 단계 | 보유 fork | `state_mutex` mutation | log | wait | 실패/terminal 시 cleanup |
| --- | --- | --- | --- | --- | --- |
| routine 진입 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | optional initial delay | §12 완료 기록의 대응 근거 참조 |
| 첫 fork 획득 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| 두 번째 fork 획득 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| meal start commit | §12 완료 기록의 대응 근거 참조 | `last_meal_ms` | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| eating interval | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | `is eating` | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| meal completion | §12 완료 기록의 대응 근거 참조 | `meals`, `full_count` | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| sleeping | none | §12 완료 기록의 대응 근거 참조 | `is sleeping` | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| thinking | none | §12 완료 기록의 대응 근거 참조 | `is thinking` | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |

#### Fork order 검증

| Philosopher parity | First fork | Second fork | 제거하는 uniform wait edge | fairness 보장 여부 |
| --- | --- | --- | --- | --- |
| odd | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | 보장하지 않음 |
| even | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | 보장하지 않음 |


#### 보장 범위

이 commit이 source 기준으로 보장하는 것:
- multi-worker ring에서 모든 worker가 동일한 left-first order를 갖는 circular-wait 구조를 깨뜨립니다.
- worker-local eat-sleep-think cycle과 monitor가 읽을 meal timestamp/counter의 producer가 정의됩니다.
- `full_count` contribution을 threshold equality에 연결하여 한 philosopher가 최초 target 도달 시 한 번만 기여하려는 규칙을 둡니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- `N == 1`에서 동일 non-recursive mutex를 두 번 lock하지 않는 것은 아직 보장하지 않습니다.
- interrupted eating interval이 counter를 증가시키지 않는 것은 아직 보장하지 않습니다.
- scheduler fairness 또는 starvation freedom을 보장하지 않습니다.

#### 학습자 결론
- [x] parity order가 classic all-left circular wait를 끊는 lock graph를 실제 fork indices로 그립니다.
- [x] 1-millisecond delay가 correctness invariant가 아닌 이유를 설명합니다.
- [x] meal start와 meal completion이 다른 state transition인 이유를 후속 commits와 연결합니다.
- [x] 이 commit의 worker responsibility와 monitor가 나중에 맡는 global policy를 구분합니다.

### 5.2 `c8531c91f0fb` — `fix(single): 철학자가 한 명일 때 포크 재잠금 방지`

- Importance: **A**
- Tags: `FORK_ORDER, EDGE, RISK`
- Source-defined role: Handles the ring aliasing edge where one philosopher's two fork pointers are the same mutex.
- 코드 기준: 반드시 `c8531c91f0fb` 시점
- 직접 parent 비교: `git diff c8531c91f0fb^ c8531c91f0fb --`
- Thread 직전 관련 SHA: `b68f40819af4`

#### Fix chain

ring mapping에서 `N == 1`이면 `left_fork`와 `right_fork`가 같은 mutex 주소입니다. 기존 worker는 non-recursive mutex를 한 번 lock한 뒤 같은 thread에서 다시 lock하여 영구 block될 수 있습니다. 이 fix는 single-philosopher 전용 path에서 하나의 fork만 한 번 획득하고 가능한 fork event를 남긴 뒤 `time_to_die`보다 조금 더 기다리고 release합니다. death 판단과 log는 multi-worker와 동일하게 monitor가 담당합니다.


#### 변화 연결

| 단계 | Source-confirmed 기준 | 해당 SHA 코드 근거 |
| --- | --- | --- |
| 기존 가정 | 두 fork pointer는 서로 다른 mutex이므로 normal two-lock path를 사용할 수 있습니다. | §12 완료 기록의 대응 근거 참조 |
| 실제 failure | `N == 1`에서 ring aliasing으로 두 pointer가 같아 self-deadlock이 결정적으로 발생합니다. | §12 완료 기록의 대응 근거 참조 |
| root cause | topology가 만드는 pointer identity edge를 routine이 구분하지 않았습니다. | §12 완료 기록의 대응 근거 참조 |
| 수정 결정 | single worker는 fork 하나만 lock·log·wait·unlock하고 meal을 시작하지 않습니다. | §12 완료 기록의 대응 근거 참조 |
| 유지되는 책임 | worker는 자원 제약을 모델링하고 monitor가 starvation death를 확정합니다. | §12 완료 기록의 대응 근거 참조 |

#### 해당 SHA에서 직접 확인할 코드
- [x] `b68f40819af4` 대비 single-philosopher branch의 진입 조건과 호출 위치를 확인합니다.
- [x] `left_fork`와 `right_fork`의 실제 pointer equality가 `N == 1`에서 성립하는지 initializer mapping으로 검산합니다.
- [x] single path가 mutex를 정확히 한 번 lock하고 한 번 unlock하는지 확인합니다.
- [x] fork acquisition log가 몇 번 발생하는지 확인합니다.
- [x] wait duration이 `time_to_die`보다 어떻게 길게 계산되는지 실제 식과 type으로 확인합니다.
- [x] terminal-aware wait가 조기 종료될 때 fork가 release되는지 확인합니다.
- [x] single path가 meal-start state, `is eating`, meal counter를 변경하지 않는지 확인합니다.
- [x] worker return 후 monitor가 death를 발견할 수 있는 shared state와 execution order를 확인합니다.
- [x] multi-worker acquisition path가 변경되지 않았는지 diff로 확인합니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol | §12 완료 기록의 대응 근거 참조 |
| 최소 코드 구간 | §12 완료 기록의 대응 근거 참조 |
| caller → callee | §12 완료 기록의 대응 근거 참조 |
| state 또는 ownership 변화 | §12 완료 기록의 대응 근거 참조 |
| failure/cleanup 경로 | §12 완료 기록의 대응 근거 참조 |
| 직전 상태와의 차이 | §12 완료 기록의 대응 근거 참조 |

#### Edge-case execution trace

```text
N == 1
→ left_fork address == right_fork address
→ dedicated branch
→ lock once
→ one fork event
→ no meal-start transition
→ wait beyond death threshold or terminal interruption
→ unlock once
→ worker return
→ monitor remains death authority
```

- 실제 branch symbol: §12 완료 기록의 대응 근거에 정리했습니다.
- pointer equality 근거: §12 완료 기록의 대응 근거에 정리했습니다.
- wait expression: §12 완료 기록의 대응 근거에 정리했습니다.
- unlock 보장: §12 완료 기록의 대응 근거에 정리했습니다.
- monitor observation path: §12 완료 기록의 대응 근거에 정리했습니다.


#### 보장 범위

이 commit이 source 기준으로 보장하는 것:
- valid input `N == 1`에서 worker가 같은 non-recursive mutex를 재잠금하지 않습니다.
- 한 philosopher가 하나의 실제 fork만 획득할 수 있고 meal을 시작할 수 없다는 resource constraint를 보존합니다.
- death authority를 worker로 옮기지 않고 monitor responsibility를 유지합니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- single philosopher가 meal을 완료하거나 meal target을 만족한다고 보장하지 않습니다.
- multi-worker fairness나 starvation freedom을 바꾸지 않습니다.
- 이 Thread 내 dedicated deterministic test commit은 source에 포함되어 있지 않습니다.

#### 학습자 결론
- [x] general ring topology가 valid edge input에서 aliasing을 만드는 과정을 주소로 설명합니다.
- [x] 가짜 두 번째 fork를 만들지 않고 실제 resource constraint를 모델링한 이유를 설명합니다.
- [x] single worker와 monitor 사이의 responsibility split을 execution trace로 제시합니다.

### 5.3 `fe0a2d15b29b` — `fix(meals): 식사 제한 도달 시 작업 루프 즉시 중단`

- Importance: **A**
- Tags: `MEAL_ACCOUNTING, TERMINAL_STATE, RISK`
- Source-defined role: Commits global completion in the final meal critical section and prevents post-completion loop states.
- 코드 기준: 반드시 `fe0a2d15b29b` 시점
- 직접 parent 비교: `git diff fe0a2d15b29b^ fe0a2d15b29b --`
- Thread 직전 관련 SHA: `c8531c91f0fb`

#### Fix chain

이 A-level fix는 final required meal을 기록하는 worker가 `state_mutex` 안에서 `meals`, `full_count`, global `ended`를 한 transaction으로 갱신하게 합니다. `eat_once`는 status를 반환하고, 두 fork를 모두 획득한 뒤 다른 worker가 이미 completion을 commit했다면 meal을 시작하지 않고 두 fork를 release합니다. completed meal 뒤에도 terminal state를 다시 확인해 sleeping 또는 thinking log로 진행하지 않습니다.

다만 eating delay가 terminal로 중단되었는지 구분하지 못하는 문제는 남아 있어, interrupted meal도 counter에 반영될 수 있습니다. 이 한계가 `53e591effb4a`의 직접 원인입니다.


#### 변화 연결

| 단계 | Source-confirmed 기준 | 해당 SHA 코드 근거 |
| --- | --- | --- |
| 기존 상태 | monitor polling이 global completion을 나중에 발견하며, worker loop가 target 도달 뒤에도 다음 state로 진행할 수 있습니다. | §12 완료 기록의 대응 근거 참조 |
| 실제 위험 | last required meal과 `ended` publication 사이의 delay 동안 다른 worker가 새 meal이나 post-completion log를 시작할 수 있습니다. | §12 완료 기록의 대응 근거 참조 |
| 수정 decision | final meal commit을 기록하는 worker가 lock 안에서 global completion까지 publish합니다. | §12 완료 기록의 대응 근거 참조 |
| fork-boundary decision | fork ownership만으로 terminal 이후 새 meal을 시작할 권한이 생기지 않으므로 acquisition 후 state를 재확인합니다. | §12 완료 기록의 대응 근거 참조 |
| 남은 root cause | eating wait가 deadline completion과 terminal interruption을 구분하지 않습니다. | §12 완료 기록의 대응 근거 참조 |

#### 해당 SHA에서 직접 확인할 코드
- [x] `c8531c91f0fb` 대비 `record_meal_done`의 mutation 순서와 return/side effect 변화를 확인합니다.
- [x] per-philosopher `meals` 증가, equality check, `full_count` 증가, all-full check, `ended` publication이 하나의 `state_mutex` critical section에 있는지 확인합니다.
- [x] `full_count`가 threshold equality에서만 증가하고 target 초과 시 재기여하지 않는지 확인합니다.
- [x] `eat_once`의 return status가 routine loop에 어떻게 사용되는지 확인합니다.
- [x] 두 fork 획득 직후 terminal recheck branch가 두 mutex를 모두 release하는지 확인합니다.
- [x] completed meal 직후 routine이 terminal을 확인하고 sleeping/thinking으로 진행하지 않는지 확인합니다.
- [x] monitor의 meal-completion 역할이 이 SHA에서 어떻게 줄거나 유지되는지 실제 코드로 확인합니다.
- [x] `philo_sleep_ms` return type과 eating call site를 확인하여 interrupted wait 후에도 `record_meal_done`이 호출되는 경로를 찾습니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol | §12 완료 기록의 대응 근거 참조 |
| 최소 코드 구간 | §12 완료 기록의 대응 근거 참조 |
| caller → callee | §12 완료 기록의 대응 근거 참조 |
| state 또는 ownership 변화 | §12 완료 기록의 대응 근거 참조 |
| failure/cleanup 경로 | §12 완료 기록의 대응 근거 참조 |
| 직전 상태와의 차이 | §12 완료 기록의 대응 근거 참조 |

#### Completion transaction

| mutation 또는 check | lock 경계 | 조건 | 다음 상태 | 실제 코드 |
| --- | --- | --- | --- | --- |
| `meals` increment | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| threshold equality | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| `full_count` increment | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| all philosophers full | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| `ended` publication | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | routine stop | §12 완료 기록의 대응 근거 참조 |
| acquisition 후 terminal recheck | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | release without meal | §12 완료 기록의 대응 근거 참조 |
| meal 후 terminal recheck | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | suppress sleep/think | §12 완료 기록의 대응 근거 참조 |


#### 보장 범위

이 commit이 source 기준으로 보장하는 것:
- global meal completion이 final required meal의 locked completion path에서 즉시 publish됩니다.
- terminal state가 fork 대기 중 확정된 worker는 acquisition 후 새 meal을 시작하지 않습니다.
- global completion 뒤 sleeping/thinking state로 불필요하게 진행하는 것을 막습니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- eating interval이 끝까지 완료되지 않았는데도 meal counter가 증가하지 않는 것은 아직 보장하지 않습니다.
- fairness 또는 모든 worker의 equal progress를 보장하지 않습니다.

#### 학습자 결론
- [x] fork 두 개를 가졌다는 사실과 새 meal을 commit할 권한을 구분합니다.
- [x] final meal의 local mutation이 global termination으로 연결되는 critical section을 설명합니다.
- [x] 이 fix가 닫은 polling gap과 아직 남긴 interrupted-meal gap을 구분합니다.

### 5.4 `53e591effb4a` — `fix(routine): 중단된 식사를 완료 횟수에서 제외`

- Importance: **A**
- Tags: `MEAL_ACCOUNTING, TERMINAL_STATE, RISK`
- Source-defined role: Separates an eating attempt from a committed meal and rejects progress after interruption or terminal state.
- 코드 기준: 반드시 `53e591effb4a` 시점
- 직접 parent 비교: `git diff 53e591effb4a^ 53e591effb4a --`
- Thread 직전 관련 SHA: `fe0a2d15b29b`

#### Fix chain

이 A-level fix는 eating attempt와 committed meal을 분리합니다. `philo_sleep_ms`는 deadline에 도달했는지 terminal state 때문에 중단되었는지를 status로 반환합니다. eating wait가 중단되면 worker는 두 fork를 release하고 local/global meal counter를 변경하지 않습니다.

wait가 deadline에 도달한 직후 다른 thread가 terminal state를 commit할 수 있으므로 `record_meal_done`도 `state_mutex` 안에서 mutation 직전 `ended`를 재확인합니다. 즉, full eating interval 완료와 synchronized active-state check를 모두 통과해야 meal이 commit됩니다.


#### 변화 연결

| 단계 | Source-confirmed 기준 | 해당 SHA 코드 근거 |
| --- | --- | --- |
| 기존 가정 | `is eating` log와 wait 호출 이후에는 meal을 완료한 것으로 count할 수 있습니다. | §12 완료 기록의 대응 근거 참조 |
| 실제 failure/위험 | terminal interrupt로 eating interval이 짧아져도 `meals`와 `full_count`가 증가할 수 있습니다. | §12 완료 기록의 대응 근거 참조 |
| root cause | wait API가 deadline completion과 terminal interruption을 구분하지 않고, counter mutation 직전 state revalidation도 부족합니다. | §12 완료 기록의 대응 근거 참조 |
| 수정 decision | sleep status를 eating operation contract로 사용하고 interruption은 abort로 처리합니다. | §12 완료 기록의 대응 근거 참조 |
| race 보완 | deadline 도달 후 mutation 전에 terminal이 commit되는 window를 locked `ended` recheck로 닫습니다. | §12 완료 기록의 대응 근거 참조 |
| resource invariant | 논리 operation이 commit되지 않아도 acquired fork 둘은 모든 exit에서 release합니다. | §12 완료 기록의 대응 근거 참조 |
| regression 연결 | `73b5551a76f4`가 interrupted sleep을 주입해 local/global counter가 0으로 유지되는지 검증합니다. | §12 완료 기록의 대응 근거 참조 |

#### 해당 SHA에서 직접 확인할 코드
- [x] `fe0a2d15b29b` 대비 `philo_sleep_ms`의 반환 type과 return condition을 확인합니다.
- [x] deadline reached와 terminal observed가 각각 어떤 status로 반환되는지 확인합니다.
- [x] `eat_once`가 eating sleep result를 검사하고 실패 시 어떤 release helper를 호출하는지 확인합니다.
- [x] interrupted branch에서 `record_meal_done`이 호출되지 않는지 확인합니다.
- [x] `record_meal_done`이 `state_mutex`를 잡은 뒤 mutation 직전 `ended`를 재확인하는 순서를 확인합니다.
- [x] sleep success 후 lock 획득 전 terminal이 바뀌는 interleaving을 코드 순서로 작성합니다.
- [x] 해당 interleaving에서 recheck가 false commit을 막는지 확인합니다.
- [x] 모든 abort/return path에서 first/second fork ownership이 정확히 한 번 release되는지 표로 검증합니다.
- [x] sleep API 변경이 sleeping phase나 single-philosopher path의 call site에 어떻게 반영되는지 확인합니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol | §12 완료 기록의 대응 근거 참조 |
| 최소 코드 구간 | §12 완료 기록의 대응 근거 참조 |
| caller → callee | §12 완료 기록의 대응 근거 참조 |
| state 또는 ownership 변화 | §12 완료 기록의 대응 근거 참조 |
| failure/cleanup 경로 | §12 완료 기록의 대응 근거 참조 |
| 직전 상태와의 차이 | §12 완료 기록의 대응 근거 참조 |

#### Meal transaction boundary

```text
fork ownership 획득
→ meal-start state/log
→ full eating deadline wait
    ├─ terminal interruption
    │      → release forks
    │      → no counter mutation
    └─ deadline reached
           → state_mutex 획득
           → ended 재검사
               ├─ ended
               │      → no counter mutation
               └─ active
                      → meals/full_count commit
→ release forks
```

- 각 단계의 actual symbol: §12 완료 기록의 대응 근거에 정리했습니다.
- operation start와 commit의 구분: §12 완료 기록의 대응 근거에 정리했습니다.
- terminal interruption status: §12 완료 기록의 대응 근거에 정리했습니다.
- mutation 전 recheck: §12 완료 기록의 대응 근거에 정리했습니다.
- fork release proof: §12 완료 기록의 대응 근거에 정리했습니다.


#### 보장 범위

이 commit이 source 기준으로 보장하는 것:
- configured eating interval을 완료하고 synchronized commit point에서 simulation이 active인 meal만 count합니다.
- interrupted meal은 per-philosopher `meals`와 global `full_count`를 변경하지 않습니다.
- 모든 logical abort exit가 acquired fork를 release합니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- meal-start log가 곧 meal completion을 의미하지 않습니다.
- 이 변경은 scheduler fairness나 starvation freedom을 보장하지 않습니다.

#### 학습자 결론
- [x] operation start, wait completion, state commit을 세 단계로 분리해 설명합니다.
- [x] sleep success 직후 terminal publication race를 실제 lock timing으로 설명합니다.
- [x] resource cleanup invariant와 logical meal accounting invariant가 함께 유지되는 이유를 설명합니다.

### 5.5 `73b5551a76f4` — `test(routine): 중단된 식사의 카운터 불변식 검증`

- Importance: **B**
- Tags: `TEST, MEAL_ACCOUNTING`
- Source-defined role: Injects an interrupted eating wait and verifies that neither local nor global counters advance.
- 코드 기준: 반드시 `73b5551a76f4` 시점
- 직접 parent 비교: `git diff 73b5551a76f4^ 73b5551a76f4 --`
- Thread 직전 관련 SHA: `53e591effb4a`

#### Source-confirmed test 역할

이 deterministic routine test는 `philo_sleep_ms`를 대체하여 `ended`를 publish하고 `PHILO_ERR`를 반환합니다. worker는 start barrier를 이미 지난 상태로 직접 호출되며 local meal count와 global completion count는 0에서 시작합니다. production routine의 실제 fork locking과 state update 경로는 유지하고, injected interruption 뒤 두 counter가 모두 0인지 검사합니다.


#### Test commit 분석

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariant | §12 완료 기록의 대응 근거 참조 |
| 주입하는 interrupted operation | §12 완료 기록의 대응 근거 참조 |
| stub이 publish하는 state와 return status | §12 완료 기록의 대응 근거 참조 |
| direct worker invocation 조건 | §12 완료 기록의 대응 근거 참조 |
| 실제로 통과하는 production fork/state path | §12 완료 기록의 대응 근거 참조 |
| 초기 counter 상태 | §12 완료 기록의 대응 근거 참조 |
| expected local counter | §12 완료 기록의 대응 근거 참조 |
| expected global counter | §12 완료 기록의 대응 근거 참조 |
| resource release 관찰 방법 | §12 완료 기록의 대응 근거 참조 |
| 이 테스트가 증명하는 것 | §12 완료 기록의 대응 근거 참조 |
| 이 테스트가 증명하지 않는 것 | §12 완료 기록의 대응 근거 참조 |
| deterministic regression 분류 | §12 완료 기록의 대응 근거 참조 |
| 후속 회귀 방지 대상 | §12 완료 기록의 대응 근거 참조 |

#### 해당 SHA에서 직접 확인할 코드
- [x] routine object에서 `philo_sleep_ms`가 test stub으로 치환되는 build 방식을 확인합니다.
- [x] stub이 production `state_mutex` 경계를 사용해 `ended`를 publish하는지 실제 코드를 확인합니다.
- [x] stub return status가 `PHILO_ERR`인지 확인합니다.
- [x] directly invoked worker가 barrier를 기다리지 않도록 table/philo state를 어떻게 seed하는지 확인합니다.
- [x] fork mutex는 real production locking을 사용하는지 확인합니다.
- [x] initial `meals == 0`, `full_count == 0` 설정을 확인합니다.
- [x] worker return 후 두 counter가 0이라는 assertion을 확인합니다.
- [x] fork가 잠긴 채 남지 않았음을 test가 직접 또는 간접으로 어떻게 확인하는지 구분합니다.
- [x] shell-level output count로는 같은 semantic bug를 결정적으로 찾기 어려운 이유를 기록합니다.

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
- injected eating interruption에서 production routine이 local/global meal progress를 commit하지 않음을 결정적으로 검증합니다.
- scheduler variability 없이 `eat_once` transaction boundary를 직접 통과합니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- full executable의 모든 interleaving이나 monitor interaction을 검증하지 않습니다.
- 모든 sleep call site 또는 모든 terminal timing을 포괄하지 않습니다.

#### 학습자 결론
- [x] direct invocation이 regression target을 좁히는 장점과 integration coverage를 줄이는 한계를 설명합니다.
- [x] stubbed sleep 앞뒤의 production lock/state path를 구분합니다.
- [x] 두 counter assertion이 meal transaction invariant를 어떻게 고정하는지 설명합니다.

### 5.6 `4c224ae86f2b` — `fix(state): 식사 완료 횟수의 정수 범위 확장`

- Importance: **A**
- Tags: `MEAL_ACCOUNTING, EDGE, RISK`
- Source-defined role: Widens accumulated meals so a valid `INT_MAX` target can be exceeded without signed overflow.
- 코드 기준: 반드시 `4c224ae86f2b` 시점
- 직접 parent 비교: `git diff 4c224ae86f2b^ 4c224ae86f2b --`
- Thread 직전 관련 SHA: `73b5551a76f4`

#### Fix chain

public `must_eat` target은 `INT_MAX`로 제한되지만, 한 philosopher가 target에 일찍 도달한 뒤 다른 philosopher의 completion을 기다리는 동안 추가 meal을 완료할 수 있습니다. per-philosopher accumulated counter도 `int`이면 valid execution에서 signed overflow가 발생할 수 있습니다. mutex protection은 data race를 막을 뿐 signed overflow undefined behavior를 안전하게 만들지 않습니다.

이 fix는 internal `meals`를 `int64_t`로 확장하면서 public target bound와 equality-based `full_count` contribution을 유지합니다.


#### 변화 연결

| 단계 | Source-confirmed 기준 | 해당 SHA 코드 근거 |
| --- | --- | --- |
| 기존 가정 | public target이 `INT_MAX`이므로 runtime accumulated counter도 `int`면 충분합니다. | §12 완료 기록의 대응 근거 참조 |
| 실제 failure/위험 | target 도달 후에도 다른 philosopher를 기다리며 추가 meal이 발생해 `INT_MAX + 1`이 valid path에서 필요할 수 있습니다. | §12 완료 기록의 대응 근거 참조 |
| root cause | bounded public input과 계속 증가할 수 있는 internal state를 같은 numeric range로 취급했습니다. | §12 완료 기록의 대응 근거 참조 |
| 수정 decision | internal `meals`만 `int64_t`로 넓히고 public `must_eat` contract는 유지합니다. | §12 완료 기록의 대응 근거 참조 |
| completion invariant | `full_count` contribution은 equality 시점 한 번만 발생하며 target 초과 후 재기여하지 않습니다. | §12 완료 기록의 대응 근거 참조 |
| regression 연결 | `054ef46f80c7`이 `INT_MAX`에서 한 meal을 더 완료해 `INT_MAX + 1`과 unchanged `full_count`를 검증합니다. | §12 완료 기록의 대응 근거 참조 |

#### 해당 SHA에서 직접 확인할 코드
- [x] `73b5551a76f4` 대비 `meals` field의 type 변경과 관련 선언·format·comparison을 모두 찾습니다.
- [x] public `must_eat` field/type 및 parser bound가 변경되지 않는지 확인합니다.
- [x] counter increment expression이 wider type에서 수행되는지 확인합니다.
- [x] `meals == must_eat` 비교에서 implicit conversion과 intended equality semantics를 확인합니다.
- [x] target 초과 후 `full_count`가 다시 증가하지 않는 control flow를 확인합니다.
- [x] counter를 읽는 monitor 또는 test code가 type 변경에 맞게 수정되는지 확인합니다.
- [x] mutex가 numeric overflow 해결책이 아닌 이유를 해당 increment path와 C signed-overflow semantics로 설명하되 source 밖의 다른 numeric guarantee를 추가하지 않습니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol | §12 완료 기록의 대응 근거 참조 |
| 최소 코드 구간 | §12 완료 기록의 대응 근거 참조 |
| caller → callee | §12 완료 기록의 대응 근거 참조 |
| state 또는 ownership 변화 | §12 완료 기록의 대응 근거 참조 |
| failure/cleanup 경로 | §12 완료 기록의 대응 근거 참조 |
| 직전 상태와의 차이 | §12 완료 기록의 대응 근거 참조 |

#### Public contract와 internal state 분리

| 항목 | Public bound | Runtime accumulation | 해당 SHA type | mutation/compare 위치 |
| --- | --- | --- | --- | --- |
| `must_eat` | `INT_MAX` | fixed target | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| `meals` | 직접 입력 아님 | target 이후도 증가 가능 | `int64_t` | §12 완료 기록의 대응 근거 참조 |
| `full_count` contribution | philosopher당 한 번 | equality에서만 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |


#### 보장 범위

이 commit이 source 기준으로 보장하는 것:
- valid `INT_MAX` target을 넘어서 한 번 이상 계속되는 internal meal accumulation이 즉시 signed `int` overflow를 일으키지 않습니다.
- public target bound와 threshold equality-based one-time contribution을 유지합니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- internal counter가 무한히 증가해도 절대 overflow하지 않는다고 보장하지 않습니다.
- public `must_eat` 범위를 `INT_MAX`보다 넓히지 않습니다.
- progress fairness를 보장하지 않습니다.

#### 학습자 결론
- [x] public input range와 internal accumulated state range가 다른 이유를 concrete execution으로 설명합니다.
- [x] mutex synchronization과 defined numeric range가 서로 다른 correctness 문제임을 설명합니다.
- [x] widening과 one-time `full_count` contribution이 함께 유지되는 코드를 제시합니다.

### 5.7 `054ef46f80c7` — `test(routine): 최대 목표 이후 식사 카운터 검증`

- Importance: **B**
- Tags: `TEST, MEAL_ACCOUNTING, EDGE`
- Source-defined role: Verifies `INT_MAX + 1` and confirms the philosopher does not contribute to `full_count` twice.
- 코드 기준: 반드시 `054ef46f80c7` 시점
- 직접 parent 비교: `git diff 054ef46f80c7^ 054ef46f80c7 --`
- Thread 직전 관련 SHA: `4c224ae86f2b`

#### Source-confirmed test 역할

이 regression test는 두-philosopher table에서 public target을 `INT_MAX`로 두고 한 philosopher의 `meals`를 이미 `INT_MAX`, `full_count`를 이미 contribution이 반영된 상태로 seed합니다. substituted sleep은 eating interval 하나를 완료시키고 다음 sleep에서 routine을 종료합니다. 결과는 `meals == INT_MAX + 1`, `full_count` unchanged여야 합니다.


#### Test commit 분석

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariant | §12 완료 기록의 대응 근거 참조 |
| former numeric boundary | §12 완료 기록의 대응 근거 참조 |
| seeded philosopher state | §12 완료 기록의 대응 근거 참조 |
| seeded global completion state | §12 완료 기록의 대응 근거 참조 |
| substituted sleep sequence | §12 완료 기록의 대응 근거 참조 |
| 실제로 통과하는 production meal-completion path | §12 완료 기록의 대응 근거 참조 |
| `INT_MAX + 1` assertion | §12 완료 기록의 대응 근거 참조 |
| unchanged `full_count` assertion | §12 완료 기록의 대응 근거 참조 |
| 이 테스트가 증명하는 것 | §12 완료 기록의 대응 근거 참조 |
| 이 테스트가 증명하지 않는 것 | §12 완료 기록의 대응 근거 참조 |
| deterministic boundary regression 분류 | §12 완료 기록의 대응 근거 참조 |
| 후속 회귀 방지 대상 | §12 완료 기록의 대응 근거 참조 |

#### 해당 SHA에서 직접 확인할 코드
- [x] 두-philosopher table이 필요한 이유와 second philosopher state를 확인합니다.
- [x] `must_eat == INT_MAX`, target philosopher `meals == INT_MAX` seed를 확인합니다.
- [x] `full_count`가 이미 해당 philosopher의 threshold contribution을 포함하도록 어떤 값으로 설정되는지 확인합니다.
- [x] sleep stub이 첫 eating wait를 success로, 후속 sleep을 termination으로 만드는 call sequence를 확인합니다.
- [x] production `record_meal_done` 또는 equivalent path가 실제로 `INT_MAX + 1` increment를 수행하는지 확인합니다.
- [x] assertion expression이 wider type에서 `INT_MAX + 1`을 계산하도록 작성되었는지 확인합니다.
- [x] `full_count`가 증가하지 않는 assertion을 확인합니다.
- [x] test가 duplicate contribution bug와 numeric overflow bug를 동시에 감지하는 이유를 설명합니다.

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
- former `int` boundary에서 한 번 더 meal을 완료했을 때 internal counter가 defined `INT_MAX + 1` 값을 갖는지 검증합니다.
- target 초과 후 같은 philosopher가 `full_count`에 두 번째로 기여하지 않는지 검증합니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- arbitrarily long execution의 모든 numeric boundary를 검증하지 않습니다.
- multi-thread schedule, fairness, monitor timing을 검증하지 않습니다.

#### 학습자 결론
- [x] seeded state가 실제 valid execution의 어느 순간을 모델링하는지 설명합니다.
- [x] numeric widening만 통과하고 threshold accounting이 깨진 구현도 이 test가 실패시키는 이유를 설명합니다.
- [x] Thread 전체의 meal progress가 fork acquisition에서 committed, range-safe state로 발전한 과정을 요약합니다.

## 6. Invariant ledger

| Invariant | 최초 도입 또는 부족함 | 강화·복구 | regression evidence | 해당 SHA 코드 근거 | 최종 설명 |
| --- | --- | --- | --- | --- | --- |
| multi-worker fork order는 uniform all-left circular wait를 깨뜨림 | `b68f40819af4` | 이후 Thread commits는 이 order를 유지 | 이 Thread source에는 전용 order test commit 없음 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| single philosopher는 같은 mutex를 재잠금하지 않음 | `b68f40819af4`에서 distinct-fork 가정 부족 | `c8531c91f0fb` | 이 Thread source에는 전용 deterministic test 없음 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| final target 도달과 global completion publication이 같은 state transaction | 최초 routine/monitor polling으로 gap 존재 | `fe0a2d15b29b` | 직접 test commit은 이 Thread에 없음 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| terminal 이후 새 meal 또는 post-completion sleep/think로 진행하지 않음 | 최초 routine에서 부족 | `fe0a2d15b29b` | 관련 code path 직접 확인 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| meal은 full eating interval과 active commit point를 통과해야 count | `fe0a2d15b29b`까지 interrupted wait count 가능 | `53e591effb4a` | `73b5551a76f4` | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| 모든 aborted eating path는 acquired fork를 release | 최초 routine의 exit path에서 확인 시작 | `53e591effb4a`에서 logical abort와 결합 | `73b5551a76f4`의 production locking path | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| internal meal counter는 public target 이후에도 defined range 유지 | `int` counter로 valid overflow 위험 | `4c224ae86f2b` | `054ef46f80c7` | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| philosopher는 `full_count`에 threshold equality에서 한 번만 기여 | `b68f40819af4`에서 최초 규칙 | `fe0a2d15b29b`, `4c224ae86f2b`에서 유지 | `054ef46f80c7` | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |

## 7. Failure → Fix → Test 연결

### 7.1 Ring aliasing과 single-philosopher self-deadlock

```text
`b68f40819af4`
normal two-fork acquisition
→ N == 1에서 left/right pointer alias
→ 같은 non-recursive mutex 재잠금
→ `c8531c91f0fb`
single path: lock once, one fork event, no meal, monitor death
```

- pointer alias를 만드는 initializer expression: §12 완료 기록의 대응 근거에 정리했습니다.
- self-deadlock이 발생하는 두 lock call: §12 완료 기록의 대응 근거에 정리했습니다.
- dedicated branch의 lock/log/wait/unlock 순서: §12 완료 기록의 대응 근거에 정리했습니다.
- meal state가 변경되지 않는 근거: §12 완료 기록의 대응 근거에 정리했습니다.
- monitor가 death authority를 유지하는 근거: §12 완료 기록의 대응 근거에 정리했습니다.
- 이 fix가 fairness를 보장하지 않는 이유: §12 완료 기록의 대응 근거에 정리했습니다.

### 7.2 Final meal publication과 interrupted meal

```text
monitor가 completion을 polling
→ final meal과 ended publication 사이 gap
→ `fe0a2d15b29b`
worker completion critical section에서 ended publish
→ 그러나 sleep interruption과 deadline completion을 구분하지 못함
→ `53e591effb4a`
sleep status + mutation 전 ended recheck
→ `73b5551a76f4`
interruption 주입 후 meals/full_count == 0
```

- `fe0a2d15b29b`이 닫은 polling gap: §12 완료 기록의 대응 근거에 정리했습니다.
- 같은 commit에 남은 interrupted-meal root cause: §12 완료 기록의 대응 근거에 정리했습니다.
- `53e591effb4a`의 operation commit point: §12 완료 기록의 대응 근거에 정리했습니다.
- abort path의 fork release: §12 완료 기록의 대응 근거에 정리했습니다.
- test stub이 production path에 들어가는 지점: §12 완료 기록의 대응 근거에 정리했습니다.
- local/global counter assertions: §12 완료 기록의 대응 근거에 정리했습니다.
- 이 연결이 증명하지 않는 integration 범위: §12 완료 기록의 대응 근거에 정리했습니다.

### 7.3 Public target과 internal accumulated state

```text
must_eat <= INT_MAX
→ target 도달 philosopher가 다른 worker를 기다리며 추가 meal 가능
→ int meals increment에서 signed overflow 위험
→ `4c224ae86f2b`
internal meals를 int64_t로 확장
→ equality contribution 규칙 유지
→ `054ef46f80c7`
INT_MAX → INT_MAX + 1
+ full_count unchanged
```

- valid execution scenario: §12 완료 기록의 대응 근거에 정리했습니다.
- former overflow expression: §12 완료 기록의 대응 근거에 정리했습니다.
- widened field와 관련 call sites: §12 완료 기록의 대응 근거에 정리했습니다.
- equality check: §12 완료 기록의 대응 근거에 정리했습니다.
- test seed state: §12 완료 기록의 대응 근거에 정리했습니다.
- stubbed sleep sequence: §12 완료 기록의 대응 근거에 정리했습니다.
- two final assertions: §12 완료 기록의 대응 근거에 정리했습니다.
- 여전히 남는 numeric/non-progress 한계: §12 완료 기록의 대응 근거에 정리했습니다.

## 8. Ownership / state / responsibility 변화

| 시점 | Fork ownership | Meal state producer | Global completion responsibility | Operation commit 기준 | 학습자 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| `b68f40819af4` | worker가 두 shared mutex를 일시 보유 | worker가 start/completion state 갱신 | monitor가 후속 전역 정책을 관찰 | eating wait 뒤 counter 증가 | §12 완료 기록의 대응 근거 참조 |
| `c8531c91f0fb` | single worker는 동일 mutex를 한 번만 보유 | meal state 변경 없음 | monitor가 death 담당 | meal 시작 불가 | §12 완료 기록의 대응 근거 참조 |
| `fe0a2d15b29b` | acquisition 후 terminal이면 즉시 release | final meal worker가 `ended`까지 publish | final quota transition은 worker critical section | wait interruption 구분은 아직 없음 | §12 완료 기록의 대응 근거 참조 |
| `53e591effb4a` | 모든 aborted eating exit에서 release | completed interval + active state일 때만 mutation | 기존 completion model 유지 | explicit commit boundary | §12 완료 기록의 대응 근거 참조 |
| `4c224ae86f2b` | 변화 없음 | wider internal counter | equality contribution 유지 | numeric state defined range 확장 | §12 완료 기록의 대응 근거 참조 |

## 9. Thread 최종 상태

### Source-confirmed 최종 상태

- multi-worker routine은 parity-dependent fork order로 uniform all-left circular wait 구조를 깨뜨립니다.
- one-philosopher path는 동일 mutex를 재잠금하지 않고 하나의 fork만 보유한 채 monitor death를 기다립니다.
- final meal completion은 locked worker path에서 global `ended`까지 publish됩니다.
- meal은 full eating interval과 synchronized active-state check를 통과한 경우에만 local/global progress로 commit됩니다.
- internal `meals`는 `int64_t`이며 public `INT_MAX` target 이후에도 defined progress를 유지하고 threshold contribution을 반복하지 않습니다.
- 이 Thread는 scheduler fairness 또는 starvation freedom을 보장하지 않습니다.

### 학습자가 작성할 최종 설명

- fork lock graph: §12 완료 기록의 대응 근거에 정리했습니다.
- one-philosopher execution: §12 완료 기록의 대응 근거에 정리했습니다.
- meal-start state: §12 완료 기록의 대응 근거에 정리했습니다.
- meal-completion transaction: §12 완료 기록의 대응 근거에 정리했습니다.
- global quota transition: §12 완료 기록의 대응 근거에 정리했습니다.
- interruption abort: §12 완료 기록의 대응 근거에 정리했습니다.
- fork cleanup: §12 완료 기록의 대응 근거에 정리했습니다.
- public target vs internal counter: §12 완료 기록의 대응 근거에 정리했습니다.
- guarantees: §12 완료 기록의 대응 근거에 정리했습니다.
- non-guarantees: §12 완료 기록의 대응 근거에 정리했습니다.

## 10. 최종 architecture 또는 execution flow 정리

```text
worker routine
    ↓ terminal 확인
    ↓ parity별 fork 1 획득 + log
    ↓ fork 2 획득 + log
    ↓ terminal 재확인
        ├─ ended → 두 fork release → stop
        └─ active
             ↓ last_meal_ms commit + is eating
             ↓ interruptible full-duration wait
                 ├─ interrupted → 두 fork release → no meal progress
                 └─ deadline reached
                      ↓ state_mutex
                      ↓ ended 재확인
                          ├─ ended → no progress
                          └─ active
                               ↓ meals increment
                               ↓ equality에서 full_count 1회 contribution
                               ↓ all full이면 ended publish
             ↓ 두 fork release
             ↓ terminal이면 stop
             ↓ sleeping
             ↓ thinking
             ↓ repeat

N == 1:
one fork lock → one fork log → no meal → wait/release → monitor death
```

- 실제 helper 분해: §12 완료 기록의 대응 근거에 정리했습니다.
- 각 lock acquisition/release: §12 완료 기록의 대응 근거에 정리했습니다.
- `last_meal_ms` mutation: §12 완료 기록의 대응 근거에 정리했습니다.
- sleep status: §12 완료 기록의 대응 근거에 정리했습니다.
- meal commit function: §12 완료 기록의 대응 근거에 정리했습니다.
- `full_count` equality: §12 완료 기록의 대응 근거에 정리했습니다.
- global `ended` publication: §12 완료 기록의 대응 근거에 정리했습니다.
- loop stop condition: §12 완료 기록의 대응 근거에 정리했습니다.
- `meals` type과 increment: §12 완료 기록의 대응 근거에 정리했습니다.
- single path symbol: §12 완료 기록의 대응 근거에 정리했습니다.

## 11. 학습 완료 자가 점검

- [x] `b68f40819af4`의 odd/even lock order와 state transition을 실제 code로 그렸습니다.
- [x] parity order와 initial delay의 보장 범위를 구분했습니다.
- [x] `c8531c91f0fb`의 pointer aliasing, one-lock path, monitor authority를 설명했습니다.
- [x] `fe0a2d15b29b`의 final meal critical section과 acquisition/post-meal terminal check를 설명했습니다.
- [x] 같은 commit에 interrupted-meal 결함이 남아 있음을 실제 call path로 확인했습니다.
- [x] `53e591effb4a`의 sleep status, mutation 전 recheck, fork cleanup을 transaction으로 설명했습니다.
- [x] `73b5551a76f4`의 direct invocation과 counter-zero assertions를 설명했습니다.
- [x] `4c224ae86f2b`의 public/internal range 분리를 valid scenario로 설명했습니다.
- [x] `054ef46f80c7`의 `INT_MAX + 1`과 unchanged `full_count`를 설명했습니다.
- [x] meal-start log를 completed quota progress로 취급하지 않았습니다.
- [x] deadlock avoidance를 fairness 또는 starvation freedom으로 과장하지 않았습니다.

## 12. 저장소 기반 완료 기록

### 12.1 검토 범위와 실행 상태

- 이 Thread의 7개 SHA는 모두 `c/philo` HEAD의 조상으로 확인했습니다.
- 각 routine, time helper, header, deterministic test는 해당 SHA의 파일을 기준으로 확인했습니다.
- 로컬 checkout 제한으로 production test binary는 실행하지 않았습니다. 아래 test 설명은 실제 injection과 assertion source를 분석한 결과입니다.

### 12.2 `b68f40819af4` — 최초 worker routine

#### worker execution order

`src/routine.c::philo_routine`은 terminal을 관찰하며 `eat_once → sleeping → thinking`을 반복합니다. `eat_once`는 두 fork를 잡은 뒤 meal start state를 publish하고 eating interval을 기다린 다음 meal count를 갱신하고 fork를 놓습니다.

#### parity-dependent fork order

| philosopher id | 첫 번째 fork | 두 번째 fork | 목적 |
| --- | --- | --- | --- |
| odd | `left_fork` | `right_fork` | 모든 worker가 left-first가 되는 uniform cycle을 끊습니다. |
| even | `right_fork` | `left_fork` | 적어도 인접 edge에서 반대 방향으로 acquisition합니다. |

각 successful lock 직후 `has taken a fork`를 기록합니다. even worker가 routine 시작 시 1 ms 대기하는 것은 initial contention을 낮추는 heuristic입니다. correctness는 parity order에 기대며 이 delay는 fairness, starvation freedom, 고정 schedule을 보장하지 않습니다.

#### meal state

- `record_meal_start`: `state_mutex` 아래 `last_meal_ms = philo_now_ms()`를 저장합니다.
- eating log: meal attempt 시작을 외부에 나타냅니다.
- `record_meal_done`: `state_mutex` 아래 `meals++`를 수행합니다.
- `meals == must_eat`인 최초 threshold equality에서만 `full_count++`를 수행합니다.

초기 구현은 `philo_sleep_ms`의 completion/interruption 결과를 받지 않습니다. terminal 때문에 eating wait가 일찍 끝나도 이어서 `record_meal_done`이 호출될 수 있습니다. 또한 `N == 1`에서 두 fork pointer가 같은 객체라는 edge를 구분하지 않습니다.

#### 최초 구현의 자원 경로

```text
terminal check
→ parity 순서로 fork 1 lock/log
→ fork 2 lock/log
→ last_meal_ms publish
→ is eating
→ wait
→ meals/full_count update
→ left/right unlock
→ is sleeping → wait
→ is thinking
```

normal path에서 fork를 놓지만, operation이 중간에 abort되는 명시적 transaction contract는 아직 없습니다.

### 12.3 `c8531c91f0fb` — one-philosopher aliasing fix

initializer ring mapping은 `N == 1`일 때 다음 결과를 만듭니다.

```text
left_fork  = &forks[0]
right_fork = &forks[(0 + 1) % 1] = &forks[0]
```

기존 two-lock path는 같은 non-recursive mutex를 한 thread가 연속 두 번 lock해 self-deadlock합니다. fix는 `wait_single_philo` 전용 경로를 추가합니다.

```text
left_fork 한 번 lock
→ has taken a fork 한 줄
→ time_to_die + 1 동안 terminal-aware wait
→ left_fork 한 번 unlock
→ worker return
```

이 path는 `last_meal_ms`, `meals`, `full_count`, `is eating`을 변경하지 않습니다. 실제 fork가 하나뿐이라는 constraint를 유지하며 가짜 두 번째 fork를 만들지 않습니다. death 판정과 terminal log는 계속 main-thread monitor가 담당합니다. wait가 terminal로 일찍 끝나도 unlock 뒤 return하므로 fork ownership이 남지 않습니다.

### 12.4 `fe0a2d15b29b` — final quota와 global completion의 같은 transaction

#### 이전 gap

최초 routine에서는 worker가 target meal을 기록한 뒤 monitor가 `full_count == number`를 polling해 나중에 `ended`를 publish할 수 있었습니다. 이 시간 동안 다른 worker가 새 meal을 시작하거나 final completion 뒤 sleeping/thinking log로 진행할 수 있습니다.

#### 수정된 state transaction

`record_meal_done`은 `state_mutex` hold 안에서 다음을 연속 수행합니다.

1. `philo->meals++`
2. `meals == must_eat`이면 `full_count++`
3. `full_count >= number`이면 `ended = 1`

final required meal과 global terminal publication 사이에 별도 monitor polling gap이 없습니다. equality check를 유지하므로 target을 초과한 같은 philosopher가 `full_count`에 다시 기여하지 않습니다.

#### two rechecks

- 두 fork 획득 직후 `philo_has_ended`를 다시 확인합니다. fork를 기다리는 동안 다른 worker가 terminal을 commit했으면 두 fork를 모두 release하고 meal을 시작하지 않습니다.
- `eat_once` 반환 뒤 routine은 terminal을 확인하고, final completion이면 sleeping/thinking으로 진행하지 않습니다.

이 commit이 닫은 것은 final quota publication과 post-completion work gap입니다. `philo_sleep_ms`가 아직 completion status를 반환하지 않으므로 interrupted eating을 count하는 결함은 남아 있습니다.

### 12.5 `53e591effb4a` — eating attempt와 committed meal 분리

#### sleep operation contract

`src/time.c::philo_sleep_ms`는 `int` status를 반환합니다.

- `now >= deadline`: `PHILO_OK`
- `ended` 관찰: `PHILO_ERR`

따라서 caller는 configured interval이 실제로 끝났는지 terminal interruption으로 중단됐는지 구분합니다.

#### `eat_once` transaction

```text
lock_forks
→ terminal recheck
    ├─ terminal: unlock_forks + PHILO_ERR
    └─ active
         → record_meal_start
         → is eating
         → philo_sleep_ms(time_to_eat)
             ├─ PHILO_ERR: unlock_forks + no counter mutation
             └─ PHILO_OK
                  → record_meal_done
                      ├─ ended recheck 실패: no mutation
                      └─ active: meals/full_count/ended commit
                  → unlock_forks
```

`record_meal_done`은 `state_mutex`를 획득한 뒤 mutation 전에 `table->ended`를 다시 확인합니다. 이유는 sleep이 deadline에 도달해 `PHILO_OK`를 반환한 직후, counter lock을 얻기 전에 다른 thread가 terminal을 commit할 수 있기 때문입니다. sleep result만으로는 commit 권한이 충분하지 않습니다.

모든 logical abort path에서 `unlock_forks`를 호출합니다. 즉 meal accounting 실패와 fork cleanup은 독립된 invariant로 함께 유지됩니다.

#### commit 조건

한 meal이 count되려면 두 조건을 모두 만족해야 합니다.

1. configured eating interval이 deadline까지 완료됐습니다.
2. `state_mutex` 아래 counter mutation 직전 simulation이 active입니다.

`is eating` log, 두 fork 보유, `last_meal_ms` 갱신은 operation start를 나타낼 뿐 committed meal progress는 아닙니다.

### 12.6 `73b5551a76f4` — interrupted-meal regression

`tests/interrupted_meal.c`는 routine object가 호출하는 `philo_sleep_ms`를 test stub으로 바꿉니다.

- table은 barrier가 이미 release된 상태로 seed됩니다.
- `meals = 0`, `full_count = 0`입니다.
- fork mutex와 production locking path는 그대로 사용합니다.
- sleep stub은 `state_mutex` 아래 `ended = 1`을 publish하고 `PHILO_ERR`를 반환합니다.
- worker routine을 직접 호출해 target path만 통과시킵니다.

assertion은 worker return 뒤 `meals == 0`, `full_count == 0`입니다. test가 fork unlock을 별도 trylock으로 직접 검증하는지 여부와 관계없이 production abort path가 `unlock_forks`를 호출하는 것은 source에서 확인됩니다. 이 test의 강점은 scheduler timing에 기대지 않고 eating wait의 interruption branch를 직접 만드는 것입니다. full executable의 monitor/barrier/join integration은 증명하지 않습니다.

### 12.7 `4c224ae86f2b` — public target과 internal accumulation의 range 분리

#### valid overflow scenario

`must_eat`은 public input으로 `INT_MAX`까지 허용됩니다. 한 philosopher가 `INT_MAX`에 먼저 도달해 `full_count`에 한 번 기여했더라도 다른 philosopher가 아직 target에 도달하지 않았다면 simulation은 끝나지 않습니다. 먼저 도달한 philosopher가 한 번 더 먹으면 internal state는 `INT_MAX + 1`이어야 합니다.

기존 `int meals`에서 이 increment는 signed overflow undefined behavior가 될 수 있습니다. `state_mutex`는 concurrent access를 serialize하지만 numeric overflow를 정의된 연산으로 바꾸지 않습니다.

#### 변경

`include/philo.h`에서 `t_philo.meals`만 `int64_t`로 넓힙니다.

- `t_config.must_eat`은 계속 `int`입니다.
- public parser bound도 `INT_MAX`입니다.
- increment는 `int64_t` storage에서 수행됩니다.
- comparison `meals == must_eat`는 target 도달 시 한 번만 true입니다.
- target 초과 후에는 equality가 false이므로 duplicate `full_count` contribution이 없습니다.

이 변경은 practical internal range를 넓히지만 무한 실행에서 `int64_t`가 절대 overflow하지 않는다고 보장하지 않습니다.

### 12.8 `054ef46f80c7` — former boundary regression

`tests/meal_counter_range.c`는 실제로 도달 가능한 target-after-completion 상태를 직접 seed합니다.

| state | 초기값 |
| --- | --- |
| philosopher count | 2 |
| target philosopher `meals` | `INT_MAX` |
| `must_eat` | `INT_MAX` |
| global `full_count` | 1, 즉 이 philosopher의 기여가 이미 반영됨 |
| simulation | 다른 philosopher가 아직 full이 아니므로 active |

substituted sleep은 첫 eating interval을 `PHILO_OK`로 완료시키고, 다음 sleep call에서 terminal을 만들어 routine을 끝냅니다. production `record_meal_done`이 한 번 실행된 뒤 기대값은 다음입니다.

- `meals == (int64_t)INT_MAX + 1`
- `full_count == 1`
- configured sleep-call sequence가 예상 횟수대로 진행됨

첫 assertion은 wider accumulation을, 두 번째 assertion은 target 초과 후 duplicate contribution 부재를 검사합니다. 단순히 field type만 바꾸고 equality logic을 손상한 구현도 실패합니다.

### 12.9 Invariant evolution 완성

| Invariant | 도입·문제 | 수정 | regression evidence | 최종 해석 |
| --- | --- | --- | --- | --- |
| multi-worker가 uniform all-left circular wait를 만들지 않음 | `b68f40819af4` parity order | 이후 유지 | 전용 deterministic order test 없음 | deadlock의 한 필요 조건을 깨지만 fairness 증명은 아님 |
| `N == 1`은 같은 mutex를 재잠금하지 않음 | 최초 routine의 distinct-pointer 가정 | `c8531c91f0fb` one-lock path | Thread 내 전용 test 없음 | 실제 하나의 fork constraint를 보존 |
| final quota와 global ended가 같은 state transaction | monitor polling gap | `fe0a2d15b29b` worker completion section | source path inspection | post-completion new work 억제 |
| terminal 이후 fork 보유만으로 새 meal을 시작하지 않음 | fork wait 중 terminal 가능 | acquisition 후 recheck | routine path inspection | fork ownership과 operation authorization 분리 |
| meal은 completed interval + active commit point에서만 count | interrupted wait도 count 가능 | `53e591effb4a` status + locked recheck | `73b5551a76f4` | attempt와 committed progress 분리 |
| aborted meal은 fork를 남기지 않음 | explicit abort path 부족 | 모든 error branch `unlock_forks` | interrupted test의 production path | logical rollback과 resource release 결합 |
| internal counter는 public target 이후 defined range 유지 | valid `INT_MAX + 1`에서 int overflow | `int64_t meals` | `054ef46f80c7` | public contract와 runtime accumulation 분리 |
| `full_count` contribution은 philosopher당 한 번 | threshold equality로 도입 | fixes에서도 equality 유지 | boundary test의 unchanged count | target 초과 meal은 duplicate global progress 아님 |

### 12.10 최종 worker flow

```text
wait_for_start
→ N == 1 ?
    ├─ yes: one fork lock/log → no meal → wait/unlock → monitor death
    └─ no
         ↓ optional even-id 1 ms stagger
         ↓ terminal check
         ↓ parity order로 fork 1 lock/log
         ↓ fork 2 lock/log
         ↓ terminal recheck
             ├─ ended: both unlock → stop
             └─ active
                  ↓ state_mutex: last_meal_ms = now
                  ↓ is eating
                  ↓ full-duration interruptible wait
                      ├─ interrupted: both unlock → no progress
                      └─ deadline complete
                           ↓ state_mutex
                           ↓ ended recheck
                               ├─ ended: no progress
                               └─ active
                                    ↓ int64_t meals++
                                    ↓ meals == must_eat이면 full_count++
                                    ↓ full_count == number이면 ended = 1
                  ↓ both forks unlock
                  ↓ ended면 stop
                  ↓ is sleeping / wait
                  ↓ is thinking
                  ↓ repeat
```

### 12.11 최종 보장과 비보장

보장하는 범위:

- multi-worker acquisition order는 모든 worker가 같은 left-first cycle을 만드는 구조를 피합니다.
- one-philosopher path는 동일 mutex를 두 번 잠그지 않습니다.
- fork 대기 중 terminal이 확정되면 새 meal을 시작하지 않습니다.
- full eating interval과 active state recheck를 통과한 경우만 counter에 반영합니다.
- interrupted/aborted meal은 local `meals`와 global `full_count`를 변경하지 않고 fork를 해제합니다.
- `meals`는 `int64_t`여서 valid `INT_MAX + 1` state를 표현하고, `full_count`는 equality에서 한 번만 증가합니다.

보장하지 않는 범위:

- parity order와 initial stagger는 scheduler fairness나 starvation freedom을 보장하지 않습니다.
- `is eating` line은 completed meal 증거가 아닙니다.
- `int64_t`는 무한 accumulation을 보장하지 않습니다.
- deterministic unit tests는 full executable의 모든 interleaving을 포괄하지 않습니다.
