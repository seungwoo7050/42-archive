## chore(project): 빌드 산출물 제외
서버 실행 파일, 오브젝트 파일, 의존성 파일, 런타임 로그를 무시하도록 설정해 저장소에는 머신별 빌드 산출물이나 일시적인 실행 결과 대신 소스와 설정만 기록되도록 한다. 현재 대상 이름과 기존 대상 이름에 해당하는 두 실행 파일을 모두 포함해, 커밋할 때마다 생성된 산출물을 수동으로 제거하지 않아도 ignore 정책이 두 이름 모두와 호환되도록 한다.

## feat(event): 이벤트 준비 상태 계약 정의
서버를 특정 운영체제 API에 결합하기 전에 플랫폼 독립적인 이벤트 관리 계약을 도입한다. `EventInterest`는 조합 가능한 bitmask이므로 하나의 descriptor에 읽기와 쓰기 관심 상태를 동시에 표현할 수 있고, `Event`는 준비 상태를 오류 및 hangup 상태와 분리해 전달한다. 이 구분을 통해 상위 계층이 `epoll`이나 `kqueue`의 flag 구성에 의존하지 않고, 정상 I/O와 종료 조건을 하나의 공통 의미 체계로 다룰 수 있다.

추상 `EventManager`는 추가, 갱신, 제거, timeout이 있는 대기 연산을 담당하며, `createDefault()`는 선택된 backend를 `std::unique_ptr`로 반환한다. 이 경계는 backend의 수명을 명시적으로 만들고, 서버 루프가 처리하기 전에 플랫폼별 등록 상태와 알림을 반드시 이 공통 계약으로 변환해야 한다는 불변식을 확립한다.

## feat(event): kqueue 관심 상태 등록 구현
논리적인 읽기·쓰기 관심 상태를 `kqueue`가 사용하는 독립적인 `EVFILT_READ`, `EVFILT_WRITE` filter로 변환해 BSD/macOS용 이벤트 추상화의 등록 경로를 구현한다. 각 file descriptor에 설치되어 있다고 간주하는 관심 상태를 shadow map에 기록해, 갱신 시 모든 등록을 다시 구성하는 대신 논리 상태가 실제로 바뀐 filter만 추가하거나 삭제한다.

backend는 `kqueue` descriptor를 소유하고 소멸자에서 닫으므로 운영체제 이벤트 리소스의 수명이 객체 수명과 일치한다. 등록 실패는 `std::system_error`로 전달하고, 제거는 의도적으로 멱등하게 처리하며, 감시하던 descriptor가 이미 사라진 경우 정리 과정에서 `ENOENT` 또는 `EBADF`를 허용한다. 이에 따라 로컬 관심 상태 map은 대응하는 커널 변경이 성공한 뒤에만 갱신하고, teardown은 커널 상태가 이미 제거된 경우에도 안전하게 같은 최종 상태로 수렴한다는 수명 규칙을 확립한다.

## feat(event): kqueue 준비 이벤트 변환 구현
`kqueue` backend의 대기 경로를 완성하고 `EventManager::createDefault()`를 통해 생성할 수 있도록 한다. 밀리초 단위 timeout은 `timespec`으로 변환하며, 음수 timeout은 무기한 대기를 뜻하는 null pointer로 표현한다. signal로 대기가 중단된 경우 서버의 치명적 오류로 취급하지 않고 빈 이벤트 묶음을 반환하며, 그 외 실패는 운영체제 오류를 유지한 채 `std::system_error`로 전달한다.

각 native `kevent`를 플랫폼 독립적인 `Event` 계약으로 변환한다. descriptor 식별자는 그대로 유지하고, 읽기·쓰기 filter는 논리적인 관심 상태로 변환하며, `EV_ERROR`와 `EV_EOF`는 관련 오류 데이터와 함께 별도 상태로 노출한다. 고정 크기 native 이벤트 배열로 한 번의 대기에서 반환되는 결과 수를 제한하고, 반환 개수만큼 출력 vector의 용량을 미리 확보해 불필요한 재할당을 피한다. 따라서 상위 계층은 `kevent` 구조체나 flag 규칙을 알지 못해도 준비 상태를 처리할 수 있다.

## feat(event): epoll 관심 상태 등록 구현
공통 관심 상태 bitmask를 descriptor별 하나의 `epoll` 등록으로 매핑하는 Linux backend를 추가한다. 오류와 hangup 알림은 항상 요청하고, 읽기 가능한 socket에는 플랫폼이 지원할 경우 `EPOLLRDHUP`도 포함하며, 쓰기 준비 상태는 상위 계층에 아직 전송하지 못한 출력이 있을 때만 활성화한다. 이를 통해 descriptor의 모든 관심 상태를 독립 filter가 아니라 하나의 mask에 저장하는 `epoll`의 특성을 따르면서도 추상화의 의미를 유지한다.

backend는 `EPOLL_CLOEXEC`로 제어 descriptor를 생성해 객체 수명 동안 소유하고, shadow interest map을 유지해 add, modify, delete 연산을 명시적이고 멱등하게 처리한다. 등록되지 않은 항목의 갱신은 add로 처리하고, `None`은 제거로 변환하며, map은 `epoll_ctl` 성공 후에만 변경한다. 이미 없거나 닫힌 descriptor의 정리는 허용하지만, 그 밖의 등록 실패는 `std::system_error`로 노출해 서버가 커널 상태와 조용히 불일치한 채 동작하지 않도록 한다.

## feat(event): epoll 준비 이벤트 변환 구현
Linux backend의 대기 경로를 완성하고 공통 factory를 통해 노출한다. `epoll_wait` 결과를 `kqueue` 구현과 동일한 descriptor, 준비 상태, 오류, hangup 필드로 변환하며, 플랫폼이 지원하는 경우 `EPOLLRDHUP`를 통해 half-close도 감지한다. `EPOLLERR` flag 자체에는 대기 중인 socket 오류 값이 포함되지 않으므로 backend가 `SO_ERROR`를 조회해 해당 값 또는 `getsockopt` 실패를 보고한다.

다른 backend와 마찬가지로 signal에 의해 대기가 중단되면 빈 묶음을 반환하고, 그 밖의 대기 실패는 그대로 전달한다. 고정된 128개 native 이벤트 배열로 한 번의 poll 결과를 제한한다. 이 커밋으로 Linux에서도 이식성 경계가 실제로 동작하게 된다. 서버는 빌드 시 backend를 선택하되 지원하는 두 이벤트 API에서 동일한 이벤트 표현과 실패 모델을 받을 수 있다.

## feat(connection): 스트림 연결 상태 계약 정의
하나의 stream socket과 해당 descriptor에 결합된 모든 transport 상태를 소유하는 move-only `Connection`을 정의한다. double close를 막기 위해 복사를 금지하고, move 연산으로 연결 객체를 안전하게 이전할 수 있도록 한다. peer 식별 정보, 입력 누적 버퍼, 출력 버퍼와 부분 쓰기 offset, 최대 line 길이, 로컬 또는 원격 종료 상태를 함께 보관해 socket 수명과 프로토콜 진행 상태를 나타내는 buffer의 수명이 분리되지 않도록 한다.

`ReadResult`와 `WriteResult`는 모든 상태를 하나의 반환 코드로 뭉뚱그리지 않고 정상적인 진행, 일시적인 non-blocking backpressure, 정상적인 peer 종료, 치명적 오류를 구분한다. public API는 raw byte queueing과 IRC line queueing을 분리하고, 요청된 graceful close와 실제로 감지한 peer close도 구분한다. 이 계약을 통해 이후 server loop는 buffer 내부 구현을 노출하지 않고도 언제 write interest를 유지할지, 언제 출력을 비울지, 언제 연결 제거가 필수인지 판단할 수 있다.

## feat(connection): 소켓 소유권과 이동 수명 구현
`Connection`에 선언된 소유권 규칙을 구현한다. 소멸자는 descriptor를 정확히 한 번 닫고, move 생성자는 source descriptor를 무효화하기 전에 descriptor, buffer, offset, limit, 종료 상태를 이전한다. move 대입은 destination이 이미 소유한 descriptor를 먼저 해제한 뒤 동일하게 상태를 이전한다. 이를 통해 연결 객체가 이동하거나 교체될 때 누수와 double close를 모두 방지한다.

생성자는 line limit이 0이면 프로토콜 기본값인 512 byte로 정규화한다. `wantsWrite()`와 `pendingBytes()`는 buffer 전체를 미전송 상태로 간주하지 않고 write offset을 기준으로 결과를 계산한다. 이 표현은 부분 non-blocking write를 위한 것으로, offset 이전의 byte는 이미 socket에 전달된 상태이며 suffix만 연결의 미전송 출력 불변식에 포함된다.

## feat(connection): IRC 입력 프레임 추출 구현
연결의 지속적인 read buffer를 대상으로 점진적인 IRC frame 추출을 추가한다. newline을 frame 구분자로 사용하고, 바로 앞의 carriage return은 선택적으로 제거해 CRLF와 LF로 끝나는 입력이 같은 논리 line을 생성하도록 한다. 완전한 frame이 여러 개 있으면 순서대로 반환하고, 불완전한 suffix는 완전한 명령으로 오인하지 않고 다음 read를 위해 buffer에 남긴다.

최대 line 규칙은 delimiter가 없는 누적 fragment와 newline을 포함한 완성 frame 모두에 적용한다. 한도를 위반하면 transport 오류를 기록하고 연결 종료를 요청한 뒤 누적 byte를 비워, 과도한 입력이 계속 메모리를 사용하거나 이후 유효한 프로토콜 데이터로 해석되지 않도록 한다. 따라서 framing은 command parsing보다 앞선 connection 계층의 책임이 되며, byte stream 처리와 IRC message 의미 처리를 분리한다.

## feat(connection): 논블로킹 수신 상태 처리
하나의 readiness 알림이 하나의 IRC message 또는 한 번의 `recv` 호출에 대응한다고 가정하지 않고, drain loop 방식으로 non-blocking receive를 구현한다. 성공한 read는 모두 지속적인 buffer에 추가하고 frame 추출에 넘기며, socket이 would-block 상태가 되거나 peer가 닫히거나 framing이 입력을 거부하거나 복구할 수 없는 오류가 발생할 때까지 loop를 계속한다. `EINTR`은 연결 실패를 의미하지 않으므로 재시도하고, `EAGAIN`과 `EWOULDBLOCK`은 현재 readiness cycle이 정상적으로 끝난 것으로 처리한다.

0 byte read는 정상적인 peer 종료로 기록하고 정리를 요청하며, 치명적인 receive 실패는 사람이 읽을 수 있는 연산 오류를 보존한 뒤 종료를 요청한다. 반환 결과에는 종료 조건 이전에 이미 추출한 line이 포함될 수 있으므로, 호출자는 callback 동안 이루어진 모든 진행을 확인하면서 동시에 해당 연결에 필요한 정확한 lifecycle 결정을 받을 수 있다.

## feat(connection): 부분 송신 대기열 처리
`writeOffset_`으로 진행 상태를 표현하는 지속적인 queue로 출력을 구현해, non-blocking socket이 message 일부만 전송하더라도 byte를 중복 전송하거나 버리지 않도록 한다. `flushPending()`은 미전송 suffix를 반복해서 전송하고, interruption은 재시도하며, backpressure에서는 정상적으로 중단한다. 치명적인 send 실패가 발생하면 원인을 기록하고 연결 종료를 요청한다. 지원되는 환경에서는 `MSG_NOSIGNAL`을 사용해 peer가 닫힌 상황이 `SIGPIPE`로 프로세스를 종료시키지 않고 메서드의 오류 결과로 보고되도록 한다.

queue를 모두 전송하면 buffer를 비우고 상태를 초기화한다. 이미 소비한 prefix가 16 KiB를 넘었을 때만 압축해, 부분 write마다 erase하는 비용을 피하면서도 전송 완료된 데이터가 무한히 쌓이지 않게 한다. `queueLine()`은 기존 line terminator를 제거한 뒤 CRLF 하나만 추가해 outbound IRC framing을 정규화하고, `queueRaw()`는 transport 수준 응답을 위해 byte 단위 제어를 그대로 유지한다. close 요청은 즉시 socket을 닫지 않고 상태로 저장해, server가 socket을 해제하기 전에 queue된 출력을 먼저 drain할 수 있게 한다.

