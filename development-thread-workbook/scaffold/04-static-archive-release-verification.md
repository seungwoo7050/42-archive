# Thread: Treating the static archive as a verified release artifact

## Thread 목표

**Source significance**

> The project stops treating a successful local compile as sufficient evidence. Compiler builtins are excluded, the archive and consumer boundary are inspected directly, independent defect detectors cover different failure classes, and the same evidence is reproduced across compiler families before being orchestrated into one release check.

### 이 Thread에 직접 연결된 source invariants

> The archive contains the intended translation units and public symbols only, links from outside the repository, and depends only on the explicitly allowed runtime functions.

> Tests of reimplemented libc-style functions must not be invalidated by compiler builtin substitution.

### 이 Thread에 직접 연결된 engineering difficulty

> Inspecting archive symbols portably enough for both Darwin and Linux and validating the same source under Clang and GNU GCC.

## 이 Thread를 이해하기 위한 핵심 질문

- compiler builtin substitution이 libc reimplementation test의 신뢰성을 어떻게 훼손할 수 있으며 build flags는 이를 어디서 차단하는가?
- `libft.a`의 member, exported symbol, undefined external dependency는 어떤 manifest/inspection 단계로 검증되는가?
- out-of-tree consumer는 in-tree path/include 의존성을 어떻게 드러내는가?
- UBSan, ASan, host leak checking은 서로 어떤 evidence scope를 가지는가?
- Clang/GCC clean copied tree 실행은 어떤 compiler-specific assumption을 잡기 위한 것인가?
- 최종 release target은 기존 검증을 어떤 순서와 경계로 orchestration하는가?

## 완료 기준

- build flags에서 strict C99 warning과 builtin policy를 실제로 확인했습니다.
- archive member/public symbol/allowed dependency/out-of-tree consumer 검증 경로를 `79c0dcefb590`에서 직접 추적했습니다.
- UBSan, ASan, host leak 검사 각각의 build/run target과 증명 범위를 구분했습니다.
- Clang/GCC 검증이 clean copied tree에서 full suite를 실행하는지 확인했습니다.
- 최종 orchestration target이 기존 evidence를 재사용하는 순서와 failure propagation을 확인했습니다.

## Commit map

| 순서 | Commit | Subject | Importance | Tags | Source role |
| --- | --- | --- | --- | --- | --- |
| 1 | `4df8b23505b8` | `build(flags): C99 경고와 builtin 정책을 고정` | A | RELEASE, VERIFY, RISK | Locks C99 warnings and disables compiler builtin substitution. |
| 2 | `79c0dcefb590` | `test(release): archive와 consumer 경계를 검증` | A | RELEASE, ARCH, VERIFY | Verifies archive members, public definitions, allowed external dependencies, and an out-of-tree consumer. |
| 3 | `f5de4306ebcd` | `test(sanitize): undefined behavior 검사를 추가` | B | VERIFY, TEST | Adds undefined-behavior sanitizer execution. |
| 4 | `c625970fd211` | `test(sanitize): address sanitizer 검사를 추가` | B | VERIFY, TEST | Adds address-sanitizer execution. |
| 5 | `9f555c37a6d8` | `test(leak): host 누수 검사 경로를 추가` | B | VERIFY, TEST | Adds host leak checking. |
| 6 | `e31a2e748685` | `test(build): Clang과 GCC 호환성을 검증` | A | RELEASE, VERIFY | Runs the complete release-oriented suite under both Clang and GNU GCC in clean copied trees. |
| 7 | `b90fd748255a` | `test(release): 전체 검증 절차를 연결` | B | RELEASE, VERIFY | Connects clean build, functional, failure, sanitizer, archive, compiler, leak, and no-op rebuild checks. |

## Commit별 학습 기록

### `4df8b23505b8` — `build(flags): C99 경고와 builtin 정책을 고정`

**Source 확정 역할:** strict C99 warnings와 compiler builtin 비활성화를 고정해 low-level reimplementation 검증의 compiler boundary를 강화합니다.

#### 해당 SHA에서 확인할 코드 / build 설정

- Makefile 또는 실제 build configuration에서 language standard와 warning flags가 어디에 정의되는지 찾습니다.
- compiler builtins를 비활성화하는 flag가 production build와 test build 중 어디에 적용되는지 확인합니다.
- source가 언급한 bonus target exposure가 어떤 target dependency로 표현되는지 확인합니다.
- 이전 SHA와 비교해 flag 변경이 compile command에 실제 반영되는 지점을 확인합니다.
- test 대상 함수가 compiler builtin으로 대체될 가능성을 막는 설정이 전체 relevant object에 적용되는지 확인합니다.

#### 학습 기록

- 직전 build policy:
- 추가/고정된 flags:
- builtin substitution 위험:
- 실제 compile command 근거:
- 이 commit이 보장하는 verification boundary:
- 아직 archive 자체에 대해 보장하지 않는 것:

### `79c0dcefb590` — `test(release): archive와 consumer 경계를 검증`

**Source 확정 역할:** archive members, normalized public symbol sets, allowed external dependencies, out-of-tree consumer를 검증해 `libft.a`를 binary/release boundary로 취급합니다.

#### 해당 SHA에서 확인할 실제 핵심 코드

- archive member manifest와 실제 archive member 목록을 비교하는 경로를 찾습니다.
- public API/global symbol manifest와 symbol inspection 결과를 normalize/compare하는 경로를 찾습니다.
- allowed undefined external symbol set이 어디에 정의되고 platform-aware하게 적용되는지 확인합니다.
- Darwin/Linux 차이를 처리하는 symbol-inspection script의 분기와 normalization을 확인합니다.
- source tree 밖 temporary directory에서 consumer를 compile/link/run하는 절차를 찾습니다.
- consumer가 문서화된 header와 archive만으로 build되는지 include/library path를 실제 command로 확인합니다.
- Make target이 위 검증들을 어떤 순서로 실행하고 어느 failure에서 중단되는지 확인합니다.

#### Release boundary 기록

- archive member contract:
- exported API contract:
- allowed external dependency contract:
- out-of-tree linkage contract:
- platform-specific normalization:
- 검증 실패가 의미하는 artifact defect:

#### Test commit 학습

- production/release invariant 대상:
- failure 또는 boundary:
  - missing/extra archive member:
  - missing/extra global symbol:
  - unexpected undefined dependency:
  - hidden in-tree include/path dependency:
- test technique:
  - manifests:
  - symbol inspection:
  - external smoke consumer:
- 이 검증이 증명하는 것:
- 이 검증이 증명하지 않는 것:
- 테스트 성격:
  - [ ] broad integration
  - [ ] deterministic regression
  - [ ] release artifact contract test
  - 선택 근거:
- 후속 변경에서 막아야 할 회귀:

### `f5de4306ebcd` — `test(sanitize): undefined behavior 검사를 추가`

**Source 확정 역할:** UBSan-specific objects와 execution target을 추가합니다.

#### Test commit 학습

- sanitizer용 object/build flags가 ordinary build와 어떻게 분리되는지 찾습니다.
- 어떤 test suite 또는 executable이 UBSan build에서 실행되는지 확인합니다.
- undefined-behavior sanitizer가 실패를 report했을 때 target이 어떻게 실패하는지 확인합니다.
- production path 중 실제로 통과하는 범위를 기록합니다.
- 이 테스트가 증명하는 것:
- 이 테스트가 증명하지 않는 것:
- 테스트 성격과 후속 회귀 방지 범위:

### `c625970fd211` — `test(sanitize): address sanitizer 검사를 추가`

**Source 확정 역할:** ASan-specific builds와 runtime checks를 추가하며, source는 이것이 leak testing을 대체하지 않는다고 명시합니다.

#### Test commit 학습

- ASan용 compile/link flags와 object separation을 찾습니다.
- 어떤 functional/failure paths가 ASan instrumented binary에서 실행되는지 확인합니다.
- address error가 target failure로 연결되는 방법을 확인합니다.
- host leak check와 책임 범위를 혼동하지 않도록 실제 설정 차이를 기록합니다.
- 이 테스트가 증명하는 것:
- 이 테스트가 증명하지 않는 것:
- 테스트 성격과 후속 회귀 방지 범위:

### `9f555c37a6d8` — `test(leak): host 누수 검사 경로를 추가`

**Source 확정 역할:** host에서 `leaks` 또는 Valgrind를 사용하는 leak-checking path를 추가합니다.

#### Test commit 학습

- platform/host에 따라 어떤 leak checker가 선택되는지 실제 target/script에서 확인합니다.
- 검사 대상 executable과 실행 범위를 기록합니다.
- leak checker의 exit/status가 build target 결과에 어떻게 반영되는지 확인합니다.
- ASan path와 별도로 유지되는 이유를 실제 target 구성과 source 역할을 기준으로 정리합니다.
- 이 테스트가 증명하는 것:
- 이 테스트가 증명하지 않는 것:
- 테스트 성격과 후속 회귀 방지 범위:

### `e31a2e748685` — `test(build): Clang과 GCC 호환성을 검증`

**Source 확정 역할:** clean copied trees에서 complete release-oriented suite를 Clang과 GNU GCC 각각으로 실행합니다.

#### 해당 SHA에서 확인할 build/test flow

- source tree를 clean copy하는 경로와 복사 대상/제외 대상을 확인합니다.
- compiler 선택이 environment 또는 Make variable을 통해 어떻게 주입되는지 확인합니다.
- Clang run과 GCC run이 서로 독립된 clean tree를 사용하는지 확인합니다.
- 각 compiler에서 호출되는 "complete suite"가 실제로 어떤 target들을 포함하는지 추적합니다.
- builtin/extension/compiler-specific assumption이 한 compiler에서만 통과할 수 있는 지점을 떠올리되, 실제 defect 여부는 test result로만 기록합니다.
- failure가 상위 target에 어떻게 propagation되는지 확인합니다.

