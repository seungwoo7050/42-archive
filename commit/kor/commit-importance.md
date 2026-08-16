# 프로젝트 중요도 프로필

프로젝트: Format Printer (`ft_printf`)  
분야: C 가변 인자 formatted-output 정적 라이브러리  
주요 목적: 의도적으로 제한한 `printf` subset을 parse하고 `%c`, `%s`, `%p`, `%d`, `%i`, `%u`, `%x`, `%X`, `%`를 format하며, flag·width·precision을 적용해 file descriptor 1에 출력한다. 프로젝트의 실패 계약에 따라 정확한 `int` 바이트 수 또는 `-1`을 반환한다.  
확정된 커밋 범위: `c/ft_printf`의 독립적인 전체 선형 ancestry로, root `0ec80a6a8196`부터 tip `a35faa85cf41`까지 총 33개 커밋으로 구성된다. 관련 없는 상위 ancestry를 상속하지 않으며 merge commit도 없다. 커밋은 오래된 순서부터 최신 순서까지 분류했고, 범위 내에서 12자리 축약 SHA는 모두 유일하다.

## 핵심 기술 영역

- 플래그, 10진수 너비, 선택적 정밀도, 지원 변환 지정자로 구성되는 포맷 필드 문법.
- 가변 인자 순회, 정확한 promoted type, 독립적인 `va_list` 복사본.
- 파싱, 인자 추출, 렌더링, 레이아웃, 출력 사이의 conversion dispatch 및 책임 분리.
- 텍스트, 부호 있는 10진수, 부호 없는 10진수, 16진수, pointer, percent semantics.
- 접두사, 정밀도에 따른 0 채움, 0 값의 digit 생략, 필드 패딩, 왼쪽 정렬, 플래그 우선순위의 상호작용.
- POSIX `write` 진행, `EINTR`, 요청 크기 제한, byte-count overflow, zero progress, `EPIPE`, `SIGPIPE` 정책.
- 외부 효과가 발생하기 전에 잘못되었거나 표현할 수 없는 출력을 거부하는 whole-format preflight measurement.
- 차등 테스트, 고정 계약 검증, fault injection, release artifact, sanitizer 검증.

## 핵심 아키텍처

- `ft_printf`가 유일한 public 함수이며 parser, measurement, dispatch, layout, output helper는 모두 archive 내부에 private으로 유지된다.
- `t_printf`는 descriptor 상태, 누적 count, sticky error를 소유한다. 모든 conversion은 동일한 output path를 사용한다.
- `t_format`은 parser에서 measurement와 rendering으로 전달되는 정규화된 field representation이다.
- dispatch는 `va_arg` type 선택을 담당한다. conversion-specific module은 text 또는 digit을 생성하고, shared numeric layout module은 prefix/zero/padding 순서를 담당한다.
- 최종 진입점은 두 번 순회한다. `va_copy`를 사용한 measurement pass에서 grammar와 전체 길이를 검증한 뒤, original `va_list`가 동일한 format semantics로 실제 출력을 수행한다.
- release 검증은 9개 object로 구성된 archive, global definition, external runtime dependency, public header, out-of-tree consumer까지 product contract의 일부로 취급한다.

## 핵심 불변식

- 지원하지 않는 specifier, 끝나지 않은 field, field number overflow, `INT_MAX`를 초과하는 전체 결과는 아무 것도 출력하지 않고 `-1`을 반환한다.
- 시작하거나 복사한 모든 `va_list`는 독립적으로 순회하고 정확히 한 번 종료한다. measurement와 output은 호환되는 promoted type으로 argument를 소비한다.
- measurement와 rendering은 prefix, zero suppression, precision zero, field width를 포함해 각 conversion의 effective length에 대해 일치해야 한다.
- 누적 count는 `INT_MAX`를 넘어가도록 narrow되거나 overflow하지 않는다.
- 양수의 short write는 buffer를 전진시키고, `EINTR`는 재시도하며, 요청은 `SSIZE_MAX`를 초과하지 않는다. 재시도할 수 없는 결과나 zero-byte 결과는 오류와 함께 출력을 중단한다.
- numeric output은 decimal, hexadecimal, pointer conversion 전체에서 space, prefix, field zero, precision zero, digit, trailing space의 순서를 일관되게 유지한다.
- `%s`에 precision이 지정되면 그 제한보다 더 멀리 읽지 않는다. 읽을 수 있는 범위 뒤에 NUL terminator가 존재할 필요는 없다.
- 라이브러리는 process의 `SIGPIPE` disposition을 변경하지 않으며, operating system이 이미 받아들인 byte는 rollback할 수 없다.
- 빌드된 archive는 예상한 definition과 external dependency를 노출하고, public header만 보는 consumer가 link할 수 있어야 한다.

## 주요 구현 난점

