# Polymorphic Cloning Becomes a Regular Owning Aggregate

## Thread 목표

가상 인터페이스 자체보다 더 어려운 문제인 동적 객체의 생성·복제·소유·파괴를 추적하고, 여러 clone을 소유하는 aggregate가 실패 중에도 누수 없이 정규 값으로 동작하는 과정을 복원합니다.

**Source significance:** 이 branch의 중심 C++ object-model progression입니다. runtime polymorphism만으로는 부족하며, 각 dynamic object의 create/copy/own/destroy 책임을 정하고 incomplete cloning이 leak이나 기존 aggregate corruption을 만들지 않음을 검증합니다.

## 이 Thread를 이해하기 위한 핵심 질문

- base object 복사 대신 `clone()`이 필요한 이유는 무엇인가?
- virtual destructor가 ownership protocol의 일부인 이유는 무엇인가?
- `FormatPipeline::append()`는 borrowed prototype을 어느 시점에 owned clone으로 바꾸는가?
- copy constructor 도중 clone이 실패하면 왜 pipeline destructor만으로 정리가 불가능한가?
- copy construction과 assignment 실패가 서로 다른 cleanup mechanism을 요구하는 지점은 어디인가?

## 완료 기준

- [x] prototype, clone, pipeline slot 각각의 owner와 lifetime을 commit별로 그릴 수 있다.
- [x] pipeline copy constructor의 partial-construction cleanup과 assignment의 copy-and-swap을 구분해 설명할 수 있다.
- [x] abstractness, virtual destruction, clone ownership이 각각 어떤 test/compile contract로 고정되는지 찾을 수 있다.
- [x] clone failure sweep에서 source와 destination이 각각 어떤 상태로 남는지 실제 테스트를 근거로 설명할 수 있다.

## Source에 연결된 invariant / engineering difficulty

### Critical invariant

- polymorphically owned resource는 정확히 한 번 해제되고, copying은 dynamic object의 독립 ownership을 만든다.
- 완성되지 않은 partial pipeline은 temporary/partial owner 내부에만 존재하며 publish되지 않는다.
- strong guarantee가 적용되는 assignment는 clone 실패 시 destination observable state를 보존한다.

### Major engineering difficulty

- `clone()`이 raw pointer를 반환하는 heterogeneous polymorphic object의 ownership과 copying.
- constructor가 완료되지 않아 destructor가 호출되지 않는 상황에서 partial clones 정리.
- clone failure sweep과 live-object accounting.

위 항목은 source가 확정한 범위입니다. 실제 코드에서 어떻게 구현되는지는 아래 학습 기록에서 직접 확인합니다.

## Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `835d87865762` | feat(format): 다형적 formatter 인터페이스 정의 | S | ARCH, POLYMORPHISM, OWNERSHIP | abstract formatter behavior, virtual destruction, virtual copying을 정의합니다. |
| 2 | `62ed45f8adf9` | feat(format): formatter 소유 pipeline 구현 | S | ARCH, POLYMORPHISM, OWNERSHIP | pipeline이 formatter lifetime을 빌리지 않고 clone을 직접 소유하게 합니다. |
| 3 | `bf4d9bed705c` | feat(format): pipeline 깊은 복사 구현 | S | OWNERSHIP, EXCEPTION, POLYMORPHISM | heterogeneous owner를 deep-copy하고 partial construction을 정리합니다. |
| 4 | `0427713637b8` | test(format): 가상 소멸·추상 계약·CLI 검증 | A | API, TEST, POLYMORPHISM | abstractness, virtual destruction, clone ownership, headers, CLI를 검증합니다. |
| 5 | `2c99290b9268` | test(format): 복제 실패 뒤 부분 객체 정리 검증 | A | TEST, EXCEPTION, POLYMORPHISM | copy construction/assignment의 clone failure를 전 위치에서 sweep합니다. |

## Commit별 학습 기록

### `835d87865762` — feat(format): 다형적 formatter 인터페이스 정의

