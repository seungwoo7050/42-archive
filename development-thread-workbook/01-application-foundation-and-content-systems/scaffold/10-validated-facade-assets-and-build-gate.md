# Thread: Validated facade, assets, and build gate

> Repository: `https://github.com/seungwoo7050/42-archive`  
> Branch: `web/portfolio`  
> Category: `01-application-foundation-and-content-systems`

## 0. 분류 출처와 변경 가능 범위

- Commit SHA, subject, importance, tags는 target branch의 `commit/commit-importance.md` 분류와 exact commit metadata를 사용합니다.
- 이 문서의 Thread grouping, 목표, 역할, 조사 지점은 Phase 1 category audit에서 repository evidence를 기준으로 확정했습니다.
- Phase 2에서는 이 fixed information을 바꾸지 않고 learner-facing 기록만 채웠습니다.
- 다른 branch나 final HEAD 구현을 과거 SHA 설명에 소급하지 않습니다.

## 1. Thread 목표

기존 JSON-direct portfolio facade를 validated `portfolioSource`로 교체하고 schema-derived type 연결을 확대한 뒤, repository-local asset 존재 검증과 `content:check`/`prebuild` gate로 source trust를 build lifecycle까지 확장하는 과정을 복원합니다.

### 계획된 핵심 invariant

- Portfolio facade는 raw JSON을 직접 import하지 않고 validated source만 소비합니다.
- Facade는 group label 파생, journey 정렬, enabled filtering처럼 renderer-facing transformation만 소유합니다.
- Content build gate는 schema/integrity와 public asset 존재를 모두 통과해야 성공합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- Schema-derived source types와 기존 renderer-facing types의 경계는 어떻게 줄어드는가?
- Validated source로 전환하면서 environment href behavior와 migration branch는 어떻게 제거되는가?
- Asset path traversal/absence 검사와 build lifecycle 연결이 무엇을 보장하고 무엇을 보장하지 않는가?

## 3. 완료 기준

- 각 SHA의 parent diff와 resulting tree에서 실제 file/symbol을 확인합니다.
- 이전 상태, implementation decision, owner/lifetime, absence/failure/fallback, guarantee/non-guarantee를 분리합니다.
- Fix·refactor·integration은 바로 앞의 assumption이나 duplicated responsibility와 연결합니다.
- 테스트나 command는 실제 실행 여부를 정적 검토와 명확히 구분합니다.
- Thread 종료 시 invariant evolution과 최종 flow를 코드 없이 설명합니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | 이 Thread에서의 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `85df59454b46` | refactor(content): schema 기반 핵심 콘텐츠 타입 연결 | A | ARCH, CONTENT, VALIDATION | schema-derived facade type bridge |
| 2 | `16bdf03ce979` | feat(content): 여정과 큐레이션 콘텐츠 타입 추가 | B | CONTENT | new narrative facade types |
| 3 | `508e0b71024b` | refactor(content): 검증된 콘텐츠를 portfolio facade에 연결 | S | ARCH, CONTENT, VALIDATION | raw imports 제거와 validated facade cutover |
| 4 | `ff2ecadf3489` | feat(content): 저장소 자산 참조 경계 검증 | A | CONTENT, VALIDATION | public asset filesystem integrity |
| 5 | `0e0ed9e50323` | build(content): 콘텐츠 검사 명령 추가 | B | CONTENT, DEPLOY | explicit content validation command |
| 6 | `28b0db56190f` | build(content): 콘텐츠 검사를 prebuild에 연결 | A | CONTENT, DEPLOY | build fail-closed gate |

## 5. Commit별 학습 기록

### 1. `85df59454b46` — refactor(content): schema 기반 핵심 콘텐츠 타입 연결

