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

- [ ] 최초 routine의 fork lock graph와 worker state transition을 실제 code order로 설명할 수 있습니다.
- [ ] parity order가 circular wait를 깨는 범위와 fairness non-guarantee를 구분할 수 있습니다.
- [ ] `N == 1` pointer aliasing과 dedicated path를 before/after로 제시할 수 있습니다.
- [ ] final meal commit, `full_count`, global `ended` publication의 critical section을 설명할 수 있습니다.
- [ ] fork acquisition 후 terminal recheck와 post-meal terminal recheck의 역할을 구분할 수 있습니다.
- [ ] interrupted eating이 counter를 변경하지 않는 operation transaction을 그릴 수 있습니다.
- [ ] wait success 뒤 mutation 전 terminal race를 locked recheck로 설명할 수 있습니다.
- [ ] 모든 logical abort에서 두 fork가 release되는지 path별로 확인했습니다.
- [ ] public target과 internal accumulated counter의 range를 구분할 수 있습니다.
- [ ] `INT_MAX + 1` test가 numeric width와 duplicate contribution을 동시에 확인하는 이유를 설명할 수 있습니다.

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
| 문제 | 각 worker가 shared fork 두 개를 사용해 eat-sleep-think state를 진행하고 monitor가 신뢰할 meal state를 publish해야 합니다. |  |
| deadlock 위험 | 모든 philosopher가 left fork를 먼저 잡으면 ring 전체가 one-fork hold 상태로 circular wait할 수 있습니다. |  |
| 핵심 결정 | identifier parity에 따라 fork acquisition order를 반대로 배치합니다. |  |
| meal state 결정 | `last_meal_ms`는 eating 시작 시 갱신하고, meal counter와 `full_count`는 shared state lock 아래 갱신합니다. |  |
| 남은 edge | `N == 1`에서 두 fork pointer가 같은 mutex를 가리킵니다. |  |
| 남은 transaction 결함 | interruptible wait가 끝까지 완료되었는지 구분하지 못해 aborted eating도 count될 수 있습니다. |  |

#### 해당 SHA에서 직접 확인할 코드
- [ ] `git show --name-status b68f40819af4`로 worker routine이 추가된 실제 파일과 public entry symbol을 확인합니다.
- [ ] routine의 outer loop와 terminal check 위치를 순서대로 기록합니다.
- [ ] odd/even identifier별 첫 번째·두 번째 fork pointer와 실제 `pthread_mutex_lock` 순서를 표로 만듭니다.
- [ ] fork acquisition 후 각 fork status log가 어느 lock 성공 뒤에 호출되는지 확인합니다.
- [ ] `last_meal_ms`가 eating log, eating wait, counter increment 중 어느 시점에 갱신되는지 확인합니다.
- [ ] meal start와 meal completion state mutation이 `state_mutex` 아래에서 이뤄지는지 확인합니다.
- [ ] `full_count`가 philosopher의 `meals == must_eat` 조건에서만 증가하는지 확인합니다.
- [ ] 두 fork의 release 순서와 모든 early return/failure branch에서의 release 여부를 확인합니다.
- [ ] even worker initial delay가 어느 identifier 조건에서, barrier 또는 fork lock 전후 중 어디에 위치하는지 확인합니다.
- [ ] `left_fork == right_fork`인 `N == 1`에서 실행되는 lock sequence를 실제 pointer mapping과 결합해 재구성합니다.
- [ ] eating wait의 반환 type과 호출자가 그 결과를 사용하는지 확인하여 interrupted-meal 결함을 증명합니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol |  |
| 최소 코드 구간 |  |
| caller → callee |  |
| state 또는 ownership 변화 |  |
| failure/cleanup 경로 |  |
| 직전 상태와의 차이 |  |

#### Worker state transition 기록

| 단계 | 보유 fork | `state_mutex` mutation | log | wait | 실패/terminal 시 cleanup |
| --- | --- | --- | --- | --- | --- |
| routine 진입 |  |  |  | optional initial delay |  |
| 첫 fork 획득 |  |  |  |  |  |
| 두 번째 fork 획득 |  |  |  |  |  |
| meal start commit |  | `last_meal_ms` |  |  |  |
| eating interval |  |  | `is eating` |  |  |
| meal completion |  | `meals`, `full_count` |  |  |  |
| sleeping | none |  | `is sleeping` |  |  |
| thinking | none |  | `is thinking` |  |  |

