# Thread: Portfolio domain and aggregate model

> Repository: `https://github.com/seungwoo7050/42-archive`  
> Branch: `web/portfolio`  
> Category: `01-application-foundation-and-content-systems`

## 0. 분류 출처와 변경 가능 범위

- Commit SHA, subject, importance, tags는 target branch의 `commit/commit-importance.md` 분류와 exact commit metadata를 사용합니다.
- 이 문서의 Thread grouping, 목표, 역할, 조사 지점은 Phase 1 category audit에서 repository evidence를 기준으로 확정했습니다.
- Phase 2에서는 이 fixed information을 바꾸지 않고 learner-facing 기록만 채웠습니다.
- 다른 branch나 final HEAD 구현을 과거 SHA 설명에 소급하지 않습니다.

## 1. Thread 목표

분산 JSON source와 수동 TypeScript shape가 하나의 `PortfolioContent` aggregate 및 파생 map/filter 흐름으로 조립되는 초기 domain 모델을 복원합니다.

### 계획된 핵심 invariant

- 콘텐츠 source는 JSON에 있고 renderer-facing aggregate는 `src/lib/portfolio`가 구성합니다.
- 정렬·enabled filtering·environment href resolution은 호출자마다 재구현하지 않습니다.
- 이 단계의 TypeScript assertion은 runtime validation이 아니라 정적 편의에 불과합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 각 JSON source와 대응 TypeScript type은 어떤 순서로 확장되는가?
- `getPortfolioContent()`가 새 aggregate를 만들면서 공유하는 객체와 복사하는 배열은 무엇인가?
- disabled 항목과 environment override는 어디에서 제거·적용되는가?

## 3. 완료 기준

- 각 SHA의 parent diff와 resulting tree에서 실제 file/symbol을 확인합니다.
- 이전 상태, implementation decision, owner/lifetime, absence/failure/fallback, guarantee/non-guarantee를 분리합니다.
- Fix·refactor·integration은 바로 앞의 assumption이나 duplicated responsibility와 연결합니다.
- 테스트나 command는 실제 실행 여부를 정적 검토와 명확히 구분합니다.
- Thread 종료 시 invariant evolution과 최종 flow를 코드 없이 설명합니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | 이 Thread에서의 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `efb1e2e26b74` | feat(content): 사이트와 프로필 콘텐츠 기반 추가 | B | CONTENT | 기본 identity source와 type 도입 |
| 2 | `5eb01dfecabb` | feat(content): 링크와 프로젝트 도메인 정의 | B | CONTENT | project/link core vocabulary |
| 3 | `0d891d41cf4c` | feat(content): 기술과 여정 콘텐츠 모델 추가 | B | CONTENT | 경력/기술/여정 source 확장 |
| 4 | `8661cc00c45d` | feat(content): 연락과 이력 집계 모델 완성 | B | CONTENT | aggregate type 완성 |
| 5 | `a365b3d19118` | feat(content): 정적 포트폴리오 콘텐츠 로딩 | B | CONTENT | 직접 JSON import 기반 조립 |
| 6 | `0b134b1a6cf6` | feat(content): 여정 정렬과 콘텐츠 인덱스 구성 | B | CONTENT | 전체 source와 파생 index 연결 |
| 7 | `7c95a6f387b4` | feat(content): 환경 링크를 반영한 콘텐츠 집계 | B | CONTENT | 초기 aggregate policy 완성 |

## 5. Commit별 학습 기록

### 1. `efb1e2e26b74` — feat(content): 사이트와 프로필 콘텐츠 기반 추가

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** 기본 identity source와 type 도입
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `src/content/site.json`, `profile.json`의 초기 필드를 확인합니다.
- `src/lib/portfolio/types.ts`의 `SiteContent`, `ProfileContent`와 JSON 사이에 runtime parse가 없는지 확인합니다.

확인 원칙:

- 먼저 `efb1e2e26b74^`와 `efb1e2e26b74`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | site/profile 값이 route 또는 component에 하드코딩될 수 있는 상태였습니다. |
| 실제 변경 file/symbol/call path | site metadata/navigation/footer와 profile identity/summary/principles를 JSON source와 TypeScript shape로 분리합니다. |
| Data/state/resource owner와 lifetime | 편집 가능한 값은 JSON이, compile-time shape는 `types.ts`가 소유합니다. |
| Failure·absence·fallback 처리 | JSON이 type을 만족한다는 보장은 runtime에 없고, assertion을 쓰면 malformed source도 import될 수 있습니다. |
| 보장하는 것과 보장하지 않는 것 | 기본 identity vocabulary를 제공하지만 aggregate·validation은 아직 없습니다. |
| 다음 commit 또는 관련 test 연결 | `5eb01dfecabb`부터 project/link domain이 추가됩니다. |

