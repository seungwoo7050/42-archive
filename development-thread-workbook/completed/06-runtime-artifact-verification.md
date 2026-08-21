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
  - implementation은 있었지만 stdout의 raw bytes와 public return을 함께 수집하고, portable printf semantics와 repository-specific semantics를 구분해 자동 비교하는 in-tree harness가 없었습니다.
- 학습자 기록 — 설계 판단 / boundary 변화:
  - pipe와 `dup2`로 stdout을 캡처하고, supported portable cases는 `snprintf`가 만든 expected bytes/return과 비교합니다. null pointer/string처럼 libc 표현이 이식 가능한 단일 oracle이 아닌 case는 explicit expected output으로 분리합니다.
- 학습자 기록 — 핵심 state/invariant 변화:
  - production code는 바뀌지 않습니다. verification이 textual equality뿐 아니라 embedded NUL을 포함한 captured length, exact bytes, `ft_printf` return count를 독립적으로 확인합니다.
- 학습자 기록 — failure 또는 edge case:
  - literals, `%%`, `%c`와 NUL, strings/null, signed extrema, unsigned/hex/pointer, width/alignment/precision/zero/hash/plus/space와 mixed flags, parser width/precision overflow를 그룹별로 실행합니다.
- 학습자 기록 — 보장하는 것 / 보장하지 않는 것:
  - 보장: 실제 실행 시 열거된 public formatting surface의 bytes/length/return과 field-at-start parser overflow behavior를 검증합니다.
  - 미보장: deterministic short-write/EINTR sequence, late invalid field의 whole-call atomicity, archive contents, sanitizer diagnostics는 이 layer의 대상이 아닙니다.
- 학습자 기록 — 다음 관련 commit 연결:
  - `1223518652bd`가 system-call fault layer를 추가하고, `12d715eba77d`가 differential matrix와 fixed project contracts를 넓힙니다. release/sanitizer commits는 동일 functional suite를 다른 boundary에서 사용합니다.

### 해당 SHA에서 확인할 코드
- stdout redirection/pipe capture harness가 output bytes, captured byte count, `ft_printf` return을 어떤 순서로 수집/비교하는지 기록합니다.
- `snprintf`를 independent behavioral oracle로 사용하는 supported cases와 project-defined null string/pointer fixed expectations를 구분합니다.
- literal, escaped percent, embedded NUL, integer extrema, width/alignment/precision/zero/alternate/sign/mixed flag coverage를 test grouping으로 기록합니다.
- width/precision > `INT_MAX` field가 `-1`과 zero output을 요구하는 case를 확인합니다.
- 이 시점의 harness가 late invalid field 앞에서 이미 출력된 bytes까지 막는 whole-call preflight를 증명하지는 못함을 Thread 5 관점에서 기록합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `Makefile`: archive를 link한 normal test binary와 `test` target 도입.
  - `tests/test_ft_printf.c`: `t_capture`, `capture_begin`, `capture_end`, `check_case`, `EXPECT_PRINTF`, `EXPECT_OUTPUT`, `expect_field_error`, case runners.
  - `capture_begin`은 stdout을 pipe write end로 교체하고, `capture_end`는 stdout을 복원한 뒤 read end에서 bytes를 읽습니다. `check_case`가 expected/actual return과 length, `memcmp` 결과를 검사합니다.
- 학습자 기록 — 필요한 최소 코드 발췌:
```c
/* 1b8049e411bb, tests/test_ft_printf.c, check_case */
if (actual_ret != expected_ret || actual_len != expected_ret
    || memcmp(expected, actual, (size_t)expected_ret) != 0)
{
    dprintf(STDERR_FILENO, "format: %s\n", format);
    dprintf(STDERR_FILENO, "expected ret: %d\n", expected_ret);
    dprintf(STDERR_FILENO, "actual ret: %d, actual bytes: %zd\n",
        actual_ret, actual_len);
    dump_bytes("expected", expected, expected_ret);
    dump_bytes("actual", actual, (int)actual_len);
    fail_test(line, "ft_printf output mismatch");
}
```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전: source/build만 있고 repository가 소유하는 broad public regression runner가 없었습니다.
  - 이후: normal conversion pipeline을 byte/return 기준으로 검증하지만 `write`를 대체하지 않으므로 rare syscall transition은 OS timing에 맡겨집니다.

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
  - `EXPECT_PRINTF`가 libc-comparable cases를, `EXPECT_OUTPUT`이 fixed bytes를, `expect_field_error`가 `-1`/zero capture를 담당합니다. embedded NUL은 C string 비교가 아니라 captured length와 memory bytes를 검사하므로 누락되지 않습니다.
