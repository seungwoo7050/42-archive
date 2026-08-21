# Thread 01 — Portable readiness and non-blocking transport

부제: 이벤트 준비 상태와 논블로킹 전송

## 1. Thread 목표

native readiness API의 차이를 공통 의미로 번역하고, move-only connection state와 single-threaded event loop가 입력·출력·종료를 어떻게 진행시키는지 commit 순서대로 복원합니다.

Source에서 확정된 significance:

> This progression builds the server from a portable event vocabulary into an operational single-threaded reactor. The decisive choices are not the platform calls themselves, but the separation of native readiness from server semantics, the move-only per-connection state machine, persistent partial-write progress, and the authoritative server cleanup path. Later reliability work depends directly on these ownership and I/O contracts.

이 문서의 source-confirmed 문장, commit map, SHA, subject, importance, tags와 원문 역할은 변경하지 않았습니다. 아래 학습 기록은 지정 branch의 각 exact SHA에서 확인한 code diff를 기준으로 작성했습니다.

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

Commit 순서는 source에 정의된 순서이며 재정렬하지 않았습니다.

## 5. Commit별 학습 기록

각 기록은 해당 commit의 exact diff에서 확인한 파일·symbol·state와, 필요한 경우 parent/앞선 관련 SHA의 상태 차이를 기준으로 합니다. 후속 commit의 field나 test seam을 이전 commit에 소급하지 않았습니다.

### 5.1 `8e8a3db87950` — `feat(event): 이벤트 준비 상태 계약 정의`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | ARCH, EVENT_IO |
| 원문 확정 역할 | Defines the common readiness vocabulary and backend contract. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Defines the common readiness vocabulary and backend contract.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | portable readiness 의미와 backend 수명 계약이 아직 존재하지 않았습니다. |
| 주요 문제와 설계 판단 | `EventInterest`를 Read/Write 조합형 비트마스크로 만들고, `Event`가 readiness·error·hangup·socket error를 공통 형태로 보유하도록 했습니다. `EventManager`는 add/update/remove/wait와 `createDefault()`를 제공하는 추상 경계가 되었습니다. |
| 변경 파일·symbol | `include/EventManager.hpp — EventInterest, Event, EventManager` |
| state / ownership 변화 | native flag는 공개 계약 밖에 남고 backend 인스턴스는 `std::unique_ptr<EventManager>`가 단독 소유합니다. |
| failure 또는 boundary | 이 SHA는 실패를 공통 예외형으로 강제하지는 않으며 실제 kernel 오류 처리는 backend 구현에 맡깁니다. |
| 보장 / 비보장 | 보장: 상위 `Server`가 epoll/kqueue 상수 없이 읽기·쓰기 관심과 준비 결과를 표현할 수 있습니다.<br>비보장: 실제 등록·대기·오류 번역은 아직 구현되지 않았습니다. |
| 다음 관련 변화 | d3f74e2857da와 2284a0e0d8bb가 등록을, 769cd3094f71과 f1320f357bca가 notification 번역을 채웁니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `8e8a3db87950` | `include/EventManager.hpp` | `EventInterest, operator\|, hasInterest` | read와 write를 동시에 표현하는 공통 비트 연산 |
| `8e8a3db87950` | `include/EventManager.hpp` | `EventManager::createDefault` | backend lifetime을 unique_ptr로 상위 계층에 이전 |

- 조사 방법: GitHub에서 `8e8a3db87950`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `d3f74e2857da` — `feat(event): kqueue 관심 상태 등록 구현`. 원문 역할은 “Maps logical interest changes onto kqueue filters.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.2 `d3f74e2857da` — `feat(event): kqueue 관심 상태 등록 구현`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | EVENT_IO |
| 원문 확정 역할 | Maps logical interest changes onto kqueue filters. |
| 학습 깊이 | Thread 흐름에서 맡는 구체적 구현 역할과 핵심 state/branch만 기록합니다. |

#### Source에서 확정된 역할

> Maps logical interest changes onto kqueue filters.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| Thread 내 구현 역할 | 논리적 Read/Write를 `EVFILT_READ`/`EVFILT_WRITE`의 독립 filter로 비교·적용하고, kernel 변경이 성공한 뒤 shadow map을 갱신했습니다. |
| 확인한 변경 파일·symbol | `src/KqueueEventManager.cpp — addFd, updateFd, removeFd, applyInterestChange, applyFilterChange` |
| 핵심 state / branch | fd별 설치 관심은 backend shadow map이 보유하며 kernel과 local state가 같은 순서로 전진합니다. |
| failure handling | 등록 변경 실패는 `std::system_error`로 전달합니다. remove 중 이미 사라진 대상의 `ENOENT`/`EBADF`는 정리의 멱등성을 위해 허용합니다. |
| 보장과 다음 연결 | read와 write filter의 추가·삭제가 이전/새 관심 차이에 맞게 적용됩니다. 769cd3094f71가 같은 backend의 wait 결과를 번역합니다. |
| 이 시점의 한계 | 준비 이벤트의 공통 `Event` 변환은 아직 없습니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `d3f74e2857da` | `src/KqueueEventManager.cpp` | `applyInterestChange` | 이전/새 관심을 비교해 filter별 변경을 생성 |
| `d3f74e2857da` | `src/KqueueEventManager.cpp` | `removeFd` | 허용 errno와 재전파 errno를 분리 |

