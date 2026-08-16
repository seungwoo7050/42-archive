## feat(char): ASCII 문자 판별과 대소문자 변환 구현
재현 가능한 static library build와 함께 첫 번째 public `libft` API를 구성한다. 문자 판별 함수는 명시적인 ASCII 범위를 사용하므로 process locale과 무관하게 동작하고, 대소문자 변환 함수는 해당 ASCII 문자 범위를 벗어난 입력을 그대로 반환한다. `ft_isalnum`은 alphabetic predicate와 decimal predicate를 조합해 정의하여 분류 규칙을 중복하지 않고 일관되게 유지한다.

build는 생성된 dependency를 기록하고 strict C99 warning으로 compile하며 구현을 `libft.h` 뒤의 archive로 묶는다. 이로써 header가 API의 기준이 되고 이후 module이 안정적인 compile/link boundary를 사용할 수 있다.

## test(char): ASCII 문자 동작을 libc와 비교
재사용 가능한 test runner와 `make test` 진입점을 도입하고, `C` locale에서 character API를 C library와 differential test한다. 표준 character classification 함수는 true의 구체적인 값이 아니라 0과 nonzero만 보장하므로, boolean 결과를 normalize한 뒤 비교한다.

`unsigned char`로 표현 가능한 모든 값과 `EOF`, 선택된 out-of-range 입력까지 실행하여 ASCII 계약과 nonletter 입력을 case conversion이 변경하지 않아야 한다는 요구를 고정한다. test harness는 이후 module이 build boundary를 바꾸지 않고 확장할 수 있는 공통 failure-reporting mechanism도 제공한다.

## feat(memory): 메모리 채우기와 0 초기화 구현
`ft_memset`으로 byte 단위 memory fill을 추가하고, `ft_bzero`는 같은 primitive의 zero-byte specialization으로 정의한다. storage pointer와 fill value를 모두 `unsigned char`로 변환하는 방식은 C object representation model에 맞는다. 임의의 memory는 byte 단위로 조작하고, `int` fill value는 하위 1바이트로 축소한다.

원래 pointer를 반환하여 일반적인 `memset` chaining contract를 유지한다. zeroing도 `ft_memset`을 재사용하므로 write bounds를 하나의 구현에서만 책임지고, 두 loop의 edge behavior가 달라질 가능성을 없앤다.

## test(memory): 메모리 채우기 범위 검증
표준 library와 memory fill 결과를 비교하되, 변경되어야 할 byte만 확인하지 않고 그 주변까지 검사한다. target range 앞뒤에 seeded guard data를 배치해 underrun과 overrun을 드러내고, offset·length·fill value matrix로 zero-length operation, unaligned start, byte-boundary value, `unsigned char`로 변환되어야 하는 `int` 값을 포함한다.

원래 pointer를 반환하는 계약도 검사하며, null pointer는 요청 길이가 0일 때만 허용한다. 이를 통해 access가 없는 유효한 case와 nonzero-length invalid access를 구분하고 `ft_memset`과 `ft_bzero` 모두에 필요한 정확한 byte-range invariant를 보호한다.

## feat(memory): 겹치지 않는 메모리 복사 구현
서로 겹치지 않는 것으로 알려진 byte range를 복사하는 primitive로 `ft_memcpy`를 추가한다. 두 operand를 character type으로 바라보므로 어떤 object representation도 byte 단위로 복사할 수 있고, source는 `const`를 유지하며 원래 destination을 반환해 public contract를 맞춘다.

구현은 overlap을 탐지하거나 처리하지 않는다. 이 precondition을 명확히 유지하면 단순한 primitive에 overlap 처리 비용을 넣지 않아도 되고, 더 강한 계약은 이후 도입하는 `ft_memmove`가 담당한다.

## test(memory): 메모리 복사 경계 검증
여러 source/destination offset과 length에 대해 `ft_memcpy`를 표준 구현과 비교하며, zero-length null-pointer case도 포함한다. whole-buffer comparison으로 복사된 prefix만 확인하는 대신 정확히 요청된 destination interval만 변경되는지 검증한다.

source snapshot을 별도로 보존하여 read-only 역할도 확인한다. 이 검증은 함수의 핵심 세 계약을 보호한다. 원래 destination을 반환하고, source를 변경하지 않으며, 요청된 non-overlapping range 밖에는 아무 byte도 쓰지 않아야 한다.