- 학습자 기록 — 직접 실행했다면 command / 환경 / 결과:
  - command: 미실행
  - environment: exact SHA checkout을 로컬에 확보하지 못해 GitHub connector로 Makefile, test fixture, production diff를 검사했습니다.
  - result: 실행 성공을 주장하지 않습니다.

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - visible output contract를 자동 검증하는 첫 broad layer입니다. portable semantics에는 libc differential oracle을 쓰고, 이식 가능한 비교 대상이 아닌 repository-defined 표현은 fixed bytes로 분리하는 기준을 만듭니다.

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
  - ordinary pipe capture는 kernel이 보통 full write를 받아들이므로 positive short write, 정확한 EINTR 위치, zero return, partial-then-EPIPE sequence를 재현성 있게 만들 수 없었습니다. padding chunk size도 visible bytes만으로는 알 수 없습니다.
- 학습자 기록 — 설계 판단 / boundary 변화:
  - `FT_PRINTF_TEST_WRITE`로 production `ft_printf_write`의 system-call 한 지점만 test writer로 바꾸고, scripted actions와 accepted bytes/call statistics를 global fixture에 기록합니다. real `write`가 필요한 SIGPIPE policy는 normal suite에서 별도로 검사합니다.
- 학습자 기록 — 핵심 state/invariant 변화:
  - production code는 바뀌지 않습니다. test layer가 requested length, call count, largest request, accepted output prefix를 관찰해 retry offset과 stop behavior를 직접 판정합니다.
- 학습자 기록 — failure 또는 edge case:
  - PART 2→ALL, EINTR→PART 3→EINTR→ALL, immediate EPIPE, PART 3→EPIPE, ZERO, `%1000d`가 포함됩니다. real broken pipe는 caller가 설치한 SIGPIPE handler가 호출되고 유지되는지 확인합니다.
- 학습자 기록 — 보장하는 것 / 보장하지 않는 것:
  - 보장: scripted sequence에 대해 production write loop의 offset/count/error transitions와 64-byte chunk policy를 deterministic하게 검사하고, real pipe에서 library가 signal disposition을 덮지 않는지 검사합니다.
  - 미보장: 모든 kernel scheduling, `SSIZE_MAX` 크기의 실제 allocation/output, OS가 이미 accepted한 byte의 rollback, 다른 asynchronous signals의 전체 조합은 증명하지 않습니다.
- 학습자 기록 — 다음 관련 commit 연결:
  - `1b474fa2a5e3`가 normal suite뿐 아니라 이 fault source와 implementation sources도 sanitizer flags로 다시 compile합니다.

### 해당 SHA에서 확인할 코드
- fault binary가 `FT_PRINTF_TEST_WRITE` seam을 사용하도록 build되는 실제 Makefile rule/compile definition을 기록합니다.
- scripted writer가 configured return sequence, request length, accepted bytes, call record를 어떤 상태로 보관하는지 확인합니다.
- full write, short write, `EINTR`, zero, `EPIPE` case마다 production `ft_printf_write`의 어떤 branch를 통과하는지 매핑합니다.
- partial failure 이전에 accepted된 bytes가 exact하게 남고 이후 write가 중단되는지 assertion을 확인합니다.
- width 1000 padding case의 request count와 maximum chunk 64 assertion을 확인합니다.
- real broken-pipe test에서 caller-owned `SIGPIPE` handler 설치/복원과 `ft_printf` return을 함께 확인합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `Makefile`: normal archive suite 실행 뒤 `-DFT_PRINTF_TEST_WRITE tests/test_output_faults.c $(SRC)`로 fault binary를 build/run합니다. archive를 link하지 않고 implementation source를 seam과 함께 compile합니다.
  - `tests/test_output_faults.c`: `t_write_action`, `t_write_step`, `g_steps`, step/call/output statistics, `ft_printf_test_write`, `run_retry_cases`, `run_failure_cases`, `run_padding_case`.
  - `tests/test_ft_printf.c`: `run_sigpipe_policy_case`가 real pipe, caller handler, stdout redirection/복원을 소유합니다.
  - production branch mapping: PART=positive progress; EINTR=`errno == EINTR` continue; ZERO/EPIPE=sticky error; subsequent renderer/output calls stop.
