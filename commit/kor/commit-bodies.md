## feat(core): 리터럴과 퍼센트 출력 구현
공개 `ft_printf` 가변 인자 진입점과 정적 라이브러리 빌드, 그리고 최소한의 포맷 처리 루프를 구현한다. 일반 바이트는 표준 출력으로 그대로 복사하고, `%%`는 퍼센트 기호 하나를 출력한다.

출력 바이트 수 집계는 helper에 모아, 요청된 길이를 더하기 전에 `int` 결과 범위 초과를 검사한다. null format이나 `write` 실패는 `-1`로 변환한다. 이후 추가되는 모든 변환은 이 공통 공개 계약을 따른다. 즉, 전체 작업이 성공한 경우에만 실제로 출력한 바이트 수를 반환한다. 이 단계에서는 짧은 write를 이어서 처리하지 않고 실패로 취급한다. 이후 출력 추상화에서 진입점의 계약은 바꾸지 않은 채 이 system call 경계를 강화할 수 있다.

## feat(output): 출력 컨텍스트와 쓰기 API 추가
출력 대상 file descriptor, 누적 바이트 수, sticky error 상태를 소유하는 private 출력 context를 도입한다. `ft_printf_write`는 양수의 short write가 발생하면 buffer를 전진시키고 남은 길이를 줄여 이어서 출력하며, `ft_printf_putchar`는 리터럴과 변환 코드에 필요한 1바이트 출력 연산을 제공한다.

이 상태를 하나의 context에 모으면 각 formatter가 별도의 count를 관리하거나 앞선 실패 이후에도 출력을 계속하는 문제를 막을 수 있다. 따라서 sticky error는 바이트 수 집계의 invariant이자 제어 흐름의 경계다. 출력 상태가 한 번 유효하지 않게 되면 이후 모든 쓰기는 실패를 보고한다. count overflow 검사도 여기로 모았지만, 더 넓은 `ssize_t` 결과를 대상으로 테스트한 뒤 기존 검사 위치와 cast는 이후 커밋에서 다듬는다.

## refactor(core): 리터럴 출력을 컨텍스트 API로 이관
`ft_printf` 내부의 별도 write/count 구현을 제거하고, 리터럴 문자와 escape된 퍼센트 기호도 공통 출력 context를 통해 처리한다.

이제 진입점은 format string 순회, 가변 인자 순회의 초기화와 종료, context의 최종 상태를 공개 반환값으로 변환하는 역할만 담당한다. file descriptor 처리, short write 진행, 바이트 수 집계, sticky failure가 하나의 구현으로 통합되므로 이후 모든 변환도 서로 다른 오류 동작을 중복 구현하지 않고 동일한 출력 invariant를 유지할 수 있다.

## feat(parser): 포맷 필드 모델과 해석기 추가
각 변환 필드를 flag bit set, width, 선택적 precision, conversion specifier를 담는 정규화된 `t_format` 값으로 표현한다. parser는 문법 순서에 따라 이 요소들을 소비하고 아직 읽지 않은 다음 format 위치를 반환하여, 텍스트 문법 인식과 변환 렌더링을 분리한다.

flag는 bitwise OR로 누적하므로 같은 flag가 반복되어도 별도 처리가 필요 없다. width와 precision은 곱셈 전에 `INT_MAX` 기준 overflow를 검사하며, 표현할 수 없는 필드는 작은 값이나 음수로 wrap하지 않고 parsing 실패로 처리한다. `has_precision`을 명시적으로 기록하여 precision 생략과 `.0`도 구분한다. 이후 숫자와 문자열 formatting에서는 두 경우를 서로 다르게 처리해야 한다.

## feat(core): 포맷 필드 해석을 출력 루프에 연결
퍼센트로 시작하는 필드를 parser에 연결하고, main loop가 고정된 문자 수만큼 이동하는 대신 parser가 반환한 cursor를 기준으로 다음 위치로 진행하도록 한다. parsing 실패는 출력 context의 sticky error 상태로 승격하여 공개 `-1` 실패 계약을 유지한다.

이 커밋은 format 순회와 변환 처리 사이의 integration boundary를 만든다. 전용 conversion dispatch가 아직 없으므로 임시 렌더링은 퍼센트 기호와 사용 가능한 specifier를 그대로 출력한다. 중요한 구조적 결정은 필드 소비를 parser가 책임지고, 전체 순서와 종료는 main loop가 책임진다는 점이다.

