# Direct Ownership Becomes a Failure-safe Value

## Thread 목표

직접 할당한 C 문자열 저장소가 단순한 소유 객체에서 독립 복사, 자기 참조 안전성, 강한 예외 보장을 갖는 정규 값으로 발전하는 과정을 복원합니다.

**Source significance:** 단순한 memory ownership에서 시작해 success, aliasing, failure 모두에서 regular value로 동작하는 단계로 발전합니다. 여기서 확립된 copy-and-swap과 detached-allocation pattern은 이후 polymorphic pipeline copying과 transactional replacement에 재사용됩니다.

## 이 Thread를 이해하기 위한 핵심 질문

- `TextBuffer`의 최초 표현 불변식은 무엇이며 왜 내부 null 상태를 허용하지 않는가?
- deep copy가 없을 때 어떤 lifetime 결합과 이중 해제 위험이 생기는가?
- copy-and-swap에서 실제 상태 변경이 일어나는 commit point는 어디인가?
- `operator+=`가 기존 저장소를 해제하기 전에 새 값을 완성해야 하는 이유는 무엇인가?
- failure injection과 no-elide 빌드가 성공 경로 테스트에서 보이지 않는 어떤 위험을 드러내는가?

## 완료 기준

- [x] 각 단계에서 포인터, 크기, NUL 종료 문자의 관계를 실제 코드로 설명할 수 있다.
- [x] 복사 생성과 대입에서 source/target allocation이 독립적임을 해당 SHA 코드와 테스트로 증명할 수 있다.
- [x] 할당 실패 시 target 상태와 live-allocation baseline이 유지되는 경로를 추적할 수 있다.
- [x] copy elision이 없어도 반환값과 copy-and-swap이 안전한 이유를 실제 호출 흐름으로 설명할 수 있다.

## Source에 연결된 invariant / engineering difficulty

### Critical invariant

- 직접 소유한 resource는 정확히 한 번 해제되고, 복사는 pointer alias가 아닌 독립 ownership을 만든다.
- strong guarantee가 문서화된 연산은 allocation 실패 시 owning object의 observable state를 바꾸지 않는다.
- 완성되지 않은 candidate는 publish하지 않는다.
- `c_str()`로 얻은 borrowed pointer는 원본의 lifetime을 넘거나 ownership을 획득하지 않는다.

### Major engineering difficulty

- 수동 할당 C 문자열의 deep copy와 exception-safe assignment 구현.
- allocation failure sweep과 live-block accounting으로 strong guarantee를 검증.

위 항목은 source가 확정한 범위입니다. 실제 코드에서 어떻게 구현되는지는 아래 학습 기록에서 직접 확인합니다.

## Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `aa3b5ba6c3c4` | feat(buffer): 종료 문자를 포함한 문자열 저장소 소유 | A | OWNERSHIP, CORE | non-null owned `char[]` 표현과 non-throwing `swap()`을 확립합니다. |
| 2 | `0bc528c7d58e` | feat(buffer): 깊은 복사와 정규 대입 구현 | S | OWNERSHIP, EXCEPTION, CORE | 독립 deep copy와 copy-and-swap assignment를 추가합니다. |
| 3 | `93faed0d67a2` | feat(buffer): 결합·비교·출력 연산 제공 | A | OWNERSHIP, EXCEPTION, CORE | self-safe, allocate-before-commit composition으로 direct owner를 확장합니다. |
| 4 | `47134f9e3b29` | test(buffer): 할당 실패와 복사 생략 비활성화 검증 | A | TEST, EXCEPTION, OWNERSHIP | 관찰된 모든 allocation failure를 주입하고 copy elision을 비활성화해 검증합니다. |

## Commit별 학습 기록

### `aa3b5ba6c3c4` — feat(buffer): 종료 문자를 포함한 문자열 저장소 소유

