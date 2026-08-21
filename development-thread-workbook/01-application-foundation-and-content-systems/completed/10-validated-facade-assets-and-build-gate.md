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
| 직전 상태와 부족함 | Schema가 source shape와 inferred types를 제공해도 portfolio facade는 다수의 수동 presentation/project type을 별도로 유지해 drift 위험이 있었습니다. |
| 실제 변경 file/symbol/call path | 핵심 project source types를 schema module에서 재export하고 presentation route types를 `PresentationContentSource[...]` indexed types로 연결합니다. 다섯 `SiteDesignId`와 새 project fields도 facade type에 반영합니다. |
| Data/state/resource owner와 lifetime | Runtime schema가 source/presentation type의 canonical owner가 되고 facade types는 consumer용 aliases를 제공합니다. |
| Failure·absence·fallback 처리 | 모든 type이 schema-derived 되는 것은 아니며 일부 manual type과 assertion이 남습니다. Runtime behavior도 이 refactor 하나로 바뀌지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | 주요 schema/presentation source와 facade 정적 계약의 drift를 줄입니다. |
| 다음 commit 또는 관련 test 연결 | `16bdf03ce979`가 새 narrative domain types를 채우고 `508e0b71024b`가 production facade source를 교체합니다. |

#### 코드·실행 증거

정적 근거: `85df59454b46`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다. 중요도 A 근거: schema module과 public portfolio type surface 사이의 ownership을 재정렬하는 architecture-level refactor입니다.

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
| 직전 상태와 부족함 | Validated source에 journey narrative, interview map, curation이 있어도 portfolio aggregate가 노출할 renderer-facing types가 없었습니다. |
| 실제 변경 file/symbol/call path | 세 문서의 consumer-facing nested types를 `types.ts`에 추가합니다. |
| Data/state/resource owner와 lifetime | Portfolio facade type module이 renderer-facing aliases를 소유합니다. |
| Failure·absence·fallback 처리 | 수동 declarations이므로 schema와 완전히 자동 동기화되지는 않으며 production aggregate 연결은 다음 commit까지 없습니다. |
| 보장하는 것과 보장하지 않는 것 | 새 routes/view models가 사용할 정적 contracts를 제공합니다. |
| 다음 commit 또는 관련 test 연결 | `508e0b71024b`가 실제 aggregate fields와 validated source를 연결합니다. |

#### 코드·실행 증거

정적 근거: `16bdf03ce979`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

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
| 직전 상태와 부족함 | 기존 facade는 JSON을 직접 import해 `as` assertion과 임시 dual-shape branch를 사용했으므로 T8/T9 loader가 있어도 production consumer가 이를 우회했습니다. Environment href override도 unvalidated runtime mutation을 추가했습니다. |
| 실제 변경 file/symbol/call path | 모든 raw imports를 `portfolioSource`로 교체하고 validated projects/groups/metrics/presentation/narrative source를 renderer aggregate로 변환합니다. Group order를 copy-sort하고 group label을 project category로 파생하며 project groups를 presentation page에 투영합니다. Disabled project/link filtering은 유지하되 environment href mutation은 제거하고 legacy parameter는 무시합니다. |
| Data/state/resource owner와 lifetime | `content-loader.ts`가 source trust와 integrity를 소유하고 `portfolio/content.ts`는 validated data의 renderer-facing transformation/selection만 소유합니다. Module singleton source는 공유되고 `getPortfolioContent()`는 project/link arrays를 새로 구성하는 경계를 유지합니다. |
| Failure·absence·fallback 처리 | 여러 `as` casts가 consumer aliases 때문에 일부 남고 asset 존재는 아직 검사하지 않습니다. `_legacyEnvironment` 인자는 호환을 위해 존재하지만 behavior는 없습니다. Return object의 모든 nested value를 deep clone하지도 않습니다. |
| 보장하는 것과 보장하지 않는 것 | Production portfolio facade가 raw JSON 경로를 우회하지 않고 schema+integrity-validated source만 소비한다는 핵심 invariant를 확립합니다. |
| 다음 commit 또는 관련 test 연결 | `ff2ecadf3489`가 schema로 확인할 수 없는 public asset filesystem boundary를 추가하고 category 07 tests가 public export/clone/view-model behavior를 고정합니다. |

#### 코드·실행 증거

