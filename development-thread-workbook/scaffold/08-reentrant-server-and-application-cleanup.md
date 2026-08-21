# Thread 08 — Reentrant server and application cleanup

부제: 재진입 가능한 서버와 애플리케이션 정리

## 1. Thread 목표

callback, interest update, response enqueue가 현재 처리 중인 connection과 application aggregate를 동기적으로 제거할 수 있다는 사실을 중심으로, descriptor relookup·rollback·failure propagation·command continuation 중단 invariant를 fix/test 쌍으로 복원합니다.

Source에서 확정된 significance:

> The difficult integration problem is that a seemingly local send or callback can synchronously remove the connection, client record, memberships, and possibly the channel currently referenced by the caller. The server fix restores descriptor and event-registry ownership; the application fix generalizes the rule to domain state. The follow-up commit and test refine the chosen semantics: earlier mutations are not rolled back transactionally, but command processing must stop immediately after the actor's lifecycle ends.

이 문서의 source-confirmed 문장은 학습 방향을 고정하기 위한 출발점입니다. 실제 함수 동작, ownership, branch, 실행 결과는 반드시 각 SHA 코드와 test를 직접 확인해 채웁니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 초기 erase-before-callback cleanup은 무엇을 보장하고 무엇을 아직 보장하지 않는가?
- callback self-disconnect 뒤 raw pointer/reference가 왜 즉시 위험해지는가?
- accept/listener registration failure에서 map, event backend, fd lifetime을 어떻게 rollback하는가?
- `sendTo()` failure가 application client/index/membership/channel erase로 이어지는 synchronous call stack은 무엇인가?
- send 뒤 언제 return하고 언제 stable id로 re-resolve해야 하는가?
- compound MODE의 부분 완료를 rollback하지 않으면서 후속 transition을 막는 semantics는 무엇인가?

### Source와 직접 연결되는 invariant

- callback, interest update, response enqueue 뒤에는 이전 `Connection`, client, channel, pointer, reference, iterator를 재사용하지 않고 필요한 state를 다시 resolve해야 합니다.
- connection map, event-manager registration, descriptor lifetime은 함께 advance하거나 함께 teardown되어야 합니다.
- output failure로 actor lifecycle이 끝나면 이전 mutation을 rollback하지 않더라도 이후 command transition은 실행하지 않아야 합니다.

### Source와 직접 연결되는 engineering difficulty

- single-threaded code에서도 external callback이 current owner를 동기적으로 지우는 reentrancy lifetime 문제.
- send처럼 보이는 local side effect가 disconnect callback과 channel erase까지 일으키는 cross-layer invalidation 문제.
- rare add/update failure와 exact continuation point를 fake backend/limits로 deterministic하게 만드는 문제.

## 3. 완료 기준

- 7a6bc7e1276a의 cleanup ordering을 baseline으로 기록했습니다.
- 5dcd882f0763에서 모든 callback/registration/update failure boundary의 fd-based relookup과 rollback을 설명할 수 있습니다.
- 928594ec160c의 five failure contracts와 fake backend injection path를 구분했습니다.
- 728aaabc4012의 cross-layer send-failure invalidation rule을 command별 stable copy/relookup으로 복원했습니다.
- d48e1f1f8c04/aee5edebe294의 non-transactional stop-after-failure semantics를 실제 state assertions로 설명할 수 있습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | 원문 확정 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `7a6bc7e1276a` | `feat(server): 연결 해제와 오류 정리 구현` | A | LIFECYCLE, RISK | Establishes the original erase-before-disconnect-callback cleanup path. |
| 2 | `5dcd882f0763` | `fix(server): 연결 콜백 수명과 이벤트 등록 롤백 보장` | S | DEBUG, LIFECYCLE, RISK | Handles callbacks that remove their own connection and rolls back event registration failures. |
| 3 | `928594ec160c` | `test(server): 연결 제거와 이벤트 등록 실패 경로 검증` | A | VERIFICATION, LIFECYCLE, RISK | Injects add/update failures and callback-driven removal to verify server lifetime safety. |
| 4 | `728aaabc4012` | `fix(app): 응답 실패 뒤 클라이언트 상태 다시 확인` | S | DEBUG, LIFECYCLE, RISK | Propagates output failure and requires application state to be re-resolved after any send that can disconnect. |
| 5 | `5edcafda8a4d` | `test(app): 작은 송신 한도에서 상태 정리 검증` | A | VERIFICATION, LIFECYCLE, RISK | Forces registration response failure and proves application cleanup and logging order. |
| 6 | `d48e1f1f8c04` | `fix(app): 응답 실패 뒤 명령 처리를 중단` | A | DEBUG, LIFECYCLE, RISK | Stops LIST, NAMES, and compound MODE after response failure. |
| 7 | `aee5edebe294` | `test(app): 연결 정리 뒤 모드 변경 중단 검증` | A | VERIFICATION, LIFECYCLE, CHANNEL_STATE | Proves a compound MODE retains completed work but performs no later transition after sender removal. |

Commit 순서는 source에 정의된 순서입니다. 이 문서 안에서 재정렬하지 않습니다.