- 조사 방법: GitHub에서 `d3f74e2857da`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `769cd3094f71` — `feat(event): kqueue 준비 이벤트 변환 구현`. 원문 역할은 “Converts kqueue notifications into common events.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.3 `769cd3094f71` — `feat(event): kqueue 준비 이벤트 변환 구현`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | EVENT_IO |
| 원문 확정 역할 | Converts kqueue notifications into common events. |
| 학습 깊이 | Thread 흐름에서 맡는 구체적 구현 역할과 핵심 state/branch만 기록합니다. |

#### Source에서 확정된 역할

> Converts kqueue notifications into common events.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| Thread 내 구현 역할 | 최대 128개의 `kevent`를 받고 filter를 Read/Write로, `EV_ERROR`를 error와 code로, `EV_EOF`를 hangup으로 변환했습니다. |
| 확인한 변경 파일·symbol | `src/KqueueEventManager.cpp — wait, createDefault` |
| 핵심 state / branch | 한 native notification은 fd와 공통 interest/error/hangup 상태를 가진 `Event`로 복사됩니다. |
| failure handling | `kevent`가 `EINTR`로 끝나면 빈 결과로 돌아가 loop가 다시 진행하며 그 외 오류는 예외로 전달합니다. |
| 보장과 다음 연결 | kqueue-specific flag layout이 `Server`에 노출되지 않습니다. 2284a0e0d8bb와 f1320f357bca가 Linux backend에 같은 공통 의미를 구현합니다. |
| 이 시점의 한계 | 동일 fd의 여러 native record 병합 여부와 상위 처리 semantics는 server 단계에서 결정됩니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `769cd3094f71` | `src/KqueueEventManager.cpp` | `KqueueEventManager::wait` | EVFILT/EV_ERROR/EV_EOF를 공통 Event 필드로 번역 |

- 조사 방법: GitHub에서 `769cd3094f71`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `2284a0e0d8bb` — `feat(event): epoll 관심 상태 등록 구현`. 원문 역할은 “Maps logical interest changes onto epoll registrations.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.4 `2284a0e0d8bb` — `feat(event): epoll 관심 상태 등록 구현`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | EVENT_IO |
| 원문 확정 역할 | Maps logical interest changes onto epoll registrations. |
| 학습 깊이 | Thread 흐름에서 맡는 구체적 구현 역할과 핵심 state/branch만 기록합니다. |

#### Source에서 확정된 역할

> Maps logical interest changes onto epoll registrations.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| Thread 내 구현 역할 | `nativeEventsFor()`로 Read/Write 관심을 epoll mask로 만들고 `epoll_ctl` ADD/MOD/DEL을 backend 메서드에 배치했습니다. |
| 확인한 변경 파일·symbol | `src/EpollEventManager.cpp — nativeEventsFor, addFd, updateFd, removeFd` |
| 핵심 state / branch | fd 등록 상태는 kernel epoll set이 authoritative하며 공통 interest가 호출 입력입니다. |
| failure handling | `epoll_ctl` 실패는 system error로 전달하고 제거 중 이미 닫히거나 사라진 fd는 멱등 정리 대상으로 취급합니다. |
| 보장과 다음 연결 | Linux에서도 동일한 add/update/remove 계약을 제공합니다. f1320f357bca가 readiness/error/hangup 변환을 완성합니다. |
| 이 시점의 한계 | `epoll_wait` 결과와 `SO_ERROR` 번역은 다음 commit 전에는 없습니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `2284a0e0d8bb` | `src/EpollEventManager.cpp` | `nativeEventsFor` | 공통 Read/Write를 EPOLLIN/EPOLLOUT로 변환 |
| `2284a0e0d8bb` | `src/EpollEventManager.cpp` | `addFd/updateFd/removeFd` | epoll_ctl operation별 등록 수명 |

- 조사 방법: GitHub에서 `2284a0e0d8bb`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `f1320f357bca` — `feat(event): epoll 준비 이벤트 변환 구현`. 원문 역할은 “Converts epoll notifications and socket errors into common events.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.5 `f1320f357bca` — `feat(event): epoll 준비 이벤트 변환 구현`

| 항목 | 값 |
| --- | --- |
| Importance | B |
| Tags | EVENT_IO |
| 원문 확정 역할 | Converts epoll notifications and socket errors into common events. |
| 학습 깊이 | Thread 흐름에서 맡는 구체적 구현 역할과 핵심 state/branch만 기록합니다. |

#### Source에서 확정된 역할

> Converts epoll notifications and socket errors into common events.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| Thread 내 구현 역할 | `epoll_wait` 결과의 IN/OUT/ERR/HUP/RDHUP를 공통 `Event`로 만들고, error 시 `getsockopt(SO_ERROR)`로 socket error를 보충했습니다. |
| 확인한 변경 파일·symbol | `src/EpollEventManager.cpp — wait, socketErrorFor, createDefault` |
| 핵심 state / branch | native event array에서 공통 Event vector로 값이 복사되며 backend lifetime은 factory 반환 unique_ptr가 관리합니다. |
| failure handling | `epoll_wait`의 `EINTR`은 빈 readiness로 처리하고 다른 오류는 예외로 전달합니다. `SO_ERROR` 조회 실패도 오류 정보를 잃지 않도록 처리됩니다. |
| 보장과 다음 연결 | epoll과 kqueue가 상위 loop에 같은 필드 집합을 제공합니다. 8864f253ac15부터 공통 Event가 구동할 connection 상태를 정의합니다. |
| 이 시점의 한계 | 두 OS에서 실제로 동일 suite가 실행되는 보장은 416efc91e580의 CI에서 추가됩니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `f1320f357bca` | `src/EpollEventManager.cpp` | `EpollEventManager::wait` | EPOLL* notification을 공통 Event로 변환 |
| `f1320f357bca` | `src/EpollEventManager.cpp` | `socketErrorFor` | EPOLLERR를 socket-level error code와 연결 |

