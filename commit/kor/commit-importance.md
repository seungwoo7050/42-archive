# 프로젝트 중요도 프로필
프로젝트: `thread-dining` (`c/philo` 브랜치)
도메인: POSIX 스레드를 사용하는 C 동시성 시스템 프로그래밍, Dining Philosophers 시뮬레이션
주요 목적: 범위가 제한된 CLI 계약을 파싱하고, 참가자마다 하나의 철학자 worker를 공유 포크 mutex 위에서 실행하며, 사망 또는 선택적 전역 식사 완료 조건에서 종료한다. 상태 로그를 순서대로 출력하고, 모든 스레드가 정지했음이 확인된 경우에만 자원을 해제한다.
확정된 커밋 범위: `c/philo`에서 도달 가능한 독립적이고 선형적인 전체 이력. root `7974e1e1c4cd`부터 tip `96164b50af2a`까지 오래된 순으로 38개 커밋이다. root에는 parent가 없고 merge commit도 없으며, 관련 없는 상속 ancestor는 포함하지 않는다. `commit-bodies.md`에서는 제외되었던 문서 전용 커밋도 이 분류에는 포함한다.

## 핵심 기술 영역
- 동시 실행 상태를 만들기 전에 수행하는 엄격한 명령행 검증과 숫자 범위 제한.
- 테이블, 철학자 배열, 포크 배열, mutex, condition variable, borrowed pointer를 포함한 공유 소유권 표현.
- 원형 토폴로지의 포크 획득 순서, worker 상태 전이, deadlock 방지.
- 식사 시작, 식사 완료, quota, 카운터 범위의 의미 규칙.
- monotonic 경과 시간 계산, 중단 가능한 deadline wait, 공통 worker 시작 시점.
- 사망 및 완료 상태를 authoritative하게 감시하고 종료 상태를 게시하며 종료 로그 순서를 보장하는 구조.
- 부분 초기화, worker 생성, join, 파괴, 재시도, 안전하지 않은 프로세스 종료 경로.
- 결정적 fault injection, 반복 schedule 테스트, ThreadSanitizer 기반 race 탐지.

## 핵심 아키텍처
- `main`은 stack에 존재하는 `t_table`을 소유하고 `parse → initialize → run → destroy` 순서를 실행한다. join 안전성을 확인할 수 없으면 파괴와 정상 프로세스 teardown을 건너뛰고 `_exit`를 사용한다.
- `t_table`은 변경되지 않는 설정, 포크와 철학자 할당, 전역 상태, 동기화 객체, start barrier, lifecycle 추적 정보를 소유한다. `t_philo` 인스턴스는 해당 테이블과 포크 배열 내부를 가리키는 포인터를 빌려 사용한다.
- 포크는 원형으로 배치된 mutex다. 각 철학자 worker는 로컬 eat-sleep-think 사이클을 수행하고 `state_mutex` 아래에서 자신의 식사 상태를 갱신한다.
- 호출 스레드는 monitor 역할을 유지하며 전역 사망 또는 완료 정책을 소유한다. 다른 worker의 사망 판단을 worker에 위임하지 않고 `state_mutex` 아래에서 worker 상태를 관찰한다.
- `start_cond`와 `state_mutex`는 readiness barrier를 구성하며, 모든 worker에 하나의 `start_ms`와 하나의 초기 `last_meal_ms` 값을 게시한다.
- `print_mutex`는 출력을 직렬화한다. 사망을 재검증하고 확정할 때는 이를 `state_mutex`보다 먼저 잡아 종료 결정과 마지막 `died` 출력 시도를 결합한다.
- 시간은 monotonic millisecond 추상화를 통해 접근한다. 대기는 종료 플래그를 polling하므로 전역 완료 또는 사망 이후 worker가 종료와 무관한 동작을 중단할 수 있다.
- 검증은 여러 층으로 구성된다. 소스 수준 경계 테스트는 macro로 대체한 pthread 및 시간 호출을 사용하고, shell suite는 공개 동작과 반복 schedule을 검사하며, 선택적 ThreadSanitizer 경로는 실제 실행된 메모리 접근의 race를 확인한다.

## 핵심 불변식
- 잘못된 형식, 0, 음수, overflow, 계약 범위를 벗어난 입력은 어떤 테이블 또는 worker 자원도 생성되기 전에 거부해야 한다.
- 하나의 포크는 인접한 두 철학자가 공유하는 하나의 mutex identity를 가져야 한다. 철학자가 둘 이상일 때의 획득 순서는 모든 worker가 왼쪽 포크를 잡아 생기는 원형 대기를 깨야 하며, 철학자가 한 명일 때는 같은 mutex를 다시 잠가서는 안 된다.
- worker 생성 또는 scheduling 지연과 관계없이 모든 worker는 같은 게시된 monotonic 시작 시점과 같은 초기 기아 기준 시각에서 시작해야 한다.
- `ended`, `full_count`, 각 `meals`, 각 `last_meal_ms`, barrier predicate는 정의된 `state_mutex` 경계를 통해 변경되거나 관찰되어야 한다.
- 식사는 설정된 식사 시간이 끝나고 동기화된 commit 지점에서도 시뮬레이션이 활성 상태일 때만 카운트한다. `full_count`는 철학자가 처음 목표에 도달할 때만 증가한다.
- 사망 후보는 종료 상태가 되기 전에 최신 시각과 가장 최근 식사 상태를 기준으로 다시 검증해야 한다. 사망은 최대 한 번만 확정되며, 종료 상태가 게시된 뒤에는 일반 상태 로그를 출력하려 해서는 안 된다.
- 초기화된 자원은 소유 추적 정보가 존재한다고 나타낼 때만 최대 한 번 파괴한다. 파괴 실패 후에는 아직 해제되지 않은 자원을 정확히 나타내는 재시도 가능한 상태를 유지해야 한다.
- 시작된 모든 worker가 성공적으로 join되지 않았다면 공유 테이블 메모리와 동기화 객체를 파괴해서는 안 된다. join 호출을 시도했다는 사실만으로는 호출이 실패한 경우 worker 정지를 증명할 수 없다.
- 경과 시간과 기아 판단에는 monotonic clock을 사용해야 하며, clock 획득 실패를 임의의 시각으로 대체해서는 안 된다.
- 내부 식사 누적은 공개 `INT_MAX` 목표를 넘어도 정의된 범위에서 동작해야 하며 `full_count`에 두 번째로 기여해서는 안 된다.

## 주요 엔지니어링 난점
- 원형 대기를 깨면서도 이를 fairness 또는 starvation freedom 보장으로 과장하지 않는 것.
- 성공적인 스레드 생성과 실제 worker readiness를 구분하고, 부분 시작 및 condition wait 실패 상황에서도 공통 시간 기준을 게시하는 것.
- 사망 감지, 종료 상태 게시, 출력을 선형화해 오래된 후보가 사망 처리되지 않고 일반 로그가 사망 줄 뒤에 나타나지 않도록 하는 것.
- 포크 획득 또는 `is eating` 로그를 완료된 quota 진행과 동일시하지 않고, 식사를 commit되는 연산으로 정의하는 것.
- 부분 초기화, join 실패, 파괴 도중 오류에서도 정확한 자원 소유 근거를 보존하는 것.
- join되지 않은 worker가 여전히 테이블을 참조할 수 있어 cleanup 자체가 안전하지 않은 경우를 처리하는 것.
- schedule에 의존하는 동작을 테스트하면서 모든 진행, 지연, fairness를 보장한다고 주장하지 않는 것.
- 지원되지 않는 ThreadSanitizer 인프라와 실제 race 또는 프로젝트 빌드 실패를 구분하는 것.

