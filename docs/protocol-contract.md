# 현재 IRC 프로토콜 계약

이 문서는 `irc-relay-server` 실행 파일이 현재 구현하는 TCP·IRC wire 계약을
정리한다. IRC 표준 전체와의 호환성이나 `include/*.hpp`의 설치용 library ABI를
약속하지 않는다. 실행 옵션과 종료 코드는 [프로젝트 안내](../README.md), 소켓과
응용 상태의 수명은
[소켓에서 채널 메시지까지](../architecture/socket-to-channel-message.md)에
있다.

## 공개 경계

저장소가 외부에 제공하는 현재 경계는 세 가지다.

- 실행 파일 CLI: `irc-relay-server <port> <password> [options]`
- TCP wire: 클라이언트 입력 frame과 서버가 보내는 IRC 형식 frame
- 관찰 출력: 준비 메시지 stdout과 `event=<name> key=value` stderr 로그

`include/`의 `Server`, `Connection`, `EventManager`, `Channel`,
`IrcMessage`, `Replies` 선언은 제품을 구성하고 단위 검사를 주입하는 C++
경계다. install 규칙, versioned library, ABI 호환 약속과 별도 소비자 검사는
없으므로 실행 파일의 공개 프로토콜과 같은 release surface로 보지 않는다.

## TCP byte에서 IRC frame까지

`Connection::readAvailable()`은 논블로킹 `recv()`를 `EAGAIN` 또는
`EWOULDBLOCK`까지 반복한다. TCP 조각은 연결별 `readBuffer_`에 이어 붙이고
첫 `\n`을 frame 끝으로 삼는다.

- CRLF와 LF-only 입력을 모두 받는다. frame 끝의 `\r`은 제거한다.
- 전송 계층의 기본 상한 512바이트는 `\n`까지 포함한다. 따라서 CRLF 입력의
  본문은 최대 510바이트다.
- LF-only 본문 511바이트는 전송 상한은 통과하지만 `parseLine()`의
  “CRLF 전 510바이트” 검사에서 `417`로 거부된다.
- 빈 frame, command가 없는 prefix, 510바이트를 넘긴 parser 본문은 `417`
  응답 대상이다.
- 완성되지 않은 버퍼가 512바이트를 넘거나 delimiter를 포함한 frame이
  512바이트를 넘으면 연결 오류로 처리하고 응용 명령을 실행하지 않는다.
- `EINTR`은 재시도하고 `recv() == 0`은 peer close와 종료 요청으로 기록한다.

parser는 선택적 `:prefix`, 공백으로 나눈 command와 parameter, 마지막
`:trailing parameter`를 읽는다. command는 기본 C locale의 대문자로
정규화한다. 클라이언트가 보낸 prefix는 저장되지만 현재 명령 권한이나 사용자
식별에는 사용하지 않는다. 별도 parameter 개수 상한, 문자 인코딩과 전체 IRC
문법을 일괄 강제하는 계층은 없다.

한 read-ready callback에는 byte 수나 frame 수 quantum이 없다. 읽을 수 있는
모든 byte를 먼저 받고 완성 frame을 `vector<string>`에 모은 뒤 응용 계층으로
넘긴다. 뒤쪽에서 너무 긴 frame을 발견해 `hasError`가 되면 서버는 오류를 먼저
처리하므로 같은 `ReadResult`에 이미 모인 정상 frame도 실행하지 않는다.
rate limit는 이 수집이 끝난 뒤 frame별로 적용되므로 한 callback의 수신
작업량과 임시 메모리를 제한하지 않는다.

## 등록 상태

연결의 등록 여부는 하나의 enum이 아니라 다음 조건으로 정한다.

```text
passOk && hasNick && hasUser && !registered
```

- 서버 password가 빈 문자열이면 `onConnect()`에서 `passOk=true`다.
- password가 있으면 올바른 `PASS`가 필요하다. 잘못된 값은 `464`를 넣고
  종료를 요청한다.
- `NICK`은 1..30바이트이며 첫 문자가 숫자, `#`, `&`, `:`, `-`이면 안 된다.
  whitespace, `,`, `*`, `?`, `!`, `@`도 허용하지 않는다.
- `USER`는 parameter가 4개 이상이어야 한다. 첫 값과 네 번째 값을 user와
  realname으로 저장한다.
- 세 조건을 마지막으로 채운 명령이 `registered=true`로 바꾸고
  `001`, `002`, `003`을 순서대로 대기열에 넣는다.

