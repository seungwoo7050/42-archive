# Thread: Runtime schema vocabulary

> Repository: `https://github.com/seungwoo7050/42-archive`  
> Branch: `web/portfolio`  
> Category: `01-application-foundation-and-content-systems`

## 0. 분류 출처와 변경 가능 범위

- Commit SHA, subject, importance, tags는 target branch의 `commit/commit-importance.md` 분류와 exact commit metadata를 사용합니다.
- 이 문서의 Thread grouping, 목표, 역할, 조사 지점은 Phase 1 category audit에서 repository evidence를 기준으로 확정했습니다.
- Phase 2에서는 이 fixed information을 바꾸지 않고 learner-facing 기록만 채웠습니다.
- 다른 branch나 final HEAD 구현을 과거 SHA 설명에 소급하지 않습니다.

## 1. Thread 목표

TypeScript assertion만 존재하던 domain source에 Zod dependency와 공용 primitive를 도입하고 site, profile, links, projects, technology, experience, journey, contact, résumé, interview map, curation의 runtime shape를 단계적으로 고정하는 과정을 복원합니다.

### 계획된 핵심 invariant

- 공백뿐인 문자열, 허용하지 않은 ID·URL·asset path는 공용 primitive에서 거부합니다.
- 알려진 domain object는 대체로 `strict()`로 예상 밖 key를 거부하되 optional field는 schema에 명시합니다.
- Schema 정의와 실제 source parsing, cross-file reference validation은 서로 다른 책임입니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 정적 TypeScript type이 runtime source 신뢰를 제공하지 못하는 이유는 무엇인가?
- `strict()`, `optional()`, `nullable()`, `min(1)`이 각 source의 허용 범위를 어떻게 바꾸는가?
- 이 Thread가 검증하는 단일 파일 shape와 후속 loader가 검증하는 참조 무결성은 어디서 갈리는가?

## 3. 완료 기준

- 각 SHA의 parent diff와 resulting tree에서 실제 file/symbol을 확인합니다.
- 이전 상태, implementation decision, owner/lifetime, absence/failure/fallback, guarantee/non-guarantee를 분리합니다.
- Fix·refactor·integration은 바로 앞의 assumption이나 duplicated responsibility와 연결합니다.
- 테스트나 command는 실제 실행 여부를 정적 검토와 명확히 구분합니다.
- Thread 종료 시 invariant evolution과 최종 flow를 코드 없이 설명합니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | 이 Thread에서의 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `a1977dc7f026` | build(content): runtime 콘텐츠 검증 의존성 추가 | B | CONTENT, VALIDATION, DEPLOY | runtime validation 도구 기반 |
| 2 | `51ceb76ad88a` | feat(content): 콘텐츠 경로와 기본 식별자 schema 추가 | B | CONTENT, VALIDATION | 공용 primitive vocabulary |
| 3 | `c2f3d376e96b` | feat(content): 사이트와 프로필 schema 추가 | B | CONTENT, VALIDATION | site/profile runtime shape |
| 4 | `857fa82a2030` | feat(content): 링크와 배포 상태 schema 추가 | B | CONTENT, VALIDATION | link/deployment/image schema |
| 5 | `f1163dc120bc` | feat(content): 프로젝트 분류와 지표 schema 추가 | B | CONTENT, VALIDATION | project group/metric vocabulary |
| 6 | `a944c73f0557` | feat(content): 프로젝트 사례 schema 추가 | A | CONTENT, VALIDATION | 완전한 project catalog schema |
| 7 | `d93ec9730edd` | feat(content): 기술과 경력 schema 추가 | B | CONTENT, VALIDATION | technology/skills/experience schemas |
| 8 | `6fc79f058744` | feat(content): 여정과 연락 schema 추가 | B | CONTENT, VALIDATION | journey/link-list/contact schemas |
| 9 | `03aacfddc364` | feat(content): Resume 콘텐츠 schema 추가 | B | CONTENT, VALIDATION, RENDERER | résumé schema |
| 10 | `80152dae761f` | feat(content): 여정 narrative schema 추가 | B | CONTENT, VALIDATION | journey narrative schema |
| 11 | `51ce1c15a0e5` | feat(content): Interview Map 콘텐츠 schema 추가 | B | CONTENT, VALIDATION, RENDERER | interview evidence schema |
| 12 | `d0a62a7da4bd` | feat(content): 큐레이션 schema와 타입 export 추가 | A | CONTENT, VALIDATION | curation schema 및 schema-derived source types |

