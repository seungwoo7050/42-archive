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

- [ ] template requirement와 vector/deque substitution을 public header와 tests에서 확인할 수 있다.
- [ ] batch replace의 candidate state, duplicate tracking, RPN result accumulation, final swap 위치를 그릴 수 있다.
- [ ] sorting/serialization이 deterministic external behavior를 만드는 근거를 실제 comparator와 staging 코드에서 확인할 수 있다.
- [ ] stream reader fix 전후에서 clean EOF/final unterminated line/failure의 분기를 비교할 수 있다.
- [ ] seeded prior state가 모든 rejection path 뒤 유지되는 regression/failure-sweep 구조를 설명할 수 있다.

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
- [ ] `RandomAccessBatch<T, Container>` public header에서 value/container template parameters와 default `std::vector`를 확인하세요.
- [ ] container의 iterator/const_iterator category를 그대로 expose하는 typedef와 begin/end API를 찾으세요.
- [ ] `at()`, insertion, range iteration, `std::sort` 기반 sort, range equality가 어떤 container capability를 요구하는지 기록하세요.
- [ ] `std::list` 같은 non-random-access container가 왜 sort instantiation 단계에서 맞지 않는지 실제 algorithm requirement와 연결하세요.
- [ ] assignment의 copy-and-swap 구현과 underlying container copy failure 시 target preservation 경로를 확인하세요.
- [ ] vector와 deque instantiation이 같은 abstraction을 통해 동작하도록 구현이 concrete representation에 의존하지 않는 지점을 찾으세요.

#### Ownership / lifecycle / state transition
- [ ] 상태 필드별 owner, lifetime, valid state를 표로 직접 정리하세요.
- [ ] throw 가능한 연산과 non-throwing commit operation의 순서를 실제 코드 라인 기준으로 적으세요.
- [ ] 성공 전 temporary/candidate state와 성공 후 published state를 구분해 그리세요.

#### Failure scenario와 보장 경계
- [ ] source가 지목한 failure를 하나 이상 실제 제어 흐름으로 따라가고, exception 직전/직후 observable state를 기록하세요.
- [ ] 이 commit이 보장하는 것과 아직 보장하지 않는 것을 source와 해당 SHA 코드에 근거해 구분하세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `aaeff163baf8`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `aaeff163baf8` — test(template): iterator·정렬·복사 실패 계약 검증

- Importance: **A**
- Tags: **TEST, GENERIC, EXCEPTION**
- Source 역할: iterator/algorithm/container substitution과 throwing-value behavior를 검증합니다.
- Source classification summary: Tests iterators, algorithms, vector/deque substitution, copying, and throwing element types.

#### 핵심 설계 / failure boundary 확인
- [ ] 필요하면 직전 관련 SHA `708c025ef2a0`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [ ] vector/deque 각각에서 mutable/const iterator와 standard algorithm을 사용하는 tests를 구분하세요.
- [ ] checked access, sorting, range equality, copy, assignment, self-assignment의 expected behavior를 확인하세요.
- [ ] throwing value type의 copy failure injection과 live-object counter가 어떻게 구성되는지 찾으세요.
- [ ] failed construction에서 partial copied values leak가 없는지, failed assignment에서 destination 보존이 되는지 각각의 assertion을 기록하세요.
- [ ] generic interface shape test와 exception guarantee test가 서로 어떤 production template instantiation을 사용하는지 구분하세요.
- [ ] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [ ] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

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
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `d0295f82614b` — feat(batch): 입력 문법과 원자 교체 구현

- Importance: **S**
- Tags: **ARCH, EXCEPTION, INTEGRATION**
- Source 역할: record parsing, duplicate detection, RPN evaluation, swap-on-success publication을 통합합니다.
- Source classification summary: Implements whole-stream batch parsing, uniqueness, RPN evaluation, and swap-on-success replacement.

#### 이 commit 직전 상태와 문제
- 직전 관련 Thread SHA `aaeff163baf8`를 먼저 checkout하여 이 commit이 추가되기 전 representation/ownership/state-publication 방식을 확인하세요.
- Source가 확정한 Problem/Decision을 실제 diff와 대응시키되, source에 없는 동기를 추가로 추정하지 마세요.

