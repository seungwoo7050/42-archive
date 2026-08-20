# A single output state becomes a robust system-call boundary

## 1. Thread 목표

초기 local write/count 처리에서 출발해, 모든 conversion이 공유하는 `t_printf` 출력 상태와 최종 POSIX `write` 진행 정책이 어떤 commit을 거쳐 형성되는지 복원합니다.

### Source에서 확정된 significance

출력 계층은 편의성 helper에서 모든 conversion이 공유하는 상태 머신으로 발전합니다. count 범위, progress, interruption, permanent failure, system-call 비용, process signal policy가 명시되고 운영체제 타이밍에 의존하지 않는 방식으로 검증됩니다.

### 이 Thread에 명시적으로 연결되는 source invariant / engineering difficulty

- Invariant: 누적 count는 `INT_MAX`를 넘어 narrow/overflow하지 않습니다.
- Invariant: positive short write는 buffer를 전진시키고, `EINTR`는 retry하며, request는 `SSIZE_MAX`를 넘지 않고, non-retryable 또는 zero-byte result는 output을 error로 중단합니다.
- Invariant: library는 process의 `SIGPIPE` disposition을 바꾸지 않으며, 이미 OS가 받아들인 byte를 rollback할 수 없습니다.
- Engineering difficulty: partial write, interruption, zero progress, `EPIPE`, `SIGPIPE`를 처리하면서 process-wide signal policy까지 library가 소유하지 않는 경계를 유지하는 문제입니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 출력 descriptor, 누적 count, sticky error의 ownership은 언제 하나의 상태로 묶이는가?
- positive short write, `EINTR`, zero progress, permanent error는 각각 state와 buffer offset을 어떻게 바꾸는가?
- `ssize_t` 결과와 public `int` return count 사이의 범위 경계는 어디에서 보장되는가?
- wide padding 성능 개선은 공통 failure/count path를 우회하지 않고 어떻게 이루어지는가?
- `EPIPE`가 발생해도 library가 process-wide `SIGPIPE` policy를 소유하지 않는다는 사실은 코드와 테스트에서 어떻게 드러나는가?

## 3. 완료 기준

- `1d6a5cee3041`부터 `1223518652bd`까지 write state transition을 실제 함수와 branch로 설명할 수 있습니다.
- count overflow, short write, `EINTR`, zero return, `EPIPE` 각각에 대해 state 변화와 public return 결과를 구분할 수 있습니다.
- 64-byte padding chunk가 성능만 바꾸고 공통 output invariant는 바꾸지 않는다는 근거를 해당 SHA 코드와 테스트에서 제시할 수 있습니다.
- caller-owned `SIGPIPE` disposition과 library-owned error propagation의 경계를 설명할 수 있습니다.

## 4. Commit map

| SHA | Subject | Importance | Tags | Source-defined role |
| --- | --- | --- | --- | --- |
| `1d6a5cee3041` | feat(core): 리터럴과 퍼센트 출력 구현 | `B` | `CORE, OUTPUT` | Starts with a local write-and-count helper that rejects short writes. |
| `3f7b0ab926d0` | feat(output): 출력 컨텍스트와 쓰기 API 추가 | `S` | `ARCH, OUTPUT, CORE` | Introduces shared descriptor, count, and sticky-error state and resumes after positive short writes. |
| `78e5d25d7df6` | refactor(core): 리터럴 출력을 컨텍스트 API로 이관 | `B` | `OUTPUT, REFACTOR` | Migrates literal output to the shared context, eliminating duplicate accounting. |
| `c627bd1f85bb` | fix(output): 쓰기 결과를 집계하기 전에 범위 검증 | `A` | `OUTPUT, RISK, DEBUG` | Validates a wide `ssize_t` result before narrowing it into the public `int` count. |
| `8a3ec50cb689` | fix(output): 중단된 쓰기 재시도와 요청 크기 제한 | `S` | `OUTPUT, CORE, RISK` | Caps requests at `SSIZE_MAX`, retries `EINTR`, and creates a deterministic write seam. |
| `22e65c176b5d` | perf(output): 반복 채움을 묶어서 출력 | `A` | `OUTPUT, PERF` | Emits wide padding in bounded chunks rather than one system call per byte. |
| `1223518652bd` | test(output): 쓰기 실패 시퀀스와 채움 전략 검증 | `A` | `OUTPUT, TEST, RISK` | Scripts partial progress, interruption, zero writes, `EPIPE`, and verifies `SIGPIPE` and chunking policy. |

