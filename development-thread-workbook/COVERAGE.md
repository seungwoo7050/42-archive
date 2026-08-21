# Coverage와 분류 기준

## 기준

`web/ft_transcendence`의 importance profile은 root부터 head까지 433개 커밋을 전체 역사로 정의합니다.
이 재설계는 기존 Core Track을 보존하면서 웹 개발과 제품 전달을 9개 카테고리로 확장합니다.

| 카테고리 | Thread | Coverage | 산출 상태 |
| --- | ---: | --- | --- |
| 01-foundations-and-api-boundaries | 4 | workspace/package ownership, shared executable contract, Fastify resource API, strict HTTP/runtime boundary | 새 scaffold |
| 02-persistence-and-data-integrity | 5 | repository abstraction, migration/seed/readiness, row mapping, friendship/tournament concurrency | 새 scaffold |
| 03-identity-authorization-and-account-lifecycle | 3 | session/logout, role/admin authorization, suspension/audit/live revocation | 새 scaffold |
| 04-domain-workflows-and-realtime-features | 7 | tournament, profile/friend/dashboard, lobby/chat, pause/resume, NPC/AI workflow | 새 scaffold |
| 05-core-realtime-architecture | 8 | authoritative simulation, WebSocket auth/protocol, finalization, room/reconnect, matchmaking, guest, runtime | 기존 scaffold + completed |
| 06-browser-application-architecture | 6 | shell/API adapters, connection state/transport, hook, cache, rendering/input, guest browser policy | 새 scaffold |
| 07-runtime-observability-and-service-health | 3 | startup/readiness, metrics/observer boundary, runtime limits/failure containment | 새 scaffold |
| 08-verification-and-test-architecture | 2 | deterministic/concurrency/failure-injection, process/browser/load/fault verification | 새 scaffold |
| 09-production-delivery-and-release-engineering | 5 | production build artifacts, image/runtime composition, reverse proxy, CI delivery verification, runtime/security release contract | 새 scaffold |

## 포함 정책

- S/A 커밋은 핵심 ownership, security, concurrency, lifecycle, failure evidence를 형성하면 Commit map에 우선 포함합니다.
- B 커밋은 기능의 생성 → 통합 → fix → verification 흐름을 이해하는 데 필요할 때 포함합니다.
- C 커밋과 동일 책임 안의 반복적·기계적 변경은 독립 Thread를 만들지 않고 관련 Thread의 context로 확인합니다.
- 기존 8개 Thread의 SHA·순서·subject·importance·tags는 변경하지 않습니다.
- 새 Thread는 source profile에 이미 분류된 commit metadata를 사용하며, 실제 코드 설명은 learner가 exact SHA에서 채웁니다.

## 제품 전달 포함과 카테고리 경계

- production package/build artifact는 `09`에서 다룹니다.
- Docker image, Compose/Caddy packaging과 runtime composition은 `09`에서 다룹니다.
- production process/browser CI job과 release contract는 `09`에서 다룹니다.
- runtime/dependency security patch는 release reproducibility 관점에서 `09`에서 다룹니다.
- 같은 test/CI SHA가 `08`에도 있으면 `08`은 **검증 기법과 증명 범위**, `09`는 **전달 artifact/process contract**를 중심으로 조사합니다.
- readiness, drain, metrics 자체의 application semantics는 `07`에 남기고, 그것이 image/Compose/process delivery와 연결되는 지점만 `09`에서 교차 참조합니다.


## 교차 참조된 SHA

같은 commit이 여러 Thread에서 나타나는 것은 중복 설계가 아니라 서로 다른 학습 질문을 위한 교차 참조입니다. 한 문서에서는 primary implementation, 다른 문서에서는 integration 또는 test-evidence 관점으로 조사합니다.

