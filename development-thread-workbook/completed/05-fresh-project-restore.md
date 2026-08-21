# Thread 5 — Verified fresh-project restore with cleanup rollback

## Thread 목표

backup을 기존 state 위에 덮는 작업이 아니라 완전히 fresh한 Compose project를 생성하는 transaction으로 정의하고, verified input·streaming injection·failure rollback을 통해 all-or-nothing restore를 복원합니다.

**Source significance**

> Restore is treated as creation of a new project, not as an in-place overwrite. That constraint makes rollback tractable: verified input is applied only after collision checks, and any failure removes the resources created by the attempt. The later tests show that refusal preserves pre-existing objects and that the streaming implementation remains correct beyond small fixtures.

## 이 Thread를 이해하기 위한 핵심 질문

- restore target이 반드시 empty namespace여야 rollback ownership이 단순해지는 이유는 무엇입니까?
- Compose label만으로 collision을 찾지 못하는 경우와 exact rendered name만으로 부족한 경우는 무엇입니까?
- backup path를 반복 resolve하지 않고 descriptor-anchored object로 유지하는 이유는 무엇입니까?
- archive validation과 empty-volume precondition은 각각 어떤 write/merge 위험을 막습니까?
- `compose down --volumes` 실행 성공만으로 rollback complete라고 할 수 없는 이유는 무엇입니까?
- restore failure와 cleanup failure가 동시에 발생할 때 오류 context는 어떻게 보존됩니까?

## 완료 기준

- fresh-target detection이 label, exact names, rendered volume/network names를 모두 사용하는 이유를 확인했습니다.
- `VerifiedBackup`이 directory descriptor와 opened streams를 restore 종료까지 유지하는 경계를 추적했습니다.
- SQL import와 WordPress extraction이 empty new volumes에 streaming으로 적용되는 경로를 확인했습니다.
- failure 이후 Compose cleanup과 independent resource enumeration이 모두 통과해야 하는 조건을 기록했습니다.
- malformed input, signal, injected failure, pre-existing collision, successful restore, second restore refusal을 분리했습니다.

## Commit map

| 순서 | SHA | Subject | Importance | Tags | Source-defined role |
| --- | --- | --- | --- | --- | --- |
| 1 | `e5cb60c7d743` | feat(restore): Compose 리소스 이름과 기존 객체 조회 | **B** | `PERSISTENCE`<br>`OPERATIONS` | Mapped rendered and conventionally named Docker resources. |
| 2 | `851dc1708881` | feat(restore): 대상 프로젝트 자원 충돌 사전 차단 | **A** | `PERSISTENCE`<br>`RISK`<br>`EDGE` | Made an empty target project a restore precondition. |
| 3 | `953a0f6bd571` | feat(restore): 백업 입력의 형식과 체크섬 검증 | **A** | `PERSISTENCE`<br>`RISK`<br>`EDGE` | Established the private, locked, checksummed backup input boundary. |
| 4 | `1250fcf7c006` | feat(restore): DB와 WordPress 데이터를 새 볼륨에 주입 | **B** | `PERSISTENCE`<br>`INTEGRATION` | Injected SQL and WordPress streams into empty new volumes. |
| 5 | `9ca04b1c30cd` | feat(restore): 실패한 복원 자원을 정리하고 롤백 | **S** | `PERSISTENCE`<br>`RECOVERY`<br>`HARD` | Orchestrated startup and removed every partial resource after failure. |
| 6 | `3a37a491ecea` | feat(restore): 복원 CLI와 Make 타깃 연결 | **B** | `PERSISTENCE`<br>`OPERATIONS` | Exposed restore through the CLI and Makefile. |
| 7 | `4f8eb9aff842` | test(restore): 거부·롤백·복원 상태 검증 | **A** | `TEST`<br>`RECOVERY`<br>`RISK` | Verified malformed input refusal, failure cleanup, interruption, and successful state. |
| 8 | `030e7310c665` | test(backup): 자원 충돌과 시그널 경계 검증 | **A** | `TEST`<br>`PERSISTENCE`<br>`EDGE` | Added stopped and unlabelled collision cases plus large restored fixtures. |

> Commit 순서는 source의 Development Thread 정의를 그대로 따릅니다. 같은 SHA가 다른 Thread에도 있으면 이 문서의 관점으로 다시 확인합니다.

## Commit별 학습 기록

### 1. `e5cb60c7d743` — feat(restore): Compose 리소스 이름과 기존 객체 조회

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **B** |
| Tags | `PERSISTENCE`, `OPERATIONS` |
| Source-defined role | Mapped rendered and conventionally named Docker resources. |
| 이전 Thread commit | 없음 |
| 다음 Thread commit | `851dc1708881` |

#### 원문이 확정한 범위

- **Summary:** Adds discovery of rendered Compose resource names and existing labelled or conventionally named objects.
- **Classification reason:** This is necessary restore plumbing, but it mainly inventories resources within the restore architecture developed by subsequent commits.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `e5cb60c7d743`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `tools/stack_backup.py`의 `rendered resource-name helpers`에서 restore가 실제 Docker object 이름을 mutation 전에 계산합니다.
- `tools/stack_backup.py`의 `expected container-name candidates`에서 label이 없거나 stopped인 object도 exact name으로 찾을 후보를 확보합니다.
- `tools/stack_backup.py`의 `list labelled/exact resources`에서 한 discovery 방식의 누락을 다른 방식으로 보완합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| e5cb60c7d743 | tools/stack_backup.py | rendered resource-name helpers | rendered Compose JSON에서 volume/network의 concrete name을 읽고 explicit `name`과 project-prefixed default를 구분합니다. | restore가 실제 Docker object 이름을 mutation 전에 계산합니다. |
| e5cb60c7d743 | tools/stack_backup.py | expected container-name candidates | service와 one-off bootstrap container의 current/legacy Compose naming form을 project/service/index 조합으로 만듭니다. | label이 없거나 stopped인 object도 exact name으로 찾을 후보를 확보합니다. |
| e5cb60c7d743 | tools/stack_backup.py | list labelled/exact resources | containers, volumes, networks를 project label과 exact expected name 양쪽으로 query합니다. | 한 discovery 방식의 누락을 다른 방식으로 보완합니다. |

