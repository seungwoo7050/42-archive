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

- `srcs/requirements/*/Dockerfile`의 `FROM Debian dated tag@sha256`에서 base filesystem bytes가 moving tag가 아니라 content digest로 고정됩니다.
- `srcs/requirements/*/Dockerfile`의 `snapshot.debian.org sources`에서 APT package universe와 metadata가 build date에 따라 움직이지 않습니다.
- `srcs/requirements/wordpress/Dockerfile`의 `dependency cleanup`에서 pinning decision과 별개로 reviewed package set을 줄입니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 3e29fbd34389 | srcs/requirements/*/Dockerfile | FROM Debian dated tag@sha256 | Nginx, MariaDB, WordPress 세 Dockerfile이 동일한 reviewed Debian dated slim image digest를 사용합니다. | base filesystem bytes가 moving tag가 아니라 content digest로 고정됩니다. |
| 3e29fbd34389 | srcs/requirements/*/Dockerfile | snapshot.debian.org sources | main, updates, security package sources를 explicit timestamp snapshot으로 바꾸고 snapshot 사용을 위해 Valid-Until 검사를 비활성화합니다. | APT package universe와 metadata가 build date에 따라 움직이지 않습니다. |
| 3e29fbd34389 | srcs/requirements/wordpress/Dockerfile | dependency cleanup | 더 이상 사용하지 않는 `unzip`을 제거합니다. | pinning decision과 별개로 reviewed package set을 줄입니다. |

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | moving `debian:bookworm-slim`과 live APT mirror는 동일 source를 다른 날 build할 때 base layer와 package versions가 달라질 수 있었습니다. |
| 선택한 boundary / decision | base image는 digest, package repositories는 dated snapshot timestamp로 각각 고정했습니다. |
| 핵심 caller/callee 또는 configuration consumer | `srcs/requirements/*/Dockerfile`의 `FROM Debian dated tag@sha256`; `srcs/requirements/*/Dockerfile`의 `snapshot.debian.org sources`; `srcs/requirements/wordpress/Dockerfile`의 `dependency cleanup` |
| state / ownership / lifecycle 변화 | Dockerfile이 reviewed upstream identities를 소유하고 build는 해당 digest/snapshot만 소비합니다. security updates는 자동이 아니라 explicit pin maintenance가 소유합니다. |
| 주요 failure branch | snapshot unavailable, digest mismatch, package index/install failure는 build failure가 됩니다. Valid-Until 비활성화는 오래된 metadata를 의도적으로 허용하는 trade-off입니다. |
| 이 commit의 보장 | 동일 source와 reachable snapshot으로 같은 base/package input을 선택하는 reproducibility boundary를 제공합니다. |
| 한계와 다음 관련 commit | WordPress/WP-CLI artifact identity, actual installed package versions, image cache가 올바른지까지는 보장하지 않습니다. `f60ac8061c01`이 application artifacts를 고정하고 `7b28cccaec1d`/`127a70f6e4b2`가 source와 live runtime identity를 검증합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: WordPress/WP-CLI artifact identity, actual installed package versions, image cache가 올바른지까지는 보장하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `f60ac8061c01`이 application artifacts를 고정하고 `7b28cccaec1d`/`127a70f6e4b2`가 source와 live runtime identity를 검증합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: 동일 source와 reachable snapshot으로 같은 base/package input을 선택하는 reproducibility boundary를 제공합니다.

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

