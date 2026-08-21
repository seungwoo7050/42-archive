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

- [ ] prototype, clone, pipeline slot 각각의 owner와 lifetime을 commit별로 그릴 수 있다.
- [ ] pipeline copy constructor의 partial-construction cleanup과 assignment의 copy-and-swap을 구분해 설명할 수 있다.
- [ ] abstractness, virtual destruction, clone ownership이 각각 어떤 test/compile contract로 고정되는지 찾을 수 있다.
- [ ] clone failure sweep에서 source와 destination이 각각 어떤 상태로 남는지 실제 테스트를 근거로 설명할 수 있다.

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
- [ ] `Formatter` 선언에서 abstractness를 만드는 pure virtual functions, virtual destructor, `clone()`, `apply()`, name contract를 확인하세요.
- [ ] 각 concrete formatter가 `clone()`에서 dynamic type을 보존한 독립 heap object를 만드는 실제 코드를 찾으세요.
- [ ] prefix/suffix formatter가 자신의 `TextBuffer` configuration을 소유하는 상태와 copy semantics를 확인하세요.
- [ ] uppercase 구현에서 `std::toupper` 호출 전에 plain `char`를 `unsigned char`로 변환하는 경로를 확인하세요.
- [ ] caller가 derived type을 몰라도 `Formatter&`/pointer를 통해 동작·복제·삭제할 수 있는 call graph를 그리세요.

#### Ownership / lifecycle / state transition
- [ ] 상태 필드별 owner, lifetime, valid state를 표로 직접 정리하세요.
- [ ] throw 가능한 연산과 non-throwing commit operation의 순서를 실제 코드 라인 기준으로 적으세요.
- [ ] 성공 전 temporary/candidate state와 성공 후 published state를 구분해 그리세요.

#### Failure scenario와 보장 경계
- [ ] source가 지목한 failure를 하나 이상 실제 제어 흐름으로 따라가고, exception 직전/직후 observable state를 기록하세요.
- [ ] 이 commit이 보장하는 것과 아직 보장하지 않는 것을 source와 해당 SHA 코드에 근거해 구분하세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `62ed45f8adf9`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `62ed45f8adf9` — feat(format): formatter 소유 pipeline 구현

- Importance: **S**
- Tags: **ARCH, POLYMORPHISM, OWNERSHIP**
- Source 역할: pipeline이 formatter lifetime을 빌리지 않고 clone을 직접 소유하게 합니다.
- Source classification summary: Introduces a bounded pipeline that owns formatter clones and applies them in order.

#### 이 commit 직전 상태와 문제
- 직전 관련 Thread SHA `835d87865762`를 먼저 checkout하여 이 commit이 추가되기 전 representation/ownership/state-publication 방식을 확인하세요.
- Source가 확정한 Problem/Decision을 실제 diff와 대응시키되, source에 없는 동기를 추가로 추정하지 마세요.

#### 해당 SHA에서 확인할 실제 코드
- [ ] `FormatPipeline`의 fixed pointer array, size, capacity 표현을 찾아 null/valid prefix 상태를 기록하세요.
- [ ] `append()`에서 capacity check → `clone()` → slot store → size increment의 순서를 실제 코드로 확인하세요.
- [ ] 입력 formatter reference는 borrowed이고 clone은 pipeline-owned가 되는 ownership 전환 시점을 표시하세요.
- [ ] destructor가 성공적으로 저장된 clone만 정확히 한 번 `delete`하는 범위를 확인하세요.
- [ ] `apply()`가 input copy를 만들고 insertion order대로 step을 fold하는 경로와 empty-pipeline identity를 확인하세요.
- [ ] 이 SHA에서 pipeline copy가 여전히 금지되어 있는 public/private declaration을 확인하세요.

#### Ownership / lifecycle / state transition
- [ ] 상태 필드별 owner, lifetime, valid state를 표로 직접 정리하세요.
- [ ] throw 가능한 연산과 non-throwing commit operation의 순서를 실제 코드 라인 기준으로 적으세요.
- [ ] 성공 전 temporary/candidate state와 성공 후 published state를 구분해 그리세요.

