# 프로젝트 중요도 프로필

프로젝트: C Foundation (`libft`)  
분야: C99 기반 정적 라이브러리 및 low-level API 구현  
주요 목적: 43개의 문자, 메모리, 문자열, 변환, 할당, file-descriptor, singly linked-list API를 `libft.a`로 재구현하고, 범위·정수 산술·ownership·부분 실패·callback·release artifact에 대한 명시적인 계약을 제공한다.  
확정된 커밋 범위: `c/libft`의 독립적인 전체 선형 ancestry로, root `7e18e418c119`부터 tip `582af6929a21`까지 총 54개 커밋으로 구성된다. 관련 없는 상위 ancestry를 상속하지 않으며 merge commit도 없다. 커밋은 오래된 순서부터 최신 순서까지 분류했고, 범위 내에서 12자리 축약 SHA는 모두 유일하다.

## 핵심 기술 영역

- locale과 독립적인 ASCII 문자 판별 및 대소문자 변환.
- byte range 채우기, 복사, overlap-safe 이동, 검색, 비교.
- NUL 종료 문자열의 capacity 관리, 범위 제한 검색, 생성, callback 순회.
- 파싱, formatting, allocation size에서 signed/unsigned 정수 domain을 고려한 산술.
- 단일 allocation과 multi-allocation rollback을 포함한 heap 소유권.
- 단일 연결 리스트 구조, callback으로 정의되는 content lifetime, mapping failure cleanup.
- short write, `EINTR`, zero progress, permanent error를 처리하는 POSIX file-descriptor 출력.
- static archive 구성, 공개 API, external dependency, consumer linkage, compiler 호환성, sanitizer 기반 검증.

## 핵심 아키텍처

- `libft.h`가 API와 `t_list`의 유일한 public 기준이며, 구현은 `src/` 아래의 작은 responsibility-specific translation unit으로 나뉜다.
- `libft.a`가 distribution boundary다. build는 생성된 dependency를 기록하고 이후 archive member, global symbol, external undefined symbol, out-of-tree consumer를 검증한다.
- 더 단순한 primitive를 더 강한 operation이 재사용한다. `ft_bzero`는 byte filling에 위임하고, non-overlapping copy는 overlap-safe movement와 분리하며, list mapping은 이미 확립된 list-clear lifecycle을 사용한다.
- pointer-returning API는 서로 다른 ownership category를 가진다. borrowed address, 하나의 새 allocation, multi-allocation root, 또는 opaque `content`의 lifetime을 caller가 계속 정의하는 node가 있다.
- 검증은 계층화되어 있다. libc differential/boundary test, 결정론적 `malloc`/`write` failure injection, sanitizer build, host leak check, compiler-matrix build, release-artifact inspection을 각각 수행한다.

## 핵심 불변식

- length-bounded memory operation은 지정된 유효 byte range만 access한다. zero-length operation은 아무 access도 하지 않으며, overlapping movement는 이후 copy에 필요한 모든 source byte를 보존한다.
- allocation size arithmetic은 multiplication/addition 전에 검증하여 wrap된 크기가 `malloc`에 전달되지 않게 한다.
- multi-allocation constructor는 완전한 결과를 반환하거나 partial result에서 획득한 모든 resource를 release한다. 일부만 소유한 root가 실패 시 외부로 나가서는 안 된다.
- list node와 list content는 서로 다른 lifetime을 가진다. content destructor는 caller가 지정한 정책에 따라 정확히 호출되며, cleanup이 끝나면 caller의 head는 `NULL`이어야 한다.
- file-descriptor output은 양수의 short write마다 진행 상태를 갱신하고, `EINTR`는 재시도하며, zero progress를 실패로 취급하고, permanent error 뒤에는 composite output을 중단한다.
- archive는 의도한 translation unit과 public symbol만 포함하고 repository 밖에서도 link되며, 명시적으로 허용한 runtime function에만 의존한다.
- 재구현한 libc-style 함수의 test 결과가 compiler builtin substitution 때문에 무효화되어서는 안 된다.

## 주요 구현 난점

- `size_t`, `unsigned int`, signed `int`, platform-dependent integer width 사이에서 overflow, wraparound, undefined negation 없이 올바른 산술을 유지하는 것.
- non-overlap copy의 더 약한 precondition과 overlapping range에서 traversal direction에 따라 달라지는 동작을 구분하는 것.
- `ft_split`의 중첩 allocation과 `ft_lstmap`의 callback에서 생성된 node/content pair를 실패 시 rollback하는 것.
- 오류 status를 반환할 수 없는 public `void` descriptor API 안에서 short system call 뒤의 progress를 보존하는 것.
- production API를 바꾸지 않고 allocation/write failure를 결정론적으로 재현하는 것.
- Darwin과 Linux 모두에서 archive symbol을 충분히 portable하게 검사하고, 동일한 source를 Clang과 GNU GCC에서 검증하는 것.

## 실무적 엔지니어링 영역

- byte range underrun/overrun 탐지를 위한 guard region 및 전체 buffer 비교.
- 표준이 보장하는 속성만 비교하는 libc differential testing. 예를 들어 `memcmp`의 정확한 magnitude가 아니라 sign을 비교한다.
- 모든 allocation 위치에서 explicit ownership cleanup과 rollback을 검증한다.
- `EINTR`, `EPIPE`, 0바이트 write, invalid descriptor, allocation exhaustion에 대한 error-path test.
- low-level reimplementation을 정확하게 검증하기 위한 strict warning, language, builtin policy.
- 검증 범위가 명확히 분리된 sanitizer, leak checker, compiler, archive, clean-rebuild check.

