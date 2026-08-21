# ContactBook Replacement Gains the Guarantee Used Elsewhere

## Thread 목표

고정 크기 ring buffer도 내부 `Contact` 대입이 allocation을 일으킬 수 있으므로 slot content와 ring metadata를 하나의 transaction으로 다뤄야 함을 확인하고, 뒤늦은 strong-guarantee 수정과 회귀 검증을 복원합니다.

**Source significance:** 작은 fixed array도 value assignment가 allocation할 수 있으면 strong guarantee가 필요함을 보여줍니다. slot content, `next_`, `size_`를 하나의 logical transaction으로 다루도록 초기 subsystem을 candidate-and-swap discipline에 맞춥니다.

## 이 Thread를 이해하기 위한 핵심 질문

- logical oldest-to-newest order와 physical slot index는 어떻게 분리되는가?
- full-capacity replacement에서 direct `Contact` assignment가 왜 부분 상태 변경 위험을 만드는가?
- detached replacement를 먼저 완성한 뒤 slot에 swap하는 순서가 어떤 invariant를 보존하는가?
- `next_`와 `size_`는 왜 slot commit 이후에만 변경되어야 하는가?
- failure sweep이 logical order와 allocation baseline까지 확인하는 이유는 무엇인가?

## 완료 기준

- [x] 초기 ring representation과 logical index 변환을 해당 SHA에서 설명할 수 있다.
- [x] 초기 direct assignment path와 fix의 detached-candidate path를 관련 SHA끼리 비교할 수 있다.
- [x] slot content, `next_`, `size_`의 coupled invariant를 실패 시나리오로 설명할 수 있다.
- [x] full-capacity failure regression이 실제 이전 취약 경로를 어떻게 재현하는지 확인할 수 있다.

## Source에 연결된 invariant / engineering difficulty

### Critical invariant

- 완성되지 않은 contact replacement candidate는 stored slot에 publish되지 않는다.
- strong guarantee replacement는 allocation 실패 시 slot content와 ring metadata의 observable state를 보존한다.
- 직접 소유 값의 실패가 logical order/cursor publication과 분리되어야 한다.

### Major engineering difficulty

- allocation 가능한 value assignment가 있는 fixed array에서 partial mutation 방지.
- allocation failure sweep과 logical-order/live-block accounting으로 ring transaction 검증.

위 항목은 source가 확정한 범위입니다. 실제 코드에서 어떻게 구현되는지는 아래 학습 기록에서 직접 확인합니다.

## Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `2f9b934b0825` | feat(contact): 고정 크기 연락처 저장 순서 보존 | B | CORE | selected ring slot을 ordinary `Contact` assignment로 교체하는 초기 구현입니다. |
| 2 | `0ad14a57cab6` | fix(contact): 할당 실패에도 저장 상태 보존 | A | DEBUG, EXCEPTION, OWNERSHIP | detached replacement를 준비해 swap한 뒤 ring metadata를 advance합니다. |
| 3 | `8930c4d17bc1` | test(contact): 연락처 교체 실패 회귀 검증 | A | TEST, EXCEPTION, EDGE | full-capacity allocation failure를 sweep하며 order/value/leak baseline을 검증합니다. |

## Commit별 학습 기록

### `2f9b934b0825` — feat(contact): 고정 크기 연락처 저장 순서 보존

- Importance: **B**
- Tags: **CORE**
- Source 역할: selected ring slot을 ordinary `Contact` assignment로 교체하는 초기 구현입니다.
- Source classification summary: Adds an eight-slot circular `ContactBook` with logical oldest-to-newest indexing.

