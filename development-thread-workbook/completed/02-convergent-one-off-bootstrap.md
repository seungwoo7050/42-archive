# Thread 2 — From runtime secret mounts to convergent one-off bootstrap

## Thread 목표

Compose secret mount 기반의 초기 모델이 host-side secret validation, per-project lock, one-off bootstrap, completion marker를 이용한 수렴형 초기화로 바뀌는 핵심 lifecycle 교정을 추적합니다.

**Source significance**

> The earlier `_FILE` and Compose-secret model reduced direct environment exposure but still attached credential material to service startup. The later architecture resolves secrets on the host while holding the project lock, sends only required values to short-lived bootstrap containers, and lets long-running services start from verified persistent state. The final SIGKILL scenario is important because it validates the design's intended convergence after process death, not only after controlled errors.

## 이 Thread를 이해하기 위한 핵심 질문

- 초기 `_FILE` 모델은 environment 노출을 줄였지만 어떤 steady-state 노출과 partial-state 위험을 남겼습니까?
- host secret path가 신뢰 가능한 입력이 되기 위해 어떤 descriptor/stat/permission 검사가 필요합니까?
- 왜 management lock의 granularity가 Compose project name입니까?
- MariaDB staging publication과 WordPress completion marker는 어떤 순서 보장을 만듭니까?
- process readiness와 durable initialization completion은 health check에서 어떻게 결합됩니까?
- SIGKILL 테스트는 graceful trap 기반 테스트와 무엇을 다르게 증명합니까?

## 완료 기준

- 기존 runtime secret mount 구조와 최종 bootstrap-only secret 전달 구조를 비교했습니다.
- `project_operation_lock`의 private path, ownership, no-follow, non-blocking flock 계약을 실제 코드로 확인했습니다.
- MariaDB와 WordPress의 staging/marker/publish 순서를 각 SHA의 entrypoint와 orchestrator로 복원했습니다.
- static contract와 SIGKILL runtime regression이 각각 증명하는 범위를 분리했습니다.

## Commit map

| 순서 | SHA | Subject | Importance | Tags | Source-defined role |
| --- | --- | --- | --- | --- | --- |
| 1 | `916391b9f8db` | feat(secrets): 비밀번호를 비밀 파일에서 로드 | **B** | `SECRETS`<br>`RISK` | Moved passwords out of ordinary environment values into Compose secret files. |
| 2 | `486ffb5c65aa` | refactor(secrets): 비밀 파일 로딩 경계 공통화 | **A** | `SECRETS`<br>`RISK`<br>`ARCH` | Centralized hardened host secret-file resolution and reading. |
| 3 | `e77c6f151b07` | refactor(runtime): 프로젝트 관리 작업 잠금 공통화 | **A** | `RECOVERY`<br>`OPERATIONS`<br>`RISK` | Established per-project management-operation serialization. |
| 4 | `dc9601f5e670` | fix(init): 중단된 단계별 초기화를 수렴 | **S** | `ARCH`<br>`BOOTSTRAP`<br>`RECOVERY` | Replaced steady-state secret mounts and one-shot initialization with staged one-off bootstrap. |
| 5 | `3beebbfc4723` | test(init): 단계별 초기화 계약 검사 | **B** | `TEST`<br>`BOOTSTRAP` | Added a source contract for completion markers and staged recovery. |
| 6 | `2bf6d3f11337` | test(init): 안정 단계별 초기화 중단 복구 검증 | **A** | `TEST`<br>`BOOTSTRAP`<br>`RECOVERY` | Killed bootstrap containers at every durable stage and proved rerun convergence. |

> Commit 순서는 source의 Development Thread 정의를 그대로 따릅니다. 같은 SHA가 다른 Thread에도 있으면 이 문서의 관점으로 다시 확인합니다.

## Commit별 학습 기록

### 1. `916391b9f8db` — feat(secrets): 비밀번호를 비밀 파일에서 로드

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **B** |
| Tags | `SECRETS`, `RISK` |
| Source-defined role | Moved passwords out of ordinary environment values into Compose secret files. |
| 이전 Thread commit | 없음 |
| 다음 Thread commit | `486ffb5c65aa` |

#### 원문이 확정한 범위

- **Summary:** Replaces password environment values with Compose secret files and `_FILE` inputs.
- **Classification reason:** This is a meaningful intermediate security improvement, but the later one-off bootstrap architecture removes steady-state secret mounts and becomes the durable project boundary.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `916391b9f8db`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `.env.example`의 `*_PASSWORD_FILE variables`에서 operator가 값 대신 file source를 구성합니다.
- `srcs/docker-compose.yml`의 `secrets / service attachments`에서 credential material이 일반 environment value가 아니라 file mount로 전달됩니다.
- `srcs/docker-compose.yml`의 `*_PASSWORD_FILE=/run/secrets/... / healthcheck`에서 장기 실행 service도 steady state에서 secret mount를 계속 보유합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 916391b9f8db | .env.example | *_PASSWORD_FILE variables | 공개 예제 환경에서 password literal을 제거하고 host secret file path를 받도록 바꿉니다. | operator가 값 대신 file source를 구성합니다. |
| 916391b9f8db | srcs/docker-compose.yml | secrets / service attachments | 네 secret source를 선언하고 MariaDB와 WordPress가 필요한 subset을 `/run/secrets`로 mount합니다. | credential material이 일반 environment value가 아니라 file mount로 전달됩니다. |
| 916391b9f8db | srcs/docker-compose.yml | *_PASSWORD_FILE=/run/secrets/... / healthcheck | entrypoint `_FILE` 변수와 MariaDB health command가 mounted root secret을 읽습니다. | 장기 실행 service도 steady state에서 secret mount를 계속 보유합니다. |