## fix(io): 파일 디스크립터 출력을 끝까지 재시도
1회성 `write` 호출을 공통 완료 loop로 교체한다. 양수의 short write가 발생하면 offset을 전진시킨 뒤 남은 suffix만 다시 요청한다. `EINTR`는 진행 상태를 잃지 않고 재시도하며, 요청 크기는 성공 결과를 `ssize_t`로 표현할 수 있는 최대 count인 `SSIZE_MAX` 이하로 제한한다.

완료 전에 0바이트가 반환되면 무한 loop를 막기 위해 `EIO`로 변환하고, 그 밖의 모든 오류는 즉시 중단하면서 기존 `errno`를 보존한다. 복합 출력도 내부 성공 상태를 전파한다. 문자열 출력이 실패하면 뒤따르는 newline을 생략하고, sign이나 앞선 digit 출력이 실패하면 나머지 숫자를 출력하지 않는다. 공개 API는 여전히 `void`지만, 이미 확인된 부분 실패 이후에 출력을 계속하지는 않는다.

## test(io): 부분 쓰기와 EINTR 이후 진행을 검증
file descriptor 출력 구현을 scripted `write` 대체 함수와 함께 컴파일하여 short write, interrupt, zero progress, 영구 오류를 결정론적으로 재현한다. harness는 비결정적인 pipe 동작에 의존하는 대신 descriptor, 요청 길이, 실제 출력 바이트, 잘못된 요청을 기록한다.

각 시나리오는 첫 번째 미출력 바이트부터 재시도하는지, `EINTR`가 offset을 전진시키지 않는지, zero progress가 `EIO`로 변환되는지, 영구 오류 발생 시 복합 문자열·newline·숫자 출력이 중단되는지를 검증한다. `INT_MIN`도 실행하여 재귀적인 digit 출력이 주입된 실패 sequence에서도 순서와 조기 중단을 모두 보존하는지 확인한다.

## refactor(string): 결합 문자열의 할당 한계를 명시
`ft_strjoin`의 크기 guard를 `SIZE_MAX - right_length - 1` 형태로 다시 작성하여, 최종 allocation과 동일한 산술식 안에서 terminator 1바이트를 예약한다는 점을 명시한다.

허용 범위는 바뀌지 않지만, 새 표현은 `left_length + right_length + 1 <= SIZE_MAX`라는 요구사항을 직접 반영한다. 별도의 `right_length == SIZE_MAX` guard를 유지하여 left operand를 비교하기 전에 subtraction 자체도 정의된 범위에서 수행되도록 한다.

## feat(text): 문자·문자열·퍼센트 변환 추가
parsed specifier에 맞는 가변 인자를 소비하고 `c`, `s`, `%` 렌더링을 text 전용 함수에 위임하는 conversion dispatcher를 추가한다. main loop에서 type별 `va_arg` 지식이 사라지므로 argument 추출과 해당 promoted type을 정의하는 변환이 함께 유지된다.

문자열 출력은 null pointer를 명시적인 `(null)` 표현으로 매핑한 뒤 공통 context를 통해 해당 바이트 범위를 출력한다. 문자와 퍼센트 출력도 동일한 count 기반 write 경로를 사용한다. 아직 최종 syntax validation 정책이 없으므로 알 수 없는 필드는 이전의 literal fallback을 유지한다. 따라서 이 커밋은 최종 문법 확정이 아니라 점진적인 conversion 확장이다.

## build(flags): C99 경고와 builtin 정책을 고정
호출자가 전달한 `CFLAGS`와 `CPPFLAGS`를 strict C99 warning과 프로젝트 include path로 덮어써 언어 및 진단 정책을 선택 사항이 아닌 것으로 만든다. compiler builtin을 비활성화하여 libc 호환 이름 호출이 compiler 제공 의미로 치환되지 않고, 라이브러리가 실제로 정의한 구현대로 compile/link되도록 한다.

필수 `bonus` target도 완성된 archive의 alias로 노출하고 모든 build 경로에서 dependency generation을 유지한다. 이로써 compilation 설정과 target 제공 여부가 환경 의존적인 관례가 아니라 재현 가능한 프로젝트 계약이 된다.

## test(alloc): 할당 실패와 rollback을 검증
구현을 다시 빌드하면서 `malloc`과 `free`를 추적 allocator로 redirect해 allocation failure를 결정론적으로 주입한다. 단일 allocation API는 allocation이 실패하면 live storage를 남기지 않고 `NULL`을 반환해야 한다.

