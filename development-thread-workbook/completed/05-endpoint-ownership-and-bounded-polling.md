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

- [x] runtime directory와 path helper의 validation/permission rules를 코드로 기록했습니다.
- [x] client/server의 socket create → flags → stale handling → bind → cleanup 순서를 복원했습니다.
- [x] computed path, stale replacement authority, successful bind ownership을 구분했습니다.
- [x] regular-file preservation과 clean startup failure를 test assertion에 연결했습니다.
- [x] client socket, server socket, self-pipe read fd guards와 real high-fd regression을 확인했습니다.

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

- 각 항목은 해당 SHA의 tree를 기준으로 읽었습니다.
- 변경 전 상태는 해당 SHA의 parent 또는 지정된 이전 관련 SHA에서 확인했습니다.
- 같은 commit이 다른 Thread에 다시 등장해도 이 Thread의 질문으로 별도 기록했습니다.
- runtime test는 실행하지 않았으며, 실행 결과처럼 표현하지 않았습니다.

## 5. Commit별 학습 기록

### 1. `2c37cb592d05` — feat(runtime): 안전한 응답 endpoint 경로 생성

- **Importance:** A
- **Tags:** ARCH, ENDPOINT, RISK
- **Thread 내 역할:** per-UID private runtime directory와 role/PID-derived Unix socket path helper를 정의합니다.

#### 원문에서 확정된 맥락

directory owner와 permissions를 검사해 group/other accessible state를 거부하고 helper는 role, positive PID, Unix path length를 검증합니다. cooperative local integrity boundary이며 same-UID authentication은 아닙니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] UID를 runtime directory name에 포함
- [x] `mkdir(..., 0700)`과 existing directory `lstat`
- [x] directory type/current UID/`(mode & 077) == 0` 검사
- [x] role whitelist와 positive PID check
- [x] formatted path truncation refusal
- [x] host-local same-UID boundary의 한계

#### 비교 기준

parent에는 shared response endpoint namespace가 없습니다. 이 commit은 path를 계산할 authority만 정의하며 successful bind ownership은 아직 caller가 관리해야 합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: control datagram schema는 정의됐지만 client/server가 사용할 filesystem namespace, path validation, stale-entry policy의 공통 기준이 없었습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: predictable AF_UNIX path를 임의로 만들면 다른 UID가 접근 가능한 directory, 잘린 `sun_path`, invalid PID/role, object type을 확인하지 않은 destructive cleanup으로 이어질 수 있습니다.
- 변경된 decision과 state mutation 순서: `src/response_channel.c`에 current UID를 포함한 private runtime directory helper와 role/PID path helper를 추가했습니다. existing directory는 type, owner, permission bits를 검증합니다. `mt_response_path`가 buffer/role/PID를 검사 → `mt_runtime_dir`가 `/tmp/signal-message-bus-<uid>`를 format → `mkdir(...,0700)` 또는 existing dir 검사 → role whitelist → `<dir>/<role>-<pid>.sock` format과 truncation 검사입니다.
- 정상 경로와 failure 경로가 갈라지는 조건: NULL/zero buffer, `pid <= 1`, unknown role는 failure입니다. directory가 current UID 소유 directory가 아니거나 mode의 `077` 중 하나라도 켜져 있으면 `EACCES`; formatted length가 capacity 이상이면 `ENAMETOOLONG`입니다.
- 후속 commit이 강화하거나 교체하는 부분: `25780b881ee8`과 `32390dcdfc1b`가 client/server socket lifetime에 helper를 적용하고 `ffd3647a1518`이 actual filesystem objects로 policy를 검증합니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] authoritative endpoint naming
- [x] private per-UID namespace validation
- [x] role/PID/path-length rejection

**아직 보장하지 않는 것**

- [x] same-UID authentication
- [x] actual bind ownership
- [x] stale socket replacement의 전체 lifecycle
- [x] polling fd bounds

#### 코드 증거 기록

- 파일 경로: `src/response_channel.c`, `include/minitalk.h`, `Makefile`
- symbol 또는 함수: `validate_runtime_dir`, `mt_runtime_dir`, `mt_response_path`
- 확인한 state fields: `directory path buffer`, `formatted length`
- caller → callee: client/server endpoint setup → `mt_response_path` → `mt_runtime_dir` → `validate_runtime_dir`
- 핵심 branch 또는 mutation 순서: `mt_response_path`가 buffer/role/PID를 검사 → `mt_runtime_dir`가 `/tmp/signal-message-bus-<uid>`를 format → `mkdir(...,0700)` 또는 existing dir 검사 → role whitelist → `<dir>/<role>-<pid>.sock` format과 truncation 검사입니다.
- parent 또는 이전 관련 SHA와의 diff 요약: 새 source file과 header declarations/build object가 추가됐고 아직 socket creation/bind는 없습니다.
- 삽입한 최소 코드 조각과 선택 이유: SHA `2c37cb592d05`, `src/response_channel.c`, `validate_runtime_dir`. namespace가 directory type, owner, group/other access를 모두 요구함을 보여 줍니다.

```c
if (!S_ISDIR(info.st_mode) || info.st_uid != getuid()
    || (info.st_mode & 077) != 0)
{
    errno = EACCES;
    return (-1);
}
```

- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`25780b881ee8`과 `32390dcdfc1b`가 client/server lifetime에 이 policy를 적용합니다.
### 2. `25780b881ee8` — feat(client): datagram 응답 endpoint 수명주기 관리

- **Importance:** B
- **Tags:** ENDPOINT, PROCESS_LIFECYCLE
- **Thread 내 역할:** client가 nonblocking, close-on-exec datagram socket을 PID-derived path에 bind하고 invocation lifetime에 맞춰 cleanup합니다.