#### Fork order 검증

| Philosopher parity | First fork | Second fork | 제거하는 uniform wait edge | fairness 보장 여부 |
| --- | --- | --- | --- | --- |
| odd |  |  |  | 보장하지 않음 |
| even |  |  |  | 보장하지 않음 |


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
- [ ] parity order가 classic all-left circular wait를 끊는 lock graph를 실제 fork indices로 그립니다.
- [ ] 1-millisecond delay가 correctness invariant가 아닌 이유를 설명합니다.
- [ ] meal start와 meal completion이 다른 state transition인 이유를 후속 commits와 연결합니다.
- [ ] 이 commit의 worker responsibility와 monitor가 나중에 맡는 global policy를 구분합니다.

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
| 기존 가정 | 두 fork pointer는 서로 다른 mutex이므로 normal two-lock path를 사용할 수 있습니다. |  |
| 실제 failure | `N == 1`에서 ring aliasing으로 두 pointer가 같아 self-deadlock이 결정적으로 발생합니다. |  |
| root cause | topology가 만드는 pointer identity edge를 routine이 구분하지 않았습니다. |  |
| 수정 결정 | single worker는 fork 하나만 lock·log·wait·unlock하고 meal을 시작하지 않습니다. |  |
| 유지되는 책임 | worker는 자원 제약을 모델링하고 monitor가 starvation death를 확정합니다. |  |

#### 해당 SHA에서 직접 확인할 코드
- [ ] `b68f40819af4` 대비 single-philosopher branch의 진입 조건과 호출 위치를 확인합니다.
- [ ] `left_fork`와 `right_fork`의 실제 pointer equality가 `N == 1`에서 성립하는지 initializer mapping으로 검산합니다.
- [ ] single path가 mutex를 정확히 한 번 lock하고 한 번 unlock하는지 확인합니다.
- [ ] fork acquisition log가 몇 번 발생하는지 확인합니다.
- [ ] wait duration이 `time_to_die`보다 어떻게 길게 계산되는지 실제 식과 type으로 확인합니다.
- [ ] terminal-aware wait가 조기 종료될 때 fork가 release되는지 확인합니다.
- [ ] single path가 meal-start state, `is eating`, meal counter를 변경하지 않는지 확인합니다.
- [ ] worker return 후 monitor가 death를 발견할 수 있는 shared state와 execution order를 확인합니다.
- [ ] multi-worker acquisition path가 변경되지 않았는지 diff로 확인합니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol |  |
| 최소 코드 구간 |  |
| caller → callee |  |
| state 또는 ownership 변화 |  |
| failure/cleanup 경로 |  |
| 직전 상태와의 차이 |  |

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

- 실제 branch symbol:
- pointer equality 근거:
- wait expression:
- unlock 보장:
- monitor observation path:


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
- [ ] general ring topology가 valid edge input에서 aliasing을 만드는 과정을 주소로 설명합니다.
- [ ] 가짜 두 번째 fork를 만들지 않고 실제 resource constraint를 모델링한 이유를 설명합니다.
- [ ] single worker와 monitor 사이의 responsibility split을 execution trace로 제시합니다.

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
| 기존 상태 | monitor polling이 global completion을 나중에 발견하며, worker loop가 target 도달 뒤에도 다음 state로 진행할 수 있습니다. |  |
| 실제 위험 | last required meal과 `ended` publication 사이의 delay 동안 다른 worker가 새 meal이나 post-completion log를 시작할 수 있습니다. |  |
| 수정 decision | final meal commit을 기록하는 worker가 lock 안에서 global completion까지 publish합니다. |  |
| fork-boundary decision | fork ownership만으로 terminal 이후 새 meal을 시작할 권한이 생기지 않으므로 acquisition 후 state를 재확인합니다. |  |
| 남은 root cause | eating wait가 deadline completion과 terminal interruption을 구분하지 않습니다. |  |

