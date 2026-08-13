# Pong Pong 문제별 진단 사례

실시간 경기는 HTTP 한 요청에서 끝나지 않는다. cookie와 ticket, 열린 socket,
room 메모리, scheduler, PostgreSQL transaction과 browser cache가 서로 다른
시점에 바뀐다. 증상이 비슷해도 실패한 소유자를 찾지 못하면 정상 상태를
고치거나 이미 확정된 결과를 다시 쓰게 된다.

## 빠른 증상 지도

| 증상 | 먼저 확인할 소유자 | 남을 수 있는 상태 | 직접 확인하는 근거 |
| --- | --- | --- | --- |
| 로그인은 되지만 WebSocket만 거절됨 | session → ticket → upgrade | 소비됐거나 만료된 ticket, 이전 connection | auth·ticket test와 `/ws` close code |
| 다른 방에 match chat이 나타남 | shared chat schema와 `GameHub` | migration 006 전의 잘못된 `roomId` row | schema·좌석 검사·DB CHECK regression test |
| 경기 화면에 lobby chat이 나타남 | server audience와 game hook | UI filter regression 또는 이전 client | `useGameConnection` scope/room filter test |
| 한 방 오류 뒤 다른 방도 멈춤 | shared scheduler | 뒤 room callback 미실행, process exception | scheduler loop 정적 대조; 예외 격리 test는 없음 |
| 종료 뒤 화면이 다시 playing이 됨 | snapshot buffer와 reducer | DB 결과는 확정됐지만 UI만 회귀 | socket·reducer test와 sequence 로그 |
| resume 뒤 패들이 계속 움직임 | browser 방향 ref와 server paddle `dy` | pause reset regression | pause 시 양쪽 방향 0 회귀 테스트 |
| 종료 문구도 결과 조회도 없음 | `GameHub`와 repository | retry 중인 finished room 또는 process crash | finalization retry test·observer·DB 조회 |
| ready인데 실제 schema가 다름 | migration readiness | 이름은 current지만 column·constraint drift | migration table과 실제 catalog 별도 대조 |
| demo 화면이 production API를 호출함 | web build artifact | 이전 `NEXT_PUBLIC_*`가 bundle에 남음 | image build args와 browser request URL |
| 다른 사용자 로그인 뒤 이전 자료가 잠깐 보임 | React Query cache | 이전 private query가 stale 전 유지 | query key와 invalidation 목록 |
| metrics가 PostgreSQL 성공처럼 보임 | instrumentation label | Memory 호출도 `database`로 집계 | 선택한 repository와 metric label 대조 |

## WebSocket 접속만 실패할 때

HTTP `/me`가 200이어도 기존 session cookie가 WebSocket에 그대로 전달되는
구조가 아니다.

1. `POST /auth/ws-ticket`이 active 사용자인지 확인한다.
2. 30초 안에 같은 ticket을 정확히 한 번 소비했는지 확인한다.
3. `/ws` query의 `v=1`과 public `ws`/`wss` URL을 확인한다.
4. 같은 사용자의 새 connection이 기존 connection을 4001로 교체했는지 본다.
5. guest라면 process-local ticket과 connection lease 상한을 확인한다.

logout은 이미 발급한 미사용 ticket을 지우지 않고 열린 socket도 닫지 않는다.
ban 성공은 GameHub의 해당 사용자 queue·좌석·열린 socket을 즉시 폐기한다. 반대로 DB나 API instance를
바꾸면 Memory·guest ticket은 사라진다. “cookie가 유효한가”만 확인해서는
원인을 좁힐 수 없다.

`Origin` 검사는 별도 문제다. API는 upgrade query의 ticket·version을 검사하지만
WebSocket `Origin` allowlist는 두지 않는다. CORS 설정을 보고 upgrade도 같은
정책으로 보호된다고 판단하면 안 된다.

## chat의 scope와 room이 어긋날 때

`chat.send`는 discriminated union으로 lobby/room 없음과 match/UUID room을
교차 검사한다. GameHub도 match sender의 현재 좌석과 room ID를 확인하고 해당
room에만 broadcast한다. Migration 006은 저장 행에 같은 조합을 강제한다.

정상적인 match chat은 저장 뒤 해당 room에만 broadcast된다. 다음 두 입력은
다른 결과를 만든다.

```json
{"v":1,"type":"chat.send","scope":"match","roomId":"82f8b1bc-2f4d-4fc7-a6b2-a8b0011fd007","body":"..."}
```

알고 있는 다른 room ID를 보내도 실제 좌석과 다르면 저장 전에 거절한다.

```json
{"v":1,"type":"chat.send","scope":"match","roomId":null,"body":"..."}
```

이 값은 schema 단계에서 거절된다. 화면 button 외에도 shared parser, GameHub
authorization과 DB CHECK를 함께 유지해야 직접 frame·우회 저장도 막힌다.

