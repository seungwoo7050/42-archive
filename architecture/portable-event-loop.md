# 운영체제별 이벤트 루프의 공통 인터페이스

서버는 Darwin의 `kqueue`와 Linux의 `epoll`을 같은 이벤트 형식으로 사용한다.
파일 디스크립터를 등록하고 준비 상태를 처리하는 과정과 두 백엔드 사이에 남아 있는
차이는 다음과 같다.

```text
fd 등록·변경·제거
읽기 준비
쓰기 준비
소켓 오류
상대 종료·hangup
대기 중 시그널 인터럽트
```

여기서 운영체제 독립성은 모든 환경을 지원한다는 뜻이 아니다. 현재 빌드는 Darwin과 Linux만 선택하며, 상위 `Server`가 `kevent`나 `epoll_event`의 세부 형식을 알지 않아도 된다는 의미이다.

## 공통 인터페이스

[`EventManager`](../include/EventManager.hpp)는 앞으로 감시할 관심 상태와 이번 대기에서 관찰한 결과를 나눈다.

```text
EventInterest
- None
- Read
- Write

Event
- fd
- interests: 이번 대기에서 준비된 Read/Write
- error
- hangup
- errorCode
```

공개 동작은 다음 네 가지이다.

```text
addFd(fd, interests)
updateFd(fd, interests)
removeFd(fd)
wait(timeoutMs) -> vector<Event>
```

`addFd()`와 `updateFd()`에 전달하는 값은 이후에 감시할 관심 집합이다. 반면 `wait()`가 반환하는 `Event::interests`는 실제로 준비된 상태이다. 오류와 연결 종료는 별도 필드이므로 읽기 준비와 `hangup`을 함께 전달할 수 있다. 서버는 이를 바탕으로 남은 입력이나 출력을 처리한 뒤 연결을 정리한다.

`EventManager::createDefault()`는 `unique_ptr<EventManager>`를 반환한다. 이벤트 큐의 파일 디스크립터는 각 백엔드 객체가 소유하고 소멸할 때 닫는다. `Server`는 구체적인 큐의 수명 관리에 관여하지 않는다.

## 백엔드가 지켜야 할 계약

`kqueue`는 파일 디스크립터별 이전 관심 집합을 기억해 필터의 차이만 반영하고,
`epoll`은 전체 관심 마스크를 `ADD` 또는 `MOD`로 교체한다. 두 구현 모두 읽기,
쓰기, 오류와 종료를 공통 `Event`로 변환해야 한다. 테스트에서는 가짜
`EventManager`를 주입해 등록·갱신 실패와 callback의 연결 제거·예외를 원하는
순서로 만들 수 있다.

## 빌드 시 백엔드 선택

[`Makefile`](../Makefile)은 실행 중이 아니라 빌드할 때 백엔드를 선택한다.

| `uname -s` | 컴파일하는 소스 | 전처리 정의 |
|---|---|---|
| `Darwin` | `src/KqueueEventManager.cpp` | `IRC_USE_KQUEUE` |
| `Linux` | `src/EpollEventManager.cpp` | `IRC_USE_EPOLL` |
| 그 밖의 값 | Make 오류 | 없음 |

두 구현은 모두 `EventManager::createDefault()`를 정의하지만 한 번에 하나만 링크되므로 중복 정의가 생기지 않는다. 실행 중 백엔드를 바꾸거나 지원되지 않는 환경으로 대체하는 경로는 없다.

[`KqueueEventManager.cpp`](../src/KqueueEventManager.cpp)의 전처리 조건은 Apple뿐 아니라 FreeBSD, NetBSD, OpenBSD도 허용한다. 다만 Makefile은 `Darwin`에서만 이 파일을 선택한다. 소스가 컴파일 조건을 갖췄다는 사실만으로 다른 BSD 환경의 프로젝트 빌드까지 지원한다고 볼 수는 없다.

## 관심 집합 변경

상위 호출 형식은 같지만 두 백엔드는 운영체제 API에 맞는 방식으로 관심 집합을 바꾼다.

### `epoll`: 전체 마스크 교체

[`EpollEventManager.cpp`](../src/EpollEventManager.cpp)는 관심 집합 전체를 네이티브 마스크로 변환한다.

```text
처음 보는 fd       → EPOLL_CTL_ADD
이미 등록된 fd     → EPOLL_CTL_MOD
None으로 갱신      → removeFd → EPOLL_CTL_DEL
```

마스크에는 관심 집합과 관계없이 `EPOLLERR | EPOLLHUP`가 포함된다. 읽기 관심에는 `EPOLLIN`과 지원 환경의 `EPOLLRDHUP`, 쓰기 관심에는 `EPOLLOUT`이 추가된다.