#### B-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| Thread에서 맡은 구현 역할 | Moved passwords out of ordinary environment values into Compose secret files. |
| 핵심 input / output / state | host source file은 Compose가 mount하고 long-running MariaDB/WordPress container가 실행 내내 `/run/secrets`를 읽을 수 있습니다. |
| 변경된 directive / helper / command | `.env.example`의 `*_PASSWORD_FILE variables`; `srcs/docker-compose.yml`의 `secrets / service attachments`; `srcs/docker-compose.yml`의 `*_PASSWORD_FILE=/run/secrets/... / healthcheck` |
| immediate failure 또는 boundary | environment 노출은 줄지만 runtime container compromise나 진단 명령이 mounted secret에 접근할 수 있고, bootstrap과 serving lifecycle이 여전히 결합됩니다. |
| 다음 commit에 넘긴 한계 | host file의 owner/mode/symlink 안전성, project operation serialization, secret-free steady-state container는 보장하지 않습니다. `486ffb5c65aa`가 host secret read를 hardened shared boundary로 만들고 `dc9601f5e670`이 runtime mount 자체를 제거합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: host file의 owner/mode/symlink 안전성, project operation serialization, secret-free steady-state container는 보장하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `486ffb5c65aa`가 host secret read를 hardened shared boundary로 만들고 `dc9601f5e670`이 runtime mount 자체를 제거합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: password literal이 일반 environment/config에 직접 놓이지 않고 `_FILE` contract로 소비된다는 중간 보장을 제공합니다.

### 2. `486ffb5c65aa` — refactor(secrets): 비밀 파일 로딩 경계 공통화

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `SECRETS`, `RISK`, `ARCH` |
| Source-defined role | Centralized hardened host secret-file resolution and reading. |
| 이전 Thread commit | `916391b9f8db` |
| 다음 Thread commit | `e77c6f151b07` |

#### 원문이 확정한 범위

- **Summary:** Adds hardened secret-file reading, rendered secret-path resolution, environment extraction, and stdin payload construction.
- **Classification reason:** This centralizes a critical trust boundary used by startup, backup, restore, rotation, and diagnostics, but it supports rather than alone defines the project-wide lifecycle architecture.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `486ffb5c65aa`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `tools/stack_runtime.py`의 `secret_source_paths`에서 secret path 해석을 startup/backup/restore/rotation/diagnostics가 공유할 수 있게 합니다.
- `tools/stack_runtime.py`의 `read_private_secret`에서 pathname 검사 뒤 교체되는 TOCTOU window를 descriptor 기반 검사로 줄입니다.
- `tools/stack_runtime.py`의 `load_secret_values / secret_payload / service_environment`에서 credential 전달의 producer/consumer 형식이 공통화됩니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 486ffb5c65aa | tools/stack_runtime.py | secret_source_paths | rendered Compose의 `x-secret-files` metadata에서 source path를 resolve하고 canonical path가 서로 겹치지 않는지 검사합니다. | secret path 해석을 startup/backup/restore/rotation/diagnostics가 공유할 수 있게 합니다. |
| 486ffb5c65aa | tools/stack_runtime.py | read_private_secret | `O_NOFOLLOW`로 열고 descriptor `fstat`으로 regular file, single link, current owner, `0600`, parent directory 안전성을 검사한 뒤 bounded single-line value를 읽습니다. | pathname 검사 뒤 교체되는 TOCTOU window를 descriptor 기반 검사로 줄입니다. |
| 486ffb5c65aa | tools/stack_runtime.py | load_secret_values / secret_payload / service_environment | 검증된 네 값을 mapping으로 만들고 one-off command가 stdin으로 받을 payload와 non-secret environment를 분리합니다. | credential 전달의 producer/consumer 형식이 공통화됩니다. |

#### 비교 기준