#### B-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| Thread에서 맡은 구현 역할 | Mapped rendered and conventionally named Docker resources. |
| 핵심 input / output / state | host restore process가 target project의 expected resource identity와 discovery 결과를 소유합니다. |
| 변경된 directive / helper / command | `tools/stack_backup.py`의 `rendered resource-name helpers`; `tools/stack_backup.py`의 `expected container-name candidates`; `tools/stack_backup.py`의 `list labelled/exact resources` |
| immediate failure 또는 boundary | Compose config rendering 실패, Docker query timeout/nonzero, ambiguous/malformed output은 mutation 전에 restore-domain error가 됩니다. |
| 다음 commit에 넘긴 한계 | 열거 결과를 fresh-target precondition으로 강제하거나 실패 시 cleanup하는 orchestration은 아직 없습니다. `851dc1708881`이 이 inventory를 restore 시작 전 emptiness gate로 사용합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: 열거 결과를 fresh-target precondition으로 강제하거나 실패 시 cleanup하는 orchestration은 아직 없습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `851dc1708881`이 이 inventory를 restore 시작 전 emptiness gate로 사용합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: target project에 관련될 수 있는 concrete resource names와 existing objects를 체계적으로 열거할 수 있습니다.

### 2. `851dc1708881` — feat(restore): 대상 프로젝트 자원 충돌 사전 차단

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `PERSISTENCE`, `RISK`, `EDGE` |
| Source-defined role | Made an empty target project a restore precondition. |
| 이전 Thread commit | `e5cb60c7d743` |
| 다음 Thread commit | `953a0f6bd571` |

#### 원문이 확정한 범위

- **Summary:** Rejects restore targets that already contain matching containers, volumes, or networks.
- **Classification reason:** Fresh-project enforcement prevents restore from overwriting or mixing with live state and establishes a significant safety precondition for all later restore steps.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `851dc1708881`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `tools/stack_backup.py`의 `ensure_fresh_project`에서 stopped·unlabelled·partially created object까지 preflight 범위에 넣습니다.
- `tools/stack_backup.py`의 `collision report`에서 기존 object를 지우거나 덮어쓰는 대신 operator에게 소유권 충돌을 보여줍니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 851dc1708881 | tools/stack_backup.py | ensure_fresh_project | project label로 containers/volumes/networks를 찾고 rendered exact volume/network names와 expected current/legacy container names를 추가로 확인합니다. | stopped·unlabelled·partially created object까지 preflight 범위에 넣습니다. |
| 851dc1708881 | tools/stack_backup.py | collision report | 발견한 kind/name을 모아 하나라도 있으면 restore mutation 전에 명시적인 refusal error를 만듭니다. | 기존 object를 지우거나 덮어쓰는 대신 operator에게 소유권 충돌을 보여줍니다. |

#### 비교 기준

