# Inception Development Thread 학습 골격

## 목적

이 문서 세트는 `web/inception`의 실제 commit history와 각 SHA 시점의 코드를 직접 읽으며 설계, 구현, 실패 처리, 수정, 검증의 발전 과정을 복원하기 위한 기록 골격입니다.

문서에 미리 작성된 SHA, subject, importance, tags, Thread 순서, Source-defined role과 분류 근거는 제공된 두 source 문서의 확정값입니다. 실제 함수 동작, 변경 전후 코드, ownership/lifetime, failure path, 테스트 실행 결과, 최종 설명은 학습자가 해당 SHA의 코드를 확인해 작성해야 합니다.

## 권장 학습 순서

1. [`01-readiness-aware-three-tier-stack.md`](01-readiness-aware-three-tier-stack.md)
2. [`02-convergent-one-off-bootstrap.md`](02-convergent-one-off-bootstrap.md)
3. [`03-isolated-runtime-and-persistence.md`](03-isolated-runtime-and-persistence.md)
4. [`04-atomic-backup-publication.md`](04-atomic-backup-publication.md)
5. [`05-fresh-project-restore.md`](05-fresh-project-restore.md)
6. [`06-credential-rotation-and-compensation.md`](06-credential-rotation-and-compensation.md)
7. [`07-immutable-build-inputs.md`](07-immutable-build-inputs.md)
8. [`08-operational-hardening-and-automation.md`](08-operational-hardening-and-automation.md)

이 순서는 source의 Development Threads 순서와 같습니다. 동일 SHA가 여러 Thread에 나타나면 제거하지 말고 각 문서의 관점으로 다시 확인합니다.

## Thread 문서 사용법

1. 먼저 Commit map으로 Thread의 상태 변화와 중요도 분포를 확인합니다.
2. 각 commit에서 `Source-defined role`, `Summary`, `Classification reason`을 읽고 source가 확정한 범위를 고정합니다.
3. `해당 SHA에서 확인할 코드`에 적힌 항목을 실제 tree와 diff에서 찾습니다.
4. 코드 근거 표에는 경로, symbol/directive, 핵심 line, caller/callee 또는 producer/consumer 관계를 함께 기록합니다.
5. Invariant ledger에서 도입, 강화, 부족함 노출, fix, regression test의 연결을 채웁니다.
6. Thread 마지막에는 최종 architecture 또는 execution flow를 자신의 코드 근거만으로 설명합니다.

## 해당 SHA 코드 확인 원칙

항상 commit 당시의 tree를 기준으로 확인합니다.

```bash
git show --stat --summary <sha>
git diff <sha>^ <sha> -- <path>
git show <sha>:<path>
```

Thread의 이전 관련 commit과 비교할 때는 다음처럼 별도 diff를 사용합니다.

```bash
git diff <previous-thread-sha> <current-sha> -- <path>
```

파일명이나 symbol이 source에 명시되지 않은 경우 먼저 `git show --name-status <sha>`로 변경 파일을 식별한 뒤 기록합니다. 최종 HEAD의 동일 파일을 열어 과거 commit의 동작을 추정하지 않습니다.

## final HEAD 소급 사용 금지

- 후속 refactor, fix, test에서 추가된 field, helper, marker, volume, network, timeout을 이전 SHA의 설계로 기록하지 않습니다.
- 현재 HEAD에서 사라진 초기 구현도 해당 SHA에서 직접 확인합니다.
- 후속 commit의 code는 “다음 변화” 또는 비교 대상으로만 사용하고 현재 commit의 근거로 대체하지 않습니다.
- source가 확정하지 않은 invariant를 새 사실처럼 추가하지 않습니다.

## Importance별 학습 깊이

### S

프로젝트의 defining architecture 또는 core state transaction으로 다룹니다. 문제, 직전 상태, failure 가능성, 핵심 결정, actual code, ownership/lifecycle/state transition, rollback/compensation, 보장과 비보장, 후속 fix/test까지 추적합니다.

### A

주요 subsystem, security/persistence/lifecycle boundary, integration point, non-trivial failure path를 이해할 수 있을 정도로 actual code와 설계 판단을 확인합니다. Test commit은 production invariant, injected failure, technique, traversed path, 증명 범위를 분리합니다.

### B

Thread 흐름에서 맡은 구현 역할과 필요한 상태 변화를 확인합니다. 핵심 파일, directive/helper, input/output, immediate failure branch, 다음 commit에 넘기는 한계를 기록합니다.

### C

Thread 이해에 필요한 맥락만 확인합니다. 동일한 깊이의 분석란을 억지로 확장하지 않습니다. 현재 Development Threads에는 C commit이 없지만 분류 원칙은 유지합니다.

## 실제 코드 삽입 기준

- 설명을 대신하는 대량 복사는 피하고 invariant, state mutation order, ownership transfer, failure branch를 증명하는 최소 범위만 삽입합니다.
- snippet마다 반드시 SHA, path, symbol/directive, line range 또는 인접 문맥을 기록합니다.
- shell/Compose/Python 설정은 caller와 consumer를 함께 적습니다. 예를 들어 environment mapping만 넣지 말고 이를 읽는 entrypoint/helper도 연결합니다.
- test code는 fixture setup, failure injection, production command/path, assertion을 한 세트로 기록합니다.
- code excerpt만으로 의미가 불분명하면 앞뒤 상태와 실패 시 결과를 자신의 문장으로 설명합니다.

## Test commit 학습 방법

각 Test commit에서 다음을 반드시 분리합니다.

- 대상으로 하는 production invariant
- 재현하는 failure 또는 boundary
- 사용하는 technique: static source contract, rendered configuration, live integration, deterministic pause/signal, SIGKILL, AST/control-flow probe 등
- 실제로 통과하는 production code path
- test가 증명하는 것
- test가 증명하지 않는 것
- broad integration인지 deterministic regression인지
- 후속 변경에서 막는 regression
- 직접 실행한 command와 실제 결과

테스트가 성공했다는 사실만 기록하지 말고 실패 주입 위치와 assertion이 production invariant에 연결되는 과정을 남깁니다.

## 문서 완료 기준

- 8개 Development Thread 문서의 모든 commit을 source 순서대로 검토했습니다.
- 모든 SHA, subject, importance, tags를 변경하지 않았습니다.
- 동일 commit이 여러 Thread에 있는 경우 각 관점의 기록을 모두 작성했습니다.
- 중요한 commit마다 해당 SHA의 실제 파일과 symbol/directive 근거가 있습니다.
- S/A/B/C 깊이 차이가 기록량과 질문 범위에 반영되어 있습니다.
- fix는 기존 가정 → failure/risk → root cause → corrected invariant → code → regression test로 연결했습니다.
- test는 production invariant, failure technique, traversed path, 증명/비증명 범위를 구분했습니다.
- 각 Thread의 Invariant ledger, Failure → Fix → Test, ownership/state 변화, final flow, 자가 점검을 완료했습니다.
- final HEAD의 구현을 과거 SHA에 소급한 설명이 없습니다.
- 최종적으로 commit history에 근거해 설계 → 구현 → 실패 → 수정 → 검증의 발전을 다시 설명할 수 있습니다.
