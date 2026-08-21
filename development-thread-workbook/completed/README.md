# philo Development Thread 학습 골격

## 1. 목적

이 문서 세트는 완성된 프로젝트 해설서가 아닙니다. 학습자가 실제 commit history와 각 SHA의 코드를 직접 읽고 다음 발전 과정을 복원하기 위한 기록 골격입니다.

`설계 → 구현 → 실패 가능성 또는 실제 결함 → 수정 → 검증`

문서에 미리 적힌 Thread 구성, commit 순서, SHA, subject, importance, tags, 역할과 source-confirmed invariant는 고정 정보입니다. 학습자는 이를 재평가하지 않고, 각 SHA에서 확인한 실제 코드 근거와 실행 결과만 빈 기록란에 추가합니다.

## 2. 권장 학습 순서

1. 이 README에서 기록 원칙과 importance별 깊이를 확인합니다.
2. [`01-ownership-ledger-to-unsafe-destruction.md`](01-ownership-ledger-to-unsafe-destruction.md)
3. [`02-wall-clock-to-shared-monotonic-start.md`](02-wall-clock-to-shared-monotonic-start.md)
4. [`03-core-routine-to-committed-meal-progress.md`](03-core-routine-to-committed-meal-progress.md)
5. [`04-serialized-output-to-linearized-terminal-state.md`](04-serialized-output-to-linearized-terminal-state.md)
6. [`05-layered-evidence-for-concurrent-behavior.md`](05-layered-evidence-for-concurrent-behavior.md)
7. 모든 Thread의 ledger와 최종 설명을 서로 대조합니다.

Thread 순서는 source에 정의된 Development Threads의 순서를 따릅니다. 한 commit이 여러 Thread에 포함된 문서 세트에서는 중복을 제거하지 않고 각 Thread의 관점으로 다시 확인합니다.

## 3. Thread 문서 사용법

각 문서는 다음 순서로 사용합니다.

1. `Thread 목표`, `핵심 질문`, `완료 기준`을 먼저 읽습니다.
2. `Commit map`에서 source가 확정한 순서와 역할을 확인합니다.
3. commit마다 반드시 해당 SHA로 이동하거나 해당 SHA의 파일을 직접 엽니다.
4. source-confirmed 설명과 실제 코드를 구분하여 기록합니다.
5. `Invariant ledger`에서 invariant가 도입·강화·실패·복구·검증되는 지점을 연결합니다.
6. `Failure → Fix → Test`에서 수정 commit을 독립 feature가 아니라 기존 가정의 수정으로 복원합니다.
7. 마지막에 Thread 최종 상태와 architecture 또는 execution flow를 자신의 코드 근거로 작성합니다.

빈칸은 감상문이 아니라 다음 중 하나로 채웁니다.

- 파일 경로와 symbol
- 최소 코드 구간
- caller와 callee
- state mutation 전후 순서
- ownership 또는 borrow 관계
- lock 획득·해제 순서
- 실패 분기와 반환 상태
- cleanup 경로와 ledger 변화
- test injection 지점과 assertion
- 직접 실행한 명령과 결과

## 4. 해당 SHA 코드 확인 원칙

각 commit의 구현은 final HEAD가 아니라 해당 SHA에서 확인합니다.

```sh
git show --name-status --format=fuller <sha>
git diff <sha>^ <sha> --
git switch --detach <sha>
```

확인 규칙은 다음과 같습니다.

- 먼저 `<sha>^ → <sha>`의 직접 변경을 확인합니다.
- Thread의 직전 관련 SHA와 비교할 때에는 중간 commit이 존재할 수 있음을 기록하고, 직접 parent diff를 대체하지 않습니다.
- final HEAD의 함수명, 구조체 필드, lock 순서, test harness를 과거 SHA에 소급하지 않습니다.
- source에 symbol이 명시되어 있어도 실제 선언·정의·호출 관계는 해당 SHA에서 다시 확인합니다.
- 삭제되거나 이름이 바뀐 코드는 final HEAD에서 추측하지 않고 `git show <sha>:<path>`로 확인합니다.
- commit 직전 상태를 쓸 때에는 해당 commit의 parent 또는 문서가 지정한 직전 관련 SHA의 코드를 근거로 삼습니다.

## 5. Importance별 학습 깊이

| Importance | 기록 깊이 |
| --- | --- |
| S | 프로젝트를 설명하는 핵심 architecture 또는 invariant로 다룹니다. 문제, 직전 상태, 실패 가능성, 핵심 결정, 실제 핵심 코드, ownership·lifecycle·state transition, 후속 fix와 test까지 연결합니다. |
| A | 주요 subsystem, boundary, failure path, integration point를 설명할 수 있어야 합니다. 핵심 코드와 설계 판단, 수정 전 가정, regression evidence를 확인합니다. |
| B | Thread 흐름에서 맡는 구현 역할과 필요한 코드·상태 변화를 확인합니다. S/A와 같은 분량을 기계적으로 요구하지 않습니다. |
| C | Thread 이해에 필요한 맥락만 기록합니다. 실행 mechanism 또는 invariant를 만들지 않는 commit에 과도한 분석란을 채우지 않습니다. |

