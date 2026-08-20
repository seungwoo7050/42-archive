# Thread: Endpoint ownership and bounded polling

> 완성형 해설서가 아닙니다. 아래 확정 사항을 기준으로 각 commit SHA의 실제 코드와 diff를 읽고 기록란을 채웁니다.

## 1. Thread 목표

per-UID Unix socket namespace와 client/server endpoint lifetime을 복원하고, path를 계산한 사실과 actual bind ownership을 구분한 fix, `fd_set`이 표현할 수 없는 descriptor를 startup에서 거부하는 runtime boundary를 확인합니다.

### Significance

predictable socket path는 naming convenience가 아니라 filesystem authority와 cleanup responsibility를 만듭니다. same-UID stale socket은 교체할 수 있지만 regular file이나 자신이 bind하지 않은 entry를 삭제해서는 안 됩니다. valid descriptor라도 `FD_SETSIZE` 이상이면 `FD_SET`이 object 밖을 쓸 수 있으므로 polling representation의 한계를 controlled failure로 바꿔야 합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- runtime directory의 UID와 permissions를 어떤 checks로 보장하는가?
- role/PID path에서 invalid role, nonpositive PID, `sun_path` overflow를 어디서 거부하는가?
- client/server socket descriptor, bound path, cleanup registration의 acquisition order는 무엇인가?
- same-UID stale socket과 protected regular file을 어떤 code path로 구분하는가?
- bind failure 뒤 cleanup이 unowned path를 삭제할 수 있었던 state mistake는 무엇인가?
- 어떤 descriptors가 `fd_set`에 들어가며 `FD_SETSIZE` guard가 각 `FD_SET` 전에 실행되는가?
- high-descriptor test는 mock integer가 아니라 real inherited table을 어떻게 만드는가?

## 3. 완료 기준

- [ ] runtime directory와 path helper의 validation/permission rules를 코드로 기록합니다.
- [ ] client/server의 socket create → flags → stale handling → bind → cleanup 순서를 복원합니다.
- [ ] computed path, stale replacement authority, successful bind ownership을 구분합니다.
- [ ] regular-file preservation과 clean startup failure를 test assertion에 연결합니다.
- [ ] client socket, server socket, self-pipe read fd guards와 real high-fd regression을 확인합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `2c37cb592d05` | feat(runtime): 안전한 응답 endpoint 경로 생성 | A | ARCH, ENDPOINT, RISK | per-UID private runtime directory와 role/PID-derived Unix socket path helper를 정의합니다. |
| 2 | `25780b881ee8` | feat(client): datagram 응답 endpoint 수명주기 관리 | B | ENDPOINT, PROCESS_LIFECYCLE | client가 nonblocking, close-on-exec datagram socket을 PID-derived path에 bind하고 invocation lifetime에 맞춰 cleanup합니다. |
| 3 | `32390dcdfc1b` | feat(server): datagram 응답 endpoint 수명주기 관리 | B | ENDPOINT, PROCESS_LIFECYCLE | server가 long-lived nonblocking, close-on-exec datagram endpoint를 server path에 bind하고 normal exit와 rollback에서 cleanup합니다. |
| 4 | `622d80020fb2` | fix(client): bind한 응답 경로만 정리 | A | ENDPOINT, RISK | client cleanup이 response path를 실제 `bind`한 경우에만 unlink하도록 bound ownership flag를 사용합니다. |
| 5 | `ffd3647a1518` | test(runtime): stale 응답 endpoint 처리 검증 | A | TEST, ENDPOINT, RISK | real PID-derived paths에 stale client/server sockets, regular files, unrelated live processes를 만들어 endpoint trust와 cleanup policy를 검증합니다. |
| 6 | `4e1c84bfacfc` | fix(runtime): select 범위를 벗어난 descriptor 거부 | A | EDGE, PRACTICAL, RISK | client response socket, server response socket, self-pipe read fd가 `FD_SETSIZE` 이상이면 initialization에서 거부합니다. |
| 7 | `1de95310195d` | test(runtime): 높은 descriptor 번호의 안전한 실패 검증 | A | TEST, EDGE, RISK | wrapper가 `/dev/null`을 반복 open해 inherited descriptor table을 `FD_SETSIZE` boundary까지 높인 뒤 real client/server를 `exec`합니다. |

