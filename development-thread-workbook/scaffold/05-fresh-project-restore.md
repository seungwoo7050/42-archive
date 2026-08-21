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

- rendered Compose JSON에서 concrete volume/network names를 계산하는 helper와 explicit names 처리 branch를 확인합니다.
- current/legacy Compose naming form의 service/bootstrap container candidate names를 만드는 코드를 추적합니다.
- Docker resources를 project label과 exact expected name으로 각각 query하는 function을 구분합니다.
- label-only와 hard-coded-name-only 접근이 놓칠 수 있는 object를 test fixture 관점에서 기록합니다.

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

- restore mutation 전에 labelled containers/volumes/networks, exact container names, rendered volume/network names를 조회하는 순서를 확인합니다.
- 한 category라도 match하면 resource-count summary와 함께 abort하는 branch를 찾습니다.
- freshness check 전에는 어떤 Docker resource도 create/remove하지 않는지 caller flow를 추적합니다.
- empty target precondition이 이후 rollback의 delete ownership을 정당화하는 지점을 기록합니다.

#### 비교 기준

- exact commit diff: `git diff 851dc1708881^ 851dc1708881 -- <path>`
- 이전 Thread 상태와 비교: `git diff e5cb60c7d743 851dc1708881 -- <path>`
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

- backup directory를 symlink-follow 없이 descriptor로 열고 owner/mode/private-directory 조건을 검증하는 코드를 확인합니다.
- directory entries가 exactly three expected files인지 검사하고 extra/missing entry를 거부하는 branch를 찾습니다.
- 각 file을 directory descriptor 상대 no-follow로 열어 regular/single-link/owner/private mode와 non-blocking shared lock을 확인합니다.
- manifest size/UTF-8/JSON/version/checksum table validation과 streamed SHA-256 비교를 추적합니다.
- WordPress archive structural validator 호출과 `VerifiedBackup`이 opened streams/directory descriptor를 종료까지 보유하는 lifetime을 확인합니다.
- 검증 후 pathname substitution을 막는 ownership/lifetime 관계를 diagram으로 기록합니다.

#### 비교 기준

- exact commit diff: `git diff 953a0f6bd571^ 953a0f6bd571 -- <path>`
- 이전 Thread 상태와 비교: `git diff 851dc1708881 953a0f6bd571 -- <path>`
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

- root credential을 SQL stream 앞에 private temporary file로 결합하고 container 내부 option file을 만드는 protocol을 추적합니다.
- 첫 line을 authentication material로 소비하고 remaining dump를 local socket client에 streaming하는 command를 확인합니다.
- WordPress one-off container의 data/config mount points와 both-empty precondition을 찾습니다.
- validated gzip stream을 `/var/www` 아래로 extraction하는 path와 prevalidated member assumptions를 기록합니다.
- fresh DB/application startup helper를 재사용하는 caller/callee 연결을 확인합니다.

#### 비교 기준

- exact commit diff: `git diff 1250fcf7c006^ 1250fcf7c006 -- <path>`
- 이전 Thread 상태와 비교: `git diff 953a0f6bd571 1250fcf7c006 -- <path>`
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

- `restore_backup` orchestration에서 backup verification과 target freshness가 mutation보다 앞서는지 call order로 확인합니다.
- project lock/signal scope 안에서 target secrets loading, MariaDB bootstrap, SQL import, WordPress injection, application bootstrap을 추적합니다.
- DB import 후 failure/pause hook과 그 이후 생성된 resources를 목록화합니다.
- `cleanup_failed_restore`가 `compose down --volumes`를 실행한 뒤 labels/exact names/rendered names로 containers/volumes/networks를 독립 재조회하는 코드를 확인합니다.
- Compose command가 실패했거나 object가 남으면 cleanup incomplete로 판단하는 branch를 기록합니다.
- restore exception과 cleanup exception이 모두 있을 때 original context와 reported error가 어떻게 연결되는지 확인합니다.
- successful endpoint와 failed zero-resource endpoint를 실제 return/error condition으로 정리합니다.

#### 비교 기준

- exact commit diff: `git diff 9ca04b1c30cd^ 9ca04b1c30cd -- <path>`
- 이전 Thread 상태와 비교: `git diff 1250fcf7c006 9ca04b1c30cd -- <path>`
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

- CLI parser에서 `backup`/`restore` operation과 input/output path mutual exclusion을 확인합니다.
- hidden failure/pause stages가 selected operation에 맞는지 validation하는 branch를 찾습니다.
- error message가 actual operation name을 사용하고 domain/subprocess failure를 nonzero로 mapping하는지 확인합니다.
- Make target이 `BACKUP_DIR`, explicit project, env, Compose file을 전달하는 command를 기록합니다.