`ft_split`은 pointer array부터 각 field까지 모든 allocation 위치를 차례대로 실패시킨다. 결과는 `NULL`이어야 하며, 앞서 성공한 모든 allocation은 회수되고 소유하지 않은 pointer를 free해서는 안 된다. `ft_lstmap`도 각 node allocation 위치에서 동일하게 검증한다. destructor count를 통해 새로 mapping된 content와 앞선 mapped node가 모두 해제되며 source list는 변경되지 않음을 확인한다. 이는 성공 경로 테스트로는 확인할 수 없는 rollback invariant를 직접 검증한다.

## feat(decimal): 부호 있는·없는 10진수 출력 추가
dispatch에 signed `d`/`i`와 unsigned `u` 변환을 추가하고, 두 표현 모두 하나의 unsigned digit routine을 사용한다. digit은 bounded local storage에 least-significant first 순서로 생성한 뒤 역순으로 출력한다. dynamic allocation을 피하면서도 모든 바이트에 대해 출력 context의 failure 및 count 처리를 유지한다.

signed formatting은 sign 출력과 magnitude formatting을 분리한다. 먼저 `int`를 `long`으로 확장한 뒤 negate하여, `long`이 더 넓은 플랫폼에서는 `INT_MIN`을 포함한 일반적인 음수 범위를 `int`에서 직접 negate하지 않고 표현할 수 있다. 이는 초기 magnitude 처리 방식이며, 이후 portability 강화에서 `int`와 `long`의 상대적 width에 대한 의존성을 제거한다.

## feat(hex): 16진수와 포인터 출력 추가
소문자·대문자 16진수 변환과 pointer 렌더링을 추가하고, dispatch가 각 specifier에 필요한 type으로 argument를 추출하도록 한다. 공통 base-16 routine은 digit alphabet을 선택하고 fixed local storage에 digit을 만든 뒤 공통 출력 context를 통해 출력한다.

pointer는 numeric formatting 전에 `uintptr_t`로 변환하고 명시적인 `0x` prefix를 붙인다. prefix를 address digit과 분리하면 이후 width와 padding 계산에 포함시킬 수 있으며, prefix 바이트를 값 자체의 base-16 magnitude와 혼동하지 않게 된다.

## test(release): archive와 consumer 경계를 검증
repository test에 직접 compile된 코드만 검사하지 않고, 전달 산출물인 static library 자체를 release 대상으로 검증한다. script는 archive member와 전역 정의 API symbol을 명시적 manifest와 비교하고, 소수의 허용된 runtime 집합 및 platform별 `errno` accessor를 제외한 미선언 external dependency를 거부한다.

smoke consumer를 임시 directory로 복사한 뒤 `libft.h`와 archive만 사용해 compile하고 실행한다. 이를 통해 누락된 object, 의도치 않은 symbol export, 숨겨진 repository-relative dependency, 내부에서는 동작하지만 Darwin 또는 Linux에서 문서화된 public boundary만으로 소비할 수 없는 header/archive를 찾는다.

## test(sanitize): undefined behavior 검사를 추가
library object와 일반 functional test를 별도 object tree에서 UndefinedBehaviorSanitizer로 빌드한다. 구현 자체를 다시 compile하는 것이 중요하다. test executable에만 instrumentation을 적용하면 archive 내부의 undefined operation을 관찰할 수 없다.

runner는 첫 report에서 중단하고 유용한 diagnostics를 위해 frame pointer를 유지한다. `sanitize`를 이 target에 연결하여 signed overflow, 잘못된 shift, alignment violation과 같은 language-level fault를 값 기반 테스트와 함께 재현 가능한 검증 경로로 만든다.

## feat(text): 문자·문자열·퍼센트 너비와 정렬 적용
문자, 문자열, 퍼센트 변환에 field width를 적용하고 반복 문자를 출력하는 재사용 가능한 연산을 추가한다. 각 formatter는 실제 렌더링 content 길이를 기준으로 부족한 width를 계산한다. 기본적으로 앞쪽에 space를 출력하고, left-alignment flag가 있으면 space를 값 뒤로 옮긴다.

layout 규칙은 source data를 변경하는 대신 변환 결과의 실제 byte length를 기준으로 표현한다. padding 값이 음수면 자연스럽게 아무 작업도 하지 않으므로 content가 field보다 길다는 이유만으로 잘리지 않는다. 모든 padding byte는 여전히 공통 출력 context를 거친다. 이후 performance 개선에서는 layout 계약을 바꾸지 않은 채 이 반복 출력을 묶어서 처리할 수 있다.

