# Development Thread 05: PostgreSQL 통합·동시성·migration·실패 주입 검증

English title: **PostgreSQL Integration, Concurrency, Migration, and Failure Injection**

## Thread 목표

schema-isolated PostgreSQL harness를 기반으로 idempotent finalization, friendship/tournament 경쟁, 역사적 migration 보존, destructive reset guard, 감사 기록 atomicity를 실제 DB semantics로 검증하는 구조를 복원한다.

## 핵심 질문

- memory repository 테스트만으로 row lock·unique constraint·transaction rollback을 증명할 수 없는 이유는 무엇인가?
- schema-per-test 격리와 역순 cleanup은 어떤 test contamination과 failure masking을 막는가?
- 동일 resultKey의 20개 동시 finalization은 exactly-once execution이 아니라 무엇을 증명하는가?
- friendship canonical pair와 tournament capacity serialization은 어떤 race를 막는가?
- migration 검증이 final HEAD schema가 아니라 이전 migration state에서 시작해야 하는 이유는 무엇인가?
- 두 번째 DB write만 실패시키는 CHECK constraint가 atomicity root cause를 어떻게 재현하는가?

## 완료 기준

- Testcontainers·schema/search_path·migration·cleanup ownership을 설명한다.
- memory/PostgreSQL differential test의 공통 contract와 엔진별 근거를 구분한다.
- idempotency, row lock, uniqueness, rollback, migration preservation을 concrete rows로 설명한다.
- destructive reset guard와 admin audit failure injection의 안전 경계를 설명한다.

## Commit map

| 순서 | Commit | Subject | Importance | Tags |
| --- | --- | --- | --- | --- |
| 1 | `c43b87694b29` | `test(db): PostgreSQL integration 환경과 계약 추가` | A | PERSISTENCE, RISK, TEST |
| 2 | `582a1615a2c6` | `test(db): 경기 결과 단일 확정 조건 검증` | A | PERSISTENCE, TOURNAMENT, RISK |
| 3 | `cdaca35ccf7f` | `test(db): friendship와 tournament 경쟁 상태 검증` | A | PERSISTENCE, TOURNAMENT, RISK |
| 4 | `0649b63a1ca9` | `test(db): 인증 migration 중 데이터 보존 검증` | A | AUTH, PERSISTENCE, TEST |
| 5 | `527b5f137425` | `test(db): test database reset guard 검증` | B | PERSISTENCE, TEST |
| 6 | `d0137660cd9f` | `fix(db): 차단 감사 기록을 원자적으로 저장` | A | AUTH, PERSISTENCE, RISK |
| 7 | `9106abc10d0e` | `test(db): 차단 감사 기록 atomicity 검증` | A | AUTH, PERSISTENCE, TEST |

> Commit 순서·subject·importance·tags는 Phase 1 감사 후 동결된 정보입니다. Phase 2에서는 변경하지 않습니다.

## Commit `c43b87694b29` — test(db): PostgreSQL integration 환경과 계약 추가

- Full SHA: `c43b87694b29bcee15291c6a752ecf8db77cb356`
- Subject: `test(db): PostgreSQL integration 환경과 계약 추가`
- Importance: **A**
- Tags: PERSISTENCE, RISK, TEST
- Source-defined role: 실제 PostgreSQL 16에서 migration·seed·repository를 격리 실행할 수 있는 schema-per-test harness와 실패-safe cleanup 계약을 구축한다.

### 정확한 조사 대상

- `packages/db/src/postgres.integration.test.ts`의 Testcontainers PostgreSQL 16 lifecycle을 확인한다.
- 각 테스트가 `test_<32hex>` schema와 `search_path`를 만들고 migration/seed를 그 안에서 실행하는지 확인한다.
- pool/repository/schema/container resource를 어떤 순서로 등록하고 역순 정리하는지 확인한다.
- test callback이 실패해도 schema drop과 client close가 실행되는지 확인한다.
- cleanup 오류가 원래 test 오류를 덮지 않는지, 임시 container 종료가 보장되는지 확인한다.

### 학습자 복원

<!-- ANSWER:c43b87694b29:begin -->
#### 역사적 복원

memory repository 테스트만으로는 PostgreSQL의 transaction, unique constraint, row lock, migration 동작을 증명할 수 없다. 반대로 테스트마다 전체 DB를 공유하면 병렬 실행과 실패 잔여 상태 때문에 결과가 비결정적이 된다.