- `srcs/requirements/wordpress/Dockerfile`의 `WP_CLI_VERSION / SHA-256`에서 runtime network가 다른 WP-CLI bytes를 제공하지 못합니다.
- `srcs/requirements/wordpress/Dockerfile`의 `WORDPRESS_VERSION / SHA-256 / /usr/src/wordpress`에서 reviewed image artifact가 core file authority가 됩니다.
- `srcs/requirements/wordpress/tools/docker-entrypoint.sh`의 `core reconciliation`에서 bootstrap interruption recovery와 reproducibility가 같은 image artifact에 의존합니다.
- `srcs/requirements/wordpress/tools/docker-entrypoint.sh`의 ``wp-content` preservation branch`에서 image upgrade가 application-owned content를 덮어쓰지 않습니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| f60ac8061c01 | srcs/requirements/wordpress/Dockerfile | WP_CLI_VERSION / SHA-256 | explicit WP-CLI version과 checksum으로 phar를 build 시 download·검증한 뒤 image에 설치합니다. | runtime network가 다른 WP-CLI bytes를 제공하지 못합니다. |
| f60ac8061c01 | srcs/requirements/wordpress/Dockerfile | WORDPRESS_VERSION / SHA-256 / /usr/src/wordpress | WordPress archive도 explicit version/checksum으로 검증하고 image-owned source directory에 풀며 sorted core manifest를 만듭니다. | reviewed image artifact가 core file authority가 됩니다. |
| f60ac8061c01 | srcs/requirements/wordpress/tools/docker-entrypoint.sh | core reconciliation | runtime `wp core download`를 제거하고 image source/manifest를 검증한 뒤 persistent web volume의 core files를 temporary+rename 방식으로 맞춥니다. | bootstrap interruption recovery와 reproducibility가 같은 image artifact에 의존합니다. |
| f60ac8061c01 | srcs/requirements/wordpress/tools/docker-entrypoint.sh | `wp-content` preservation branch | existing `wp-content`는 volume-owned user/plugin/upload state로 보존하고 core reconciliation 대상에서 분리합니다. | image upgrade가 application-owned content를 덮어쓰지 않습니다. |

#### 비교 기준