## S 등급 기준

- multi-resource result가 성공 시 완전하고 실패 시 전부 rollback되는 project-defining ownership transaction을 확립한다.
- 모든 file-descriptor output이 공유하는 system-call progress/termination invariant를 확립하거나 복원한다.
- 완성된 library의 핵심 correctness 또는 failure story를 설명하는 데 빠질 수 없는 cross-cutting architectural decision을 만든다.

## A 등급 기준

- core API에서 중요한 overlap, overflow, portability, callback lifetime, partial-failure 위험을 해결한다.
- 중요한 node/content ownership boundary를 확립하거나 callback-produced resource까지 rollback을 안전하게 확장한다.
- 어려운 failure path에 대해 결정론적 근거를 추가하거나 archive/compiler boundary를 보호하여 deliverable에 대한 신뢰도를 실질적으로 높인다.
- 실패 시 wraparound, nontermination, invalid access, undefined behavior를 일으킬 수 있는 작은 root-cause 문제를 수정한다.

## 일반적인 B 등급 작업

- 이미 확립된 header, translation-unit, ownership, build 구조 안에서 예상되는 API를 구현한다.
- mechanism이 이미 정의된 동작에 ordinary boundary, differential, ownership test를 추가한다.
- 기존 range, allocation, linkage, formatting pattern을 다른 함수에 적용한다.
- major invariant를 확립하지는 않지만 이를 지원하는 local refactor 또는 verification을 추가한다.

## 일반적인 C 등급 작업

- 문서만 변경하는 커밋.
- 동작 영향이 거의 없는 semantically equivalent wording 또는 arithmetic cleanup.
- library의 mechanism, invariant, release boundary 이해에 거의 기여하지 않는 minor maintenance.

## 프로젝트 전용 태그

BYTE_RANGE — 명시적인 byte interval, copy overlap, search bound, object representation의 정확성.  
SIZE_ARITH — capacity, length, allocation size, signed/unsigned 범위 산술.  
OWNERSHIP — heap 소유권, 정리 순서, multi-allocation 롤백, callback에서 생성된 resource.  
LIST_LIFECYCLE — 단일 연결 리스트 구조와 node/opaque content의 분리된 lifetime.  
FD_OUTPUT — POSIX descriptor 출력, 진행 상태, interruption, permanent failure, 바이트 수 집계.  
RELEASE — public header, 아카이브 member, 심볼, 의존성, 외부 consumer, compiler 호환성.  
VERIFY — 전반적인 differential test, failure injection, sanitizer, leak, build 검증.

# 커밋 분류

