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

- [x] creator → local guard → pipeline clone의 ownership handoff를 실제 코드로 추적할 수 있다.
- [x] fix 전 clear-and-append 경로와 fix 후 candidate-and-swap 경로를 관련 SHA끼리 비교할 수 있다.
- [x] leak freedom과 strong state preservation이 서로 다른 보장임을 failure path로 설명할 수 있다.
- [x] unknown formatter, null/count 오류, clone/allocation failure가 target에 미치는 영향을 테스트별로 구분할 수 있다.

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
- [x] exact `upper`, `prefix=<payload>`, `suffix=<payload>` grammar를 분기하는 parser/factory 코드를 찾고 malformed와 unknown classification branch를 분리해 기록하세요.
- [x] `FormatterCreator`가 abstract가 되는 선언과 virtual destructor를 확인하세요.
- [x] `create()`의 반환 타입에서 raw owning pointer transfer가 어떻게 드러나는지 public signature를 확인하세요.
- [x] factory가 생성하는 concrete dynamic types와 caller가 base pointer만 받는 관계를 추적하세요.
- [x] `PipelineBuilder`가 이 시점에는 어떤 operation boundary만 선언하고 있는지 실제 public declaration을 확인하세요.
- [x] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [x] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `fc0b8b7a40a0`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼: `include/cppf/Factory.hpp`의 `InvalidSpecification`, `UnknownFormatter`, `FormatterCreator`, `DefaultFormatterCreator`, `PipelineBuilder`; `src/Factory.cpp`의 `DefaultFormatterCreator::create()`.
- 핵심 코드 발췌 위치: `4c34654a4602:src/Factory.cpp`에서 empty specification은 `InvalidSpecification`, exact `upper`는 `UppercaseFormatter`, non-empty `prefix=`/`suffix=` payload는 해당 concrete formatter, 나머지는 `UnknownFormatter`로 분기됩니다.
- 변경 전/후 차이: formatter를 코드에서 직접 생성하던 경계에 문자열 specification grammar와 polymorphic creator가 추가되었습니다. `FormatterCreator`는 virtual destructor와 pure virtual `create()`를 가지며 `PipelineBuilder`는 static replacement operation을 선언합니다.
- 직접 확인한 ownership/lifetime/state 관계: `create()`의 반환형은 `Formatter *`이고 성공 시 heap object ownership이 caller에게 이전됩니다. caller는 구체 dynamic type을 알 필요가 없지만, 반환 직후 delete 책임을 인수해야 합니다.
- 직접 확인한 failure path: empty key, payload 없는 `prefix=`/`suffix=`, unknown key는 pointer를 반환하기 전에 예외로 끝납니다. 이 SHA에는 여러 specification을 조립하는 구현이나 raw pointer를 보호하는 local owner가 아직 없습니다.
- 실행한 테스트와 결과: 미실행. 지정 SHA의 public declaration과 parser/factory implementation을 검사했으며 command는 수행하지 않았습니다.
- 이 commit을 한 문장으로 설명: formatter 문자열 grammar와 raw-owning polymorphic creation boundary를 도입했습니다.

### `fc0b8b7a40a0` — feat(factory): formatter 임시 소유와 pipeline 교체 구현

- Importance: **A**
- Tags: **OWNERSHIP, INTEGRATION, EXCEPTION**
- Source 역할: creator raw pointer를 즉시 guard하고 target pipeline을 assembly합니다.
- Source classification summary: Adds RAII ownership of factory results and pipeline replacement from a specification list.

