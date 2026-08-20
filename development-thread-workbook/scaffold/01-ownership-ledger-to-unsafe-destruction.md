# Thread: Ownership ledger to unsafe-destruction verdict

이 문서는 source에 정의된 첫 번째 Development Thread를 그대로 따릅니다. commit 순서, SHA, importance, tags는 변경하지 않습니다. 모든 코드 기록은 해당 SHA에서 작성하며 final HEAD를 과거 구현의 근거로 사용하지 않습니다.

## 1. Thread 목표

이 Thread의 목표는 table 중심 ownership graph가 어떻게 partial initialization ledger로 확장되고, 최종적으로 worker quiescence가 입증되지 않으면 destruction 자체를 금지하는 verdict로 발전하는지 복원하는 것입니다.

Source-confirmed significance는 다음과 같습니다.

- 초기에는 `t_table`이 allocation과 ring object의 owner가 되고 philosopher가 그 주소를 빌립니다.
- readiness flag와 `fork_count`가 partial construction을 기록하지만, 초기 구현은 rollback 책임을 helper와 destructor에 나눠 duplicate destruction 위험을 남깁니다.
- common destructor가 유일한 ledger consumer가 되면서 exact-once initialization rollback이 복구됩니다.
- 같은 원칙이 thread lifecycle로 확장되어 successful join만 borrower quiescence의 증거가 됩니다.
- unsafe join 결과에서는 table cleanup뿐 아니라 normal process teardown도 금지됩니다.
- regression test는 반환값만 보지 않고 ledger 보존과 forbidden cleanup의 부재를 검증합니다.

### Source에 명시적으로 연결된 Critical Invariants

- Initialized resource는 ownership ledger가 존재한다고 말할 때에만, 최대 한 번 파괴합니다.
- destruction 실패 후에는 아직 해제되지 않은 resource를 나타내는 truthful, retryable state가 남아야 합니다.
- started worker가 모두 successful join된 경우가 아니면 shared table memory와 synchronization object를 파괴하지 않습니다.
- `t_table`은 allocation과 synchronization object의 owner이며, `t_philo`는 table과 fork array 내부 주소를 빌립니다.

### Source에 명시적으로 연결된 Major Engineering Difficulties

- partial initialization, failed join, mid-destruction error 전 구간에서 exact ownership evidence를 보존하는 문제
- unjoined worker가 table을 계속 역참조할 수 있어 cleanup 자체가 unsafe한 경우를 처리하는 문제
- ordinary error와 unsafe lifecycle verdict가 함께 존재할 때 safety verdict의 우선순위를 유지하는 문제

## 2. 이 Thread를 이해하기 위한 핵심 질문

- allocation owner와 worker가 빌리는 주소는 어느 구조체와 field로 표현되는가?
- 요청한 최종 resource 수가 아니라 실제 성공한 초기화 수를 어떻게 기록하는가?
- 초기 rollback에서 왜 helper와 destructor의 중복 책임이 double destroy 위험을 만드는가?
- cleanup ledger는 resource destroy의 성공 전과 성공 후 중 언제 소비되어야 하는가?
- `pthread_join` 호출을 시도했다는 사실과 worker quiescence가 입증되었다는 사실은 왜 다른가?
- join failure가 ordinary error가 아니라 `PHILO_UNSAFE`여야 하는 이유는 무엇인가?
- unsafe verdict에서 destructor만 생략하는 것으로 충분하지 않고 `_exit`가 필요한 이유는 무엇인가?
- test가 failure를 주입한 뒤 어떤 count, pointer, flag, output의 존재 또는 부재를 관찰하는가?

## 3. 완료 기준

- [ ] `t_table`과 `t_philo`의 owned/borrowed 관계를 실제 field로 설명할 수 있습니다.
- [ ] ring fork mapping이 stable shared identity를 만드는 코드를 해당 SHA에서 제시할 수 있습니다.
- [ ] staged initialization의 readiness flag와 count가 어떤 순서로 갱신되는지 설명할 수 있습니다.
- [ ] duplicate rollback의 두 cleanup owner와 실제 double-destroy 가능 경로를 재구성할 수 있습니다.
- [ ] common destructor가 exact-once cleanup을 복구하는 변경을 before/after로 제시할 수 있습니다.
- [ ] started/joined ledger와 destruction permission의 조건식을 설명할 수 있습니다.
- [ ] failed destroy 뒤 retry 가능한 state가 보존되는 코드를 제시할 수 있습니다.
- [ ] unsafe `main` path가 destructor, buffered stdio, `atexit`를 건너뛰는 것을 test 근거로 설명할 수 있습니다.
- [ ] 이 Thread가 보장하지 않는 graceful cleanup과 실제 failed worker 상태를 구분할 수 있습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Source-defined role |
| --- | --- | --- | --- | --- | --- |
| 1 | `16343e76b54b` | `feat(init): 테이블 저장소와 철학자 관계 초기화` | S | `ARCH, CORE, RESOURCE_LIFECYCLE` | Establishes the table as the owner of allocations and the ring objects borrowed by philosophers. |
| 2 | `1d69df7db78c` | `feat(init): 뮤텍스 수명주기와 실패 롤백 구현` | A | `RESOURCE_LIFECYCLE, ARCH, RISK` | Adds staged mutex construction and resource-readiness ledgers, but still splits rollback responsibility. |
| 3 | `10665e0a5bf9` | `fix(init): 포크 초기화 실패 시 중복 정리 방지` | A | `RESOURCE_LIFECYCLE, DEBUG, RISK` | Centralizes partial fork rollback in the common destructor and restores exact-once cleanup. |
| 4 | `800408d6d84e` | `test(init): 부분 뮤텍스 초기화 롤백 검증` | A | `TEST, RESOURCE_LIFECYCLE, RISK` | Injects initialization failure and proves that each prepared mutex is destroyed once and allocations are released. |
| 5 | `a7783d04107f` | `fix(lifecycle): 부분 시작과 정리 오류를 호출자에 전파` | S | `RESOURCE_LIFECYCLE, RISK, HARD` | Extends ownership evidence to worker creation, successful join, destruction permission, retryable cleanup, and `_exit` on unsafe state. |
| 6 | `7586b605302b` | `test(lifecycle): 생성·결합·정리 실패 경로 검증` | A | `TEST, RESOURCE_LIFECYCLE, EDGE` | Exercises create, join, and destroy failures across multiple partial-state positions. |
| 7 | `37b29557cccc` | `test(main): 결합 실패 시 안전하지 않은 정리 방지` | A | `TEST, RESOURCE_LIFECYCLE, RISK` | Proves the executable does not destroy resources or execute normal stdio and `atexit` teardown after an unsafe join result. |