- exact commit diff: `git diff 486ffb5c65aa^ 486ffb5c65aa -- <path>`
- 이전 Thread 상태와 비교: `git diff 916391b9f8db 486ffb5c65aa -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | `916391b9f8db`은 file mount를 사용했지만 host source가 symlink, 잘못된 owner/mode, hard link, multiline인지 공통으로 검증하지 않았습니다. |
| 선택한 boundary / decision | rendered Compose metadata를 source of truth로 삼고, path resolution부터 descriptor inspection과 content policy까지 한 module에 모았습니다. |
| 핵심 caller/callee 또는 configuration consumer | `tools/stack_runtime.py`의 `secret_source_paths`; `tools/stack_runtime.py`의 `read_private_secret`; `tools/stack_runtime.py`의 `load_secret_values / secret_payload / service_environment` |
| state / ownership / lifecycle 변화 | host management process가 secret file을 읽고 즉시 memory mapping을 소유합니다. 이후 caller는 raw path를 다시 열지 않고 검증된 mapping/payload를 사용합니다. |
| 주요 failure branch | unsafe type, owner, mode, link count, parent permission, duplicate canonical path, size/multiline/password-shape 위반은 mutation 전에 실패합니다. |
| 이 commit의 보장 | 동일한 hardened secret-input contract를 여러 management operation이 재사용할 수 있습니다. |
| 한계와 다음 관련 commit | 동시 operation이 같은 project state와 secret generation을 바꾸는 race는 아직 막지 않습니다. `e77c6f151b07`가 project-scoped lock을 추가하고 `dc9601f5e670`의 startup이 lock 안에서 이 helper를 호출합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: 동시 operation이 같은 project state와 secret generation을 바꾸는 race는 아직 막지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `e77c6f151b07`가 project-scoped lock을 추가하고 `dc9601f5e670`의 startup이 lock 안에서 이 helper를 호출합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: 동일한 hardened secret-input contract를 여러 management operation이 재사용할 수 있습니다.

### 3. `e77c6f151b07` — refactor(runtime): 프로젝트 관리 작업 잠금 공통화

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `RECOVERY`, `OPERATIONS`, `RISK` |
| Source-defined role | Established per-project management-operation serialization. |
| 이전 Thread commit | `486ffb5c65aa` |
| 다음 Thread commit | `dc9601f5e670` |

#### 원문이 확정한 범위

- **Summary:** Adds a per-user, per-project non-blocking advisory lock in a private fixed directory.
- **Classification reason:** Serializing management operations is a critical concurrency invariant across later startup, backup, restore, and rotation flows, though the change is a focused mechanism rather than the whole project architecture.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `e77c6f151b07`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `tools/stack_runtime.py`의 `project_operation_lock`에서 TMPDIR 변경과 무관한 project identity를 사용합니다.
- `tools/stack_runtime.py`의 `os.open / flock LOCK_EX|LOCK_NB`에서 같은 project의 동시 management operation은 대기하지 않고 명시적으로 충돌 실패합니다.
- `tools/stack_runtime.py`의 `context-manager cleanup`에서 lock lifetime이 with-block의 management transaction과 일치합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| e77c6f151b07 | tools/stack_runtime.py | project_operation_lock | current user 전용 fixed private directory를 검사하고 project name을 opaque filename으로 변환해 lock file을 엽니다. | TMPDIR 변경과 무관한 project identity를 사용합니다. |
| e77c6f151b07 | tools/stack_runtime.py | os.open / flock LOCK_EX\|LOCK_NB | no-follow·owner/mode/type 검사를 거친 descriptor에 non-blocking exclusive advisory lock을 잡습니다. | 같은 project의 동시 management operation은 대기하지 않고 명시적으로 충돌 실패합니다. |
| e77c6f151b07 | tools/stack_runtime.py | context-manager cleanup | 예외 여부와 관계없이 flock release와 descriptor close가 수행됩니다. | lock lifetime이 with-block의 management transaction과 일치합니다. |

#### 비교 기준

- exact commit diff: `git diff e77c6f151b07^ e77c6f151b07 -- <path>`
- 이전 Thread 상태와 비교: `git diff 486ffb5c65aa e77c6f151b07 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | secret read helper가 안전해도 두 startup/backup/restore/rotation이 같은 Compose project를 동시에 변경하면 각자의 사전 조건이 무효화될 수 있었습니다. |
| 선택한 boundary / decision | lock identity를 project name에 맞추고 management operation 전체를 non-blocking exclusive lock으로 감쌌습니다. |
| 핵심 caller/callee 또는 configuration consumer | `tools/stack_runtime.py`의 `project_operation_lock`; `tools/stack_runtime.py`의 `os.open / flock LOCK_EX\|LOCK_NB`; `tools/stack_runtime.py`의 `context-manager cleanup` |
| state / ownership / lifecycle 변화 | lock descriptor를 보유한 host process가 transaction 동안 project mutation 권한을 소유합니다. 다른 project name은 별도 lock이므로 병렬 실행 가능합니다. |
| 주요 failure branch | 같은 project lock contention은 즉시 domain error가 됩니다. process death 시 OS가 descriptor를 닫아 lock을 회수합니다. |
| 이 commit의 보장 | 동일 project를 변경하는 cooperating management code가 겹치지 않는다는 concurrency invariant를 제공합니다. |
| 한계와 다음 관련 commit | Docker 외부에서 lock을 무시하는 수동 명령이나 non-cooperating process는 막지 못합니다. `dc9601f5e670`이 startup orchestration에 lock을 적용하고 이후 backup/restore/rotation이 같은 mechanism을 공유합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: Docker 외부에서 lock을 무시하는 수동 명령이나 non-cooperating process는 막지 못합니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `dc9601f5e670`이 startup orchestration에 lock을 적용하고 이후 backup/restore/rotation이 같은 mechanism을 공유합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: 동일 project를 변경하는 cooperating management code가 겹치지 않는다는 concurrency invariant를 제공합니다.

### 4. `dc9601f5e670` — fix(init): 중단된 단계별 초기화를 수렴

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **S** |
| Tags | `ARCH`, `BOOTSTRAP`, `RECOVERY` |
| Source-defined role | Replaced steady-state secret mounts and one-shot initialization with staged one-off bootstrap. |
| 이전 Thread commit | `e77c6f151b07` |
| 다음 Thread commit | `3beebbfc4723` |

#### 원문이 확정한 범위

