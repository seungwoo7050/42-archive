# 프로젝트 중요도 프로필
프로젝트: cpp-foundation
도메인: C++98 객체 모델, 수동 자원 관리, 다형성, 타입 및 수치 경계, generic container, 정적 라이브러리 release 검증.
주요 목적: C++98의 값 의미론, 소유권, 복사, 예외 안전성, 변환 정확성, 결정적 출력, 공개 API 경계를 관찰하고 테스트할 수 있도록 하나의 정적 라이브러리와 여섯 개의 작은 CLI consumer를 구축한다.
확정된 커밋 범위: `cpp/cpp-foundation`에서 도달 가능한 완전하고 독립적인 선형 history로, root `2cde0105fcb6`부터 head `709124d5e2ed`까지 총 75개 커밋이다. root에는 parent가 없고 branch에는 merge commit이 없으며, 상속된 무관한 history도 없다. 문서만 변경한 커밋 두 개도 분류에 포함한다. 12자리 SHA 축약형으로 범위 내 모든 커밋을 고유하게 식별할 수 있다.

## 핵심 기술 영역
- C++98 Rule of Three에 따른 직접 자원 소유와 regular value semantics.
- 다형 객체의 clone, virtual destruction, heterogeneous dynamic object ownership.
- 분리된 candidate, cleanup, 예외를 던지지 않는 swap으로 구현한 강한 예외 보장.
- 전체 입력을 엄격하게 검증하는 ASCII 기반 scalar, RPN, batch 문법.
- 수치 표현 가능 범위, signed overflow 방지, negative zero, locale 독립적 rendering.
- generic random-access container 요구사항, iterator 노출, 정렬, container 간 일관성.
- 입력 순열, locale, 반복 실행에 영향을 받지 않는 결정적 순서와 출력.
- 공개 header 격리, compile-time negative contract, 외부 static-library 사용, 지원 platform 검증.

## 핵심 아키텍처
- `include/cppf`는 공개 C++98 타입과 계약을 정의하고, `src`는 구현 세부 사항, 자원 상태 전이, parsing, 상태 반영을 담당한다.
- `libcpp_foundation.a`가 공통 deliverable이다. `apps/ex00`부터 `apps/ex05`까지 여섯 binary는 command-line 또는 stream 입력을 공개 library에 연결하는 얇은 consumer다.
- 초기 value object에서 직접 메모리 ownership으로 확장하고, 이어 clone 기반 polymorphism과 factory 통합, scalar 및 RTTI 경계, 마지막으로 template, RPN, batch 통합으로 발전한다.
- 상태를 교체하는 연산은 candidate object 또는 candidate container를 사용하고, 모든 작업이 성공한 뒤에만 `swap`으로 결과를 반영한다.
- 검증은 unit test, allocation/clone failure injection, no-elide build, positive/negative compile contract, CLI fixture, external consumer, fixed-seed property, sanitizer, release check, CI로 계층화되어 있다.

## 핵심 불변식
- 직접 또는 다형적으로 소유한 모든 자원은 정확히 한 번 해제하며, 복사 시 pointer aliasing이 아니라 독립적인 ownership을 생성한다.
- 강한 보장을 명시한 연산은 allocation, clone, parse, arithmetic 또는 stream-read 준비가 실패해도 소유 객체의 관찰 가능한 상태를 변경하지 않는다.
- candidate는 완성되기 전까지 반영하지 않으며, 부분적으로 구성된 pipeline, contact, batch result는 temporary owner 내부에만 존재해야 한다.
- 빌린 reference, `c_str()` pointer, result reference, 직렬화된 address token은 source object보다 오래 살아 있거나 source의 ownership을 획득하지 않는다.
- signed arithmetic은 실행 전에 검사하므로 오류 감지 자체가 undefined overflow에 의존하지 않는다.
- 허용된 텍스트는 전체 ASCII 문법과 일치해야 하며 `LONG_MIN`, negative zero, finite-range overflow, nonzero underflow 같은 의미 있는 경계를 보존해야 한다.
- batch output은 `(value, name)` 기준의 total order를 가지며 입력 순열과 반복 rendering에 관계없이 동일해야 한다.
- 공개 header는 private include path 없이 compile되고, private representation에는 접근할 수 없으며, 지원하는 C++98 LP64 platform 가정은 명시되어 있다.

## 주요 구현 난점
- 수동으로 할당한 C 문자열에 깊은 복사와 예외 안전한 대입 구현.
- `clone()`과 factory 생성이 raw pointer를 반환하는 상황에서 heterogeneous polymorphic object를 소유하고 복사하는 처리.
- 생성이 완료되지 않아 destructor가 호출되지 않는 copy constructor에서 일부만 clone된 object를 정리하는 처리.
- 여러 단계의 factory 생성과 전체 stream batch 교체 과정에서 target이 부분적으로 변경되지 않도록 하는 처리.
- locale 영향을 받지 않게 floating literal을 parse하면서 negative zero를 보존하고 조용한 nonzero underflow를 거부하는 처리.
- overflow하는 표현식을 먼저 실행하지 않고 모든 signed `long` arithmetic을 검사하는 처리. 특히 `LONG_MIN`의 비대칭적인 magnitude가 문제된다.
- trailing newline이 없는 정상적인 마지막 line과 실제 stream failure를 구분하는 처리.
- 결정적인 total ordering과 transactional publication을 유지하면서 vector와 deque 모두에서 generic behavior를 입증하는 처리.
- portable verification과 host별 archive, dependency, leak, sanitizer 기능을 분리하는 작업.

## 실무적 엔지니어링 영역
- 안정적인 예외 분류와 process 수준 error channel 동작.
- abstraction, constness, construction, conversion, container 요구사항의 compile-time 강제.
- live object 또는 live block을 계수하는 allocation/clone failure sweep.
- classic-locale rendering과 호출자 stream state 비간섭성.
- in-tree compilation에만 의존하지 않는 external-consumer 및 release-artifact 검증.
- 재현 가능한 fixed-seed property test, timeout, sanitizer, compiler/platform matrix.
- object state까지만 보장하고 stream position이나 외부 callback side effect까지 rollback하지 않는다는 경계를 명시한 문서화.

## S 등급 기준
- branch를 대표하는 ownership, polymorphic clone, generic container, checked arithmetic, transactional publication 메커니즘을 확립한다.
- 없으면 프로젝트의 핵심 object model 또는 batch processing 흐름을 정확하게 설명할 수 없는 불변식을 도입하거나 수정한다.
- 이후 subsystem 구조를 실질적으로 결정하는 어려운 lifecycle 또는 correctness 문제를 해결한다.
- 이후 주요 component에서 직접 재사용되는 기반 abstraction을 제공한다.