- Importance: **A**
- Tags: **OWNERSHIP, CORE**
- Source 역할: non-null owned `char[]` 표현과 non-throwing `swap()`을 확립합니다.
- Source classification summary: Introduces an owning NUL-terminated `char` buffer with checked access and non-throwing swap.

#### 핵심 설계 / failure boundary 확인
- [x] 해당 SHA에서 `TextBuffer`의 data pointer와 size를 저장하는 상태 필드를 찾고, default/null-input construction이 동일한 empty representation을 만드는 초기화 순서를 기록하세요.
- [x] `size() + 1` allocation과 마지막 NUL byte를 만드는 constructor/destructor 경로를 함께 추적하세요.
- [x] const/mutable `at()`가 terminator 위치를 logical range에서 제외하는 branch와 `c_str()` 반환의 borrowed-lifetime 조건을 확인하세요.
- [x] `swap()`이 pointer와 size를 함께 교환하며 throw하지 않도록 구성된 실제 코드를 찾으세요.
- [x] 이 SHA에서 copy가 어떻게 금지되는지 public interface에서 확인하고, 왜 아직 regular value가 아닌지 기록하세요.
- [x] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [x] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `0bc528c7d58e`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼: `include/cppf/TextBuffer.hpp`의 `TextBuffer`, `data_`, `size_`; `src/TextBuffer.cpp`의 default/`const char *` constructor, destructor, `at()`, `c_str()`, `swap()`.
- 핵심 코드 발췌 위치: `aa3b5ba6c3c4:src/TextBuffer.cpp`에서 empty 값도 `new char[1]`로 만들고 `data_[0] = '\0'`을 기록합니다. 문자열 constructor는 `size_ + 1`을 할당해 terminator까지 복사하며, `swap()`은 `data_`와 `size_`를 함께 교환합니다.
- 변경 전/후 차이: 이 commit에서 직접 소유하는 문자열 값이 처음 생겼습니다. null 입력과 default construction은 모두 non-null empty representation으로 정규화되지만, copy constructor와 assignment는 private이므로 독립 값 복사는 아직 제공되지 않습니다.
- 직접 확인한 ownership/lifetime/state 관계: `TextBuffer` 한 객체가 `data_` 배열의 유일한 owner이고 destructor가 `delete[]` 합니다. `size_`는 terminator를 제외한 logical length이며 `data_[size_]`는 항상 NUL입니다. `c_str()`는 소유권을 넘기지 않는 borrowed pointer라 객체 파괴나 mutation 이후 사용할 수 없습니다.
- 직접 확인한 failure path: constructor allocation이 실패하면 객체 construction 자체가 끝나지 않아 owner가 생기지 않습니다. `at(index)`는 `index >= size_`에서 예외를 던져 terminator 접근을 거부하며 state를 변경하지 않습니다. 이 시점에는 copy failure 경로가 API 밖입니다.
- 실행한 테스트와 결과: 미실행. 저장소 checkout 네트워크가 차단되어 command는 수행하지 않았고, 지정 SHA의 구현·Make target·test source만 검사했습니다.
- 이 commit을 한 문장으로 설명: null 내부 상태 없이 NUL-terminated `char[]`를 단일 소유하는 최소 `TextBuffer` 표현을 확립했습니다.

### `0bc528c7d58e` — feat(buffer): 깊은 복사와 정규 대입 구현

- Importance: **S**
- Tags: **OWNERSHIP, EXCEPTION, CORE**
- Source 역할: 독립 deep copy와 copy-and-swap assignment를 추가합니다.
- Source classification summary: Adds deep copying and copy-and-swap assignment to `TextBuffer`.

#### 이 commit 직전 상태와 문제
- 직전 관련 Thread SHA `aa3b5ba6c3c4`를 먼저 checkout하여 이 commit이 추가되기 전 representation/ownership/state-publication 방식을 확인하세요.
- Source가 확정한 Problem/Decision을 실제 diff와 대응시키되, source에 없는 동기를 추가로 추정하지 마세요.

