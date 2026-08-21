# Generic Containers Converge in a Transactional Batch Engine

## Thread 목표

random-access template abstraction을 vector/deque 두 표현에 적용하고, record parsing·중복 검사·RPN 계산·정렬·stream 완료 판정까지 하나의 delayed-publication transaction으로 통합하는 과정을 복원합니다.

**Source significance:** generic containers, checked arithmetic, deterministic order, local candidates, delayed publication을 final subsystem에서 결합합니다. 후속 commit은 successful stream completion의 의미를 정교화하고, 어떤 협력 failure path도 partial batch를 publish하지 못함을 검증합니다.

## 이 Thread를 이해하기 위한 핵심 질문

- `std::sort` 사용이 template의 random-access requirement를 어떻게 실제 compile requirement로 만드는가?
- throwing element type에서도 batch copy/assignment가 어떤 보장을 유지해야 하는가?
- `BatchEngine::replace()`의 rollback value는 무엇이며 왜 보상 코드가 필요 없는가?
- canonical `(value, name)` total order가 입력 순열 독립성과 어떤 관계가 있는가?
- vector/deque 결과 불일치를 publish 전에 검사하는 이유는 무엇인가?
- 마지막 newline이 없는 정상 EOF와 실제 stream failure를 어떻게 구분하는가?
- syntax/arithmetic/stream/allocation failure sweep이 하나의 transaction invariant를 어떻게 검증하는가?

## 완료 기준

- [x] template requirement와 vector/deque substitution을 public header와 tests에서 확인할 수 있다.
- [x] batch replace의 candidate state, duplicate tracking, RPN result accumulation, final swap 위치를 그릴 수 있다.
- [x] sorting/serialization이 deterministic external behavior를 만드는 근거를 실제 comparator와 staging 코드에서 확인할 수 있다.
- [x] stream reader fix 전후에서 clean EOF/final unterminated line/failure의 분기를 비교할 수 있다.
- [x] seeded prior state가 모든 rejection path 뒤 유지되는 regression/failure-sweep 구조를 설명할 수 있다.

## Source에 연결된 invariant / engineering difficulty

### Critical invariant

- 완성되지 않은 batch candidate는 publish되지 않는다.
- strong guarantee replacement는 parse/arithmetic/stream-read preparation/allocation 실패 시 prior observable state를 보존한다.
- batch output은 total `(value, name)` order를 가지며 input permutation과 repeated rendering에 불변이다.
- signed arithmetic은 실행 전에 검사된다.

### Major engineering difficulty

- vector/deque generic behavior와 deterministic total order, transactional publication을 동시에 유지.
- whole-stream batch replacement 중 partial target mutation 방지.
- clean final unterminated line과 actual stream failure 구분.

위 항목은 source가 확정한 범위입니다. 실제 코드에서 어떻게 구현되는지는 아래 학습 기록에서 직접 확인합니다.

## Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `708c025ef2a0` | feat(template): 임의 접근 container batch 추상화 추가 | S | ARCH, GENERIC, CORE | configurable random-access batch abstraction과 cross-container range comparison을 정의합니다. |
| 2 | `aaeff163baf8` | test(template): iterator·정렬·복사 실패 계약 검증 | A | TEST, GENERIC, EXCEPTION | iterator/algorithm/container substitution과 throwing-value behavior를 검증합니다. |
| 3 | `d0295f82614b` | feat(batch): 입력 문법과 원자 교체 구현 | S | ARCH, EXCEPTION, INTEGRATION | record parsing, duplicate detection, RPN evaluation, swap-on-success publication을 통합합니다. |
| 4 | `42d411e42268` | feat(batch): 결과 정렬과 직렬화 제공 | A | DETERMINISM, EXCEPTION, CORE | total result order와 classic-locale staged serialization을 추가합니다. |
| 5 | `af57a8f9c5fe` | feat(batch): 두 container의 정렬 결과 대조 | A | GENERIC, INTEGRATION, DETERMINISM | vector/deque candidates를 독립적으로 sort하고 disagreement를 commit 전에 거부합니다. |
| 6 | `9ba0e7c897ed` | test(batch): 입력 순열과 출력 결정성 검증 | A | TEST, DETERMINISM, EDGE | input permutation invariance와 byte-identical repeated output을 검증합니다. |
| 7 | `ea23237ad506` | fix(batch): 입력 stream 종료 상태를 명확히 구분 | A | DEBUG, PARSING, EDGE | clean EOF, final unterminated record, input failure를 명확히 구분합니다. |
| 8 | `b4ddd78fb9aa` | test(batch): 입력·산술·할당 실패 뒤 상태 복원 검증 | A | TEST, EXCEPTION, RISK | syntax/arithmetic/stream/allocation failure 전 범위에서 seeded state preservation을 검증합니다. |

## Commit별 학습 기록

### `708c025ef2a0` — feat(template): 임의 접근 container batch 추상화 추가

- Importance: **S**
- Tags: **ARCH, GENERIC, CORE**
- Source 역할: configurable random-access batch abstraction과 cross-container range comparison을 정의합니다.
- Source classification summary: Introduces `RandomAccessBatch` over configurable random-access containers and cross-container range equality.