#### 원문에서 확정된 맥락

existing entry는 same-UID socket일 때만 remove하며 initialization failure는 acquired resources를 unwind합니다. later fix가 bind ownership condition을 더 좁힙니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] datagram socket create
- [x] O_NONBLOCK와 FD_CLOEXEC setup
- [x] client PID-derived path 계산
- [x] same-UID socket만 stale unlink
- [x] AF_UNIX bind와 cleanup registration
- [x] partial initialization unwind
- [x] 당시 path-nonempty cleanup condition

#### 비교 기준

`2c37cb592d05`의 naming policy를 concrete socket lifetime에 적용합니다. server처럼 long-lived endpoint가 아니라 한 client invocation에만 존재합니다.

#### B-level 구현 역할 기록

- Thread 전체에서 이 commit이 연결하는 앞/뒤 단계: path helper만 존재했고 client가 READY/ACK datagram을 받을 concrete descriptor와 bound destination을 소유하지 않았습니다. → `32390dcdfc1b`가 server counterpart를 추가하고 `622d80020fb2`가 client cleanup authority를 actual bind success로 좁힙니다.
- 실제로 추가·수정된 핵심 symbol과 state: client에 global response socket/path state, nonblocking+CLOEXEC flag helper, same-UID stale-socket removal, AF_UNIX bind, `atexit` cleanup을 추가했습니다.
- 이 commit만으로 충분하지 않아 후속 commit을 확인해야 하는 부분: client별 response endpoint가 없으면 server가 reply destination을 식별할 수 없습니다. 동시에 predictable path의 stale object와 partial initialization을 안전하게 정리해야 합니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] concrete client reply destination lifetime
- [x] nonblocking/CLOEXEC setup
- [x] stale same-UID socket replacement과 protected object rejection

**아직 보장하지 않는 것**

- [x] bind ownership과 unlink의 완전한 대칭
- [x] server endpoint
- [x] same-UID authentication
- [x] FD_SETSIZE guard

#### 코드 증거 기록

- 파일 경로: `src/client.c`, `src/response_channel.c`, `include/minitalk.h`
- symbol 또는 함수: `bind_client_socket`, `cleanup_response_socket`, `set_nonblocking_close_on_exec`, `remove_stale_socket`
- 확인한 state fields: `g_response_socket`, `g_client_path`
- caller → callee: client `main`/initialization → `bind_client_socket` → path/stale/socket/flags/bind; exit → `cleanup_response_socket`
- 핵심 branch 또는 mutation 순서: path 계산 → existing path `lstat`/same-UID socket이면 unlink → socket create → O_NONBLOCK → FD_CLOEXEC → sockaddr 작성/length check → bind → cleanup registration/사용입니다. 이 SHA의 cleanup은 path가 계산돼 nonempty이면 unlink해 bind 성공 여부와 완전히 대칭적이지 않습니다.
- parent 또는 이전 관련 SHA와의 diff 요약: client에 response resource acquisition과 cleanup이 추가됐지만 actual bind ownership을 나타내는 boolean은 아직 없습니다.
- 삽입할 최소 코드 조각과 선택 이유: 표와 호출 순서만으로 invariant가 충분히 드러나므로 코드 덤프를 추가하지 않았습니다.
- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`32390dcdfc1b`에서 server counterpart가 추가되고 `622d80020fb2`에서 client cleanup을 수정합니다.
### 3. `32390dcdfc1b` — feat(server): datagram 응답 endpoint 수명주기 관리

- **Importance:** B
- **Tags:** ENDPOINT, PROCESS_LIFECYCLE
- **Thread 내 역할:** server가 long-lived nonblocking, close-on-exec datagram endpoint를 server path에 bind하고 normal exit와 rollback에서 cleanup합니다.

#### 원문에서 확정된 맥락

startup은 stale same-UID socket만 제거하고 bind success state를 기록합니다. filesystem path가 crash 뒤 지속될 수 있어 lifecycle bookkeeping이 필요합니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] server datagram socket create/flags
- [x] server PID path와 same-UID stale policy
- [x] `g_server_bound` set timing
- [x] response socket event-loop registration
- [x] startup rollback close/unlink condition
- [x] normal exit cleanup

#### 비교 기준

client counterpart와 acquisition 단계는 유사하지만 server는 event pipe와 long-lived `pselect` registration을 함께 소유하고 이미 explicit bound flag를 사용합니다.

#### B-level 구현 역할 기록

- Thread 전체에서 이 commit이 연결하는 앞/뒤 단계: client endpoint는 존재하지만 server가 ACQUIRE를 받거나 READY/ACK을 보내는 long-lived socket과 event-loop registration은 없었습니다. → `ffd3647a1518`이 stale/protected objects를 검증하고 `4e1c84bfacfc`가 response socket과 self-pipe fd의 polling range를 제한합니다.
- 실제로 추가·수정된 핵심 symbol과 state: server에 event/response channel preparation, response socket/path와 `g_server_bound`, stale validation, nonblocking+CLOEXEC, bind, event-loop `FD_SET`, registered cleanup을 추가했습니다.
- 이 commit만으로 충분하지 않아 후속 commit을 확인해야 하는 부분: server path는 process 종료 뒤 filesystem에 남을 수 있고 startup 중 partial resource acquisition도 가능하므로 descriptor와 bound name의 ownership을 별도로 기록해야 합니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] long-lived server endpoint lifecycle
- [x] bind-aware startup rollback와 cleanup
- [x] response socket의 event-loop integration

**아직 보장하지 않는 것**

