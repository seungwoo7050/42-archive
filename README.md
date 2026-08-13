# Pong Pong

Pong Pong은 브라우저가 입력만 보내고 서버가 공의 위치, 점수와 승패를 계산하는
실시간 퐁 서비스입니다. HTTP와 WebSocket은 같은 공용 계약을 사용하고, 경기
결과는 서버가 한 번만 확정합니다.

## 저장소 구성

- `packages/shared`: HTTP·WebSocket·경기 상태의 Zod 계약
- `packages/db`: PostgreSQL migration, 저장소 구현과 메모리 저장소
- `apps/api`: Fastify HTTP·WebSocket 서버와 경기 실행 계층
- `apps/web`: Next.js 로비, 경기장, 대시보드, 순위표와 토너먼트 화면

경기 계산은 `PongSimulation`, 방 상태 전이는 `RoomSession`, 대기열 정책은
`Matchmaker`가 맡습니다. 실행 중인 방은 `SharedRoomScheduler`가 같은 주기로
순회합니다. 브라우저는 서버 snapshot 사이를 보간하지만 점수나 승패를 직접
판정하지 않습니다.

등록 사용자용 API에는 개발 로그인, 실시간 매칭과 채팅, 경기 기록, 프로필,
친구 요청·수락·목록, 토너먼트와 관리자 상태 변경이 있습니다. 브라우저 화면이
이 API를 모두 노출하지는 않습니다. 현재 화면에서 가능한 친구 동작은 공개
프로필의 요청 전송뿐이며, 친구 목록·수락·삭제와 본인 프로필 편집 화면은
없습니다. `/auth/logout` endpoint도 있지만 현재 browser에는 logout button이나
호출 흐름이 없습니다. 토너먼트와 관리자 동작도 최종 권한은 API가 판정합니다.
비회원 체험은 일반 사용자와 매칭되지 않고 결과도 전적이나 순위표에 저장하지
않습니다.

## 준비

Node.js `24.18.1`과 pnpm `10.32.1`을 사용합니다. Web framework는 Next.js
`15.5.23`, API framework는 Fastify `5.11.3`, WebSocket transport는 `ws`
`8.21.0` maintenance patch를 고정합니다.

```sh
corepack enable
pnpm install --frozen-lockfile
```

API의 `APP_MODE`와 `DATABASE_URL`은 프로세스를 시작할 때 읽습니다. 반면
`NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_APP_MODE`는
Next.js 빌드 산출물에 들어갑니다. 실행 환경 변수만 바꿔 이전 웹 산출물을
재사용하면 화면·middleware의 기능 범위와 API route가 어긋날 수 있습니다.

## 등록 사용자 개발 환경

`development` 모드는 `/auth/dev-login`을 열어 등록 사용자 흐름을 확인할 수
있게 합니다. Compose의 `migrate` 작업은 스키마만 준비하므로 NPC와 예시
사용자 row가 필요하면 `seed:dev`를 별도로 실행해야 합니다. Seed의 admin
row에는 browser session이 없고 dev login은 같은 handle의 role을 다시
`user`로 만들기 때문에 seed만으로 admin 화면을 사용할 수는 없습니다.

```sh
POSTGRES_PASSWORD=local-pong-password \
SESSION_SECRET=local-session-secret-at-least-32-bytes \
APP_MODE=development \
  docker compose up --build -d

POSTGRES_PASSWORD=local-pong-password \
SESSION_SECRET=local-session-secret-at-least-32-bytes \
APP_MODE=development \
  docker compose run --rm api node packages/db/dist/cli.js seed:dev
```

웹은 기본 client URL인 `http://localhost:8080`에서 엽니다. Compose의
`"8080:8080"`은 host IP를 생략해 Caddy를 모든 host interface에 게시하므로
localhost 전용 bind가 아닙니다. 원격 주소를 사용할 때는 `PUBLIC_ORIGIN`과
`PUBLIC_WS_URL`을 그 주소에 맞추고 web image를 다시 build해야 합니다.

같은 비밀값을 사용해 `docker compose down --remove-orphans`를 실행하면
서비스를 내릴 수 있습니다. `api` service의 `stop_grace_period`는 70초로,
application의 최대 60초 room drain보다 길게 설정되어 있습니다.

관리 화면을 확인하려면 먼저 development login으로 선택한 handle의 session을
만든 뒤, 그 session이 살아 있는 동안 같은 handle의 role을 바꿉니다.

```sh
POSTGRES_PASSWORD=local-pong-password \
SESSION_SECRET=local-session-secret-at-least-32-bytes \
APP_MODE=development \
  docker compose run --rm api \
    node packages/db/dist/cli.js user:set-role <로그인한-handle> admin
```

