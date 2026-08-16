# 프로젝트 중요도 프로필

프로젝트: `push_swap` (`seungwoo7050/42-archive`의 `c/push_swap` 브랜치)  
도메인: C99에서 제한된 stack operation을 이용한 정렬 명령 생성 및 command-stream 검증  
주요 목적: 고유 정수 sequence를 파싱하고 이를 정렬하는 유효한 stack-operation program을 출력하며, checker로 해당 program을 replay하고 판정한다. 동시에 정확성, 실패 동작, 자원 비용을 검증한다.  
확정된 커밋 범위: `c/push_swap`의 독립적인 선형 root-to-tip 전체 이력. root `8240bf969b9f`부터 tip `d0762bc9af8c`까지 36개 커밋이다. root에는 parent가 없고 이후 모든 커밋에는 parent가 하나씩 있으며 merge commit이나 관련 없는 상속 이력은 포함되지 않는다.

## 핵심 기술 영역

- 엄격한 argv tokenization, signed integer 검증, duplicate 거부, dense rank로의 coordinate compression.
- parallel array 기반 stack 상태와 허용되는 11개 operation의 정확한 의미.
- tiny sorting과 stable least-significant-bit binary radix 기반 command 생성.
- bounded stdin framing과 `OK`/`KO` verdict 의미를 포함한 generator 및 checker 통합.
- 명시적인 자원 소유권, allocation cleanup, 중단 및 부분 system call 처리, `SIGPIPE` 동작.
- C invariant, 독립 Python replay model, fault injection, 결정적 resource baseline, sanitizer를 결합한 다층 검증.

## 핵심 아키텍처

- `src/parser.c`, `src/stack.c`, `src/operations.c`, `src/runtime.c`, `src/utils.c`가 두 실행 파일에서 공유하는 common core를 구성한다.
- `push_swap`은 A를 파싱하고 같은 capacity의 빈 B를 할당한 뒤 tiny 또는 radix 전략을 선택한다. 공유 operation으로 상태를 변경하면서 대응하는 command stream을 출력한다.
- `checker`는 같은 초기 상태를 파싱하고 bounded command frame을 하나씩 읽어 출력 없이 공유 operation을 replay한다. A가 정렬되고 B가 비어 있을 때만 `OK`를 반환한다.
- 각 논리 요소는 parallel `values`와 `ranks` entry로 표현한다. 정렬 알고리즘은 dense rank를 사용하지만 모든 operation은 원래 value-rank 관계를 보존해야 한다.
- 제품 코드는 operation 의미를 공유하지만, 검증에서는 common-mode risk를 줄이기 위해 독립 Python list model을 추가한다.
- normal, fault-injection, sanitizer build는 서로 다른 object tree를 사용해 instrumentation이 일반 build의 object 재사용에 영향을 주지 않도록 한다.

## 핵심 불변식

- `values[i]`와 `ranks[i]`는 항상 같은 논리 요소를 나타내야 하며, operation은 둘을 함께 이동해야 한다.
- A와 B 전체에서 모든 입력 pair는 정확히 한 번 존재하고, 전체 활성 size는 보존되며, 각 stack은 capacity를 넘지 않는다.
- 고유 입력 `n`개를 파싱한 뒤 rank는 `0..n-1`의 bijection을 이루며 원래 value의 순서를 보존한다.
- 성공한 `push_swap` 실행은 전체 command stream이 성공적으로 출력되었다는 뜻이다. 메모리 안에서 stack이 정렬되었다는 사실만으로는 충분하지 않다.
- checker는 A가 정렬되고 B가 비어 있을 때만 `OK`를 반환한다. `KO`는 정상 verdict이며, 잘못된 입력, 잘못된 command, allocation 실패, I/O 실패는 error다.
- parser 구성은 all-or-nothing이며 모든 종료 경로에서 소유한 allocation을 전부 해제해야 한다.
- checker frame은 newline을 제외하고 최대 세 byte이며 NUL을 포함하지 않는다. `EINTR`로 중단된 `read`는 재시도하고 그 외 read error는 거부한다.
- 짧은 양의 write는 output cursor를 전진시키고, 0-byte write는 실패로 처리하며, 닫힌 pipe는 프로세스 종료가 아니라 일반 error로 처리한다.
- resource metric은 성공적으로 출력된 command만 계산하며 고정된 결정적 fixture에서 재현 가능해야 한다.

## 주요 엔지니어링 난점

- 허용된 stack operation만으로 stable radix partition을 구성하고, 이후 pass에서도 이미 처리한 낮은 bit의 순서가 유지됨을 설명하는 것.
- array-backed push 및 rotation에서 overlapping `memmove`를 수행하면서 value-rank pairing과 전체 요소 보존을 유지하는 것.
- generator와 checker가 operation 의미를 공유하되, 그 공유 구현을 유일한 correctness oracle로 사용하지 않는 것.
- allocation 실패, interrupted read/write, short write, zero-byte write, 닫힌 pipe, 이미 출력된 prefix를 transaction rollback 없이 처리하는 것.
- 정상 build 동작을 유지하면서 allocation, operation, movement 비용을 C에서 계측하고, 논리 command 비용과 물리적 배열 이동 비용을 구분하는 것.

## 실무 엔지니어링 영역

