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

- 직전 build policy: `CFLAGS := -Wall -Wextra -Werror -std=c99 -pedantic`, `CPPFLAGS := -I.`였습니다. strict warning과 C99는 이미 있었지만 command-line override를 막지 않았고 `-fno-builtin`은 없었습니다. `bonus` target도 없었습니다.
- 추가/고정된 flags: `override CFLAGS := -Wall -Wextra -Werror -Wpedantic -std=c99 -fno-builtin`, `override CPPFLAGS := -I.`로 바뀝니다. GNU Make의 `override` 지시어 때문에 command line의 `CFLAGS`/`CPPFLAGS`만으로 이 정책을 제거할 수 없습니다. `bonus: all`도 추가돼 같은 archive build를 노출합니다.
- builtin substitution 위험: libc와 유사한 low-level 구현 또는 그 호출을 compiler가 builtin knowledge로 대체·접어 버리면 실제 project implementation을 통과하지 않은 결과를 test가 관찰할 수 있습니다. 이 commit은 relevant compile에서 builtin substitution을 허용하지 않는 정책을 선언합니다.
- 실제 compile command 근거: ordinary object rule과 test binary link/compile recipe가 모두 `$(CPPFLAGS) $(CFLAGS)`를 사용합니다. 별도 write-failure object rule도 같은 공통 flags에 `$(WRITE_DEFINES)`를 추가하므로 production, ordinary test, special I/O object에 정책이 전달됩니다.
- 이 commit이 보장하는 verification boundary: project가 의도한 C99 dialect, warning-as-error, pedantic diagnostics, no-builtin 설정으로 source와 tests를 compile하도록 Makefile 수준에서 고정합니다. `bonus`도 별도 구현이 아닌 `all`의 alias입니다.
- 아직 archive 자체에 대해 보장하지 않는 것: 생성된 `libft.a`에 어떤 object member가 들어갔는지, public symbol이 정확한지, 허용하지 않은 external symbol이 남는지, 외부 directory에서 header/archive만으로 link되는지는 검사하지 않습니다.

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

- archive member contract: `tests/archive-members.txt`의 17개 object 이름을 정렬한 값과 `ar t "$archive" | awk '/\.o$/' | sort` 결과를 `cmp`합니다. member 누락·추가·이름 변경은 실패입니다.
- exported API contract: `tests/api-symbols.txt`의 43개 `ft_` symbol과 `nm`으로 얻은 global defined identifiers를 정렬해 정확히 비교합니다. expected보다 적거나 많은 global definition 모두 실패합니다.
- allowed external dependency contract: undefined symbol 전체에서 library가 자체 정의하는 expected API symbols를 빼고, `tests/allowed-undefined.txt`의 `free`, `malloc`, `write`와 platform errno accessor만 남아야 합니다. Darwin은 `__error`, Linux는 `__errno_location`을 script가 명시적으로 추가합니다.
- out-of-tree linkage contract: `tests/smoke/consumer.c`를 `mktemp`로 만든 repository 외부 directory에 복사하고 그 directory에서 compile/link/run합니다. command는 project root header를 `-I"$project_root"`로, archive를 absolute path로 넘깁니다.
- platform-specific normalization: Darwin은 `nm -gU -j`와 `nm -u -j`를 사용하고 leading underscore를 `sed`로 제거합니다. Linux는 `nm -g --defined-only -j`와 `nm -u -j` 결과를 그대로 사용합니다. 그 밖의 OS는 `unsupported symbol tool platform`으로 실패합니다.
- 검증 실패가 의미하는 artifact defect: source list와 archive 불일치, API surface drift, forbidden runtime dependency, platform normalization 실패, public header/archive만으로 external consumer를 build하거나 실행하지 못하는 문제 중 하나입니다.

#### Test commit 학습

- production/release invariant 대상: intended translation units와 public globals만 가진 archive, 허용 external dependencies, repository 밖 current directory에서도 header와 archive를 명시해 compile/link/run할 수 있는 consumer boundary입니다.
- failure 또는 boundary:
  - missing/extra archive member: `members.expected`와 `members.actual`의 `cmp`가 nonzero입니다.
  - missing/extra global symbol: normalized identifier set과 API manifest의 `cmp`가 nonzero입니다.
  - unexpected undefined dependency: internal expected symbols을 제거한 뒤 `undefined.external`과 allowed/platform set이 다릅니다.
  - hidden in-tree include/path dependency: temporary consumer directory에서 compile 또는 link가 실패하거나 executable이 nonzero로 종료됩니다. 다만 header는 project root의 explicit `-I`를 사용하므로 system-installed layout까지 증명하지는 않습니다.