- 조사 방법: GitHub에서 `f1320f357bca`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `8864f253ac15` — `feat(connection): 스트림 연결 상태 계약 정의`. 원문 역할은 “Defines the move-only Connection and its I/O outcome model.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.6 `8864f253ac15` — `feat(connection): 스트림 연결 상태 계약 정의`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | ARCH, EVENT_IO, LIFECYCLE |
| 원문 확정 역할 | Defines the move-only Connection and its I/O outcome model. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Defines the move-only Connection and its I/O outcome model.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | fd별 byte-stream 진행 상태와 소유권을 한 객체로 묶는 계약이 없었습니다. |
| 주요 문제와 설계 판단 | `Connection`을 copy 금지·move 허용 객체로 정의하고 fd, peer address, read/write buffer, `writeOffset_`, line limit, peer/close 상태와 read/write 결과를 한곳에 모았습니다. |
| 변경 파일·symbol | `include/Connection.hpp — Connection, ReadResult, WriteResult` |
| state / ownership 변화 | 한 `Connection`이 하나의 fd와 그 fd의 미완성 입력·미전송 출력·종료 상태를 함께 소유합니다. |
| failure 또는 boundary | 결과 구조는 would-block, peer close, hard error를 분리해 server가 즉시 제거와 재시도를 구분할 수 있게 합니다. |
| 보장 / 비보장 | 보장: transport state의 authoritative owner와 move-only 경계가 정의됩니다.<br>비보장: destructor와 move의 exactly-once close 구현은 다음 commit 전에는 선언뿐입니다. |
| 다음 관련 변화 | d71a2549c0eb이 fd 이동 수명을, 9b601b69de4f부터 실제 I/O state machine을 구현합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `8864f253ac15` | `include/Connection.hpp` | `Connection copy/move declarations` | copy를 막고 descriptor ownership 이전만 허용 |
| `8864f253ac15` | `include/Connection.hpp` | `readBuffer_, writeBuffer_, writeOffset_` | framing과 partial output 진행 상태를 fd owner에 결합 |

- 조사 방법: GitHub에서 `8864f253ac15`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `d71a2549c0eb` — `feat(connection): 소켓 소유권과 이동 수명 구현`. 원문 역할은 “Implements exactly-once descriptor ownership and move transfer.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.7 `d71a2549c0eb` — `feat(connection): 소켓 소유권과 이동 수명 구현`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | LIFECYCLE, RISK |
| 원문 확정 역할 | Implements exactly-once descriptor ownership and move transfer. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Implements exactly-once descriptor ownership and move transfer.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | move-only 선언은 있었지만 fd를 정확히 한 번 닫는 구현이 없었습니다. |
| 주요 문제와 설계 판단 | destructor가 유효 fd를 닫고, move constructor/assignment가 모든 상태를 옮긴 뒤 source fd를 -1로 만들었습니다. move assignment는 destination의 기존 fd를 먼저 닫습니다. |
| 변경 파일·symbol | `src/Connection.cpp — destructor, move constructor, move assignment` |
| state / ownership 변화 | ownership 이전 후 destination만 fd를 보유하고 moved-from 객체는 비소유 상태가 됩니다. |
| failure 또는 boundary | self-assignment를 피하고 기존 destination resource를 먼저 해제해 overwrite 누수를 막습니다. |
| 보장 / 비보장 | 보장: 정상 destruction과 move chain에서 descriptor가 중복 close되거나 유실되지 않습니다.<br>비보장: event registry와 server map 등록 실패까지의 cross-object rollback은 아직 다루지 않습니다. |
| 다음 관련 변화 | 4ad1227e5119가 이 move-only 객체를 server map에 넣고 5dcd882f0763가 등록 rollback을 보강합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `d71a2549c0eb` | `src/Connection.cpp` | `Connection::~Connection` | 유효 fd의 최종 close owner |
| `d71a2549c0eb` | `src/Connection.cpp` | `operator=(Connection&&)` | 기존 fd close 후 state 이동, source fd=-1 |

- 조사 방법: GitHub에서 `d71a2549c0eb`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `9b601b69de4f` — `feat(connection): IRC 입력 프레임 추출 구현`. 원문 역할은 “Establishes incremental IRC framing and the line-size boundary.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.8 `9b601b69de4f` — `feat(connection): IRC 입력 프레임 추출 구현`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | EVENT_IO, IRC_PROTOCOL, RISK |
| 원문 확정 역할 | Establishes incremental IRC framing and the line-size boundary. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Establishes incremental IRC framing and the line-size boundary.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | read buffer는 있었지만 TCP fragment에서 IRC line을 증분 추출하는 규칙이 없었습니다. |
| 주요 문제와 설계 판단 | newline을 기준으로 complete frame을 반복 추출하고 직전 CR을 제거하며 incomplete suffix는 buffer에 남겼습니다. 최대 line 길이를 newline 포함 기준으로 검사했습니다. |
| 변경 파일·symbol | `src/Connection.cpp — extractLines` |
| state / ownership 변화 | read buffer는 아직 line이 되지 않은 suffix만 유지하고 결과 vector가 완성 line의 순서를 보유합니다. |
| failure 또는 boundary | oversized complete frame 또는 delimiter 없이 limit를 넘은 fragment는 close/error 상태를 만들고 해당 bytes를 이후 valid command로 남기지 않습니다. |
| 보장 / 비보장 | 보장: TCP packet 경계와 무관한 incremental IRC framing을 제공합니다.<br>비보장: 실제 recv drain, EOF, EINTR/would-block 처리는 다음 commit에 없습니다. |
| 다음 관련 변화 | b00589d4b1b1가 socket bytes를 이 framing 함수로 공급합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `9b601b69de4f` | `src/Connection.cpp` | `Connection::extractLines` | newline 반복 추출, CR 제거, suffix 보존과 size 경계 |