## feat(memory): 겹치는 메모리의 안전한 이동 구현
기존 byte-copy primitive 위에 `ft_memmove`를 추가하여 source와 destination range가 겹쳐도 데이터를 보존한다. 같은 pointer이거나 length가 0이면 즉시 no-op으로 반환한다. destination이 source range 내부에서 시작하면 아직 읽지 않은 source byte가 덮어써지지 않도록 끝에서 시작 방향으로 복사하고, 나머지 경우는 `ft_memcpy`를 이용해 forward copy해도 안전하다.

overlap 여부는 서로 무관한 object의 pointer ordering을 가정하지 않고 source range 내부 위치와의 equality로 판단한다. 더 강한 move semantics를 이 함수에만 모으면서, forward traversal이 안전한 range에서는 `ft_memcpy`를 효율적인 primitive로 유지한다.

## test(memory): 겹치는 메모리 이동 검증
system `memmove`를 oracle로 사용하여 같은 위치, forward overlap, backward overlap, disjoint move를 다양한 length에 대해 검사한다. 각 case는 동일한 pattern buffer에서 시작하고 전체 결과를 비교하므로 destination interval 밖의 corruption도 잘못 복사된 content와 함께 드러난다.

zero-length null-pointer case는 early-return path가 아무 access도 하지 않는지 검증한다. overlap 방향에 따라 올바른 traversal direction이 달라지므로 두 방향을 모두 검사하는 것이 핵심이며, 한 방향만 테스트하면 중심 safety property가 검증되지 않는다.

## feat(memory): 범위를 제한한 메모리 검색과 비교 추가
length로 제한되는 byte search와 compare primitive를 추가한다. `ft_memchr`은 요청한 값을 `unsigned char`로 변환하고 지정한 길이 안에서 첫 번째 일치 주소를 반환한다. `ft_memcmp`는 unsigned byte value를 비교하고 첫 차이에서 중단한다.

`0x80` 이상의 값에서는 unsigned byte interpretation이 중요하다. signed `char`를 사용하면 ordering이 platform-dependent해진다. 두 loop 모두 length로 엄격히 제한하므로 embedded zero byte에 특별한 의미가 없고 C string뿐 아니라 임의의 object representation에도 사용할 수 있다.

## test(memory): 메모리 검색과 비교 검증
embedded zero와 high-bit byte가 들어 있는 buffer의 모든 prefix에 대해 bounded search와 comparison을 검증한다. search 결과는 반복 값, 없는 값, conversion 후 같은 byte가 되는 `int` 입력까지 포함해 주소 자체를 비교한다.

`memcmp`는 정확한 numeric difference가 아니라 ordering만 규정하므로 comparison 결과를 sign으로 축소한 뒤 C library와 맞춘다. operand 순서를 모두 바꿔 보고 equality와 zero-length null-pointer case까지 검사하여 특정 library의 반환 magnitude에 과적합하지 않으면서 first-difference ordering을 고정한다.

## feat(string): 문자열 길이 계산과 제한 복사·붙이기 추가
핵심 NUL-terminated string length와 capacity-bounded copy/concatenation 연산을 추가한다. `ft_strlcpy`는 최대 `capacity - 1`개 문자를 쓰고 capacity가 0이 아니면 항상 terminate하지만, full source length를 반환하여 caller가 실제 write와 별개로 truncation을 판단할 수 있게 한다. `ft_strlcat`도 만들려고 시도한 문자열의 길이를 반환한다.

concatenation path는 기존 destination을 주어진 capacity 범위에서만 scan한다. 그 범위 안에 terminator가 없으면 append하지 않고 `capacity + source_length`를 반환한다. out-of-bounds read를 피하면서도 `strlcat` truncation contract를 유지한다. 따라서 이 함수들은 destination이 유효한 string이라고 가정하기보다 buffer capacity를 핵심 safety boundary로 사용한다.

## test(string): 문자열 길이와 capacity 경계 검증
빈 입력, 정확히 맞는 경우, truncation이 발생하는 capacity, 여러 초기 길이의 destination에 대해 string length, bounded copy, bounded concatenation을 실행한다. `strlcpy`와 `strlcat`은 host C library가 해당 non-ISO interface를 제공하는지와 무관하게 검사할 수 있도록 직접 작성한 reference implementation을 사용한다.

