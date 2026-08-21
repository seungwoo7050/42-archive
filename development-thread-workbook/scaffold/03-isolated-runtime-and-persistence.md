# Thread 3 — Isolated runtime evidence and persistent-state verification

## Thread 목표

고정 identity를 제거해 독립 project를 만들고, isolated Docker harness로 request path와 persistent volume 보장을 실제 runtime에서 검증하는 흐름을 추적합니다.

**Source significance**

> Parameterization made independent test projects possible; the harness then turned those parameters into controlled Docker resources and private credentials. End-to-end and persistence scenarios prove distinct properties: one shows that the integrated request/data path works, while the other shows that container replacement does not replace authoritative volume state.

## 이 Thread를 이해하기 위한 핵심 질문

- fixed container/image/port/URL identity가 여러 test project를 막는 방식은 무엇입니까?
- test harness가 developer default project를 건드리지 않는다는 증거는 무엇입니까?
- source-level Compose validation과 live container inspection은 각각 무엇을 놓칠 수 있습니까?
- end-to-end request/data-path test와 restart/recreate persistence test가 증명하는 속성은 어떻게 다릅니까?
- port conflict recovery가 임의의 startup failure를 숨기지 않도록 어떤 조건으로 제한됩니까?

## 완료 기준

- project/image/port/URL parameter가 Compose resource naming과 WordPress canonical URL에 미치는 영향을 확인했습니다.
- harness의 private env/secret creation, timeout, diagnostics, teardown 경계를 코드로 추적했습니다.
- HTTPS → FastCGI → WordPress → MariaDB의 동일 데이터 round trip을 test assertion으로 복원했습니다.
- restart와 container recreation 뒤에도 같은 volume set이 유지되는지 기록했습니다.

## Commit map

| 순서 | SHA | Subject | Importance | Tags | Source-defined role |
| --- | --- | --- | --- | --- | --- |
| 1 | `9d75a34e290f` | feat(runtime): 프로젝트·이미지·포트·URL 격리 | **A** | `ARCH`<br>`STACK`<br>`OPERATIONS` | Removed fixed project, image, port, and URL identities. |
| 2 | `2c436f574712` | test(bootstrap): 격리된 런타임 하네스 추가 | **A** | `TEST`<br>`ARCH`<br>`OPERATIONS` | Created the isolated Docker runtime harness and secret-boundary inspection. |
| 3 | `8c9b5b9adef2` | test(e2e): HTTPS와 MariaDB를 잇는 WordPress 데이터 검증 | **A** | `TEST`<br>`INTEGRATION`<br>`STACK` | Verified the complete HTTPS, FastCGI, WordPress, and MariaDB data path. |
| 4 | `fb1a689cf969` | test(persistence): 재시작·재생성 뒤 상태 보존 검증 | **A** | `TEST`<br>`PERSISTENCE`<br>`RISK` | Verified database, option, upload, and volume identity across restart and recreation. |

> Commit 순서는 source의 Development Thread 정의를 그대로 따릅니다. 같은 SHA가 다른 Thread에도 있으면 이 문서의 관점으로 다시 확인합니다.

## Commit별 학습 기록

### 1. `9d75a34e290f` — feat(runtime): 프로젝트·이미지·포트·URL 격리

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `ARCH`, `STACK`, `OPERATIONS` |
| Source-defined role | Removed fixed project, image, port, and URL identities. |
| 이전 Thread commit | 없음 |
| 다음 Thread commit | `2c436f574712` |

#### 원문이 확정한 범위

- **Summary:** Parameterizes project names, image tags, HTTPS binding, port, and canonical WordPress URL while removing fixed container names.
- **Classification reason:** This enables multiple isolated stacks and makes later runtime testing and fresh-project restore possible; it is a significant deployment-boundary improvement.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `9d75a34e290f`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- Compose에서 fixed `container_name`이 제거된 diff와 project namespace가 resource naming을 소유하게 된 지점을 확인합니다.
- local image prefix/tag variables, host bind address/HTTPS port variables, required canonical `WORDPRESS_URL` mapping을 찾습니다.
- default loopback bind와 non-default port가 certificate domain과 WordPress URL에 각각 어떻게 반영되는지 구분합니다.
- 두 isolated project의 rendered container/image/port/URL identity가 충돌하지 않는지 예시 값을 대입해 확인합니다.

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

### 2. `2c436f574712` — test(bootstrap): 격리된 런타임 하네스 추가

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `TEST`, `ARCH`, `OPERATIONS` |
| Source-defined role | Created the isolated Docker runtime harness and secret-boundary inspection. |
| 이전 Thread commit | `9d75a34e290f` |
| 다음 Thread commit | `8c9b5b9adef2` |

#### 원문이 확정한 범위