#### 비교 기준

- exact commit diff: `git diff 3a37a491ecea^ 3a37a491ecea -- <path>`
- 이전 Thread 상태와 비교: `git diff 9ca04b1c30cd 3a37a491ecea -- <path>`
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

- SQL artifact를 symlink로 바꾼 setup과 restore refusal이 target resource creation 전에 일어나는 assertion을 확인합니다.
- DB import 후 injected failure와 synchronized `SIGINT` scenario가 동일 zero-resource cleanup을 요구하는지 비교합니다.
- normal restore 뒤 DB values와 uploaded file을 fresh target에서 검증하는 path를 추적합니다.
- 이미 active가 된 target에 두 번째 restore를 시도해 refusal하는 assertion을 확인합니다.
- production invariant, failure reproduction, test technique, production path, proves/does-not-prove를 별도로 작성합니다.

#### 비교 기준

- exact commit diff: `git diff 4f8eb9aff842^ 4f8eb9aff842 -- <path>`
- 이전 Thread 상태와 비교: `git diff 3a37a491ecea 4f8eb9aff842 -- <path>`
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
| Source-defined role | Added stopped and unlabelled collision cases plus large restored fixtures. |
| 이전 Thread commit | `4f8eb9aff842` |
| 다음 Thread commit | 없음 |

#### 원문이 확정한 범위

- **Summary:** Adds signal-race checks, labelled and name-only restore-collision refusal, large filesystem and database fixtures, checksums, and stricter secondary cleanup reporting.
- **Classification reason:** It tests boundary conditions that small normal-path fixtures and simple cancellation cannot cover, protecting the integrity and lifecycle guarantees of backup and restore.

- **이 Thread의 재검토 관점:** 이 문서에서는 stopped/unlabelled collision refusal, large restored fixtures, secondary cleanup 관점을 우선 기록합니다.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `030e7310c665`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- ready marker 관찰 직후 `SIGINT`와 `SIGTERM`을 번갈아 보내는 repeated race loop와 expected signal report/marker cleanup을 확인합니다.
- stopped labelled container와 unlabelled exact-name container/volume/network collision fixture를 만드는 코드를 찾습니다.
- 32 MiB random WordPress upload와 4 MiB MariaDB value의 생성, streaming, restored checksum/length assertions를 추적합니다.
- secondary restore project cleanup failure가 scenario result에 전파되는 branch를 확인합니다.
- 현재 thread 관점에서 backup signal/streaming evidence와 restore collision/large-restore evidence를 분리해 기록합니다.

#### 비교 기준

- exact commit diff: `git diff 030e7310c665^ 030e7310c665 -- <path>`
- 이전 Thread 상태와 비교: `git diff 4f8eb9aff842 030e7310c665 -- <path>`
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
| restore는 완전히 비어 있는 target project에만 시작합니다. | `e5cb60c7d743, 851dc1708881` | `9ca04b1c30cd` | `4f8eb9aff842, 030e7310c665` | `[학습자: 실제 code/test evidence]` |
| input backup은 private, owner-controlled, non-symlink, exact-file, checksummed, structurally valid object입니다. | `953a0f6bd571` | `9ca04b1c30cd` | `4f8eb9aff842` | `[학습자: 실제 code/test evidence]` |
| WordPress archive와 SQL은 empty newly created volumes에만 주입됩니다. | `1250fcf7c006` | `9ca04b1c30cd` | `4f8eb9aff842` | `[학습자: 실제 code/test evidence]` |
| restore 성공은 healthy complete stack, 실패는 owned Docker resource가 하나도 없는 상태입니다. | `9ca04b1c30cd` | `4f8eb9aff842` | `030e7310c665` | `[학습자: 실제 code/test evidence]` |

### Ledger 보완 기록

- source에 명시되지 않은 새 invariant를 확정 사실로 추가하지 않습니다.
- invariant가 실제로 부족했음을 드러낸 commit 또는 failure stage: `[학습자 작성]`
- marker, rename, lock, health, authentication, cleanup 등 invariant를 고정하는 concrete mechanism: `[학습자 작성]`
- 후속 commit이 invariant를 약화하지 못하게 하는 regression evidence: `[학습자 작성]`

## Failure → Fix → Test 연결

