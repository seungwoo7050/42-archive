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

- `tools/stack_backup.py`의 `sha256_stream`에서 manifest digest 계산이 caller의 후속 stream 소비 위치를 망가뜨리지 않습니다.
- `tools/stack_backup.py`의 `private output helper`에서 artifact가 생성되는 첫 순간부터 다른 user에게 공개되지 않습니다.
- `tools/stack_backup.py`의 `flush/fsync / fsync_directory`에서 후속 rename 전에 file contents와 directory metadata의 durability precondition을 만듭니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| fdd55605ba74 | tools/stack_backup.py | sha256_stream | stream의 현재 position을 저장하고 처음부터 chunk로 SHA-256을 계산한 뒤 원래 position으로 되돌립니다. | manifest digest 계산이 caller의 후속 stream 소비 위치를 망가뜨리지 않습니다. |
| fdd55605ba74 | tools/stack_backup.py | private output helper | `O_CREAT\|O_EXCL`과 mode `0600`으로 output을 만들고 기존 path를 덮어쓰지 않습니다. | artifact가 생성되는 첫 순간부터 다른 user에게 공개되지 않습니다. |
| fdd55605ba74 | tools/stack_backup.py | flush/fsync / fsync_directory | file stream을 flush·fsync하고 parent directory descriptor도 sync하며 OS 오류를 backup-domain error로 변환합니다. | 후속 rename 전에 file contents와 directory metadata의 durability precondition을 만듭니다. |

#### B-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| Thread에서 맡은 구현 역할 | Defined private output, synchronization, and checksum primitives. |
| 핵심 input / output / state | helper가 열린 stream과 file descriptor의 lifetime을 소유하며 caller는 성공한 durable private file만 다음 단계로 넘깁니다. |
| 변경된 directive / helper / command | `tools/stack_backup.py`의 `sha256_stream`; `tools/stack_backup.py`의 `private output helper`; `tools/stack_backup.py`의 `flush/fsync / fsync_directory` |
| immediate failure 또는 boundary | existing path, short write/flush/fsync, non-seekable digest input 등 지원하지 않는 조건은 명시적 failure가 됩니다. |
| 다음 commit에 넘긴 한계 | DB dump와 WordPress archive의 cross-artifact consistency, atomic directory publication, service recovery는 보장하지 않습니다. `b478b5243c5a`가 streaming capture에 사용하고 `6999190ffd34`가 manifest와 atomic directory publication으로 완전한 set을 만듭니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: DB dump와 WordPress archive의 cross-artifact consistency, atomic directory publication, service recovery는 보장하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `b478b5243c5a`가 streaming capture에 사용하고 `6999190ffd34`가 manifest와 atomic directory publication으로 완전한 set을 만듭니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: 개별 artifact가 private하고 existing path를 덮어쓰지 않으며 checksum과 sync를 계산할 수 있음을 보장합니다.

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

- `tools/stack_backup.py`의 `operation_signal_handlers`에서 signal과 ordinary exception을 같은 cleanup path로 보냅니다.
- `tools/stack_backup.py`의 `pause/failure stage hook`에서 failure timing을 sleep에 의존하지 않고 production control flow에 동기화합니다.
- `tools/stack_backup.py`의 `signal masking around ready publication`에서 test가 관측한 ready 상태와 실제 pause state가 어긋나는 window를 줄입니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| d26c885c5cd5 | tools/stack_backup.py | operation_signal_handlers | SIGINT/SIGTERM handler가 즉시 임의 지점에서 종료하는 대신 management-domain exception을 발생시키고 원래 handler를 finally에서 복원합니다. | signal과 ordinary exception을 같은 cleanup path로 보냅니다. |
| d26c885c5cd5 | tools/stack_backup.py | pause/failure stage hook | 명명된 stage에서 private ready file을 게시한 뒤 test가 진행을 허용할 때까지 기다리거나 configured failure를 발생시킵니다. | failure timing을 sleep에 의존하지 않고 production control flow에 동기화합니다. |
| d26c885c5cd5 | tools/stack_backup.py | signal masking around ready publication | ready marker 생성·sync와 handler transition의 작은 구간에서 signal race를 제어합니다. | test가 관측한 ready 상태와 실제 pause state가 어긋나는 window를 줄입니다. |

#### 비교 기준

