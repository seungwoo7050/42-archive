# Thread: Selectors, links, and derived content policy

> Repository: `https://github.com/seungwoo7050/42-archive`  
> Branch: `web/portfolio`  
> Category: `01-application-foundation-and-content-systems`

## 0. 분류 출처와 변경 가능 범위

- Commit SHA, subject, importance, tags는 target branch의 `commit/commit-importance.md` 분류와 exact commit metadata를 사용합니다.
- 이 문서의 Thread grouping, 목표, 역할, 조사 지점은 Phase 1 category audit에서 repository evidence를 기준으로 확정했습니다.
- Phase 2에서는 이 fixed information을 바꾸지 않고 learner-facing 기록만 채웠습니다.
- 다른 branch나 final HEAD 구현을 과거 SHA 설명에 소급하지 않습니다.

## 1. Thread 목표

renderer와 route에 흩어질 수 있는 lookup, fallback, enabled page, link placement, project metric 계산을 pure selector policy로 중앙화하고 실제 consumer가 이를 사용하도록 전환하는 과정을 복원합니다.

### 계획된 핵심 invariant

- lookup/fallback/filter/metric 계산은 selector가 소유하고 renderer는 결과를 표현합니다.
- page enablement는 `false`만 차단하는 명시적 fail-open 정책입니다.
- link placement와 live deployment 조건은 같은 selector 경로에서 함께 적용됩니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- unknown technology, missing reference, disabled page는 각각 fallback·omission·false 중 무엇으로 처리되는가?
- metric filter의 여러 조건은 AND인가 OR인가?
- placement vocabulary가 도입된 뒤 어떤 consumer의 임의 type filter가 제거되는가?

## 3. 완료 기준

- 각 SHA의 parent diff와 resulting tree에서 실제 file/symbol을 확인합니다.
- 이전 상태, implementation decision, owner/lifetime, absence/failure/fallback, guarantee/non-guarantee를 분리합니다.
- Fix·refactor·integration은 바로 앞의 assumption이나 duplicated responsibility와 연결합니다.
- 테스트나 command는 실제 실행 여부를 정적 검토와 명확히 구분합니다.
- Thread 종료 시 invariant evolution과 최종 flow를 코드 없이 설명합니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | 이 Thread에서의 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `eb988f5e09e4` | feat(portfolio): 기술과 프로젝트 조회기 추가 | B | CONTENT | 기본 lookup/fallback selectors |
| 2 | `ba8da56d3fcf` | feat(portfolio): 연락과 프로젝트 링크 선택기 추가 | A | CONTENT | link/deployment 정책 중앙화 |
| 3 | `3e2e95a3a28c` | feat(content): 페이지 활성화 selector 추가 | B | CONTENT, ROUTING | page enablement selector |
| 4 | `7c539b142d6d` | feat(content): 프로젝트 지표 selector 추가 | B | CONTENT | declarative metric evaluator |
| 5 | `daa6815a6dfa` | feat(project): 카드 링크를 콘텐츠 배치 기준으로 선택 | B | CONTENT, RENDERER | card placement 최초 소비 |
| 6 | `383a3b86e119` | feat(content): 프로젝트 지표를 화면에 적용 | B | CONTENT | metric selector consumer migration |
| 7 | `119ff9a92090` | feat(content): 링크 배치 selector 추가 | B | CONTENT | 공용 LinkPlacement vocabulary |
| 8 | `2d87b62dcce8` | refactor(project): 상세 링크를 배치 기준으로 선택 | B | RENDERER, REFACTOR | detail component consumer migration |
| 9 | `ee2c118a76d6` | feat(content): 홈 링크를 배치 기준으로 선택 | B | CONTENT | home hero consumer migration |

## 5. Commit별 학습 기록

### 1. `eb988f5e09e4` — feat(portfolio): 기술과 프로젝트 조회기 추가

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** 기본 lookup/fallback selectors
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `src/lib/portfolio/selectors.ts`의 technology fallback, featured/project-by-id, resume project selectors를 확인합니다.
- unknown tech와 missing project ID가 각각 어떤 결과를 내는지 확인합니다.

확인 원칙:

- 먼저 `eb988f5e09e4^`와 `eb988f5e09e4`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | renderer가 Map lookup, featured filtering, resume ID resolution을 직접 반복할 수 있었습니다. |
| 실제 변경 file/symbol/call path | unknown technology를 `tool` fallback과 기본 색으로 정규화하고, project lookup/featured/resume resolution을 함수로 모읍니다. |
| Data/state/resource owner와 lifetime | selector가 파생 정책을 소유하며 component는 반환된 record만 소비합니다. |
| Failure·absence·fallback 처리 | missing resume/project reference는 omission 또는 `undefined`가 되어 오류가 아닙니다. cross-file validation은 아직 없습니다. |
| 보장하는 것과 보장하지 않는 것 | 일관된 fallback/omission을 보장하지만 source integrity를 보장하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | `ba8da56d3fcf`가 link/deployment policy를 확장합니다. |

#### 코드·실행 증거

정적 근거: `eb988f5e09e4`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 2. `ba8da56d3fcf` — feat(portfolio): 연락과 프로젝트 링크 선택기 추가

- **Importance:** A
- **Tags:** CONTENT
- **Thread 역할:** link/deployment 정책 중앙화
- **조사 깊이:** 주요 subsystem의 결정 경로, owner, failure/non-guarantee와 integration evidence를 구체적으로 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `getPreferredContactLinks`, project link selectors, `isProjectLive`, `getProjectCardLinks`, external link props를 확인합니다.
- demo link가 live deployment 조건을 통과해야 하는지와 source/github/case-study 처리 차이를 확인합니다.
- barrel export에서 public selector surface를 확인합니다.

확인 원칙:

- 먼저 `ba8da56d3fcf^`와 `ba8da56d3fcf`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | contact preferred IDs, project action links, live badge/external props를 component마다 type과 deployment 상태로 판단할 위험이 있었습니다. |
| 실제 변경 file/symbol/call path | preferred contact ID order를 보존해 enabled links를 resolve하고, project link type별 선택, live 상태, card action, external target/rel props를 selector로 중앙화합니다. |
| Data/state/resource owner와 lifetime | `selectors.ts`가 선택 정책을 소유하고 components는 link record/props를 표현합니다. missing preferred IDs는 생략되고 demo는 live일 때만 노출됩니다. |
| Failure·absence·fallback 처리 | 아직 `placements`가 없어 card/detail/hero 문맥을 link type으로 추정합니다. URL route integrity도 검사하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | link/deployment policy의 단일 호출 경로를 보장하지만 문맥별 author intent는 보장하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | `3e2e95a3a28c`가 page policy를, `119ff9a92090` 이후가 placement vocabulary를 추가합니다. |

#### 코드·실행 증거

정적 근거: `ba8da56d3fcf`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다. 후속 `dc07871c4d24`가 public export surface를, `b77b386b344e`가 selector 결과를 테스트합니다.

### 3. `3e2e95a3a28c` — feat(content): 페이지 활성화 selector 추가

- **Importance:** B
- **Tags:** CONTENT, ROUTING
- **Thread 역할:** page enablement selector
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `isPortfolioPageEnabled` 또는 대응 selector가 `site.pages?.[pageId] !== false`를 사용하는지 확인합니다.
- missing pages map과 missing page key의 결과를 확인합니다.

확인 원칙:

- 먼저 `3e2e95a3a28c^`와 `3e2e95a3a28c`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | route가 page availability를 각자 판단하거나 optional config 누락을 disabled로 오해할 수 있었습니다. |
| 실제 변경 file/symbol/call path | 명시적 `false`만 비활성으로 보고 누락/true는 활성으로 해석하는 selector를 추가합니다. |
| Data/state/resource owner와 lifetime | site config가 policy input을, selector가 fail-open 판단을 소유합니다. |
| Failure·absence·fallback 처리 | 오타 난 page ID는 type/runtime schema가 별도 차단해야 하며, route가 selector를 사용하지 않으면 정책은 적용되지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | optional page config의 backward-compatible 활성화 규칙을 보장합니다. |
| 다음 commit 또는 관련 test 연결 | T9 loader가 disabled page를 가리키는 internal route를 후속 거부합니다. |