## feat(decimal): 10진수 너비와 정렬 적용
decimal conversion을 두 단계로 refactor한다. 먼저 magnitude의 digit을 생성하고 길이를 계산한 뒤, field 순서에 맞춰 padding, sign prefix, digit을 렌더링한다. signed와 unsigned 변환은 같은 layout 함수를 공유하며, minus sign도 별도 선행 write가 아니라 명시적인 prefix로 표현한다.

prefix와 digit 길이를 미리 계산하면 출력 전에 width 산술을 결정론적으로 처리할 수 있다. right alignment는 완전한 signed 표현 앞에 space를 배치하고, left alignment는 뒤에 배치하여 sign과 digit이 서로 붙어 있다는 invariant를 유지한다. 이 구조는 이후 precision zero와 다른 sign flag를 삽입할 위치도 제공한다.

## feat(hex): 16진수와 포인터 너비와 정렬 적용
16진수 렌더링을 먼저 digit을 materialize한 뒤 출력하도록 재구성하고, 일반 hexadecimal 값과 prefix가 있는 pointer에 하나의 layout 경로를 적용한다. formatter는 prefix와 digit 길이를 합한 값을 기준으로 width를 계산하고, left alignment 여부에 따라 앞이나 뒤에 space를 출력하면서 `0x`가 address digit에 붙어 있도록 유지한다.

digit 생성과 field 배치를 분리하면 `x`, `X`, `p` 사이에서 width logic을 중복할 필요가 없다. uppercase 여부는 선택한 digit alphabet의 속성으로 남고, pointer의 정체성은 prefix와 변환된 address value의 속성으로 남는다. 따라서 두 concern은 padding 동작과 독립적으로 발전할 수 있다.

## feat(text): 문자열 정밀도와 퍼센트 0 채움 적용
string precision이 출력할 최대 바이트 수를 제한하도록 하고, percent conversion에서는 left alignment가 없을 때 `0` flag가 활성화되면 zero padding을 선택한다. width는 precision 적용 후의 문자열 길이를 기준으로 계산하므로, source string 전체 길이가 아니라 실제 출력되는 바이트 수에 맞춰 padding한다.

이로써 text에서 width와 precision의 역할을 구분한다. precision은 content를 truncate하고, width는 그 주변에 padding만 추가한다. 이 구현은 아직 precision limit을 적용하기 전에 문자열 전체 길이를 먼저 구한다. 일반적인 NUL-terminated input에는 충분하지만 precision이 memory read 자체의 상한이 되지는 않는다. 이후 수정에서 length discovery 단계로 이 경계를 옮긴다.

## feat(numeric): 숫자 정밀도와 0 채움 적용
decimal과 hexadecimal layout에 prefix byte 수, precision zero 수, field padding 수, value digit 수를 각각 분리해 추가한다. precision이 명시되면 field-level `0` flag를 무시하고, 값이 0이면서 precision도 0이면 digit을 출력하지 않는다. 그 외에는 요청한 최소 digit 수를 충족할 때까지 precision zero를 앞에 추가한다.

출력 순서는 의도적으로 다음과 같이 정한다. leading space, sign 또는 base prefix, 허용된 경우의 field zero padding, precision zero, digit, 필요하면 trailing space 순이다. 각 component를 독립적으로 관리하면 zero padding이 sign이나 `0x` prefix 앞에 배치되는 문제를 막고, width가 모든 출력 바이트를 정확히 포함하게 할 수 있다. 같은 규칙을 각 numeric specifier별로 다시 구현하지 않고 기존 shared layout 경로에 적용한다.

## feat(flags): 숫자 플래그 우선순위 정규화
parsing이 끝난 뒤 충돌하는 flag를 한 번만 normalize하고, signed 및 hexadecimal 변환이 요구하는 prefix를 추가한다. left alignment는 zero padding을 해제하고, 명시적인 plus sign은 더 약한 leading-space sign 요청을 해제한다. 따라서 formatter는 동일한 precedence 규칙을 반복해서 해결하지 않고 canonical flag set만 처리하면 된다.

양수 signed 값은 우선순위에 따라 `+`, space, 또는 prefix 없음 중 하나를 선택하고, 음수는 `-`를 유지한다. alternate-form hexadecimal은 0이 아닌 값에만 `0x` 또는 `0X`를 붙여 0에 불필요한 prefix가 생기지 않도록 한다. prefix는 이미 shared width/precision layout에 포함되므로, 이 semantic flag들은 placement logic을 바꾸지 않고 통합된다.

