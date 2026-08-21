# Thread: Serialized output to linearized terminal state

이 문서는 source에 정의된 네 번째 Development Thread를 그대로 따릅니다. commit 순서, SHA, importance, tags는 변경하지 않습니다. monitor와 logger의 final lock order를 이전 SHA에 소급하지 않고, observation과 commitment 사이의 race가 어느 commit에서 남고 어느 commit에서 닫히는지 실제 코드로 확인합니다.

## 1. Thread 목표

이 Thread의 목표는 단순한 output serialization이 왜 terminal correctness에 충분하지 않은지 확인하고, authoritative monitor의 candidate observation이 fresh revalidation, terminal-state publication, final death line과 하나의 linearized transaction으로 결합되는 과정을 복원하는 것입니다.

Source-confirmed significance는 다음과 같습니다.

- `state_mutex`와 `print_mutex`는 terminal access와 complete-line output boundary를 만들지만 최초 death path는 두 책임을 원자적으로 결합하지 못합니다.
- main-thread monitor는 worker가 publish한 meal state를 읽고 global death/completion policy를 소유합니다.
- 최초 monitor는 predicate를 관찰한 lock을 놓은 뒤 terminal state를 publish하여 completion gap과 stale-death gap을 남깁니다.
- final fix는 completion을 locked state transaction으로 만들고, death를 `print_mutex → state_mutex`에서 fresh time과 latest meal state로 재확인합니다.
- terminal publication과 output serialization이 같은 lock order에 들어가면서 one-death, no-post-terminal ordinary status invariant가 성립합니다.
- deterministic boundary test는 timing luck이 아니라 old unlock window에 직접 state change를 주입합니다.

### Source에 명시적으로 연결된 Critical Invariants

- `ended`, `full_count`, `meals`, `last_meal_ms`는 정의된 `state_mutex` 경계에서 관찰·변경됩니다.
- death candidate는 fresh time과 latest meal state로 terminal commit 직전에 다시 확인합니다.
- at most one death가 commit되며 terminal publication 뒤 ordinary status line은 시도되지 않습니다.
- `print_mutex`와 `state_mutex`의 common lock order는 terminal decision과 final output ordering을 결합합니다.

### Source에 명시적으로 연결된 Major Engineering Difficulties

- stale death candidate를 제거하면서 monitor의 global authority를 유지하는 문제
- terminal-state publication과 output을 linearize하여 `died` 뒤 ordinary line이 나오지 않게 하는 문제
- repeated run이 아니라 정확한 synchronization boundary에서 state를 바꾸는 deterministic test를 만드는 문제

## 2. 이 Thread를 이해하기 위한 핵심 질문

- `print_mutex`로 line interleaving을 막는 것과 terminal decision을 linearize하는 것은 왜 다른가?
- normal logger와 initial death logger는 각각 어떤 lock 순서를 사용하며 race window는 어디인가?
- worker가 publish하는 state와 monitor가 소유하는 policy decision은 어떻게 분리되는가?
- completion predicate를 lock 안에서 보고 lock 밖에서 `ended`를 설정하면 어떤 gap이 생기는가?
- death candidate가 scan 뒤 meal을 시작하면 initial observation은 왜 더 이상 authoritative하지 않은가?
- final death path가 왜 `print_mutex`를 먼저 잡고 `state_mutex`를 다음에 잡는가?
- fresh monotonic time과 latest `last_meal_ms`는 어느 critical section에서 비교되는가?
- normal logger가 먼저 print lock을 얻는 경우와 death path가 먼저 얻는 경우 모두에서 line order는 어떻게 결정되는가?
- at-most-one death commitment와 actual output delivery는 어떻게 구분해야 하는가?
- boundary injection test는 completion atomicity와 stale candidate rejection을 각각 어떻게 강제하는가?

## 3. 완료 기준

- [x] 최초 normal/death logger의 lock trace와 race window를 실제 code로 제시할 수 있습니다.
- [x] main-thread monitor와 workers의 responsibility split을 state producer/authority 관점으로 설명할 수 있습니다.
- [x] completion observation과 publication 사이 gap을 실제 unlock/call 순서로 재구성할 수 있습니다.
- [x] stale death candidate interleaving을 meal-state mutation과 함께 설명할 수 있습니다.
- [x] `philo_try_log_death`의 fresh recheck와 exact lock order를 설명할 수 있습니다.
- [x] normal logger와 death path의 두 경쟁 순서 모두에서 terminal order를 증명할 수 있습니다.
- [x] completion publication이 state unlock 전에 끝나는 코드를 제시할 수 있습니다.
- [x] boundary test의 두 mode와 핵심 positive/negative assertion을 설명할 수 있습니다.
- [x] one-death/no-post-terminal guarantee와 strict latency/output failure non-guarantee를 구분할 수 있습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Source-defined role |
| --- | --- | --- | --- | --- | --- |
| 1 | `033ad537d166` | `feat(log): 상태 로그의 동시 출력 보호` | A | `TERMINAL_STATE, CONCURRENCY, ARCH` | Introduces synchronized terminal-state access and a print mutex, but does not yet couple death publication to final output atomically. |
| 2 | `40ea0f871300` | `feat(monitor): 사망과 식사 완료 조건 감시` | S | `CORE, CONCURRENCY, TERMINAL_STATE` | Establishes the main-thread monitor as the authority for starvation and global completion. |
| 3 | `a2e90b84641b` | `fix(monitor): 종료 상태와 사망 로그를 원자적으로 확정` | S | `TERMINAL_STATE, CONCURRENCY, RISK` | Rechecks death under `print_mutex → state_mutex`, commits completion while locked, and gives terminal state explicit linearization points. |
| 4 | `c424b7d91ed1` | `test(monitor): 완료 상태와 오래된 사망 판정 검증` | A | `TEST, TERMINAL_STATE, DEBUG` | Mutates state at the old unlock boundary to prove stale candidates are rejected and completion is already terminal before release. |

## 5. Commit별 학습 기록

### 5.1 `033ad537d166` — `feat(log): 상태 로그의 동시 출력 보호`

- Importance: **A**
- Tags: `TERMINAL_STATE, CONCURRENCY, ARCH`
- Source-defined role: Introduces synchronized terminal-state access and a print mutex, but does not yet couple death publication to final output atomically.
- 코드 기준: 반드시 `033ad537d166` 시점
- 직접 parent 비교: `git diff 033ad537d166^ 033ad537d166 --`
- Thread 직전 관련 SHA: Thread 내 첫 commit

