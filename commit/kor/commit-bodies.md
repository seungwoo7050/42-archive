## build(makefile): C++98 정적 라이브러리 빌드 구성
`libcpp_foundation.a`를 재현 가능하게 빌드하고 C++98 컴파일 경계를 엄격하게 적용한다. 경고 설정을 통해 언어 확장, 구식 캐스트, 한정자 손실, 오버로드된 가상 함수 관련 실수, 비가상 소멸로 인한 위험을 허용하지 않으므로, 이식성 및 객체 모델 관련 오류를 코드 리뷰 규칙이 아니라 빌드 실패로 처리한다.

소스 탐색 순서를 결정적으로 유지하고, 생성된 의존성 파일로 증분 빌드의 정확성을 보장하며, 빌드 산출물은 버전 관리 대상과 분리한다. 초기 archive 규칙은 소스 트리가 비어 있는 경우도 처리하므로 첫 구현 파일이 추가되기 전부터 빌드 계약을 유지할 수 있으며, 플랫폼별 컴파일러 기본값을 허용 가능한 것으로 간주하지 않는다. `clean`, `fclean`, `re`는 생성된 object와 archive의 수명 주기를 명시적으로 정의한다.

## feat(contact): 검증된 연락처 값 객체 구현
생성 시점에 자체 유효성을 확립하는 작은 값 객체로 `Contact`를 추가한다. 이름은 비어 있지 않은 출력 가능한 ASCII여야 하고 32바이트를 넘을 수 없다. 메모는 비어 있어도 되지만 출력 가능한 ASCII여야 하며 64바이트 이하여야 한다. 잘못된 입력은 일부 필드만 유효한 상태로 남기지 않고 하나의 빈 연락처 상태로 정규화한다.

구현은 두 멤버를 모두 빈 값으로 초기화한 뒤, 두 필드가 계약을 모두 만족할 때만 전달받은 값을 반영한다. const 접근자는 호출자가 불변식을 깨뜨리지 못하게 하면서 상태를 조회할 수 있게 하고, `swap()`은 예외를 던지지 않는 상태 교환을 제공해 이후 소유권 처리와 강한 예외 보장 코드에서 상태 확정 연산으로 사용할 수 있다. 실제 소스 object가 생긴 뒤에는 빌드 과정도 초기 부트스트랩용 빈 archive 예외 처리를 제거하고 일반적인 archive 생성 방식으로 전환할 수 있다.

## test(contact): 연락처 값 불변식 검증
`Contact` 값 계약을 실행 가능한 테스트로 검증한다. 표준 빈 상태, 정상 생성, const 조회, 값 복사, 양방향 `swap()` 동작을 확인한 뒤, 빈 이름, 제한보다 1바이트 긴 이름과 메모, 정상 문자열에 포함된 제어 문자 등 모든 검증 경계를 테스트한다.

이 변경에서는 최소한의 테스트 harness도 도입하고 검증을 빌드 수명 주기에 포함한다. 깨끗한 트리에서 다시 빌드하고 unit suite를 실행한 다음 두 번째 빌드가 이미 최신 상태임을 확인함으로써 기능 출력만 검사하지 않는다. 객체 불변식과 함께 의존성 파일 생성, archive 재구성, 빌드 멱등성까지 검증한다.

## feat(contact): 고정 크기 연락처 저장 순서 보존
동적으로 커지는 collection 대신 슬롯 8개의 circular buffer로 `ContactBook`을 추가한다. 빈 연락처는 무시하고, 유효한 연락처는 다음 물리 슬롯에 저장한다. 용량이 가득 찬 뒤에는 새 삽입이 가장 오래된 슬롯을 덮어쓰며 외부에서 보이는 크기는 최대 용량을 넘지 않는다. 이 표현 방식은 메모리 상한을 호출자가 관리하는 정책이 아니라 타입 자체의 특성으로 만든다.

`at()`은 가장 오래된 항목부터 최신 항목까지의 논리 index를 내부 물리 배열의 위치로 변환하고, 현재 논리 범위를 벗어난 index는 거부한다. 논리 순서와 저장 순서를 분리한 것이 핵심이다. 호출자는 ring이 현재 어디에서 감겨 있는지 알 필요가 없다. 이 단계에서는 교체에 일반 값 대입을 사용하므로 성공 시 순서는 보존되지만, 저장된 슬롯을 모든 할당 실패로부터 격리하지는 못한다. 이 실패 경계는 이후 공개 순서 모델을 바꾸지 않은 채 강화된다.

## test(contact): 연락처 저장 용량과 논리 순서 검증
`ContactBook`의 circular buffer 동작을 테스트로 고정한다. 빈 값은 용량을 소비하지 않고, 연락처 10개를 삽입해도 정확히 8개만 유지되며, 처음 두 값은 제거되고, 물리 배열이 한 바퀴 돈 뒤에도 논리 index는 `C`부터 `J`까지 순서대로 열거되는지 검증한다.

범위 초과 검사도 중요하다. 공개 index는 고정된 내부 배열이 아니라 현재의 논리 sequence를 기준으로 정의된다. 따라서 호출자는 사용하지 않은 슬롯을 볼 수 없고 구현 용량을 현재 크기 대신 사용할 수도 없다. 이 테스트는 이후 삽입이나 index 처리 방식이 바뀌더라도 저장 순서 추상화를 보호한다.

## feat(contact): 연락처 목록의 스트림 출력을 지원
각 논리 항목을 `index|name|note` 형식으로 기록하는 연락처 목록의 직렬화 경계를 제공한다. 구현은 내부 배열을 직접 순회하지 않고 의도적으로 `at()`을 통해 각 record를 얻는다. 따라서 텍스트 표현도 index 접근에서 보장하는 것과 동일하게 가장 오래된 항목부터 최신 항목까지의 순서를 따른다.

임의의 `std::ostream`을 받도록 해 출력 형식을 terminal과 분리하고 메모리 내 stream으로 직접 테스트할 수 있게 한다. 이 메서드는 record 순서와 필드 구분자를 책임지며, 목적지 stream과 해당 stream의 실패 처리 정책은 호출자가 책임진다.

## feat(contact): 연락처 명령행 세션 연결
연락처 도메인 위에 얇은 command-line session을 추가한다. `ADD`는 `name|note` payload를 파싱하고 유효성 판단은 `Contact`에 위임한 뒤 빈 값이 아닐 때만 삽입한다. `LIST`는 순서와 출력 처리를 `ContactBook`에 위임하고, `QUIT`은 session을 종료하며, 그 밖의 모든 입력에는 결정적인 오류 응답을 출력한다.

CLI는 필드 길이 제한이나 circular buffer 규칙을 중복 구현하지 않는다. CLI의 책임은 줄 단위 입력, 명령 인식, process 출력과 같은 protocol adaptation이며, 값 유효성과 저장 동작의 기준은 library에 남겨 둔다. 빌드도 일반화하여 `apps/`의 application이 외부 코드와 동일한 공개 archive에 link하도록 한다.

## test(contact): 공개 계약과 명령행 세션 검증
연락처 검증을 unit, compile contract, command-line 계층으로 나눈다. positive compile test는 각 공개 header를 두 번 include하고 공개된 이름만 사용해 include guard와 header 단독 사용 가능성을 검증한다. negative compile test는 private 표현에 접근할 수 없음을 확인해 캡슐화를 단순한 스타일 규칙이 아니라 실행 가능한 요구사항으로 만든다.

