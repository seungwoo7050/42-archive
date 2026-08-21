# Thread 01 — Portable readiness and non-blocking transport

부제: 이벤트 준비 상태와 논블로킹 전송

## 1. Thread 목표

native readiness API의 차이를 공통 의미로 번역하고, move-only connection state와 single-threaded event loop가 입력·출력·종료를 어떻게 진행시키는지 commit 순서대로 복원합니다.

Source에서 확정된 significance:

> This progression builds the server from a portable event vocabulary into an operational single-threaded reactor. The decisive choices are not the platform calls themselves, but the separation of native readiness from server semantics, the move-only per-connection state machine, persistent partial-write progress, and the authoritative server cleanup path. Later reliability work depends directly on these ownership and I/O contracts.

이 문서의 source-confirmed 문장은 학습 방향을 고정하기 위한 출발점입니다. 실제 함수 동작, ownership, branch, 실행 결과는 반드시 각 SHA 코드와 test를 직접 확인해 채웁니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- `epoll`과 `kqueue`의 등록/notification 차이를 어느 경계에서 공통 의미로 바꾸는가?
- 한 fd의 socket lifetime, input fragment, output suffix, close state를 누가 함께 소유하는가?
- readiness 한 번이 여러 line, partial line, partial write, EOF, backpressure를 만들 때 각 상태는 어디에 남는가?
- accepted fd가 event registry와 connection map에 들어가고 빠지는 순서는 무엇인가?
- pending output과 write interest, graceful close completion은 어떤 조건으로 동기화되는가?

### Source와 직접 연결되는 invariant

- accepted descriptor마다 authoritative `Connection` owner가 하나이며 fd는 정확히 한 번 닫혀야 합니다. event registration과 connection map은 분리되어서는 안 됩니다.
- partial send는 실제 성공 byte 수만큼만 전진하고 retry는 unsent suffix의 순서를 보존해야 합니다.
- input framing은 incremental하고 output framing은 CRLF로 정규화되며 malformed/oversized frame이 이후 valid command로 남아서는 안 됩니다.

### Source와 직접 연결되는 engineering difficulty

- `epoll`과 `kqueue`의 서로 다른 등록/notification 모델을 server loop에 노출하지 않고 통합하는 문제.
- 한 readiness가 여러 line, partial line/write, interruption, backpressure, EOF, hard error를 만들 수 있는 byte-stream 모델링.
- callback 또는 interest update가 현재 처리 중인 connection을 제거할 수 있는 lifetime 문제의 기반.

## 3. 완료 기준

- 공통 `Event`에서 `Server::pollOnce()`와 client read/write 처리까지 caller/callee 흐름을 해당 SHA 코드로 설명할 수 있습니다.
- `Connection`의 fd·buffer·offset·close state 소유권과 move 이후 source/destination 상태를 증거 코드로 제시할 수 있습니다.
- `EINTR`, `EAGAIN`/`EWOULDBLOCK`, EOF, hard error, hangup을 read/write/wait별로 구분할 수 있습니다.
- queue된 byte와 write interest가 어긋나지 않는 조건 및 disconnect의 erase-before-callback 순서를 설명할 수 있습니다.
- final HEAD가 아니라 각 commit SHA의 코드와 필요한 직전 관련 SHA만으로 변화 과정을 기록했습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | 원문 확정 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `8e8a3db87950` | `feat(event): 이벤트 준비 상태 계약 정의` | A | ARCH, EVENT_IO | Defines the common readiness vocabulary and backend contract. |
| 2 | `d3f74e2857da` | `feat(event): kqueue 관심 상태 등록 구현` | B | EVENT_IO | Maps logical interest changes onto kqueue filters. |
| 3 | `769cd3094f71` | `feat(event): kqueue 준비 이벤트 변환 구현` | B | EVENT_IO | Converts kqueue notifications into common events. |
| 4 | `2284a0e0d8bb` | `feat(event): epoll 관심 상태 등록 구현` | B | EVENT_IO | Maps logical interest changes onto epoll registrations. |
| 5 | `f1320f357bca` | `feat(event): epoll 준비 이벤트 변환 구현` | B | EVENT_IO | Converts epoll notifications and socket errors into common events. |
| 6 | `8864f253ac15` | `feat(connection): 스트림 연결 상태 계약 정의` | A | ARCH, EVENT_IO, LIFECYCLE | Defines the move-only Connection and its I/O outcome model. |
| 7 | `d71a2549c0eb` | `feat(connection): 소켓 소유권과 이동 수명 구현` | A | LIFECYCLE, RISK | Implements exactly-once descriptor ownership and move transfer. |
| 8 | `9b601b69de4f` | `feat(connection): IRC 입력 프레임 추출 구현` | A | EVENT_IO, IRC_PROTOCOL, RISK | Establishes incremental IRC framing and the line-size boundary. |
| 9 | `b00589d4b1b1` | `feat(connection): 논블로킹 수신 상태 처리` | A | EVENT_IO, RISK | Implements the non-blocking receive state machine. |
| 10 | `a10fe961e2b1` | `feat(connection): 부분 송신 대기열 처리` | S | CORE, EVENT_IO, LIFECYCLE | Implements persistent partial-write progress and graceful output draining. |
| 11 | `e6492e27cc30` | `feat(server): 이벤트 서버 공개 계약 정의` | A | ARCH, EVENT_IO, LIFECYCLE | Defines Server ownership and the transport callback boundary. |
| 12 | `4ad1227e5119` | `feat(server): 논블로킹 연결 수락과 등록 구현` | A | EVENT_IO, LIFECYCLE | Integrates accepted descriptors into connection and event ownership. |
| 13 | `378d5304828d` | `feat(server): 준비 이벤트 루프 구동` | S | CORE, ARCH, EVENT_IO | Makes the portable event loop operational. |
| 14 | `625ffc924de8` | `feat(server): 송신 큐와 쓰기 관심 상태 연결` | A | EVENT_IO, LIFECYCLE, INTEGRATION | Couples pending output to write readiness and close completion. |
| 15 | `7a6bc7e1276a` | `feat(server): 연결 해제와 오류 정리 구현` | A | LIFECYCLE, RISK | Centralizes transport removal and disconnect notification. |

