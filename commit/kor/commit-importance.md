# 프로젝트 중요도 프로필

프로젝트: `irc-relay-server` (`cpp/ft_irc`)

도메인: C++17로 구현한 단일 프로세스 이벤트 기반 네트워크 서버 및 IRC 프로토콜.

주요 목적: Linux(`epoll`)와 macOS(`kqueue`)에서 동작하며 registration, direct/channel messaging, channel membership과 mode, 제한된 운영 보호 정책, observability, graceful shutdown을 지원하는 cross-platform non-blocking IPv4 IRC relay server를 제공한다.

확정된 커밋 범위: `3786db4edf13`(`docs(readme): 프로젝트 목표와 초기 개발 규약 정의`)부터 `c32b2e2faf44`(`docs(project): 프로젝트 문서 정리`)까지 `cpp/ft_irc`의 완전하고 독립적인 선형 history. 전체 89개 commit으로 구성되며, `commit-bodies.md`에 포함된 문서 외 commit 87개와 documentation-only commit 2개가 해당한다. merge commit이나 관련 없는 상속 ancestor는 없다. 12자리 abbreviated SHA로 범위 내 모든 commit을 고유하게 식별할 수 있다.

## 핵심 기술 영역

- 공통 event contract와 `epoll`, `kqueue` backend를 통한 portable readiness 처리.
- move-only socket ownership, incremental input framing, 부분 non-blocking read/write, output queueing, backpressure.
- listener 및 connection lifecycle 관리, event registration consistency, callback dispatch, rollback, cleanup.
- IRC line parsing, command normalization, numeric 및 message formatting, registration-state enforcement.
- descriptor를 key로 하는 client state, case-insensitive nickname indexing, identity transition, registration completion.
- `Channel` aggregate의 membership, operator authority, invitation, topic, mode state, message fan-out, disconnect cleanup.
- registration·idle·ping deadline, 정확한 PONG correlation, rate limiting, connection 및 pending-output limit.
- structured metrics와 logging, signal-driven shutdown, bounded output-drain 동작.
- deterministic unit test, real TCP contract/smoke test, high-descriptor·slow-receiver test, cross-platform CI, sanitizer를 통한 계층화된 검증.

## 핵심 아키텍처

- `EventManager`는 플랫폼 독립적인 add, update, remove, wait contract를 정의한다. `EpollEventManager`와 `KqueueEventManager`는 운영체제별 registration과 readiness를 이 공통 모델로 변환한다.
- `Connection`은 client socket 하나와 해당 input buffer, output queue, partial-write offset, framing limit, peer identity, close state를 소유하는 move-only 객체다.
- `Server`는 listening socket, event manager, authoritative `fd -> unique_ptr<Connection>` map을 소유한다. readiness를 connect, complete-line, disconnect, infrastructure-error callback으로 변환한다.
- `IrcApplication`은 protocol 및 domain coordinator다. `ClientRegistry`, channel aggregate, runtime policy, application metrics, command dispatch, response construction, protocol-aware cleanup을 소유한다.
- `IrcMessage`와 reply helper는 wire-format boundary를 구성하고, `RuntimeConfig`, `main`, Makefile은 runtime 및 platform-selection boundary를 구성한다.
- test architecture도 같은 계층을 반영한다. scripted `Connection` syscall test, fake-event-manager를 사용한 server/application lifetime test, exact TCP contract test, real-process fairness test, 두 지원 event backend를 대상으로 한 CI로 구성된다.

## 핵심 불변식

- 수락한 각 descriptor에는 authoritative `Connection` owner가 하나만 존재하며 정확히 한 번 닫힌다. event registration과 server connection map은 서로 어긋나서는 안 된다.
- callback 실행, event-interest update, response enqueue는 connection을 동기적으로 제거할 수 있다. 이 transition을 건널 때 `Connection`, client, channel, pointer, reference, iterator를 다시 resolve하지 않고 유지하거나 재사용해서는 안 된다.
- partial send는 실제로 전송됐다고 보고된 byte만큼만 진행한다. retry는 미전송 suffix의 순서를 보존하고, queue-limit arithmetic은 wraparound될 수 없으며, 거부된 byte는 pending state를 변경하지 않는다.
- input framing은 incremental하게 수행하고 output framing은 CRLF로 정규화한다. malformed 또는 oversized frame이 buffer에 남아 이후 유효한 command로 처리되어서는 안 된다.
- IRC registration은 password, nickname, USER prerequisite가 모두 충족된 뒤에만 완료된다. nickname은 registry의 canonical lookup rule 아래 고유하게 유지된다.
- channel membership, operator state, invitation, empty-channel lifetime은 client 및 nickname state와 일관되어야 한다. disconnected descriptor가 어떤 channel에도 남아서는 안 되며, shared peer는 각 identity 또는 quit transition을 최대 한 번만 받아야 한다.
- channel mutation은 invite-only admission, topic protection, KICK, invitation, operator-mode 변경을 포함해 membership과 operator authority를 강제한다.
- registration, idle, ping, rate-limit 판단은 일관된 client별 state를 사용한다. heartbeat deadline은 monotonic clock을 사용하며, 정확한 outstanding PONG token만 wait state를 해제한다.
- resource 및 shutdown failure는 가능한 한 connection 범위에 머문다. pending output, connection count, registration time, command rate, heartbeat wait는 제한되거나 명시적으로 제어되며, shutdown은 teardown 전에 final error를 queue하려고 시도한다.

## 주요 엔지니어링 난점

- platform flag를 server loop에 노출하지 않고 `epoll`과 `kqueue`의 서로 다른 registration 및 notification 모델을 조정하는 문제.
- 하나의 readiness notification에서 여러 line, partial line, partial write, interruption, temporary backpressure, EOF, hard failure가 발생할 수 있는 byte stream을 정확히 모델링하는 문제.
- user callback이나 event-interest update가 현재 처리 중인 connection 자체를 삭제할 수 있는 상황에서 object 및 aggregate lifetime을 보존하는 문제.
- nickname 변경, 명시적 PART, KICK, QUIT, transport failure, fan-out, empty-channel erasure 전반에서 identity와 channel state를 일관되게 유지하는 문제.
- wall-clock 이동과 관련 없거나 위조된 PONG message의 영향을 받지 않는 heartbeat behavior를 정의하는 문제.
- timing에 의존하는 우연한 network failure를 기다리지 않고 send operation 및 event-manager failure를 주입해 드문 failure path를 deterministic test로 만드는 문제.
- 많은 file descriptor와 읽지 않는 느린 client가 있는 환경에서 isolation을 입증하면서도, loop에 ready-event별 work quantum이나 formal latency bound가 없다는 한계를 명시하는 문제.

## 실무 엔지니어링 영역

- 명시적인 numeric range와 overflow-safe parsing을 사용한 엄격한 external-input validation.
- RAII ownership, idempotent cleanup, erase-before-callback ordering, partial registration 뒤 rollback.
- transport queueing에서 server interest management를 거쳐 application command continuation까지 이어지는 failure propagation.
- timeout, rate limit, connection limit, pending-output limit, 명시적인 운영상 trade-off.
- 정의된 shutdown ordering을 갖는 structured lifecycle logging과 metrics.
- CLI output, IRC frame, CRLF termination, numeric, log ordering, process exit behavior에 대한 exact public-contract testing.
- unit 및 real-network scenario 모두에 대한 cross-platform regression automation과 sanitizer instrumentation.

## S 등급 기준

- event-driven relay의 동작 방식을 설명하는 데 필수적인 프로젝트 정의 수준의 execution 또는 responsibility boundary를 확립한다.
- partial I/O 환경에서 server가 순서와 무손실 진행을 보존하는 데 필수적인 core non-blocking output 또는 readiness mechanism을 구현한다.
- 여러 계층에 걸친 중요한 ownership, callback-reentrancy, event-registration, application-state 불변식을 확립하거나 복구한다.
- 없을 경우 disconnect 또는 identity change 뒤 shared protocol state가 불일치하게 되는 authoritative client/channel cleanup을 확립한다.
- 해당 mechanism의 심각하고 비자명한 root cause를 수정하며, 이 commit이 빠지면 project의 correctness story에 실질적인 공백이 생긴다.

## A 등급 기준

- 주요 subsystem contract, state model, external-input boundary, lifecycle integration, liveness rule, resource-protection boundary를 확립한다.
- project architecture 전체를 재정의하지 않으면서 적절한 계층에서 중요한 edge case나 failure path를 수정한다.
- 어려운 ownership, timing, backpressure, rollback, cross-platform 불변식에 대한 deterministic verification을 추가한다.
- 완성된 server에 대한 신뢰도를 실질적으로 높이는 system-level integration evidence 또는 operational behavior를 제공한다.

## 일반적인 B 등급 작업

- 이미 확립된 설계 안에서 예상되는 IRC command, numeric, platform-backend 세부 구현, configuration option, metrics, support helper를 구현한다.
- 일반적인 positive-path 또는 feature-specific regression coverage를 추가한다.
- ownership이나 responsibility boundary를 바꾸지 않고 기존 state machine 또는 aggregate에 통상적인 동작을 확장한다.
- 이미 확립된 mechanism을 조합하는 데 필요한 build 및 executable wiring을 제공한다.

