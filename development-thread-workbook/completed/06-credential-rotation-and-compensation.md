# Thread 6 — Coordinated credential rotation and compensation

## Thread 목표

host secret files, MariaDB accounts, WordPress users, `wp-config.php`에 분산된 credential set을 ordered transition으로 교체하고, post-write failure와 signal interruption에도 이전 verified state로 보상하는 multi-store transaction을 추적합니다.

**Source significance**

> Credentials are represented in four host files, two MariaDB accounts, two WordPress users, and WordPress configuration. The thread therefore evolves from individual mutation primitives to a verified state transition and then to compensation for commands that may change state before failing. Deferring further termination while rollback is active is the key correction that prevents recovery itself from being interrupted.

## 이 Thread를 이해하기 위한 핵심 질문

- 하나의 logical credential generation이 실제로 어느 저장소와 consumer에 분산됩니까?
- command failure가 no mutation을 뜻하지 않는 post-write ambiguity는 어떤 helper/test hook으로 재현됩니까?
- application password를 root password보다 먼저 바꾸는 이유와 rollback 순서는 무엇입니까?
- 새 credential의 성공뿐 아니라 이전 credential의 실패를 확인해야 하는 이유는 무엇입니까?
- host file publication이 per-file atomic이어도 전체 네 파일이 transaction이 아닌 이유는 무엇입니까?
- 첫 signal과 rollback 중 추가 signal을 다르게 처리하는 상태 전이는 어디에 구현됩니까?

## 완료 기준

- 네 host files, MariaDB root/application accounts, WordPress admin/author users, private config의 관계를 그렸습니다.
- 각 mutation primitive의 stdin/no-argument secret boundary와 atomic file publication을 확인했습니다.
- forward rotation ordering과 compensation ordering을 actual call sequence로 비교했습니다.
- positive/negative authentication probes가 actual state를 authoritative하게 판단하는 방식을 기록했습니다.
- 각 failure injection과 double-signal scenario가 어떤 mixed state를 재현하는지 구분했습니다.

## Commit map

| 순서 | SHA | Subject | Importance | Tags | Source-defined role |
| --- | --- | --- | --- | --- | --- |
| 1 | `a2d20b8c2c03` | feat(secrets): 교체 비밀 파일을 안전하게 읽고 게시 | **A** | `SECRETS`<br>`RISK`<br>`OPERATIONS` | Established safe replacement input and atomic host-file publication. |
| 2 | `832d182743ea` | feat(secrets): MariaDB 계정 비밀번호 원자 교체 | **A** | `SECRETS`<br>`RISK`<br>`INTEGRATION` | Implemented MariaDB application and root credential changes. |
| 3 | `0aa998fdd344` | feat(secrets): WordPress 설정과 사용자 비밀번호 교체 | **A** | `SECRETS`<br>`RISK`<br>`INTEGRATION` | Implemented WordPress configuration and user credential changes. |
| 4 | `64844c583211` | feat(secrets): 신규 자격증명 수용과 기존 값 거부 검증 | **A** | `TEST`<br>`SECRETS`<br>`RISK` | Required replacement credentials to work and previous values to fail. |
| 5 | `c68486d55f30` | feat(secrets): 회전 실패 시 기존 자격증명 복구 | **A** | `SECRETS`<br>`RECOVERY`<br>`HARD` | Added cross-store rollback to the prior verified state. |
| 6 | `9934b478c79a` | feat(secrets): 스택 자격증명 회전 절차 연결 | **S** | `SECRETS`<br>`RECOVERY`<br>`CORE` | Connected the ordered, locked, verified rotation transaction. |
| 7 | `2e6649a7706d` | fix(secrets): 회전 중단과 불명확한 상태를 보상 | **S** | `SECRETS`<br>`RECOVERY`<br>`HARD` | Compensated ambiguous post-write failures and deferred signals during rollback. |
| 8 | `0da35c72add5` | test(secrets): 회전 롤백과 재시도 검증 | **A** | `TEST`<br>`SECRETS`<br>`RECOVERY` | Exercised successful rotation, injected failures, interruption, rollback, leak checks, and retry. |
| 9 | `2557079c2d19` | test(secrets): 회전 후 런타임 비밀 경계 고정 | **B** | `TEST`<br>`SECRETS` | Prevented tests from weakening the steady-state secret boundary. |

> Commit 순서는 source의 Development Thread 정의를 그대로 따릅니다. 같은 SHA가 다른 Thread에도 있으면 이 문서의 관점으로 다시 확인합니다.

## Commit별 학습 기록

### 1. `a2d20b8c2c03` — feat(secrets): 교체 비밀 파일을 안전하게 읽고 게시

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `SECRETS`, `RISK`, `OPERATIONS` |
| Source-defined role | Established safe replacement input and atomic host-file publication. |
| 이전 Thread commit | 없음 |
| 다음 Thread commit | `832d182743ea` |

#### 원문이 확정한 범위

- **Summary:** Adds hardened replacement-secret reads and per-file atomic, durable host-secret publication.
- **Classification reason:** This establishes the host filesystem side of credential rotation and prevents partial individual files or unsafe input types from entering a multi-system state transition.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `a2d20b8c2c03`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `tools/rotate_secrets.py`의 `read replacement/active secret`에서 rotation source와 current generation의 host-side trust boundary가 같습니다.
- `tools/rotate_secrets.py`의 `publish_secret_file`에서 개별 file은 torn write 없이 한 번에 새 content로 보입니다.
- `tools/rotate_secrets.py`의 `temporary cleanup`에서 per-file publication 실패가 stray credential file을 남기지 않습니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| a2d20b8c2c03 | tools/rotate_secrets.py | read replacement/active secret | incoming과 active secret을 no-follow descriptor로 열고 regular file, single link, current owner, `0600`, bounded single-line/password-shape를 검사합니다. | rotation source와 current generation의 host-side trust boundary가 같습니다. |
| a2d20b8c2c03 | tools/rotate_secrets.py | publish_secret_file | target과 같은 directory에 private temporary file을 만들고 write·flush·fsync한 뒤 `os.replace`하고 parent directory를 fsync합니다. | 개별 file은 torn write 없이 한 번에 새 content로 보입니다. |
| a2d20b8c2c03 | tools/rotate_secrets.py | temporary cleanup | write/sync/replace 실패마다 아직 남은 temporary file을 unlink하고 original target을 보존합니다. | per-file publication 실패가 stray credential file을 남기지 않습니다. |

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | replacement value와 active host file을 일반 pathname/read/write로 다루면 symlink·permission·partial write·existing temp 위험이 있었습니다. |
| 선택한 boundary / decision | input과 current file 모두 hardened read를 사용하고 각 target은 same-directory atomic durable replace로 게시했습니다. |
| 핵심 caller/callee 또는 configuration consumer | `tools/rotate_secrets.py`의 `read replacement/active secret`; `tools/rotate_secrets.py`의 `publish_secret_file`; `tools/rotate_secrets.py`의 `temporary cleanup` |
| state / ownership / lifecycle 변화 | helper가 한 secret file의 temp/descriptor/replace lifetime을 소유합니다. orchestrator는 네 file의 logical generation ordering을 별도로 소유해야 합니다. |
| 주요 failure branch | unsafe input/target, write/fsync/replace/parent-sync failure는 해당 file publication을 실패시키고 temp를 정리합니다. |
| 이 commit의 보장 | 각 host secret file이 private regular single-link이며 개별 replacement가 atomic/durable하다는 것을 보장합니다. |
| 한계와 다음 관련 commit | 네 files와 DB/WordPress stores 전체가 한 번에 바뀌는 global transaction은 제공하지 않습니다. `9934b478c79a`가 per-file primitive를 ordered multi-store transition에 넣고 `2e6649a7706d`가 post-write ambiguity를 보상합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: 네 files와 DB/WordPress stores 전체가 한 번에 바뀌는 global transaction은 제공하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `9934b478c79a`가 per-file primitive를 ordered multi-store transition에 넣고 `2e6649a7706d`가 post-write ambiguity를 보상합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: 각 host secret file이 private regular single-link이며 개별 replacement가 atomic/durable하다는 것을 보장합니다.