#### Source-confirmed 맥락

이 A-level commit은 terminal flag 접근과 status output을 state API 뒤로 이동합니다. `philo_has_ended`와 `philo_finish`는 `state_mutex`를 사용하고, normal status logger는 `print_mutex`를 잡은 뒤 terminal state를 다시 확인하고 하나의 complete line을 출력합니다. dedicated death path는 `ended`를 한 번만 변경하고 guard로 death line을 최대 한 번 출력하려고 합니다.

하지만 terminal publication과 death output은 하나의 atomic logging transaction이 아닙니다. death path는 `state_mutex`를 놓은 뒤 `print_mutex`를 획득합니다. 이미 print lock을 가진 normal logger가 termination check를 통과한 뒤 death path가 기다리는 interleaving에서는 death publication과 output order가 분리될 수 있습니다.


#### 변화 연결

| 단계 | Source-confirmed 기준 | 해당 SHA 코드 근거 |
| --- | --- | --- |
| 문제 | 여러 worker의 log field가 interleave되거나 terminal 이후 ordinary status가 출력될 수 있습니다. | §12 완료 기록의 대응 근거 참조 |
| 핵심 결정 | terminal state access를 `state_mutex` 경계에 두고 output을 `print_mutex`로 serialize합니다. | §12 완료 기록의 대응 근거 참조 |
| 얻는 boundary | normal line은 print lock 안에서 terminal recheck와 complete output을 수행합니다. | §12 완료 기록의 대응 근거 참조 |
| 남은 race | death state publication과 final line output 사이에 lock gap이 있어 normal logger와 순서가 엇갈릴 수 있습니다. | §12 완료 기록의 대응 근거 참조 |
| 후속 연결 | `a2e90b84641b`이 `print_mutex → state_mutex` common order에서 death를 revalidate하고 terminal publication과 final line을 결합합니다. | §12 완료 기록의 대응 근거 참조 |

#### 해당 SHA에서 직접 확인할 코드
- [x] `git show --name-status 033ad537d166`로 state API와 logger 구현 파일을 식별합니다.
- [x] `philo_has_ended`가 `state_mutex`를 acquire/read/release하는 실제 순서를 확인합니다.
- [x] `philo_finish`가 `ended`를 언제 검사하고 언제 변경하는지 확인합니다.
- [x] normal logger의 `print_mutex` acquire, terminal recheck, timestamp calculation, `printf`, unlock 순서를 기록합니다.
- [x] normal logger의 terminal recheck가 직접 state lock을 중첩하는지 helper를 통하는지 actual call graph로 확인합니다.
- [x] dedicated death path가 `state_mutex`와 `print_mutex`를 각각 언제 잡고 놓는지 순서도로 그립니다.
- [x] death guard가 at-most-one attempt를 어떤 state로 표현하는지 확인합니다.
- [x] normal logger가 print lock을 가진 채 termination check를 통과하고 death path가 대기하는 interleaving을 실제 lock 순서로 재구성합니다.
- [x] timestamp가 table start 기준으로 계산되는 위치와 output line 전체가 print lock 안에 있는지 확인합니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol | §12 완료 기록의 대응 근거 참조 |
| 최소 코드 구간 | §12 완료 기록의 대응 근거 참조 |
| caller → callee | §12 완료 기록의 대응 근거 참조 |
| state 또는 ownership 변화 | §12 완료 기록의 대응 근거 참조 |
| failure/cleanup 경로 | §12 완료 기록의 대응 근거 참조 |
| 직전 상태와의 차이 | §12 완료 기록의 대응 근거 참조 |

#### Logger lock trace

| Path | 첫 lock | state check/mutation | 두 번째 lock 또는 output | unlock 순서 | race window |
| --- | --- | --- | --- | --- | --- |
| normal status | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| death path | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |

#### 문제 interleaving 기록

```text
normal logger: print lock 획득
normal logger: ended == false 확인
death path:    ended publish
death path:    print lock 대기
normal logger: ordinary line 출력
normal logger: print unlock
death path:    died 출력
```

실제 구현의 lock acquire/release와 state mutation에 맞게 위 순서를 수정합니다.


#### 보장 범위

이 commit이 source 기준으로 보장하는 것:
- normal status line의 field interleaving을 `print_mutex`로 막습니다.
- terminal flag에 대한 직접 unsynchronized access를 state API로 줄입니다.
- death state를 한 번만 설정하고 death line을 최대 한 번 시도하려는 guard를 둡니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- terminal publication과 death line이 하나의 linearized transaction인 것은 아닙니다.
- stale death candidate revalidation은 아직 없습니다.
- death가 final successful status attempt가 된다고 아직 보장하지 않습니다.

#### 학습자 결론
- [x] 단순 output serialization과 terminal decision serialization이 다른 문제인 이유를 설명합니다.
- [x] normal/death path의 lock 순서를 실제 code로 나란히 제시합니다.
- [x] 후속 fix가 왜 새로운 print mutex가 아니라 existing locks의 order와 revalidation을 바꾸는지 설명합니다.

### 5.2 `40ea0f871300` — `feat(monitor): 사망과 식사 완료 조건 감시`

- Importance: **S**
- Tags: `CORE, CONCURRENCY, TERMINAL_STATE`
- Source-defined role: Establishes the main-thread monitor as the authority for starvation and global completion.
- 코드 기준: 반드시 `40ea0f871300` 시점
- 직접 parent 비교: `git diff 40ea0f871300^ 40ea0f871300 --`
- Thread 직전 관련 SHA: `033ad537d166`

#### Source-confirmed 맥락

이 S-level commit은 calling thread를 authoritative monitor로 두고 global termination policy를 worker routine에서 분리합니다. workers는 자신의 `last_meal_ms`, `meals`, `full_count`에 필요한 state를 publish하고, monitor는 `state_mutex` 아래에서 optional completion과 starvation을 관찰합니다. completion이면 run을 끝내고, current sampled time과 last-meal state로 첫 death candidate를 선택합니다.

최초 구현은 observation과 commitment를 분리합니다. completion predicate를 lock 안에서 확인한 뒤 unlock 후 `philo_finish`를 호출하고, sampled time으로 candidate를 고른 뒤 state critical section 밖에서 death path를 호출합니다. 그 사이 state가 바뀌어 completion publication이 늦어지거나 candidate가 stale해질 수 있습니다.


#### 변화 연결

