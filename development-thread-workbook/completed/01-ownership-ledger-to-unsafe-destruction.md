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

- [x] `t_table`과 `t_philo`의 owned/borrowed 관계를 실제 field로 설명할 수 있습니다.
- [x] ring fork mapping이 stable shared identity를 만드는 코드를 해당 SHA에서 제시할 수 있습니다.
- [x] staged initialization의 readiness flag와 count가 어떤 순서로 갱신되는지 설명할 수 있습니다.
- [x] duplicate rollback의 두 cleanup owner와 실제 double-destroy 가능 경로를 재구성할 수 있습니다.
- [x] common destructor가 exact-once cleanup을 복구하는 변경을 before/after로 제시할 수 있습니다.
- [x] started/joined ledger와 destruction permission의 조건식을 설명할 수 있습니다.
- [x] failed destroy 뒤 retry 가능한 state가 보존되는 코드를 제시할 수 있습니다.
- [x] unsafe `main` path가 destructor, buffered stdio, `atexit`를 건너뛰는 것을 test 근거로 설명할 수 있습니다.
- [x] 이 Thread가 보장하지 않는 graceful cleanup과 실제 failed worker 상태를 구분할 수 있습니다.

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
| 문제 | worker가 장기간 빌려 쓸 configuration, shared state, fork identity, philosopher-local state의 안정적인 저장소가 필요합니다. | §12 완료 기록의 대응 근거 참조 |
| 직전 상태 | 이 ownership graph와 ring topology가 아직 중심 구조로 확정되지 않은 상태를 parent에서 확인합니다. | §12 완료 기록의 대응 근거 참조 |
| 핵심 결정 | `t_table`이 두 contiguous array와 공유 상태를 소유하고, `t_philo`는 table 및 fork 객체의 주소를 빌립니다. | §12 완료 기록의 대응 근거 참조 |
| lifetime 결과 | worker가 빌린 주소의 유효 기간은 table-owned storage와 이후 thread quiescence 규칙에 종속됩니다. | §12 완료 기록의 대응 근거 참조 |

#### 해당 SHA에서 직접 확인할 코드
- [x] `git show --name-status 16343e76b54b`로 구조체 선언, 초기화, 정리와 관련된 실제 파일을 식별합니다.
- [x] `t_table`과 `t_philo`의 필드를 나눠 적고 각 필드가 owned value, owned allocation, borrowed pointer 중 무엇인지 표시합니다.
- [x] fork 배열과 philosopher 배열의 allocation 순서, 크기 계산, 초기값 설정 순서를 추적합니다.
- [x] philosopher `i`의 left/right fork 주소가 실제로 어떤 식으로 계산되는지 확인하고 `i == number - 1`의 연결을 별도로 검산합니다.
- [x] 인접한 두 philosopher가 동일한 fork mutex 주소를 참조한다는 것을 주소 식으로 증명합니다.
- [x] 첫 allocation 성공 후 두 번째 allocation이 실패하는 branch에서 어떤 destructor 또는 cleanup path가 호출되고, 어떤 pointer가 free·NULL 처리되는지 확인합니다.
- [x] 이 SHA에서 synchronization object가 실제로 초기화되는지 여부를 확인하여 storage/topology 범위를 넘겨 쓰지 않습니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol | §12 완료 기록의 대응 근거 참조 |
| 최소 코드 구간 | §12 완료 기록의 대응 근거 참조 |
| caller → callee | §12 완료 기록의 대응 근거 참조 |
| state 또는 ownership 변화 | §12 완료 기록의 대응 근거 참조 |
| failure/cleanup 경로 | §12 완료 기록의 대응 근거 참조 |
| 직전 상태와의 차이 | §12 완료 기록의 대응 근거 참조 |

#### Ownership / lifetime 추적

| 대상 | Source-confirmed 관계 | 해당 SHA에서 확인한 선언·초기화 | 파괴 책임과 유효 기간 |
| --- | --- | --- | --- |
| stack-resident table value | process-level owner가 보유할 중심 객체 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| fork 배열 | `t_table`이 소유 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| philosopher 배열 | `t_table`이 소유 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| `t_philo.table` | table을 빌리는 pointer | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| `left_fork`, `right_fork` | fork 배열 내부 객체를 빌리는 pointer | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |

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
- [x] 왜 fork를 philosopher 안에 값으로 복사하면 안 되는지 실제 주소 관계로 설명합니다.
- [x] table storage가 worker보다 먼저 파괴되면 어떤 borrowed pointer가 무효화되는지 설명합니다.
- [x] 이 commit만으로 확립된 것과 다음 init commit이 추가하는 것을 구분합니다.

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
| 기존 가정 | 요청된 최종 자원 수가 아니라 성공적으로 준비된 자원만 cleanup해야 합니다. | §12 완료 기록의 대응 근거 참조 |
| 도입한 결정 | readiness flag와 `fork_count`가 synchronization ownership ledger 역할을 합니다. | §12 완료 기록의 대응 근거 참조 |
| 실제 위험 | fork helper와 common destructor가 동일 mutex cleanup을 모두 담당합니다. | §12 완료 기록의 대응 근거 참조 |
| 남은 root cause | 로컬 rollback 후 ledger가 소비되거나 수정되지 않아 destructor가 이미 파괴한 fork를 다시 owned로 볼 수 있습니다. | §12 완료 기록의 대응 근거 참조 |
| 후속 수정 | `10665e0a5bf9`에서 fork helper의 로컬 destruction을 제거하고 destructor만 ledger를 소비합니다. | §12 완료 기록의 대응 근거 참조 |

