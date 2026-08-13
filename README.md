# thread-dining

`thread-dining`은 식사하는 철학자 문제를 C와 POSIX thread로 구현한 실행
프로그램이다. 각 철학자는 worker thread이고, 포크는 mutex이며, main thread는
공유 상태를 감시한다.

## Build and run

```sh
make
./philo 5 800 100 100
./philo 5 800 100 100 3
```

CLI는 다음 순서의 인자를 받는다.

```text
number_of_philosophers time_to_die time_to_eat time_to_sleep [number_of_times_each_philosopher_must_eat]
```

- 철학자 수는 `1..200`이다.
- 모든 숫자 값은 선행 `+` 하나를 허용하는 양의 십진수다. 공백, `-`, 빈
  문자열과 `0`은 거부한다.
- 세 시간 값과 선택적 `must_eat`의 공개 입력 상한은 `INT_MAX`다.
- 시간 상태와 철학자별 누적 완료 횟수 `meals`는 `int64_t`를 사용한다.
- 인자 오류는 usage를 standard error에 쓰고 종료 코드 `1`을 반환한다.
- `bonus` target은 지원하지 않는다.

모든 시간의 단위는 밀리초다. 식사 횟수 제한을 지정하면 모든 철학자가 목표에
처음 도달했을 때 실행이 끝난다. 먼저 목표를 채운 철학자는 전체 종료 전까지
추가 식사를 할 수 있으므로 내부 `meals`는 공개 `must_eat`보다 커질 수 있다.

## Execution and result

```text
인자 검증
  → table·배열·mutex·condition variable 초기화
  → worker 생성과 준비 barrier
  → CLOCK_MONOTONIC 기준 시각을 한 번 정하고 전체 release
  → 포크·식사 반복과 main monitor
  → 완료 또는 사망 terminal state 확정
  → 시작한 worker join
  → 파괴 안전성 판정
  → destroy 또는 _exit
```

모든 철학자가 선택적 목표 식사 횟수를 채우거나 한 철학자의 사망이 확정되면
simulation이 끝난다. 사망은 제품 오류가 아니므로 join과 destroy가 성공하면 종료
코드는 `0`이다. 잘못된 입력과 초기화·실행·정리 오류는 `1`이다.
`pthread_join` 결과가 불확실하면 공유 객체를 파괴하지 않고 오류를 쓴 뒤
`_exit(1)`로 process 전체를 끝낸다.

## Log contract

standard output의 상태 줄은 다음 다섯 형태다.

```text
<elapsed_ms> <id> has taken a fork
<elapsed_ms> <id> is eating
<elapsed_ms> <id> is sleeping
<elapsed_ms> <id> is thinking
<elapsed_ms> <id> died
```

경과 시각은 모든 worker가 공유하는 단조 기준 시각에서 계산한다. 사망이
확정되면 `died`는 한 번만 출력되고 이후 일반 상태 로그는 억제된다. 다만
`printf` 오류는 실행 결과로 전파하지 않으며 제품은 `SIGPIPE` disposition이나
mask를 바꾸지 않는다. 따라서 닫힌 출력 pipe와 기본 signal 정책에서는 예정된
return 또는 `_exit`보다 signal 종료가 먼저 일어날 수 있다.

## Synchronization boundary

- 홀수 ID는 왼쪽 포크부터, 짝수 ID는 오른쪽 포크부터 잠가 고전적인 원형
  대기를 끊는다.
- 모든 worker가 준비된 뒤 같은 `start_ms`와 `last_meal_ms`로 출발한다.
- 식사를 시작할 때 `last_meal_ms`를 갱신하고, 중단되지 않고 완료된 식사만
  `meals`에 더한다.
- `full_count`는 식사 수의 합이 아니라 목표에 처음 도달한 철학자의 수다.
- monitor가 찾은 사망 후보는 최신 시각과 식사 상태로 다시 확인한 뒤 terminal
  state와 사망 로그를 확정한다.
- 성공한 초기화·thread 생성·join 단계를 장부로 남기고 안전성이 확인된 자원만
  파괴한다.

이 규칙은 원형 교착을 피하지만 POSIX mutex의 공정성, starvation 부재나
철학자별 최대 대기 시간을 보장하지 않는다. 포크를 기다리는 mutex lock에는
timeout이나 cancellation 경로가 없다.

## Documents

- [프로그램과 자원 lifecycle](architecture/program-and-resource-lifecycle.md)
- [포크·식사·terminal state](architecture/fork-meal-and-termination-state.md)
- [시간과 동시성 검증 경계](architecture/time-and-concurrency-verification-boundary.md)
- [구현 형성 기록](devlog/README.md)

## Verification commands

```sh
make test
make test-tsan
```

`make test`는 입력, 단조 시계, 시작 barrier, terminal state, 중단된 식사,
`INT_MAX` 다음 식사 카운터, 부분 thread 생성, join·destroy 실패, 반복 schedule과
로그 불변식을 검사한다. `make test-tsan`은 먼저 sanitizer build·runtime 지원을
probe한 뒤 제한 식사, 사망과 17명 경합 workload를 검사한다.

기본 `TSAN_REQUIRED=0`에서 sanitizer를 사용할 수 없으면 스크립트는 `skipped`와
종료 코드 `77`로 구분한다. 반드시 사용할 수 있어야 하는 환경에서는
`TSAN_REQUIRED=1 make test-tsan`을 실행한다. 기능 검사와 ThreadSanitizer의
확인 범위 및 미확인 영역은 [검증 경계](architecture/time-and-concurrency-verification-boundary.md)에
정리했다.

## Non-guarantees

- scheduler 지연, mutex 경합, polling과 밀리초 절삭을 포함한 사망 감지 지연의
  엄격한 상한
- 가능한 모든 schedule의 탐색과 장시간 starvation 부재
- 정상 경로의 일부 mutex lock·unlock, condition broadcast와 출력 오류 복구
- 지원되지 않는 sanitizer runtime에서의 data-race 부재
- `int64_t` 누적 식사 카운터의 최대값까지 도달하는 장시간 실행