harness는 한 PostgreSQL 16 Testcontainer를 세션 범위에서 띄우고, 각 테스트에 무작위 `test_<32hex>` schema를 만든다. connection의 `search_path`를 해당 schema로 제한한 뒤 migration과 선택적 seed를 실행하므로 같은 container 안에서도 schema와 migration table이 분리된다.

생성된 pool, repository, schema cleanup, 임시 container 같은 자원은 등록 순서의 역순으로 해제된다. 테스트 callback이 실패해도 finally cleanup을 수행하며, cleanup 중 추가 오류가 생겨도 원래 assertion/error를 잃지 않도록 보존한다. 이는 test harness 자체의 ownership·failure semantics를 명시한다.

이 기반이 있어야 뒤의 concurrency·migration·atomicity 테스트가 실제 PostgreSQL semantics를 신뢰할 수 있다.

#### 이 커밋이 보장하는 것

- 각 integration test가 독립 schema와 migration state를 가진다.
- 실패 경로에서도 DB 자원이 역순으로 정리되고 원래 실패 원인이 보존된다.
- memory 구현이 숨기는 PostgreSQL 고유 동작을 실제 engine에서 검증할 수 있다.

#### 이 커밋이 보장하지 않는 것

- 운영 DB의 데이터 규모·권한·replication을 재현하지 않는다.
- Testcontainers를 실행할 수 없는 환경에서는 suite가 실제로 수행되었다는 증거가 되지 않는다.

#### 전후 관계

이 harness 위에서 `582a1615a2c6`, `cdaca35ccf7f`, `0649b63a1ca9`, `9106abc10d0e`가 실제 transaction/constraint/migration 실패를 검증한다.

#### 증거 성격

- PostgreSQL integration test infrastructure and cleanup contract
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
<!-- ANSWER:c43b87694b29:end -->

## Commit `582a1615a2c6` — test(db): 경기 결과 단일 확정 조건 검증

- Full SHA: `582a1615a2c6de131dffee725f4a17e2223f86c8`
- Subject: `test(db): 경기 결과 단일 확정 조건 검증`
- Importance: **A**
- Tags: PERSISTENCE, TOURNAMENT, RISK
- Source-defined role: 동일 logical match의 반복·동시 finalization과 tournament partial failure가 memory/PostgreSQL 양쪽에서 한 결과로 수렴하는지 검증한다.

### 정확한 조사 대상

- memory와 PostgreSQL에 공통 적용되는 repository contract test 구성을 확인한다.
- 동일 `resultKey`로 20개 concurrent `finalizeMatch`를 실행하는 방식을 확인한다.
- match row, participant counters, ratings, rating-history row가 한 번만 반영되는지 확인한다.
- tournament match linkage가 없을 때 전체 transaction이 rollback되는 사례를 확인한다.
- 두 semifinal이 동시에 끝나도 final bracket row가 하나만 만들어지는지 확인한다.

### 학습자 복원

<!-- ANSWER:582a1615a2c6:begin -->
#### 역사적 복원

atomic finalization 구현은 unique key와 transaction을 사용하지만, 반복 호출·동시 호출·중간 domain failure에서 실제로 수렴하는지 별도 증거가 필요하다. 이 테스트는 memory와 PostgreSQL에 같은 시나리오를 적용해 repository abstraction의 의미를 비교한다.

동일 `resultKey`로 20개 `finalizeMatch`를 병렬 실행한다. 성공 응답은 기존 결과를 되돌려줄 수 있지만, durable match row와 두 participant의 통계·현재 rating·rating history는 한 세트만 생성되어야 한다. PostgreSQL에서는 unique result key와 transaction/row locks가 이를 보장하고 memory 구현은 같은 domain 결과를 모사한다.

tournament match 연결이 유효하지 않은 경우 match와 rating side effect 모두 rollback되어야 한다. 두 semifinal을 동시에 확정하는 사례에서는 finalist 조회와 final insertion이 경쟁해도 final row가 하나만 남고 bracket가 일관되어야 한다.

이 테스트는 exactly-once execution을 주장하지 않는다. 여러 호출이 실행되지만 observable durable effects가 idempotency key로 한 번에 수렴함을 증명한다.

#### 이 커밋이 보장하는 것

