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
| 직전 상태와 부족함 | 콘텐츠 type은 TypeScript에만 있었고 JSON import 결과를 runtime에서 검사할 library나 TypeScript script runner가 없었습니다. |
| 실제 변경 file/symbol/call path | `zod` 4.x와 `tsx`를 dependency graph에 넣어 schema 및 후속 validation command를 구현할 기반을 만듭니다. |
| Data/state/resource owner와 lifetime | package manifest가 validation toolchain의 version range를 소유합니다. |
| Failure·absence·fallback 처리 | Dependency만 추가되었으므로 source가 자동으로 parse되거나 build가 fail-closed 되지는 않습니다. |
| 보장하는 것과 보장하지 않는 것 | 후속 schema/command를 구현할 수 있는 도구 기반만 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `51ceb76ad88a`가 첫 공용 primitive를 추가합니다. |

#### 코드·실행 증거

정적 근거: `a1977dc7f026`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

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
| 직전 상태와 부족함 | 각 source가 임의 문자열을 받아 공백 값, 불안정한 ID, 위험하거나 지원하지 않는 경로를 구분하지 못했습니다. |
| 실제 변경 file/symbol/call path | trimmed non-empty string, 제한된 content ID, 외부 URL·mailto·tel·root asset path의 공용 schema를 정의합니다. |
| Data/state/resource owner와 lifetime | `content-schema.ts`의 primitive가 후속 모든 object schema의 입력 경계를 소유합니다. |
| Failure·absence·fallback 처리 | 문자열 형식만 확인하며 실제 URL endpoint나 asset 파일 존재성은 확인하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | 공통 문자열·식별자·경로 형식을 일관되게 거부/수용합니다. |
| 다음 commit 또는 관련 test 연결 | `c2f3d376e96b`부터 domain object가 이 primitive를 조합합니다. |

#### 코드·실행 증거

정적 근거: `51ceb76ad88a`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

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
| 직전 상태와 부족함 | site/profile JSON은 수동 type assertion만 통과해 공백 title이나 잘못된 nested shape를 runtime에서 거부하지 못했습니다. |
| 실제 변경 file/symbol/call path | site metadata/navigation/footer와 profile identity/photo/principles를 Zod object로 정의합니다. |
| Data/state/resource owner와 lifetime | schema가 known field의 shape를 소유하며 site 최상위는 확장 key를 허용합니다. |
| Failure·absence·fallback 처리 | 최상위 `passthrough()` 때문에 알려지지 않은 site key를 모두 거부하지 않으며 navigation route 존재성도 검사하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | known site/profile field의 runtime 형식은 고정하지만 파일 간 의미 관계는 보장하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | `857fa82a2030`이 link/deployment vocabulary를 추가합니다. |

#### 코드·실행 증거

정적 근거: `c2f3d376e96b`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

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
| 직전 상태와 부족함 | link와 deployment record는 임의 string union 및 assertion에만 의존했습니다. |
| 실제 변경 file/symbol/call path | 허용 link type, deployment status, project image, optional environment/placement metadata를 strict object로 정의합니다. |
| Data/state/resource owner와 lifetime | schema가 link record의 vocabulary와 nested object shape를 소유합니다. |
| Failure·absence·fallback 처리 | href가 실제 route나 enabled target을 가리키는지는 확인하지 않고, placement 누락도 허용합니다. |
| 보장하는 것과 보장하지 않는 것 | 개별 link/deployment/image record의 runtime shape를 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `f1163dc120bc`이 project grouping과 metric schema를 추가합니다. |

#### 코드·실행 증거

정적 근거: `857fa82a2030`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

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
| 직전 상태와 부족함 | group과 metric definition이 JSON convention에만 의존해 잘못된 aggregate나 음수 order를 허용할 수 있었습니다. |
| 실제 변경 file/symbol/call path | project group과 metric filter/aggregate를 strict schema로 정의합니다. |
| Data/state/resource owner와 lifetime | metric source가 선언을 소유하고 schema는 허용된 filter key와 aggregate를 제한합니다. |
| Failure·absence·fallback 처리 | 참조하는 group/project/tag가 실제 존재하는지와 여러 filter의 계산 의미는 검사하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | metric 정의의 단일 파일 shape를 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `a944c73f0557`이 전체 project catalog schema를 닫습니다. |

#### 코드·실행 증거