#### 핵심 설계 / failure boundary 확인
- [x] 필요하면 직전 관련 SHA `4c34654a4602`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [x] creator가 반환한 raw pointer를 즉시 소유하는 local RAII owner의 constructor/destructor와 scope를 찾으세요.
- [x] local formatter를 `FormatPipeline::append()`에 넘긴 뒤 pipeline이 clone을 소유하고 local guard가 원본을 delete하는 두 단계 ownership을 추적하세요.
- [x] null specification array/count consistency와 capacity를 work 시작 전에 검사하는 branch를 확인하세요.
- [x] empty specification list가 target을 empty pipeline으로 바꾸는 경로를 확인하세요.
- [x] 가장 중요하게, target을 먼저 clear/empty로 만들고 이후 직접 append하는 mutation 순서를 찾고 중간 failure 시 observable target이 무엇이 되는지 기록하세요.
- [x] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [x] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `907bfbd5c37c`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼: `src/Factory.cpp`의 unnamed-namespace `FormatterOwner`, `PipelineBuilder::replace()`; `FormatPipeline::append()`/`swap()`.
- 핵심 코드 발췌 위치: `fc0b8b7a40a0:src/Factory.cpp`의 `FormatterOwner`는 creator raw pointer를 constructor에서 받아 destructor에서 `delete`합니다. `replace()`는 validation 후 `target.swap(empty)`로 기존 값을 먼저 비우고, 각 owner의 formatter를 `target.append()`에 전달합니다.
- 변경 전/후 차이: creator 결과의 leak 방지와 specification list 조립이 구현되었습니다. 그러나 assembly destination이 target 자체라 replacement의 상태 변경은 시작 시 empty swap과 각 append에 분산됩니다.
- 직접 확인한 ownership/lifetime/state 관계: creator 성공 직후 local `FormatterOwner`가 원본 dynamic object를 소유합니다. `target.append(formatter.get())`는 borrowed reference를 받아 별도 clone을 만들고 target이 clone을 소유합니다. loop iteration 종료 시 owner는 creator 원본을 삭제합니다.
- 직접 확인한 failure path: null/count 불일치와 capacity 초과는 mutation 전에 거부됩니다. 이후 create 또는 append/clone이 실패하면 local owner와 현재 scope의 objects는 누수 없이 정리되지만, target은 이미 비워졌거나 성공한 앞 단계 clone만 가진 partial pipeline으로 남습니다. empty specification list는 target을 empty로 교체합니다.
- 실행한 테스트와 결과: 미실행. 지정 SHA의 ownership handoff와 mutation 순서를 검사했으며 command는 수행하지 않았습니다.
- 이 commit을 한 문장으로 설명: factory 결과 누수는 막았지만 target을 증분 변경해 강한 교체 보장은 만들지 못했습니다.

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
- [x] 직전 관련 SHA `fc0b8b7a40a0`의 clear-then-build 코드와 이 SHA의 candidate-then-swap 코드를 직접 diff하세요.
- [x] 새 `FormatPipeline candidate`가 생성되고 모든 create/append가 candidate에만 적용되는 caller/callee 흐름을 추적하세요.
- [x] create 또는 clone exception이 발생하면 candidate destructor와 local guard가 무엇을 정리하고 target에는 어떤 write도 하지 않는지 확인하세요.
- [x] 모든 specification 성공 뒤 실행되는 단 하나의 non-throwing `target.swap(candidate)`를 commit point로 표시하세요.
- [x] swap 이후 candidate가 old target state를 소유하고 scope 종료 시 해제하는 lifetime 전환을 그리세요.
- [x] fix가 resource cleanup이 아니라 object-state atomicity를 복구한 것임을 실제 before/after state mutation 순서로 설명하세요.

#### Ownership / lifecycle / state transition
- [x] 상태 필드별 owner, lifetime, valid state를 표로 직접 정리하세요.
- [x] throw 가능한 연산과 non-throwing commit operation의 순서를 실제 코드 라인 기준으로 적으세요.
- [x] 성공 전 temporary/candidate state와 성공 후 published state를 구분해 그리세요.

#### Failure scenario와 보장 경계
- [x] source가 지목한 failure를 하나 이상 실제 제어 흐름으로 따라가고, exception 직전/직후 observable state를 기록하세요.
- [x] 이 commit이 보장하는 것과 아직 보장하지 않는 것을 source와 해당 SHA 코드에 근거해 구분하세요.

#### 다음 관련 commit과 연결
- 다음 Thread SHA `466d7abdb60f`를 읽기 전에, 이 SHA가 남긴 보장과 미해결 failure boundary를 2~4줄로 적으세요.