- 외부 입력 및 protocol 경계의 정확한 제한.
- 부분 초기화 또는 부분 I/O 이후의 명시적 ownership과 cleanup.
- 모든 중간 API를 통한 실패 상태 전파.
- 결정적 fixture, 작은 상태 공간의 exhaustive test, 독립 differential replay.
- 자연적으로 재현하기 어려운 allocation 및 system-call 실패에 대한 fault injection.
- command, movement, peak allocation의 재현 가능한 regression baseline.
- strict-warning, fault-injection, sanitizer build를 서로 분리한 구성.

## S 등급 기준

- 이후 parser, operation, sorting, checker, verification이 모두 의존하는 근본적인 stack representation 또는 ordering transformation을 확립한다.
- branch의 핵심 정렬 문제를 해결하는 일반 command-generation 메커니즘을 구현하고, 그 정확성을 설명하는 데 필요한 핵심 추론을 담는다.
- 빠질 경우 완성된 시스템의 동작을 이해하는 데 중대한 공백이 생기는 프로젝트 정의 수준의 불변식 또는 메커니즘을 확립한다.

## A 등급 기준

- 주요 sorting 메커니즘 자체는 아니지만 generator, checker, runtime, verification 사이의 중요한 공유 경계를 확립한다.
- 중요한 상태, ownership, framing, memory-safety, partial-I/O 불변식을 복원하거나 강하게 검증한다.
- core의 신뢰도를 실질적으로 높이는 독립 correctness oracle, 포괄적 fault-injection 근거, resource accounting을 추가한다.
- 여러 module에 영향을 주는 비자명한 통합 또는 외부 실패 문제를 해결한다.

## 일반적인 B 등급 작업

- 확립된 설계 안에서 다른 operation, parser 기능, tiny-sort case, 실행 파일 control-flow 단계, command mapping을 구현한다.
- 이미 정의된 메커니즘에 대해 일반적인 기능, edge case, determinism, command count, sanitizer, build 지원을 추가한다.
- 프로젝트 전체 수준의 새로운 기술적 판단은 제한적이지만 필요한 기능을 제공한다.

## 일반적인 C 등급 작업

- 알고리즘, 상태 ownership, protocol 계약, verification 강도에 영향이 거의 없는 문서 전용 커밋과 일반적인 cleanup 또는 유지보수.
- 기계적으로 유용하지만 branch의 핵심 엔지니어링 결정을 설명하는 데 기여가 적은 변경.

## 프로젝트 전용 태그

STACK_STATE — parallel value/rank 표현, stack ownership, operation 의미, 보존 불변식  
INPUT — argv tokenization, integer grammar, duplicate 처리, rank 할당, size safety  
SORT — tiny 또는 radix command-generation 전략과 정확성 속성  
CHECKER — command framing, silent replay, 최종 verdict protocol  
RUNTIME — allocation 및 system-call 추상화, cleanup, 외부 실패 처리  
RESOURCE — command, pair movement, 프로젝트 allocation 측정

# 커밋 분류

