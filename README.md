# format-printer

포맷 문자열을 해석해 표준 출력(fd 1)으로 보내는 C 정적 라이브러리다. 배포
산출물은 `libftprintf.a`이고 공개 헤더의 함수는 하나다.

```c
int ft_printf(const char *format, ...);
```

성공하면 실제로 쓴 바이트 수를 `int`로 반환한다. 함수가 호출자에게 돌아오는
경우 `format == NULL`, 잘못된 프로젝트 포맷, 표현할 수 없는 전체 길이, 출력
실패는 `-1`이다. 포맷 오류와 길이 오류는 출력 전에 발견하지만, 시스템 출력
실패 전에 이미 나간 바이트는 되돌리지 못한다. 기본 `SIGPIPE`가 process를
종료하는 경우에는 반환 자체가 없으며 아래에서 구분한다.

## 프로젝트 포맷 문법

| 구분 | 지원 범위 |
| --- | --- |
| 변환 | `%c`, `%s`, `%p`, `%d`, `%i`, `%u`, `%x`, `%X`, `%%` |
| 플래그 | `-`, `0`, `#`, 공백, `+` |
| 필드 | 십진수 너비, `.` 뒤의 십진수 정밀도 |
| 출력 대상 | POSIX fd 1 (`FILE *stdout` buffer를 통하지 않음) |

길이 지정자, `*` 너비·정밀도, 위치 인자, 부동소수점, 로캘 형식은 지원하지
않는다. 플래그는 파서가 모든 지원 변환 앞에서 받아들이고, 각 변환이 의미 있는
플래그만 사용한다. 따라서 이 문법은 ISO C `printf` 전체나 그 모든 제약을
복제한 것이 아니라 이 프로젝트가 정한 부분집합이다.

정확히 `%%`인 두 바이트는 parser를 거치지 않는 fast path다. 반면 `%05%`는
parser가 `0`, 너비 5, `%`를 읽어 `0000%`를 만드는 프로젝트 확장이다. ISO C
`printf`의 percent 변환에 같은 field 문법이 있다고 일반화하면 안 된다.

`format`은 읽을 수 있는 NUL 문자열이어야 한다. `%s`는 정밀도가 없으면 NUL까지,
정밀도가 있으면 NUL 또는 그 최대 byte 수 중 먼저 만나는 지점까지 읽을 수 있어야
한다. 따라서 `"%.3s"`에는 읽을 수 있는 3바이트 객체라면 그 안의 NUL이 필수는
아니다. `%s`의 `(char *)NULL`은 `(null)`, `%p`의 `(void *)NULL`은 기본 형식에서
`0x0`으로 출력한다. 현재 숫자 정밀도 규칙에 따라 `%.0p`의 null은 `0x`가
되며, 이 조합과 너비·정렬·정밀도 경계는 고정 기대값 테스트로 검증한다. 가변 인자에는 런타임 타입
정보가 없으므로 지정자와 실제 타입이 호환되지 않거나 필요한 인자가 부족하면
일반적으로 C에서 정의되지 않은 동작이다. `va_arg`에는 대응하는
signed/unsigned 정수형이고 실제 값이 양쪽 모두에 표현되는 경우의 좁은 예외가
있지만, 런타임 type check가 생기는 것은 아니다. 호출자는 아래 문서가 지정한
정확한 promotion 후 타입을 맞춰야 한다. 특히 포인터에는 정수형일 수도 있는
꾸밈없는 `NULL`보다 타입을 붙인 null pointer를 전달해야 한다.

`%c`는 `int`를 plain `char`로 cast한 한 바이트를 쓴다. byte 범위 밖 정수의
plain `char` 변환은 구현에 의존할 수 있으며, ISO C `printf`가 규정하는
`unsigned char` 변환을 그대로 구현한 경로는 아니다.

