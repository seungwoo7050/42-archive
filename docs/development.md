# 로컬 개발과 검증

## runtime과 workspace

Node.js `24.18.1`과 pnpm `10.32.1`을 사용합니다. `.node-version`, `.nvmrc`,
root `package.json`, CI와 Dockerfile도 같은 Node 버전을 가리킵니다.
Web framework는 Next.js `15.5.23`, API framework는 Fastify `5.11.3`, API
WebSocket transport는 `ws` `8.21.0`을 사용하며 잠금 파일을 통해 같은
maintenance patch를 설치합니다.

```sh
corepack enable
pnpm install --frozen-lockfile
```

`pnpm-workspace.yaml`은 `packages/*`와 `apps/*`를 하나의 설치 단위로 묶습니다.
실행 단위와 의존 방향은 다음과 같습니다.

| package | source entrypoint | build·runtime output | 실제 의존 |
| --- | --- | --- | --- |
| `@pong-pong/shared` | `packages/shared/src/index.ts` | `dist/index.js`, `dist/index.d.ts` | Zod |
| `@pong-pong/db` | `packages/db/src/index.ts`, `src/cli.ts` | `dist/index.js`, `dist/cli.js`, `dist/migrations/` | shared, Kysely, pg |
| `@pong-pong/api` | `apps/api/src/index.ts` | `dist/index.js` | db, shared, Fastify, ws |
| `@pong-pong/web` | `apps/web/src/app/layout.tsx`와 route page | `.next/standalone`과 static files | shared, Next.js, React Query |

API와 DB의 일반 TypeScript 검사는 root `tsconfig.base.json`의 path로 shared와
DB source를 직접 봅니다. 각 `tsconfig.build.json`은 `paths`를 비우므로 build와
Node runtime은 package export의 `dist/index.js`·declaration을 읽습니다. Web
tsconfig는 `@/*` path를 자체 정의하고 shared dist가 필요해 `pretypecheck`,
`predev`, `prebuild`에서 shared를 먼저 build합니다. Next build도
`next.config.mjs`에서 shared runtime을 `packages/shared/dist/index.js`로
alias합니다. Source 기반 typecheck가 성공했다는 사실만으로 오래된 dist나
누락된 migration 파일이 배포 가능하다고 볼 수 없습니다.

의존 방향은 `db → shared`, `api → db`, `api → shared`, `web → shared`입니다.
shared가 session 조회·room·SQL을 소유하지 않고 DB가 API를 import하지 않으므로
순환 의존을 피합니다.

## build와 개발 실행 순서

root build는 workspace 도구의 자동 위상 정렬에 맡기지 않고 다음 순서를
스크립트에 고정합니다.

```text
shared → db → api → web
```

DB build는 JavaScript와 declaration뿐 아니라 SQL migration을 `dist`로
복사합니다. web의 `prebuild`, `predev`, `pretypecheck`, `pretest`도 shared를
먼저 build해 runtime alias가 존재하게 합니다.

API와 웹 개발 서버만 실행하는 root 명령은 다음 두 package를 병렬로 엽니다.

```sh
pnpm dev
```

API 기본 포트는 4000, 웹은 3000입니다. development·test·demo에서
`DATABASE_URL`이 없으면 API는 Memory repository를 선택합니다. production은
영속 결과 유실을 막기 위해 `DATABASE_URL` 누락 시 시작을 거절합니다. Memory의
readiness는 `database:up`, `migrations:not_applicable`이며 PostgreSQL 준비를 뜻하지
않습니다.

PostgreSQL을 직접 사용할 때는 application보다 먼저 schema와 필요한 seed를
준비합니다.

```sh
export DATABASE_URL=postgres://pong:pong@127.0.0.1:5432/pong_pong
pnpm --filter @pong-pong/db migrate
pnpm --filter @pong-pong/db seed:dev
```