각 destination은 deterministic data로 초기화하고 operation 뒤 전체 buffer를 비교한다. 허용 capacity 밖의 write를 관찰할 수 있으며, caller가 성공적인 생성과 truncation을 구분하는 데 사용하는 attempted-length 반환값도 별도로 검증한다.

## feat(string): 문자의 첫·마지막 위치 검색을 추가
요청한 `int` 값을 `unsigned char`로 취급하는 first/last occurrence search를 추가하여 일반적인 문자 범위를 벗어난 값도 standard string-search contract와 맞춘다. 두 함수 모두 terminating NUL을 검색 대상에 포함하므로 `0`을 찾으면 not found가 아니라 terminator를 반환한다.

`ft_strchr`은 target을 찾는 즉시 반환할 수 있다. `ft_strrchr`은 terminator까지 순회하면서 가장 최근 match를 저장하여 repeated character와 NUL case를 동일한 loop로 처리하고 backward-pointer arithmetic을 사용하지 않는다.

## feat(string): 범위 비교와 부분 문자열 검색을 추가
bounded lexicographic comparison과 bounded substring search를 추가한다. `ft_strncmp`는 character를 unsigned byte로 비교하고 첫 차이, NUL terminator, 요청 length 중 먼저 도달한 지점에서 멈춘다. 따라서 high bit가 설정된 byte에서도 platform-dependent ordering을 피한다.

`ft_strnstr`은 empty needle을 시작 위치에서 match한 것으로 취급하고, 제공된 search bound 안의 candidate byte만 확인한다. 남은 허용량을 `length - haystack_index`로 표현하여 overflow 가능한 합을 만들지 않으면서 candidate match가 bound를 넘어 읽지 않게 한다. search는 haystack terminator에서도 중단하여 외부 length limit 안에서 string semantics를 유지한다.

## test(string): 문자열 검색과 비교 경계 검증
반복 문자, 없는 값, terminating NUL, conversion 후 같은 byte가 되는 `int` 값을 포함해 C library와 pointer equality로 character search를 검증한다. bounded comparison은 lexicographic ordering만 contract이므로 exact magnitude가 아니라 result sign으로 비교한다.

local bounded-substring oracle로 empty needle, 여러 위치의 match, overlapping prefix, absent needle, 필요한 match span의 앞뒤에 걸친 search length를 검사한다. haystack 끝 주변에서 bound를 바꾸어 caller-provided range 밖의 byte에 의존한 match가 절대 성공하지 않아야 한다는 핵심 invariant를 보호한다.

## feat(convert): 표현 가능한 10진수 정수 해석
leading ASCII whitespace, optional sign 하나, 뒤따르는 digit run을 대상으로 decimal integer parsing을 구현한다. accumulation은 sign별 limit을 기준으로 `unsigned int`에서 수행한다. 양수는 `INT_MAX`에서 멈추고, 음수는 `INT_MIN`을 표현하기 위해 1 더 큰 magnitude까지 허용한다.

overflow는 multiplication과 addition 전에 검사하므로 지나치게 긴 입력도 signed overflow 없이 해당 endpoint로 saturate한다. 첫 nondigit에서 parsing을 중단하므로 잘못된 sign sequence는 두 번째 sign으로 해석되지 않고 변환된 digit이 없는 결과가 된다.

## test(convert): 정수 해석 경계 검증
empty string, sign-only input, leading zero, 모든 표준 whitespace character, trailing text, malformed sign combination, signed endpoint를 포함하여 표현 가능한 입력을 host `atoi`와 비교한다. parsing이 시작되는 위치와 digit run이 끝나는 정확한 지점을 고정한다.

integer range를 크게 벗어나는 입력은 out-of-range behavior가 portable oracle이 아닌 `atoi`에 위임하지 않고 library의 명시적 saturation policy를 기준으로 검사한다. 따라서 유효한 conversion의 compatibility와 overflow 시 `INT_MAX` 또는 `INT_MIN`을 반환하는 project-defined guarantee를 분리한다.

