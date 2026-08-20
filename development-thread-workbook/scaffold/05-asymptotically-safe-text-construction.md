# Making text construction asymptotically safe and observable

> 한국어 주제: **점근적으로 안전하고 관찰 가능한 text construction**
>
> Project: `small-shell`  
> Branch: `c/minishell`  
> Development Thread order: 5/5

## 1. Thread 목표

문자 또는 치환마다 전체 문자열을 다시 복사하던 경로를 overflow-safe growable builder로 바꾸고, lexer와 expansion semantics를 유지하면서 end-to-end time bound와 sanitizer로 검증한 흐름을 복원합니다.

**Source-defined significance**

> The shared abstraction removes repeated whole-string copies while keeping overflow and partial-ownership rules explicit. Only the builder introduction is A because it makes the structural decision; the migrations are applications of that choice. The performance and sanitizer paths provide observable evidence without inflating those supporting commits to architecture-level importance.

**학습 관점**

공통 builder는 성능만 개선한 것이 아니라 permanent NUL, overflow check, discard/take ownership protocol을 여러 text-processing stage에 통일합니다. Migration commit은 그 결정을 적용하고, performance와 sanitizer path는 결과를 관찰합니다.

### SHA 고정 원칙

- 각 commit은 반드시 표시된 exact SHA 또는 그 parent와 비교합니다.
- 먼저 `git show --name-status <SHA>`로 변경 파일을 식별한 뒤, 필요한 path만 `git diff <SHA>^ <SHA> -- <path>`로 봅니다.
- 실제 구현은 `git show <SHA>:<path>` 또는 detached worktree에서 확인합니다.
- final HEAD의 type, function, test를 과거 commit 설명에 소급하지 않습니다.
- later commit의 field나 fix가 아직 존재하지 않는 SHA에서는 그 부재 자체를 기록합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- builder의 data, length, capacity invariant와 permanent NUL terminator는 어느 함수에서 유지됩니까?
- `length + extra + 1`과 capacity doubling의 overflow를 각각 어떻게 검사합니까?
- `discard`와 `take`를 분리하면 failure와 success의 ownership이 어떻게 명확해집니까?
- lexer에서 single-quote marker와 character 두 byte를 append할 때 기존 representation이 보존됩니까?
- expansion에서 `$?`, `$NAME`, unset value, literal marker, empty result semantics가 migration 전후 동일합니까?
- 512 KiB end-to-end test가 실제로 증명하는 것과 수학적으로 증명하지 않는 것은 무엇입니까?
- sanitizer build graph를 ordinary build와 분리하는 이유는 무엇입니까?

## 3. 완료 기준

- [ ] builder의 growth equation과 overflow branches를 실제 코드로 설명했습니다.
- [ ] success `take`와 failure `discard` 뒤 builder state를 기록했습니다.
- [ ] lexer와 expansion migration의 before/after loop를 비교해 repeated whole-string copy 제거를 확인했습니다.
- [ ] semantic equivalence를 marker, quote flag, variable/status expansion 항목별로 검증했습니다.
- [ ] performance test의 input size, deadline, status, stderr, output-length assertion을 기록했습니다.
- [ ] ASan/UBSan artifact와 test seam이 모두 instrument되는 build graph를 확인했습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source-defined role |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `b8347c06b6c7` | `refactor(buffer): 가변 문자열 빌더 모듈 추가` | A | `ARCH`, `PERF`, `REFACTOR` | Defines the shared builder's growth, overflow, discard, and ownership-transfer contracts. |
| 2 | `985f90b9cbc7` | `refactor(lexer): 단어 조립을 가변 버퍼로 전환` | B | `LEX_PARSE`, `PERF`, `REFACTOR` | Applies it to quote-aware lexer word construction. |
| 3 | `89e1a06f06c9` | `refactor(expand): 확장 결과를 가변 버퍼로 조립` | B | `EXPANSION`, `PERF`, `REFACTOR` | Applies it to expansion and dequoting. |
| 4 | `b36b9d324260` | `test(performance): 긴 입력 처리 시간 상한 검증` | B | `TEST`, `PERF` | Verifies a large word end to end under an explicit time bound. |
| 5 | `7d7dd7ad9d8a` | `build(test): ASan·UBSan 검증 경로 추가` | B | `TEST`, `PRACTICAL` | Runs the complete behavior, failure, lifecycle, and performance suites under sanitizers. |