- 정규화된 field grammar와 overflow 동작을 main loop, measurement, 모든 renderer에서 일관되게 유지하는 것.
- mutable traversal state를 공유하거나 호환되지 않는 `va_arg` type을 사용하지 않으면서 하나의 가변 인자 sequence를 두 번 소비하는 것.
- prefix 선택, zero precision, alternate form, zero padding, width, left alignment를 정확히 조합하는 것.
- device failure는 non-atomic이라는 점을 인정하면서도, 전체 output length를 미리 계산하고 늦게 나타나는 format 오류를 첫 write 이전에 거부하는 것.
- process 전체 signal policy를 소유하지 않으면서 partial write, interrupt, zero progress, `EPIPE`, `SIGPIPE`를 처리하는 것.
- `%s` precision이 단순한 output truncation 규칙에 그치지 않고 memory access 범위도 제한하도록 보장하는 것.
- system-call sequence를 결정론적으로 테스트하고, portable libc behavior와 formatted percent field 같은 명시적 project extension을 구분하는 것.

## 실무적 엔지니어링 영역

- libc 동작을 유효한 oracle로 사용할 수 있는 경우 `snprintf`와 바이트 단위 출력 및 반환 count를 차등 비교.
- portable libc 요구사항이 아닌 의도적인 project contract에 대한 fixed expectation.
- partial write, interruption, zero progress, permanent failure sequence를 재현하는 결정론적 write substitution.
- 부호 있는 정수 경계값, 정밀도 0, alternate-form 접두사, null pointer, null string, 충돌하는 플래그에 대한 boundary matrix.
- archive 구성, symbol, dependency, external consumer를 확인하는 release check.
- normal binary와 injected-failure binary 모두를 실행하는 UBSan 및 Linux GCC AddressSanitizer 경로.

## S 등급 기준

- 이후 모든 conversion에서 사용하는 foundational parser 또는 output-state abstraction을 확립한다.
- 프로젝트 전체의 POSIX output progress 및 interruption policy를 확립한다.
- 진입점을 two-pass variadic architecture로 변경하여 format/length 오류가 output side effect를 만들지 않도록 보장한다.
- 최종 grammar, byte accounting, failure model을 설명하는 데 빠질 수 없는 core architectural decision을 만든다.

## A 등급 기준

- flag, prefix, precision, width, count range, bounded string access, signed endpoint 사이의 중요한 상호작용을 해결한다.
- dispatch나 shared numeric layout처럼 의미 있는 responsibility boundary를 만든다.
- output state machine, no-output preflight guarantee, public contract, release artifact에 대해 결정론적 근거를 추가한다.
- output path에서 의미 있고 검증 가능한 성능 개선을 제공한다.

## 일반적인 B 등급 작업

- 일반적인 conversion을 추가하거나 이미 확립된 width, alignment, precision 동작을 다른 renderer에 적용한다.
- 기존 abstraction을 main loop에 통합한다.
- 이미 확립된 mechanism에 ordinary differential coverage 또는 focused regression coverage를 추가한다.
- 표준 sanitizer infrastructure 또는 국소적인 supporting refactor를 추가한다.

## 일반적인 C 등급 작업

- 문서만 변경하는 커밋.
- 문법, 렌더링, 출력, 실패 처리, release 동작에 거의 영향을 주지 않는 소규모 유지보수.
- 맥락은 제공하지만 executable mechanism이나 verification mechanism을 추가하지 않는 작업.

## 프로젝트 전용 태그

PARSER — 포맷 문법, 필드 표현, normalization, parse-time 제한.  
FORMAT — public conversion semantics 및 생성되는 text 또는 digit.  
VARARGS — `va_list` 소유권, promoted type, 복사, 순회.  
OUTPUT — POSIX write 동작, sticky error 상태, 바이트 수 집계, signal 상호작용.  
ATOMIC — output side effect가 생기기 전에 format 및 total-length 오류를 거부하는 동작.  
LAYOUT — 접두사, 정밀도, 0, 너비, 정렬, 패딩 배치.  
RELEASE — 아카이브 구성, 전역 심볼, 의존성, public header, 외부 consumer linkage.  
VERIFY — 차등 테스트, fault injection, sanitizer, artifact-level 검증 근거.

# 커밋 분류

