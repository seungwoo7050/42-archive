# 포크·식사·terminal state

현재 worker와 monitor는 fork ownership, meal state, terminal decision을 서로
다른 mutex로 나눈다. 이 문서는 각 mutex가 무엇을 보호하고 어떤 순서로
사용되는지 고정한다.

## Synchronization map

| synchronization object | 보호하거나 직렬화하는 상태 |
| --- | --- |
| `forks[i]` | i번째 포크의 단독 ownership |
| `state_mutex` | `ended`, `full_count`, 각 `meals`·`last_meal_ms`, barrier의 `ready_count`·`start_released`·`run_error`, start time publication |
| `start_cond` | `state_mutex`와 함께 worker 준비 및 공통 출발 조건을 기다림 |
| `print_mutex` | 상태 줄의 출력 순서와 terminal 확인·사망 출력의 결합 |

`config`는 초기화 뒤 immutable이다. `fork_count`, ready flags,
`threads_started`, `threads_joined`, `destroy_safe`는 worker가 아니라 lifecycle을
관리하는 main thread의 장부다. 이 장부를 `state_mutex`가 보호한다고 해석하면
안 된다.

## Fork order

두 개 이상의 철학자는 ID parity에 따라 첫 mutex를 다르게 잡는다.

```text
odd id  : left  → right
even id : right → left
```

현재 원형 배치에서 모든 worker가 같은 방향의 fork 하나를 들고 다음 fork를
기다리는 고전적 circular wait를 끊는다. 이 규칙은 deadlock 회피 규칙이지
fair scheduler가 아니다. POSIX mutex는 대기 순서를 보장하지 않으므로 특정
철학자의 starvation 부재나 최대 대기 시간을 도출할 수 없다.

철학자가 둘 이상이면 짝수 ID worker는 loop 전에 중단 가능한 1ms 대기를 한 번
수행한다. 첫 fork 경쟁을 분산하는 시작 stagger일 뿐이며, 이후 schedule의
공정성이나 starvation 부재를 보장하지 않는다.

fork lock에는 timeout이나 cancellation이 없다. terminal state가 설정돼도 mutex를
기다리던 worker는 기존 소유자가 unlock한 뒤에야 진행한다. 두 fork를 모두 얻은
직후 `ended`를 확인하고, 이미 끝났다면 식사를 시작하지 않고 fork를 반환한다.

철학자가 한 명이면 left와 right가 같은 mutex다. 이 경우 두 번 잠그지 않고 한
번만 잠근 뒤 fork 로그를 남기고 `time_to_die + 1` 동안 중단 가능한 대기를 한다.
사망 확정은 여전히 main monitor가 담당한다.

## Meal start and completion are different events

현재 식사 흐름은 다음과 같다.

```text
두 fork lock
  → ended 확인
  → state_mutex에서 last_meal_ms = monotonic now
  → "is eating" 로그 시도
  → time_to_eat 동안 중단 가능한 대기
  → state_mutex에서 ended 재확인
  → int64_t meals 증가
  → 목표를 처음 채웠다면 full_count 증가
  → 마지막 완료자라면 ended = 1
  → fork unlock
```

사망 기한은 식사를 **시작한** `last_meal_ms`부터 계산한다. `meals`는 정해진
식사 시간을 채우고 완료 임계 구역에 들어갔을 때도 `ended == 0`인 식사만 센다.
대기 중 terminal state를 관찰했거나 완료 직전 다른 흐름이 종료를 확정했다면
카운터를 바꾸지 않는다.

`full_count`는 식사 완료 횟수의 합이 아니라 목표에 최초 도달한 철학자 수다.
각 철학자의 `meals`가 `must_eat`와 같아지는 순간에만 한 번 증가한다. 마지막
철학자의 증가와 `ended = 1`은 같은 `state_mutex` 임계 구역에 있으므로 “모두
완료”와 “아직 실행 중” 사이의 공개 상태가 생기지 않는다.