#### 이 commit 직전 상태와 문제
- 이 Thread의 첫 commit이므로, `git show <sha>^`가 가능한 경우 parent에서 관련 type/기능이 없거나 다른 형태였는지 확인하세요.
- Source가 확정한 Problem/Decision을 실제 diff와 대응시키되, source에 없는 동기를 추가로 추정하지 마세요.

#### 해당 SHA에서 확인할 실제 코드
- [x] `RandomAccessBatch<T, Container>` public header에서 value/container template parameters와 default `std::vector`를 확인하세요.
- [x] container의 iterator/const_iterator category를 그대로 expose하는 typedef와 begin/end API를 찾으세요.
- [x] `at()`, insertion, range iteration, `std::sort` 기반 sort, range equality가 어떤 container capability를 요구하는지 기록하세요.
- [x] `std::list` 같은 non-random-access container가 왜 sort instantiation 단계에서 맞지 않는지 실제 algorithm requirement와 연결하세요.
- [x] assignment의 copy-and-swap 구현과 underlying container copy failure 시 target preservation 경로를 확인하세요.
- [x] vector와 deque instantiation이 같은 abstraction을 통해 동작하도록 구현이 concrete representation에 의존하지 않는 지점을 찾으세요.

#### Ownership / lifecycle / state transition
- [x] 상태 필드별 owner, lifetime, valid state를 표로 직접 정리하세요.
- [x] throw 가능한 연산과 non-throwing commit operation의 순서를 실제 코드 라인 기준으로 적으세요.
- [x] 성공 전 temporary/candidate state와 성공 후 published state를 구분해 그리세요.

#### Failure scenario와 보장 경계
- [x] source가 지목한 failure를 하나 이상 실제 제어 흐름으로 따라가고, exception 직전/직후 observable state를 기록하세요.
- [x] 이 commit이 보장하는 것과 아직 보장하지 않는 것을 source와 해당 SHA 코드에 근거해 구분하세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `aaeff163baf8`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼: `include/cppf/RandomAccessBatch.hpp`의 `RandomAccessBatch<T, Container>`, iterator typedefs, `values_`, `push_back()`, `at()`, `sort()`, `swap()`, `equal_ranges()`.
- 핵심 코드 발췌 위치: `708c025ef2a0:include/cppf/RandomAccessBatch.hpp`는 `Container = std::vector<T>`를 기본값으로 두고 container의 iterator/const_iterator를 그대로 노출합니다. `sort()`는 `std::sort(values_.begin(), values_.end(), compare)`를 호출하고 assignment는 complete copy 뒤 `swap()`합니다.
- 변경 전/후 차이: concrete vector 사용 대신 random-access operations를 만족하는 container parameter를 교체할 수 있는 header-only batch abstraction과 서로 다른 range를 비교하는 helper가 생겼습니다.
- 직접 확인한 ownership/lifetime/state 관계: `RandomAccessBatch`가 `Container values_`를 값으로 소유하며 iterator는 그 container lifetime과 mutation 규칙에 종속된 borrowed view입니다. copy는 underlying container의 독립 value copy이고 assignment commit은 container swap입니다.
- 직접 확인한 failure path: element/container copy가 실패하면 copy constructor는 underlying container가 partial elements를 정리하고, assignment는 local copy construction 단계에서 target `values_`를 건드리지 않습니다. `at()`은 범위 밖을 거부합니다. `std::list`는 template 선언 자체가 아니라 `std::sort` instantiation의 random-access requirement에서 제외됩니다.
- 실행한 테스트와 결과: 미실행. 지정 SHA의 public template implementation을 검사했으며 command는 수행하지 않았습니다.
- 이 commit을 한 문장으로 설명: vector/deque로 치환 가능한 random-access batch와 copy-and-swap value semantics를 정의했습니다.

### `aaeff163baf8` — test(template): iterator·정렬·복사 실패 계약 검증

- Importance: **A**
- Tags: **TEST, GENERIC, EXCEPTION**
- Source 역할: iterator/algorithm/container substitution과 throwing-value behavior를 검증합니다.
- Source classification summary: Tests iterators, algorithms, vector/deque substitution, copying, and throwing element types.

