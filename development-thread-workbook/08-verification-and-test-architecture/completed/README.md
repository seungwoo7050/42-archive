# 08 — Verification and Test Architecture

Repository: `seungwoo7050/42-archive`  
Branch: `web/ft_transcendence`  
Category: `08-verification-and-test-architecture`

## Category boundary

이 category는 **제품 동작을 검증하는 test architecture와 evidence mechanism**을 다룹니다.

포함 범위:

- 공유 HTTP/WebSocket runtime contract와 실제 route 적용 검증
- cookie·one-time ticket·error redaction·transport limit 검증
- 결정적 simulation, fixed-step timing, replay, snapshot backpressure 검증
- GameHub room/reconnect/matchmaking/rollback/finalization-retry 검증
- 실제 PostgreSQL의 migration·transaction·constraint·concurrency·failure injection
- 실행 중 process smoke와 browser end-to-end evidence
- scheduler benchmark, k6 load contract, Toxiproxy fault/recovery report

제외 범위:

- production artifact 생성, Dockerfile/Compose 배포 계약, CI workflow wiring은 category 09의 delivery/release boundary입니다.
- runtime health/metric 구현 자체는 category 07의 observability/service-health boundary입니다.
- browser state/query-cache architecture 자체는 category 06에 남기고, 여기서는 실행 evidence만 다룹니다.
- core simulation·GameHub·auth·persistence 기능의 구현 서사는 각 기능 category에 남기고, 여기서는 해당 invariant를 검증하는 구조와 필요한 fix/test 관계만 추적합니다.

## Phase 1 audit result

초기 draft는 2개 Thread와 31개 참조 SHA로 구성되어 있었습니다. 실제 branch history와 source classification을 다시 대조한 결과 다음 문제가 확인되었습니다.

- deterministic unit tests, PostgreSQL concurrency, process/browser evidence, load/fault evidence가 두 문서에 과도하게 결합되어 있었습니다.
- strict HTTP route 적용, protocol negative regression, auth ticket concurrency, transport hard limit, migration 보존, audit atomicity, GameHub rollback·retry가 누락되거나 구체성이 부족했습니다.
- initial smoke의 bearer/query credential을 최종 auth evidence처럼 읽을 위험이 있었으며, cookie/ticket/v1 교정 관계가 분리되어 있지 않았습니다.
- generic 조사 지시가 exact file/function/test/failure path를 지정하지 않았습니다.

Phase 1에서 이를 7개 독립 engineering story와 46개 SHA로 재구성했습니다. 단순 테스트 개수 확장이 아니라 다음 경계를 기준으로 분리했습니다.

1. executable wire/HTTP contract
2. auth trust handoff와 transport containment
3. deterministic simulation/time/delivery primitive
4. GameHub lifecycle와 recovery ownership
5. PostgreSQL engine-level verification
6. running process와 real browser evidence
7. benchmark/load/fault recovery evidence

모든 참조 SHA는 branch의 433-commit linear classification 범위에 존재하는 항목과 exact commit 조회를 대조했습니다. Commit subject, importance, tags는 `commit/commit-importance.md` 값을 유지했습니다.

## Frozen Thread index

| No. | File | Thread | Commits | Historical range |
| --- | --- | --- | --- | --- |
| 01 | [01-executable-protocol-and-http-contract-verification.md](01-executable-protocol-and-http-contract-verification.md) | 실행 가능한 프로토콜·HTTP 계약 검증 | 6 | `60c38090effc` → `1abbf7dcdde4` |
| 02 | [02-authentication-ticket-failure-containment-and-transport-limits.md](02-authentication-ticket-failure-containment-and-transport-limits.md) | 인증·ticket·실패 격리·transport 상한 검증 | 8 | `d0531791406b` → `1afec49052b6` |
| 03 | [03-deterministic-simulation-timing-and-snapshot-delivery-verification.md](03-deterministic-simulation-timing-and-snapshot-delivery-verification.md) | 결정적 simulation·시간·snapshot 전달 검증 | 6 | `4ef4beeb8611` → `5cd54767858f` |
| 04 | [04-gamehub-lifecycle-reconnect-matchmaking-and-finalization-recovery.md](04-gamehub-lifecycle-reconnect-matchmaking-and-finalization-recovery.md) | GameHub lifecycle·재연결·매칭·결과 저장 복구 검증 | 7 | `4026c3bf72ad` → `8f5b2e86f69b` |
| 05 | [05-postgresql-integration-concurrency-migration-and-failure-injection.md](05-postgresql-integration-concurrency-migration-and-failure-injection.md) | PostgreSQL 통합·동시성·migration·실패 주입 검증 | 7 | `c43b87694b29` → `9106abc10d0e` |
| 06 | [06-process-smoke-and-browser-end-to-end-verification.md](06-process-smoke-and-browser-end-to-end-verification.md) | process smoke·browser end-to-end 검증 | 5 | `9a0562d395db` → `1abda1299ad8` |
| 07 | [07-benchmark-load-and-fault-recovery-verification.md](07-benchmark-load-and-fault-recovery-verification.md) | benchmark·load·fault recovery 검증 | 7 | `aed88c8a93e0` → `335565908920` |