## 5. Commit별 학습 기록

> 원칙: 아래 기록은 final HEAD가 아니라 각 항목의 정확한 SHA에서 작성합니다. source가 확정하지 않은 파일명/함수명은 현재 골격에서 추측하지 않습니다.

## 5.1 `1d6a5cee3041` — feat(core): 리터럴과 퍼센트 출력 구현

- Importance: `B`
- Tags: `CORE, OUTPUT`
- Most Important Commits 목록: 미포함
- Thread 내 역할: Starts with a local write-and-count helper that rejects short writes.
- Commit Classification summary: Creates the public entry point, archive, literal loop, percent escape, and initial counting.
- Importance 근거: This is necessary project bootstrap, but its one-byte writes and short-write rejection are an initial implementation later replaced by the defining output architecture.

### 학습 깊이
- 이 commit은 Thread 흐름에서 맡는 구현 역할과 필요한 state/code 변화에 집중합니다.
- 학습자 기록 — 직전 상태 대비 필요한 변화:
  - 
- 학습자 기록 — 이 commit이 맡는 구현 책임:
  - 
- 학습자 기록 — 해당 SHA에서 확인한 핵심 상태/flow 변화:
  - 
- 학습자 기록 — 이후 commit이 보강하거나 대체하는 부분:
  - 

### 해당 SHA에서 확인할 코드
- 해당 SHA에서 public `ft_printf` entry point와 local write/count helper의 실제 이름과 위치를 찾습니다.
- literal byte와 `%%`가 main format loop에서 어떤 branch를 거쳐 fd 1로 전달되는지 추적합니다.
- null format, `write` failure, count + requested length의 `INT_MAX` overflow check 순서를 실제 조건식으로 기록합니다.
- positive short write가 “일부 progress”가 아니라 failure로 판정되는 조건을 확인합니다.
- 직후 `3f7b0ab926d0`과 비교하여 descriptor/count/error 책임 중 무엇이 local implementation에서 context로 이동했는지 기록합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - 
- 학습자 기록 — 필요한 최소 코드 발췌:
```c

```

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 

## 5.2 `3f7b0ab926d0` — feat(output): 출력 컨텍스트와 쓰기 API 추가

- Importance: `S`
- Tags: `ARCH, OUTPUT, CORE`
- Most Important Commits 목록: 포함
- Thread 내 역할: Introduces shared descriptor, count, and sticky-error state and resumes after positive short writes.
- Commit Classification summary: Introduces a shared output context with descriptor, count, sticky error, and short-write progress.
- Importance 근거: This abstraction determines how every later formatter accounts for bytes and propagates failure. Removing it would leave a fundamental gap in the project's responsibility boundaries and output correctness story.

### 학습 깊이
- 이 commit은 architecture/invariant의 핵심으로 취급합니다.
- 학습자 기록 — 직전 상태:
  - 
- 학습자 기록 — 해결하려던 문제:
  - 
- 학습자 기록 — 기존 설계가 충분하지 않았던 이유:
  - 
- 학습자 기록 — 선택한 핵심 decision:
  - 
- 학습자 기록 — ownership / lifecycle / state transition:
  - 
- 학습자 기록 — failure scenario와 public consequence:
  - 
- 학습자 기록 — 이 SHA가 보장하는 것:
  - 
- 학습자 기록 — 아직 보장하지 않는 것:
  - 
- 학습자 기록 — 후속 fix/test로 이어지는 지점:
  - 