#### 학습 기록

- clean-copy 목적:
- compiler selection 경로:
- Clang suite:
- GCC suite:
- 공통 검증 범위:
- compiler-specific failure가 드러나는 지점:
- 이 commit이 release confidence에 추가하는 것:

### `b90fd748255a` — `test(release): 전체 검증 절차를 연결`

**Source 확정 역할:** clean build, functional, failure, sanitizer, archive, compiler, leak, no-op rebuild 검증을 하나의 release procedure로 orchestration합니다.

#### Test / orchestration commit 학습

- top-level release verification target을 찾습니다.
- source가 열거한 각 하위 검증 target이 어떤 순서로 연결되는지 실제 dependency/recipe를 기록합니다.
- clean build가 어느 시점에 수행되는지 확인합니다.
- functional/failure/sanitizer/archive/compiler/leak/no-op rebuild 각 단계가 기존 target을 재사용하는지 확인합니다.
- 한 단계 실패 시 뒤 단계가 실행되는지 중단되는지 실제 Make/shell semantics로 확인합니다.
- no-op rebuild check가 무엇을 관찰하는지 해당 SHA에서 직접 확인합니다.
- orchestration 자체가 새 runtime invariant를 만드는지, 기존 evidence를 묶는지 source role과 실제 코드를 구분합니다.

#### 검증 범위 기록

| 단계 | 하위 target/command | 증명 범위 | 증명하지 않는 범위 | 실패 propagation |
| --- | --- | --- | --- | --- |
| clean build | | | | |
| functional | | | | |
| failure | | | | |
| sanitizer | | | | |
| archive | | | | |
| compiler | | | | |
| leak | | | | |
| no-op rebuild | | | | |

## Invariant ledger

| 단계 | Commit | Source에 연결된 invariant / evidence | 실제 build/test 근거 |
| --- | --- | --- | --- |
| compiler honesty | `4df8b23505b8` | libc-style tests를 builtin substitution으로 무효화하지 않음 | |
| artifact contract | `79c0dcefb590` | intended members/symbols/dependencies/out-of-tree linkage | |
| UB detector | `f5de4306ebcd` | UBSan evidence 추가 | |
| address detector | `c625970fd211` | ASan evidence 추가 | |
| leak detector | `9f555c37a6d8` | host leak evidence 추가 | |
| compiler matrix | `e31a2e748685` | Clang/GCC clean-tree compatibility evidence | |
| orchestration | `b90fd748255a` | established checks를 하나의 release procedure로 연결 | |

## Failure → Fix → Test 연결

이 thread는 하나의 runtime fix chain보다 release evidence를 점층적으로 강화하는 구조입니다.

- 초기 위험: local compile 성공만으로 artifact boundary를 확정할 수 없음
- compiler substitution 위험 대응: `4df8b23505b8`
- archive/consumer contract 검증: `79c0dcefb590`
- 독립 defect detector 추가: `f5de4306ebcd`, `c625970fd211`, `9f555c37a6d8`
- compiler-family 재현: `e31a2e748685`
- 전체 procedure 연결: `b90fd748255a`
- 실제 각 단계에서 재현 가능한 failure:
- 각 failure가 막는 회귀:

## Verification responsibility 변화

- compiler flags가 책임지는 것:
- archive inspection이 책임지는 것:
- external consumer가 책임지는 것:
- UBSan이 책임지는 것:
- ASan이 책임지는 것:
- host leak checker가 책임지는 것:
- compiler matrix가 책임지는 것:
- orchestration target이 책임지는 것:

## Thread 최종 상태

- 마지막 commit 시점에 이 thread가 보장하는 것:
  - 기록:
- 이 thread만으로는 보장하지 않는 것:
  - 기록:
- source의 significance와 실제 코드 확인 결과가 연결되는 지점:
  - 기록:

## 최종 architecture 또는 execution flow 정리

해당 thread의 commit history를 근거로 최종 흐름을 직접 작성합니다.

- 시작 조건 / 입력:
- 핵심 분기 또는 책임 경계:
- 상태 또는 ownership 변화:
- failure 처리:
- verification 경로:
- 최종 설명:

## 학습 완료 자가 점검

- [ ] 모든 commit을 문서 순서대로 해당 SHA에서 확인했습니다.
- [ ] 중요도와 tags를 source 그대로 유지했습니다.
- [ ] 실제 코드 근거와 source 확정 설명을 구분했습니다.
- [ ] 변경 전/후 비교가 필요한 commit은 이전 관련 SHA와 비교했습니다.
- [ ] failure → fix → test 연결을 실제 코드와 test code로 확인했습니다.
- [ ] final HEAD를 과거 commit 설명에 소급하지 않았습니다.
- [ ] 이 thread의 최종 invariant와 execution flow를 코드 근거로 설명할 수 있습니다.
