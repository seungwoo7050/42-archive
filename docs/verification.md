# 검증 지도와 증명 범위

현재 Make target과 테스트 소스를 기준으로 각 검사가 어떤 질문을 확인하는지
정리한다. 검사 하나의 성공을 다른 성질의 증명으로 확대하지 않는다.

## 검사 계층

| 명령 | 실제 범위 | 확인하지 않는 것 |
| --- | --- | --- |
| `make test-unit` | 공개 타입의 정상 상태·복사·오류 사례 | 모든 할당 위치와 모든 입력 |
| `make failure-test` | buffer/factory/batch/contact의 전역 `new` 실패와 pipeline의 전용 clone 실패 | 실제 allocator 고갈, 모든 파생 `clone()` 구현 |
| `make test-no-elide` | 복사 생략을 끈 동일 unit suite | 모든 compiler 최적화·ABI |
| `make test-contract` | 공개 헤더의 성공·실패 compile contract | 실행 의미와 진단 문구의 동일성 |
| `make test-integration` | 여섯 CLI, 공개 소비자와 archive 사용 | 설치·버전·공유 라이브러리 ABI |
| `make test-property` | 고정 seed의 scalar/RPN/batch 경계 | 전체 입력 공간, fuzzing, 최소 반례 |
| `make check-build` | 깨끗한 재빌드, 위 검사, CLI 결정성, LP64, 불필요한 rebuild | sanitizer·macOS archive 검사 |
| `make check-portable` | `check-build` 뒤 UBSan | ASan, comparator의 strict weak ordering 같은 논리 조건 |
| `make check-platform` | macOS archive·Mach-O·`leaks` | Linux 공통 경로 |
| `make test-asan` | Linux용 ASan 계측 unit suite | 미실행 경로와 모든 수명 오류 |
| `make check` | portable 뒤 macOS 전용 검사 | 모든 플랫폼에서 쓸 수 있는 단일 명령이 아님 |

## 정상·통합 검사

단위 검사는 값, 깊은 복사, 다형 clone, 예외 종류와 이전 상태 보존을 고정한다.
compile contract는 private 생성자, abstract base 직접 생성, mutable reference
노출과 잘못된 iterator 사용이 컴파일되지 않는지 본다. 실패 여부를 compiler
진단 문자열로 비교하지 않아 GCC와 Clang의 문구 차이를 계약에 넣지 않는다.

`tests/check_cli.sh`는 stdout, stderr와 종료 상태를 함께 비교한다. 이 검사는
선택한 fixture에서 관찰한 결과를 고정하며 iostream이 실제 disk-full이나
broken pipe를 만났을 때의 모든 부분 출력 경로를 재현하지 않는다.

`tests/check_external_consumer.sh`는 저장소 밖 임시 디렉터리에서 공개 include
경로와 `libcpp_foundation.a`만으로 소비자 코드를 만든다. 헤더가 우연히
`tests`나 내부 `src`를 찾는 문제를 막지만 설치 prefix, ABI 호환성과 이전
버전 binary 소비를 약속하지 않는다.

## 실패 주입이 묻는 질문

`FailingNew.cpp`를 연결하는 대상은 buffer, factory, batch와 contact 실패
바이너리다. 지정한 전역 `new` 호출 순번을 실패시켜 대상 객체가 이전 값을
유지하고 추적한 allocation 수가 기준으로 돌아오는지 본다.

pipeline 실패 바이너리는 `FailingNew.cpp`를 연결하지 않는다.
`TestFormatter::clone()`이 설정한 순번에서 새 객체를 할당하기 전에
`CloneFailure`를 던진다. `tests/failure/test_pipeline_failure.cpp`가 확인하는
범위는 다음 두 경로다.

- 복사 생성 중 이미 성공한 clone의 정리
- 복사 대입 실패에서 source와 target 유지

builder는 별도 근거를 사용한다. `tests/test_factory.cpp`는 caller-owned creator가
지정한 create·clone 실패와 반환 formatter의 live count를 확인한다.
`tests/failure/test_factory_failure.cpp`는 전역 `new` 실패 순번을 훑어 target
pipeline과 추적 allocation이 유지되는지 본다. creator 자체는 builder가
소유하거나 파괴하지 않는다.

반면 clone 내부 `new`의 모든 `std::bad_alloc`, null·borrowed pointer를 반환하는
잘못된 파생 구현과 사용자 destructor 예외는 대신하지 않는다. live allocation
개수가 같다는 사실도 잘못된 주소 접근 전체를 배제하지 않는다.

## 속성·큰 입력·시간 제한

property binary는 seed `324508639`를 사용한다. scalar 경계, RPN 식과 큰 batch를
독립 계산 결과와 비교하고 첫 불일치를 출력한다. 한 seed와 제한된 생성 문법이므로
전체 `long` 조합, 모든 scalar 문자열, 임의 comparator와 모든 stream 실패의
증명이 아니다.

`tests/run_with_timeout.sh 30`은 property 실행이 제한 안에 끝나지 않으면
TERM과 KILL을 거쳐 124를 반환한다. 따라서 30초는 deadlock이나 극단적 지연을
막는 liveness 상한이다. 세밀한 성능 회귀 기준이나 host 간 benchmark 숫자는
아니지만, 초과해도 합격이라는 뜻도 아니다.

## sanitizer와 플랫폼 증거

UBSan은 계측된 실행 경로의 일부 undefined behavior를 찾는다. comparator가
strict weak ordering인지, 출력이 의미적으로 올바른지, 모든 예외 위치에서
strong guarantee가 성립하는지는 검사하지 않는다.

ASan target은 별도 계측 binary를 만들며 CI의 Ubuntu GCC·Clang 작업에서
사용한다. macOS 작업은 UBSan까지만 사용한다. 특정 개발 호스트에서 관찰한
통과 횟수나 sanitizer runtime 문제는 현재 공개 계약이 아니라 해당 시점의
환경 기록으로만 해석해야 한다.

`tests/portability/test_data_model.cpp`는 CHAR_BIT와 핵심 타입 크기로 LP64
환경을 확인한다. 타입 표현의 모든 성질, endian, 32비트 ILP32와 다른 ABI를
검증하지 않는다.

## archive와 심볼

archive manifest는 아카이브 멤버와 **정의된 외부 linkage 심볼 집합**을
고정한다. 이 집합에는 공개 헤더의 의도된 API 외에도 내부 helper, protected
constructor, vtable과 typeinfo가 포함될 수 있다. 따라서 manifest를 “공개
API 목록”이라고 부르지 않는다.

공개 API는 `include/cppf`의 선언과 compile/consumer contract로 판단한다.
archive manifest는 예상하지 않은 link surface 변화와 산출물 구성을 찾는 별도
증거다.
