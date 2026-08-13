# 검증 지도와 증명 범위

검사는 질문별로 나뉜다. 한 검사의 성공을 다른 성질의 증명으로 확대하지 않는다.
아래 명령은 저장소가 제공하는 검증 경로와 각 경로의 한계를 설명한다.

## 기능 oracle

`tests/test_*.c`는 43개 API를 기능 영역별로 호출한다.

- ISO C 대응 함수는 libc 결과와 비교한다. 비교 함수는 정확한 음수값이 아니라
  부호를 비교해 표준이 허용하는 여러 반환 크기를 수용한다.
- 시스템에 항상 없는 BSD 계열 `strlcpy`, `strlcat`, `strnstr`는 테스트 안의
  독립 reference 구현과 비교한다.
- 생성 함수는 값뿐 아니라 새 주소인지, 빈 성공 결과인지, 누가 해제하는지 본다.
- memory test의 전체 버퍼 비교는 요청 범위 밖 바이트가 유지되는지도 본다.
- `ft_striteri`가 첫 NUL 삽입 뒤에도 최초 길이만큼 callback을 호출하는 현재
  계약을 고정한다.

이 oracle은 선택된 입력과 경계만 다룬다. 임의 크기 전체, 잘못된 포인터,
겹침이 금지된 API의 잘못된 사용, cycle 리스트를 안전하게 만든다는 증명이 아니다.
libc와 비교한다는 사실도 locale·ABI·모든 구현 차이의 동일성을 뜻하지 않는다.

## 결정적 실패 주입

`make failure-test`는 전체 제품 소스를 별도 객체로 컴파일하면서
`malloc=test_malloc`, `free=test_free`로 이름을 바꾼다. 실패시키는 것은 지정된
순번의 `malloc`이다. `test_free`는 실패하지 않으며 살아 있는 할당과 잘못된
해제를 계측한다.

이 방식은 단일 할당 함수, `ft_split`의 배열과 각 field, `ft_lstmap`의 노드
할당 위치를 결정적으로 지난다. callback 내부의 임의 자원, 실제 allocator의
fragmentation, 운영체제 메모리 부족 양상까지 재현하지는 않는다.

`make write-failure-test`는 `ft_fd_output.c`만 `write=test_write`로 다시
컴파일한다. 짧은 성공, `EINTR`, 0, `EIO`, `EPIPE`의 정해진 순서를 주고 요청
길이·fd·성공 바이트·후속 호출 중단을 확인한다. 실제 kernel pipe 용량,
signal delivery timing, 기본 `SIGPIPE`로 인한 프로세스 종료, 비블로킹 준비
상태를 재현하는 검사는 아니다.

## sanitizer와 leak 도구

| 명령 | 대상 | 발견할 수 있는 범위 | 남는 한계 |
| --- | --- | --- | --- |
| `make asan` | ASan 전용 전체 객체와 일반 테스트 | 실행 경로의 주소 범위·use-after-free 일부 | 기본 설정은 `detect_leaks=0`; 미실행 경로는 보지 못한다 |
| `make sanitize` | UBSan 전용 전체 객체와 일반 테스트 | 계측 가능한 정의되지 않은 동작 | 모든 UB나 논리 오류를 증명하지 않는다 |
| `make leak` | 일반 테스트 실행 | 설치된 `leaks` 또는 `valgrind`가 관찰한 누수 | 둘 다 없으면 실패하며 실패 주입 전체를 대신하지 않는다 |

서로 다른 계측 플래그의 객체는 `build/asan`, `build/ubsan`,
`build/failure`, `build/write-failure`로 분리된다. Make가 명령행 플래그
변경만으로 기존 객체를 반드시 재빌드한다는 가정을 피한다.

## archive와 소비자 경계

`make check-archive`의 `tests/check_archive.sh`는 다음을 확인한다.

1. `ar t`의 객체 이름이 `tests/archive-members.txt`의 17개와 정확히 일치한다.
2. 정의된 전역 심볼이 `tests/api-symbols.txt`의 43개와 일치한다.
3. 외부 미정의 심볼이 `malloc`, `free`, `write`와 운영체제별 `errno`
   접근자만 남는다.
4. 저장소 밖 임시 디렉터리의 작은 소비자가 `libft.h`와 `libft.a`만으로
   컴파일·링크·실행된다.

이는 배포 파일 구성과 대표 소비 경로를 검증한다. 심볼 이름만으로 매개변수 타입,
구조체 layout, 전체 호출 규약을 증명하지 않으며 smoke consumer는 43개 함수를
모두 사용하지 않는다. 검사 스크립트의 심볼 처리는 Darwin과 Linux만 지원한다.

## toolchain과 release 순서

`make check-compilers`는 버전 문자열로 Clang과 GNU GCC를 각각 찾아 임시 복사본에서
`all`, `test`, `failure-test`, `write-failure-test`, `check-archive`를 수행한다.
두 종류 중 하나가 없으면 건너뛰지 않고 실패한다. 이는 현재 설치된 두 compiler와
host ABI의 관찰이며 32비트, big-endian, Windows, 다른 표준 라이브러리를
보장하지 않는다.

`make check`는 `git diff --check`, 깨끗한 재빌드, 기능 테스트, 두 실패 주입,
UBSan, archive, compiler, leak 순으로 실행한다. ASan은 별도 `make asan`이다.
기능·실패·메모리·배포 질문을 쌓는 release 절차이지 수학적 완전성 증명은 아니다.

## 문서 변경의 정적 감사

문서 작업은 실행 검사와 분리해 다음을 확인한다.

- `git diff --check`로 공백 오류를 확인한다.
- `git ls-files`, `rg`로 문서가 언급한 경로·43개 심볼·17개 소스를 확인한다.
- 상대 Markdown 링크의 대상이 실제 파일인지 확인한다.
- 개발 기록의 커밋 제목과 코드 단계가 실제 이력 순서와 일치하는지 확인한다.
- 문서 manifest에 초안이나 합본 문서가 섞이지 않았는지 확인한다.

이 정적 감사는 제품 실행 결과를 새로 증명하지 않는다. 반대로 제품 테스트가
문서의 링크, 현재/과거 코드 라벨, 설명의 논리적 완결성을 자동 검증하지도 않는다.
