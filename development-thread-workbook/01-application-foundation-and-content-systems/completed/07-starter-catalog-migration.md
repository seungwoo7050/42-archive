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
| 직전 상태와 부족함 | project source는 legacy 배열이었고 새 catalog object로 바꾸면 `content.ts` import가 즉시 깨질 수 있었습니다. |
| 실제 변경 file/symbol/call path | 배열이면 그대로, object면 `.items`를 사용하도록 임시 compatibility branch를 추가합니다. |
| Data/state/resource owner와 lifetime | `content.ts`가 migration 기간의 shape normalization을 소유합니다. |
| Failure·absence·fallback 처리 | 이 코드는 parse가 아니라 assertion이므로 `{}` 같은 malformed object에서 `.items`가 `undefined`가 될 수 있고 groups/metrics를 보존하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | 배열→object 전환 중 기존 project consumers의 최소 호환만 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `247ad421101a`와 `c58a1be43009`에서 새 catalog source가 단계적으로 채워지고 `508e0b71024b`에서 이 임시 branch가 제거됩니다. |

#### 코드·실행 증거

정적 근거: `d717c35cf80c`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

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
| 직전 상태와 부족함 | site/profile/contact/experience source가 빈 값 또는 generic placeholder여서 실제 route와 schema field를 충분히 행사하지 못했습니다. |
| 실제 변경 file/symbol/call path | portfolio template에 맞는 identity, navigation, page toggles, profile principles, contact availability, example experience를 채웁니다. |
| Data/state/resource owner와 lifetime | starter defaults는 각 JSON file이 소유합니다. |
| Failure·absence·fallback 처리 | 실제 사용자 정보가 아니며 navigation target/asset 존재는 아직 검증하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | site/profile 기반 route가 사용할 coherent starter vocabulary를 제공합니다. |
| 다음 commit 또는 관련 test 연결 | `f8ea6376c65c`가 link/technology ID 집합을 구성합니다. |

#### 코드·실행 증거

정적 근거: `6caa6debdb01`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

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
| 직전 상태와 부족함 | link/skills/technology collection이 비어 있어 selector·schema·renderer가 실제 ID/placement를 행사하지 못했습니다. |
| 실제 변경 file/symbol/call path | source/repository/contact link와 technology/skill examples를 추가하고 email link는 disabled 상태로 남깁니다. |
| Data/state/resource owner와 lifetime | content author가 link placement와 technology ID vocabulary를 소유합니다. |
| Failure·absence·fallback 처리 | ID uniqueness, enabled preferred link, 실제 URL 응답은 아직 보장하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | 후속 project/contact source가 참조할 starter IDs를 제공합니다. |
| 다음 commit 또는 관련 test 연결 | `247ad421101a`가 project groups/metrics를 먼저 추가합니다. |

#### 코드·실행 증거

정적 근거: `f8ea6376c65c`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

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
| 직전 상태와 부족함 | project source는 분류/metric vocabulary 없이 legacy item 배열만 표현했습니다. |
| 실제 변경 file/symbol/call path | starter group descriptions와 declarative metrics를 추가하고 새 catalog envelope를 도입합니다. |
| Data/state/resource owner와 lifetime | project catalog document가 grouping/metric definitions를 소유합니다. |
| Failure·absence·fallback 처리 | 이 exact SHA에서는 `items`가 비어 있어 훗날의 `projectsContentSchema.min(1)`을 만족하지 않는 중간 상태입니다. 당시 compatibility loader는 `.items`만 읽습니다. |
| 보장하는 것과 보장하지 않는 것 | 새 document shape와 분류/metric vocabulary를 도입하지만 usable starter catalog 완성은 보장하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | `c58a1be43009`가 실제 project item을 추가해 중간 공백을 닫습니다. |

#### 코드·실행 증거

정적 근거: `247ad421101a`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

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
| 직전 상태와 부족함 | 새 catalog envelope에는 project item이 없어 route와 selector가 실제 상세 사례를 렌더링할 수 없었습니다. |
| 실제 변경 file/symbol/call path | schema 전체를 행사하는 example project item을 추가합니다. |
| Data/state/resource owner와 lifetime | project source가 starter case study의 완전한 narrative와 references를 소유합니다. |
| Failure·absence·fallback 처리 | 참조가 코드상 맞아 보여도 loader integrity가 아직 실행되지 않아 typo를 fail-closed 하지 않습니다. asset 파일 존재도 별도입니다. |
| 보장하는 것과 보장하지 않는 것 | starter catalog가 최소 한 개의 완전한 project를 갖습니다. |
| 다음 commit 또는 관련 test 연결 | `83bd41a353ce`가 résumé/journey에서 이 project를 참조합니다. |

#### 코드·실행 증거

정적 근거: `c58a1be43009`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

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
| 직전 상태와 부족함 | starter project가 résumé와 chronology에 연결되지 않아 cross-route narrative가 비어 있었습니다. |
| 실제 변경 file/symbol/call path | journey items, narrative milestones/current position, résumé summary/training/education/notes/projectIds를 채웁니다. |
| Data/state/resource owner와 lifetime | 각 document가 자신의 narrative와 project references를 소유합니다. |
| Failure·absence·fallback 처리 | project ID 존재, chronology order, resume asset 존재는 아직 runtime에서 검사하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | starter project가 résumé와 journey route에서 재사용될 source graph를 제공합니다. |
| 다음 commit 또는 관련 test 연결 | `7ba62b311776`가 interview evidence와 curation references를 완성합니다. |