- 조사 방법: GitHub에서 `9b601b69de4f`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `b00589d4b1b1` — `feat(connection): 논블로킹 수신 상태 처리`. 원문 역할은 “Implements the non-blocking receive state machine.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.9 `b00589d4b1b1` — `feat(connection): 논블로킹 수신 상태 처리`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | EVENT_IO, RISK |
| 원문 확정 역할 | Implements the non-blocking receive state machine. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Implements the non-blocking receive state machine.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | frame extractor는 있었지만 non-blocking socket을 끝까지 읽는 state machine이 없었습니다. |
| 주요 문제와 설계 판단 | `recv`를 반복해 positive bytes를 buffer에 붙이고 line을 추출하며, 0은 peer close, EINTR은 재시도, EAGAIN/EWOULDBLOCK은 현재 drain 완료, 나머지는 hard error로 분류했습니다. |
| 변경 파일·symbol | `src/Connection.cpp — readAvailable` |
| state / ownership 변화 | 한 read readiness에서 가능한 bytes와 lines를 모두 소비하고 incomplete suffix는 다음 event까지 남습니다. |
| failure 또는 boundary | EOF와 hard error는 close 경로로 전달되고 would-block은 연결 상태를 유지합니다. |
| 보장 / 비보장 | 보장: edge/level-trigger 차이와 무관하게 준비된 입력을 drain하며 retryable 상태를 오류로 오인하지 않습니다.<br>비보장: application callback 중 connection이 제거되는 reentrancy는 server 단계에서 아직 해결되지 않습니다. |
| 다음 관련 변화 | 378d5304828d가 read result를 line callback과 disconnect 판단에 연결합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `b00589d4b1b1` | `src/Connection.cpp` | `Connection::readAvailable` | recv 결과별 progress/retry/terminal branch |

- 조사 방법: GitHub에서 `b00589d4b1b1`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `a10fe961e2b1` — `feat(connection): 부분 송신 대기열 처리`. 원문 역할은 “Implements persistent partial-write progress and graceful output draining.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.10 `a10fe961e2b1` — `feat(connection): 부분 송신 대기열 처리`

| 항목 | 값 |
| --- | --- |
| Importance | S |
| Tags | CORE, EVENT_IO, LIFECYCLE |
| 원문 확정 역할 | Implements persistent partial-write progress and graceful output draining. |
| 학습 깊이 | 프로젝트 핵심 architecture/invariant입니다. 이전 상태, failure sequence, 핵심 결정, ownership/lifecycle, 남은 한계와 후속 fix/test를 모두 복원합니다. |

#### Source에서 확정된 역할

> Implements persistent partial-write progress and graceful output draining.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 상태 | 출력 bytes와 한 번의 send를 연결할 persistent progress state가 없었습니다. |
| failure / boundary | EINTR은 같은 suffix를 재시도하고, EAGAIN/EWOULDBLOCK 및 0은 offset을 유지한 채 다음 writable event를 기다리며, hard error는 close를 요청합니다. `MSG_NOSIGNAL`을 사용할 수 있는 플랫폼에서는 SIGPIPE를 억제합니다. |
| 핵심 결정 | `writeOffset_`로 sent prefix를 나타내고 `flushPending()`이 unsent suffix만 전송하도록 했습니다. `queueRaw()`와 `queueLine()`은 bytes를 append하고 line terminator를 CRLF 하나로 정규화했습니다. |
| 변경 파일·symbol | `src/Connection.cpp — flushPending, queueRaw, queueLine, pendingBytes, wantsWrite` |
| ownership / lifecycle / state transition | `writeBuffer_[0:writeOffset_]`는 이미 전송된 prefix, 나머지는 순서가 보존된 pending suffix입니다. 완료 시 buffer/offset을 reset하고 큰 consumed prefix만 compact합니다. |
| 이 commit이 보장하는 것 | short send와 backpressure 사이에서도 성공한 byte 수만큼만 전진해 exact-order delivery의 기반을 만듭니다. |
| 아직 보장하지 않는 것 | queue 크기는 무제한이며 `pending + append` overflow와 send가 요청보다 큰 값을 돌려주는 비정상 결과는 아직 방어하지 않습니다. |
| 후속 fix/test 연결 | 625ffc924de8이 write interest에 연결하고, d7d85e518177가 limit를 추가한 뒤 881e59734a9a/f34ab135c546가 경계를 수정·검증합니다. |

#### S-level invariant 재구성