| 커밋 | 제목 | 중요도 | 태그 | 요약 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `8240bf969b9f` | docs(readme): 프로젝트 목표와 초기 규약을 기록 | C | - | README에 프로젝트 목표와 초기 개발 규칙을 기록한다. | 유용한 방향 설정이지만 문서 전용이며 실행 가능한 메커니즘, 불변식 강제, 검증 기능을 확립하지 않는다. |
| `96b5324448e4` | feat(model): 배열 기반 스택 상태를 구현 | S | ARCH, CORE, STACK_STATE | parallel value/rank array, stack ownership, capacity, 정렬 상태 predicate를 정의한다. | parsing, 모든 operation, 두 실행 파일, 이후 모든 테스트가 사용하는 기반 representation이다. value-rank pairing과 명시적 stack lifetime은 프로젝트 설명에 필수적이다. |
| `2e97f29961d8` | feat(io): 문자열 비교와 기본 출력을 구현 | B | RUNTIME, PRACTICAL | 프로젝트 내부 문자열 비교, descriptor 출력, 표준 error 메시지를 추가한다. | 필요한 지원 코드지만 초기 single-write interface는 최종 실패 계약을 확립하지 않으며 프로젝트를 정의하는 수준의 판단도 포함하지 않는다. 그 중요성은 이후 I/O 커밋에 있다. |
| `c0de1a1b18bb` | feat(operation): 스택 교환 연산을 구현 | A | CORE, STACK_STATE, INTEGRATION | pair를 보존하는 swap과 선택적 출력 operation wrapper를 구현한다. | swap 자체를 넘어 generator는 출력 활성화, checker는 출력 비활성화 상태로 사용할 공유 상태 전이 경계를 확립한다. 이 통합 pattern이 두 실행 파일의 구조에 실질적인 영향을 준다. |
| `73d2deb30224` | feat(operation): 스택 간 이동 연산을 구현 | B | CORE, STACK_STATE | 고정 capacity array stack 사이에서 top pair를 이동하는 `pa`, `pb`를 구현한다. | 필수 기능이지만 앞선 커밋에서 이미 확립한 representation과 wrapper pattern을 적용하는 작업이며 새로운 아키텍처 결정을 도입하지 않는다. |
| `745ec72850d2` | feat(operation): 스택 정방향 회전을 구현 | B | CORE, STACK_STATE | value-rank pairing을 유지하면서 한 스택 또는 두 스택의 forward rotation을 추가한다. | 확립된 operation 아키텍처 안에서 필요한 instruction family를 구현한 작업이다. 기술적 판단은 프로젝트 전반보다 로컬 동작에 집중된다. |
| `68dfd1b1fb58` | feat(operation): 스택 역방향 회전을 구현 | B | CORE, STACK_STATE | reverse rotation과 `rra`, `rrb`, `rrr` command wrapper를 추가한다. | 기존 array transition 및 선택적 출력 설계를 통해 instruction vocabulary를 완성하는 일반 core 구현이며 새로운 system-level 결정은 아니다. |
| `86364d27baac` | test(operation): 값과 순위의 보존 불변식을 검증 | A | TEST, STACK_STATE, RISK | pair 보존, 요소 보존, size 범위, 다중 operation sequence를 검사한다. | 11개 command 전체에서 가장 중요한 representation 불변식을 고정한다. 이 영역의 결함은 generator와 checker가 모두 손상된 상태에 동의하도록 만들 수 있으므로 core 신뢰도를 실질적으로 높이는 검증이다. |
| `7eb6890c2c13` | test(operation): 정확한 상태 전이와 no-op을 검증 | B | TEST, STACK_STATE, EDGE | 모든 operation에 대해 정확한 예상 상태와 empty/single-element no-op case를 추가한다. | 철저하고 유용한 regression coverage지만 이미 확립된 operation 계약을 정교하게 검증하는 작업이며 프로젝트 전체 메커니즘을 새로 도입하거나 복원하지 않는다. |
| `f36ad8899b5f` | feat(parse): 개별 인자의 부호 있는 정수를 파싱 | B | INPUT, EDGE | 각 argument에서 signed ASCII decimal integer 하나를 명시적인 `int` 범위 검사와 함께 파싱한다. | 엄격한 숫자 검증과 all-or-nothing cleanup은 필수 parser 작업이지만, sorting이 사용하는 결정적인 normalization보다 앞선 초기 경계 구현이다. |
| `3bfb465ebdb1` | feat(parse): 공백으로 결합된 인자 토큰을 처리 | B | INPUT, EDGE | 모든 C whitespace separator와 quoted/split argument가 섞인 입력으로 parser를 확장한다. | two-pass token count 및 fill 설계는 적절하지만 프로젝트 중심 representation이나 알고리즘을 변경하지 않고 기존 input grammar를 확장한다. |
| `e09cf45e21cd` | feat(parse): 중복 입력을 거절하고 상대 순위를 계산 | S | CORE, INPUT, SORT | duplicate를 거부하고 임의 값 sequence를 dense하고 순서를 보존하는 rank permutation으로 변환한다. | coordinate compression은 CLI domain과 모든 sorting 전략을 연결하는 핵심 다리다. signed magnitude를 무관하게 만들고 결정적인 tiny 및 radix 알고리즘을 가능하게 하는 rank bijection을 확립한다. |
| `caa54cb306ad` | feat(sort): 세 개 이하의 스택을 정렬 | B | CORE, SORT | 상대 rank case analysis로 두 요소 및 세 요소 정렬을 구현한다. | 올바른 핵심 기능이며 유용한 base case지만 rank와 operation 아키텍처 안에서 수행되는 제한된 범위의 비교적 직접적인 구현이다. |
| `160d1fb8d824` | feat(sort): 네다섯 개의 스택을 정렬 | B | CORE, SORT | 연속된 최소값을 B로 이동한 뒤 세 요소 정렬로 축소해 네 개와 다섯 개 입력을 처리한다. | tiny-sort 설계를 적절히 확장하며 작은 입력의 command 품질에 중요하지만 일반 프로젝트 동작을 정의하는 메커니즘은 아니다. |
| `1463a193a4f9` | feat(sort): 큰 입력을 기수 정렬로 처리 | S | CORE, SORT, HARD | 5개보다 큰 입력에 stable least-significant-bit binary radix sorting을 구현한다. | 프로젝트의 주된 문제를 일반 입력 규모에서 해결하는 sorting 메커니즘이다. stable partition 추론, rank-bit 순회, command complexity, 각 round의 B-empty 불변식이 엔지니어링 설명의 핵심이다. |
| `cf07495c97f7` | feat(push_swap): 정렬 명령 생성 흐름을 연결 | B | CORE, INTEGRATION | parsing, 보조 stack 할당, sorting, cleanup, `push_swap` 실행 파일을 연결한다. | generator를 실제로 사용할 수 있게 하지만 제어 흐름은 앞선 커밋에서 정의한 메커니즘과 ownership 규칙을 주로 조합한다. |
| `0b87adebca2b` | feat(checker): 표준 입력 명령 프레임을 읽음 | B | CHECKER, CORE | checker command frame을 위한 tri-state dynamic line reader를 도입한다. | checker 입력을 가능하게 하지만 범용 unbounded reader는 이후 protocol-specific bounded 설계로 교체되는 중간 구현이다. 지속적인 기술적 판단의 비중이 제한적이다. |
| `f79ae7e86592` | feat(checker): 스택 연산 명령을 해석 | B | CHECKER, INTEGRATION | 모든 유효 command 이름을 출력이 비활성화된 공유 operation 계층에 매핑한다. | generator와 상태 전이를 공유하는 것은 중요하지만, 이미 확립된 operation 추상화 안에서 직접적인 command dispatch를 수행하는 작업에 가깝다. |
| `d906f4d86528` | feat(checker): 명령 실행 결과를 판정 | A | CHECKER, CORE, INTEGRATION | checker 실행 파일을 구성하고 stdin command를 replay한 뒤 전체 상태를 기준으로 `OK` 또는 `KO`를 출력한다. | 두 번째 제품 경계와 A 정렬/B empty라는 성공 규칙을 확립한다. 잘못된 stream은 error이고 `KO`는 정상 verdict라는 의미도 정의한다. model이나 sorting 메커니즘보다는 덜 근본적이지만 중요한 통합이다. |
| `4cc9783286c0` | test(parser): 정상 입력과 오류 입력을 검증 | B | TEST, INPUT | 두 실행 파일을 통해 parser acceptance 및 rejection case를 end-to-end로 추가한다. | 유용한 공개 CLI 근거를 제공하지만 이미 구현된 parser의 예상 동작을 검증하며 새로 발견한 어려운 불변식을 다루지는 않는다. |
| `44a4da8bc63d` | test(cli): 입력 경계와 무인자 실행을 검증 | B | TEST, INPUT, EDGE | 숫자, whitespace, sign, timeout, no-argument stdin consumption의 경계 coverage를 확장한다. | checker가 값 없이 실행되었을 때 stdin을 읽지 않는다는 점까지 포함해 경계 집합이 매우 완전하지만, 확립된 CLI 계약에 대한 검증이며 핵심 아키텍처 변경은 아니다. |
| `44ee0830e9f0` | test(checker): 명령 연산과 최종 판정을 검증 | B | TEST, CHECKER | 모든 checker command를 실행하고 `OK`, `KO`, invalid-stream failure를 구분하는지 검증한다. | 필요한 실행 파일 coverage지만 checker 통합과 공유 operation이 이미 정의한 동작을 검증하며 독립 model을 추가하지는 않는다. |
| `5b7559278909` | test(sort): 생성 명령의 정렬 결과를 독립 검증 | A | TEST, SORT, RISK | 독립 Python model에서 출력 command를 replay하고 size 5까지 모든 permutation을 exhaustive하게 검증한다. | C generator와 C checker가 operation 구현을 공유하는 데 따른 common-mode risk를 직접 해결한다. tiny state 전체 coverage와 dual-oracle 검증으로 core correctness 신뢰도를 실질적으로 높인다. |
| `a16dde75d935` | test(sort): 큰 입력의 명령 수 상한을 검증 | B | TEST, PERF, SORT | 100개 및 500개 입력에 재현 가능한 command-count 상한을 추가한다. | 프로젝트의 기대 metric을 보호하지만 이미 확립된 radix 메커니즘 위에 추가되는 일반 performance regression 검사다. |
| `51bf9c41d744` | build(clean): 빌드 산출물과 테스트 캐시를 정리 | C | PRACTICAL | cleanup command를 중앙화하고 test cache를 제거하며 `.DELETE_ON_ERROR`를 활성화한다. | 저장소 위생과 실패 target 처리에는 도움이 되지만 프로젝트의 알고리즘, 상태, protocol, 실패 아키텍처를 이해하는 데 기여가 적다. |
| `5faa9d7697af` | refactor(runtime): 메모리와 입력 시스템 호출을 공통화 | A | ARCH, REFACTOR, RUNTIME | allocation, free, read를 전용 runtime 경계로 우회한다. | 이후 allocation 및 read fault injection에 필요한 testability와 observability seam을 만든다. 정상 동작은 의도적으로 유지하면서 책임 경계를 실질적으로 개선한다. |
| `63969f770a21` | test(memory): 할당 실패 뒤 자원 정리를 검증 | A | TEST, RUNTIME, RISK | N번째 allocation을 실패시키고 exit 시 live allocation 수를 보고하는 instrumented build를 추가한다. | 실제 allocation 지점을 sweep해 부분 구성된 parser, stack, checker 상태의 cleanup을 증명한다. 일반 happy-path test가 아니라 중요한 ownership 검증이다. |
| `049ecd429548` | fix(parse): 토큰 수와 배열 크기 계산을 방어 | A | INPUT, EDGE, RISK | stack array를 채우기 전에 token-count narrowing과 allocation-size overflow를 방지한다. | 작은 diff지만 wrap된 논리 count 또는 byte size가 이후 parser가 쓰는 것보다 작은 buffer를 할당하게 만들 수 있는 memory-safety 경로를 차단한다. 올바른 책임 계층에서 중요한 경계 불변식을 복원한다. |
| `7713a31cf502` | fix(checker): 명령 길이를 제한하고 중단된 읽기를 재시도 | A | CHECKER, RUNTIME, RISK | unbounded reader를 4-byte frame buffer로 교체하고 NUL 및 overlength input을 거부하며 `EINTR`를 재시도한다. | framing 추상화를 실제 3-character protocol과 일치시키고 hostile input과 무관하게 메모리 사용을 제한하며 transient interruption과 permanent failure를 구분한다. |
| `dbf76e147e68` | test(checker): 읽기 실패와 명령 경계를 검증 | A | TEST, CHECKER, RISK | permanent 및 interrupted read를 주입하고 malformed, overlong, NUL, empty, unterminated frame을 검증한다. | 정상 기능 테스트로는 도달하기 어려운 transport 실패와 protocol 경계를 실행하면서 allocation cleanup도 확인한다. 수정된 reader 계약에 대한 실질적인 근거다. |
| `315f4b91779b` | fix(io): 출력 실패를 호출 경로 끝까지 전파 | A | RUNTIME, RISK, INTEGRATION | write-all 의미, `SIGPIPE` 처리, operation부터 sorting, checker, 두 main까지 status 전파를 추가한다. | 정렬된 메모리 상태가 성공적으로 전달된 command stream인 것처럼 오인되지 않게 하는 cross-cutting reliability 수정이다. 부분 외부 효과가 있어도 자원을 leak하지 않고 실패 후 계속 실행하지 않도록 한다. |
| `e1154e181864` | test(io): 부분 출력과 영구 쓰기 실패를 검증 | A | TEST, RUNTIME, RISK | short, zero, interrupted, permanent write와 closed-pipe 및 diagnostic failure를 주입한다. | 비자명한 부분 출력 의미, 정확한 cursor 이동, 원래 실패 상태 보존, `SIGPIPE` 변환, cleanup을 검증한다. 어려운 I/O 수정에 대한 강한 근거다. |
| `23198a9cdd55` | test(sort): 결정적 다중 시드 동치 검사를 추가 | B | TEST, SORT | 명시적 deterministic permutation generator를 사용해 여러 seed와 size에서 반복 가능한 stream을 검사한다. | 재현성과 differential coverage를 개선하지만 새로운 correctness 메커니즘을 추가하기보다 verification apparatus를 정교하게 만든다. |
| `6569949742eb` | test(resource): 명령과 배열 이동 및 할당량을 기준화 | A | TEST, RESOURCE, PERF | 성공적으로 출력된 command, 논리 pair movement, peak project allocation을 계측하고 결정적 resource baseline을 추가한다. | command complexity와 연속 배열의 물리적 비용이 다르다는 주요 구현 trade-off를 측정 가능하게 만든다. correctness, movement, memory 세 차원에서 안정적인 regression 근거를 제공한다. |
| `5505adf3e469` | build(sanitize): C99 sanitizer 검증 경로를 추가 | B | TEST, RUNTIME, PRACTICAL | 별도 ASan/UBSan binary를 빌드하고 operation 및 functional suite를 실행한다. | sanitizer 검증은 유용하고 normal object와 적절히 격리되어 있지만 프로젝트 특화 메커니즘이나 수정이라기보다는 표준적인 보조 검증 경로다. |
| `d0762bc9af8c` | docs(project): 프로젝트 문서 정리 | C | - | 최종 CLI, 아키텍처, sorting, failure, verification, resource 문서를 통합한다. | 완성된 시스템을 정확히 기록하지만 커밋 자체는 실행 동작, 불변식 강제, 테스트 기능을 변경하지 않는다. |