#### 해당 SHA에서 확인할 실제 코드
- [ ] 입력 record를 name과 RPN expression으로 split/trim하고 identifier grammar를 검사하는 helper chain을 찾으세요.
- [ ] duplicate-name tracking 구조와 duplicate rejection이 candidate publication보다 앞에서 일어나는지 확인하세요.
- [ ] 각 expression이 `RpnEvaluator`를 호출해 `JobResult` candidate에 추가되는 call graph를 그리세요.
- [ ] existing `results_`와 분리된 local candidate result set/map이 whole-input 처리 동안 유지되는지 확인하세요.
- [ ] empty input, malformed record, duplicate, evaluator error, stream failure 각각이 final swap에 도달하지 않는 branch를 기록하세요.
- [ ] complete input 성공 뒤 candidate vector가 `results_`와 swap되는 단 하나의 publication point를 표시하세요.

#### Ownership / lifecycle / state transition
- [ ] 상태 필드별 owner, lifetime, valid state를 표로 직접 정리하세요.
- [ ] throw 가능한 연산과 non-throwing commit operation의 순서를 실제 코드 라인 기준으로 적으세요.
- [ ] 성공 전 temporary/candidate state와 성공 후 published state를 구분해 그리세요.

#### Failure scenario와 보장 경계
- [ ] source가 지목한 failure를 하나 이상 실제 제어 흐름으로 따라가고, exception 직전/직후 observable state를 기록하세요.
- [ ] 이 commit이 보장하는 것과 아직 보장하지 않는 것을 source와 해당 SHA 코드에 근거해 구분하세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `42d411e42268`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `42d411e42268` — feat(batch): 결과 정렬과 직렬화 제공

- Importance: **A**
- Tags: **DETERMINISM, EXCEPTION, CORE**
- Source 역할: total result order와 classic-locale staged serialization을 추가합니다.
- Source classification summary: Adds total result ordering and classic-locale staged batch serialization.

#### 핵심 설계 / failure boundary 확인
- [ ] 필요하면 직전 관련 SHA `d0295f82614b`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [ ] result comparator가 value를 먼저, name을 tie-breaker로 비교해 total order를 만드는 실제 코드를 확인하세요.
- [ ] sorting이 published `results_`가 아니라 candidate에서 일어나도록 state mutation 순서를 추적하세요.
- [ ] serialization이 classic-locale temporary stream에서 완성된 bytes를 만든 뒤 destination으로 쓰는 staging을 확인하세요.
- [ ] caller stream locale/flags를 덮어쓰지 않는지 implementation과 tests를 함께 확인하세요.
- [ ] formatting stage의 failure는 partial record sequence를 publish하지 않지만 final destination write failure는 rollback 대상이 아님을 실제 code boundary로 기록하세요.
- [ ] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [ ] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `af57a8f9c5fe`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `af57a8f9c5fe` — feat(batch): 두 container의 정렬 결과 대조

- Importance: **A**
- Tags: **GENERIC, INTEGRATION, DETERMINISM**
- Source 역할: vector/deque candidates를 독립적으로 sort하고 disagreement를 commit 전에 거부합니다.
- Source classification summary: Runs and sorts vector- and deque-backed batches, then rejects disagreement before commit.

#### 핵심 설계 / failure boundary 확인
- [ ] 필요하면 직전 관련 SHA `42d411e42268`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [ ] accepted job이 vector-backed와 deque-backed `RandomAccessBatch` candidate 양쪽에 어떻게 추가되는지 추적하세요.
- [ ] 두 candidate가 동일 comparator로 독립 sort되는 호출을 확인하세요.
- [ ] `equal_ranges()` 또는 대응 비교가 disagreement를 detect하는 위치와 `logic_error` 발생 전 publication 상태를 확인하세요.
- [ ] 불일치 시 prior engine state가 유지되는 이유를 candidate lifetime과 final commit 순서로 설명하세요.
- [ ] 추가 memory/sort work가 deliberate verification이라는 사실이 코드 구조에서 어떻게 드러나는지 기록하세요.
- [ ] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [ ] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `9ba0e7c897ed`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `9ba0e7c897ed` — test(batch): 입력 순열과 출력 결정성 검증

