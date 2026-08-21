# Thread 7 — Immutable build inputs and runtime supply-chain evidence

## Thread 목표

moving Debian/WordPress inputs를 immutable digest·snapshot·checksum으로 고정하고, source string뿐 아니라 실제 실행 중 package/application version까지 검증하는 maintained supply-chain contract를 추적합니다.

**Source significance**

> Reproducibility is treated as a maintained contract rather than a one-time freeze. The first commits make upstream identities explicit; the later update demonstrates how supported versions advance; and runtime inspection closes the gap between strings in Dockerfiles and the software actually executing inside containers.

## 이 Thread를 이해하기 위한 핵심 질문

- base image digest와 dated APT snapshot은 서로 다른 어떤 input을 고정합니까?
- snapshot metadata의 validity date를 비활성화한 trade-off는 무엇입니까?
- WordPress core를 image-controlled, `wp-content`를 volume-controlled로 나눈 기준은 무엇입니까?
- bootstrap runtime download를 제거하면 interruption recovery와 reproducibility가 어떻게 연결됩니까?
- source pin checks만으로 stale image cache나 unintended package resolution을 잡지 못하는 이유는 무엇입니까?
- pin update commit이 reproducibility contract를 깨지 않고 maintenance를 수행했다는 증거는 무엇입니까?

## 완료 기준

- 각 Dockerfile의 Debian digest와 snapshot source 설정을 해당 SHA에서 확인했습니다.
- WP-CLI/WordPress version, SHA-256, image source directory, core manifest 생성/검증 경로를 추적했습니다.
- core reconciliation과 `wp-content` preservation policy를 파일별로 비교했습니다.
- static pin test, live WordPress/WP-CLI identity, dpkg minimum, PHP/MariaDB compatibility 검증을 구분했습니다.
- 보안 지원 pin update에서 함께 변경되어야 한 source/test 값을 기록했습니다.

## Commit map

| 순서 | SHA | Subject | Importance | Tags | Source-defined role |
| --- | --- | --- | --- | --- | --- |
| 1 | `3e29fbd34389` | build(images): Debian 이미지와 패키지 입력 고정 | **A** | `SUPPLY_CHAIN`<br>`RISK`<br>`ARCH` | Pinned Debian base images and package repositories to immutable inputs. |
| 2 | `f60ac8061c01` | build(wordpress): WordPress 산출물을 고정해 게시 | **A** | `SUPPLY_CHAIN`<br>`BOOTSTRAP`<br>`RISK` | Pinned WordPress and WP-CLI artifacts and moved core publication into bootstrap reconciliation. |
| 3 | `7b28cccaec1d` | test(supply-chain): 불변 image 입력 검증 | **A** | `TEST`<br>`SUPPLY_CHAIN`<br>`RISK` | Locked the source pins and running application versions in tests. |
| 4 | `cd5982c8ea42` | fix(supply-chain): 보안 지원 runtime pin 갱신 | **B** | `SUPPLY_CHAIN`<br>`RISK` | Advanced the reviewed immutable runtime set without returning to moving inputs. |
| 5 | `127a70f6e4b2` | test(supply-chain): 검토된 runtime 최소 버전 검증 | **A** | `TEST`<br>`SUPPLY_CHAIN`<br>`RISK` | Verified installed package minimums and live PHP/MariaDB compatibility floors. |

> Commit 순서는 source의 Development Thread 정의를 그대로 따릅니다. 같은 SHA가 다른 Thread에도 있으면 이 문서의 관점으로 다시 확인합니다.

## Commit별 학습 기록

### 1. `3e29fbd34389` — build(images): Debian 이미지와 패키지 입력 고정

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `SUPPLY_CHAIN`, `RISK`, `ARCH` |
| Source-defined role | Pinned Debian base images and package repositories to immutable inputs. |
| 이전 Thread commit | 없음 |
| 다음 Thread commit | `f60ac8061c01` |

#### 원문이 확정한 범위