- Importance: **S**
- Tags: **ARCH, POLYMORPHISM, OWNERSHIP**
- Source 역할: abstract formatter behavior, virtual destruction, virtual copying을 정의합니다.
- Source classification summary: Defines the abstract formatter interface, virtual destruction, cloning, and concrete transformations.

#### 이 commit 직전 상태와 문제
- 이 Thread의 첫 commit이므로, `git show <sha>^`가 가능한 경우 parent에서 관련 type/기능이 없거나 다른 형태였는지 확인하세요.
- Source가 확정한 Problem/Decision을 실제 diff와 대응시키되, source에 없는 동기를 추가로 추정하지 마세요.

#### 해당 SHA에서 확인할 실제 코드
- [x] `Formatter` 선언에서 abstractness를 만드는 pure virtual functions, virtual destructor, `clone()`, `apply()`, name contract를 확인하세요.
- [x] 각 concrete formatter가 `clone()`에서 dynamic type을 보존한 독립 heap object를 만드는 실제 코드를 찾으세요.
- [x] prefix/suffix formatter가 자신의 `TextBuffer` configuration을 소유하는 상태와 copy semantics를 확인하세요.
- [x] uppercase 구현에서 `std::toupper` 호출 전에 plain `char`를 `unsigned char`로 변환하는 경로를 확인하세요.
- [x] caller가 derived type을 몰라도 `Formatter&`/pointer를 통해 동작·복제·삭제할 수 있는 call graph를 그리세요.

#### Ownership / lifecycle / state transition
- [x] 상태 필드별 owner, lifetime, valid state를 표로 직접 정리하세요.
- [x] throw 가능한 연산과 non-throwing commit operation의 순서를 실제 코드 라인 기준으로 적으세요.
- [x] 성공 전 temporary/candidate state와 성공 후 published state를 구분해 그리세요.

#### Failure scenario와 보장 경계
- [x] source가 지목한 failure를 하나 이상 실제 제어 흐름으로 따라가고, exception 직전/직후 observable state를 기록하세요.
- [x] 이 commit이 보장하는 것과 아직 보장하지 않는 것을 source와 해당 SHA 코드에 근거해 구분하세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `62ed45f8adf9`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼: `include/cppf/Formatter.hpp`의 `Formatter`, `UppercaseFormatter`, `PrefixFormatter`, `SuffixFormatter`; `src/Formatter.cpp`의 destructor, `clone()`, `apply()`, `name()` 구현.
- 핵심 코드 발췌 위치: `835d87865762:include/cppf/Formatter.hpp`에서 `Formatter`는 virtual destructor와 pure virtual `clone()`, `apply()`, `name()`을 선언합니다. `src/Formatter.cpp`의 각 `clone()`은 `new <구체 타입>(*this)`를 반환하며 uppercase 변환은 `std::toupper(static_cast<unsigned char>(...))`를 사용합니다.
- 변경 전/후 차이: parent에는 formatter 계층이 없었습니다. 이 commit에서 호출자가 구체 타입을 몰라도 base reference/pointer로 변환·복제·삭제할 수 있는 object-model contract가 생겼습니다.
- 직접 확인한 ownership/lifetime/state 관계: `PrefixFormatter::prefix_`와 `SuffixFormatter::suffix_`는 각 formatter가 소유하는 `TextBuffer`입니다. `clone()` 성공 시 반환 pointer의 ownership은 호출자에게 이전되고, virtual destructor는 base pointer 삭제가 실제 dynamic destructor까지 도달하게 합니다.
- 직접 확인한 failure path: `new` 또는 `TextBuffer` 복사가 실패하면 `clone()`은 pointer를 반환하지 않습니다. 이 SHA에는 여러 clone을 모아 관리하는 aggregate나 local guard가 아직 없으므로, 성공한 raw pointer를 누가 즉시 소유하는지는 caller protocol에 남아 있습니다.
- 실행한 테스트와 결과: 미실행. 지정 SHA의 header와 implementation을 검사했으며 build/test command는 수행하지 않았습니다.
- 이 commit을 한 문장으로 설명: virtual destruction과 virtual copying을 포함한 formatter 소유권 protocol을 정의했습니다.

