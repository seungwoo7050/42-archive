# libft Development Thread 학습 골격

## 목적

이 문서 세트는 `commit-importance.md`에 정의된 Development Thread를 따라 실제 commit history와 해당 SHA의 코드를 직접 읽으면서 `libft`의 설계, 구현, 실패 처리, 수정, 검증 과정을 복원하기 위한 학습 골격입니다.

완성형 해설서가 아닙니다. source에 이미 확정된 thread 구조, commit metadata, 역할, 중요도와 연결 관계만 고정하고, 실제 구현 해석과 실행 결과는 학습자가 채웁니다.

## 권장 학습 순서

1. [`01-non-overlap-copy-and-overlap-safe-movement.md`](01-non-overlap-copy-and-overlap-safe-movement.md)
2. [`02-single-allocation-to-rollback-safe-ownership.md`](02-single-allocation-to-rollback-safe-ownership.md)
3. [`03-fd-output-partial-system-calls.md`](03-fd-output-partial-system-calls.md)
4. [`04-static-archive-release-verification.md`](04-static-archive-release-verification.md)

이 순서는 source의 Development Threads 순서를 그대로 따릅니다.

## Thread 문서 사용법

- 먼저 Commit map에서 thread의 commit 순서와 각 commit의 역할을 확인합니다.
- 각 commit은 반드시 해당 SHA로 checkout하거나 그 SHA의 tree를 직접 열어 확인합니다.
- 필요하면 문서가 지시하는 이전 관련 SHA와 비교합니다.
- source에 확정된 설명과 실제 코드에서 직접 확인한 사실을 구분해서 기록합니다.
- 구현 코드를 붙일 때는 전체 파일보다 판단에 필요한 최소 범위만 삽입하고, caller/callee, state mutation, ownership transfer, failure branch가 끊기지 않게 주변 문맥을 포함합니다.
- Thread 마지막에는 commit별 기록을 다시 연결하여 invariant, failure → fix → test, 책임 변화, 최종 execution flow를 학습자 자신의 설명으로 정리합니다.

## 해당 SHA 코드 확인 원칙

- final HEAD를 과거 commit 설명에 소급해서 사용하지 않습니다.
- 각 commit의 구현은 해당 SHA 시점의 코드로만 판단합니다.
- 변경 전 상태가 필요하면 해당 commit의 parent 또는 문서에 지정된 이전 관련 SHA를 확인합니다.
- 후속 fix/test는 후속 SHA에서 따로 확인하고, 이전 SHA의 구현에 소급 적용하지 않습니다.
- source에 없는 파일명, 함수 관계, failure path를 추정해 확정 사실처럼 기록하지 않습니다.

## Importance별 학습 깊이

- **S**: 프로젝트 핵심 architecture/invariant로 추적합니다. 문제, 직전 상태, 실패 가능성, 핵심 결정, 실제 핵심 코드, ownership/lifecycle/state transition, 후속 fix/test까지 연결합니다.
- **A**: 주요 subsystem, boundary, failure path, integration point를 중심으로 핵심 코드와 설계 판단까지 확인합니다.
- **B**: thread 흐름에서 맡는 구현 역할과 필요한 코드·상태 변화를 확인합니다. S/A와 같은 분량을 기계적으로 요구하지 않습니다.
- **C**: thread 이해에 필요한 맥락일 때만 사용합니다. 이 문서 세트의 source-defined Development Threads에는 C commit이 포함되어 있지 않습니다.

## 실제 코드 삽입 기준

- 함수 전체가 아니라 판단 근거가 되는 최소 코드 범위를 우선합니다.
- 조건문 하나만 떼어 의미가 사라지면 caller/callee 또는 초기화/cleanup 부분까지 함께 붙입니다.
- ownership을 다룰 때는 획득, 이전, 실패 시 해제, 성공 시 반환 지점을 함께 보이게 합니다.
- system call을 다룰 때는 반환값 처리, progress 갱신, retry/stop 조건을 함께 보이게 합니다.
- test를 다룰 때는 failure 주입 지점, production 경로 진입 지점, assertion 또는 측정 지점을 함께 보이게 합니다.
- release 검증을 다룰 때는 build flag, archive/symbol/dependency 검사, external consumer 또는 compiler 실행을 실제로 연결하는 지점을 우선합니다.

## Test commit 학습 방법

각 test commit에서 다음을 구분하여 기록합니다.

- 대상으로 하는 production invariant
- 재현하는 failure 또는 boundary
- 사용하는 test technique
- 실제로 통과하는 production 코드 경로
- 테스트가 증명하는 것
- 테스트가 증명하지 않는 것
- broad integration test인지 deterministic regression인지, 또는 그 외 성격인지
- 후속 변경에서 막아야 할 회귀

source에 test technique이 확정되어 있으면 그 사실은 고정하고, 실제 test code와 실행 결과는 해당 SHA에서 직접 확인합니다.

## 문서 완료 기준

모든 thread에서 다음 조건을 만족해야 완료로 봅니다.

- commit 순서를 따라 직전 상태 → 결정 → 구현 → failure/fix/test 연결을 설명할 수 있습니다.
- 중요한 invariant가 어느 commit에서 도입, 강화, 부족함 노출, 복구, 검증되었는지 실제 코드 근거와 함께 기록되어 있습니다.
- S/A commit은 핵심 코드와 failure path를 SHA 기준으로 직접 확인했습니다.
- test commit은 production 경로와 증명 범위를 분리해 기록했습니다.
- final HEAD를 과거 설명에 소급 사용한 기록이 없습니다.
- Thread 최종 상태와 architecture 또는 execution flow를 source 요약 복사가 아니라 학습자 자신의 코드 근거로 설명할 수 있습니다.
