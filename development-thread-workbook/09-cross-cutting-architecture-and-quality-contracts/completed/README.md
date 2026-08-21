# portfolio-project Development Thread 학습 골격

## 목적

이 문서 세트는 42 Archive Portfolio (`web/portfolio`)의 실제 commit history와 각 SHA의 코드를 직접 읽으며 설계, 구현, 실패 처리, 수정, 검증의 발전 과정을 복원하기 위한 학습 골격입니다.

완성형 프로젝트 해설서가 아닙니다. Source에서 확정된 thread 구조, commit metadata, 역할, 중요도, invariant와 engineering difficulty만 미리 제공하며 실제 코드 해석과 실행 결과는 학습자가 채웁니다.

## 권장 학습 순서

1. [Fail-closed content ingestion](01-fail-closed-content-ingestion.md)
2. [Full-site renderer architecture](02-full-site-renderer-architecture.md)
3. [Route projections and renderer data ownership](03-route-projections-and-renderer-data-ownership.md)
4. [Template preview to production publication](04-template-preview-to-production-publication.md)
5. [Native design switcher and server-first interaction](05-native-design-switcher-and-server-first-interaction.md)
6. [Production artifact and performance enforcement](06-production-artifact-and-performance-enforcement.md)
7. [Accessibility policy to cross-design regression evidence](07-accessibility-policy-to-cross-design-regression-evidence.md)

Source의 Development Thread 순서를 그대로 따릅니다. 동일 commit이 여러 thread에 등장하는 경우 중복을 제거하지 않고 각 관점에서 다시 확인합니다.

## Thread 문서 사용법

1. Thread 목표, 핵심 질문, 완료 기준을 먼저 읽습니다.
2. Commit map 순서대로 각 SHA를 checkout합니다.
3. 해당 commit의 first-parent diff와 resulting code를 확인합니다.
4. 문서가 지정한 symbol, caller/callee, state, reference, failure branch, cleanup, command, test path를 찾아 기록합니다.
5. 필요한 경우에만 직전 관련 thread SHA와 비교합니다.
6. Invariant ledger와 Failure → Fix → Test 연결을 commit evidence로 채웁니다.
7. 마지막에 code 없이 thread의 최종 architecture 또는 execution flow를 설명합니다.

## 해당 SHA 코드 확인 원칙

- 모든 판단은 현재 학습 중인 SHA의 tree와 그 commit의 diff를 기준으로 합니다.
- File path, function/type/component 이름, caller/callee, state mutation 순서, error branch를 구체적으로 기록합니다.
- Source에서 명시하지 않은 architecture나 invariant를 추측해 확정 사실로 추가하지 않습니다.
- Commit subject나 body만 옮기지 말고 그 역할을 actual code evidence와 연결합니다.
- Generated lockfile, snapshot, measurement는 evidence일 수 있지만 decision 자체와 구분합니다.

## Final HEAD 소급 사용 금지

- Final HEAD의 file layout, function, test, behavior를 과거 commit에 소급하지 않습니다.
- 현재 SHA에 없는 helper나 fix를 사용해 해당 commit을 설명하지 않습니다.
- 이후 commit에서 해결된 failure는 해당 commit 시점에는 미해결 상태로 기록합니다.
- 비교가 필요하면 현재 SHA의 parent 또는 문서가 연결한 이전 관련 SHA를 사용합니다.

## S/A/B/C별 학습 깊이

- **S:** Project-wide architecture/invariant로 취급합니다. Problem, 직전 상태, failure 가능성, decision, 핵심 code, ownership/lifecycle/state transition, 후속 fix/test, guarantee/non-guarantee를 모두 추적합니다.
- **A:** 주요 subsystem, boundary, integration point, failure path를 이해합니다. 핵심 code와 design judgment, caller/callee, state/reference 처리, regression evidence를 확인합니다.
- **B:** Thread 흐름에서 맡는 구현 역할과 필요한 code/state 변화를 확인합니다. Project-wide 결론을 과도하게 부여하지 않습니다.
- **C:** Thread 이해에 필요한 맥락으로만 사용합니다. 동일 깊이의 분석란을 억지로 채우지 않습니다.

## 실제 코드 삽입 기준

- Decision, invariant, ownership transfer, state transition, failure branch, cleanup 또는 test injection을 직접 보여 주는 최소 code만 삽입합니다.
- Code block 앞에 SHA, file path, symbol, 확인 목적을 적습니다.
- 변경 전/후를 비교할 때는 각각 어느 SHA인지 명시합니다.
- 대규모 diff, generated file 전체, 단순 markup 반복은 삽입하지 않습니다.
- Code 없이 설명 가능한 부분은 자신의 말로 정리합니다.

## Test commit 학습 방법

각 test commit에서 다음을 분리해 기록합니다.

- 대상 production invariant
- 재현하는 failure 또는 boundary
- 사용한 test technique과 fixture
- 통과하는 actual production code path
- Test가 증명하는 것
- Test가 증명하지 않는 것
- Broad integration test인지 deterministic regression인지
- 후속 변경에서 막는 회귀

## 문서 완료 기준

- 모든 thread 문서의 commit section을 해당 SHA evidence로 채웠습니다.
- 모든 SHA, importance, tags, thread order를 변경하지 않았습니다.
- S/A/B/C별 기록 깊이가 구분됩니다.
- Invariant의 도입, 강화, 부족함, fix, regression evidence가 ledger에 연결됩니다.
- Fix는 기존 가정 → failure/risk → root cause → corrected decision/invariant → code → test로 설명됩니다.
- Test는 production path와 injected failure를 연결하고 보장 범위를 제한해 설명합니다.
- 각 thread 최종 architecture 또는 execution flow를 별도 재학습 없이 설명할 수 있습니다.