### `62ed45f8adf9` — feat(format): formatter 소유 pipeline 구현

- Importance: **S**
- Tags: **ARCH, POLYMORPHISM, OWNERSHIP**
- Source 역할: pipeline이 formatter lifetime을 빌리지 않고 clone을 직접 소유하게 합니다.
- Source classification summary: Introduces a bounded pipeline that owns formatter clones and applies them in order.

#### 이 commit 직전 상태와 문제
- 직전 관련 Thread SHA `835d87865762`를 먼저 checkout하여 이 commit이 추가되기 전 representation/ownership/state-publication 방식을 확인하세요.
- Source가 확정한 Problem/Decision을 실제 diff와 대응시키되, source에 없는 동기를 추가로 추정하지 마세요.

#### 해당 SHA에서 확인할 실제 코드
- [x] `FormatPipeline`의 fixed pointer array, size, capacity 표현을 찾아 null/valid prefix 상태를 기록하세요.
- [x] `append()`에서 capacity check → `clone()` → slot store → size increment의 순서를 실제 코드로 확인하세요.
- [x] 입력 formatter reference는 borrowed이고 clone은 pipeline-owned가 되는 ownership 전환 시점을 표시하세요.
- [x] destructor가 성공적으로 저장된 clone만 정확히 한 번 `delete`하는 범위를 확인하세요.
- [x] `apply()`가 input copy를 만들고 insertion order대로 step을 fold하는 경로와 empty-pipeline identity를 확인하세요.
- [x] 이 SHA에서 pipeline copy가 여전히 금지되어 있는 public/private declaration을 확인하세요.

#### Ownership / lifecycle / state transition
- [x] 상태 필드별 owner, lifetime, valid state를 표로 직접 정리하세요.
- [x] throw 가능한 연산과 non-throwing commit operation의 순서를 실제 코드 라인 기준으로 적으세요.
- [x] 성공 전 temporary/candidate state와 성공 후 published state를 구분해 그리세요.

#### Failure scenario와 보장 경계
- [x] source가 지목한 failure를 하나 이상 실제 제어 흐름으로 따라가고, exception 직전/직후 observable state를 기록하세요.
- [x] 이 commit이 보장하는 것과 아직 보장하지 않는 것을 source와 해당 SHA 코드에 근거해 구분하세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `bf4d9bed705c`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼: `include/cppf/FormatPipeline.hpp`의 `max_steps`, `steps_`, `size_`; `src/FormatPipeline.cpp`의 constructor, destructor, `append()`, `apply()`, `swap()`.
- 핵심 코드 발췌 위치: `62ed45f8adf9:src/FormatPipeline.cpp`의 `append()`는 capacity를 먼저 검사하고 `formatter.clone()`을 호출한 뒤 `steps_[size_]`에 저장하고 마지막에 `++size_` 합니다. destructor는 `[0, size_)`의 pointer만 `delete`합니다.
- 변경 전/후 차이: formatter 객체 단위의 clone contract에서, 최대 8개 clone을 insertion order로 직접 소유하고 실행하는 aggregate가 추가되었습니다. copy constructor와 assignment는 여전히 private입니다.
- 직접 확인한 ownership/lifetime/state 관계: `append()` 인자의 `Formatter&`는 호출자 소유의 borrowed prototype입니다. `clone()`이 반환된 순간 local `copy`가 미게시 owner가 되고, slot 저장과 size 증가가 끝나면 pipeline이 clone의 유일한 owner가 됩니다. 유효 상태는 `steps_[0..size_)`가 소유 pointer이고 나머지는 null인 prefix입니다.
- 직접 확인한 failure path: capacity 초과는 clone 전에 거부됩니다. `clone()` 실패 시 slot과 `size_`가 변경되지 않습니다. 성공 뒤에는 destructor가 active prefix를 삭제합니다. 다만 pipeline 자체의 독립 deep copy와 복사 도중 부분 clone 정리는 아직 제공되지 않습니다.
- 실행한 테스트와 결과: 미실행. 지정 SHA의 header와 implementation을 검사했으며 build/test command는 수행하지 않았습니다.
- 이 commit을 한 문장으로 설명: borrowed formatter를 owned clone으로 바꾸어 순서대로 실행하는 bounded pipeline을 만들었습니다.