### 2. `832d182743ea` — feat(secrets): MariaDB 계정 비밀번호 원자 교체

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `SECRETS`, `RISK`, `INTEGRATION` |
| Source-defined role | Implemented MariaDB application and root credential changes. |
| 이전 Thread commit | `a2d20b8c2c03` |
| 다음 Thread commit | `0aa998fdd344` |

#### 원문이 확정한 범위

- **Summary:** Adds root-authenticated MariaDB SQL execution and coordinated application/root password changes through private option files.
- **Classification reason:** This implements a high-risk part of credential rotation while keeping credentials out of process arguments and preserving SQL literal correctness.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `832d182743ea`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `tools/rotate_secrets.py`의 `change_application_db_password`에서 public TCP/argv에 새 password를 노출하지 않고 DB-owned account state를 변경합니다.
- `tools/rotate_secrets.py`의 `change_root_db_password`에서 root credential 변경 시점과 application 변경 시점을 orchestrator가 분리할 수 있습니다.
- `tools/rotate_secrets.py`의 `bounded subprocess / cleanup`에서 mutation command lifecycle과 secret-bearing temporary state를 제한합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 832d182743ea | tools/rotate_secrets.py | change_application_db_password | local MariaDB socket에서 current privileged credential로 application account의 password를 바꾸고 identifier/literal을 안전하게 구성합니다. | public TCP/argv에 새 password를 노출하지 않고 DB-owned account state를 변경합니다. |
| 832d182743ea | tools/rotate_secrets.py | change_root_db_password | root account 변경을 별도 primitive로 두고 temporary private client options/stdin을 사용해 password가 process argument에 나타나지 않게 합니다. | root credential 변경 시점과 application 변경 시점을 orchestrator가 분리할 수 있습니다. |
| 832d182743ea | tools/rotate_secrets.py | bounded subprocess / cleanup | DB command timeout/nonzero와 temporary option file cleanup을 domain error로 처리합니다. | mutation command lifecycle과 secret-bearing temporary state를 제한합니다. |

#### 비교 기준

- exact commit diff: `git diff 832d182743ea^ 832d182743ea -- <path>`
- 이전 Thread 상태와 비교: `git diff a2d20b8c2c03 832d182743ea -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | host files만 바꾸면 MariaDB가 저장한 application/root password와 consumer file이 불일치합니다. |
| 선택한 boundary / decision | application account와 root account를 별도 local-socket mutation primitive로 만들고 secret을 argv가 아닌 private input으로 전달했습니다. |
| 핵심 caller/callee 또는 configuration consumer | `tools/rotate_secrets.py`의 `change_application_db_password`; `tools/rotate_secrets.py`의 `change_root_db_password`; `tools/rotate_secrets.py`의 `bounded subprocess / cleanup` |
| state / ownership / lifecycle 변화 | MariaDB가 실제 authentication state를 소유하며 host helper는 command 실행과 temporary credential material을 잠시 소유합니다. |
| 주요 failure branch | client nonzero/timeout이 mutation 전인지 후인지 이 commit만으로 구분되지 않습니다. command가 write 후 실패 status를 낼 수 있습니다. |
| 이 commit의 보장 | DB application/root credentials를 순서 제어 가능한 primitive로 교체하고 process arguments에 password를 넣지 않습니다. |
| 한계와 다음 관련 commit | WordPress config/users, host files, new/old authentication verification, ambiguous command result compensation은 보장하지 않습니다. `64844c583211`이 positive/negative probes를, `9934b478c79a`가 application-first/root-last ordering을 적용합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: WordPress config/users, host files, new/old authentication verification, ambiguous command result compensation은 보장하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `64844c583211`이 positive/negative probes를, `9934b478c79a`가 application-first/root-last ordering을 적용합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: DB application/root credentials를 순서 제어 가능한 primitive로 교체하고 process arguments에 password를 넣지 않습니다.

### 3. `0aa998fdd344` — feat(secrets): WordPress 설정과 사용자 비밀번호 교체

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `SECRETS`, `RISK`, `INTEGRATION` |
| Source-defined role | Implemented WordPress configuration and user credential changes. |
| 이전 Thread commit | `832d182743ea` |
| 다음 Thread commit | `64844c583211` |

#### 원문이 확정한 범위

- **Summary:** Adds atomic `wp-config.php` DB-password replacement and WordPress administrator/author password changes.
- **Classification reason:** The commit coordinates filesystem configuration and application database state, establishing the WordPress side of the cross-subsystem rotation problem.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `0aa998fdd344`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `tools/rotate_secrets.py`의 `replace_wp_config_password`에서 WordPress DB consumer config를 partial write 없이 갱신합니다.
- `tools/rotate_secrets.py`의 `set_wordpress_user_password`에서 해시를 직접 조작하지 않고 WordPress가 user password state를 소유합니다.
- `tools/rotate_secrets.py`의 `admin/author primitives`에서 두 user 중 일부만 바뀌는 stage를 orchestrator와 tests가 식별할 수 있습니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 0aa998fdd344 | tools/rotate_secrets.py | replace_wp_config_password | private config file이 regular/private이며 DB password define이 정확히 한 번 존재하는지 검사하고 same-filesystem temporary+replace로 값을 교체합니다. | WordPress DB consumer config를 partial write 없이 갱신합니다. |
| 0aa998fdd344 | tools/rotate_secrets.py | set_wordpress_user_password | WordPress runtime에서 application API `wp_set_password`를 호출하는 PHP/WP command에 user/password payload를 stdin으로 전달합니다. | 해시를 직접 조작하지 않고 WordPress가 user password state를 소유합니다. |
| 0aa998fdd344 | tools/rotate_secrets.py | admin/author primitives | admin과 author account를 독립 mutation/verification 대상으로 유지합니다. | 두 user 중 일부만 바뀌는 stage를 orchestrator와 tests가 식별할 수 있습니다. |

#### 비교 기준

- exact commit diff: `git diff 0aa998fdd344^ 0aa998fdd344 -- <path>`
- 이전 Thread 상태와 비교: `git diff 832d182743ea 0aa998fdd344 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | DB account가 바뀌어도 `wp-config.php`와 WordPress admin/author credential이 old generation이면 stack 전체의 logical credential set은 일치하지 않습니다. |
| 선택한 boundary / decision | private config와 두 application users를 WordPress-owned interface와 atomic file replacement를 통해 바꾸는 primitive를 추가했습니다. |
| 핵심 caller/callee 또는 configuration consumer | `tools/rotate_secrets.py`의 `replace_wp_config_password`; `tools/rotate_secrets.py`의 `set_wordpress_user_password`; `tools/rotate_secrets.py`의 `admin/author primitives` |
| state / ownership / lifecycle 변화 | WordPress DB가 user hashes를, private config volume이 DB consumer credential을 소유합니다. helper는 mutation command와 config temp file만 일시 소유합니다. |
| 주요 failure branch | config format/duplicate define, WordPress command timeout/nonzero, temporary publication failure가 발생할 수 있고 command nonzero가 no mutation을 뜻하지는 않습니다. |
| 이 commit의 보장 | WordPress config, admin, author credential을 process argument 노출 없이 별도 단계로 교체할 수 있습니다. |
| 한계와 다음 관련 commit | DB accounts/host files와의 global ordering·rollback·old value rejection은 보장하지 않습니다. `64844c583211`이 actual consumer probes를 만들고 `9934b478c79a`가 전체 ordering에 연결합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: DB accounts/host files와의 global ordering·rollback·old value rejection은 보장하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `64844c583211`이 actual consumer probes를 만들고 `9934b478c79a`가 전체 ordering에 연결합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: WordPress config, admin, author credential을 process argument 노출 없이 별도 단계로 교체할 수 있습니다.

