# Metrics observer boundary와 cardinality

- 카테고리: `07-runtime-observability-and-service-health` — 런타임 관측성과 서비스 상태
- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/ft_transcendence`
- Phase 1 상태: frozen authoritative scaffold

## 1. Thread 목표

runtime, HTTP, repository, room/reconnect, finalization, snapshot delivery, event-loop lag를 Prometheus에 노출하되 domain code와 high-cardinality identity를 metric label에 결합하지 않는 구조를 복원합니다.

범위 메모: 민감 로그 redaction(`4c7e884bc9b0`)은 observability tag를 갖지만 주된 invariant가 인증 credential 비노출이므로 identity/security 카테고리에 남기고, 여기서는 metric cardinality와 observer ownership만 다룹니다.

### 직접 연결되는 불변식

- 관측 코드는 domain state machine 내부 규칙을 소유하거나 변경하지 않습니다.
- metric label은 bounded vocabulary를 사용해 cardinality가 user/room 수에 비례하지 않습니다.
- delivery/finalization/readiness metric은 해당 결과가 실제 결정되는 경계에서 기록됩니다.
- collector와 event-loop histogram의 lifetime은 Fastify app lifetime과 함께 종료됩니다.

## 2. 핵심 질문

- metric registry와 collector lifecycle은 app startup/close에서 누가 소유합니까?
- HTTP raw URL 대신 route template을 label로 사용하는 이유는 무엇입니까?
- repository proxy가 method return type, `this`, throw/rejection semantics를 보존합니까?
- room/user/request ID를 metric label로 쓰지 않으면서 correlation은 log/observer에서 어떻게 유지합니까?
- snapshot drop과 send callback delay를 측정하는 위치가 실제 semantics owner와 일치합니까?
- event-loop p95가 load harness에 전달될 때 missing sample을 어떻게 fail-closed 처리합니까?

## 3. 완료 기준

- Commit map의 모든 SHA를 `web/ft_transcendence` ancestry에서 확인합니다.
- 각 SHA의 parent 또는 직전 관련 SHA와 비교해 당시 상태만 설명합니다.
- 파일, symbol, caller/callee, 상태 mutation, ownership, cleanup, failure branch를 실제 코드로 기록합니다.
- Fix는 이전 가정과 root cause를, test/benchmark는 production path와 증명·비증명 범위를 연결합니다.
- 실행하지 않은 command나 benchmark 수치를 runtime evidence로 기록하지 않습니다.
- 마지막 selected SHA까지만 사용해 Thread 최종 owner, invariant, execution flow를 작성합니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Thread 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `6bf29a5acf35` | `build(api): metrics 수집 의존성 추가` | C | - | `prom-client`를 API의 명시적 runtime dependency로 추가합니다. |
| 2 | `69278d8fc456` | `feat(metrics): runtime gauge registry 추가` | B | REALTIME, OPERATIONS, OBSERVABILITY | Node collector와 live GameHub gauge를 위한 전용 registry를 만듭니다. |
| 3 | `02b3b3a32f14` | `feat(metrics): HTTP와 readiness 측정 추가` | B | OPERATIONS, OBSERVABILITY, PERF | normalized route/method/status로 request duration과 readiness를 측정합니다. |
| 4 | `843d355afc69` | `feat(metrics): repository operation 측정 추가` | B | PERSISTENCE, OBSERVABILITY | transparent proxy로 sync/async repository method duration/result를 측정합니다. |
| 5 | `e08367a1be5e` | `feat(metrics): game room과 reconnect 관측 추가` | B | AUTH, PROTOCOL, REALTIME | GameHub lifecycle 주변 observer로 room/reconnect event를 관측합니다. |
| 6 | `e850b3356b9b` | `feat(metrics): match finalization 결과 관측 추가` | B | REALTIME, PERSISTENCE, OBSERVABILITY | guest memory result와 DB-backed finalization success/failure를 구분해 측정합니다. |
| 7 | `c0d184bcc928` | `feat(metrics): snapshot delivery와 drop 관측 추가` | B | REALTIME, OBSERVABILITY, PERF | latest-buffer가 실제 delivery/drop을 결정하는 지점에서 측정합니다. |
| 8 | `685d85c863a4` | `test(metrics): database와 snapshot 지표 검증` | B | AUTH, REALTIME, PERSISTENCE | user/room ID를 label로 만들지 않고 DB/realtime behavior를 관측하는지 검증합니다. |
| 9 | `1baf4c5a57ba` | `feat(metrics): event-loop lag 측정 추가` | B | OBSERVABILITY | Node event-loop delay histogram의 p95를 gauge로 노출합니다. |
| 10 | `66b8f07c2387` | `test(load): event-loop lag를 부하 profile에 노출` | B | OPERATIONS, OBSERVABILITY, PERF | load overlay에서 metrics endpoint를 loopback에 노출하고 k6 teardown이 server p95를 수집합니다. |
| 11 | `697a63ebb8c8` | `test(load): event-loop lag 임계값 검증` | B | OPERATIONS, OBSERVABILITY, PERF | 50ms p95 threshold, required metric, loopback metrics exposure를 contract test로 고정합니다. |

## 5. Commit별 학습 기록

### 5.1. `build(api): metrics 수집 의존성 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `6bf29a5acf35` |
| Importance | C |
| Tags | - |
| Source에서 확정된 역할 | `prom-client`를 API의 명시적 runtime dependency로 추가합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/package.json`, `pnpm-lock.yaml`
- 핵심 symbol: API dependency `prom-client@^15.1.3`와 lockfile resolution
- API package의 dependency 구역과 lockfile importer가 같은 버전을 가리키는지 확인합니다.
- 이 SHA에는 collector나 route가 없고 다음 commit을 가능하게 하는 기계적 준비라는 범위를 기록합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:6bf29a5acf35:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 맥락 | API package에는 Prometheus registry·metric type을 제공하는 runtime dependency가 없었습니다. |
| 구체적 역할 | API package에 `prom-client`를 추가하고 lockfile을 갱신합니다. |
| 보장/제한 | API가 `prom-client`를 직접 import할 수 있습니다. metric 생성·노출·cleanup 동작은 아직 없습니다. |
| 후속 연결 | `69278d8fc456`가 이 의존성으로 전용 registry를 만듭니다. |
<!-- LEARNER-END:6bf29a5acf35:record -->




#### 비교 기준

- 이 commit의 parent 상태와 비교합니다.
- 다음 관련 SHA: `69278d8fc456` — `feat(metrics): runtime gauge registry 추가`

### 5.2. `feat(metrics): runtime gauge registry 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `69278d8fc456` |
| Importance | B |
| Tags | REALTIME, OPERATIONS, OBSERVABILITY |
| Source에서 확정된 역할 | Node collector와 live GameHub gauge를 위한 전용 registry를 만듭니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/observability.ts`
- 핵심 symbol: `ApiMetrics`, private `Registry`, `collectDefaultMetrics`, `scrape`, `close`
- `ApiMetrics`가 global registry가 아니라 private `Registry`를 만들고 모든 gauge를 그 registry에 등록하는지 확인합니다.
- `scrape()`가 `readGameStats` callback을 호출한 시점의 online/queued/room 값을 gauge에 set한 뒤 serialization하는 순서를 추적합니다.
- `close()`가 registry를 clear하고 app lifetime과 collector lifetime을 맞추는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:69278d8fc456:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태와 문제 | GameHub의 live state와 Node runtime 상태를 scrape 가능한 형태로 보유하는 객체가 없었습니다. global singleton metric을 쓰면 test/app instance 사이 collector 중복과 lifetime 누수가 생기며, game state를 metric object가 직접 소유하면 domain state와 관측 state가 결합됩니다. |
| 구현 또는 검증 결정 | `ApiMetrics`가 전용 `Registry`를 소유하고 Node default metrics, connection·queue·room gauge를 등록합니다. GameHub 상태는 생성자에 주입된 `readGameStats` callback으로 scrape 시점에 읽습니다. |
| 실행/검증 경로 | scrape 요청 → callback으로 live stats 읽기 → gauge set → private registry serialize입니다. |
| ownership과 failure 처리 | app instance마다 `ApiMetrics`와 registry가 하나씩 존재합니다. GameHub는 상태를 소유하고 metrics는 read callback만 보유하며 `close()`가 registry를 정리합니다. callback이나 registry serialization 오류는 `scrape()` reject로 남습니다. metric은 domain state를 변경하지 않습니다. |
| 보장하는 것 | Node와 live GameHub 상태를 app-local registry에서 수집할 기반이 생깁니다. |
| 보장하지 않는 것 | HTTP endpoint와 request/repository/realtime outcome 측정은 아직 연결되지 않습니다. |
| 후속 연결 | `02b3b3a32f14`가 app lifecycle과 `/metrics` route에 연결합니다. |
<!-- LEARNER-END:69278d8fc456:record -->




#### 비교 기준

- 직전 관련 SHA: `6bf29a5acf35` — `build(api): metrics 수집 의존성 추가`
- 다음 관련 SHA: `02b3b3a32f14` — `feat(metrics): HTTP와 readiness 측정 추가`

### 5.3. `feat(metrics): HTTP와 readiness 측정 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `02b3b3a32f14` |
| Importance | B |
| Tags | OPERATIONS, OBSERVABILITY, PERF |
| Source에서 확정된 역할 | normalized route/method/status로 request duration과 readiness를 측정합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/observability.ts`, `apps/api/src/app.ts`
- 핵심 symbol: HTTP duration histogram, readiness histogram/counter, `/metrics`, `onResponse` hook
- request label이 raw URL이 아니라 `request.routeOptions.url` 또는 bounded fallback을 쓰는지 확인합니다.
- duration을 high-resolution elapsed time에서 seconds로 바꾸고 음수를 clamp하는 helper와 status/method label을 확인합니다.
- `buildApp`이 metrics를 만들고 `onResponse`, readiness route, `/metrics`, `onClose`에 연결하는 lifetime을 추적합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:02b3b3a32f14:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태와 문제 | registry는 있었지만 scrape route가 없고 HTTP·readiness 결과가 운영 지표에 남지 않았습니다. raw URL이나 request ID를 label로 쓰면 요청 수에 비례해 시계열이 증가합니다. 또한 health route의 결과와 요청 duration을 실제 응답 경계에서 기록해야 합니다. |
| 구현 또는 검증 결정 | Fastify `onResponse`에서 normalized route template, method, status code로 request duration을 기록합니다. readiness 실행 시간·결과를 별도로 기록하고 `/metrics`가 registry content type과 body를 반환하도록 연결합니다. |
| 실행/검증 경로 | request 시작 시각 보관 → route 실행 → `onResponse`에서 elapsed seconds 기록; `/health/ready`는 repository 결과를 응답으로 바꾸며 readiness metric도 기록; `/metrics`는 scrape합니다. |
| ownership과 failure 처리 | Fastify app이 `ApiMetrics`를 생성·close하고 hook/route가 같은 인스턴스를 공유합니다. unmatched route는 제한된 fallback label을 사용하며 negative elapsed는 0으로 clamp됩니다. scrape 실패를 masking하지는 않습니다. |
| 보장하는 것 | HTTP와 readiness의 latency/outcome이 bounded labels로 노출됩니다. |
| 보장하지 않는 것 | repository method와 GameHub 내부 outcome은 아직 HTTP metric으로만 간접 관찰됩니다. |
| 후속 연결 | `843d355afc69`부터 결과가 결정되는 내부 경계에 observer를 추가합니다. |
<!-- LEARNER-END:02b3b3a32f14:record -->



#### 최소 코드 근거

<!-- LEARNER-BEGIN:02b3b3a32f14:snippet -->
- SHA: `02b3b3a32f14`
- 위치: `apps/api/src/observability.ts`; HTTP duration histogram, readiness histogram/counter, `/metrics`, `onResponse` hook

```ts
const route = request.routeOptions.url ?? "unmatched";
metrics.observeRequest(route, request.method, reply.statusCode, elapsedSeconds);
```
<!-- LEARNER-END:02b3b3a32f14:snippet -->

#### 비교 기준

- 직전 관련 SHA: `69278d8fc456` — `feat(metrics): runtime gauge registry 추가`
- 다음 관련 SHA: `843d355afc69` — `feat(metrics): repository operation 측정 추가`

### 5.4. `feat(metrics): repository operation 측정 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `843d355afc69` |
| Importance | B |
| Tags | PERSISTENCE, OBSERVABILITY |
| Source에서 확정된 역할 | transparent proxy로 sync/async repository method duration/result를 측정합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/observability.ts`, `apps/api/src/app.ts`
- 핵심 symbol: `instrumentRepository`, `Proxy.get`, bounded `REPOSITORY_OPERATIONS`, success/failure observer
- proxy가 known repository method만 bounded operation label로 쓰고 나머지는 `other`로 축약하는지 확인합니다.
- method 호출 시 receiver/`this`를 원본 repository로 보존하는 `Reflect`/`apply` 경로를 확인합니다.
- 동기 throw와 Promise resolve/reject가 각각 한 번만 duration/outcome으로 기록되고 원래 반환·예외 semantics를 보존하는지 추적합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:843d355afc69:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태와 문제 | HTTP route duration은 알 수 있었지만 database/repository 작업별 latency와 실패를 실제 repository 호출 경계에서 구분할 수 없었습니다. caller마다 측정 코드를 넣으면 누락과 중복이 생기고, wrapper가 sync/async 반환이나 `this` binding을 바꾸면 production behavior가 달라집니다. |
| 구현 또는 검증 결정 | repository를 `Proxy`로 감싸 함수 호출을 측정하되 원본 receiver와 반환값을 보존합니다. 동기 throw는 catch에서, Promise는 resolve/reject handler에서 outcome을 기록합니다. |
| 실행/검증 경로 | caller → proxy property get → 원본 method apply → sync 결과/throw 또는 Promise settle → metric 기록 → 원래 결과 전달입니다. |
| ownership과 failure 처리 | source repository가 connection과 data state를 계속 소유합니다. proxy는 측정 wrapper일 뿐 `close`를 포함한 모든 method를 원본에 위임합니다. 동기 예외와 비동기 rejection 모두 `failure`로 기록한 뒤 그대로 다시 전달합니다. operation label은 bounded vocabulary 밖이면 `other`입니다. |
| 보장하는 것 | repository behavior를 바꾸지 않으면서 operation별 success/failure duration을 관찰합니다. |
| 보장하지 않는 것 | transaction 내부 SQL statement별 latency나 query cardinality까지는 보여 주지 않습니다. |
| 후속 연결 | `685d85c863a4`가 실제 database metric과 label 비노출을 검증합니다. |
<!-- LEARNER-END:843d355afc69:record -->




#### 비교 기준

- 직전 관련 SHA: `02b3b3a32f14` — `feat(metrics): HTTP와 readiness 측정 추가`
- 다음 관련 SHA: `e08367a1be5e` — `feat(metrics): game room과 reconnect 관측 추가`

### 5.5. `feat(metrics): game room과 reconnect 관측 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `e08367a1be5e` |
| Importance | B |
| Tags | AUTH, PROTOCOL, REALTIME |
| Source에서 확정된 역할 | GameHub lifecycle 주변 observer로 room/reconnect event를 관측합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/app.ts`, `apps/api/src/gameHub.ts`
- 핵심 symbol: `GameHubObserver.roomCreated`, `GameHubObserver.reconnect`, client `requestId`, app logging callback
- GameHub가 concrete logger/metric class가 아니라 optional observer callbacks만 받는 constructor boundary를 확인합니다.
- room 생성 시 room/user/request ID는 structured log context로 전달되지만 metric label에는 들어가지 않는 분리를 확인합니다.
- reconnect `success|expired` outcome이 결정된 정확한 state transition 뒤 observer가 호출되는지 추적합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:e08367a1be5e:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태와 문제 | GameHub room/reconnect lifecycle은 동작했지만 어떤 room이 생성되고 복구가 성공/만료됐는지 외부에서 관찰할 hook이 없었습니다. domain state machine 내부에 logger와 metric registry를 직접 넣으면 lifecycle 규칙과 관측 구현이 결합되고, identity를 metric label로 쓰면 cardinality가 무한히 증가합니다. |
| 구현 또는 검증 결정 | GameHub는 선택적 `GameHubObserver`를 받고 room 생성과 reconnect 결과가 확정된 지점에서 bounded outcome 및 correlation context를 전달합니다. app은 outcome만 metric에 넣고 ID는 structured log context로 남깁니다. |
| 실행/검증 경로 | HTTP/WebSocket 인증에서 request/user context 확보 → `hub.connect` → room/reconnect transition → observer callback → app logger/metric 호출입니다. |
| ownership과 failure 처리 | GameHub가 room state와 callback 호출 시점을 소유하고 app이 logging/metrics 구현을 소유합니다. observer는 state를 변경할 권한이 없습니다. observer는 optional이라 미설정 시 domain 동작은 계속됩니다. 이 SHA에서 callback 자체가 throw할 때 containment를 별도로 제공하는지는 확인되지 않습니다. |
| 보장하는 것 | room/reconnect 관측이 state machine 밖의 adapter에 연결되고 metric label은 bounded outcome으로 제한됩니다. |
| 보장하지 않는 것 | structured log의 redaction 정책은 이 Thread 밖의 logging/auth commit이 소유합니다. |
| 후속 연결 | `e850b3356b9b`가 같은 pattern을 finalization outcome에 확장합니다. |
<!-- LEARNER-END:e08367a1be5e:record -->




#### 비교 기준

- 직전 관련 SHA: `843d355afc69` — `feat(metrics): repository operation 측정 추가`
- 다음 관련 SHA: `e850b3356b9b` — `feat(metrics): match finalization 결과 관측 추가`

### 5.6. `feat(metrics): match finalization 결과 관측 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `e850b3356b9b` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE, OBSERVABILITY |
| Source에서 확정된 역할 | guest memory result와 DB-backed finalization success/failure를 구분해 측정합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/app.ts`, `apps/api/src/gameHub.ts`, `apps/api/src/observability.ts`
- 핵심 symbol: `GameHubObserver.matchFinalized`, finalization success/failure branches, persistence/outcome labels
- memory guest result와 database-backed `repo.finalizeMatch` 경로에서 observer context가 어떻게 달라지는지 확인합니다.
- database finalization Promise의 성공과 catch branch가 각각 `success|failure` outcome을 한 번 기록하는지 추적합니다.
- persistence label이 `memory|database`, outcome이 bounded vocabulary이며 match/room ID가 metric label에 없는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:e850b3356b9b:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태와 문제 | repository proxy로 method failure는 볼 수 있었지만 하나의 match finalization이라는 domain 결과가 memory/database에서 어떻게 끝났는지 직접 나타내지 못했습니다. repository operation metric만으로는 retry·duplicate·guest completion과 같은 domain 의미를 복원하기 어렵습니다. |
| 구현 또는 검증 결정 | GameHub finalization 경계에 observer를 추가해 persistence 종류와 success/failure를 기록합니다. memory 결과는 저장소 호출 없이 success로, database 결과는 `finalizeMatch` settle 결과에 따라 기록합니다. |
| 실행/검증 경로 | room terminal state → memory result 생성 또는 repository finalization → 결과 확정 → observer → metric/log adapter입니다. |
| ownership과 failure 처리 | GameHub가 finalization lifecycle과 관찰 시점을 소유하고 repository가 durable write를 소유합니다. metrics는 결과를 복제해 기록할 뿐 성공 여부를 결정하지 않습니다. database reject는 failure metric을 남긴 뒤 기존 retry/cleanup path로 전달됩니다. 관측 기록이 persistence 결과를 success로 바꾸지 않습니다. |
| 보장하는 것 | domain finalization outcome과 persistence 종류를 bounded metric으로 구분합니다. |
| 보장하지 않는 것 | duplicate finalization counter는 `ad482c200cea`의 후속 cadence/finalization 보정에서 추가됩니다. |
| 후속 연결 | `547d9943d30a`가 load harness의 source of truth를 client event에서 이 server metric으로 옮깁니다. |
<!-- LEARNER-END:e850b3356b9b:record -->




#### 비교 기준

- 직전 관련 SHA: `e08367a1be5e` — `feat(metrics): game room과 reconnect 관측 추가`
- 다음 관련 SHA: `c0d184bcc928` — `feat(metrics): snapshot delivery와 drop 관측 추가`

### 5.7. `feat(metrics): snapshot delivery와 drop 관측 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `c0d184bcc928` |
| Importance | B |
| Tags | REALTIME, OBSERVABILITY, PERF |
| Source에서 확정된 역할 | latest-buffer가 실제 delivery/drop을 결정하는 지점에서 측정합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/game/latestSnapshotBuffer.ts`, `apps/api/src/observability.ts`, GameHub wiring
- 핵심 symbol: `PendingSnapshot.enqueuedAt`, delivered observer, drop reasons `replaced|connection_closed|congestion`
- snapshot을 enqueue할 때 monotonic timestamp를 저장하고 실제 send callback/queue 처리에서 delay를 계산하는지 확인합니다.
- latest-value replacement, connection close, congestion termination 각각이 bounded drop reason으로 기록되는 branch를 추적합니다.
- observer가 buffer의 delivery semantics owner 안에 있고 GameHub가 추측해서 drop을 세지 않는 이유를 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:c0d184bcc928:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태와 문제 | snapshot buffer는 오래된 값을 교체하거나 congestion에서 버릴 수 있었지만 외부에서는 정상 latest-value loss와 transport failure를 구분할 수 없었습니다. 호출자에서 send 횟수만 세면 실제로 대체된 snapshot, 연결 종료로 폐기된 snapshot, 전달 완료 지연을 정확히 알 수 없습니다. |
| 구현 또는 검증 결정 | pending snapshot에 enqueue 시각을 넣고 buffer가 delivered/drop을 결정하는 branch에서 observer를 호출합니다. drop reason은 세 개의 bounded 값으로 제한합니다. |
| 실행/검증 경로 | GameHub snapshot → buffer enqueue/replacement → socket 상태·buffered amount 판단 → send 또는 drop → delay/reason observer입니다. |
| ownership과 failure 처리 | 각 client의 `LatestSnapshotBuffer`가 pending payload와 측정 시점을 소유합니다. metrics adapter는 숫자와 bounded reason만 받습니다. connection close와 congestion은 drop으로 기록되며 source payload나 room ID는 metric label에 포함되지 않습니다. |
| 보장하는 것 | delivery delay와 실제 drop 결정이 동일한 owner에서 관찰됩니다. |
| 보장하지 않는 것 | 이 시점의 `sending` flag가 congestion으로 해석되는 가정은 `d90f17fa765d`에서 수정됩니다. |
| 후속 연결 | `685d85c863a4`가 measurement와 cardinality를 검증하고 `d90f17fa765d`가 callback 지연 오판을 고칩니다. |
<!-- LEARNER-END:c0d184bcc928:record -->




#### 비교 기준

- 직전 관련 SHA: `e850b3356b9b` — `feat(metrics): match finalization 결과 관측 추가`
- 다음 관련 SHA: `685d85c863a4` — `test(metrics): database와 snapshot 지표 검증`

### 5.8. `test(metrics): database와 snapshot 지표 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `685d85c863a4` |
| Importance | B |
| Tags | AUTH, REALTIME, PERSISTENCE |
| Source에서 확정된 역할 | user/room ID를 label로 만들지 않고 DB/realtime behavior를 관측하는지 검증합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: observability route/test files와 `LatestSnapshotBuffer` fake-socket tests
- 핵심 symbol: Fastify `/metrics` scrape, fake timers/socket, label absence assertions
- repository success/failure와 snapshot replacement/delivery를 만들고 scrape body의 metric 이름·label을 확인하는 test setup을 추적합니다.
- 50ms delivery와 replacement/drop을 fake timer·fake socket으로 결정적으로 재현하는지 확인합니다.
- `requestId`, `userId`, `roomId`, `matchId` 문자열이 Prometheus output에 없다는 negative assertion을 기록합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:685d85c863a4:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태와 문제 | metric 구현은 있었지만 결과가 실제 scrape에 나타나는지, identity가 label로 새어 시계열을 폭증시키지 않는지 보호되지 않았습니다. metric 이름 존재만 확인하면 observer가 잘못된 branch에서 호출되거나 high-cardinality label이 추가돼도 놓칠 수 있습니다. |
| 구현 또는 검증 결정 | repository와 snapshot buffer의 실제 production path를 통과시킨 뒤 `/metrics` output을 검사합니다. fake socket과 timer로 replacement·delivery를 재현하고 ID label 부재를 확인합니다. |
| 실행/검증 경로 | test action → observer metric update → app scrape → text exposition assertion입니다. |
| ownership과 failure 처리 | 테스트가 app, repository, fake socket, fake timer를 생성하고 teardown에서 정리합니다. repository rejection과 snapshot drop을 의도적으로 만들지만 실제 PostgreSQL/network congestion은 사용하지 않습니다. |
| 보장하는 것 | 중요 metric이 scrape되고 bounded label 정책이 regression으로 고정됩니다. |
| 보장하지 않는 것 | Prometheus server ingestion, retention, alert rule, 실제 부하 분포는 증명하지 않습니다. |
| 후속 연결 | 후속 `66b8f07c2387`/`697a63ebb8c8`가 실제 load profile에서 event-loop metric을 읽고 threshold를 고정합니다. |
<!-- LEARNER-END:685d85c863a4:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:685d85c863a4:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | 결정적 metric integration test |
| 주입·재현 방식 | Fastify scrape와 fake timer/socket을 결합해 production observer path를 실행합니다. |
| 증명하는 것 | metric emission, bounded labels, snapshot delivery/drop 측정 위치를 검증합니다. |
| 증명하지 않는 것 | 실제 collector backend나 장시간 cardinality 증가량은 측정하지 않습니다. |
<!-- LEARNER-END:685d85c863a4:test -->