#### 해당 SHA에서 확인할 실제 코드
- [x] 직전 관련 SHA `aa3b5ba6c3c4`와 비교해 copy constructor/assignment 선언이 public contract에 어떻게 추가되는지 확인하세요.
- [x] copy constructor가 source와 별도 `size + 1` allocation을 만들고 terminator까지 복사하는 코드를 추적하세요.
- [x] assignment에서 temporary construction → non-throwing `swap()` → temporary destruction 순서를 실제 코드 라인으로 기록하세요.
- [x] allocation이 temporary construction 중 실패할 때 target state가 아직 변경되지 않았음을 제어 흐름으로 증명하세요.
- [x] alias를 통한 self-assignment가 별도 `this == &other` branch 없이도 안전한 이유를 객체 lifetime과 allocation 기준으로 설명하세요.

#### Ownership / lifecycle / state transition
- [x] 상태 필드별 owner, lifetime, valid state를 표로 직접 정리하세요.
- [x] throw 가능한 연산과 non-throwing commit operation의 순서를 실제 코드 라인 기준으로 적으세요.
- [x] 성공 전 temporary/candidate state와 성공 후 published state를 구분해 그리세요.

#### Failure scenario와 보장 경계
- [x] source가 지목한 failure를 하나 이상 실제 제어 흐름으로 따라가고, exception 직전/직후 observable state를 기록하세요.
- [x] 이 commit이 보장하는 것과 아직 보장하지 않는 것을 source와 해당 SHA 코드에 근거해 구분하세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `93faed0d67a2`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼: `include/cppf/TextBuffer.hpp`의 public copy constructor/assignment; `src/TextBuffer.cpp`의 `TextBuffer(const TextBuffer&)`, `operator=`, `swap()`.
- 핵심 코드 발췌 위치: `0bc528c7d58e:src/TextBuffer.cpp`의 copy constructor는 `new char[other.size_ + 1]` 후 `std::memcpy(..., size_ + 1)`를 수행합니다. assignment의 핵심은 `TextBuffer copy(other); swap(copy); return *this;`입니다.
- 변경 전/후 차이: 직전 SHA에서는 copy가 private이었습니다. 이후 source와 별도 저장소를 가진 deep copy가 public contract가 되었고 assignment가 target을 직접 덮지 않고 완성된 temporary와 교환합니다.
- 직접 확인한 ownership/lifetime/state 관계: copy construction 성공 후 source와 copy는 서로 다른 `char[]` owner입니다. assignment 전에는 target이 기존 배열을, temporary가 새 배열을 소유합니다. `swap()` 뒤 target이 새 배열을, temporary가 이전 target 배열을 소유하고 scope 종료 시 temporary destructor가 이전 배열을 해제합니다.
- 직접 확인한 failure path: temporary copy construction 중 `new[]`가 실패하면 `swap()`에 도달하지 않아 target의 pointer, size, bytes가 그대로입니다. self-assignment도 source가 곧 target이어도 먼저 독립 copy를 만들기 때문에 별도 alias branch 없이 안전합니다.
- 실행한 테스트와 결과: 미실행. 저장소 checkout 네트워크가 차단되어 command는 수행하지 않았고, 지정 SHA의 구현·Make target·test source만 검사했습니다.
- 이 commit을 한 문장으로 설명: deep copy와 copy-and-swap으로 `TextBuffer`를 독립 ownership과 강한 대입 보장을 가진 값으로 바꿨습니다.

### `93faed0d67a2` — feat(buffer): 결합·비교·출력 연산 제공

- Importance: **A**
- Tags: **OWNERSHIP, EXCEPTION, CORE**
- Source 역할: self-safe, allocate-before-commit composition으로 direct owner를 확장합니다.
- Source classification summary: Adds concatenation, comparison, and stream operations with overflow and allocate-before-commit handling.