- test technique:
  - manifests: archive members, API symbols, allowed undefined symbols를 version-controlled text file로 고정합니다.
  - symbol inspection: `ar`, `nm`, `awk`, `sort`, `cmp`, `comm`을 사용해 archive structure와 normalized symbol sets를 exact 비교합니다.
  - external smoke consumer: `ft_strdup`, `ft_strlen`, `ft_lstnew`를 사용하고 allocation을 해제하는 small consumer를 temporary external cwd에서 strict C99/no-builtin flags로 build·run합니다.
- 이 검증이 증명하는 것: manifest와 일치하는 archive members/global symbols, 허용 set과 일치하는 external dependencies, 선택된 API를 사용한 external compile/link/runtime smoke가 script상 모두 성공해야 target이 성공합니다.
- 이 검증이 증명하지 않는 것: 모든 API의 functional correctness, ABI compatibility를 여러 compiler/version에 걸쳐 장기 보장하는 것, installed include/library layout, Darwin/Linux 외 platform, archive member 내부의 local symbols, consumer의 복잡한 usage는 증명하지 않습니다.
- 테스트 성격:
  - [x] broad integration
  - [x] deterministic regression
  - [x] release artifact contract test
  - 선택 근거: build product, symbol tools, manifests, external compile/link/run을 묶는 release boundary integration이며 exact text/set 비교로 deterministic regression입니다.
- 후속 변경에서 막아야 할 회귀: source를 archive에 누락하거나 stale object를 추가하는 문제, helper를 global로 노출하는 문제, public API 누락, 새 forbidden libc dependency, project cwd에만 의존하는 consumer build를 막습니다.
- 실행 근거: 현재 환경에서는 `make check-archive`를 실행하지 않았습니다. 이 절은 `79c0dcefb590`의 Makefile, manifests, `tests/check_archive.sh`, smoke consumer를 검사한 결과이며 성공 output을 기록하지 않습니다.

### `f5de4306ebcd` — `test(sanitize): undefined behavior 검사를 추가`

**Source 확정 역할:** UBSan-specific objects와 execution target을 추가합니다.

#### Test commit 학습

- sanitizer용 object/build flags가 ordinary build와 어떻게 분리되는지 찾습니다. 모든 production `SRC`를 `build/ubsan` 아래 별도 object로 compile하며 `UBSAN_FLAGS := -fsanitize=undefined -fno-omit-frame-pointer`를 공통 strict flags에 추가합니다. ordinary `build/obj`와 섞지 않습니다.
- 어떤 test suite 또는 executable이 UBSan build에서 실행되는지 확인합니다. ordinary `TEST_SRC := $(wildcard tests/test_*.c)`와 instrumented production objects를 `tests/bin/test_ubsan`으로 link합니다. allocation/write failure-injection binaries는 이 target에 포함되지 않습니다.
- undefined-behavior sanitizer가 실패를 report했을 때 target이 어떻게 실패하는지 확인합니다. `UBSAN_OPTIONS=halt_on_error=1:print_stacktrace=1 ./$(UBSAN_BIN)`으로 첫 report에서 process를 중단하고 nonzero status가 Make target에 전달됩니다.
- production path 중 실제로 통과하는 범위를 기록합니다. ordinary functional suite가 호출하는 memory, string, conversion, list, fd-output paths를 instrumented objects에서 통과합니다. forced allocator/write failures는 통과하지 않습니다.
- 이 테스트가 증명하는 것: 해당 functional inputs에서 UBSan이 감지하는 undefined behavior report 없이 suite가 끝나야 `ubsan` target이 성공합니다.
- 이 테스트가 증명하지 않는 것: 실행되지 않은 branches, memory leak, use-after-free 등 ASan/host leak 범주, 모든 compiler sanitizer behavior, failure-injection paths는 증명하지 않습니다.
- 테스트 성격과 후속 회귀 방지 범위: instrumented dynamic regression입니다. signed overflow, invalid shift, misalignment 등 UBSan이 해당 실행에서 관찰하는 오류의 재도입을 막지만 완전한 정적 증명은 아닙니다.
- 실행 근거: target 정의만 검사했으며 현재 환경에서 `make ubsan` 또는 `make sanitize`를 실행하지 않았습니다.

### `c625970fd211` — `test(sanitize): address sanitizer 검사를 추가`