### 4. `64844c583211` — feat(secrets): 신규 자격증명 수용과 기존 값 거부 검증

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `TEST`, `SECRETS`, `RISK` |
| Source-defined role | Required replacement credentials to work and previous values to fail. |
| 이전 Thread commit | `0aa998fdd344` |
| 다음 Thread commit | `c68486d55f30` |

#### 원문이 확정한 범위

- **Summary:** Verifies new credentials work, old credentials fail, configuration matches, and no accepted or rejected value leaks into runtime metadata.
- **Classification reason:** Successful rotation requires both positive and negative authentication evidence; this commit makes that state transition verifiable rather than inferred from command success.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `64844c583211`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `tools/rotate_secrets.py`의 `MariaDB auth probes`에서 command exit status가 아니라 실제 DB consumer interface가 authoritative state를 판단합니다.
- `tools/rotate_secrets.py`의 `WordPress user probes`에서 새 값만 성공하는 one-generation state를 요구합니다.
- `tools/rotate_secrets.py`의 `config/file equality checks`에서 runtime store와 host source의 generation 일치를 함께 봅니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 64844c583211 | tools/rotate_secrets.py | MariaDB auth probes | root/application 각각 new credential로 local/service authentication이 성공하고 old credential은 실패해야 한다고 검사합니다. | command exit status가 아니라 실제 DB consumer interface가 authoritative state를 판단합니다. |
| 64844c583211 | tools/rotate_secrets.py | WordPress user probes | admin/author의 new password가 WordPress authentication API에서 맞고 old password가 틀린지 양방향으로 확인합니다. | 새 값만 성공하는 one-generation state를 요구합니다. |
| 64844c583211 | tools/rotate_secrets.py | config/file equality checks | private config와 active host secret files가 expected generation의 exact values인지 확인합니다. | runtime store와 host source의 generation 일치를 함께 봅니다. |

#### 비교 기준

- exact commit diff: `git diff 64844c583211^ 64844c583211 -- <path>`
- 이전 Thread 상태와 비교: `git diff 0aa998fdd344 64844c583211 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | mutation command가 성공해도 old credential이 alias/다른 account scope로 계속 작동하거나 일부 consumer가 old file을 사용할 수 있었습니다. |
| 선택한 boundary / decision | 각 store를 실제 인증/consumer interface로 positive(new works)와 negative(old fails) 양쪽에서 확인했습니다. |
| 핵심 caller/callee 또는 configuration consumer | `tools/rotate_secrets.py`의 `MariaDB auth probes`; `tools/rotate_secrets.py`의 `WordPress user probes`; `tools/rotate_secrets.py`의 `config/file equality checks` |
| state / ownership / lifecycle 변화 | verification layer가 actual state를 authoritative하게 판정하고 orchestrator는 성공 결정을 내리기 전에 모든 probe를 통과해야 합니다. |
| 주요 failure branch | new failure 또는 old success 하나라도 mixed/ambiguous generation으로 간주해 rotation을 실패시킵니다. |
| 이 commit의 보장 | 성공 판정은 replacement가 작동한다는 것뿐 아니라 previous generation이 거부되고 files/config가 일치한다는 것까지 포함합니다. |
| 한계와 다음 관련 commit | 실패 시 prior state로 되돌리는 compensation은 아직 없습니다. `c68486d55f30`이 이 probes를 rollback 완료 판단에도 사용합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: 실패 시 prior state로 되돌리는 compensation은 아직 없습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `c68486d55f30`이 이 probes를 rollback 완료 판단에도 사용합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: 성공 판정은 replacement가 작동한다는 것뿐 아니라 previous generation이 거부되고 files/config가 일치한다는 것까지 포함합니다.

### 5. `c68486d55f30` — feat(secrets): 회전 실패 시 기존 자격증명 복구

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `SECRETS`, `RECOVERY`, `HARD` |
| Source-defined role | Added cross-store rollback to the prior verified state. |
| 이전 Thread commit | `64844c583211` |
| 다음 Thread commit | `9934b478c79a` |

#### 원문이 확정한 범위

- **Summary:** Adds compensation that restores database accounts, WordPress configuration and users, host files, and a verified running stack after rotation failure.
- **Classification reason:** This is significant multi-store rollback engineering, though the following correction handles additional ambiguous command and signal states not yet covered here.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `c68486d55f30`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `tools/rotate_secrets.py`의 `compensation helpers`에서 partial new generation을 old verified generation으로 수렴시키는 경로가 생깁니다.
- `tools/rotate_secrets.py`의 `rollback verification`에서 rollback command 호출만으로 완료를 간주하지 않습니다.
- `tools/rotate_secrets.py`의 `rollback error aggregation`에서 첫 rollback 오류가 이후 repair 시도를 중단하거나 원인을 덮지 않습니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| c68486d55f30 | tools/rotate_secrets.py | compensation helpers | forward stage별 mutation을 추적하고 failure 뒤 WordPress users/config, MariaDB accounts, host files를 previous values로 되돌리는 reverse operations를 정의합니다. | partial new generation을 old verified generation으로 수렴시키는 경로가 생깁니다. |
| c68486d55f30 | tools/rotate_secrets.py | rollback verification | old values가 다시 작동하고 new values가 거부되며 files/config가 old generation과 같은지 probes로 확인합니다. | rollback command 호출만으로 완료를 간주하지 않습니다. |
| c68486d55f30 | tools/rotate_secrets.py | rollback error aggregation | 여러 compensation 실패를 모아 primary rotation failure와 함께 보고합니다. | 첫 rollback 오류가 이후 repair 시도를 중단하거나 원인을 덮지 않습니다. |

#### 비교 기준

- exact commit diff: `git diff c68486d55f30^ c68486d55f30 -- <path>`
- 이전 Thread 상태와 비교: `git diff 64844c583211 c68486d55f30 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | 일부 store가 new generation으로 바뀐 뒤 다음 step이 실패하면 host files, DB, WordPress가 mixed state에 남았습니다. |
| 선택한 boundary / decision | forward mutation을 추적하고 reverse compensation과 prior-generation verification을 추가했습니다. |
| 핵심 caller/callee 또는 configuration consumer | `tools/rotate_secrets.py`의 `compensation helpers`; `tools/rotate_secrets.py`의 `rollback verification`; `tools/rotate_secrets.py`의 `rollback error aggregation` |
| state / ownership / lifecycle 변화 | orchestrator가 logical generation 전환 책임을 가지며 각 subsystem helper는 reversible mutation만 수행합니다. |
| 주요 failure branch | rollback step 자체가 실패할 수 있으므로 all-or-nothing을 선언하지 않고 incomplete compensation을 명시적으로 보고합니다. |
| 이 commit의 보장 | ordinary failure 뒤 가능한 한 previous verified generation으로 되돌리고 실제 old/new probes로 결과를 판정합니다. |
| 한계와 다음 관련 commit | post-write command failure의 실제 mutation 여부와 rollback 중 signal interruption은 아직 충분히 처리하지 않습니다. `2e6649a7706d`이 ambiguous post-write failure와 rollback-active signal state를 교정합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: post-write command failure의 실제 mutation 여부와 rollback 중 signal interruption은 아직 충분히 처리하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `2e6649a7706d`이 ambiguous post-write failure와 rollback-active signal state를 교정합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: ordinary failure 뒤 가능한 한 previous verified generation으로 되돌리고 실제 old/new probes로 결과를 판정합니다.