- **Summary:** Replaces in-container first-run setup with locked, staged one-off bootstrap orchestration, completion markers, and convergent restart behavior.
- **Classification reason:** This is the decisive lifecycle redesign: it removes runtime secret mounts, separates configuration state, survives interrupted initialization, and determines how persistent services are safely brought to readiness.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `dc9601f5e670`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `tools/start_stack.py`의 `run_action / staged startup`에서 startup 전체가 한 project transaction으로 직렬화됩니다.
- `srcs/docker-compose.yml`의 `one-off bootstrap commands / runtime service blocks`에서 secret lifetime이 short-lived bootstrap process로 제한됩니다.
- `srcs/requirements/mariadb/tools/docker-entrypoint.sh`의 `staging data directory / marker / rename`에서 최종 DB path는 verified complete state만 보이도록 게시됩니다.
- `srcs/requirements/wordpress/tools/docker-entrypoint.sh`의 `core/config/site/users stages / marker`에서 partial stage는 marker 부재로 다음 실행에서 다시 수렴합니다.
- `srcs/docker-compose.yml`의 `healthcheck marker + process probe`에서 durable completion과 live readiness가 동시에 충족돼야 healthy입니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| dc9601f5e670 | tools/start_stack.py | run_action / staged startup | Compose path와 project를 검증하고 `project_operation_lock` 안에서 host secret을 읽은 뒤 MariaDB bootstrap→DB service health→WordPress bootstrap→application/Nginx start 순서로 실행합니다. | startup 전체가 한 project transaction으로 직렬화됩니다. |
| dc9601f5e670 | srcs/docker-compose.yml | one-off bootstrap commands / runtime service blocks | credential은 bootstrap container stdin으로만 전달되고 long-running service block에서는 password environment와 `/run/secrets` mount가 제거됩니다. | secret lifetime이 short-lived bootstrap process로 제한됩니다. |
| dc9601f5e670 | srcs/requirements/mariadb/tools/docker-entrypoint.sh | staging data directory / marker / rename | private staging에서 system tables와 accounts를 만들고 인증 검증·sync·completion marker를 끝낸 뒤 최종 data directory로 rename합니다. | 최종 DB path는 verified complete state만 보이도록 게시됩니다. |
| dc9601f5e670 | srcs/requirements/wordpress/tools/docker-entrypoint.sh | core/config/site/users stages / marker | core files, private config volume, site, users와 password를 단계별로 수렴·검증하고 마지막에 marker를 atomic replace합니다. | partial stage는 marker 부재로 다음 실행에서 다시 수렴합니다. |
| dc9601f5e670 | srcs/docker-compose.yml | healthcheck marker + process probe | MariaDB는 marker/socket/PID, WordPress는 marker/FastCGI ping을 함께 요구합니다. | durable completion과 live readiness가 동시에 충족돼야 healthy입니다. |

#### 비교 기준