## A 등급 기준
- 핵심 메커니즘에 중요한 edge case 또는 failure path engineering을 추가한다.
- 중요한 public API, deterministic output, integration, portability, verification 경계를 확립한다.
- 전체 architecture를 다시 정의하지는 않지만 단순하지 않은 debugging으로 중요한 local invariant를 복구한다.
- allocation, clone, parsing, arithmetic, lifecycle failure에 대해 이례적으로 강한 regression evidence를 제공한다.

## 일반적인 B 등급 작업
- 이미 확립된 설계 안에서 일반적인 기능, CLI adapter, value object, 예상 가능한 test를 구현한다.
- 기존 ownership, parsing, ordering, verification pattern을 다른 component에 적용한다.
- 책임 경계를 바꾸지 않고 제한적인 compile, release, sanitizer, portability, CI coverage를 추가한다.
- 핵심 판단이 다른 commit에 있는 더 큰 메커니즘을 위한 보조 요소를 제공한다.

## 일반적인 C 등급 작업
- 문서만으로 프로젝트 맥락을 정리하거나 통합한다.
- 실행 동작, ownership, state, API, verification에 영향을 주지 않는 기계적이거나 표현 중심의 작업.
- branch의 engineering decision을 이해하는 데 기여도가 낮은 소규모 유지보수.

## 프로젝트별 태그
OWNERSHIP — 직접 또는 다형 자원의 소유권, 깊은 복사, 삭제, 빌린 참조의 수명 경계.
EXCEPTION — 강한/기본 예외 보장, candidate-and-swap 방식의 transaction, rollback, 자원 정리.
POLYMORPHISM — 가상 interface, clone, RTTI, 파생 객체의 수명 주기.
PARSING — 명시적인 ASCII token, literal, line, record 문법.
NUMERIC — 표현 가능 범위, overflow, underflow, signed 범위, scalar projection.
DETERMINISM — locale 독립적 rendering, 전체 순서, 입력 순열 불변성, 반복 출력 안정성.
API — 공개 header, 캡슐화, const 제약, compile-time contract, 외부 consumer.
GENERIC — template/iterator 요구사항, 설정 가능한 container, container 간 동작.
PORTABILITY — C++98, LP64, compiler/platform, sanitizer, archive, dependency, release 관련 가정.

# 커밋 분류