확인 원칙:

- 각 항목은 해당 SHA의 tree를 기준으로 읽습니다.
- 변경 전 상태는 해당 SHA의 parent 또는 지정된 이전 관련 SHA에서 확인합니다.
- 같은 commit이 다른 Thread에 다시 등장해도 이 Thread의 질문으로 별도 기록합니다.

## 5. Commit별 학습 기록

### 1. `2c37cb592d05` — feat(runtime): 안전한 응답 endpoint 경로 생성

- **Importance:** A
- **Tags:** ARCH, ENDPOINT, RISK
- **Thread 내 역할:** per-UID private runtime directory와 role/PID-derived Unix socket path helper를 정의합니다.

#### 원문에서 확정된 맥락

directory owner와 permissions를 검사해 group/other accessible state를 거부하고 helper는 role, positive PID, Unix path length를 검증합니다. cooperative local integrity boundary이며 same-UID authentication은 아닙니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] runtime directory name에 UID를 포함하는 code
- [ ] directory create/existing `stat` owner/type check
- [ ] group/other permission bits rejection
- [ ] client/server role validation
- [ ] positive PID check
- [ ] formatted path와 `sun_path` capacity comparison
- [ ] truncation refusal와 error contract

#### 비교 기준

parent에는 datagram endpoint namespace가 없음을 확인하고 `25780b881ee8`/`32390dcdfc1b` caller로 이어집니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:


#### 보장 범위

**이 commit이 보장하는 것**

- [ ] authoritative endpoint naming
- [ ] private namespace와 path validation

**아직 보장하지 않는 것**

- [ ] same-UID authentication
- [ ] actual bind ownership
- [ ] polling fd bounds

#### 코드 증거 기록

- 파일 경로:
- symbol 또는 함수:
- 확인한 state fields:
- caller → callee:
- 핵심 branch 또는 mutation 순서:
- parent 또는 이전 관련 SHA와의 diff 요약:
- 삽입할 최소 코드 조각과 선택 이유:
- 직접 실행한 command 또는 test와 결과:

#### 다음 연결

`25780b881ee8`과 `32390dcdfc1b`가 client/server lifetime에 이 policy를 적용합니다.
### 2. `25780b881ee8` — feat(client): datagram 응답 endpoint 수명주기 관리

- **Importance:** B
- **Tags:** ENDPOINT, PROCESS_LIFECYCLE
- **Thread 내 역할:** client가 nonblocking, close-on-exec datagram socket을 PID-derived path에 bind하고 invocation lifetime에 맞춰 cleanup합니다.

#### 원문에서 확정된 맥락

existing entry는 same-UID socket일 때만 remove하며 initialization failure는 acquired resources를 unwind합니다. later fix가 bind ownership condition을 더 좁힙니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] socket create와 O_NONBLOCK/FD_CLOEXEC setup
- [ ] client PID-derived path helper call
- [ ] existing owner/type check와 stale socket unlink
- [ ] `bind` sockaddr와 length
- [ ] descriptor/path/stale/bind/cleanup registration order
- [ ] 각 init failure의 unwind
- [ ] 당시 cleanup unlink condition과 state field

#### 비교 기준

`2c37cb592d05` path policy 적용을 확인하고 `622d80020fb2`에서 bind failure cleanup bug를 찾습니다.

#### B-level 구현 역할 기록

- Thread 전체에서 이 commit이 연결하는 앞/뒤 단계:
- 실제로 추가·수정된 핵심 symbol과 state:
- 이 commit만으로 충분하지 않아 후속 commit을 확인해야 하는 부분:


#### 보장 범위

**이 commit이 보장하는 것**

- [ ] concrete client reply destination lifetime
- [ ] nonblocking/CLOEXEC setup

