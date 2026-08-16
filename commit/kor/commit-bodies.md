## chore(workspace): pnpm 모노레포 경계 구성
저장소를 pnpm 모노레포로 구성하고 실행 애플리케이션과 재사용 라이브러리를 각각 `apps/*`와 `packages/*` 아래에 배치한다. 루트 스크립트와 Make 타깃은 build와 type check를 각 workspace에 재귀적으로 위임하므로, 개별 workspace는 자체 명령을 유지하면서 저장소 전체에서는 하나의 검증 진입점을 사용할 수 있다. pnpm 버전도 고정해 의존성 설치 동작이 개발자의 전역 도구 환경에 덜 좌우되도록 한다.

공유 TypeScript 기준 설정은 ES2022를 대상으로 하고, bundler 방식 모듈 해석을 사용하는 ES module을 적용하며, 대소문자 일관성과 상호 운용성 규칙을 활성화한다. 패키지별 설정은 compiler 정책을 중복하지 않고 이 기준을 확장할 수 있으므로, 패키지를 넘나드는 타입도 동일한 언어 semantics를 따른다.

## chore(repo): 로컬 빌드 산출물 제외
의존성 트리, framework 및 compiler 산출물, coverage 및 browser test report, 로컬 환경 파일, 로그, 운영체제 metadata를 버전 관리에서 제외한다. 이를 통해 저장소에는 기준이 되는 source와 설정만 남기고, 머신별 상태나 secret이 이후 커밋의 우발적인 입력으로 포함되는 것을 방지한다.

## chore(shared): 공유 패키지 경계 구성
여러 애플리케이션에서 사용하는 contract를 담는 독립 workspace로 `@pong-pong/shared`를 구성한다. 이 패키지는 단일 source 진입점을 노출하고, 패키지 자체의 no-emit TypeScript build로 유효성을 검사하며, transport contract의 runtime schema에 필요한 의존성으로 Zod를 선언한다.

루트 path mapping은 패키지를 TypeScript source에 직접 연결한다. 초기 개발 단계에서 별도 패키지 build가 필요하지 않다는 장점이 있지만, 소비 애플리케이션은 workspace source를 사전 컴파일된 JavaScript로 취급하는 대신 직접 transpile할 수 있어야 한다.

## feat(shared): 사용자와 서비스 DTO 정의
API, 데이터베이스, 브라우저 구현이 이름이나 구조 면에서 서로 달라지기 전에 사용자와 초기 서비스 domain이 HTTP에서 사용하는 표준 표현을 정의한다. contract는 identity 및 moderation 상태, match mode, dashboard 및 leaderboard projection, friendship 상태, chat message, tournament summary를 포함한다.

`PublicUser`는 의도적으로 email을 제외하고, `SessionUser`는 여기에 계정 전용 필드를 추가한다. 이를 통해 일반적으로 배포 가능한 사용자 데이터와 인증된 session 응답 사이에 privacy 경계를 둔다. runtime의 접속 상태는 `online`으로 별도 표현하고, 시간 값은 문자열로 전달해 persistence 전용 row type과 JavaScript `Date` 객체가 애플리케이션 간 contract에 노출되지 않도록 한다.

## feat(shared): 퐁 시뮬레이션 계약 추가
Pong에서 공통으로 사용할 geometry, timing, lifecycle, 상태 표현을 정의한다. court, paddle, ball, winning score, tick rate를 고정 상수로 두어 server simulation과 browser renderer가 같은 좌표계를 사용하도록 하고, paddle input은 `-1`, `0`, `1` 세 방향 값으로 제한한다.

snapshot에는 phase, tick, score, paddle, ball, player, server time 등 관찰 가능한 전체 경기 상태가 포함된다. 따라서 client는 게임 규칙을 직접 소유하지 않고도 권위 있는 server 출력을 렌더링할 수 있다. 별도의 finished result에는 영속화된 match 식별자와 rating 변동을 추가한다. 이 커밋은 serialization 경계를 정의하며, 아직 physics나 상태 전이를 구현하지는 않는다.

## feat(shared): WebSocket 이벤트 메시지 검증
discriminated WebSocket protocol을 도입하고, client에서 들어오는 모든 message를 application handler가 처리하기 전에 runtime에서 검증한다. queue 조작, readiness, paddle input, chat에는 각각 명시적인 payload 구조를 두고, queue mode에는 기본값을 정의하며, input은 세 가지 유효한 방향으로 제한한다. chat text는 trim한 뒤 1~240자로 제한한다.

JSON을 먼저 parsing한 다음 Zod union을 적용해 serialization 자체가 잘못된 경우와 구조적으로 유효하지 않은 event를 구분하고, 성공하면 typed event를 반환한다. server에서 보내는 event는 TypeScript discriminated union과 단일 JSON encoder를 사용하며 matchmaking, snapshot, completion, chat, presence, error를 포함한다. client input과 달리 server output은 runtime에서 다시 검증하지 않고 compile time에 type check한다.

## test(shared): WebSocket 프로토콜 검증
허용되는 모든 client event, 기본 queue mode, 필수 필드, 유효한 enum 값, 정확한 paddle 방향 값 범위를 table-driven test로 검증해 WebSocket 경계를 고정한다. chat test는 whitespace 정규화와 유효·무효 길이 경계를 모두 다루고, 잘못된 JSON과 알 수 없는 event type을 통해 유효하지 않은 transport input이 domain logic에 도달하기 전에 거부되는지 확인한다.

모든 server event variant의 대표 값을 encoding한 뒤 JSON round trip을 수행해 선언된 payload가 구조 손실 없이 serialization 가능한지 확인한다. 저장소 전체 test 명령도 패키지 test를 재귀적으로 실행하도록 확장해 protocol regression 검사를 일반 workspace 검증 경로에 포함한다.

## chore(db): PostgreSQL 패키지 경계 구성
`@pong-pong/db`를 persistence workspace로 구성해 PostgreSQL 및 Kysely 의존성을 repository 작업을 사용하는 API 패키지와 분리한다. 이 패키지는 공유 서비스 contract에 의존하고, database driver로 `pg`를 사용하며, 실행 도구와 검증에는 TSX와 Vitest를 사용한다.

패키지 자체의 no-emit TypeScript 설정을 통해 persistence 코드도 build artifact를 만들지 않고 저장소 type check에 참여한다. 이 경계를 통해 transport 코드가 driver 전용 관심사를 직접 갖게 하지 않고, database access를 명시적인 패키지 의존성으로 만든다.

## feat(db): 초기 PostgreSQL schema 정의
identity, session, friendship, 완료된 match, chat, tournament, administrator action을 위한 초기 영속 데이터 모델을 정의한다. UUID primary key는 PostgreSQL이 생성하고, 사용자 handle과 email에는 unique 제약을 두며, foreign key로 사용자와 해당 사용자가 생성하거나 참여한 record 사이의 소유 관계를 표현한다.

삭제 동작은 관계별로 다르게 정한다. session, friendship, chat message, tournament entry는 소유한 user 또는 tournament와 함께 삭제하지만, 과거 match, tournament creator, winner, administrator reference에는 일괄적으로 cascade를 적용하지 않는다. 방향성 friendship과 tournament entry의 unique 제약은 동일한 저장 관계에 중복 row가 생기는 것을 막는다. index는 초기 단계에서 최신성에 민감한 두 조회, 즉 종료 시각 기준 완료 match 조회와 scope·생성 시각 기준 chat 조회를 지원한다. migration은 `if not exists`를 사용해 초기 설정을 반복 실행할 수 있지만, 이후 변경을 위한 versioned alteration mechanism이 아니라 bootstrap schema다.

## feat(db): migration 실행 경계 구성
database 패키지를 import 가능하게 만들고 runtime 코드에서 실행할 수 있는 schema initialization 경계를 제공한다. 패키지는 source 진입점을 export하고 type-check script를 노출하며, workspace path alias에도 추가된다. 이에 따라 애플리케이션은 내부 디렉터리 구조를 직접 참조하지 않고 `@pong-pong/db`에 의존할 수 있다.

초기 PostgreSQL schema도 Kysely를 통해 실행할 수 있는 export된 SQL 문자열로 제공한다. repository startup 시 filesystem 상대 경로의 migration 명령에 의존하지 않고 동일한 table, constraint, cascade, index를 적용할 수 있다. 이 단계에서는 실행용 문자열이 독립 migration 파일의 내용을 그대로 중복하므로 두 표현의 일치 여부는 수동 관리에 달려 있다. 즉, 이 커밋은 실행 경로를 마련하지만 자동 migration registry나 생성된 single source of truth까지 제공하지는 않는다.

## feat(db): 사용자와 세션 row schema 정의
users와 sessions table을 Kysely type으로 표현하고, database row에서 공유 application model로 변환하는 명시적인 mapping 경계를 도입한다. generated column은 PostgreSQL default로 채워지는 값을 구분하며, 조회용 row type은 nullable email과 ban timestamp, 공유 role/status union을 그대로 보존한다.

`toPublicUser`는 snake_case storage field를 변환하고 숫자 값을 정규화하며, online presence를 persisted state로 간주하지 않고 runtime context로 전달받는다. `toSessionUser`는 이 public projection에 email을 추가해 privacy 경계를 코드에 명확히 드러낸다. 즉, 기반 row에 email이 있다고 해서 public response에 계정 email이 포함되지 않는다. 범위를 좁힌 `UserProjectionRow`는 두 mapper에 정확히 필요한 column을 명시한다.

## feat(db): 저장소 lifecycle 구성
`AppRepository`를 persistence lifecycle 경계로 도입하고 동일한 factory-level contract 뒤에 PostgreSQL 구현과 memory 구현을 제공한다. PostgreSQL 생성 과정은 connection pool과 typed Kysely client를 모두 소유하며, `close`에서 해당 resource를 정리하고 중복된 pool 종료 실패도 허용한다. memory repository는 동일 lifecycle을 no-op으로 구현하므로 호출자는 backend 종류에 따라 분기하지 않고 정리할 수 있다.

`ensureSeedData`는 첫 번째 initialization hook이다. PostgreSQL은 idempotent한 초기 schema 문자열을 실행하고 memory 구현은 아무 작업도 하지 않는다. initialization과 종료를 repository에 모아두면 이후 API bootstrap은 storage를 한 번 선택한 뒤 startup과 shutdown에 동일한 resource ownership 규칙을 유지할 수 있다.

## feat(db): 개발 사용자 seed 저장 구현
repository initialization을 실제로 사용할 수 있는 개발 dataset으로 확장하고 공통 development-login upsert를 추가한다. handle은 trim한 뒤 소문자로 바꾸고, 지원하는 문자 집합으로 제한하며, 연속된 hyphen 주변을 정리하고, 결과가 유효하지 않을 경우 안전한 fallback을 사용한다. display name이 없으면 canonical handle을 사용하고, email은 결정적인 development domain으로 생성하며, avatar key도 handle을 기준으로 결정적으로 선택해 initialization을 반복해도 안정적인 사용자 identity와 표시 값을 얻도록 한다.

PostgreSQL은 unique handle을 기준으로 upsert하고 변경 가능한 login field를 갱신하며, 대표 player를 seed하고 `admin` handle을 승격한 뒤 lobby view용 sample rating과 전적을 적용한다. memory repository도 UUID 기반 local row와 seeded user를 사용해 같은 identity-upsert 경계를 구현하지만, 이 revision에서는 초기 sample set과 rating 세부 값을 의도적으로 더 단순하게 둔다. 두 구현 모두 공유 `SessionUser` 표현을 반환하므로 상위 계층은 row storage 방식에 의존하지 않는다.

## feat(db): 사용자 session 저장 구현
authentication 상태를 HTTP server가 아니라 persistence가 소유하도록 repository abstraction에 session 생성과 조회를 추가한다. PostgreSQL은 opaque UUID token을 생성해 user와 14일 만료 시각과 함께 저장하고, 만료 시각이 아직 미래인 session만 조회한다. session table을 join해 persistence row 자체를 호출자에게 노출하지 않고 현재 사용자 projection을 반환한다.

memory repository는 로컬 실행과 test를 위해 token-to-user 조회를 동일하게 구현하지만, 이 단계에서는 의도적으로 expiry 동작을 생략한다. token이 없거나 알 수 없는 경우 `null`을 반환해 두 구현 모두 상위 계층에 동일한 unauthenticated 결과를 제공한다. 이 경계는 이후 HTTP와 WebSocket authentication에서 재사용되는 identity lookup 경계가 된다.

## feat(db): 프로필 조회와 변경 저장 구현
login 중심 identity access에서 public profile 조회, 인증된 profile update, active user listing까지 repository 기능을 확장한다. 두 구현 모두 조회 전에 handle을 정규화해 사용자 생성 시 사용한 canonical identity 규칙을 그대로 유지한다.

profile update에서 필드가 생략되면 저장된 기존 값을 사용하므로 관련 없는 속성을 덮어쓰지 않고 부분 변경할 수 있다. PostgreSQL 구현은 update 후 session에 사용할 수 있는 user를 반환하고, public 조회는 제한된 `PublicUser` 표현으로 mapping한다. active user listing은 PostgreSQL에서 active가 아닌 사용자를 제외하고 rating 순으로 정렬한 뒤 lobby용 최대 개수를 제한한다. memory 구현도 local dataset에서 관찰 가능한 동일한 ranking 순서를 제공한다.

## feat(db): 순위 조회 구현
repository contract에 leaderboard projection을 추가한다. ranking은 rating 내림차순으로 결정하고 동률일 때 win 수를 tie-breaker로 사용하며, PostgreSQL은 public 결과를 상위 20명으로 제한한다. 각 entry는 raw persistence row를 노출하는 대신 1부터 시작하는 rank, public user 표현, 계산된 win percentage를 함께 제공한다.

win rate는 win과 loss에서 계산하며 경기 수가 0일 때의 값을 명시적으로 처리하고 소수점 첫째 자리까지 반올림한다. memory repository도 동일한 정렬과 계산을 적용해 API test와 local 실행에서 비교 가능한 동작을 유지한다.

## feat(db): 경기 조회 row contract 정의
영속화된 match를 위한 typed row와 mapping 경계를 정의한다. schema에는 mode, nullable winner/loser identity, left/right score, rating delta, lifecycle timestamp를 기록하고, joined projection에는 사용자 대상 summary를 만들기 위해 필요한 양쪽 player handle을 추가한다.

`toMatchSummary`는 동일한 저장 match를 선택적으로 주어진 viewer 기준으로 해석한다. 상대 handle을 선택하고 win/loss를 판정하며, database 숫자 값을 정규화하고 표시할 rating delta를 적용한 뒤 종료 시각을 serialize한다. 이 해석을 mapper에 유지하면 SQL column 이름과 nullable join 세부 정보가 API contract로 새어 나가지 않는다. viewer 식별자가 없으면 초기 mapper는 record를 win 기준의 global summary로 취급하며, 이 단계에서 제공되는 동작도 이에 따른다.

## feat(db): 최근 경기와 대시보드 조회 구현
repository contract 뒤에서 최근 match와 dashboard 조회를 구현한다. PostgreSQL은 필요하면 특정 사용자가 참여한 match로 필터링하고 winner/loser handle을 join한 뒤 종료 시각 순으로 정렬해 최대 8건만 반환한다. row mapper는 각 결과를 해당 사용자 관점으로 표현한다. memory repository도 local record에 대해 동일한 filtering, 최신순 정렬, 제한된 history를 구현한다.

dashboard는 현재 사용자의 public projection, 최근 match, 계산된 통계를 결합해 구성한다. repository가 session 수준에서 email에 접근할 수 있더라도 반환되는 `me`에서는 email을 제거해 dashboard의 public-data 경계를 유지한다. win rate는 저장된 win/loss에서 계산한다. 초기 best-streak 값은 PostgreSQL에서는 제한된 추정치, memory에서는 고정 prototype 값이므로, 이 커밋은 실제 연승 계산을 구현하기 전에 response shape를 먼저 확립한다.

## feat(db): 친구 관계 저장 구현
repository abstraction에 friendship 목록 조회, 요청, 수락을 추가한다. PostgreSQL은 목록 조회 시 관계의 어느 쪽 participant든 owner로 취급하고 상대 사용자의 public data를 join하며, 마지막 상태 변경 시각 기준으로 정렬한다. 요청에서는 정규화된 handle로 addressee를 찾고, requester/addressee 순서쌍에 upsert를 사용해 같은 방향의 요청을 반복하면 새 row를 만들지 않고 기존 row를 갱신한다.

수락은 update 대상을 기록된 addressee로 제한하므로 requester나 관계없는 사용자가 이 method를 통해 해당 row를 수락할 수 없다. memory 구현도 test를 위해 pending에서 accepted로 바뀌는 관찰 가능한 전이를 재현하지만, 이 revision에서는 단순화된 비범위 목록을 저장하며 동일한 participant 검사를 강제하지는 않는다. 공유 mapper는 관계 metadata와 상대 친구의 user field를 분리한다.

## feat(db): 경기 결과 저장 구현
realtime 게임 실행이 구체적인 database 구현에 의존하지 않고 하나의 domain result를 영속화할 수 있도록 repository contract에 match completion을 추가한다. input에는 mode, winner/loser identity, 양쪽 score를 기록하고, repository는 이후 completion event에 필요한 생성된 match 식별자를 반환한다.

PostgreSQL 구현은 match를 저장한 뒤 프로젝트 초기의 고정 rating 및 전적 조정을 적용한다. winner는 win 1회와 rating 16점을 얻고, loser는 loss 1회가 추가되며 rating은 12점 감소하되 최저 800점을 유지한다. memory 구현도 local/test용 match record와 counter 변경을 동일하게 반영한다. 이 revision에서는 이 statement들이 명시적인 transaction 없이 순차 실행되므로, 이 커밋은 persistence 동작을 확립하지만 결과 update 전체의 atomic all-or-nothing 보장까지 제공하지는 않는다.

## feat(db): 채팅 메시지 저장 구현
lobby와 match scope 모두에 대해 영속 chat message를 저장하도록 repository를 확장한다. message storage에는 scope, 선택적인 room 식별자, sender identity, 본문, 생성 시각을 저장하고, public 표현에서는 database column 구조를 호출자에게 노출하는 대신 mapping된 sender를 포함한다.

lobby history는 의도적으로 최신 20건으로 제한한다. PostgreSQL은 효율적인 limit을 위해 최신순으로 읽은 뒤 반환 전에 순서를 뒤집어 시간순 표시를 유지하며, memory repository도 같은 tail-window 동작을 적용한다. lobby와 match message를 명시적인 scope가 있는 하나의 typed record로 유지하면 공통 write path를 사용하면서도 match 전용 전달에 필요한 room 경계를 보존할 수 있다.

## feat(db): 토너먼트 row contract 정의
tournament를 공유 application contract로 mapping하는 데 필요한 typed persistence 표현을 정의한다. tournament table과 entry table을 분리해 event metadata와 membership을 독립적으로 모델링하고, 각 tournament는 참가 사용자별 seed 순서를 보존하면서 creator와 최종 winner를 참조할 수 있다.

joined-row projection에는 creator의 user field를 명시적으로 포함한다. `toTournamentSummary`는 이 database 중심 구조와 별도로 load한 entry 목록을 API용 aggregate로 변환한다. participant count는 중복 storage 값을 신뢰하지 않고 entry에서 계산하며, capacity는 number로 정규화하고 creator는 다른 곳과 동일한 public-user 경계를 통해 mapping한다. 이 단계에서는 tournament 진행이 아직 구현되지 않았으므로 winner mapping은 `null`로 유지한다.

## feat(db): 토너먼트 참가 저장 구현
공통 repository interface를 통해 tournament 생성, 목록 조회, 참가를 구현한다. PostgreSQL은 creator 정보와 함께 최근 tournament를 조회하고, seed가 지정된 각 participant 목록을 load한 뒤 row를 공유 `TournamentSummary`로 mapping한다. 생성 시 capacity를 4명으로 설정하고 creator를 즉시 참가시켜, 새 cup은 owner가 첫 참가자로 등록된 상태에서 시작한다는 invariant를 만든다.

참가 시 현재 entry 수를 기준으로 다음 seed를 부여하고 tournament/user unique 제약을 사용해 반복 참가가 중복 row를 만들지 않도록 한다. memory repository도 creator 등록, 중복 방지, participant count, capacity 도달 시 `open`에서 `running`으로 전환되는 동작을 동일하게 구현한다. 이로써 local과 database-backed application code가 동일한 aggregate-level contract 뒤에 놓인다. 다만 이 revision에서는 concurrent seed allocation을 명시적으로 serialize하지 않는다.

## feat(db): 관리자 상태 변경 저장 구현
repository 경계에 administrator용 사용자 목록 조회와 ban 상태 변경을 추가한다. PostgreSQL mutation은 대상 user의 status와 ban timestamp를 update한 뒤 actor, target, action, reason을 담은 별도 `admin_actions` row를 기록한다. method에 두 identity를 모두 전달해 authorization 판단은 service layer에 남기면서 audit trail에 필요한 persistence context를 보존한다.

memory repository도 같은 active/banned 전이를 관찰 가능하게 구현해 PostgreSQL 없이 API test가 contract를 검증할 수 있게 한다. 다만 audit record는 저장하지 않으며, 이 revision에서 PostgreSQL의 user update와 audit insert도 명시적인 transaction으로 묶여 있지 않다. 따라서 이 변경은 의도한 data model과 동작을 마련하지만 atomic한 audit consistency까지 보장하지는 않는다.

## feat(db): 데이터베이스 CLI 명령 연결
migration/seed 설정과 검증을 package-level CLI command로 실행할 수 있게 repository initialization을 노출한다. 현재 `migrate`와 `seed`는 모두 repository의 idempotent `ensureSeedData` 경로를 호출하므로, application startup만을 유일한 진입점으로 사용하지 않고 package script에서 schema 설정과 baseline data 생성을 재현할 수 있다. repository 검증용 Vitest command도 추가한다.

CLI는 `DATABASE_URL`을 요구하고 PostgreSQL repository를 한 번 생성한 뒤 `finally` block에서 닫는다. 따라서 잘못된 command나 initialization 실패가 발생해도 connection ownership이 명확하다. `memory-smoke` branch는 memory repository를 잠시 initialize하고 종료하지만, 이 revision에서는 해당 branch에 도달하기 전에 여전히 database URL을 검사하고 PostgreSQL repository를 먼저 연다.

## test(db): 메모리 저장소 흐름 검증
공유 repository contract의 in-memory 구현에 behavioral coverage를 추가한다. 첫 번째 scenario는 user와 session을 만들고 완료된 match를 저장한 다음, session 조회와 dashboard projection이 동일한 identity, win 결과, 갱신된 win count를 반영하는지 검증한다. 단일 return value가 아니라 operation 간 상호작용을 확인한다.

두 번째 scenario는 friend request가 pending 상태를 유지하는지, tournament 생성 시 creator가 참가자로 등록되고 participant count가 갱신되며 목록 조회에서 확인되는지 검증한다. 이 test들은 상위 HTTP 및 service test가 의존하는 상태 전이를 보호해 memory repository를 실질적인 대체 구현으로 만든다.

## chore(api): Fastify 패키지 경계 구성
Fastify, cookie 및 CORS 지원, WebSocket integration, shared/database workspace package, runtime contract용 Zod를 포함하는 API workspace 경계를 만든다. package script는 watch-mode 개발과 일반 startup을 분리하고, TypeScript no-emit check를 build 및 type validation gate로 사용한다.

package-local TypeScript 설정은 저장소 공통 기준을 확장하고 Node type을 활성화하며 분석 범위를 API source file로 제한한다. 이를 통해 server는 공유 contract와 repository abstraction을 소비하는 독립 실행 가능한 workspace가 되며, application code가 선언되지 않은 root dependency에 의존하지 않도록 한다.

## feat(api): 로그인과 로비 HTTP 경계 구현
repository-backed identity와 lobby model을 둘러싼 첫 HTTP 경계를 구성한다. development login은 user를 새로 만들거나 재사용하고 server-side session을 생성한 뒤, 해당 session을 `httpOnly`, `SameSite=Lax` cookie와 반환 token 두 방식으로 노출한다. cookie는 credential을 client-side JavaScript에 노출하지 않고 일반 browser request를 지원하며, 명시적인 token은 cookie 전달에 의존할 수 없는 client와 이후 transport에서도 사용할 수 있다.

authentication lookup을 중앙화해 protected route가 credential을 각자 다르게 해석하지 않도록 한다. 동일한 session을 cookie, Bearer header, `session` query parameter에서 조회할 수 있고, `/me`는 authentication을 강제하며 public lobby는 선택적으로 현재 user를 response에 포함할 수 있다. lobby, 최근 match, chat, leaderboard 조회는 계속 repository operation으로 유지해 HTTP 관심사와 persistence/domain 표현을 분리한다. credentialed CORS는 설정된 web origin과 지원하는 local origin으로 제한한다.

## feat(api): 실행 환경과 service bootstrap 구성
runtime configuration, persistence 선택, startup, shutdown을 위한 명시적인 service composition root를 도입한다. environment parsing은 API port, 선택적인 database URL, web origin, session secret을 local prototype 기본값이 포함된 하나의 typed object로 변환한다. nullable database URL이 PostgreSQL repository와 in-memory repository를 선택하는 switch 역할을 하므로, 배포 모드와 local 모드 모두 HTTP application은 동일한 repository contract에 의존한다.

bootstrap은 traffic을 받기 전에 seed initialization을 수행하고 repository 종료를 Fastify shutdown lifecycle에 등록한다. listen 실패 시에도 종료 전에 repository를 닫아 persistence resource를 생성한 entry point가 해당 resource를 해제한다는 ownership 규칙을 지킨다. `0.0.0.0`에 bind하므로 service는 loopback뿐 아니라 container 및 host networking에서도 접근할 수 있다.

## feat(api): 프로필과 친구 리소스 라우트 추가
public read와 identity-bound mutation을 구분하면서 HTTP resource 경계를 profile, dashboard, friendship으로 확장한다. user/handle 기반 profile 조회는 계속 public이며 요청한 identity가 없으면 `404`를 반환한다. 반면 dashboard, 현재 profile update, friend 목록, friend request, 수락은 모두 authenticated session에서 actor를 결정한다.

request payload에서 caller identity를 제외해 client가 mutation의 owner로 다른 user를 지정할 수 없도록 한다. route는 profile update, match 조회, friendship 전이를 repository에 위임하고 persistence와 relationship rule을 하나의 interface 뒤에 둔다. `/friends/request`와 `/friends`는 동일한 request operation을 노출하므로 underlying state transition을 중복 구현하지 않으면서 호환 가능한 HTTP 진입점을 제공한다.

## feat(api): 토너먼트와 관리자 라우트 추가
명시적인 authentication 및 authorization 경계를 갖는 tournament와 administration resource를 추가한다. tournament 목록 조회는 public이고, 생성 시 authenticated user를 `createdBy`로 기록하며 참가자 역시 client가 보낸 user identifier를 신뢰하지 않고 동일한 session에서 결정한다.

administrative read와 상태 변경은 unauthenticated request(`401`)와 authenticated non-administrator(`403`)를 구분한다. ban 및 status mutation은 administrator identity와 target identity를 모두 repository에 넘겨 audit record를 지원할 수 있는 actor/subject 경계를 유지한다. operation 호출 권한은 route layer가 결정하고, resulting user state의 적용과 persistence는 repository가 담당한다.

## test(api): 로그인과 로비 조회 검증
route helper를 따로 test하는 대신 Fastify injection을 통해 API integration coverage를 추가한다. 각 test마다 seed된 새로운 memory repository와 application을 만들고 종료 후 둘 다 닫아 case 간 session 및 repository state를 결정적으로 유지한다.

test는 실제 development-login 경로를 따라가 반환된 Bearer token을 `/me`에서 재사용하고, authenticated identity가 route-to-repository 전체 round trip을 거쳐도 유지되는지 확인한다. 별도 assertion으로 public leaderboard와 lobby가 계속 읽을 수 있는지, seed된 ranking data가 실제 노출되는지 검증한다. package test command를 통해 이 경계도 일반 workspace 검증 흐름에서 실행된다.

## test(api): 실행 환경 기본값 검증
configuration precedence와 local runtime contract를 고정한다. 명시적인 environment 값은 설정된 port, database URL, web origin으로 parsing되어야 하며, 빈 environment에서는 port `4000`, database connection 없음, local web origin을 선택해야 한다. 이를 통해 이후 bootstrap 변경이 in-memory development mode를 조용히 비활성화하거나 service의 예상 local endpoint를 바꾸지 못하게 한다.

## test(api): 관리자 사용자 상태 변경 검증
실제 login, token authentication, routing, repository mutation을 거쳐 administrator 상태 변경 경로를 검증한다. test는 administrator와 target identity를 각각 생성하고 administrator의 Bearer token을 ban endpoint에 전달한 뒤 반환된 target 표현이 `banned`인지 확인한다.

새 memory repository를 사용해 authorization scenario를 격리하면서도 session resolution, role-gated routing, persisted user status 사이의 integration을 함께 검사한다. 이 case는 administrator의 성공 경로만 보호하며, 별도의 denial-path coverage를 대체하지 않는다.

## test(api): 토너먼트 생성 흐름 검증
authentication, HTTP routing, repository storage 전반에서 tournament write-to-read contract를 검증한다. login 후 반환된 Bearer token으로 이름 있는 tournament를 생성한 다음 public tournament collection을 조회해 새 이름이 response에 포함되는지 확인한다.

이 test는 생성 요청에 성공 응답만 하고 repository-backed listing endpoint에서는 해당 tournament가 보이지 않는 구현을 방지한다. 매번 새 application과 repository instance를 만들고 명시적으로 정리하므로 persistence 결과를 이 단일 flow에 귀속할 수 있다.

## feat(realtime): 인증된 WebSocket 연결 구성
authenticated WebSocket upgrade 경계와 첫 connection hub를 추가한다. `/ws` handler는 socket을 받아들이기 전에 HTTP route와 동일한 repository-backed session identity를 조회한다. identity가 없으면 policy-violation close code로 닫고, authentication infrastructure가 실패하면 internal-error close code를 사용한다.

`GameHub`는 수락된 각 transport에 내부 connection 식별자를 부여하고 연관된 `SessionUser`를 보관하며, close 시 client를 제거하고 open 상태인 socket에만 typed presence event를 broadcast한다. realtime state 생성 전에 identity를 확정하므로 이후 matchmaking과 game command는 client가 보낸 identity field를 신뢰하지 않고 authenticated user에 귀속시킬 수 있다.

## feat(game): 실시간 경기 방 초기화
server가 소유하는 room 표현과 canonical initial `GameSnapshot`을 도입한다. room 생성 시 left/right participant를 배치하고 필요한 경우 typed AI participant를 대입하며, shared game constant에서 score, paddle, ball, phase, server time을 초기화한 뒤 연결된 각 client에 room 식별자를 기록한다.

participant는 side별 `queue.matched` event와 동일한 초기 snapshot을 받고, room broadcast는 global presence broadcast와 분리된다. disconnect cleanup은 room을 삭제하기 전에 모든 participant의 room reference를 비운다. 이 revision에서는 factory가 아직 client command에서 직접 호출되지는 않으며, 이후 matchmaking 작업에서 사용할 ownership 및 initialization invariant를 정의한다.

## feat(game): 실시간 매칭 대기열 연결
검증된 client event를 matchmaking에 연결한다. queue 참가 시 먼저 client가 기존 queue에 있으면 제거해 중복 위치를 막는다. AI mode는 즉시 room을 만들고, normal mode는 새 참가자를 가장 오래 기다린 client와 pair하거나 FIFO queue 끝에 추가한다.

queue 이탈은 명시적인 `queue.leave` command와 socket disconnect 모두에서 사용해 닫힌 connection이 이후 match에 남지 않도록 한다. 잘못된 protocol input은 connection 경계 안에서 처리하고 queue state를 변경하지 않은 채 typed error event로 반환한다.

