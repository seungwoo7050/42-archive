# Thread 8 — Operational hardening, private diagnostics, and bounded automation

## Thread 목표

network least privilege, resource/shutdown policy, destructive-operation guard, private diagnostics, owned-resource cleanup, serial local verification, least-privilege CI를 하나의 bounded operational lifecycle로 연결합니다.

**Source significance**

> This progression turns operational policy into executable evidence. Runtime limits and network boundaries are inspected on live containers; destructive commands and diagnostics fail safely; and both local and CI runners account for every project resource they create. The cleanup tooling deliberately avoids global Docker pruning, preserving the same ownership discipline used by the product management paths.

## 이 Thread를 이해하기 위한 핵심 질문

- frontend/backend network 분리 뒤 각 service의 exact membership과 WordPress dual-homing 이유는 무엇입니까?
- Compose에 limit/stop/log policy를 선언한 것과 Docker가 실제 적용한 것을 어떻게 구분해 검증합니까?
- `fclean` confirmation이 generic yes/no가 아니라 selected project name과 같아야 하는 이유는 무엇입니까?
- diagnostics가 secret을 안전하게 읽지 못하면 왜 일부 자료라도 게시하지 않고 fail closed해야 합니까?
- test cleanup failure가 primary scenario success를 무효화해야 하는 이유는 무엇입니까?
- crash recovery cleanup이 label/tag ownership만 사용하고 global prune을 금지하는 이유는 무엇입니까?
- local `verify`와 CI workflow가 result precedence, timeout, diagnostics, cleanup을 어떻게 보존합니까?

## 완료 기준

- live Docker inspect로 network, limits, stop, log, security policy를 source declaration과 대조했습니다.
- destructive Make target의 exact project-name guard와 거부 후 stack health를 확인했습니다.
- diagnostic redaction input, longer-first masking, structural masking, private publication, rescan을 추적했습니다.
- normal cleanup, crash recovery cleanup, `--keep`, leak report exit status의 ownership 차이를 정리했습니다.
- serial verify와 CI의 timeout/cleanup/diagnostic result precedence를 실제 control flow로 확인했습니다.
- workflow 자체를 검증하는 text/AST/mock layers와 금지 패턴을 구분했습니다.

## Commit map

| 순서 | SHA | Subject | Importance | Tags | Source-defined role |
| --- | --- | --- | --- | --- | --- |
| 1 | `27a3dca01d3b` | feat(network): DB 트래픽을 내부 backend로 격리 | **A** | `STACK`<br>`RISK`<br>`ARCH` | Separated public request traffic from the internal database network. |
| 2 | `911544133fb4` | feat(runtime): 서비스 자원과 종료 한계 적용 | **B** | `OPERATIONS`<br>`RISK`<br>`STACK` | Applied resource, stop, privilege, and log-rotation policy. |
| 3 | `74c285925325` | fix(make): 볼륨 삭제 전에 확인을 요구 | **A** | `OPERATIONS`<br>`RISK`<br>`EDGE` | Guarded destructive volume deletion with exact project confirmation. |
| 4 | `ef74ad47ea81` | feat(diagnostics): Compose 비밀값과 민감 항목 마스킹 | **A** | `OPERATIONS`<br>`SECRETS`<br>`RISK` | Established fail-closed diagnostic redaction. |
| 5 | `27a083d91c87` | feat(diagnostics): 비공개 진단 세트와 CLI 연결 | **A** | `OPERATIONS`<br>`SECRETS`<br>`RISK` | Published exclusive private diagnostic sets. |
| 6 | `7fbd41fe5af4` | test(operations): 자원·격리·삭제 보호·진단 검증 | **A** | `TEST`<br>`OPERATIONS`<br>`RISK` | Verified runtime limits, network membership, deletion refusal, and diagnostic safety. |
| 7 | `98e4af62e884` | test(runtime): 프로세스·비밀값·정리 제어 흐름 강화 | **A** | `TEST`<br>`RECOVERY`<br>`OPERATIONS` | Made scenario cleanup failures affect verification results. |
| 8 | `2b35aa3d2217` | test(cleanup): 테스트 프로젝트 소유 자원만 정리 | **A** | `OPERATIONS`<br>`RECOVERY`<br>`RISK` | Tracked exact project ownership and added scoped leak recovery. |
| 9 | `43ccded05e4f` | test(verify): 전체 스택 검증을 직렬 실행 | **A** | `TEST`<br>`OPERATIONS`<br>`RECOVERY` | Serialized the complete local verification lifecycle. |
| 10 | `18508c25eef0` | ci(stack): 정적·런타임·복구 검증 자동화 | **A** | `TEST`<br>`OPERATIONS`<br>`SUPPLY_CHAIN` | Automated all scenarios under least-privilege, pinned CI actions. |
| 11 | `8a6c07988160` | test(ci): workflow 검증 계약 추가 | **A** | `TEST`<br>`OPERATIONS`<br>`RISK` | Validated the workflow, tool timeouts, secret boundaries, cleanup, and artifact allowlist. |

