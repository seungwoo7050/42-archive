# Factory Assembly Acquires a Transaction Boundary

## Thread 목표

factory가 반환한 raw owning pointer를 안전하게 넘기는 것과 기존 pipeline 상태를 원자적으로 교체하는 것이 별개의 문제임을 확인하고, clear-then-build에서 candidate-then-swap으로 수정되는 과정을 복원합니다.

**Source significance:** 초기 builder는 resource cleanup은 수행하지만 partially rebuilt target을 노출할 수 있습니다. 수정은 leak freedom과 object-state atomicity를 분리해 인식하고, 전체 candidate 성공 후 one non-throwing swap을 commit point로 둡니다.

## 이 Thread를 이해하기 위한 핵심 질문

- factory specification grammar와 formatter ownership transfer의 경계는 어디인가?
- 로컬 RAII guard가 누수를 막아도 target의 기존 상태는 왜 보존되지 않을 수 있는가?
- 초기 `replace()`의 commit point는 사실상 어디에 분산되어 있었는가?
- fix 이후 candidate가 실패할 때 target과 partial clones는 각각 누가 정리하는가?
- regression test와 failure sweep은 각각 어떤 수준의 보장을 증명하는가?

## 완료 기준

- [ ] creator → local guard → pipeline clone의 ownership handoff를 실제 코드로 추적할 수 있다.
- [ ] fix 전 clear-and-append 경로와 fix 후 candidate-and-swap 경로를 관련 SHA끼리 비교할 수 있다.
- [ ] leak freedom과 strong state preservation이 서로 다른 보장임을 failure path로 설명할 수 있다.
- [ ] unknown formatter, null/count 오류, clone/allocation failure가 target에 미치는 영향을 테스트별로 구분할 수 있다.

## Source에 연결된 invariant / engineering difficulty

### Critical invariant

- candidate는 완성되기 전 target에 publish되지 않는다.
- strong guarantee가 적용되는 replacement는 creation/clone/allocation 실패 시 target observable state를 보존한다.
- polymorphically owned resource는 정확히 한 번 해제된다.

### Major engineering difficulty

- factory creation이 raw pointer를 반환할 때 heterogeneous ownership handoff 관리.
- multi-step factory creation 중 partial target mutation 방지.
- allocation/clone failure sweep으로 ownership transition 전체 검증.

위 항목은 source가 확정한 범위입니다. 실제 코드에서 어떻게 구현되는지는 아래 학습 기록에서 직접 확인합니다.

## Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `4c34654a4602` | feat(factory): 문자열 명세로 formatter 생성 | A | ARCH, POLYMORPHISM, API | creator abstraction과 formatter specification grammar를 도입합니다. |
| 2 | `fc0b8b7a40a0` | feat(factory): formatter 임시 소유와 pipeline 교체 구현 | A | OWNERSHIP, INTEGRATION, EXCEPTION | creator raw pointer를 즉시 guard하고 target pipeline을 assembly합니다. |
| 3 | `907bfbd5c37c` | fix(factory): 교체 실패에도 기존 파이프라인 보존 | S | DEBUG, EXCEPTION, CORE | clear-then-build를 candidate-then-swap publication으로 수정합니다. |
| 4 | `466d7abdb60f` | test(factory): 교체 실패 상태 보존과 CLI 검증 | B | TEST, EXCEPTION | rejected replacement 뒤 state preservation과 CLI behavior를 회귀 검증합니다. |
| 5 | `af4e35ca7d92` | test(factory): 생성·복제·할당 실패 정리 검증 | A | TEST, EXCEPTION, OWNERSHIP | creation, clone, allocation failure 전 구간의 ownership handoff를 sweep합니다. |

## Commit별 학습 기록

### `4c34654a4602` — feat(factory): 문자열 명세로 formatter 생성

- Importance: **A**
- Tags: **ARCH, POLYMORPHISM, API**
- Source 역할: creator abstraction과 formatter specification grammar를 도입합니다.
- Source classification summary: Adds a polymorphic creator and grammar for constructing formatters from specifications.