session fixture는 실제 binary에 정상 추가, 잘못된 명령, 목록 출력, 종료를 순서대로 입력하고 전체 바이트 출력을 예상 transcript와 비교한다. 추가 unit assertion은 wrap된 연락처 목록이 가장 오래된 값을 제거하고 논리 순서대로 직렬화하는지도 확인한다. 이를 통해 표현 은닉, 공개 header 사용, 도메인 순서, process 수준 protocol을 함께 검증한다.

## feat(buffer): 종료 문자를 포함한 문자열 저장소 소유
명시적인 수명을 가진 C 문자열 지향 소유 값으로 `TextBuffer`를 도입한다. 살아 있는 모든 객체는 정확히 `size() + 1`바이트의 null이 아닌 할당 영역을 소유하며, 마지막 바이트는 항상 NUL terminator다. 기본 생성과 null 입력 포인터 모두 동일한 유효한 빈 표현을 만들므로 내부에 별도의 nullable 상태를 두지 않는다.

const 및 mutable `at()`의 검사 범위에서는 terminator를 문자 범위에서 제외하고, `c_str()`은 안정적인 읽기 전용 상호 운용 view를 제공한다. 깊은 복사 의미론이 구현되기 전까지 복사는 비활성화해 우발적인 shallow ownership을 막는다. 예외를 던지지 않는 `swap()`은 pointer와 size를 함께 교환해 표현 불변식을 보존하고, 타입을 transactional assignment에 사용할 수 있도록 준비한다.

## test(buffer): 저장 크기와 범위 접근 검증
`TextBuffer`에서 외부에 관찰되는 저장 계약을 정의한다. 기본 생성과 null pointer 생성 모두 올바르게 NUL 종료된 빈 문자열을 만들고, 값이 있는 buffer는 예상한 바이트 수와 내용을 보고하며, const 접근으로 저장 문자를 읽고 mutable 접근으로 소유한 표현을 변경할 수 있는지 검증한다.

물리적으로 해당 위치에 terminator가 있더라도 정확히 `size()` 위치에 접근하면 예외가 발생해야 한다. 이 구분은 호출자가 구현용 저장 공간을 논리 문자 sequence의 일부로 취급하지 못하게 하고, 문자열 종료를 class가 직접 관리한다는 불변식을 보호한다.

## feat(buffer): 깊은 복사와 정규 대입 구현
깊은 복사 생성자와 복사 대입을 추가해 `TextBuffer`를 일반적인 소유 값 타입으로 만든다. 각 복사본은 자체 `size + 1` 저장 공간을 할당하고 payload와 함께 terminator까지 복사하므로 한 객체의 변경이나 소멸이 다른 객체에 영향을 주지 않는다.

대입에는 copy-and-swap을 사용한다. 먼저 완전한 교체 값을 생성한 뒤 대상과 상태를 교환한다. 할당이 실패하면 대상이 바뀌기 전에 임시 객체 생성이 실패하고, 성공하면 예외를 던지지 않는 swap으로 새 상태를 확정한 뒤 임시 객체가 이전 할당 영역을 해제한다. 같은 경로가 별도 분기 없이 자기 대입도 처리한다. 추가 할당 한 번을 감수하는 대신 일관된 강한 예외 보장을 얻는다.

## test(buffer): 복사 독립성과 자기 대입 검증
`TextBuffer`에 도입된 전체 값 의미론을 검증한다. 복사한 buffer를 수정해도 원본은 바뀌지 않아야 하고, 대입은 대상 참조를 반환하면서 바이트 내용을 동일하게 복제해야 하며, chained assignment는 여러 객체에 같은 값을 전달해야 한다.

자기 대입은 명백한 문법적 자기 대입 대신 alias를 통해 실행한다. 구현이 `this == &other` 같은 좁은 분기에 의존하는 것이 아니라 copy-and-swap 구조 자체로 올바르게 동작하는지 확인하기 위해서다. 이 검사는 이후 formatter와 container 추상화가 의존하는 독립 소유권과 표준 대입 동작을 보호한다.

## feat(buffer): 결합·비교·출력 연산 제공
`TextBuffer`에 결합과 일반 값 연산을 추가한다. `operator+=`는 먼저 `size + other.size + 1`이 `std::size_t` 범위에 들어가는지 확인한 뒤 완전히 결합된 buffer를 할당하고 채우고, 마지막에 기존 저장 공간을 해제한다. 이 순서는 할당 실패 시 원래 값을 보존한다. 또한 두 복사가 끝날 때까지 원본 바이트가 유지되므로 자기 자신과의 결합도 안전하다.

비멤버 덧셈은 복사 후 복합 대입하는 방식으로 정의하므로 피연산자는 변경되지 않고 같은 overflow 및 ownership 규칙을 재사용한다. 동등, 비동등, 순서 비교는 class의 C 문자열 사전식 의미론을 제공하며, stream insertion은 저장된 텍스트만 대상 stream에 전달한다. 결과적으로 할당 세부 사항을 노출하지 않으면서 algorithm과 I/O에 사용할 수 있는 작은 regular type이 된다.

## feat(buffer): 문자열 결합 CLI 제공
공개 interface를 통해 `TextBuffer` 두 개를 생성하고 `operator+`로 결합한 뒤 stream operator로 결과를 출력하는 최소 executable을 추가한다. 인자 개수 검증은 process 경계에서 수행하며, library 경로로 진입하지 않고 standard error에 사용법을 출력한다.

executable을 작게 유지한 것은 의도적이다. 소비자 관점에서는 생성, 소유권, 결합, 출력만으로 충분하다는 점을 보여 준다. archive를 사용하기 위해 private header나 구현 세부 사항이 필요하지 않다.

## test(buffer): 연산자와 명령행 결합 결과 검증
`TextBuffer`가 제공하는 연산을 검증한다. 덧셈은 양쪽 피연산자를 보존하고, 복합 덧셈은 왼쪽만 변경하며, 자기 결합은 원래 바이트를 정확히 두 번 이어 붙여야 한다. 사전식 비교는 값의 순서를 구분하고, stream insertion은 장식 없이 저장된 텍스트만 출력해야 한다.

command-line 검사는 실제 executable을 통해 이 연산들을 연결하고 두 인자에 대한 전체 결과를 비교한다. unit 수준 operator는 정상인데 설치된 archive, 공개 header, application link 규칙이 더 이상 함께 동작하지 않는 식의 불일치를 방지한다.

## test(buffer): 할당 실패와 복사 생략 비활성화 검증
테스트 executable의 전역 할당 함수를 카운터를 가진 `malloc` 기반 구현으로 교체해 결정적인 할당 실패 주입을 도입한다. 생성, 복사 생성, 일반 대입, alias를 통한 자기 대입, 덧셈, 복합 덧셈에서 관찰되는 모든 할당 지점을 강제로 실패시키고, 각 경우에 상태 보존과 live allocation 기준값 복원을 모두 검증한다.

두 번째 unit build에서는 copy elision을 비활성화한다. 반환되는 `TextBuffer` 값과 copy-and-swap 코드는 compiler가 허용되는 모든 임시 객체를 실제로 생성하는 경우에도 올바르게 동작해야 하기 때문이다. 두 검사를 함께 사용하면 정상 실행이나 최적화된 빌드에서 드러나지 않을 수 있는 동작에 대해 강한 예외 보장과 leak 부재를 확인할 수 있다.