> Commit 순서는 source의 Development Thread 정의를 그대로 따릅니다. 같은 SHA가 다른 Thread에도 있으면 이 문서의 관점으로 다시 확인합니다.

## Commit별 학습 기록

### 1. `27a3dca01d3b` — feat(network): DB 트래픽을 내부 backend로 격리

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `STACK`, `RISK`, `ARCH` |
| Source-defined role | Separated public request traffic from the internal database network. |
| 이전 Thread commit | 없음 |
| 다음 Thread commit | `911544133fb4` |

#### 원문이 확정한 범위

- **Summary:** Splits frontend and backend networks, attaching MariaDB only to an internal backend.
- **Classification reason:** This materially narrows the database communication boundary and makes WordPress the sole bridge between request-serving and persistence networks.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `27a3dca01d3b`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- Compose network declarations에서 frontend와 internal backend를 식별하고 backend `internal` flag를 확인합니다.
- Nginx는 frontend만, MariaDB는 backend만, WordPress는 둘 다 join하는 exact service blocks를 표로 옮깁니다.
- FastCGI와 DB connection path가 network split 뒤에도 유지되는 service-name routing을 확인합니다.
- Nginx에서 MariaDB addressability가 사라진다는 evidence를 network membership 수준에서 기록합니다.

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

### 2. `911544133fb4` — feat(runtime): 서비스 자원과 종료 한계 적용

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **B** |
| Tags | `OPERATIONS`, `RISK`, `STACK` |
| Source-defined role | Applied resource, stop, privilege, and log-rotation policy. |
| 이전 Thread commit | `27a3dca01d3b` |
| 다음 Thread commit | `74c285925325` |

#### 원문이 확정한 범위

- **Summary:** Applies CPU, memory, PID, file-descriptor, stop-signal, privilege, and log-rotation limits to all services.
- **Classification reason:** The policy is broad and useful, but it applies standard operational hardening to the already-defined runtime rather than changing core state or data flow.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `911544133fb4`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- 각 service의 CPU, memory, PIDs, file-descriptor limits와 default variables를 Compose에서 확인합니다.
- `no-new-privileges`와 `json-file` rotation options를 찾습니다.
- Nginx/PHP-FPM의 `SIGQUIT`, MariaDB의 `SIGTERM`, service-specific grace periods를 비교합니다.
- resource/stop/log policy가 image config가 아니라 runtime orchestration contract로 적용되는 위치를 기록합니다.

#### 비교 기준

- exact commit diff: `git diff 911544133fb4^ 911544133fb4 -- <path>`
- 이전 Thread 상태와 비교: `git diff 27a3dca01d3b 911544133fb4 -- <path>`
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

### 3. `74c285925325` — fix(make): 볼륨 삭제 전에 확인을 요구

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `OPERATIONS`, `RISK`, `EDGE` |
| Source-defined role | Guarded destructive volume deletion with exact project confirmation. |
| 이전 Thread commit | `911544133fb4` |
| 다음 Thread commit | `ef74ad47ea81` |

#### 원문이 확정한 범위

- **Summary:** Requires an exact project-name confirmation before `fclean` deletes volumes and local images.
- **Classification reason:** A very small diff protects the project's most destructive operator action and restores an important ownership and data-loss boundary.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `74c285925325`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- Makefile의 destructive `fclean` target에서 `DESTROY_CONFIRM`와 selected `PROJECT_NAME` exact equality check를 찾습니다.
- guard failure가 `down -v`, local image removal, orphan cleanup 전에 종료하는지 command order를 확인합니다.
- normal `down`/`clean` target에는 동일 guard가 적용되지 않는 경계를 비교합니다.
- generic boolean confirmation보다 project identity 확인이 막는 wrong-target scenario를 작성합니다.