# 개발 흐름

## 흐름: parallel stack 상태와 operation 불변식

`96b5324448e4` S — parallel value/rank stack representation, ownership model, 완료 predicate를 확립한다.  
↓  
`c0de1a1b18bb` A — pair를 보존하는 상태 전이와 emit/no-emit wrapper 경계를 도입한다.  
↓  
`73d2deb30224` B — 논리 요소를 보존하면서 stack 간 push를 추가한다.  
↓  
`745ec72850d2` B — 같은 representation에서 forward rotation을 추가한다.  
↓  
`68dfd1b1fb58` B — reverse rotation으로 instruction vocabulary를 완성한다.  
↓  
`86364d27baac` A — 모든 command에 걸쳐 pair 관계, 요소 보존, size 범위, sequence를 검증한다.  
↓  
`7eb6890c2c13` B — 정확한 상태와 요소가 부족한 stack의 no-op 동작을 고정한다.

**의미**

이 흐름은 representation에서 공유 transition 아키텍처로, 이어서 완전한 command 의미와 두 수준의 검증으로 발전한다. 핵심 판단은 개별 `memmove`가 아니라 원래 value와 dense rank를 두 stack 전체에서 하나의 논리 요소로 유지한다는 점이다. 덕분에 sorter는 rank로만 추론하면서 checker와 테스트는 원래 value와의 관계를 계속 보존할 수 있다.