- exact commit diff: `git diff d26c885c5cd5^ d26c885c5cd5 -- <path>`
- 이전 Thread 상태와 비교: `git diff fdd55605ba74 d26c885c5cd5 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | 비동기 signal은 cleanup code 어느 지점에서든 process를 끝내 test 재현성과 resource recovery를 불명확하게 만들 수 있었습니다. |
| 선택한 boundary / decision | operator signal을 normal failure path로 변환하고, named stage/ready-file protocol로 deterministic interruption point를 만들었습니다. |
| 핵심 caller/callee 또는 configuration consumer | `tools/stack_backup.py`의 `operation_signal_handlers`; `tools/stack_backup.py`의 `pause/failure stage hook`; `tools/stack_backup.py`의 `signal masking around ready publication` |
| state / ownership / lifecycle 변화 | management operation이 handler 설치부터 복원까지 signal state를 소유합니다. test ready marker는 해당 operation의 temporary control state입니다. |
| 주요 failure branch | 첫 signal은 cancellation exception이 되고 finally가 service recovery와 temp cleanup을 수행합니다. ready-file publish 실패도 operation failure입니다. |
| 이 commit의 보장 | signal cancellation이 ordinary error와 같은 recovery path를 지나며 test가 정확한 stage에서 signal을 보낼 수 있습니다. |
| 한계와 다음 관련 commit | SIGKILL처럼 handler를 우회하는 종료나 하드웨어 장애는 처리하지 않습니다. `b6920a0c918c`와 `030e7310c665`가 publication stage와 signal race에서 이 mechanism을 사용합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: SIGKILL처럼 handler를 우회하는 종료나 하드웨어 장애는 처리하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `b6920a0c918c`와 `030e7310c665`가 publication stage와 signal race에서 이 mechanism을 사용합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: signal cancellation이 ordinary error와 같은 recovery path를 지나며 test가 정확한 stage에서 signal을 보낼 수 있습니다.

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

- `tools/stack_backup.py`의 `project_operation_lock(project)`에서 사전 조건 검사와 mutation 사이에 다른 cooperating operation이 끼지 않습니다.
- `tools/stack_runtime.py`의 `shared lock identity`에서 operation 종류가 달라도 동일 project mutation은 하나의 serialization domain입니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 3a0995ff0d4f | tools/stack_backup.py | project_operation_lock(project) | backup entry path가 destination/secret/service state를 검사하고 writer를 멈추기 전부터 project lock을 보유합니다. | 사전 조건 검사와 mutation 사이에 다른 cooperating operation이 끼지 않습니다. |
| 3a0995ff0d4f | tools/stack_runtime.py | shared lock identity | startup, backup, restore, rotation이 같은 project-name-derived lock을 공유합니다. | operation 종류가 달라도 동일 project mutation은 하나의 serialization domain입니다. |

#### 비교 기준

- exact commit diff: `git diff 3a0995ff0d4f^ 3a0995ff0d4f -- <path>`
- 이전 Thread 상태와 비교: `git diff d26c885c5cd5 3a0995ff0d4f -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### B-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| Thread에서 맡은 구현 역할 | Serialized backup with other operations on the same project. |
| 핵심 input / output / state | backup host process가 capture/publication/recovery 동안 project mutation 권한을 소유합니다. |
| 변경된 directive / helper / command | `tools/stack_backup.py`의 `project_operation_lock(project)`; `tools/stack_runtime.py`의 `shared lock identity` |
| immediate failure 또는 boundary | lock contention은 source stack이나 output path를 건드리기 전에 failure가 됩니다. |
| 다음 commit에 넘긴 한계 | 수동 Docker/DB command처럼 lock을 사용하지 않는 actor는 막지 않습니다. `6999190ffd34`가 lock 안에서 전체 atomic backup을 구성하고 `b6920a0c918c`가 다른 TMPDIR에서도 same-project contention을 확인합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: 수동 Docker/DB command처럼 lock을 사용하지 않는 actor는 막지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `6999190ffd34`가 lock 안에서 전체 atomic backup을 구성하고 `b6920a0c918c`가 다른 TMPDIR에서도 same-project contention을 확인합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: cooperating management operation과 같은 project backup이 겹치지 않음을 보장합니다.

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

- `tools/stack_backup.py`의 `database dump helper`에서 DB server는 running 상태에서 consistent transactional view를 제공합니다.
- `tools/stack_backup.py`의 `WordPress archive helper`에서 host가 volume implementation path를 직접 가정하지 않습니다.
- `tools/stack_backup.py`의 `archive content policy`에서 restore 시 public symlink와 private config source를 중복/충돌시키지 않습니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| b478b5243c5a | tools/stack_backup.py | database dump helper | `mariadb-dump`를 `--single-transaction`과 stream-oriented option으로 실행하고 stdout을 private file로 직접 전달합니다. | DB server는 running 상태에서 consistent transactional view를 제공합니다. |
| b478b5243c5a | tools/stack_backup.py | WordPress archive helper | one-off tar process가 WordPress data/config volume을 read-only로 mount해 archive stream을 private file로 보냅니다. | host가 volume implementation path를 직접 가정하지 않습니다. |
| b478b5243c5a | tools/stack_backup.py | archive content policy | public web tree의 config symlink를 archive에서 제외하고 실제 private config volume을 별도 root로 수집하며 archive member를 검증합니다. | restore 시 public symlink와 private config source를 중복/충돌시키지 않습니다. |