#### Thread 흐름에서 확인할 구현 역할
- [x] `ContactBook`의 8-slot backing array, logical size, next insertion cursor를 찾으세요.
- [x] valid/empty contact insertion policy와 capacity 도달 후 replacement slot 선택을 확인하세요.
- [x] `at()`가 logical oldest-to-newest index를 physical array index로 변환하는 식과 out-of-range branch를 기록하세요.
- [x] full-capacity replacement에서 selected slot에 ordinary `Contact` assignment를 수행하는 코드를 찾으세요.
- [x] 이 assignment가 allocation failure 시 slot/metadata transaction을 완전히 격리하지 못한다는 source 설명을 코드상 mutation 순서와 함께 기록하세요.
- [x] 이 commit이 다음 관련 commit의 전제가 되는 상태/계약을 한 문단으로 기록하세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `0ad14a57cab6`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼: `include/cppf/ContactBook.hpp`의 `capacity`, `contacts_`, `size_`, `next_`, `add()`, `at()`; `src/ContactBook.cpp`의 insertion/replacement와 logical-index 계산.
- 핵심 코드 발췌 위치: `2f9b934b0825:src/ContactBook.cpp`에서 non-empty contact는 `contacts_[next_] = contact`로 selected slot에 직접 대입되고, 이후 `next_ = (next_ + 1) % capacity`, `size_` 증가가 실행됩니다. `at()`는 full이면 `first = next_`, 아니면 0을 사용합니다.
- 변경 전/후 차이: 최대 8개 contact를 저장하고 capacity 이후 oldest physical slot을 덮는 circular representation이 추가되었습니다. logical observation은 physical 배열 순서와 분리되어 oldest-to-newest로 제공됩니다.
- 직접 확인한 ownership/lifetime/state 관계: `ContactBook`이 fixed array의 각 `Contact` 값을 소유합니다. `next_`는 다음 insertion physical slot이고 `size_`는 유효 logical count입니다. `at()`가 반환하는 `const Contact&`는 book lifetime과 후속 replacement에 종속된 borrowed reference입니다.
- 직접 확인한 failure path: empty contact는 아무 변경 없이 반환하고 out-of-range logical index는 예외입니다. full book에서 ordinary `Contact::operator=`가 여러 owned string을 복사하다 실패하면 committed slot 내부가 부분 변경될 수 있으므로, 뒤의 metadata가 아직 안 바뀌어도 slot/content/order transaction은 보장되지 않습니다.
- 실행한 테스트와 결과: 미실행. 지정 SHA의 ring representation과 mutation 순서를 검사했으며 command는 수행하지 않았습니다.
- 이 commit을 한 문장으로 설명: logical order를 보존하는 8-slot ring을 만들었지만 replacement는 throwing direct assignment에 의존했습니다.

### `0ad14a57cab6` — fix(contact): 할당 실패에도 저장 상태 보존

- Importance: **A**
- Tags: **DEBUG, EXCEPTION, OWNERSHIP**
- Source 역할: detached replacement를 준비해 swap한 뒤 ring metadata를 advance합니다.
- Source classification summary: Copies a contact into a detached candidate before swapping and advancing the ring.

#### Failure → Fix → Test chain
- **기존 가정:** fixed array slot에 `Contact`를 대입하고 ring metadata를 갱신하는 정상 경로면 충분했다.
- **실제 failure / 위험:** `Contact` string copy allocation이 throw하면 stored slot과 logical cursor/size의 conceptual transaction이 깨질 수 있었다.
- **root cause:** throwing value assignment를 committed slot에 직접 적용했다.
- **수정된 invariant / decision:** detached replacement를 완성한 뒤 slot에 non-throwing swap하고, metadata는 그 뒤에 advance한다.
- **실제 코드 확인:** `2f9b934b0825`의 direct assignment와 이 SHA의 detached-copy/swap/update 순서를 비교한다.
- **regression test:** `8930c4d17bc1`의 full-capacity allocation failure sweep을 확인한다.