#### 코드·실행 증거

정적 근거: `efb1e2e26b74`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 2. `5eb01dfecabb` — feat(content): 링크와 프로젝트 도메인 정의

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** project/link core vocabulary
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `src/content/projects.json`, `links.json`의 초기 빈 collection을 확인합니다.
- `ContentLink`, deployment/project model, environment key 정의를 확인합니다.

확인 원칙:

- 먼저 `5eb01dfecabb^`와 `5eb01dfecabb`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | site/profile 외에 작업 결과와 외부 행동을 표현할 domain type이 없었습니다. |
| 실제 변경 file/symbol/call path | 프로젝트 상세 필드, deployment 상태, screenshot, link type 및 environment key shape를 추가합니다. |
| Data/state/resource owner와 lifetime | project/link record의 shape는 types가 소유하지만 실제 collection은 비어 있어 consumer evidence는 없습니다. |
| Failure·absence·fallback 처리 | 빈 배열도 유효하게 보이며 ID uniqueness·link 안전성·참조 존재성은 검증하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | 향후 renderer가 사용할 기본 project/link vocabulary만 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `0d891d41cf4c`이 기술·경험·여정 domain을 추가합니다. |

#### 코드·실행 증거

정적 근거: `5eb01dfecabb`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 3. `0d891d41cf4c` — feat(content): 기술과 여정 콘텐츠 모델 추가

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** 경력/기술/여정 source 확장
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `tech-stack.json`, `skills.json`, `experience.json`, `journey.json`과 대응 type을 확인합니다.
- journey의 `projectId` nullability와 technology ID reference가 단순 문자열인지 확인합니다.

확인 원칙:

- 먼저 `0d891d41cf4c^`와 `0d891d41cf4c`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | project 외의 역량·시간 흐름을 표현할 source가 없었습니다. |
| 실제 변경 file/symbol/call path | 기술 stack, skill group, experience, journey item의 JSON과 TypeScript shape를 추가합니다. |
| Data/state/resource owner와 lifetime | 각 파일이 raw record를 소유하며 cross-file ID 관계는 문자열 약속에 머뭅니다. |
| Failure·absence·fallback 처리 | 존재하지 않는 기술/project ID도 compile-time에는 걸러지지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | aggregate에 포함될 domain 범위가 넓어지지만 참조 무결성은 보장하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | `8661cc00c45d`가 contact/resume와 전체 aggregate shape를 만듭니다. |

#### 코드·실행 증거

정적 근거: `0d891d41cf4c`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 4. `8661cc00c45d` — feat(content): 연락과 이력 집계 모델 완성

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** aggregate type 완성
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `contact.json`, `resume.json`과 `ContactContent`, `ResumeContent`를 확인합니다.
- `PortfolioContent`, `PortfolioEnv`, `RouteSearchParams`가 어떤 하위 source를 묶는지 확인합니다.

확인 원칙:

- 먼저 `8661cc00c45d^`와 `8661cc00c45d`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | 여러 source type은 존재했지만 renderer가 받을 단일 aggregate 계약이 없었습니다. |
| 실제 변경 file/symbol/call path | contact/resume source와 함께 모든 domain을 묶는 `PortfolioContent`, public env shape, route search params를 정의합니다. |
| Data/state/resource owner와 lifetime | aggregate의 정적 계약은 `types.ts`가 소유하지만 실제 construction은 아직 없습니다. |
| Failure·absence·fallback 처리 | type alias만으로 disabled filtering, ordering, env resolution 또는 runtime 검증은 발생하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | consumer가 기대할 전체 필드 집합은 정의하지만 값의 신뢰성은 보장하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | `a365b3d19118`이 JSON imports를 실제 aggregate module에 연결합니다. |

#### 코드·실행 증거