#### 학습자 기록
- 확인한 파일/심볼: `src/Factory.cpp`의 `PipelineBuilder::replace()`, `FormatterOwner`; `FormatPipeline::append()`, destructor, `swap()`.
- 핵심 코드 발췌 위치: `907bfbd5c37c:src/Factory.cpp`는 `FormatPipeline candidate`를 만들고 모든 `create()`/`candidate.append()`를 끝낸 뒤 마지막에 `target.swap(candidate)`를 한 번 호출합니다.
- 변경 전/후 차이: 직전의 `target.swap(empty)`와 direct append가 제거되고, mutation destination이 local candidate로 이동했습니다. resource cleanup 방식은 유지되지만 object-state publication 지점은 final swap 하나로 축소되었습니다.
- 직접 확인한 ownership/lifetime/state 관계: 각 iteration에서 creator object는 `FormatterOwner`, append가 만든 clone은 candidate가 소유합니다. final swap 전 target은 계속 old pipeline을 소유합니다. swap 후 target이 complete candidate를, local candidate가 old target을 소유하며 scope 종료 시 old target clones를 삭제합니다.
- 직접 확인한 failure path: create, formatter construction, clone, candidate capacity/allocation 중 어느 단계에서 throw해도 local owner와 candidate destructor가 새 resources를 정리하고 `target.swap()`에는 도달하지 않습니다. 따라서 target size, step order, output behavior가 유지됩니다.
- 실행한 테스트와 결과: 미실행. fix 전후 `Factory.cpp`를 직접 비교하고 후속 regression source를 검사했으며 command는 수행하지 않았습니다.
- 이 commit을 한 문장으로 설명: 완성된 candidate만 non-throwing swap으로 게시해 leak freedom과 target atomicity를 함께 만족시켰습니다.

### `466d7abdb60f` — test(factory): 교체 실패 상태 보존과 CLI 검증

- Importance: **B**
- Tags: **TEST, EXCEPTION**
- Source 역할: rejected replacement 뒤 state preservation과 CLI behavior를 회귀 검증합니다.
- Source classification summary: Adds regression and CLI checks for failed replacement preserving the prior pipeline.

#### Thread 흐름에서 확인할 구현 역할
- [x] 직전 관련 SHA `907bfbd5c37c`와의 차이 중 이 Thread의 흐름에 필요한 부분만 확인하세요.
- [x] seeded target pipeline을 준비한 뒤 중간 unknown formatter를 넣는 regression case를 찾으세요.
- [x] invalid null/count combination이 validation 단계에서 target을 보존하는 case를 확인하세요.
- [x] 각 failure 뒤 transformed output 또는 step behavior가 seed와 동일함을 어떤 assertion으로 확인하는지 기록하세요.
- [x] CLI invalid configuration에서 nonzero status, stderr diagnostic, stdout empty를 동시에 검증하는 fixture를 찾으세요.
- [x] 이 테스트가 candidate-then-swap의 대표 failure를 고정하지만 모든 allocation/clone site를 sweep하지는 않는다는 범위를 실제 fixture 수로 확인하세요.
- [x] 이 commit이 다음 관련 commit의 전제가 되는 상태/계약을 한 문단으로 기록하세요.

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
- 확인한 파일/심볼: `tests/test_factory.cpp`, `tests/check_cli.sh`의 factory cases, 관련 fixtures와 `Makefile`의 unit/integration targets.
- 핵심 코드 발췌 위치: `466d7abdb60f:tests/test_factory.cpp`는 기존 pipeline을 seed한 뒤 list 중간에 unknown formatter를 두거나 null/count 조합을 잘못 전달하고, exception 후 seed 적용 결과가 동일한지 확인합니다. CLI script는 invalid configuration의 nonzero status, expected stderr, empty stdout를 비교합니다.
- 변경 전/후 차이: candidate-then-swap production fix 위에 대표적인 grammar/validation rejection과 process-level output atomicity 회귀가 추가되었습니다.
- 직접 확인한 ownership/lifetime/state 관계: regression은 failure 전 target behavior를 baseline으로 저장하고 failure 뒤 같은 transformation을 재실행합니다. empty list success는 old target이 local candidate로 이동해 파괴되고 target이 zero-step pipeline이 되는 정상 commit도 확인합니다.
- 직접 확인한 failure path: unknown middle item은 candidate에 앞 step clone이 이미 존재하는 상태에서 예외를 발생시켜 candidate destructor 경로를 통과합니다. null/count failure는 work 시작 전 validation 경로입니다. 고정 fixture 수만 확인하므로 모든 allocation/clone site는 sweep하지 않습니다.
- 실행한 테스트와 결과: 미실행. unit/CLI fixture와 expected assertions를 검사했지만 binary는 실행하지 않았습니다.
- 이 commit을 한 문장으로 설명: 대표 rejection에서 seeded target과 CLI stdout이 보존되는지 고정한 회귀입니다.

