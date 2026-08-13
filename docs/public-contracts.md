# 현재 공개 계약

이 문서는 `include/cppf`, 여섯 CLI와 현재 구현을 기준으로 입력, 결과, 소유권과
실패 뒤 상태를 정리한다. 예외가 없었다는 정상 실행만으로 strong exception
guarantee를 일반화하지 않는다. stream과 사용자 구현처럼 라이브러리 밖에서
일어난 부작용은 객체 상태와 별도로 본다.

## CLI 경계

| 실행 파일 | 입력과 성공 | 오류와 종료 상태 |
| --- | --- | --- |
| `ex00_contact_book` | stdin에서 `ADD name|note`, `LIST`, `QUIT`를 처리한다. EOF와 `QUIT`는 0이다. 잘못된 명령·값은 stdout에 `error`를 쓰고 다음 줄을 읽는다. | 명령 오류는 프로세스 실패가 아니다. iostream 예외를 설정하지 않으므로 출력 실패를 종료 코드로 변환하지 않는다. |
| `ex01_text_buffer` | 정확히 두 인자를 별도 `TextBuffer`로 만든 뒤 결합값과 개행을 stdout에 쓴다. | 인자 수가 다르면 usage를 stderr에 쓰고 1이다. 생성·출력 예외는 `main`에서 잡지 않는다. |
| `ex02_format_pipeline` | 한 인자에 prefix, uppercase, suffix를 적용해 `[UPPER]` 형태를 출력한다. | 인자 수 오류는 stderr와 1이다. clone·할당·출력 예외는 잡지 않는다. |
| `ex03_pipeline_factory` | 값과 1..8개 formatter 명세를 받아 후보 pipeline을 완성한 뒤 결과를 출력한다. | 잘못된 명세와 `std::exception` 계열 생성 실패는 메시지를 stderr에 쓰고 1이다. target 교체 전 실패는 기존 pipeline을 유지한다. |
| `ex04_type_boundary` | `scalar LITERAL`, `runtime A|B|C`, `address ID LABEL` 세 모드가 있다. | 잘못된 mode·인자·literal·ID는 stderr와 1이다. `runtime` 할당 실패와 최종 stream 실패는 잡지 않는다. |
| `ex05_batch_engine` | `rpn EXPRESSION`은 `long` 하나를, `batch`는 stdin 전체를 검증·정렬한 결과를 출력한다. | 사용법, 문법, 중복, 산술 범위와 읽기 오류는 stderr와 1이다. batch의 공개 결과는 전체 후보가 성공한 뒤에만 교체된다. |

각 CLI의 최종 출력은 파일이나 stream transaction이 아니다. 라이브러리가 먼저
문자열 전체를 렌더링하는 경우에도 마지막 `ostream::write`가 일부 바이트를
내보낸 뒤 실패할 수 있다.

## 값 객체와 고정 배열

### `Contact`

`Contact(name, note)`는 이름이 1..32바이트의 출력 가능한 ASCII이고 메모가
0..64바이트의 출력 가능한 ASCII일 때만 두 값을 채운다. 조건을 만족하지 않으면
예외 대신 `empty()`인 값이 된다. `name()`과 `note()`는 객체 내부
`std::string`의 `const` 참조를 빌려 준다.

`Contact`는 사용자 정의 소멸자나 복사 연산을 선언하지 않는다. 두 `std::string`
멤버의 복사 의미를 그대로 사용하는 값 객체다. `swap()`은 두 문자열을 바꾸며
C++98의 `throw()` 계약을 갖는다.

### `ContactBook`

`ContactBook`은 여덟 `Contact`를 값으로 소유한다. `add()`는 빈 연락처를
no-op으로 처리하고, 유효한 연락처의 복사본을 먼저 완성한 뒤 다음 물리 슬롯과
교체한다. 복사 할당이 실패하면 `contacts_`, `size_`, `next_`는 바뀌지 않는다.

`at()`이 반환하는 `const Contact&`는 book이 소유한다. 해당 슬롯이 다음
`add()`에서 교체되거나 book이 파괴되면 이전 참조의 값 또는 수명이 유지되지
않는다. 범위 밖 index에는 `std::out_of_range`가 난다.

