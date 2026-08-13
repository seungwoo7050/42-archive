# 포맷 처리 구조

이 문서는 현재 코드 경로를 설명한다. 코드 조각은 따로 “설명용”이라고
표시하지 않는 한 현재 함수 이름과 순서를 요약한 것이다.

## 진입점부터 반환까지

`ft_printf`의 제어 흐름은 다음과 같다.

```text
format == NULL -> -1
       |
       v
va_start(args, format)
       |
       v
va_copy(measure_args, args)
       |
       v
ft_printf_measure(format, &measure_args)
  -> parse
  -> 지원 지정자 확인
  -> 정확한 타입으로 측정용 va_arg
  -> 변환 길이와 총 길이 <= INT_MAX 확인
       |
       +-- 실패 -> va_end(copy) -> va_end(original) -> -1
       |
       v
va_end(measure_args)
       |
       v
t_printf { fd = 1, count = 0, error = 0 }
       |
       v
원본 args로 parse -> dispatch -> 변환 배치 -> ft_printf_write
       |
       v
va_end(args) -> error ? -1 : count
```

측정용 `va_list`는 `va_copy`로 복제한다. 단순 대입은 `va_list`가 배열이나
포인터를 포함하는 구현에서 독립 순회자를 만들지 못할 수 있다. 측정 성공·실패와
출력 중단 어느 경로에서도 시작한 각 목록에 `va_end`를 대응시킨다.

두 번 순회하는 목적은 포맷과 전체 반환 길이를 외부 효과 전에 검증하는 것이다.
출력 장치가 받을 수 있는지까지 미리 보장하는 원자성은 아니다. 측정 뒤 실제
`write`가 실패하면 앞서 성공한 출력은 남는다.

## 파일별 현재 책임

```text
src/ft_printf.c
  ├─ src/ft_measure.c       첫 순회, 지원 문법과 길이
  ├─ src/ft_parse.c         t_format 생성
  ├─ src/ft_dispatch.c      지정자별 va_arg와 출력 함수 선택
  ├─ src/ft_text.c          c, s, %
  ├─ src/ft_number.c        d, i, u의 부호·10진 숫자
  ├─ src/ft_hex.c           x, X, p의 접두사·16진 숫자
  ├─ src/ft_numeric_layout.c
  │                         접두사·정밀도·너비 배치
  └─ src/ft_output.c        POSIX write와 count/error
```

소비자는 `include/ft_printf.h`의 `ft_printf`만 사용한다. `t_format`,
`t_printf`와 내부 함수 선언은 `src/ft_printf_internal.h`에 있다. 현재
`release-check`는 내부 함수도 archive의 전역 정의 심볼로 승인하므로 “공개
헤더의 API가 하나”와 “archive가 전역 심볼 하나만 정의”는 다른 명제다.

## 두 순회가 공유해야 하는 규칙

측정과 출력은 구현 파일이 다르지만 다음 불변식을 공유해야 한다.

| 규칙 | 측정 순회 | 출력 순회 |
| --- | --- | --- |
| 파싱 | `ft_printf_parse` | `ft_printf_parse` |
| `%c` | `va_arg(..., int)`, 길이 1 | `va_arg(..., int)`, 한 바이트 |
| `%s` | `va_arg(..., char *)`, 제한 길이 | 같은 타입과 제한 길이 |
| `%d`, `%i` | `va_arg(..., int)` | 같은 타입, 부호와 magnitude |
| `%u`, `%x`, `%X` | `va_arg(..., unsigned int)` | 같은 타입과 진법 |
| `%p` | `va_arg(..., void *)` | 같은 타입, `0x`와 16진수 |
| `%%` | 인자 소비 없음 | 인자 소비 없음 |
| 배치 | 접두사·자릿수·정밀도·너비의 길이 | 같은 순서의 실제 바이트 |

새 지정자나 플래그를 한쪽에만 추가하면 원본과 복사본의 인자 위치가 달라지거나
측정 길이와 실제 반환 길이가 달라질 수 있다. 현재 코드는 측정값을 저장해 실제
`count`와 마지막에 비교하지 않으므로, 이 일치는 코드 중복을 수정할 때 지켜야 할
구조적 불변식이고 테스트가 잡아야 할 대상이다.

가변 인자의 default argument promotion은 형식 정보를 만들어 주지 않는다.
`char`와 `short` 계열은 보통 `int` 또는 `unsigned int`로, `float`는
`double`로 승격될 뿐이다. 각 지정자가 요구하는 승격 후 타입과 실제 타입이
호환되지 않거나 인자가 부족하면 일반적으로 첫 측정 순회의 `va_arg`부터 정의되지
않은 동작이다. 대응하는 signed/unsigned 정수형이고 값이 양쪽 모두에 표현되는
경우라는 C의 좁은 `va_arg` 예외는 있지만 type 검사가 생기는 것은 아니므로,
공개 계약은 표의 정확한 promotion 후 타입을 요구한다. 남는 추가 인자는 평가된
뒤 사용되지 않는다.

## 파서의 상태와 프로젝트 문법

`ft_printf_parse`는 다음 순서로 `t_format`을 만든다.