## 5. Commit별 학습 기록

### 5.1 `16343e76b54b` — `feat(init): 테이블 저장소와 철학자 관계 초기화`

- Importance: **S**
- Tags: `ARCH, CORE, RESOURCE_LIFECYCLE`
- Source-defined role: Establishes the table as the owner of allocations and the ring objects borrowed by philosophers.
- 코드 기준: 반드시 `16343e76b54b` 시점
- 직접 parent 비교: `git diff 16343e76b54b^ 16343e76b54b --`
- Thread 직전 관련 SHA: Thread 내 첫 commit

#### Source-confirmed 맥락

이 commit은 `t_table`을 configuration, global state, fork 배열, philosopher 배열과 이후 synchronization 객체의 소유자로 두고, 각 `t_philo`가 자신의 identity와 progress field를 가지면서 table과 두 fork를 가리키도록 ownership graph를 만듭니다. fork 관계는 `forks[i]`와 `forks[(i + 1) % number]`의 ring으로 표현되며, 인접 철학자가 복사된 상태가 아니라 같은 fork 객체를 공유합니다.

이 시점의 범위는 storage와 topology입니다. synchronization 초기화는 다음 commit에서 추가되므로, final 구조를 이 SHA에 소급해서 적지 않습니다.


#### 변화 연결

| 단계 | Source-confirmed 기준 | 해당 SHA 코드 근거 |
| --- | --- | --- |
| 문제 | worker가 장기간 빌려 쓸 configuration, shared state, fork identity, philosopher-local state의 안정적인 저장소가 필요합니다. |  |
| 직전 상태 | 이 ownership graph와 ring topology가 아직 중심 구조로 확정되지 않은 상태를 parent에서 확인합니다. |  |
| 핵심 결정 | `t_table`이 두 contiguous array와 공유 상태를 소유하고, `t_philo`는 table 및 fork 객체의 주소를 빌립니다. |  |
| lifetime 결과 | worker가 빌린 주소의 유효 기간은 table-owned storage와 이후 thread quiescence 규칙에 종속됩니다. |  |

#### 해당 SHA에서 직접 확인할 코드
- [ ] `git show --name-status 16343e76b54b`로 구조체 선언, 초기화, 정리와 관련된 실제 파일을 식별합니다.
- [ ] `t_table`과 `t_philo`의 필드를 나눠 적고 각 필드가 owned value, owned allocation, borrowed pointer 중 무엇인지 표시합니다.
- [ ] fork 배열과 philosopher 배열의 allocation 순서, 크기 계산, 초기값 설정 순서를 추적합니다.
- [ ] philosopher `i`의 left/right fork 주소가 실제로 어떤 식으로 계산되는지 확인하고 `i == number - 1`의 연결을 별도로 검산합니다.
- [ ] 인접한 두 philosopher가 동일한 fork mutex 주소를 참조한다는 것을 주소 식으로 증명합니다.
- [ ] 첫 allocation 성공 후 두 번째 allocation이 실패하는 branch에서 어떤 destructor 또는 cleanup path가 호출되고, 어떤 pointer가 free·NULL 처리되는지 확인합니다.
- [ ] 이 SHA에서 synchronization object가 실제로 초기화되는지 여부를 확인하여 storage/topology 범위를 넘겨 쓰지 않습니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol |  |
| 최소 코드 구간 |  |
| caller → callee |  |
| state 또는 ownership 변화 |  |
| failure/cleanup 경로 |  |
| 직전 상태와의 차이 |  |

#### Ownership / lifetime 추적

| 대상 | Source-confirmed 관계 | 해당 SHA에서 확인한 선언·초기화 | 파괴 책임과 유효 기간 |
| --- | --- | --- | --- |
| stack-resident table value | process-level owner가 보유할 중심 객체 |  |  |
| fork 배열 | `t_table`이 소유 |  |  |
| philosopher 배열 | `t_table`이 소유 |  |  |
| `t_philo.table` | table을 빌리는 pointer |  |  |
| `left_fork`, `right_fork` | fork 배열 내부 객체를 빌리는 pointer |  |  |

#### 후속 연결

- 다음 관련 commit `1d69df7db78c`는 이 저장소 위에 mutex readiness와 partial-construction ledger를 추가합니다.
- 이후 `a7783d04107f`의 join-safety 판단은 여기서 형성된 borrowed-address 관계를 전제로 합니다.


#### 보장 범위

이 commit이 source 기준으로 보장하는 것:
- fork와 philosopher의 ownership graph 및 ring topology가 명시됩니다.
- 부분 allocation 실패가 table-level cleanup 경로로 모입니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- mutex의 staged initialization과 exact-once rollback은 아직 완성되지 않았습니다.
- worker 생성·join·destruction permission은 아직 정의되지 않았습니다.