## 6. 실제 코드 삽입 기준

코드는 설명을 대신하기 위해 대량 복사하지 않습니다. 다음을 증명하는 최소 연속 구간만 삽입합니다.

- 구조체가 무엇을 소유하고 무엇을 빌리는지
- state가 어느 mutex 경계에서 읽히거나 변경되는지
- 두 lock의 획득 순서와 해제 순서
- 성공한 자원만 ledger에 반영되는 지점
- failure branch가 어떤 상태를 남기고 어디로 전파되는지
- operation이 시작되는 지점과 commit되는 지점
- test wrapper가 failure를 주입하는 지점과 production path로 연결되는 지점

코드 기록에는 다음 정보를 함께 적습니다.

```text
SHA:
파일:
symbol:
line 범위 또는 주변 문맥:
이 구간이 증명하는 내용:
직전 SHA와 달라진 점:
```

전체 파일, 관계없는 helper, final HEAD의 정리된 버전은 삽입하지 않습니다.

## 7. Test commit 학습 방법

Test commit에서는 production 설명과 test technique을 분리합니다. 각 기록에는 반드시 다음을 포함합니다.

- 대상으로 삼는 production invariant
- 재현하는 failure 또는 boundary
- 사용하는 technique
- 실제로 통과하는 production 코드 경로
- 핵심 assertion과 관찰값
- 테스트가 증명하는 것
- 테스트가 증명하지 않는 것
- broad integration test인지 deterministic regression인지
- 후속 변경에서 막아야 하는 회귀

테스트가 timeout, wrapper, macro substitution, child process, 반복 실행, sanitizer를 사용한다면 그 장치가 어떤 불확실성을 제거하거나 어떤 한계를 남기는지 기록합니다. 한 번 통과한 실행을 race freedom, fairness, deadlock freedom 또는 모든 schedule의 증명으로 확대하지 않습니다.

## 8. 문서 완료 기준

문서 세트는 다음 조건을 모두 만족할 때 완료된 것으로 봅니다.

- 모든 Thread의 commit을 source 순서대로 검토했습니다.
- 모든 기록이 해당 SHA의 코드 또는 해당 SHA에서 실행한 test 결과를 가리킵니다.
- S commit마다 architecture, invariant, failure, 후속 fix/test의 연결을 설명할 수 있습니다.
- A commit마다 주요 boundary 또는 failure path와 설계 판단을 설명할 수 있습니다.
- B/C commit을 필요 이상으로 부풀리지 않았습니다.
- fix마다 기존 가정, failure 또는 위험, root cause, 수정된 invariant, 실제 수정 코드, regression evidence가 연결됩니다.
- test마다 증명 범위와 비증명 범위가 분리되어 있습니다.
- 각 Invariant ledger가 도입·강화·부족함·복구·검증의 흐름을 보여 줍니다.
- Thread 최종 상태와 architecture 또는 execution flow를 commit history에 근거해 설명할 수 있습니다.
- final HEAD를 과거 commit의 근거로 사용한 기록이 없습니다.

## 9. 완료본 검증 기록

### 적용한 범위

| 항목 | 값 |
| --- | --- |
| Repository | `seungwoo7050/42-archive` |
| Branch | `c/philo` |
| 확인한 branch HEAD | `12b29d75ccc98311cd8da1217ababbe21de64026` |
| Scaffold source | `development-thread-workbook/scaffold/` |
| Completed output | `development-thread-workbook/completed/` |
| Thread 수 | 5 |
| 참조 commit 수 | 29 |

다른 branch의 구현·test·문서·build logic은 사용하지 않았습니다.

### 스캐폴드 원본 일치 검증

로컬 작업용 scaffold 파일은 Git blob hash를 계산해 `c/philo`의 원격 blob과 일치시켰습니다.

| 파일 | Git blob SHA |
| --- | --- |
| `README.md` | `b030e86400c669094baa0a21b4687c0752ce3a34` |
| `01-ownership-ledger-to-unsafe-destruction.md` | `ac2b19be323faa17ca967b66b78fdb83358cc561` |
| `02-wall-clock-to-shared-monotonic-start.md` | `174cceeff5a52f411f58a1bc4ad0f3274ae88720` |
| `03-core-routine-to-committed-meal-progress.md` | `4bcb96fee5e311455c9eca32163962c02e9b0d2e` |
| `04-serialized-output-to-linearized-terminal-state.md` | `b8b6de07d7567f4d389654d5ea2e5a290e0ebda8` |
| `05-layered-evidence-for-concurrent-behavior.md` | `40cacef3a1d6c0b3fd7f4d5f7af800563984e28c` |