| 커밋 | 제목 | 중요도 | 태그 | 요약 | 중요 이유 |
| --- | --- | --- | --- | --- | --- |
| `2cde0105fcb6` | docs(readme): C++98 라이브러리 개발 기준 정의 | C | - | C++98 개발 원칙을 설명하는 초기 README를 추가한다. | 문서만으로 프로젝트의 맥락을 정의한다. 배경 설명은 제공하지만 실행 가능한 메커니즘이나 불변식은 추가하지 않는다. |
| `2d56fbdbd013` | build(makefile): C++98 정적 라이브러리 빌드 구성 | A | ARCH, PORTABILITY | 엄격한 C++98 정적 라이브러리 빌드, 의존성 추적, 산출물 수명 주기를 구성한다. | repository 전체의 compile 및 packaging 규칙이 이후 모든 commit에 영향을 주지만, library의 object-model 메커니즘을 직접 정의하기보다는 이를 지원하는 기반이다. |
| `70e6779470fe` | feat(contact): 검증된 연락처 값 객체 구현 | B | CORE | 출력 가능한 ASCII 및 길이 제한을 검증하는 `Contact` 값 객체를 도입한다. | 기본기가 갖춰진 도메인 구현이지만 validation model은 해당 component에 한정되며 이후 ownership 또는 transaction architecture를 확립하지는 않는다. |
| `218c797fe078` | test(contact): 연락처 값 불변식 검증 | B | TEST, EDGE | 연락처 유효성, 복사, accessor, swap에 대한 unit coverage를 추가한다. | 이미 확립된 작은 value type의 계약을 유용하게 검증하지만 어려운 failure mechanism을 드러내는 작업은 아니다. |
| `2f9b934b0825` | feat(contact): 고정 크기 연락처 저장 순서 보존 | B | CORE | 가장 오래된 항목부터 최신 항목까지 논리 index를 제공하는 8-slot circular `ContactBook`을 추가한다. | ring representation은 해당 component에서 중요하지만 프로젝트 전체를 정의하지는 않는 일반적인 bounded-state 기능이다. |
| `623dc4bba8f0` | test(contact): 연락처 저장 용량과 논리 순서 검증 | B | TEST, EDGE | 제한된 용량, 교체 순서, 논리 indexing, range error를 검증한다. | 새로운 architecture decision이라기보다 circular buffer에 필요한 예상 가능한 behavior coverage다. |
| `ea3d245cdb13` | feat(contact): 연락처 목록의 스트림 출력을 지원 | B | DETERMINISM | contact record를 논리 순서대로 stream에 출력하는 기능을 추가한다. | 이미 확립된 `ContactBook` model 안에서 제공하는 직관적인 serialization 기능이다. |
| `f5a2c01c7d59` | feat(contact): 연락처 명령행 세션 연결 | B | INTEGRATION | contact-book command session과 일반화된 application build rule을 추가한다. | 기존 public API 위에 얹는 일반적인 CLI adaptation으로 도메인 model 자체는 바꾸지 않는다. |
| `6e78ced59357` | test(contact): 공개 계약과 명령행 세션 검증 | A | API, TEST, INTEGRATION | contact subsystem에 unit, compile-contract, CLI fixture 계층을 도입한다. | positive/negative public-interface check를 포함해 이후 branch 전체에서 재사용되는 multi-layer verification pattern을 확립한다는 점에서 중요하다. |
| `aa3b5ba6c3c4` | feat(buffer): 종료 문자를 포함한 문자열 저장소 소유 | A | OWNERSHIP, CORE | 검사된 접근과 예외를 던지지 않는 swap을 갖춘 NUL-terminated `char` buffer 소유 타입을 도입한다. | 첫 번째 direct-resource owner이며 이후 copy, formatter, failure-safety 작업이 의존하는 representation 및 lifetime 규칙을 확립한다. |
| `802656910803` | test(buffer): 저장 크기와 범위 접근 검증 | B | TEST, EDGE | 빈 값 정규화, size, terminator, mutability, bounds를 검증한다. | 새로 도입한 buffer representation에 대한 일반적인 검증이다. |
| `0bc528c7d58e` | feat(buffer): 깊은 복사와 정규 대입 구현 | S | OWNERSHIP, EXCEPTION, CORE | `TextBuffer`에 깊은 복사와 copy-and-swap 대입을 추가한다. | 프로젝트를 정의하는 commit이다. 첫 raw-memory owner를 독립 수명과 강한 대입 보장을 갖춘 regular value로 만들며, 이 pattern은 프로젝트 전반에서 재사용된다. |
| `0c8935e8cb54` | test(buffer): 복사 독립성과 자기 대입 검증 | B | TEST, OWNERSHIP | 복사 독립성, chained assignment, alias를 통한 자기 대입을 검증한다. | regular-value contract를 확인하는 데 필요하지만 결정적인 설계 자체는 앞선 구현 commit에 있다. |
| `93faed0d67a2` | feat(buffer): 결합·비교·출력 연산 제공 | A | OWNERSHIP, EXCEPTION, CORE | overflow 검사와 allocate-before-commit 처리를 포함한 결합, 비교, stream 연산을 추가한다. | self-aliasing과 실패 시 상태 보장을 약화하지 않으면서 소유 값을 확장한다는 점에서 중요하며, 단순한 operator boilerplate보다 의미가 크다. |
| `ad1c00300b26` | feat(buffer): 문자열 결합 CLI 제공 | B | INTEGRATION | `TextBuffer` 두 개를 결합해 출력하는 CLI를 추가한다. | 이미 확립된 public API를 보여 주는 단순 consumer다. |
| `8da865e94358` | test(buffer): 연산자와 명령행 결합 결과 검증 | B | TEST, INTEGRATION | buffer operator와 실제 concatenation executable을 검증한다. | 기존 ownership design 안에서 이루어지는 일반적인 regression 및 integration coverage다. |
| `47134f9e3b29` | test(buffer): 할당 실패와 복사 생략 비활성화 검증 | A | TEST, EXCEPTION, OWNERSHIP | buffer 연산에 결정적인 allocation-failure injection과 no-elide build를 추가한다. | 모든 allocation point에서 leak 부재와 강한 보장에 대한 신뢰도를 크게 높이지만, 핵심 ownership architecture를 새로 만드는 작업이 아니라 이를 검증하는 작업이다. |
| `835d87865762` | feat(format): 다형적 formatter 인터페이스 정의 | S | ARCH, POLYMORPHISM, OWNERSHIP | abstract formatter interface, virtual destruction, cloning, 구체 transformation을 정의한다. | 프로젝트를 정의하는 commit이다. pipeline, factory, 이후 lifecycle test의 기반이 되는 다형 복사와 삭제 경계를 확립한다. |
| `262ada90ab53` | test(format): 파생 formatter의 동적 호출 검증 | B | TEST, POLYMORPHISM | base interface를 통해 동적 formatter dispatch와 이름을 검증한다. | 새로 확립된 polymorphic interface에 대한 예상 가능한 behavior coverage다. |
| `62ed45f8adf9` | feat(format): formatter 소유 pipeline 구현 | S | ARCH, POLYMORPHISM, OWNERSHIP | formatter clone을 소유하고 순서대로 적용하는 bounded pipeline을 도입한다. | 프로젝트를 정의하는 commit이다. heterogeneous dynamic object의 중심 owner를 만들고 이후 factory 작업이 사용하는 clone 기반 lifetime model을 확립한다. |
| `3526521537c2` | feat(format): pipeline 실행 CLI 제공 | B | INTEGRATION, POLYMORPHISM | 고정 formatter pipeline을 구성하고 실행하는 CLI를 추가한다. | pipeline architecture를 사용하는 일반적인 public-API consumer다. |
| `66bcd2b89282` | test(format): pipeline 적용 순서와 용량 경계 검증 | B | TEST, EDGE | identity 동작, step 순서, 용량 초과 거부, 상태 보존을 검증한다. | 중요한 local coverage지만 underlying owner와 failure order는 이미 구현에서 명확하게 정의되어 있다. |
| `bf4d9bed705c` | feat(format): pipeline 깊은 복사 구현 | S | OWNERSHIP, EXCEPTION, POLYMORPHISM | pipeline 깊은 복사, partial-construction cleanup, copy-and-swap assignment를 구현한다. | 프로젝트를 정의하는 commit이다. constructor/assignment failure 전반에서 heterogeneous owner를 안전하게 clone하는 것은 branch에서 가장 어려운 lifecycle mechanism 중 하나이며 regular-value 흐름에 필수적이다. |
| `68f4184812f4` | test(format): pipeline 복사와 자기 대입 검증 | B | TEST, OWNERSHIP | 독립적인 pipeline 복사, 대입, 자기 대입을 검증한다. | 메커니즘이 확립된 뒤 깊은 복사 의미론을 확인하는 일반적인 검증이다. |
| `0427713637b8` | test(format): 가상 소멸·추상 계약·CLI 검증 | A | API, TEST, POLYMORPHISM | abstractness, virtual destruction, public header, ownership counter, CLI 검사를 추가한다. | 단순 formatter 출력이 아니라 object-model boundary를 보호하고 일반적인 unit assertion으로 찾기 어려운 실패를 탐지한다는 점에서 중요하다. |
| `4c34654a4602` | feat(factory): 문자열 명세로 formatter 생성 | A | ARCH, POLYMORPHISM, API | formatter를 명세에서 생성하는 polymorphic creator와 문법을 추가한다. | builder가 사용하는 중요한 생성 경계와 raw-pointer ownership transfer를 도입하지만, 더 큰 pipeline architecture의 한 component에 해당한다. |
| `970ff9b3f24c` | test(factory): formatter 명세 분류 검증 | B | TEST, EDGE | 유효한 factory 명세를 검증하고 malformed input과 unknown input을 구분한다. | factory에 필요한 예상 가능한 grammar 및 error taxonomy coverage다. |
| `fc0b8b7a40a0` | feat(factory): formatter 임시 소유와 pipeline 교체 구현 | A | OWNERSHIP, INTEGRATION, EXCEPTION | factory 결과의 RAII ownership과 명세 목록 기반 pipeline 교체를 추가한다. | 두 ownership model을 결합하는 중요한 작업이다. 다만 초기 target mutation 순서는 이후 수정되므로 최종적인 transaction design은 아니다. |
| `536f1d329617` | test(factory): builder 소유권 이전 검증 | B | TEST, OWNERSHIP | builder 순서, 빈 교체, null/count 검증을 확인한다. | 첫 builder 구현에 대한 일반적인 coverage다. |
| `907bfbd5c37c` | fix(factory): 교체 실패에도 기존 파이프라인 보존 | S | DEBUG, EXCEPTION, CORE | 완전한 candidate pipeline을 만든 뒤 target과 swap하도록 수정한다. | 프로젝트를 정의하는 수정이다. 실제 partial-replacement 결함을 찾아내고, 이후 batch state replacement에도 반복되는 강한 transactional pattern을 확립한다. |
| `0f5928bcbabb` | feat(factory): 명세 기반 파이프라인 CLI 제공 | B | INTEGRATION | 명세 기반 pipeline CLI를 추가한다. | 수정된 builder와 factory API 위에 얹는 단순 process adapter다. |
| `466d7abdb60f` | test(factory): 교체 실패 상태 보존과 CLI 검증 | B | TEST, EXCEPTION | 교체 실패 시 기존 pipeline을 보존하는 regression 및 CLI 검사를 추가한다. | 앞선 S-level 수정에 집중한 중요한 확인이지만, 더 넓은 failure-point evidence는 이후 commit에서 추가된다. |
| `af4e35ca7d92` | test(factory): 생성·복제·할당 실패 정리 검증 | A | TEST, EXCEPTION, OWNERSHIP | creation, clone, allocation failure를 순회하며 cleanup과 target preservation을 검증한다. | 새로운 architecture를 도입하지 않지만 여러 ownership transition 전반에서 중요한 failure-path evidence를 제공한다. |
| `6a3d0461faab` | feat(scalar): scalar 리터럴 문법과 종류 분류 | A | PARSING, ARCH, NUMERIC | intermediate scalar-literal model과 명시적인 ASCII grammar를 도입한다. | parsing과 projection을 분리하고 모든 scalar conversion이 사용하는 semantic boundary를 만든다는 점에서 중요하다. |
| `a863f4899a93` | feat(scalar): locale 고정 수치 추출과 경계 보존 | A | NUMERIC, PARSING, HARD | locale 독립 numeric extraction, suffix grammar, negative zero, overflow, underflow 처리를 강화한다. | 허용된 텍스트의 의미가 조용히 바뀌는 것을 막는 어려운 boundary-correctness 작업이지만 영향 범위는 scalar subsystem에 한정된다. |
| `fc7faa10dc66` | test(scalar): literal 문법과 수치 범위 검증 | A | TEST, NUMERIC, EDGE | scalar grammar와 numerical boundary에 대한 폭넓은 test를 추가한다. | 일반적인 예제로는 놓치기 쉬운 negative zero, overflow, underflow, malformed-token case에 대한 근거를 확립한다. |
| `6abbb64a1c0c` | feat(scalar): 문자와 정수 투영 결과 출력 | B | NUMERIC, CORE | representability 검사를 포함한 공개 character 및 integer scalar projection을 추가한다. | 이미 확립된 parser/projection architecture 안에서 이루어지는 일반적인 구현이다. |
| `7cdcec341fb1` | feat(scalar): 부동소수점 표현과 원자 출력 구현 | A | NUMERIC, DETERMINISM, EXCEPTION | float/double projection과 classic-locale staged rendering을 추가한다. | target별 underflow와 special value를 처리하면서 formatting failure가 partial report를 노출하지 않게 한다는 점에서 중요하다. |
| `47ef67e3c03a` | feat(scalar): type boundary CLI의 scalar mode 제공 | B | INTEGRATION | type-boundary CLI에 scalar mode를 추가한다. | converter 위에 얹는 직관적인 command adapter다. |
| `afea789fd753` | test(scalar): 변환 가능성·출력·CLI 오류 검증 | A | TEST, NUMERIC, DETERMINISM | 정확한 projection, locale 독립성, stream-state 보존, public header, CLI 오류를 검증한다. | 새로운 core mechanism은 아니지만 완성된 scalar subsystem의 integration 및 boundary에 중요한 근거를 제공한다. |
| `52a9003a9be6` | feat(rtti): 다형 객체의 실행 시간 타입 식별 | B | POLYMORPHISM, CORE | 작은 RTTI hierarchy, factory, pointer/reference identification, 이름을 추가한다. | 잘 구현된 type-boundary 기능이지만 dynamic-cast 전략은 직접적이고 local하며 architecture의 중심은 아니다. |
| `8a49a13afe21` | test(rtti): pointer·reference 식별 경계 검증 | B | TEST, POLYMORPHISM | 등록된 타입, unknown/null runtime type, virtual deletion을 검증한다. | RTTI utility에 대한 예상 가능한 behavior 및 lifecycle coverage다. |
| `8e94677a6674` | feat(serialization): 빌린 객체 주소를 token으로 왕복 | B | OWNERSHIP, API | 빌린 `Payload` 주소를 pointer와 integer 사이에서 round trip하는 기능을 추가한다. | ownership 구분은 중요하지만 구현은 주요 mechanism이라기보다 범위가 좁은 demonstration이다. |
| `bd677962c9c3` | test(serialization): null과 주소 동일성 검증 | B | TEST, OWNERSHIP | pointer identity, aliasing, null, heap/stack case, expired token 비사용을 검증한다. | borrowed-address boundary에 대한 일반적인 contract coverage다. |
| `41af772a7d80` | feat(casts): runtime type CLI mode 추가 | B | INTEGRATION, POLYMORPHISM | runtime-type CLI mode를 추가한다. | 기존 factory와 RTTI 동작을 연결하는 단순 integration이다. |
| `bde686cd4af2` | feat(casts): address token CLI mode 추가 | B | INTEGRATION, NUMERIC | overflow를 검사하는 address-token CLI mode를 추가한다. | 충실한 boundary parsing 및 demonstration이지만 serializer contract를 바꾸지는 않는다. |
| `5dcf4615329a` | test(casts): 타입·주소 변환의 공개 경계 검증 | A | API, TEST, OWNERSHIP | utility construction, unrelated type, constness, address parsing에 대한 compile-fail 및 CLI 검사를 추가한다. | 안전하지 않은 여러 type-boundary misuse를 public interface에서 표현할 수 없게 만든다는 점에서 중요하다. |
| `708c025ef2a0` | feat(template): 임의 접근 container batch 추상화 추가 | S | ARCH, GENERIC, CORE | configurable random-access container를 사용하는 `RandomAccessBatch`와 container 간 range equality를 도입한다. | 프로젝트를 정의하는 commit이다. 최종 batch engine이 vector와 deque의 동작을 비교할 때 사용하는 generic container abstraction을 확립한다. |
| `aaeff163baf8` | test(template): iterator·정렬·복사 실패 계약 검증 | A | TEST, GENERIC, EXCEPTION | iterator, algorithm, vector/deque substitution, copy, throwing element type을 검증한다. | element behavior가 단순하지 않은 경우에도 template의 generic/exception guarantee가 유지된다는 중요한 근거를 제공한다. |
| `57a25e8475ab` | feat(rpn): signed token과 stack 문법 처리 | A | PARSING, NUMERIC, CORE | signed decimal token parsing과 구조적인 RPN stack language를 도입한다. | 정확한 `LONG_MIN` parsing을 포함해 최종 computation subsystem의 중요한 기반을 만들지만 arithmetic correctness는 이후에 완성된다. |
| `e1641a714172` | feat(rpn): overflow 검사 산술 연산 구현 | S | NUMERIC, HARD, CORE | signed 연산을 실행하기 전에 검사하는 덧셈, 뺄셈, 곱셈, 나눗셈을 구현한다. | 프로젝트를 정의하는 correctness mechanism이다. 특히 `LONG_MIN` 주변의 undefined signed overflow를 피하는 것은 branch에서 가장 어렵고 위험도가 높은 algorithm 중 하나다. |
| `aa0cc5e3e063` | test(rpn): 산술 경계와 잘못된 token 검증 | A | TEST, NUMERIC, EDGE | RPN 문법, operand 순서, 모든 arithmetic boundary, 0 나눗셈, malformed stack을 검증한다. | S-level arithmetic 및 parser contract에 대한 중요한 regression evidence다. |
| `f3efec4f6897` | feat(batch): 작업 결과 값 객체 정의 | B | CORE | batch processing에서 전달하는 immutable `JobResult` 값을 추가한다. | 직접적인 보조 value object다. |
| `d0295f82614b` | feat(batch): 입력 문법과 원자 교체 구현 | S | ARCH, EXCEPTION, INTEGRATION | 전체 stream batch parsing, uniqueness, RPN evaluation, swap-on-success replacement를 구현한다. | 프로젝트를 정의하는 integration이다. parsing, arithmetic, container, state publication을 강한 transaction boundary 뒤에 결합한다. |
| `42d411e42268` | feat(batch): 결과 정렬과 직렬화 제공 | A | DETERMINISM, EXCEPTION, CORE | total result ordering과 classic-locale staged batch serialization을 추가한다. | 재현 가능한 외부 동작에는 canonical order와 delayed publication이 필요하므로 중요하지만, 이미 확립된 batch transaction을 확장하는 작업이다. |
| `307605e4bbbf` | feat(batch): batch engine CLI 제공 | B | INTEGRATION | 최종 CLI에 RPN 및 batch mode를 추가한다. | 완성된 library mechanism 위의 일반적인 command adaptation이다. |
| `5a9381c4fa7f` | test(batch): 입력 검증·정렬·CLI 결과 검증 | A | TEST, PARSING, DETERMINISM | 폭넓은 batch grammar, ordering, stream-state, public-header, CLI test를 추가한다. | 허용/거부되는 전체 stream operation 모두에 대해 subsystem 수준의 중요한 신뢰도를 제공한다. |
| `af57a8f9c5fe` | feat(batch): 두 container의 정렬 결과 대조 | A | GENERIC, INTEGRATION, DETERMINISM | vector/deque 기반 batch를 각각 실행하고 정렬한 뒤 commit 전에 불일치를 거부한다. | generic abstraction을 최종 engine과 연결하는 의미 있는 프로젝트별 consistency check지만 engine의 transaction model 자체는 이미 존재한다. |
| `9ba0e7c897ed` | test(batch): 입력 순열과 출력 결정성 검증 | A | TEST, DETERMINISM, EDGE | input-permutation invariance, tie ordering, single-element behavior, 반복 가능한 출력을 검증한다. | comparator 및 container-order nondeterminism을 방지하는 중요한 검증이다. |
| `ea23237ad506` | fix(batch): 입력 stream 종료 상태를 명확히 구분 | A | DEBUG, PARSING, EDGE | clean EOF, newline 없이 끝난 마지막 record, 실제 stream failure를 구분한다. | architecture를 바꾸지 않으면서 batch input contract를 복구한 작지만 쉽게 놓치기 어려운 root-cause fix다. |
| `b4ddd78fb9aa` | test(batch): 입력·산술·할당 실패 뒤 상태 복원 검증 | A | TEST, EXCEPTION, RISK | engine state를 미리 구성한 뒤 malformed input, arithmetic, stream, allocation failure를 순회해 검증한다. | 여러 container가 참여하는 transaction이 모든 협력 failure path에서 실제로 rollback된다는 중요한 근거를 제공한다. |
| `4bbbfd191669` | test(contracts): 공개 include와 소유권 규칙 검증 | A | API, TEST, OWNERSHIP | 모든 public header와 ownership boundary에 positive/negative compile contract를 확장한다. | repository 전체에서 API shape와 external-consumer assumption을 강제한다는 점에서 중요하다. |
| `d9091fd91765` | test(rtti): integer에서 runtime kind로의 암시 변환 거부 | B | API, TEST | `RuntimeKind`로의 implicit integer conversion을 거부하는 negative compile case를 추가한다. | 이미 포괄적인 contract suite 안에서 이루어지는 좁은 type-safety regression test다. |
| `6b30f7297245` | test(release): 정적 archive와 외부 dependency 검증 | B | PORTABILITY, API | archive member/symbol manifest와 platform dependency/RPATH 속성을 검사한다. | 기존 build architecture 안에서 유용한 release validation을 제공하지만 object-model correctness의 중심은 아니다. |
| `fb3dfc935bc5` | test(release): 실행 결정성과 메모리 해제 검증 | A | TEST, DETERMINISM, OWNERSHIP | 반복 CLI 출력과 지원 platform에서 process 범위 leak 부재를 검사한다. | 프로젝트 전체의 두 가지 보장에 실무적으로 중요한 근거를 제공하지만 platform gating 때문에 architecture보다 verification 성격이 강하다. |
| `91739a5f0b63` | build(check): undefined behavior 검사 대상 추가 | B | PORTABILITY, TEST | UBSan으로 계측한 구현과 test target을 추가한다. | 유용한 dynamic validation이지만 기존 mechanism에 이미 확립된 tool을 적용하는 작업이며 구조를 재편하지는 않는다. |
| `2c99290b9268` | test(format): 복제 실패 뒤 부분 객체 정리 검증 | A | TEST, EXCEPTION, POLYMORPHISM | pipeline copy construction 및 assignment 중 clone failure를 순회한다. | success-path test로 증명하기 어려운 partially constructed polymorphic owner의 cleanup을 직접 검증한다는 점에서 중요하다. |
| `0ad14a57cab6` | fix(contact): 할당 실패에도 저장 상태 보존 | A | DEBUG, EXCEPTION, OWNERSHIP | contact를 분리된 candidate에 먼저 복사한 뒤 swap하고 ring을 전진하도록 수정한다. | 작지만 중요한 invariant restoration이다. allocation failure가 저장 값, cursor, size를 더 이상 서로 어긋나게 만들 수 없다. |
| `8930c4d17bc1` | test(contact): 연락처 교체 실패 회귀 검증 | A | TEST, EXCEPTION, EDGE | full-book replacement 중 allocation failure를 순회하며 logical order와 leak baseline을 검증한다. | 바로 앞에서 수정한 미묘한 ring-buffer transaction에 대한 중요한 regression evidence다. |
| `01271d795d58` | test(consumer): 저장소 밖 공개 library 연결 검증 | A | API, INTEGRATION, PORTABILITY | repository 밖에서 public header와 archive만으로 consumer를 빌드하고 실행한다. | in-tree test가 숨길 수 있는 private include, working-directory, packaging dependency를 찾아내는 중요한 external-boundary verification이다. |
| `9e07d3bc86d3` | test(boundary): 변환·배치 속성과 대용량 경계 검증 | A | TEST, DETERMINISM, EDGE | fixed-seed scalar/RPN property와 4,096-job batch stress check를 추가한다. | 재현 가능한 counterexample을 제공하는 폭넓고 대규모인 근거지만 core algorithm을 만드는 것이 아니라 검증하는 작업이다. |
| `45e9bbfd6b75` | build(check): sanitizer와 portable 검사 계층 구성 | A | ARCH, PORTABILITY, TEST | ASan/UBSan 계층을 추가하면서 build, portable, platform verification을 분리한다. | host prerequisite를 명확하게 하고 사용할 수 없는 platform tool이 portable check를 약화하지 않도록 하는 중요한 verification architecture다. |
| `ab441fa8737c` | test(portability): 지원 LP64 데이터 모델 검증 | B | PORTABILITY, API | compile-time LP64 data-model assertion을 추가한다. | 지원 ABI 가정을 명확히 선언하지만 기존 build profile 안에서 범위가 제한된 compatibility guard다. |
| `50565bd67e03` | ci: 지원 compiler와 platform matrix 검증 | B | PORTABILITY, TEST | sanitizer coverage를 포함한 GCC/Clang Linux 및 Clang macOS CI를 추가한다. | 이미 확립된 verification target을 자동화하는 일반적인 작업이며 적용 범위가 넓다는 이유만으로 architecture 중요도가 높아지지는 않는다. |
| `709124d5e2ed` | docs(project): 프로젝트 문서 정리 | C | - | 프로젝트, architecture, contract, verification 문서를 다시 작성하고 확장한다. | 구현 이후의 문서 전용 통합이다. 독자에게 유용하지만 새로운 실행 동작이나 불변식을 도입하지 않는다. |