두 백엔드는 관심 집합을 `unordered_map`에도 보관한다. 이미 등록한 파일 디스크립터에 `addFd()`를 호출하면 `updateFd()`로, 등록하지 않은 파일 디스크립터에 `updateFd()`를 호출하면 `addFd()`로 넘긴다. 상위 호출이 두 연산을 정확히 구분하지 못해도 백엔드가 이를 보정한다.

### `kqueue`: 필터 차이만 반영

[`KqueueEventManager.cpp`](../src/KqueueEventManager.cpp)는 이전 관심 집합과 새 관심 집합의 차이만 적용한다.

```text
Read:  없었고 필요함 → EVFILT_READ, EV_ADD | EV_ENABLE
Read:  있었고 불필요 → EVFILT_READ, EV_DELETE
Write: 없었고 필요함 → EVFILT_WRITE, EV_ADD | EV_ENABLE
Write: 있었고 불필요 → EVFILT_WRITE, EV_DELETE
```

읽기와 쓰기가 별도 필터이므로 한쪽만 달라지면 해당 필터만 변경한다. 관심 집합이 `None`이면 등록된 필터를 각각 제거한다.

`applyInterestChange()`는 Read와 Write filter를 두 번의 `kevent()` 호출로
차례로 바꾸고 마지막에만 `interests_` map을 갱신한다. 첫 filter는 성공하고
둘째 filter가 실패하면 kernel 상태 일부만 바뀌고 map은 이전 값을 유지한다.
이를 되돌리는 rollback은 없다.

`epoll`도 `EPOLL_CTL_ADD` 성공 뒤 `interests_[fd]` map node 할당이 실패하면
kernel과 사용자 map이 어긋날 수 있다. 상위 `Server`가 연결 map을 되돌리는
것과 backend 내부의 kernel/map 변경이 원자적이라는 주장은 다르다.

## 준비 이벤트 변환

| 의미 | `epoll` 입력 | `kqueue` 입력 | 공통 결과 |
|---|---|---|---|
| 읽기 가능 | `EPOLLIN` | `EVFILT_READ` | `EventInterest::Read` |
| 쓰기 가능 | `EPOLLOUT` | `EVFILT_WRITE` | `EventInterest::Write` |
| 소켓 오류 | `EPOLLERR` | `EV_ERROR` | `error=true` |
| 연결 종료 | `EPOLLHUP`, `EPOLLRDHUP` | `EV_EOF` | `hangup=true` |
| 오류 번호 | `getsockopt(SO_ERROR)` | `kevent.data` | `errorCode` |
| EOF 부가 상태 | 별도로 저장하지 않음 | `kevent.fflags` | `hangup`일 때 `errorCode` |

`epoll_event` 한 항목에는 읽기, 쓰기, 종료 비트가 함께 들어올 수 있다. 구현은 이를 하나의 `Event`에 합친다. `kqueue`는 읽기와 쓰기 필터가 별도 항목이므로 같은 파일 디스크립터가 한 번의 `wait()` 결과에 여러 번 나타날 수 있다. 구현은 이 항목들을 합치지 않는다.

[`Server.cpp`](../src/Server.cpp)는 같은 파일 디스크립터의 이벤트를 차례로 처리한다. 첫 이벤트에서 연결이 제거되면 다음 이벤트를 처리할 때 맵 조회가 실패하고 곧바로 반환한다. 따라서 이미 해제한 `Connection`을 다시 참조하지 않는다.

이 재조회는 이전 포인터의 UAF를 막지만 fd generation을 검증하지 않는다.
callback의 reentrant poll이나 같은 native batch 처리 사이에 fd가 닫히고 새
연결에 재사용되면, 오래된 event가 같은 숫자의 새 `Connection`에 적용될 수
있다. 기본 application callback은 poll을 재진입하지 않지만 interface는
generation token으로 ABA를 거부하지 않는다.

오류 번호도 두 백엔드에서 완전히 같은 뜻은 아니다. `epoll`은 `EPOLLERR`가 있을 때 `SO_ERROR`를 읽고, `kqueue`는 `EV_ERROR`의 `data` 또는 `EV_EOF`의 `fflags`를 사용한다. 현재 서버는 `event.error`일 때만 오류 문자열을 만들며 `hangup`의 숫자를 별도 정책에 사용하지 않는다.

## 대기와 시그널 인터럽트

두 구현은 한 번에 최대 128개의 네이티브 이벤트를 받는다.