## feat(game): 실시간 경기 채팅 전달
`chat.send`를 asynchronous repository-backed realtime operation으로 처리한다. authenticated connection이 sender identity를 제공하고 repository가 canonical message를 생성하며, client에는 해당 persisted result만 broadcast한다.

room 식별자가 있는 match-scoped message는 room broadcast 경계를 통해 전달하고, lobby message는 연결된 모든 client에 보낸다. publication 전에 persistence를 수행해 event payload, 이후 history 조회, sender 표현을 일치시킨다. repository 또는 validation 실패는 기존 protocol error 경로를 통해 요청을 보낸 socket에 반환한다.

## feat(game): 서버 주도 퐁 물리 갱신
`GameHub` 내부에 authoritative simulation step을 구현한다. 각 tick마다 server time과 tick number를 진행시키고, 범위가 제한된 paddle movement를 적용하며, ball 위치에서 AI paddle direction을 계산하고, ball을 이동시킨 뒤 field/paddle boundary에서 반사한다. ball이 court 밖으로 나가면 score를 올리고 serve를 reset한 다음 결과 snapshot을 broadcast한다.

paddle 충돌 시 impact offset에 따라 horizontal speed와 vertical angle을 함께 변경해 collision authority를 browser로 옮기지 않으면서 조작 가능한 rally를 만든다. 이 커밋은 deterministic state transition을 정의하지만 아직 이를 schedule하지는 않는다. readiness와 timer lifecycle은 다음 변경에서 연결한다.

## feat(game): 경기 준비와 paddle 입력 연결
readiness와 paddle command를 room state에 연결한다. client는 `sideFor`가 해당 내부 connection이 room의 participant slot 중 하나를 차지하고 있음을 확인한 경우에만 room에 영향을 줄 수 있다. readiness는 snapshot에 반영하고 AI 쪽은 자동으로 ready 처리한다. 양쪽이 모두 ready가 되면 고정 주기 simulation timer를 시작하되, 기존 timer가 없을 때만 생성한다.

room-scoped input은 authenticated participant 자신의 direction만 갱신하고 이미 끝난 room에서는 무시한다. 개별 key event와 지속되는 direction 상태를 분리하면 server가 자체 tick schedule에 맞춰 movement를 sampling할 수 있으므로 simulation authority를 유지할 수 있고, ready event가 중복으로 들어와 여러 loop가 생성되는 것도 방지한다.

## feat(game): 경기 종료와 결과 저장 연결
realtime room에 terminal lifecycle을 추가한다. 어느 한쪽이 shared winning score에 도달하거나 45초 tick limit에 도달하면 room을 종료한다. human participant가 disconnect한 경우에도 종료하며, 이때 남아 있는 쪽을 winner로 결정한다.

`finishRoom`은 simulation timer를 해제하고 authoritative snapshot을 finished로 표시한 뒤, mode, participant, 최종 score와 함께 match를 영속화하고 repository가 부여한 match 식별자를 담은 `game.finished` result를 broadcast한다. 이후 participant의 room reference를 비우고 room을 제거한 다음 presence를 다시 broadcast한다. persistence, notification, timer ownership, room cleanup이 하나의 lifecycle transition으로 일어나야 하므로 모든 terminal path를 하나의 method로 모으는 것이 중요하다.

## chore(web): Next.js runtime 경계 구성
web workspace를 Next.js application으로 구성하고 development, production build, type-check command와 React/styling 의존성, repository 공통 설정에서 파생된 TypeScript configuration을 추가한다. local path alias는 중간 artifact를 publish하지 않고 application source와 workspace package를 노출한다.

`transpilePackages`는 `@pong-pong/shared`를 명시적인 framework 경계로 만들어 web application이 monorepo 안의 공유 TypeScript source와 protocol type을 사용할 수 있게 한다. 자동 생성되는 Next.js type reference는 직접 작성한 runtime/compiler 결정과 함께 존재하지만 configuration semantics의 source 자체는 아니다.

## chore(web): Tailwind style build 구성
PostCSS에서 Tailwind와 Autoprefixer를 실행하도록 설정하고, Tailwind source scan 범위를 web application의 TypeScript/TSX tree로 제한한다. theme에는 소수의 이름 있는 application color와 공통 card shadow를 확장해 이후 component가 raw value를 반복하지 않고 안정적인 semantic token에 의존하도록 한다.

이는 build-time styling 경계다. application source에서 실제로 도달 가능한 class만 생성되고, browser prefix도 같은 CSS pipeline에서 적용된다.

## feat(web): 한국어 로비 shell 초기화
한국어 document metadata, language 선언, global design token, 기본 element rule, 재사용 가능한 card style, 접근성을 고려한 focus-visible 처리를 포함하는 초기 Next.js App Router shell을 만든다. 첫 home page는 product 경계를 server가 실행하는 match를 사용하는 한국어 realtime Pong lobby로 명시한다.

document metadata와 global visual primitive를 root layout과 stylesheet에 두어 이후 route가 공통 기반을 사용하게 한다. 각 화면이 page chrome이나 interaction focus 동작을 따로 정의하지 않도록 한다.

## feat(web): 인증 API client 구현
authentication과 초기 application read model을 위한 공통 browser-side HTTP client를 구현한다. `apiFetch`에서 API base URL, cookie 포함, JSON header, bearer token 전달, non-success 처리, typed response decoding을 중앙화해 개별 page가 transport policy를 반복 구현하지 않도록 한다.

development login은 반환된 token을 local storage에 저장해 이후 HTTP와 WebSocket에서 사용한다. `/me`는 authentication failure를 unauthenticated 결과로 변환한다. 이 초기 UI 단계에서는 lobby, dashboard, leaderboard, tournament read가 의도적으로 typed sample data로 fallback하지만, state-changing tournament creation은 write가 성공한 것처럼 위장하지 않고 실패를 그대로 전달한다.

## feat(web): 사용자와 서비스 sample 데이터 추가
user, leaderboard row, player dashboard, lobby chat, tournament용 typed fixture set을 추가한다. 모든 sample을 shared domain interface를 통해 구성해 UI가 별도의 view-only mock object가 아니라 API와 동일한 field shape를 사용하도록 한다.

fixture는 service integration이 완성되지 않은 동안 deterministic한 development 및 failure-state content를 제공한다. 이는 별도의 source of truth가 아니라 presentation 지원용이다. 생성된 rank, win rate, tournament membership은 sample module 내부에만 두어 실제 response로 일괄 교체할 수 있다.

## feat(web): 경기 snapshot sample 추가
realtime room이 연결되기 전에 court를 렌더링할 수 있도록 완전한 `GameSnapshot` fixture를 추가한다. sample은 공유 field dimension과 paddle constant를 사용하고 양쪽 player descriptor를 포함하며, ball position/velocity, score, phase, server time을 game service가 내보내는 것과 동일한 구조로 표현한다.

protocol constant를 재사용하므로 preview geometry가 live snapshot과 호환되고, renderer를 별도의 canvas 전용 model이 아니라 production contract 기준으로 개발할 수 있다.

## feat(web): 공통 내비게이션 프레임 구현
route navigation, active route highlighting, responsive sidebar layout, 공통 content width를 소유하는 재사용 가능한 application shell을 도입한다. 이 frame을 중앙화하면 feature page는 자체 data와 action에 집중할 수 있고 주요 route 전체에 일관된 information hierarchy를 제공할 수 있다.

이 초기 shell의 connection, readiness, version, wait-time label은 runtime 관측값이 아니라 정적인 presentation text다. 이후 각 page의 독립적인 상태 문구를 개별 수정하는 대신 하나의 공유 경계에서 실제 값으로 교체할 수 있다.

## feat(web): 퐁 캔버스 미리보기 구현
`GameSnapshot`을 받아 shared game dimension을 기준으로 field, center line, paddle, ball, score를 그리는 canvas renderer를 추가한다. canvas backing store는 device-pixel ratio에 맞춰 scaling하되 drawing은 logical game coordinate를 유지해 server 좌표계를 바꾸지 않으면서 선명한 출력을 제공한다.

snapshot이 변경될 때마다 다시 렌더링하므로 component를 fixture preview와 이후 server snapshot 모두에 사용할 수 있다. 별도의 `StatCard` component도 추가해 특정 service response에 결합하지 않은, label이 있는 metric용 소형 재사용 visual primitive를 마련한다.

## feat(web): 개발용 로그인 패널 추가
handle과 display name을 입력받아 typed authentication client를 호출하고 authenticated `SessionUser`를 parent에 전달하는 development-login form을 추가한다. transport failure는 명확히 보이는 error로 변환하며, 성공한 login만 caller state를 갱신한다.

component는 의도적으로 development authentication endpoint에만 한정한다. 이 workflow를 전용 panel 뒤에 두어 page가 token persistence나 login-request 세부 사항을 직접 포함하지 않도록 한다.

## feat(web): 로비 인증 진입 연결
home route가 authenticated session state에 따라 분기하도록 한다. mount 시 현재 user를 복원하고 lobby aggregate를 load한다. unauthenticated user에는 development-login panel을 보여주고, authenticated user는 반환된 player/chat count가 채워진 lobby summary로 진입한다.

lobby request에서 `me`도 함께 제공할 수 있으므로 하나의 response로 identity와 lobby view를 맞출 수 있다. 이를 통해 logged-in screen을 단순 client navigation으로만 노출하지 않고 authentication 자체를 application 진입 경계로 설정한다.

## feat(web): 로그인 사용자 로비 화면 구성
authenticated home-page summary를 common shell 안에 구성된 완전한 lobby로 교체한다. session statistic, online player, lobby message, matchmaking/AI practice/leaderboard link가 login 이후 주요 navigation surface를 이룬다.

player와 chat collection은 기존에 load한 lobby response에 연결한다. 다만 weekly change나 30초 wait estimate 같은 일부 설명용 metric은 이 revision에서도 고정 문구로 남아 있다. 따라서 이 변경은 해당 label을 실제 측정값이라고 오해시키지 않는 범위에서 lobby의 책임과 layout을 확립한다.

## feat(play): 경기장 화면 구성
재사용 가능한 Pong canvas를 중심으로 첫 전용 play route를 추가한다. typed sample snapshot을 렌더링하면서 queue 진입, AI practice, connection status, score, player readiness에 대한 visible boundary를 page에 정의한다.

이 revision에서는 모든 control과 status 값이 아직 local presentation이다. transport integration 전에 screen을 먼저 확립해 court rendering과 match layout을 독립적으로 test할 수 있게 하고, 이후 commit에서는 page 구조를 다시 만들지 않고 각 affordance를 realtime protocol에 연결할 수 있다.

## feat(play): WebSocket 경기 연결 구현
play screen을 static preview가 아니라 realtime game protocol client로 전환한다. 저장된 session token이 있을 때만 authenticated WebSocket을 열고, transport가 open되면 public queue 또는 AI room에 참가한다. `queue.matched`로 반환된 room 식별자를 기록한 뒤에만 `game.ready`를 보낼 수 있게 한다.

이제 snapshot, completion result, protocol error가 visible match state를 결정한다. room assignment, simulation, score, termination의 authority는 server에 두고 browser는 connection intent와 presentation만 소유한다. 이후 command에 할당된 `roomId`를 계속 포함하므로 확립된 match context 없이 ready signal이 적용되는 것도 막는다.

## feat(play): keyboard paddle 입력 연결
Arrow 및 W/S keyboard event를 room-scoped `game.input` protocol에 mapping한다. movement key를 누르면 `-1` 또는 `1`을 전송하고, key를 놓으면 neutral direction을 보내 player가 키를 놓은 뒤에도 server가 이전 movement를 계속 적용하지 않도록 한다.

listener는 현재 room binding이 유지되는 동안만 설치하고 binding이 바뀌거나 page가 unmount되면 제거한다. browser input을 local simulation state가 아닌 일시적인 command stream으로 만들어 paddle movement에 대한 server ownership을 유지한다.

## feat(play): 경기 상태와 채팅 panel 구성
authoritative snapshot을 중심으로 match view를 확장해 오른쪽 player를 opponent로 표시하고, 들어오는 `chat.message` event를 court 옆에 렌더링한다. message list는 최근 일부만 유지해 긴 session 동안 누적되는 transient UI state의 크기를 제한한다.

이 커밋은 opponent 정보, match chat, 이후 match control을 위한 presentation 경계를 마련한다. 이 단계에서 chat input과 pause button은 시각적인 affordance일 뿐이며, 새로 실제 연결된 동작은 수신 chat뿐이다. 따라서 아직 이 control이 server에 영향을 준다고 표현하지 않는다.

## feat(web): 플레이어 대시보드 구현
공유 `DashboardSummary` read model을 사용하는 dashboard route를 추가한다. 한 번의 request로 player record, aggregate win rate와 streak, 최근 match를 가져오므로 여러 독립 client-side query를 조합하지 않고도 상호 일관된 statistic을 렌더링할 수 있다.

recent-match 목록은 data-driven으로 구성하고 API의 result 및 score 표현을 그대로 유지한다. 이 revision에서는 rating polyline이 여전히 고정 visual placeholder이므로, 이 커밋은 과거 rating sample이 이미 존재하는 것처럼 보이지 않는 범위에서 dashboard layout과 aggregate contract를 확립한다.

## feat(web): 순위표 화면 추가
공유 `LeaderboardEntry` contract를 소비해 API가 반환한 rank, player record, rating, win rate를 렌더링하는 leaderboard route를 추가한다. browser는 별도 user 목록을 다시 정렬하지 않고 server가 제공한 rank를 그대로 사용해 ordering rule과 표시 ordinal을 하나의 authority 아래 둔다.

request가 진행 중일 때는 sample entry로 초기 화면을 렌더링하고, 완료되면 전체 목록을 server response로 교체한다.

## feat(web): 토너먼트 대진표 화면 추가
첫 tournament page를 추가하고 tournament 목록 조회와 생성을 HTTP API에 연결한다. 새 tournament가 생성되면 반환된 `TournamentSummary`를 local collection에 즉시 넣어 client-only entry를 임의로 만드는 대신 persisted resource가 화면에 반영되게 한다.

함께 표시되는 bracket은 첫 tournament entry를 round column으로 배치한 초기 projection이다. 아직 tournament 선택과 참가는 연결하지 않는다. 의도적으로 resource discovery와 creation만 동작하게 하고 bracket progression은 presentation scaffold로 남겨둔 첫 경계다.

## feat(web): 공개 프로필 화면 추가
handle에 따라 표시할 player identity를 선택하는 dynamic public-profile route를 추가한다. page는 `PublicUser` 표현에서 rating, win/loss 합계, win rate를 계산해 표시하고, 이후 API integration에서 사용할 profile layout과 social-action affordance를 마련한다.

이 revision은 명시적으로 fixture 기반이다. 알 수 없는 handle은 synthetic sample profile을 만들고, style 설명은 고정되어 있으며, friend/share button에는 동작이 없다. 따라서 이 커밋은 placeholder data를 영속 profile source로 취급하지 않는 범위에서 client-side route와 presentation contract를 정의한다.

## feat(web): 관리자 화면 추가
protected user 목록을 요청해 각 account의 전적, rating, active/banned 상태를 표시하는 read-oriented administration route를 추가한다. operational view를 별도 route에 두어 moderation 관심사를 일반 player screen과 분리하고, 이후 privileged action을 추가할 위치를 마련한다.

page는 아직 sample user에서 시작하고 request가 실패해도 이를 조용히 유지하며, review button도 연결되어 있지 않다. 따라서 administrative information 경계는 마련하지만 신뢰할 수 있는 permission signal이나 state-changing workflow까지 구현한 것은 아니다.

## build(runtime): Compose와 Caddy 라우팅 추가
PostgreSQL, Fastify API, Next.js client, Caddy gateway를 위한 재현 가능한 multi-service runtime을 정의한다. API 시작 전에 database readiness를 확인하고, persistent data와 dependency directory에는 named volume을 사용하며, service configuration은 명시적인 environment variable로 제공한다.

Caddy는 port 8080에서 browser가 보는 단일 origin을 제공한다. `/api/*`는 prefix를 제거한 뒤 API로 전달하고, `/ws`는 WebSocket endpoint를 그대로 유지하며, 나머지 request는 모두 web application으로 보낸다. 이 routing 경계를 통해 browser가 container hostname을 알 필요가 없고 HTTP, WebSocket, UI traffic을 하나의 integration point로 통합할 수 있다.

## test(smoke): HTTP API 실행 검사 추가
development login을 수행한 뒤 authenticated `/me`, `/lobby`, `/dashboard` 조회와 public leaderboard를 함께 실행하는 runtime smoke test를 추가한다. helper는 non-success response를 status와 payload와 함께 모두 실패 처리하므로 routing, authentication propagation, 기본 response availability를 하나의 실행 가능한 deployment check로 묶는다.

이 test는 의도적으로 endpoint unit test보다 범위는 넓고 깊이는 얕다. 모든 field-level rule이 아니라 실제 session credential을 사용하는 실행 중 service가 주요 HTTP 경로를 완료할 수 있는지 검증한다.

## test(smoke): WebSocket 경기 실행 검사 추가
두 player를 login하고 두 socket connection을 authentication한 뒤 matchmaking queue에 참가시키고, 생성된 room을 ready 상태로 만든 다음 playing snapshot과 전달된 match-chat message를 기다리는 running-system WebSocket smoke test를 추가한다. bounded polling helper를 사용해 protocol event가 오지 않을 때 무한히 대기하지 않고 check를 실패시킨다.

이 scenario는 HTTP authentication, WebSocket upgrade, matchmaking, readiness, simulation startup, chat broadcasting을 잇는 주요 realtime chain을 검증한다. HTTP smoke test와 함께 등록해 transport integration을 일반 runtime 검증 범위에 포함한다.

## test(e2e): 한국어 내비게이션과 캔버스 흐름 구성
Playwright를 repository-level browser test runner로 도입하고 desktop/mobile Chromium project, 실패 trace 및 screenshot, 설정 가능한 application origin을 구성한다. 초기 scenario는 development login을 완료한 뒤 한국어 lobby, dashboard, leaderboard, tournament route를 이동하고 canvas pixel을 검사해 play surface가 element만 mount하는 것이 아니라 실제 drawing을 수행하는지 확인한다.

Makefile과 package script는 suite를 별도 end-to-end target으로 노출한다. browser behavior를 unit/smoke test와 분리해 다룸으로써 routing, accessibility 중심 selector, responsive viewport, 실제 rendering output에 대한 검증 경계를 만든다.

## chore(repo): pnpm과 TypeScript 캐시 제외
repository ignore 정책에서 local pnpm content-addressable store를 제외한다. 머신별 dependency cache data는 version control 밖에 두고, lockfile은 계속 검토 가능한 authoritative dependency-resolution artifact로 유지한다.

## fix(auth): 인증 완료 전 WebSocket 입력 보존
WebSocket route가 asynchronous session resolution 중에 들어오는 payload를 buffer하도록 변경한다. authentication에 성공하면 temporary listener를 제거하고 client를 game hub에 등록한 다음, buffer된 payload를 일반 validated receive path로 순서대로 재생한다. unauthenticated connection은 hub에 연결하지 않은 채 계속 종료한다.

socket이 open된 직후 server가 authenticated message handler를 설치하기 전에 client가 `queue.join`을 보낼 수 있었던 race를 해결한다. 동일한 receive function으로 순서를 보존하므로 별도의 pre-authentication command path를 만들지 않는다.

## fix(game): 닫힌 WebSocket 대기열 참가자 제거
queue 참가 처리 시작 시 waiting list를 뒤에서부터 순회하며 WebSocket이 더 이상 open 상태가 아닌 client를 제거한다. opponent를 선택하기 전에 정리하므로 새 player가 도달할 수 없는 socket과 match되는 것을 막고, 모든 match candidate가 여전히 room assignment를 받을 수 있다는 invariant를 유지한다.

## build(web): production start와 TS cache 정책 구성
web package에 container interface에 bind하는 production `next start` command와 package-local test가 없을 때 성공하는 test command를 추가한다. 이 application에서는 TypeScript incremental compilation을 비활성화해 type-check 결과가 persisted build-info cache에 의존하지 않도록 한다.

이 script들은 development, build, production serving, type checking, package-level testing을 구분한다. 따라서 orchestration은 development server에 의존하지 않고 `next build`가 만든 artifact를 실행할 수 있다.

## fix(runtime): Compose에서 build 결과 실행
Compose가 production start script로 API를 시작하고 Next.js application을 먼저 build한 뒤 production server로 제공하도록 변경한다. web build directory는 bind-mounted source/dependency volume과 분리된 전용 volume에 저장한다.

이렇게 하면 Compose runtime이 development watcher가 아니라 compiled application artifact와 production startup 동작을 실제로 실행한다. `.next`를 분리하면 source mount가 container에서 생성한 build output을 가리거나 반복해서 버리는 문제도 방지할 수 있다.

## test(smoke): WebSocket 매칭과 socket 정리 안정화
WebSocket smoke test가 각 event를 어느 client가 관측했는지 기록하고, 양쪽 client가 같은 room의 match assignment를 모두 받았는지 요구하며, playing snapshot을 받은 뒤에 room chat을 검사하도록 변경한다. 두 socket은 `finally` block에서 항상 닫는다.

side-aware assertion을 사용해 한 client가 받은 event가 실수로 양쪽 participant의 기대 조건을 모두 만족시키는 것을 막는다. unconditional cleanup은 assertion 실패 시 live socket과 timer가 남아 이후 검증을 오염시키는 것도 방지한다.

## feat(web): 사용자 동작용 API 함수 추가
tournament 참가, 최근 match를 포함한 public profile 조회, handle 기반 friendship request, administrative user status 변경을 위한 typed browser adapter를 추가한다. 각 helper가 하나의 user action에 대해 endpoint, HTTP method, payload shape, response unwrapping을 책임진다.

transport 세부 사항을 중앙화해 page는 interaction state에 집중할 수 있고, 식별자와 반환된 shared-domain type이 UI 경계를 항상 같은 방식으로 통과하도록 한다.

## feat(play): 경기 채팅 입력 연결
play page가 현재 room의 WebSocket connection을 통해 trim한 match-chat message를 전송하고 제출 후 controlled input을 비우도록 한다. room과 non-empty content가 모두 존재하기 전까지 send action은 disabled 상태이므로 유효한 destination 없이 browser가 room-scoped message를 보내지 않는다.

보이는 pause control도 아직 구현되지 않은 button을 활성 match operation처럼 보여주지 않도록 disabled 처리하고 future work라고 표시한다. end-to-end로 연결된 chat capability와 아직 server가 지원하지 않는 control behavior를 명확히 분리한다.

## feat(profile): 친구 요청 동작 연결
dynamic profile route가 요청된 public profile을 조회하고 route handle을 target identity로 사용해 friend button을 authenticated friend-request API에 연결한다. 성공 시 반환된 user의 display name을 표시하고, authentication 또는 target resolution이 실패하면 범위가 제한된 failure message를 보여준다.

share control은 구현 없는 button으로 남겨두지 않고 의도적으로 disabled 처리한 뒤 label도 변경한다. page에서 실제로 조작 가능한 surface가 server contract가 존재하는 operation과 일치하도록 한다.

## feat(admin): 사용자 상태 변경 동작 연결
administration page가 server user 목록을 load하고 각 status control을 authenticated active-to-banned 또는 banned-to-active update로 연결한다. 성공 response가 오면 local state에서 해당 user만 반환값으로 교체해, 화면 상태가 optimistic guess가 아니라 server result를 따르도록 한다. permission 결과와 loading 상태도 별도로 표시한다.

이를 통해 interface를 기존 authorization 경계에 연결하면서 status transition 허용 여부에 대한 최종 authority는 계속 API에 둔다.

## feat(tournament): 생성과 참가 동작 연결
tournament screen이 명시적인 selected tournament를 유지하고, 새로 생성한 competition을 선택하며, 현재 선택 대상에 join request를 보내도록 한다. 반환된 summary로 해당 list entry를 교체해 participant count와 status를 API 기준으로 갱신한다. full tournament에서는 join action을 disabled 처리하고 authentication failure는 사용자에게 표시한다.

bracket preview도 항상 첫 list item을 쓰지 않고 selected competition의 entry를 읽는다. list selection, mutation target, 렌더링되는 tournament state가 같은 식별자를 기준으로 동작하도록 맞춘다.

## test(e2e): 화면 action의 실제 API 연결 검증
browser test가 static presentation을 넘어 실제로 연결된 interactive path를 검증한다. AI room 시작과 match chat 전송, profile에서 friendship request, tournament 생성 및 참가, administrator status 변경 시도를 실행한다. 의도적으로 미완성인 control이 계속 disabled인지도 확인한다.

이 coverage는 control이 렌더링되는지만 확인하지 않고 user action이 browser-to-API 또는 browser-to-WebSocket 경계를 통과해 관찰 가능한 state나 permission feedback을 만드는지 검증한다.

## fix(web): body 없는 요청에서 JSON header 제외
공유 browser request helper가 `Headers` object를 만들고 body가 존재하면서 content type이 명시적으로 전달되지 않은 경우에만 JSON content type을 추가하도록 변경한다. authorization은 token이 있을 때 별도로 추가한다. 따라서 body가 없는 request는 실제로 포함하지 않은 JSON entity를 광고하지 않으며, caller가 전달한 header는 계속 우선한다.

GET을 비롯한 empty request의 semantics를 정확히 유지하고, 불필요한 non-simple content type 때문에 발생하는 transport behavior를 피한다.

## feat(lobby): 실시간 로비 지표 API 추가
game hub가 queue-entry timestamp를 기록하고 connected client, room participant, queued client, active room, 최근 matching wait time의 live count를 제공하도록 한다. wait duration은 queued player가 match될 때 측정해 초 단위로 반올림하고 최대 20개 sample의 bounded window로 보관한다. sample이 없을 때는 임의의 0 대신 `null`로 표현한다.

이 값을 shared lobby response contract에 추가하고 lobby endpoint에서 반환한다. measurement를 hub의 in-memory queue 및 room ownership과 같은 위치에 두어 API가 관련 없는 persistence data에서 runtime state를 재구성하지 않아도 되게 한다.

## feat(chat): 쓰기 가능한 로비 채팅 API 추가
authenticated lobby-chat endpoint가 제출된 text를 trim하고 empty message와 240자를 초과한 content를 거부하도록 한다. 허용된 message는 `scope: "lobby"`, room 식별자 없음, authenticated user 식별자와 함께 영속화한다. response는 canonical sender와 timestamp data를 포함해 repository가 생성한 message를 반환한다.

HTTP 경계에서 validation을 수행해 유효하지 않은 text가 storage에 들어가지 않도록 하고, sender는 session에서 결정해 client가 제공한 identity를 신뢰하지 않는다.

## feat(chat): 로비 채팅 입력 화면 추가
lobby page에 controlled chat form을 추가해 empty submission을 trim한 뒤 무시하고, lobby-chat API를 호출하며, 반환된 message를 최대 20개로 제한된 history에 추가한다. loading 및 send failure도 표시한다. API helper는 실패한 lobby read를 fixture로 조용히 대체하는 동작을 중단하고 완전한 공유 `LobbyResponse` type을 노출한다.

server가 반환한 message를 사용하므로 UI에서 canonical identifier, sender data, timestamp를 보존할 수 있다. error를 그대로 전달해 server read 실패와 정상 lobby response를 구분할 수 있게 한다. 다만 이 단계에서도 page의 초기 presentation에는 sample value가 남아 있다.

## fix(play): 패들 조작과 Canvas rendering 개선
room이 active인 동안 browser key-repeat 주기에 의존하지 않고 persistent direction state를 sampling해 50ms마다 paddle input을 전송하도록 변경한다. key release에서는 direction을 명시적으로 0으로 되돌리고, movement key의 기본 page scrolling 동작도 막는다.

canvas는 deep copy한 server snapshot의 bounded history를 유지하고 `requestAnimationFrame`으로 80ms 지연된 view를 렌더링하며, 주변 sample 사이의 paddle과 ball 위치를 선형 보간한다. authoritative state update와 display cadence를 분리해 score와 match state는 계속 server가 결정하고, browser는 network snapshot 사이에서 보이는 움직임만 부드럽게 표현한다.

## fix(lobby): 로비 상태 표현 개선
lobby summary가 server에서 제공한 online, playing, queued, active-room count를 표시하고, average wait가 없을 때 고정 30초 추정치를 보여주는 대신 현재 대기시간 없음으로 표현하도록 한다. win 합계도 근거 없는 weekly change가 아니라 누적값으로 설명한다.

이 변경으로 operational label과 call to action이 실제 lobby response를 반영한다. interface가 더 이상 정적인 marketing value를 측정된 realtime state처럼 제시하지 않는다.

## fix(profile): 공개 프로필 상태 표현 개선
public profile이 profile response와 함께 반환된 recent-match collection을 보관하고 각 result, opponent, score를 렌더링하며 명시적인 empty state도 제공하도록 한다. 저장된 match data와 무관하게 player의 style을 설명하던 고정 문구를 제거한다.

repository-backed match history를 사용하므로 public page가 요청한 account에 실제로 연결된 근거를 보여주고, application의 다른 곳에서 쓰는 동일한 match summary와 profile 표현을 일관되게 유지한다.

## fix(dashboard): 경기 상태 표현 개선
dashboard rating chart를 고정 SVG polyline 대신 현재 rating과 최근 match에 기록된 delta에서 계산한다. 누적 delta를 현재 값에서 빼 history 이전 값을 복원하고, match를 시간순으로 다시 적용한 뒤, zero range를 방어하면서 결과 sequence를 chart coordinate에 정규화한다.

명시적인 no-match state와 최소 2-point fallback을 두어 history가 없어도 visualization이 유효하도록 한다. 따라서 chart는 장식용 sample data가 아니라 영속화된 rating 변화를 표현한다.

## fix(play): 경기 세션 상태 표현 개선
match chat이 synthetic chat entry를 삽입하지 않고 empty 상태에서 시작하며 전용 empty-state message를 렌더링하도록 한다. presentation scaffold가 realtime system에서 실제로 수신되거나 저장된 message로 오해되는 것을 방지한다.

## fix(web): 내비게이션 사용자 상태 표현 개선
application header에서 average waiting time이 30초 미만으로 유지된다는 문구를 제거한다. 이제 lobby metric이 realtime으로 갱신된다는 사실만 표시해, 검증되지 않은 service-level 값을 제시하지 않고 server가 실제 제공하는 정보와 맞춘다.

## fix(api): body 없는 로비 채팅 요청 처리
lobby-chat route가 optional message field를 읽기 전에 missing request body를 empty object로 정규화하도록 한다. payload가 없는 request도 기존 empty-message validation을 거쳐 controlled client error를 반환하므로 `undefined`를 dereference하다 예외가 발생하지 않는다.

## test(app): 실시간 지표·채팅·경기 기록 검증
test suite가 초기 lobby metrics contract, authenticated lobby-chat persistence, lobby/match message의 sender 및 room attribution, recent match의 시간순 ordering, queue 및 AI result가 rating과 win에 누적 반영되는지 검증하도록 확장한다. browser coverage에서는 표시되는 lobby metric과 chat delivery, 정확한 navigation target, pre-match empty state, play screen에서 arrow key가 page scroll을 일으키지 않는지도 확인한다.

이 test들은 repository state에서 HTTP response를 거쳐 browser behavior까지 이어지는 경로를 검증하고, 저장된 application data와 주변 fix에서 제거한 sample/static presentation value 사이의 구분을 보호한다.

## fix(play): 실제 경기 상태에 맞게 세션 표시
play session이 fabricated match data 없이 시작하고 최신 server snapshot에서 score, opponent, ready/chat availability, input transmission, terminal cleanup을 모두 파생하도록 한다. 새 connection을 시작할 때 기존 socket을 먼저 분리하고 room-local state를 reset한다. close callback은 대체된 socket을 무시하고, finish 또는 close event가 발생하면 room과 paddle direction을 비운다. authoritative snapshot이 오기 전까지 canvas는 neutral empty court를 렌더링한다.