# 개발 흐름

## 흐름: 직접 소유 자원이 실패 안전한 값 타입으로 발전
`aa3b5ba6c3c4` A — null이 될 수 없는 소유 `char[]` 표현과 예외를 던지지 않는 swap을 확립
↓
`0bc528c7d58e` S — 독립적인 깊은 복사와 copy-and-swap 대입을 추가
↓
`93faed0d67a2` A — 자기 자신과의 연산에도 안전한 allocate-before-commit 결합으로 소유 타입을 확장
↓
`47134f9e3b29` A — 관찰되는 모든 allocation failure를 주입하고 copy elision을 비활성화

**의의**

이 흐름은 단순히 메모리를 소유하는 상태에서 성공, aliasing, failure 상황 모두에서 regular value로 동작하는 상태로 발전한다. 이후 다형 pipeline 복사와 transactional replacement에 다시 등장하는 copy-and-swap 및 detached-allocation pattern을 확립한다.

## 흐름: 다형 clone이 regular owning aggregate로 발전
`835d87865762` S — abstract formatter 동작, virtual destruction, virtual copy를 정의
↓
`62ed45f8adf9` S — pipeline이 formatter lifetime을 빌리는 대신 clone을 소유하도록 구현
↓
`bf4d9bed705c` S — heterogeneous owner를 깊게 복사하고 partial construction을 정리
↓
`0427713637b8` A — abstractness, virtual destruction, clone ownership, header, CLI 동작을 검증
↓
`2c99290b9268` A — copy construction과 assignment 전반에 clone failure를 주입