#### 해당 SHA에서 직접 확인할 코드
- [x] `16343e76b54b`와 비교하여 새로 추가된 mutex와 resource readiness field의 초기값을 확인합니다.
- [x] state mutex, print mutex, fork mutex의 실제 초기화 순서를 호출 그래프로 기록합니다.
- [x] 각 `pthread_mutex_init` 성공 직후 어떤 flag 또는 count가 갱신되는지 확인합니다.
- [x] 중간 실패 시 호출되는 table destructor가 어떤 순서로 resource를 검사하고 파괴하는지 확인합니다.
- [x] fork 초기화 helper의 실패 branch가 이미 성공한 fork를 직접 파괴하는 구간을 찾습니다.
- [x] 그 로컬 파괴 후 `fork_count` 값이 어떻게 남는지 확인하고 common destructor의 반복 파괴 가능 경로를 코드 순서로 작성합니다.
- [x] 배열 free 시점과 mutex destroy 시점의 순서를 확인합니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol | §12 완료 기록의 대응 근거 참조 |
| 최소 코드 구간 | §12 완료 기록의 대응 근거 참조 |
| caller → callee | §12 완료 기록의 대응 근거 참조 |
| state 또는 ownership 변화 | §12 완료 기록의 대응 근거 참조 |
| failure/cleanup 경로 | §12 완료 기록의 대응 근거 참조 |
| 직전 상태와의 차이 | §12 완료 기록의 대응 근거 참조 |

#### Partial-construction ledger

| 초기화 단계 | 성공 증거로 기록되는 field | 실패 시 common destructor가 보는 상태 | 학습자 확인 |
| --- | --- | --- | --- |
| state mutex | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| print mutex | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| fork mutex `0..k-1` | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| backing arrays | pointer 존재 여부 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |

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
- [x] 왜 readiness flag와 count가 단순 편의 필드가 아니라 cleanup authorization인지 설명합니다.
- [x] double destroy가 가능한 정확한 failure index와 두 cleanup owner를 제시합니다.
- [x] 이 commit의 설계 방향은 유지되지만 구현 책임 분리가 왜 수정되어야 하는지 설명합니다.

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
| 기존 가정 | `fork_count`가 성공적으로 초기화된 fork mutex의 authoritative ledger입니다. | §12 완료 기록의 대응 근거 참조 |
| 실제 failure/위험 | helper가 먼저 파괴하고 destructor가 같은 ledger를 다시 소비하여 double destroy가 가능합니다. | §12 완료 기록의 대응 근거 참조 |
| root cause | 동일 자원에 대한 cleanup 책임이 helper와 table destructor로 분산되어 있습니다. | §12 완료 기록의 대응 근거 참조 |
| 수정된 decision | helper는 failure만 반환하고 common destructor만 `fork_count`를 소비합니다. | §12 완료 기록의 대응 근거 참조 |
| 수정된 invariant | 각 initialized synchronization object는 한 cleanup owner에 의해 최대 한 번 파괴됩니다. | §12 완료 기록의 대응 근거 참조 |
| regression 연결 | `800408d6d84e`가 네 번째 init 실패를 주입하고 세 owned mutex만 한 번씩 파괴되는지 검증합니다. | §12 완료 기록의 대응 근거 참조 |

#### 해당 SHA에서 직접 확인할 코드
- [x] `1d69df7db78c` 대비 fork initialization helper에서 제거된 local destroy loop를 확인합니다.
- [x] 실패 반환 직전 `fork_count`가 성공 개수를 그대로 보존하는지 확인합니다.
- [x] `philo_table_destroy`가 fork range를 어떤 방향으로 순회하고 count를 언제 감소시키는지 확인합니다.
- [x] state/print mutex readiness flag가 destroy 성공 전후 언제 바뀌는지 확인합니다.
- [x] 두 번째 destructor 호출이 이미 해제된 자원을 다시 다루지 않도록 pointer, count, flag가 어떤 상태로 남는지 확인합니다.
- [x] pthread destroy 실패를 이 commit이 어떻게 취급하는지 확인하되, 후속 lifecycle commit의 retry model을 이 SHA에 소급하지 않습니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol | §12 완료 기록의 대응 근거 참조 |
| 최소 코드 구간 | §12 완료 기록의 대응 근거 참조 |
| caller → callee | §12 완료 기록의 대응 근거 참조 |
| state 또는 ownership 변화 | §12 완료 기록의 대응 근거 참조 |
| failure/cleanup 경로 | §12 완료 기록의 대응 근거 참조 |
| 직전 상태와의 차이 | §12 완료 기록의 대응 근거 참조 |

#### Before / after 근거

| 관점 | `1d69df7db78c` | `10665e0a5bf9` |
| --- | --- | --- |
| fork rollback owner | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| `fork_count` 소비 주체 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| destruction 순서 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| 두 번째 destructor 호출 결과 | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |


#### 보장 범위

이 commit이 source 기준으로 보장하는 것:
- partial fork initialization rollback의 cleanup owner가 common destructor 하나로 통일됩니다.
- ledger가 이미 해제된 table을 표현하도록 reset되어 repeated cleanup이 같은 destruction을 재생하지 않습니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- worker가 남아 있을 때 table destruction이 안전한지는 아직 이 fix의 범위가 아닙니다.
- 모든 pthread destructor failure에 대한 retryable lifecycle 모델은 후속 `a7783d04107f`에서 확장됩니다.

#### 학습자 결론
- [x] 코드 재사용이 아니라 exact-once ownership invariant 때문에 common rollback이 필요한 이유를 설명합니다.
- [x] 삭제된 local cleanup과 유지된 ledger를 한 쌍으로 제시합니다.
- [x] regression test가 관찰해야 할 주소·count·pointer 상태를 예측한 뒤 실제 test와 대조합니다.

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
| 대상 production invariant | §12 완료 기록의 대응 근거 참조 |
| 재현하는 failure 또는 boundary | §12 완료 기록의 대응 근거 참조 |
| test technique | §12 완료 기록의 대응 근거 참조 |
| failure injection call index | §12 완료 기록의 대응 근거 참조 |
| 실제로 통과하는 production 함수 경로 | §12 완료 기록의 대응 근거 참조 |
| 기록하는 주소·count·pointer | §12 완료 기록의 대응 근거 참조 |
| 핵심 assertion | §12 완료 기록의 대응 근거 참조 |
| 이 테스트가 증명하는 것 | §12 완료 기록의 대응 근거 참조 |
| 이 테스트가 증명하지 않는 것 | §12 완료 기록의 대응 근거 참조 |
| broad integration / deterministic regression 구분 | §12 완료 기록의 대응 근거 참조 |
| 후속 변경에서 막아야 하는 회귀 | §12 완료 기록의 대응 근거 참조 |

