# Thread 4 — Atomic backup publication under failure and cancellation

## Thread 목표

MariaDB transactional dump와 WordPress filesystem archive를 하나의 신뢰 가능한 backup set으로 결합하고, failure·signal에도 partial set을 게시하지 않으며 source stack을 복구하는 transaction을 추적합니다.

**Source significance**

> The implementation deliberately separates data capture from publication. Private streaming files, an exact output reservation, a manifest, and directory replacement ensure that only a complete set becomes visible. Signal-aware recovery and negative runtime tests establish the equally important converse: cancelled or failed work must not leave a plausible backup or a degraded source stack.

## 이 Thread를 이해하기 위한 핵심 질문

- 두 artifact가 생성됐다는 사실만으로 하나의 일관된 backup이라고 할 수 없는 이유는 무엇입니까?
- private file creation, fsync, directory fsync, checksum은 각각 어떤 failure window를 줄입니까?
- signal을 exception으로 전환하고 synchronized pause stage를 둔 이유는 무엇입니까?
- destination path reservation에서 pathname 비교가 아니라 device/inode identity가 필요한 이유는 무엇입니까?
- Nginx와 WordPress를 멈추되 MariaDB는 transactional dump를 위해 유지하는 ordering은 어디에 구현됩니까?
- published backup과 failed attempt의 observable end state는 각각 무엇입니까?

## 완료 기준

- data capture와 publication을 별도 단계로 나누고 각 durability boundary를 코드로 확인했습니다.
- backup directory가 정확히 DB dump, WordPress archive, manifest의 완전한 set으로만 보이는 과정을 추적했습니다.
- failure와 SIGINT/SIGTERM이 동일 cleanup/recovery 경로로 수렴하는지 확인했습니다.
- negative test가 final output, temporary sibling, ready marker, lock, service health를 어떻게 검사하는지 기록했습니다.
- large fixture와 signal-race test가 small happy path보다 추가로 증명하는 내용을 구분했습니다.

## Commit map

| 순서 | SHA | Subject | Importance | Tags | Source-defined role |
| --- | --- | --- | --- | --- | --- |
| 1 | `fdd55605ba74` | feat(backup): 백업 무결성과 비공개 파일 I/O 정의 | **B** | `PERSISTENCE`<br>`OPERATIONS` | Defined private output, synchronization, and checksum primitives. |
| 2 | `d26c885c5cd5` | feat(backup): 관리 작업 신호와 테스트 중단 경계 추가 | **A** | `RECOVERY`<br>`TEST`<br>`HARD` | Created deterministic signal and failure-test boundaries. |
| 3 | `3a0995ff0d4f` | feat(backup): 프로젝트별 백업 작업 잠금 적용 | **B** | `RECOVERY`<br>`OPERATIONS`<br>`PERSISTENCE` | Serialized backup with other operations on the same project. |
| 4 | `b478b5243c5a` | feat(backup): DB 덤프와 WordPress 볼륨 수집 | **A** | `PERSISTENCE`<br>`CORE`<br>`INTEGRATION` | Captured transactional MariaDB and WordPress volume streams. |
| 5 | `0540ff1b5a4b` | feat(backup): 백업 출력 경로를 안전하게 예약 | **A** | `PERSISTENCE`<br>`RISK`<br>`EDGE` | Reserved and identity-checked the destination path. |
| 6 | `6999190ffd34` | feat(backup): 백업 세트를 원자적으로 게시 | **S** | `PERSISTENCE`<br>`RECOVERY`<br>`HARD` | Published a complete checksummed backup set atomically and recovered services. |
| 7 | `b6920a0c918c` | test(backup): 게시 실패와 중단 정리 검증 | **A** | `TEST`<br>`RECOVERY`<br>`PERSISTENCE` | Verified non-publication, cleanup, recovery, and shared-lock behavior on failure. |
| 8 | `030e7310c665` | test(backup): 자원 충돌과 시그널 경계 검증 | **A** | `TEST`<br>`PERSISTENCE`<br>`EDGE` | Extended evidence to signal races, large data, and collision boundaries. |