### `bf4d9bed705c` — feat(format): pipeline 깊은 복사 구현

- Importance: **S**
- Tags: **OWNERSHIP, EXCEPTION, POLYMORPHISM**
- Source 역할: heterogeneous owner를 deep-copy하고 partial construction을 정리합니다.
- Source classification summary: Implements deep pipeline copying, partial-construction cleanup, and copy-and-swap assignment.

#### 이 commit 직전 상태와 문제
- 직전 관련 Thread SHA `62ed45f8adf9`를 먼저 checkout하여 이 commit이 추가되기 전 representation/ownership/state-publication 방식을 확인하세요.
- Source가 확정한 Problem/Decision을 실제 diff와 대응시키되, source에 없는 동기를 추가로 추정하지 마세요.

#### 해당 SHA에서 확인할 실제 코드
- [x] 직전 관련 SHA `62ed45f8adf9`와 비교해 copy constructor와 assignment가 어떻게 열리는지 확인하세요.
- [x] copy constructor 시작 시 pointer array 전체를 null-initialize하는 순서를 찾고, clone 성공 prefix의 representation을 기록하세요.
- [x] 중간 `clone()` 실패 시 catch block이 이미 생성된 prefix를 직접 delete하고 rethrow하는 코드를 추적하세요.
- [x] constructor가 완료되지 않으면 destructor가 호출되지 않는다는 사실이 왜 이 explicit cleanup을 필요로 하는지 실제 경로에 연결하세요.
- [x] assignment의 complete-copy → swap → old-state destruction 흐름과 destination preservation을 확인하세요.
- [x] dynamic formatter type과 insertion order가 copy 후 유지되는지 clone/apply 경로로 확인하세요.

#### Ownership / lifecycle / state transition
- [x] 상태 필드별 owner, lifetime, valid state를 표로 직접 정리하세요.
- [x] throw 가능한 연산과 non-throwing commit operation의 순서를 실제 코드 라인 기준으로 적으세요.
- [x] 성공 전 temporary/candidate state와 성공 후 published state를 구분해 그리세요.

#### Failure scenario와 보장 경계
- [x] source가 지목한 failure를 하나 이상 실제 제어 흐름으로 따라가고, exception 직전/직후 observable state를 기록하세요.
- [x] 이 commit이 보장하는 것과 아직 보장하지 않는 것을 source와 해당 SHA 코드에 근거해 구분하세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `0427713637b8`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼: `include/cppf/FormatPipeline.hpp`의 public copy constructor/assignment; `src/FormatPipeline.cpp`의 copy constructor, catch cleanup, `operator=`, `swap()`.
- 핵심 코드 발췌 위치: `bf4d9bed705c:src/FormatPipeline.cpp`에서 copy constructor는 모든 `steps_`를 null로 초기화한 뒤 `append(*other.steps_[index])`를 반복합니다. catch block은 현재 `size_`만큼 직접 `delete`하고 rethrow하며, assignment는 `FormatPipeline copy(other); swap(copy);`입니다.
- 변경 전/후 차이: 직전 SHA에서 복사가 금지됐지만, 이후 dynamic type과 insertion order를 유지하는 heterogeneous deep copy가 public contract가 되었습니다. 실패한 constructor와 실패한 assignment가 서로 다른 cleanup 경로를 사용합니다.
- 직접 확인한 ownership/lifetime/state 관계: copy constructor의 성공 prefix는 아직 완성되지 않은 `this`가 임시로 소유합니다. construction 성공 뒤 새 pipeline이 모든 clone을 소유합니다. assignment에서는 완성된 local `copy`가 candidate이고 `swap()` 뒤 old destination clone들은 local object로 이동해 scope 종료 때 삭제됩니다.
- 직접 확인한 failure path: copy constructor 중 clone 실패 시 객체 destructor가 호출되지 않으므로 catch가 이미 만든 prefix를 직접 삭제해야 합니다. assignment 중 같은 실패는 local `copy` construction에서 끝나 `swap()`에 도달하지 않으므로 destination의 size, step sequence, behavior가 보존됩니다.
- 실행한 테스트와 결과: 미실행. 지정 SHA의 implementation과 후속 테스트가 겨냥하는 경로를 코드로 검사했으며 command는 수행하지 않았습니다.
- 이 commit을 한 문장으로 설명: explicit partial-construction cleanup과 copy-and-swap으로 polymorphic aggregate를 failure-safe regular value로 만들었습니다.