## feat(format): 다형적 formatter 인터페이스 정의
`Formatter`를 안전하게 소멸 가능한 추상 다형 interface로 정의하며 세 가지 책임을 둔다. 동적 객체를 clone하고, `TextBuffer`를 변환하며, 안정적인 formatter 이름을 제공한다. virtual destructor를 통해 base pointer로 삭제할 수 있고, `clone()`은 소유 container가 구체 타입을 모르는 상황에서 필요한 virtual copy 연산을 제공한다.

구체적인 uppercase, prefix, suffix formatter는 각자 `TextBuffer` 설정을 소유하고 호출자가 소유한 입력을 직접 수정하는 대신 변환된 값을 반환해 값 의미론을 유지한다. uppercase 변환은 `std::toupper`를 호출하기 전에 각 `char`를 `unsigned char`로 변환하여 음수 plain-char 값에서 발생할 수 있는 undefined behavior를 피한다. 이 interface는 C++98에 적합한 runtime polymorphism과 명시적 ownership 및 copy 경계를 함께 제공한다.

## test(format): 파생 formatter의 동적 호출 검증
각 구체 formatter를 `Formatter` 참조를 통해 호출하고 변환 결과와 보고되는 이름을 모두 검증한다. 올바른 결과가 호출자가 파생 타입을 알거나 파생 멤버를 직접 호출하는 데 의존하지 않으므로, 공개 계약이 실제로 virtual dispatch를 사용하는지 확인할 수 있다.

선택한 입력은 각 formatter의 책임도 구분한다. uppercase는 구두점과 숫자를 유지한 채 알파벳 바이트만 변경하고, prefix와 suffix formatter는 설정된 값을 각각 올바른 쪽에 추가한다. 이 검사는 이후 pipeline dispatch의 동작 기반이 된다.

## feat(format): formatter 소유 pipeline 구현
다형 formatter step을 소유하는 최대 크기 제한형 `FormatPipeline`을 추가한다. `append()`는 전달받은 formatter를 clone하기 전에 8개 step 용량을 확인하고, clone 생성이 성공한 뒤에만 pointer를 저장하며, 마지막에 size를 증가시킨다. 따라서 pipeline은 수명을 통제할 수 없는 외부 참조를 빌리는 대신 독립된 동적 객체를 소유한다.

적용 시 복사한 입력을 삽입 순서대로 저장된 step에 통과시키며, 빈 pipeline은 자연스럽게 항등 변환이 된다. 소멸 시 성공적으로 저장된 clone만 정확히 삭제하고, 예외를 던지지 않는 `swap()`은 고정 크기 pointer 배열 전체와 size를 함께 교환한다. 이 초기 버전에서는 명시적 깊은 복사가 구현되기 전에 ownership이 pointer aliasing으로 퇴행하지 않도록 복사를 비활성화한다.

## feat(format): pipeline 실행 CLI 제공
prefix, uppercase, suffix formatter를 pipeline으로 구성해 인자 하나에 적용하는 공개 API 예제를 제공한다. 결과가 `[TEXT]` 형태이므로 실행 순서를 관찰할 수 있다. mixed-case 입력에서는 순서가 바뀌면 결과도 달라진다.

executable은 stack에 있는 formatter prototype만 직접 소유하고, pipeline은 이를 참조로 받아 clone을 보관한다. 따라서 호출자는 append 이후 prototype을 독립적으로 소멸할 수 있다는 의도된 ownership 경계를 보여 주며, application 계층에 raw pointer나 clone 관리를 노출하지 않는다.

## test(format): pipeline 적용 순서와 용량 경계 검증
새 pipeline이 항등 변환으로 동작하고, append한 step이 소유된 clone으로 집계되며, dispatch가 삽입 순서를 따르는지 검증한다. 8개 슬롯을 모두 채운 뒤 하나를 더 append하면 `std::length_error`가 발생하고 size는 최대 용량 그대로 유지되어야 한다.

이 실패 검사는 단순한 오류 확인이 아니라 상태 보장이다. 용량 초과는 clone이나 pointer 배열 수정 전에 거부되므로, 실패한 append가 clone을 leak하거나 부분적으로 보이는 아홉 번째 step을 만들 수 없다.

## feat(format): pipeline 깊은 복사 구현
모든 동적 step을 clone하여 `FormatPipeline`에 깊은 복사 값 의미론을 부여한다. 복사 생성자는 전체 배열을 null로 초기화한 상태에서 시작해 순서대로 clone을 append하고, 이후 clone에서 예외가 발생하면 이미 생성된 앞부분을 명시적으로 삭제한다. 생성이 완료되지 않은 객체에는 destructor가 호출되지 않으므로 이 정리가 필요하다.

대입은 copy-and-swap을 사용하므로 전체 후보 pipeline의 clone이 모두 성공한 뒤에만 대상이 바뀐다. 이 방식은 자기 대입을 포함해 동적 formatter 타입, step 순서, 강한 예외 보장을 유지한다. pointer 공유보다 비용은 크지만 ownership을 각 pipeline 내부에 한정하고 pipeline 값 사이의 수명 결합을 방지한다.

## test(format): pipeline 복사와 자기 대입 검증
복사된 pipeline이 독립적인 step을 소유하고, 원본에 다른 formatter를 추가한 뒤에도 복사 시점의 동적 동작을 유지하는지 확인한다. 대입은 destination을 반환하고 변환 결과를 동일하게 재현해야 하며, source와 destination이 같은 pipeline을 가리키는 alias인 경우에도 안전해야 한다.

이 검사는 깊은 다형 복사와 단순한 pointer 배열 복사를 구분한다. shallow 구현도 처음에는 같은 출력을 낼 수 있지만 독립성을 만족하지 못하고 결국 공유 step을 이중 삭제하게 된다.

## test(format): 가상 소멸·추상 계약·CLI 검증
formatter 검증 범위를 출력 결과에서 객체 모델 계약까지 넓힌다. 카운터가 있는 test formatter는 살아 있는 instance와 소멸된 instance를 기록하므로 clone ownership과 `Formatter*`를 통한 삭제를 관찰할 수 있다. compile-fail 검사는 abstract base를 인스턴스화할 수 없음을 확인하고, public-header compile 검사는 반복 include와 소비자 관점 사용을 확인한다.

pipeline executable도 integration transcript에 추가하여 virtual dispatch, archive linkage, step 순서가 process 경계에서도 유지되는지 검증한다. 이 검사들은 여기서 가장 중요한 세 가지 C++98 실패 유형을 함께 막는다. 실수로 concrete가 된 interface, non-virtual destruction 경로, 기능상 정상처럼 보이지만 leak하거나 잘못된 동적 객체를 삭제하는 ownership 문제다.

## feat(factory): 문자열 명세로 formatter 생성
텍스트 설정을 formatter 객체로 변환하는 factory 경계를 도입한다. 정확히 `upper`, `prefix=<payload>`, `suffix=<payload>` 형식은 각각 구체 동적 타입으로 매핑한다. 빈 명세와 필수 payload가 비어 있는 경우는 malformed로 분류하고, 문법적으로 완전하지만 지원하지 않는 이름은 별도의 `UnknownFormatter` 오류를 발생시킨다.

`FormatterCreator`는 abstract이므로 pipeline 구성은 구체 class가 아니라 생성 동작에 의존할 수 있고, virtual destructor로 안전한 다형 사용을 지원한다. `create()`가 반환하는 raw owning pointer는 C++98에서 ownership을 명시적으로 이전하는 경계다. 수신 계층은 이를 직접 삭제하거나 동작을 다른 owner로 이전해야 한다. `PipelineBuilder`는 이 통합 작업을 수행하는 인스턴스화 불가능한 operation object로 선언한다.