#### 학습자 결론
- [ ] 왜 fork를 philosopher 안에 값으로 복사하면 안 되는지 실제 주소 관계로 설명합니다.
- [ ] table storage가 worker보다 먼저 파괴되면 어떤 borrowed pointer가 무효화되는지 설명합니다.
- [ ] 이 commit만으로 확립된 것과 다음 init commit이 추가하는 것을 구분합니다.

### 5.2 `1d69df7db78c` — `feat(init): 뮤텍스 수명주기와 실패 롤백 구현`

- Importance: **A**
- Tags: `RESOURCE_LIFECYCLE, ARCH, RISK`
- Source-defined role: Adds staged mutex construction and resource-readiness ledgers, but still splits rollback responsibility.
- 코드 기준: 반드시 `1d69df7db78c` 시점
- 직접 parent 비교: `git diff 1d69df7db78c^ 1d69df7db78c --`
- Thread 직전 관련 SHA: `16343e76b54b`

#### Source-confirmed 맥락

이 commit은 state mutex, print mutex, fork별 mutex를 순차적으로 초기화하고 readiness flag와 `fork_count`로 성공한 자원만 기록합니다. 정상 destruction과 실패 rollback이 같은 table-level destructor를 사용하도록 설계되지만, fork 초기화 helper도 실패 시 이미 초기화한 fork를 로컬에서 파괴하면서 `fork_count`를 그대로 남깁니다. 따라서 common destructor가 같은 mutex를 다시 파괴할 수 있는 split-responsibility 결함이 이 SHA에 남아 있습니다.


#### 변화 연결

| 단계 | Source-confirmed 기준 | 해당 SHA 코드 근거 |
| --- | --- | --- |
| 기존 가정 | 요청된 최종 자원 수가 아니라 성공적으로 준비된 자원만 cleanup해야 합니다. |  |
| 도입한 결정 | readiness flag와 `fork_count`가 synchronization ownership ledger 역할을 합니다. |  |
| 실제 위험 | fork helper와 common destructor가 동일 mutex cleanup을 모두 담당합니다. |  |
| 남은 root cause | 로컬 rollback 후 ledger가 소비되거나 수정되지 않아 destructor가 이미 파괴한 fork를 다시 owned로 볼 수 있습니다. |  |
| 후속 수정 | `10665e0a5bf9`에서 fork helper의 로컬 destruction을 제거하고 destructor만 ledger를 소비합니다. |  |

#### 해당 SHA에서 직접 확인할 코드
- [ ] `16343e76b54b`와 비교하여 새로 추가된 mutex와 resource readiness field의 초기값을 확인합니다.
- [ ] state mutex, print mutex, fork mutex의 실제 초기화 순서를 호출 그래프로 기록합니다.
- [ ] 각 `pthread_mutex_init` 성공 직후 어떤 flag 또는 count가 갱신되는지 확인합니다.
- [ ] 중간 실패 시 호출되는 table destructor가 어떤 순서로 resource를 검사하고 파괴하는지 확인합니다.
- [ ] fork 초기화 helper의 실패 branch가 이미 성공한 fork를 직접 파괴하는 구간을 찾습니다.
- [ ] 그 로컬 파괴 후 `fork_count` 값이 어떻게 남는지 확인하고 common destructor의 반복 파괴 가능 경로를 코드 순서로 작성합니다.
- [ ] 배열 free 시점과 mutex destroy 시점의 순서를 확인합니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol |  |
| 최소 코드 구간 |  |
| caller → callee |  |
| state 또는 ownership 변화 |  |
| failure/cleanup 경로 |  |
| 직전 상태와의 차이 |  |

#### Partial-construction ledger

| 초기화 단계 | 성공 증거로 기록되는 field | 실패 시 common destructor가 보는 상태 | 학습자 확인 |
| --- | --- | --- | --- |
| state mutex |  |  |  |
| print mutex |  |  |  |
| fork mutex `0..k-1` |  |  |  |
| backing arrays | pointer 존재 여부 |  |  |

#### 이 SHA의 결함 재구성

```text
성공한 fork 초기화
→ helper 내부 rollback
→ fork_count가 여전히 성공 개수를 나타냄
→ common destructor 진입
→ 동일 fork에 대한 두 번째 destruction 가능
```

위 흐름의 각 화살표에 대응하는 실제 함수와 branch를 기록합니다.


#### 보장 범위

이 commit이 source 기준으로 보장하는 것:
- 부분 초기화를 요청된 최종 상태가 아니라 recorded ownership으로 정리하려는 lifecycle 모델이 도입됩니다.
- state, print, fork mutex의 준비 상태를 destructor가 구분할 수 있습니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- fork mutex exact-once destruction은 split-responsibility 때문에 아직 보장되지 않습니다.
- thread creation/join의 quiescence evidence는 아직 ledger에 포함되지 않습니다.

#### 학습자 결론
- [ ] 왜 readiness flag와 count가 단순 편의 필드가 아니라 cleanup authorization인지 설명합니다.
- [ ] double destroy가 가능한 정확한 failure index와 두 cleanup owner를 제시합니다.
- [ ] 이 commit의 설계 방향은 유지되지만 구현 책임 분리가 왜 수정되어야 하는지 설명합니다.

### 5.3 `10665e0a5bf9` — `fix(init): 포크 초기화 실패 시 중복 정리 방지`

- Importance: **A**
- Tags: `RESOURCE_LIFECYCLE, DEBUG, RISK`
- Source-defined role: Centralizes partial fork rollback in the common destructor and restores exact-once cleanup.
- 코드 기준: 반드시 `10665e0a5bf9` 시점
- 직접 parent 비교: `git diff 10665e0a5bf9^ 10665e0a5bf9 --`
- Thread 직전 관련 SHA: `1d69df7db78c`