#### 핵심 설계 / failure boundary 확인
- [x] 필요하면 직전 관련 SHA `708c025ef2a0`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [x] vector/deque 각각에서 mutable/const iterator와 standard algorithm을 사용하는 tests를 구분하세요.
- [x] checked access, sorting, range equality, copy, assignment, self-assignment의 expected behavior를 확인하세요.
- [x] throwing value type의 copy failure injection과 live-object counter가 어떻게 구성되는지 찾으세요.
- [x] failed construction에서 partial copied values leak가 없는지, failed assignment에서 destination 보존이 되는지 각각의 assertion을 기록하세요.
- [x] generic interface shape test와 exception guarantee test가 서로 어떤 production template instantiation을 사용하는지 구분하세요.
- [x] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [x] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### Test commit 학습 구분
- 대상 production invariant: source가 확정한 방향은 **RandomAccessBatch generic interface와 value/exception semantics**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 재현 failure / boundary: source가 확정한 방향은 **vector/deque substitution, throwing element copy**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- test technique: source가 확정한 방향은 **multi-container unit + throwing test type/live counters**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 통과하는 production path: source가 확정한 방향은 **template instantiation, container copy/sort/assignment paths**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하는 것: source가 확정한 방향은 **generic capability와 failed-copy cleanup/target preservation**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하지 않는 것: source가 확정한 방향은 **non-random-access container support를 증명하지 않으며 오히려 요구사항 밖으로 고정**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 성격: source가 확정한 방향은 **broad generic contract + failure regression**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `d0295f82614b`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼: `tests/test_random_access_batch.cpp`; throwing value test type와 live/copy counters; `tests/compile/template_headers.cpp`, `template_const_iterator_fail.cpp`, `template_list_sort_fail.cpp`; Make contract target.
- 핵심 코드 발췌 위치: `aaeff163baf8:tests/test_random_access_batch.cpp`는 vector와 deque instantiation에서 iterator/const_iterator, standard algorithms, access, sort, equality, copy/assignment/self-assignment를 사용합니다. throwing element는 지정 copy에서 예외를 발생시키고 live count를 노출합니다.
- 변경 전/후 차이: generic interface의 정상 치환만이 아니라 element copy failure에서 construction cleanup과 assignment target preservation을 확인하는 test layer가 추가되었습니다.
- 직접 확인한 ownership/lifetime/state 관계: failed copy construction 뒤 성공했던 temporary elements가 사라져 live baseline으로 돌아와야 하고, failed assignment 뒤 destination values와 source values가 각각 유지되어야 합니다. iterator compile cases는 const batch의 mutation을 금지하는 public shape를 고정합니다.
- 직접 확인한 failure path: vector/deque의 element copying 중 throw를 위치별로 제어하고, `std::list` sort 사용은 expected compile failure로 다룹니다. 따라서 non-random-access support를 증명하는 것이 아니라 요구사항 밖임을 명시합니다.
- 실행한 테스트와 결과: 미실행. unit/compile-contract source와 기대 조건을 검사했으며 command는 수행하지 않았습니다.
- 이 commit을 한 문장으로 설명: container 치환, algorithm 사용, throwing element에서의 cleanup과 strong assignment를 검증했습니다.

### `d0295f82614b` — feat(batch): 입력 문법과 원자 교체 구현

- Importance: **S**
- Tags: **ARCH, EXCEPTION, INTEGRATION**
- Source 역할: record parsing, duplicate detection, RPN evaluation, swap-on-success publication을 통합합니다.
- Source classification summary: Implements whole-stream batch parsing, uniqueness, RPN evaluation, and swap-on-success replacement.

#### 이 commit 직전 상태와 문제
- 직전 관련 Thread SHA `aaeff163baf8`를 먼저 checkout하여 이 commit이 추가되기 전 representation/ownership/state-publication 방식을 확인하세요.
- Source가 확정한 Problem/Decision을 실제 diff와 대응시키되, source에 없는 동기를 추가로 추정하지 마세요.

#### 해당 SHA에서 확인할 실제 코드
- [x] 입력 record를 name과 RPN expression으로 split/trim하고 identifier grammar를 검사하는 helper chain을 찾으세요.
- [x] duplicate-name tracking 구조와 duplicate rejection이 candidate publication보다 앞에서 일어나는지 확인하세요.
- [x] 각 expression이 `RpnEvaluator`를 호출해 `JobResult` candidate에 추가되는 call graph를 그리세요.
- [x] existing `results_`와 분리된 local candidate result set/map이 whole-input 처리 동안 유지되는지 확인하세요.
- [x] empty input, malformed record, duplicate, evaluator error, stream failure 각각이 final swap에 도달하지 않는 branch를 기록하세요.
- [x] complete input 성공 뒤 candidate vector가 `results_`와 swap되는 단 하나의 publication point를 표시하세요.

#### Ownership / lifecycle / state transition
- [x] 상태 필드별 owner, lifetime, valid state를 표로 직접 정리하세요.
- [x] throw 가능한 연산과 non-throwing commit operation의 순서를 실제 코드 라인 기준으로 적으세요.
- [x] 성공 전 temporary/candidate state와 성공 후 published state를 구분해 그리세요.

#### Failure scenario와 보장 경계
- [x] source가 지목한 failure를 하나 이상 실제 제어 흐름으로 따라가고, exception 직전/직후 observable state를 기록하세요.
- [x] 이 commit이 보장하는 것과 아직 보장하지 않는 것을 source와 해당 SHA 코드에 근거해 구분하세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `42d411e42268`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼: `include/cppf/BatchEngine.hpp`의 `JobResult`, `BatchEngine::results_`, `replace()`; `src/BatchEngine.cpp`의 trim/name/line parser, duplicate map, `RpnEvaluator::evaluate()`, local candidate, final swap.
- 핵심 코드 발췌 위치: `d0295f82614b:src/BatchEngine.cpp`는 각 line을 한 개의 `|`로 분리하고 field trim/name grammar를 검사합니다. local candidate와 `std::map<std::string, long> seen`에만 결과를 누적하고 complete non-empty input 뒤 `results_.swap(candidate)`를 호출합니다.
- 변경 전/후 차이: generic container groundwork 위에 whole-stream parsing, duplicate rejection, checked RPN, persistent result replacement가 통합되었습니다. 기존 `results_`를 line마다 변경하지 않고 local state가 전체 입력을 소유합니다.
- 직접 확인한 ownership/lifetime/state 관계: input stream은 borrowed source이고 parsed strings, seen map, candidate results는 call-local owners입니다. `JobResult`가 name/value를 값으로 소유하며 final swap 전 `results_`는 prior batch를 계속 소유합니다.
- 직접 확인한 failure path: malformed/blank record, missing/extra separator, invalid name, duplicate name, RPN exception, stream failure, empty input은 final swap에 도달하지 않습니다. local containers가 partial records를 정리하므로 보상 mutation 없이 prior results가 유지됩니다. 이 시점의 line-loop EOF 판정은 후속 fix 전입니다.
- 실행한 테스트와 결과: 미실행. 지정 SHA의 parser, evaluator call, candidate publication을 검사했으며 command는 수행하지 않았습니다.
- 이 commit을 한 문장으로 설명: 전체 입력을 local candidate에서 검증·계산한 뒤 한 번만 교체하는 batch transaction을 만들었습니다.