정적 근거: `f1163dc120bc`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

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
| 직전 상태와 부족함 | group/metric schema는 있었지만 실제 project item과 `{groups, metrics, items}` catalog 전체를 runtime에서 검증할 계약이 없었습니다. |
| 실제 변경 file/symbol/call path | 한 project의 identity, classification, deployment, media, stack, links, problem/solution/architecture/decisions/tradeoffs/results를 strict schema로 정의하고 groups/items가 최소 한 개 있는 catalog를 만듭니다. |
| Data/state/resource owner와 lifetime | `projectsContentSchema`가 project source document의 구조를 소유하며 item 내부 예상 밖 key를 거부합니다. |
| Failure·absence·fallback 처리 | arrays 중 tags/stack/screenshots/highlights 등은 빈 배열이 허용될 수 있고, ID uniqueness·group/stack/link 참조·asset 존재는 아직 검사하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | project catalog가 비어 있지 않고 각 item이 완전한 known shape를 갖는다는 runtime 계약을 제공합니다. |
| 다음 commit 또는 관련 test 연결 | `d93ec9730edd` 이후 나머지 domain file schema가 확장되고 T9가 참조 무결성을 추가합니다. |

#### 코드·실행 증거

정적 근거: `a944c73f0557`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다. 중요도 A 근거: 단일 project record가 아닌 catalog 전체의 필수 필드와 최소 cardinality를 고정해 이후 loader/facade의 핵심 입력 계약이 됩니다.

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
| 직전 상태와 부족함 | 기술·skills·experience source가 assertion만 사용했습니다. |
| 실제 변경 file/symbol/call path | technology metadata, grouped skills, experience timeline을 공용 primitive 기반 schema로 정의합니다. |
| Data/state/resource owner와 lifetime | 각 source file의 record shape는 schema가 소유합니다. |
| Failure·absence·fallback 처리 | technology ID의 project stack 참조 여부와 날짜 의미/정렬은 검사하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | 세 domain source의 개별 구조를 runtime에서 고정합니다. |
| 다음 commit 또는 관련 test 연결 | `6fc79f058744`가 journey/links/contact를 추가합니다. |

#### 코드·실행 증거

정적 근거: `d93ec9730edd`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

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
| 직전 상태와 부족함 | 여정과 연락 source는 project/link ID를 임의 문자열로 보유하고 shape 오류를 거부하지 못했습니다. |
| 실제 변경 file/symbol/call path | journey item, top-level links collection, contact availability/notes/preferred IDs를 schema로 정의합니다. |
| Data/state/resource owner와 lifetime | schema가 null 허용과 field shape를 소유합니다. |
| Failure·absence·fallback 처리 | nullable project ID가 non-null일 때 실제 project를 가리키는지, preferred ID가 enabled link인지 확인하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | 각 파일의 runtime 형식을 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `03aacfddc364`가 résumé 구조를 추가합니다. |

#### 코드·실행 증거

정적 근거: `6fc79f058744`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

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
| 직전 상태와 부족함 | résumé source는 route가 기대하는 section shape와 download URL 경계를 runtime에서 보장하지 못했습니다. |
| 실제 변경 file/symbol/call path | résumé summary와 참조 project IDs, 여러 이력 section, nullable download asset을 schema로 정의합니다. |
| Data/state/resource owner와 lifetime | résumé document shape는 schema가 소유합니다. |
| Failure·absence·fallback 처리 | `downloadUrl`이 null이면 허용되며 non-null asset 파일 존재와 project reference는 검사하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | résumé source의 known field 형식을 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `80152dae761f`이 narrative journey schema를 추가합니다. |

#### 코드·실행 증거

정적 근거: `03aacfddc364`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

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
| 직전 상태와 부족함 | 간단한 journey list와 별도로 설명형 milestone source를 검증할 계약이 없었습니다. |
| 실제 변경 file/symbol/call path | narrative intro, milestone identity/date/state/reason/result/project anchors, current position을 schema로 정의합니다. |
| Data/state/resource owner와 lifetime | journey narrative file의 구조는 schema가 소유합니다. |
| Failure·absence·fallback 처리 | milestone ID uniqueness, chronology, anchor project 존재는 확인하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | narrative 문서의 단일 파일 shape를 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `51ce1c15a0e5`가 interview evidence schema를 추가합니다. |

#### 코드·실행 증거

정적 근거: `80152dae761f`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

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
| 직전 상태와 부족함 | Interview Map source가 nested evidence 구조를 runtime에서 검증하지 못했습니다. |
| 실제 변경 file/symbol/call path | reference, tracks, topics, project answers, gaps를 strict nested schema로 정의합니다. |
| Data/state/resource owner와 lifetime | evidence document의 구조는 schema가 소유합니다. |
| Failure·absence·fallback 처리 | answer가 enabled project를 가리키는지와 track ID uniqueness는 아직 검사하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | Interview Map 단일 파일의 known shape를 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `d0a62a7da4bd`가 curation과 schema-derived type export를 추가합니다. |

#### 코드·실행 증거