## 5. Commit별 학습 기록

### 1. `a1977dc7f026` — build(content): runtime 콘텐츠 검증 의존성 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION, DEPLOY
- **Thread 역할:** runtime validation 도구 기반
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `package.json`과 lockfile에서 `zod`와 `tsx` 추가를 확인합니다.
- `zod`가 runtime dependency이고 `tsx`가 development command 실행 도구인지 구분합니다.

확인 원칙:

- 먼저 `a1977dc7f026^`와 `a1977dc7f026`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:05-runtime-schema-vocabulary.md:c1.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:05-runtime-schema-vocabulary.md:c1.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:05-runtime-schema-vocabulary.md:c1.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:05-runtime-schema-vocabulary.md:c1.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:05-runtime-schema-vocabulary.md:c1.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:05-runtime-schema-vocabulary.md:c1.next --> |

#### 코드·실행 증거

<!-- learner:05-runtime-schema-vocabulary.md:c1.evidence -->

### 2. `51ceb76ad88a` — feat(content): 콘텐츠 경로와 기본 식별자 schema 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION
- **Thread 역할:** 공용 primitive vocabulary
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `nonEmptyString`, `contentId`, href/asset path schema의 구현을 확인합니다.
- trim 후 `min(1)`, ID 정규식, 허용 protocol과 `/template`·`/assets` prefix 범위를 기록합니다.

확인 원칙:

- 먼저 `51ceb76ad88a^`와 `51ceb76ad88a`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:05-runtime-schema-vocabulary.md:c2.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:05-runtime-schema-vocabulary.md:c2.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:05-runtime-schema-vocabulary.md:c2.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:05-runtime-schema-vocabulary.md:c2.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:05-runtime-schema-vocabulary.md:c2.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:05-runtime-schema-vocabulary.md:c2.next --> |

#### 코드·실행 증거

<!-- learner:05-runtime-schema-vocabulary.md:c2.evidence -->

### 3. `c2f3d376e96b` — feat(content): 사이트와 프로필 schema 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION
- **Thread 역할:** site/profile runtime shape
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `siteContentSchema`, `profileContentSchema`와 하위 navigation/footer/photo/principle schema를 확인합니다.
- `siteContentSchema`의 `passthrough()`와 `pages` 하위 object의 strictness 차이를 기록합니다.

확인 원칙:

- 먼저 `c2f3d376e96b^`와 `c2f3d376e96b`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:05-runtime-schema-vocabulary.md:c3.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:05-runtime-schema-vocabulary.md:c3.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:05-runtime-schema-vocabulary.md:c3.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:05-runtime-schema-vocabulary.md:c3.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:05-runtime-schema-vocabulary.md:c3.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:05-runtime-schema-vocabulary.md:c3.next --> |

#### 코드·실행 증거

<!-- learner:05-runtime-schema-vocabulary.md:c3.evidence -->

### 4. `857fa82a2030` — feat(content): 링크와 배포 상태 schema 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION
- **Thread 역할:** link/deployment/image schema
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `contentLinkSchema`, `deploymentStatusSchema`, `projectImageSchema`를 확인합니다.
- link type, env key, external/enabled/placements optional field와 object `strict()`를 기록합니다.

확인 원칙:

- 먼저 `857fa82a2030^`와 `857fa82a2030`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:05-runtime-schema-vocabulary.md:c4.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:05-runtime-schema-vocabulary.md:c4.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:05-runtime-schema-vocabulary.md:c4.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:05-runtime-schema-vocabulary.md:c4.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:05-runtime-schema-vocabulary.md:c4.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:05-runtime-schema-vocabulary.md:c4.next --> |

#### 코드·실행 증거

<!-- learner:05-runtime-schema-vocabulary.md:c4.evidence -->

### 5. `f1163dc120bc` — feat(content): 프로젝트 분류와 지표 schema 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION
- **Thread 역할:** project group/metric vocabulary
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `projectGroupSchema`, `projectMetricFilterSchema`, `projectMetricSchema`를 확인합니다.
- non-negative order, optional project/group/tag/featured/deployment filters, aggregate enum을 기록합니다.