- 학습자 기록 — 필요한 최소 코드 발췌:
```c
/* 1223518652bd, tests/test_output_faults.c */
add_step(WRITE_PART, 3);
add_step(WRITE_EPIPE, 0);
result = ft_printf("%s", "partial failure");
if (result != -1 || g_output_length != 3
    || memcmp(g_output, "par", 3) != 0)
    fail_test(__LINE__, "failure after a partial write was not preserved");
```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전: functional suite는 real stdout byte result만 관찰했습니다.
  - 이후: compile-time seam이 요청/응답 sequence를 test가 소유하고, normal suite에는 real SIGPIPE integration case가 추가됩니다.

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
  - `ft_printf_test_write`는 default ALL 또는 다음 scripted step을 소비합니다. PART는 request 이하 amount를 `g_output`에 복사하고, EINTR/EPIPE는 errno와 `-1`, ZERO는 0을 반환합니다. every call은 `g_write_calls`와 `g_largest_write`를 갱신합니다.
  - retry assertions: `partial`은 2 calls/max 7, `interrupt`는 4 calls/max 9. failure assertions은 immediate EPIPE/zero의 output 0과 partial failure의 exact `par`를 확인합니다. padding은 return/output 1000, calls 17, max 64, 마지막 bytes를 확인합니다.
- 학습자 기록 — 직접 실행했다면 command / 환경 / 결과:
  - command: 미실행
  - environment: exact SHA checkout을 로컬에 구성할 수 없어 connector로 test seam, Makefile, production output loop를 검사했습니다.
  - result: runtime 결과를 주장하지 않습니다.

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - visible final bytes만 보던 검증을 system-call transition까지 내린 commit입니다. fault seam은 deterministic state evidence를, real broken pipe는 process-wide signal policy를 library가 소유하지 않는 integration evidence를 제공합니다.

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
  - focused cases는 있었지만 zero precision/width/prefix를 값 배열과 체계적으로 교차하지 않았고, null format/string/pointer 및 formatted-percent extension을 하나의 explicit contract group으로 충분히 고정하지 않았습니다.
- 학습자 기록 — 설계 판단 / boundary 변화:
  - standard-comparable signed/unsigned/hex combinations는 `EXPECT_PRINTF` matrices로 `snprintf`와 비교합니다. implementation이 의도적으로 정한 null pointer/string/percent bytes는 `EXPECT_OUTPUT`으로 분리합니다.
- 학습자 기록 — 핵심 state/invariant 변화:
  - production code는 바뀌지 않습니다. test oracle의 책임이 명확해집니다. libc에 위임할 부분과 repository가 직접 소유할 부분을 case 단위로 나눕니다.
- 학습자 기록 — failure 또는 edge case:
  - signed 12 formats×5 values, unsigned 10×5, hex 11×5; null format, empty format, null pointer precision/width, null string width/precision, `%05%|%-5%|%.%` extension이 포함됩니다.
- 학습자 기록 — 보장하는 것 / 보장하지 않는 것:
  - 보장: 열거된 differential matrix와 fixed expected bytes가 public return/output contract로 유지됩니다.
  - 미보장: syscall transition, archive ABI/dependencies, unexecuted value space, memory instrumentation은 다른 layer의 대상입니다.
- 학습자 기록 — 다음 관련 commit 연결:
  - `a87bcf560789`은 functional semantics에서 distributable archive로 검증 범위를 이동하고, `1b474fa2a5e3`은 이 expanded suite를 sanitizer build에 포함합니다.

