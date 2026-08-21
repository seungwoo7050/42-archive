# Thread: Starter catalog migration

> Repository: `https://github.com/seungwoo7050/42-archive`  
> Branch: `web/portfolio`  
> Category: `01-application-foundation-and-content-systems`

## 0. 분류 출처와 변경 가능 범위

- Commit SHA, subject, importance, tags는 target branch의 `commit/commit-importance.md` 분류와 exact commit metadata를 사용합니다.
- 이 문서의 Thread grouping, 목표, 역할, 조사 지점은 Phase 1 category audit에서 repository evidence를 기준으로 확정했습니다.
- Phase 2에서는 이 fixed information을 바꾸지 않고 learner-facing 기록만 채웠습니다.
- 다른 branch나 final HEAD 구현을 과거 SHA 설명에 소급하지 않습니다.

## 1. Thread 목표

빈 collection과 generic placeholder를 실제 schema 전체를 행사하는 coherent starter catalog로 바꾸고, project source를 legacy 배열에서 `{groups, metrics, items}` document로 이행하는 과정을 복원합니다.

### 계획된 핵심 invariant

- Migration 중에는 legacy 배열과 새 catalog object를 모두 읽지만 이 compatibility branch는 runtime validation이 아닙니다.
- Starter source의 cross-file IDs는 서로 맞물려야 하지만 이 Thread 시점에는 관례로만 유지됩니다.
- 중간 commit의 일시적으로 불완전한 catalog와 최종 coherent starter 상태를 구분합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 호환 loader가 두 project source shape를 수용하는 방식과 한계는 무엇인가?
- groups/metrics가 먼저 추가되고 items가 뒤따르는 중간 상태는 왜 그대로 기록해야 하는가?
- starter content가 schema coverage를 넓혀도 runtime parse/reference validation을 대신하지 못하는 이유는 무엇인가?

## 3. 완료 기준

- 각 SHA의 parent diff와 resulting tree에서 실제 file/symbol을 확인합니다.
- 이전 상태, implementation decision, owner/lifetime, absence/failure/fallback, guarantee/non-guarantee를 분리합니다.
- Fix·refactor·integration은 바로 앞의 assumption이나 duplicated responsibility와 연결합니다.
- 테스트나 command는 실제 실행 여부를 정적 검토와 명확히 구분합니다.
- Thread 종료 시 invariant evolution과 최종 flow를 코드 없이 설명합니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | 이 Thread에서의 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `d717c35cf80c` | refactor(content): 프로젝트 컬렉션 migration 경계 추가 | B | CONTENT, REFACTOR | legacy/new project source 호환 경계 |
| 2 | `6caa6debdb01` | feat(content): 사이트와 프로필 starter 콘텐츠 구성 | B | CONTENT | identity starter source |
| 3 | `f8ea6376c65c` | feat(content): 링크와 기술 starter 콘텐츠 구성 | B | CONTENT | link/technology starter graph |
| 4 | `247ad421101a` | feat(content): 프로젝트 starter 분류와 지표 구성 | B | CONTENT | catalog envelope와 metric starter |
| 5 | `c58a1be43009` | feat(content): 프로젝트 starter 상세 구성 | B | CONTENT | full starter project case |
| 6 | `83bd41a353ce` | feat(content): Resume와 여정 starter 콘텐츠 구성 | B | CONTENT, RENDERER | chronology/résumé starter references |
| 7 | `7ba62b311776` | feat(content): Interview Map과 큐레이션 starter 콘텐츠 구성 | B | CONTENT, RENDERER | evidence/curation starter graph |

## 5. Commit별 학습 기록

### 1. `d717c35cf80c` — refactor(content): 프로젝트 컬렉션 migration 경계 추가

- **Importance:** B
- **Tags:** CONTENT, REFACTOR
- **Thread 역할:** legacy/new project source 호환 경계
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `ProjectContentFile = PortfolioProject[] | { items: PortfolioProject[] }`와 `Array.isArray` branch를 확인합니다.
- 두 branch 모두 `as unknown as` assertion을 사용하는지와 groups/metrics를 아직 소비하지 않는지 확인합니다.

확인 원칙:

- 먼저 `d717c35cf80c^`와 `d717c35cf80c`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:07-starter-catalog-migration.md:c1.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:07-starter-catalog-migration.md:c1.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:07-starter-catalog-migration.md:c1.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:07-starter-catalog-migration.md:c1.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:07-starter-catalog-migration.md:c1.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:07-starter-catalog-migration.md:c1.next --> |

#### 코드·실행 증거

<!-- learner:07-starter-catalog-migration.md:c1.evidence -->

### 2. `6caa6debdb01` — feat(content): 사이트와 프로필 starter 콘텐츠 구성

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** identity starter source
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- site title/brand/navigation/footer/pages/socialImage와 profile identity/photo/principles를 확인합니다.
- contact/experience starter additions가 같은 commit에 포함되는지 확인합니다.