| 단계 | Source-confirmed 기준 | 해당 SHA 코드 근거 |
| --- | --- | --- |
| 문제 | local worker state만으로 simulation-wide death 또는 all-meals completion을 결정할 수 없습니다. | §12 완료 기록의 대응 근거 참조 |
| responsibility decision | calling thread monitor가 global terminal policy의 유일한 authority가 됩니다. | §12 완료 기록의 대응 근거 참조 |
| worker 역할 | 자신의 meal progress와 starvation reference를 synchronized state로 publish합니다. | §12 완료 기록의 대응 근거 참조 |
| monitor 역할 | completion predicate와 각 philosopher의 elapsed starvation을 관찰해 candidate를 선택합니다. | §12 완료 기록의 대응 근거 참조 |
| 남은 race 1 | completion 관찰 후 unlock과 `ended` publication 사이에 gap이 있습니다. | §12 완료 기록의 대응 근거 참조 |
| 남은 race 2 | death candidate scan 후 actual death commit 사이에 meal start 등 state change가 생길 수 있습니다. | §12 완료 기록의 대응 근거 참조 |
| 후속 수정 | `a2e90b84641b`이 completion을 lock 안에서 commit하고 death를 fresh recheck합니다. | §12 완료 기록의 대응 근거 참조 |

#### 해당 SHA에서 직접 확인할 코드
- [x] `033ad537d166` 대비 monitor translation unit과 public entry point를 확인합니다.
- [x] monitor loop가 terminal state, `full_count`, meal limit을 어떤 순서로 검사하는지 확인합니다.
- [x] philosopher array scan 중 current time을 한 번 sampling하는지, 각 philosopher마다 sampling하는지 실제 code로 확인합니다.
- [x] `last_meal_ms`와 `time_to_die` 비교식 및 equality boundary를 기록합니다.
- [x] candidate가 어떤 값 또는 pointer로 critical section 밖까지 전달되는지 확인합니다.
- [x] completion predicate가 true일 때 `state_mutex` unlock과 `philo_finish` 호출 순서를 확인합니다.
- [x] death candidate 발견 시 unlock과 death logger 호출 순서를 확인합니다.
- [x] monitor polling의 500-microsecond yield 위치를 확인합니다.
- [x] worker가 peer death를 판단하는 코드가 없는지 responsibility boundary를 확인합니다.
- [x] sampled candidate가 lock release 후 meal start를 갱신하는 구체적 interleaving을 작성합니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol | §12 완료 기록의 대응 근거 참조 |
| 최소 코드 구간 | §12 완료 기록의 대응 근거 참조 |
| caller → callee | §12 완료 기록의 대응 근거 참조 |
| state 또는 ownership 변화 | §12 완료 기록의 대응 근거 참조 |
| failure/cleanup 경로 | §12 완료 기록의 대응 근거 참조 |
| 직전 상태와의 차이 | §12 완료 기록의 대응 근거 참조 |

#### Worker–monitor responsibility split

| State 또는 decision | Producer | Observer/authority | Lock boundary | 학습자 코드 근거 |
| --- | --- | --- | --- | --- |
| `last_meal_ms` | worker | monitor | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| per-worker meals | worker | monitor/worker completion logic | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| `full_count` | worker | monitor | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| death candidate | monitor | monitor | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| global `ended` | monitor/state API | workers/loggers | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |

#### Observation–commit gaps

| Predicate | 관찰 시 lock | unlock 뒤 호출 | 그 사이 바뀔 수 있는 state | 잘못된 결과 |
| --- | --- | --- | --- | --- |
| all meals complete | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| philosopher dead | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |


#### 보장 범위

이 commit이 source 기준으로 보장하는 것:
- worker-local state production과 simulation-wide terminal policy가 분리됩니다.
- calling thread monitor가 death 및 optional global completion의 authoritative observer가 됩니다.
- monitor는 shared meal state를 `state_mutex` 경계에서 관찰합니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- completion predicate와 `ended` publication이 같은 transaction인 것은 아닙니다.
- death candidate가 commit 시점에도 유효하다고 보장하지 않습니다.
- death line 이후 ordinary log가 없다고 보장하지 않습니다.
- polling interval은 strict detection latency guarantee가 아닙니다.

#### 학습자 결론
- [x] worker가 peer death를 결정하지 않고 monitor가 global policy를 소유하는 이유를 설명합니다.
- [x] state production과 policy interpretation을 실제 symbols로 구분합니다.
- [x] candidate discovery와 terminal commitment 사이 gap이 stale decision을 만드는 interleaving을 제시합니다.
- [x] 이 S commit의 architecture는 유지되면서 후속 fix가 commitment protocol만 강화하는 이유를 설명합니다.

### 5.3 `a2e90b84641b` — `fix(monitor): 종료 상태와 사망 로그를 원자적으로 확정`

- Importance: **S**
- Tags: `TERMINAL_STATE, CONCURRENCY, RISK`
- Source-defined role: Rechecks death under `print_mutex → state_mutex`, commits completion while locked, and gives terminal state explicit linearization points.
- 코드 기준: 반드시 `a2e90b84641b` 시점
- 직접 parent 비교: `git diff a2e90b84641b^ a2e90b84641b --`
- Thread 직전 관련 SHA: `40ea0f871300`

#### Source-confirmed 맥락

이 S-level fix는 terminal-state publication에 명시적인 linearization point를 부여합니다. meal completion은 `state_mutex`를 유지한 채 predicate 확인과 `ended` publication을 수행합니다.

death는 two-stage operation이 됩니다. monitor scan은 candidate를 advisory하게 고를 수 있지만, `philo_try_log_death`가 `print_mutex`를 먼저, `state_mutex`를 다음에 획득하고 fresh monotonic time과 latest `last_meal_ms`로 candidate를 다시 검사합니다. 아직 terminal이 아니고 starvation predicate가 여전히 참일 때만 `ended`를 설정하고 death timestamp를 계산해 `died` line을 출력합니다. normal logger와 동일한 nested lock order가 terminal transition과 output을 serialize합니다.


#### 변화 연결