- 동일 logical result의 반복·동시 요청이 하나의 durable match와 한 세트의 rating effects로 수렴한다.
- tournament linkage failure가 partial match/rating state를 남기지 않는다.
- 동시 semifinal completion이 duplicate final을 만들지 않는다.

#### 이 커밋이 보장하지 않는 것

- 분산 DB나 process crash 직후 transaction outcome 불확실성까지 재현하지 않는다.
- 서로 다른 resultKey로 같은 실제 경기를 제출하는 semantic duplicate는 별도 상위 invariant가 필요하다.

#### 전후 관계

`e939a50948b2`의 stable retry key가 이 repository idempotency boundary를 사용한다.

#### 증거 성격

- memory/PostgreSQL differential concurrency and rollback regression
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
<!-- ANSWER:582a1615a2c6:end -->

## Commit `cdaca35ccf7f` — test(db): friendship와 tournament 경쟁 상태 검증

- Full SHA: `cdaca35ccf7fa9f86e7a89c16686d852d210fdae`
- Subject: `test(db): friendship와 tournament 경쟁 상태 검증`
- Importance: **A**
- Tags: PERSISTENCE, TOURNAMENT, RISK
- Source-defined role: unordered friendship identity와 tournament 마지막 슬롯이 반복·역방향·동시 요청에서도 memory/PostgreSQL 양쪽에서 일관되는지 검증한다.

### 정확한 조사 대상

- self-friend, repeated request, reversed pair request의 기대 상태를 확인한다.
- canonical `(min_user_id, max_user_id)` 또는 동등한 memory key가 사용되는지 확인한다.
- 마지막 tournament slot에 10개 caller를 동시에 넣어 one success/nine full을 요구하는지 확인한다.
- 최종 entry가 정확히 4명·seed가 unique인지, semifinal이 정확히 2개 생성되는지 확인한다.
- 이미 참가한 사용자의 재요청이 idempotent한지와 DB constraint 직접 위반 사례를 확인한다.

### 학습자 복원

<!-- ANSWER:cdaca35ccf7f:begin -->
#### 역사적 복원

friendship을 방향성 row 두 개로 취급하거나 tournament capacity를 read-then-insert로 구현하면 reversed 요청과 마지막 슬롯 경쟁에서 duplicate/overflow가 생긴다. 테스트는 두 문제를 같은 'domain identity + serialized capacity' 관점에서 검증한다.

friendship은 self 관계를 거부하고, A→B와 B→A를 같은 canonical pair로 본다. 반복·역방향 요청 후 row는 하나이며 상태 전이는 repository 계약에 맞게 수렴한다. memory 구현도 unordered pair key를 사용해 동일 의미를 보존해야 한다.

tournament에는 3명이 먼저 들어간 뒤 10개 caller가 마지막 슬롯을 동시에 요청한다. 정확히 하나만 성공하고 나머지는 full이어야 하며 최종 entry는 4개, seed는 unique, semifinal은 2개다. row lock/constraint가 없는 check-then-insert 구현이면 이 사례에서 실패한다.

이 테스트는 DB constraint와 repository transaction을 모두 관찰하며, 단순 sequential happy path가 잡지 못하는 경쟁 조건을 재현한다.

#### 이 커밋이 보장하는 것

- friendship identity가 방향과 무관하게 하나로 수렴한다.
- tournament capacity와 seed uniqueness가 동시 admission에서도 보존된다.
- memory/PostgreSQL 구현이 같은 domain 결과를 낸다.

#### 이 커밋이 보장하지 않는 것

- 높은 contention에서의 latency나 starvation을 측정하지 않는다.
- 네트워크 retry를 포함한 HTTP layer idempotency는 별도 범위다.

#### 전후 관계

category의 concurrency 검증 축을 match finalization 외 friendship/tournament admission까지 확장한다.

#### 증거 성격

- differential concurrency and constraint regression
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
<!-- ANSWER:cdaca35ccf7f:end -->

## Commit `0649b63a1ca9` — test(db): 인증 migration 중 데이터 보존 검증

- Full SHA: `0649b63a1ca9ee4fb171e5dfc0fdb35802747d14`
- Subject: `test(db): 인증 migration 중 데이터 보존 검증`
- Importance: **A**
- Tags: AUTH, PERSISTENCE, TEST
- Source-defined role: 인증 계약 변경 migration이 기존 session을 의도적으로 폐기하면서 사용자·경기·rating history를 보존하는지 이전 schema 상태에서 검증한다.