## test(factory): formatter 명세 분류 검증
성공 및 실패 사례로 factory 문법을 명세한다. 구체 이름, prefix와 suffix payload 추출, 생성된 formatter의 동작, 반환된 base pointer를 통한 삭제를 검증한다.

malformed 입력과 지원하지 않는 formatter 이름은 안정적인 예외 메시지까지 포함해 별도로 테스트한다. 이 구분을 유지하면 호출자는 모든 실패를 알 수 없는 기능으로 처리하지 않고 설정 오류를 정확하게 보고할 수 있다.

## feat(factory): formatter 임시 소유와 pipeline 교체 구현
텍스트 명세 배열로 pipeline을 구성하는 기능을 구현한다. local RAII owner가 creator가 반환한 각 raw pointer의 ownership을 즉시 넘겨받는다. `FormatPipeline::append()`가 formatter를 clone한 뒤 temporary owner가 원본을 삭제한다. 따라서 pipeline이 factory 생성 객체를 공유하지 않으면서 정상 실행과 예외 경로 모두에서 leak을 방지한다.

builder는 작업을 시작하기 전에 null array/count 일관성과 pipeline 용량을 검증하고, 빈 명세 목록은 대상을 빈 pipeline으로 교체한다. 이 초기 구현은 모든 formatter 생성이 끝나기 전에 target을 비우므로 이후 생성이나 clone이 실패하면 일부만 재구성된 target이 남는다. 임시 ownership 처리 자체는 올바르지만, 이 시점의 교체 연산은 이후 추가되는 강한 상태 보존 보장이 아니라 자원 정리만 보장한다.

## test(factory): builder 소유권 이전 검증
명세 sequence가 예상한 순서의 pipeline을 만들고, factory가 생성한 각 temporary가 소멸한 뒤에도 결과가 유효한지 검증한다. 이는 2단계 ownership 모델을 보여 준다. creator가 새로 할당한 formatter는 builder의 local guard가 삭제할 때까지만 소유되고, pipeline은 별도의 독립 clone을 소유한다.

테스트는 빈 sequence로 교체하는 경우도 다루고, nonzero count와 함께 null specification pointer를 전달하는 경우는 거부한다. 이를 통해 유효한 빈 연산과 비어 있지 않은 요청의 잘못된 표현을 각각 정의한다.

## fix(factory): 교체 실패에도 기존 파이프라인 보존
target을 먼저 비우고 점진적으로 수정하는 대신 완전한 결과를 local candidate에 구성하도록 pipeline 교체를 수정한다. 각 formatter 생성과 clone은 할당하거나 예외를 던질 수 있다. 이 작업을 candidate 내부에 한정하면 candidate의 destructor가 부분 결과를 정리하는 동안 기존 pipeline은 그대로 유지된다.

모든 명세 처리가 성공한 뒤에만 예외를 던지지 않는 `swap()`으로 candidate를 반영한다. 이 변경으로 `PipelineBuilder::replace()`는 기본적인 자원 정리 보장에서 강한 예외 보장으로 강화되고, 여러 단계의 교체 작업을 소유한 계층에 transaction 경계를 둔다.

## feat(factory): 명세 기반 파이프라인 CLI 제공
설정 가능한 pipeline 구성을 command-line program으로 제공한다. 첫 번째 인자는 입력 텍스트이며, 이후 제한된 개수의 인자는 formatter 명세로 그대로 `PipelineBuilder`에 전달한다. 완성된 pipeline은 구성이 성공한 뒤에만 적용한다.

CLI는 library 예외를 받아 standard error에 실패를 보고하고, 잘못된 설정에 대해서는 성공 출력이 나오지 않도록 한다. 별도의 두 번째 parser가 아니라 adapter 역할만 유지하므로, 명세 문법은 계속 factory가 책임지고 transactional replacement는 builder가 책임진다.

## test(factory): 교체 실패 상태 보존과 CLI 검증
강한 교체 보장에 대한 regression coverage를 추가한다. sequence 중간의 알 수 없는 formatter와 잘못된 null/count 조합 모두 이미 값이 들어 있는 target pipeline을 변경하지 않아야 한다. 이를 통해 validation 실패와 이후 construction 실패가 부분 candidate를 외부에 노출하지 않음을 확인한다.

integration case에서는 실제 CLI를 통해 정상 순서 formatting과 오류 경로를 실행하고, 거부된 명세가 standard output을 전혀 생성하지 않아야 한다는 요구사항도 확인한다. 이 테스트는 library 수준의 상태 원자성과 process 수준의 출력 원자성을 연결한다.

## test(factory): 생성·복제·할당 실패 정리 검증
factory와 builder에서 관찰되는 모든 allocation 및 clone 실패 지점을 순회해 검증한다. custom creator와 카운터가 있는 formatter를 사용해 formatter 생성 중 실패와 candidate pipeline으로 clone하는 중 실패를 구분한다. 주입된 모든 예외에서 기존 target의 동작은 유지되어야 하고, 모든 temporary 또는 partial clone은 소멸되어야 한다.

이는 하나의 임의 `bad_alloc` 사례보다 강한 근거를 제공한다. creator에서 local guard로, local formatter에서 pipeline clone으로, partial candidate에서 destructor로, candidate에서 target으로 이어지는 모든 ownership 전환을 검증하고 leak과 조기 상태 변경을 모두 탐지한다.

## feat(scalar): scalar 리터럴 문법과 종류 분류
출력 로직이 실행되기 전에 문자, 정수, 부동소수점, special value를 분류하는 명시적인 scalar literal parser를 도입한다. 문법은 locale에 영향을 받는 문자 class가 아니라 ASCII 바이트를 기준으로 구현한다. 앞뒤 공백과 trailing material을 거부하고, 부호 있는 10진수와 지수 형식을 인식하며, 숫자가 아닌 단일 문자를 character literal로 우선 처리한다.

파싱 결과는 즉시 변환 값을 출력하는 대신 정규화된 intermediate representation을 만든다. 이 분리 덕분에 이후 코드는 source literal의 의미를 먼저 판단하고, 각 target type에 표현 가능한지 독립적으로 결정할 수 있다. special value와 negative zero 인식도 한곳에 모아 네 가지 출력 projection이 서로 조금씩 다른 parser로 갈라지는 것을 막는다.

## feat(scalar): locale 고정 수치 추출과 경계 보존
classic locale을 사용하고 `f` suffix를 허용하기 전에 소수점이나 지수가 존재하도록 요구하여 finite numeric extraction을 강화한다. host locale 설정이 10진수 문법을 바꾸는 것을 막고, 선언된 문법에서 명시적인 floating form을 요구하는 경우 `42f` 같은 정수 형태 token을 float로 해석하지 않도록 한다.

parser는 텍스트로 표현된 0과 0으로 underflow되는 nonzero mantissa를 구분하고, overflow와 조용한 nonzero underflow를 거부하며, 일반 비교와 별개로 zero lexeme의 부호를 보존한다. 출력 가능한 단일 문자는 계속 character literal로 처리하고 non-ASCII 및 malformed byte sequence는 거부한다. 이 검사는 텍스트에서 machine floating-point로 넘어가는 손실 가능 경계에서도 source의 의미를 보존한다.