| 단계 | Source-confirmed 기준 | 해당 SHA 코드 근거 |
| --- | --- | --- |
| 기존 가정 | monitor scan에서 dead로 보인 candidate는 lock을 놓은 뒤에도 유효하고, state publication과 print를 분리해도 final order가 유지됩니다. | §12 완료 기록의 대응 근거 참조 |
| 실제 failure/위험 | candidate가 그 사이 meal을 시작할 수 있고, normal logger가 death publication 전 check를 통과해 `died` 뒤 ordinary line을 만들 수 있습니다. | §12 완료 기록의 대응 근거 참조 |
| root cause | observation 시점과 terminal commit 시점이 분리되고 state/output lock order가 하나의 transaction을 형성하지 않습니다. | §12 완료 기록의 대응 근거 참조 |
| completion fix | all-full predicate와 `ended` publication을 같은 state critical section에서 수행합니다. | §12 완료 기록의 대응 근거 참조 |
| death fix | `print_mutex → state_mutex` 아래 fresh time, latest meal, `!ended`를 재검사합니다. | §12 완료 기록의 대응 근거 참조 |
| linearization point | revalidation이 성공한 critical section 안에서 `ended`를 설정하고 terminal line을 emit합니다. | §12 완료 기록의 대응 근거 참조 |
| output result | death commit 뒤 도착한 normal logger는 print boundary 안 state check에서 suppress됩니다. | §12 완료 기록의 대응 근거 참조 |
| regression 연결 | `c424b7d91ed1`이 old unlock boundary에 state mutation을 주입해 completion atomicity와 stale candidate rejection을 검증합니다. | §12 완료 기록의 대응 근거 참조 |

#### 해당 SHA에서 직접 확인할 코드
- [x] `40ea0f871300` 대비 monitor completion branch가 `state_mutex`를 놓기 전에 `ended`를 설정하도록 바뀐 diff를 확인합니다.
- [x] 기존 death logger가 `philo_try_log_death` 또는 equivalent boolean attempt로 교체되는 위치를 확인합니다.
- [x] `philo_try_log_death`의 exact lock order가 `print_mutex` 다음 `state_mutex`인지 확인합니다.
- [x] normal logger의 nested lock order와 death path의 order가 동일한지 call graph로 확인합니다.
- [x] death revalidation에서 fresh monotonic time을 다시 sampling하는 지점을 확인합니다.
- [x] `!ended`, candidate의 latest `last_meal_ms`, `time_to_die` 비교가 같은 critical section 안에 있는지 확인합니다.
- [x] stale candidate일 때 어떤 return value로 monitor loop가 계속되는지 확인합니다.
- [x] valid death일 때 `ended` mutation, timestamp calculation, `printf` 순서를 확인합니다.
- [x] state/print mutex가 valid death와 stale death에서 각각 어떤 순서로 unlock되는지 확인합니다.
- [x] normal logger가 print lock을 먼저 잡은 경우와 death path가 먼저 잡은 경우의 두 interleaving을 각각 작성합니다.
- [x] at-most-one death commitment가 guard와 lock serialization으로 어떻게 성립하는지 확인합니다.
- [x] output failure 자체는 source에서 해결되지 않은 non-guarantee이므로 terminal attempt와 physical delivery를 구분합니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol | §12 완료 기록의 대응 근거 참조 |
| 최소 코드 구간 | §12 완료 기록의 대응 근거 참조 |
| caller → callee | §12 완료 기록의 대응 근거 참조 |
| state 또는 ownership 변화 | §12 완료 기록의 대응 근거 참조 |
| failure/cleanup 경로 | §12 완료 기록의 대응 근거 참조 |
| 직전 상태와의 차이 | §12 완료 기록의 대응 근거 참조 |

#### Linearization trace

| Case | `print_mutex` | `state_mutex` | revalidated state | mutation/output | result |
| --- | --- | --- | --- | --- | --- |
| normal logger wins first | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | ordinary line precedes death attempt |
| death path wins first | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | later ordinary logger suppressed |
| stale candidate | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | recent meal or terminal | no death commit | monitor continues |
| valid candidate | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | starvation still true | `ended` + `died` | unique terminal attempt |

#### Lock-order 근거

```text
ordinary log: print_mutex → state_mutex → check → output
death commit: print_mutex → state_mutex → fresh recheck → ended → died
```

- actual ordinary logger symbols: §12 완료 기록의 대응 근거에 정리했습니다.
- actual death symbol: §12 완료 기록의 대응 근거에 정리했습니다.
- nested hold 범위: §12 완료 기록의 대응 근거에 정리했습니다.
- reverse order가 존재하지 않는지 검색 결과: §12 완료 기록의 대응 근거에 정리했습니다.


#### 보장 범위

이 commit이 source 기준으로 보장하는 것:
- meal completion predicate와 terminal publication이 같은 state transaction에 있습니다.
- death candidate는 fresh time과 latest meal state로 commit 직전에 revalidate됩니다.
- stale candidate는 terminal death로 확정되지 않습니다.
- at most one death가 commit되고, terminal publication 뒤 ordinary status attempt는 suppress됩니다.
- common `print_mutex → state_mutex` order가 terminal decision과 output ordering을 결합합니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- monitor의 initial scan 자체가 final truth인 것은 아닙니다.
- strict death-detection latency를 보장하지 않습니다.
- I/O failure나 모든 pthread failure를 해결했다는 뜻은 아닙니다.
- scheduler fairness 또는 starvation freedom을 보장하지 않습니다.

#### 후속 regression evidence

- `c424b7d91ed1`은 completion unlock boundary에서 `ended`가 이미 true인지 관찰합니다.
- 같은 test의 stale-death mode는 initial scan 뒤 `last_meal_ms`와 completion state를 바꿔 final revalidation이 current state를 사용하는지 확인합니다.


#### 학습자 결론
- [x] candidate scan을 advisory로, `philo_try_log_death`를 authoritative commit으로 구분합니다.
- [x] linearization point를 특정 lock hold와 state mutation 순서로 제시합니다.
- [x] normal logger와 death path의 두 경쟁 순서 모두에서 no-post-terminal-log가 유지되는 이유를 설명합니다.
- [x] at-most-one death와 physical output success를 구분합니다.
- [x] monitor architecture, lock order, time model이 이 fix에서 어떻게 결합되는지 설명합니다.

### 5.4 `c424b7d91ed1` — `test(monitor): 완료 상태와 오래된 사망 판정 검증`

- Importance: **A**
- Tags: `TEST, TERMINAL_STATE, DEBUG`
- Source-defined role: Mutates state at the old unlock boundary to prove stale candidates are rejected and completion is already terminal before release.
- 코드 기준: 반드시 `c424b7d91ed1` 시점
- 직접 parent 비교: `git diff c424b7d91ed1^ c424b7d91ed1 --`
- Thread 직전 관련 SHA: `a2e90b84641b`

#### Source-confirmed test 역할