#### 비교 기준

- 직전 관련 SHA: `c0d184bcc928` — `feat(metrics): snapshot delivery와 drop 관측 추가`
- 다음 관련 SHA: `1baf4c5a57ba` — `feat(metrics): event-loop lag 측정 추가`

### 5.9. `feat(metrics): event-loop lag 측정 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `1baf4c5a57ba` |
| Importance | B |
| Tags | OBSERVABILITY |
| Source에서 확정된 역할 | Node event-loop delay histogram의 p95를 gauge로 노출합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `apps/api/src/observability.ts`
- 핵심 symbol: `monitorEventLoopDelay({resolution: 20})`, p95 gauge collect callback, `enable`, `disable`
- Node histogram을 constructor에서 enable하고 `close()`에서 disable하는 lifetime을 확인합니다.
- nanoseconds percentile 값을 seconds로 변환하는 계산과 p95 gauge collect 시점을 확인합니다.
- default metrics의 event-loop 지표와 별도로 service-level p95 gauge를 만든 이유와 reset 여부를 기록합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:1baf4c5a57ba:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태와 문제 | Node default metrics는 있었지만 load threshold가 직접 소비할 하나의 p95 event-loop lag sample이 없었습니다. runtime scheduling pressure를 client snapshot delay만으로 추정하면 network와 browser 영향을 분리할 수 없습니다. |
| 구현 또는 검증 결정 | `monitorEventLoopDelay` histogram을 20ms resolution으로 enable하고 collect 시 95번째 percentile을 seconds gauge로 설정합니다. |
| 실행/검증 경로 | app metrics 생성 → histogram enable → runtime delay samples 누적 → scrape collect에서 p95/1e9 → app close에서 disable입니다. |
| ownership과 failure 처리 | `ApiMetrics`가 histogram handle의 enable/disable lifetime을 소유합니다. sample이 비정상일 때의 세부 fallback은 metric 구현 범위에 따르며, 이 commit은 alert나 admission을 바꾸지 않습니다. |
| 보장하는 것 | server event-loop p95를 scrape 가능한 bounded 단일 gauge로 제공합니다. |
| 보장하지 않는 것 | 이 metric만으로 원인이나 per-request 지연을 식별하지 못합니다. |
| 후속 연결 | `66b8f07c2387`가 load overlay와 k6 teardown에서 이 gauge를 읽습니다. |
<!-- LEARNER-END:1baf4c5a57ba:record -->