확인 원칙:

- 먼저 `6caa6debdb01^`와 `6caa6debdb01`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:07-starter-catalog-migration.md:c2.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:07-starter-catalog-migration.md:c2.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:07-starter-catalog-migration.md:c2.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:07-starter-catalog-migration.md:c2.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:07-starter-catalog-migration.md:c2.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:07-starter-catalog-migration.md:c2.next --> |

#### 코드·실행 증거

<!-- learner:07-starter-catalog-migration.md:c2.evidence -->

### 3. `f8ea6376c65c` — feat(content): 링크와 기술 starter 콘텐츠 구성

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** link/technology starter graph
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `links.json`의 IDs, enabled flag, placements, href를 확인합니다.
- `skills.json`, `tech-stack.json`의 IDs와 project stack에서 사용할 vocabulary를 확인합니다.

확인 원칙:

- 먼저 `f8ea6376c65c^`와 `f8ea6376c65c`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:07-starter-catalog-migration.md:c3.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:07-starter-catalog-migration.md:c3.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:07-starter-catalog-migration.md:c3.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:07-starter-catalog-migration.md:c3.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:07-starter-catalog-migration.md:c3.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:07-starter-catalog-migration.md:c3.next --> |

#### 코드·실행 증거

<!-- learner:07-starter-catalog-migration.md:c3.evidence -->

### 4. `247ad421101a` — feat(content): 프로젝트 starter 분류와 지표 구성

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** catalog envelope와 metric starter
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `projects.json`이 배열에서 `{groups, metrics, items}` object로 바뀌는 diff를 확인합니다.
- groups/metrics가 실제 값을 갖지만 `items`가 빈 중간 상태인지 확인합니다.

확인 원칙:

- 먼저 `247ad421101a^`와 `247ad421101a`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:07-starter-catalog-migration.md:c4.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:07-starter-catalog-migration.md:c4.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:07-starter-catalog-migration.md:c4.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:07-starter-catalog-migration.md:c4.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:07-starter-catalog-migration.md:c4.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:07-starter-catalog-migration.md:c4.next --> |

#### 코드·실행 증거

<!-- learner:07-starter-catalog-migration.md:c4.evidence -->

### 5. `c58a1be43009` — feat(content): 프로젝트 starter 상세 구성

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** full starter project case
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- example project의 groupId/tags/deployment/screenshots/stack/links/highlights/problem/solution/architecture/decisions/tradeoffs/results를 확인합니다.
- 이 IDs가 앞선 groups/tech/link vocabulary와 맞물리는지 정적으로 추적합니다.

확인 원칙:

- 먼저 `c58a1be43009^`와 `c58a1be43009`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:07-starter-catalog-migration.md:c5.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:07-starter-catalog-migration.md:c5.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:07-starter-catalog-migration.md:c5.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:07-starter-catalog-migration.md:c5.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:07-starter-catalog-migration.md:c5.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:07-starter-catalog-migration.md:c5.next --> |

#### 코드·실행 증거

<!-- learner:07-starter-catalog-migration.md:c5.evidence -->

### 6. `83bd41a353ce` — feat(content): Resume와 여정 starter 콘텐츠 구성

- **Importance:** B
- **Tags:** CONTENT, RENDERER
- **Thread 역할:** chronology/résumé starter references
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `journey.json`, `journey-narrative.json`, `resume.json`의 project IDs와 narrative fields를 확인합니다.
- nullable journey item과 non-null project references를 구분합니다.

확인 원칙:

- 먼저 `83bd41a353ce^`와 `83bd41a353ce`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:07-starter-catalog-migration.md:c6.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:07-starter-catalog-migration.md:c6.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:07-starter-catalog-migration.md:c6.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:07-starter-catalog-migration.md:c6.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:07-starter-catalog-migration.md:c6.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:07-starter-catalog-migration.md:c6.next --> |

#### 코드·실행 증거

<!-- learner:07-starter-catalog-migration.md:c6.evidence -->

### 7. `7ba62b311776` — feat(content): Interview Map과 큐레이션 starter 콘텐츠 구성

- **Importance:** B
- **Tags:** CONTENT, RENDERER
- **Thread 역할:** evidence/curation starter graph
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- Interview Map tracks/items/answers와 curation categories/projectIds를 확인합니다.
- reference repo, gaps, omissions, nextReview 값을 확인합니다.

확인 원칙:

- 먼저 `7ba62b311776^`와 `7ba62b311776`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:07-starter-catalog-migration.md:c7.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:07-starter-catalog-migration.md:c7.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:07-starter-catalog-migration.md:c7.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:07-starter-catalog-migration.md:c7.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:07-starter-catalog-migration.md:c7.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:07-starter-catalog-migration.md:c7.next --> |

#### 코드·실행 증거

<!-- learner:07-starter-catalog-migration.md:c7.evidence -->