| 커밋 | 제목 | 중요도 | 태그 | 요약 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `0ec80a6a8196` | `docs(readme): 프로젝트 목표와 초기 개발 규약 정의` | C | - | 의도한 formatter 범위와 초기 개발 규칙을 기록한다. | documentation-only root context이며 구현된 parser, formatter, output invariant는 없다. |
| `1d6a5cee3041` | `feat(core): 리터럴과 퍼센트 출력 구현` | B | CORE, OUTPUT | public entry point, archive, literal loop, percent escape, 초기 count 처리를 만든다. | 프로젝트의 시작에 필요한 구현이지만 1바이트 write와 short-write 거부는 초기 형태이며, 이후 project-defining output architecture로 대체된다. |
| `3f7b0ab926d0` | `feat(output): 출력 컨텍스트와 쓰기 API 추가` | S | ARCH, OUTPUT, CORE | descriptor, count, sticky error, short-write progress를 가진 shared output context를 도입한다. | 이후 모든 formatter의 byte count와 failure propagation 방식이 이 abstraction으로 결정된다. 이를 제거하면 프로젝트의 책임 경계와 output correctness 설명에 근본적인 공백이 생긴다. |
| `78e5d25d7df6` | `refactor(core): 리터럴 출력을 컨텍스트 API로 이관` | B | OUTPUT, REFACTOR | literal과 percent 출력을 shared context로 옮긴다. | duplicate accounting을 제거하는 필수 integration 작업이지만, 결정적인 architecture는 앞선 context commit에서 이미 확립됐다. |
| `7984ddf2dd57` | `feat(parser): 포맷 필드 모델과 해석기 추가` | S | ARCH, PARSER, CORE | t_format을 정의하고 decimal overflow check와 함께 flag, width, precision, specifier를 parse한다. | parser는 모든 conversion과 이후 두 pass가 통신하는 durable representation을 만든다. formatter grammar와 field-processing architecture를 설명하는 데 필수적이다. |
| `9e6d785628f3` | `feat(core): 포맷 필드 해석을 출력 루프에 연결` | B | PARSER, INTEGRATION | parsed field를 temporary fallback output과 함께 main traversal에 연결한다. | parser를 loop에 통합하는 일반적인 작업이다. 실제 conversion responsibility와 최종 invalid-format policy는 이후에 확립된다. |
| `03c3e6e09fa1` | `feat(text): 문자·문자열·퍼센트 변환 추가` | A | ARCH, FORMAT, VARARGS | conversion dispatch와 구체적인 c, s, percent renderer를 도입한다. | va_arg 선택과 rendering의 분리가 이후 모든 conversion에서 사용하는 integration boundary가 된다. 중요한 architecture지만 parser와 two-pass core보다는 종속적인 위치다. |
| `95d6613a1c72` | `feat(decimal): 부호 있는·없는 10진수 출력 추가` | B | FORMAT, VARARGS | d, i, u dispatch와 decimal digit 출력을 추가한다. | 이미 확립된 dispatch/output model 안에서 수행한 일반적인 core feature 구현이다. |
| `93c883070a1b` | `feat(hex): 16진수와 포인터 출력 추가` | B | FORMAT, VARARGS | uintptr_t 변환을 사용한 x, X, p formatting을 추가한다. | 기본 conversion set을 완성하지만 기존 dispatch/output boundary를 따른다. |
| `a0fcf2ba3704` | `feat(text): 문자·문자열·퍼센트 너비와 정렬 적용` | B | FORMAT, LAYOUT | text conversion에 space padding과 left alignment를 추가한다. | 이미 확립된 renderer 구조 안에 일반적인 formatting 동작을 적용한 작업이다. |
| `ac27a26affaa` | `feat(decimal): 10진수 너비와 정렬 적용` | B | FORMAT, LAYOUT | decimal digit buffer를 만들고 prefix-aware width와 alignment를 적용한다. | 필요한 layout 구현이지만 decimal rendering에 국한되며 이후 하나로 통합된다. |
| `c5ef742b84de` | `feat(hex): 16진수와 포인터 너비와 정렬 적용` | B | FORMAT, LAYOUT | hexadecimal과 pointer output에 width와 alignment를 적용한다. | 다른 conversion family에 기존 layout model을 반복 적용한 일반적인 supporting work다. |
| `8e1cee3ed7f0` | `feat(text): 문자열 정밀도와 퍼센트 0 채움 적용` | B | FORMAT, EDGE | 프로젝트의 percent extension에 string truncation과 zero padding을 추가한다. | 의미 있는 semantics지만 초기 string 구현은 truncation 전에 여전히 NUL까지 scan하며 이후 수정된다. 중간 단계의 feature commit이다. |
| `1fa064ca9d79` | `feat(numeric): 숫자 정밀도와 0 채움 적용` | A | FORMAT, LAYOUT, RISK | decimal/hexadecimal output에 zero suppression, precision zero, zero-padding 순서를 추가한다. | prefix, precision, field width, left alignment, zero flag의 상호작용은 formatter에서 가장 어려운 국소 correctness 문제 중 하나다. 중요하지만 중복 구현은 이후 중앙화된다. |
| `c5f627099ad9` | `feat(flags): 숫자 플래그 우선순위 정규화` | A | PARSER, FORMAT, LAYOUT | 충돌하는 flag를 normalize하고 signed 및 alternate-form prefix를 추가한다. | parser boundary에서 -가 0보다, +가 space보다 우선하도록 해결하면 모든 renderer가 단순해진다. 0이 아닐 때만 hexadecimal prefix를 붙이는 동작도 public semantics를 바로잡는다. conversion 전반에 영향을 주는 중요한 판단이다. |
| `1b8049e411bb` | `test(printf): 기본 변환과 포맷 경계 검증` | A | FORMAT, TEST, VERIFY | stdout capture, libc differential check, fixed expectation, parser-overflow test를 만든다. | harness는 모든 core conversion과 return count에 대한 신뢰도를 크게 높이고 이후 regression matrix의 기반이 된다. runtime mechanism을 정의하는 것은 아니지만 중요한 검증이다. |
| `c627bd1f85bb` | `fix(output): 쓰기 결과를 집계하기 전에 범위 검증` | A | OUTPUT, RISK, DEBUG | int로 narrow하여 더하기 전에 더 넓은 write 결과를 거부한다. | 작은 수정이지만 정확한 conversion boundary에서 public count invariant를 복원하고 implementation-defined narrowing을 피한다. 한 줄 diff임에도 영향은 크다. |
| `ba0fe19d9411` | `test(output): 표준 출력 실패 전파 검증` | B | OUTPUT, TEST | stdout을 닫고 ft_printf가 -1을 반환하는지 검사한다. | 일반적인 hard-error path는 확인하지만 partial progress, interruption, zero write, signal policy까지 다루지는 않는다. |
| `f276ee73087c` | `test(numeric): 접두사와 정밀도 배치 회귀 검증` | B | FORMAT, TEST, EDGE | prefix, precision, zero, alignment 상호작용에 집중한 regression case를 추가한다. | 까다로운 기존 layout semantics를 보호하지만 shared layout mechanism 자체를 도입하는 것은 아니다. |
| `177c8d03b353` | `refactor(output): 숫자 출력 배치 로직 통합` | A | ARCH, LAYOUT, REFACTOR | decimal, hexadecimal, pointer conversion이 공유하는 numeric layout writer를 추출한다. | prefix, precision zero, field padding, digit ordering을 중앙화하여 중복 correctness logic을 제거하고, 이후 measurement가 그대로 반영할 하나의 responsibility boundary를 만든다. 독립적인 project-defining 변화는 아니지만 중요한 구조 개선이다. |
| `8a3ec50cb689` | `fix(output): 중단된 쓰기 재시도와 요청 크기 제한` | S | OUTPUT, CORE, RISK | write 요청을 SSIZE_MAX로 제한하고 EINTR를 재시도하며 결정론적 write test seam을 제공한다. | 단순 short-write 처리에서 더 나아가 project-defining POSIX output policy를 완성한다. 모든 conversion이 사용하는 progress, interruption, request-range invariant를 확립하고 failure path를 직접 증명할 수 있게 한다. |
| `22e65c176b5d` | `perf(output): 반복 채움을 묶어서 출력` | A | OUTPUT, PERF | 반복 padding을 문자마다 write하지 않고 최대 64바이트의 bounded chunk로 출력한다. | bounded stack use와 failure propagation을 유지하면서 넓은 field의 system-call 수를 실질적으로 줄인다. 이후 fault test로 이 cost model을 관찰 가능하게 만든다. |
| `1223518652bd` | `test(output): 쓰기 실패 시퀀스와 채움 전략 검증` | A | OUTPUT, TEST, RISK | partial write, EINTR, EPIPE, zero progress를 주입하고 SIGPIPE 및 padding chunk를 검증한다. | S 등급 output state machine에 결정론적 근거를 제공하고 library가 process signal policy를 변경하지 않는다는 점도 확인한다. failure path 검증 강도가 특히 높다. |
| `9ac825379180` | `fix(text): 문자열 정밀도 범위까지만 읽기` | A | FORMAT, EDGE, RISK | 먼저 NUL을 찾은 뒤 자르지 않고 precision 지점에서 string scan을 멈춘다. | 이전 방식은 요청한 출력 자체가 안전하더라도 caller의 유효한 bounded object 밖을 읽을 수 있었다. 이 root-cause fix는 renderer boundary의 memory-access contract를 복원한다. |
| `e040e69db535` | `test(text): NUL 없는 제한 문자열 회귀 검증` | B | FORMAT, TEST, EDGE | precision과 길이가 일치하는 3바이트 non-NUL array를 format한다. | focused regression으로 bounded-read fix를 증명하지만, 앞선 A 등급 수정에 대한 supporting evidence다. |
| `ed3750fd081a` | `fix(decimal): INT_MIN 크기를 unsigned 범위에서 계산` | A | FORMAT, EDGE, RISK | unsigned 변환 전에 -(value + 1) + 1 형태로 음수 magnitude를 만든다. | long이 -INT_MIN을 표현할 수 없는 platform에서 signed-overflow 의존성을 제거한다. 작은 수정으로 portable numeric correctness를 복원한다. |
| `2d773acc5bd6` | `fix(format): 지원 문법과 전체 출력 크기 선검증` | S | ARCH, VARARGS, ATOMIC | 출력 전에 grammar와 전체 int 길이를 검증하는 va_copy measurement pass를 추가한다. | formatter를 incremental discovery에서 two-pass architecture로 바꾼다. malformed, unsupported, unrepresentable output은 외부 효과 없이 거부된다. 최종 correctness/failure contract는 이 commit 없이 설명할 수 없다. |
| `14059bd24f3e` | `test(format): 잘못된 포맷의 무출력 실패 검증` | A | ATOMIC, TEST, RISK | 뒤쪽의 invalid field와 INT_MAX 길이 실패가 0바이트 output을 만드는지 검증한다. | 유효한 prefix와 conversion 뒤에 발생하는 오류까지 포함해 새 preflight atomicity guarantee를 직접 증명한다. S 등급 계약을 실질적으로 보호한다. |
| `aceddf290594` | `test(printf): 숫자와 문자열 포맷 조합 확대` | B | FORMAT, TEST, VERIFY | signed, unsigned, hexadecimal, text, mixed format 전반에 넓은 libc differential matrix를 추가한다. | coverage는 광범위하지만 이미 확립된 semantics에 대한 일반 검증 규모를 확장하는 성격이 크다. |
| `12d715eba77d` | `test(printf): 공개 계약 경계 사례 확대` | A | FORMAT, TEST, EDGE | zero precision, prefix, null value, percent extension, width/precision boundary matrix를 고정한다. | 일부 expectation은 portable libc behavior가 아니라 의도적인 project contract다. 이를 명시적으로 고정하는 것은 library의 실제 public semantics 보존에 중요하다. |
| `a87bcf560789` | `test(release): 아카이브와 외부 소비자 검증` | A | RELEASE, ARCH, VERIFY | archive order, global definition, external dependency, header-only external consumer를 검사한다. | distributable artifact와 consumer boundary를 재현 가능한 contract로 확립하여 in-tree test를 넘어서는 release-level 근거를 추가한다. |
| `1b474fa2a5e3` | `build(sanitize): UBSan과 Linux ASan 검증 추가` | B | VERIFY, TEST | UBSan target과 Dockerized GCC AddressSanitizer 경로를 추가한다. | sanitizer matrix는 유용한 safety infrastructure지만 formatter의 architecture나 contract를 바꾸지 않고 표준 검증을 적용하는 작업이다. |
| `a35faa85cf41` | `docs(project): 프로젝트 문서 정리` | C | - | 최종 grammar, two-pass pipeline, output behavior, verification limit을 문서화한다. | 포괄적인 문서로 결과를 명확히 하지만 documentation-only이며 executable behavior나 verification behavior를 변경하지 않는다. |