### `42d411e42268` — feat(batch): 결과 정렬과 직렬화 제공

- Importance: **A**
- Tags: **DETERMINISM, EXCEPTION, CORE**
- Source 역할: total result order와 classic-locale staged serialization을 추가합니다.
- Source classification summary: Adds total result ordering and classic-locale staged batch serialization.

#### 핵심 설계 / failure boundary 확인
- [x] 필요하면 직전 관련 SHA `d0295f82614b`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [x] result comparator가 value를 먼저, name을 tie-breaker로 비교해 total order를 만드는 실제 코드를 확인하세요.
- [x] sorting이 published `results_`가 아니라 candidate에서 일어나도록 state mutation 순서를 추적하세요.
- [x] serialization이 classic-locale temporary stream에서 완성된 bytes를 만든 뒤 destination으로 쓰는 staging을 확인하세요.
- [x] caller stream locale/flags를 덮어쓰지 않는지 implementation과 tests를 함께 확인하세요.
- [x] formatting stage의 failure는 partial record sequence를 publish하지 않지만 final destination write failure는 rollback 대상이 아님을 실제 code boundary로 기록하세요.
- [x] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [x] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `af57a8f9c5fe`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼: `src/BatchEngine.cpp`의 `resultLess()`, candidate sort, `BatchEngine::write()`; `JobResult::name()/value()`.
- 핵심 코드 발췌 위치: `42d411e42268:src/BatchEngine.cpp`의 comparator는 value를 먼저 비교하고 같으면 name을 비교합니다. candidate는 publication 전에 sort되고 `write()`는 classic-locale temporary stream에 모든 `value | name` row를 만든 뒤 destination에 한 번 씁니다.
- 변경 전/후 차이: 입력 순서대로 저장하던 result set에 `(value, name)` total order와 deterministic serialization이 추가되었습니다. sorting과 formatting 모두 published state나 caller stream을 준비 중간에 직접 변경하지 않습니다.
- 직접 확인한 ownership/lifetime/state 관계: sort 대상은 local candidate이며 성공 후 vector가 `results_`로 이동합니다. write candidate인 `ostringstream`와 string은 local owner이고 caller stream의 flags/locale는 수정하지 않습니다.
- 직접 확인한 failure path: sort comparison/element operation이나 local formatting이 실패하면 result publication 또는 destination write 전입니다. final destination `write()` 실패는 이미 보낸 bytes를 rollback하지 않습니다. comparator는 equal value에 name tie-breaker를 두어 insertion permutation에 의존하지 않습니다.
- 실행한 테스트와 결과: 미실행. comparator와 staged serializer를 검사했으며 command는 수행하지 않았습니다.
- 이 commit을 한 문장으로 설명: total order와 staged classic-locale serialization으로 batch 외부 결과를 결정적으로 만들었습니다.

### `af57a8f9c5fe` — feat(batch): 두 container의 정렬 결과 대조

- Importance: **A**
- Tags: **GENERIC, INTEGRATION, DETERMINISM**
- Source 역할: vector/deque candidates를 독립적으로 sort하고 disagreement를 commit 전에 거부합니다.
- Source classification summary: Runs and sorts vector- and deque-backed batches, then rejects disagreement before commit.

#### 핵심 설계 / failure boundary 확인
- [x] 필요하면 직전 관련 SHA `42d411e42268`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [x] accepted job이 vector-backed와 deque-backed `RandomAccessBatch` candidate 양쪽에 어떻게 추가되는지 추적하세요.
- [x] 두 candidate가 동일 comparator로 독립 sort되는 호출을 확인하세요.
- [x] `equal_ranges()` 또는 대응 비교가 disagreement를 detect하는 위치와 `logic_error` 발생 전 publication 상태를 확인하세요.
- [x] 불일치 시 prior engine state가 유지되는 이유를 candidate lifetime과 final commit 순서로 설명하세요.
- [x] 추가 memory/sort work가 deliberate verification이라는 사실이 코드 구조에서 어떻게 드러나는지 기록하세요.
- [x] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [x] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `9ba0e7c897ed`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼: `src/BatchEngine.cpp`의 vector/deque `RandomAccessBatch` candidates, dual `push_back()`, `sort()`, `equal_ranges()`, `logic_error`, vector-to-`std::vector` candidate construction, final `results_.swap()`.
- 핵심 코드 발췌 위치: `af57a8f9c5fe:src/BatchEngine.cpp`는 각 accepted `JobResult`를 vector-backed와 deque-backed batch 양쪽에 추가하고 같은 `resultLess`로 독립 정렬합니다. range가 다르면 `batch container disagreement`를 throw하고, 같을 때만 vector range로 final candidate를 만들어 게시합니다.
- 변경 전/후 차이: 단일 representation 계산에서 두 container가 같은 semantic result를 만드는지 production path에서 대조하는 구조로 확장되었습니다. 추가 memory와 sort work는 commit 전 검증에 사용됩니다.
- 직접 확인한 ownership/lifetime/state 관계: vector/deque candidates와 final `std::vector` candidate는 모두 local owners입니다. `results_`는 두 sort와 equality, final vector construction이 끝날 때까지 prior state를 보유합니다.
- 직접 확인한 failure path: 어느 container의 insertion/sort/allocation이나 equality 전 단계가 실패하거나 두 range가 불일치하면 final swap이 실행되지 않습니다. local destructors가 양쪽 candidate를 정리합니다. 같은 comparator 구현을 공유하므로 독립 oracle 자체는 아니지만 representation disagreement는 탐지합니다.
- 실행한 테스트와 결과: 미실행. dual-container implementation과 publication 순서를 검사했으며 command는 수행하지 않았습니다.
- 이 commit을 한 문장으로 설명: vector와 deque 결과를 commit 전에 독립 정렬·대조해 representation disagreement를 거부했습니다.