## 일반적인 C 등급 작업

- documentation-only commit, ignore rule, presentation string 변경, 매우 작은 mechanical refactor.
- runtime behavior, architecture, correctness guarantee, verification strength에 미치는 영향이 거의 없는 변경.

## 프로젝트별 태그

ARCH — responsibility 또는 module boundary를 확립하거나 실질적으로 변경한다.

CORE — server의 핵심 execution 또는 protocol 흐름에 필수적인 동작을 구현한다.

EVENT_IO — readiness backend, socket, framing, buffering, partial I/O, backpressure, fairness 관련 작업.

LIFECYCLE — ownership, registration, callback reentrancy, cleanup, rollback, shutdown 관련 작업.

IRC_PROTOCOL — IRC grammar, wire formatting, registration rule, command, numeric 관련 작업.

CHANNEL_STATE — channel membership, role, mode, authorization, invitation, topic, fan-out 관련 작업.

IDENTITY — client registration state, nickname uniqueness, hostmask, identity transition 관련 작업.

RESILIENCE — timeout, rate limit, resource limit, failure containment, liveness policy 관련 작업.

OBSERVABILITY — runtime metrics, structured log, 외부에서 관찰 가능한 diagnostic state 관련 작업.

VERIFICATION — 불변식에 대한 unit, contract, smoke, stress, sanitizer, CI evidence.

BUILD — build rule, platform selection, executable composition, automation infrastructure 관련 작업.

INTEGRATION — 분리된 transport, protocol, state, runtime layer 사이의 유의미한 상호작용.

DEBUG — 비자명한 defect 또는 위반된 assumption의 root cause 수정.

RISK — 영향이 큰 correctness, resource, reliability boundary를 보호하는 작업.

REFACTOR — behavior보다 code organization 변경이 주목적인 구조적 정리.

# 커밋 분류