Commit 순서는 source에 정의된 순서입니다. 이 문서 안에서 재정렬하지 않습니다.

## 5. Commit별 학습 기록

각 commit에서 final HEAD를 보지 말고 해당 SHA의 tree와 필요한 parent/직전 관련 SHA만 확인합니다. 아래의 implementation anchor는 source에서 확정된 내용이며, code evidence 칸은 학습자가 직접 채웁니다.

### 5.1 `8e8a3db87950` — `feat(event): 이벤트 준비 상태 계약 정의`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | ARCH, EVENT_IO |
| 원문 확정 역할 | Defines the common readiness vocabulary and backend contract. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Portable readiness and non-blocking transport` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- `EventInterest`는 읽기와 쓰기 관심을 함께 표현할 수 있는 조합형 비트마스크입니다.
- `Event`는 정상 readiness와 error/hangup을 분리하며, `EventManager`는 add/update/remove/timed-wait 계약을 소유합니다.
- `EventManager::createDefault()`는 선택된 backend를 `std::unique_ptr`로 반환합니다.

Source가 이름을 명시한 확인 대상:

- `EventInterest`, `Event`, `epoll`, `kqueue`, `EventManager`, `createDefault()`, `std::unique_ptr`

#### 해당 SHA에서 확인할 코드

- 공개 헤더에서 `EventInterest`, `Event`, `EventManager`의 필드와 연산을 찾고 native `epoll`/`kqueue` 플래그가 경계 밖으로 노출되지 않는지 확인합니다.
- add, update, remove, wait의 입력·출력과 실패 전달 방식이 이후 `Server`가 필요로 하는 의미를 모두 표현하는지 기록합니다.
- `createDefault()`의 반환형과 backend lifetime 소유자가 누구인지 해당 SHA의 선언부에서 확인합니다.
- 같은 fd에 read와 write를 동시에 요구할 때 어떤 비트 연산과 판정 코드가 사용되는지 최소 코드 조각으로 남깁니다.

비교 기준:

- 기본 비교: `8e8a3db87950^` → `8e8a3db87950`

Source가 지목한 failure/risk 출발점:

> 상위 계층이 native flag layout에 직접 의존하거나 backend 소유권이 불명확하면 Linux와 macOS의 의미가 달라질 수 있습니다.

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
| 8e8a3db87950 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 8e8a3db87950^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `d3f74e2857da` — `feat(event): kqueue 관심 상태 등록 구현`. 원문 역할은 “Maps logical interest changes onto kqueue filters.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.2 `d3f74e2857da` — `feat(event): kqueue 관심 상태 등록 구현`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | EVENT_IO |
| 원문 확정 역할 | Maps logical interest changes onto kqueue filters. |
| 학습 깊이 | thread 흐름에서 맡는 구현 역할과 필요한 코드·상태 변화를 확인합니다. S/A와 같은 분량을 강제하지 않습니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Portable readiness and non-blocking transport` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- 논리적 read/write 관심은 `EVFILT_READ`와 `EVFILT_WRITE`의 독립 filter로 변환됩니다.
- shadow map은 각 fd에 설치되었다고 믿는 관심 상태를 기록하고, kernel 변경 성공 뒤에만 갱신됩니다.
- remove는 멱등적으로 동작하며 이미 사라진 감시 대상의 `ENOENT`/`EBADF`를 정리 과정에서 허용합니다.

Source가 이름을 명시한 확인 대상:

- `EVFILT_READ`, `EVFILT_WRITE`, `kqueue`, `std::system_error`, `ENOENT`, `EBADF`

#### 해당 SHA에서 확인할 코드

- kqueue backend의 add/update/remove 구현에서 이전 관심과 새 관심을 비교해 어떤 `kevent` 변경을 만드는지 추적합니다.
- kernel 호출과 shadow map mutation의 정확한 순서를 확인하고, 실패 시 map이 이전 상태를 유지하는지 기록합니다.
- backend destructor가 kqueue descriptor를 어디서 닫는지와 생성 실패 시 자원 누수가 없는지 확인합니다.
- remove 경로에서 허용되는 errno와 다시 던지는 errno를 분리해 표로 남깁니다.

비교 기준:

- 기본 비교: `d3f74e2857da^` → `d3f74e2857da`
- Thread 직전 관련 SHA: `8e8a3db87950` — `feat(event): 이벤트 준비 상태 계약 정의`
- 직전 관련 SHA `8e8a3db87950`의 추상 계약과 대조합니다.

Source가 지목한 failure/risk 출발점:

> kernel 등록은 실패했는데 local shadow map만 앞서 바뀌면 이후 update/remove가 잘못된 전제에서 실행됩니다.

#### Commit 학습 기록