### 6. `9934b478c79a` — feat(secrets): 스택 자격증명 회전 절차 연결

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **S** |
| Tags | `SECRETS`, `RECOVERY`, `CORE` |
| Source-defined role | Connected the ordered, locked, verified rotation transaction. |
| 이전 Thread commit | `c68486d55f30` |
| 다음 Thread commit | `2e6649a7706d` |

#### 원문이 확정한 범위

- **Summary:** Coordinates the complete credential rotation sequence, serializes it, recreates services, verifies new values and rejection of old ones, and invokes compensation on failure.
- **Classification reason:** Credential rotation is a defining management mechanism spanning four host files, MariaDB accounts, WordPress users, and application configuration; this commit establishes that transaction.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `9934b478c79a`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `tools/rotate_secrets.py`의 `rotate / project_operation_lock`에서 startup/backup/restore와 rotation이 같은 serialization domain을 공유합니다.
- `tools/rotate_secrets.py`의 `forward order`에서 repair에 필요한 privileged/current path를 너무 일찍 끊지 않도록 root와 host publication을 뒤에 둡니다.
- `tools/rotate_secrets.py`의 `force recreate / end verification`에서 새 process가 new generation을 실제로 소비하는지 검증합니다.
- `tools/rotate_secrets.py`의 `compensating failure path`에서 multi-store transition의 실패 endpoint를 정의합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 9934b478c79a | tools/rotate_secrets.py | rotate / project_operation_lock | replacement/active secrets와 current runtime state를 검증하고 project lock을 잡은 채 전체 transition을 실행합니다. | startup/backup/restore와 rotation이 같은 serialization domain을 공유합니다. |
| 9934b478c79a | tools/rotate_secrets.py | forward order | public request를 닫기 위해 Nginx를 멈춘 뒤 WordPress users와 private config, MariaDB application password, MariaDB root password, host files 순으로 전환합니다. | repair에 필요한 privileged/current path를 너무 일찍 끊지 않도록 root와 host publication을 뒤에 둡니다. |
| 9934b478c79a | tools/rotate_secrets.py | force recreate / end verification | active files 게시 뒤 services를 force-recreate하고 new works/old fails/files match/runtime boundary/no leak를 확인합니다. | 새 process가 new generation을 실제로 소비하는지 검증합니다. |
| 9934b478c79a | tools/rotate_secrets.py | compensating failure path | 어느 stage 실패든 previous generation compensation과 service recovery를 시도하고 incomplete rollback을 surfaced합니다. | multi-store transition의 실패 endpoint를 정의합니다. |

#### 비교 기준