확인 원칙:

- 먼저 `f1163dc120bc^`와 `f1163dc120bc`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:05-runtime-schema-vocabulary.md:c5.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:05-runtime-schema-vocabulary.md:c5.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:05-runtime-schema-vocabulary.md:c5.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:05-runtime-schema-vocabulary.md:c5.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:05-runtime-schema-vocabulary.md:c5.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:05-runtime-schema-vocabulary.md:c5.next --> |

#### 코드·실행 증거

<!-- learner:05-runtime-schema-vocabulary.md:c5.evidence -->

### 6. `a944c73f0557` — feat(content): 프로젝트 사례 schema 추가

- **Importance:** A
- **Tags:** CONTENT, VALIDATION
- **Thread 역할:** 완전한 project catalog schema
- **조사 깊이:** 주요 subsystem의 결정 경로, owner, failure/non-guarantee와 integration evidence를 구체적으로 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `portfolioProjectSourceSchema`의 ID/order/group/tags/deployment/images/stack/links/narrative fields를 전부 확인합니다.
- `projectsContentSchema`의 groups/items `min(1)`, metrics 배열, root `strict()`를 확인합니다.
- nested architecture/deployment objects와 arrays가 허용하는 empty state를 구분합니다.

확인 원칙:

- 먼저 `a944c73f0557^`와 `a944c73f0557`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:05-runtime-schema-vocabulary.md:c6.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:05-runtime-schema-vocabulary.md:c6.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:05-runtime-schema-vocabulary.md:c6.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:05-runtime-schema-vocabulary.md:c6.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:05-runtime-schema-vocabulary.md:c6.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:05-runtime-schema-vocabulary.md:c6.next --> |

#### 코드·실행 증거

<!-- learner:05-runtime-schema-vocabulary.md:c6.evidence -->

### 7. `d93ec9730edd` — feat(content): 기술과 경력 schema 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION
- **Thread 역할:** technology/skills/experience schemas
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- technology item icon/color, skills group, experience item schema를 확인합니다.
- 각 record의 strictness와 array cardinality를 기록합니다.

확인 원칙:

- 먼저 `d93ec9730edd^`와 `d93ec9730edd`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:05-runtime-schema-vocabulary.md:c7.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:05-runtime-schema-vocabulary.md:c7.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:05-runtime-schema-vocabulary.md:c7.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:05-runtime-schema-vocabulary.md:c7.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:05-runtime-schema-vocabulary.md:c7.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:05-runtime-schema-vocabulary.md:c7.next --> |

#### 코드·실행 증거

<!-- learner:05-runtime-schema-vocabulary.md:c7.evidence -->

### 8. `6fc79f058744` — feat(content): 여정과 연락 schema 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION
- **Thread 역할:** journey/link-list/contact schemas
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- journey item의 nullable `projectId`, links collection, contact preferred ID 배열을 확인합니다.
- nullable과 optional을 혼동하지 않고 기록합니다.

확인 원칙:

- 먼저 `6fc79f058744^`와 `6fc79f058744`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:05-runtime-schema-vocabulary.md:c8.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:05-runtime-schema-vocabulary.md:c8.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:05-runtime-schema-vocabulary.md:c8.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:05-runtime-schema-vocabulary.md:c8.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:05-runtime-schema-vocabulary.md:c8.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:05-runtime-schema-vocabulary.md:c8.next --> |

#### 코드·실행 증거

<!-- learner:05-runtime-schema-vocabulary.md:c8.evidence -->

### 9. `03aacfddc364` — feat(content): Resume 콘텐츠 schema 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION, RENDERER
- **Thread 역할:** résumé schema
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- summary, projectIds, education/training/experience/notes, nullable `downloadUrl` schema를 확인합니다.
- asset path nullable 의미와 projectIds 배열의 허용 상태를 기록합니다.

확인 원칙:

- 먼저 `03aacfddc364^`와 `03aacfddc364`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:05-runtime-schema-vocabulary.md:c9.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:05-runtime-schema-vocabulary.md:c9.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:05-runtime-schema-vocabulary.md:c9.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:05-runtime-schema-vocabulary.md:c9.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:05-runtime-schema-vocabulary.md:c9.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:05-runtime-schema-vocabulary.md:c9.next --> |

#### 코드·실행 증거

