# Verification reaches runtime and artifact boundaries

## 1. Thread 목표

verification이 단순 format 결과 비교에서 deterministic syscall failure, project-specific contract, distributable archive, sanitizer runtime까지 어떻게 확장되는지 복원합니다.

### Source에서 확정된 significance

각 verification layer는 서로 다른 질문에 답합니다. bytes 일치 여부, failure sequence에서 output contract 유지 여부, libc를 portable oracle로 쓸 수 없는 프로젝트 semantics의 고정 여부, distributable archive boundary, 실행된 경로의 UB/invalid memory access 여부를 각각 분리해 검증합니다.

### 이 Thread에 명시적으로 연결되는 source invariant / engineering difficulty

- Invariant: built archive는 expected definitions와 external dependencies를 노출하고 public header만 보는 consumer와 link됩니다.
- Invariant: output fault verification은 partial, interrupted, zero-progress, permanent failure를 deterministic하게 재현해야 합니다.
- Invariant: project-specific semantics는 portable libc oracle가 아닌 fixed expectations로 구분되어야 합니다.
- Engineering difficulty: system-call sequence를 deterministic하게 검증하면서 portable libc behavior와 formatted percent 같은 explicit project extension을 구분하고, runtime뿐 아니라 release artifact boundary까지 증거를 확장하는 문제입니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- `snprintf`를 oracle로 사용할 수 있는 case와 fixed project expectation이 필요한 case는 어떻게 구분되는가?
- stdout capture는 emitted bytes, captured length, return value를 어떻게 함께 검증하는가?
- scripted writer는 nondeterministic OS behavior 없이 어떤 output state transition을 재현하는가?
- release test는 source-tree 내부 성공이 아니라 어떤 archive/public API/dependency/consumer boundary를 검증하는가?
- UBSan과 Linux ASan 경로는 library source와 fault binary까지 실제 instrument하는가?
- 각 test layer가 증명하지 않는 범위는 무엇인가?

## 3. 완료 기준

- 각 verification commit의 대상 invariant, failure/boundary, technique, production path, proved/not-proved 범위를 구분해 설명할 수 있습니다.
- libc differential test와 fixed expectation의 기준을 실제 test case로 분리할 수 있습니다.
- deterministic fault injection과 real broken-pipe signal test가 서로 다른 것을 검증함을 설명할 수 있습니다.
- archive member/global symbol/external dependency/out-of-tree consumer check를 실제 release script 단계와 연결할 수 있습니다.
- sanitizer target이 implementation 자체와 fault path를 instrument하는지 build command/object graph로 확인할 수 있습니다.

## 4. Commit map

| SHA | Subject | Importance | Tags | Source-defined role |
| --- | --- | --- | --- | --- |
| `1b8049e411bb` | test(printf): 기본 변환과 포맷 경계 검증 | `A` | `FORMAT, TEST, VERIFY` | Establishes byte capture, return-count comparison, and libc differential testing. |
| `1223518652bd` | test(output): 쓰기 실패 시퀀스와 채움 전략 검증 | `A` | `OUTPUT, TEST, RISK` | Adds deterministic system-call and signal-policy verification. |
| `12d715eba77d` | test(printf): 공개 계약 경계 사례 확대 | `A` | `FORMAT, TEST, EDGE` | Records fixed expectations for deliberate project semantics that libc cannot serve as a portable oracle for. |
| `a87bcf560789` | test(release): 아카이브와 외부 소비자 검증 | `A` | `RELEASE, ARCH, VERIFY` | Verifies archive members, global definitions, external dependencies, and an out-of-tree consumer. |
| `1b474fa2a5e3` | build(sanitize): UBSan과 Linux ASan 검증 추가 | `B` | `VERIFY, TEST` | Runs normal and fault binaries under UBSan and a Linux GCC AddressSanitizer environment. |

## 5. Commit별 학습 기록

> 원칙: 아래 기록은 final HEAD가 아니라 각 항목의 정확한 SHA에서 작성합니다. source가 확정하지 않은 파일명/함수명은 현재 골격에서 추측하지 않습니다.