정적 근거: `51ce1c15a0e5`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

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
| 직전 상태와 부족함 | curation source의 runtime 계약이 없고 schema와 별도 수동 source type이 쉽게 어긋날 수 있었습니다. |
| 실제 변경 file/symbol/call path | curation 문서의 strict nested schema를 추가하고 주요 domain source type을 schema에서 추론해 export합니다. |
| Data/state/resource owner와 lifetime | runtime schema가 source type의 canonical owner가 되기 시작합니다. |
| Failure·absence·fallback 처리 | 모든 renderer-facing type이 즉시 schema-derived 되는 것은 아니며 category/project references와 source parsing은 여전히 후속 책임입니다. |
| 보장하는 것과 보장하지 않는 것 | curation shape와 주요 source schema/type의 동기화를 보장합니다. |
| 다음 commit 또는 관련 test 연결 | T6가 presentation schema를 별도로 확장하고 T8이 실제 JSON parsing을 연결합니다. |

#### 코드·실행 증거

정적 근거: `d0a62a7da4bd`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다. 중요도 A 근거: schema가 runtime 검증과 정적 source type을 함께 소유하는 방향으로 전환되어 후속 facade의 중복 type 제거 기반이 됩니다.

## 6. Invariant evolution ledger

| 추적할 invariant | 도입·변화 SHA | 실제 owner/evidence | 제한·후속 보호 |
| --- | --- | --- | --- |
| 공용 primitive가 공백 문자열, ID, URL/asset path 형식을 제한한다. | `51ceb76ad88a` | `src/lib/content-schema.ts` primitives | endpoint/asset 존재는 검사하지 않음 |
| domain object는 알려진 shape와 optional/nullability를 schema로 표현한다. | `c2f3d376e96b` → `51ce1c15a0e5` | 개별 source schemas | 일부 최상위 확장 지점은 passthrough |
| project catalog는 groups/items 최소 한 개와 strict project shape를 요구한다. | `a944c73f0557` | `projectsContentSchema` | ID uniqueness/reference는 T9 |
| source type은 schema에서 추론하기 시작한다. | `d0a62a7da4bd` | schema-derived exports | renderer-facing 수동 type 일부는 남음 |

## 7. Failure → Fix → Test 관계

| Failure 또는 risk | Fix/전환 SHA | 교정된 결정 | Regression·검증 관계 |
| --- | --- | --- | --- |
| TypeScript assertion이 malformed JSON을 통과시킴 | `51ceb76ad88a` 이후 schema sequence | runtime Zod vocabulary 구축 | `d50870c8b8c4`/`03d2c9be0a43`에서 실제 parse |
| project record가 부분 shape로 들어올 위험 | `a944c73f0557` | strict full project schema + catalog cardinality | 후속 invalid-source tests가 regression 보호 |
| schema와 source type이 어긋날 위험 | `d0a62a7da4bd` | schema-derived source type export | `85df59454b46`에서 facade type 연결 확대 |

## 8. Ownership·state·responsibility 변화

| 대상 | 이전 owner/state | 최종 owner/state | 근거 |
| --- | --- | --- | --- |
| 문자열/ID/path 규칙 | 각 type/consumer | schema primitives | `content-schema.ts` |
| domain file shape | 수동 TypeScript type | Zod schemas | 각 source schema |
| source type | 수동 선언 | 일부 `z.infer` export | schema가 canonical source 계약 |
| cross-file semantics | 없음 | 여전히 없음 | T9 loader integrity가 인수 |

## 9. Thread 최종 상태

Thread 종료 시점에는 모든 주요 domain JSON file의 known shape가 Zod schema로 표현되고 project catalog의 최소 cardinality까지 고정됩니다. 그러나 schema는 아직 source import에 연결되지 않았고, ID uniqueness·cross-file reference·internal route·asset 존재는 보장하지 않습니다.

### 최종 설명

- Zod/tsx 기반을 추가하고 공통 문자열·ID·경로 vocabulary를 만들었습니다.
- site/profile에서 project, résumé, journey, interview map, curation까지 domain file schema를 확장했습니다.
- 전체 project catalog의 strict shape와 최소 항목 수를 고정했습니다.
- Schema 정의와 실제 parsing/integrity 검증을 의도적으로 분리했습니다.

## 10. 최종 실행·데이터 흐름

| 단계 | Owner/call path | 입력·출력 | Failure/non-guarantee |
| --- | --- | --- | --- |
| 원시 JSON 값을 schema에 입력할 준비를 합니다. | `content-schema.ts` exports | Zod schema objects | 이 Thread에서는 아직 호출되지 않음 |
| 공용 primitive를 먼저 적용합니다. | non-empty/ID/path schema | 정규화되거나 거부되는 scalar | 실제 endpoint/asset은 미검사 |
| nested domain object를 검사합니다. | site/project/etc. schemas | known-shape output | cross-file reference는 미검사 |
| schema-derived type을 export합니다. | `z.infer` source types | 정적 source contract | 모든 facade type 대체는 후속 |

## 11. 학습 완료 확인

완료했습니다. 모든 commit은 exact SHA의 parent diff/resulting tree를 기준으로 기록했고, direct execution evidence와 static inspection을 구분했습니다. `3353032ba23b` 이후 invalid schema, duplicate/reference, asset cases가 테스트됩니다. 이 작업에서는 repository test command를 실행하지 않았습니다.