`write()`는 호출자가 준 stream에 `index|name|note`를 직접 쓴다. 구분자 escape는
없지만 `Contact` 입력이 `|`를 금지하지 않으므로 출력만으로 원래 두 필드를
모호함 없이 역파싱하는 계약은 아니다. 중간 I/O 실패는 이미 쓴 바이트와 호출자
stream의 상태를 되돌리지 않는다.

## 직접 소유하는 `TextBuffer`

`TextBuffer`는 `data_`가 가리키는 NUL 종료 `char[]` 하나를 `new[]`/`delete[]`로
소유한다. 기본값도 1바이트 배열을 소유한다. `const char*` 생성자에 null을
넘기면 빈 문자열로 정규화한다.

| 연산 | 반환·참조 수명 | 실패 뒤 상태 |
| --- | --- | --- |
| 복사 생성 | 별도 배열을 가진 깊은 복사 | 할당 실패면 새 객체가 만들어지지 않고 원본은 그대로다. |
| 복사 대입 | 후보를 복사한 뒤 `swap` | 자기 대입도 실제 복사하므로 예외 가능하다. 실패하면 대상의 이전 값이 남는다. |
| `operator+=` | 기존 값 뒤에 다른 버퍼를 붙인다. 자기 결합도 가능하다. | 길이 overflow 또는 할당 실패 전에 기존 배열을 지우지 않아 이전 값이 남는다. |
| `at()` | 원소의 참조를 빌려 준다. 범위 밖이면 `out_of_range`다. | 이후 대입·결합·파괴에서 참조가 무효화된다. |
| `c_str()` | 내부 NUL 배열의 주소를 빌려 준다. | 변경 연산과 파괴 뒤 사용할 수 없다. |

mutable `at()`로 중간 문자를 NUL로 바꿀 수 있다. 이때 `size()`는 저장된 배열
길이를 계속 반환하지만 `c_str()`과 `strcmp` 기반 비교·출력은 첫 NUL까지만
관찰한다. 클래스가 이 둘의 일치를 불변식으로 강제하지 않는 현재 공개 경계다.

## 다형적 객체와 factory

`Formatter`의 virtual destructor는 기반 포인터로 파생 객체를 삭제할 수 있게
한다. `FormatPipeline`은 `append()`에 받은 formatter를 빌리는 대신
`clone()` 반환 객체를 소유한다.

타입만으로는 다음 전제를 표현하지 못한다.

- `clone()`과 `FormatterCreator::create()`는 null이 아닌 독립 `new` 객체를
  반환한다.
- 반환 객체의 삭제 책임은 호출자에게 넘어간다.
- 파생 destructor가 예외를 던지지 않는다.

null이나 빌린 주소를 반환하는 사용자 구현은 dereference·delete 계약을 깨뜨린다.
`apply()`가 던져도 pipeline의 포인터 배열은 바뀌지 않지만, 사용자 formatter가
외부 상태를 먼저 바꿨다면 그 부작용까지 rollback하지 않는다.

| 연산 | 소유권 변화 | 실제 보장 |
| --- | --- | --- |
| `append()` | clone 성공 뒤 pipeline이 한 객체를 소유 | capacity 검사와 clone 실패 전에는 size가 유지된다. 잘못된 null 반환은 계약 밖이다. |
| 복사 생성 | 각 동적 타입을 순서대로 clone | 중간 실패 시 이미 만든 clone을 생성자 안에서 지우고 재던진다. |
| 복사 대입 | 전체 후보를 만든 뒤 pointer 배열 교체 | 후보 생성 실패 시 대상 유지. 자기 대입도 clone을 수행할 수 있다. |
| `PipelineBuilder::replace()` | caller에게 빌린 creator의 반환 formatter를 지역 owner가 즉시 맡고, pipeline은 다시 clone | create·clone·할당 실패 시 후보만 정리하고 target을 유지한다. 성공 뒤에도 creator는 caller 소유이며, 지역 owner가 정리하는 것은 create 반환 formatter다. |

factory가 객체를 만들고 pipeline이 다시 복제하므로 명세 하나당 생성과 clone 두
단계가 있다. 이 중복은 원시 포인터 수명을 명확히 보여 주는 현재 구조의 실제
비용이다.

## 형변환과 borrowed address