**의의**

branch의 핵심 C++ object-model 발전 과정이다. runtime polymorphism만으로는 충분하지 않다. 각 dynamic object를 누가 생성하고 복사하고 소유하고 소멸하는지를 history에서 확립한 뒤, 불완전한 cloning이 leak하거나 기존 aggregate를 손상시키지 않는다는 점까지 증명한다.

## 흐름: Factory 조립에 transaction 경계 도입
`4c34654a4602` A — creator abstraction과 formatter specification grammar를 도입
↓
`fc0b8b7a40a0` A — creator가 소유권을 넘긴 raw pointer를 즉시 보호하고 target pipeline을 조립
↓
`907bfbd5c37c` S — clear-then-build mutation을 candidate-then-swap publication으로 교체
↓
`466d7abdb60f` B — 거부된 replacement 이후 상태 보존에 대한 regression 및 CLI 근거를 추가
↓
`af4e35ca7d92` A — 전체 ownership handoff에 걸쳐 creation, clone, allocation failure를 순회

**의의**

초기 builder는 자원 정리는 올바르게 수행하지만 일부만 재구성된 target을 외부에 노출할 수 있다. 수정 commit은 object-state atomicity가 leak freedom과 별개의 문제임을 명확히 하고, 전체 candidate가 성공한 뒤 한 번의 non-throwing swap으로 상태를 확정하도록 transaction 경계를 이동한다.