- exact commit diff: `git diff 851dc1708881^ 851dc1708881 -- <path>`
- 이전 Thread 상태와 비교: `git diff e5cb60c7d743 851dc1708881 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | 기존 project에 restore하면 unrelated data와 merge/overwrite되고 실패 rollback 때 어떤 object가 원래 있었는지 구분하기 어렵습니다. |
| 선택한 boundary / decision | target namespace가 완전히 비어 있다는 것을 restore transaction의 필수 사전 조건으로 만들었습니다. |
| 핵심 caller/callee 또는 configuration consumer | `tools/stack_backup.py`의 `ensure_fresh_project`; `tools/stack_backup.py`의 `collision report` |
| state / ownership / lifecycle 변화 | preflight 성공 뒤 restore attempt가 target project에서 새로 생기는 모든 object를 독점 소유한다고 추론할 수 있습니다. |
| 주요 failure branch | labelled/exact/rendered 이름 중 하나라도 존재하면 input을 쓰기 전에 실패합니다. 발견된 기존 object는 수정하거나 제거하지 않습니다. |
| 이 commit의 보장 | restore는 fresh project 생성으로만 시작하며 rollback ownership을 새 attempt가 만든 resource로 한정합니다. |
| 한계와 다음 관련 commit | preflight 직후 외부 actor가 같은 name을 만드는 race를 완전히 막지는 않으며 actual Docker create error도 처리해야 합니다. `9ca04b1c30cd`이 project lock과 cleanup rollback 안에서 이 precondition을 재사용하고 tests가 collision 보존을 검증합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: preflight 직후 외부 actor가 같은 name을 만드는 race를 완전히 막지는 않으며 actual Docker create error도 처리해야 합니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `9ca04b1c30cd`이 project lock과 cleanup rollback 안에서 이 precondition을 재사용하고 tests가 collision 보존을 검증합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: restore는 fresh project 생성으로만 시작하며 rollback ownership을 새 attempt가 만든 resource로 한정합니다.

### 3. `953a0f6bd571` — feat(restore): 백업 입력의 형식과 체크섬 검증

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `PERSISTENCE`, `RISK`, `EDGE` |
| Source-defined role | Established the private, locked, checksummed backup input boundary. |
| 이전 Thread commit | `851dc1708881` |
| 다음 Thread commit | `1250fcf7c006` |

#### 원문이 확정한 범위

- **Summary:** Opens a private backup set with no-follow and locking checks, validates its exact files, manifest format, checksums, and archive structure.
- **Classification reason:** This creates the restore trust boundary. It ensures restoration consumes one stable, owner-controlled, internally consistent backup rather than mutable or substituted input.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `953a0f6bd571`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `tools/stack_backup.py`의 `VerifiedBackup`에서 user pathname을 한 번 검증한 stable directory object로 고정합니다.
- `tools/stack_backup.py`의 `openat-style artifact opens / shared locks`에서 검증 후 pathname substitution과 concurrent writer 변경을 줄입니다.
- `tools/stack_backup.py`의 `manifest/schema/checksum/archive validation`에서 restore mutation 전에 input completeness와 구조를 증명합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 953a0f6bd571 | tools/stack_backup.py | VerifiedBackup | backup directory를 no-follow descriptor로 열고 owner/mode/type/link를 검사한 뒤 expected artifact names만 허용합니다. | user pathname을 한 번 검증한 stable directory object로 고정합니다. |
| 953a0f6bd571 | tools/stack_backup.py | openat-style artifact opens / shared locks | directory descriptor를 기준으로 DB dump, WordPress archive, manifest를 다시 no-follow로 열고 regular/single-link/private 조건과 shared lock을 유지합니다. | 검증 후 pathname substitution과 concurrent writer 변경을 줄입니다. |
| 953a0f6bd571 | tools/stack_backup.py | manifest/schema/checksum/archive validation | manifest의 exact file set, size, SHA-256을 열린 stream과 비교하고 tar member path/type policy를 검사합니다. | restore mutation 전에 input completeness와 구조를 증명합니다. |

#### 비교 기준

- exact commit diff: `git diff 953a0f6bd571^ 953a0f6bd571 -- <path>`
- 이전 Thread 상태와 비교: `git diff 851dc1708881 953a0f6bd571 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | backup pathname을 단계마다 다시 열면 검증된 object와 실제 주입 object가 달라질 수 있고 malformed archive/checksum이 target을 일부 변경할 수 있었습니다. |
| 선택한 boundary / decision | directory와 artifact descriptors를 restore lifetime 동안 유지하는 `VerifiedBackup` boundary를 만들고 모든 형식·checksum 검증을 mutation보다 앞에 배치했습니다. |
| 핵심 caller/callee 또는 configuration consumer | `tools/stack_backup.py`의 `VerifiedBackup`; `tools/stack_backup.py`의 `openat-style artifact opens / shared locks`; `tools/stack_backup.py`의 `manifest/schema/checksum/archive validation` |
| state / ownership / lifecycle 변화 | VerifiedBackup object가 directory/file descriptors, shared locks, stream positions를 소유하고 restore orchestration은 이 stable handles만 소비합니다. |
| 주요 failure branch | symlink, wrong owner/mode/link/type, extra/missing file, malformed manifest, size/digest mismatch, unsafe archive member는 target resource 생성 전에 실패합니다. |
| 이 commit의 보장 | restore input이 private owner-controlled exact files의 checksummed structurally valid set이며 검증한 object와 사용하는 object가 같은 descriptor에 anchored됨을 보장합니다. |
| 한계와 다음 관련 commit | backup이 application-consistent하게 생성됐는지는 manifest만으로 다시 증명하지 않으며 그 속성은 Thread 4 publication 과정에 의존합니다. `1250fcf7c006`이 retained streams를 fresh volumes에 직접 주입하고 `4f8eb9aff842`이 malformed/symlink input refusal을 검증합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: backup이 application-consistent하게 생성됐는지는 manifest만으로 다시 증명하지 않으며 그 속성은 Thread 4 publication 과정에 의존합니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `1250fcf7c006`이 retained streams를 fresh volumes에 직접 주입하고 `4f8eb9aff842`이 malformed/symlink input refusal을 검증합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: restore input이 private owner-controlled exact files의 checksummed structurally valid set이며 검증한 object와 사용하는 object가 같은 descriptor에 anchored됨을 보장합니다.

### 4. `1250fcf7c006` — feat(restore): DB와 WordPress 데이터를 새 볼륨에 주입

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **B** |
| Tags | `PERSISTENCE`, `INTEGRATION` |
| Source-defined role | Injected SQL and WordPress streams into empty new volumes. |
| 이전 Thread commit | `953a0f6bd571` |
| 다음 Thread commit | `9ca04b1c30cd` |

#### 원문이 확정한 범위

- **Summary:** Imports the SQL stream into MariaDB and extracts the WordPress archive only into empty data and config volumes.
- **Classification reason:** It is core restore work, but the implementation follows the already-defined verified-input and fresh-target contracts; rollback and lifecycle safety arrive later.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `1250fcf7c006`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `tools/stack_backup.py`의 `database restore helper`에서 large dump를 host memory에 전부 올리지 않고 DB service interface로 주입합니다.
- `tools/stack_backup.py`의 `WordPress extraction helper`에서 host가 Docker volume path를 직접 탐색하지 않습니다.
- `tools/stack_backup.py`의 `empty mount checks`에서 기존 state와 archive를 합치는 in-place overwrite를 막습니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 1250fcf7c006 | tools/stack_backup.py | database restore helper | fresh MariaDB bootstrap을 완료한 뒤 retained SQL stream을 client stdin으로 전달해 import합니다. | large dump를 host memory에 전부 올리지 않고 DB service interface로 주입합니다. |
| 1250fcf7c006 | tools/stack_backup.py | WordPress extraction helper | new WordPress data/config volumes를 one-off container에 mount하고 validated archive stream을 tar stdin으로 전달합니다. | host가 Docker volume path를 직접 탐색하지 않습니다. |
| 1250fcf7c006 | tools/stack_backup.py | empty mount checks | extraction 전에 target mount roots가 비어 있는지 검사하고 expected root mapping 외 merge를 거부합니다. | 기존 state와 archive를 합치는 in-place overwrite를 막습니다. |

#### 비교 기준