- **Summary:** Pins all service base images by digest and redirects Debian packages to an immutable dated snapshot.
- **Classification reason:** This changes the build trust model from moving upstream inputs to reviewed immutable inputs, a significant reproducibility and supply-chain decision despite not changing application behavior.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `3e29fbd34389`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- 세 Dockerfile의 identical dated Debian base tag와 immutable digest를 비교합니다.
- APT sources가 main/updates/security snapshot timestamp로 교체되고 validity-date checking이 disabled되는 설정을 확인합니다.
- live mirror를 사용하던 parent와 package resolution input이 어떻게 달라졌는지 diff를 기록합니다.
- WordPress image에서 unused `unzip` dependency 제거를 확인하되 core supply-chain decision과 구분합니다.
- pin update가 자동 security update를 멈추고 explicit maintenance를 요구하는 trade-off를 작성합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| `[학습자 작성]` | `[학습자 작성]` | `[학습자 작성]` | `[학습자 삽입]` | `[학습자 작성]` |

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | `[학습자 작성]` |
| 선택한 boundary / decision | `[학습자 작성]` |
| 핵심 caller/callee 또는 configuration consumer | `[학습자 작성]` |
| state / ownership / lifecycle 변화 | `[학습자 작성]` |
| 주요 failure branch | `[학습자 작성]` |
| 이 commit의 보장 | `[학습자 작성]` |
| 한계와 다음 관련 commit | `[학습자 작성]` |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: `[학습자 작성]`
- 다음 관련 commit이 바꾸거나 검증하는 지점: `[학습자 작성]`
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: `[학습자 작성]`

### 2. `f60ac8061c01` — build(wordpress): WordPress 산출물을 고정해 게시

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `SUPPLY_CHAIN`, `BOOTSTRAP`, `RISK` |
| Source-defined role | Pinned WordPress and WP-CLI artifacts and moved core publication into bootstrap reconciliation. |
| 이전 Thread commit | `3e29fbd34389` |
| 다음 Thread commit | `7b28cccaec1d` |

#### 원문이 확정한 범위

- **Summary:** Pins WP-CLI and WordPress archives with checksums, stages WordPress core in the image, atomically reconciles files at bootstrap, and disables automatic core updates.
- **Classification reason:** It removes runtime downloads from initialization and makes the application artifact an immutable, verified build input, significantly strengthening both reproducibility and recovery semantics.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `f60ac8061c01`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- WP-CLI와 WordPress explicit release URL/version, committed SHA-256, checksum verification command를 Dockerfile에서 확인합니다.
- WordPress core를 image-owned source directory에 unpack하고 `wp-content` 제외 sorted checksum manifest를 만드는 code를 추적합니다.
- automatic WordPress update를 disable하는 configuration을 찾습니다.
- bootstrap에서 runtime `wp core download`가 제거되고 manifest path validation, symlink/non-regular rejection, same-directory temp/sync publication이 추가된 diff를 확인합니다.
- installed core 전체를 manifest로 재검증하는 branch와 `wp-content` missing defaults만 생성하고 existing content를 덮지 않는 branch를 비교합니다.
- interruption/drift 뒤 core convergence와 user state preservation의 ownership boundary를 기록합니다.

#### 비교 기준

- exact commit diff: `git diff f60ac8061c01^ f60ac8061c01 -- <path>`
- 이전 Thread 상태와 비교: `git diff 3e29fbd34389 f60ac8061c01 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| `[학습자 작성]` | `[학습자 작성]` | `[학습자 작성]` | `[학습자 삽입]` | `[학습자 작성]` |

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | `[학습자 작성]` |
| 선택한 boundary / decision | `[학습자 작성]` |
| 핵심 caller/callee 또는 configuration consumer | `[학습자 작성]` |
| state / ownership / lifecycle 변화 | `[학습자 작성]` |
| 주요 failure branch | `[학습자 작성]` |
| 이 commit의 보장 | `[학습자 작성]` |
| 한계와 다음 관련 commit | `[학습자 작성]` |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: `[학습자 작성]`
- 다음 관련 commit이 바꾸거나 검증하는 지점: `[학습자 작성]`
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: `[학습자 작성]`

### 3. `7b28cccaec1d` — test(supply-chain): 불변 image 입력 검증

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `TEST`, `SUPPLY_CHAIN`, `RISK` |
| Source-defined role | Locked the source pins and running application versions in tests. |
| 이전 Thread commit | `f60ac8061c01` |
| 다음 Thread commit | `cd5982c8ea42` |

#### 원문이 확정한 범위

- **Summary:** Checks immutable Debian and WordPress pins statically and verifies the running WordPress and WP-CLI versions.
- **Classification reason:** The commit protects the newly established supply-chain contract from silent reversion to moving inputs or runtime downloads.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `7b28cccaec1d`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- static validator가 Debian digest/snapshot, WP-CLI/WordPress versions/checksums, checksum command, core manifest를 exact하게 요구하는 assertions를 찾습니다.
- entrypoint가 runtime download로 돌아가는 pattern을 거부하는 check를 확인합니다.
- e2e runtime scenario가 actual WordPress와 WP-CLI version을 query/assert하는 command를 추적합니다.
- source pin 존재와 actual executed software identity가 다른 경우를 이 test가 어떻게 잡는지 기록합니다.

#### 비교 기준

- exact commit diff: `git diff 7b28cccaec1d^ 7b28cccaec1d -- <path>`
- 이전 Thread 상태와 비교: `git diff f60ac8061c01 7b28cccaec1d -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| `[학습자 작성]` | `[학습자 작성]` | `[학습자 작성]` | `[학습자 삽입]` | `[학습자 작성]` |

