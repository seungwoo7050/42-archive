## feat(model): 배열 기반 스택 상태를 구현

초기 모델은 두 개의 parallel array에서 활성 prefix를 하나의 스택으로 표현한다. `values`에는 원래 정수를 보존하고, `ranks`에는 알고리즘에서 사용하는 정렬 기준을 저장한다. `size`는 현재 활성 요소 수를, `capacity`는 할당 범위를 나타낸다. 원래 값과 rank를 별도 배열에 유지하면 정렬 정보를 반복 계산하지 않아도 되지만, 모든 연산이 같은 인덱스의 두 항목을 하나의 논리 요소처럼 함께 이동해야 한다는 엄격한 불변식이 생긴다.

`stack_init`은 두 allocation의 소유권을 명확히 하고, 어느 한쪽 할당이라도 실패하면 올바르게 정리한다. `stack_free`는 두 buffer를 모두 해제하고 구조체를 `stack_init_empty`가 만드는 것과 같은 빈 상태로 초기화하므로, cleanup 이후 caller에 stale pointer나 size가 남지 않는다. 0 이하의 capacity는 유효한 빈 스택으로 취급해 입력이 없는 경로도 일반 실행과 동일한 lifecycle API를 사용한다.

정렬 여부는 rank를 기준으로 정의하고, 전체 성공 상태는 stack A가 정렬되어 있고 stack B가 비어 있는 경우로 정의한다. 이 predicate들은 입력값의 표현과 sorter 및 checker가 사용하는 정확성 조건을 분리한다. 함께 추가된 C99 build scaffold는 모델 단계부터 엄격한 warning 및 표준 준수 검사를 적용한다.

## feat(io): 문자열 비교와 기본 출력을 구현

프로젝트 내부의 작은 utility 계층이 문자열 길이, 정확한 문자열 비교, file descriptor 기반 출력, 표준 `Error\n` diagnostic을 담당한다. `ps_strcmp`는 `unsigned char` 값으로 비교해 signed `char`에서 음수가 될 수 있는 byte의 순서가 구현에 따라 달라지는 문제를 피한다.

진단 메시지와 명령 텍스트를 `ps_putstr_fd`로 통합해 parser, operation, 실행 파일 곳곳에서 직접 `write`를 호출하지 않고 하나의 출력 경계를 사용한다. 이 첫 구현은 한 번의 write만 수행하고 실패 결과를 노출하지 않으므로 short write나 write 실패를 아직 처리하지 않는다. 그 한계가 있어도 연산을 중앙화해 두면 이후 I/O 계약을 교체할 때 모든 caller를 수정할 필요가 없다.

Makefile에서도 stack과 utility source를 common object로 재분류한다. 이 경계는 두 실행 파일 이상에서 공유할 의도를 반영하며, 실행 파일별 제어 흐름을 공유 상태 및 저수준 service와 분리한다.

## feat(operation): 스택 교환 연산을 구현

`stack_swap`으로 첫 번째 stack 상태 전이를 정의한다. `values`와 `ranks`의 top 두 항목을 함께 교환해 두 배열을 별개로 재정렬하지 않고 value-rank pairing 불변식을 유지한다. 활성 요소가 두 개 미만인 스택도 유효한 입력이며 상태를 변경하지 않으므로, primitive는 표현 가능한 모든 stack size에서 정의된다.

`sa`, `sb`, `ss` wrapper는 `emit` flag를 통해 상태 변경과 명령 출력을 분리한다. 같은 상태 전이를 텍스트 프로그램 생성에는 출력과 함께 사용할 수 있고, 프로그램 replay에는 출력 없이 사용할 수 있다. `ss`는 두 스택에 primitive를 각각 적용하면서 public stream에는 하나의 결합 명령만 출력해, 내부 상태 전이가 두 번 일어나는 것과 공개 instruction 하나가 구분되도록 한다.

이 silent primitive와 선택적 출력 wrapper의 분리는 sorter와 checker가 공유하는 의미 경계가 된다. swap의 의미를 두 실행 파일이 따로 구현하는 일을 방지한다.

## feat(operation): 스택 간 이동 연산을 구현

`stack_push`는 `memmove`로 각 활성 배열 구간을 이동시키면서 source의 top을 destination의 top으로 옮긴다. value와 rank는 함께 복사되고 destination size는 정확히 한 번 증가하며 source size는 정확히 한 번 감소한다. 따라서 두 스택을 합친 논리 요소의 총수는 보존되고 어떤 요소도 복제되거나 사라지지 않는다.

source가 비어 있으면 정의된 no-op으로 처리한다. `pa`와 `pb`를 모든 상태에서 유효하게 사용할 수 있고, command 해석에서 stack operation 의미와 별도로 precondition 오류를 만들 필요가 없다. operation마다 새로 할당하지 않고 destination과 source의 기존 buffer를 재사용하므로 소유권은 model에서 확립한 stack lifecycle에 그대로 남는다.