먼저 목표를 채운 worker를 개별 정지시키지는 않는다. 다른 철학자가 목표에
도달해 전체 종료가 확정될 때까지 추가 식사를 완료할 수 있고, 이때 `meals`는
`must_eat`보다 커진다. 카운터는 단조 증가하고 equality 검사는 각 철학자에게
한 번만 참이므로 `full_count`는 중복 증가하지 않는다.

명령행의 `must_eat` 계약은 `INT_MAX`까지 허용하며 값 자체는 `int`에 저장한다.
하지만 목표가 `INT_MAX`인 철학자도 전체 종료를 기다리는 동안 한 끼를 더
완료할 수 있으므로 내부 카운터에는 `INT_MAX + 1`을 표현할 여지가 필요하다.
`meals`가 `int`라면 이 증가가 signed integer overflow와 undefined behavior를
만든다. 따라서 `meals`는 `int64_t`이며, 공개 입력 상한을 낮추지 않고 모든
유효한 목표와 적어도 그 다음 식사까지 안전하게 센다. `full_count`는 0부터
철학자 수까지의 값만 가지며 목표를 최초 달성한 철학자의 수라는 의미를 유지한다.

## Monitoring and death recheck

monitor는 약 500µs sleep을 둔 polling loop에서 단조 시각을 읽고
`state_mutex` 아래 다음을 검사한다.

```text
now - last_meal_ms >= time_to_die
```

처음 찾은 항목은 사망 **후보**일 뿐이다. monitor가 상태 mutex를 놓고 출력
경계로 이동하는 사이 해당 철학자가 식사를 시작할 수 있다. 따라서
`philo_try_log_death`가 fresh monotonic time과 최신 `last_meal_ms`를 다시
비교한다.

```text
print_mutex
  → state_mutex
  → !ended와 사망 조건 재검사
  → 조건이 참이면 ended = 1
  → state_mutex unlock
  → "died" 출력 시도
  → print_mutex unlock
```

후보가 더는 stale하지 않으면 terminal state를 확정한다. 후보가 살아났거나
전체 완료가 먼저 끝을 확정했다면 사망을 출력하지 않고 monitor가 다음 상태를
관찰한다. 한 scan에서 여러 후보가 보이면 배열의 낮은 index가 먼저 선택되지만,
이는 scan order일 뿐 실제 starvation 시작 순서나 scheduler fairness 판정이
아니다.

## Terminal log ordering

일반 로그도 `print_mutex`를 먼저 얻고, 그 안에서 `state_mutex`를 통해 `ended`를
확인한다. 사망 경로와 잠금 순서가 `print_mutex → state_mutex`로 같다.

```text
일반 로그가 print_mutex를 먼저 획득
  → 일반 로그 시도 완료
  → 사망 확정과 died

사망 경로가 print_mutex를 먼저 획득
  → ended 설정과 died 시도
  → 이후 philo_log가 호출돼도 내부 ended 검사에서 printf 생략
```

따라서 내부 상태와 성공한 출력 호출의 순서에서는 `died` 뒤 일반 상태 줄이
없다. routine 자체의 함수 호출을 막는다는 뜻은 아니다. `philo_log`가 print
lock 안에서 output attempt를 생략한다. 또한 `printf`의 반환값을 확인하지
않으므로 출력 장치 오류, buffering 실패, process-wide `_exit`가 있는 경우
외부 byte stream의 완전성까지 보장하지 않는다.

## Lock-order boundary

worker는 fork를 보유한 채 state나 print 경계에 들어갈 수 있다. 현재 코드에는
`state_mutex`나 `print_mutex`를 보유한 채 새 fork를 잠그는 역방향 경로가 없다.
monitor도 후보 탐색 때 잡은 state mutex를 놓은 뒤
`print_mutex → state_mutex` 재검사로 이동한다.

이 잠금 graph와 parity fork order가 현재 deadlock 회피의 근거다. 하지만
`pthread_mutex_lock`·unlock 실패는 확인하지 않고, mutex fairness도 없으므로
deadlock 회피를 progress나 정확한 death latency 보장으로 확대할 수 없다.