> Commit 순서는 source의 Development Thread 정의를 그대로 따릅니다. 같은 SHA가 다른 Thread에도 있으면 이 문서의 관점으로 다시 확인합니다.

## Commit별 학습 기록

### 1. `fdd55605ba74` — feat(backup): 백업 무결성과 비공개 파일 I/O 정의

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **B** |
| Tags | `PERSISTENCE`, `OPERATIONS` |
| Source-defined role | Defined private output, synchronization, and checksum primitives. |
| 이전 Thread commit | 없음 |
| 다음 Thread commit | `d26c885c5cd5` |

#### 원문이 확정한 범위

- **Summary:** Introduces SHA-256 helpers, directory synchronization, and exclusive private-file output primitives for backup work.
- **Classification reason:** These are necessary low-level safety utilities, but they are supporting pieces whose project significance depends on later backup publication and restore orchestration.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `fdd55605ba74`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- SHA-256 helper가 seekable stream position을 저장/복원하는 code와 non-seekable input 처리 여부를 확인합니다.
- output file을 exclusive `0600`으로 만드는 open flags와 existing path refusal을 찾습니다.
- write 후 flush/`fsync`, directory synchronization helper, error wrapping into backup-domain error를 추적합니다.
- 후속 atomic rename이 기대하는 durability precondition 중 이 commit이 담당하는 부분을 구분합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| `[학습자 작성]` | `[학습자 작성]` | `[학습자 작성]` | `[학습자 삽입]` | `[학습자 작성]` |

#### B-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| Thread에서 맡은 구현 역할 | `[학습자 작성]` |
| 핵심 input / output / state | `[학습자 작성]` |
| 변경된 directive / helper / command | `[학습자 작성]` |
| immediate failure 또는 boundary | `[학습자 작성]` |
| 다음 commit에 넘긴 한계 | `[학습자 작성]` |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: `[학습자 작성]`
- 다음 관련 commit이 바꾸거나 검증하는 지점: `[학습자 작성]`
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: `[학습자 작성]`

### 2. `d26c885c5cd5` — feat(backup): 관리 작업 신호와 테스트 중단 경계 추가

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `RECOVERY`, `TEST`, `HARD` |
| Source-defined role | Created deterministic signal and failure-test boundaries. |
| 이전 Thread commit | `fdd55605ba74` |
| 다음 Thread commit | `3a0995ff0d4f` |

#### 원문이 확정한 범위

- **Summary:** Adds controlled signal handling plus deterministic failure and pause stages for management-operation tests.
- **Classification reason:** It creates a reliable way to exercise asynchronous cancellation through the same cleanup paths as ordinary errors, a significant failure-path engineering boundary used throughout backup and rotation testing.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `d26c885c5cd5`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `SIGINT`/`SIGTERM` handler를 controlled operation failure로 변환하고 previous handlers를 복원하는 context를 확인합니다.
- failure-injection stage와 pause stage dispatch가 production interface와 test-only control을 어떻게 분리하는지 찾습니다.
- pause helper가 termination signals를 block한 상태에서 ready file을 exclusive/atomic하게 만들고 sync한 뒤 mask를 복원하는 순서를 추적합니다.
- wait 중 signal과 setup failure 모두에서 ready file cleanup이 실행되는지 확인합니다.
- sleep 없이 “stage reached”를 증명하는 synchronization contract를 test caller와 함께 기록합니다.

#### 비교 기준

- exact commit diff: `git diff d26c885c5cd5^ d26c885c5cd5 -- <path>`
- 이전 Thread 상태와 비교: `git diff fdd55605ba74 d26c885c5cd5 -- <path>`
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

### 3. `3a0995ff0d4f` — feat(backup): 프로젝트별 백업 작업 잠금 적용

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **B** |
| Tags | `RECOVERY`, `OPERATIONS`, `PERSISTENCE` |
| Source-defined role | Serialized backup with other operations on the same project. |
| 이전 Thread commit | `d26c885c5cd5` |
| 다음 Thread commit | `b478b5243c5a` |