## test(sanitize): address sanitizer 검사를 추가
library와 functional suite를 별도로 instrumentation한 AddressSanitizer build를 추가한다. normal artifact와 sanitizer artifact를 분리하여 섞이지 않게 하고, frame pointer를 유지해 memory error report를 관련 call path에 연결할 수 있게 한다.

기본 실행은 out-of-bounds access, use-after-free 등 address error를 탐지하지만 ASan leak detection은 명시적으로 비활성화한다. leak ownership 검증은 dedicated host leak target이 담당한다. ASan을 aggregate `sanitize` alias와 분리하여 두 sanitizer가 함께 실행된다고 오해하지 않도록 지원 범위도 명확히 한다.

## test(leak): host 누수 검사 경로를 추가
일반 test binary에 대해 host 환경에 맞는 leak check를 추가한다. macOS에서는 사용할 수 있으면 `leaks`를 사용하고, 그 외에는 Valgrind에서 모든 leak kind를 실패 exit status로 승격해 ownership defect를 build failure로 만든다.

사용 가능한 checker가 하나도 없을 때 실패하도록 하여, 실제로 수행하지 않은 검사를 성공으로 보고하지 않는다. 이 경로는 leak detection을 의도적으로 비활성화한 ASan address-safety 설정을 보완하며, functional suite에서 사용하는 동일한 성공 ownership 흐름을 검사한다.

## test(printf): 기본 변환과 포맷 경계 검증
표준 출력을 pipe로 redirect하고 세 가지 속성을 함께 검사하는 end-to-end harness를 추가한다. 실제 출력된 정확한 byte sequence, capture된 바이트 수, 함수 반환값을 모두 검증한다. 지원되는 경우 `snprintf`와 비교하여 독립적인 behavioral oracle을 확보하고, null string 및 pointer 표현처럼 프로젝트에서 별도로 정의한 동작은 명시적인 expected output으로 검사한다.

suite는 literal 및 escape 출력, embedded NUL 문자, integer extrema, unsigned 및 hexadecimal 범위, pointer, width, alignment, precision, zero padding, alternate form, sign precedence, mixed flag를 포함한다. width나 precision이 `INT_MAX`를 초과하면 테스트 대상 field에서 아무 것도 출력하지 않고 `-1`을 반환하는지도 검증한다. 이로써 눈에 보이는 formatting뿐 아니라 byte count와 parser boundary 같은 덜 명시적인 계약도 고정한다.

## test(build): Clang과 GCC 호환성을 검증
generic `cc` 이름을 신뢰하지 않고 실제 Clang 구현과 GNU GCC 양쪽에서 프로젝트를 검증한다. script는 version output으로 compiler family를 판별하고, 프로젝트를 격리된 임시 workspace에 복사하며, 둘 중 하나라도 사용할 수 없으면 실패한다.

각 compiler는 clean archive build, functional test, allocation/write failure test, archive/consumer boundary check를 수행한다. workspace 격리를 통해 한 compiler가 만든 artifact나 dependency file이 다른 compiler의 build를 만족시키지 못하게 하여, portable하지 않은 diagnostic, extension, link assumption, stale-build masking을 드러낸다.

## fix(output): 쓰기 결과를 집계하기 전에 범위 검증
`write`가 반환한 `ssize_t` 결과를 `int` 반환 count 산술에 사용하기 전에 범위를 검증한다. 이전 식은 `written`을 먼저 cast했기 때문에, 성공 결과가 `INT_MAX`보다 크면 overflow guard가 평가되기 전에 implementation-defined 값이나 음수로 바뀔 수 있었다.

수정된 순서는 count invariant를 보존한다. `ctx->count`에 더하는 각 값이 먼저 `int`로 표현 가능한지 확인하고, 합계가 `INT_MAX`를 초과하는지는 별도로 검사한다. 위반 시 context는 sticky error 상태로 들어가고 공개 호출은 wrap되거나 잘못된 byte count를 노출하는 대신 `-1`을 반환한다.

## test(output): 표준 출력 실패 전파 검증
표준 출력을 잠시 닫고 `ft_printf`를 호출한 뒤 descriptor를 복원하여 반환값이 `-1`인지 검사함으로써 실제 system call 실패 경로를 실행한다.

이 테스트는 성공 formatting만 보는 대신 출력 context의 sticky error 상태가 public API에 어떤 결과를 만드는지 검증한다. `write` 오류를 무시하거나, 부분적인 양수 count를 반환하거나, 출력이 성공한 것처럼 계속 진행하는 구현을 막는다. 테스트 내부에서 표준 출력을 복원하여 실패 시나리오가 process의 나머지 동작에 영향을 주지 않도록 한다.

