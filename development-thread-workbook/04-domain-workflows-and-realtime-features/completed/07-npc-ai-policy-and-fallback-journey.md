# NPC AI 정책과 fallback 여정

원문 Development Thread: `NPC AI policy and fallback journey`

## 1. Thread 목표

- NPC를 익명 문자열이 아니라 `isNpc`가 저장된 사용자 identity로 도입하고 rating band별 상대를 구성하는 과정을 추적합니다.
- 직접 AI 모드와 6초 human-queue fallback이 같은 persisted NPC를 room participant와 match result에 연결하는 경로를 복원합니다.
- rating 기반 반응 주기·예측 오차·실수 확률·속도·dead zone을 deterministic policy로 구현하고 UI/smoke test에 노출하는 과정을 확인합니다.

### Source에서 확정된 significance

> An AI opponent affects identity, matchmaking, room membership, simulation policy, persistence, ranking/profile presentation, and cleanup. Treating it as a label loses result attribution; treating fallback as an uncancelled timer can create duplicate matches. The history gives NPCs durable identity and explicit timer/state ownership.

### 직접 연결되는 Critical Invariants

> NPC opponents are persisted users marked `isNpc`, remain offline as presence, and are selected by rating without being confused with authenticated human identities.
>
> A queued player is matched at most once: human pairing, leave, disconnect/prune, or NPC fallback all clear the queue timer and revalidate membership before room creation.

### 직접 연결되는 Major Engineering Difficulties

> Maintaining PostgreSQL/memory parity for seeded NPC identity while avoiding handle collisions that leave a real login marked as NPC.
>
> Making AI variation reproducible from room/tick state so policy can be reasoned about and tested without ambient randomness.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- `is_npc`는 schema, shared `PublicUser`, row mapper, chat/tournament projections에 어떻게 전파됩니까?
- dev login과 NPC upsert가 같은 handle을 만날 때 어떤 값을 다시 설정해 identity 오염을 막습니까?
- `findClosestNpc`는 rating distance 동률과 empty NPC list를 어떻게 처리합니까?
- 6초 fallback callback은 timer가 발화한 뒤 queue membership, socket open, existing room을 왜 다시 확인합니까?
- human match, leave, prune에서 `clearQueueTimer`를 빠뜨리면 어떤 duplicate room 위험이 생깁니까?
- AI profile의 reaction/noise/mistake/speed/dead-zone와 `predictedBallY` 반사가 gameplay에 어떻게 반영됩니까?
- smoke test는 solo queue가 실제 persisted NPC handle을 가진 snapshot으로 이어졌음을 어떻게 확인합니까?

## 3. 완료 기준

- NPC identity가 DB row에서 room snapshot과 persisted match result까지 이동하는 경로를 설명할 수 있습니다.
- queue entry와 fallback timer의 lifetime 및 모든 cancellation path를 나열할 수 있습니다.
- rating band별 AI profile과 deterministic pseudo-random 입력의 seed를 실제 함수로 설명할 수 있습니다.
- UI의 AI badge/친구 버튼 제한과 server-side identity rule의 차이를 구분할 수 있습니다.
- smoke test가 검증하는 end-to-end 연결과 AI 품질 자체를 검증하지 않는다는 한계를 설명할 수 있습니다.
- Commit map의 모든 SHA를 지정 브랜치 ancestry와 source classification에서 확인합니다.
- 각 SHA의 parent 또는 직전 관련 SHA와 비교해 변경 전후 상태를 구분합니다.
- 실행한 명령과 코드 검사만으로 확인한 사실을 구분하고 실행하지 않은 test를 통과했다고 기록하지 않습니다.

## 4. Commit map