## 5.1 `1b8049e411bb` — test(printf): 기본 변환과 포맷 경계 검증

- Importance: `A`
- Tags: `FORMAT, TEST, VERIFY`
- Most Important Commits 목록: 미포함
- Thread 내 역할: Establishes byte capture, return-count comparison, and libc differential testing.
- Commit Classification summary: Creates stdout capture, libc differential checks, fixed expectations, and parser-overflow tests.
- Importance 근거: The harness materially changes confidence in all core conversions and return counts and becomes the basis for later regression matrices. It is significant verification rather than a defining runtime mechanism.

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
- stdout redirection/pipe capture harness가 output bytes, captured byte count, `ft_printf` return을 어떤 순서로 수집/비교하는지 기록합니다.
- `snprintf`를 independent behavioral oracle로 사용하는 supported cases와 project-defined null string/pointer fixed expectations를 구분합니다.
- literal, escaped percent, embedded NUL, integer extrema, width/alignment/precision/zero/alternate/sign/mixed flag coverage를 test grouping으로 기록합니다.
- width/precision > `INT_MAX` field가 `-1`과 zero output을 요구하는 case를 확인합니다.
- 이 시점의 harness가 late invalid field 앞에서 이미 출력된 bytes까지 막는 whole-call preflight를 증명하지는 못함을 Thread 5 관점에서 기록합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - 
- 학습자 기록 — 필요한 최소 코드 발췌:
```c

```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전:
  - 이후:

### Test commit 학습 기록
- production invariant 대상: supported formatting의 exact bytes, captured byte count, public return count 및 parser field-overflow behavior
- 재현하는 failure / boundary: conversion/flag/width/precision 조합의 visible mismatch, count mismatch, tested field overflow의 partial/invalid result
- test technique: stdout pipe capture + `snprintf` differential oracle + project-defined fixed expectations
- 통과하는 production path: public `ft_printf` 전체 conversion pipeline
- 이 test가 source상 증명하려는 것: 넓은 정상/edge formatting surface와 return-count consistency, tested parser overflow boundary
- 이 test가 증명하지 않는 것: late invalid field의 whole-call no-output preflight, deterministic syscall retry sequence, release artifact boundary를 아직 증명하지 않습니다.
- 분류: broad integration/differential harness입니다.
- 후속 회귀 방지 역할: 후속 conversion/layout changes가 기존 public formatting surface를 깨는 회귀를 막는 기반 harness가 됩니다.
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

## 5.2 `1223518652bd` — test(output): 쓰기 실패 시퀀스와 채움 전략 검증

- Importance: `A`
- Tags: `OUTPUT, TEST, RISK`
- Most Important Commits 목록: 포함
- Thread 내 역할: Adds deterministic system-call and signal-policy verification.
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

## 5.3 `12d715eba77d` — test(printf): 공개 계약 경계 사례 확대

- Importance: `A`
- Tags: `FORMAT, TEST, EDGE`
- Most Important Commits 목록: 미포함
- Thread 내 역할: Records fixed expectations for deliberate project semantics that libc cannot serve as a portable oracle for.
- Commit Classification summary: Locks down zero precision, prefixes, null values, percent extensions, and width/precision boundary matrices.
- Importance 근거: Several expectations are deliberate project contracts rather than portable libc behavior. Fixing them explicitly is significant for preserving the library's actual public semantics.

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
- precision zero, digit-count transition, signs, alternate prefix, content-width boundary에 대한 differential matrix를 찾아 입력 축과 expected oracle을 기록합니다.
- null format, empty format, null string, null pointer, formatted percent처럼 fixed project expectation으로 분리된 case를 식별합니다.
- 이 Thread 관점에서는 특히 null pointer의 `0x` prefix와 precision-zero digit suppression, width가 content보다 작은/큰 경우의 production layout path를 추적합니다.
- libc와 비교하지 않는 fixed expectation이 “왜 project contract인지” source description과 test implementation을 대응시킵니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - 
- 학습자 기록 — 필요한 최소 코드 발췌:
```c

```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전:
  - 이후:

### Test commit 학습 기록
- production invariant 대상: public formatting boundary에서 zero precision, prefixes, null values, percent extension, width/precision edge semantics 유지
- 재현하는 failure / boundary: libc-comparable boundary interaction 오류 또는 project-specific null/pointer/percent semantics drift
- test technique: differential matrices + fixed project-specific expectations
- 통과하는 production path: public `ft_printf` → parser/dispatch → text 또는 numeric layout/output path
- 이 test가 source상 증명하려는 것: source에 명시된 public boundary cases가 byte/return contract대로 유지됨
- 이 test가 증명하지 않는 것: system-call retry state machine이나 archive symbol/dependency boundary까지 증명하지 않습니다.
- 분류: broad boundary regression이며 일부는 deterministic fixed-contract regression입니다.
- 후속 회귀 방지 역할: numeric/text edge semantics와 deliberate project extensions가 후속 refactor에서 libc behavior와 혼동되어 바뀌는 것을 막습니다.
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

## 5.4 `a87bcf560789` — test(release): 아카이브와 외부 소비자 검증

- Importance: `A`
- Tags: `RELEASE, ARCH, VERIFY`
- Most Important Commits 목록: 미포함
- Thread 내 역할: Verifies archive members, global definitions, external dependencies, and an out-of-tree consumer.
- Commit Classification summary: Checks archive order, global definitions, external dependencies, and a header-only external consumer.
- Importance 근거: The commit establishes the distributable artifact and consumer boundary as reproducible contracts, adding significant release-level evidence beyond in-tree tests.

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
- release script의 expected archive member manifest와 actual archive member extraction/comparison 단계를 기록합니다.
- globally defined API symbol manifest와 undeclared global symbol rejection logic을 확인합니다.
- unresolved dependency allowlist에서 `write`, platform errno accessor, compiler stack-protector symbols가 어떻게 normalize/허용되는지 기록합니다.
- isolated temporary directory consumer가 copied public header + archive 외에 repository-relative input을 사용하지 않는지 build command로 확인합니다.
- consumer의 expected output/return behavior와 temporary-state cleanup assertion을 기록합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - 
- 학습자 기록 — 필요한 최소 코드 발췌:
```c

```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전:
  - 이후:

### Test commit 학습 기록
- production invariant 대상: built archive의 members/global definitions/external dependencies/public-header-only consumer boundary
- 재현하는 failure / boundary: missing/extra object, accidental symbol export, undeclared dependency, source-tree-only link assumption, temporary-state pollution
- test technique: artifact manifest comparison + unresolved-symbol normalization/allowlist + isolated out-of-tree consumer build/run
- 통과하는 production path: archive packaging/public header/linker/runtime consumer boundary
- 이 test가 source상 증명하려는 것: delivered static archive가 source에 정의된 artifact contract로 외부 consumer에게 link/run 가능함
- 이 test가 증명하지 않는 것: 모든 internal formatting path나 sanitizer memory safety를 증명하지 않습니다.
- 분류: release/artifact integration regression입니다.
- 후속 회귀 방지 역할: build/object/symbol/header changes가 distributable boundary를 깨는 회귀를 막습니다.
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

## 5.5 `1b474fa2a5e3` — build(sanitize): UBSan과 Linux ASan 검증 추가

- Importance: `B`
- Tags: `VERIFY, TEST`
- Most Important Commits 목록: 미포함
- Thread 내 역할: Runs normal and fault binaries under UBSan and a Linux GCC AddressSanitizer environment.
- Commit Classification summary: Adds UBSan targets and a Dockerized GCC AddressSanitizer path.
- Importance 근거: The sanitizer matrix is useful safety infrastructure, but it applies standard verification without changing the formatter's architecture or contract.

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
- UBSan target이 library implementation과 functional suite를 별도 instrumented build로 compile하는 command/flags를 기록합니다.
- normal functional binary와 deterministic output-fault binary 모두 instrument되는지 object/source list로 확인합니다.
- Linux GCC container의 pinned environment에서 combined ASan/UBSan build가 어떻게 실행되는지 기록합니다.
- object-free test binary가 uninstrumented archive를 재사용하지 않는다는 근거를 build graph에서 확인합니다.
- aggregate `check`가 behavioral tests, release boundary, UB detection, whitespace 중 무엇을 포함하고 `sanitize-linux`/leak coverage는 무엇을 암시하지 않는지 기록합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - 
- 학습자 기록 — 필요한 최소 코드 발췌:
```c

```

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - 