## 흐름: Scalar 텍스트와 target projection 분리
`6a3d0461faab` A — 명시적인 scalar-literal grammar와 intermediate semantic representation을 생성
↓
`a863f4899a93` A — locale 독립성, negative zero, overflow, nonzero-underflow 경계를 보존
↓
`fc7faa10dc66` A — 유효/무효 grammar와 numerical edge condition을 test로 고정
↓
`7cdcec341fb1` A — canonical float/double projection과 전체 report staged rendering을 추가
↓
`afea789fd753` A — 정확한 출력, stream 비간섭성, public header, CLI 실패 동작을 검증

**의의**

parsing과 rendering이 별도의 책임으로 발전한다. 느슨한 stream extraction이나 host locale이 source의 의미를 조용히 바꾸지 못하도록 하고, 네 projection이 일부만 format된 prefix가 아니라 하나의 결정적 report로 함께 반영되도록 한다.

## 흐름: 검사된 RPN 평가로 undefined arithmetic 방지
`57a25e8475ab` A — 완전한 signed decimal operand를 parse하고 stack-shape rule을 확립
↓
`e1641a714172` S — 네 signed operation 모두에 precondition check를 추가
↓
`aa0cc5e3e063` A — literal limit, 모든 overflow 방향, operand 순서, malformed expression을 검증

**의의**

핵심은 signed overflow를 실행한 뒤 감지하면 이미 늦는다는 점이다. evaluator는 arithmetic result를 반영하기 전에 limit와 unsigned magnitude를 기준으로 판단하며, `LONG_MIN`이 다른 값보다 magnitude가 한 단위 더 큰 경우까지 처리한다.

## 흐름: Generic container가 transactional batch engine으로 통합
`708c025ef2a0` S — configurable random-access batch abstraction과 container 간 range comparison을 정의
↓
`aaeff163baf8` A — iterator, algorithm, container substitution, throwing-value 동작을 검증
↓
`d0295f82614b` S — record parsing, duplicate detection, RPN evaluation, swap-on-success publication을 통합
↓
`42d411e42268` A — total result order와 classic-locale staged serialization을 추가
↓
`af57a8f9c5fe` A — vector/deque candidate를 독립적으로 정렬하고 불일치를 거부
↓
`9ba0e7c897ed` A — permutation invariance와 byte 단위 반복 출력 동일성을 검증
↓
`ea23237ad506` A — clean EOF 및 newline 없는 마지막 record와 input failure를 구분
↓
`b4ddd78fb9aa` A — seeded state를 보존하면서 syntax, arithmetic, stream, allocation failure를 순회