## 실무 엔지니어링 영역
- overflow를 고려한 파싱, 명시적 공개 제한, 안정적인 usage 및 종료 상태 계약.
- 요청된 최종 상태가 아니라 실제 준비된 자원을 기준으로 하는 단계적 초기화와 rollback 추적.
- unsafe join 상태가 일반 생성 또는 wait 오류보다 우선하도록 하는 오류 우선순위 규칙.
- hang을 관찰 가능한 실패로 바꾸는 제한 시간 기반 테스트 timeout.
- pthread, clock, sleep, destructor 경계에 대한 macro 기반 fault injection.
- 수행해서는 안 되는 destructor, stdio flush, `atexit` 동작을 검증하는 프로세스 수준 negative test.
- 철학자별 진행, nondecreasing timestamp, 종료 줄 위치를 확인하는 반복 workload 검사.
- 선택적 sanitizer 도구에 대한 capability probe와 명시적 skip 의미 규칙.
- scheduler fairness, 엄격한 사망 탐지 지연, 처리하지 않는 pthread 또는 출력 실패처럼 보장하지 않는 항목의 명시.

## S 등급 기준
- 모든 worker, monitor, lifecycle 코드가 의존하는 소유권 또는 책임 아키텍처를 확립한다.
- Dining Philosophers 런타임의 핵심 worker 또는 monitor 메커니즘을 구현한다.
- 하나의 공유 시작 시점, 선형화된 종료 상태 및 사망 로그, worker 정지가 증명된 뒤에만 허용되는 파괴처럼 프로젝트 전반의 동시성 불변식을 확립하거나 복원한다.
- 누락될 경우 완성된 프로젝트의 정확성 설명에 중대한 공백이 생기는 비자명한 race 또는 lifecycle 위험을 해결한다.

## A 등급 기준
- 파싱, 시간, 포크 edge case, 식사 집계, 초기화 rollback, 프로세스 실패 처리에서 중요하지만 범위가 더 좁은 불변식을 확립한다.
- S 등급 메커니즘 또는 어려운 부분 실패 경계에 대해 결정적인 회귀 근거를 제공한다.
- 핵심 아키텍처 자체를 정의하지는 않지만 중요한 cross-component 통합 또는 검증을 도입한다.
- 코드 변경이 작더라도 유효 실행 경로의 undefined behavior 또는 정확히 한 번의 자원 처리를 수정한다.

## 일반적인 B 등급 작업
- 이미 확립된 아키텍처 안에서 build 연결, entry point 구성, time helper, 공개 smoke test 같은 일반 지원 동작을 구현한다.
- A 등급 수정에 대한 집중 회귀 테스트를 추가하지만 그 자체로 넓은 불변식을 확립하지는 않는다.
- 책임 또는 소유권 경계를 바꾸지 않고 polling 정밀도, 출력 grammar, 입력 범위를 다듬는다.
- 런타임 동작을 변경하지 않지만 기술적으로 유용한 문서화 또는 검증 지원을 제공한다.

## 일반적인 C 등급 작업
- 지속적인 기술적 영향이 거의 없는 문서 전용 scaffold.
- 동시성 및 lifecycle 설계에 비해 영향이 작은 로컬 출력 또는 유지보수 수정.
- 의미 있는 프로젝트 불변식을 확립하거나 보호하지 않는 기계적 변경.

## 프로젝트 전용 태그
CONCURRENCY — 공유 상태 동기화, 스레드 interleaving, lock 순서 동작
CLI_CONTRACT — 공개 인자 grammar, 숫자 제한, usage 출력, 프로세스 상태 동작
FORK_ORDER — 포크 identity, 획득 순서, 단일 철학자 aliasing edge
START_BARRIER — worker readiness, condition variable release, 공통 시작 시각 게시
TERMINAL_STATE — 사망 또는 식사 완료 확정과 이후 일반 로그 억제
MEAL_ACCOUNTING — 식사 시작 및 완료 의미, quota 기여, 카운터 범위
RESOURCE_LIFECYCLE — 할당, pthread 생성 및 join, rollback, 파괴, unsafe teardown
TIME_MODEL — clock source, 밀리초 표현, deadline, 경과 timestamp, 대기 반응성