| 순서 | 상태 / 판단 |
| --- | --- |
| 1. 이전 전제 | 출력 bytes와 한 번의 send를 연결할 persistent progress state가 없었습니다. |
| 2. failure conditions / boundary | EINTR은 같은 suffix를 재시도하고, EAGAIN/EWOULDBLOCK 및 0은 offset을 유지한 채 다음 writable event를 기다리며, hard error는 close를 요청합니다. `MSG_NOSIGNAL`을 사용할 수 있는 플랫폼에서는 SIGPIPE를 억제합니다. |
| 3. 선택한 표현과 순서 | `writeOffset_`로 sent prefix를 나타내고 `flushPending()`이 unsent suffix만 전송하도록 했습니다. `queueRaw()`와 `queueLine()`은 bytes를 append하고 line terminator를 CRLF 하나로 정규화했습니다. |
| 4. authoritative state | `writeBuffer_[0:writeOffset_]`는 이미 전송된 prefix, 나머지는 순서가 보존된 pending suffix입니다. 완료 시 buffer/offset을 reset하고 큰 consumed prefix만 compact합니다. |
| 5. 결과 invariant | short send와 backpressure 사이에서도 성공한 byte 수만큼만 전진해 exact-order delivery의 기반을 만듭니다. |
| 6. 후속 보강 | 625ffc924de8이 write interest에 연결하고, d7d85e518177가 limit를 추가한 뒤 881e59734a9a/f34ab135c546가 경계를 수정·검증합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `a10fe961e2b1` | `src/Connection.cpp` | `Connection::flushPending` | unsent suffix pointer/length와 return-count 기반 offset 전진 |
| `a10fe961e2b1` | `src/Connection.cpp` | `queueLine` | 기존 CR/LF 제거 후 CRLF 하나 append |
| `a10fe961e2b1` | `src/Connection.cpp` | `pendingBytes/wantsWrite` | logical unsent bytes가 server interest 판단의 입력 |

- 조사 방법: GitHub에서 `a10fe961e2b1`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `e6492e27cc30` — `feat(server): 이벤트 서버 공개 계약 정의`. 원문 역할은 “Defines Server ownership and the transport callback boundary.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.11 `e6492e27cc30` — `feat(server): 이벤트 서버 공개 계약 정의`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | ARCH, EVENT_IO, LIFECYCLE |
| 원문 확정 역할 | Defines Server ownership and the transport callback boundary. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Defines Server ownership and the transport callback boundary.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | Connection과 EventManager는 있었지만 listener·connection map·callback을 조율하는 owner가 없었습니다. |
| 주요 문제와 설계 판단 | `Server` 공개 계약에 config, lifecycle, poll, send/disconnect API와 connect/line/disconnect/error callback을 정의했습니다. event manager와 fd→`unique_ptr<Connection>` map을 소유하게 했습니다. |
| 변경 파일·symbol | `include/Server.hpp — Server, Config, callback types` |
| state / ownership 변화 | Server가 listener, backend, 모든 live Connection의 authoritative transport owner가 됩니다. application은 callback을 통해서만 protocol state를 연결합니다. |
| failure 또는 boundary | public API는 start/poll/send/disconnect 실패가 transport cleanup으로 수렴할 수 있는 경계를 제공합니다. |
| 보장 / 비보장 | 보장: event reactor와 protocol coordinator 사이의 소유·호출 경계가 정의됩니다.<br>비보장: accept, dispatch, interest refresh, cleanup은 아직 구현되지 않았습니다. |
| 다음 관련 변화 | 4ad1227e5119부터 listener와 accepted fd를 실제 owner graph에 편입합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `e6492e27cc30` | `include/Server.hpp` | `connections_` | fd별 unique_ptr Connection 소유 |
| `e6492e27cc30` | `include/Server.hpp` | `ConnectHandler/LineHandler/DisconnectHandler` | transport와 application의 callback 경계 |

- 조사 방법: GitHub에서 `e6492e27cc30`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `4ad1227e5119` — `feat(server): 논블로킹 연결 수락과 등록 구현`. 원문 역할은 “Integrates accepted descriptors into connection and event ownership.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.12 `4ad1227e5119` — `feat(server): 논블로킹 연결 수락과 등록 구현`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | EVENT_IO, LIFECYCLE |
| 원문 확정 역할 | Integrates accepted descriptors into connection and event ownership. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Integrates accepted descriptors into connection and event ownership.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | Server 계약은 있었지만 accepted fd를 non-blocking connection과 event registry에 넣지 못했습니다. |
| 주요 문제와 설계 판단 | accept를 would-block까지 반복하고 socket을 설정한 뒤 Connection을 만들고 event backend에 Read 관심을 등록하고 map에 이동시킨 다음 connect callback을 호출했습니다. |
| 변경 파일·symbol | `src/Server.cpp — acceptReadyClients, socket configuration helpers` |
| state / ownership 변화 | accept된 raw fd는 Connection 생성 이후 그 객체로, map 삽입 이후 Server로 ownership이 이전됩니다. |
| failure 또는 boundary | accept EINTR은 재시도하고 EAGAIN/EWOULDBLOCK은 drain 종료입니다. 설정/등록/삽입/callback 예외는 catch 경로로 전달되지만 이 버전은 event add와 map 삽입의 완전한 rollback 및 callback self-removal 안전성이 부족합니다. |
| 보장 / 비보장 | 보장: listener readiness 하나에서 accept queue를 drain하고 live fd를 event loop에 등록합니다.<br>비보장: 등록 성공 뒤 raw pointer를 callback 이후 재사용할 수 있어 후속 reentrancy fix 대상입니다. |
| 다음 관련 변화 | 5dcd882f0763가 map-first insertion, add rollback, fd relookup으로 수명 결함을 수정합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `4ad1227e5119` | `src/Server.cpp` | `Server::acceptReadyClients` | accept drain과 fd→Connection→event/map/callback 순서 |

