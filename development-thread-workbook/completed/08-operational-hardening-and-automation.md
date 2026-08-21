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
- workflow 자체를 검증하는 text/AST/mock layers와 금지 pattern을 구분했습니다.

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

- `srcs/docker-compose.yml`의 `networks: frontend / backend`에서 backend는 Docker 외부 route를 갖지 않는 database-only communication domain이 됩니다.
- `srcs/docker-compose.yml`의 `service memberships`에서 WordPress만 request-serving과 persistence networks를 연결하는 application bridge입니다.
- `srcs/docker-compose.yml`의 `service-name routing`에서 필요한 통신만 유지하면서 Nginx→MariaDB 직접 addressability를 제거합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 27a3dca01d3b | srcs/docker-compose.yml | networks: frontend / backend | frontend bridge와 `internal: true` backend를 분리합니다. | backend는 Docker 외부 route를 갖지 않는 database-only communication domain이 됩니다. |
| 27a3dca01d3b | srcs/docker-compose.yml | service memberships | Nginx는 frontend만, MariaDB는 backend만, WordPress는 frontend와 backend 모두 join합니다. | WordPress만 request-serving과 persistence networks를 연결하는 application bridge입니다. |
| 27a3dca01d3b | srcs/docker-compose.yml | service-name routing | `fastcgi_pass wordpress:9000`과 WordPress의 MariaDB service name은 network split 뒤에도 각 shared network에서 resolve됩니다. | 필요한 통신만 유지하면서 Nginx→MariaDB 직접 addressability를 제거합니다. |

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | 세 services가 하나의 shared network에 있으면 Nginx compromise/error가 MariaDB addressability까지 얻습니다. |
| 선택한 boundary / decision | public request path와 internal DB path를 frontend/backend로 분리하고 exact service membership을 최소화했습니다. |
| 핵심 caller/callee 또는 configuration consumer | `srcs/docker-compose.yml`의 `networks: frontend / backend`; `srcs/docker-compose.yml`의 `service memberships`; `srcs/docker-compose.yml`의 `service-name routing` |
| state / ownership / lifecycle 변화 | Nginx는 frontend, MariaDB는 backend, WordPress는 두 network의 application endpoint를 소유합니다. |
| 주요 failure branch | network membership을 잘못 바꾸면 FastCGI 또는 DB DNS가 끊깁니다. source declaration만으로 effective runtime membership을 증명하지 않습니다. |
| 이 commit의 보장 | Nginx와 MariaDB가 network를 공유하지 않고 WordPress만 양쪽과 통신하도록 reachability를 좁힙니다. |
| 한계와 다음 관련 commit | container 내부 application exploit이 WordPress를 통해 DB에 접근하는 것을 제거하지는 않습니다. `7fbd41fe5af4`이 live Docker inspect로 exact membership과 Nginx→DB isolation을 검증합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: container 내부 application exploit이 WordPress를 통해 DB에 접근하는 것을 제거하지는 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `7fbd41fe5af4`이 live Docker inspect로 exact membership과 Nginx→DB isolation을 검증합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: Nginx와 MariaDB가 network를 공유하지 않고 WordPress만 양쪽과 통신하도록 reachability를 좁힙니다.

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

- `srcs/docker-compose.yml`의 `cpus / mem_limit / pids_limit / ulimits`에서 한 service의 runaway resource use가 host 전체를 무제한 점유하지 못하게 합니다.
- `srcs/docker-compose.yml`의 `stop_signal / stop_grace_period`에서 service-specific graceful shutdown 시간을 Compose lifecycle에 반영합니다.
- `srcs/docker-compose.yml`의 `security_opt / logging`에서 privilege escalation과 unbounded local log growth를 줄입니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 911544133fb4 | srcs/docker-compose.yml | cpus / mem_limit / pids_limit / ulimits | Nginx, WordPress, MariaDB에 service별 CPU, memory, PID, nofile limits를 선언합니다. | 한 service의 runaway resource use가 host 전체를 무제한 점유하지 못하게 합니다. |
| 911544133fb4 | srcs/docker-compose.yml | stop_signal / stop_grace_period | Nginx/WordPress는 SIGQUIT와 짧은 grace, MariaDB는 SIGTERM과 더 긴 grace를 사용합니다. | service-specific graceful shutdown 시간을 Compose lifecycle에 반영합니다. |
| 911544133fb4 | srcs/docker-compose.yml | security_opt / logging | `no-new-privileges:true`와 json-file `max-size`/`max-file` rotation을 적용합니다. | privilege escalation과 unbounded local log growth를 줄입니다. |

#### 비교 기준

- exact commit diff: `git diff 911544133fb4^ 911544133fb4 -- <path>`
- 이전 Thread 상태와 비교: `git diff 27a3dca01d3b 911544133fb4 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### B-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| Thread에서 맡은 구현 역할 | Applied resource, stop, privilege, and log-rotation policy. |
| 핵심 input / output / state | Compose/Docker가 cgroup/rlimit/logging/shutdown policy를 소유하고 container process는 그 한계 안에서 실행됩니다. |
| 변경된 directive / helper / command | `srcs/docker-compose.yml`의 `cpus / mem_limit / pids_limit / ulimits`; `srcs/docker-compose.yml`의 `stop_signal / stop_grace_period`; `srcs/docker-compose.yml`의 `security_opt / logging` |
| immediate failure 또는 boundary | host 또는 Docker가 unsupported field를 무시하거나 다르게 적용할 수 있어 source declaration만으로 effective state를 확정할 수 없습니다. |
| 다음 commit에 넘긴 한계 | 실제 runtime 적용 여부와 workload 적정성은 보장하지 않습니다. `7fbd41fe5af4`이 live inspect와 container commands로 effective limits를 검증합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: 실제 runtime 적용 여부와 workload 적정성은 보장하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `7fbd41fe5af4`이 live inspect와 container commands로 effective limits를 검증합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: 운영 resource/shutdown/log/security policy를 version-controlled Compose contract로 만듭니다.

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

- `Makefile`의 `fclean guard`에서 generic yes/force가 아니라 삭제 대상 namespace를 operator가 다시 입력해야 합니다.
- `Makefile`의 `refusal branch`에서 wrong-project 변수나 copy/paste에서 fail closed합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 74c285925325 | Makefile | fclean guard | `DESTROY_CONFIRM`가 selected `PROJECT_NAME`과 exact string equality일 때만 `down --volumes`를 실행합니다. | generic yes/force가 아니라 삭제 대상 namespace를 operator가 다시 입력해야 합니다. |
| 74c285925325 | Makefile | refusal branch | 누락 또는 mismatch면 설명을 출력하고 nonzero로 종료하며 destructive Docker command를 호출하지 않습니다. | wrong-project 변수나 copy/paste에서 fail closed합니다. |

#### 비교 기준

- exact commit diff: `git diff 74c285925325^ 74c285925325 -- <path>`
- 이전 Thread 상태와 비교: `git diff 911544133fb4 74c285925325 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### Fix chain 기록