- exact commit diff: `git diff f60ac8061c01^ f60ac8061c01 -- <path>`
- 이전 Thread 상태와 비교: `git diff 3e29fbd34389 f60ac8061c01 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | WordPress bootstrap이 runtime network에서 moving artifact를 download하면 image review와 실제 persistent core bytes가 분리되고 중단 시 partially downloaded state가 남을 수 있었습니다. |
| 선택한 boundary / decision | WP-CLI와 WordPress를 build-time version/checksum으로 고정하고 image-controlled core source/manifest를 bootstrap이 persistent volume에 수렴시키도록 했습니다. |
| 핵심 caller/callee 또는 configuration consumer | `srcs/requirements/wordpress/Dockerfile`의 `WP_CLI_VERSION / SHA-256`; `srcs/requirements/wordpress/Dockerfile`의 `WORDPRESS_VERSION / SHA-256 / /usr/src/wordpress`; `srcs/requirements/wordpress/tools/docker-entrypoint.sh`의 `core reconciliation`; `srcs/requirements/wordpress/tools/docker-entrypoint.sh`의 ``wp-content` preservation branch` |
| state / ownership / lifecycle 변화 | image가 WordPress core identity를, named volume이 `wp-content`와 runtime state를 소유합니다. bootstrap은 둘 사이 reconciliation/publish lifecycle을 소유합니다. |
| 주요 failure branch | download/checksum/unpack/manifest build failure는 image build를 중단합니다. runtime manifest/source 검증이나 atomic file publication 실패는 completion marker 전에 bootstrap을 실패시킵니다. |
| 이 commit의 보장 | runtime network download 없이 reviewed core bytes와 WP-CLI를 사용하고, existing `wp-content`를 보존하면서 core를 manifest에 맞출 수 있습니다. |
| 한계와 다음 관련 commit | source pins가 실제 running container에 적용됐는지와 package security floor는 별도 runtime evidence가 필요합니다. `7b28cccaec1d`이 no-runtime-download/source pins/live versions를 검사하고 `cd5982c8ea42`이 maintained update 절차를 보여줍니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: source pins가 실제 running container에 적용됐는지와 package security floor는 별도 runtime evidence가 필요합니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `7b28cccaec1d`이 no-runtime-download/source pins/live versions를 검사하고 `cd5982c8ea42`이 maintained update 절차를 보여줍니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: runtime network download 없이 reviewed core bytes와 WP-CLI를 사용하고, existing `wp-content`를 보존하면서 core를 manifest에 맞출 수 있습니다.

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

- `tests/validate_stack.py`의 `Dockerfile pin assertions`에서 moving tag/live mirror/checksum 제거를 정적으로 막습니다.
- `tests/validate_stack.py`의 `no runtime download / reconciliation patterns`에서 build-owned core와 runtime reconciliation architecture를 고정합니다.
- `tests/runtime_stack.py`의 `live WordPress/WP-CLI versions`에서 Dockerfile 문자열과 실제 runtime identity 사이의 gap을 줄입니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 7b28cccaec1d | tests/validate_stack.py | Dockerfile pin assertions | 세 base digest/snapshot timestamp와 WP-CLI/WordPress version/checksum을 exact source values로 검사합니다. | moving tag/live mirror/checksum 제거를 정적으로 막습니다. |
| 7b28cccaec1d | tests/validate_stack.py | no runtime download / reconciliation patterns | WordPress entrypoint의 `wp core download`를 금지하고 image artifact/manifest/atomic publication pattern을 요구합니다. | build-owned core와 runtime reconciliation architecture를 고정합니다. |
| 7b28cccaec1d | tests/runtime_stack.py | live WordPress/WP-CLI versions | running WordPress container에서 WP core version과 WP-CLI version을 실행해 pinned expected values와 비교합니다. | Dockerfile 문자열과 실제 runtime identity 사이의 gap을 줄입니다. |

#### 비교 기준

- exact commit diff: `git diff 7b28cccaec1d^ 7b28cccaec1d -- <path>`
- 이전 Thread 상태와 비교: `git diff f60ac8061c01 7b28cccaec1d -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### 테스트 학습 기록

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariant | immutable source inputs과 running WordPress/WP-CLI identity가 같은 reviewed set을 가리킵니다. |
| 재현하는 failure / boundary | moving tag/mirror, checksum 제거, runtime core download, stale/wrong application image입니다. |
| test technique | static source pin contract + live version inspection |
| fixture와 failure injection | Dockerfiles/entrypoint source와 isolated running stack이 fixture입니다. |
| 실제 통과하는 production path | validator가 source를 검사하고 runtime harness가 WordPress container에서 version commands를 실행합니다. |
| 핵심 assertion | exact digest/snapshot/version/checksum, no runtime download, live WP/WP-CLI version 일치를 확인합니다. |
| 이 테스트가 증명하는 것 | source policy와 실제 application-level runtime identity의 연결을 증명합니다. |
| 이 테스트가 증명하지 않는 것 | 모든 installed package version, artifact signer, vulnerability 상태는 증명하지 않습니다. |
| 성격 | mixed static/runtime supply-chain regression |
| 막는 후속 regression | moving input 재도입, checksum 제거, runtime download, wrong cached application artifact를 막습니다. |
| 직접 실행 command와 결과 | 실행하지 않았습니다. 현재 환경에는 Docker와 로컬 repository checkout이 없습니다. 해당 SHA의 test code와 command wiring만 검사했습니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: OS package full inventory, cryptographic provenance, vulnerability absence, cache content 전체는 증명하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `127a70f6e4b2`가 installed package minimum과 PHP/MariaDB compatibility evidence를 더합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: reviewed source pins와 running WordPress/WP-CLI identity가 함께 일치함을 증명합니다.

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