## feat(server): 이벤트 서버 공개 계약 정의
서버를 listening socket, 이식 가능한 event manager, 활성 move-only connection map의 소유자이자 조정자로 정의한다. 설정에는 bind address, port, backlog, poll timeout, line limit을 모으고, `std::unique_ptr` 소유권으로 수락한 각 descriptor에 정확히 하나의 `Connection` 객체가 대응하며 event backend는 server 범위의 하나의 수명을 가진다는 점을 명시한다.

callback type은 transport orchestration과 IRC application 동작의 책임 경계를 정의한다. 서버는 event loop에 protocol state를 포함하지 않은 채 연결 수락, 완성된 입력 line, 연결 해제, infrastructure error를 알린다. public send, raw queue, lookup, disconnect 연산을 통해 application code는 안정적인 descriptor 식별자를 기준으로 동작하고, buffering과 event-interest 변경은 server 내부에 남긴다. `start`, `run`, `pollOnce`, `stop`을 분리해 일반적인 blocking 실행과 결정적인 단일 iteration 테스트를 모두 가능하게 한다.

## feat(server): 서버 수명과 콜백 상태 구현
서버의 초기 lifecycle 상태와 callback 소유권을 구현한다. 생성 시에는 resource를 열지 않고 설정만 기록하며, 소멸 시에는 먼저 종료를 요청한 뒤 모든 connection을 해제하고 마지막으로 listening socket을 닫는다. 이 정리 순서로 descriptor를 소유한 `Connection` 객체와 application에 보이는 disconnect 상태가 프로세스 종료에 의존하지 않고 server 수명 안에서 처리되도록 한다.

`stop()`은 의도적으로 예외를 던지지 않으며 임의의 호출 위치에서 즉석 teardown을 수행하는 대신 제어 상태만 변경한다. handler는 server 내부로 move되어 event loop가 하나의 authoritative callback 집합을 가지며, read-only accessor는 소유권을 넘기지 않고 runtime 상태를 노출한다. 이 커밋은 resource와 application callback의 소유자를 바꾸지 않은 채 이후 socket 생성과 event dispatch를 추가할 수 있는 lifecycle 골격을 확립한다.

## feat(server): IPv4 리스닝 소켓 구성
listener 생성을 단계적이고 exception-safe한 연산으로 구현한다. socket은 `listenFd_`를 통해 노출되기 전에 close-on-exec와 non-blocking으로 설정하고, `SO_REUSEADDR`로 재시작 후 빠른 rebind를 지원하며, 지원하는 시스템에서는 플랫폼별 `SO_NOSIGPIPE` 옵션으로 send별 signal suppression을 보완한다. 설정된 bind address는 IPv4로 명시적으로 parsing하므로 잘못된 설정은 name resolution을 거쳐 해석되지 않고 `bind` 이전에 거부된다.

모든 설정 단계는 descriptor가 아직 local variable인 동안 수행한다. 실패하면 descriptor를 닫고 예외를 다시 던지며, `listen`이 성공한 뒤에만 server에 소유권을 넘긴다. port 0은 `getsockname`으로 커널이 할당한 port를 조회해 지원하므로 외부에서 관찰되는 설정을 보존하면서 hard-coded port 조정 없이 격리된 테스트를 수행할 수 있다. 이에 따라 0 이상인 `listenFd_`는 완전히 설정되어 listen 중인 non-blocking socket이라는 불변식을 확립한다.

## feat(server): 논블로킹 연결 수락과 등록 구현
read-ready 알림을 받은 뒤 listening socket을 drain해 `EAGAIN` 또는 `EWOULDBLOCK`이 현재 accept queue가 비었음을 확인할 때까지 client를 수락한다. 중단된 accept는 재시도하고, 그 외 accept 실패는 전체 server를 종료하지 않고 보고한다. 수락한 각 descriptor는 descriptor를 소유하는 `Connection`으로 감싸기 전에 listener와 동일한 close-on-exec, non-blocking, signal suppression 정책을 적용한다.

새 connection은 read readiness로 등록한 뒤 server의 authoritative connection map에 삽입하고, 그 다음에만 application callback에 노출한다. callback 예외는 connection 경계에서 차단해 event loop를 unwind시키지 않고 오류로 보고한 뒤 close 요청으로 변환한다. interest를 갱신하기 전에 map membership을 다시 확인해 callback이 client를 disconnect할 수 있는 경우를 고려하고, 논리적 등록이 이미 제거된 객체를 server가 무조건 다시 조작하지 않도록 한다. peer address formatting은 관찰용 정보로만 취급하며, 유효한 socket 수락의 전제 조건으로 삼지 않고 실패 시 `unknown`으로 대체한다.

## feat(server): 준비 이벤트 루프 구동
listener 설정, 이식 가능한 event backend, descriptor별 dispatch를 하나의 실제 server loop로 연결한다. `start()`는 backend를 생성하고 listener를 열어 read interest를 등록한 뒤 server를 running 상태로 만든다. `run()`은 `pollOnce()`에 한 번의 wait cycle을 반복해서 위임하고, 종료가 요청되면 resource teardown을 중앙에서 수행한다. `pollOnce()`를 public으로 유지해 production과 동일한 dispatch 경로를 보존하면서 테스트나 embedding code가 server를 한 iteration씩 결정적으로 진행시킬 수 있도록 한다.

listener event와 client event는 descriptor identity로 구분한다. listener 오류는 새 connection을 더 이상 신뢰성 있게 수락할 수 없으므로 server 수준 실패로 처리하고, readable listener event에서는 대기 중인 accept를 모두 처리하며, 그 외 descriptor는 client handling으로 넘긴다. 반환된 event 사이마다 `stopRequested_`를 확인해 callback에서 stop을 요청한 경우 동일한 오래된 readiness batch의 이후 callback이 실행되지 않도록 한다. startup 이전의 `pollOnce()` 호출은 lifecycle 오류로 거부해, event dispatch가 활성 backend와 등록된 listener에 종속되도록 한다.

## feat(server): 클라이언트 입력 이벤트 전달
이식 가능한 readiness event에서 완성된 IRC line으로 이어지는 client read-dispatch 경계를 구현한다. 반환된 readiness batch는 앞선 callback에서 connection이 제거된 뒤에도 남아 있을 수 있으므로 알 수 없는 descriptor는 무시한다. socket 수준 event 오류는 즉시 disconnect하고, 그렇지 않은 readable connection은 `Connection::readAvailable()`로 drain한 뒤 성공적으로 framing된 모든 line을 순서대로 전달하고, 마지막에 감지한 peer close를 close 요청으로 바꾼다.

application callback 예외는 server loop 밖으로 전파하지 않고 오류 보고와 해당 connection의 close 요청으로 변환한다. application code가 현재 client를 disconnect할 수 있으므로 각 callback 뒤에 connection map을 다시 확인해 오래된 `Connection*`를 계속 사용하지 않도록 한다. close가 요청된 뒤에는 같은 read batch의 이후 line이 terminal command나 실패 이후 protocol state를 변경하지 못하도록 처리를 중단한다. 따라서 마지막 interest refresh는 여전히 server가 소유한 connection에 대해서만 수행한다.

## feat(server): 송신 큐와 쓰기 관심 상태 연결
connection 내부의 output buffering을 kernel write readiness와 연결한다. `sendTo()`와 `queueRawTo()`는 현재 등록된 client에만 데이터를 추가하고 즉시 해당 descriptor의 event interest를 다시 계산하므로, server가 read만 기다리는 동안 queue된 출력이 방치되지 않는다. write-ready event에서는 non-blocking socket이 받을 수 있는 만큼 queue를 drain하고, 치명적인 send 실패는 정상적인 connection cleanup으로 전환한다.

`refreshInterest()`를 readiness 상태를 결정하는 단일 policy 함수로 만든다. 정상 connection은 항상 read interest를 유지하고, pending byte가 있을 때만 write interest를 추가한다. close가 요청되면 새 input을 막고 queue가 비워질 때까지 write readiness만 유지한다. pending byte가 없는 closed connection은 즉시 disconnect한다. 이를 통해 이미 queue된 protocol output에는 전송 기회를 주면서도 보낼 데이터가 없는 writable socket을 busy polling하지 않는 graceful-close 불변식을 확립한다.

## feat(server): 연결 해제와 오류 정리 구현
connection 제거를 중앙화해 event 등록, 소유권, application notification이 함께 전이되도록 한다. `disconnect()`는 먼저 event backend에서 descriptor 제거를 시도하고, authoritative map에서 `Connection`을 꺼낸 뒤 entry를 지운 다음 disconnect callback을 호출한다. local `unique_ptr`가 notification 동안 객체를 살려 두며, map을 먼저 지우므로 재귀적인 lookup이나 반복 disconnect에서는 해당 connection이 이미 사라진 상태로 관찰된다. backend 제거와 callback에서 발생한 예외는 보고하되 descriptor 파괴를 막지는 않는다.

출력이 남지 않은 hangup은 terminal 상태로 처리하고, pending queue가 있으면 기존 write 경로를 통해 계속 drain할 수 있게 한다. listener cleanup은 닫기 전에 unregister하고 멱등하게 동작한다. 전체 shutdown에서는 callback과 map erase로 인한 iterator invalidation을 피하기 위해 disconnect 전에 descriptor key snapshot을 만든다. lookup helper는 entry가 존재하는 동안에만 non-owning access를 제공하고, 오류 보고는 설정된 handler로 보낸다. 이 연산들을 통해 명시적 disconnect, peer 종료, I/O 실패, server shutdown이 모두 하나의 cleanup 경로를 사용하도록 한다.

## feat(parser): IRC 메시지 값과 직렬화 정의
선택적 prefix, 정규화된 command, 순서가 있는 parameter, 원본 frame text를 분리하는 명시적인 IRC message value를 도입한다. command는 생성과 비교 시 uppercase로 정규화해 모든 호출자가 개별적으로 정규화하지 않아도 case-insensitive dispatch가 가능하도록 한다. fallback을 지원하는 안전한 index 접근으로 command handler가 unchecked vector indexing 없이 optional parameter를 표현할 수 있다.

`toLine()`은 생성된 protocol message에 필요한 역방향 표현을 제공한다. optional prefix, command, parameter, 마지막 CRLF를 출력하며, 값이 비어 있거나 공백을 포함하거나 colon으로 시작하면 IRC trailing-parameter marker를 사용한다. structured field와 `raw` text를 함께 유지해 semantic handling과 진단용 원문 보존을 모두 지원한다. 같은 경계에 line parsing과 buffer parsing도 선언해 이 type을 IRC wire syntax와 application 수준 command data 사이의 authoritative translation point로 만든다.

## feat(parser): IRC 한 줄 구문 해석 구현
하나의 IRC frame을 message value로 결정적으로 parsing한다. 먼저 transport terminator를 제거하고, CRLF 이전 기준 protocol의 510-octet limit을 적용한다. optional prefix는 비어 있지 않은 prefix 뒤에 command text가 있을 때만 허용한다. 이후 parser는 command를 uppercase로 정규화하고, middle parameter는 공백 기준으로 나누며, colon으로 시작하는 parameter는 내부 공백까지 포함한 나머지 전체를 그대로 소비하는 trailing field로 처리한다.

parsing 전에 output object를 reset하고 잘라낸 raw frame을 유지하므로 실패한 호출이 이전 message의 structured field를 잘못 남기지 않는다. 빈 입력, 잘못된 prefix syntax, 누락된 command, 제한을 넘는 frame은 optional error channel을 통해 명시적인 diagnostic text를 반환한다. syntax rejection은 parser에 남기고, protocol 오류가 connection policy에 어떤 영향을 줄지는 caller가 결정할 수 있게 한다.

## feat(parser): 버퍼에서 IRC 프레임 소비
`Connection` 외부에서 raw socket data를 누적하는 caller를 위해 incremental parsing을 추가한다. newline으로 끝나는 완성 frame은 buffer 앞에서 제거해 각각 독립적으로 parsing한다. 유효한 message는 순서대로 반환하고, malformed frame은 버리고 오류를 보고하되 같은 buffer의 뒤쪽 완성 frame을 계속 검사할 수 있게 한다. 마지막 불완전 frame은 다음 receive cycle을 위해 그대로 둔다.

peer가 delimiter를 끝내 보내지 않을 때 메모리 증가를 제한하기 위해 terminator 없는 remainder에 4 KiB 제한을 둔다. 한도를 넘으면 discard를 보고하고 fragment를 비워 buffer를 알려진 framing boundary로 되돌린다. `trimFrame()`에 CR·LF suffix 제거를 모아 direct line parsing과 buffered consumption이 동일한 frame 정규화 규칙을 공유하도록 한다.