#### 테스트 학습 기록

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariant | `[학습자 작성]` |
| 재현하는 failure / boundary | `[학습자 작성]` |
| test technique | `[학습자 작성: static / rendered config / live integration / deterministic pause-signal / SIGKILL / AST 등]` |
| fixture와 failure injection | `[학습자 작성]` |
| 실제 통과하는 production path | `[학습자 작성]` |
| 핵심 assertion | `[학습자 작성]` |
| 이 테스트가 증명하는 것 | `[학습자 작성]` |
| 이 테스트가 증명하지 않는 것 | `[학습자 작성]` |
| 성격 | `[학습자 작성: broad integration / deterministic regression / source contract / 혼합]` |
| 막는 후속 regression | `[학습자 작성]` |
| 직접 실행 command와 결과 | `[학습자 작성]` |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: `[학습자 작성]`
- 다음 관련 commit이 바꾸거나 검증하는 지점: `[학습자 작성]`
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: `[학습자 작성]`

### 4. `cd5982c8ea42` — fix(supply-chain): 보안 지원 runtime pin 갱신

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **B** |
| Tags | `SUPPLY_CHAIN`, `RISK` |
| Source-defined role | Advanced the reviewed immutable runtime set without returning to moving inputs. |
| 이전 Thread commit | `7b28cccaec1d` |
| 다음 Thread commit | `127a70f6e4b2` |

#### 원문이 확정한 범위

- **Summary:** Advances the reviewed Debian digest, package snapshot, WordPress version, checksum, and matching assertions.
- **Classification reason:** The update is security- and support-relevant, but it follows the immutable-input mechanism already established rather than introducing a new trust model.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `cd5982c8ea42`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- 세 base image digest와 snapshot timestamp가 coordinated set으로 바뀐 diff를 확인합니다.
- WordPress 6.7.1→6.7.7 version/checksum change와 WP-CLI pin unchanged를 구분합니다.
- static pin assertions와 live version expectation이 artifact changes와 함께 갱신되는지 확인합니다.
- moving tag로 돌아가지 않고 immutable set을 advance했다는 evidence를 기록합니다.

#### 비교 기준

- exact commit diff: `git diff cd5982c8ea42^ cd5982c8ea42 -- <path>`
- 이전 Thread 상태와 비교: `git diff 7b28cccaec1d cd5982c8ea42 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| `[학습자 작성]` | `[학습자 작성]` | `[학습자 작성]` | `[학습자 삽입]` | `[학습자 작성]` |

#### Fix chain 기록

| 단계 | 학습자 기록 |
| --- | --- |
| 기존 가정 | `[학습자 작성]` |
| 실제 failure 또는 위험 | `[학습자 작성]` |
| root cause | `[학습자 작성]` |
| 수정된 invariant / decision | `[학습자 작성]` |
| 실제 수정 코드 | `[학습자 작성]` |
| 변경된 ordering / ownership / lifecycle | `[학습자 작성]` |
| 이 fix가 보장하는 것 | `[학습자 작성]` |
| 아직 보장하지 않는 것 | `[학습자 작성]` |
| 연결되는 regression test | `[학습자 작성]` |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: `[학습자 작성]`
- 다음 관련 commit이 바꾸거나 검증하는 지점: `[학습자 작성]`
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: `[학습자 작성]`

### 5. `127a70f6e4b2` — test(supply-chain): 검토된 runtime 최소 버전 검증

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `TEST`, `SUPPLY_CHAIN`, `RISK` |
| Source-defined role | Verified installed package minimums and live PHP/MariaDB compatibility floors. |
| 이전 Thread commit | `cd5982c8ea42` |
| 다음 Thread commit | 없음 |

#### 원문이 확정한 범위

- **Summary:** Verifies installed package minimums plus the live PHP and MariaDB compatibility floors inside the built stack.
- **Classification reason:** This closes the gap between source pins and actual runtime contents, catching stale caches or unexpected package resolution in a security-sensitive build path.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `127a70f6e4b2`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `dpkg-query`로 Nginx, OpenSSL, `libssl3`, PHP-FPM, PHP CLI, MariaDB versions를 얻는 commands를 확인합니다.
- `dpkg --compare-versions` minimum table과 각 package assertion을 추적합니다.
- WordPress가 report한 actual PHP/database server version의 semantic triple parsing과 compatibility floor를 확인합니다.
- database identity가 MariaDB인지 검사하는 branch를 찾습니다.
- stale cache/unexpected snapshot/bypass build path를 source-only test보다 어떻게 더 잘 잡는지 기록합니다.

#### 비교 기준

- exact commit diff: `git diff 127a70f6e4b2^ 127a70f6e4b2 -- <path>`
- 이전 Thread 상태와 비교: `git diff cd5982c8ea42 127a70f6e4b2 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| `[학습자 작성]` | `[학습자 작성]` | `[학습자 작성]` | `[학습자 삽입]` | `[학습자 작성]` |