# 개발 흐름

## 흐름: 하나의 출력 상태가 견고한 system-call 경계로 발전

`1d6a5cee3041` B — short write를 거부하는 local write-and-count helper에서 시작한다.  
↓  
`3f7b0ab926d0` S — shared descriptor, count, sticky-error state를 도입하고 양수의 short write 이후 출력을 이어 간다.  
↓  
`78e5d25d7df6` B — literal output을 shared context로 옮겨 duplicate accounting을 제거한다.  
↓  
`c627bd1f85bb` A — 더 넓은 `ssize_t` 결과를 public `int` count로 narrow하기 전에 범위를 검증한다.  
↓  
`8a3ec50cb689` S — 요청 크기를 `SSIZE_MAX`로 제한하고 `EINTR`를 재시도하며 결정론적 write seam을 만든다.  
↓  
`22e65c176b5d` A — padding byte마다 system call을 호출하는 대신 bounded chunk로 넓은 padding을 출력한다.  
↓  
`1223518652bd` A — 부분 진행, interruption, 0바이트 write, `EPIPE`를 script하고 `SIGPIPE` 및 chunking policy를 검증한다.

**의의**

output layer는 단순한 편의 helper에서 모든 conversion이 공유하는 state machine으로 발전한다. count range, progress, interruption, permanent failure, syscall cost, process signal policy를 모두 명시하고 operating-system timing과 독립적으로 검증한다.