#### Fix chain

이 fix는 새 feature가 아니라 `1d69df7db78c`에서 생긴 rollback ownership 충돌을 바로잡습니다. fork initialization helper는 실패만 보고하고, `fork_count`를 가진 `philo_table_destroy`가 유일한 rollback owner가 됩니다. destructor는 initialized fork range를 역순으로 소비하고, shared mutex readiness와 count를 release 성공 후 초기 상태로 되돌립니다.


#### 변화 연결

| 단계 | Source-confirmed 기준 | 해당 SHA 코드 근거 |
| --- | --- | --- |
| 기존 가정 | `fork_count`가 성공적으로 초기화된 fork mutex의 authoritative ledger입니다. |  |
| 실제 failure/위험 | helper가 먼저 파괴하고 destructor가 같은 ledger를 다시 소비하여 double destroy가 가능합니다. |  |
| root cause | 동일 자원에 대한 cleanup 책임이 helper와 table destructor로 분산되어 있습니다. |  |
| 수정된 decision | helper는 failure만 반환하고 common destructor만 `fork_count`를 소비합니다. |  |
| 수정된 invariant | 각 initialized synchronization object는 한 cleanup owner에 의해 최대 한 번 파괴됩니다. |  |
| regression 연결 | `800408d6d84e`가 네 번째 init 실패를 주입하고 세 owned mutex만 한 번씩 파괴되는지 검증합니다. |  |

#### 해당 SHA에서 직접 확인할 코드
- [ ] `1d69df7db78c` 대비 fork initialization helper에서 제거된 local destroy loop를 확인합니다.
- [ ] 실패 반환 직전 `fork_count`가 성공 개수를 그대로 보존하는지 확인합니다.
- [ ] `philo_table_destroy`가 fork range를 어떤 방향으로 순회하고 count를 언제 감소시키는지 확인합니다.
- [ ] state/print mutex readiness flag가 destroy 성공 전후 언제 바뀌는지 확인합니다.
- [ ] 두 번째 destructor 호출이 이미 해제된 자원을 다시 다루지 않도록 pointer, count, flag가 어떤 상태로 남는지 확인합니다.
- [ ] pthread destroy 실패를 이 commit이 어떻게 취급하는지 확인하되, 후속 lifecycle commit의 retry model을 이 SHA에 소급하지 않습니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol |  |
| 최소 코드 구간 |  |
| caller → callee |  |
| state 또는 ownership 변화 |  |
| failure/cleanup 경로 |  |
| 직전 상태와의 차이 |  |

#### Before / after 근거

| 관점 | `1d69df7db78c` | `10665e0a5bf9` |
| --- | --- | --- |
| fork rollback owner |  |  |
| `fork_count` 소비 주체 |  |  |
| destruction 순서 |  |  |
| 두 번째 destructor 호출 결과 |  |  |


#### 보장 범위

이 commit이 source 기준으로 보장하는 것:
- partial fork initialization rollback의 cleanup owner가 common destructor 하나로 통일됩니다.
- ledger가 이미 해제된 table을 표현하도록 reset되어 repeated cleanup이 같은 destruction을 재생하지 않습니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- worker가 남아 있을 때 table destruction이 안전한지는 아직 이 fix의 범위가 아닙니다.
- 모든 pthread destructor failure에 대한 retryable lifecycle 모델은 후속 `a7783d04107f`에서 확장됩니다.

#### 학습자 결론
- [ ] 코드 재사용이 아니라 exact-once ownership invariant 때문에 common rollback이 필요한 이유를 설명합니다.
- [ ] 삭제된 local cleanup과 유지된 ledger를 한 쌍으로 제시합니다.
- [ ] regression test가 관찰해야 할 주소·count·pointer 상태를 예측한 뒤 실제 test와 대조합니다.

### 5.4 `800408d6d84e` — `test(init): 부분 뮤텍스 초기화 롤백 검증`

- Importance: **A**
- Tags: `TEST, RESOURCE_LIFECYCLE, RISK`
- Source-defined role: Injects initialization failure and proves that each prepared mutex is destroyed once and allocations are released.
- 코드 기준: 반드시 `800408d6d84e` 시점
- 직접 parent 비교: `git diff 800408d6d84e^ 800408d6d84e --`
- Thread 직전 관련 SHA: `10665e0a5bf9`

#### Source-confirmed test 역할

이 commit은 production initializer를 그대로 사용하면서 compile-time interposition으로 `pthread_mutex_init`과 `pthread_mutex_destroy`를 대체합니다. 네 번째 initialization을 실패시켜 세 mutex만 owned 상태로 만들고, destruction address를 기록하여 duplicate release를 직접 탐지합니다. 초기화 실패 후 allocation이 free·NULL 처리되는지와 두 번째 destructor 호출이 추가 destruction을 만들지 않는지도 검사합니다.


#### Test commit 분석

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariant |  |
| 재현하는 failure 또는 boundary |  |
| test technique |  |
| failure injection call index |  |
| 실제로 통과하는 production 함수 경로 |  |
| 기록하는 주소·count·pointer |  |
| 핵심 assertion |  |
| 이 테스트가 증명하는 것 |  |
| 이 테스트가 증명하지 않는 것 |  |
| broad integration / deterministic regression 구분 |  |
| 후속 변경에서 막아야 하는 회귀 |  |