1. `-0# +`를 반복해 bit flag로 합친다.
2. 너비의 십진 숫자를 `int` 범위 안에서 누적한다.
3. `.`이 있으면 정밀도 존재를 기록하고 십진 숫자를 누적한다.
4. 다음 한 바이트를 지정자로 기록한다.
5. `-`가 있으면 `0`, `+`가 있으면 공백 flag를 끈다.

파서는 지정자가 지원 목록에 있는지 판단하지 않는다. 측정 순회의
`ft_is_supported_specifier`가 `cspdiuxX%` 밖의 지정자와 지정자 없는 끝을
거절한다. 그래서 뒤쪽의 `%q`나 단독 `%`도 앞부분을 쓰기 전에 실패한다. 실제
dispatch의 미지원 지정자 fallback은 공개 `ft_printf` 경로에서는 이 선검증을
통과할 수 없어 도달하지 않는다.

## 변환과 배치

현재 dispatch에서 지정자와 함수는 다음처럼 연결된다.

| 지정자 | 실제 출력 함수 | 다음 단계 |
| --- | --- | --- |
| `%c` | `ft_printf_print_char` | `ft_printf_putchar` |
| `%s` | `ft_printf_print_string` | `ft_printf_write` |
| `%d`, `%i` | `ft_printf_print_signed` | `ft_write_decimal`, 공통 숫자 배치 |
| `%u` | `ft_printf_print_unsigned` | `ft_write_decimal`, 공통 숫자 배치 |
| `%x`, `%X` | `ft_printf_print_hex` | `ft_write_hex`, 공통 숫자 배치 |
| `%p` | `ft_printf_print_pointer` | `ft_write_hex`, 공통 숫자 배치 |
| `%` | `ft_printf_print_percent` | 채움 뒤 `ft_printf_putchar` |

`ft_write_decimal`과 `ft_write_hex`는 각 source file 안의 `static` helper이고,
공통 숫자 배치는 `ft_printf_write_numeric_layout`이다.

`%c`는 `int`를 plain `(char)`로 바꾸어 NUL을 포함한 한 바이트를 쓴다. 따라서
plain `char` 범위 밖 값은 구현별 변환 경계가 있으며 ISO C `printf`의
`unsigned char` 변환과 같다고 확대하지 않는다. `%s`는 NUL 또는 정밀도 중 먼저
만나는 지점까지만 읽고 null pointer에는 `(null)`을 대입한다. `%d`와 `%i`는
부호와 부호 없는 magnitude를 나누며, `%u`는 10진,
`%x`와 `%X`는 각각 소문자·대문자 16진 숫자를 만든다. `%p`는 `void *`를
`uintptr_t`, 다시 `unsigned long`으로 바꾸고 항상 `0x` 접두사를 붙인다.

숫자 함수는 나머지 연산으로 낮은 자리부터 고정 크기 스택 배열에 쌓은 뒤 역순으로
앞쪽 배열에 복사한다. 동적 할당이나 재귀는 없다. 그 뒤 공통 배치 함수가 다음
순서를 사용한다.

1. 오른쪽 정렬 공백
2. 부호 또는 `0x`/`0X` 접두사
3. 너비용 0
4. 정밀도용 0
5. 숫자
6. 왼쪽 정렬 공백

정밀도가 있으면 너비의 `0` flag를 적용하지 않는다. 숫자 정밀도 0과 값 0이
겹치면 자릿수를 생략한다. `%#.0x`는 `#` 접두사도 없지만 `%p`는 접두사를
항상 선택하므로 null `%.0p`의 현재 결과는 `0x`다.

## 수명과 플랫폼 경계

호출이 소유권을 넘겨받는 객체는 없다. `format`과 `%s` 입력 객체는 호출 동안
빌려 읽고 두 순회 사이에도 유효하고 안정적이어야 한다. `t_printf`, `t_format`,
두 `va_list`, 10진·16진 역순 배열과 64바이트 채움 버퍼는 모두 호출 스택에
있다. 출력 바이트만 fd 1이라는 외부 상태에 남는다.

선검증은 포인터 검증기가 아니다. 첫 순회도 `%s`를 읽고 포인터 인자를 꺼내므로
유효하지 않은 주소, 잘못된 타입, 부족한 인자는 출력 전 `-1`이 아니라 정의되지
않은 동작을 일으킬 수 있다. 다른 실행 흐름이 빌린 문자열을 동시에 바꾸는
경우에도 C의 동기화 규칙은 호출자가 책임진다.

파싱과 가변 인자 자체는 ISO C 시설을 사용한다. `va_copy`와 `<stdint.h>`는
C99에서 들어왔고 `uintptr_t` typedef는 이를 제공하는 구현에서만 존재한다.
출력은 `write`, `ssize_t`, `SSIZE_MAX`, `EINTR`에 의존하는 POSIX 경로다.
Makefile은 `-std=`를 고정하지 않으므로 compiler 기본 mode가 이 언어·platform
기능을 제공해야 한다.

포인터 변환이 손실 없으려면 `unsigned long`이 `uintptr_t`의 모든 값을 표현해야
한다. 이는 흔한 ILP32와 LP64에서는 성립하지만, 64비트 pointer와 32비트
`unsigned long`인 LLP64에서는 상위 비트가 잘릴 수 있다. 현재 문서가 대상으로
삼는 Darwin/Linux LP64 밖의 모든 C 데이터 모델을 지원하는 구현은 아니다.