## 5. Commit별 학습 기록

### 5.1 `b8347c06b6c7` — `refactor(buffer): 가변 문자열 빌더 모듈 추가`

#### 확정 정보
- SHA: `b8347c06b6c7`
- Subject: `refactor(buffer): 가변 문자열 빌더 모듈 추가`
- Importance: **A**
- Tags: `ARCH`, `PERF`, `REFACTOR`
- Source-defined role: Defines the shared builder's growth, overflow, discard, and ownership-transfer contracts.
- 학습 깊이: 주요 subsystem boundary, integration point 또는 failure path. 핵심 코드와 설계 판단을 확인합니다.

#### Source에서 확정된 변화
initialization, append, discard, take를 가진 reusable string builder를 도입합니다. 항상 NUL을 유지하고 geometric growth와 overflow check를 수행하며 success/failure ownership을 분리합니다.

#### Refactor 판단 기록
- 기존 abstraction 또는 cost/failure 관찰 한계:
- 새 boundary가 제공하는 contract:
- production semantics가 유지된다는 코드 근거:
- ownership 또는 call-site responsibility 변화:
- 후속 fix/test가 이 seam을 사용하는 방식:

#### `b8347c06b6c7`에서 확인할 실제 코드
- builder structure의 data, length, capacity fields와 empty initialized state를 확인합니다.
- init 직후와 append 후 `data[length] == '\0'`를 유지하는 assignments를 기록합니다.
- required size `length + extra + 1`의 overflow check를 확인합니다.
- capacity doubling이 `SIZE_MAX`를 넘을 때 exact required capacity로 fallback하는 branch를 기록합니다.
- runtime allocation wrapper를 통한 initial allocation/reallocation failure path를 추적합니다.
- `discard`가 partial allocation을 free하고 state를 reset하는지 확인합니다.
- `take`가 allocation을 caller에 이전하고 builder를 empty/reset state로 만드는지 확인합니다.
- old repeated join pattern과 비교하여 builder가 whole prefix를 매 append마다 복사하지 않는 이유를 code로 설명합니다.

#### 학습자가 남길 코드 증거
- builder state invariant:
- growth/overflow equation:
- discard 전/후 state:
- take 전/후 owner:
- allocation failure path:
- old/new copy pattern 비교:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: text construction이 overflow-safe geometric buffer와 explicit discard/take ownership protocol을 공유할 수 있습니다.
- 아직 보장하지 않는 것: 이 commit은 abstraction만 도입하며 lexer/expansion behavior와 end-to-end performance는 아직 바꾸지 않습니다.

#### Thread 내 다음 연결
`985f90b9cbc7`와 `89e1a06f06c9`가 각각 lexer와 expansion을 migration합니다.

### 5.2 `985f90b9cbc7` — `refactor(lexer): 단어 조립을 가변 버퍼로 전환`

#### 확정 정보
- SHA: `985f90b9cbc7`
- Subject: `refactor(lexer): 단어 조립을 가변 버퍼로 전환`
- Importance: **B**
- Tags: `LEX_PARSE`, `PERF`, `REFACTOR`
- Source-defined role: Applies it to quote-aware lexer word construction.
- 학습 깊이: Thread 흐름에서 맡는 구현 역할과 필요한 state/ownership 변화를 확인합니다.

#### Source에서 확정된 변화
lexer word construction을 shared builder로 전환하며 single-quoted character의 literal marker+byte encoding, unquoted/double-quoted semantics, token-level quoted flag를 유지합니다.

#### Refactor 판단 기록
- 기존 abstraction 또는 cost/failure 관찰 한계:
- 새 boundary가 제공하는 contract:
- production semantics가 유지된다는 코드 근거:
- ownership 또는 call-site responsibility 변화:
- 후속 fix/test가 이 seam을 사용하는 방식:

#### `985f90b9cbc7`에서 확인할 실제 코드
- parent SHA에서 source character마다 complete token text를 재할당/복사하던 old helper 또는 loop를 기록합니다.
- word scan 시작에서 builder init, 각 fragment에서 append, token publish에서 take하는 순서를 확인합니다.
- single-quoted byte를 marker와 character 두 번 또는 two-byte append로 넣는 code를 확인합니다.
- unquoted와 double-quoted byte의 기존 encoding branch가 semantic하게 동일한지 비교합니다.
- token-level quoted flag가 quote syntax 참여 시 이전과 동일하게 set되는지 확인합니다.
- allocation failure와 unclosed quote에서 builder discard가 실행되고 token에 partial text가 publish되지 않는지 확인합니다.
- success에서 token이 taken buffer의 sole owner가 되는 지점을 기록합니다.

#### 학습자가 남길 코드 증거
- old construction loop:
- new builder call sequence:
- marker encoding equivalence:
- quoted flag equivalence:
- failure discard와 success take:
- token ownership after publish:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: lexer의 quote-aware representation을 유지하면서 long word construction을 geometric buffer에 옮깁니다.
- 아직 보장하지 않는 것: expansion/dequote의 repeated copying은 아직 남고, 성능 개선의 end-to-end evidence도 후속 test가 제공합니다.

#### Thread 내 다음 연결
`89e1a06f06c9`가 expansion과 dequote를 같은 builder contract로 옮깁니다.

### 5.3 `89e1a06f06c9` — `refactor(expand): 확장 결과를 가변 버퍼로 조립`

#### 확정 정보
- SHA: `89e1a06f06c9`
- Subject: `refactor(expand): 확장 결과를 가변 버퍼로 조립`
- Importance: **B**
- Tags: `EXPANSION`, `PERF`, `REFACTOR`
- Source-defined role: Applies it to expansion and dequoting.
- 학습 깊이: Thread 흐름에서 맡는 구현 역할과 필요한 state/ownership 변화를 확인합니다.

#### Source에서 확정된 변화
expanded/dequoted output을 `sh_strjoin_free` 반복 대신 builder append로 조립하여 amortized linear construction으로 바꾸고, literal marker, `$?`, `$NAME`, unset value, empty result semantics를 유지합니다.

#### Refactor 판단 기록
- 기존 abstraction 또는 cost/failure 관찰 한계:
- 새 boundary가 제공하는 contract:
- production semantics가 유지된다는 코드 근거:
- ownership 또는 call-site responsibility 변화:
- 후속 fix/test가 이 seam을 사용하는 방식:

#### `89e1a06f06c9`에서 확인할 실제 코드
- parent SHA의 per-character/per-substitution `sh_strjoin_free` loop를 기록합니다.
- expansion/dequote entry에서 builder init과 final take 지점을 확인합니다.
- literal marker branch, ordinary byte branch, `$?` branch, environment-name scan branch를 old/new code로 매핑합니다.
- unset variable가 empty append로 처리되고 empty final result도 valid owned string이 되는지 확인합니다.
- environment name substring allocation 또는 append failure에서 partial builder를 discard하는 path를 추적합니다.
- old encoded source string과 new expanded string의 replacement/free ordering이 atomic한지 caller까지 확인합니다.
- dequote path도 same builder를 사용하면서 marker removal semantics가 유지되는지 기록합니다.

#### 학습자가 남길 코드 증거
- old quadratic copy source:
- new builder branch mapping:
- `$?`/`$NAME`/unset/empty semantics:
- substring allocation failure cleanup:
- take 후 ownership replacement:
- semantic equivalence evidence:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: expansion과 dequoting이 complete-or-no-result ownership을 유지하면서 repeated whole-string copies를 제거합니다.
- 아직 보장하지 않는 것: amortized behavior의 observable upper bound는 다음 end-to-end test가 제공하며 이 commit 자체가 시간 제한을 증명하지 않습니다.