#### 해당 SHA에서 직접 확인할 코드
- [ ] `c8531c91f0fb` 대비 `record_meal_done`의 mutation 순서와 return/side effect 변화를 확인합니다.
- [ ] per-philosopher `meals` 증가, equality check, `full_count` 증가, all-full check, `ended` publication이 하나의 `state_mutex` critical section에 있는지 확인합니다.
- [ ] `full_count`가 threshold equality에서만 증가하고 target 초과 시 재기여하지 않는지 확인합니다.
- [ ] `eat_once`의 return status가 routine loop에 어떻게 사용되는지 확인합니다.
- [ ] 두 fork 획득 직후 terminal recheck branch가 두 mutex를 모두 release하는지 확인합니다.
- [ ] completed meal 직후 routine이 terminal을 확인하고 sleeping/thinking으로 진행하지 않는지 확인합니다.
- [ ] monitor의 meal-completion 역할이 이 SHA에서 어떻게 줄거나 유지되는지 실제 코드로 확인합니다.
- [ ] `philo_sleep_ms` return type과 eating call site를 확인하여 interrupted wait 후에도 `record_meal_done`이 호출되는 경로를 찾습니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol |  |
| 최소 코드 구간 |  |
| caller → callee |  |
| state 또는 ownership 변화 |  |
| failure/cleanup 경로 |  |
| 직전 상태와의 차이 |  |

#### Completion transaction

| mutation 또는 check | lock 경계 | 조건 | 다음 상태 | 실제 코드 |
| --- | --- | --- | --- | --- |
| `meals` increment |  |  |  |  |
| threshold equality |  |  |  |  |
| `full_count` increment |  |  |  |  |
| all philosophers full |  |  |  |  |
| `ended` publication |  |  | routine stop |  |
| acquisition 후 terminal recheck |  |  | release without meal |  |
| meal 후 terminal recheck |  |  | suppress sleep/think |  |


#### 보장 범위

이 commit이 source 기준으로 보장하는 것:
- global meal completion이 final required meal의 locked completion path에서 즉시 publish됩니다.
- terminal state가 fork 대기 중 확정된 worker는 acquisition 후 새 meal을 시작하지 않습니다.
- global completion 뒤 sleeping/thinking state로 불필요하게 진행하는 것을 막습니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- eating interval이 끝까지 완료되지 않았는데도 meal counter가 증가하지 않는 것은 아직 보장하지 않습니다.
- fairness 또는 모든 worker의 equal progress를 보장하지 않습니다.

#### 학습자 결론
- [ ] fork 두 개를 가졌다는 사실과 새 meal을 commit할 권한을 구분합니다.
- [ ] final meal의 local mutation이 global termination으로 연결되는 critical section을 설명합니다.
- [ ] 이 fix가 닫은 polling gap과 아직 남긴 interrupted-meal gap을 구분합니다.

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
| 기존 가정 | `is eating` log와 wait 호출 이후에는 meal을 완료한 것으로 count할 수 있습니다. |  |
| 실제 failure/위험 | terminal interrupt로 eating interval이 짧아져도 `meals`와 `full_count`가 증가할 수 있습니다. |  |
| root cause | wait API가 deadline completion과 terminal interruption을 구분하지 않고, counter mutation 직전 state revalidation도 부족합니다. |  |
| 수정 decision | sleep status를 eating operation contract로 사용하고 interruption은 abort로 처리합니다. |  |
| race 보완 | deadline 도달 후 mutation 전에 terminal이 commit되는 window를 locked `ended` recheck로 닫습니다. |  |
| resource invariant | 논리 operation이 commit되지 않아도 acquired fork 둘은 모든 exit에서 release합니다. |  |
| regression 연결 | `73b5551a76f4`가 interrupted sleep을 주입해 local/global counter가 0으로 유지되는지 검증합니다. |  |

