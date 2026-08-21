\
# minitalk 개발 Thread 학습 골격

## 1. 목적

이 문서 세트는 `commit-importance.md`가 확정한 Development Threads와 commit 평가를 유지하고, `commit-bodies.md`의 구현 의도와 failure handling 정보를 이용해 실제 commit history를 복원하기 위한 기록 틀입니다.

완성형 프로젝트 해설서가 아닙니다. 각 SHA의 코드와 diff를 직접 읽고 설계, 구현, 실패, 수정, 검증의 연결을 채웁니다.

## 2. 권장 학습 순서

1. [`01-timing-to-correlated-sequence-acks.md`](01-timing-to-correlated-sequence-acks.md)
2. [`02-session-ownership-and-recovery.md`](02-session-ownership-and-recovery.md)
3. [`03-self-pipe-event-loop.md`](03-self-pipe-event-loop.md)
4. [`04-output-commit-boundary.md`](04-output-commit-boundary.md)
5. [`05-endpoint-ownership-and-bounded-polling.md`](05-endpoint-ownership-and-bounded-polling.md)
6. [`06-bounded-response-correlation.md`](06-bounded-response-correlation.md)

source의 Development Threads 순서와 같습니다. 동일 commit은 각 Thread의 학습 관점으로 중복 확인합니다.

## 3. Thread 문서 사용법

1. 해당 SHA의 commit diff와 tree를 엽니다.
2. parent 또는 지정된 이전 관련 SHA와 비교합니다.
3. source 확정 역할과 실제 파일, 함수, state field를 연결합니다.
4. 정상 경로와 failure branch를 caller → callee와 mutation 순서로 추적합니다.
5. 필요한 최소 코드만 path, symbol, SHA와 함께 삽입합니다.
6. test commit이면 production invariant와 test technique을 production path에 연결합니다.
7. commit 기록을 Invariant ledger와 Failure → Fix → Test 표에 반영합니다.
8. 마지막에는 Thread execution flow를 자신의 설명으로 완성합니다.

```sh
git show --stat <sha>
git show <sha>
git diff <previous-related-sha> <sha> -- <path>
git show <sha>:<path>
```

## 4. 해당 SHA 코드 확인 원칙

- 모든 해석은 해당 commit SHA의 tree를 기준으로 합니다.
- 변경 전 코드는 parent 또는 지정된 이전 관련 SHA에서 확인합니다.
- commit body만 옮기지 않고 path, symbol, condition, state mutation으로 확인합니다.
- source에 없는 invariant는 확정 사실로 추가하지 않고 학습자 관찰로 표시합니다.

## 5. final HEAD 소급 사용 금지

final HEAD의 함수, 테스트, 주석, state layout을 과거 commit에 소급하지 않습니다.

최종 server가 self-pipe를 사용하더라도 `4234233ebd30`에서는 그 SHA에 실제로 존재하는 중간 response queue와 handler responsibility를 확인해야 합니다. 후속 fix의 helper나 validation을 이전 commit의 보장으로 적지 않습니다.

## 6. Importance별 학습 깊이

| Importance | 요구 깊이 |
| --- | --- |
| S | 문제, 직전 architecture, failure 가능성, 핵심 decision, 실제 핵심 코드, ownership/lifecycle/state transition, 후속 fix/test까지 추적합니다. |
| A | 주요 subsystem, integration point, validation, failure path와 설계 판단을 실제 코드로 확인합니다. |
| B | Thread 전개에서 맡는 구현 역할, 필요한 state 변화, 앞뒤 commit 연결을 확인합니다. |
| C | Thread 이해에 필요한 최소 맥락만 기록합니다. |

## 7. 실제 코드 삽입 기준

각 코드 조각에 commit SHA, 파일 경로, symbol, caller/callee, 보여 주는 invariant 또는 failure branch, 이전 관련 SHA와의 차이를 기록합니다.

우선 삽입할 대상:

- 핵심 state field와 초기화/reset
- ownership 획득·이전·해제 코드
- event registration/update/remove
- send/wait/validate 순서
- error, timeout, partial-operation branch
- cleanup과 rollback
- regression test의 failure 주입 지점

## 8. Test commit 학습 방법

각 test commit에서 다음을 구분합니다.

- 대상 production invariant
- 재현 failure 또는 boundary
- test technique
- 실제 production code path
- 증명하는 것과 증명하지 않는 것
- broad integration인지 deterministic regression인지
- 후속 변경에서 막는 회귀

테스트 통과만 적지 않고 child process, signal, socket path, fault hook, inherited mask, descriptor allocation이 어떤 production branch를 만들기 위한 것인지 기록합니다.

## 9. 문서 완료 기준

- 6개 Development Thread 문서를 source 순서대로 완성했습니다.
- SHA, subject, importance, tags, commit 순서를 변경하지 않았습니다.
- 중복 commit은 각 Thread 관점으로 별도 기록했습니다.
- 중요한 commit마다 해당 SHA의 path, symbol, state, failure evidence가 있습니다.
- S/A/B/C별 깊이가 구분됩니다.
- fix는 기존 가정 → failure → root cause → 수정 invariant → code → regression으로 연결됩니다.
- test는 invariant, technique, production path, proves/not-proves를 구분합니다.
- final HEAD를 과거 증거로 사용하지 않았습니다.
- 각 Thread의 설계 → 구현 → 실패 → 수정 → 검증을 commit history로 설명할 수 있습니다.