<!-- learner:05-runtime-schema-vocabulary.md:c9.evidence -->

### 10. `80152dae761f` — feat(content): 여정 narrative schema 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION
- **Thread 역할:** journey narrative schema
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- intro, milestones, state/reason/result, anchorProjectIds, currentPosition schema를 확인합니다.
- milestone ID uniqueness와 date 의미가 아직 없는지 확인합니다.

확인 원칙:

- 먼저 `80152dae761f^`와 `80152dae761f`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:05-runtime-schema-vocabulary.md:c10.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:05-runtime-schema-vocabulary.md:c10.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:05-runtime-schema-vocabulary.md:c10.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:05-runtime-schema-vocabulary.md:c10.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:05-runtime-schema-vocabulary.md:c10.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:05-runtime-schema-vocabulary.md:c10.next --> |

#### 코드·실행 증거

<!-- learner:05-runtime-schema-vocabulary.md:c10.evidence -->

### 11. `51ce1c15a0e5` — feat(content): Interview Map 콘텐츠 schema 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION, RENDERER
- **Thread 역할:** interview evidence schema
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- reference repo, tracks/items/answers/gaps schema를 확인합니다.
- answer의 `projectId`와 depth field, track ID가 어떤 primitive를 사용하는지 기록합니다.

확인 원칙:

- 먼저 `51ce1c15a0e5^`와 `51ce1c15a0e5`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:05-runtime-schema-vocabulary.md:c11.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:05-runtime-schema-vocabulary.md:c11.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:05-runtime-schema-vocabulary.md:c11.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:05-runtime-schema-vocabulary.md:c11.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:05-runtime-schema-vocabulary.md:c11.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:05-runtime-schema-vocabulary.md:c11.next --> |

#### 코드·실행 증거

<!-- learner:05-runtime-schema-vocabulary.md:c11.evidence -->

### 12. `d0a62a7da4bd` — feat(content): 큐레이션 schema와 타입 export 추가

- **Importance:** A
- **Tags:** CONTENT, VALIDATION
- **Thread 역할:** curation schema 및 schema-derived source types
- **조사 깊이:** 주요 subsystem의 결정 경로, owner, failure/non-guarantee와 integration evidence를 구체적으로 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- curation intro/criteria/categories/omissions/nextReview schema를 확인합니다.
- `z.infer` 또는 schema output 기반으로 export되는 source types를 확인하고 수동 type 중복이 줄어드는 범위를 기록합니다.

확인 원칙:

- 먼저 `d0a62a7da4bd^`와 `d0a62a7da4bd`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:05-runtime-schema-vocabulary.md:c12.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:05-runtime-schema-vocabulary.md:c12.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:05-runtime-schema-vocabulary.md:c12.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:05-runtime-schema-vocabulary.md:c12.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:05-runtime-schema-vocabulary.md:c12.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:05-runtime-schema-vocabulary.md:c12.next --> |

#### 코드·실행 증거

<!-- learner:05-runtime-schema-vocabulary.md:c12.evidence -->

## 6. Invariant evolution ledger

| 추적할 invariant | 도입·변화 SHA | 실제 owner/evidence | 제한·후속 보호 |
| --- | --- | --- | --- |
| 공용 primitive가 공백 문자열, ID, URL/asset path 형식을 제한한다. | <!-- learner:05-runtime-schema-vocabulary.md:ledger1.sha --> | <!-- learner:05-runtime-schema-vocabulary.md:ledger1.evidence --> | <!-- learner:05-runtime-schema-vocabulary.md:ledger1.limitation --> |
| domain object는 알려진 shape와 optional/nullability를 schema로 표현한다. | <!-- learner:05-runtime-schema-vocabulary.md:ledger2.sha --> | <!-- learner:05-runtime-schema-vocabulary.md:ledger2.evidence --> | <!-- learner:05-runtime-schema-vocabulary.md:ledger2.limitation --> |
| project catalog는 groups/items 최소 한 개와 strict project shape를 요구한다. | <!-- learner:05-runtime-schema-vocabulary.md:ledger3.sha --> | <!-- learner:05-runtime-schema-vocabulary.md:ledger3.evidence --> | <!-- learner:05-runtime-schema-vocabulary.md:ledger3.limitation --> |
| source type은 schema에서 추론하기 시작한다. | <!-- learner:05-runtime-schema-vocabulary.md:ledger4.sha --> | <!-- learner:05-runtime-schema-vocabulary.md:ledger4.evidence --> | <!-- learner:05-runtime-schema-vocabulary.md:ledger4.limitation --> |