| 순서 | SHA | Subject | Importance | Tags | Source에서 확정된 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `72d23baefc3c` | `feat(db): NPC 사용자 contract와 schema 추가` | B | REALTIME, PERSISTENCE, TOURNAMENT | Adds a persisted NPC marker to user storage and every shared projection that can carry a user. |
| 2 | `b3239bae51e5` | `feat(db): rating 구간별 NPC 상대 저장` | B | REALTIME, PERSISTENCE | Seeds rating-banded NPC users and exposes active NPC opponents separately from presence. |
| 3 | `dec431822873` | `test(db): NPC seed와 leaderboard 분리 검증` | B | REALTIME, PERSISTENCE, TEST | Verifies the memory repository exposes rating-banded NPC opponents as NPC and offline projections. |
| 4 | `87b38e2f23c8` | `feat(game): NPC 상대를 경기 방에 연결` | B | REALTIME | Uses persisted NPC identity in AI rooms and match-result attribution. |
| 5 | `1122e6a4b901` | `feat(game): 대기 플레이어 NPC fallback 구성` | B | REALTIME | Adds six-second NPC fallback with explicit timer cleanup and asynchronous revalidation. |
| 6 | `b159bcda3b83` | `feat(game): rating 기반 NPC AI policy 구현` | B | SIMULATION, REALTIME, WEB | Maps NPC rating bands to deterministic reaction, prediction, mistake, speed, and dead-zone policy. |
| 7 | `afd0a97c5c1c` | `feat(web): 대기열에서 NPC 상대 표시` | B | REALTIME, WEB | Exposes NPC identity and fallback behavior in queue, play, profile, and ranking presentation. |
| 8 | `cfb15fc84dee` | `test(app): NPC fallback matching 검증` | B | PROTOCOL, REALTIME, PERSISTENCE | Extends the WebSocket smoke test through solo queue fallback into an NPC-backed room snapshot. |

## 5. Commit별 학습 기록

### 5.1. `feat(db): NPC 사용자 contract와 schema 추가`

| 항목 | 값 |
| --- | --- |
| SHA | `72d23baefc3c` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE, TOURNAMENT |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Adds a persisted NPC marker to user storage and every shared projection that can carry a user.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `packages/shared/src/http.ts`의 `PublicUser.isNpc`
- `packages/db/src/migrations.ts`의 `users.is_npc boolean not null default false`
- `packages/db/src/schema.ts`의 user/projection row 타입
- `packages/db/src/rowMappers.ts` 및 chat/tournament query projection
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:72d23baefc3c -->
- **직전 상태:** AI 상대는 room 안의 특수 문자열/flag로 표현돼 사용자·chat·tournament projection과 같은 identity contract를 갖지 못했습니다.
- **구현 결정:** users row에 `is_npc`를 추가하고 shared `PublicUser.isNpc`로 mapping하며 chat sender와 tournament creator/participant query도 해당 column을 선택합니다. memory dev user는 false입니다.
- **상태/소유권 변화:** NPC 여부가 room 임시 label이 아니라 durable user identity 속성이 됩니다.
- **실패/edge:** marker만 추가했으므로 실제 NPC row와 선택 정책은 아직 없습니다. 기존 row는 default false입니다.
- **보장/비보장:** user가 전달되는 contract 전반에서 NPC 여부를 보존하지만 NPC가 online인지, 어떤 rating인지, 누구와 match할지는 정하지 않습니다.
- **다음 연결:** `b3239bae51e5`가 rating band별 NPC row를 seed하고 별도 조회를 구현합니다.
<!-- LEARNER-ANSWER END commit:72d23baefc3c -->

비교 기준:
- 이 commit의 parent와 비교합니다.
- 다음 Thread 관련 SHA: `b3239bae51e5` — `feat(db): rating 구간별 NPC 상대 저장`

### 5.2. `feat(db): rating 구간별 NPC 상대 저장`