## test(scalar): literal 문법과 수치 범위 검증
scalar parsing에 대해 경계 중심의 명세를 만든다. character 우선순위, signed integer, 소수점, 지수, 유효한 float suffix, negative zero, infinity, NaN을 다루고, 공백, embedded NUL 또는 non-ASCII 바이트, trailing garbage, malformed exponent, overflow, 0으로 축소되는 nonzero 값은 거부한다.

lexical form과 numerical representability를 함께 테스트하면 stream이 일부 prefix만 성공적으로 소비하거나, 전체 source token이 의도한 언어 범위를 벗어났는데도 floating 값을 반환하는 흔한 parser 오류를 막을 수 있다.

## feat(scalar): 문자와 정수 투영 결과 출력
공개 `ScalarConverter` 경계와 처음 두 target projection을 추가한다. parser 내부의 실패는 안정적인 `InvalidScalar` 예외로 변환하여 호출자가 내부 literal 구현이 아니라 변환 계약에 의존하도록 한다.

character 변환은 프로젝트의 ASCII 범위로 제한한다. 0~127을 벗어난 값은 impossible로 처리하고, 출력 가능한 값은 quote와 backslash를 명시적으로 처리해 따옴표로 표시하며, control 값은 non-displayable로 보고한다. integer 변환은 cast 전에 destination 범위를 확인해 implementation-defined narrowing을 피한다. 따라서 converter는 cast 결과에 우연히 의존하지 않고 변환 가능 여부를 명시적으로 보고한다.

## feat(scalar): 부동소수점 표현과 원자 출력 구현
결정적인 classic-locale rendering으로 float와 double projection을 완성한다. finite 값은 target type에서 파생한 precision을 사용하고 negative zero를 보존하며, 필요하면 `.0` suffix를 붙여 출력이 명확한 floating-point 형식을 유지하도록 한다. NaN과 infinity는 정규화된 표기로 출력한다. finite float 범위를 벗어나는 double이나 nonzero float underflow가 발생하는 값은 조용히 변형하지 않고 impossible로 처리한다.

네 projection line 전체를 먼저 temporary stream에 format하고 rendering이 모두 성공한 뒤에 호출자에게 출력한다. 이렇게 하면 결과가 호출자의 locale, precision, formatting flag에 영향을 받지 않고 parsing이나 formatting 중 allocation failure가 발생해도 일부 conversion report만 남지 않는다. destination stream 자체가 실패하면 마지막 write 단계에서 여전히 실패할 수 있다. 여기서 staging이 보장하는 transaction 범위는 계산과 formatting이다.

## feat(scalar): type boundary CLI의 scalar mode 제공
type-boundary executable에 scalar mode를 추가한다. 인자 검증과 process exit 동작은 application이 맡고, parsing, representability, canonical rendering은 `ScalarConverter`가 담당한다.

library가 staged report를 완성하기 전에는 program이 성공 결과를 출력하지 않는다. `InvalidScalar`는 standard-error 진단과 nonzero status로 변환된다. 이를 통해 command-line concern이 conversion API로 스며들지 않도록 한다.

## test(scalar): 변환 가능성·출력·CLI 오류 검증
출력 가능한 문자와 control character, escape가 필요한 문자 형식, integer 경계, finite float 및 double, NaN, infinity, negative zero, 한 target에는 표현 가능하지만 다른 target에는 불가능한 값까지 포함해 정확한 네 줄 scalar report를 검증한다. 또한 locale과 stream formatting state를 변경해도 변환 결과가 canonical 상태를 유지하고 호출자 설정을 변경하지 않는지 확인한다.

public-header compilation과 command-line fixture로 같은 계약을 unit helper 밖까지 확장한다. 잘못된 literal은 공개 예외를 발생시키거나 실패 process status를 반환해야 하며, partial standard output을 만들어서는 안 된다. 이 검사는 수치 정확성과 출력 비간섭성을 함께 보호한다.

## feat(rtti): 다형 객체의 실행 시간 타입 식별
다형 `RuntimeBase`, 구체 A/B/C 값, `RuntimeKind`를 key로 하는 factory, 안정적인 텍스트 이름으로 구성된 닫힌 runtime type hierarchy를 도입한다. base constructor는 protected이고 destructor는 virtual이므로 객체는 의미 있는 파생 값으로 생성되며 base interface를 통해 해제할 수 있다.

pointer 식별은 `dynamic_cast`를 사용하며 null 또는 인식하지 못하는 파생 타입을 `runtime_unknown`으로 매핑한다. reference 식별은 예외를 던지는 형태의 `dynamic_cast`를 사용하지만 내부에서 `std::bad_cast`를 잡아 같은 실패를 `runtime_unknown`으로 정규화한다. 따라서 공개 enum은 서로 다른 두 RTTI 실패 메커니즘을 하나의 결정적인 분류 계약 뒤에 숨긴다.

## test(rtti): pointer·reference 식별 경계 검증
A, B, C를 pointer와 reference 양쪽 경로로 식별한 뒤 null pointer와 인식 대상에 포함되지 않는 파생 타입도 검증한다. 모든 유효 kind와 unknown discriminator에 대해 factory 생성도 확인하며, 안정적인 이름과 `RuntimeBase*`를 통한 소멸까지 검사한다.

테스트는 성공적인 동적 타입 식별과 객체 ownership을 구분한다. RTTI는 이미 존재하는 다형 객체를 관찰하고, 객체를 누가 생성하고 해제하는지는 factory와 virtual destructor가 정의한다. 이를 통해 식별 로직이 모든 `RuntimeBase`가 닫힌 factory 집합에서 생성됐다고 잘못 가정하지 않도록 한다.

## feat(serialization): 빌린 객체 주소를 token으로 왕복
`Payload*`를 `uintptr_t`로 변환하고 다시 되돌리는 인스턴스화 불가능한 utility로 `Serializer`를 추가하며 `reinterpret_cast`를 사용한다. null은 명시적으로 처리하고, non-null round trip은 객체를 복사하거나 필드를 인코딩하지 않고 pointer identity를 보존한다.

token은 빌린 주소만 나타낸다. payload를 소유하지도 않고 수명을 연장하지도 않으며, 대상 객체가 살아 있는 동안 동일한 호환 process 및 data model에서만 의미가 있다. pointer bit를 담기 위한 정수 타입을 사용함으로써 이 low-level 계약을 명시하지만, token이 portable persistence로 바뀌는 것은 아니다.

## test(serialization): null과 주소 동일성 검증
stack 및 heap payload의 round-trip identity, 복원된 pointer를 통한 aliasing, 서로 다른 객체의 구분, null mapping을 검증한다. scoped object가 소멸한 뒤에도 token을 보관하는 경우를 테스트하되 의도적으로 dereference하지 않아, bit 보존과 object lifetime 보존의 경계를 문서화한다.

token 폭과 header 사용 가능성을 확인해 platform 가정도 외부에서 관찰 가능하게 만든다. 핵심 불변식은 serialization이 ownership을 이전하지 않는다는 점이다. 원래 owner가 계속 mutation과 destruction을 통제하며, 호출자는 만료된 token을 유효한 object reference로 취급해서는 안 된다.

## feat(casts): runtime type CLI mode 추가
type-boundary executable에 runtime mode를 추가한다. 텍스트 A/B/C selector를 `RuntimeKind`로 매핑하고, 다형 객체를 생성한 뒤 pointer와 reference 경로 모두로 식별하고 virtual base destructor를 통해 해제한다.