# 커밋 분류
| 커밋 | 제목 | 중요도 | 태그 | 요약 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `7974e1e1c4cd` | `docs(readme): 프로젝트 목적과 초기 개발 규약 정의` | C | - | 초기 프로젝트 목표, 공개 명령 형식, 디렉터리 규약, 예정된 검증 방식을 정의한다. | 문서 전용 root scaffold다. 예정된 범위를 기록하지만 실행 가능한 메커니즘이나 불변식을 확립하지 않으며, 최종 문서가 이후 설명 가치 대부분을 대체한다. |
| `cd72d2150f99` | `feat(parse): 철학자 실행 인자 검증` | A | CLI_CONTRACT, EDGE, PRACTICAL | overflow를 안전하게 처리하는 양의 10진수 파싱을 추가하고 필수 및 선택적 CLI 인자를 `t_config`로 정규화한다. | 동시성 자원이 만들어지기 전 유효성 경계를 만들고 잘못된 형식이나 overflow 입력이 런타임에 들어오는 것을 막는다. 중요한 정확성 작업이지만 프로젝트의 핵심 동기화 아키텍처를 정의하지는 않는다. |
| `34563a9f6881` | `feat(cli): 입력 계약을 실행 진입점에 연결` | B | CLI_CONTRACT, INTEGRATION | 인자 파싱을 `main`에 연결하고, 잘못된 입력의 usage 출력과 초기 프로세스 종료 동작을 정의한다. | 앞선 커밋에서 확립한 파서 계약 안에서 필요한 실행 파일 통합을 수행한다. 독립적인 아키텍처 판단은 적고 아직 시뮬레이션을 실행하지도 않는다. |
| `2abcff211110` | `build(philo): 실행 파일 빌드 규약 구성` | B | PRACTICAL | `philo` Makefile, 엄격한 warning flag, pthread 컴파일 및 링크, cleanup 타깃, 생성 파일 제외 규칙을 추가한다. | 재현 가능한 빌드를 위해 필요하고 적절하지만 런타임의 동시성, 시간, lifecycle 설계를 결정하기보다는 이를 지원하는 작업이다. |
| `16343e76b54b` | `feat(init): 테이블 저장소와 철학자 관계 초기화` | S | ARCH, CORE, RESOURCE_LIFECYCLE | `t_table`과 `t_philo`를 정의하고 배열을 할당하며, 인접 철학자들이 공유 포크 객체를 원형 구조로 참조하도록 매핑한다. | 이후 모든 worker, monitor, 동기화, cleanup 판단이 의존하는 소유권 그래프와 토폴로지를 확립한다. 이를 빼면 포크 공유 방식과 worker가 빌린 메모리의 소유자가 누구인지 설명하는 데 큰 공백이 생긴다. |
| `1d69df7db78c` | `feat(init): 뮤텍스 수명주기와 실패 롤백 구현` | A | RESOURCE_LIFECYCLE, ARCH, RISK | state, print, fork mutex를 초기화하면서 readiness flag와 초기화된 포크 개수로 rollback 상태를 기록한다. | 단계적 소유 자원 추적은 의미 있는 lifecycle 설계이며 부분 생성에서 복구할 수 있게 한다. 다만 로컬 포크 rollback이 공통 destructor와 충돌해 정확히 한 번의 해제 보장은 이후 수정 전까지 완성되지 않았으므로 S가 아닌 A다. |
| `509453b01515` | `feat(time): 밀리초 시각 계산 함수 추가` | B | TIME_MODEL, CORE | 밀리초 시각 획득을 중앙화하고 중단 가능한 deadline 기반 sleep loop를 도입한다. | 유용한 핵심 지원 추상화이며 종료 반응성을 가능하게 하지만 첫 구현은 여전히 wall time을 사용하고 clock 실패를 무시한다. 더 강한 프로젝트별 판단은 이후 monotonic clock 수정에서 이뤄진다. |
| `033ad537d166` | `feat(log): 상태 로그의 동시 출력 보호` | A | TERMINAL_STATE, CONCURRENCY, ARCH | 동기화된 종료 상태 접근을 추가하고 일반 로그를 직렬화하며 하나의 사망 로그 경로를 도입한다. | 완성된 설계가 사용하는 상태 및 출력 책임 경계를 만든다. 하지만 `ended` 게시와 print lock 획득이 아직 하나의 선형화된 연산이 아니어서 이후 수정되는 종료 순서 race가 남아 있으므로 A다. |
| `b68f40819af4` | `feat(routine): 철학자의 식사·수면·사고 흐름 구현` | S | CORE, CONCURRENCY, FORK_ORDER | worker cycle, 홀짝 기반 포크 획득, 식사 timestamp와 카운터, 수면, 사고를 구현한다. | Dining Philosophers의 중심 메커니즘이다. 홀짝 규칙이 고전적인 원형 대기 패턴을 깨고, worker 상태 전이는 이후 모든 edge case 및 집계 수정의 기반이 된다. 이 커밋 없이는 프로젝트를 일관되게 설명할 수 없다. |
| `40ea0f871300` | `feat(monitor): 사망과 식사 완료 조건 감시` | S | CORE, CONCURRENCY, TERMINAL_STATE | 식사 진행과 기아를 관찰해 전역 종료 조건을 선택하는 main-thread monitor를 도입한다. | worker는 로컬 진행을 담당하고 하나의 authoritative monitor가 사망과 완료 정책을 담당하도록 역할을 분리한다. 이후 이력에서 최종 판단의 atomicity를 강화하더라도 이 worker-monitor 분리는 프로젝트를 정의하는 아키텍처 결정이다. |
| `3d5ad3a4a050` | `feat(thread): 철학자 작업 스레드 시작과 종료` | A | CORE, INTEGRATION, RESOURCE_LIFECYCLE | 철학자마다 worker를 생성하고 monitor를 실행하며 시작된 worker를 join하고 부분 생성 실패를 처리한다. | 핵심 구성 요소를 통합하는 중요한 작업이지만 orchestration 자체는 일반적인 create-monitor-join 구조이며, 이후 프로젝트를 정의하는 shared start barrier와 join safety 판정은 아직 없다. |
| `aadf07199897` | `feat(main): 입력부터 자원 정리까지 실행 흐름 연결` | B | INTEGRATION, RESOURCE_LIFECYCLE | parse, table 초기화, 동시 실행, table 파괴를 정상 실행 수명주기로 연결한다. | 프로그램을 end-to-end로 사용할 수 있게 하지만 이미 도입된 subsystem의 일반적인 조합이다. 원래 cleanup 경로도 이후 복구 가능한 오류와 안전하지 않은 파괴를 구분하기 전 단계다. |
| `c8531c91f0fb` | `fix(single): 철학자가 한 명일 때 포크 재잠금 방지` | A | FORK_ORDER, EDGE, RISK | 단일 철학자가 유일한 포크를 한 번만 잠근 뒤 monitor의 사망 판정을 기다리는 경로를 추가한다. | 일반 원형 표현에서는 `N == 1`일 때 두 포크 포인터가 같은 객체를 가리켜 기존 routine이 non-recursive mutex에서 결정적으로 self-deadlock한다. 유효 입력의 정확성 결함을 해결하지만 일반 다중 worker 아키텍처를 바꾸지는 않는다. |
| `fe0a2d15b29b` | `fix(meals): 식사 제한 도달 시 작업 루프 즉시 중단` | A | MEAL_ACCOUNTING, TERMINAL_STATE, RISK | worker의 locked 완료 경로 안에서 전역 식사 완료를 확정하고 worker가 종료 이후 상태로 진행하지 못하게 한다. | 마지막 필수 식사와 `ended` 사이의 polling 간격을 제거하고 완료 뒤 불필요한 수면 및 사고를 막는다. 중요한 집계 및 종료 정확성 수정이지만 전체 worker-monitor 아키텍처를 세분화하는 작업이다. |
| `18a0c638113a` | `fix(parse): 밀리초 인자의 상한 적용` | B | CLI_CONTRACT, EDGE | 시간 인자를 `INT_MAX` 이하로 제한해 공개 숫자 범위와 맞춘다. | 기존 파서 설계 안에서 수행한 명확한 경계 수정이다. 공개 계약을 일관되게 유지하지만 새로운 런타임 메커니즘이나 어려운 불변식을 도입하지 않는다. |
| `a5b6232c55cb` | `fix(cli): 명령행 오류 출력 길이 계산` | C | CLI_CONTRACT | 하드코딩된 `write` 길이를 usage 및 오류 메시지용 로컬 문자열 길이 헬퍼로 대체한다. | usage write에서 불필요한 NUL byte 하나를 제거하고 유지보수 위험을 줄이지만, 프로젝트의 다른 변경과 비교하면 동작 및 구조적 영향이 작다. |
| `bd6bb8eb18f4` | `test(smoke): 주요 입력과 종료 조건 검증` | B | TEST, CLI_CONTRACT, CORE | 잘못된 입력, overflow, 단일 철학자 사망, 유한한 사망 없음 식사 실행을 제한 시간 내 shell 수준에서 검증한다. | 첫 번째 유용한 통합 suite이며 timeout으로 hang도 탐지하지만, 프로젝트에서 가장 어려운 동시성 또는 lifecycle 경계를 증명하기보다 예상되는 공개 동작을 검사한다. |
| `a21e4cc75272` | `fix(time): 짧은 대기 시간의 초과 지연 완화` | B | TIME_MODEL, PRACTICAL | deadline에 가까워지면 sleep polling 간격을 500마이크로초에서 100마이크로초로 줄인다. | 확립된 polling 설계 안에서 짧은 시간의 반응성을 개선하는 국소적인 정밀도 보정이며 새로운 시간 또는 동기화 모델은 아니다. |
| `f145d33f2773` | `test(format): 필수 상태 로그 형식 검증` | B | TEST, TERMINAL_STATE | 허용되는 다섯 가지 로그 형식을 검사하는 `awk` validator를 추가하고 smoke workload에 적용한다. | 출력 grammar를 실행 가능한 계약으로 만들고 예상치 못한 텍스트를 막지만 이미 확립된 logging 경계에 대한 일반적인 계약 검증이다. |
| `10665e0a5bf9` | `fix(init): 포크 초기화 실패 시 중복 정리 방지` | A | RESOURCE_LIFECYCLE, DEBUG, RISK | 초기화 실패 시 로컬 포크 파괴를 제거하고 공통 destructor만 `fork_count`를 소비하도록 한다. | double-destroy 경로의 근본 원인을 수정해 부분 초기화에 대한 정확히 한 번의 소유권 불변식을 복원한다. 중요한 lifecycle debugging이지만 전체 프로세스 수명주기보다 구성 단계에 국한된다. |
| `800408d6d84e` | `test(init): 부분 뮤텍스 초기화 롤백 검증` | A | TEST, RESOURCE_LIFECYCLE, RISK | mutex 초기화 실패를 주입하고 파괴 주소를 기록해 중복 rollback 및 남은 할당을 탐지한다. | 실제 자원 안전 결함에 대한 정확히 한 번의 rollback 불변식을 결정적으로 고정하고 실패 후 cleanup이 idempotent함을 검증한다. 일반적인 coverage가 아니라 강한 회귀 근거다. |
| `5b32d5bdb955` | `fix(time): 단조 시계로 경과 시간 계산` | A | TIME_MODEL, RISK, CORE | 경과 시간 상태를 `int64_t`로 옮기고 wall time을 `CLOCK_MONOTONIC`으로 교체하며 clock 실패를 프로세스 치명적 오류로 처리한다. | 기아, deadline, 로그 offset에 걸친 시간 불변식을 복원해 달력 조정이 사망을 만들거나 숨기는 문제를 막는다. 여러 subsystem에 걸쳐 중요하지만 소유권, barrier, 종료, lifecycle 아키텍처만큼 프로젝트를 규정하는 결정은 아니다. |
| `f01d62cde8ce` | `test(time): 단조 시계와 시계 실패 경로 검증` | B | TEST, TIME_MODEL | `clock_gettime`을 대체해 clock 종류, 밀리초 변환, 치명적 실패 동작을 검증한다. | 중요한 monotonic time 수정에 직접적인 근거를 제공하지만 이미 확립된 결정을 집중 검증하는 테스트이며 독립적인 아키텍처 기여는 아니다. |
| `e7e62cbe185f` | `fix(thread): 시작 장벽으로 기준 시각 통일` | S | START_BARRIER, CONCURRENCY, TIME_MODEL | condition variable readiness barrier를 추가하고 worker release 전에 하나의 공유 `start_ms`와 초기 `last_meal_ms` 값을 게시한다. | 성공한 `pthread_create`와 실제 worker readiness 사이의 비자명한 차이를 해결한다. 이 차이는 늦게 시작한 worker가 시작 전부터 사망 시간을 소모하는 문제를 만들 수 있다. 부분 생성과 wait 실패의 abort 동작도 정의하므로 프로젝트의 시간 정확성 설명에 필수적이다. |
| `bfbfa0431732` | `test(thread): 지연된 작업자의 공통 시작 시각 검증` | A | TEST, START_BARRIER, EDGE | 다섯 번째 worker를 150밀리초 지연시키면서 모든 worker가 readiness에 도달하고 식사 목표를 완료하도록 요구한다. | 인위적인 skew를 사용해 barrier의 목적을 scheduler 운이 아니라 결정적인 회귀 시나리오로 만든다. 아키텍처 자체를 변경하지 않으면서 S 등급 동시성 불변식을 강하게 검증한다. |
| `f57f6ec0be87` | `test(thread): 시작 대기 실패 전파 검증` | B | TEST, START_BARRIER, RESOURCE_LIFECYCLE | worker 측 `pthread_cond_wait` 실패를 한 번 주입하고 `run_error`, 종료 release, `PHILO_ERR` 전파를 검사한다. | 확립된 barrier protocol의 유용한 실패 경로 coverage다. 지연 시작 테스트나 이후 lifecycle fault matrix보다 범위와 구조적 의미가 좁다. |
| `a2e90b84641b` | `fix(monitor): 종료 상태와 사망 로그를 원자적으로 확정` | S | TERMINAL_STATE, CONCURRENCY, RISK | state lock 안에서 완료를 확정하고, 종료 줄을 출력하기 전에 공통 `print_mutex` → `state_mutex` 순서 아래에서 사망을 다시 검증한다. | 두 개의 프로젝트 핵심 race를 수정한다. 사망 후보가 게시 전 오래될 수 있고, 일반 로그가 `died` 뒤에 나타날 수 있었던 문제다. 새로운 선형화 지점과 lock 순서가 최종적인 단일 사망, 종료 후 로그 없음 불변식을 확립한다. |
| `c424b7d91ed1` | `test(monitor): 완료 상태와 오래된 사망 판정 검증` | A | TEST, TERMINAL_STATE, DEBUG | monitor unlock 경계에서 상태를 변경해 완료가 lock 안에서 확정되고 오래된 사망 후보가 재검증되는지 확인한다. | 바로 앞 S 등급 수정이 해결한 정확한 interleaving을 의도적으로 겨냥한다. 일반 출력 검사보다 훨씬 강한 종료 선형화 계약의 근거다. |
| `53e591effb4a` | `fix(routine): 중단된 식사를 완료 횟수에서 제외` | A | MEAL_ACCOUNTING, TERMINAL_STATE, RISK | interruptible sleep이 완료 여부를 반환하게 하고 전체 식사 시간이 끝났으며 시뮬레이션이 활성 상태일 때만 식사 카운터를 증가시킨다. | 식사를 시작하는 것과 완료를 commit하는 것 사이의 실제 transaction 경계를 확립해 종료 중단이 quota를 잘못 만족시키는 일을 막는다. 중요한 핵심 불변식이지만 프로젝트 전반의 아키텍처보다 하나의 연산을 정교하게 만든다. |
| `73b5551a76f4` | `test(routine): 중단된 식사의 카운터 불변식 검증` | B | TEST, MEAL_ACCOUNTING | 중단되는 sleep을 대체해 철학자별 및 전역 완료 카운터가 바뀌지 않는지 검증한다. | 식사 transaction 수정에 대한 정밀한 회귀 검사지만 harness와 범위는 집중된 지원 근거이며 더 넓은 아키텍처 또는 실패 경로 기여는 아니다. |
| `a7783d04107f` | `fix(lifecycle): 부분 시작과 정리 오류를 호출자에 전파` | S | RESOURCE_LIFECYCLE, RISK, HARD | 시작 및 join된 스레드 추적, unsafe destruction 판정, 재시도 가능한 destroy 상태, 정지를 증명할 수 없을 때의 `_exit` 경로를 추가한다. | cleanup을 제어 흐름상의 관례가 아니라 근거 기반 안전 결정으로 바꾼다. join 실패 시 worker가 여전히 테이블 메모리를 빌려 사용 중일 수 있으므로 파괴를 거부하고 정상 teardown 없이 종료하는 것이 use-after-free와 활성 동기화 객체 파괴를 막는 데 필수적이다. |
| `7586b605302b` | `test(lifecycle): 생성·결합·정리 실패 경로 검증` | A | TEST, RESOURCE_LIFECYCLE, EDGE | create, join, destroy 실패를 여러 위치에서 주입해 rollback, unsafe 거부, 자원 기록 보존, 재시도 가능성을 검사한다. | 0개, prefix, 파괴 중간 상태까지 lifecycle 재설계의 어려운 부분 상태 동작을 검증한다. 해당 S 등급 안전 모델 자체를 정의하지 않지만 신뢰도를 실질적으로 높인다. |
| `37b29557cccc` | `test(main): 결합 실패 시 안전하지 않은 정리 방지` | A | TEST, RESOURCE_LIFECYCLE, RISK | stub, buffered output, `atexit` hook을 사용해 unsafe 경로가 파괴와 정상 프로세스 teardown을 건너뛰는지 증명한다. | negative assertion으로 단순한 0이 아닌 상태가 아니라 `_exit`의 정확한 프로세스 수준 의미를 검증한다. worker가 살아 있을 수 있는 lifecycle 안전 경계에서 일반 flush와 callback을 의도적으로 제외한다는 중요한 근거다. |
| `3d24bea01441` | `test(concurrency): 철학자별 진행과 종료 로그 불변식 검증` | A | TEST, CONCURRENCY, TERMINAL_STATE | 반복되는 다중 철학자 진행 workload, 반복 사망 workload, timestamp 검사, gate로 동기화한 logger-vs-death race harness를 추가한다. | 현실적인 schedule에서 최종 lock 순서와 종료 계약을 압박하고 사망 게시와 많은 동시 로그 시도를 직접 겹치게 한다. 모든 schedule이나 fairness를 증명하는 것은 아니지만 중요한 검증이다. |
| `20f8270c78bb` | `test(tsan): ThreadSanitizer 검증 경로 추가` | A | TEST, CONCURRENCY, PRACTICAL | capability probe가 포함된 ThreadSanitizer 빌드와 유한, 사망, contention workload를 동작 검증과 함께 추가한다. | 실제 실행된 data race를 확인하는 두 번째 검증 계층을 만들고 지원되지 않는 인프라와 프로젝트 실패를 올바르게 구분한다. concurrency 프로젝트에 강한 엔지니어링이지만 런타임 메커니즘을 확립하지 않으며 deadlock이나 모든 interleaving을 증명할 수도 없다. |
| `4c224ae86f2b` | `fix(state): 식사 완료 횟수의 정수 범위 확장` | A | MEAL_ACCOUNTING, EDGE, RISK | 내부 식사 카운터를 `int64_t`로 넓혀 공개 목표가 `INT_MAX`인 경우에도 그 이후 식사를 안전하게 계속 기록할 수 있게 한다. | 작은 diff지만 유효 실행 경로의 signed-overflow undefined behavior를 막고 공개 목표와 누적 런타임 상태의 구분을 보존한다. 추론은 미묘하고 정확성에 중요하지만 범위는 핵심 동시성 아키텍처보다 좁다. |
| `054ef46f80c7` | `test(routine): 최대 목표 이후 식사 카운터 검증` | B | TEST, MEAL_ACCOUNTING, EDGE | 철학자를 `INT_MAX`에서 시작해 한 끼를 더 완료시키고 `INT_MAX + 1`과 중복 `full_count` 기여가 없음을 검증한다. | 기존 overflow 경계와 중복 임계값 기여 위험을 정확히 다루지만 앞선 숫자 수정에 대한 집중 회귀 근거이며 독립적인 주요 결정은 아니다. |
| `96164b50af2a` | `docs(project): 프로젝트 문서 정리` | B | ARCH, PRACTICAL, LEARNING | README를 확장하고 소유권, 포크 및 종료 상태, 시간, 검증 경계, 명시적인 비보장 항목을 설명하는 상세 아키텍처 문서를 추가한다. | 실행 동작을 바꾸지 않으므로 A 또는 S에는 해당하지 않는다. 다만 단순한 유지보수보다 의미가 크며 최종 lock 순서, lifecycle 판정, 식사 의미, 검증 한계를 정확한 기술 명세로 통합한다. |

