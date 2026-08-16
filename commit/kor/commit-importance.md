# 프로젝트 중요도 프로파일

프로젝트: Pong Pong (`ft_transcendence`)
도메인: 풀스택 server-authoritative 실시간 멀티플레이어 Pong 플랫폼
주요 목적: 하나의 authoritative realtime game service를 중심으로 브라우저 기반 등록 사용자 및 transient guest Pong, matchmaking, tournament, social/admin service, durable PostgreSQL state, production-grade operation을 제공한다.
확정된 커밋 범위: `web/ft_transcendence`의 독립적이고 선형적인 전체 history다. root `72ac4c1870f`부터 head `71c5c13480f0`까지 오래된 순서에서 최신 순서로 정렬한 433개 커밋으로 구성된다. 상속된 무관한 history나 semantic merge commit은 없다.

## 핵심 기술 영역
- browser, API, persistence-facing code가 공유하는 strict, versioned HTTP/WebSocket runtime contract.
- cookie authentication, one-time hashed WebSocket ticket, 명시적 authorization, account suspension, live connection revocation, transient guest trust chain.
- deterministic Pong simulation, rating-sensitive AI, fixed-step timing, room state transition, matchmaking, reconnection, terminal match 처리.
- PostgreSQL migration, typed row mapping, concurrency control, idempotent match finalization, rating history, friendship invariant, tournament 진행.
- browser transport lifecycle, reducer-driven game state, input serialization, snapshot ordering/interpolation, React Query cache ownership 관리.
- runtime limit, heartbeat, backpressure, graceful drain, readiness, observability, fault injection, production artifact, container, CI 검증.

## 핵심 아키텍처
- `packages/shared`가 executable transport/domain contract를 소유한다. API와 web consumer는 compile-time assertion에 의존하지 않고 각 trust boundary에서 이를 parse한다.
- `PongSimulation`이 mechanics와 deterministic state transition을 소유한다. `GameHub`는 scheduling, authenticated connection, matchmaking integration, snapshot, persistence coordination, cleanup을 소유한다.
- `RoomSession`이 유효한 room lifecycle transition을 소유한다. transport callback과 rendered snapshot은 이 state를 독립적으로 정의하지 않고 반영한다.
- `Matchmaker`가 queued/reserved player identity를 소유하고, GameHub는 socket-specific timer와 client reference를 유지한다.
- `AppRepository`가 persistence를 격리하며, PostgreSQL과 memory implementation은 동일한 domain behavior를 보존해야 한다. `finalizeMatch`가 유일한 idempotent result boundary다.
- browser는 socket transport(`GameSocketClient`), state transition(reducer), React coordination(hook), presentation(page/component)을 분리한다.
- production startup, migration, readiness, draining, metrics, container orchestration은 부수적인 application code가 아니라 명시적인 lifecycle boundary다.

## 핵심 불변식
- server가 game rule, score, phase, room membership, matchmaking, persisted outcome의 유일한 authority다.
- 허용된 모든 wire message는 지원되는 versioned runtime schema를 만족한다. snapshot과 input ordering으로 state가 이전 상태로 되돌아갈 수 없다.
- 한 user는 하나의 authoritative realtime connection만 가지며, reconnect replacement는 두 번째 match를 만들거나 reserved room side를 잃지 않고 ownership을 이전한다.
- queue와 reservation membership은 하나의 owner만 가지며 leave, disconnect, rollback, drain, abandonment, failure, finalization의 모든 path에서 release된다.
- 하나의 logical match result, participant statistics, rating history, tournament progression은 atomic하고 idempotent하게 commit된다.
- durable browser session은 HttpOnly cookie로만 전달된다. raw WebSocket ticket은 short-lived, single-use이고 저장 시 hash되며, authentication 중 사용량이 제한되고 log에서 제외된다.
- suspended user는 privileged HTTP work를 계속 수행하거나 이미 열린 realtime control channel을 유지할 수 없다.
- guest identity, matchmaking pool, capability, persistence, ticket, lease, retained result는 서로 격리되고 resource bound를 가진다.
- timer, scheduler, heartbeat handle, retry work, snapshot buffer, database resource는 명시적인 single-owner cleanup 규칙을 가진다.
- draining은 새 작업을 즉시 거부하고 소유 중인 room이 bounded budget 안에서 끝나도록 허용하며, container termination grace period와 일치한다.

## 주요 엔지니어링 난점
- observable realtime protocol을 변경하지 않으면서 deterministic simulation과 connection orchestration을 분리하는 문제.
- 서로 상호작용하는 state machine 전반에서 readiness, pause, disconnect, reconnect, replacement, forfeit, retry, final cleanup을 조정하는 문제.
- retry나 concurrent database operation에서 duplicate result, rating, final, friendship row, tournament seed, admission을 방지하는 문제.
- durable session credential을 노출하지 않으면서 WebSocket을 authentication하고, early message를 보존하면서 unauthenticated buffering을 제한하는 문제.
- sequence gate, token bucket, latest-value snapshot delivery, measurable congestion, hard termination limit으로 느리거나 stale한 transport를 처리하는 문제.
- database failure, tournament-start rollback, match-finalization retry, process drain, deployment shutdown 중에도 domain correctness를 보존하는 문제.
- transient identity가 registered data, social feature, rating, unbounded in-memory resource 영역으로 넘어가지 않도록 public guest mode를 제공하는 문제.

## 실무 엔지니어링 영역
- runtime validation과 fail-closed response parsing.
- transaction boundary, row lock, uniqueness constraint, migration 안전성.
- idempotency key, retry, rollback, exactly-once observable effect 보장.
- timer, socket, pool, cache의 lifecycle ownership.
- security redaction, input/payload limit, authorization refresh, environment-specific capability 노출.
- deterministic test, PostgreSQL integration test, browser/process test, replay fixture, load threshold, fault-recovery report 작성.
- readiness, metrics cardinality, graceful shutdown, reproducible production artifact, deployment contract 검증.

## S 등급 기준
- 완성된 시스템이 사용하는 authoritative simulation, room, connection, protocol, matchmaking, authentication, persistence ownership model을 정립한다.
- 없으면 핵심 realtime game이 unsafe하거나 inconsistent하거나 non-deterministic해지거나 올바르게 복구할 수 없게 되는 invariant를 새로 만들거나 복구한다.
- atomic finalization, one-time WebSocket authentication, connection handoff, queue reservation ownership과 같은 복잡한 cross-subsystem 문제를 해결하며 이후 architecture를 결정한다.

## A 등급 기준
- concurrency control, rollback, retry, resource limit, authorization, migration safety, reconnection, failure containment, high-value regression evidence를 통해 core boundary를 크게 강화한다.
- 전체 프로젝트 설명에 반드시 필요한 정도는 아니지만, 주요 subsystem을 기존 architecture에 통합하거나 responsibility separation, deployability, operational reliability를 실질적으로 개선한다.

## 일반적인 B 등급 작업
- 이미 정립된 contract와 ownership boundary 안에서 수행하는 일반적인 feature, route, repository, UI, test, build, refactor 작업.
- 더 큰 mechanism을 구성하는 지원 단계로, 결정적인 invariant는 다른 커밋에서 정립되는 작업.

## 일반적인 C 등급 작업
- documentation-only 변경, generated lockfile, binary evidence asset, sample scaffolding, readability-only normalization, cache exclusion, fixture alignment, mechanical patch-level update.

## 프로젝트 전용 태그
REALTIME — authoritative connection, room, matchmaking, timing, delivery, recovery 관련 동작
SIMULATION — deterministic Pong mechanics, AI, input, replay 관련 동작
AUTH — authentication, authorization, suspension, ticket, cookie, guest identity, secret 처리
PROTOCOL — HTTP/WebSocket runtime schema, codec, versioning, validation, ordering contract 관련 요소
PERSISTENCE — database schema, migration, repository, transaction, idempotency, row-mapping 관련 동작
TOURNAMENT — bracket, entry, room, progression lifecycle 관련 요소
WEB — browser state, transport client, rendering, navigation, query-cache ownership 관련 요소
OPERATIONS — build, CI, deployment, readiness, shutdown, load, fault-recovery 관련 동작
OBSERVABILITY — metrics, structured logging, redaction, operational correlation 관련 요소
PERF — scheduling, latency, cadence, backpressure, benchmark 관련 동작
ARCH — 주요 responsibility 또는 ownership boundary
CORE — 중심 product mechanism
RISK — 영향도가 큰 correctness, reliability, security invariant
REFACTOR — 중요한 behavior-preserving structural change
TEST — 중요한 regression 또는 verification evidence

# 커밋 분류