**Source 확정 역할:** ASan-specific builds와 runtime checks를 추가하며, source는 이것이 leak testing을 대체하지 않는다고 명시합니다.

#### Test commit 학습

- ASan용 compile/link flags와 object separation을 찾습니다. 모든 production `SRC`를 `build/asan` 아래 별도 object로 만들고 `-fsanitize=address -fno-omit-frame-pointer`를 compile/link에 적용해 `tests/bin/test_asan`을 만듭니다.
- 어떤 functional/failure paths가 ASan instrumented binary에서 실행되는지 확인합니다. UBSan과 마찬가지로 ordinary `TEST_SRC`만 link합니다. allocator/write failure test drivers는 ASan binary에 포함되지 않습니다.
- address error가 target failure로 연결되는 방법을 확인합니다. `ASAN_OPTIONS=$(ASAN_OPTIONS) ./$(ASAN_BIN)`을 실행하고 default가 `detect_leaks=0:halt_on_error=1`이므로 address error report에서 nonzero로 멈춥니다.
- host leak check와 책임 범위를 혼동하지 않도록 실제 설정 차이를 기록합니다. ASan의 leak detection을 명시적으로 0으로 두고, leak 검사는 다음 별도 host target에 맡깁니다.
- 이 테스트가 증명하는 것: 선택된 functional execution에서 ASan이 관찰하는 out-of-bounds, use-after-free 등 address errors가 없어야 `asan` target이 성공합니다.
- 이 테스트가 증명하지 않는 것: leak-free 상태, 실행하지 않은 failure branches, callback 내부 모든 behavior, 전체 input space는 증명하지 않습니다.
- 테스트 성격과 후속 회귀 방지 범위: address-sanitized functional regression입니다. ordinary suite가 도달하는 memory access 회귀를 막습니다.
- 관찰된 orchestration 차이: 이 commit 뒤에도 `sanitize: ubsan`만 유지됩니다. `asan`은 독립 target으로 존재하지만 `sanitize`의 prerequisite가 아니며, 뒤의 최종 `check`가 `$(MAKE) sanitize`만 호출하므로 ASan은 자동 포함되지 않습니다. source의 ASan 추가 역할은 보존하되 실제 orchestration 범위를 이와 같이 제한해야 합니다.
- 실행 근거: target 정의만 검사했으며 현재 환경에서 `make asan`을 실행하지 않았습니다.

### `9f555c37a6d8` — `test(leak): host 누수 검사 경로를 추가`

**Source 확정 역할:** host에서 `leaks` 또는 Valgrind를 사용하는 leak-checking path를 추가합니다.

#### Test commit 학습

- platform/host에 따라 어떤 leak checker가 선택되는지 실제 target/script에서 확인합니다. shell이 먼저 `command -v leaks`를 확인해 있으면 `leaks --atExit -- ./$(TEST_BIN)`을 실행합니다. 없으면 `command -v valgrind`를 확인해 full leak check를 실행합니다. 둘 다 없으면 명시적으로 stderr와 exit 1을 반환합니다.
- 검사 대상 executable과 실행 범위를 기록합니다. ordinary `tests/bin/test_libft`만 검사합니다. failure-injection binaries와 sanitizer binaries는 leak target의 직접 대상이 아닙니다.
- leak checker의 exit/status가 build target 결과에 어떻게 반영되는지 확인합니다. Valgrind는 `--errors-for-leak-kinds=all --error-exitcode=1`을 사용하며, `leaks`의 exit status도 recipe status가 됩니다. 선택된 command가 실패하면 Make target이 실패합니다.
- ASan path와 별도로 유지되는 이유를 실제 target 구성과 source 역할을 기준으로 정리합니다. ASan default에서 `detect_leaks=0`이고 address errors와 host leak reporting은 다른 detector/옵션을 사용하므로 별도 `leak` target이 필요합니다.
- 이 테스트가 증명하는 것: host에 지원 checker가 있을 때 ordinary suite 실행 종료 시 checker가 보고하는 leak이 허용되지 않습니다. checker 부재를 성공으로 넘기지 않습니다.
- 이 테스트가 증명하지 않는 것: failure harness에서만 도달하는 allocations, 모든 input, checker별 동일한 탐지 범위, unsupported host에서의 leak-free 상태는 증명하지 않습니다.
- 테스트 성격과 후속 회귀 방지 범위: host-dependent dynamic leak regression입니다. ordinary tests가 도달하는 ownership cleanup 회귀를 막습니다.
- 실행 근거: 현재 host에서 checker 존재 여부와 target 성공을 실행 확인하지 않았습니다.

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