#### 해당 SHA에서 직접 확인할 코드
- [ ] `fe0a2d15b29b` 대비 `philo_sleep_ms`의 반환 type과 return condition을 확인합니다.
- [ ] deadline reached와 terminal observed가 각각 어떤 status로 반환되는지 확인합니다.
- [ ] `eat_once`가 eating sleep result를 검사하고 실패 시 어떤 release helper를 호출하는지 확인합니다.
- [ ] interrupted branch에서 `record_meal_done`이 호출되지 않는지 확인합니다.
- [ ] `record_meal_done`이 `state_mutex`를 잡은 뒤 mutation 직전 `ended`를 재확인하는 순서를 확인합니다.
- [ ] sleep success 후 lock 획득 전 terminal이 바뀌는 interleaving을 코드 순서로 작성합니다.
- [ ] 해당 interleaving에서 recheck가 false commit을 막는지 확인합니다.
- [ ] 모든 abort/return path에서 first/second fork ownership이 정확히 한 번 release되는지 표로 검증합니다.
- [ ] sleep API 변경이 sleeping phase나 single-philosopher path의 call site에 어떻게 반영되는지 확인합니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol |  |
| 최소 코드 구간 |  |
| caller → callee |  |
| state 또는 ownership 변화 |  |
| failure/cleanup 경로 |  |
| 직전 상태와의 차이 |  |

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

- 각 단계의 actual symbol:
- operation start와 commit의 구분:
- terminal interruption status:
- mutation 전 recheck:
- fork release proof:


#### 보장 범위

이 commit이 source 기준으로 보장하는 것:
- configured eating interval을 완료하고 synchronized commit point에서 simulation이 active인 meal만 count합니다.
- interrupted meal은 per-philosopher `meals`와 global `full_count`를 변경하지 않습니다.
- 모든 logical abort exit가 acquired fork를 release합니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- meal-start log가 곧 meal completion을 의미하지 않습니다.
- 이 변경은 scheduler fairness나 starvation freedom을 보장하지 않습니다.

#### 학습자 결론
- [ ] operation start, wait completion, state commit을 세 단계로 분리해 설명합니다.
- [ ] sleep success 직후 terminal publication race를 실제 lock timing으로 설명합니다.
- [ ] resource cleanup invariant와 logical meal accounting invariant가 함께 유지되는 이유를 설명합니다.

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
| 대상 production invariant |  |
| 주입하는 interrupted operation |  |
| stub이 publish하는 state와 return status |  |
| direct worker invocation 조건 |  |
| 실제로 통과하는 production fork/state path |  |
| 초기 counter 상태 |  |
| expected local counter |  |
| expected global counter |  |
| resource release 관찰 방법 |  |
| 이 테스트가 증명하는 것 |  |
| 이 테스트가 증명하지 않는 것 |  |
| deterministic regression 분류 |  |
| 후속 회귀 방지 대상 |  |

#### 해당 SHA에서 직접 확인할 코드
- [ ] routine object에서 `philo_sleep_ms`가 test stub으로 치환되는 build 방식을 확인합니다.
- [ ] stub이 production `state_mutex` 경계를 사용해 `ended`를 publish하는지 실제 코드를 확인합니다.
- [ ] stub return status가 `PHILO_ERR`인지 확인합니다.
- [ ] directly invoked worker가 barrier를 기다리지 않도록 table/philo state를 어떻게 seed하는지 확인합니다.
- [ ] fork mutex는 real production locking을 사용하는지 확인합니다.
- [ ] initial `meals == 0`, `full_count == 0` 설정을 확인합니다.
- [ ] worker return 후 두 counter가 0이라는 assertion을 확인합니다.
- [ ] fork가 잠긴 채 남지 않았음을 test가 직접 또는 간접으로 어떻게 확인하는지 구분합니다.
- [ ] shell-level output count로는 같은 semantic bug를 결정적으로 찾기 어려운 이유를 기록합니다.

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
- injected eating interruption에서 production routine이 local/global meal progress를 commit하지 않음을 결정적으로 검증합니다.
- scheduler variability 없이 `eat_once` transaction boundary를 직접 통과합니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- full executable의 모든 interleaving이나 monitor interaction을 검증하지 않습니다.
- 모든 sleep call site 또는 모든 terminal timing을 포괄하지 않습니다.