| 단계 | 학습자 기록 |
| --- | --- |
| 기존 가정 | fclean을 일반 cleanup과 비슷한 low-risk operation으로 취급했습니다. |
| 실제 failure 또는 위험 | project variable이 잘못되면 unrelated persistent volumes까지 즉시 삭제됩니다. |
| root cause | destructive scope를 operator가 command 실행 시 다시 확인하는 guard가 없었습니다. |
| 수정된 invariant / decision | selected project name과 exact equality인 confirmation만 volume deletion을 허용합니다. |
| 실제 수정 코드 | `Makefile`의 `fclean guard`; `Makefile`의 `refusal branch` |
| 변경된 ordering / ownership / lifecycle | operator/Make variables가 target project identity를 소유하고 destructive command는 exact confirmation 뒤에만 resource lifecycle을 종료합니다. |
| 이 fix가 보장하는 것 | generic 확인보다 project identity를 재확인하는 bounded destructive operation을 제공합니다. |
| 아직 보장하지 않는 것 | 악의적/부주의한 operator가 exact name을 입력한 뒤 잘못 삭제하는 것까지 막지 못합니다. |
| 연결되는 regression test | operations runtime test가 mismatch refusal과 running stack health/state 보존을 확인합니다. `7fbd41fe5af4`이 refusal 뒤 stack/volumes/health가 유지되는지 runtime에서 확인합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: 악의적/부주의한 operator가 exact name을 입력한 뒤 잘못 삭제하는 것까지 막지 못합니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `7fbd41fe5af4`이 refusal 뒤 stack/volumes/health가 유지되는지 runtime에서 확인합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: generic 확인보다 project identity를 재확인하는 bounded destructive operation을 제공합니다.

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

- `tools/diagnose_stack.py`의 `build_redaction_values`에서 path와 value가 logs/config에 나타나는 여러 representation을 masking set에 넣습니다.
- `tools/diagnose_stack.py`의 `longer-first literal redaction`에서 literal secret/path leakage를 deterministic하게 제거합니다.
- `tools/diagnose_stack.py`의 `structural sensitive-field masking`에서 알려진 exact value 외의 민감 출력도 줄입니다.
- `tools/diagnose_stack.py`의 `fail-closed input boundary`에서 부분 sanitize된 bundle을 신뢰 가능한 것으로 게시하지 않습니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| ef74ad47ea81 | tools/diagnose_stack.py | build_redaction_values | rendered Compose에서 secret source paths를 해석하고 raw path, resolved path, secret contents를 hardened reader로 모두 수집합니다. | path와 value가 logs/config에 나타나는 여러 representation을 masking set에 넣습니다. |
| ef74ad47ea81 | tools/diagnose_stack.py | longer-first literal redaction | masking values를 길이 내림차순으로 치환해 긴 credential 안의 짧은 substring이 먼저 바뀌어 원문 일부가 남는 문제를 피합니다. | literal secret/path leakage를 deterministic하게 제거합니다. |
| ef74ad47ea81 | tools/diagnose_stack.py | structural sensitive-field masking | password/token/secret/key 계열 assignment와 JSON/YAML-like sensitive fields를 pattern으로 추가 마스킹합니다. | 알려진 exact value 외의 민감 출력도 줄입니다. |
| ef74ad47ea81 | tools/diagnose_stack.py | fail-closed input boundary | secret file 하나라도 안전하게 읽지 못하면 masking set을 불완전하게 만든 채 진행하지 않고 diagnostics 전체를 실패시킵니다. | 부분 sanitize된 bundle을 신뢰 가능한 것으로 게시하지 않습니다. |

#### 비교 기준