#### 비교 기준

- exact commit diff: `git diff 74c285925325^ 74c285925325 -- <path>`
- 이전 Thread 상태와 비교: `git diff 911544133fb4 74c285925325 -- <path>`
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

### 4. `ef74ad47ea81` — feat(diagnostics): Compose 비밀값과 민감 항목 마스킹

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `OPERATIONS`, `SECRETS`, `RISK` |
| Source-defined role | Established fail-closed diagnostic redaction. |
| 이전 Thread commit | `74c285925325` |
| 다음 Thread commit | `27a083d91c87` |

#### 원문이 확정한 범위

- **Summary:** Derives secret paths and values from rendered Compose configuration and defines fail-closed redaction of credentials and sensitive assignments.
- **Classification reason:** Diagnostics can themselves become a leakage channel; this commit establishes the critical rule that collection stops when required secrets cannot be read and redacted.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `ef74ad47ea81`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- diagnostics tool이 selected Compose project를 render하고 shared secret path logic을 호출하는 flow를 확인합니다.
- masking set에 raw configured path, resolved host path, current secret value가 모두 포함되는지 추적합니다.
- known values를 length-descending으로 replace하는 code와 shorter value partial exposure를 막는 이유를 확인합니다.
- `password`/`secret`/`token` field-name assignment를 구조적으로 mask하는 rule을 찾습니다.
- secret values를 안전하게 읽지 못하면 collection을 시작/계속하지 않는 fail-closed branch를 기록합니다.

#### 비교 기준

- exact commit diff: `git diff ef74ad47ea81^ ef74ad47ea81 -- <path>`
- 이전 Thread 상태와 비교: `git diff 74c285925325 ef74ad47ea81 -- <path>`
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

### 5. `27a083d91c87` — feat(diagnostics): 비공개 진단 세트와 CLI 연결

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `OPERATIONS`, `SECRETS`, `RISK` |
| Source-defined role | Published exclusive private diagnostic sets. |
| 이전 Thread commit | `ef74ad47ea81` |
| 다음 Thread commit | `7fbd41fe5af4` |

#### 원문이 확정한 범위

- **Summary:** Publishes an exclusive private diagnostic directory with allowlisted, redacted Compose, log, version, and container-state files.
- **Classification reason:** This completes a safe observability mechanism: failure evidence becomes actionable without overwriting existing output or exposing credential material.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `27a083d91c87`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- destination을 new directory `0700`으로 exclusive create하고 existing path를 거부하는 code를 확인합니다.
- 각 output file을 `0600` exclusive로 만들고 exact collected set—versions, service states, bounded logs, non-interpolated Compose, selected runtime state—을 식별합니다.
- 각 output에 redaction을 적용한 뒤 known secret presence를 다시 검사하는 sequence를 추적합니다.
- collection/redaction/publication failure 시 incomplete directory 전체를 제거하는 branch를 확인합니다.
- Make target의 project-specific default path와 VCS ignore 경계를 기록합니다.

#### 비교 기준

- exact commit diff: `git diff 27a083d91c87^ 27a083d91c87 -- <path>`
- 이전 Thread 상태와 비교: `git diff ef74ad47ea81 27a083d91c87 -- <path>`
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

### 6. `7fbd41fe5af4` — test(operations): 자원·격리·삭제 보호·진단 검증

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `TEST`, `OPERATIONS`, `RISK` |
| Source-defined role | Verified runtime limits, network membership, deletion refusal, and diagnostic safety. |
| 이전 Thread commit | `27a083d91c87` |
| 다음 Thread commit | `98e4af62e884` |

#### 원문이 확정한 범위

