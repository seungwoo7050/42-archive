# cpp-foundation Development Threads

## 목적

이 디렉터리는 `commit-importance.md`에 정의된 Development Threads를 따라 실제 commit history와 각 SHA의 코드를 직접 읽으며 프로젝트의 설계 → 구현 → 실패 → 수정 → 검증 과정을 복원하기 위한 학습 골격입니다.

완성형 프로젝트 해설서가 아닙니다. 미리 작성된 내용은 source에서 확정된 thread 구조, commit metadata, 역할, invariant/failure 방향뿐이며, 실제 구현 해석과 코드 증거는 학습자가 채웁니다.

## 권장 학습 순서

1. [`01-direct-ownership-failure-safe-value.md`](01-direct-ownership-failure-safe-value.md)
2. [`02-polymorphic-cloning-owning-aggregate.md`](02-polymorphic-cloning-owning-aggregate.md)
3. [`03-factory-transaction-boundary.md`](03-factory-transaction-boundary.md)
4. [`04-scalar-text-target-projection.md`](04-scalar-text-target-projection.md)
5. [`05-checked-rpn-undefined-arithmetic.md`](05-checked-rpn-undefined-arithmetic.md)
6. [`06-generic-containers-transactional-batch.md`](06-generic-containers-transactional-batch.md)
7. [`07-contactbook-replacement-guarantee.md`](07-contactbook-replacement-guarantee.md)
8. [`08-verification-supported-release-claims.md`](08-verification-supported-release-claims.md)

순서는 source의 Development Threads 순서를 그대로 따릅니다. 동일 commit이 여러 thread에 등장하는 경우 제거하지 않고 각 thread 관점에서 다시 확인합니다.

## Thread 문서 사용법

각 문서에서 먼저 Thread 목표, 핵심 질문, 완료 기준, Commit map을 읽습니다. 이후 commit을 map 순서대로 진행합니다.

각 commit에서는 다음 원칙을 지킵니다.

- 먼저 해당 SHA를 checkout하거나 `git show <sha>`로 정확한 시점의 diff와 파일을 확인합니다.
- 문서가 지목한 type/function/state/test를 해당 SHA에서 직접 찾습니다.
- 필요하면 문서가 지정한 직전 관련 SHA와 비교합니다.
- source에 없는 파일명, 함수명, ownership 관계를 추정해 채우지 않습니다.
- 학습 기록에는 실제 확인한 경로, 심볼, 코드 라인, test case를 근거로 남깁니다.

## 해당 SHA 코드 확인 원칙

**final HEAD의 코드를 과거 commit 설명에 소급해서 사용하지 않습니다.**

후속 refactor나 fix가 이미 적용된 HEAD를 기준으로 과거 설계를 설명하면 failure 원인과 수정 경계가 사라집니다. 반드시 학습 대상 commit의 tree를 기준으로 확인하고, 전후 비교가 필요할 때만 관련 SHA끼리 비교합니다.

권장 최소 기록 형식은 다음과 같습니다.

```text
SHA:
Path:
Symbol / test case:
직전 관련 SHA:
확인한 state / ownership / failure path:
이 코드가 증명하는 invariant:
```

## Importance별 학습 깊이

### S

프로젝트의 핵심 architecture/invariant입니다. 직전 상태, problem, failure 가능성, decision, 핵심 코드, ownership/lifecycle/state transition, failure path, 보장/비보장 범위, 후속 fix/test까지 추적합니다.

### A

주요 subsystem, boundary, failure path, integration point입니다. 핵심 코드와 설계 판단, 전후 state 변화, test evidence까지 확인합니다.

### B

Thread 흐름에서 맡는 구현 역할과 필요한 state/API 변화를 확인합니다. S/A와 동일한 깊이의 분석란을 억지로 만들지 않습니다.

### C

Thread 이해에 필요한 맥락으로만 사용합니다. source에 C commit이 Thread에 포함되지 않았다면 별도 학습 항목을 추가하지 않습니다.

## 실제 코드 삽입 기준

문서에 코드를 붙일 때는 설명용으로 재작성하지 말고 **해당 SHA의 실제 코드**만 사용합니다.

- 핵심 invariant를 직접 만드는 상태 필드나 함수
- ownership transfer, clone, delete, swap, candidate publication 지점
- failure/error branch와 cleanup path
- parser boundary, overflow precondition, stream-state 판정
- production path를 실제 통과하는 regression test
- fix 전/후 차이를 보여 주는 최소 코드

코드 발췌에는 SHA, path, symbol을 함께 적습니다. 긴 파일 전체를 복사하지 않습니다.

## Test commit 학습 방법

Test commit에서는 단순히 "테스트가 통과했다"고 기록하지 않습니다. 반드시 다음을 구분합니다.

- 어떤 production invariant를 대상으로 하는가
- 어떤 failure 또는 boundary를 재현하는가
- 어떤 test technique을 사용하는가
- 실제 어떤 production code path를 통과하는가
- 이 테스트가 증명하는 것
- 이 테스트가 증명하지 않는 것
- broad integration인지 deterministic regression/failure injection인지
- 후속 변경에서 어떤 회귀를 막는가

실행 결과는 사용한 compiler/build target과 함께 학습자가 직접 기록합니다.

## 문서 완료 기준

Thread 하나는 다음 조건을 모두 만족해야 완료입니다.

- Commit map의 모든 SHA를 source 순서대로 확인했습니다.
- S/A/B/C 중요도에 맞는 깊이로 실제 코드 근거를 채웠습니다.
- Invariant ledger에 introduction/strengthening/failure/fix/test 흐름을 실제 코드 증거와 연결했습니다.
- fix commit은 기존 가정 → failure/risk → root cause → 수정 decision → 실제 수정 코드 → regression test가 연결되어 있습니다.
- test commit은 production invariant, failure boundary, technique, production path, 증명/비증명 범위가 구분되어 있습니다.
- ownership/state/responsibility 변화가 의미 있는 thread에서는 transition을 직접 설명할 수 있습니다.
- Thread 최종 상태와 execution/architecture flow를 final HEAD가 아닌 해당 commit sequence를 근거로 설명할 수 있습니다.