#### 코드·실행 증거

정적 근거: `83bd41a353ce`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

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
| 직전 상태와 부족함 | Interview Map과 curation source가 비어 있어 project evidence의 선택 이유와 부족한 영역을 표현하지 못했습니다. |
| 실제 변경 file/symbol/call path | starter project를 evidence answer와 curation category에 연결하고 gaps/criteria/omissions를 채웁니다. |
| Data/state/resource owner와 lifetime | evidence/curation documents가 project selection narrative를 소유합니다. |
| Failure·absence·fallback 처리 | answer/category project ID가 enabled project인지와 track/category ID uniqueness는 아직 loader가 검사하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | 주요 domain source가 하나의 coherent starter project graph를 공유합니다. |
| 다음 commit 또는 관련 test 연결 | T8/T9가 이 starter graph를 실제 parse하고 reference integrity로 검증합니다. |

#### 코드·실행 증거

정적 근거: `7ba62b311776`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

## 6. Invariant evolution ledger

| 추적할 invariant | 도입·변화 SHA | 실제 owner/evidence | 제한·후속 보호 |
| --- | --- | --- | --- |
| legacy 배열과 새 object를 migration 중 함께 읽는다. | `d717c35cf80c` | `content.ts` compatibility branch | assertion 기반이고 groups/metrics 손실 |
| 새 project catalog는 groups/metrics/items를 분리한다. | `247ad421101a` → `c58a1be43009` | `projects.json` | 첫 commit은 items가 빈 중간 상태 |
| starter IDs는 여러 source가 같은 project graph를 참조한다. | `f8ea6376c65c` → `7ba62b311776` | content JSON files | runtime integrity는 T9 |

## 7. Failure → Fix → Test 관계

| Failure 또는 risk | Fix/전환 SHA | 교정된 결정 | Regression·검증 관계 |
| --- | --- | --- | --- |
| source shape 전환이 기존 import를 깨뜨림 | `d717c35cf80c` | dual-shape compatibility branch | `508e0b71024b` validated facade에서 제거 |
| catalog envelope만 있고 item이 없음 | `c58a1be43009` | full starter project 추가 | 후속 schema parse가 min(1) 보호 |
| cross-file starter references에 typo가 생길 위험 | T9 loader sequence | enabled ID sets와 missing-reference issues | `3353032ba23b` invalid source tests |

## 8. Ownership·state·responsibility 변화

| 대상 | 이전 owner/state | 최종 owner/state | 근거 |
| --- | --- | --- | --- |
| project source normalization | legacy array assumption | `content.ts` dual branch | 임시 migration owner |
| catalog grouping/metrics | 없음 | `projects.json` root | content author |
| starter narrative graph | 분산 placeholder | 각 content JSON | shared IDs로 연결 |
| runtime trust | 없음 | 여전히 없음 | T8/T9가 인수 |

## 9. Thread 최종 상태

Thread 종료 시점에는 project source가 `{groups, metrics, items}` document로 전환되고 하나의 full starter case가 technology, résumé, journey, interview map, curation, contact/link source와 coherent ID graph를 이룹니다. 그러나 migration branch는 assertion 기반이고 runtime parse/reference/asset validation은 아직 없습니다.

### 최종 설명

- 배열→catalog object 전환을 임시 dual-shape reader로 분리했습니다.
- groups/metrics를 먼저 추가한 불완전 중간 SHA와 item을 추가한 완료 SHA를 구분했습니다.
- starter source가 대부분의 domain schema field와 cross-route reference를 실제 값으로 행사하도록 확장했습니다.
- coherent-looking fixture와 fail-closed validation을 동일시하지 않았습니다.

## 10. 최종 실행·데이터 흐름

| 단계 | Owner/call path | 입력·출력 | Failure/non-guarantee |
| --- | --- | --- | --- |
| legacy/new project JSON을 import합니다. | `content.ts` compatibility branch | items array | malformed object는 assertion으로 통과 가능 |
| starter identity/link/technology vocabulary를 읽습니다. | content JSON files | shared IDs/values | uniqueness 미검사 |
| catalog group/metric/item을 구성합니다. | `projects.json` | starter project document | 중간 SHA에는 items가 비어 있음 |
| résumé/journey/evidence/curation에서 참조합니다. | 각 source projectIds | cross-route narrative graph | T9 이전에는 dangling ref 미거부 |

## 11. 학습 완료 확인

완료했습니다. 모든 commit은 exact SHA의 parent diff/resulting tree를 기준으로 기록했고, direct execution evidence와 static inspection을 구분했습니다. 후속 `03d2c9be0a43`와 T9 integrity commits가 이 starter source를 fail-closed boundary에 연결합니다. 이 작업에서는 source 실행 검증을 수행하지 않았습니다.