#### 핵심 설계 / failure boundary 확인
- [x] 필요하면 직전 관련 SHA `2f9b934b0825`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [x] 초기 관련 SHA `2f9b934b0825`와 `ContactBook::add()`를 직접 비교해 direct assignment 제거 지점을 찾으세요.
- [x] incoming contact를 detached local replacement로 복사하는 시점과 그 복사에서 allocation exception이 날 수 있는 경로를 확인하세요.
- [x] replacement 완성 후 selected slot과 non-throwing `swap()`하는 commit point를 표시하세요.
- [x] `next_`와 `size_` mutation이 slot swap 성공 뒤에만 실행되는 정확한 순서를 기록하세요.
- [x] copy failure 시 slot content, logical oldest position, size가 모두 untouched인 이유를 before/after state로 설명하세요.
- [x] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [x] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `8930c4d17bc1`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼: `src/ContactBook.cpp`의 `ContactBook::add()`; `Contact` default construction, assignment, `swap()`; `size_`, `next_` update order.
- 핵심 코드 발췌 위치: `0ad14a57cab6:src/ContactBook.cpp`는 `Contact replacement; replacement = contact; contacts_[next_].swap(replacement);`를 실행한 뒤에만 cursor와 size를 갱신합니다.
- 변경 전/후 차이: stored slot에 incoming value를 직접 대입하던 코드를 detached local replacement 완성 후 non-throwing slot swap으로 바꿨습니다. metadata update는 slot commit 뒤로 유지됩니다.
- 직접 확인한 ownership/lifetime/state 관계: copy 준비 중에는 existing slot이 old contact resources를 계속 소유하고 local `replacement`가 새 copies를 소유합니다. swap 후 slot이 새 contact를, replacement가 old slot value를 소유하며 scope 종료 시 old resources를 파괴합니다.
- 직접 확인한 failure path: `replacement = contact` 중 allocation이 실패하면 slot swap과 `next_`/`size_` update에 도달하지 않습니다. 따라서 physical slot bytes, logical oldest mapping, size/cursor가 모두 prior state로 남습니다. 성공 후 swap은 publication point이며 old value cleanup은 local replacement가 담당합니다.
- 실행한 테스트와 결과: 미실행. fix 전후 `ContactBook::add()`를 비교하고 후속 failure test를 검사했으며 command는 수행하지 않았습니다.
- 이 commit을 한 문장으로 설명: detached Contact를 완성한 뒤 slot swap과 metadata advance를 수행해 ring replacement를 transaction으로 만들었습니다.

### `8930c4d17bc1` — test(contact): 연락처 교체 실패 회귀 검증

- Importance: **A**
- Tags: **TEST, EXCEPTION, EDGE**
- Source 역할: full-capacity allocation failure를 sweep하며 order/value/leak baseline을 검증합니다.
- Source classification summary: Sweeps allocation failures during full-book replacement and verifies logical order and leak baselines.

#### 핵심 설계 / failure boundary 확인
- [x] 필요하면 직전 관련 SHA `0ad14a57cab6`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [x] book을 capacity까지 채워 oldest replacement path를 강제로 만드는 test setup을 확인하세요.
- [x] replacement copy의 모든 관찰 allocation point에 failure를 주입하는 sweep loop를 찾으세요.
- [x] 각 실패 후 size, logical order, field values, live-allocation count를 비교하는 assertions을 기록하세요.
- [x] failure sweep 뒤 한 번의 successful insertion이 정상 ring advance를 확인하는 이유를 actual expected order와 연결하세요.
- [x] 이 deterministic regression이 직접 throwing assignment를 stored slot에 다시 도입하는 변경을 어떻게 잡는지 production path를 매핑하세요.
- [x] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [x] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### Test commit 학습 구분
- 대상 production invariant: source가 확정한 방향은 **ContactBook full-capacity replacement strong guarantee**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 재현 failure / boundary: source가 확정한 방향은 **allocation failure while replacing oldest slot**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- test technique: source가 확정한 방향은 **full-capacity deterministic allocation-failure sweep + live-block accounting**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 통과하는 production path: source가 확정한 방향은 **Contact copy → detached replacement → slot swap → ring metadata**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하는 것: source가 확정한 방향은 **size/order/fields/live blocks가 실패 뒤 불변**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하지 않는 것: source가 확정한 방향은 **다른 contact operations의 모든 실패 형태를 포괄하지는 않음**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 성격: source가 확정한 방향은 **deterministic regression**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.