## 6. Invariant evolution ledger

| 추적할 invariant | 도입·변화 SHA | 실제 owner/evidence | 제한·후속 보호 |
| --- | --- | --- | --- |
| legacy 배열과 새 object를 migration 중 함께 읽는다. | <!-- learner:07-starter-catalog-migration.md:ledger1.sha --> | <!-- learner:07-starter-catalog-migration.md:ledger1.evidence --> | <!-- learner:07-starter-catalog-migration.md:ledger1.limitation --> |
| 새 project catalog는 groups/metrics/items를 분리한다. | <!-- learner:07-starter-catalog-migration.md:ledger2.sha --> | <!-- learner:07-starter-catalog-migration.md:ledger2.evidence --> | <!-- learner:07-starter-catalog-migration.md:ledger2.limitation --> |
| starter IDs는 여러 source가 같은 project graph를 참조한다. | <!-- learner:07-starter-catalog-migration.md:ledger3.sha --> | <!-- learner:07-starter-catalog-migration.md:ledger3.evidence --> | <!-- learner:07-starter-catalog-migration.md:ledger3.limitation --> |

## 7. Failure → Fix → Test 관계

| Failure 또는 risk | Fix/전환 SHA | 교정된 결정 | Regression·검증 관계 |
| --- | --- | --- | --- |
| source shape 전환이 기존 import를 깨뜨림 | <!-- learner:07-starter-catalog-migration.md:failure1.sha --> | <!-- learner:07-starter-catalog-migration.md:failure1.correction --> | <!-- learner:07-starter-catalog-migration.md:failure1.test --> |
| catalog envelope만 있고 item이 없음 | <!-- learner:07-starter-catalog-migration.md:failure2.sha --> | <!-- learner:07-starter-catalog-migration.md:failure2.correction --> | <!-- learner:07-starter-catalog-migration.md:failure2.test --> |
| cross-file starter references에 typo가 생길 위험 | <!-- learner:07-starter-catalog-migration.md:failure3.sha --> | <!-- learner:07-starter-catalog-migration.md:failure3.correction --> | <!-- learner:07-starter-catalog-migration.md:failure3.test --> |

## 8. Ownership·state·responsibility 변화

| 대상 | 이전 owner/state | 최종 owner/state | 근거 |
| --- | --- | --- | --- |
| project source normalization | <!-- learner:07-starter-catalog-migration.md:owner1.before --> | <!-- learner:07-starter-catalog-migration.md:owner1.after --> | <!-- learner:07-starter-catalog-migration.md:owner1.evidence --> |
| catalog grouping/metrics | <!-- learner:07-starter-catalog-migration.md:owner2.before --> | <!-- learner:07-starter-catalog-migration.md:owner2.after --> | <!-- learner:07-starter-catalog-migration.md:owner2.evidence --> |
| starter narrative graph | <!-- learner:07-starter-catalog-migration.md:owner3.before --> | <!-- learner:07-starter-catalog-migration.md:owner3.after --> | <!-- learner:07-starter-catalog-migration.md:owner3.evidence --> |
| runtime trust | <!-- learner:07-starter-catalog-migration.md:owner4.before --> | <!-- learner:07-starter-catalog-migration.md:owner4.after --> | <!-- learner:07-starter-catalog-migration.md:owner4.evidence --> |

## 9. Thread 최종 상태

<!-- learner:07-starter-catalog-migration.md:final.state -->

### 최종 설명

<!-- learner:07-starter-catalog-migration.md:final.explanation -->

## 10. 최종 실행·데이터 흐름

| 단계 | Owner/call path | 입력·출력 | Failure/non-guarantee |
| --- | --- | --- | --- |
| legacy/new project JSON을 import합니다. | <!-- learner:07-starter-catalog-migration.md:flow1.owner --> | <!-- learner:07-starter-catalog-migration.md:flow1.io --> | <!-- learner:07-starter-catalog-migration.md:flow1.failure --> |
| starter identity/link/technology vocabulary를 읽습니다. | <!-- learner:07-starter-catalog-migration.md:flow2.owner --> | <!-- learner:07-starter-catalog-migration.md:flow2.io --> | <!-- learner:07-starter-catalog-migration.md:flow2.failure --> |
| catalog group/metric/item을 구성합니다. | <!-- learner:07-starter-catalog-migration.md:flow3.owner --> | <!-- learner:07-starter-catalog-migration.md:flow3.io --> | <!-- learner:07-starter-catalog-migration.md:flow3.failure --> |
| résumé/journey/evidence/curation에서 참조합니다. | <!-- learner:07-starter-catalog-migration.md:flow4.owner --> | <!-- learner:07-starter-catalog-migration.md:flow4.io --> | <!-- learner:07-starter-catalog-migration.md:flow4.failure --> |

## 11. 학습 완료 확인

<!-- learner:07-starter-catalog-migration.md:completion.check -->