#### 비교 기준

- exact commit diff: `git diff b478b5243c5a^ b478b5243c5a -- <path>`
- 이전 Thread 상태와 비교: `git diff 3a0995ff0d4f b478b5243c5a -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | private file primitive는 있었지만 DB와 WordPress의 authoritative sources를 어떤 command와 consistency mode로 capture할지 정의되지 않았습니다. |
| 선택한 boundary / decision | DB는 transactional dump stream, WordPress는 mounted volume tar stream으로 수집하고 application writers는 후속 orchestration에서 quiesce할 수 있게 했습니다. |
| 핵심 caller/callee 또는 configuration consumer | `tools/stack_backup.py`의 `database dump helper`; `tools/stack_backup.py`의 `WordPress archive helper`; `tools/stack_backup.py`의 `archive content policy` |
| state / ownership / lifecycle 변화 | MariaDB server가 transaction snapshot을 소유하고 dump subprocess가 output stream을 생산합니다. archive container가 volume read view를 소유하고 host helper가 files를 받습니다. |
| 주요 failure branch | subprocess timeout/nonzero, stream write, archive member validation failure는 artifact를 invalid로 처리합니다. 이 commit만으로 두 stream의 publication timing은 묶이지 않습니다. |
| 이 commit의 보장 | 큰 data도 host memory 전체에 올리지 않고 DB dump와 WordPress volume archive를 capture할 수 있습니다. |
| 한계와 다음 관련 commit | 두 artifact가 같은 application cut에 해당하거나 partial output이 final destination에 보이지 않는다는 보장은 아직 없습니다. `6999190ffd34`가 writers stop과 manifest/rename으로 두 stream을 한 backup set으로 묶고 `030e7310c665`가 large fixture를 검증합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: 두 artifact가 같은 application cut에 해당하거나 partial output이 final destination에 보이지 않는다는 보장은 아직 없습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `6999190ffd34`가 writers stop과 manifest/rename으로 두 stream을 한 backup set으로 묶고 `030e7310c665`가 large fixture를 검증합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: 큰 data도 host memory 전체에 올리지 않고 DB dump와 WordPress volume archive를 capture할 수 있습니다.

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

- `tools/stack_backup.py`의 `destination parent resolution`에서 publication이 예상한 parent filesystem 안에서만 일어납니다.
- `tools/stack_backup.py`의 `exclusive reservation / stat identity`에서 사용자가 지정한 pathname을 다른 object로 바꾸는 공격/경쟁을 식별할 기준이 생깁니다.
- `tools/stack_backup.py`의 `pre-publication identity recheck`에서 문자열 path 일치만으로 TOCTOU replacement를 놓치지 않습니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 0540ff1b5a4b | tools/stack_backup.py | destination parent resolution | destination parent를 먼저 canonicalize하고 symlink/unsafe parent와 존재하는 non-reservation target을 거부합니다. | publication이 예상한 parent filesystem 안에서만 일어납니다. |
| 0540ff1b5a4b | tools/stack_backup.py | exclusive reservation / stat identity | 최종 path에 private empty reservation object를 exclusive create하고 device/inode identity를 보존합니다. | 사용자가 지정한 pathname을 다른 object로 바꾸는 공격/경쟁을 식별할 기준이 생깁니다. |
| 0540ff1b5a4b | tools/stack_backup.py | pre-publication identity recheck | rename 직전 path를 다시 `stat`해 최초 reservation과 `(st_dev, st_ino)`가 같은지 확인합니다. | 문자열 path 일치만으로 TOCTOU replacement를 놓치지 않습니다. |

#### 비교 기준

- exact commit diff: `git diff 0540ff1b5a4b^ 0540ff1b5a4b -- <path>`
- 이전 Thread 상태와 비교: `git diff b478b5243c5a 0540ff1b5a4b -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | destination이 검증 뒤 symlink나 다른 directory/file로 바뀌면 complete backup을 공격자가 선택한 위치에 게시하거나 기존 data를 덮어쓸 수 있었습니다. |
| 선택한 boundary / decision | parent를 고정하고 final pathname에 exclusive private reservation을 만든 뒤 object identity를 publication 직전 재검사했습니다. |
| 핵심 caller/callee 또는 configuration consumer | `tools/stack_backup.py`의 `destination parent resolution`; `tools/stack_backup.py`의 `exclusive reservation / stat identity`; `tools/stack_backup.py`의 `pre-publication identity recheck` |
| state / ownership / lifecycle 변화 | operation이 reservation inode와 sibling temporary directory를 소유합니다. caller가 제공한 path string은 더 이상 충분한 authority가 아닙니다. |
| 주요 failure branch | existing output, symlink, unsafe parent, reservation identity mismatch, cross-filesystem rename 조건은 publication 전에 실패합니다. |
| 이 commit의 보장 | final destination을 기존 object 위에 덮어쓰지 않고 정확히 자신이 예약한 slot에만 게시함을 보장합니다. |
| 한계와 다음 관련 commit | reservation만으로 artifact completeness/checksum/service recovery를 보장하지 않습니다. `6999190ffd34`가 verified temporary directory를 이 reservation에 atomic replace합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: reservation만으로 artifact completeness/checksum/service recovery를 보장하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `6999190ffd34`가 verified temporary directory를 이 reservation에 atomic replace합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: final destination을 기존 object 위에 덮어쓰지 않고 정확히 자신이 예약한 slot에만 게시함을 보장합니다.

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