이 deterministic boundary test는 mutex unlock wrapper를 사용해 monitor가 state critical section을 놓는 정확한 경계를 관찰하거나 state를 변경합니다. completion mode에서는 unlock 시점에 `ended`가 이미 true인지 확인하여 predicate evaluation과 terminal publication이 하나의 transaction임을 검증합니다.

stale-death mode에서는 처음에 philosopher가 dead로 보이도록 만들고, monitor의 initial observation 뒤 old unlock boundary에서 `last_meal_ms`를 갱신하고 meal completion을 표시합니다. monitor는 candidate를 다시 검사해 valid completion으로 끝나야 하며 stale `died` line을 출력하면 안 됩니다.


#### Test commit 분석

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariant | §12 완료 기록의 대응 근거 참조 |
| mutex unlock wrapper가 관찰하는 boundary | §12 완료 기록의 대응 근거 참조 |
| completion mode의 초기 state | §12 완료 기록의 대응 근거 참조 |
| completion mode의 핵심 assertion | §12 완료 기록의 대응 근거 참조 |
| stale-death mode의 초기 candidate state | §12 완료 기록의 대응 근거 참조 |
| boundary에서 주입하는 `last_meal_ms`/completion mutation | §12 완료 기록의 대응 근거 참조 |
| 실제로 통과하는 production monitor와 death-attempt path | §12 완료 기록의 대응 근거 참조 |
| valid completion assertion | §12 완료 기록의 대응 근거 참조 |
| death line 부재 assertion | §12 완료 기록의 대응 근거 참조 |
| 이 테스트가 증명하는 것 | §12 완료 기록의 대응 근거 참조 |
| 이 테스트가 증명하지 않는 것 | §12 완료 기록의 대응 근거 참조 |
| deterministic interleaving regression 분류 | §12 완료 기록의 대응 근거 참조 |
| 후속 회귀 방지 대상 | §12 완료 기록의 대응 근거 참조 |

#### 해당 SHA에서 직접 확인할 코드
- [x] mutex unlock wrapper가 어떤 mutex와 호출 위치를 대상으로 mode별 동작을 선택하는지 확인합니다.
- [x] completion mode에서 production monitor가 unlock을 호출하기 전에 `ended`를 이미 설정했는지 wrapper가 어떻게 읽는지 확인합니다.
- [x] stale-death mode의 initial `last_meal_ms`, sampled time, `time_to_die` 관계를 확인합니다.
- [x] old race boundary에서 `last_meal_ms`를 갱신하고 meal completion state를 만드는 injection을 확인합니다.
- [x] injection mutation 자체가 필요한 synchronization을 지키는지 확인합니다.
- [x] monitor가 initial candidate를 가진 뒤 `philo_try_log_death`에서 fresh state를 읽는 production path를 추적합니다.
- [x] run이 valid completion 상태로 끝나는 assertion을 확인합니다.
- [x] `died` line이 전혀 없어야 한다는 output assertion을 확인합니다.
- [x] repeated timing run이 아니라 exact interleaving을 강제하는 이유를 설명합니다.

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
- completion predicate 평가와 `ended` publication이 state unlock 전에 끝나는지 결정적으로 검증합니다.
- candidate discovery와 commitment 사이 state가 바뀌면 fresh revalidation이 stale death를 거부하는지 검증합니다.
- valid completion state가 stale death보다 우선해 terminal result가 되는지 검증합니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- 모든 monitor schedule이나 output race를 포괄하지 않습니다.
- lock-order 전체를 정적으로 증명하지 않으며, target boundary의 production behavior를 검증합니다.
- strict detection latency나 fairness를 검증하지 않습니다.

#### 학습자 결론
- [x] wrapper가 old unlock boundary를 정확히 겨냥하는 방법을 설명합니다.
- [x] completion atomicity와 stale-death rejection 두 mode의 state setup을 분리해 기록합니다.
- [x] 이 test가 initial observation이 아니라 synchronized commit point를 correctness 기준으로 삼는다는 것을 설명합니다.

## 6. Invariant ledger

| Invariant | 최초 도입 또는 부족함 | 강화·복구 | regression evidence | 해당 SHA 코드 근거 | 최종 설명 |
| --- | --- | --- | --- | --- | --- |
| terminal state access는 `state_mutex` 경계를 사용 | `033ad537d166` | monitor와 final death path에서 유지 | `c424b7d91ed1` boundary observation | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| ordinary output은 complete line 단위로 serialize | `033ad537d166` | final common lock order와 결합 | 후속 concurrency evidence는 다른 Thread에 존재 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| monitor가 global death/completion policy의 authority | `40ea0f871300` | `a2e90b84641b`에서 advisory scan + authoritative commit으로 정교화 | `c424b7d91ed1` | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| completion predicate와 `ended` publication은 같은 state transaction | `40ea0f871300`에서 unlock gap 존재 | `a2e90b84641b` | `c424b7d91ed1` completion mode | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| death candidate는 fresh time/latest meal로 commit 직전 revalidate | `40ea0f871300`에서 stale candidate 가능 | `a2e90b84641b` | `c424b7d91ed1` stale-death mode | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| at most one death가 commit되고 terminal 뒤 ordinary status attempt가 없음 | `033ad537d166`에서 guard는 있으나 atomicity 부족 | `a2e90b84641b` | `c424b7d91ed1`은 stale decision을 직접 검증 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| death/normal logging은 `print_mutex → state_mutex` common order 사용 | 최초 logger boundary에서 불완전 | `a2e90b84641b` | actual lock trace와 별도 concurrency evidence로 확인 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |

## 7. Failure → Fix → Test 연결

### 7.1 Output serialization만으로는 부족한 terminal ordering

```text
`033ad537d166`
state access + print serialization
→ death publication 뒤 print lock 획득
→ normal logger가 old terminal check를 통과할 window
→ `a2e90b84641b`
normal/death 모두 print_mutex → state_mutex
→ terminal commit과 final output을 같은 serialization boundary에 배치
```

- initial normal logger lock trace: §12 완료 기록의 대응 근거에 정리했습니다.
- initial death logger lock trace: §12 완료 기록의 대응 근거에 정리했습니다.
- terminal publication과 final death output 사이 ordinary attempt가 가능한 interleaving: §12 완료 기록의 대응 근거에 정리했습니다.
- final common order: §12 완료 기록의 대응 근거에 정리했습니다.
- death-first/normal-first 두 결과: §12 완료 기록의 대응 근거에 정리했습니다.
- physical I/O success와 state guarantee의 구분: §12 완료 기록의 대응 근거에 정리했습니다.