배열 표현에서는 두 활성 prefix를 이동해야 할 수 있으므로 push의 물리적 비용이 활성 요소 수에 대해 선형이다. 이는 연속 저장, 단순한 cleanup, 결정적인 메모리 사용량을 얻는 대신 감수하는 trade-off다. `pa`, `pb` wrapper도 silent replay와 명령 출력의 기존 구분을 유지한다.

## feat(operation): 스택 정방향 회전을 구현

정방향 rotation은 논리적 top 요소를 활성 prefix의 bottom으로 이동한다. 구현은 top의 value-rank pair를 저장하고 나머지 pair를 index 0 방향으로 이동한 뒤, 저장한 pair를 `size - 1`에 기록한다. 두 배열에 동일한 이동을 적용해 위치 대응 관계를 유지한다.

size가 0 또는 1인 스택은 그대로 유지되므로 상위 계층에서 별도 처리를 하지 않아도 rotation이 항상 정의된다. `ra`와 `rb`는 한 스택의 상태 전이를 노출하고, `rr`은 두 스택에 각각 적용하면서 하나의 결합 명령만 출력한다. 따라서 공개 명령 stream의 instruction count와 내부 primitive 호출 횟수를 구분한다.

push와 마찬가지로 연속 배열 표현은 allocation 없이 예측 가능하게 동작하지만 pair를 선형 개수만큼 이동하는 비용이 있다. 그럼에도 고정 capacity를 유지하고 모든 논리 요소를 보존한다.

## feat(operation): 스택 역방향 회전을 구현

reverse rotation으로 정방향 rotation의 반대 방향 동작을 완성한다. 마지막 활성 value-rank pair를 저장하고 앞선 pair들을 tail 방향으로 한 칸씩 이동한 뒤 저장한 pair를 top에 둔다. 요소가 둘 이상인 스택에서는 이 상태 전이가 결과 상태에 대한 정방향 rotation의 역연산이 된다.

`rra`, `rrb`, `rrr`은 다른 operation과 동일한 선택적 출력 경계를 사용한다. 결합 형태는 두 스택을 독립적으로 변경하면서 결과를 하나의 instruction으로 표현한다. 빈 스택과 단일 요소 스택은 유효한 no-op으로 유지되므로 checker의 모든 명령을 size 관련 오류 없이 실행할 수 있다.

swap, push, rotate, reverse rotate가 모두 추가되어 공유 operation 계층이 전체 instruction vocabulary를 제공하면서 핵심 pair, size, capacity 불변식을 유지한다.

## test(operation): 값과 순위의 보존 불변식을 검증

첫 operation test harness는 몇 가지 예상 결과만 비교하는 대신 모든 명령이 보존해야 하는 representation 속성을 검사한다. fixture는 서로 다른 value-rank pair 다섯 개를 두 스택에 나누고, 각 operation 이후 size가 capacity 안에 있는지, 각 value가 예상 rank와 계속 연결되어 있는지, 두 스택의 합산 size가 5인지, 모든 rank가 정확히 한 번씩 존재하는지 확인한다.

같은 검사를 각 명령 단독 실행과 11개 명령을 모두 포함한 sequence에 적용한다. 초기 fixture에서만 맞아 보이지만 나중 operation에서 드러나는 상태 손상이 있을 수 있으므로 순차 검증도 중요하다. `emit = 0`으로 실행해 상태 의미와 출력 동작을 분리한다.

이 테스트는 보존과 pairing을 명시적 불변식으로 만든다. 요소 유실, 중복, 잘못된 size 갱신, `ranks` 없이 `values`만 이동하는 오류를 탐지할 수 있다. 다만 각 명령이 요구되는 정확한 permutation을 만드는지까지 증명하지는 않으며, 그 더 강한 속성은 별도 테스트에서 추가한다.

## test(operation): 정확한 상태 전이와 no-op을 검증

operation suite에 보존 검사뿐 아니라 모든 instruction에 대한 table-driven 정확한 postcondition을 추가한다. 각 명령을 같은 fixture에 적용하고 두 스택의 예상 활성 `values`, `ranks`, size, 변경되지 않은 capacity와 비교한다. 모든 요소를 보존하지만 permutation이 잘못된 전이도 이제 구분할 수 있다.

빈 스택과 단일 요소 스택에 대한 경계 사례도 검사한다. swap과 rotation 계열은 요소가 부족한 스택을 변경하지 않아야 하며, push는 source가 비어 있으면 두 스택 모두 그대로여야 한다. fixture는 논리 size뿐 아니라 backing entry도 확인해 no-op이 비활성 영역을 몰래 덮어쓰지 않는지 검사한다.

명령 이름과 적용 방식을 test enum으로 중앙화해 11개 operation 모두 같은 assertion을 거치게 한다. 앞선 pairing 테스트와 합쳐 sorter와 checker가 의존하는 구조 불변식과 정확한 명령 의미를 모두 검증한다.

## feat(parse): 개별 인자의 부호 있는 정수를 파싱