## 흐름: 포맷 필드에서 타입이 명확한 conversion dispatch로

`7984ddf2dd57` S — 정규화된 `t_format` representation과 overflow-checked field parser를 확립한다.  
↓  
`9e6d785628f3` B — field parsing을 main format traversal에 연결한다.  
↓  
`03c3e6e09fa1` A — `va_arg` type 선택을 소유하고 conversion renderer로 전달하는 dispatcher를 도입한다.  
↓  
`95d6613a1c72` B — 같은 boundary 안에 signed/unsigned decimal conversion을 추가한다.  
↓  
`93c883070a1b` B — 동일한 boundary 안에 hexadecimal/pointer conversion을 추가한다.  
↓  
`c5f627099ad9` A — 충돌하는 flag를 한 번만 normalize하고 signed/alternate-form prefix를 적용한다.

**의의**

parsing, argument extraction, rendering이 서로 다른 책임으로 분리된다. 정규화된 field는 각 conversion이 raw text를 다시 parse하지 않게 하고, dispatch는 specifier마다 소비할 정확한 promoted type을 중앙화한다. parser 단계의 flag normalization은 각 renderer가 처리해야 하는 conflicting state 수도 줄인다.

## 흐름: 숫자 formatting이 하나의 layout model로 수렴

`ac27a26affaa` B — 10진수 출력에 접두사를 고려한 너비와 정렬을 추가한다.  
↓  
`c5ef742b84de` B — hexadecimal 및 pointer output에 같은 model을 적용한다.  
↓  
`1fa064ca9d79` A — 0 값의 digit 생략, 정밀도에 따른 0 채움, 필드 0 패딩 규칙을 추가한다.  
↓  
`c5f627099ad9` A — prefix selection과 flag precedence를 확립한다.  
↓  
`f276ee73087c` B — 대표적인 prefix, precision, zero, left-alignment 상호작용을 고정한다.  
↓  
`177c8d03b353` A — decimal, hexadecimal, pointer conversion이 공유하는 numeric layout writer를 하나로 추출한다.  
↓  
`ed3750fd081a` A — `INT_MIN` formatting에서 signed-overflow 의존성을 제거한다.  
↓  
`12d715eba77d` A — 정밀도 0, 접두사, null pointer, 좁은 필드에 대한 public boundary matrix를 확장한다.