객체 분류와 소멸이 모두 성공한 뒤에만 출력을 구성한다. CLI는 selection, factory allocation, RTTI observation, polymorphic deletion으로 이어지는 전체 수명을 보여 주되 hierarchy와 cast 규칙은 library에 남겨 둔다.

## feat(casts): address token CLI mode 추가
unsigned decimal identifier를 엄격하게 파싱하고 stack `Payload`를 만든 뒤, 해당 주소를 serialize 및 deserialize하고 nonzero token, identity, field preservation 검사를 출력하는 address mode를 추가한다. 10진수 파싱은 수동으로 구현하고 overflow를 검사하므로 locale에 따라 일부 숫자 prefix만 받아들이는 대신 의도한 byte grammar만 허용한다.

이 mode는 round trip 전체 동안 payload의 수명을 유지하며 token이 이를 소유한다고 표현하지 않는다. 출력으로 실제 보장 범위를 관찰할 수 있다. 객체의 수명 안에서는 복원된 pointer가 동일한 주소를 가리키고 같은 payload를 본다.

## test(casts): 타입·주소 변환의 공개 경계 검증
여러 type-boundary 규칙을 compile-time test로 만든다. utility class는 생성할 수 없어야 하고, runtime identification은 무관한 pointer type을 받아서는 안 되며, serialization은 `Payload*`의 `const`를 암묵적으로 제거해서는 안 된다. 이 negative case들은 편의를 위한 overload가 의도적으로 좁게 설계한 low-level API를 넓히지 못하도록 한다.

command-line case에서는 정상 runtime 및 address mode, malformed 및 overflow numeric input, 실패 시 standard output이 없음을 검증한다. unit test에는 lifetime과 identity 검사를 유지하므로 static type system과 process behavior가 같은 ownership 및 conversion 경계를 강제한다.

## feat(template): 임의 접근 container batch 추상화 추가
값 타입과 설정 가능한 sequence container를 받는 header-only `RandomAccessBatch` template을 추가하며 기본값은 `std::vector`다. container의 iterator type, 검사된 index 접근, 삽입, range iteration, `std::sort`를 사용한 정렬, range equality를 제공한다. `std::sort`를 의도적으로 사용해 random-access iteration을 주석에 적힌 요구사항이 아니라 실제 template 요구사항으로 만든다.

복사 대입은 copy-and-swap을 사용하므로 완전한 container 복사와 예외를 던지지 않는 상태 교환이 제공하는 수준의 예외 보장을 얻는다. vector와 deque를 모두 지원함으로써 추상화가 하나의 구체 표현이 아니라 필요한 capability에 의존함을 보여 준다. 반대로 list 계열 container를 거부해 algorithmic requirement를 정확하게 유지한다.

## test(template): iterator·정렬·복사 실패 계약 검증
vector와 deque 저장소를 사용해 `RandomAccessBatch`를 검증하고, mutable/const iterator, standard algorithm, 검사된 접근, 정렬, range equality, 일반 복사, 대입, 자기 대입을 모두 테스트한다. 이를 통해 동작 결과뿐 아니라 generic interface 형태도 관찰 가능하게 만든다.

이후 copy에서 예외를 던지는 값 타입으로 실패를 주입하고 live object 수를 센다. 생성 또는 대입 실패가 일부만 복사된 값을 leak해서는 안 되며, 대입은 candidate container가 완성될 때까지 destination을 보존해야 한다. 이를 통해 element의 copy가 noexcept가 아닌 경우에도 template의 값 의미론이 유효함을 확인한다.

## feat(rpn): signed token과 stack 문법 처리
`RpnEvaluator`의 lexical 및 structural 기반을 만든다. token은 명시적인 ASCII 공백 규칙으로 구분하고, signed decimal operand는 수동으로 파싱한다. magnitude 누적에는 범위를 두어 parsing 중 overflow 없이 `LONG_MAX`와 절댓값이 비대칭인 `LONG_MIN`까지 표현할 수 있게 한다.

evaluation은 자체 stack을 사용하며 expression이 정확히 하나의 결과만 남겨야 한다. malformed token이나 잘못된 stack shape는 evaluator의 domain error를 발생시킨다. token 인식을 locale이나 stream의 prefix parsing과 분리하여 이후 arithmetic이 완전히 검증된 integer operand에 대해서만 수행되도록 한다.

## feat(rpn): overflow 검사 산술 연산 구현
네 가지 RPN operator를 signed operation 수행 전에 검사하도록 구현한다. 덧셈과 뺄셈은 operand를 해당 `LONG_MIN`/`LONG_MAX` 여유 범위와 비교하고, 곱셈은 부호와 unsigned magnitude를 기준으로 판단해 `LONG_MIN` 절댓값의 비대칭을 처리한다. 나눗셈은 0과 특수한 `LONG_MIN / -1` overflow case를 거부한다.

operand는 오른쪽 값, 왼쪽 값 순서로 pop해 subtraction과 division의 비가환 의미를 보존한다. overflow하는 식 자체를 실행하지 않는 것이 중요하다. signed overflow 후 잘못된 결과를 감지하려 하면 이미 undefined behavior가 발생한 뒤이기 때문이다. evaluator stack은 호출 내부의 local state이므로 arithmetic failure가 외부에 결과를 반영하지 않는다.

## test(rpn): 산술 경계와 잘못된 token 검증
정상 operator 동작, operand 순서, signed token, `long` 양 끝값, 모든 overflow/underflow 방향, 0 나눗셈, malformed number, unknown token, operand 부족 및 과잉, 공백 경계를 검증한다.

이 suite는 evaluator를 네 개의 arithmetic helper가 아니라 하나의 완전한 언어로 검증한다. 특히 정확한 `LONG_MIN` parsing과 multiplication/division edge case는 evaluation이 undefined signed-overflow behavior에 들어가지 않도록 하기 위한 precondition check를 보호한다.

## feat(batch): 작업 결과 값 객체 정의
batch subsystem에서 공통으로 전달하는 값으로 `JobResult`를 추가한다. job 이름과 계산된 `long` 값을 저장하고 const accessor만 공개하며, 두 필드를 모두 기준으로 equality를 정의한다.

result를 parser, evaluator, container type과 독립적으로 유지하여 vector 기반 batch와 deque 기반 batch가 공통 비교 단위를 사용할 수 있게 한다. 기본값도 제공하므로 별도의 ownership이나 lifetime 정책을 추가하지 않고 일반적인 container operation에 사용할 수 있다.

## feat(batch): 입력 문법과 원자 교체 구현
`BatchEngine::replace()`를 전체 입력 단위 transaction으로 도입한다. 비어 있지 않은 각 record를 이름과 RPN expression으로 나누고, 명시적인 ASCII 규칙으로 trim하며, engine의 identifier grammar에 따라 검증하고, 중복 이름을 확인한 뒤 평가하여 local candidate result set에 추가한다. 빈 입력, malformed record, 중복 이름, evaluator 오류, stream 실패는 모두 작업을 거부한다.

engine은 전체 stream을 성공적으로 받아들인 뒤에만 candidate를 `results_`와 swap한다. 따라서 parsing, uniqueness, arithmetic, allocation failure가 새 batch의 prefix만 외부에 노출하지 않으며, 별도의 보상 코드를 작성하지 않아도 기존 engine state 자체가 rollback value가 된다.

## feat(batch): 결과 정렬과 직렬화 제공
수치 값, 그다음 이름 순으로 canonical result order를 정의해 같은 값을 가진 job에도 결정적인 tie breaker를 제공한다. publication 전에 candidate를 정렬하므로 comparison이나 allocation failure가 발생해도 engine에 일부만 재정렬된 result set이 남지 않는다.