#### 최소 코드 근거

<!-- LEARNER-BEGIN:1baf4c5a57ba:snippet -->
- SHA: `1baf4c5a57ba`
- 위치: `apps/api/src/observability.ts`; `monitorEventLoopDelay({resolution: 20})`, p95 gauge collect callback, `enable`, `disable`

```ts
const histogram = monitorEventLoopDelay({ resolution: 20 });
histogram.enable();
// collect: histogram.percentile(95) / 1_000_000_000
```
<!-- LEARNER-END:1baf4c5a57ba:snippet -->

#### 비교 기준

- 직전 관련 SHA: `685d85c863a4` — `test(metrics): database와 snapshot 지표 검증`
- 다음 관련 SHA: `66b8f07c2387` — `test(load): event-loop lag를 부하 profile에 노출`

### 5.10. `test(load): event-loop lag를 부하 profile에 노출`

| 항목 | 값 |
| --- | --- |
| SHA | `66b8f07c2387` |
| Importance | B |
| Tags | OPERATIONS, OBSERVABILITY, PERF |
| Source에서 확정된 역할 | load overlay에서 metrics endpoint를 loopback에 노출하고 k6 teardown이 server p95를 수집합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `docker-compose.load.yml`, `tests/load/pong-load.js`, load profile configuration
- 핵심 symbol: loopback-only API metrics port, k6 `teardown`, `event_loop_lag_p95_ms` trend
- load overlay가 API metrics port를 `127.0.0.1`에만 publish하는지 확인합니다.
- k6 teardown이 `/metrics`를 GET하고 `pong_pong_api_event_loop_lag_p95_seconds` sample을 파싱해 milliseconds trend에 넣는지 추적합니다.
- threshold `p(95)<=50`과 scrape 실패/missing metric에서 `fail`하는 branch를 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:66b8f07c2387:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태와 문제 | event-loop gauge는 API 내부에 있었지만 load harness가 이를 읽지 않아 client-visible SLI와 server scheduler pressure를 같은 run에서 비교할 수 없었습니다. metrics endpoint가 외부에 무제한 노출되거나 k6가 metric 부재를 0으로 처리하면 부하 결과가 잘못 통과할 수 있습니다. |
| 구현 또는 검증 결정 | load overlay에서 metrics port를 loopback으로 제한하고, k6 teardown이 scrape 결과를 읽어 p95 seconds를 milliseconds trend로 기록합니다. 누락·비정상 sample은 run failure입니다. |
| 실행/검증 경로 | load scenario 실행 → teardown HTTP scrape → Prometheus line parse → k6 custom trend 추가 → threshold 평가입니다. |
| ownership과 failure 처리 | API가 metric을 소유하고 load harness는 run 종료 시 읽기만 합니다. port 공개 범위는 overlay가 소유합니다. scrape status/body 또는 sample이 유효하지 않으면 `fail`합니다. 0으로 대체해 false pass하지 않습니다. |
| 보장하는 것 | load run이 server event-loop p95를 결과에 포함하고 loopback에서만 접근합니다. |
| 보장하지 않는 것 | 실제 load run을 이 commit의 unit test가 실행하지는 않습니다. |
| 후속 연결 | `697a63ebb8c8`가 threshold와 overlay/text contract를 정적으로 검증합니다. |
<!-- LEARNER-END:66b8f07c2387:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:66b8f07c2387:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | load-harness operational integration |
| 주입·재현 방식 | k6 teardown이 실제 HTTP scrape를 수행하도록 구현되며 threshold는 k6 options에 포함됩니다. |
| 증명하는 것 | 실행된 load run에서는 metric 부재가 실패로 처리되도록 경로가 존재합니다. |
| 증명하지 않는 것 | 이 workbook 환경에서는 k6 run이 실행되지 않았으므로 수치 결과는 제공하지 않습니다. |
<!-- LEARNER-END:66b8f07c2387:test -->