- **Importance:** A
- **Tags:** ARCH, CONTENT, VALIDATION
- **Thread 역할:** schema-derived facade type bridge
- **조사 깊이:** 주요 subsystem의 결정 경로, owner, failure/non-guarantee와 integration evidence를 구체적으로 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `src/lib/portfolio/types.ts`에서 `PresentationContentSource`, project group/metric/source types import/export를 확인합니다.
- Home/ProjectPage/Detail/About/Journey/InterviewMap/Resume/Contact/Presentation types가 indexed schema source types로 바뀌는 범위를 확인합니다.
- 여전히 수동으로 남는 Site/Profile/ContentLink/PortfolioContent types를 기록합니다.

확인 원칙:

- 먼저 `85df59454b46^`와 `85df59454b46`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:10-validated-facade-assets-and-build-gate.md:c1.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:10-validated-facade-assets-and-build-gate.md:c1.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:10-validated-facade-assets-and-build-gate.md:c1.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:10-validated-facade-assets-and-build-gate.md:c1.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:10-validated-facade-assets-and-build-gate.md:c1.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:10-validated-facade-assets-and-build-gate.md:c1.next --> |

#### 코드·실행 증거

<!-- learner:10-validated-facade-assets-and-build-gate.md:c1.evidence -->

### 2. `16bdf03ce979` — feat(content): 여정과 큐레이션 콘텐츠 타입 추가

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** new narrative facade types
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- JourneyMilestone/Narrative, InterviewMap reference/answer/item/track/content, Curation category/criteria/omission/content types를 확인합니다.
- 이 types가 아직 schema inferred aliases가 아니라 manual declarations인지 기록합니다.

확인 원칙:

- 먼저 `16bdf03ce979^`와 `16bdf03ce979`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:10-validated-facade-assets-and-build-gate.md:c2.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:10-validated-facade-assets-and-build-gate.md:c2.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:10-validated-facade-assets-and-build-gate.md:c2.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:10-validated-facade-assets-and-build-gate.md:c2.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:10-validated-facade-assets-and-build-gate.md:c2.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:10-validated-facade-assets-and-build-gate.md:c2.next --> |

#### 코드·실행 증거

<!-- learner:10-validated-facade-assets-and-build-gate.md:c2.evidence -->

### 3. `508e0b71024b` — refactor(content): 검증된 콘텐츠를 portfolio facade에 연결

- **Importance:** S
- **Tags:** ARCH, CONTENT, VALIDATION
- **Thread 역할:** raw imports 제거와 validated facade cutover
- **조사 깊이:** Architecture 전환, 이전 trust/ownership 모델, failure path, lifecycle, downstream regression까지 깊게 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `src/lib/portfolio/content.ts`에서 11개 direct JSON imports와 legacy project union이 제거되고 `portfolioSource` import 하나로 바뀌는지 확인합니다.
- projectGroups sort, groupId→category label mapping, projectMetrics, presentation project groups derivation, journey sort를 추적합니다.
- `withEnvHref`, `PortfolioEnv`/`EnvKey` 제거와 `_legacyEnvironment` 무시를 확인합니다.
- `PortfolioContent`에 groups/metrics/journeyNarrative/interviewMap/curation이 추가되는지 확인합니다.
- public exports와 call sites가 raw source를 우회하지 않는지 resulting tree에서 확인합니다.

확인 원칙:

- 먼저 `508e0b71024b^`와 `508e0b71024b`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:10-validated-facade-assets-and-build-gate.md:c3.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:10-validated-facade-assets-and-build-gate.md:c3.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:10-validated-facade-assets-and-build-gate.md:c3.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:10-validated-facade-assets-and-build-gate.md:c3.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:10-validated-facade-assets-and-build-gate.md:c3.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:10-validated-facade-assets-and-build-gate.md:c3.next --> |

#### 코드·실행 증거

<!-- learner:10-validated-facade-assets-and-build-gate.md:c3.evidence -->

### 4. `ff2ecadf3489` — feat(content): 저장소 자산 참조 경계 검증