- **Summary:** Adds an isolated Docker runtime harness with private credentials, random project names, dynamic ports, cleanup, and secret-boundary inspection.
- **Classification reason:** The harness becomes the foundation for the branch's later behavioral evidence and materially changes the project from source-validated configuration to reproducible runtime verification.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `2c436f574712`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- harness가 private temporary directory와 owner-only secret/environment files를 생성하는 open flags/mode를 확인합니다.
- unique Compose project, image prefix, loopback port를 만드는 source와 collision retry branch를 추적합니다.
- port retry가 Docker의 genuine bind conflict일 때만 실행되고 다른 startup failure는 surfaced되는지 확인합니다.
- control/process/build timeout이 각 command class에 적용되는 위치를 기록합니다.
- live containers에서 markers, `/run/secrets` mounts, password env/arguments, config-volume visibility, `wp-config.php` content를 검사하는 코드를 찾습니다.
- teardown과 optional diagnostics가 selected project만 대상으로 하는 command construction을 확인합니다.

#### 비교 기준

- exact commit diff: `git diff 2c436f574712^ 2c436f574712 -- <path>`
- 이전 Thread 상태와 비교: `git diff 9d75a34e290f 2c436f574712 -- <path>`
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

### 3. `8c9b5b9adef2` — test(e2e): HTTPS와 MariaDB를 잇는 WordPress 데이터 검증

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `TEST`, `INTEGRATION`, `STACK` |
| Source-defined role | Verified the complete HTTPS, FastCGI, WordPress, and MariaDB data path. |
| 이전 Thread commit | `2c436f574712` |
| 다음 Thread commit | `fb1a689cf969` |

#### 원문이 확정한 범위

- **Summary:** Extends the harness to test HTTPS health, WordPress post creation and rendering, MariaDB persistence, port-conflict recovery, and legacy configuration migration.
- **Classification reason:** It verifies the complete browser-to-database path and catches integration failures that static checks cannot, making it significant but not an architectural implementation commit.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `8c9b5b9adef2`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- initial selected port를 deliberately occupy하고 startup이 새 isolated port를 선택하는 test setup/action/assertion을 확인합니다.
- legacy in-volume `wp-config.php` layout을 주입하고 private config volume으로 migration되는 경로와 assertion을 찾습니다.
- WP-CLI로 unique post를 생성하는 command, Nginx HTTPS fetch에서 explicit DNS-to-loopback resolution, response assertion을 추적합니다.
- WordPress를 통해 MariaDB를 query해 동일 content가 durable row에 도달했음을 확인하는 code path를 표시합니다.
- health-only test와 달리 TLS→FastCGI→PHP→DB를 하나의 identifier로 연결하는 evidence를 기록합니다.

#### 비교 기준

- exact commit diff: `git diff 8c9b5b9adef2^ 8c9b5b9adef2 -- <path>`
- 이전 Thread 상태와 비교: `git diff 2c436f574712 8c9b5b9adef2 -- <path>`
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

### 4. `fb1a689cf969` — test(persistence): 재시작·재생성 뒤 상태 보존 검증

| 항목 | 원문 확정값 |
| --- | --- |
| Importance | **A** |
| Tags | `TEST`, `PERSISTENCE`, `RISK` |
| Source-defined role | Verified database, option, upload, and volume identity across restart and recreation. |
| 이전 Thread commit | `8c9b5b9adef2` |
| 다음 Thread commit | 없음 |

#### 원문이 확정한 범위

- **Summary:** Verifies posts, options, uploads, and all three named volumes across container restart and recreation.
- **Classification reason:** The test locks down a central durable-state invariant and distinguishes container lifecycle from volume lifecycle, providing strong evidence for a core project guarantee.

#### 해당 SHA에서 확인할 코드

> 기준 commit은 반드시 `fb1a689cf969`입니다. final HEAD의 동일 파일을 근거로 대체하지 않습니다.

- MariaDB의 post/custom option과 WordPress filesystem upload라는 세 state class를 만드는 fixture를 확인합니다.
- project-owned volume 세 개의 names를 언제 기록하고 lifecycle transition 뒤 어떻게 재조회하는지 추적합니다.
- 첫 transition인 service restart와 두 번째 transition인 container teardown/recreation without volume deletion을 구분합니다.
- 각 transition 뒤 HTTPS, WP-CLI, filesystem, exact volume set assertions를 기록합니다.
- 새 healthy container가 empty/different volume을 받는 regression을 이 test가 어떻게 잡는지 설명합니다.

#### 비교 기준

- exact commit diff: `git diff fb1a689cf969^ fb1a689cf969 -- <path>`
- 이전 Thread 상태와 비교: `git diff 8c9b5b9adef2 fb1a689cf969 -- <path>`
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
| 각 runtime scenario는 고유 Compose project, image prefix, port, credential을 사용합니다. | `9d75a34e290f` | `2c436f574712` | `8c9b5b9adef2, fb1a689cf969` | `[학습자: 실제 code/test evidence]` |
| loopback HTTPS bind와 explicit WordPress URL은 non-default port에서도 일치합니다. | `9d75a34e290f` | `2c436f574712` | `8c9b5b9adef2` | `[학습자: 실제 code/test evidence]` |
| 통합 request path가 성공해도 persistence가 자동 증명되지는 않습니다. | `8c9b5b9adef2` | `fb1a689cf969가 별도 durable-state evidence 추가` | `fb1a689cf969` | `[학습자: 실제 code/test evidence]` |
| container replacement는 authoritative named volume identity를 바꾸지 않습니다. | `75590dedfb3a에서 구조 도입` | `fb1a689cf969` | `fb1a689cf969` | `[학습자: 실제 code/test evidence]` |