- exact commit diff: `git diff ef74ad47ea81^ ef74ad47ea81 -- <path>`
- 이전 Thread 상태와 비교: `git diff 74c285925325 ef74ad47ea81 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | Compose config, inspect, logs에는 credential value뿐 아니라 host secret path나 sensitive assignment가 포함될 수 있어 원문 수집이 정보 유출을 만들었습니다. |
| 선택한 boundary / decision | hardened secret reader로 complete masking set을 만들고 literal longer-first와 structural masking을 결합했습니다. |
| 핵심 caller/callee 또는 configuration consumer | `tools/diagnose_stack.py`의 `build_redaction_values`; `tools/diagnose_stack.py`의 `longer-first literal redaction`; `tools/diagnose_stack.py`의 `structural sensitive-field masking`; `tools/diagnose_stack.py`의 `fail-closed input boundary` |
| state / ownership / lifecycle 변화 | diagnostics process가 raw capture와 masking values를 memory에서 일시 소유하며 sanitized text만 publication layer로 넘깁니다. |
| 주요 failure branch | secret source를 안전하게 읽지 못하거나 sanitize가 실패하면 아무 diagnostic output도 신뢰하지 않고 failure로 처리합니다. |
| 이 commit의 보장 | complete known secret/path set과 sensitive field patterns을 모두 마스킹한 text만 다음 단계로 보낼 수 있습니다. |
| 한계와 다음 관련 commit | unknown semantic secret, encoded/encrypted/compressed representation, side channel까지 모두 탐지하지는 않습니다. `27a083d91c87`이 private exclusive output set과 final rescan/cleanup을 연결하고 `7fbd41fe5af4`이 실제 secret log를 검증합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: unknown semantic secret, encoded/encrypted/compressed representation, side channel까지 모두 탐지하지는 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `27a083d91c87`이 private exclusive output set과 final rescan/cleanup을 연결하고 `7fbd41fe5af4`이 실제 secret log를 검증합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: complete known secret/path set과 sensitive field patterns을 모두 마스킹한 text만 다음 단계로 보낼 수 있습니다.

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

- `tools/diagnose_stack.py`의 `create_output_directory`에서 diagnostic set이 기존 directory를 덮어쓰거나 공격자 path를 따라가지 않습니다.
- `tools/diagnose_stack.py`의 `allowlisted private files`에서 bundle contents와 confidentiality가 좁은 allowlist로 고정됩니다.
- `tools/diagnose_stack.py`의 `post-write rescan / cleanup on error`에서 partial 또는 unsanitized bundle을 남기지 않는 publication endpoint입니다.
- `Makefile / CLI`의 `diagnostics command`에서 operator path와 test path가 같은 safety logic을 사용합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 27a083d91c87 | tools/diagnose_stack.py | create_output_directory | output parent를 검증하고 target directory를 `0700`으로 exclusive create하며 existing path나 symlink를 거부합니다. | diagnostic set이 기존 directory를 덮어쓰거나 공격자 path를 따라가지 않습니다. |
| 27a083d91c87 | tools/diagnose_stack.py | allowlisted private files | 정해진 compose config/ps/inspect/log/metadata files만 `0600` O_EXCL로 작성합니다. | bundle contents와 confidentiality가 좁은 allowlist로 고정됩니다. |
| 27a083d91c87 | tools/diagnose_stack.py | post-write rescan / cleanup on error | 모든 output을 다시 secret/path/pattern으로 scan하고 하나라도 발견되거나 command/write가 실패하면 output directory 전체를 제거합니다. | partial 또는 unsanitized bundle을 남기지 않는 publication endpoint입니다. |
| 27a083d91c87 | Makefile / CLI | diagnostics command | project/env/output을 명시해 같은 production collector를 호출하는 documented entry point를 제공합니다. | operator path와 test path가 같은 safety logic을 사용합니다. |

#### 비교 기준

- exact commit diff: `git diff 27a083d91c87^ 27a083d91c87 -- <path>`
- 이전 Thread 상태와 비교: `git diff ef74ad47ea81 27a083d91c87 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | redaction function만 있어도 output path overwrite, broad permissions, partial file set, sanitize 후 leakage를 막지 못했습니다. |
| 선택한 boundary / decision | 새 private directory와 allowlisted exclusive files에만 sanitized data를 쓰고 전체 rescan 후 성공으로 게시하도록 했습니다. |
| 핵심 caller/callee 또는 configuration consumer | `tools/diagnose_stack.py`의 `create_output_directory`; `tools/diagnose_stack.py`의 `allowlisted private files`; `tools/diagnose_stack.py`의 `post-write rescan / cleanup on error`; `Makefile / CLI`의 `diagnostics command` |
| state / ownership / lifecycle 변화 | diagnostics command가 output directory lifecycle 전체를 소유하며 성공한 complete private set만 caller에게 넘깁니다. |
| 주요 failure branch | existing/symlink target, any capture/redaction/write/rescan failure는 directory를 삭제하고 nonzero로 종료합니다. |
| 이 commit의 보장 | diagnostic set은 private, non-overwriting, allowlisted, fully redacted이며 sanitize 불가 시 아무것도 게시하지 않습니다. |
| 한계와 다음 관련 commit | masking model이 모르는 새로운 encoding의 secret은 자동 보장하지 않습니다. `7fbd41fe5af4`이 unreadable secret, overwrite/symlink, real log secret, permissions/file set을 runtime 검증합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: masking model이 모르는 새로운 encoding의 secret은 자동 보장하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `7fbd41fe5af4`이 unreadable secret, overwrite/symlink, real log secret, permissions/file set을 runtime 검증합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: diagnostic set은 private, non-overwriting, allowlisted, fully redacted이며 sanitize 불가 시 아무것도 게시하지 않습니다.

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

- `tests/runtime_stack.py`의 `operations inspect scenario`에서 Compose declaration과 effective runtime state를 대조합니다.
- `tests/runtime_stack.py`의 `fclean refusal`에서 guard refusal이 실제 mutation 0임을 증명합니다.
- `tests/runtime_stack.py`의 `diagnostic redaction fixtures`에서 literal/structural masking과 fail-closed publication을 live data로 통과합니다.
- `tests/runtime_stack.py`의 `diagnostic file/perms/rescan assertions`에서 private publication endpoint를 검증합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 7fbd41fe5af4 | tests/runtime_stack.py | operations inspect scenario | live containers의 networks, memory/CPU/PID/nofile, stop signal/grace, no-new-privileges, log driver/options를 Docker inspect와 in-container probes로 확인합니다. | Compose declaration과 effective runtime state를 대조합니다. |
| 7fbd41fe5af4 | tests/runtime_stack.py | fclean refusal | 잘못된/누락 confirmation으로 destructive target을 실행하고 volumes와 application health/state가 그대로인지 확인합니다. | guard refusal이 실제 mutation 0임을 증명합니다. |
| 7fbd41fe5af4 | tests/runtime_stack.py | diagnostic redaction fixtures | 실제 secret을 request/log에 넣고 unreadable secret, existing directory, dangling symlink cases를 만든 뒤 success/failure output을 검사합니다. | literal/structural masking과 fail-closed publication을 live data로 통과합니다. |
| 7fbd41fe5af4 | tests/runtime_stack.py | diagnostic file/perms/rescan assertions | 성공 set의 exact allowlist, 0700/0600 mode, raw/resolved secret path와 content 부재를 확인합니다. | private publication endpoint를 검증합니다. |

#### 비교 기준