- `tools/stack_backup.py`의 `backup orchestration`에서 public/application writers를 quiesce하되 transactional dump를 위해 MariaDB는 계속 실행합니다.
- `tools/stack_backup.py`의 `private sibling capture`에서 불완전 artifact는 final pathname 아래에 보이지 않습니다.
- `tools/stack_backup.py`의 `validate/checksum/manifest/sync`에서 manifest가 정확한 artifact identity를 하나의 set으로 묶습니다.
- `tools/stack_backup.py`의 `reservation identity + atomic replace`에서 관측 가능한 final path는 incomplete reservation에서 complete directory로 한 번에 바뀝니다.
- `tools/stack_backup.py`의 `finally service recovery / cleanup`에서 failed backup이 source stack을 degraded 상태로 남기지 않는 반대 보장을 시도합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 6999190ffd34 | tools/stack_backup.py | backup orchestration | project lock과 signal handler 아래 source services, secrets, destination reservation을 검사하고 Nginx와 WordPress를 중지합니다. | public/application writers를 quiesce하되 transactional dump를 위해 MariaDB는 계속 실행합니다. |
| 6999190ffd34 | tools/stack_backup.py | private sibling capture | DB dump와 WordPress archive를 final path와 같은 parent의 private temporary directory에 streaming capture합니다. | 불완전 artifact는 final pathname 아래에 보이지 않습니다. |
| 6999190ffd34 | tools/stack_backup.py | validate/checksum/manifest/sync | archive 구조를 재검증하고 두 artifact의 size/digest를 manifest에 기록한 뒤 files와 temporary directory를 sync합니다. | manifest가 정확한 artifact identity를 하나의 set으로 묶습니다. |
| 6999190ffd34 | tools/stack_backup.py | reservation identity + atomic replace | reserved inode를 재확인한 뒤 temporary directory를 final destination으로 replace하고 parent를 fsync합니다. | 관측 가능한 final path는 incomplete reservation에서 complete directory로 한 번에 바뀝니다. |
| 6999190ffd34 | tools/stack_backup.py | finally service recovery / cleanup | 성공·실패·signal 모두에서 Nginx/WordPress를 다시 시작하고 temporary/reservation/ready state를 정리하며 recovery failure를 숨기지 않습니다. | failed backup이 source stack을 degraded 상태로 남기지 않는 반대 보장을 시도합니다. |

#### 비교 기준