| 커밋 | 제목 | 중요도 | 태그 | 요약 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `7e18e418c119` | `docs(readme): 프로젝트 목표와 초기 규약을 기록` | C | - | 프로젝트 목표와 초기 개발 규칙을 기록한다. | documentation-only root 작업으로 맥락은 제공하지만 구현된 mechanism이나 검증된 invariant는 없다. |
| `647f57dd08d5` | `feat(char): ASCII 문자 판별과 대소문자 변환 구현` | B | CORE | ASCII character API, public header, static-library build를 도입한다. | 필수 foundational implementation이지만 range check와 composition은 초기 설계 안의 명확한 contract를 그대로 따른다. |
| `bd92a25dc8c1` | `test(char): ASCII 문자 동작을 libc와 비교` | B | TEST, VERIFY | 재사용 가능한 test harness와 differential character test를 추가한다. | broad ordinary coverage와 boolean-result contract를 확립하지만 project-defining mechanism보다 비교적 단순한 subsystem을 검증한다. |
| `27dce86a9237` | `feat(memory): 메모리 채우기와 0 초기화 구현` | B | BYTE_RANGE, CORE | 명시적 length에 따른 byte filling과 zeroing을 구현한다. | byte-oriented representation과 primitive 재사용은 적절하지만 library의 기존 API model 안에서 수행한 일반적인 구현이다. |
| `1bbc7e019193` | `test(memory): 메모리 채우기 범위 검증` | B | BYTE_RANGE, TEST | fill 결과, guard, 반환값, zero-length access를 검사한다. | guard-region test로 정확한 write bound를 보호하지만 이미 명확한 memory contract에 대한 일반적인 검증이다. |
| `4873fb11ac60` | `feat(memory): 겹치지 않는 메모리 복사 구현` | B | BYTE_RANGE, CORE | non-overlapping byte-copy primitive를 추가한다. | 약한 copy contract를 이후 move semantics와 분리하는 것은 유용하지만 구현 자체는 일반적인 foundational work다. |
| `640dc585c85a` | `test(memory): 메모리 복사 경계 검증` | B | BYTE_RANGE, TEST | copy bound, source 보존, return identity를 검증한다. | 새로운 architecture나 어려운 failure guarantee를 만들기보다 예상되는 primitive contract를 보호한다. |
| `f2c4c042b339` | `feat(memory): 겹치는 메모리의 안전한 이동 구현` | A | BYTE_RANGE, CORE, RISK | 안전한 traversal direction을 선택해 overlap-safe movement를 구현한다. | correctness는 forward copy가 아직 읽지 않은 source byte를 파괴하는 경우를 정확히 인식하는 데 달려 있다. 중요한 memory invariant지만 subsystem 전반을 정의하는 project-level mechanism은 아니다. |
| `69853cd4d3ce` | `test(memory): 겹치는 메모리 이동 검증` | B | BYTE_RANGE, TEST | 두 overlap 방향과 disjoint move를 libc와 비교한다. | 두 traversal direction을 모두 다루어 구현을 실질적으로 보호하지만 새로운 engineering boundary를 추가하기보다 기존 move contract를 검증한다. |
| `37b6bfc7cad2` | `feat(memory): 범위를 제한한 메모리 검색과 비교 추가` | B | BYTE_RANGE, CORE | bounded byte search와 unsigned-byte comparison을 추가한다. | unsigned ordering과 strict length bound는 중요하지만 잘 정의된 byte primitive의 일반적인 구현이다. |
| `37359b42b504` | `test(memory): 메모리 검색과 비교 검증` | B | BYTE_RANGE, TEST | embedded zero, high-bit byte, sign-only comparison을 검사한다. | 충분한 boundary verification이지만 주요 project-level decision은 아니다. |
| `531dd5d21142` | `feat(string): 문자열 길이 계산과 제한 복사·붙이기 추가` | B | SIZE_ARITH, CORE | length와 capacity-bounded string copy/concatenation을 도입한다. | capacity-aware terminator placement와 returned source-length accounting은 중요하지만 기존 구조 안에서 예상되는 string contract를 구현한 작업이다. |
| `bca8f9784a5c` | `test(string): 문자열 길이와 capacity 경계 검증` | B | SIZE_ARITH, TEST | length, truncation, capacity, guard byte를 검사한다. | 일반적인 off-by-one regression을 막지만 프로젝트 architecture 자체를 형성하지는 않는다. |
| `ef4ddf9fac29` | `feat(string): 문자의 첫·마지막 위치 검색을 추가` | B | CORE | first/last occurrence string search를 추가한다. | project-specific 판단이 적은 필수 API coverage다. |
| `cbeebf29df0e` | `feat(string): 범위 비교와 부분 문자열 검색을 추가` | B | BYTE_RANGE, CORE | bounded string comparison과 bounded substring search를 추가한다. | 제공된 search limit과 unsigned ordering을 보존하지만 기존 string semantics 아래의 일반적인 구현이다. |
| `05f2bd9da873` | `test(string): 문자열 검색과 비교 경계 검증` | B | EDGE, TEST | empty needle, bounded prefix, comparison edge를 다룬다. | edge behavior를 유용하게 고정하지만 새로운 mechanism을 추가하지는 않는다. |
| `080472b6080d` | `feat(convert): 표현 가능한 10진수 정수 해석` | A | SIZE_ARITH, EDGE, RISK | unsigned accumulation과 signed limit을 이용해 decimal text를 parse한다. | multiplication 전 limit check와 비대칭 INT_MIN bound로 overflow를 피하면서 saturation behavior를 정의한다. 중요한 arithmetic 판단이지만 한 conversion API에 국한된다. |
| `9d21ee17438a` | `test(convert): 정수 해석 경계 검증` | B | EDGE, TEST | whitespace, sign, digit boundary, saturation을 검사한다. | conversion의 boundary policy를 검증하지만 독립적으로 그 policy를 확립하는 작업은 아니다. |
| `3b1b30983876` | `feat(alloc): 0 초기화 메모리와 문자열 복제 추가` | A | SIZE_ARITH, OWNERSHIP, RISK | overflow-checked zeroed allocation과 owned string duplication을 추가한다. | multiplication wrap을 allocation 전에 막아 이후 multi-object builder가 사용하는 foundational allocation-size invariant를 확립한다. 중요하지만 이것만으로 프로젝트 전체를 정의하지는 않는다. |
| `032aed4013af` | `test(alloc): 할당과 문자열 복제 계약 검증` | B | OWNERSHIP, TEST | zero initialization, duplication, allocation ownership을 검증한다. | 일반적인 contract coverage이며 deterministic failure semantics는 이후에 확립된다. |
| `6d076de7185e` | `feat(string): 부분 문자열 생성을 구현` | B | OWNERSHIP, SIZE_ARITH | bounded copy를 사용하는 allocation-backed substring extraction을 추가한다. | 기존 allocation/range pattern을 적용한 함수로 새로운 ownership model을 도입하지 않는다. |
| `644b1c65444c` | `feat(string): 문자열 결합을 구현` | B | OWNERSHIP, SIZE_ARITH | 두 문자열을 checked allocation으로 결합한다. | addition-limit 처리는 중요하지만 기존 ownership contract를 따르는 single-allocation builder다. |
| `b434b6944e9d` | `feat(string): 양끝 문자 집합 제거를 구현` | B | OWNERSHIP, CORE | caller-provided set 기반 allocation-backed trimming을 추가한다. | edge handling은 유용하지만 일반적인 string-building feature다. |
| `04df67512df4` | `test(string): 문자열 생성과 소유권 검증` | B | OWNERSHIP, TEST | substring, join, trim, allocation, source 보존을 검사한다. | 예상되는 ownership/boundary behavior를 검증하지만 어려운 partial-failure path는 다루지 않는다. |
| `8c0a35a50878` | `feat(string): 실패 시 정리되는 문자열 분리 구현` | S | OWNERSHIP, CORE, RISK | field allocation 어느 지점에서 실패해도 완전히 rollback되는 split result를 만든다. | 프로젝트에서 처음 등장하는 multi-allocation transaction이다. 성공하면 complete root를 공개하고, 실패하면 acquired child와 root를 모두 release한다. 이를 빼면 library ownership/failure story에 큰 공백이 생긴다. |
| `01360ba43b01` | `test(string): 문자열 분리 결과 검증` | B | OWNERSHIP, TEST | delimiter pattern, empty input, result ownership을 검사한다. | 성공한 layout을 검증하지만 exhaustive allocation-failure proof는 이후에 추가되므로 일반적인 coverage다. |
| `1381c0226abf` | `feat(convert): 부호 있는 정수의 문자열 변환 구현` | A | SIZE_ARITH, EDGE, OWNERSHIP | INT_MIN을 negate하지 않고 모든 int를 새로 allocated된 decimal text로 변환한다. | unsigned-domain magnitude로 실제 undefined-behavior boundary를 보호하고 allocation size도 정확히 맞춘다. 중요한 결정이지만 한 converter에 국한된다. |
| `9abf71572a9e` | `test(convert): 정수 문자열 변환 검증` | B | EDGE, TEST | signed endpoint와 digit-count transition을 다룬다. | 기존 conversion algorithm과 ownership contract를 검증하며 새 mechanism을 도입하지 않는다. |
| `51cce7699289` | `feat(string): 인덱스를 사용하는 문자열 변환 추가` | B | OWNERSHIP, CORE | allocating 및 in-place callback string traversal을 추가한다. | 초기 length를 저장해 traversal semantics를 명확히 하지만 public API 내부의 일반적인 feature 작업이다. |
| `ca446a9ba82f` | `test(string): callback 문자열 변환 검증` | B | TEST, EDGE | callback order, source 보존, mutation, fixed traversal length를 검사한다. | 미묘한 callback behavior를 보호하지만 project-wide invariant가 아니라 기존 local contract를 검증한다. |

