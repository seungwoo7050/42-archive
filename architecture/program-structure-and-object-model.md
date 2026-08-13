# 프로그램 구조와 객체 모델

여섯 CLI는 하나의 큰 응용 프로그램을 나눈 것이 아니라 서로 다른 C++98 객체
경계를 독립적으로 실행한다. 공통 구현은 `libcpp_foundation.a`에 두고, 각
`apps/ex*.cpp`는 입력을 해석해 라이브러리를 호출하고 결과를 출력하는 역할만
맡는다.

## 계층

```text
apps/ex00..ex05
        │
        ▼
include/cppf/*.hpp  ── 공개 타입과 계약
        │
        ▼
src/*.cpp           ── 소유권, 파싱과 상태 전이
        │
        ▼
tests/              ── 단위·실패·컴파일·통합 검사
```

공개 헤더는 `tests`의 지원 타입에 의존하지 않는다.
`tests/check_external_consumer.sh`는 저장소 밖 임시 디렉터리에서 `-Iinclude`와
정적 아카이브만으로 소비자 코드를 컴파일해 이 경계를 확인한다.

앞의 객체 단계는 `include/cppf/Contact.hpp`, `include/cppf/ContactBook.hpp`,
`include/cppf/TextBuffer.hpp`, `include/cppf/Formatter.hpp`와
`include/cppf/FormatPipeline.hpp`에 공개한다. 팩터리와 변환 단계는
`include/cppf/Factory.hpp`, `include/cppf/ScalarConverter.hpp`,
`include/cppf/RuntimeType.hpp`, `include/cppf/Serializer.hpp`로 이어진다.
마지막 배치 단계의 공개 표면은 `include/cppf/RandomAccessBatch.hpp`,
`include/cppf/RpnEvaluator.hpp`, `include/cppf/BatchEngine.hpp`다. 구현 전용
리터럴 타입처럼 소비자가 직접 만들 필요가 없는 선언은 `src` 안에 남긴다.

## C의 저장소에서 C++ 객체로

C에서 구조체를 할당한 뒤 초기화 함수와 정리 함수를 따로 호출했다면, C++ 객체는
생성자가 불변식을 만든 시점부터 소멸자가 실행될 때까지 유효한 수명을 갖는다.
멤버 객체는 선언 순서로 생성되고 역순으로 파괴된다. 생성자가 던져 완성되지 않은
가장 바깥 객체의 소멸자는 호출되지 않지만, 이미 완성된 멤버와 base subobject는
자동으로 정리된다.

이 프로젝트의 타입은 같은 복사 정책을 쓰지 않는다.

| 타입 | 생성·복사 정책 | 이유 |
| --- | --- | --- |
| `Contact`, `JobResult` | `std::string` 멤버의 컴파일러 생성 복사를 사용 | 각 멤버가 독립 값을 소유하므로 memberwise copy가 올바르다. |
| `TextBuffer` | 복사 생성자·대입·소멸자를 함께 정의 | `char*` 주소만 복사하면 두 객체가 같은 배열을 지우게 된다. |
| `FormatPipeline` | 각 formatter를 `clone()`하고 부분 생성 실패를 직접 정리 | 기반 포인터 배열의 얕은 복사는 동적 타입과 단독 소유권을 잃는다. |
| `RuntimeBase` 계층 | base의 virtual destructor로 파생 객체를 삭제 | public 상속을 “기반 타입으로 사용할 수 있음”이라는 계약으로 쓴다. |

`const` 멤버 함수는 논리적으로 읽기 전용인 객체에서도 호출할 수 있게 한다.
반환 타입은 별도 문제다. `ContactBook::at()`과 `BatchEngine::results()`는 내부
값의 `const` 참조를 빌려 주므로 복사 비용을 줄이는 대신 소유 객체의 변경·파괴
조건을 따른다. `FormatPipeline::apply()`와 `RpnEvaluator::evaluate()`는 호출
뒤 독립적으로 사용할 값을 반환한다.

## 값과 고정 용량 상태

`Contact`는 이름과 메모가 유효한 경우에만 만들어지는 값 객체이다.
`ContactBook`은 여덟 슬롯을 값으로 소유하고, 논리 순서와 물리 슬롯을 분리한다.
가득 찬 상태에서 새 연락처를 넣을 때는 교체 후보를 먼저 완성한 뒤 슬롯과 순서를
함께 갱신한다. 복사나 할당이 실패하면 기존 목록이 그대로 남아야 한다.

