# 배포, 관측, 정상 종료의 경계

운영 경로는 이미지를 만드는 단계, DB schema를 준비하는 단계, 요청을 받는 단계로 나뉜다. API가 시작됐다는 사실만으로 마이그레이션·seed·인증 수단·경기 복구까지 준비됐다고 판단하면 안 된다.

## 서로 다른 자원 수명

| 자원 | 소유자와 수명 |
| --- | --- |
| PostgreSQL DB 상태 | PostgreSQL이 논리 row를 관리하고 named volume이 물리 파일을 보존한다. Row는 application SQL과 migration으로 바뀌며 volume 삭제는 저장소 전체를 없앤다. |
| migration process | one-shot `migrate` container. 종료 code만 다음 service 시작 조건에 남는다. |
| API room·queue·guest result | API process memory. container 교체와 함께 사라진다. |
| DB connection pool | PostgreSQL repository. Fastify close hook에서 닫는다. |
| Web bundle의 public mode·URL | web image layer. container runtime env만 바꿔도 갱신되지 않는다. |
| 공개 listener | Caddy container. API와 Web의 내부 listener를 Compose network에서 연결한다. |

Container를 내리는 것, process memory를 버리는 것, row를 지우는 것과 volume을
삭제하는 것은 서로 다른 정리 작업이다. 실제 명령과 파괴적 초기화 조건은
[운영 준비와 장애 확인](../docs/operations.md#postgresql-volume의-수명)이
담당한다.

## 설정을 읽는 시점이 만든 경계

API mode와 repository 선택은 process 시작 때 독립적으로 정해진다. 따라서
PostgreSQL 사용이 registered login을 열거나, production mode가 자동으로
영속 저장을 선택하지 않는다. Web의 public URL과 mode는 build artifact의
속성이라 API runtime과 다른 세대가 배치될 수도 있다. 각 container가 healthy여도
이 조합 오류는 남는다. Mode별 인증 결과는
[인증에서 실시간 연결까지](authentication-and-realtime-connection.md), 설정값과
재build 절차는 [운영 준비와 장애 확인](../docs/operations.md#build-time과-runtime-설정)이
담당한다.

## 시작 의존성과 readiness는 같은 상태가 아니다

Compose의 시작 edge는 `DB health → migrate 성공 → API readiness → web·Caddy`
순서다. 이 edge는 처음 container를 여는 조건일 뿐, 나중 API가 unhealthy가
됐다고 공개 route를 자동으로 닫지는 않는다.

Readiness는 drain flag, 저장소 query와 migration 이름 집합만 본다. Seed,
운영 login, 실제 column shape, WebSocket handshake와 room 복구는 대상이 아니다.
Development·test·demo의 Memory repository도 `migrations:not_applicable`로 ready가
될 수 있다. Production은 `DATABASE_URL`이 없으면 시작을 거절한다. 따라서
readiness는 traffic 수용 신호이지 제품 전체 기능의 source of truth가 아니다.
`beginDrain`은 room 종료보다 먼저 이 신호를 내린다.

## 공개 ingress와 내부 계측의 신뢰 경계

기본 배치에서 Caddy만 host port를 게시한다. 다만 `"8080:8080"`은 host IP를
생략하므로 모든 host interface에 게시되며, 문서의 `localhost`는 기본 client
URL이지 loopback 제한이 아니다. Caddy는 page, `/api` prefix 제거와 `/ws`
upgrade를 각각 Web·API로 연결하고 공개 `/api/metrics`를 막는다. API 직접
포트를 열면 이 차단을 우회한다. `/metrics`는 shared JSON schema를 쓰지 않는
Prometheus text이므로 보호자는 parser가 아니라 network·proxy 경계다.
정확한 공개 path와 same-origin cookie 조건은
[운영 가이드의 공개 request 경로](../docs/operations.md#공개-request-경로)에서
확인한다.

## 관측값과 request ID

Metrics는 HTTP·repository·connection·queue·room·snapshot·finalization과
event-loop 상태를 관찰한다. Registered Memory 결과도
`persistence="database"`와 `database_operation`에 들어가므로 label은 물리
PostgreSQL 상태가 아니다. Gauge와 counter도 업무 row를 대신하지 않는다.

이 지표는 관찰용이다. 결과 확정의 일시 실패는 GameHub가 동일 result key로
capped-backoff 재시도하지만 지표 자체가 재시도를 실행하지는 않는다. 재접속
만료가 늘어도 인스턴스를 자동 교체하지 않으며 경보 규칙과 dashboard도 없다.

Fastify는 HTTP·upgrade request에 ID를 붙인다. Upgrade handler는 이 값을
`GameHub.connect`에 넘기고 `Client.requestId`가 connection 수명 동안 보관한다.
Room 생성 log는 양쪽 request ID, reconnect log는 새 connection ID를 남긴다.
반면 match finalization observer에는 request ID가 없고 browser까지 같은
context를 전달하지도 않는다. 이는 분산 trace가 아니라 ingress와 일부 room
log를 연결하는 상관관계 값이다. HTTP 오류 body의 ID가 browser에서 어떻게
보존되는지는 [프로토콜 오류 계약](../docs/protocol.md#http-오류-계약)이
설명한다.

Logger는 Authorization, cookie, query와 ticket을 가린다. 새 correlation field를
추가해도 자격 증명 redaction 경계를 유지해야 한다.

## 종료 시 소유권을 역순으로 정리한다

Signal handler는 먼저 drain flag를 소유하고 readiness를 내린다.
`GameHub`가 새 매칭을 거절하고 대기자·reservation을 정리한 뒤 기존 room을
기다린다. 마지막 Fastify close hook이 WebSocket, heartbeat·snapshot buffer,
scheduler, metrics와 repository pool을 닫는다.

`playing` 방은 계속 진행하지만 `waiting`과 수동 `paused` 방은 사용자의 다음 이벤트가 없으면 끝나지 않는다. `reconnecting` 방은 공용 deadline에 따라 끝나거나 복구된다. Drain 제한 시간 뒤에도 방이 남으면 결과에 활성 방 수를 담고 종료를 계속하므로, 정상 종료가 모든 경기 결과의 영속화를 보장하지는 않는다. Compose의 API 종료 유예는 70초로 application의 최대 60초 drain보다 길다.

drain은 새 HTTP write 전체나 새 WebSocket handshake를 즉시 거절하지 않는다.
열린 connection의 queue·tournament 참가를 막는 경계다. 종료 중에도 profile
변경 같은 HTTP handler가 실행될 수 있으므로 “새 요청을 모두 차단한다”고
표현하지 않는다. 제한 시간과 operator 확인 순서는
[운영 가이드의 정상 종료](../docs/operations.md#정상-종료)가 담당한다.

## 배포 증거와 비범위

Build와 CI의 security maintenance baseline은 Node.js `24.18.1`, Next.js
`15.5.23`, Fastify `5.11.3`, `ws` `8.21.0`이다. CI는 `pnpm test:contracts`로
CI·Docker·load·fault 정적 계약을 실행한다. 현재 lockfile의 `pnpm audit --prod`는
알려진 취약점을 보고하지 않지만, 정적 계약과 registry audit 모두 실제 image
build·run, 미래 advisory와 애플리케이션 보안 검증을 대신하지 않는다.

실행 명령, 저장된 부하·장애 결과와 증상별 확인 순서는
[운영 준비와 장애 확인](../docs/operations.md)이 맡는다. 검증 계층별 실행 조건과
테스트 데이터 수명은 [로컬 개발과 검증](../docs/development.md)에서 확인한다.
Architecture에서 유지할 결론은 다음 경계다.

- DB·migration 실패는 API 시작 또는 readiness에서 멈춘다. 실행 중 결과의
  일시 실패는 process-local 재시도를 하지만 durable outbox는 아니다.
- WebSocket 혼잡은 snapshot drop이나 연결 종료로 나타나며 browser reconnect가
  새 authoritative state를 받아야 한다.
- Drain timeout은 남은 room의 결과를 보장하지 않고 process-local 상태를
  app close에서 제거한다.
- API·Web Node base, PostgreSQL, Caddy와 Toxiproxy image는 tag만 사용하고
  digest를 고정하지 않아 나중 build의 byte 재현성을 보장하지 않는다.

백업·복구, TLS 인증서 운영, 경보 전송, 중앙 로그 저장, DB pool 튜닝,
무중단 schema 호환성과 실행 중 room의 instance 이전은 현재 범위 밖이다.