**의의**

최종 subsystem은 generic container, checked arithmetic, deterministic order, local candidate, delayed publication 등 앞서 확립한 대부분의 개념을 조합한다. 이후 commit은 성공적인 stream 종료의 정의를 다듬고, 협력하는 어떤 failure path도 partial batch를 외부에 노출하지 않음을 입증한다.

## 흐름: ContactBook 교체에도 동일한 강한 보장 적용
`2f9b934b0825` B — 처음에는 일반 `Contact` 대입으로 선택한 ring slot을 교체
↓
`0ad14a57cab6` A — detached replacement를 준비해 swap한 뒤 ring metadata를 전진
↓
`8930c4d17bc1` A — full capacity에서 allocation failure를 순회하며 order, value, leak baseline을 검증

**의의**

늦게 추가된 이 수정은 작은 고정 배열이라도 값 대입 과정에서 allocation이 발생할 수 있다면 강한 보장이 필요하다는 점을 보여 준다. slot content, `next_`, `size_`는 하나의 논리 transaction을 구성하며, 이 수정으로 초기 subsystem도 branch 후반에 확립된 candidate-and-swap 원칙과 일치한다.

## 흐름: In-tree test에서 지원 가능한 release claim으로 검증 확장
`6e78ced59357` A — unit, compile-contract, CLI integration 계층을 도입
↓
`4bbbfd191669` A — library 전체에 positive/negative public contract를 확장
↓
`01271d795d58` A — repository 외부에서 consumer를 compile하고 실행
↓
`9e07d3bc86d3` A — fixed-seed property와 large-batch stress를 추가
↓
`45e9bbfd6b75` A — build/portable/platform check를 분리하고 ASan과 UBSan을 구분
↓
`ab441fa8737c` B — 지원 LP64 ABI 가정을 실행 가능한 검증으로 명시
↓
`50565bd67e03` B — GCC, Clang, Linux, macOS 전반에서 확립된 claim을 실행

**의의**

branch는 source 수준 의도와 실제로 지원 가능한 release claim 사이의 간극을 단계적으로 줄인다. 각 계층은 interface shape, external packaging, state-space breadth, undefined behavior, host prerequisite, ABI assumption, compiler/platform variation처럼 서로 다른 blind spot을 다룬다.

# 가장 중요한 커밋

## feat(buffer): 깊은 복사와 정규 대입 구현
커밋: `0bc528c7d58e`
중요도: S
태그: OWNERSHIP, EXCEPTION, CORE

### 문제
`TextBuffer`는 동적으로 할당한 NUL-terminated 배열을 직접 소유한다. 초기의 non-copyable 형태는 double deletion을 피하지만 이후 transformation과 aggregate에서 일반적인 값처럼 사용할 수 없다. shallow copy를 사용하면 object lifetime이 서로 결합되고 소멸도 안전하지 않다.

### 결정
깊은 복사 생성자와 copy-and-swap assignment를 구현한다. target을 변경하기 전에 완전한 replacement를 할당하고, 기존의 예외를 던지지 않는 `swap()`을 상태 확정 연산으로 사용한다.

### 중요했던 이유
수동으로 소유한 C++98 자원에 regular value semantics를 완전하게 구현한 첫 사례다. C++11 move operation이나 smart pointer에 의존하지 않고 독립 ownership, 자기 대입 안전성, 강한 대입 보장을 확립한다.

### 변경 사항
복사 생성자를 공개하고 terminator를 포함해 `size + 1`바이트를 복제한다. assignment는 temporary copy를 생성하고 상태를 swap한 뒤 target reference를 반환하며, temporary가 이전 allocation을 해제하도록 한다.

### 프로젝트 이해에 중요한 이유
이후 formatter result, pipeline, factory candidate, batch value도 같은 원칙을 따른다. 먼저 독립적이고 완전한 값을 구성하고, 예외를 던지지 않는 교환으로 결과를 반영한다.

## feat(format): 다형적 formatter 인터페이스 정의
커밋: `835d87865762`
중요도: S
태그: ARCH, POLYMORPHISM, OWNERSHIP

### 문제
formatting 단계에는 서로 교체 가능한 여러 transformation이 필요하고, 이후 구체 타입을 모른 채 이를 저장해야 한다. base object를 통한 일반 복사는 derived state를 slicing하고, non-virtual base를 통한 삭제는 안전하지 않다.

### 결정
virtual destructor, virtual `clone()`, virtual `apply()`, 안정적인 이름을 제공하는 abstract `Formatter`를 정의한다. 구체 uppercase, prefix, suffix 구현은 각각 자체 virtual copy를 제공한다.

### 중요했던 이유
프로젝트의 polymorphic ownership protocol을 확립한다. 각 owner가 동적 동작, 복사, 소멸 방식을 따로 재구성하지 않고 하나의 interface에서 이를 명시한다.

### 변경 사항
새로운 공개 hierarchy와 구현을 추가한다. stateful formatter는 `TextBuffer` configuration을 소유하고, `clone()`은 dynamic type을 보존하는 독립 heap object를 반환한다.

### 프로젝트 이해에 중요한 이유
`FormatPipeline`, `FormatterCreator`, `PipelineBuilder`, copy-failure cleanup, compile-time abstractness test는 모두 이 계약에서 파생된다.

## feat(format): formatter 소유 pipeline 구현
커밋: `62ed45f8adf9`
중요도: S
태그: ARCH, POLYMORPHISM, OWNERSHIP

### 문제
pipeline은 호출자가 소유한 prototype이 scope를 벗어난 뒤에도 heterogeneous formatter step을 유지해야 한다. reference를 빌리면 pipeline 유효성이 외부 lifetime에 의존하고, base object를 값으로 저장하면 dynamic behavior가 slicing된다.

### 결정
`FormatPipeline`은 append된 각 formatter를 clone하고 생성된 pointer의 유일한 owner가 된다. 소유한 step을 순서대로 적용하고 소멸 시 삭제하며, 고정 용량을 강제하고 예외를 던지지 않는 전체 상태 swap을 제공한다.

### 중요했던 이유
virtual interface를 실제 lifecycle architecture로 전환한다. 빌린 formatter prototype과 소유한 dynamic step 사이의 경계를 정의한다.

### 변경 사항
고정 pointer 배열과 size가 pipeline representation이 된다. `append()`는 용량을 검사하고 size를 증가시키기 전에 clone하며, `apply()`는 복사한 입력을 step 순서대로 적용하고 destructor는 저장된 prefix만 정확히 해제한다.