#### 해당 SHA에서 직접 확인할 코드
- [ ] test build가 어떤 macro 또는 wrapper로 pthread 함수를 치환하는지 확인합니다.
- [ ] 초기화 호출 순서를 세어 왜 네 번째 call 실패가 정확히 세 owned mutex를 만드는지 대응표를 작성합니다.
- [ ] destroy wrapper가 주소를 어떤 자료구조에 기록하고 duplicate를 어떻게 판별하는지 확인합니다.
- [ ] test가 호출하는 production initializer와 common destructor의 실제 symbol을 확인합니다.
- [ ] allocation release 및 pointer NULL assertion을 확인합니다.
- [ ] 두 번째 destructor 호출 전후 destroy-call count가 변하지 않는 assertion을 확인합니다.
- [ ] test 전용 branch가 production source에 추가되지 않았는지 확인합니다.

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
- 지정한 partial-init 경계에서 정확히 owned mutex만 한 번씩 파괴되는지 결정적으로 검증합니다.
- 초기화 실패 후 table cleanup의 idempotent 관찰 상태를 검증합니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- 자연 발생하는 모든 allocation/pthread failure 조합을 포괄하지 않습니다.
- thread creation, join, live borrower가 있는 teardown은 검증하지 않습니다.

#### 학습자 결론
- [ ] 이 test가 shell smoke보다 root cause에 더 직접적인 이유를 설명합니다.
- [ ] 실패 index, owned resource 수, expected destruction address 수를 계산합니다.
- [ ] test가 production rollback ledger를 실제로 통과한다는 근거를 제시합니다.

### 5.5 `a7783d04107f` — `fix(lifecycle): 부분 시작과 정리 오류를 호출자에 전파`

- Importance: **S**
- Tags: `RESOURCE_LIFECYCLE, RISK, HARD`
- Source-defined role: Extends ownership evidence to worker creation, successful join, destruction permission, retryable cleanup, and `_exit` on unsafe state.
- 코드 기준: 반드시 `a7783d04107f` 시점
- 직접 parent 비교: `git diff a7783d04107f^ a7783d04107f --`
- Thread 직전 관련 SHA: `800408d6d84e`

#### Source-confirmed 맥락

이 S-level fix는 initialization ledger 원칙을 thread quiescence와 retryable destruction까지 확장합니다. table은 성공적으로 시작한 worker 수, 성공적으로 join한 worker 수, destruction safety를 기록합니다. join을 시도했다는 사실은 quiescence의 증거가 아니며, 성공한 join만 ledger를 전진시킵니다. 하나라도 join을 입증하지 못하면 `PHILO_UNSAFE`가 반환되고 table destruction은 거부됩니다.

destructor는 pthread resource destruction이 성공한 뒤에만 해당 ledger를 감소시키거나 readiness flag를 지웁니다. `main`은 unsafe verdict를 일반 오류와 구분해 unbuffered diagnostic 후 `_exit`하며, table destruction, stdio flush, normal exit handler를 거치지 않습니다.


#### 변화 연결

| 단계 | Source-confirmed 기준 | 해당 SHA 코드 근거 |
| --- | --- | --- |
| 기존 상태 | control flow가 `philo_run` 끝에 도달하면 worker가 종료되었다고 전제하고 cleanup할 수 있었습니다. |  |
| 실제 failure/위험 | 실패한 `pthread_join`은 worker가 멈췄다는 증거가 아니므로 table free 또는 live mutex destroy가 use-after-free를 만들 수 있습니다. |  |
| root cause | thread handle에 대한 시도와 borrower quiescence에 대한 증거를 구분하지 않았습니다. |  |
| 핵심 결정 | `threads_started`, `threads_joined`, `destroy_safe`와 `PHILO_UNSAFE`로 destruction permission을 명시합니다. |  |
| cleanup 결정 | 모든 started worker의 successful join이 증명될 때만 shared table resource를 파괴합니다. |  |
| process 결정 | quiescence를 증명하지 못하면 graceful cleanup 대신 `_exit`로 normal teardown을 우회합니다. |  |
| retry 결정 | resource destroy 성공 후에만 ledger를 소비하여 mid-destruction failure 뒤 재시도를 허용합니다. |  |

#### 해당 SHA에서 직접 확인할 코드
- [ ] public status model에서 `PHILO_UNSAFE`가 정의되고 ordinary error와 어떻게 구분되는지 확인합니다.
- [ ] `t_table`의 `threads_started`, `threads_joined`, `destroy_safe` 초기값과 갱신 지점을 모두 찾습니다.
- [ ] worker creation 성공 직후 started ledger가 증가하는 순서를 확인합니다.
- [ ] `join_started`가 모든 recorded handle을 시도하는지, 성공한 join만 joined ledger에 반영하는지 확인합니다.
- [ ] creation error 또는 barrier error와 join unsafe가 동시에 존재할 때 반환 우선순위를 확인합니다.
- [ ] `philo_table_destroy`가 quiescence ledger를 검사하고 unsafe일 때 pointer, fork_count, destruction call을 건드리지 않는지 확인합니다.
- [ ] mutex/condition destroy 실패 시 count 또는 readiness flag가 성공 전에 지워지지 않는지 확인합니다.
- [ ] `main`의 safe run failure, cleanup failure, unsafe run failure 분기를 나란히 추적합니다.
- [ ] unsafe branch에서 unbuffered output 뒤 `_exit`가 호출되고 table destructor나 `exit`/return 경로로 이어지지 않는지 확인합니다.
- [ ] stack-resident table과 worker가 빌린 arrays/mutex 사이의 lifetime을 sequence diagram으로 기록합니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol |  |
| 최소 코드 구간 |  |
| caller → callee |  |
| state 또는 ownership 변화 |  |
| failure/cleanup 경로 |  |
| 직전 상태와의 차이 |  |

#### Quiescence와 destruction authorization