- exact commit diff: `git diff 7fbd41fe5af4^ 7fbd41fe5af4 -- <path>`
- 이전 Thread 상태와 비교: `git diff 27a083d91c87 7fbd41fe5af4 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### 테스트 학습 기록

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariant | declared operational policy가 effective containers에 적용되고 destructive/diagnostic commands는 unsafe case에서 mutation/output 없이 실패합니다. |
| 재현하는 failure / boundary | network/limit mismatch, wrong fclean confirmation, real secret log, unreadable secret, existing/symlink output입니다. |
| test technique | live Docker inspection + negative filesystem/command integration |
| fixture와 failure injection | healthy isolated stack, secret-bearing request/log, permission/collision output fixtures를 만듭니다. |
| 실제 통과하는 production path | Compose containers→Docker inspect/in-container probes→Make fclean→diagnose_stack capture/redact/publish를 통과합니다. |
| 핵심 assertion | exact networks/limits/stop/log/security, unchanged health/volumes, exact private redacted bundle 또는 output 부재를 확인합니다. |
| 이 테스트가 증명하는 것 | 운영 policy의 source-to-effective-state 연결과 fail-closed destructive/diagnostic behavior를 증명합니다. |
| 이 테스트가 증명하지 않는 것 | 모든 platform과 unknown leakage channel을 증명하지 않습니다. |
| 성격 | broad operational integration + negative regression |
| 막는 후속 regression | network widening, ignored limits, generic destructive confirmation, partial/unsanitized diagnostics를 막습니다. |
| 직접 실행 command와 결과 | 실행하지 않았습니다. 현재 환경에는 Docker와 로컬 repository checkout이 없습니다. 해당 SHA의 test code와 command wiring만 검사했습니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: 모든 host kernel/Docker version, unknown secret encoding, production load 적정성은 증명하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `98e4af62e884`과 후속 commits가 scenario cleanup 자체를 verified lifecycle로 강화합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: network/limit/stop/log/security effective state, exact-project deletion guard, fail-closed private diagnostics가 실제 stack에서 동작함을 증명합니다.

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

- `tests/runtime_stack.py`의 `explicit subprocess wait timeouts`에서 hung child가 verification process를 무기한 점유하지 않습니다.
- `tests/runtime_stack.py`의 `RuntimeStack.close error accumulation`에서 scenario body success가 cleanup failure를 덮지 않습니다.
- `tests/runtime_stack.py`의 `main result precedence`에서 evidence lifecycle 전체가 성공해야 process success입니다.
- `tools/rotate_secrets.py / related private writes`의 `private temp fsync/cleanup hardening`에서 verification이 관측하는 resource state와 host file durability를 맞춥니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 98e4af62e884 | tests/runtime_stack.py | explicit subprocess wait timeouts | Popen communicate/wait/terminate/kill paths에 bounded timeout과 escalation을 추가합니다. | hung child가 verification process를 무기한 점유하지 않습니다. |
| 98e4af62e884 | tests/runtime_stack.py | RuntimeStack.close error accumulation | teardown, image removal, temp cleanup의 failure를 수집하고 primary scenario outcome과 합칩니다. | scenario body success가 cleanup failure를 덮지 않습니다. |
| 98e4af62e884 | tests/runtime_stack.py | main result precedence | scenario exception, diagnostics failure, cleanup failure, unexpected exception의 exit status와 report order를 명시합니다. | evidence lifecycle 전체가 성공해야 process success입니다. |
| 98e4af62e884 | tools/rotate_secrets.py / related private writes | private temp fsync/cleanup hardening | test가 의존하는 secret/config temporary publication의 sync/cleanup contract도 강화합니다. | verification이 관측하는 resource state와 host file durability를 맞춥니다. |

#### 비교 기준

- exact commit diff: `git diff 98e4af62e884^ 98e4af62e884 -- <path>`
- 이전 Thread 상태와 비교: `git diff 7fbd41fe5af4 98e4af62e884 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | test body가 pass해도 teardown subprocess가 hang/fail하거나 diagnostics가 실패해 Docker resources/secrets가 남으면 전체 verification은 신뢰할 수 없습니다. |
| 선택한 boundary / decision | 모든 child wait를 bounded하고 cleanup errors를 primary result에 포함하는 explicit precedence를 만들었습니다. |
| 핵심 caller/callee 또는 configuration consumer | `tests/runtime_stack.py`의 `explicit subprocess wait timeouts`; `tests/runtime_stack.py`의 `RuntimeStack.close error accumulation`; `tests/runtime_stack.py`의 `main result precedence`; `tools/rotate_secrets.py / related private writes`의 `private temp fsync/cleanup hardening` |
| state / ownership / lifecycle 변화 | RuntimeStack과 top-level main이 child processes, project resources, diagnostics, temporary files의 full lifecycle을 소유합니다. |
| 주요 failure branch | scenario success + cleanup failure는 nonzero입니다. primary failure와 cleanup failure가 함께 있으면 둘 다 보고하며 unexpected exception도 finally cleanup을 거칩니다. |
| 이 commit의 보장 | test outcome이 scenario assertions뿐 아니라 bounded process termination과 successful cleanup까지 포함합니다. |
| 한계와 다음 관련 commit | process crash 전에 ownership record가 남지 않은 resources를 모두 찾는 기능은 아직 제한됩니다. `2b35aa3d2217`이 exact ownership records와 crash recovery utility를 추가하고 `43ccded05e4f`이 full serial lifecycle을 구성합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: process crash 전에 ownership record가 남지 않은 resources를 모두 찾는 기능은 아직 제한됩니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `2b35aa3d2217`이 exact ownership records와 crash recovery utility를 추가하고 `43ccded05e4f`이 full serial lifecycle을 구성합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: test outcome이 scenario assertions뿐 아니라 bounded process termination과 successful cleanup까지 포함합니다.

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

- `tests/runtime_stack.py`의 `ownership record publication`에서 process crash 뒤에도 어떤 project/image identities가 test-owned인지 남깁니다.
- `tools/cleanup_test_resources.py`의 `record validation / discovery`에서 malformed/untrusted record로 unrelated resource를 삭제하지 않습니다.
- `tools/cleanup_test_resources.py`의 `scoped removal and leak report`에서 crash recovery scope가 explicit ownership에 제한됩니다.
- `tests/runtime_stack.py`의 `normal close record lifecycle`에서 normal과 crash cleanup이 같은 identity source를 공유합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 2b35aa3d2217 | tests/runtime_stack.py | ownership record publication | test project name과 image prefix를 private record directory `0700`의 strict `0600` files에 기록합니다. | process crash 뒤에도 어떤 project/image identities가 test-owned인지 남깁니다. |
| 2b35aa3d2217 | tools/cleanup_test_resources.py | record validation / discovery | record owner/mode/type/content를 검증하고 exact project labels/names와 image repository/tag prefix만 query합니다. | malformed/untrusted record로 unrelated resource를 삭제하지 않습니다. |
| 2b35aa3d2217 | tools/cleanup_test_resources.py | scoped removal and leak report | recorded projects를 down/remove하고 exact images만 지운 뒤 residuals를 보고하며 global Docker prune을 사용하지 않습니다. | crash recovery scope가 explicit ownership에 제한됩니다. |
| 2b35aa3d2217 | tests/runtime_stack.py | normal close record lifecycle | 정상 teardown이 끝나면 corresponding ownership record를 제거하고 cleanup failure면 report를 보존합니다. | normal과 crash cleanup이 같은 identity source를 공유합니다. |

#### 비교 기준