- exact commit diff: `git diff dc9601f5e670^ dc9601f5e670 -- <path>`
- 이전 Thread 상태와 비교: `git diff e77c6f151b07 dc9601f5e670 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### Fix chain 기록

| 단계 | 학습자 기록 |
| --- | --- |
| 기존 가정 | directory/file existence를 정상 초기화 완료로 간주했습니다. |
| 실제 failure 또는 위험 | abrupt process death가 cleanup 없이 partial persistent state를 남기며 다음 start가 이를 재사용할 수 있습니다. |
| root cause | initialization과 long-running serving이 같은 entrypoint/lifetime에 결합되고 완료 publication boundary가 없었습니다. |
| 수정된 invariant / decision | short-lived one-off bootstrap이 verified marker 또는 atomic data-directory rename을 게시한 뒤에만 runtime service를 시작합니다. |
| 실제 수정 코드 | `tools/start_stack.py`의 `run_action / staged startup`; `srcs/docker-compose.yml`의 `one-off bootstrap commands / runtime service blocks`; `srcs/requirements/mariadb/tools/docker-entrypoint.sh`의 `staging data directory / marker / rename`; `srcs/requirements/wordpress/tools/docker-entrypoint.sh`의 `core/config/site/users stages / marker`; `srcs/docker-compose.yml`의 `healthcheck marker + process probe` |
| 변경된 ordering / ownership / lifecycle | host code가 secret source와 operation order를 소유합니다. bootstrap container는 persistent volume을 한 번 수렴시키고 종료합니다. long-running service는 verified marker가 있는 state를 serving만 합니다. |
| 이 fix가 보장하는 것 | 장기 service의 secret-free boundary, same-project serialization, MariaDB atomic data publication, WordPress verified marker, marker+process readiness를 보장합니다. |
| 아직 보장하지 않는 것 | filesystem/DB 자체의 하드웨어 crash durability나 외부 수동 mutation까지 원자화하지는 않습니다. 실제 SIGKILL 수렴은 test commit이 별도로 증명해야 합니다. |
| 연결되는 regression test | static ordering contract와 durable-stage SIGKILL regression이 이 corrected invariant를 고정합니다. `3beebbfc4723`이 source contract를 고정하고 `2bf6d3f11337`이 durable stage마다 bootstrap process를 SIGKILL해 재실행 수렴을 검증합니다. |

#### S-level state transition 기록

| 단계 | 학습자 기록 |
| --- | --- |
| correction 전 authoritative state | 초기 entrypoint는 long-running service가 secret을 mount한 채 빈/존재 조건으로 즉석 초기화했습니다. SIGKILL 뒤 partial directory가 남으면 다음 start가 완료로 오인될 수 있었습니다. |
| partial / ambiguous state 종류 | abrupt process death가 cleanup 없이 partial persistent state를 남기며 다음 start가 이를 재사용할 수 있습니다. |
| publication 또는 commit boundary | host orchestrator, project lock, stdin-only one-off bootstrap, staging publication, completion marker, private config volume로 startup lifecycle을 재설계했습니다. |
| rollback / compensation 진입 조건 | 어느 stage에서 종료돼도 최종 marker/rename 전 state는 완료로 공개되지 않습니다. 재실행은 existing verified 부분을 검사하고 누락된 stage를 다시 수행합니다. one-off 실패는 long-running service start를 허용하지 않습니다. |
| recovery 중 보호되는 invariant | host code가 secret source와 operation order를 소유합니다. bootstrap container는 persistent volume을 한 번 수렴시키고 종료합니다. long-running service는 verified marker가 있는 state를 serving만 합니다. |
| 성공 endpoint | 장기 service의 secret-free boundary, same-project serialization, MariaDB atomic data publication, WordPress verified marker, marker+process readiness를 보장합니다. |
| 실패 endpoint | filesystem/DB 자체의 하드웨어 crash durability나 외부 수동 mutation까지 원자화하지는 않습니다. 실제 SIGKILL 수렴은 test commit이 별도로 증명해야 합니다. |
| 후속 regression evidence | `3beebbfc4723`이 source contract를 고정하고 `2bf6d3f11337`이 durable stage마다 bootstrap process를 SIGKILL해 재실행 수렴을 검증합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: filesystem/DB 자체의 하드웨어 crash durability나 외부 수동 mutation까지 원자화하지는 않습니다. 실제 SIGKILL 수렴은 test commit이 별도로 증명해야 합니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `3beebbfc4723`이 source contract를 고정하고 `2bf6d3f11337`이 durable stage마다 bootstrap process를 SIGKILL해 재실행 수렴을 검증합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: 장기 service의 secret-free boundary, same-project serialization, MariaDB atomic data publication, WordPress verified marker, marker+process readiness를 보장합니다.

### 5. `3beebbfc4723` — test(init): 단계별 초기화 계약 검사

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **B** |
| Tags | `TEST`, `BOOTSTRAP` |
| Source-defined role | Added a source contract for completion markers and staged recovery. |
| 이전 Thread commit | `dc9601f5e670` |
| 다음 Thread commit | `2bf6d3f11337` |

#### 원문이 확정한 범위

- **Summary:** Adds static assertions for staged MariaDB and WordPress bootstrap markers and recovery structure.
- **Classification reason:** The checks protect the new design at a source-pattern level, but they do not yet prove real interruption recovery.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `3beebbfc4723`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `tests/validate_stack.py`의 `bootstrap source-order validation`에서 후속 refactor가 marker를 너무 일찍 게시하는 회귀를 정적으로 막습니다.
- `tests/validate_stack.py`의 `runtime secret boundary checks`에서 one-off bootstrap-only secret boundary를 source contract로 고정합니다.
- `tests/validate_stack.py`의 `health marker patterns`에서 readiness semantics가 단순 liveness로 약화되지 않게 합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 3beebbfc4723 | tests/validate_stack.py | bootstrap source-order validation | MariaDB staging/marker/rename과 WordPress files/config/site/users/password verification/marker의 상대적 source order를 검사합니다. | 후속 refactor가 marker를 너무 일찍 게시하는 회귀를 정적으로 막습니다. |
| 3beebbfc4723 | tests/validate_stack.py | runtime secret boundary checks | runtime service block의 `/run/secrets` mount와 password-bearing environment를 거부합니다. | one-off bootstrap-only secret boundary를 source contract로 고정합니다. |
| 3beebbfc4723 | tests/validate_stack.py | health marker patterns | healthcheck가 completion marker와 live socket/FastCGI probe를 함께 요구하는지 검사합니다. | readiness semantics가 단순 liveness로 약화되지 않게 합니다. |

#### 비교 기준

- exact commit diff: `git diff 3beebbfc4723^ 3beebbfc4723 -- <path>`
- 이전 Thread 상태와 비교: `git diff dc9601f5e670 3beebbfc4723 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### 테스트 학습 기록

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariant | completion marker는 모든 필수 persistent state 검증 뒤에만 게시되고 runtime service는 secret을 mount하지 않습니다. |
| 재현하는 failure / boundary | 후속 source 변경이 marker를 앞당기거나 `/run/secrets`를 runtime service에 재도입하는 경계입니다. |
| test technique | static source contract와 Compose block pattern/order 검사 |
| fixture와 failure injection | repository의 Dockerfile/entrypoint/Compose source 자체가 fixture이며 별도 runtime failure injection은 없습니다. |
| 실제 통과하는 production path | `tests/validate_stack.py`가 source files를 읽어 marker·rename·health·secret pattern을 검사합니다. |
| 핵심 assertion | 필수 pattern의 존재, 금지 pattern의 부재, publication order의 단조 증가를 확인합니다. |
| 이 테스트가 증명하는 것 | 해당 architecture가 source에 표현되어 있고 명백한 순서 회귀가 없음을 증명합니다. |
| 이 테스트가 증명하지 않는 것 | shell control flow의 모든 branch, Docker runtime behavior, fsync 효과, SIGKILL 수렴은 증명하지 않습니다. |
| 성격 | source contract regression test |
| 막는 후속 regression | marker-before-verification, runtime secret mount, marker 없는 healthcheck 회귀를 막습니다. |
| 직접 실행 command와 결과 | 실행하지 않았습니다. 현재 환경에는 Docker와 로컬 repository checkout이 없습니다. 해당 SHA의 test code와 command wiring만 검사했습니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: SIGKILL 뒤 실제 volume이 수렴하거나 Docker가 health gate를 적용한다는 runtime 사실은 증명하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `2bf6d3f11337`이 동일 invariant를 live Docker와 SIGKILL로 보강합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: architecture를 구성하는 marker order, secret-free runtime, health contract가 source에 존재함을 빠르게 증명합니다.