직렬화는 classic-locale temporary stream을 사용하고 완성된 byte를 나중에 destination으로 출력한다. 이를 통해 formatting을 호출자의 locale 및 flag와 분리하고, formatting 실패가 record sequence의 일부만 출력하는 것을 막는다. 프로젝트의 다른 staged output과 마찬가지로 최종 destination write 자체가 본질적으로 실패하는 stream을 원자적으로 만들 수는 없다. transaction이 보장하는 범위는 result 구성과 rendering이다.

## feat(batch): batch engine CLI 제공
두 가지 명시적 mode를 가진 하나의 executable을 추가한다. 전달받은 RPN expression을 평가하거나 batch stream을 읽고 처리한다. 두 mode 모두 grammar, arithmetic, sorting, formatting을 library object에 위임하며 application은 인자 검증, 예외 변환, process status만 책임진다.

batch output은 `replace()`가 완료된 뒤에만 요청하므로 malformed input에서 성공적으로 parse된 prefix가 출력될 수 없다. 오류는 실패 exit status와 함께 standard error로 보내고 standard output은 성공 결과 전용 channel로 유지한다.

## test(batch): 입력 검증·정렬·CLI 결과 검증
unit, compile, process test를 통해 batch grammar와 result contract를 명세한다. 유효한 record, 공백 처리, 중복 및 malformed name, 잘못된 RPN expression, 빈 입력, value/name ordering, 검사된 result 접근, 결정적인 serialization을 직접 검증한다.

CLI fixture는 RPN과 batch mode 모두에서 정확한 성공 출력, error status, 거부된 작업에 대한 standard output 부재를 확인한다. stream-state 검사는 engine의 classic-locale staging이 호출자가 소유한 formatting 설정을 덮어쓰지 않는지도 검증한다.

## feat(batch): 두 container의 정렬 결과 대조
허용된 각 job을 vector 기반과 deque 기반 `RandomAccessBatch` candidate 양쪽에 평가하고, 같은 total ordering으로 독립적으로 정렬한 뒤 vector result를 반영하기 전에 두 range를 비교한다. 불일치가 발생하면 `logic_error`를 던지고 engine의 이전 상태를 유지한다.

이 중복 계산은 optimization이 아니라 의도적인 verification이다. generic abstraction을 서로 다른 두 random-access 표현에서 실행하여 integration 경계에서 representation-dependent ordering이나 copy behavior를 탐지한다. 추가 메모리와 정렬 비용을 지불하는 대신 내부 일관성 검사를 얻는다.

## test(batch): 입력 순열과 출력 결정성 검증
삽입 순서와 선택한 random-access container가 canonical result에 영향을 주지 않는지 검증한다. 같은 job 집합의 여러 permutation은 모두 동일한 value/name ordering을 만들어야 하고, vector와 deque batch의 결과가 일치해야 하며, 같은 engine state를 반복해서 출력하면 byte 단위로 동일해야 한다.

이 테스트는 determinism과 단순한 sortedness를 구분한다. name tie breaker가 빠진 comparator도 수치 기준으로는 정렬된 것처럼 보일 수 있지만, 같은 값을 가진 job은 입력 순서나 구현에 따라 다른 순서로 출력될 수 있다.

## fix(batch): 입력 stream 종료 상태를 명확히 구분
일반적인 `getline` loop 조건을 세 가지 결과를 구분하는 record reader로 교체한다. 완전한 line, trailing newline 없이 끝난 마지막 line 뒤의 clean EOF, 실제 input failure를 각각 구분한다. 마지막 record는 trailing newline이 없어도 허용하지만 `badbit` 또는 EOF가 아닌 실패는 transaction을 거부한다.

이 수정은 서로 반대되는 두 오류를 막는다. 유효한 마지막 line을 버리는 문제와 I/O fault를 정상적인 입력 종료로 취급하는 문제다. `replace()`는 reader가 clean end를 보고한 뒤에만 commit하므로 transport state도 syntax 및 arithmetic과 같은 atomic input contract의 일부가 된다.

## test(batch): 입력·산술·할당 실패 뒤 상태 복원 검증
알려진 result로 `BatchEngine::replace()`의 초기 상태를 만든 뒤 malformed input, RPN arithmetic failure, stream failure, 관찰되는 모든 allocation failure를 강제로 발생시킨다. 거부된 replacement는 이전 result object와 직렬화된 byte를 모두 보존해야 하며, live allocation 기준값도 원래 값으로 돌아와야 한다.

command-line failure case는 같은 불변식의 외부 효과까지 확인한다. 부분 성공 출력이 외부로 나가서는 안 된다. 이 suite는 record parsing, duplicate tracking, evaluator stack, 두 candidate container, sorting, comparison, final publication 등 협력하는 모든 계층에 걸친 rollback을 검증한다.

## test(contracts): 공개 include와 소유권 규칙 검증
전체 공개 library에 걸쳐 compile-time contract coverage를 확장한다. positive consumer는 설치된 header만 include하고 archive에 link한다. negative translation unit은 abstract interface, protected/private construction, explicit conversion boundary, const accessor, non-constructible utility class, 금지된 list 기반 sorting, ownership에 민감한 pointer signature를 검증한다.

이 테스트는 API 형태 자체를 regression coverage에 포함한다. runtime test는 모두 통과하더라도 mutation이 실수로 노출되거나 implicit conversion이 허용되거나 abstraction이 사라지거나 private include에 의존하게 된 변경은 외부 C++98 consumer가 마주칠 같은 경계에서 실패한다.

## test(rtti): integer에서 runtime kind로의 암시 변환 거부
임의 integer를 `RuntimeKind`가 필요한 위치에 전달할 수 없음을 negative compile case로 증명한다. factory의 discriminator는 숫자 편의 매개변수가 아니라 닫힌 semantic type이므로, 잘못된 값은 runtime에 도달하기 전에 overload resolution에서 거부되어야 한다.

이에 따라 enum 값을 강제로 만든 runtime test는 제거한다. 의도적인 explicit cast를 사용하면 여전히 API 보호 바깥에서 잘못된 enum을 만들 수 있지만, 공개 계약은 type system의 모든 우회 방법을 검증한다고 약속하는 대신 일반적인 implicit misuse를 막는 데 초점을 둔다.

## test(release): 정적 archive와 외부 dependency 검증
archive 자체와 link된 executable에 대한 release structure 검사를 추가한다. 결정적인 manifest에 archive member와 exported symbol을 기록하여 object 누락, 중복 packaging, public-symbol drift가 드러나게 한다. 플랫폼별 binary inspection은 외부 dynamic dependency를 기록하고 embedded runtime search path를 거부한다.

이 검증은 deliverable을 단순히 compile되는 source 이상으로 취급한다. consumer는 정의된 구성의 static archive와 관찰 가능한 linkage 가정을 가진 executable을 받는다. 둘 중 하나가 바뀌면 배포 동작이 조용히 변하는 대신 manifest를 명시적으로 검토해야 한다.

## test(release): 실행 결정성과 메모리 해제 검증
고정된 locale과 time-zone 설정에서 대표 command-line program을 반복 실행하고 전체 출력을 비교한다. scalar 및 batch 코드가 보장하는 결정적 formatting이 최종 binary에서도 유지되고 주변 process 설정에 오염되지 않는지 확인한다.