- exact commit diff: `git diff 1250fcf7c006^ 1250fcf7c006 -- <path>`
- 이전 Thread 상태와 비교: `git diff 953a0f6bd571 1250fcf7c006 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### B-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| Thread에서 맡은 구현 역할 | Injected SQL and WordPress streams into empty new volumes. |
| 핵심 input / output / state | MariaDB client가 relational import를, one-off tar container가 filesystem extraction을 소유합니다. VerifiedBackup은 source stream descriptors를 끝까지 유지합니다. |
| 변경된 directive / helper / command | `tools/stack_backup.py`의 `database restore helper`; `tools/stack_backup.py`의 `WordPress extraction helper`; `tools/stack_backup.py`의 `empty mount checks` |
| immediate failure 또는 boundary | empty precondition 위반, client/tar timeout/nonzero, broken pipe, extraction policy failure는 partial restore error가 됩니다. |
| 다음 commit에 넘긴 한계 | import 중간 실패 뒤 partial volumes를 제거하거나 full application health까지 수렴하는 rollback은 아직 보장하지 않습니다. `9ca04b1c30cd`이 primitives를 transaction으로 묶고 실패 시 created resources를 제거합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: import 중간 실패 뒤 partial volumes를 제거하거나 full application health까지 수렴하는 rollback은 아직 보장하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `9ca04b1c30cd`이 primitives를 transaction으로 묶고 실패 시 created resources를 제거합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: validated backup streams를 새 DB/WordPress volumes에 bounded-memory 방식으로 주입할 수 있습니다.

### 5. `9ca04b1c30cd` — feat(restore): 실패한 복원 자원을 정리하고 롤백

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **S** |
| Tags | `PERSISTENCE`, `RECOVERY`, `HARD` |
| Source-defined role | Orchestrated startup and removed every partial resource after failure. |
| 이전 Thread commit | `1250fcf7c006` |
| 다음 Thread commit | `3a37a491ecea` |

#### 원문이 확정한 범위

- **Summary:** Orchestrates fresh database bootstrap, SQL import, WordPress extraction, application startup, and complete resource cleanup on any restore failure.
- **Classification reason:** This is the defining restore mechanism and its critical failure invariant. Without it, partial restoration could leave plausible but unusable project resources and make retries unsafe.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `9ca04b1c30cd`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `tools/stack_backup.py`의 `restore orchestration`에서 input/freshness 검증이 모든 target mutation보다 앞섭니다.
- `tools/stack_backup.py`의 `cleanup_failed_restore`에서 Compose가 아는 created resources의 일차 rollback을 수행합니다.
- `tools/stack_backup.py`의 `independent residual enumeration`에서 cleanup command 성공을 cleanup complete로 오인하지 않습니다.
- `tools/stack_backup.py`의 `error chaining / service convergence`에서 성공은 healthy stack, 실패는 zero-owned-resource state라는 양쪽 endpoint를 정의합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 9ca04b1c30cd | tools/stack_backup.py | restore orchestration | project lock과 signal handler 아래 VerifiedBackup 검증과 fresh-target check를 마친 뒤 MariaDB bootstrap, SQL import, WordPress extraction, normal application bootstrap/start를 순서대로 실행합니다. | input/freshness 검증이 모든 target mutation보다 앞섭니다. |
| 9ca04b1c30cd | tools/stack_backup.py | cleanup_failed_restore | 예외 또는 cancellation 시 `compose down --volumes --remove-orphans`를 실행하고 결과를 검사합니다. | Compose가 아는 created resources의 일차 rollback을 수행합니다. |
| 9ca04b1c30cd | tools/stack_backup.py | independent residual enumeration | down 성공 여부와 별도로 project label, rendered names, exact expected names를 다시 query해 containers/volumes/networks가 0인지 확인합니다. | cleanup command 성공을 cleanup complete로 오인하지 않습니다. |
| 9ca04b1c30cd | tools/stack_backup.py | error chaining / service convergence | primary restore error와 cleanup failure를 모두 보존하고 성공 path는 application services/health까지 완료합니다. | 성공은 healthy stack, 실패는 zero-owned-resource state라는 양쪽 endpoint를 정의합니다. |

#### 비교 기준

- exact commit diff: `git diff 9ca04b1c30cd^ 9ca04b1c30cd -- <path>`
- 이전 Thread 상태와 비교: `git diff 1250fcf7c006 9ca04b1c30cd -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### S-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 이 commit 직전 상태 | stream import/extraction 중 실패하면 새 DB row, partial files, containers/volumes/networks가 남아 다음 restore를 막거나 incomplete project처럼 보일 수 있었습니다. |
| 해결하려던 문제 | 어느 mutation 이후든 exception/signal은 cleanup path로 갑니다. down failure 또는 residual object는 별도 cleanup error로 보고되며 primary failure를 덮지 않습니다. |
| 기존 설계가 충분하지 않았던 이유 | stream import/extraction 중 실패하면 새 DB row, partial files, containers/volumes/networks가 남아 다음 restore를 막거나 incomplete project처럼 보일 수 있었습니다. 어느 mutation 이후든 exception/signal은 cleanup path로 갑니다. down failure 또는 residual object는 별도 cleanup error로 보고되며 primary failure를 덮지 않습니다. |
| 핵심 결정 | fresh namespace, verified input, ordered streaming injection, normal bootstrap reuse, unconditional compose cleanup와 independent zero-resource verification을 하나의 restore transaction으로 연결했습니다. |
| 주요 caller → callee / producer → consumer | `tools/stack_backup.py`의 `restore orchestration`; `tools/stack_backup.py`의 `cleanup_failed_restore`; `tools/stack_backup.py`의 `independent residual enumeration`; `tools/stack_backup.py`의 `error chaining / service convergence` |
| authoritative state와 publication boundary | preflight 뒤 target namespace의 새 resources는 restore attempt가 독점 소유합니다. 성공하면 새 project가 state owner가 되고 실패하면 owner가 만든 모든 object를 제거해야 합니다. 성공 시 backup state를 가진 healthy fresh project, 실패 시 attempt-owned Docker resource가 하나도 없는 상태를 목표로 하고 검증합니다. |
| ownership / lifetime / responsibility 변화 | preflight 뒤 target namespace의 새 resources는 restore attempt가 독점 소유합니다. 성공하면 새 project가 state owner가 되고 실패하면 owner가 만든 모든 object를 제거해야 합니다. |
| failure scenario와 recovery path | 어느 mutation 이후든 exception/signal은 cleanup path로 갑니다. down failure 또는 residual object는 별도 cleanup error로 보고되며 primary failure를 덮지 않습니다. |
| 이 commit이 보장하는 것 | 성공 시 backup state를 가진 healthy fresh project, 실패 시 attempt-owned Docker resource가 하나도 없는 상태를 목표로 하고 검증합니다. |
| 아직 보장하지 않는 것 | non-cooperating 외부 actor가 동시에 만든 exact object, Docker daemon crash 중 cleanup, physical storage remnants는 완전하게 보장하지 않습니다. |
| 후속 fix / test와 연결 | `4f8eb9aff842`이 malformed/refusal/injected failure/SIGINT/success/second-restore를 검증하고 `030e7310c665`이 collision/large cases를 확장합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: non-cooperating 외부 actor가 동시에 만든 exact object, Docker daemon crash 중 cleanup, physical storage remnants는 완전하게 보장하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `4f8eb9aff842`이 malformed/refusal/injected failure/SIGINT/success/second-restore를 검증하고 `030e7310c665`이 collision/large cases를 확장합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: 성공 시 backup state를 가진 healthy fresh project, 실패 시 attempt-owned Docker resource가 하나도 없는 상태를 목표로 하고 검증합니다.