**의의**

초기 decimal/hexadecimal 구현은 space, prefix, field zero, precision zero, digit, trailing padding이라는 까다로운 순서를 각각 중복 구현한다. shared layout은 이 순서를 하나의 invariant로 만들고, 이후 portability 및 boundary 작업은 signed endpoint와 project-specific pointer semantics에서도 공통 mechanism이 올바르게 유지되도록 한다.

## 흐름: 문자열 precision이 출력 truncation에서 bounded access로 발전

`8e1cee3ed7f0` B — 처음에는 문자열 전체 길이를 구한 뒤 출력 길이만 truncate한다.  
↓  
`9ac825379180` A — 허용된 object range를 넘어 읽지 않도록 scan 자체에 precision bound를 적용한다.  
↓  
`e040e69db535` B — NUL terminator가 없는 3바이트 object로 `%.3s`가 해당 3바이트만 읽으면 충분하다는 점을 증명한다.

**의의**

이 흐름은 output length와 memory access가 실제로 서로 다른 개념임을 드러낸다. precision은 단순한 후처리 제한이 아니라 renderer가 caller object를 얼마나 멀리 읽을 수 있는지도 바꾼다. focused regression은 다시 full `strlen` 방식의 scan으로 돌아가는 regression을 막는다.

## 흐름: 필드 단위 검증이 전체 호출 preflight로 발전

`7984ddf2dd57` S — 한 field를 parse하는 동안 `int`를 overflow하는 decimal width 또는 precision을 거부한다.  
↓  
`1b8049e411bb` A — parser-boundary test와 differential harness를 추가하지만, format 뒤쪽의 오류가 앞선 output 이후에 발견될 수는 있다.  
↓  
`2d773acc5bd6` S — 모든 field와 total result를 write 전에 검증하는 `va_copy` measurement pass를 추가한다.  
↓  
`14059bd24f3e` A — 뒤쪽의 unsupported field와 표현할 수 없는 total length가 0바이트 출력으로 실패하는지 검증한다.

**의의**

유효한 literal 또는 conversion 뒤에 invalid field가 있다면 local parse validation만으로 public no-output guarantee를 보장할 수 없다. 두 번째 pass가 architecture를 바꾼다. format/length 오류는 preflight failure가 되고, partial external output을 남길 수 있는 것은 device error뿐이다.

## 흐름: 검증 범위가 runtime과 artifact 경계까지 확장

`1b8049e411bb` A — 출력 바이트 캡처, 반환 count 비교, libc 차등 테스트를 확립한다.  
↓  
`1223518652bd` A — 결정론적 system-call 및 signal-policy 검증을 추가한다.  
↓  
`12d715eba77d` A — libc를 portable oracle로 사용할 수 없는 의도적인 project semantics를 fixed expectation으로 기록한다.  
↓  
`a87bcf560789` A — archive member, global definition, external dependency, out-of-tree consumer를 검증한다.  
↓  
`1b474fa2a5e3` B — normal/fault binary를 UBSan과 Linux GCC AddressSanitizer 환경에서 실행한다.

**의의**

각 계층은 서로 다른 질문에 답한다. byte가 일치하는지, failure sequence가 output contract를 보존하는지, project extension이 안정적으로 유지되는지, 배포 archive가 올바른 boundary를 가지는지, 실행된 path에서 runtime undefined behavior나 invalid memory access가 발생하는지를 각각 검증한다.

# 가장 중요한 커밋

## feat(output): 출력 컨텍스트와 쓰기 API 추가
커밋: `3f7b0ab926d0`  
중요도: S  
태그: ARCH, OUTPUT, CORE

### 문제

conversion이 늘어날수록 각 helper가 byte count, descriptor, short-write loop, failure flag를 독립적으로 안전하게 관리하기 어렵다. output state가 중복되면 conversion마다 출력을 계속해도 되는지, 몇 바이트가 이미 반영됐는지에 대한 판단이 달라질 수 있다.