#### Failure scenario와 보장 경계
- [ ] source가 지목한 failure를 하나 이상 실제 제어 흐름으로 따라가고, exception 직전/직후 observable state를 기록하세요.
- [ ] 이 commit이 보장하는 것과 아직 보장하지 않는 것을 source와 해당 SHA 코드에 근거해 구분하세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `bf4d9bed705c`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `bf4d9bed705c` — feat(format): pipeline 깊은 복사 구현

- Importance: **S**
- Tags: **OWNERSHIP, EXCEPTION, POLYMORPHISM**
- Source 역할: heterogeneous owner를 deep-copy하고 partial construction을 정리합니다.
- Source classification summary: Implements deep pipeline copying, partial-construction cleanup, and copy-and-swap assignment.

#### 이 commit 직전 상태와 문제
- 직전 관련 Thread SHA `62ed45f8adf9`를 먼저 checkout하여 이 commit이 추가되기 전 representation/ownership/state-publication 방식을 확인하세요.
- Source가 확정한 Problem/Decision을 실제 diff와 대응시키되, source에 없는 동기를 추가로 추정하지 마세요.

#### 해당 SHA에서 확인할 실제 코드
- [ ] 직전 관련 SHA `62ed45f8adf9`와 비교해 copy constructor와 assignment가 어떻게 열리는지 확인하세요.
- [ ] copy constructor 시작 시 pointer array 전체를 null-initialize하는 순서를 찾고, clone 성공 prefix의 representation을 기록하세요.
- [ ] 중간 `clone()` 실패 시 catch block이 이미 생성된 prefix를 직접 delete하고 rethrow하는 코드를 추적하세요.
- [ ] constructor가 완료되지 않으면 destructor가 호출되지 않는다는 사실이 왜 이 explicit cleanup을 필요로 하는지 실제 경로에 연결하세요.
- [ ] assignment의 complete-copy → swap → old-state destruction 흐름과 destination preservation을 확인하세요.
- [ ] dynamic formatter type과 insertion order가 copy 후 유지되는지 clone/apply 경로로 확인하세요.

#### Ownership / lifecycle / state transition
- [ ] 상태 필드별 owner, lifetime, valid state를 표로 직접 정리하세요.
- [ ] throw 가능한 연산과 non-throwing commit operation의 순서를 실제 코드 라인 기준으로 적으세요.
- [ ] 성공 전 temporary/candidate state와 성공 후 published state를 구분해 그리세요.

#### Failure scenario와 보장 경계
- [ ] source가 지목한 failure를 하나 이상 실제 제어 흐름으로 따라가고, exception 직전/직후 observable state를 기록하세요.
- [ ] 이 commit이 보장하는 것과 아직 보장하지 않는 것을 source와 해당 SHA 코드에 근거해 구분하세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `0427713637b8`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `0427713637b8` — test(format): 가상 소멸·추상 계약·CLI 검증

- Importance: **A**
- Tags: **API, TEST, POLYMORPHISM**
- Source 역할: abstractness, virtual destruction, clone ownership, headers, CLI를 검증합니다.
- Source classification summary: Adds abstractness, virtual-destruction, public-header, ownership-counter, and CLI checks.

#### 핵심 설계 / failure boundary 확인
- [ ] 필요하면 직전 관련 SHA `bf4d9bed705c`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [ ] counted test formatter의 live/destroyed counters가 clone ownership과 base-pointer deletion을 어떻게 관찰하는지 확인하세요.
- [ ] abstract `Formatter`를 직접 instantiate하려는 compile-fail case와 기대 실패 조건을 찾으세요.
- [ ] public header repeated inclusion/consumer-visible use를 검사하는 positive compile case를 확인하세요.
- [ ] pipeline CLI integration fixture가 실제 binary에서 virtual dispatch, archive linkage, step order를 어떤 transcript로 검증하는지 기록하세요.
- [ ] 이 test bundle이 output correctness와 별개로 non-virtual destruction/accidental concreteness/ownership leak를 각각 어떻게 겨냥하는지 분리하세요.
- [ ] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [ ] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

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
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `2c99290b9268` — test(format): 복제 실패 뒤 부분 객체 정리 검증