| failure / 위험 | fix 또는 mechanism | test / evidence | 학습자 연결 기록 |
| --- | --- | --- | --- |
| 기존 target에 restore하면 unrelated state와 merge/overwrite되고 rollback ownership이 불명확 | 851dc1708881의 fresh-project precondition | 4f8eb9aff842의 second restore refusal, 030e7310c665의 label/name collision cases | `[학습자: root cause와 code/test 연결]` |
| 검증 뒤 input path가 symlink나 modified file로 바뀜 | 953a0f6bd571의 descriptor-anchored open, no-follow, locks, retained streams | 4f8eb9aff842의 symlink artifact rejection before mutation | `[학습자: root cause와 code/test 연결]` |
| DB import 후 application bootstrap 실패로 partial containers/volumes/networks가 남음 | 9ca04b1c30cd의 compose down --volumes + independent enumeration rollback | 4f8eb9aff842의 injected failure/SIGINT cleanup | `[학습자: root cause와 code/test 연결]` |
| small archive/dump에서만 streaming path가 통과 | 1250fcf7c006의 streaming primitives | 030e7310c665의 large restored checksum/length fixtures | `[학습자: root cause와 code/test 연결]` |

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
| Verified backup input | user path 문자열 | opened directory/file descriptors와 shared lock으로 stable input 소유 | openat/no-follow/nlink/mode/lock evidence | `[학습자 작성]` |
| Target namespace | 존재 여부 불명 | freshness check 이후 restore attempt가 새로 만든 모든 resource를 독점 소유 | labels, rendered names, exact names evidence | `[학습자 작성]` |
| MariaDB volume | 없음 | fresh bootstrap 후 SQL stream이 authoritative relational state를 주입 | bootstrap/import/order evidence | `[학습자 작성]` |
| WordPress data/config volumes | 없음 | validated archive가 empty mounts에만 extraction | mount points, emptiness check, extraction evidence | `[학습자 작성]` |
| Rollback | 단일 down command 시도 | Compose cleanup + independent zero-resource verification | enumeration and error chaining evidence | `[학습자 작성]` |

## Thread 최종 상태

- **Source-confirmed endpoint:** Restore is treated as creation of a new project, not as an in-place overwrite. That constraint makes rollback tractable: verified input is applied only after collision checks, and any failure removes the resources created by the attempt. The later tests show that refusal preserves pre-existing objects and that the streaming implementation remains correct beyond small fixtures.
- 최종 authoritative state와 owner: `[학습자 작성]`
- 정상 실행의 entry point와 완료 조건: `[학습자 작성]`
- failure 또는 interruption 뒤 retry/rollback/compensation 조건: `[학습자 작성]`
- 이 Thread가 다른 Thread에 제공하는 전제: `[학습자 작성]`
- 이 Thread 단독으로는 증명하지 않는 것: `[학습자 작성]`

## 최종 architecture 또는 execution flow 정리

| 단계 | 확인할 흐름 | 실제 코드 근거 | 정상 전이 | 실패·정리·재시도 |
| --- | --- | --- | --- | --- |
| 1 | project lock과 signal handling 아래 backup input을 검증하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 2 | rendered/labelled/exact resource collision을 mutation 전에 검사하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 3 | fresh MariaDB resource를 만들고 bootstrap하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 4 | SQL stream을 import하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 5 | empty WordPress data/config volumes에 archive를 extraction하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 6 | normal application bootstrap과 health convergence를 재사용하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 7 | failure 시 Compose down과 independent enumeration으로 zero-resource state를 증명하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |

### 학습자의 최종 설명

> `[학습자 작성: 위 표와 commit evidence만 사용해 이 Thread의 설계 → 구현 → 실패 → 수정 → 검증 발전을 설명합니다.]`

## 학습 완료 자가 점검

- [ ] restore를 in-place overwrite로 설명하지 않았습니까?
- [ ] labelled resource만 collision으로 본다고 잘못 기록하지 않았습니까?
- [ ] backup 검증 뒤 파일을 pathname으로 다시 열어도 안전하다고 가정하지 않았습니까?
- [ ] cleanup을 시도한 것과 cleanup 완료를 검증한 것을 구분했습니까?
- [ ] successful restore 뒤 같은 target에 재실행이 허용된다고 쓰지 않았습니까?
- [ ] 모든 code snippet에 SHA와 path/symbol을 기록했습니다.
- [ ] final HEAD의 field/helper/test를 이전 SHA에 소급하지 않았습니다.
- [ ] source가 확정하지 않은 사실을 추정으로 채우지 않았습니다.
- [ ] test가 증명하는 것과 증명하지 않는 것을 구분했습니다.
- [ ] 이 Thread를 commit 순서대로 구두 설명할 수 있습니다.