#### 해당 SHA에서 직접 확인할 코드
- [x] test build가 어떤 macro 또는 wrapper로 pthread 함수를 치환하는지 확인합니다.
- [x] 초기화 호출 순서를 세어 왜 네 번째 call 실패가 정확히 세 owned mutex를 만드는지 대응표를 작성합니다.
- [x] destroy wrapper가 주소를 어떤 자료구조에 기록하고 duplicate를 어떻게 판별하는지 확인합니다.
- [x] test가 호출하는 production initializer와 common destructor의 실제 symbol을 확인합니다.
- [x] allocation release 및 pointer NULL assertion을 확인합니다.
- [x] 두 번째 destructor 호출 전후 destroy-call count가 변하지 않는 assertion을 확인합니다.
- [x] test 전용 branch가 production source에 추가되지 않았는지 확인합니다.

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
- 지정한 partial-init 경계에서 정확히 owned mutex만 한 번씩 파괴되는지 결정적으로 검증합니다.
- 초기화 실패 후 table cleanup의 idempotent 관찰 상태를 검증합니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- 자연 발생하는 모든 allocation/pthread failure 조합을 포괄하지 않습니다.
- thread creation, join, live borrower가 있는 teardown은 검증하지 않습니다.

#### 학습자 결론
- [x] 이 test가 shell smoke보다 root cause에 더 직접적인 이유를 설명합니다.
- [x] 실패 index, owned resource 수, expected destruction address 수를 계산합니다.
- [x] test가 production rollback ledger를 실제로 통과한다는 근거를 제시합니다.

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
| 기존 상태 | control flow가 `philo_run` 끝에 도달하면 worker가 종료되었다고 전제하고 cleanup할 수 있었습니다. | §12 완료 기록의 대응 근거 참조 |
| 실제 failure/위험 | 실패한 `pthread_join`은 worker가 멈췄다는 증거가 아니므로 table free 또는 live mutex destroy가 use-after-free를 만들 수 있습니다. | §12 완료 기록의 대응 근거 참조 |
| root cause | thread handle에 대한 시도와 borrower quiescence에 대한 증거를 구분하지 않았습니다. | §12 완료 기록의 대응 근거 참조 |
| 핵심 결정 | `threads_started`, `threads_joined`, `destroy_safe`와 `PHILO_UNSAFE`로 destruction permission을 명시합니다. | §12 완료 기록의 대응 근거 참조 |
| cleanup 결정 | 모든 started worker의 successful join이 증명될 때만 shared table resource를 파괴합니다. | §12 완료 기록의 대응 근거 참조 |
| process 결정 | quiescence를 증명하지 못하면 graceful cleanup 대신 `_exit`로 normal teardown을 우회합니다. | §12 완료 기록의 대응 근거 참조 |
| retry 결정 | resource destroy 성공 후에만 ledger를 소비하여 mid-destruction failure 뒤 재시도를 허용합니다. | §12 완료 기록의 대응 근거 참조 |

#### 해당 SHA에서 직접 확인할 코드
- [x] public status model에서 `PHILO_UNSAFE`가 정의되고 ordinary error와 어떻게 구분되는지 확인합니다.
- [x] `t_table`의 `threads_started`, `threads_joined`, `destroy_safe` 초기값과 갱신 지점을 모두 찾습니다.
- [x] worker creation 성공 직후 started ledger가 증가하는 순서를 확인합니다.
- [x] `join_started`가 모든 recorded handle을 시도하는지, 성공한 join만 joined ledger에 반영하는지 확인합니다.
- [x] creation error 또는 barrier error와 join unsafe가 동시에 존재할 때 반환 우선순위를 확인합니다.
- [x] `philo_table_destroy`가 quiescence ledger를 검사하고 unsafe일 때 pointer, fork_count, destruction call을 건드리지 않는지 확인합니다.
- [x] mutex/condition destroy 실패 시 count 또는 readiness flag가 성공 전에 지워지지 않는지 확인합니다.
- [x] `main`의 safe run failure, cleanup failure, unsafe run failure 분기를 나란히 추적합니다.
- [x] unsafe branch에서 unbuffered output 뒤 `_exit`가 호출되고 table destructor나 `exit`/return 경로로 이어지지 않는지 확인합니다.
- [x] stack-resident table과 worker가 빌린 arrays/mutex 사이의 lifetime을 sequence diagram으로 기록합니다.

#### 코드 근거 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 파일과 symbol | §12 완료 기록의 대응 근거 참조 |
| 최소 코드 구간 | §12 완료 기록의 대응 근거 참조 |
| caller → callee | §12 완료 기록의 대응 근거 참조 |
| state 또는 ownership 변화 | §12 완료 기록의 대응 근거 참조 |
| failure/cleanup 경로 | §12 완료 기록의 대응 근거 참조 |
| 직전 상태와의 차이 | §12 완료 기록의 대응 근거 참조 |

#### Quiescence와 destruction authorization