- clean-copy 목적: existing object, dependency file, archive, test binary, repository metadata의 영향을 제거하고 같은 committed Makefile/header/src/tests만으로 compiler별 결과를 다시 만듭니다.
- compiler selection 경로: script는 `CLANG`/`GCC` environment 후보와 일반 command names를 조사하고 `--version` 첫 줄로 실제 Clang과 GNU GCC를 구분합니다. 각 suite는 `make ... CC="$compiler"`로 compiler를 주입합니다.
- Clang suite: `$scratch/clang`에 Makefile, `libft.h`, `src`, `tests`를 복사하고 `fclean` 후 `all test failure-test write-failure-test check-archive`를 실행합니다.
- GCC suite: `$scratch/gcc`라는 별도 directory에서 동일한 copy와 target sequence를 GNU GCC로 실행합니다.
- 공통 검증 범위: clean archive build, ordinary functional tests, allocator failure tests, scripted write tests, archive/consumer contract입니다. 실제 script는 sanitizer, host leak, no-op rebuild를 compiler matrix에 포함하지 않습니다. 따라서 source의 “complete release-oriented suite”는 이 script가 정의한 위 범위로 읽어야 하며 최종 `check` 전체와 동일하지 않습니다.
- compiler-specific failure가 드러나는 지점: strict C99/no-builtin compilation diagnostics, archive symbol format 처리, undefined symbol set, test runtime 중 어느 단계든 한 compiler tree에서 nonzero가 되면 드러납니다. 실제 defect가 있었다는 실행 결과는 현재 기록하지 않습니다.
- 이 commit이 release confidence에 추가하는 것: 같은 source/test/archive contract가 Clang과 GNU GCC 두 compiler family의 독립 clean tree에서 재현 가능해야 합니다. compiler를 찾지 못한 경우도 silent skip하지 않고 실패합니다.
- failure propagation: script는 `set -eu`이며 `make` command를 guard하지 않습니다. 한 compiler suite가 실패하면 script와 `check-compilers` target이 nonzero로 끝나고 다음 상위 release 단계로 진행하지 않습니다.
- 실행 근거: compiler availability와 실제 suite success를 현재 환경에서 실행 확인하지 않았습니다.

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
| clean build | `git diff --check`, `$(MAKE) fclean`, `$(MAKE) all` | whitespace error가 없고 clean state에서 archive를 다시 만들 수 있음 | source correctness와 runtime behavior | 각 recipe line nonzero에서 `check` 중단 |
| functional | `$(MAKE) test` | ordinary test suite가 archive와 함께 성공 | forced allocation/write failures, sanitizer-only defects | submake status 전파 |
| failure | `$(MAKE) failure-test`, `$(MAKE) write-failure-test` | deterministic allocation rollback과 system-call progress branches | 실제 OS timing과 모든 allocator failures | 각 submake status 전파 |
| sanitizer | `$(MAKE) sanitize` | 실제 Makefile상 UBSan target만 실행 | ASan은 별도 `asan` target이며 이 orchestration에 포함되지 않음; leak도 별도 | UBSan binary/report status 전파 |
| archive | `$(MAKE) check-archive` | member/symbol/dependency/external consumer contract | 모든 API functional/ABI behavior | script/command status 전파 |
| compiler | `$(MAKE) check-compilers` | Clang/GCC clean copy에서 build, functional, failure, archive suite | sanitizer/leak/no-op의 compiler별 반복 | script와 nested make status 전파 |
| leak | `$(MAKE) leak` | available host checker로 ordinary test binary leak 검사 | failure binaries와 unsupported checker 없는 host의 성공 | checker 부재/검출/command failure 전파 |
| no-op rebuild | `$(MAKE) -q all` | 앞 단계 뒤 `all` target이 up-to-date여서 rebuild가 필요 없는지 관찰 | reproducible binary bytes, clean git tree 전체 | `make -q`의 1/2 status가 `check` 실패로 전파 |