| 커밋 | 커밋 제목 | 중요도 | 태그 | 요약 | 이유 |
| --- | --- | --- | --- | --- | --- |
| `72ac4c1870f1` | `docs(readme): 프로젝트 목적과 초기 개발 규약 정의` | C | - | 루트 README에 프로젝트 목적, 경계 중심 개발 규칙, 초기 저장소 구조를 정의한다. | 구현된 전체 엔지니어링 이력과 비교하면 문서 변경에 불과하며 실행 가능한 메커니즘을 정립하지 않으므로 중요도가 낮다. |
| `b625c4f9dfdc` | `chore(workspace): pnpm 모노레포 경계 구성` | B | PERSISTENCE | 저장소를 pnpm 모노레포로 구성하고 실행 애플리케이션과 재사용 라이브러리를 각각 `apps/*`와 `packages/*` 아래에 배치한다. | 프로젝트를 규정하는 메커니즘을 새로 도입하지 않고 이미 정립된 persistence 툴체인 또는 runtime path를 강화한 일반적인 지원 작업이다. |
| `310b26c0129e` | `chore(repo): 로컬 빌드 산출물 제외` | C | - | 의존성 트리, framework 및 compiler 산출물, coverage 및 browser test report, 로컬 환경 파일, 로그, 운영체제 metadata를 버전 관리에서 제외한다. | 프로젝트의 주요 엔지니어링 결정을 이해하는 데 기여가 작고 일상적인 유지보수 또는 임시 presentation scaffolding에 해당하므로 중요도가 낮다. |
| `7753ad1fafaf` | `chore(shared): 공유 패키지 경계 구성` | B | PROTOCOL | 여러 애플리케이션에서 사용하는 contract를 담는 독립 workspace로 `@pong-pong/shared`를 구성한다. | 프로젝트를 규정하는 메커니즘을 새로 도입하지 않고 이미 정립된 protocol 툴체인 또는 runtime path를 강화한 일반적인 지원 작업이다. |
| `573d11acb75e` | `feat(shared): 사용자와 서비스 DTO 정의` | B | PERSISTENCE, TOURNAMENT, WEB | API, 데이터베이스, 브라우저 구현이 이름이나 구조 면에서 서로 달라지기 전에 사용자와 초기 서비스 domain이 HTTP에서 사용하는 표준 표현을 정의한다. | 이미 정립된 persistence 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `41471c2c2d55` | `feat(shared): 퐁 시뮬레이션 계약 추가` | B | SIMULATION, REALTIME, WEB | Pong에서 공통으로 사용할 geometry, timing, lifecycle, 상태 표현을 정의한다. | 이미 정립된 simulation 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `a974f8cd9712` | `feat(shared): WebSocket 이벤트 메시지 검증` | A | PROTOCOL, SIMULATION, REALTIME | discriminated WebSocket protocol을 도입하고, client에서 들어오는 모든 message를 application handler가 처리하기 전에 runtime에서 검증한다. | 중요한 protocol 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `60c38090effc` | `test(shared): WebSocket 프로토콜 검증` | B | PROTOCOL, SIMULATION, REALTIME | 허용되는 모든 client event, 기본 queue mode, 필수 필드, 유효한 enum 값, 정확한 paddle 방향 값 범위를 table-driven test로 검증해 WebSocket 경계를 고정한다. | 이미 정립된 protocol 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `f77297697c66` | `chore(db): PostgreSQL 패키지 경계 구성` | B | PERSISTENCE | `@pong-pong/db`를 persistence workspace로 구성해 PostgreSQL 및 Kysely 의존성을 repository 작업을 사용하는 API 패키지와 분리한다. | 프로젝트를 규정하는 메커니즘을 새로 도입하지 않고 이미 정립된 persistence 툴체인 또는 runtime path를 강화한 일반적인 지원 작업이다. |
| `0e850d24406e` | `feat(db): 초기 PostgreSQL schema 정의` | B | PERSISTENCE, TOURNAMENT | identity, session, friendship, 완료된 match, chat, tournament, administrator action을 위한 초기 영속 데이터 모델을 정의한다. | 이미 정립된 persistence 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `1140fb868714` | `feat(db): migration 실행 경계 구성` | B | PERSISTENCE | database 패키지를 import 가능하게 만들고 runtime 코드에서 실행할 수 있는 schema initialization 경계를 제공한다. | 이미 정립된 persistence 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `4aa060c0b8df` | `feat(db): 사용자와 세션 row schema 정의` | B | AUTH, PERSISTENCE | users와 sessions table을 Kysely type으로 표현하고, database row에서 공유 application model로 변환하는 명시적인 mapping 경계를 도입한다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `9277572765e7` | `feat(db): 저장소 lifecycle 구성` | B | PERSISTENCE, OPERATIONS | `AppRepository`를 persistence lifecycle 경계로 도입하고 동일한 factory-level contract 뒤에 PostgreSQL 구현과 memory 구현을 제공한다. | 이미 정립된 persistence 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `fb516f723cdf` | `feat(db): 개발 사용자 seed 저장 구현` | B | PERSISTENCE | repository initialization을 실제로 사용할 수 있는 개발 dataset으로 확장하고 공통 development-login upsert를 추가한다. | 이미 정립된 persistence 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `4f65c6214321` | `feat(db): 사용자 session 저장 구현` | B | AUTH, REALTIME, PERSISTENCE | authentication 상태를 HTTP server가 아니라 persistence가 소유하도록 repository abstraction에 session 생성과 조회를 추가한다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `c5b96a06925c` | `feat(db): 프로필 조회와 변경 저장 구현` | B | PERSISTENCE | login 중심 identity access에서 public profile 조회, 인증된 profile update, active user listing까지 repository 기능을 확장한다. | 이미 정립된 persistence 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `0364c42f776b` | `feat(db): 순위 조회 구현` | B | PERSISTENCE | repository contract에 leaderboard projection을 추가한다. | 이미 정립된 persistence 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `8ab49e5f2dd4` | `feat(db): 경기 조회 row contract 정의` | B | PERSISTENCE | 영속화된 match를 위한 typed row와 mapping 경계를 정의한다. | 이미 정립된 persistence 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `c7ea1ff241c8` | `feat(db): 최근 경기와 대시보드 조회 구현` | B | PERSISTENCE | repository contract 뒤에서 최근 match와 dashboard 조회를 구현한다. | 이미 정립된 persistence 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `645e5a3c8e96` | `feat(db): 친구 관계 저장 구현` | B | PERSISTENCE | repository abstraction에 friendship 목록 조회, 요청, 수락을 추가한다. | 이미 정립된 persistence 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `38504f041a6a` | `feat(db): 경기 결과 저장 구현` | B | REALTIME, PERSISTENCE | realtime 게임 실행이 구체적인 database 구현에 의존하지 않고 하나의 domain result를 영속화할 수 있도록 repository contract에 match completion을 추가한다. | 이미 정립된 realtime 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `a6fa5a187eec` | `feat(db): 채팅 메시지 저장 구현` | B | REALTIME, PERSISTENCE | lobby와 match scope 모두에 대해 영속 chat message를 저장하도록 repository를 확장한다. | 이미 정립된 realtime 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `34c80874f13f` | `feat(db): 토너먼트 row contract 정의` | B | PERSISTENCE, TOURNAMENT | tournament를 공유 application contract로 mapping하는 데 필요한 typed persistence 표현을 정의한다. | 이미 정립된 persistence 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `9b1dabcc4bb4` | `feat(db): 토너먼트 참가 저장 구현` | B | PERSISTENCE, TOURNAMENT | 공통 repository interface를 통해 tournament 생성, 목록 조회, 참가를 구현한다. | 이미 정립된 persistence 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `fa6e7de259cf` | `feat(db): 관리자 상태 변경 저장 구현` | B | AUTH, PERSISTENCE | repository 경계에 administrator용 사용자 목록 조회와 ban 상태 변경을 추가한다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `dea169d587a3` | `feat(db): 데이터베이스 CLI 명령 연결` | B | PERSISTENCE | migration/seed 설정과 검증을 package-level CLI command로 실행할 수 있게 repository initialization을 노출한다. | 이미 정립된 persistence 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `6509e32ba95d` | `test(db): 메모리 저장소 흐름 검증` | B | PERSISTENCE, TOURNAMENT, TEST | 공유 repository contract의 in-memory 구현에 behavioral coverage를 추가한다. | 이미 정립된 persistence 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `51484e00a1c2` | `chore(api): Fastify 패키지 경계 구성` | B | AUTH, PROTOCOL, REALTIME | Fastify, cookie 및 CORS 지원, WebSocket integration, shared/database workspace package, runtime contract용 Zod를 포함하는 API workspace 경계를 만든다. | 프로젝트를 규정하는 메커니즘을 새로 도입하지 않고 이미 정립된 auth 툴체인 또는 runtime path를 강화한 일반적인 지원 작업이다. |
| `1779df300611` | `feat(api): 로그인과 로비 HTTP 경계 구현` | B | AUTH, PERSISTENCE, WEB | repository-backed identity와 lobby model을 둘러싼 첫 HTTP 경계를 구성한다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `4b43a284e637` | `feat(api): 실행 환경과 service bootstrap 구성` | B | PERSISTENCE, OPERATIONS | runtime configuration, persistence 선택, startup, shutdown을 위한 명시적인 service composition root를 도입한다. | 이미 정립된 persistence 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `0bcc487d949f` | `feat(api): 프로필과 친구 리소스 라우트 추가` | B | PERSISTENCE | public read와 identity-bound mutation을 구분하면서 HTTP resource 경계를 profile, dashboard, friendship으로 확장한다. | 이미 정립된 persistence 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `e8bb6a4bf68b` | `feat(api): 토너먼트와 관리자 라우트 추가` | B | AUTH, PERSISTENCE, TOURNAMENT | 명시적인 authentication 및 authorization 경계를 갖는 tournament와 administration resource를 추가한다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `fb1c287d9e79` | `test(api): 로그인과 로비 조회 검증` | B | PERSISTENCE, TEST | route helper를 따로 test하는 대신 Fastify injection을 통해 API integration coverage를 추가한다. | 이미 정립된 persistence 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `85ac2a949439` | `test(api): 실행 환경 기본값 검증` | B | PROTOCOL, PERSISTENCE, TEST | configuration precedence와 local runtime contract를 고정한다. | 이미 정립된 protocol 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `1395d45a3665` | `test(api): 관리자 사용자 상태 변경 검증` | B | AUTH, PERSISTENCE, TEST | 실제 login, token authentication, routing, repository mutation을 거쳐 administrator 상태 변경 경로를 검증한다. | 이미 정립된 auth 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `5088099d1e7d` | `test(api): 토너먼트 생성 흐름 검증` | B | AUTH, PERSISTENCE, TOURNAMENT | authentication, HTTP routing, repository storage 전반에서 tournament write-to-read contract를 검증한다. | 이미 정립된 auth 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `a229f13f7eb8` | `feat(realtime): 인증된 WebSocket 연결 구성` | A | AUTH, REALTIME, PERSISTENCE | authenticated WebSocket upgrade 경계와 첫 connection hub를 추가한다. | 중요한 auth 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `4d6b1a212050` | `feat(game): 실시간 경기 방 초기화` | B | SIMULATION, REALTIME | server가 소유하는 room 표현과 canonical initial `GameSnapshot`을 도입한다. | 이미 정립된 simulation 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `c7b84fd73654` | `feat(game): 실시간 매칭 대기열 연결` | B | PROTOCOL, REALTIME | 검증된 client event를 matchmaking에 연결한다. | 이미 정립된 protocol 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `dabd8d5c2a49` | `feat(game): 실시간 경기 채팅 전달` | B | PROTOCOL, REALTIME, PERSISTENCE | `chat.send`를 asynchronous repository-backed realtime operation으로 처리한다. | 이미 정립된 protocol 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `9e3664f5de48` | `feat(game): 서버 주도 퐁 물리 갱신` | A | SIMULATION, REALTIME, WEB | `GameHub` 내부에 authoritative simulation step을 구현한다. | 중요한 simulation 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `bbc21786840f` | `feat(game): 경기 준비와 paddle 입력 연결` | B | SIMULATION, REALTIME, OPERATIONS | readiness와 paddle command를 room state에 연결한다. | 이미 정립된 simulation 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `466c1f960a74` | `feat(game): 경기 종료와 결과 저장 연결` | A | SIMULATION, REALTIME, PERSISTENCE | realtime room에 terminal lifecycle을 추가한다. | 중요한 simulation 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `f5c151c7cc7d` | `chore(web): Next.js runtime 경계 구성` | B | PROTOCOL, PERSISTENCE, WEB | web workspace를 development, production build, type-check command와 React/styling 의존성, repository에서 파생된 TypeScript configuration을 갖춘 Next.js application으로 구성하고... | 프로젝트를 규정하는 메커니즘을 새로 도입하지 않고 이미 정립된 protocol 툴체인 또는 runtime path를 강화한 일반적인 지원 작업이다. |
| `4071b935cb24` | `chore(web): Tailwind style build 구성` | B | WEB | PostCSS에서 Tailwind와 Autoprefixer를 실행하도록 설정하고, Tailwind source scan 범위를 web application의 TypeScript/TSX tree로 제한한다. | 프로젝트를 규정하는 메커니즘을 새로 도입하지 않고 이미 정립된 web 툴체인 또는 runtime path를 강화한 일반적인 지원 작업이다. |
| `ce174d6b3633` | `feat(web): 한국어 로비 shell 초기화` | B | REALTIME, WEB | 한국어 document metadata, language 선언, global design token, 기본 element rule, 재사용 가능한 card style, 접근성을 고려한 focus-visible 처리를 포함하는 초기 Next.js App Router shell을 만든다. | 이미 정립된 realtime 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `20618b30eda9` | `feat(web): 인증 API client 구현` | B | AUTH, REALTIME, TOURNAMENT | authentication과 초기 application read model을 위한 공통 browser-side HTTP client를 구현한다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `09866b6206ba` | `feat(web): 사용자와 서비스 sample 데이터 추가` | C | - | user, leaderboard row, player dashboard, lobby chat, tournament용 typed fixture set을 추가한다. | 프로젝트의 주요 엔지니어링 결정을 이해하는 데 기여가 작고 일상적인 유지보수 또는 임시 presentation scaffolding에 해당하므로 중요도가 낮다. |
| `847f72b611b5` | `feat(web): 경기 snapshot sample 추가` | C | - | realtime room이 연결되기 전에 court를 렌더링할 수 있도록 완전한 `GameSnapshot` fixture를 추가한다. | 프로젝트의 주요 엔지니어링 결정을 이해하는 데 기여가 작고 일상적인 유지보수 또는 임시 presentation scaffolding에 해당하므로 중요도가 낮다. |
| `77f35c72cd7b` | `feat(web): 공통 내비게이션 프레임 구현` | B | WEB, OPERATIONS | route navigation, active route highlighting, responsive sidebar layout, 공통 content width를 소유하는 재사용 가능한 application shell을 도입한다. | 이미 정립된 web 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `3449f7988e1b` | `feat(web): 퐁 캔버스 미리보기 구현` | B | SIMULATION, REALTIME, WEB | `GameSnapshot`을 받아 shared game dimension을 기준으로 field, center line, paddle, ball, score를 그리는 canvas renderer를 추가한다. | 이미 정립된 simulation 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `f27199fdcd34` | `feat(web): 개발용 로그인 패널 추가` | B | AUTH, WEB | handle과 display name을 입력받아 typed authentication client를 호출하고 authenticated `SessionUser`를 parent에 전달하는 development-login form을 추가한다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `52ddc3acfcce` | `feat(web): 로비 인증 진입 연결` | B | AUTH, WEB | home route가 authenticated session state에 따라 분기하도록 한다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `ea1f1b7ba543` | `feat(web): 로그인 사용자 로비 화면 구성` | B | REALTIME, WEB, OPERATIONS | authenticated home-page summary를 common shell 안에 구성된 완전한 lobby로 교체한다. | 이미 정립된 realtime 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `91962d36bd59` | `feat(play): 경기장 화면 구성` | B | PROTOCOL, REALTIME, WEB | 재사용 가능한 Pong canvas를 중심으로 첫 전용 play route를 추가한다. | 이미 정립된 protocol 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `737aa99cb4cb` | `feat(play): WebSocket 경기 연결 구현` | B | AUTH, PROTOCOL, SIMULATION | play screen을 static preview가 아니라 realtime game protocol client로 전환한다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `977ca863050f` | `feat(play): keyboard paddle 입력 연결` | B | PROTOCOL, SIMULATION, REALTIME | Arrow 및 W/S keyboard event를 room-scoped `game.input` protocol에 mapping한다. | 이미 정립된 protocol 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `8ab0bb333991` | `feat(play): 경기 상태와 채팅 panel 구성` | B | REALTIME, WEB | authoritative snapshot을 중심으로 match view를 확장해 오른쪽 player를 opponent로 표시하고, 들어오는 `chat.message` event를 court 옆에 렌더링한다. | 이미 정립된 realtime 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `cbe876359d31` | `feat(web): 플레이어 대시보드 구현` | B | WEB | 공유 `DashboardSummary` read model을 사용하는 dashboard route를 추가한다. | 이미 정립된 web 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `cb295396771f` | `feat(web): 순위표 화면 추가` | B | WEB | 공유 `LeaderboardEntry` contract를 소비해 API가 반환한 rank, player record, rating, win rate를 렌더링하는 leaderboard route를 추가한다. | 이미 정립된 web 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `4370ac3162b2` | `feat(web): 토너먼트 대진표 화면 추가` | B | TOURNAMENT, WEB | 첫 tournament page를 추가하고 tournament 목록 조회와 생성을 HTTP API에 연결한다. | 이미 정립된 tournament 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `0afc0a0694bd` | `feat(web): 공개 프로필 화면 추가` | B | WEB | handle에 따라 표시할 player identity를 선택하는 dynamic public-profile route를 추가한다. | 이미 정립된 web 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `5e11e944244d` | `feat(web): 관리자 화면 추가` | B | WEB | protected user 목록을 요청해 각 account의 전적, rating, active/banned 상태를 표시하는 read-oriented administration route를 추가한다. | 이미 정립된 web 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `d991c9f19037` | `chore(lockfile): 초기 워크스페이스 의존성 고정` | C | - | 초기 workspace 의존성 그래프를 해석한 generated pnpm lockfile을 추가한다. | 독립적인 설계나 runtime 결정을 추가하지 않고 생성된 의존성 해석 결과만 기록하므로 중요도가 낮다. |
| `19b4d9f9083d` | `build(runtime): Compose와 Caddy 라우팅 추가` | B | REALTIME, PERSISTENCE, WEB | PostgreSQL, Fastify API, Next.js client, Caddy gateway를 위한 재현 가능한 multi-service runtime을 정의한다. | 프로젝트를 규정하는 메커니즘을 새로 도입하지 않고 이미 정립된 realtime 툴체인 또는 runtime path를 강화한 일반적인 지원 작업이다. |
| `9a0562d395db` | `test(smoke): HTTP API 실행 검사 추가` | B | AUTH, OPERATIONS, TEST | development login을 수행한 뒤 authenticated `/me`, `/lobby`, `/dashboard` 조회와 public leaderboard를 함께 실행하는 runtime smoke test를 추가한다. | 이미 정립된 auth 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `8a462f6f05b3` | `test(smoke): WebSocket 경기 실행 검사 추가` | B | AUTH, PROTOCOL, SIMULATION | 두 player를 login하고 두 socket connection을 authentication한 뒤 matchmaking queue에 참가시키고, 생성된 room을 ready 상태로 만든 다음 playing snapshot과 전달된 match-chat message를... | 이미 정립된 auth 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `d755b8dae2c1` | `test(e2e): 한국어 내비게이션과 캔버스 흐름 구성` | B | PERSISTENCE, TOURNAMENT, WEB | Playwright를 repository-level browser test runner로 도입하고 desktop/mobile Chromium project, 실패 trace 및 screenshot, 설정 가능한 application origin을 구성한다. | 이미 정립된 persistence 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `a04ad50348ec` | `chore(repo): pnpm과 TypeScript 캐시 제외` | C | - | repository ignore 정책에서 local pnpm content-addressable store를 제외한다. | 프로젝트의 주요 엔지니어링 결정을 이해하는 데 기여가 작고 일상적인 유지보수 또는 임시 presentation scaffolding에 해당하므로 중요도가 낮다. |
| `dfb573ca46c8` | `fix(auth): 인증 완료 전 WebSocket 입력 보존` | A | AUTH, SIMULATION, REALTIME | WebSocket route가 asynchronous session resolution 중에 들어오는 payload를 buffer하도록 변경한다. | 겉으로 드러난 증상만 가리는 대신 실패를 소유하는 계층에서 중요한 auth 불변식을 복구했으므로 중요하다. |
| `7922fc7eb720` | `fix(game): 닫힌 WebSocket 대기열 참가자 제거` | B | REALTIME | queue 참가 처리 시작 시 waiting list를 뒤에서부터 순회하며 WebSocket이 더 이상 open 상태가 아닌 client를 제거한다. | 프로젝트의 주요 아키텍처나 lifecycle 모델을 실질적으로 바꾸지 않고 제한된 realtime 동작을 수정한 일반적인 보정 작업이다. |
| `ec000bed0414` | `build(web): production start와 TS cache 정책 구성` | B | WEB | web package에 container interface에 bind하는 production `next start` command와 package-local test가 없을 때 성공하는 test command를 추가한다. | 프로젝트를 규정하는 메커니즘을 새로 도입하지 않고 이미 정립된 web 툴체인 또는 runtime path를 강화한 일반적인 지원 작업이다. |
| `be15e937d718` | `fix(runtime): Compose에서 build 결과 실행` | B | WEB, OPERATIONS | Compose가 production start script로 API를 시작하고 Next.js application을 먼저 build한 뒤 production server로 제공하도록 변경한다. | 프로젝트의 주요 아키텍처나 lifecycle 모델을 실질적으로 바꾸지 않고 제한된 web 동작을 수정한 일반적인 보정 작업이다. |
| `42d5e72083dc` | `test(smoke): WebSocket 매칭과 socket 정리 안정화` | B | REALTIME, OPERATIONS, TEST | WebSocket smoke test가 각 event를 어느 client가 관측했는지 기록하고, 양쪽 client가 같은 room의 match assignment를 모두 받았는지 요구하며, playing snapshot을 받은 뒤 room chat을 검사하도록 하고... | 이미 정립된 realtime 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `bfae9539cfe5` | `feat(web): 사용자 동작용 API 함수 추가` | B | TOURNAMENT, WEB | tournament 참가, 최근 match를 포함한 public profile 조회, handle 기반 friendship request, administrative user status 변경을 위한 typed browser adapter를 추가한다. | 이미 정립된 tournament 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `afbd8847b1dd` | `feat(play): 경기 채팅 입력 연결` | B | REALTIME, WEB | play page가 현재 room의 WebSocket connection을 통해 trim한 match-chat message를 전송하고 제출 후 controlled input을 비우도록 한다. | 이미 정립된 realtime 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `051eac1b4aee` | `feat(profile): 친구 요청 동작 연결` | B | AUTH, WEB | dynamic profile route가 요청된 public profile을 조회하고 route handle을 target identity로 사용해 friend button을 authenticated friend-request API에 연결한다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `bfea82733512` | `feat(admin): 사용자 상태 변경 동작 연결` | B | AUTH, WEB | administration page가 server user 목록을 load하고 각 status control을 authenticated active-to-banned 또는 banned-to-active update로 연결한다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `a4f665fd2999` | `feat(tournament): 생성과 참가 동작 연결` | B | AUTH, TOURNAMENT | tournament screen이 명시적인 selected tournament를 유지하고, 새로 생성한 competition을 선택하며, 현재 선택 대상에 join request를 보내도록 한다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `8b2679d9e190` | `test(e2e): 화면 action의 실제 API 연결 검증` | B | REALTIME, TOURNAMENT, WEB | browser test가 static presentation을 넘어 실제로 연결된 interactive path인 AI room 시작과 match chat 전송, profile에서 friendship request, tournament 생성 및 참가를... | 이미 정립된 realtime 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `177fa0b8502a` | `fix(web): body 없는 요청에서 JSON header 제외` | B | AUTH, WEB | 공유 browser request helper가 `Headers` object를 만들고 body가 존재하면서 content type이 명시적으로 전달되지 않은 경우에만 JSON content type을 추가하며, token이 있을 때 authorization을 독립적으로... | 프로젝트의 주요 아키텍처나 lifecycle 모델을 실질적으로 바꾸지 않고 제한된 auth 동작을 수정한 일반적인 보정 작업이다. |
| `1d9aa3902614` | `feat(lobby): 실시간 로비 지표 API 추가` | B | REALTIME | game hub가 queue-entry timestamp를 기록하고 connected client, room participant, queued client, active room, 최근 matching wait time의 live count를 제공하도록 한다. | 이미 정립된 realtime 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `de9a173e6eb1` | `feat(chat): 쓰기 가능한 로비 채팅 API 추가` | B | REALTIME, PERSISTENCE | authenticated lobby-chat endpoint가 제출된 text를 trim하고 empty message와 240자를 초과한 content를 거부하며, 허용된 message를 `scope: "lobby"`, room identifier 없음, 그리고 인증된 사용자의... | 이미 정립된 realtime 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `e0ef3fec89a6` | `feat(chat): 로비 채팅 입력 화면 추가` | B | WEB | lobby page에 controlled chat form을 추가해 empty submission을 trim한 뒤 무시하고, lobby-chat API를 호출하며, 반환된 message를 최대 20개로 제한된 history에 추가한다. | 이미 정립된 web 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `3cd56054bdab` | `fix(play): 패들 조작과 Canvas rendering 개선` | B | SIMULATION, REALTIME, WEB | room이 active인 동안 browser key-repeat 주기에 의존하지 않고 persistent direction state를 sampling해 50ms마다 paddle input을 전송하도록 변경한다. | 프로젝트의 주요 아키텍처나 lifecycle 모델을 실질적으로 바꾸지 않고 제한된 simulation 동작을 수정한 일반적인 보정 작업이다. |
| `4f9b3b312d0e` | `fix(lobby): 로비 상태 표현 개선` | B | REALTIME | lobby summary가 server에서 제공한 online, playing, queued, active-room count를 표시하고, average wait가 없을 때 고정 30초... | 프로젝트의 주요 아키텍처나 lifecycle 모델을 실질적으로 바꾸지 않고 제한된 realtime 동작을 수정한 일반적인 보정 작업이다. |
| `51e66cf1df80` | `fix(profile): 공개 프로필 상태 표현 개선` | B | PERSISTENCE, WEB | public profile이 profile response와 함께 반환된 recent-match collection을 보관하고 각 result, opponent, score를 렌더링하며 명시적인 empty state도 제공하도록 한다. | 프로젝트의 주요 아키텍처나 lifecycle 모델을 실질적으로 바꾸지 않고 제한된 persistence 동작을 수정한 일반적인 보정 작업이다. |
| `8d79139a32da` | `fix(dashboard): 경기 상태 표현 개선` | B | WEB | dashboard rating chart를 고정 SVG polyline 대신 현재 rating과 최근 match에 기록된 delta에서 계산한다. | 프로젝트의 주요 아키텍처나 lifecycle 모델을 실질적으로 바꾸지 않고 제한된 web 동작을 수정한 일반적인 보정 작업이다. |
| `383a939c2a4f` | `fix(play): 경기 세션 상태 표현 개선` | B | REALTIME, WEB | match chat이 synthetic chat entry를 삽입하지 않고 empty 상태에서 시작하며 전용 empty-state message를 렌더링하도록 한다. | 프로젝트의 주요 아키텍처나 lifecycle 모델을 실질적으로 바꾸지 않고 제한된 realtime 동작을 수정한 일반적인 보정 작업이다. |
| `ab9acd1a3093` | `fix(web): 내비게이션 사용자 상태 표현 개선` | C | - | application header에서 average waiting time이 30초 미만으로 유지된다는 문구를 제거한다. | 프로젝트의 주요 엔지니어링 결정을 이해하는 데 기여가 작고 일상적인 유지보수 또는 임시 presentation scaffolding에 해당하므로 중요도가 낮다. |
| `8ce1199ffd12` | `fix(api): body 없는 로비 채팅 요청 처리` | B | - | lobby-chat route가 optional message field를 읽기 전에 missing request body를 empty object로 정규화하도록 한다. | 프로젝트의 주요 아키텍처나 lifecycle 모델을 실질적으로 바꾸지 않고 제한된 project 동작을 수정한 일반적인 보정 작업이다. |
| `8078ac6f92ba` | `test(app): 실시간 지표·채팅·경기 기록 검증` | B | REALTIME, PERSISTENCE, WEB | test suite가 초기 lobby metrics contract, authenticated lobby-chat persistence, lobby/match message의 sender 및 room attribution, recent match의 시간순 ordering, 그리고... | 이미 정립된 realtime 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `6a7aa285fe68` | `fix(play): 실제 경기 상태에 맞게 세션 표시` | A | SIMULATION, REALTIME, WEB | play session이 fabricated match data 없이 시작하고 최신 server snapshot에서 score, opponent, ready/chat availability, input transmission, terminal cleanup을 모두 파생하도록 한다. | 겉으로 드러난 증상만 가리는 대신 실패를 소유하는 계층에서 중요한 simulation 불변식을 복구했으므로 중요하다. |
| `655bc7bd8df7` | `feat(protocol): 일시정지 WebSocket 계약 추가` | B | PROTOCOL, REALTIME, WEB | 공유 game contract에 `paused`를 명시적인 phase로 추가하고 room 식별자를 포함하는 `game.pause`, `game.resume` client event를 허용한다. | 이미 정립된 protocol 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `d93612c18e6f` | `feat(game): 서버 주도 일시정지 기능 추가` | B | SIMULATION, REALTIME | game hub가 pause/resume command를 server-owned room-state transition으로 처리하도록 한다. | 이미 정립된 simulation 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `e4e2dec55805` | `feat(play): 일시정지와 재개 UI 연결` | B | REALTIME, WEB | play screen이 server snapshot phase에서 pause/resume 가능 여부를 계산하고 현재 room에 해당 WebSocket command를 보내도록 한다. | 이미 정립된 realtime 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `cd3787eefd6a` | `feat(chat): 로비 채팅과 접속 상태 실시간 반영` | B | AUTH, REALTIME, WEB | 현재 user와 session token을 사용할 수 있게 된 뒤 lobby가 authenticated WebSocket을 열도록 한다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `be31566ac0fd` | `fix(web): 로그인 화면의 sample fallback 제거` | A | AUTH, TOURNAMENT, WEB | authenticated 및 server-backed screen이 request 실패 시 sample user, match, chat, ranking, tournament, administrative data를 대신 표시하지 않도록 한다. | 겉으로 드러난 증상만 가리는 대신 실패를 소유하는 계층에서 중요한 auth 불변식을 복구했으므로 중요하다. |
| `34eccd6c7150` | `feat(profile): 현재 프로필과 공유 기능 연결` | B | WEB | application shell의 profile navigation target을 고정 test handle 대신 authenticated session에서 결정하도록 한다. | 이미 정립된 web 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `11e4c3dda1aa` | `feat(tournament): 대진 경기 contract 정의` | B | REALTIME, TOURNAMENT, WEB | 공유 HTTP contract에 bracket position, lifecycle status, participant, winner, score, 선택적인 room/persisted-match 식별자를 포함하는 tournament match summary를 추가한다. | 이미 정립된 realtime 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `138e5b8590b6` | `feat(tournament): 대진 경기 schema 추가` | B | REALTIME, PERSISTENCE, TOURNAMENT | tournament entry나 일반 game record에서 매 round를 계산하는 대신 bracket state 전용 `tournament_matches` persistence model을 도입한다. | 이미 정립된 realtime 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `4021a437e7e0` | `feat(tournament): 대진 row mapper 정의` | B | REALTIME, PERSISTENCE, TOURNAMENT | database 형태의 tournament match row를 application record와 public summary로 변환하는 명시적인 mapping을 추가한다. | 이미 정립된 realtime 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `53579ad0f0bf` | `feat(tournament): 대진 경기 lifecycle 저장 구현` | A | REALTIME, PERSISTENCE, TOURNAMENT | `AppRepository`에 tournament match 조회, 시작, 완료 operation을 추가하고 PostgreSQL과 in-memory repository에 동일한 contract를 구현한다. | 중요한 realtime 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `0d6824683677` | `feat(tournament): 준결승 대진 생성과 조회 구현` | A | TOURNAMENT | 4인 tournament가 capacity에 도달하면 semifinal bracket을 생성하고 persisted match를 tournament summary에 포함한다. | 중요한 tournament 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `b01adf728ca0` | `feat(tournament): memory 대진 진행 구현` | B | PERSISTENCE, TOURNAMENT | in-memory repository의 tournament flow를 PostgreSQL과 behavior상 동일하게 맞춘다. | 이미 정립된 persistence 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `33b6dfc5df7a` | `feat(tournament): 토너먼트 경기 방 진행` | A | REALTIME, TOURNAMENT, RISK | tournament bracket match를 realtime game hub에 통합한다. | 중요한 realtime 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `b0a1505c6a0f` | `feat(tournament): 플레이 가능한 대진 UI 연결` | B | PROTOCOL, REALTIME, TOURNAMENT | placeholder tournament bracket을 persisted match model로 교체하고 참가 가능한 participant를 realtime play에 직접 연결한다. | 이미 정립된 protocol 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `42033a6f2f3a` | `feat(admin): 감사 가능한 사용자 상태 API 추가` | A | AUTH, REALTIME, PERSISTENCE | account suspension을 presentation-only flag가 아니라 server-side에서 강제하는 authorization state로 만든다. | 중요한 auth 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `bf797871007c` | `feat(admin): 감사 기록과 상태 변경 UI 추가` | B | AUTH, WEB | administration interface를 audit-capable API에 연결한다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `66155cf8a27d` | `fix(api): 변경 요청용 CORS method와 header 허용` | B | AUTH, WEB | authenticated mutation request에서 사용하는 cross-origin method와 request header를 명시한다. | 프로젝트의 주요 아키텍처나 lifecycle 모델을 실질적으로 바꾸지 않고 제한된 auth 동작을 수정한 일반적인 보정 작업이다. |
| `e07726592df5` | `test(app): 전체 서비스 흐름 검증` | B | AUTH, REALTIME, PERSISTENCE | administration, tournament, repository, browser, smoke-test 경계 전반의 regression coverage를 확장한다. | 이미 정립된 auth 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `a56a4dee9219` | `fix(web): 안정적인 navigation key 사용` | B | WEB | 각 navigation item에 안정적인 logical identifier를 부여하고 현재 destination URL 대신 이를 React key로 사용한다. | 프로젝트의 주요 아키텍처나 lifecycle 모델을 실질적으로 바꾸지 않고 제한된 web 동작을 수정한 일반적인 보정 작업이다. |
| `035b97ca7c58` | `fix(db): 최근 경기에서 최고 연승 계산` | B | PERSISTENCE | fabricated formula나 repository별 constant 대신 실제 recent match result에서 dashboard의 best winning streak를 계산한다. | 프로젝트의 주요 아키텍처나 lifecycle 모델을 실질적으로 바꾸지 않고 제한된 persistence 동작을 수정한 일반적인 보정 작업이다. |
| `6b661420e060` | `test(db): 최고 연승 계산 검증` | B | PERSISTENCE, TEST | winning-streak 계산의 ordering과 reset 규칙을 모두 고정한다. | 이미 정립된 persistence 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `7fe29f991a9b` | `fix(dashboard): 연승 지표 설명 정정` | C | - | dashboard hint를 “this season”에서 “recent matches”로 변경해 metric의 실제 data boundary를 정확히 설명한다. | 프로젝트의 주요 엔지니어링 결정을 이해하는 데 기여가 작고 일상적인 유지보수 또는 임시 presentation scaffolding에 해당하므로 중요도가 낮다. |
| `3c6c9134ee94` | `fix(dashboard): 빈 rating history를 정확히 표시` | B | PERSISTENCE, WEB | empty match history를 임의의 2-point chart로 만드는 대신 rating 근거가 없는 상태로 취급한다. | 프로젝트의 주요 아키텍처나 lifecycle 모델을 실질적으로 바꾸지 않고 제한된 persistence 동작을 수정한 일반적인 보정 작업이다. |
| `8debb1ea3ad3` | `feat(lobby): 연결 중인 WebSocket 사용자 목록 추가` | B | REALTIME | persistent account storage가 아니라 realtime hub를 lobby presence의 authority로 만든다. | 이미 정립된 realtime 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `c3ff9ed2402f` | `test(lobby): WebSocket 사용자 목록 검증` | B | REALTIME, PERSISTENCE, TEST | WebSocket client가 하나도 연결되지 않았을 때 lobby가 empty online-player list를 반환하는지 확인한다. | 이미 정립된 realtime 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `8c6cefff8728` | `fix(game): 경기 시간에 따라 공 속도 증가` | B | SIMULATION, REALTIME | 긴 rally가 점차 빨라지되 simulation speed가 무한히 증가하지 않도록 time-based ball acceleration을 추가한다. | 프로젝트의 주요 아키텍처나 lifecycle 모델을 실질적으로 바꾸지 않고 제한된 simulation 동작을 수정한 일반적인 보정 작업이다. |
| `8e2ef3311015` | `test(app): 실시간 로비와 공 가속 검증` | B | PROTOCOL, SIMULATION, REALTIME | WebSocket smoke flow를 단순 protocol connectivity가 아니라 두 가지 live-system property를 검증하도록 확장한다. | 이미 정립된 protocol 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `c7116fafa644` | `fix(web): 비로그인 상태의 me 요청 생략` | B | AUTH, WEB | browser에 저장된 session token이 없으면 `getMe()`가 즉시 `null`을 반환하도록 한다. | 프로젝트의 주요 아키텍처나 lifecycle 모델을 실질적으로 바꾸지 않고 제한된 auth 동작을 수정한 일반적인 보정 작업이다. |
| `c7bdbc9ab8a5` | `fix(web): 만료된 session token 정리` | B | AUTH, WEB | authenticated API request가 `401 Unauthorized`를 받으면 persisted session token을 제거한다. | 프로젝트의 주요 아키텍처나 lifecycle 모델을 실질적으로 바꾸지 않고 제한된 auth 동작을 수정한 일반적인 보정 작업이다. |
| `72d23baefc3c` | `feat(db): NPC 사용자 contract와 schema 추가` | B | REALTIME, PERSISTENCE, TOURNAMENT | user persistence model과 public user contract에 명시적인 NPC discriminator를 추가한다. | 이미 정립된 realtime 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `b3239bae51e5` | `feat(db): rating 구간별 NPC 상대 저장` | B | REALTIME, PERSISTENCE | 상승하는 rating band별로 고정 automated opponent를 seed하고 전용 repository query로 노출한다. | 이미 정립된 realtime 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `dec431822873` | `test(db): NPC seed와 leaderboard 분리 검증` | B | REALTIME, PERSISTENCE, TEST | seed initialization이 의도한 네 개의 rating-banded opponent를 오름차순으로 생성하고 모든 결과가 명시적인 offline NPC로 분류되는지 검증한다. | 이미 정립된 realtime 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `87b38e2f23c8` | `feat(game): NPC 상대를 경기 방에 연결` | B | REALTIME | hard-coded anonymous AI label 대신 실제 NPC user를 game room과 result persistence에서 사용할 수 있도록 준비한다. | 이미 정립된 realtime 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `1122e6a4b901` | `feat(game): 대기 플레이어 NPC fallback 구성` | B | REALTIME | human matchmaking queue에 bounded waiting policy를 추가한다. | 이미 정립된 realtime 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `b159bcda3b83` | `feat(game): rating 기반 NPC AI policy 구현` | B | SIMULATION, REALTIME, WEB | 하나의 perfect-following AI 규칙을 rating band별 behavior profile로 교체한다. | 이미 정립된 simulation 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `afd0a97c5c1c` | `feat(web): 대기열에서 NPC 상대 표시` | B | REALTIME, WEB | player experience 전반에 automated-opponent 구분을 노출한다. | 이미 정립된 realtime 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `cfb15fc84dee` | `test(app): NPC fallback matching 검증` | B | PROTOCOL, REALTIME, PERSISTENCE | human opponent가 없는 실제 WebSocket session으로 delayed fallback을 검증한다. | 이미 정립된 protocol 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `23a978879b81` | `test(smoke): WebSocket 접속 상태 반영 대기` | B | REALTIME, OPERATIONS, TEST | 두 WebSocket의 `open` event가 발생한 정확한 순간에 HTTP presence가 갱신된다고 가정하지 않고, realtime presence smoke check가 eventual state를 관찰하도록 변경한다. | 이미 정립된 realtime 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `b05445e8b4a2` | `test(e2e): 실시간 상태 검증 안정화` | B | TOURNAMENT, WEB, OPERATIONS | 정상적인 runtime variation과 persisted parallel test data를 고려해 browser test를 안정화한다. | 이미 정립된 tournament 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `252befef9527` | `fix(api): logout 시 server session 폐기` | A | AUTH, REALTIME, PERSISTENCE | logout에서 browser cookie만 지우지 않고 server-side session도 invalidate한다. | 겉으로 드러난 증상만 가리는 대신 실패를 소유하는 계층에서 중요한 auth 불변식을 복구했으므로 중요하다. |
| `bc789124b20b` | `test(api): logout session invalidation 검증` | B | AUTH, SIMULATION, TEST | logout을 server-side security transition으로 검증한다. | 이미 정립된 auth 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `bc8d023b2999` | `fix(web): profile link 전 사용자 식별 대기` | B | WEB | 현재 session user가 resolve될 때까지 profile navigation item을 disabled 상태로 렌더링한다. | 프로젝트의 주요 아키텍처나 lifecycle 모델을 실질적으로 바꾸지 않고 제한된 web 동작을 수정한 일반적인 보정 작업이다. |
| `ee4bebc84f95` | `build(runtime): 지원 Node.js·pnpm 범위 고정` | B | OPERATIONS | local version manager, package metadata, container image를 Node.js 24.18.0으로 맞추고 pnpm은 10.32.1로 고정한다. | 프로젝트를 규정하는 메커니즘을 새로 도입하지 않고 이미 정립된 operations 툴체인 또는 runtime path를 강화한 일반적인 지원 작업이다. |
| `f9bb622a1117` | `refactor(db): SQL migration lifecycle 분리` | A | PERSISTENCE, RISK, REFACTOR | schema evolution과 repository seeding을 분리하고 SQL file을 명시적인 Kysely migration lifecycle 아래로 이동한다. | 동작을 보존하면서 persistence의 소유권, 상태, 의존성 경계를 실질적으로 바꾸고 복잡한 메커니즘을 독립적으로 강제할 수 있게 했으므로 중요하다. |
| `8da6edef28eb` | `feat(db): 환경별 seed profile 분리` | B | AUTH, REALTIME, PERSISTENCE | 명시적인 `development`, `demo` seed profile을 도입한다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `981ee655559b` | `refactor(db): migration과 seed CLI 연결` | B | PERSISTENCE | 새로 분리한 migration 및 seed lifecycle에 database CLI를 연결한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 persistence 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `a9f8b8609711` | `build(repo): workspace 검증 명령 정리` | B | PROTOCOL, REALTIME, OPERATIONS | 서로 다른 verification layer를 기준으로 root script와 Make target을 표준화한다. | 프로젝트를 규정하는 메커니즘을 새로 도입하지 않고 이미 정립된 protocol 툴체인 또는 runtime path를 강화한 일반적인 지원 작업이다. |
| `68404e51ea53` | `ci(repo): typecheck·unit·build workflow 추가` | B | PROTOCOL, PERSISTENCE, OPERATIONS | 모든 push와 pull request에서 실행되는 read-only GitHub Actions verification job을 추가한다. | 프로젝트를 규정하는 메커니즘을 새로 도입하지 않고 이미 정립된 protocol 툴체인 또는 runtime path를 강화한 일반적인 지원 작업이다. |
| `4bc5bba93c4a` | `test(web): API client 동작 검증` | B | AUTH, PROTOCOL, WEB | browser API 경계에 집중한 unit coverage를 추가하고 web package가 실제 test를 포함하도록 한다. | 이미 정립된 auth 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `0c5c27c8c3df` | `feat(shared): 사용자 HTTP runtime contract 정의` | B | PROTOCOL, TOURNAMENT | compile-time에만 존재하던 user interface를 runtime에서도 실행 가능한 Zod schema로 교체한다. | 이미 정립된 protocol 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `6704f37ca6a3` | `feat(shared): 경기·대시보드 runtime contract 정의` | B | PROTOCOL | match summary, dashboard payload, leaderboard entry에 대한 실행 가능한 contract를 정의한다. | 이미 정립된 protocol 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `4bace138f188` | `feat(shared): 친구·채팅·로비 runtime contract 정의` | B | PROTOCOL, REALTIME | runtime validation 범위를 friendship, chat, lobby statistic, 전체 lobby response로 확장한다. | 이미 정립된 protocol 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `7d0793a23f5d` | `feat(shared): 토너먼트·관리 runtime contract 정의` | B | PROTOCOL, TOURNAMENT, OPERATIONS | tournament bracket, tournament aggregate, administration audit record의 runtime schema를 정의한다. | 이미 정립된 protocol 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `282a9d0beb47` | `feat(shared): HTTP 요청·오류 schema 정의` | B | - | route parameter, request body, 공통 API error envelope에 strict schema를 추가한다. | 이미 정립된 project 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `e226b68fe235` | `feat(shared): HTTP 응답 runtime contract 정의` | B | AUTH, PROTOCOL, REALTIME | 공유 domain validator에서 endpoint별 response schema를 조합한다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `78cf83f29e80` | `test(shared): HTTP contract 검증` | B | AUTH, PROTOCOL, TEST | 새 HTTP schema에 encoding된 behavioral rule을 검증한다. | 이미 정립된 auth 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `e935054ce0c9` | `build(db): PostgreSQL integration 의존성과 명령 추가` | B | PERSISTENCE | Testcontainers 기반의 격리된 PostgreSQL integration-test 진입점을 도입한다. | 프로젝트를 규정하는 메커니즘을 새로 도입하지 않고 이미 정립된 persistence 툴체인 또는 runtime path를 강화한 일반적인 지원 작업이다. |
| `c43b87694b29` | `test(db): PostgreSQL integration 환경과 계약 추가` | A | PERSISTENCE, RISK, TEST | migration, seeding, test-resource lifecycle을 둘러싼 실제 PostgreSQL integration coverage를 추가한다. | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 persistence 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `0e360d333540` | `ci(db): PostgreSQL integration 검사 실행` | B | PERSISTENCE | container-backed PostgreSQL suite를 별도 CI job으로 추가한다. | 프로젝트를 규정하는 메커니즘을 새로 도입하지 않고 이미 정립된 persistence 툴체인 또는 runtime path를 강화한 일반적인 지원 작업이다. |
| `45225adcfcd9` | `feat(db): 명시적 사용자 role 할당 추가` | A | AUTH, PERSISTENCE | 일반 login에서 handle 기반 privilege assignment를 제거하고 user role을 변경하는 명시적인 repository/CLI operation을 도입한다. | 중요한 auth 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `dae31d4a223c` | `test(auth): 명시적 role assignment 검증` | B | AUTH, PERSISTENCE, TEST | `admin` handle을 사용한 development account가 login만으로 privilege를 유지하지 않는지 PostgreSQL에서 검증한다. | 이미 정립된 auth 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `ac85316bb0cb` | `feat(api): typed HTTP 오류 boundary 추가` | A | AUTH, PROTOCOL, RISK | Fastify route용 중앙화된 typed failure 경계를 도입한다. | 중요한 auth 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `c4cba7d3f871` | `feat(api): 인증·사용자 HTTP contract 적용` | B | AUTH, PROTOCOL, WEB | shared runtime contract와 typed error boundary를 health, authentication, user, profile route에 적용한다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `05e3ecfa2a2d` | `feat(api): 로비·친구 HTTP contract 적용` | B | AUTH, PROTOCOL, PERSISTENCE | runtime validation을 lobby, chat, leaderboard, dashboard, friendship endpoint로 확장한다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `24f99345452d` | `feat(api): 토너먼트·관리 HTTP contract 적용` | B | AUTH, TOURNAMENT | shared request/response/error contract를 tournament와 administration route에 적용한다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `b2a8de5a0027` | `refactor(api): HTTP boundary helper 통합` | B | AUTH | 남아 있는 route-local unauthorized/suspended response helper를 제거하고 application 전체에서 typed HTTP-boundary function을 직접 사용한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 auth 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `50caaf5c7c49` | `test(api): typed HTTP boundary 기대값 정렬` | B | AUTH, TOURNAMENT, WEB | API, tournament, administrator test를 typed HTTP boundary에서 확립한 cookie-based session contract에 맞춘다. | 이미 정립된 auth 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `d0531791406b` | `fix(auth): cookie-only session과 환경별 route 적용` | S | AUTH, ARCH, RISK | session authentication을 `pp_session` cookie로 제한하고 request handling과 CORS에서 bearer-header 및 query-string token fallback을 제거한다. | durable browser credential 경계를 정립하고 development-only authentication을 runtime mode에 따라 제한하므로 핵심적이다. 여러 reusable-token transport를 제거하며 이후 WebSocket ticket과 guest auth 작업의 방향을 실질적으로 결정한다. |
| `401cf13d9d17` | `test(auth): cookie session 경계 검증` | A | AUTH, RISK, TEST | 전체 authentication 경계에 집중한 regression coverage를 추가한다. | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 auth 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `2e4359f0625f` | `refactor(game): Pong simulation 상태와 초기화 분리` | A | SIMULATION, REALTIME, REFACTOR | authoritative Pong simulation state와 input을 위한 전용 표현을 도입한다. | 동작을 보존하면서 simulation의 소유권, 상태, 의존성 경계를 실질적으로 바꾸고 복잡한 메커니즘을 독립적으로 강제할 수 있게 했으므로 중요하다. |
| `7c8b99058594` | `refactor(game): paddle 이동과 벽 반사 모델링` | B | SIMULATION, REALTIME | 첫 deterministic simulation step을 추가해 positive finite delta를 검증하고, prior state를 복제하며, configured tick interval에 맞춰 movement를 scaling하고, 두 paddle을 arena 범위로 clamp한 뒤... | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 simulation 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `4afec2071e7a` | `refactor(game): 득점과 충돌을 simulation에 통합` | S | SIMULATION, CORE, ARCH | paddle collision, scoring, serve reset, acceleration, match termination을 standalone simulation으로 이동한다. | scoring, collision, acceleration, termination을 하나의 transport-independent state transition에 포함하므로 핵심적이다. 이 커밋이 없으면 authoritative game rule이 분산된 채 남아 deterministic simulation 아키텍처를 설명할 수 없다. |
| `e3223e7f48a5` | `refactor(game): 결정적 정수 난수 생성기 추가` | A | SIMULATION, REALTIME, REFACTOR | game AI용 integer-only seeded pseudo-random generator를 도입한다. | 동작을 보존하면서 simulation의 소유권, 상태, 의존성 경계를 실질적으로 바꾸고 복잡한 메커니즘을 독립적으로 강제할 수 있게 했으므로 중요하다. |
| `ed58ad602e2a` | `refactor(game): rating 기반 Pong AI 정책 분리` | A | SIMULATION, REALTIME, REFACTOR | right-paddle AI를 seed와 rating으로 parameterize된 deterministic policy로 추출한다. | 동작을 보존하면서 simulation의 소유권, 상태, 의존성 경계를 실질적으로 바꾸고 복잡한 메커니즘을 독립적으로 강제할 수 있게 했으므로 중요하다. |
| `4ef4beeb8611` | `test(game): 결정적 simulation 검증` | A | SIMULATION, REALTIME, TEST | 추출된 simulation과 AI에 deterministic 및 immutability 보장을 확립한다. | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 simulation 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `aa5d6a338690` | `refactor(game): 게임 방 상태 전이 모델링` | S | REALTIME, ARCH, RISK | readiness, play, pause, reconnection, completion을 위한 명시적인 room-session state machine을 도입한다. | reconnect deadline과 forfeit semantics를 포함한 room lifecycle을 명시적인 state machine으로 정의하므로 핵심적이다. 이후 transient socket loss와 terminal match completion을 구분하는 중심 모델이 된다. |
| `4026c3bf72ad` | `test(game): 게임 방 상태 전이 검증` | B | REALTIME, OPERATIONS, TEST | 유효한 room-session transition과 reconnection boundary condition을 고정한다. | 이미 정립된 realtime 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `09c0bfec6111` | `refactor(game): GameHub room에 simulation 상태 연결` | B | SIMULATION, REALTIME, PERSISTENCE | 새로 생성되는 모든 game room에 `PongSimulationState`를 연결하고 해당 state에서 initial public snapshot을 파생한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 simulation 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `cf14c4052310` | `refactor(game): GameHub frame 계산을 simulation에 위임` | S | SIMULATION, ARCH, REALTIME | `GameHub` 내부에서 직접 수행하던 frame physics를 explicit 50ms timestep의 `PongSimulation.step` 호출로 교체한다. | `GameHub`의 mutable physics code에서 `PongSimulation`으로 소유권 이전을 완료하므로 핵심적이다. 중앙 아키텍처를 확정해 hub는 transport와 persistence를 orchestration하고, simulation만 game mechanics를 소유하도록 한다. |
| `a4983f0ebbb2` | `refactor(game): GameHub에 결정적 AI controller 연결` | B | SIMULATION, REALTIME | NPC room마다 하나의 seeded `PongAi` controller를 생성한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 simulation 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `2cef070188ac` | `refactor(game): GameHub의 중복 물리 계산 제거` | B | SIMULATION, REALTIME | hub를 `PongSimulation`과 `PongAi`로 migration한 뒤 legacy physics, AI profile, prediction, pseudo-random, collision, serve reset, acceleration helper를 삭제한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 simulation 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `353ca9a17415` | `fix(web): browser token 저장 제거` | A | AUTH, PROTOCOL, REALTIME | web application에서 browser가 관리하던 session token을 제거한다. | 겉으로 드러난 증상만 가리는 대신 실패를 소유하는 계층에서 중요한 auth 불변식을 복구했으므로 중요하다. |
| `2aa5fbca9890` | `test(web): cookie 기반 API 경계 검증` | B | AUTH, REALTIME, WEB | cookie-only 및 runtime-validated client boundary를 중심으로 web API test를 확장한다. | 이미 정립된 auth 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `d9bde7485719` | `feat(auth): WebSocket ticket 생성과 HTTP 계약 정의` | A | AUTH, PROTOCOL, REALTIME | one-time WebSocket credential의 cryptographic/protocol 표현을 정의한다. | 중요한 auth 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `c89a455fee06` | `feat(db): PostgreSQL WebSocket ticket 저장 추가` | A | AUTH, SIMULATION, REALTIME | hash된 WebSocket ticket을 위한 durable PostgreSQL storage를 추가한다. | 중요한 auth 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `4cf1bff6652e` | `feat(db): memory WebSocket ticket 소비 구현` | B | AUTH, REALTIME, PERSISTENCE | repository contract와 in-memory 구현에 PostgreSQL과 동일한 ticket 생성/소비 operation을 추가한다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `306d1946afb7` | `feat(auth): ticket 기반 WebSocket 인증 연결` | S | AUTH, REALTIME, RISK | authenticated HTTP endpoint에서 ticket을 발급하고 socket handshake에서 이를 소비하도록 해 WebSocket authentication flow를 완성한다. | WebSocket upgrade 중 durable session이 노출되는 방식을 atomic하게 소비되는 short-lived ticket과 bounded pre-authentication buffering으로 대체하므로 핵심적이다. HTTP identity와 realtime transport 사이의 authentication handoff를 정의한다. |
| `b0ee833313c1` | `test(auth): WebSocket ticket 경계 검증` | A | AUTH, PROTOCOL, REALTIME | one-time WebSocket credential 경계를 end-to-end와 repository 수준에서 검증한다. | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 auth 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `ec9cb39babef` | `fix(log): 요청 비밀 정보 redaction 적용` | A | AUTH, REALTIME, OBSERVABILITY | Fastify request logging에서 authentication material을 제외하도록 설정한다. | 겉으로 드러난 증상만 가리는 대신 실패를 소유하는 계층에서 중요한 auth 불변식을 복구했으므로 중요하다. |
| `aadc99ba6b47` | `test(log): 비밀 정보 masking 규칙 검증` | B | AUTH, OBSERVABILITY, TEST | request serialization에서 `/ws` path는 유지하되 ticket이 포함된 query string은 버리고 serialized output 어디에도 raw ticket value가 남지 않는지 검증한다. | 이미 정립된 auth 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `7d3437c49152` | `feat(protocol): versioned game snapshot 계약 정의` | A | PROTOCOL, SIMULATION, REALTIME | compile-time에만 존재하던 game interface를 strict runtime schema로 교체하고 snapshot을 명시적인 transport model로 재구성한다. | 중요한 protocol 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `0595a386000a` | `feat(protocol): versioned WebSocket event codec 연결` | S | PROTOCOL, REALTIME, ARCH | 모든 client/server WebSocket event를 strict runtime-validated version-1 message로 만든다. | realtime wire format을 양방향 모두에 적용되는 하나의 strict, versioned, executable contract로 만들기 때문에 핵심적이다. ordering, validation, error code, future compatibility가 unchecked JSON assertion이 아니라 이 경계에 의존하게 된다. |
| `4bf44dbe8f09` | `test(protocol): versioned event codec 기대값 정렬` | B | PROTOCOL, REALTIME, TEST | protocol test를 strict version-1 event contract에 맞춘다. | 이미 정립된 protocol 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `b4c6a75b25c9` | `feat(game): versioned outbound event 송신 경계 연결` | A | PROTOCOL, REALTIME, PERSISTENCE | protocol version 부착을 GameHub send 경계에 중앙화한다. | 중요한 protocol 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `79ff1f9d3950` | `feat(game): GameHub snapshot envelope 초기화` | B | PROTOCOL, SIMULATION, REALTIME | 각 GameHub room을 versioned snapshot 표현으로 initialize한다. | 이미 정립된 protocol 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `cc54bea61187` | `feat(game): GameHub snapshot 상태 소비를 전환` | B | PROTOCOL, SIMULATION, REALTIME | GameHub의 room lifecycle과 result handling을 versioned protocol에서 도입한 nested snapshot state로 migration한다. | 이미 정립된 protocol 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `1567f5005ef8` | `feat(game): room별 input sequence 중복을 차단` | A | SIMULATION, REALTIME, PERSISTENCE | client와 room별로 마지막으로 accepted된 가장 높은 input sequence를 따로 추적한다. | 중요한 simulation 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `a3a5eb68eb78` | `feat(game): realtime 오류 code를 명시` | B | PROTOCOL, REALTIME, TOURNAMENT | realtime failure에 localized message만 노출하지 않고 안정적인 machine-readable code를 붙인다. | 이미 정립된 protocol 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `cc7505fba6f7` | `feat(game): 영속 경기 결과 metadata를 송신` | B | REALTIME, PERSISTENCE | 성공적으로 기록된 game result를 broadcast하기 전에 `persisted: true`로 표시한다. | 이미 정립된 realtime 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `833c586450e8` | `feat(web): lobby realtime event codec 소비` | B | PROTOCOL, REALTIME, WEB | lobby realtime 경계를 unchecked JSON type assertion에서 shared server-event parser로 이동한다. | 이미 정립된 protocol 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `8a8787d03a19` | `feat(play): versioned game input과 snapshot 소비` | A | PROTOCOL, SIMULATION, REALTIME | play page를 versioned realtime contract로 migration한다. | 중요한 protocol 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `868ced55a626` | `refactor(web): PongCanvas snapshot state 렌더링` | B | SIMULATION, REALTIME, WEB | PongCanvas와 interpolation buffer를 nested snapshot 표현에 맞춘다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 simulation 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `f655969b0d36` | `test(protocol): versioned realtime contract 검증` | A | PROTOCOL, REALTIME, PERSISTENCE | migration 후 더 이상 허용해서는 안 되는 shape에 대한 negative protocol case를 추가한다. | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 protocol 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `75bbc762e06d` | `feat(db): match result key와 rating history schema 추가` | A | PERSISTENCE, RISK | idempotent match finalization과 감사 가능한 rating change를 위한 persistent foundation을 도입한다. | 중요한 persistence 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `08f69b6907de` | `feat(db): 경기 확정 command 계약 정의` | B | PERSISTENCE, TOURNAMENT | match finalization을 하나의 logical command로 표현하는 repository-level input/output contract를 정의한다. | 이미 정립된 persistence 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `83f9aee2522a` | `feat(db): PostgreSQL 경기 결과 중복 생성을 차단` | A | PERSISTENCE, RISK | unique result key를 중심으로 PostgreSQL match finalization을 구현한다. | 중요한 persistence 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `e9d577ebc1ab` | `feat(db): PostgreSQL 참가자 rating을 원자적으로 반영` | A | PERSISTENCE | 성공한 PostgreSQL finalization에서 match row, participant counter, current rating, rating-history record를 하나의 transaction으로 commit하도록 확장한다. | 중요한 persistence 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `e338ea32b2a6` | `feat(db): PostgreSQL tournament 경기 확정을 연결` | S | PERSISTENCE, TOURNAMENT, RISK | PostgreSQL match-finalization transaction 안에 tournament progression을 포함한다. | match persistence, rating effect, bracket linkage, finalist creation, tournament completion을 하나의 lock된 transaction으로 묶으므로 핵심적이다. retry와 concurrency 상황에서 프로젝트의 가장 중요한 cross-domain consistency gap을 해소한다. |
| `bf652cf5984f` | `feat(db): memory 경기 결과 중복 생성을 차단` | B | PERSISTENCE, TOURNAMENT | in-memory repository에 idempotent match finalization을 도입한다. | 이미 정립된 persistence 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `8ece656dafed` | `feat(db): memory 참가자 rating을 원자적으로 반영` | B | PERSISTENCE, TOURNAMENT | in-memory finalization operation 안에서 participant statistic과 rating change를 함께 적용한다. | 이미 정립된 persistence 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `c354c5a99197` | `feat(db): memory tournament 경기 확정을 연결` | B | REALTIME, PERSISTENCE, TOURNAMENT | in-memory match finalization을 확장해 같은 domain operation 안에서 tournament progression도 갱신한다. | 이미 정립된 realtime 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `bdeb6e4cf1d2` | `refactor(db): 기존 match 생성을 원자적 확정으로 위임` | B | PERSISTENCE | 모든 match 생성이 atomic finalization이라는 하나의 implementation path를 사용하도록 한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 persistence 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `582a1615a2c6` | `test(db): 경기 결과 단일 확정 조건 검증` | A | PERSISTENCE, TOURNAMENT, RISK | repetition, concurrency, partial failure 상황에서 repository match-finalization 경계를 검증한다. | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 persistence 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `10bf15723591` | `refactor(game): 경기 결과 확정 boundary 사용` | A | REALTIME, PERSISTENCE, TOURNAMENT | match를 따로 생성한 뒤 tournament state를 갱신하지 않고 room completion을 repository의 atomic match-finalization 경계로 전달한다. | 동작을 보존하면서 realtime의 소유권, 상태, 의존성 경계를 실질적으로 바꾸고 복잡한 메커니즘을 독립적으로 강제할 수 있게 했으므로 중요하다. |
| `17e7dab21a55` | `test(smoke): cookie 기반 realtime protocol 검증` | B | AUTH, PROTOCOL, SIMULATION | end-to-end 및 smoke verification을 cookie-based authentication과 versioned realtime protocol에 맞춘다. | 이미 정립된 auth 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `1bf328ce92a5` | `refactor(web): game input 직렬화 경계 분리` | B | WEB | keyboard 해석을 play component에서 pure input helper로 추출한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 web 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `ffcbdd403a06` | `refactor(web): game connection 상태 reducer 분리` | B | REALTIME, WEB | 동작을 옮기기 전에 browser game connection을 명시적인 state/action model로 정의한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 realtime 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `d8311e74373e` | `refactor(web): game connection 전이 규칙 완성` | A | REALTIME, WEB, OPERATIONS | browser-side authoritative state machine 역할을 하도록 game connection reducer를 완성한다. | 동작을 보존하면서 realtime의 소유권, 상태, 의존성 경계를 실질적으로 바꾸고 복잡한 메커니즘을 독립적으로 강제할 수 있게 했으므로 중요하다. |
| `bfded21cd1ac` | `refactor(web): GameSocketClient 연결 수명주기 분리` | A | AUTH, REALTIME, WEB | connection replacement와 teardown을 소유하는 transport-neutral `GameSocketClient`를 도입한다. | 동작을 보존하면서 auth의 소유권, 상태, 의존성 경계를 실질적으로 바꾸고 복잡한 메커니즘을 독립적으로 강제할 수 있게 했으므로 중요하다. |
| `92ad229a23d3` | `refactor(web): GameSocketClient 메시지 처리를 분리` | A | AUTH, PROTOCOL, SIMULATION | message handling을 `GameSocketClient`로 이동해 하나의 object가 ticket-to-socket 전체 lifecycle을 소유하도록 한다. | 동작을 보존하면서 auth의 소유권, 상태, 의존성 경계를 실질적으로 바꾸고 복잡한 메커니즘을 독립적으로 강제할 수 있게 했으므로 중요하다. |
| `9d70eb12e1d7` | `refactor(web): game connection hook 상태 연결` | B | AUTH, REALTIME, TOURNAMENT | React hook 뒤에서 `GameSocketClient`와 connection reducer를 조합한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 auth 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `748079c73eea` | `refactor(web): game connection hook 명령 연결` | B | PROTOCOL, SIMULATION, REALTIME | `useGameConnection`을 connection initiator에서 active match용 command 경계로 확장한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 protocol 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `c33412d639c5` | `refactor(play): connection hook 전환 경계 준비` | B | PERSISTENCE, WEB | 기존 implementation을 아직 제거하지 않은 상태에서 play-page 경계에 `useGameConnection`과 shared input helper를 도입한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 persistence 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `898d0884ee37` | `refactor(play): 자동 경기 진입을 connection hook으로 전환` | B | REALTIME, TOURNAMENT, WEB | URL-driven queue, AI, tournament entry를 play page의 legacy connection function 대신 `useGameConnection`으로 전달한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 realtime 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `9a67234633b4` | `refactor(play): 경기 상태와 명령을 connection hook에 연결` | B | REALTIME, PERSISTENCE, WEB | `useGameConnection`을 rendered room, snapshot, lifecycle notice, opponent, chat history, command availability의 source로 사용하면서 page migration을 시작한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 realtime 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `1ae6fa7836d8` | `feat(play): keyboard와 touch paddle 입력 연결` | B | PROTOCOL, SIMULATION, REALTIME | 현재 key state를 계속 재전송하지 않고 keyboard/mobile pointer control을 transition-based paddle command에 연결한다. | 이미 정립된 protocol 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `31b5122add6f` | `refactor(play): legacy paddle input loop 제거` | B | SIMULATION, REALTIME, WEB | paddle input이 새 connection client를 통하게 된 뒤 component-local keyboard state와 50ms command loop를 제거한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 simulation 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `fa35e8d15b4e` | `refactor(play): legacy WebSocket lifecycle 제거` | B | AUTH, PROTOCOL, REALTIME | 전용 connection layer가 동일한 작업을 수행할 수 있게 된 뒤 play component의 inline WebSocket lifecycle을 제거한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 auth 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `365d66c72343` | `refactor(play): legacy 경기 명령 제거` | B | PROTOCOL, REALTIME, WEB | ready, match chat, pause/resume, socket shutdown command가 connection hook을 통해 제공된 뒤 play page의 직접 implementation을 삭제한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 protocol 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `06664abbae7f` | `refactor(play): legacy socket 상태 제거` | B | AUTH, PROTOCOL, REALTIME | `useGameConnection`이 authoritative owner가 된 뒤 play page의 duplicate WebSocket 및 game-state field를 제거한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 auth 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `9faada0df1d7` | `refactor(play): connection hook 전환 마무리` | A | PROTOCOL, REALTIME, TOURNAMENT | play screen을 `useGameConnection` 뒤로 완전히 이동해 page가 hook 주변의 adapter alias를 유지하지 않고 하나의 state object와 안정적인 connection command 집합을 사용하도록 한다. | 동작을 보존하면서 protocol의 소유권, 상태, 의존성 경계를 실질적으로 바꾸고 복잡한 메커니즘을 독립적으로 강제할 수 있게 했으므로 중요하다. |
| `b5691b01a09b` | `test(web): game connection lifecycle 검증` | A | AUTH, PROTOCOL, REALTIME | browser game connection을 느슨하게 연결된 callback 집합이 아니라 명시적인 lifecycle로 고정한다. | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 auth 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `ffb0a8275a4f` | `feat(db): friendship canonical pair 제약 추가` | A | PERSISTENCE, RISK | 방향성이 있던 friendship row를 unordered user pair당 하나의 canonical relationship으로 migration한다. | 중요한 persistence 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `3aa5958bb967` | `feat(db): tournament seed 제약 추가` | B | PERSISTENCE, TOURNAMENT | seed uniqueness를 persistent tournament invariant로 확립한다. | 이미 정립된 persistence 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `77c555aba9a0` | `feat(db): PostgreSQL friendship 요청을 원자화` | A | PERSISTENCE, RISK | canonical unordered user pair에 대한 하나의 PostgreSQL upsert로 전체 friendship-request transition을 표현한다. | 중요한 persistence 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `d9a6d8dd8950` | `feat(db): PostgreSQL tournament 참가를 원자화` | A | PERSISTENCE, TOURNAMENT, RISK | tournament row lock으로 serialize되는 하나의 transaction으로 tournament admission을 처리한다. | 중요한 persistence 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `34db79005f30` | `feat(db): memory friendship invariant 적용` | B | PERSISTENCE | in-memory repository에서 caller별 `FriendSummary` 하나를 저장하는 대신 두 user 식별자 사이의 relationship으로 friendship을 모델링한다. | 이미 정립된 persistence 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `efdb5c3a4932` | `feat(db): memory tournament 참가자 원본 검증` | B | PERSISTENCE, TOURNAMENT | public entry projection을 만들기 전에 in-memory repository의 canonical user store를 기준으로 tournament entrant를 검증한다. | 이미 정립된 persistence 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `cdaca35ccf7f` | `test(db): friendship와 tournament 경쟁 상태 검증` | A | PERSISTENCE, TOURNAMENT, RISK | 두 repository 구현에서 repeated, reversed, concurrent operation 상황에도 friendship identity와 tournament capacity가 올바르게 유지되는지 검증한다. | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 persistence 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `3a2943ff385d` | `feat(game): fixed-step scheduler 추가` | A | SIMULATION, REALTIME, OBSERVABILITY | elapsed wall-clock time과 simulation update를 분리하는 fixed-step accumulator를 도입한다. | 중요한 simulation 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `0888e119036d` | `test(game): fixed-step 보정 범위 검증` | B | SIMULATION, REALTIME, TEST | elapsed monotonic time이 fixed 50ms simulation work로 변환되는 방식을 검증한다. | 이미 정립된 simulation 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `10a656e59864` | `feat(game): WebSocket heartbeat 추가` | A | REALTIME, RISK | realtime connection용 명시적인 heartbeat lifecycle을 도입한다. | 중요한 realtime 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `81031dcd2c1c` | `test(game): heartbeat timeout 검증` | B | REALTIME, TEST | deterministic clock으로 connection heartbeat의 timing contract를 고정한다. | 이미 정립된 realtime 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `207df3f47935` | `feat(game): 입력 순서와 rate limit 보호` | A | SIMULATION, REALTIME, RISK | sequence ordering과 per-user token-bucket throttling을 결합한 input gate를 도입한다. | 중요한 simulation 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `1353e3eb99cc` | `test(game): input gate 제한 검증` | B | REALTIME, TEST | realtime input admission의 두 측면, 즉 room별 단조 증가 command와 user별 token-bucket budget을 검증한다. | 이미 정립된 realtime 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `8589ff3c4821` | `feat(game): latest snapshot buffer 추가` | A | SIMULATION, REALTIME, OPERATIONS | game snapshot용 latest-value outbound buffer를 도입한다. | 중요한 simulation 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `125aa113a01c` | `test(game): snapshot replacement와 congestion 검증` | A | REALTIME, PERF, RISK | 제어된 socket state와 time을 사용해 snapshot buffer의 loss/termination rule을 검증한다. | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 realtime 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `a6a1f4fba60e` | `feat(game): fixed-step scheduler를 GameHub에 연결` | A | SIMULATION, REALTIME, OBSERVABILITY | room별 direct interval을 simulation time의 owner인 fixed-step scheduler로 교체한다. | 중요한 simulation 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `fc2a4451eed1` | `feat(game): heartbeat와 input gate를 GameHub에 연결` | A | PROTOCOL, REALTIME, RISK | connection heartbeat와 input gate를 GameHub client lifecycle에 연결한다. | 중요한 protocol 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `49ca3e778801` | `feat(game): latest snapshot buffer를 GameHub에 연결` | A | PROTOCOL, REALTIME, RISK | high-frequency game snapshot은 각 client의 latest-value buffer를 통해 보내고 control/lifecycle event는 일반 send path를 유지한다. | 중요한 protocol 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `400ea1589260` | `test(game): GameHub runtime 제한 검증` | B | PROTOCOL, REALTIME, TEST | gate abstraction 내부만이 아니라 완전한 realtime 경계에서 input throttling을 검증한다. | 이미 정립된 protocol 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `3b1a9a1ca265` | `build(web): React Query 의존성 추가` | C | - | TanStack React Query를 web application의 server-state dependency로 추가하고 resolved query-core 및 React peer graph를 workspace lockfile에 기록한다. | 브랜치 전체 이력에서 보면 기계적인 dependency 또는 patch-level 유지보수 업데이트이므로 중요도가 낮다. |
| `73b8ce0f0c26` | `refactor(db): repository user projection 타입 정렬` | B | AUTH, PERSISTENCE | in-memory repository가 보관하는 user에 별도 memory-only alias 대신 canonical `UserProjectionRow`를 사용한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 auth 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `3d0ae79affd5` | `refactor(db): memory match record 계약 정렬` | B | PERSISTENCE | in-memory match record가 write command를 상속하던 구조를 명시적인 stored shape로 교체한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 persistence 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `3e3f21129369` | `refactor(db): canonical row schema 타입 정렬` | B | PERSISTENCE, TOURNAMENT | database enum과 row projection의 TypeScript 표현을 중앙화한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 persistence 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `212650b2863d` | `refactor(db): row mapper record 타입 정렬` | B | PERSISTENCE, TOURNAMENT | tournament-match record mapper에 canonical database row type에서 round/status를 파생하는 명시적인 view type을 부여한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 persistence 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `9b62117a6909` | `refactor(db): seed profile 경계를 canonical 형태로 정렬` | C | - | seed-profile declaration과 NPC upsert를 repository의 canonical multi-line 형식으로 확장한다. | 동작이나 소유권에 실질적인 영향 없이 가독성 또는 formatting 정리가 diff의 주된 내용이므로 중요도가 낮다. |
| `45144a3719bc` | `refactor(db): dashboard와 friendship 조회 경계 정렬` | B | PERSISTENCE | recent-match 조회의 optional SQL fragment를 두 개의 명시적인 query shape로 교체한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 persistence 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `d8050004e4ce` | `refactor(db): PostgreSQL match 확정 core 정렬` | C | - | core PostgreSQL match-finalization statement를 재구성해 idempotency key, existing-match readback, participant row lock, rating update, rating-history value를 각각 독립적으로 검토하기 쉽게 한다. | 동작이나 소유권에 실질적인 영향 없이 가독성 또는 formatting 정리가 diff의 주된 내용이므로 중요도가 낮다. |
| `d2329e8dfc1d` | `refactor(db): tournament match 확정 연결 정렬` | C | - | transactional tournament-match finalization SQL을 재구성해 row lock, idempotency predicate, result linkage, semifinal winner selection, final insertion, tournament completion update를 더 쉽게... | 동작이나 소유권에 실질적인 영향 없이 가독성 또는 formatting 정리가 diff의 주된 내용이므로 중요도가 낮다. |
| `7926b1366993` | `refactor(db): PostgreSQL chat과 tournament CRUD 정렬` | C | - | PostgreSQL chat/tournament CRUD path를 재구성해 join, predicate, returned column, state update, result lookup이 각각 별도 단계로 보이도록 한다. | 동작이나 소유권에 실질적인 영향 없이 가독성 또는 formatting 정리가 diff의 주된 내용이므로 중요도가 낮다. |
| `ce41a880d6c6` | `refactor(db): PostgreSQL tournament helper와 admin 경계 정렬` | B | PERSISTENCE, TOURNAMENT | row mapper를 호출하기 전에 left player, right player, winner를 resolve하는 PostgreSQL tournament-match assembly helper를 추출한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 persistence 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `5c8659ea233b` | `refactor(db): tournament relation mapper 계약 정렬` | B | PERSISTENCE, TOURNAMENT | tournament mapping을 row와 entry, match summary, winner를 포함하는 명시적인 related-data object의 조립으로 재정의한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 persistence 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `1b60b0a79963` | `refactor(db): memory repository 조회 경계 정렬` | C | - | in-memory repository의 NPC, leaderboard, dashboard query code를 더 명확한 multi-line pipeline과 object construction으로 재구성한다. | 동작이나 소유권에 실질적인 영향 없이 가독성 또는 formatting 정리가 diff의 주된 내용이므로 중요도가 낮다. |
| `f77e317de4c1` | `refactor(db): memory match completion과 admin 경계 정렬` | B | REALTIME, PERSISTENCE, TOURNAMENT | in-memory repository에 tournament match와 owning tournament를 함께 반환하는 helper 하나를 만들고 completion에서 이 paired result를 사용한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 realtime 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `9d64ea406b03` | `refactor(db): memory tournament 확정 경계 정렬` | B | PERSISTENCE, TOURNAMENT | tournament aggregate와 해당 match를 함께 담은 하나의 lookup result를 중심으로 in-memory tournament-finalization path를 통합한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 persistence 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `b34fdaa1e9c2` | `refactor(db): memory chat과 tournament 진입 경계 정렬` | B | PERSISTENCE, TOURNAMENT | in-memory repository의 chat/tournament method를 database implementation과 동일한 typed domain boundary에 맞춘다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 persistence 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `dc0e60e6aa35` | `test(db): database row mapping contract 검증` | B | PERSISTENCE, TOURNAMENT, TEST | relational row를 shared API domain shape로 변환하는 contract를 고정한다. | 이미 정립된 persistence 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `8f64dfc117f3` | `feat(game): 게임 방 상태를 RoomSession에 연결` | A | SIMULATION, REALTIME | public snapshot phase를 직접 mutate하지 않고 `RoomSession`을 room lifecycle transition의 authority로 만든다. | 중요한 simulation 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `a06d1705bbc9` | `feat(game): 사용자별 active connection 교체` | S | REALTIME, ARCH, RISK | user당 하나의 authoritative realtime connection만 허용한다. | identity마다 하나의 authoritative realtime connection만 허용하고 socket replacement를 room을 보존하는 atomic handoff로 수행하므로 핵심적이다. 두 transport가 한 player를 동시에 제어하는 것을 막고 안정적인 reconnect의 기반을 만든다. |
| `c98d4b1e8b43` | `feat(game): 예약된 room connection 복구` | A | SIMULATION, REALTIME | 새로 authenticated된 socket을 동일 user에게 예약된 room side에 reconnect한다. | 중요한 simulation 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `e593b1dd9fcd` | `feat(game): reconnect 예약 만료와 room 정리` | A | SIMULATION, REALTIME, RISK | 즉시 disconnect forfeit을 적용하지 않고 bounded room reservation으로 교체한다. | 중요한 simulation 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `113e39acc85c` | `test(game): reconnect 복구 동작 검증` | A | REALTIME, PERSISTENCE, RISK | realtime recovery contract에 deterministic integration coverage를 추가한다. | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 realtime 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `aed88c8a93e0` | `perf(game): scheduler benchmark 실행 경계 추가` | B | REALTIME, OBSERVABILITY, PERF | room-step work와 50ms cadence는 동일하게 유지하면서 scheduler topology만 분리해 측정하는 standalone benchmark를 추가한다. | 이미 정립된 realtime 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `8d24b5e70837` | `perf(game): scheduler benchmark 측정 결과 출력` | B | REALTIME, OBSERVABILITY, PERF | scheduler load script를 구조 없는 timing experiment가 아니라 재현 가능한 comparison report로 만든다. | 이미 정립된 realtime 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `d21a47ee92d2` | `refactor(game): shared room scheduler 추가` | A | SIMULATION, REALTIME, REFACTOR | 하나의 fixed-step clock으로 모든 active room을 구동할 수 있는 scheduler abstraction을 도입한다. | 동작을 보존하면서 simulation의 소유권, 상태, 의존성 경계를 실질적으로 바꾸고 복잡한 메커니즘을 독립적으로 강제할 수 있게 했으므로 중요하다. |
| `518a8368e28f` | `test(game): shared room scheduler 검증` | B | REALTIME, TEST | deterministic time으로 scheduler의 central ownership guarantee를 검증한다. | 이미 정립된 realtime 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `e000e3d6a460` | `refactor(web): query key와 retry 정책 정의` | B | AUTH, TOURNAMENT, WEB | 개별 screen을 migration하기 전에 cache vocabulary를 정의한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 auth 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `d05a962d8829` | `refactor(web): session query와 cache invalidation 추가` | A | TOURNAMENT, WEB, OBSERVABILITY | 각 server projection용 reusable query option을 정의한다. | 동작을 보존하면서 tournament의 소유권, 상태, 의존성 경계를 실질적으로 바꾸고 복잡한 메커니즘을 독립적으로 강제할 수 있게 했으므로 중요하다. |
| `80ec34fde74c` | `refactor(web): React Query provider 연결` | B | AUTH, WEB, OBSERVABILITY | application root에 하나의 `QueryClient`를 설치하고 browser server state의 lifecycle owner로 만든다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 auth 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `931800f796e1` | `refactor(web): lobby와 login을 query cache로 전환` | B | AUTH, REALTIME, WEB | lobby와 login state를 shared query client로 이동해 HTTP load, WebSocket event, authentication mutation이 같은 server-data owner를 갱신하도록 한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 auth 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `8a44c23f15de` | `refactor(web): dashboard와 leaderboard를 query cache로 전환` | B | WEB | dashboard와 leaderboard를 component-owned fetch effect에서 shared query cache로 이동한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 web 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `e2ccee689642` | `refactor(web): profile 조회를 query cache로 전환` | B | WEB | handle-scoped profile loading을 shared query cache로 이동하고 resolve된 route parameter를 직접 query identity로 사용한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 web 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `045d0cd2c171` | `refactor(web): tournament 조회와 mutation을 query cache로 전환` | B | TOURNAMENT, WEB | tournament/current-user read를 shared query로 이동하고 create/join command를 독립 mutation으로 표현한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 tournament 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `0b1a6bcb4311` | `refactor(web): admin 조회와 mutation을 query cache로 전환` | B | AUTH, WEB | administrator user와 audit action을 shared query cache로 옮기고 status change를 mutation으로 모델링한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 auth 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `0e0c9645ab2d` | `refactor(web): shell의 session 소비를 query cache로 통합` | B | AUTH, WEB | application shell이 private `getMe` effect와 local state를 유지하지 않고 browser 나머지와 동일한 cached session query를 사용하도록 한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 auth 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `1ebdce4cdf0a` | `test(web): query cache key·retry·invalidation 검증` | A | AUTH, TOURNAMENT, WEB | browser cache를 명시적인 data-consistency contract로 고정한다. | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 auth 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `cacd4c22d705` | `feat(guest): signed guest session token 정의` | A | AUTH, PERSISTENCE | transient guest용 self-contained signed session 표현을 도입한다. | 중요한 auth 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `69d33d31e6e0` | `feat(guest): guest 요청 rate limit 추가` | B | AUTH | guest-session 생성에 client address별 sliding-window limit을 추가한다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `cba7f0a1e8ca` | `feat(guest): guest WebSocket ticket 발급 추가` | B | AUTH, SIMULATION, REALTIME | guest session용 database-free WebSocket admission token을 추가한다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `17a1dd501b1b` | `feat(guest): guest resource lease 수명주기 추가` | A | AUTH, PROTOCOL, REALTIME | resource limit이 ticket 발급 시점이 아니라 실제 socket lifetime을 따르도록 live guest connection에 명시적인 lease를 추가한다. | 중요한 auth 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `f801ccd09cf0` | `feat(guest): guest runtime 환경 경계 구성` | A | AUTH, WEB | runtime configuration contract에 application mode와 명시적인 proxy-trust switch를 추가하고 browser build에도 같은 public mode를 노출한다. | 중요한 auth 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `e16efe65d8ea` | `feat(shared): guest HTTP 응답 계약 추가` | B | AUTH, PROTOCOL, WEB | guest-login response용 shared runtime contract를 추가한다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `eaedf3a41528` | `feat(api): guest access runtime 구성` | B | AUTH, PERSISTENCE | guest access를 API application의 명시적인 runtime dependency로 만든다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `a5c06c561e00` | `feat(guest): guest session과 WebSocket 인증 연결` | A | AUTH, REALTIME, PERSISTENCE | database user/session을 만들지 않고 transient guest identity를 HTTP와 WebSocket authentication에 통합한다. | 중요한 auth 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `27ddc3fca2f1` | `feat(guest): guest 조회 범위와 lobby 격리` | A | AUTH, PERSISTENCE, TOURNAMENT | guest/demo traffic의 read-side isolation rule을 정의한다. | 중요한 auth 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `1d251193efc4` | `feat(guest): 등록 사용자 전용 route 접근 정책 적용` | B | AUTH, PERSISTENCE, TOURNAMENT | authentication이 guest까지 일반화된 이후 HTTP route에 registered-account capability 경계를 적용한다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `2586ad26a3b2` | `feat(game): GameHub guest identity와 기능 차단 연결` | B | AUTH, PROTOCOL, REALTIME | realtime hub identity type에 transient guest를 포함하면서 message dispatch 단계에서 축소된 capability set을 강제한다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `77a7c205ccd0` | `feat(game): guest matchmaking과 room을 격리` | A | REALTIME, PERSISTENCE, RISK | session kind별로 matchmaking을 분리해 transient guest가 registered user와 pair되지 않도록 한다. | 중요한 realtime 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `eaa4fdaba361` | `feat(game): guest 경기 결과 영속화 차단과 임시 보존` | A | SIMULATION, REALTIME | guest match completion을 registered persistence pipeline과 분리한다. | 중요한 simulation 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `bfa4be01a513` | `feat(api): guest resource lifecycle startup 연결` | B | AUTH | validated runtime environment를 application construction에 연결해 deployment configuration에 따라 guest behavior를 활성화하고 제한한다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `1fa59d2dbadb` | `test(auth): guest auth boundary 기대값 정렬` | C | - | 새로 강제되는 guest signing-key requirement를 만족하도록 authentication-boundary fixture를 갱신한다. | 프로젝트의 주요 엔지니어링 결정을 이해하는 데 기여가 작고 일상적인 유지보수 또는 임시 presentation scaffolding에 해당하므로 중요도가 낮다. |
| `52893b8dd1c8` | `test(guest): 격리된 guest session 경계 검증` | A | AUTH, REALTIME, PERSISTENCE | 격리된 guest-session model에 end-to-end regression coverage를 확립한다. | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 auth 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `f877ff676d65` | `test(auth): guest session secret 요구 검증` | B | AUTH, TEST | guest session을 signing하는 cryptographic key에 startup regression을 추가한다. | 이미 정립된 auth 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `38956034ea17` | `test(guest): 위조 client address 거부` | A | AUTH, PERSISTENCE, TOURNAMENT | guest mode의 network 및 data-exposure boundary를 검증한다. | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 auth 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `e39316254e44` | `feat(web): 비회원 체험 정책 경계 추가` | B | WEB | 비회원 demo surface를 위한 하나의 browser-side policy module을 도입한다. | 이미 정립된 web 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `a9fc8a8328b2` | `feat(web): guest login API와 middleware 연결` | B | AUTH, PROTOCOL, TOURNAMENT | guest session을 생성하는 web client 경계를 추가하고 demo deployment가 registered-account screen을 제공하지 못하게 한다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `7fdef5d224c4` | `feat(web): LoginPanel guest 진입 연결` | B | WEB | public app이 demo mode일 때 login panel을 server-managed guest entry point에 연결한다. | 이미 정립된 web 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `584d17f3aad1` | `feat(web): guest lobby presentation 적용` | B | REALTIME, WEB | 중앙화된 guest presentation policy를 lobby에 적용해 demo mode가 durable progress나 지원하지 않는 interaction을 광고하지 않도록 한다. | 이미 정립된 realtime 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `658fafd43f88` | `feat(web): demo navigation 정책 연결` | B | WEB | application shell이 full authenticated menu를 무조건 구성하지 않고 중앙화된 demo navigation policy를 사용하도록 한다. | 이미 정립된 web 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `fe0f3e0ad0ad` | `feat(web): guest play presentation 적용` | B | WEB | demo mode에서 match chat이 disabled되어 있으면 숨기도록 guest presentation policy를 live match screen에 적용한다. | 이미 정립된 web 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `618330916629` | `test(web): 비회원 체험 진입 흐름 검증` | B | AUTH, WEB, TEST | guest experience 진입에 대한 browser-side contract를 검증한다. | 이미 정립된 auth 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `9f49db1d9f1d` | `test(guest): 체험 기능 오용 방지 검증` | A | AUTH, WEB, RISK | happy path만으로는 확인하기 어려운 abuse/isolation boundary를 중심으로 guest-mode test를 확장한다. | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 auth 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `fb5b1abc97f5` | `refactor(game): GameHub가 shared room scheduler 사용` | A | SIMULATION, REALTIME, REFACTOR | simulation timing ownership을 각 room에서 `GameHub`가 소유하는 하나의 scheduler로 이동한다. | 동작을 보존하면서 simulation의 소유권, 상태, 의존성 경계를 실질적으로 바꾸고 복잡한 메커니즘을 독립적으로 강제할 수 있게 했으므로 중요하다. |
| `69fb44d2f0ca` | `test(game): shared scheduler lifecycle 검증` | A | AUTH, SIMULATION, REALTIME | room recovery 중 scheduler ownership transition을 고정한다. | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 auth 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `37c735de0c37` | `build(shared): production package artifact 구성` | B | PROTOCOL | shared protocol package를 TypeScript source를 무조건 export하는 대신 compiled production dependency로 구성한다. | 프로젝트를 규정하는 메커니즘을 새로 도입하지 않고 이미 정립된 protocol 툴체인 또는 runtime path를 강화한 일반적인 지원 작업이다. |
| `430389943b34` | `build(db): production package artifact 구성` | B | PERSISTENCE | database workspace에 실제 production package 경계를 만든다. | 프로젝트를 규정하는 메커니즘을 새로 도입하지 않고 이미 정립된 persistence 툴체인 또는 runtime path를 강화한 일반적인 지원 작업이다. |
| `bb67a72882bf` | `build(app): API와 Web production artifact 구성` | A | PERSISTENCE, WEB, OPERATIONS | application workspace를 source-driven development execution에서 명시적인 production artifact 기반으로 전환한다. | 단순한 local tooling 편의가 아니라 프로젝트의 persistence 신뢰성 또는 deployability contract를 바꾸므로 중요하다. |
| `6ab091ffa815` | `test(build): production artifact 생성 검증` | B | PERSISTENCE, WEB, OPERATIONS | production runtime에 필요한 file을 대상으로 명시적인 post-build contract를 추가한다. | 이미 정립된 persistence 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `09b305b49768` | `ci(build): production artifact 검증 실행` | B | PERSISTENCE, WEB, OPERATIONS | workspace build 직후 CI에서 production-artifact verifier를 실행한다. | 프로젝트를 규정하는 메커니즘을 새로 도입하지 않고 이미 정립된 persistence 툴체인 또는 runtime path를 강화한 일반적인 지원 작업이다. |
| `2b274686e6d4` | `fix(guest): 체험 환경의 runtime 복구 제한` | A | AUTH, REALTIME, RISK | arbitrary client IP와 ticket request에 따라 무한히 커질 수 있던 guest runtime structure에 상한을 둔다. | 겉으로 드러난 증상만 가리는 대신 실패를 소유하는 계층에서 중요한 auth 불변식을 복구했으므로 중요하다. |
| `4f5199097284` | `fix(web): 중단된 game reconnect 복구` | A | AUTH, REALTIME, WEB | 중단된 game socket을 새 matchmaking request가 아니라 existing room의 continuation으로 복구한다. | 겉으로 드러난 증상만 가리는 대신 실패를 소유하는 계층에서 중요한 auth 불변식을 복구했으므로 중요하다. |
| `06d2eb7a93cc` | `test(guest): 체험 환경의 복구 경계 검증` | A | AUTH, SIMULATION, REALTIME | in-memory session이 안전하게 recovery할 수 있는 경계 전체로 guest-mode regression suite를 확장한다. | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 auth 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `6bf29a5acf35` | `build(api): metrics 수집 의존성 추가` | C | - | `prom-client`를 명시적인 API dependency로 추가하고 resolved workspace graph를 갱신한다. | 브랜치 전체 이력에서 보면 기계적인 dependency 또는 patch-level 유지보수 업데이트이므로 중요도가 낮다. |
| `30aac132e14e` | `feat(db): migration set 상태 검사 추가` | A | PERSISTENCE, OPERATIONS, RISK | bundle된 SQL migration 이름과 database에 적용된 Kysely migration record를 비교해 set을 current, pending, diverged로 분류한다. | 중요한 persistence 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `2f05d5d79c64` | `feat(db): repository readiness 경계 추가` | A | PERSISTENCE, OPERATIONS | API가 storage health를 implementation detail에서 추론할 필요가 없도록 repository contract에 readiness를 추가한다. | 중요한 persistence 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `15002e229acb` | `feat(ops): liveness와 readiness endpoint 추가` | A | PROTOCOL, PERSISTENCE, OPERATIONS | versioned response schema로 process liveness와 service readiness를 분리한다. | 중요한 protocol 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `6937cf60aeea` | `test(ops): health와 database readiness 검증` | B | AUTH, PERSISTENCE, OPERATIONS | liveness가 dependency readiness와 독립적으로 유지되고 legacy health response도 호환되는지 검증한다. | 이미 정립된 auth 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `4c7e884bc9b0` | `chore(logging): 민감한 요청 값을 redaction 대상에 추가` | B | AUTH, OBSERVABILITY | structured-log redaction 범위를 nested cookie, authorization, session-token, query, ticket field까지 확장한다. | 프로젝트를 규정하는 메커니즘을 새로 도입하지 않고 이미 정립된 auth 툴체인 또는 runtime path를 강화한 일반적인 지원 작업이다. |
| `69278d8fc456` | `feat(metrics): runtime gauge registry 추가` | B | REALTIME, OPERATIONS, OBSERVABILITY | Node runtime collector와 live GameHub gauge를 위한 전용 Prometheus registry를 만든다. | 이미 정립된 realtime 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `02b3b3a32f14` | `feat(metrics): HTTP와 readiness 측정 추가` | B | OPERATIONS, OBSERVABILITY, PERF | Prometheus scrape endpoint를 노출하고 raw URL 대신 정규화된 Fastify route template, method, status code를 사용해 HTTP request duration을 측정한다. | 이미 정립된 operations 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `843d355afc69` | `feat(metrics): repository operation 측정 추가` | B | PERSISTENCE, OBSERVABILITY | caller를 변경하지 않고 모든 synchronous/asynchronous operation을 측정하는 transparent proxy로 repository interface를 감싼다. | 이미 정립된 persistence 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `e08367a1be5e` | `feat(metrics): game room과 reconnect 관측 추가` | B | AUTH, PROTOCOL, REALTIME | game state machine 안에 logging/metrics를 직접 넣지 않고 GameHub lifecycle event 주변에 observer boundary를 추가한다. | 이미 정립된 auth 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `e850b3356b9b` | `feat(metrics): match finalization 결과 관측 추가` | B | REALTIME, PERSISTENCE, OBSERVABILITY | in-memory guest completion과 database-backed persistence를 구분하는 domain boundary에서 match finalization을 관측한다. | 이미 정립된 realtime 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `c0d184bcc928` | `feat(metrics): snapshot delivery와 drop 관측 추가` | B | REALTIME, OBSERVABILITY, PERF | delivery semantics가 실제 결정되는 latest-snapshot buffer 지점에 instrumentation을 추가한다. | 이미 정립된 realtime 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `685d85c863a4` | `test(metrics): database와 snapshot 지표 검증` | B | AUTH, REALTIME, PERSISTENCE | high-cardinality identifier를 metric label로 만들지 않으면서 database와 realtime-delivery behavior를 관찰할 수 있는지 검증한다. | 이미 정립된 auth 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `44ef3e07e1a5` | `feat(game): 새 작업 차단과 active room drain 추가` | A | PROTOCOL, REALTIME, TOURNAMENT | Fastify readiness boundary와 GameHub가 공유하는 명시적인 draining state를 도입한다. | 중요한 protocol 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `1c9981393973` | `feat(ops): graceful shutdown 절차 추가` | A | REALTIME, PERSISTENCE, OPERATIONS | SIGTERM/SIGINT용 single-entry graceful-shutdown handler를 설치한다. | 중요한 realtime 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `9d05f47e7f4b` | `test(ops): GameHub drain과 graceful shutdown 검증` | A | REALTIME, OPERATIONS, RISK | shutdown을 즉시 process exit가 아니라 bounded lifecycle transition으로 검증한다. | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 realtime 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `ff1bffcd5296` | `test(load): 실시간 부하 임계값 정의` | B | REALTIME, PERSISTENCE, OPERATIONS | load harness를 실행 가능한 service-level contract로 고정한다. | 이미 정립된 realtime 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `7b0b5f086b41` | `test(load): 실시간 fault injection 도구 추가` | A | AUTH, REALTIME, PERSISTENCE | configured connection population을 열고 live room을 생성하며 versioned input을 구동하고 ticket 기반 reconnection을 실행해 snapshot delay와 delivery gap을 측정하는 k6 realtime-load harness를... | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 auth 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `e1a0316fbe84` | `fix(api): startup seed 생성을 제거` | B | PERSISTENCE | API가 in-memory repository를 선택할 때 automatic seed creation을 제거한다. | 프로젝트의 주요 아키텍처나 lifecycle 모델을 실질적으로 바꾸지 않고 제한된 persistence 동작을 수정한 일반적인 보정 작업이다. |
| `5cac4843fd9b` | `test(api): startup seed 금지 검증` | B | REALTIME, TEST | API entrypoint가 `ensureSeedData`를 호출하지 않는다는 source-level guard를 추가해 process startup에서 implicit data mutation을 제거한다. | 이미 정립된 realtime 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `37a7b2e4611b` | `test(game): versioned match replay fixture 추가` | A | SIMULATION, REALTIME, TEST | initial state, fixed timestep, encoded input stream, 최종 simulation state의 expected SHA-256 hash를 포함하는 versioned 1,000-tick replay를 완전히 지정해 추가한다. | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 simulation 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `9693b2a9ad3d` | `build(runtime): Node.js engine version을 정확히 고정` | B | PERSISTENCE, OPERATIONS | workspace engine declaration을 모든 Node 24 release 허용에서 repository가 실제 사용하는 정확한 runtime version으로 변경한다. | 프로젝트를 규정하는 메커니즘을 새로 도입하지 않고 이미 정립된 persistence 툴체인 또는 runtime path를 강화한 일반적인 지원 작업이다. |
| `f8efb2656771` | `build(docker): production API image 구성` | B | PERSISTENCE, OPERATIONS | multi-stage API image와 제한된 Docker build context를 추가한다. | 프로젝트를 규정하는 메커니즘을 새로 도입하지 않고 이미 정립된 persistence 툴체인 또는 runtime path를 강화한 일반적인 지원 작업이다. |
| `656893e8e1cb` | `build(docker): production Web image 구성` | B | REALTIME, WEB, OPERATIONS | Next.js application용 multi-stage production image를 추가한다. | 프로젝트를 규정하는 메커니즘을 새로 도입하지 않고 이미 정립된 realtime 툴체인 또는 runtime path를 강화한 일반적인 지원 작업이다. |
| `576eb97f8041` | `build(docker): Caddy reverse proxy 구성` | B | REALTIME, OPERATIONS, OBSERVABILITY | runtime bind mount 대신 Caddy configuration을 immutable image로 package한다. | 프로젝트를 규정하는 메커니즘을 새로 도입하지 않고 이미 정립된 realtime 툴체인 또는 runtime path를 강화한 일반적인 지원 작업이다. |
| `2c44cb7cd71f` | `build(docker): production container lifecycle 구성` | A | PERSISTENCE, OPERATIONS | startup 시 dependency를 설치하고 source를 mount하던 development-style container를 built API/web image로 교체한다. | 단순한 local tooling 편의가 아니라 프로젝트의 persistence 신뢰성 또는 deployability contract를 바꾸므로 중요하다. |
| `e2c12ded1d5f` | `test(docker): production container contract 검증` | B | OPERATIONS, OBSERVABILITY, TEST | rendered Compose model과 Dockerfile에 실행 가능한 검사를 추가한다. | 이미 정립된 operations 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `1ec8335b0e75` | `refactor(game): matchmaking player와 fallback 계약 정의` | A | REALTIME, REFACTOR | socket과 room에서 독립된 matchmaking domain vocabulary로 registered/guest player, rating-bearing pair, queued/matched/duplicate join outcome, waiting/ready/unavailable... | 동작을 보존하면서 realtime의 소유권, 상태, 의존성 경계를 실질적으로 바꾸고 복잡한 메커니즘을 독립적으로 강제할 수 있게 했으므로 중요하다. |
| `a4f59a2e8192` | `refactor(game): rating 기반 closest-pair queue 구현` | A | REALTIME, REFACTOR | 명시적인 queued/matched status를 갖는 Matchmaker queue를 구현한다. | 동작을 보존하면서 realtime의 소유권, 상태, 의존성 경계를 실질적으로 바꾸고 복잡한 메커니즘을 독립적으로 강제할 수 있게 했으므로 중요하다. |
| `7871e29278c2` | `refactor(game): AI fallback과 reservation lifecycle 구현` | A | REALTIME, REFACTOR | Matchmaker를 pair selection에서 완전한 reservation lifecycle로 확장한다. | 동작을 보존하면서 realtime의 소유권, 상태, 의존성 경계를 실질적으로 바꾸고 복잡한 메커니즘을 독립적으로 강제할 수 있게 했으므로 중요하다. |
| `fc7da13e935d` | `test(game): matchmaking 규칙 검증` | A | REALTIME, TEST | controllable clock으로 Matchmaker state-machine contract를 정의해 가장 가까운 compatible rating 선택, out-of-range user 유지, guest/registered pool 격리, 정확히 6초 후 AI fallback 노출을... | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 realtime 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `6c88681dc140` | `refactor(db): match result repository 계약 분리` | B | REALTIME, PERSISTENCE, TOURNAMENT | idempotent match finalization용 좁은 persistence contract로 `MatchResultRepository`를 추출하고 `AppRepository`가 이를 확장하도록 한다. | 브랜치의 핵심 소유권 모델은 바꾸지 않고 이미 정립된 realtime 아키텍처 안에서 명확성이나 재사용성을 개선한 일반적인 구조 개선이다. |
| `e53559ef3a11` | `refactor(game): Matchmaker queue reservation을 GameHub에 연결` | A | REALTIME, REFACTOR | PvP selection과 duplicate-user reservation을 Matchmaker로 이동하고 GameHub는 socket/timer concern을 유지한다. | 동작을 보존하면서 realtime의 소유권, 상태, 의존성 경계를 실질적으로 바꾸고 복잡한 메커니즘을 독립적으로 강제할 수 있게 했으므로 중요하다. |
| `51f36aa50596` | `refactor(game): Matchmaker AI fallback를 GameHub에 연결` | A | REALTIME, OPERATIONS, RISK | parallel queue를 직접 검사하지 않고 Matchmaker가 제공한 deadline에서 AI fallback을 schedule하고 state machine을 통해 claim한다. | 동작을 보존하면서 realtime의 소유권, 상태, 의존성 경계를 실질적으로 바꾸고 복잡한 메커니즘을 독립적으로 강제할 수 있게 했으므로 중요하다. |
| `a23fc26a7f82` | `refactor(game): queue와 reservation cleanup 일원화` | S | REALTIME, ARCH, RISK | GameHub의 duplicate queue array를 제거하고 queued/reserved user의 authoritative owner를 Matchmaker로 만든다. | 분리된 queue 소유권을 제거하고 queued/reserved user의 모든 release path를 `Matchmaker`로 일원화하므로 핵심적이다. disconnect, drain, rollback, failure, finalization 전반에서 프로젝트 전체의 소유권 불변식을 복구한다. |
| `b5bfeee0e23e` | `refactor(game): room 생성과 finalization cleanup 보장` | A | REALTIME, OBSERVABILITY, RISK | room publication을 rollback cleanup으로 감싸 observer notification, client assignment, matching message, initial snapshot이 실패하면 scheduler entry, reconnect timer, room map, client room... | 동작을 보존하면서 realtime의 소유권, 상태, 의존성 경계를 실질적으로 바꾸고 복잡한 메커니즘을 독립적으로 강제할 수 있게 했으므로 중요하다. |
| `112228db8878` | `test(game): matchmaking lifecycle 검증` | A | REALTIME, RISK, TEST | rating-window matching, finalized forfeit 뒤 reservation 해제, abandoned empty room cleanup, room construction 중간 실패 시 rollback을 다루는 focused GameHub lifecycle test를 추가한다. | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 realtime 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `491dc0f8f252` | `fix(load): local database secret을 필수화` | B | AUTH, PERSISTENCE, OPERATIONS | load-test Compose overlay에서 default PostgreSQL password를 제거하고 required environment interpolation으로 변경한다. | 프로젝트의 주요 아키텍처나 lifecycle 모델을 실질적으로 바꾸지 않고 제한된 auth 동작을 수정한 일반적인 보정 작업이다. |
| `113f1c7884eb` | `test(load): database secret 요구 검증` | B | AUTH, PERSISTENCE, OPERATIONS | load overlay를 required-secret interpolation에 고정하고 fallback password를 명시적으로 거부한다. | 이미 정립된 auth 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `b93910708330` | `feat(db): legacy session을 안전하게 만료` | A | AUTH, PERSISTENCE | authentication contract 변경 후 기존 발급 cookie가 모두 다시 authentication하도록 existing session row를 삭제하는 명시적인 migration을 추가한다. | 중요한 auth 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `0649b63a1ca9` | `test(db): 인증 migration 중 데이터 보존 검증` | A | AUTH, PERSISTENCE, TEST | user, active session, finalized match, rating history가 있는 pre-migration database를 만든 뒤 authentication migration을 적용한다. | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 auth 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `3367b4266049` | `ci(repo): process와 browser 검증 job 추가` | A | REALTIME, PERSISTENCE, WEB | production artifact를 build하고 PostgreSQL을 provision/migrate한 뒤 compiled API와 production web server를 시작하고 readiness를 기다린 다음 HTTP smoke, WebSocket smoke를... | 단순한 local tooling 편의가 아니라 프로젝트의 realtime 신뢰성 또는 deployability contract를 바꾸므로 중요하다. |
| `7cb0d32b5be3` | `test(ci): process 검증 job contract 확인` | B | PERSISTENCE, WEB, OPERATIONS | 하나의 Node/pnpm toolchain을 고정하고 frozen lockfile installation을 요구하며 unit, PostgreSQL integration, process smoke, browser E2E command가 각각 존재하는지 검증하는 static CI contract test를 추가한다. | 이미 정립된 persistence 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `113b3c422192` | `feat(db): test database reset target guard 추가` | A | PERSISTENCE | destructive test reset용 fail-closed resolver를 도입한다. | 중요한 persistence 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `434403a7c16a` | `feat(db): test schema reset과 migration 실행 연결` | A | PERSISTENCE, RISK | 명시적인 `reset:test` CLI path를 추가한다. | 중요한 persistence 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `527b5f137425` | `test(db): test database reset guard 검증` | B | PERSISTENCE, TEST | non-test runtime, 일반 database name, ambiguous `search_path` option에 대해 destructive reset boundary를 검증한다. | 이미 정립된 persistence 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `d0137660cd9f` | `fix(db): 차단 감사 기록을 원자적으로 저장` | A | AUTH, PERSISTENCE, RISK | user-status update와 대응하는 administrator-action insert를 하나의 PostgreSQL transaction으로 이동한다. | 겉으로 드러난 증상만 가리는 대신 실패를 소유하는 계층에서 중요한 auth 불변식을 복구했으므로 중요하다. |
| `9106abc10d0e` | `test(db): 차단 감사 기록 atomicity 검증` | A | AUTH, PERSISTENCE, TEST | user update가 시작된 뒤 audit insert가 임시 database constraint를 위반하도록 강제로 만든다. | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 auth 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `1baf4c5a57ba` | `feat(metrics): event-loop lag 측정 추가` | B | OBSERVABILITY | Node event-loop delay histogram을 추가하고 95th percentile을 Prometheus gauge로 노출한다. | 이미 정립된 observability 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `66b8f07c2387` | `test(load): event-loop lag를 부하 profile에 노출` | B | OPERATIONS, OBSERVABILITY, PERF | load overlay에서 API metrics port를 loopback에 publish하고 k6 teardown 중 server의 event-loop p95를 수집한다. | 이미 정립된 operations 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `697a63ebb8c8` | `test(load): event-loop lag 임계값 검증` | B | OPERATIONS, OBSERVABILITY, PERF | load contract를 p95 event-loop lag 50ms threshold에 고정하고 필수 observability metric이 export되는지 확인한다. | 이미 정립된 operations 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `1abda1299ad8` | `test(e2e): 비회원 체험 브라우저 흐름 검증` | A | AUTH, REALTIME, WEB | credential 없는 guest 진입, 제한된 navigation, 두 browser 간 PvP matching, bounded 6초 AI fallback, match 중... | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 auth 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `66ac6bd2facb` | `chore(repo): 원본 화면 기록 파일 제외` | C | - | run별 Playwright capture output은 version control에서 제외하고 의도적으로 선별한 demo artifact만 유지한다. | 프로젝트의 주요 엔지니어링 결정을 이해하는 데 기여가 작고 일상적인 유지보수 또는 임시 presentation scaffolding에 해당하므로 중요도가 낮다. |
| `183ec528eac3` | `chore(media): 비회원 화면 기록 공통 pipeline 추가` | B | AUTH, WEB | guest-demo evidence를 위한 재현 가능한 Playwright/ffmpeg capture pipeline을 도입한다. | 프로젝트를 규정하는 메커니즘을 새로 도입하지 않고 이미 정립된 auth 툴체인 또는 runtime path를 강화한 일반적인 지원 작업이다. |
| `bf169788c9f5` | `chore(media): PvP reconnect 화면 기록 추가` | B | REALTIME | capture harness를 확장해 격리된 guest session 두 개를 만들고 PvP match를 시작하며, routed WebSocket 하나를 의도적으로 닫고 reconnecting/resumed-playing 상태를 검증한 뒤 결과로 생성된... | 프로젝트를 규정하는 메커니즘을 새로 도입하지 않고 이미 정립된 realtime 툴체인 또는 runtime path를 강화한 일반적인 지원 작업이다. |
| `114bee8a5f47` | `chore(media): AI fallback mobile 화면 기록 추가` | B | REALTIME, WEB | browser media harness를 확장해 Pixel 크기 viewport에서 guest queue를 실행하고, configured delay 전에 AI fallback이 발생하지 않는지 확인하며, AI match에 진입한 뒤 검증된 압축... | 프로젝트를 규정하는 메커니즘을 새로 도입하지 않고 이미 정립된 realtime 툴체인 또는 runtime path를 강화한 일반적인 지원 작업이다. |
| `51d5afc2655a` | `chore(media): 비회원 체험 시안 추가` | C | - | guest 진입, PvP reconnect, AI fallback 경험을 담은 선별된 screenshot과 WebM capture를 추가한다. | binary evidence artifact만 포함하며 재현 가능한 capture pipeline과 동작은 다른 커밋에서 구현되었으므로 중요도가 낮다. |
| `c577fe2603e3` | `fix(auth): 정지된 관리자 login 거부` | A | AUTH, RISK | administrator authorization boundary에 현재 account status를 포함한다. | 겉으로 드러난 증상만 가리는 대신 실패를 소유하는 계층에서 중요한 auth 불변식을 복구했으므로 중요하다. |
| `aa037c5291fe` | `test(auth): 정지된 관리자 session 거부 검증` | B | AUTH, TEST | administrator를 suspend하면 이미 발급된 session이 가진 privilege도 revoke되는지 검증한다. | 이미 정립된 auth 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `fe62962d65d9` | `fix(api): 내부 WebSocket 오류 숨김` | A | PROTOCOL, REALTIME, PERSISTENCE | client parse failure와 internal processing failure를 분리한다. | 겉으로 드러난 증상만 가리는 대신 실패를 소유하는 계층에서 중요한 protocol 불변식을 복구했으므로 중요하다. |
| `20933b1393f3` | `test(api): WebSocket repository error redaction 검증` | B | PROTOCOL, REALTIME, PERSISTENCE | SQL text와 internal host name이 포함된 repository failure를 inject한 뒤 WebSocket command boundary를 통해 실행한다. | 이미 정립된 protocol 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `916683099ecd` | `fix(db): tournament start 상태 갱신 여부 확인` | A | REALTIME, PERSISTENCE, TOURNAMENT | `UPDATE ...`를 사용한다. | 겉으로 드러난 증상만 가리는 대신 실패를 소유하는 계층에서 중요한 realtime 불변식을 복구했으므로 중요하다. |
| `480e2dc48028` | `test(db): tournament match 미갱신 거부 검증` | B | REALTIME, PERSISTENCE, TOURNAMENT | zero-row tournament-start update에 대한 PostgreSQL integration regression을 추가한다. | 이미 정립된 realtime 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `38312bcaf632` | `fix(game): tournament 시작 실패 시 room 상태 복원` | A | REALTIME, TOURNAMENT, RISK | in-memory room creation과 persistent tournament-start marking을 하나의 logical transition으로 취급한다. | 겉으로 드러난 증상만 가리는 대신 실패를 소유하는 계층에서 중요한 realtime 불변식을 복구했으므로 중요하다. |
| `4e2cb4ae702d` | `test(game): tournament start rollback 검증` | B | REALTIME, PERSISTENCE, TOURNAMENT | in-memory room 준비 이후 tournament-start persistence가 실패하는 상황을 재현한다. | 이미 정립된 realtime 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `c17e7ad0fd84` | `feat(web): profile과 friend 조회 query 추가` | B | WEB | current profile과 friend list를 위한 schema-validated API helper 및 scoped React Query option을 추가한다. | 이미 정립된 web 아키텍처 안에서 이루어진 일반적인 구현이다. 제품에 필요하지만 소유권, 보안, 일관성을 규정하는 핵심 결정은 아니다. |
| `8bc4d0cc32bd` | `test(web): profile과 friend 조회 규칙 검증` | B | AUTH, WEB, TEST | own-profile/friend-list request helper와 React Query ownership rule을 검증한다. | 이미 정립된 auth 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `25a495d2cd43` | `refactor(db): 경기 결과 확정 boundary 일원화` | A | PERSISTENCE, TOURNAMENT, RISK | 두 repository 구현에서 별도 tournament-completion operation을 제거하고 일반 match persistence와 tournament progression을 모두 `finalizeMatch`를 통해 처리한다. | 동작을 보존하면서 persistence의 소유권, 상태, 의존성 경계를 실질적으로 바꾸고 복잡한 메커니즘을 독립적으로 강제할 수 있게 했으므로 중요하다. |
| `1646034acd9f` | `test(db): 경기 결과 확정 boundary 적용 검증` | B | PERSISTENCE, TOURNAMENT, TEST | `finalizeMatch`가 존재하고 legacy `completeTournamentMatch` escape hatch가 사라졌는지 assertion해 좁아진 repository surface를 고정한다. | 이미 정립된 persistence 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `ad482c200cea` | `fix(game): 부하 중 snapshot cadence 안정화` | A | SIMULATION, REALTIME, PERF | authoritative simulation은 20Hz로 유지하되 snapshot 전송은 10Hz로 낮추고 room별 delivery slot을 번갈아 배정해 burst를 분산한다. | 겉으로 드러난 증상만 가리는 대신 실패를 소유하는 계층에서 중요한 simulation 불변식을 복구했으므로 중요하다. |
| `547d9943d30a` | `fix(load): 기본 부하 profile 측정 안정화` | A | REALTIME, OPERATIONS, OBSERVABILITY | player별 reconnect closure 시점을 분산하고 playing snapshot 이후에만 작동하도록 하며, finalization success/failure/duplicate를 client finished event 대신 Prometheus server metrics에서 읽고... | 겉으로 드러난 증상만 가리는 대신 실패를 소유하는 계층에서 중요한 realtime 불변식을 복구했으므로 중요하다. |
| `db1ae3d47b96` | `test(load): 기본 부하 병목 구간 검증` | B | SIMULATION, REALTIME, OPERATIONS | authoritative simulation이 20Hz로 계속 동작하는 동안 여러 room에서 staggered 10Hz snapshot delivery가 이루어지는지 regression coverage를 추가한다. | 이미 정립된 simulation 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `84bec3bf57ae` | `test(load): fault recovery 검사 자동화` | A | PERSISTENCE, OPERATIONS, PERF | database latency/outage와 edge latency/reset을 Toxiproxy로 구동하고 readiness를 polling해 예상 failure/recovery state를 확인하며 versioned JSON report를 내보내는 reusable fault-scenario runner를... | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 persistence 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `335565908920` | `test(load): fault scenario 설정과 report 검증` | B | PERSISTENCE, OPERATIONS, PERF | fault harness를 operational contract로 검증해 proxy port가 loopback-only인지, default latency/reset parameter가 deterministic한지, database/edge failure가 의도한 순서로 발생하는지... | 이미 정립된 persistence 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `eca21f115c1b` | `fix(db): idle connection pool 오류에서 복구` | A | PERSISTENCE, RISK | idle-client failure를 sanitized event로 변환하고 reporter failure도 내부에서 처리하는 PostgreSQL Pool error listener를 설치하며, API startup은 Fastify logging을 사용할 수 있을 때까지 event를 buffer한 뒤... | 겉으로 드러난 증상만 가리는 대신 실패를 소유하는 계층에서 중요한 persistence 불변식을 복구했으므로 중요하다. |
| `493babe1cf30` | `test(db): 안전한 connection pool 오류 처리 검증` | B | PERSISTENCE, TEST | idle PostgreSQL pool error가 containment되고 sanitized error name/code metadata만 보고되는지 검증한다. | 이미 정립된 persistence 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `d07056e11871` | `feat(shared): 모든 HTTP request schema를 strict하게 정의` | A | PROTOCOL | 모든 JSON HTTP route에 strict params, query, body schema를 하나씩 정의한다. | 중요한 protocol 경계를 정립하거나 통합한다. 이 경계가 실패하면 컴포넌트 전반의 정확성, 보안, 동시성, lifecycle 동작에 영향을 줄 수 있으므로 중요하다. |
| `59d75fddcaa6` | `fix(api): 모든 route input을 runtime 검증` | A | PROTOCOL, RISK | 공유 `parseHttpRequest` 경계를 도입하고 business logic 실행 전에 각 route의 strict params/query/body contract를 적용한다. | 겉으로 드러난 증상만 가리는 대신 실패를 소유하는 계층에서 중요한 protocol 불변식을 복구했으므로 중요하다. |
| `1abbf7dcdde4` | `test(api): strict request contract 검증` | B | TEST | JSON route 전반에 table-driven API test를 추가해 unknown query/body field와 invalid path parameter를 shared validation-error envelope으로 거부하는지 검증하고, 신뢰되지 않은 `X-Forwarded-For`로는... | 이미 정립된 test 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `bf0bc1199c84` | `ci(e2e): 비회원 체험 browser job 실행` | B | PERSISTENCE, WEB, OPERATIONS | API와 web application을 demo mode로 build/start하고 두 process를 기다린 뒤 PostgreSQL 없이 guest-only Playwright suite를 실행하는 전용 CI job을 추가한다. | 프로젝트를 규정하는 메커니즘을 새로 도입하지 않고 이미 정립된 persistence 툴체인 또는 runtime path를 강화한 일반적인 지원 작업이다. |
| `0ae1ded2c56f` | `test(ci): guest browser job 요구 검증` | B | WEB, OPERATIONS, TEST | 별도 guest-demo browser job, 일관된 demo-mode environment value, 의도한 Playwright command, guest specification을 요구하는 workflow contract test를 추가한다. | 이미 정립된 web 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `d90f17fa765d` | `fix(game): callback 지연을 snapshot congestion으로 오판하지 않음` | A | REALTIME, PERF, RISK | outstanding WebSocket `send` callback 자체를 transport congestion으로 취급하지 않도록 한다. | 겉으로 드러난 증상만 가리는 대신 실패를 소유하는 계층에서 중요한 realtime 불변식을 복구했으므로 중요하다. |
| `5cd54767858f` | `test(game): callback 지연과 실제 congestion 구분` | A | REALTIME, PERF, TEST | `LatestSnapshotBuffer` test에서 delayed WebSocket callback과 실제 buffered transport pressure를 분리한다. | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 realtime 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `66922585cd67` | `test(game): connection 교체 시점 검증 분리` | B | REALTIME, TEST | same-user connection replacement test를 강화해 replacement가 waiting snapshot을 받고 room은 unscheduled 상태를 유지하며 stale input으로 두 번째 room을 만들 수 없고 reconnect... | 이미 정립된 realtime 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `d799b34bc305` | `test(e2e): browser 사용자 상태 격리` | B | TOURNAMENT, WEB, OPERATIONS | run, browser project, worker에서 bounded E2E identity를 생성해 chat/tournament actor에 적용한다. | 이미 정립된 tournament 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `e9e29939c11e` | `test(e2e): 브라우저 프로젝트별 로그인 식별자 격리` | B | PERSISTENCE, WEB, OPERATIONS | 남아 있는 browser scenario를 fixed handle에서 project/worker/run별 identity로 migration하고 profile assertion도 이에 맞춘다. | 이미 정립된 persistence 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `f35728f4ef92` | `test(repo): 정적 계약 검사 명령 연결` | B | PERSISTENCE, OPERATIONS, TEST | CI, production-Docker, load-harness contract suite를 실행하는 root `test:contracts` command와 대응하는 Make target을 노출한다. | 이미 정립된 persistence 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `4f9e66c35586` | `ci(repo): 정적 계약 검사 실행` | B | PERSISTENCE | unit test 뒤, build 전에 repository의 static contract suite를 CI에서 실행한다. | 프로젝트를 규정하는 메커니즘을 새로 도입하지 않고 이미 정립된 persistence 툴체인 또는 runtime path를 강화한 일반적인 지원 작업이다. |
| `48c2188eb42a` | `test(runtime): Node 버전 계약을 기준 파일에서 읽음` | B | OPERATIONS, TEST | CI와 Docker contract test가 literal version을 중복하지 않고 `.node-version`에서 expected Node runtime을 읽도록 한다. | 이미 정립된 operations 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `3a8cd06a1098` | `build(runtime): Node.js 보안 패치 적용` | C | - | local version file, package engine, 모든 CI job, API/web image stage, load-test bootstrap image에서 하나로 고정된 Node patch level을 24.18.0에서 24.18.1로 갱신한다. | 브랜치 전체 이력에서 보면 기계적인 dependency 또는 patch-level 유지보수 업데이트이므로 중요도가 낮다. |
| `69e22da94cb4` | `build(web): Next.js 보안 패치 적용` | C | - | web application의 direct Next.js requirement를 `^15.5.21`로 올리고 resolved platform compiler package를 갱신한다. | 브랜치 전체 이력에서 보면 기계적인 dependency 또는 patch-level 유지보수 업데이트이므로 중요도가 낮다. |
| `0066e48ea3c9` | `build(api): WebSocket 보안 패치 적용` | C | - | API의 direct `ws` dependency를 `^8.21.0`으로 올리고 workspace와 Fastify WebSocket integration 전체에서 해당 version으로 resolve한다. | 브랜치 전체 이력에서 보면 기계적인 dependency 또는 patch-level 유지보수 업데이트이므로 중요도가 낮다. |
| `97d7ca714293` | `test(config): production fixture에 영속 DB 명시` | C | - | 기존 explicit-production environment fixture에 PostgreSQL URL을 추가한다. | 프로젝트의 주요 엔지니어링 결정을 이해하는 데 기여가 작고 일상적인 유지보수 또는 임시 presentation scaffolding에 해당하므로 중요도가 낮다. |
| `eb675ef74af3` | `fix(config): production에서 영속 저장소 요구` | A | TOURNAMENT, OPERATIONS, RISK | environment parsing 단계에서 `DATABASE_URL`이 없는 production configuration을 거부한다. | 겉으로 드러난 증상만 가리는 대신 실패를 소유하는 계층에서 중요한 tournament 불변식을 복구했으므로 중요하다. |
| `4633dfde208d` | `test(config): production memory fallback 거부 검증` | A | OPERATIONS, TEST | 명시적인 `APP_MODE=production`과 `NODE_ENV`에서 추론한 production 모두 `DATABASE_URL` 누락을 거부하고 demo mode는 계속 memory storage를 선택할 수 있는지 검증한다. | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 operations 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `00d0d7941382` | `fix(protocol): 채팅 scope와 room 식별자 조합 제한` | A | PROTOCOL, REALTIME, WEB | `chat.send`를 scope-discriminated protocol로 모델링한다. | 겉으로 드러난 증상만 가리는 대신 실패를 소유하는 계층에서 중요한 protocol 불변식을 복구했으므로 중요하다. |
| `5a3819aec8d0` | `test(protocol): 채팅 scope와 room 조합 검증` | B | AUTH, PROTOCOL, REALTIME | version-one parser가 어떤 room field든 포함한 lobby message와 valid UUID가 없는 match message를 거부한다는 negative protocol case를 추가한다. | 이미 정립된 auth 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `2ff750fa4ff8` | `fix(db): 채팅 행의 scope와 room 불변식 강제` | A | REALTIME, PERSISTENCE, RISK | migration 006을 추가해 lobby row를 정규화하고 복구할 수 없는 invalid match/scope row를 제거한 뒤, 각 scope에 맞는 room 표현을 강제하는 database check constraint를 설치한다. | 겉으로 드러난 증상만 가리는 대신 실패를 소유하는 계층에서 중요한 realtime 불변식을 복구했으므로 중요하다. |
| `1cead7cc9f35` | `test(db): 채팅 저장 불변식 검증` | B | REALTIME, PERSISTENCE, TEST | 두 repository 구현에서 chat scope/room consistency를 검증한다. | 이미 정립된 realtime 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `7759eef59b67` | `fix(game): 매치 채팅의 좌석과 audience 검증` | A | REALTIME, PERSISTENCE, RISK | client가 보낸 identifier를 신뢰하지 않고 authoritative room 기준으로 match chat을 authorize한다. | 겉으로 드러난 증상만 가리는 대신 실패를 소유하는 계층에서 중요한 realtime 불변식을 복구했으므로 중요하다. |
| `4a98bd1e4f22` | `test(game): 타 경기방 채팅 주입 차단 검증` | B | REALTIME, TEST | 동시에 room 두 개를 만들어 player가 다른 match에 chat을 주입할 수 없는지 검증한다. | 이미 정립된 realtime 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `85edd6d1e26a` | `fix(web): 현재 경기방의 채팅만 표시` | B | REALTIME, WEB | inbound `chat.message` event가 game reducer에 도달하기 전에 pure `isChatForActiveRoom` predicate로 filter한다. | 프로젝트의 주요 아키텍처나 lifecycle 모델을 실질적으로 바꾸지 않고 제한된 realtime 동작을 수정한 일반적인 보정 작업이다. |
| `02775797ab63` | `test(web): 매치 채팅 room filtering 검증` | B | REALTIME, WEB, TEST | room filter를 전체 boundary에서 unit test한다. | 이미 정립된 realtime 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `f46bbab95ea5` | `fix(game): 일시정지 시 paddle 입력 상태 초기화` | A | SIMULATION, REALTIME, RISK | 유효한 pause transition에서 paused state를 broadcast하기 전에 public snapshot의 paddle velocity와 simulation 내부 direction을 모두 비운다. | 겉으로 드러난 증상만 가리는 대신 실패를 소유하는 계층에서 중요한 simulation 불변식을 복구했으므로 중요하다. |
| `632cbf13b616` | `test(game): pause 전 입력이 재개 뒤 남지 않음 검증` | B | SIMULATION, REALTIME, TEST | controlled clock을 사용해 GameHub를 통해 movement, pause, neutral input, resume을 순서대로 실행한다. | 이미 정립된 simulation 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `e939a50948b2` | `fix(game): 경기 결과 저장 실패를 재시도 가능한 상태로 유지` | A | REALTIME, RISK | persistence가 실패해도 finished room을 유지하고 안정적인 idempotency key로 `finalizeMatch`를 retry한다. | 겉으로 드러난 증상만 가리는 대신 실패를 소유하는 계층에서 중요한 realtime 불변식을 복구했으므로 중요하다. |
| `8f5b2e86f69b` | `test(game): 일시적인 경기 결과 저장 실패 복구 검증` | A | REALTIME, OBSERVABILITY, RISK | 새 fake-timer GameHub test에서 첫 `finalizeMatch`는 실패하고 다음 시도는 성공하도록 만든다. | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 realtime 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `40e5c520d49c` | `fix(auth): 정지된 사용자의 열린 연결 폐기` | A | AUTH, REALTIME, TOURNAMENT | admin ban/status handler는 ban을 persistence한 직후 `GameHub.revokeUser`를 호출한다. | 겉으로 드러난 증상만 가리는 대신 실패를 소유하는 계층에서 중요한 auth 불변식을 복구했으므로 중요하다. |
| `454cbf2c95e0` | `test(auth): 계정 정지의 기존 WebSocket 차단 검증` | A | AUTH, REALTIME, TEST | admin test에서 실제 server/socket을 실행한다. | 일반적인 정상 경로 검증만으로는 보장할 수 없는 고위험 auth 불변식 또는 failure path를 검증하며, 그 검증 근거가 핵심 경계를 실질적으로 보호하므로 중요하다. |
| `8ea18a1b92db` | `fix(realtime): WebSocket transport payload 상한 설정` | A | AUTH, REALTIME, RISK | underlying `ws` server의 `maxPayload`를 기존 8KiB pre-authentication limit과 동일하게 설정한다. | 겉으로 드러난 증상만 가리는 대신 실패를 소유하는 계층에서 중요한 auth 불변식을 복구했으므로 중요하다. |
| `1afec49052b6` | `test(realtime): oversized WebSocket frame 거부 검증` | B | AUTH, REALTIME, TEST | 실제 WebSocket을 authentication한 뒤 8,193-byte frame을 보내고 close code 1009를 요구한다. | 이미 정립된 auth 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `312ddbc6fbe2` | `fix(runtime): container 종료 유예를 room drain과 정렬` | A | REALTIME, OPERATIONS, RISK | API container의 `stop_grace_period`를 application의 60초 room-drain budget보다 긴 70초로 설정한다. | 겉으로 드러난 증상만 가리는 대신 실패를 소유하는 계층에서 중요한 realtime 불변식을 복구했으므로 중요하다. |
| `73ba979841cd` | `test(docker): API 종료 유예 계약 검증` | B | OPERATIONS, TEST | production Compose duration을 parsing해 API stop grace period가 60초 application drain budget 이상인지 요구한다. | 이미 정립된 operations 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `4c4f7df2242a` | `build(security): 프로덕션 의존성 취약점 패치` | B | WEB, OPERATIONS | patched Fastify, Next.js, PostCSS release로 production dependency manifest를 갱신하고 `fast-uri`, `nanoid`, `postcss`, `sharp` 등 vulnerable transitive package에 root override를 추가한다. | 프로젝트를 규정하는 메커니즘을 새로 도입하지 않고 이미 정립된 web 툴체인 또는 runtime path를 강화한 일반적인 지원 작업이다. |
| `65512bc24161` | `fix(ci): 브라우저 E2E API origin 정렬` | B | AUTH, REALTIME, WEB | browser E2E API origin을 `127.0.0.1`에서 `localhost`로 바꾸되 WebSocket endpoint는 loopback에 유지한다. | 프로젝트의 주요 아키텍처나 lifecycle 모델을 실질적으로 바꾸지 않고 제한된 auth 동작을 수정한 일반적인 보정 작업이다. |
| `527921bc9d69` | `test(ci): 브라우저 E2E cookie origin 계약 검증` | B | AUTH, WEB, OPERATIONS | `API_BASE_URL`이 정확히 `http://localhost:4000`인지 확인하는 CI contract assertion을 추가한다. | 이미 정립된 auth 설계 안에서 유용한 회귀 또는 통합 검증을 추가한 일반적인 작업이며, 독립적으로 핵심 불변식을 다시 정의하지는 않는다. |
| `71c5c13480f0` | `docs(project): 프로젝트 문서 정리` | C | - | 완성된 server-authoritative design을 중심으로 project README와 architecture, operations, protocol, reconnect, measurement 문서를 재구성한다. | 문서 변경에 불과하며 실행 동작, 검증, 엔지니어링 불변식을 바꾸지 않으므로 중요도가 낮다. |
# 개발 흐름