| 커밋 | 제목 | 중요도 | 태그 | 요약 | 이유 |
| --- | --- | --- | --- | --- | --- |
| `3786db4edf13` | `docs(readme): 프로젝트 목표와 초기 개발 규약 정의` | C | - | README에 초기 프로젝트 목표, 범위, 개발 규약을 정의한다. | executable이나 구조를 변경하지 않는 documentation-only 맥락으로, 전체 engineering history에서 중요도가 낮다. |
| `20728dcb9797` | `chore(project): 빌드 산출물 제외` | C | BUILD | executable, object, dependency file, log를 ignore policy에 추가한다. | 일반적인 repository hygiene 작업이며 runtime behavior나 유의미한 engineering boundary를 바꾸지 않는다. |
| `8e8a3db87950` | `feat(event): 이벤트 준비 상태 계약 정의` | A | ARCH, EVENT_IO | portable readiness flag, event record, `EventManager` interface를 정의한다. | epoll, kqueue, server가 공유하는 의미적 portability boundary를 확립한다. architecture상 중요하지만 이 단계만으로 runtime이 동작하지는 않는다. |
| `d3f74e2857da` | `feat(event): kqueue 관심 상태 등록 구현` | B | EVENT_IO | 논리적 read/write interest를 추적되는 registration state와 함께 kqueue filter로 매핑한다. | 필요한 macOS backend 작업이지만 project 전체 architecture를 바꾸기보다 이미 확립된 event abstraction을 구현한다. |
| `769cd3094f71` | `feat(event): kqueue 준비 이벤트 변환 구현` | B | EVENT_IO | kevent readiness, error, hangup, timeout을 공통 event로 변환한다. | 기존 contract 안에서 macOS backend를 완성한다. 중요한 portability 구현이지만 이미 선택된 설계를 따른다. |
| `2284a0e0d8bb` | `feat(event): epoll 관심 상태 등록 구현` | B | EVENT_IO | 공통 interest를 `epoll_ctl` registration과 추적 mask로 매핑한다. | 확립된 event interface 안에서 필요한 Linux backend 작업이며 독립적인 architectural judgment는 제한적이다. |
| `f1320f357bca` | `feat(event): epoll 준비 이벤트 변환 구현` | B | EVENT_IO | epoll readiness와 socket error를 platform-neutral event model로 변환한다. | 기존 abstraction으로 Linux 지원을 완성한다. core subsystem의 일반적인 구현이며 새로운 정의 수준의 결정은 아니다. |
| `8864f253ac15` | `feat(connection): 스트림 연결 상태 계약 정의` | A | ARCH, EVENT_IO, LIFECYCLE | framing, buffering, close, I/O result contract를 갖는 move-only socket owner를 정의한다. | 이후 모든 I/O와 lifetime 작업의 형태를 결정하는 주요 transport responsibility boundary다. core mechanism은 후속 commit에서 완성되므로 S가 아니라 A다. |
| `d71a2549c0eb` | `feat(connection): 소켓 소유권과 이동 수명 구현` | A | LIFECYCLE, RISK | 단일 소유권, exactly-once close, state-preserving move operation을 구현한다. | server map과 callback lifecycle이 의존하는 resource-ownership 불변식을 확립한다. 영향은 크지만 `Connection` ownership에 국한된다. |
| `9b601b69de4f` | `feat(connection): IRC 입력 프레임 추출 구현` | A | EVENT_IO, IRC_PROTOCOL, RISK | incremental CRLF/LF frame을 추출하고 line-length boundary를 강제한다. | byte stream에서 protocol line으로 넘어가는 경계를 만들고 malformed input의 무제한 증가를 막는다. transport layer의 중요한 correctness 결정이다. |
| `b00589d4b1b1` | `feat(connection): 논블로킹 수신 상태 처리` | A | EVENT_IO, RISK | EINTR, EAGAIN, EOF, error를 구분하면서 backpressure 또는 종료까지 `recv`를 drain한다. | non-blocking receive state machine과 lifecycle outcome을 구현하며, 신뢰성 있는 event-driven 동작의 중요한 부분이다. |
| `a10fe961e2b1` | `feat(connection): 부분 송신 대기열 처리` | S | CORE, EVENT_IO, LIFECYCLE | 지속적인 partial-write 진행, backpressure 처리, canonical CRLF, drain-before-close state를 구현한다. | server의 핵심 non-blocking mechanism에 필수적이다. persistent offset과 retry semantics가 없으면 slow receiver나 partial send에서 IRC output이 중복·유실·고립될 수 있다. |
| `e6492e27cc30` | `feat(server): 이벤트 서버 공개 계약 정의` | A | ARCH, EVENT_IO, LIFECYCLE | listener, event manager, connection, transport callback에 대한 `Server` ownership을 정의한다. | transport/application boundary와 authoritative ownership model을 확립한다. 이후 event loop가 이 architecture를 실제 동작하게 만든다. |
| `f6770c790919` | `feat(server): 서버 수명과 콜백 상태 구현` | A | ARCH, LIFECYCLE | server construction, callback ownership, stop state, ordered destruction을 구현한다. | lifecycle skeleton이 server-scoped resource의 획득과 해제를 결정한다. 중요한 기반 작업이지만 완전한 runtime mechanism은 아니다. |
| `25deb8abcb6a` | `feat(server): IPv4 리스닝 소켓 구성` | B | EVENT_IO | non-blocking IPv4 listening socket을 생성·설정하고 bound port를 보고한다. | 확립된 server design 안의 적절한 socket setup이며 project architecture를 독립적으로 정의하지 않는다. |
| `4ad1227e5119` | `feat(server): 논블로킹 연결 수락과 등록 구현` | A | EVENT_IO, LIFECYCLE | accept를 drain하고 client descriptor를 설정하며 `Connection`을 생성해 read interest를 등록한다. | 운영체제 descriptor를 server ownership과 event registry에 통합하는 중요한 lifecycle boundary로, 실제 rollback 위험이 있다. |
| `378d5304828d` | `feat(server): 준비 이벤트 루프 구동` | S | CORE, ARCH, EVENT_IO | listener와 client의 portable readiness dispatch를 중심으로 `start`, `run`, `pollOnce`를 구현한다. | listener, event backend, connection, callback을 연결하는 project-defining execution mechanism이다. 빠지면 server 동작 방식을 설명하는 데 큰 공백이 생긴다. |
| `eb82a81d6c81` | `feat(server): 클라이언트 입력 이벤트 전달` | B | EVENT_IO, INTEGRATION | ready client를 읽고 완성된 line을 전달하며 read failure를 closure로 변환한다. | 이미 확립된 `Connection` result를 기존 callback에 연결하는 필요한 integration이지만 대부분 기존 contract의 적용이다. |
| `625ffc924de8` | `feat(server): 송신 큐와 쓰기 관심 상태 연결` | A | EVENT_IO, LIFECYCLE, INTEGRATION | queue된 output을 write readiness와 graceful close completion에 동기화한다. | `Connection` backpressure state와 kernel event interest 사이의 핵심 결합을 확립한다. 중요한 cross-component lifecycle engineering이다. |
| `7a6bc7e1276a` | `feat(server): 연결 해제와 오류 정리 구현` | A | LIFECYCLE, RISK | event removal, map erasure, disconnect callback, listener cleanup, bulk shutdown을 중앙화한다. | 하나의 authoritative transport cleanup path와 중요한 erase-before-callback ordering rule을 만든다. 이후 fix가 예외적 reentrancy를 보강하므로 기반 버전은 A다. |
| `a22bf6ddbd75` | `feat(parser): IRC 메시지 값과 직렬화 정의` | B | IRC_PROTOCOL | structured IRC message value와 기본 serialization representation을 도입한다. | 필요한 protocol modeling이지만 parser와 reply layer를 위한 비교적 직접적인 scaffold다. |
| `c31a32b6cb24` | `feat(parser): IRC 한 줄 구문 해석 구현` | A | IRC_PROTOCOL, RISK | prefix, normalized command, middle parameter, trailing text, protocol limit을 parsing한다. | parser는 오류가 모든 command semantics를 손상시킬 수 있는 external input boundary다. grammar와 validation에 중요한 project-specific judgment가 들어간다. |
| `0fd2c6a9434b` | `feat(parser): 버퍼에서 IRC 프레임 소비` | B | IRC_PROTOCOL, EVENT_IO | buffer에서 complete line을 소비하고 각 line을 IRC parser에 위임한다. | framing과 parsing representation이 이미 확립된 뒤 이를 연결하는 일반적인 integration이다. |
| `aeb1e9b709b9` | `feat(reply): IRC 서버 응답 생성` | B | IRC_PROTOCOL | message, numeric, error, code, hostmask formatting helper를 추가한다. | 확립된 protocol model 안에서 필요한 wire-format 지원을 제공하지만 project-defining 영향은 제한적이다. |
| `786ed5d839d9` | `feat(channel): 채널 상태 계약 정의` | A | ARCH, CHANNEL_STATE | membership, operator, invitation, topic, mode를 위한 `Channel` aggregate를 정의한다. | 이후 모든 channel command와 cleanup path가 사용하는 authoritative domain model을 확립한다. IRC layer에서 중요한 architecture다. |
| `966f5663dbcc` | `feat(channel): 구성원과 운영자 상태 관리` | B | CHANNEL_STATE | membership/operator mutation, lookup, enumeration, empty-state query를 구현한다. | 필수 aggregate operation이지만 새 system-wide 결정을 도입하지 않고 이미 정의된 channel contract를 구현한다. |
| `0d0d850f007d` | `feat(channel): 주제·초대·모드와 이름 규칙 구현` | B | CHANNEL_STATE, IRC_PROTOCOL | channel-name validation, topic/invite state, `+i`/`+t`, mode rendering을 구현한다. | 이미 확립된 `Channel` aggregate 내부의 일반적인 domain behavior다. |
| `52b6f1ce8f0f` | `feat(config): 기본 실행 인자 해석 모듈 구성` | B | BUILD, RESILIENCE | `RuntimeConfig` default, usage output, port parsing, 기본 option handling을 추가한다. | 유용한 runtime configuration boundary를 만들지만 초기 parsing은 일반적이며 어려운 edge handling은 후속 commit이 담당한다. |
| `991b76b8d793` | `feat(client): 연결별 등록 상태 저장` | B | IDENTITY | descriptor-keyed client registration 및 identity state storage를 추가한다. | application design에 필요한 state infrastructure지만 비교적 직접적인 container abstraction이다. |
| `b47135c51cfc` | `feat(client): 닉네임 색인 관리` | A | IDENTITY, RISK | case-insensitive nickname lookup과 조정된 index update/erase를 추가한다. | nickname uniqueness와 index consistency는 server 전반의 registration, messaging, cleanup에 영향을 준다. 중요한 identity 불변식을 확립한다. |
| `0b5ae6aef328` | `feat(app): IRC 동작 조율 계약 정의` | S | CORE, ARCH, INTEGRATION | `IrcApplication`을 protocol state의 owner이자 `Server` callback/command coordinator로 정의한다. | transport orchestration과 IRC semantics 사이의 project-defining boundary다. 없으면 registration, identity, channel, reply, cleanup의 ownership이 불명확해진다. |
| `2ed9331124bb` | `feat(app): 연결 수명 콜백 조율` | A | LIFECYCLE, IRC_PROTOCOL, INTEGRATION | connect 시 client state를 만들고 line을 한 번 parsing하며 disconnect 시 protocol state를 제거한다. | transport lifecycle event를 application state transition과 parsing에 연결하는 중요한 integration이다. |
| `035e1137e0dd` | `feat(app): 등록 전 명령 분배 구현` | A | IRC_PROTOCOL, IDENTITY, RISK | registration-aware dispatch, 허용된 pre-registration command, 451/421 response를 중앙화한다. | registration gate는 이후 모든 command의 protocol authorization boundary다. 중앙화로 handler별 lifecycle check 불일치를 막는다. |
| `8bbd1eb75961` | `feat(app): 응답과 클라이언트 정리 지원 구현` | B | IRC_PROTOCOL, LIFECYCLE | 공통 prefix, numeric, send, close, 초기 client-removal helper를 추가한다. | 확립된 application responsibility를 지원하는 helper이며 더 깊은 reentrant cleanup guarantee는 이후 commit에서 도입된다. |
| `582317254e24` | `feat(registration): PASS 인증 상태 처리` | B | IDENTITY, IRC_PROTOCOL | PASS를 검증하고 잘못된 credential을 거부하며 password authorization state를 진행시킨다. | 이미 정의된 state machine 안의 예상되는 registration behavior다. |
| `80a639321bad` | `feat(registration): 닉네임 검증과 색인 갱신` | B | IDENTITY, IRC_PROTOCOL | nickname syntax를 검증하고 collision을 감지해 nickname index를 갱신한다. | 필요한 command이며 예상되는 edge case를 처리하지만 이미 존재하는 identity index와 registration design을 적용한다. |
| `d9e420b570a0` | `feat(registration): USER 정보와 환영 응답 연결` | B | IDENTITY, IRC_PROTOCOL | USER field를 저장하고 모든 prerequisite 충족 시 welcome numeric과 함께 registration을 완료한다. | 확립된 PASS/NICK/USER state machine의 일반적인 구현이다. |
| `337f9e5238fa` | `feat(registration): PING과 QUIT 기본 명령 처리` | B | IRC_PROTOCOL, LIFECYCLE | PING/PONG response와 QUIT 기반 close request를 추가한다. | 기존 reply 및 close abstraction 안에서 구현된 필수 connection-control command다. |
| `ad728f6b8ee5` | `feat(server): IRC 애플리케이션 실행 진입점 구성` | B | BUILD, INTEGRATION, LIFECYCLE | configuration, signal, `Server`, `IrcApplication` callback, poll loop, error output을 연결한다. | component를 실행 가능하게 만들지만 주로 앞선 commit에서 확립된 architecture와 mechanism을 조합한다. |
| `f3ecbf108692` | `build(project): 플랫폼별 IRC 서버 빌드 구성` | B | BUILD | Linux epoll, macOS kqueue source selection과 dependency file을 포함한 C++17 Makefile을 추가한다. | 필요한 reproducible build와 platform integration이지만 runtime architecture를 바꾸지 않는다. |
| `953b8746b95d` | `feat(message): 등록 사용자의 개인 메시지 전달` | B | IRC_PROTOCOL, IDENTITY | multi-target PRIVMSG traffic을 standard error와 함께 registered nickname recipient로 routing한다. | direct messaging은 핵심 product behavior지만 구현은 확립된 parsing, lookup, reply, send boundary를 따른다. |
| `c1762e011fd6` | `feat(channel): 채널 탐색과 대상 해석 지원` | B | CHANNEL_STATE | channel storage, target recognition, lazy creation, error를 포함한 command lookup을 추가한다. | 이미 선택된 aggregate model 안에서 channel command를 지원하는 infrastructure다. |
| `88877a8b0779` | `feat(channel): 주제와 구성원 응답 지원` | B | CHANNEL_STATE, IRC_PROTOCOL | topic과 NAMES state를 IRC numeric 및 operator-prefixed nickname으로 projection한다. | 기존 channel/client state 위에서 수행하는 일반적인 response construction이다. |
| `46e2b7785bee` | `feat(channel): 채널 방송 대상 팬아웃 지원` | A | CHANNEL_STATE, INTEGRATION | shared channel 간 deduplication을 포함한 channel, common-peer, mode fan-out을 추가한다. | multi-client relay는 특히 여러 channel을 공유하는 peer의 정확한 recipient selection에 의존한다. 재사용 가능한 fan-out boundary는 중요한 integration 결정이다. |
| `a147d6994d58` | `feat(channel): 구성원 정리와 식별자 변경 방송` | S | CORE, CHANNEL_STATE, LIFECYCLE | PART, QUIT, nickname 변경, membership 제거, peer notification, empty-channel erasure를 조정한다. | client, nickname index, channel을 아우르는 authoritative cross-aggregate cleanup 불변식을 확립한다. disconnected descriptor가 shared state에 남을 수 없게 하므로 project의 correctness story에 필수적이다. |
| `7ac793d3b695` | `feat(message): 채널 대상 메시지 방송` | B | IRC_PROTOCOL, CHANNEL_STATE | direct-message behavior를 유지하면서 PRIVMSG를 membership-authorized channel fan-out으로 확장한다. | 확립된 target, membership, broadcast abstraction을 사용하는 예상 가능한 feature work다. |
| `22e5f82bc693` | `feat(channel): JOIN 채널 입장 처리` | A | CHANNEL_STATE, IRC_PROTOCOL, RISK | channel validation, invite-only admission, first-member operator assignment, JOIN broadcast, topic, NAMES를 구현한다. | JOIN은 authorization, aggregate creation, role assignment, fan-out을 결합하는 핵심 membership transition이다. 기존 helper를 사용하더라도 중요도가 높다. |
| `1a4329e5f738` | `feat(channel): PART 채널 퇴장 처리` | B | CHANNEL_STATE, IRC_PROTOCOL | multi-channel PART 요청을 parsing하고 membership removal과 broadcast를 위임한다. | 중앙화된 departure path 위에서 구현한 일반적인 command다. |
| `b6e62b56b680` | `feat(channel): TOPIC 조회와 변경 처리` | B | CHANNEL_STATE, IRC_PROTOCOL | operator authorization과 broadcast를 포함한 TOPIC query 및 protected mutation을 추가한다. | architecture를 바꾸지 않고 확립된 channel mode 및 membership model을 적용한다. |
| `4183c682c421` | `feat(channel): KICK 구성원 제거 처리` | B | CHANNEL_STATE, IRC_PROTOCOL | operator-authorized KICK validation, broadcast, membership removal, empty cleanup을 추가한다. | 기존 permission 및 cleanup framework 안의 적절한 command behavior다. |
| `93d96af9a341` | `feat(channel): INVITE 초대 상태 처리` | B | CHANNEL_STATE, IRC_PROTOCOL | INVITE를 검증하고 invitation state를 기록하며 inviter에게 확인하고 target에 알린다. | 기존 invitation 및 membership model의 일반적인 구현이다. |
| `0e601da7d2bc` | `feat(channel): 채널 모드 조회와 i·t 변경` | B | CHANNEL_STATE, IRC_PROTOCOL | MODE routing, channel mode query, operator check, `+i`/`+t` update, unknown-mode error를 추가한다. | 중요한 protocol coverage이지만 이미 정의된 mode 및 authorization design 안에서 동작한다. |
| `bce6933f69ab` | `feat(channel): 채널 운영자 모드 변경` | B | CHANNEL_STATE, IRC_PROTOCOL | MODE parsing을 argument-consuming `+o`/`-o` operator change로 확장한다. | 기존 compound-mode handler와 `Channel` role model의 집중된 확장이다. |
| `6b4a7738a285` | `test(smoke): 실제 TCP 등록과 채널 흐름 검증` | A | VERIFICATION, INTEGRATION, RISK | registration, split frame, collision, messaging, channel, mode, cleanup을 포함하는 실제 TCP smoke harness를 추가한다. | transport, parsing, state, command layer가 함께 동작한다는 첫 광범위 end-to-end evidence다. 통합 server에 대한 신뢰도를 실질적으로 높인다. |
| `60848f425dc3` | `feat(room): 채널 목록 조회 구현` | B | CHANNEL_STATE, IRC_PROTOCOL | channel creation metadata와 optional filtering, member count를 포함한 LIST numeric을 추가한다. | 확립된 channel map과 reply system 안의 일반적인 protocol feature work다. |
| `39553bbdf107` | `feat(room): 채널 구성원 조회 구현` | B | CHANNEL_STATE, IRC_PROTOCOL | 전체 또는 선택된 channel에 대한 NAMES와 empty-result terminator를 추가한다. | 기존 NAMES projection을 직접적으로 확장한다. |
| `4fb0d2347955` | `test(client): 채널 목록 응답 검증` | B | VERIFICATION, CHANNEL_STATE | smoke client를 확장해 LIST와 NAMES response sequence를 검증한다. | 새 command에 대한 유용한 일반 regression coverage이며 새로운 어려운 불변식을 다루는 것은 아니다. |
| `c4df44554866` | `feat(registration): 등록 대기 시간 제한` | B | RESILIENCE, LIFECYCLE | connection age를 추적하고 설정 가능한 deadline 전에 registration을 완료하지 못한 client를 닫는다. | 기존 tick lifecycle을 활용한 실용적인 abuse/resource protection이다. 운영상 중요하지만 구조는 비교적 단순하다. |
| `764361c52b2a` | `feat(heartbeat): 유휴 연결에 PING을 보내고 응답 대기` | A | RESILIENCE, LIFECYCLE, RISK | activity tracking, server heartbeat, PONG state, 설정 가능한 idle/ping timeout을 추가한다. | idle connection의 유효 유지 또는 종료를 결정하는 비단순 liveness state machine을 도입한다. 이후 commit이 time과 token assumption을 수정한다. |
| `d710f29f38a4` | `test(client): 서버 PING에 응답하는 검사 클라이언트 구현` | B | VERIFICATION, IRC_PROTOCOL | smoke peer가 server PING frame에 PONG으로 자동 응답하도록 한다. | 관련 없는 scenario를 불안정하게 만들지 않고 heartbeat를 검증하기 위한 supporting test-client behavior다. |
| `f313e707474f` | `test(client): 유휴 연결의 PING·PONG 흐름 검증` | B | VERIFICATION, RESILIENCE | 짧은 heartbeat timeout으로 idle peer가 PING을 받고 계속 응답 가능한지 검증한다. | 새 liveness feature의 일반적인 positive-path coverage다. |
| `9e2b214f9227` | `feat(throttle): 클라이언트별 명령 호출 횟수 제한` | B | RESILIENCE | client별 sliding command-time window를 추가하고 설정된 rate를 넘는 client를 disconnect한다. | 기존 command path 안에 conventional bounded-window policy로 구현한 실용적인 보호 기능이다. |
| `1d2ee55f219a` | `test(client): 명령 호출 횟수 제한 검증` | B | VERIFICATION, RESILIENCE | PING command를 flood하고 rate-limit numeric 및 closure behavior를 요구한다. | 설정된 command throttle에 대한 일반 regression coverage다. |
| `d7d85e518177` | `feat(buffer): 송신 대기열 크기 제한` | A | EVENT_IO, RESILIENCE, RISK | 미전송 output을 제한하고 queue failure를 전파하며 server configuration으로 limit을 노출한다. | slow-reader pressure를 connection 범위 failure로 제한하고 이후 lifecycle hardening이 사용하는 failure signal을 만든다. 중요한 reliability boundary다. |
| `adb49d9466e4` | `feat(server): 최대 연결 수 제한` | B | RESILIENCE, EVENT_IO | 설정 가능한 connection cap을 추가하고 capacity에 도달하면 accepted socket을 거부한다. | 유용한 resource protection이지만 확립된 accept-loop 및 configuration design을 따른다. |
| `e05e35ca7da9` | `feat(metrics): 서버 실행 지표 조회 기능 추가` | B | OBSERVABILITY | server/application counter를 추적하고 METRICS NOTICE로 노출한다. | core correctness나 architecture를 바꾸지 않으면서 operability와 diagnosis를 개선한다. |
| `1493ffe8cbd7` | `test(client): 서버 지표 명령 검증` | B | VERIFICATION, OBSERVABILITY | METRICS가 예상 NOTICE prefix와 key sequence를 반환하는지 확인한다. | observability command에 대한 일반적인 검증이다. |
| `956c7aecda32` | `chore(server): 서버 식별 문자열과 환영 응답 정리` | C | IRC_PROTOCOL | server identifier를 바꾸고 세 welcome string을 단순화한다. | wording과 identity presentation만 바꾸며 구조나 behavior 측면의 중요성은 거의 없다. |
| `c34aa18f89af` | `feat(log): 연결 상태와 실행 지표 기록` | B | OBSERVABILITY, LIFECYCLE | structured lifecycle/failure event, room counter, final metric logging을 추가한다. | lifecycle 및 protection behavior 진단을 실질적으로 개선하지만 core runtime mechanism을 확립하지는 않는다. |
| `dd04279c47fd` | `feat(shutdown): 종료 전 송신 대기열 처리` | A | LIFECYCLE, RESILIENCE, RISK | signal handling을 application shutdown 요청, ERROR frame queueing, 짧은 drain poll 방식으로 변경한다. | signal handler에서 즉시 멈추는 대신 의미 있는 graceful-shutdown path를 확립한다. 모든 live connection과 final metric lifecycle에 영향을 준다. |
| `3ad63ee21fb8` | `test(smoke): 서버 보호 옵션으로 실행 검증` | B | VERIFICATION, RESILIENCE | 명시적인 heartbeat, registration, rate, pending-output limit으로 smoke test를 실행한다. | protection option들이 일반 scenario에서 함께 동작하는지 검증하지만 새로운 불변식보다는 supporting coverage다. |
| `5e3a8e97626a` | `test(client): 여러 클라이언트의 채널 메시지 전달 검증` | B | VERIFICATION, CHANNEL_STATE | channel peer 6개를 등록하고 서로 다른 client 간 fan-out을 확인한다. | 확립된 channel messaging behavior에 대한 유용한 scaling coverage지만 scenario 자체는 비교적 단순하다. |
| `6b361b10c496` | `refactor(command): 명령 처리 시각 기록 통합` | C | REFACTOR | line별 activity tracking과 rate recording에 하나의 timestamp를 재사용한다. | architecture나 behavior에 유의미한 영향을 주지 않는 작은 local cleanup이다. |
| `e5e6c57db80d` | `test(irc): 실행 조건과 오류 동작 계약 검증` | A | VERIFICATION, IRC_PROTOCOL, RISK | exact CLI, wire framing, command, rate-limit, heartbeat, shutdown, log-order contract check를 추가한다. | public executable surface를 명시적인 regression contract로 바꾸고 이후 fix에 사용되는 evidence를 제공한다. project-defining mechanism은 아니지만 중요한 verification이다. |
| `b6c10bc51937` | `fix(config): 서버 크기 옵션을 오버플로 없이 해석` | A | DEBUG, RESILIENCE, RISK | port, timeout, size value를 strict bounded unsigned-decimal accumulation으로 parsing하도록 변경한다. | external configuration boundary의 narrowing과 overflow를 root cause에서 수정해 behavior가 intermediate C integer width나 관대한 sign/whitespace parsing에 의존하지 않게 한다. |
| `5d1286620994` | `test(config): 크기 옵션 경계와 오류 입력 검증` | B | VERIFICATION, RESILIENCE, RISK | CLI contract에 sign, whitespace, timeout, port, size_t, rate-count overflow case를 추가한다. | configuration fix를 철저히 고정하지만 별도 architecture 변경이라기보다 parser 결정에 대한 supporting evidence다. |
| `3f2b3ae1d3f9` | `fix(heartbeat): 단조 시계와 토큰으로 응답 대기 상태 관리` | A | DEBUG, RESILIENCE, RISK | deadline을 `steady_clock`으로 옮기고 정확한 outstanding heartbeat token이 일치할 때만 PONG wait state를 해제한다. | wall-clock jump와 관련 없거나 위조된 PONG으로부터 liveness 불변식을 복구한다. 비자명하고 위험도 높은 수정이지만 heartbeat는 project-defining architecture 자체는 아니다. |
| `0c76aad19579` | `test(heartbeat): PONG 토큰과 시간 경계 검증` | A | VERIFICATION, RESILIENCE, RISK | 일치하는 PONG은 deadline을 해제하고 위조 token은 ping timeout 상태를 유지함을 증명한다. | heartbeat fix가 도입한 비자명한 token/deadline 불변식을 결정적으로 보호하며 일반 positive-path coverage보다 강한 evidence를 제공한다. |
| `881e59734a9a` | `fix(connection): 송신 대기열 계산과 재시도 상태 보호` | S | DEBUG, EVENT_IO, RISK | pending-limit arithmetic을 overflow-safe하게 만들고 send operation을 주입하며 불가능한 byte count를 검증하고 retry 결과 간 offset을 보존한다. | core partial-write state machine의 심각하고 비자명한 correctness risk를 수정한다. 전체 relay가 의존하는 exactly-once ordered delivery와 bounded-queue 불변식을 복구한다. |
| `f34ab135c546` | `test(connection): 부분 송신과 대기열 경계 검증` | A | VERIFICATION, EVENT_IO, RISK | exact limit, CRLF accounting, EINTR, EAGAIN, partial send, zero send, EPIPE, invalid count에 대한 scripted test를 추가한다. | deterministic syscall script가 앞선 S-level fix의 transport 불변식을 직접 검증하고 broad TCP test가 놓칠 수 있는 regression을 막는다. |
| `5dcd882f0763` | `fix(server): 연결 콜백 수명과 이벤트 등록 롤백 보장` | S | DEBUG, LIFECYCLE, RISK | injectable event management, registration rollback, callback 후 fd-based relookup, update-failure disconnect, non-throwing error reporting을 추가한다. | callback이나 event failure가 현재 처리 중인 `Connection`을 제거할 수 있는 project-defining reentrancy/ownership 문제를 해결한다. event-map consistency를 복구하고 server 전반의 stale object access를 막는다. |
| `928594ec160c` | `test(server): 연결 제거와 이벤트 등록 실패 경로 검증` | A | VERIFICATION, LIFECYCLE, RISK | fake event manager로 add/update failure, callback-triggered disconnect, queue-limit closure를 검증한다. | server fix가 도입한 어려운 failure path와 lifetime guarantee를 deterministic test로 고정해 ownership boundary에 대한 신뢰도를 실질적으로 높인다. |
| `728aaabc4012` | `fix(app): 응답 실패 뒤 클라이언트 상태 다시 확인` | S | DEBUG, LIFECYCLE, RISK | send failure를 전파하고 동기적 disconnect가 가능한 reply/broadcast 뒤 client와 channel을 다시 resolve한다. | response delivery가 `Server`와 `IrcApplication`을 가로지르는 synchronous lifecycle transition임을 확립한다. 재검증 규칙은 stale pointer, iterator, 잘못된 registration log, cleanup 이후 mutation을 막는 데 필수적이다. |
| `5edcafda8a4d` | `test(app): 작은 송신 한도에서 상태 정리 검증` | A | VERIFICATION, LIFECYCLE, RISK | 1-byte limit으로 welcome-response enqueue failure를 강제하고 잘못된 registration event 없이 완전한 cleanup을 확인한다. | application-side reentrant-send 불변식을 결정적으로 증명하고 contained client failure와 server failure를 구분한다. |
| `de1dd0fc30d0` | `test(event): 160개 연결과 느린 수신자 처리 공정성 검증` | A | VERIFICATION, EVENT_IO, RISK | 동시 peer 160개를 실행하고 한 recipient가 heavy output을 읽지 않는 동안 무관한 connection이 진행되는지 검증한다. | readiness registration과 connection별 buffering이 backpressure를 격리한다는 의미 있는 real-process evidence를 제공한다. benchmark가 아니라 correctness stress test다. |
| `d48e1f1f8c04` | `fix(app): 응답 실패 뒤 명령 처리를 중단` | A | DEBUG, LIFECYCLE, RISK | output failure 뒤 LIST, NAMES, compound MODE 처리를 중단하고 stale iterator 및 target state 사용을 피한다. | S-level application fix 뒤 남은 continuation gap을 닫는다. 중요한 lifecycle hardening이지만 앞서 확립된 cross-application rule보다는 범위가 좁다. |
| `aee5edebe294` | `test(app): 연결 정리 뒤 모드 변경 중단 검증` | A | VERIFICATION, LIFECYCLE, CHANNEL_STATE | `MODE +it` 중 sender removal을 주입해 앞선 `+i`는 유지되고 뒤의 `+t`는 적용되지 않음을 요구한다. | 선택한 non-transactional partial-command semantics를 정확히 고정하고 actor와 borrowed state 제거 뒤 추가 transition이 없음을 증명한다. |
| `416efc91e580` | `ci: Linux·macOS 회귀와 새니타이저 자동화` | A | BUILD, VERIFICATION, RISK | 전체 suite를 Linux와 macOS에서 실행하고 Linux ASan/UBSan 환경에서도 반복한다. | 두 event backend와 ownership-heavy failure suite를 모든 push/PR에 반복 적용한다. core runtime architecture는 아니지만 중요한 reliability infrastructure다. |
| `c32b2e2faf44` | `docs(project): 프로젝트 문서 정리` | C | - | 최종 project, protocol, architecture, development documentation을 재구성하고 확장한다. | 독자에게 유용한 문서지만 runtime behavior, test, build logic, engineering invariant를 바꾸지 않는다. |