## 7. Failure → Fix → Test 관계

| Failure 또는 risk | Fix/전환 SHA | 교정된 결정 | Regression·검증 관계 |
| --- | --- | --- | --- |
| TypeScript assertion이 malformed JSON을 통과시킴 | <!-- learner:05-runtime-schema-vocabulary.md:failure1.sha --> | <!-- learner:05-runtime-schema-vocabulary.md:failure1.correction --> | <!-- learner:05-runtime-schema-vocabulary.md:failure1.test --> |
| project record가 부분 shape로 들어올 위험 | <!-- learner:05-runtime-schema-vocabulary.md:failure2.sha --> | <!-- learner:05-runtime-schema-vocabulary.md:failure2.correction --> | <!-- learner:05-runtime-schema-vocabulary.md:failure2.test --> |
| schema와 source type이 어긋날 위험 | <!-- learner:05-runtime-schema-vocabulary.md:failure3.sha --> | <!-- learner:05-runtime-schema-vocabulary.md:failure3.correction --> | <!-- learner:05-runtime-schema-vocabulary.md:failure3.test --> |

## 8. Ownership·state·responsibility 변화

| 대상 | 이전 owner/state | 최종 owner/state | 근거 |
| --- | --- | --- | --- |
| 문자열/ID/path 규칙 | <!-- learner:05-runtime-schema-vocabulary.md:owner1.before --> | <!-- learner:05-runtime-schema-vocabulary.md:owner1.after --> | <!-- learner:05-runtime-schema-vocabulary.md:owner1.evidence --> |
| domain file shape | <!-- learner:05-runtime-schema-vocabulary.md:owner2.before --> | <!-- learner:05-runtime-schema-vocabulary.md:owner2.after --> | <!-- learner:05-runtime-schema-vocabulary.md:owner2.evidence --> |
| source type | <!-- learner:05-runtime-schema-vocabulary.md:owner3.before --> | <!-- learner:05-runtime-schema-vocabulary.md:owner3.after --> | <!-- learner:05-runtime-schema-vocabulary.md:owner3.evidence --> |
| cross-file semantics | <!-- learner:05-runtime-schema-vocabulary.md:owner4.before --> | <!-- learner:05-runtime-schema-vocabulary.md:owner4.after --> | <!-- learner:05-runtime-schema-vocabulary.md:owner4.evidence --> |

## 9. Thread 최종 상태

<!-- learner:05-runtime-schema-vocabulary.md:final.state -->

### 최종 설명

<!-- learner:05-runtime-schema-vocabulary.md:final.explanation -->

## 10. 최종 실행·데이터 흐름

| 단계 | Owner/call path | 입력·출력 | Failure/non-guarantee |
| --- | --- | --- | --- |
| 원시 JSON 값을 schema에 입력할 준비를 합니다. | <!-- learner:05-runtime-schema-vocabulary.md:flow1.owner --> | <!-- learner:05-runtime-schema-vocabulary.md:flow1.io --> | <!-- learner:05-runtime-schema-vocabulary.md:flow1.failure --> |
| 공용 primitive를 먼저 적용합니다. | <!-- learner:05-runtime-schema-vocabulary.md:flow2.owner --> | <!-- learner:05-runtime-schema-vocabulary.md:flow2.io --> | <!-- learner:05-runtime-schema-vocabulary.md:flow2.failure --> |
| nested domain object를 검사합니다. | <!-- learner:05-runtime-schema-vocabulary.md:flow3.owner --> | <!-- learner:05-runtime-schema-vocabulary.md:flow3.io --> | <!-- learner:05-runtime-schema-vocabulary.md:flow3.failure --> |
| schema-derived type을 export합니다. | <!-- learner:05-runtime-schema-vocabulary.md:flow4.owner --> | <!-- learner:05-runtime-schema-vocabulary.md:flow4.io --> | <!-- learner:05-runtime-schema-vocabulary.md:flow4.failure --> |

## 11. 학습 완료 확인

<!-- learner:05-runtime-schema-vocabulary.md:completion.check -->