## 흐름: Authoritative하고 deterministic한 game mechanics

`9e3664f5de48` A — 최초의 server-owned physics loop를 도입한다.
↓
`2e4359f0625f` A — transport-independent simulation state boundary를 만든다.
↓
`4afec2071e7a` S — 완전한 scoring과 terminal mechanics를 하나의 deterministic transition으로 옮긴다.
↓
`4ef4beeb8611` A — immutability, seed repeatability, replay digest behavior를 고정한다.
↓
`cf14c4052310` S — GameHub가 독립된 authoritative transition을 사용하도록 한다.
↓
`2cef070188ac` B — migration 이후 경쟁하던 legacy rule을 제거한다.
↓
`37a7b2e4611b` A — 장시간 deterministic behavior를 versioned compatibility fixture로 만든다.

**의의**

프로젝트는 server-owned gameplay에서 시작해 mechanics를 순수하고 testable한 simulation으로 분리하고, 마지막에는 중복 implementation을 제거한다. 이 흐름이 중요한 이유는 authority가 단순한 deployment 선택이 아니기 때문이다. 하나의 deterministic state transition이 score, collision, timing, replay compatibility의 source of truth가 된다.

## 흐름: Cookie identity와 one-time WebSocket admission

`1779df300611` B — repository-backed session과 초기 browser identity boundary를 정립한다.
↓
`d0531791406b` S — durable credential을 HttpOnly cookie로 제한하고 development login을 mode별로 제한한다.
↓
`353ca9a17415` A — JavaScript가 관리하던 durable credential을 browser에서 제거한다.
↓
`d9bde7485719` A — high-entropy raw ticket과 hash-only storage semantics를 정의한다.
↓
`c89a455fee06` A — PostgreSQL에서 ticket consumption을 atomic하고 single-use로 만든다.
↓
`306d1946afb7` S — bounded pre-auth buffering과 함께 cookie-to-ticket-to-socket trust handoff를 완성한다.
↓
`b0ee833313c1` A — replay, expiry, suspension, protocol version, concurrent consumption을 검증한다.
↓
`ec9cb39babef` A — ticket과 durable credential이 operational log data가 되지 않도록 한다.