## Commit profile

- Total referenced commits: **46**
- Unique full SHA: **46**
- Importance: **S 2 / A 28 / B 16 / C 0**
- S-level: cookie-only session boundary와 one-time WebSocket ticket handoff
- A-level: 고위험 contract, concurrency, rollback, recovery, resource-limit, deterministic evidence
- B-level: 구체적 단위·smoke·browser·harness 계약과 supporting evidence

## Source-of-truth inspection

Phase 1/2에서 다음 branch-local 자료만 사용했습니다.

- `commit/commit-importance.md`
- `commit/commit-bodies.md`
- `development-thread-workbook/COVERAGE.md`
- 초기 category scaffold 2개
- 각 참조 commit의 exact SHA diff와 해당 시점 변경 파일

다른 branch의 코드·테스트·문서·build logic은 사용하지 않았습니다. Final HEAD 구현을 이전 SHA 설명에 역투영하지 않았습니다.

## Phase 1 freeze

Frozen thread-document set digest:

`53bf51050e35afbebded2bf0e192786d733caf3521cc9d41ccb015befbe4213e`

Digest 입력은 아래 7개 Thread Markdown의 정렬된 `filename:sha256` 목록입니다. README는 digest를 기록하므로 digest 입력에서 제외합니다.

| Frozen Thread file | SHA-256 |
| --- | --- |
| `01-executable-protocol-and-http-contract-verification.md` | `1e94322035cf842a5f94b6f8fb24333e5bd2dc62ddde4501f884df644cb6865b` |
| `02-authentication-ticket-failure-containment-and-transport-limits.md` | `a93b2211242fe80510fe842fcea5dfccc41c62489a73a443e8c5e9c765fac47b` |
| `03-deterministic-simulation-timing-and-snapshot-delivery-verification.md` | `0fbc31fd6061420ecc04bd08ae76dbd647a0433847fe793164117bf54b43f659` |
| `04-gamehub-lifecycle-reconnect-matchmaking-and-finalization-recovery.md` | `beb74a01ddfeec881aa6d53caa7f88fc844feedb7f1f670a4481916a395ecdd0` |
| `05-postgresql-integration-concurrency-migration-and-failure-injection.md` | `058b3460fdc91a5f46c6644a6814defe98bd388005dcccaadf4bf4fd13a39385` |
| `06-process-smoke-and-browser-end-to-end-verification.md` | `63c515fe3438d3c44821e05a12195f311eefb89d3921a37dc3759d1b9435b123` |
| `07-benchmark-load-and-fault-recovery-verification.md` | `4072bcce5acda1f463aa78af65590a4dfcab1ff3c5847f9f3665e003b16901ba` |

Phase 2에서는 이 scaffold의 answer block 내부만 completed 내용으로 채웁니다. Commit map, fixed prompts, source roles, filenames, structure는 변경하지 않습니다.

## Workbook completion and validation

<!-- ANSWER:readme-completion:begin -->
## Phase 2 완료 결과

- Frozen scaffold Thread: 7
- Completed counterpart: 7
- Referenced commits: 46개, 중복 없음
- Importance distribution: S 2 / A 28 / B 16 / C 0
- Relative file set: scaffold와 completed가 정확히 일치
- Fixed commit metadata: SHA, subject, order, importance, tags 일치
- Unfinished answer block: 0
- Frozen scaffold integrity: Phase 2 전후 SHA-256 manifest 일치
- Repository runtime tests: 실행하지 않음
- Artifact-only validation: 실행함
- Packaging: `08-verification-and-test-architecture/scaffold/`와 `completed/`만 포함

### 실행하지 않은 검증

지정 branch의 전체 checkout을 로컬에 materialize하지 못했으므로 다음 명령군은 실행하지 않았습니다.

- `pnpm` unit/integration/smoke test
- Testcontainers PostgreSQL integration
- Playwright browser E2E
- k6 load test
- Toxiproxy fault scenario
- scheduler benchmark

따라서 completed 문서의 test 결과 설명은 각 exact SHA의 test code와 production diff가 구성한 검증 메커니즘에 대한 역사적 검사이며, 실제 pass 기록이 아닙니다.

### 실제로 실행한 artifact 검증

- scaffold/completed 상대 경로 집합 비교
- answer block을 제외한 고정 텍스트 byte comparison
- commit SHA/subject/importance/tags/order comparison
- 46개 full SHA 형식·short SHA uniqueness 검사
- completed placeholder/미완료 marker 검사
- Markdown code fence 균형 검사
- scaffold Phase 2 전후 SHA-256 manifest 비교
- ZIP member allowlist·top-level 구조·CRC 검사
<!-- ANSWER:readme-completion:end -->