queue selector도 FIFO matching에서 absolute rating difference가 가장 작은 waiting opponent를 고르는 방식으로 변경하고, 차이가 같은 경우 먼저 발견한 candidate를 유지한다. opponent 선택과 visible session 모두 fixture data나 stale connection state가 아니라 live server state에 의존하게 한다.

## feat(protocol): 일시정지 WebSocket 계약 추가
공유 game contract에 `paused`를 명시적인 phase로 추가하고 room 식별자를 포함하는 `game.pause`, `game.resume` client event를 허용한다.

state와 command를 shared package에 정의해 browser, server, validation logic이 동일한 protocol vocabulary를 사용하도록 한다. `waiting`을 과도하게 재사용하거나 client rendering만 local로 멈추는 것보다 별도 paused phase를 두면 authoritative server state를 관찰할 수 있고 이후 transition handling도 이름 있는 protocol operation으로 제한할 수 있다.

## feat(game): 서버 주도 일시정지 기능 추가
game hub가 pause/resume command를 server-owned room-state transition으로 처리하도록 한다. 현재 playing 상태인 room은 participant만 pause할 수 있고, paused 상태인 room만 participant가 resume할 수 있다. pause 시 room timer를 제거하고, resume 시 timer가 없을 때만 새로 만든다. 각 transition은 server timestamp를 갱신한 snapshot을 broadcast한다.

room이 실제 playing 상태가 아니면 input도 무시한다. 이 검사를 통해 simulation은 정확히 하나의 timer 아래에서만 진행되고, authoritative match가 paused인 동안 client가 paddle state를 계속 변경하지 못한다는 lifecycle invariant를 유지한다.

## feat(play): 일시정지와 재개 UI 연결
play screen이 server snapshot phase에서 pause/resume 가능 여부를 계산하고 현재 room에 해당 WebSocket command를 보내도록 한다. snapshot update가 표시되는 status도 결정하며, `playing`과 `paused` 이외의 상태에서는 control을 disabled 상태로 유지한다.

browser를 match progression의 두 번째 owner가 아닌 state consumer로 유지한다. button은 transition을 요청할 뿐이고, 실제 interface에 표시할 상태는 다음 server snapshot이 결정한다.

## feat(chat): 로비 채팅과 접속 상태 실시간 반영
현재 user와 session token을 사용할 수 있게 된 뒤 lobby가 authenticated WebSocket을 열도록 한다. lobby chat event는 식별자 기반 deduplication과 최대 20개 message window를 적용해 visible history에 merge한다. presence change가 발생하면 HTTP lobby를 다시 조회해 aggregate statistic과 online user를 server 상태와 맞춘다.

socket이 open 상태면 chat에 WebSocket을 사용하고, 그렇지 않으면 기존 HTTP path를 fallback으로 유지한다. effect teardown 시 handler를 제거하고 connecting/open socket을 모두 닫아 stale connection이 unmount되거나 다시 authentication된 page를 계속 갱신하지 못하게 한다.

## fix(web): 로그인 화면의 sample fallback 제거
authenticated 및 server-backed screen이 request 실패 시 sample user, match, chat, ranking, tournament, administrative data를 대신 표시하지 않도록 한다. 이제 empty 또는 nullable state에서 시작하고 loading, empty, authorization, failure message를 명시적으로 렌더링한다. tournament 생성 같은 action failure도 fixture를 조용히 유지하지 않고 드러낸다.

fallback 제거로 중요한 source-of-truth 경계를 복원한다. 특히 fabricated data가 authenticated operation이 하나도 성공하지 않았다는 사실을 가릴 수 있는 dashboard나 administration 화면에서는 network/authorization failure가 정상 application state처럼 보여서는 안 된다.

## feat(profile): 현재 프로필과 공유 기능 연결
application shell의 profile navigation target을 고정 test handle 대신 authenticated session에서 결정하도록 한다. prefix match를 사용해 어떤 user route에서도 profile item의 active 상태를 유지한다. profile page는 Clipboard API를 통해 canonical same-origin URL을 복사하고 성공과 실패를 모두 표시한다.

navigation을 `SessionUser.handle`에 연결해 routing이 이미 API에서 확립한 identity를 따르게 하고 fixture 전용 동작을 노출하지 않는다. share URL을 `window.location.origin`에서 만들기 때문에 development와 deployed origin 모두에서 유효하다.

## feat(tournament): 대진 경기 contract 정의
공유 HTTP contract에 bracket position, lifecycle status, participant, winner, score, 선택적인 room/persisted-match 식별자를 포함하는 tournament match summary를 추가한다. WebSocket command set에도 tournament match 식별자로 지정하는 `tournament.join`을 추가한다.

이 표현을 shared package에 두어 API와 browser가 하나의 bracket-state vocabulary를 사용하도록 한다. nullable participant, score, runtime identifier는 bracket slot이 채워지거나 room이 생성되기 전에도 존재하는 match를 모델링하고, 유한한 round/status union은 이후 tournament code가 노출할 수 있는 transition을 제한한다.

## feat(tournament): 대진 경기 schema 추가
tournament entry나 일반 game record에서 매 round를 계산하는 대신 bracket state 전용 `tournament_matches` persistence model을 도입한다. 각 row가 round, slot, participant, lifecycle status, room linkage, recorded match, score, winner를 소유하며, `(tournament_id, round, slot)` unique 제약으로 bracket position을 고유하게 만들어 idempotent 생성이 가능하게 한다.

SQL 정의, embedded migration source, Kysely schema를 함께 갱신해 runtime type model과 database contract를 맞춘다. cascading delete는 bracket row를 tournament lifecycle에 묶고, tournament/round/slot index는 순서 있는 bracket 조회를 지원한다.

## feat(tournament): 대진 row mapper 정의
database 형태의 tournament match row를 application record와 public summary로 변환하는 명시적인 mapping을 추가한다. internal record는 lifecycle operation에 적합한 식별자 중심 field를 유지하고, public summary는 participant/winner object를 resolve한 뒤 score와 room/match reference를 포함한다.

이 변환을 database 경계에 두어 snake_case storage name, nullable foreign key, driver 전용 numeric value가 repository API를 통해 외부로 새지 않게 한다. persistence code와 presentation code에는 각각 책임에 맞는 별도 표현을 제공한다.

## feat(tournament): 대진 경기 lifecycle 저장 구현
`AppRepository`에 tournament match 조회, 시작, 완료 operation을 추가하고 PostgreSQL과 in-memory repository에 동일한 contract를 구현한다. match 시작 시 game room을 bracket row와 연결한다. 완료 시 일반 match record, winner, score를 저장한 뒤 두 semifinal이 모두 끝나면 final을 생성하고, final이 끝나면 tournament를 finished 상태로 전환한다.

PostgreSQL 구현은 final을 만들 때 bracket-slot unique 제약과 `ON CONFLICT DO NOTHING`을 사용하므로 completion 처리가 반복되어도 final row가 중복 생성되지 않는다. memory 구현도 동일한 동작을 제공해 local 및 test 실행에서 사용하는 repository abstraction을 유지한다.

## feat(tournament): 준결승 대진 생성과 조회 구현
4인 tournament가 capacity에 도달하면 semifinal bracket을 생성하고 persisted match를 tournament summary에 포함한다. 참가자는 seed 순으로 정렬해 1번-4번, 2번-3번을 pair하고, unique bracket slot을 사용해 생성 단계를 반복 실행해도 match가 중복되지 않도록 한다.

capacity에 도달한 뒤에는 새 참가자를 거부하고 tournament를 `open`에서 `running`으로 전환한다. non-null assertion에 의존하지 않고 명시적인 not-found error를 반환하도록 한다. tournament 조회는 round와 slot 순서대로 match를 load하고 participant/winner profile을 resolve하며, persisted tournament winner도 노출해 API가 실제 bracket lifecycle을 반영하도록 한다.

## feat(tournament): memory 대진 진행 구현
in-memory repository의 tournament flow를 PostgreSQL과 behavior상 동일하게 맞춘다. capacity를 강제하고 field가 가득 차면 seeded semifinal bracket을 한 번 생성하며, 두 semifinal winner가 모두 존재할 때만 하나의 final을 생성한다. final 완료 시 tournament와 winner를 함께 확정한다.

helper guard를 통해 process 내부에서 bracket과 final 생성이 idempotent하게 동작한다. memory repository가 단순 stub가 아니므로 중요하다. caller는 추가 참가자를 조용히 허용하거나 tournament progression을 생략하지 않고 동일한 lifecycle contract를 실행할 수 있다.

## feat(tournament): 토너먼트 경기 방 진행
tournament bracket match를 realtime game hub에 통합한다. `tournament.join` event는 bracket row가 ready인지, caller가 지정된 두 participant 중 하나인지, connection이 이미 다른 room에 속하지 않았는지 검증한다. 참가 가능한 player는 bracket match별로 기다리고, 양쪽이 모두 도착하면 hub가 bracket을 기준으로 left/right ownership을 확정해 tournament-mode room을 만든 뒤 room transition을 persistence에 기록한다.

room은 이제 AI flag만으로 mode를 추론하지 않고 명시적인 `MatchMode`와 선택적인 tournament match 식별자를 가진다. game 완료 시 일반 match를 올바른 mode로 저장하고 동일한 room, match, winner, score data로 bracket lifecycle도 완료한다. disconnect cleanup에서는 stale tournament waiter도 제거해 abandoned socket이 나중에 pair되는 것을 막는다.

## feat(tournament): 플레이 가능한 대진 UI 연결
placeholder tournament bracket을 persisted match model로 교체하고 참가 가능한 participant를 realtime play에 직접 연결한다. tournament page는 semifinal과 final을 그룹화하고 lifecycle status, score, winner data를 표시하며, 현재 user가 ready match의 participant인 경우에만 entry link를 제공한다.

play page는 URL에서 bracket match 식별자를 읽고 해당 `tournament.join` event를 정확히 한 번 전송한다. queue, AI, tournament entry가 하나의 socket-opening path를 공유하므로 connection setup과 message handling은 일관되게 유지하면서 각 mode가 자체 initial protocol event를 제공할 수 있다.

## feat(admin): 감사 가능한 사용자 상태 API 추가
account suspension을 presentation-only flag가 아니라 server-side에서 강제하는 authorization state로 만든다. suspended user는 WebSocket 경계와 state-changing chat, friendship, tournament route에서 거부한다. unauthenticated와 suspended case는 각각 `401`, `403`으로 계속 구분한다.

administration contract는 actor, target, reason, timestamp를 포함한 최근 ban/unban action을 노출한다. PostgreSQL과 memory repository 모두 audit trail을 기록하고 반환하며 endpoint 자체는 administrator로 제한한다. 모든 status transition을 검토 가능한 evidence와 연결하고, 이미 발급된 session이 있어도 suspended identity가 realtime 또는 mutation privilege를 계속 유지하지 못하도록 한다.

## feat(admin): 감사 기록과 상태 변경 UI 추가
administration interface를 audit-capable API에 연결한다. operator가 status transition reason을 입력하고, 영향받은 user를 제자리에서 refresh한 뒤 action log를 즉시 다시 load해 visible record가 완료된 server mutation을 반영하도록 한다.

page는 history를 client에서 재구성하지 않고 shared audit representation의 target, action, rationale, actor, time을 그대로 표시한다. reason을 API client로 전달해 기존 hard-coded placeholder를 제거하고 UI도 server accountability contract에 참여하게 한다.

## fix(api): 변경 요청용 CORS method와 header 허용
authenticated mutation request에서 사용하는 cross-origin method와 request header를 명시한다. credentialed origin 외에도 `PATCH`, `DELETE`, preflight `OPTIONS`, JSON content type, authorization header를 허용한다.

allowed-origin 목록은 넓히지 않으면서 administration 및 기타 state-changing route의 browser preflight 거부를 해결한다. CORS policy가 plugin default만 허용하는 대신 실제 HTTP contract와 일치하도록 한다.

## test(app): 전체 서비스 흐름 검증
administration, tournament, repository, browser, smoke-test 경계 전반의 regression coverage를 확장한다. ban이 audit 가능한 reason을 남기고 mutation을 즉시 차단하는지, 4인 cup을 채우면 ready semifinal 두 개가 생성되는지, 두 semifinal을 완료하면 in-memory bracket에 올바른 finalist가 올라가는지 검증한다.

browser scenario는 rendered application을 통해 동일한 vertical contract를 실행한다. realtime game phase와 pause/resume, profile navigation/share, tournament entry, 표시되는 administration audit data를 검증한다. unique message/reason value를 사용해 persisted test data가 false match를 만들지 않도록 하고, UI만으로 완전한 bracket을 준비하면 검증 대상 동작이 흐려지는 경우에는 API setup을 사용한다.

## fix(web): 안정적인 navigation key 사용
각 navigation item에 안정적인 logical identifier를 부여하고 현재 destination URL 대신 이를 React key로 사용한다. session data가 load된 뒤 profile destination이 lobby fallback에서 `/profile/<handle>`로 바뀌므로 `href`를 key로 쓰면 동일한 개념의 item이 다른 element처럼 보이고 불필요한 reconciliation이 발생했다.

component identity와 변경 가능한 routing data를 분리해 navigation item lifecycle은 유지하면서 target은 계속 갱신할 수 있게 한다.

## fix(db): 최근 경기에서 최고 연승 계산
fabricated formula나 repository별 constant 대신 실제 recent match result에서 dashboard의 best winning streak를 계산한다. recent match가 최신순으로 노출되므로 helper가 이를 시간순으로 뒤집은 뒤 win이면 값을 증가시키고 loss가 나오면 reset하며, 가장 긴 연속 구간을 유지한다.

PostgreSQL과 in-memory repository가 동일한 계산과 동일한 fetched history를 사용해 dashboard semantics를 맞춘다. 결과 값은 season 전체 통계라고 주장하지 않고 실제로 사용할 수 있는 recent-match window만 설명한다.

## test(db): 최고 연승 계산 검증
winning-streak 계산의 ordering과 reset 규칙을 모두 고정한다. fixture에는 win, loss, win 두 번 순서로 record를 만들고 repository는 이를 최신순으로 반환하지만, 기대하는 최대 연속 win은 2로 유지한다.

이를 통해 total win을 세거나 loss 후 reset하지 않는 구현, presentation order를 실수로 chronological order로 해석하는 구현을 잡아낸다.

## fix(dashboard): 연승 지표 설명 정정
dashboard hint를 “this season”에서 “recent matches”로 변경해 metric의 실제 data boundary를 정확히 설명한다. repository는 보관된 recent-match 목록에서만 streak를 계산하므로 UI도 더 넓은 historical coverage를 암시하지 않는다.

## fix(dashboard): 빈 rating history를 정확히 표시
empty match history를 임의의 2-point chart로 만드는 대신 rating 근거가 없는 상태로 취급한다. 적어도 하나의 persisted match가 생길 때까지 dashboard는 SVG series를 표시하지 않고 명시적인 empty state를 보여준다.

synthetic `currentRating - 1` fallback을 제거해 “데이터 없음”과 실제 flat/changing rating history를 구분한다. 따라서 visualization이 발생하지 않은 transition을 암시하지 않는다.

## feat(lobby): 연결 중인 WebSocket 사용자 목록 추가
persistent account storage가 아니라 realtime hub를 lobby presence의 authority로 만든다. `onlinePlayers()`는 현재 연결된 client를 projection하고 private email data를 제거하며 online으로 표시한다. user 식별자를 기준으로 multiple socket을 deduplicate하고 rating/name 기준의 deterministic ordering으로 반환한다.

lobby endpoint는 이제 이 live connection state를 보고한다. seed되었거나 단순히 등록된 account가 online으로 표시되는 것을 막고, connection lifecycle을 실제 관리하는 component가 presence ownership을 유지하도록 한다.

## test(lobby): WebSocket 사용자 목록 검증
WebSocket client가 하나도 연결되지 않았을 때 lobby가 empty online-player list를 반환하는지 확인한다. persisted user와 live presence의 구분을 보호해 repository seed data가 active session으로 오해되지 않도록 한다.

## fix(game): 경기 시간에 따라 공 속도 증가
긴 rally가 점차 빨라지되 simulation speed가 무한히 증가하지 않도록 time-based ball acceleration을 추가한다. 각 tick은 velocity vector의 방향을 유지한 채 크기를 증가시키고, collision 후에도 의도한 pace를 복구할 수 있도록 elapsed-time minimum을 적용하며, magnitude는 고정 maximum으로 제한한다.

ball reset도 매 point마다 원래의 느린 speed로 되돌아가지 않고 제한된 elapsed-time boost를 이어받는다. initial velocity, per-tick acceleration, cap을 중앙화해 pacing contract를 명시적으로 만들고 reset과 continuous play의 동작을 일관되게 유지한다.

## test(app): 실시간 로비와 공 가속 검증
WebSocket smoke flow를 단순 protocol connectivity가 아니라 두 가지 live-system property를 검증하도록 확장한다. 두 socket을 연 뒤 lobby를 조회해 두 handle이 모두 나타나는지 요구함으로써 HTTP presence가 active realtime connection에서 파생됨을 증명한다.

같은 실행 중 game에서 초기 velocity magnitude를 기록하고 추가 simulation tick을 기다린 뒤 speed가 반드시 더 커졌는지 확인하면서 의도된 starting pace도 검증한다. emitted snapshot을 통해 acceleration을 검사하므로 isolated helper가 아니라 server tick loop 자체를 다룬다.

## fix(web): 비로그인 상태의 me 요청 생략
browser에 저장된 session token이 없으면 `getMe()`가 즉시 `null`을 반환하도록 한다. unauthenticated state를 local에서 처리하고 authorization failure만 낼 수 있는 request를 보내지 않는다.

이 guard는 일반 public-page rendering에서 불필요한 `401` traffic이 발생하는 것도 막고, 실제 token validation은 credential이 있는 request에서만 server에 맡긴다.

## fix(web): 만료된 session token 정리
authenticated API request가 `401 Unauthorized`를 받으면 persisted session token을 제거한다. 거부된 credential이 local storage에 남아 이후 모든 request에 반복해서 첨부되지 않도록 한다.

cleanup을 `apiFetch`에 중앙화해 caller 전체에 동일한 authentication-state transition을 적용한다. server가 invalid session이라고 선언하면 client는 unauthenticated state가 되고, 다른 failure status는 token이 유효하지 않다는 사실을 의미하지 않으므로 기존 token을 유지한다.

## feat(db): NPC 사용자 contract와 schema 추가
user persistence model과 public user contract에 명시적인 NPC discriminator를 추가한다. database column은 기존 사용자와 일반 사용자를 기본 `false`로 두고, row projection은 joined chat 및 tournament query에서도 이 값을 전달하며, mapper는 `isNpc`로 노출한다.

NPC identity를 공유 user 표현에 포함하면 이후 matchmaking과 UI code가 handle이나 display name을 추론하지 않고 automated opponent를 구분할 수 있다. PostgreSQL, memory row, WebSocket fixture를 함께 갱신해 새 field가 하나의 일관된 cross-layer contract에 포함되도록 한다.

## feat(db): rating 구간별 NPC 상대 저장
상승하는 rating band별로 고정 automated opponent를 seed하고 전용 repository query로 노출한다. NPC upsert는 canonical profile, active state, rating, discriminator를 복원한다. 일반 development login은 `is_npc`를 명시적으로 해제해 handle 충돌이 발생해도 human session이 automated로 분류되지 않도록 한다.

두 persistence 구현 모두 active NPC만 rating 순으로 정렬해 offline 상태로 반환한다. `listNpcOpponents()`를 일반 user 및 presence query와 분리해 stored identity가 live connection을 소유하는 것처럼 취급하지 않으면서 matchmaking에 authoritative candidate set을 제공한다.

## test(db): NPC seed와 leaderboard 분리 검증
seed initialization이 의도한 네 개의 rating-banded opponent를 오름차순으로 생성하고 모든 결과가 명시적인 offline NPC로 분류되는지 검증한다. stored automated identity와 realtime player presence의 구분을 포함해 AI 선택에 사용하는 repository 경계를 보호한다.

## feat(game): NPC 상대를 경기 방에 연결
hard-coded anonymous AI label 대신 실제 NPC user를 game room과 result persistence에서 사용할 수 있도록 준비한다. room 생성 시 right-side snapshot 및 matched notification에 NPC profile을 전달할 수 있고, game 완료 시 winner/loser를 user 형태 identity로 resolve해 automated opponent도 저장되는 match record에 참여할 수 있게 한다.

이 커밋은 rating 기반 selection helper를 포함해 persistent NPC opponent에 필요한 표현을 확립하지만 아직 queue fallback을 schedule하거나 room 생성에 실제 NPC를 전달하지는 않는다. 다음 fallback 변경에서 해당 lifecycle 연결을 추가한다.

## feat(game): 대기 플레이어 NPC fallback 구성
human matchmaking queue에 bounded waiting policy를 추가한다. 6초 동안 match되지 않은 player는 rating이 가장 가까운 active NPC를 배정받고 queue에서 제거된 뒤, 선택된 automated opponent를 right-side user로 갖는 queue-mode room에 들어간다.

fallback timer는 queue entry에 귀속하며 player가 정상 match되거나 leave, disconnect, prune될 때 모두 해제한다. 이 cleanup path는 queue ownership이 이미 바뀐 뒤 stale timeout이 두 번째 room을 만드는 것을 방지한다. NPC를 room에 별도 저장하므로 WebSocket client가 없어도 최종 result persistence까지 identity를 유지할 수 있다.

## feat(game): rating 기반 NPC AI policy 구현
하나의 perfect-following AI 규칙을 rating band별 behavior profile로 교체한다. reaction interval, prediction noise, mistake probability, paddle speed, dead zone이 선택된 NPC rating에 따라 달라지고, AI는 ball의 projected trajectory를 top/bottom boundary에서 반사해 arrival height를 예측한다.

target update에는 제어되지 않은 randomness 대신 deterministic room-and-tick noise를 사용한다. 의도적인 imperfect behavior를 만들면서도 reproducible server simulation과 testability를 유지한다. 낮은 rating opponent는 덜 자주 반응하고 더 느리게 움직이며 더 큰 오차를 허용하고, 높은 rating opponent는 predicted intercept에 더 빠르고 정확하게 접근한다.

## feat(web): 대기열에서 NPC 상대 표시
player experience 전반에 automated-opponent 구분을 노출한다. queue entry는 lobby URL에서 직접 시작하고 play page가 요청된 queue에 자동 참가한다. opponent panel은 snapshot player가 AI-controlled인지 표시한다. leaderboard와 profile view에서도 NPC identity를 표시하고, human participant가 아닌 account에는 friendship action을 disabled 처리한다.

이 동작은 handle convention이 아니라 공유 `isNpc`와 realtime `ai` field를 사용하므로 presentation이 server contract를 따른다. queue 안내 문구도 human opponent가 보장된다고 암시하지 않고 human 우선, NPC fallback 동작을 명시한다.

## test(app): NPC fallback matching 검증
human opponent가 없는 실제 WebSocket session으로 delayed fallback을 검증한다. smoke test가 normal queue에 참가한 뒤 6초 policy를 포함하는 timeout 안에서 기다리고, AI opponent 이름이 있는 matched event를 요구한 다음 game snapshot에 `npc-` identity를 기반으로 한 AI-controlled player가 포함되는지 확인한다.

selection helper만 test하지 않고 timer, repository lookup, room creation, protocol emission, snapshot까지 전체 경로를 검증한다. wait utility는 scenario별 timeout을 받을 수 있어 fallback assertion을 일반 smoke timeout보다 엄격하게 유지할 수 있다.

## test(smoke): WebSocket 접속 상태 반영 대기
두 WebSocket의 `open` event가 발생한 정확한 순간에 HTTP presence가 갱신된다고 가정하지 않고, realtime presence smoke check가 eventual state를 관찰하도록 변경한다. 두 connected handle이 나타날 때까지 lobby를 polling한다.

공유 wait helper를 async loop로 변경해 predicate 자체가 network request를 수행할 수 있게 한다. bounded timeout은 유지하면서 transport establishment와 presence registration을 소유하는 server-side connection callback 사이의 race를 제거한다.

## test(e2e): 실시간 상태 검증 안정화
정상적인 runtime variation과 persisted parallel test data를 고려해 browser test를 안정화한다. lobby assertion은 0만 허용하지 않고 모든 numeric wait time을 허용하며, tournament identity 뒤에 Playwright project와 현재 시각을 붙여 browser 간 또는 과거 실행과의 충돌을 피한다.

추가 세 명의 entrant를 넣기 전에 tournament creator도 명시적으로 join시킨다. 4인 setup이 creation 단계에서 creator가 자동 삽입된다는 가정에 의존하지 않게 하고, bracket precondition을 test fixture에서 명확히 드러낸다.

## fix(api): logout 시 server session 폐기
logout에서 browser cookie만 지우지 않고 server-side session도 invalidate한다. session-token extraction을 공유 helper로 분리해 logout과 일반 authentication이 동일한 cookie, authorization header, WebSocket query 위치에서 credential을 조회하도록 한다.

두 repository 구현 모두 전달된 token을 삭제하므로 logout이 revocation operation이 된다. response 이후에는 이전 token을 보유하고 있어도 더 이상 access 권한을 얻지 못한다. credential이 없는 경우는 harmless no-op으로 유지해 idempotent logout 동작을 보존한다.

## test(api): logout session invalidation 검증
logout을 server-side security transition으로 검증한다. 새로 발급된 bearer token이 `/me`에 접근할 수 있음을 확인하고, 같은 token으로 logout을 수행한 다음, 동일 credential을 다시 사용할 경우 `401`을 받아야 한다.

response에서 client state만 정리하고 underlying session은 replay 가능한 상태로 남는 regression을 방지한다.

## fix(web): profile link 전 사용자 식별 대기
현재 session user가 resolve될 때까지 profile navigation item을 disabled 상태로 렌더링한다. 이전에는 임시 fallback destination이 lobby여서 unauthenticated 또는 loading 중인 click이 표시된 action과 무관한 곳으로 이동할 수 있었다.

disabled element는 동일한 stable navigation identity와 styling을 유지하고 handle별 destination을 알게 되면 실제 link로 바뀐다. 불확실성을 misleading URL로 표현하지 않고 loading state와 valid route를 분리한다.

## build(runtime): 지원 Node.js·pnpm 범위 고정
local version manager, package metadata, container image를 Node.js 24.18.0으로 맞추고 pnpm은 10.32.1로 고정한다. `engines` contract는 지원하지 않는 major runtime을 거부하고 deployment image도 개발자에게 설치하도록 지정한 것과 정확히 같은 Node release를 사용한다.

local tool과 container가 서로 다른 runtime behavior를 사용할 수 있던 environment split을 제거한다. root development script도 pinned package manager 아래에서 API와 web workspace를 함께 시작하도록 추가한다.

## refactor(db): SQL migration lifecycle 분리
schema evolution과 repository seeding을 분리하고 SQL file을 명시적인 Kysely migration lifecycle 아래로 이동한다. migration provider는 `.sql` file을 찾아 이름순으로 정렬하고 각 file을 `up` migration으로 노출하며, 실행과 bookkeeping은 `Migrator.migrateToLatest()`에 위임한다.

repository는 seed data가 필요할 때마다 monolithic embedded schema 문자열을 실행하지 않는다. migration은 persistent structure를 재현 가능하게 발전시키고, `ensureSeedData`는 해당 structure가 존재한 뒤 record에만 동작한다는 두 책임을 분리한다. migrator는 short-lived database connection을 소유하고 실패한 특정 migration을 보고하면서도 cleanup을 보장한다.

## feat(db): 환경별 seed profile 분리
명시적인 `development`, `demo` seed profile을 도입한다. development seeding에는 이름 있는 sample user, administrator promotion, 예시 rating을 유지하고, 두 profile 모두 automated matchmaking에 필요한 NPC identity를 설치한다.

seed initialization이 필요하다는 이유만으로 production 유사 환경이나 demo 환경에 developer account 및 synthetic player statistic이 들어가는 것을 막는다. PostgreSQL과 memory repository가 동일한 profile contract를 구현하고, 기존 test와 local caller에는 development를 기본값으로 유지한다.

## refactor(db): migration과 seed CLI 연결
새로 분리한 migration 및 seed lifecycle에 database CLI를 연결한다. `migrate`는 migration engine만 호출하고, `seed:dev`와 `seed:demo`는 각각 해당 data profile을 선택하며 항상 repository connection을 닫는다.

API는 process startup에서 PostgreSQL을 암묵적으로 seed하지 않는다. in-memory runtime만 state가 ephemeral하므로 자체 initialize한다. persistent startup은 명시적이고 순서가 보장된 migration/deployment 단계에 의존하게 되며, application boot마다 reference data를 변경하는 문제를 방지한다.

## build(repo): workspace 검증 명령 정리
서로 다른 verification layer를 기준으로 root script와 Make target을 표준화한다. unit test, HTTP smoke test, WebSocket smoke test, Playwright end-to-end test에 각각 이름 있는 진입점을 두고 aggregate smoke target은 두 protocol check를 조합한다.

Makefile은 raw command를 중복하지 않고 package script에 위임하므로 local 사용과 automation이 하나의 authoritative command contract를 공유한다. development startup/teardown도 orphan cleanup을 포함한 Docker Compose target으로 노출한다.

## ci(repo): typecheck·unit·build workflow 추가
모든 push와 pull request에서 실행되는 read-only GitHub Actions verification job을 추가한다. workflow는 저장소에 고정된 pnpm 및 Node.js version을 설치하고 pnpm cache를 복원하며 frozen lockfile을 요구한 뒤 type checking, unit test, production build를 순서대로 실행한다.

local 및 container 실행과 동일한 runtime contract를 사용해 CI가 별도 환경이 아니라 reproducibility check 역할을 하도록 한다. 명시적인 timeout으로 멈춘 verification 시간을 제한하고 최소 `contents: read` permission으로 job 권한을 제한한다.

## test(web): API client 동작 검증
browser API 경계에 집중한 unit coverage를 추가하고 web package가 실제 test를 포함하도록 한다. 제어 가능한 `localStorage` 구현과 mocked `fetch`를 사용해 server-rendering safety, token 저장, credential/header 구성, 명시적 content-type 보존, response error 전달, `401`에서 자동 token 제거를 검증한다.

endpoint 단위 case는 login request shape와 token persistence, unauthenticated `getMe`가 request를 보내지 않는 동작, current-user failure의 graceful 처리, response envelope에서 typed payload를 추출하는 규칙도 고정한다. page와 분리해서 client protocol behavior를 검사하므로 browser end-to-end run 없이도 authentication 및 HTTP regression을 확인할 수 있다.

## feat(shared): 사용자 HTTP runtime contract 정의
compile-time에만 존재하던 user interface를 runtime에서도 실행 가능한 Zod schema로 교체한다. role, account state, friendship state, tournament state, match mode는 이제 하나의 enum 정의를 사용하고 TypeScript type은 여기에서 추론한다.

`PublicUser`와 `SessionUser`는 identifier format, 필수 name, integer statistic, online/NPC flag, nullable email shape를 검증한다. schema에서 type을 파생하므로 API 경계에서 신뢰할 수 없는 JSON을 검증하기 시작해도 static model과 runtime validator가 서로 달라지는 문제를 막을 수 있다.

## feat(shared): 경기·대시보드 runtime contract 정의
match summary, dashboard payload, leaderboard entry에 대한 실행 가능한 contract를 정의한다. schema는 UUID/timestamp format, nonnegative score와 streak, integer rating delta, result/mode enum, positive rank, percentage range를 제한한다.

export되는 TypeScript type은 이 validator에서 추론하므로 consumer는 static composition과 runtime parsing에 동일한 정의를 사용할 수 있다. nested dashboard와 leaderboard 구조는 가정을 중복 정의하지 않고 앞서 만든 user schema를 재사용한다.

## feat(shared): 친구·채팅·로비 runtime contract 정의
runtime validation 범위를 friendship, chat, lobby statistic, 전체 lobby response로 확장한다. chat message는 scope, room 식별자, timestamp, sender shape, 비어 있지 않은 최대 240자 body를 강제한다. live counter는 nonnegative integer여야 하고 average wait는 nullable이지만 음수가 될 수 없다.