초기 parser는 argv 항목 하나당 signed decimal integer 하나를 허용하며 stack A를 all-or-nothing 방식으로 구성한다. 선택적 선행 `+` 또는 `-`를 인식하고, 숫자 없는 부호는 거부하며, 나머지 모든 byte가 ASCII 10진수인지 검사한다. 더 넓은 타입으로 누적하면서 양수와 음수에 별도 limit을 적용하므로 `INT_MIN`은 허용하면서 `int` 범위를 벗어난 값은 거부한다.

인자가 없으면 유효한 빈 스택을 만든다. 인자가 있으면 정확한 capacity를 할당해 원래 값을 입력 순서대로 채우고, 이 단계에서는 `ranks`에도 임시로 같은 값을 복사한다. 잘못된 token이 하나라도 있으면 부분 초기화된 stack을 해제하고 실패를 반환하므로 caller에는 절반만 유효한 parse 결과가 전달되지 않는다.

이로써 parser가 stack 초기화와 cleanup의 소유자가 된다. 이 단계의 grammar는 의도적으로 `argv` entry 하나당 token 하나로 제한된다. 이후 공백 결합 인자와 coordinate compression을 추가해도 signed integer 계약 자체는 유지된다.

## feat(parse): 공백으로 결합된 인자 토큰을 처리

각 argument 내부에서 모든 C whitespace 문자를 separator로 취급해 quoted group과 일반적으로 나뉜 argument가 같은 grammar를 사용하도록 한다. parser는 먼저 전체 token span 개수를 센 뒤 같은 argument를 다시 scan해 `[start, end)` 범위를 직접 파싱한다. 임시 substring allocation이 필요 없으며 최종 capacity를 정확히 한 번 할당할 수 있다.

빈 argument는 token을 만들지 않으며 다른 argument에 값이 있다면 허용한다. 반면 argument가 전달되었지만 전체 token 수가 0이면 거부한다. 이를 통해 진짜 no-argument 실행과 whitespace-only string처럼 형식이 잘못된 present input을 구분한다.

token 발견과 정수 변환을 분리해 whitespace 처리를 숫자 parser 밖에 둔다. 변환 하나라도 실패하면 할당된 stack을 해제하고 부분 결과를 내보내지 않는다. two-pass 구조는 한 번 더 선형 scan하는 대신 정확한 allocation size와 단순한 ownership을 얻는다.

## feat(parse): 중복 입력을 거절하고 상대 순위를 계산

원래 정수를 파싱한 뒤 정렬된 복사본을 만들고 각 고유 값에 `[0, n - 1]` 범위의 dense rank를 부여한다. `qsort` comparator는 뺄셈이 아니라 관계 비교 결과를 사용해 극단값 비교에서 overflow가 발생하지 않는다. 정렬된 복사본의 인접 값이 같으면 rank를 할당하기 전에 중복 입력을 거부한다.

각 원래 값은 lower-bound binary search로 위치를 찾는다. 따라서 `values`는 사용자가 입력한 순서를 유지하고 `ranks`는 순서 동형인 표현이 된다. 이 coordinate compression으로 정렬 문제에서 값의 크기와 부호를 제거할 수 있다. 알고리즘은 작은 non-negative integer만 사용하고 원래 데이터는 representation 검증용으로 유지한다.

임시 sorted buffer는 성공 및 중복 실패 모두에서 해제하고, rank 계산 실패 시 전체 parsed stack을 해제한다. 따라서 parser의 all-or-nothing 계약을 유지하면서 tiny sorter와 radix sorter가 필요로 하는 고유성 및 dense-rank 불변식을 확립한다.

## feat(sort): 세 개 이하의 스택을 정렬

첫 번째 sorting 전략은 두 개 또는 세 개의 고유 rank가 만들 수 있는 전체 상태를 처리한다. 두 요소는 최대 한 번의 swap만 필요하다. 세 요소는 정렬되지 않은 다섯 가지 상대 순서 경우를 분류하고 swap 및 rotation operation으로 해당하는 한두 개의 명령 sequence를 출력한다.

이 크기에서는 일반 알고리즘의 준비 작업과 추가 명령을 피할 수 있으므로 직접 case analysis가 적합하다. 비교는 상대 rank만 사용하므로 coordinate compression 이후에는 원래 정수의 크기와 관계없이 같은 로직을 적용할 수 있다. 이미 정렬된 stack과 요소가 두 개 미만인 stack은 아무 명령도 출력하지 않고 반환한다.

모든 상태 변경은 출력 가능한 operation wrapper를 통해 수행해 메모리 상태 전이와 외부 instruction stream을 일치시킨다. 이 시점의 `sort_stack`은 의도적으로 size 3 이하에서만 동작하며, 이후 더 큰 전략을 추가해도 이 base case는 유지된다.

## feat(sort): 네다섯 개의 스택을 정렬