#### 핵심 설계 / failure boundary 확인
- [x] 필요하면 직전 관련 SHA `0bc528c7d58e`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [x] `operator+=`에서 `size + other.size + 1` overflow를 실제 allocation 전에 검사하는 식과 branch를 확인하세요.
- [x] joined storage를 완성한 뒤 old storage를 release하는 정확한 순서를 추적하고, 실패 시 old value가 남는 지점을 표시하세요.
- [x] self-concatenation에서 `other`가 `*this`와 alias여도 source bytes가 release 전에 모두 사용되는지 코드 순서로 확인하세요.
- [x] non-member `operator+`가 copy + compound addition을 재사용하는 caller/callee 관계를 기록하세요.
- [x] 비교 및 stream insertion이 allocation representation을 노출하지 않고 value semantics만 제공하는지 public API를 확인하세요.
- [x] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [x] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `47134f9e3b29`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼: `include/cppf/TextBuffer.hpp`의 `operator+=`, 비교·stream 연산 선언; `src/TextBuffer.cpp`의 `operator+=`, non-member `operator+`, `operator==`, `operator<`, `operator<<`.
- 핵심 코드 발췌 위치: `93faed0d67a2:src/TextBuffer.cpp`의 `operator+=`는 `other.size_ > max - size_ - 1`을 먼저 검사하고, `joined` 배열에 기존 bytes와 `other`의 terminator까지 복사한 다음에만 old `data_`를 해제하고 새 pointer/size를 게시합니다.
- 변경 전/후 차이: 값 복사만 가능하던 상태에서 결합·비교·출력으로 확장되었습니다. 결합은 기존 저장소를 먼저 변경하는 대신 detached allocation을 완성한 뒤 commit합니다.
- 직접 확인한 ownership/lifetime/state 관계: 새 배열은 함수 내부 candidate owner이고 모든 복사가 끝날 때까지 기존 `data_`가 source로 살아 있습니다. commit 뒤 `TextBuffer`가 candidate를 소유합니다. 비교와 stream insertion은 내부 pointer ownership을 노출하지 않고 bytes의 값만 관찰합니다.
- 직접 확인한 failure path: 길이 합 overflow는 allocation 전에 거부됩니다. allocation 또는 복사 준비 단계의 예외에서는 old array가 해제되지 않습니다. `buffer += buffer`에서도 source bytes를 읽는 동안 old storage가 살아 있어 alias가 안전합니다. final destination stream failure의 rollback은 이 commit의 보장이 아닙니다.
- 실행한 테스트와 결과: 미실행. 저장소 checkout 네트워크가 차단되어 command는 수행하지 않았고, 지정 SHA의 구현·Make target·test source만 검사했습니다.
- 이 commit을 한 문장으로 설명: allocate-before-commit을 결합 연산까지 확장해 overflow, allocation failure, self-alias를 처리했습니다.

### `47134f9e3b29` — test(buffer): 할당 실패와 복사 생략 비활성화 검증

- Importance: **A**
- Tags: **TEST, EXCEPTION, OWNERSHIP**
- Source 역할: 관찰된 모든 allocation failure를 주입하고 copy elision을 비활성화해 검증합니다.
- Source classification summary: Adds deterministic allocation-failure injection and no-elide builds for buffer operations.

#### 핵심 설계 / failure boundary 확인
- [x] 필요하면 직전 관련 SHA `93faed0d67a2`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [x] test executable에서 global allocation 함수가 counted `malloc`-backed implementation으로 교체되는 지점을 찾으세요.
- [x] construction, copy construction, assignment, aliased self-assignment, `+`, `+=` 각각에서 관찰된 allocation site를 어떻게 순회해 failure를 주입하는지 기록하세요.
- [x] 각 실패 후 object state와 live-allocation baseline을 어떤 assertion으로 확인하는지 구분하세요.
- [x] copy elision을 비활성화한 별도 build target/flags와 실행 test가 무엇인지 확인하세요.
- [x] 이 테스트가 production code의 어떤 allocation/copy path를 통과하며, 일반 unit test가 놓치던 temporary lifetime을 무엇으로 드러내는지 적으세요.
- [x] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [x] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### Test commit 학습 구분
- 대상 production invariant: source가 확정한 방향은 **TextBuffer의 strong exception guarantee와 leak freedom**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 재현 failure / boundary: source가 확정한 방향은 **allocation 실패 및 copy-elision 부재**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- test technique: source가 확정한 방향은 **deterministic allocation-failure sweep + no-elide build**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 통과하는 production path: source가 확정한 방향은 **construction/copy/assignment/addition/compound-addition allocation paths**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하는 것: source가 확정한 방향은 **strong guarantee와 leak baseline이 관찰된 allocation sites에서 유지됨**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하지 않는 것: source가 확정한 방향은 **관찰되지 않은 실행 경로나 다른 allocator 환경까지 자동으로 증명하지는 않음**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 성격: source가 확정한 방향은 **deterministic regression / failure-injection**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.