- exact commit diff: `git diff 6999190ffd34^ 6999190ffd34 -- <path>`
- 이전 Thread 상태와 비교: `git diff 0540ff1b5a4b 6999190ffd34 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### S-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 이 commit 직전 상태 | 개별 stream capture만으로는 DB와 filesystem 사이 write가 끼거나 한 artifact만 final에 보이는 partial set, cancellation 뒤 stopped services가 생길 수 있었습니다. |
| 해결하려던 문제 | capture/validation/sync/identity/rename 어느 단계 실패든 final complete directory를 게시하지 않습니다. finally는 services를 복구하며 복구 실패는 primary error에 추가됩니다. |
| 기존 설계가 충분하지 않았던 이유 | 개별 stream capture만으로는 DB와 filesystem 사이 write가 끼거나 한 artifact만 final에 보이는 partial set, cancellation 뒤 stopped services가 생길 수 있었습니다. capture/validation/sync/identity/rename 어느 단계 실패든 final complete directory를 게시하지 않습니다. finally는 services를 복구하며 복구 실패는 primary error에 추가됩니다. |
| 핵심 결정 | writers stop, private sibling capture, manifest/checksum/sync, exact reservation, atomic directory replace, unconditional service recovery를 하나의 locked transaction으로 연결했습니다. |
| 주요 caller → callee / producer → consumer | `tools/stack_backup.py`의 `backup orchestration`; `tools/stack_backup.py`의 `private sibling capture`; `tools/stack_backup.py`의 `validate/checksum/manifest/sync`; `tools/stack_backup.py`의 `reservation identity + atomic replace`; `tools/stack_backup.py`의 `finally service recovery / cleanup` |
| authoritative state와 publication boundary | backup operation이 일시적으로 application writer lifecycle과 unpublished artifacts를 소유합니다. publication 후에는 final directory와 manifest가 authoritative backup unit입니다. 성공 시 세 파일의 complete checksummed set만 final path에 보이고, 실패/취소 시 plausible final set이 없으며 source application services가 복구됩니다. |
| ownership / lifetime / responsibility 변화 | backup operation이 일시적으로 application writer lifecycle과 unpublished artifacts를 소유합니다. publication 후에는 final directory와 manifest가 authoritative backup unit입니다. |
| failure scenario와 recovery path | capture/validation/sync/identity/rename 어느 단계 실패든 final complete directory를 게시하지 않습니다. finally는 services를 복구하며 복구 실패는 primary error에 추가됩니다. |
| 이 commit이 보장하는 것 | 성공 시 세 파일의 complete checksummed set만 final path에 보이고, 실패/취소 시 plausible final set이 없으며 source application services가 복구됩니다. |
| 아직 보장하지 않는 것 | MariaDB transaction 밖의 storage-level crash semantics, lock을 무시하는 외부 writer, remote filesystem rename semantics는 보장하지 않습니다. |
| 후속 fix / test와 연결 | `b6920a0c918c`이 failure/signal/lock cleanup을, `030e7310c665`가 signal race와 large stream을 검증합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: MariaDB transaction 밖의 storage-level crash semantics, lock을 무시하는 외부 writer, remote filesystem rename semantics는 보장하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `b6920a0c918c`이 failure/signal/lock cleanup을, `030e7310c665`가 signal race와 large stream을 검증합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: 성공 시 세 파일의 complete checksummed set만 final path에 보이고, 실패/취소 시 plausible final set이 없으며 source application services가 복구됩니다.

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

- `tests/runtime_stack.py`의 `backup failure-stage matrix`에서 production backup control flow의 여러 durable boundary를 결정적으로 통과합니다.
- `tests/runtime_stack.py`의 `negative filesystem assertions`에서 failed attempt가 plausible backup 흔적을 남기지 않음을 확인합니다.
- `tests/runtime_stack.py`의 `service health / lock contention`에서 recovery와 fixed project lock identity를 함께 검증합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| b6920a0c918c | tests/runtime_stack.py | backup failure-stage matrix | DB dump, archive, manifest, sync, publication 전후의 named pause/failure stage에서 command failure 또는 signal을 주입합니다. | production backup control flow의 여러 durable boundary를 결정적으로 통과합니다. |
| b6920a0c918c | tests/runtime_stack.py | negative filesystem assertions | final output, sibling temporary, reservation/ready marker가 남지 않고 기존 destination은 변경되지 않았는지 검사합니다. | failed attempt가 plausible backup 흔적을 남기지 않음을 확인합니다. |
| b6920a0c918c | tests/runtime_stack.py | service health / lock contention | 실패 뒤 Nginx/WordPress가 healthy인지 확인하고 다른 TMPDIR process가 같은 project lock을 얻지 못하는지 검사합니다. | recovery와 fixed project lock identity를 함께 검증합니다. |

#### 비교 기준

- exact commit diff: `git diff b6920a0c918c^ b6920a0c918c -- <path>`
- 이전 Thread 상태와 비교: `git diff 6999190ffd34 b6920a0c918c -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### 테스트 학습 기록

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariant | 실패하거나 취소된 backup은 complete final set을 게시하지 않고 temporary/control state를 지우며 source services를 복구합니다. |
| 재현하는 failure / boundary | capture·manifest·sync·publish 경계의 injected failure/SIGINT/SIGTERM과 cross-TMPDIR lock contention입니다. |
| test technique | deterministic pause/failure injection + live Docker negative integration |
| fixture와 failure injection | healthy source stack과 private destination parent를 만든 뒤 named stage ready file에서 backup subprocess를 실패시키거나 signal합니다. |
| 실제 통과하는 production path | Make/CLI→project lock→writer stop→stream capture→publication/cleanup→service restart 경로를 통과합니다. |
| 핵심 assertion | final/temp/reservation/ready/lock 부재, existing output 보존, service health와 retry 가능성을 확인합니다. |
| 이 테스트가 증명하는 것 | handler를 통과하는 failure/signal에서 all-or-nothing publication과 source recovery가 적용됨을 증명합니다. |
| 이 테스트가 증명하지 않는 것 | SIGKILL·storage failure·uncooperative external writer는 증명하지 않습니다. |
| 성격 | deterministic negative runtime regression |
| 막는 후속 regression | partial backup 노출, stale lock/control file, cancellation 뒤 application service 중단을 막습니다. |
| 직접 실행 command와 결과 | 실행하지 않았습니다. 현재 환경에는 Docker와 로컬 repository checkout이 없습니다. 해당 SHA의 test code와 command wiring만 검사했습니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: SIGKILL, 실제 disk power loss, 모든 filesystem 구현의 durability는 증명하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `030e7310c665`가 repeated signal race와 large input/collision edge를 더합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: ordinary failure와 controlled signal이 non-publication, cleanup, source service recovery로 수렴하고 same-project lock이 공유됨을 증명합니다.

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