#### 학습자 결론
- [ ] direct invocation이 regression target을 좁히는 장점과 integration coverage를 줄이는 한계를 설명합니다.
- [ ] stubbed sleep 앞뒤의 production lock/state path를 구분합니다.
- [ ] 두 counter assertion이 meal transaction invariant를 어떻게 고정하는지 설명합니다.

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
| 기존 가정 | public target이 `INT_MAX`이므로 runtime accumulated counter도 `int`면 충분합니다. |  |
| 실제 failure/위험 | target 도달 후에도 다른 philosopher를 기다리며 추가 meal이 발생해 `INT_MAX + 1`이 valid path에서 필요할 수 있습니다. |  |
| root cause | bounded public input과 계속 증가할 수 있는 internal state를 같은 numeric range로 취급했습니다. |  |
| 수정 decision | internal `meals`만 `int64_t`로 넓히고 public `must_eat` contract는 유지합니다. |  |
| completion invariant | `full_count` contribution은 equality 시점 한 번만 발생하며 target 초과 후 재기여하지 않습니다. |  |
| regression 연결 | `054ef46f80c7`이 `INT_MAX`에서 한 meal을 더 완료해 `INT_MAX + 1`과 unchanged `full_count`를 검증합니다. |  |

#### 해당 SHA에서 직접 확인할 코드
- [ ] `73b5551a76f4` 대비 `meals` field의 type 변경과 관련 선언·format·comparison을 모두 찾습니다.
- [ ] public `must_eat` field/type 및 parser bound가 변경되지 않는지 확인합니다.
- [ ] counter increment expression이 wider type에서 수행되는지 확인합니다.
- [ ] `meals == must_eat` 비교에서 implicit conversion과 intended equality semantics를 확인합니다.
- [ ] target 초과 후 `full_count`가 다시 증가하지 않는 control flow를 확인합니다.
- [ ] counter를 읽는 monitor 또는 test code가 type 변경에 맞게 수정되는지 확인합니다.
- [ ] mutex가 numeric overflow 해결책이 아닌 이유를 해당 increment path와 C signed-overflow semantics로 설명하되 source 밖의 다른 numeric guarantee를 추가하지 않습니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol |  |
| 최소 코드 구간 |  |
| caller → callee |  |
| state 또는 ownership 변화 |  |
| failure/cleanup 경로 |  |
| 직전 상태와의 차이 |  |

#### Public contract와 internal state 분리

| 항목 | Public bound | Runtime accumulation | 해당 SHA type | mutation/compare 위치 |
| --- | --- | --- | --- | --- |
| `must_eat` | `INT_MAX` | fixed target |  |  |
| `meals` | 직접 입력 아님 | target 이후도 증가 가능 | `int64_t` |  |
| `full_count` contribution | philosopher당 한 번 | equality에서만 |  |  |


#### 보장 범위

이 commit이 source 기준으로 보장하는 것:
- valid `INT_MAX` target을 넘어서 한 번 이상 계속되는 internal meal accumulation이 즉시 signed `int` overflow를 일으키지 않습니다.
- public target bound와 threshold equality-based one-time contribution을 유지합니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- internal counter가 무한히 증가해도 절대 overflow하지 않는다고 보장하지 않습니다.
- public `must_eat` 범위를 `INT_MAX`보다 넓히지 않습니다.
- progress fairness를 보장하지 않습니다.

#### 학습자 결론
- [ ] public input range와 internal accumulated state range가 다른 이유를 concrete execution으로 설명합니다.
- [ ] mutex synchronization과 defined numeric range가 서로 다른 correctness 문제임을 설명합니다.
- [ ] widening과 one-time `full_count` contribution이 함께 유지되는 코드를 제시합니다.

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
| 대상 production invariant |  |
| former numeric boundary |  |
| seeded philosopher state |  |
| seeded global completion state |  |
| substituted sleep sequence |  |
| 실제로 통과하는 production meal-completion path |  |
| `INT_MAX + 1` assertion |  |
| unchanged `full_count` assertion |  |
| 이 테스트가 증명하는 것 |  |
| 이 테스트가 증명하지 않는 것 |  |
| deterministic boundary regression 분류 |  |
| 후속 회귀 방지 대상 |  |