composite lobby schema는 session, user, match, chat, statistic contract를 재사용한다. traffic이 많은 aggregate endpoint에서 여러 compile-time interface를 network 경계에서 그대로 신뢰하지 않고 하나의 recursive validation 표현을 사용하게 한다.

## feat(shared): 토너먼트·관리 runtime contract 정의
tournament bracket, tournament aggregate, administration audit record의 runtime schema를 정의한다. bracket validation은 round/lifecycle enum, nonnegative slot 및 score, nullable participant/result, room과 stored match를 가리키는 UUID를 검증한다.

tournament summary는 bracket과 user schema를 조합하면서 positive capacity와 nonnegative enrollment를 강제한다. audit entry도 actor/target nullability, action kind, reason, timestamp를 검증한다. 추론된 type을 통해 상태가 많은 이 API 구조와 executable contract를 동기화한다.

## feat(shared): HTTP 요청·오류 schema 정의
route parameter, request body, 공통 API error envelope에 strict schema를 추가한다. 알 수 없는 field는 거부하고 identifier를 제한하며, text는 trim 후 길이를 제한한다. login handle에는 제한된 syntax를 적용하고 profile update는 실제 변경을 하나 이상 포함해야 한다.

error contract는 안정적인 machine code, 사람이 읽는 message, request correlation identifier, 선택적인 field별 detail을 제공한다. 이 규칙을 shared package에 중앙화해 handler마다 ad hoc check를 흩어놓는 대신 server route와 typed client에 하나의 normalization/validation 경계를 제공한다.

## feat(shared): HTTP 응답 runtime contract 정의
공유 domain validator에서 endpoint별 response schema를 조합한다. health, session, profile, friendship, chat, leaderboard, tournament, administration envelope이 wrapper key와 nested payload를 모두 정의하도록 한다.

WebSocket ticket response는 lifetime과 protocol version도 literal contract value로 고정해 어느 하나가 바뀌어도 명시적으로 감지할 수 있게 한다. static signature가 필요한 caller를 위해 일부 request/response type은 이 schema에서 추론한다.

## test(shared): HTTP contract 검증
새 HTTP schema에 encoding된 behavioral rule을 검증한다. valid session user, 알 수 없는 privilege field와 malformed handle 거부, whitespace normalization, UUID route requirement, 비어 있지 않은 profile mutation, 정확한 structured error envelope를 다룬다.

ticket case는 짧은 lifetime 표현과 protocol version을 모두 고정하고, 지원하지 않는 version을 호환 가능한 shape로 취급하지 않고 거부한다. validator가 단순 type generator가 아니라 의도한 boundary behavior를 실제로 강제하는지 확인한다.

## build(db): PostgreSQL integration 의존성과 명령 추가
Testcontainers 기반의 격리된 PostgreSQL integration-test 진입점을 도입한다. 일반 unit run은 `*.integration.test.ts`를 명시적으로 제외하고, 전용 command는 더 긴 lifecycle timeout을 사용하며 file parallelism을 비활성화하고 single worker로 실행해 container와 database ownership을 deterministic하게 유지한다.

root workspace에 해당 command를 노출하고 lockfile에 resulting dependency graph를 기록한다. 빠른 in-memory verification과 실제 PostgreSQL server가 필요한 test를 분리하되, 각 category가 의도한 runner에서 조용히 누락되지 않도록 한다.

## test(db): PostgreSQL integration 환경과 계약 추가
migration, seeding, test-resource lifecycle을 둘러싼 실제 PostgreSQL integration coverage를 추가한다. 하나의 PostgreSQL 16 container 안에서 `search_path`로 test별 schema를 선택해 application data를 공유하지 않으면서 실제 driver와 SQL 구현을 실행한다.

suite는 migration 생성 및 idempotence, 서로 다른 demo/development seed population, 명시적인 schema isolation을 검증한다. harness는 모든 pool과 repository를 추적해 역순으로 닫고, callback이 throw해도 schema를 drop하며, 원래 error를 가리지 않고 cleanup failure를 보고한다. interpolation 전에 생성된 schema name을 검증하고 temporary container가 failure 시 중지되는 것도 별도로 증명한다. 이를 통해 resource ownership과 cleanup 보장을 test-runner 가정이 아니라 integration contract의 일부로 만든다.

## ci(db): PostgreSQL integration 검사 실행
container-backed PostgreSQL suite를 별도 CI job으로 추가한다. 일반 verification job과 동일하게 pinned Node.js/pnpm 환경과 frozen dependency installation을 사용하지만, 외부 container resource를 소유하므로 독립 timeout과 command를 유지한다.

이 gate를 분리해 typecheck/unit/build의 빠른 feedback을 보존하면서도 모든 push와 pull request에서 production persistence path와 cleanup behavior가 반드시 통과하도록 한다.

## feat(db): 명시적 사용자 role 할당 추가
일반 login에서 handle 기반 privilege assignment를 제거하고 user role을 변경하는 명시적인 repository/CLI operation을 도입한다. 이제 `admin`이라는 이름의 user도 일반 user로 생성되거나 refresh되며, administrator status는 검증된 `user|admin` argument를 받는 `user:set-role`을 통해서만 부여한다.

update 대상은 정규화된 non-NPC handle이며 eligible user가 없으면 실패한다. PostgreSQL과 memory 구현이 동일한 contract를 공유하고, development seeding과 administration test도 administrator promotion을 명시적으로 수행한다. 특수 handle을 안다는 사실이 authorization mechanism으로 작동하지 않게 하고 privilege assignment를 별도 operational action으로 만든다.

## test(auth): 명시적 role assignment 검증
`admin` handle을 사용한 development account가 login만으로 privilege를 유지하지 않는지 PostgreSQL에서 검증한다. refresh된 account가 normal user여야 하며 `setUserRoleByHandle`을 호출한 경우에만 승격되는지 확인한다.

identity selection과 authorization assignment의 분리를 고정해 이후 login path가 magic privileged username을 다시 도입하지 못하게 한다.

## feat(api): typed HTTP 오류 boundary 추가
Fastify route용 중앙화된 typed failure 경계를 도입한다. Zod input failure는 path별 field message가 포함된 `400 validation_failed` error로 변환하고, 예상 가능한 authorization/not-found case는 `ApiHttpError`를 사용한다. 모든 emitted error는 현재 request identifier를 포함한 shared envelope을 따른다.

예상하지 못한 failure는 server-side log에 남기고 generic `500` response로 축약해 implementation detail을 노출하지 않는다. handler가 선언한 response schema를 위반하면 output parsing도 fail closed한다. 하나의 not-found/error handler를 설치해 각 route가 서로 다른 response를 조립하지 않고 status, code, message, correlation, validation contract를 통일한다.

## feat(api): 인증·사용자 HTTP contract 적용
shared runtime contract와 typed error boundary를 health, authentication, user, profile route에 적용한다. request cast와 permissive fallback value를 strict parameter/body parsing으로 교체하고, 각 response가 handler 밖으로 나가기 전에 해당 schema로 검증한다.

development login은 valid handle과 display name을 요구하고 server session을 생성한 뒤 HTTP-only cookie로만 노출한다. JSON response에서는 더 이상 bearer token을 반환하지 않는다. authentication failure와 missing user는 공통 error envelope을 따르고, profile update는 검증된 field를 하나 이상 포함해야 한다. CORS에서 `x-request-id`를 허용해 browser caller의 request-correlation 경계도 유지한다.

## feat(api): 로비·친구 HTTP contract 적용
runtime validation을 lobby, chat, leaderboard, dashboard, friendship endpoint로 확장한다. lobby와 read-model response는 완전한 aggregate로 검증하고, chat/friend request는 repository 호출 전에 shared schema로 trim 및 범위 제한한다.

authentication과 suspension check도 route 전용 body를 직접 반환하지 않고 공통 typed error를 throw한다. 두 friendship-request alias는 하나의 handler를 공유해 validation이나 authorization behavior가 서로 달라질 수 없으며, friendship identifier는 acceptance 시도 전에 UUID여야 한다.

## feat(api): 토너먼트·관리 HTTP contract 적용
shared request/response/error contract를 tournament와 administration route에 적용한다. tournament creation은 malformed input에 임의의 default name을 만들지 않고, join operation은 UUID parameter를 검증하며, 반환된 bracket은 전체 tournament schema로 검사한다.

administrator authentication을 `requireAdmin`에 중앙화해 session이 없는 경우와 authenticated non-administrator를 구분한다. ban/status 변경은 mutation 전에 identifier와 request body를 모두 검증하고 결과 public user도 다시 검증한다. 가장 신뢰 수준이 높은 HTTP 경계에서 중복 privilege check와 일관되지 않은 ad hoc error payload를 제거한다.

## refactor(api): HTTP boundary helper 통합
남아 있는 route-local unauthorized/suspended response helper를 제거하고 application 전체에서 typed HTTP-boundary function을 직접 사용한다. route behavior는 의도적으로 변경하지 않으면서 모든 authentication, suspension, administrator failure가 동일한 exception-to-envelope path로 표현되도록 한다.

helper를 domain name 그대로 사용해 aliasing과 더 이상 필요 없는 `FastifyReply` dependency도 제거하고, 이 status/error-code contract에 대한 authoritative implementation을 하나만 남긴다.

## test(api): typed HTTP boundary 기대값 정렬
API, tournament, administrator test를 typed HTTP boundary에서 확립한 cookie-based session contract에 맞춘다. test는 login response에서 `pp_session` cookie를 추출하고 login JSON에 token이 노출되지 않는지 확인하며, authenticated request와 logout invalidation에 해당 cookie를 사용한다.

administrator test는 일반 login으로 privilege를 다시 만들지 않고 development seed에서 명시적으로 privileged account를 가져온다. browser authentication은 HTTP-only server session으로 전달되고 administrator authority는 login payload나 special handle이 아니라 explicit role assignment에서 온다는 두 security boundary를 함께 검증한다.

## fix(auth): cookie-only session과 환경별 route 적용
session authentication을 `pp_session` cookie로 제한하고 request handling과 CORS에서 bearer-header 및 query-string token fallback을 제거한다. browser credential transport를 하나로 통일하고 URL, log, referrer, JavaScript-managed authorization header를 통해 reusable session secret이 노출되는 위험을 피한다.

application은 이제 명시적인 runtime mode를 파생한다. development login route는 development/test에서만 존재하고 production/demo에서는 아예 등록하지 않는다. 외부 서비스 모드에서는 cookie에 secure flag도 설정한다. test 편의 기능을 deployed authentication surface의 일부가 아니라 environment-scoped capability로 만든다.

## test(auth): cookie session 경계 검증
전체 authentication 경계에 집중한 regression coverage를 추가한다. login은 user data와 `HttpOnly`, root-scoped, `SameSite=Lax` cookie만 반환해야 한다. 동일 token을 `Authorization` header나 query parameter로 전달하면 거부되는지 증명하고, `admin` handle도 privilege를 얻지 않는지 확인한다.

validation, authentication, authorization, missing-route failure 전반에서 공통 error envelope도 검사하며 production/demo runtime이 development-login endpoint를 노출하지 않는지 검증한다. credential transport와 environment별 route availability를 함께 보호한다.

## refactor(game): Pong simulation 상태와 초기화 분리
authoritative Pong simulation state와 input을 위한 전용 표현을 도입한다. tick, phase, score, paddle position/direction, ball state, 최종 winner를 `PongSimulation` 뒤에 묶고, shared arena constant를 사용하는 하나의 canonical initializer를 둔다.

state-cloning helper는 room snapshot을 직접 mutate하지 않고 read-only input state에서 별도의 result로 simulation을 진행할 수 있게 준비한다. 이 단계의 커밋은 extraction boundary와 initial-state contract를 확립하며, 이후 commit에서 WebSocket client나 room lifecycle data에 결합하지 않고 rule을 단계적으로 이동할 수 있다.

## refactor(game): paddle 이동과 벽 반사 모델링
첫 deterministic simulation step을 추가한다. positive finite delta를 검증하고 이전 state를 clone한 뒤 configured tick interval에 맞춰 movement를 scaling한다. 두 paddle을 arena boundary 안으로 clamp하고 ball을 이동시키며 top/bottom wall을 넘어간 거리는 반사시킨다.

`deltaMs / fixedTimestep`으로 scaling해 rule은 per-tick 단위로 표현하면서 elapsed time도 명시적으로 반영한다. coordinate를 단순 clamp하지 않고 초과 거리를 arena 안쪽으로 mirror해 collision boundary를 지난 motion을 보존한다. finished state는 더 진행하지 않고 copy로 반환한다.

## refactor(game): 득점과 충돌을 simulation에 통합
paddle collision, scoring, serve reset, acceleration, match termination을 standalone simulation으로 이동한다. ball이 paddle과 겹치고 해당 side를 향해 접근하는 경우에만 paddle hit로 인정한다. contact offset이 vertical velocity를 결정하고 horizontal velocity는 반전되면서 증가한다. paddle을 놓친 ball은 반대편 score를 올리고 center에서 실점한 side 방향으로 reset한다.

speed 증가 시 velocity 방향을 유지하고 상한을 적용하며, variable step size 때문에 acceleration이 정체되지 않도록 elapsed tick에서 minimum progression을 강제한다. winning score 또는 match-duration limit에 도달하면 simulation을 종료하고, 현재 rule에서는 timeout 동점 시 left side를 일관되게 winner로 결정한다. winner를 기록하고 paddle movement를 비운다. 핵심 game outcome을 transport와 독립적인 하나의 state transition 속성으로 만든다.

## refactor(game): 결정적 정수 난수 생성기 추가
game AI용 integer-only seeded pseudo-random generator를 도입한다. numeric seed는 unsigned 32-bit 값으로 정규화하고 string seed는 deterministic하게 hash한다. 0은 non-zero state로 교체하고 xorshift transition으로 반복 가능한 unsigned stream을 생성한다.

`nextInt`는 positive safe bound만 허용하고 `snapshot`은 replay 검증을 위해 현재 generator state를 노출한다. gameplay randomness를 process-global `Math.random`과 분리해 match의 random input이 runtime timing이 아니라 room seed에서 재현되도록 한다.

## refactor(game): rating 기반 Pong AI 정책 분리
right-paddle AI를 seed와 rating으로 parameterize된 deterministic policy로 추출한다. simulation 자체를 바꾸지 않고 rating tier가 reaction interval, prediction noise, mistake probability, dead zone을 제어하게 해 skill variation을 input-generation 경계에 둔다.

ball이 접근하면 policy는 arena wall 반사를 고려해 vertical intercept를 예측하고 seeded bounded error와 간헐적인 더 큰 mistake를 추가한다. ball이 멀어질 때는 center로 복귀한다. target은 configured reaction tick에서만 refresh하고 state snapshot에는 random/reaction state를 모두 담는다. 따라서 동일한 simulation state와 seed는 동일한 paddle command와 replay를 만든다.

## test(game): 결정적 simulation 검증
추출된 simulation과 AI에 deterministic 및 immutability 보장을 확립한다. 같은 seed는 같은 integer stream을 만들어야 하고, AI source는 floating-point pseudo-random helper로 fallback해서는 안 된다. 동일한 AI instance는 같은 command와 snapshot을 내야 하며 finished game에서는 movement가 없어야 한다.

simulation test는 같은 state에서 반복 step한 결과가 같으면서도 nested state를 mutate하거나 공유하지 않는지 확인한다. delta-scaled movement와 arena clamp, winning-score termination, invalid delta를 검증하고, 1,000 tick replay를 두 번 실행해 같은 SHA-256 digest를 요구한다. replay hash는 simulation과 AI snapshot을 합친 전체 deterministic transition chain을 보호한다.

## refactor(game): 게임 방 상태 전이 모델링
readiness, play, pause, reconnection, completion을 위한 명시적인 room-session state machine을 도입한다. 양쪽이 모두 ready인 경우에만 match가 `playing`으로 들어갈 수 있고 pause/resume operation도 각각 해당 state에서만 유효하다.

disconnect 시 resume할 state를 보존하고 어느 side가 absent인지 추적하며 15초 deadline을 설정한다. 기한 안에 reconnect하면 해당 side만 missing set에서 제거하고 모든 missing participant가 돌아온 뒤 이전 state를 복원한다. deadline이 만료되면 한쪽만 absent일 경우 반대쪽의 forfeit win으로 처리하고, 양쪽이 모두 absent면 winner를 두지 않는다. finish 시 reconnection state를 비워 expiry가 두 번 적용되지 않게 한다. lifecycle rule을 socket callback과 game physics에서 분리한다.

## test(game): 게임 방 상태 전이 검증
유효한 room-session transition과 reconnection boundary condition을 고정한다. 두 readiness signal이 모두 들어오기 전에는 play가 시작되지 않아야 하고, pause는 idempotent해야 하며, deadline 안의 reconnect에서는 이전 paused state를 복원해야 한다. deadline 직후 reconnect는 거부해야 한다.

또한 expiry가 정확히 15초 boundary에서 발생하고 forfeit result를 한 번만 만들며 양쪽이 disconnect된 경우 winner를 선택하지 않는지 검증한다. transient transport loss와 terminal match outcome을 구분하는 규칙을 보호한다.

## refactor(game): GameHub room에 simulation 상태 연결
새로 생성되는 모든 game room에 `PongSimulationState`를 연결하고 해당 state에서 initial public snapshot을 파생한다. paddle position/direction과 ball coordinate가 `GameHub` 내부에 arena default를 중복하지 않고 동일한 canonical initializer에서 시작한다.

완전한 ownership transfer가 아니라 첫 integration 단계다. room은 여전히 simulation과 함께 transport snapshot도 보유한다. initial physics state의 source를 simulation으로 정함으로써 같은 commit에서 WebSocket payload contract를 바꾸지 않고 다음 frame migration을 진행할 수 있다.

## refactor(game): GameHub frame 계산을 simulation에 위임
`GameHub` 내부에서 직접 수행하던 frame physics를 explicit 50ms timestep의 `PongSimulation.step` 호출로 교체한다. hub는 현재 player 또는 AI direction을 전달하고 반환된 authoritative state를 저장한 뒤 기존 wire snapshot으로 projection해 broadcast한다. simulation이 winner를 보고하면 room을 종료한다.

paddle movement, ball motion, collision, scoring, acceleration, terminal rule을 하나의 deterministic transition 경계 뒤로 이동한다. `GameHub`는 scheduling, input collection, transport timestamp, broadcasting, persistence를 계속 담당하고 simulation은 game mechanic을 소유한다. snapshot-sync function은 ownership 변경 중에도 기존 client protocol을 유지한다.

## refactor(game): GameHub에 결정적 AI controller 연결
NPC room마다 하나의 seeded `PongAi` controller를 생성한다. room 식별자를 replay seed로 사용하고 선택된 NPC rating을 skill profile로 사용한다. 각 frame에서 hub가 controller에 right-side direction을 요청해 simulation에 전달하며 human room은 계속 수신된 paddle input을 사용한다.

controller를 room-owned state로 유지해 frame 사이에서도 random/reaction progression을 보존한다. AI target 계산도 transport snapshot에서 제거해 generated input과 simulated physics가 동일한 deterministic state sequence를 따르게 한다.

## refactor(game): GameHub의 중복 물리 계산 제거
hub를 `PongSimulation`과 `PongAi`로 migration한 뒤 legacy physics, AI profile, prediction, pseudo-random, collision, serve reset, acceleration helper를 삭제한다. 관련 constant/import와 obsolete `aiTargetY` room field도 함께 제거한다.

이로써 responsibility transfer를 완료한다. `GameHub` 안에 tested simulation과 달라지거나 이전 sine-based randomness를 다시 도입할 수 있는 두 번째 rule implementation이 남지 않는다. hub는 dormant duplicate mechanic 대신 orchestration과 snapshot projection만 담당한다.

## fix(web): browser token 저장 제거
web application에서 browser가 관리하던 session token을 제거한다. API client는 더 이상 `localStorage`를 읽거나 쓰지 않고 bearer header도 추가하지 않으며, `credentials: "include"`에 의존해 server의 HTTP-only cookie만 HTTP credential로 사용한다.

같은 경계에서 성공 response는 shared runtime schema로 parsing하고, failure는 status, code, request ID, field error를 담는 structured `ApiError`로 변환한다. malformed upstream response용 typed fallback도 둔다. `401`은 session-expired event를 dispatch하고 endpoint helper는 `AbortSignal`을 받아 component teardown 시 request를 취소할 수 있게 한다.

lobby와 play socket은 connection URL을 만들기 전에 short-lived WebSocket ticket을 발급받는다. cleanup에서는 진행 중인 ticket request를 abort하고 stale socket을 닫는다. durable session secret을 JavaScript나 URL parameter에 노출하지 않고 realtime authentication을 준비하며, administrator load도 untyped generic request 대신 validated helper로 이동한다.

## test(web): cookie 기반 API 경계 검증
cookie-only 및 runtime-validated client boundary를 중심으로 web API test를 확장한다. 성공 response라도 shape가 잘못되면 schema parsing이 실패해야 하고, structured/malformed HTTP failure는 모두 `ApiError` 안에 유지되어야 한다. `401`은 session-expired event를 publish하고 cancellation은 변형되지 않은 채 `fetch`에 전달되어야 한다.

suite는 one-time WebSocket-ticket request와 helper-level signal forwarding을 검증하고, 모든 endpoint helper가 invalid response envelope을 거부하는지 parameterize해 확인한다. generic client가 shared schema를 사용한 뒤 개별 helper가 unchecked JSON을 조용히 반환하는 것을 막는다.

## feat(auth): WebSocket ticket 생성과 HTTP 계약 정의
one-time WebSocket credential의 cryptographic/protocol 표현을 정의한다. ticket은 random byte 32개에서 생성해 43자 base64url 값으로 encoding한다. storage에는 SHA-256 digest만 저장하도록 해 database가 노출되어도 usable raw ticket을 얻지 못하게 한다.

shared HTTP contract는 ticket의 정확한 alphabet과 length를 검증하고, 해당 ticket과 protocol version `1`을 포함한 strict handshake query를 요구하며, response TTL을 30초로 고정한다. generation/hash와 persistence를 분리해 두 repository 구현이 동일한 opaque credential contract를 사용하도록 한다.

## feat(db): PostgreSQL WebSocket ticket 저장 추가
hash된 WebSocket ticket을 위한 durable PostgreSQL storage를 추가한다. migration은 64자 lowercase SHA-256 digest를 강제하고 owning user를 cascade delete로 참조하며 expiration을 기록하고 lifecycle maintenance용 expiry index를 추가한다.

ticket 생성은 database에서 expiration을 계산하기 전에 hash와 TTL을 검증한다. consumption은 delete-returning CTE를 사용하므로 lookup과 invalidation이 하나의 atomic operation이다. active user 소유이면서 만료되지 않은 ticket만 session user를 반환한다. expired, replayed, missing, suspended-user ticket도 삭제한 뒤 identity를 반환하지 않아 persistence 경계에서 single-use semantics를 확립한다.

## feat(db): memory WebSocket ticket 소비 구현
repository contract와 in-memory 구현에 PostgreSQL과 동일한 ticket 생성/소비 operation을 추가한다. memory store는 owning user와 absolute expiry를 기록하고 entry를 먼저 제거한 뒤 평가한다. ticket이 존재하고 만료되지 않았으며 active user 소유인 경우에만 identity를 반환한다.

validation 전에 삭제해 expired 또는 suspended credential도 one-use behavior를 유지한다. unit/route test가 permissive한 test-only substitute가 아니라 production repository와 같은 외부 security semantics를 사용하게 한다.

## feat(auth): ticket 기반 WebSocket 인증 연결
authenticated HTTP endpoint에서 ticket을 발급하고 socket handshake에서 이를 소비하도록 해 WebSocket authentication flow를 완성한다. active cookie-authenticated user만 ticket을 요청할 수 있고 server는 fixed TTL과 함께 hash를 저장한 뒤 raw value를 한 번 반환한다. socket query는 strict versioned schema와 일치해야 하며 repository가 hash를 atomic하게 consume한 뒤에야 `GameHub`가 user를 받는다.

asynchronous authentication 중 들어오는 message는 early client command를 잃지 않도록 buffer하지만, message별 size, message count, total byte 수로 상한을 둔다. protocol violation이나 oversized pre-auth traffic은 명시적인 WebSocket code로 socket을 닫고 listener는 정확히 한 번 detach한다. authentication 전에 닫힌 connection은 hub에 attach하지 않는다. durable-session 노출과 unauthenticated buffering denial-of-service surface를 모두 피한다.

## test(auth): WebSocket ticket 경계 검증
one-time WebSocket credential 경계를 end-to-end와 repository 수준에서 검증한다. route test는 cookie authentication, random 43-character ticket, 30초/version-1 response, raw가 아닌 hash persistence, suspension rejection, ticket당 한 번의 successful connection, forged/expired/reused/post-issuance-suspended credential의 안정적인 거부를 요구한다.

지원하지 않는 protocol version이 유효한 ticket을 소비하지 않는지도 증명한다. cookie, bearer header, legacy query parameter로 durable session value를 전달해도 socket authentication에 사용할 수 없고, pre-authentication buffer가 정확히 8KiB message, 16-message, 총 32KiB 제한을 강제하는지 검증한다.

repository test는 memory에서 expiry와 suspension을 검사하고 PostgreSQL에서 20개 concurrent consumption을 실행해 정확히 하나만 성공하고 row가 남지 않아야 한다. single use가 단순 sequential route convention이 아니라 atomic storage invariant임을 검증한다.

## fix(log): 요청 비밀 정보 redaction 적용
Fastify request logging에서 authentication material을 제외하도록 설정한다. cookie, authorization header, query object, ticket field를 defensive redaction 대상으로 등록하고, custom request serializer는 URL을 기록하기 전에 전체 query string을 제거한다.

method, path, host, remote address, port는 유지해 유용한 request context를 보존하면서 raw WebSocket ticket이나 durable session credential을 log에 기록하지 않는다. parsed `ticket` field만 redaction해서는 원본 URL에 포함된 credential을 보호할 수 없으므로 serialization 단계에서 query를 제거하는 것이 중요하다.

## test(log): 비밀 정보 masking 규칙 검증
request serialization에서 `/ws` path는 유지하되 ticket이 포함된 query string은 버리고 serialized output 어디에도 raw ticket value가 남지 않는지 검증한다. request-object naming variant 두 종류, cookie/authorization header, query object, nested ticket field에 대한 redaction path도 고정한다.

이후 logger configuration 변경이 sensitive credential을 operational log에 다시 노출하지 못하게 하면서 non-secret request metadata는 유지한다.

## feat(protocol): versioned game snapshot 계약 정의
compile-time에만 존재하던 game interface를 strict runtime schema로 교체하고 snapshot을 명시적인 transport model로 재구성한다. snapshot은 room identity, 단조 증가하는 tick/sequence number, numeric server time과 phase, score, paddle, ball, player를 포함한 nested game state를 가진다. numeric value는 finite 또는 non-negative integer domain으로 제한하고 모든 object는 unknown field를 거부한다.

finished result는 discriminated persisted/transient union으로 바뀐다. persisted outcome은 match 식별자가 필수이고 rating delta를 가질 수 있다. non-persisted outcome은 `matchId: null`, `persisted: false`, rating change 0이어야 한다. 모든 terminal frame이 durable하게 기록되었다고 암시하지 않고 persistence 성공 자체를 protocol의 일부로 만들며, TypeScript type은 계속 executable contract에서 추론한다.

## feat(protocol): versioned WebSocket event codec 연결
모든 client/server WebSocket event를 strict runtime-validated version-1 message로 만든다. client command는 `v: 1`, non-empty identifier, bounded chat text를 요구하고 paddle update에는 non-negative safe `inputSeq`가 필요하다. server message는 공유 chat, snapshot, result, player schema를 사용하며 유한한 machine-readable error code 집합을 노출한다.

양방향 모두 codec을 갖는다. incoming JSON은 client schema로 parsing하고 outgoing event는 encoding 전에 validation하며, client도 동일한 authoritative definition으로 server payload를 parsing할 수 있다. handshake version에 더해 각 event에도 version을 요구해 구조적으로 호환되지 않는 message를 조용히 해석하는 것을 막고 이후 protocol evolution을 위한 명확한 경계를 만든다.

## test(protocol): versioned event codec 기대값 정렬
protocol test를 strict version-1 event contract에 맞춘다. client-side case는 모든 command shape를 다루고 queue-mode default는 유지하되 protocol version은 default하지 않는다. missing/unsupported version, unknown field, invalid direction, 누락·음수·소수 input sequence를 거부한다. 새 envelope 아래에서도 chat normalization과 length limit 검증을 유지한다.

server-side fixture는 nested snapshot 표현, sequence/server-time metadata, persisted result discriminator, coded error를 사용한다. 각 event를 `encodeServerEvent`와 `parseServerEvent`로 round trip해 executable schema가 지원하는 전체 vocabulary를 허용하고 encoding이 runtime validation을 우회할 수 없는지 확인한다.

## feat(game): versioned outbound event 송신 경계 연결
protocol version 부착을 GameHub send 경계에 중앙화한다. internal producer는 `v: 1`을 반복하지 않고 해당 event variant만 구성하며, `send`가 version을 추가한 뒤 완성된 payload를 shared server-event codec에 통과시켜 socket에 쓴다. distributive `VersionlessServerEvent` type은 producer를 arbitrary object로 약화시키지 않고 각 union member의 field requirement를 보존한다.

snapshot sequence를 증가시키고 broadcast 전에 server timestamp를 갱신하는 전용 snapshot emission helper도 추가한다. versioning과 emission metadata를 최종 transport 경계에 두어 call site마다 bookkeeping이 달라지는 문제를 피하고, 이후 room-state migration에서도 규칙을 중복하지 않고 helper를 사용할 수 있게 한다.

## feat(game): GameHub snapshot envelope 초기화
각 GameHub room을 versioned snapshot 표현으로 initialize한다. room 식별자, tick, sequence, numeric server time 같은 transport metadata가 phase, score, paddle/ball state, player slot을 소유하는 nested `state` object를 둘러싼다. initial physical value의 source는 계속 simulation이지만 protocol metadata와 domain state는 분리한다.

첫 room update도 direct broadcast 대신 `broadcastSnapshot`으로 보내므로 initial snapshot부터 이후 frame과 동일한 sequence 증가와 timestamp refresh를 적용받는다. room 생성 시점부터 모든 snapshot이 하나의 ordering path를 사용하도록 한다.

## feat(game): GameHub snapshot 상태 소비를 전환
GameHub의 room lifecycle과 result handling을 versioned protocol에서 도입한 nested snapshot state로 migration한다. readiness, phase change, AI/player direction, score, physics synchronization, tournament completion은 `snapshot.state`를 읽거나 갱신한다. ready, pause, resume, tick transition은 centralized snapshot broadcaster를 통해 emit해 sequence와 server-time metadata가 일관되게 증가하도록 한다.

이 커밋은 최종 호환 상태가 아니라 intermediate migration이다. input assignment는 제거된 flat paddle path를 아직 참조하고 있었고 finished-result payload도 persistence discriminator를 갖지 않았다. 바로 뒤의 변경에서 이 두 protocol obligation을 완성한다.

## feat(game): room별 input sequence 중복을 차단
client와 room별로 마지막으로 accepted된 가장 높은 input sequence를 따로 추적한다. room이 playing 상태이고 sender가 실제 participant이며 `inputSeq`가 이전 accepted value보다 엄격히 큰 경우에만 game input을 적용한다. duplicate 또는 reordered message는 현재 paddle direction을 덮어쓰기 전에 무시한다.

sequence map을 room 단위로 scope해 이전 match의 counter가 새 room을 무효화하지 않도록 하고, client에 보관해 동일 connection이 보낸 전체 message의 ordering을 유지한다. 최종 assignment는 `snapshot.state.paddles`에 쓰도록 해 snapshot-envelope migration도 완성한다.

