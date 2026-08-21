# Workspace·package·composition 경계

- 카테고리: `01-foundations-and-api-boundaries` — 애플리케이션 기반과 API 경계
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`

## 1. Thread 목표

단일 저장소가 shared, database, API, web package로 분리되고 application bootstrap이 각 dependency의 생성·초기화·종료 책임을 조립하는 실제 순서를 복원합니다.

이 문서는 Phase 1 category audit 후 동결된 scaffold를 기준으로 exact SHA의 구현 발전을 복원합니다.

### 직접 연결되는 불변식

- workspace dependency는 root → package command 위임과 `shared`/DB → API/web의 단방향 소비로 구성됩니다.
- shared package는 transport representation을 소유하지만 persistence driver와 browser/runtime implementation을 포함하지 않습니다.
- PostgreSQL pool과 Kysely client는 repository가 소유하고 composition root는 backend 선택·초기화·종료 호출을 소유합니다.
- web application은 shared TypeScript source를 transpile하되 DB implementation을 browser runtime에 포함하지 않습니다.

## 2. 핵심 질문

- 실제 역사에서 compile-time DTO와 game contract가 DB/API/web package보다 먼저 도입된 이유는 무엇입니까?
- DB package가 dependency scaffold에서 import 가능 migration boundary, repository lifecycle로 발전하는 단계는 무엇입니까?
- `apps/api/src/index.ts`가 생성하는 object와 각 object가 내부적으로 소유하는 resource를 구분할 수 있습니까?
- 초기 bootstrap이 정상 close에서 보장하는 것과 startup 초기화 실패에서 아직 보장하지 않는 것은 무엇입니까?

## 3. 완료 기준

- Commit map의 모든 SHA를 지정 브랜치 ancestry에서 확인합니다.
- 각 SHA의 parent 또는 직전 관련 SHA와 비교해 변경 전후 상태를 구분합니다.
- 파일, symbol, caller/callee, 상태 mutation, failure branch, cleanup을 actual historical code로 기록합니다.
- Fix는 이전 가정과 root cause를, test는 production path와 증명/비증명 범위를 연결합니다.
- S/A/B/C 중요도에 맞춰 설명 깊이를 다르게 유지합니다.
- 실행하지 않은 command 결과를 작성하지 않으며 code inspection과 runtime evidence를 구분합니다.
- 마지막 SHA까지만 사용해 Thread 최종 owner, invariant, execution flow를 작성합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Thread 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `b625c4f9dfdc` | `chore(workspace): pnpm 모노레포 경계 구성` | B | PERSISTENCE | 루트 명령과 `apps/*`, `packages/*` workspace를 만들고 공통 TypeScript 기준을 둡니다. |
| 2 | `7753ad1fafaf` | `chore(shared): 공유 패키지 경계 구성` | B | PROTOCOL | API와 browser가 함께 소비할 `@pong-pong/shared` workspace를 독립 package로 만듭니다. |
| 3 | `573d11acb75e` | `feat(shared): 사용자와 서비스 DTO 정의` | B | PERSISTENCE, TOURNAMENT, WEB | 사용자·경기·대시보드·친구·채팅·토너먼트의 초기 compile-time DTO와 공개/세션 개인정보 경계를 정의합니다. |
| 4 | `41471c2c2d55` | `feat(shared): 퐁 시뮬레이션 계약 추가` | B | SIMULATION, REALTIME, WEB | 서버 simulation과 browser renderer가 공유할 geometry·timing·snapshot·finished-result 계약을 정의합니다. |
| 5 | `f77297697c66` | `chore(db): PostgreSQL 패키지 경계 구성` | B | PERSISTENCE | PostgreSQL, Kysely, pg 의존성을 API와 분리한 `@pong-pong/db` workspace를 만듭니다. |
| 6 | `1140fb868714` | `feat(db): migration 실행 경계 구성` | B | PERSISTENCE | DB package를 import 가능하게 만들고 초기 schema SQL을 runtime에서 실행할 entry로 노출합니다. |
| 7 | `9277572765e7` | `feat(db): 저장소 lifecycle 구성` | B | PERSISTENCE, OPERATIONS | PostgreSQL과 memory implementation을 공통 `AppRepository` lifecycle 뒤에 두고 생성·초기화·종료 owner를 정의합니다. |
| 8 | `51484e00a1c2` | `chore(api): Fastify 패키지 경계 구성` | B | AUTH, PROTOCOL, REALTIME | Fastify HTTP·cookie·CORS·WebSocket과 shared/DB dependency를 가진 API workspace를 구성합니다. |
| 9 | `4b43a284e637` | `feat(api): 실행 환경과 service bootstrap 구성` | B | PERSISTENCE, OPERATIONS | 환경을 읽고 repository를 선택·초기화한 뒤 Fastify를 시작하고 종료 시 repository를 닫는 composition root를 도입합니다. |
| 10 | `f5c151c7cc7d` | `chore(web): Next.js runtime 경계 구성` | B | PROTOCOL, PERSISTENCE, WEB | Next.js browser application workspace와 shared source transpilation 경계를 구성합니다. |

## 5. Commit별 학습 기록

### 5.1. `chore(workspace): pnpm 모노레포 경계 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `b625c4f9dfdc` |
| Importance | B |
| Tags | PERSISTENCE |
| Source에서 확정된 역할 | 루트 명령과 `apps/*`, `packages/*` workspace를 만들고 공통 TypeScript 기준을 둡니다. |

#### 해당 SHA에서 확인할 실제 코드

- 루트 `package.json`, `pnpm-workspace.yaml`, `Makefile`, `tsconfig.base.json`에서 workspace glob과 recursive command를 확인합니다.
- 각 package가 자체 command를 유지하면서 루트 `build`와 `typecheck`가 어떤 순서로 위임되는지 확인합니다.
- ES2022, module resolution, strictness가 이후 package 설정의 공통 기준이 되는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 직전 root에는 프로젝트 설명만 있었고 실행 애플리케이션과 재사용 package를 묶는 package manager·compiler 기준이 없었습니다. |
| 해결하려던 문제 | 하나의 저장소에서 여러 실행 단위와 라이브러리를 추가하면 설치·검증 명령과 TypeScript 의미가 package별로 갈라질 수 있었습니다. |
| 핵심 결정 | `apps/*`와 `packages/*`를 pnpm workspace로 선언하고 루트 script와 Make target이 각 workspace 명령을 재귀 호출하도록 했습니다. |
| 입력 → 상태 전이 → 출력 | 개발자가 루트 명령을 실행하면 pnpm이 각 workspace의 `build` 또는 `typecheck`를 호출하고 결과를 루트 종료 상태로 모읍니다. |
| ownership/lifetime/cleanup | 루트가 package 목록과 공통 compiler 기준을 소유하고, 개별 workspace는 자신의 dependency와 명령을 소유합니다. 이 SHA에는 장기 실행 resource가 없습니다. |
| failure/rollback/retry | 한 workspace 명령이 실패하면 recursive command 전체가 실패합니다. 자동 rollback이나 부분 성공 캐시는 정의하지 않습니다. |
| 보장하는 것 | 새 package를 정해진 glob 아래 추가하면 공통 설치·검증 경로에 참여할 수 있습니다. |
| 보장하지 않는 것 | 아직 실제 `shared`, DB, API, web package나 package 간 dependency 방향은 구현하지 않습니다. |
| 후속 연결 | `7753ad1fafaf`부터 각 workspace가 실제 책임을 획득합니다. |

#### 최소 코드 근거

`b625c4f9dfdc`의 `pnpm-workspace.yaml`, 루트 `package.json`, `tsconfig.base.json`이 근거입니다. 별도 코드 발췌 없이 설정 항목 자체로 충분합니다.

비교 기준:
- 이 commit의 parent와 비교합니다.
- 다음 관련 SHA: `7753ad1fafaf` — `chore(shared): 공유 패키지 경계 구성`

### 5.2. `chore(shared): 공유 패키지 경계 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `7753ad1fafaf` |
| Importance | B |
| Tags | PROTOCOL |
| Source에서 확정된 역할 | API와 browser가 함께 소비할 `@pong-pong/shared` workspace를 독립 package로 만듭니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/shared/package.json`의 `name`, `exports`, Zod dependency와 package-local script를 확인합니다.
- `packages/shared/tsconfig.json`이 root compiler policy를 확장하는지 확인합니다.
- 루트 path mapping이 source entry를 직접 가리키며 prebuild 없이 어떤 소비 조건을 요구하는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | workspace 골격은 있었지만 둘 이상의 애플리케이션이 공유할 contract owner는 없었습니다. |
| 해결하려던 문제 | API와 web이 같은 타입을 별도로 정의하면 transport shape와 validation rule이 빠르게 달라질 수 있었습니다. |
| 핵심 결정 | `@pong-pong/shared`를 source entry와 package-local typecheck를 가진 독립 workspace로 추가하고 Zod를 runtime dependency로 선언했습니다. |
| 입력 → 상태 전이 → 출력 | consumer import가 root path mapping을 통해 `packages/shared/src/index.ts`로 해석되고 TypeScript가 같은 source를 검사합니다. |
| ownership/lifetime/cleanup | shared package가 공통 contract source를 소유합니다. 소비 애플리케이션은 해당 source를 transpile할 책임을 아직 명시적으로 해결해야 합니다. |
| failure/rollback/retry | package build는 `tsc --noEmit`이므로 배포 JavaScript artifact를 만들지 않습니다. 소비자가 TS source를 처리하지 못하면 runtime import는 실패할 수 있습니다. |
| 보장하는 것 | 공유 계약을 한 package에서 정의하고 두 애플리케이션이 같은 symbol을 import할 기반을 만듭니다. |
| 보장하지 않는 것 | 아직 DTO나 runtime schema 자체는 없으며 순환 dependency를 자동 검출하는 별도 규칙도 없습니다. |
| 후속 연결 | `573d11acb75e`와 `41471c2c2d55`가 실제 공유 표현을 추가합니다. |

#### 최소 코드 근거

`packages/shared/package.json`, `packages/shared/tsconfig.json`, root path mapping을 확인했습니다.

비교 기준:
- 직전 관련 SHA: `b625c4f9dfdc` — `chore(workspace): pnpm 모노레포 경계 구성`
- 다음 관련 SHA: `573d11acb75e` — `feat(shared): 사용자와 서비스 DTO 정의`

### 5.3. `feat(shared): 사용자와 서비스 DTO 정의`

| 항목 | 값 |
| --- | --- |
| SHA | `573d11acb75e` |
| Importance | B |
| Tags | PERSISTENCE, TOURNAMENT, WEB |
| Source에서 확정된 역할 | 사용자·경기·대시보드·친구·채팅·토너먼트의 초기 compile-time DTO와 공개/세션 개인정보 경계를 정의합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/shared/src/http.ts`의 `PublicUser`, `SessionUser` 및 서비스 DTO를 비교합니다.
- email, online, 날짜 문자열이 storage row나 JavaScript `Date` 대신 transport 표현으로 정의되는지 확인합니다.
- `packages/shared/src/index.ts`가 해당 계약을 외부에 노출하는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | shared package는 비어 있었고 API·DB·browser가 합의할 사용자 및 서비스 응답 shape가 없었습니다. |
| 해결하려던 문제 | 각 계층이 필드 이름, nullable 여부, 개인정보 노출 범위를 독자적으로 선택할 위험이 있었습니다. |
| 핵심 결정 | 공개 사용자는 email을 제외하고 `SessionUser`만 이를 확장하도록 하며, presence와 시간 값을 transport 친화적 필드로 표현했습니다. |
| 입력 → 상태 전이 → 출력 | producer가 DTO shape를 구성하고 consumer의 TypeScript가 동일 interface를 기준으로 필드 접근을 검사합니다. |
| ownership/lifetime/cleanup | shared package가 외부 표현을 소유하지만 값의 생성과 수명은 API·repository가 소유합니다. `online`은 영속 row가 아니라 runtime context입니다. |
| failure/rollback/retry | compile-time interface이므로 잘못된 JSON이나 untyped repository 결과를 runtime에서 거부하지 않습니다. |
| 보장하는 것 | public/session privacy 차이와 기본 서비스 aggregate의 필드 이름을 한 곳에 고정합니다. |
| 보장하지 않는 것 | 값 범위, unknown field, JSON input은 검증하지 않으며 persistence schema나 상태 전이도 구현하지 않습니다. |
| 후속 연결 | 후속 HTTP runtime contract 커밋들이 같은 표현을 Zod schema로 교체합니다. |

#### 최소 코드 근거

`packages/shared/src/http.ts`의 `PublicUser`와 이를 확장한 `SessionUser`가 개인정보 차이를 코드로 드러냅니다.

비교 기준:
- 직전 관련 SHA: `7753ad1fafaf` — `chore(shared): 공유 패키지 경계 구성`
- 다음 관련 SHA: `41471c2c2d55` — `feat(shared): 퐁 시뮬레이션 계약 추가`

### 5.4. `feat(shared): 퐁 시뮬레이션 계약 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `41471c2c2d55` |
| Importance | B |
| Tags | SIMULATION, REALTIME, WEB |
| Source에서 확정된 역할 | 서버 simulation과 browser renderer가 공유할 geometry·timing·snapshot·finished-result 계약을 정의합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/shared/src/game.ts`의 court, paddle, ball, score, tick 상수를 확인합니다.
- `GameSnapshot`이 phase, tick, score, player, server time을 모두 포함하는지 확인합니다.
- 계약이 physics 실행이나 mutable room state를 포함하지 않고 serialization boundary에 머무는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | 서비스 DTO는 있었지만 game server와 browser가 사용할 공통 좌표계·snapshot shape는 없었습니다. |
| 해결하려던 문제 | 서버와 renderer가 서로 다른 크기, tick rate, phase 이름을 사용하면 같은 경기 상태를 다르게 해석할 수 있었습니다. |
| 핵심 결정 | 고정 geometry와 timing 상수, 제한된 paddle direction, 완전한 snapshot 및 finished result 타입을 shared에 정의했습니다. |
| 입력 → 상태 전이 → 출력 | 서버가 shared shape의 snapshot을 만들고 browser가 같은 상수와 필드를 사용해 렌더링하도록 dependency 방향을 정합니다. |
| ownership/lifetime/cleanup | 계약만 shared가 소유하며 실제 simulation state, room lifecycle, socket은 이후 API subsystem이 소유합니다. |
| failure/rollback/retry | 이 SHA에는 runtime parser, physics, ordering, retry 또는 cleanup이 없습니다. |
| 보장하는 것 | server와 browser가 동일한 직렬화 표현과 좌표계를 참조할 수 있습니다. |
| 보장하지 않는 것 | snapshot이 authoritative하다는 실행 보장, 상태 전이의 합법성, 네트워크 순서 보장은 아직 없습니다. |
| 후속 연결 | 후속 realtime category가 이 계약 위에 simulation·room·transport를 구현합니다. |

#### 최소 코드 근거

`packages/shared/src/game.ts`의 상수와 `GameSnapshot`/finished result type이 근거입니다.

비교 기준:
- 직전 관련 SHA: `573d11acb75e` — `feat(shared): 사용자와 서비스 DTO 정의`
- 다음 관련 SHA: `f77297697c66` — `chore(db): PostgreSQL 패키지 경계 구성`

### 5.5. `chore(db): PostgreSQL 패키지 경계 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `f77297697c66` |
| Importance | B |
| Tags | PERSISTENCE |
| Source에서 확정된 역할 | PostgreSQL, Kysely, pg 의존성을 API와 분리한 `@pong-pong/db` workspace를 만듭니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/package.json`에서 shared·Kysely·pg dependency와 tooling을 확인합니다.
- `packages/db/tsconfig.json`이 root compiler policy를 상속하는지 확인합니다.
- 이 SHA에 repository implementation이나 export surface가 아직 없는지 구분합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | shared contract는 있었지만 persistence driver를 둘 위치와 API의 dependency 방향은 정해지지 않았습니다. |
| 해결하려던 문제 | Fastify route가 직접 `pg`나 Kysely를 소유하면 transport와 storage lifecycle이 결합될 수 있었습니다. |
| 핵심 결정 | `@pong-pong/db` workspace를 만들고 database driver·query builder dependency를 그 package에 한정했습니다. |
| 입력 → 상태 전이 → 출력 | 향후 API는 DB package의 exported operation만 import하고 driver-specific code는 packages/db 내부에서 실행하도록 방향을 잡았습니다. |
| ownership/lifetime/cleanup | DB package가 persistence dependency를 소유하지만 아직 pool, client, close owner는 없습니다. |
| failure/rollback/retry | 실행 entry와 export가 없으므로 이 상태만으로 API가 DB 기능을 사용할 수 없습니다. |
| 보장하는 것 | 물리적인 package dependency 경계를 만들고 transport package에서 driver dependency를 제거할 수 있습니다. |
| 보장하지 않는 것 | repository abstraction, migration 실행, transaction 및 실제 row mapping은 보장하지 않습니다. |
| 후속 연결 | `1140fb868714`이 import·migration 실행 경계를, `9277572765e7`이 lifecycle을 추가합니다. |

#### 최소 코드 근거

`packages/db/package.json`과 package-local TypeScript 설정이 근거입니다.

비교 기준:
- 직전 관련 SHA: `41471c2c2d55` — `feat(shared): 퐁 시뮬레이션 계약 추가`
- 다음 관련 SHA: `1140fb868714` — `feat(db): migration 실행 경계 구성`

### 5.6. `feat(db): migration 실행 경계 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `1140fb868714` |
| Importance | B |
| Tags | PERSISTENCE |
| Source에서 확정된 역할 | DB package를 import 가능하게 만들고 초기 schema SQL을 runtime에서 실행할 entry로 노출합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/package.json`의 `exports`, build/typecheck script를 확인합니다.
- `packages/db/src/migrations.ts`의 `initialMigrationSql`과 기존 SQL file 사이 중복 소유 상태를 확인합니다.
- `tsconfig.base.json`의 `@pong-pong/db` path mapping이 consumer import를 가능하게 하는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | DB workspace는 dependency만 있었고 consumer가 import할 package export나 실행 가능한 schema 초기화 값이 없었습니다. |
| 해결하려던 문제 | API bootstrap이 storage package를 조립하려면 stable package entry와 code에서 호출 가능한 migration boundary가 필요했습니다. |
| 핵심 결정 | package export와 root alias를 추가하고 초기 schema를 `initialMigrationSql` 문자열로 export했습니다. |
| 입력 → 상태 전이 → 출력 | consumer가 `@pong-pong/db`를 import하고 이후 repository가 SQL string을 Kysely에 제출할 수 있게 됩니다. |
| ownership/lifetime/cleanup | DB package가 schema bootstrap text를 소유하지만 이 SHA에는 pool이나 migrator lifecycle owner가 없습니다. |
| failure/rollback/retry | 독립 SQL file과 문자열이 중복되어 자동 동기화되지 않으며 versioned migration registry도 없습니다. |
| 보장하는 것 | API가 directory 내부 경로에 의존하지 않고 DB package를 import할 수 있습니다. |
| 보장하지 않는 것 | 실제 schema 실행, seed, rollback, migration version 추적은 보장하지 않습니다. |
| 후속 연결 | `9277572765e7`의 `ensureSeedData`가 이 SQL을 실행합니다. |

#### 최소 코드 근거

`packages/db/package.json`, `packages/db/src/migrations.ts`, `tsconfig.base.json`의 세 변경을 함께 확인했습니다.

비교 기준:
- 직전 관련 SHA: `f77297697c66` — `chore(db): PostgreSQL 패키지 경계 구성`
- 다음 관련 SHA: `9277572765e7` — `feat(db): 저장소 lifecycle 구성`

### 5.7. `feat(db): 저장소 lifecycle 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `9277572765e7` |
| Importance | B |
| Tags | PERSISTENCE, OPERATIONS |
| Source에서 확정된 역할 | PostgreSQL과 memory implementation을 공통 `AppRepository` lifecycle 뒤에 두고 생성·초기화·종료 owner를 정의합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.ts`의 `AppRepository`, factory, `PostgresRepository`, `MemoryRepository`를 확인합니다.
- PostgreSQL factory가 `Pool`과 `Kysely`를 함께 생성하고 `close()`가 어떤 순서로 종료하는지 확인합니다.
- `ensureSeedData()`가 `initialMigrationSql`을 실행하며 memory backend는 같은 method를 no-op으로 제공하는지 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | DB package는 import 가능했지만 pool/client 생성, 초기화, 종료를 호출자가 일관되게 다룰 공통 contract가 없었습니다. |
| 해결하려던 문제 | API가 backend별 분기를 갖거나 pool을 닫지 않으면 startup/shutdown 경로마다 자원 누수가 달라질 수 있었습니다. |
| 핵심 결정 | `AppRepository`에 `ensureSeedData()`와 `close()`를 두고 PostgreSQL과 memory factory가 같은 interface를 반환하도록 했습니다. |
| 입력 → 상태 전이 → 출력 | factory가 pool과 Kysely를 생성해 repository에 넘기고, 초기화는 SQL 실행, 종료는 `db.destroy()` 후 중복 pool 종료 오류를 흡수합니다. |
| ownership/lifetime/cleanup | PostgresRepository가 pool과 Kysely의 lifetime을 소유합니다. MemoryRepository는 동일 lifecycle 호출을 허용하는 no-op owner입니다. |
| failure/rollback/retry | 초기 SQL 실행이 실패하면 이 method 자체는 예외를 전달하며 rollback이나 자동 close를 수행하지 않습니다. |
| 보장하는 것 | 상위 composition root가 backend 종류와 무관하게 동일한 초기화·종료 sequence를 사용할 수 있습니다. |
| 보장하지 않는 것 | 이 시점의 `AppRepository`에는 실제 도메인 operation이 없고 startup 중 초기화 실패 시 자동 정리는 아직 보장되지 않습니다. |
| 후속 연결 | `4b43a284e637`이 repository 선택과 app shutdown에 lifecycle을 연결합니다. |

#### 최소 코드 근거

`9277572765e7`, `packages/db/src/index.ts`:

```ts
export interface AppRepository {
  close(): Promise<void>;
  ensureSeedData(): Promise<void>;
}
```

factory가 만든 pool과 Kysely는 `PostgresRepository.close()`에서 정리됩니다.

비교 기준:
- 직전 관련 SHA: `1140fb868714` — `feat(db): migration 실행 경계 구성`
- 다음 관련 SHA: `51484e00a1c2` — `chore(api): Fastify 패키지 경계 구성`

### 5.8. `chore(api): Fastify 패키지 경계 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `51484e00a1c2` |
| Importance | B |
| Tags | AUTH, PROTOCOL, REALTIME |
| Source에서 확정된 역할 | Fastify HTTP·cookie·CORS·WebSocket과 shared/DB dependency를 가진 API workspace를 구성합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/package.json`의 Fastify plugin, shared, DB, Zod, ws dependency를 확인합니다.
- API package가 DB driver를 직접 의존하지 않고 `@pong-pong/db`만 소비하는지 확인합니다.
- `apps/api/tsconfig.json`과 script가 아직 실행 entry를 포함하지 않는 초기 경계인지 구분합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | shared와 DB package는 있었지만 HTTP service를 소유할 executable workspace가 없었습니다. |
| 해결하려던 문제 | HTTP, cookie, CORS, WebSocket을 root나 DB package에 섞지 않고 별도 application owner가 필요했습니다. |
| 핵심 결정 | `apps/api`를 만들고 transport dependency와 내부 workspace dependency를 선언했습니다. |
| 입력 → 상태 전이 → 출력 | 향후 `buildApp`와 process entry가 이 package 안에서 shared contract와 repository를 조립하도록 dependency 방향을 정했습니다. |
| ownership/lifetime/cleanup | API package가 transport runtime을 소유할 예정이지만 이 SHA에는 listener, socket, cleanup handle이 없습니다. |
| failure/rollback/retry | package 설정만 있으므로 HTTP endpoint나 인증·오류 동작은 아직 없습니다. |
| 보장하는 것 | Fastify application code가 들어갈 독립 경계와 필요한 dependency 집합을 고정합니다. |
| 보장하지 않는 것 | 실행 가능 service, configuration, repository selection을 보장하지 않습니다. |
| 후속 연결 | `4b43a284e637`이 process bootstrap을 추가하고 Thread 2의 `1779df300611`이 route를 구현합니다. |

#### 최소 코드 근거

`apps/api/package.json`과 package TypeScript 설정이 근거입니다.

비교 기준:
- 직전 관련 SHA: `9277572765e7` — `feat(db): 저장소 lifecycle 구성`
- 다음 관련 SHA: `4b43a284e637` — `feat(api): 실행 환경과 service bootstrap 구성`

### 5.9. `feat(api): 실행 환경과 service bootstrap 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `4b43a284e637` |
| Importance | B |
| Tags | PERSISTENCE, OPERATIONS |
| Source에서 확정된 역할 | 환경을 읽고 repository를 선택·초기화한 뒤 Fastify를 시작하고 종료 시 repository를 닫는 composition root를 도입합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/env.ts`의 default port, database URL, origin, session secret 처리 방식을 확인합니다.
- `apps/api/src/index.ts`에서 repository factory 선택 → `ensureSeedData` → `buildApp` → `listen` 순서를 확인합니다.
- Fastify `onClose`와 listen failure catch가 `repo.close()`를 호출하는 경로 및 startup 초기화 실패의 미보장 범위를 확인합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | API workspace와 repository lifecycle은 있었지만 process가 어떤 backend를 만들고 언제 닫는지 조립하는 owner가 없었습니다. |
| 해결하려던 문제 | repository 선택과 listener startup이 분산되면 memory/PostgreSQL 분기와 cleanup이 여러 entry에서 달라질 수 있었습니다. |
| 핵심 결정 | `index.ts`를 composition root로 두어 환경 읽기, repository 생성, seed/schema 초기화, app 생성, listener 시작을 한 순서로 모았습니다. |
| 입력 → 상태 전이 → 출력 | `DATABASE_URL` 유무로 backend를 선택하고 초기화한 뒤 app을 구성합니다. app close hook과 listen 실패 catch가 repository close를 호출합니다. |
| ownership/lifetime/cleanup | process entry가 repository와 Fastify app의 조립을 소유하고, repository 자체가 pool lifetime을 소유합니다. 정상 shutdown에서는 app close가 repository close로 이어집니다. |
| failure/rollback/retry | `ensureSeedData()`가 `try` 전에 실패하면 catch의 `repo.close()`가 실행되지 않습니다. port 값도 `Number` 변환 후 별도 검증하지 않습니다. |
| 보장하는 것 | 정상 listen 실패와 Fastify close 경로에서 persistence 자원을 닫는 composition rule을 제공합니다. |
| 보장하지 않는 것 | production에서 memory fallback을 막지 않고, 약한 default secret을 허용하며, signal 기반 graceful shutdown은 아직 없습니다. |
| 후속 연결 | Runtime Thread의 `f801ccd09cf0`·`eb675ef74af3`가 환경별 fail-closed rule을 강화합니다. |

#### 최소 코드 근거

`4b43a284e637`, `apps/api/src/index.ts`의 핵심 순서는 다음과 같습니다.

```ts
const repo = env.databaseUrl
  ? createPostgresRepository(env.databaseUrl)
  : createMemoryRepository();
await repo.ensureSeedData();
app.addHook("onClose", async () => repo.close());
```

비교 기준:
- 직전 관련 SHA: `51484e00a1c2` — `chore(api): Fastify 패키지 경계 구성`
- 다음 관련 SHA: `f5c151c7cc7d` — `chore(web): Next.js runtime 경계 구성`

### 5.10. `chore(web): Next.js runtime 경계 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `f5c151c7cc7d` |
| Importance | B |
| Tags | PROTOCOL, PERSISTENCE, WEB |
| Source에서 확정된 역할 | Next.js browser application workspace와 shared source transpilation 경계를 구성합니다. |

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/package.json`, `next.config.mjs`, `tsconfig.json`에서 Next.js runtime과 build/typecheck command를 확인합니다.
- `transpilePackages`가 `@pong-pong/shared` source import를 처리하는지 확인합니다.
- web package dependency에 DB implementation이 직접 포함되지 않는지 확인하고 path alias와 실제 package dependency를 구분합니다.

#### 학습자 기록

| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태 | API 실행 경계는 있었지만 shared contract를 소비할 browser application workspace가 없었습니다. |
| 해결하려던 문제 | shared가 TypeScript source를 직접 export하므로 Next.js가 이를 외부 precompiled package처럼 처리하면 build가 실패할 수 있었습니다. |
| 핵심 결정 | `apps/web`을 Next.js application으로 만들고 `@pong-pong/shared`를 workspace dependency와 transpile 대상에 추가했습니다. |
| 입력 → 상태 전이 → 출력 | Next build가 web source와 shared source를 함께 transpile하고 browser application은 shared type/constant를 import할 수 있습니다. |
| ownership/lifetime/cleanup | web workspace가 browser runtime/build를 소유합니다. DB implementation은 server-side package에 남고 browser가 pool lifecycle을 소유하지 않습니다. |
| failure/rollback/retry | 이 SHA에는 page, HTTP client, runtime schema parse 또는 network cleanup이 없습니다. |
| 보장하는 것 | browser code와 API/DB package를 물리적으로 분리하면서 shared source를 소비할 build 경로를 제공합니다. |
| 보장하지 않는 것 | package path alias만으로 런타임 접근 제한을 강제하지 않으며 실제 UI·API adapter는 구현하지 않습니다. |
| 후속 연결 | 후속 browser category가 화면·HTTP client·socket owner를 추가합니다. |

#### 최소 코드 근거

`apps/web/next.config.mjs`의 `transpilePackages: ["@pong-pong/shared"]`와 package dependency가 핵심 근거입니다.

비교 기준:
- 직전 관련 SHA: `4b43a284e637` — `feat(api): 실행 환경과 service bootstrap 구성`

## 6. Invariant evolution

| 단계 | 관련 SHA | 기록 |
| --- | --- | --- |
| Workspace 공통 실행 기준 | `b625c4f9dfdc` | apps/packages glob, recursive command, 공통 TypeScript policy가 도입됩니다. |
| 공유 표현 owner | `7753ad1fafaf` → `573d11acb75e` → `41471c2c2d55` | 독립 shared package에 서비스 DTO와 game serialization contract가 순서대로 들어갑니다. |
| Persistence import와 lifecycle | `f77297697c66` → `1140fb868714` → `9277572765e7` | driver package에서 importable migration boundary, 공통 repository lifecycle로 발전합니다. |
| HTTP composition root | `51484e00a1c2` → `4b43a284e637` | API package가 repository를 선택·초기화하고 app close와 storage close를 연결합니다. |
| Browser package 소비 | `f5c151c7cc7d` | Next.js가 shared source를 transpile하며 browser runtime을 별도 owner로 둡니다. |

## 7. Failure → Fix → Test 관계

| Failure 또는 불충분한 상태 | Fix/구현 SHA | Test 또는 후속 증거 |
| --- | --- | --- |
| DB package를 만들었지만 consumer import가 없음 | `1140fb868714` | package export/path alias와 executable migration text를 추가합니다. |
| pool/client lifecycle을 상위가 backend별로 알아야 함 | `9277572765e7` | `AppRepository` factory와 공통 `ensureSeedData`/`close`를 도입합니다. |
| 생성·초기화·listen·close가 분리됨 | `4b43a284e637` | composition root가 repository와 Fastify의 lifecycle을 연결합니다. |

## 8. Ownership·state·responsibility 변화

| Owner | 최종 책임 | 명시적 비책임 |
| --- | --- | --- |
| 루트 workspace | workspace 목록, 공통 compiler policy, recursive verification | 각 package의 내부 runtime state를 소유하지 않습니다. |
| `@pong-pong/shared` | 서비스·game transport representation | DB row, Fastify app, browser state를 소유하지 않습니다. |
| `@pong-pong/db` | driver dependency, pool/Kysely, repository lifecycle | HTTP request와 browser rendering을 소유하지 않습니다. |
| `apps/api` composition root | 환경 읽기, backend 선택, 초기화, app/listener 연결, close 호출 | pool 세부 구현은 repository에 위임합니다. |
| `apps/web` | Next.js build/runtime과 shared source transpilation | DB driver나 server resource를 소유하지 않습니다. |

## 9. Thread 최종 상태

- 최종 SHA 기준으로 root는 공통 개발 명령을 제공하고 shared, DB, API, web은 별도 workspace입니다.
- 공통 contract source와 persistence implementation이 분리되며 API는 두 package를 조립합니다.
- repository가 storage resource를 소유하고 API process entry가 생성·초기화·종료 호출 순서를 소유합니다.
- 초기 bootstrap에는 production fail-closed와 startup 초기화 실패 cleanup 같은 후속 보강이 아직 포함되지 않습니다.

### 실행 검증 기록

- Source inspection: GitHub connector로 Commit map의 exact SHA diff와 필요한 historical file을 조회했습니다.
- Branch validation: branch-local `commit/commit-importance.md`가 선언한 433개 선형 이력에서 모든 참조 SHA와 source classification을 대조했고, 가장 이른 참조 `b625c4f9dfdc`는 branch HEAD 비교에서 merge base가 동일 SHA임을 확인했습니다.
- 실제 실행 시도: `git clone --branch web/ft_transcendence --single-branch https://github.com/seungwoo7050/42-archive.git /tmp/ft-transcendence-audit`
- 결과: exit status 128, `Could not resolve host: github.com`. 따라서 repository checkout, package install, test command는 실행하지 않았으며 runtime 결과를 주장하지 않습니다.

## 10. 최종 실행 흐름

1. 루트 command가 각 workspace command를 실행합니다.
2. API process가 `readEnv`로 설정을 읽습니다.
3. `DATABASE_URL` 유무로 memory/PostgreSQL repository를 만듭니다.
4. `repo.ensureSeedData()`로 초기 schema/data를 준비합니다.
5. `buildApp`에 repository와 origin을 주입하고 listener를 엽니다.
6. Fastify close 또는 listen failure에서 `repo.close()`를 호출합니다.
7. web build는 `@pong-pong/shared` source를 transpile해 browser bundle에서 공통 표현을 사용합니다.

## 11. 학습 완료 확인

- [x] 모든 Commit map SHA의 historical code를 확인했습니다.
- [x] parent/직전 관련 상태와 현재 SHA를 구분했습니다.
- [x] fix의 이전 가정·root cause·corrected invariant를 연결했습니다.
- [x] test가 통과하는 production path와 비증명 범위를 구분했습니다.
- [x] ownership/lifetime/cleanup과 failure path를 기록했습니다.
- [x] 실행 evidence와 code inspection을 구분했습니다.
- [x] 마지막 SHA 기준 최종 flow와 non-guarantee를 설명할 수 있습니다.