### 정확한 조사 대상

- integration harness가 migration 004까지만 적용하도록 구성되는지 확인한다.
- 그 상태에서 users, active session, finalized match, rating history를 삽입하는지 확인한다.
- migration 전 보존 대상 snapshot을 어떤 query로 캡처하는지 확인한다.
- 전체 migration 적용 뒤 session row는 없어지고 users/matches/history는 동일한지 확인한다.
- 최종 HEAD schema를 직접 만든 뒤 결과만 비교하지 않는지 확인한다.

### 학습자 복원

<!-- ANSWER:0649b63a1ca9:begin -->
#### 역사적 복원

authentication transport가 바뀔 때 기존 session을 그대로 유지하면 새 보안 규칙을 우회하는 credential이 남을 수 있다. 그러나 migration이 session과 무관한 사용자·경기 기록까지 삭제하면 데이터 손실이다.

테스트는 최신 schema에서 시작하지 않고 migration 004까지만 적용한 실제 이전 상태를 만든다. users, active session, finalized match, rating history를 넣고 보존 대상 projection을 snapshot한 뒤 나머지 migration을 순서대로 적용한다.

결과는 session row가 0이 되어 강제 재인증되지만 사용자, match, rating-history 데이터는 migration 전과 같아야 한다. 이는 'credential invalidation'과 'domain data preservation'을 동시에 검증한다.

역사적 migration을 실제 순서로 실행하므로 final HEAD schema를 보고 과거 상태를 추정하는 오류를 피한다.

#### 이 커밋이 보장하는 것

- legacy session은 안전하게 만료되고 관련 없는 durable domain data는 보존된다.
- migration set이 실제 이전 상태에서 forward 적용 가능함을 증명한다.

#### 이 커밋이 보장하지 않는 것

- 대규모 운영 데이터에서 migration 시간·lock 영향을 측정하지 않는다.
- rollback/down migration을 검증하지 않는다.

#### 전후 관계

`c43b87694b29`의 schema-isolated PostgreSQL harness를 사용하며 cookie-only 인증 전환의 durable cleanup을 검증한다.

#### 증거 성격

- historical migration preservation regression
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
<!-- ANSWER:0649b63a1ca9:end -->

## Commit `527b5f137425` — test(db): test database reset guard 검증

- Full SHA: `527b5f137425adadc486a6b071581f72c0005b16`
- Subject: `test(db): test database reset guard 검증`
- Importance: **B**
- Tags: PERSISTENCE, TEST
- Source-defined role: 파괴적 test reset이 test 환경과 명확한 대상에서만 실행되고 sibling schema를 보존하는지 검증한다.

### 정확한 조사 대상

- `packages/db/src/testReset.test.ts`에서 `NODE_ENV=test`, `TEST_DATABASE_URL`, PostgreSQL scheme 요구를 확인한다.
- 일반 운영형 database name과 모호한 `search_path`가 거부되는지 확인한다.
- 명확한 test database public schema 또는 exact isolated schema만 허용되는지 확인한다.
- PostgreSQL integration에서 target schema reset·remigrate 후 sibling schema가 유지되는지 확인한다.

### 학습자 복원

<!-- ANSWER:527b5f137425:begin -->
#### 역사적 복원

테스트 편의를 위한 schema drop/reset은 잘못된 URL이나 환경 변수에서 실행되면 운영 데이터 손실로 이어진다. 이 테스트는 destructive operation의 precondition을 fail-closed로 고정한다.

`NODE_ENV=test`, 별도 `TEST_DATABASE_URL`, PostgreSQL URL, 명확한 test database 또는 exact isolated schema를 모두 확인한다. integration 사례는 target만 reset하고 migration을 다시 적용한 뒤 sibling schema의 marker가 남아 있는지 확인한다.

#### 이 커밋이 보장하는 것

- 파괴적 reset target이 명시적 test 범위 밖으로 확장되지 않는다.
- isolated schema reset이 sibling schema를 손상하지 않는다.

#### 이 커밋이 보장하지 않는 것

- DB 사용자의 실제 권한 최소화까지 검증하지 않는다.
- 오퍼레이터가 잘못된 test 명명 규칙을 사용하는 모든 가능성을 제거하지 않는다.