| 항목 | 값 |
| --- | --- |
| SHA | `b3239bae51e5` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Seeds rating-banded NPC users and exposes active NPC opponents separately from presence.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.ts`의 `NPC_PLAYERS` 1100/1200/1300/1400
- PostgreSQL `upsertNpc`와 `listNpcOpponents`
- memory seed/list parity
- dev user upsert의 `is_npc = false` 복구
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:b3239bae51e5 -->
- **직전 상태:** `isNpc` 필드는 있었지만 사용할 NPC row가 없고 repository에서 NPC 후보를 가져올 API가 없었습니다.
- **구현 결정:** 네 고정 handle/display/avatar/rating seed를 active `is_npc=true`, email null로 upsert하고 rating 오름차순 `listNpcOpponents`를 추가합니다. projection은 online false입니다. 같은 handle로 dev login하면 `is_npc=false`로 되돌립니다.
- **상태/소유권 변화:** NPC identity/rating band는 repository seed가 소유하며 realtime presence와 분리됩니다.
- **실패/edge:** 고정 seed 정책은 운영 콘텐츠 변경 시 migration/seed update가 필요하고, 단순 rating distance 외 gameplay skill calibration은 아직 없습니다.
- **보장/비보장:** 양 backend에서 같은 후보 집합과 human/NPC marker 복구를 제공하지만 match selection은 다음 commit입니다.
- **다음 연결:** `dec431822873`이 seed ratings/marker/offline projection을 고정합니다.
<!-- LEARNER-ANSWER END commit:b3239bae51e5 -->

비교 기준:
- 직전 Thread 관련 SHA: `72d23baefc3c` — `feat(db): NPC 사용자 contract와 schema 추가`
- 다음 Thread 관련 SHA: `dec431822873` — `test(db): NPC seed와 leaderboard 분리 검증`

### 5.3. `test(db): NPC seed와 leaderboard 분리 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `dec431822873` |
| Importance | B |
| Tags | REALTIME, PERSISTENCE, TEST |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Verifies the memory repository exposes rating-banded NPC opponents as NPC and offline projections.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `packages/db/src/index.test.ts`의 `ensureSeedData` 후 `listNpcOpponents`
- ratings `[1100, 1200, 1300, 1400]`
- 모두 `isNpc === true`, `online === false`
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.
- Test technique, failure/boundary fixture, production path, proves/does-not-prove를 실제 assertion으로 구분합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:dec431822873 -->
- **직전 상태:** seed/list 구현은 있었지만 order, marker, presence projection이 바뀌어도 감지할 regression이 없었습니다.
- **기법:** memory repository를 seed한 뒤 NPC 목록 rating 배열과 모든 `isNpc`, 모든 offline 값을 직접 검사합니다.
- **생산 경로:** 실제 memory seed와 public projection/list sorting을 통과합니다.
- **증명/비증명:** 후보 집합과 identity/presence 분리를 검증하도록 작성됐지만 PostgreSQL seed, leaderboard 표시, match 결과 저장은 포함하지 않습니다.
- **보장:** 개발/test backend에서 stable rating bands를 제공합니다.
- **다음 연결:** `87b38e2f23c8`이 후보를 실제 room과 result persistence에 연결합니다.
<!-- LEARNER-ANSWER END commit:dec431822873 -->

비교 기준:
- 직전 Thread 관련 SHA: `b3239bae51e5` — `feat(db): rating 구간별 NPC 상대 저장`
- 다음 Thread 관련 SHA: `87b38e2f23c8` — `feat(game): NPC 상대를 경기 방에 연결`

### 5.4. `feat(game): NPC 상대를 경기 방에 연결`

