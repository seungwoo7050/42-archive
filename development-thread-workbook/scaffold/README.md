# ft_irc Development Thread 학습 골격

## 목적

이 문서 세트는 완성형 프로젝트 해설서가 아닙니다. 학습자가 실제 commit history와 각 SHA 시점의 코드를 직접 읽고 증거를 기록하면서 설계, 구현, 실패 처리, 수정, 검증의 발전 과정을 복원하기 위한 골격입니다.

문서 구조와 commit 관계는 `commit-importance.md`의 Development Threads를 따르며, commit의 구현 의도와 failure handling 확인 항목은 `commit-bodies.md`를 기준으로 작성되었습니다.

## 권장 학습 순서

| 순서 | Thread 문서 | 학습 초점 |
| --- | --- | --- |
| 1 | [Portable readiness and non-blocking transport](01-portable-readiness-and-nonblocking-transport.md) | 이벤트 준비 상태와 논블로킹 전송 |
| 2 | [Protocol boundary, identity, and registration](02-protocol-boundary-identity-and-registration.md) | 프로토콜 경계, 식별자와 등록 |
| 3 | [Channel authority, fan-out, and cleanup](03-channel-authority-fanout-and-cleanup.md) | 채널 권한, 팬아웃과 정리 |
| 4 | [Operational protections and controlled shutdown](04-operational-protections-and-controlled-shutdown.md) | 운영 보호와 제어된 종료 |
| 5 | [Strict runtime configuration boundaries](05-strict-runtime-configuration-boundaries.md) | 엄격한 런타임 구성 경계 |
| 6 | [Heartbeat liveness correctness](06-heartbeat-liveness-correctness.md) | 하트비트 생존성 정확성 |
| 7 | [Output-queue correctness under partial failure](07-output-queue-correctness-under-partial-failure.md) | 부분 실패에서의 송신 대기열 정확성 |
| 8 | [Reentrant server and application cleanup](08-reentrant-server-and-application-cleanup.md) | 재진입 가능한 서버와 애플리케이션 정리 |
| 9 | [Verification maturation and portability enforcement](09-verification-maturation-and-portability-enforcement.md) | 검증 성숙과 이식성 강제 |

위 순서는 source에 정의된 Development Thread 순서입니다. 같은 commit이 여러 문서에 등장해도 제거하지 않습니다. 각 문서에서 서로 다른 invariant와 학습 관점으로 다시 확인합니다.

## Thread 문서 사용법

1. 문서의 Commit map에서 현재 확인할 SHA와 importance를 확인합니다.
2. repository를 해당 SHA로 이동한 뒤 그 시점의 변경 파일과 실제 symbol을 찾습니다.
3. 문서에 미리 적힌 source-confirmed role과 implementation anchor를 기준으로 코드 증거를 수집합니다.
4. 학습 기록란에는 path, symbol, caller/callee, state mutation 순서, failure branch, cleanup 경로를 직접 채웁니다.
5. fix commit은 기존 가정 → 실제 위험 → root cause → 수정 invariant → 수정 코드 → regression test 순서로 연결합니다.
6. test commit은 production invariant, 재현 boundary, technique, 통과하는 production path, 증명/비증명 범위를 분리합니다.
7. Thread 마지막에 invariant ledger, failure-fix-test, responsibility 변화, execution flow를 자신의 코드 증거로 완성합니다.

## 해당 SHA 코드 확인 원칙

- 반드시 현재 학습 중인 commit SHA의 tree를 확인합니다.
- 기본 비교는 `<SHA>^`와 `<SHA>`입니다. Thread에서 직전 관련 SHA가 따로 제시되면 두 시점도 함께 비교합니다.
- final HEAD의 코드를 과거 commit 설명에 소급 적용하지 않습니다.
- 후속 fix에서 생긴 함수, field, test seam을 이전 commit에 존재했던 것처럼 기록하지 않습니다.
- source가 확정하지 않은 invariant를 새 사실처럼 추가하지 않습니다. 코드에서 직접 확인한 해석은 path와 symbol 증거를 붙여 학습자 결론으로 구분합니다.
- commit subject, SHA, importance, tags, Thread 순서는 변경하지 않습니다.

권장 확인 명령 예시는 다음과 같습니다. 실제 repository 상태와 작업 방식에 맞게 사용하되, 확인 대상 SHA는 바꾸지 않습니다.

```sh
git switch --detach <SHA>
git show --stat --oneline <SHA>
git diff <SHA>^ <SHA> -- <path>
git show <SHA>:<path>
```

## S/A/B/C별 학습 깊이

| Importance | 학습 깊이 |
| --- | --- |
| S | 프로젝트 핵심 architecture/invariant로 취급합니다. 직전 상태, failure 가능성, 핵심 결정, 실제 코드, ownership/lifecycle/state transition, 후속 fix/test까지 깊게 기록합니다. |
| A | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |
| B | thread 흐름에서 맡는 구현 역할과 필요한 코드·상태 변화를 확인합니다. S/A와 같은 분량을 강제하지 않습니다. |
| C | thread 이해에 필요한 맥락만 기록합니다. 이 프로젝트의 Development Threads에는 C commit이 포함되지 않습니다. |

## 실제 코드 삽입 기준

- 문서에는 해당 SHA에서 직접 확인한 최소 코드 조각만 삽입합니다.
- 코드 조각마다 SHA, file path, symbol 또는 함수 범위를 함께 적습니다.
- 구현 전체를 복사하지 않고 invariant, ordering, ownership transfer, failure branch를 증명하는 부분만 남깁니다.
- 변경 전/후 비교가 핵심이면 parent와 current SHA의 대응 조각을 나란히 기록합니다.
- line number는 tree나 formatter에 따라 변할 수 있으므로 path와 symbol을 기본 식별자로 사용합니다.
- 실제 코드를 확인하지 못한 항목은 추측으로 채우지 않고 “확인하지 못한 path/symbol과 이유”를 기록합니다.

## Test commit 학습 방법

각 test commit에서 다음을 분리해 기록합니다.

- 대상 production invariant
- 재현하는 failure 또는 boundary
- test technique: real process/socket, fake backend, injected operation, white-box setup, sanitizer 등
- 실제 통과하는 production code path
- test가 증명하는 것
- test가 증명하지 않는 것
- broad integration인지 deterministic regression인지
- 후속 변경에서 막는 회귀
- 실행 환경, 명령, 결과와 실패 transcript/log

테스트가 통과했다는 사실만 적지 않습니다. 어떤 production branch를 어떤 입력과 seam으로 통과시켰는지 설명할 수 있어야 완료입니다.

## 문서 완료 기준

- 모든 Thread의 commit을 source 순서대로 확인했습니다.
- 모든 기록이 해당 SHA 코드에 근거하며 final HEAD를 소급 사용하지 않았습니다.
- S/A/B/C 중요도에 맞게 학습 깊이를 구분했습니다.
- 각 중요한 commit에서 실제 path, symbol, state, caller/callee, failure/cleanup 근거를 남겼습니다.
- fix와 regression test를 하나의 원인-수정-검증 흐름으로 연결했습니다.
- invariant ledger에 도입, 강화, 부족함 발견, fix, regression test를 구분했습니다.
- Thread 최종 architecture 또는 execution flow를 자신의 코드 증거로 설명할 수 있습니다.
- 별도 프로젝트 재학습 없이 commit history에 근거해 설계 → 구현 → 실패 → 수정 → 검증 과정을 다시 설명할 수 있습니다.