| 관찰 상태 | Source-confirmed verdict | 실제 조건식·반환 경로 |
| --- | --- | --- |
| `threads_started == threads_joined`, destroy state 정상 | destruction을 시도할 수 있음 | §12 완료 기록의 대응 근거 참조 |
| join 하나 이상 실패 | `PHILO_UNSAFE`; destruction 거부 | §12 완료 기록의 대응 근거 참조 |
| 일부 pthread resource destroy 실패 | 남은 ownership ledger 보존; 재시도 가능 | §12 완료 기록의 대응 근거 참조 |
| unsafe verdict가 ordinary run error와 함께 존재 | unsafe가 safety verdict로 우선 | §12 완료 기록의 대응 근거 참조 |

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
- [x] 왜 `pthread_join` 호출 시도와 successful join을 다른 lifecycle 사실로 취급해야 하는지 설명합니다.
- [x] borrowed pointer 모델이 `PHILO_UNSAFE`와 `_exit` 결정으로 이어지는 논리를 설명합니다.
- [x] destructor failure에서 ledger를 성공 후에만 소비해야 retry가 가능한 이유를 실제 code order로 제시합니다.
- [x] ordinary error와 unsafe verdict의 우선순위를 호출 흐름 전체에서 설명합니다.

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
| 대상 production invariant | §12 완료 기록의 대응 근거 참조 |
| create failure index별 started/joined 예상값 | §12 완료 기록의 대응 근거 참조 |
| join failure 후 unsafe verdict와 보존되어야 할 state | §12 완료 기록의 대응 근거 참조 |
| destroy failure stage별 남아야 할 ledger | §12 완료 기록의 대응 근거 참조 |
| test technique와 real API delegation | §12 완료 기록의 대응 근거 참조 |
| 실제로 통과하는 production 코드 경로 | §12 완료 기록의 대응 근거 참조 |
| 핵심 positive assertion | §12 완료 기록의 대응 근거 참조 |
| 핵심 negative assertion | §12 완료 기록의 대응 근거 참조 |
| 재시도 절차 | §12 완료 기록의 대응 근거 참조 |
| 이 테스트가 증명하는 것 | §12 완료 기록의 대응 근거 참조 |
| 이 테스트가 증명하지 않는 것 | §12 완료 기록의 대응 근거 참조 |
| deterministic failure matrix 분류 | §12 완료 기록의 대응 근거 참조 |
| 후속 회귀 방지 대상 | §12 완료 기록의 대응 근거 참조 |

#### 해당 SHA에서 직접 확인할 코드
- [x] create wrapper가 몇 번째 호출에서 실패하도록 설정되고 각 case가 어떻게 반복되는지 확인합니다.
- [x] 각 case에서 production `philo_run` 또는 join helper가 보는 `threads_started`와 `threads_joined`를 기록합니다.
- [x] join wrapper가 특정 handle에서 실패한 뒤 나머지 join을 계속하는지 확인합니다.
- [x] unsafe 상태에서 destructor 호출 전후 fork pointer, fork_count, readiness flag, destroy-call count가 동일하다는 assertion을 확인합니다.
- [x] test가 실패한 worker를 real `pthread_join`으로 정리하고 test ledger를 수선한 뒤 production cleanup을 다시 허용하는 절차를 확인합니다.
- [x] destroy failure injection이 reverse order의 서로 다른 지점을 겨냥하는지 확인합니다.
- [x] 첫 destructor 실패 후 backing allocation과 remaining ledger가 truthfully owned state를 나타내는지 확인합니다.
- [x] 두 번째 destructor 호출에서 injection을 해제하고 cleanup이 완료되는 assertion을 확인합니다.

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
- zero, partial, nearly complete construction/teardown 위치에서 lifecycle arithmetic과 verdict를 결정적으로 검증합니다.
- unsafe refusal가 resource 상태를 보존하고 destroy failure가 retryable state를 남기는지 검증합니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- 모든 OS-level pthread failure 동작이나 실제 scheduler interleaving을 재현하지 않습니다.
- failed join worker의 실제 내부 상태를 증명하지 않으며, 바로 그 불확실성 때문에 unsafe로 취급합니다.

#### 학습자 결론
- [x] 각 failure index에 대해 expected started/joined/destruction count를 표로 계산합니다.
- [x] unsafe test가 실패한 worker를 사후 정리하는 test-only 절차와 production verdict를 구분합니다.
- [x] retryability를 단순한 두 번째 호출 성공이 아니라 ledger 보존으로 증명하는 assertion을 설명합니다.

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
| 대상 production invariant | §12 완료 기록의 대응 근거 참조 |
| 주입하는 unsafe 결과 | §12 완료 기록의 대응 근거 참조 |
| buffered stdout의 역할 | §12 완료 기록의 대응 근거 참조 |
| `atexit` hook의 역할 | §12 완료 기록의 대응 근거 참조 |
| destroy marker의 역할 | §12 완료 기록의 대응 근거 참조 |
| 실제로 실행하는 `main` 분기 | §12 완료 기록의 대응 근거 참조 |
| 반드시 존재해야 하는 출력/상태 | §12 완료 기록의 대응 근거 참조 |
| 반드시 없어야 하는 출력/상태 | §12 완료 기록의 대응 근거 참조 |
| `_exit`와 return/`exit`의 관찰 차이 | §12 완료 기록의 대응 근거 참조 |
| 이 테스트가 증명하는 것 | §12 완료 기록의 대응 근거 참조 |
| 이 테스트가 증명하지 않는 것 | §12 완료 기록의 대응 근거 참조 |
| deterministic process-level regression 분류 | §12 완료 기록의 대응 근거 참조 |
| 후속 회귀 방지 대상 | §12 완료 기록의 대응 근거 참조 |

#### 해당 SHA에서 직접 확인할 코드
- [x] real `main`을 test binary에서 어떻게 포함하거나 연결하는지 확인합니다.
- [x] parse/init/run/destroy stub의 반환값과 side effect를 기록합니다.
- [x] stdout이 flush되지 않도록 어떤 방식으로 buffered output을 준비하는지 확인합니다.
- [x] `atexit` hook과 destroy stub marker가 각각 normal teardown의 어느 부분을 감지하는지 확인합니다.
- [x] child process의 stderr/stdout/exit status를 test runner가 어떻게 수집하는지 확인합니다.
- [x] unbuffered unsafe diagnostic이 존재하는 assertion을 확인합니다.
- [x] destroy marker, buffered output, exit-hook output의 부재를 각각 확인하는 negative assertion을 찾습니다.
- [x] 단순히 destructor를 건너뛰는 것과 `_exit`로 normal teardown 전체를 건너뛰는 것의 차이를 코드 경로로 설명합니다.

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
- unsafe verdict에서 `main`이 table destruction과 normal stdio/`atexit` teardown을 실행하지 않는 process contract를 검증합니다.
- unbuffered diagnostic은 `_exit` 전에 관찰 가능함을 검증합니다.

이 commit 시점에 아직 보장하지 않거나 검증 범위를 넘는 것:
- 실제 `pthread_join` failure 자체를 이 test가 발생시키는 것은 아닙니다.
- unsafe worker가 어떤 상태인지 또는 OS가 process 자원을 어떻게 회수하는지 증명하지 않습니다.