- Importance: **A**
- Tags: **TEST, DETERMINISM, EDGE**
- Source 역할: input permutation invariance와 byte-identical repeated output을 검증합니다.
- Source classification summary: Verifies input-permutation invariance, tie ordering, single-element behavior, and repeatable output.

#### 핵심 설계 / failure boundary 확인
- [ ] 필요하면 직전 관련 SHA `af57a8f9c5fe`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [ ] 동일 job set의 여러 insertion permutation을 만드는 fixtures와 expected canonical order를 확인하세요.
- [ ] equal-valued jobs에서 name tie-breaker가 빠졌을 때 잡힐 수 있는 test case를 찾으세요.
- [ ] vector/deque batch ranges가 동일함을 확인하는 assertion을 기록하세요.
- [ ] 동일 engine state를 여러 번 serialize해 byte-identical output을 비교하는 deterministic regression을 확인하세요.
- [ ] 이 테스트가 단순 sortedness가 아니라 permutation invariance까지 증명하도록 입력 구성이 어떻게 설계되었는지 적으세요.
- [ ] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [ ] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

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
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

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
- [ ] 필요하면 직전 관련 SHA `9ba0e7c897ed`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [ ] 직전 batch reader의 일반 `getline` loop와 이 SHA의 record-reader helper를 관련 code로 비교하세요.
- [ ] reader가 complete line, final unterminated line + clean EOF, actual failure의 세 outcome을 어떤 stream flags로 구분하는지 확인하세요.
- [ ] trailing newline이 없는 마지막 record가 candidate에 포함되는 path를 추적하세요.
- [ ] `badbit` 또는 non-EOF failure가 transaction rejection으로 이어지고 final swap을 막는 branch를 확인하세요.
- [ ] fix가 syntax/arithmetic transaction에 transport-state success condition을 추가한 것임을 state publication 위치와 연결하세요.
- [ ] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [ ] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `b4ddd78fb9aa`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `b4ddd78fb9aa` — test(batch): 입력·산술·할당 실패 뒤 상태 복원 검증

- Importance: **A**
- Tags: **TEST, EXCEPTION, RISK**
- Source 역할: syntax/arithmetic/stream/allocation failure 전 범위에서 seeded state preservation을 검증합니다.
- Source classification summary: Sweeps malformed input, arithmetic, stream, and allocation failures after seeding engine state.

#### 핵심 설계 / failure boundary 확인
- [ ] 필요하면 직전 관련 SHA `ea23237ad506`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [ ] known result로 engine을 seed하는 setup과 prior serialized bytes baseline을 확인하세요.
- [ ] malformed input, RPN arithmetic failure, stream failure를 각각 주입하는 test cases와 production failure path를 매핑하세요.
- [ ] observed allocation failure point sweep이 parsing, duplicate tracking, evaluator stack, two candidates, sort/compare 중 어디를 통과하는지 기록하세요.
- [ ] 모든 rejection 후 result objects와 serialized bytes가 seed와 동일하고 live allocation baseline이 복구되는 assertions을 확인하세요.
- [ ] CLI failure cases에서 stdout이 비어 있음을 검사해 object-state atomicity가 process-output atomicity로 연결되는 지점을 확인하세요.
- [ ] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [ ] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### Test commit 학습 구분
- 대상 production invariant: source가 확정한 방향은 **BatchEngine whole-input strong transaction**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 재현 failure / boundary: source가 확정한 방향은 **syntax, arithmetic, stream, allocation failures**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- test technique: source가 확정한 방향은 **seeded-state failure sweep + live-block accounting + CLI failure fixtures**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 통과하는 production path: source가 확정한 방향은 **parsing, duplicate set, RPN, two candidates, sort/compare, final publication**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하는 것: source가 확정한 방향은 **협력 layer failure 뒤 state/bytes/baseline rollback**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하지 않는 것: source가 확정한 방향은 **외부 stream position 자체를 되돌리는 보장은 아님**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 성격: source가 확정한 방향은 **deterministic failure-injection + integration**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

