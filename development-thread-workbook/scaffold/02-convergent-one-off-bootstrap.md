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
- `project_operation_lock`의 path, ownership, no-follow, non-blocking flock 계약을 실제 코드로 확인했습니다.
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

- public environment template에서 password values가 제거되고 host secret file path variables로 바뀐 diff를 확인합니다.
- Compose `secrets` declarations, source file mapping, MariaDB/WordPress별 attachment subset을 표로 옮깁니다.
- entrypoint에 전달되는 `_FILE=/run/secrets/...` mapping과 long-running service가 mount를 유지하는 초기 구조를 기록합니다.
- MariaDB health check가 environment password 대신 mounted root secret file을 읽는 command를 확인합니다.
- 이 commit이 줄인 노출과 아직 남긴 steady-state secret mount를 구분합니다.

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

- shared runtime module에서 rendered Compose metadata로 네 secret source path를 해석하는 함수와 distinct canonical path check를 찾습니다.
- path open 시 symbolic link를 따르지 않는 flag, descriptor 기반 `stat`, regular file/nlink/owner/mode 검사 순서를 확인합니다.
- parent directory permission validation과 file content의 size, multiline, password length/character policy branch를 기록합니다.
- service environment extraction과 validated secrets를 stdin payload로 serialize하는 helper의 caller를 찾습니다.
- 검사 전 pathname과 검사 후 descriptor 사이 substitution window를 어떻게 줄였는지 실제 API 사용으로 설명합니다.

#### 비교 기준

- exact commit diff: `git diff 486ffb5c65aa^ 486ffb5c65aa -- <path>`
- 이전 Thread 상태와 비교: `git diff 916391b9f8db 486ffb5c65aa -- <path>`
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

- `project_operation_lock` 또는 동등한 context manager를 찾아 project name에서 opaque lock filename을 만드는 코드를 확인합니다.
- per-user fixed private directory의 위치, mode/owner/type/no-follow validation을 기록합니다.
- lock file open과 non-blocking exclusive `flock` branch, contention error mapping을 추적합니다.
- context exit에서 lock release와 모든 descriptor cleanup이 exception path에도 실행되는지 확인합니다.
- 동일 project와 다른 project name을 넣었을 때 lock identity가 어떻게 달라지는지 계산하고, `TMPDIR`가 identity에 관여하지 않는지 확인합니다.

#### 비교 기준

- exact commit diff: `git diff e77c6f151b07^ e77c6f151b07 -- <path>`
- 이전 Thread 상태와 비교: `git diff 486ffb5c65aa e77c6f151b07 -- <path>`
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

- `start_stack.py`의 top-level orchestration에서 path resolution → project lock → host secret read → DB bootstrap → WordPress bootstrap → frontend start 순서를 호출 그래프로 만듭니다.
- one-off bootstrap container command에 project/ownership labels가 붙고 credentials가 stdin으로만 전달되는 위치를 확인합니다.
- MariaDB entrypoint의 private staging directory, socket-only temporary server, account creation/verification, completion marker, sync, final rename 순서를 추적합니다.
- marked existing DB state의 verification branch와 unmarked/malformed durable directory rejection branch를 비교합니다.
- WordPress core validation, private config volume, controlled public symlink, DB settings verification, URL temp-file/rename, site/users/password verification, marker publication을 순서대로 표시합니다.
- Compose health check가 marker와 MariaDB socket/PHP-FPM ping을 함께 요구하도록 바뀐 exact condition을 확인합니다.
- stale bootstrap container removal 전에 project/stack ownership labels를 검증하는 branch와 hidden pause hooks를 찾습니다.
- parent architecture가 가정한 “entrypoint 재실행이면 충분”이라는 조건이 어떤 partial state에서 깨지는지 코드 수준 failure scenario를 작성합니다.

#### 비교 기준

- exact commit diff: `git diff dc9601f5e670^ dc9601f5e670 -- <path>`
- 이전 Thread 상태와 비교: `git diff e77c6f151b07 dc9601f5e670 -- <path>`
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