**아직 보장하지 않는 것**

- [ ] bind ownership과 unlink의 완전한 대칭
- [ ] server endpoint

#### 코드 증거 기록

- 파일 경로:
- symbol 또는 함수:
- 확인한 state fields:
- caller → callee:
- 핵심 branch 또는 mutation 순서:
- parent 또는 이전 관련 SHA와의 diff 요약:
- 삽입할 최소 코드 조각과 선택 이유:
- 직접 실행한 command 또는 test와 결과:

#### 다음 연결

`32390dcdfc1b`에서 server counterpart가 추가되고 `622d80020fb2`에서 client cleanup을 수정합니다.
### 3. `32390dcdfc1b` — feat(server): datagram 응답 endpoint 수명주기 관리

- **Importance:** B
- **Tags:** ENDPOINT, PROCESS_LIFECYCLE
- **Thread 내 역할:** server가 long-lived nonblocking, close-on-exec datagram endpoint를 server path에 bind하고 normal exit와 rollback에서 cleanup합니다.

#### 원문에서 확정된 맥락

startup은 stale same-UID socket만 제거하고 bind success state를 기록합니다. filesystem path가 crash 뒤 지속될 수 있어 lifecycle bookkeeping이 필요합니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] server datagram socket create/flags
- [ ] server path derivation와 stale validation
- [ ] bind success state field
- [ ] response socket의 event-loop registration
- [ ] startup failure close/unlink conditions
- [ ] normal exit registered cleanup

#### 비교 기준

`25780b881ee8` client setup과 공통/차이를 표로 비교하고 `4e1c84bfacfc`에서 numeric bound를 확인합니다.

#### B-level 구현 역할 기록

- Thread 전체에서 이 commit이 연결하는 앞/뒤 단계:
- 실제로 추가·수정된 핵심 symbol과 state:
- 이 commit만으로 충분하지 않아 후속 commit을 확인해야 하는 부분:


#### 보장 범위

**이 commit이 보장하는 것**

- [ ] long-lived server endpoint lifecycle
- [ ] startup rollback와 cleanup

**아직 보장하지 않는 것**

- [ ] client ownership bug fix
- [ ] fd range safety
- [ ] shutdown integration

#### 코드 증거 기록

- 파일 경로:
- symbol 또는 함수:
- 확인한 state fields:
- caller → callee:
- 핵심 branch 또는 mutation 순서:
- parent 또는 이전 관련 SHA와의 diff 요약:
- 삽입할 최소 코드 조각과 선택 이유:
- 직접 실행한 command 또는 test와 결과:

#### 다음 연결

`622d80020fb2`와 `ffd3647a1518`이 cleanup authority와 stale policy를 강화합니다.
### 4. `622d80020fb2` — fix(client): bind한 응답 경로만 정리

- **Importance:** A
- **Tags:** ENDPOINT, RISK
- **Thread 내 역할:** client cleanup이 response path를 실제 `bind`한 경우에만 unlink하도록 bound ownership flag를 사용합니다.

#### 원문에서 확정된 맥락

path 계산은 namespace object 생성 증거가 아닙니다. existing endpoint 때문에 bind가 실패했는데 cleanup이 unconditional unlink하면 다른 process entry를 삭제할 수 있습니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] client endpoint state의 bound boolean
- [ ] `bind` success 직후 flag set
- [ ] bind before/after failure에서 flag value
- [ ] descriptor close와 path unlink의 separate conditions
- [ ] bind failure 뒤 no-unlink path
- [ ] successful exit의 path removal symmetry

#### 비교 기준

`25780b881ee8` cleanup condition과 direct diff해 computed-path state가 bound ownership으로 바뀐 부분을 표시합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:

#### Fix 연결 기록

| 단계 | Source에서 확정된 내용 | 해당 SHA의 코드 근거 |
| --- | --- | --- |
| 기존 가정 | path를 계산했으면 cleanup에서 삭제해도 된다. |  |
| 실제 failure | bind failure 원인인 existing endpoint를 삭제할 수 있다. |  |
| root cause | name knowledge와 resource ownership을 동일시했다. |  |
| 수정 invariant | successful bind가 있었을 때만 path를 unlink한다. |  |