## 5. Commit별 학습 기록

각 commit에서 final HEAD를 보지 말고 해당 SHA의 tree와 필요한 parent/직전 관련 SHA만 확인합니다. 아래의 implementation anchor는 source에서 확정된 내용이며, code evidence 칸은 학습자가 직접 채웁니다.

### 5.1 `7a6bc7e1276a` — `feat(server): 연결 해제와 오류 정리 구현`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | LIFECYCLE, RISK |
| 원문 확정 역할 | Establishes the original erase-before-disconnect-callback cleanup path. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 thread에서는 후속 reentrancy fix가 수정할 초기 erase-before-callback baseline으로 봅니다.

#### Source에서 확정된 implementation anchor

- `disconnect()`는 event 등록 제거를 시도한 뒤 `Connection`을 map 밖 local `unique_ptr`로 옮기고 entry를 erase한 다음 callback을 호출합니다.
- erase-before-callback 때문에 recursive lookup/repeated disconnect는 이미 제거된 상태를 관찰합니다.
- hangup은 pending output이 없을 때 terminal이며 bulk shutdown은 fd key snapshot으로 iterator invalidation을 피합니다.

Source가 이름을 명시한 확인 대상:

- `disconnect()`, `Connection`, `unique_ptr`

#### 해당 SHA에서 확인할 코드

- `disconnect(fd, reason)`의 event removal, ownership move, map erase, callback, descriptor destruction 순서를 한 줄씩 추적합니다.
- callback 중 같은 fd를 다시 lookup/disconnect했을 때 map과 local `unique_ptr`가 어떤 상태인지 확인합니다.
- backend remove failure와 disconnect callback exception이 report되면서도 object destruction을 막지 않는 catch 경로를 확인합니다.
- hangup + pending output 조합이 write-drain 경로를 거치는 조건을 찾습니다.
- bulk connection cleanup에서 key snapshot을 만드는 이유와 listener unregister/close의 멱등성을 실제 loop로 확인합니다.

비교 기준:

- 기본 비교: `7a6bc7e1276a^` → `7a6bc7e1276a`
- 이 초기 cleanup 계약은 후속 server/app reentrancy fix의 출발점입니다.

Source가 지목한 failure/risk 출발점:

> callback 전에 map entry를 유지하면 재진입이 동일 객체를 다시 조작할 수 있고, map iteration 중 erase하면 iterator가 무효화됩니다.

#### Commit 학습 기록

| 학습 항목 | 학습자 기록 |
| --- | --- |
| 직전 경계/상태 | [이 commit 전 subsystem이 제공하던 것] |
| 주요 문제와 설계 판단 | [왜 이 layer에서 처리했는지] |
| 핵심 코드 증거 | [path, symbol, caller/callee] |
| state / ownership 변화 | [mutation·lifetime 순서] |
| failure 또는 boundary | [해당 branch와 outcome] |
| 보장 / 비보장 | [각각 코드에 근거해 분리] |
| 다음 관련 commit | [무엇을 구현·검증·수정하는지] |
| 학습자의 설명 | [subsystem 관점으로 정리] |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| 7a6bc7e1276a | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 7a6bc7e1276a^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `5dcd882f0763` — `fix(server): 연결 콜백 수명과 이벤트 등록 롤백 보장`. 원문 역할은 “Handles callbacks that remove their own connection and rolls back event registration failures.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.2 `5dcd882f0763` — `fix(server): 연결 콜백 수명과 이벤트 등록 롤백 보장`