### `af4e35ca7d92` — test(factory): 생성·복제·할당 실패 정리 검증

- Importance: **A**
- Tags: **TEST, EXCEPTION, OWNERSHIP**
- Source 역할: creation, clone, allocation failure 전 구간의 ownership handoff를 sweep합니다.
- Source classification summary: Sweeps creation, clone, and allocation failures while checking cleanup and target preservation.

#### 핵심 설계 / failure boundary 확인
- [x] 필요하면 직전 관련 SHA `466d7abdb60f`와 비교하여 책임, state mutation 순서, test boundary가 어떻게 달라졌는지 확인하세요.
- [x] custom creator와 counted formatter가 create failure와 clone failure를 어떻게 구분해 주입하는지 test doubles를 확인하세요.
- [x] observed allocation/clone failure point를 순회하는 sweep loop와 failure index 제어를 기록하세요.
- [x] creator → local guard → pipeline clone → partial candidate destructor → final target까지 ownership transition별 live count assertion을 매핑하세요.
- [x] 모든 injected exception 뒤 original target behavior가 유지되는 assertion을 확인하세요.
- [x] 누수뿐 아니라 premature mutation도 검출하도록 어떤 baseline/state 비교를 함께 수행하는지 기록하세요.
- [x] 이 commit의 변경이 어떤 invariant/failure path/API boundary를 강화하는지 실제 코드와 test를 연결해 적으세요.
- [x] 이 commit의 보장 범위를 넘는 항목은 무엇인지 source에 근거해 별도로 적으세요.

#### Test commit 학습 구분
- 대상 production invariant: source가 확정한 방향은 **factory-builder ownership handoff와 target preservation**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 재현 failure / boundary: source가 확정한 방향은 **creation, clone, allocation failure at every observed point**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- test technique: source가 확정한 방향은 **custom creator + counted formatter + deterministic sweep**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 통과하는 production path: source가 확정한 방향은 **creator → guard → pipeline clone → candidate cleanup → target swap**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하는 것: source가 확정한 방향은 **전체 ownership transition에서 leak/premature mutation이 없음**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 이 테스트가 증명하지 않는 것: source가 확정한 방향은 **stream/CLI transport failures는 주 대상이 아님**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.
- 성격: source가 확정한 방향은 **deterministic failure-injection regression**입니다. 실제 test code/fixture를 읽고 구체적인 파일·case·assertion을 기록하세요.

#### 학습자 기록
- 확인한 파일/심볼: `tests/failure/test_factory_failure.cpp`; `tests/support/TestFormatter.hpp/.cpp`; `tests/support/FailingNew.hpp/.cpp`; custom creator test double; `Makefile`의 factory failure binary.
- 핵심 코드 발췌 위치: `af4e35ca7d92:tests/failure/test_factory_failure.cpp`는 create failure, clone failure, observed allocation attempt를 각각 지정해 `PipelineBuilder::replace()`를 반복 호출하고 live counters와 target output을 비교합니다.
- 변경 전/후 차이: 대표 unknown/null rejection에 더해 creator → local guard → clone → partial candidate → final swap 전 구간의 결정적 failure injection이 추가되었습니다. production 코드는 변경되지 않습니다.
- 직접 확인한 ownership/lifetime/state 관계: custom creator가 만든 formatter는 local `FormatterOwner`가 먼저 소유하고, append 성공 시 candidate가 별도 clone을 소유합니다. tests는 각 실패 뒤 formatter live count와 allocation live-block baseline이 복구되고 original target behavior가 동일한지 함께 확인합니다.
- 직접 확인한 failure path: create 자체의 throw, returned object를 clone하는 throw, 문자열·container 등 관찰된 allocation 실패가 final swap 전에 발생하도록 failure index를 이동합니다. 누수만 검사하지 않고 target transformation 결과도 비교해 premature mutation을 검출합니다. stream transport failure는 범위 밖입니다.
- 실행한 테스트와 결과: 미실행. failure double과 sweep loop, Make target을 검사했으며 test executable은 실행하지 않았습니다.
- 이 commit을 한 문장으로 설명: factory assembly의 모든 관찰 ownership handoff 실패에서 cleanup과 target 보존을 동시에 검증했습니다.