| 항목 | 값 |
| --- | --- |
| SHA | `87b38e2f23c8` |
| Importance | B |
| Tags | REALTIME |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Uses persisted NPC identity in AI rooms and match-result attribution.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/gameHub.ts`의 async `joinQueue`와 `findClosestNpc`
- absolute rating distance selection
- `createRoom`의 `npc` option/right player snapshot
- `finishRoom`의 winner/loser ID에 NPC identity 사용
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:87b38e2f23c8 -->
- **직전 상태:** AI room의 오른쪽 참가자는 `ai-opponent`/`ai`/`연습 AI` 같은 익명 fallback이라 generic match가 실제 상대 user를 참조하지 못했습니다.
- **구현 결정:** repository NPC 목록에서 `abs(npc.rating - player.rating)`이 가장 작은 후보를 선택하고 room snapshot의 오른쪽 participant와 opponent label에 사용합니다. 종료 시 room이 보관한 NPC user ID를 winner/loser로 넘깁니다.
- **상태/소유권 변화:** room은 선택된 persisted NPC identity를 lifetime 동안 보존하고 result persistence도 같은 ID를 사용합니다.
- **실패/edge:** 후보가 없으면 기존 anonymous fallback이 남을 수 있고 동률은 먼저 나온 rating-order 후보가 선택됩니다. 일반 human queue의 지연 fallback은 아직 없습니다.
- **보장/비보장:** 직접 AI room의 identity attribution은 제공하지만 queue timeout ownership은 다음 commit입니다.
- **다음 연결:** `1122e6a4b901`이 human 상대가 없을 때 같은 NPC를 6초 fallback으로 배정합니다.
<!-- LEARNER-ANSWER END commit:87b38e2f23c8 -->

비교 기준:
- 직전 Thread 관련 SHA: `dec431822873` — `test(db): NPC seed와 leaderboard 분리 검증`
- 다음 Thread 관련 SHA: `1122e6a4b901` — `feat(game): 대기 플레이어 NPC fallback 구성`

### 5.5. `feat(game): 대기 플레이어 NPC fallback 구성`

| 항목 | 값 |
| --- | --- |
| SHA | `1122e6a4b901` |
| Importance | B |
| Tags | REALTIME |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Adds six-second NPC fallback with explicit timer cleanup and asynchronous revalidation.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/gameHub.ts`의 `QueueEntry.npcFallbackTimer`
- `NPC_QUEUE_FALLBACK_MS = 6000`
- `matchQueuedClientWithNpc` membership/socket/room checks
- human match, `leaveQueue`, `pruneQueue`의 `clearQueueTimer`
- Room `npcUser`와 result attribution
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:1122e6a4b901 -->
- **직전 상태:** 일반 queue에 human이 없으면 무기한 기다렸고 NPC는 명시적 AI mode에서만 즉시 배정됐습니다.
- **구현 결정:** unmatched queue entry마다 6초 timer를 만들고 callback에서 entry가 아직 queue에 있는지, socket이 OPEN인지, 이미 room이 없는지 재확인한 뒤 closest NPC로 room을 만듭니다. human pair, leave, closed-socket prune는 timer를 clear/null합니다.
- **상태/소유권 변화:** fallback timer는 queue entry의 자원이며 queue membership이 lifetime을 결정합니다. room은 선택된 `npcUser`를 별도로 보관합니다.
- **실패/edge:** callback의 NPC lookup은 async이므로 timer 발화 뒤 상태가 바뀔 수 있어 재검사가 필수입니다. 정리를 빠뜨리면 human room 뒤 두 번째 NPC room이 생길 수 있습니다.
- **보장/비보장:** 단일 GameHub process에서 queue entry당 한 fallback path를 목표로 하지만 multi-process reservation은 later Matchmaker(category 05)가 담당합니다.
- **다음 연결:** `b159bcda3b83`이 NPC rating을 실제 AI 행동 profile로 사용합니다.
<!-- LEARNER-ANSWER END commit:1122e6a4b901 -->

비교 기준:
- 직전 Thread 관련 SHA: `87b38e2f23c8` — `feat(game): NPC 상대를 경기 방에 연결`
- 다음 Thread 관련 SHA: `b159bcda3b83` — `feat(game): rating 기반 NPC AI policy 구현`

### 5.6. `feat(game): rating 기반 NPC AI policy 구현`