- **Importance:** A
- **Tags:** CONTENT, VALIDATION
- **Thread 역할:** public asset filesystem integrity
- **조사 깊이:** 주요 subsystem의 결정 경로, owner, failure/non-guarantee와 integration evidence를 구체적으로 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `src/lib/content-assets.ts`의 `collectAssetReferences`가 site socialImage, profile photo, résumé download, primary/additional project screenshots를 수집하는지 확인합니다.
- `validatePortfolioAssets`의 `resolve(publicRoot, "." + assetPath)`, `relative`, `startsWith("..")`, `isAbsolute`, `existsSync` branches를 확인합니다.
- issues가 source file/path를 보존하고 content object를 그대로 반환하는지 확인합니다.
- 추가된 portrait placeholder SVG가 어떤 starter reference를 만족하는지 확인합니다.

확인 원칙:

- 먼저 `ff2ecadf3489^`와 `ff2ecadf3489`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:10-validated-facade-assets-and-build-gate.md:c4.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:10-validated-facade-assets-and-build-gate.md:c4.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:10-validated-facade-assets-and-build-gate.md:c4.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:10-validated-facade-assets-and-build-gate.md:c4.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:10-validated-facade-assets-and-build-gate.md:c4.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:10-validated-facade-assets-and-build-gate.md:c4.next --> |

#### 코드·실행 증거

<!-- learner:10-validated-facade-assets-and-build-gate.md:c4.evidence -->

### 5. `0e0ed9e50323` — build(content): 콘텐츠 검사 명령 추가

- **Importance:** B
- **Tags:** CONTENT, DEPLOY
- **Thread 역할:** explicit content validation command
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `package.json`의 `content:check` script와 `scripts/validate-content.ts`를 확인합니다.
- script가 `loadPortfolioSource()` 뒤 `validatePortfolioAssets(..., resolve(process.cwd(), "public"))`를 호출하고 project/design count를 출력하는지 확인합니다.

확인 원칙:

- 먼저 `0e0ed9e50323^`와 `0e0ed9e50323`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:10-validated-facade-assets-and-build-gate.md:c5.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:10-validated-facade-assets-and-build-gate.md:c5.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:10-validated-facade-assets-and-build-gate.md:c5.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:10-validated-facade-assets-and-build-gate.md:c5.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:10-validated-facade-assets-and-build-gate.md:c5.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:10-validated-facade-assets-and-build-gate.md:c5.next --> |

#### 코드·실행 증거

<!-- learner:10-validated-facade-assets-and-build-gate.md:c5.evidence -->

### 6. `28b0db56190f` — build(content): 콘텐츠 검사를 prebuild에 연결

- **Importance:** A
- **Tags:** CONTENT, DEPLOY
- **Thread 역할:** build fail-closed gate
- **조사 깊이:** 주요 subsystem의 결정 경로, owner, failure/non-guarantee와 integration evidence를 구체적으로 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `package.json`의 `prebuild: npm run content:check`와 npm lifecycle 순서를 확인합니다.
- `npm run build`가 content check failure 시 Next build 전에 중단되는 결과를 command semantics로 설명하되 실행하지 않은 결과를 주장하지 않습니다.

확인 원칙:

- 먼저 `28b0db56190f^`와 `28b0db56190f`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:10-validated-facade-assets-and-build-gate.md:c6.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:10-validated-facade-assets-and-build-gate.md:c6.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:10-validated-facade-assets-and-build-gate.md:c6.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:10-validated-facade-assets-and-build-gate.md:c6.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:10-validated-facade-assets-and-build-gate.md:c6.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:10-validated-facade-assets-and-build-gate.md:c6.next --> |

#### 코드·실행 증거

<!-- learner:10-validated-facade-assets-and-build-gate.md:c6.evidence -->

## 6. Invariant evolution ledger