## Invariant ledger

| SHA | Source에서 확정된 invariant 변화 | 해당 SHA에서 직접 확인한 코드 근거 | 아직 남은 위험/미보장 |
| --- | --- | --- | --- | --- |
| `4c34654a4602` | creator abstraction, grammar, raw-pointer ownership transfer 경계 도입 | `create()`의 exact grammar 분기, abstract creator, virtual destructor, raw `Formatter *` 반환을 확인했습니다. | raw pointer 성공 결과를 인수할 guard와 multi-step publication은 아직 없습니다. |
| `fc0b8b7a40a0` | factory result를 즉시 RAII guard가 소유하지만 target은 incremental mutation 상태 | `FormatterOwner`가 creator 결과를 즉시 삭제 책임으로 감싸고 `append()`가 별도 clone을 target에 저장합니다. | target을 먼저 비우고 직접 append하므로 later failure에 old state가 사라지거나 partial state가 노출됩니다. |
| `907bfbd5c37c` | 완성된 candidate만 non-throwing `swap()`으로 publish하도록 transaction boundary 수정 | 모든 create/append를 local `candidate`에 적용하고 마지막 `target.swap(candidate)`만 target을 변경합니다. | 대표/전체 failure regression과 process output 증거는 후속 commits가 필요합니다. |
| `466d7abdb60f` | 중간 unknown formatter와 invalid null/count에서 기존 target 보존 regression | seeded target + unknown/null-count rejection과 CLI nonzero/stderr/empty-stdout fixture로 대표 경로를 고정합니다. | 모든 create/clone/allocation failure position을 순회하지는 않습니다. |
| `af4e35ca7d92` | create/clone/allocation failure 전 지점에서 cleanup과 target preservation 검증 | custom creator, counted clone, `FailingNew` sweep가 live baselines와 target behavior를 모든 관찰 실패 지점에서 비교합니다. | stream/CLI transport failure와 관찰되지 않은 allocator path는 범위 밖입니다. |

## Failure → Fix → Test 연결

- `fc0b8b7a40a0` 초기 builder: resource cleanup은 수행하지만 target을 incremental하게 변경합니다.
- `907bfbd5c37c` fix: complete candidate를 만든 뒤 one non-throwing swap으로 publish합니다.
- `466d7abdb60f` regression: 대표 rejection에서 seeded target과 CLI success output이 보존되는지 확인합니다.
- `af4e35ca7d92` failure sweep: create/clone/allocation 전 지점의 cleanup과 target preservation을 검증합니다.

### 학습자 연결 기록
- 최초 위험/맹점: raw factory result를 RAII로 정리하는 것만으로는 여러 step을 교체하는 target의 이전 상태까지 보호되지 않습니다.
- 이를 드러낸 실제 failure 또는 test gap: `fc0b8b7a40a0`은 target을 먼저 비운 뒤 append하므로 두 번째 이후 specification의 create/clone 실패에서 누수는 없어도 empty 또는 partial target을 남깁니다.
- 수정/강화된 decision: validation 후 모든 throw 가능한 creation과 cloning을 local `FormatPipeline candidate`에서 끝내고, target에는 non-throwing `swap()` 한 번만 수행합니다.
- 해당 코드 위치: `fc0b8b7a40a0:src/Factory.cpp`의 `target.swap(empty)`/direct append와 `907bfbd5c37c:src/Factory.cpp`의 candidate assembly/final swap.
- 이를 고정하는 regression/evidence: `466d7abdb60f:tests/test_factory.cpp`와 CLI fixture, `af4e35ca7d92:tests/failure/test_factory_failure.cpp`.