- `srcs/requirements/*/Dockerfile`의 `coordinated Debian digest/snapshot update`에서 서비스별 package universe가 서로 다른 review generation으로 갈라지지 않습니다.
- `srcs/requirements/wordpress/Dockerfile`의 `WordPress version/checksum update`에서 application artifact도 explicit immutable identity를 유지한 채 advance합니다.
- `tests/validate_stack.py / tests/runtime_stack.py`의 `expected pin/version updates`에서 test가 old pin을 무조건 고정하는 것이 아니라 reviewed set maintenance를 추적합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| cd5982c8ea42 | srcs/requirements/*/Dockerfile | coordinated Debian digest/snapshot update | 세 service가 같은 새 dated Debian base digest와 새 snapshot timestamp로 함께 이동합니다. | 서비스별 package universe가 서로 다른 review generation으로 갈라지지 않습니다. |
| cd5982c8ea42 | srcs/requirements/wordpress/Dockerfile | WordPress version/checksum update | WordPress pin과 checksum을 새 supported patch release로 갱신합니다. | application artifact도 explicit immutable identity를 유지한 채 advance합니다. |
| cd5982c8ea42 | tests/validate_stack.py / tests/runtime_stack.py | expected pin/version updates | source/static/runtime expected values를 production pin과 같은 commit에서 갱신합니다. | test가 old pin을 무조건 고정하는 것이 아니라 reviewed set maintenance를 추적합니다. |

#### 비교 기준

- exact commit diff: `git diff cd5982c8ea42^ cd5982c8ea42 -- <path>`
- 이전 Thread 상태와 비교: `git diff 7b28cccaec1d cd5982c8ea42 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### Fix chain 기록

| 단계 | 학습자 기록 |
| --- | --- |
| 기존 가정 | immutable pin을 영구 동결하면 upstream security/support floor가 내려가 reproducible하지만 오래된 runtime이 됩니다. |
| 실제 failure 또는 위험 | 새 digest/checksum/compatibility가 틀리면 build/static/runtime test가 실패합니다. |
| root cause | immutable pin을 영구 동결하면 upstream security/support floor가 내려가 reproducible하지만 오래된 runtime이 됩니다. |
| 수정된 invariant / decision | digest/snapshot/application version/checksum과 corresponding tests를 coordinated review unit으로 전진시켰습니다. |
| 실제 수정 코드 | `srcs/requirements/*/Dockerfile`의 `coordinated Debian digest/snapshot update`; `srcs/requirements/wordpress/Dockerfile`의 `WordPress version/checksum update`; `tests/validate_stack.py / tests/runtime_stack.py`의 `expected pin/version updates` |
| 변경된 ordering / ownership / lifecycle | repository commit이 새 reviewed generation의 identity를 소유하며 automatic moving update는 계속 허용하지 않습니다. |
| 이 fix가 보장하는 것 | maintenance가 moving input으로 회귀하지 않고 새 immutable reviewed set으로 수행될 수 있음을 보여줍니다. |
| 아직 보장하지 않는 것 | 새 set의 모든 vulnerability가 제거됐다는 보장은 아니며 explicit support/security criteria가 계속 필요합니다. |
| 연결되는 regression test | `127a70f6e4b2`가 새 runtime의 package minimum과 platform compatibility를 live inspect합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: 새 set의 모든 vulnerability가 제거됐다는 보장은 아니며 explicit support/security criteria가 계속 필요합니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `127a70f6e4b2`가 새 runtime의 package minimum과 platform compatibility를 live inspect합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: maintenance가 moving input으로 회귀하지 않고 새 immutable reviewed set으로 수행될 수 있음을 보여줍니다.

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

- `tests/runtime_stack.py`의 `DEBIAN_PACKAGE_MINIMUMS / dpkg comparison`에서 source snapshot string뿐 아니라 실제 package selection을 검사합니다.
- `tests/runtime_stack.py`의 `live PHP version compatibility`에서 application runtime engine compatibility를 live process에서 확인합니다.
- `tests/runtime_stack.py`의 `live MariaDB server version compatibility`에서 DB service가 expected platform generation을 실제 실행 중인지 확인합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 127a70f6e4b2 | tests/runtime_stack.py | DEBIAN_PACKAGE_MINIMUMS / dpkg comparison | Nginx/OpenSSL/PHP/MariaDB 등 reviewed minimum을 service container의 installed package version과 `dpkg --compare-versions`로 비교합니다. | source snapshot string뿐 아니라 실제 package selection을 검사합니다. |
| 127a70f6e4b2 | tests/runtime_stack.py | live PHP version compatibility | running PHP version을 parse하고 WordPress가 요구하는 minimum과 reviewed floor 이상인지 확인합니다. | application runtime engine compatibility를 live process에서 확인합니다. |
| 127a70f6e4b2 | tests/runtime_stack.py | live MariaDB server version compatibility | server version string을 query/parse해 WordPress/MySQL compatibility minimum과 reviewed MariaDB floor를 검사합니다. | DB service가 expected platform generation을 실제 실행 중인지 확인합니다. |

#### 비교 기준

- exact commit diff: `git diff 127a70f6e4b2^ 127a70f6e4b2 -- <path>`
- 이전 Thread 상태와 비교: `git diff cd5982c8ea42 127a70f6e4b2 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### 테스트 학습 기록

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariant | reviewed snapshot에서 실제 설치된 packages와 live PHP/MariaDB가 정한 minimum/compatibility floor 이상입니다. |
| 재현하는 failure / boundary | stale cache, alternate package resolution, unintended downgrade, incompatible live engine/server입니다. |
| test technique | live installed-package and runtime-version boundary test |
| fixture와 failure injection | isolated built stack의 Nginx/WordPress/MariaDB containers와 reviewed minimum mapping을 사용합니다. |
| 실제 통과하는 production path | container exec→dpkg query/compare→PHP version parse→MariaDB server version query/parse를 통과합니다. |
| 핵심 assertion | 필수 package 존재와 minimum 이상, live PHP/DB application floor 이상을 확인합니다. |
| 이 테스트가 증명하는 것 | source pin이 실제 package/runtime identity로 이어졌음을 강화합니다. |
| 이 테스트가 증명하지 않는 것 | 모든 dependency, behavior compatibility, 보안 취약점 부재는 증명하지 않습니다. |
| 성격 | runtime supply-chain boundary regression |
| 막는 후속 regression | wrong cache/image, package downgrade, unsupported PHP/DB runtime이 source-only checks를 통과하는 회귀를 막습니다. |
| 직접 실행 command와 결과 | 실행하지 않았습니다. 현재 환경에는 Docker와 로컬 repository checkout이 없습니다. 해당 SHA의 test code와 command wiring만 검사했습니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: 모든 transitive library, CVE absence, functional compatibility 전체를 증명하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: source text와 running software 사이 verification chain을 완성합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: reviewed minimum packages와 live platform compatibility가 실제 built/running containers에 적용됨을 증명합니다.