## Invariant ledger

| SHA | Source에서 확정된 invariant 변화 | 해당 SHA에서 직접 확인한 코드 근거 | 아직 남은 위험/미보장 |
| --- | --- | --- | --- | --- |
| `708c025ef2a0` | configurable random-access container abstraction과 cross-container equality 도입 |  |  |
| `aaeff163baf8` | iterator/algorithm/substitution과 throwing-value failure 계약 검증 |  |  |
| `d0295f82614b` | whole-input candidate와 swap-on-success publication으로 batch transaction 확립 |  |  |
| `42d411e42268` | `(value, name)` total order와 classic-locale staged serialization 추가 |  |  |
| `af57a8f9c5fe` | vector/deque를 독립 sort하고 disagreement를 commit 전 거부 |  |  |
| `9ba0e7c897ed` | input permutation independence와 repeated byte determinism 검증 |  |  |
| `ea23237ad506` | record reader가 clean EOF/final unterminated line/input failure를 분리하도록 수정 |  |  |
| `b4ddd78fb9aa` | syntax/arithmetic/stream/allocation failure 전 범위에서 seeded state rollback 검증 |  |  |

## Failure → Fix → Test 연결

- `d0295f82614b`: whole-input candidate와 swap-on-success transaction을 도입합니다.
- `ea23237ad506` fix: successful input completion의 정의를 clean EOF/final unterminated line/actual failure로 정교화합니다.
- `b4ddd78fb9aa`: syntax/arithmetic/stream/allocation failure 뒤 seeded state rollback을 폭넓게 검증합니다.

### 학습자 연결 기록
- 최초 위험/맹점:
- 이를 드러낸 실제 failure 또는 test gap:
- 수정/강화된 decision:
- 해당 코드 위치:
- 이를 고정하는 regression/evidence:

## Ownership / state / responsibility 변화

- Source에서 확인되는 핵심 transition을 아래에 실제 코드 근거로 완성하세요.
- 시작 상태: configurable random-access container abstraction과 cross-container equality 도입
- Thread 종료 상태: syntax/arithmetic/stream/allocation failure 전 범위에서 seeded state rollback 검증
- [ ] 중간 commit마다 owner/state publisher/cleanup 책임이 어디로 이동하거나 강화되는지 적으세요.
- [ ] borrowed와 owned state가 함께 등장하면 각각의 lifetime 종료 지점을 표시하세요.

## Thread 최종 상태

- Source가 확정한 최종 흐름: `input stream → complete record read → grammar/uniqueness → checked RPN → vector/deque candidates → total-order sort/compare → final vector publication → staged serialization`
- [ ] 마지막 Thread SHA 시점에서 실제 type/function 호출 관계를 사용해 위 흐름을 다시 그리세요.
- [ ] Thread 시작 시점과 비교해 새로 보장되는 invariant를 정리하세요.
- [ ] source가 보장하지 않는 영역이나 외부 side effect/stream position 등 남는 경계를 실제 코드 근거로 적으세요.

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

- 실제 caller → callee 흐름:
- 핵심 상태 필드:
- resource owner / borrowed view:
- commit point:
- cleanup path:
- 최종 invariant 설명:

## 학습 완료 자가 점검

- [ ] Commit map의 SHA/순서를 그대로 따라 모든 관련 code tree를 확인했습니다.
- [ ] final HEAD를 과거 commit 설명에 소급해서 사용하지 않았습니다.
- [ ] S/A/B importance에 맞는 깊이로 code/test evidence를 채웠습니다.
- [ ] source가 확정한 invariant와 제가 실제 코드에서 확인한 증거를 구분했습니다.
- [ ] failure path에서 state mutation 전후와 cleanup owner를 설명할 수 있습니다.
- [ ] test commit마다 production invariant, technique, production path, 증명/비증명 범위를 구분했습니다.
- [ ] Thread 마지막 상태를 commit history에 근거해 처음부터 끝까지 설명할 수 있습니다.