| 백엔드 | 대기 호출 | 시간 제한 변환 |
|---|---|---|
| `epoll` | `epoll_wait` | 밀리초를 그대로 사용하며 음수는 무기한 대기 |
| `kqueue` | `kevent` | 0 이상의 밀리초를 `timespec`으로 변환하며 음수는 null 포인터를 전달 |

`EINTR`가 발생하면 예외를 던지지 않고 빈 `vector<Event>`를 반환한다. 시그널 처리기는 전역 실행 플래그만 바꾸므로, `pollOnce()`가 빈 결과로 돌아오면 바깥 반복문의 조건을 다시 평가할 수 있다. 다른 대기 오류는 `system_error`로 전달되고 최상위 예외 처리 경로에서 서버가 종료된다.

한 번에 준비된 이벤트가 128개를 넘으면 나머지는 다음 대기에서 처리한다. 두 백엔드는 기본 `level-trigger` 방식을 사용하므로 계속 준비된 파일 디스크립터는 다시 관찰할 수 있다.  실제 프로세스 검사는 160개 연결이 각자 PING을 보낸 뒤 모두 자신의 PONG을 받는지 확인한다. 응답 순서와 처리량을 고정하지는 않으며, 첫 네이티브 배치 밖의 연결도 후속 대기에서 진행하는지를 본다.

수신 소켓이 준비되면 `acceptReadyClients()`는 `accept()`가 `EAGAIN` 또는
`EWOULDBLOCK`을 반환할 때까지 반복한다. 한 이벤트에서 수락할 개수 예산이
없으므로 연결 시도가 계속 쌓이는 상황의 기존 연결 최대 지연을 보장하지
않는다. 160개 연결 검사는 모든 연결의 진행을 확인하지만 수락 폭주 중
지연 상한이나 플랫폼별 처리량을 재는 검사는 아니다.

같은 무예산 drain은 client I/O에도 있다.

- read-ready: `recv()`를 `EAGAIN`·EOF·오류까지 반복하고 모든 완성 frame을
  vector에 모은다.
- write-ready: queue가 비거나 `EAGAIN`·오류가 날 때까지 `send()`를 반복한다.

따라서 native wait의 128개 batch는 event 개수만 제한하며 하나의 event가
소비하는 accept 수, byte와 frame 수를 제한하지 않는다. 지속적인 fast sender나
항상 쓰기 가능한 큰 queue가 다른 event의 최대 지연을 얼마나 늘릴지에 대한
공정성 보장은 없다.

## 서버의 이벤트 처리 순서

`Server::pollOnce()`의 흐름은 다음과 같다.

```text
EventManager::wait(timeout)
→ 결과 순서대로 Event 순회
  → stopRequested면 중단
  → 수신 소켓 fd면
       error: 예외
       Read: acceptReadyClients()
       그 뒤 continue
  → client fd면 handleClientEvent()
```

클라이언트 이벤트에서는 다음 순서로 처리한다.

1. `event.error`이면 연결을 즉시 제거한다.
2. 읽기 준비 상태이고 종료 요청 전이면 가능한 입력을 읽어 완성된 줄을 전달한다.
3. 연결이 남아 있고 쓰기 준비 상태이며 출력이 있으면 송신한다.
4. `hangup`이고 출력이 없으면 연결을 제거한다.
5. 연결이 남아 있으면 현재 상태에 맞춰 읽기와 쓰기 관심을 다시 계산한다.

오류와 읽기 준비가 동시에 와도 오류가 우선한다. 반면 오류 없이 `hangup`과 읽기 준비가 함께 오면 남은 입력을 먼저 처리할 수 있다. 종료 요청이 있더라도 출력이 남아 있으면 쓰기 관심을 유지한다.

## 실패 처리와 소유권

`epoll_create1()`이나 `kqueue()`가 실패하면 생성자가 `system_error`를 던진다. `Server::start()`는 `listen` 소켓을 만들기 전에 이벤트 백엔드를 생성하므로 이 시점에는 `listen` 소켓이 없다. 이미 만든 이벤트 큐 파일 디스크립터는 구현 객체가 정리한다.

네이티브 등록 변경이 실패하면 호출 위치에 따라 처리 범위가 달라진다. 수신
소켓 등록이 실패하면 listen 소켓과 이벤트 관리자 소유권을 정리하고 시작
예외를 전달한다. 새 연결은 먼저 서버 맵이 소유하고 이벤트 등록을 시도하며,
등록 실패 시 맵에서 지워 파일 디스크립터를 닫고 다음 연결을 계속 받는다.
기존 연결의 관심 상태 갱신이 실패하면 오류를 보고한 뒤 해당 연결을
`disconnect()`로 정리한다. 실패한 쓰기 관심 갱신은 `sendTo()`의 성공으로
보고하지 않는다.

