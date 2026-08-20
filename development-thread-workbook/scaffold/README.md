# get_next_line 개발 과정 복습 골격

## 목적

이 문서 세트는 완성된 프로젝트 해설서가 아닙니다. 학습자가 실제 commit history와 각 SHA의 코드를 직접 읽고, 설계 → 구현 → 실패 가능성 → 수정 → 검증의 변화를 근거와 함께 복원하기 위한 기록 골격입니다.

문서에 미리 적힌 commit 역할, 중요도, tags, 순서와 invariant 연결은 제공된 source를 그대로 따릅니다. 함수별 동작, 변경 전후 코드 차이, 실제 ownership과 lifetime, failure path, 테스트 결과, 최종 설명은 학습자가 해당 SHA의 코드로 완성합니다.

## 권장 학습 순서

1. [`01-whole-stream-to-bounded-line-parser.md`](01-whole-stream-to-bounded-line-parser.md)
2. [`02-singleton-to-descriptor-scoped-state.md`](02-singleton-to-descriptor-scoped-state.md)
3. [`03-explicit-reader-lifetime-and-authoritative-engine.md`](03-explicit-reader-lifetime-and-authoritative-engine.md)
4. [`04-posix-transient-read-and-recovery.md`](04-posix-transient-read-and-recovery.md)

각 문서는 source에 정의된 Development Thread 하나와 정확히 대응합니다. 같은 commit이 여러 Thread에 등장하면 제거하지 않고, 해당 Thread가 요구하는 관점으로 다시 확인합니다.

## Thread 문서 사용법

1. `Commit map`에서 Thread의 순서와 각 commit의 역할을 먼저 확인합니다.
2. 각 commit으로 checkout하거나 해당 SHA의 tree를 직접 열어, 문서에 지정된 상태 필드·함수·caller/callee·failure branch·테스트를 찾습니다.
3. 직전 관련 SHA와 비교해 무엇이 새로 생겼고 무엇이 그대로 유지되었는지 기록합니다.
4. 코드 발췌에는 파일 경로, symbol, 해당 SHA를 함께 남깁니다.
5. commit별 기록이 끝나면 `Invariant ledger`, `Failure → Fix → Test 연결`, `Thread 최종 상태`를 다시 작성합니다.
6. 마지막에는 코드 없이도 Thread의 변화 과정을 순서대로 설명할 수 있는지 자가 점검합니다.

## 해당 SHA 코드 확인 원칙

- 모든 판단은 반드시 문서에 적힌 **해당 SHA 시점의 코드**를 기준으로 합니다.
- 변경 전 상태가 필요하면 immediate parent 또는 문서가 지정한 직전 관련 SHA를 비교합니다.
- commit subject만 읽고 구현을 추정하지 않습니다. 실제 변경 파일, 함수, 상태 mutation, cleanup, 테스트 진입점을 확인합니다.
- source가 파일명이나 symbol을 확정하지 않은 항목은 저장소 tree에서 직접 찾아 기록합니다.
- 코드 확인에 사용할 수 있는 기본 형태는 다음과 같습니다.

```sh
git show <sha> --stat
git show <sha> -- <path>
git diff <previous-related-sha>..<sha> -- <path>
git show <sha>:<path>
```

## final HEAD 소급 사용 금지

final HEAD의 함수명, 구조체 배치, helper 분리, 테스트 harness를 과거 commit에 소급해서 설명하지 않습니다. 현재 코드에서 익숙한 symbol을 발견했더라도 해당 SHA에 실제로 존재하는지 먼저 확인합니다. 이후 commit에서 수정된 invariant는 이전 commit이 이미 보장했다고 기록하지 않습니다.

## Importance별 학습 깊이

### S

프로젝트를 설명하는 핵심 architecture 또는 invariant로 다룹니다. 문제, 기존 상태, 실패 가능성, 결정, 핵심 코드, ownership/lifecycle/state transition, 후속 fix와 regression test까지 연결합니다. 코드 근거 없이 요약만 남기면 완료로 보지 않습니다.

### A

주요 subsystem, API/lifecycle boundary, failure path, integration point 또는 강한 검증 근거를 확인합니다. 핵심 함수와 상태 변화, 선택한 설계 판단, 해당 commit이 보장하는 범위를 기록합니다.

### B

Thread의 흐름에서 맡는 준비·지원·검증 역할을 확인합니다. 변경된 helper, build/test 진입점, 필요한 상태 변화와 전후 연결을 중심으로 기록하며 S 수준의 전체 architecture 분석을 반복하지 않습니다.

### C

Thread 이해에 필요한 경우에만 맥락으로 사용합니다. 문서 전용 또는 기계적 변경에 S/A 수준의 분석란을 만들지 않습니다.

## 실제 코드 삽입 기준

- 상태 필드, 핵심 조건문, ownership 이전, cursor commit, cleanup, error mapping처럼 설명의 근거가 되는 최소 범위만 발췌합니다.
- 발췌마다 `<sha>`, 파일 경로, symbol을 적습니다.
- caller와 callee의 관계가 중요하면 양쪽을 각각 발췌합니다.
- 변경 전후 비교는 같은 책임을 수행하는 코드끼리 나란히 기록합니다.
- 긴 함수 전체, 관련 없는 boilerplate, final HEAD의 대체 코드는 삽입하지 않습니다.
- 코드 아래에는 “무엇을 한다”뿐 아니라 “어떤 상태를 언제 바꾸며, 실패하면 무엇이 유지되는가”를 작성합니다.

## Test commit 학습 방법

각 test commit에서는 다음을 구분해 기록합니다.

- 대상으로 삼은 production invariant
- 재현하는 failure 또는 boundary
- 실제 descriptor, pipe, fault injection, build matrix, operation counting 등 사용한 test technique
- 테스트가 통과하는 production 코드 경로
- assertion과 expected result가 증명하는 것
- 테스트가 증명하지 않는 것
- broad integration test인지 deterministic regression인지
- 이후 어떤 회귀를 막는지

테스트 이름과 기대값만 옮기지 않습니다. failure가 어느 시점에 주입되고, production state가 그 전후에 어떻게 유지되는지까지 추적합니다.

## 문서 완료 기준

- 네 Development Thread의 commit 순서를 source와 동일하게 설명할 수 있습니다.
- 각 S commit의 핵심 state representation, decision, failure risk와 후속 검증을 실제 코드로 입증했습니다.
- A/B commit은 importance에 맞는 깊이로 Thread 내 역할과 코드 근거가 채워져 있습니다.
- `Invariant ledger`에서 invariant가 도입·강화·위험 노출·검증된 시점을 구분했습니다.
- fix를 기존 가정 → failure/risk → root cause → 수정된 decision → regression test로 연결했습니다.
- test commit마다 증명 범위와 비증명 범위를 구분했습니다.
- ownership, descriptor borrowing, context lifetime, state mutation, cleanup 경로를 서로 혼동하지 않습니다.
- final HEAD를 과거 SHA의 근거로 사용한 부분이 없습니다.
- 각 Thread의 최종 execution flow를 코드 없이 순서대로 설명할 수 있습니다.