| 관찰 상태 | Source-confirmed verdict | 실제 조건식·반환 경로 |
| --- | --- | --- |
| `threads_started == threads_joined`, destroy state 정상 | destruction을 시도할 수 있음 |  |
| join 하나 이상 실패 | `PHILO_UNSAFE`; destruction 거부 |  |
| 일부 pthread resource destroy 실패 | 남은 ownership ledger 보존; 재시도 가능 |  |
| unsafe verdict가 ordinary run error와 함께 존재 | unsafe가 safety verdict로 우선 |  |

#### 핵심 lifetime 설명 기록

```text
table-owned storage 생성
→ worker handle 시작 및 borrowed access 가능
→ terminal/abort publication
→ 모든 started handle에 join 시도
→ successful join 수로 quiescence 증명
→ [safe] ledger-driven destroy
   [unsafe] diagnostic + _exit
```

각 단계에 실제 함수, state field, lock 또는 return status를 붙입니다.


#### 보장 범위

이 commit이 source 기준으로 보장하는 것:
- shared table resource destruction은 successful join으로 모든 borrower의 quiescence를 입증한 뒤에만 허용됩니다.
- join failure는 ordinary cleanup error가 아니라 unsafe verdict로 전파됩니다.
- mid-destruction failure 뒤 아직 owned인 resource의 ledger가 보존되어 명시적 retry가 가능합니다.
- unsafe path는 normal process teardown을 의도적으로 우회합니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- 실패한 join 대상 worker가 실제로 종료되었다고 추정하지 않습니다.
- unsafe path에서 graceful resource release를 보장하지 않으며, 안전을 위해 의도적으로 포기합니다.
- pthread 또는 output의 모든 가능한 실패를 해결했다는 뜻은 아닙니다.

#### 후속 regression evidence

- `7586b605302b`: create, join, destroy failure를 여러 index에 주입하여 partial-state ledger와 retryability를 검증합니다.
- `37b29557cccc`: executable 수준에서 unsafe branch가 destructor, buffered stdio, `atexit`를 실행하지 않는지 검증합니다.


#### 학습자 결론
- [ ] 왜 `pthread_join` 호출 시도와 successful join을 다른 lifecycle 사실로 취급해야 하는지 설명합니다.
- [ ] borrowed pointer 모델이 `PHILO_UNSAFE`와 `_exit` 결정으로 이어지는 논리를 설명합니다.
- [ ] destructor failure에서 ledger를 성공 후에만 소비해야 retry가 가능한 이유를 실제 code order로 제시합니다.
- [ ] ordinary error와 unsafe verdict의 우선순위를 호출 흐름 전체에서 설명합니다.

### 5.6 `7586b605302b` — `test(lifecycle): 생성·결합·정리 실패 경로 검증`

- Importance: **A**
- Tags: `TEST, RESOURCE_LIFECYCLE, EDGE`
- Source-defined role: Exercises create, join, and destroy failures across multiple partial-state positions.
- 코드 기준: 반드시 `7586b605302b` 시점
- 직접 parent 비교: `git diff 7586b605302b^ 7586b605302b --`
- Thread 직전 관련 SHA: `a7783d04107f`

#### Source-confirmed test 역할

이 deterministic failure matrix는 thread creation, joining, mutex destruction을 wrapper로 대체합니다. 세 worker run의 각 creation 위치에서 실패를 주입하고, 성공적으로 시작된 prefix만 join되는지 확인합니다. join 실패 시에는 다른 worker join을 계속하더라도 failed worker가 unjoined로 남고, table destructor가 resource 상태를 변경하지 않은 채 `PHILO_UNSAFE`를 반환해야 합니다. destroy failure는 reverse cleanup의 여러 단계에 주입되며, 첫 실패 뒤 ledger가 owned state를 유지하고 재호출로 cleanup이 끝나는지 검사합니다.


#### Test commit 분석

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariant |  |
| create failure index별 started/joined 예상값 |  |
| join failure 후 unsafe verdict와 보존되어야 할 state |  |
| destroy failure stage별 남아야 할 ledger |  |
| test technique와 real API delegation |  |
| 실제로 통과하는 production 코드 경로 |  |
| 핵심 positive assertion |  |
| 핵심 negative assertion |  |
| 재시도 절차 |  |
| 이 테스트가 증명하는 것 |  |
| 이 테스트가 증명하지 않는 것 |  |
| deterministic failure matrix 분류 |  |
| 후속 회귀 방지 대상 |  |

#### 해당 SHA에서 직접 확인할 코드
- [ ] create wrapper가 몇 번째 호출에서 실패하도록 설정되고 각 case가 어떻게 반복되는지 확인합니다.
- [ ] 각 case에서 production `philo_run` 또는 join helper가 보는 `threads_started`와 `threads_joined`를 기록합니다.
- [ ] join wrapper가 특정 handle에서 실패한 뒤 나머지 join을 계속하는지 확인합니다.
- [ ] unsafe 상태에서 destructor 호출 전후 fork pointer, fork_count, readiness flag, destroy-call count가 동일하다는 assertion을 확인합니다.
- [ ] test가 실패한 worker를 real `pthread_join`으로 정리하고 test ledger를 수선한 뒤 production cleanup을 다시 허용하는 절차를 확인합니다.
- [ ] destroy failure injection이 reverse order의 서로 다른 지점을 겨냥하는지 확인합니다.
- [ ] 첫 destructor 실패 후 backing allocation과 remaining ledger가 truthfully owned state를 나타내는지 확인합니다.
- [ ] 두 번째 destructor 호출에서 injection을 해제하고 cleanup이 완료되는 assertion을 확인합니다.

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
- zero, partial, nearly complete construction/teardown 위치에서 lifecycle arithmetic과 verdict를 결정적으로 검증합니다.
- unsafe refusal가 resource 상태를 보존하고 destroy failure가 retryable state를 남기는지 검증합니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- 모든 OS-level pthread failure 동작이나 실제 scheduler interleaving을 재현하지 않습니다.
- failed join worker의 실제 내부 상태를 증명하지 않으며, 바로 그 불확실성 때문에 unsafe로 취급합니다.