입력과 출력의 match room ID는 모두 UUID다. 과거에 저장된 잘못된 조합은
migration 006에서 정리한 뒤 CHECK constraint를 추가한다. 장애를 진단할 때는
constraint와 migration 적용 상태까지 확인해 이전 row와 현재 parser 실패를
구분한다.

수신 쪽도 확인한다. Game hook은 `scope: "match"`와 현재 `roomId`가 모두 같은
message만 reducer에 넣는다. 과거 client나 이 filter의 regression은 server의
발신 권한 문제와 별도로 진단한다.

## Pause·재접속 뒤 방향이 맞지 않을 때

Browser는 마지막 방향을 ref에 보관하고 같은 값을 반복 전송하지 않는다.
Keyup·blur는 0으로 바꾸지만 server는 paused 상태의 input을 버린다. 이를 보완해
pause 진입 자체가 양쪽 paddle 방향을 0으로 초기화하므로 resume에 이전 방향이
남지 않는다.

Reconnecting 중에는 send 실패보다 먼저 local ref가 바뀔 수 있다. Room ID가
유지되면 reset effect도 실행되지 않아 복구 뒤 같은 방향 입력이 억제될 수
있다. 이 증상에서는 snapshot 위치만 보지 말고 browser ref, `sendDirection`
반환값, server phase와 paddle `dy`를 같은 이벤트 순서로 확인한다.

## 한 방 때문에 scheduler가 멈출 때

`SharedRoomScheduler`는 callback `Map`을 복사한 뒤 삽입 순서대로 호출한다.
room별 try/catch, 실행 시간 budget과 rotation이 없다. 한 callback이 오래
걸리면 뒤 room이 늦고, throw하면 같은 순회의 뒤 room을 건너뛴다.
`FixedStepScheduler` 바깥까지 exception이 전파되면 Node process 종료로 이어질
수도 있다.

현재 scheduler test는 등록·해제와 순회 중 unregister를 확인하지만 callback
throw 격리를 고정하지 않는다. 이 증상에서는 개별 simulation 결과뿐 아니라
같은 tick의 다른 room callback, event-loop delay와 process 오류 로그를 함께
봐야 한다.

## 결과 저장 실패와 event 유실을 구분하기

결과 단일 확정에는 두 경계가 있다.

- `room.finishing` promise가 같은 process의 동시 finish를 하나로 합친다.
- repository transaction과 unique `resultKey`가 DB 반영을 한 번으로 제한한다.

DB 호출 전에 scheduler와 reconnect timer를 끄고 room session을 finished로
바꾼다. `finalizeMatch`가 일시 실패하면 같은 result key와 단일 in-flight를
유지한 capped-backoff timer가 재시도한다. 성공 뒤에만 `game.finished`를 한 번
보내고 reservation·room·client 연결을 정리한다.

종료 tick이 snapshot delivery cadence에 걸렸다면 이 실패보다 먼저 최종 점수와
tick이 전송될 수 있다. 하지만 `syncSnapshot`은 simulation phase를 복사하지
않으므로 이 snapshot의 phase는 `playing`이고 browser reducer도 화면을
finished로 바꾸지 않는다. 따라서 DB 실패 뒤 browser는 playing으로 보이는데
server room은 finished인 상태가 남을 수 있다. Client snapshot, server room,
`game.finished` 성공 event와 DB 결과를 각각 확인해야 한다.

재시도 상태는 process memory이므로 API가 성공 전에 종료되면 사라진다. 반대로
transaction 성공 직후 process가 죽으면 DB 결과는 있지만 종료 event를
받지 못할 수 있다. 이때 결과를 다시 쓰기보다 dashboard/profile의 HTTP 조회로
확정 여부를 확인해야 한다. Process 재시작을 넘는 outbox, client ACK와 startup
reconciliation은 없다.

같은 `resultKey` 재시도도 payload를 비교하지 않는다. 첫 호출과 다른 참가자나
점수를 보내도 기존 match ID를 성공처럼 반환한다. unique key가 모든 재시도
내용의 동일성을 증명하는 것은 아니다.

## 관리자가 자신을 정지했을 때

관리 화면은 현재 로그인한 admin 행에도 상태 변경 button을 보이고 API와
repository도 actor와 target이 같은지 검사하지 않는다. Self-ban transaction이
성공하면 사용자 상태와 audit row는 함께 남지만 그 session의 다음 admin
요청은 `account_suspended`로 거절된다.

유일한 admin이었다면 같은 화면에서 되돌릴 수 없다. Dev login은 같은 handle을
admin role로 승격하지 않고 status도 active로 복구하지 않으므로 다른 active
admin 또는 직접 DB 조치가 필요하다. 진단할 때 audit row와 대상 ID를 먼저
확인하고, [관리자 route 테스트](../apps/api/src/admin.test.ts)의 “정지된 기존
session은 다음 요청에서 403” 경계를 대조한다. 현재 test는 recovery path를
제공한다는 뜻이 아니다.

## 종료 뒤 화면만 되돌아갈 때