| 항목 | 값 |
| --- | --- |
| SHA | `b159bcda3b83` |
| Importance | B |
| Tags | SIMULATION, REALTIME, WEB |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Maps NPC rating bands to deterministic reaction, prediction, mistake, speed, and dead-zone policy.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/api/src/gameHub.ts`의 `AiProfile`, `aiProfileFor`
- `updateAiPaddleIntent`, `predictedBallY`
- `deterministicUnit`, `signedDeterministic`, `hashString`
- Room `aiTargetY`와 right paddle speed multiplier
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:b159bcda3b83 -->
- **직전 상태:** AI는 매 tick 현재 ball Y를 단순 추적해 persisted rating이 gameplay에 영향을 주지 않았습니다.
- **구현 결정:** 1400/1300/1200/lower band에 reaction ticks, prediction noise, mistake chance, paddle speed multiplier, dead zone을 지정합니다. 공이 AI 쪽으로 갈 때 벽 반사를 포함한 도착 Y를 예측하고 room ID·tick·salt 기반 deterministic noise/mistake를 적용합니다. 공이 반대 방향이면 중앙을 목표로 합니다.
- **상태/소유권 변화:** room이 `aiTargetY`를 유지하고 rating이 simulation policy를 선택합니다. ambient `Math.random` 대신 재현 가능한 pseudo-random 값을 사용합니다.
- **실패/edge:** policy 값은 경험적 설정이며 난이도·공정성 통계가 없습니다. `predictedBallY`는 현재 단순 직선/벽 반사 모델을 전제로 합니다.
- **보장/비보장:** 동일 room/tick/state에서 같은 intent를 계산하고 rating band별 차이를 만들지만 인간 수준 성능은 보장하지 않습니다.
- **다음 연결:** `afd0a97c5c1c`이 queue/NPC identity를 UI에 명시합니다.
<!-- LEARNER-ANSWER END commit:b159bcda3b83 -->

비교 기준:
- 직전 Thread 관련 SHA: `1122e6a4b901` — `feat(game): 대기 플레이어 NPC fallback 구성`
- 다음 Thread 관련 SHA: `afd0a97c5c1c` — `feat(web): 대기열에서 NPC 상대 표시`

### 5.7. `feat(web): 대기열에서 NPC 상대 표시`

| 항목 | 값 |
| --- | --- |
| SHA | `afd0a97c5c1c` |
| Importance | B |
| Tags | REALTIME, WEB |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Exposes NPC identity and fallback behavior in queue, play, profile, and ranking presentation.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `apps/web/src/app/page.tsx`의 `/play?mode=queue`와 fallback 설명
- `apps/web/src/app/play/page.tsx`의 auto queue 및 opponent `ai` 설명
- leaderboard/profile AI badge
- NPC profile의 friend button disable
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:afd0a97c5c1c -->
- **직전 상태:** server가 NPC를 배정해도 home/play/profile/leaderboard는 human과 구분되지 않거나 queue route가 자동 참가하지 않았습니다.
- **구현 결정:** queue CTA가 queue mode query로 play를 열어 자동 join하고 human이 없으면 AI 배정됨을 설명합니다. snapshot `player.ai`로 상대 문구를 바꾸고 `isNpc` badge를 profile/leaderboard에 표시하며 NPC 친구 추가를 비활성화합니다.
- **상태/소유권 변화:** web은 server-provided `isNpc`/`ai`를 표시할 뿐 NPC를 추정하지 않습니다.
- **실패/edge:** UI disable은 보안 경계가 아니므로 friend API가 NPC 관계를 허용하지 않는 invariant는 server가 별도로 책임져야 합니다. 당시 profile의 handle-length 선수 번호 같은 unrelated placeholder는 남을 수 있습니다.
- **보장/비보장:** 사용자 journey의 명시성은 높이지만 fallback 성공 자체는 server/smoke가 검증합니다.
- **다음 연결:** `cfb15fc84dee`가 solo queue에서 AI-labelled match와 persisted NPC handle snapshot을 기다립니다.
<!-- LEARNER-ANSWER END commit:afd0a97c5c1c -->

비교 기준:
- 직전 Thread 관련 SHA: `b159bcda3b83` — `feat(game): rating 기반 NPC AI policy 구현`
- 다음 Thread 관련 SHA: `cfb15fc84dee` — `test(app): NPC fallback matching 검증`

### 5.8. `test(app): NPC fallback matching 검증`

| 항목 | 값 |
| --- | --- |
| SHA | `cfb15fc84dee` |
| Importance | B |
| Tags | PROTOCOL, REALTIME, PERSISTENCE |
| 학습 깊이 | Thread 안에서 필요한 실제 구현 역할과 상태 변화를 복원합니다. |

#### Source에서 확정된 역할과 범위

- Thread 역할: Extends the WebSocket smoke test through solo queue fallback into an NPC-backed room snapshot.
- 이 역할·제목·Importance·Tags는 지정 브랜치의 source classification과 exact commit diff를 대조해 고정했습니다.

#### 해당 SHA에서 확인할 실제 코드

- `tests/smoke-ws.mjs`의 solo login/socket
- `queue.join` mode queue
- 8초 안 `queue.matched` opponent가 `AI` 포함
- `game.ready` 후 snapshot의 `player.ai` 및 `handle.startsWith("npc-")`
- finally socket close
- parent 또는 직전 Thread SHA와 비교해 concrete state/data/caller 변화와 edge path를 기록합니다.
- Test technique, failure/boundary fixture, production path, proves/does-not-prove를 실제 assertion으로 구분합니다.

#### 학습자 기록

<!-- LEARNER-ANSWER START commit:cfb15fc84dee -->
- **직전 상태:** seed/unit 검사와 GameHub 구현은 있었지만 실제 login→WebSocket→queue timer→room snapshot의 서비스 경로를 연결한 smoke 근거가 없었습니다.
- **기법:** 별도 solo 사용자를 로그인/연결하고 일반 queue에 참가시킵니다. 6초 fallback을 고려해 8초 timeout으로 AI opponent match를 기다린 뒤 ready를 보내고 AI participant handle이 `npc-`로 시작하는 snapshot을 기다립니다.
- **생산 경로:** HTTP login, WebSocket auth/parse, queue timer, repository NPC lookup, room creation, snapshot encoding을 통과하도록 작성됐습니다.
- **증명/비증명:** end-to-end fallback과 persisted NPC identity 노출을 검증하지만 AI paddle policy 품질, match completion/result row, 동시 queue race를 검증하지 않습니다.
- **cleanup:** `finally`에서 solo socket을 닫고 기존 PvP socket cleanup도 유지합니다.
- **Thread 종료:** 저장 identity, delayed matching, simulation policy, UI disclosure, service smoke가 하나의 journey로 연결됩니다.
<!-- LEARNER-ANSWER END commit:cfb15fc84dee -->

비교 기준:
- 직전 Thread 관련 SHA: `afd0a97c5c1c` — `feat(web): 대기열에서 NPC 상대 표시`
- 이 commit을 Thread의 마지막 상태로 사용합니다.

## 6. Thread 종합

다음 항목을 commit 순서에서 재구성합니다: invariant evolution, Failure → Fix → Test 관계, ownership/state 변화, 최종 실행 흐름, 비보장, 실제 실행 증거.

<!-- LEARNER-ANSWER START thread:07-npc-ai-policy-and-fallback-journey.md:synthesis -->
- **불변식 진화:** `72d23baefc3c`은 user contract/schema에 `isNpc`를 추가했고 `b3239bae51e5`는 1100/1200/1300/1400 rating NPC를 PostgreSQL/memory에 seed하며 별도 조회를 제공했습니다. `87b38e2f23c8`은 closest NPC를 room participant·result identity로 연결했습니다. `1122e6a4b901`은 human queue에서 6초 뒤 fallback하되 queue/socket/room을 재검사하고 모든 terminal path에서 timer를 정리합니다. `b159bcda3b83`은 rating을 simulation policy로 바꿉니다.
- **소유권:** repository는 NPC identity와 rating band를, queue entry는 fallback timer를, GameHub room은 선택된 `npcUser`와 result attribution을, simulation은 `aiTargetY`와 profile 기반 intent를, web은 AI 표시와 action 제한을 소유합니다.
- **Failure → Fix → Test:** 익명 `ai-opponent` 결과 attribution → persisted NPC user. 대기 timer 미정리/async stale callback 위험 → entry-owned timer와 membership/socket/room 재검사. NPC seed가 human identity를 오염할 위험 → dev login upsert가 `is_npc=false`. memory seed/rating/offline test와 실제 WebSocket solo fallback smoke가 경계를 검증합니다.
- **최종 흐름:** seed 시 NPC users 저장 → queue/AI 요청 시 현재 user rating과 가장 가까운 NPC 조회 → 직접 AI는 즉시, 일반 queue는 human이 없으면 6초 후 재검사해 room 생성 → snapshot participant에 NPC identity/`ai` 표시 → deterministic policy가 paddle intent 계산 → 종료 결과는 NPC user ID로 저장 → web은 badge와 AI 상대 설명을 표시합니다.
- **비보장:** rating policy가 공정하거나 인간과 동일한 난이도를 제공한다는 통계적 증거는 없습니다. multi-instance queue timer coordination과 later Matchmaker reservation ownership은 category 05가 주 소유자입니다.
- **실행 증거:** seed/unit/smoke test 구현을 검사했지만 실제 repository seed나 8초 WebSocket smoke를 실행하지 않았습니다.
<!-- LEARNER-ANSWER END thread:07-npc-ai-policy-and-fallback-journey.md:synthesis -->

## 7. 학습 완료 확인

<!-- LEARNER-ANSWER START thread:07-npc-ai-policy-and-fallback-journey.md:checklist -->
- [x] 모든 SHA를 지정 브랜치의 exact commit으로 검사했습니다.
- [x] fixed commit map과 source classification을 보존했습니다.
- [x] earlier commit을 later HEAD 코드로 설명하지 않았습니다.
- [x] fix와 test를 원래 failure/production path에 연결했습니다.
- [x] 실제 실행하지 않은 test를 통과했다고 기록하지 않았습니다.
- [x] Thread 최종 owner, invariant, flow, non-guarantee를 작성했습니다.
<!-- LEARNER-ANSWER END thread:07-npc-ai-policy-and-fallback-journey.md:checklist -->