#### 학습자 결론
- [x] 왜 destroy 호출 부재만 확인해서는 `_exit` contract를 충분히 증명하지 못하는지 설명합니다.
- [x] 세 negative signal이 각각 어떤 잘못된 normal teardown 경로를 잡는지 설명합니다.
- [x] Thread 전체가 allocation owner에서 process-level destruction verdict로 발전한 과정을 이 test까지 연결합니다.

## 6. Invariant ledger

Source가 확정한 invariant의 시간상 역할만 미리 배치했습니다. 실제 field, 함수, mutation 순서와 test evidence는 학습자가 해당 SHA에서 채웁니다.

| Invariant | 최초 도입 또는 문제 노출 | 강화·복구 | regression evidence | 해당 SHA 코드 근거 | 최종 설명 |
| --- | --- | --- | --- | --- | --- |
| table이 allocation을 소유하고 philosopher는 주소를 빌림 | `16343e76b54b` | `a7783d04107f`에서 borrower quiescence가 destruction permission으로 확장 | `7586b605302b`, `37b29557cccc` | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| partial initialization은 성공한 resource만 ledger에 기록 | `1d69df7db78c` | `10665e0a5bf9`에서 common destructor 단독 소비로 복구 | `800408d6d84e` | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| initialized mutex는 최대 한 번 파괴 | `1d69df7db78c`에서 split rollback으로 부족함 노출 | `10665e0a5bf9` | `800408d6d84e` | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| destroy 실패 뒤 remaining ownership state는 truthful하고 retryable | `a7783d04107f` | 동일 commit의 success-after-destroy ledger update | `7586b605302b` | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| shared table resource는 모든 started worker의 successful join 뒤에만 파괴 | `a7783d04107f` | unsafe verdict와 destructor refusal | `7586b605302b`, `37b29557cccc` | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |
| unsafe process path는 normal teardown을 실행하지 않음 | `a7783d04107f` | `_exit` process contract | `37b29557cccc` | §12 완료 기록의 대응 근거 참조 | §12 완료 기록의 대응 근거 참조 |

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

- 기존 가정의 실제 코드: §12 완료 기록의 대응 근거에 정리했습니다.
- failure branch와 root cause: §12 완료 기록의 대응 근거에 정리했습니다.
- fix에서 삭제·이동된 cleanup 책임: §12 완료 기록의 대응 근거에 정리했습니다.
- regression assertion: §12 완료 기록의 대응 근거에 정리했습니다.
- 이 연결이 보장하는 exact-once 범위: §12 완료 기록의 대응 근거에 정리했습니다.
- 이 연결이 보장하지 않는 범위: §12 완료 기록의 대응 근거에 정리했습니다.

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

- 기존 cleanup 가정: §12 완료 기록의 대응 근거에 정리했습니다.
- failed join이 남기는 불확실성: §12 완료 기록의 대응 근거에 정리했습니다.
- unsafe verdict가 ordinary error보다 우선하는 코드: §12 완료 기록의 대응 근거에 정리했습니다.
- destructor refusal 시 보존되는 state: §12 완료 기록의 대응 근거에 정리했습니다.
- `_exit` 전후 관찰 가능한 output: §12 완료 기록의 대응 근거에 정리했습니다.
- 두 test가 서로 다르게 증명하는 범위: §12 완료 기록의 대응 근거에 정리했습니다.

## 8. Ownership / state / responsibility 변화

| 시점 | Allocation ownership | Synchronization ownership | Worker lifetime evidence | Destruction responsibility | 학습자 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| `16343e76b54b` | table이 arrays 소유 | 아직 후속 단계 | 아직 없음 | table-level cleanup | §12 완료 기록의 대응 근거 참조 |
| `1d69df7db78c` | 기존 유지 | readiness flag와 `fork_count` 도입 | 아직 없음 | helper와 destructor가 충돌 | §12 완료 기록의 대응 근거 참조 |
| `10665e0a5bf9` | 기존 유지 | common destructor가 fork ledger 단독 소비 | 아직 없음 | exact-once rollback owner 통일 | §12 완료 기록의 대응 근거 참조 |
| `a7783d04107f` | worker가 빌린 storage까지 lifetime 판단에 포함 | destroy 성공 후 ledger 소비 | started/joined로 quiescence 입증 | safe면 retryable destroy, unsafe면 거부 | §12 완료 기록의 대응 근거 참조 |
| executable unsafe path | process가 즉시 종료 | normal teardown 생략 | 미입증 상태를 그대로 unsafe로 취급 | `_exit`가 최종 process decision | §12 완료 기록의 대응 근거 참조 |

## 9. Thread 최종 상태

### Source-confirmed 최종 상태

- table ownership graph는 allocation뿐 아니라 synchronization resource와 worker borrower lifetime의 근거가 됩니다.
- partial initialization과 partial destruction은 recorded ownership을 통해 정리됩니다.
- successful join 수가 모든 started worker의 quiescence를 입증해야 table destruction이 허용됩니다.
- join safety가 불명확하면 `PHILO_UNSAFE`가 반환되고 normal cleanup 대신 `_exit`가 사용됩니다.
- destroy failure는 remaining ledger를 보존해 safe한 명시적 retry를 허용합니다.

### 학습자가 작성할 최종 설명

- ownership graph: §12 완료 기록의 대응 근거에 정리했습니다.
- construction ledger: §12 완료 기록의 대응 근거에 정리했습니다.
- exact-once rollback: §12 완료 기록의 대응 근거에 정리했습니다.
- quiescence proof: §12 완료 기록의 대응 근거에 정리했습니다.
- safe destruction predicate: §12 완료 기록의 대응 근거에 정리했습니다.
- retryable destroy: §12 완료 기록의 대응 근거에 정리했습니다.
- unsafe process termination: §12 완료 기록의 대응 근거에 정리했습니다.
- 의도적으로 보장하지 않는 graceful cleanup: §12 완료 기록의 대응 근거에 정리했습니다.

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