### `9ba0e7c897ed` — test(batch): 입력 순열과 출력 결정성 검증

- Importance: **A**
- Tags: **TEST, DETERMINISM, EDGE**
- Source 역할: input permutation invariance와 byte-identical repeated output을 검증합니다.
- Source classification summary: Verifies input-permutation invariance, tie ordering, single-element behavior, and repeatable output.

#### 핵심 설계 / failure boundary 확인
- [x] 필요하면 직전 관련 SHA `af57a8f9c5fe`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [x] 동일 job set의 여러 insertion permutation을 만드는 fixtures와 expected canonical order를 확인하세요.
- [x] equal-valued jobs에서 name tie-breaker가 빠졌을 때 잡힐 수 있는 test case를 찾으세요.
- [x] vector/deque batch ranges가 동일함을 확인하는 assertion을 기록하세요.
- [x] 동일 engine state를 여러 번 serialize해 byte-identical output을 비교하는 deterministic regression을 확인하세요.
- [x] 이 테스트가 단순 sortedness가 아니라 permutation invariance까지 증명하도록 입력 구성이 어떻게 설계되었는지 적으세요.
- [x] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [x] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### Test commit 학습 구분
- 대상 production invariant: source가 확정한 방향은 **canonical total order와 output determinism**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 재현 failure / boundary: source가 확정한 방향은 **input permutation, equal-value tie, repeated rendering**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- test technique: source가 확정한 방향은 **permutation regression + repeated-byte comparison**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 통과하는 production path: source가 확정한 방향은 **comparator, vector/deque sorting, serialization**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하는 것: source가 확정한 방향은 **입력 순서/representation에 독립적인 결과**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하지 않는 것: source가 확정한 방향은 **stream failure rollback이나 allocation failure는 이 commit 단독 범위가 아님**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 성격: source가 확정한 방향은 **deterministic regression**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `ea23237ad506`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼: `tests/test_batch_engine.cpp`의 permutation/tie/single-element/repeated-output cases; `tests/test_random_access_batch.cpp`의 cross-container equality; CLI fixtures.
- 핵심 코드 발췌 위치: `9ba0e7c897ed:tests/test_batch_engine.cpp`는 동일 job set의 서로 다른 입력 순서를 하나의 expected `(value, name)` row sequence와 비교하고, equal value에서 `Alpha`, `alpha`, `beta`, `zeta` name order를 확인합니다. 같은 engine을 반복 serialize한 bytes도 비교합니다.
- 변경 전/후 차이: sortedness 한 사례에서 입력 permutation 독립성, tie total order, vector/deque equality, repeated rendering의 byte determinism으로 검증 범위가 넓어졌습니다.
- 직접 확인한 ownership/lifetime/state 관계: 각 permutation은 별도 engine/candidate에서 계산되며 결과 bytes만 공통 oracle과 비교됩니다. repeated write는 persistent `results_`를 변경하지 않아야 합니다.
- 직접 확인한 failure path: name tie-breaker가 없거나 unstable/input-dependent order이면 equal-valued permutations이 다른 bytes를 만들어 실패합니다. 이 commit은 stream/allocation failure rollback을 직접 주입하지 않습니다.
- 실행한 테스트와 결과: 미실행. deterministic cases와 expected bytes를 검사했으며 test command는 수행하지 않았습니다.
- 이 commit을 한 문장으로 설명: canonical order가 입력 순서와 container 표현, 반복 출력에 독립적임을 고정했습니다.

### `ea23237ad506` — fix(batch): 입력 stream 종료 상태를 명확히 구분

- Importance: **A**
- Tags: **DEBUG, PARSING, EDGE**
- Source 역할: clean EOF, final unterminated record, input failure를 명확히 구분합니다.
- Source classification summary: Distinguishes clean EOF, an unterminated final record, and actual stream failure.