| 추적할 invariant | 도입·변화 SHA | 실제 owner/evidence | 제한·후속 보호 |
| --- | --- | --- | --- |
| 주요 facade source/presentation types는 schema와 연결된다. | <!-- learner:10-validated-facade-assets-and-build-gate.md:ledger1.sha --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:ledger1.evidence --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:ledger1.limitation --> |
| Production facade는 raw JSON을 직접 import하지 않는다. | <!-- learner:10-validated-facade-assets-and-build-gate.md:ledger2.sha --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:ledger2.evidence --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:ledger2.limitation --> |
| Facade는 validation이 아니라 renderer transformation만 소유한다. | <!-- learner:10-validated-facade-assets-and-build-gate.md:ledger3.sha --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:ledger3.evidence --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:ledger3.limitation --> |
| Repository-local assets는 public root 아래 존재해야 한다. | <!-- learner:10-validated-facade-assets-and-build-gate.md:ledger4.sha --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:ledger4.evidence --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:ledger4.limitation --> |
| Standard build 전에 content gate를 통과한다. | <!-- learner:10-validated-facade-assets-and-build-gate.md:ledger5.sha --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:ledger5.evidence --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:ledger5.limitation --> |

## 7. Failure → Fix → Test 관계

| Failure 또는 risk | Fix/전환 SHA | 교정된 결정 | Regression·검증 관계 |
| --- | --- | --- | --- |
| Validated loader가 있어도 facade가 raw JSON을 우회 | <!-- learner:10-validated-facade-assets-and-build-gate.md:failure1.sha --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:failure1.correction --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:failure1.test --> |
| Legacy array/env href mutation이 trust boundary 밖에 남음 | <!-- learner:10-validated-facade-assets-and-build-gate.md:failure2.sha --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:failure2.correction --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:failure2.test --> |
| Schema-valid asset path가 repository에 없음/탈출 | <!-- learner:10-validated-facade-assets-and-build-gate.md:failure3.sha --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:failure3.correction --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:failure3.test --> |
| Validation command를 release가 누락 | <!-- learner:10-validated-facade-assets-and-build-gate.md:failure4.sha --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:failure4.correction --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:failure4.test --> |

## 8. Ownership·state·responsibility 변화

| 대상 | 이전 owner/state | 최종 owner/state | 근거 |
| --- | --- | --- | --- |
| source trust | <!-- learner:10-validated-facade-assets-and-build-gate.md:owner1.before --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:owner1.after --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:owner1.evidence --> |
| renderer aggregate | <!-- learner:10-validated-facade-assets-and-build-gate.md:owner2.before --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:owner2.after --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:owner2.evidence --> |
| asset integrity | <!-- learner:10-validated-facade-assets-and-build-gate.md:owner3.before --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:owner3.after --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:owner3.evidence --> |
| manual validation entry | <!-- learner:10-validated-facade-assets-and-build-gate.md:owner4.before --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:owner4.after --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:owner4.evidence --> |
| build ordering | <!-- learner:10-validated-facade-assets-and-build-gate.md:owner5.before --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:owner5.after --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:owner5.evidence --> |

## 9. Thread 최종 상태

<!-- learner:10-validated-facade-assets-and-build-gate.md:final.state -->

### 최종 설명

<!-- learner:10-validated-facade-assets-and-build-gate.md:final.explanation -->

## 10. 최종 실행·데이터 흐름

| 단계 | Owner/call path | 입력·출력 | Failure/non-guarantee |
| --- | --- | --- | --- |
| Module import 시 validated source를 획득합니다. | <!-- learner:10-validated-facade-assets-and-build-gate.md:flow1.owner --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:flow1.io --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:flow1.failure --> |
| Facade transformation을 수행합니다. | <!-- learner:10-validated-facade-assets-and-build-gate.md:flow2.owner --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:flow2.io --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:flow2.failure --> |
| Content command에서 asset을 검사합니다. | <!-- learner:10-validated-facade-assets-and-build-gate.md:flow3.owner --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:flow3.io --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:flow3.failure --> |
| Standard build lifecycle을 시작합니다. | <!-- learner:10-validated-facade-assets-and-build-gate.md:flow4.owner --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:flow4.io --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:flow4.failure --> |
| Next build로 진행합니다. | <!-- learner:10-validated-facade-assets-and-build-gate.md:flow5.owner --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:flow5.io --> | <!-- learner:10-validated-facade-assets-and-build-gate.md:flow5.failure --> |

## 11. 학습 완료 확인

<!-- learner:10-validated-facade-assets-and-build-gate.md:completion.check -->