#### 핵심 설계 / failure boundary 확인
- [ ] exact `upper`, `prefix=<payload>`, `suffix=<payload>` grammar를 분기하는 parser/factory 코드를 찾고 malformed와 unknown classification branch를 분리해 기록하세요.
- [ ] `FormatterCreator`가 abstract가 되는 선언과 virtual destructor를 확인하세요.
- [ ] `create()`의 반환 타입에서 raw owning pointer transfer가 어떻게 드러나는지 public signature를 확인하세요.
- [ ] factory가 생성하는 concrete dynamic types와 caller가 base pointer만 받는 관계를 추적하세요.
- [ ] `PipelineBuilder`가 이 시점에는 어떤 operation boundary만 선언하고 있는지 실제 public declaration을 확인하세요.
- [ ] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [ ] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `fc0b8b7a40a0`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `fc0b8b7a40a0` — feat(factory): formatter 임시 소유와 pipeline 교체 구현

- Importance: **A**
- Tags: **OWNERSHIP, INTEGRATION, EXCEPTION**
- Source 역할: creator raw pointer를 즉시 guard하고 target pipeline을 assembly합니다.
- Source classification summary: Adds RAII ownership of factory results and pipeline replacement from a specification list.

#### 핵심 설계 / failure boundary 확인
- [ ] 필요하면 직전 관련 SHA `4c34654a4602`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [ ] creator가 반환한 raw pointer를 즉시 소유하는 local RAII owner의 constructor/destructor와 scope를 찾으세요.
- [ ] local formatter를 `FormatPipeline::append()`에 넘긴 뒤 pipeline이 clone을 소유하고 local guard가 원본을 delete하는 두 단계 ownership을 추적하세요.
- [ ] null specification array/count consistency와 capacity를 work 시작 전에 검사하는 branch를 확인하세요.
- [ ] empty specification list가 target을 empty pipeline으로 바꾸는 경로를 확인하세요.
- [ ] 가장 중요하게, target을 먼저 clear/empty로 만들고 이후 직접 append하는 mutation 순서를 찾고 중간 failure 시 observable target이 무엇이 되는지 기록하세요.
- [ ] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [ ] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `907bfbd5c37c`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `907bfbd5c37c` — fix(factory): 교체 실패에도 기존 파이프라인 보존

- Importance: **S**
- Tags: **DEBUG, EXCEPTION, CORE**
- Source 역할: clear-then-build를 candidate-then-swap publication으로 수정합니다.
- Source classification summary: Builds a complete candidate pipeline before swapping it into the target.

#### Failure → Fix → Test chain
- **기존 가정:** factory-created temporaries를 leak 없이 정리하면 replacement도 충분히 안전하다고 볼 수 있었다.
- **실제 failure / 위험:** later specification의 create/clone 실패가 target을 이미 비웠거나 partial pipeline으로 남길 수 있었다.
- **root cause:** multi-step operation의 commit point가 target 내부 여러 mutation으로 분산되어 있었다.
- **수정된 invariant / decision:** 완전한 candidate만 one non-throwing swap으로 target에 publish한다.
- **실제 코드 확인:** `fc0b8b7a40a0`과 `907bfbd5c37c`의 `PipelineBuilder::replace()`를 비교해 mutation destination과 final swap을 확인한다.
- **regression test:** `466d7abdb60f`의 seeded target preservation, 이어서 `af4e35ca7d92`의 full failure sweep을 확인한다.

#### 이 commit 직전 상태와 문제
- 직전 관련 Thread SHA `fc0b8b7a40a0`를 먼저 checkout하여 이 commit이 추가되기 전 representation/ownership/state-publication 방식을 확인하세요.
- Source가 확정한 Problem/Decision을 실제 diff와 대응시키되, source에 없는 동기를 추가로 추정하지 마세요.

