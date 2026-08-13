# 여섯 CLI와 정적 라이브러리의 릴리스 계약

빌드 산출물은 정적 라이브러리 하나와 여섯 CLI이다. 헤더만 컴파일되는지 확인하는
것과 실제 소비자가 아카이브를 링크해 실행하는지는 다른 계약이므로 검사를 나누어
둔다.

## 빌드 그래프

```text
src/*.cpp
  └─▶ build/obj/*.o
        └─▶ libcpp_foundation.a
              ├─▶ bin/ex00_contact_book
              ├─▶ bin/ex01_text_buffer
              ├─▶ bin/ex02_format_pipeline
              ├─▶ bin/ex03_pipeline_factory
              ├─▶ bin/ex04_type_boundary
              └─▶ bin/ex05_batch_engine
```

공개 소비자는 `include/cppf`와 `libcpp_foundation.a`만 사용한다. 애플리케이션
소스, 내부 `src/ScalarLiteral.hpp`와 테스트 지원 헤더는 공개 범위가 아니다.

## CLI 계약

| 실행 파일 | 입력 | 성공 출력 | 대표 오류 |
| --- | --- | --- | --- |
| `ex00_contact_book` | 표준 입력의 `ADD`, `LIST`, `QUIT` | 연락처 목록 | 잘못된 명령·연락처 |
| `ex01_text_buffer` | 두 문자열 인자 | 결합 결과 | 인자 수 |
| `ex02_format_pipeline` | 문자열 하나 | `[UPPER]` 형태 | 인자 수 |
| `ex03_pipeline_factory` | 값과 포매터 명세 | 적용 결과 | 알 수 없는 명세 |
| `ex04_type_boundary` | `scalar`, `runtime`, `address` 모드 | 모드별 변환 결과 | 문법·범위·모드 |
| `ex05_batch_engine` | `rpn` 인자 또는 `batch` 표준 입력 | 계산·정렬 결과 | 산술·행 형식·중복 |