- static validator가 MariaDB completion marker, staging directory, bounded wait, publish checkpoint, account reconciliation을 어떤 source pattern으로 요구하는지 찾습니다.
- WordPress marker, authenticated DB wait, installation-state query, separate config directory assertion을 구분합니다.
- production code path를 실행하지 않는 source-contract test라는 점을 확인하고, regex/text assertion이 놓칠 수 있는 semantic failure를 기록합니다.
- 각 assertion을 제거하거나 이름만 남겼을 때 false positive가 가능한지 해당 test technique 관점에서 평가합니다.

#### 비교 기준

- exact commit diff: `git diff 3beebbfc4723^ 3beebbfc4723 -- <path>`
- 이전 Thread 상태와 비교: `git diff dc9601f5e670 3beebbfc4723 -- <path>`
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

- runtime harness가 production startup command를 `Popen`으로 실행하고 synchronized pause stage를 전달하는 경로를 찾습니다.
- kill 전에 bootstrap container의 Compose project label과 stack-specific bootstrap label을 모두 검증하는 assertion을 확인합니다.
- MariaDB 다섯 stage와 WordPress 다섯 stage의 exact stage names, pause point, `SIGKILL`, rerun sequence를 표로 만듭니다.
- SIGKILL 뒤 staging remnants, marker, private config, public link, user authentication, temporary files를 검사하는 production-state probes를 추적합니다.
- WordPress stage case 사이 volume reset 이유와 final running-service/secret-boundary assertions를 확인합니다.
- 이 test가 shell trap cleanup이 아니라 persistent publication ordering을 증명한다는 근거를 기록합니다.

#### 비교 기준

- exact commit diff: `git diff 2bf6d3f11337^ 2bf6d3f11337 -- <path>`
- 이전 Thread 상태와 비교: `git diff 3beebbfc4723 2bf6d3f11337 -- <path>`
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
| 장기 실행 컨테이너는 host secret mount나 password-bearing environment를 유지하지 않습니다. | `916391b9f8db의 중간 단계` | `dc9601f5e670에서 최종 경계 확립` | `2bf6d3f11337` | `[학습자: 실제 code/test evidence]` |
| 동일 Compose project를 변경하는 management operation은 직렬화됩니다. | `e77c6f151b07` | `dc9601f5e670에서 startup이 사용` | `후속 backup/rotation 및 runtime tests` | `[학습자: 실제 code/test evidence]` |
| completion marker는 필수 data/config/account/credential 검증 뒤에만 게시됩니다. | `dc9601f5e670` | `3beebbfc4723가 source contract 고정` | `2bf6d3f11337` | `[학습자: 실제 code/test evidence]` |
| service readiness는 durable marker와 live process-level readiness를 함께 요구합니다. | `dc9601f5e670` | `3beebbfc4723` | `2bf6d3f11337` | `[학습자: 실제 code/test evidence]` |

### Ledger 보완 기록

- source에 명시되지 않은 새 invariant를 확정 사실로 추가하지 않습니다.
- invariant가 실제로 부족했음을 드러낸 commit 또는 failure stage: `[학습자 작성]`
- marker, rename, lock, health, authentication, cleanup 등 invariant를 고정하는 concrete mechanism: `[학습자 작성]`
- 후속 commit이 invariant를 약화하지 못하게 하는 regression evidence: `[학습자 작성]`

## Failure → Fix → Test 연결