#### Failure → Fix → Test chain
- **기존 가정:** 일반적인 `getline` loop 종료를 clean input completion과 동일하게 취급할 수 있었다.
- **실제 failure / 위험:** valid final unterminated line을 버리거나 실제 I/O fault를 EOF처럼 받아들일 수 있었다.
- **root cause:** line extraction 종료 상태가 complete line / clean EOF / actual failure로 분류되지 않았다.
- **수정된 invariant / decision:** record reader가 세 outcome을 구분하고 clean completion일 때만 batch transaction을 commit한다.
- **실제 코드 확인:** 기존 reader/loop와 이 SHA의 reader helper를 비교해 stream flags와 return classification을 확인한다.
- **regression test:** `b4ddd78fb9aa`에서 stream failure 뒤 seeded state가 보존되는 경로를 확인한다.

#### 핵심 설계 / failure boundary 확인
- [x] 필요하면 직전 관련 SHA `9ba0e7c897ed`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [x] 직전 batch reader의 일반 `getline` loop와 이 SHA의 record-reader helper를 관련 code로 비교하세요.
- [x] reader가 complete line, final unterminated line + clean EOF, actual failure의 세 outcome을 어떤 stream flags로 구분하는지 확인하세요.
- [x] trailing newline이 없는 마지막 record가 candidate에 포함되는 path를 추적하세요.
- [x] `badbit` 또는 non-EOF failure가 transaction rejection으로 이어지고 final swap을 막는 branch를 확인하세요.
- [x] fix가 syntax/arithmetic transaction에 transport-state success condition을 추가한 것임을 state publication 위치와 연결하세요.
- [x] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [x] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `b4ddd78fb9aa`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼: `src/BatchEngine.cpp`의 `readLine(std::istream&, std::string&)`, `BatchEngine::replace()` loop; 직전 `std::getline` 기반 loop.
- 핵심 코드 발췌 위치: `ea23237ad506:src/BatchEngine.cpp`의 `readLine()`은 `input.get(value)`로 newline까지 누적합니다. extraction 종료 후 `!input.eof()`면 input failure를 throw하고, clean EOF에서는 `!line.empty()`를 반환해 newline 없는 final record를 한 번 더 처리합니다.
- 변경 전/후 차이: 일반 `getline` loop 종료와 후속 flag 판정에 의존하던 reader를 complete line, clean EOF의 final unterminated line, non-EOF failure로 명시적으로 분리했습니다.
- 직접 확인한 ownership/lifetime/state 관계: line은 local candidate record이고 read helper가 true를 반환한 경우에만 parse/RPN/vector/deque candidates로 전달됩니다. stream은 caller-owned이며 position을 consume하지만 engine state는 final swap 전까지 유지됩니다.
- 직접 확인한 failure path: final line에 newline이 없어도 bytes가 있으면 정상 record로 처리합니다. initial/between-record read가 `badbit` 등 non-EOF failure로 끝나면 `invalid batch input`을 throw해 commit을 막습니다. input position이나 flags를 원상복구하지는 않습니다.
- 실행한 테스트와 결과: 미실행. fix 전후 reader와 후속 bad-stream tests를 검사했으며 command는 수행하지 않았습니다.
- 이 commit을 한 문장으로 설명: 성공한 input completion의 정의를 clean EOF, final unterminated record, 실제 read failure로 분리했습니다.

### `b4ddd78fb9aa` — test(batch): 입력·산술·할당 실패 뒤 상태 복원 검증

- Importance: **A**
- Tags: **TEST, EXCEPTION, RISK**
- Source 역할: syntax/arithmetic/stream/allocation failure 전 범위에서 seeded state preservation을 검증합니다.
- Source classification summary: Sweeps malformed input, arithmetic, stream, and allocation failures after seeding engine state.

#### 핵심 설계 / failure boundary 확인
- [x] 필요하면 직전 관련 SHA `ea23237ad506`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [x] known result로 engine을 seed하는 setup과 prior serialized bytes baseline을 확인하세요.
- [x] malformed input, RPN arithmetic failure, stream failure를 각각 주입하는 test cases와 production failure path를 매핑하세요.
- [x] observed allocation failure point sweep이 parsing, duplicate tracking, evaluator stack, two candidates, sort/compare 중 어디를 통과하는지 기록하세요.
- [x] 모든 rejection 후 result objects와 serialized bytes가 seed와 동일하고 live allocation baseline이 복구되는 assertions을 확인하세요.
- [x] CLI failure cases에서 stdout이 비어 있음을 검사해 object-state atomicity가 process-output atomicity로 연결되는 지점을 확인하세요.
- [x] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [x] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### Test commit 학습 구분
- 대상 production invariant: source가 확정한 방향은 **BatchEngine whole-input strong transaction**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 재현 failure / boundary: source가 확정한 방향은 **syntax, arithmetic, stream, allocation failures**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- test technique: source가 확정한 방향은 **seeded-state failure sweep + live-block accounting + CLI failure fixtures**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 통과하는 production path: source가 확정한 방향은 **parsing, duplicate set, RPN, two candidates, sort/compare, final publication**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하는 것: source가 확정한 방향은 **협력 layer failure 뒤 state/bytes/baseline rollback**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하지 않는 것: source가 확정한 방향은 **외부 stream position 자체를 되돌리는 보장은 아님**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 성격: source가 확정한 방향은 **deterministic failure-injection + integration**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.

