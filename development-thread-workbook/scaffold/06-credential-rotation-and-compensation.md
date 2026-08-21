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

- incoming replacement secret와 active secret file open helper에서 no-follow, regular, single-link, `0600`, owner, bounded one-line/password-shape checks를 확인합니다.
- same-directory temporary file을 private mode로 만든 뒤 write/flush/fsync/replace/parent sync하는 publication helper를 추적합니다.
- temporary file cleanup이 write, sync, replace failure 각각에서 어떻게 수행되는지 확인합니다.
- per-file atomicity가 four-file global transaction을 제공하지 않는다는 boundary를 caller 관점에서 기록합니다.

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

- MariaDB local-socket authenticated session command에서 root password와 SQL program이 stdin으로 전달되는 protocol을 확인합니다.
- container 내부 private temporary option file creation/removal trap과 credential가 argv/env에 없는지 확인합니다.
- SQL literal escaping과 `NO_BACKSLASH_ESCAPES` 적용 위치를 찾습니다.
- application credential mutation이 root credential mutation보다 앞서는 exact statement order를 기록합니다.
- writes 뒤 강제 SQL error를 만드는 hook이 nonzero-after-mutation ambiguity를 어떻게 재현하는지 확인합니다.

#### 비교 기준

- exact commit diff: `git diff 832d182743ea^ 832d182743ea -- <path>`
- 이전 Thread 상태와 비교: `git diff a2d20b8c2c03 832d182743ea -- <path>`
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

- WordPress admin/author password가 `wp_set_password`를 통해 바뀌는 PHP/WP execution path를 확인합니다.
- private `wp-config.php` target의 regular-file check, exactly one `DB_PASSWORD` definition replacement를 찾습니다.
- same-filesystem temporary file, owner/mode preservation, sync, rename publication 순서를 추적합니다.
- JSON replacement payload가 stdin으로 전달되고 process arguments에 secret가 없는지 확인합니다.
- steady-state container가 사용할 수 없는 경우 one-off WordPress container로 repair 가능한 caller path와 post-write failure hook을 기록합니다.

#### 비교 기준

- exact commit diff: `git diff 0aa998fdd344^ 0aa998fdd344 -- <path>`
- 이전 Thread 상태와 비교: `git diff 832d182743ea 0aa998fdd344 -- <path>`
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

- expected application DB credential, WordPress admin/author credential, private config DB password를 각 consumer interface로 검증하는 probes를 찾습니다.
- prior credential set이 주어졌을 때 old DB/WordPress credentials가 모두 실패해야 하는 negative assertions를 확인합니다.
- candidate root password를 중복 mutation 없이 probe해 현재 authoritative root generation을 찾는 helper를 추적합니다.
- new success만 확인했을 때 놓칠 duplicate account/stale hash/partial `ALTER USER` scenario를 작성합니다.

#### 비교 기준

- exact commit diff: `git diff 64844c583211^ 64844c583211 -- <path>`
- 이전 Thread 상태와 비교: `git diff 0aa998fdd344 64844c583211 -- <path>`
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

- compensation entry에서 MariaDB를 recreate 없이 available하게 만들고 현재 작동하는 root credential을 탐색하는 순서를 확인합니다.
- application DB credential → private config → WordPress users → root credential → host files 복구 ordering을 실제 call graph로 만듭니다.
- intermediate repair error를 accumulate하면서 remaining repairs를 계속하는 control flow를 추적합니다.
- force-recreate 후 old works/new fails/runtime boundary/host files를 모두 재검증해야 rollback complete가 되는 condition을 확인합니다.
- attempted rollback과 verified rollback의 차이를 error/result type으로 기록합니다.

#### 비교 기준

- exact commit diff: `git diff c68486d55f30^ c68486d55f30 -- <path>`
- 이전 Thread 상태와 비교: `git diff 64844c583211 c68486d55f30 -- <path>`
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