이미 검증된 세 요소 case로 문제를 축소해 tiny sorter를 네 개와 다섯 개까지 확장한다. 다음 최소 rank의 위치를 찾고 더 짧은 방향으로 rotate해 해당 요소를 top으로 가져온 뒤 stack B로 push한다. 세 요소가 남을 때까지 반복해 rank 0, 다섯 요소에서는 rank 1까지 분리한 후 남은 stack을 직접 정렬한다.

대상 index에 따라 forward 또는 reverse rotation을 선택해 각 최소값 위치 조정에 드는 명령 수를 줄인다. 저장한 요소를 B에서 다시 push하면 B의 stack 순서 때문에 가장 작은 rank들이 이미 정렬된 세 요소 suffix 앞에 복원된다. parser가 고유하고 연속적인 rank를 보장하므로 가능한 방식이다.

보조 stack의 역할을 전역 최소 요소를 임시 저장하는 것으로 명확히 제한하고, small direct sorter가 나머지를 처리하게 한다. 네 개와 다섯 개를 위한 별도의 unrelated 알고리즘을 추가하지 않고 최종적으로 B가 비어 있어야 한다는 불변식도 유지한다.

## feat(sort): 큰 입력을 기수 정렬로 처리

5개보다 큰 입력은 dense rank에 대한 least-significant-bit-first binary radix pass로 정렬한다. 필요한 bit 수는 가능한 최대 rank인 `size - 1`에서 계산한다. 각 pass에서 해당 bit가 1인 요소는 A 안에서 rotate하고 0인 요소는 B로 push한다. 시작 시점의 원래 round size만큼 요소를 정확히 검사한 뒤 B의 모든 요소를 다시 A로 push한다.

rotation은 1-bit group의 상대 순서를 보존한다. 0-bit 요소는 B로 push될 때 한 번 순서가 뒤집히고, group 전체를 A로 다시 push할 때 한 번 더 뒤집히므로 이 group의 상대 순서도 보존된다. 따라서 각 pass는 stable partition이며, 이 속성 때문에 least-significant-bit radix sorting이 연속 bit 처리에서도 올바르게 동작한다.

압축된 non-negative rank를 사용해 signed shift 문제를 피하고, pass 수가 정수 크기가 아니라 입력 개수에 따라 결정되게 한다. 알고리즘은 결정적인 `O(n log n)` stack command 수를 출력하고 각 bit 처리 후 B를 다시 비운다. 다만 실제 stack은 연속 배열이므로 개별 명령이 선형 개수의 pair를 이동할 수 있다. command complexity와 물리적 이동 비용은 의도적으로 별개의 속성이다.

## feat(push_swap): 정렬 명령 생성 흐름을 연결

`push_swap` 실행 파일이 parsing, 보조 stack 할당, sorting, cleanup을 하나의 ownership 흐름으로 연결한다. parsing이 A를 초기화하고, B는 원본 요소를 어떤 분포로 옮겨도 담을 수 있도록 같은 capacity를 가진다. `sort_stack`은 두 메모리 stack을 변경하면서 command program을 출력한다.

parse 또는 B 할당 실패 시 표준 error를 출력하고 0이 아닌 상태로 종료한다. B allocation이 실패하면 반환 전에 A를 해제한다. 성공 시에는 입력이 비었거나 이미 정렬되었거나 실제 명령이 필요했는지와 관계없이 두 stack을 모두 해제한다. `main`이 lifetime owner가 되고 parsing과 sorting은 더 좁은 계약을 담당한다.

Makefile은 common object를 generator 전용 control flow와 분리해 링크한다. 이 단계에서는 출력 함수가 write 실패를 보고하지 않으므로 실행 파일이 전파할 수 있는 실패는 parsing과 allocation에 한정된다. I/O 경로는 이후 강화된다.

## feat(checker): 표준 입력 명령 프레임을 읽음

checker에 초기 tri-state line reader를 추가한다. `1`은 명령 frame 하나를 반환하고, `0`은 정상 EOF, `-1`은 allocation 또는 read 실패를 나타낸다. newline이 frame을 구분하지만 반환 문자열에는 포함하지 않으며, EOF에서 newline 없이 끝나는 마지막 non-empty frame도 허용한다.

초기 구현은 buffer를 기하급수적으로 확장해 byte마다 새로 할당하지 않으면서 caller가 정확히 하나의 반환 line을 소유하게 한다. 모든 실패 경로는 부분 buffer를 해제하고, byte가 전혀 없는 정상 EOF에서도 caller에 allocation을 남기지 않는다.

이 버전은 범용 line reader이므로 임의 길이 frame을 허용하고 interrupted read를 실패로 취급한다. 이는 실제로 최대 세 글자인 checker 명령 grammar에 비해 범위가 넓고 견고성도 부족하다. 이후 이력에서 동적 framing 정책을 bounded protocol reader와 명시적인 `EINTR` retry로 대체한다.

## feat(checker): 스택 연산 명령을 해석

checker는 각 정확한 command string을 emission이 비활성화된 공유 operation 계층에 매핑한다. 11개 instruction 모두 `push_swap`과 같은 상태 전이 구현을 사용하므로 generator와 checker가 별도의 swap, push, rotation 로직을 유지하다 의미가 달라질 수 없다.