- [x] client ownership bug fix
- [x] fd range safety
- [x] shutdown signal integration
- [x] same-UID authentication

#### 코드 증거 기록

- 파일 경로: `src/server.c`, `src/response_channel.c`, `include/minitalk.h`
- symbol 또는 함수: `prepare_response_channel`, `remove_stale_socket`, `cleanup_server`, `run_event_loop`
- 확인한 state fields: `g_response_socket`, `g_server_path`, `g_server_bound`, `g_event_pipe`
- caller → callee: server `main` → `prepare_response_channel` → path/stale/socket/flags/bind; loop → `FD_SET`; exit → `cleanup_server`
- 핵심 branch 또는 mutation 순서: event pipe setup → server path 계산/stale check → datagram socket create/flags → bind → `g_server_bound = 1` → event loop가 socket을 read set에 등록 → normal/error exit에서 close 후 bound path만 unlink합니다.
- parent 또는 이전 관련 SHA와의 diff 요약: server response endpoint, bound flag, event-loop input와 cleanup이 추가됐습니다.
- 삽입할 최소 코드 조각과 선택 이유: 표와 호출 순서만으로 invariant가 충분히 드러나므로 코드 덤프를 추가하지 않았습니다.
- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`622d80020fb2`와 `ffd3647a1518`이 cleanup authority와 stale policy를 강화합니다.
### 4. `622d80020fb2` — fix(client): bind한 응답 경로만 정리

- **Importance:** A
- **Tags:** ENDPOINT, RISK
- **Thread 내 역할:** client cleanup이 response path를 실제 `bind`한 경우에만 unlink하도록 bound ownership flag를 사용합니다.

#### 원문에서 확정된 맥락

path 계산은 namespace object 생성 증거가 아닙니다. existing endpoint 때문에 bind가 실패했는데 cleanup이 unconditional unlink하면 다른 process entry를 삭제할 수 있습니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] client endpoint state의 `g_client_bound`
- [x] bind success 직후 flag set
- [x] bind 전/실패 시 false state
- [x] descriptor close와 path unlink의 separate conditions
- [x] successful exit의 close/unlink symmetry

#### 비교 기준

`25780b881ee8`의 cleanup condition을 direct diff하면 path nonempty check에 `g_client_bound`가 추가되고 bind success 뒤 flag assignment가 생깁니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: `25780b881ee8`의 client는 `g_client_path[0] != 0`이면 cleanup에서 unlink했습니다. path는 bind보다 먼저 계산되므로 bind failure에서도 nonempty였습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: 동일 PID-derived name에 protected/existing object가 있어 bind가 실패한 경우, 실패 cleanup이 자신이 생성하지 않은 object를 지울 수 있습니다. descriptor ownership과 path ownership이 다른 acquisition 단계입니다.
- 변경된 decision과 state mutation 순서: `g_client_bound` boolean을 추가하고 successful `bind` 직후에만 1로 설정했습니다. cleanup은 descriptor close와 path unlink를 separate conditions로 처리합니다. path 계산/possible stale handling → socket create/configure → bind → success 직후 `g_client_bound = 1`; cleanup은 fd가 있으면 close하고, bound flag와 nonempty path가 모두 true일 때만 unlink한 뒤 flag/path를 reset합니다.
- 정상 경로와 failure 경로가 갈라지는 조건: bind 전 또는 bind 실패에는 bound flag가 0이므로 computed path를 삭제하지 않습니다. successful invocation/후속 failure에는 flag가 1이어서 자신이 bind한 path를 제거합니다.
- 후속 commit이 강화하거나 교체하는 부분: `ffd3647a1518`이 stale socket은 replace하고 regular file/unowned entry는 보존하는 regression으로 이 authority rule을 고정합니다.

#### Fix 연결 기록

| 단계 | Source에서 확정된 내용 | 해당 SHA의 코드 근거 |
| --- | --- | --- |
| 기존 가정 | path를 계산했으면 cleanup에서 삭제해도 됩니다. | `25780b881ee8` cleanup은 nonempty path만 확인했습니다. |
| 실제 failure 또는 위험 | bind failure 원인인 existing endpoint 또는 unowned object를 삭제할 수 있습니다. | path 계산은 bind 전이고 cleanup은 init failure에도 실행됩니다. |
| root cause | name knowledge와 resource ownership을 동일시했습니다. | descriptor와 path의 acquisition 시점이 다른데 하나의 path-nonempty state만 사용했습니다. |
| 수정 invariant/decision | successful bind가 있었을 때만 path를 unlink합니다. | `g_client_bound` set/reset과 cleanup condition |
| regression | `ffd3647a1518`이 regular file preservation과 stale socket replacement를 검증합니다. | `tests/stale_exec.c`, `tests/protocol_regressions.sh`의 real path scenarios |

- 변경 전 failure를 재현하거나 추론할 수 있는 입력/상태: 직전 상태와 해당 분기를 직접 비교했습니다.
- root cause가 드러나는 field 또는 call order: path 계산/possible stale handling → socket create/configure → bind → success 직후 `g_client_bound = 1`; cleanup은 fd가 있으면 close하고, bound flag와 nonempty path가 모두 true일 때만 unlink한 뒤 flag/path를 reset합니다.
- 수정된 invariant를 고정하는 후속 regression test: `ffd3647a1518` stale/protected endpoint integration test입니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] unlink authority와 successful bind의 대칭
- [x] bind하지 않은 path 보존
- [x] descriptor와 filesystem name의 독립 cleanup

**아직 보장하지 않는 것**

- [x] full stale policy의 adversarial authentication
- [x] server cleanup 변경
- [x] same-UID malicious object
- [x] TOCTOU 제거