- Importance: **A**
- Tags: **TEST, EXCEPTION, POLYMORPHISM**
- Source 역할: copy construction/assignment의 clone failure를 전 위치에서 sweep합니다.
- Source classification summary: Sweeps clone failures during pipeline copy construction and assignment.

#### 핵심 설계 / failure boundary 확인
- [ ] 필요하면 직전 관련 SHA `0427713637b8`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [ ] copy construction과 assignment 각각에서 clone 실패를 formatter position별로 주입하는 test control을 찾으세요.
- [ ] failed constructor 뒤 이미 생성된 clones가 모두 사라지는지 live-object counter assertions을 확인하세요.
- [ ] failed assignment 뒤 destination의 기존 step sequence와 behavior가 유지되는 assertion을 확인하세요.
- [ ] source pipeline이 failure sweep 전후 동일하게 살아 있는지 확인하는 증거를 기록하세요.
- [ ] production code에서 constructor catch cleanup과 assignment copy-and-swap 두 경로 중 어느 것을 각 test case가 통과하는지 매핑하세요.
- [ ] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [ ] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### Test commit 학습 구분
- 대상 production invariant: source가 확정한 방향은 **partial polymorphic copy cleanup과 strong assignment guarantee**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 재현 failure / boundary: source가 확정한 방향은 **clone failure at each formatter position**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- test technique: source가 확정한 방향은 **deterministic clone-failure sweep + live-object counters**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 통과하는 production path: source가 확정한 방향은 **FormatPipeline copy constructor catch cleanup / assignment copy-and-swap**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하는 것: source가 확정한 방향은 **failed construction leak freedom과 failed assignment target preservation**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하지 않는 것: source가 확정한 방향은 **factory creation failure나 다른 subsystem allocation failure는 범위 밖**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 성격: source가 확정한 방향은 **deterministic regression / failure-injection**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.

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
| `835d87865762` | virtual destructor와 `clone()`으로 polymorphic copy/deletion protocol 정의 |  |  |
| `62ed45f8adf9` | pipeline이 borrowed formatter가 아니라 clone을 소유하도록 ownership boundary 확립 |  |  |
| `bf4d9bed705c` | heterogeneous deep copy와 failed-constructor cleanup, copy-and-swap assignment 확립 |  |  |
| `0427713637b8` | abstractness/virtual destruction/public contract/process integration 증거 추가 |  |  |
| `2c99290b9268` | 모든 formatter 위치의 clone failure에서 partial cleanup과 target preservation 검증 |  |  |

## Failure → Fix → Test 연결

- `bf4d9bed705c`: clone 실패 중 incomplete copy constructor가 destructor에 의존할 수 없는 문제를 explicit cleanup으로 해결합니다.
- `0427713637b8`: virtual destruction/abstractness/clone ownership의 broader contract evidence를 추가합니다.
- `2c99290b9268`: clone failure를 formatter position별로 sweep하며 constructor cleanup과 assignment transaction을 직접 검증합니다.

### 학습자 연결 기록
- 최초 위험/맹점:
- 이를 드러낸 실제 failure 또는 test gap:
- 수정/강화된 decision:
- 해당 코드 위치:
- 이를 고정하는 regression/evidence:

## Ownership / state / responsibility 변화

- Source에서 확인되는 핵심 transition을 아래에 실제 코드 근거로 완성하세요.
- 시작 상태: virtual destructor와 `clone()`으로 polymorphic copy/deletion protocol 정의
- Thread 종료 상태: 모든 formatter 위치의 clone failure에서 partial cleanup과 target preservation 검증
- [ ] 중간 commit마다 owner/state publisher/cleanup 책임이 어디로 이동하거나 강화되는지 적으세요.
- [ ] borrowed와 owned state가 함께 등장하면 각각의 lifetime 종료 지점을 표시하세요.

## Thread 최종 상태

- Source가 확정한 최종 흐름: `borrowed formatter prototype → virtual clone → owned pipeline slot → deep-copied aggregate → failure cleanup verification`
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