### 해당 SHA에서 확인할 코드
- 해당 SHA의 private `t_printf` 정의에서 descriptor, accumulated count, sticky error에 대응하는 실제 field를 기록합니다.
- context initializer, `ft_printf_write`, `ft_printf_putchar`의 caller/callee 관계를 추적합니다.
- `ft_printf_write`에서 positive short write 후 buffer pointer/remaining length/count가 각각 언제 갱신되는지 순서대로 기록합니다.
- 한 번 error state에 들어간 뒤 subsequent write가 어떻게 차단되는지 모든 early-return branch를 확인합니다.
- count overflow 검사 위치와 `write` return type 처리 방식을 기록하고, 이후 `c627bd1f85bb`가 왜 이 경계를 다시 수정하는지 비교할 근거를 남깁니다.
- parent SHA와 diff하여 이전 local state가 제거/대체된 정확한 코드 지점을 기록합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - 
- 학습자 기록 — 필요한 최소 코드 발췌:
```c

```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전:
  - 이후:

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 

## 5.3 `78e5d25d7df6` — refactor(core): 리터럴 출력을 컨텍스트 API로 이관

- Importance: `B`
- Tags: `OUTPUT, REFACTOR`
- Most Important Commits 목록: 미포함
- Thread 내 역할: Migrates literal output to the shared context, eliminating duplicate accounting.
- Commit Classification summary: Migrates literal and percent output to the shared context.
- Importance 근거: The migration removes duplicate accounting and is required integration work, but the decisive architecture was established by the preceding context commit.

### 학습 깊이
- 이 commit은 Thread 흐름에서 맡는 구현 역할과 필요한 state/code 변화에 집중합니다.
- 학습자 기록 — 직전 상태 대비 필요한 변화:
  - 
- 학습자 기록 — 이 commit이 맡는 구현 책임:
  - 
- 학습자 기록 — 해당 SHA에서 확인한 핵심 상태/flow 변화:
  - 
- 학습자 기록 — 이후 commit이 보강하거나 대체하는 부분:
  - 

### 해당 SHA에서 확인할 코드
- 해당 SHA의 `ft_printf`에서 literal/escaped-percent가 shared output API를 호출하는 지점을 찾습니다.
- entry point가 format traversal, variadic traversal init/close, final context-to-public-result translation만 담당하는지 실제 코드로 확인합니다.
- 직전 SHA에 남아 있던 local write/count implementation이 완전히 제거되었는지 diff로 확인합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - 
- 학습자 기록 — 필요한 최소 코드 발췌:
```c

```

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 

## 5.4 `c627bd1f85bb` — fix(output): 쓰기 결과를 집계하기 전에 범위 검증

- Importance: `A`
- Tags: `OUTPUT, RISK, DEBUG`
- Most Important Commits 목록: 미포함
- Thread 내 역할: Validates a wide `ssize_t` result before narrowing it into the public `int` count.
- Commit Classification summary: Rejects a write result wider than int before narrowing and adding it.
- Importance 근거: The small fix restores the public count invariant at the exact conversion boundary and avoids implementation-defined narrowing. Its impact is significant despite the one-line diff.

### 학습 깊이
- 이 commit은 주요 subsystem/boundary/failure path/integration point 수준으로 추적합니다.
- 학습자 기록 — 직전 상태와 문제:
  - 
- 학습자 기록 — 설계 판단 / boundary 변화:
  - 
- 학습자 기록 — 핵심 state/invariant 변화:
  - 
- 학습자 기록 — failure 또는 edge case:
  - 
- 학습자 기록 — 보장하는 것 / 보장하지 않는 것:
  - 보장:
  - 미보장:
- 학습자 기록 — 다음 관련 commit 연결:
  - 

### 해당 SHA에서 확인할 코드
- fix 직전 SHA에서 `write`의 `ssize_t` result가 `int`로 cast되는 위치와 overflow guard의 평가 순서를 기록합니다.
- `ssize_t` successful result가 `INT_MAX`보다 큰 경우 이전 식이 어떤 narrowing 위험을 갖는지 type 단위로 설명합니다.
- fix SHA에서 “개별 `written` representability 확인 → accumulated sum 확인”의 실제 조건 순서를 기록합니다.
- 범위 위반 시 sticky error와 public `-1`까지 어떤 경로로 전달되는지 추적합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - 
- 학습자 기록 — 필요한 최소 코드 발췌:
```c

```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전:
  - 이후:

### Failure → Fix 추적
- 기존 가정/상태: `write` result를 `int`로 먼저 cast해도 overflow guard가 안전하다는 암묵적 가정
- 실제 failure 또는 위험: `ssize_t` successful result > `INT_MAX`일 때 narrowing이 implementation-defined/negative가 될 수 있음
- source가 지목한 root cause: 범위 검증보다 cast가 먼저 일어나는 순서
- 수정된 decision/invariant: 각 `written`이 `int`에 representable한지 먼저 확인하고, 그 다음 accumulated sum을 `INT_MAX`에 대해 검증
- 학습자 기록 — 실제 수정 코드:
  - 
- 학습자 기록 — regression test 연결:
  - source에 직접 연결된 후속 test가 있으면 SHA와 test case를 기록하고, 직접 대응 test가 명시되지 않았다면 그렇게 구분해서 기록합니다.

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 

## 5.5 `8a3ec50cb689` — fix(output): 중단된 쓰기 재시도와 요청 크기 제한

- Importance: `S`
- Tags: `OUTPUT, CORE, RISK`
- Most Important Commits 목록: 포함
- Thread 내 역할: Caps requests at `SSIZE_MAX`, retries `EINTR`, and creates a deterministic write seam.
- Commit Classification summary: Caps write requests at SSIZE_MAX, retries EINTR, and exposes a deterministic write test seam.
- Importance 근거: This completes the project-defining POSIX output policy beyond simple short-write handling. It establishes progress, interruption, and request-range invariants used by every conversion and enables direct failure-path proof.

### 학습 깊이
- 이 commit은 architecture/invariant의 핵심으로 취급합니다.
- 학습자 기록 — 직전 상태:
  - 
- 학습자 기록 — 해결하려던 문제:
  - 
- 학습자 기록 — 기존 설계가 충분하지 않았던 이유:
  - 
- 학습자 기록 — 선택한 핵심 decision:
  - 
- 학습자 기록 — ownership / lifecycle / state transition:
  - 
- 학습자 기록 — failure scenario와 public consequence:
  - 
- 학습자 기록 — 이 SHA가 보장하는 것:
  - 
- 학습자 기록 — 아직 보장하지 않는 것:
  - 
- 학습자 기록 — 후속 fix/test로 이어지는 지점:
  - 

### 해당 SHA에서 확인할 코드
- fix 직전 output loop에서 `EINTR`가 어떤 branch로 permanent failure가 되는지 확인합니다.
- fix SHA의 `ft_printf_write`에서 request length를 `SSIZE_MAX`로 cap하는 계산, `write` call, return-value 분기를 순서대로 추적합니다.
- positive return, `EINTR`, zero return, other error 각각에 대해 buffer/remaining/count/error가 변하는지 state table로 기록합니다.
- `EINTR` retry에서는 count와 remaining range가 유지되는지 실제 mutation 위치로 확인합니다.
- production build와 deterministic test build가 system-call boundary만 바꾸도록 `FT_PRINTF_TEST_WRITE` seam이 적용되는 위치를 확인합니다.
- 후속 `1223518652bd`의 scripted writer가 이 seam을 통해 어떤 production branch를 통과하는지 연결합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - 
- 학습자 기록 — 필요한 최소 코드 발췌:
```c

```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전:
  - 이후:

### Failure → Fix 추적
- 기존 가정/상태: positive short write만 resume하면 충분하고 interrupted call은 ordinary failure로 처리해도 된다는 상태
- 실제 failure 또는 위험: `EINTR`가 progress 없이 permanent failure가 되고 `size_t` remaining request가 `SSIZE_MAX`보다 클 수 있음
- source가 지목한 root cause: interruption과 permanent error를 구분하지 않고 system call signed result range를 request size에 반영하지 않음
- 수정된 decision/invariant: `SSIZE_MAX` request cap + `EINTR` transparent retry + nonpositive non-`EINTR` sticky failure + deterministic seam
- 학습자 기록 — 실제 수정 코드:
  - 