Snapshot은 혼잡할 때 최신 한 건을 pending buffer에 남기지만
`game.finished`는 직접 전송된다. pending playing snapshot callback이 나중에
도착할 수 있다. reducer는 작거나 같은 `sequence`를 버리지만 terminal status와
room ID를 함께 확인하지 않아 더 큰 sequence를 적용할 수 있다.

DB와 server room이 이미 끝났다면 결과를 다시 확정할 문제가 아니다. browser
reducer와 connection generation을 확인하고, 새 HTTP 조회로 authoritative
결과를 복구한다. Canvas는 reducer가 건넨 snapshot을 그릴 뿐 승패를
계산하지 않는다.

## readiness가 current인데 query가 실패할 때

PostgreSQL readiness는 다음만 확인한다.

- DB에 간단한 query를 보낼 수 있다.
- migration table의 applied name 집합이 현재 파일 이름 집합과 같다.

SQL checksum, 실제 column type, constraint와 index 정의는 비교하지 않는다.
같은 migration 파일 내용을 배포 후 바꾸거나 `IF NOT EXISTS`가 불완전한
table을 건너뛰면 `current`인데 query가 실패할 수 있다. 이 경우 migration
이름만 다시 적용하지 말고 실제 schema catalog와 001~006이 만든 구조를
대조해야 한다.

Memory repository는 migrations가 `not_applicable`이라 ready다. 이 응답은
PostgreSQL이 준비됐다는 신호가 아니다.

## mode와 build가 어긋날 때

API `APP_MODE`는 process 시작 때 읽지만 web의 `NEXT_PUBLIC_APP_MODE`,
API base와 WS URL은 build 결과에 들어간다. runtime env만 demo로 바꾸고
production web image를 재사용하면 middleware·화면과 실제 route가 다르다.

production에는 dev·guest login route가 없고 운영 인증 공급자도 없다. non-demo
web은 개발 로그인 form을 표시할 수 있으므로 form이 보인다는 사실을 login
가능성으로 해석하지 않는다. browser network request, image build args와 API
route 등록 mode를 함께 확인한다.

WS URL이 잘못된 문자열이면 ticket 요청 뒤 `new WebSocket(url)`이 동기 예외를
던질 수 있다. 이 호출은 `GameSocketClient`의 ticket `try/catch` 밖에 있고
page는 connect Promise를 기다리지 않으므로 공통 실패 문구나 reconnect 대신
unhandled rejection과 `connecting` 상태가 남을 수 있다. Browser console과
실제 bundle의 WS URL을 ticket·proxy 오류와 분리해 확인한다.

## query cache가 사용자 흐름을 앞설 때

401 event는 session-scoped query 일부를 제거하고 `me`를 null로 바꾼다. 새
개발 로그인 성공은 `me`와 lobby를 주로 무효화한다. 이전 사용자의 dashboard,
`ownProfile`·friends 같은 private query가 아직 fresh하면 다른 login 직후 잠시
재사용될 수 있다.

경기 종료도 dashboard, profile, leaderboard와 tournament query를 일괄
무효화하지 않는다. WebSocket event와 React Query cache는 같은 shared type을
사용할 뿐 자동 동기화되지 않는다. 증상 재현에는 query key, stale time,
mutation invalidation과 socket event 순서를 같이 기록해야 한다.

## 검증을 고르는 법

- simulation·RoomSession·Matchmaker·reducer는 고정 입력과 가짜 시계를 쓰는
  unit test에서 확인한다.
- Memory repository test는 빠른 업무 흐름을 확인하지만 PostgreSQL lock,
  constraint, rollback과 session TTL을 증명하지 않는다.
- PostgreSQL integration은 migration, transaction, concurrent ticket·result와
  tournament join을 확인하지만 운영 volume과 schema drift를 증명하지 않는다.
- HTTP·WebSocket smoke는 실제 process의 cookie·ticket·playing frame을 잇지만
  reconnect·finish·result 조회와 browser rendering 전체를 다루지 않는다.
- browser E2E는 화면 action과 Canvas pixel을 확인하지만 production auth,
  경기 종료·영속 결과·실제 mobile touch를 확인하지 않는다.
- 저장된 [부하 측정](./measurements/load-2026-07-24.json)은 reconnect 기준
  미달을 포함하고, [장애 복구 측정](./measurements/fault-recovery-2026-07-24.json)은
  로컬 proxy·readiness 복구만 다룬다.

현재 자동 검사에는 WebSocket `Origin`, match/null chat, scheduler callback
throw 격리, 저장 실패 room 복구, malformed JSON status와 metrics label의
실제 backing store 의미를 직접 고정한 시나리오가 없다. 이 영역은 정적
흐름 대조와 별도 재현이 필요하다.

## 확인 범위

구현, 테스트와 저장된 로컬 측정으로 직접 확인되는 범위만 설명합니다.
저장소만으로 확인할 수 없는 내용은 포함하지 않습니다.