정적 근거: `8661cc00c45d`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 5. `a365b3d19118` — feat(content): 정적 포트폴리오 콘텐츠 로딩

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** 직접 JSON import 기반 조립
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `src/lib/portfolio/content.ts`의 JSON imports와 `as` assertions를 확인합니다.
- 어떤 source가 module-level singleton으로 저장되고 `getPortfolioContent()`가 무엇을 반환하는지 확인합니다.

확인 원칙:

- 먼저 `a365b3d19118^`와 `a365b3d19118`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | 정적 aggregate type은 있었지만 JSON을 한 곳에서 읽고 반환하는 구현이 없었습니다. |
| 실제 변경 file/symbol/call path | `content.ts`가 source files를 import하고 수동 assertion으로 typed module values를 만든 뒤 aggregate 반환점을 제공합니다. |
| Data/state/resource owner와 lifetime | module-level imports가 source lifetime을 소유하고 호출자는 반환 aggregate를 소비합니다. |
| Failure·absence·fallback 처리 | `as`는 검증이 아니므로 잘못된 JSON이 fail-closed 되지 않습니다. 파생 정렬/filter도 아직 분산될 여지가 있습니다. |
| 보장하는 것과 보장하지 않는 것 | JSON direct import를 한 module로 모으지만 안전한 trust boundary는 보장하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | `0b134b1a6cf6`이 나머지 source와 파생 map/sort를 연결합니다. |

#### 코드·실행 증거

정적 근거: `a365b3d19118`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 6. `0b134b1a6cf6` — feat(content): 여정 정렬과 콘텐츠 인덱스 구성

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** 전체 source와 파생 index 연결
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `content.ts`에서 skills/tech/experience/journey/links/contact/resume import를 확인합니다.
- journey의 date→title 정렬, `portfolioTechStackById` Map, `getEnabledLinks()`를 확인합니다.

확인 원칙:

- 먼저 `0b134b1a6cf6^`와 `0b134b1a6cf6`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | 초기 조립 모듈은 일부 source만 반환하고 반복 lookup·정렬 정책이 정해지지 않았습니다. |
| 실제 변경 file/symbol/call path | 나머지 source를 aggregate에 넣고 journey를 copy 후 정렬하며 technology Map과 enabled link filter를 중앙화합니다. |
| Data/state/resource owner와 lifetime | module이 파생 collection과 lookup index를 소유하고 renderer는 정렬/filter 구현을 알 필요가 없어집니다. |
| Failure·absence·fallback 처리 | Map은 unknown ID를 `undefined`로 반환할 뿐 누락을 오류로 바꾸지 않습니다. source assertion 문제도 남습니다. |
| 보장하는 것과 보장하지 않는 것 | 일관된 journey order와 enabled top-level links를 보장하지만 project enablement/env resolution은 아직 불완전합니다. |
| 다음 commit 또는 관련 test 연결 | `7c95a6f387b4`가 project/link 활성화와 env href를 완성합니다. |

#### 코드·실행 증거

정적 근거: `0b134b1a6cf6`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 7. `7c95a6f387b4` — feat(content): 환경 링크를 반영한 콘텐츠 집계

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** 초기 aggregate policy 완성
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `withEnvHref`, `getPortfolioContent`의 env default와 project/link mapping을 확인합니다.
- project `enabled !== false`, nested link `enabled !== false`, top-level `getEnabledLinks()`의 차이를 확인합니다.

확인 원칙:

- 먼저 `7c95a6f387b4^`와 `7c95a6f387b4`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | aggregate는 source를 모았지만 disabled project/link와 environment-specific href를 일관되게 해석하지 않았습니다. |
| 실제 변경 file/symbol/call path | public env 값을 trim해 non-empty일 때 href를 덮어쓰고, disabled project와 nested/top-level links를 제거합니다. |
| Data/state/resource owner와 lifetime | `getPortfolioContent()`가 활성화·href resolution policy를 소유하며 호출자는 filtered aggregate만 받습니다. |
| Failure·absence·fallback 처리 | environment 값 자체의 URL 안전성, cross-file 참조, schema validation은 보장하지 않습니다. module-level source 객체 일부는 계속 공유됩니다. |
| 보장하는 것과 보장하지 않는 것 | 초기 domain aggregate의 호출 계약을 완성하지만 후속 validated facade 이전에는 source를 신뢰합니다. |
| 다음 commit 또는 관련 test 연결 | T4가 selector policy를 확장하고 T8–T10이 runtime validation과 validated facade로 교체합니다. |