## feat(reply): IRC 서버 응답 생성
command handler가 wire syntax를 각각 조립하지 않도록 전용 response construction 계층을 추가한다. numeric code는 세 자리로 렌더링하고, numeric reply는 항상 recipient를 먼저 배치하며 nickname이 없으면 `*`로 대체한다. 모든 formatted message는 CRLF로 끝난다. trailing marker는 마지막 parameter에만 붙일 수 있게 해, IRC의 middle parameter와 공백을 포함할 수 있는 하나의 trailing field를 구분한다.

helper는 `ERROR` message와 user hostmask도 일관되게 만든다. user 또는 host 정보가 없으면 명시적인 fallback을 사용해 registration이나 early-error 경로에서도 identity field가 모두 채워지기 전부터 문법적으로 완전한 prefix를 만들 수 있다. 이 규칙을 중앙화해 handler 간 차이를 줄이고 server가 생성하는 protocol output의 단일 formatting 경계를 확립한다.

## feat(channel): 채널 상태 계약 정의
membership, operator privilege, invitation, topic state, 지원하는 `+i`, `+t` mode의 authoritative aggregate로 `Channel`을 정의한다. 정수형 client identifier로 connection 소유권을 넘기지 않은 채 channel state를 server connection registry와 연결하고, set 기반 membership 및 operator collection으로 중복을 방지한다. invitation은 아직 channel member가 아닐 수도 있는 identity에 대한 권한이므로 canonicalized nickname 기준으로 저장한다.

public operation은 container를 직접 노출하지 않고 aggregate 내부에서 state transition을 수행하도록 한다. caller는 member 추가·제거, operator 권한 부여, topic·mode 변경, invitation 소비, member snapshot 조회를 수행할 수 있다. static channel-name 및 nickname normalization helper는 key가 의존하는 protocol identity 규칙을 해당 state와 함께 둔다. 이 경계는 operator status가 현재 member에게만 의미가 있다는 관계 같은 불변식을 command handler가 지키는 데 필요하다.

## feat(channel): 구성원과 운영자 상태 관리
모든 operator는 반드시 channel member여야 한다는 핵심 membership 불변식을 구현한다. member 추가 시 최초 operator status를 원자적으로 부여할 수 있고, member 제거 시 대응하는 operator entry도 항상 제거하며, member가 아닌 대상에 대한 이후 privilege 변경은 무시한다. 이를 통해 일반적인 channel operation으로 두 set의 상태가 어긋나지 않도록 한다.

membership은 set을 사용하므로 중복 JOIN과 반복 removal이 자연스럽게 멱등하고, 외부로 반환하는 member vector는 결정적인 key 순서를 가진다. 새 channel은 기본적으로 join 가능하며 topic 변경은 보호된 상태로 시작하고 활성 topic은 없다. 따라서 예측 가능한 초기 상태를 제공하면서 모든 privilege transition이 membership에 종속되도록 한다.

## feat(channel): 주제·초대·모드와 이름 규칙 구현
channel의 membership 외 상태 전이를 완성한다. topic의 존재 여부를 topic text와 별도로 추적해 명시적인 빈 topic과 topic 없음 상태를 구분한다. invite-only와 topic-protection flag는 직접 조회·변경할 수 있으며, invitation은 하나의 lowercase canonical form으로 삽입·확인·제거한다. 내부 표현이 set이므로 반복 invitation과 removal은 멱등하다.

channel name은 `#` 또는 `&`로 시작하고 뒤에 최소 한 글자가 있으며 IRC channel-list syntax와 충돌하는 whitespace, comma, bell character를 포함하지 않을 때만 허용한다. `modeString()`은 별도의 text representation을 저장하지 않고 authoritative boolean에서 외부로 보고할 mode sequence를 계산한다. 이를 통해 protocol presentation과 authorization decision이 channel 내부 state와 동기화되도록 한다.

## feat(config): 기본 실행 인자 해석 모듈 구성
transport server의 bind configuration과 분리된 runtime configuration object를 도입한다. command rate limit, idle·ping timeout, registration timeout의 초기 policy 값을 한곳에 모아, 이후 option parsing이 application code 곳곳에 상수를 퍼뜨리지 않고 operational behavior를 변경할 수 있도록 한다.

port parsing은 `strtol`을 사용하되 전체 문자열 소비 여부와 범위를 검사해 빈 값, 소수, trailing text, 0, 음수, 범위 밖의 값을 socket layer에 도달하기 전에 거부한다. 초기 option parser는 의도적으로 필수 `<port> <password>` 형태만 허용하고 첫 추가 인자를 unknown으로 보고하며, usage helper가 외부 command-line 계약을 정의한다. 첫 버전은 scaffold로서 default와 validation boundary만 기록하고 optional flag로 `Server::Config`를 아직 변경하지는 않는다.

## feat(client): 연결별 등록 상태 저장
transport가 소유한 `Connection` 객체와 IRC identity 및 registration 진행 상태를 분리하는 registry를 추가한다. descriptor를 key로 하는 각 `ClientState`는 password 승인, nickname·USER 완료 여부, 최종 registration 상태, reply와 hostmask에 필요한 identity field를 기록한다. 이 flag를 명시적으로 유지해 registration을 비어 있지 않은 문자열에서 반복 추론하지 않고 여러 command로 진행되는 state transition으로 모델링할 수 있다.

`state()`는 최초 접근 시 생성하는 semantics를 제공하고, `find()`와 `contains()`는 phantom client를 만들어서는 안 되는 read path를 지원한다. erase는 멱등하며, descriptor key를 value snapshot으로 내보내 이후 연산에서 registry entry가 제거될 수 있는 경우에도 안전하게 순회할 수 있다. ordered map 덕분에 traversal도 결정적이며, connection setup이 state의 `fd` field를 채우기 전까지 map key가 authoritative descriptor association으로 동작한다.

## feat(client): 닉네임 색인 관리
모든 client state를 선형 탐색하지 않고 identity를 찾을 수 있도록 reverse nickname index를 추가한다. 삽입과 lookup 모두 channel invitation과 같은 canonicalization function을 사용해 client·channel subsystem 전체에서 nickname reference를 case-insensitive하게 처리한다. registry는 사용자가 제시한 spelling을 `ClientState`에 보존하고 canonical form은 uniqueness와 lookup key로만 사용한다.

nickname을 변경할 때는 새 key를 설치하기 전에 기존 key를 제거하고, client erase 시 descriptor 기반 state와 reverse mapping을 모두 제거한다. 이를 통해 저장된 모든 nickname mapping은 현재 해당 nickname을 보유한 state의 descriptor를 가리켜야 한다는 두 index 간 consistency requirement를 확립한다. collision policy는 caller 책임으로 남기며, command validation이 `setNickname()` 호출 전에 이미 점유된 canonical key를 거부해야 한다.

## feat(app): IRC 동작 조율 계약 정의
transport server와 domain state 사이의 protocol coordinator로 `IrcApplication`을 정의한다. server는 descriptor, buffering, readiness를 계속 담당하고, application은 password policy, runtime limit, client registration state, command dispatch, reply construction, protocol-aware cleanup을 소유한다. public surface는 server의 connect, line, disconnect callback과 일치해 transport event가 개별 command handler로 직접 새어 들어가지 않도록 한다.

private handler는 registration command와 connection control을 registration completion, reply target 결정, hostmask 생성, numeric formatting, raw send, close request, client-state removal 같은 공통 관심사와 분리한다. 이를 통해 이후 channel과 messaging 동작이 `Server` 내부에 직접 결합되지 않고 일관된 identity 및 lifecycle 규칙을 사용할 수 있는 하나의 orchestration boundary를 확립한다.

## feat(app): 연결 수명 콜백 조율
transport callback을 protocol state 생성, parsing, dispatch, 제거와 연결한다. connection을 수락하면 application은 descriptor를 key로 하는 client record를 만들고 connection의 peer address에서 초기 host를 구하며, 설정된 password가 비어 있을 때만 password authorization을 완료 상태로 표시한다. 이를 통해 transport acceptance와 IRC registration을 구분한다. 연결된 client도 registered 상태가 되려면 PASS, NICK, USER 단계를 거쳐야 한다.

전달된 각 line은 application 경계에서 정확히 한 번 parsing한다. registry entry가 없으면 방어적으로 다시 만들고, malformed syntax에는 command dispatch로 들어가지 않고 numeric 417을 응답하며, 유효한 message는 structured value로 넘긴다. disconnect callback은 명시적인 QUIT과 같은 protocol cleanup 경로를 사용하므로 종료 원인이 protocol인지 socket layer인지와 관계없이 nickname index와 이후의 channel membership을 제거할 수 있다.

## feat(app): 등록 전 명령 분배 구현
registration 상태를 고려한 command dispatch를 확립한다. PASS, NICK, USER, PING, QUIT은 registration state와 관계없이 routing한다. 이 command들은 registration state machine을 구성하거나 underlying connection을 유지·종료하기 때문이다. 그 외 command는 registration이 완료될 때까지 numeric 451로 거부하고, registration 이후 지원하지 않는 command에는 정규화된 command name과 함께 numeric 421을 반환한다.

이 순서로 registration gate를 parser가 아니라 application 수준 authorization boundary로 만든다. syntax가 유효하더라도 client lifecycle state에 따라 operation이 금지될 수 있으며, dispatcher는 “not registered”와 “unknown command”를 protocol 수준에서 구분해 응답한다. gate를 중앙화함으로써 각 post-registration handler가 조기 사용 허용 여부를 제각각 판단하는 것도 막는다.

## feat(app): 응답과 클라이언트 정리 지원 구현
command handler에 필요한 공통 application service를 구현한다. nickname이 생기기 전 numeric target은 `*`를 사용하고, client identity를 사용할 수 있기 전 user prefix는 server name으로 대체하며, registered identity는 reply formatter를 통해 hostmask로 렌더링한다. trailing text를 갖는 numeric과 parameter만 갖는 numeric을 모두 지원해 handler가 각 reply family의 protocol 형태를 유지할 수 있도록 한다.

모든 outbound protocol text는 server의 queued send path를 통과해 non-blocking delivery와 정규화된 line termination을 유지한다. close request는 `Connection`을 즉시 파괴하지 않고 live object의 상태를 갱신해 server의 graceful-drain policy를 적용할 수 있게 한다. 초기 client cleanup은 하나의 method에서 registry entry와 nickname index entry를 함께 제거하며, reason과 peer-notification parameter를 같은 경계에 두어 이후 channel 및 broadcast cleanup도 erase logic을 중복하지 않고 확장할 수 있게 한다.

## feat(registration): PASS 인증 상태 처리
registration state machine에서 되돌릴 수 없는 한 단계로 PASS를 구현한다. 이미 registered 상태이거나 password 단계가 성공한 client는 PASS를 다시 제출할 수 없게 해 identity가 확립된 뒤 credential state가 다시 작성되는 것을 막는다. credential이 없으면 numeric 461을, 설정된 password와 일치하지 않으면 numeric 464를 반환하고 connection 종료를 요청한다.

일치하는 password 또는 connect 시점에 설정된 empty-password authorization만 `passOk`를 설정한다. handler는 client를 직접 registered 상태로 만들지 않고 `maybeRegister()`를 호출해, 최종 registration transition과 welcome reply 전에 password 승인, nickname 선택, USER 정보가 모두 완료되어야 한다는 불변식을 유지한다.

## feat(registration): 닉네임 검증과 색인 갱신
registry의 reverse index를 변경하기 전에 NICK validation을 수행한다. nickname은 비어 있으면 안 되고 최대 30자이며, 숫자나 channel/prefix punctuation으로 시작할 수 없고 IRC addressing syntax와 충돌하는 whitespace와 separator를 허용하지 않는다. 실패 원인은 nickname 누락, syntax 오류, 다른 descriptor가 이미 소유한 canonical nickname으로 구분해 각각 numeric 431, 432, 433을 사용한다.

collision lookup은 `setNickname()`보다 먼저 수행해 registry가 caller에게 요구하는 uniqueness contract를 지킨다. 동일한 descriptor는 같은 canonical nickname을 유지하거나 equivalent canonical nickname으로 변경할 수 있지만, 다른 descriptor는 letter case만 다른 같은 identity를 차지할 수 없다. 성공적으로 갱신한 뒤에도 registration을 강제로 완료하지 않고 다시 평가하므로 NICK은 PASS/NICK/USER state machine의 독립적인 prerequisite로 남는다.