## Invariant ledger

| Source에서 연결된 invariant | 처음/초기 단계 | 강화·교정 단계 | 검증 단계 | 학습자가 확인한 실제 근거 |
| --- | --- | --- | --- | --- |
| 세 service image는 동일한 reviewed Debian base digest와 dated package snapshot을 사용합니다. | 3e29fbd34389 | cd5982c8ea42 coordinated advance | 7b28cccaec1d, 127a70f6e4b2 | 세 Dockerfile exact pins와 live installed-package checks가 같은 reviewed generation을 연결합니다. |
| WordPress와 WP-CLI artifact는 explicit version과 checksum으로 build-time 검증됩니다. | f60ac8061c01 | cd5982c8ea42 WordPress pin advance | 7b28cccaec1d | Dockerfile checksum verification, no runtime download, live version assertions이 연결됩니다. |
| WordPress core는 image-controlled manifest에 수렴하고 `wp-content`는 existing volume state를 보존합니다. | f60ac8061c01 | f60ac8061c01 | runtime e2e/version checks | image source/manifest reconciliation은 core만 다루고 content branch는 existing volume data를 유지합니다. |
| source pin과 실제 installed/runtime identity가 함께 충족되어야 supply-chain contract가 성립합니다. | 7b28cccaec1d | 127a70f6e4b2 package/platform evidence 강화 | 127a70f6e4b2 | static exact strings와 live WP/WP-CLI/package/PHP/MariaDB version을 다른 layer로 검사합니다. |

### Ledger 보완 기록

- source에 명시되지 않은 새 invariant를 확정 사실로 추가하지 않습니다.
- invariant가 실제로 부족했음을 드러낸 commit 또는 failure stage: moving base tags, live APT mirrors와 runtime WordPress download는 같은 source에서 시간에 따라 다른 image와 interrupted bootstrap 결과를 만들 수 있었습니다.
- marker, rename, lock, health, authentication, cleanup 등 invariant를 고정하는 concrete mechanism: Debian digest, dated snapshots, WordPress/WP-CLI version+checksum, image-owned core manifest와 bootstrap reconciliation이 reviewed input set을 고정합니다.
- 후속 commit이 invariant를 약화하지 못하게 하는 regression evidence: `7b28cccaec1d` source/live identity checks와 `127a70f6e4b2` installed package/runtime compatibility floors가 stale cache와 unexpected resolution을 검출합니다.
## Failure → Fix → Test 연결