- `_rotate` 또는 complete workflow에서 네 distinct active paths, replacement directory owner/mode, unchanged-value rejection, account identity validation을 확인합니다.
- old state verification → Nginx stop → WP users/config → MariaDB app/root → host files → force-recreate → final verification 순서를 추적합니다.
- project operation lock이 validation/mutation/compensation 중 어느 scope를 감싸는지 확인합니다.
- 각 단계에서 어떤 credential generation이 어느 consumer/store에 active한지 state-transition table을 작성합니다.
- exception 시 compensation을 호출하고 verified prior state 또는 uncertain outcome을 report하는 branch를 확인합니다.
- success 조건에 new works, old fails, host files match, runtime secret boundary가 모두 포함되는지 기록합니다.

#### 비교 기준

- exact commit diff: `git diff 9934b478c79a^ 9934b478c79a -- <path>`
- 이전 Thread 상태와 비교: `git diff c68486d55f30 9934b478c79a -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| `[학습자 작성]` | `[학습자 작성]` | `[학습자 작성]` | `[학습자 삽입]` | `[학습자 작성]` |

#### S-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 이 commit 직전 상태 | `[학습자 작성]` |
| 해결하려던 문제 | `[학습자 작성]` |
| 기존 설계가 충분하지 않았던 이유 | `[학습자 작성]` |
| 핵심 결정 | `[학습자 작성]` |
| 주요 caller → callee / producer → consumer | `[학습자 작성]` |
| authoritative state와 publication boundary | `[학습자 작성]` |
| ownership / lifetime / responsibility 변화 | `[학습자 작성]` |
| failure scenario와 recovery path | `[학습자 작성]` |
| 이 commit이 보장하는 것 | `[학습자 작성]` |
| 아직 보장하지 않는 것 | `[학습자 작성]` |
| 후속 fix / test와 연결 | `[학습자 작성]` |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: `[학습자 작성]`
- 다음 관련 commit이 바꾸거나 검증하는 지점: `[학습자 작성]`
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: `[학습자 작성]`

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

- WordPress users, config, DB application/root, 각 host-file publication, service recreation 전후 failure injection stage를 전부 나열합니다.
- host files publication 후 synchronized pause marker와 signal handling state transition을 추적합니다.
- `rollback_active` 또는 동등 상태가 first `SIGINT`/`SIGTERM`을 compensation 진입으로 바꾸고 추가 signal을 defer하는 branch를 확인합니다.
- post-write failure에서 exit status가 아닌 behavior probes로 current root/credential state를 판정하는 caller path를 찾습니다.
- intermediate compensation errors가 있어도 final old-state verification이 성공하면 complete로 판단하는 조건과 반대 조건을 비교합니다.
- 기존 rotation commit의 가정 → 실제 ambiguous failure → root cause → corrected invariant → regression hooks를 하나의 chain으로 작성합니다.

#### 비교 기준

- exact commit diff: `git diff 2e6649a7706d^ 2e6649a7706d -- <path>`
- 이전 Thread 상태와 비교: `git diff 9934b478c79a 2e6649a7706d -- <path>`
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
#### S-level state transition 기록

| 단계 | 학습자 기록 |
| --- | --- |
| correction 전 authoritative state | `[학습자 작성]` |
| partial / ambiguous state 종류 | `[학습자 작성]` |
| publication 또는 commit boundary | `[학습자 작성]` |
| rollback / compensation 진입 조건 | `[학습자 작성]` |
| recovery 중 보호되는 invariant | `[학습자 작성]` |
| 성공 endpoint | `[학습자 작성]` |
| 실패 endpoint | `[학습자 작성]` |
| 후속 regression evidence | `[학습자 작성]` |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: `[학습자 작성]`
- 다음 관련 commit이 바꾸거나 검증하는 지점: `[학습자 작성]`
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: `[학습자 작성]`

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

- successful initial rotation의 setup과 active generation 변경 assertions를 확인합니다.
- WordPress user/config, DB application/root, first host file, container removal/recreation 각 failure scenario의 expected verified rollback을 표로 만듭니다.
- all host files changed 후 `SIGTERM`, rollback-active 확인 후 second `SIGINT`를 보내는 synchronization을 추적합니다.
- 동일 untouched replacement directory로 retry가 성공하는 assertion과 input preservation evidence를 확인합니다.
- host file permissions, expected/old auth, config agreement, HTTPS write/read, temp-file absence, metadata/log/output leakage 검사를 분리합니다.
- broad integration과 deterministic regression 성격을 각각 어떤 subscenario가 갖는지 기록합니다.

#### 비교 기준

- exact commit diff: `git diff 0da35c72add5^ 0da35c72add5 -- <path>`
- 이전 Thread 상태와 비교: `git diff 2e6649a7706d 0da35c72add5 -- <path>`
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

- static validator가 obsolete `/run/secrets` mount assumptions와 mounted-secret comparison helper를 어떤 pattern으로 금지하는지 찾습니다.
- private WordPress config temporary-file cleanup과 full post-rotation runtime boundary check를 요구하는 assertion을 확인합니다.
- production behavior를 실행하지 않는 static guard가 막는 architectural regression과 놓치는 runtime failure를 구분합니다.

#### 비교 기준

- exact commit diff: `git diff 2557079c2d19^ 2557079c2d19 -- <path>`
- 이전 Thread 상태와 비교: `git diff 0da35c72add5 2557079c2d19 -- <path>`
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
| replacement 및 active secret files는 private regular single-link input이며 individual publication은 atomic/durable합니다. | `a2d20b8c2c03` | `9934b478c79a` | `0da35c72add5` | `[학습자: 실제 code/test evidence]` |
| rotation 성공 시 모든 replacement credential은 작동하고 모든 previous credential은 거부됩니다. | `64844c583211` | `9934b478c79a` | `0da35c72add5` | `[학습자: 실제 code/test evidence]` |
| rotation 실패 시 verified prior generation으로 compensation하거나 incomplete rollback을 명시적으로 보고합니다. | `c68486d55f30` | `2e6649a7706d에서 ambiguous state/signal 보강` | `0da35c72add5` | `[학습자: 실제 code/test evidence]` |
| rollback 활성화 뒤 추가 termination signal은 recovery를 중단하지 않습니다. | `2e6649a7706d` | `2e6649a7706d` | `0da35c72add5` | `[학습자: 실제 code/test evidence]` |
| 회전 뒤에도 long-running runtime secret exposure boundary가 유지됩니다. | `기존 bootstrap architecture` | `2557079c2d19가 test guard 고정` | `0da35c72add5` | `[학습자: 실제 code/test evidence]` |

### Ledger 보완 기록

- source에 명시되지 않은 새 invariant를 확정 사실로 추가하지 않습니다.
- invariant가 실제로 부족했음을 드러낸 commit 또는 failure stage: `[학습자 작성]`
- marker, rename, lock, health, authentication, cleanup 등 invariant를 고정하는 concrete mechanism: `[학습자 작성]`
- 후속 commit이 invariant를 약화하지 못하게 하는 regression evidence: `[학습자 작성]`

## Failure → Fix → Test 연결

| failure / 위험 | fix 또는 mechanism | test / evidence | 학습자 연결 기록 |
| --- | --- | --- | --- |
| DB/WordPress/host files 중 일부만 새 generation으로 바뀜 | 9934b478c79a의 ordered locked transaction과 c68486d55f30 compensation | 0da35c72add5의 각 publication stage failure matrix | `[학습자: root cause와 code/test 연결]` |
| subprocess가 write 후 nonzero를 반환해 실제 credential generation이 불명확 | 2e6649a7706d가 probes로 actual state를 판정하고 compensation | post-write failure injection scenarios | `[학습자: root cause와 code/test 연결]` |
| operator signal이 host files 교체 뒤 또는 rollback 중 도착 | 2e6649a7706d가 first signal을 failure로 전환하고 rollback 중 signal defer | 0da35c72add5의 SIGTERM 후 rollback-active SIGINT scenario | `[학습자: root cause와 code/test 연결]` |
| 새 값은 동작하지만 이전 값도 여전히 인증됨 | 64844c583211의 positive + negative verification | 0da35c72add5 end-to-end authentication checks | `[학습자: root cause와 code/test 연결]` |
| rotation test가 obsolete `/run/secrets` mount를 다시 허용해 property를 약화 | 2557079c2d19 static guard | static validator assertions | `[학습자: root cause와 code/test 연결]` |

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
| Host secret files | old generation의 개별 파일 | same-directory atomic replacement와 parent sync | read/open/write/fsync/rename evidence | `[학습자 작성]` |
| MariaDB accounts | root와 application password가 current generation 소유 | local-socket authenticated mutation; app 먼저, root 마지막 | SQL order, escaping, temp option file evidence | `[학습자 작성]` |
| WordPress users | hashed passwords in WordPress state | `wp_set_password`를 통한 application-owned mutation | WP/PHP invocation and stdin payload evidence | `[학습자 작성]` |
| Private `wp-config.php` | DB credential consumer | exact one definition을 same-filesystem rename으로 교체 | regular-file check, temp file, mode/owner preservation evidence | `[학습자 작성]` |
| Rotation orchestrator | 개별 helper 결과에 의존 | actual behavior probes와 project lock으로 generation 전환/보상 소유 | _rotate, compensation, verification call order evidence | `[학습자 작성]` |

## Thread 최종 상태

- **Source-confirmed endpoint:** Credentials are represented in four host files, two MariaDB accounts, two WordPress users, and WordPress configuration. The thread therefore evolves from individual mutation primitives to a verified state transition and then to compensation for commands that may change state before failing. Deferring further termination while rollback is active is the key correction that prevents recovery itself from being interrupted.
- 최종 authoritative state와 owner: `[학습자 작성]`
- 정상 실행의 entry point와 완료 조건: `[학습자 작성]`
- failure 또는 interruption 뒤 retry/rollback/compensation 조건: `[학습자 작성]`
- 이 Thread가 다른 Thread에 제공하는 전제: `[학습자 작성]`
- 이 Thread 단독으로는 증명하지 않는 것: `[학습자 작성]`

## 최종 architecture 또는 execution flow 정리

| 단계 | 확인할 흐름 | 실제 코드 근거 | 정상 전이 | 실패·정리·재시도 |
| --- | --- | --- | --- | --- |
| 1 | replacement directory와 네 secret 값을 검증하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 2 | old generation과 runtime exposure boundary를 먼저 검증하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 3 | Nginx를 중지해 public request path를 닫는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 4 | WordPress users와 private config를 새 값으로 바꾸는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 5 | MariaDB application password와 root password를 순서대로 바꾸는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 6 | host files를 publish하고 services를 force-recreate하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 7 | new works / old fails / files match / no leak를 검증하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 8 | 예외 또는 signal 시 actual state를 탐색하고 prior generation으로 보상하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |

### 학습자의 최종 설명

> `[학습자 작성: 위 표와 commit evidence만 사용해 이 Thread의 설계 → 구현 → 실패 → 수정 → 검증 발전을 설명합니다.]`

## 학습 완료 자가 점검

- [ ] rotation을 하나의 DB transaction처럼 원자적이라고 표현하지 않았습니까?
- [ ] subprocess exit code만으로 state mutation 여부를 결정하지 않았습니까?
- [ ] root credential을 너무 일찍 바꿔 후속 repair path를 끊는 ordering을 놓치지 않았습니까?
- [ ] rollback 중 두 번째 signal이 즉시 종료시킨다고 잘못 설명하지 않았습니까?
- [ ] 새 값 성공과 옛 값 거부를 모두 실제 consumer interface로 확인했습니까?
- [ ] 모든 code snippet에 SHA와 path/symbol을 기록했습니다.
- [ ] final HEAD의 field/helper/test를 이전 SHA에 소급하지 않았습니다.
- [ ] source가 확정하지 않은 사실을 추정으로 채우지 않았습니다.
- [ ] test가 증명하는 것과 증명하지 않는 것을 구분했습니다.
- [ ] 이 Thread를 commit 순서대로 구두 설명할 수 있습니다.