- exact commit diff: `git diff 9934b478c79a^ 9934b478c79a -- <path>`
- 이전 Thread 상태와 비교: `git diff c68486d55f30 9934b478c79a -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### S-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 이 commit 직전 상태 | 개별 host/DB/WordPress primitives가 있어도 caller별 ordering이 다르면 root access가 먼저 끊기거나 public requests가 mixed generation을 관측할 수 있었습니다. |
| 해결하려던 문제 | stage failure는 compensation으로 이동합니다. 그러나 subprocess가 state를 바꾼 뒤 nonzero를 반환하면 tracked stage만으로 actual mutation을 놓칠 수 있고 signal이 rollback을 중단할 수 있습니다. |
| 기존 설계가 충분하지 않았던 이유 | 개별 host/DB/WordPress primitives가 있어도 caller별 ordering이 다르면 root access가 먼저 끊기거나 public requests가 mixed generation을 관측할 수 있었습니다. stage failure는 compensation으로 이동합니다. 그러나 subprocess가 state를 바꾼 뒤 nonzero를 반환하면 tracked stage만으로 actual mutation을 놓칠 수 있고 signal이 rollback을 중단할 수 있습니다. |
| 핵심 결정 | same-project lock, pre-verification, Nginx quiescence, repair-friendly forward order, host publication, recreate, global probes, compensation을 하나의 procedure로 고정했습니다. |
| 주요 caller → callee / producer → consumer | `tools/rotate_secrets.py`의 `rotate / project_operation_lock`; `tools/rotate_secrets.py`의 `forward order`; `tools/rotate_secrets.py`의 `force recreate / end verification`; `tools/rotate_secrets.py`의 `compensating failure path` |
| authoritative state와 publication boundary | rotation orchestrator가 logical credential generation과 service lifecycle을 소유합니다. 각 store는 자신의 representation을 소유하되 transaction success/failure 판정은 orchestrator가 합니다. ordinary 성공 path에서 네 host files, 두 DB accounts, 두 WP users, private config가 한 new generation으로 전환되고 services가 이를 소비하며 old values가 거부됩니다. |
| ownership / lifetime / responsibility 변화 | rotation orchestrator가 logical credential generation과 service lifecycle을 소유합니다. 각 store는 자신의 representation을 소유하되 transaction success/failure 판정은 orchestrator가 합니다. |
| failure scenario와 recovery path | stage failure는 compensation으로 이동합니다. 그러나 subprocess가 state를 바꾼 뒤 nonzero를 반환하면 tracked stage만으로 actual mutation을 놓칠 수 있고 signal이 rollback을 중단할 수 있습니다. |
| 이 commit이 보장하는 것 | ordinary 성공 path에서 네 host files, 두 DB accounts, 두 WP users, private config가 한 new generation으로 전환되고 services가 이를 소비하며 old values가 거부됩니다. |
| 아직 보장하지 않는 것 | distributed stores 전체의 진정한 atomic commit은 아니며 ambiguous write/result와 rollback-interruption 위험이 남습니다. |
| 후속 fix / test와 연결 | `2e6649a7706d`이 이 두 핵심 failure assumption을 수정하고 `0da35c72add5`가 stage matrix/double signal/retry를 검증합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: distributed stores 전체의 진정한 atomic commit은 아니며 ambiguous write/result와 rollback-interruption 위험이 남습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `2e6649a7706d`이 이 두 핵심 failure assumption을 수정하고 `0da35c72add5`가 stage matrix/double signal/retry를 검증합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: ordinary 성공 path에서 네 host files, 두 DB accounts, 두 WP users, private config가 한 new generation으로 전환되고 services가 이를 소비하며 old values가 거부됩니다.

### 7. `2e6649a7706d` — fix(secrets): 회전 중단과 불명확한 상태를 보상

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **S** |
| Tags | `SECRETS`, `RECOVERY`, `HARD` |
| Source-defined role | Compensated ambiguous post-write failures and deferred signals during rollback. |
| 이전 Thread commit | `9934b478c79a` |
| 다음 Thread commit | `0da35c72add5` |

#### 원문이 확정한 범위

- **Summary:** Adds stage-level failure injection, interruption handling, ambiguous post-write compensation, and deferred signals during rollback.
- **Classification reason:** This corrects non-obvious partial-state hazards in the rotation transaction. It is essential to explaining how the project prevents operator cancellation or uncertain command outcomes from interrupting recovery itself.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `2e6649a7706d`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `tools/rotate_secrets.py`의 `post-write failure hooks`에서 “nonzero/exception이면 mutation 없음”이라는 잘못된 가정을 노출합니다.
- `tools/rotate_secrets.py`의 `actual-state probes before compensation`에서 보상 대상을 observed state에서 계산합니다.
- `tools/rotate_secrets.py`의 `rotation signal state machine`에서 recovery 자체가 두 번째 operator signal로 끊기는 것을 막습니다.
- `tools/rotate_secrets.py`의 `deferred signal/result reporting`에서 복구 완료와 process exit semantics를 분리합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 2e6649a7706d | tools/rotate_secrets.py | post-write failure hooks | 각 persistent mutation 직후 test hook이 failure를 발생시켜 command가 state를 바꿨지만 caller가 failure를 받은 상황을 재현합니다. | “nonzero/exception이면 mutation 없음”이라는 잘못된 가정을 노출합니다. |
| 2e6649a7706d | tools/rotate_secrets.py | actual-state probes before compensation | tracked stage가 아니라 DB/WP authentication, config/file values를 다시 probe해 old/new/ambiguous actual state를 판정합니다. | 보상 대상을 observed state에서 계산합니다. |
| 2e6649a7706d | tools/rotate_secrets.py | rotation signal state machine | 첫 SIGINT/SIGTERM은 forward transition을 중단시키지만 rollback-active가 된 뒤 추가 termination signal은 기록만 하고 compensation 완료까지 즉시 종료하지 않습니다. | recovery 자체가 두 번째 operator signal로 끊기는 것을 막습니다. |
| 2e6649a7706d | tools/rotate_secrets.py | deferred signal/result reporting | rollback verification을 끝낸 뒤 pending signal과 primary/rollback errors를 정해진 precedence로 보고합니다. | 복구 완료와 process exit semantics를 분리합니다. |

#### 비교 기준

- exact commit diff: `git diff 2e6649a7706d^ 2e6649a7706d -- <path>`
- 이전 Thread 상태와 비교: `git diff 9934b478c79a 2e6649a7706d -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### Fix chain 기록

| 단계 | 학습자 기록 |
| --- | --- |
| 기존 가정 | subprocess/step failure는 해당 persistent mutation이 일어나지 않았다고 가정했습니다. |
| 실제 failure 또는 위험 | store write 후 timeout/nonzero/exception이 가능해 tracked state와 actual credential generation이 다를 수 있고 rollback 중 signal이 복구를 끊을 수 있었습니다. |
| root cause | exit status 중심 stage tracking과 forward/rollback을 구분하지 않는 signal handling이 root cause였습니다. |
| 수정된 invariant / decision | actual authentication/file probes로 state를 재구성하고 rollback-active 동안 추가 signal을 defer한 뒤 prior generation을 보상합니다. |
| 실제 수정 코드 | `tools/rotate_secrets.py`의 `post-write failure hooks`; `tools/rotate_secrets.py`의 `actual-state probes before compensation`; `tools/rotate_secrets.py`의 `rotation signal state machine`; `tools/rotate_secrets.py`의 `deferred signal/result reporting` |
| 변경된 ordering / ownership / lifecycle | orchestrator가 forward/rollback/pending-signal state를 소유합니다. subsystem command result가 아니라 authoritative probes가 compensation order를 결정합니다. |
| 이 fix가 보장하는 것 | command exit와 actual mutation이 어긋나도 observed state에 맞춰 prior generation을 복구하며, recovery 중 추가 termination이 compensation을 중단하지 않습니다. |
| 아직 보장하지 않는 것 | process SIGKILL, host power loss, rollback primitive 자체가 모두 실패하는 경우 prior generation을 반드시 복원한다고 보장하지 않습니다. |
| 연결되는 regression test | post-write failure matrix와 double-signal runtime scenario가 corrected invariant와 retry 가능성을 고정합니다. `0da35c72add5`이 every-persistent-stage post-write failure와 SIGTERM→rollback-active SIGINT, retry를 live runtime에서 검증합니다. |

#### S-level state transition 기록