# 개발 흐름

## 흐름: Portable readiness와 non-blocking transport

`8e8a3db87950` A — 공통 readiness 용어와 backend contract를 정의한다.
↓
`d3f74e2857da` B — 논리적 interest 변경을 kqueue filter에 매핑한다.
↓
`769cd3094f71` B — kqueue notification을 공통 event로 변환한다.
↓
`2284a0e0d8bb` B — 논리적 interest 변경을 epoll registration에 매핑한다.
↓
`f1320f357bca` B — epoll notification과 socket error를 공통 event로 변환한다.
↓
`8864f253ac15` A — move-only `Connection`과 I/O outcome model을 정의한다.
↓
`d71a2549c0eb` A — exactly-once descriptor ownership과 move transfer를 구현한다.
↓
`9b601b69de4f` A — incremental IRC framing과 line-size boundary를 확립한다.
↓
`b00589d4b1b1` A — non-blocking receive state machine을 구현한다.
↓
`a10fe961e2b1` S — 지속적인 partial-write 진행과 graceful output draining을 구현한다.
↓
`e6492e27cc30` A — `Server` ownership과 transport callback boundary를 정의한다.
↓
`4ad1227e5119` A — accepted descriptor를 connection 및 event ownership에 통합한다.
↓
`378d5304828d` S — portable event loop를 실제로 동작하게 만든다.
↓
`625ffc924de8` A — pending output을 write readiness와 close completion에 연결한다.
↓
`7a6bc7e1276a` A — transport removal과 disconnect notification을 중앙화한다.