#### 해당 SHA에서 직접 확인할 코드
- [ ] 두-philosopher table이 필요한 이유와 second philosopher state를 확인합니다.
- [ ] `must_eat == INT_MAX`, target philosopher `meals == INT_MAX` seed를 확인합니다.
- [ ] `full_count`가 이미 해당 philosopher의 threshold contribution을 포함하도록 어떤 값으로 설정되는지 확인합니다.
- [ ] sleep stub이 첫 eating wait를 success로, 후속 sleep을 termination으로 만드는 call sequence를 확인합니다.
- [ ] production `record_meal_done` 또는 equivalent path가 실제로 `INT_MAX + 1` increment를 수행하는지 확인합니다.
- [ ] assertion expression이 wider type에서 `INT_MAX + 1`을 계산하도록 작성되었는지 확인합니다.
- [ ] `full_count`가 증가하지 않는 assertion을 확인합니다.
- [ ] test가 duplicate contribution bug와 numeric overflow bug를 동시에 감지하는 이유를 설명합니다.

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
- former `int` boundary에서 한 번 더 meal을 완료했을 때 internal counter가 defined `INT_MAX + 1` 값을 갖는지 검증합니다.
- target 초과 후 같은 philosopher가 `full_count`에 두 번째로 기여하지 않는지 검증합니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- arbitrarily long execution의 모든 numeric boundary를 검증하지 않습니다.
- multi-thread schedule, fairness, monitor timing을 검증하지 않습니다.

#### 학습자 결론
- [ ] seeded state가 실제 valid execution의 어느 순간을 모델링하는지 설명합니다.
- [ ] numeric widening만 통과하고 threshold accounting이 깨진 구현도 이 test가 실패시키는 이유를 설명합니다.
- [ ] Thread 전체의 meal progress가 fork acquisition에서 committed, range-safe state로 발전한 과정을 요약합니다.

## 6. Invariant ledger

| Invariant | 최초 도입 또는 부족함 | 강화·복구 | regression evidence | 해당 SHA 코드 근거 | 최종 설명 |
| --- | --- | --- | --- | --- | --- |
| multi-worker fork order는 uniform all-left circular wait를 깨뜨림 | `b68f40819af4` | 이후 Thread commits는 이 order를 유지 | 이 Thread source에는 전용 order test commit 없음 |  |  |
| single philosopher는 같은 mutex를 재잠금하지 않음 | `b68f40819af4`에서 distinct-fork 가정 부족 | `c8531c91f0fb` | 이 Thread source에는 전용 deterministic test 없음 |  |  |
| final target 도달과 global completion publication이 같은 state transaction | 최초 routine/monitor polling으로 gap 존재 | `fe0a2d15b29b` | 직접 test commit은 이 Thread에 없음 |  |  |
| terminal 이후 새 meal 또는 post-completion sleep/think로 진행하지 않음 | 최초 routine에서 부족 | `fe0a2d15b29b` | 관련 code path 직접 확인 |  |  |
| meal은 full eating interval과 active commit point를 통과해야 count | `fe0a2d15b29b`까지 interrupted wait count 가능 | `53e591effb4a` | `73b5551a76f4` |  |  |
| 모든 aborted eating path는 acquired fork를 release | 최초 routine의 exit path에서 확인 시작 | `53e591effb4a`에서 logical abort와 결합 | `73b5551a76f4`의 production locking path |  |  |
| internal meal counter는 public target 이후에도 defined range 유지 | `int` counter로 valid overflow 위험 | `4c224ae86f2b` | `054ef46f80c7` |  |  |
| philosopher는 `full_count`에 threshold equality에서 한 번만 기여 | `b68f40819af4`에서 최초 규칙 | `fe0a2d15b29b`, `4c224ae86f2b`에서 유지 | `054ef46f80c7` |  |  |

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

- pointer alias를 만드는 initializer expression:
- self-deadlock이 발생하는 두 lock call:
- dedicated branch의 lock/log/wait/unlock 순서:
- meal state가 변경되지 않는 근거:
- monitor가 death authority를 유지하는 근거:
- 이 fix가 fairness를 보장하지 않는 이유:

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