### 6. `2bf6d3f11337` — test(init): 안정 단계별 초기화 중단 복구 검증

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `TEST`, `BOOTSTRAP`, `RECOVERY` |
| Source-defined role | Killed bootstrap containers at every durable stage and proved rerun convergence. |
| 이전 Thread commit | `3beebbfc4723` |
| 다음 Thread commit | 없음 |

#### 원문이 확정한 범위

- **Summary:** Kills MariaDB and WordPress bootstrap containers at every durable stage, reruns startup, and verifies state, credentials, markers, and temporary-file cleanup.
- **Classification reason:** This is unusually strong evidence for the staged-convergence invariant and demonstrates that the core initialization design survives abrupt process death rather than only graceful errors.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `2bf6d3f11337`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `tests/runtime_stack.py`의 `verify_bootstrap / pause-ready protocol`에서 sleep 추측이 아니라 production test hook의 명시적 handoff를 사용합니다.
- `tests/runtime_stack.py`의 `docker kill --signal KILL`에서 graceful exception cleanup이 아니라 abrupt process death를 재현합니다.
- `tests/runtime_stack.py`의 `rerun start / state and boundary assertions`에서 모든 durable stage가 재실행 수렴한다는 end-to-end evidence를 만듭니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 2bf6d3f11337 | tests/runtime_stack.py | verify_bootstrap / pause-ready protocol | 각 durable bootstrap stage에 `--pause-after`와 private ready file을 설정해 process가 정확한 stage를 통과했음을 동기화합니다. | sleep 추측이 아니라 production test hook의 명시적 handoff를 사용합니다. |
| 2bf6d3f11337 | tests/runtime_stack.py | docker kill --signal KILL | ready marker 확인 직후 해당 one-off bootstrap container를 SIGKILL하고, shell trap이 실행되지 않는 상태를 만듭니다. | graceful exception cleanup이 아니라 abrupt process death를 재현합니다. |
| 2bf6d3f11337 | tests/runtime_stack.py | rerun start / state and boundary assertions | 같은 project를 다시 시작해 DB/site/users/passwords/markers/health를 확인하고 long-running container에 secret mount/env가 없는지 재검사합니다. | 모든 durable stage가 재실행 수렴한다는 end-to-end evidence를 만듭니다. |

#### 비교 기준