- `tests/runtime_stack.py`의 `large backup fixtures`에서 streaming path가 작은 fixture를 메모리에 우연히 맞춰 처리한 것이 아님을 확인합니다.
- `tests/runtime_stack.py`의 `repeated pause/signal race`에서 signal mask/ready protocol의 timing contract를 압박합니다.
- `tests/runtime_stack.py`의 `collision fixtures`에서 backup/restore resource identity 검사의 coverage를 넓힙니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 030e7310c665 | tests/runtime_stack.py | large backup fixtures | WordPress에 약 32 MiB file과 MariaDB에 약 4 MiB value를 만들고 backup/restore artifact의 length와 SHA-256을 비교합니다. | streaming path가 작은 fixture를 메모리에 우연히 맞춰 처리한 것이 아님을 확인합니다. |
| 030e7310c665 | tests/runtime_stack.py | repeated pause/signal race | ready publication과 signal 전달 경계를 반복 실행해 marker가 보였는데 process가 아직 pause하지 않았거나 cleanup이 누락되는 race를 탐지합니다. | signal mask/ready protocol의 timing contract를 압박합니다. |
| 030e7310c665 | tests/runtime_stack.py | collision fixtures | stopped·unlabelled container/volume/network와 destination collision을 만들어 label-only 또는 running-only 검사가 놓치는 edge를 검사합니다. | backup/restore resource identity 검사의 coverage를 넓힙니다. |

#### 비교 기준