- orchestration 순서: 위 표 앞에 `git diff --check`가 있고, clean build 이후 functional → allocator failure → write failure → `sanitize` → archive → compiler matrix → leak → no-op 순으로 recipe lines가 나열됩니다.
- failure semantics: 각 line은 별도 shell이지만 Make recipe에 `-` prefix나 error ignore가 없습니다. 어느 command든 nonzero면 target이 즉시 실패해 뒤 lines는 실행되지 않습니다.
- orchestration의 역할: 기존 target을 순서대로 호출할 뿐 production runtime behavior를 새로 구현하지 않습니다. release 판단에 필요한 evidence collection과 fail-fast order를 하나의 entry point로 묶습니다.
- 관찰된 scaffold/implementation 차이 기록: source role은 sanitizer check를 연결한다고 고정하며 실제로 `sanitize`를 호출합니다. 그러나 해당 SHA의 dependency는 `sanitize: ubsan`이고 `asan`을 포함하지 않습니다. fixed role을 변경하지 않고, 학습자가 실제 실행 범위를 UBSan으로 제한해 이해해야 합니다.
- 실행 근거: 현재 환경에서는 Git checkout과 required host tools를 구성하지 못해 `make check`를 실행하지 않았습니다. 이 절은 Make recipe inspection이며 모든 단계 성공을 주장하지 않습니다.

## Invariant ledger

| 단계 | Commit | Source에 연결된 invariant / evidence | 실제 build/test 근거 |
| --- | --- | --- | --- |
| compiler honesty | `4df8b23505b8` | libc-style tests를 builtin substitution으로 무효화하지 않음 | `override CFLAGS`가 strict C99 warnings와 `-fno-builtin`을 ordinary/special compile commands에 전달합니다. |
| artifact contract | `79c0dcefb590` | intended members/symbols/dependencies/out-of-tree linkage | three manifests, `ar`/`nm` normalization, exact `cmp`, temporary consumer compile/link/run을 `check-archive`가 연결합니다. |
| UB detector | `f5de4306ebcd` | UBSan evidence 추가 | 별도 instrumented objects/binary와 halt-on-error execution target이 ordinary suite를 실행합니다. |
| address detector | `c625970fd211` | ASan evidence 추가 | 별도 ASan objects/binary와 halt-on-error target이 있고 leak detection은 0입니다. |
| leak detector | `9f555c37a6d8` | host leak evidence 추가 | `leaks` 우선, Valgrind fallback, checker 부재 explicit failure로 ordinary binary를 검사합니다. |
| compiler matrix | `e31a2e748685` | Clang/GCC clean-tree compatibility evidence | compiler를 version 문자열로 식별하고 별도 copied tree에서 `all test failure-test write-failure-test check-archive`를 실행합니다. |
| orchestration | `b90fd748255a` | established checks를 하나의 release procedure로 연결 | `check` recipe가 fail-fast 순서로 기존 targets와 마지막 `make -q all`을 호출합니다. 실제 `sanitize`는 UBSan만 포함합니다. |

## Failure → Fix → Test 연결

이 thread는 하나의 runtime fix chain보다 release evidence를 점층적으로 강화하는 구조입니다.

- 초기 위험: local compile 성공만으로 artifact boundary를 확정할 수 없음
- compiler substitution 위험 대응: `4df8b23505b8`
- archive/consumer contract 검증: `79c0dcefb590`
- 독립 defect detector 추가: `f5de4306ebcd`, `c625970fd211`, `9f555c37a6d8`
- compiler-family 재현: `e31a2e748685`
- 전체 procedure 연결: `b90fd748255a`
- 실제 각 단계에서 재현 가능한 failure: forbidden builtin policy 제거/compile warning, member·symbol·dependency manifest mismatch, external consumer compile/link/run failure, UBSan/ASan report, host leak report/checker 부재, compiler 한쪽의 build/test failure, stale or unnecessarily rebuilt target입니다.
- 각 failure가 막는 회귀: compiler가 project logic을 대체하는 검증 왜곡, malformed archive/API drift, 숨은 runtime/path dependency, UB/address/leak defect, compiler-family 종속성, 일부 release checks의 누락, dependency graph가 매번 rebuild하는 문제를 각각 막습니다. 단, 최종 `check`의 sanitizer 단계는 ASan 회귀를 자동으로 막지 않으므로 `make asan`을 별도로 실행해야 합니다.

## Verification responsibility 변화