#### 코드·실행 증거

정적 근거: `3e2e95a3a28c`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 4. `7c539b142d6d` — feat(content): 프로젝트 지표 selector 추가

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** declarative metric evaluator
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `getProjectMetricValue`와 filter predicate를 확인합니다.
- `projectIds`, `groupIds`, `tags`, `featured`, `deploymentStatuses` 조건이 함께 있을 때 AND로 적용되는지 확인합니다.
- `aggregate: count`와 `sum-highlights`, unknown metric ID의 0 fallback을 확인합니다.

확인 원칙:

- 먼저 `7c539b142d6d^`와 `7c539b142d6d`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | 프로젝트 통계가 featured, path prefix, 특정 ID 같은 화면별 heuristic으로 계산될 수 있었습니다. |
| 실제 변경 file/symbol/call path | metric definition을 ID로 찾고 여러 filter 조건을 모두 만족하는 project만 선택한 뒤 count 또는 highlights 합계를 계산합니다. |
| Data/state/resource owner와 lifetime | metric 정의는 content가, 평가 알고리즘은 selector가 소유합니다. |
| Failure·absence·fallback 처리 | unknown metric은 0으로 fallback하므로 구성 누락을 오류로 만들지 않습니다. project/tag/group reference integrity는 loader 전까지 보장되지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | 동일 metric ID에 대한 일관된 계산을 보장하지만 정의의 비즈니스 타당성은 보장하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | `383a3b86e119`이 실제 projects/work-map consumers의 heuristic을 제거합니다. |

#### 코드·실행 증거

정적 근거: `7c539b142d6d`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 5. `daa6815a6dfa` — feat(project): 카드 링크를 콘텐츠 배치 기준으로 선택

- **Importance:** B
- **Tags:** CONTENT, RENDERER
- **Thread 역할:** card placement 최초 소비
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `getProjectCardLinks`의 `placements?.includes("card")` 선행 조건을 확인합니다.
- demo link에만 `isProjectLive`가 추가로 적용되고 다른 type은 placement만 통과하면 반환되는지 확인합니다.

확인 원칙:

- 먼저 `daa6815a6dfa^`와 `daa6815a6dfa`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | card action은 github/case-study type을 암묵적으로 허용해 author가 지정한 문맥을 표현할 수 없었습니다. |
| 실제 변경 file/symbol/call path | card placement가 없는 link를 먼저 제거하고 demo에는 live 조건을 유지하며 나머지 type은 배치 의도를 따릅니다. |
| Data/state/resource owner와 lifetime | content author가 placement를 소유하고 selector가 deployment guard와 함께 해석합니다. |
| Failure·absence·fallback 처리 | placement 누락은 omission이며 오류가 아닙니다. 다른 hero/detail/contact consumers는 아직 이전 정책일 수 있습니다. |
| 보장하는 것과 보장하지 않는 것 | project card가 explicit placement를 따르는 것을 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `119ff9a92090`이 공용 placement vocabulary/selectors를 정리합니다. |

#### 코드·실행 증거

정적 근거: `daa6815a6dfa`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 6. `383a3b86e119` — feat(content): 프로젝트 지표를 화면에 적용

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** metric selector consumer migration
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `src/app/projects/page.tsx`와 `work-map-section.tsx`에서 path/ID/featured heuristic이 `getProjectMetricValue`로 교체되는지 확인합니다.
- `project-detail-view.tsx`에 highlights section이 추가되는 별도 표현 변경을 구분합니다.

확인 원칙:

- 먼저 `383a3b86e119^`와 `383a3b86e119`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | projects page와 work map이 screenshot path, 특정 project ID, `featured`를 직접 해석해 metric source와 중복되었습니다. |
| 실제 변경 file/symbol/call path | 두 consumer가 named metric selector를 호출하도록 바꾸고 project detail에 이미 계약화된 highlights section을 표시합니다. |
| Data/state/resource owner와 lifetime | 통계 정책 owner는 selector/content metric으로 이동하고 route/component는 key 선택과 표시만 담당합니다. |
| Failure·absence·fallback 처리 | metric ID 오타는 0으로 보일 수 있으며 이 commit의 highlights 추가는 metric migration과 독립적인 표현 변화입니다. |
| 보장하는 것과 보장하지 않는 것 | 주요 화면이 동일 metric evaluator를 소비함을 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `119ff9a92090` 이후 link placement policy도 공용화됩니다. |