- 각 화살표의 production symbol: §12 완료 기록의 대응 근거에 정리했습니다.
- 각 단계의 success ledger mutation: §12 완료 기록의 대응 근거에 정리했습니다.
- 각 failure branch의 return precedence: §12 완료 기록의 대응 근거에 정리했습니다.
- worker가 table을 역참조할 수 있는 마지막 지점: §12 완료 기록의 대응 근거에 정리했습니다.
- destruction이 합법화되는 정확한 조건: §12 완료 기록의 대응 근거에 정리했습니다.
- test가 각 branch를 관찰하는 방식: §12 완료 기록의 대응 근거에 정리했습니다.

## 11. 학습 완료 자가 점검

- [x] final HEAD의 field나 cleanup 순서를 과거 SHA에 소급하지 않았습니다.
- [x] `16343e76b54b`의 owned/borrowed 주소 관계를 실제 선언으로 증명했습니다.
- [x] `1d69df7db78c`의 double-destroy 가능 경로를 두 cleanup owner로 설명했습니다.
- [x] `10665e0a5bf9`에서 authoritative ledger consumer가 하나가 되는 변경을 제시했습니다.
- [x] `800408d6d84e`의 failure index와 destruction address assertion을 설명했습니다.
- [x] `a7783d04107f`의 started/joined/destruction verdict와 `_exit`를 호출 흐름으로 설명했습니다.
- [x] `7586b605302b`에서 각 failure index의 expected ledger를 계산했습니다.
- [x] `37b29557cccc`의 negative assertions가 normal teardown 부재를 어떻게 증명하는지 설명했습니다.
- [x] exact-once cleanup과 graceful cleanup을 혼동하지 않았습니다.
- [x] successful join을 borrower quiescence의 증거로 사용하는 이유를 설명할 수 있습니다.

## 12. 저장소 기반 완료 기록

### 12.1 검토 범위와 증거 등급

- 검토 브랜치는 `c/philo` 하나로 제한했습니다.
- 이 Thread의 7개 SHA는 모두 브랜치 HEAD `12b29d75ccc98311cd8da1217ababbe21de64026`의 조상이며, 각 비교에서 merge base가 해당 SHA와 일치했습니다.
- 아래 구현 설명은 각 SHA의 commit diff와 그 SHA의 파일을 확인한 결과입니다. 이후 commit의 구현을 이전 상태에 소급하지 않았습니다.
- 저장소 checkout이 로컬 네트워크 제한으로 불가능했으므로 production binary와 test target은 실행하지 않았습니다. 테스트 결과로 적은 내용은 test source의 injection·assertion을 분석한 결과이지 실제 실행 통과 기록이 아닙니다.

### 12.2 `16343e76b54b` — ownership graph와 ring identity

#### 실제 변경 위치

- `include/philo.h`: `t_config`, `t_philo`, `t_table`의 중심 저장 구조를 정의합니다.
- `src/init.c`: `philo_table_init`, philosopher별 pointer 배치, allocation 실패 rollback을 구현합니다.
- `src/destroy.c` 또는 해당 SHA의 table destruction 구현: table-owned allocation을 해제하고 pointer를 초기 상태로 되돌립니다.

#### 소유 관계

| 대상 | 실제 표현 | 관계 | 수명 조건 |
| --- | --- | --- | --- |
| table | `main` 쪽 stack-resident `t_table` | process-level 중심 값 | worker가 table을 빌리지 않는 시점까지 살아 있어야 합니다. |
| fork 저장소 | `t_table.forks` | table이 `malloc`으로 소유 | 모든 philosopher의 fork pointer보다 오래 살아 있어야 합니다. |
| philosopher 저장소 | `t_table.philos` | table이 `malloc`으로 소유 | 생성한 worker와 join이 끝날 때까지 살아 있어야 합니다. |
| table 참조 | `t_philo.table` | borrowed pointer | table destruction 전까지만 유효합니다. |
| fork 참조 | `t_philo.left_fork`, `right_fork` | fork 배열 내부를 빌림 | fork 배열 free 또는 mutex destruction 전까지만 유효합니다. |

초기 header에서 `t_philo`는 `id`, `meals`, `last_meal_ms`, `thread` 값을 직접 가지며, 세 pointer만 table-owned storage를 빌립니다. `t_table`은 configuration과 shared state, `forks`, `philos`, mutex 값의 owner입니다.

#### ring mapping

`src/init.c`의 philosopher 초기화는 philosopher `i`에 다음 주소를 배치합니다.

```c
left_fork  = &table->forks[i];
right_fork = &table->forks[(i + 1) % table->config.number];
```

따라서 philosopher `i`의 `right_fork`와 philosopher `(i + 1) % N`의 `left_fork`는 같은 객체를 가리킵니다. 마지막 philosopher의 오른쪽 포크는 modulo 연산으로 `forks[0]`에 연결됩니다. 포크를 philosopher 구조체 안에 값으로 복사하지 않기 때문에 이웃이 같은 mutex identity를 공유합니다.

#### construction과 rollback

`philo_table_init`은 table을 초기 상태로 만든 뒤 fork 배열과 philosopher 배열을 순서대로 할당합니다. 뒤쪽 allocation이 실패하면 table-level destructor로 이동하며, 이미 존재하는 pointer만 free하고 NULL로 되돌립니다. 이 SHA에서는 mutex staged initialization이 아직 없으므로 보장 범위는 allocation과 topology까지입니다.

### 12.3 `1d69df7db78c` — staged mutex construction과 split rollback 결함

#### 도입된 ledger

- `state_ready`: state mutex의 성공적인 초기화를 나타냅니다.
- `print_ready`: print mutex의 성공적인 초기화를 나타냅니다.
- `fork_count`: 성공적으로 초기화된 fork mutex prefix의 개수입니다.
- backing-array pointer: allocation ownership의 존재를 나타냅니다.

초기화 순서는 state mutex, print mutex, fork mutex `0..N-1`입니다. 각 `pthread_mutex_init`이 성공한 직후에만 대응 flag 또는 count가 갱신됩니다. 요청한 최종 자원 수가 아니라 실제 성공한 횟수가 cleanup authorization이 됩니다.

#### 남은 결함

`init_forks`는 fork `k` 초기화 실패 시 이미 성공한 `0..k-1`을 로컬 loop에서 파괴합니다. 그러나 `table->fork_count`는 성공한 개수 `k`를 그대로 유지합니다. 상위 `philo_table_init`이 실패 후 common destructor를 호출하면 destructor가 같은 `0..k-1`을 다시 owned로 해석해 두 번째 `pthread_mutex_destroy`를 시도할 수 있습니다.