#### 학습자 기록
- 확인한 파일/심볼: `tests/test_batch_engine.cpp`의 `checkInvalidPreserves()`, `checkOverflowPreserves()`, bad-stream case; `tests/failure/test_batch_failure.cpp`; `tests/support/FailingNew.cpp`; batch CLI failure fixtures.
- 핵심 코드 발췌 위치: `b4ddd78fb9aa:tests/test_batch_engine.cpp`는 failure 전 serialized bytes와 첫 `JobResult` 주소를 저장하고 syntax/RPN overflow/division/bad stream 뒤 동일한지 검사합니다. `tests/failure/test_batch_failure.cpp`는 observed allocation count를 얻어 1..N failure sweep을 수행합니다.
- 변경 전/후 차이: representative parsing tests에서 syntax, arithmetic, stream, allocation 협력 layer 전체를 대상으로 seeded prior state와 ownership baseline을 확인하는 회귀로 확장되었습니다.
- 직접 확인한 ownership/lifetime/state 관계: engine을 `seed | 7`로 채운 뒤 replacement failure마다 size/value/output와 live-block baseline을 비교합니다. 주소 동일성 검사는 실패 중 `results_` vector 자체가 swap/reallocation되지 않았음을 관찰합니다.
- 직접 확인한 failure path: malformed records/duplicates, RPN invalid/overflow, pre-set bad stream, parsing·map·RPN stack·dual candidates·sort/final candidate에서 관찰된 allocation failures가 모두 final publication 전에 예외로 끝납니다. CLI invalid cases는 empty stdout를 요구합니다. consumed input stream position은 rollback 대상이 아닙니다.
- 실행한 테스트와 결과: 미실행. unit failure helpers, allocation sweep, CLI fixtures, Make targets를 검사했으나 실행하지 않았습니다.
- 이 commit을 한 문장으로 설명: batch transaction의 모든 관찰 협력 failure에서 prior objects, bytes, 주소, live allocations가 유지되는지 검증했습니다.

## Invariant ledger

| SHA | Source에서 확정된 invariant 변화 | 해당 SHA에서 직접 확인한 코드 근거 | 아직 남은 위험/미보장 |
| --- | --- | --- | --- | --- |
| `708c025ef2a0` | configurable random-access container abstraction과 cross-container equality 도입 | `Container` parameter, inherited iterator types, `std::sort`, underlying value ownership, copy-and-swap assignment, `equal_ranges`를 확인했습니다. | non-random-access container는 sort requirement 밖이며 실제 throwing-value evidence는 아직 없습니다. |
| `aaeff163baf8` | iterator/algorithm/substitution과 throwing-value failure 계약 검증 | vector/deque substitution, iterator algorithms, compile-fail list sort, throwing element copy/live counters가 generic/exception contract를 확인합니다. | whole-stream parsing과 persistent transaction은 아직 도입 전입니다. |
| `d0295f82614b` | whole-input candidate와 swap-on-success publication으로 batch transaction 확립 | line grammar, duplicate map, RPN call, local candidate, non-empty/stream completion 후 단일 `results_.swap(candidate)`를 확인했습니다. | canonical sort/serialization과 stream completion의 세부 구분은 후속 변경이 필요합니다. |
| `42d411e42268` | `(value, name)` total order와 classic-locale staged serialization 추가 | value-first/name-tie comparator와 candidate sort, classic temporary serialization, final single write를 확인했습니다. | destination write rollback과 cross-container agreement는 아직 보장하지 않습니다. |
| `af57a8f9c5fe` | vector/deque를 독립 sort하고 disagreement를 commit 전 거부 | 각 result를 vector/deque batches에 넣고 독립 sort 후 `equal_ranges`가 true일 때만 final vector를 게시합니다. | 두 경로가 같은 comparator를 공유하므로 완전히 독립된 semantic oracle는 아닙니다. |
| `9ba0e7c897ed` | input permutation independence와 repeated byte determinism 검증 | 서로 다른 permutations, equal-value name ties, one element, repeated bytes가 canonical result를 비교합니다. | stream/allocation failure rollback은 이 commit 단독 범위가 아닙니다. |
| `ea23237ad506` | record reader가 clean EOF/final unterminated line/input failure를 분리하도록 수정 | char-level `readLine()`이 newline, non-empty final EOF record, non-EOF failure를 분류하고 failure에서 swap을 막습니다. | caller stream position/flags 자체는 되돌리지 않습니다. |
| `b4ddd78fb9aa` | syntax/arithmetic/stream/allocation failure 전 범위에서 seeded state rollback 검증 | seeded bytes와 first-result address, syntax/RPN/bad-stream cases, observed allocation sweep와 live-block baseline을 확인합니다. | 관찰되지 않은 환경 failure와 external stream rollback은 증명하지 않습니다. |

## Failure → Fix → Test 연결

- `d0295f82614b`: whole-input candidate와 swap-on-success transaction을 도입합니다.
- `ea23237ad506` fix: successful input completion의 정의를 clean EOF/final unterminated line/actual failure로 정교화합니다.
- `b4ddd78fb9aa`: syntax/arithmetic/stream/allocation failure 뒤 seeded state rollback을 폭넓게 검증합니다.