**의미**

이 흐름은 portable event vocabulary에서 실제로 동작하는 single-threaded reactor까지 server를 구축한다. 결정적인 선택은 platform call 자체가 아니라 native readiness와 server semantics의 분리, move-only connection별 state machine, 지속적인 partial-write 진행, authoritative server cleanup path다. 이후 reliability 작업은 이 ownership 및 I/O contract에 직접 의존한다.

## 흐름: Protocol boundary, identity, registration

`a22bf6ddbd75` B — structured IRC message representation을 도입한다.
↓
`c31a32b6cb24` A — line grammar와 parameter parsing boundary를 정의한다.
↓
`aeb1e9b709b9` B — canonical server message, numeric, hostmask를 추가한다.
↓
`991b76b8d793` B — descriptor-keyed registration state를 저장한다.
↓
`b47135c51cfc` A — case-insensitive nickname index 불변식을 확립한다.
↓
`0b5ae6aef328` S — `IrcApplication`을 `Server` 위의 protocol/domain coordinator로 정의한다.
↓
`2ed9331124bb` A — transport lifecycle callback을 client state, parsing, cleanup에 연결한다.
↓
`035e1137e0dd` A — pre-registration command gate를 중앙화한다.
↓
`582317254e24` B — password authorization state를 추가한다.
↓
`80a639321bad` B — nickname validation과 collision handling을 추가한다.
↓
`d9e420b570a0` B — PASS/NICK/USER registration과 welcome reply를 완성한다.
↓
`6b4a7738a285` A — 실제 TCP에서 통합 registration 및 command path를 검증한다.