- **Summary:** Verifies runtime limits, network membership, destructive-action refusal, fail-closed redaction, file permissions, overwrite refusal, and symlink-output rejection.
- **Classification reason:** The scenario materially validates several operational and security boundaries that configuration inspection alone cannot prove.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `7fbd41fe5af4`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- live container inspect에서 effective memory/CPU/PID/fd/stop/log/security settings를 expected Compose values와 비교하는 assertions를 찾습니다.
- frontend/backend exact membership과 internal flag를 검증하는 network assertions를 확인합니다.
- `fclean` without exact confirmation이 refused되고 running HTTPS stack이 healthy한지 확인하는 path를 추적합니다.
- real credential를 Nginx access log에 넣은 뒤 diagnostic output에서 redaction evidence와 absence를 검사하는 setup을 확인합니다.
- source secret unreadable일 때 no bundle, successful bundle exact files/modes, rerun existing destination, dangling symlink rejection을 구분합니다.
- 이 scenario가 declarations가 아니라 Docker-applied/runtime-output behavior를 증명하는 지점을 기록합니다.

#### 비교 기준

- exact commit diff: `git diff 7fbd41fe5af4^ 7fbd41fe5af4 -- <path>`
- 이전 Thread 상태와 비교: `git diff 27a083d91c87 7fbd41fe5af4 -- <path>`
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

### 7. `98e4af62e884` — test(runtime): 프로세스·비밀값·정리 제어 흐름 강화

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `TEST`, `RECOVERY`, `OPERATIONS` |
| Source-defined role | Made scenario cleanup failures affect verification results. |
| 이전 Thread commit | `7fbd41fe5af4` |
| 다음 Thread commit | `2b35aa3d2217` |

#### 원문이 확정한 범위

- **Summary:** Makes private fixture replacement durable, separates start command construction, improves timeout diagnostics, and treats cleanup failure as test failure.
- **Classification reason:** It strengthens the verification control plane so successful scenarios cannot hide leaked resources or incomplete teardown, a significant reliability property for the extensive runtime suite.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `98e4af62e884`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- test fixture secret replacement가 exclusive temp creation, sync, atomic replace, unconditional remnant cleanup을 사용하는지 확인합니다.
- production start command construction과 execution이 분리된 functions를 찾아 interruption scenarios가 exact command를 재사용하는지 추적합니다.
- Compose timeout error가 build/up/down/exec operation name을 포함하는 branch를 확인합니다.
- harness cleanup이 diagnostics errors와 nonzero `compose down --volumes`를 accumulate/return하는 control flow를 찾습니다.
- primary scenario pass라도 cleanup failure가 final failure로 바뀌는 result precedence를 기록합니다.

#### 비교 기준

- exact commit diff: `git diff 98e4af62e884^ 98e4af62e884 -- <path>`
- 이전 Thread 상태와 비교: `git diff 7fbd41fe5af4 98e4af62e884 -- <path>`
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

### 8. `2b35aa3d2217` — test(cleanup): 테스트 프로젝트 소유 자원만 정리

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `OPERATIONS`, `RECOVERY`, `RISK` |
| Source-defined role | Tracked exact project ownership and added scoped leak recovery. |
| 이전 Thread commit | `98e4af62e884` |
| 다음 Thread commit | `43ccded05e4f` |

#### 원문이 확정한 범위

- **Summary:** Records exact test project ownership, removes only owned Compose resources and image tags, and adds a scoped crash-recovery cleanup tool with private reports.
- **Classification reason:** This solves a high-risk verification-lifecycle problem without broad Docker pruning, ensuring failed tests cannot damage unrelated developer or CI resources.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `2b35aa3d2217`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- scenario가 environment preparation 전에 random Compose project record를 private non-symlink directory에 exact-name file로 쓰는 code를 확인합니다.
- directory/file permissions와 strict project-name format을 기록합니다.
- image-prefix ownership을 project resource ownership과 별도로 추적하는 data structure를 찾습니다.
- normal cleanup이 selected project Compose resources, owned image tags, private temp directory만 제거하고 `--keep`이 이를 skip하는 branch를 확인합니다.
- crash recovery utility가 labels와 exact service tags로 resources를 찾고 Docker prune을 호출하지 않는지 확인합니다.
- private report와 no leak / recovered leak / incomplete recovery distinct exit status를 추적합니다.

#### 비교 기준

- exact commit diff: `git diff 2b35aa3d2217^ 2b35aa3d2217 -- <path>`
- 이전 Thread 상태와 비교: `git diff 98e4af62e884 2b35aa3d2217 -- <path>`
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

