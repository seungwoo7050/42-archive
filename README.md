# push_swap

> 제한된 두 스택 연산만으로 정수열을 정렬하는 C99 `push_swap` 구현과, 그 정확성·실패 경로·자원 비용을 검증하는 개발 사례집이다.

이 저장소는 실행 가능한 최종 코드와 함께 현재 구조를 설명하는 `architecture/`, 구현이 발전한 과정을 기록한 `devlog/`, 기능·장애·자원 회귀를 다루는 `tests/`를 제공한다.

| 프로그램 | 역할 |
| --- | --- |
| `push_swap` | 중복 없는 정수 입력을 정렬하는 명령열을 stdout으로 생성 |
| `checker` | stdin의 명령열을 재생하고 최종 상태를 `OK` 또는 `KO`로 판정 |

## 특징

- 분리된 argv와 공백으로 묶인 argv를 함께 처리하는 엄격한 정수 파서
- 원래 값과 `0..n-1` rank를 한 쌍으로 보존하는 배열 스택
- 2~5개 전용 정렬과 6개 이상용 stable LSD binary radix sort
- 최대 3바이트 명령만 허용하는 bounded checker reader
- 불변식·독립 모델·fault injection·sanitizer·resource baseline을 결합한 검증

## 빠른 시작

### 요구 환경

- POSIX 계열 환경
- C99를 지원하는 C 컴파일러
- `make`
- Python 3 — 전체 테스트 실행 시 필요
- ASan/UBSan 지원 컴파일러 — `make sanitize` 실행 시 필요

### 빌드

```bash
make
```

다음 실행 파일이 저장소 루트에 생성된다.

```text
push_swap
checker
```

### 명령 생성과 검증

```bash
./push_swap "3 2 1"
```

```text
sa
rra
```

생성한 명령열을 바로 검증할 수 있다.

```bash
./push_swap "3 2 1" | ./checker "3 2 1"
```

```text
OK
```

숫자는 여러 인자로 나누거나 공백 포함 인자로 묶을 수 있다.

```bash
./push_swap 8 3 7 1 9 0 2 6 5 4 > moves.txt
./checker 8 3 7 1 9 0 2 6 5 4 < moves.txt
wc -l < moves.txt
```

## CLI 계약

### 숫자 입력

각 토큰은 선택적인 `+` 또는 `-` 뒤에 한 자리 이상의 ASCII 숫자가 오는 형식이다. 공백·탭·개행 등 C whitespace를 구분자로 사용하며, 모든 값은 실행 환경의 `int` 범위에 있어야 하고 서로 중복될 수 없다.

```bash
# 모두 유효
./push_swap 3 2 1
./push_swap "3 2" 1
./push_swap "+3" "002 -1" 7

# 모두 오류
./push_swap 1 2 2
./push_swap 2147483648
./push_swap 12a
./push_swap ""
```

숫자 인자 없이 실행하면 빈 입력으로 정상 종료한다. 반면 인자가 존재하지만 전체 토큰 수가 0이면 오류다. 위의 정수 경계 예시는 일반적인 32비트 `int` 환경을 나타내며, 실제 범위는 빌드 환경에 의존한다.

### 출력과 종료 코드

| 상황 | stdout | stderr | 종료 코드 |
| --- | --- | --- | ---: |
| `push_swap` 성공 | 명령 0개 이상 | 없음 | 0 |
| checker 완료 조건 충족 | `OK` | 없음 | 0 |
| 유효한 명령열이지만 미정렬 | `KO` | 없음 | 0 |
| 잘못된 입력·명령·할당·I/O | 없음 또는 이미 기록된 명령 prefix | 가능한 경우 `Error` | 1 |
| 숫자 없이 checker 실행 | 없음 | 없음 | 0 |

`KO`는 실행 오류가 아니라 정상 판정이다. `push_swap`에서 출력 도중 영구 오류가 발생하면 이미 stdout에 기록된 prefix는 되돌리지 않는다.

checker는 한 줄에 하나의 명령을 읽으며 마지막 명령의 개행은 생략할 수 있다. 빈 명령, NUL이 포함된 frame, 개행을 제외하고 4바이트 이상인 frame, 지원하지 않는 명령은 오류다.

## 연산 집합

각 스택에서 index `0`이 top이다. 원소가 부족한 swap·rotate나 비어 있는 원본에 대한 push는 상태를 바꾸지 않는다.