- compiler flags가 책임지는 것: dialect, diagnostics, warning-as-error, builtin substitution 금지를 모든 relevant compile에 적용합니다.
- archive inspection이 책임지는 것: object membership, global API surface, undefined external dependency allowlist를 binary artifact에서 직접 비교합니다.
- external consumer가 책임지는 것: repository 밖 cwd에서 public header와 archive path만으로 선택 API를 compile/link/run할 수 있는지 검사합니다.
- UBSan이 책임지는 것: ordinary suite가 도달한 execution에서 undefined-behavior reports를 fail-fast로 검출합니다.
- ASan이 책임지는 것: ordinary suite가 도달한 address errors를 별도 instrumented target에서 검출합니다. final `check`에는 자동 포함되지 않습니다.
- host leak checker가 책임지는 것: ordinary test process 종료 시 host tool이 관찰하는 leak을 검출하고 checker 부재를 실패로 처리합니다.
- compiler matrix가 책임지는 것: Clang과 GNU GCC 각각의 독립 clean copy에서 build, functional/failure, archive contract를 재현합니다.
- orchestration target이 책임지는 것: 설정된 하위 evidence를 fail-fast 순서로 호출하고 마지막에 no-op rebuild 상태를 확인합니다. 각 detector의 내부 범위를 확장하지는 않습니다.

## Thread 최종 상태

- 마지막 commit 시점에 이 thread가 보장하는 것:
  - 기록: Makefile과 scripts는 strict no-builtin build, archive manifests, external consumer, UBSan, 독립 ASan, host leak checker, Clang/GCC matrix, top-level fail-fast release procedure를 제공합니다. 각 target이 성공했을 때의 artifact/evidence 조건은 코드로 명시돼 있습니다.
- 이 thread만으로는 보장하지 않는 것:
  - 기록: 현재 환경에서 실제 target들이 성공했다는 runtime evidence, Darwin/Linux 외 symbol portability, 모든 API behavior, reproducible archive bytes, long-term ABI compatibility를 보장하지 않습니다. 최종 `check`는 ASan을 호출하지 않으며 compiler matrix도 sanitizer/leak을 반복하지 않습니다.
- source의 significance와 실제 코드 확인 결과가 연결되는 지점:
  - 기록: local compile을 넘어 compiler policy, binary artifact inspection, external consumer, 서로 다른 dynamic detector, compiler-family clean run을 단계적으로 도입하고 한 target에 연결한다는 source significance와 일치합니다. 실제 target dependency가 제한하는 detector 범위는 별도로 기록했습니다.

## 최종 architecture 또는 execution flow 정리

해당 thread의 commit history를 근거로 최종 흐름을 직접 작성합니다.

- 시작 조건 / 입력: Git checkout, C toolchain, `ar`/`nm`/POSIX shell utilities, Clang과 GNU GCC, host leak checker 중 하나가 필요합니다. `check`는 current repository source와 Makefile targets를 입력으로 사용합니다.
- 핵심 분기 또는 책임 경계: compiler flags는 source compile honesty를, `check_archive.sh`는 artifact contract를, sanitizer/leak tools는 runtime defect classes를, `check_compilers.sh`는 compiler-family 재현을 각각 맡습니다.
- 상태 또는 ownership 변화: production ownership 변화는 없습니다. build system은 ordinary, failure, UBSan, ASan object directories와 test binaries를 분리하고 temporary consumer/compiler directories는 trap으로 제거합니다.
- failure 처리: scripts는 `set -eu` 또는 unguarded commands와 exact comparisons를 사용하고 Make는 첫 nonzero recipe에서 중단합니다. unsupported platform, missing compiler/checker도 explicit failure입니다.
- verification 경로: `check`가 whitespace → clean build → functional → two failure suites → UBSan → archive → compiler matrix → host leak → no-op query를 순서대로 실행합니다. ASan은 별도 `asan` path입니다.
- 최종 설명: release artifact를 신뢰하려면 compile 성공 외에 archive contents, API/dependency surface, external linkage, runtime defect detectors, compiler portability, incremental build 상태가 각각 독립 evidence로 필요합니다. 이 Thread는 그 evidence를 scripts와 Make targets로 분리해 만들고 fail-fast release entry point로 조합합니다.

## 학습 완료 자가 점검

- [x] 모든 commit을 문서 순서대로 해당 SHA에서 확인했습니다.
- [x] 중요도와 tags를 source 그대로 유지했습니다.
- [x] 실제 코드 근거와 source 확정 설명을 구분했습니다.
- [x] 변경 전/후 비교가 필요한 commit은 이전 관련 SHA와 비교했습니다.
- [x] failure → fix → test 연결을 실제 코드와 test code로 확인했습니다.
- [x] final HEAD를 과거 commit 설명에 소급하지 않았습니다.
- [x] 이 thread의 최종 invariant와 execution flow를 코드 근거로 설명할 수 있습니다.