- 조사 방법: GitHub에서 `4ad1227e5119`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `378d5304828d` — `feat(server): 준비 이벤트 루프 구동`. 원문 역할은 “Makes the portable event loop operational.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.13 `378d5304828d` — `feat(server): 준비 이벤트 루프 구동`

| 항목 | 값 |
| --- | --- |
| Importance | S |
| Tags | CORE, ARCH, EVENT_IO |
| 원문 확정 역할 | Makes the portable event loop operational. |
| 학습 깊이 | 프로젝트 핵심 architecture/invariant입니다. 이전 상태, failure sequence, 핵심 결정, ownership/lifecycle, 남은 한계와 후속 fix/test를 모두 복원합니다. |

#### Source에서 확정된 역할

> Makes the portable event loop operational.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 상태 | listener와 connection 등록은 가능했지만 공통 readiness를 지속 처리하는 reactor가 없었습니다. |
| failure / boundary | listener error/hangup은 server-level failure이며 client error는 해당 fd disconnect로 수렴합니다. stop request를 확인해 더 이상 dispatch하지 않는 경계가 있습니다. |
| 핵심 결정 | `start()`, `run()`, `pollOnce()`를 연결해 listener event는 accept로, client event는 read/write/error/hangup 처리로 분배했습니다. |
| 변경 파일·symbol | `src/Server.cpp — start, run, pollOnce, handleClientEvent` |
| ownership / lifecycle / state transition | single-threaded loop가 backend wait 결과를 순서대로 처리하고 callback을 통해 complete lines를 application에 넘깁니다. |
| 이 commit이 보장하는 것 | portable backend 위에서 동작하는 실제 reactor와 connection-scoped failure isolation을 제공합니다. |
| 아직 보장하지 않는 것 | callback이 현재 connection을 삭제할 때 보유 pointer를 재사용하는 위험과 interest update failure rollback은 남아 있습니다. |
| 후속 fix/test 연결 | 625ffc924de8이 출력 readiness를, 7a6bc7e1276a가 authoritative cleanup을 추가합니다. |

#### S-level invariant 재구성

| 순서 | 상태 / 판단 |
| --- | --- |
| 1. 이전 전제 | listener와 connection 등록은 가능했지만 공통 readiness를 지속 처리하는 reactor가 없었습니다. |
| 2. failure conditions / boundary | listener error/hangup은 server-level failure이며 client error는 해당 fd disconnect로 수렴합니다. stop request를 확인해 더 이상 dispatch하지 않는 경계가 있습니다. |
| 3. 선택한 표현과 순서 | `start()`, `run()`, `pollOnce()`를 연결해 listener event는 accept로, client event는 read/write/error/hangup 처리로 분배했습니다. |
| 4. authoritative state | single-threaded loop가 backend wait 결과를 순서대로 처리하고 callback을 통해 complete lines를 application에 넘깁니다. |
| 5. 결과 invariant | portable backend 위에서 동작하는 실제 reactor와 connection-scoped failure isolation을 제공합니다. |
| 6. 후속 보강 | 625ffc924de8이 출력 readiness를, 7a6bc7e1276a가 authoritative cleanup을 추가합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `378d5304828d` | `src/Server.cpp` | `Server::pollOnce` | 공통 Event에서 listener/client 분기 |
| `378d5304828d` | `src/Server.cpp` | `Server::handleClientEvent` | read lines, write flush, error/hangup dispatch |

- 조사 방법: GitHub에서 `378d5304828d`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `625ffc924de8` — `feat(server): 송신 큐와 쓰기 관심 상태 연결`. 원문 역할은 “Couples pending output to write readiness and close completion.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.14 `625ffc924de8` — `feat(server): 송신 큐와 쓰기 관심 상태 연결`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | EVENT_IO, LIFECYCLE, INTEGRATION |
| 원문 확정 역할 | Couples pending output to write readiness and close completion. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Couples pending output to write readiness and close completion.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | Connection은 pending output을 보유했지만 server backend의 Write 관심과 자동 동기화되지 않았습니다. |
| 주요 문제와 설계 판단 | `sendTo()`/`queueRawTo()`가 queue 후 `refreshInterest()`를 호출하고, pending bytes가 있을 때만 Write 관심을 추가했습니다. closeRequested 상태는 pending이 비면 disconnect하도록 했습니다. |
| 변경 파일·symbol | `src/Server.cpp — sendTo, queueRawTo, refreshInterest, writable handling` |
| state / ownership 변화 | Connection의 `wantsWrite()`가 kernel write interest의 단일 입력이고 drain 완료가 graceful close completion 조건입니다. |
| failure 또는 boundary | queue나 flush 오류는 close/disconnect로 수렴합니다. 이 버전의 update failure 처리는 예외 후 stale ownership을 남길 수 있어 후속 fix가 필요합니다. |
| 보장 / 비보장 | 보장: busy-loop 없이 pending output이 있을 때만 writable notification을 요청하고, queued final response를 보낸 뒤 닫을 수 있습니다.<br>비보장: interest update가 callback/cleanup을 유발한 뒤 reference를 다시 쓰는 문제는 5dcd882f0763 이전에 남습니다. |
| 다음 관련 변화 | 7a6bc7e1276a가 disconnect 종착점을 만들고 5dcd882f0763가 refresh를 fd 기반으로 수정합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `625ffc924de8` | `src/Server.cpp` | `Server::refreshInterest` | pending/close state를 Read/Write interest와 연결 |
| `625ffc924de8` | `src/Server.cpp` | `Server::sendTo/queueRawTo` | queue 결과와 backend 관심 갱신 연결 |