## feat(alloc): 0 초기화 메모리와 문자열 복제 추가
명시적인 arithmetic 및 ownership guarantee를 갖는 allocation helper를 추가한다. `ft_calloc`은 multiplication 전에 `count * size` overflow를 거부하고, 수학적으로 크기가 0인 요청에도 1바이트를 allocate한 뒤 기존 byte-zeroing primitive로 전체 allocated extent를 0으로 초기화한다. zero-sized request에도 실제 allocation을 반환하므로 이 library에서는 caller가 언제나 일관되게 free할 수 있다.

`ft_strdup`은 null source를 거부하고, 전체 문자열과 terminator를 담을 별도 storage를 allocate한 뒤 한 번의 bounded operation으로 복사한다. 두 함수 모두 allocation failure 시 `NULL`을 반환하므로 construction이 완전히 성공한 뒤에만 caller에게 ownership이 넘어간다.

## test(alloc): 할당과 문자열 복제 계약 검증
일반 및 zero-factor request에서 성공한 `ft_calloc` 결과가 non-null이고 모두 0으로 초기화됐는지 확인한 뒤 public ownership boundary를 통해 모든 allocation을 free한다. `SIZE_MAX`를 초과하는 multiplication case는 allocation 전에 실패해야 하므로 size computation이 wrap되어 undersized buffer를 만드는 일을 막는다.

string duplication은 content뿐 아니라 주소가 서로 다른지도 검사하여 결과가 입력을 alias하지 않고 독립 storage를 소유함을 검증한다. empty string, 일반 text, null source로 allocation·copy·argument-failure contract를 각각 확인한다.

## feat(string): 부분 문자열 생성을 구현
substring 생성을 ownership을 가진 operation으로 추가한다. null source는 실패하고, start가 source length 이상이면 독립적으로 allocated된 empty string을 반환한다. 요청 length가 지나치게 크면 allocation 전에 남아 있는 suffix 길이로 clamp한다.

사용 가능한 span을 `text_length - start`로 계산하여 overflow 가능한 `start + length` 비교에 의존하지 않는다. 선택된 byte를 새 storage에 복사하고 명시적으로 NUL-terminate하므로 요청 slice가 비어 있어도 모든 성공 결과는 독립적으로 free 가능한 유효한 C string이다.

## feat(string): 문자열 결합을 구현
left와 right operand 전체를 이어 붙인 새 문자열을 생성한다. null operand는 allocation 전에 실패하고, combined allocation size는 두 길이와 terminator를 더하기 전에 검사하여 size arithmetic이 wrap되어 undersized buffer가 되지 않도록 한다.

left payload는 terminator 없이 복사하고, 이어서 right payload와 terminator를 함께 복사한다. 결과에는 authoritative terminator 하나만 존재하고 두 input은 변경되지 않는다. 새로 allocated된 combined representation의 ownership은 전적으로 caller에게 있다.

## feat(string): 양끝 문자 집합 제거를 구현
caller가 제공한 character set을 기준으로 trim하는 함수를 추가한다. matching leading character를 건너뛰며 start boundary를 전진시키고, matching trailing character를 건너뛰며 end boundary를 후퇴시킨 뒤 남은 half-open interval을 새 storage에 복사한다.

backward scan에 `end > start` guard를 유지하여 문자열 전체가 trim될 때 unsigned underflow를 막는다. empty result도 allocated NUL-terminated string으로 표현하여 nonempty result와 동일한 ownership contract를 유지한다. null text 또는 set argument는 allocation 없이 실패한다.

## test(string): 문자열 생성과 소유권 검증
empty result, 정확하거나 oversized slice, empty operand, 여러 trim character, 전체 trim, no-op trim에 대해 substring, concatenation, trimming을 검증한다. invalid null argument는 명시적으로 실패해야 한다.

모든 성공 결과는 content뿐 아니라 input operand와 다른 storage address도 확인한 뒤 test가 직접 release한다. 이 주소 검사는 owning API에서 중요하다. source 내부 pointer나 unchanged operand를 반환하면 text는 일시적으로 맞아 보일 수 있어도 caller가 결과를 독립적으로 free할 수 있다는 권한을 위반한다.