## test(numeric): 접두사와 정밀도 배치 회귀 검증
sign, alternate-form prefix, field zero padding, precision zero, left alignment, zero-value-with-zero-precision 특수 규칙의 상호작용에 집중한 regression case를 추가한다.

이 조합은 단일 flag 테스트만으로는 확인할 수 없는 ordering property를 보호한다. sign과 `0x`/`0X`는 zero padding보다 앞에 와야 하고, 명시적인 precision은 field-level zero padding을 비활성화해야 한다. 0인 hexadecimal 값이 digit을 출력하지 않는 경우 alternate form도 남아서는 안 되며, trailing space는 완전한 prefixed value 바깥에 있어야 한다. case는 `snprintf`와 비교하여 독립적으로 구현된 flag들의 의도한 조합을 고정한다.

## test(release): 전체 검증 절차를 연결
whitespace validation, clean rebuild, normal test와 injected-failure test, sanitizer run, archive/API consumer check, cross-compiler build, host leak detection을 하나로 묶는 release gate를 추가한다. 완전히 clean한 상태에서 시작하므로 stale artifact가 dependency나 linkage 문제를 가리지 못하고, 마지막 `make -q all`은 검증 과정 자체가 선언된 build graph를 최신 상태로 유지하는지 확인한다.

이 target은 specialized check를 대체하지 않는다. 각 defect class가 자체 diagnostic을 유지하도록 순서대로 실행하면서도 전체 release contract를 하나의 진입점에서 재현 가능하게 검증할 수 있게 한다.

## refactor(output): 숫자 출력 배치 로직 통합
decimal과 hexadecimal에 공통인 placement algorithm을 `ft_printf_write_numeric_layout`으로 추출한다. conversion-specific code는 prefix, 준비된 digit sequence, 길이, 값이 0인지 여부만 전달하고, helper가 zero suppression, precision expansion, field padding, ordering, error propagation을 담당한다.

이는 formatting 동작을 바꾸는 것이 아니라 책임 경계를 조정하는 refactor다. 이전에는 decimal과 hexadecimal 변환이 동일한 복잡한 규칙을 각각 보유해, 한쪽의 수정이 다른 쪽과 어긋날 가능성이 컸다. layout을 중앙화하여 검증된 동작을 유지하면서 prefix–padding–precision invariant를 이후 수정과 최적화에서 한 곳만 관리할 수 있게 한다.

## fix(output): 중단된 쓰기 재시도와 요청 크기 제한
system call loop를 강화하여 interrupted write와 permanent failure를 구분하고, 모든 요청이 `ssize_t`로 표현 가능한 범위에 들어오도록 한다. `SSIZE_MAX`보다 큰 요청은 나누고, 양수의 short write는 이전처럼 buffer를 전진시키며, `EINTR`는 count나 remaining range를 바꾸지 않고 재시도한다.

결정론적인 fault test를 위해 compile-time write seam을 도입하지만 production build는 그대로 실제 `write`를 호출한다. 출력 invariant를 명확히 정의한다. 양수로 반환된 바이트 수만 progress이며, interruption은 투명하게 재시도한다. 0 또는 `EINTR`가 아닌 오류가 발생하면 context를 영구 실패 상태로 만든다. 요청 크기를 제한하면 system call의 signed result type으로 전체 성공을 표현할 수 없는 크기를 전달하는 문제도 막을 수 있다.

## perf(output): 반복 채움을 묶어서 출력
padding byte마다 system call을 한 번씩 호출하던 동작을, stack에 준비한 최대 64바이트 chunk 단위 출력으로 바꾼다. 반복되는 space나 zero는 이제 block 단위로 `ft_printf_write`를 거치므로 short-write recovery, count check, sticky failure semantics를 그대로 유지하면서 넓은 field나 큰 precision에서 call overhead를 크게 줄인다.

fixed-size buffer를 사용하므로 memory usage는 일정하고 dynamic allocation이 필요 없다. 전체 padding span을 한 번에 만들지 않고 chunking하므로 사용자가 지정한 width와 관계없이 stack usage가 bounded된다. parser의 size limit이나 output layer의 error contract를 약화하지 않고 성능만 개선한다.