```text
fork 0..k-1 init 성공
→ fork k init 실패
→ init_forks가 0..k-1 로컬 destroy
→ fork_count == k 유지
→ common destructor가 k개를 다시 destroy
```

문제는 rollback 코드의 존재가 아니라 동일 자원의 cleanup 권한이 helper와 owner destructor 양쪽에 있다는 점입니다.

### 12.4 `10665e0a5bf9` — common destructor 단독 소비

이 fix는 `init_forks`의 local destroy loop를 제거합니다. helper는 실패 상태만 반환하고, `philo_table_destroy`가 `fork_count`를 가진 유일한 rollback owner가 됩니다.

- fork mutex는 initialized prefix를 역순으로 파괴합니다.
- 성공적으로 파괴한 항목만 ledger에서 제거합니다.
- state/print readiness도 destructor가 소비합니다.
- allocation을 free한 뒤 pointer를 NULL로 바꿔 repeated cleanup이 같은 free를 반복하지 않게 합니다.

이 시점의 핵심 복구는 **한 ledger에 한 consumer**입니다. 다만 pthread destroy 실패를 retry 가능한 상태로 보존하는 완전한 모델은 아직 `a7783d04107f` 전입니다.

### 12.5 `800408d6d84e` — partial-init deterministic regression

#### test mechanism

`tests/init_failure.c`는 compile-time function substitution으로 production initializer가 호출하는 `pthread_mutex_init`과 `pthread_mutex_destroy`를 wrapper로 바꿉니다. production source에 test-only branch를 넣지 않습니다.

초기화 호출 순서는 다음과 같습니다.

| 호출 index | 대상 | 결과 |
| --- | --- | --- |
| 1 | state mutex | 성공 |
| 2 | print mutex | 성공 |
| 3 | fork 0 | 성공 |
| 4 | fork 1 | 주입 실패 |

따라서 실패 시 authoritative ledger가 소유한다고 말하는 mutex는 정확히 3개입니다. destroy wrapper는 파괴 요청 주소를 기록하고 같은 주소가 두 번 들어오는지 검사합니다.

#### assertion

- initializer가 오류를 반환합니다.
- destroy call 수는 3입니다.
- 세 주소는 state, print, fork 0에 해당하며 duplicate가 없습니다.
- backing arrays는 해제되고 pointer는 NULL입니다.
- 동일 table에 destructor를 다시 호출해도 destroy call 수가 늘지 않습니다.

이 테스트는 특정 partial-init 경계에서 exact-once ledger 소비를 결정적으로 검증하도록 작성됐습니다. 실제 pthread 구현의 모든 실패 형태, allocation failure matrix, worker lifecycle은 증명하지 않습니다.

### 12.6 `a7783d04107f` — worker quiescence를 destruction permission으로 확장

#### 새 lifecycle state

`include/philo.h`에 다음 상태가 추가됩니다.

- `threads_started`: `pthread_create`가 성공한 handle 수
- `threads_joined`: `pthread_join`이 성공한 handle 수
- `destroy_safe`: shared table destruction 허용 여부
- `PHILO_UNSAFE`: ordinary operation error와 구분되는 safety verdict

초기 상태는 started/joined가 0이고 destruction이 허용된 상태입니다. creation 성공 직후에만 `threads_started`가 증가합니다.

#### join은 시도가 아니라 증거입니다

`src/run.c`의 `join_started`는 recorded prefix 전체에 join을 시도합니다. 성공한 경우에만 `threads_joined`를 증가시킵니다. 하나라도 실패하면 `destroy_safe = 0`, 최종 상태는 `PHILO_UNSAFE`가 됩니다. 실패 후 나머지 handle에 대한 join 시도는 계속하지만, failed handle을 종료됐다고 가정하지 않습니다.

```text
pthread_join(handle) == 0
    → threads_joined++
pthread_join(handle) != 0
    → destroy_safe = 0
    → PHILO_UNSAFE 유지
```

creation 또는 barrier의 ordinary error와 join failure가 함께 발생하면 `PHILO_UNSAFE`가 우선합니다. 이는 오류 심각도 표현이 아니라 shared borrower의 quiescence를 입증하지 못했다는 뜻입니다.

#### destruction predicate

`philo_table_destroy`는 다음 상태에서 shared mutex 또는 allocation을 건드리지 않습니다.

```text
destroy_safe == 0
또는
threads_started != threads_joined
```

started worker는 `t_philo.table`, fork-array 내부 주소, shared mutex를 계속 역참조할 수 있습니다. 실패한 join 뒤 table을 free하거나 mutex를 파괴하면 use-after-free 또는 live synchronization-object destruction이 될 수 있으므로 cleanup 자체를 거부합니다.

#### retryable destroy

fork/condition/state/print resource는 destroy call 성공 후에만 count 또는 readiness flag를 지웁니다. 중간 단계에서 pthread destroy가 실패하면 아직 release되지 않은 자원의 ledger가 그대로 남습니다. caller가 안전한 상태에서 destructor를 다시 호출하면 남은 지점부터 재시도할 수 있습니다.

#### unsafe process path

`src/main.c`는 `philo_run`이 `PHILO_UNSAFE`를 반환하면 fixed diagnostic을 unbuffered `write`로 남긴 뒤 `_exit(PHILO_ERR)`를 호출합니다. 이 branch는 다음을 실행하지 않습니다.

- `philo_table_destroy`
- buffered stdio flush
- `atexit` handler
- stack unwinding을 전제로 한 normal `return`/`exit`

이 경로는 graceful cleanup을 실패한 것이 아니라, safety evidence가 없는 cleanup을 의도적으로 금지한 결과입니다.

### 12.7 `7586b605302b` — create/join/destroy failure matrix

`tests/lifecycle_failure.c`는 pthread create, join, mutex destroy를 wrapper로 대체하고 여러 partial-state 위치를 반복합니다.

#### create failure

