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
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
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
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
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
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
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
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
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
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
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
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
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
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:9106abc10d0e:end -->


## Thread-level invariant evolution

다음 표에서 불변식이 도입·확장·교정·검증된 SHA를 구분합니다.

<!-- ANSWER:thread-05-invariants:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-05-invariants:end -->

## Failure → Fix → Test 관계

구현 추가를 독립 기능으로 나열하지 말고, 이전 가정과 실제 실패 위험, 수정된 결정, 회귀 증거를 연결합니다.

<!-- ANSWER:thread-05-failure-relations:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-05-failure-relations:end -->

## Ownership·state·responsibility 변화

자원과 상태를 누가 만들고, 보유하고, 이전하고, 정리하는지 커밋 순서에 따라 정리합니다.

<!-- ANSWER:thread-05-ownership:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-05-ownership:end -->

## 최종 Thread 상태

최종 HEAD를 과거 커밋에 투영하지 말고, 위 SHA 순서에서 도달한 보장을 요약합니다.

<!-- ANSWER:thread-05-final-state:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-05-final-state:end -->

## 최종 architecture / execution flow

실제 caller→boundary→state transition→cleanup 흐름을 순서대로 작성합니다.

<!-- ANSWER:thread-05-flow:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-05-flow:end -->

## 학습 완료 확인

<!-- ANSWER:thread-05-checks:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-05-checks:end -->

## 실행 증거 기록

<!-- ANSWER:thread-05-execution:begin -->
> [작성 필요] 위 조사 항목을 해당 SHA의 역사적 코드로 확인하고, 이전 상태·구현/검증 메커니즘·보장·비보장·후속 관계를 작성한다.
<!-- ANSWER:thread-05-execution:end -->