- 학습자 기록 — regression test 연결:
  - source에 직접 연결된 후속 test가 있으면 SHA와 test case를 기록하고, 직접 대응 test가 명시되지 않았다면 그렇게 구분해서 기록합니다.

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 

## 5.6 `22e65c176b5d` — perf(output): 반복 채움을 묶어서 출력

- Importance: `A`
- Tags: `OUTPUT, PERF`
- Most Important Commits 목록: 미포함
- Thread 내 역할: Emits wide padding in bounded chunks rather than one system call per byte.
- Commit Classification summary: Emits repeated padding through bounded 64-byte chunks instead of one write per character.
- Importance 근거: The change materially reduces system-call count for wide fields while preserving bounded stack use and failure propagation. Later fault tests make the cost model observable.

### 학습 깊이
- 이 commit은 주요 subsystem/boundary/failure path/integration point 수준으로 추적합니다.
- 학습자 기록 — 직전 상태와 문제:
  - 
- 학습자 기록 — 설계 판단 / boundary 변화:
  - 
- 학습자 기록 — 핵심 state/invariant 변화:
  - 
- 학습자 기록 — failure 또는 edge case:
  - 
- 학습자 기록 — 보장하는 것 / 보장하지 않는 것:
  - 보장:
  - 미보장:
- 학습자 기록 — 다음 관련 commit 연결:
  - 

### 해당 SHA에서 확인할 코드
- 이 SHA에서 repeated-character output이 one-byte loop에서 bounded stack chunk로 바뀐 함수와 diff를 찾습니다.
- 64-byte buffer 준비, 남은 padding에 따른 chunk length 결정, 반복 호출 순서를 기록합니다.
- 각 chunk가 직접 `write`하지 않고 shared `ft_printf_write`를 통과하는지 확인하여 count/error semantics가 유지되는 근거를 기록합니다.
- width가 매우 커도 stack usage가 user width와 비례하지 않는 이유를 실제 local storage 크기로 확인합니다.
- 후속 `1223518652bd`의 width 1000 test가 call count와 64-byte maximum을 어떻게 관찰하는지 연결합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - 
- 학습자 기록 — 필요한 최소 코드 발췌:
```c

```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전:
  - 이후:

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 

## 5.7 `1223518652bd` — test(output): 쓰기 실패 시퀀스와 채움 전략 검증

- Importance: `A`
- Tags: `OUTPUT, TEST, RISK`
- Most Important Commits 목록: 포함
- Thread 내 역할: Scripts partial progress, interruption, zero writes, `EPIPE`, and verifies `SIGPIPE` and chunking policy.
- Commit Classification summary: Injects partial writes, EINTR, EPIPE, zero progress, and verifies SIGPIPE and padding chunks.
- Importance 근거: This provides deterministic evidence for the S-level output state machine and confirms that the library does not mutate process signal policy. It is unusually strong failure-path verification.

### 학습 깊이
- 이 commit은 주요 subsystem/boundary/failure path/integration point 수준으로 추적합니다.
- 학습자 기록 — 직전 상태와 문제:
  - 
- 학습자 기록 — 설계 판단 / boundary 변화:
  - 
- 학습자 기록 — 핵심 state/invariant 변화:
  - 
- 학습자 기록 — failure 또는 edge case:
  - 
- 학습자 기록 — 보장하는 것 / 보장하지 않는 것:
  - 보장:
  - 미보장:
- 학습자 기록 — 다음 관련 commit 연결:
  - 