- exact commit diff: `git diff 2bf6d3f11337^ 2bf6d3f11337 -- <path>`
- 이전 Thread 상태와 비교: `git diff 3beebbfc4723 2bf6d3f11337 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### 테스트 학습 기록

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariant | verified marker/rename 전 partial state는 완료로 취급되지 않으며 같은 project startup은 다시 수렴합니다. |
| 재현하는 failure / boundary | MariaDB와 WordPress의 각 durable stage 직후 one-off bootstrap process가 SIGKILL되는 경계입니다. |
| test technique | live integration + deterministic pause-ready handshake + SIGKILL |
| fixture와 failure injection | 고유 project/port/secrets를 만들고 production `start_stack.py`에 pause stage를 전달한 뒤 ready file에서 동기화해 target container를 KILL합니다. |
| 실제 통과하는 production path | host orchestrator→one-off bootstrap→persistent volumes→health-gated long-running services 전체 경로를 통과합니다. |
| 핵심 assertion | 재실행 성공, marker/health, DB/site/users/passwords, runtime secret mount/env 부재, project cleanup을 확인합니다. |
| 이 테스트가 증명하는 것 | graceful handler 없이 process가 죽어도 durable stage별 재시도가 complete state로 수렴함을 증명합니다. |
| 이 테스트가 증명하지 않는 것 | 하드웨어 crash consistency, uninstrumented 임의 지점, 외부 concurrent mutation은 증명하지 않습니다. |
| 성격 | deterministic runtime regression |
| 막는 후속 regression | partial directory/marker 조기 publication, SIGKILL 뒤 permanent broken volume, steady-state secret 재도입을 막습니다. |
| 직접 실행 command와 결과 | 실행하지 않았습니다. 현재 환경에는 Docker와 로컬 repository checkout이 없습니다. 해당 SHA의 test code와 command wiring만 검사했습니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: 전원 손실/스토리지 write cache, 임의의 모든 instruction, 다른 Docker/OS 조합을 포괄하지는 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: Thread 3 이후 runtime harness의 기반이 되며 bootstrap lifecycle의 핵심 regression evidence입니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: 각 durable MariaDB/WordPress stage에서 abrupt death가 발생해도 재실행이 one complete stack과 secret-free runtime으로 수렴함을 증명합니다.

## Invariant ledger

| Source에서 연결된 invariant | 처음/초기 단계 | 강화·교정 단계 | 검증 단계 | 학습자가 확인한 실제 근거 |
| --- | --- | --- | --- | --- |
| 장기 실행 컨테이너는 host secret mount나 password-bearing environment를 유지하지 않습니다. | 916391b9f8db의 중간 단계 | dc9601f5e670에서 최종 경계 확립 | 2bf6d3f11337 | Compose runtime service block과 live container inspect 모두 `/run/secrets`/credential env 부재를 요구합니다. |
| 동일 Compose project를 변경하는 management operation은 직렬화됩니다. | e77c6f151b07 | dc9601f5e670 startup 적용 | 후속 backup/rotation runtime tests | `project_operation_lock`은 project identity별 non-blocking flock을 startup/management transaction 전체에 유지합니다. |
| completion marker는 필수 data/config/account/credential 검증 뒤에만 게시됩니다. | dc9601f5e670 | 3beebbfc4723 source contract | 2bf6d3f11337 | MariaDB staging rename과 WordPress marker replace가 verification 뒤에 있고 SIGKILL 재실행이 이를 실제로 확인합니다. |
| service readiness는 durable marker와 live process readiness를 함께 요구합니다. | dc9601f5e670 | 3beebbfc4723 | 2bf6d3f11337 | MariaDB marker+socket+PID, WordPress marker+FastCGI ping이 health condition입니다. |

### Ledger 보완 기록

- source에 명시되지 않은 새 invariant를 확정 사실로 추가하지 않습니다.
- invariant가 실제로 부족했음을 드러낸 commit 또는 failure stage: `916391b9f8db`의 runtime secret mounts와 최초 entrypoint idempotency는 process death 뒤 partial persistent state를 완료 상태와 구분하지 못했습니다.
- marker, rename, lock, health, authentication, cleanup 등 invariant를 고정하는 concrete mechanism: host descriptor validation, per-project lock, MariaDB staging rename, WordPress durable marker, marker-aware health와 one-off bootstrap ordering이 수렴 조건을 고정합니다.
- 후속 commit이 invariant를 약화하지 못하게 하는 regression evidence: `3beebbfc4723` static contract와 `2bf6d3f11337`의 durable-stage SIGKILL matrix가 source 구조와 실제 재실행 수렴을 각각 보호합니다.
## Failure → Fix → Test 연결

| failure / 위험 | fix 또는 mechanism | test / evidence | 학습자 연결 기록 |
| --- | --- | --- | --- |
| steady-state service가 secret mount를 보유하고 ordinary entrypoint가 초기화를 수행 | dc9601f5e670가 host-read/stdin/one-off bootstrap으로 교정 | 2bf6d3f11337가 runtime secret boundary와 rerun convergence를 검증 | credential lifetime과 state convergence를 serving lifecycle에서 분리했습니다. |
| partial volume existence가 completed state로 오인됨 | staging directory + verified marker + atomic publication | 3beebbfc4723 static contract와 2bf6d3f11337 SIGKILL regression | 완료 판정은 단순 경로 존재가 아니라 검증 뒤 publication입니다. |
| 동시 management operation이 같은 resource assumptions를 변경 | e77c6f151b07의 per-project non-blocking lock | 후속 cross-TMPDIR contention과 management tests | lock identity는 project name이며 다른 project는 병렬 가능합니다. |

### 직접 재구성할 chain

```text
기존 가정: 존재 여부 기반 idempotent entrypoint와 graceful cleanup이면 first run 재시도가 안전하다는 가정
  → 실제 failure 또는 위험: SIGKILL이 system directory, WordPress files 또는 DB rows 일부만 남기면 다음 실행이 이를 완료로 오인할 수 있었습니다.
  → root cause: credential material이 long-running service에 붙어 있었고 durable completion을 나타내는 verified publication point가 없었습니다.
  → 수정된 invariant / decision: host lock 아래 short-lived bootstrap만 secrets를 받고 MariaDB는 staging directory를 rename하며 WordPress는 검증 뒤 marker를 원자 게시합니다.
  → 해당 SHA의 실제 수정 코드: `dc9601f5e670`의 `start_stack.py`와 두 bootstrap entrypoint의 staging/marker/publish 경로
  → failure injection 또는 regression test: `2bf6d3f11337`가 각 pause stage에서 bootstrap container를 SIGKILL하고 같은 startup을 재실행합니다.
  → 증명된 보장 / 남은 비보장: 중간 state는 재실행으로 verified endpoint에 수렴하고 steady-state containers에는 secret mounts가 없지만 host/process 전체 crash의 모든 storage failure까지 증명하지는 않습니다.