### Ledger 보완 기록

- source에 명시되지 않은 새 invariant를 확정 사실로 추가하지 않습니다.
- invariant가 실제로 부족했음을 드러낸 commit 또는 failure stage: `[학습자 작성]`
- marker, rename, lock, health, authentication, cleanup 등 invariant를 고정하는 concrete mechanism: `[학습자 작성]`
- 후속 commit이 invariant를 약화하지 못하게 하는 regression evidence: `[학습자 작성]`

## Failure → Fix → Test 연결

| failure / 위험 | fix 또는 mechanism | test / evidence | 학습자 연결 기록 |
| --- | --- | --- | --- |
| fixed names/ports/images로 test stack 간 충돌 | 9d75a34e290f가 identity parameterization | 2c436f574712가 unique project harness로 검증 | `[학습자: root cause와 code/test 연결]` |
| healthy process만으로 application data path를 추정 | 8c9b5b9adef2가 uniquely identifiable post를 browser-to-DB로 연결 | 동일 scenario의 HTTPS와 DB assertions | `[학습자: root cause와 code/test 연결]` |
| container recreate 뒤 새 empty volume을 받아도 health가 통과할 수 있음 | fb1a689cf969가 volume names와 세 state class를 기록 | restart 및 down/recreate 뒤 동일 값과 volume set assertion | `[학습자: root cause와 code/test 연결]` |

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
| Compose project namespace | fixed names가 암묵적 공유 | scenario별 container/network/volume identity 소유 | project_name parameter와 rendered names evidence | `[학습자 작성]` |
| Harness temporary directory | developer environment에 의존 가능 | env, secret, diagnostics, control files의 private owner | mode, creation, cleanup evidence | `[학습자 작성]` |
| Runtime data | health만으로 추정 | post/option/upload와 volume identity로 명시적 검증 | WP-CLI, HTTPS, DB query, Docker volume evidence | `[학습자 작성]` |
| Port selection | fixed host port | loopback reservation과 genuine bind-conflict retry | reservation/retry branch와 error classification evidence | `[학습자 작성]` |

## Thread 최종 상태

- **Source-confirmed endpoint:** Parameterization made independent test projects possible; the harness then turned those parameters into controlled Docker resources and private credentials. End-to-end and persistence scenarios prove distinct properties: one shows that the integrated request/data path works, while the other shows that container replacement does not replace authoritative volume state.
- 최종 authoritative state와 owner: `[학습자 작성]`
- 정상 실행의 entry point와 완료 조건: `[학습자 작성]`
- failure 또는 interruption 뒤 retry/rollback/compensation 조건: `[학습자 작성]`
- 이 Thread가 다른 Thread에 제공하는 전제: `[학습자 작성]`
- 이 Thread 단독으로는 증명하지 않는 것: `[학습자 작성]`

## 최종 architecture 또는 execution flow 정리

| 단계 | 확인할 흐름 | 실제 코드 근거 | 정상 전이 | 실패·정리·재시도 |
| --- | --- | --- | --- | --- |
| 1 | private scenario environment와 secrets를 만드는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 2 | unique project/image prefix와 loopback port를 선택하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 3 | real staged startup command를 실행하고 timeout을 적용하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 4 | live container에서 secret boundary와 completion marker를 검사하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 5 | post를 생성해 HTTPS response와 MariaDB durable row를 연결하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 6 | restart 및 container recreation 후 동일 volume/state를 재검사하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |
| 7 | project-scoped teardown과 diagnostics를 수행하는 지점 | `[SHA/path/symbol]` | `[정상 전이]` | `[failure/cleanup/retry]` |

### 학습자의 최종 설명

> `[학습자 작성: 위 표와 commit evidence만 사용해 이 Thread의 설계 → 구현 → 실패 → 수정 → 검증 발전을 설명합니다.]`

## 학습 완료 자가 점검

- [ ] e2e test가 persistence까지 자동 증명한다고 합쳤습니까?
- [ ] port retry가 모든 startup error에 적용된다고 잘못 기록하지 않았습니까?
- [ ] volume 이름의 동일성과 volume 안 값의 동일성을 모두 확인했습니까?
- [ ] test harness가 default Compose namespace를 사용할 가능성을 코드로 배제했습니까?
- [ ] 모든 code snippet에 SHA와 path/symbol을 기록했습니다.
- [ ] final HEAD의 field/helper/test를 이전 SHA에 소급하지 않았습니다.
- [ ] source가 확정하지 않은 사실을 추정으로 채우지 않았습니다.
- [ ] test가 증명하는 것과 증명하지 않는 것을 구분했습니다.
- [ ] 이 Thread를 commit 순서대로 구두 설명할 수 있습니다.