#### 코드 증거 기록

- 파일 경로: `src/client.c`
- symbol 또는 함수: `bind_client_socket`, `cleanup_response_socket`
- 확인한 state fields: `g_response_socket`, `g_client_path`, `g_client_bound`
- caller → callee: client endpoint initialization → `bind` → set bound; any exit/error → `cleanup_response_socket`
- 핵심 branch 또는 mutation 순서: path 계산/possible stale handling → socket create/configure → bind → success 직후 `g_client_bound = 1`; cleanup은 fd가 있으면 close하고, bound flag와 nonempty path가 모두 true일 때만 unlink한 뒤 flag/path를 reset합니다.
- parent 또는 이전 관련 SHA와의 diff 요약: global bound flag와 conditional unlink가 추가됐고 나머지 socket setup은 유지됩니다.
- 삽입한 최소 코드 조각과 선택 이유: SHA `622d80020fb2`, `src/client.c`, `bind_client_socket`. unlink authority가 실제 bind 성공 뒤에만 생기는 정확한 지점입니다.

```c
if (bind(g_response_socket, (struct sockaddr *)&address,
        sizeof(address)) == -1)
    return (-1);
g_client_bound = 1;
return (0);
```

- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`ffd3647a1518`에서 stale socket replacement와 protected file preservation을 검증합니다.
### 5. `ffd3647a1518` — test(runtime): stale 응답 endpoint 처리 검증

- **Importance:** A
- **Tags:** TEST, ENDPOINT, RISK
- **Thread 내 역할:** real PID-derived paths에 stale client/server sockets, regular files, unrelated live processes를 만들어 endpoint trust와 cleanup policy를 검증합니다.

#### 원문에서 확정된 맥락

same-UID stale socket은 remove/replace되지만 non-socket은 preserved되고 startup은 실패합니다. private directory permissions와 valid server endpoint 없는 PID rejection도 확인합니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] real child PID와 path synchronization
- [x] stale Unix socket creation
- [x] expected path의 regular file preservation
- [x] client/server stale replacement
- [x] runtime directory owner/mode assertion
- [x] unrelated live PID without server endpoint rejection
- [x] 모든 child/socket/file cleanup

#### 비교 기준

`2c37cb592d05`, `25780b881ee8`, `32390dcdfc1b`, `622d80020fb2`의 runtime dir/path/stale/bind/conditional cleanup branches를 scenario별로 연결합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: path, stale policy, client/server lifetime, client bound flag는 code에 있었지만 real filesystem type/owner/PID combinations에서 destructive cleanup이 없는지 검증되지 않았습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: mock path 문자열만으로는 Unix socket inode, regular file, child PID timing, stale entry replacement, runtime directory permission과 cleanup side effect를 함께 재현하지 못합니다.
- 변경된 decision과 state mutation 순서: helper child/exec와 real AF_UNIX sockets/files를 사용해 target PID-derived paths를 만들고 client/server startup과 cleanup 결과를 shell에서 검사했습니다. private runtime dir 준비/검사 → child PID 확보 → 해당 role path에 stale socket 또는 regular file 생성 → real client/server 실행 → status/output/object existence 검사 → child/socket/file cleanup입니다. unrelated live PID에는 server path가 없어 client가 protocol 시작 전에 실패합니다.
- 정상 경로와 failure 경로가 갈라지는 조건: same-UID socket entry는 unlink 후 bind가 성공하고 exit에서 새 path도 제거됩니다. regular file은 non-socket이라 보존되고 process는 clean failure합니다. valid PID만 있고 expected server endpoint가 없으면 client가 target을 protocol server로 인정하지 않습니다.
- 후속 commit이 강화하거나 교체하는 부분: `4e1c84bfacfc`가 path/object authority와 별개인 descriptor representation boundary를 추가합니다.

#### Test commit 분석 기록

- **대상 production invariant:** replaceable same-UID stale socket만 제거하고 non-socket/unowned entry는 보존합니다.
- **재현하는 failure 또는 boundary:** predictable path를 근거로 regular file 또는 다른 endpoint를 destructive cleanup하는 상황
- **사용한 test technique:** real filesystem objects, PID-derived names, child exec, live processes
- **분류:** runtime/filesystem integration regression
- **failure 주입 또는 process orchestration 시작 지점:** helper가 실제 PID를 유지한 채 target role path에 socket 또는 regular file을 배치합니다.
- **production code에 진입하는 최초 호출:** client/server initialization의 `mt_response_path`와 `remove_stale_socket`입니다.
- **핵심 assertion과 관측값:** stale socket replacement success, regular file existence 유지와 startup failure, runtime dir 0700/current UID, missing server endpoint rejection, cleanup 후 path 부재를 검사합니다.
- **증명하는 것:** stale replacement<br>regular-file preservation<br>private permissions<br>missing endpoint rejection<br>cleanup symmetry
- **증명하지 않는 것:** same-UID cryptographic authentication<br>high descriptor behavior<br>모든 crash/rename race<br>cross-host portability
- **후속 변경에서 막아야 할 구체적인 회귀:** computed name만으로 object를 삭제하거나 non-server PID를 valid peer로 인정하는 변경을 막습니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] same-UID stale socket replacement
- [x] regular-file/unowned object preservation
- [x] private runtime directory mode/owner
- [x] PID만 존재하는 non-server rejection
- [x] normal cleanup symmetry

**아직 보장하지 않는 것**

- [x] same-UID authentication
- [x] high-fd guard
- [x] 모든 TOCTOU/crash window
- [x] 다른 UID namespace scenario 전체

#### 코드 증거 기록