#### 학습자 결론
- [ ] 각 failure index에 대해 expected started/joined/destruction count를 표로 계산합니다.
- [ ] unsafe test가 실패한 worker를 사후 정리하는 test-only 절차와 production verdict를 구분합니다.
- [ ] retryability를 단순한 두 번째 호출 성공이 아니라 ledger 보존으로 증명하는 assertion을 설명합니다.

### 5.7 `37b29557cccc` — `test(main): 결합 실패 시 안전하지 않은 정리 방지`

- Importance: **A**
- Tags: `TEST, RESOURCE_LIFECYCLE, RISK`
- Source-defined role: Proves the executable does not destroy resources or execute normal stdio and `atexit` teardown after an unsafe join result.
- 코드 기준: 반드시 `37b29557cccc` 시점
- 직접 parent 비교: `git diff 37b29557cccc^ 37b29557cccc --`
- Thread 직전 관련 SHA: `7586b605302b`

#### Source-confirmed test 역할

이 process-level negative test는 real `main` 주변의 parse, init, run, destroy를 대체합니다. run stub은 buffered standard output을 남기고 `PHILO_UNSAFE`를 반환하며, parse 단계는 `atexit` hook을 등록합니다. destroy stub도 호출되면 보이는 marker를 출력합니다. child process 결과에는 unbuffered join diagnostic만 있어야 하고 destroy marker, buffered output, normal exit-hook output은 없어야 합니다.


#### Test commit 분석

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariant |  |
| 주입하는 unsafe 결과 |  |
| buffered stdout의 역할 |  |
| `atexit` hook의 역할 |  |
| destroy marker의 역할 |  |
| 실제로 실행하는 `main` 분기 |  |
| 반드시 존재해야 하는 출력/상태 |  |
| 반드시 없어야 하는 출력/상태 |  |
| `_exit`와 return/`exit`의 관찰 차이 |  |
| 이 테스트가 증명하는 것 |  |
| 이 테스트가 증명하지 않는 것 |  |
| deterministic process-level regression 분류 |  |
| 후속 회귀 방지 대상 |  |

#### 해당 SHA에서 직접 확인할 코드
- [ ] real `main`을 test binary에서 어떻게 포함하거나 연결하는지 확인합니다.
- [ ] parse/init/run/destroy stub의 반환값과 side effect를 기록합니다.
- [ ] stdout이 flush되지 않도록 어떤 방식으로 buffered output을 준비하는지 확인합니다.
- [ ] `atexit` hook과 destroy stub marker가 각각 normal teardown의 어느 부분을 감지하는지 확인합니다.
- [ ] child process의 stderr/stdout/exit status를 test runner가 어떻게 수집하는지 확인합니다.
- [ ] unbuffered unsafe diagnostic이 존재하는 assertion을 확인합니다.
- [ ] destroy marker, buffered output, exit-hook output의 부재를 각각 확인하는 negative assertion을 찾습니다.
- [ ] 단순히 destructor를 건너뛰는 것과 `_exit`로 normal teardown 전체를 건너뛰는 것의 차이를 코드 경로로 설명합니다.

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
- unsafe verdict에서 `main`이 table destruction과 normal stdio/`atexit` teardown을 실행하지 않는 process contract를 검증합니다.
- unbuffered diagnostic은 `_exit` 전에 관찰 가능함을 검증합니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- 실제 `pthread_join` failure 자체를 이 test가 발생시키는 것은 아닙니다.
- unsafe worker가 어떤 상태인지 또는 OS가 process 자원을 어떻게 회수하는지 증명하지 않습니다.

#### 학습자 결론
- [ ] 왜 destroy 호출 부재만 확인해서는 `_exit` contract를 충분히 증명하지 못하는지 설명합니다.
- [ ] 세 negative signal이 각각 어떤 잘못된 normal teardown 경로를 잡는지 설명합니다.
- [ ] Thread 전체가 allocation owner에서 process-level destruction verdict로 발전한 과정을 이 test까지 연결합니다.

## 6. Invariant ledger

Source가 확정한 invariant의 시간상 역할만 미리 배치했습니다. 실제 field, 함수, mutation 순서와 test evidence는 학습자가 해당 SHA에서 채웁니다.

| Invariant | 최초 도입 또는 문제 노출 | 강화·복구 | regression evidence | 해당 SHA 코드 근거 | 최종 설명 |
| --- | --- | --- | --- | --- | --- |
| table이 allocation을 소유하고 philosopher는 주소를 빌림 | `16343e76b54b` | `a7783d04107f`에서 borrower quiescence가 destruction permission으로 확장 | `7586b605302b`, `37b29557cccc` |  |  |
| partial initialization은 성공한 resource만 ledger에 기록 | `1d69df7db78c` | `10665e0a5bf9`에서 common destructor 단독 소비로 복구 | `800408d6d84e` |  |  |
| initialized mutex는 최대 한 번 파괴 | `1d69df7db78c`에서 split rollback으로 부족함 노출 | `10665e0a5bf9` | `800408d6d84e` |  |  |
| destroy 실패 뒤 remaining ownership state는 truthful하고 retryable | `a7783d04107f` | 동일 commit의 success-after-destroy ledger update | `7586b605302b` |  |  |
| shared table resource는 모든 started worker의 successful join 뒤에만 파괴 | `a7783d04107f` | unsafe verdict와 destructor refusal | `7586b605302b`, `37b29557cccc` |  |  |
| unsafe process path는 normal teardown을 실행하지 않음 | `a7783d04107f` | `_exit` process contract | `37b29557cccc` |  |  |