# 개발 흐름
## 흐름: 소유권 추적에서 unsafe 파괴 판정까지
`16343e76b54b` S — 테이블을 할당 자원과 철학자가 빌려 쓰는 원형 객체의 소유자로 확립한다.
↓
`1d69df7db78c` A — 단계적 mutex 구성과 자원 readiness 추적을 추가하지만 rollback 책임은 아직 분산되어 있다.
↓
`10665e0a5bf9` A — 부분 포크 rollback을 공통 destructor로 통합해 정확히 한 번의 cleanup을 복원한다.
↓
`800408d6d84e` A — 초기화 실패를 주입해 준비된 각 mutex가 한 번만 파괴되고 할당이 해제되는지 증명한다.
↓
`a7783d04107f` S — 소유권 근거를 worker 생성, 성공적인 join, 파괴 허용 여부, 재시도 가능한 cleanup, unsafe 상태의 `_exit`까지 확장한다.
↓
`7586b605302b` A — 여러 부분 상태 위치에서 create, join, destroy 실패를 검증한다.
↓
`37b29557cccc` A — unsafe join 결과 이후 실행 파일이 자원을 파괴하거나 일반 stdio 및 `atexit` teardown을 수행하지 않음을 증명한다.

**의미**
이 흐름은 소유권 그래프에서 시작해 명시적인 파괴 가능 여부 판정으로 발전한다. 초기 초기화는 readiness flag와 `fork_count`를 사용하고, 이후 이력에서 중복 rollback 책임이 드러나 제거된다. 더 뒤의 lifecycle 재설계는 같은 원칙을 스레드에도 적용한다. 공유 메모리는 성공적인 join을 통해 모든 borrower가 정지했음이 증명된 뒤에만 파괴할 수 있다. 테스트는 반환된 오류만 확인하지 않고 자원 추적 정보가 유지되는지와 금지된 cleanup이 실제로 발생하지 않는지도 검증한다.