| 단계 | 학습자 기록 |
| --- | --- |
| correction 전 authoritative state | `9934b478c79a`는 command failure를 no mutation으로 해석할 수 있었고 첫 signal 뒤 rollback 중 추가 signal이 process를 끝내 mixed state를 고착시킬 수 있었습니다. |
| partial / ambiguous state 종류 | store write 후 timeout/nonzero/exception이 가능해 tracked state와 actual credential generation이 다를 수 있고 rollback 중 signal이 복구를 끊을 수 있었습니다. |
| publication 또는 commit boundary | 각 write 뒤 ambiguity를 failure injection으로 모델링하고 actual consumer probes로 state를 탐색하며 rollback-active 동안 signal을 지연하는 state machine을 도입했습니다. |
| rollback / compensation 진입 조건 | post-write exception, first signal, rollback step failure, rollback-active second signal을 모두 compensation/error aggregation 경로로 보냅니다. incomplete recovery는 성공으로 숨기지 않습니다. |
| recovery 중 보호되는 invariant | orchestrator가 forward/rollback/pending-signal state를 소유합니다. subsystem command result가 아니라 authoritative probes가 compensation order를 결정합니다. |
| 성공 endpoint | command exit와 actual mutation이 어긋나도 observed state에 맞춰 prior generation을 복구하며, recovery 중 추가 termination이 compensation을 중단하지 않습니다. |
| 실패 endpoint | process SIGKILL, host power loss, rollback primitive 자체가 모두 실패하는 경우 prior generation을 반드시 복원한다고 보장하지 않습니다. |
| 후속 regression evidence | `0da35c72add5`이 every-persistent-stage post-write failure와 SIGTERM→rollback-active SIGINT, retry를 live runtime에서 검증합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: process SIGKILL, host power loss, rollback primitive 자체가 모두 실패하는 경우 prior generation을 반드시 복원한다고 보장하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `0da35c72add5`이 every-persistent-stage post-write failure와 SIGTERM→rollback-active SIGINT, retry를 live runtime에서 검증합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: command exit와 actual mutation이 어긋나도 observed state에 맞춰 prior generation을 복구하며, recovery 중 추가 termination이 compensation을 중단하지 않습니다.

### 8. `0da35c72add5` — test(secrets): 회전 롤백과 재시도 검증

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `TEST`, `SECRETS`, `RECOVERY` |
| Source-defined role | Exercised successful rotation, injected failures, interruption, rollback, leak checks, and retry. |
| 이전 Thread commit | `2e6649a7706d` |
| 다음 Thread commit | `2557079c2d19` |

#### 원문이 확정한 범위

- **Summary:** Exercises successful rotation, multiple post-write failures, signal interruption during host-file publication, rollback, leak checks, and retry with the same inputs.
- **Classification reason:** The scenario provides strong real-system evidence for one of the project's hardest state transitions and protects against regressions in compensation ordering.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `0da35c72add5`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `tests/runtime_stack.py`의 `rotation success scenario`에서 complete forward path를 실제 consumer interface로 검증합니다.
- `tests/runtime_stack.py`의 `failure-stage matrix`에서 ambiguous state compensation coverage를 만듭니다.
- `tests/runtime_stack.py`의 `double-signal scenario`에서 rollback signal deferral의 실제 process behavior를 검증합니다.
- `tests/runtime_stack.py`의 `retry/leak assertions`에서 복구가 단순 old state가 아니라 재시도 가능한 clean state임을 확인합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 0da35c72add5 | tests/runtime_stack.py | rotation success scenario | replacement generation을 만든 뒤 CLI로 rotation하고 DB root/app, WP admin/author의 new success/old failure, config/files, service health를 확인합니다. | complete forward path를 실제 consumer interface로 검증합니다. |
| 0da35c72add5 | tests/runtime_stack.py | failure-stage matrix | 각 host/DB/WP persistent publication 전후, 특히 post-write failure hook에서 exception을 주입하고 prior generation 복구를 검사합니다. | ambiguous state compensation coverage를 만듭니다. |
| 0da35c72add5 | tests/runtime_stack.py | double-signal scenario | SIGTERM으로 forward를 중단하고 rollback-active ready marker 뒤 SIGINT를 추가로 보내 compensation이 계속되는지 확인합니다. | rollback signal deferral의 실제 process behavior를 검증합니다. |
| 0da35c72add5 | tests/runtime_stack.py | retry/leak assertions | 실패/rollback 뒤 같은 replacement로 다시 rotation해 성공하고 temp files, secret args/env/log leaks, Docker resources가 없는지 검사합니다. | 복구가 단순 old state가 아니라 재시도 가능한 clean state임을 확인합니다. |

#### 비교 기준

- exact commit diff: `git diff 0da35c72add5^ 0da35c72add5 -- <path>`
- 이전 Thread 상태와 비교: `git diff 2e6649a7706d 0da35c72add5 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### 테스트 학습 기록

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariant | rotation은 success 시 new-only generation, failure/signal 시 verified old generation 또는 explicit incomplete rollback로 끝나며 retry 가능합니다. |
| 재현하는 failure / boundary | 각 persistent write의 pre/post failure, post-write ambiguity, SIGTERM과 rollback-active SIGINT입니다. |
| test technique | live integration + deterministic failure-stage hooks + double-signal synchronization |
| fixture와 failure injection | old/new 네-file generations와 healthy stack을 만들고 production rotation에 named failure/pause hooks를 전달합니다. |
| 실제 통과하는 production path | lock→quiesce→WP/config/DB/files publication→recreate/probes 또는 actual-state compensation→retry를 통과합니다. |
| 핵심 assertion | new works/old fails 또는 old works/new fails, files/config 일치, service health, no temp/argv/env/log secret, retry success를 확인합니다. |
| 이 테스트가 증명하는 것 | multi-store compensation과 rollback signal deferral이 실제 consumer state에서 작동함을 증명합니다. |
| 이 테스트가 증명하지 않는 것 | SIGKILL/power loss와 모든 external mutation은 증명하지 않습니다. |
| 성격 | deterministic distributed-transaction regression |
| 막는 후속 regression | partial generation, command-status-only rollback, rollback 중 second signal abort, stale temp/leak, non-retryable state를 막습니다. |
| 직접 실행 command와 결과 | 실행하지 않았습니다. 현재 환경에는 Docker와 로컬 repository checkout이 없습니다. 해당 SHA의 test code와 command wiring만 검사했습니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: SIGKILL·hardware loss·모든 DB/WordPress internal failure를 포괄하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `2557079c2d19`이 test code 자체가 obsolete runtime secret mount를 허용해 property를 약화하지 못하도록 static guard를 추가합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: ordinary/post-write/signal failures가 prior verified generation으로 보상되고 clean retry가 가능하며 success는 new-only generation으로 끝남을 증명합니다.

### 9. `2557079c2d19` — test(secrets): 회전 후 런타임 비밀 경계 고정

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **B** |
| Tags | `TEST`, `SECRETS` |
| Source-defined role | Prevented tests from weakening the steady-state secret boundary. |
| 이전 Thread commit | `0da35c72add5` |
| 다음 Thread commit | 없음 |

#### 원문이 확정한 범위

- **Summary:** Statically forbids rotation tests from depending on obsolete runtime secret mounts and requires post-rotation cleanup checks.
- **Classification reason:** It preserves the intended secret architecture, but the change is a focused regression guard rather than a new security mechanism.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `2557079c2d19`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `tests/validate_stack.py`의 `forbidden `/run/secrets` assumptions`에서 test 편의를 위해 production invariant를 약화하는 회귀를 막습니다.
- `tests/validate_stack.py`의 `post-rotation boundary requirements`에서 성공/rollback 후에도 bootstrap-only secret boundary가 유지됩니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 2557079c2d19 | tests/validate_stack.py | forbidden `/run/secrets` assumptions | rotation/runtime test source에서 mounted secret comparison helper와 obsolete `/run/secrets` path pattern을 거부합니다. | test 편의를 위해 production invariant를 약화하는 회귀를 막습니다. |
| 2557079c2d19 | tests/validate_stack.py | post-rotation boundary requirements | rotation scenario가 full runtime secret env/mount absence를 다시 검사하고 private config temp cleanup을 요구하는지 확인합니다. | 성공/rollback 후에도 bootstrap-only secret boundary가 유지됩니다. |

#### 비교 기준

- exact commit diff: `git diff 2557079c2d19^ 2557079c2d19 -- <path>`
- 이전 Thread 상태와 비교: `git diff 0da35c72add5 2557079c2d19 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### 테스트 학습 기록

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariant | rotation 이후에도 long-running services는 secret mount/password environment를 보유하지 않고 temp credential files가 남지 않습니다. |
| 재현하는 failure / boundary | test code가 obsolete `/run/secrets` helper를 사용해 weaker architecture를 암묵적으로 허용하는 경계입니다. |
| test technique | static source contract |
| fixture와 failure injection | tests와 production source의 forbidden/required patterns가 fixture입니다. |
| 실제 통과하는 production path | `tests/validate_stack.py`가 rotation/runtime test source와 Compose blocks를 읽습니다. |
| 핵심 assertion | 금지 mounted-secret pattern 부재, full post-rotation boundary assertion과 temp cleanup pattern 존재를 확인합니다. |
| 이 테스트가 증명하는 것 | verification code가 production secret boundary를 약화하지 않음을 증명합니다. |
| 이 테스트가 증명하지 않는 것 | 실제 container inspect, authentication, signal timing은 증명하지 않습니다. |
| 성격 | static architecture guard |
| 막는 후속 regression | test-only runtime secret mount, incomplete post-rotation inspect, config temp leak assertion 제거를 막습니다. |
| 직접 실행 command와 결과 | 실행하지 않았습니다. 현재 환경에는 Docker와 로컬 repository checkout이 없습니다. 해당 SHA의 test code와 command wiring만 검사했습니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: runtime authentication/rollback correctness를 직접 실행해 증명하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: Thread 2의 secret-free runtime invariant를 credential rotation 이후에도 source contract로 연결합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: test suite 자체가 steady-state secret mount를 재도입하거나 production보다 약한 test fixture를 사용하지 않게 합니다.

