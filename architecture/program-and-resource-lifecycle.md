# 프로그램과 자원 lifecycle

이 문서는 `main`, `philo_table_init`, `philo_run`,
`philo_table_destroy`가 만드는 프로그램 실행과 자원 수명 경계를 설명한다.
이 경계가 단계별로 형성된 과정은
[단계별 자원 수명 주기](../devlog/02-staged-resource-lifecycle.md)에 정리했다.

## End-to-end state

다음은 실행 전체의 상태 흐름이다.

```text
PARSE
  → INITIALIZE
  → CREATE_WORKERS
  → WAIT_READY
  → RELEASE_START
  → MONITOR
  → JOIN
  → SAFE_TO_DESTROY ──→ DESTROY
                └────→ UNSAFE ──→ _exit
```

`main`의 stack에 있는 `t_table`이 실행 전체의 소유 단위다. 초기화에 성공한 뒤
worker는 그 안의 주소를 빌린다. 따라서 시작한 모든 worker의 join 성공을
확인하기 전에는 table이나 배열을 해제할 수 없다.

## Ownership graph

```text
main stack의 t_table
  ├─ forks[] allocation 소유
  │    └─ 초기화된 fork mutex 수: fork_count
  ├─ philos[] allocation 소유
  │    └─ 각 t_philo.thread는 성공한 pthread_create 결과
  ├─ state_mutex 소유       state_ready
  ├─ start_cond 소유        start_cond_ready
  ├─ print_mutex 소유       print_ready
  └─ worker lifecycle 장부
       threads_started
       threads_joined
       destroy_safe

t_philo
  ├─ left_fork/right_fork ──→ forks[] 원소를 빌림
  └─ table ───────────────→ t_table을 빌림
```

`config`는 table에 값으로 복사되고 실행 중 바뀌지 않는다. `t_philo`의 fork와
table pointer에는 별도 소유권이 없다. 배열을 이동하거나 먼저 `free`하면 worker가
보유한 주소가 무효가 된다. 성공한 thread handle은 철학자 index와 같은 위치에
저장되므로 시작된 worker는 항상 `philos[0..threads_started-1]`의 연속 구간이다.

## Staged initialization

초기화 순서는 다음과 같다.

```text
forks[]와 philos[] 할당
  → state_mutex
  → start_cond
  → print_mutex
  → fork mutex 0..N-1
  → t_philo에 id·fork pointer·table pointer 연결
```

초기화 시작 시 실행 상태와 자원 장부를 0으로 만들고 `destroy_safe`만 1로 둔다.
각 자원이 성공한 뒤에만 대응하는 ready flag나 `fork_count`를 올린다. 실패하면
`philo_table_destroy`를 호출해 장부에 올라온 항목만 역순으로 파괴한다. 아직
초기화하지 않은 mutex나 condition variable에는 destroy를 호출하지 않는다.

초기화 실패의 한계도 계약에 포함해야 한다. 실패 branch는 다음 형태다.

```c
return (philo_table_destroy(table), PHILO_ERR);
```

즉 내부 destroy의 반환값을 버리고 항상 `PHILO_ERR`를 반환한다. rollback 중
`pthread_mutex_destroy`나 `pthread_cond_destroy`까지 실패하면 남은 장부와
allocation이 table에 보존될 수 있지만, `main`은 초기화 실패 뒤 destroy를 다시
호출하지 않는다. 따라서 **모든 초기화 rollback이 재시도 가능하거나 완결된다**고
보장할 수 없다.

## Worker creation and start abort

`philo_run`은 philosopher index 순서로 worker를 만들며, 성공할 때마다
`threads_started`를 올린다. 모든 worker 생성에 성공한 정상 경로에서는
`ready_count == config.number`가 될 때까지 기다린 뒤 공통 기준 시각을 기록하고
start condition을 broadcast한다.

N번째 `pthread_create`가 실패하면 준비 인원 수를 기다리지 않고 다음과 같이
시작을 중단한다.

```text
create(N) 실패
  → state_mutex에서 ended = 1
  → start_released = 1
  → start_cond broadcast
  → 생성된 0..N-1 worker join
```

이미 condition wait 중인 worker는 broadcast로 깨어난다. 아직 schedule되지 않은
worker도 나중에 barrier에 도착해 `start_released`와 `ended`를 보고 반환한다.
준비 인원 수를 기다리지 않으므로 부분 생성 실패가 barrier deadlock으로 바뀌지
않는다.