- exact commit diff: `git diff 2b35aa3d2217^ 2b35aa3d2217 -- <path>`
- 이전 Thread 상태와 비교: `git diff 98e4af62e884 2b35aa3d2217 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | test process가 crash하면 in-memory project list가 사라져 orphaned containers/volumes/networks/images를 안전하게 찾기 어렵고 broad prune은 unrelated resources를 삭제합니다. |
| 선택한 boundary / decision | private strict ownership records와 label/tag-scoped recovery tool을 도입했습니다. |
| 핵심 caller/callee 또는 configuration consumer | `tests/runtime_stack.py`의 `ownership record publication`; `tools/cleanup_test_resources.py`의 `record validation / discovery`; `tools/cleanup_test_resources.py`의 `scoped removal and leak report`; `tests/runtime_stack.py`의 `normal close record lifecycle` |
| state / ownership / lifecycle 변화 | test harness가 record publication/removal을, recovery utility가 validated records에 해당하는 Docker resources만 소유합니다. |
| 주요 failure branch | unsafe/malformed records는 삭제 작업 전에 거부됩니다. 일부 removal failure나 residual leak는 report와 nonzero로 surfaced됩니다. |
| 이 commit의 보장 | crash 뒤에도 test가 명시적으로 소유한 project/image scope만 정리하고 unrelated Docker objects를 보존합니다. |
| 한계와 다음 관련 commit | record publication 전 crash하거나 external actor가 ownership label/tag를 위조한 경우까지 완전 해결하지는 않습니다. `43ccded05e4f`과 CI가 preparation/finally에서 recovery utility를 호출합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: record publication 전 crash하거나 external actor가 ownership label/tag를 위조한 경우까지 완전 해결하지는 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `43ccded05e4f`과 CI가 preparation/finally에서 recovery utility를 호출합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: crash 뒤에도 test가 명시적으로 소유한 project/image scope만 정리하고 unrelated Docker objects를 보존합니다.

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

- `tools/verify_stack.py`의 `serial scenario plan`에서 공유 host Docker capacity와 logs/records가 concurrent scenarios로 섞이지 않습니다.
- `tools/verify_stack.py`의 `per-step timeout/result handling`에서 hang/failure가 unbounded pipeline이나 cleanup skip으로 이어지지 않습니다.
- `tools/verify_stack.py`의 `pre/post crash recovery`에서 이전 crash와 현재 run leak를 같은 bounded lifecycle에서 처리합니다.
- `tools/verify_stack.py`의 `outcome precedence`에서 green result가 resource leak를 숨기지 않습니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 43ccded05e4f | tools/verify_stack.py | serial scenario plan | static validation과 config render 뒤 bootstrap, e2e, persistence, backup/restore, rotation, operations scenarios를 정해진 순서로 한 번에 하나씩 실행합니다. | 공유 host Docker capacity와 logs/records가 concurrent scenarios로 섞이지 않습니다. |
| 43ccded05e4f | tools/verify_stack.py | per-step timeout/result handling | 각 command에 explicit timeout을 주고 failure 시 diagnostics를 수집하되 remaining/final cleanup semantics를 보존합니다. | hang/failure가 unbounded pipeline이나 cleanup skip으로 이어지지 않습니다. |
| 43ccded05e4f | tools/verify_stack.py | pre/post crash recovery | 시작 전 stale ownership records를 정리하고 finally에서 cleanup utility와 residual report를 실행합니다. | 이전 crash와 현재 run leak를 같은 bounded lifecycle에서 처리합니다. |
| 43ccded05e4f | tools/verify_stack.py | outcome precedence | scenario failure, diagnostic failure, cleanup leak 중 하나라도 final nonzero를 만들며 cleanup report를 primary result와 함께 보존합니다. | green result가 resource leak를 숨기지 않습니다. |

#### 비교 기준

- exact commit diff: `git diff 43ccded05e4f^ 43ccded05e4f -- <path>`
- 이전 Thread 상태와 비교: `git diff 2b35aa3d2217 43ccded05e4f -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | 개별 test commands는 있었지만 operator가 일부만 실행하거나 parallel/interrupted run에서 stale resources와 result precedence를 일관되게 관리하기 어려웠습니다. |
| 선택한 boundary / decision | 전체 verification을 serial ordered plan, bounded subprocess, diagnostics, pre/final cleanup으로 묶었습니다. |
| 핵심 caller/callee 또는 configuration consumer | `tools/verify_stack.py`의 `serial scenario plan`; `tools/verify_stack.py`의 `per-step timeout/result handling`; `tools/verify_stack.py`의 `pre/post crash recovery`; `tools/verify_stack.py`의 `outcome precedence` |
| state / ownership / lifecycle 변화 | verify orchestrator가 local evidence lifecycle과 command order를 소유하고 각 scenario는 자신의 project resources만 소유합니다. |
| 주요 failure branch | 어느 단계 failure/timeout/unexpected exception에서도 finally cleanup을 실행하고 cleanup failure도 nonzero에 포함합니다. |
| 이 commit의 보장 | 하나의 local command가 static부터 모든 runtime scenarios, diagnostics, leak recovery를 serial bounded lifecycle로 실행합니다. |
| 한계와 다음 관련 commit | machine crash로 finally가 실행되지 않는 경우는 다음 run의 ownership-record recovery에 의존합니다. `18508c25eef0`이 같은 lifecycle을 least-privilege CI에 자동화하고 `8a6c07988160`이 orchestrator/workflow 자체를 검증합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: machine crash로 finally가 실행되지 않는 경우는 다음 run의 ownership-record recovery에 의존합니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `18508c25eef0`이 같은 lifecycle을 least-privilege CI에 자동화하고 `8a6c07988160`이 orchestrator/workflow 자체를 검증합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: 하나의 local command가 static부터 모든 runtime scenarios, diagnostics, leak recovery를 serial bounded lifecycle로 실행합니다.

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

- `.github/workflows/container-stack.yml`의 `runner/timeout/permissions/concurrency`에서 workflow token과 execution duration을 최소/한정합니다.
- `.github/workflows/container-stack.yml`의 `pinned actions / full checkout`에서 CI dependency와 historical verification input을 명시합니다.
- `.github/workflows/container-stack.yml`의 `serial verification / always cleanup`에서 local lifecycle의 cleanup/result semantics를 CI에도 유지합니다.
- `.github/workflows/container-stack.yml`의 `artifact allowlist`에서 CI artifact가 새로운 disclosure channel이 되지 않게 합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 18508c25eef0 | .github/workflows/container-stack.yml | runner/timeout/permissions/concurrency | Ubuntu 24.04 runner, 전체 210분 timeout, `contents: read`, concurrency cancel policy를 선언합니다. | workflow token과 execution duration을 최소/한정합니다. |
| 18508c25eef0 | .github/workflows/container-stack.yml | pinned actions / full checkout | checkout와 artifact upload를 immutable commit SHA로 고정하고 full history를 받아 commit-range/source checks를 가능하게 합니다. | CI dependency와 historical verification input을 명시합니다. |
| 18508c25eef0 | .github/workflows/container-stack.yml | serial verification / always cleanup | static/config/runtime scenarios를 serial 실행하고 failure와 무관하게 diagnostics/ownership cleanup을 `always()` path에서 수행합니다. | local lifecycle의 cleanup/result semantics를 CI에도 유지합니다. |
| 18508c25eef0 | .github/workflows/container-stack.yml | artifact allowlist | 실패 evidence는 redacted diagnostics와 cleanup reports의 좁은 path만 업로드하고 secret/env dump를 포함하지 않습니다. | CI artifact가 새로운 disclosure channel이 되지 않게 합니다. |

#### 비교 기준