## 7. Failure → Fix → Test 연결

### 7.1 Partial fork initialization rollback

```text
`1d69df7db78c`
recorded fork ownership 도입
→ helper와 destructor가 모두 cleanup
→ duplicate destruction 위험
→ `10665e0a5bf9`
common destructor가 유일한 ledger consumer
→ `800408d6d84e`
네 번째 init failure + destruction address 기록
```

- 기존 가정의 실제 코드:
- failure branch와 root cause:
- fix에서 삭제·이동된 cleanup 책임:
- regression assertion:
- 이 연결이 보장하는 exact-once 범위:
- 이 연결이 보장하지 않는 범위:

### 7.2 Join failure와 unsafe destruction

```text
worker가 started됨
→ join call 실패
→ quiescence를 입증하지 못함
→ table을 파괴하면 live borrower와 충돌 가능
→ `a7783d04107f`
started/joined ledger + PHILO_UNSAFE + destructor refusal + _exit
→ `7586b605302b`
join/destroy failure matrix
→ `37b29557cccc`
normal process teardown 부재 검증
```

- 기존 cleanup 가정:
- failed join이 남기는 불확실성:
- unsafe verdict가 ordinary error보다 우선하는 코드:
- destructor refusal 시 보존되는 state:
- `_exit` 전후 관찰 가능한 output:
- 두 test가 서로 다르게 증명하는 범위:

## 8. Ownership / state / responsibility 변화

| 시점 | Allocation ownership | Synchronization ownership | Worker lifetime evidence | Destruction responsibility | 학습자 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| `16343e76b54b` | table이 arrays 소유 | 아직 후속 단계 | 아직 없음 | table-level cleanup |  |
| `1d69df7db78c` | 기존 유지 | readiness flag와 `fork_count` 도입 | 아직 없음 | helper와 destructor가 충돌 |  |
| `10665e0a5bf9` | 기존 유지 | common destructor가 fork ledger 단독 소비 | 아직 없음 | exact-once rollback owner 통일 |  |
| `a7783d04107f` | worker가 빌린 storage까지 lifetime 판단에 포함 | destroy 성공 후 ledger 소비 | started/joined로 quiescence 입증 | safe면 retryable destroy, unsafe면 거부 |  |
| executable unsafe path | process가 즉시 종료 | normal teardown 생략 | 미입증 상태를 그대로 unsafe로 취급 | `_exit`가 최종 process decision |  |

## 9. Thread 최종 상태

### Source-confirmed 최종 상태

- table ownership graph는 allocation뿐 아니라 synchronization resource와 worker borrower lifetime의 근거가 됩니다.
- partial initialization과 partial destruction은 recorded ownership을 통해 정리됩니다.
- successful join 수가 모든 started worker의 quiescence를 입증해야 table destruction이 허용됩니다.
- join safety가 불명확하면 `PHILO_UNSAFE`가 반환되고 normal cleanup 대신 `_exit`가 사용됩니다.
- destroy failure는 remaining ledger를 보존해 safe한 명시적 retry를 허용합니다.

### 학습자가 작성할 최종 설명

- ownership graph:
- construction ledger:
- exact-once rollback:
- quiescence proof:
- safe destruction predicate:
- retryable destroy:
- unsafe process termination:
- 의도적으로 보장하지 않는 graceful cleanup:

## 10. 최종 architecture 또는 execution flow 정리

다음 골격에 실제 함수명, field, return status, lock/resource mutation을 채웁니다.

```text
main의 stack-resident table
    ↓ initialize
table-owned arrays + synchronization ledger
    ↓ create workers
started ledger + borrowed table/fork addresses
    ↓ terminal 또는 abort
join every recorded worker
    ├─ all required joins successful
    │      ↓
    │  destroy_safe verdict
    │      ↓
    │  reverse, ledger-driven, retryable destruction
    └─ one or more joins not proven
           ↓
       PHILO_UNSAFE
           ↓
       unbuffered diagnostic
           ↓
       _exit without destructor / stdio flush / atexit
```

- 각 화살표의 production symbol:
- 각 단계의 success ledger mutation:
- 각 failure branch의 return precedence:
- worker가 table을 역참조할 수 있는 마지막 지점:
- destruction이 합법화되는 정확한 조건:
- test가 각 branch를 관찰하는 방식:

## 11. 학습 완료 자가 점검

- [ ] final HEAD의 field나 cleanup 순서를 과거 SHA에 소급하지 않았습니다.
- [ ] `16343e76b54b`의 owned/borrowed 주소 관계를 실제 선언으로 증명했습니다.
- [ ] `1d69df7db78c`의 double-destroy 가능 경로를 두 cleanup owner로 설명했습니다.
- [ ] `10665e0a5bf9`에서 authoritative ledger consumer가 하나가 되는 변경을 제시했습니다.
- [ ] `800408d6d84e`의 failure index와 destruction address assertion을 설명했습니다.
- [ ] `a7783d04107f`의 started/joined/destruction verdict와 `_exit`를 호출 흐름으로 설명했습니다.
- [ ] `7586b605302b`에서 각 failure index의 expected ledger를 계산했습니다.
- [ ] `37b29557cccc`의 negative assertions가 normal teardown 부재를 어떻게 증명하는지 설명했습니다.
- [ ] exact-once cleanup과 graceful cleanup을 혼동하지 않았습니다.
- [ ] successful join을 borrower quiescence의 증거로 사용하는 이유를 설명할 수 있습니다.
