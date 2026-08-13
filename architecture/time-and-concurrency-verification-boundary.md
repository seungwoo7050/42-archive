# 시간과 동시성 검증 경계

현재 구현의 시간 상태, start barrier와 저장소 검증 경로가 확인하는 범위를
구분한다. 기능 검사와 sanitizer 검사는 서로 다른 종류의 결함을 다루며, 어느 한
쪽의 성공만으로 가능한 모든 실행을 증명하지 않는다.
검증 경로가 추가된 순서는
[동시성 검증 기록](../devlog/04-concurrency-verification.md)에서 설명한다.

## Monotonic time

시간 상태는 `int64_t` 밀리초다.

```text
elapsed log time = now - start_ms
starvation time  = now - last_meal_ms
sleep deadline   = now + duration_ms
```

`philo_now_ms`는 `clock_gettime(CLOCK_MONOTONIC)`의 초와 나노초를 밀리초로
바꾸고 하위 자릿수를 버린다. 달력 보정의 영향을 받지 않는 경과 시계지만
저장·표현 단위가 1ms일 뿐 실제 clock resolution은 platform에 따라 다르다.
조회 실패 때 대체 값을 만들지 않고 오류 쓰기를 시도한 뒤
그 `write`가 돌아오면 `_exit(PHILO_ERR)`한다. 이 경로는 다른 thread와 자원을
정상 정리하지 않는다. 제품이 `SIGPIPE` 정책을 바꾸지 않으므로 닫힌 stderr
pipe의 기본 disposition에서는 진단 write 중 signal 종료가 먼저 일어날 수 있다.

`philo_sleep_ms`는 deadline까지 500µs 또는 100µs 단위로 반복 대기하면서 매회
`ended`를 확인한다. 이는 terminal state에 반응하는 polling이지 정확한 wake-up
예약이 아니다. scheduler, `usleep`, mutex 경합과 밀리초 절삭 때문에 실제
대기와 사망 출력의 엄격한 상한을 제공하지 않는다. `usleep` 자체의 오류 반환도
확인하지 않는다.

## Shared start barrier

worker 생성 완료와 실제 실행 준비 완료는 다른 사건이다. 각 worker는
`state_mutex` 아래 `ready_count`를 올리고 `start_cond`에 알린 뒤
`start_released`를 `while` loop로 기다린다. main도 같은 condition variable로
`ready_count == number`를 기다린다.

```text
모든 pthread_create 성공
  → 모든 worker의 ready_count 도착
  → CLOCK_MONOTONIC 한 번 조회
  → start_ms와 모든 last_meal_ms에 같은 값 저장
  → start_released = 1
  → broadcast
```

condition variable는 spurious wake-up이 가능하므로 predicate를 반복 확인한다.
같은 mutex 아래의 저장과 condition wait의 release/reacquire가 공통 start state를
worker에게 publish한다.

부분 create 실패는 준비 인원을 기다리지 않고 `ended`와 `start_released`를
설정해 broadcast한다. worker 또는 main의 `pthread_cond_wait` 실패도
`run_error`를 남기고 정상 출발을 중단한다. 반면 `pthread_cond_broadcast`와
주변 mutex lock·unlock의 반환값은 확인하지 않는다.

## Functional checks

`make test`는 먼저 기본 실행 파일을 빌드한 뒤 `tests/smoke.sh`와
`tests/concurrency.sh`를 실행한다. 두 script가 주입용 test executable을 만들
때는 Makefile의 `CC` 대신 `cc -Wall -Wextra -Werror -pthread`를 직접 사용한다.
현재 test source가 확인하는 의미는 다음과 같다.

| 영역 | 확인하는 항목 |
| --- | --- |
| 입력 | 철학자 수 `0` 거부, 매우 긴 시간 숫자의 범위 초과 거부, 오류 시 usage 출력 |
| clock | `CLOCK_MONOTONIC` 사용과 밀리초 변환, 조회 실패 시 `PHILO_ERR` process 종료 |
| init | 네 번째 mutex 초기화 실패 때 이미 준비된 mutex의 단일 파괴와 allocation 회수 |
| start | 다섯 번째 worker를 150ms 늦춘 실행의 `PHILO_OK`, `full_count == N`, `ready_count == N` |
| wait failure | worker의 첫 condition wait 실패가 `run_error`와 `PHILO_ERR`로 전파 |
| meal/terminal | 중단된 식사 미계수, stale death 후보 재검사, 완료와 `ended`의 같은 lock 경계 |
| meal range | `INT_MAX`까지 센 철학자의 다음 완료 식사가 `INT_MAX + 1`이 되며 `full_count`가 중복 증가하지 않음 |
| lifecycle | create 실패 위치 0·1·2, join 실패 위치 0·1, unsafe destroy 거부 |
| destroy | 선택한 fork·print·state mutex destroy 실패 뒤 ledger 보존과 재호출 |
| main | join 실패 시 자원을 파괴하거나 정상 stdio 종료 경로를 실행하지 않고 `_exit` |
| 실행 | 한 명의 fork·death 종료, 2명과 5명의 제한 식사 완료와 death 부재 |
| schedule | 2·5·17명과 반복 7명의 철학자별 목표 식사, death workload 반복 |
| logging | 문법, nondecreasing timestamp, 정확히 하나인 마지막 death 줄, logger race |