- 파일 경로: `tests/protocol_regressions.sh`, `tests/stale_exec.c`, `src/response_channel.c`, `src/client.c`, `src/server.c`
- symbol 또는 함수: `stale_exec helper`, `remove_stale_socket`, `bind_client_socket`, `prepare_response_channel`
- 확인한 state fields: `runtime path object type/uid/mode`, `child PID`, `bound flags`
- caller → callee: test helper/filesystem setup → real client/server endpoint setup → production stale/type/bind/cleanup branches
- 핵심 branch 또는 mutation 순서: private runtime dir 준비/검사 → child PID 확보 → 해당 role path에 stale socket 또는 regular file 생성 → real client/server 실행 → status/output/object existence 검사 → child/socket/file cleanup입니다. unrelated live PID에는 server path가 없어 client가 protocol 시작 전에 실패합니다.
- parent 또는 이전 관련 SHA와의 diff 요약: runtime integration helper와 stale/protected object scenarios가 test target에 추가됐습니다.
- 삽입할 최소 코드 조각과 선택 이유: 표와 호출 순서만으로 invariant가 충분히 드러나므로 코드 덤프를 추가하지 않았습니다.
- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`4e1c84bfacfc`에서 endpoint descriptor의 polling representability를 추가합니다.
### 6. `4e1c84bfacfc` — fix(runtime): select 범위를 벗어난 descriptor 거부

- **Importance:** A
- **Tags:** EDGE, PRACTICAL, RISK
- **Thread 내 역할:** client response socket, server response socket, self-pipe read fd가 `FD_SETSIZE` 이상이면 initialization에서 거부합니다.

#### 원문에서 확정된 맥락

`fd_set`은 fixed-size bit representation이므로 large descriptor의 `FD_SET`은 undefined behavior를 일으킬 수 있습니다. valid fd와 selected polling API representability를 구분합니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] client response socket guard
- [x] server response socket guard
- [x] self-pipe read fd guard
- [x] 모든 `FD_SET`/`pselect` 이전 실행
- [x] guard failure의 existing cleanup path
- [x] write-only pipe end가 guard 대상이 아닌 이유

#### 비교 기준

endpoint setup commits의 `FD_SET` call sites를 역추적해 실제 read set에 들어가는 세 descriptor만 creation 단계에서 guard합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: socket/pipe open 성공만 확인했고 later `FD_SET`이 그 integer를 표현할 수 있는지는 검사하지 않았습니다. inherited descriptor pressure가 새 fd를 높은 번호로 밀 수 있습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: `fd >= FD_SETSIZE`인 valid descriptor를 `FD_SET`에 전달하면 fixed bitset 범위 밖 memory를 접근할 수 있습니다. protocol error가 아니라 local undefined behavior입니다.
- 변경된 decision과 state mutation 순서: resource 생성 직후, flags/bind/`FD_SET`보다 먼저 client response socket, server event-pipe read end, server response socket을 각각 `FD_SETSIZE`와 비교해 실패하도록 했습니다. client: `socket` → `fd < FD_SETSIZE` → flags → bind. server: `pipe` → read fd range check → flags; response `socket` → range check → flags/bind. failure는 기존 cleanup path가 열린 fd와 bound path state를 unwind합니다.
- 정상 경로와 failure 경로가 갈라지는 조건: fd가 음수이면 ordinary allocation failure, 범위 이상이면 controlled initialization failure입니다. write-only self-pipe end는 `FD_SET`에 들어가지 않으므로 range guard 대상이 아닙니다.
- 후속 commit이 강화하거나 교체하는 부분: `1de95310195d`가 `/dev/null`을 실제로 반복 open한 뒤 exec하여 client/server가 polling 전에 안전하게 실패하는지 검증합니다.

#### Fix 연결 기록

| 단계 | Source에서 확정된 내용 | 해당 SHA의 코드 근거 |
| --- | --- | --- |
| 기존 가정 | open에 성공한 descriptor는 `FD_SET`에 넣을 수 있습니다. | 직전 setup은 `fd == -1`만 확인한 뒤 later `FD_SET`을 수행했습니다. |
| 실제 failure 또는 위험 | `fd >= FD_SETSIZE`면 fixed object 밖에 bit를 쓸 수 있습니다. | client/server event loops가 `fd_set`과 `pselect`를 사용합니다. |
| root cause | OS fd validity와 polling representation range를 혼동했습니다. | 새 branch는 allocation success와 별개로 numeric upper bound를 검사합니다. |
| 수정 invariant/decision | polling descriptor는 resource creation 단계에서 range-check합니다. | client socket, server pipe read end, server socket의 three guards |
| regression | `1de95310195d`가 real inherited descriptor table로 경계를 만듭니다. | `tests/high_fd_exec.c`, `tests/high_fd.sh` |

- 변경 전 failure를 재현하거나 추론할 수 있는 입력/상태: 직전 상태와 해당 분기를 직접 비교했습니다.
- root cause가 드러나는 field 또는 call order: client: `socket` → `fd < FD_SETSIZE` → flags → bind. server: `pipe` → read fd range check → flags; response `socket` → range check → flags/bind. failure는 기존 cleanup path가 열린 fd와 bound path state를 unwind합니다.
- 수정된 invariant를 고정하는 후속 regression test: `1de95310195d`의 environmental boundary integration regression입니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] out-of-range fd controlled startup failure
- [x] out-of-bounds `FD_SET` prevention
- [x] valid fd와 polling-representable fd 구분

**아직 보장하지 않는 것**

- [x] dynamic polling support
- [x] descriptor pressure 해소
- [x] range 내부 exhaustion
- [x] poll/epoll portability