- exact commit diff: `git diff 18508c25eef0^ 18508c25eef0 -- <path>`
- 이전 Thread 상태와 비교: `git diff 43ccded05e4f 18508c25eef0 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### A-level 학습 기록

| 항목 | 학습자 기록 |
| --- | --- |
| 직전 관련 상태와 문제 | local verify만으로는 모든 변경에 자동 실행되지 않고 CI가 broad token/action tags/unbounded runtime/unsafe artifact를 사용하면 verification 자체가 위험해질 수 있었습니다. |
| 선택한 boundary / decision | least privilege, pinned actions, bounded timeout, serial scenarios, always cleanup, allowlisted failure evidence를 workflow policy로 만들었습니다. |
| 핵심 caller/callee 또는 configuration consumer | `.github/workflows/container-stack.yml`의 `runner/timeout/permissions/concurrency`; `.github/workflows/container-stack.yml`의 `pinned actions / full checkout`; `.github/workflows/container-stack.yml`의 `serial verification / always cleanup`; `.github/workflows/container-stack.yml`의 `artifact allowlist` |
| state / ownership / lifecycle 변화 | CI job이 ephemeral runner의 checkout/Docker resources/artifacts lifecycle을 소유하며 workflow token은 read-only contents 범위만 가집니다. |
| 주요 failure branch | scenario failure, timeout, cancellation에서도 cleanup steps가 실행되며 diagnostics/cleanup failure는 job status/evidence에 반영됩니다. |
| 이 commit의 보장 | repository change마다 동일 static/runtime/recovery suite를 bounded least-privilege environment에서 자동 실행합니다. |
| 한계와 다음 관련 commit | workflow text가 미래 편집으로 약화되지 않는다는 보장은 별도 self-test 없이는 없습니다. `8a6c07988160`이 workflow, tools, secret/timeout/cleanup contract를 static/AST/mock layers로 검증합니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: workflow text가 미래 편집으로 약화되지 않는다는 보장은 별도 self-test 없이는 없습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: `8a6c07988160`이 workflow, tools, secret/timeout/cleanup contract를 static/AST/mock layers로 검증합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: repository change마다 동일 static/runtime/recovery suite를 bounded least-privilege environment에서 자동 실행합니다.

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

- `tests/validate_stack.py`의 `workflow text contract`에서 CI policy의 필수 요소를 source regression으로 고정합니다.
- `tests/validate_stack.py`의 `forbidden workflow patterns`에서 검증 infrastructure의 high-risk shortcuts를 fail closed합니다.
- `tests/validate_stack.py`의 `Compose service-block parser`에서 global substring보다 service responsibility를 정확히 검증합니다.
- `tests/validate_stack.py`의 `Python AST visitors`에서 text 검색이 놓칠 management-tool semantic weakening을 탐지합니다.
- `tests/validate_stack.py`의 `mocked main-path probes`에서 Docker 없이도 orchestrator failure semantics 일부를 deterministic하게 확인합니다.

#### 코드 근거

| SHA | 경로 | symbol / directive / command | 확인한 line 또는 최소 코드 | 이 코드가 증명하는 사실 |
| --- | --- | --- | --- | --- |
| 8a6c07988160 | tests/validate_stack.py | workflow text contract | runner, timeout, permissions, concurrency, action SHAs, full checkout, serial commands, diagnostics, always cleanup, artifact allowlist를 exact pattern으로 검사합니다. | CI policy의 필수 요소를 source regression으로 고정합니다. |
| 8a6c07988160 | tests/validate_stack.py | forbidden workflow patterns | `pull_request_target`, secret contexts, shell tracing, environment dumping, broad Docker prune, unpinned action references를 거부합니다. | 검증 infrastructure의 high-risk shortcuts를 fail closed합니다. |
| 8a6c07988160 | tests/validate_stack.py | Compose service-block parser | runtime service별 exact mounts/env/networks를 parse해 password env, `/run/secrets`, Nginx private config mount 등 forbidden exposure를 검사합니다. | global substring보다 service responsibility를 정확히 검증합니다. |
| 8a6c07988160 | tests/validate_stack.py | Python AST visitors | subprocess wait/communicate의 explicit timeout과 startup secret read가 project lock lexical/control-flow 안에 있는지 AST로 검사합니다. | text 검색이 놓칠 management-tool semantic weakening을 탐지합니다. |
| 8a6c07988160 | tests/validate_stack.py | mocked main-path probes | preparation timeout, scenario failure, cleanup failure, unexpected exception을 mock해 exit status와 cleanup invocation/result precedence를 검사합니다. | Docker 없이도 orchestrator failure semantics 일부를 deterministic하게 확인합니다. |

#### 비교 기준

- exact commit diff: `git diff 8a6c07988160^ 8a6c07988160 -- <path>`
- 이전 Thread 상태와 비교: `git diff 18508c25eef0 8a6c07988160 -- <path>`
- 두 diff가 보여주는 범위가 다르면 각각 따로 기록합니다.

#### 테스트 학습 기록

| 구분 | 학습자 기록 |
| --- | --- |
| 대상 production invariant | CI와 management/test tools 자체가 least-privilege, pinned, bounded, secret-safe, scoped-cleanup/result-precedence contract를 유지합니다. |
| 재현하는 failure / boundary | workflow/tool source가 green appearance를 유지한 채 permissions/timeouts/secret/cleanup semantics를 약화하는 경계입니다. |
| test technique | static text + service-block parse + Python AST + mocked unit-style control-flow probes |
| fixture와 failure injection | workflow YAML, Compose, Python tools를 읽고 selected main paths를 mock subprocess/cleanup behavior로 호출합니다. |
| 실제 통과하는 production path | validator source parsing과 imported verify/runtime main error branches를 통과하며 Docker production path는 실행하지 않습니다. |
| 핵심 assertion | 필수/금지 workflow pattern, action pins, timeouts, lock/secret order, cleanup invocation, exit/result precedence를 확인합니다. |
| 이 테스트가 증명하는 것 | verification infrastructure의 명시적 policy와 일부 failure control flow가 약화되지 않음을 증명합니다. |
| 이 테스트가 증명하지 않는 것 | 실제 CI service enforcement, live Docker/container behavior, 모든 dynamic Python path는 증명하지 않습니다. |
| 성격 | verification-system source/control-flow regression |
| 막는 후속 regression | broad permissions, unpinned actions, unsafe event/secrets, timeout 제거, global prune, cleanup failure 무시, lock 밖 secret read를 막습니다. |
| 직접 실행 command와 결과 | 실행하지 않았습니다. 현재 환경에는 Docker와 로컬 repository checkout이 없습니다. 해당 SHA의 test code와 command wiring만 검사했습니다. |

#### 다음 연결

- 이 commit 뒤에도 남아 있는 불충분한 보장: GitHub-hosted runner가 실제로 모든 policy를 적용하는지, Docker runtime behavior 전체, AST가 모델링하지 않은 dynamic path는 증명하지 않습니다.
- 다음 관련 commit이 바꾸거나 검증하는 지점: Thread 전체의 “verification of verification” endpoint이며 runtime tests와 상호 보완합니다.
- 이 commit을 제거했을 때 Thread 설명에서 생기는 공백: verification infrastructure 자체가 least-privilege/bounded/secret-safe/scoped-cleanup contract를 source와 selected control-flow 수준에서 유지함을 증명합니다.

## Invariant ledger

| Source에서 연결된 invariant | 처음/초기 단계 | 강화·교정 단계 | 검증 단계 | 학습자가 확인한 실제 근거 |
| --- | --- | --- | --- | --- |
| MariaDB는 internal backend에만 있고 Nginx는 DB network에 접근하지 않습니다. | 27a3dca01d3b | 27a3dca01d3b | 7fbd41fe5af4 | Compose exact membership과 live Docker network inspect가 Nginx/frontend, MariaDB/backend, WordPress dual-homed 상태를 확인합니다. |
| destructive cleanup은 exact selected project confirmation과 owned-resource scope를 요구합니다. | 74c285925325 | 2b35aa3d2217 | 7fbd41fe5af4, 43ccded05e4f, 18508c25eef0 | Make exact-name guard와 records/labels/tags scoped cleanup이 generic deletion/global prune를 대신합니다. |
| diagnostics는 private, redacted, non-overwriting이며 sanitization 불가 시 아무것도 게시하지 않습니다. | ef74ad47ea81 | 27a083d91c87 | 7fbd41fe5af4 | complete masking set, 0700/0600 O_EXCL output, rescan, error-directory removal과 unsafe fixtures가 연결됩니다. |
| runtime test cleanup 실패와 residual leak는 verification failure입니다. | 98e4af62e884 | 2b35aa3d2217, 43ccded05e4f | 18508c25eef0, 8a6c07988160 | close error accumulation, ownership records, final leak recovery, CI/self-test result precedence가 연결됩니다. |
| cleanup과 recovery는 global Docker prune 없이 exact project labels/names/image tags만 제거합니다. | 2b35aa3d2217 | 43ccded05e4f | 18508c25eef0, 8a6c07988160 | private records와 exact discovery/removal, forbidden prune pattern이 ownership discipline을 고정합니다. |
| automation command는 bounded timeout, least privilege, pinned dependencies, allowlisted evidence를 유지합니다. | 43ccded05e4f | 18508c25eef0 | 8a6c07988160 | serial timeouts, read-only token, SHA-pinned actions, always cleanup, artifact allowlist와 text/AST/mock tests가 연결됩니다. |

### Ledger 보완 기록

- source에 명시되지 않은 새 invariant를 확정 사실로 추가하지 않습니다.
- invariant가 실제로 부족했음을 드러낸 commit 또는 failure stage: single network, unguarded destructive cleanup, best-effort diagnostics/teardown와 독립 test commands는 failure 반경과 leak를 verification success 밖에 남겼습니다.
- marker, rename, lock, health, authentication, cleanup 등 invariant를 고정하는 concrete mechanism: internal backend, exact project confirmation, fail-closed private diagnostics, owned-resource records, serial bounded orchestration와 least-privilege pinned workflow가 operational ownership을 고정합니다.
- 후속 commit이 invariant를 약화하지 못하게 하는 regression evidence: `7fbd41fe5af4`, `98e4af62e884`, `43ccded05e4f`, `18508c25eef0`, `8a6c07988160`이 live policy, result precedence, cleanup과 workflow 자체를 계층적으로 검증합니다.
## Failure → Fix → Test 연결

| failure / 위험 | fix 또는 mechanism | test / evidence | 학습자 연결 기록 |
| --- | --- | --- | --- |
| single shared network가 frontend에 DB reachability 부여 | 27a3dca01d3b internal backend/exact memberships | 7fbd41fe5af4 live network inspect | WordPress만 request와 persistence networks를 연결합니다. |
| generic confirmation으로 wrong project volume 삭제 | 74c285925325 exact PROJECT_NAME confirmation | 7fbd41fe5af4 refusal+health/state | destructive scope를 operation 시점에 다시 명시합니다. |
| diagnostic bundle이 credential/path 누출 또는 partial output | ef74ad47ea81 redaction + 27a083d91c87 private fail-closed publication | 7fbd41fe5af4 real log/unreadable/overwrite/symlink cases | sanitize input이 불완전하면 일부 결과도 게시하지 않습니다. |
| scenario pass지만 teardown failure로 resources 누수 | 98e4af62e884 cleanup error result propagation | 2b35aa3d2217 ownership records + 43ccded05e4f final recovery | cleanup은 test 외 부수 작업이 아니라 evidence success 조건입니다. |
| crash cleanup이 broad prune로 unrelated resources 삭제 | 2b35aa3d2217 label/tag-scoped recovery | 43ccded05e4f/CI final cleanup과 8a6c07988160 no-prune guard | explicit ownership 이외에는 삭제하지 않습니다. |
| CI green이지만 permissions/action pins/timeout/secret/cleanup 약화 | 18508c25eef0 policy-rich workflow | 8a6c07988160 text/AST/mock self-validation | verification system도 versioned executable contract로 검증합니다. |

### 직접 재구성할 chain

```text
기존 가정: Compose declaration과 scenario body success만으로 운영 policy와 test success를 판단할 수 있다는 가정
  → 실제 failure 또는 위험: effective runtime mismatch, wrong-project deletion, secret-bearing partial diagnostics, cleanup leak와 weakened CI가 green result 뒤에 숨을 수 있었습니다.
  → root cause: policy 적용 상태, diagnostics publication, resource ownership과 verification control flow가 success condition에 포함되지 않았습니다.
  → 수정된 invariant / decision: live inspect와 negative checks를 수행하고 diagnostics/cleanup/leak 결과를 primary outcome에 합치며 exact owned resources만 제거합니다.
  → 해당 SHA의 실제 수정 코드: `27a3dca01d3b`~`2b35aa3d2217` operational mechanisms와 `43ccded05e4f`/`18508c25eef0` orchestrators
  → failure injection 또는 regression test: `7fbd41fe5af4`, `98e4af62e884`, `8a6c07988160` runtime/static/AST/mock evidence
  → 증명된 보장 / 남은 비보장: network/limits/guard/redaction/cleanup/CI policy weakening을 검출하지만 이번 환경에서는 Docker와 Actions를 직접 실행하지 않았습니다.