## feat(string): 실패 시 정리되는 문자열 분리 구현
delimiter 기반 splitting을 null-terminated pointer array와 독립적으로 allocated된 field들로 구현한다. counting pass로 pointer-array size를 구하고, 연속 delimiter는 empty field를 만들지 않고 건너뛴다. zero-initialized allocation을 사용하여 결과가 비어 있어도 마지막 null sentinel을 보장한다.

각 field는 source의 정확한 span에서 생성한다. field allocation이 하나라도 실패하면 helper가 partial result에 이미 넘어간 모든 field를 release하고 pointer array까지 free한 뒤 `NULL`을 반환한다. 이 rollback 규칙으로 operation을 all-or-nothing으로 만든다. caller는 완전한 ownership graph를 받거나, 실패한 시도에서 남은 live allocation을 전혀 받지 않는다.

## test(string): 문자열 분리 결과 검증
`ft_split`이 반환하는 전체 ownership graph를 검증한다. 예상 field는 모두 존재하고 정확한 byte를 가지며 source와 다른 storage를 사용하고, 마지막에는 null pointer sentinel이 있어야 한다. test는 이 sentinel 기반 public representation을 따라 field를 release하여 외부 count 없이도 일반 consumer가 결과를 정리할 수 있음을 보여 준다.

case는 empty input, delimiter-only input, repeated/edge delimiter, NUL delimiter, 긴 field를 포함한다. delimiter run이 empty field를 만들지 않고 모든 nonempty span이 보존되며, parser 설계에 사용한 작은 example보다 큰 입력에서도 representation이 동작함을 확인한다.

## feat(convert): 부호 있는 정수의 문자열 변환 구현
모든 `int` 값을 decimal text로 변환해 allocation된 결과를 반환한다. 음수 magnitude는 unsigned domain에서 `-(number + 1) + 1` 방식으로 구성하여, 양의 counterpart를 `int`로 표현할 수 없는 `INT_MIN`을 직접 negate하는 undefined operation을 피한다.

digit count로 정확히 한 번의 allocation 크기를 결정하고, 오른쪽에서 왼쪽으로 digit을 기록하여 reversed temporary string이나 두 번째 pass가 필요 없게 한다. 0도 동일한 경로에서 한 digit을 가지며, 음수에만 leading minus sign을 추가한다. 성공 결과는 caller가 ownership을 갖는 NUL-terminated string이다.

## test(convert): 정수 문자열 변환 검증
signed endpoint 양쪽과 digit count 및 sign handling이 바뀌는 모든 경계 인근에서 decimal conversion을 검사한다. `INT_MIN`, 0, power-of-ten boundary, `INT_MAX`의 명시적 expectation으로 magnitude 계산, allocation length, digit order, sign placement 오류를 드러낸다.

성공한 모든 conversion은 allocation된 결과를 반환해야 하며 test가 이를 free한다. 따라서 전체 representable `int` range에서 textual correctness뿐 아니라 function ownership contract도 검증한다.

## feat(string): 인덱스를 사용하는 문자열 변환 추가
서로 다른 ownership 동작을 갖는 두 callback 기반 traversal contract를 추가한다. `ft_strmapi`는 새 문자열을 allocate하고, 원본 각 문자에 대해 zero-based index와 함께 callback을 한 번씩 호출하며 source는 변경하지 않는다. `ft_striteri`는 mutable character address를 in-place callback에 전달하며 새 storage를 반환하지 않는다.

두 함수 모두 iteration 시작 전에 초기 string length를 저장한다. 이로써 call entry 시점에 traversal domain이 고정되므로, in-place callback이 NUL을 써도 이후 작업 범위가 조용히 줄어들지 않는다. null string이나 callback은 dereference 또는 allocation 없이 거부한다.

## test(string): callback 문자열 변환 검증
callback을 instrumentation하여 index가 단조 증가하는지, 정확히 몇 번 호출되는지, allocating transformation과 in-place transformation의 차이가 유지되는지 검사한다. mapped result는 독립 storage를 가져야 하고, iterative callback은 caller의 원본 buffer를 직접 변경해야 한다.

모든 문자를 NUL로 바꾸는 callback이 특히 중요하다. 이 경우에도 초기 문자열의 각 문자마다 한 번씩 호출되어야 한다. 이를 통해 fixed traversal boundary를 고정하고, 구현이 매번 `strlen`을 다시 계산하거나 새로 쓴 terminator를 early-stop 조건으로 사용하는 regression을 막는다.