| 항목 | 값 |
| --- | --- |
| Importance | S |
| Tags | DEBUG, LIFECYCLE, RISK |
| 원문 확정 역할 | Handles callbacks that remove their own connection and rolls back event registration failures. |
| 학습 깊이 | 프로젝트 핵심 architecture/invariant로 취급합니다. 직전 상태, failure 가능성, 핵심 결정, 실제 코드, ownership/lifecycle/state transition, 후속 fix/test까지 깊게 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Reentrant server and application cleanup` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- Server는 callback 전후에 raw pointer/reference를 유지하지 않고 fd로 Connection을 다시 lookup합니다.
- accepted Connection을 map에 먼저 insert하고 event registration 실패 시 map erase로 RAII close하며 listener registration도 rollback합니다.
- `refreshInterest(fd)`는 현재 ownership을 다시 확인하고 update failure를 report한 뒤 ordinary disconnect로 수렴합니다.
- error reporting은 `noexcept`이며 error callback exception을 containment합니다.

Source가 이름을 명시한 확인 대상:

- `disconnect()`, `Connection*`, `Connection`, `addFd()`, `updateFd()`, `sendTo()`, `queueRawTo()`, `noexcept`

#### 해당 SHA에서 확인할 코드

- parent SHA의 connect/line callback 주변 raw pointer/reference 보존 코드와 새 fd-based relookup을 diff로 비교합니다.
- accept transition에서 raw fd → Connection → map insert → event add → callback 순서와 add failure rollback을 정확히 기록합니다.
- duplicate accepted descriptor가 logic error로 처리되는 branch와 기존 entry를 덮어쓰지 않는지 확인합니다.
- listener startup에서 event add 실패 시 listener close, event-manager state discard, rethrow 순서를 추적합니다.
- `refreshInterest(fd)`가 connection not found/update success/update failure에서 무엇을 반환하고 caller가 어떻게 반응하는지 확인합니다.
- send/queue path가 update failure를 caller에 false로 알리고 cleanup을 끝내는지 확인합니다.
- connect/line/disconnect/error callback이 self-disconnect하거나 throw해도 이후 stale object access가 없는지 모든 callback boundary를 검색합니다.

비교 기준:

- 기본 비교: `5dcd882f0763^` → `5dcd882f0763`
- Thread 직전 관련 SHA: `7a6bc7e1276a` — `feat(server): 연결 해제와 오류 정리 구현`
- 원래 cleanup `7a6bc7e1276a`와 accept integration `4ad1227e5119`의 가정을 함께 비교합니다.

Source가 지목한 failure/risk 출발점:

> single-threaded loop라도 callback이 동기적으로 current Connection을 erase하면 retained pointer는 즉시 dangling이 되고, event add/update 실패는 map과 backend를 분리합니다.

#### Failure → root cause → fix → test 기록

| Fix 추적 항목 | 기록 |
| --- | --- |
| 기존 가정 | single-threaded callback 동안 현재 Connection reference가 유지되고 event add/update failure는 부분 상태를 남기지 않는다는 가정 |
| 실제 failure 또는 위험 | single-threaded loop라도 callback이 동기적으로 current Connection을 erase하면 retained pointer는 즉시 dangling이 되고, event add/update 실패는 map과 backend를 분리합니다. |
| root cause | external callback이 동기 self-disconnect할 수 있고 map/event registration은 별도 단계에서 실패할 수 있음 |
| 수정된 invariant / decision | fd identity로 callback 뒤 relookup하고 map/event/fd transition은 rollback 또는 ordinary disconnect로 함께 수렴함 |
| 실제 수정 코드 | [parent/current diff의 path, symbol, branch, mutation 순서] |
| cleanup / failure propagation | [실패가 어느 owner와 callback을 거쳐 수렴하는지] |
| regression test 연결 | `928594ec160c`의 fake event-manager five failure contracts |
| fix가 보장하는 것 | [코드와 test가 직접 입증하는 범위] |
| fix가 보장하지 않는 것 | [transactionality, fairness, 다른 layer 등 미보장 범위] |
| 학습자의 root-cause 설명 | [증상 → 원인 → 수정 → 검증을 직접 작성] |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| 5dcd882f0763 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 5dcd882f0763^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `928594ec160c` — `test(server): 연결 제거와 이벤트 등록 실패 경로 검증`. 원문 역할은 “Injects add/update failures and callback-driven removal to verify server lifetime safety.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.3 `928594ec160c` — `test(server): 연결 제거와 이벤트 등록 실패 경로 검증`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | VERIFICATION, LIFECYCLE, RISK |
| 원문 확정 역할 | Injects add/update failures and callback-driven removal to verify server lifetime safety. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 thread에서는 server map/event/fd lifecycle fix의 직접 regression evidence로 봅니다.

#### Source에서 확정된 implementation anchor

- injectable `FakeEventManager`는 interest 기록, next add/update failure, selected readable event delivery를 제공합니다.
- suite는 accept 후 add failure rollback, connect/line callback self-disconnect+throw, error handler throw containment, write-interest update failure cleanup, queue-limit immediate close를 검증합니다.
- real loopback clients를 사용하지만 host epoll/kqueue timing에는 의존하지 않습니다.

Source가 이름을 명시한 확인 대상:

- `FakeEventManager`, `accept()`, `sendTo()`

#### 해당 SHA에서 확인할 코드

- fake backend interface가 production `EventManager` contract를 어떻게 구현하고 failure flag를 언제 소비하는지 확인합니다.
- add failure case에서 server map, fake registrations, client socket EOF/close 상태를 어떤 assertion으로 확인하는지 기록합니다.
- connect/line callback이 같은 fd를 disconnect한 뒤 throw하도록 구성하는 코드와 server가 crash/stale access 없이 돌아오는 assertion을 확인합니다.
- error handler exception containment test가 원래 infrastructure failure를 어떻게 주입하는지 확인합니다.
- update failure 뒤 `sendTo()` false, map removal, fake registration removal을 함께 검증하는지 확인합니다.
- queue limit overflow로 pending bytes가 0인 close request가 즉시 cleanup되는 production path를 연결합니다.

비교 기준:

- 기본 비교: `928594ec160c^` → `928594ec160c`
- Thread 직전 관련 SHA: `5dcd882f0763` — `fix(server): 연결 콜백 수명과 이벤트 등록 롤백 보장`

Source가 지목한 failure/risk 출발점:

> broad integration test로는 callback self-removal과 exact event registration failure 시점을 재현하기 어렵습니다.

#### Test / verification 학습 기록

| 구분 | Source에서 확정된 출발점 | 학습자 코드·실행 기록 |
| --- | --- | --- |
| 대상 production invariant | connection map, event registration, fd lifetime과 callback reentrancy가 함께 수렴하는 Server invariant | [관련 production path와 symbol을 추가] |
| 재현 failure / boundary | accept add failure, connect/line self-disconnect+throw, error-handler throw, update failure, queue-limit immediate close | [입력, state, injected result를 정확히 기록] |
| test technique | injectable FakeEventManager + real loopback clients + selected event/failure delivery | [test double/real socket/process의 구성 증거] |
| 통과하는 production code path | listener/accept → map insert/event add → callback → refresh/update/send → disconnect/RAII cleanup | [caller → callee → branch를 해당 SHA에서 연결] |
| 이 test가 증명하는 것 | 정확히 주입된 server lifecycle failure에서 stale access나 divergent registration 없이 정리됨 | [실행 결과와 assertion 근거] |
| 이 test가 증명하지 않는 것 | native epoll/kqueue timing/flag translation, full IRC application state cleanup | [과장하지 않을 범위] |
| test 성격 | deterministic server-lifetime integration test | [broad/deterministic 판단 근거] |
| 막는 회귀 | use-after-free, leaked fd/map entry, stale event registration, error callback가 cleanup을 중단하는 문제 | [후속 변경에서 깨질 수 있는 invariant] |

실행 기록:

- 실행 SHA: `[확인한 SHA]`
- 실행 환경: `[OS, compiler, sanitizer 또는 Python version 등]`
- 실행 명령: `[실제 명령]`
- 결과: `[pass/fail 및 핵심 assertion]`
- 실패 시 transcript/log: `[최소 재현에 필요한 부분]`
- production 코드와 test 코드의 대응: `[path/symbol 쌍]`


#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| 928594ec160c | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 928594ec160c^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `728aaabc4012` — `fix(app): 응답 실패 뒤 클라이언트 상태 다시 확인`. 원문 역할은 “Propagates output failure and requires application state to be re-resolved after any send that can disconnect.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.4 `728aaabc4012` — `fix(app): 응답 실패 뒤 클라이언트 상태 다시 확인`

| 항목 | 값 |
| --- | --- |
| Importance | S |
| Tags | DEBUG, LIFECYCLE, RISK |
| 원문 확정 역할 | Propagates output failure and requires application state to be re-resolved after any send that can disconnect. |
| 학습 깊이 | 프로젝트 핵심 architecture/invariant로 취급합니다. 직전 상태, failure 가능성, 핵심 결정, 실제 코드, ownership/lifecycle/state transition, 후속 fix/test까지 깊게 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Reentrant server and application cleanup` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- `Server::sendTo()`는 interest refresh failure나 queue rejection 중 target을 동기적으로 disconnect할 수 있습니다.
- response helpers는 success를 반환하고 multi-frame path는 첫 failed enqueue 뒤 중단하거나 client/channel을 다시 lookup합니다.
- JOIN, KICK, PART, NICK, registration, INVITE, heartbeat, TOPIC, NAMES가 stable identifier copy와 post-send revalidation을 적용합니다.
- state mutation은 transactional rollback되지 않지만 failed send 뒤 borrowed object를 계속 사용하지 않는 것이 새 invariant입니다.