### 6. `3a37a491ecea` — feat(restore): 복원 CLI와 Make 타깃 연결

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **B** |
| Tags | `PERSISTENCE`, `OPERATIONS` |
| Source-defined role | Exposed restore through the CLI and Makefile. |
| 이전 Thread commit | `9ca04b1c30cd` |
| 다음 Thread commit | `4f8eb9aff842` |

#### 원문이 확정한 범위

- **Summary:** Adds `restore` CLI dispatch and a guarded Make target.
- **Classification reason:** It exposes the completed restore path without materially changing its correctness or recovery model.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `3a37a491ecea`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `tools/stack_backup.py`의 `CLI restore subcommand`에서 operator-facing entry point가 internal helper와 같은 transaction을 사용합니다.
- `Makefile`의 `restore target`에서 manual command 조립을 줄이고 documented management path를 제공합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 3a37a491ecea | tools/stack_backup.py | CLI restore subcommand | backup path, project, env/Compose inputs를 parse하고 production restore orchestration을 호출하며 domain error를 nonzero exit로 변환합니다. | operator-facing entry point가 internal helper와 같은 transaction을 사용합니다. |
| 3a37a491ecea | Makefile | restore target | 명시적 backup source와 project/env variables를 CLI에 전달하는 target을 추가합니다. | manual command 조립을 줄이고 documented management path를 제공합니다. |

#### 비교 기준

- exact commit diff: `git diff 3a37a491ecea^ 3a37a491ecea -- <path>`
- 이전 Thread 상태와 비교: `git diff 9ca04b1c30cd 3a37a491ecea -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### B-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| Thread에서 맡은 구현 역할 | Exposed restore through the CLI and Makefile. |
| 핵심 input / output / state | CLI가 argument validation과 process exit status를 소유하고 transaction 자체의 resource ownership은 restore orchestration에 남습니다. |
| 변경된 directive / helper / command | `tools/stack_backup.py`의 `CLI restore subcommand`; `Makefile`의 `restore target` |
| immediate failure 또는 boundary | 필수 path/variable 누락과 RestoreError는 mutation 여부에 맞는 nonzero status와 stderr로 surfaced됩니다. |
| 다음 commit에 넘긴 한계 | CLI 연결 자체는 restore correctness나 cleanup을 추가로 증명하지 않습니다. `4f8eb9aff842`이 실제 command path로 failure와 success를 실행합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: CLI 연결 자체는 restore correctness나 cleanup을 추가로 증명하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `4f8eb9aff842`이 실제 command path로 failure와 success를 실행합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: documented command path가 동일 lock/input/freshness/rollback semantics를 사용함을 보장합니다.

### 7. `4f8eb9aff842` — test(restore): 거부·롤백·복원 상태 검증

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `TEST`, `RECOVERY`, `RISK` |
| Source-defined role | Verified malformed input refusal, failure cleanup, interruption, and successful state. |
| 이전 Thread commit | `3a37a491ecea` |
| 다음 Thread commit | `030e7310c665` |

#### 원문이 확정한 범위

- **Summary:** Tests symlinked backup rejection, injected and signalled restore failure cleanup, successful data recovery, and refusal to restore twice.
- **Classification reason:** These scenarios validate the restore security and rollback contracts against real Docker resources, significantly increasing confidence in a high-risk mechanism.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `4f8eb9aff842`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `tests/runtime_stack.py`의 `malformed/unsafe backup cases`에서 VerifiedBackup trust boundary의 negative evidence입니다.
- `tests/runtime_stack.py`의 `restore failure injection / SIGINT`에서 partial target resources가 생길 수 있는 실제 rollback path를 통과합니다.
- `tests/runtime_stack.py`의 `zero-resource assertions`에서 `down` 호출 여부가 아니라 rollback endpoint를 확인합니다.
- `tests/runtime_stack.py`의 `success and second restore refusal`에서 fresh-project invariant의 positive/negative 양쪽을 검증합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 4f8eb9aff842 | tests/runtime_stack.py | malformed/unsafe backup cases | manifest checksum/shape를 깨거나 symlink artifact를 넣고 restore가 target mutation 전에 거부되는지 확인합니다. | VerifiedBackup trust boundary의 negative evidence입니다. |
| 4f8eb9aff842 | tests/runtime_stack.py | restore failure injection / SIGINT | DB import 이후, archive extraction 이후, bootstrap 단계 등 mutation 뒤 named failure 또는 signal을 주입합니다. | partial target resources가 생길 수 있는 실제 rollback path를 통과합니다. |
| 4f8eb9aff842 | tests/runtime_stack.py | zero-resource assertions | containers, volumes, networks를 labels와 expected names로 독립 조회해 모두 없어야 한다고 검사합니다. | `down` 호출 여부가 아니라 rollback endpoint를 확인합니다. |
| 4f8eb9aff842 | tests/runtime_stack.py | success and second restore refusal | 복원된 post/option/upload/users/health를 검사하고 같은 target에 두 번째 restore가 기존 state를 바꾸지 않고 거부되는지 확인합니다. | fresh-project invariant의 positive/negative 양쪽을 검증합니다. |

#### 비교 기준

- exact commit diff: `git diff 4f8eb9aff842^ 4f8eb9aff842 -- <path>`
- 이전 Thread 상태와 비교: `git diff 3a37a491ecea 4f8eb9aff842 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### 테스트 학습 기록

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariant | verified input만 fresh target에 적용되며 failure는 zero-owned-resource state, success는 healthy restored stack으로 끝납니다. |
| 재현하는 failure / boundary | malformed/symlink input, DB/archive/bootstrap 이후 injected failure, SIGINT, second restore입니다. |
| test technique | live negative/positive integration + deterministic failure/signal injection |
| fixture와 failure injection | valid backup과 여러 corrupted copies, fresh secondary project를 만들고 mutation stage별 failure를 주입합니다. |
| 실제 통과하는 production path | CLI/Make restore→VerifiedBackup→freshness→stream import/extraction→bootstrap/health 또는 cleanup_failed_restore를 통과합니다. |
| 핵심 assertion | mutation 전 refusal, residual object 0, restored values/health, second restore refusal와 existing-state 보존을 확인합니다. |
| 이 테스트가 증명하는 것 | 주요 failure/cancellation이 all-or-nothing resource endpoint로 수렴하고 success가 실제 application state를 복원함을 증명합니다. |
| 이 테스트가 증명하지 않는 것 | daemon crash·hardware storage·모든 concurrent actor를 증명하지 않습니다. |
| 성격 | deterministic rollback and broad restore integration |
| 막는 후속 regression | partial target leak, malformed input after-mutation rejection, in-place second restore, cleanup command 성공만 신뢰하는 회귀를 막습니다. |
| 직접 실행 command와 결과 | 실행하지 않았습니다. 현재 환경에는 Docker와 로컬 repository checkout이 없습니다. 해당 SHA의 test code와 command wiring만 검사했습니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: Docker daemon crash, physical volume garbage, 모든 malformed tar format, uncooperative concurrent actor는 증명하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `030e7310c665`이 stopped/unlabelled collision과 large streaming restore를 보강합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: restore의 주요 all-or-nothing endpoint와 pre-existing state preservation을 실제 Docker resource와 application data로 증명합니다.