### 9. `43ccded05e4f` — test(verify): 전체 스택 검증을 직렬 실행

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `TEST`, `OPERATIONS`, `RECOVERY` |
| Source-defined role | Serialized the complete local verification lifecycle. |
| 이전 Thread commit | `2b35aa3d2217` |
| 다음 Thread commit | `18508c25eef0` |

#### 원문이 확정한 범위

- **Summary:** Runs static checks and all runtime scenarios serially with per-scenario timeouts, shared project records, and mandatory final leak recovery.
- **Classification reason:** It defines the complete local verification transaction and makes resource cleanliness part of success, significantly improving confidence and failure attribution.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `43ccded05e4f`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- `verify` entry point의 static → strict Compose → six runtime scenarios fixed sequence와 per-scenario timeout을 기록합니다.
- 모든 runtime invocation이 shared private project-record directory에 identity를 쓰는 argument flow를 확인합니다.
- `finally` cleanup이 primary result와 무관하게 실행되는지 추적합니다.
- incomplete cleanup, detected-and-recovered leak, primary scenario failure, success 사이 outcome precedence를 확인합니다.
- residual resources가 없을 때만 control directory를 제거하고 otherwise evidence를 보존하는 branch를 기록합니다.

#### 비교 기준

- exact commit diff: `git diff 43ccded05e4f^ 43ccded05e4f -- <path>`
- 이전 Thread 상태와 비교: `git diff 2b35aa3d2217 43ccded05e4f -- <path>`
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

### 10. `18508c25eef0` — ci(stack): 정적·런타임·복구 검증 자동화

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `TEST`, `OPERATIONS`, `SUPPLY_CHAIN` |
| Source-defined role | Automated all scenarios under least-privilege, pinned CI actions. |
| 이전 Thread commit | `43ccded05e4f` |
| 다음 Thread commit | `8a6c07988160` |

#### 원문이 확정한 범위

- **Summary:** Adds a least-privilege, pinned-action GitHub Actions workflow running all static and runtime scenarios, scoped cleanup, and allowlisted failure diagnostics.
- **Classification reason:** This is significant integration of the project's verification, supply-chain, and resource-ownership policies into automation, though it does not alter product runtime behavior.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `18508c25eef0`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- workflow triggers, Ubuntu runner version, top-level read-only permissions, checkout credential persistence, full-history fetch를 확인합니다.
- third-party actions가 reviewed commit SHA로 pin되고 concurrency가 superseded same-ref run을 cancel하는 설정을 찾습니다.
- static/config 뒤 six runtime stages의 order, dedicated timeout/diagnostic path, shared project-record directory를 표로 옮깁니다.
- always-run scoped cleanup과 failure-only diagnostic upload의 exact allowlist, hidden-file exclusion, retention을 확인합니다.
- workflow가 source secrets context, broad prune, shell trace 같은 unsafe behavior를 사용하지 않는지 기록합니다.

#### 비교 기준

- exact commit diff: `git diff 18508c25eef0^ 18508c25eef0 -- <path>`
- 이전 Thread 상태와 비교: `git diff 43ccded05e4f 18508c25eef0 -- <path>`
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

### 11. `8a6c07988160` — test(ci): workflow 검증 계약 추가

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `TEST`, `OPERATIONS`, `RISK` |
| Source-defined role | Validated the workflow, tool timeouts, secret boundaries, cleanup, and artifact allowlist. |
| 이전 Thread commit | `18508c25eef0` |
| 다음 Thread commit | 없음 |

#### 원문이 확정한 범위

- **Summary:** Expands static and AST-based checks to enforce workflow permissions, action pins, scenario ordering, timeouts, secret boundaries, cleanup semantics, and safe subprocess use.
- **Classification reason:** The commit protects the verification system itself from subtle weakening and provides layered evidence for security and lifecycle properties across many tools.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `8a6c07988160`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- static validator가 runner, permissions, action pins, full checkout, serial commands, diagnostic paths, cleanup, artifact allowlist를 어떤 checks로 고정하는지 확인합니다.
- `pull_request_target`, secret contexts, shell tracing, environment dumping, broad Docker pruning 금지 assertions를 찾습니다.
- Compose exact service block parsing으로 runtime secret mounts/password env/Nginx private config mount를 거부하는 code를 추적합니다.
- Python AST inspection이 explicit subprocess wait timeout과 startup secret read가 project lock 안에 있는지 검증하는 visitor logic을 확인합니다.
- mocked main-path probes가 preparation timeout, scenario failure, cleanup failure, unexpected exception의 exit/cleanup semantics를 어떻게 검사하는지 기록합니다.
- text, AST, imported unit-style probes, workflow-specific checks가 각각 증명하지 못하는 범위를 구분합니다.