- 변경 전 failure를 재현하거나 추론할 수 있는 입력/상태:
- root cause가 드러나는 field 또는 call order:
- 수정된 invariant를 고정하는 후속 regression test:

#### 보장 범위

**이 commit이 보장하는 것**

- [ ] unlink authority와 successful bind의 대칭
- [ ] unowned path preservation

**아직 보장하지 않는 것**

- [ ] full stale policy
- [ ] server cleanup
- [ ] filesystem authentication

#### 코드 증거 기록

- 파일 경로:
- symbol 또는 함수:
- 확인한 state fields:
- caller → callee:
- 핵심 branch 또는 mutation 순서:
- parent 또는 이전 관련 SHA와의 diff 요약:
- 삽입할 최소 코드 조각과 선택 이유:
- 직접 실행한 command 또는 test와 결과:

#### 다음 연결

`ffd3647a1518`에서 stale socket replacement와 protected file preservation을 검증합니다.
### 5. `ffd3647a1518` — test(runtime): stale 응답 endpoint 처리 검증

- **Importance:** A
- **Tags:** TEST, ENDPOINT, RISK
- **Thread 내 역할:** real PID-derived paths에 stale client/server sockets, regular files, unrelated live processes를 만들어 endpoint trust와 cleanup policy를 검증합니다.

#### 원문에서 확정된 맥락

same-UID stale socket은 remove/replace되지만 non-socket은 preserved되고 startup은 실패합니다. private directory permissions와 valid server endpoint 없는 PID rejection도 확인합니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] child `exec`와 real PID path synchronization
- [ ] stale Unix socket setup
- [ ] expected path의 regular file preservation assertion
- [ ] client/server stale replacement cases
- [ ] runtime directory owner/mode assertion
- [ ] live unrelated PID without server endpoint rejection
- [ ] socket/file/process cleanup

#### 비교 기준

`2c37cb592d05`, `25780b881ee8`, `32390dcdfc1b`, `622d80020fb2` policy branches를 test cases에 매핑합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:


#### Test commit 분석 기록

- **대상 production invariant:** replaceable stale socket만 제거하고 non-socket/unowned entry는 보존합니다.
- **재현하는 failure 또는 boundary:** predictable path를 근거로 regular file 또는 other endpoint를 destructive cleanup하는 상황
- **사용한 test technique:** real filesystem objects, PID-derived names, child exec, live processes
- **분류:** runtime/filesystem integration regression

확인할 production path:

- [ ] runtime dir validation
- [ ] path derivation
- [ ] stale check
- [ ] bind
- [ ] cleanup
- [ ] server endpoint validation

이 테스트가 증명하는 항목:

- [ ] stale replacement
- [ ] regular-file preservation
- [ ] private permissions
- [ ] invalid identity rejection

이 테스트가 증명하지 않는 항목:

- [ ] same-UID authentication
- [ ] high-fd guard
- [ ] all crash windows

학습자 기록:

- failure 주입 또는 process orchestration 시작 지점:
- production code에 진입하는 최초 호출:
- 핵심 assertion과 관측값:
- broad integration 요소와 deterministic regression 요소의 구분:
- 후속 변경에서 막아야 할 구체적인 회귀:


#### 코드 증거 기록

- 파일 경로:
- symbol 또는 함수:
- 확인한 state fields:
- caller → callee:
- 핵심 branch 또는 mutation 순서:
- parent 또는 이전 관련 SHA와의 diff 요약:
- 삽입할 최소 코드 조각과 선택 이유:
- 직접 실행한 command 또는 test와 결과:

#### 다음 연결

`4e1c84bfacfc`에서 endpoint descriptor의 polling representability를 추가합니다.
### 6. `4e1c84bfacfc` — fix(runtime): select 범위를 벗어난 descriptor 거부