#### 코드·실행 증거

정적 근거: `383a3b86e119`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 7. `119ff9a92090` — feat(content): 링크 배치 selector 추가

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** 공용 LinkPlacement vocabulary
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `LinkPlacement` type과 placement 기반 selector들을 확인합니다.
- hero/contact/card/detail/footer별 selection과 demo live guard가 어디에서 공유되는지 확인합니다.

확인 원칙:

- 먼저 `119ff9a92090^`와 `119ff9a92090`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | card만 placement를 사용하고 다른 문맥은 type/수동 filter에 남아 정책이 비대칭이었습니다. |
| 실제 변경 file/symbol/call path | 공용 `LinkPlacement` vocabulary와 context별 selectors를 추가합니다. |
| Data/state/resource owner와 lifetime | selector module이 모든 placement 해석을 소유하고 content link가 author intent를 담습니다. |
| Failure·absence·fallback 처리 | 빈/누락 placements를 오류로 만들지 않으며 schema/loader가 placement enum만 별도 검증합니다. |
| 보장하는 것과 보장하지 않는 것 | 문맥별 link 선택의 단일 정책을 제공합니다. |
| 다음 commit 또는 관련 test 연결 | `2d87b62dcce8`과 `ee2c118a76d6`이 실제 components/renderers를 migration합니다. |

#### 코드·실행 증거

정적 근거: `119ff9a92090`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 8. `2d87b62dcce8` — refactor(project): 상세 링크를 배치 기준으로 선택

- **Importance:** B
- **Tags:** RENDERER, REFACTOR
- **Thread 역할:** detail component consumer migration
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- project detail links component의 local `link.type` filter 제거를 확인합니다.
- 새 detail selector 호출과 렌더링 props가 behavior-preserving인지 비교합니다.

확인 원칙:

- 먼저 `2d87b62dcce8^`와 `2d87b62dcce8`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | project detail component가 허용 link type을 자체 filter하여 placement policy와 중복되었습니다. |
| 실제 변경 file/symbol/call path | local filter를 제거하고 detail placement selector 결과만 렌더링하도록 refactor합니다. |
| Data/state/resource owner와 lifetime | 선택 책임은 selector로, markup/action 표현은 component에 남습니다. |
| Failure·absence·fallback 처리 | DOM/action behavior가 동일하다는 실행 증거는 이 commit 자체에 없고 source placements가 비어 있으면 링크가 사라질 수 있습니다. |
| 보장하는 것과 보장하지 않는 것 | detail link 선택이 공용 policy를 사용함을 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `ee2c118a76d6`이 home hero consumers를 같은 policy로 전환합니다. |

#### 코드·실행 증거

정적 근거: `2d87b62dcce8`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 9. `ee2c118a76d6` — feat(content): 홈 링크를 배치 기준으로 선택

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** home hero consumer migration
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- Design/Classic home renderer에서 link type 기반 selection이 hero placement selector로 바뀌는지 확인합니다.
- live demo guard와 fallback action이 유지되는지 확인합니다.

확인 원칙:

- 먼저 `ee2c118a76d6^`와 `ee2c118a76d6`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | home hero가 link type을 직접 해석해 detail/card와 다른 규칙을 가질 수 있었습니다. |
| 실제 변경 file/symbol/call path | Design/Classic home action selection을 placement selector로 전환합니다. |
| Data/state/resource owner와 lifetime | selector가 author intent/deployment를 결정하고 renderer는 반환 action을 표현합니다. |
| Failure·absence·fallback 처리 | 다른 design renderer 소비와 visual 결과는 별도 commits/tests가 책임집니다. |
| 보장하는 것과 보장하지 않는 것 | 초기 두 home이 공용 placement policy를 따릅니다. |
| 다음 commit 또는 관련 test 연결 | 후속 design/view-model tests가 모든 renderer와 scoped payload의 일관성을 보호합니다. |