- exact commit diff: `git diff 030e7310c665^ 030e7310c665 -- <path>`
- 이전 Thread 상태와 비교: `git diff b6920a0c918c 030e7310c665 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### 테스트 학습 기록

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariant | backup/restore stream은 큰 input에서도 truncate하지 않고 signal/collision 경계에서 안전하게 실패합니다. |
| 재현하는 failure / boundary | large artifact, repeated ready/signal race, stopped 또는 unlabelled pre-existing resource입니다. |
| test technique | boundary/large-fixture runtime regression + repeated deterministic signal injection |
| fixture와 failure injection | 32 MiB filesystem file, 4 MiB DB value, collision Docker objects와 반복 signal run을 만듭니다. |
| 실제 통과하는 production path | 실제 backup capture/publication 및 restore validation/injection/resource discovery 경로를 통과합니다. |
| 핵심 assertion | source/restored length·digest, failure non-publication, pre-existing object 보존, cleanup outcome을 확인합니다. |
| 이 테스트가 증명하는 것 | stream-oriented implementation과 broadened collision/signal contract가 작은 happy path를 넘어 유지됨을 증명합니다. |
| 이 테스트가 증명하지 않는 것 | 모든 data distribution·filesystem·scheduler interleaving은 증명하지 않습니다. |
| 성격 | large boundary and race regression |
| 막는 후속 regression | whole-buffer 구현, truncation, label-only collision lookup, ready/signal marker race 회귀를 막습니다. |
| 직접 실행 command와 결과 | 실행하지 않았습니다. 현재 환경에는 Docker와 로컬 repository checkout이 없습니다. 해당 SHA의 test code와 command wiring만 검사했습니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: 무한 크기, 모든 signal interleaving, remote filesystem/object store는 증명하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: Thread 5의 restore large/collision evidence에도 같은 commit이 사용됩니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: streaming correctness와 pause/signal synchronization이 현실적인 크기와 반복 timing에서도 유지되고 resource collision detection이 label에만 의존하지 않음을 증명합니다.

## Invariant ledger

| Source에서 연결된 invariant | 처음/초기 단계 | 강화·교정 단계 | 검증 단계 | 학습자가 확인한 실제 근거 |
| --- | --- | --- | --- | --- |
| backup output file은 처음부터 private하고 기존 path를 덮어쓰지 않습니다. | fdd55605ba74 | 0540ff1b5a4b | b6920a0c918c | exclusive 0600 file와 destination reservation/identity check, existing-output negative assertion이 연결됩니다. |
| 같은 project의 backup은 다른 mutating management operation과 겹치지 않습니다. | 3a0995ff0d4f | 6999190ffd34 | b6920a0c918c cross-TMPDIR contention | project-name-derived lock을 transaction 전체에서 보유하고 TMPDIR 변경으로 우회되지 않습니다. |
| published backup set은 DB dump, WordPress archive, matching manifest의 완전한 단위입니다. | b478b5243c5a, 0540ff1b5a4b | 6999190ffd34 | b6920a0c918c, 030e7310c665 | private capture→checksum manifest→sync→atomic directory replace와 digest/length assertions가 연결됩니다. |
| 실패하거나 취소된 backup은 plausible final set을 남기지 않고 application services를 복구합니다. | 6999190ffd34 | b6920a0c918c | 030e7310c665 | finally recovery와 negative final/temp/ready/service assertions가 반대 상태를 검증합니다. |

### Ledger 보완 기록

- source에 명시되지 않은 새 invariant를 확정 사실로 추가하지 않습니다.
- invariant가 실제로 부족했음을 드러낸 commit 또는 failure stage: DB dump와 WordPress archive를 순차적으로 final path에 쓰면 두 artifact 중 하나만 보이는 plausible partial backup과 writer 중단 뒤 degraded source stack이 남을 수 있었습니다.
- marker, rename, lock, health, authentication, cleanup 등 invariant를 고정하는 concrete mechanism: private O_EXCL files, fsync/checksum/manifest, inode-checked reservation, application-writer quiescence, directory replacement와 service recovery가 publication boundary를 고정합니다.
- 후속 commit이 invariant를 약화하지 못하게 하는 regression evidence: `b6920a0c918c` negative scenarios와 `030e7310c665` signal-race/large-fixture checks가 non-publication, cleanup, recovery와 streaming boundary를 보호합니다.
## Failure → Fix → Test 연결

| failure / 위험 | fix 또는 mechanism | test / evidence | 학습자 연결 기록 |
| --- | --- | --- | --- |
| DB dump와 filesystem archive 사이 write 또는 partial files 노출 | 6999190ffd34의 writers stop + sibling temp + manifest + atomic replace | b6920a0c918c publication failure/signal non-publication | capture와 publication을 분리하고 final path를 complete set에만 부여합니다. |
| destination validation 뒤 symlink/object replacement | 0540ff1b5a4b parent resolution과 device/inode reservation | unsafe destination/collision runtime cases | pathname equality 대신 actual reserved object identity를 재확인합니다. |
| asynchronous signal로 cleanup timing과 ready marker 불일치 | d26c885c5cd5 signal-to-exception과 masked ready publication | 030e7310c665 repeated pause/signal race | test와 production이 같은 named stage handoff를 사용합니다. |
| small fixture에서만 streaming이 우연히 동작 | b478b5243c5a stream capture | 030e7310c665 32 MiB/4 MiB checksum·length | whole-buffer assumption과 truncation을 별도 boundary test로 막습니다. |

### 직접 재구성할 chain

```text
기존 가정: 각 artifact command가 성공하면 backup directory를 유효하다고 볼 수 있다는 가정
  → 실제 failure 또는 위험: 중간 failure·signal에서 일부 file, temporary sibling, stopped services가 남고 final path가 완전한 set처럼 보일 수 있었습니다.
  → root cause: data capture와 publication이 같은 pathname lifecycle에 섞였고 cancellation이 ordinary failure cleanup과 일치하지 않았습니다.
  → 수정된 invariant / decision: 모든 artifact를 private staging에 capture·sync·checksum한 뒤 manifest를 포함한 directory 전체만 inode-checked destination에 원자 게시합니다.
  → 해당 SHA의 실제 수정 코드: `6999190ffd34`의 stop→capture→manifest→rename→recover transaction
  → failure injection 또는 regression test: `b6920a0c918c` injected failure/signal matrix와 `030e7310c665` race/large fixtures
  → 증명된 보장 / 남은 비보장: success에는 정확한 세 파일만 보이고 failure에는 published set과 temporary state가 없으며 source health가 회복되지만 cross-filesystem rename은 허용하지 않습니다.