### 프로젝트 이해에 중요한 이유
이후 deep-copy 및 factory 흐름은 단순한 formatting 문제가 아니다. 이 heterogeneous ownership graph를 안전하게 이전하고 복제하고 교체하는 문제다.

## feat(format): pipeline 깊은 복사 구현
커밋: `bf4d9bed705c`
중요도: S
태그: OWNERSHIP, EXCEPTION, POLYMORPHISM

### 문제
pointer를 소유하는 배열에는 compiler-generated copying을 사용할 수 없다. 여러 dynamic step을 clone하다가 이미 일부 prefix가 할당된 뒤 실패할 수 있으며, 생성이 완료되지 않은 object에는 destructor가 호출되지 않는다.

### 결정
copy constructor는 모든 slot을 초기화하고 `append()`를 통해 순서대로 clone한다. 실패가 발생하면 성공적으로 구성된 prefix를 삭제한 뒤 예외를 다시 던진다. assignment는 완전한 copy를 만든 다음 `swap()`한다.

### 중요했던 이유
branch에서 가장 까다로운 object-lifecycle 문제 중 하나를 해결한다. heterogeneous dynamic state를 깊게 복사하면서 leak freedom과 실패 시 target의 기존 값 보존을 모두 달성한다.

### 변경 사항
copy construction과 assignment를 공개한다. 명시적인 constructor cleanup이 partial object를 처리하고, copy-and-swap이 transactional assignment와 자기 대입 안전성을 제공한다.

### 프로젝트 이해에 중요한 이유
constructor failure에서는 destructor가 올바르게 구현된 것만으로 충분하지 않다는 점을 보여 주며, transactional factory replacement의 lifecycle 기반이 된다.

## fix(factory): 교체 실패에도 기존 파이프라인 보존
커밋: `907bfbd5c37c`
중요도: S
태그: DEBUG, EXCEPTION, CORE

### 문제
초기 builder는 temporary factory product를 올바르게 삭제하지만 target을 먼저 비우고 점진적으로 다시 구성했다. 따라서 이후 specification 처리에서 예외가 발생하면 memory safety는 유지되어도 기존 pipeline을 잃거나 partial replacement가 노출될 수 있다.

### 결정
모든 새 step을 local candidate 내부에 구성하고 creation과 cloning이 모두 성공한 뒤에만 candidate를 target과 swap한다.

### 중요했던 이유
resource cleanup과 committed state 보존이라는 두 보장을 분리한다. 각 allocation이 이전 mutation을 보상하도록 기대하지 않고, multi-step replacement operation 자체에 transaction boundary를 둔다.

### 변경 사항
`target.swap(empty)`과 `target`에 대한 직접 append를 제거하고 `candidate`에 append한 뒤 마지막에 한 번 `target.swap(candidate)`하도록 바꾼다.

### 프로젝트 이해에 중요한 이유
candidate-then-swap은 프로젝트의 failure 처리 원칙을 가장 명확하게 보여 주며, batch replacement와 이후 `ContactBook` 수정에서도 다시 사용된다.

## feat(template): 임의 접근 container batch 추상화 추가
커밋: `708c025ef2a0`
중요도: S
태그: ARCH, GENERIC, CORE

### 문제
최종 exercise는 같은 indexed, iterable, sortable behavior를 둘 이상의 container representation에 적용하고, algorithm 전체를 복제하지 않은 채 결과를 비교해야 한다.

### 결정
value type과 container type을 parameter로 받는 header-only template을 도입하고, container iterator type, checked access, insertion, sorting, copy-and-swap assignment, container 간 range equality를 제공한다.

### 중요했던 이유
이후 `std::vector`와 `std::deque`로 각각 instantiate되는 generic boundary를 확립한다. `std::sort`를 요구함으로써 random-access iteration을 문서에만 적힌 가정이 아니라 실제로 enforce되는 template requirement로 만든다.

### 변경 사항
`RandomAccessBatch<T, Container>`와 `equal_ranges()`를 public header에 전부 추가해 consumer translation unit에서 instantiate할 수 있게 한다.

### 프로젝트 이해에 중요한 이유
최종 batch engine의 two-container consistency check와 template/iterator 학습 목표가 이 abstraction에 의존한다.

## feat(rpn): overflow 검사 산술 연산 구현
커밋: `e1641a714172`
중요도: S
태그: NUMERIC, HARD, CORE

### 문제
C++ signed overflow는 undefined behavior이므로 evaluator가 먼저 결과를 계산한 뒤 범위를 벗어났는지 검사할 수 없다. multiplication과 division에는 `LONG_MIN`의 더 큰 magnitude 때문에 어려운 edge case도 존재한다.

### 결정
모든 operator는 signed operation을 실행하기 전에 precondition을 검사한다. addition/subtraction은 limit margin을 비교하고, multiplication은 sign과 unsigned magnitude를 기준으로 판단하며, division은 0과 `LONG_MIN / -1`을 거부한다.

### 중요했던 이유
수치 오류 처리가 그 자체로 undefined behavior가 되지 않도록 한다. branch에서 위험도가 가장 높은 algorithmic boundary를 해결하며 직접 RPN 사용과 모든 batch record의 기반이 된다.

### 변경 사항
checked operator helper, magnitude conversion, operator recognition, 오른쪽 값부터 왼쪽 값 순서의 stack pop, domain-specific overflow 및 invalid-expression exception을 추가한다.

### 프로젝트 이해에 중요한 이유
batch correctness가 이 evaluator에 의존한다. 구현은 연산 후 결과를 검사하는 대신 언어가 허용하는 operation domain을 기준으로 사전에 판단하는 구체적인 사례다.

## feat(batch): 입력 문법과 원자 교체 구현
커밋: `d0295f82614b`
중요도: S
태그: ARCH, EXCEPTION, INTEGRATION

### 문제
batch replacement는 stream consumption, record parsing, identifier validation, duplicate detection, RPN evaluation, allocation, result accumulation을 결합한다. 성공한 prefix를 매번 반영하면 engine state가 완전히 허용된 하나의 입력을 나타내지 않는 상태가 된다.

### 결정
모든 작업을 local candidate container와 local duplicate map에서 수행하고, 빈 입력이나 실패한 입력을 거부하며, 전체 stream이 성공한 뒤에만 완성된 result vector를 engine에 swap한다.

### 중요했던 이유
branch의 object model과 failure model이 최종적으로 통합되는 지점이다. 여러 독립적인 failure source를 하나의 commit point 뒤에 배치해 별도 rollback code 없이 engine에 강한 state guarantee를 제공한다.

### 변경 사항
`BatchEngine`, record grammar, duplicate tracking, RPN integration, candidate result, const result access, swap-on-success replacement를 도입한다.

### 프로젝트 이해에 중요한 이유
이후 ordering, dual-container check, stream-state correction, allocation-failure sweep은 architecture를 교체하지 않고 이 transaction을 확장하거나 검증한다.