| `26509fd54c3d` | `feat(io): 파일 디스크립터 출력 함수 추가` | B | FD_OUTPUT, CORE | void를 반환하는 character, string, newline, integer descriptor output을 추가한다. | 초기 API를 확립하지만 short-write와 interruption 동작은 여전히 버린다. defining reliability decision은 이후에 내려진다. |
| `60c35f2fb431` | `test(io): 파일 디스크립터 출력 검증` | B | FD_OUTPUT, TEST | normal output을 capture하고 invalid-descriptor 및 broken-pipe 동작을 관찰한다. | 초기 observable policy는 확립하지만 partial system call 뒤의 completion까지 증명하지는 않는다. |
| `b813d61d31fc` | `feat(list): 연결 리스트 노드 생성과 앞 삽입을 구현` | B | LIST_LIFECYCLE, OWNERSHIP | borrowed content pointer를 사용하는 list node와 front insertion을 도입한다. | node allocation과 content ownership을 분리하는 것은 필요하지만, 이 커밋은 비교적 단순한 base representation을 구현한다. |
| `4e2ed2daae98` | `feat(list): 연결 리스트 크기와 마지막 노드를 조회` | B | LIST_LIFECYCLE | list를 변경하지 않는 size와 tail query를 추가한다. | 이미 확립된 node model 안의 일반적인 traversal이다. |
| `970e8d42af0f` | `feat(list): 연결 리스트 뒤 삽입을 구현` | B | LIST_LIFECYCLE | empty-list case를 포함한 tail insertion을 추가한다. | 필요한 구현이지만 새로운 lifecycle reasoning 없이 기존 linkage pattern을 적용한다. |
| `aad656e4f6c5` | `test(list): 노드 생성과 삽입 불변식 검증` | B | LIST_LIFECYCLE, TEST | node identity, ordering, terminal link, invalid argument를 검사한다. | 일반적인 structural invariant는 보호하지만 content destruction이나 rollback은 아직 다루지 않는다. |
| `7a016ad8fd21` | `feat(list): 연결 리스트 순회와 삭제 구현` | A | LIST_LIFECYCLE, OWNERSHIP, RISK | callback 기반 iteration, node deletion, complete list clearing을 추가한다. | structural node lifetime과 caller-defined content lifetime 사이의 핵심 경계를 확립한다. 이후 rollback에서도 사용하는 중요한 lifecycle engineering이지만 프로젝트의 S 등급 mechanism보다는 범위가 좁다. |
| `330fc6efb45c` | `test(list): 순회와 삭제 수명 검증` | B | LIST_LIFECYCLE, TEST | callback order, 정확한 destruction, null-destructor no-op을 검증한다. | 중요한 근거지만 lifecycle contract를 직접 검증하는 수준이다. |
| `6672ea67fae4` | `feat(list): 실패 시 정리되는 리스트 변환 구현` | A | LIST_LIFECYCLE, OWNERSHIP, RISK | 독립 list로 mapping하고 실패 시 mapped content와 node를 rollback한다. | callback-produced resource에 all-or-nothing ownership을 적용하면서 source list를 보존한다. 중요한 lifecycle decision이지만 두 번째 S 등급 개념을 새로 정의하기보다 split에서 처음 확립한 rollback model을 확장한다. |
| `68332cbaddaa` | `test(list): 리스트 변환과 content 수명 검증` | B | LIST_LIFECYCLE, TEST | structural independence, content ownership, order, null mapped value를 검사한다. | 일반적인 contract evidence를 제공하며 deterministic node-allocation failure는 이후에 다룬다. |
| `bce818ac8ff4` | `fix(string): callback 순회의 진행 인덱스를 확장` | A | SIZE_ARITH, EDGE, DEBUG | traversal state를 size_t로 옮기고 callback boundary에서만 narrow한다. | UINT_MAX보다 큰 object에서 발생할 수 있는 비명시적 wraparound와 nontermination을 제거한다. 작은 수정이지만 loop의 object-size invariant를 복원하는 중요한 correction이다. |
| `1077556d1c4b` | `refactor(io): 숫자 출력을 자릿수 helper로 분리` | B | FD_OUTPUT, REFACTOR | integer digit을 common character-output primitive로 전달한다. | cohesion을 높이고 이후 retry propagation을 준비하지만 behavior와 public reliability guarantee는 아직 바뀌지 않는다. |
| `3f2bfbf11e1f` | `fix(io): 파일 디스크립터 출력을 끝까지 재시도` | S | FD_OUTPUT, CORE, RISK | short write, EINTR, zero progress, hard error를 처리하는 write-all loop를 도입한다. | 성공한 progress를 보존하고 남은 byte를 재시도하며 permanent failure 시 composite output을 중단하는 defining system-call invariant를 복원한다. 최종 reliability story는 이 커밋 없이 설명할 수 없다. |
| `b013c926ceb5` | `test(io): 부분 쓰기와 EINTR 이후 진행을 검증` | A | FD_OUTPUT, TEST, RISK | partial progress, interruption, zero, permanent error를 위한 deterministic write script를 추가한다. | injected system-call boundary로 S 등급 completion policy와 error-stop behavior를 실질적으로 증명한다. 일반적인 pipe test로는 보장할 수 없는 근거를 제공한다. |
| `cc1e59911bd8` | `refactor(string): 결합 문자열의 할당 한계를 명시` | C | SIZE_ARITH, REFACTOR | 기존 strjoin overflow bound를 더 명시적인 형태로 다시 작성한다. | 식은 semantically equivalent하며 readability만 개선한다. 새로운 behavioral/structural significance는 거의 없다. |
| `4df8b23505b8` | `build(flags): C99 경고와 builtin 정책을 고정` | A | RELEASE, VERIFY, RISK | strict C99 warning을 고정하고 compiler builtin을 비활성화하며 bonus target을 노출한다. | libc reimplementation에서 builtin 비활성화는 compiler가 test 대상 함수를 몰래 대체하지 못하게 하므로 중요하다. build policy가 library 전체의 evidence를 실질적으로 강화한다. |
| `fd3ae063139d` | `test(alloc): 할당 실패와 rollback을 검증` | A | OWNERSHIP, TEST, RISK | malloc failure를 주입하고 builder 전반의 leak과 invalid free를 추적한다. | split과 list mapping의 모든 allocation 위치에서 rollback을 code inspection이 아닌 결정론적 근거로 바꾼다. core project invariant에 대한 신뢰를 크게 높이지만 invariant 자체를 만드는 대신 검증하는 작업이다. |
| `79c0dcefb590` | `test(release): archive와 consumer 경계를 검증` | A | RELEASE, ARCH, VERIFY | archive member, exported API, external dependency, out-of-tree linking을 검사한다. | deliverable을 단순히 compile 가능한 source 이상으로 정의한다. archive 구성과 consumer-visible boundary가 재현 가능한 contract가 된다. core runtime behavior는 아니지만 중요한 release engineering이다. |
| `f5de4306ebcd` | `test(sanitize): undefined behavior 검사를 추가` | B | VERIFY, TEST | UBSan 전용 object와 execution target을 추가한다. | defect detection 범위를 넓히지만 project architecture를 바꾸지 않는 표준 verification technique이다. |
| `c625970fd211` | `test(sanitize): address sanitizer 검사를 추가` | B | VERIFY, TEST | ASan 전용 build와 runtime check를 추가한다. | 유용한 memory-safety coverage지만 일반적인 validation infrastructure이며 의도적으로 leak test를 대체하지 않는다. |
| `9f555c37a6d8` | `test(leak): host 누수 검사 경로를 추가` | B | VERIFY, TEST | leaks 또는 Valgrind를 통한 host leak checking을 추가한다. | practical ownership verification은 강화하지만 새로운 project-specific mechanism은 도입하지 않는다. |
| `e31a2e748685` | `test(build): Clang과 GCC 호환성을 검증` | A | RELEASE, VERIFY | Clang과 GNU GCC에서 각각 clean copy로 전체 suite를 실행한다. | low-level C library에서는 독립적인 compiler 검증이 build, failure, archive check 전반의 extension/builtin assumption을 드러낸다. runtime architecture는 아니지만 중요한 compatibility evidence다. |
| `b90fd748255a` | `test(release): 전체 검증 절차를 연결` | B | RELEASE, VERIFY | clean build, functional/failure/sanitizer/archive/compiler/leak/no-op rebuild check를 하나로 조율한다. | 기존 evidence를 하나의 재현 가능한 sequence로 만들지만 새로운 guarantee를 추가하기보다 이미 있는 mechanism을 조합하는 성격이 크다. |
| `582af6929a21` | `docs(project): 프로젝트 문서 정리` | C | - | 완성된 API, ownership rule, architecture, verification limit을 문서화한다. | 광범위하고 정확한 맥락을 제공하지만 documentation-only이며 구현된 behavior나 verification machinery를 변경하지 않는다. |