### 7.2 Monitor observation과 terminal commitment

```text
`40ea0f871300`
state lock에서 completion/death candidate 관찰
→ unlock
→ finish/death path 호출
→ completion publication delay 또는 stale candidate
→ `a2e90b84641b`
completion은 lock 안에서 commit
death는 fresh time/latest meal로 revalidate
→ `c424b7d91ed1`
old unlock boundary에서 state mutation 주입
```

- completion old gap: §12 완료 기록의 대응 근거에 정리했습니다.
- stale-death old gap: §12 완료 기록의 대응 근거에 정리했습니다.
- final completion mutation point: §12 완료 기록의 대응 근거에 정리했습니다.
- final death revalidation predicate: §12 완료 기록의 대응 근거에 정리했습니다.
- stale candidate return path: §12 완료 기록의 대응 근거에 정리했습니다.
- test completion mode: §12 완료 기록의 대응 근거에 정리했습니다.
- test stale-death mode: §12 완료 기록의 대응 근거에 정리했습니다.
- no-death negative assertion: §12 완료 기록의 대응 근거에 정리했습니다.

## 8. Ownership / state / responsibility 변화

| 시점 | Worker responsibility | Monitor responsibility | Logger responsibility | Terminal commit point | 학습자 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| `033ad537d166` | terminal state를 확인하며 status 요청 | 아직 후속 도입 | print serialization과 초기 death path | state/output 분리 | §12 완료 기록의 대응 근거 참조 |
| `40ea0f871300` | meal state 생산 | completion/death candidate 관찰 | existing logger 호출 | observation 뒤 별도 publication | §12 완료 기록의 대응 근거 참조 |
| `a2e90b84641b` | synchronized meal state 생산 유지 | candidate scan은 advisory, final revalidation 호출 | common lock order에서 terminal output | locked completion 또는 revalidated death transaction | §12 완료 기록의 대응 근거 참조 |
| `c424b7d91ed1` test | production state를 boundary에서 자극 | current state를 사용해야 함 | stale death를 출력하지 않아야 함 | wrapper가 old gap을 직접 관찰 | §12 완료 기록의 대응 근거 참조 |

## 9. Thread 최종 상태

### Source-confirmed 최종 상태

- workers는 synchronized meal facts를 publish하고 main-thread monitor는 global terminal policy를 소유합니다.
- completion은 predicate가 true인 state critical section 안에서 `ended`로 commit됩니다.
- death scan은 advisory이며 final attempt가 `print_mutex → state_mutex`에서 fresh time과 latest meal state를 다시 확인합니다.
- valid death만 `ended`와 terminal line을 같은 serialization boundary에서 commit합니다.
- at most one death가 commit되고 terminal publication 뒤 ordinary status attempt는 suppress됩니다.
- strict detection latency, fairness, output call success는 이 invariant가 보장하는 범위가 아닙니다.

### 학습자가 작성할 최종 설명

- state producers: §12 완료 기록의 대응 근거에 정리했습니다.
- global policy authority: §12 완료 기록의 대응 근거에 정리했습니다.
- ordinary logger boundary: §12 완료 기록의 대응 근거에 정리했습니다.
- completion linearization: §12 완료 기록의 대응 근거에 정리했습니다.
- death revalidation: §12 완료 기록의 대응 근거에 정리했습니다.
- common lock order: §12 완료 기록의 대응 근거에 정리했습니다.
- unique terminal attempt: §12 완료 기록의 대응 근거에 정리했습니다.
- stale candidate handling: §12 완료 기록의 대응 근거에 정리했습니다.
- guarantees: §12 완료 기록의 대응 근거에 정리했습니다.
- non-guarantees: §12 완료 기록의 대응 근거에 정리했습니다.

## 10. 최종 architecture 또는 execution flow 정리

```text
workers
    ↓ state_mutex 아래 last_meal/meals/full_count publish

main-thread monitor
    ↓ state_mutex 아래 completion 확인
        ├─ all full
        │      → 같은 critical section에서 ended commit
        └─ death candidate 발견
               → scan은 advisory
               → philo_try_log_death
                    ↓ print_mutex
                    ↓ state_mutex
                    ↓ fresh monotonic time
                    ↓ !ended + latest last_meal recheck
                        ├─ stale/terminal
                        │      → no death commit
                        └─ still dead
                               → ended commit
                               → died line attempt
                    ↓ unlock state
                    ↓ unlock print

ordinary logger
    ↓ print_mutex
    ↓ state_mutex
    ↓ ended check
        ├─ ended → suppress
        └─ active → complete ordinary line
```

- actual monitor loop symbol: §12 완료 기록의 대응 근거에 정리했습니다.
- completion condition: §12 완료 기록의 대응 근거에 정리했습니다.
- candidate representation: §12 완료 기록의 대응 근거에 정리했습니다.
- actual death-attempt symbol: §12 완료 기록의 대응 근거에 정리했습니다.
- fresh time call: §12 완료 기록의 대응 근거에 정리했습니다.
- nested lock scope: §12 완료 기록의 대응 근거에 정리했습니다.
- normal logger symbol: §12 완료 기록의 대응 근거에 정리했습니다.
- stale return semantics: §12 완료 기록의 대응 근거에 정리했습니다.
- death output call: §12 완료 기록의 대응 근거에 정리했습니다.
- unlock order: §12 완료 기록의 대응 근거에 정리했습니다.

## 11. 학습 완료 자가 점검

- [x] `033ad537d166`의 state API, normal logger, death logger lock 순서를 당시 코드로 확인했습니다.
- [x] initial terminal/output gap에서 ordinary line이 뒤늦게 나오는 interleaving을 설명했습니다.
- [x] `40ea0f871300`의 worker–monitor responsibility split을 state producer와 authority로 구분했습니다.
- [x] completion과 death observation–commit gap을 실제 unlock/call 순서로 제시했습니다.
- [x] `a2e90b84641b`의 completion commit과 death fresh revalidation을 설명했습니다.
- [x] `print_mutex → state_mutex` common order를 normal/death path 모두에서 확인했습니다.
- [x] stale candidate, normal-first, death-first 세 case를 각각 설명했습니다.
- [x] `c424b7d91ed1`의 completion mode와 stale-death mode를 분리해 기록했습니다.
- [x] one-death/no-post-terminal invariant를 strict latency 또는 guaranteed I/O success로 확대하지 않았습니다.
- [x] final HEAD의 lock order를 이전 SHA에 소급하지 않았습니다.

## 12. 저장소 기반 완료 기록