고정된 Thread 구성, commit map, SHA, subject, importance, tags, source-defined role과 invariant 문구는 유지했습니다. learner-facing checkbox·빈 표·빈 결론란만 완료 상태로 바꾸고, 각 문서의 `§12 저장소 기반 완료 기록`에 실제 SHA별 근거를 추가했습니다.

### branch ancestry 검증

아래 29개 SHA 각각을 `c/philo` HEAD와 비교했습니다. 모든 비교에서 해당 SHA가 merge base와 일치하고 branch가 그 SHA보다 앞선 상태여서 branch ancestry에 속함을 확인했습니다.

```text
16343e76b54b  1d69df7db78c  10665e0a5bf9  800408d6d84e
 a7783d04107f  7586b605302b  37b29557cccc
509453b01515  a21e4cc75272  5b32d5bdb955  f01d62cde8ce
 e7e62cbe185f  bfbfa0431732  f57f6ec0be87
b68f40819af4  c8531c91f0fb  fe0a2d15b29b  53e591effb4a
 73b5551a76f4  4c224ae86f2b  054ef46f80c7
033ad537d166  40ea0f871300  a2e90b84641b  c424b7d91ed1
bd6bb8eb18f4  f145d33f2773  3d24bea01441  20f8270c78bb
```

### 증거 구분

| 증거 종류 | 수행 여부 | 기록 방식 |
| --- | --- | --- |
| 해당 SHA의 commit diff와 파일 검토 | 수행 | 각 Thread §12에 SHA·파일·symbol·state mutation·failure/test mechanism을 기록했습니다. |
| branch ancestry 확인 | 수행 | 29개 SHA를 branch HEAD와 개별 비교했습니다. |
| scaffold blob 일치 확인 | 수행 | 위 Git blob SHA 표로 기록했습니다. |
| production build 및 test 실행 | 미수행 | 로컬 환경에서 GitHub checkout을 위한 DNS/network 연결이 차단됐습니다. 실행 통과를 주장하지 않습니다. |
| test source의 injection/assertion 검토 | 수행 | deterministic wrapper, child process, timeout, repeated workload, TSAN probe를 code-inspection evidence로 구분했습니다. |
| completed directory 구조 검증 | 수행 | scaffold와 동일한 6개 상대 경로만 포함하고 추가 문서를 만들지 않았습니다. |

문서의 `[x]`는 해당 코드·test mechanism을 저장소에서 확인하고 설명을 작성했다는 뜻입니다. production 명령을 실제 실행했다는 표시는 아닙니다. 실행 결과가 필요한 항목은 각 Thread에서 source inspection과 runtime evidence를 구분했습니다.

### Thread별 최종 연결

| Thread | 최종 복원 결과 |
| --- | --- |
| 01 | table ownership과 partial-init ledger가 successful join 기반 destruction permission 및 `PHILO_UNSAFE`/`_exit`까지 확장됩니다. |
| 02 | wall-clock helper가 monotonic `int64_t` time model로 교정되고 all-ready barrier가 one shared start epoch를 publish합니다. |
| 03 | fork acquisition attempt가 full-duration·active-state recheck를 통과한 committed meal progress로 정교화되며 internal counter range가 확장됩니다. |
| 04 | complete-line serialization이 fresh death revalidation과 common lock order를 통한 terminal-state linearization으로 강화됩니다. |
| 05 | smoke, grammar, repeated concurrency, focused contention, TSAN이 서로 다른 failure class를 관찰하는 verification stack을 구성합니다. |

### 실행한 로컬 완료본 검증

다음 검증은 문서·archive 구조에 대한 것이며 production code test가 아닙니다.

```sh
python /tmp/validate_philo_workbook.py
```

결과:

```text
scaffold files: 6
completed files: 6
commit-map SHAs: 29
markdown_it parsed all files
VALIDATION OK
```

validator는 다음을 확인했습니다.

- scaffold와 completed의 상대 파일 집합이 동일합니다.
- `README.md`와 5개 Thread 문서 외 파일이 없습니다.
- commit map의 SHA, 순서, subject, importance, tags, source-defined role이 원본과 같습니다.
- section 12 이전의 고정 스캐폴드 문구는 checkbox·빈 learner field를 제외하고 원본과 같습니다.
- unchecked checkbox, 빈 table cell, 비어 있는 결론 placeholder가 남지 않았습니다.
- fenced code block과 Markdown table 구조가 유효하고 모든 파일을 CommonMark parser가 읽었습니다.