#### 비교 기준

- 직전 관련 SHA: `1baf4c5a57ba` — `feat(metrics): event-loop lag 측정 추가`
- 다음 관련 SHA: `697a63ebb8c8` — `test(load): event-loop lag 임계값 검증`

### 5.11. `test(load): event-loop lag 임계값 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `697a63ebb8c8` |
| Importance | B |
| Tags | OPERATIONS, OBSERVABILITY, PERF |
| Source에서 확정된 역할 | 50ms p95 threshold, required metric, loopback metrics exposure를 contract test로 고정합니다. |

#### 해당 SHA에서 확인할 실제 코드

- 파일: `tests/load/load-harness.test.mjs`, load profile/overlay source
- 핵심 symbol: source/compose assertions, `event_loop_lag_p95_ms` threshold, required metric name
- load profile options가 event-loop trend에 `p(95)<=50`을 정확히 요구하는지 확인합니다.
- harness source가 expected Prometheus metric을 참조하고 teardown에서 읽는다는 정적 assertion을 확인합니다.
- Compose publish address가 loopback인지와 public edge port와 섞이지 않는지 확인합니다.

#### 학습자 기록

<!-- LEARNER-BEGIN:697a63ebb8c8:record -->
| 기록 항목 | 해당 SHA의 근거 |
| --- | --- |
| 직전 관련 상태와 문제 | load harness가 threshold를 갖게 됐지만 설정·metric 이름·port binding이 수정되면 실제 부하 전까지 회귀를 발견하기 어려웠습니다. 운영 측정의 wiring은 문자열/config 변경으로 쉽게 무력화되며 실행 비용이 큰 k6만으로 매 commit 검증하기 어렵습니다. |
| 구현 또는 검증 결정 | Node contract test가 load profile, k6 source, Compose overlay를 읽어 50ms threshold와 required metric, loopback binding을 고정합니다. |
| 실행/검증 경로 | source/config read → pattern 및 object assertion → 실패 시 test error입니다. |
| ownership과 failure 처리 | 정적 contract test는 runtime service를 시작하지 않고 파일 내용만 소유합니다. threshold 제거, metric rename, non-loopback port publish를 탐지합니다. |
| 보장하는 것 | event-loop load contract의 핵심 wiring이 빠른 정적 테스트로 보호됩니다. |
| 보장하지 않는 것 | 실제 50ms 이하 성능이나 Prometheus parser의 모든 exposition format을 증명하지 않습니다. |
| 후속 연결 | Thread의 측정 체인을 registry → scrape → load collection → static contract로 닫습니다. |
<!-- LEARNER-END:697a63ebb8c8:record -->