## feat(registration): USER 정보와 환영 응답 연결
USER 단계와 registered 상태로의 단일 transition을 구현한다. registration 이후 USER는 거부하고, protocol이 요구하는 네 parameter를 모두 받아 username과 trailing real name을 저장한 뒤 해당 단계를 완료 상태로 표시한다. `maybeRegister()`는 password authorization, nickname, user data 세 prerequisite를 모두 확인하며, 너무 이르거나 반복해서 호출되면 아무 영향 없이 반환한다.

모든 prerequisite가 충족되면 welcome numeric 001, 002, 003을 queue하기 전에 client를 먼저 registered 상태로 표시한다. state를 먼저 갱신해 reentrant하거나 반복된 registration check가 welcome sequence를 중복 전송하지 않도록 한다. 이에 따라 registration은 각 command handler가 조건을 독립적으로 추론하는 방식이 아니라 명시적인 단조 transition이 된다.

## feat(registration): PING과 QUIT 기본 명령 처리
완전한 registration 이전에도 사용할 수 있는 connection-maintenance command를 추가한다. PING은 origin token이 필요하며 없으면 numeric 409를 반환한다. 유효한 요청에는 server name과 전달받은 token을 모두 포함하는 server-prefixed PONG을 반환해 client가 liveness response를 대응시킬 수 있게 한다.

QUIT은 client가 제공한 reason 또는 안정적인 default 값을 기록하고 transport layer를 통해 graceful close를 요청한다. command dispatch 안에서 descriptor를 직접 닫지 않으므로 이미 queue된 출력은 server의 일반 drain-and-disconnect lifecycle을 따르고, 최종 disconnect callback이 authoritative protocol-state cleanup을 담당한다.

## feat(server): IRC 애플리케이션 실행 진입점 구성
서로 분리되어 있던 transport와 protocol component를 실행 가능한 server로 조합하는 process-level composition root를 추가한다. command-line validation으로 `Server::Config`와 `RuntimeConfig`를 만들고, `IrcApplication`보다 `Server`를 먼저 생성한 뒤 server callback을 application의 connection, line, disconnection entry point에 연결한다. 이를 통해 dependency direction을 명확히 유지한다. application은 server interface에 의존하고, 둘의 수명과 callback 연결 방식은 `main`만 결정한다.

polling loop는 실행을 관찰할 수 없는 blocking call 내부에 숨기지 않고 interruptible process flag와 `Server::pollOnce()`를 사용한다. SIGINT와 SIGTERM은 정상 shutdown과 같은 orderly stop 경로를 요청하고, closed peer가 server process를 종료하지 않도록 send별 socket 보호에 더해 process 수준에서도 SIGPIPE를 무시한다. scope를 벗어나기 전에 모든 callback을 해제해 server teardown이 수명이 끝나가는 application object를 참조하는 lambda를 호출하지 못하도록 한다. startup 및 runtime exception은 diagnostic output과 nonzero process result로 변환해 configuration, socket setup, event processing을 하나의 failure boundary로 감싼다.

## build(project): 플랫폼별 IRC 서버 빌드 구성
완성된 executable의 재현 가능한 build contract를 도입한다. Makefile은 host operating system에 따라 정확히 하나의 readiness backend를 선택한다. Darwin에서는 `KqueueEventManager`, Linux에서는 `EpollEventManager`를 사용하고, `EventManager::createDefault()`가 사용하는 대응 compile-time macro도 정의한다. 지원하지 않는 system에서는 event implementation이 정의되지 않은 executable을 만들지 않고 build configuration 단계에서 실패한다.

application, protocol, state, transport, 선택된 platform source를 모두 C++17로 하나의 target에 link하고 warning을 error로 승격한다. compiler-generated dependency file을 사용해 header 변경 시 해당 translation unit을 다시 build하며, `clean`, `fclean`, `re`는 intermediate cleanup과 executable 제거를 구분한다. 이를 통해 build가 project의 language requirement와 event abstraction이 확립한 portability boundary를 모두 강제한다.

## feat(message): 등록 사용자의 개인 메시지 전달
transport descriptor가 외부 identity가 되지 않도록 하면서 registered client의 `PRIVMSG` 전달을 추가한다. handler는 recipient list와 message text를 별도로 검증하고, comma로 구분된 각 nickname을 registry의 canonical index로 조회한 뒤 sender의 현재 hostmask를 사용해 전달 frame을 만든다. 알 수 없는 recipient는 각각 numeric 401을 발생시키므로 한 target의 실패가 같은 command의 다른 유효한 target 전달을 막지 않는다.

message handling은 registration gate 뒤에 배치해 완전히 확립된 identity만 user traffic을 전송할 수 있다는 규칙을 유지한다. recipient 분리 시 빈 comma segment는 잘못된 lookup을 만들지 않고 버리며, 성공한 모든 전달은 server의 queued send path를 사용해 private messaging도 non-blocking partial-write 동작을 그대로 상속한다. command를 `MessagingCommands.cpp`로 분리함으로써 post-registration traffic을 registration orchestration과 구분하기 시작하면서도 공통 identity 및 reply service는 `IrcApplication`에 유지한다.

## feat(channel): 채널 탐색과 대상 해석 지원
channel command 구현에 앞서 application이 channel registry를 소유하도록 하고 공통 lookup 규칙을 추가한다. `ensureChannel()`은 channel을 생성할 수 있는 operation에서만 create-on-demand를 수행하고, `findChannelForCommand()`는 생성하지 않는 lookup으로 존재하지 않는 channel과 membership requirement를 충족하지 않은 기존 channel을 구분한다. 이 경계에서 protocol numeric을 반환해 각 command handler가 서로 다른 403, 442 검사를 중복 구현하지 않도록 한다.

channel 형태의 target은 앞의 `#` 또는 `&`로 식별하며, 이는 channel-name aggregate가 허용하는 namespace와 일치한다. registry는 처음에는 제시된 channel name을 map key로 사용하고 완전한 `Channel` value를 저장한다. connection ownership은 `Server`에, identity ownership은 `ClientRegistry`에 그대로 둔다. 이로써 이후 JOIN, PART, MODE, TOPIC, channel messaging command가 transport layer로 책임을 옮기지 않고 조정할 application 수준 관계를 도입한다.

## feat(channel): 주제와 구성원 응답 지원
channel topic과 membership state를 위한 공통 serializer를 추가한다. channel이 명시적으로 topic을 가진 경우에만 numeric 332를 사용하고 그렇지 않으면 331을 사용해 topic absence와 topic text를 구분하는 aggregate의 의미를 보존한다. NAMES output은 authoritative member 및 operator set에서 생성하고 operator nickname 앞에 `@`를 붙이며, 더 이상 client state가 없는 stale descriptor는 건너뛰고 numeric 366으로 sequence를 끝낸다.

display list는 snapshot에서 만들어 reply 생성 중 channel container를 노출하거나 변경하지 않는다. helper는 353/366 쌍의 contract와 operator presentation을 중앙화해 JOIN과 명시적인 NAMES 계열 흐름이 같은 state를 일관되게 보고하도록 한다. 또한 wire reply는 별도로 유지되는 두 번째 representation이 아니라 domain state의 projection이라는 점을 명확히 한다.

## feat(channel): 채널 방송 대상 팬아웃 지원
channel-scoped event와 shared-channel event에 재사용할 fan-out operation을 도입한다. direct channel broadcast는 member identifier snapshot을 만들고 선택적으로 descriptor 하나를 제외한다. common-channel broadcast는 먼저 source와 하나라도 channel을 공유하는 모든 member를 set으로 합친다. 두 client가 여러 channel을 공유하더라도 nickname, quit, 관련 identity event는 한 번만 받아야 하므로 deduplication이 필수다.

MODE broadcast는 acting client의 prefix로 formatting한 뒤 다른 event와 동일한 channel fan-out path로 전달한다. 모든 recipient는 계속 `sendRaw()`를 통해 데이터를 받아 transport의 queued non-blocking output을 사용한다. recipient 계산을 중앙화함으로써 visibility policy를 개별 command implementation과 분리하고, broadcast는 현재 channel membership만 대상으로 하며 중복 전달하지 않는다는 불변식을 한곳에서 유지한다.

## feat(channel): 구성원 정리와 식별자 변경 방송
channel graph 전체로 identity 및 disconnect handling을 확장한다. registered client의 nickname 변경은 nickname index를 갱신하기 전에 기존 hostmask를 캡처하고, shared-channel peer의 합집합과 자기 자신에게 NICK event를 broadcast한다. event는 이전 identity에서 새 identity로의 transition을 표현하므로 old prefix를 사용해야 하며, deduplicated common-channel fan-out으로 여러 channel을 공유하는 peer에게 notification이 반복되는 것을 막는다.

명시적인 membership transition은 `partChannel()`로, transport termination은 `removeClientState()`로 channel departure를 중앙화한다. PART는 client가 아직 member인 동안 broadcast한 다음 membership과 operator state를 제거하고 빈 channel을 지운다. disconnect cleanup은 먼저 client identity를 snapshot하고 QUIT broadcast 대상인 unique peer set을 계산한 뒤 모든 channel에서 descriptor를 제거하고, 비게 된 aggregate를 삭제한 다음 마지막으로 client와 nickname index를 지운다. erase 전에 channel name을 수집해 순회 중 map invalidation을 피하고, 어떤 channel도 disconnected descriptor를 보유해서는 안 된다는 aggregate 간 불변식을 유지한다.

## feat(message): 채널 대상 메시지 방송
`PRIVMSG` target resolution을 확장해 nickname과 channel name을 구분한다. channel target은 반드시 존재하고 sender가 해당 channel의 member여야 하며, 그렇지 않으면 message를 보낼 수 없음을 numeric 404로 알린다. 유효한 channel traffic은 sender를 제외한 모든 현재 member에게 broadcast하고, nickname target은 기존 direct lookup과 numeric 401 동작을 유지한다.

두 전달 형태 모두 같은 parsed text와 sender hostmask를 사용하지만 authorization과 recipient 계산은 서로 다르게 유지한다. channel fan-out 전에 membership을 강제해 관찰할 수 없는 channel에 외부 client가 traffic을 주입하지 못하도록 하고, sender를 제외하는 것은 local command acknowledgement path가 이미 제공하는 relay semantics와 맞춘다. 개별 target 실패 후에도 multi-target 처리를 계속하므로 nickname과 channel destination이 섞여 있어도 각각 독립적으로 처리한다.

## feat(channel): JOIN 채널 입장 처리
channel aggregate를 생성하고 입장하는 operation으로 JOIN을 구현한다. handler는 comma로 구분된 channel name과 현재 참여 중인 모든 channel에서 나가는 특수한 `JOIN 0` 형식을 지원한다. 잘못된 name은 registry를 변경하기 전에 거부하고, invite-only channel은 canonical nickname invitation이 있어야 입장할 수 있다. 이미 member인 channel에 다시 JOIN하면 state를 중복 변경하지 않는 멱등 동작으로 처리하고, membership을 다시 추가하는 대신 현재 NAMES projection을 반환한다.

새로 생성된 channel의 첫 member는 원자적으로 operator로도 추가해 별도의 bootstrap 경로 없이 administrative owner를 만든다. 유효한 invitation은 membership을 부여할 때 소비하고, member가 state에 반영된 뒤 JOIN event를 broadcast하며, 입장한 client에는 authoritative topic과 member list를 보낸다. 이 순서로 모든 observer가 join 이후 state에서 파생된 reply를 보게 하고 operator, invitation, membership 불변식이 하나의 application-level transition으로 함께 변경되도록 한다.

## feat(channel): PART 채널 퇴장 처리
기존의 단일 channel departure transition을 PART command로 노출한다. handler는 channel-list parameter를 검증하고 모든 요청 channel에 공통으로 사용할 optional trailing reason 하나를 보존하며, comma로 구분된 name을 각각 독립적으로 처리한다. 존재 여부, membership, 제거 전 broadcast, operator cleanup, empty-channel deletion 규칙은 모두 `partChannel()`에 계속 위임한다.

이를 통해 명시적인 PART, `JOIN 0`, 그 밖의 내부 departure가 미묘하게 다른 cleanup path를 각각 구현하지 않고 하나의 state mutation을 공유한다. 한 requested channel에서 실패해도 뒤의 channel 처리는 계속하므로 command의 multi-target 구조와 맞고, 각 target은 독립적으로 403 또는 442 response를 생성할 수 있다.

