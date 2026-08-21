# ft_transcendence Development Thread 학습 골격

## 목적

이 문서 세트는 완성형 프로젝트 해설서가 아닙니다. 학습자가 실제 commit history와 해당 SHA의 코드를 읽고
설계 → 구현 → 실패 → 수정 → 검증의 발전 과정을 직접 복원하기 위한 기록 골격입니다.

문서에 미리 적힌 commit 순서, SHA, subject, importance, tags, 역할, significance는 source에서 확정된 내용입니다.
실제 함수 동작, 변경 전후 코드, ownership/lifetime, failure path, test 결과, 최종 설명은 학습자가 채웁니다.

## 권장 학습 순서

1. [서버 권위형 결정적 게임 메커니즘](01-authoritative-deterministic-game-mechanics.md)
2. [쿠키 신원과 일회용 WebSocket 입장](02-cookie-identity-websocket-admission.md)
3. [버전 기반 실시간 프로토콜과 단조 상태](03-versioned-realtime-protocol-and-monotonic-state.md)
4. [원자적·멱등적 경기 결과 확정](04-atomic-idempotent-match-finalization.md)
5. [경기방 수명주기·연결 교체·복구](05-room-lifecycle-connection-replacement-and-recovery.md)
6. [매치메이킹 예약 소유권과 롤백](06-matchmaking-reservation-ownership-and-rollback.md)
7. [격리된 임시 신뢰 도메인으로서의 게스트 모드](07-guest-mode-as-isolated-transient-trust-domain.md)
8. [런타임 타이밍·백프레셔·드레인·운영 증거](08-runtime-timing-backpressure-drain-and-operational-evidence.md)

앞 문서의 결과가 뒤 문서의 필수 선행조건인 것은 아닙니다. 다만 위 순서는 source의 Development Thread 배열을
그대로 따르므로 전체 복습 시 이 순서를 권장합니다.

## Thread 문서 사용법

- 먼저 Thread 목표, 핵심 질문, 완료 기준을 읽습니다.
- Commit map의 순서를 바꾸지 않고 각 SHA를 차례대로 checkout합니다.
- 각 commit의 “Source에서 확정된 역할과 범위”를 기준으로 확인 범위를 제한합니다.
- “해당 SHA에서 확인할 실제 코드”의 항목마다 파일, symbol, caller/callee, 상태 전이, failure branch를 기록합니다.
- Invariant ledger와 Failure → Fix → Test 표는 commit별 기록을 마친 뒤 채웁니다.
- 마지막으로 Thread 최종 상태와 execution flow를 자기 언어로 작성합니다.

## 해당 SHA 코드 확인 원칙

- `git checkout <SHA>` 또는 `git show <SHA>:<path>`로 그 시점의 코드를 확인합니다.
- 변경 자체는 `git show <SHA>`로 보고, Thread의 직전 관련 commit과는 `git diff <OLD>..<NEW> -- <path>`로 비교합니다.
- 파일명이 source에 확정되어 있지 않으면 symbol을 검색해 실제 경로를 기록합니다.
- 함수 하나만 보지 말고 caller, callee, 상태 필드, resource 생성/해제, error branch, 관련 test를 함께 추적합니다.
- source가 명시하지 않은 결론은 확정 사실로 적지 않고 “코드에서 관찰한 해석”으로 표시합니다.

## final HEAD 소급 사용 금지

- final HEAD의 코드로 과거 commit의 동작을 설명하지 않습니다.
- 같은 symbol이 나중에 이동·분리·삭제되었더라도 해당 SHA의 실제 정의와 caller를 사용합니다.
- 필요한 경우 Thread의 직전 관련 SHA와 비교하되, 그 사이의 다른 commit에서 바뀐 내용을 자동으로 귀속하지 않습니다.
- 최종 architecture는 모든 commit 기록을 끝낸 뒤 Thread 마지막 SHA까지의 변화로만 정리합니다.

## S/A/B/C별 학습 깊이

- S: 프로젝트 핵심 architecture/invariant입니다. 문제, 직전 상태, 실패 가능성, 결정, 핵심 코드, ownership/lifecycle/state transition, 후속 fix/test까지 깊게 추적합니다.
- A: 주요 subsystem, trust boundary, failure path, integration point입니다. 핵심 코드와 설계 판단, 주요 edge case를 확인합니다.
- B: Thread 흐름에서 맡는 구현 역할과 필요한 상태 변화를 확인합니다. S/A와 같은 분량을 기계적으로 반복하지 않습니다.
- C: Thread 이해에 필요한 맥락만 기록합니다. source의 Thread map에 포함되지 않은 C commit을 임의로 끼워 넣지 않습니다.

## 실제 코드 삽입 기준

- 해당 SHA의 판단을 증명하는 최소 코드만 삽입합니다.
- 코드 앞에 SHA, 파일 경로, symbol, 확인 목적을 적습니다.
- 상태 mutation 전후 순서, ownership 이전, error/cleanup branch처럼 문장만으로 모호한 부분을 우선합니다.
- 대규모 파일이나 전체 diff를 복사하지 않습니다.
- 변경 전/후 비교가 필요하면 두 SHA의 대응 코드 조각을 나란히 두고 차이를 학습자가 설명합니다.

## Test commit 학습 방법

- 대상 production invariant를 먼저 적습니다.
- 재현하는 failure 또는 boundary를 실제 fixture와 주입 지점으로 확인합니다.
- test technique이 unit, deterministic regression, PostgreSQL integration, browser/process, load/fault 중 무엇인지 구분합니다.
- test가 통과하는 production 코드 경로를 caller 순서로 연결합니다.
- 증명하는 것과 증명하지 않는 것을 모두 기록합니다.
- 후속 변경에서 어떤 회귀를 막는지 설명합니다.

## 문서 완료 기준

- 모든 Thread 문서의 Commit map을 source 순서 그대로 확인했습니다.
- 모든 중요 commit에서 해당 SHA의 구체적인 코드 근거를 기록했습니다.
- S/A/B/C별 학습 깊이가 구분되어 있습니다.
- Invariant ledger와 Failure → Fix → Test 연결이 실제 commit code와 test에 근거합니다.
- ownership, state, responsibility, cleanup 변화를 Thread 단위로 설명할 수 있습니다.
- final HEAD를 소급하지 않고 각 시점의 보장과 비보장을 구분했습니다.
- 완성된 문서만으로 별도의 프로젝트 재학습 없이 설계 → 구현 → 실패 → 수정 → 검증의 발전 과정을 설명할 수 있습니다.