#### 검증·측정 기록

<!-- LEARNER-BEGIN:697a63ebb8c8:test -->
| 구분 | 기록 |
| --- | --- |
| 검증 종류 | 정적 operational contract test |
| 주입·재현 방식 | load profile object와 source/Compose text를 읽어 threshold·metric·binding을 검사합니다. |
| 증명하는 것 | 측정 wiring과 임계값 설정의 회귀를 탐지합니다. |
| 증명하지 않는 것 | 부하 중 event-loop p95가 실제 기준을 만족한다는 실행 증거는 아닙니다. |
<!-- LEARNER-END:697a63ebb8c8:test -->



#### 비교 기준

- 직전 관련 SHA: `66b8f07c2387` — `test(load): event-loop lag를 부하 profile에 노출`
- 이 Thread의 마지막 selected SHA입니다.

## 6. 불변식의 변화

<!-- LEARNER-BEGIN:02-metrics-observer-boundaries-and-cardinality.md:evolution -->
`6bf29a5acf35`/`69278d8fc456`은 app-local registry와 collector lifetime을 만들고, `02b3b3a32f14`는 bounded HTTP/readiness labels로 외부 scrape 경계를 엽니다. `843d355afc69`부터 repository, GameHub lifecycle, finalization, snapshot buffer처럼 결과가 확정되는 owner에 observer를 배치합니다. `685d85c863a4`는 identity label 부재를 고정하고, `1baf4c5a57ba`부터 event-loop p95를 load run까지 전달해 50ms contract로 보호합니다.
<!-- LEARNER-END:02-metrics-observer-boundaries-and-cardinality.md:evolution -->