- **Importance:** A
- **Tags:** EDGE, PRACTICAL, RISK
- **Thread 내 역할:** client response socket, server response socket, self-pipe read fd가 `FD_SETSIZE` 이상이면 initialization에서 거부합니다.

#### 원문에서 확정된 맥락

`fd_set`은 fixed-size bit representation이므로 large descriptor의 `FD_SET`은 undefined behavior를 일으킬 수 있습니다. valid fd와 selected polling API representability를 구분합니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] client response socket의 `FD_SETSIZE` guard
- [ ] server response socket의 guard
- [ ] self-pipe read fd guard
- [ ] 모든 `FD_SET`/`pselect` 이전 실행 order
- [ ] guard failure resource unwind
- [ ] client/server normal diagnostic/status

#### 비교 기준

endpoint setup commits의 `FD_SET` call sites와 비교하고 `1de95310195d` wrapper boundary와 맞춥니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:

#### Fix 연결 기록

| 단계 | Source에서 확정된 내용 | 해당 SHA의 코드 근거 |
| --- | --- | --- |
| 기존 가정 | open에 성공한 descriptor는 `FD_SET`에 넣을 수 있다. |  |
| 실제 위험 | `fd >= FD_SETSIZE`면 fixed object 밖을 쓸 수 있다. |  |
| root cause | OS fd validity와 polling representation range를 혼동했다. |  |
| 수정 invariant | polling descriptor는 creation 단계에서 range-check한다. |  |

- 변경 전 failure를 재현하거나 추론할 수 있는 입력/상태:
- root cause가 드러나는 field 또는 call order:
- 수정된 invariant를 고정하는 후속 regression test:

#### 보장 범위

**이 commit이 보장하는 것**

- [ ] out-of-range fd controlled startup failure
- [ ] out-of-bounds `FD_SET` prevention

**아직 보장하지 않는 것**

- [ ] dynamic polling support
- [ ] descriptor pressure 해결
- [ ] all inherited-fd issues

#### 코드 증거 기록

- 파일 경로:
- symbol 또는 함수:
- 확인한 state fields:
- caller → callee:
- 핵심 branch 또는 mutation 순서:
- parent 또는 이전 관련 SHA와의 diff 요약:
- 삽입할 최소 코드 조각과 선택 이유:
- 직접 실행한 command 또는 test와 결과:

#### 다음 연결

`1de95310195d`에서 real descriptors로 client/server guards를 실행합니다.
### 7. `1de95310195d` — test(runtime): 높은 descriptor 번호의 안전한 실패 검증

- **Importance:** A
- **Tags:** TEST, EDGE, RISK
- **Thread 내 역할:** wrapper가 `/dev/null`을 반복 open해 inherited descriptor table을 `FD_SETSIZE` boundary까지 높인 뒤 real client/server를 `exec`합니다.

#### 원문에서 확정된 맥락

두 executable은 `pselect`나 protocol traffic 전에 normal diagnostic으로 실패해야 합니다. high-fd client failure는 independently running server에 영향을 주지 않아야 합니다.

> 아래 항목은 반드시 이 SHA의 tree와 diff에서 확인합니다. final HEAD의 같은 함수나 파일을 대신 사용하지 않습니다.

#### 해당 SHA에서 확인할 코드

- [ ] wrapper open loop와 target boundary
- [ ] descriptors를 유지한 채 `exec`하는 code
- [ ] client guard와 server/self-pipe guard cases
- [ ] server no-PID-publication assertion
- [ ] client no protocol traffic/normal failure assertion
- [ ] independent server unaffected case
- [ ] wrapper/child cleanup

#### 비교 기준

`4e1c84bfacfc`의 three guards 중 각 case가 어느 fd를 range 밖으로 만드는지 기록합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee:
- 기존 설계가 충분하지 않았던 구체적인 이유:
- 변경된 decision과 state mutation 순서:
- 정상 경로와 failure 경로가 갈라지는 조건:
- 후속 commit이 강화하거나 교체하는 부분:


#### Test commit 분석 기록

- **대상 production invariant:** `fd_set`에 들어가는 descriptors는 모두 `FD_SETSIZE` 미만입니다.
- **재현하는 failure 또는 boundary:** inherited descriptor pressure로 new socket/pipe가 unrepresentable range에 할당되는 상황
- **사용한 test technique:** real `/dev/null` allocation followed by `exec`
- **분류:** environmental boundary integration regression

확인할 production path:

- [ ] descriptor allocation
- [ ] client/server init guard
- [ ] normal error reporting
- [ ] cleanup

이 테스트가 증명하는 항목:

- [ ] real high-fd condition
- [ ] pre-poll failure
- [ ] client/server guards
- [ ] unrelated server unaffected

이 테스트가 증명하지 않는 항목:

- [ ] no descriptor leaks
- [ ] poll/epoll portability
- [ ] range-inside exhaustion

학습자 기록:

- failure 주입 또는 process orchestration 시작 지점:
- production code에 진입하는 최초 호출:
- 핵심 assertion과 관측값:
- broad integration 요소와 deterministic regression 요소의 구분:
- 후속 변경에서 막아야 할 구체적인 회귀:


#### 코드 증거 기록

- 파일 경로:
- symbol 또는 함수:
- 확인한 state fields:
- caller → callee:
- 핵심 branch 또는 mutation 순서:
- parent 또는 이전 관련 SHA와의 diff 요약:
- 삽입할 최소 코드 조각과 선택 이유:
- 직접 실행한 command 또는 test와 결과:

#### 다음 연결

이 commit이 Thread final regression입니다.


## 6. Invariant ledger

### Source에서 확정된 핵심 invariant

- runtime directory는 current UID 소유이며 group/other access가 없는 private namespace입니다.
- role/PID path는 validation과 length check를 통과한 경우에만 사용합니다.
- process는 실제 bind한 path 또는 policy상 replaceable same-UID stale socket만 unlink합니다.
- regular files와 unowned entries는 보존하고 startup은 cleanly 실패합니다.
- `fd_set`에 넣는 descriptor는 모두 `FD_SETSIZE` 미만입니다.

### 시간에 따른 변화 기록

| Commit | Source에서 확정된 변화 | 실제 state/condition | code evidence | 상태: 도입·강화·부족·복구·검증 |
| --- | --- | --- | --- | --- |
| `2c37cb592d05` | per-UID private runtime directory와 role/PID-derived Unix socket path helper를 정의합니다. |  |  |  |
| `25780b881ee8` | client가 nonblocking, close-on-exec datagram socket을 PID-derived path에 bind하고 invocation lifetime에 맞춰 cleanup합니다. |  |  |  |
| `32390dcdfc1b` | server가 long-lived nonblocking, close-on-exec datagram endpoint를 server path에 bind하고 normal exit와 rollback에서 cleanup합니다. |  |  |  |
| `622d80020fb2` | client cleanup이 response path를 실제 `bind`한 경우에만 unlink하도록 bound ownership flag를 사용합니다. |  |  |  |
| `ffd3647a1518` | real PID-derived paths에 stale client/server sockets, regular files, unrelated live processes를 만들어 endpoint trust와 cleanup policy를 검증합니다. |  |  |  |
| `4e1c84bfacfc` | client response socket, server response socket, self-pipe read fd가 `FD_SETSIZE` 이상이면 initialization에서 거부합니다. |  |  |  |
| `1de95310195d` | wrapper가 `/dev/null`을 반복 open해 inherited descriptor table을 `FD_SETSIZE` boundary까지 높인 뒤 real client/server를 `exec`합니다. |  |  |  |

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 상태 | 실제 failure/위험 | Fix 또는 전환 commit | 수정된 decision/invariant | Test 또는 후속 검증 | 학습자 code evidence |
| --- | --- | --- | --- | --- | --- |
| PID-derived path를 계산하면 cleanup authority가 있다고 간주 | bind failure 뒤 existing/unowned entry를 unlink할 수 있음 | `622d80020fb2` | successful bind를 ownership flag로 기록하고 그때만 unlink | ffd3647a1518 stale/protected object regression |  |
| descriptor open success면 `FD_SET` 가능 | `fd >= FD_SETSIZE`에서 fixed bitset 밖 memory write 가능 | `4e1c84bfacfc` | polling descriptor를 resource creation 단계에서 range-check | 1de95310195d real high-fd wrapper |  |