- 조사 방법: GitHub에서 `625ffc924de8`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 다음 Thread commit: `7a6bc7e1276a` — `feat(server): 연결 해제와 오류 정리 구현`. 원문 역할은 “Centralizes transport removal and disconnect notification.”입니다. 현재 commit의 state/API/미해결 위험은 위의 후속 연결 항목처럼 이어집니다.

### 5.15 `7a6bc7e1276a` — `feat(server): 연결 해제와 오류 정리 구현`

| 항목 | 값 |
| --- | --- |
| Importance | A |
| Tags | LIFECYCLE, RISK |
| 원문 확정 역할 | Centralizes transport removal and disconnect notification. |
| 학습 깊이 | 주요 subsystem·boundary·failure path·integration point를 path와 symbol 기준으로 복원합니다. |

#### Source에서 확정된 역할

> Centralizes transport removal and disconnect notification.

#### 해당 SHA의 역사 복원

| 학습 항목 | 학습 기록 |
| --- | --- |
| 직전 경계/상태 | 여러 event/error/stop 경로에서 connection 제거 순서가 하나의 함수로 고정되지 않았습니다. |
| 주요 문제와 설계 판단 | `disconnect()`가 backend remove를 시도하고 `unique_ptr`를 map 밖 local로 옮겨 entry를 먼저 erase한 뒤 disconnect callback을 호출했습니다. bulk close는 fd snapshot을 사용했습니다. |
| 변경 파일·symbol | `src/Server.cpp — disconnect, closeAllConnections, handleClientEvent` |
| state / ownership 변화 | callback 시점에는 server map에서 fd가 이미 사라졌지만 local unique_ptr가 callback 동안 객체 lifetime을 유지하고 callback 후 destructor가 fd를 닫습니다. |
| failure 또는 boundary | backend remove와 callback exception은 report되더라도 object destruction을 막지 않습니다. hangup은 pending output이 없을 때 terminal입니다. |
| 보장 / 비보장 | 보장: recursive lookup/repeated disconnect는 이미 제거된 상태를 보고, map iteration 중 erase로 iterator가 깨지지 않습니다.<br>비보장: callback 전에 잡은 raw pointer를 callback 뒤 다시 사용하는 call site와 event add/update rollback은 아직 안전하지 않습니다. |
| 다음 관련 변화 | 5dcd882f0763/928594ec160c가 이 baseline의 reentrancy와 rollback 결함을 수정·검증합니다. |

#### 코드 증거

| SHA | File path | Symbol / 함수 | 이 증거가 뒷받침하는 결론 |
| --- | --- | --- | --- |
| `7a6bc7e1276a` | `src/Server.cpp` | `Server::disconnect` | event remove → map ownership move/erase → callback → destruction 순서 |
| `7a6bc7e1276a` | `src/Server.cpp` | `Server::closeAllConnections` | fd snapshot으로 반복 erase 안전성 |

- 조사 방법: GitHub에서 `7a6bc7e1276a`의 exact commit diff와 변경 파일을 확인했습니다.
- runtime 결과로 표시한 내용은 없으며 위 표는 code inspection으로 확인한 사실입니다.

#### 다음 연결

- 이 commit은 이 Thread의 마지막 항목입니다. 아래 Invariant ledger와 Thread 최종 상태에서 전체 변화를 연결합니다.

## 6. Invariant ledger

| Invariant | 처음 도입 | 강화/적용 | 학습자 최종 기록 | Fix/Test 연결 |
| --- | --- | --- | --- | --- |
| 공통 readiness 의미 | `8e8a3db87950` | d3f74e2857da, 769cd3094f71, 2284a0e0d8bb, f1320f357bca | 각 backend의 native registration/notification을 같은 `Event` 의미로 번역합니다. | 별도 runtime test는 이 Thread에 없고 416efc91e580의 두 OS CI로 이어집니다. |
| fd 단일 소유권 | `8864f253ac15` | d71a2549c0eb, 4ad1227e5119, 7a6bc7e1276a | Connection move와 map/local unique_ptr 수명으로 close owner를 하나로 유지합니다. | 5dcd882f0763/928594ec160c가 등록 rollback과 callback lifetime을 보강합니다. |
| incremental input framing | `9b601b69de4f` | b00589d4b1b1 | complete line만 반환하고 incomplete suffix를 보존하며 oversize를 terminal로 만듭니다. | 6b4a7738a285의 fragmented TCP smoke가 통합 경로를 확인합니다. |
| persistent partial output | `a10fe961e2b1` | 625ffc924de8 | writeOffset와 Write interest를 결합해 unsent suffix를 event 사이에 보존합니다. | 881e59734a9a/f34ab135c546가 overflow와 모든 send outcome을 수정·검증합니다. |
| authoritative cleanup | `e6492e27cc30` | 378d5304828d, 7a6bc7e1276a | event remove → map erase → callback → descriptor destruction의 종착점을 만듭니다. | 5dcd882f0763/928594ec160c가 reentrant call site와 rollback을 고정합니다. |