| 학습 항목 | 학습자 기록 |
| --- | --- |
| Thread 내 구현 역할 | [직전/다음 commit 사이에서 맡는 역할] |
| 확인한 변경 파일·symbol | [필요한 코드만 기록] |
| 핵심 상태 또는 branch | [한두 개의 중요한 변화] |
| failure handling | [의미가 있는 경우만 기록] |
| 다음 commit과의 연결 | [흐름을 이해하는 데 필요한 연결] |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| d3f74e2857da | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| d3f74e2857da^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `769cd3094f71` — `feat(event): kqueue 준비 이벤트 변환 구현`. 원문 역할은 “Converts kqueue notifications into common events.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.3 `769cd3094f71` — `feat(event): kqueue 준비 이벤트 변환 구현`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | EVENT_IO |
| 원문 확정 역할 | Converts kqueue notifications into common events. |
| 학습 깊이 | thread 흐름에서 맡는 구현 역할과 필요한 코드·상태 변화를 확인합니다. S/A와 같은 분량을 강제하지 않습니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Portable readiness and non-blocking transport` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- millisecond timeout은 `timespec`으로 변환되고 음수 timeout은 무기한 대기를 뜻하는 null pointer로 전달됩니다.
- 대기 중 `EINTR`는 빈 event batch로 처리하고, 그 밖의 오류는 `std::system_error`로 보존합니다.
- 각 native `kevent`는 fd, read/write readiness, `EV_ERROR`, `EV_EOF`, error data로 변환됩니다.

Source가 이름을 명시한 확인 대상:

- `kqueue`, `EventManager::createDefault()`, `timespec`, `std::system_error`, `kevent`, `Event`, `EV_ERROR`, `EV_EOF`

#### 해당 SHA에서 확인할 코드

- wait 구현에서 timeout 변환의 초·나노초 계산과 음수 분기를 확인합니다.
- 고정 native-event 배열의 크기, 반환 개수만큼 output vector를 reserve/append하는 흐름을 확인합니다.
- `EVFILT_READ`/`EVFILT_WRITE`, `EV_ERROR`, `EV_EOF`가 공통 `Event`의 어느 필드로 들어가는지 대응표를 작성합니다.
- signal interruption과 실제 backend failure가 caller에게 다르게 보이는 이유를 해당 분기 코드로 설명합니다.

비교 기준:

- 기본 비교: `769cd3094f71^` → `769cd3094f71`
- Thread 직전 관련 SHA: `d3f74e2857da` — `feat(event): kqueue 관심 상태 등록 구현`
- 등록 상태는 `d3f74e2857da`, 추상 event 의미는 `8e8a3db87950`과 함께 봅니다.

Source가 지목한 failure/risk 출발점:

> native filter와 공통 readiness를 잘못 매핑하면 server loop가 읽기·쓰기·종료 조건을 오판합니다.

#### Commit 학습 기록

| 학습 항목 | 학습자 기록 |
| --- | --- |
| Thread 내 구현 역할 | [직전/다음 commit 사이에서 맡는 역할] |
| 확인한 변경 파일·symbol | [필요한 코드만 기록] |
| 핵심 상태 또는 branch | [한두 개의 중요한 변화] |
| failure handling | [의미가 있는 경우만 기록] |
| 다음 commit과의 연결 | [흐름을 이해하는 데 필요한 연결] |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| 769cd3094f71 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 769cd3094f71^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `2284a0e0d8bb` — `feat(event): epoll 관심 상태 등록 구현`. 원문 역할은 “Maps logical interest changes onto epoll registrations.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.4 `2284a0e0d8bb` — `feat(event): epoll 관심 상태 등록 구현`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | EVENT_IO |
| 원문 확정 역할 | Maps logical interest changes onto epoll registrations. |
| 학습 깊이 | thread 흐름에서 맡는 구현 역할과 필요한 코드·상태 변화를 확인합니다. S/A와 같은 분량을 강제하지 않습니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Portable readiness and non-blocking transport` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- 공통 interest는 fd당 하나의 epoll mask로 합쳐지며 error/hangup은 항상 요청됩니다.
- read 관심에는 가능한 경우 `EPOLLRDHUP`가 포함되고 write 관심은 pending output이 있을 때만 켜집니다.
- shadow map은 `epoll_ctl` 성공 뒤에만 변하며 `None`은 removal로 수렴합니다.

Source가 이름을 명시한 확인 대상:

- `epoll`, `EPOLLRDHUP`, `EPOLL_CLOEXEC`, `None`, `epoll_ctl`, `std::system_error`

#### 해당 SHA에서 확인할 코드

- interest bitmask가 `EPOLLIN`, `EPOLLOUT`, error/hangup 관련 flag로 변환되는 함수와 조건을 확인합니다.
- 없는 fd의 update가 add로 승격되는 경로, `None`이 delete가 되는 경로, 이미 없는 fd 제거를 허용하는 경로를 각각 찾습니다.
- `EPOLL_CLOEXEC`로 control descriptor를 만드는 지점과 destructor close를 확인합니다.
- kqueue의 filter별 등록과 달리 epoll이 fd당 단일 mask를 유지한다는 차이를 실제 update 코드로 비교합니다.

비교 기준:

- 기본 비교: `2284a0e0d8bb^` → `2284a0e0d8bb`
- Thread 직전 관련 SHA: `769cd3094f71` — `feat(event): kqueue 준비 이벤트 변환 구현`
- kqueue 등록 SHA `d3f74e2857da`와 같은 추상 계약을 어떻게 다른 native 모델로 구현했는지 비교합니다.

Source가 지목한 failure/risk 출발점:

> shadow map과 kernel mask가 어긋나면 write interest가 빠지거나 불필요하게 남아 event loop가 멈추거나 busy-poll할 수 있습니다.

#### Commit 학습 기록