### 결정

private `t_printf` context가 descriptor, 누적 `int` count, sticky error를 소유한다. `ft_printf_write`는 양수의 short write마다 buffer를 전진시키고 하나의 shared count를 갱신하며, context가 invalid 상태가 되면 이후 write를 모두 거부한다.

### 중요성

context는 literal text와 모든 conversion이 공유하는 execution state가 된다. public return-value invariant를 중앙화하고 formatter 전체에 하나의 error-propagation boundary를 제공한다.

### 변경 사항

출력 module, internal header, context initializer, multi-byte writer, character writer가 archive에 추가됐다.

### 프로젝트 이해에 중요한 이유

formatter는 서로 독립적인 conversion function의 모음이 아니다. progress와 failure를 공유하는 하나의 stateful output operation이며, 이 커밋이 그 architecture를 확립한다.

## feat(parser): 포맷 필드 모델과 해석기 추가
커밋: `7984ddf2dd57`  
중요도: S  
태그: ARCH, PARSER, CORE

### 문제

raw format text에는 flag, width, optional precision, conversion specifier가 함께 들어 있다. 각 renderer가 raw cursor를 직접 해석하면 grammar가 중복되고 conflict handling이 일관되지 않으며 field-number overflow도 드러내기 어렵다.

### 결정

parser는 하나의 field를 정규화된 `t_format` 구조체로 변환하고 input pointer를 다음 위치로 전진시킨다. decimal accumulation은 multiplication/addition 전에 `INT_MAX`를 검사하고, flag는 이후 normalization과 rendering에 사용할 stable bit로 표현한다.

### 중요성

`t_format`은 parsing, measurement, dispatch, layout 사이의 지속적인 계약이 된다. 이후 모든 conversion은 original text가 아니라 이 representation에 의존한다.

### 변경 사항

parser translation unit, 플래그 constant, 필드 structure, initialization, 10진수 parsing, parse API가 추가됐다.

### 프로젝트 이해에 중요한 이유

이 커밋은 프로젝트가 실제로 지원하는 format language와, 이후 기능이 서로 독립적으로 발전할 수 있게 하는 component boundary를 정의한다. 이것이 없으면 renderer 구조나 최종 two-pass validation architecture도 설명하기 어렵다.

## refactor(output): 숫자 출력 배치 로직 통합
커밋: `177c8d03b353`  
중요도: A  
태그: ARCH, LAYOUT, REFACTOR

### 문제

decimal과 hexadecimal renderer가 prefix length, suppressed zero digit, precision zero, field zero, leading space, trailing space의 동일한 복잡한 ordering rule을 각각 구현했다. 중복은 두 conversion family가 edge case에서 서로 다른 동작으로 갈라질 가능성을 만든다.

### 결정

shared numeric layout writer는 이미 생성된 digit sequence, prefix, zero-value 여부, normalized field를 입력받는다. effective digit length, precision zero, field padding, emission order는 이 writer 하나만 결정한다.

### 중요성

numeric placement의 authoritative mechanism이 하나로 정리되어 reasoning과 별도 test가 필요한 state 수가 크게 줄어든다. 이후 measurement pass도 미묘하게 다른 여러 renderer가 아니라 하나의 model만 반영하면 된다.

### 변경 사항

새 layout translation unit과 internal API가 decimal 및 hexadecimal module의 거의 동일한 output sequence를 대체했다.

### 프로젝트 이해에 중요한 이유

`printf`에서 눈에 보이는 복잡성 대부분은 숫자를 digit으로 바꾸는 작업보다, 상호작용하는 flag 아래에서 prefix와 padding을 배치하는 데 있다. 이 커밋은 그 concern을 독립 subsystem으로 분리한다.

## fix(output): 중단된 쓰기 재시도와 요청 크기 제한
커밋: `8a3ec50cb689`  
중요도: S  
태그: OUTPUT, CORE, RISK

### 문제

shared output loop는 이미 양수의 short write를 처리했지만 interrupted call은 여전히 permanent failure로 취급했고, `size_t`로 관리하는 remaining length는 양수 `ssize_t`로 표현 가능한 최대 결과를 초과할 수 있었다.

### 결정

각 요청을 `SSIZE_MAX` 이하로 제한한다. `EINTR`는 buffer나 count를 전진시키지 않고 재시도하며, 그 밖의 nonpositive result는 sticky error를 설정한다. compile-time test seam은 system-call boundary만 결정론적 대체 함수로 redirect한다.

### 중요성

모든 conversion이 사용하는 POSIX progress model을 완성하고 가장 어려운 path를 직접 테스트할 수 있게 한다. 진행 전에 발생한 interruption과 일부 진행 뒤의 permanent failure를 명확히 구분한다.

### 변경 사항

출력 module에 `errno` 처리, 요청 크기 선택, retry logic, `FT_PRINTF_TEST_WRITE` substitution path가 추가됐다.