```

## Ownership / state / responsibility 변화

| 대상 | 이전 상태 | 이후 책임/authoritative state | 확인할 근거 | 학습자 결론 |
| --- | --- | --- | --- | --- |
| Networks | single shared bridge | frontend/backend 분리; WordPress만 dual-homed | 27a3dca01d3b Compose + 7fbd41fe5af4 inspect | Nginx는 DB addressability를 갖지 않습니다. |
| Service resource lifecycle | Docker defaults | service-specific limits, stop signal/timeout, log rotation | 911544133fb4 + live inspect | Docker effective state까지 확인 대상입니다. |
| Diagnostics output | arbitrary existing path/broad inspect 가능 | new private directory와 allowlisted redacted files | ef74ad47ea81, 27a083d91c87 | collector가 complete publication lifecycle을 소유합니다. |
| Scenario cleanup | best-effort teardown | test result 일부이며 exact project/image ownership만 제거 | 98e4af62e884, 2b35aa3d2217 | cleanup failure는 success를 무효화합니다. |
| Leak recovery utility | broad manual cleanup 위험 | strict private records와 exact labels/tags 기반 recovery | 2b35aa3d2217 | global prune를 사용하지 않습니다. |
| Local/CI orchestrator | 개별 commands | serial bounded lifecycle, diagnostics, final cleanup, outcome precedence 소유 | 43ccded05e4f, 18508c25eef0, 8a6c07988160 | verification infrastructure 자체도 contract로 검사합니다. |

## Thread 최종 상태

- **Source-confirmed endpoint:** This progression turns operational policy into executable evidence. Runtime limits and network boundaries are inspected on live containers; destructive commands and diagnostics fail safely; and both local and CI runners account for every project resource they create. The cleanup tooling deliberately avoids global Docker pruning, preserving the same ownership discipline used by the product management paths.
- 최종 authoritative state와 owner: Compose가 network/resource/shutdown/log policy를, private diagnostics directory가 redacted evidence를, ownership records가 test resource scope를 소유합니다.
- 정상 실행의 entry point와 완료 조건: local/CI orchestrator가 static/config/runtime scenarios를 serial bounded execution하고 diagnostics와 final cleanup까지 성공해야 정상 완료입니다.
- failure 또는 interruption 뒤 retry/rollback/compensation 조건: scenario/diagnostic/cleanup/timeout/unexpected failure는 모두 nonzero에 반영되며 records 기반 exact cleanup을 시도하고 residual leak를 보고합니다.
- 이 Thread가 다른 Thread에 제공하는 전제: 앞선 모든 Threads의 architecture와 recovery properties를 live inspect하고 지속적으로 자동 검증하는 운영 lifecycle을 제공합니다.
- 이 Thread 단독으로는 증명하지 않는 것: Docker가 없는 현재 환경에서는 live operations/CI workflow를 실행하지 않았으며 source/commit inspection으로 mechanism만 확인했습니다.

## 최종 architecture 또는 execution flow 정리

| 단계 | 확인할 흐름 | 실제 코드 근거 | 정상 전이 | 실패·정리·재시도 |
| --- | --- | --- | --- | --- |
| 1 | Compose policy 선언 | 27a3dca01d3b, 911544133fb4 | network membership과 runtime limits/stop/log/security를 정의합니다. | misconfiguration은 render/start 또는 live test failure입니다. |
| 2 | effective operations test | 7fbd41fe5af4 | Docker inspect와 negative commands로 실제 적용을 확인합니다. | policy/guard/diagnostic mismatch면 scenario 실패입니다. |
| 3 | redaction set 생성 | ef74ad47ea81 diagnose_stack | rendered secret paths와 values를 안전하게 읽어 longer-first/structural masking합니다. | 하나라도 읽지 못하면 bundle을 만들지 않습니다. |
| 4 | private diagnostic publish | 27a083d91c87 | 0700 directory/0600 allowlisted files를 O_EXCL로 쓰고 rescan합니다. | failure/secret residue/existing path면 directory 전체를 제거합니다. |
| 5 | scenario result+cleanup | 98e4af62e884 | body, diagnostics, teardown errors를 한 final status로 합칩니다. | cleanup failure는 primary success를 무효화합니다. |
| 6 | ownership/crash recovery | 2b35aa3d2217 | private records와 exact labels/tags만 제거합니다. | unsafe record나 residual leak는 nonzero이며 global prune는 금지됩니다. |
| 7 | local serial verify | 43ccded05e4f | all scenarios를 timeout/diagnostics/final cleanup과 순서대로 실행합니다. | 각 failure에도 finally cleanup과 result precedence를 유지합니다. |
| 8 | CI automation | 18508c25eef0 | least-privilege/pinned actions/allowlisted artifacts로 같은 lifecycle을 실행합니다. | timeout/cancel/failure에도 always cleanup을 시도합니다. |
| 9 | self-validation | 8a6c07988160 | workflow text, Compose blocks, Python AST, mocked main paths를 검사합니다. | verification policy weakening을 static failure로 바꿉니다. |

### 학습자의 최종 설명

> 운영 강화는 옵션을 많이 추가하는 것이 아니라 실패 반경과 소유권을 줄이는 과정입니다. frontend/backend를 분리해 WordPress만 dual-homed bridge로 남기고, service-specific limits와 shutdown/log policy를 선언한 뒤 live inspect로 effective state를 확인합니다. destructive volume deletion은 selected project name의 exact confirmation을 요구합니다. diagnostics는 complete secret/path masking set을 안전하게 만들 수 있을 때만 새 private directory에 allowlisted files를 쓰고 final rescan하며, 어느 단계 실패든 output 전체를 제거합니다. runtime tests는 cleanup failure도 test failure로 취급하고 private ownership records를 남겨 crash recovery가 exact projects/images만 제거하게 합니다. local verify와 CI는 모든 scenarios를 serial timeout으로 실행하고 diagnostics/cleanup/result precedence를 보존하며, 마지막 static/AST/mock tests가 workflow와 tools 자체의 policy weakening까지 검사합니다.

## 학습 완료 자가 점검

- [x] Nginx와 MariaDB가 같은 network에 남아 있다고 설명하지 않았습니까?
- [x] Compose declaration만 보고 effective runtime limits를 확인했다고 간주하지 않았습니까?
- [x] diagnostic redaction 실패 시 partial bundle을 남긴다고 잘못 기록하지 않았습니까?
- [x] cleanup을 product 외 부수 작업으로 취급해 scenario success와 분리하지 않았습니까?
- [x] recovery utility가 Docker prune을 사용한다고 쓰지 않았습니까?
- [x] CI workflow만 보고 verification tools의 control flow 계약을 생략하지 않았습니까?
- [x] 모든 code snippet에 SHA와 path/symbol을 기록했습니다.
- [x] final HEAD의 field/helper/test를 이전 SHA에 소급하지 않았습니다.
- [x] source가 확정하지 않은 사실을 추정으로 채우지 않았습니다.
- [x] test가 증명하는 것과 증명하지 않는 것을 구분했습니다.
- [x] 이 Thread를 commit 순서대로 구두 설명할 수 있습니다.