## 7. Failure → Fix → Test 관계

<!-- LEARNER-BEGIN:02-metrics-observer-boundaries-and-cardinality.md:failure-links -->
- raw URL/identity label cardinality 위험 → normalized route와 bounded outcome/reason → `685d85c863a4` negative label assertions
- repository sync throw/async reject 관측 누락 위험 → transparent proxy settle handling → database metric tests
- event-loop metric 누락을 0으로 오판할 위험 → teardown fail-closed parser → `697a63ebb8c8` static contract
- callback 지연을 drop으로 오판하는 측정 의미 문제는 Thread 04의 `d90f17fa765d`/`5cd54767858f`에서 수정됩니다.
<!-- LEARNER-END:02-metrics-observer-boundaries-and-cardinality.md:failure-links -->

## 8. Ownership·state·cleanup 변화

<!-- LEARNER-BEGIN:02-metrics-observer-boundaries-and-cardinality.md:ownership -->
Fastify app이 `ApiMetrics`와 registry/histogram lifetime을 소유합니다. repository와 GameHub는 production state를 계속 소유하고 proxy/observer는 결과를 읽어 전달합니다. `LatestSnapshotBuffer`는 delivery/drop 의미를 소유하므로 해당 지표도 buffer 내부에서 발생합니다. load harness는 scrape consumer일 뿐 server metric을 재정의하지 않습니다.
<!-- LEARNER-END:02-metrics-observer-boundaries-and-cardinality.md:ownership -->