| failure / 위험 | fix 또는 mechanism | test / evidence | 학습자 연결 기록 |
| --- | --- | --- | --- |
| steady-state service가 secret mount를 보유하고 ordinary entrypoint가 초기화를 수행 | dc9601f5e670가 host-read/stdin/one-off bootstrap으로 교정 | 2bf6d3f11337가 long-running secret boundary와 rerun convergence를 검증 | `[학습자: root cause와 code/test 연결]` |
| partial volume이 존재하면 단순 existence check가 completed state로 오인될 수 있음 | staging directory + verified completion marker + atomic publication | 3beebbfc4723 static contract, 2bf6d3f11337 SIGKILL regression | `[학습자: root cause와 code/test 연결]` |
| 동시 bootstrap/backup/restore/rotation이 같은 resource assumptions를 변경할 수 있음 | e77c6f151b07의 per-project lock | 후속 cross-TMPDIR contention 및 management tests | `[학습자: root cause와 code/test 연결]` |

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
| Host management code | Compose가 secret file을 service에 mount | secret source 검증, project lock, bootstrap orchestration 소유 | shared runtime module과 start_stack.py evidence | `[학습자 작성]` |
| One-off bootstrap container | 장기 service entrypoint와 초기화가 결합 | 필요 credential을 stdin으로 잠시 받아 state convergence만 수행 | Compose run/labels/stdin path evidence | `[학습자 작성]` |
| Long-running MariaDB/WordPress | startup 때 secret path 접근 | 검증된 persistent state만 열고 serving 책임 수행 | environment/mount absence와 command evidence | `[학습자 작성]` |
| Completion marker | directory/file existence가 암묵적 판단 기준 | 검증이 끝난 durable state의 publication boundary | write/fsync/rename/health check evidence | `[학습자 작성]` |
| WordPress configuration | web tree 안의 config | private config volume이 authoritative, public tree는 controlled symlink | mount visibility와 symlink creation evidence | `[학습자 작성]` |

## Thread 최종 상태

- **Source-confirmed endpoint:** The earlier `_FILE` and Compose-secret model reduced direct environment exposure but still attached credential material to service startup. The later architecture resolves secrets on the host while holding the project lock, sends only required values to short-lived bootstrap containers, and lets long-running services start from verified persistent state. The final SIGKILL scenario is important because it validates the design's intended convergence after process death, not only after controlled errors.
- 최종 authoritative state와 owner: `[학습자 작성]`
- 정상 실행의 entry point와 완료 조건: `[학습자 작성]`
- failure 또는 interruption 뒤 retry/rollback/compensation 조건: `[학습자 작성]`
- 이 Thread가 다른 Thread에 제공하는 전제: `[학습자 작성]`
- 이 Thread 단독으로는 증명하지 않는 것: `[학습자 작성]`

## 최종 architecture 또는 execution flow 정리

| 단계 | 확인할 흐름 | 실제 코드 근거 | 정상 전이 | 실패·정리·재시도 |
| --- | --- | --- | --- | --- |
| 1 | host-side startup이 project lock을 획득하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 2 | rendered Compose에서 secret source를 해석하고 안전하게 읽는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 3 | MariaDB one-off bootstrap에 stdin으로 credential을 전달하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 4 | staging DB state를 검증하고 marker/rename으로 publish하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 5 | MariaDB health 뒤 WordPress bootstrap을 시작하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 6 | private config, site, users, passwords를 검증하고 WordPress marker를 게시하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 7 | marker + live readiness가 충족된 뒤 long-running service와 Nginx를 시작하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |

### 학습자의 최종 설명

> `[학습자 작성: 위 표와 commit evidence만 사용해 이 Thread의 설계 → 구현 → 실패 → 수정 → 검증 발전을 설명합니다.]`

## 학습 완료 자가 점검

- [ ] Compose secret 자체를 최종 steady-state secret 경계라고 설명하지 않았습니까?
- [ ] marker 생성 시점과 data directory publication 시점을 실제 코드 순서로 확인했습니까?
- [ ] SIGKILL 뒤 shell cleanup trap이 실행된다고 가정하지 않았습니까?
- [ ] 같은 project만 직렬화되고 다른 project는 병렬 가능하다는 granularity를 설명했습니까?
- [ ] 모든 code snippet에 SHA와 path/symbol을 기록했습니다.
- [ ] final HEAD의 field/helper/test를 이전 SHA에 소급하지 않았습니다.
- [ ] source가 확정하지 않은 사실을 추정으로 채우지 않았습니다.
- [ ] test가 증명하는 것과 증명하지 않는 것을 구분했습니다.
- [ ] 이 Thread를 commit 순서대로 구두 설명할 수 있습니다.