정확한 문자열 비교로 prefix, suffix, 알 수 없는 이름을 부분적으로 해석하지 않고 거부한다. 인식한 명령은 상태 전이를 적용한 뒤 성공을 반환하고, 알 수 없는 line은 checker control flow에 실패를 반환한다.

`emit = 0` 경계가 중요하다. replay는 stack 상태만 바꾸고 명령을 다시 표준 출력으로 echo하지 않는다. 따라서 checker는 stdout을 최종 verdict 전용으로 사용할 수 있으며, 요소가 부족한 stack에서의 no-op 의미도 그대로 유지한다.

## feat(checker): 명령 실행 결과를 판정

독립 실행형 checker가 전체 검증 lifecycle을 담당한다. `push_swap`과 같은 입력 표현을 파싱하고 같은 capacity의 B를 할당한 뒤 command frame을 반복해서 읽어 적용하며, 각 frame은 사용 직후 해제한다. 잘못된 command, read 실패, parsing 실패, allocation 실패에서는 모두 소유 자원을 정리하고 `Error`를 출력한다.

정상 EOF에서 성공 여부는 A가 정렬되었는지만으로 결정하지 않는다. model의 완전 상태 predicate를 사용해 A가 정렬되고 B가 비어 있어야 `OK`를 출력하고, 그렇지 않으면 `KO`를 출력한다. 두 verdict 모두 정상 checker 결과이므로 status 0으로 반환하며, 잘못된 입력이나 command stream만 실패 상태를 반환한다.

값 없이 실행하면 즉시 종료해 stdin reading loop에 들어가지 않는다. command만 들어오는 실행이 block되는 것을 막고 generator의 no-input 동작과 일치시킨다. utility 계층이 여전히 `write` 결과를 버리므로 이 버전에서는 출력 실패를 관찰할 수 없다.

## test(parser): 정상 입력과 오류 입력을 검증

end-to-end Python harness가 내부 helper만 검사하는 대신 parser 동작을 CLI 계약으로 다룬다. no-argument 실행이 출력 없이 성공하는지 확인하고, 일반 argument와 quoted argument로 나뉜 값 sequence를 허용한다. 생성된 `push_swap` program을 checker에 입력해 parse된 순서와 생성 명령이 두 실행 파일에서 일치하는지도 확인한다.

잘못된 case는 duplicate, 양수 및 음수 integer overflow, 숫자가 아닌 suffix, 숫자 없는 sign, token을 하나도 만들지 않는 input, 별도로 전달된 argument와 whitespace-combined argument 사이의 duplicate를 포함한다. 각 경우 stdout 없이 실패해야 하며 stderr에는 정확히 `Error\n`만 출력되어야 한다.

process status와 두 출력 channel을 함께 검사해 겉보기에는 올바른 diagnostic 때문에 parser regression이 가려지지 않게 한다. harness를 `test` target에 통합해 이러한 공개 동작을 일반 검증 경로에 포함한다.

## test(cli): 입력 경계와 무인자 실행을 검증

CLI 테스트에서 parser의 경계 grammar를 상세히 정의한다. 허용되는 case에는 명시적 plus sign, negative zero, leading zero, 실제 token 사이에 섞인 빈 argument, 모든 C whitespace separator, 정확한 `int` 양 끝값이 포함된다. 거부 case에는 whitespace-only input, 매우 긴 10진수 token, non-ASCII digit, 반복 또는 혼합 sign, 서로 다른 표기의 duplicate zero가 포함된다.

허용 case는 두 실행 파일로 검증한다. `push_swap`은 stderr에 아무것도 출력하지 않아야 하고 checker는 생성된 program을 받아들여야 한다. 거부 case는 stdout 없이 status 1을 반환하고 표준 diagnostic만 정확히 출력해야 한다. child process timeout으로 무한 scan이나 blocked read를 결정적 테스트 실패로 만든다.

별도 file-position 검사에서 값 없이 실행한 `checker`가 stdin을 소비하기 전에 종료하는지도 확인한다. 출력 assertion만으로는 관찰할 수 없는 lifecycle 속성이며, caller 입장에서 예상 밖의 blocking 또는 input consumption을 막는다.

## test(checker): 명령 연산과 최종 판정을 검증

checker suite에서 알려진 정렬 결과를 만드는 command program을 통해 모든 instruction을 실행한다. single-stack, dual-stack, push, forward rotation, reverse rotation을 모두 포함하며 결합 명령인 `ss`, `rr`, `rrr`도 검증한다. C primitive를 직접 호출하는 데 그치지 않고 실행 파일에서 실제 사용하는 command-to-operation mapping을 확인한다.

최종 상태 protocol은 별도로 검사한다. 명령이 없는 unsorted stack은 실행 오류가 아니라 `KO`를 반환해야 하며, 유효한 prefix 뒤에 unknown command가 나오면 verdict 없이 실패하고 `Error`를 출력해야 한다.