**의의**

branch는 JavaScript와 URL에서 reusable token을 사용하는 방식에서 명확히 벗어난다. Authentication은 두 단계 trust chain이 된다. cookie가 HTTP ticket request를 authentication하고, atomic one-time ticket이 정확히 하나의 socket을 authentication한다. Ticket issuance만으로 충분하다고 보지 않고 buffer limit과 log redaction까지 적용해 security boundary를 완성한다.

## 흐름: Versioned realtime protocol과 monotonic state

`a974f8cd9712` A — 최초의 runtime-validated discriminated event vocabulary를 도입한다.
↓
`7d3437c49152` A — snapshot과 result를 sequence 및 persistence metadata를 갖는 strict transport model로 재구성한다.
↓
`0595a386000a` S — 양방향 모두를 strict version-one codec boundary로 만든다.
↓
`1567f5005ef8` A — client/room별 stale 또는 reordered input을 거부한다.
↓
`8a8787d03a19` A — client-side event parsing과 monotonic snapshot acceptance를 추가한다.
↓
`f655969b0d36` A — version, sequence, persistence discriminator invariant를 보호한다.

**의의**

protocol은 typed message에서 executable compatibility boundary로 발전한다. Versioning, strict object shape, input sequence number, snapshot sequence number를 통해 malformed, stale, duplicated, structurally incompatible traffic이 authoritative state나 rendered state를 조용히 변경하지 못하도록 한다.