### 해당 SHA에서 확인할 코드
- precision zero, digit-count transition, signs, alternate prefix, content-width boundary에 대한 differential matrix를 찾아 입력 축과 expected oracle을 기록합니다.
- null format, empty format, null string, null pointer, formatted percent처럼 fixed project expectation으로 분리된 case를 식별합니다.
- 이 Thread 관점에서는 특히 null pointer의 `0x` prefix와 precision-zero digit suppression, width가 content보다 작은/큰 경우의 production layout path를 추적합니다.
- libc와 비교하지 않는 fixed expectation이 “왜 project contract인지” source description과 test implementation을 대응시킵니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `tests/test_ft_printf.c`: `run_signed_boundary_matrix`, `run_unsigned_boundary_matrix`, `run_hex_boundary_matrix`, `run_public_contract_boundary_cases`.
  - `EXPECT_PRINTF`: matrices의 libc-comparable results. `EXPECT_FORMAT_ERROR(NULL)`과 `EXPECT_OUTPUT`: repository-defined null/empty/pointer/string/percent cases.
- 학습자 기록 — 필요한 최소 코드 발췌:
```c
/* 12d715eba77d, tests/test_ft_printf.c,
 * run_public_contract_boundary_cases */
EXPECT_OUTPUT("0x", "%.0p", (void *)0);
EXPECT_OUTPUT("      0x", "%8.0p", (void *)0);
EXPECT_OUTPUT("0x      ", "%-8.0p", (void *)0);
EXPECT_OUTPUT("  0x0000", "%8.4p", (void *)0);
```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전: broad/focused cases가 있었으나 oracle classification과 boundary cross-product가 작았습니다.
  - 이후: portable behavior는 matrices로 확장되고 deliberate extension/representation은 fixed exact bytes로 명시됩니다.

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
  - matrices는 static arrays의 Cartesian product를 `EXPECT_PRINTF`로 반복합니다. fixed group은 literal expected buffer를 capture fixture에 넘겨 return/length/bytes를 검사하므로 host libc의 null pointer 표기나 formatted-percent 해석에 의존하지 않습니다.
- 학습자 기록 — 직접 실행했다면 command / 환경 / 결과:
  - command: 미실행
  - environment: exact SHA checkout 부재로 connector를 통해 test implementation을 검사했습니다.
  - result: 실제 pass/fail을 기록하지 않습니다.

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - oracle의 적용 범위를 명확히 한 public-contract commit입니다. standard-comparable 조합은 differential evidence를 얻고, null representation과 formatted percent처럼 repository가 결정한 semantics는 fixed expectation으로 직접 소유합니다.

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
  - in-tree test는 source tree의 include paths, source/object availability 또는 accidental globals/dependencies에 의존해도 통과할 수 있습니다. archive가 실제 배포 단위로 올바른지는 별도 증거가 없었습니다.
- 학습자 기록 — 설계 판단 / boundary 변화:
  - `release-check`가 built archive를 manifest와 비교하고 `nm -g` output을 정의/미해결 symbol로 분류합니다. 임시 directory에는 public header, archive, consumer source만 복사해 독립 compile/run합니다.
- 학습자 기록 — 핵심 state/invariant 변화:
  - production/archive 내용은 바뀌지 않습니다. verification contract가 source behavior에서 archive composition, global namespace, external runtime dependencies, consumer-visible packaging까지 확장됩니다.
- 학습자 기록 — failure 또는 edge case:
  - missing/extra/reordered object, unexpected global definition, undeclared unresolved symbol, unsupported OS/compiler normalization, repository-relative include/link assumption, wrong consumer output/return, temp cleanup 실패가 즉시 script failure입니다.
- 학습자 기록 — 보장하는 것 / 보장하지 않는 것:
  - 보장: Linux 또는 지원된 Darwin/compiler에서 manifest와 일치하는 archive가 public header만으로 external consumer에 link되고 expected output을 냅니다.
  - 미보장: 다른 플랫폼/toolchain, shared-library ABI, binary compatibility across versions, 전체 formatter functional path나 sanitizer safety를 증명하지 않습니다.
- 학습자 기록 — 다음 관련 commit 연결:
  - `1b474fa2a5e3`의 aggregate `check`가 `release-check`를 behavioral tests와 UBSan 사이에 포함합니다.