#### 학습자 기록
- 확인한 파일/심볼: `tests/support/FailingNew.hpp`, `tests/support/FailingNew.cpp`; `tests/failure/test_buffer_failure.cpp`; `Makefile`의 `failure-test`, `test-no-elide` 계열 target.
- 핵심 코드 발췌 위치: `47134f9e3b29:tests/failure/test_buffer_failure.cpp`의 construction/copy/assignment/aliased assignment/`+`/`+=` failure sweep과, `FailingNew`의 allocation-attempt 및 live-block counter. `Makefile`은 `-fno-elide-constructors`를 적용한 별도 binary를 구성합니다.
- 변경 전/후 차이: production 동작은 바꾸지 않고, 정상 경로만 보던 검증에 관찰된 각 allocation attempt의 deterministic failure와 copy-elision 비활성화 실행 구성을 추가했습니다.
- 직접 확인한 ownership/lifetime/state 관계: failure controller가 정확한 allocation attempt를 실패시키고 test는 예외 후 source/target text와 live block baseline을 비교합니다. no-elide build는 반환 temporary와 복사/destruction이 실제로 발생해도 owner가 중복 해제되지 않는지 노출합니다.
- 직접 확인한 failure path: 각 연산을 한 번 성공시켜 allocation 횟수를 관찰한 뒤 1부터 그 횟수까지 실패 지점을 이동합니다. assignment와 `+=`는 기존 target 값 유지, constructor/`+`는 partial object leak 없음, 모든 case는 live block baseline 복구를 검사하도록 작성되어 있습니다. 관찰하지 않은 allocator 동작이나 실행 경로까지 증명하지는 않습니다.
- 실행한 테스트와 결과: 미실행. 저장소 checkout 네트워크가 차단되어 command는 수행하지 않았고, 지정 SHA의 구현·Make target·test source만 검사했습니다. 실행 대상으로 확인한 command는 `make failure-test`와 no-elide test target입니다.
- 이 commit을 한 문장으로 설명: deterministic allocation failure와 no-elide 구성을 통해 `TextBuffer`의 강한 보장과 단일 해제를 회귀 계약으로 만들었습니다.

## Invariant ledger

| SHA | Source에서 확정된 invariant 변화 | 해당 SHA에서 직접 확인한 코드 근거 | 아직 남은 위험/미보장 |
| --- | --- | --- | --- | --- |
| `aa3b5ba6c3c4` | non-null `char[]` ownership과 NUL 종료 표현, non-throwing `swap()` 도입 | `TextBuffer`가 `char *data_`와 `size_`를 갖고 모든 constructor가 non-null NUL-terminated 배열을 만들며 destructor가 `delete[]` 합니다. | 복사가 private이므로 독립 value copy와 copy failure 보장은 아직 없습니다. |
| `0bc528c7d58e` | 독립 deep copy와 copy-and-swap 대입으로 regular value/strong assignment guarantee 확립 | copy constructor가 별도 `size + 1` 배열을 만들고 assignment가 temporary construction 뒤 `swap()`으로만 게시합니다. | 결합 같은 후속 mutation 연산의 overflow와 failure 보장은 아직 다루지 않습니다. |
| `93faed0d67a2` | allocate-before-commit 결합과 self-concatenation 안전성으로 패턴 확장 | `operator+=`가 길이 overflow를 먼저 검사하고 detached joined 배열을 완성한 후 old storage를 교체합니다. | destination stream의 최종 write 실패 rollback과 관찰하지 않은 allocator 특성은 범위 밖입니다. |
| `47134f9e3b29` | 모든 관찰 allocation failure와 no-elide 조건에서 보장 검증 | `FailingNew`와 failure sweep이 각 관찰 allocation site 뒤 state/live-block baseline을 검사하고 no-elide binary를 별도로 만듭니다. | 실행 환경 전체나 관찰되지 않은 path에 대한 형식 증명은 아닙니다. |