## feat(channel): TOPIC 조회와 변경 처리
같은 channel 및 membership authorization을 공유하는 두 operation으로 TOPIC을 구현한다. channel parameter만 있으면 기존 331/332 reply helper를 통해 현재 state를 조회한다. topic parameter가 있으면 channel의 `+t` policy를 적용한다. 보호되지 않은 channel은 일반 member도 수정할 수 있지만, 보호된 channel은 operator status가 필요하며 그렇지 않으면 numeric 482를 반환한다.

모든 member에게 TOPIC event를 broadcast하기 전에 channel aggregate를 먼저 변경해 이후 read와 notification이 동일한 authoritative value를 가리키도록 한다. 빈 trailing parameter도 topic value로 처리해, 이 버전에서는 이를 topic absence로 조용히 바꾸지 않고 aggregate의 명시적인 “topic present” 표현을 유지한다. lookup은 계속 non-creating으로 동작하므로 read나 unauthorized write가 channel을 새로 만들 수 없다.

## feat(channel): KICK 구성원 제거 처리
actor, target identity, target membership을 단계적으로 검증하는 operator-controlled removal을 추가한다. acting client는 현재 channel member이자 operator여야 하고, target nickname은 live client로 resolve되어야 하며, 해당 client가 선택한 channel의 member여야 한다. 서로 다른 numeric을 사용해 unknown nickname, 알려진 user이지만 channel 밖에 있는 경우, channel privilege가 부족한 경우를 구분한다.

KICK event는 target이 아직 recipient set에 포함되어 있을 때 broadcast하고, 그 다음 `Channel::removeMember()`로 membership과 operator privilege를 모두 제거한 뒤 빈 channel이면 application이 삭제한다. 이 순서로 제거되는 user가 authoritative removal event를 받을 수 있게 하면서 stale privilege가 transition 뒤에 남지 않도록 한다. comment가 제공되면 그대로 보존하고, 없으면 target nickname을 protocol fallback으로 사용한다.

## feat(channel): INVITE 초대 상태 처리
invitation을 channel이 소유하고 nickname을 key로 하는 authorization으로 구현한다. target nickname은 live client로 resolve되어야 하고, inviter는 기존 channel에 이미 속해 있어야 하며, target이 이미 member이면 별도 오류로 거부한다. invite-only channel에서는 operator만 authorization을 만들 수 있지만, open channel에서는 privileged join bypass를 부여하는 것이 아니므로 일반 member도 protocol invitation을 보낼 수 있다.

validation 후 canonicalized nickname을 channel invitation set에 삽입하고, inviter에게 numeric 341로 성공을 확인한 뒤 hostmask-prefixed INVITE event를 target에게 직접 전송한다. 이후 JOIN은 membership을 추가한 뒤 저장된 authorization을 소비한다. grant를 일시적인 notification message만 신뢰하지 않고 channel aggregate에 유지함으로써 invitation check, case normalization, one-time consumption을 하나의 상태 모델로 맞춘다.

## feat(channel): 채널 모드 조회와 i·t 변경
MODE routing과 처음으로 변경 가능한 channel-mode grammar를 추가한다. channel mode query는 membership 없이 허용하고 `Channel::modeString()`의 결과를 numeric 324로 반환하며, 변경은 현재 membership과 operator privilege를 모두 요구한다. parser는 compact mode string을 따라 add/remove 방향 상태를 유지하고 `i`, `t`를 각각 독립적으로 적용하며, 허용된 transition마다 broadcast하고 알 수 없는 flag는 numeric 472로 보고한다.

user-mode 요청은 의도적으로 제한한다. 알려진 user는 현재 비어 있는 mode set을 조회할 수 있고, 다른 user의 mode 변경은 거부하며, 지원하지 않는 self change는 조용히 성공시키지 않고 별도 response를 보낸다. dispatcher에서 user target과 channel target을 분리해 channel authorization 규칙이 user identity handling으로 섞이지 않도록 한다. aggregate를 먼저 변경한 뒤 broadcast해 보고되는 `+i`, `+t` event가 JOIN과 TOPIC authorization이 즉시 참조하는 state와 동기화되도록 한다.

## feat(channel): 채널 운영자 모드 변경
channel-mode parser에 argument를 소비하는 `+o`, `-o` transition을 추가한다. 별도의 parameter cursor는 nickname이 필요한 mode에서만 전진하므로 flag-only mode와 operator change를 하나의 mode string에서 함께 처리할 수 있다. argument가 없으면 이후 mode parsing을 중단하지 않고 오류를 보고하며, privilege를 변경하기 전에 target이 현재 channel member로 resolve되어야 한다.

mutation은 `Channel::setOperator()`에 위임해 membership 밖에는 operator status를 부여할 수 없다는 불변식을 유지한다. lookup은 canonical하게 수행하면서 broadcast에는 target에 저장된 display nickname을 사용해 protocol presentation과 identity matching의 책임을 분리한다. 성공한 각 transition은 acting operator의 prefix와 실제 적용한 `+o` 또는 `-o` 방향을 정확히 포함해 알린다.

## test(smoke): 실제 TCP 등록과 채널 흐름 검증
internal class를 직접 호출하지 않고 실제 loopback TCP socket을 통해 빌드된 server를 실행하는 end-to-end smoke harness를 추가한다. shell runner는 사용 가능한 port를 선택하고 격리된 log와 함께 executable을 실행한 뒤 accept readiness를 기다리며, EXIT trap으로 process와 temporary file 정리를 보장한다. scenario는 Makefile의 `test`, `smoke` target으로 노출한다. 이를 통해 build output, process startup, socket configuration, event dispatch, parsing, application state, shutdown을 하나의 통합 system으로 검증한다.

Python client는 잘못된 password 거부, 완전한 registration, 여러 TCP write로 나눈 command, canonical index를 통한 case-sensitive nickname collision 동작, JOIN/NAMES, TOPIC, channel·direct PRIVMSG, INVITE consumption, invite-only·operator mode, 위임된 topic privilege, KICK, PART, MODE query, QUIT을 다룬다. assertion은 protocol substring을 기다리면서 진단용 최근 transcript를 보존한다. 특히 split PING은 stream framing이 packet boundary와 독립적임을 검증하고, multi-client channel assertion은 state transition이 실제로 의도한 peer에게 fan-out되는지 확인한다.

## feat(room): 채널 목록 조회 구현
live channel registry의 projection으로 LIST를 구현한다. command는 선택적으로 comma로 구분된 요청 집합으로 출력을 제한하고 321 header와 323 terminator를 보낸다. 일치하는 각 channel은 authoritative member count와 topic 또는 안정적인 fallback description을 포함한 numeric 322로 보고한다. ordered registry를 순회하므로 unknown filter를 위해 channel을 생성하지 않으면서도 deterministic output을 만든다.

`Channel` aggregate에는 read-only member count와 creation-time metadata를 추가하고, 생성 시점은 aggregate가 만들어질 때 기록한다. member count는 별도 counter를 유지하지 않고 membership set에서 계산하므로 JOIN, PART, KICK, disconnect cleanup이 membership을 변경할 때 synchronization error를 피한다. creation time은 아직 LIST에서 출력하지 않지만, channel ownership과 함께 저장함으로써 값이 모호하지 않은 유일한 지점에 lifecycle metadata를 확립한다.

## feat(room): 채널 구성원 조회 구현
기존 NAMES projection을 registered command로 노출한다. parameter가 없으면 모든 live channel을 보고하고, comma로 구분된 list가 있으면 존재하는 각 channel을 독립적으로 보고한다. unknown channel name에도 가짜 membership list나 client를 sequence completion 대기 상태로 남길 오류를 보내지 않고 mandatory 366 end marker를 반환한다.

실제 member formatting은 계속 `sendNames()`에 위임하므로 operator prefix, stale-client filtering, 353/366 paired framing이 JOIN 뒤의 response와 동일하게 유지된다. command는 read-only이며 membership authorization을 수행하지 않는다. 따라서 이 구현에서는 public channel membership을 현재 aggregate state의 projection으로 제공하면서 실수로 channel을 생성하지 않는다.

## test(client): 채널 목록 응답 검증
새로 노출한 room query의 framing contract를 검증하도록 실제 TCP smoke scenario를 확장한다. 알려진 channel에 JOIN한 뒤 client가 filtered LIST를 실행하고 322 entry와 323 sequence terminator를 모두 요구한다. 이어 NAMES를 실행해 353 membership payload와 366 terminator를 모두 요구한다.

이 assertion은 command recognition만 확인하는 것이 아니다. 각 multi-reply operation이 더 이상 record가 없음을 client가 판단하는 delimiter로 정확히 완료되는지 보장한다. 기존 integrated scenario 안에서 실행하므로 query가 isolated test fixture가 아니라 이전 JOIN으로 생성된 실제 channel state를 관찰하는지도 확인한다.

## feat(registration): 등록 대기 시간 제한
주기적인 application maintenance를 추가하고 연결만 한 채 registration을 완료하지 않는 client의 수명을 제한한다. transport acceptance가 client state를 생성할 때 connection time을 기록하고, `main`은 각 readiness poll 뒤 `onTick()`을 호출한다. maintenance는 close request나 callback이 순회를 invalidate하지 않도록 descriptor snapshot을 대상으로 동작한다. 설정된 deadline을 넘긴 unregistered client는 registration-timeout numeric을 받고 일반 graceful-close 경로로 들어간다.

runtime parsing은 이제 `--registration-timeout=N`을 허용하고, 하루를 상한으로 하는 완전한 양의 decimal input을 검증하며, unknown option은 거부한다. timeout을 `RuntimeConfig`에 두어 operational policy를 registration logic과 분리하고, timestamp는 `ClientState`에 기록해 lifecycle data를 그것이 제어하는 state 옆에 둔다. 별도의 timer thread를 추가하거나 server-owned cleanup을 우회하지 않으면서 incomplete handshake가 registry 및 connection resource를 무기한 점유하지 못하도록 한다.

## feat(heartbeat): 유휴 연결에 PING을 보내고 응답 대기
주기적인 maintenance hook 위에 client별 heartbeat state machine을 도입한다. 받은 모든 line은 `lastActivityAt`을 갱신한다. 설정된 idle interval이 지나면 server가 고유하게 구성된 PING token을 queue하고, client를 response 대기 상태로 표시한 뒤 전송 시간을 기록한다. 이 상태에서 ping deadline이 만료되면 probe를 반복해서 보내지 않고 IRC ERROR를 생성하고 종료를 요청한다.

PONG은 pre-registration command 단계에서도 허용하고 outstanding-heartbeat state를 해제하며, registration timeout은 계속 maintenance에서 가장 먼저 검사한다. idle 및 ping deadline은 registration deadline과 함께 검증되는 runtime option으로 노출한다. state는 `ClientState`에 두므로 liveness는 event backend가 아니라 protocol identity에 속하고, 모든 timeout 종료도 queued output과 중앙화된 disconnect cleanup을 통과한다. 이 단계의 handler는 token을 비교하지 않고 모든 PONG을 acknowledgement로 처리한다. 이 커밋은 lifecycle mechanism을 먼저 확립하고, 필요하면 이후에 token correlation을 보완하도록 남긴다.

## test(client): 서버 PING에 응답하는 검사 클라이언트 구현
server가 heartbeat를 시작했을 때 integration-test peer가 실제 IRC client처럼 동작하도록 한다. 완전히 framing된 inbound line은 기록한 뒤 모두 검사하며, server-prefixed와 unprefixed PING 형식을 모두 인식하고 token 앞의 optional colon을 제거한 다음 대응하는 PONG을 자동으로 보낸다. auto-response는 기본 활성화하되 peer별로 설정 가능하게 해 이후 테스트에서 의도적으로 응답하지 않는 connection도 모델링할 수 있다.

이 동작을 test transport abstraction에 넣어 heartbeat policy가 활성화되었다는 이유만으로 관련 없는 장시간 smoke assertion이 실패하지 않게 한다. 또한 test case 곳곳에 수동 liveness response를 흩뿌리지 않고도 일반 scenario에서 server의 PONG handling을 실행한다. reply 전에 PING을 먼저 기록해 observability를 유지하므로 server가 실제로 probe를 시작했는지 명시적인 assertion으로 확인할 수 있다.

## test(client): 유휴 연결의 PING·PONG 흐름 검증
integration test 안에서 liveness 동작을 관찰할 수 있도록 짧고 명시적인 registration, idle, ping deadline으로 smoke server를 실행한다. 새로 registered된 peer를 idle 상태로 두어 server PING을 받게 하고, peer의 자동 response로 connection을 유지한다. 같은 peer가 이어서 직접 PING을 보내 PONG을 받아야 하며, server가 시작한 heartbeat cycle 뒤에도 양방향 liveness command가 정상 동작하는지 확인한다.