| failure / 위험 | fix 또는 mechanism | test / evidence | 학습자 연결 기록 |
| --- | --- | --- | --- |
| moving base tag/live mirror로 같은 source가 다른 bytes를 build | 3e29fbd34389 immutable digest/snapshot | 7b28cccaec1d static source checks | base filesystem과 package universe를 별도 immutable inputs로 고정합니다. |
| startup 때 WordPress runtime download로 image review와 state 분리 | f60ac8061c01 verified build artifact와 core reconciliation | 7b28cccaec1d no-download/live version | bootstrap은 network가 아니라 image source/manifest를 사용합니다. |
| immutable pin이 오래되어 support/security floor 아래로 감 | cd5982c8ea42 explicit coordinated advance | 127a70f6e4b2 installed minimum/compatibility checks | immutability를 유지하면서 review generation을 갱신합니다. |
| Dockerfile 문자열은 맞지만 stale cache/alternate path 실행 | runtime identity/minimum verification | 7b28cccaec1d, 127a70f6e4b2 | source contract와 effective runtime evidence를 결합합니다. |

### 직접 재구성할 chain

```text
기존 가정: version tag와 package name만 적으면 반복 가능한 build가 된다는 가정
  → 실제 failure 또는 위험: base image, repository metadata, WordPress archive가 이동해 동일 commit의 산출물이 달라지고 bootstrap이 network 상태에 의존했습니다.
  → root cause: upstream identity와 checksum이 source-controlled input으로 고정되지 않았습니다.
  → 수정된 invariant / decision: 모든 external artifact를 immutable identity로 검증해 image에 포함하고 runtime은 manifest로 core를 reconcile합니다.
  → 해당 SHA의 실제 수정 코드: `3e29fbd34389`, `f60ac8061c01` Dockerfile/entrypoint changes와 `cd5982c8ea42` coordinated pin update
  → failure injection 또는 regression test: `7b28cccaec1d`, `127a70f6e4b2` static/live tests
  → 증명된 보장 / 남은 비보장: reviewed build input과 실제 runtime minimum을 검증하지만 새 보안 release 반영은 자동이 아니라 명시적 maintenance가 필요합니다.
```

## Ownership / state / responsibility 변화

| 대상 | 이전 상태 | 이후 책임/authoritative state | 확인할 근거 | 학습자 결론 |
| --- | --- | --- | --- | --- |
| Dockerfile/base image | moving bookworm-slim identity | reviewed digest가 base filesystem identity 소유 | 3e29fbd34389 FROM digest | tag 이름만 신뢰하지 않습니다. |
| APT repositories | live mirror resolution | dated snapshot timestamp가 package universe 소유 | snapshot source/Valid-Until config | 업데이트는 explicit commit이 필요합니다. |
| WordPress core | runtime download/volume drift 가능 | image source + checksum manifest가 authority | f60ac8061c01 download/checksum/manifest/reconcile | persistent core는 image-reviewed bytes에 수렴합니다. |
| wp-content | core와 동일 overwrite 위험 | volume-controlled user/application data | f60ac8061c01 preservation branch | image update가 existing content를 덮지 않습니다. |
| Verification | source text 중심 | live versions와 installed package floors까지 evidence 확장 | 7b28cccaec1d, 127a70f6e4b2 | source와 runtime을 별도 layer로 비교합니다. |

## Thread 최종 상태