#### Thread 내 다음 연결
`b36b9d324260`가 512 KiB word를 complete product path로 통과시켜 performance regression을 고정합니다.

### 5.4 `b36b9d324260` — `test(performance): 긴 입력 처리 시간 상한 검증`

#### 확정 정보
- SHA: `b36b9d324260`
- Subject: `test(performance): 긴 입력 처리 시간 상한 검증`
- Importance: **B**
- Tags: `TEST`, `PERF`
- Source-defined role: Verifies a large word end to end under an explicit time bound.
- 학습 깊이: Thread 흐름에서 맡는 구현 역할과 필요한 state/ownership 변화를 확인합니다.

#### Source에서 확정된 변화
512 KiB word를 input, tokenization, parsing, expansion, builtin output까지 통과시키고 five-second deadline, status 0, no diagnostics, exact payload length를 요구합니다.

#### Test commit 학습 기록
- 대상 production invariant:
- 재현하는 failure 또는 boundary:
- 사용한 test technique:
- 실제 통과하는 production code path:
- 이 테스트가 증명하는 것:
- 이 테스트가 증명하지 않는 것:
- broad integration / deterministic regression / stress·probe 중 분류:
- 후속 변경에서 막는 회귀:

#### `b36b9d324260`에서 확인할 실제 코드
- test가 512 KiB input word를 생성하는 방식과 trailing newline 포함 여부를 확인합니다.
- test binary가 complete shell product path를 실행하는지 확인하고 bypassed subsystem이 없는지 기록합니다.
- five-second deadline이 timeout harness의 어떤 interface를 사용하는지 확인합니다.
- process status 0, stderr empty, stdout exact length including final newline assertion을 각각 확인합니다.
- large output comparison이 truncation도 검출하는지 기록합니다.
- 이 test가 asymptotic complexity를 수학적으로 증명하지 않고 특정 environment의 end-to-end upper bound를 제공한다는 한계를 작성합니다.

#### 학습자가 남길 코드 증거
- 대상 performance contract:
- input size와 generated bytes:
- 통과하는 production stages:
- deadline/status/stderr/output assertions:
- regression으로 잡는 old failure mode:
- 증명하지 않는 것:
- broad integration 또는 performance regression 판정:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: 긴 입력에서 repeated whole-string copying이나 truncation이 재도입되면 observable test failure로 드러납니다.
- 아직 보장하지 않는 것: 다른 hardware/compiler의 절대 성능이나 이론적 Big-O를 직접 증명하지 않습니다.

#### Thread 내 다음 연결
`7d7dd7ad9d8a`가 동일 behavior/failure/lifecycle/performance suites를 sanitizer artifacts로 실행합니다.

### 5.5 `7d7dd7ad9d8a` — `build(test): ASan·UBSan 검증 경로 추가`

#### 확정 정보
- SHA: `7d7dd7ad9d8a`
- Subject: `build(test): ASan·UBSan 검증 경로 추가`
- Importance: **B**
- Tags: `TEST`, `PRACTICAL`
- Source-defined role: Runs the complete behavior, failure, lifecycle, and performance suites under sanitizers.
- 학습 깊이: Thread 흐름에서 맡는 구현 역할과 필요한 state/ownership 변화를 확인합니다.

#### Source에서 확정된 변화
production binary, fault-injection binary, source-level parser test에 별도 ASan/UBSan build graph를 만들고 existing smoke, failure, allocation, lifecycle, parser, performance suites를 instrumented artifacts로 실행합니다.

#### Build / validation boundary 기록
- 생성되는 artifact와 source set:
- ordinary build와 분리되는 이유:
- 실행되는 validation path:
- build change가 runtime semantics를 바꾸지 않는 근거:

#### `7d7dd7ad9d8a`에서 확인할 실제 코드
- Makefile에서 ordinary objects와 sanitizer objects/binaries가 분리된 target/dependency graph를 확인합니다.
- ASan과 UBSan compiler/linker flags가 production path와 test seam 모두에 적용되는지 기록합니다.
- source-level parser API test가 `main.c` 제외 production sources와 sanitizer instrumentation으로 build되는지 확인합니다.
- `env -i`를 사용하는 test에서도 sanitizer options가 보존되는 environment setup을 확인합니다.
- container target의 GCC 13, network disable, repository read-only mount, tmpfs copy/build 순서를 기록합니다.
- 모든 listed suites가 sanitizer targets에서 실제로 호출되는지 target recipe를 추적합니다.
- ordinary object를 sanitizer binary에 재사용하지 않는 이유를 build artifact compatibility와 연결합니다.

#### 학습자가 남길 코드 증거
- sanitizer build graph:
- instrumented artifact별 source set:
- 실행되는 suite 목록:
- `env -i` option preservation:
- container reproducibility boundary:
- sanitizer가 증명하는 것과 증명하지 않는 것:
- 확인한 변경 파일:
- 핵심 caller → callee:
- parent SHA와 비교한 최소 before/after snippet:
- 해당 SHA에서 실행한 test 또는 수동 재현 결과:

#### 보장 범위
- 이 commit이 보장하는 것: behavior와 fault seams가 sanitizer instrumentation 아래 동일하게 검증되고 incompatible object reuse를 피합니다.
- 아직 보장하지 않는 것: sanitizer가 모든 memory/lifetime bug를 증명하지 않으며 configured compiler/runtime와 exercised paths에 한정됩니다.

#### Thread 내 다음 연결
Text-construction Thread의 마지막 validation layer입니다.

## 6. Invariant ledger

Source가 명시한 invariant와 engineering difficulty만 사용합니다. 실제 코드 근거와 변화 시점은 학습자가 채웁니다.

| Invariant | Source에서 확정된 의미 | 처음 도입/표현 | 강화·복구·검증 | 학습자가 확인한 코드 근거 |
| --- | --- | --- | --- | --- |
| Builder output is always NUL-terminated. | 초기화와 모든 append 뒤 `data[length]`가 NUL이어야 합니다. | `b8347c06b6c7` | `985f90b9cbc7`, `89e1a06f06c9`에서 실제 사용 | init, reserve/grow, append, take의 code line을 기록합니다.<br>기록: |
| Growth arithmetic cannot wrap. | `length + extra + 1`과 geometric doubling 모두 `SIZE_MAX`를 넘기지 않아야 합니다. | `b8347c06b6c7` | runtime allocation failure injection과 sanitizer path | required capacity 계산과 exact-capacity fallback branch를 기록합니다.<br>기록: |
| Partial output does not escape on failure. | 실패 시 builder를 discard하고, 성공 시에만 allocation을 take하여 caller에 이전합니다. | `b8347c06b6c7` | `985f90b9cbc7`, `89e1a06f06c9` | 각 caller의 error label과 ownership transfer를 기록합니다.<br>기록: |
| Performance change preserves lexical and expansion semantics. | literal marker, quote flag, `$?`, environment name, unset value, empty result 동작은 유지되어야 합니다. | `985f90b9cbc7`, `89e1a06f06c9` | `b36b9d324260`, `7d7dd7ad9d8a` | before/after semantic branch mapping과 test result를 기록합니다.<br>기록: |

### Ledger 작성 시 확인할 것

- field 또는 resource가 처음 생기는 commit과 invariant가 실제로 완성되는 commit을 구분합니다.
- fix가 이전 feature를 삭제한 것인지, representation에 빠진 정보를 보강한 것인지 구분합니다.
- test evidence는 production invariant와 실제 production path에 연결합니다.
- 정상 경로와 failure 경로가 같은 terminal ownership state로 수렴하는지 기록합니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 문제 | Feature / 기존 상태 | Fix 또는 결정 | Regression / 확인 방법 | 학습자 코드 근거 |
| --- | --- | --- | --- | --- |
| character/substitution마다 whole output을 재할당·복사하여 긴 입력에서 비용이 누적됨 | 기존 `sh_strjoin_free` 중심 construction | `b8347c06b6c7` builder 도입 → `985f90b9cbc7`, `89e1a06f06c9` migration | `b36b9d324260` 512 KiB end-to-end deadline | |
| 성능 refactor가 marker encoding이나 ownership cleanup을 깨뜨릴 위험 | lexer/expansion의 기존 semantics | migration commit에서 동일 branch semantics와 discard/take protocol 유지 | `7d7dd7ad9d8a`의 complete suites under ASan/UBSan | |