## 흐름: Atomic하고 idempotent한 match finalization

`38504f041a6a` B — 초기에는 sequential operation으로 match persistence와 rating effect를 도입한다.
↓
`75bbc762e06d` A — logical outcome의 durable identity와 audit 가능한 participant delta를 추가한다.
↓
`83f9aee2522a` A — unique result key로 concurrent duplicate finalization을 하나의 결과로 수렴시킨다.
↓
`e9d577ebc1ab` A — participant를 lock하고 match, counter, rating, history를 함께 commit한다.
↓
`e338ea32b2a6` S — bracket과 tournament progression을 같은 transaction에 포함한다.
↓
`582a1615a2c6` A — 반복, concurrency, rollback 상황에서도 단 한 번의 생성과 한 세트의 effect만 발생함을 검증한다.
↓
`10bf15723591` A — GameHub completion을 canonical repository command로 연결한다.
↓
`e939a50948b2` A — terminal room ownership을 유지하고 stable idempotency key로 retry한다.

**의의**

이 흐름은 여러 write로 구성된 best-effort workflow를 하나의 logical domain command로 바꾼다. Database uniqueness, 정렬된 row lock, transaction-scoped tournament progression, runtime integration, retry 가능한 room ownership이 함께 작동해 완료된 game이 중복 저장되거나 rating 또는 bracket에 일부만 반영되지 않도록 한다.