### 12.1 검토 범위와 실행 상태

- 이 Thread의 4개 SHA는 모두 `c/philo` HEAD의 조상으로 확인했습니다.
- normal logger, death logger, monitor, boundary test는 각 SHA의 구현을 직접 대조했습니다.
- test binary는 실행하지 못했으므로 runtime 통과를 주장하지 않습니다. 테스트 technique과 예상 결과는 source inspection에 근거합니다.

### 12.2 `033ad537d166` — line serialization과 terminal access의 첫 경계

#### state API

`src/state.c::philo_has_ended`는 `state_mutex`를 lock하고 `ended`를 읽은 뒤 unlock합니다. `philo_finish`도 같은 mutex 아래 `ended = 1`을 수행합니다. terminal flag의 direct unsynchronized access를 줄이는 첫 단계입니다.

#### normal logger

`philo_log`의 lock trace는 다음과 같습니다.

```text
print_mutex lock
→ philo_has_ended
     → state_mutex lock
     → ended read
     → state_mutex unlock
→ active이면 timestamp 계산 + printf 한 줄
→ print_mutex unlock
```

출력 전체가 `print_mutex` 안에 있으므로 여러 thread의 timestamp/id/message field가 한 line 안에서 섞이는 것을 막습니다. nested order는 `print_mutex → state_mutex`입니다.

#### initial death logger

`philo_log_death`는 다른 순서를 사용합니다.

```text
state_mutex lock
→ should_print = !ended
→ ended = 1
→ state_mutex unlock
→ should_print이면 print_mutex lock
→ timestamp + died printf
→ print_mutex unlock
```

terminal state publication과 terminal line 출력 사이에 lock gap이 있습니다. `should_print`가 false인 후속 caller는 death line을 시도하지 않으므로 at-most-one intent는 있지만, death line을 final line으로 만드는 serialization은 아직 없습니다.

#### race interleaving

```text
normal: print_mutex 획득
normal: state_mutex 아래 ended == 0 확인 후 state lock 해제
death:  state_mutex 획득, ended = 1, state lock 해제
death:  print_mutex 대기
normal: ordinary line 출력
normal: print_mutex 해제
death:  died line 출력
```

이 interleaving에서 ordinary line은 terminal publication 뒤에 실제 출력됩니다. line corruption은 없지만 terminal ordering은 잘못될 수 있습니다. 따라서 print serialization과 terminal-decision linearization은 별도 문제입니다.

### 12.3 `40ea0f871300` — main-thread monitor authority

#### responsibility split

| 사실 또는 결정 | producer | authority/consumer | 보호 |
| --- | --- | --- | --- |
| `last_meal_ms` | worker의 meal-start path | monitor | `state_mutex` |
| `meals`, `full_count` | worker completion path | monitor 및 global completion logic | `state_mutex` |
| starvation candidate | monitor scan | monitor | scan 시 `state_mutex` |
| global completion/death | monitor가 결정 | workers/loggers가 `ended`를 소비 | state API |

worker는 자신의 progress fact를 publish하고 peer death를 결정하지 않습니다. `philo_monitor`가 calling thread에서 simulation-wide policy를 소유합니다.

#### monitor loop

`src/monitor.c`는 loop마다 `now = philo_now_ms()`를 sampling하고 `state_mutex`를 잡습니다.

1. meal limit가 있고 `full_count >= number`인지 봅니다.
2. 아니면 philosopher 배열을 순회하며 `now - last_meal_ms >= time_to_die`인 첫 candidate를 선택합니다.
3. state lock을 놓습니다.
4. completion이면 `philo_finish`를, death candidate면 `philo_log_death`를 호출합니다.
5. 아무것도 아니면 `usleep(500)` 후 반복합니다.

#### completion observation–commit gap

```text
state_mutex 아래 all_meals_done == true
→ state_mutex unlock
→ philo_finish가 state_mutex를 다시 lock
→ ended = 1
```

두 lock 사이에는 worker가 ordinary work/log를 시도할 수 있는 gap이 있습니다. predicate 관찰과 publication이 한 transaction이 아닙니다.

#### stale death candidate gap

```text
state_mutex 아래 old now/last_meal로 candidate 선택
→ state_mutex unlock
→ candidate worker가 새 meal을 시작해 last_meal_ms 갱신 가능
→ philo_log_death는 starvation predicate를 다시 보지 않고 ended를 commit
```

initial scan은 관찰 시점에는 맞더라도 commit 시점의 current state가 아닐 수 있습니다. monitor authority 자체는 유지할 설계지만 commitment protocol은 부족합니다.

### 12.4 `a2e90b84641b` — terminal linearization

#### completion fix

`philo_monitor`는 `state_mutex`를 유지한 채 다음을 수행합니다.

```text
if (table->ended) return
if (all_meals_done(table)) {
    table->ended = 1;
    unlock;
    return;
}
```

all-full predicate와 `ended` publication이 같은 critical section에 있으므로 completion을 본 뒤 unlock할 때 terminal state는 이미 확정돼 있습니다.

#### death is a two-stage decision

monitor의 `find_dead_philo(table, now)`는 빠른 advisory scan입니다. candidate가 존재해도 바로 terminal을 확정하지 않습니다. `philo_try_log_death`가 authoritative commit을 수행합니다.

정확한 lock/order는 다음입니다.

```text
print_mutex lock
→ state_mutex lock
→ now = philo_now_ms()  // fresh sample
→ !ended && now - latest last_meal_ms >= time_to_die 재검사
    ├─ false: no mutation, no print
    └─ true:
         ended = 1
         timestamp 계산
         should_print = 1
→ state_mutex unlock
→ should_print이면 died printf
→ print_mutex unlock
```

fresh time, latest meal timestamp, terminal state가 같은 state critical section에서 평가됩니다. stale candidate면 `philo_try_log_death`는 false를 반환하고 monitor loop가 계속됩니다.

#### common lock order

- ordinary log: `print_mutex → state_mutex → ended check → ordinary printf`
- death commit: `print_mutex → state_mutex → fresh starvation check → ended → died printf`

두 path가 같은 nested order를 사용합니다. reverse `state_mutex → print_mutex` hold는 final logger/death transaction에 없습니다.

#### two competing orders

**normal logger가 먼저 `print_mutex`를 얻은 경우**

1. normal logger가 state를 확인합니다.
2. active라면 ordinary line을 완성합니다.
3. death path는 그 뒤 print lock을 얻어 fresh revalidation 후 died를 commit합니다.
4. ordinary line은 death보다 앞에 있으므로 terminal ordering을 위반하지 않습니다.

