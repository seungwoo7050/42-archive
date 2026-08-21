# push_swap Development Thread Study Scaffold

## 목적

이 디렉터리는 `commit-importance.md`에 정의된 Development Threads를 그대로 따라가며 `push_swap`의 commit history를 복습하기 위한 학습 골격입니다. 완성형 해설서가 아니라, 학습자가 각 commit SHA의 실제 코드를 직접 읽고 설계 → 구현 → 실패/위험 → 수정 → 검증의 발전 과정을 복원하도록 구성되어 있습니다.

## 권장 학습 순서

1. [Parallel stack state and operation invariants](01-parallel-stack-state-and-operation-invariants.md)
2. [Input grammar, coordinate compression, and size safety](02-input-grammar-coordinate-compression-and-size-safety.md)
3. [Building the sorting engine](03-building-the-sorting-engine.md)
4. [Independent correctness and cost evidence](04-independent-correctness-and-cost-evidence.md)
5. [Checker protocol and verdict hardening](05-checker-protocol-and-verdict-hardening.md)
6. [Runtime fault injection and output failure propagation](06-runtime-fault-injection-and-output-failure-propagation.md)

이 순서는 source의 Development Thread 나열 순서를 그대로 사용합니다.

## Thread 문서 사용법

- 먼저 Thread 목표, 핵심 질문, 완료 기준을 읽습니다.
- Commit map의 순서를 바꾸지 않고 각 SHA를 차례대로 checkout 또는 `git show`로 확인합니다.
- `Source-confirmed` 항목은 두 source 문서가 이미 확정한 사실입니다. 재평가하지 않습니다.
- 학습 기록란에는 실제 해당 SHA의 코드에서 직접 확인한 내용만 채웁니다.
- Invariant ledger와 Failure → Fix → Test 표는 commit을 개별 기능 목록으로 외우지 않고 시간에 따른 contract 변화를 연결하는 용도로 사용합니다.

## 해당 SHA 코드 확인 원칙

- 반드시 기록 대상 commit SHA 시점의 코드를 확인합니다.
- 먼저 `git show --name-only <sha>`로 실제 변경 파일을 확정한 뒤 `git show <sha> -- <path>` 또는 `git show <sha>:<path>`로 확인합니다.
- 변경 전 상태가 필요하면 parent 또는 문서가 지정한 직전 관련 SHA와 비교합니다.
- 같은 이름의 함수가 현재도 존재한다는 이유로 final HEAD 구현을 과거 commit의 근거로 사용하지 않습니다.
- 파일명이나 symbol이 source에 명시되지 않은 경우 임의로 추정하지 말고 해당 commit의 changed-file 목록에서 먼저 확정합니다.

## final HEAD 소급 사용 금지

final HEAD에는 후속 fix, failure propagation, testability seam이 이미 섞여 있을 수 있습니다. 과거 commit의 설계와 한계를 설명할 때 final HEAD 코드를 사용하면 실제 발전 순서가 사라집니다. 각 문서의 모든 코드 근거에는 가능하면 `SHA:path:symbol`을 함께 기록합니다.

## S/A/B/C별 학습 깊이

- **S:** 프로젝트 핵심 architecture/invariant 또는 일반 sorting mechanism으로 다룹니다. 직전 상태, 문제, 기존 설계의 한계, 결정, 실제 핵심 코드, ownership/lifecycle/state transition, failure scenario, 보장/비보장, 후속 fix/test까지 추적합니다.
- **A:** 주요 subsystem, boundary, failure path, integration point를 추적합니다. 핵심 코드와 설계 판단, 책임 변화, 검증 연결을 확인합니다.
- **B:** Thread 흐름에서 맡는 구현 역할과 필요한 코드/state 변화를 확인합니다. S/A와 같은 깊이를 기계적으로 반복하지 않습니다.
- **C:** source의 Development Threads에는 C commit이 포함되어 있지 않습니다. 다른 문맥에서 C commit을 볼 때는 Thread 이해에 필요한 경우만 배경으로 사용합니다.

## 실제 코드 삽입 기준

- 설명에 직접 필요한 최소 코드만 삽입합니다.
- 코드 앞에 대상 SHA와 path/symbol을 기록합니다.
- 함수 전체를 복사하기보다 invariant, ownership transfer, state mutation order, failure branch, cleanup, test injection을 보여주는 구문을 우선합니다.
- 변경 전/후 비교가 핵심인 fix에서는 두 SHA의 대응 구문을 함께 남깁니다.
- source에 없는 구현 세부를 추측해서 정답처럼 채우지 않습니다.

## Test commit 학습 방법

각 test commit에서는 다음을 구분해서 기록합니다.

- 대상 production invariant
- 재현하는 failure 또는 boundary
- 사용한 test technique
- 실제 통과하는 production code path
- 테스트가 증명하는 것
- 테스트가 증명하지 않는 것
- broad integration인지 deterministic regression인지 또는 다른 명시적 성격인지
- 후속 변경에서 막는 회귀

특히 product code와 test oracle이 구현을 공유하는지 여부를 확인합니다. 독립 모델, fault injection, deterministic resource baseline, sanitizer는 서로 다른 종류의 evidence이므로 한 종류가 다른 종류를 대체한다고 가정하지 않습니다.

## 문서 완료 기준

- 모든 Thread 문서를 source 순서대로 완료했습니다.
- 각 commit의 SHA, subject, importance, tags를 바꾸지 않았습니다.
- 모든 코드 근거를 대상 SHA에서 직접 확인했습니다.
- S/A/B 깊이를 구분했고 test/fix commit의 학습 구조를 채웠습니다.
- 각 Thread의 invariant ledger와 Failure → Fix → Test 연결이 실제 code/test 근거로 완성되었습니다.
- 프로젝트를 다시 처음부터 읽지 않아도 commit history를 근거로 설계 → 구현 → 실패/위험 → 수정 → 검증의 변화를 설명할 수 있습니다.
