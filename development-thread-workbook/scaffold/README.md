# ft_container Development Thread 학습 골격

## 목적

이 디렉터리는 확정된 `commit-importance.md`와 `commit-bodies.md`만을 기준으로, 실제 commit history와 해당 SHA의 코드를 직접 읽으며 `ft_container`의 개발 과정을 복원하기 위한 학습 골격입니다.

완성형 해설서가 아닙니다. 문서에 미리 적힌 내용은 source에서 이미 확정된 Thread 구조, commit metadata, 역할, 중요도, 태그, invariant와 engineering difficulty입니다. 실제 구현 해석, 함수별 추적, ownership/lifetime 확인, failure path, test 결과, 최종 설명은 학습자가 채웁니다.

## 권장 학습 순서

Development Thread의 source 순서를 그대로 따릅니다.

1. `01-cxx98-generic-interface-foundation.md`
2. `02-vector-ownership-aliasing-exception-safe-mutation.md`
3. `03-map-unbalanced-bst-to-verified-red-black-core.md`
4. `04-stable-map-iterators-through-structural-mutation.md`
5. `05-stateful-allocators-map-failure-transactions.md`
6. `06-header-only-public-surface-automated-acceptance.md`

동일한 commit이 여러 Thread에 나타나는 경우 제거하지 않고 각 Thread의 관점으로 다시 확인합니다. 이 세트에서는 source가 정의한 Thread membership과 순서를 그대로 유지합니다.

## Thread 문서 사용법

- 먼저 `Thread 목표`, `핵심 질문`, `Commit map`을 읽어 학습 범위를 고정합니다.
- 각 commit에서는 반드시 표시된 SHA 시점의 diff와 코드를 확인합니다.
- `Source-established role`, `Source summary`, `Source rationale`는 재평가하지 않습니다.
- 코드 확인 지시는 답이 아니라 탐색 범위입니다. 실제 파일, 함수, 상태 필드, branch, cleanup 순서는 직접 기록합니다.
- fix는 기존 가정 → failure/risk → root cause → 수정된 decision/invariant → 실제 수정 코드 → regression test 순으로 복원합니다.
- test/perf commit은 대상 production invariant, failure/boundary, technique, production path, 증명 범위와 비증명 범위를 분리합니다.
- Thread 마지막에는 commit별 기록을 다시 묶어 invariant ledger와 최종 execution/architecture flow를 직접 완성합니다.

## 해당 SHA 코드 확인 원칙

- final HEAD의 코드를 과거 commit 설명에 소급해서 사용하지 않습니다.
- `git show <sha> --stat`으로 변경 범위를 먼저 확인하고, `git show <sha> -- <path>`로 commit diff를 봅니다. 해당 SHA의 파일 전체 상태는 `git show <sha>:<path>`로 확인합니다.
- 수정 전후 차이가 핵심이면 해당 commit의 parent 또는 문서가 지정한 직전 관련 SHA와 비교합니다.
- later commit에서 바뀐 helper 이름이나 최종 representation을 earlier commit에 끌어오지 않습니다.
- 실제 코드 근거를 적을 때 SHA, 파일 경로, 함수/형식/테스트 이름을 함께 기록합니다.

## final HEAD 소급 사용 금지

이 골격의 목적은 완성된 코드를 설명하는 것이 아니라 설계 → 구현 → 실패 → 수정 → 검증의 발전 과정을 복원하는 것입니다. earlier commit의 부족한 상태도 그대로 읽어야 하며, later fix의 결론으로 earlier code를 정당화하거나 재해석하지 않습니다.

## S/A/B/C별 학습 깊이

- S: 핵심 architecture/invariant입니다. Problem, 기존 상태, failure 가능성, 결정, 핵심 코드, ownership/lifecycle/state transition, 후속 fix/test까지 추적합니다.
- A: 주요 subsystem, boundary, failure path, integration point입니다. 핵심 코드와 설계 판단, 관련 regression을 확인합니다.
- B: Thread 흐름에서 맡는 구현 역할과 필요한 코드/state 변화를 확인합니다.
- C: Thread 이해에 필요한 맥락만 확인합니다. S/A와 동일한 깊이의 분석을 만들지 않습니다.

## 실제 코드 삽입 기준

- 전체 파일을 복사하지 않고 결정을 설명하는 최소 코드만 삽입합니다.
- 상태 필드, 핵심 분기, ownership transfer, construct/destroy, event가 아닌 container state mutation, error/failure branch, cleanup, test injection처럼 판단에 필요한 부분을 우선합니다.
- 코드 조각마다 `SHA / file / symbol`을 식별할 수 있게 기록합니다.
- 변경 전/후가 핵심이면 두 시점의 최소 대응 코드만 나란히 기록하고 차이를 직접 설명합니다.
- source에 없는 구현 사실을 추정해서 채우지 않습니다.

## Test commit 학습 방법

- 먼저 이 test가 보호하는 production invariant를 한 문장으로 적습니다.
- 어떤 failure/boundary를 주입하거나 재현하는지 확인합니다.
- differential, failure injection, white-box, deterministic randomized, structural bound, integration compile/link 중 실제 technique을 코드로 확인합니다.
- test fixture에서 끝내지 말고 실제 production path까지 연결합니다.
- 성공 assertion이 증명하는 것과 증명하지 않는 것을 분리합니다.
- broad integration test인지 특정 regression을 고정하는 deterministic test인지 근거를 적습니다.
- 후속 변경이 어떤 회귀를 만들면 이 test가 실패해야 하는지 적습니다.

## 문서 완료 기준

- 모든 Thread commit을 source 순서대로 해당 SHA에서 확인했습니다.
- S/A commit의 핵심 decision과 failure/ownership/state transition을 실제 코드 근거로 설명할 수 있습니다.
- fix와 관련 regression test의 연결을 복원했습니다.
- invariant ledger에서 도입 → 부족함 노출 → 보강/fix → regression 고정의 변화를 설명할 수 있습니다.
- map과 vector의 핵심 lifetime/ownership/iterator/tree invariant를 source의 표현과 충돌 없이 설명할 수 있습니다.
- test가 증명하는 범위와 증명하지 않는 범위를 구분할 수 있습니다.
- final HEAD를 earlier commit 설명에 소급 사용한 부분이 없습니다.
- 최종 architecture 또는 execution flow를 commit history 근거로 자기 말로 설명할 수 있습니다.