**의미**

이 흐름은 syntax, connection identity, registration authorization을 event loop에 섞지 않고 분리한다. 지속적인 핵심 결정은 application boundary와 registration gate이며, 개별 registration command는 그 결정 안에서의 일반적인 구현이다. 첫 smoke suite는 framing, parsing, identity index, reply, lifecycle transition이 올바르게 조합되는지 검증한다.

## 흐름: Channel authority, fan-out, cleanup

`786ed5d839d9` A — authoritative `Channel` aggregate를 정의한다.
↓
`966f5663dbcc` B — membership과 operator state를 구현한다.
↓
`0d0d850f007d` B — topic, invitation, mode, name rule을 구현한다.
↓
`c1762e011fd6` B — application-owned channel storage와 command lookup을 추가한다.
↓
`46e2b7785bee` A — 재사용 가능하고 중복 제거된 channel/common-peer fan-out을 도입한다.
↓
`a147d6994d58` S — nickname transition, PART, QUIT, membership removal, empty-channel erasure를 조정한다.
↓
`7ac793d3b695` B — PRIVMSG를 membership-authorized channel fan-out으로 routing한다.
↓
`22e5f82bc693` A — 핵심 JOIN transition, invite-only admission, first-member operator assignment를 구현한다.
↓
`0e601da7d2bc` B — operator authorization 아래 `+i`, `+t`를 조회·변경한다.
↓
`bce6933f69ab` B — `+o`, `-o`로 channel authority를 확장한다.

**의미**

channel 기능은 admission, fan-out, identity change, 명시적 departure, KICK, transport disconnect가 같은 state model의 지배를 받을 때만 신뢰할 수 있다. 결정적인 지점은 S-level cleanup commit이다. 모든 termination path 뒤 client, nickname, channel state를 같은 최종 상태로 수렴시키고 stale descriptor나 중복 peer notification을 막는다.

## 흐름: 운영 보호 정책과 제어된 shutdown

`c4df44554866` B — registration deadline을 추가한다.
↓
`764361c52b2a` A — idle heartbeat와 ping-timeout state를 추가한다.
↓
`9e2b214f9227` B — client별 command-rate window를 추가한다.
↓
`d7d85e518177` A — connection별 미전송 output을 제한하고 queue failure를 전파한다.
↓
`adb49d9466e4` B — live connection 수를 제한한다.
↓
`e05e35ca7da9` B — connection, command, message, queue-drop, rate-limit state를 조회 가능하게 한다.
↓
`c34aa18f89af` B — structured lifecycle, protection, aggregate metrics event를 기록한다.
↓
`dd04279c47fd` A — signal 시 즉시 중단하는 방식 대신 application shutdown과 output draining을 사용한다.
↓
`e5e6c57db80d` A — 최종 CLI, wire, timeout, rate, metric, shutdown, log-order contract를 고정한다.

**의미**

server는 단순한 protocol 처리기에서 운영 가능한 bounded process로 발전한다. 각 보호 정책은 서로 다른 resource 또는 liveness risk를 다루고, shutdown과 executable contract는 이러한 보호 정책이 public process boundary에서 어떻게 드러나는지 정의한다. 이 흐름은 이후 reentrant cleanup defect를 드러내는 failure signal도 제공한다.

## 흐름: 엄격한 runtime configuration boundary

`52b6f1ce8f0f` B — 초기 `RuntimeConfig` parsing boundary를 확립한다.
↓
`e5e6c57db80d` A — 정확한 CLI 성공/실패 동작을 executable contract로 기록한다.
↓
`b6c10bc51937` A — 관대한 C conversion을 overflow-safe target-width decimal parsing으로 대체한다.
↓
`5d1286620994` B — sign, whitespace, port narrowing, timeout bound, size_t overflow, rate-count overflow를 검증한다.

**의미**

초기 public configuration surface는 허용 syntax와 intermediate width가 문서화된 contract와 정확히 일치하지 않는 conversion function에 의존했다. fix는 destination type을 기준으로 digit-by-digit accumulation 단계에서 range check를 수행하도록 바꾸고, 후속 test는 test 자체를 두 번째 architectural decision으로 취급하지 않으면서 이 cross-platform boundary를 보존한다.

## 흐름: Heartbeat liveness 정확성

`764361c52b2a` A — heartbeat PING, PONG 대기, timeout state를 도입한다.
↓
`d710f29f38a4` B — test peer에 automatic PONG behavior를 추가한다.
↓
`f313e707474f` B — 초기 positive PING/PONG 흐름을 검증한다.
↓
`3f2b3ae1d3f9` A — timing을 `steady_clock`으로 옮기고 PONG을 정확한 outstanding token과 대응시킨다.
↓
`0c76aad19579` A — 일치하는 PONG은 deadline을 해제하고 forged PONG은 해제하지 않음을 증명한다.

**의미**

초기 기능은 liveness policy를 제공했지만 wall-clock time에 의존하고 모든 PONG을 outstanding heartbeat의 evidence로 인정했다. 수정은 실제 불변식을 복구한다. deadline 계산은 monotonic해야 하고 server의 현재 challenge에 대응하는 response만 connection을 유지할 수 있다. regression test는 forged-response failure를 결정적으로 재현한다.

## 흐름: 부분 실패에서의 output queue 정확성

`a10fe961e2b1` S — 지속적인 partial-send state와 exact-order delivery를 확립한다.
↓
`d7d85e518177` A — hard pending-output boundary와 관찰 가능한 queue-failure result를 추가한다.
↓
`881e59734a9a` S — limit arithmetic을 overflow-safe하게 만들고 모든 send outcome에서 offset state를 보호한다.
↓
`f34ab135c546` A — partial send, interruption, backpressure, zero send, terminal error, invalid return count를 script로 검증한다.

**의미**

이 흐름은 resource limit이 boundary condition을 관찰 가능하게 만든 뒤 foundational mechanism을 다시 검토하는 과정을 보여준다. 이후 fix는 feature extension이 아니라 arithmetic wraparound, 불가능한 syscall result, retry-state corruption으로부터 exactly-once output 불변식을 보호한다. send operation 주입으로 이러한 드문 condition을 재현 가능한 unit test로 바꾼다.

## 흐름: Reentrant server/application cleanup

`7a6bc7e1276a` A — 초기 erase-before-disconnect-callback cleanup path를 확립한다.
↓
`5dcd882f0763` S — 자기 connection을 제거하는 callback을 처리하고 event registration failure를 rollback한다.
↓
`928594ec160c` A — add/update failure와 callback-driven removal을 주입해 server lifetime safety를 검증한다.
↓
`728aaabc4012` S — output failure를 전파하고 disconnect 가능한 send 뒤 application state를 다시 resolve하도록 한다.
↓
`5edcafda8a4d` A — registration response failure를 강제해 application cleanup과 logging order를 검증한다.
↓
`d48e1f1f8c04` A — response failure 뒤 LIST, NAMES, compound MODE를 중단한다.
↓
`aee5edebe294` A — compound MODE에서 이미 완료된 변경은 유지하되 sender 제거 뒤 이후 transition은 실행하지 않음을 증명한다.

**의미**