## feat(game): realtime 오류 code를 명시
realtime failure에 localized message만 노출하지 않고 안정적인 machine-readable code를 붙인다. invalid payload는 `invalid_event`, NPC matching failure는 `internal_error`, unavailable tournament match는 `not_found`, participant/concurrent-match violation은 `forbidden`으로 mapping한다.

code와 human message를 분리해 client가 display text를 parsing하지 않고 bounded protocol contract에 따라 분기할 수 있게 하면서, 사용자와 log를 위한 기존 설명은 유지한다.

## feat(game): 영속 경기 결과 metadata를 송신
성공적으로 기록된 game result를 broadcast하기 전에 `persisted: true`로 표시한다. match 식별자는 repository가 먼저 생성하므로 이 discriminator는 terminal result에 durable backing이 있음을 정확히 나타내며 payload를 shared result schema의 persisted branch에 맞춘다.

## feat(web): lobby realtime event codec 소비
lobby realtime 경계를 unchecked JSON type assertion에서 shared server-event parser로 이동한다. 들어오는 message는 chat/presence state를 갱신하기 전에 versioned runtime schema를 만족해야 하므로 stale 또는 malformed payload가 React state model에 조용히 들어갈 수 없다.

lobby chat command에도 `v: 1`을 포함해 browser producer를 server codec과 동일한 명시적 protocol version으로 맞춘다. socket이 open 상태가 아니면 기존 HTTP fallback은 유지한다.

## feat(play): versioned game input과 snapshot 소비
play page를 versioned realtime contract로 migration한다. queue, tournament, ready, pause, resume, chat, game-input command 모두 `v: 1`을 포함하고, periodic paddle input에는 단조 증가하는 `inputSeq`를 넣는다. incoming message는 raw JSON decoding 후 신뢰하지 않고 shared runtime codec으로 parsing한다.

client는 새 game connection을 열 때마다 input/snapshot counter를 reset하고 마지막 적용 sequence보다 새롭지 않은 snapshot은 무시한다. UI state, score, participant, terminal-phase update는 nested snapshot state를 읽으므로 delayed/duplicated frame이 rendered match를 이전 상태로 되돌릴 수 없고 server authority도 유지된다.

## refactor(web): PongCanvas snapshot state 렌더링
PongCanvas와 interpolation buffer를 nested snapshot 표현에 맞춘다. drawing은 `snapshot.state`에서 paddle, ball, score를 읽고, empty sample에도 새 sequence와 numeric server-time metadata를 넣는다. render sample은 interpolation queue에 들어가기 전에 nested paddle, ball vector, player record를 deep copy한다.

interpolation은 계속 paddle/ball position만 blend하고 나머지 state와 transport metadata는 더 새로운 sample의 값을 유지한다. 독립적인 nested object를 보존해 rendering 계산이 page가 받은 authoritative snapshot을 mutate하지 않도록 한다.

## test(protocol): versioned realtime contract 검증
migration 후 더 이상 허용해서는 안 되는 shape에 대한 negative protocol case를 추가한다. server-event parser는 version이 없는 presence event, negative sequence를 가진 snapshot, match 식별자 없이 durable persistence를 주장하는 result를 거부한다.

성공적인 serialization만 검사하는 것이 아니라 새 schema가 encoding한 ordering과 persistence invariant를 보호한다.

## feat(db): match result key와 rating history schema 추가
idempotent match finalization과 감사 가능한 rating change를 위한 persistent foundation을 도입한다. 기존 match에는 column을 non-null/unique로 만들기 전에 deterministic `legacy:<id>` result key를 부여해 old row를 보존하면서 이후 모든 logical result가 database-enforced identity 하나를 갖게 한다.

별도 `rating_history` table은 finalized match에 대해 각 participant의 before, after, delta 값을 기록한다. cascading foreign key는 history를 해당 match/user와 맞추고, `(match_id, user_id)` unique 제약은 participant entry 중복을 막는다. descending user/time index는 rating-history query를 지원한다.

## feat(db): 경기 확정 command 계약 정의
match finalization을 하나의 logical command로 표현하는 repository-level input/output contract를 정의한다. command는 score, participant, 필수 idempotency `resultKey`, 선택적인 tournament-match link를 함께 받고, result는 stable match identity와 이번 invocation이 실제로 생성했는지를 반환한다.

blank 또는 oversized key, 동일한 winner/loser identity, invalid score, non-tournament match에 붙은 tournament link 또는 식별자가 빠진 link를 validation에서 거부한다. persistence 전에 이 제약을 확립해 모든 repository 구현이 동일한 finalization 경계를 따르게 한다.

## feat(db): PostgreSQL 경기 결과 중복 생성을 차단
unique result key를 중심으로 PostgreSQL match finalization을 구현한다. repository는 transaction 안에서 `ON CONFLICT (result_key) DO NOTHING`으로 insert를 시도한다. concurrent 또는 repeated command가 race에서 지면 새 result row를 만들지 않고 이미 생성된 match를 읽어 `created: false`를 반환한다.

application-level check 후 insert하는 방식이 아니라 database unique constraint에 의존하므로 concurrent request에서도 idempotency가 유지된다. duplicate invocation은 이후 finalization side effect 전에 반환되어 result key가 전체 logical operation의 identity를 책임진다.

## feat(db): PostgreSQL 참가자 rating을 원자적으로 반영
성공한 PostgreSQL finalization에서 match row, participant counter, current rating, rating-history record를 하나의 transaction으로 commit하도록 확장한다. 서로 다른 participant identifier를 정렬한 뒤 `SELECT ... FOR UPDATE`로 lock해 concurrent rating change를 serialize하고 경쟁 transaction에 일관된 lock order를 제공한다.

winner는 rating 16점과 win 1회를 얻고, loser는 rating 12점을 잃되 800점 floor를 적용하며 loss 1회가 추가된다. 각 변경마다 정확한 before, after, delta를 기록한다. participant가 없으면 transaction을 abort하고, 기존 duplicate-result path는 이 update보다 먼저 반환하므로 retry가 rating effect를 두 번 적용할 수 없다.

## feat(db): PostgreSQL tournament 경기 확정을 연결
PostgreSQL match-finalization transaction 안에 tournament progression을 포함한다. repository는 bracket match와 해당 tournament를 모두 lock하고, match가 없거나 이미 linked 상태면 거부한다. reported winner/loser가 scheduled participant인지 검증한 뒤 realtime room, durable match, result, score를 연결한다.

semifinal 완료 시 transaction이 finished semifinal winner를 읽고 둘 다 있을 때만 하나의 final을 insert한다. bracket의 unique round/slot key로 concurrent insert가 같은 결과에 수렴한다. final round 완료는 같은 transaction에서 tournament와 winner를 확정한다. 이 lock과 constraint는 duplicate final, cross-match result, bracket state에 반영되지 않은 durable match record를 방지한다.

## feat(db): memory 경기 결과 중복 생성을 차단
in-memory repository에 idempotent match finalization을 도입한다. validated result key가 logical game outcome을 식별하고, repeated command는 이전에 생성된 match를 `created: false`와 함께 반환하며 첫 command만 result를 기록하고 생성되었음을 보고한다.

call count에 의존하지 않고 domain result identity를 사용해 retry에 안정적인 의미를 부여한다. 이 초기 단계는 participant rating과 tournament progression이 동일 finalization 경계에 들어오기 전에 match-row uniqueness부터 보호한다.

## feat(db): memory 참가자 rating을 원자적으로 반영
in-memory finalization operation 안에서 participant statistic과 rating change를 함께 적용한다. match를 append하기 전에 winner/loser reference를 resolve하고 검증한 뒤, persistent backend와 동일한 minimum-rating floor를 포함해 win, loss, rating delta를 함께 갱신한다.

참조하는 user를 모두 먼저 검증해 participant 하나가 없을 때 result 일부만 기록되는 상황을 피한다. test와 development mode가 PostgreSQL과 동일한 domain-level outcome을 얻도록 하고, result effect를 관련 없는 여러 call로 나누지 않은 채 이후 tournament linkage도 같은 method에 추가할 수 있게 준비한다.

## feat(db): memory tournament 경기 확정을 연결
in-memory match finalization을 확장해 같은 domain operation 안에서 tournament progression도 갱신한다. match나 rating state를 변경하기 전에 repository가 참조된 bracket match를 resolve하고, 없거나 이미 finalized된 match를 거부하며, 선언된 winner와 loser가 실제 participant인지 확인한다.

성공한 finalization은 realtime room과 durable match result를 연결하고 winner와 score를 저장한 뒤, semifinal이면 final을 materialize하고 final이면 tournament를 finished로 표시한다. database transaction이 없는 backend에서도 validation을 먼저 수행해 all-or-nothing behavior를 보존하고 observable contract를 PostgreSQL과 맞춘다.

## refactor(db): 기존 match 생성을 원자적 확정으로 위임
모든 match 생성이 atomic finalization이라는 하나의 implementation path를 사용하도록 한다. repository interface는 `finalizeMatch`를 노출하고 in-memory record는 idempotency key를 요구한다. legacy `createMatch` method는 별도 result/rating logic을 유지하지 않고 새로운 `legacy:` key로 해당 method에 위임한다.

stable result identity를 아직 제공하지 않는 caller와의 compatibility는 유지하면서 statistic/rating update 구현이 둘로 나뉘어 달라지는 것을 막는다. 새 gameplay caller는 deterministic key로 retry safety를 확보하고, legacy caller는 계속 match ID를 받되 의도적으로 one-call semantics를 유지한다.

## test(db): 경기 결과 단일 확정 조건 검증
repetition, concurrency, partial failure 상황에서 repository match-finalization 경계를 검증한다. 동일 result key로 20개 concurrent call을 실행했을 때 두 repository 구현 모두 하나의 match 식별자만 반환하고, creation은 한 번만 보고하며, result 하나만 기록하고 winner/loser statistic과 rating history를 정확히 한 번만 적용해야 한다.

PostgreSQL coverage는 tournament linkage가 실패하면 transaction이 match와 rating effect를 rollback하는 것도 요구한다. concurrent semifinal finalization은 두 source match를 모두 연결하면서 올바른 winner로 final 하나만 생성해야 한다. gameplay completion이 독립적으로 반복 가능한 여러 write가 아니라 하나의 atomic, idempotent domain transition이라는 핵심 invariant를 보호한다.

## refactor(game): 경기 결과 확정 boundary 사용
match를 따로 생성한 뒤 tournament state를 갱신하지 않고 room completion을 repository의 atomic match-finalization 경계로 전달한다. room이 deterministic result key와 선택적인 tournament context를 제공하므로 persistence는 retry를 idempotent하게 처리하고 관련 match, rating, bracket effect를 함께 commit할 수 있다.

room-level in-flight promise는 concurrent finish trigger를 하나로 합치고 finalization 실패 시에만 제거해 이후 retry는 허용하되 성공한 작업을 중복하지 않는다. finished event는 repository가 canonical match identifier를 반환한 뒤 broadcast하므로 client는 durable 경계를 통과한 result를 관찰한다.

## test(smoke): cookie 기반 realtime protocol 검증
end-to-end 및 smoke verification을 cookie-based authentication과 versioned realtime protocol에 맞춘다. login은 session cookie를 설정해야 하고 JSON에 reusable token을 노출해서는 안 된다. HTTP request는 해당 cookie를 사용하고 각 WebSocket은 connection 전에 별도의 one-time ticket을 발급받는다.

realtime smoke path는 이제 versioned send/parse helper를 사용하면서도 presence, lobby/match chat, queue pairing, shared room identity, readiness, ball acceleration, pause/resume, AI fallback, canonical snapshot structure를 계속 검증한다. browser coverage는 `admin` handle을 선택하는 것만으로 administrative access를 얻지 못하는 것도 증명해 identity label과 persisted authorization의 구분을 유지한다.

## refactor(web): game input 직렬화 경계 분리
keyboard 해석을 play component에서 pure input helper로 추출한다. 지원하는 Arrow 및 W/S key를 shared direction domain에 mapping하고, browser event class에 의존하지 않는 작은 structural target type으로 form control과 content-editable element를 식별한다.

UI event capture와 command semantics를 분리해 경계를 직접 test할 수 있게 한다. caller는 text 입력 중 gameplay input을 일관되게 억제할 수 있고, touch나 다른 control을 추가할 때 keyboard-to-direction rule을 중복할 필요가 없다.

## refactor(web): game connection 상태 reducer 분리
동작을 옮기기 전에 browser game connection을 명시적인 state/action model로 정의한다. state는 lifecycle status, room/opponent identity, 최신 snapshot과 accepted sequence, user notice, bounded presentation message를 기록하고, action union은 이 field를 바꿀 수 있는 모든 event에 이름을 부여한다.

reducer는 처음에는 no-op scaffold지만 type boundary 자체가 architecture 변경이다. 여러 React state setter 사이의 implicit coupling을 하나의 transition vocabulary로 교체해 다음 단계에서 legal lifecycle behavior를 독립적으로 구현하고 test할 수 있게 한다.

## refactor(web): game connection 전이 규칙 완성
browser-side authoritative state machine 역할을 하도록 game connection reducer를 완성한다. connection start는 room-scoped state를 reset하고, socket open과 matchmaking은 이름 있는 phase를 따라 진행하며, snapshot은 sequence가 더 새로운 경우에만 받아들인다. finish, chat, readiness, close, failure event도 각각 명시적인 transition을 만든다.

close rule은 이미 알려진 room이 있으면 `reconnecting`을 유지하지만 match 전 close는 failure로 처리해 서로 다른 recovery 가능성을 반영한다. server snapshot phase를 더 작은 UI lifecycle로 mapping해 rendering과 command eligibility를 일관되게 유지한다. bounded chat history와 monotonic snapshot acceptance는 presentation state가 무한히 늘거나 stale network data가 진행 상황을 되돌리는 것을 막는다.

## refactor(web): GameSocketClient 연결 수명주기 분리
connection replacement와 teardown을 소유하는 transport-neutral `GameSocketClient`를 도입한다. ticket acquisition과 WebSocket construction을 작은 interface 뒤에 inject해 browser socket 없이 lifecycle behavior를 test할 수 있게 한다.

connection을 교체할 때 generation을 증가시키고 pending one-time-ticket request를 abort하며, 기존 socket을 닫기 전에 모든 callback을 detach하고 input sequencing을 reset한다. generation과 socket identity를 함께 검사해 이후 asynchronous handler에 정확한 stale-work guard를 제공한다. 현재 client가 소유한 connection instance의 event만 유효하다.

## refactor(web): GameSocketClient 메시지 처리를 분리
message handling을 `GameSocketClient`로 이동해 하나의 object가 ticket-to-socket 전체 lifecycle을 소유하도록 한다. connection generation은 대체된 ticket request와 socket을 무효화하고, 현재 socket만 open/message/error/close callback을 보고할 수 있다. inbound frame은 string이어야 하며 caller에 도달하기 전에 shared protocol parser를 통과해야 한다.

client는 typed event serialization 경계이자 단조 증가하는 paddle-input sequence number의 owner도 된다. UI code가 transport state와 protocol rule을 섞지 않게 하고, obsolete asynchronous callback이 connection 교체 후 active connection을 변경할 수 없도록 한다.

## refactor(web): game connection hook 상태 연결
React hook 뒤에서 `GameSocketClient`와 connection reducer를 조합한다. hook은 component lifetime 동안 하나의 client를 생성하고 socket callback 및 지원되는 각 server event를 reducer action으로 변환하며, queue/tournament entry를 intent-level command로 노출하고 unmount 시 client를 닫는다.

imperative transport lifecycle과 declarative UI state를 분리하는 경계다. client는 ticket, socket, parsing, replacement를 소유하고 reducer는 legal state transition을 소유하며 hook은 event-to-action coordination만 수행한다. authentication/transport failure를 user-facing notice로 mapping해 error interpretation도 presentation component 밖에 둔다.

## refactor(web): game connection hook 명령 연결
`useGameConnection`을 connection initiator에서 active match용 command 경계로 확장한다. readiness, trim된 match chat, pause/resume, paddle direction은 hook state의 현재 room에서 식별자를 얻고 owned client를 통해 versioned protocol message를 전송한다.

caller가 room-scoped message를 직접 조립하게 하지 않고 invalid local precondition을 command가 자체 거부한다. pause/resume은 explicit lifecycle state에서 선택하고 successful readiness는 reducer notice를 진행시키며 direction sequencing은 socket client 안에 유지한다. success value를 반환해 message가 실제 send 대상으로 accepted된 경우에만 UI가 form을 비우거나 action 결과를 표시할 수 있다.

## refactor(play): connection hook 전환 경계 준비
기존 implementation을 아직 제거하지 않은 상태에서 play-page 경계에 `useGameConnection`과 shared input helper를 도입한다. 새 transition-based input path를 연결하면서 동일 단계에서 old loop를 바꾸지 않도록 추가 direction reference를 legacy polling direction과 의도적으로 분리한다.

명시적인 migration seam을 만들어 이후 commit이 automatic entry, rendered state, command, input ownership을 한 concern씩 옮길 수 있게 한다. 두 path를 잠시 함께 보이게 해 transfer를 검토 가능하게 유지하면서 transport, state machine, UI behavior를 한 번에 크게 교체하지 않는다.

## refactor(play): 자동 경기 진입을 connection hook으로 전환
URL-driven queue, AI, tournament entry를 play page의 legacy connection function 대신 `useGameConnection`으로 전달한다. queue mode는 하나의 validated branch를 공유하고 tournament match ID는 hook 전용 command를 사용한다.

effect는 one-shot guard를 유지하면서 connection callback을 dependency로 선언해 이미 완료된 시도를 반복하지 않고 React closure rule을 따른다. page의 나머지 socket state를 migration하기 전에 hook을 entry point로 확립한다.

## refactor(play): 경기 상태와 명령을 connection hook에 연결
`useGameConnection`을 rendered room, snapshot, lifecycle notice, opponent, chat history, command availability의 source로 사용하면서 page migration을 시작한다. queue entry, readiness, chat submit, pause/resume은 hook method를 통하고, page의 작은 adapter는 form/input presentation state reset만 담당한다.

old socket implementation을 삭제하기 전에 UI가 새 state-machine contract를 단계적으로 채택할 수 있다. raw snapshot phase 대신 이름 있는 connection state에서 button validity를 파생해 matching, ready, playing, paused transition 중 어떤 command가 유효한지 명확히 한다.

## feat(play): keyboard와 touch paddle 입력 연결
현재 key state를 계속 재전송하지 않고 keyboard/mobile pointer control을 transition-based paddle command에 연결한다. local direction reference로 duplicate command를 억제하고 room change, key release, window blur, editable-focus change, hidden document, pointer cancellation, pointer exit에서 모두 paddle을 명시적으로 neutral로 되돌린다.

release event를 놓치면 authoritative server가 stale movement direction을 계속 적용할 수 있으므로 이 reset path가 중요하다. editable target은 무시해 gameplay input이 form을 방해하지 않게 하고 playing phase 밖에서는 touch control을 disabled 처리해 UI를 protocol의 valid command window와 맞춘다.

## refactor(play): legacy paddle input loop 제거
paddle input이 새 connection client를 통하게 된 뒤 component-local keyboard state와 50ms command loop를 제거한다. 삭제된 path는 direction과 input sequence number를 별도로 추적한 뒤 timer에서 직접 `game.input` message를 serialize했다.

input emission을 connection abstraction 뒤에 두어 sequence ownership을 socket/room을 소유하는 동일 object에 맡기고 page는 direction transition만 보고한다. parallel timer, duplicate sequence counter, room/connection replacement 후 stale command가 살아남는 문제를 피한다.

## refactor(play): legacy WebSocket lifecycle 제거
전용 connection layer가 동일한 작업을 수행할 수 있게 된 뒤 play component의 inline WebSocket lifecycle을 제거한다. ticket acquisition, socket replacement, protocol-versioned connection 생성, event parsing, snapshot-order check, finish handling, chat accumulation, close-state transition이 더 이상 page에 존재하지 않는다.

결정적인 ownership transfer다. UI는 renderer와 transport controller를 동시에 수행하지 않는다. lifecycle behavior를 하나의 재사용 connection component에 두어 cancellation, parsing, sequencing, reconnect semantics를 독립적으로 test할 수 있고 page rerender나 UI 변경이 socket invariant를 바꾸지 않게 한다.

## refactor(play): legacy 경기 명령 제거
ready, match chat, pause/resume, socket shutdown command가 connection hook을 통해 제공된 뒤 play page의 직접 implementation을 삭제한다. 새 abstraction 옆에 두 번째 path를 남기지 않고 raw protocol encoding과 WebSocket cleanup을 component에서 제거한다.

command를 중앙화해 hook의 현재 room/lifecycle state를 사용하게 하고 connection replacement/teardown도 하나의 ownership rule을 따르게 한다. page는 ticket, socket, event handler, wire message 관리 방식을 결정하지 않고 domain-level action을 호출할 수 있다.

## refactor(play): legacy socket 상태 제거
`useGameConnection`이 authoritative owner가 된 뒤 play page의 duplicate WebSocket 및 game-state field를 제거한다. ticket request, socket reference, snapshot/room state, notice, message, protocol sequence counter가 더 이상 hook과 병렬로 존재하지 않는다.

shadow state를 제거해 두 lifecycle implementation이 active room, accepted snapshot, outstanding connection attempt에 서로 다른 판단을 내리지 못하게 한다. page에는 chat input과 keyboard-direction deduplication 같은 local presentation state만 남겨 나머지 call site를 단순화하기 전에 connection ownership을 하나로 만든다.

## refactor(play): connection hook 전환 마무리
play screen을 `useGameConnection` 뒤로 완전히 이동해 page가 hook 주변의 adapter alias를 유지하지 않고 하나의 state object와 안정적인 connection command 집합을 사용하도록 한다. queue/tournament autostart, direction change, chat, readiness, pause/resume이 모두 동일한 경계를 통과하고 room change에서는 local에서 deduplicate하던 input direction을 계속 reset한다.

page는 URL intent, form text, keyboard/mobile control, 계산된 button availability 같은 presentation-only concern만 담당하고 hook이 protocol과 lifecycle behavior를 소유한다. connection notice를 `aria-live` region으로 노출하고 visible control도 허용된 Arrow/W/S 및 touch input path에 맞춘다.

## test(web): game connection lifecycle 검증
browser game connection을 느슨하게 연결된 callback 집합이 아니라 명시적인 lifecycle로 고정한다. 더 새로운 connection이 미완료 시도를 대체할 때 one-time ticket request가 cancel되는지, inbound event가 shared protocol validation을 거치는지, outbound direction command의 input sequence가 엄격히 증가하는지 검증한다.

reducer coverage는 connecting, matching, ready, playing, paused, reconnecting, finished, failed 상태를 거치는 허용된 progression을 확인한다. duplicate/older snapshot이 newer state를 덮어쓰지 못하고 새 connection 시작 시 room별 sequence와 message data가 비워지는 것도 고정한다. keyboard test는 지원 control만 mapping하고 editable element를 무시해 gameplay command가 form interaction 밖으로 새지 않도록 최종 input boundary를 보호한다.

## feat(db): friendship canonical pair 제약 추가
방향성이 있던 friendship row를 unordered user pair당 하나의 canonical relationship으로 migration한다. data transition은 self-relation을 제거하고 반대 방향 pending pair를 accepted로 변환하며, 새 constraint를 적용하기 전에 accepted를 우선하고 그다음 오래된 row를 선택하는 방식으로 하나의 preferred row를 deterministic하게 남긴다.

directional unique key를 제거하고 `least`/`greatest` expression index로 교체해 A→B와 B→A를 동일한 persistent identity로 만든다. check constraint는 self-friendship을 막는다. constraint 생성 전에 기존 data를 정리해 compatible history를 보존하고 이후 atomic upsert를 database 경계에서 강제할 수 있게 한다.

## feat(db): tournament seed 제약 추가
seed uniqueness를 persistent tournament invariant로 확립한다. constraint를 추가하기 전에 기존 entry를 tournament별로 이전 seed, 생성 시각, 식별자 순서에 따라 deterministic하게 다시 번호를 부여해 participant를 버리지 않고 연속되고 충돌 없는 ordering을 만든다.

tournament와 seed에 대한 unique constraint로 보호 책임을 repository convention에서 database로 이동한다. 이후 concurrent/future write path가 application-level validation을 우회하거나 race가 발생해도 같은 bracket position을 할당할 수 없다.

## feat(db): PostgreSQL friendship 요청을 원자화
canonical unordered user pair에 대한 하나의 PostgreSQL upsert로 전체 friendship-request transition을 표현한다. self-request는 write 전에 거부하고, 같은 방향의 repeated request는 기존 relation을 유지하며, 반대 방향에서 들어온 pending request는 atomic하게 accepted가 되고 새 update timestamp를 받는다.

명시적 acceptance는 acting user가 recorded addressee인 row만 update하고 반환된 requester 식별자로 response를 구성한다. read-then-write race를 제거하고 unauthorized caller가 이후 broad list query를 통해 성공한 것처럼 보이는 acceptance를 관찰하지 못하게 한다.

## feat(db): PostgreSQL tournament 참가를 원자화
tournament row lock으로 serialize되는 하나의 transaction으로 tournament admission을 처리한다. lock 획득 후 기존 entry가 있으면 idempotent하게 반환하고, 없으면 transaction 안에서 현재 count와 next seed를 계산한 뒤 full tournament를 거부하고 정확히 하나의 새 participant를 insert한다.

insert된 player가 capacity를 채우면 같은 transaction에서 tournament를 running으로 바꾸고 transaction executor를 통해 semifinal bracket을 생성한다. capacity validation, seed allocation, state transition, bracket materialization을 하나의 lock 아래 두어 concurrent caller가 tournament를 초과 인원으로 채우거나 seed를 재사용하거나 bracket 없이 running 상태를 노출하지 못하게 한다.

## feat(db): memory friendship invariant 적용
in-memory repository에서 caller별 `FriendSummary` 하나를 저장하는 대신 두 user 식별자 사이의 relationship으로 friendship을 모델링한다. listing 시 요청 관점에서 opposite user를 계산하므로 양쪽 participant가 동일한 relationship을 올바른 counterpart와 함께 본다.

write path는 self-friendship을 거부하고 repeated request를 idempotent하게 처리하며 어느 방향의 request든 하나의 identity로 인식한다. reverse pending request는 duplicate 생성 대신 accepted로 승격한다. explicit acceptance는 addressee만 가능하고 original requester를 반환한다. test backend를 persistent storage가 요구하는 undirected uniqueness/ownership constraint와 맞춘다.

## feat(db): memory tournament 참가자 원본 검증
public entry projection을 만들기 전에 in-memory repository의 canonical user store를 기준으로 tournament entrant를 검증한다. 이전 path는 public lookup method를 호출해 existence check가 presentation mapping 및 이후 visibility policy와 섞일 수 있었다.

raw record를 먼저 읽어 membership eligibility가 repository identity에 의존하도록 하고, 그다음 다른 곳과 동일한 public-user mapper로 변환한다. capacity check와 idempotent re-entry는 그대로 유지하지만 write boundary가 consumer용 read API에 의존하지 않게 한다.

## test(db): friendship와 tournament 경쟁 상태 검증
두 repository 구현에서 repeated, reversed, concurrent operation 상황에도 friendship identity와 tournament capacity가 올바르게 유지되는지 검증한다. 자기 자신에게 보낸 friendship request는 거부하고, 같은 방향 반복 request는 동일 relation을 반환하며, 반대 방향 pending request는 해당 relation을 accept한다. 두 user 모두 하나의 shared friendship을 관찰해야 한다. PostgreSQL case는 row가 하나만 존재하는지와 distinct-user constraint가 invalid direct write를 거부하는지도 추가로 확인한다.

tournament capacity 검증에서는 10명의 caller가 네 번째 slot을 두고 race한다. 정확히 한 명만 성공하고 9명은 full-capacity error를 받아야 하며, 최종 entry는 4명의 unique user를 포함하고 semifinal slot 두 개는 한 번만 생성되어야 한다. 성공한 user가 다시 join하면 idempotent해야 한다. memory와 PostgreSQL에서 같은 scenario를 실행해 behavioral parity를 보호하고 integration test에서는 새 invariant migration이 적용되었음을 확인한다.

## feat(game): fixed-step scheduler 추가
elapsed wall-clock time과 simulation update를 분리하는 fixed-step accumulator를 도입한다. monotonic clock 기준 elapsed time을 누적해 50ms 단위의 정수 step으로 변환하고, 한 loop당 최대 5 tick과 250ms lag ceiling으로 제한한다. event-loop stall이 길어도 무제한 catch-up 작업이 연쇄적으로 발생하지 않으면서 안정적인 simulation increment를 유지한다.

scheduler는 accumulator를 idempotent interval lifecycle과 injectable clock으로 감싼다. loop가 step 사이에 running timer 상태를 검사하므로 callback 내부 transition에서 scheduler를 stop하면 같은 batch의 이후 작업도 실행되지 않는다. constructor validation으로 invalid timing policy는 runtime 전에 실패시킨다.

## test(game): fixed-step 보정 범위 검증
elapsed monotonic time이 fixed 50ms simulation work로 변환되는 방식을 검증한다. accumulator는 sub-step remainder를 보존하고 정확한 boundary에서 step을 만들어야 하며, 긴 stall은 5 tick과 250ms로 cap하고 clock이 뒤로 가면 negative lag를 만들지 않고 무시해야 한다.

scheduler test는 clock을 inject해 한 번의 delayed loop가 bounded catch-up을 수행하는지 확인하고 `stop` 이후에는 모든 later step이 실행되지 않음을 증명한다. game simulation과 독립적으로 determinism과 overload containment를 고정한다.

## feat(game): WebSocket heartbeat 추가
realtime connection용 명시적인 heartbeat lifecycle을 도입한다. heartbeat 시작 시 45초 liveness deadline을 설정하고 15초마다 transport ping을 보낸다. pong acknowledgement는 deadline을 새로 설정하며 ping exception 또는 deadline 만료 시 target을 terminate하기 전에 모든 timer를 중지한다.

start, acknowledgement, stop, termination을 idempotent하게 만들어 close race가 발생해도 socket lifecycle 종료 후 interval이나 timeout이 남지 않게 한다. 이 policy를 GameHub에서 분리해 connection liveness를 deterministic하고 독립적으로 test할 수 있게 한다.

## test(game): heartbeat timeout 검증
deterministic clock으로 connection heartbeat의 timing contract를 고정한다. acknowledgement가 없는 connection은 15초마다 ping을 받고 45초에 terminate되어야 하며 terminal boundary에서 추가 ping을 보내지 않는다.

pong acknowledgement는 단순히 한 interval을 healthy로 표시하는 것이 아니라 liveness deadline 자체를 이동시킨다. connection은 이후 44,999ms 동안 살아 있고 reset된 deadline에서 terminate된다. periodic probing과 authoritative last-seen timeout의 차이를 보호한다.

## feat(game): 입력 순서와 rate limit 보호
sequence ordering과 per-user token-bucket throttling을 결합한 input gate를 도입한다. sequence state는 user/room으로 key를 잡아 duplicate/older command가 새로운 paddle intent를 덮어쓰지 못하게 하고, rate capacity는 user만 기준으로 하므로 room을 추가로 열어도 허용 input rate가 늘지 않는다.

기본 budget은 짧게 8개 command burst를 허용하고 초당 30개씩 보충한다. bucket을 소비하기 전에 ordering을 검사하고 invalid configuration은 construction 단계에서 거부한다. user lifecycle 종료 시 `releaseUser`가 bucket과 sequence state를 모두 제거한다. `accepted`, `stale`, `rate_limited`를 반환해 transport layer가 harmless reordering과 observable abuse limit를 구분할 수 있게 한다.

## test(game): input gate 제한 검증
realtime input admission의 두 측면, 즉 room별 단조 증가 command와 user별 token-bucket budget을 검증한다. default 8-command burst와 초당 30개의 sustained refill을 고정하고 100ms interval에서 관찰되는 fractional replenishment도 다룬다.