## test(output): 쓰기 실패 시퀀스와 채움 전략 검증
full write, short write, `EINTR`, `EPIPE`, zero-byte return을 scripted 방식으로 반환하고 call과 실제 출력 바이트를 기록하는 결정론적 write 대체 함수를 추가한다. system call sequence를 직접 관찰할 수 있으므로 short write 후 올바른 offset에서 재개하는지, interrupted call이 데이터를 잃지 않고 재시도되는지, permanent failure가 `-1`을 반환하는지, 부분 출력은 실패 전에 실제로 쓰인 바이트와 정확히 일치하는지, zero return이 무한 loop를 만들지 않는지 검증한다.

또한 width 1000에 대해 call count와 최대 64바이트 chunk를 검사하여 반복 padding 전략도 고정한다. 별도의 실제 broken-pipe test는 라이브러리가 반환값으로 `EPIPE`를 보고하면서도 process의 `SIGPIPE` handler를 바꾸지 않는지 확인한다. 두 테스트를 함께 사용하여 내부 retry mechanism과 signal policy가 caller의 책임이라는 경계를 모두 보호한다.

## fix(text): 문자열 정밀도 범위까지만 읽기
`%s`가 렌더링할 수 있는 최대 바이트 수를 넘어 읽지 않도록 string precision 조건을 length discovery 단계로 옮긴다. 이전 구현은 먼저 terminating NUL까지 scan한 뒤 계산된 길이를 truncate했기 때문에, precision은 출력 상한이었지만 memory-access 상한은 아니었다.

bounded scan은 NUL 또는 요청된 precision 중 먼저 도달하는 지점에서 멈추고, 동일한 길이를 width 계산과 출력에 사용한다. 이로써 precision-limited string에 필요한 안전 계약을 복원한다. 보이는 범위 밖의 바이트는 formatter가 출력하지 않기로 결정하기 위해 읽을 수 있어야 할 필요가 없다.

## test(text): NUL 없는 제한 문자열 회귀 검증
terminating NUL이 없는 3바이트 source array를 precision-limited string case로 추가한다. expected result는 `snprintf`로 생성하고, 프로젝트 구현도 정확히 해당 3바이트만 출력해야 한다.

일반적인 C string이라면 unbounded scan을 해도 테스트를 통과할 수 있으므로, 이 case는 safety requirement를 직접 관찰 가능하게 만든다. precision boundary를 넘어서 검색하는 regression은 memory instrumentation에서 detectable out-of-bounds read를 일으킬 수 있으며 functional comparison도 더 이상 만족하지 못한다.

## fix(decimal): INT_MIN 크기를 unsigned 범위에서 계산
음수 signed 값의 magnitude를 계산할 때 signed type에서 표현할 수 없는 양수 counterpart를 절대 만들지 않는다. `value`를 직접 negate하는 대신 `value + 1`을 negate하여 표현 가능한 결과를 만든 뒤 `unsigned long`으로 변환하고, unsigned domain에서 마지막 1을 더한다.

이 방식은 `long`이 `int`보다 넓지 않은 data model에서도 `INT_MIN`을 올바르게 출력한다. core numeric boundary에서 암묵적인 platform assumption을 제거하며, sign selection과 shared decimal layout은 그대로 유지한다.

## fix(format): 지원 문법과 전체 출력 크기 선검증
출력 전에 전체 measurement pass를 추가한다. format 전체를 parse하고, 지원하지 않거나 완성되지 않은 conversion syntax를 거부하며, rendering과 동일한 promoted argument type으로 복사된 `va_list`를 소비한다. 각 conversion의 formatted length를 계산하고, 각 component나 전체 길이가 public `int` 반환 type으로 표현되지 않으면 실패한다.

`va_copy`를 사용하여 validation이 실제 출력에 사용할 argument sequence를 전진시키지 않도록 한다. string은 동일한 precision bound로 측정하고, numeric prefix, zero suppression, precision, width 규칙도 renderer와 동일하게 재현하여 preflight 결과가 실제 byte model과 일치하도록 한다.

핵심 계약 변화는 atomic validation이다. malformed syntax나 표현할 수 없는 전체 길이는 앞선 literal 또는 conversion이 유효하더라도 아무 것도 출력하기 전에 `-1`을 반환한다. 두 번째 순회 비용이 들고 measurement logic과 rendering을 계속 동기화해야 하지만, format과 argument만으로 미리 발견할 수 있는 오류 때문에 partial output이 발생하는 문제를 막는다. runtime `write` failure는 본질적으로 atomic하게 처리할 수 없으므로 기존처럼 output context가 담당한다.