이 case들은 유효하고 성공적인 program, 유효하지만 부족한 program, 잘못된 command stream을 명확히 구분한다. checker를 생성 instruction의 독립적인 consumer로 사용하기 위한 핵심 구분이다.

## test(sort): 생성 명령의 정렬 결과를 독립 검증

sorting 테스트에 전체 stack instruction set의 Python 구현을 추가하고, C checker와 독립적으로 출력 program을 적용한다. 모든 출력 line은 정확한 command vocabulary에 속해야 하고, Python model에서 최종 A는 원본 값을 Python으로 정렬한 결과와 같아야 하며 B는 비어 있어야 한다. 같은 stream을 checker에도 전달해 두 번째 oracle로 사용한다.

이 독립 interpreter는 common-mode risk를 줄인다. C generator와 C checker가 같은 버그를 공유하더라도 Python model까지 자동으로 통과하지는 못한다. 고정 case에는 역순 small input, 양수와 음수 혼합, integer endpoint, 더 큰 permutation이 포함된다. size 2부터 5까지 모든 permutation도 검사해 tiny-sort의 전체 상태 공간을 다룬다.

이미 정렬된 입력은 어떤 command도 출력해서는 안 된다. 따라서 suite는 최종 정확성뿐 아니라 public stream 형식, B-empty postcondition, 이미 조건을 만족한 입력의 early exit 동작도 검증한다.

## test(sort): 큰 입력의 명령 수 상한을 검증

큰 입력 검증에 고유 값 100개와 500개의 명시적인 command-count budget을 추가한다. 고정 seed로 재현 가능한 permutation을 만들고, 기존 독립 simulator가 먼저 각 stream의 정확성을 증명한 뒤에만 출력 명령 수를 설정된 limit과 비교한다.

limit은 프로젝트가 최적화하는 자원인 legal stack instruction 수를 측정한다. machine 특성과 배열 구현의 물리 이동 비용에 민감한 wall-clock time으로 대체하지 않는다. 이를 통해 regression 기준을 안정적으로 유지하면서, 결과는 맞지만 병적으로 장황한 대체 구현이 이력에 들어오는 것을 막는다.

동일한 correctness helper를 사용하므로 불완전하거나 잘못된 program을 출력해 낮은 command count를 얻은 경우도 통과하지 못한다.

## build(clean): 빌드 산출물과 테스트 캐시를 정리

build에서 제거 명령을 중앙화하고 object tree와 Python test cache를 함께 정리하며 두 실행 target을 선언된 이름으로 제거한다. `.DELETE_ON_ERROR`도 사용해 recipe가 실패한 target을 `make`가 삭제하도록 함으로써 잘리거나 잘못된 artifact가 다음 실행에서 최신 상태로 오인되지 않게 한다.

이 변경으로 `clean`, `fclean`, rebuild가 stale test 또는 build 산출물을 남기지 않고 저장소를 재현 가능한 상태로 되돌리며, 남은 산출물이 dependency 문제를 가리는 일을 방지한다.

## refactor(runtime): 메모리와 입력 시스템 호출을 공통화

allocation, deallocation, input을 전용 runtime module의 `ps_malloc`, `ps_free`, `ps_read`를 통해 수행하도록 한다. 초기 wrapper는 C 및 POSIX 함수를 그대로 호출하므로 정상 동작은 의도적으로 바뀌지 않는다. 구조적으로는 parser, stack, checker 코드가 더 이상 해당 system interface에 직접 결합되지 않는다.

이 경계 덕분에 실패 동작을 한 계층에서 관찰하고 교체할 수 있다. 모든 caller를 다시 작성하지 않고 allocation 실패를 주입할 수 있고 live allocation을 일관되게 추적할 수 있으며, domain code가 같은 API를 유지한 채 이후 read fault도 모델링할 수 있다. runtime을 통해 얻은 메모리는 대응하는 runtime 함수로 해제되도록 한다.

operation invariant test는 실제로 사용하는 object만 링크하도록 줄인다. test dependency graph를 좁혀 저수준 상태 전이 테스트에 관련 없는 parser나 실행 파일 코드를 끌어들이지 않으면서 새 runtime dependency는 포함한다.

## test(memory): 할당 실패 뒤 자원 정리를 검증

정상 build를 변경하지 않고 모든 프로젝트 allocation을 계측하는 별도 fault-injection build를 추가한다. `PS_FAULT_INJECTION`에서 allocation 호출을 세고 지정한 N번째 호출에 `NULL`을 반환할 수 있으며, 성공한 allocation에는 aligned header를 붙여 live 상태를 추적한다. 모든 실행 파일 exit는 `ps_test_finish`를 거쳐 live allocation 수가 0이 아니면 별도의 테스트 실패로 보고할 수 있다.

Python fault suite는 대표적인 `push_swap` 및 checker 실행에서 사용되는 각 allocation 위치를 sweep하고, 마지막 예상 allocation 이후 한 번 더 테스트해 baseline path가 여전히 성공하는지도 확인한다. 주입된 각 실패는 공개 `Error` 동작을 유지하고 live allocation 0을 보고해야 한다.