| 계열 | A | B | A와 B |
| --- | --- | --- | --- |
| swap | `sa` | `sb` | `ss` |
| push | `pa`: B → A | `pb`: A → B | — |
| rotate | `ra` | `rb` | `rr` |
| reverse rotate | `rra` | `rrb` | `rrr` |

`push_swap`은 상태 전이를 적용하면서 명령을 출력하고, checker는 같은 전이를 출력 없이 재생한다.

## 설계 개요

```text
argv
  │
  ▼
토큰화·정수 검증
  │
  ▼
원래 값 보관 + rank 0..n-1 배정
  │
  ▼
A와 빈 B 생성
  ├── push_swap ──> tiny/radix 정렬 ──> 명령 stdout
  └── checker ────> bounded reader ──> 명령 재생 ──> OK / KO
```

내부 스택은 `values`, `ranks`, `size`, `capacity`를 가진다. `values[i]`와 `ranks[i]`는 언제나 같은 논리 원소이며, 모든 연산은 두 배열을 함께 이동해야 한다. A와 B 전체에서 원소 쌍의 집합도 보존되어야 한다.

### 좌표 압축

입력 값을 복사해 정렬하고 중복을 검사한 뒤 각 값에 상대 순위인 rank를 부여한다.

```text
[-20, 500, 7] -> [0, 2, 1]
```

이후 정렬기는 원래 정수의 부호나 크기 대신 `0..n-1` rank만 사용한다.

### 정렬 전략

| 입력 크기 | 전략 |
| ---: | --- |
| 0~1 또는 이미 정렬됨 | 명령 없이 종료 |
| 2 | 필요한 경우 `sa` |
| 3 | 가능한 여섯 상대 순서를 직접 분기 |
| 4~5 | 최솟값을 가까운 방향으로 회전해 B로 보낸 뒤 3개 정렬 후 복귀 |
| 6 이상 | rank의 낮은 bit부터 처리하는 stable LSD binary radix sort |

radix 라운드에서는 현재 bit가 `1`인 원소를 `ra`, `0`인 원소를 `pb`로 분류한 뒤 B가 빌 때까지 `pa`한다. 안정적인 분할이 이전 라운드에서 정한 낮은 bit 순서를 보존한다.

### 비용

- rank 전처리: 일반적인 `qsort` 비용 모델에서 `O(n log n)` 비교, `O(n)` 임시 공간
- radix의 논리 명령 수: `Θ(n log n)`
- 주요 상주 저장 공간: `O(n)`
- 현재 배열 표현의 최악 물리 이동: `O(n² log n)`

논리적인 스택 명령 한 번과 실제 데이터 이동 비용은 같지 않다. `push`와 `rotate`가 `memmove`로 배열 앞부분을 옮기기 때문이다. 이 구현은 예측 가능한 정렬 절차와 검증 가능성을 우선하며 최단 명령열을 목표로 하지 않는다.

## 오류와 자원 처리

- `read`와 `write`가 `EINTR`로 중단되면 같은 구간을 재시도한다.
- 양수의 short write는 기록된 길이만큼 전진해 나머지를 이어 쓴다.
- 0바이트 write와 다른 영구 오류는 실패로 전파한다.
- 시작 시 `SIGPIPE`를 무시해 닫힌 stdout pipe를 일반 `EPIPE` 실패로 처리한다.
- 각 실패 경로는 자신이 소유한 스택 배열과 checker 명령 버퍼를 정리한다.
- fault-injection 빌드는 N번째 allocation/read/write 실패와 계측 정보를 환경 변수로 주입한다.

## 검증

### 전체 테스트

```bash
make test
```

실행 순서는 다음과 같다.

1. `push_swap`과 `checker` 빌드
2. C 연산 불변식 검사
3. Python 기능 및 differential property 검사
4. fault-injection 장애 경로 검사
5. 자원 회귀 검사

### Sanitizer

```bash
make sanitize
```

AddressSanitizer와 UndefinedBehaviorSanitizer를 적용한 별도 바이너리로 연산 불변식과 기능 테스트를 실행한다. fault 및 resource 스크립트는 이 target에서 반복하지 않는다.

### 검사 범위