## test(format): 잘못된 포맷의 무출력 실패 검증
literal text 뒤와 유효한 argument-consuming conversion 뒤에 invalid field를 배치하여 preflight contract를 고정한다. unsupported specifier, trailing percent sign, `INT_MAX`를 넘는 width 또는 precision, 완성된 formatted length가 `INT_MAX`를 초과하는 조합은 모두 0바이트를 출력하고 `-1`을 반환해야 한다.

각 format 뒤쪽에 fault를 배치하는 것이 핵심이다. 그래야 whole-format validation과 렌더링 중 해당 위치에 도달해서야 오류를 발견하는 구현을 구분할 수 있다. 테스트는 literal, suffix, sign, alternate-form prefix, precision이 만드는 overflow도 포함하여 total-length validation이 field 숫자만 따로 검사하지 않고 모든 출력 component를 계산하는지 확인한다.

## test(printf): 숫자와 문자열 포맷 조합 확대
signed decimal, unsigned decimal, hexadecimal 출력에 format-by-value matrix를 적용해 differential testing 범위를 넓힌다. 선택한 값에는 0, sign 전환 지점, 일반적인 여러 자리 값, integer extrema가 포함된다. format은 alignment, sign flag, field zero padding, precision, alternate form, width–precision 혼합 layout을 조합한다.

text coverage도 문자, 빈 문자열과 비어 있지 않은 문자열, truncation, alignment, embedded NUL 출력, 여러 conversion을 섞은 format까지 확장한다. 여기서는 개별 example보다 `snprintf`와의 cross-product 비교가 더 효과적이다. prefix, zero suppression, padding length가 조합될 때 각 feature 자체는 유지되지만 상호작용에서 깨지는 경우를 찾을 수 있기 때문이다.

## test(printf): 공개 계약 경계 사례 확대
precision zero, digit count 전환점 인근 값, sign, alternate prefix, content 길이 바로 아래와 위의 width를 중심으로 differential matrix와 고정된 project-specific expectation을 함께 사용하여 남은 public boundary 동작을 정의한다. 이를 통해 digit이 사라지는 정확한 지점, zero가 추가되는 지점, space가 trailing side로 이동하는 지점을 검증한다.

고정 expectation은 host `printf`에 안전하거나 portable하게 위임할 수 없는 동작을 다룬다. null format은 출력 없이 실패하고, empty format은 0바이트 성공한다. null string은 width/precision 적용 대상인 `(null)`을 사용한다. null pointer는 precision 때문에 모든 digit이 억제되어도 `0x` prefix를 유지한다. percent는 프로젝트가 정의한 width, alignment, zero-padding, precision syntax를 허용한다. 이로써 모든 지원 확장을 ISO `printf` 동작으로 간주하지 않고, compatibility check와 의도적인 project contract를 분리한다.

## test(release): 아카이브와 외부 소비자 검증
repository 내부 test가 link한 코드만이 아니라 배포 가능한 산출물인 static library 자체를 release level에서 검증한다. script는 정확한 archive member 목록, 정의된 global symbol 전체 집합, Darwin/Linux symbol naming을 normalize한 뒤의 unresolved runtime dependency를 검사한다.

dependency allowlist는 archive가 `write`, platform errno accessor, 해당되는 경우 compiler가 삽입한 stack-protector symbol에만 의존하도록 제한한다. 이후 임시 directory에서 public header와 archive만 사용해 consumer를 build하고, 출력 및 반환 동작을 검사하여 packaged interface가 source tree 밖에서도 link/run되는지 확인한다. temporary state가 정리되는지도 검사해 release test 자체의 재현성과 비오염성을 유지한다.

## build(sanitize): UBSan과 Linux ASan 검증 추가
functional suite와 deterministic output-fault suite를 구현과 함께 compile하는 instrumentation build 경로를 추가한다. UBSan은 portable default sanitizer target으로 실행하며 detected undefined behavior가 있으면 즉시 실패한다. AddressSanitizer/UBSan 결합 build는 pinned Linux GCC container에서 실행하여 address-checking 환경을 재현 가능하게 만든다.

object-free test binary를 분리하여 test write seam을 포함한 실제 library source가 instrumentation되도록 하고, instrumentation되지 않은 archive만 link하는 상황을 피한다. aggregate `check` target은 behavioral test, release-boundary validation, undefined-behavior detection, whitespace check를 결합한다. ASan은 `sanitize-linux`를 통해 명시적으로 실행하므로 default check가 실제로 수행하지 않는 address 또는 leak coverage까지 포함한다고 오해하지 않게 한다.