duplicate/older sequence는 capacity를 소비하기 전에 거부되어야 하므로 retransmitted traffic이 player의 valid budget을 소진할 수 없다. rate limit은 해당 user의 room 전체에서 공유하지만 다른 user와는 분리해 room switching으로 throughput을 늘리지 못하게 하면서 independent fairness를 유지한다.

## feat(game): latest snapshot buffer 추가
game snapshot용 latest-value outbound buffer를 도입한다. buffer는 in-flight send 하나를 허용하고 pending payload는 최대 하나만 저장하며 더 새로운 snapshot이 오면 해당 payload로 교체한다. application-level memory를 제한하고 recovering client가 이미 obsolete한 frame을 재생하지 않고 current state를 받도록 한다.

transport pressure에는 두 명시적 limit을 둔다. 256KiB를 넘으면 send를 pause하고 최대 5초 동안 50ms마다 retry하며, 1MiB에 도달하면 즉시 terminate한다. send error, synchronous transport failure, closed socket, explicit shutdown은 모두 idempotent cleanup으로 수렴해 retry timer나 pending state가 connection lifecycle 뒤에 남지 않게 한다.

## test(game): snapshot replacement와 congestion 검증
제어된 socket state와 time을 사용해 snapshot buffer의 loss/termination rule을 검증한다. send가 in-flight인 동안 여러 enqueue가 발생해도 가장 새로운 pending snapshot 하나만 유지해야 한다. transport가 soft threshold를 초과한 동안에도 replacement는 계속하고 pressure가 해소되면 latest value를 보내야 한다.

failure boundary 두 개도 고정한다. queued transport data가 1MiB면 즉시 terminate하고, 지속되는 soft congestion은 5초 미만까지 허용하되 deadline에서 terminate한다. obsolete realtime frame을 버리는 것과 authoritative state를 더 이상 따라갈 수 없는 client를 disconnect하는 것 사이의 의도한 절충을 보호한다.

## feat(game): fixed-step scheduler를 GameHub에 연결
room별 direct interval을 simulation time의 owner인 fixed-step scheduler로 교체한다. room은 public phase가 아직 waiting이고 양쪽이 모두 ready일 때만 시작하고, 동일 helper를 통해 resume하며, paused 또는 finalized 상태에서는 scheduler를 중지한다.

scheduler는 shared 50ms timestep으로 진행하지만 한 loop의 accumulated delay를 5 tick/250ms로 cap한다. 일반적인 event-loop jitter에서도 deterministic simulation step을 유지하면서 overloaded process가 unbounded catch-up burst를 시도하지 않게 한다. asynchronous match finalization은 synchronous tick에서 분리해 persistence가 timing loop를 막지 않도록 한다.

## feat(game): heartbeat와 input gate를 GameHub에 연결
connection heartbeat와 input gate를 GameHub client lifecycle에 연결한다. accepted socket마다 heartbeat와 snapshot buffer를 소유하고 WebSocket pong frame을 acknowledge하며, idempotent disconnect cleanup에서 두 resource를 모두 해제한다. input-gate state는 해당 user의 active connection이 하나도 남지 않은 뒤에만 해제한다.

per-client sequence bookkeeping을 user-and-room keyed gate로 교체해 stale input을 거부하고 accepted input burst를 제한한다. stale packet은 새 state가 없으므로 조용히 무시하고 capacity violation은 안정적인 `rate_limited` protocol error를 반환한다. liveness, ordering, abuse protection을 optional helper가 아니라 authoritative hub의 속성으로 만든다.

## feat(game): latest snapshot buffer를 GameHub에 연결
high-frequency game snapshot은 각 client의 latest-value buffer를 통해 보내고 control/lifecycle event는 일반 send path를 유지한다. socket이 snapshot을 충분히 빠르게 drain하지 못하면 unbounded realtime backlog를 쌓는 대신 obsolete intermediate state를 가장 새로운 값으로 교체할 수 있다.

non-snapshot event는 delivery priority를 유지하지만 hard buffered-byte limit을 강제하고 send failure 시 connection을 terminate한다. lossy state replication과 non-lossy protocol message를 구분한다. 과거 모든 frame보다 current authoritative state가 중요하지만 queue, error, completion event는 조용히 coalesce되어서는 안 된다.

## test(game): GameHub runtime 제한 검증
gate abstraction 내부만이 아니라 완전한 realtime 경계에서 input throttling을 검증한다. fake socket이 AI room에 참가하고 player를 ready로 만든 뒤 encoded client-event path를 통해 sequenced input burst를 보낸다. allowance가 소진된 뒤 hub는 protocol-valid `rate_limited` error를 정확히 하나 반환해야 한다.

parsing, room membership, `InputGate`, server-event encoding 사이의 observable contract를 고정한다. 이후 GameHub 변경이 limiter를 조용히 우회하거나 rejection을 불안정한 error shape로 변환하지 못하게 한다.

## build(web): React Query 의존성 추가
TanStack React Query를 web application의 server-state dependency로 추가하고 resolved query-core 및 React peer graph를 workspace lockfile에 기록한다. 이후 cache migration에서 사용할 library boundary를 확립해 remote projection, freshness, retry, invalidation, mutation state를 component-local presentation state와 독립적으로 조정할 수 있게 한다.

## refactor(db): repository user projection 타입 정렬
in-memory repository가 보관하는 user에 별도 memory-only alias 대신 canonical `UserProjectionRow`를 사용한다. seeded NPC와 development user도 public-user mapper가 실제로 허용하는 정확한 field subset에 맞춰 생성한다.

in-memory record가 creation/ban timestamp 같은 generated database column까지 가진다고 가장하지 않으면서 production/test backend를 row-projection 경계에서 통일한다. 두 구현이 mapping code를 공유할 수 있고 type system은 projection과 complete persisted row를 계속 구분한다.

## refactor(db): memory match record 계약 정렬
in-memory match record가 write command를 상속하던 구조를 명시적인 stored shape로 교체한다. persisted match state를 구성하는 field만 copy하고 completion timestamp는 database-style `ended_at` 대신 public summary가 사용하는 동일한 `endedAt` 표현을 사용한다.

record를 field별로 구성해 이후 command-only property가 storage로 새어 들어오는 것을 막고 mapper의 불필요한 parse-and-reserialize 단계도 제거한다. in-memory backend가 repository contract를 직접 모델링하면서 기존 scoring, rating, summary behavior는 유지한다.

## refactor(db): canonical row schema 타입 정렬
database enum과 row projection의 TypeScript 표현을 중앙화한다. friendship, match, tournament, chat, administration column이 inline import와 string union을 반복하지 않고 이름 있는 shared 또는 database-local alias를 참조하게 해 table definition, selected row, mapper가 하나의 vocabulary를 사용하도록 한다.

`UserProjectionRow`를 public user 구성에 정확히 필요한 subset으로 정의하고 selectable row alias를 canonical table map과 함께 정리한다. physical schema는 바뀌지 않지만 type boundary가 complete persisted row와 joined projection을 구분하고 이후 mapper contract가 우연한 column overlap에 덜 의존하게 한다.

## refactor(db): row mapper record 타입 정렬
tournament-match record mapper에 canonical database row type에서 round/status를 파생하는 명시적인 view type을 부여한다. inferred object shape에 의존하지 않고 repository-facing record contract를 독립적으로 검사할 수 있게 한다.

non-null tournament score는 shared summary로 노출하기 전에 `Number`로 정규화한다. 이 schema에서 PostgreSQL이 보통 해당 column을 number로 반환하더라도 mapper 경계에서 변환해 driver별 numeric representation으로부터 API contract를 보호하고, unfinished match의 `null`은 그대로 보존한다.

## refactor(db): seed profile 경계를 canonical 형태로 정렬
seed-profile declaration과 NPC upsert를 repository의 canonical multi-line 형식으로 확장한다. development/demo profile, seeded NPC identity, iteration order, conflict-update behavior는 변경하지 않는다. 기존 seeding 경계를 가독성 목적으로만 정규화한 커밋이다.

## refactor(db): dashboard와 friendship 조회 경계 정렬
recent-match 조회의 optional SQL fragment를 두 개의 명시적인 query shape로 교체한다. 하나는 특정 participant로 scope되고 다른 하나는 global이다. 둘 다 동일한 join, ordering, limit, row mapping을 유지하지만 filter boundary가 empty-or-`where` fragment interpolation이 아니라 query 자체에 드러난다.

dashboard projection과 friendship join은 behavior 변경 없이 formatting만 정리한다. scoped/unscoped read를 더 쉽게 검사하고 type-check할 수 있도록 하는 query-structure refactor가 주된 목적이다.

## refactor(db): PostgreSQL match 확정 core 정렬
core PostgreSQL match-finalization statement를 재구성해 idempotency key, existing-match readback, participant row lock, rating update, rating-history value를 각각 독립적으로 검토하기 쉽게 한다. transaction, conflict behavior, lock scope, rating constant, floor, persisted delta는 변경하지 않는다.

## refactor(db): tournament match 확정 연결 정렬
transactional tournament-match finalization SQL을 재구성해 row lock, idempotency predicate, result linkage, semifinal winner selection, final insertion, tournament completion update를 더 쉽게 검토할 수 있게 한다. statement, predicate, ordering, conflict handling, transaction scope는 변경하지 않는다.

## refactor(db): PostgreSQL chat과 tournament CRUD 정렬
PostgreSQL chat/tournament CRUD path를 재구성해 join, predicate, returned column, state update, result lookup이 각각 별도 단계로 보이도록 한다. tournament 참가 transaction boundary, 허용되는 start state, semifinal-to-final progression, tournament completion behavior는 그대로 유지한다.

load한 tournament collection에 lookup 전에 이름을 붙여 post-write readback도 더 쉽게 확인할 수 있지만, 이 커밋은 새로운 persistence rule을 추가하지 않는다.

## refactor(db): PostgreSQL tournament helper와 admin 경계 정렬
row mapper를 호출하기 전에 left player, right player, winner를 resolve하는 PostgreSQL tournament-match assembly helper를 추출한다. 모든 caller가 하나의 relation-loading path를 사용하고 tournament aggregate mapping도 같은 contract를 재사용할 수 있게 준비한다.

administration method는 public repository operation으로 묶고 SQL은 가독성을 위해 확장한다. semifinal lookup과 idempotent final insertion의 기존 behavior는 유지한다. persistence semantics를 변경하지 않고 public repository command와 private tournament relation helper 사이의 경계를 명확히 하는 구조적 변경이다.

## refactor(db): tournament relation mapper 계약 정렬
tournament mapping을 row와 entry, match summary, winner를 포함하는 명시적인 related-data object의 조립으로 재정의한다. `PostgresRepository`는 partial tournament를 mapping한 뒤 winner를 mutate하지 않고 relation을 먼저 resolve한 다음 완전한 aggregate를 하나의 mapper에 전달한다.

creator projection은 전체 tournament row를 user mapper에 spread하지 않고 이름 있는 joined column에서 구성해 우발적인 schema-field overlap이 public user에 영향을 주지 않게 한다. match-record output에 명시적인 type을 부여하고 match summary는 기존 repository relation loader를 사용한다. bracket creation은 database 또는 transaction executor를 모두 받을 수 있다. relation ownership과 transaction participation을 mapping 경계에서 명확히 드러낸다.

## refactor(db): memory repository 조회 경계 정렬
in-memory repository의 NPC, leaderboard, dashboard query code를 더 명확한 multi-line pipeline과 object construction으로 재구성한다. ordering, filter, projection, calculated value는 변경하지 않으며 독립적인 runtime behavior 변경은 없다.

## refactor(db): memory match completion과 admin 경계 정렬
in-memory repository에 tournament match와 owning tournament를 함께 반환하는 helper 하나를 만들고 completion에서 이 paired result를 사용한다. 하나의 located aggregate를 통해 match status, room/persisted match reference, score, winner, final creation, tournament completion을 갱신해 반복 search와 non-null assertion을 피한다.

administration method도 명시적인 단계로 확장한다. actor는 한 번만 resolve하고 updated target도 한 번만 mapping하며, persistent repository가 반환하는 것과 동일한 domain shape로 audit action을 구성한다. 간결한 in-memory shortcut이 두 번째 contract가 되지 않도록 test backend를 production boundary와 behavior상 맞춘다.

## refactor(db): memory tournament 확정 경계 정렬
tournament aggregate와 해당 match를 함께 담은 하나의 lookup result를 중심으로 in-memory tournament-finalization path를 통합한다. validation은 동일 object를 사용해 missing/already-finalized match를 거부하고, match/rating/bracket state 변경 전에 declared winner와 loser가 실제 participant인지 확인한다.

validation에 성공하면 located match를 update하고 semifinal이면 final을 materialize하거나 final이면 winner와 함께 tournament를 닫는다. 하나의 lookup boundary를 재사용해 validation과 mutation이 동일 record에 붙어 있게 하고 database-backed finalization path의 atomic 의도를 반영한다.

## refactor(db): memory chat과 tournament 진입 경계 정렬
in-memory repository의 chat/tournament method를 database implementation과 동일한 typed domain boundary에 맞춘다. 생성되는 chat message와 tournament에 명시적인 shared type을 부여해 local literal assertion을 제거하고 complete returned shape 전체에 compiler check가 적용되도록 한다.

tournament entry는 계속 idempotent하다. 아직 join하지 않은 user에게만 capacity를 강제하고, 이후 player count, running state, bracket generation은 entry 목록에서 파생한다. match lookup/start operation도 각자 tournament state를 flatten하지 않고 하나의 repository helper를 재사용해 read와 mutation path가 서로 다른 record를 식별할 위험을 줄인다.

## test(db): database row mapping contract 검증
relational row를 shared API domain shape로 변환하는 contract를 고정한다. user, viewer 관점에 따른 match summary, friendship, chat sender, tournament record/aggregate, administration action을 검증하며 joined user와 nullable relation도 포함한다.

fixture는 의도적으로 database column name과 `Date` instance를 사용하고 assertion은 camelCase public field와 ISO timestamp를 요구한다. schema representation이 repository 경계를 넘어 API contract로 새는 것을 막고, 잘못된 opponent/result perspective/related user/nullability를 선택하는 미묘한 mapping regression을 잡아낸다.

## feat(game): 게임 방 상태를 RoomSession에 연결
public snapshot phase를 직접 mutate하지 않고 `RoomSession`을 room lifecycle transition의 authority로 만든다. 각 room이 session을 생성하고 필요한 경우 AI side를 ready로 표시한다. state machine이 해당 transition을 허용할 때만 simulation을 start/pause/resume하며 snapshot은 accepted state를 mirror한다.

이후 recovery 작업을 위해 room에 명시적인 reconnect timer와 disconnected-side storage도 추가한다. transition validity를 transport/rendering snapshot과 분리해 후속 disconnect handling에서 room이 play, pause, reconnect, finish할 수 있는지 한 곳에서 결정하도록 한다.

## feat(game): 사용자별 active connection 교체
user당 하나의 authoritative realtime connection만 허용한다. user-indexed client map으로 현재 socket을 식별하고 이미 다른 connection으로 대체된 client의 message는 receive 단계에서 버린다. 두 tab이나 reconnect race가 같은 queue, tournament, input, room identity를 각각 독립적으로 조작하는 것을 막는다.

replacement 설치 시 기존 heartbeat와 snapshot buffer를 중지하고 transient membership을 제거하며, 점유 중인 room side가 있으면 새 client로 이전한다. 새 client에 match context와 최신 snapshot을 보내고 old socket은 명시적인 replacement code로 닫는다. transport ownership이 바뀌는 동안 room은 유지되므로 socket replacement를 disconnect 후 새 match를 만드는 과정이 아니라 atomic handoff로 처리한다.

## feat(game): 예약된 room connection 복구
새로 authenticated된 socket을 동일 user에게 예약된 room side에 reconnect한다. hub는 명시적인 disconnected-user reservation만 찾고 deadline validity는 `MatchSession.reconnect`에 위임한다. 그다음 stale side client를 교체하고 양쪽 room reference를 복원한 뒤 original match context와 current snapshot을 보낸다.

다른 participant가 아직 missing이면 room은 `reconnecting`을 유지하고 돌아온 player에게만 state를 전달한다. session을 resume할 수 있게 되면 reconnect timer를 해제하고 snapshot phase를 session state와 동기화하며 playing room일 때만 simulation을 다시 시작한 뒤 restored state를 broadcast한다. reconnect를 새 matchmaking으로 취급하지 않고 transport replacement가 authoritative match lifecycle을 따르게 한다.

## feat(game): reconnect 예약 만료와 room 정리
즉시 disconnect forfeit을 적용하지 않고 bounded room reservation으로 교체한다. participant가 socket을 잃으면 hub가 해당 side에 user를 기록하고 simulation을 pause하며 disconnected paddle의 movement를 0으로 만든다. session reconnect deadline을 설정하고 paused snapshot을 broadcast한다. recovery 대기 중에도 client는 room identity에 연결된 상태이므로 다른 queue에 들어갈 수 없다.

deadline 만료 시 terminal outcome은 session state가 결정한다. 남은 participant가 있으면 forfeit win으로 처리하고 eligible winner가 없는 room은 persistence 없이 abandon한다. 두 path 모두 timer, reservation, client room reference, scheduler activity를 정리하며 normal finalization도 동일한 cleanup을 수행한다. disconnect recovery를 ad hoc delayed side effect가 아니라 하나의 deadline과 cleanup boundary를 갖는 lifecycle state로 만든다.

## test(game): reconnect 복구 동작 검증
realtime recovery contract에 deterministic integration coverage를 추가한다. 같은 user의 active socket을 교체하면 old connection을 닫고 new connection을 existing room에 연결해야 한다. current match assignment와 snapshot을 보내되 forfeit deadline은 시작하면 안 되며, displaced socket의 message는 새 room을 만들 수 없어야 한다.

실제로 disconnect된 player는 15초 동안 동일 room/side를 유지하고 deadline 전에 최신 snapshot으로 reconnect할 수 있다. 반대로 deadline을 넘기면 idempotent key를 가진 forfeit을 하나만 finalize하고 남은 player에게 알리며 시간이 더 지나도 result를 두 번 persistence하지 않는다. fake timer와 repository spy로 temporal boundary와 durable side effect를 모두 검증한다.

## perf(game): scheduler benchmark 실행 경계 추가
room-step work와 50ms cadence는 동일하게 유지하면서 scheduler topology만 분리해 측정하는 standalone benchmark를 추가한다. room별 interval 하나와 전체 shared interval 하나를 1, 20, 50, 100 room에서 비교하고 초기 warm-up 구간은 제외하며 p95/p99 scheduling lag를 측정한다.

이 script는 end-to-end game load test를 대체하지 않는다. timer 수 자체가 event-loop responsiveness에 악영향을 주는지만 확인하는 더 좁은 목적이다. environment로 repeat 횟수와 duration을 조정할 수 있어 production room timing ownership을 바꾸기 전에 실험을 재실행하기 쉽다.

## perf(game): scheduler benchmark 측정 결과 출력
scheduler load script를 구조 없는 timing experiment가 아니라 재현 가능한 comparison report로 만든다. 설정된 room count와 repeat마다 per-room/shared-timer strategy를 모두 측정하고 각 metric을 median으로 aggregate하며 sample count와 p95/p99 event-loop lag를 출력한다.

JSON output에는 runtime, platform, CPU, memory, timing setting과 구체적인 50-room decision rule을 기록한다. shared strategy의 p95 lag가 per-room baseline보다 5% 이상 나쁘지 않을 때 shared 방식을 선택한다. condition과 threshold를 모두 기록해 이후 scheduler 선택이 설명되지 않은 local observation이 아니라 audit 가능한 결정이 되게 한다.

## refactor(game): shared room scheduler 추가
하나의 fixed-step clock으로 모든 active room을 구동할 수 있는 scheduler abstraction을 도입한다. room 식별자를 step callback에 mapping하고 첫 room이 등록되면 underlying timer를 시작하며 마지막 room을 제거하면 중지한다. `stop`은 registry와 timing loop를 모두 비운다.

shared loop는 simulation의 50ms step과 bounded catch-up limit을 유지하고 iteration 전에 callback snapshot을 만든다. lifecycle transition 중 room이 스스로 register/unregister하더라도 현재 tick iteration과 분리되므로 한 room이 다른 room의 iteration을 손상시킬 수 없다.

## test(game): shared room scheduler 검증
deterministic time으로 scheduler의 central ownership guarantee를 검증한다. 등록된 여러 room은 하나의 fixed-step timer를 공유해야 하고 room 하나를 unregister해도 나머지는 계속 진행되어야 하며 마지막 room을 제거하면 timer가 완전히 중지되어야 한다.

두 번째 case에서는 room이 자신의 step callback 안에서 스스로 unregister하고, 같은 tick의 뒤쪽 room이 여전히 실행되는지 확인한다. collection mutation으로부터 iteration을 보호하고 한 room의 lifecycle transition이 관련 없는 match를 굶기지 않도록 한다.

## refactor(web): query key와 retry 정책 정의
개별 screen을 migration하기 전에 cache vocabulary를 정의한다. 안정적인 hierarchical key가 current user, lobby, dashboard, handle-scoped profile, ranking, friend, tournament, administration projection을 식별한다. mutation policy는 각 command 이후 정확히 어떤 projection이 stale해지는지 명시한다.

retry policy는 `401`을 terminal authentication result로 취급하고 다른 query failure에는 한 번의 retry를 허용한다. expired credential에 retry하지 않아 반복 unauthorized request를 막고 session cleanup이 즉시 동작하게 한다. exact invalidation을 사용해 관련 없는 data까지 refresh하는 broad prefix match를 피한다.

## refactor(web): session query와 cache invalidation 추가
각 server projection용 reusable query option을 정의한다. stable key, abort-aware API call, data 특성에 맞는 freshness interval을 포함한다. 정의를 중앙화해 동일 endpoint에 대해 consumer마다 미묘하게 다른 cache entry를 만들지 않고 query identity와 cancellation behavior를 일치시킨다.

session-expiration transition을 추가해 identity-scoped lobby, dashboard, friends, administration data를 제거하고 current-user 값을 `null`로 설정한다. public leaderboard, profile, tournament projection은 재사용 가능하게 유지한다. active fetch 제거는 observer가 안정적으로 정리되도록 다음 task에서 수행한다. 모든 browser state를 무차별적으로 지우지 않고 data sensitivity에 따라 cache ownership을 관리한다.

## refactor(web): React Query provider 연결
application root에 하나의 `QueryClient`를 설치하고 browser server state의 lifecycle owner로 만든다. provider는 client를 한 번만 생성하고 project-wide query retry 및 window-refocus policy를 적용하며 automatic mutation retry를 끈 뒤 모든 route에 노출한다.

API layer의 session-expiration event도 중앙화된 cache cleanup으로 변환한다. transport-level authentication failure를 React component와 분리하면서 모든 active query observer가 동일한 identity reset과 scoped cache removal을 보도록 한다.

## refactor(web): lobby와 login을 query cache로 전환
lobby와 login state를 shared query client로 이동해 HTTP load, WebSocket event, authentication mutation이 같은 server-data owner를 갱신하도록 한다. home screen은 `me`/`lobby` query에서 identity, player, chat, statistic을 파생하고, lobby chat event는 cached projection을 patch하며 presence change는 authoritative refresh를 위해 cache를 invalidate한다.

development login은 current-user cache를 seed하고 identity에 따라 달라지는 projection을 invalidate하는 mutation이 된다. 이전에 `LoginPanel`과 parent를 결합하던 callback과 duplicated local array를 제거하고, lobby state를 병렬 copy하지 않고 realtime update와 일반 query refresh가 공존하도록 한다.

## refactor(web): dashboard와 leaderboard를 query cache로 전환
dashboard와 leaderboard를 component-owned fetch effect에서 shared query cache로 이동한다. 각 screen은 이미 정의한 query option을 사용하고 query state에서 loading/failure presentation을 파생하며, 반환된 server projection을 local collection에 복사하지 않고 cached data로 취급한다.

navigation과 session-expiration logic이 이 view를 invalidate할 authoritative 장소를 하나만 갖게 하면서 local rendering concern은 유지한다. API contract나 presentation은 바꾸지 않고 나머지 application이 사용하는 cache와 달라질 수 있는 별도 request lifecycle만 제거하는 좁은 변경이다.

## refactor(web): profile 조회를 query cache로 전환
handle-scoped profile loading을 shared query cache로 이동하고 resolve된 route parameter를 직접 query identity로 사용한다. page는 promise, local handle state, 여러 result array를 조정하는 대신 user data와 recent match를 하나의 server projection으로 취급하고 cache에서 loading/error state를 파생한다.

friend request는 성공 후 friends projection을 invalidate하는 mutation으로 바뀌고 clipboard feedback은 local presentation state로 남는다. NPC profile 또는 pending request에서 action을 disabled 처리해 domain restriction과 duplicate submission 방지를 유지하되 UI notice 책임을 profile cache에 넘기지 않는다.

## refactor(web): tournament 조회와 mutation을 query cache로 전환
tournament/current-user read를 shared query로 이동하고 create/join command를 독립 mutation으로 표현한다. page는 one-shot fetch와 duplicated tournament collection을 소유하지 않고 cache state에서 loading, empty, error, ready 상태를 파생한다.

두 mutation 모두 성공하면 반환된 tournament를 선택하고 exact tournament projection을 invalidate한다. partial response를 수동 merge하지 않고 authoritative server list/bracket이 cache를 다시 채우도록 한다. pending guard로 duplicate create/join submission을 막으면서 local selection과 notice는 presentation concern으로 유지한다.

## refactor(web): admin 조회와 mutation을 query cache로 전환
administrator user와 audit action을 shared query cache로 옮기고 status change를 mutation으로 모델링한다. page는 one-off `Promise.all`과 duplicated local collection 대신 두 query result에서 loading, authorization failure, ready 상태를 파생한다.

status change 성공 후 exact invalidation으로 command가 영향을 준 user list와 audit log 두 server projection만 refresh하고 unrelated cache는 건드리지 않는다. mutation pending 중 control을 disabled해 stale row state를 기준으로 overlapping toggle이 race하는 것도 막는다.

## refactor(web): shell의 session 소비를 query cache로 통합
application shell이 private `getMe` effect와 local state를 유지하지 않고 browser 나머지와 동일한 cached session query를 사용하도록 한다. profile navigation은 login, logout, expiration, refetch가 만든 cache update에 하나의 authoritative query를 통해 반응한다.

request timing/error handling이 page data와 달라질 수 있던 두 번째 session owner를 제거하고 shared authentication state와 shell chrome이 atomic하게 바뀌도록 한다.

## test(web): query cache key·retry·invalidation 검증
browser cache를 명시적인 data-consistency contract로 고정한다. screen별 key namespace를 정하고 mutation이 영향받는 exact key만 invalidate하는지 검증하며 expired cookie session이 transient network failure처럼 retry되지 않도록 한다.

session expiration은 identity, lobby, dashboard, friends, administration data를 지우되 실제 public인 leaderboard, profile, tournament cache는 유지해야 한다. active unauthorized query도 cache cleanup 뒤 idle error state로 settle해야 하며, expiration path가 observer를 무한 fetching 상태로 남기지 않게 한다.

## feat(guest): signed guest session token 정의
transient guest용 self-contained signed session 표현을 도입한다. server가 opaque guest identifier, handle, display name을 생성하고 이 identity에 version, originating client address, 2시간 expiration을 넣은 뒤 Base64URL payload를 HMAC-SHA-256으로 인증한다.

verification은 constant time으로 signature를 비교하고 malformed, expired, wrong-version, non-active, non-user, non-guest, address-mismatched payload를 거부한다. 32-byte secret을 요구하고 identity 생성은 server-side에 유지해 demo session이 database와 관련해서는 stateless하게 동작하면서 cookie는 tamper-evident하고 scope가 좁게 유지되도록 한다.

## feat(guest): guest 요청 rate limit 추가
guest-session 생성에 client address별 sliding-window limit을 추가한다. identity를 만들기 전에 `GuestAccess`가 이전 1분 window 밖의 timestamp를 제거하고 남은 count가 configured threshold에 도달했으면 request를 거부한다. 허용된 경우 새 생성 시각을 기록한다.

typed guest-access error를 사용해 authentication logic을 약화시키지 않고 HTTP boundary에서 capacity rejection을 변환할 수 있게 한다. random identity 생성 전에 검사하므로 반복 anonymous request가 session 관련 work를 무제한 소비하지 못한다.

## feat(guest): guest WebSocket ticket 발급 추가
guest session용 database-free WebSocket admission token을 추가한다. `GuestAccess`는 기존 high-entropy raw ticket 형식을 생성하고 hash만 30초 동안 저장한다. guest당 outstanding ticket은 하나만 허용하며 새 ticket 발급 시 이전 entry를 교체하고, bounded in-process store가 가득 차면 발급을 거부한다.

consumption은 identity를 반환하기 전에 ticket과 reverse guest index를 제거하므로 이후 validation이 실패하더라도 replay는 성공할 수 없다. timer cleanup과 explicit pruning이 두 index를 함께 유지해 authentication handoff의 one-time, short-lived, capacity-bounded 속성을 보존한다.

## feat(guest): guest resource lease 수명주기 추가
resource limit이 ticket 발급 시점이 아니라 실제 socket lifetime을 따르도록 live guest connection에 명시적인 lease를 추가한다. `GuestAccess`는 IP별 cap과 process 전체 cap을 모두 강제하면서 guest identity당 현재 connection record를 최대 하나만 유지한다.

reconnect는 해당 guest record를 새 lease identifier로 교체한다. old socket release는 그 identifier가 여전히 current인 경우에만 record를 삭제하므로 stale close event가 replacement connection의 slot을 해제하지 못한다. acquisition, replacement, cleanup을 하나의 atomic ownership protocol로 만드는 lease pattern이다.

## feat(guest): guest runtime 환경 경계 구성
runtime configuration contract에 application mode와 명시적인 proxy-trust switch를 추가하고 browser build에도 같은 public mode를 노출한다. demo/production startup은 development fallback을 허용하지 않고 최소 32 UTF-8 byte의 configured session secret을 요구한다.

deployment 시점에 두 security assumption을 명시한다. signed guest identity는 충분히 강한 key를 사용해야 하고, forwarded client address는 operator가 proxy를 trusted로 선언한 경우에만 abuse limit에 영향을 준다. example environment에는 함께 맞춰야 하는 전체 API/web configuration surface를 문서화한다.

## feat(shared): guest HTTP 응답 계약 추가
guest-login response용 shared runtime contract를 추가한다. payload는 일반 session-user projection, 명시적인 `guest: true` discriminator, signed guest cookie가 사용하는 고정 2시간 lifetime을 포함해야 한다.

schema를 shared package에 두어 API는 emit하는 값을 검증하고 browser는 수신 값을 검증할 수 있다. expiry를 literal로 고정해 어느 쪽도 authentication policy와 다른 duration을 조용히 표시할 수 없게 한다.

## feat(api): guest access runtime 구성
guest access를 API application의 명시적인 runtime dependency로 만든다. `buildApp`은 `GuestAccess` instance, signing secret, proxy-trust policy를 받을 수 있고 demo mode에서만 guest service를 생성한다. trust decision을 Fastify에 전달해 `request.ip`의 authority를 정의한다.

current-user resolution은 guest cookie를 먼저 authentication하고, guest-only demo mode에서는 guest authentication이 실패해도 registered database session으로 fallback하지 않는다. credential domain이 우발적으로 섞이는 것을 막고 in-memory guest implementation을 deterministic test에 inject할 수 있게 한다.

## feat(guest): guest session과 WebSocket 인증 연결
database user/session을 만들지 않고 transient guest identity를 HTTP와 WebSocket authentication에 통합한다. demo mode는 `POST /auth/guest`를 노출하고 in-memory guest service에서 HttpOnly, Secure, SameSite=Lax 2시간 cookie를 발급한다. logout과 ticket issuance에는 guest-aware current-user resolution을 사용한다.