다음 session 조회부터 변경된 role을 읽습니다. 자기 자신을 ban하면 같은
session으로 해제할 수 없으므로 다른 active admin이나 직접 DB 복구가 필요합니다.

`pnpm dev`로 API와 웹만 실행할 수도 있습니다. development·test·demo에서
`DATABASE_URL`을 주지 않으면 API는 메모리 저장소를 선택합니다. production은
영속 결과 유실을 막기 위해 `DATABASE_URL`이 없으면 시작을 거절합니다. 이 메모리 저장소는 시작할 때 NPC·관리자·예시
프로필을 자동으로 만들지 않습니다. 실행 중인 Memory repository의 role을
바꾸는 공개 bootstrap 경로도 없어 이 조합에서는 admin route가 등록돼 있어도
성공하는 admin session을 준비할 수 없습니다.

## 비회원 체험 환경

비회원 PvP와 6초 뒤 AI 전환을 확인할 때는 웹을 `demo` 설정으로 다시
빌드합니다. 일반 사용자 개발 환경을 내린 뒤 실행해야 이전 빌드 설정이 섞이지
않습니다.

```sh
POSTGRES_PASSWORD=local-demo-password \
SESSION_SECRET=local-demo-session-secret-32-bytes \
APP_MODE=demo \
  docker compose up --build -d
```

`demo`에서는 개발 로그인, 프로필 변경, 친구, 토너먼트, 순위표와 관리자
경로를 제공하지 않습니다. PostgreSQL을 연결해도 demo의 HTTP 인증은
`pp_session`을 무시하고 guest cookie만 해석하며, WebSocket도 repository의
등록 사용자 ticket을 소비하지 않습니다. Guest AI 상대는 API 프로세스 안에서
만들기 때문에 `seed:demo`가 없어도 체험 경기를 실행할 수 있습니다.

## 검증

타입, 단위 테스트, PostgreSQL 통합 테스트와 배포 산출물은 실행 중인 서비스
없이 확인할 수 있습니다.

```sh
pnpm typecheck
pnpm unit
pnpm test:contracts
pnpm postgres-integration
pnpm build
pnpm verify:build
```

다음 명령은 서버를 시작하지 않습니다. migration과 `seed:dev`가 끝난
PostgreSQL, development API와 웹을 먼저 실행한 뒤 사용합니다.

```sh
API_BASE_URL=http://localhost:8080/api pnpm smoke:http

API_BASE_URL=http://localhost:8080/api \
WS_URL=ws://localhost:8080/ws \
  pnpm smoke:ws

E2E_BASE_URL=http://localhost:8080 \
API_BASE_URL=http://localhost:8080/api \
  pnpm e2e
```

`pnpm e2e:guest-demo`는 별도로 빌드한 `demo` 환경을 대상으로 실행합니다.
테스트 데이터가 남으므로 smoke와 E2E에는 폐기 가능한 DB를 사용합니다.

## 운영 경계

`/health/live`는 프로세스 생존 여부, `/health/ready`는 수명 주기와 DB·migration
상태를 확인합니다. `/metrics`는 내부 수집용 Prometheus 응답이며 Caddy 공개
경로에서는 차단합니다. 종료 신호를 받으면 새 매칭을 거절하고 진행 중인 방을
최대 60초 기다린 뒤 HTTP·WebSocket과 DB 연결을 닫습니다. Compose는 API에 70초의 종료 유예를 제공해 이 정상 종료 절차를 기다립니다.

`production` 모드는 개발 로그인과 비회원 로그인을 모두 열지 않습니다. OAuth나
별도 운영 인증 공급자도 포함하지 않으므로, 이 저장소만 배포해서는 새 사용자가
운영 세션을 만들 수 없습니다. 비회원 전용 빌드가 아닌 웹은 production에서도
개발 로그인 입력을 표시할 수 있지만 해당 API route는 열리지 않습니다. 화면
노출을 인증 기능의 존재로 해석하면 안 됩니다.
## 문서

- [구조 개요와 상세 architecture](docs/architecture.md)
- [HTTP와 실시간 프로토콜](docs/protocol.md)
- [로컬 개발과 검증](docs/development.md)
- [운영 준비와 장애 확인](docs/operations.md)
- [문제별 진단 사례](docs/case-study.md)
- [부하·장애 주입 실행 안내](tests/load/guide.ko.md)
- [개발 과정에서 해결한 문제](devlog/README.md)

정확한 측정값과 실행 환경은
[부하 결과](docs/measurements/load-2026-07-24.json),
[장애 복구 결과](docs/measurements/fault-recovery-2026-07-24.json),
[스케줄러 비교 결과](docs/measurements/scheduler-2026-07-24.json)에만
보관합니다. 부하 결과는 재접속 기준 미달을 포함하므로 전체 통과 기록으로
해석하면 안 됩니다.