## Invariant ledger

| Source에서 연결된 invariant | 처음/초기 단계 | 강화·교정 단계 | 검증 단계 | 학습자가 확인한 실제 근거 |
| --- | --- | --- | --- | --- |
| replacement 및 active secret files는 private regular single-link input이며 individual publication은 atomic/durable합니다. | a2d20b8c2c03 | 9934b478c79a | 0da35c72add5 | descriptor validation과 same-directory fsync/replace, temp/leak runtime assertions이 연결됩니다. |
| rotation 성공 시 모든 replacement credential은 작동하고 모든 previous credential은 거부됩니다. | 64844c583211 | 9934b478c79a | 0da35c72add5 | DB/WP positive+negative probes와 files/config exact generation 검사가 success endpoint입니다. |
| rotation 실패 시 verified prior generation으로 compensation하거나 incomplete rollback을 명시적으로 보고합니다. | c68486d55f30 | 2e6649a7706d에서 ambiguous state/signal 보강 | 0da35c72add5 | actual-state probes, reverse compensation, error aggregation과 stage matrix가 연결됩니다. |
| rollback 활성화 뒤 추가 termination signal은 recovery를 중단하지 않습니다. | 2e6649a7706d | 2e6649a7706d | 0da35c72add5 | rollback-active state가 second signal을 defer하고 double-signal scenario가 completion을 확인합니다. |
| 회전 뒤에도 long-running runtime secret exposure boundary가 유지됩니다. | 기존 bootstrap architecture | 2557079c2d19 static guard | 0da35c72add5 | runtime inspect와 obsolete test-pattern ban이 success/rollback 후에도 secret-free serving을 요구합니다. |

### Ledger 보완 기록

- source에 명시되지 않은 새 invariant를 확정 사실로 추가하지 않습니다.
- invariant가 실제로 부족했음을 드러낸 commit 또는 failure stage: 개별 command의 nonzero를 no mutation으로 해석하고 ordinary exception만 rollback하면 post-write failure와 signal이 mixed credential generation을 남길 수 있었습니다.
- marker, rename, lock, health, authentication, cleanup 등 invariant를 고정하는 concrete mechanism: project lock, Nginx quiescence, application-first/root-last ordering, actual positive/negative probes, reverse compensation과 rollback-active signal deferral이 transition endpoint를 고정합니다.
- 후속 commit이 invariant를 약화하지 못하게 하는 regression evidence: `0da35c72add5`의 per-stage/post-write/double-signal/retry matrix와 `2557079c2d19` secret-boundary static guard가 regression을 막습니다.
## Failure → Fix → Test 연결

| failure / 위험 | fix 또는 mechanism | test / evidence | 학습자 연결 기록 |
| --- | --- | --- | --- |
| DB/WordPress/host files 중 일부만 new generation | 9934b478c79a ordered locked transaction + c68486d55f30 compensation | 0da35c72add5 publication-stage failure matrix | per-store atomicity를 global atomicity로 과장하지 않고 observed state를 보상합니다. |
| subprocess가 write 후 nonzero를 반환해 state ambiguous | 2e6649a7706d actual probes와 post-write compensation | post-write failure injection scenarios | exit code 대신 actual authentication/file behavior가 authoritative합니다. |
| operator signal이 host files 교체 뒤 또는 rollback 중 도착 | 2e6649a7706d first signal failure conversion + rollback signal defer | 0da35c72add5 SIGTERM 후 rollback-active SIGINT | recovery를 완료한 뒤 pending termination을 처리합니다. |
| 새 값은 작동하지만 old 값도 인증됨 | 64844c583211 positive+negative verification | 0da35c72add5 end-to-end authentication | success는 new acceptance뿐 아니라 old revocation까지 포함합니다. |
| test가 obsolete `/run/secrets`를 허용 | 2557079c2d19 static guard | static validator assertions | test convenience가 production boundary를 바꾸지 못하게 합니다. |

### 직접 재구성할 chain