#### 테스트 학습 기록

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariant | `[학습자 작성]` |
| 재현하는 failure / boundary | `[학습자 작성]` |
| test technique | `[학습자 작성: static / rendered config / live integration / deterministic pause-signal / SIGKILL / AST 등]` |
| fixture와 failure injection | `[학습자 작성]` |
| 실제 통과하는 production path | `[학습자 작성]` |
| 핵심 assertion | `[학습자 작성]` |
| 이 테스트가 증명하는 것 | `[학습자 작성]` |
| 이 테스트가 증명하지 않는 것 | `[학습자 작성]` |
| 성격 | `[학습자 작성: broad integration / deterministic regression / source contract / 혼합]` |
| 막는 후속 regression | `[학습자 작성]` |
| 직접 실행 command와 결과 | `[학습자 작성]` |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: `[학습자 작성]`
- 다음 관련 commit이 바꾸거나 검증하는 지점: `[학습자 작성]`
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: `[학습자 작성]`

## Invariant ledger

| Source에서 연결된 invariant | 처음/초기 단계 | 강화·교정 단계 | 검증 단계 | 학습자가 확인한 실제 근거 |
| --- | --- | --- | --- | --- |
| 세 service image는 동일한 reviewed Debian base digest와 dated package snapshot을 사용합니다. | `3e29fbd34389` | `cd5982c8ea42에서 coordinated advance` | `7b28cccaec1d, 127a70f6e4b2` | `[학습자: 실제 code/test evidence]` |
| WordPress와 WP-CLI artifact는 explicit version과 checksum으로 build-time 검증됩니다. | `f60ac8061c01` | `cd5982c8ea42에서 WordPress pin advance` | `7b28cccaec1d` | `[학습자: 실제 code/test evidence]` |
| WordPress core는 image-controlled manifest에 수렴하고 `wp-content`는 existing volume state를 보존합니다. | `f60ac8061c01` | `f60ac8061c01` | `runtime e2e/version checks` | `[학습자: 실제 code/test evidence]` |
| source pin과 실제 installed/runtime identity가 함께 충족되어야 supply-chain contract가 성립합니다. | `7b28cccaec1d` | `127a70f6e4b2에서 package/platform evidence 강화` | `127a70f6e4b2` | `[학습자: 실제 code/test evidence]` |

### Ledger 보완 기록

- source에 명시되지 않은 새 invariant를 확정 사실로 추가하지 않습니다.
- invariant가 실제로 부족했음을 드러낸 commit 또는 failure stage: `[학습자 작성]`
- marker, rename, lock, health, authentication, cleanup 등 invariant를 고정하는 concrete mechanism: `[학습자 작성]`
- 후속 commit이 invariant를 약화하지 못하게 하는 regression evidence: `[학습자 작성]`

## Failure → Fix → Test 연결