### 8. `030e7310c665` — test(backup): 자원 충돌과 시그널 경계 검증

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `TEST`, `PERSISTENCE`, `EDGE` |
| Source-defined role | Added stopped and unlabelled collision cases plus large restored fixtures. |
| 이전 Thread commit | `4f8eb9aff842` |
| 다음 Thread commit | 없음 |

#### 원문이 확정한 범위

- **Summary:** Adds signal-race checks, labelled and name-only restore-collision refusal, large filesystem and database fixtures, checksums, and stricter secondary cleanup reporting.
- **Classification reason:** It tests boundary conditions that small normal-path fixtures and simple cancellation cannot cover, protecting the integrity and lifecycle guarantees of backup and restore.

- **이 Thread의 재검토 관점:** 이 문서에서는 stopped/unlabelled collision refusal, large restored fixtures, secondary cleanup 관점을 우선 기록합니다.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `030e7310c665`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `tests/runtime_stack.py`의 `restore resource collision fixtures`에서 freshness 검사가 label-only 또는 running-only로 축소되는 회귀를 탐지합니다.
- `tests/runtime_stack.py`의 `large restore fixture`에서 SQL/tar streaming injection의 large-input correctness를 검증합니다.
- `tests/runtime_stack.py`의 `secondary close/error propagation`에서 test가 만든 secondary resources의 cleanup도 evidence lifecycle에 포함합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 030e7310c665 | tests/runtime_stack.py | restore resource collision fixtures | project label은 없지만 expected exact name을 가진 stopped container/volume/network와 labelled custom-name object를 만듭니다. | freshness 검사가 label-only 또는 running-only로 축소되는 회귀를 탐지합니다. |
| 030e7310c665 | tests/runtime_stack.py | large restore fixture | backup의 32 MiB file과 4 MiB DB value를 fresh target에 restore한 뒤 source/restored length와 digest를 비교합니다. | SQL/tar streaming injection의 large-input correctness를 검증합니다. |
| 030e7310c665 | tests/runtime_stack.py | secondary close/error propagation | restore target teardown이 실패하면 primary scenario가 성공했더라도 nonzero로 처리되는 branch를 검사합니다. | test가 만든 secondary resources의 cleanup도 evidence lifecycle에 포함합니다. |

#### 비교 기준

