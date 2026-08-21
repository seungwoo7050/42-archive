# miniRT Development Thread 학습 골격

## 목적

이 문서 세트는 `commit-importance.md`에 정의된 Development Threads와
`commit-bodies.md`의 commit 의도를 기준으로, 실제 commit history와 해당 SHA의 코드를
직접 읽으며 설계 → 구현 → 실패 → 수정 → 검증 과정을 복원하기 위한 학습 골격입니다.

완성형 프로젝트 해설서가 아닙니다. 각 문서의 빈 기록란은 학습자가 해당 SHA의 코드,
직전 관련 SHA의 코드, production test path를 직접 확인한 뒤 채워야 합니다.

## 권장 학습 순서

1. [`01-geometric-contracts-to-first-image.md`](01-geometric-contracts-to-first-image.md)
2. [`02-large-vector-normalization.md`](02-large-vector-normalization.md)
3. [`03-correctness-preserving-bvh.md`](03-correctness-preserving-bvh.md)
4. [`04-material-syntax-and-reflection.md`](04-material-syntax-and-reflection.md)
5. [`05-deterministic-tiled-rendering.md`](05-deterministic-tiled-rendering.md)
6. [`06-image-representation-and-atomic-output.md`](06-image-representation-and-atomic-output.md)
7. [`07-reproducible-verification.md`](07-reproducible-verification.md)

Thread 순서와 각 Thread 내부 commit 순서는 source의 Development Threads를 그대로 따릅니다.
동일 commit이 여러 Thread에 나타나는 경우에는 각 문서에서 별도로 확인해야 하며,
임의로 중복을 제거하지 않습니다.

## Thread 문서 사용법

각 commit은 다음 순서로 학습합니다.

1. commit map에서 SHA, subject, importance, tags, source-defined role을 확인합니다.
2. 반드시 해당 SHA를 checkout하거나 `git show`로 해당 시점의 파일을 읽습니다.
3. 문서에 지정된 심볼, caller/callee, state mutation, ownership, failure branch, test path를 확인합니다.
4. 필요한 최소 코드만 증거로 삽입하고, 코드가 증명하는 contract를 직접 설명합니다.
5. 직전 관련 commit과 비교해 무엇이 새로 보장되고 무엇이 아직 보장되지 않는지 적습니다.
6. Thread의 invariant ledger와 Failure → Fix → Test 표를 실제 코드 근거로 완성합니다.
7. 마지막에 execution flow와 architecture 설명을 자신의 문장으로 작성합니다.

## 해당 SHA 코드 확인 원칙

다음과 같은 방식으로 특정 시점의 코드를 확인합니다.

```sh
git show <sha> --stat
git diff <sha>^ <sha> -- <path>
git show <sha>:<path>
git grep -n "<symbol>" <sha> -- .
```

- `git show <sha>:<path>`로 해당 SHA의 파일 내용을 읽습니다.
- 변경 전 상태는 우선 `<sha>^` 또는 문서에 지정된 직전 관련 SHA와 비교합니다.
- test commit은 test code만 읽지 말고 실제로 통과하는 production function path까지 추적합니다.
- source가 특정 follow-up fix/test를 연결한 경우 그 SHA를 별도로 열어 비교합니다.
- path와 symbol name은 실제 repository에서 확인한 값을 기록합니다.

## final HEAD 소급 사용 금지

최종 HEAD의 구조, 이름, private field, helper, option, error handling을 과거 commit에 소급해
설명하면 안 됩니다. 각 기록은 반드시 해당 SHA에서 관찰한 코드만 근거로 작성합니다.

과거 SHA에 아직 존재하지 않는 후속 보장은 다음과 같이 구분합니다.

- 해당 SHA가 이미 보장하는 것
- 해당 SHA에서는 아직 보장하지 않는 것
- 후속 어느 commit이 그 공백을 보완하는지

## Importance별 학습 깊이

### S

프로젝트의 핵심 architecture 또는 invariant로 취급합니다.

- 직전 상태와 문제
- 기존 설계의 부족한 점
- 핵심 decision
- 실제 핵심 코드와 caller/callee
- ownership, lifecycle, state transition
- 주요 failure path
- 이 SHA가 보장하는 것과 아직 보장하지 않는 것
- 후속 fix와 regression test

위 항목을 빠짐없이 실제 코드 근거로 작성합니다.

### A

주요 subsystem, integration boundary, failure path, numerical/geometric decision을 이해하는 깊이입니다.

- 핵심 구현과 state change
- 선택한 algorithm 또는 boundary
- 위험한 edge/failure branch
- 관련 test 또는 benchmark evidence
- 다음 관련 commit과의 연결

### B

Thread 흐름에서 맡는 구현 역할을 이해하는 깊이입니다.

- 변경된 핵심 심볼
- 필요한 caller/callee
- state 또는 data representation의 변화
- 해당 commit이 Thread의 다음 단계에 제공하는 것
- 관련 regression이 있으면 그 production path

### C

Thread 이해에 필요한 맥락만 확인합니다. 문서 유지보수나 evidence snapshot을
S/A와 같은 깊이로 분석하지 않습니다. 현재 source의 Development Threads에는 C commit이 없지만,
다른 문맥에서 C commit을 참조할 때 이 기준을 적용합니다.

## 실제 코드 삽입 기준

코드는 설명을 대신하기 위한 대량 복사가 아니라 contract를 증명하기 위한 최소 증거로 삽입합니다.

- 핵심 field 또는 type declaration
- decision이 드러나는 condition/branch
- ownership transfer 또는 invalidation 지점
- caller에서 callee로 state가 전달되는 부분
- failure cleanup 또는 commit point
- regression이 주입하는 failure와 assertion
- 변경 전후 차이를 설명하는 데 필요한 최소 범위

코드마다 다음을 함께 기록합니다.

- SHA
- file path
- symbol
- 선택한 line 범위
- 이 코드가 증명하는 invariant 또는 state transition
- 이 코드만으로는 증명되지 않는 항목

## Test commit 학습 방법

각 test commit에서 반드시 다음을 구분합니다.

- 대상으로 삼는 production invariant
- 재현하는 failure 또는 boundary
- 사용한 test technique
- 실제로 통과하는 production code path
- test가 증명하는 것
- test가 증명하지 않는 것
- broad integration test인지 deterministic regression인지
- 후속 변경에서 막는 regression

golden checksum이나 byte comparison이 존재하는 경우, 값만 기록하지 말고
어떤 upstream behavior까지 포함하는지와 local encoding test와의 차이를 설명합니다.

## 문서 완료 기준

모든 Thread 문서에서 다음 조건을 만족해야 완료입니다.

- 모든 commit을 source 순서대로 학습했습니다.
- SHA, subject, importance, tags를 변경하지 않았습니다.
- 각 기록에 해당 SHA의 실제 file path와 symbol이 있습니다.
- final HEAD를 과거 commit 설명에 소급하지 않았습니다.
- S/A/B 깊이가 구분되어 있습니다.
- source가 확정하지 않은 구현 해석을 사실처럼 채우지 않았습니다.
- fix commit은 assumption → failure/risk → root cause → decision → code → regression으로 연결했습니다.
- test commit은 production path와 증명 범위를 구분했습니다.
- invariant ledger가 commit history에 따라 완성되었습니다.
- Thread의 최종 architecture 또는 execution flow를 실제 코드 근거로 설명할 수 있습니다.
- 별도의 프로젝트 재학습 없이 설계 → 구현 → 실패 → 수정 → 검증의 발전 과정을 설명할 수 있습니다.