host가 leak inspection tool을 제공하는 경우 unit, no-elide, failure, public-contract executable도 종료 후 검사한다. platform gate를 통해 portable suite는 계속 사용할 수 있으면서 지원되는 system에서는 구체적인 lifetime 근거를 추가한다. 두 검사를 합쳐 process 범위에서 반복 가능한 관찰 결과와 소유 메모리 해제를 확인한다.

## build(check): undefined behavior 검사 대상 추가
library 구현, test, support code를 instrumentation과 함께 compile하고 failure-on-report 설정으로 suite를 실행하는 UndefinedBehaviorSanitizer build를 추가한다. 실제 구현 unit에 instrumentation을 적용하는 것이 중요하다. 이미 빌드된 archive나 test harness만 sanitize하면 검사 대상 코드가 계측되지 않은 채 남는다.

이 계층은 명시적인 boundary test를 보완한다. arithmetic과 cast 코드는 설계상 undefined behavior를 피하도록 작성되어 있고, sanitizer는 실행된 경로에서 invalid operation, misaligned access 또는 관련 runtime violation이 실제로 발생하지 않는다는 동적 근거를 제공한다.

## test(format): 복제 실패 뒤 부분 객체 정리 검증
pipeline copy construction과 assignment 중 모든 formatter 위치에서 clone failure를 주입한다. constructor가 실패하면 불완전한 pipeline의 destructor가 실행되지 않더라도 실패 전에 생성된 모든 clone을 삭제해야 한다. assignment가 실패하면 destination의 기존 step과 동작도 그대로 유지되어야 한다.

live-object counter는 source pipeline이 온전하게 남아 있고 partial clone이나 교체 대상 object가 leak하지 않는지 확인한다. 이를 통해 구현의 두 가지 서로 다른 cleanup mechanism, 즉 copy constructor의 catch block과 assignment의 copy-and-swap transaction을 직접 검증한다.

## fix(contact): 할당 실패에도 저장 상태 보존
선택한 ring slot을 건드리기 전에 분리된 replacement contact를 준비하도록 `ContactBook::add()`를 강화한다. 입력 string을 복사하는 과정에서 allocation 및 예외가 발생할 수 있지만, 이제 그런 실패는 local temporary에만 영향을 준다. replacement가 완성된 뒤에만 예외를 던지지 않는 `swap()`으로 slot에 반영한다.

ring cursor와 logical size는 이 commit이 끝난 뒤에만 전진한다. 이 순서는 slot content, `next_`, `size_` 사이의 결합된 불변식을 보존한다. 실패가 발생했을 때 대응하는 성공 삽입 없이 저장된 contact 일부만 교체되거나 논리적 최오래 위치만 이동할 수 없다.

## test(contact): 연락처 교체 실패 회귀 검증
contact book을 최대 용량까지 채운 뒤 가장 오래된 항목을 교체하는 동안 관찰되는 모든 allocation 지점에 실패를 주입하고, size, logical order, field value, live-allocation count가 그대로인지 검증한다. 마지막으로 정상 삽입을 수행해 failure sweep 이후에도 ring이 정상적으로 전진하는지 확인한다.

이 테스트는 이전에 취약했던 full-capacity 경로를 직접 겨냥한다. 하나의 물리 slot 변경과 logical cursor 변경이 하나의 개념적 transaction이기 때문이다. 이후 단순화 과정에서 예외를 던질 수 있는 direct assignment가 저장 상태에 다시 도입되는 것을 막는다.

## test(consumer): 저장소 밖 공개 library 연결 검증
repository tree 밖에서 임시 consumer를 빌드하되 공개 include directory와 `libcpp_foundation.a`만 사용하고, 해당 외부 위치에서 program을 실행한다. test 전용 helper가 아니라 공개 object를 사용하므로, 성공하면 설치된 header가 self-contained이고 archive가 필요한 정의를 제공한다는 점을 입증한다.

이 검사는 in-tree test가 우연히 숨길 수 있는 의존성을 찾는다. private include path, working-directory assumption, archive에 포함되지 않은 object, repository file에 대한 암묵적 접근 등이 대상이다. cleanup trap을 사용해 compilation이나 execution이 실패하더라도 verification 환경을 격리한다.

## test(boundary): 변환·배치 속성과 대용량 경계 검증
고정된 linear-congruential seed로 구동되는 결정적 property-style test를 추가한다. 생성한 수천 개 integer literal은 네 개의 안정적인 scalar line을 출력해야 하고 trailing invalid byte가 붙으면 출력 없이 거부되어야 한다. 범위를 제한한 수천 개 binary RPN expression은 네 operator 전부에서 직접 계산한 결과와 비교한다.

그다음 200KB가 넘는 4,096-job batch를 parse 및 evaluate하고, value와 name 기준으로 독립적으로 정렬해 record별로 비교한 뒤 150KB를 넘는 동일한 출력으로 두 번 serialize한다. 고정 seed와 첫 counterexample 보고는 flaky randomness 없이 넓은 state-space coverage를 제공하며, 대규모 case는 손으로 작성한 fixture를 넘어 allocation growth, sorting, deterministic output을 검증한다.

## build(check): sanitizer와 portable 검사 계층 구성
검증을 명시적인 portability 계층과 platform 계층으로 재구성한다. clean rebuild, test, compiler contract, archive check, external-consumer check, deterministic property, UndefinedBehaviorSanitizer는 portable baseline을 구성한다. AddressSanitizer와 host-specific release inspection은 별도의 platform check로 분리하고, aggregate target은 서로 다른 전제 조건을 숨기지 않은 채 이들을 조합한다.

빌드는 reconstruction, incremental no-op 동작, deterministic artifact도 검증한다. 이 구조는 사용할 수 없는 host tool 때문에 language-level validation이 약해지는 것을 막으면서, 지원되는 가장 강한 검사를 하나의 contract로 쉽게 실행할 수 있게 한다.

## test(portability): 지원 LP64 데이터 모델 검증
8-bit byte, 2-byte `short`, 4-byte `int`, 8-byte `long`, 8-byte pointer, 8-byte `size_t`에 대한 assertion을 compile하여 구현이 지원하는 data model을 명시한다. 이 가정은 정확한 scalar 경계, `long` RPN arithmetic, allocation size, pointer-to-integer address token과 관련된다.

다른 ABI가 compile된 뒤 잘못된 serialization이나 range 동작을 내도록 두는 것보다 이름이 명확한 LP64 check에서 일찍 실패하는 편이 낫다. 이 테스트는 지원 portability 범위를 정확하게 정의한다. 코드는 선언된 model을 만족하는 system과 compiler에서 검증되며, ABI 독립적이라고 주장하지 않는다.

## ci: 지원 compiler와 platform matrix 검증
Linux의 GCC 및 Clang, macOS의 Clang에서 전체 build contract를 자동으로 검증한다. matrix 수준에서는 fail-fast를 비활성화하고 각 job이 build 중심 verification stack을 수행하므로 한 platform이나 compiler의 실패 때문에 다른 환경의 근거가 사라지지 않는다.

UndefinedBehaviorSanitizer는 지원 matrix 전체에서 실행하고, AddressSanitizer는 프로젝트가 안정적으로 활성화한 host로 제한한다. 최소 repository permission과 명시적인 time limit으로 CI의 운영 범위를 줄인다. 이 matrix는 지원 compiler, operating system, sanitizer, LP64에 대한 주장을 지속적으로 실행되는 compatibility evidence로 바꾼다.