| 학습 항목 | 학습자 기록 |
| --- | --- |
| Thread 내 구현 역할 | [직전/다음 commit 사이에서 맡는 역할] |
| 확인한 변경 파일·symbol | [필요한 코드만 기록] |
| 핵심 상태 또는 branch | [한두 개의 중요한 변화] |
| failure handling | [의미가 있는 경우만 기록] |
| 다음 commit과의 연결 | [흐름을 이해하는 데 필요한 연결] |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| 2284a0e0d8bb | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 2284a0e0d8bb^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `f1320f357bca` — `feat(event): epoll 준비 이벤트 변환 구현`. 원문 역할은 “Converts epoll notifications and socket errors into common events.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.5 `f1320f357bca` — `feat(event): epoll 준비 이벤트 변환 구현`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | EVENT_IO |
| 원문 확정 역할 | Converts epoll notifications and socket errors into common events. |
| 학습 깊이 | thread 흐름에서 맡는 구현 역할과 필요한 코드·상태 변화를 확인합니다. S/A와 같은 분량을 강제하지 않습니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Portable readiness and non-blocking transport` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- `epoll_wait` 결과는 kqueue와 동일한 공통 event 형태로 변환됩니다.
- `EPOLLERR`는 pending socket error를 직접 담지 않으므로 `SO_ERROR` 조회 결과 또는 `getsockopt` 실패를 보고합니다.
- `EINTR`는 빈 batch, 그 밖의 wait failure는 예외로 전달되며 한 poll 결과는 128개 native entry로 제한됩니다.

Source가 이름을 명시한 확인 대상:

- `epoll_wait`, `kqueue`, `EPOLLRDHUP`, `EPOLLERR`, `SO_ERROR`, `getsockopt`

#### 해당 SHA에서 확인할 코드

- `EPOLLIN`, `EPOLLOUT`, `EPOLLERR`, hangup, 가능한 `EPOLLRDHUP`가 공통 필드로 변환되는 코드를 확인합니다.
- `SO_ERROR`를 읽는 조건과 `getsockopt` 자체가 실패했을 때 저장되는 error value를 구분합니다.
- 고정 128-entry 배열이 한 번의 wait 결과를 어떻게 제한하고 다음 poll로 진행을 넘기는지 기록합니다.
- kqueue wait SHA `769cd3094f71`과 비교해 server가 동일하게 볼 수 있는 필드와 backend별 세부 차이를 정리합니다.

비교 기준:

- 기본 비교: `f1320f357bca^` → `f1320f357bca`
- Thread 직전 관련 SHA: `2284a0e0d8bb` — `feat(event): epoll 관심 상태 등록 구현`

Source가 지목한 failure/risk 출발점:

> `EPOLLERR` 자체를 구체적 오류로 오해하거나 half-close를 누락하면 disconnect 정책이 잘못됩니다.

#### Commit 학습 기록

| 학습 항목 | 학습자 기록 |
| --- | --- |
| Thread 내 구현 역할 | [직전/다음 commit 사이에서 맡는 역할] |
| 확인한 변경 파일·symbol | [필요한 코드만 기록] |
| 핵심 상태 또는 branch | [한두 개의 중요한 변화] |
| failure handling | [의미가 있는 경우만 기록] |
| 다음 commit과의 연결 | [흐름을 이해하는 데 필요한 연결] |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| f1320f357bca | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| f1320f357bca^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `8864f253ac15` — `feat(connection): 스트림 연결 상태 계약 정의`. 원문 역할은 “Defines the move-only Connection and its I/O outcome model.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.6 `8864f253ac15` — `feat(connection): 스트림 연결 상태 계약 정의`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | ARCH, EVENT_IO, LIFECYCLE |
| 원문 확정 역할 | Defines the move-only Connection and its I/O outcome model. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Portable readiness and non-blocking transport` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- `Connection`은 한 stream socket과 그 fd에 결합된 입력·출력·close 상태의 move-only 소유자입니다.
- `ReadResult`와 `WriteResult`는 진행, 일시적 backpressure, peer close, hard error를 구분합니다.
- raw byte queue와 IRC line queue, graceful close request와 observed peer close가 별도 계약으로 선언됩니다.

Source가 이름을 명시한 확인 대상:

- `Connection`, `ReadResult`, `WriteResult`

#### 해당 SHA에서 확인할 코드

- 클래스 선언에서 fd, peer identity, read accumulator, output buffer, partial-write offset, line limit, local/remote close state를 찾아 관계를 그립니다.
- copy constructor/assignment가 금지되고 move가 허용되는 선언을 확인해 double-close 방지 의도를 기록합니다.
- `ReadResult`/`WriteResult`가 caller에게 어떤 lifecycle 결정을 전달할 수 있는지 enum/field별로 정리합니다.
- buffer 내부를 노출하지 않고 server가 write interest와 disconnect를 결정할 수 있게 하는 public query/mutation API를 분류합니다.

비교 기준:

- 기본 비교: `8864f253ac15^` → `8864f253ac15`
- Thread 직전 관련 SHA: `f1320f357bca` — `feat(event): epoll 준비 이벤트 변환 구현`

Source가 지목한 failure/risk 출발점:

> socket fd와 protocol-progress buffer가 서로 다른 객체에 흩어지거나 copy되면 double close, stale buffer, 잘못된 재시도가 발생합니다.

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
| 8864f253ac15 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 8864f253ac15^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `d71a2549c0eb` — `feat(connection): 소켓 소유권과 이동 수명 구현`. 원문 역할은 “Implements exactly-once descriptor ownership and move transfer.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.7 `d71a2549c0eb` — `feat(connection): 소켓 소유권과 이동 수명 구현`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | LIFECYCLE, RISK |
| 원문 확정 역할 | Implements exactly-once descriptor ownership and move transfer. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Portable readiness and non-blocking transport` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- destructor는 fd를 정확히 한 번 닫고 move construction은 모든 상태를 옮긴 뒤 source fd를 무효화합니다.
- move assignment는 destination이 이미 소유한 fd를 먼저 해제한 뒤 상태를 이전합니다.
- line limit 0은 512로 정규화되고 `wantsWrite()`/`pendingBytes()`는 전체 buffer가 아니라 `writeOffset_` 이후 suffix를 기준으로 합니다.

Source가 이름을 명시한 확인 대상:

- `Connection`, `wantsWrite()`, `pendingBytes()`

#### 해당 SHA에서 확인할 코드

- destructor, move constructor, move assignment에서 fd close와 source invalidation의 순서를 직접 추적합니다.
- move되는 필드 목록이 선언된 transport state를 빠짐없이 포함하는지 체크리스트로 대조합니다.
- self-move 방어 여부와 destination 기존 fd 해제 여부를 확인하되, 해당 SHA 코드가 실제로 보장하는 범위만 기록합니다.
- `pendingBytes()`가 offset과 buffer size를 어떻게 계산하고 `wantsWrite()`가 어떤 상태를 읽는지 확인합니다.

비교 기준:

- 기본 비교: `d71a2549c0eb^` → `d71a2549c0eb`
- Thread 직전 관련 SHA: `8864f253ac15` — `feat(connection): 스트림 연결 상태 계약 정의`
- 계약 선언 SHA `8864f253ac15`의 필드와 연산이 실제 구현에서 모두 보존되는지 비교합니다.

Source가 지목한 failure/risk 출발점:

> source fd를 무효화하지 않거나 destination의 기존 fd를 놓치면 double close 또는 descriptor leak이 발생합니다.

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
| d71a2549c0eb | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| d71a2549c0eb^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `9b601b69de4f` — `feat(connection): IRC 입력 프레임 추출 구현`. 원문 역할은 “Establishes incremental IRC framing and the line-size boundary.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.8 `9b601b69de4f` — `feat(connection): IRC 입력 프레임 추출 구현`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | EVENT_IO, IRC_PROTOCOL, RISK |
| 원문 확정 역할 | Establishes incremental IRC framing and the line-size boundary. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Portable readiness and non-blocking transport` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- persistent read buffer에서 newline 단위로 frame을 추출하고 앞선 carriage return은 제거합니다.
- 여러 완전한 frame은 순서대로 반환하고 불완전 suffix는 다음 read까지 보존합니다.
- delimiter 없는 fragment와 완성 frame 모두 line limit을 넘으면 error/close를 기록하고 accumulator를 비웁니다.