#### 코드 증거 기록

- 파일 경로: `src/client.c`, `src/server.c`
- symbol 또는 함수: `bind_client_socket`, `prepare_response_channel`
- 확인한 state fields: `g_response_socket`, `g_event_pipe[0]`
- caller → callee: resource allocation → immediate range guard → flags/bind → later `FD_SET`/`pselect`
- 핵심 branch 또는 mutation 순서: client: `socket` → `fd < FD_SETSIZE` → flags → bind. server: `pipe` → read fd range check → flags; response `socket` → range check → flags/bind. failure는 기존 cleanup path가 열린 fd와 bound path state를 unwind합니다.
- parent 또는 이전 관련 SHA와의 diff 요약: 세 allocation condition에 `fd >= FD_SETSIZE` branch가 추가됐습니다.
- 삽입한 최소 코드 조각과 선택 이유: SHA `4e1c84bfacfc`, client/server socket setup에 동일하게 추가된 guard입니다. open success와 `fd_set` representability가 별도 조건임을 보여 줍니다.

```c
g_response_socket = socket(AF_UNIX, SOCK_DGRAM, 0);
if (g_response_socket == -1
    || g_response_socket >= FD_SETSIZE
    || set_nonblocking_close_on_exec(g_response_socket) == -1)
    return (-1);
```

- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

#### 다음 연결

`1de95310195d`에서 real descriptors로 client/server guards를 실행합니다.
### 7. `1de95310195d` — test(runtime): 높은 descriptor 번호의 안전한 실패 검증

- **Importance:** A
- **Tags:** TEST, EDGE, RISK
- **Thread 내 역할:** wrapper가 `/dev/null`을 반복 open해 inherited descriptor table을 `FD_SETSIZE` boundary까지 높인 뒤 real client/server를 `exec`합니다.

#### 원문에서 확정된 맥락

두 executable은 `pselect`나 protocol traffic 전에 normal diagnostic으로 실패해야 합니다. high-fd client failure는 independently running server에 영향을 주지 않아야 합니다.

> 아래 기록은 이 SHA의 tree와 diff에서 확인했습니다. 후속 HEAD의 구현을 이 시점의 보장으로 소급하지 않았습니다.

#### 해당 SHA에서 확인한 코드

- [x] `/dev/null` open loop와 target boundary
- [x] descriptors를 close하지 않고 `exec`
- [x] real client/server guard cases
- [x] server no-PID-publication assertion
- [x] client no protocol traffic/normal failure
- [x] independent server unaffected assertion
- [x] wrapper/child cleanup

#### 비교 기준

`4e1c84bfacfc`의 three guards 중 allocation order에 따라 client socket 또는 server self-pipe read/response socket이 boundary를 넘는 case를 매핑합니다.

#### A-level 설계 및 failure 기록

- 이 commit 직전의 관련 state와 caller/callee: numeric guards는 code에 있었지만 synthetic integer가 아니라 kernel이 실제 할당한 high fd에서 client/server cleanup과 peer isolation까지 검증되지 않았습니다.
- 기존 설계가 충분하지 않았던 구체적인 이유: 직접 fd 값을 주입하는 unit test는 open table inheritance, exec, new pipe/socket allocation order, real cleanup behavior를 재현하지 못합니다.
- 변경된 decision과 state mutation 순서: `tests/high_fd_exec.c`가 `/dev/null`을 반복 open해 descriptors를 유지한 채 target executable을 `exec`하고, shell이 client와 server cases를 별도로 관측합니다. wrapper starts → low descriptors부터 `/dev/null`을 open해 next allocation을 boundary로 이동 → target client/server exec → production socket/pipe creation → range guard failure → normal diagnostic/status/cleanup. client case에서는 별도 정상 server를 유지해 그 process가 영향받지 않았는지 확인합니다.
- 정상 경로와 failure 경로가 갈라지는 조건: server는 response pipe/socket 중 guard가 실패해 PID를 publish하지 않고 종료합니다. client는 response socket guard에서 protocol datagram/signal을 보내기 전에 실패합니다. wrapper 또는 target setup failure도 nonzero status로 수집됩니다.
- 후속 commit이 강화하거나 교체하는 부분: 이 commit이 Thread final regression입니다. polling API를 바꾸지 않는 한 range guard와 test가 함께 유지돼야 합니다.

#### Test commit 분석 기록

- **대상 production invariant:** `fd_set`에 들어가는 descriptors는 모두 `FD_SETSIZE` 미만입니다.
- **재현하는 failure 또는 boundary:** inherited descriptor pressure로 new socket/pipe가 unrepresentable range에 할당되는 상황
- **사용한 test technique:** real `/dev/null` allocations retained across `exec`
- **분류:** environmental boundary integration regression
- **failure 주입 또는 process orchestration 시작 지점:** wrapper가 `FD_SETSIZE` 직전까지 real descriptors를 연속 open합니다.
- **production code에 진입하는 최초 호출:** exec된 client/server가 response socket 또는 event pipe를 생성하면서 production guard에 진입합니다.
- **핵심 assertion과 관측값:** nonzero normal failure, expected diagnostics, server PID 미출력, client protocol traffic 부재, independent server 생존과 cleanup을 검사합니다.
- **증명하는 것:** real high-fd allocation<br>pre-`FD_SET` failure<br>client/server guards<br>unrelated server unaffected
- **증명하지 않는 것:** 모든 descriptor leak 부재<br>poll/epoll behavior<br>range-inside resource exhaustion<br>모든 launcher fd layout
- **후속 변경에서 막아야 할 구체적인 회귀:** guard를 `FD_SET` 뒤로 옮기거나 일부 polling fd를 빠뜨리는 변경을 막습니다.