## feat(io): 파일 디스크립터 출력 함수 추가
임의의 file descriptor에 문자, 문자열, newline, signed decimal을 출력하는 helper를 추가한다. 복합 newline 출력은 string과 character primitive를 재사용하고, integer 출력은 fixed stack buffer에 전체 표현을 구성한 뒤 한 번의 `write`로 보낸다.

integer magnitude는 `ft_itoa`와 동일한 unsigned-domain 기법을 사용하여 signed overflow 없이 `INT_MIN`을 표현한다. 이 단계의 API는 의도적으로 fire-and-forget 방식이다. 함수는 `void`를 반환하고 `write` 결과를 버리므로 오류 관찰은 `errno`에 맡기며, short write나 interrupted write 복구는 아직 보장하지 않는다.

## test(io): 파일 디스크립터 출력 검증
pipe로 출력을 capture하고 네 descriptor helper가 만드는 정확한 byte sequence를 비교한다. 0과 signed endpoint 양쪽도 포함하여 terminal behavior와 무관하게 formatting을 확인하고, shared descriptor에서 호출 순서대로 결과가 합쳐지는지도 검증한다.

failure case는 초기 void-returning policy를 정의한다. `SIGPIPE`를 suppress한 상태에서 broken pipe는 `EPIPE`를 노출해야 하고, 닫힌 invalid descriptor에 write해도 crash 없이 제어가 돌아와야 한다. API가 status를 직접 반환할 수는 없지만 observable error behavior를 고정하며, 이후 커밋에서 partial/interrupted write의 completion 보장을 강화한다.

## feat(list): 연결 리스트 노드 생성과 앞 삽입을 구현
public singly linked-list representation과 첫 construction operation을 추가한다. `ft_lstnew`는 node만 allocate하고 caller가 넘긴 content pointer를 복사하거나 free하지 않은 채 저장하며 `next`를 `NULL`로 초기화한다. 따라서 node ownership과 content ownership은 서로 분리된다.

front insertion은 새 node의 next를 기존 head에 연결한 뒤 caller의 head pointer를 새 node로 갱신한다. null list handle이나 null node는 no-op으로 처리하여 필요한 object가 없는 상태에서 partial link 변경이 일어나지 않게 한다.

## feat(list): 연결 리스트 크기와 마지막 노드를 조회
node 수와 마지막 node를 얻는 read-only traversal을 추가한다. 두 함수 모두 null head를 empty-list representation으로 취급하여 size는 0, last node는 없음으로 반환한다.

구현은 local pointer만 전진시키므로 link와 content를 변경하지 않는다. `ft_lstlast`는 현재 node의 `next == NULL`인 지점에서 멈추며, 이후 back insertion 코드가 append boundary를 찾는 하나의 authoritative 방식이 된다.

## feat(list): 연결 리스트 뒤 삽입을 구현
empty-list case를 포함하는 tail insertion을 추가한다. 유효한 node는 list가 비어 있으면 head가 되고, 그렇지 않으면 기존 last node의 `next`만 갱신한다. head와 중간 link는 그대로 유지된다.

`ft_lstlast`를 재사용하여 terminal node의 정의를 중앙화한다. front insertion과 마찬가지로 null handle과 null node는 no-op이다. 함수는 node를 linkage structure에 편입할 뿐, node content의 ownership을 가정하거나 content를 수정하지 않는다.

## test(list): 노드 생성과 삽입 불변식 검증
새로 allocated된 node가 정확한 content pointer를 유지하고 처음에는 detached 상태인지 확인한 뒤, front/back insertion을 조합하여 head identity, node order, terminal `NULL`, size, last-node query를 검증한다. empty-list behavior와 null content를 가진 node도 별도로 다룬다.

잘못된 insertion argument는 기존 list를 변경하지 않아야 한다. test는 stack-backed content는 건드리지 않고 node만 free하여, list helper가 node allocation을 소유하지만 explicit destructor가 주어지기 전까지 content lifetime은 caller가 관리한다는 API boundary를 다시 확인한다.

