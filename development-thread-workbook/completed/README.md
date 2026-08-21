# minishell Development Thread 학습 골격

## 목적

이 문서 세트는 `small-shell`의 `c/minishell` commit history를 다시 설명하는 완성형 해설서가 아닙니다. 학습자가 각 exact SHA의 diff와 당시 code를 직접 읽고, 설계 → 구현 → 실패 → 수정 → 검증의 발전 과정을 복원하기 위한 기록 골격입니다.

Source of truth는 제공된 `commit-importance.md`와 `commit-bodies.md`뿐입니다. Importance, tags, Development Thread, commit 관계와 순서는 재평가하지 않습니다.

## 권장 학습 순서

1. [`01-parsed-representation-to-conditional-execution.md`](01-parsed-representation-to-conditional-execution.md)
2. [`02-heredoc-cross-stage-semantics.md`](02-heredoc-cross-stage-semantics.md)
3. [`03-pipeline-process-and-descriptor-ownership.md`](03-pipeline-process-and-descriptor-ownership.md)
4. [`04-transactional-allocation-failure.md`](04-transactional-allocation-failure.md)
5. [`05-asymptotically-safe-text-construction.md`](05-asymptotically-safe-text-construction.md)

같은 commit이 여러 Thread에 있으면 각 관점에서 다시 확인합니다. 이 세트에서는 `c30b39c0bcf8`이 heredoc recovery와 transactional allocation 양쪽에 의도적으로 등장합니다.

## Thread 문서 사용법

- 먼저 Thread 목표, 핵심 질문, 완료 기준을 읽습니다.
- Commit map 순서를 바꾸지 않고 한 commit씩 확인합니다.
- 각 commit의 `Source에서 확정된 변화`는 전제로 사용합니다.
- `확인할 실제 코드`에서 요구한 structure, function, caller/callee, state mutation, error branch, cleanup, test를 exact SHA에서 찾습니다.
- 확인한 최소 code snippet, file path, symbol, before/after 차이, 실행 결과를 학습 기록란에 남깁니다.
- Thread 끝에서 commit별 기록을 Invariant ledger와 Failure → Fix → Test 표로 다시 연결합니다.
- 마지막 architecture/execution flow는 source 문장을 복사하는 대신 실제 code evidence로 완성합니다.

## 해당 SHA 코드 확인 원칙

- `git show --name-status <SHA>`로 변경 파일을 먼저 확인합니다.
- 변경 전 상태는 `<SHA>^`, 변경 후 상태는 `<SHA>`에서 봅니다.
- 필요한 파일만 `git diff <SHA>^ <SHA> -- <path>`로 비교합니다.
- implementation 전체가 필요하면 `git show <SHA>:<path>` 또는 detached worktree를 사용합니다.
- Commit subject만으로 함수나 file을 추측하지 않습니다.
- Later fix에서 추가된 field, wrapper, test seam을 이전 SHA에 있다고 기록하지 않습니다.
- Thread에 같은 commit이 중복되더라도 제거하지 않습니다.

## final HEAD 소급 사용 금지

Final HEAD는 과거 commit의 code를 대신할 수 없습니다.

- 과거 commit의 ownership, failure path, type field, function signature는 해당 SHA에서만 확정합니다.
- Later refactor로 이름이 바뀐 function을 과거 SHA의 이름처럼 쓰지 않습니다.
- Later regression test를 과거 feature commit의 이미 존재한 증거처럼 쓰지 않습니다.
- 비교가 필요하면 source가 연결한 later fix/test를 별도 SHA로 확인하고, 당시 feature가 보장하지 못한 범위를 구분합니다.

## S/A/B/C별 학습 깊이

### S

Project architecture 또는 invariant를 설명하는 핵심 commit입니다.

- Problem과 commit 직전 상태
- 기존 설계의 failure 가능성
- 핵심 decision과 실제 중심 code
- ownership, lifecycle, state transition
- partial failure와 cleanup
- 후속 fix 또는 regression evidence
- 보장하는 것과 아직 보장하지 않는 것

을 모두 기록합니다.

### A

주요 subsystem, boundary, integration point, failure path를 이해해야 합니다.

- 변경 전 assumption
- 핵심 function과 caller/callee
- state 또는 resource responsibility
- failure handling
- 설계 판단과 test evidence

를 확인합니다.

### B

Thread 흐름에서 맡는 구현 역할과 필요한 code/state 변화를 확인합니다.

- 해당 commit이 추가한 좁은 mechanism
- 핵심 data/function
- 정상·오류 분기
- 다음 중요한 commit에 제공하는 전제

를 기록합니다.

### C

Thread 이해에 필요한 문맥일 때만 확인합니다. 같은 깊이의 분석란을 억지로 만들지 않습니다.

## 실제 코드 삽입 기준

Code는 설명을 장식하기 위해 붙이지 않고, 다음 중 하나를 증명할 때만 최소 범위로 삽입합니다.

- ownership을 획득·이전·해제하는 지점
- state mutation 전후 순서
- caller와 callee의 contract
- pipe/redirection 같은 resource acquisition·replacement·cleanup
- failure branch와 recovery branch
- partial result의 publish point
- retry, short read/write 또는 forced-stop 조건
- regression test가 failure를 주입하고 production path를 통과하는 지점

각 snippet에는 exact SHA, file path, symbol, 왜 필요한 근거인지 적습니다. 긴 함수 전체보다 branch와 주변 context를 우선합니다.

## Test commit 학습 방법

각 test commit에서 다음을 분리해 기록합니다.

- 대상 production invariant
- 재현하는 failure 또는 boundary
- fault injection, end-to-end, source-level API, stress, timeout, sanitizer 등 test technique
- 실제 통과하는 production code path
- expected status, stdout, stderr, state, resource 결과
- 이 테스트가 증명하는 것
- 이 테스트가 증명하지 않는 것
- broad integration인지 deterministic regression인지
- 이후 어떤 회귀를 막는지

Test script만 읽지 말고 injection seam과 production branch를 함께 연결합니다.

## 문서 완료 기준

- 모든 Development Thread가 정확히 한 문서에 존재합니다.
- 각 Thread의 commit order, SHA, subject, importance, tags가 source와 동일합니다.
- 여러 Thread에 속한 commit을 제거하지 않았습니다.
- 모든 S/A/B commit의 학습 깊이가 구분되어 있습니다.
- 실제 code를 읽지 않고 임의로 완성한 설명이 없습니다.
- 각 중요한 commit에 exact SHA의 file/function/branch 근거가 있습니다.
- Fix와 regression test가 기존 가정, failure, root cause, 수정 invariant를 통해 연결됩니다.
- Invariant ledger에 도입, 강화, 실패 노출, fix, test evidence가 기록되어 있습니다.
- 각 Thread의 최종 architecture/execution flow를 commit history에 근거해 설명할 수 있습니다.
- 별도의 프로젝트 재학습 없이 설계 → 구현 → 실패 → 수정 → 검증의 발전 과정을 재구성할 수 있습니다.