#### 보장 범위

**이 commit이 보장하는 것**

- [x] real high-fd condition 생성
- [x] polling 전에 controlled failure
- [x] client/server range guards
- [x] high-fd client failure의 peer isolation

**아직 보장하지 않는 것**

- [x] descriptor leak 전수 검증
- [x] dynamic polling support
- [x] range 안에서의 exhaustion
- [x] 다른 OS의 `FD_SETSIZE` 설정 전체

#### 코드 증거 기록

- 파일 경로: `tests/high_fd_exec.c`, `tests/high_fd.sh`, `Makefile`, `src/client.c`, `src/server.c`
- symbol 또는 함수: `high_fd_exec main`, `bind_client_socket`, `prepare_response_channel`
- 확인한 state fields: `inherited open descriptor table`, `target mode`, `child/server PID`
- caller → callee: shell → `high_fd_exec` open loop → `exec` real binary → production allocation/range guard
- 핵심 branch 또는 mutation 순서: wrapper starts → low descriptors부터 `/dev/null`을 open해 next allocation을 boundary로 이동 → target client/server exec → production socket/pipe creation → range guard failure → normal diagnostic/status/cleanup. client case에서는 별도 정상 server를 유지해 그 process가 영향받지 않았는지 확인합니다.
- parent 또는 이전 관련 SHA와의 diff 요약: high-fd wrapper binary, shell orchestration와 test target이 추가됐습니다.
- 삽입할 최소 코드 조각과 선택 이유: 표와 호출 순서만으로 invariant가 충분히 드러나므로 코드 덤프를 추가하지 않았습니다.
- 직접 실행한 command 또는 test와 결과: 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

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
| `2c37cb592d05` | per-UID private runtime directory와 role/PID-derived Unix socket path helper를 정의합니다. | validated per-UID directory와 role/PID-derived path가 생기지만 path knowledge는 resource ownership이 아닙니다. | `src/response_channel.c: mt_runtime_dir`, `mt_response_path` | 도입 |
| `25780b881ee8` | client가 nonblocking, close-on-exec datagram socket을 PID-derived path에 bind하고 invocation lifetime에 맞춰 cleanup합니다. | descriptor와 computed path를 client lifetime state로 보관하지만 unlink authority가 bind success와 아직 분리되지 않았습니다. | `src/client.c: bind_client_socket`, `cleanup_response_socket` | 도입·부족 |
| `32390dcdfc1b` | server가 long-lived nonblocking, close-on-exec datagram endpoint를 server path에 bind하고 normal exit와 rollback에서 cleanup합니다. | server는 successful bind를 `g_server_bound`로 기록해 close/unlink를 acquisition과 대칭시킵니다. | `src/server.c: prepare_response_channel`, `cleanup_server` | 도입 |
| `622d80020fb2` | client cleanup이 response path를 실제 `bind`한 경우에만 unlink하도록 bound ownership flag를 사용합니다. | computed path와 actual bound ownership을 `g_client_bound`로 분리해 conditional unlink합니다. | `src/client.c: g_client_bound`, bind/cleanup branches | 수정 |
| `ffd3647a1518` | real PID-derived paths에 stale client/server sockets, regular files, unrelated live processes를 만들어 endpoint trust와 cleanup policy를 검증합니다. | 실제 filesystem object와 process identity로 stale replacement와 protected-entry preservation을 검증합니다. | `tests/stale_exec.c`, protocol regression shell scenarios | 검증 |
| `4e1c84bfacfc` | client response socket, server response socket, self-pipe read fd가 `FD_SETSIZE` 이상이면 initialization에서 거부합니다. | `fd_set`에 등록될 resource는 allocation 직후 `fd < FD_SETSIZE`를 만족해야 합니다. | `src/client.c: bind_client_socket`, `src/server.c: prepare_response_channel` | 수정 |
| `1de95310195d` | wrapper가 `/dev/null`을 반복 open해 inherited descriptor table을 `FD_SETSIZE` boundary까지 높인 뒤 real client/server를 `exec`합니다. | real inherited descriptor pressure에서 client/server가 `FD_SET` 전에 controlled failure하는지 고정합니다. | `tests/high_fd_exec.c`, `tests/high_fd.sh` | 검증 |

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 상태 | 실제 failure/위험 | Fix 또는 전환 commit | 수정된 decision/invariant | Test 또는 후속 검증 | 학습자 code evidence |
| --- | --- | --- | --- | --- | --- |
| PID-derived path를 계산하면 cleanup authority가 있다고 간주 | bind failure 뒤 existing/unowned entry를 unlink할 수 있음 | `622d80020fb2` | successful bind를 ownership flag로 기록하고 그때만 unlink | `ffd3647a1518` | regular file preservation/stale socket replacement |
| descriptor open success면 `FD_SET` 가능 | `fd >= FD_SETSIZE`에서 fixed bitset 밖 memory write 가능 | `4e1c84bfacfc` | polling descriptor를 creation 단계에서 range-check | `1de95310195d` | real inherited high-fd wrapper와 pre-poll failure |

전용 test commit이 없는 연결에는 존재하지 않는 test를 만들어 적지 않았습니다.

## 8. Ownership / state / responsibility 변화

| 단계 | state 또는 responsibility owner | transition | 당시 한계 또는 다음 변화 | 실제 symbol/field |
| --- | --- | --- | --- | --- |
| path helper | runtime namespace policy | role/PID → validated path | 계산만으로 ownership 없음 | `mt_runtime_dir`, `mt_response_path` |
| client/server setup | descriptor + bind state | open/configure/bind 단계별 acquisition | partial unwind 필요 | response fd/path/bound flags |
| client fix | `g_client_bound` | bind success 때 unlink authority 획득 | computed path와 ownership 분리 | bind success assignment, conditional cleanup |
| polling setup | `fd_set` representation | range 안 descriptor만 registration | 범위 밖 startup failure | client/server response fd, self-pipe read fd |