## 흐름: 입력 grammar, coordinate compression, size safety

`f36ad8899b5f` B — 엄격한 signed ASCII integer parsing과 `int` 범위 검사를 확립한다.  
↓  
`3bfb465ebdb1` B — 정확한 allocation size를 사용해 mixed argv와 C-whitespace token span으로 grammar를 확장한다.  
↓  
`e09cf45e21cd` S — duplicate를 거부하고 dense한 order-preserving rank bijection을 확립한다.  
↓  
`4cc9783286c0` B — 공개 parser acceptance 및 rejection 테스트를 추가한다.  
↓  
`44a4da8bc63d` B — sign, zero 표현, whitespace, integer endpoint, timeout, no-argument stdin 동작에 대한 경계 근거를 확장한다.  
↓  
`049ecd429548` A — logical token count와 byte-size 계산의 narrowing 및 overflow를 방어한다.

**의미**

parsing은 lexical validity에서 sorting에 필요한 normalization 계약으로 발전한다. coordinate compression이 전환점이다. 임의의 signed value가 `0..n-1` permutation으로 변환된다. 이후 테스트가 외부 grammar를 정밀하게 정의하고, size 수정이 논리적으로 계산한 token 수와 안전하게 할당되는 storage 사이의 마지막 간극을 닫는다.

## 흐름: sorting engine 구축

`caa54cb306ad` B — 두 개와 세 개 요소의 전체 상태 공간을 직접 처리한다.  
↓  
`160d1fb8d824` B — B를 사용해 네 개와 다섯 개 요소를 검증된 세 요소 case로 축소한다.  
↓  
`1463a193a4f9` S — 일반 case를 위한 stable LSD binary radix sorting을 도입한다.  
↓  
`cf07495c97f7` B — parsing, B allocation, sorting, emission, cleanup을 `push_swap`으로 통합한다.