이 scenario는 `pollOnce()`, `onTick()`, client별 activity timestamp, queued server output, client PONG processing, 지속적인 command dispatch 사이의 timing integration을 검증한다. 실제 elapsed time과 socket을 사용하므로 unit-level clock test보다 격리 정도는 낮지만, executable에 설정한 deadline과 event loop가 deployment와 유사한 조건에서 함께 동작하는지 직접 검증한다.

## feat(throttle): 클라이언트별 명령 호출 횟수 제한
성공적으로 parsing한 뒤 command dispatch 전에 client별 sliding-window command limiter를 추가한다. 각 client는 command timestamp를 시간순으로 저장하고, 설정된 window 이상 지난 entry를 앞에서 제거한 다음 현재 command를 추가한다. 설정된 횟수를 넘으면 numeric 439를 보내고 종료를 요청하며, 문제가 된 command가 protocol handler에 도달하지 못하게 한다. malformed line은 유효 command quota를 소비하지 않고 계속 parser limit의 적용을 받는다.

deque를 사용해 pruning 비용을 만료된 entry 수에 비례하게 만들고 과거 timestamp 전체를 반복해서 scan하지 않도록 한다. `--rate-limit=COUNT:SECONDS` option은 capacity와 window duration을 분리하고 필요한 syntax를 검증하며, count 0은 같은 code path를 유지하면서 enforcement가 비활성화된 상태로 처리한다. limiter를 application boundary에 두어 abuse policy를 개별 handler나 readiness backend에 결합하지 않고 registration 전후 command를 동일하게 보호한다.

## test(client): 명령 호출 횟수 제한 검증
application-level sliding window에 대한 integration regression을 추가한다. 완전히 registered된 client가 PING command 25개를 burst로 전송하면 numeric 439를 받아야 한다. 이를 통해 limiter가 registration 이후의 일반적인 유효 command에도 적용되고, 초과 traffic이 내부 기록에만 남는 것이 아니라 wire protocol을 통해 거부되는지 검증한다.

test peer는 이제 socket 수준 read error를 end-of-stream으로 처리한다. server가 rejection을 queue한 뒤 throttled connection을 의도적으로 닫기 때문에 필요한 동작이다. 이를 통해 예상된 teardown을 test-harness 실패로 바꾸지 않고 마지막 response를 assertion이 관찰할 수 있으며, 실제 TCP connection에서 limiter의 response-before-close 동작을 검증한다.

## feat(buffer): 송신 대기열 크기 제한
느리거나 읽지 않는 peer가 process memory를 무한히 증가시키지 못하도록 각 connection의 미전송 output을 제한한다. `Connection`은 설정 가능한 pending-byte 상한을 받고 move construction과 assignment에도 이를 함께 이전하며, raw data나 정규화된 IRC line을 추가하기 전에 현재 미전송 byte 수를 검사한다. 한도를 넘으면 해당 payload를 queue에 넣지 않고 구체적인 reason과 함께 connection 종료를 표시한 뒤 server caller에 실패를 반환한다.

limit은 전체 backing-buffer size가 아니라 `pendingBytes()`를 측정하므로 이미 flush된 byte는 논리적인 capacity를 계속 소비하지 않는다. `queueLine()`은 admission check에 정규화된 CRLF byte도 포함해 wire에서 강제하는 정확한 resource 불변식을 유지한다. `Server::sendTo()`와 `queueRawTo()`는 readiness와 close state를 계속 갱신하면서 enqueue 성공 여부를 caller에게 전파하고, accepted connection은 `--max-pending-bytes`로 설정할 수 있는 `Server::Config::maxPendingBytes`를 상속한다. 이로써 모든 outbound path가 합류하는 transport ownership boundary에 backpressure protection을 둔다.

## feat(server): 최대 연결 수 제한
server의 accepted-connection boundary에 admission limit을 추가한다. `accept()` 성공 후 `Connection` 객체, event registration, application client state를 만들기 전에 live connection map의 크기를 설정된 최대값과 비교한다. capacity에 도달했으면 rejection을 보고하고 방금 수락한 descriptor를 닫은 뒤 listener의 accept queue를 계속 drain한다.

ownership transfer 전에 검사함으로써 거부된 descriptor가 downstream registry에 들어가지 않도록 하고, connection count를 server의 authoritative map 기준으로 유지한다. 기본값은 유한하며 설정값 0은 cap을 비활성화한다. `--max-connections`는 기존 runtime parser를 통해 transport configuration을 갱신하므로 protocol handler에 capacity check를 추가하지 않고 deployment policy를 조정할 수 있다.

## feat(metrics): 서버 실행 지표 조회 기능 추가
측정 대상 event를 소유하는 계층에 누적 runtime counter를 도입한다. `Server::Metrics`는 accepted·closed connection, 완성된 input line, outbound enqueue failure를 해당 사실이 authoritative해지는 정확한 transport transition에서 기록한다. `AppMetrics`는 성공적으로 허용된 command, 성공한 PRIVMSG target operation, command limiter가 거부한 client를 별도로 기록해 protocol code를 socket internals에 결합하는 하나의 cross-layer statistics object를 만들지 않는다.

두 metric set과 현재 connection·channel count를 읽어 하나의 NOTICE summary를 내보내는 registered-client `METRICS` command를 추가한다. 현재 gauge는 live server와 channel container에서 계산하고, 과거 event는 monotonic counter로 유지한다. 이 구분으로 중복된 mutable count가 authoritative state와 어긋나는 것을 막는다. 따라서 response는 event-loop control flow를 바꾸거나 metrics가 application behavior를 결정하게 하지 않으면서 가벼운 in-protocol observability를 제공한다. relayed-message 증가는 개별 channel recipient 수가 아니라 성공적으로 resolve된 PRIVMSG target operation 하나를 의미해 counter가 실제 기록 지점의 의미와 일치하도록 한다.

## test(client): 서버 지표 명령 검증
registration, channel activity, heartbeat handling, rate-limit rejection이 이미 counter를 변화시킨 뒤 `METRICS`를 실행하도록 real-TCP smoke scenario를 확장한다. client는 자신의 nickname 앞으로 온 NOTICE 중 trailing text가 live connection gauge로 시작하는 response를 요구한다. 이를 통해 command가 일반 registered dispatch를 통해 도달 가능하고 transport·application measurement를 하나의 유효한 IRC frame으로 조합할 수 있음을 확인한다.

connection timing과 이전 scenario activity 때문에 cumulative total은 integration 환경에 따라 달라지므로 assertion은 정확한 누적값 대신 response contract를 의도적으로 검사한다. 이 방식은 smoke test를 모든 counter transition의 취약한 재구성으로 만들지 않으면서 command availability와 serialization을 보호한다.

## chore(server): 서버 식별 문자열과 환영 응답 정리
임시 reference-server identity를 executable의 `irc-relay-server` identity로 바꾸고 protocol prefix와 registration numeric에서 동일한 `irc.relay.local` server name을 사용한다. 001–003 welcome text는 registration ordering이나 numeric framing을 바꾸지 않고 실제 relay server와 C++17 event backend를 설명하도록 정리한다.

client가 이 값을 post-registration protocol contract의 일부로 노출하므로 advertised host와 product wording을 일관되게 유지하는 것이 중요하다. 이 변경은 state나 transport 변경이 아니라 presentation 수준 조정이므로 기존 registration transition과 response construction은 그대로 유지한다.

## feat(log): 연결 상태와 실행 지표 기록
standard error에 하나의 `event=<name>` record와 뒤따르는 key-value field를 기록하는 단일 structured logging 함수를 추가한다. field value의 whitespace는 underscore로 정규화해 peer address, reason, nickname, error message가 하나의 물리적 log line 안에 유지되고 multiline ambiguity 없이 검사하거나 처리할 수 있도록 한다. helper는 startup·error handling, client connection·registration transition, disconnect, channel creation, rate-limit rejection, heartbeat timeout event에서 공유한다.

application metrics에는 cumulative room creation, heartbeat probe, ping timeout을 추가하고 orderly termination 중 consolidated `server_metrics` event를 기록한다. logging은 사후에 state를 재구성하지 않고 해당 사실을 확정하는 transition에 연결한다. channel creation은 insertion 시에만, registration은 registered flag를 설정한 뒤에만, timeout이나 rate-limit event는 enforcement branch에서 기록한다. 이에 따라 operational evidence가 underlying state와 같은 ownership boundary를 따르면서 logging은 관찰 역할만 수행한다. command decision을 변경하지 않고 live connection과 room에 대한 두 번째 source of truth도 만들지 않는다.

## feat(shutdown): 종료 전 송신 대기열 처리
signal handler에서 server를 즉시 멈추는 대신 정상적인 program control flow에서 수행하는 two-phase shutdown으로 바꾼다. signal handler는 이제 `sig_atomic_t` run flag를 clear하는 signal-safe operation만 수행한다. main loop가 해당 flag를 확인하면 application은 모든 client descriptor를 snapshot하고 각 client에 IRC ERROR를 queue한 뒤, 마지막 output이 쓰이기 전에 socket을 파괴하지 않고 기존 graceful-close mechanism을 통해 종료를 요청한다.

main routine은 connection이 남아 있는 동안 최대 8회의 50-millisecond poll을 수행해 bounded drain을 진행한다. 이 과정에서 write readiness, close request, disconnect callback, channel cleanup, descriptor release가 일반 server path로 진행된다. drain이 끝난 뒤에만 callback을 detach하고 `Server::stop()`을 호출한다. 이 상한은 읽지 않는 peer 때문에 shutdown이 무한정 기다리지 않도록 하며, connection-owned pending buffer를 재사용해 terminal protocol output이 일반 backpressure 규칙 아래 flush되거나 bounded shutdown budget이 끝난 경우에만 포기된다는 불변식을 유지한다.

## test(smoke): 서버 보호 옵션으로 실행 검증
constructor default에 의존하지 않고 명시적인 registration, heartbeat, command-rate, outbound-queue limit으로 integration server를 실행한다. 이에 따라 기존 smoke sequence는 이 option들이 함께 parsing되는지와 설정된 protection policy 아래에서도 일반 registration, channel operation, heartbeat behavior, metrics, 의도적인 25-command flood가 계속 동작하는지 검증한다. `24:3` command window를 사용해 flood assertion이 실제 전달된 runtime 값을 검증하도록 한다.

script는 `TMPDIR`에 기반한 portable temporary-file template도 사용하고 default test password를 relay-server identity에 맞게 갱신한다. 이 커밋에서는 outbound-byte 설정을 의도적으로 socket을 포화시키는 방식이 아니라 startup configuration으로 검증하므로, queue-overflow branch를 실제보다 넓게 검증했다고 주장하지 않고 option integration만 확립한다.

## test(client): 여러 클라이언트의 채널 메시지 전달 검증
독립적으로 registered된 client 6개가 하나의 shared load channel에 JOIN하는 real-socket scenario로 확장한다. 각 client가 자신의 JOIN을 확인한 뒤 peer 하나가 channel PRIVMSG를 보내고 다른 peer가 이를 받아야 한다. 이를 통해 functional command sequence에서 사용한 최소 2~3 client topology보다 큰 환경에서 반복 accept, registration, channel insertion, membership tracking, broadcast fan-out을 실행한다.

이 scenario는 throughput benchmark가 아니라 의도적으로 제한된 integration load다. 여러 동시 channel member를 추가해도 client state가 덮어써지거나 broadcast routing이 무너지지 않는다는 점은 확인하지만 latency나 capacity 측정값을 주장하지 않는다. 모든 peer를 공통 cleanup list에 유지해 확장된 topology도 기존 disconnect path로 teardown할 수 있는지 함께 검증한다.

## refactor(command): 명령 처리 시각 기록 통합
input line이 application processing에 들어올 때 현재 wall-clock 값을 한 번만 가져와 `lastActivityAt`과 sliding-window rate limiter에서 함께 사용한다. 이전에는 인접한 두 `time()` 호출이 경계 시점에서 같은 command의 liveness update와 quota entry를 서로 다른 초에 기록할 수 있었다.

하나의 timestamp를 사용해 parsing, rate-limit threshold, dispatch order는 바꾸지 않으면서 command에 단일 observation time을 정의한다. 이 refactor는 작은 시간적 불일치 가능성을 제거하고 이후 idle 및 command-window state에 대한 추론을 `std::time_t`가 제공하는 정밀도 범위에서 결정적으로 만든다.