#### 전후 관계

PostgreSQL integration harness의 반복 실행을 안전하게 만드는 test-infrastructure guard다.

#### 증거 성격

- destructive-operation guard regression
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
<!-- ANSWER:527b5f137425:end -->

## Commit `d0137660cd9f` — fix(db): 차단 감사 기록을 원자적으로 저장

- Full SHA: `d0137660cd9feb48e594a78b8db23eb8633d23aa`
- Subject: `fix(db): 차단 감사 기록을 원자적으로 저장`
- Importance: **A**
- Tags: AUTH, PERSISTENCE, RISK
- Source-defined role: 사용자 상태 변경과 대응하는 관리자 감사 기록을 하나의 PostgreSQL transaction으로 묶는다.

### 정확한 조사 대상

- `packages/db/src/index.ts`의 관리자 상태 변경 repository method를 확인한다.
- user `status`/`banned_at` update와 `admin_actions` insert가 같은 `this.db.transaction` callback 안에 있는지 확인한다.
- 두 statement 사이 실패 시 외부로 어떤 오류가 전달되는지 확인한다.
- memory implementation의 동등한 domain behavior와 비교한다.

### 학습자 복원

<!-- ANSWER:d0137660cd9f:begin -->
#### 역사적 복원

이전 경로는 사용자 상태를 먼저 update하고 감사 row를 나중에 insert할 수 있었다. 두 번째 쓰기가 실패하면 계정은 차단되었지만 누가 왜 변경했는지 기록이 없는 비감사 상태가 남는다.

수정은 user update와 `admin_actions` insert를 하나의 `this.db.transaction` 안에서 실행한다. 둘 중 하나라도 실패하면 transaction 전체가 rollback되어 account state와 audit trail이 함께 이전 상태로 돌아간다.

원자성의 기준은 '두 API 호출이 모두 성공했다'가 아니라 같은 DB transaction commit에 포함되는 것이다. 감사 기록은 부가 로그가 아니라 authorization state transition의 일부로 승격된다.

#### 이 커밋이 보장하는 것

- 차단/해제 상태와 감사 row가 함께 commit되거나 함께 rollback된다.
- 감사 불가능한 account state transition을 만들지 않는다.

#### 이 커밋이 보장하지 않는 것

- 외부 로그나 알림 전송까지 같은 transaction에 포함하지 않는다.
- 관리자 권한 자체의 검증은 상위 API 경계 책임이다.

#### 전후 관계

`9106abc10d0e`가 두 번째 insert만 deterministic하게 실패시켜 실제 rollback을 검증한다.

#### 증거 성격

- transaction-boundary atomicity fix
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
<!-- ANSWER:d0137660cd9f:end -->

## Commit `9106abc10d0e` — test(db): 차단 감사 기록 atomicity 검증

- Full SHA: `9106abc10d0e9e191ed388d7879012664f0136bf`
- Subject: `test(db): 차단 감사 기록 atomicity 검증`
- Importance: **A**
- Tags: AUTH, PERSISTENCE, TEST
- Source-defined role: 감사 insert만 실패하도록 임시 DB constraint를 주입해 선행 user update까지 rollback되는지 검증한다.

### 정확한 조사 대상

- PostgreSQL integration test가 `admin_actions.reason`의 특정 값만 거부하는 temporary CHECK constraint를 설치하는지 확인한다.
- user update가 먼저 실행된 뒤 audit insert에서 실패하도록 입력을 구성하는지 확인한다.
- repository call이 reject하는지와 transaction 종료 뒤 user status/banned_at을 재조회하는지 확인한다.
- `admin_actions` row count가 0인지 확인하고 constraint cleanup을 추적한다.

### 학습자 복원

<!-- ANSWER:9106abc10d0e:begin -->
#### 역사적 복원

단순히 transaction API를 사용했다는 코드 검사는 실제 statement 순서와 rollback 결과를 증명하지 못한다. 테스트는 임시 CHECK constraint로 특정 reason의 `admin_actions` insert만 실패시키고, user update는 정상 실행 가능한 입력을 사용한다.

repository call은 constraint violation으로 reject해야 한다. 새 connection/query로 user를 다시 읽었을 때 status는 active, `banned_at`은 null이며 관련 admin action은 0개여야 한다. 즉 두 번째 write의 실패가 첫 번째 write까지 rollback했다.