## 흐름: wall clock 헬퍼에서 하나의 공유 monotonic 시작 시점까지
`509453b01515` B — 처음에는 `gettimeofday`를 사용해 밀리초 시각과 중단 가능한 deadline wait를 중앙화한다.
↓
`a21e4cc75272` B — 짧은 대기를 위해 마지막 구간의 polling 간격을 줄인다.
↓
`5b32d5bdb955` A — wall time을 `CLOCK_MONOTONIC`으로 교체하고 시간 상태를 넓히며 clock 실패를 치명적 오류로 처리한다.
↓
`f01d62cde8ce` B — monotonic clock 식별자, 변환, 실패 종료를 검증한다.
↓
`e7e62cbe185f` S — readiness barrier를 추가하고 실제 준비가 끝난 뒤 모든 worker에 하나의 시작 timestamp를 게시한다.
↓
`bfbfa0431732` A — 한 worker를 의도적으로 지연시키고 공유 release가 시작 전 기아 시간 계산을 방지하는지 검증한다.
↓
`f57f6ec0be87` B — condition wait 실패를 주입해 barrier가 중단되고 오류가 전파되는지 확인한다.

**의미**
첫 시간 추상화는 코드의 응집도를 높였지만 달력 보정과 순차 시작 지연을 여전히 허용했다. monotonic 수정은 경과 시간 산술을 보호하고, barrier는 “스레드 객체가 생성됨”과 “worker가 준비됨”을 분리해 해당 시각에 올바른 동시성 의미를 부여한다. 둘을 합쳐 로그, 기아 검사, sleep이 사용하는 시간 기준을 정의한다. 테스트는 이러한 시간 정확성과 scheduler fairness 또는 엄격한 지연 보장을 구분한다.