전용 test commit이 없는 연결에는 존재하지 않는 test를 만들어 적지 않습니다.

## 8. Ownership / state / responsibility 변화

| 단계 | state 또는 responsibility owner | transition | 당시 한계 또는 다음 변화 | 실제 symbol/field |
| --- | --- | --- | --- | --- |
| path helper | runtime namespace policy | role/PID → validated path | 계산만으로 ownership 없음 |  |
| client/server setup | descriptor + bind state | open/configure/bind 단계별 acquisition | partial unwind 필요 |  |
| client fix | bound flag | bind success 때 unlink authority 획득 | computed path와 ownership 분리 |  |
| polling setup | `fd_set` representation | range 안 descriptor만 registration | 범위 밖 startup failure |  |

## 9. Thread 최종 상태

Source에서 확정된 최종 조건:

- response endpoints는 private per-UID runtime directory의 validated PID-derived paths를 사용합니다.
- same-UID stale socket은 policy에 따라 replace하지만 non-socket과 unowned entry는 삭제하지 않습니다.
- cleanup은 actual resource-acquisition state와 대칭입니다.
- response sockets와 self-pipe read fd가 `FD_SETSIZE` 범위를 넘으면 polling 전에 실패합니다.

학습자 기록:

- 최종 state fields와 owner:
- 정상 transition 순서:
- 실패 시 중단·reset·cleanup 순서:
- 최종 상태가 보장하지 않는 것:
- 이 Thread를 한 문단으로 설명한 최종 서술:

## 10. 최종 architecture 또는 execution flow 정리

아래 노드를 해당 SHA에서 확인한 함수명과 branch로 연결합니다.

- [ ] runtime directory create 또는 existing directory validation
- [ ] role/PID path derivation과 `sun_path` length check
- [ ] socket create와 nonblocking/CLOEXEC setup
- [ ] existing path type/owner/staleness 판정
- [ ] bind success와 ownership flag record
- [ ] `FD_SETSIZE` check 뒤 `FD_SET`/`pselect`
- [ ] normal exit 또는 rollback에서 close와 conditional unlink

```text
[시작 함수/입력]
    -> [검증]
    -> [state transition]
    -> [외부 효과 또는 응답]
    -> [성공 시 다음 state]
    -> [failure 시 cleanup/종료]
```

- 실제 함수·파일을 반영한 완성 흐름:
- asynchronous boundary:
- externally visible commit point:
- cleanup owner:

## 11. 학습 완료 자가 점검

- [ ] commit map의 7개 SHA를 source 순서대로 모두 설명할 수 있습니다.
- [ ] 각 code excerpt에 SHA, path, symbol, 선택 이유가 기록돼 있습니다.
- [ ] final HEAD 코드를 historical SHA의 증거로 사용한 곳이 없습니다.
- [ ] 정상 경로와 failure path를 state mutation 순서로 설명할 수 있습니다.
- [ ] source 확정 invariant와 직접 확인한 code evidence를 구분했습니다.
- [ ] test commit의 invariant, failure, technique, production path, proves/not-proves를 기록했습니다.
- [ ] Thread final state를 함수와 state field 수준으로 설명할 수 있습니다.

### 이 Thread와 직접 연결된 Major Engineering Difficulties

- socket path가 crash 뒤 남을 수 있어 stale recovery와 destructive cleanup을 구분해야 합니다.
- same-UID integrity boundary는 same-UID peer authentication이 아닙니다.
- inherited descriptor pressure가 ordinary socket/pipe allocation을 polling range 밖으로 밀 수 있습니다.