등록 전에도 `PASS`, `NICK`, `USER`, `PING`, `PONG`, `QUIT`는 처리한다. 다른
문법상 유효한 command는 `451`이다. 등록 뒤 `NICK`은 같은 채널에서 찾은
구성원에게 변경 frame을 보낸다. 하나 이상의 채널에 속해 있으면 자신도 그
집합에 들어가지만, 어느 채널에도 속하지 않은 사용자는 자신에게도 변경 frame을
받지 않는다. `USER`나 이미 만족한 `PASS` 재시도는 `462`다.

## 구현한 command subset

| command | 현재 동작과 성공 frame | 주요 오류 numeric |
| --- | --- | --- |
| `PASS` | password 조건을 채우며 마지막 등록 조건이면 `001`..`003` | 누락 `461`, 불일치 `464` 뒤 종료, 이미 만족 `462` |
| `NICK` | 색인을 바꾸며 마지막 등록 조건이면 `001`..`003`; 등록 뒤에는 공통 채널 구성원에게 `NICK` | 누락 `431`, 형식 `432`, 충돌 `433` |
| `USER` | 첫·네 번째 parameter를 저장하며 마지막 등록 조건이면 `001`..`003` | 누락 `461`, 등록 뒤 `462` |
| `PING` | 첫 parameter를 포함한 server `PONG` | 누락 `409` |
| `PONG` | 정확히 한 heartbeat token이면 대기 해제; 응답 frame 없음 | 없음 |
| `QUIT` | 이유를 저장하고 출력 배출 뒤 종료 요청; 공통 채널 동료에게 `QUIT` | 없음 |
| `PRIVMSG` | nickname 또는 comma-separated target에 전달 | 대상 누락 `411`, text 누락 `412`, nick 없음 `401`, channel 송신 불가 `404` |
| `JOIN` | 입장 `JOIN`, `331/332`, `353`, `366`; `JOIN 0`은 모든 채널에서 나감 | 인자 `461`, 이름 `403`, 초대 필요 `473` |
| `PART` | comma-separated 채널에서 나가며 선택 이유를 `PART`로 방송 | 인자 `461`, 채널 없음 `403`, 비구성원 `442` |
| `TOPIC` | 조회 `331/332`, 변경 성공은 `TOPIC` 방송 | 인자 `461`, 채널 없음 `403`, 비구성원 `442`, `+t` 권한 `482` |
| `KICK` | operator가 현재 구성원을 제거하고 `KICK` 방송 | 인자 `461`, 채널/구성원/권한 `403/442/482`, nick 없음 `401`, 대상 비구성원 `441` |
| `INVITE` | inviter는 구성원이어야 하며 성공 시 `341`과 대상 `INVITE` | 인자 `461`, nick/채널/구성원 `401/403/442`, `+i` 권한 `482`, 이미 구성원 `443` |
| `MODE` | 채널 조회 `324`, `i/t/o` 변경 방송, user 조회 `221` | 인자 `461`, 대상 `401/403`, 구성원·권한 `442/482`, `o` 대상 `441`, mode `472`, user 변경 `501/502` |
| `LIST` | 전체 또는 정확한 채널 이름들에 `321`, 0개 이상의 `322`, `323` | 없음 |
| `NAMES` | 전체 또는 지정 채널별 `353`, `366`; 없는 지정 채널은 `366`만 | 없음 |
| `METRICS` | 현재 counter 일부를 `NOTICE`로 보냄 | 등록 전 `451` |

등록 전 허용 목록 밖의 command는 `451`, 그 밖의 등록 후 command는 `421`이다.
각 command의 정확한 상태·소유권 흐름은
[`RegistrationCommands.cpp`](../src/RegistrationCommands.cpp),
[`MessagingCommands.cpp`](../src/MessagingCommands.cpp),
[`ChannelCommands.cpp`](../src/ChannelCommands.cpp)에서 확인할 수 있다.

## 현재 numeric과 오류 frame

| 범주 | 현재 생성하는 code |
| --- | --- |
| 등록 성공 | `001`, `002`, `003` |
| user mode | `221`, `501`, `502` |
| 채널 목록·mode | `321`, `322`, `323`, `324` |
| topic·초대·names | `331`, `332`, `341`, `353`, `366` |
| 대상·채널 오류 | `401`, `403`, `404`, `441`, `442`, `443` |
| command·frame 오류 | `409`, `411`, `412`, `417`, `421` |
| nickname·rate·등록 오류 | `431`, `432`, `433`, `439`, `451` |
| 인자·password·mode·권한 오류 | `461`, `462`, `464`, `472`, `473`, `482` |