### 해당 SHA에서 확인할 코드
- release script의 expected archive member manifest와 actual archive member extraction/comparison 단계를 기록합니다.
- globally defined API symbol manifest와 undeclared global symbol rejection logic을 확인합니다.
- unresolved dependency allowlist에서 `write`, platform errno accessor, compiler stack-protector symbols가 어떻게 normalize/허용되는지 기록합니다.
- isolated temporary directory consumer가 copied public header + archive 외에 repository-relative input을 사용하지 않는지 build command로 확인합니다.
- consumer의 expected output/return behavior와 temporary-state cleanup assertion을 기록합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `Makefile`: `release-check`가 `CC=... sh tests/check_release.sh $(NAME) include tests/test_consumer.c`를 실행합니다.
  - `tests/check_release.sh`: `set -eu`, `mktemp`, cleanup trap, archive/global/external manifests, temp consumer build/run, explicit cleanup assertion.
  - expected members: `ft_printf.o`, `ft_output.o`, `ft_parse.o`, `ft_measure.o`, `ft_dispatch.o`, `ft_text.o`, `ft_numeric_layout.o`, `ft_number.o`, `ft_hex.o` 순서.
  - Linux external set: `__errno_location`, `write`; Darwin: `__error`, `write`, Clang이면 `__stack_chk_fail`, `__stack_chk_guard` 추가. Darwin leading underscore는 normalize합니다.
  - `tests/test_consumer.c`: public header만 include하고 `ft_printf("consumer:%d:%s\n", 17, "ok") == 15`를 요구합니다.
- 학습자 기록 — 필요한 최소 코드 발췌:
```sh
# a87bcf560789, tests/check_release.sh
actual_members=$(ar t "$archive" | sed '/^__.SYMDEF/d')

if [ "$actual_members" != "$expected_members" ]; then
    printf '%s\n' "archive member list mismatch" >&2
    exit 1
fi
```
- 학습자 기록 — 직전 관련 SHA와 비교한 핵심 diff:
  - 이전: `make test`는 source tree 안에서 archive/implementation을 실행했습니다.
  - 이후: `make release-check`가 archive 자체를 inspect하고 최소 배포 inputs만 가진 temporary consumer를 compile/run합니다.

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
  - `ar t`의 exact multiline string, `nm -g`에서 만든 sorted unique definitions/external files, `cmp`/`diff`, OS/compiler case statement, isolated compiler command, output `consumer:17:ok`, cleanup 후 path nonexistence가 각각 독립 assertion입니다. expected global definitions는 17개 이름으로 고정됩니다.
- 학습자 기록 — 직접 실행했다면 command / 환경 / 결과:
  - command: 미실행
  - environment: repository archive와 exact checkout이 로컬에 없어 script source/Makefile/consumer만 connector로 검사했습니다.
  - result: archive manifest나 consumer runtime 성공을 실행 결과처럼 주장하지 않습니다.

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - source tree 내부 기능 검증과 배포 산출물 검증을 분리한 commit입니다. archive의 object/symbol/dependency manifest와 public-header-only consumer를 함께 검사해 실제 전달 단위의 계약을 고정합니다.

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
  - value/byte assertions는 실행 중 UB와 invalid memory access가 결과를 우연히 맞추더라도 진단하지 못할 수 있고, archive가 uninstrumented objects로 이미 build된 상태라 단순 link만으로는 implementation 전체를 sanitizer 처리할 수 없습니다.
- 학습자 기록 — 이 commit이 맡는 구현 책임:
  - normal functional source와 deterministic fault source를 각각 모든 `$(SRC)`와 직접 compile해 UBSan 또는 ASan+UBSan instrumentation을 적용하고 실행합니다. Linux GCC path는 pinned Docker image로 제공합니다.
- 학습자 기록 — 해당 SHA에서 확인한 핵심 상태/flow 변화:
  - `sanitize-address`는 `-fsanitize=address,undefined`, `sanitize-undefined`는 `-fsanitize=undefined`로 normal/fault 두 binaries를 만들고 halt-on-error로 실행합니다. fault build에는 동일 `FT_PRINTF_TEST_WRITE` define이 적용됩니다.