- exact commit diff: `git diff 030e7310c665^ 030e7310c665 -- <path>`
- 이전 Thread 상태와 비교: `git diff 4f8eb9aff842 030e7310c665 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### 테스트 학습 기록

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariant | freshness check는 labelled/running object뿐 아니라 stopped/unlabelled exact-name object도 거부하고 large streams를 정확히 복원합니다. |
| 재현하는 failure / boundary | stopped/unlabelled collisions, 32 MiB file, 4 MiB DB value, secondary cleanup failure입니다. |
| test technique | edge-boundary runtime integration + large fixture checksum comparison |
| fixture와 failure injection | expected resource names으로 collision objects를 만들고 large state backup을 fresh target에 적용합니다. |
| 실제 통과하는 production path | resource discovery→freshness refusal 또는 VerifiedBackup→stream injection→application verification을 통과합니다. |
| 핵심 assertion | pre-existing object 보존, mutation 0, source/restored digest·length, cleanup-result precedence를 확인합니다. |
| 이 테스트가 증명하는 것 | label/name discovery가 보완적이고 streaming restore가 small fixture에 국한되지 않음을 증명합니다. |
| 이 테스트가 증명하지 않는 것 | 새로운 미래 Compose naming form이나 모든 volume driver를 증명하지 않습니다. |
| 성격 | collision and large-stream regression |
| 막는 후속 regression | label-only discovery, running-only lookup, whole-buffer/truncation, secondary cleanup 무시를 막습니다. |
| 직접 실행 command와 결과 | 실행하지 않았습니다. 현재 환경에는 Docker와 로컬 repository checkout이 없습니다. 해당 SHA의 test code와 command wiring만 검사했습니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: 모든 Compose version naming convention과 무한 크기 input을 증명하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: Thread 4와 공유되는 commit이지만 여기서는 restore collision/large-state 관점만 사용합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: fresh-target inventory의 다중 discovery 방식과 bounded-memory restore가 realistic large fixture에서 동작함을 증명합니다.

## Invariant ledger

| Source에서 연결된 invariant | 처음/초기 단계 | 강화·교정 단계 | 검증 단계 | 학습자가 확인한 실제 근거 |
| --- | --- | --- | --- | --- |
| restore는 완전히 비어 있는 target project에만 시작합니다. | e5cb60c7d743, 851dc1708881 | 9ca04b1c30cd | 4f8eb9aff842, 030e7310c665 | labels와 rendered/exact names preflight가 mutation보다 앞서고 collision fixtures가 기존 object 보존을 확인합니다. |
| input backup은 private, owner-controlled, non-symlink, exact-file, checksummed, structurally valid object입니다. | 953a0f6bd571 | 9ca04b1c30cd | 4f8eb9aff842 | VerifiedBackup descriptor/lock/schema/checksum과 malformed/symlink refusal가 연결됩니다. |
| WordPress archive와 SQL은 empty newly created volumes에만 주입됩니다. | 1250fcf7c006 | 9ca04b1c30cd | 4f8eb9aff842 | empty mount checks와 fresh target, second restore refusal가 merge/overwrite를 막습니다. |
| restore 성공은 healthy complete stack, 실패는 owned Docker resource가 하나도 없는 상태입니다. | 9ca04b1c30cd | 4f8eb9aff842 | 030e7310c665 | success data/health assertion과 failure labels/names zero enumeration 및 cleanup-result propagation이 양 endpoint를 고정합니다. |

### Ledger 보완 기록

- source에 명시되지 않은 새 invariant를 확정 사실로 추가하지 않습니다.
- invariant가 실제로 부족했음을 드러낸 commit 또는 failure stage: 기존 project에 restore하면 pre-existing state와 attempt-created state를 구분할 수 없어 failure rollback이 안전하게 삭제할 범위를 결정할 수 없었습니다.
- marker, rename, lock, health, authentication, cleanup 등 invariant를 고정하는 concrete mechanism: label·exact/rendered name collision checks, descriptor-anchored `VerifiedBackup`, empty-volume streaming injection과 independent zero-resource cleanup verification이 fresh-create semantics를 고정합니다.
- 후속 commit이 invariant를 약화하지 못하게 하는 regression evidence: `4f8eb9aff842`의 malformed/signal/success/second-refusal scenarios와 `030e7310c665`의 stopped/unlabelled collision 및 large fixtures가 보호합니다.
## Failure → Fix → Test 연결

| failure / 위험 | fix 또는 mechanism | test / evidence | 학습자 연결 기록 |
| --- | --- | --- | --- |
| 기존 target에 restore하면 unrelated state와 merge/overwrite되고 rollback ownership 불명확 | 851dc1708881 fresh-project precondition | 4f8eb9aff842 second restore refusal, 030e7310c665 collision cases | new attempt가 만든 resources만 독점 소유하도록 namespace를 비웁니다. |
| 검증 뒤 input path가 symlink/modified file로 바뀜 | 953a0f6bd571 descriptor-anchored no-follow open과 retained locks/streams | 4f8eb9aff842 symlink artifact rejection | pathname 재해석 대신 stable open object를 끝까지 소비합니다. |
| DB import 뒤 bootstrap 실패로 partial resources가 남음 | 9ca04b1c30cd compose cleanup + independent enumeration | 4f8eb9aff842 injected failure/SIGINT cleanup | cleanup command 실행과 zero-resource 검증을 분리합니다. |
| small archive/dump에서만 streaming이 통과 | 1250fcf7c006 stdin streaming primitives | 030e7310c665 large restored checksum/length | bounded-memory path와 byte completeness를 실제 large fixture로 확인합니다. |

### 직접 재구성할 chain

```text
기존 가정: restore를 기존 project volume에 덮거나 merge해도 실패 시 되돌릴 수 있다는 가정
  → 실제 failure 또는 위험: partial SQL/archive 적용 뒤 어떤 object가 기존 것인지 판별할 수 없고 retry가 mixed state를 재사용할 수 있었습니다.
  → root cause: fresh-target precondition과 attempt-owned resource set이 없으면 cleanup ownership이 정의되지 않습니다.
  → 수정된 invariant / decision: 검증된 backup을 빈 namespace와 빈 volumes에만 적용하고 어느 failure든 attempt-created containers/volumes/networks를 0으로 되돌립니다.
  → 해당 SHA의 실제 수정 코드: `851dc1708881`, `953a0f6bd571`, `1250fcf7c006`, `9ca04b1c30cd`의 ordered restore path
  → failure injection 또는 regression test: `4f8eb9aff842`와 `030e7310c665` restore scenarios
  → 증명된 보장 / 남은 비보장: success는 healthy restored project, failure는 owned resources 0이며 기존 collision object는 보존하지만 in-place restore는 제공하지 않습니다.