#### 해당 SHA에서 확인할 실제 코드
- [ ] 직전 관련 SHA `fc0b8b7a40a0`의 clear-then-build 코드와 이 SHA의 candidate-then-swap 코드를 직접 diff하세요.
- [ ] 새 `FormatPipeline candidate`가 생성되고 모든 create/append가 candidate에만 적용되는 caller/callee 흐름을 추적하세요.
- [ ] create 또는 clone exception이 발생하면 candidate destructor와 local guard가 무엇을 정리하고 target에는 어떤 write도 하지 않는지 확인하세요.
- [ ] 모든 specification 성공 뒤 실행되는 단 하나의 non-throwing `target.swap(candidate)`를 commit point로 표시하세요.
- [ ] swap 이후 candidate가 old target state를 소유하고 scope 종료 시 해제하는 lifetime 전환을 그리세요.
- [ ] fix가 resource cleanup이 아니라 object-state atomicity를 복구한 것임을 실제 before/after state mutation 순서로 설명하세요.

#### Ownership / lifecycle / state transition
- [ ] 상태 필드별 owner, lifetime, valid state를 표로 직접 정리하세요.
- [ ] throw 가능한 연산과 non-throwing commit operation의 순서를 실제 코드 라인 기준으로 적으세요.
- [ ] 성공 전 temporary/candidate state와 성공 후 published state를 구분해 그리세요.

#### Failure scenario와 보장 경계
- [ ] source가 지목한 failure를 하나 이상 실제 제어 흐름으로 따라가고, exception 직전/직후 observable state를 기록하세요.
- [ ] 이 commit이 보장하는 것과 아직 보장하지 않는 것을 source와 해당 SHA 코드에 근거해 구분하세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `466d7abdb60f`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `466d7abdb60f` — test(factory): 교체 실패 상태 보존과 CLI 검증

- Importance: **B**
- Tags: **TEST, EXCEPTION**
- Source 역할: rejected replacement 뒤 state preservation과 CLI behavior를 회귀 검증합니다.
- Source classification summary: Adds regression and CLI checks for failed replacement preserving the prior pipeline.

#### Thread 흐름에서 확인할 구현 역할
- [ ] 직전 관련 SHA `907bfbd5c37c`와의 차이 중 이 Thread의 흐름에 필요한 부분만 확인하세요.
- [ ] seeded target pipeline을 준비한 뒤 중간 unknown formatter를 넣는 regression case를 찾으세요.
- [ ] invalid null/count combination이 validation 단계에서 target을 보존하는 case를 확인하세요.
- [ ] 각 failure 뒤 transformed output 또는 step behavior가 seed와 동일함을 어떤 assertion으로 확인하는지 기록하세요.
- [ ] CLI invalid configuration에서 nonzero status, stderr diagnostic, stdout empty를 동시에 검증하는 fixture를 찾으세요.
- [ ] 이 테스트가 candidate-then-swap의 대표 failure를 고정하지만 모든 allocation/clone site를 sweep하지는 않는다는 범위를 실제 fixture 수로 확인하세요.
- [ ] 이 commit이 다음 관련 commit의 전제가 되는 상태/계약을 한 문단으로 기록하세요.

#### Test commit 학습 구분
- 대상 production invariant: source가 확정한 방향은 **PipelineBuilder strong replacement guarantee**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 재현 failure / boundary: source가 확정한 방향은 **중간 unknown formatter와 invalid null/count**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- test technique: source가 확정한 방향은 **seeded-state regression + CLI fixture**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 통과하는 production path: source가 확정한 방향은 **builder validation / candidate assembly / final swap**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하는 것: source가 확정한 방향은 **대표 rejection paths에서 prior target과 stdout atomicity가 유지됨**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하지 않는 것: source가 확정한 방향은 **모든 create/clone/allocation failure point는 후속 sweep가 담당**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 성격: source가 확정한 방향은 **deterministic regression + integration**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `af4e35ca7d92`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼:
- 핵심 코드 발췌 위치:
- 변경 전/후 차이:
- 직접 확인한 ownership/lifetime/state 관계:
- 직접 확인한 failure path:
- 실행한 테스트와 결과:
- 이 commit을 한 문장으로 설명:

### `af4e35ca7d92` — test(factory): 생성·복제·할당 실패 정리 검증