Source가 이름을 명시한 확인 대상:

- `Server::sendTo()`

#### 해당 SHA에서 확인할 코드

- response helper signature가 `void`에서 `bool`로 바뀐 전체 call site를 diff로 추적합니다.
- send failure가 disconnect callback → registry erase → channel membership/empty channel erase로 이어지는 synchronous call stack을 그립니다.
- JOIN에서 requested channel/nickname copy, broadcast, client relookup, channel relookup, topic/NAMES 순서를 확인합니다.
- KICK/PART/NICK/INVITE에서 send 전 복사하는 stable values와 send 뒤 다시 찾는 state를 각각 기록합니다.
- registration 001–003이 sequential success일 때만 완료 log를 남기는 조건을 확인합니다.
- heartbeat fields를 PING queue 전에 commit하고 metric은 accepted send 뒤 증가시키는 ordering을 확인합니다.
- NAMES에서 353 failure 시 366을 억제하고 topic/NAMES helper가 channel name을 copy하는지 확인합니다.

비교 기준:

- 기본 비교: `728aaabc4012^` → `728aaabc4012`
- Thread 직전 관련 SHA: `928594ec160c` — `test(server): 연결 제거와 이벤트 등록 실패 경로 검증`
- server fix `5dcd882f0763`이 만든 failure signal을 application state invalidation 규칙으로 확장합니다.

Source가 지목한 failure/risk 출발점:

> output failure 뒤 handler가 client/channel pointer나 iterator를 계속 쓰면 disconnect cleanup이 이미 지운 state를 참조하거나 false lifecycle log를 기록합니다.

#### Failure → root cause → fix → test 기록