### 학습자 연결 기록
- 최초 위험/맹점: generic container의 value semantics가 안전해도 whole-stream operation이 persistent results를 line마다 변경하면 parse·RPN·sort·stream failure에서 partial batch가 노출됩니다. 일반 getline 종료를 성공으로 간주하는 것도 transport fault를 숨길 수 있습니다.
- 이를 드러낸 실제 failure 또는 test gap: duplicate/RPN failure는 여러 valid records 뒤 발생할 수 있고, vector/deque 또는 sort allocation도 late failure입니다. newline 없는 final record와 bad stream은 같은 loop 종료처럼 보일 수 있습니다.
- 수정/강화된 decision: 모든 records와 duplicate state, checked RPN results, vector/deque sort/compare, final vector construction을 local candidates에서 끝내고 clean input completion 뒤 swap합니다. reader는 EOF와 failure를 명시적으로 분류합니다.
- 해당 코드 위치: `d0295f82614b`부터 `ea23237ad506`까지의 `src/BatchEngine.cpp`, 특히 `replace()`, `resultLess()`, `readLine()`, `write()`.
- 이를 고정하는 regression/evidence: `9ba0e7c897ed`의 permutation/output tests와 `b4ddd78fb9aa`의 seeded syntax/arithmetic/stream/allocation failure tests.

## Ownership / state / responsibility 변화

- Source에서 확인되는 핵심 transition을 아래에 실제 코드 근거로 완성하세요.
- 시작 상태: configurable random-access container abstraction과 cross-container equality 도입
- Thread 종료 상태: syntax/arithmetic/stream/allocation failure 전 범위에서 seeded state rollback 검증
- [x] 중간 commit마다 owner/state publisher/cleanup 책임이 어디로 이동하거나 강화되는지 적으세요.
- [x] borrowed와 owned state가 함께 등장하면 각각의 lifetime 종료 지점을 표시하세요.

### 코드 검사로 복원한 변화

1. `708c025ef2a0`/`aaeff163baf8`: generic owner가 vector/deque substitution과 throwing element copy에서 value/assignment 보장을 제공합니다.
2. `d0295f82614b`: persistent `results_`의 publisher가 whole-input final swap 하나로 제한됩니다.
3. `42d411e42268`/`af57a8f9c5fe`: publication 전에 total-order sorting, dual representation comparison, final vector construction이 추가됩니다.
4. `9ba0e7c897ed`: canonical result가 input permutation과 repeated rendering에 독립적인지 bytes로 고정합니다.
5. `ea23237ad506`: transaction success 조건에 clean transport completion을 추가하고 final unterminated record를 보존합니다.
6. `b4ddd78fb9aa`: syntax, arithmetic, stream, allocation failure 뒤 prior vector object/address/bytes와 allocation baseline을 검사합니다.

## Thread 최종 상태

- Source가 확정한 최종 흐름: `input stream → complete record read → grammar/uniqueness → checked RPN → vector/deque candidates → total-order sort/compare → final vector publication → staged serialization`
- [x] 마지막 Thread SHA 시점에서 실제 type/function 호출 관계를 사용해 위 흐름을 다시 그리세요.
- [x] Thread 시작 시점과 비교해 새로 보장되는 invariant를 정리하세요.
- [x] source가 보장하지 않는 영역이나 외부 side effect/stream position 등 남는 경계를 실제 코드 근거로 적으세요.

### 완성된 Thread 해석

마지막 Thread SHA 기준으로 `BatchEngine::replace()`는 `readLine()`이 승인한 complete record만 parse합니다. name grammar와 duplicate를 검사하고 checked RPN 값을 vector/deque-backed local batches에 동시에 넣습니다. clean completion과 non-empty condition 뒤 두 batch를 같은 total comparator로 sort하고 range agreement를 검사한 후, vector range로 final candidate를 완성해 `results_.swap(candidate)`합니다. `write()`는 published results를 classic-locale temporary stream에서 직렬화합니다.

초기 generic container와 비교하면 generic value semantics, whole-input transaction, deterministic total order, dual-representation check, transport completion이 하나의 subsystem으로 결합되었습니다. 모든 관찰 preparation failure는 prior result object와 bytes를 보존하지만 input stream position과 destination final write는 rollback하지 않습니다.

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

- 실제 caller → callee 흐름: input stream → `readLine()` → `parseLine()`/name validation → duplicate map → `RpnEvaluator::evaluate()` → vector/deque `RandomAccessBatch::push_back()` → dual `sort(resultLess)` → `equal_ranges()` → final `std::vector` candidate → `results_.swap(candidate)` → staged `write()`.
- 핵심 상태 필드: persistent `std::vector<JobResult> results_`; local vector/deque batches, `seen` map, line/name/expression, final vector candidate.
- resource owner / borrowed view: caller owns input/output streams; engine owns published `results_`; all parsing, duplicate, RPN, dual-container and serialization candidates are call-local owners. `results()` returns a const borrowed view.
- commit point: clean non-empty input, both sorts, agreement, final vector construction을 모두 통과한 뒤의 `results_.swap(candidate)`입니다.
- cleanup path: syntax/duplicate/RPN/stream/allocation/sort/disagreement failure는 local map·batches·strings가 정리되고 prior `results_`는 그대로입니다. output staging failure는 destination write 전 정리됩니다.
- 최종 invariant 설명: published batch는 complete successful input 전체에서 나온 unique jobs이며 `(value, name)` total order로 vector/deque가 동의한 결과입니다. incomplete candidate는 publish되지 않고 repeated serialization은 input order와 caller formatting state에 독립적입니다.

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