## 9. Thread 최종 상태

<!-- LEARNER-BEGIN:02-metrics-observer-boundaries-and-cardinality.md:final-state -->
HTTP, readiness, repository, room/reconnect, finalization, snapshot delivery/drop, event-loop p95가 bounded labels로 scrape됩니다. user/request/room/match ID는 correlation용 structured log context에만 남고 metric 시계열을 생성하지 않습니다.
<!-- LEARNER-END:02-metrics-observer-boundaries-and-cardinality.md:final-state -->

## 10. 최종 실행 흐름

<!-- LEARNER-BEGIN:02-metrics-observer-boundaries-and-cardinality.md:final-flow -->
- app 생성 시 private registry와 default/event-loop collector를 시작합니다.
- HTTP·repository·GameHub·snapshot buffer가 각 결과 확정 지점에서 bounded observer를 호출합니다.
- `/metrics`가 app-local registry를 Prometheus text로 직렬화합니다.
- load harness teardown이 loopback scrape에서 event-loop p95와 server finalization counters를 읽습니다.
- app close가 registry를 clear하고 event-loop histogram을 disable합니다.
<!-- LEARNER-END:02-metrics-observer-boundaries-and-cardinality.md:final-flow -->

## 11. 실행 및 검증 근거

<!-- LEARNER-BEGIN:02-metrics-observer-boundaries-and-cardinality.md:execution -->
- 저장소 runtime/test command는 실행하지 않았습니다.
- 실행을 시도한 명령: `git ls-remote --heads https://github.com/seungwoo7050/42-archive.git refs/heads/web/ft_transcendence`
- 실제 결과: exit status 128, `Could not resolve host: github.com`.
- 따라서 test pass, benchmark 수치, k6/Toxiproxy recovery 결과는 주장하지 않습니다. 각 기록은 GitHub 연결로 exact selected commit의 diff와 당시 파일을 확인한 정적 historical inspection 결과입니다.
<!-- LEARNER-END:02-metrics-observer-boundaries-and-cardinality.md:execution -->

## 12. 학습 완료 확인

<!-- LEARNER-BEGIN:02-metrics-observer-boundaries-and-cardinality.md:checks -->
- [x] 각 metric의 semantic owner와 label vocabulary를 파일·함수 기준으로 설명할 수 있습니다.
- [x] repository proxy의 sync/async semantics 보존과 failure 기록 순서를 설명할 수 있습니다.
- [x] event-loop metric의 생성·scrape·load threshold·정적 contract 연결을 구분할 수 있습니다.
<!-- LEARNER-END:02-metrics-observer-boundaries-and-cardinality.md:checks -->