이를 통해 부분 stack 구성, parser scratch allocation, 보조 stack 실패, checker line-buffer 실패 이후 cleanup을 검증한다. runtime 경계에서 fault를 주입하면 cleanup 코드를 정적으로 살펴보는 대신 실제 control-flow exit를 테스트할 수 있으며, aligned header 덕분에 반환 pointer도 일반 프로젝트 데이터에 적합한 정렬을 유지한다.

## fix(parse): 토큰 수와 배열 크기 계산을 방어

string 위치와 argument별 count에 `size_t`를 사용하고, token 합계가 stack model의 `int` size field에 들어가지 않으면 명시적으로 거부한다. 범위를 확인한 뒤에만 count를 `int`로 변환한다. two-pass parser의 signed overflow 및 narrowing 위험을 제거한다.

stack allocation에서도 parallel array 중 어느 하나를 할당하기 전에 `capacity * sizeof(int)`가 `size_t`로 표현 가능한지 확인한다. 이 guard가 없으면 count나 byte size가 wrap되어 parser가 이후 채우는 것보다 작은 buffer를 할당할 수 있고, 단순한 large-input rejection 문제가 out-of-bounds memory access로 바뀔 수 있다.

논리 요소 count는 parser가, 자체 byte-size 계산은 `stack_init`이 각각 책임지는 두 경계에 검사를 둔다. 정상 input의 grammar와 representation은 그대로이며 표현할 수 없는 size만 더 일찍 결정적으로 거부한다.

## fix(checker): 명령 길이를 제한하고 중단된 읽기를 재시도

checker reader를 실제 command protocol에 맞게 특수화한다. 가장 긴 유효 instruction이 세 글자이므로 각 frame에 동적으로 커지는 line 대신 고정 `PS_COMMAND_MAX + 1` buffer를 사용한다. 네 번째 문자, embedded NUL byte, allocation failure는 즉시 frame을 거부하고, newline과 EOF는 계속 유효한 delimiter로 사용한다.

`errno`가 `EINTR`인 interrupted read는 재시도한다. 다른 read 실패에서는 buffer를 해제하고 caller pointer를 null 상태로 만들며 error state를 반환한다. pending byte가 없는 정상 EOF에서도 임시 buffer를 해제하고, newline 없이 끝나는 유효한 마지막 command는 계속 허용한다.

input 경계에서 frame 크기를 제한해 임의 command text가 메모리 사용량을 계속 늘리지 못하게 하고 잘못된 protocol data를 command dispatch 이전에 거부한다. reader의 변경된 allocation 동작에 맞춰 fault-allocation sweep도 갱신해 cleanup coverage를 실행 경로와 일치시킨다.

## test(checker): 읽기 실패와 명령 경계를 검증

runtime fault 계층이 read 횟수를 세고 선택한 호출에서 영구 `EIO` 실패 또는 일시적 `EINTR`를 주입할 수 있게 한다. checker 테스트는 `sa\n` 전체와 EOF read sequence의 모든 위치에서 영구 실패를 sweep하고, command의 이른 byte와 마지막 EOF probe에서 interruption이 발생해도 성공적으로 재시도되는지 확인한다.

protocol boundary case에는 embedded NUL data, newline 유무와 관계없이 세 글자를 넘는 command, 빈 command, 단독 NUL, 64 KiB overlong frame이 포함된다. 잘못된 stream은 모두 verdict 없이 실패하고 표준 error를 출력해야 한다. EOF로만 끝나는 유효한 `sa` frame은 여전히 적용되어 `OK`를 출력해야 한다.

이 테스트는 framing error를 transport interruption 및 영구 I/O failure와 구분한다. allocation-reporting fault build에서 실행되므로 거부되거나 중단된 frame이 고정 buffer를 leak하지 않는지도 함께 검증한다.

## fix(io): 출력 실패를 호출 경로 끝까지 전파

output을 명시적인 성공/실패 계약으로 바꾼다. `ps_write_all`은 `EINTR`를 재시도하고 short write만큼 cursor를 전진시키며, 영구 오류와 0-byte write를 모두 실패로 처리한다. `ps_putstr_fd`, diagnostic, operation wrapper, 모든 sorting helper, 최상위 sorting 함수가 status를 반환해 첫 emission 실패를 `main`까지 전파할 수 있게 한다.

generator는 write 실패 이후 더 이상 command를 생성하지 않고 두 stack을 모두 해제하며, 가능하면 error를 보고하고 실패 상태로 종료한다. 이미 쓴 prefix를 rollback하거나 다시 출력하려 하지 않는다. 외부 program이 불완전해진 이상 process failure가 의미 있는 계약이다. checker도 `OK` 또는 `KO` write가 실제로 성공했는지 확인한다.

