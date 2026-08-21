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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

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
| 직전 관련 상태 | [직전 관련 상태에 해당하는 exact SHA 근거를 작성합니다.] |
| 해결하려던 문제 | [해결하려던 문제에 해당하는 exact SHA 근거를 작성합니다.] |
| 핵심 결정 | [핵심 결정에 해당하는 exact SHA 근거를 작성합니다.] |
| 입력 → 상태 전이 → 출력 | [입력 → 상태 전이 → 출력에 해당하는 exact SHA 근거를 작성합니다.] |
| ownership/lifetime/cleanup | [ownership/lifetime/cleanup에 해당하는 exact SHA 근거를 작성합니다.] |
| failure/rollback/retry | [failure/rollback/retry에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하는 것 | [보장하는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 보장하지 않는 것 | [보장하지 않는 것에 해당하는 exact SHA 근거를 작성합니다.] |
| 후속 연결 | [후속 연결에 해당하는 exact SHA 근거를 작성합니다.] |

#### 최소 코드 근거

[설계 결정, 상태 전이, ownership 또는 failure path를 이해하는 데 필요한 경우에만 exact SHA의 짧은 코드 근거를 기록합니다. 필요하지 않으면 그 이유를 작성합니다.]

비교 기준:
- 직전 관련 SHA: `4b43a284e637` — `feat(api): 실행 환경과 service bootstrap 구성`

## 6. Invariant evolution

| 단계 | 관련 SHA | 기록 |
| --- | --- | --- |
| Workspace 공통 실행 기준 | `b625c4f9dfdc` | [해당 단계에서 invariant가 도입·확장·수정·검증된 근거를 작성합니다.] |
| 공유 표현 owner | `7753ad1fafaf` → `573d11acb75e` → `41471c2c2d55` | [해당 단계에서 invariant가 도입·확장·수정·검증된 근거를 작성합니다.] |
| Persistence import와 lifecycle | `f77297697c66` → `1140fb868714` → `9277572765e7` | [해당 단계에서 invariant가 도입·확장·수정·검증된 근거를 작성합니다.] |
| HTTP composition root | `51484e00a1c2` → `4b43a284e637` | [해당 단계에서 invariant가 도입·확장·수정·검증된 근거를 작성합니다.] |
| Browser package 소비 | `f5c151c7cc7d` | [해당 단계에서 invariant가 도입·확장·수정·검증된 근거를 작성합니다.] |

## 7. Failure → Fix → Test 관계

| Failure 또는 불충분한 상태 | Fix/구현 SHA | Test 또는 후속 증거 |
| --- | --- | --- |
| [이전 failure 또는 불충분한 상태를 작성합니다.] | `1140fb868714` | [fix가 만든 invariant와 test/후속 evidence를 작성합니다.] |
| [이전 failure 또는 불충분한 상태를 작성합니다.] | `9277572765e7` | [fix가 만든 invariant와 test/후속 evidence를 작성합니다.] |
| [이전 failure 또는 불충분한 상태를 작성합니다.] | `4b43a284e637` | [fix가 만든 invariant와 test/후속 evidence를 작성합니다.] |

## 8. Ownership·state·responsibility 변화

| Owner | 최종 책임 | 명시적 비책임 |
| --- | --- | --- |
| 루트 workspace | [최종 책임을 exact SHA로 작성합니다.] | [소유하지 않는 책임을 작성합니다.] |
| `@pong-pong/shared` | [최종 책임을 exact SHA로 작성합니다.] | [소유하지 않는 책임을 작성합니다.] |
| `@pong-pong/db` | [최종 책임을 exact SHA로 작성합니다.] | [소유하지 않는 책임을 작성합니다.] |
| `apps/api` composition root | [최종 책임을 exact SHA로 작성합니다.] | [소유하지 않는 책임을 작성합니다.] |
| `apps/web` | [최종 책임을 exact SHA로 작성합니다.] | [소유하지 않는 책임을 작성합니다.] |

## 9. Thread 최종 상태

- [마지막 SHA 기준 architecture와 owner를 작성합니다.]
- [최종 invariant와 남은 non-guarantee를 작성합니다.]
- [다른 category로 넘기는 책임을 작성합니다.]

### 실행 검증 기록

- [실제로 실행한 exact SHA·command·결과를 작성합니다. 실행하지 못했다면 code inspection과 환경 제한을 구분해 작성합니다.]

## 10. 최종 실행 흐름

1. [첫 caller 또는 입력 경계를 작성합니다.]
2. [검증·상태 전이·resource 획득 순서를 작성합니다.]
3. [callee·output·failure 분기를 작성합니다.]
4. [cleanup 또는 최종 owner를 작성합니다.]

## 11. 학습 완료 확인

- [ ] 모든 Commit map SHA의 historical code를 확인했습니다.
- [ ] parent/직전 관련 상태와 현재 SHA를 구분했습니다.
- [ ] fix의 이전 가정·root cause·corrected invariant를 연결했습니다.
- [ ] test가 통과하는 production path와 비증명 범위를 구분했습니다.
- [ ] ownership/lifetime/cleanup과 failure path를 기록했습니다.
- [ ] 실행 evidence와 code inspection을 구분했습니다.
- [ ] 마지막 SHA 기준 최종 flow와 non-guarantee를 설명할 수 있습니다.