#### 학습자 기록
- 확인한 파일/심볼: `tests/failure/test_contact_failure.cpp`; `tests/support/FailingNew.hpp/.cpp`; contact/book value comparison helpers; `Makefile`의 contact failure target.
- 핵심 코드 발췌 위치: `8930c4d17bc1:tests/failure/test_contact_failure.cpp`는 book을 capacity 8까지 채워 oldest-slot replacement 경로를 만들고, 성공 run에서 관찰한 allocation attempts를 1..N으로 순회해 각 지점에서 `std::bad_alloc`을 주입합니다.
- 변경 전/후 차이: production fix 위에 full-capacity 취약 경로를 직접 반복하는 deterministic failure regression이 추가되었습니다. failure 뒤 상태 확인과 이후 정상 insertion 확인을 함께 수행합니다.
- 직접 확인한 ownership/lifetime/state 관계: 각 failure 전 live-block baseline과 logical size/order/각 contact field를 저장합니다. exception 뒤 모두 동일해야 하며 outer scope 종료 후 전체 live count도 원래 baseline으로 돌아와야 합니다.
- 직접 확인한 failure path: detached replacement copy의 각 관찰 allocation이 실패해도 slot/content/cursor가 바뀌지 않는지 검사합니다. sweep 뒤 한 번 성공 insertion을 수행해 oldest 하나만 제거되고 new contact가 newest로 추가되는 정상 advance를 확인합니다. 다른 Contact operation의 모든 failure는 범위 밖입니다.
- 실행한 테스트와 결과: 미실행. failure controller, sweep loop, expected order와 Make target을 검사했으나 binary는 실행하지 않았습니다.
- 이 commit을 한 문장으로 설명: full ring replacement의 모든 관찰 allocation 실패에서 값·순서·크기·live blocks를 고정했습니다.

## Invariant ledger

| SHA | Source에서 확정된 invariant 변화 | 해당 SHA에서 직접 확인한 코드 근거 | 아직 남은 위험/미보장 |
| --- | --- | --- | --- | --- |
| `2f9b934b0825` | 8-slot circular buffer와 logical order 도입, replacement는 direct assignment 상태 | 8-element `contacts_`, `size_`, `next_`, full일 때 `first = next_`인 logical indexing과 direct slot assignment를 확인했습니다. | throwing `Contact` assignment가 committed slot을 부분 변경할 수 있어 content와 metadata의 강한 transaction이 없습니다. |
| `0ad14a57cab6` | detached `Contact` 완성 → non-throwing swap → metadata advance 순서로 수정 | default local `replacement`를 완성한 뒤 slot `swap()`을 하고 그 후 cursor/size를 갱신합니다. | deterministic full-capacity allocation failure evidence는 후속 test가 필요합니다. |
| `8930c4d17bc1` | full-capacity allocation failure sweep으로 size/order/values/live blocks 보존 검증 | capacity-seeded book에서 allocation positions를 sweep하고 실패 뒤 size/order/fields/live-block baseline과 성공 retry order를 비교합니다. | 다른 Contact APIs나 관찰되지 않은 allocator path 전체를 포괄하지는 않습니다. |

## Failure → Fix → Test 연결

- `2f9b934b0825` 초기 상태: full-capacity slot replacement가 ordinary `Contact` assignment를 사용합니다.
- `0ad14a57cab6` fix: detached replacement → slot swap → metadata advance 순서로 변경합니다.
- `8930c4d17bc1` regression: allocation failure 전 지점에서 size/order/values/live blocks를 고정합니다.

### 학습자 연결 기록
- 최초 위험/맹점: fixed array 자체는 allocation하지 않아도 slot의 `Contact` value assignment가 owned strings를 복사하므로 committed slot에 직접 대입하면 중간 throw가 partial value를 남길 수 있습니다.
- 이를 드러낸 실제 failure 또는 test gap: 초기 `add()`는 slot assignment 뒤 metadata를 바꿨지만, metadata가 unchanged여도 slot content가 이미 변할 수 있어 logical order의 old value 보존이 성립하지 않았습니다.
- 수정/강화된 decision: incoming contact를 detached local value에 완전히 복사하고, 성공 후 slot과 non-throwing swap한 뒤에만 `next_`와 `size_`를 갱신합니다.
- 해당 코드 위치: `2f9b934b0825:src/ContactBook.cpp`의 direct assignment와 `0ad14a57cab6:src/ContactBook.cpp`의 replacement/swap/update sequence.
- 이를 고정하는 regression/evidence: `8930c4d17bc1:tests/failure/test_contact_failure.cpp`의 full-capacity allocation-failure sweep과 successful retry.

