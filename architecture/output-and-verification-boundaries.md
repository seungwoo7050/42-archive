# 출력과 검증 경계

## 출력 상태와 외부 효과

현재 `t_printf`는 출력 fd, 성공한 바이트 수, 오류 bit를 한 호출의 상태로 가진다.

```c
typedef struct s_printf
{
	int	fd;
	int	count;
	int	error;
}	t_printf;
```

공개 진입점은 `fd = 1`로 초기화하며 모든 리터럴·변환·채움은
`ft_printf_write`를 지난다. 이 객체와 변환용 배열은 스택에 있고 heap 소유권은
없다. 반면 성공한 `write`는 프로세스 밖에서도 관찰 가능한 되돌릴 수 없는 외부
효과다.

`ft_printf_write`의 현재 상태 전이는 다음과 같다.

```text
error가 이미 있음 -> -1, 추가 write 없음
남은 길이 0      -> 성공
write < 0, EINTR  -> 같은 구간 재시도
그 밖의 write <= 0 -> error = 1, -1
write > 0, count 합이 int 범위 -> buffer/count/remaining 전진
write > INT_MAX 또는 count 합 초과
  -> 이미 외부에 써진 byte는 남고 count는 갱신하지 않은 채 error = 1, -1
```

요청 길이는 `SSIZE_MAX` 이하로 자른다. 짧은 양수 반환이면 성공한 길이만큼만
주소와 남은 길이를 갱신한다. 단, 반환 길이와 기존 count의 합을 검사하는 시점은
`write`가 양수로 성공한 뒤다. 합을 `int`로 표현할 수 없으면 그 호출이 이미
외부에 기록한 byte를 되돌릴 수 없고 내부 count도 더하지 않은 채 오류를
고정한다. 양의 요청에 대한 0은 진행이 없는 상태이므로 무한 반복 대신 실패로
바꾼다. 한 번 `error`가 설정되면 깊은 숫자 배치에서 호출자까지 `-1`이 전파되고
뒤의 출력은 시도하지 않는다.

첫 측정 순회도 총 길이가 `INT_MAX` 안인지 확인한다. 출력 상태가 실제 성공
길이에도 같은 범위 검사를 두는 것은 반환형의 방어를 외부 호출 결과와 가까운
곳에서도 유지하기 위해서다.

## 포맷 원자성과 출력 원자성은 다르다

지원하지 않는 포맷과 길이 초과는 첫 `write` 전에 거절되므로 포맷 오류에 대해서는
부분 출력이 없다. 장치 오류는 실제 출력 중 생길 수 있어 이미 쓴 리터럴·접두사·
문자열을 rollback할 수 없다. 이 경우 호출이 돌아온다면 일부 바이트가 남아도
최종 반환값은 `-1`이고, 공개 API는 실패 전 성공 바이트 수를 별도로 돌려주지
않는다.

호출 하나가 여러 `write`로 분할되므로 여러 thread나 process가 같은 stdout을
공유하면 호출 단위 직렬화도 제공하지 않는다. pipe의 개별 원자 쓰기 보장이
적용되는 경우라도 전체 `ft_printf` 호출을 하나의 write로 만들지는 않는다.
stdio의 별도 사용자 버퍼와 섞어 쓸 때의 순서도 라이브러리가 조정하지 않는다.
하나의 완전한 로그 record가 필요하면 호출자가 버퍼 구성과 잠금, 대상별 원자
쓰기 한계를 별도로 설계해야 한다.

## `errno`와 `SIGPIPE`

공개 오류 계약은 `errno`가 아니라 반환값이다. 함수는 진입 때 `errno`를 0으로
만들지 않는다. `format == NULL`, 파싱 실패, 미지원 지정자, 길이 초과와 내부
0바이트 write 판단은 특정 `errno`를 설정하지 않는다. `EINTR` 뒤 재시도가
성공해도 이전 값이 남을 수 있다. 재시도하지 않는 실제 음수 `write`에서는
system call이 남긴 값이 관찰될 수 있지만 이를 모든 실패의 분류 코드로 약속하지
않는다.

닫힌 pipe나 socket에 쓰면 `write` 오류와 함께 `SIGPIPE`가 전달될 수 있다.
라이브러리는 disposition을 무시로 바꾸거나 handler를 설치하지 않는다.

- signal이 차단되지 않은 기본 disposition: 함수가 반환하기 전에 process가
  종료될 수 있다.
- 호출자가 무시: `write`의 `-1/EPIPE`를 받아 `ft_printf`가 `-1`을 반환할 수
  있다.
- 호출자가 차단: `write`의 `-1/EPIPE`와 함수의 `-1`을 관찰할 수 있지만
  `SIGPIPE`는 pending으로 남아 차단 해제 뒤 전달될 수 있다.
- 호출자가 복귀하는 handler 설치: handler 실행 뒤 같은 `EPIPE` 경로를 관찰할
  수 있다.

일반 테스트의 SIGPIPE 사례는 복귀하는 handler 환경을 만들고, handler가 한 번
호출되며 라이브러리가 그 정책을 바꾸지 않았는지 확인한다. 차단된 signal이나
차단되지 않은 기본 disposition에서도 항상 같은 관찰이 나온다고 증명하는
테스트가 아니다.

## 검증이 증명하는 범위

### 기능 비교

`tests/test_ft_printf.c`는 정의된 비교 조합을 `snprintf`와 대조하며 실제 stdout
바이트 수와 반환값을 함께 검사한다. NUL 문자처럼 C 문자열 비교로 볼 수 없는
출력도 길이와 `memcmp`로 확인한다. `(null)`, `0x0`, 프로젝트가 정한 일부
형식은 고정 기대 바이트를 사용한다.

이 비교는 모든 ISO C `printf` 동작을 복제한다는 증명이 아니다. 프로젝트 밖의
문법, 표준이 구현별 표현을 허용하는 pointer, 정의되지 않은 flag·argument
조합을 무차별하게 oracle로 삼지 않는다.

### 출력 실패 주입

`tests/test_output_faults.c`는 `FT_PRINTF_TEST_WRITE` 빌드에서 실제 system
call을 결정적 대역으로 바꾼다. 다음을 확인한다.

- 짧은 쓰기 뒤 남은 구간
- `EINTR` 전후 같은 구간과 이후 성공
- 첫 `EPIPE`
- 일부 성공 뒤 `EPIPE`
- 양의 요청에 대한 0
- 너비 1,000의 채움을 64바이트 이하 묶음으로 출력

이 검사는 비차단 fd의 readiness, 실제 scheduler·signal timing, 모든
`errno`, 동시 호출 interleaving을 재현하지 않는다.

### 배포물과 sanitizer

`tests/check_release.sh`는 9개 archive member, 17개 정의 전역 심볼, 플랫폼별
외부 심볼을 정확히 비교한다. 공개 헤더와 archive만 임시 디렉터리로 복사해
소비자를 링크·실행하고 임시 파일 정리도 확인한다. 이는 승인된 배포 모양을
검사하지만 내부 심볼을 숨겼다거나 모든 ABI에서 의미가 같다는 증명은 아니다.

UBSan과 AddressSanitizer는 실행한 정상·오류 사례의 산술·메모리 문제를 찾는다.
테스트가 의도적으로 만들지 않는 잘못된 가변 인자 타입·개수, 유효하지 않은
pointer, `INT_MAX` 크기의 실제 출력, LLP64 pointer 변환, data race와 동시
출력 원자성을 보장하지 않는다.