```text
기존 가정: 각 mutation command의 exit status가 실제 credential state를 정확히 나타내고 signal은 일반 예외와 같다는 가정
  → 실제 failure 또는 위험: write 뒤 nonzero 또는 host-file publication 중 signal이 일부 stores만 new generation으로 남길 수 있었고 rollback 중 추가 signal이 복구 자체를 끊을 수 있었습니다.
  → root cause: credential state가 네 host files, DB accounts, WordPress users와 private config에 분산되어 command status만으로 authoritative state를 알 수 없습니다.
  → 수정된 invariant / decision: 각 write 뒤 actual authentication/file probes로 state를 재구성하고 reverse compensation 동안 추가 termination을 지연합니다.
  → 해당 SHA의 실제 수정 코드: `2e6649a7706d`의 post-write hooks, probe-driven compensation와 rollback signal state
  → failure injection 또는 regression test: `0da35c72add5` successful/failure/signal/retry scenarios
  → 증명된 보장 / 남은 비보장: success는 new works/old fails, failure는 verified old generation 또는 explicit incomplete rollback이며 SIGKILL/power loss의 모든 시점은 보장하지 않습니다.
```

## Ownership / state / responsibility 변화

| 대상 | 이전 상태 | 이후 책임/authoritative state | 확인할 근거 | 학습자 결론 |
| --- | --- | --- | --- | --- |
| Host secret files | old generation 개별 files | same-directory atomic replacement와 parent sync | a2d20b8c2c03 | 개별 file은 atomic하지만 네 files 전체는 orchestrator가 순서를 관리합니다. |
| MariaDB accounts | root/application current passwords | local-socket mutation; application 먼저, root 마지막 | 832d182743ea + 9934b478c79a order | root repair path를 forward 후반까지 유지합니다. |
| WordPress users | WordPress DB의 hashed passwords | `wp_set_password` application-owned mutation | 0aa998fdd344 | admin/author를 별도 stages로 추적합니다. |
| Private wp-config.php | DB credential consumer | exact define를 same-filesystem rename으로 교체 | 0aa998fdd344 | web tree가 아닌 private config volume이 authority입니다. |
| Rotation orchestrator | 개별 helper 결과 의존 | actual probes와 project lock으로 generation 전환/보상 소유 | 9934b478c79a, 2e6649a7706d | distributed stores의 success/failure endpoint를 판정합니다. |

## Thread 최종 상태

- **Source-confirmed endpoint:** Credentials are represented in four host files, two MariaDB accounts, two WordPress users, and WordPress configuration. The thread therefore evolves from individual mutation primitives to a verified state transition and then to compensation for commands that may change state before failing. Deferring further termination while rollback is active is the key correction that prevents recovery itself from being interrupted.
- 최종 authoritative state와 owner: 성공 시 네 host files, DB root/app accounts, WP admin/author users, private config가 같은 new generation을 소유하고 old generation은 거부됩니다.
- 정상 실행의 entry point와 완료 조건: project lock 아래 pre-verification, Nginx quiesce, ordered mutations, host publication, force-recreate, new/old probes가 모두 성공하면 완료입니다.
- failure 또는 interruption 뒤 retry/rollback/compensation 조건: failure/first signal 시 actual state를 probe해 old generation으로 reverse compensation하고, rollback 중 추가 signal은 완료까지 지연합니다. incomplete rollback은 명시적 failure입니다.
- 이 Thread가 다른 Thread에 제공하는 전제: Thread 2의 secret-free runtime과 Thread 8의 operations/diagnostics가 credential generation 변화 뒤에도 유지될 전제를 제공합니다.
- 이 Thread 단독으로는 증명하지 않는 것: 여러 stores를 한 storage transaction처럼 원자 commit하거나 SIGKILL/power loss에서 반드시 복구한다고 보장하지 않습니다.

## 최종 architecture 또는 execution flow 정리

| 단계 | 확인할 흐름 | 실제 코드 근거 | 정상 전이 | 실패·정리·재시도 |
| --- | --- | --- | --- | --- |
| 1 | replacement/current 검증 | a2d20b8c2c03 readers | 네 old/new files를 private stable input으로 읽습니다. | unsafe file/content면 mutation 전 실패합니다. |
| 2 | lock/old-state probes | 9934b478c79a rotate | same-project lock과 current generation/runtime boundary를 확인합니다. | mixed pre-state면 rotation을 시작하지 않습니다. |
| 3 | public path quiesce | 9934b478c79a Nginx stop | 외부 request가 transition 중 mixed generation을 관측하지 않게 합니다. | stop failure면 forward mutation 전에 compensation/recovery로 갑니다. |
| 4 | WP/config 변경 | 0aa998fdd344 primitives | admin/author와 private config를 new values로 바꿉니다. | post-write failure는 actual probes 대상입니다. |
| 5 | DB app/root 변경 | 832d182743ea + ordered orchestrator | application password 후 root password를 바꿉니다. | root는 repair capability 때문에 forward 후반에 변경됩니다. |
| 6 | host files/recreate | a2d20b8c2c03 publication + 9934b478c79a recreate | active source files를 new generation으로 게시하고 services를 새로 띄웁니다. | publication/recreate failure는 observed state compensation으로 갑니다. |
| 7 | global verification | 64844c583211 probes | new works, old fails, files/config match, runtime no-secret를 확인합니다. | 하나라도 어긋나면 success로 확정하지 않습니다. |
| 8 | compensation/signal defer | 2e6649a7706d | actual state를 탐색해 old generation으로 되돌리고 rollback-active signal을 지연합니다. | 복구 불완전과 pending signal을 모두 최종 result에 보존합니다. |

### 학습자의 최종 설명

> credential generation은 한 DB row가 아니라 네 host files, MariaDB 두 accounts, WordPress 두 users, private config에 분산됩니다. 각 file과 subsystem primitive는 개별적으로 안전하지만 전체는 atomic transaction이 아닙니다. orchestrator는 project lock과 Nginx quiescence 아래 WordPress users/config, DB application, DB root, host files 순으로 전환하고 services를 recreate한 뒤 new success와 old rejection을 모두 확인합니다. 초기 compensation은 command failure를 no mutation으로 볼 위험이 있었으나 `2e6649a7706d`에서 각 write 뒤 actual probes로 state를 재구성하고 rollback 중 추가 signal을 defer하도록 수정됐습니다. 따라서 success는 new-only generation, failure는 verified old generation 또는 명시적 incomplete rollback이라는 endpoint로 관리됩니다.

## 학습 완료 자가 점검

- [x] rotation을 하나의 DB transaction처럼 원자적이라고 표현하지 않았습니까?
- [x] subprocess exit code만으로 state mutation 여부를 결정하지 않았습니까?
- [x] root credential을 너무 일찍 바꿔 후속 repair path를 끊는 ordering을 놓치지 않았습니까?
- [x] rollback 중 두 번째 signal이 즉시 종료시킨다고 잘못 설명하지 않았습니까?
- [x] 새 값 성공과 옛 값 거부를 모두 실제 consumer interface로 확인했습니까?
- [x] 모든 code snippet에 SHA와 path/symbol을 기록했습니다.
- [x] final HEAD의 field/helper/test를 이전 SHA에 소급하지 않았습니다.
- [x] source가 확정하지 않은 사실을 추정으로 채우지 않았습니다.
- [x] test가 증명하는 것과 증명하지 않는 것을 구분했습니다.
- [x] 이 Thread를 commit 순서대로 구두 설명할 수 있습니다.