## Ownership / state / responsibility 변화

- Source에서 확인되는 핵심 transition을 아래에 실제 코드 근거로 완성하세요.
- 시작 상태: 8-slot circular buffer와 logical order 도입, replacement는 direct assignment 상태
- Thread 종료 상태: full-capacity allocation failure sweep으로 size/order/values/live blocks 보존 검증
- [x] 중간 commit마다 owner/state publisher/cleanup 책임이 어디로 이동하거나 강화되는지 적으세요.
- [x] borrowed와 owned state가 함께 등장하면 각각의 lifetime 종료 지점을 표시하세요.

### 코드 검사로 복원한 변화

1. `2f9b934b0825`: book이 physical slots와 logical `size_`/`next_`를 소유하지만 replacement publisher는 throwing slot assignment입니다.
2. `0ad14a57cab6`: throw 가능한 copy 책임이 detached `replacement`로 이동하고 slot publication은 `swap()`으로, logical metadata publication은 그 뒤로 분리됩니다.
3. `8930c4d17bc1`: full-capacity failure마다 old logical sequence와 allocation ownership이 유지되고 이후 success가 정확히 한 번 advance하는지 검사합니다.

## Thread 최종 상태

- Source가 확정한 최종 흐름: `logical insertion request → choose physical slot → detached Contact copy → slot swap commit → cursor/size advance → logical oldest-to-newest observation`
- [x] 마지막 Thread SHA 시점에서 실제 type/function 호출 관계를 사용해 위 흐름을 다시 그리세요.
- [x] Thread 시작 시점과 비교해 새로 보장되는 invariant를 정리하세요.
- [x] source가 보장하지 않는 영역이나 외부 side effect/stream position 등 남는 경계를 실제 코드 근거로 적으세요.

### 완성된 Thread 해석

마지막 Thread SHA 기준으로 `ContactBook::add()`는 empty input을 무시하고, incoming contact를 local `replacement`에 먼저 복사합니다. 복사가 끝난 뒤 `contacts_[next_].swap(replacement)`로 selected physical slot을 교체하고, 그 다음 `next_`를 회전시키며 capacity 미만일 때만 `size_`를 증가시킵니다. `at()`는 full 여부에 따라 logical oldest physical index를 계산합니다.

초기 ring과 비교하면 slot value와 cursor/size가 하나의 성공 transaction으로 취급됩니다. allocation 실패는 stored values와 logical order를 보존하고 old slot resources는 성공 뒤 local replacement가 정리합니다. 보장 범위는 contact replacement 경로이며 external borrowed reference의 후속 successful replacement invalidation까지 없애지는 않습니다.

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

- 실제 caller → callee 흐름: incoming `Contact&` → `ContactBook::add()` empty check → local `Contact replacement` copy → `contacts_[next_].swap(replacement)` → `next_`/`size_` advance → `at()`의 logical-to-physical mapping.
- 핵심 상태 필드: `Contact contacts_[capacity]`, `std::size_t size_`, `std::size_t next_`; 각 Contact 내부 owned string values.
- resource owner / borrowed view: book slots와 local replacement가 Contact resources를 값으로 소유하고, `add()` input과 `at()` 반환 reference는 borrowed입니다.
- commit point: detached copy 성공 뒤 selected slot과 실행하는 non-throwing `swap()`이며, metadata는 그 commit 뒤에만 바뀝니다.
- cleanup path: copy allocation failure는 local replacement가 자신의 partial state를 정리하고 slot/metadata를 건드리지 않습니다. 성공 후 local replacement destructor가 old slot resources를 정리합니다.
- 최종 invariant 설명: 실패 시 slot content·logical order·cursor·size가 함께 보존되고, 성공 시 정확히 한 physical slot 교체와 한 번의 ring advance만 관찰됩니다.

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