#### 해당 SHA에서 확인할 코드

- frame extraction 함수에서 newline 탐색, optional CR 제거, 완성 line append, consumed prefix 제거 순서를 확인합니다.
- 하나의 buffer에 여러 줄과 마지막 partial line이 함께 있을 때 각 byte가 어느 상태에 남는지 예제로 추적합니다.
- 완성 frame 길이 계산에 newline이 포함되는지, CRLF와 LF가 같은 logical line으로 변환되는지 경계값으로 확인합니다.
- oversized unterminated fragment와 oversized completed frame의 분기에서 error string, close request, buffer clear 순서를 기록합니다.

비교 기준:

- 기본 비교: `9b601b69de4f^` → `9b601b69de4f`
- Thread 직전 관련 SHA: `d71a2549c0eb` — `feat(connection): 소켓 소유권과 이동 수명 구현`

Source가 지목한 failure/risk 출발점:

> packet boundary를 message boundary로 오해하거나 oversized fragment를 남기면 명령 유실·오인식·무제한 메모리 사용이 발생합니다.

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
| 9b601b69de4f | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 9b601b69de4f^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `b00589d4b1b1` — `feat(connection): 논블로킹 수신 상태 처리`. 원문 역할은 “Implements the non-blocking receive state machine.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.9 `b00589d4b1b1` — `feat(connection): 논블로킹 수신 상태 처리`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | EVENT_IO, RISK |
| 원문 확정 역할 | Implements the non-blocking receive state machine. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Portable readiness and non-blocking transport` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- read readiness 한 번에 `recv`를 반복해 would-block까지 socket을 drain합니다.
- `EINTR`는 재시도하고 `EAGAIN`/`EWOULDBLOCK`은 현재 readiness cycle의 정상 종료로 취급합니다.
- 0-byte read와 hard error는 close를 요청하되 terminal condition 전에 추출된 line도 result에 남깁니다.

Source가 이름을 명시한 확인 대상:

- `recv`, `EINTR`, `EAGAIN`, `EWOULDBLOCK`

#### 해당 SHA에서 확인할 코드

- `readAvailable()` 또는 대응 함수에서 `recv` loop의 각 반환값별 state transition을 표로 작성합니다.
- 성공 read를 accumulator에 append한 뒤 frame extraction을 호출하는 순서와, extraction이 close를 요청했을 때 loop를 끝내는 조건을 확인합니다.
- 한 callback에서 line을 여러 개 얻은 뒤 EOF가 발생하는 경우 returned lines와 close state가 함께 전달되는지 추적합니다.
- human-readable operation error가 어디에 저장되고 server가 이후 어떤 API로 읽을 수 있는지 확인합니다.

비교 기준:

- 기본 비교: `b00589d4b1b1^` → `b00589d4b1b1`
- Thread 직전 관련 SHA: `9b601b69de4f` — `feat(connection): IRC 입력 프레임 추출 구현`
- framing SHA `9b601b69de4f`의 accumulator 계약을 실제 receive loop가 어떻게 사용하는지 비교합니다.

Source가 지목한 failure/risk 출발점:

> 한 번만 recv하거나 EAGAIN을 hard error로 취급하면 edge-trigger 유사 상황에서 data가 남거나 정상 연결을 끊게 됩니다.

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
| b00589d4b1b1 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| b00589d4b1b1^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `a10fe961e2b1` — `feat(connection): 부분 송신 대기열 처리`. 원문 역할은 “Implements persistent partial-write progress and graceful output draining.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.10 `a10fe961e2b1` — `feat(connection): 부분 송신 대기열 처리`

| 항목 | 값 |
| --- | --- |
| Importance | S |
| Tags | CORE, EVENT_IO, LIFECYCLE |
| 원문 확정 역할 | Implements persistent partial-write progress and graceful output draining. |
| 학습 깊이 | 프로젝트 핵심 architecture/invariant로 취급합니다. 직전 상태, failure 가능성, 핵심 결정, 실제 코드, ownership/lifecycle/state transition, 후속 fix/test까지 깊게 기록합니다. |

#### 이 Thread에서의 학습 관점

이 thread에서는 partial-send state 자체보다 그 state가 reactor의 write readiness와 graceful close를 가능하게 하는 기반이라는 관점으로 봅니다.

#### Source에서 확정된 implementation anchor

- `writeOffset_`가 persistent output queue의 전송 진행을 나타내며 매 writable event 사이에 유지됩니다.
- `flushPending()`은 unsent suffix만 보내고 `EINTR` 재시도, would-block 정지, hard error close 요청을 구분합니다.
- `queueLine()`은 기존 terminator를 제거하고 정확히 하나의 CRLF를 붙이며 close request는 즉시 close가 아닌 state로 저장됩니다.
- 완료된 queue는 reset되고, consumed prefix는 offset이 16 KiB를 넘은 뒤에만 compact됩니다.

Source가 이름을 명시한 확인 대상:

- `writeOffset_`, `flushPending()`, `MSG_NOSIGNAL`, `SIGPIPE`, `queueLine()`, `queueRaw()`

#### 해당 SHA에서 확인할 코드

- `outputBuffer_`와 `writeOffset_`가 나타내는 sent prefix/unsent suffix invariant를 코드와 byte 예제로 복원합니다.
- send에 넘기는 pointer와 length가 offset 이후 suffix만 가리키는지, positive return만큼만 offset이 전진하는지 확인합니다.
- `EINTR`, `EAGAIN`/`EWOULDBLOCK`, hard error, 전체 완료 각각에서 buffer·offset·close state가 어떻게 남는지 상태표를 작성합니다.
- `MSG_NOSIGNAL` 조건부 사용과 플랫폼별 signal suppression 의도를 확인합니다.
- `queueRaw()`와 `queueLine()`의 framing 책임 차이, line terminator 제거와 CRLF 추가 코드를 확인합니다.
- close가 요청된 상태에서도 pending output을 유지하는 이유와 server가 나중에 어떤 query로 drain 여부를 판단할 수 있는지 기록합니다.

비교 기준:

- 기본 비교: `a10fe961e2b1^` → `a10fe961e2b1`
- Thread 직전 관련 SHA: `b00589d4b1b1` — `feat(connection): 논블로킹 수신 상태 처리`

Source가 지목한 failure/risk 출발점:

> partial send 뒤 offset을 보존하지 않으면 byte 중복·유실이 발생하고, close를 즉시 수행하면 이미 queue된 protocol response가 사라집니다.

#### Commit 학습 기록

| 학습 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태 | [parent 및 직전 관련 SHA에서 실제로 존재한 구조와 아직 없던 보장을 기록] |
| 해결하려던 문제 | [source-confirmed 문제를 실제 caller/state와 연결] |
| 기존 설계가 충분하지 않았던 이유 | [구체적 failure sequence와 영향 범위] |
| 핵심 결정 | [선택한 representation/API/ordering] |
| 실제 핵심 코드 | [path, symbol, 최소 증거 조각] |
| ownership / lifecycle / state transition | [mutation 전후와 owner를 순서대로 기록] |
| failure scenario | [input 또는 callback/syscall sequence와 branch] |
| 이 commit이 보장하는 것 | [코드로 입증한 범위] |
| 아직 보장하지 않는 것 | [후속 fix/test가 필요한 범위] |
| 후속 fix/test 연결 | [SHA와 무엇이 강화·수정되는지] |
| 학습자의 최종 설명 | [완성 후 5~10문장으로 직접 설명] |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| a10fe961e2b1 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| a10fe961e2b1^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `e6492e27cc30` — `feat(server): 이벤트 서버 공개 계약 정의`. 원문 역할은 “Defines Server ownership and the transport callback boundary.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.11 `e6492e27cc30` — `feat(server): 이벤트 서버 공개 계약 정의`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | ARCH, EVENT_IO, LIFECYCLE |
| 원문 확정 역할 | Defines Server ownership and the transport callback boundary. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Portable readiness and non-blocking transport` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- `Server`는 listener, event manager, `fd -> unique_ptr<Connection>` map의 소유자이자 transport coordinator입니다.
- callback은 accept, complete line, disconnect, infrastructure error를 application에 전달하며 protocol state는 server에 넣지 않습니다.
- `start`, `run`, `pollOnce`, `stop`을 분리하고 send/queue/lookup/disconnect 공개 연산을 제공합니다.