```

## Ownership / state / responsibility 변화

| 대상 | 이전 상태 | 이후 책임/authoritative state | 확인할 근거 | 학습자 결론 |
| --- | --- | --- | --- | --- |
| Host management code | Compose가 secret file을 service에 mount | secret source 검증, project lock, bootstrap orchestration 소유 | 486ffb5c65aa/e77c6f151b07/dc9601f5e670 | credential과 operation order를 container 밖에서 통제합니다. |
| One-off bootstrap container | 장기 service entrypoint와 초기화 결합 | stdin credential을 잠시 받아 persistent state convergence만 수행 | dc9601f5e670 Compose run/labels/stdin path | 종료 뒤 credential-bearing process가 남지 않습니다. |
| Long-running MariaDB/WordPress | startup 때 secret path 접근 | verified persistent state를 열고 serving만 수행 | runtime mounts/env absence와 marker-gated command | steady state에서 host credential file을 보유하지 않습니다. |
| Completion marker | directory/file existence의 암묵적 판단 | 검증이 끝난 durable state의 publication boundary | write/fsync/rename/health evidence | marker 부재는 재수렴 필요를 뜻합니다. |
| WordPress configuration | public web tree 안 config | private config volume이 authoritative이고 web tree는 controlled symlink | dc9601f5e670 mount/symlink/marker path | Nginx가 private config volume을 읽지 않습니다. |

## Thread 최종 상태

- **Source-confirmed endpoint:** The earlier `_FILE` and Compose-secret model reduced direct environment exposure but still attached credential material to service startup. The later architecture resolves secrets on the host while holding the project lock, sends only required values to short-lived bootstrap containers, and lets long-running services start from verified persistent state. The final SIGKILL scenario is important because it validates the design's intended convergence after process death, not only after controlled errors.
- 최종 authoritative state와 owner: MariaDB final data directory/marker와 WordPress data/config marker가 persistent authoritative state이며 host management code가 secret source와 project lock을 소유합니다.
- 정상 실행의 entry point와 완료 조건: `start_stack.py`가 lock 안에서 secret을 읽고 DB bootstrap, DB health, WordPress bootstrap, application/Nginx start를 끝내며 모든 marker+process health가 성공하면 완료입니다.
- failure 또는 interruption 뒤 retry/rollback/compensation 조건: 실패·SIGKILL 뒤 marker가 없는 state는 다음 실행에서 다시 검사·수렴하며, complete marker가 없으면 long-running consumer를 healthy로 열지 않습니다.
- 이 Thread가 다른 Thread에 제공하는 전제: backup, restore, rotation이 같은 project lock과 hardened secret-input boundary를 재사용할 수 있는 전제를 제공합니다.
- 이 Thread 단독으로는 증명하지 않는 것: 하드웨어 crash durability, non-cooperating manual Docker mutation, 모든 가능한 instruction-level kill point를 단독으로 증명하지 않습니다.

## 최종 architecture 또는 execution flow 정리

| 단계 | 확인할 흐름 | 실제 코드 근거 | 정상 전이 | 실패·정리·재시도 |
| --- | --- | --- | --- | --- |
| 1 | project lock 획득 | e77c6f151b07 `project_operation_lock` | 같은 project의 management mutation을 직렬화합니다. | contention이면 mutation 없이 즉시 실패합니다. |
| 2 | secret path 해석/읽기 | 486ffb5c65aa `secret_source_paths`, `read_private_secret` | rendered metadata와 descriptor 검사로 네 값을 memory에 올립니다. | unsafe path/mode/content면 bootstrap 전 실패합니다. |
| 3 | MariaDB one-off bootstrap | dc9601f5e670 `start_stack.py` + MariaDB entrypoint | stdin credential로 staging DB와 accounts를 만듭니다. | 중단 시 final directory/marker가 없으므로 다음 실행이 다시 수행합니다. |
| 4 | DB state publish | dc9601f5e670 marker/fsync/rename | 검증된 staging을 final path로 게시합니다. | publication 전 failure는 incomplete state를 final로 보이지 않습니다. |
| 5 | WordPress bootstrap | dc9601f5e670 WordPress entrypoint | private config, core, site, users/passwords를 검증·수렴합니다. | 어느 stage 실패든 marker를 게시하지 않고 재실행 대상이 됩니다. |
| 6 | runtime service start | dc9601f5e670 Compose health/start stages | marker+live probe 성공 뒤 WordPress와 Nginx를 엽니다. | health timeout은 startup failure이며 secret mount는 runtime에 없습니다. |
| 7 | SIGKILL regression | 2bf6d3f11337 `verify_bootstrap` | 각 durable stage kill 뒤 같은 project가 complete state로 수렴합니다. | test harness가 project-scoped teardown을 시도하며 실행 환경에서는 이번에 재실행하지 않았습니다. |

### 학습자의 최종 설명

> 초기 `_FILE` 방식은 password literal을 environment에서 제거했지만 long-running container에 secret mount를 남기고 초기화와 serving을 한 entrypoint에 묶었습니다. `486ffb5c65aa`와 `e77c6f151b07`은 host secret trust boundary와 same-project serialization을 만들었고, `dc9601f5e670`은 이 기반 위에서 startup을 short-lived one-off bootstrap transaction으로 바꿨습니다. MariaDB는 private staging을 검증한 뒤 final directory를 게시하고, WordPress는 config/site/users/password 검증 뒤 completion marker를 게시합니다. long-running services는 이 verified state만 열며 secret을 mount하지 않습니다. 정적 contract는 source order를 고정하고, SIGKILL test는 cleanup trap 없이 죽은 실제 process 뒤에도 같은 project가 수렴한다는 별도 runtime evidence를 제공합니다.

## 학습 완료 자가 점검

- [x] Compose secret 자체를 최종 steady-state secret 경계라고 설명하지 않았습니까?
- [x] marker 생성 시점과 data directory publication 시점을 실제 코드 순서로 확인했습니까?
- [x] SIGKILL 뒤 shell cleanup trap이 실행된다고 가정하지 않았습니까?
- [x] 같은 project만 직렬화되고 다른 project는 병렬 가능하다는 granularity를 설명했습니까?
- [x] 모든 code snippet에 SHA와 path/symbol을 기록했습니다.
- [x] final HEAD의 field/helper/test를 이전 SHA에 소급하지 않았습니다.
- [x] source가 확정하지 않은 사실을 추정으로 채우지 않았습니다.
- [x] test가 증명하는 것과 증명하지 않는 것을 구분했습니다.
- [x] 이 Thread를 commit 순서대로 구두 설명할 수 있습니다.