이 방식은 mock throw보다 실제 PostgreSQL constraint와 transaction semantics를 통과하는 deterministic failure injection이다.

#### 이 커밋이 보장하는 것

- 감사 insert 실패가 사용자 상태 변경까지 실제 DB에서 rollback함을 증명한다.
- partial authorization state가 commit되지 않는다.

#### 이 커밋이 보장하지 않는 것

- DB crash recovery나 network disconnect 직후 commit outcome을 재현하지 않는다.
- 모든 가능한 audit schema constraint를 열거하지 않는다.

#### 전후 관계

`d0137660cd9f`의 previous split-write assumption → transaction fix → DB constraint regression 관계를 완성한다.

#### 증거 성격

- real-PostgreSQL deterministic failure injection
- 저장소 코드·diff 검사로 확인했습니다. 이 workbook 작성 환경에서는 해당 SHA의 repository test command를 실행하지 않았습니다.
<!-- ANSWER:9106abc10d0e:end -->


## Thread-level invariant evolution

다음 표에서 불변식이 도입·확장·교정·검증된 SHA를 구분합니다.

<!-- ANSWER:thread-05-invariants:begin -->
### 복원 결과

| SHA | 변화 | 불변식 |
| --- | --- | --- |
| `c43b87694b29` | 검증 기반 | 각 test는 독립 schema/migration state를 가지며 실패에서도 자원을 역순 정리한다. |
| `582a1615a2c6` | 원자·멱등 결과 | 반복·동시 finalization이 하나의 match/rating/bracket effect로 수렴하고 partial failure는 rollback된다. |
| `cdaca35ccf7f` | 도메인 경쟁 | unordered friendship identity와 tournament capacity/seed가 concurrency에서도 유지된다. |
| `0649b63a1ca9` | 역사적 migration | legacy session은 폐기하되 user/match/rating data는 이전 schema에서 forward migration 후 보존된다. |
| `527b5f137425` | 파괴 작업 guard | reset은 명시 test target에만 적용되고 sibling schema를 보존한다. |
| `d0137660cd9f` | transaction 수정 | user status와 admin audit row가 한 commit/rollback 단위가 된다. |
| `9106abc10d0e` | 실패 주입 회귀 | audit insert constraint failure가 선행 user update까지 실제 PostgreSQL에서 rollback한다. |

각 변화는 이전 커밋의 최종 상태를 다음 커밋이 단순 반복한 것이 아니라, 새 경계를 도입·확장·교정하거나 regression으로 보호한 시점을 나타냅니다.
<!-- ANSWER:thread-05-invariants:end -->

## Failure → Fix → Test 관계

구현 추가를 독립 기능으로 나열하지 말고, 이전 가정과 실제 실패 위험, 수정된 결정, 회귀 증거를 연결합니다.

<!-- ANSWER:thread-05-failure-relations:begin -->
### 복원 결과

| Failure / 이전 가정 | Fix / 결정 | Verification |
| --- | --- | --- |
| 공유 DB/schema로 테스트가 서로 오염되고 cleanup 실패가 원래 오류를 가림 | schema-per-test + tracked reverse cleanup | `c43b87694b29` harness contract |
| 동시 match finalize가 duplicate match/rating/final 생성 | unique result key + transaction + locks | `582a1615a2c6` 20-way concurrency/rollback |
| 역방향 friendship duplicate·last-slot tournament overflow | canonical pair + row-locked admission/constraints | `cdaca35ccf7f` |
| 인증 migration이 session 외 domain data까지 손상 | legacy session delete를 좁은 migration으로 수행 | `0649b63a1ca9` pre-state snapshot comparison |
| audit insert 실패 뒤 user만 차단됨 | `d0137660cd9f` transaction | `9106abc10d0e` temporary CHECK failure injection |
<!-- ANSWER:thread-05-failure-relations:end -->

## Ownership·state·responsibility 변화

자원과 상태를 누가 만들고, 보유하고, 이전하고, 정리하는지 커밋 순서에 따라 정리합니다.

<!-- ANSWER:thread-05-ownership:begin -->
### 복원 결과