# 개발 흐름

## 흐름: 겹치지 않는 복사와 overlap-safe 이동의 분리

`4873fb11ac60` B — caller가 non-overlapping range를 보장하는 primitive로 `ft_memcpy`를 확립한다.  
↓  
`f2c4c042b339` A — destination overlap이 아직 읽지 않은 source byte를 파괴하지 않도록 direction-sensitive movement를 추가한다.  
↓  
`69853cd4d3ce` B — 동일 위치, forward overlap, backward overlap, disjoint case를 차등 테스트로 검증한다.

**의의**

이 흐름은 모든 copy 내부에 overlap handling을 숨기지 않고 precondition boundary를 명확히 만든다. 더 강한 operation은 필요한 곳에만 구현하고, range 배치에 따라 안전한 traversal direction이 달라지므로 test는 가능한 overlap 방향을 모두 다룬다.

## 흐름: 단일 allocation에서 rollback-safe ownership으로

`3b1b30983876` A — overflow를 검사한 allocation size와 caller가 소유하는 기본 allocation contract를 확립한다.  
↓  
`6d076de7185e` B — 정확히 크기를 맞춘 substring result에 이 contract를 적용한다.  
↓  
`644b1c65444c` B — joined string으로 checked addition을 확장한다.  
↓  
`8c0a35a50878` S — 일부 child만 생성된 상태에서 실패하면 모두 release하는 multi-allocation root를 도입한다.  
↓  
`7a016ad8fd21` A — list node의 lifetime과 callback이 정의하는 content lifetime을 분리하고 전체 clear 연산을 제공한다.  
↓  
`6672ea67fae4` A — callback이 생성한 content와 새로 allocation한 list node에 all-or-nothing ownership을 적용한다.  
↓  
`fd3ae063139d` A — 모든 allocation 위치에 failure를 주입하고 leak과 invalid free를 측정한다.