Source가 이름을 명시한 확인 대상:

- `std::unique_ptr`, `Connection`, `start`, `run`, `pollOnce`, `stop`

#### 해당 SHA에서 확인할 코드

- Server 선언에서 소유 자원과 non-owning callback이 각각 어느 필드에 저장되는지 책임 지도를 만듭니다.
- Config가 bind address, port, backlog, poll timeout, line limit을 어느 타입으로 보유하는지 확인합니다.
- public send/raw queue/lookup/disconnect API가 fd identity를 사용하면서 buffer와 event-interest mutation을 내부에 숨기는지 확인합니다.
- `pollOnce()` 공개가 production run과 deterministic test에 같은 경로를 제공한다는 근거를 선언부에서 찾습니다.

비교 기준:

- 기본 비교: `e6492e27cc30^` → `e6492e27cc30`
- Thread 직전 관련 SHA: `a10fe961e2b1` — `feat(connection): 부분 송신 대기열 처리`

Source가 지목한 failure/risk 출발점:

> Server가 protocol state까지 소유하거나 Connection buffer를 외부에 노출하면 transport와 IRC lifecycle이 결합됩니다.

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
| e6492e27cc30 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| e6492e27cc30^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `4ad1227e5119` — `feat(server): 논블로킹 연결 수락과 등록 구현`. 원문 역할은 “Integrates accepted descriptors into connection and event ownership.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.12 `4ad1227e5119` — `feat(server): 논블로킹 연결 수락과 등록 구현`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | EVENT_IO, LIFECYCLE |
| 원문 확정 역할 | Integrates accepted descriptors into connection and event ownership. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Portable readiness and non-blocking transport` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- listener readiness에서 accept를 `EAGAIN`/`EWOULDBLOCK`까지 반복하고 `EINTR`는 재시도합니다.
- accepted fd에 close-on-exec, non-blocking, signal suppression policy를 적용한 뒤 `Connection`으로 감쌉니다.
- event 등록, authoritative map 삽입, application callback 노출의 순서가 정의되고 callback exception은 connection close로 수렴합니다.

Source가 이름을 명시한 확인 대상:

- `EAGAIN`, `EWOULDBLOCK`, `Connection`, `unknown`

#### 해당 SHA에서 확인할 코드

- accept loop의 정상 종료, 재시도, report-only failure 분기를 찾아 listener 전체가 중단되지 않는 조건을 기록합니다.
- accepted fd가 local raw descriptor에서 `Connection` ownership으로 넘어가는 정확한 지점을 확인합니다.
- 이 SHA에서 event manager 등록, map insertion, connect callback의 실제 순서를 그대로 적고 각 단계 실패 시 누가 fd를 닫는지 추적합니다.
- connect callback이 client를 disconnect할 수 있다는 전제 때문에 map membership을 다시 검사하는 위치를 확인합니다.
- peer address formatting failure가 accept 자체를 실패시키지 않고 `unknown`으로 수렴하는 경로를 찾습니다.

비교 기준:

- 기본 비교: `4ad1227e5119^` → `4ad1227e5119`
- Thread 직전 관련 SHA: `e6492e27cc30` — `feat(server): 이벤트 서버 공개 계약 정의`
- 후속 fix `5dcd882f0763`이 이 초기 순서를 어떻게 재구성하는지는 Reentrant cleanup thread에서 별도로 비교합니다.

Source가 지목한 failure/risk 출발점:

> partial setup 중 실패하거나 callback이 재진입해 connection을 제거하면 raw fd, event registration, map ownership이 어긋날 수 있습니다.

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
| 4ad1227e5119 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 4ad1227e5119^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `378d5304828d` — `feat(server): 준비 이벤트 루프 구동`. 원문 역할은 “Makes the portable event loop operational.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.13 `378d5304828d` — `feat(server): 준비 이벤트 루프 구동`

| 항목 | 값 |
| --- | --- |
| Importance | S |
| Tags | CORE, ARCH, EVENT_IO |
| 원문 확정 역할 | Makes the portable event loop operational. |
| 학습 깊이 | 프로젝트 핵심 architecture/invariant로 취급합니다. 직전 상태, failure 가능성, 핵심 결정, 실제 코드, ownership/lifecycle/state transition, 후속 fix/test까지 깊게 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Portable readiness and non-blocking transport` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- `start()`가 backend 생성, listener 생성, read 등록, running state 설정을 수행합니다.
- `run()`은 `pollOnce()`를 반복하고 종료 요청 뒤 중앙 정리를 수행합니다.
- `pollOnce()`는 listener fd와 client fd를 구분하고 batch 중간에도 `stopRequested_`를 확인합니다.
- startup 전 polling은 lifecycle error로 거부되고 listener error는 server-level failure로 취급됩니다.