## 8. Ownership / state / responsibility 변화

| 대상 | Owner / 책임 주체 | 책임 종료 시점 | 해당 SHA에서 확인할 내용 | 학습자 기록 |
| --- | --- | --- | --- | --- |
| builder allocation | builder object | discard 또는 take | init 이후 pointer/length/capacity state 기록 | |
| partial text | builder | failure 시 discard | caller에 노출되지 않는지 확인 | |
| completed text | caller after take | token 또는 expanded field cleanup | take 뒤 builder reset state 확인 | |
| old lexer/expansion string | caller field/local | new result publish 뒤 free | migration의 replacement ordering 기록 | |
| sanitizer artifacts | build graph | target별 clean/rebuild | ordinary object 재사용 금지 여부 확인 | |

## 9. Thread 최종 상태

아래 항목은 final HEAD를 보고 채우지 않습니다. 이 Thread의 마지막 SHA까지 누적된 code와 각 commit diff만 사용합니다.

- builder API와 ownership transition을 함수별로 정리합니다.
- lexer와 expansion의 old complexity source와 new growth behavior를 코드 근거로 비교합니다.
- semantic equivalence와 performance evidence를 별도 항목으로 작성합니다.
- test가 보장하지 않는 compiler/platform/complexity 범위를 명시합니다.

### 최종 상태 기록

- 최종적으로 유지되는 data/resource ownership:
- 최종적으로 보장되는 execution 또는 recovery rule:
- Thread가 해결한 가장 어려운 failure:
- Thread 밖에 남아 있는 보장 범위:

## 10. 최종 architecture 또는 execution flow 정리

아래 source-confirmed 단계에 실제 function, field, branch, cleanup을 채웁니다.

```text
[builder init: NUL-terminated empty buffer]
  ↓ append request
[overflow-safe required capacity calculation]
  ↓ geometric grow or exact required capacity
[append bytes + restore terminal NUL]
  ↓ success?
    ├─ yes: take → caller owns completed allocation
    └─ no: discard → no partial output escapes
  ↓ lexer/expansion migration
[512 KiB end-to-end deadline + sanitizer suites]
```

### 코드 기반 최종 설명

- 핵심 entry function:
- 주요 caller → callee chain:
- state mutation 순서:
- ownership transfer 순서:
- failure convergence path:
- regression evidence:

## 11. 학습 완료 자가 점검

- [ ] 모든 commit을 exact SHA에서 확인했고 final HEAD를 소급하지 않았습니다.
- [ ] Commit map의 SHA, subject, importance, tags, order를 변경하지 않았습니다.
- [ ] S commit은 problem, prior state, failure possibility, decision, core code, ownership/lifecycle, follow-up을 설명할 수 있습니다.
- [ ] A commit은 subsystem boundary 또는 failure path와 실제 핵심 code를 설명할 수 있습니다.
- [ ] B commit은 Thread 내 구현 역할과 state/ownership 변화를 설명할 수 있습니다.
- [ ] Fix commit은 기존 가정 → failure → root cause → 수정 invariant → code → regression 순으로 연결했습니다.
- [ ] Test commit은 invariant, failure, technique, production path, prove/not prove를 구분했습니다.
- [ ] Invariant ledger의 각 행에 실제 file/function/branch 근거가 있습니다.
- [ ] 정상·실패 경로 모두에서 resource와 partial object의 terminal owner를 설명할 수 있습니다.
- [ ] 이 Thread의 설계 → 구현 → 실패 → 수정 → 검증 흐름을 commit history 순서로 다시 설명할 수 있습니다.