**의의**

ownership model은 하나의 반환 allocation에서 nested object graph로 확장된다. `ft_split`이 complete-or-rollback 규칙을 결정적으로 확립하고, list lifecycle callback이 opaque caller data까지 ownership을 일반화하며, `ft_lstmap`이 두 concern을 결합한다. 최종 failure harness는 cleanup이 성공 예시뿐 아니라 모든 중간 acquisition 지점에서도 유지됨을 증명한다.

## 흐름: 부분 완료 system call에 대응하는 file-descriptor 출력

`26509fd54c3d` B — one-shot write를 사용하는 초기 void-returning descriptor API를 추가한다.  
↓  
`60c35f2fb431` B — normal byte를 capture하고 초기 invalid-descriptor/broken-pipe 동작을 확립한다.  
↓  
`1077556d1c4b` B — integer digit을 공통 character-output path로 전달한다.  
↓  
`3f2bfbf11e1f` S — write-until-complete 동작, `EINTR` retry, zero-progress 거부, permanent-error 중단을 도입한다.  
↓  
`b013c926ceb5` A — 비결정적인 operating-system timing 대신 scripted write result로 정확한 retry sequence를 검증한다.

**의의**

초기 public API는 status를 반환할 수 없으므로 reliability는 내부에서 강제해야 하며, 실패하면 이후 composite output을 중단해야 한다. 이 흐름은 formatting correctness에서 system-call progress invariant로 발전하고, 마지막에는 결정론적 `write` 대체 함수로 해당 invariant를 증명한다.

## 흐름: static archive를 검증된 release artifact로 취급

`4df8b23505b8` A — C99 warning을 고정하고 compiler builtin substitution을 비활성화한다.  
↓  
`79c0dcefb590` A — archive member, public definition, 허용된 external dependency, out-of-tree consumer를 검증한다.  
↓  
`f5de4306ebcd` B — undefined-behavior sanitizer 실행을 추가한다.  
↓  
`c625970fd211` B — address-sanitizer 실행을 추가한다.  
↓  
`9f555c37a6d8` B — host leak checking을 추가한다.  
↓  
`e31a2e748685` A — clean copy에서 Clang과 GNU GCC 양쪽으로 전체 release-oriented suite를 실행한다.  
↓  
`b90fd748255a` B — clean build, functional/failure/sanitizer/archive/compiler/leak/no-op rebuild check를 연결한다.

**의의**

프로젝트는 성공적인 local compile만으로 충분한 근거라고 보지 않게 된다. compiler builtin을 배제하고 archive/consumer boundary를 직접 검사하며, 서로 다른 defect detector로 다른 failure class를 검증한다. 이어서 compiler family를 바꿔 동일한 evidence를 재현한 뒤 하나의 release check로 조율한다.

# 가장 중요한 커밋