Source가 이름을 명시한 확인 대상:

- `start()`, `run()`, `pollOnce()`, `stopRequested_`

#### 해당 SHA에서 확인할 코드

- `start()`의 단계별 state mutation 순서와 예외 발생 시 남을 수 있는 자원을 해당 SHA 기준으로 추적합니다.
- `pollOnce()`에서 wait 결과를 순회하는 loop를 따라 listener event, client event, unknown/stale fd가 어떤 분기로 들어가는지 그립니다.
- listener readable event가 accept drain으로 연결되고 client event가 별도 handler로 위임되는 caller/callee 흐름을 기록합니다.
- callback에서 stop을 요청했을 때 같은 native batch의 뒤 event가 처리되지 않는 check 위치를 확인합니다.
- `run()` 종료 뒤 connection/listener/event manager 정리 경로와 `pollOnce()`를 직접 호출하는 test/embedding 경로의 공통점을 정리합니다.
- event backend에서 error가 throw될 때 process boundary까지 어떤 호출 스택으로 전달되는지 확인합니다.

비교 기준:

- 기본 비교: `378d5304828d^` → `378d5304828d`
- Thread 직전 관련 SHA: `4ad1227e5119` — `feat(server): 논블로킹 연결 수락과 등록 구현`

Source가 지목한 failure/risk 출발점:

> stale readiness batch를 끝까지 처리하거나 startup 상태를 검증하지 않으면 종료 후 callback, 미등록 listener polling, 잘못된 accept가 발생할 수 있습니다.

#### Commit 학습 기록

| 학습 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태 | [parent 및 직전 관련 SHA에서 실제로 존재한 구조와 아직 없던 보장을 기록] |
| 해결하려던 문제 | [source-confirmed 문제를 실제 caller/state와 연결] |
| 기존 설계가 충분하지 않았던 이유 | [구체적 failure sequence와 영향 범위] |
| 핵심 결정 | [선택한 representation/API/ordering] |
| 실제 핵심 코드 | [path, symbol, 최소 증거 조각] |
| ownership / lifecycle / state transition | [mutation 전후와 owner를 순서대로 기록] |
| failure scenario | [input 또는 callback/syscall sequence와 branch] |
| 이 commit이 보장하는 것 | [코드로 입증한 범위] |
| 아직 보장하지 않는 것 | [후속 fix/test가 필요한 범위] |
| 후속 fix/test 연결 | [SHA와 무엇이 강화·수정되는지] |
| 학습자의 최종 설명 | [완성 후 5~10문장으로 직접 설명] |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 최소 코드 조각 또는 line 범위 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- | --- |
| 378d5304828d | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 378d5304828d^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `625ffc924de8` — `feat(server): 송신 큐와 쓰기 관심 상태 연결`. 원문 역할은 “Couples pending output to write readiness and close completion.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.14 `625ffc924de8` — `feat(server): 송신 큐와 쓰기 관심 상태 연결`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | EVENT_IO, LIFECYCLE, INTEGRATION |
| 원문 확정 역할 | Couples pending output to write readiness and close completion. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 commit을 `Portable readiness and non-blocking transport` 흐름에서 원문 역할에 맞춰 확인합니다. 다른 Thread에 중복 등장하더라도 이 문서의 invariant와 책임 변화 관점으로 다시 기록합니다.

#### Source에서 확정된 implementation anchor

- `sendTo()`/`queueRawTo()`는 output을 append한 뒤 fd interest를 즉시 다시 계산합니다.
- healthy connection은 항상 read interest를 유지하고 pending bytes가 있을 때만 write interest를 추가합니다.
- close requested 상태에서는 새 input을 막고 pending output이 있는 동안 write만 유지하며, drain 뒤 즉시 disconnect합니다.

Source가 이름을 명시한 확인 대상:

- `sendTo()`, `queueRawTo()`, `refreshInterest()`

#### 해당 SHA에서 확인할 코드

- enqueue API에서 queue mutation과 `refreshInterest()` 호출의 순서를 확인합니다.
- write-ready client event가 `flushPending()`으로 연결되고 hard send failure가 disconnect로 수렴하는 흐름을 추적합니다.
- `refreshInterest()`의 healthy/pending/closing/no-pending 조건별 interest mask와 후속 action을 표로 작성합니다.
- write interest를 pending output이 없을 때 제거하는 코드가 busy-poll을 막는 근거를 기록합니다.
- close requested 상태에서 read를 끄고 write drain만 허용하는 정책이 `Connection`의 close state와 어떻게 연결되는지 확인합니다.

비교 기준:

- 기본 비교: `625ffc924de8^` → `625ffc924de8`
- Thread 직전 관련 SHA: `378d5304828d` — `feat(server): 준비 이벤트 루프 구동`
- 부분 송신 SHA `a10fe961e2b1`의 local state를 kernel interest와 연결하는 지점입니다.