## 흐름: Room lifecycle, connection replacement, 복구

`aa5d6a338690` S — readiness, pause, reconnect, expiry, finish의 유효한 transition을 정의한다.
↓
`8f64dfc117f3` A — GameHub lifecycle 변경이 state machine을 따르도록 한다.
↓
`a06d1705bbc9` S — 하나의 current transport를 강제하고 room ownership을 atomic하게 이전한다.
↓
`c98d4b1e8b43` A — 돌아온 identity를 명시적으로 reserved된 side에만 다시 연결한다.
↓
`e593b1dd9fcd` A — disconnect를 bounded reservation, forfeit 또는 non-persisted abandonment로 처리한다.
↓
`113e39acc85c` A — replacement, deadline 내 recovery, 단 한 번의 finalization, stale socket rejection을 검증한다.
↓
`4f5199097284` A — matchmaking intent를 replay하지 않고 browser가 fresh ticket을 요청하도록 한다.

**의의**

socket loss와 socket replacement를 즉시 match termination하거나 새 matchmaking을 시작하는 사건이 아니라 lifecycle event로 다룬다. State machine, user-indexed connection map, reserved side, deadline, browser retry policy가 협력해 transient transport failure 중에도 하나의 room과 하나의 player authority를 유지한다.

## 흐름: Matchmaking reservation ownership과 rollback