출력을 수행할 수 있는 실행 경로 전에 `SIGPIPE`를 ignore해 닫힌 pipe를 일반 `write` error로 바꾸고 같은 cleanup 경로를 사용한다. silent checker operation은 계속 공유 wrapper를 사용하되 실제 출력 없이 성공을 반환한다. 보조 `Error` diagnostic 출력 자체가 실패하더라도 원래의 0이 아닌 종료 상태를 덮어쓰지 않는다.

## test(io): 부분 출력과 영구 쓰기 실패를 검증

fault runtime이 특정 호출에서 interrupted, short, zero-byte, permanent write를 주입할 수 있게 한다. test suite는 먼저 여러 command를 출력하는 성공 baseline을 기록한 뒤 각 command write를 차례로 실패시켜 오류가 `main`까지 도달하고 모든 allocation이 해제되는지 확인한다.

일시적 interruption과 1-byte short write는 정확한 baseline stream을 재구성해야 한다. 0-byte write는 영구 실패로 취급한다. short write 뒤 실패하는 경우 stdout에는 실제로 성공한 prefix만 정확히 남아야 하며 중복이 없어야 한다. write loop가 cursor를 올바르게 전진시키는지 검증하는 조건이다.

checker verdict 경로와 diagnostic 경로도 독립적으로 검사한다. `OK` write가 실패하면 checker도 실패해야 하며, `Error` 출력 실패가 원래 실패 상태를 지워서는 안 된다. 마지막으로 read end가 이미 닫힌 pipe를 사용해 프로세스가 `SIGPIPE`로 종료되지 않고 일반 control flow로 실패를 보고하며 allocation cleanup까지 도달하는지 확인한다.

## test(sort): 결정적 다중 시드 동치 검사를 추가

randomized coverage를 명시적으로 정의한 32-bit linear-congruential state와 Fisher–Yates permutation으로 대체한다. 생성된 값을 고유 signed integer로 변환해 Python random 구현이나 process-global random state에 의존하지 않는 재현 가능한 fixture를 만든다.

tiny/radix 경계 양쪽의 size에 대해 여러 seed를 실행하고 각 fixture를 두 번씩 실행한다. 두 command list는 독립적으로 올바른 정렬 결과를 만들 뿐 아니라 서로 완전히 같아야 하므로 결정적인 생성 결과를 관찰 가능한 regression 속성으로 만든다. 100개 및 500개 command budget도 한 seed가 아니라 세 seed에 대해 검사한다.

실행 파일 경로는 environment variable로 제공할 수 있게 한다. 동일한 동작 suite를 이후 sanitizer binary 같은 대체 build에도 복사하거나 약화하지 않고 재사용할 수 있다.

## test(resource): 명령과 배열 이동 및 할당량을 기준화

fault build에 서로 다른 세 자원의 compile-time instrumentation을 추가한다. 명령 텍스트가 성공적으로 출력된 뒤에만 command 수를 증가시키고, 배열 operation이 이동하거나 다시 쓰는 논리 value-rank pair 수를 기록하며, instrumentation header는 제외한 상태에서 현재 및 peak requested allocation byte를 추적한다. 정상 build에서는 이 hook들이 no-op으로 컴파일된다.

versioned JSON baseline은 size 10, 100, 500에 대해 세 seed씩 결정적인 case를 정의한다. command count는 exact value를 사용하고, array movement와 peak live byte는 upper bound를 사용한다. resource runner는 live allocation이 0인지도 요구하고 기록된 operation count가 실제 출력된 command line 수와 같은지 확인한다.

측정값을 분리해 command-only score가 숨기는 trade-off를 드러낸다. radix 전략은 안정적인 instruction count를 갖지만 연속 배열 표현은 훨씬 많은 물리 이동을 수행할 수 있다. peak-byte limit으로 operation이 숨은 per-command allocation을 추가하지 않는지도 검증한다. elapsed time은 정보로만 출력하고 machine-dependent pass criterion으로 사용하지 않는다.

## build(sanitize): C99 sanitizer 검증 경로를 추가

Makefile이 별도 디렉터리에 C99 warning flag, debug 정보, 적당한 optimization, frame pointer 보존을 적용한 AddressSanitizer 및 UndefinedBehaviorSanitizer 전용 object를 빌드하도록 한다. sanitized object를 분리해 `make`가 서로 다른 instrumentation 설정에서 normal object를 잘못 재사용하지 않도록 한다.

sanitizer target은 두 실행 파일과 C operation-invariant test를 빌드하고 두 sanitizer 모두 첫 defect에서 중단하도록 설정한 뒤, 설정 가능한 실행 파일 경로를 통해 instrumented binary로 전체 Python functional suite를 실행한다. parser boundary, checker framing, tiny 및 radix sorting, output 동작과 직접 operation test를 runtime instrumentation 아래에서 함께 검증한다.

이 경로는 fault suite와 resource suite를 대체하지 않는다. sanitizer는 invalid memory access와 undefined behavior를 탐지하고, 주입된 실패와 명시적 metric은 서로 다른 계약을 검증한다. build 변경으로 각 검증 방식을 독립적이고 재현 가능한 구성으로 제공한다.