**의미**

이 흐름은 제한된 small-state 최적화와 확장 가능한 일반 메커니즘을 분리한다. tiny sorting은 최대 다섯 요소에서 불필요한 setup을 줄이고, radix sorting은 더 큰 입력에 결정적인 `Θ(n log n)` command 동작을 제공한다. 마지막 통합 커밋은 실제 실행에는 중요하지만 radix 결정의 알고리즘적 중요성을 반복하지 않는다.

## 흐름: 독립 correctness 및 비용 근거

`5b7559278909` A — 독립 Python command interpreter와 size 5까지의 exhaustive permutation을 추가한다.  
↓  
`a16dde75d935` B — 큰 deterministic case의 command-count 상한을 추가한다.  
↓  
`23198a9cdd55` B — ambient randomness를 명시적 permutation generator로 대체하고 반복 실행의 stream determinism을 검사한다.  
↓  
`6569949742eb` A — 출력 command, 논리 pair movement, peak project allocation, 최종 cleanup을 각각 baseline으로 관리한다.  
↓  
`5505adf3e469` B — 분리된 ASan/UBSan build에서 operation 및 functional suite를 실행한다.

**의미**

검증은 기능 결과에서 독립성, 재현성, 비용까지 확장된다. Python model은 제품 checker와의 common-mode risk를 줄이고, deterministic fixture는 regression 비교를 가능하게 한다. resource instrumentation은 array representation의 숨은 movement 비용을 드러내며, sanitizer는 명시적인 assertion이 놓칠 수 있는 invalid memory behavior를 보완한다.

## 흐름: checker protocol 및 verdict 강화

`0b87adebca2b` B — 초기 범용 dynamic line reader를 추가한다.  
↓  
`f79ae7e86592` B — 유효 command 이름을 공유 silent operation으로 dispatch한다.  
↓  
`d906f4d86528` A — 전체 checker lifecycle과 `OK`/`KO` protocol을 확립한다.  
↓  
`44ee0830e9f0` B — 모든 command family와 verdict/invalid stream 구분을 검증한다.  
↓  
`7713a31cf502` A — unbounded line을 protocol 크기의 frame으로 교체하고 interrupted read를 재시도한다.  
↓  
`dbf76e147e68` A — read fault를 주입하고 NUL, empty, overlength, long-stream, EOF-delimited 경계를 검증한다.

**의미**

눈에 보이는 흐름은 tiny fixed protocol에 비해 지나치게 범용적이었던 중간 구현이 수정되는 과정을 보여준다. 수정은 hostile 또는 malformed input이 dispatch에 도달하기 전에 reader 단계에서 거부되도록 limit을 옮긴다. fault test는 valid EOF framing, transient interruption, permanent transport failure, protocol invalidity를 서로 구분한다.

## 흐름: runtime fault injection과 출력 실패 전파

`2e97f29961d8` B — 기본 text output을 중앙화하지만 처음에는 write 결과를 무시한다.  
↓  
`5faa9d7697af` A — allocation과 input용 runtime wrapper를 만들어 instrumentation seam을 제공한다.  
↓  
`63969f770a21` A — 해당 seam으로 allocation failure를 sweep하고 live allocation 0을 증명한다.  
↓  
`315f4b91779b` A — runtime 계약을 write-all, `SIGPIPE` 처리, end-to-end failure propagation까지 확장한다.  
↓  
`e1154e181864` A — interrupted, short, zero, permanent, diagnostic, closed-pipe write 경로를 검증한다.

**의미**

이 흐름은 실패 처리를 암묵적인 가정에서 명시적인 runtime 계약으로 바꾼다. generator의 실제 산출물은 외부에 보이는 command stream이므로 메모리 안의 정렬 성공이 불완전한 write를 보상할 수 없다. 최종 설계는 이미 출력된 prefix는 유지하고 추가 emission은 중단하며, 소유 메모리를 모두 해제하고 transport가 전체 결과를 전달하지 못하면 실패를 보고한다.

# 가장 중요한 커밋

## feat(model): 배열 기반 스택 상태를 구현

커밋: `96b5324448e4`  
중요도: S  
태그: ARCH, CORE, STACK_STATE

### 문제

프로젝트에는 parsing, command generation, checker의 silent replay, sortedness 검사, resource cleanup을 모두 지원할 하나의 representation이 필요하다. sorting은 상대 순서만 사용할 수 있지만 구현은 그 순서와 연결된 원래 정수를 잃어서는 안 된다.

### 결정

각 stack을 명시적 `size`와 `capacity`를 가진 parallel `values`, `ranks` array로 표현하고, stack initialization, cleanup, sortedness, complete-state check를 model 경계에 포함한다.

### 중요했던 이유

이후 모든 operation이 두 배열을 함께 이동하고, 모든 sorter가 rank를 읽으며, 두 실행 파일이 같은 lifecycle로 stack을 소유하고, invariant test가 이 representation을 기준으로 작성된다. 이 결정은 정확성 의무뿐 아니라 이후 array-backed push 및 rotation의 물리적 비용까지 결정한다.

### 변경 내용

`t_stack`, 빈 상태 및 할당 상태 초기화, paired cleanup, rank 기반 sortedness, A-sorted/B-empty 완료 predicate, 첫 strict C99 build 구조를 추가한다.

