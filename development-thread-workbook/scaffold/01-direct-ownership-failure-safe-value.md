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

- [ ] 각 단계에서 포인터, 크기, NUL 종료 문자의 관계를 실제 코드로 설명할 수 있다.
- [ ] 복사 생성과 대입에서 source/target allocation이 독립적임을 해당 SHA 코드와 테스트로 증명할 수 있다.
- [ ] 할당 실패 시 target 상태와 live-allocation baseline이 유지되는 경로를 추적할 수 있다.
- [ ] copy elision이 없어도 반환값과 copy-and-swap이 안전한 이유를 실제 호출 흐름으로 설명할 수 있다.

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
- [ ] 해당 SHA에서 `TextBuffer`의 data pointer와 size를 저장하는 상태 필드를 찾고, default/null-input construction이 동일한 empty representation을 만드는 초기화 순서를 기록하세요.
- [ ] `size() + 1` allocation과 마지막 NUL byte를 만드는 constructor/destructor 경로를 함께 추적하세요.
- [ ] const/mutable `at()`가 terminator 위치를 logical range에서 제외하는 branch와 `c_str()` 반환의 borrowed-lifetime 조건을 확인하세요.
- [ ] `swap()`이 pointer와 size를 함께 교환하며 throw하지 않도록 구성된 실제 코드를 찾으세요.
- [ ] 이 SHA에서 copy가 어떻게 금지되는지 public interface에서 확인하고, 왜 아직 regular value가 아닌지 기록하세요.
- [ ] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [ ] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `0bc528c7d58e`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `0bc528c7d58e` — feat(buffer): 깊은 복사와 정규 대입 구현

- Importance: **S**
- Tags: **OWNERSHIP, EXCEPTION, CORE**
- Source 역할: 독립 deep copy와 copy-and-swap assignment를 추가합니다.
- Source classification summary: Adds deep copying and copy-and-swap assignment to `TextBuffer`.

#### 이 commit 직전 상태와 문제
- 직전 관련 Thread SHA `aa3b5ba6c3c4`를 먼저 checkout하여 이 commit이 추가되기 전 representation/ownership/state-publication 방식을 확인하세요.
- Source가 확정한 Problem/Decision을 실제 diff와 대응시키되, source에 없는 동기를 추가로 추정하지 마세요.

#### 해당 SHA에서 확인할 실제 코드
- [ ] 직전 관련 SHA `aa3b5ba6c3c4`와 비교해 copy constructor/assignment 선언이 public contract에 어떻게 추가되는지 확인하세요.
- [ ] copy constructor가 source와 별도 `size + 1` allocation을 만들고 terminator까지 복사하는 코드를 추적하세요.
- [ ] assignment에서 temporary construction → non-throwing `swap()` → temporary destruction 순서를 실제 코드 라인으로 기록하세요.
- [ ] allocation이 temporary construction 중 실패할 때 target state가 아직 변경되지 않았음을 제어 흐름으로 증명하세요.
- [ ] alias를 통한 self-assignment가 별도 `this == &other` branch 없이도 안전한 이유를 객체 lifetime과 allocation 기준으로 설명하세요.

#### Ownership / lifecycle / state transition
- [ ] 상태 필드별 owner, lifetime, valid state를 표로 직접 정리하세요.
- [ ] throw 가능한 연산과 non-throwing commit operation의 순서를 실제 코드 라인 기준으로 적으세요.
- [ ] 성공 전 temporary/candidate state와 성공 후 published state를 구분해 그리세요.

#### Failure scenario와 보장 경계
- [ ] source가 지목한 failure를 하나 이상 실제 제어 흐름으로 따라가고, exception 직전/직후 observable state를 기록하세요.
- [ ] 이 commit이 보장하는 것과 아직 보장하지 않는 것을 source와 해당 SHA 코드에 근거해 구분하세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `93faed0d67a2`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `93faed0d67a2` — feat(buffer): 결합·비교·출력 연산 제공

- Importance: **A**
- Tags: **OWNERSHIP, EXCEPTION, CORE**
- Source 역할: self-safe, allocate-before-commit composition으로 direct owner를 확장합니다.
- Source classification summary: Adds concatenation, comparison, and stream operations with overflow and allocate-before-commit handling.