| SHA | 참조 문서 | 이유 |
| --- | --- | --- |
| `0364c42f776b` | `02-persistence-and-data-integrity/01-repository-abstraction-backend-parity-and-read-models.md`<br>`04-domain-workflows-and-realtime-features/03-profile-friendship-dashboard-and-ranking-journeys.md` | 교차 영역의 동일 historical evidence |
| `051eac1b4aee` | `04-domain-workflows-and-realtime-features/03-profile-friendship-dashboard-and-ranking-journeys.md`<br>`06-browser-application-architecture/01-application-shell-resource-screens-and-api-adapters.md` | 교차 영역의 동일 historical evidence |
| `0649b63a1ca9` | `03-identity-authorization-and-account-lifecycle/01-server-session-logout-and-auth-migrations.md`<br>`08-verification-and-test-architecture/01-deterministic-contract-concurrency-and-failure-injection-tests.md` | 교차 영역의 동일 historical evidence |
| `06d2eb7a93cc` | `05-core-realtime-architecture/07-guest-mode-as-isolated-transient-trust-domain.md`<br>`06-browser-application-architecture/06-guest-browser-policy-and-transient-results.md` | 교차 영역의 동일 historical evidence |
| `0afc0a0694bd` | `04-domain-workflows-and-realtime-features/03-profile-friendship-dashboard-and-ranking-journeys.md`<br>`06-browser-application-architecture/01-application-shell-resource-screens-and-api-adapters.md` | 교차 영역의 동일 historical evidence |
| `0bcc487d949f` | `01-foundations-and-api-boundaries/02-executable-http-contracts-and-resource-api.md`<br>`04-domain-workflows-and-realtime-features/03-profile-friendship-dashboard-and-ranking-journeys.md` | 교차 영역의 동일 historical evidence |
| `1122e6a4b901` | `05-core-realtime-architecture/06-matchmaking-reservation-ownership-and-rollback.md`<br>`04-domain-workflows-and-realtime-features/07-npc-ai-policy-and-fallback-journey.md` | 교차 영역의 동일 historical evidence |
| `1779df300611` | `05-core-realtime-architecture/02-cookie-identity-websocket-admission.md`<br>`01-foundations-and-api-boundaries/02-executable-http-contracts-and-resource-api.md`<br>`03-identity-authorization-and-account-lifecycle/01-server-session-logout-and-auth-migrations.md` | 교차 영역의 동일 historical evidence |
| `2b274686e6d4` | `05-core-realtime-architecture/07-guest-mode-as-isolated-transient-trust-domain.md`<br>`01-foundations-and-api-boundaries/04-runtime-mode-cors-and-network-trust.md` | 교차 영역의 동일 historical evidence |
| `2f05d5d79c64` | `02-persistence-and-data-integrity/02-migration-seed-readiness-and-reset-lifecycle.md`<br>`07-runtime-observability-and-service-health/01-startup-liveness-readiness-and-storage-state.md` | 교차 영역의 동일 historical evidence |
| `30aac132e14e` | `02-persistence-and-data-integrity/02-migration-seed-readiness-and-reset-lifecycle.md`<br>`07-runtime-observability-and-service-health/01-startup-liveness-readiness-and-storage-state.md` | 교차 영역의 동일 historical evidence |
| `4633dfde208d` | `01-foundations-and-api-boundaries/04-runtime-mode-cors-and-network-trust.md`<br>`07-runtime-observability-and-service-health/01-startup-liveness-readiness-and-storage-state.md` | 교차 영역의 동일 historical evidence |
| `4b43a284e637` | `01-foundations-and-api-boundaries/01-workspace-package-and-composition-boundaries.md`<br>`07-runtime-observability-and-service-health/01-startup-liveness-readiness-and-storage-state.md` | 교차 영역의 동일 historical evidence |
| `4f5199097284` | `05-core-realtime-architecture/05-room-lifecycle-connection-replacement-and-recovery.md`<br>`06-browser-application-architecture/06-guest-browser-policy-and-transient-results.md` | 교차 영역의 동일 historical evidence |
| `527b5f137425` | `02-persistence-and-data-integrity/02-migration-seed-readiness-and-reset-lifecycle.md`<br>`08-verification-and-test-architecture/01-deterministic-contract-concurrency-and-failure-injection-tests.md` | 교차 영역의 동일 historical evidence |
| `5cac4843fd9b` | `02-persistence-and-data-integrity/02-migration-seed-readiness-and-reset-lifecycle.md`<br>`07-runtime-observability-and-service-health/01-startup-liveness-readiness-and-storage-state.md` | 교차 영역의 동일 historical evidence |
| `78cf83f29e80` | `01-foundations-and-api-boundaries/02-executable-http-contracts-and-resource-api.md`<br>`08-verification-and-test-architecture/01-deterministic-contract-concurrency-and-failure-injection-tests.md` | 교차 영역의 동일 historical evidence |
| `7b0b5f086b41` | `05-core-realtime-architecture/08-runtime-timing-backpressure-drain-and-operational-evidence.md`<br>`08-verification-and-test-architecture/02-process-browser-load-and-fault-evidence.md` | 교차 영역의 동일 historical evidence |
| `85ac2a949439` | `01-foundations-and-api-boundaries/04-runtime-mode-cors-and-network-trust.md`<br>`07-runtime-observability-and-service-health/01-startup-liveness-readiness-and-storage-state.md` | 교차 영역의 동일 historical evidence |
| `8a8787d03a19` | `05-core-realtime-architecture/03-versioned-realtime-protocol-and-monotonic-state.md`<br>`06-browser-application-architecture/05-authoritative-snapshot-rendering-and-input.md` | 교차 영역의 동일 historical evidence |
| `9106abc10d0e` | `03-identity-authorization-and-account-lifecycle/03-suspension-audit-atomicity-and-live-revocation.md`<br>`08-verification-and-test-architecture/01-deterministic-contract-concurrency-and-failure-injection-tests.md` | 교차 영역의 동일 historical evidence |
| `c43b87694b29` | `02-persistence-and-data-integrity/01-repository-abstraction-backend-parity-and-read-models.md`<br>`08-verification-and-test-architecture/01-deterministic-contract-concurrency-and-failure-injection-tests.md` | 교차 영역의 동일 historical evidence |
| `c5b96a06925c` | `02-persistence-and-data-integrity/01-repository-abstraction-backend-parity-and-read-models.md`<br>`04-domain-workflows-and-realtime-features/03-profile-friendship-dashboard-and-ranking-journeys.md` | 교차 영역의 동일 historical evidence |
| `c7ea1ff241c8` | `02-persistence-and-data-integrity/01-repository-abstraction-backend-parity-and-read-models.md`<br>`04-domain-workflows-and-realtime-features/03-profile-friendship-dashboard-and-ranking-journeys.md` | 교차 영역의 동일 historical evidence |
| `cb295396771f` | `04-domain-workflows-and-realtime-features/03-profile-friendship-dashboard-and-ranking-journeys.md`<br>`06-browser-application-architecture/01-application-shell-resource-screens-and-api-adapters.md` | 교차 영역의 동일 historical evidence |
| `cbe876359d31` | `04-domain-workflows-and-realtime-features/03-profile-friendship-dashboard-and-ranking-journeys.md`<br>`06-browser-application-architecture/01-application-shell-resource-screens-and-api-adapters.md` | 교차 영역의 동일 historical evidence |
| `cdaca35ccf7f` | `02-persistence-and-data-integrity/04-canonical-friendship-and-concurrent-requests.md`<br>`02-persistence-and-data-integrity/05-tournament-admission-and-capacity-concurrency.md`<br>`08-verification-and-test-architecture/01-deterministic-contract-concurrency-and-failure-injection-tests.md` | 교차 영역의 동일 historical evidence |
| `e1a0316fbe84` | `02-persistence-and-data-integrity/02-migration-seed-readiness-and-reset-lifecycle.md`<br>`07-runtime-observability-and-service-health/01-startup-liveness-readiness-and-storage-state.md` | 교차 영역의 동일 historical evidence |
| `e8bb6a4bf68b` | `01-foundations-and-api-boundaries/02-executable-http-contracts-and-resource-api.md`<br>`03-identity-authorization-and-account-lifecycle/02-explicit-role-and-administrator-authorization.md` | 교차 영역의 동일 historical evidence |
| `eb675ef74af3` | `01-foundations-and-api-boundaries/04-runtime-mode-cors-and-network-trust.md`<br>`07-runtime-observability-and-service-health/01-startup-liveness-readiness-and-storage-state.md` | 교차 영역의 동일 historical evidence |

## 완료 상태

- 카테고리: 9
- 총 Thread: 43
- scaffold Thread 문서에서 참조되는 unique SHA: 344
- `05-core-realtime-architecture`: scaffold + completed
- `01`–`04`, `06`–`09`: scaffold only
- 새 `09` scaffold에는 실행 결과를 미리 작성하지 않았습니다.