서버 heartbeat 만료와 정상 shutdown에는 numeric 대신 `ERROR` frame을 쓴다.
이 표는 가능한 모든 IRC numeric 목록이 아니라 현재 소스가 만드는 집합이다.

## 채널과 식별자 정책

채널 이름은 `#` 또는 `&`로 시작하고 최소 2바이트여야 하며 whitespace, comma와
BEL을 거부한다. `_channels` map은 이름을 정확 비교하므로 `#Room`과 `#room`은
다른 채널이다.

닉네임 색인과 초대는 `std::tolower`로 만든 기본 C locale 문자열을 사용한다.
ASCII 영문 대소문자는 같게 찾지만 RFC 전용 casemapping 전체를 구현하지 않는다.

- 새 `Channel`은 `+i`가 꺼지고 `+t`가 켜진 상태로 시작한다. topic은 아직
  없으며 최초 `MODE #channel` 조회는 `324 ... +t`를 만든다.
- 빈 채널의 첫 입장자만 자동 operator가 된다.
- 구성원을 제거하면 그 fd의 operator 권한도 제거한다.
- 마지막 operator가 나가거나 kick돼도 남은 구성원에게 자동 승계하지 않는다.
- 구성원이 0명이 된 채널만 map에서 삭제한다.
- `+i`와 `+t`는 채널 boolean이고 `+o`는 구성원별 집합이다.
- `MODE #channel`의 `324`는 `i`와 `t`만 보여 주며 operator 목록은 싣지 않는다.
- user mode 조회는 `221 +`; 다른 사용자를 바꾸면 `502`, 자신을 바꾸려 하면
  미구현 `501`이다.
- 복합 channel mode는 앞 문자를 적용한 뒤 뒤 문자의 인자·mode 오류를 보낼 수
  있다. 한 오류가 전체 mode 문자열을 rollback하지 않는다.
- 빈 trailing 값을 가진 `TOPIC #channel :`도 `hasTopic=true`인 빈 주제로
  저장하며 “주제 없음” 상태로 되돌리지 않는다.

초대는 연결 세대가 아니라 canonical nickname 문자열로 저장한다. nickname
변경이나 disconnect 때 이동·삭제하지 않으므로 예전 초대가 남고, 나중에 같은
nickname을 얻은 다른 연결이 사용할 수 있다. 입장에 성공하면 현재 nickname의
초대만 지운다.

## 서버가 보내는 frame과 backpressure

`Replies`는 `\r\n`으로 끝나는 문자열을 만들고 `Connection::queueLine()`은 기존
줄 끝을 제거한 뒤 정확히 CRLF 하나를 다시 붙인다. 그러나 최종 응답 frame을
전역 512바이트로 제한하지 않는다. user 입력, hostmask와 server prefix를
조합하면 512바이트를 넘는 출력도 대기열에 들어갈 수 있다.

`max-pending-bytes`는 다음 논리량의 상한이다.

```text
writeBuffer.size() - writeOffset
```

이는 아직 보내지 않은 byte를 제한하며 `std::string::capacity()`, 이미 보낸 뒤
16KiB까지 남겨 둔 prefix 저장 공간, allocator overhead와 프로세스 resident
memory의 상한은 아니다. `flushPending()`도 한 write-ready에서 `EAGAIN` 또는
완료까지 반복하고 byte quantum을 두지 않는다.

## 신뢰 경계와 비범위

서버는 IPv4 `0.0.0.0`에 bind하고 TLS를 종료하지 않는다. CLI password와
클라이언트의 `PASS`는 암호화되지 않은 TCP를 지나며 저장 hash나 외부 인증
시스템을 사용하지 않는다. 신뢰할 수 없는 네트워크에 직접 공개할 때의 기밀성,
인증서, 계정 지속성, 다중 서버 federation을 제공하지 않는다.

SASL, TLS, away 상태, ban/key/limit mode, 전체 user mode, message history,
channel persistence와 IRC 표준 전체의 응답 조합은 현재 비범위다. 구현한 subset의
검사 범위는 각 architecture 문서와 [개발 기록](../devlog/README.md)에 나눈다.

`tests/irc_contract.py`가 직접 고정하는 대표 오류 numeric은 `451`, `432`,
`464`, `433`, `439`이고 등록·채널·조회 명령의 선택된 정상 frame도 비교한다.
나머지 오류 numeric 다수는 현재 소스에는 있지만 모두 독립 실행 반례로
고정되지는 않았다. LF-only/512 경계, 512바이트 초과 출력, stale invite,
channel 대소문자 분리, operator가 없는 비어 있지 않은 채널과 mode 부분 적용도
자동 검사 범위가 아니다.