흔한 실수는 대상 슬롯에 필드를 하나씩 직접 쓰는 것이다. 중간 할당이 실패하면
이름만 새 값이고 메모는 이전 값인 연락처가 남을 수 있다.

## 직접 소유한 메모리

`TextBuffer`는 NUL 종료 배열 하나를 소유한다. 복사 생성자는 새 저장소를 완성한
뒤 객체 상태로 채택하고, 대입은 복사 후 교환 방식으로 자기 대입과 할당 실패를
같이 처리한다.

```text
원본 ──owns──▶ char[]
복사본 ──owns──▶ 별도의 char[]
```

저장소 주소를 그대로 복사하거나 새 메모리를 얻기 전에 기존 메모리를 지우면 각각
이중 해제와 강한 예외 보장 위반으로 이어진다.

## 다형 객체의 복제

`Formatter`는 가상 소멸자와 `clone()`을 공개한다. `FormatPipeline`은 전달받은
포인터를 빌리는 대신 복제본을 소유하고, 복사할 때도 각 동적 타입의 `clone()`을
호출한다.

파이프라인 복사 중 일부 복제만 성공할 수 있으므로 새 포인터 배열은 완성 전까지
임시 소유 상태로 관리한다. 실패하면 성공한 복제본만 지우고 기존 객체에는
손대지 않는다.

`PipelineBuilder::replace`도 같은 원칙을 사용한다.

```text
문자열 명세
  → 포매터 후보 생성
  → 파이프라인 후보 완성
  → 성공한 경우에만 기존 파이프라인과 교체
```

팩터리에서 받은 원시 포인터를 즉시 컨테이너에 넣기 전에 임시 소유자를 두지 않으면
뒤 단계의 예외에서 누수가 생긴다.

`Formatter`의 public 상속은 구현 재사용만을 위한 관계가 아니다. 기반 참조 하나로
각 파생 formatter를 호출할 수 있고, virtual dispatch가 실제 동적 타입의
`apply()`와 `clone()`을 선택한다. 순수 가상 함수는 이 공통 계약을 선언하면서
`Formatter` 자체 생성을 막는다. 기반 destructor가 virtual이 아니면
`FormatPipeline`이 `Formatter*`를 지울 때 파생 destructor가 실행된다는 보장이
없다.

다만 `clone()`의 반환 타입은 원시 포인터다. null이 아닌 새 단독 소유 객체를
반환한다는 조건은 타입으로 강제되지 않는다. 사용자 파생 타입이 빌린 주소나 null을
반환하면 pipeline의 dereference·delete 전제가 깨진다.

## 변환과 타입 경계

`ScalarLiteral`은 입력 문법을 분류하고, `ScalarConverter`는 그 결과를 `char`,
`int`, `float`, `double`로 투영한다. 파싱 성공과 대상 타입 표현 가능성을 같은
조건으로 합치지 않는다. NaN, 무한대, 소수, 범위 밖 정수는 타입마다 결과가
다르다.

`RuntimeInspector`는 기반 포인터를 `dynamic_cast`로 확인하지만 외부에 임의의 정수
태그를 받지 않는다. 선언된 `RuntimeKind`만 생성할 수 있으며 알 수 없는 파생
타입과 널 포인터는 `runtime_unknown`으로 처리한다.

`Serializer`는 `Payload*`와 `uintptr_t`를 같은 프로세스 안에서 왕복한다. 주소
토큰은 객체를 복사하거나 수명을 늘리지 않는다. 객체가 파괴된 뒤 역변환하거나
다른 프로세스·실행에 저장한 값을 재사용하면 안 된다.

## 템플릿과 배치 상태

`RandomAccessBatch::sort`는 `operator+`, 차이 계산과 임의 위치 교환이 가능한 반복자를
요구한다. `vector`와 `deque`에는 맞지만 `list`에는 맞지 않으며, 컴파일 실패
검사가 이 제약을 고정한다.

`RpnEvaluator`는 `long` 계산 전에 덧셈·뺄셈·곱셈·나눗셈의 범위를 검사한다.
계산한 뒤 오버플로를 찾으려 하면 이미 정의되지 않은 동작이 발생할 수 있다.

`BatchEngine::replace`는 입력 전체를 임시 결과로 읽고 다음 조건을 모두 통과한 뒤
상태를 교체한다.