### `0427713637b8` — test(format): 가상 소멸·추상 계약·CLI 검증

- Importance: **A**
- Tags: **API, TEST, POLYMORPHISM**
- Source 역할: abstractness, virtual destruction, clone ownership, headers, CLI를 검증합니다.
- Source classification summary: Adds abstractness, virtual-destruction, public-header, ownership-counter, and CLI checks.

#### 핵심 설계 / failure boundary 확인
- [x] 필요하면 직전 관련 SHA `bf4d9bed705c`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [x] counted test formatter의 live/destroyed counters가 clone ownership과 base-pointer deletion을 어떻게 관찰하는지 확인하세요.
- [x] abstract `Formatter`를 직접 instantiate하려는 compile-fail case와 기대 실패 조건을 찾으세요.
- [x] public header repeated inclusion/consumer-visible use를 검사하는 positive compile case를 확인하세요.
- [x] pipeline CLI integration fixture가 실제 binary에서 virtual dispatch, archive linkage, step order를 어떤 transcript로 검증하는지 기록하세요.
- [x] 이 test bundle이 output correctness와 별개로 non-virtual destruction/accidental concreteness/ownership leak를 각각 어떻게 겨냥하는지 분리하세요.
- [x] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [x] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### Test commit 학습 구분
- 대상 production invariant: source가 확정한 방향은 **polymorphic abstractness, virtual destruction, clone ownership, public consumption**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 재현 failure / boundary: source가 확정한 방향은 **accidentally concrete base, non-virtual delete, hidden ownership leak, process integration drift**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- test technique: source가 확정한 방향은 **compile-fail + live-object counter + public-header compile + CLI fixture**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 통과하는 production path: source가 확정한 방향은 **Formatter clone/delete and pipeline execution paths**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하는 것: source가 확정한 방향은 **object-model contract가 runtime output 외에도 유지됨**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하지 않는 것: source가 확정한 방향은 **모든 clone failure position까지는 이 commit 하나로 증명하지 않음**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 성격: source가 확정한 방향은 **broad contract + integration**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `2c99290b9268`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼: `tests/test_formatter.cpp`, `tests/test_format_pipeline.cpp`, `tests/compile/formatter_abstract_fail.cpp`, `tests/compile/format_headers.cpp`, `tests/check_cli.sh`, `Makefile`의 contract/integration targets.
- 핵심 코드 발췌 위치: `0427713637b8`의 counted formatter tests는 clone·live·destroyed counters를 관찰하고 base pointer delete를 실행합니다. compile-fail translation unit은 `Formatter` 직접 생성을 시도하며, positive translation unit은 public headers를 반복 include합니다. CLI script는 실제 formatter pipeline binary의 transcript를 fixture와 비교합니다.
- 변경 전/후 차이: production object model은 유지하고, runtime output만으로 드러나지 않던 abstractness, virtual destruction, clone ownership, header isolation, process integration을 별도 검증 층으로 추가했습니다.
- 직접 확인한 ownership/lifetime/state 관계: counted formatter의 clone 증가와 pipeline scope 종료 후 live count 복구가 clone ownership을 관찰합니다. base pointer 삭제 뒤 derived destruction counter가 증가해야 virtual destructor contract가 성립합니다.
- 직접 확인한 failure path: abstract base가 concrete가 되거나 destructor가 non-virtual이면 compile/runtime counter 검사가 실패하도록 작성되어 있습니다. CLI fixture는 step 순서나 archive linkage drift를 잡지만, clone 실패 위치를 하나씩 주입하지는 않습니다.
- 실행한 테스트와 결과: 미실행. 실행 대상으로 `make test-contract`, unit test, CLI integration target을 확인했으나 현재 환경에서는 수행하지 않았습니다.
- 이 commit을 한 문장으로 설명: formatter object-model contract를 compile, ownership counter, 실제 CLI의 세 층으로 고정했습니다.