#### 코드·실행 증거

정적 근거: `ee2c118a76d6`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

## 6. Invariant evolution ledger

| 추적할 invariant | 도입·변화 SHA | 실제 owner/evidence | 제한·후속 보호 |
| --- | --- | --- | --- |
| fallback/omission/selection 정책은 selector가 소유한다. | `eb988f5e09e4` → `ba8da56d3fcf` | `src/lib/portfolio/selectors.ts` | unknown tech는 fallback, missing refs는 omission |
| page는 명시적 false만 비활성이다. | `3e2e95a3a28c` | page enablement selector | disabled route references는 T9에서 오류 |
| metric은 content definition을 AND filter로 평가한다. | `7c539b142d6d` → `383a3b86e119` | `getProjectMetricValue`와 consumers | unknown metric은 0 |
| link 문맥은 explicit placement로 결정한다. | `daa6815a6dfa` → `119ff9a92090` → consumers | placement selectors | placement 누락은 omission |

## 7. Failure → Fix → Test 관계

| Failure 또는 risk | Fix/전환 SHA | 교정된 결정 | Regression·검증 관계 |
| --- | --- | --- | --- |
| renderer마다 lookup/fallback이 달라질 위험 | `eb988f5e09e4` | technology/project/resume selectors | 후속 selector/view-model tests |
| link type이 문맥을 암묵적으로 결정 | `daa6815a6dfa`, `119ff9a92090` | placement-first selectors | `3353032ba23b`의 card/live selector regression |
| 화면이 ID/path heuristic으로 metric 계산 | `383a3b86e119` | 공용 metric evaluator 소비 | `3353032ba23b`의 metric differential test |

## 8. Ownership·state·responsibility 변화

| 대상 | 이전 owner/state | 최종 owner/state | 근거 |
| --- | --- | --- | --- |
| raw source | renderer/component | portfolio aggregate | `PortfolioContent` |
| lookup/fallback | 각 consumer | `selectors.ts` | pure lookup/filter functions |
| metric 계산 | route/component heuristic | `getProjectMetricValue` | content metrics + AND filters |
| link 문맥 | type 추정 | content placements + selectors | consumer는 결과만 렌더링 |

## 9. Thread 최종 상태

Thread 종료 시점에는 technology/project/contact/resume lookup, page enablement, metric 계산, deployment/live link와 placement 정책이 selector로 집중됩니다. Consumer는 domain rule을 재해석하지 않고 selector 결과를 표시하지만, missing configuration의 상당수는 error가 아니라 fallback/omission/0으로 처리됩니다.

### 최종 설명

- 조회·fallback·enabled/deployment 정책을 pure selectors로 모았습니다.
- hard-coded metric heuristics를 declarative metric evaluator로 교체했습니다.
- link type 추정에서 explicit placement vocabulary로 이동하고 실제 components를 migration했습니다.
- fail-open/omission/0 fallback이 의도된 비보장임을 runtime integrity 오류와 구분해야 합니다.

## 10. 최종 실행·데이터 흐름

| 단계 | Owner/call path | 입력·출력 | Failure/non-guarantee |
| --- | --- | --- | --- |
| aggregate와 context를 입력합니다. | `PortfolioContent`, project/link/page ID | selector input | unknown/missing 값은 각 selector 정책으로 처리 |
| lookup/filter/metric을 평가합니다. | `selectors.ts` | records, booleans, counts, links | unknown metric 0; missing refs omission |
| route/view model이 결과를 조합합니다. | projects/home/detail consumers | scoped values | consumer가 local heuristic을 다시 넣으면 invariant가 깨짐 |
| renderer가 표시합니다. | components/design routes | actions/stats/content | DOM/visual behavior는 별도 test |

## 11. 학습 완료 확인

완료했습니다. 모든 commit은 exact SHA의 parent diff/resulting tree를 기준으로 기록했고, direct execution evidence와 static inspection을 구분했습니다. `3353032ba23b`은 metric differential, featured/resume/card/live selectors를, `b77b386b344e`와 `527b9f872333`은 route별 derived/scoped view models를 후속 테스트합니다. 이 작업에서는 실행하지 않았습니다.