- 학습자 기록 — 이후 commit이 보강하거나 대체하는 부분:
  - scaffold에 연결된 후속 verification commit은 없습니다. 이 commit은 existing contracts에 runtime diagnostics layer를 더하며 architecture를 바꾸지 않습니다.

### 해당 SHA에서 확인할 코드
- UBSan target이 library implementation과 functional suite를 별도 instrumented build로 compile하는 command/flags를 기록합니다.
- normal functional binary와 deterministic output-fault binary 모두 instrument되는지 object/source list로 확인합니다.
- Linux GCC container의 pinned environment에서 combined ASan/UBSan build가 어떻게 실행되는지 기록합니다.
- object-free test binary가 uninstrumented archive를 재사용하지 않는다는 근거를 build graph에서 확인합니다.
- aggregate `check`가 behavioral tests, release boundary, UB detection, whitespace 중 무엇을 포함하고 `sanitize-linux`/leak coverage는 무엇을 암시하지 않는지 기록합니다.
- 학습자 기록 — 실제 파일 경로 / 함수 / 구조체 / branch:
  - `Makefile`: sanitizer binary/flag variables, `sanitize-address`, `sanitize-undefined`, `sanitize`, `sanitize-linux`, `check`, cleanup targets.
  - normal commands는 `tests/test_ft_printf.c $(SRC)`, fault commands는 `-DFT_PRINTF_TEST_WRITE tests/test_output_faults.c $(SRC)`입니다. `$(NAME)` archive를 재사용하지 않습니다.
  - `sanitize-linux`는 read-only source mount의 `gcc:14-bookworm` container에서 `/source`를 writable temp로 복사하고 `make sanitize-address SANITIZER_CC=gcc`를 실행합니다.
  - `sanitize`는 UBSan target만 prerequisite로 두고 ASan은 `sanitize-linux`에서 별도 실행하라는 메시지를 출력합니다. `check: test release-check sanitize` 후 `git diff --check`; Linux ASan은 aggregate `check`에 포함되지 않습니다.
- 학습자 기록 — 필요한 최소 코드 발췌:
```make
# 1b474fa2a5e3, Makefile
$(SANITIZER_CC) $(CFLAGS) $(CPPFLAGS) $(SANITIZER_FLAGS) \
    tests/test_ft_printf.c $(SRC) -o $(SANITIZER_TEST_BIN)
$(SANITIZER_CC) $(CFLAGS) $(CPPFLAGS) $(SANITIZER_FLAGS) \
    -DFT_PRINTF_TEST_WRITE tests/test_output_faults.c $(SRC) \
    -o $(SANITIZER_FAULT_BIN)
```

### Commit 설명 완성란
- 학습자가 해당 SHA 코드와 필요한 비교 SHA를 읽은 뒤, 이 commit을 자신의 말로 설명합니다.
- 최종 설명:
  - normal과 fault paths의 implementation source를 직접 instrument하는 verification infrastructure입니다. `check`는 UBSan까지만 자동 포함하며 pinned Linux ASan/UBSan은 별도 target입니다. 실행된 test paths의 진단력을 높이지만 unexecuted paths나 explicit leak-proof contract를 뜻하지는 않습니다.

## 6. Invariant ledger

Source가 확정한 변화 축을 아래에 배치했습니다. “실제 코드 근거”는 학습자가 해당 SHA를 읽고 채웁니다.