| failure / 위험 | fix 또는 mechanism | test / evidence | 학습자 연결 기록 |
| --- | --- | --- | --- |
| moving base tag/live mirror로 같은 source가 다른 bytes를 build | 3e29fbd34389의 immutable digest/snapshot | 7b28cccaec1d static source checks | `[학습자: root cause와 code/test 연결]` |
| startup 때 WordPress를 network download해 image review와 runtime state가 분리 | f60ac8061c01의 verified build artifact와 bootstrap reconciliation | 7b28cccaec1d가 runtime download 회귀와 live version을 검사 | `[학습자: root cause와 code/test 연결]` |
| immutable pin이 오래되어 security/support floor 아래로 내려감 | cd5982c8ea42의 explicit coordinated pin advance | 127a70f6e4b2의 installed minimum/compatibility checks | `[학습자: root cause와 code/test 연결]` |
| Dockerfile 문자열은 맞지만 stale cache나 다른 build path가 실행 | runtime identity/minimum verification | 7b28cccaec1d, 127a70f6e4b2 | `[학습자: root cause와 code/test 연결]` |

### 직접 재구성할 chain

```text
[기존 가정]
  → [실제 failure 또는 위험]
  → [root cause]
  → [수정된 invariant / decision]
  → [해당 SHA의 실제 수정 코드]
  → [failure injection 또는 regression test]
  → [증명된 보장 / 남은 비보장]
```

## Ownership / state / responsibility 변화

| 대상 | 이전 상태 | 이후 책임/authoritative state | 확인할 근거 | 학습자 결론 |
| --- | --- | --- | --- | --- |
| Dockerfile/base image | moving `bookworm-slim` identity | reviewed digest가 base filesystem identity 소유 | FROM digest evidence | `[학습자 작성]` |
| APT repositories | live mirror resolution | dated snapshot timestamp가 package universe 소유 | sources list and validity option evidence | `[학습자 작성]` |
| WordPress core | runtime download/volume drift 가능 | image source + checksum manifest가 authoritative | download/checksum/unpack/manifest/reconcile evidence | `[학습자 작성]` |
| `wp-content` | core와 동일 overwrite policy 가능 | volume-controlled user/application data로 기존 상태 보존 | copy conditions and exclusions evidence | `[학습자 작성]` |
| Verification | source text 중심 | live versions와 installed package floors까지 evidence 확장 | runtime commands/assertions evidence | `[학습자 작성]` |

## Thread 최종 상태

- **Source-confirmed endpoint:** Reproducibility is treated as a maintained contract rather than a one-time freeze. The first commits make upstream identities explicit; the later update demonstrates how supported versions advance; and runtime inspection closes the gap between strings in Dockerfiles and the software actually executing inside containers.
- 최종 authoritative state와 owner: `[학습자 작성]`
- 정상 실행의 entry point와 완료 조건: `[학습자 작성]`
- failure 또는 interruption 뒤 retry/rollback/compensation 조건: `[학습자 작성]`
- 이 Thread가 다른 Thread에 제공하는 전제: `[학습자 작성]`
- 이 Thread 단독으로는 증명하지 않는 것: `[학습자 작성]`

## 최종 architecture 또는 execution flow 정리

| 단계 | 확인할 흐름 | 실제 코드 근거 | 정상 전이 | 실패·정리·재시도 |
| --- | --- | --- | --- | --- |
| 1 | Docker build가 immutable Debian base와 snapshot을 선택하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 2 | WP-CLI와 WordPress archive를 version/checksum으로 검증하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 3 | image-owned core source와 sorted manifest를 생성하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 4 | bootstrap이 persistent volume core를 manifest에 맞춰 reconcile하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 5 | `wp-content` existing data를 보존하는 분기 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 6 | static source pin과 live application/package version을 검증하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 7 | reviewed pin set을 coordinated update하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |

### 학습자의 최종 설명

> `[학습자 작성: 위 표와 commit evidence만 사용해 이 Thread의 설계 → 구현 → 실패 → 수정 → 검증 발전을 설명합니다.]`

## 학습 완료 자가 점검

- [ ] immutable pin을 영구히 업데이트하지 않는다는 의미로 오해하지 않았습니까?
- [ ] base image digest와 package snapshot이 같은 것을 고정한다고 합쳤습니까?
- [ ] WordPress core와 `wp-content`의 ownership policy를 반대로 설명하지 않았습니까?
- [ ] source strings만 확인하고 실제 container version evidence를 생략하지 않았습니까?
- [ ] 모든 code snippet에 SHA와 path/symbol을 기록했습니다.
- [ ] final HEAD의 field/helper/test를 이전 SHA에 소급하지 않았습니다.
- [ ] source가 확정하지 않은 사실을 추정으로 채우지 않았습니다.
- [ ] test가 증명하는 것과 증명하지 않는 것을 구분했습니다.
- [ ] 이 Thread를 commit 순서대로 구두 설명할 수 있습니다.