## test(irc): 실행 조건과 오류 동작 계약 검증
executable을 세 가지 public boundary에서 명확히 규정하는 전용 contract suite를 추가한다. 세 boundary는 command-line failure behavior, 정확한 IRC wire behavior, orderly process shutdown이다. CLI check는 binary를 subprocess로 실행하고 누락된 argument, 잘못된 port, 0 이하 timeout, malformed rate-limit syntax, unknown option, 잘못된 unsigned value에 대해 문서화된 exit status, 빈 standard output, 정확한 usage 또는 validation diagnostic을 요구한다. 플랫폼에 따라 달라지는 하나의 diagnostic은 모든 assertion을 약화시키지 않고 operating system의 `EINVAL` suffix 유무만 둘 다 허용한다.

재사용 가능한 socket peer를 substring-only matching에서 protocol-aware observation으로 확장한다. 이제 각 frame의 실제 line ending을 보존하고, sequence의 바로 다음 frame을 요구하거나 complete frame을 exact 또는 anchored regular expression으로 비교할 수 있으며, peer closure를 감지하고 local socket address로 server-visible hostmask를 재구성할 수 있다. 따라서 registration은 순서가 있는 001–003 sequence와 CRLF framing을 검증하고, 기존 smoke flow는 token을 단순 포함한 임의 line을 허용하지 않고 complete prefix, parameter, numeric, channel broadcast, mode string, metrics key order를 assertion하도록 다시 작성한다.

새 end-to-end scenario는 pre-registration rejection, nickname syntax와 case-insensitive collision, password failure, fragmented TCP input, JOIN reply ordering, LIST·NAMES projection, topic·messaging fan-out, invitation·operator transition, KICK, direct messaging, throttling, heartbeat continuity를 다룬다. registered shutdown client를 준비한 뒤 실행 중인 server에 SIGTERM을 보내 EOF 전에 `ERROR :Server shutting down`을 반드시 받도록 하고, startup에서 connection, registration, final metrics, disconnect까지 structured log order를 검사한다. 이를 통해 signal-to-drain 설계가 내부 state에만 존재하는 것이 아니라 wire와 log boundary 모두에서 관찰 가능한지 검증한다.

optional JSON manifest에는 정규화된 CLI result, wire expectation, regex contract, lifecycle order를 기록한다. 동적으로 정해지는 peer port는 정규화하고 가변 counter는 regex 기반으로 남겨 안정적인 compatibility guarantee와 실행별 값을 분리한다. shell smoke runner는 같은 live process를 대상으로 이 contract suite를 실행하고 의도적인 termination을 기다린다. 따라서 테스트 성공은 build된 executable에서 startup, protocol handling, protection policy, logging, graceful shutdown이 함께 조합되어 동작함을 보여준다.

## fix(config): 서버 크기 옵션을 오버플로 없이 해석
`strtol`, `strtoul` 변환 뒤 narrowing cast를 수행하는 대신, `parsed * 10 + digit`을 계산하기 전에 각 digit을 안전하게 포함할 수 있음을 증명하는 type-directed decimal parser로 바꾼다. helper는 비어 있지 않은 ASCII digit sequence만 허용하고 accumulator를 `maximum / 10`, 마지막 digit을 `maximum % 10`과 비교한다. 따라서 destination type 범위를 벗어난 값은 unsigned wraparound나 implementation-dependent narrowing 없이 거부된다.

port는 `unsigned short` capacity를 직접 기준으로 parsing한 뒤 0을 거부하고, size option은 실제 `std::size_t` 최대값을 사용하며, timeout value는 누적 중 86,400을 상한으로 제한한다. 또한 C conversion routine의 관대한 lexical behavior를 상속하지 않으므로 sign과 주변 whitespace도 유효하지 않다. 이를 통해 승인된 모든 numeric option은 해당 socket, buffer, connection, timing limit을 실제로 제어할 destination type에 정확히 표현 가능해야 한다는 더 강한 configuration 불변식을 확립한다.

## test(config): 크기 옵션 경계와 오류 입력 검증
numeric parsing에 대한 executable contract를 일반적인 malformed text뿐 아니라 lexical 및 representational boundary까지 확장한다. port와 timeout option은 기존 diagnostic을 유지하면서 명시적인 plus·minus sign, leading·trailing space, destination-width overflow, 매우 긴 decimal input을 모두 거부해야 한다.

size 기반 option에서는 runtime에 `2^(pointer width)`를 계산해 처음으로 표현 불가능한 `std::size_t` 값을 outbound-byte limit과 rate-limit count에 각각 전달한다. 별도로 signed connection limit과 whitespace가 붙은 connection limit도 검사한다. `struct.calcsize("P")`에서 boundary를 계산하므로 32-bit와 64-bit target 모두에서 regression이 유효하며, 하나의 host width를 가정하지 않고 parser가 도입한 no-narrowing guarantee를 직접 검증한다.

## fix(heartbeat): 단조 시계와 토큰으로 응답 대기 상태 관리
모든 elapsed-time state를 wall-clock 기반 `std::time_t` 값에서 `std::chrono::steady_clock` time point로 옮긴다. connection age, last activity, heartbeat deadline, command-window entry가 이제 하나의 monotonic clock을 공유하고, 비교에는 명시적인 `std::chrono::seconds` duration을 사용한다. 따라서 system time 보정이 registration이나 ping deadline을 뒤로 돌리거나 조기에 만료시키거나 오래된 rate-limit entry를 남기는 문제가 발생하지 않는다.

heartbeat 교환을 Boolean acknowledgement에서 서로 대응되는 challenge-response로 강화한다. 각 PING에는 process-local 증가 token을 부여하고 정확한 token을 `ClientState`에 저장한다. PONG은 parameter가 정확히 하나이고 그 값이 pending token과 일치할 때만 `awaitingPong`을 해제한다. unsolicited, malformed, stale, unrelated PONG은 무시하므로 현재 challenge에 대한 응답만 liveness를 증명한다. token과 timestamp를 함께 clear해 idle client는 response를 기다리지 않는 상태이거나, monotonic send time과 식별 가능한 outstanding probe 하나를 가진 상태 중 하나만 유지한다.

input line에서 캡처한 동일한 monotonic timestamp를 activity와 command-rate accounting의 source로 계속 사용해 앞서 도입한 single-observation-time 결정을 유지한다. 이 커밋은 timeout handling에 특수 case를 추가하는 대신 공통 client state boundary에서 clock 선택과 protocol-state correlation을 함께 바로잡는다.

## test(heartbeat): PONG 토큰과 시간 경계 검증
전용 contract peer에서는 automatic heartbeat reply를 비활성화해 test가 response state를 명시적으로 제어하도록 한다. 유효한 case에서는 server PING의 정확한 token을 캡처해 PONG에 그대로 돌려보내고, 여러 번의 1초 interval을 기다린 뒤에도 METRICS를 계속 성공적으로 실행한다. 이를 통해 correlated response가 outstanding ping deadline을 해제하고, 원래 challenge가 timeout에 가까워질 시간이 지난 뒤에도 connection이 계속 사용 가능한지 확인한다.

두 번째 peer는 syntax상 유효하지만 관련 없는 token을 가진 PONG을 보낸다. test는 server가 pending challenge를 유지하고 `ERROR :Ping timeout`을 보낸 뒤 connection을 닫아야 한다고 요구한다. forged line을 수신하면 일반 activity state는 여전히 갱신되므로, 이 scenario는 heartbeat completion이 일반 traffic이나 임의의 PONG 존재 여부가 아니라 token correlation에 의존함을 구체적으로 증명한다.

## fix(connection): 송신 대기열 계산과 재시도 상태 보호
비교 전에 신뢰할 수 없는 size를 더하는 대신 admission 조건을 `pending <= limit`, `byteCount <= limit - pending`으로 표현해 outbound-capacity check를 overflow-safe하게 만든다. `queueLine()`은 먼저 정규화된 payload에, 이어서 CRLF 2 byte에 각각 검사하므로 `pending + payload`나 `payload + 2`가 wraparound되어 설정된 hard limit을 넘는 데이터를 잘못 허용할 수 없다. 거부된 append는 이미 queue된 output을 변경하지 않은 채 기존처럼 connection 종료를 요청한다.

production 기본값으로 실제 `send()` syscall을 유지하면서 주입 가능한 send operation을 도입한다. 이 operation은 connection의 다른 owned state와 함께 move되므로 public result contract를 바꾸지 않고 write state machine을 결정적으로 실행할 수 있다. `flushPending()`은 이제 offset을 전진하기 전에 요청한 byte count보다 큰 양수 결과도 거부한다. 정상적인 kernel은 그런 값을 반환할 수 없지만, 이 경계를 검증함으로써 잘못된 transport implementation이나 test double이 cursor를 buffer 밖으로 이동시키고 이후 pending-byte 계산을 underflow시키는 것을 막는다.

이 변경으로 queue 불변식의 양쪽을 모두 보호한다. byte를 append하기 전에 capacity arithmetic이 wraparound될 수 없고, send progress는 실제로 제공한 byte보다 더 앞으로 진행할 수 없다. EINTR, would-block 결과, zero progress, terminal error는 계속 기존 retry 또는 close path를 위해 미전송 suffix를 보존한다.

## test(connection): 부분 송신과 대기열 경계 검증
connection write state machine에 집중한 C++ test executable을 추가하고 실제 server smoke suite보다 먼저 기본 `make test` 경로에 통합한다. scripted sender가 정확한 byte count와 errno 결과 sequence를 제공하므로 socket buffer pressure나 scheduler timing에 의존하지 않고 각 transition을 assertion할 수 있다. test binary는 cleanup 및 ignore rule에서 generated artifact로 취급한다.

boundary test는 `std::size_t` 최대값에서의 capacity arithmetic, canonical CRLF를 포함한 정확한 limit line admission, 첫 초과 byte 거부, rejection 뒤 기존 queue 보존을 검증한다. scripted partial-send scenario는 EINTR retry, 성공한 prefix, EAGAIN·EWOULDBLOCK pause, 진행 이후 capacity 재사용, 최종 completion을 조합한다. pending count에서 실제 전송된 byte만 빠지는지와 writable event 여러 번을 거친 재구성 output이 중복·누락·순서 변경 없이 정확히 `abcdefghijkl`인지 확인한다.

별도 case에서는 zero-byte send가 아무 것도 소비하지 않고 retry 가능하게 남는지, terminal EPIPE가 pending data를 버리지 않은 채 실패를 보고하고 종료를 요청하는지, 요청 buffer보다 큰 불가능한 결과가 offset을 손상시키지 않고 거부되는지 검증한다. 이 검사는 central non-blocking transport 불변식을 고정한다. queue된 모든 byte는 성공한 send가 정확히 해당 부분이 전송됐다고 보고할 때까지 계속 accounting되어야 한다.

## fix(server): 연결 콜백 수명과 이벤트 등록 롤백 보장
application callback을 지나 raw pointer나 reference를 유지하지 않고 descriptor 기반 lookup을 중심으로 server-side connection 접근을 다시 구성한다. connect, line, disconnect, error handler는 외부에서 제공되는 code이므로 현재 connection을 동기적으로 제거하거나 예외를 던질 수 있다. 각 경계 이후 server는 close 요청, event processing 지속, readiness interest 갱신 전에 descriptor를 다시 resolve한다. callback이 `disconnect()`를 호출해도 event loop에 dangling `Connection*`가 남지 않게 하면서 callback API 자체는 유지한다.

connection ownership과 event registration을 명시적으로 rollback 가능한 transition으로 만든다. accepted `Connection`은 먼저 owning map에 삽입하고, descriptor를 event backend에 등록하는 데 실패하면 해당 map entry를 지워 RAII로 socket을 해제한다. startup 중 listener registration도 같은 방식으로 처리한다. `addFd()`가 실패하면 일부만 시작된 server를 남기지 않고 listener를 닫고 사용할 수 없는 event manager state를 버린 뒤 예외를 다시 던진다. 중복 accepted descriptor는 owned connection을 조용히 교체하지 않고 logic error로 취급한다.

readiness refresh는 fd를 받아 현재 소유 중인 connection을 다시 조회하고 transition 완료 여부를 반환하도록 바꾼다. `updateFd()` 실패는 보고한 뒤 일반 disconnect path로 수렴시키고, `sendTo()`와 `queueRawTo()`는 write interest 없이 queue된 output을 전달할 수 있다고 잘못 알리지 않고 그 실패를 caller에 노출한다. error reporting은 `noexcept`로 만들고 error callback이 던진 예외를 내부에서 차단해 diagnostic code가 cleanup을 중단하지 못하도록 한다. 이를 통해 reentrant callback이나 backend failure가 있어도 connection map, event-manager registration, descriptor lifetime이 함께 전진하거나 함께 teardown된다는 불변식을 확립한다.