| Invariant / concern | 도입 또는 초기 상태 | 강화 / 수정 | 고정한 검증 | 실제 코드 근거 |
| --- | --- | --- | --- | --- |
| behavioral oracle | `1b8049e411bb`에서 stdout capture + `snprintf` differential + fixed expectation 기반 생성 | `12d715eba77d`에서 deliberate project contracts를 더 명확히 분리 | 학습자가 어떤 case를 libc와 비교하고 어떤 case는 fixed expectation인지 표로 기록 | `EXPECT_PRINTF` matrices는 `snprintf`; `EXPECT_OUTPUT`/`EXPECT_FORMAT_ERROR`는 null format/string/pointer와 formatted-percent exact bytes를 repository가 직접 정의 |
| failure state machine evidence | `1223518652bd`에서 scripted writer + real broken pipe | partial/EINTR/zero/EPIPE/SIGPIPE/chunking 확인 | production write seam과 signal boundary를 함께 추적 | `ft_printf_test_write` actions/statistics, retry/failure/padding assertions; normal suite의 caller-installed SIGPIPE handler case |
| artifact boundary | `a87bcf560789`에서 archive members/global symbols/dependency allowlist/out-of-tree consumer 검증 | source tree 밖 소비 가능성까지 release contract로 확장 | 학습자가 manifest와 consumer build input을 실제 script에서 기록 | `ar t` 9-member manifest, 17 defined globals, Linux/Darwin external set, temp header/archive/consumer only compile and output/cleanup checks |
| runtime instrumentation | `1b474fa2a5e3`에서 UBSan + pinned Linux GCC ASan/UBSan 추가 | normal + fault binaries의 implementation source까지 instrument | 실행 환경과 실제 수행 결과는 학습자가 기록 | sanitizer commands가 `$(SRC)`를 두 suite에 직접 compile; `sanitize-linux` Docker path; 이번 환경에서는 실행하지 않음 |

### 학습자 추가 기록

- source가 명시한 invariant 범위 안에서만 필요한 행을 추가합니다. 새 invariant를 확정 사실처럼 만들지 않습니다.
- 추가 기록:
  - 추가 행은 만들지 않았습니다. 각 layer의 미보장 범위는 commit별 test 기록에 명시했습니다.

## 7. Failure → Fix → Test 연결

| 기존 failure / risk | Fix / change | 수정 decision | Test / 학습 확인 |
| --- | --- | --- | --- |
| ordinary output comparison만으로는 retry/state transition을 증명할 수 없음 | `1223518652bd` | compile-time write seam + scripted returns + call recording | partial/EINTR/zero/EPIPE 및 64-byte padding assertions |
| libc behavior가 project extension의 portable oracle가 아닐 수 있음 | `12d715eba77d` | differential cases와 project-specific fixed expectations 분리 | null format/string/pointer/percent extension 등 실제 fixed cases를 test에서 분류 |
| in-tree test 성공만으로 archive/package boundary를 증명할 수 없음 | `a87bcf560789` | artifact manifests + dependency check + isolated consumer | consumer가 public header와 archive만 사용해 build/run하는지 확인 |
| value-based tests만으로 UB/address fault를 모두 관찰할 수 없음 | `1b474fa2a5e3` | implementation과 fault suite를 sanitizer build로 별도 compile | UBSan과 Linux ASan/UBSan의 실제 coverage와 미포함 leak 범위를 기록 |

- 학습자 기록 — 실제 failure branch와 regression assertion을 연결한 추가 설명:
  - write-loop risks는 scripted return이 production seam을 통과한 뒤 exact call/output statistics로 판정합니다. oracle risk는 matrix/fixed macro 분리로 해결합니다. packaging risk는 source가 아닌 built archive와 isolated directory를 대상으로 합니다. sanitizer는 두 suite에 source를 직접 instrument하지만 실제 실행된 inputs에 한해 진단하며, repository는 별도 leak-sanitizer target이나 exhaustive path proof를 선언하지 않습니다.

## 8. Ownership / state / responsibility 변화

| 시점 | Source상 owner / boundary | Source상 responsibility 변화 | 해당 SHA 코드 근거 |
| --- | --- | --- | --- |
| functional suite | visible output/public return contract | byte sequence, captured count, return value 및 supported libc-comparable semantics | `tests/test_ft_printf.c` pipe fixture, `EXPECT_PRINTF`, `EXPECT_OUTPUT`, grouped runners |
| fault suite | output system-call boundary | scripted `write` result와 call sequence를 소유하여 state transition 관찰 | `tests/test_output_faults.c` global script/statistics와 `ft_printf_test_write`; Makefile seam build |
| fixed project cases | project public semantics | portable libc behavior가 아닌 explicit expectation을 test가 고정 | `run_public_contract_boundary_cases`의 null/pointer/string/percent `EXPECT_OUTPUT` calls |
| release script | distributable archive boundary | members, symbols, unresolved dependencies, public-header-only consumer를 확인 | `tests/check_release.sh` manifests, `nm` normalization, temp copies/compiler/run/cleanup |
| sanitizer build | runtime language/address diagnostics | normal/fault path의 implementation source를 instrumentation 대상으로 포함 | Makefile sanitizer commands가 archive 대신 `$(SRC)`를 각각 compile하고 halt-on-error로 실행 |