**death path가 먼저 `print_mutex`를 얻은 경우**

1. death path가 state lock도 얻고 `ended = 1`을 commit합니다.
2. died line을 쓰고 print lock을 해제합니다.
3. 이후 normal logger는 print lock을 얻어 state check에서 ended를 보고 suppress됩니다.

따라서 valid death가 commit된 뒤 ordinary line을 실제 출력하는 path가 없습니다.

#### at-most-one과 physical delivery 구분

`ended` check와 mutation이 state lock 아래 있으므로 valid death commit은 최대 한 번입니다. `printf` return을 검사하거나 I/O failure를 복구하지 않으므로 terminal attempt가 물리적으로 반드시 전달된다고 보장하지는 않습니다.

### 12.5 `c424b7d91ed1` — old unlock boundary를 겨냥한 deterministic test

`tests/terminal_state.c`는 monitor object의 `pthread_mutex_unlock`을 wrapper로 대체하여 이전 race window에 정확히 개입합니다.

#### completion mode

초기 state는 meal limit completion predicate가 이미 true인 상태입니다. monitor가 `state_mutex`를 해제하는 순간 wrapper가 `table->ended`를 읽습니다. assertion은 unlock 시점에 이미 true여야 한다는 것입니다. 이전 구현처럼 unlock 후 `philo_finish`를 호출하면 이 assertion이 실패합니다.

#### stale-death mode

1. initial `last_meal_ms`를 과거로 두어 monitor scan에서 candidate가 선택되게 합니다.
2. monitor가 scan 후 state mutex를 해제하는 old boundary에서 wrapper가 state를 바꿉니다.
3. `last_meal_ms`를 현재 시각으로 갱신합니다.
4. `full_count`를 completion 상태로 만듭니다.
5. monitor가 `philo_try_log_death`를 호출하면 fresh revalidation이 starvation을 거부해야 합니다.
6. 다음 loop에서 valid completion을 commit해야 합니다.

assertion은 run이 completion으로 끝나고 captured output에 `died`가 없다는 것입니다. 초기 candidate를 그대로 신뢰하면 stale death line이 생겨 실패합니다.

이 test는 repeated timing luck이 아니라 exact synchronization boundary를 조작합니다. 모든 monitor schedule, 전체 lock-order proof, output I/O failure를 포괄하지 않습니다.

### 12.6 Invariant evolution 완성

| Invariant | 최초 상태 | 부족함 | 복구 | evidence |
| --- | --- | --- | --- | --- |
| terminal state access는 `state_mutex` 사용 | `033ad537d166` state API | death/output과 atomic하게 결합되지 않음 | final monitor/logger에서도 유지 | boundary wrapper와 source trace |
| ordinary output은 complete line 단위로 serialize | `033ad537d166` print lock | terminal ordering은 별도 | common nested order에 통합 | 후속 concurrency harness와 source trace |
| monitor가 global policy authority | `40ea0f871300` | candidate observation을 final truth로 사용 | advisory scan + authoritative revalidation | stale-death test |
| completion predicate와 ended는 같은 transaction | 최초 monitor는 unlock 후 finish | observation-publication gap | `a2e90b84641b` lock 안 mutation | completion mode |
| death는 current state로 commit | initial scan의 old `now`/meal | candidate stale 가능 | fresh now + latest meal recheck | stale-death mode |
| terminal 뒤 ordinary status 없음 | initial guard만 존재 | publication/print lock gap | `print → state` common order | no-death/no-post-line tests |
| at most one death commit | initial should-print guard | final ordering 불충분 | ended check/mutation under common locks | source trace + terminal tests |

### 12.7 Failure → Fix → Test 연결

#### output serialization에서 terminal serialization으로

```text
033ad537d166
complete-line print lock
+ state-protected ended
→ death는 state unlock 뒤 print lock
→ ordinary logger가 old check를 통과할 수 있음
→ a2e90b84641b
ordinary/death 모두 print_mutex → state_mutex
→ terminal mutation과 final line을 같은 serialization boundary에 배치
```

#### monitor observation에서 authoritative commit으로

```text
40ea0f871300
state lock 아래 completion/death candidate 관찰
→ unlock 후 별도 finish/death call
→ completion gap + stale candidate
→ a2e90b84641b
completion은 lock 안에서 ended commit
death는 fresh time/latest meal revalidation
→ c424b7d91ed1
old unlock boundary에 state mutation 주입
```

두 fix는 monitor를 authority에서 제거하지 않습니다. observation은 candidate selection 역할로 남고, synchronized commit point가 최종 truth가 됩니다.

### 12.8 최종 architecture

```text
workers
    ↓ state_mutex 아래 last_meal_ms / meals / full_count publish

main-thread monitor
    ↓ fresh scan time sampling
    ↓ state_mutex
    ↓ ended 또는 all-full 확인
        ├─ all-full: 같은 lock 안 ended = 1 → return
        └─ candidate 발견: pointer만 보존 → state unlock
               ↓ philo_try_log_death
               ↓ print_mutex
               ↓ state_mutex
               ↓ fresh now + latest last_meal + !ended
                   ├─ stale/terminal: no mutation, false
                   └─ valid starvation:
                        ended = 1
                        timestamp 확정
                        died line attempt
               ↓ state unlock
               ↓ print unlock

ordinary logger
    ↓ print_mutex
    ↓ state_mutex를 helper로 획득해 ended 확인
        ├─ ended: suppress
        └─ active: ordinary complete line
```

### 12.9 최종 보장과 비보장

보장하는 범위:

- workers의 meal facts와 terminal state는 defined state-lock boundary에서 관찰·변경됩니다.
- completion predicate와 `ended` publication은 같은 critical section입니다.
- death candidate는 final commit 직전 fresh monotonic time과 latest meal state로 다시 검증됩니다.
- ordinary/death logger의 common `print_mutex → state_mutex` order가 terminal decision과 output ordering을 결합합니다.
- stale candidate는 death로 commit되지 않으며, valid death는 최대 한 번 commit됩니다.
- valid terminal publication 뒤 ordinary status line은 suppress됩니다.

보장하지 않는 범위:

- initial scan은 authoritative final truth가 아닙니다.
- monitor polling은 strict detection latency를 보장하지 않습니다.
- `printf` failure나 physical output delivery를 보장하지 않습니다.
- lock order와 tests는 scheduler fairness 또는 starvation freedom을 제공하지 않습니다.