worker 쪽 `pthread_cond_wait` 실패는 `run_error`, `ended`,
`start_released`를 설정하고 대기자에게 broadcast한다. main 쪽 준비 대기도
`run_error`를 확인한다. 이 오류는 시작한 worker를 모두 join한 뒤 `PHILO_ERR`로
전파한다. 단, 그 join 중 하나라도 실패하면 더 강한 수명 위반 상태인
`PHILO_UNSAFE`가 우선한다.

## Join is the destruction verdict

join loop는 `threads_started`로 기록한 모든 index를 방문한다. 한
`pthread_join`이 실패해도 나머지 호출은 계속한다.

- 성공할 때만 `threads_joined`를 올린다.
- 하나라도 실패하면 `destroy_safe = 0`과 `PHILO_UNSAFE`를 남긴다.
- destroy는 `destroy_safe == 1`이고
  `threads_joined >= threads_started`일 때만 시작한다.

join 호출을 시도한 사실은 worker 종료나 object lifetime의 증거가 아니다.
실패한 worker가 table을 계속 참조할 수 있으므로 `main`은 destroy를 건너뛰고
`write`로 오류를 시도한다. 호출이 돌아오면 `_exit(1)`을 호출하므로 process의
stdio flush와 `atexit` handler를 건너뛰고 운영체제가 process 자원을 회수하게
한다. 기본 `SIGPIPE`가 그 진단 write에서 먼저 발생해도 process는 signal로
끝나며 table destroy에는 진입하지 않는다.

`PHILO_UNSAFE`는 일반 실행 실패와 구분되는 **파괴 금지 판정**이다.
`philo_run`은 create 또는 condition wait 실패 뒤의 join에서도 이 상태를 우선
반환한다. `philo_table_destroy` 역시 `destroy_safe == 0`이거나 성공한 join 수가
시작 수보다 적으면 아무 자원도 건드리지 않고 `PHILO_UNSAFE`를 반환한다. table은
성공 join 수와 unsafe flag만 남기며 실패 index를 별도 bitmap으로 기록하지
않는다. 제품에는 실패한 handle을 일반 경로에서 다시 join하는 API가 없다.

## Explicit destruction and retry state

완전히 초기화되고 파괴 안전성이 확인된 table은 다음 순서로 정리한다.

```text
fork mutex N-1..0
  → print_mutex
  → start_cond
  → state_mutex
  → forks[]와 philos[] free
```

성공한 destroy 뒤에만 `fork_count`를 줄이거나 ready flag를 지운다. 중간
destroy가 실패하면 아직 처리하지 않은 자원과 두 allocation을 유지하고
`PHILO_ERR`를 반환한다. 따라서 **완전 초기화 뒤 호출자가 명시적으로 수행한
destroy**는 장부가 보존되어 같은 table로 남은 정리를 재시도할 수 있다. 이는
반환값을 버리는 초기화 실패 rollback과 다른 경계다.

## Result matrix

| 상황 | `philo_run`/destroy 상태 | `main`의 결과 |
| --- | --- | --- |
| 식사 완료 또는 사망, 모든 join·destroy 성공 | `PHILO_OK` | `0` |
| create 또는 condition wait 실패, 모든 join 성공 | `PHILO_ERR` | destroy 후 `1` |
| 하나 이상의 join 실패 | `PHILO_UNSAFE` | destroy 없이 진단 write, 복귀하면 `_exit(1)` |
| 명시적 destroy 실패 | `PHILO_ERR` | 오류 출력 시도 후 `1` |
| monotonic clock 실패 | 반환하지 않음 | 진단 write가 복귀하면 `_exit(PHILO_ERR)` |

사망은 simulation의 terminal condition이지 infrastructure failure가 아니다.
표의 `0`·`1`과 `_exit`는 출력 중 signal 종료가 먼저 일어나지 않은 경우다.
프로그램은 `SIGPIPE` disposition과 mask를 바꾸지 않으므로 닫힌 stdout/stderr
pipe의 기본 정책에서는 `printf` flush나 진단 write가 process를 먼저 끝낼 수
있다.

## Unhandled runtime failures

수명에 직접 영향을 주는 create, join, destroy와 condition wait 오류는 위 상태로
다룬다. 반면 정상 경로의 `pthread_mutex_lock`·`pthread_mutex_unlock`,
`pthread_cond_broadcast`, `printf` 반환값은 확인하지 않는다. 오류 문구의 직접
`write`도 짧은 성공이나 `EINTR`를 재시도하지 않는다. `clock_gettime` 실패는
어느 thread에서 발생해도 복구 대신 process 전체를 끝내려 하며, 출력 signal이
먼저 종료할 수도 있다. 이 호출들의 실패를 지원하려면 이미 소유한 fork와
mutex를 누가 놓을지, 어떤 worker를 깨울지, table을 파괴해도 되는지를 별도 상태
전이로 설계해야 한다.