- 입력에 한 행 이상이 있다.
- 각 행이 `이름 | RPN 식` 형식이다.
- 이름이 비어 있지 않고 서로 중복되지 않는다.
- 모든 RPN 식이 유효하고 산술 범위 안에 있다.
- 결과를 정렬할 수 있다.

빈 입력은 `invalid batch input`으로 거부한다. 단위 검사는 이미 결과가 들어 있는
엔진에 빈 스트림을 넘긴 뒤 예외가 발생하고 이전 출력이 그대로인지 확인한다.
따라서 빈 입력, 마지막 행의 오류나 정렬 중 할당 실패 모두 이전 결과를 바꾸지
않는다.

## 실패 뒤 상태

“예외에 안전하다”는 말 대신 영향을 받는 객체와 외부 상태를 나눈다.

| 연산 | 프로젝트 객체 | 외부·빌린 상태 |
| --- | --- | --- |
| `ContactBook::add` | 교체 후보 복사 실패 시 book 유지 | 이전 `at()` 참조는 성공한 슬롯 교체 뒤 값이 달라질 수 있다. |
| `TextBuffer::operator=`·`operator+=` | 길이·할당 실패 시 기존 값 유지 | 이전 `c_str()`·원소 참조는 성공한 교체 뒤 무효화된다. |
| `FormatPipeline` 복사·대입 | 부분 clone을 정리하고 원본·대상 유지 | 파생 `clone()`의 외부 부작용은 되돌리지 않는다. |
| `PipelineBuilder::replace` | create·clone 실패 시 target 유지 | creator가 계약 밖의 포인터를 반환하는 경우까지 복구하지 않는다. |
| `RandomAccessBatch::sort` | rollback을 구현하지 않는다. 예외 뒤 원소 순서와 container 상태는 `std::sort`, `T`, `Container`의 전제와 보장에 따른다. | comparator의 외부 부작용도 되돌리지 않는다. |
| `BatchEngine::replace` | 최종 swap 전 실패 시 이전 `results_` 유지 | 입력 stream은 이미 소비됐고 성공 뒤 기존 결과 참조는 무효화될 수 있다. |
| `write` 계열 | source 객체를 바꾸지 않는다 | stream flags·오류 상태와 이미 쓴 바이트는 rollback하지 않는다. |

destructor와 `swap(... ) throw()`는 정리 경로에서 예외를 밖으로 내보내지 않는다는
전제다. 사용자가 제공하는 파생 destructor, comparator와 stream까지 프로젝트가
no-throw로 만들지는 못한다. 연산별 계약은
[현재 공개 계약](../docs/public-contracts.md)에 정리했다.

## 표준 라이브러리와 직접 구현의 경계

- `TextBuffer`의 저장 배열, 연락처의 원형 slot index, scalar/RPN parser와 산술
  overflow 검사는 직접 구현한다.
- `Contact`와 `JobResult`의 문자열 수명, batch의 `vector`·`deque`·`map`,
  `std::sort`의 실제 원소 이동은 표준 라이브러리에 맡긴다.
- batch 한 행은 중복 검사용 map, vector 후보와 deque 후보에 저장된다. 두 후보를
  각각 정렬하고 비교한 뒤 최종 vector로 한 번 더 복사하므로 “정렬 한 번”보다
  실제 상수 비용과 메모리 사용이 크다.
- pipeline은 최대 여덟 단계라 순회 자체는 선형이지만, 각 formatter가
  `TextBuffer` 값을 새로 반환해 단계마다 문자열 복사·할당이 생길 수 있다.
- `UppercaseFormatter`는 `std::toupper`를 호출하므로 process C locale의 영향을
  받는다. UTF-8 case conversion 계약이 아니며, CLI 결정성 검사는 locale을
  `C`로 고정한다.

## 검증 경계

단위 검사는 정상 상태 전이를, 실패 주입은 부분 생성과 강한 예외 보장을 확인한다.
컴파일 실패 검사는 private 생성자, 읽기 전용 접근, 추상 타입과 반복자 요구 조건을
확인한다. 새니타이저와 누수 검사는 수명 오류를 찾지만 모든 예외 위치나 입력을
증명하지는 않는다.

구현과 검증이 형성된 순서는 [개발 기록](../devlog/README.md), 실행 방법과 산출물
범위는 [README](../README.md), 연산별 계약은
[현재 공개 계약](../docs/public-contracts.md)에 정리했다.
