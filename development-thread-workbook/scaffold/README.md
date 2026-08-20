# ft_printf Development Thread 학습 골격

## 목적

이 디렉터리는 `commit-importance.md`와 `commit-bodies.md`에서 확정된 Development Thread를 따라 실제 commit history와 해당 SHA의 코드를 직접 읽으며 프로젝트의 설계, 구현, failure handling, 수정, 검증 과정을 복원하기 위한 학습 골격입니다.

완성형 해설서가 아닙니다. 각 Thread 문서는 source에서 이미 확정된 제목, significance, SHA, subject, importance, tags, commit 관계와 역할만 미리 제공합니다. 실제 함수 동작, 변경 전후 코드, ownership/lifetime, failure path, test 결과, 최종 설명은 학습자가 repository의 정확한 SHA를 확인한 뒤 채웁니다.

## 권장 학습 순서

1. [`01-output-state-system-call-boundary.md`](01-output-state-system-call-boundary.md)
2. [`02-format-fields-typed-dispatch.md`](02-format-fields-typed-dispatch.md)
3. [`03-shared-numeric-layout.md`](03-shared-numeric-layout.md)
4. [`04-string-precision-bounded-access.md`](04-string-precision-bounded-access.md)
5. [`05-whole-call-preflight.md`](05-whole-call-preflight.md)
6. [`06-runtime-artifact-verification.md`](06-runtime-artifact-verification.md)

이 순서는 `commit-importance.md`의 Development Threads 순서를 그대로 따릅니다. 동일 commit이 여러 Thread에 등장하는 경우 의도적인 중복입니다. 각 Thread에서 서로 다른 학습 관점으로 다시 확인합니다.

## Thread 문서 사용법

- 먼저 Thread 목표, 핵심 질문, 완료 기준을 읽습니다.
- Commit map의 순서를 바꾸지 않고 각 SHA를 차례로 checkout 또는 `git show`로 확인합니다.
- 각 commit의 “해당 SHA에서 확인할 코드” 항목에 따라 실제 파일 경로, 함수, 구조체, branch, caller/callee를 직접 찾아 기록합니다.
- fix commit은 직전 관련 상태와 실제 수정 diff를 함께 확인합니다.
- test commit은 production invariant와 failure/boundary, test technique, 통과하는 production path를 분리해서 기록합니다.
- Thread가 끝나면 Invariant ledger와 Failure → Fix → Test 연결을 실제 코드 근거로 완성합니다.
- 마지막에 Thread 최종 상태와 architecture/execution flow를 자신의 설명으로 정리합니다.

## 해당 SHA 코드 확인 원칙

- 반드시 문서에 적힌 정확한 SHA 시점의 코드를 확인합니다.
- 현재 checkout이 다른 commit이라면 그 상태의 코드로 대신 판단하지 않습니다.
- 변경 전 상태가 필요하면 해당 commit의 parent 또는 문서가 지목한 직전 관련 SHA를 확인합니다.
- source 문서가 실제 파일명이나 함수명을 확정하지 않은 경우, 이 골격이 이름을 추측하지 않습니다. 학습자가 해당 SHA의 diff에서 정확한 이름을 찾아 기록합니다.
- 코드 발췌는 학습 근거가 되는 최소 범위만 넣고, 발췌한 SHA와 경로를 함께 기록합니다.

## final HEAD 소급 사용 금지

final HEAD의 구현을 과거 commit의 정답처럼 소급해서 사용하지 않습니다. 후속 refactor/fix에서 함수 경계, state representation, failure behavior가 바뀔 수 있으므로 각 학습 기록은 반드시 해당 SHA 시점의 코드에 근거해야 합니다.

## Importance별 학습 깊이

- `S`: project-defining architecture/invariant입니다. 직전 상태, problem, 기존 설계의 한계, failure possibility, 핵심 decision, 실제 핵심 코드, ownership/lifecycle/state transition, 후속 fix/test까지 깊게 추적합니다.
- `A`: 주요 subsystem, responsibility boundary, failure path, integration point입니다. 핵심 코드와 설계 판단, edge case, 보장/미보장 범위를 확인합니다.
- `B`: Thread 흐름에서 맡는 구현 역할과 필요한 코드/state 변화까지 확인합니다. S/A와 같은 분석란을 기계적으로 반복하지 않습니다.
- `C`: Thread 이해에 필요한 맥락만 확인합니다. 이 source의 Development Threads에는 C-level commit이 포함되어 있지 않지만, 학습 원칙은 동일합니다.

## 실제 코드 삽입 기준

- source에 이미 확정된 설명을 다시 장문의 해설로 복사하지 않습니다.
- 학습자가 직접 확인한 핵심 함수/구조체/조건식/state mutation/test seam만 최소한으로 발췌합니다.
- fix는 가능하면 parent 또는 직전 관련 SHA의 대응 코드와 수정 SHA의 코드를 함께 기록합니다.
- ownership/lifecycle은 선언만 보지 말고 생성/초기화, 전달, mutation, cleanup/종료 지점을 함께 확인합니다.
- failure path는 정상 경로와 별도로 branch 조건, state mutation, 이후 호출 억제, public consequence를 추적합니다.
- test code는 fixture 전체를 복사하기보다 failure injection 지점과 핵심 assertion을 중심으로 기록합니다.

## Test commit 학습 방법

각 test commit에서는 다음을 반드시 구분합니다.

- 어떤 production invariant를 대상으로 하는가
- 어떤 failure 또는 boundary를 재현하는가
- 어떤 test technique을 사용하는가
- 실제 어떤 production code path를 통과하는가
- 이 test가 증명하는 것은 무엇인가
- 이 test가 증명하지 않는 것은 무엇인가
- broad integration인지 deterministic regression인지
- 후속 변경에서 어떤 회귀를 막는가

테스트를 직접 실행한 경우 command, compiler/runtime environment, 실제 result를 추가합니다. 실행하지 않았다면 source description을 실행 결과처럼 작성하지 않습니다.

## 문서 완료 기준

- 모든 Development Thread 문서를 source 순서대로 완료했습니다.
- 각 Thread의 모든 commit을 문서에 적힌 SHA에서 확인했습니다.
- SHA, subject, importance, tags를 source와 다르게 바꾸지 않았습니다.
- S/A/B/C에 따른 학습 깊이를 구분했습니다.
- 각 중요한 commit에서 실제 파일/함수/상태/branch를 직접 찾아 기록했습니다.
- fix마다 가능한 범위에서 기존 가정 → failure/risk → root cause → 수정 decision → 실제 코드 → regression test 연결을 완성했습니다.
- test commit마다 production invariant와 test technique, production path, proved/not-proved 범위를 구분했습니다.
- Invariant ledger와 Failure → Fix → Test 표를 실제 코드 근거로 완성했습니다.
- Thread 마지막에서 final architecture/execution flow를 commit history에 근거해 설명할 수 있습니다.