## Ownership / state / responsibility 변화

- Source에서 확인되는 핵심 transition을 아래에 실제 코드 근거로 완성하세요.
- 시작 상태: creator abstraction, grammar, raw-pointer ownership transfer 경계 도입
- Thread 종료 상태: create/clone/allocation failure 전 지점에서 cleanup과 target preservation 검증
- [x] 중간 commit마다 owner/state publisher/cleanup 책임이 어디로 이동하거나 강화되는지 적으세요.
- [x] borrowed와 owned state가 함께 등장하면 각각의 lifetime 종료 지점을 표시하세요.

### 코드 검사로 복원한 변화

1. `4c34654a4602`: creator가 specification을 concrete formatter로 변환하고 raw ownership을 caller에게 넘깁니다.
2. `fc0b8b7a40a0`: local guard가 creator object를 정리하고 pipeline이 clone을 소유하지만, state publisher가 target의 clear와 각 append로 분산됩니다.
3. `907bfbd5c37c`: publication 책임이 final `target.swap(candidate)` 하나로 이동하고, candidate가 모든 partial resource의 cleanup owner가 됩니다.
4. `466d7abdb60f`: representative rejection과 실제 CLI에서 prior state/empty stdout을 확인합니다.
5. `af4e35ca7d92`: create·clone·allocation failure 위치별로 guard, candidate, target의 ownership과 state baseline을 검사합니다.

## Thread 최종 상태

- Source가 확정한 최종 흐름: `specification → creator raw pointer → local RAII owner → pipeline clone into candidate → final swap into target`
- [x] 마지막 Thread SHA 시점에서 실제 type/function 호출 관계를 사용해 위 흐름을 다시 그리세요.
- [x] Thread 시작 시점과 비교해 새로 보장되는 invariant를 정리하세요.
- [x] source가 보장하지 않는 영역이나 외부 side effect/stream position 등 남는 경계를 실제 코드 근거로 적으세요.

### 완성된 Thread 해석

마지막 Thread SHA 기준으로 `PipelineBuilder::replace()`는 null/count와 capacity를 먼저 검사하고, 각 specification을 `FormatterCreator::create()`로 변환합니다. raw pointer는 즉시 `FormatterOwner`에 들어가며 `candidate.append()`가 별도 polymorphic clone을 만듭니다. 모든 step이 성공한 경우에만 `target.swap(candidate)`가 실행됩니다.

초기 factory grammar와 비교하면 resource ownership handoff뿐 아니라 multi-step state replacement에 transaction boundary가 생겼습니다. 실패 시 새 formatter와 partial candidate는 local owners가 정리하고 old target은 계속 관찰됩니다. 보장 범위에는 source input이나 외부 stream position rollback이 포함되지 않으며, 테스트가 관찰하지 않은 환경 전체에 대한 형식 증명도 아닙니다.

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

- 실제 caller → callee 흐름: specification array → `PipelineBuilder::replace()` validation → `FormatterCreator::create()` → local `FormatterOwner` → `FormatPipeline::append()`/virtual `clone()` into candidate → `target.swap(candidate)`.
- 핵심 상태 필드: target/candidate의 `Formatter *steps_[max_steps]`, `size_`; local owner의 `Formatter *formatter_`.
- resource owner / borrowed view: creator 반환 직후 local guard가 원본을 소유하고 append 인자는 borrowed reference이며 candidate가 clone을 소유합니다. target은 commit 전까지 기존 clones를 소유합니다.
- commit point: 모든 specification 처리 성공 뒤의 단일 non-throwing `target.swap(candidate)`입니다.
- cleanup path: create 실패 전에는 pointer가 없고, create 후 실패는 `FormatterOwner`가 원본을 삭제하며 candidate destructor가 성공한 clone prefix를 삭제합니다. swap 후에는 candidate가 old target을 파괴합니다.
- 최종 invariant 설명: factory assembly 중 완성되지 않은 pipeline은 local candidate 밖으로 노출되지 않고, 모든 관찰 create/clone/allocation failure에서 target behavior와 ownership baseline이 유지됩니다.

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