## 9. Thread 최종 상태

- Source가 확정한 도달점: verification이 visible formatting에서 failure state machine, project-specific semantics, archive consumer boundary, sanitizer runtime까지 계층별로 확장된 상태입니다.
- 학습자 기록 — 마지막 commit 기준 실제 코드에서 확인한 최종 state:
  - normal suite는 bytes/count/return, fault suite는 scripted syscall transitions와 real SIGPIPE ownership, fixed cases는 repository-defined semantics, release script는 static archive/consumer packaging, sanitizer targets는 normal/fault implementation runtime diagnostics를 각각 담당합니다. 어느 한 layer도 나머지 layer의 증거를 대신하지 않습니다.
- 학습자 기록 — 이 Thread 밖에서만 해결되는 남은 문제를 source 범위 안에서 구분:
  - 실제 모든 target의 CI matrix/실행 이력, unsupported platforms, exhaustive input space, transactional device output, explicit leak proof는 scaffold와 inspected commits가 보장하지 않습니다. 이번 작업 환경에서도 commands를 실행하지 않았으므로 code-defined verification과 runtime evidence를 구분했습니다.

## 10. 최종 architecture 또는 execution flow 정리

실제 SHA 코드를 읽은 뒤 아래 흐름을 완성합니다. source 설명만 복사하지 말고 함수/상태/branch를 연결합니다.

```text
[functional suite: stdout capture]
    -> [snprintf differential 또는 fixed expected bytes]
    -> [fault suite: substituted write sequence / real SIGPIPE]
    -> [release-check: archive manifests -> isolated consumer]
    -> [sanitizer builds: normal/fault sources 직접 instrument 및 실행]
```

- 각 단계에 대응하는 SHA / file / function:
  - `1b8049e411bb` `tests/test_ft_printf.c`; `1223518652bd` `tests/test_output_faults.c`와 normal signal case; `12d715eba77d` public contract runners; `a87bcf560789` `tests/check_release.sh`/consumer; `1b474fa2a5e3` Makefile sanitizer targets입니다.
- 핵심 state transition:
  - verification 대상이 visible result→system-call progress/error→oracle ownership→archive composition/link boundary→instrumented runtime으로 확장됩니다. 각 layer는 별도 fixture와 failure condition을 갖습니다.
- failure가 끊기는 지점:
  - functional/fault tests는 assertion에서 process exit, release script는 manifest/dependency/build/output/cleanup mismatch에서 exit 1, sanitizer targets는 diagnostics와 `halt_on_error=1`에서 command failure가 됩니다.
- 후속 fix/test가 보장한 지점:
  - deterministic seam이 retry invariants를, fixed cases가 project semantics를, release script가 배포 단위를, sanitizer source builds가 실행 경로의 UB/address diagnostics를 보호합니다. 실제 pass 여부는 command 실행이 있어야만 별도 runtime evidence가 됩니다.

## 11. 학습 완료 자가 점검

- [x] Commit map의 모든 SHA를 정확한 시점의 코드로 확인했습니다.
- [x] 각 commit의 subject, importance, tags를 source와 그대로 유지했습니다.
- [x] final HEAD의 코드를 과거 commit 설명에 소급 사용하지 않았습니다.
- [x] 필요한 parent/직전 관련 SHA 비교를 실제 diff로 수행했습니다.
- [x] source가 확정한 사실과 내가 코드에서 확인한 사실을 구분했습니다.
- [x] fix의 기존 가정 → failure/risk → root cause → decision → code → test 연결을 필요한 곳에서 완성했습니다.
- [x] test commit의 target invariant, technique, production path, proves/not-proves를 구분했습니다.
- [x] Invariant ledger에 실제 코드 근거를 채웠습니다.
- [x] 이 Thread의 최종 architecture/execution flow를 commit history 순서로 설명할 수 있습니다.