#### 핵심 설계 / failure boundary 확인
- [ ] 필요하면 직전 관련 SHA `0bc528c7d58e`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [ ] `operator+=`에서 `size + other.size + 1` overflow를 실제 allocation 전에 검사하는 식과 branch를 확인하세요.
- [ ] joined storage를 완성한 뒤 old storage를 release하는 정확한 순서를 추적하고, 실패 시 old value가 남는 지점을 표시하세요.
- [ ] self-concatenation에서 `other`가 `*this`와 alias여도 source bytes가 release 전에 모두 사용되는지 코드 순서로 확인하세요.
- [ ] non-member `operator+`가 copy + compound addition을 재사용하는 caller/callee 관계를 기록하세요.
- [ ] 비교 및 stream insertion이 allocation representation을 노출하지 않고 value semantics만 제공하는지 public API를 확인하세요.
- [ ] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [ ] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `47134f9e3b29`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `47134f9e3b29` — test(buffer): 할당 실패와 복사 생략 비활성화 검증

- Importance: **A**
- Tags: **TEST, EXCEPTION, OWNERSHIP**
- Source 역할: 관찰된 모든 allocation failure를 주입하고 copy elision을 비활성화해 검증합니다.
- Source classification summary: Adds deterministic allocation-failure injection and no-elide builds for buffer operations.

#### 핵심 설계 / failure boundary 확인
- [ ] 필요하면 직전 관련 SHA `93faed0d67a2`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [ ] test executable에서 global allocation 함수가 counted `malloc`-backed implementation으로 교체되는 지점을 찾으세요.
- [ ] construction, copy construction, assignment, aliased self-assignment, `+`, `+=` 각각에서 관찰된 allocation site를 어떻게 순회해 failure를 주입하는지 기록하세요.
- [ ] 각 실패 후 object state와 live-allocation baseline을 어떤 assertion으로 확인하는지 구분하세요.
- [ ] copy elision을 비활성화한 별도 build target/flags와 실행 test가 무엇인지 확인하세요.
- [ ] 이 테스트가 production code의 어떤 allocation/copy path를 통과하며, 일반 unit test가 놓치던 temporary lifetime을 무엇으로 드러내는지 적으세요.
- [ ] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [ ] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### Test commit 학습 구분
- 대상 production invariant: source가 확정한 방향은 **TextBuffer의 strong exception guarantee와 leak freedom**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 재현 failure / boundary: source가 확정한 방향은 **allocation 실패 및 copy-elision 부재**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- test technique: source가 확정한 방향은 **deterministic allocation-failure sweep + no-elide build**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 통과하는 production path: source가 확정한 방향은 **construction/copy/assignment/addition/compound-addition allocation paths**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하는 것: source가 확정한 방향은 **strong guarantee와 leak baseline이 관찰된 allocation sites에서 유지됨**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하지 않는 것: source가 확정한 방향은 **관찰되지 않은 실행 경로나 다른 allocator 환경까지 자동으로 증명하지는 않음**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
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
| `aa3b5ba6c3c4` | non-null `char[]` ownership과 NUL 종료 표현, non-throwing `swap()` 도입 |  |  |
| `0bc528c7d58e` | 독립 deep copy와 copy-and-swap 대입으로 regular value/strong assignment guarantee 확립 |  |  |
| `93faed0d67a2` | allocate-before-commit 결합과 self-concatenation 안전성으로 패턴 확장 |  |  |
| `47134f9e3b29` | 모든 관찰 allocation failure와 no-elide 조건에서 보장 검증 |  |  |

## Failure → Fix → Test 연결

- `0bc528c7d58e`: deep copy + copy-and-swap으로 assignment failure 시 target 보존을 설계합니다.
- `93faed0d67a2`: allocate-before-commit으로 composition까지 동일한 failure discipline을 확장합니다.
- `47134f9e3b29`: allocation failure sweep과 no-elide build로 이 보장을 검증합니다.

### 학습자 연결 기록
- 최초 위험/맹점:
- 이를 드러낸 실제 failure 또는 test gap:
- 수정/강화된 decision:
- 해당 코드 위치:
- 이를 고정하는 regression/evidence:

## Ownership / state / responsibility 변화

- Source에서 확인되는 핵심 transition을 아래에 실제 코드 근거로 완성하세요.
- 시작 상태: non-null `char[]` ownership과 NUL 종료 표현, non-throwing `swap()` 도입
- Thread 종료 상태: 모든 관찰 allocation failure와 no-elide 조건에서 보장 검증
- [ ] 중간 commit마다 owner/state publisher/cleanup 책임이 어디로 이동하거나 강화되는지 적으세요.
- [ ] borrowed와 owned state가 함께 등장하면 각각의 lifetime 종료 지점을 표시하세요.

## Thread 최종 상태

- Source가 확정한 최종 흐름: `construction → owned representation → deep copy / assignment → composition → injected-failure verification`
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