`ScalarConverter::write()`는 문법 파싱과 타입별 투영을 분리한다. 내부
`ostringstream`에는 classic locale을 사용해 호출자 stream의 locale과 숫자
flags가 렌더링을 바꾸지 않게 한다. 결과 문자열을 최종 stream에 쓰는 단계는
원자적이지 않다.

`RuntimeInspector::create()`는 A/B/C에 새 파생 객체를 반환하고 그 밖에는 null을
반환한다. 호출자가 삭제한다. pointer `dynamic_cast` 실패는 null이고 reference
형태의 `std::bad_cast`는 내부에서 `runtime_unknown`으로 정규화한다.

`Serializer`는 `Payload*`와 `uintptr_t` 사이의 표현을 바꿀 뿐 객체를 복사하거나
검증하지 않는다. 0은 null과 왕복한다. nonzero token은 같은 프로세스에서 원래
객체가 살아 있고 그 주소에서 나온 경우에만 dereference할 수 있다. 임의 정수,
다른 실행의 token, 파괴된 객체의 token은 유효성을 보장하지 않는다.

## template, iterator와 batch

`RandomAccessBatch<T, Container>`의 저장소는 `Container` 값이다. 클래스 정의가
header에 있으므로 사용하는 소비자 번역 단위에서 필요한 멤버가 인스턴스화된다.
객체를 선언했다는 이유만으로 모든 멤버 요구 조건이 한꺼번에 적용되지는 않는다.

- `push_back()`은 container와 `T`의 해당 복사 조건을 따른다.
- mutable/const `at()`과 iterator는 내부 원소를 빌려 주며 container 변경 뒤
  무효화 규칙도 그 container를 따른다.
- `sort()`는 random-access iterator와 strict weak ordering comparator가
  필요하다. 안정 정렬을 약속하지 않는다.
- comparator 또는 원소 연산이 던지면 `std::sort`가 이미 순서를 바꿨을 수
  있으므로 호출 전 순서를 유지한다는 보장은 없다.
- 복사 대입은 후보 container를 완성한 뒤 `swap()`한다. container 복사 실패
  때 대상은 유지되지만 사용자 `Container::swap`의 예외 조건까지 이 template이
  강화하지 않는다.

`BatchEngine::replace()`는 한 글자씩 줄을 읽고 각 이름과 RPN을 검증한다. 같은
결과를 vector와 deque 후보에 넣어 각각 정렬하고 범위를 비교한 뒤 최종 vector
후보로 다시 복사한다. 이름 조회용 map까지 포함하면 한 행은 세 컨테이너에
표현되고 두 번 정렬된다.

읽기·파싱·중복·RPN·할당·정렬·교차 비교가 실패하면 `results_` 교체 전이므로
이전 값과 기존 원소 주소가 유지된다. 성공한 `swap` 뒤에는 이전
`results()` 참조와 원소 참조가 더 이상 현재 결과를 가리키지 않는다.
`RandomAccessBatch::sort()` 단독 호출에는 이 transactional 보장을 적용하지
않는다.

RPN은 ASCII space만 token separator로 사용하되 선행·후행 space와 여러 개의
연속 space를 허용한다. tab이나 다른 whitespace는 separator가 아니다. `long`
범위 안에서 네 연산을 계산하며 음수 최솟값의 magnitude가 양수 최댓값보다 하나
크다는 표현을 사용한다. 현재 LP64 검사는 타입 크기를 확인하지만 모든 signed
representation 성질을 별도 정적 계약으로 검사하지는 않는다.

## 예외 보장 용어

- **strong guarantee**: 연산이 실패하면 해당 객체의 관찰 가능한 값이 호출
  전과 같다.
- **basic guarantee**: 불변식과 정리 가능성은 유지되지만 값은 달라질 수 있다.
- **no-throw 정리**: destructor와 `swap(... ) throw()`처럼 정리 경로가 예외를
  밖으로 내보내지 않는다고 계약한 범위다.

이 용어는 객체별로 적용한다. `BatchEngine::replace()`가 내부 상태에 strong
guarantee를 제공해도 입력 stream의 소비 위치나 이미 나간 출력은 복원하지
않는다. 사용자 callback·comparator·formatter의 외부 부작용도 라이브러리가
되돌리지 않는다.