| 영역 | 현재 검사 |
| --- | --- |
| 파서 | 혼합 argv, 중복, 비숫자, 빈 입력, 정수 경계 |
| 연산 | 11개 연산의 의미, 값–rank 결합, 원소 보존 |
| 작은 정렬 | 크기 2~5의 모든 152개 순열 |
| 큰 정렬 | 여러 크기와 고정 seed의 독립 Python 재생 |
| 결정성 | 같은 입력을 두 번 실행해 동일 명령열 확인 |
| 명령 수 | 100개 입력 1,500 이하, 500개 입력 8,000 이하 |
| checker 입력 | 빈 frame, NUL, 과도한 길이, 무개행 마지막 명령 |
| 장애 처리 | N번째 allocation/read/write 실패, `EINTR`, short/zero write, 닫힌 pipe |
| 자원 | 종료 시 live allocation 0, 명령 수·배열 이동·peak allocation 회귀 |

제품 checker와 생성기는 C 연산 구현을 공유한다. 같은 결함을 함께 정답으로 받아들이는 위험을 줄이기 위해 테스트의 Python 리스트 모델이 명령열을 별도로 재생하고, C 불변식 검사와 실제 checker 판정을 함께 사용한다.

### 현재 resource baseline

세 seed `7`, `4242`, `9001`에서 각각 검사한다.

| 입력 크기 | 명령 수 | 최대 `(value, rank)` 이동 | 최대 project peak allocation |
| ---: | ---: | ---: | ---: |
| 10 | 65 | 650 | 160 B |
| 100 | 1,084 | 105,000 | 1,600 B |
| 500 | 6,784 | 3,200,000 | 8,000 B |

이 수치는 현재 구현의 회귀 탐지 기준이며 최소 명령 수, 모든 입력의 상한, 프로세스 RSS 또는 성능 SLA가 아니다. `qsort`, libc, Python interpreter, allocator metadata와 kernel buffer는 project allocation 계측에 포함되지 않는다.

## Make targets

| 명령 | 동작 |
| --- | --- |
| `make` / `make all` | 두 실행 파일 빌드 |
| `make test` | 기능·불변식·장애·자원 테스트 |
| `make sanitize` | ASan/UBSan 빌드와 핵심 테스트 |
| `make clean` | 오브젝트와 테스트 캐시 제거 |
| `make fclean` | `clean` 후 실행 파일 제거 |
| `make re` | 전체 재빌드 |

기본 컴파일 옵션:

```text
-std=c99 -Wall -Wextra -Werror -Wpedantic
```

## 저장소 구조

```text
.
├── architecture/   # 현재 구조, 공개 계약, 비용 모델
├── devlog/         # 구현 단계와 검증 근거의 발전 기록
├── include/        # 공용 내부 타입과 함수 선언
├── src/            # parser, stack, operations, sorter, CLI, runtime
├── tests/          # 기능·불변식·fault·resource 검사
└── Makefile
```

## 상세 문서

### 현재 구조와 계약

- [생성기와 checker 계약](architecture/generator-and-checker.md)
  파싱, 상태 전이, 자원 소유권, checker framing, 출력 및 종료 계약을 설명한다.
- [정렬 전략과 연산 비용](architecture/sorting-and-operation-cost.md)
  rank 불변식, tiny/radix 정렬의 근거, 논리 명령과 배열 이동 비용을 다룬다.

### 구현 발전 기록

- [값과 순위의 표현 불변식](devlog/01-value-rank-invariant.md)
- [작은 입력을 처리하고 기수 정렬로 확장하기](devlog/02-small-input-and-radix-sort.md)
- [제한된 명령 입력과 출력 실패](devlog/03-command-io-and-failures.md)
- [독립 모델과 자원 회귀 검사](devlog/04-property-and-resource-tests.md)

`architecture/`는 현재 상태를, `devlog/`는 그 상태에 도달한 과정과 검증 증거가 추가된 순서를 맡는다.

## 제한 사항

- 생성 명령열의 전역 최소성을 보장하지 않는다.
- 6개 이상 모든 순열을 전수 검사하지 않는다.
- 배열 기반 표현으로 인해 논리 명령 수보다 실제 이동 비용이 클 수 있다.
- blocking stdin을 전제로 하며 non-blocking event loop 통합을 제공하지 않는다.
- 프로세스 전체의 `SIGPIPE` 정책을 바꾸므로 라이브러리로 재사용할 때 주의해야 한다.
- 정수 경계 테스트는 일반적인 32비트 `int` 환경을 중심으로 구성되어 있다.
- Windows 전용 빌드, 패키지 배포, 자동 배포 구성은 포함하지 않는다.

## 라이선스

현재 저장소에는 별도의 `LICENSE` 파일이 포함되어 있지 않다. 코드를 복제·수정·재배포하려면 저장소 소유자에게 사용 조건을 확인해야 한다.