## feat(memory): 겹치는 메모리의 안전한 이동 구현
커밋: `f2c4c042b339`  
중요도: A  
태그: BYTE_RANGE, CORE, RISK

### 문제

forward byte copy는 destination write가 아직 읽지 않은 source byte를 덮어쓰지 않는 경우에만 올바르다. 따라서 foundational memory library에는 overlapping range를 처리하기 위해 `ft_memcpy`보다 강한 operation이 필요하다.

### 결정

`ft_memmove`는 non-overlap primitive를 그대로 유지하고 destination이 source interval 내부에서 시작하는 경우를 감지한다. 이 경우 backward copy를 수행하고, same-position 및 zero-length operation은 즉시 반환하며, 나머지 case는 forward `ft_memcpy`를 재사용한다.

### 중요성

overlap이 단순한 optimization detail이 아니라 semantic boundary임을 확립한다. 더 단순한 copy contract를 약화하거나 복잡하게 만들지 않으면서 source information을 보존한다.

### 변경 사항

새 translation unit과 public declaration을 추가했고, range의 상대적 배치를 기준으로 movement algorithm의 traversal direction을 선택하도록 했다.

### 프로젝트 이해에 중요한 이유

익숙한 함수 이름을 단순히 재현하는 대신 valid byte range와 precondition에서 출발해 reasoning한 초기 사례를 가장 명확하게 보여 준다. 이 range discipline은 이후 bounded search, string capacity, failure-safe construction에서도 반복된다.

## feat(alloc): 0 초기화 메모리와 문자열 복제 추가
커밋: `3b1b30983876`  
중요도: A  
태그: SIZE_ARITH, OWNERSHIP, RISK

### 문제

`count * size`로 계산한 allocation request는 `size_t`에서 wrap할 수 있고, caller가 논리적으로 요청한 크기보다 작은 object가 allocate될 수 있다. 이 경우 `malloc` 자체가 성공하더라도 이후 initialization에서 allocated range를 벗어나게 된다.

### 결정

`ft_calloc`은 multiplication을 수행하기 전에 overflow를 검증하고, product가 0일 때는 구체적으로 1바이트를 allocate하며, 정확히 결과 object 전체를 0으로 초기화한다. `ft_strdup`도 terminator를 포함한 크기를 검사하고 caller-owned copy를 반환한다.

### 중요성

이후 string builder와 multi-allocation root가 사용하는 allocation arithmetic 및 ownership 기반을 확립한다. wrap된 allocation size를 막는 것은 이후 모든 byte-range guarantee의 선행 조건이다.

### 변경 사항

public allocation API와 implementation module을 추가하고, overflow 거부, 0 초기화, 정확한 string duplication, `NULL` failure return을 구현했다.

### 프로젝트 이해에 중요한 이유

library의 safety story는 너무 작은 object를 이미 획득한 뒤가 아니라 acquisition 이전에 size를 검증하는 데 기반한다. 이 커밋은 rollback-safe construction이 구축되는 primitive를 제공한다.

## feat(string): 실패 시 정리되는 문자열 분리 구현
커밋: `8c0a35a50878`  
중요도: S  
태그: OWNERSHIP, CORE, RISK

### 문제

문자열을 split하면 하나의 pointer array와 개수가 미리 정해지지 않은 여러 field allocation이 생성된다. 몇 개의 field allocation이 성공한 뒤 실패하면 안전하게 반환할 수 없는 partially owned object graph가 남으며, 이 resource가 leak되어서도 안 된다.

### 결정

구현은 field 수를 먼저 계산하고 null-terminated root array를 allocate한 뒤 각 field를 독립적으로 만든다. 이미 ownership을 획득한 개수를 추적하며, field allocation이 하나라도 실패하면 dedicated cleanup routine이 완성된 모든 field를 release한 뒤 root까지 free하고 `NULL`을 반환한다.

### 중요성

history에서 처음 등장하는 완전한 transaction-like ownership mechanism이다. 성공하면 complete result를 공개하고, 실패하면 아무 것도 공개하지 않으며 획득한 child를 하나도 live 상태로 남기지 않는다.

### 변경 사항

`ft_split`을 public API와 build에 추가하고, field counting, 정확한 field copy, partial result의 reverse cleanup을 구현했다.

### 프로젝트 이해에 중요한 이유

완성된 프로젝트는 정상적인 allocation 자체보다 rollback을 반복해서 강조한다. 이 커밋이 그 defining invariant를 확립하며, 이후 callback-produced list mapping까지 확장되는 model을 제공한다.

## feat(list): 실패 시 정리되는 리스트 변환 구현
커밋: `6672ea67fae4`  
중요도: A  
태그: LIST_LIFECYCLE, OWNERSHIP, RISK

### 문제

list mapping에서는 source node마다 두 번의 ownership event가 발생한다. callback이 mapped content를 만들고, library가 그 content를 소유할 node를 allocate한다. node allocation이 실패하면 가장 최근 callback result뿐 아니라 이전에 만든 모든 node/content pair도 고립될 수 있다.

### 결정

mapper는 source를 변경하지 않고 maintained tail을 통해 새 node를 append한다. node 생성이 실패하면 아직 연결되지 않은 callback result를 즉시 destroy하고, 이미 만든 partial mapped list 전체를 caller의 destructor로 clear한다.

### 중요성