도입과 완성을 같은 의미로 쓰지 않았습니다. 후속 fix가 이전 SHA의 사실을 바꾸지 않도록 각 시점의 보장과 부족함을 분리했습니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 | 실제 failure / risk | Fix 또는 기반 변화 | 수정된 decision / semantics | Test 연결 |
| --- | --- | --- | --- | --- |
| 한 send가 전부 완료된다는 가정 | short send/backpressure에서 suffix 유실·중복 | a10fe961e2b1 → 881e59734a9a | persistent offset과 overflow-safe admission/return guard | f34ab135c546 |
| callback 뒤 기존 pointer가 유효하다는 가정 | self-disconnect 뒤 stale Connection 접근 | 7a6bc7e1276a → 5dcd882f0763 | erase-before-callback과 fd relookup | 928594ec160c |

## 8. Ownership / state / responsibility 변화

| 책임 또는 상태 | 이전 상태 | 이후 authoritative 위치 | 관련 commit | 확인 결과 |
| --- | --- | --- | --- | --- |
| native readiness registration/translation | 없음 | `EventManager` backend | 8e8a3db87950 → f1320f357bca | path/symbol은 위 commit 증거표에 연결했습니다. |
| socket·input·output·close progress | raw fd 중심 | move-only `Connection` | 8864f253ac15 → a10fe961e2b1 | path/symbol은 위 commit 증거표에 연결했습니다. |
| listener와 connection orchestration | 구성 요소 분리 | `Server`/`pollOnce()` | e6492e27cc30 → 378d5304828d | path/symbol은 위 commit 증거표에 연결했습니다. |
| write readiness 정책 | Connection queue만 존재 | `Server::refreshInterest()` | 625ffc924de8 | path/symbol은 위 commit 증거표에 연결했습니다. |
| descriptor removal/notification | 분산 가능성 | `Server::disconnect()` | 7a6bc7e1276a | path/symbol은 위 commit 증거표에 연결했습니다. |

## 9. Thread 최종 상태

- 시작 직전 상태: portable readiness 의미와 backend 수명 계약이 아직 존재하지 않았습니다.
- 마지막 commit `7a6bc7e1276a` 시점의 상태: recursive lookup/repeated disconnect는 이미 제거된 상태를 보고, map iteration 중 erase로 iterator가 깨지지 않습니다.
- Thread 안에서 강화된 핵심 invariant: 공통 readiness 의미, fd 단일 소유권, incremental input framing, persistent partial output, authoritative cleanup.
- 남은 한계 또는 후속 Thread에서 보강되는 부분: callback 전에 잡은 raw pointer를 callback 뒤 다시 사용하는 call site와 event add/update rollback은 아직 안전하지 않습니다. 5dcd882f0763/928594ec160c가 이 baseline의 reentrancy와 rollback 결함을 수정·검증합니다.
- 최종 설명: `8e8a3db87950`에서 시작한 책임은 commit map 순서대로 상태 owner, failure branch와 cleanup ordering을 추가했고 `7a6bc7e1276a`에서 이 Thread가 정한 검증 또는 운영 상태에 도달합니다. 이전 시점의 미보장은 후속 fix/test SHA를 별도로 연결했으며 final HEAD 상태를 과거 commit에 소급하지 않았습니다.

## 10. 최종 architecture 또는 execution flow 정리

| 단계 | SHA | Caller / callee / state owner | 정상 transition | failure / cleanup transition |
| --- | --- | --- | --- | --- |
| backend wait | 769cd3094f71 / f1320f357bca | `Kqueue/EpollEventManager::wait` | 공통 `Event` vector | EINTR은 빈 결과, 다른 wait 오류는 예외 |
| event dispatch | 378d5304828d | `Server::pollOnce` | listener는 accept, client는 handleClientEvent | event error는 connection-scoped disconnect |
| read path | b00589d4b1b1 / 378d5304828d | `Server::handleClientEvent` | Connection::readAvailable → line callback | EOF/hard error/close request는 disconnect |
| write path | a10fe961e2b1 / 625ffc924de8 | `Server writable branch` | Connection::flushPending → offset/interest 갱신 | would-block은 suffix 보존, hard error는 disconnect |
| cleanup | 7a6bc7e1276a | `Server::disconnect` | backend remove → map erase/local owner → callback | 예외를 report해도 local owner destructor가 fd close |

## 11. 학습 완료 자가 점검

- [x] Commit map의 모든 SHA, subject, importance, tags를 source와 대조했습니다.
- [x] 모든 commit의 exact SHA diff와 변경 파일·symbol을 확인했습니다.
- [x] final HEAD의 함수나 field를 과거 commit 설명에 소급하지 않았습니다.
- [x] S commit은 architecture/invariant, failure, ownership/lifecycle, 후속 fix/test까지 기록했습니다.
- [x] A commit은 주요 subsystem/boundary/failure path와 설계 판단을 기록했습니다.
- [x] B commit은 Thread 흐름에서 맡는 구현 역할과 state 변화를 기록했습니다.
- [x] fix commit의 기존 가정, root cause, 수정 invariant, regression test를 연결했습니다.
- [x] test commit의 production path, technique, 증명/비증명 범위를 구분했습니다.
- [x] Invariant ledger와 responsibility 표를 path/symbol 증거에 연결했습니다.
- [ ] production build/test command를 이 작업 환경에서 직접 실행했습니다. local checkout을 만들 수 없어 code/test inspection과 실행 결과를 분리했으며 pass 결과를 기록하지 않았습니다.