```c
#include "ft_printf.h"

int	main(void)
{
	return (ft_printf("value: %#08x, text: %.3s\n",
			255u, "hello") < 0);
}
```

```sh
make
cc -Wall -Wextra -Werror -Iinclude main.c libftprintf.a -o app
```

현재 Makefile은 `-std=`를 고정하지 않는다. 빌드에 쓰는 compiler 기본 언어
mode가 `va_copy` 등 사용한 C 기능을 제공해야 하며, 출력 구현은 순수 ISO C가
아니라 POSIX `write` 환경을 요구한다.

## 현재 처리 순서

```text
va_start(original)
  -> va_copy(measure)
  -> 포맷·각 변환·전체 길이 측정
  -> va_end(measure)
  -> original va_list로 같은 포맷을 출력
  -> write 성공 길이와 오류 상태 누적
  -> va_end(original)
  -> count 또는 -1
```

첫 순회는 지원하지 않는 지정자, 끝나지 않은 `%`, 너비·정밀도 파싱 오버플로,
`INT_MAX`를 넘는 총 길이를 아무 출력 없이 거절한다. 그러나 `%s` 길이를 재거나
가변 인자를 꺼내려면 실제 메모리와 타입을 사용해야 한다. 따라서 잘못된 포인터,
잘못된 인자 타입·개수까지 안전하게 판별하는 검사는 아니다. `format`과 읽는
`%s` 객체는 측정과 출력 두 순회 동안 유효하고 안정적이어야 한다.

## 출력 실패, `errno`, `SIGPIPE`

실제 쓰기에서는 짧은 양수 반환만큼 전진하고 `EINTR`를 재시도한다. 그 밖의 음수
반환과 양의 요청에 대한 0바이트 반환은 오류 상태를 만들며, 호출이 정상적으로
돌아온다면 최종 결과는 `-1`이다. 비차단 출력의 `EAGAIN`을 기다리거나 남은
데이터를 보관하지 않는다.

라이브러리는 `errno`를 초기화하거나 별도 반환 계약으로 보존하지 않는다. 파싱·길이
오류는 특정 `errno`를 설정하지 않고, 재시도한 `EINTR`가 성공 뒤에도 남을 수
있다. 성공 여부는 반환값으로 판단해야 한다.

라이브러리는 프로세스의 `SIGPIPE` disposition도 바꾸지 않는다. 읽는 쪽이 닫힌
파이프에 쓸 때 signal이 차단되지 않았고 disposition이 기본이면 `ft_printf`가
`-1`을 반환하기 전에 프로세스가 종료될 수 있다. signal을 무시하거나 차단했거나
복귀하는 handler로 처리해 `write` 뒤 실행이 계속되는 환경에서는 `EPIPE`와 최종
`-1`을 관찰할 수 있다. 차단된 `SIGPIPE`는 pending 상태로 남아 나중에 차단을
풀 때 전달될 수 있다.

## 검증과 문서

```sh
make test
make release-check
make sanitize
make sanitize-linux
```

`make test`는 출력 바이트와 반환값을 비교하고, 쓰기 대역으로 짧은 쓰기·`EINTR`·
`EPIPE`·0바이트 반환을 결정적으로 만든다. `release-check`는 아카이브 멤버,
정의·외부 심볼, 공개 헤더와 아카이브만 사용한 소비자 링크를 검사한다.
`sanitize`는 UBSan, `sanitize-linux`는 Docker의 GCC AddressSanitizer 경로다.
이 검증들이 잘못된 가변 인자 호출, 유효하지 않은 포인터, 동시 출력의 원자성,
모든 ABI를 증명하지는 않는다.

현재 코드의 전체 흐름은
[포맷 처리 구조](architecture/format-processing-pipeline.md), 출력 외부 효과와
검증 범위는
[출력과 검증 경계](architecture/output-and-verification-boundaries.md), 구현
과정과 실패 조건은 [개발 기록](devlog/README.md)에서 이어진다.