## test(server): 연결 제거와 이벤트 등록 실패 경로 검증
주입한 `FakeEventManager`와 실제 loopback TCP client를 기반으로 결정적인 server-lifetime test를 추가한다. fake backend는 descriptor interest를 기록하고 다음 add 또는 update operation을 실패시킬 수 있으며, host event queue에 의존하지 않고 선택한 readable event를 전달할 수 있다. 이를 통해 epoll·kqueue timing으로 신뢰성 있게 재현하기 어려운 lifecycle behavior를 격리하면서도 server의 실제 listener, accept, connection, callback code를 실행한다.

suite는 다섯 가지 failure contract를 검증한다. `accept()` 뒤 event registration이 실패하면 map-owned connection과 backend descriptor가 모두 남아서는 안 된다. connect callback과 line callback은 각각 자신의 connection을 disconnect한 뒤 예외를 던져도 해제된 state에 이후 접근을 유발해서는 안 된다. error handler의 예외는 내부에서 차단되어야 한다. write-interest update가 실패하면 `sendTo()`가 실패하고 ownership과 event registration을 모두 제거해야 한다. 마지막으로 outbound queue limit을 넘었을 때 drain할 byte가 없다면 요청한 close를 즉시 완료해야 한다.

test를 별도 build target으로 기본 test pipeline에 통합하고 cleanup 시 binary를 제거한다. end-to-end smoke suite보다 먼저 실행함으로써 server fix가 도입한 map/event-registry consistency와 callback-reentrancy 불변식에 직접적인 regression evidence를 제공한다. broader scenario에서 crash나 leaked descriptor가 비결정적으로 나타나기를 기다리는 방식에 의존하지 않는다.

## fix(app): 응답 실패 뒤 클라이언트 상태 다시 확인
response delivery를 실패할 수 없는 side effect가 아니라 application lifecycle transition이 될 수 있는 operation으로 취급한다. `Server::sendTo()`는 event interest 갱신 중 실패할 수 있고 target을 동기적으로 disconnect할 수도 있다. 그러면 disconnect callback이 sending handler가 재개되기 전에 client record, channel membership, 경우에 따라 entire channel aggregate까지 제거한다. 따라서 response helper는 성공 여부를 반환하고, multi-frame path는 첫 enqueue 실패 뒤 이미 지워졌을 수 있는 state를 계속 읽지 않고 즉시 중단한다.

broadcast나 reply 사이에 application state를 유지하는 command sequence를 강화한다. JOIN은 요청 channel name과 nickname을 복사하고 fan-out 뒤 client를 다시 확인한 다음 topic·NAMES reply 전에 channel을 다시 resolve한다. KICK과 PART도 안정적인 identifier를 cache하고 broadcast 뒤 membership mutation 전에 channel을 다시 찾는다. NICK은 common peer에 알린 뒤 source client가 여전히 존재하는지 확인한다. registration은 nickname을 cache하고 001, 002, 003을 순차적으로 전송하며 세 response가 모두 accepted된 경우에만 completion을 logging한다. INVITE는 어느 한 send가 cleanup을 유발하기 전에 cache된 값으로 두 outbound frame을 모두 구성한다.

heartbeat state는 PING을 queue하기 전에 먼저 commit한다. failed send 뒤 field를 설정하면 더 이상 유효하지 않을 수 있는 client pointer를 통해 write하게 되기 때문이다. heartbeat metric은 frame이 accepted된 뒤에만 증가한다. topic·NAMES helper도 channel name을 복사하고 failure를 전파하며, NAMES는 앞선 353을 queue하지 못하면 terminating 366도 보내지 않는다. 이 변경이 transport failure를 transactional하게 만들지는 않는다. 앞선 state change나 이미 queue된 frame은 rollback하지 않는다. 대신 필요한 reentrancy 규칙을 확립한다. application state를 동기적으로 제거할 수 있는 send 뒤에는 code가 즉시 return하거나 이후 사용할 모든 client, channel, connection object를 다시 resolve해야 한다.

## test(app): 작은 송신 한도에서 상태 정리 검증
registration 중 response enqueue가 실패하도록 강제하는 application-lifetime regression을 추가한다. test는 제어 가능한 event manager와 loopback client를 사용해 실제 `Server`와 `IrcApplication`을 조합하지만, `maxPendingBytes`를 첫 welcome numeric조차 담을 수 없는 1 byte로 설정한다. 따라서 NICK과 USER를 전달하면 registration transition까지 진행한 뒤 socket pressure에 의존하지 않고 synchronous queue-rejection path를 결정적으로 실행한다.

예상 결과는 server는 계속 running 상태인 채 connection만 완전히 제거되는 것이다. standard error를 캡처해 실패한 response 뒤 `client_registered`가 출력되지 않아야 한다고 요구함으로써, client state가 제거된 후 application이 001–003 sequence를 계속 실행하거나 완료된 lifecycle transition을 기록하지 않는다는 점을 증명한다. 이 test는 contained per-client output failure와 server-wide failure를 구분하고 response acceptance, registration observability, cleanup 사이의 순서를 고정한다.

`main`을 제외한 모든 production application source와 test를 함께 build해 기본 test target에서 실행하고, 기존 transport 및 server-lifetime test와 함께 생성 binary를 cleanup한다. 이를 통해 reentrant-send fix를 lower-level connection test의 안전성에서 간접 추론하지 않고 application boundary에서 직접 검증한다.

## test(event): 160개 연결과 느린 수신자 처리 공정성 검증
동시에 여러 descriptor가 진행되는 상황과 읽지 않는 recipient로부터의 isolation을 모두 다루는 real-process event-loop regression을 추가한다. 첫 scenario는 TCP connection 160개를 열고 모든 peer에서 서로 다른 pre-registration PING을 전송한 뒤 client의 platform-default selector를 사용해 하나의 deadline 안에서 정확한 PONG response를 모두 수집한다. functional smoke suite의 소수 connection을 크게 넘는 규모에서도 epoll 또는 kqueue backend가 descriptor별 readiness를 잃거나 peer 간 response를 혼동하지 않고 connection set을 계속 등록·dispatch하는지 검증한다.

두 번째 scenario는 sender, probe, 그리고 receive buffer를 의도적으로 작게 만들고 읽기를 멈춘 recipient를 등록한다. sender가 그 slow client에 큰 PRIVMSG frame 4,096개를 보내 하나의 connection에 지속적인 outbound pressure를 만든다. 이후 무관한 probe가 PING을 보내고 여전히 PONG을 받아야 한다. 검증 대상 property는 isolation이다. non-blocking backpressure에 도달한 socket은 자신의 pending output을 보존해야 하며, single event loop를 막아 관련 없는 connection의 진행을 방해해서는 안 된다.

exercise가 protective default를 발동시키는 대신 event 및 buffering behavior를 측정하도록 높은 command, connection, pending-byte limit을 명시해 server를 실행한다. monotonic deadline, exact frame, bounded process termination을 사용하고 실패 시 log를 공개한다. 이 테스트는 throughput benchmark가 아니라 correctness stress test다. 160개 peer 전체와 slow-reader pressure 상황의 무관한 connection이 결국 진행함을 보장하지만 latency distribution이나 maximum capacity는 주장하지 않는다.

## fix(app): 응답 실패 뒤 명령 처리를 중단
길이가 가변적인 sequence를 출력하는 channel command에서 response-failure propagation을 완성한다. LIST는 opening 321이나 channel별 322 중 하나라도 queue하지 못하면 중단하고, NAMES는 channel projection이나 terminating 366 전송이 실패하면 중단한다. failed response는 requesting client를 동기적으로 disconnect할 수 있고 cleanup이 membership과 channel을 제거할 수 있으므로 즉시 return해야 한다. 그렇지 않으면 loop가 다음 iteration에서 증가시킬 map iterator가 이미 invalidated될 수 있다.

compound MODE processing에도 같은 규칙을 적용한다. response 전에 channel name을 cache하고, 다음 mode character로 진행하기 전에 모든 mode broadcast와 recoverable error numeric이 성공해야 한다. target nickname을 복사하기 전에는 inserting하지 않는 lookup으로 target client를 얻는다. operator change는 계속 notification 전에 channel을 mutation하지만, broadcast 실패 시 잠재적으로 지워진 channel이나 client object를 다시 사용하지 않고 command를 종료한다. query-only와 final reply는 handler가 바로 return하므로 별도의 continuation check가 필요하지 않다.

이 변경은 앞선 application-lifetime hardening이 남긴 마지막 gap을 닫는다. response helper는 이미 failure를 보고했지만 LIST, NAMES, MODE loop가 iterator나 pointer를 보유한 채 그 signal을 무시하고 있었다. 최종 contract는 multi-step handler 전체에서 일관된다. output failure가 disconnect cleanup을 유발했을 가능성이 생긴 뒤에는 필요한 모든 state가 여전히 유효하다고 확인되지 않는 한 이후 command step을 실행해서는 안 된다.

## test(app): 연결 정리 뒤 모드 변경 중단 검증
compound MODE command의 첫 notification이 command sender를 제거하는 경우를 검증하는 white-box regression으로 application-lifetime suite를 확장한다. 실제 server connection 2개를 accept한 뒤 unrelated registration transcript 없이 mode-loop behavior만 격리할 수 있도록 registered client record와 shared `#room` aggregate를 test가 직접 구성한다. fake event manager는 operator descriptor에 대해서만 다음 interest update가 실패하도록 설정한다.

`MODE #room +it`를 처리하면 먼저 invite-only mode를 적용하고 `+i` broadcast를 시도한다. 주입된 update failure로 broadcast 도중 sender가 동기적으로 disconnect되고 일반 application cleanup이 실행된다. unrelated peer가 아직 member이므로 channel은 남아 있어야 하고, 이미 적용된 `+i` state도 유지되어야 하며, sender의 client state는 없어지고 peer는 그대로 남아 있어야 한다. 가장 중요한 점은 topic protection이 계속 비활성 상태여야 한다는 것이다. 이는 handler가 뒤의 `t` character를 해석하기 전에 중단했음을 증명한다.

이 test는 선택한 failure semantics를 정확히 고정한다. compound mode processing은 atomic transaction처럼 rollback되지 않으므로 transport failure 전에 완료된 변경은 authoritative state로 남는다. 하지만 actor와 빌린 state가 제거된 뒤에는 이후 transition을 하나도 실행할 수 없다. targeted event-backend failure로 이 lifecycle boundary를 결정적으로 만들고, 앞선 fix가 제거한 stale-channel-pointer continuation이 다시 생기지 않도록 보호한다.

## ci: Linux·macOS 회귀와 새니타이저 자동화
모든 push와 pull request에서 read-only repository permission으로 저장소의 전체 build 및 regression pipeline을 실행하는 GitHub Actions workflow를 추가한다. fail-fast를 사용하지 않는 matrix가 Ubuntu와 macOS에서 모두 실행되며, project의 warning-as-error default로 compile한 뒤 `make test`를 수행한다. 이로써 일반적인 C++ portability뿐 아니라 platform별 readiness implementation도 모두 검증한다. 동일한 unit, contract, smoke, event-fairness target을 통해 Linux에서는 epoll, macOS에서는 kqueue를 실행한다.

AddressSanitizer와 UndefinedBehaviorSanitizer, frame pointer, debug information, 적당한 optimization을 사용해 다시 build하는 별도 Linux job도 추가한다. leak detection, 즉시 ASan termination, UBSan stack trace, halt-on-error 설정으로 memory leak, 잘못된 lifetime access, buffer misuse, integer undefined behavior와 관련 defect가 같은 real-network regression 실행 중 job failure로 이어지도록 한다. build와 test invocation 모두에 compiler flag를 전달해 생성되는 test executable도 server와 동일한 instrumentation 아래 두도록 한다.

각 job에 bounded timeout을 설정해 deadlocked event loop, 실패한 shutdown, stalled network test가 runner를 무제한 소비하지 않도록 한다. 이 workflow는 project의 portability, ownership, non-blocking I/O, lifecycle assumption을 local expectation에서 두 supported operating-system backend와 dynamic memory·undefined-behavior analysis 아래 반복 가능한 check로 전환한다.