결정적 초기화 검사는 mutex 함수를 macro로 바꾼다. 호출 순서는
`state_mutex`(1), `print_mutex`(2), 첫 fork(3), 둘째 fork(4)이며 네 번째
`pthread_mutex_init`을 실패시킨다. `start_cond`는
`pthread_cond_init`이므로 이 **mutex 호출 카운트에 포함되지 않는다**. 해당
검사는 allocation 실패, condition init/destroy 실패, 정상 실행의 lock·unlock,
broadcast나 `printf` 실패를 주입하지 않는다.

`t_philo.meals`는 `int64_t`다. `tests/meal_counter_range.c`는 이미 식사 목표에
도달해 `full_count`에 반영된 철학자의 `meals`를 `INT_MAX`로 구성하고, 완료된
식사 한 번을 실행한다. 따라서 식사 카운터가 32-bit signed 범위를 넘어가는 한
번의 상태 전이와 중복 완료 계수 방지는 직접 확인한다. 처음부터 `INT_MAX`번
식사하는 장시간 실행이나 `int64_t` 자체의 최대 범위까지는 실행하지 않는다.

철학자 수 `200` 초과와 시간·식사 횟수 `INT_MAX` 초과처럼 `int64_t`로는
표현 가능한 공개 상한은 현재 smoke case가 별도로 실행하지 않는다. 이 경계는
`src/parse.c`의 비교를 검토해 확인한 계약이며 위 실행 결과의 증명 범위가 아니다.

공통 `start_ms`를 모든 `last_meal_ms`에 복사하는 equality는 `src/run.c`에서
확인하는 source invariant다. `tests/start_barrier.c`는 이 값들을 직접 비교하지
않는다. 늦춘 worker가 pre-release death 없이 모두 준비되고 목표를 완료하는
결과로 barrier의 효과를 간접 회귀 검사한다.

실행 test의 timeout은 hang을 회귀로 잡는 장치다. timeout 안에 관찰된 schedule이
성공했다는 근거이지 가능한 모든 interleaving의 탐색이나 progress 증명은 아니다.

## ThreadSanitizer path

`make test-tsan`은 `TSAN_CC`와 `TSAN_REQUIRED`를 전달해 `tests/tsan.sh`를
실행한다. script는 먼저 작은 pthread program을 `-fsanitize=thread`로 빌드하고
실행한다.

- probe build 또는 runtime을 사용할 수 없으면 기본 모드에서 `skipped`를
  출력하고 종료 코드 `77`을 반환한다. Makefile은 이 코드를 성공으로 바꾸지
  않는다.
- `TSAN_REQUIRED=1`이면 같은 상황을 일반 실패로 바꾼다.
- probe가 성공한 뒤 project build·실행 실패는 skip으로 낮추지 않는다.
- finite, death, 17명 contention workload를 실행하고 sanitizer 진단과 로그
  불변식을 함께 확인한다.

ThreadSanitizer는 실행한 경로의 data race를 찾는 도구다. deadlock, starvation,
mutex fairness, 정확한 사망 지연, 모든 failure path의 resource safety를
증명하지 않는다. 반대로 functional check는 의미 상태를 확인하지만 sanitizer가
찾는 비동기 memory access 전체를 대신하지 않는다. 두 검증 범위를 함께 사용해야
한다.

## Unverified boundaries

- 가능한 모든 schedule과 장시간 starvation
- 처리하지 않는 mutex lock·unlock, broadcast, `printf` failure
- allocation과 condition init/destroy의 결정적 failure
- `clock_gettime` 실패 뒤 graceful cleanup
- 실제 host 부하에서의 최대 death detection latency
- 처음부터 `INT_MAX`번 식사하는 실행과 `int64_t` meal counter의 한계
- 지원되지 않는 sanitizer runtime에서의 data-race 부재

따라서 한 번의 성공, 반복 성공, sanitizer 무보고를 현재 설계의 전 범위
증명으로 표현하지 않는다.
