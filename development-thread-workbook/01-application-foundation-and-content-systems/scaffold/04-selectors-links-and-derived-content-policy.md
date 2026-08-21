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
| 직전 상태와 부족함 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c1.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:04-selectors-links-and-derived-content-policy.md:c1.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:04-selectors-links-and-derived-content-policy.md:c1.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c1.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c1.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c1.next --> |

#### 코드·실행 증거

<!-- learner:04-selectors-links-and-derived-content-policy.md:c1.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c2.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:04-selectors-links-and-derived-content-policy.md:c2.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:04-selectors-links-and-derived-content-policy.md:c2.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c2.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c2.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c2.next --> |

#### 코드·실행 증거

<!-- learner:04-selectors-links-and-derived-content-policy.md:c2.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c3.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:04-selectors-links-and-derived-content-policy.md:c3.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:04-selectors-links-and-derived-content-policy.md:c3.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c3.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c3.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c3.next --> |

#### 코드·실행 증거

<!-- learner:04-selectors-links-and-derived-content-policy.md:c3.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c4.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:04-selectors-links-and-derived-content-policy.md:c4.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:04-selectors-links-and-derived-content-policy.md:c4.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c4.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c4.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c4.next --> |

#### 코드·실행 증거

<!-- learner:04-selectors-links-and-derived-content-policy.md:c4.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c5.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:04-selectors-links-and-derived-content-policy.md:c5.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:04-selectors-links-and-derived-content-policy.md:c5.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c5.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c5.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c5.next --> |

#### 코드·실행 증거

<!-- learner:04-selectors-links-and-derived-content-policy.md:c5.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c6.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:04-selectors-links-and-derived-content-policy.md:c6.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:04-selectors-links-and-derived-content-policy.md:c6.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c6.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c6.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c6.next --> |

#### 코드·실행 증거

<!-- learner:04-selectors-links-and-derived-content-policy.md:c6.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c7.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:04-selectors-links-and-derived-content-policy.md:c7.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:04-selectors-links-and-derived-content-policy.md:c7.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c7.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c7.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c7.next --> |

#### 코드·실행 증거

<!-- learner:04-selectors-links-and-derived-content-policy.md:c7.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c8.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:04-selectors-links-and-derived-content-policy.md:c8.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:04-selectors-links-and-derived-content-policy.md:c8.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c8.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c8.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c8.next --> |

#### 코드·실행 증거

<!-- learner:04-selectors-links-and-derived-content-policy.md:c8.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c9.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:04-selectors-links-and-derived-content-policy.md:c9.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:04-selectors-links-and-derived-content-policy.md:c9.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c9.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c9.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:04-selectors-links-and-derived-content-policy.md:c9.next --> |

#### 코드·실행 증거

<!-- learner:04-selectors-links-and-derived-content-policy.md:c9.evidence -->

## 6. Invariant evolution ledger

| 추적할 invariant | 도입·변화 SHA | 실제 owner/evidence | 제한·후속 보호 |
| --- | --- | --- | --- |
| fallback/omission/selection 정책은 selector가 소유한다. | <!-- learner:04-selectors-links-and-derived-content-policy.md:ledger1.sha --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:ledger1.evidence --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:ledger1.limitation --> |
| page는 명시적 false만 비활성이다. | <!-- learner:04-selectors-links-and-derived-content-policy.md:ledger2.sha --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:ledger2.evidence --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:ledger2.limitation --> |
| metric은 content definition을 AND filter로 평가한다. | <!-- learner:04-selectors-links-and-derived-content-policy.md:ledger3.sha --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:ledger3.evidence --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:ledger3.limitation --> |
| link 문맥은 explicit placement로 결정한다. | <!-- learner:04-selectors-links-and-derived-content-policy.md:ledger4.sha --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:ledger4.evidence --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:ledger4.limitation --> |

## 7. Failure → Fix → Test 관계

| Failure 또는 risk | Fix/전환 SHA | 교정된 결정 | Regression·검증 관계 |
| --- | --- | --- | --- |
| renderer마다 lookup/fallback이 달라질 위험 | <!-- learner:04-selectors-links-and-derived-content-policy.md:failure1.sha --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:failure1.correction --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:failure1.test --> |
| link type이 문맥을 암묵적으로 결정 | <!-- learner:04-selectors-links-and-derived-content-policy.md:failure2.sha --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:failure2.correction --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:failure2.test --> |
| 화면이 ID/path heuristic으로 metric 계산 | <!-- learner:04-selectors-links-and-derived-content-policy.md:failure3.sha --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:failure3.correction --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:failure3.test --> |

## 8. Ownership·state·responsibility 변화

| 대상 | 이전 owner/state | 최종 owner/state | 근거 |
| --- | --- | --- | --- |
| raw source | <!-- learner:04-selectors-links-and-derived-content-policy.md:owner1.before --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:owner1.after --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:owner1.evidence --> |
| lookup/fallback | <!-- learner:04-selectors-links-and-derived-content-policy.md:owner2.before --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:owner2.after --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:owner2.evidence --> |
| metric 계산 | <!-- learner:04-selectors-links-and-derived-content-policy.md:owner3.before --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:owner3.after --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:owner3.evidence --> |
| link 문맥 | <!-- learner:04-selectors-links-and-derived-content-policy.md:owner4.before --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:owner4.after --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:owner4.evidence --> |

## 9. Thread 최종 상태

<!-- learner:04-selectors-links-and-derived-content-policy.md:final.state -->

### 최종 설명

<!-- learner:04-selectors-links-and-derived-content-policy.md:final.explanation -->

## 10. 최종 실행·데이터 흐름

| 단계 | Owner/call path | 입력·출력 | Failure/non-guarantee |
| --- | --- | --- | --- |
| aggregate와 context를 입력합니다. | <!-- learner:04-selectors-links-and-derived-content-policy.md:flow1.owner --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:flow1.io --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:flow1.failure --> |
| lookup/filter/metric을 평가합니다. | <!-- learner:04-selectors-links-and-derived-content-policy.md:flow2.owner --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:flow2.io --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:flow2.failure --> |
| route/view model이 결과를 조합합니다. | <!-- learner:04-selectors-links-and-derived-content-policy.md:flow3.owner --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:flow3.io --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:flow3.failure --> |
| renderer가 표시합니다. | <!-- learner:04-selectors-links-and-derived-content-policy.md:flow4.owner --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:flow4.io --> | <!-- learner:04-selectors-links-and-derived-content-policy.md:flow4.failure --> |

## 11. 학습 완료 확인

<!-- learner:04-selectors-links-and-derived-content-policy.md:completion.check -->
