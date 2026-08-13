# cpp-foundation

`cpp-foundation`은 C++98의 객체 모델과 자원 관리 원칙을 여섯 프로그램으로
검증하는 프로젝트입니다. 값 객체에서 시작해 직접 소유한 메모리, 다형적 복제,
예외 안전성, 타입 경계와 배치 처리까지 순서대로 확장합니다.

구현이 형성된 순서는 [개발 기록](devlog/README.md), 현재 구조와 공개 범위는
[프로그램 구조와 객체 모델](architecture/program-structure-and-object-model.md),
[여섯 CLI와 정적 라이브러리의 릴리스 계약](architecture/six-cli-and-library-release-contract.md)에서
확인할 수 있습니다. 처음 읽는다면 [현재 공개 계약](docs/public-contracts.md)과
[검증 지도](docs/verification.md)를 함께 보면 됩니다.

## 지원 환경

- C++98을 지원하는 GCC 또는 Clang
- POSIX `sh`, `make`, `ar`
- LP64 데이터 모델: 8비트 바이트, 32비트 `int`, 64비트 `long`·포인터·`size_t`

일반 빌드와 회귀 검사는 Linux와 macOS에서 실행할 수 있습니다. 아카이브 심볼, Mach-O 의존성과 `leaks` 검사는 macOS 도구가 필요합니다. AddressSanitizer 작업은 CI에 정의된 Ubuntu의 GCC·Clang 조합에서 실행하며, macOS 작업은 UndefinedBehaviorSanitizer까지만 실행합니다.

모든 소스는 다음 옵션으로 컴파일합니다.

```text
-Wall -Wextra -Werror -Wpedantic -pedantic-errors
-std=c++98 -Wold-style-cast -Wcast-qual
-Woverloaded-virtual -Wnon-virtual-dtor -Wc++11-extensions
```

## 프로그램 구성

| 프로그램 | 실행 파일 | 주요 내용 |
| --- | --- | --- |
| 00 | `ex00_contact_book` | 클래스, 스트림, 캡슐화, 고정 크기 상태 |
| 01 | `ex01_text_buffer` | 동적 자원, 깊은 복사, 정규 클래스 형식, 연산자 |
| 02 | `ex02_format_pipeline` | 상속, 추상 인터페이스, 다형적 복제 |
| 03 | `ex03_pipeline_factory` | 예외, 팩터리, 소유권 이전, 상태 복원 |
| 04 | `ex04_type_boundary` | 스칼라 변환, 실행 시간 타입, 주소 토큰 |
| 05 | `ex05_batch_engine` | 템플릿, 반복자, 컨테이너, 알고리즘 |

`Contact`는 이름과 메모를 검증하는 값 객체입니다. `ContactBook`은 연락처를 여덟 개까지 입력 순서대로 저장하며, 가득 차면 가장 오래된 항목을 교체합니다. 저장 항목은 읽기 전용으로만 공개합니다.

## 빌드와 실행

`make`는 정적 라이브러리 `libcpp_foundation.a`와 여섯 실행 파일을 만듭니다.

```sh
make
make test
make check-build
```

`make test`는 단위 검사, 실패 주입, 복사 생략을 끈 검사, 컴파일 조건, 통합 검사와 고정 시드 속성 검사를 실행합니다. `make check-build`는 산출물을 지우고 다시 빌드한 뒤 같은 검사와 CLI 결정성, LP64 데이터 모델을 확인합니다.

```sh
printf 'ADD Ada|objects\nLIST\nQUIT\n' | ./bin/ex00_contact_book
```

`ADD 이름|메모`, `LIST`, `QUIT` 명령을 한 줄씩 처리합니다.

```sh
./bin/ex01_text_buffer hello world
```

`TextBuffer`는 NUL 종료 문자열을 직접 소유하며 깊은 복사, 자기 대입, 결합과 비교를 지원합니다. 두 입력을 각각 소유한 뒤 결합한 값을 출력합니다.

```sh
./bin/ex02_format_pipeline mixed
```

`FormatPipeline`은 전달받은 포매터의 복제본을 소유합니다. 앞 문자열 추가, 대문자 변환, 뒤 문자열 추가를 차례로 적용해 `[MIXED]`를 출력하며, 파이프라인 자체도 깊은 복사를 지원합니다.

```sh
./bin/ex03_pipeline_factory mixed 'prefix=[' upper 'suffix=]'
```

문자열 명세로 포매터를 만들고 파이프라인을 한 번에 교체합니다. 생성이나 소유권 이전 중 예외가 발생하면 기존 파이프라인을 유지합니다.

```sh
./bin/ex04_type_boundary scalar 17.5
./bin/ex04_type_boundary runtime A
./bin/ex04_type_boundary address 7 alpha
```

`ScalarConverter`는 일관된 리터럴 해석 결과를 각 스칼라 타입으로 출력합니다. `RuntimeInspector`는 등록된 다형 타입만 식별하며, 알 수 없는 파생 타입과 널 포인터를 `runtime_unknown`으로 처리합니다.

주소 토큰은 데이터를 직렬화하지 않습니다. 같은 프로세스에서 원래 `Payload`가 살아 있는 동안 포인터 표현을 왕복할 때만 유효하며, 객체를 복사하거나 소유하지 않습니다.

```sh
./bin/ex05_batch_engine rpn '8 3 -'
./bin/ex05_batch_engine batch < tests/fixtures/batch-basic.in
```

RPN 계산기는 부호 있는 `long` 리터럴과 `+`, `-`, `*`, `/`를 처리하며 연산 전에 오버플로를 검사합니다. 일괄 입력은 `이름 | RPN 식` 형식이고 결과를 `(값, 이름)` 순서로 정렬합니다.

`RandomAccessBatch::sort`는 임의 접근 컨테이너를 요구합니다. `BatchEngine::replace`는 입력 전체가 유효하고 이름이 중복되지 않을 때만 이전 결과를 교체합니다.

## 공개 계약

소유권, 값·참조 반환, 예외 뒤 상태와 CLI별 종료 정책은
[현재 공개 계약](docs/public-contracts.md)에 모았습니다. 특히 다음 범위를
구분해야 합니다.

- `ContactBook`, `TextBuffer`, `FormatPipeline`과 두 `replace()` 연산이 어떤
  상태에 strong guarantee를 제공하는지
- `clone()`과 factory의 원시 포인터 반환에서 타입으로 강제되지 않는 전제
- `Serializer` 주소 토큰과 `results()`·`at()` 참조의 실제 수명
- 객체 내부 상태가 유지돼도 stream 소비 위치나 부분 출력, 사용자 formatter의
  외부 부작용은 rollback되지 않는다는 점

## 검증 지도

프로젝트가 제공하는 주요 경로는 다음과 같습니다.

```sh
make test
make check-portable
make check-platform       # macOS 전용
make test-asan CXX=g++    # Linux
```

각 target의 포함 관계, 실패 주입 방식, property timeout, sanitizer와 archive
manifest가 실제로 증명하는 범위는 [검증 지도](docs/verification.md)에 정리했습니다.

## 파일 구성

```text
apps/                 여섯 명령행 프로그램의 진입점
include/cppf/         공개 헤더
src/                  라이브러리 구현
tests/                단위·실패·컴파일·통합 검사
tests/manifests/      산출물 검증용 목록
docs/                 현재 계약과 검증 범위
architecture/         현재 객체·배포 구조와 실패 경계
devlog/               구현 형성 순서와 검증 확대 기록
.github/workflows/    GCC·Clang 회귀 검사
```