### `2c99290b9268` — test(format): 복제 실패 뒤 부분 객체 정리 검증

- Importance: **A**
- Tags: **TEST, EXCEPTION, POLYMORPHISM**
- Source 역할: copy construction/assignment의 clone failure를 전 위치에서 sweep합니다.
- Source classification summary: Sweeps clone failures during pipeline copy construction and assignment.

#### 핵심 설계 / failure boundary 확인
- [x] 필요하면 직전 관련 SHA `0427713637b8`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [x] copy construction과 assignment 각각에서 clone 실패를 formatter position별로 주입하는 test control을 찾으세요.
- [x] failed constructor 뒤 이미 생성된 clones가 모두 사라지는지 live-object counter assertions을 확인하세요.
- [x] failed assignment 뒤 destination의 기존 step sequence와 behavior가 유지되는 assertion을 확인하세요.
- [x] source pipeline이 failure sweep 전후 동일하게 살아 있는지 확인하는 증거를 기록하세요.
- [x] production code에서 constructor catch cleanup과 assignment copy-and-swap 두 경로 중 어느 것을 각 test case가 통과하는지 매핑하세요.
- [x] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [x] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### Test commit 학습 구분
- 대상 production invariant: source가 확정한 방향은 **partial polymorphic copy cleanup과 strong assignment guarantee**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 재현 failure / boundary: source가 확정한 방향은 **clone failure at each formatter position**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- test technique: source가 확정한 방향은 **deterministic clone-failure sweep + live-object counters**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 통과하는 production path: source가 확정한 방향은 **FormatPipeline copy constructor catch cleanup / assignment copy-and-swap**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하는 것: source가 확정한 방향은 **failed construction leak freedom과 failed assignment target preservation**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하지 않는 것: source가 확정한 방향은 **factory creation failure나 다른 subsystem allocation failure는 범위 밖**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 성격: source가 확정한 방향은 **deterministic regression / failure-injection**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.

#### 학습자 기록
- 확인한 파일/심볼: `tests/support/TestFormatter.hpp`, `tests/support/TestFormatter.cpp`의 clone failure control과 live counters; `tests/failure/test_pipeline_failure.cpp`; `Makefile`의 failure test target.
- 핵심 코드 발췌 위치: `2c99290b9268:tests/failure/test_pipeline_failure.cpp`는 source pipeline의 formatter 수를 기준으로 failure position을 이동하며 copy construction과 assignment를 각각 시도합니다. `TestFormatter`의 `failCloneOn()`/clone-attempt counter가 지정 clone에서 예외를 발생시킵니다.
- 변경 전/후 차이: 앞선 broad contract 검증에, 복사 중 각 formatter 위치를 결정적으로 실패시키는 회귀가 추가되었습니다. production 코드는 바뀌지 않습니다.
- 직접 확인한 ownership/lifetime/state 관계: failed copy construction 뒤 live count가 source만 남는 baseline으로 돌아오는지 확인합니다. failed assignment 뒤 destination의 기존 step sequence와 적용 결과, source pipeline의 결과가 모두 그대로인지 확인합니다.
- 직접 확인한 failure path: constructor case는 `FormatPipeline` copy constructor의 catch cleanup을, assignment case는 local candidate construction 실패로 `swap()`을 건너뛰는 경로를 통과합니다. 이 테스트는 factory creation이나 일반 allocation 전체가 아니라 formatter clone failure 위치만 다룹니다.
- 실행한 테스트와 결과: 미실행. failure injection 구현과 Make target은 검사했으나 test binary는 실행하지 않았습니다.
- 이 commit을 한 문장으로 설명: 모든 clone 위치에서 부분 객체 정리와 failed assignment의 destination 보존을 deterministic regression으로 만들었습니다.

