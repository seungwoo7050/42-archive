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

- [ ] 초기 ring representation과 logical index 변환을 해당 SHA에서 설명할 수 있다.
- [ ] 초기 direct assignment path와 fix의 detached-candidate path를 관련 SHA끼리 비교할 수 있다.
- [ ] slot content, `next_`, `size_`의 coupled invariant를 실패 시나리오로 설명할 수 있다.
- [ ] full-capacity failure regression이 실제 이전 취약 경로를 어떻게 재현하는지 확인할 수 있다.

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
- [ ] `ContactBook`의 8-slot backing array, logical size, next insertion cursor를 찾으세요.
- [ ] valid/empty contact insertion policy와 capacity 도달 후 replacement slot 선택을 확인하세요.
- [ ] `at()`가 logical oldest-to-newest index를 physical array index로 변환하는 식과 out-of-range branch를 기록하세요.
- [ ] full-capacity replacement에서 selected slot에 ordinary `Contact` assignment를 수행하는 코드를 찾으세요.
- [ ] 이 assignment가 allocation failure 시 slot/metadata transaction을 완전히 격리하지 못한다는 source 설명을 코드상 mutation 순서와 함께 기록하세요.
- [ ] 이 commit이 다음 관련 commit의 전제가 되는 상태/계약을 한 문단으로 기록하세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `0ad14a57cab6`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

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
- [ ] 필요하면 직전 관련 SHA `2f9b934b0825`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [ ] 초기 관련 SHA `2f9b934b0825`와 `ContactBook::add()`를 직접 비교해 direct assignment 제거 지점을 찾으세요.
- [ ] incoming contact를 detached local replacement로 복사하는 시점과 그 복사에서 allocation exception이 날 수 있는 경로를 확인하세요.
- [ ] replacement 완성 후 selected slot과 non-throwing `swap()`하는 commit point를 표시하세요.
- [ ] `next_`와 `size_` mutation이 slot swap 성공 뒤에만 실행되는 정확한 순서를 기록하세요.
- [ ] copy failure 시 slot content, logical oldest position, size가 모두 untouched인 이유를 before/after state로 설명하세요.
- [ ] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [ ] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `8930c4d17bc1`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `8930c4d17bc1` — test(contact): 연락처 교체 실패 회귀 검증

- Importance: **A**
- Tags: **TEST, EXCEPTION, EDGE**
- Source 역할: full-capacity allocation failure를 sweep하며 order/value/leak baseline을 검증합니다.
- Source classification summary: Sweeps allocation failures during full-book replacement and verifies logical order and leak baselines.

#### 핵심 설계 / failure boundary 확인
- [ ] 필요하면 직전 관련 SHA `0ad14a57cab6`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [ ] book을 capacity까지 채워 oldest replacement path를 강제로 만드는 test setup을 확인하세요.
- [ ] replacement copy의 모든 관찰 allocation point에 failure를 주입하는 sweep loop를 찾으세요.
- [ ] 각 실패 후 size, logical order, field values, live-allocation count를 비교하는 assertions을 기록하세요.
- [ ] failure sweep 뒤 한 번의 successful insertion이 정상 ring advance를 확인하는 이유를 actual expected order와 연결하세요.
- [ ] 이 deterministic regression이 직접 throwing assignment를 stored slot에 다시 도입하는 변경을 어떻게 잡는지 production path를 매핑하세요.
- [ ] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [ ] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### Test commit 학습 구분
- 대상 production invariant: source가 확정한 방향은 **ContactBook full-capacity replacement strong guarantee**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 재현 failure / boundary: source가 확정한 방향은 **allocation failure while replacing oldest slot**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- test technique: source가 확정한 방향은 **full-capacity deterministic allocation-failure sweep + live-block accounting**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 통과하는 production path: source가 확정한 방향은 **Contact copy → detached replacement → slot swap → ring metadata**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하는 것: source가 확정한 방향은 **size/order/fields/live blocks가 실패 뒤 불변**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하지 않는 것: source가 확정한 방향은 **다른 contact operations의 모든 실패 형태를 포괄하지는 않음**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 성격: source가 확정한 방향은 **deterministic regression**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.

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
| `2f9b934b0825` | 8-slot circular buffer와 logical order 도입, replacement는 direct assignment 상태 |  |  |
| `0ad14a57cab6` | detached `Contact` 완성 → non-throwing swap → metadata advance 순서로 수정 |  |  |
| `8930c4d17bc1` | full-capacity allocation failure sweep으로 size/order/values/live blocks 보존 검증 |  |  |

## Failure → Fix → Test 연결

- `2f9b934b0825` 초기 상태: full-capacity slot replacement가 ordinary `Contact` assignment를 사용합니다.
- `0ad14a57cab6` fix: detached replacement → slot swap → metadata advance 순서로 변경합니다.
- `8930c4d17bc1` regression: allocation failure 전 지점에서 size/order/values/live blocks를 고정합니다.

### 학습자 연결 기록
- 최초 위험/맹점:
- 이를 드러낸 실제 failure 또는 test gap:
- 수정/강화된 decision:
- 해당 코드 위치:
- 이를 고정하는 regression/evidence:

## Ownership / state / responsibility 변화

- Source에서 확인되는 핵심 transition을 아래에 실제 코드 근거로 완성하세요.
- 시작 상태: 8-slot circular buffer와 logical order 도입, replacement는 direct assignment 상태
- Thread 종료 상태: full-capacity allocation failure sweep으로 size/order/values/live blocks 보존 검증
- [ ] 중간 commit마다 owner/state publisher/cleanup 책임이 어디로 이동하거나 강화되는지 적으세요.
- [ ] borrowed와 owned state가 함께 등장하면 각각의 lifetime 종료 지점을 표시하세요.

## Thread 최종 상태

- Source가 확정한 최종 흐름: `logical insertion request → choose physical slot → detached Contact copy → slot swap commit → cursor/size advance → logical oldest-to-newest observation`
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