```

## Ownership / state / responsibility 변화

| 대상 | 이전 상태 | 이후 책임/authoritative state | 확인할 근거 | 학습자 결론 |
| --- | --- | --- | --- | --- |
| Source stack services | 모두 running | backup이 writer quiescence와 recovery를 일시 소유 | 6999190ffd34 stop/start/finally | MariaDB는 dump 동안 running, Nginx/WordPress는 capture cut을 위해 중지됩니다. |
| Temporary sibling directory | 없음 | unpublished dump/archive/manifest를 독점 보유 | exclusive creation, sync, cleanup | 실패 시 제거되고 final consumer는 볼 수 없습니다. |
| Reserved destination | user path 문자열 | empty private inode가 publication slot 역할 | 0540ff1b5a4b dev/inode check | 정확히 예약한 object만 replace 대상입니다. |
| Published backup set | 개별 artifact | manifest가 artifact identity/checksum을 묶는 authoritative unit | 6999190ffd34 manifest/schema/digest | 세 파일 전체가 restore input 단위입니다. |
| Signal/pause state | OS의 비동기 종료 | normal cleanup path와 deterministic test handoff | d26c885c5cd5 handler/ready lifecycle | signal을 ordinary failure semantics로 수렴시킵니다. |

## Thread 최종 상태

- **Source-confirmed endpoint:** The implementation deliberately separates data capture from publication. Private streaming files, an exact output reservation, a manifest, and directory replacement ensure that only a complete set becomes visible. Signal-aware recovery and negative runtime tests establish the equally important converse: cancelled or failed work must not leave a plausible backup or a degraded source stack.
- 최종 authoritative state와 owner: final backup directory와 manifest가 complete set의 authoritative state이며 source MariaDB/WordPress volumes는 원본 state owner로 남습니다.
- 정상 실행의 entry point와 완료 조건: locked backup이 source validation, writer stop, two-stream capture, validation/checksum/sync, atomic publication, service recovery를 끝내면 완료입니다.
- failure 또는 interruption 뒤 retry/rollback/compensation 조건: failure/signal 시 temporary/reservation/control state를 제거하고 source services를 재시작합니다. service recovery failure는 primary failure와 함께 보고합니다.
- 이 Thread가 다른 Thread에 제공하는 전제: Thread 5 restore가 stable descriptor로 열고 검증할 private checksummed input을 제공합니다.
- 이 Thread 단독으로는 증명하지 않는 것: Docker 미설치 환경에서는 runtime failure matrix를 실행하지 않았으며 코드에 구현된 mechanism만 확인했습니다.

## 최종 architecture 또는 execution flow 정리

| 단계 | 확인할 흐름 | 실제 코드 근거 | 정상 전이 | 실패·정리·재시도 |
| --- | --- | --- | --- | --- |
| 1 | lock/signal 설정 | 3a0995ff0d4f + d26c885c5cd5 | same-project serialization과 cancellation exception을 설정합니다. | contention/signal이면 mutation 전 또는 common cleanup path로 실패합니다. |
| 2 | source/destination 검증 | 0540ff1b5a4b + 6999190ffd34 | services/secrets와 exact destination reservation을 확인합니다. | unsafe/existing/mismatched path면 writer를 멈추지 않고 거부합니다. |
| 3 | writers quiesce | 6999190ffd34 backup orchestration | Nginx와 WordPress를 중지하고 MariaDB는 transaction dump를 위해 유지합니다. | stop failure면 capture를 진행하지 않고 recovery를 시도합니다. |
| 4 | stream capture | b478b5243c5a helpers | DB dump와 WordPress archive를 private sibling files에 씁니다. | subprocess/stream/archive failure면 temp를 제거합니다. |
| 5 | manifest/durability | fdd55605ba74 + 6999190ffd34 | digest/size/manifest와 file/directory fsync를 완료합니다. | 검증/sync 실패면 final path에 complete set을 게시하지 않습니다. |
| 6 | atomic publication | 0540ff1b5a4b + 6999190ffd34 | reservation identity 후 sibling directory를 final path로 replace합니다. | identity mismatch/rename 실패는 non-publication입니다. |
| 7 | service recovery/cleanup | 6999190ffd34 finally | 성공·실패 모두에서 application services를 healthy로 되돌립니다. | recovery failure는 숨기지 않고 operation result를 실패로 유지합니다. |

### 학습자의 최종 설명

> backup은 파일 두 개를 만드는 작업이 아니라 source writer를 일시 정지하고 complete set을 한 번에 공개하는 transaction입니다. DB는 running MariaDB의 single-transaction stream으로, WordPress는 read-only volume archive stream으로 private sibling에 수집됩니다. output pathname은 미리 private inode로 예약되고 publication 직전 device/inode가 다시 확인됩니다. archive 검증과 checksum manifest, file/directory sync가 끝난 directory만 final path로 atomic replace됩니다. ordinary failure와 SIGINT/SIGTERM은 같은 finally로 들어가 temp/control state를 제거하고 Nginx/WordPress를 복구합니다. negative tests는 “성공한 backup이 맞다”뿐 아니라 “실패한 시도는 plausible set과 degraded source를 남기지 않는다”는 반대 invariant를 검사합니다.

## 학습 완료 자가 점검

- [x] 두 artifact의 생성 성공을 atomic publication과 같은 의미로 썼습니까?
- [x] file fsync와 containing directory fsync의 역할을 구분했습니까?
- [x] MariaDB까지 멈춘다고 잘못 설명하지 않았습니까?
- [x] failure 뒤 source services recovery 실패가 별도 오류로 surfaced되는지 확인했습니까?
- [x] signal test의 ready marker가 sleep 기반 동기화가 아니라는 점을 코드로 확인했습니까?
- [x] 모든 code snippet에 SHA와 path/symbol을 기록했습니다.
- [x] final HEAD의 field/helper/test를 이전 SHA에 소급하지 않았습니다.
- [x] source가 확정하지 않은 사실을 추정으로 채우지 않았습니다.
- [x] test가 증명하는 것과 증명하지 않는 것을 구분했습니다.
- [x] 이 Thread를 commit 순서대로 구두 설명할 수 있습니다.