## Invariant ledger

| SHA | Source에서 확정된 invariant 변화 | 해당 SHA에서 직접 확인한 코드 근거 | 아직 남은 위험/미보장 |
| --- | --- | --- | --- | --- |
| `835d87865762` | virtual destructor와 `clone()`으로 polymorphic copy/deletion protocol 정의 | `Formatter`의 pure virtual `clone/apply/name`, virtual destructor, 각 derived `new Derived(*this)` 구현으로 dynamic copy/delete protocol을 확인했습니다. | 성공한 raw clone을 즉시 인수할 aggregate/guard와 multi-object failure cleanup은 아직 없습니다. |
| `62ed45f8adf9` | pipeline이 borrowed formatter가 아니라 clone을 소유하도록 ownership boundary 확립 | `steps_[max_steps]`, `size_`, capacity-before-clone, slot store-before-size increment, active-prefix destruction으로 pipeline ownership을 확인했습니다. | pipeline copy가 private이어서 aggregate value semantics와 partial-copy cleanup은 아직 없습니다. |
| `bf4d9bed705c` | heterogeneous deep copy와 failed-constructor cleanup, copy-and-swap assignment 확립 | copy constructor의 null initialization·append loop·catch delete와 assignment의 complete copy 후 `swap()`을 확인했습니다. | 실제 clone failure 위치별 회귀와 public abstractness/virtual-delete 증거는 후속 검증이 필요합니다. |
| `0427713637b8` | abstractness/virtual destruction/public contract/process integration 증거 추가 | compile-fail abstractness, repeated public-header compile, counted clone/destruction, CLI fixture가 object-model과 process contract를 확인합니다. | 모든 clone 위치에서 constructor/assignment 실패를 주입하지는 않습니다. |
| `2c99290b9268` | 모든 formatter 위치의 clone failure에서 partial cleanup과 target preservation 검증 | clone failure position sweep가 failed constructor의 live baseline과 failed assignment의 destination/source behavior를 비교합니다. | factory creation, allocator 전 지점, 다른 subsystem failure는 이 테스트 범위 밖입니다. |

## Failure → Fix → Test 연결

- `bf4d9bed705c`: clone 실패 중 incomplete copy constructor가 destructor에 의존할 수 없는 문제를 explicit cleanup으로 해결합니다.
- `0427713637b8`: virtual destruction/abstractness/clone ownership의 broader contract evidence를 추가합니다.
- `2c99290b9268`: clone failure를 formatter position별로 sweep하며 constructor cleanup과 assignment transaction을 직접 검증합니다.

### 학습자 연결 기록
- 최초 위험/맹점: virtual dispatch만으로는 heap에 생긴 derived object의 owner, 복사 방법, base pointer destruction, 부분 복사 실패 cleanup이 정해지지 않습니다.
- 이를 드러낸 실제 failure 또는 test gap: pipeline copy constructor가 여러 `clone()` 중 하나에서 실패하면 완성되지 않은 객체의 destructor가 호출되지 않으며, 정상 output test만으로는 leaked prefix나 non-virtual delete를 볼 수 없습니다.
- 수정/강화된 decision: `Formatter`가 virtual destructor와 owning `clone()` protocol을 제공하고, pipeline은 borrowed prototype을 즉시 clone해 소유합니다. copy constructor는 catch에서 성공 prefix를 직접 정리하고 assignment는 완성된 copy만 swap합니다.
- 해당 코드 위치: `835d87865762:include/cppf/Formatter.hpp`, `62ed45f8adf9:src/FormatPipeline.cpp`, `bf4d9bed705c:src/FormatPipeline.cpp`.
- 이를 고정하는 regression/evidence: `0427713637b8`의 compile/counter/CLI tests와 `2c99290b9268:tests/failure/test_pipeline_failure.cpp`의 clone-position sweep.

## Ownership / state / responsibility 변화