## Failure → Fix → Test 연결

- `0bc528c7d58e`: deep copy + copy-and-swap으로 assignment failure 시 target 보존을 설계합니다.
- `93faed0d67a2`: allocate-before-commit으로 composition까지 동일한 failure discipline을 확장합니다.
- `47134f9e3b29`: allocation failure sweep과 no-elide build로 이 보장을 검증합니다.

### 학습자 연결 기록
- 최초 위험/맹점: 직접 소유 pointer를 shallow copy하거나, target 저장소를 먼저 해제한 뒤 새 값을 만들면 alias·double free·failure 중 state loss가 발생합니다.
- 이를 드러낸 실제 failure 또는 test gap: 최초 구현은 copy를 금지해 위험을 피했지만 regular value가 아니었고, 정상 unit test만으로는 allocation 중간 실패와 반환 temporary lifetime을 확인할 수 없었습니다.
- 수정/강화된 decision: copy constructor는 별도 allocation을 만들고, assignment와 composition은 throw 가능한 준비를 detached object/storage에서 끝낸 뒤 non-throwing publication을 수행합니다.
- 해당 코드 위치: `0bc528c7d58e:src/TextBuffer.cpp`의 copy constructor와 `operator=`, `93faed0d67a2:src/TextBuffer.cpp`의 `operator+=`.
- 이를 고정하는 regression/evidence: `47134f9e3b29:tests/failure/test_buffer_failure.cpp`, `tests/support/FailingNew.cpp`, `Makefile`의 no-elide 구성.

## Ownership / state / responsibility 변화

- Source에서 확인되는 핵심 transition을 아래에 실제 코드 근거로 완성하세요.
- 시작 상태: non-null `char[]` ownership과 NUL 종료 표현, non-throwing `swap()` 도입
- Thread 종료 상태: 모든 관찰 allocation failure와 no-elide 조건에서 보장 검증
- [x] 중간 commit마다 owner/state publisher/cleanup 책임이 어디로 이동하거나 강화되는지 적으세요.
- [x] borrowed와 owned state가 함께 등장하면 각각의 lifetime 종료 지점을 표시하세요.

### 코드 검사로 복원한 변화

1. `aa3b5ba6c3c4`: 객체가 non-null `char[]`의 owner가 되고 `c_str()`만 borrowed view를 제공합니다.
2. `0bc528c7d58e`: 복사 owner를 source와 분리하고, assignment의 state publisher를 non-throwing `swap()` 하나로 제한합니다.
3. `93faed0d67a2`: 동일한 detached preparation을 결합에 적용합니다. old storage는 candidate 완성 전까지 source이자 rollback state로 남습니다.
4. `47134f9e3b29`: failure controller가 candidate 생성의 각 allocation을 끊어도 기존 owner와 live-block 수가 보존되는지 검사합니다.

## Thread 최종 상태

- Source가 확정한 최종 흐름: `construction → owned representation → deep copy / assignment → composition → injected-failure verification`
- [x] 마지막 Thread SHA 시점에서 실제 type/function 호출 관계를 사용해 위 흐름을 다시 그리세요.
- [x] Thread 시작 시점과 비교해 새로 보장되는 invariant를 정리하세요.
- [x] source가 보장하지 않는 영역이나 외부 side effect/stream position 등 남는 경계를 실제 코드 근거로 적으세요.