#### 원문이 확정한 범위

- **Summary:** Applies the per-project advisory lock model to backup operations.
- **Classification reason:** The lock is important, but this commit mainly extends an existing serialization decision to another management path rather than introducing a new project-wide mechanism.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `3a0995ff0d4f`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- backup public entry 또는 transaction 함수가 shared per-project operation lock을 획득하는 exact scope를 확인합니다.
- lock 획득 전에 수행하는 read-only validation과 lock 안에서 수행하는 state observation/mutation을 구분합니다.
- contention 시 즉시 실패하고 어떤 backup output/service mutation도 시작하지 않는지 branch를 확인합니다.
- startup/restore/rotation과 lock identity를 공유하는 import/caller path를 기록합니다.

#### 비교 기준

- exact commit diff: `git diff 3a0995ff0d4f^ 3a0995ff0d4f -- <path>`
- 이전 Thread 상태와 비교: `git diff d26c885c5cd5 3a0995ff0d4f -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| `[학습자 작성]` | `[학습자 작성]` | `[학습자 작성]` | `[학습자 삽입]` | `[학습자 작성]` |

#### B-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| Thread에서 맡은 구현 역할 | `[학습자 작성]` |
| 핵심 input / output / state | `[학습자 작성]` |
| 변경된 directive / helper / command | `[학습자 작성]` |
| immediate failure 또는 boundary | `[학습자 작성]` |
| 다음 commit에 넘긴 한계 | `[학습자 작성]` |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: `[학습자 작성]`
- 다음 관련 commit이 바꾸거나 검증하는 지점: `[학습자 작성]`
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: `[학습자 작성]`

### 4. `b478b5243c5a` — feat(backup): DB 덤프와 WordPress 볼륨 수집

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `PERSISTENCE`, `CORE`, `INTEGRATION` |
| Source-defined role | Captured transactional MariaDB and WordPress volume streams. |
| 이전 Thread commit | `3a0995ff0d4f` |
| 다음 Thread commit | `0540ff1b5a4b` |

#### 원문이 확정한 범위

- **Summary:** Streams a transactional MariaDB dump and a WordPress data/config archive into private files.
- **Classification reason:** This implements the substantive data-capture path spanning database and filesystem state, a major component of backup functionality but not yet its atomic publication guarantee.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `b478b5243c5a`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- MariaDB dump command에서 `--single-transaction`, routines/events/triggers, binary data, database recreation 관련 flags를 확인합니다.
- root password가 stdin으로 들어가 container 내부 private temporary client option file에 놓이고 trap으로 제거되는 경로를 추적합니다.
- SQL stdout이 host private synchronized file로 직접 streaming되고 recognizable dump syntax를 검사하는 code를 찾습니다.
- one-off WordPress service container가 data/config volumes를 mount해 gzip tar stream을 생성하는 command를 확인합니다.
- web-volume의 `wp-config.php` symlink를 archive에서 제외하는 rule과 authoritative config regular file이 포함되는 위치를 기록합니다.

#### 비교 기준

- exact commit diff: `git diff b478b5243c5a^ b478b5243c5a -- <path>`
- 이전 Thread 상태와 비교: `git diff 3a0995ff0d4f b478b5243c5a -- <path>`
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

### 5. `0540ff1b5a4b` — feat(backup): 백업 출력 경로를 안전하게 예약

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `PERSISTENCE`, `RISK`, `EDGE` |
| Source-defined role | Reserved and identity-checked the destination path. |
| 이전 Thread commit | `b478b5243c5a` |
| 다음 Thread commit | `6999190ffd34` |

#### 원문이 확정한 범위

- **Summary:** Normalizes and reserves a new backup output directory while tracking its exact inode identity.
- **Classification reason:** The small interface prevents overwrite, symlink, and path-substitution races at the publication boundary, protecting the integrity of a high-risk destructive and archival workflow.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `0540ff1b5a4b`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- destination path normalization이 final component를 resolve하지 않고 existing parent만 resolve하는 코드를 확인합니다.
- ambiguous terminal name과 non-directory parent rejection branch를 찾습니다.
- empty private reservation directory 생성 뒤 device/inode를 기록하는 위치와 data structure를 추적합니다.
- publication 직전 path가 same object인지 비교하는 helper의 inputs와 mismatch failure를 기록합니다.
- pathname string equality만 사용했을 때 놓치는 symlink/mount/directory replacement scenario를 작성합니다.

#### 비교 기준

- exact commit diff: `git diff 0540ff1b5a4b^ 0540ff1b5a4b -- <path>`
- 이전 Thread 상태와 비교: `git diff b478b5243c5a 0540ff1b5a4b -- <path>`
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

### 6. `6999190ffd34` — feat(backup): 백업 세트를 원자적으로 게시

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **S** |
| Tags | `PERSISTENCE`, `RECOVERY`, `HARD` |
| Source-defined role | Published a complete checksummed backup set atomically and recovered services. |
| 이전 Thread commit | `0540ff1b5a4b` |
| 다음 Thread commit | `b6920a0c918c` |

#### 원문이 확정한 범위

- **Summary:** Stops application writers, captures database and WordPress state, writes a checksummed manifest, atomically publishes the set, and recovers services on failure.
- **Classification reason:** This is the defining backup transaction. It establishes the all-or-nothing publication and service-recovery guarantees needed to treat a directory as a valid backup.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `6999190ffd34`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- backup transaction의 complete call sequence를 all-services-running check부터 lock/signal scope와 함께 추적합니다.
- reserved destination과 sibling temporary directory의 관계, private artifact creation, Nginx/WordPress stop ordering을 확인합니다.
- MariaDB dump와 WordPress archive capture 후 archive validation, UTC metadata, SHA-256 manifest 생성 위치를 찾습니다.
- temporary files/directory sync → reserved inode recheck → one rename → parent directory sync의 publication boundary를 표시합니다.
- 각 exception/signal branch에서 unpublished temp, reservation, ready artifacts를 제거하는 순서를 확인합니다.
- application services restart/health recovery 실패를 original backup error와 별도로 surfaced하는 error path를 추적합니다.
- 성공 시 exactly three matching artifacts라는 invariant와 실패 시 observable output을 실제 code condition으로 작성합니다.

#### 비교 기준

- exact commit diff: `git diff 6999190ffd34^ 6999190ffd34 -- <path>`
- 이전 Thread 상태와 비교: `git diff 0540ff1b5a4b 6999190ffd34 -- <path>`
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

### 7. `b6920a0c918c` — test(backup): 게시 실패와 중단 정리 검증

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `TEST`, `RECOVERY`, `PERSISTENCE` |
| Source-defined role | Verified non-publication, cleanup, recovery, and shared-lock behavior on failure. |
| 이전 Thread commit | `6999190ffd34` |
| 다음 Thread commit | `030e7310c665` |

#### 원문이 확정한 범위

- **Summary:** Adds runtime checks for failed backup publication, signal cancellation, service recovery, temporary cleanup, and cross-`TMPDIR` lock contention.
- **Classification reason:** It materially validates the negative guarantees of atomic backup: failure must publish nothing, restore the live stack, and release scoped synchronization resources.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `b6920a0c918c`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- backup child process launch, synchronized ready-file wait, `SIGINT`/`SIGTERM`, graceful timeout 후 kill escalation을 추적합니다.
- failed DB-dump publication과 services-stopped 이후 interruption scenario의 injection/pause points를 확인합니다.
- final backup, temporary sibling, reservation, ready file, project lock이 남지 않았음을 검사하는 assertions를 기록합니다.
- 모든 services가 healthy로 돌아왔는지 live check하는 code path를 찾습니다.
- 다른 `TMPDIR` process들이 같은 project lock에서 contend하는 setup과 assertion을 확인합니다.
- 이 test가 broad integration인지 deterministic regression인지 근거를 작성합니다.

#### 비교 기준

- exact commit diff: `git diff b6920a0c918c^ b6920a0c918c -- <path>`
- 이전 Thread 상태와 비교: `git diff 6999190ffd34 b6920a0c918c -- <path>`
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

### 8. `030e7310c665` — test(backup): 자원 충돌과 시그널 경계 검증

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `TEST`, `PERSISTENCE`, `EDGE` |
| Source-defined role | Extended evidence to signal races, large data, and collision boundaries. |
| 이전 Thread commit | `b6920a0c918c` |
| 다음 Thread commit | 없음 |

#### 원문이 확정한 범위

- **Summary:** Adds signal-race checks, labelled and name-only restore-collision refusal, large filesystem and database fixtures, checksums, and stricter secondary cleanup reporting.
- **Classification reason:** It tests boundary conditions that small normal-path fixtures and simple cancellation cannot cover, protecting the integrity and lifecycle guarantees of backup and restore.

- **이 Thread의 재검토 관점:** 이 문서에서는 signal handoff, streaming size, backup cleanup 관점을 우선 기록하고 restore collision은 연결 정보로만 남깁니다.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `030e7310c665`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- ready marker 관찰 직후 `SIGINT`와 `SIGTERM`을 번갈아 보내는 repeated race loop와 expected signal report/marker cleanup을 확인합니다.
- stopped labelled container와 unlabelled exact-name container/volume/network collision fixture를 만드는 코드를 찾습니다.
- 32 MiB random WordPress upload와 4 MiB MariaDB value의 생성, streaming, restored checksum/length assertions를 추적합니다.
- secondary restore project cleanup failure가 scenario result에 전파되는 branch를 확인합니다.
- 현재 thread 관점에서 backup signal/streaming evidence와 restore collision/large-restore evidence를 분리해 기록합니다.

#### 비교 기준

- exact commit diff: `git diff 030e7310c665^ 030e7310c665 -- <path>`
- 이전 Thread 상태와 비교: `git diff b6920a0c918c 030e7310c665 -- <path>`
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
| backup output file은 처음부터 private하고 기존 path를 덮어쓰지 않습니다. | `fdd55605ba74` | `0540ff1b5a4b` | `b6920a0c918c` | `[학습자: 실제 code/test evidence]` |
| 같은 project의 backup은 다른 mutating management operation과 겹치지 않습니다. | `3a0995ff0d4f` | `6999190ffd34` | `b6920a0c918c의 cross-TMPDIR contention` | `[학습자: 실제 code/test evidence]` |
| published backup set은 DB dump, WordPress archive, matching manifest의 완전한 단위입니다. | `b478b5243c5a, 0540ff1b5a4b` | `6999190ffd34` | `b6920a0c918c, 030e7310c665` | `[학습자: 실제 code/test evidence]` |
| 실패하거나 취소된 backup은 plausible final set을 남기지 않고 application services를 복구합니다. | `6999190ffd34` | `b6920a0c918c` | `030e7310c665` | `[학습자: 실제 code/test evidence]` |

### Ledger 보완 기록

- source에 명시되지 않은 새 invariant를 확정 사실로 추가하지 않습니다.
- invariant가 실제로 부족했음을 드러낸 commit 또는 failure stage: `[학습자 작성]`
- marker, rename, lock, health, authentication, cleanup 등 invariant를 고정하는 concrete mechanism: `[학습자 작성]`
- 후속 commit이 invariant를 약화하지 못하게 하는 regression evidence: `[학습자 작성]`

## Failure → Fix → Test 연결

| failure / 위험 | fix 또는 mechanism | test / evidence | 학습자 연결 기록 |
| --- | --- | --- | --- |
| DB dump와 filesystem archive 사이에 application write가 발생하거나 partial files가 노출됨 | 6999190ffd34가 writers stop + sibling temp + manifest + atomic rename 적용 | b6920a0c918c가 publication failure와 signal interruption 뒤 non-publication 검증 | `[학습자: root cause와 code/test 연결]` |
| output path가 validation 뒤 symlink/directory replacement로 바뀜 | 0540ff1b5a4b가 parent resolution과 exact inode reservation | backup/restore runtime scenarios의 unsafe destination/collision checks | `[학습자: root cause와 code/test 연결]` |
| asynchronous signal이 timing-dependent cleanup을 만들거나 ready marker를 남김 | d26c885c5cd5가 masked ready publication과 controlled signal failure | 030e7310c665가 repeated pause/signal race 검증 | `[학습자: root cause와 code/test 연결]` |
| streaming path가 작은 fixture에서만 우연히 동작 | b478b5243c5a의 stream-oriented capture | 030e7310c665가 32 MiB file과 4 MiB DB value checksum/length 검증 | `[학습자: root cause와 code/test 연결]` |

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
| Source stack services | 모두 running | backup이 writer quiescence와 recovery를 일시적으로 소유 | service stop/start/finally evidence | `[학습자 작성]` |
| Temporary sibling directory | 없음 | unpublished dump/archive/manifest를 독점 보유 | exclusive creation, fsync, cleanup evidence | `[학습자 작성]` |
| Reserved destination | user-supplied pathname | empty private inode로 publication slot 역할 | device/inode check와 replace evidence | `[학습자 작성]` |
| Published backup set | 개별 artifact 경로 | manifest가 artifact identity/checksum을 묶는 authoritative unit | manifest schema와 digest evidence | `[학습자 작성]` |
| Signal handler/pause marker | OS signal의 비동기 종료 | normal exception cleanup path와 deterministic test handoff | handler restore, mask, ready-file lifecycle evidence | `[학습자 작성]` |

## Thread 최종 상태

- **Source-confirmed endpoint:** The implementation deliberately separates data capture from publication. Private streaming files, an exact output reservation, a manifest, and directory replacement ensure that only a complete set becomes visible. Signal-aware recovery and negative runtime tests establish the equally important converse: cancelled or failed work must not leave a plausible backup or a degraded source stack.
- 최종 authoritative state와 owner: `[학습자 작성]`
- 정상 실행의 entry point와 완료 조건: `[학습자 작성]`
- failure 또는 interruption 뒤 retry/rollback/compensation 조건: `[학습자 작성]`
- 이 Thread가 다른 Thread에 제공하는 전제: `[학습자 작성]`
- 이 Thread 단독으로는 증명하지 않는 것: `[학습자 작성]`

## 최종 architecture 또는 execution flow 정리

| 단계 | 확인할 흐름 | 실제 코드 근거 | 정상 전이 | 실패·정리·재시도 |
| --- | --- | --- | --- | --- |
| 1 | project lock과 signal handling을 설정하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 2 | running services, secrets, destination reservation을 검증하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 3 | Nginx/WordPress writer를 중지하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 4 | MariaDB transactional dump와 WordPress archive를 streaming capture하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 5 | archive validation, checksum, manifest, file/directory sync를 수행하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 6 | reserved inode identity를 재검사하고 temporary directory를 rename하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 7 | 성공/실패 모두에서 application services와 temporary state를 정리하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |

### 학습자의 최종 설명

> `[학습자 작성: 위 표와 commit evidence만 사용해 이 Thread의 설계 → 구현 → 실패 → 수정 → 검증 발전을 설명합니다.]`

## 학습 완료 자가 점검

- [ ] 두 artifact의 생성 성공을 atomic publication과 같은 의미로 썼습니까?
- [ ] file fsync와 containing directory fsync의 역할을 구분했습니까?
- [ ] MariaDB까지 멈춘다고 잘못 설명하지 않았습니까?
- [ ] failure 뒤 source services recovery 실패가 별도 오류로 surfaced되는지 확인했습니까?
- [ ] signal test의 ready marker가 sleep 기반 동기화가 아니라는 점을 코드로 확인했습니까?
- [ ] 모든 code snippet에 SHA와 path/symbol을 기록했습니다.
- [ ] final HEAD의 field/helper/test를 이전 SHA에 소급하지 않았습니다.
- [ ] source가 확정하지 않은 사실을 추정으로 채우지 않았습니다.
- [ ] test가 증명하는 것과 증명하지 않는 것을 구분했습니다.
- [ ] 이 Thread를 commit 순서대로 구두 설명할 수 있습니다.