- Source에서 확인되는 핵심 transition을 아래에 실제 코드 근거로 완성하세요.
- 시작 상태: virtual destructor와 `clone()`으로 polymorphic copy/deletion protocol 정의
- Thread 종료 상태: 모든 formatter 위치의 clone failure에서 partial cleanup과 target preservation 검증
- [x] 중간 commit마다 owner/state publisher/cleanup 책임이 어디로 이동하거나 강화되는지 적으세요.
- [x] borrowed와 owned state가 함께 등장하면 각각의 lifetime 종료 지점을 표시하세요.

### 코드 검사로 복원한 변화

1. `835d87865762`: concrete formatter가 자신의 configuration을 소유하고, `clone()` 성공 pointer를 caller에게 넘기는 protocol이 정의됩니다.
2. `62ed45f8adf9`: pipeline이 borrowed prototype을 받아 독립 clone을 만들고 `steps_[0..size_)`의 cleanup owner가 됩니다.
3. `bf4d9bed705c`: pipeline 복사 중 성공한 clone prefix는 incomplete constructor가 직접 정리하고, assignment publication은 `swap()` 한 번으로 제한됩니다.
4. `0427713637b8`: abstractness, virtual deletion, clone ownership, public headers, CLI execution 경로가 서로 다른 검사로 고정됩니다.
5. `2c99290b9268`: 각 clone failure에서 constructor prefix는 사라지고 assignment destination은 보존되는지 counters와 behavior로 확인합니다.

## Thread 최종 상태

- Source가 확정한 최종 흐름: `borrowed formatter prototype → virtual clone → owned pipeline slot → deep-copied aggregate → failure cleanup verification`
- [x] 마지막 Thread SHA 시점에서 실제 type/function 호출 관계를 사용해 위 흐름을 다시 그리세요.
- [x] Thread 시작 시점과 비교해 새로 보장되는 invariant를 정리하세요.
- [x] source가 보장하지 않는 영역이나 외부 side effect/stream position 등 남는 경계를 실제 코드 근거로 적으세요.

### 완성된 Thread 해석

마지막 Thread SHA 기준으로 caller는 concrete formatter를 stack이나 다른 owner에 둔 채 `FormatPipeline::append(const Formatter&)`에 borrowed reference를 전달합니다. `append()`가 virtual `clone()`으로 independent dynamic object를 만들고 pipeline slot이 이를 소유합니다. pipeline copy는 source의 각 dynamic object를 다시 clone하며, `apply()`는 insertion order로 virtual dispatch를 수행합니다.

시작 시점과 비교하면 단일 virtual interface가 독립 복사 가능한 owning aggregate로 확장되었습니다. construction 실패와 assignment 실패의 cleanup 책임도 구분됩니다. 다만 raw-pointer clone protocol은 caller가 pipeline 밖에서 직접 사용할 때 즉시 ownership을 인수해야 하며, 후속 tests가 관찰하지 않은 allocator·factory failure는 이 Thread만으로 증명되지 않습니다.

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

- 실제 caller → callee 흐름: caller의 concrete `Formatter` → `FormatPipeline::append()` → virtual `clone()` → owned `steps_[size_]` → `apply()`의 ordered virtual dispatch → `TextBuffer` 결과 반환.
- 핵심 상태 필드: `Formatter *steps_[max_steps]`, `std::size_t size_`; 각 derived formatter의 `TextBuffer prefix_` 또는 `suffix_`.
- resource owner / borrowed view: append 인자와 source pipeline step 참조는 borrowed이고, 반환된 clone은 성공한 slot 또는 copy-construction prefix가 소유합니다.
- commit point: 단일 append는 clone 성공 후 slot 저장과 `++size_`; assignment는 complete local copy를 만든 뒤 `swap(copy)`입니다.
- cleanup path: append 전 clone 실패는 반환 owner가 없고 pipeline은 불변입니다. copy constructor 실패는 catch가 `[0, size_)` clone을 직접 삭제하며, assignment 실패는 local candidate가 target과 swap되기 전에 정리됩니다.
- 최종 invariant 설명: 각 polymorphic clone은 정확히 한 pipeline에 소유되고 base pointer로 안전하게 파괴되며, deep copy는 dynamic type과 순서를 유지하고 incomplete aggregate는 publish되지 않습니다.

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