| 대상 | 소유자 | 책임·수명 |
| --- | --- | --- |
| PostgreSQL process | Testcontainers session harness | 한 container의 시작·종료를 소유한다. |
| Per-test namespace | generated schema + `search_path` | migration table, data, constraints의 격리를 소유한다. |
| Test resources | tracked cleanup stack | pool/repository/schema/container를 생성 역순으로 해제한다. |
| Logical match identity | `resultKey` unique boundary | 중복 실행을 하나의 durable 결과로 수렴시킨다. |
| Concurrent rows/capacity | PostgreSQL transaction + row locks + constraints | participant/tournament/friendship 경쟁을 직렬화한다. |
| Historical schema evolution | ordered migration set | 이전 state에서 현재 state로 데이터 보존·폐기 정책을 소유한다. |
| Admin status transition | single DB transaction | user row와 audit row를 하나의 commit 단위로 소유한다. |
<!-- ANSWER:thread-05-ownership:end -->

## 최종 Thread 상태

최종 HEAD를 과거 커밋에 투영하지 말고, 위 SHA 순서에서 도달한 보장을 요약합니다.

<!-- ANSWER:thread-05-final-state:begin -->
### 최종 상태

- 고위험 persistence invariant는 실제 PostgreSQL 16의 migration·constraint·transaction·lock semantics에서 검증된다.
- memory와 PostgreSQL은 같은 repository domain 결과를 내지만 엔진 고유 원자성은 PostgreSQL integration으로 별도 증명된다.
- match finalization, friendship, tournament admission이 concurrency에서 중복·초과·partial state를 만들지 않는다.
- 역사적 auth migration은 session만 폐기하고 domain data를 보존하며 reset은 명시 test target 밖으로 확장되지 않는다.
- 관리자 상태와 감사 기록은 deterministic DB failure에서도 함께 rollback된다.
<!-- ANSWER:thread-05-final-state:end -->

## 최종 architecture / execution flow

실제 caller→boundary→state transition→cleanup 흐름을 순서대로 작성합니다.

<!-- ANSWER:thread-05-flow:begin -->
### 최종 실행 흐름

1. PostgreSQL 16 container 시작
2. 테스트별 random schema 생성·`search_path` 설정
3. 필요 migration state까지 적용·fixture 입력
4. repository operation 또는 동시 호출 실행
5. DB row/constraint/transaction 결과를 별도 query로 관찰
6. 실패 포함 callback 종료
7. pool/repository/schema를 역순 cleanup
8. 원래 assertion error를 cleanup error보다 우선 보존
<!-- ANSWER:thread-05-flow:end -->

## 학습 완료 확인

<!-- ANSWER:thread-05-checks:begin -->
### 완료 확인

- [x] schema-per-test가 database-per-test보다 선택된 실용적 이유와 격리 한계를 설명할 수 있다.
- [x] 20개 concurrent call이 '함수가 한 번 실행됨'을 증명하지 않는 이유를 설명할 수 있다.
- [x] migration 004 상태를 직접 만들지 않고 final schema에서 테스트하면 놓치는 것을 설명할 수 있다.
- [x] temporary CHECK constraint가 mock throw보다 강한 atomicity 증거인 이유를 설명할 수 있다.
- [x] reset guard가 환경 변수·URL·schema 이름을 모두 확인해야 하는 이유를 설명할 수 있다.

체크는 repository code inspection을 통해 설명이 문서에 작성되었음을 뜻합니다. 실제 repository test suite 실행 완료를 뜻하지 않습니다.
<!-- ANSWER:thread-05-checks:end -->

## 실행 증거 기록

<!-- ANSWER:thread-05-execution:begin -->
- Historical inspection: 각 참조 SHA의 GitHub commit diff와 변경 파일을 개별 조회했습니다.
- Repository test execution: 실행하지 않았습니다. 로컬 환경에서 지정 branch의 전체 checkout을 materialize하지 못해 pnpm, PostgreSQL, Playwright, k6, Toxiproxy 명령 결과를 만들 수 없었습니다.
- Runtime claims: 기록하지 않았습니다. 위의 `증거 성격`은 test 구현과 production code path에 대한 정적·역사적 검사입니다.
- Artifact validation: scaffold/completed 대응, fixed metadata, answer completion, SHA uniqueness, Markdown fence, ZIP 구조는 로컬 검증 스크립트로 검사했습니다.
<!-- ANSWER:thread-05-execution:end -->