### 프로젝트 이해에 중요한 이유

coordinate compression과 원래 value를 함께 유지하는 이유, 모든 operation이 pair-preservation 의무를 갖는 이유, A와 B 모두 입력 크기의 capacity를 사용하는 이유, 논리 command가 선형 물리 이동을 유발할 수 있는 이유를 설명한다.

## feat(operation): 스택 교환 연산을 구현

커밋: `c0de1a1b18bb`  
중요도: A  
태그: CORE, STACK_STATE, INTEGRATION

### 문제

generator는 stack을 변경하면서 command를 출력해야 하고, checker는 동일한 command 의미를 출력 없이 replay해야 한다. 별도 구현을 두면 불필요한 semantic divergence 위험이 생긴다.

### 결정

silent stack transition과 `emit` flag로 제어되는 operation wrapper를 분리한다. `sa`, `sb`, `ss`부터 이 pattern을 적용하고 value와 rank entry는 항상 함께 이동한다.

### 중요했던 이유

이 pattern이 이후 모든 command의 통합 경계가 된다. `push_swap`은 wrapper를 상태 전이와 serialization로 사용하고 checker는 같은 wrapper를 silent replay로 사용한다. combined command도 내부에서 두 상태 전이를 수행하더라도 public instruction은 하나로 유지된다.

### 변경 내용

`stack_swap`, 선택적 command emission, single-stack 및 dual-stack swap wrapper를 추가하고 operation module을 common code로 등록한다.

### 프로젝트 이해에 중요한 이유

generator와 checker가 instruction 의미를 공유하는 방식, product code sharing이 semantic drift를 줄이는 이유, 그리고 남은 common-mode risk를 보완하기 위해 이후 독립 Python replay model이 필요한 이유를 설명한다.

## feat(parse): 중복 입력을 거절하고 상대 순위를 계산

커밋: `e09cf45e21cd`  
중요도: S  
태그: CORE, INPUT, SORT

### 문제

입력 domain은 임의 signed integer를 포함하지만 sorting 전략에는 상대 순서의 compact non-negative 표현만 필요하다. 또한 duplicate value가 있으면 프로젝트 계약에서 고유 target permutation을 정의할 수 없다.

### 결정

value를 복사해 정렬하고 인접 duplicate를 거부한 뒤, 각 원래 value의 lower-bound index를 rank로 할당한다.

### 중요했던 이유

결과는 `0..n-1`의 bijection이며 원래 ordering을 보존한다. tiny sorting은 작은 상대 rank만 비교하면 되고, radix sorting은 finite non-negative bit pattern을 순회할 수 있으며, 필요한 최대 bit 수는 입력 크기로만 결정된다.

### 변경 내용

parser에 overflow-safe comparator, binary lower-bound search, 임시 sorted storage, duplicate rejection, rank assignment, 모든 결과 경로의 cleanup을 추가한다.

### 프로젝트 이해에 중요한 이유

input validation과 command generation 사이의 수학적 연결이다. dense-rank 불변식 없이는 이후 radix 메커니즘과 결정적 command-count 추론을 명확하게 설명하기 어렵다.

## feat(sort): 큰 입력을 기수 정렬로 처리

커밋: `1463a193a4f9`  
중요도: S  
태그: CORE, SORT, HARD

### 문제

direct case analysis는 제한된 tiny state space에서만 실용적이다. 일반 case에서는 허용된 command만 사용하면서 예측 가능한 증가량을 갖고, 이미 처리한 bit의 ordering을 보존하는 sequence가 필요하다.

### 결정

dense rank에 stable LSD binary radix pass를 적용한다. bit가 1인 요소는 A에서 rotate하고 0인 요소는 B로 push하며, 다음 bit로 진행하기 전에 B 전체를 다시 A로 push한다.

### 중요했던 이유

rotation은 one group의 상대 순서를 보존하고 zero group은 B로 push할 때와 A로 다시 push할 때 두 번 뒤집혀 결과적으로 순서가 보존된다. 따라서 각 round가 stable partition이 되어 이후 bit 처리로 낮은 bit ordering이 깨지지 않는다. 매 round 뒤 B가 비어 다음 pass와 최종 상태도 단순해진다.

### 변경 내용

`size - 1`에서 필요한 bit 수를 계산하고, 각 round의 시작 A size만큼 정확히 scan하며, 각 bit를 `ra`와 `pb`로 partition하고 `pa`로 zero group을 복원한다. 5개보다 큰 입력을 이 전략으로 routing한다.

### 프로젝트 이해에 중요한 이유

`push_swap`의 핵심 목적을 일반 입력 규모에서 달성하는 메커니즘이다. 또한 `Θ(n log n)` 논리 command와 array representation 때문에 더 커질 수 있는 물리 movement cost의 차이를 설명한다.

## feat(checker): 명령 실행 결과를 판정

커밋: `d906f4d86528`  
중요도: A  
태그: CHECKER, CORE, INTEGRATION

### 문제

command generator만으로는 stream이 유효하고 필요한 종료 상태에 도달하는지 검증할 수 없다. validator는 유효하지만 부족한 stream과 잘못된 입력 또는 실행 실패도 구분해야 한다.

### 결정

같은 초기 value를 파싱하고 stdin frame을 공유 silent operation으로 replay하는 별도 checker를 만든다. A가 정렬되고 B가 비어 있을 때만 `OK`를 출력하며, 그렇지 않은 유효한 완료 stream에는 `KO`를 출력한다.