3-worker configuration에서 create failure index 0, 1, 2를 주입합니다. 기대값은 성공한 prefix만 `threads_started`에 포함되고 그 prefix만 실제 join 대상이 된다는 것입니다. join이 모두 성공하면 ordinary `PHILO_ERR`이며 cleanup은 허용됩니다.

#### join failure

특정 started handle의 join을 실패시킨 뒤에도 production helper가 나머지 handle을 계속 join하는지 확인합니다. 결과는 다음과 같습니다.

- 반환값: `PHILO_UNSAFE`
- `threads_joined`: 성공한 join 수만 반영
- `destroy_safe`: false
- destructor 호출 전후: fork pointer, `fork_count`, readiness flag, destroy-call count가 동일

테스트는 failed worker를 real `pthread_join`으로 사후 정리한 뒤 test-only로 ledger를 복구하고 production destructor를 다시 호출합니다. 이 수선 절차는 production이 failed join을 안전하다고 간주한다는 뜻이 아니라 테스트 프로세스가 남은 thread를 회수하기 위한 장치입니다.

#### destroy failure와 retry

reverse cleanup의 여러 stage에 failure를 주입합니다. 첫 호출은 failure 이전까지 성공한 resource만 ledger에서 제거하고 실패 대상 및 이후 resource를 owned 상태로 유지해야 합니다. injection을 해제한 두 번째 호출이 남은 cleanup을 끝내는지 확인합니다.

이 matrix는 zero/partial/nearly-complete lifecycle arithmetic과 retry state를 직접 자극합니다. 실제 OS가 모든 pthread error를 같은 방식으로 발생시킨다는 것은 증명하지 않습니다.

### 12.8 `37b29557cccc` — process-level forbidden-cleanup regression

`tests/main_unsafe.c`는 real `main`을 사용하되 parse/init/run/destroy를 stub으로 대체합니다.

- parse stub: `atexit` handler를 등록합니다.
- run stub: buffered stdout marker를 기록하고 `PHILO_UNSAFE`를 반환합니다.
- destroy stub: 호출되면 별도 marker를 남깁니다.
- real main unsafe branch: unbuffered join diagnostic 후 `_exit`합니다.

child output에서 반드시 존재해야 하는 것은 unsafe diagnostic입니다. 반드시 없어야 하는 것은 destroy marker, buffered stdout marker, `atexit` marker입니다. 세 negative assertion은 각각 destructor 호출, stdio flush, normal exit handler 실행을 탐지합니다.

따라서 이 테스트가 겨냥하는 invariant는 단순한 “destructor를 호출하지 않는다”가 아니라 **normal process teardown 전체를 우회한다**입니다. 실제 `pthread_join`을 실패시키거나 failed worker의 상태를 증명하지는 않습니다.

### 12.9 Invariant evolution 완성

| Invariant | 도입 | 부족함 노출 | 복구·확장 | regression evidence |
| --- | --- | --- | --- | --- |
| table이 allocation을 소유하고 philosopher가 내부 주소를 빌림 | `16343e76b54b` | worker가 생기면 storage lifetime이 join에 종속됨 | `a7783d04107f`의 quiescence predicate | `7586b605302b`, `37b29557cccc` |
| 성공한 초기화만 cleanup authorization을 만듦 | `1d69df7db78c` | helper와 destructor의 split rollback | `10665e0a5bf9`의 단일 consumer | `800408d6d84e` |
| initialized mutex는 최대 한 번 파괴 | ledger 의도는 `1d69df7db78c` | local rollback 뒤 stale `fork_count` | common destructor 역순 소비 | destruction-address duplicate 검사 |
| destroy 실패 뒤 ledger는 truthful·retryable | `a7783d04107f` | 성공 전에 flag/count를 지우면 재시도 불가 | destroy 성공 후에만 mutation | `7586b605302b` destroy matrix |
| shared storage 파괴 전 모든 borrower quiescence 필요 | ownership graph에서 암묵적 위험 | failed join이 종료 증거가 아님 | started/joined + `destroy_safe` + `PHILO_UNSAFE` | lifecycle 및 main unsafe tests |
| unsafe process는 normal teardown을 실행하지 않음 | `a7783d04107f` | destructor 생략만으로 stdio/atexit는 남음 | `_exit` | `37b29557cccc`의 세 negative marker |

### 12.10 최종 실행 흐름

```text
main의 t_table
    ↓ philo_table_init
allocation + mutex/condition readiness ledger
    ↓ philo_run
pthread_create 성공마다 threads_started 증가
    ↓ start release / monitor / abort publication
recorded handle 전체에 pthread_join 시도
    ├─ 모든 started handle join 성공
    │      ↓ threads_started == threads_joined
    │      ↓ destroy_safe == 1
    │      ↓ philo_table_destroy
    │      ↓ 성공한 destroy 뒤에만 ledger 소비
    │      ├─ 완료: allocation free + pointer NULL
    │      └─ 중간 실패: remaining ledger 보존, 명시적 retry 가능
    └─ 하나 이상 join 미입증
           ↓ destroy_safe = 0
           ↓ PHILO_UNSAFE가 ordinary error보다 우선
           ↓ table destruction 금지
           ↓ write diagnostic
           ↓ _exit(PHILO_ERR)
```

### 12.11 최종 보장과 비보장

보장하는 범위:

- table-owned allocation과 synchronization object는 recorded ownership에 따라 처리됩니다.
- partial mutex initialization은 common destructor 하나가 exact-once로 rollback합니다.
- successful join으로 모든 started borrower의 quiescence가 입증된 경우에만 destruction을 시도합니다.
- resource destroy 실패는 아직 owned인 state를 보존해 재시도를 허용합니다.
- unsafe join verdict에서는 forbidden cleanup과 normal process teardown을 실행하지 않습니다.

보장하지 않는 범위:

- failed join worker가 실제로 종료됐는지 추정하지 않습니다.
- unsafe branch에서 graceful cleanup이나 leak-free exit를 보장하지 않습니다.
- wrapper 기반 test가 실제 pthread 구현의 모든 오류 조합을 재현한다고 보지 않습니다.
- 이 Thread는 scheduler fairness, starvation freedom, 모든 interleaving의 안전성을 증명하지 않습니다.