#### 코드·실행 증거

정적 근거: `7c95a6f387b4`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

## 6. Invariant evolution ledger

| 추적할 invariant | 도입·변화 SHA | 실제 owner/evidence | 제한·후속 보호 |
| --- | --- | --- | --- |
| JSON source와 renderer aggregate를 분리한다. | `efb1e2e26b74` → `a365b3d19118` | `src/content/*.json`, `src/lib/portfolio/content.ts` | 초기 연결은 assertion 기반 |
| journey order와 lookup/filter 정책은 aggregate module이 소유한다. | `0b134b1a6cf6` | date/title sort, `portfolioTechStackById`, `getEnabledLinks` | unknown references는 오류가 아님 |
| disabled project/link와 env href를 호출 전에 해석한다. | `7c95a6f387b4` | `getPortfolioContent`, `withEnvHref` | URL/schema/cross-file integrity는 후속 loader 책임 |

## 7. Failure → Fix → Test 관계

| Failure 또는 risk | Fix/전환 SHA | 교정된 결정 | Regression·검증 관계 |
| --- | --- | --- | --- |
| 각 component가 JSON을 직접 import할 위험 | `a365b3d19118` | 한 aggregate module로 import 집중 | `508e0b71024b`에서 validated source로 교체 |
| journey 순서와 tech lookup이 consumer마다 달라질 위험 | `0b134b1a6cf6` | 정렬과 Map 중앙화 | `b77b386b344e`의 view-model regression이 후속 보호 |
| disabled/env link가 그대로 노출될 위험 | `7c95a6f387b4` | explicit false filter와 non-empty env override | 후속 schema/route/link tests가 허용 범위를 검증 |

## 8. Ownership·state·responsibility 변화

| 대상 | 이전 owner/state | 최종 owner/state | 근거 |
| --- | --- | --- | --- |
| 원본 값 | component 하드코딩 가능 | `src/content/*.json` | 각 JSON file |
| aggregate shape | 분산 type | `PortfolioContent` | `types.ts` |
| 파생 정렬/index/filter | 호출자 책임 | `content.ts` | journey sort, tech Map, enabled filters |
| runtime 신뢰 | 없음 | 여전히 없음 | `as` assertion; T8 이후 loader가 인수 |

## 9. Thread 최종 상태

Thread 종료 시점에는 `getPortfolioContent()`가 모든 JSON source를 하나의 aggregate로 묶고 journey 정렬, technology lookup, enabled filtering, environment href resolution을 수행합니다. 그러나 이 aggregate는 runtime schema나 cross-file integrity 검증 없이 source를 assertion으로 신뢰합니다.

### 최종 설명

- site/profile에서 project, technology, experience, journey, contact, resume로 domain source 범위를 확장했습니다.
- 단일 `PortfolioContent`와 `content.ts`가 renderer-facing aggregate를 소유하게 했습니다.
- 정렬·lookup·enabled/env 정책을 consumer 밖으로 이동했습니다.
- 이 단계의 핵심 비보장은 `as` 기반 source 신뢰이며 T8–T10이 이를 제거합니다.

## 10. 최종 실행·데이터 흐름

| 단계 | Owner/call path | 입력·출력 | Failure/non-guarantee |
| --- | --- | --- | --- |
| JSON modules를 import합니다. | `src/lib/portfolio/content.ts` | module-level source objects | malformed JSON shape를 runtime에서 거부하지 않음 |
| 파생 collection을 준비합니다. | journey sort, tech Map, enabled links | 정렬된 배열과 lookup/filter | unknown ID는 `undefined` 또는 omission |
| 환경 링크와 project 활성화를 해석합니다. | `getPortfolioContent()` | filtered projects/links | invalid URL은 별도 검증 없음 |
| aggregate를 route에 반환합니다. | `PortfolioContent` | renderer-facing object | nested 공유/복사 경계는 후속 test에서 고정 |

## 11. 학습 완료 확인

완료했습니다. 모든 commit은 exact SHA의 parent diff/resulting tree를 기준으로 기록했고, direct execution evidence와 static inspection을 구분했습니다. `3353032ba23b`, `dc07871c4d24`, `b77b386b344e`, `527b9f872333`이 이후 public export, clone boundary, selector/view-model 결과를 테스트합니다. 이 Thread에서는 테스트 command를 실행하지 않았습니다.