### 중요했던 이유

공개 validation protocol과 common model의 두 번째 consumer를 확립한다. `KO`를 정상 status-zero 판정으로 정의하고, 잘못된 입력, command, allocation, read failure에만 non-zero status와 `Error`를 사용한다.

### 변경 내용

Makefile에 checker 실행 파일을 추가하고 checker control flow에 frame ownership, command application, cleanup, complete-state evaluation, verdict output을 구현한다.

### 프로젝트 이해에 중요한 이유

generator/checker 책임 경계와 성공 process status의 의미를 설명한다. 또한 공유 operation이 일관성을 높이지만 그 자체로 독립적인 correctness proof는 아니라는 점을 보여준다.

## test(sort): 생성 명령의 정렬 결과를 독립 검증

커밋: `5b7559278909`  
중요도: A  
태그: TEST, SORT, RISK

### 문제

제품 checker와 generator는 C operation 구현을 공유한다. push 또는 rotation의 semantic bug가 있으면 두 프로그램이 같은 잘못된 동작을 동시에 받아들일 수 있다.

### 결정

11개 command를 Python list로 다시 구현하고 unknown output command를 거부한다. 모든 stream을 독립적으로 replay해 A sorted/B empty를 요구하며, 같은 stream을 제품 checker에도 통과시킨다.

### 중요했던 이유

두 representation은 서로 다른 방식으로 실패한다. size 2부터 5까지 모든 permutation을 exhaustive하게 실행해 direct sorting branch를 강하게 커버하고, 고정된 larger case로 radix path도 검증한다. checker는 통합 검증에 계속 유용하지만 더 이상 유일한 oracle이 아니다.

### 변경 내용

command parsing, 독립 A/B state model, integer 극단값을 포함한 고정 case, already-sorted no-command case, size 2부터 5까지의 전체 152 permutation을 test suite에 추가한다.

### 프로젝트 이해에 중요한 이유

의도적으로 설계된 verification boundary를 보여준다. 제품 일관성에는 공유 코드를 사용하고, 의미 정확성에 대한 신뢰에는 독립 코드를 사용한다. branch에서 가장 중요한 엔지니어링 교훈 중 하나다.

## refactor(runtime): 메모리와 입력 시스템 호출을 공통화

커밋: `5faa9d7697af`  
중요도: A  
태그: ARCH, REFACTOR, RUNTIME

### 문제

allocation 및 read failure는 domain logic보다 아래 계층에서 발생하지만 parser, stack, checker에 직접 호출이 흩어져 있으면 일관되게 주입하고 세고 검증하기 어렵다.

### 결정

공유 runtime 경계로 `ps_malloc`, `ps_free`, `ps_read`를 도입하고 정상 의미를 바꾸지 않은 채 프로젝트 소유 메모리와 checker 입력을 해당 경계로 이동한다.

### 중요했던 이유

이 추상화가 이후 N번째 allocation failure sweep, live allocation accounting, read fault injection, write instrumentation, resource metric을 가능하게 한다. 또한 모든 프로젝트 allocation이 하나의 대응 release 경로를 갖게 한다.

### 변경 내용

runtime module을 추가하고 parser scratch storage, stack buffer, checker command buffer를 runtime으로 이동한다. 저수준 operation test는 실제 필요한 object만 링크하도록 줄인다.

### 프로젝트 이해에 중요한 이유

branch가 일반 기능 정확성에서 체계적인 failure-path engineering으로 확장되는 방식을 설명한다. 이후 fault test는 고립된 test trick이 아니라 이 명시적인 아키텍처 seam에 기반한다.

## fix(io): 출력 실패를 호출 경로 끝까지 전파

커밋: `315f4b91779b`  
중요도: A  
태그: RUNTIME, RISK, INTEGRATION

### 문제

이전 output helper는 write 결과를 무시했다. command가 메모리 상태는 변경했지만 stdout에 전달되지 않을 수 있고, 닫힌 pipe는 정상 cleanup 전에 `SIGPIPE`로 프로세스를 종료시킬 수 있었다.

### 결정

`EINTR`를 재시도하고 short write 뒤 cursor를 이동시키며 zero/permanent failure를 거부하는 write-all loop를 추가한다. `SIGPIPE`를 ignore하고 output helper, operation wrapper, sort helper, checker verdict, 두 실행 파일 entry point를 통해 status를 전파한다.

### 중요했던 이유

generator의 실제 산출물은 private stack의 최종 상태가 아니라 외부 command stream이다. 이 변경은 불완전한 전달을 성공으로 보고하는 일을 막고, 실패 뒤 추가 generation을 중단하며, 이미 보이는 prefix를 중복 없이 보존하고, 모든 소유 자원을 해제하도록 한다.

### 변경 내용

operation 및 sorting API가 실패를 반환할 수 있게 되고 checker verdict write를 검사한다. 두 main은 pipe 동작을 초기화하고 output failure를 status 1로 바꾸며, error reporting 실패가 원래 failure를 덮어쓰지 않도록 한다.

### 프로젝트 이해에 중요한 이유

branch의 가장 중요한 reliability 수정이다. 상태 전이와 serialization은 결합된 효과지만 외부 I/O는 transaction이 아니다. 따라서 rollback을 가장하는 대신 명시적인 partial-failure 의미가 필요하다는 점을 보여준다.