`1122e6a4b901` B — 명시적인 timer cleanup과 함께 timed AI fallback을 도입한다.
↓
`1ec8335b0e75` A — socket과 독립적으로 queued, matched, duplicate, fallback, release outcome을 정의한다.
↓
`a4f59a2e8192` A — deterministic compatible-pool, closest-rating pairing을 구현한다.
↓
`7871e29278c2` A — queue cancellation과 할당된 match reservation release를 분리한다.
↓
`e53559ef3a11` A — duplicate-user reservation과 PvP selection을 Matchmaker 뒤로 옮긴다.
↓
`51f36aa50596` A — 같은 state machine을 통해 delayed fallback을 claim하고 asynchronous work를 다시 검증한다.
↓
`a23fc26a7f82` S — 중복 queue ownership을 제거하고 모든 release path를 일원화한다.
↓
`b5bfeee0e23e` A — 일부만 publish된 room을 rollback하고 terminal removal을 보장한다.
↓
`112228db8878` A — failure, abandonment, forfeit, rollback 이후에도 다시 matchmaking될 수 있음을 보호한다.

**의의**

초기 timer-backed queue도 동작하지만 GameHub 안에 availability를 나타내는 여러 representation이 남아 있다. 이후 Matchmaker abstraction이 reservation state를 명시적으로 만들고, integration/cleanup 커밋이 split ownership을 제거한다. stale reservation이 user를 영구적으로 제외하거나 한 user가 두 match를 동시에 점유할 수 있기 때문에 이 변화가 중요하다.