### 해당 SHA에서 확인할 코드
- fault binary가 `FT_PRINTF_TEST_WRITE` seam을 사용하도록 build되는 실제 Makefile rule/compile definition을 기록합니다.
- scripted writer가 configured return sequence, request length, accepted bytes, call record를 어떤 상태로 보관하는지 확인합니다.
- full write, short write, `EINTR`, zero, `EPIPE` case마다 production `ft_printf_write`의 어떤 branch를 통과하는지 매핑합니다.
- partial failure 이전에 accepted된 bytes가 exact하게 남고 이후 write가 중단되는지 assertion을 확인합니다.
- width 1000 padding case의 request count와 maximum chunk 64 assertion을 확인합니다.
- real broken-pipe test에서 caller-owned `SIGPIPE` handler 설치/복원과 `ft_printf` return을 함께 확인합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - 
- 학습자 기록 — 필요한 최소 코드 발췌:
```c

```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전:
  - 이후:

### Test commit 학습 기록
- production invariant 대상: positive short write progress, `EINTR` retry, zero/permanent failure stop, `SIGPIPE` ownership boundary, 64-byte padding chunk policy
- 재현하는 failure / boundary: scripted partial write, `EINTR`, zero-byte result, `EPIPE`; 별도의 real broken pipe
- test technique: compile-time write seam을 통한 deterministic fault injection + call/emitted-byte recording + real signal-policy case
- 통과하는 production path: `ft_printf` → padding/conversion output → `ft_printf_write` → substituted writer 또는 real `write`
- 이 test가 source상 증명하려는 것: retry offset, no-progress handling, hard-failure stop, prior accepted bytes, chunk bound, caller-owned signal disposition
- 이 test가 증명하지 않는 것: 모든 OS scheduling/timing behavior나 이미 OS가 받아들인 byte의 rollback을 증명하지 않습니다.
- 분류: deterministic regression/fault-injection 중심이며 signal policy는 real integration boundary case를 포함합니다.
- 후속 회귀 방지 역할: output loop, retry policy, padding optimization이 바뀌어도 동일 state transition과 signal boundary를 유지하도록 막습니다.
- 학습자 기록 — 실제 test 함수/fixture/seam/assertion:
  - 
- 학습자 기록 — 직접 실행했다면 command / 환경 / 결과:
  - command:
  - environment:
  - result:

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 

## 6. Invariant ledger

Source가 확정한 변화 축을 아래에 배치했습니다. “실제 코드 근거”는 학습자가 해당 SHA를 읽고 채웁니다.

| Invariant / concern | 도입 또는 초기 상태 | 강화 / 수정 | 고정한 검증 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| 공유 count/error state | `3f7b0ab926d0`에서 `t_printf`로 중앙화 | `c627bd1f85bb`에서 wide `ssize_t`를 `int`로 narrow하기 전 검증을 강화 | `1223518652bd`에서 fault sequence로 state transition 검증 |  |
| write progress policy | `1d6a5cee3041`은 short write를 failure로 처리 | `3f7b0ab926d0`은 positive short write 진행을 도입하고 `8a3ec50cb689`는 `EINTR`/`SSIZE_MAX` 정책을 완성 | `1223518652bd`에서 partial/interrupt/zero/permanent failure를 deterministic하게 검증 |  |
| padding cost model | `22e65c176b5d`에서 64-byte bounded chunk 도입 | 공통 `ft_printf_write` path 유지 | `1223518652bd`에서 width 1000의 call count와 최대 chunk 확인 |  |
| signal ownership | `8a3ec50cb689`의 output error policy와 연결 | library가 `SIGPIPE` handler를 대체하지 않는 boundary 유지 | `1223518652bd`의 real broken-pipe test로 확인 |  |

### 학습자 추가 기록

- source가 명시한 invariant 범위 안에서만 필요한 행을 추가합니다. 새 invariant를 확정 사실처럼 만들지 않습니다.
- 추가 기록:
  - 

## 7. Failure → Fix → Test 연결