### 완성된 Thread 해석

마지막 Thread SHA 기준 호출 흐름은 constructor/copy가 독립 배열을 만든 뒤, assignment는 `TextBuffer copy(other)`를 완성하고 `swap(copy)`로 게시하며, `operator+`는 value copy 후 `operator+=`를 재사용하는 형태입니다. `operator+=`는 overflow 검사와 detached allocation을 모두 통과한 뒤에만 pointer와 size를 바꿉니다.

시작 시점과 비교하면 copy 금지 owner가 deep-copy 가능한 regular value가 되었고, assignment와 composition 모두 allocation failure에서 기존 observable value를 보존합니다. 남는 경계는 `c_str()` borrowed pointer의 invalidation, destination stream 자체의 write failure, 테스트가 관찰하지 못한 allocator/환경입니다.

## 최종 architecture 또는 execution flow 정리

다음 항목은 학습자가 실제 commit code를 읽은 뒤 완성합니다. 완성형 정답을 source 밖에서 추정해 채우지 않습니다.

```text
[입력/호출자]
    ↓
[검증/생성/후보 상태]
    ↓
[핵심 ownership/state transition]
    ↓
[commit/publication point]
    ↓
[output / observable state]

실패 분기:
[throw/failure source] → [cleanup owner] → [보존되는 prior state]
```

- 실제 caller → callee 흐름: constructor 또는 caller 연산 → `TextBuffer` copy constructor / `operator+=` → allocation·byte copy → `swap()` 또는 pointer publication → 비교·`c_str()`·stream을 통한 관찰.
- 핵심 상태 필드: `char *data_`, `std::size_t size_`, 그리고 invariant `data_ != 0`, `data_[size_] == '\0'`.
- resource owner / borrowed view: 각 `TextBuffer`가 자신의 `data_`를 단독 소유하고 `c_str()` 결과만 객체 lifetime에 종속된 borrowed view입니다.
- commit point: assignment는 `swap(copy)`, `operator+=`는 joined bytes 완성 후 old array 해제와 새 `data_`/`size_` 대입입니다.
- cleanup path: 실패 전 candidate constructor가 소유권을 얻지 못하거나 local temporary가 자신이 소유한 배열을 파괴합니다. target의 old array는 commit 전까지 유지됩니다.
- 최종 invariant 설명: 성공·self-alias·관찰된 allocation failure·copy-elision 부재에서 각 배열은 정확히 한 owner에게 속하고, strong-guarantee 연산은 완성된 값만 publish합니다.

### 실행 검증 범위

이 문서의 구현·테스트 설명은 지정 SHA의 diff와 당시 파일을 GitHub 저장소에서 직접 검사해 복원했습니다. 현재 컨테이너에서는 GitHub checkout에 필요한 네트워크 연결이 차단되어 build/test command를 실행하지 못했습니다. 따라서 아래 체크 표시는 코드·테스트 구현을 확인했다는 의미이며, 실행 결과를 의미하지 않습니다.

## 학습 완료 자가 점검

- [x] Commit map의 SHA/순서를 그대로 따라 모든 관련 code tree를 확인했습니다.
- [x] final HEAD를 과거 commit 설명에 소급해서 사용하지 않았습니다.
- [x] S/A/B importance에 맞는 깊이로 code/test evidence를 채웠습니다.
- [x] source가 확정한 invariant와 제가 실제 코드에서 확인한 증거를 구분했습니다.
- [x] failure path에서 state mutation 전후와 cleanup owner를 설명할 수 있습니다.
- [x] test commit마다 production invariant, technique, production path, 증명/비증명 범위를 구분했습니다.
- [x] Thread 마지막 상태를 commit history에 근거해 처음부터 끝까지 설명할 수 있습니다.