## 흐름: 핵심 routine에서 commit되고 범위가 안전한 식사 진행까지
`b68f40819af4` S — eat-sleep-think worker와 홀짝 기반 포크 순서를 도입한다.
↓
`c8531c91f0fb` A — 철학자 한 명의 두 포크 포인터가 같은 mutex를 가리키는 원형 aliasing edge를 처리한다.
↓
`fe0a2d15b29b` A — 마지막 식사의 critical section 안에서 전역 완료를 확정하고 완료 후 loop 상태 진입을 막는다.
↓
`53e591effb4a` A — 식사 시도와 commit된 식사를 분리하고 중단 또는 종료 이후 진행을 거부한다.
↓
`73b5551a76f4` B — 중단된 식사 wait를 주입해 local 및 global 카운터가 모두 증가하지 않는지 검증한다.
↓
`4c224ae86f2b` A — 누적 식사 횟수를 넓혀 유효한 `INT_MAX` 목표를 넘어도 signed overflow가 발생하지 않게 한다.
↓
`054ef46f80c7` B — `INT_MAX + 1`을 검증하고 한 철학자가 `full_count`에 두 번 기여하지 않는지 확인한다.

**의미**
초기 routine은 프로젝트의 핵심 메커니즘을 제공하지만 서로 다른 세 가지 의미 경계를 드러낸다. `N == 1`에서의 포크 identity, 정확한 전역 완료 전이, 식사 시작과 식사 완료의 차이다. 이후 커밋은 식사 진행을 동기화된 transaction으로 만들고 공개 목표 타입과 더 넓은 누적 상태를 분리한다. 이 흐름은 동시성 정확성이 단순히 로그를 남기거나 자원을 획득한 시점이 아니라 연산이 실제로 commit되는 시점을 정의하는 데 달려 있음을 보여준다.

## 흐름: 직렬화된 출력에서 선형화된 종료 상태까지
`033ad537d166` A — 동기화된 종료 상태 접근과 print mutex를 도입하지만 사망 게시와 최종 출력을 아직 원자적으로 결합하지 않는다.
↓
`40ea0f871300` S — main-thread monitor를 기아와 전역 완료 판단의 권한자로 확립한다.
↓
`a2e90b84641b` S — `print_mutex → state_mutex` 아래에서 사망을 재검증하고, lock 안에서 완료를 확정하며 종료 상태에 명시적인 선형화 지점을 부여한다.
↓
`c424b7d91ed1` A — 기존 unlock 경계에서 상태를 변경해 오래된 후보가 거부되고 완료 상태가 lock 해제 전에 이미 종료 상태임을 증명한다.

**의미**
출력 자체가 종료 결정을 표현하는 경우 단순한 출력 직렬화만으로는 충분하지 않다. 초기 monitor는 한 lock 아래에서 후보를 찾고 다른 lock을 통해 출력해 오래된 사망과 사망 뒤 일반 로그가 발생할 수 있는 window를 남겼다. 수정은 lock 순서를 통일하고 predicate를 다시 검증하며 `ended` 게시와 마지막 줄을 결합한다. 결정적인 경계 테스트는 반복 실행의 우연한 타이밍에 기대지 않고 실제 race를 재현한다.

## 흐름: 동시 동작을 위한 계층형 검증 근거
`bd6bb8eb18f4` B — 입력, 사망, 유한 완료를 위한 제한 시간 기반 공개 smoke case를 추가한다.
↓
`f145d33f2773` B — 다섯 가지 상태 로그 grammar를 실행 가능한 출력 계약으로 만든다.
↓
`3d24bea01441` A — 진행 및 사망 schedule을 반복하고 gate 기반 logger-vs-death race harness를 추가한다.
↓
`20f8270c78bb` A — 의미적 로그 및 진행 검증을 유지하면서 capability probe가 포함된 ThreadSanitizer workload를 추가한다.

**의미**
검증 전략은 공개 end-to-end 동작에서 schedule stress로, 다시 동적 data race 탐지로 확장된다. 각 계층은 서로 다른 실패를 관찰한다. timeout은 hang을 드러내고 parser 검사는 계약 위반을 찾으며 반복 workload는 schedule 민감한 증상을 드러내고 ThreadSanitizer는 실제 실행된 메모리 접근을 관찰한다. 또한 한 번의 성공 실행이나 sanitizer 결과를 fairness, deadlock freedom, 모든 interleaving의 증명으로 취급하지 않고 각 계층의 한계를 유지한다.

# 가장 중요한 커밋
## feat(init): 테이블 저장소와 철학자 관계 초기화
커밋: `16343e76b54b`
중요도: S
태그: ARCH, CORE, RESOURCE_LIFECYCLE

### 문제
시뮬레이션에는 설정, 전역 상태, 철학자별 상태, 공유 포크, 이후 worker 스레드가 빌려 사용할 주소를 지속적으로 표현할 하나의 구조가 필요하다. 인접한 철학자들이 같은 소유권 객체를 두고 경쟁해야 하므로 포크를 각 철학자에 복사해서는 안 된다.

### 결정
`t_table`이 설정과 두 개의 연속 배열을 소유하고, 각 `t_philo`는 식별자와 진행 상태 및 왼쪽 포크, 오른쪽 포크, 테이블을 가리키는 borrowed pointer를 갖도록 한다. modulo 매핑으로 포크 배열을 원형으로 닫아 마지막 철학자와 첫 철학자의 관계도 다른 모든 edge와 같은 규칙을 사용한다.

### 중요했던 이유
이 소유권 그래프는 이후 모든 동기화와 cleanup의 기반이다. worker가 join될 때까지 테이블 메모리를 참조할 수 있는 이유, 포크 mutex가 안정적인 allocation에 존재해야 하는 이유, 파괴 책임이 개별 철학자가 아니라 테이블 소유자에게 있는 이유를 설명한다.

### 변경 내용
공개 헤더에 핵심 구조와 관계를 추가한다. 초기화 과정에서 포크와 철학자 배열을 할당하고 식별자와 진행 필드를 초기화하며 두 포크 포인터를 매핑하고, 부분 할당된 저장 공간은 공통 destructor를 통해 해제한다.