known array of strings에 적용하던 rollback을 opaque callback-produced resource로 일반화한다. 또한 앞서 확립한 node lifetime과 content lifetime의 분리에 의존하므로, list API의 destructor contract가 고립된 helper가 아니라 architectural dependency임을 보여 준다.

### 변경 사항

`ft_lstmap`을 3개 인자로 구성된 ownership contract 및 all-or-nothing failure path와 함께 추가했다.

### 프로젝트 이해에 중요한 이유

이 커밋은 callback API가 content type을 알지 못하면서도 responsibility를 어떻게 이전하는지 보여 준다. `del`이 필수인 이유와 partial list result가 외부로 절대 빠져나가지 않는 이유를 이해하는 데 핵심적이다.

## fix(io): 파일 디스크립터 출력을 끝까지 재시도
커밋: `3f2bfbf11e1f`  
중요도: S  
태그: FD_OUTPUT, CORE, RISK

### 문제

POSIX `write`는 요청한 byte보다 적은 수를 성공적으로 처리할 수 있고, 진행하기 전에 `EINTR`로 실패할 수도 있다. 한 번의 호출을 완료로 간주하면 출력이 조용히 truncate되고, 모든 실패를 무조건 재시도하면 데이터를 중복 출력하거나 permanent error 뒤에 무한 loop에 빠질 수 있다.

### 결정

private `write_all` loop는 양수로 반환된 count만큼만 진행하고, 각 요청을 `SSIZE_MAX` 이하로 제한하며, `EINTR`만 재시도한다. zero progress는 `EIO`로 바꾸고 그 밖의 오류에서는 중단한다. composite newline 및 integer output도 앞선 component가 실패하면 더 이상 진행하지 않는다.

### 중요성

모든 descriptor helper가 공유하는 system-call progress invariant를 확립한다. public 함수가 status를 반환할 수 없으므로, failed prefix나 digit 뒤의 silent continuation을 막는 방법은 내부 completion과 stop-on-error 동작뿐이다.

### 변경 사항

모든 descriptor helper를 새 completion loop로 연결했고, recursive numeric output이 내부적으로 failure를 전파하도록 했으며, sign emission이 이후 digit 출력의 선행 조건이 되도록 했다.

### 프로젝트 이해에 중요한 이유

I/O layer를 단순히 `write`를 호출하는 formatting helper에서 POSIX partial-success semantics를 견고하게 처리하는 adapter로 바꾼다. 프로젝트를 정의하는 가장 명확한 failure mechanism 두 가지 중 하나다.

## test(alloc): 할당 실패와 rollback을 검증
커밋: `fd3ae063139d`  
중요도: A  
태그: OWNERSHIP, TEST, RISK

### 문제

normal test는 성공 결과가 올바르다는 점은 보여 줄 수 있지만, 모든 intermediate allocation failure에서 이미 획득한 resource를 정확히 release하는지는 증명할 수 없다. `ft_split`과 `ft_lstmap` 같은 nested constructor는 manual inspection만으로 failure semantics를 검증하기 특히 어렵다.

### 결정

test build에서 tracked `malloc`과 `free`로 대체하고, 실패시킬 allocation attempt를 선택하며, live object와 invalid free를 기록한다. constructor를 가능한 모든 failure 위치에 대해 반복 실행한다.

### 중요성

rollback invariant를 재현 가능한 evidence로 바꾼다. 단순히 `NULL`을 반환하는 함수와 leak, double free, invalid free, source mutation을 남기지 않는 함수를 구분한다.

### 변경 사항

single-allocation API, split의 모든 resource 획득 지점, mapped list의 각 node allocation을 대상으로 별도의 failure-instrumented object set, allocator support module, failure suite를 추가했다.

### 프로젝트 이해에 중요한 이유

어려운 failure behavior를 happy-path test나 sanitizer report 부재로 추론하지 않고, 결정론적으로 강제한 뒤 직접 측정하는 프로젝트의 verification philosophy를 보여 준다.

## test(release): archive와 consumer 경계를 검증
커밋: `79c0dcefb590`  
중요도: A  
태그: RELEASE, ARCH, VERIFY

### 문제

in-tree test를 통과했다는 사실만으로 `libft.a`가 의도한 object member를 포함하는지, 의도한 public symbol만 노출하는지, accidental external dependency가 없는지, 문서화된 header와 archive만 가진 consumer가 link할 수 있는지 보장할 수 없다.

### 결정

release check는 archive member 및 normalize된 symbol set을 explicit manifest와 비교하고, platform-aware한 소수의 undefined-symbol set만 허용한다. 이어서 source tree 밖의 임시 directory에서 consumer를 compile하고 실행한다.

### 중요성

deliverable이 Makefile의 우연한 부산물이 아니라 검증된 binary interface가 된다. accidental global helper, missing object, 예상하지 못한 runtime call, 숨겨진 in-tree include/path dependency를 찾아낸다.

### 변경 사항

archive, API, allowed-dependency manifest, Darwin/Linux symbol-inspection script, external smoke consumer, Make target을 추가했다.

### 프로젝트 이해에 중요한 이유

최종 프로젝트는 static library이므로 correctness에는 downstream code가 바라보는 artifact의 형태까지 포함된다. 이 커밋은 implementation boundary를 `libft.h`에 선언하는 데 그치지 않고 compilation 이후에도 어떻게 강제하는지 설명한다.