#### 비교 기준

- exact commit diff: `git diff 8a6c07988160^ 8a6c07988160 -- <path>`
- 이전 Thread 상태와 비교: `git diff 18508c25eef0 8a6c07988160 -- <path>`
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
| MariaDB는 internal backend에만 있고 Nginx는 DB network에 접근하지 않습니다. | `27a3dca01d3b` | `27a3dca01d3b` | `7fbd41fe5af4` | `[학습자: 실제 code/test evidence]` |
| destructive cleanup은 exact selected project confirmation과 owned-resource scope를 요구합니다. | `74c285925325` | `2b35aa3d2217` | `7fbd41fe5af4, 43ccded05e4f, 18508c25eef0` | `[학습자: 실제 code/test evidence]` |
| diagnostics는 private, redacted, non-overwriting이며 sanitization 불가 시 아무것도 게시하지 않습니다. | `ef74ad47ea81` | `27a083d91c87` | `7fbd41fe5af4` | `[학습자: 실제 code/test evidence]` |
| runtime test cleanup 실패와 residual leak는 verification failure입니다. | `98e4af62e884` | `2b35aa3d2217, 43ccded05e4f` | `18508c25eef0, 8a6c07988160` | `[학습자: 실제 code/test evidence]` |
| cleanup과 recovery는 global Docker prune 없이 exact project labels/names/image tags만 제거합니다. | `2b35aa3d2217` | `43ccded05e4f` | `18508c25eef0, 8a6c07988160` | `[학습자: 실제 code/test evidence]` |
| automation command는 bounded timeout, least privilege, pinned dependencies, allowlisted evidence를 유지합니다. | `43ccded05e4f` | `18508c25eef0` | `8a6c07988160` | `[학습자: 실제 code/test evidence]` |

### Ledger 보완 기록

- source에 명시되지 않은 새 invariant를 확정 사실로 추가하지 않습니다.
- invariant가 실제로 부족했음을 드러낸 commit 또는 failure stage: `[학습자 작성]`
- marker, rename, lock, health, authentication, cleanup 등 invariant를 고정하는 concrete mechanism: `[학습자 작성]`
- 후속 commit이 invariant를 약화하지 못하게 하는 regression evidence: `[학습자 작성]`

## Failure → Fix → Test 연결

| failure / 위험 | fix 또는 mechanism | test / evidence | 학습자 연결 기록 |
| --- | --- | --- | --- |
| single shared network가 frontend compromise/error에 DB reachability를 부여 | 27a3dca01d3b가 internal backend와 exact memberships로 분리 | 7fbd41fe5af4 live network inspection | `[학습자: root cause와 code/test 연결]` |
| operator가 generic confirmation으로 wrong project volume을 삭제 | 74c285925325 exact `DESTROY_CONFIRM == PROJECT_NAME` guard | 7fbd41fe5af4가 refusal과 running stack health 검증 | `[학습자: root cause와 code/test 연결]` |
| diagnostic bundle이 logs/config의 실제 credential/path를 누출하거나 partial output을 남김 | ef74ad47ea81 redaction + 27a083d91c87 private fail-closed publication | 7fbd41fe5af4 real log secret, unreadable secret, overwrite/symlink tests | `[학습자: root cause와 code/test 연결]` |
| scenario는 pass했지만 teardown failure로 resources가 누수 | 98e4af62e884가 cleanup error를 result에 전파 | 2b35aa3d2217 exact ownership records와 43ccded05e4f final leak recovery | `[학습자: root cause와 code/test 연결]` |
| crashed test cleanup이 broad prune로 unrelated Docker resources를 삭제 | 2b35aa3d2217 label/tag-scoped recovery utility | 43ccded05e4f와 CI final cleanup에서 complete records 사용 | `[학습자: root cause와 code/test 연결]` |
| CI file가 green이지만 permissions, action pins, timeout, secret/cleanup contract가 약화 | 18508c25eef0 policy-rich workflow | 8a6c07988160 text/AST/mock verification of verification | `[학습자: root cause와 code/test 연결]` |

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
| Networks | single shared bridge | frontend/backend 분리; WordPress만 dual-homed | Compose and live inspect evidence | `[학습자 작성]` |
| Service resource lifecycle | Docker defaults | service-specific limits, stop signal/timeout, log rotation | Compose fields and effective Docker state evidence | `[학습자 작성]` |
| Diagnostics output | arbitrary existing path/possibly broad inspect | new private directory와 allowlisted redacted files | open modes, output list, rescan, cleanup evidence | `[학습자 작성]` |
| Scenario cleanup | best-effort teardown | test result의 일부이며 exact project/image ownership만 제거 | error accumulation and records evidence | `[학습자 작성]` |
| Leak recovery utility | broad manual cleanup 위험 | strict private records와 exact labels/tags 기반 recovery | record validation, discovery, no-prune evidence | `[학습자 작성]` |
| Local/CI orchestrator | 개별 test commands | serial bounded lifecycle, diagnostics, final cleanup, outcome precedence 소유 | verify script and workflow control flow evidence | `[학습자 작성]` |