## 9. Thread 최종 상태

Source에서 확정된 최종 조건:

- response endpoints는 private per-UID runtime directory의 validated PID-derived paths를 사용합니다.
- same-UID stale socket은 policy에 따라 replace하지만 non-socket과 unowned entry는 삭제하지 않습니다.
- cleanup은 actual resource-acquisition state와 대칭입니다.
- response sockets와 self-pipe read fd가 `FD_SETSIZE` 범위를 넘으면 polling 전에 실패합니다.

학습자 기록:

- 최종 state fields와 owner: client는 response descriptor/path/`g_client_bound`, server는 response descriptor/path/`g_server_bound`와 event pipe를 소유합니다. runtime helpers는 path만 계산하며 ownership을 부여하지 않습니다.
- 정상 transition 순서: private runtime directory 검증 → role/PID path 생성 → stale object type/UID 판정 → socket/pipe 생성과 flags → polling fd range check → bind 성공과 bound flag → event loop → close와 conditional unlink입니다.
- 실패 시 중단·reset·cleanup 순서: validation/stale/flags/range/bind 단계의 failure는 이미 획득한 descriptors를 닫고, successful bind를 기록한 path만 unlink합니다. protected/unowned object는 보존합니다.
- 최종 상태가 보장하지 않는 것: same-UID malicious peer authentication, TOCTOU 완전 제거, dynamic polling, descriptor pressure 자체의 해소는 제공하지 않습니다.
- 이 Thread를 한 문단으로 설명한 최종 서술: 이 Thread는 Unix socket path를 단순 문자열이 아니라 filesystem resource로 취급합니다. private per-UID directory와 role/PID validation을 정의하고, client/server의 socket·path lifetime을 단계별로 관리합니다. client fix는 computed name과 successful bind ownership을 분리하며, 마지막 guard는 valid descriptor도 `fd_set` 범위 밖이면 사용할 수 없음을 controlled startup failure로 바꿉니다.

## 10. 최종 architecture 또는 execution flow 정리

- [x] runtime directory create 또는 existing directory validation
- [x] role/PID path derivation과 length check
- [x] socket create와 nonblocking/CLOEXEC setup
- [x] existing path type/owner/staleness 판정
- [x] bind success와 ownership flag record
- [x] `FD_SETSIZE` check 뒤 `FD_SET`/`pselect`
- [x] normal exit 또는 rollback에서 close와 conditional unlink

```text
endpoint setup
    -> mt_runtime_dir: mkdir 0700 / validate dir+uid+mode
    -> mt_response_path: role+positive PID+length
    -> inspect existing path
        -> same-UID socket: remove as stale
        -> non-socket/other owner: fail and preserve
    -> socket/pipe allocation
    -> fd < FD_SETSIZE for every later fd_set member
    -> O_NONBLOCK / FD_CLOEXEC
    -> bind -> bound flag = 1
    -> pselect registration/use
cleanup/rollback
    -> close owned descriptors
    -> unlink only if successful bind ownership is recorded

```

- 실제 함수·파일을 반영한 완성 흐름: `src/response_channel.c`의 namespace helpers, `src/client.c: bind_client_socket/cleanup_response_socket`, `src/server.c: prepare_response_channel/cleanup_server`가 전체 lifecycle을 구성합니다.
- asynchronous boundary: endpoint acquisition/cleanup은 normal context에서만 일어나며 signal handler는 path·socket cleanup을 수행하지 않습니다.
- externally visible commit point: filesystem endpoint ownership은 successful `bind` 직후 bound flag를 설정할 때 생깁니다. path 계산이나 socket descriptor creation만으로는 unlink authority가 없습니다.
- cleanup owner: 각 process의 registered cleanup이 자신이 연 descriptor를 닫고 실제 bind한 endpoint만 unlink합니다.

## 11. 학습 완료 자가 점검

- [x] commit map의 7개 SHA를 source 순서대로 모두 설명할 수 있습니다.
- [x] 각 code excerpt에 SHA, path, symbol, 선택 이유가 기록돼 있습니다.
- [x] final HEAD 코드를 historical SHA의 증거로 사용한 곳이 없습니다.
- [x] 정상 경로와 failure path를 state mutation 순서로 설명할 수 있습니다.
- [x] source 확정 invariant와 직접 확인한 code evidence를 구분했습니다.
- [x] test commit의 invariant, failure, technique, production path, proves/not-proves를 기록했습니다.
- [x] Thread final state를 함수와 state field 수준으로 설명할 수 있습니다.
- [ ] 해당 SHA의 test를 로컬에서 직접 실행했습니다. — 실행하지 않음. 이 환경에서는 GitHub 저장소를 로컬 checkout할 수 없어 해당 SHA의 tree와 diff를 GitHub connector로 검토했습니다. 따라서 아래의 test 결과는 test code가 요구하는 관측값이며, 이 세션에서 실제 실행해 얻은 결과가 아닙니다.

### 이 Thread와 직접 연결된 Major Engineering Difficulties

- socket path가 crash 뒤 남을 수 있어 stale recovery와 destructive cleanup을 구분해야 합니다.
- same-UID integrity boundary는 same-UID peer authentication이 아닙니다.
- inherited descriptor pressure가 ordinary socket/pipe allocation을 polling range 밖으로 밀 수 있습니다.