### 프로젝트 이해에 중요한 이유
이후의 모든 불변식은 이 소유 및 borrowing 모델을 다시 참조한다. 포크 배타성, 식사 상태 보호, 시작 시각 게시, 종료 monitoring, join 안전성, 재시도 가능한 파괴가 모두 여기에 기반한다. 완성된 아키텍처의 형태를 처음으로 명확하게 보여주는 커밋이다.

## feat(routine): 철학자의 식사·수면·사고 흐름 구현
커밋: `b68f40819af4`
중요도: S
태그: CORE, CONCURRENCY, FORK_ORDER

### 문제
동시 실행되는 철학자 worker는 공유 포크 두 개를 획득하고 기아 상태를 갱신하며 식사를 완료하고 수면과 사고를 반복해야 한다. 동시에 모든 worker가 포크 하나씩을 쥔 채 다음 포크를 기다리는 고전적인 원형 대기에도 빠져서는 안 된다.

### 결정
각 worker는 하나의 로컬 routine을 따르되 포크 획득 순서는 철학자 ID의 홀짝에 따라 바꾼다. 홀수 ID는 왼쪽 후 오른쪽, 짝수 ID는 오른쪽 후 왼쪽을 잠근다. 식사 timestamp와 카운터는 공유 state mutex 아래에서 갱신하고, 짧은 초기 지연으로 짝수 worker의 즉시 경쟁을 줄이되 fairness 보장으로 취급하지 않는다.

### 중요했던 이유
홀짝 규칙은 원형 구조에서 deadlock을 구조적으로 가능하게 만드는 균일한 lock-order cycle을 제거한다. 또한 어떤 상태가 worker 실행의 책임이고 어떤 관찰값을 monitor가 신뢰할 수 있는지도 확립한다. 이후 수정은 edge case를 다듬지만 모두 여기서 도입한 메커니즘 위에서 이뤄진다.

### 변경 내용
`routine.c`를 추가해 포크 획득 및 해제 헬퍼, 식사 시작 및 완료 상태 갱신, 식사 연산, 장기간 반복되는 eat-sleep-think loop를 구현한다. 빌드와 공개 인터페이스에도 worker entry point를 추가한다.

### 프로젝트 이해에 중요한 이유
도메인 문제 자체의 구현이다. 포크 lock graph, `last_meal_ms`와 `meals`의 출처, worker-monitor 역할 분리의 worker 측을 설명한다.

## feat(monitor): 사망과 식사 완료 조건 감시
커밋: `40ea0f871300`
중요도: S
태그: CORE, CONCURRENCY, TERMINAL_STATE

### 문제
로컬 worker 진행만으로는 시뮬레이션 전체의 종료 시점을 결정할 수 없다. 사망은 각 worker의 마지막 식사 이후 경과 시간에 따라 결정되고, 선택적 완료는 모든 철학자가 목표에 도달해야 한다. 모든 worker가 peer의 사망을 판단하게 하면 전역 정책이 중복되고 종료 조정도 복잡해진다.

### 결정
호출 스레드를 authoritative monitor로 유지한다. `state_mutex` 아래에서 polling하며 전역 완료 predicate를 검사하고 철학자의 기아 기준 시각을 순회해 하나의 종료 경로를 선택한다. worker는 로컬 routine과 상태 갱신만 담당한다.

### 중요했던 이유
상태 생성과 종료 정책을 분리한다. worker는 동기화된 사실을 게시하고 한 관찰자가 전체 시뮬레이션에 대해 이를 해석한다. 이 책임 경계 덕분에 사망 후보 재검증과 종료 로그 선형화를 모든 worker에 사망 로직을 분산하지 않고 이후 추가할 수 있다.

### 변경 내용
monitor translation unit과 공개 entry point를 추가한다. monitor는 `full_count`를 확인하고, 기아 시간이 `time_to_die`에 도달한 철학자를 찾으며, 사망 경로를 호출하고 계속 busy loop가 되지 않도록 scan 사이에서 실행을 양보한다.

### 프로젝트 이해에 중요한 이유
완성된 프로그램은 독립된 worker loop의 집합이 아니라 main-thread monitor가 감독하는 worker 시스템이다. 이후 동시성 수정의 대부분은 이 커밋에서 도입한 경계를 보호한다.

## fix(time): 단조 시계로 경과 시간 계산
커밋: `5b32d5bdb955`
중요도: A
태그: TIME_MODEL, RISK, CORE

### 문제
`gettimeofday`는 civil wall time을 측정한다. 달력 보정으로 시간이 앞뒤로 움직이면 로그 offset이 음수 또는 과도하게 커질 수 있고, 대기가 늘거나 줄며, 존재하지 않는 기아를 만들거나 실제 기아를 숨길 수 있다. 처음 사용한 host `long`은 시간 표현을 플랫폼에 종속시키고 clock 실패도 무시한다.

### 결정
모든 런타임 시간 상태를 `int64_t`로 옮기고 `philo_now_ms`에서 `clock_gettime(CLOCK_MONOTONIC)`을 사용한다. 시뮬레이션의 사망 및 순서 의미를 유지하면서 clock을 대체할 안전한 timestamp가 없으므로 clock 획득 실패는 프로세스 치명적 오류로 취급한다.

### 중요했던 이유
기아는 달력 시간이 아니라 경과 시간의 속성이다. 이 수정으로 deadline, `start_ms`, `last_meal_ms`, 로그 offset이 하나의 안정적인 순서 domain을 사용하고 외부 clock 관리가 시뮬레이션의 사실을 바꾸지 못하게 한다.

### 변경 내용
헤더, parser, monitor, logger, time helper를 고정 폭 밀리초 값으로 변경한다. 시간 구현은 monotonic seconds와 nanoseconds를 변환하고 clock을 사용할 수 없으면 오류를 출력한 뒤 `_exit`한다.

### 프로젝트 이해에 중요한 이유
모든 참가자가 monotonic 시간 소스를 공유해야 start barrier와 종료 monitor의 의미가 성립한다. 이 A 등급 커밋은 여러 S 등급 동시성 결정의 기반이 되는 시간 모델을 설명한다.

## fix(thread): 시작 장벽으로 기준 시각 통일
커밋: `e7e62cbe185f`
중요도: S
태그: START_BARRIER, CONCURRENCY, TIME_MODEL

### 문제
순차적인 `pthread_create` 호출은 순차적으로 생성된 worker가 실제 실행을 시작했음을 의미하지 않는다. 모든 worker가 routine에 도달하기 전에 `start_ms`와 `last_meal_ms`를 설정하면 지연된 worker가 준비되기도 전에 시간을 소모한 것으로 계산되어 공정한 시작 기회 없이 사망할 수 있다. 부분 생성이나 condition wait 실패로 unreleased predicate 뒤에 worker가 남을 수도 있다.

### 결정
worker는 `state_mutex` 아래에서 `ready_count`를 증가시키고 `start_cond`에서 대기한다. coordinator는 모든 예정된 worker가 준비될 때까지 기다린 뒤 하나의 monotonic timestamp를 샘플링해 table과 모든 철학자에 할당하고 `start_released`를 설정한 뒤 broadcast한다. abort 경로는 도달할 수 없는 전체 readiness를 기다리지 않고 종료 및 release predicate를 설정한다.