CLI 검사는 종료 코드, 표준 출력과 표준 오류를 함께 비교한다. 출력이 같더라도
오류가 표준 출력에 섞이거나 실패가 0을 반환하면 자동화에서 다른 결과가 된다.
명령별 정확한 정상·오류 정책은
[현재 공개 계약](../docs/public-contracts.md#cli-경계)에 정리했다.

## 공개 헤더 계약

`make test-contract`는 공개 헤더를 `-Iinclude`만으로 컴파일한다. 성공해야 하는
헤더 조합과 실패해야 하는 사용법을 함께 둔다.

- private 생성자나 저장소에 직접 접근할 수 없다.
- `Formatter`는 추상 타입으로 직접 만들 수 없다.
- 저장된 연락처와 배치 결과는 변경 가능한 참조로 노출되지 않는다.
- `Serializer`는 `const Payload*`를 소유 가능한 포인터처럼 바꾸지 않는다.
- `RandomAccessBatch::sort()`는 임의 접근 반복자를 제공하는 컨테이너에서만
  컴파일된다.

의도된 실패 검사는 컴파일러 진단 문구가 아니라 종료 상태를 본다. 컴파일러마다
문장이 달라도 같은 계약을 검사할 수 있기 때문이다. 템플릿 클래스에 컨테이너를
지정하는 순간 모든 멤버가 한꺼번에 인스턴스화되는 것은 아니다.
`std::list`를 지정해 객체를 만들고 `push_back()`이나 `begin()`·`end()`를 사용하는
것까지 금지하는 검사가 아니라, 그 객체에서 `sort()`를 호출했을 때 임의 접근 반복자
요구 조건이 드러나는지를 확인한다. 멤버별 요구 조건과 해당 부정 컴파일 코드는
[배치 템플릿 개발 기록](../devlog/11-random-access-batch.md#3단계-sort가-요구하는-것은-컨테이너-이름이-아니다)에
이어져 있다.

## template와 번역 단위

`RandomAccessBatch`와 `equal_ranges`의 정의는
`include/cppf/RandomAccessBatch.hpp`에 있다. template은 구체 타입을 사용하는
소비자 번역 단위에서 필요한 멤버가 인스턴스화되므로 선언만 archive에 넣어서는
일반 소비자가 임의의 `T`와 `Container` 조합을 만들 수 없다.

header 안 정의는 여러 번역 단위가 같은 정의를 보게 되는 구조다. 소비자가
include 순서나 매크로에 따라 서로 다른 template 정의를 만들면 ODR을 위반한다.
프로젝트의 공개 헤더는 include guard와 동일한 C++98 flags 아래에서 같은 정의를
제공한다. 이 경계는 다음 검사를 서로 다르게 사용한다.

- header compile 검사는 각 공개 헤더가 필요한 선언을 스스로 포함하는지 본다.
- compile-fail 검사는 `list`에서 `sort()`를 호출하는 식의 멤버별 요구 조건을
  고정한다.
- 외부 소비자 검사는 여러 공개 타입을 archive 구현과 실제로 링크한다.

template 인스턴스 자체를 모두 `libcpp_foundation.a`가 제공한다는 계약은 없다.
반대로 `ContactBook`이나 `BatchEngine`처럼 `src/*.cpp`에 정의한 non-template
멤버는 archive에서 해결되어야 한다.

## 외부 소비자 검사

저장소 내부에서는 `-Itests`나 현재 디렉터리 때문에 누락된 포함 파일을 우연히 찾을
수 있다. `tests/check_external_consumer.sh`는 소비자 파일을 임시 디렉터리로
복사하고 다음 입력만 제공한다.

```text
-I<repository>/include
<repository>/libcpp_foundation.a
```

이 검사는 공개 헤더와 아카이브의 자급성을 확인하지만 설치 경로 재배치, 공유
라이브러리 ABI나 이전 버전 바이너리 호환성을 약속하지는 않는다.

## 검사 계층

| 명령 | 확인 범위 |
| --- | --- |
| `make test` | 단위, 실패 주입, 복사 생략 비활성화, 컴파일·CLI·소비자·속성 검사 |
| `make check-build` | 깨끗한 재빌드, 같은 회귀, CLI 결정성과 LP64 |
| `make check-portable` | 공통 검사와 UBSan |
| `make check-platform` | macOS 아카이브·Mach-O·`leaks` 검사 |
| `make test-asan CXX=g++` | Linux AddressSanitizer |
| `make check` | portable과 macOS 전용 검사를 연속 실행 |

`make check-platform`을 Linux에서 실행하거나 `make check`를 모든 플랫폼의 공통
명령으로 소개하면 안 된다. 반대로 `make test`만으로 아카이브 멤버, Mach-O
의존성이나 누수를 확인했다고 말할 수도 없다.

## 산출물 안정성

`tests/manifests`는 아카이브 멤버, 정의된 외부 linkage 심볼과 Mach-O 의존성의
예상 목록을 보관한다. 이 심볼 집합에는 공개 헤더 API뿐 아니라 내부 helper,
protected constructor, vtable과 typeinfo도 들어갈 수 있다. 따라서 manifest는
“공개 API 목록”이 아니라 link surface와 산출물 변화 감지 장치다. 공개 API는
`include/cppf`와 compile/consumer contract를 함께 보고 판단한다.

구현을 바꿔 심볼이 달라졌다면 목록을 무조건 갱신하기 전에 외부 계약이나 내부
link surface가 의도치 않게 변한 것은 아닌지 확인해야 한다.

CLI 결정성 검사는 같은 입력의 출력과 종료 상태를 반복 비교한다. 고정 시드 속성
검사는 스칼라, RPN과 대용량 배치 경계를 넓히지만 성능 기준이나 모든 입력의 증명은
아니다.

## 지원 범위

현재 빌드는 C++98과 LP64를 요구하며 GCC·Clang, Linux·macOS 조합을 대상으로
한다. 32비트 ILP32, 설치 프로그램, 패키지 버전 정책과 ABI 호환성은 제공하지
않는다. 공개 범위를 바꿀 때는 README, 헤더 컴파일, 외부 소비자와 산출물 검사를
같이 갱신해야 한다.

검사 계층과 각 증거의 한계는 [검증 지도](../docs/verification.md)에 분리했다.