### 프로젝트 이해에 중요한 이유

public API의 반환값은 내부 write loop가 kernel이 실제로 받아들인 byte를 정확히 집계할 때만 의미가 있다. 이 커밋이 그 계약 아래의 최종 system-call semantics를 확립한다.

## fix(text): 문자열 정밀도 범위까지만 읽기
커밋: `9ac825379180`  
중요도: A  
태그: FORMAT, EDGE, RISK

### 문제

초기 precision 구현은 전체 NUL-terminated length를 구한 뒤 출력 길이만 줄였다. 유효한 `%.3s` 호출은 terminator 없이 정확히 3바이트만 읽을 수 있는 object를 전달할 수 있으므로, full scan은 caller object 밖을 읽을 수 있다.

### 결정

local length scan은 NUL 또는 precision limit 중 먼저 도달하는 지점에서 멈춘다. 동일한 bounded length를 padding과 output에 사용하여 precision을 emission limit이자 memory-access limit으로 만든다.

### 중요성

특정 output call만 guard하는 대신 root cause를 수정한다. 일반 NUL-terminated test로는 드러나지 않는 caller-visible safety property를 복원한다.

### 변경 사항

string length helper가 parsed field를 받아 traversal 중 precision을 적용하도록 변경했고, scan 후 별도로 수행하던 truncation을 제거했다.

### 프로젝트 이해에 중요한 이유

format semantics는 렌더링되는 byte뿐 아니라 memory read 범위도 제한한다. 이 차이는 C에서 string conversion을 안전하게 구현하는 데 핵심적이다.

## fix(format): 지원 문법과 전체 출력 크기 선검증
커밋: `2d773acc5bd6`  
중요도: S  
태그: ARCH, VARARGS, ATOMIC

### 문제

single output pass에서는 지원하지 않거나 표현할 수 없는 field가 앞선 literal과 conversion을 이미 출력한 뒤에야 발견될 수 있다. public contract는 format 및 total-length 오류가 아무 출력 없이 `-1`을 반환해야 한다고 요구하며, total count는 `int`로 표현 가능해야 한다.

### 결정

`ft_printf`는 `va_copy`로 가변 인자 traversal을 복사하고 전체 measurement pass를 수행한다. 이 pass는 모든 field를 다시 parse하고 올바른 promoted type으로 argument를 소비하며, 정확한 effective length를 계산하고 unsupported syntax를 거부한다. total이 `INT_MAX` 범위 안에 있을 때만 누적한다.

### 중요성

incremental validation에서 preflight validation으로 바꾸는 큰 architecture 변화다. 외부 효과 전에 탐지할 수 있는 오류와 partial output 뒤에 발생할 수 있는 device failure를 명확히 분리한다.

### 변경 사항

큰 measurement module과 internal API가 추가됐고, entry point에는 성공과 실패 모두에서 `va_end`가 균형을 이루는 독립적인 copied-argument traversal이 추가됐다.

### 프로젝트 이해에 중요한 이유

최종 formatter는 의도적으로 two-pass 구조다. 이 커밋은 parser/layout 규칙이 measurement에서 재현 가능해야 하는 이유, variadic state의 ownership, 프로젝트가 제공하는 제한적인 atomicity guarantee의 범위를 설명한다.

## test(output): 쓰기 실패 시퀀스와 채움 전략 검증
커밋: `1223518652bd`  
중요도: A  
태그: OUTPUT, TEST, RISK

### 문제

실제 pipe와 descriptor는 partial write, interruption, zero return, permanent error의 정확한 sequence를 안정적으로 재현하지 않는다. 또한 padding optimization이 공통 output policy를 우회하지 않는지, library가 process의 `SIGPIPE` disposition을 보존하는지도 증명하기 어렵다.

### 결정

scripted writer가 설정된 `EINTR`, partial count, `EPIPE`, zero를 반환하면서 request size와 accepted byte를 기록한다. 별도의 signal test는 broken pipe 주변에 caller-owned handler를 설치하고 반환 오류와 disposition이 그대로 유지되는지 함께 검증한다.

### 중요성

suite는 최종 문자열뿐 아니라 transition behavior를 증명한다. retry가 올바른 remaining suffix를 요청하는지, hard failure가 앞선 byte는 보존하면서 이후 write를 중단하는지, zero progress가 실패하는지, 넓은 padding이 bounded chunk를 유지하는지 확인한다.

### 변경 사항

Makefile에 output test seam을 사용하는 fault binary가 추가됐고, normal suite에는 `SIGPIPE` policy case가 추가됐다. fault suite는 retry, permanent failure, 64-byte padding chunk를 다룬다.

### 프로젝트 이해에 중요한 이유

output layer는 formatter가 operating system과 상호작용하는 핵심 경계다. 이 커밋은 state machine과 process-boundary assumption이 구현된 contract와 일치한다는 가장 강한 근거를 제공한다.