### 중요했던 이유
시뮬레이션 시작에 명확한 선형화 지점을 만든다. “worker가 생성됨”을 “worker가 준비되었고 같은 시간 기준을 공유함”으로 바꾸며, 실패 처리까지 barrier에 통합해 부분 시작이 deadlock으로 변하지 않게 한다.

### 변경 내용
테이블에 condition variable 기반 readiness 상태와 `run_error`를 추가한다. 초기화와 파괴 단계에서 condition variable을 관리하고, routine은 포크 동작 전에 대기하며, `philo_run`은 monitoring 및 join 전에 정상 release 또는 abort를 조정한다.

### 프로젝트 이해에 중요한 이유
barrier는 스레드 lifecycle, 시간 의미, 기아 정확성이 만나는 지점이다. delay 값을 조정하는 대신 상태 protocol 자체를 바꿔 동시성 버그를 해결한 대표적인 커밋이다.

## fix(monitor): 종료 상태와 사망 로그를 원자적으로 확정
커밋: `a2e90b84641b`
중요도: S
태그: TERMINAL_STATE, CONCURRENCY, RISK

### 문제
기존 monitor는 `state_mutex` 아래에서 사망 후보를 선택하고 lock을 놓은 뒤 별도 출력 경로에서 사망을 게시했다. 그 사이 후보가 식사를 시작하면 판단은 오래된 상태가 된다. 별개로 일반 logger는 사망 게시 전에 종료 검사를 통과한 뒤 `died` 다음에 상태 줄을 출력할 수 있었다.

### 결정
완료 상태는 state predicate를 잡은 채 확정한다. 사망은 `philo_try_log_death`로 이동해 `print_mutex`를 먼저, `state_mutex`를 다음으로 획득하고 새로운 monotonic 시각을 얻는다. `!ended`와 최신 `last_meal_ms`를 다시 검사한 뒤 `ended`를 설정하고 출력 직렬화 경계 안에서 사망 줄을 출력한다.

### 중요했던 이유
새 lock 순서와 재검증이 종료 상태의 선형화 지점을 정의한다. 오래된 후보는 폐기되고 정확히 한 경로만 사망을 확정할 수 있으며, 그 이후 도착한 logger는 print 경계 안에서 `ended`를 관찰해 일반 출력을 억제한다.

### 변경 내용
monitor loop는 lock 안에서 종료 및 완료를 직접 확인하고 후보에 대해 boolean death-attempt 함수를 호출한다. state 모듈은 기존 사망 logger를 재검증과 직렬화를 수행하는 종료 transaction으로 대체한다.

### 프로젝트 이해에 중요한 이유
여러 개의 개별 동기화 연산을 하나의 일관된 종료 계약으로 바꾸는 핵심 수정이다. 최종 lock 순서와 `died`가 마지막 성공 상태 출력이라는 보장을 함께 설명한다.

## fix(routine): 중단된 식사를 완료 횟수에서 제외
커밋: `53e591effb4a`
중요도: A
태그: MEAL_ACCOUNTING, TERMINAL_STATE, RISK

### 문제
deadline wait는 중단 가능했지만 결과를 반환하지 않았다. 다른 경로가 `ended`를 설정해 식사 시간이 일찍 끝난 worker도 식사 완료 카운터를 증가시켜, 이미 종료된 시뮬레이션에서 중단된 연산이 local 및 global quota 상태를 변경할 수 있었다.

### 결정
`philo_sleep_ms`가 deadline 도달과 종료 관찰을 구분하게 한다. `eat_once`는 wait 실패 또는 동기화된 완료 지점의 종료 상태를 중단된 식사로 처리하고 두 포크를 해제한 뒤 `meals`와 `full_count`를 변경하지 않고 반환한다.

### 중요했던 이유
식사 완료를 의도나 로그 이벤트가 아니라 commit으로 정의한다. 전역 완료가 식사 카운터에서 결정되므로 중단된 작업을 계산하면 선택적 목표를 너무 일찍 만족시키거나 사망 이후 상태를 변경할 수 있다.

### 변경 내용
sleep API가 `PHILO_OK` 또는 `PHILO_ERR`를 반환하고, `record_meal_done`은 `ended`를 다시 검사하며, 중단된 모든 식사 경로는 routine을 빠져나오기 전에 획득한 포크 mutex를 해제한다.

### 프로젝트 이해에 중요한 이유
wait와 공유 상태 변경을 걸치는 연산에는 명시적인 commit 경계가 필요하다는 프로젝트 전반의 동시성 원칙을 잘 보여준다. worker 진행이 언제 authoritative한 상태가 되는지를 정의한다는 점에서 종료 상태 선형화 작업과 연결된다.

## fix(lifecycle): 부분 시작과 정리 오류를 호출자에 전파
커밋: `a7783d04107f`
중요도: S
태그: RESOURCE_LIFECYCLE, RISK, HARD

### 문제
테이블이 부분적으로 활성화된 뒤 thread 생성, join, 동기화 객체 파괴가 실패할 수 있다. 특히 실패한 `pthread_join`은 worker가 종료되었음을 증명하지 않는다. 따라서 테이블을 해제하거나 mutex를 파괴하면 여전히 실행 중인 borrower와 race할 수 있다. 일반 오류를 반환하고 정상 cleanup을 수행하는 것은 안전하지 않다.

### 결정
테이블에 `threads_started`, `threads_joined`, `destroy_safe`를 기록한다. 시작된 모든 handle에 join을 시도하지만 성공한 경우에만 정지 추적을 증가시킨다. 하나라도 join에 실패하면 `PHILO_UNSAFE`를 반환하고 destructor는 안전 판정 없이는 자원을 건드리지 않는다. `main`은 직접 diagnostic을 출력한 뒤 정상 cleanup 대신 `_exit`를 사용한다. 자원 파괴 역시 성공한 뒤에만 추적 상태를 갱신해 명시적 teardown을 재시도할 수 있게 한다.

### 중요했던 이유
오류 보고와 lifetime safety를 분리한다. 성공적인 join을 borrowed address가 더 이상 사용되지 않는다는 근거로 삼고, unsafe 상태가 일반 생성 또는 barrier 오류보다 우선하도록 한다. 가장 위험한 실패 경로에서 use-after-free 및 활성 동기화 객체 파괴를 방지한다.

### 변경 내용
공개 상태 모델에 `PHILO_UNSAFE`를 추가한다. 초기화에서 lifecycle 추적을 구성하고, `join_started`가 판정을 반환하며, `philo_run`이 unsafe 상태를 전파한다. `philo_table_destroy`는 worker 정지를 확인하고 재시도 상태를 보존하며, `main`은 복구 가능한 cleanup과 즉시 프로세스 종료를 분리한다.

### 프로젝트 이해에 중요한 이유
초기 이력에서 도입한 소유권 모델의 결론에 해당한다. 제어 흐름이 아니라 증거에 따라 cleanup을 허용하는 이유와 worker 종료를 증명할 수 없을 때 graceful teardown을 의도적으로 포기하는 이유를 설명한다.