이 예시는 host의 5432 포트에 PostgreSQL을 직접 실행한 경우입니다. 기본
Compose는 DB 포트를 host에 공개하지 않으므로
[등록 사용자 개발 환경](../README.md#등록-사용자-개발-환경)의 migration job과
API container 경로를 사용합니다.

`seed:dev`는 일반 사용자, 관리자와 NPC를 준비합니다. `seed:demo`는 DB의 NPC
row를 따로 확인할 때만 필요합니다. guest AI는 API 프로세스가 만들기 때문에
demo browser 흐름에는 seed가 필요하지 않습니다. 관리 role만 바꿀 때는 다음
명령을 사용합니다.

```sh
pnpm --filter @pong-pong/db user:set-role -- <handle> <user|admin>
```

Seed가 만든 admin row에는 session이 없습니다. Browser에서 사용할 admin을
준비하려면 먼저 development login으로 handle과 session을 만든 다음, 같은
handle을 위 명령으로 admin으로 바꿔야 합니다. 순서를 반대로 하면 dev login이
role을 다시 user로 upsert합니다. 기존 session은 다음 lookup에서 변경된 role을
읽습니다.

`DATABASE_URL` 없는 Memory API에는 실행 중 role을 바꾸는 CLI·HTTP bootstrap이
없습니다. DB CLI는 별도 PostgreSQL을 수정할 뿐 실행 중 API process의 Memory
객체를 바꾸지 않으므로, development+Memory에서는 admin 성공 경로를 준비할 수
없습니다.

API 시작은 migration이나 seed를 실행하지 않습니다. schema가 없거나 migration
이름 집합이 다르면 listen 자체는 시작할 수 있지만 readiness가 503이 됩니다.
seed가 없다고 readiness가 실패하지는 않으므로 관리자·NPC 기능의 준비 상태는
별도로 확인해야 합니다.

## root script와 Makefile의 같은 이름

root `package.json`과 `Makefile`에는 이름이 같은 진입점이 있지만 내부 명령이
항상 같지는 않습니다.

| 진입점 | 실제 조정 방식 |
| --- | --- |
| `pnpm build` | shared → db → api → web을 명시적으로 직렬 실행 |
| `make build` | `pnpm -r build`로 workspace의 recursive build 실행 |
| `pnpm dev` | API와 web의 package dev server를 병렬 실행 |
| `make dev` | `docker compose up --build`로 전체 Compose stack 실행 |
| `make test`·`make unit` | 둘 다 root `pnpm unit` 실행 |
| `make smoke` | HTTP smoke 뒤 WebSocket smoke 실행 |

특히 `make dev`는 localhost의 두 개발 server만 여는 명령이 아니다. 기본
Compose 값은 production mode이고 `SESSION_SECRET`도 요구하므로, 별도 환경값
없이 실행하면 development login이 열린 개발 환경이 되지 않는다. package
학습과 빠른 로컬 반복에는 root pnpm 명령을, Caddy·migration job까지 포함한
배치 확인에는 Makefile의 Compose wrapper를 구분해 사용해야 합니다.

## mode와 web rebuild

| 값 | 읽는 시점 | 영향 |
| --- | --- | --- |
| API `APP_MODE` | API process 시작 | dev/guest/admin route 등록, secure cookie와 guest 정책 |
| `DATABASE_URL` | API process 시작 | production은 PostgreSQL 필수; development·test·demo는 없으면 Memory |
| `SESSION_SECRET` | API process 시작 | demo guest cookie HMAC, 보호 mode의 길이 검사 |
| `NEXT_PUBLIC_API_BASE_URL` | web build | browser HTTP base |
| `NEXT_PUBLIC_WS_URL` | web build | browser WebSocket URL |
| `NEXT_PUBLIC_APP_MODE` | web build | demo 화면 정책과 middleware |

API image는 같은 JavaScript 산출물을 mode별 runtime 설정으로 다시 사용할 수
있습니다. Next.js의 `NEXT_PUBLIC_*`와 middleware 판단은 build 결과에 들어가므로
mode나 public origin이 바뀌면 web을 다시 build해야 합니다. 이전 `.next`나
container image를 그대로 쓰면 demo UI가 production API를 부르거나 반대
조합이 생길 수 있습니다.

guest 검사는 registered development stack과 섞지 않고 API runtime을 demo로,
web build를 demo용 값으로 맞춘 별도 환경에서 실행합니다.

## 검증 계층

| 검증 | 서비스 필요 | 실제 대상 | 남는 상태·증명하지 않는 것 |
| --- | --- | --- | --- |
| `pnpm typecheck` | 없음 | 네 workspace의 정적 타입 | runtime input, dist freshness, DB constraint는 증명하지 않는다. |
| `pnpm unit` | 없음 | shared parser, Memory repository, API 정책·simulation, web API/query/socket/reducer | React component render, Canvas 보간·resize와 PostgreSQL 의미는 빠져 있다. |
| `pnpm postgres-integration` | Docker 필요 | 실제 PostgreSQL migration, constraint, transaction, concurrent consume/finalize/join | 운영 volume, managed PostgreSQL, migration lock·checksum은 증명하지 않는다. |
| `pnpm build` | 없음 | shared → db → api → web 산출물 생성 | 산출물 실행과 container 동작은 별도다. |
| `pnpm verify:build` | build 뒤 | 정해 둔 dist·standalone 경로 존재 | content, freshness, 모든 transitive runtime 파일까지 검사하지 않는다. |
| `pnpm audit --prod` | registry network | 현재 advisory DB에 알려진 production dependency 취약점 | 미래 advisory, 개발 의존성, 애플리케이션 보안 결함은 증명하지 않는다. |
| `pnpm smoke:http` | development stack | cookie login, lobby·chat·목록·일부 domain route | 테스트 row가 남으며 full authorization·result flow는 아니다. |
| `pnpm smoke:ws` | development stack | 두 사용자 ticket, matchmaking, playing, pause/resume, chat | reconnect, finish, persistence, browser rendering은 증명하지 않는다. |
| `pnpm e2e` | development API·web | login, navigation, chat, AI controls, Canvas pixel, friend request, tournament, admin denial | 경기 종료·결과 재조회, production auth, 실제 mobile touch는 빠져 있다. |
| `pnpm e2e:guest-demo` | demo API·web | guest login, 두 guest 매칭, 6초 AI fallback, 새 ticket reconnect | 종료 결과 비영속성과 모든 금지 route를 끝까지 검사하지 않는다. |
| load·fault | 별도 stack | 정한 connection/room 규모와 proxy·DB 장애 시 관측값 | 저장 결과는 해당 날짜·장비·설정에만 해당한다. |

다음 기본 검사는 실행 중인 service 없이 수행할 수 있습니다.

```sh
pnpm typecheck
pnpm unit
pnpm postgres-integration
pnpm build
pnpm verify:build
pnpm audit --prod
```

PostgreSQL integration은 service stack은 필요 없지만 Testcontainers가 사용할
Docker daemon은 필요합니다. dependency audit은 registry에 접근할 수 있어야 합니다.
실행하지 못한 검사를 통과로 기록하면 안 됩니다.

## 실행 중인 stack을 쓰는 검사

다음 명령은 API와 web을 직접 시작하지 않습니다.

```sh
pnpm smoke:http
pnpm smoke:ws
pnpm e2e
pnpm e2e:guest-demo
```

registered smoke와 browser E2E의 준비 순서는 다음과 같습니다.

1. 폐기 가능한 PostgreSQL에 migration과 `seed:dev`를 적용합니다.
2. API를 `APP_MODE=development`로 실행합니다.
3. development public URL을 넣어 build한 web을 실행합니다.
4. `/health/ready`와 web root가 응답할 때까지 기다립니다.
5. 각 base URL을 실제 공개 경로에 맞춰 검사를 실행합니다.

Compose의 Caddy를 통할 때는 다음 값을 사용합니다.

```sh
API_BASE_URL=http://localhost:8080/api pnpm smoke:http

API_BASE_URL=http://localhost:8080/api \
WS_URL=ws://localhost:8080/ws \
  pnpm smoke:ws

E2E_BASE_URL=http://localhost:8080 \
API_BASE_URL=http://localhost:8080/api \
  pnpm e2e
```

guest E2E는 demo용으로 다시 build한 web과 demo API에 연결합니다.

```sh
E2E_BASE_URL=http://localhost:8080 pnpm e2e:guest-demo
```

smoke와 E2E는 사용자, session, chat, friendship, tournament row를 남길 수
있습니다. 고정 handle도 재사용하므로 폐기 가능한 DB나 실행별 schema가
필요합니다. browser context와 cookie를 지우는 것만으로 DB가 초기화되지는
않습니다.

Playwright는 desktop Chromium과 Pixel 7 크기의 Chromium을 사용합니다.
Firefox, WebKit, 실제 mobile browser, 두 API 인스턴스와 production 인증은
대상이 아닙니다. Guest PvP, 6초 AI fallback과 reconnect 시나리오는 desktop
project에서만 실행되고, Pixel 7 project의 guest 범위는 login과 제한
navigation입니다.

## 단위 검사와 분리된 정적 계약 검사

`pnpm test:contracts`는 다음 Node 정적 계약 검사를 모두 실행하며 CI도 같은
명령을 사용합니다.

- `tests/ci-contract.test.mjs`
- `tests/docker-production.test.mjs`
- `tests/load/fault-scenario.test.mjs`
- `tests/load/load-harness.test.mjs`

Docker contract test는 Compose config와 Dockerfile을 정적으로 확인할 뿐 image를
build·run하지 않으므로 실제 container 검증과 구분합니다.

## Migration과 테스트 데이터

`packages/db/migrations/*.sql`이 schema 변경 원본입니다. 파일 이름 정렬로
001~006을 적용하고 Kysely migration table에 이름을 남깁니다. application
readiness는 expected name과 applied name 집합을 비교할 뿐 SQL checksum이나
실제 column shape를 검사하지 않습니다.

새 migration은 다음 조건을 각각 확인해야 합니다.

1. 빈 schema에 전체 migration이 적용된다.
2. 같은 migrate 명령을 반복해 추가 변경이 없다.
3. 이전 schema의 보존 대상 data가 유지된다.
4. 의도적인 파괴 변경인 005의 기존 session 삭제 범위를 확인한다.
5. test reset은 `NODE_ENV=test`와 전용 `TEST_DATABASE_URL`이 모두 있을 때만
   수행한다.

seed는 schema version을 바꾸지 않으며 migration과 application 시작 사이의
필수 단계도 아닙니다. fixture가 필요한 기능의 개발 준비 단계입니다.

## 스케줄러·부하·장애 결과

방별 timer와 shared scheduler 비교 명령은 다음과 같습니다.

```sh
BENCHMARK_REPEATS=5 node tests/load/scheduler-benchmark.mjs
```

이 microbenchmark는 합성 계산의 callback 지연만 비교하며 실제 `GameHub`,
WebSocket, DB, 직렬화와 특정 room의 느린 callback을 포함하지 않습니다.
[스케줄러 비교 결과](./measurements/scheduler-2026-07-24.json)는 50방 선택
근거이지 운영 throughput 보장이 아닙니다.

[부하 결과](./measurements/load-2026-07-24.json)의 두 필수 실행은 reconnect
성공률이 96%, 95%로 99% 기준에 미달했고
`requiredProfilePassed`도 `false`입니다. 전체 성능 통과 기록으로 사용하지
않습니다. [장애 결과](./measurements/fault-recovery-2026-07-24.json)는 로컬
Compose와 Toxiproxy에서 readiness·proxy 회복을 확인했을 뿐 진행 중인 room,
transaction, browser와 다중 instance 복구를 증명하지 않습니다.

## 문서 자체의 검증 범위

이 문서에 typecheck, test, build, smoke, E2E, load, fault와 service 실행 명령이
적혀 있다는 사실만으로 실행 결과가 되지는 않습니다. 문서 계약 검사는 다섯 engineering 문서의 제목과 선택한 핵심 용어·검증 명령을
정적으로 확인합니다. Link·경로·symbol 전체를 포괄하는 검사는 아닙니다.
각 명령의 성공 여부와 실행 환경은 해당 검증 결과에서 별도로 확인해야 합니다.