| Fix 추적 항목 | 기록 |
| --- | --- |
| 기존 가정 | response enqueue는 application state lifetime을 바꾸지 않는 부수효과라는 가정 |
| 실제 failure 또는 위험 | output failure 뒤 handler가 client/channel pointer나 iterator를 계속 쓰면 disconnect cleanup이 이미 지운 state를 참조하거나 false lifecycle log를 기록합니다. |
| root cause | queue rejection/interest failure가 disconnect callback을 통해 client/index/membership/channel을 동기 삭제함 |
| 수정된 invariant / decision | 모든 potentially destructive send 뒤 return하거나 stable id로 필요한 state를 다시 resolve함 |
| 실제 수정 코드 | [parent/current diff의 path, symbol, branch, mutation 순서] |
| cleanup / failure propagation | [실패가 어느 owner와 callback을 거쳐 수렴하는지] |
| regression test 연결 | `5edcafda8a4d`의 one-byte welcome failure와 후속 `aee5edebe294` |
| fix가 보장하는 것 | [코드와 test가 직접 입증하는 범위] |
| fix가 보장하지 않는 것 | [transactionality, fairness, 다른 layer 등 미보장 범위] |
| 학습자의 root-cause 설명 | [증상 → 원인 → 수정 → 검증을 직접 작성] |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| 728aaabc4012 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 728aaabc4012^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `5edcafda8a4d` — `test(app): 작은 송신 한도에서 상태 정리 검증`. 원문 역할은 “Forces registration response failure and proves application cleanup and logging order.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.5 `5edcafda8a4d` — `test(app): 작은 송신 한도에서 상태 정리 검증`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | VERIFICATION, LIFECYCLE, RISK |
| 원문 확정 역할 | Forces registration response failure and proves application cleanup and logging order. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 thread에서는 send failure가 application lifecycle transition임을 증명하는 직접 regression으로 봅니다.

#### Source에서 확정된 implementation anchor

- real Server와 IrcApplication, controllable event manager, loopback client를 조합하고 `maxPendingBytes=1`로 첫 welcome numeric enqueue를 deterministic하게 실패시킵니다.
- NICK/USER는 registration transition까지 도달하지만 expected result는 client connection/state의 완전한 제거와 server의 지속 실행입니다.
- captured stderr에는 failed welcome 뒤 `client_registered` event가 없어야 합니다.

Source가 이름을 명시한 확인 대상:

- `Server`, `IrcApplication`, `maxPendingBytes`, `client_registered`, `main`

#### 해당 SHA에서 확인할 코드

- one-byte limit이 왜 첫 001 frame보다 작고 socket pressure 없이 queue rejection을 보장하는지 확인합니다.
- test가 PASS/NICK/USER 또는 필요한 등록 입력을 어떻게 공급해 `maybeRegister()`까지 도달시키는지 추적합니다.
- send failure → refresh/close/disconnect callback → application registry/channel cleanup production path를 연결합니다.
- connection count, registry presence, server running state를 어떤 assertion으로 구분하는지 확인합니다.
- stderr capture와 `client_registered` 부재 검사가 state mutation/observability ordering을 어떻게 증명하는지 기록합니다.
- production app sources에서 main만 제외해 test executable을 구성하고 default test/clean에 통합되는지 확인합니다.

비교 기준:

- 기본 비교: `5edcafda8a4d^` → `5edcafda8a4d`
- Thread 직전 관련 SHA: `728aaabc4012` — `fix(app): 응답 실패 뒤 클라이언트 상태 다시 확인`

Source가 지목한 failure/risk 출발점:

> lower-level server test만으로는 application이 cleanup 뒤 welcome sequence와 registration log를 계속 실행하는지 증명할 수 없습니다.

#### Test / verification 학습 기록

| 구분 | Source에서 확정된 출발점 | 학습자 코드·실행 기록 |
| --- | --- | --- |
| 대상 production invariant | response enqueue failure가 client lifecycle을 끝내면 application이 stale state와 false registration observability를 사용하지 않는 invariant | [관련 production path와 symbol을 추가] |
| 재현 failure / boundary | 첫 welcome numeric이 one-byte pending limit에서 deterministic하게 실패함 | [입력, state, injected result를 정확히 기록] |
| test technique | real Server + real IrcApplication + controllable event manager + loopback client + tiny queue limit + stderr capture | [test double/real socket/process의 구성 증거] |
| 통과하는 production code path | NICK/USER → maybeRegister → 001 enqueue failure → Server disconnect → application cleanup → handler return/log suppression | [caller → callee → branch를 해당 SHA에서 연결] |
| 이 test가 증명하는 것 | per-client output failure가 complete cleanup으로 수렴하고 server는 유지되며 `client_registered`가 잘못 기록되지 않음 | [실행 결과와 assertion 근거] |
| 이 test가 증명하지 않는 것 | 모든 channel command continuation과 compound mutation semantics | [과장하지 않을 범위] |
| test 성격 | deterministic application-lifetime regression | [broad/deterministic 판단 근거] |
| 막는 회귀 | failed response 뒤 welcome sequence/log/state access가 계속되는 문제 | [후속 변경에서 깨질 수 있는 invariant] |

실행 기록:

- 실행 SHA: `[확인한 SHA]`
- 실행 환경: `[OS, compiler, sanitizer 또는 Python version 등]`
- 실행 명령: `[실제 명령]`
- 결과: `[pass/fail 및 핵심 assertion]`
- 실패 시 transcript/log: `[최소 재현에 필요한 부분]`
- production 코드와 test 코드의 대응: `[path/symbol 쌍]`


#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| 5edcafda8a4d | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 5edcafda8a4d^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `d48e1f1f8c04` — `fix(app): 응답 실패 뒤 명령 처리를 중단`. 원문 역할은 “Stops LIST, NAMES, and compound MODE after response failure.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.6 `d48e1f1f8c04` — `fix(app): 응답 실패 뒤 명령 처리를 중단`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | DEBUG, LIFECYCLE, RISK |
| 원문 확정 역할 | Stops LIST, NAMES, and compound MODE after response failure. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Reentrant server and application cleanup` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- LIST는 opening 321 또는 어떤 322 enqueue가 실패하면 즉시 중단하고 NAMES도 projection/366 failure 뒤 반복하지 않습니다.
- failed response가 requesting client를 disconnect해 channel map iterator를 무효화할 수 있기 때문입니다.
- compound MODE는 channel name을 copy하고 broadcast/error numeric success를 확인하며 target client를 non-inserting lookup으로 얻습니다.
- 이전 mode mutation은 rollback하지 않지만 후속 mode character는 실행하지 않습니다.

#### 해당 SHA에서 확인할 코드

- LIST/NAMES loops에서 send helper result를 무시하던 parent 코드와 새 early return을 비교합니다.
- loop iterator가 failed send 중 disconnect cleanup으로 channel erase될 수 있는 concrete call path를 기록합니다.
- MODE parser에서 channel name copy, per-character state lookup, broadcast/error response check 위치를 확인합니다.
- operator target lookup이 create-on-access가 아닌 non-inserting find를 사용하는지 확인합니다.
- query/final reply는 handler가 즉시 return하므로 continuation check가 불필요한 branch를 구분합니다.
- already applied mode를 rollback하지 않는 선택과 later mode를 막는 선택을 별도 상태로 기록합니다.

비교 기준:

- 기본 비교: `d48e1f1f8c04^` → `d48e1f1f8c04`
- Thread 직전 관련 SHA: `5edcafda8a4d` — `test(app): 작은 송신 한도에서 상태 정리 검증`
- 일반 규칙 `728aaabc4012`에서 남은 LIST/NAMES/MODE continuation gap을 닫습니다.

Source가 지목한 failure/risk 출발점:

> response helper가 bool이어도 caller loop가 무시하면 erase된 map iterator나 channel/client state를 다음 iteration에서 재사용합니다.

#### Failure → root cause → fix → test 기록

| Fix 추적 항목 | 기록 |
| --- | --- |
| 기존 가정 | response helper가 bool을 반환해도 LIST/NAMES/MODE loop는 iterator/state를 계속 사용할 수 있다는 가정 |
| 실제 failure 또는 위험 | response helper가 bool이어도 caller loop가 무시하면 erase된 map iterator나 channel/client state를 다음 iteration에서 재사용합니다. |
| root cause | failed send 중 disconnect cleanup이 requesting actor와 channel map entry/iterator를 지울 수 있음 |
| 수정된 invariant / decision | output failure 뒤 command sequence를 즉시 중단하며 이전 완료 mutation은 rollback하지 않음 |
| 실제 수정 코드 | [parent/current diff의 path, symbol, branch, mutation 순서] |
| cleanup / failure propagation | [실패가 어느 owner와 callback을 거쳐 수렴하는지] |
| regression test 연결 | `aee5edebe294`의 +i 유지 / +t 미적용 regression |
| fix가 보장하는 것 | [코드와 test가 직접 입증하는 범위] |
| fix가 보장하지 않는 것 | [transactionality, fairness, 다른 layer 등 미보장 범위] |
| 학습자의 root-cause 설명 | [증상 → 원인 → 수정 → 검증을 직접 작성] |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| d48e1f1f8c04 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| d48e1f1f8c04^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `aee5edebe294` — `test(app): 연결 정리 뒤 모드 변경 중단 검증`. 원문 역할은 “Proves a compound MODE retains completed work but performs no later transition after sender removal.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.7 `aee5edebe294` — `test(app): 연결 정리 뒤 모드 변경 중단 검증`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | VERIFICATION, LIFECYCLE, CHANNEL_STATE |
| 원문 확정 역할 | Proves a compound MODE retains completed work but performs no later transition after sender removal. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Reentrant server and application cleanup` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- white-box test는 두 real server connection과 직접 구성한 registered clients/shared `#room`으로 compound MODE만 격리합니다.
- operator fd의 다음 interest update만 실패하게 해 `MODE #room +it`의 첫 `+i` broadcast 중 sender를 동기 제거합니다.
- channel과 peer는 남고 `+i`는 유지되지만 sender state는 사라지며 `+t`는 적용되지 않아야 합니다.
- 부분 완료는 authoritative하지만 actor removal 뒤 후속 transition은 금지되는 non-transactional semantics를 검증합니다.

Source가 이름을 명시한 확인 대상:

- `#room`, `MODE #room +it`, `+i`, `t`

#### 해당 SHA에서 확인할 코드

- test가 application private/domain state를 어떤 white-box access로 구성하는지 확인합니다.
- fake event manager가 특정 fd의 next update만 실패하도록 설정하는 코드를 확인합니다.
- MODE parser가 `i`를 mutate한 뒤 broadcast에서 sender removal을 일으키는 production call stack을 추적합니다.
- channel existence, peer membership, invite-only true, topic-protected false, sender absence를 모두 assertion하는지 확인합니다.
- rollback이 아니라 stop-after-failure를 검증한다는 점을 assertion 순서와 expected state로 설명합니다.

비교 기준:

- 기본 비교: `aee5edebe294^` → `aee5edebe294`
- Thread 직전 관련 SHA: `d48e1f1f8c04` — `fix(app): 응답 실패 뒤 명령 처리를 중단`

Source가 지목한 failure/risk 출발점:

> 단순 “no crash” assertion만으로는 later `t` transition이 잘못 실행되거나 earlier `i`가 부당하게 rollback되는 semantics를 구분하지 못합니다.

#### Test / verification 학습 기록

| 구분 | Source에서 확정된 출발점 | 학습자 코드·실행 기록 |
| --- | --- | --- |
| 대상 production invariant | compound MODE에서 actor가 첫 notification 중 제거되면 완료된 mutation만 남고 후속 mode transition은 실행되지 않는 invariant | [관련 production path와 symbol을 추가] |
| 재현 failure / boundary | `MODE #room +it`의 +i broadcast 중 operator fd interest update failure | [입력, state, injected result를 정확히 기록] |
| test technique | white-box application state setup + two real connections + fd-targeted FakeEventManager failure | [test double/real socket/process의 구성 증거] |
| 통과하는 production code path | MODE parser → +i aggregate mutation → broadcast/send/update failure → disconnect cleanup → handler continuation decision | [caller → callee → branch를 해당 SHA에서 연결] |
| 이 test가 증명하는 것 | non-transactional partial completion(+i 유지)과 stop-after-failure(+t 미적용)를 정확히 구분함 | [실행 결과와 assertion 근거] |
| 이 test가 증명하지 않는 것 | 모든 compound mode 조합이나 rollback semantics, native backend behavior | [과장하지 않을 범위] |
| test 성격 | deterministic white-box application regression | [broad/deterministic 판단 근거] |
| 막는 회귀 | sender removal 뒤 stale channel/client를 사용해 뒤 mode를 적용하는 문제 | [후속 변경에서 깨질 수 있는 invariant] |

실행 기록:

- 실행 SHA: `[확인한 SHA]`
- 실행 환경: `[OS, compiler, sanitizer 또는 Python version 등]`
- 실행 명령: `[실제 명령]`
- 결과: `[pass/fail 및 핵심 assertion]`
- 실패 시 transcript/log: `[최소 재현에 필요한 부분]`
- production 코드와 test 코드의 대응: `[path/symbol 쌍]`


#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| aee5edebe294 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| aee5edebe294^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 이 commit은 이 Thread의 마지막 항목입니다. Invariant ledger와 Thread 최종 상태에서 전체 변화를 연결합니다.

## 6. Invariant ledger

| Invariant | 처음 도입 | 강화/적용 | 부족함 또는 위험이 드러난 지점 | Fix/Test 연결 | 학습자 최종 기록 |
| --- | --- | --- | --- | --- | --- |
| erase-before-callback cleanup | 7a6bc7e1276a | recursive lookup/repeated disconnect에 안전 | callback 전 획득 pointer와 event failure는 미해결 | 5dcd882f0763 | [학습자 최종 상태 설명] |
| server map/event/fd consistency | 5dcd882f0763 | accept/listener rollback + fd relookup + update failure cleanup | 없음 | 928594ec160c | [학습자 최종 상태 설명] |
| send as lifecycle transition | 728aaabc4012 | bool propagation + stable copies + relookup | LIST/NAMES/MODE loop 일부 누락 | 5edcafda8a4d 및 d48e1f1f8c04 | [학습자 최종 상태 설명] |
| stop-after-output-failure | d48e1f1f8c04 | variable-length replies/compound MODE continuation 중단 | prior mutation은 rollback하지 않음 | aee5edebe294 | [학습자 최종 상태 설명] |

Ledger 작성 기준:

- “도입”과 “완성”을 같은 의미로 쓰지 않습니다.
- 후속 fix가 이전 commit의 사실을 소급 변경하지 않도록 각 SHA 시점의 보장과 부족함을 분리합니다.
- source가 명시하지 않은 invariant를 추가할 때는 확정 사실이 아니라 학습자의 코드 해석으로 표시하고 path/symbol 증거를 붙입니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 | 실제 failure/risk | Fix 또는 기반 변화 | 수정된 decision/semantics | Test 연결 | 코드 증거 |
| --- | --- | --- | --- | --- | --- |
| single-threaded callback 동안 object가 유지된다는 가정 | self-disconnect 후 dangling Connection과 divergent event registration | 5dcd882f0763이 fd relookup/rollback/noexcept error path로 수정 | server cleanup으로 수렴 | 928594ec160c fake-event deterministic test | [실제 code/test evidence] |
| response enqueue는 lifecycle을 바꾸지 않는다는 가정 | send failure가 registry/channel을 지운 뒤 handler가 계속 실행 | 728aaabc4012이 bool propagation/re-resolution 규칙 정립 | d48e1f1f8c04이 남은 loops를 중단 | 5edcafda8a4d / aee5edebe294 | [실제 code/test evidence] |
| compound command는 전부 성공하거나 전부 rollback | 실제 선택은 부분 완료 유지 + 후속 transition 금지 | d48e1f1f8c04 semantics 명시 | actor removal 뒤 즉시 return | aee5edebe294가 +i 유지 / +t 미적용 검증 | [실제 code/test evidence] |

## 8. Ownership / state / responsibility 변화

| 책임 또는 상태 | 이전 상태 | 이후 authoritative 위치 | 관련 commit | 학습자 확인 |
| --- | --- | --- | --- | --- |
| connection identity across callbacks | raw pointer/reference | fd + post-boundary lookup | 5dcd882f0763 | [확인한 owner/state/lifetime] |
| partial registration rollback | 단계별 암묵 cleanup | map ownership + event add rollback | 5dcd882f0763 | [확인한 owner/state/lifetime] |
| error callback behavior | throw 가능 | noexcept containment | 5dcd882f0763 | [확인한 owner/state/lifetime] |
| application send continuation | void helper/borrowed state 유지 | bool helper + stable copy/relookup/return | 728aaabc4012 | [확인한 owner/state/lifetime] |
| compound command failure semantics | 계속 진행 가능성 | completed mutation 유지 + later transition 중단 | d48e1f1f8c04 | [확인한 owner/state/lifetime] |

추가 기록:

- owner가 바뀌는 실제 코드: `[SHA / path / symbol]`
- non-owning reference 또는 identifier: `[어떤 lifetime 안에서만 유효한지]`
- state mutation 전후 순서: `[호출 순서와 실패 시 남는 상태]`
- cleanup 책임: `[normal / error / callback / shutdown 경로]`

## 9. Thread 최종 상태

- 시작 직전 상태: `[첫 commit의 parent에서 실제로 존재한 구조와 미보장 항목]`
- 마지막 commit 시점의 source-confirmed 상태: `[마지막 commit 역할을 코드로 입증한 설명]`
- Thread 안에서 강화된 핵심 invariant: `[ledger를 바탕으로 작성]`
- 남은 한계 또는 후속 Thread에서 보강되는 부분: `[관련 문서와 SHA]`
- 학습자의 최종 설명: `[이 Thread의 설계 → 구현 → failure → 수정/검증 흐름을 직접 작성]`

## 10. 최종 architecture 또는 execution flow 정리

다음 골격에 실제 symbol, state, failure branch를 채웁니다.

```text
[Server callback 또는 send/update] → [current fd가 제거될 수 있음]
→ boundary 복귀 → fd로 `Connection` 재lookup → 없으면 return/cleanup 완료
[sendTo failure] → Server disconnect → application disconnect callback
→ registry/index/membership/channel erase → 원 handler 복귀
→ stable id로 re-resolve 또는 즉시 return; iterator/pointer 재사용 금지
compound MODE: mutation 1 완료 → notification failure/actor removal → mutation 2 실행 금지
```

Execution flow 증거표:

| 단계 | SHA | Caller | Callee / state owner | 정상 transition | failure / cleanup transition |
| --- | --- | --- | --- | --- | --- |
| 1 | [SHA] | [caller] | [callee/owner] | [정상 흐름] | [실패 흐름] |
| 2 | [SHA] | [caller] | [callee/owner] | [정상 흐름] | [실패 흐름] |
| 3 | [SHA] | [caller] | [callee/owner] | [정상 흐름] | [실패 흐름] |

## 11. 학습 완료 자가 점검

- [ ] Commit map의 모든 SHA, subject, importance, tags를 source와 대조했습니다.
- [ ] 모든 commit을 해당 SHA 시점의 코드로 확인했습니다.
- [ ] final HEAD의 함수나 field를 과거 commit 설명에 소급하지 않았습니다.
- [ ] S commit은 architecture/invariant, failure, ownership/lifecycle, 후속 fix/test까지 설명할 수 있습니다.
- [ ] A commit은 주요 subsystem/boundary/failure path와 설계 판단을 설명할 수 있습니다.
- [ ] B commit은 Thread 흐름에서 맡는 구현 역할과 state 변화를 확인했습니다.
- [ ] fix commit의 기존 가정, root cause, 수정 invariant, regression test를 연결했습니다.
- [ ] test commit의 production path, technique, 증명/비증명 범위를 구분했습니다.
- [ ] Invariant ledger와 responsibility 표를 실제 path/symbol 증거로 완성했습니다.
- [ ] 이 Thread를 별도 프로젝트 재학습 없이 commit history에 근거해 설명할 수 있습니다.