Source가 지목한 failure/risk 출발점:

> queue에는 byte가 있지만 write interest가 없으면 output이 영구 정지하고, 빈 queue에서 write interest가 남으면 loop가 불필요하게 깨어납니다.

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
| 625ffc924de8 | [path] | [symbol] | [직접 확인 후 삽입] | [state/invariant/ordering 결론] |
| 625ffc924de8^ | [대응 path] | [대응 symbol] | [변경 전 코드] | [직전 상태와 차이] |

#### 다음 연결

- 다음 Thread commit: `7a6bc7e1276a` — `feat(server): 연결 해제와 오류 정리 구현`. 원문 역할은 “Centralizes transport removal and disconnect notification.”입니다. 현재 commit이 넘기는 state/API/미해결 위험을 직접 연결합니다.

### 5.15 `7a6bc7e1276a` — `feat(server): 연결 해제와 오류 정리 구현`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | LIFECYCLE, RISK |
| 원문 확정 역할 | Centralizes transport removal and disconnect notification. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 설명할 수 있도록 핵심 코드와 설계 판단을 기록합니다. |

#### 이 Thread에서의 학습 관점

이 thread에서는 transport reactor의 authoritative removal/notification 종착점으로 봅니다.

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
- Thread 직전 관련 SHA: `625ffc924de8` — `feat(server): 송신 큐와 쓰기 관심 상태 연결`
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

- 이 commit은 이 Thread의 마지막 항목입니다. Invariant ledger와 Thread 최종 상태에서 전체 변화를 연결합니다.

## 6. Invariant ledger

| Invariant | 처음 도입 | 강화/적용 | 부족함 또는 위험이 드러난 지점 | Fix/Test 연결 | 학습자 최종 기록 |
| --- | --- | --- | --- | --- | --- |
| 공통 readiness 의미 | 8e8a3db87950 | d3f74e2857da, 769cd3094f71, 2284a0e0d8bb, f1320f357bca | 각 backend가 같은 `Event` 의미를 만드는지 기록 | 없음 — backend별 구현 비교로 확인 | [학습자 최종 상태 설명] |
| fd 단일 소유권 | 8864f253ac15 | d71a2549c0eb, 4ad1227e5119 | accept/register/cleanup 실패 시 ownership gap을 표시 | 7a6bc7e1276a에서 transport cleanup 경로 확인 | [학습자 최종 상태 설명] |
| incremental input framing | 9b601b69de4f | b00589d4b1b1 | oversized fragment/frame과 EOF 전 line 보존을 기록 | thread 내 별도 test commit 없음 | [학습자 최종 상태 설명] |
| persistent partial output | a10fe961e2b1 | 625ffc924de8 | queue와 write interest가 분리될 위험을 기록 | 후속 문서 07의 881e59734a9a / f34ab135c546로 이어짐 | [학습자 최종 상태 설명] |
| authoritative event-loop cleanup | e6492e27cc30 | 378d5304828d, 7a6bc7e1276a | callback reentrancy와 registration failure 한계를 표시 | 후속 문서 08의 5dcd882f0763 / 928594ec160c로 이어짐 | [학습자 최종 상태 설명] |

Ledger 작성 기준:

- “도입”과 “완성”을 같은 의미로 쓰지 않습니다.
- 후속 fix가 이전 commit의 사실을 소급 변경하지 않도록 각 SHA 시점의 보장과 부족함을 분리합니다.
- source가 명시하지 않은 invariant를 추가할 때는 확정 사실이 아니라 학습자의 코드 해석으로 표시하고 path/symbol 증거를 붙입니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 | 실제 failure/risk | Fix 또는 기반 변화 | 수정된 decision/semantics | Test 연결 | 코드 증거 |
| --- | --- | --- | --- | --- | --- |
| 부분 송신은 한 번에 끝난다는 가정 | short send/backpressure에서 suffix 유실·중복 위험 | a10fe961e2b1이 persistent offset/queue를 도입 | 625ffc924de8이 write readiness와 연결 | 07 문서의 f34ab135c546이 deterministic하게 검증 | [실제 code/test evidence] |
| map entry를 callback 전후 그대로 사용할 수 있다는 가정 | callback self-disconnect 시 stale object 위험 | 7a6bc7e1276a이 erase-before-callback cleanup을 정립 | 이 thread에서는 원래 경로까지만 확인 | 08 문서의 5dcd882f0763 / 928594ec160c에서 root-cause fix/test | [실제 code/test evidence] |

## 8. Ownership / state / responsibility 변화

| 책임 또는 상태 | 이전 상태 | 이후 authoritative 위치 | 관련 commit | 학습자 확인 |
| --- | --- | --- | --- | --- |
| native readiness registration/translation | 없음 | `EventManager` backend | 8e8a3db87950 → f1320f357bca | [확인한 owner/state/lifetime] |
| client socket과 transport progress | raw fd 중심 | move-only `Connection` | 8864f253ac15 → a10fe961e2b1 | [확인한 owner/state/lifetime] |
| listener와 connection orchestration | 구성 요소 분리 상태 | `Server`와 `pollOnce()` | e6492e27cc30 → 378d5304828d | [확인한 owner/state/lifetime] |
| output progress와 kernel write interest | `Connection` queue만 존재 | `Server::refreshInterest()` 정책과 결합 | 625ffc924de8 | [확인한 owner/state/lifetime] |
| descriptor cleanup/notification | 분산 가능성 | `Server::disconnect()` 단일 경로 | 7a6bc7e1276a | [확인한 owner/state/lifetime] |

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
[native backend wait] → [공통 Event 변환: 필드/flag를 해당 SHA 코드로 기입]
→ `Server::pollOnce()` → [listener fd / client fd 분기 조건 기입]
→ read: `Connection` [recv 함수] → [frame extraction] → [line callback]
→ write: [pending query] → [write interest] → `flushPending()` → [offset/close transition]
→ disconnect: [event removal] → [map ownership 이동/erase] → [callback] → [fd destruction]
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