- `fe0a2d15b29b`이 닫은 polling gap:
- 같은 commit에 남은 interrupted-meal root cause:
- `53e591effb4a`의 operation commit point:
- abort path의 fork release:
- test stub이 production path에 들어가는 지점:
- local/global counter assertions:
- 이 연결이 증명하지 않는 integration 범위:

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

- valid execution scenario:
- former overflow expression:
- widened field와 관련 call sites:
- equality check:
- test seed state:
- stubbed sleep sequence:
- two final assertions:
- 여전히 남는 numeric/non-progress 한계:

## 8. Ownership / state / responsibility 변화

| 시점 | Fork ownership | Meal state producer | Global completion responsibility | Operation commit 기준 | 학습자 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| `b68f40819af4` | worker가 두 shared mutex를 일시 보유 | worker가 start/completion state 갱신 | monitor가 후속 전역 정책을 관찰 | eating wait 뒤 counter 증가 |  |
| `c8531c91f0fb` | single worker는 동일 mutex를 한 번만 보유 | meal state 변경 없음 | monitor가 death 담당 | meal 시작 불가 |  |
| `fe0a2d15b29b` | acquisition 후 terminal이면 즉시 release | final meal worker가 `ended`까지 publish | final quota transition은 worker critical section | wait interruption 구분은 아직 없음 |  |
| `53e591effb4a` | 모든 aborted eating exit에서 release | completed interval + active state일 때만 mutation | 기존 completion model 유지 | explicit commit boundary |  |
| `4c224ae86f2b` | 변화 없음 | wider internal counter | equality contribution 유지 | numeric state defined range 확장 |  |

## 9. Thread 최종 상태

### Source-confirmed 최종 상태

- multi-worker routine은 parity-dependent fork order로 uniform all-left circular wait 구조를 깨뜨립니다.
- one-philosopher path는 동일 mutex를 재잠금하지 않고 하나의 fork만 보유한 채 monitor death를 기다립니다.
- final meal completion은 locked worker path에서 global `ended`까지 publish됩니다.
- meal은 full eating interval과 synchronized active-state check를 통과한 경우에만 local/global progress로 commit됩니다.
- internal `meals`는 `int64_t`이며 public `INT_MAX` target 이후에도 defined progress를 유지하고 threshold contribution을 반복하지 않습니다.
- 이 Thread는 scheduler fairness 또는 starvation freedom을 보장하지 않습니다.

### 학습자가 작성할 최종 설명

- fork lock graph:
- one-philosopher execution:
- meal-start state:
- meal-completion transaction:
- global quota transition:
- interruption abort:
- fork cleanup:
- public target vs internal counter:
- guarantees:
- non-guarantees:

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

- 실제 helper 분해:
- 각 lock acquisition/release:
- `last_meal_ms` mutation:
- sleep status:
- meal commit function:
- `full_count` equality:
- global `ended` publication:
- loop stop condition:
- `meals` type과 increment:
- single path symbol:

## 11. 학습 완료 자가 점검

- [ ] `b68f40819af4`의 odd/even lock order와 state transition을 실제 code로 그렸습니다.
- [ ] parity order와 initial delay의 보장 범위를 구분했습니다.
- [ ] `c8531c91f0fb`의 pointer aliasing, one-lock path, monitor authority를 설명했습니다.
- [ ] `fe0a2d15b29b`의 final meal critical section과 acquisition/post-meal terminal check를 설명했습니다.
- [ ] 같은 commit에 interrupted-meal 결함이 남아 있음을 실제 call path로 확인했습니다.
- [ ] `53e591effb4a`의 sleep status, mutation 전 recheck, fork cleanup을 transaction으로 설명했습니다.
- [ ] `73b5551a76f4`의 direct invocation과 counter-zero assertions를 설명했습니다.
- [ ] `4c224ae86f2b`의 public/internal range 분리를 valid scenario로 설명했습니다.
- [ ] `054ef46f80c7`의 `INT_MAX + 1`과 unchanged `full_count`를 설명했습니다.
- [ ] meal-start log를 completed quota progress로 취급하지 않았습니다.
- [ ] deadlock avoidance를 fairness 또는 starvation freedom으로 과장하지 않았습니다.