어려운 integration 문제는 겉보기에는 local한 send나 callback이 connection, client record, membership, 경우에 따라 caller가 참조 중인 channel까지 동기적으로 제거할 수 있다는 점이다. server fix는 descriptor와 event-registry ownership을 복구하고, application fix는 같은 규칙을 domain state로 일반화한다. 후속 commit과 test는 선택한 semantics를 세밀하게 정의한다. 앞선 mutation은 transactional rollback하지 않지만 actor lifecycle이 끝난 즉시 command processing을 중단해야 한다.

## 흐름: 검증 성숙도와 portability 강제

`6b4a7738a285` A — 첫 전체 real-TCP smoke flow를 추가한다.
↓
`e5e6c57db80d` A — substring 중심 검증을 exact CLI, frame, shutdown contract로 대체한다.
↓
`f34ab135c546` A — deterministic `Connection` failure-state test를 추가한다.
↓
`928594ec160c` A — deterministic `Server` ownership 및 rollback test를 추가한다.
↓
`5edcafda8a4d` A — deterministic application cleanup verification을 추가한다.
↓
`de1dd0fc30d0` A — 160-peer readiness와 slow-receiver isolation evidence를 추가한다.
↓
`416efc91e580` A — 전체 suite를 Linux/macOS와 ASan/UBSan 환경에서 실행한다.

**의미**

검증은 광범위한 기능 통합에서 exact public contract, 주입된 transport/event failure, application-lifetime test, real-process descriptor pressure로 발전한다. CI commit은 같은 evidence를 두 readiness backend와 dynamic memory·undefined-behavior check에서 반복 가능하게 만든다. 개별 test 하나가 절대적인 fairness나 모든 failure class를 증명하지는 않지만, 전체적으로 verification structure를 architecture의 최고 위험 boundary에 맞춘다.


# 가장 중요한 커밋

## feat(connection): 부분 송신 대기열 처리

커밋: `a10fe961e2b1`

중요도: S

태그: CORE, EVENT_IO, LIFECYCLE

### 문제

writable readiness notification이 발생했다고 해서 kernel이 IRC frame 전체를 받아준다는 보장은 없다. 올바른 single-threaded server는 interruption, temporary backpressure, short send, peer termination이 발생해도 byte를 중복 전송하거나 suffix를 버리거나 loop를 막거나 이미 queue된 response를 보낼 기회도 없이 connection을 닫아서는 안 된다.

### 결정

output 진행 상태를 지속적인 byte buffer와 `writeOffset_`의 조합으로 표현한다. 미전송 suffix만 보내고 `EINTR`은 재시도하며, `EAGAIN` 또는 `EWOULDBLOCK`에서는 정상적으로 중단하고 다음 writable event를 위해 offset을 유지한다. close request는 state로 저장해 queue를 drain할 수 있게 한다. line output은 CRLF 하나로 정규화하되 transport-level frame을 위한 raw-byte path는 유지한다.

### 중요한 이유

완성된 설계 주변의 단순 optimization이 아니라 non-blocking output을 가능하게 하는 핵심 correctness mechanism이다. 모든 reply, private message, channel fan-out, heartbeat, shutdown error가 궁극적으로 이 ordered, exactly-once progress model에 의존한다.

### 변경 내용

`Connection::flushPending()`에 non-blocking send loop와 명시적인 write result를 추가하고, queue된 byte가 event 사이에 지속되도록 했으며, 전송 완료된 buffer는 reset하거나 compact하도록 했다. `queueLine()`에는 canonical IRC framing을 추가했다. 지원되는 환경에서는 send 측 `SIGPIPE`를 억제해 peer closure가 정상적인 error path로 남도록 했다.

### 프로젝트 이해에서의 의미

이 server는 syscall 한 번에 command 하나를 처리하는 code보다 지속적인 state machine의 집합으로 이해하는 것이 적절하다. 이 commit은 이후 queue limit, event-interest management, partial-send test, lifecycle fix가 보완하는 transport state machine을 제공한다.

## feat(server): 준비 이벤트 루프 구동

커밋: `378d5304828d`

중요도: S

태그: CORE, ARCH, EVENT_IO

### 문제

listener, portable event manager, connection별 state가 각각 component로 존재했지만 descriptor를 등록하고 readiness를 기다리며 listener와 client event를 구분해 work를 dispatch하고, 이미 obsolete한 event batch를 더 처리하지 않은 채 중단하는 하나의 authoritative runtime이 필요했다.

### 결정

`start()`, `run()`, `pollOnce()`를 server lifecycle로 삼는다. abstract event manager를 통해 listener를 등록하고 descriptor identity를 기준으로 listener readiness와 client readiness를 별도로 dispatch하며, startup 전 polling은 거부하고 반환된 event 사이에 stop state를 확인한다. test와 executable이 동일한 dispatch path를 사용하도록 `pollOnce()`는 public으로 유지한다.

### 중요한 이유

portability abstraction과 `Connection` abstraction을 실제 execution model로 바꾸는 commit이다. 이후 모든 protocol behavior가 어떻게 진행 기회를 얻는지, callback·shutdown·deterministic test가 system에 어떤 경로로 들어오는지를 결정한다.

### 변경 내용

server에 backend 생성, listener registration, main readiness wait, listener-error handling, accept dispatch, client-event delegation, run-loop termination, loop 종료 뒤 중앙화된 cleanup을 추가했다.

### 프로젝트 이해에서의 의미

project의 중심 architectural claim은 Linux와 macOS에서 동작하는 single-process, single-event-loop IRC server다. 이 commit에서 그 주장이 interface 표현을 넘어 실제로 동작하는 형태가 된다.

## feat(app): IRC 동작 조율 계약 정의

커밋: `0b5ae6aef328`

중요도: S

태그: CORE, ARCH, INTEGRATION

### 문제

socket readiness와 IRC semantics는 서로 다른 ownership rule을 가진다. registration, nickname state, channel state, command dispatch, reply, cleanup을 `Server` 안에 직접 넣으면 transport failure와 protocol transition이 분리되지 않아 test와 reasoning이 어려워진다.

### 결정

server의 connect, line, disconnect callback과 정확히 대응하는 public surface를 가진 protocol coordinator로 `IrcApplication`을 도입한다. descriptor ownership, buffering, readiness는 `Server`에 유지하고, password policy, client/channel state, command handler, reply, protocol-aware cleanup은 application에 둔다.

### 중요한 이유

이 boundary가 완성된 architecture와 이후 모든 failure propagation을 결정한다. IRC state가 없는 transport test, server/event backend를 주입한 application test, transport operation이 application-owned object를 언제 invalidate할 수 있는지에 대한 명시적인 reasoning이 가능해진다.

### 변경 내용

application이 소유하는 dependency와 state, callback entry point, registration 및 connection-control handler declaration, reply/prefix helper, close request, client-removal responsibility를 정의했다.

### 프로젝트 이해에서의 의미

이후 S-level fix는 이 분리를 전제로 해야 이해할 수 있다. `Server`가 connection을 동기적으로 제거할 수 있는 동안 `IrcApplication`은 그 connection에서 파생된 client 또는 channel state를 보유할 수 있다. 이 boundary는 integration risk를 만들지만 동시에 올바른 수정도 가능하게 한다.

## feat(channel): 구성원 정리와 식별자 변경 방송

커밋: `a147d6994d58`

중요도: S

태그: CORE, CHANNEL_STATE, LIFECYCLE

### 문제

하나의 client identity가 descriptor registry, nickname index, 0개 이상의 channel aggregate에 동시에 참여한다. nickname change, PART, QUIT, transport disconnect에서는 올바른 peer에 알린 뒤 순회 중인 container를 invalidate하거나 여러 shared channel을 통해 notification을 중복 전송하지 않고 모든 stale reference를 제거해야 한다.

### 결정

명시적인 channel departure를 중앙화하고 mutation 전에 channel name과 client identity를 snapshot한다. common peer를 deduplicate한 set으로 계산하고 old state가 아직 의미 있을 때 transition을 broadcast한 다음, 모든 channel에서 membership과 operator state를 제거하고 빈 channel을 지우며 마지막으로 client와 nickname index를 제거한다. NICK broadcast에는 old hostmask를 사용한다.

### 중요한 이유

authoritative shared-state cleanup 불변식을 확립한다. happy path에서 message를 잘 relay하더라도 disconnected descriptor가 channel에 남는 server는 올바르지 않다. 이후 fan-out, authorization, NAMES result, operator state가 모두 unsafe하거나 잘못될 수 있다.

### 변경 내용

application에 `partChannel()`, `partAllChannels()`, empty-channel erasure, QUIT peer collection, full disconnect cleanup, common peer와 변경 client 자신을 대상으로 한 registered NICK broadcast를 추가했다.

### 프로젝트 이해에서의 의미

channel command는 고립된 handler가 아니라 underlying connection의 lifecycle을 따라야 하는 shared-state graph를 조작한다. 이후 reentrant-send failure가 이 관계를 더 어렵게 만들기 전 단계에서, 이 commit은 그 관계를 가장 명확하게 보여준다.

## fix(connection): 송신 대기열 계산과 재시도 상태 보호

커밋: `881e59734a9a`