## Thread 최종 상태

- **Source-confirmed endpoint:** This progression turns operational policy into executable evidence. Runtime limits and network boundaries are inspected on live containers; destructive commands and diagnostics fail safely; and both local and CI runners account for every project resource they create. The cleanup tooling deliberately avoids global Docker pruning, preserving the same ownership discipline used by the product management paths.
- 최종 authoritative state와 owner: `[학습자 작성]`
- 정상 실행의 entry point와 완료 조건: `[학습자 작성]`
- failure 또는 interruption 뒤 retry/rollback/compensation 조건: `[학습자 작성]`
- 이 Thread가 다른 Thread에 제공하는 전제: `[학습자 작성]`
- 이 Thread 단독으로는 증명하지 않는 것: `[학습자 작성]`

## 최종 architecture 또는 execution flow 정리

| 단계 | 확인할 흐름 | 실제 코드 근거 | 정상 전이 | 실패·정리·재시도 |
| --- | --- | --- | --- | --- |
| 1 | Compose가 network membership과 runtime limits를 선언하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 2 | operations scenario가 live Docker state와 destructive guard를 검사하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 3 | diagnostics가 rendered configuration에서 masking set을 만드는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 4 | private diagnostic directory와 allowlisted files를 exclusive/private/fail-closed 방식으로 게시하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 5 | scenario cleanup error가 primary result에 합쳐지는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 6 | project/image ownership records를 쓰고 crash recovery utility가 읽는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 7 | local verify가 static/config/runtime scenarios를 serial timeout으로 실행하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 8 | CI가 permissions/action pins/diagnostics/final cleanup을 적용하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 9 | static/AST/mock tests가 workflow와 management tools 자체를 검증하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |

### 학습자의 최종 설명

> `[학습자 작성: 위 표와 commit evidence만 사용해 이 Thread의 설계 → 구현 → 실패 → 수정 → 검증 발전을 설명합니다.]`

## 학습 완료 자가 점검

- [ ] Nginx와 MariaDB가 같은 network에 남아 있다고 설명하지 않았습니까?
- [ ] Compose declaration만 보고 effective runtime limits를 확인했다고 간주하지 않았습니까?
- [ ] diagnostic redaction 실패 시 partial bundle을 남긴다고 잘못 기록하지 않았습니까?
- [ ] cleanup을 product 외 부수 작업으로 취급해 scenario success와 분리하지 않았습니까?
- [ ] recovery utility가 Docker prune을 사용한다고 쓰지 않았습니까?
- [ ] CI workflow만 보고 verification tools의 control flow 계약을 생략하지 않았습니까?
- [ ] 모든 code snippet에 SHA와 path/symbol을 기록했습니다.
- [ ] final HEAD의 field/helper/test를 이전 SHA에 소급하지 않았습니다.
- [ ] source가 확정하지 않은 사실을 추정으로 채우지 않았습니다.
- [ ] test가 증명하는 것과 증명하지 않는 것을 구분했습니다.
- [ ] 이 Thread를 commit 순서대로 구두 설명할 수 있습니다.