명시적 제거에서는 `ENOENT`와 `EBADF`를 이미 정리된 상태로 보고 무시한다. 다른 제거 오류가 발생해도 `Server::disconnect()`는 이를 기록한 뒤 사용자 공간의 연결 맵과 IRC 상태를 계속 정리한다.

그러나 backend `removeFd()`는 그런 오류에서 자체 `interests_` 항목을 지우기
전에 예외를 던진다. socket은 상위 cleanup에서 닫혀도 stale map entry가 남을
수 있다. 같은 fd 숫자가 재사용되면 epoll은 새 ADD 대신 MOD를 시도할 수 있고,
kqueue는 이미 Read filter가 있다고 오인해 필요한 ADD를 생략할 수 있다.
Fake event manager 검사는 remove 실패와 이후 fd 재사용을 만들지 않는다.

연결·줄 콜백이 현재 연결을 제거한 뒤 예외를 던질 수 있으므로 서버는 콜백 뒤
호출 전의 `Connection*`를 다시 사용하지 않는다. 파일 디스크립터로 현재
연결을 조회하고, 이미 사라졌다면 해당 이벤트 처리를 끝낸다. 오류 처리기에서
다시 예외가 나더라도 롤백을 중단하지 않도록 보고 경계도 `noexcept`로
닫았다.

connect, line, disconnect callback catch는 `std::exception`에 한정된다.
`EventManager::wait()`가 만드는 vector allocation과 connection read buffer
allocation도 이 callback catch 밖이다. 따라서 “개별 client 실패가 모두
격리된다”가 아니라 선택한 backend·callback `std::exception` 경로를 연결
단위로 정리한다고 해석해야 한다.

`listen` 소켓의 `event.error`는 개별 연결 오류와 달리 `runtime_error`로 처리한다. 새 연결을 받을 핵심 자원을 잃었다고 보기 때문이다. `listen` 소켓에 `hangup`만 들어온 경우를 위한 별도 분기는 없다.

## 지원 범위와 검증 한계

- 상위 `Server`와 `Connection`에는 운영체제별 이벤트 구조체나 상수가 나타나지 않는다.
- 읽기와 쓰기 관심 전환, 오류와 종료 처리는 같은 상위 코드로 실행된다.
- `EINTR`는 빈 이벤트 결과로 통일되지만 이벤트 순서와 오류 번호의 세부 의미는 통일되지 않는다.
- [`irc_smoke.sh`](../tests/irc_smoke.sh)와 [`irc_contract.py`](../tests/irc_contract.py)는 현재 호스트에서 선택된 백엔드 위의 실제 TCP 흐름을 검사한다. 두 백엔드를 같은 프로세스에서 직접 비교하지는 않는다.
- [`server_lifetime_test.cpp`](../tests/server_lifetime_test.cpp)는 주입한 이벤트 관리자와 실제 루프백 소켓을 이용해 등록·갱신 실패, 연결 제거 뒤 예외를 검사한다.
- 이벤트 관리자만 따로 생성해 `EPOLLERR`, `EV_ERROR`, `half-close` 조합을 강제하는 단위 검사는 없다.
- [`irc_event_fairness.py`](../tests/irc_event_fairness.py)는 160개 동시 연결과 읽지 않는 수신자를 두고, 모든 PONG과 무관한 연결의 진행을 확인한다. 연결당 지연이나 처리량을 측정하는 벤치마크는 아니다.
- 이 검사는 유한한 4096-message flood다. 지속적인 accept/read/write producer의
  starvation, latency bound와 backend scheduling 동등성을 증명하지 않는다.
- GitHub Actions는 `ubuntu-latest`와 `macos-latest`에서 `make test`를 실행해 각각 `epoll`과 `kqueue` 경로를 빌드·검사한다. Linux에서는 같은 회귀를 ASan·UBSan 빌드로 한 번 더 실행한다.
- `listen` 소켓은 `AF_INET`으로 생성하므로 현재 서버는 IPv6 수신을 제공하지 않는다.

`Connection`은 `broken pipe`를 피하기 위해 Linux 계열에서는 `MSG_NOSIGNAL`, 지원되는 BSD와 macOS에서는 `SO_NOSIGPIPE`를 사용하며 메인 함수에서도 `SIGPIPE`를 무시한다. 이 처리는 이벤트 관리자와 별개의 플랫폼 적응이다. 지원 범위를 넓히려면 Makefile의 선택 조건과 해당 운영체제에서의 빌드·소켓 검사를 함께 추가해야 한다.