```

## Ownership / state / responsibility 변화

| 대상 | 이전 상태 | 이후 책임/authoritative state | 확인할 근거 | 학습자 결론 |
| --- | --- | --- | --- | --- |
| Verified backup input | user path 문자열 | opened directory/file descriptors와 shared lock이 stable input 소유 | 953a0f6bd571 no-follow/fstat/lock | restore 종료까지 path를 다시 신뢰하지 않습니다. |
| Target namespace | 존재 여부 불명 | freshness 이후 restore attempt가 새 resources 독점 소유 | 851dc1708881 discovery와 9ca04b1c30cd transaction | 실패 시 제거 가능한 ownership이 명확합니다. |
| MariaDB volume | 없음 | fresh bootstrap 후 SQL stream의 authoritative relational state | 1250fcf7c006 import order | 기존 DB와 merge하지 않습니다. |
| WordPress data/config volumes | 없음 | validated archive가 empty mounts에만 extraction | 1250fcf7c006 roots/emptiness/tar | public data와 private config를 분리 복원합니다. |
| Rollback | 단일 down command 시도 가능 | Compose cleanup + independent zero-resource verification | 9ca04b1c30cd cleanup_failed_restore | cleanup failure도 transaction failure입니다. |

## Thread 최종 상태

- **Source-confirmed endpoint:** Restore is treated as creation of a new project, not as an in-place overwrite. That constraint makes rollback tractable: verified input is applied only after collision checks, and any failure removes the resources created by the attempt. The later tests show that refusal preserves pre-existing objects and that the streaming implementation remains correct beyond small fixtures.
- 최종 authoritative state와 owner: VerifiedBackup descriptors가 stable source input을, successful fresh Compose project의 named volumes가 restored authoritative state를 소유합니다.
- 정상 실행의 entry point와 완료 조건: lock 아래 input/freshness 검증, DB bootstrap/import, WordPress extraction, normal bootstrap/start, health가 모두 성공하면 완료입니다.
- failure 또는 interruption 뒤 retry/rollback/compensation 조건: 예외/signal은 down --volumes와 independent labels/names enumeration으로 zero-owned-resource state를 요구하며 cleanup failure는 primary error와 함께 보고합니다.
- 이 Thread가 다른 Thread에 제공하는 전제: credential rotation과 operations tests가 사용할 완전한 fresh project 생성 semantics를 제공합니다.
- 이 Thread 단독으로는 증명하지 않는 것: daemon crash와 physical storage leak, non-cooperating external actor는 이 Thread 단독으로 완전 증명하지 않습니다.

## 최종 architecture 또는 execution flow 정리

| 단계 | 확인할 흐름 | 실제 코드 근거 | 정상 전이 | 실패·정리·재시도 |
| --- | --- | --- | --- | --- |
| 1 | input 검증 | 953a0f6bd571 VerifiedBackup | descriptor/lock/schema/checksum/archive validation을 mutation 전에 끝냅니다. | unsafe input은 target object 0 상태로 거부합니다. |
| 2 | target freshness | 851dc1708881 ensure_fresh_project | labels와 exact/rendered names가 모두 비었는지 확인합니다. | collision이면 기존 object를 보존하고 실패합니다. |
| 3 | MariaDB bootstrap/import | 1250fcf7c006 + 9ca04b1c30cd | fresh DB resources를 만들고 SQL stream을 주입합니다. | import failure는 rollback으로 갑니다. |
| 4 | WordPress extraction | 1250fcf7c006 extraction helper | empty data/config mounts에 validated tar stream을 풉니다. | non-empty/path/tar failure는 rollback으로 갑니다. |
| 5 | application convergence | 9ca04b1c30cd normal startup reuse | WordPress bootstrap와 health-gated services를 시작합니다. | bootstrap/health failure는 created resources를 제거합니다. |
| 6 | rollback | 9ca04b1c30cd cleanup_failed_restore | Compose cleanup 후 independent enumeration으로 0을 증명합니다. | residual object나 cleanup command failure는 별도 오류입니다. |
| 7 | success/second refusal | 4f8eb9aff842 runtime scenario | restored values/health를 확인하고 같은 target 재실행을 거부합니다. | second restore는 existing state를 변경하지 않습니다. |

### 학습자의 최종 설명

> restore를 기존 volume에 덮는 작업으로 보면 failure rollback의 소유권이 불명확해집니다. 이 구현은 target project가 labels와 exact/rendered names 모두에서 비어 있어야만 시작합니다. backup은 directory/file descriptor에 anchored된 `VerifiedBackup`으로 열어 checksum과 archive 구조를 mutation 전에 끝내고, SQL과 tar stream은 새 empty volumes에만 주입합니다. 이후 normal bootstrap와 health를 재사용합니다. 어느 지점에서 실패하거나 signal이 오면 Compose cleanup을 실행한 뒤 별도로 containers/volumes/networks를 다시 열거해 0을 확인합니다. 성공은 healthy restored stack, 실패는 attempt-owned resources 0이라는 두 endpoint로 정의되며, 같은 target의 두 번째 restore는 in-place merge 대신 거부됩니다.

## 학습 완료 자가 점검

- [x] restore를 in-place overwrite로 설명하지 않았습니까?
- [x] labelled resource만 collision으로 본다고 잘못 기록하지 않았습니까?
- [x] backup 검증 뒤 파일을 pathname으로 다시 열어도 안전하다고 가정하지 않았습니까?
- [x] cleanup을 시도한 것과 cleanup 완료를 검증한 것을 구분했습니까?
- [x] successful restore 뒤 같은 target에 재실행이 허용된다고 쓰지 않았습니까?
- [x] 모든 code snippet에 SHA와 path/symbol을 기록했습니다.
- [x] final HEAD의 field/helper/test를 이전 SHA에 소급하지 않았습니다.
- [x] source가 확정하지 않은 사실을 추정으로 채우지 않았습니다.
- [x] test가 증명하는 것과 증명하지 않는 것을 구분했습니다.
- [x] 이 Thread를 commit 순서대로 구두 설명할 수 있습니다.