WebSocket upgrade는 registered ticket을 보기 전에 in-memory one-time store에서 guest ticket을 consume하며 demo mode에서는 database로 fallback하지 않는다. guest upgrade 성공 시 IP/process cap이 적용되는 connection lease도 반드시 acquire하고 socket close에서 release한다. signed cookie → short-lived ticket → live connection으로 이어지는 일관된 trust chain을 유지하면서 guest credential, capacity accounting, cleanup은 persistent storage 밖에 둔다.

## feat(guest): guest 조회 범위와 lobby 격리
guest/demo traffic의 read-side isolation rule을 정의한다. `/me`는 guest-aware authentication을 허용하지만 public demo request로 user, ranking, profile, tournament를 열거할 수 없고 lobby도 persisted match history나 chat을 반환하지 않는다. 해당 branch는 registered data를 조회한 뒤 filter하지 않고 repository call 자체를 하지 않는다.

write 가능한 lobby chat과 registered dashboard access는 유효한 guest cookie가 있어도 registered identity를 요구한다. guest는 play에 필요한 transient identity와 live service statistic만 받고 durable social/history/ranking data는 guest boundary 밖에 두는 least-privilege projection을 만든다.

## feat(guest): 등록 사용자 전용 route 접근 정책 적용
authentication이 guest까지 일반화된 이후 HTTP route에 registered-account capability 경계를 적용한다. profile mutation/read, friendship operation, tournament create/join은 repository-backed state에 접근하기 전에 `requireRegistered`를 호출한다. valid guest cookie를 persistent account feature 사용 권한으로 오해하지 않는다.

demo mode에서는 administrative route를 아예 등록하지 않아 privileged endpoint가 있다고 public runtime에 광고하지 않고 없는 feature와 동일한 not-found surface를 제공한다. “authenticated”와 “registered”를 구분해 authorization을 명시적으로 만들고 transient identity가 durable domain state에 들어가지 못하게 한다.

## feat(game): GameHub guest identity와 기능 차단 연결
realtime hub identity type에 transient guest를 포함하면서 message dispatch 단계에서 축소된 capability set을 강제한다. guest chat/tournament command는 repository-backed domain handler가 실행되기 전에 즉시 protocol error로 거부한다.

guest는 registered online-player projection에서도 제외한다. 명시적인 `isGuest` type guard를 사용해 handle이나 missing database row를 추론하지 않고 session identity 자체에 이 결정을 연결한다. playable presence와 registered social data의 경계를 명확히 유지한다.

## feat(game): guest matchmaking과 room을 격리
session kind별로 matchmaking을 분리해 transient guest가 registered user와 pair되지 않도록 한다. candidate selection은 guest status가 다른 queue entry를 건너뛰고, 생성된 각 room은 이후 completion/persistence 판단을 위해 해당 status를 기록한다.

guest timeout fallback도 persisted NPC를 repository에서 조회하지 않고 in-memory practice opponent path를 사용한다. human opponent와 fallback resource 모두 registered account/database domain 밖에 남아 guest play가 자체적으로 완결되도록 한다.

## feat(game): guest 경기 결과 영속화 차단과 임시 보존
guest match completion을 registered persistence pipeline과 분리한다. guest room이 끝나면 `GameHub`는 match 식별자와 rating delta 없이 `persisted: false` result를 emit하고 `finalizeMatch`를 건너뛰며 user/history/ranking을 쓰지 않은 채 room을 제거한다.

completion 전후 socket loss를 견딜 수 있도록 result를 guest별 process memory에 2분 동안 보관하고 active room 없이 해당 guest가 reconnect하면 replay한다. entry를 교체할 때 이전 timer를 cancel하고 expiration check로 timer race를 방어한다. 짧은 recovery는 가능하지만 transient identity는 durable game state를 얻지 않는 균형을 유지한다.

## feat(api): guest resource lifecycle startup 연결
validated runtime environment를 application construction에 연결해 deployment configuration에 따라 guest behavior를 활성화하고 제한한다. API entry point는 security-sensitive value를 app이 독립적으로 추론하거나 default하지 않도록 선택된 app mode, session-signing secret, proxy-trust setting을 `buildApp`에 전달한다.

startup이 guest resource의 composition boundary가 된다. mode는 feature 존재 여부를 정하고 secret은 transient identity cookie를 보호하며 trusted-proxy configuration은 per-IP limit에 사용할 client address를 결정한다.

## test(auth): guest auth boundary 기대값 정렬
새로 강제되는 guest signing-key requirement를 만족하도록 authentication-boundary fixture를 갱신한다. demo/production mode에서 development login이 계속 unavailable한지 assertion하기 전에 명시적인 valid session secret을 제공한다.

관련 없는 startup configuration에서 먼저 실패하지 않고 route exposure 자체에 test가 집중하도록 한다.

## test(guest): 격리된 guest session 경계 검증
격리된 guest-session model에 end-to-end regression coverage를 확립한다. GameHub case는 guest끼리만 match되고 configured wait 후 in-memory AI로 fallback하며 chat/tournament command를 사용할 수 없고, match/rating change를 persistence하지 않으며 recovery용 result도 2분짜리 in-memory 값만 받는지 증명한다.

HTTP suite는 server-assigned identity, signed 2-hour cookie, per-IP creation limit, demo-only route availability, repository access 전에 registered feature 거부, database session 없는 one-time WebSocket admission을 검증한다. lower-level `GuestAccess` test는 HMAC tamper/expiry, hash된 30초 ticket, IP/process별 bounded connection lease를 다룬다. shared-schema test는 corresponding guest response와 WebSocket query contract를 고정한다. guest mode를 약화된 registered account가 아니라 별도의 transient trust/persistence boundary로 정의한다.

## test(auth): guest session secret 요구 검증
guest session을 signing하는 cryptographic key에 startup regression을 추가한다. demo runtime은 request를 받기 전에 32 byte 미만 session secret을 거부해야 하며 약한/default signing key로 조용히 실행해서는 안 된다.

application construction 단계에서 failure를 test해 process가 required minimum strength를 충족하는 명시적인 secret을 받아들인 뒤에만 guest cookie를 발급한다는 fail-closed deployment invariant를 유지한다.

## test(guest): 위조 client address 거부
guest mode의 network 및 data-exposure boundary를 검증한다. 명시적으로 trusted proxy 뒤에서는 guest creation limit의 key가 resolve된 forwarded client address여야 하고, untrusted deployment에서는 caller가 `X-Forwarded-For`만 바꿔 limit을 우회할 수 없어야 한다.

public demo lobby가 empty registered-user projection을 반환하고 leaderboard/profile/tournament read가 repository method를 호출하기 전에 실패하는지도 검증한다. rate limit은 trusted address 정보만 사용하고 transient guest가 private persisted data를 fetch한 뒤 filter하게 만들 수 없도록 boundary 양쪽을 고정한다.

## feat(web): 비회원 체험 정책 경계 추가
비회원 demo surface를 위한 하나의 browser-side policy module을 도입한다. 전체 navigation vocabulary를 정의하고 축소된 lobby/play menu를 파생하며, 사용할 수 없는 persisted-progress/chat feature와 registered-only route prefix를 기록하고 public demo build detection을 중앙화한다.

이 선택을 data와 pure policy function으로 표현해 이후 middleware/component가 공유하는 하나의 responsibility boundary를 만든다. 독립적인 environment check가 여러 곳에 흩어져 transient guest가 무엇을 보거나 할 수 있는지 서로 다른 주장을 하지 않도록 한다.

## feat(web): guest login API와 middleware 연결
guest session을 생성하는 web client 경계를 추가하고 demo deployment가 registered-account screen을 제공하지 못하게 한다. `guestLogin`은 `POST /auth/guest` response를 shared schema로 검증해 다른 API helper와 동일한 typed runtime contract를 유지한다.

Next.js middleware는 page rendering 전에 중앙화된 demo path policy를 적용하고 제한된 dashboard, ranking, tournament, profile, administration route에 404를 반환한다. server authorization을 대체하지 않는 presentation/exposure 경계지만 public demo에서 실제 접근 가능한 route surface를 transient guest capability와 맞춘다.

## feat(web): LoginPanel guest 진입 연결
public app이 demo mode일 때 login panel을 server-managed guest entry point에 연결한다. form에서 handle/display-name input을 제거하고 `guestLogin`을 호출한 뒤, 반환된 user를 development login과 동일한 cache update/invalidation path로 전달한다.

identity assignment를 server에 유지해 unauthenticated browser가 guest profile data를 선택할 수 없게 하고, 기존 login mutation boundary를 재사용해 application 나머지가 새 session을 일관되게 관찰하도록 한다.

## feat(web): guest lobby presentation 적용
중앙화된 guest presentation policy를 lobby에 적용해 demo mode가 durable progress나 지원하지 않는 interaction을 광고하지 않도록 한다. hero/lobby 문구는 result가 저장되지 않는다고 명시하고, leaderboard link, win/rating card, lobby chat을 제거하면서 operational online/queue statistic은 유지한다.

하나의 policy object로 element를 조건부 노출해 UI를 server의 transient guest model과 맞춘다. guest는 play와 live service state 관찰은 가능하지만 persisted history, ranking, registered-user communication feature를 기대하게 해서는 안 된다.

## feat(web): demo navigation 정책 연결
application shell이 full authenticated menu를 무조건 구성하지 않고 중앙화된 demo navigation policy를 사용하도록 한다. 현재 mode에 어떤 destination이 존재하는지는 policy가 결정하고, `AppShell`은 icon과 active-route styling 같은 presentation detail만 담당한다.

route availability와 rendering을 분리해 guest restriction이 JSX 곳곳에 흩어지는 것을 막고 navigation이 생성되는 모든 위치에서 축소된 demo surface를 일관되게 유지한다.

## feat(web): guest play presentation 적용
demo mode에서 match chat이 disabled되어 있으면 숨기도록 guest presentation policy를 live match screen에 적용한다. feature별로 별도 environment check를 추가하지 않고 lobby와 동일한 policy object를 읽는다.

navigation과 gameplay 전반에 restricted guest surface를 일관되게 유지하고 transient non-registered session에게 server-side guest boundary가 지원하지 않는 interaction을 보여주지 않는다.

## test(web): 비회원 체험 진입 흐름 검증
guest experience 진입에 대한 browser-side contract를 검증한다. `guestLogin`은 request body 없이 credentialed `POST /auth/guest`를 보내야 하며, unauthenticated client에서 profile input을 받지 않고 guest identity/display name assignment를 server control 아래에 둔다.

helper를 공통 API error matrix에도 포함해 guest entry가 나머지 web client와 동일한 response/failure semantics를 사용하는지 보장한다.

## test(guest): 체험 기능 오용 방지 검증
happy path만으로는 확인하기 어려운 abuse/isolation boundary를 중심으로 guest-mode test를 확장한다. demo/production mode는 충분히 강한 명시적 session secret을 요구하고 proxy address trust는 opt-in으로 유지한다. pending ticket store는 guest당 live ticket 하나와 process 전체 capacity로 제한하며, guest connection 교체로 가득 찬 per-IP slot을 우회할 수 없는지 검증한다.

retained transient result의 timed cleanup도 확인하고 non-persistent demo의 browser policy를 정의한다. lobby/play navigation만 보이고 progress/chat 관련 claim은 숨기며 registered-account route에 직접 접근하면 거부해야 한다. 동일 UI의 unauthenticated 버전이 아니라 authenticated product보다 의도적으로 좁은 guest surface를 만든다.

## refactor(game): GameHub가 shared room scheduler 사용
simulation timing ownership을 각 room에서 `GameHub`가 소유하는 하나의 scheduler로 이동한다. room은 개별 `FixedStepScheduler` instance를 더 이상 갖지 않고 play, pause, disconnect, abandonment, finalization, removal 등 모든 lifecycle transition에서 shared ticker에 register/unregister한다.

timing loop를 중앙화해 match당 timer 하나가 생기는 것을 피하고 hub에 runnable room의 authoritative set 하나를 제공한다. room은 simulation이 실제 진행될 수 있는 동안에만 scheduler에 존재한다는 더 강한 lifecycle invariant를 integration point 전체에서 유지한다.

## test(game): shared scheduler lifecycle 검증
room recovery 중 scheduler ownership transition을 고정한다. reconnect regression은 active room이 scheduled 상태이고 disconnect된 room은 recovery window 동안 제거되며 reconnect 시 다시 등록되고 terminal forfeit에서는 영구 제거되는지 확인한다.

shared ticker가 현재 실제 실행 가능한 room만 진행한다는 invariant를 보호한다. suspended/finished room을 남기면 불필요한 작업과 duplicate finalization 위험이 생기고, recovered room을 재등록하지 않으면 simulation이 멈춘다.

## build(shared): production package artifact 구성
shared protocol package를 TypeScript source를 무조건 export하는 대신 compiled production dependency로 구성한다. package metadata는 일반 consumer에 JavaScript/declaration artifact를 노출하면서 source-aware tooling용 development condition은 유지한다.

NodeNext build configuration이 package를 `dist`로 emit하고 internal export는 `.js` specifier를 사용해 생성된 ESM이 TypeScript loader 없이 resolve되도록 한다. API/web build에 동일한 public package boundary에서 안정적인 runtime/type contract를 제공한다.

## build(db): production package artifact 구성
database workspace에 실제 production package 경계를 만든다. public entry point는 compiled JavaScript/declaration을 노출하고 source-oriented tooling용 development condition을 유지한다. 전용 NodeNext build는 test file을 제외한 runtime graph를 emit하며 relative import에 `.js`를 포함해 generated ESM이 Node에서 resolve되도록 한다.

build는 emitted migrator 옆에 SQL migration도 copy하고 Node 기반 production migration command를 추가한다. deployment image에 source file과 `tsx`가 없어도 schema change를 사용할 수 있게 하면서 `dist`를 authoritative runtime artifact로 유지한다.

## build(app): API와 Web production artifact 구성
application workspace를 source-driven development execution에서 명시적인 production artifact 기반으로 전환한다. API는 전용 NodeNext configuration으로 compile하고 test를 제외하며 declaration/source map을 `dist`에 emit한다. `tsx` 대신 Node로 시작하고 relative import에 `.js` extension을 포함해 emitted ESM graph가 runtime에서 resolve되게 한다.

web build는 Next.js standalone output을 만들고 monorepo root부터 file을 trace하며, TypeScript path alias가 아니라 compiled runtime의 `@pong-pong/shared`를 resolve한다. workspace pre-script와 root build order는 consumer가 build되기 전에 shared/database package가 존재하도록 보장한다. deployment boundary를 unpublished source file이나 development-only loader가 아니라 compiled package graph로 만든다.

## test(build): production artifact 생성 검증
production runtime에 필요한 file을 대상으로 명시적인 post-build contract를 추가한다. verifier는 shared package의 compiled JavaScript/declaration, database migration/CLI asset, 주요 API module, Next.js standalone server entry point를 확인한다.

type checking과 compilation만으로 찾기 어려운 packaging failure를 잡는다. 특히 누락된 non-TypeScript asset이나 container startup이 기대하는 workspace path가 빠진 경우를 검출한다.

## ci(build): production artifact 검증 실행
workspace build 직후 CI에서 production-artifact verifier를 실행한다. shared/database package가 JavaScript/declaration을 emit했는지, migration이 copy되었는지, database CLI/migrator가 존재하는지, API runtime이 생성되었는지, Next.js standalone server entry point가 만들어졌는지를 확인해 compiler 성공과 deployable build를 구분한다.

normal build job에 이 검사를 두어 copy step 누락이나 packaging regression을 image assembly 전에 deterministic CI failure로 만든다.

## fix(guest): 체험 환경의 runtime 복구 제한
arbitrary client IP와 ticket request에 따라 무한히 커질 수 있던 guest runtime structure에 상한을 둔다. creation/ticket-issuance accounting은 timer-backed rolling window를 공유하고 expired entry를 prune하며 configured capacity 이후 새 tracked network를 거부한다. 분당 issuance limit과 IP별 pending one-time WebSocket ticket cap도 함께 강제한다. ticket replacement/expiration은 하나의 deletion path를 사용해 timer, ticket map, guest-to-ticket index를 동기화한다.

request IP를 guest ticket issuance의 일부로 포함해 Fastify가 client address를 resolve한 동일 trust boundary에서 이 limit을 강제할 수 있게 한다. `APP_MODE` parsing도 environment module에 중앙화하고 명시적 값을 검증해 silent fallback을 없앤다. cookie 및 guest-mode behavior가 하나의 accepted runtime mode에서 파생되도록 한다.

## fix(web): 중단된 game reconnect 복구
중단된 game socket을 새 matchmaking request가 아니라 existing room의 continuation으로 복구한다. `GameSocketClient`는 15초 window 안에서 capped exponential backoff로 retry하고 매 attempt마다 새 one-time WebSocket ticket을 얻는다. reopen된 socket은 original `queue.join` 또는 AI command를 의도적으로 다시 보내지 않아 duplicate matchmaking을 피하고, 이후 snapshot을 통해 server가 authenticated room을 복원하도록 한다.

connection reducer는 reopened socket과 initial open을 구분하고 hook은 client가 room을 계속 소유하는 동안에만 retry를 요청한다. active room이 없고 state가 idle/finished/failed일 때만 new match control을 enable해 recovery와 matchmaking이 동시에 실행될 수 없다는 invariant를 유지한다. guest-mode lobby handling은 recovered room traffic을 `/play`로 다시 redirect하고 non-persisted match result를 durable history처럼 취급하지 않고 명시적으로 표시한다.

## test(guest): 체험 환경의 복구 경계 검증
in-memory session이 안전하게 recovery할 수 있는 경계 전체로 guest-mode regression suite를 확장한다. explicit `APP_MODE` parsing, IP별 creation window/one-time WebSocket ticket의 expiry와 bounded cleanup, issuance limit, original queue command를 replay하지 않고 fresh ticket으로 reconnect하는 동작, room reconnect 중 두 번째 match request 차단을 검증한다.

browser policy coverage는 non-persisted result의 예상 presentation과 lobby traffic이 still-active room을 드러낼 때 game screen으로 돌아가는 transition도 고정한다. fake timer로 time-based guarantee를 deterministic하게 만들고 각 case 후 timer를 reset해 다른 suite에 clock state가 누출되지 않게 한다.

## build(api): metrics 수집 의존성 추가
`prom-client`를 명시적인 API dependency로 추가하고 resolved workspace graph를 갱신한다. 이후 observability layer에서 process collector, gauge, counter, histogram에 사용할 runtime library boundary를 마련한다. transitive availability에 기대지 않고 API package가 직접 의존해 production installation과 Docker build의 reproducibility를 보장한다.

## feat(db): migration set 상태 검사 추가
bundle된 SQL migration 이름과 database에 적용된 Kysely migration record를 비교해 set을 current, pending, diverged로 분류한다. migration table이 없으면 empty applied set으로 취급하고 그 외 query failure는 그대로 전달한다. source layout과 built package layout 모두에서 migration discovery를 지원해 development/production에서 동일한 authoritative SQL file을 기준으로 readiness를 판단한다.

## feat(db): repository readiness 경계 추가
API가 storage health를 implementation detail에서 추론할 필요가 없도록 repository contract에 readiness를 추가한다. PostgreSQL readiness는 기본 connectivity와 bundled migration-set status를 모두 증명하고, memory implementation은 migration이 not applicable이라고 명시한다. bounded domain result를 반환해 health endpoint를 database-driver error와 분리하고 모든 repository 구현에 동일한 operational boundary를 제공한다.

## feat(ops): liveness와 readiness endpoint 추가
versioned response schema로 process liveness와 service readiness를 분리한다. liveness는 API process가 응답할 수 있는지만 보고하고, readiness는 repository를 조회해 database가 reachable하고 migration이 current 또는 의도적으로 inapplicable인 경우에만 traffic을 허용한다. dependency error는 bounded status field와 503 response로 축약해 database detail을 public health contract 밖에 둔다.

## test(ops): health와 database readiness 검증
liveness가 dependency readiness와 독립적으로 유지되고 legacy health response도 호환되는지 검증한다. readiness는 reachable repository와 expected migration state를 모두 만족할 때만 허용한다. memory storage는 migration not applicable을 보고하고, PostgreSQL은 migration 전 pending에서 적용 후 current로 바뀌며, missing/unexpected migration record도 구분한다. repository failure는 connection string이나 credential을 노출하지 않는 sanitized 503 response를 반환해야 한다.

## chore(logging): 민감한 요청 값을 redaction 대상에 추가
structured-log redaction 범위를 nested cookie, authorization, session-token, query, ticket field까지 확장한다. authentication material이 top-level request shape뿐 아니라 child object 안에서도 log될 수 있으므로 wildcard path를 포함하는 것이 중요하다. 해당 표현을 censor해 observability code가 secondary credential store가 되는 것을 막는다.

## feat(metrics): runtime gauge registry 추가
Node runtime collector와 live GameHub gauge를 위한 전용 Prometheus registry를 만든다. connection, matchmaking queue, active room 값은 서로 다른 lifecycle path를 통한 client/room cleanup 때문에 mirror 값이 어긋나는 것을 피하도록 incremental하게 복제하지 않고 scrape 시점에 authoritative hub에서 sampling한다. test와 shutdown isolation을 위해 registry에 명시적인 close operation도 제공한다.

## feat(metrics): HTTP와 readiness 측정 추가
Prometheus scrape endpoint를 노출하고 raw URL 대신 정규화된 Fastify route template, method, status code를 사용해 HTTP request duration을 측정한다. readiness check에는 result tag가 있는 별도 histogram을 두어 일반 request latency와 dependency-health latency를 구분하고, `not_ready`를 반환하는 exception path도 포함한다. 반복 생성되는 app instance 사이에 default collector가 누출되지 않도록 application과 함께 metrics registry를 닫는다.

## feat(metrics): repository operation 측정 추가
caller를 변경하지 않고 모든 synchronous/asynchronous operation을 측정하는 transparent proxy로 repository interface를 감싼다. success/failure path를 별도로 timing하고 알려진 method name만 bounded label로 whitelist하며 예상하지 못한 method는 `other`로 합친다. original method receiver와 error behavior는 유지하면서 PostgreSQL/memory 구현을 동일한 repository boundary에서 일관되게 instrument한다.

## feat(metrics): game room과 reconnect 관측 추가
game state machine 안에 logging/metrics를 직접 넣지 않고 GameHub lifecycle event 주변에 observer boundary를 추가한다. room 생성 시 request/user correlation identifier를 log에 남기고 successful/expired reconnect attempt는 bounded outcome counter를 증가시킨다. originating request ID를 WebSocket client record에 전달해 realtime protocol payload를 바꾸지 않고 HTTP authentication, socket establishment, room creation, recovery를 연결한다.

## feat(metrics): match finalization 결과 관측 추가
in-memory guest completion과 database-backed persistence를 구분하는 domain boundary에서 match finalization을 관측한다. 성공/실패 database attempt와 memory completion은 structured observer event 및 persistence type과 outcome만 key로 하는 low-cardinality counter를 emit한다. room, match, participant correlation data는 별도 log에 유지해 operational diagnosis를 위해 metric cardinality를 늘리지 않는다.

## feat(metrics): snapshot delivery와 drop 관측 추가
delivery semantics가 실제 결정되는 latest-snapshot buffer 지점에 instrumentation을 추가한다. pending snapshot마다 enqueue time을 보관하고 successful send는 queue-to-callback delay를 보고한다. discarded snapshot은 replacement, connection closure, sustained congestion으로 분류한다. GameHub가 이 event를 bounded Prometheus histogram/counter series로 전달해 connection/room별 label을 붙이지 않고도 backpressure를 관찰할 수 있게 한다.

## test(metrics): database와 snapshot 지표 검증
high-cardinality identifier를 metric label로 만들지 않으면서 database와 realtime-delivery behavior를 관찰할 수 있는지 검증한다. snapshot buffer는 replacement drop과 실제 delivery delay를 보고해야 하고 Prometheus endpoint는 HTTP, connection, room, database, delivery-delay, drop series를 노출해야 한다. request logging은 nested credential을 redaction하되 correlation identifier는 log에만 유지해야 한다. operational usefulness와 bounded metric cardinality를 함께 보호한다.

## feat(game): 새 작업 차단과 active room drain 추가
Fastify readiness boundary와 GameHub가 공유하는 명시적인 draining state를 도입한다. draining이 시작되면 readiness를 `not_ready`로 바꾸고 queued/tournament-waiting client를 `server_draining` protocol error와 함께 해제하며 새 queue/tournament match 시작을 막는다. existing room은 자신의 lifecycle ownership을 유지하며 끝까지 완료할 수 있다. room set이 비면 하나의 waiter가 resolve되고 timeout 시에는 남은 room count를 반환한다. 최종 close에서는 scheduler, timer, snapshot buffer, heartbeat, socket, retained guest result를 모두 중지한다.

## feat(ops): graceful shutdown 절차 추가
SIGTERM/SIGINT용 single-entry graceful-shutdown handler를 설치한다. 첫 signal은 Fastify를 닫고 repository resource를 해제하기 전에 application을 60초 game-room drain으로 전환한다. 이후 signal은 경쟁하는 teardown을 새로 시작할 수 없다. failure가 나면 nonzero exit status를 설정하면서도 application close는 계속 시도하고, 정상 close lifecycle의 일부로 signal listener도 detach한다.

## test(ops): GameHub drain과 graceful shutdown 검증
shutdown을 즉시 process exit가 아니라 bounded lifecycle transition으로 검증한다. drain 진입 시 waiting queue를 비우고 새 matchmaking을 거부하며 readiness는 즉시 실패해야 하고 configured timeout까지 active room을 기다려야 한다. 별도 signal test는 SIGTERM/SIGINT가 반복되어도 shutdown sequence가 하나만 시작되고 cleanup에 재진입하지 않은 채 failure를 보고하는지 확인해 실제 process-manager 동작에서도 single-owner teardown semantics를 유지한다.

## test(load): 실시간 부하 임계값 정의
load harness를 실행 가능한 service-level contract로 고정한다. default profile은 500 connection과 50 active room을 요구하고 명시적인 1,000-connection mode도 제공한다. 요청된 room당 player 두 명을 할당할 수 없는 configuration은 거부한다. connection/reconnection success, snapshot latency/drop limit, exactly-once finalization signal, 필수 k6 action, PostgreSQL/edge fault plan 분리도 test로 고정해 이후 harness 변경이 acceptance criteria를 조용히 약화시키지 못하게 한다.

## test(load): 실시간 fault injection 도구 추가
configured connection population을 열고 live room을 생성하며 versioned input을 구동하고 ticket 기반 reconnection을 실행해 snapshot delay, delivery gap, match-finalization uniqueness를 측정하는 k6 realtime-load harness를 추가한다. Docker Compose overlay는 PostgreSQL과 public edge를 서로 다른 Toxiproxy endpoint를 통해 route하고, validated control utility는 latency 추가, peer reset, path disable을 수행할 수 있다. database fault와 edge fault를 독립적으로 제어해 동일한 server-authoritative workload에서 persistence degradation과 transport degradation을 구분할 수 있게 한다.

## fix(api): startup seed 생성을 제거
API가 in-memory repository를 선택할 때 automatic seed creation을 제거한다. startup은 user나 다른 fixture를 insert하지 않고 dependency를 구성한 뒤 configured mode를 제공한다. runtime lifecycle과 environment preparation을 분리하고 restart가 application data를 변경하거나 smoke behavior가 숨은 bootstrap record에 의존하는 것을 방지한다.

## test(api): startup seed 금지 검증
API entrypoint가 `ensureSeedData`를 호출하지 않는다는 source-level guard를 추가해 process startup에서 implicit data mutation을 제거한다. WebSocket smoke path는 명시적인 AI mode로 변경하고 seeded NPC handle 대신 behavioral AI marker를 검사해 process verification이 startup-created fixture에 의존하지 않게 한다. seed creation은 application boot side effect가 아니라 explicit operational action으로 유지한다.

## test(game): versioned match replay fixture 추가
initial state, fixed timestep, encoded input stream, 최종 simulation state의 expected SHA-256 hash를 포함하는 versioned 1,000-tick replay를 완전히 지정해 추가한다. 기록된 모든 input을 `PongSimulation.step`으로 replay하면 정확히 같은 hash를 재현해야 한다. determinism을 durable compatibility contract로 만들기 때문에 physics, serialization, timestep semantics를 바꾸려면 authoritative outcome을 조용히 바꾸는 대신 replay version을 의도적으로 갱신해야 한다.

## build(runtime): Node.js engine version을 정확히 고정
workspace engine declaration을 모든 Node 24 release 허용에서 repository가 실제 사용하는 정확한 runtime version으로 변경한다. exact pinning으로 local installation check를 CI/container image와 맞추고 검토되지 않은 minor/patch runtime이 module, networking, build behavior를 바꾸는 것을 막는다.

## build(docker): production API image 구성
multi-stage API image와 제한된 Docker build context를 추가한다. builder는 frozen workspace dependency graph를 설치하고 shared contract, database code, API code를 dependency order로 compile한다. runner에는 compiled package와 runtime dependency만 전달하고 Node로 직접 시작하며 unprivileged node user로 권한을 낮춘다. secret, cache, report, prebuilt output을 제외해 build context를 더 작게 만들고 local state가 누출될 가능성도 줄인다.

## build(docker): production Web image 구성
Next.js application용 multi-stage production image를 추가한다. workspace manifest 기준 frozen dependency installation을 사용하고 public API/WebSocket/app-mode 값은 build argument로 compile하며, 최종 image에는 Next standalone server와 static asset만 복사한다. source-oriented build environment를 production에 포함하지 않고 최소 artifact를 unprivileged node user로 실행한다.

## build(docker): Caddy reverse proxy 구성
runtime bind mount 대신 Caddy configuration을 immutable image로 package한다. routing은 `/api` request와 WebSocket upgrade를 API에 유지하고 나머지 traffic은 web application으로 보내지만, 일반 API handler보다 먼저 public `/api/metrics` path에 명시적인 404를 반환한다. 하나의 external origin을 유지하면서 internal observability data를 노출하지 않는다.

## build(docker): production container lifecycle 구성
startup 시 dependency를 설치하고 source를 mount하던 development-style container를 built API/web image로 교체한다. one-shot migration service는 healthy database를 기다리고, API는 migration 성공을 기다리며, web은 API health를 기다리고, Caddy는 두 application service를 모두 기다린다. edge만 publish하고 database/application port는 internal로 유지하며 secret을 필수화하고 readiness check로 dependency ordering을 정의한다. resulting Compose graph는 편의용 local shell이 아니라 production lifecycle을 모델링한다.

## test(docker): production container contract 검증
rendered Compose model과 Dockerfile에 실행 가능한 검사를 추가한다. contract는 Caddy만 publish되는 service여야 하고, API startup 전에 migration이 한 번 실행되어야 하며, source bind mount가 없어야 한다. pinned Node image, non-root application process, direct Node command, 필수 secret, public에서 차단된 metrics path도 요구한다. application test만으로 관찰할 수 없는 deployment topology와 privilege boundary를 보호한다.

## refactor(game): matchmaking player와 fallback 계약 정의
socket과 room에서 독립된 matchmaking domain vocabulary를 도입한다. registered/guest player, rating을 가진 pair, queued/matched/duplicate join outcome, waiting/ready/unavailable AI fallback outcome, queued/matched status를 정의한다. 6초 fallback constant와 injectable clock도 contract의 일부다. input validation은 empty identity, unsafe rating, invalid pool kind를 거부한다. nullable value로 상태를 암시하지 않고 이후 transition을 exhaustive하게 만들 수 있는 typed state surface다.

## refactor(game): rating 기반 closest-pair queue 구현
명시적인 queued/matched status를 갖는 Matchmaker queue를 구현한다. 새 entrant는 configured rating difference 안에서 같은 kind 중 가장 가까운 candidate와 pair되고, 없으면 enqueue 시각과 AI-fallback 시각을 함께 기록해 queue에 들어간다. duplicate membership은 state를 변경하지 않고 별도 결과로 보고하며, injected time과 defensive value copy를 사용해 algorithm을 deterministic하게 만들고 외부 object mutation에서 격리한다.