## 6. Invariant ledger

Source가 확정한 변화 축을 아래에 배치했습니다. “실제 코드 근거”는 학습자가 해당 SHA를 읽고 채웁니다.

| Invariant / concern | 도입 또는 초기 상태 | 강화 / 수정 | 고정한 검증 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| behavioral oracle | `1b8049e411bb`에서 stdout capture + `snprintf` differential + fixed expectation 기반 생성 | `12d715eba77d`에서 deliberate project contracts를 더 명확히 분리 | 학습자가 어떤 case를 libc와 비교하고 어떤 case는 fixed expectation인지 표로 기록 |  |
| failure state machine evidence | `1223518652bd`에서 scripted writer + real broken pipe | partial/EINTR/zero/EPIPE/SIGPIPE/chunking 확인 | production write seam과 signal boundary를 함께 추적 |  |
| artifact boundary | `a87bcf560789`에서 archive members/global symbols/dependency allowlist/out-of-tree consumer 검증 | source tree 밖 소비 가능성까지 release contract로 확장 | 학습자가 manifest와 consumer build input을 실제 script에서 기록 |  |
| runtime instrumentation | `1b474fa2a5e3`에서 UBSan + pinned Linux GCC ASan/UBSan 추가 | normal + fault binaries의 implementation source까지 instrument | 실행 환경과 실제 수행 결과는 학습자가 기록 |  |

### 학습자 추가 기록

- source가 명시한 invariant 범위 안에서만 필요한 행을 추가합니다. 새 invariant를 확정 사실처럼 만들지 않습니다.
- 추가 기록:
  - 

## 7. Failure → Fix → Test 연결

| 기존 failure / risk | Fix / change | 수정 decision | Test / 학습 확인 |
| --- | --- | --- | --- |
| ordinary output comparison만으로는 retry/state transition을 증명할 수 없음 | `1223518652bd` | compile-time write seam + scripted returns + call recording | partial/EINTR/zero/EPIPE 및 64-byte padding assertions |
| libc behavior가 project extension의 portable oracle가 아닐 수 있음 | `12d715eba77d` | differential cases와 project-specific fixed expectations 분리 | null format/string/pointer/percent extension 등 실제 fixed cases를 test에서 분류 |
| in-tree test 성공만으로 archive/package boundary를 증명할 수 없음 | `a87bcf560789` | artifact manifests + dependency check + isolated consumer | consumer가 public header와 archive만 사용해 build/run하는지 확인 |
| value-based tests만으로 UB/address fault를 모두 관찰할 수 없음 | `1b474fa2a5e3` | implementation과 fault suite를 sanitizer build로 별도 compile | UBSan과 Linux ASan/UBSan의 실제 coverage와 미포함 leak 범위를 기록 |

- 학습자 기록 — 실제 failure branch와 regression assertion을 연결한 추가 설명:
  - 

## 8. Ownership / state / responsibility 변화

| 시점 | Source상 owner / boundary | Source상 responsibility 변화 | 해당 SHA 코드 근거 |
| --- | --- | --- | --- |
| functional suite | visible output/public return contract | byte sequence, captured count, return value 및 supported libc-comparable semantics |  |
| fault suite | output system-call boundary | scripted `write` result와 call sequence를 소유하여 state transition 관찰 |  |
| fixed project cases | project public semantics | portable libc behavior가 아닌 explicit expectation을 test가 고정 |  |
| release script | distributable archive boundary | members, symbols, unresolved dependencies, public-header-only consumer를 확인 |  |
| sanitizer build | runtime language/address diagnostics | normal/fault path의 implementation source를 instrumentation 대상으로 포함 |  |

## 9. Thread 최종 상태

- Source가 확정한 도달점: verification이 visible formatting에서 failure state machine, project-specific semantics, archive consumer boundary, sanitizer runtime까지 계층별로 확장된 상태입니다.
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