중요도: S

태그: DEBUG, EVENT_IO, RISK

### 문제

초기 pending-output limit은 wraparound될 수 있는 덧셈을 사용했고, partial-send loop는 모든 양수 send count를 암묵적으로 신뢰했다. arithmetic overflow, zero-byte send, interrupted call, 반복 backpressure, terminal error, 요청한 suffix보다 큰 count 같은 드문 결과가 queue accounting을 손상시키거나 offset을 유효 데이터 바깥으로 이동시킬 수 있었다.

### 결정

subtraction 기반 overflow-safe check로 capacity를 계산하고 line payload와 CRLF를 별도로 계산하며 이미 invalid한 pending state를 거부한다. 모든 syscall outcome을 test할 수 있도록 send operation을 주입하고, 양수 결과가 요청한 size를 절대 넘지 않는지 검증하며 zero, retryable, terminal failure path에서 queue된 byte와 offset을 보존한다.

### 중요한 이유

가장 기본적인 transport layer에서 exactly-once, in-order output 불변식을 복구한다. defect class가 심각하면서도 비자명하다. broad TCP test로 이러한 return sequence를 강제하기는 어렵지만 상태가 손상되면 모든 protocol response와 fan-out path에 영향을 준다.

### 변경 내용

`ConnectionLimits.hpp`에 safe limit arithmetic을 추가하고 `Connection`이 send operation을 받도록 했으며 move operation이 이를 보존하도록 했다. `flushPending()`은 불가능한 count를 방어하고 line queueing은 두 번의 overflow-safe capacity check를 수행한다.

### 프로젝트 이해에서의 의미

project가 그럴듯한 non-blocking code에서 명시적으로 검증된 state machine으로 발전하는 과정을 보여준다. 바로 뒤에 추가된 scripted unit-test architecture가 필요한 이유도 설명한다.

## fix(server): 연결 콜백 수명과 이벤트 등록 롤백 보장

커밋: `5dcd882f0763`

중요도: S

태그: DEBUG, LIFECYCLE, RISK

### 문제

connect 또는 line callback은 다시 `Server::disconnect()`를 호출해 server가 현재 reference로 사용 중인 `Connection`을 지울 수 있다. 별도로 event interest add/update 실패는 authoritative connection map과 kernel event registry를 불일치하게 만들 수 있었다. server가 다른 failure를 처리하는 도중 error handler가 예외를 던질 가능성도 있었다.

### 결정

event-manager injection을 허용하고 accepted connection을 외부에 노출하기 전에 authoritative map에 삽입한다. event registration이 실패하면 삽입을 rollback하고, retained object reference 대신 descriptor로 work를 식별한다. 모든 callback 또는 write operation 뒤 `Connection`을 다시 찾고, interest refresh를 descriptor 기반이자 실패를 보고하는 operation으로 만들며, update failure에서는 disconnect하고 error handler 예외는 내부에서 차단한다.

### 중요한 이유

reentrancy와 partial failure 상황에서 server ownership model의 root cause를 수정한다. 없으면 정상적인 callback freedom이 use-after-free behavior로 이어질 수 있고, event registration failure가 descriptor를 두 authoritative structure 중 하나에만 남길 수 있다.

### 변경 내용

`Server`에 injectable-backend constructor, startup/accept rollback, fd-based `refreshInterest()`, callback 이후 relookup, update-failure cleanup, non-throwing error reporting을 추가했다.

### 프로젝트 이해에서의 의미

single-threaded code라고 해서 자동으로 lifetime-safe한 것은 아니라는 점을 보여준다. reentrant callback은 ownership을 동기적으로 변경할 수 있으므로 callback boundary를 넘는 stable handle은 이전에 얻은 reference가 아니라 descriptor identity여야 한다.

## fix(app): 응답 실패 뒤 클라이언트 상태 다시 확인

커밋: `728aaabc4012`

중요도: S

태그: DEBUG, LIFECYCLE, RISK

### 문제

pending-output limit과 event-update failure handling이 추가된 뒤 `sendTo()`가 client를 동기적으로 disconnect할 수 있게 되었다. disconnect callback은 command handler가 다시 실행되기 전에 client record, nickname index, membership, 경우에 따라 channel 전체를 제거해 cache된 pointer, reference, iterator를 invalid하게 만들 수 있었다.

### 결정

raw/numeric send helper가 성공 여부를 반환하도록 한다. multi-step handler에서는 send 전에 stable identifier를 복사하고 실패 시 중단하거나 이후 read/mutation 전에 client와 channel을 다시 찾는다. JOIN, PART, KICK, NICK, INVITE, registration reply, topic/NAMES reply, heartbeat state ordering에 이 규칙을 적용한다. registration 및 heartbeat metric은 대응 frame이 accepted된 뒤에만 기록한다.

### 중요한 이유

초기 architecture에는 없던 cross-layer 불변식을 확립한다. output delivery는 실패하지 않는 side effect가 아니라 lifecycle transition이 될 수 있다. 이 규칙을 위반하면 use-after-free behavior, iterator invalidation, 잘못된 log, actor가 사라진 뒤의 mutation이 발생할 수 있다.

### 변경 내용

response helper를 `void`에서 `bool`로 바꾸고 handler에 early return, stable-value copy, client-existence check, channel re-resolution을 추가했다. NAMES는 353/366 ordering을 유지하고, registration은 모든 welcome numeric 전송 성공 뒤에만 logging하며, heartbeat state는 파괴 가능성이 있는 send 전에 commit하도록 했다.

### 프로젝트 이해에서의 의미

완성된 history의 핵심 integration 교훈이다. transport layer의 올바른 failure behavior가 application-layer invalidation event가 되며, 모든 command sequence는 이 사실을 전제로 작성해야 한다.

## fix(heartbeat): 단조 시계와 토큰으로 응답 대기 상태 관리

커밋: `3f2b3ae1d3f9`

중요도: A

태그: DEBUG, RESILIENCE, RISK

### 문제

wall-clock time은 elapsed duration과 독립적으로 움직일 수 있고, 초기 PONG handler는 모든 PONG에서 heartbeat wait state를 해제했다. 따라서 client가 잘못된 challenge에 응답하고도 살아남거나 clock adjustment로 timeout behavior가 왜곡될 수 있었다.

### 결정

connection, activity, ping, rate-window time을 `steady_clock` time point로 표현한다. unique serial heartbeat token을 생성해 client state에 저장하고, PONG parameter가 정확히 하나이며 해당 token과 일치할 때만 pending deadline을 해제한다.

### 중요한 이유

단순 implementation detail 변경이 아니라 의도한 liveness contract를 복구한다. 관련 없거나 forged response가 server challenge를 만족시키지 못하게 하고 timeout 계산을 elapsed time에 기반하게 만든다.

### 변경 내용

client time field와 command window를 monotonic type으로 옮기고 timeout comparison에 `chrono::seconds`를 사용했다. heartbeat 생성 시 outstanding token을 저장하고 PONG validation을 exact matching으로 변경했다.

### 프로젝트 이해에서의 의미

transport core 밖에서 작은 state-machine assumption이 의미 있는 reliability defect로 이어진 가장 명확한 사례다. 후속 test는 허용되는 transition과 거부되는 forged transition을 모두 어떻게 검증해야 하는지 보여준다.

## test(irc): 실행 조건과 오류 동작 계약 검증

커밋: `e5e6c57db80d`

중요도: A

태그: VERIFICATION, IRC_PROTOCOL, RISK

### 문제

smoke client는 주로 substring을 검색했다. CLI diagnostic, 정확한 frame order와 CRLF termination, hostmask, numeric parameter 위치, metric key order, shutdown delivery, connection closure, structured log ordering을 완전히 고정하지 못했다. 따라서 외부에서 관찰 가능한 미묘한 regression이 broad functional check를 통과할 수 있었다.

### 결정

CLI failure case, IRC frame, registration, channel behavior, rate limiting, heartbeat, metrics, shutdown ERROR delivery, process termination, lifecycle-log order를 위한 exact contract runner를 만든다. peer helper에 exact-next-frame, exact-match, regex, CRLF, close-wait, hostmask 지원을 추가하고 smoke harness에서 같은 live process를 대상으로 contract를 실행한다.

### 중요한 이유

repository가 public executable surface에 대해 주장할 수 있는 범위를 실질적으로 바꾼다. 이후 commit에서 strict numeric parsing, heartbeat correlation, shutdown-order 문제를 드러내는 evidence base도 제공한다.

### 변경 내용

`tests/irc_contract.py`를 추가하고 `tools/irc_smoke_client.py`를 강화했으며 harness의 Python bytecode artifact를 비활성화했다. smoke behavior 뒤 contract를 실행하고 server에 signal을 보낸 뒤 종료를 기다리며, optional normalized manifest도 출력하도록 했다.

### 프로젝트 이해에서의 의미

완성된 server는 internal class뿐 아니라 CLI, TCP wire, stdout/stderr, log, exit state로도 정의된다. 이 commit은 이러한 external contract를 명시하고 project verification이 demonstration에서 specification으로 발전한 과정을 보여준다.