정적 근거: `508e0b71024b`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다. 중요도 S 근거: 실제 consumer architecture의 trust path를 raw assertions에서 validated loader로 교체하고 migration/env mutation까지 제거하는 ownership cutover입니다.

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
| 직전 상태와 부족함 | Schema는 asset path prefix/형식만 검사하므로 `public/` 밖으로 탈출하거나 repository에 없는 파일을 참조해도 source parse가 성공할 수 있었습니다. |
| 실제 변경 file/symbol/call path | 모든 repository-local asset references를 수집해 `publicRoot` 아래 absolute path로 resolve하고 traversal/absolute escape/absence를 하나의 structured issue 배열로 검사합니다. 성공 시 같은 validated source object를 반환합니다. |
| Data/state/resource owner와 lifetime | Filesystem-aware asset integrity는 `content-assets.ts`가 소유하고 schema/loader는 순수 data integrity를 유지합니다. |
| Failure·absence·fallback 처리 | 파일 내용·MIME·image decode·case sensitivity across platforms·remote URL reachability는 검사하지 않습니다. Symlink escape에 대한 명시적 `realpath` 검사는 보이지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | 수집된 asset references가 지정 public root 아래 존재한다는 build-time invariant를 제공합니다. |
| 다음 commit 또는 관련 test 연결 | `0e0ed9e50323`이 loader+asset validation을 한 command에 연결합니다. |

#### 코드·실행 증거

정적 근거: `ff2ecadf3489`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다. 중요도 A 근거: data schema로 표현할 수 없는 repository filesystem 상태를 content validation contract에 통합합니다.

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
| 직전 상태와 부족함 | Loader와 asset validator는 code path로 존재했지만 개발자/CI가 독립적으로 실행할 stable command가 없었습니다. |
| 실제 변경 file/symbol/call path | `node --import tsx scripts/validate-content.ts` command를 추가해 schema/integrity와 public assets를 연속 실행하고 성공 summary를 출력합니다. |
| Data/state/resource owner와 lifetime | package script가 manual/automation entry를, validation modules가 실제 rules를 소유합니다. |
| Failure·absence·fallback 처리 | Command가 아직 build lifecycle에 자동 연결되지 않았고 출력 count는 correctness proof가 아니라 성공 summary입니다. |
| 보장하는 것과 보장하지 않는 것 | 명시적으로 실행 가능한 content validation command를 제공합니다. |
| 다음 commit 또는 관련 test 연결 | `28b0db56190f`가 이를 `prebuild`에 연결합니다. |

#### 코드·실행 증거

정적 근거: `0e0ed9e50323`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

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
| 직전 상태와 부족함 | Content validation command는 선택적이어서 개발자나 release process가 건너뛴 채 `next build`를 수행할 수 있었습니다. |
| 실제 변경 file/symbol/call path | npm `prebuild` lifecycle에 `content:check`를 연결해 standard build path에서 schema, cross-file integrity, asset 존재를 먼저 검사합니다. |
| Data/state/resource owner와 lifetime | `package.json` lifecycle이 build gate ordering을 소유합니다. |
| Failure·absence·fallback 처리 | `next build` 외의 직접 framework invocation이나 `--ignore-scripts` 같은 우회는 차단하지 않으며 이 작업에서는 command를 실제 실행하지 않았습니다. |
| 보장하는 것과 보장하지 않는 것 | 정상적인 `npm run build`가 content validation success 없이는 build phase에 진입하지 않는 구조를 제공합니다. |
| 다음 commit 또는 관련 test 연결 | Category 08이 production toolchain/server verification을, category 07이 regression tests를 후속 보호합니다. |

#### 코드·실행 증거

정적 근거: `28b0db56190f`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다. 중요도 A 근거: validation을 선택적 도구에서 standard release build의 선행 조건으로 승격합니다.

## 6. Invariant evolution ledger

| 추적할 invariant | 도입·변화 SHA | 실제 owner/evidence | 제한·후속 보호 |
| --- | --- | --- | --- |
| 주요 facade source/presentation types는 schema와 연결된다. | `85df59454b46` | `portfolio/types.ts` schema aliases | 일부 manual types는 남음 |
| Production facade는 raw JSON을 직접 import하지 않는다. | `508e0b71024b` | `portfolioSource` single input | asset check는 별도 command |
| Facade는 validation이 아니라 renderer transformation만 소유한다. | `508e0b71024b` | group sort/label, presentation groups, journey sort, enabled filter | deep clone은 아님 |
| Repository-local assets는 public root 아래 존재해야 한다. | `ff2ecadf3489` | `validatePortfolioAssets` | content/MIME/symlink semantics 미검사 |
| Standard build 전에 content gate를 통과한다. | `0e0ed9e50323` → `28b0db56190f` | `content:check`, `prebuild` | 직접/ignore-scripts 우회 가능 |