| 기존 failure / risk | Fix / change | 수정 decision | Test / 학습 확인 |
| --- | --- | --- | --- |
| short write를 progress로 다루지 못함 | `3f7b0ab926d0` | positive short write 이후 남은 suffix 재시도 | `1223518652bd`에서 scripted partial write로 최종 검증 |
| wide `ssize_t`를 먼저 `int`로 cast할 위험 | `c627bd1f85bb` | narrowing 전에 개별 result 범위를 검증 | 학습자가 후속 test suite에서 이 경계의 직접/간접 검증 범위를 구분해 기록 |
| `EINTR`를 permanent failure로 취급하고 request가 `SSIZE_MAX`를 넘을 수 있음 | `8a3ec50cb689` | `EINTR` retry + request cap + test seam | `1223518652bd`에서 scripted `EINTR`, partial, zero, `EPIPE` 검증 |
| padding byte마다 system call 발생 | `22e65c176b5d` | stack의 bounded 64-byte chunk로 반복 출력 | `1223518652bd`에서 chunk size와 call count 검증 |

- 학습자 기록 — 실제 failure branch와 regression assertion을 연결한 추가 설명:
  - 

## 8. Ownership / state / responsibility 변화

| 시점 | Source상 owner / boundary | Source상 responsibility 변화 | 해당 SHA 코드 근거 |
| --- | --- | --- | --- |
| 초기 | `ft_printf` 내부/local helper | descriptor write, count, literal/percent 처리의 일부가 entry point 주변에 함께 존재 |  |
| `3f7b0ab926d0` | `t_printf` + output API | descriptor, count, sticky error를 하나의 private context가 소유 |  |
| `78e5d25d7df6` | `ft_printf` vs output context | entry point는 traversal/variadic lifecycle/final result translation에 집중하고 output semantics는 context로 이동 |  |
| `8a3ec50cb689` 이후 | `ft_printf_write` system-call boundary | request sizing, retry, progress, permanent failure의 책임이 한 write loop에 모임 |  |
| `22e65c176b5d` 이후 | padding producer vs output state | padding producer는 chunk를 만들고 실제 progress/count/failure는 기존 output API가 계속 소유 |  |

## 9. Thread 최종 상태

- Source가 확정한 도달점: 모든 conversion이 공유하는 output state machine에서 count range, progress, interruption, permanent failure, syscall cost, signal policy가 명시되고 별도로 검증된 상태입니다.
- 학습자 기록 — 마지막 commit 기준 실제 코드에서 확인한 최종 state:
  - 
- 학습자 기록 — 이 Thread 밖에서만 해결되는 남은 문제를 source 범위 안에서 구분:
  - 

## 10. 최종 architecture 또는 execution flow 정리

실제 SHA 코드를 읽은 뒤 아래 흐름을 완성합니다. source 설명만 복사하지 말고 함수/상태/branch를 연결합니다.

```text
[caller / entry]
    -> [구체 함수 또는 state]
    -> [변환 / mutation / validation]
    -> [failure branch 또는 next stage]
    -> [public consequence]
```

- 각 단계에 대응하는 SHA / file / function:
  - 
- 핵심 state transition:
  - 
- failure가 끊기는 지점:
  - 
- 후속 fix/test가 보장한 지점:
  - 

## 11. 학습 완료 자가 점검

- [ ] Commit map의 모든 SHA를 정확한 시점의 코드로 확인했습니다.
- [ ] 각 commit의 subject, importance, tags를 source와 그대로 유지했습니다.
- [ ] final HEAD의 코드를 과거 commit 설명에 소급 사용하지 않았습니다.
- [ ] 필요한 parent/직전 관련 SHA 비교를 실제 diff로 수행했습니다.
- [ ] source가 확정한 사실과 내가 코드에서 확인한 사실을 구분했습니다.
- [ ] fix의 기존 가정 → failure/risk → root cause → decision → code → test 연결을 필요한 곳에서 완성했습니다.
- [ ] test commit의 target invariant, technique, production path, proves/not-proves를 구분했습니다.
- [ ] Invariant ledger에 실제 코드 근거를 채웠습니다.
- [ ] 이 Thread의 최종 architecture/execution flow를 commit history 순서로 설명할 수 있습니다.