- **Source-confirmed endpoint:** Reproducibility is treated as a maintained contract rather than a one-time freeze. The first commits make upstream identities explicit; the later update demonstrates how supported versions advance; and runtime inspection closes the gap between strings in Dockerfiles and the software actually executing inside containers.
- 최종 authoritative state와 owner: repository pins가 reviewed base/package/application identities를, image manifest가 WordPress core를, named volume이 `wp-content`를 소유합니다.
- 정상 실행의 entry point와 완료 조건: build-time digest/snapshot/checksum 검증과 bootstrap manifest reconciliation, static pins, live versions/minimums가 모두 통과하면 contract가 충족됩니다.
- failure 또는 interruption 뒤 retry/rollback/compensation 조건: pin mismatch/build failure/runtime version mismatch는 silent fallback 없이 실패하며 update는 coordinated reviewed commit으로 수행합니다.
- 이 Thread가 다른 Thread에 제공하는 전제: Thread 2 bootstrap이 network-independent reviewed artifact로 수렴하고 Thread 8 CI가 동일 checks를 자동 실행할 전제를 제공합니다.
- 이 Thread 단독으로는 증명하지 않는 것: 취약점 부재나 byte-for-byte 모든 transitive toolchain reproducibility를 단독으로 증명하지 않습니다.

## 최종 architecture 또는 execution flow 정리

| 단계 | 확인할 흐름 | 실제 코드 근거 | 정상 전이 | 실패·정리·재시도 |
| --- | --- | --- | --- | --- |
| 1 | base/package 선택 | 3e29fbd34389 Dockerfiles | digest base와 dated snapshots만 사용합니다. | unreachable/mismatch/package failure면 build 중단입니다. |
| 2 | application artifacts 검증 | f60ac8061c01 Dockerfile | WP-CLI/WordPress version+SHA-256을 확인합니다. | checksum mismatch면 image가 생성되지 않습니다. |
| 3 | core source/manifest 생성 | f60ac8061c01 `/usr/src/wordpress` | reviewed core bytes와 sorted manifest를 image에 저장합니다. | manifest/source mismatch는 bootstrap 실패입니다. |
| 4 | persistent core 수렴 | f60ac8061c01 entrypoint reconciliation | core files를 image manifest에 맞추고 atomic publish합니다. | marker 전 failure는 다음 bootstrap에서 다시 수렴합니다. |
| 5 | content 보존 | f60ac8061c01 wp-content branch | existing user/plugin/upload data를 유지합니다. | core update가 content tree를 overwrite하지 않습니다. |
| 6 | source/live verification | 7b28cccaec1d, 127a70f6e4b2 tests | pins와 running app/package/platform versions를 비교합니다. | 문자열 또는 live identity mismatch는 regression입니다. |
| 7 | reviewed update | cd5982c8ea42 | digest/snapshot/version/checksum/tests를 함께 advance합니다. | 부분 update는 static/runtime mismatch로 실패합니다. |

### 학습자의 최종 설명

> reproducibility는 한번 freeze하고 잊는 상태가 아닙니다. base filesystem은 digest, Debian package universe는 dated snapshot, WP-CLI와 WordPress는 version+checksum으로 각각 다른 upstream input을 고정합니다. WordPress core는 image source와 manifest가 authority가 되어 bootstrap이 persistent volume을 수렴시키고, `wp-content`는 volume-owned state로 보존됩니다. static tests는 moving input과 runtime download 회귀를 막지만 stale cache나 alternate build path까지 보지 못하므로 live WP/WP-CLI, installed package minimum, PHP/MariaDB compatibility를 별도로 확인합니다. 후속 pin update는 모든 identities와 tests를 함께 바꿔 immutable contract를 유지하면서 supported generation으로 전진합니다.

## 학습 완료 자가 점검

- [x] immutable pin을 영구히 업데이트하지 않는다는 의미로 오해하지 않았습니까?
- [x] base image digest와 package snapshot이 같은 것을 고정한다고 합쳤습니까?
- [x] WordPress core와 `wp-content`의 ownership policy를 반대로 설명하지 않았습니까?
- [x] source strings만 확인하고 실제 container version evidence를 생략하지 않았습니까?
- [x] 모든 code snippet에 SHA와 path/symbol을 기록했습니다.
- [x] final HEAD의 field/helper/test를 이전 SHA에 소급하지 않았습니다.
- [x] source가 확정하지 않은 사실을 추정으로 채우지 않았습니다.
- [x] test가 증명하는 것과 증명하지 않는 것을 구분했습니다.
- [x] 이 Thread를 commit 순서대로 구두 설명할 수 있습니다.