## 7. Failure → Fix → Test 관계

| Failure 또는 risk | Fix/전환 SHA | 교정된 결정 | Regression·검증 관계 |
| --- | --- | --- | --- |
| Validated loader가 있어도 facade가 raw JSON을 우회 | `508e0b71024b` | direct imports/assertions 제거, `portfolioSource` cutover | `3353032ba23b`/`dc07871c4d24` regression |
| Legacy array/env href mutation이 trust boundary 밖에 남음 | `508e0b71024b` | migration branch/`withEnvHref` 제거 | public API compatibility는 ignored parameter로 유지 |
| Schema-valid asset path가 repository에 없음/탈출 | `ff2ecadf3489` | public-root resolve/relative/exists checks | 후속 missing-asset tests |
| Validation command를 release가 누락 | `28b0db56190f` | `prebuild` gate | category 08 CI/container/release verification |

## 8. Ownership·state·responsibility 변화

| 대상 | 이전 owner/state | 최종 owner/state | 근거 |
| --- | --- | --- | --- |
| source trust | raw imports + assertions | `content-loader.ts`/`portfolioSource` | schema+integrity parsed singleton |
| renderer aggregate | source import와 validation 혼합 | `portfolio/content.ts` | validated data transformation only |
| asset integrity | 없음 | `content-assets.ts` | filesystem-aware public asset checks |
| manual validation entry | 없음 | `content:check` | package script |
| build ordering | Next build directly | `prebuild` → `content:check` → `build` | npm lifecycle |

## 9. Thread 최종 상태

Thread 종료 시점에는 portfolio facade가 validated `portfolioSource`만 소비하고 renderer-facing group/category/presentation/journey/enablement 변환을 수행합니다. Repository-local assets는 별도 validator로 public root 안의 존재를 검사하며 standard `npm run build`는 `content:check`를 선행합니다. 다만 deep clone, remote URL/MIME/image decoding, symlink realpath, 모든 build 우회, 실제 runtime command 성공은 보장하지 않습니다.

### 최종 설명

- Schema-derived types를 public facade type surface에 연결해 중복 계약을 줄였습니다.
- S-level cutover에서 raw JSON imports, assertion-based project migration, env href mutation을 production facade에서 제거했습니다.
- Data integrity와 filesystem asset integrity를 분리한 뒤 하나의 command로 조합했습니다.
- 선택적 content check를 standard npm build gate로 승격했습니다.

## 10. 최종 실행·데이터 흐름

| 단계 | Owner/call path | 입력·출력 | Failure/non-guarantee |
| --- | --- | --- | --- |
| Module import 시 validated source를 획득합니다. | `portfolioSource` | schema+integrity checked raw-domain object | malformed source면 import 실패 |
| Facade transformation을 수행합니다. | `portfolio/content.ts` | sorted groups/journey, derived category/presentation groups, enabled items | deep clone 아님; env override 무시 |
| Content command에서 asset을 검사합니다. | `validate-content.ts` → `validatePortfolioAssets` | same source or structured error | remote/MIME/decode 미검사 |
| Standard build lifecycle을 시작합니다. | `npm run build` | `prebuild`가 `content:check` 선행 | 실제 command는 이번 작업에서 미실행 |
| Next build로 진행합니다. | `build: next build` | production bundle attempt | category 08의 toolchain/server verification 범위 |

## 11. 학습 완료 확인

완료했습니다. 모든 commit은 exact SHA의 parent diff/resulting tree를 기준으로 기록했고, direct execution evidence와 static inspection을 구분했습니다. `3353032ba23b`은 source/assets/model validation, `dc07871c4d24`는 public export와 clone boundary, `b77b386b344e`/`527b9f872333`은 route view models/scoped payload를 후속 테스트합니다. 이번 환경에서는 repository checkout이 없어 테스트·build를 실행하지 않았습니다.