## 흐름: 격리된 transient trust domain으로서의 Guest mode

`cacd4c22d705` A — database session 없이 tamper-evident, address-bound, expiring guest identity를 만든다.
↓
`17a1dd501b1b` A — guest connection limit을 lease identity와 socket lifetime에 연결한다.
↓
`a5c06c561e00` A — signed cookie, one-time ticket, bounded live lease를 연결한다.
↓
`27ddc3fca2f1` A — demo traffic에서 registered social/history data를 조회하지 않는다.
↓
`77a7c205ccd0` A — identity kind별로 matchmaking과 AI fallback을 분리한다.
↓
`eaa4fdaba361` A — durable finalization을 건너뛰고 짧은 in-memory recovery result만 유지한다.
↓
`2b274686e6d4` A — IP window와 pending ticket structure에 상한을 두고 runtime mode를 검증한다.
↓
`06d2eb7a93cc` A — bounded cleanup, fresh-ticket reconnect, duplicate match intent 방지를 검증한다.

**의의**

Guest mode는 기능이 약한 registered account로 구현되지 않는다. 별도의 signed identity, capability, matchmaking, persistence, resource domain이다. 각 integration point가 transient public traffic이 durable data나 unbounded process state를 획득하지 못하도록 명시적으로 차단한다는 점에서 이 흐름이 중요하다.

## 흐름: Runtime timing, backpressure, drain, 운영 evidence

`3a2943ff385d` A — monotonic elapsed time과 bounded 50 ms simulation work를 분리한다.
↓
`10a656e59864` A — deterministic liveness ownership과 timeout cleanup을 추가한다.
↓
`207df3f47935` A — monotonic input admission과 per-user token-bucket limit을 결합한다.
↓
`8589ff3c4821` A — latest-value delivery와 congestion termination rule을 정의한다.
↓
`d21a47ee92d2` A — 모든 registered room에 하나의 fixed-step clock을 제공한다.
↓
`fb5b1abc97f5` A — runnable-room membership을 hub의 단일 timing topology로 만든다.
↓
`44ef3e07e1a5` A — 소유 중인 room이 끝나기를 기다리는 동안 새 작업을 거부한다.
↓
`1c9981393973` A — signal이 하나의 bounded drain-and-close sequence로 진입하도록 한다.
↓
`7b0b5f086b41` A — service-level evidence를 위해 database와 edge degradation path를 분리한다.

**의의**

완성된 runtime은 unbounded work의 주요 원인을 모두 제한한다. elapsed catch-up, dead socket, input burst, snapshot backlog, timer multiplicity, shutdown이 대상이다. 이후 observability와 fault tooling이 unit behavior에만 의존하지 않고 process/network degradation 상황에서 같은 boundary를 측정한다.

# 가장 중요한 커밋

## refactor(game): 득점과 충돌을 simulation에 통합

커밋: `4afec2071e7a`
중요도: S
태그: SIMULATION, CORE, ARCH

### 문제

authoritative physics가 GameHub 내부에 있어 transport orchestration이 collision, scoring, acceleration, termination rule과 결합되어 있었다.

### 결정

outcome을 만드는 모든 mechanics를 `PongSimulation.step` 안에 두고, bounded speed와 terminal rule을 적용하면서 명시적인 state와 input으로 동작하도록 한다.

### 중요한 이유

socket, timer, client, persistence 없이도 match outcome을 재현할 수 있게 되었고 deterministic replay test의 기반을 제공했다.

### 변경 내용

Paddle collision, scoring, serve reset, speed progression, winning-score/timeout termination, winner selection, input clearing이 하나의 simulation transition이 되었다.

### 프로젝트 이해에 중요한 이유

game rule이 어디에 존재하는지, 그리고 완성된 server가 realtime transport와 독립적으로 이를 test하고 replay할 수 있는 이유를 설명한다.

## refactor(game): 게임 방 상태 전이 모델링

커밋: `aa5d6a338690`
중요도: S
태그: REALTIME, ARCH, RISK

### 문제

readiness, pause, disconnect, reconnect, forfeit, finish behavior를 분산된 socket callback과 snapshot phase에서 안전하게 추론할 수 없다.

### 결정

legal transition, 기억된 resume state, disconnected side, 15초 deadline, idempotent finish를 갖는 명시적 state machine으로 `RoomSession`을 도입한다.

### 중요한 이유

recoverable transport loss와 terminal match result를 구분하고 invalid 또는 repeated lifecycle transition을 방지한다.

### 변경 내용

readiness gating, pause/resume, 한쪽 또는 양쪽 disconnect, deadline 내 reconnect, deadline expiry, forfeit winner selection, cleanup을 model한다.

### 프로젝트 이해에 중요한 이유

프로젝트 recovery 설계의 개념적 중심이며, 이후 GameHub connection replacement와 room cleanup에 통합되는 rule source다.

## refactor(game): GameHub frame 계산을 simulation에 위임

커밋: `cf14c4052310`
중요도: S
태그: SIMULATION, ARCH, REALTIME

### 문제

test된 standalone simulation이 있어도 GameHub가 자체 physics implementation을 계속 실행하면 authority가 확립되지 않는다.

### 결정

각 fixed frame에서 `PongSimulation.step`을 호출하게 하고, hub에는 input collection, scheduling, projection, broadcast, persistence, room lifecycle만 남긴다.

### 중요한 이유

기존 wire snapshot을 유지하면서 gameplay truth의 잠재적 source 두 개를 하나로 줄이는 결정적인 responsibility transfer다.

### 변경 내용

GameHub가 human 또는 AI direction을 제공하고 반환된 state를 저장한 뒤 protocol 형태로 project하고 broadcast하며, simulation winner에 반응하도록 변경한다.

### 프로젝트 이해에 중요한 이유

완성된 architecture의 가장 중요한 분리를 설명한다. mechanics는 deterministic domain logic이고 GameHub는 orchestration boundary다.

## fix(auth): cookie-only session과 환경별 route 적용

커밋: `d0531791406b`
중요도: S
태그: AUTH, ARCH, RISK

### 문제

같은 durable session을 cookie, authorization header, URL query parameter에서 모두 허용할 수 있었고, deployed mode에도 development login route가 존재했다.

### 결정

HttpOnly `pp_session` cookie만 허용하고 bearer/query fallback과 authorization CORS 지원을 제거한다. development login은 development/test로 제한하고 외부에 노출되는 mode에서는 cookie를 secure하게 설정한다.

### 중요한 이유

JavaScript, log, referrer, URL을 통한 credential exposure를 줄이고 이후 WebSocket authentication을 위한 명확한 시작점을 제공한다.

### 변경 내용

request credential reader, CORS policy, route registration, runtime mode, secure-cookie behavior를 함께 변경한다.

### 프로젝트 이해에 중요한 이유

one-time WebSocket ticket, guest session, logout revocation, suspension enforcement가 발전하는 durable identity boundary를 정의한다.

## feat(auth): ticket 기반 WebSocket 인증 연결

커밋: `306d1946afb7`
중요도: S
태그: AUTH, REALTIME, RISK

### 문제

WebSocket에는 authenticated identity가 필요하지만 durable cookie value를 socket URL이나 JavaScript에 넣으면 cookie-only security model을 위반한다.

### 결정

authenticated HTTP를 통해 random ticket을 발급하고 hash만 저장한다. versioned handshake에서 이를 atomic하게 consume하고 모든 pre-authentication buffering에 상한을 둔다.

### 중요한 이유

reusable session을 노출하지 않으면서 early client command를 보존하고, 그렇지 않으면 발생할 수 있는 unauthenticated memory-growth path도 차단한다.

### 변경 내용

ticket endpoint, strict query parsing, atomic consumption, 명시적 close code, per-message/count/byte limit, listener detachment, closed-socket guard를 추가한다.

### 프로젝트 이해에 중요한 이유

프로젝트의 credential/resource limit을 약화하지 않으면서 HTTP authentication과 realtime identity를 연결하는 방법을 설명한다.

## feat(protocol): versioned WebSocket event codec 연결

커밋: `0595a386000a`
중요도: S
태그: PROTOCOL, REALTIME, ARCH

### 문제

compile-time union과 unchecked `JSON.parse`만으로는 malformed, stale, incompatible message로부터 분산된 browser/server boundary를 보호할 수 없다.

### 결정

모든 event에 `v: 1`을 요구하고 bounded text, identifier, input sequence, error code를 포함한 shared strict schema로 incoming/outgoing payload를 모두 검증한다.

### 중요한 이유

protocol이 executable하고 symmetric해진다. producer는 unsupported shape을 encode할 수 없고 consumer는 이를 조용히 받아들일 수 없다.

### 변경 내용

client/server event union, parser, encoder, snapshot/result composition, input ordering field, coded error를 하나의 version 아래에 통합한다.

### 프로젝트 이해에 중요한 이유

이후 snapshot sequencing, client parsing, rate limiting, guest restriction, protocol regression test를 정확하게 추론할 수 있게 하는 contract다.

## feat(db): PostgreSQL tournament 경기 확정을 연결

커밋: `e338ea32b2a6`
중요도: S
태그: PERSISTENCE, TOURNAMENT, RISK

### 문제

match를 rating과 bracket progression과 별도로 저장하면, 특히 concurrent semifinal completion이나 retry 상황에서 durable game이 tournament에 반영되지 않을 수 있다.

### 결정

match-finalization transaction 안에서 bracket match와 tournament를 lock하고 participant를 검증한다. result를 연결하고 final을 idempotent하게 생성하며 tournament를 atomic하게 완료한다.

### 중요한 이유

database lock과 uniqueness constraint를 통해 retry와 concurrent semifinal completion이 duplicate final이나 분리된 domain state를 만드는 대신 하나의 결과로 수렴한다.

### 변경 내용

transaction이 room linkage, persisted match identity, score, winner, semifinal winner read, final insertion, tournament winner/status update를 포함하도록 확장한다.

### 프로젝트 이해에 중요한 이유

프로젝트의 가장 강한 persistence guarantee를 설명한다. 하나의 logical game outcome이 match, rating, history, tournament domain을 하나의 commit으로 통과한다.

## feat(game): 사용자별 active connection 교체

커밋: `a06d1705bbc9`
중요도: S
태그: REALTIME, ARCH, RISK

### 문제

여러 tab이나 reconnect race로 인해 같은 user를 위한 두 socket이 각각 queue, tournament, input, room command를 보낼 수 있다.

### 결정

current client를 user 기준으로 index하고, 기존 resource를 중지하며 room ownership을 이전하고 current context를 전송한 뒤 stale message를 거부하는 atomic handoff로 교체한다.

### 중요한 이유

transport가 교체되어도 room은 유지되고 player authority는 하나로 남는다. duplicate control과 불필요한 forfeit를 모두 방지한다.

### 변경 내용

user-indexed map, stale-client receive guard, resource shutdown, transient-membership cleanup, side transfer, context replay, 명시적 replacement close를 추가한다.

### 프로젝트 이해에 중요한 이유

reconnect가 기존 connection과 경쟁하는 두 번째 connection이 아니라 하나의 identity와 room을 이어가는 동작인 이유를 이해하는 데 필수적이다.

## refactor(game): queue와 reservation cleanup 일원화

커밋: `a23fc26a7f82`
중요도: S
태그: REALTIME, ARCH, RISK

### 문제

GameHub와 Matchmaker가 모두 queue state를 표현해 disconnect, drain, rollback, abandonment, finalization path에서 user의 availability를 서로 다르게 판단할 수 있었다.

### 결정

Matchmaker를 queued/matched reservation의 유일한 owner로 만들고 모든 release를 shared cleanup path로 연결한다. GameHub에는 transport-specific metadata만 유지한다.

### 중요한 이유

single ownership이 stale reservation으로 user가 영구적으로 제외되거나 한 player가 여러 match에 들어가는 것을 방지한다.

### 변경 내용

중복 queue array를 제거하고 leave, pruning, drain, shutdown, abandonment, finalization failure, room removal을 common release operation으로 일원화한다.

### 프로젝트 이해에 중요한 이유

최종 matchmaking architecture와 함께, 모든 acquisition path에는 완전하고 중앙화된 하나의 release story가 있어야 한다는 실무 규칙을 보여준다.