- Importance: **A**
- Tags: **TEST, EXCEPTION, OWNERSHIP**
- Source 역할: creation, clone, allocation failure 전 구간의 ownership handoff를 sweep합니다.
- Source classification summary: Sweeps creation, clone, and allocation failures while checking cleanup and target preservation.

#### 핵심 설계 / failure boundary 확인
- [ ] 필요하면 직전 관련 SHA `466d7abdb60f`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [ ] custom creator와 counted formatter가 create failure와 clone failure를 어떻게 구분해 주입하는지 test doubles를 확인하세요.
- [ ] observed allocation/clone failure point를 순회하는 sweep loop와 failure index 제어를 기록하세요.
- [ ] creator → local guard → pipeline clone → partial candidate destructor → final target까지 ownership transition별 live count assertion을 매핑하세요.
- [ ] 모든 injected exception 뒤 original target behavior가 유지되는 assertion을 확인하세요.
- [ ] 누수뿐 아니라 premature mutation도 검출하도록 어떤 baseline/state 비교를 함께 수행하는지 기록하세요.
- [ ] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [ ] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### Test commit 학습 구분
- 대상 production invariant: source가 확정한 방향은 **factory-builder ownership handoff와 target preservation**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 재현 failure / boundary: source가 확정한 방향은 **creation, clone, allocation failure at every observed point**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- test technique: source가 확정한 방향은 **custom creator + counted formatter + deterministic sweep**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 통과하는 production path: source가 확정한 방향은 **creator → guard → pipeline clone → candidate cleanup → target swap**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하는 것: source가 확정한 방향은 **전체 ownership transition에서 leak/premature mutation이 없음**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하지 않는 것: source가 확정한 방향은 **stream/CLI transport failures는 주 대상이 아님**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 성격: source가 확정한 방향은 **deterministic failure-injection regression**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.

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
| `4c34654a4602` | creator abstraction, grammar, raw-pointer ownership transfer 경계 도입 |  |  |
| `fc0b8b7a40a0` | factory result를 즉시 RAII guard가 소유하지만 target은 incremental mutation 상태 |  |  |
| `907bfbd5c37c` | 완성된 candidate만 non-throwing `swap()`으로 publish하도록 transaction boundary 수정 |  |  |
| `466d7abdb60f` | 중간 unknown formatter와 invalid null/count에서 기존 target 보존 regression |  |  |
| `af4e35ca7d92` | create/clone/allocation failure 전 지점에서 cleanup과 target preservation 검증 |  |  |

## Failure → Fix → Test 연결

- `fc0b8b7a40a0` 초기 builder: resource cleanup은 수행하지만 target을 incremental하게 변경합니다.
- `907bfbd5c37c` fix: complete candidate를 만든 뒤 one non-throwing swap으로 publish합니다.
- `466d7abdb60f` regression: 대표 rejection에서 seeded target과 CLI success output이 보존되는지 확인합니다.
- `af4e35ca7d92` failure sweep: create/clone/allocation 전 지점의 cleanup과 target preservation을 검증합니다.

### 학습자 연결 기록
- 최초 위험/맹점:
- 이를 드러낸 실제 failure 또는 test gap:
- 수정/강화된 decision:
- 해당 코드 위치:
- 이를 고정하는 regression/evidence:

## Ownership / state / responsibility 변화

- Source에서 확인되는 핵심 transition을 아래에 실제 코드 근거로 완성하세요.
- 시작 상태: creator abstraction, grammar, raw-pointer ownership transfer 경계 도입
- Thread 종료 상태: create/clone/allocation failure 전 지점에서 cleanup과 target preservation 검증
- [ ] 중간 commit마다 owner/state publisher/cleanup 책임이 어디로 이동하거나 강화되는지 적으세요.
- [ ] borrowed와 owned state가 함께 등장하면 각각의 lifetime 종료 지점을 표시하세요.

## Thread 최종 상태

- Source가 확정한 최종 흐름: `specification → creator raw pointer → local RAII owner → pipeline clone into candidate → final swap into target`
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