## refactor(game): AI fallback과 reservation lifecycle 구현
Matchmaker를 pair selection에서 완전한 reservation lifecycle로 확장한다. AI fallback은 현재 queue에 있는 user만 6초 deadline 이후 claim할 수 있고, claim 시 queue entry를 atomic하게 제거한 뒤 user를 matched로 표시한다. `leaveQueue`와 `release`를 분리해 wait 취소와 이미 할당된 slot 해제를 구분하므로 caller가 active match의 한쪽을 실수로 available 상태로 만들지 못한다.

## test(game): matchmaking 규칙 검증
controllable clock으로 Matchmaker state-machine contract를 정의한다. 호환 가능한 rating 중 가장 가까운 상대를 선택하고 범위 밖 user는 queue에 남기며 guest/registered pool을 절대 섞지 않는다. AI fallback은 정확히 6초 뒤에만 노출하고 queued/reserved 상태에서 duplicate membership을 거부하며, queue leave와 matched reservation release를 구분한다. GameHub integration 전에 ownership과 timing semantics를 명시적으로 고정한다.

## refactor(db): match result repository 계약 분리
idempotent match finalization용 좁은 persistence contract로 `MatchResultRepository`를 추출하고 `AppRepository`가 이를 확장하도록 한다. GameHub는 이제 이 contract와 실제 사용하는 소수의 chat, NPC, tournament operation에만 의존한다. 경계를 좁혀 finalization을 독립적으로 대체 가능하게 만들고 realtime domain code가 repository의 관련 없는 user/administration surface에 결합되지 않게 한다.

## refactor(game): Matchmaker queue reservation을 GameHub에 연결
PvP selection과 duplicate-user reservation을 Matchmaker로 이동하고 GameHub는 socket/timer concern을 유지한다. enqueue는 queued, matched, duplicate state를 구분하고 guest와 registered user를 분리하며 rating window를 강제한다. transport 쪽 opponent entry가 없거나 room creation이 실패하면 양쪽 reservation을 모두 해제한다. ad hoc array matching을 명시적인 domain state machine으로 교체하기 시작한다.

## refactor(game): Matchmaker AI fallback를 GameHub에 연결
parallel queue를 직접 검사하지 않고 Matchmaker가 제공한 deadline에서 AI fallback을 schedule하고 state machine을 통해 claim한다. deadline이 아직 오지 않았으면 handler가 다시 schedule하고 stale/unavailable entry는 abandon한다. asynchronous NPC lookup 후 socket/room state를 다시 검증하며 모든 failure path에서 reservation을 해제한다. 이미 disconnect, match, shutdown 상태가 된 user에게 delayed work가 room을 생성하는 것을 막는다.

## refactor(game): queue와 reservation cleanup 일원화
GameHub의 duplicate queue array를 제거하고 queued/reserved user의 authoritative owner를 Matchmaker로 만든다. 별도 map에는 transport-specific timer와 client만 유지한다. queue leave, disconnect pruning, drain, shutdown, room abandonment, finalization failure, room removal은 모두 shared path를 통해 release한다. 두 representation이 user의 queued/matched/available 상태에 대해 서로 다른 판단을 하지 않도록 ownership을 통합한다.

## refactor(game): room 생성과 finalization cleanup 보장
room publication을 rollback cleanup으로 감싼다. observer notification, client assignment, matching message, initial snapshot 중 하나라도 실패하면 error를 외부로 내보내기 전에 scheduler entry, reconnect timer, room map, client room reference를 원상 복구한다. finalization도 persistence 성공 후 observation/broadcast가 실패하더라도 `finally`에서 room을 제거한다. partially visible room이나 completed room이 in-memory ownership을 누출하지 않는 lifecycle guarantee를 만든다.

## test(game): matchmaking lifecycle 검증
rating-window matching, finalized forfeit 뒤 reservation 해제, abandoned empty room cleanup, room construction 중간 실패 시 rollback을 다루는 focused GameHub lifecycle test를 추가한다. player가 최대 하나의 active match에만 reserved되고 모든 terminal/failed creation path 뒤에는 다시 match 가능한 상태가 되는지 검증해 stale in-memory reservation이 user를 matchmaking에서 영구적으로 제거하지 못하게 한다.

## fix(load): local database secret을 필수화
load-test Compose overlay에서 default PostgreSQL password를 제거하고 required environment interpolation으로 변경한다. `POSTGRES_PASSWORD`가 없으면 stack을 띄우기 전에 startup이 실패하므로 fault/performance run이 base deployment secret contract와 다른 embedded credential을 조용히 사용하지 못한다.

## test(load): database secret 요구 검증
load overlay를 required-secret interpolation에 고정하고 fallback password를 명시적으로 거부한다. `POSTGRES_PASSWORD`가 제공된 경우에만 Toxiproxy를 거치는 `DATABASE_URL`을 구성할 수 있어야 하며, 이후 configuration 변경이 알려진 local credential을 다시 도입하지 못하게 한다.

## feat(db): legacy session을 안전하게 만료
authentication contract 변경 후 기존 발급 cookie가 모두 다시 authentication하도록 existing session row를 삭제하는 명시적인 migration을 추가한다. migrator에는 optional target migration도 추가해 test에서 historical state를 만든 뒤 upgrade path를 실행할 수 있다. durable user/match history는 유지하면서 legacy session material을 재해석하려 하지 않고 ephemeral credential을 만료시키는 편이 더 안전하다.

## test(db): 인증 migration 중 데이터 보존 검증
user, active session, finalized match, rating history가 있는 pre-migration database를 만든 뒤 authentication migration을 적용한다. 모든 legacy session은 invalidate되지만 user와 match-domain record는 byte-for-byte 동일하게 유지되고 migration도 기록되는지 검증한다. 의도한 security reset이 우발적인 domain-data migration으로 바뀌는 것을 막는다.

## ci(repo): process와 browser 검증 job 추가
production artifact를 build하고 PostgreSQL을 provision/migrate한 뒤 compiled API와 production web server를 시작하고 readiness를 기다린 다음 HTTP smoke, WebSocket smoke, browser E2E suite를 실행하는 integration job을 추가한다. failure 시 child service가 남지 않도록 process cleanup을 trap한다. unit test만으로 검증하기 어려운 built artifact, 실제 process startup, persistence wiring, socket, browser interaction 경계를 확인한다.

## test(ci): process 검증 job contract 확인
하나의 Node/pnpm toolchain을 고정하고 frozen lockfile installation을 요구하며 unit, PostgreSQL integration, process smoke, browser E2E command가 각각 존재하는지 검증하는 static CI contract test를 추가한다. integration path가 PostgreSQL을 provision하고 migration/seed data를 적용하는지도 확인해 workflow 수정으로 필수 verification stage가 조용히 빠지지 않게 한다.

## feat(db): test database reset target guard 추가
destructive test reset용 fail-closed resolver를 도입한다. `NODE_ENV=test`와 `TEST_DATABASE_URL`을 요구하고 PostgreSQL URL만 허용한다. 명시적으로 test 이름을 가진 database의 public schema 또는 정확히 생성된 `test_<32 hex>` search_path 하나만 허용한다. ambiguous option, malformed name, 일반 application database는 거부해 이후 reset code가 의도하지 않은 schema를 지우지 못하게 한다.

## feat(db): test schema reset과 migration 실행 연결
명시적인 `reset:test` CLI path를 추가한다. reset target이 dedicated-test-database 또는 generated-isolated-schema guard를 통과하면 search_path option 없는 control connection을 열고 quoted target schema만 transaction 안에서 drop/recreate한다. pool을 닫고 guarded target URL에 migration을 다시 적용한다. target resolution에서 확립한 safety boundary를 유지하면서 destructive test cleanup을 재현 가능하게 만든다.

## test(db): test database reset guard 검증
non-test runtime, 일반 database name, ambiguous `search_path` option에 대해 destructive reset boundary를 검증한다. integration case는 생성된 test schema 하나만 reset/remigrate하고 sibling schema는 유지해 guard가 eligibility뿐 아니라 실제 destructive target도 제한한다는 것을 증명한다.

## fix(db): 차단 감사 기록을 원자적으로 저장
user-status update와 대응하는 administrator-action insert를 하나의 PostgreSQL transaction으로 이동한다. account state와 해당 audit 설명이 함께 commit되거나 rollback되므로 suspended user가 누가 왜 해당 action을 수행했는지 복원하는 데 필요한 durable record 없이 남는 상황을 방지한다.

## test(db): 차단 감사 기록 atomicity 검증
user update가 시작된 뒤 audit insert가 임시 database constraint를 위반하도록 강제로 만든다. 정상 path에서 write 두 개가 모두 수행되는지만 확인하지 않고 ban과 audit row 어느 쪽도 남지 않는지 검증해 transaction boundary를 고정한다.

## feat(metrics): event-loop lag 측정 추가
Node event-loop delay histogram을 추가하고 95th percentile을 Prometheus gauge로 노출한다. monitor는 metrics lifecycle과 함께 enable하고 close 시 disable해 observability가 background handle을 남기지 않도록 한다.

## test(load): event-loop lag를 부하 profile에 노출
load overlay에서 API metrics port를 loopback에 publish하고 k6 teardown 중 server의 event-loop p95를 수집한다. Prometheus의 seconds sample을 k6 millisecond trend로 변환해 runtime saturation을 load pass/fail profile의 일부로 만든다.

## test(load): event-loop lag 임계값 검증
load contract를 p95 event-loop lag 50ms threshold에 고정하고 필수 observability metric이 export되는지 확인한다. load overlay가 API metrics endpoint를 loopback에만 노출하는지도 검증한다.

## test(e2e): 비회원 체험 브라우저 흐름 검증
credential 없는 guest 진입, 제한된 navigation, 두 browser 간 PvP matching, bounded 6초 AI fallback, match 중 WebSocket interruption 이후 ticket 기반 recovery를 검증하는 demo-mode Playwright suite를 추가한다. isolated UI assertion이 아니라 실제 browser, HTTP, realtime 경계를 통해 public guest contract를 실행한다.

## chore(repo): 원본 화면 기록 파일 제외
run별 Playwright capture output은 version control에서 제외하고 의도적으로 선별한 demo artifact만 유지한다. nondeterministic raw recording이 history를 불필요하게 키우거나 review 대상 source change처럼 보이는 것을 막는다.

## chore(media): 비회원 화면 기록 공통 pipeline 추가
guest-demo evidence를 위한 재현 가능한 Playwright/ffmpeg capture pipeline을 도입한다. 생성된 guest identity와 page state를 검증하고 run-scoped raw output을 기록하며 선택한 artifact를 압축한다. file이 없거나 비정상적으로 작으면 실패 처리한다.

## chore(media): PvP reconnect 화면 기록 추가
capture harness를 확장해 격리된 guest session 두 개를 만들고 PvP match를 시작한다. route된 WebSocket 하나를 의도적으로 닫은 뒤 reconnecting 및 resumed-playing state를 검증하고 resulting screenshot과 VP9 video를 encoding한다.

## chore(media): AI fallback mobile 화면 기록 추가
browser media harness를 확장해 Pixel 크기 viewport에서 guest queue를 실행한다. configured delay 전에는 AI fallback이 발생하지 않는지 확인한 뒤 AI match에 진입하고 검증된 compressed screenshot/video evidence를 생성한다.

## fix(auth): 정지된 관리자 login 거부
administrator authorization boundary에 현재 account status를 포함한다. valid session과 `admin` role이 있어도 underlying account가 suspended 상태면 access를 허용하지 않는다. session 발급 시점에 담긴 상태만 보는 대신 최신 security state를 authorization에 반영한다.

## test(auth): 정지된 관리자 session 거부 검증
administrator를 suspend하면 이미 발급된 session이 가진 privilege도 revoke되는지 검증한다. 이후 administrator request는 안정적인 `account_suspended` envelope으로 실패해야 하며, status change보다 오래 살아남아 privilege를 유지하는 session을 방지한다.

## fix(api): 내부 WebSocket 오류 숨김
client parse failure와 internal processing failure를 분리한다. malformed protocol input에는 안정적인 `invalid_event` response를 보내고 repository/matchmaking exception은 exception text를 노출하지 않고 고정된 `internal_error` message로 축약한다.

## test(api): WebSocket repository error redaction 검증
SQL text와 internal host name이 포함된 repository failure를 inject한 뒤 WebSocket command boundary를 통해 실행한다. client는 안정적인 `internal_error` response만 받아야 한다. redaction이 malformed protocol input뿐 아니라 asynchronous domain failure까지 적용됨을 증명한다.

## fix(db): tournament start 상태 갱신 여부 확인
`UPDATE ... RETURNING`을 사용해 eligible tournament row가 정확히 하나 `running`으로 transition해야 성공하도록 한다. update 결과가 0 row면 missing-match error로 노출해 caller가 in-memory room을 rollback할 수 있게 한다.

## test(db): tournament match 미갱신 거부 검증
zero-row tournament-start update에 대한 PostgreSQL integration regression을 추가한다. unknown 또는 ineligible match 시작은 성공처럼 보이지 않고 반드시 reject되어야 하며, 이를 통해 GameHub가 room rollback path를 실행할 수 있다.

## fix(game): tournament 시작 실패 시 room 상태 복원
in-memory room creation과 persistent tournament-start marking을 하나의 logical transition으로 취급한다. persistence가 실패하면 error를 전달하기 전에 새로 만든 room을 abandon해 ghost room이 clean retry를 막지 않도록 한다.

## test(game): tournament start rollback 검증
in-memory room 준비 이후 tournament-start persistence가 실패하는 상황을 재현한다. room과 scheduler state가 제거되고 동일 player가 이후 정상적으로 retry할 수 있는지 검증해 failed database transition이 participant를 무기한 reserve하지 못하게 한다.

## feat(web): profile과 friend 조회 query 추가
current profile과 friend list를 위한 schema-validated API helper 및 scoped React Query option을 추가한다. profile update 후에는 mutable identity data를 포함하는 모든 cache를 invalidate하고, session expiration에서는 새 private cache도 제거한다.

## test(web): profile과 friend 조회 규칙 검증
own-profile/friend-list request helper와 React Query ownership rule을 검증한다. credential, abort propagation, exact cache key, mutation 이후 profile-wide invalidation, session expiration 시 private-cache removal을 고정해 authenticated session이 종료된 뒤에도 해당 session 소유 user data가 남지 않도록 한다.

## refactor(db): 경기 결과 확정 boundary 일원화
두 repository 구현에서 별도 tournament-completion operation을 제거하고 일반 match persistence와 tournament progression을 모두 `finalizeMatch`를 통해 처리한다. 하나의 idempotent result boundary가 durable outcome을 소유하므로 match row와 bracket state가 서로 다른 call에서 진행되는 partial workflow를 피한다.

## test(db): 경기 결과 확정 boundary 적용 검증
`finalizeMatch`가 존재하고 legacy `completeTournamentMatch` escape hatch가 사라졌는지 assertion해 좁아진 repository surface를 고정한다. 이후 code가 단일 idempotent finalization boundary를 우회하지 못하게 한다.

## fix(game): 부하 중 snapshot cadence 안정화
authoritative simulation은 20Hz로 유지하되 snapshot 전송은 10Hz로 낮추고 room별 delivery slot을 번갈아 배정해 burst를 분산한다. finalization observation에 created/null을 추가하고 idempotent duplicate persistence를 별도로 기록한다.

## fix(load): 기본 부하 profile 측정 안정화
player별 reconnect closure 시점을 분산하고 playing snapshot 이후에만 작동하도록 한다. finalization success/failure/duplicate는 client finished event 대신 Prometheus server metric에서 읽으며 label-aware metric parser를 추가한다.

## test(load): 기본 부하 병목 구간 검증
authoritative simulation이 20Hz로 계속 동작하는 동안 여러 room에서 staggered 10Hz snapshot delivery가 이루어지는지 regression coverage를 추가한다. persisted forfeit-finalization observation, duplicate metric, reconnection staggering, server-side finalization evidence로의 전환도 고정해 load profile이 backend correctness 대신 client visibility를 측정하지 않도록 한다.

## test(load): fault recovery 검사 자동화
database latency/outage와 edge latency/reset을 Toxiproxy로 순서대로 구동하고 readiness를 polling해 예상 failure/recovery state를 확인하며 versioned JSON report를 내보낸 뒤 proxy를 항상 reset하는 reusable fault-scenario runner를 추가한다.

## test(load): fault scenario 설정과 report 검증
fault harness를 operational contract로 검증한다. proxy port는 loopback-only여야 하고 default latency/reset parameter는 deterministic해야 하며 database/edge failure가 의도한 순서로 발생해야 한다. readiness는 degradation/recovery를 포착하고 versioned JSON report를 생성해야 한다. scenario가 실패해도 proxy cleanup은 반드시 실행되어 한 experiment가 다음 실행을 오염시키지 않게 한다.

## fix(db): idle connection pool 오류에서 복구
idle-client failure를 sanitized event로 변환하고 reporter failure도 내부에서 처리하는 PostgreSQL Pool error listener를 설치한다. API startup은 Fastify logging을 사용할 수 있을 때까지 event를 buffer한 뒤 process를 crash시키지 않고 보고한다.

## test(db): 안전한 connection pool 오류 처리 검증
idle PostgreSQL pool error가 containment되고 sanitized error name/code metadata만 보고되는지 검증한다. reporter가 없거나 자체 실패하더라도 pool의 asynchronous `error` event가 uncaught exception으로 바뀌면 안 되며 transient connection loss 중 process availability를 유지해야 한다.

## feat(shared): 모든 HTTP request schema를 strict하게 정의
모든 JSON HTTP route에 strict params, query, body schema를 하나씩 정의한다. input을 받지 않는 endpoint에는 명시적인 empty-object schema도 둔다. field가 없다는 사실 자체를 API contract의 일부로 만들고 TypeScript type이 runtime에서 사라진다는 이유로 undeclared client data가 handler logic에 들어가지 못하게 한다.

## fix(api): 모든 route input을 runtime 검증
공유 `parseHttpRequest` 경계를 도입하고 business logic 실행 전에 각 route의 strict params/query/body contract를 적용한다. invalid 또는 additional field는 모두 동일한 `validation_error` envelope으로 수렴해 runtime behavior를 shared TypeScript/Zod route definition과 맞춘다.

## test(api): strict request contract 검증
JSON route 전반에 table-driven API test를 추가해 unknown query/body field와 invalid path parameter를 shared validation-error envelope으로 거부하는지 검증한다. untrusted `X-Forwarded-For`로 guest creation limit을 우회할 수 없는지도 확인한다.

## ci(e2e): 비회원 체험 browser job 실행
API와 web application을 demo mode로 build/start하고 두 process를 기다린 뒤 PostgreSQL 없이 guest-only Playwright suite를 실행하는 전용 CI job을 추가한다. 이 path를 격리해 public trial experience가 authenticated production topology에서만 우연히 동작하는 것이 아니라 자체적으로 완결되는지 검증한다.

## test(ci): guest browser job 요구 검증
별도 guest-demo browser job, 일관된 demo-mode environment value, 의도한 Playwright command, guest specification을 요구하는 workflow contract test를 추가한다. routine CI 수정으로 이 독립 deployment path가 조용히 빠지지 않도록 static check를 둔다.

## fix(game): callback 지연을 snapshot congestion으로 오판하지 않음
outstanding WebSocket `send` callback 자체를 transport congestion으로 취급하지 않도록 한다. `bufferedAmount`가 정상인 동안에는 새 snapshot이 계속 socket에 들어갈 수 있고, latest-only replacement와 connection termination은 측정 가능한 buffered pressure가 있을 때만 사용한다. callback scheduling 지연만으로 false frame loss가 발생하는 것을 막는다.

## test(game): callback 지연과 실제 congestion 구분
`LatestSnapshotBuffer` test에서 delayed WebSocket callback과 실제 buffered transport pressure를 분리한다. fake socket은 multiple callback을 보류할 수 있고 elevated `bufferedAmount`만 replacement를 유발할 수 있어야 한다. application callback latency와 network backpressure의 차이를 고정한다.

## test(game): connection 교체 시점 검증 분리
same-user connection replacement test를 강화해 replacement가 waiting snapshot을 받고 room은 unscheduled 상태를 유지하며 stale input으로 두 번째 room을 만들 수 없고 reconnect timeout이 match를 finalize하지 않는지 확인한다.

## test(e2e): browser 사용자 상태 격리
run, browser project, worker에서 bounded E2E identity를 생성해 chat/tournament actor에 적용한다. auxiliary API context도 명시적인 origin을 사용해 parallel test가 persisted user를 공유하거나 의도하지 않은 base URL을 상속하지 않도록 한다.

## test(e2e): 브라우저 프로젝트별 로그인 식별자 격리
남아 있는 browser scenario를 fixed handle에서 project/worker/run별 identity로 migration하고 profile assertion도 이에 맞춘다. desktop/mobile project가 같은 database를 사용해도 서로의 user state를 덮어쓰지 않고 실행될 수 있다.

## test(repo): 정적 계약 검사 명령 연결
CI, production-Docker, load-harness contract suite를 실행하는 root `test:contracts` command와 대응하는 Make target을 노출한다. 하나의 entry point로 repository-level invariant를 local과 automation 모두에서 재현할 수 있게 한다.

## ci(repo): 정적 계약 검사 실행
unit test 뒤, build 전에 repository의 static contract suite를 CI에서 실행한다. workflow, deployment, runtime-version, load-harness assumption을 audit되지 않은 configuration으로 남겨두지 않고 이를 깨뜨리는 동일 change에서 바로 실패하게 한다.

## test(runtime): Node 버전 계약을 기준 파일에서 읽음
CI와 Docker contract test가 literal version을 중복하지 않고 `.node-version`에서 expected Node runtime을 읽도록 한다. 하나의 authoritative version source를 확립해 이후 patch update를 한 곳에서 검토하고 모든 consumer가 해당 값을 기준으로 검증할 수 있게 한다.

## build(runtime): Node.js 보안 패치 적용
local version file, package engine, 모든 CI job, API/web image stage, load-test bootstrap image에서 하나로 고정된 Node patch level을 24.18.0에서 24.18.1로 갱신한다.

## build(web): Next.js 보안 패치 적용
web application의 direct Next.js requirement를 `^15.5.21`로 올리고 resolved platform compiler package를 갱신한다. manifest에 검토된 security/compatibility 결정을 기록하고 lockfile에는 구체적인 cross-platform build graph를 남긴다.

## build(api): WebSocket 보안 패치 적용
API의 direct `ws` dependency를 `^8.21.0`으로 올리고 workspace와 Fastify WebSocket integration 전체에서 해당 version으로 resolve한다. lockfile만 바꾸지 않고 authoritative manifest를 갱신해 이후 install에서도 patched transport version을 유지한다.

## test(config): production fixture에 영속 DB 명시
기존 explicit-production environment fixture에 PostgreSQL URL을 추가한다. persistence가 필수가 된 이후에도 fixture가 valid production configuration을 나타내므로 관련 없는 production parsing assertion이 계속 success path를 검증할 수 있다.

## fix(config): production에서 영속 저장소 요구
environment parsing 단계에서 `DATABASE_URL`이 없는 production configuration을 거부한다. durable user, match, rating, tournament state가 process-local memory로 조용히 fallback할 수 없으므로 persistence가 빠진 deployment는 traffic을 받기 전에 실패한다.

## test(config): production memory fallback 거부 검증
명시적인 `APP_MODE=production`과 `NODE_ENV`에서 추론한 production 모두 `DATABASE_URL` 누락을 거부하고 demo mode는 계속 memory storage를 선택할 수 있는지 검증한다. persistence requirement를 environment 문자열 표기 하나가 아니라 deployment semantics에 고정한다.

## fix(protocol): 채팅 scope와 room 식별자 조합 제한
`chat.send`를 scope-discriminated protocol로 모델링한다. lobby message는 `roomId`를 포함하면 안 되고 match message는 UUID room 식별자를 반드시 가져야 한다. server, browser sender, test, smoke traffic을 함께 갱신해 invalid scope/room 조합을 downstream normalization에 맡기지 않고 parsing 이후 표현 자체가 불가능하게 한다.

## test(protocol): 채팅 scope와 room 조합 검증
version-one parser가 어떤 room field든 포함한 lobby message와 valid UUID가 없는 match message를 거부한다는 negative protocol case를 추가한다. authorization이나 persistence code가 event를 보기 전에 discriminated-union boundary를 보호한다.

## fix(db): 채팅 행의 scope와 room 불변식 강제
migration 006을 추가해 lobby row를 정규화하고 복구할 수 없는 invalid match/scope row를 제거한 뒤, 각 scope에 맞는 room 표현을 강제하는 database check constraint를 설치한다. PostgreSQL과 memory repository 모두 insertion 전에 동일 invariant를 검증하므로 runtime과 durable storage가 일치한다.

## test(db): 채팅 저장 불변식 검증
두 repository 구현에서 chat scope/room consistency를 검증한다. memory insertion은 invalid combination을 거부하고 PostgreSQL migration test는 legacy cleanup, check-constraint enforcement, idempotent reapplication을 다룬다. new write와 upgraded database를 모두 보호한다.

## fix(game): 매치 채팅의 좌석과 audience 검증
client가 보낸 identifier를 신뢰하지 않고 authoritative room 기준으로 match chat을 authorize한다. GameHub는 room이 존재하고 client가 해당 room에 attach되어 있으며 `sideFor`가 seat ownership을 증명하는 경우에만 persistence를 허용한다. match message는 그 room에만 broadcast한다. lobby message는 계속 global broadcast하지만 repository 경계에서는 null room으로 정규화한다.

## test(game): 타 경기방 채팅 주입 차단 검증
동시에 room 두 개를 만들어 player가 다른 match에 chat을 주입할 수 없는지 검증한다. forged send는 persistence나 broadcast 전에 실패해야 하고 legitimate match chat은 owning room에만 도달해야 한다. lobby chat은 normalized null room 식별자를 사용하면서 계속 global로 전달되어야 한다.

## fix(web): 현재 경기방의 채팅만 표시
inbound `chat.message` event가 game reducer에 도달하기 전에 pure `isChatForActiveRoom` predicate로 filter한다. `roomId`가 현재 game과 일치하는 match-scoped message만 유지해 lobby 또는 다른 room traffic이 active match chat panel에 섞이지 않도록 한다.

## test(web): 매치 채팅 room filtering 검증
room filter를 전체 boundary에서 unit test한다. 정확한 active-room match message만 통과하고 다른 room, lobby scope, active room 부재는 모두 실패해야 한다. 관련 없는 chat event가 동일 WebSocket을 공유해도 client-side audience isolation을 유지한다.

## fix(game): 일시정지 시 paddle 입력 상태 초기화
유효한 pause transition에서 paused state를 broadcast하기 전에 public snapshot의 paddle velocity와 simulation 내부 direction을 모두 비운다. rendered/authoritative input 표현을 동기화해 pause 전에 누르고 있던 direction이 resume 후 암묵적으로 movement를 다시 시작하지 않도록 한다.

## test(game): pause 전 입력이 재개 뒤 남지 않음 검증
controlled clock을 사용해 GameHub를 통해 movement, pause, neutral input, resume을 순서대로 실행한다. 관찰한 authoritative snapshot은 경계 전체에서 paddle velocity 0을 보고해야 하며 pre-pause direction이 resumed simulation에 남지 않음을 증명한다.

## fix(game): 경기 결과 저장 실패를 재시도 가능한 상태로 유지
persistence가 실패해도 finished room을 유지하고 안정적인 idempotency key로 `finalizeMatch`를 retry한다. exponential backoff는 250ms에서 시작해 최대 5초로 제한한다. retry timer는 room에 귀속하고 abandon/close/remove 시 해제한다. transient failure에서는 reservation을 더 이상 release하지 않으며 drain은 finishing promise를 기다린다.

## test(game): 일시적인 경기 결과 저장 실패 복구 검증
새 fake-timer GameHub test에서 첫 `finalizeMatch`는 실패하고 다음 시도는 성공하도록 만든다. 동일한 room-derived `resultKey`가 사용되고 premature `game.finished`나 room removal이 없어야 하며 observer event가 failure 후 success 순으로 발생하는지 확인한다. retry가 성공할 때까지 `beginDrain`도 pending 상태를 유지해야 한다.

## fix(auth): 정지된 사용자의 열린 연결 폐기
admin ban/status handler는 ban을 persistence한 직후 `GameHub.revokeUser`를 호출한다. revocation은 heartbeat/snapshot queue를 중지하고 matchmaking/tournament waiter에서 이탈시키며 input rate gate를 해제하고 connection index를 제거한다. room side는 reconnect reservation으로 보존한 채 close code 4003으로 연결을 닫고 presence를 broadcast한다. unban에서는 revoke하지 않는다.

## test(auth): 계정 정지의 기존 WebSocket 차단 검증
admin test에서 실제 server/socket을 실행한다. ban endpoint 호출 후 기존 socket은 `4003 account suspended`로 닫혀야 하고 old session은 새 ticket을 발급받을 수 없어야 한다(`403`). HTTP와 realtime 전반에서 live revocation이 적용되는지 검증한다.

## fix(realtime): WebSocket transport payload 상한 설정
underlying `ws` server의 `maxPayload`를 기존 8KiB pre-authentication limit과 동일하게 설정한다. transport에서 직접 상한을 강제해 oversized frame을 buffering이나 JSON parsing 전에 거부하고, application-level check에만 의존하지 않으므로 authentication 전후 모두 같은 제한을 적용한다.

## test(realtime): oversized WebSocket frame 거부 검증
실제 WebSocket을 authentication한 뒤 8,193-byte frame을 보내고 close code 1009를 요구한다. application-level pre-authentication guard만 사용할 경우 생길 수 있는 빈틈이 없도록 authenticated transport path에도 payload limit을 고정하는 integration test다.

## fix(runtime): container 종료 유예를 room drain과 정렬
API container의 `stop_grace_period`를 application의 60초 room-drain budget보다 긴 70초로 설정한다. orchestrator가 graceful shutdown 완료 전에 SIGKILL로 escalation하지 않고 active match와 persistence cleanup이 끝날 시간을 보장한다.

## test(docker): API 종료 유예 계약 검증
production Compose duration을 parsing해 API stop grace period가 60초 application drain budget 이상인지 요구한다. deployment 전용 timeout 변경이 shutdown guarantee를 무효화하지 못하도록 하는 static contract다.

## build(security): 프로덕션 의존성 취약점 패치
patched Fastify, Next.js, PostCSS release로 production dependency manifest를 갱신하고 `fast-uri`, `nanoid`, `postcss`, `sharp` 등 vulnerable transitive package에 root override를 추가한다. resulting resolution graph는 lockfile에 기록하고, 검토된 security policy는 직접 작성한 manifest와 override에 유지한다.

## fix(ci): 브라우저 E2E API origin 정렬
browser E2E API origin을 `127.0.0.1`에서 `localhost`로 바꾸되 WebSocket endpoint는 loopback에 유지한다. HTTP login origin을 browser host와 맞춰 host-only session cookie가 동등하지만 서로 다른 host label 사이에서 유실되지 않고 이후 API request에 함께 전달되도록 한다.

## test(ci): 브라우저 E2E cookie origin 계약 검증
`API_BASE_URL`이 정확히 `http://localhost:4000`인지 확인하는 CI contract assertion을 추가한다. 이후 workflow 수정이 `127.0.0.1`을 다시 도입해 authenticated browser request를 깨뜨리지 않도록 cookie-origin fix를 보호한다.

## docs(project): 프로젝트 문서 정리
완성된 server-authoritative design을 중심으로 project README와 architecture, operations, protocol, reconnect, measurement 문서를 재구성한다. 핵심 file과 terminology를 요구하는 executable documentation contract를 추가해 lifecycle이나 operational evidence 변경 후 published engineering description이 조용히 stale 상태로 남지 않도록 한다.