## feat(list): 연결 리스트 순회와 삭제 구현
callback을 통해 content ownership을 명시하는 traversal 및 destruction operation을 추가한다. `ft_lstdelone`은 caller의 destructor를 호출한 뒤 node를 free하고, `ft_lstclear`는 현재 node를 삭제하기 전에 successor를 저장하면서 caller의 head를 끝까지 전진시켜 최종적으로 `NULL`로 만든다.

non-null destructor를 요구하여 library가 opaque content의 해제 방식을 임의로 추측하지 않게 한다. iteration은 각 content pointer에 callback을 적용할 뿐 link나 storage는 변경하지 않는다. 이로써 structural node lifetime, caller-defined content lifetime, non-owning traversal을 서로 다른 계약으로 분리한다.

## test(list): 순회와 삭제 수명 검증
여러 node로 구성된 list에서 callback count, mutation order, destructor order를 추적한다. iteration은 linkage order대로 각 node를 정확히 한 번 방문해야 하고, clear는 각 content object를 한 번씩 destroy한 뒤 해당 node를 free하고 caller의 head를 `NULL`로 남겨야 한다.

single-node deletion과 null-argument path로 ownership precondition을 명확히 한다. 특히 destructor가 없으면 node와 stack-backed content를 모두 그대로 두어야 하며, ownership graph의 일부만 free하는 모호한 partial destruction을 허용하지 않는다.

## feat(list): 실패 시 정리되는 리스트 변환 구현
list mapping을 완전히 별개의 node chain을 구성하는 operation으로 추가한다. 각 source node마다 transformation callback이 mapped content를 만들고 새 node가 그 결과의 ownership을 받는다. tail을 유지하여 partial output을 다시 scan하지 않고 constant time에 append한다.

content가 생성된 뒤 node allocation이 실패하면 아직 연결되지 않은 해당 content를 즉시 destroy하고, 이미 만든 mapped list 전체도 같은 destructor로 clear한다. source list는 절대 변경하지 않는다. 이로써 all-or-nothing ownership transfer를 확립한다. 성공하면 완전히 독립적인 chain을 반환하고, 실패하면 mapped node나 mapped content를 하나도 live 상태로 남기지 않는다.

## test(list): 리스트 변환과 content 수명 검증
source list를 새로 allocated된 content와 node로 mapping한 뒤 value transformation, order 보존, structural independence, content independence, source 미변경을 검증한다. mapped result를 clear할 때는 각 mapped node마다 destructor가 정확히 한 번 호출되어야 한다.

callback이 `NULL` content를 반환하는 것은 암묵적인 allocation failure가 아니라 유효한 mapped value로 취급한다. 이를 통해 callback semantics와 node-allocation failure를 구분한다. null callback/destructor input과 empty source로 나머지 boundary behavior를 정의하고, source chain은 stack-backed content를 destroy하지 않은 채 별도로 release한다.

## fix(string): callback 순회의 진행 인덱스를 확장
내부 traversal counter를 `size_t`로 변경하여 `ft_strlen`과 allocated object size와 동일한 범위를 사용한다. 이전 `unsigned int` counter는 길이가 `UINT_MAX`보다 큰 문자열에서 끝까지 도달하기 전에 wrap할 수 있었고, callback API 자체는 `unsigned int` index만 받더라도 반복 access나 nonterminating traversal이 생길 수 있었다.

callback으로 전달할 때만 index를 convert한다. public signature는 그대로 유지하면서 pointer arithmetic, loop termination, terminator placement를 올바른 object-size domain에서 처리한다.

## refactor(io): 숫자 출력을 자릿수 helper로 분리
signed-decimal 출력을 sign 처리와 재귀적인 unsigned-digit emitter로 분리한다. unsigned `INT_MIN` magnitude 기법은 유지하면서 각 digit이 다른 곳에서도 사용하는 동일한 character-output primitive를 거치도록 한다.

private fixed-size decimal buffer를 제거하고 byte emission을 하나의 descriptor-writing path 뒤로 모은다. 이를 통해 이후 short-write 및 interruption handling을 number output도 그대로 상속할 준비를 한다. 대신 여러 번의 1바이트 write가 발생하지만, 이 public helper에서는 throughput보다 일관된 completion policy를 우선하므로 허용 가능한 trade-off다.
