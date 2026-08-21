# Thread: Repository-wide content integrity

> Repository: `https://github.com/seungwoo7050/42-archive`  
> Branch: `web/portfolio`  
> Category: `01-application-foundation-and-content-systems`

## 0. 분류 출처와 변경 가능 범위

- Commit SHA, subject, importance, tags는 target branch의 `commit/commit-importance.md` 분류와 exact commit metadata를 사용합니다.
- 이 문서의 Thread grouping, 목표, 역할, 조사 지점은 Phase 1 category audit에서 repository evidence를 기준으로 확정했습니다.
- Phase 2에서는 이 fixed information을 바꾸지 않고 learner-facing 기록만 채웠습니다.
- 다른 branch나 final HEAD 구현을 과거 SHA 설명에 소급하지 않습니다.

## 1. Thread 목표

개별 JSON file이 schema를 통과한 뒤에도 남는 duplicate ID, unsupported/disabled internal route, design completeness, project/group/technology/link/project-reference 문제를 하나의 누적 integrity phase에서 fail-closed 하는 과정을 복원합니다.

### 계획된 핵심 invariant

- Shape parsing 뒤 cross-file issues를 별도 배열에 누적하고 가능한 한 여러 문제를 한 번에 보고합니다.
- 참조 검증은 enabled target 집합을 사용하므로 존재하지만 disabled인 project/link도 유효한 공개 참조가 아닙니다.
- 외부 URL은 internal route validator의 책임 밖이며 root-relative internal route만 route map과 page enablement에 대조합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- Schema-valid 문자열과 repository-valid reference 사이에는 어떤 차이가 있는가?
- Duplicate/reference issues는 어느 시점에 누적되고 언제 하나의 error로 던져지는가?
- Internal route와 enabled project/page policy가 어떻게 결합되는가?

## 3. 완료 기준

- 각 SHA의 parent diff와 resulting tree에서 실제 file/symbol을 확인합니다.
- 이전 상태, implementation decision, owner/lifetime, absence/failure/fallback, guarantee/non-guarantee를 분리합니다.
- Fix·refactor·integration은 바로 앞의 assumption이나 duplicated responsibility와 연결합니다.
- 테스트나 command는 실제 실행 여부를 정적 검토와 명확히 구분합니다.
- Thread 종료 시 invariant evolution과 최종 flow를 코드 없이 설명합니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | 이 Thread에서의 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `f8a4aa2109e8` | feat(content): 중복과 참조 진단 helper 추가 | B | CONTENT, VALIDATION | integrity issue primitives |
| 2 | `b380f56f5d90` | feat(content): 내부 route 참조 검증 추가 | A | ARCH, CONTENT, VALIDATION | internal route policy helper |
| 3 | `b9d74d8ccf08` | feat(content): 콘텐츠 식별자 중복 검증 추가 | A | CONTENT, VALIDATION | global identifier/order uniqueness |
| 4 | `b87da7ca505c` | feat(content): 지원 디자인 구성 검증 추가 | A | CONTENT, VALIDATION | design registry completeness |
| 5 | `6b9e10289b64` | feat(content): 사이트와 링크 route 참조 검증 추가 | A | ARCH, CONTENT, VALIDATION | navigation/top-level link route integration |
| 6 | `08b4ac81739f` | feat(content): 프로젝트 내부 참조 검증 추가 | A | CONTENT, VALIDATION | project group/stack/link integrity |
| 7 | `6514b4e0bcff` | feat(content): 지표와 Resume 참조 검증 추가 | B | CONTENT, VALIDATION, RENDERER | metric/resume project references |
| 8 | `805072d7b610` | feat(content): 여정과 Interview 참조 검증 추가 | B | CONTENT, VALIDATION, RENDERER | journey/evidence project references |
| 9 | `d5afc69ae9da` | feat(content): 큐레이션과 연락 참조 검증 추가 | B | CONTENT, VALIDATION | curation/contact reference closure |

## 5. Commit별 학습 기록

### 1. `f8a4aa2109e8` — feat(content): 중복과 참조 진단 helper 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION
- **Thread 역할:** integrity issue primitives
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `findDuplicates`, `addDuplicateIssues`, `addMissingReferenceIssue`를 확인합니다.
- Set을 이용해 duplicate value를 한 번만 issue로 추가하는지와 caller가 file/path/label을 공급하는지 확인합니다.

확인 원칙:

- 먼저 `f8a4aa2109e8^`와 `f8a4aa2109e8`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Schema는 record shape만 확인하므로 중복 ID와 존재하지 않는 reference를 표현할 공통 integrity helper가 없었습니다. |
| 실제 변경 file/symbol/call path | 중복 값을 찾는 Set 기반 helper와 duplicate/missing-reference issue accumulator를 추가합니다. |
| Data/state/resource owner와 lifetime | loader의 shared `issues` 배열이 integrity diagnostic lifetime을 소유하고 helper는 throw하지 않고 issue를 추가합니다. |
| Failure·absence·fallback 처리 | 아직 실제 source collection에 호출되지 않으며 duplicate occurrence의 각 index가 아니라 collection-level path를 기록하는 경우가 있습니다. |
| 보장하는 것과 보장하지 않는 것 | 후속 integrity rules가 같은 source-aware issue 형식을 재사용할 수 있게 합니다. |
| 다음 commit 또는 관련 test 연결 | `b380f56f5d90`이 internal route 판단 helper를 추가합니다. |

#### 코드·실행 증거

정적 근거: `f8a4aa2109e8`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 2. `b380f56f5d90` — feat(content): 내부 route 참조 검증 추가

- **Importance:** A
- **Tags:** ARCH, CONTENT, VALIDATION
- **Thread 역할:** internal route policy helper
- **조사 깊이:** 주요 subsystem의 결정 경로, owner, failure/non-guarantee와 integration evidence를 구체적으로 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `addInternalRouteIssue`의 root-relative/`//` early return, `new URL` pathname extraction, `/` special case를 확인합니다.
- `/projects/:id` match, internal page map, disabled page, unknown/disabled project issue branches를 추적합니다.
- query/hash가 pathname 검사에서 어떻게 처리되는지 확인합니다.

확인 원칙:

- 먼저 `b380f56f5d90^`와 `b380f56f5d90`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Link schema가 href 문자열 형식은 확인해도 portfolio 내부 route가 실제 지원·활성 page/project를 가리키는지는 알 수 없었습니다. |
| 실제 변경 file/symbol/call path | root-relative internal href만 route policy 대상으로 삼고 pathname을 canonicalize한 뒤 home, known pages, project detail route를 site config와 enabled project ID set에 대조하는 helper를 추가합니다. |
| Data/state/resource owner와 lifetime | loader가 internal routing integrity를 소유하고 caller는 source file/path 및 route kind를 전달합니다. |
| Failure·absence·fallback 처리 | 외부 URL과 protocol-relative URL은 이 helper가 검사하지 않습니다. 동적 route는 `/projects/<single-segment>`만 지원하며 route handler 실제 존재를 filesystem에서 탐색하지 않고 고정 map에 의존합니다. |
| 보장하는 것과 보장하지 않는 것 | 지원하지 않는 내부 route, disabled page, unknown/disabled project detail link를 일관된 issue로 만들 수 있습니다. |
| 다음 commit 또는 관련 test 연결 | `6b9e10289b64`와 `08b4ac81739f`가 site/link/project consumers에 helper를 적용합니다. |

#### 코드·실행 증거

정적 근거: `b380f56f5d90`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다. 중요도 A 근거: content authoring과 routing/page enablement를 연결하는 architecture-level policy이며 여러 source의 href가 이 한 helper를 공유합니다.

### 3. `b9d74d8ccf08` — feat(content): 콘텐츠 식별자 중복 검증 추가

- **Importance:** A
- **Tags:** CONTENT, VALIDATION
- **Thread 역할:** global identifier/order uniqueness
- **조사 깊이:** 주요 subsystem의 결정 경로, owner, failure/non-guarantee와 integration evidence를 구체적으로 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `loadPortfolioSource`의 `issues` 배열과 group/enabled project/stack/tag/enabled link ID Sets를 확인합니다.
- group ID/order, metric ID, project ID/order, technology ID, link ID, milestone ID, track ID, category ID, template ID, navigation href duplicate checks를 모두 열거합니다.
- issue가 끝에서 한 번 throw되는 위치를 확인합니다.

확인 원칙:

- 먼저 `b9d74d8ccf08^`와 `b9d74d8ccf08`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | 각 file의 ID/order가 schema 형식은 만족해도 duplicate이면 lookup Map, ordering, route/view-model 결과가 비결정적이거나 덮어써질 수 있었습니다. |
| 실제 변경 file/symbol/call path | parsed source에서 reference Sets를 만들고 repository 전반의 주요 identifiers/order/navigation href 중복을 한 `issues` 배열에 누적한 뒤 validation phase 끝에서 `PortfolioContentError`로 던집니다. |
| Data/state/resource owner와 lifetime | `loadPortfolioSource`가 repository-wide uniqueness와 enabled reference universe를 소유합니다. |
| Failure·absence·fallback 처리 | 현재 duplicate message는 동일 값당 한 issue이며 모든 array item index를 지목하지 않을 수 있습니다. Tag vocabulary 자체는 projects에서 관찰된 enabled tags 집합으로 파생됩니다. |
| 보장하는 것과 보장하지 않는 것 | 주요 lookup/order keys의 uniqueness와 여러 issue의 batch reporting을 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `b87da7ca505c`가 design registry completeness를 같은 phase에 추가합니다. |

#### 코드·실행 증거

정적 근거: `b9d74d8ccf08`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다. 중요도 A 근거: source별 shape 검증을 repository-wide namespace invariant로 확장하고 모든 후속 reference checks의 기준 Sets를 만듭니다.

### 4. `b87da7ca505c` — feat(content): 지원 디자인 구성 검증 추가

- **Importance:** A
- **Tags:** CONTENT, VALIDATION
- **Thread 역할:** design registry completeness
- **조사 깊이:** 주요 subsystem의 결정 경로, owner, failure/non-guarantee와 integration evidence를 구체적으로 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- defaultHomeTemplate가 templates에 있는지, 모든 configured ID가 supported인지, supported five IDs가 모두 configured인지 세 방향 검사를 확인합니다.
- issue file/path가 `presentation.json`의 default/templates 위치를 가리키는지 확인합니다.

확인 원칙:

- 먼저 `b87da7ca505c^`와 `b87da7ca505c`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Presentation schema는 design ID enum을 제한하지만 default가 templates에 포함되는지, 지원하는 다섯 design이 빠짐없이 등록됐는지 전체 문서 관계를 보장하지 못했습니다. |
| 실제 변경 file/symbol/call path | default membership, configured⊆supported, supported⊆configured를 각각 issue로 검사합니다. |
| Data/state/resource owner와 lifetime | loader가 renderer-supported design registry와 content configuration의 완전성을 소유합니다. |
| Failure·absence·fallback 처리 | Template ID uniqueness는 앞 commit이, 실제 renderer module 존재·lazy import 성공은 다른 architecture/tests가 책임집니다. |
| 보장하는 것과 보장하지 않는 것 | default design과 templates registry가 지원 design 집합과 정확히 대응하도록 fail-closed 합니다. |
| 다음 commit 또는 관련 test 연결 | `6b9e10289b64`가 실제 href collections를 route policy에 연결합니다. |

#### 코드·실행 증거

정적 근거: `b87da7ca505c`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다. 중요도 A 근거: 다섯 renderer의 content registry가 부분 구성이나 unsupported entry로 배포되는 것을 source boundary에서 차단합니다.

### 5. `6b9e10289b64` — feat(content): 사이트와 링크 route 참조 검증 추가

- **Importance:** A
- **Tags:** ARCH, CONTENT, VALIDATION
- **Thread 역할:** navigation/top-level link route integration
- **조사 깊이:** 주요 subsystem의 결정 경로, owner, failure/non-guarantee와 integration evidence를 구체적으로 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `site.navigation.forEach`와 `links.forEach`가 `addInternalRouteIssue`에 전달하는 file/path/routeKind/site/enabledProjectIds를 확인합니다.
- external href가 helper early return으로 통과하는지 확인합니다.

확인 원칙:

- 먼저 `6b9e10289b64^`와 `6b9e10289b64`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Internal route helper는 존재했지만 실제 navigation과 top-level links에 적용되지 않아 dangling route가 loader를 통과했습니다. |
| 실제 변경 file/symbol/call path | site navigation과 top-level link href를 source index별 path로 route validator에 연결합니다. |
| Data/state/resource owner와 lifetime | loader가 두 public navigation source의 internal route consistency를 소유합니다. |
| Failure·absence·fallback 처리 | 외부 destination의 접근 가능성·보안 헤더는 검사하지 않고, page route map은 코드 상수에 의존합니다. |
| 보장하는 것과 보장하지 않는 것 | navigation/link가 unsupported route, disabled page, unknown/disabled project를 가리키면 source load가 실패합니다. |
| 다음 commit 또는 관련 test 연결 | `08b4ac81739f`가 project record 내부 links와 group/stack refs를 추가합니다. |

#### 코드·실행 증거

정적 근거: `6b9e10289b64`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다. 중요도 A 근거: site shell과 global links의 공개 routing surface를 content integrity boundary에 연결합니다.

### 6. `08b4ac81739f` — feat(content): 프로젝트 내부 참조 검증 추가

- **Importance:** A
- **Tags:** CONTENT, VALIDATION
- **Thread 역할:** project group/stack/link integrity
- **조사 깊이:** 주요 subsystem의 결정 경로, owner, failure/non-guarantee와 integration evidence를 구체적으로 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- 각 project의 groupId missing reference, duplicate tags/stack refs, stack ID existence, project internal links route validation을 확인합니다.
- enabled 여부와 무관하게 items 전체를 검사하는지, target project set은 enabled만인지 구분합니다.

확인 원칙:

- 먼저 `08b4ac81739f^`와 `08b4ac81739f`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | 완전한 project schema가 있어도 존재하지 않는 group/technology를 참조하거나 같은 tag/stack을 중복하고 dangling internal link를 가질 수 있었습니다. |
| 실제 변경 file/symbol/call path | 각 project item을 순회해 group/stack references와 per-project duplicates를 검사하고 nested links를 route validator에 연결합니다. |
| Data/state/resource owner와 lifetime | project catalog 내부 관계는 loader integrity phase가 소유합니다. |
| Failure·absence·fallback 처리 | Project 자체가 disabled이어도 source record의 refs를 검사하는 반면 다른 source가 참조할 수 있는 target set은 enabled projects만입니다. External project links의 원격 상태는 검사하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | project group/technology/internal-route graph의 기본 integrity를 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `6514b4e0bcff` 이후 project IDs를 사용하는 다른 documents를 검증합니다. |

#### 코드·실행 증거

정적 근거: `08b4ac81739f`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다. 중요도 A 근거: 가장 큰 domain record의 internal graph와 public links를 한 번에 fail-closed 합니다.

### 7. `6514b4e0bcff` — feat(content): 지표와 Resume 참조 검증 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION, RENDERER
- **Thread 역할:** metric/resume project references
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- metrics의 projectIds/groupIds/tags filter refs와 résumé projectIds 검사를 확인합니다.
- project/tag target이 enabled project universe에서 파생되는지 기록합니다.

확인 원칙:

- 먼저 `6514b4e0bcff^`와 `6514b4e0bcff`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Metric filter나 résumé가 schema-valid하지만 존재하지 않거나 disabled인 project/group/tag를 가리키면 selector가 0/omission으로 조용히 실패할 수 있었습니다. |
| 실제 변경 file/symbol/call path | Metric filter references와 résumé project list를 known enabled project/group/tag Sets에 대조합니다. |
| Data/state/resource owner와 lifetime | loader가 declarative metric 및 résumé evidence references의 validity를 소유합니다. |
| Failure·absence·fallback 처리 | Metric 계산의 논리/숫자 타당성과 résumé의 원하는 순서/중복은 별도 규칙이 없는 범위에서 보장하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | 이 source들이 selector fallback에 의존하기 전에 dangling refs를 fail-closed 합니다. |
| 다음 commit 또는 관련 test 연결 | `805072d7b610`이 journey/interview references를 추가합니다. |

#### 코드·실행 증거

정적 근거: `6514b4e0bcff`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 8. `805072d7b610` — feat(content): 여정과 Interview 참조 검증 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION, RENDERER
- **Thread 역할:** journey/evidence project references
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- journey nullable projectId, narrative milestone anchorProjectIds, interview answers projectId loops와 exact JSON paths를 확인합니다.

확인 원칙:

- 먼저 `805072d7b610^`와 `805072d7b610`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Journey와 Interview Map에서 잘못된 project reference가 route view model에서 omission/undefined로 나타날 수 있었습니다. |
| 실제 변경 file/symbol/call path | non-null journey project, milestone anchors, nested interview answers를 enabled project set에 대조합니다. |
| Data/state/resource owner와 lifetime | loader가 chronology/evidence documents의 project references를 소유합니다. |
| Failure·absence·fallback 처리 | Chronology date ordering, duplicate anchors/answers, evidence depth의 의미는 검사하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | Journey와 Interview Map이 공개 가능한 enabled project만 참조하도록 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `d5afc69ae9da`가 curation/contact references로 integrity 범위를 닫습니다. |

#### 코드·실행 증거

정적 근거: `805072d7b610`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 9. `d5afc69ae9da` — feat(content): 큐레이션과 연락 참조 검증 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION
- **Thread 역할:** curation/contact reference closure
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- curation categories projectIds와 contact preferred linkIds 검사를 확인합니다.
- contact target set이 ID가 있고 `enabled !== false`인 links만 포함하는지 확인합니다.

확인 원칙:

- 먼저 `d5afc69ae9da^`와 `d5afc69ae9da`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Curation과 contact preferred 목록이 dangling/disabled project·link를 가리켜 selector가 조용히 생략할 수 있었습니다. |
| 실제 변경 file/symbol/call path | Curation project references를 enabled project set에, preferred contact IDs를 enabled link ID set에 대조합니다. |
| Data/state/resource owner와 lifetime | loader가 마지막 cross-file public references의 validity를 소유합니다. |
| Failure·absence·fallback 처리 | Category/project ID 중복은 앞 단계가 다루지만 per-category projectIds 중복이나 contact order의 업무 의미는 별도 검사가 없습니다. |
| 보장하는 것과 보장하지 않는 것 | 주요 content documents의 cross-file public reference graph가 load 전에 fail-closed 됩니다. |
| 다음 commit 또는 관련 test 연결 | T10 validated facade가 이 integrity-checked `portfolioSource`만 소비합니다. |

#### 코드·실행 증거

정적 근거: `d5afc69ae9da`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

## 6. Invariant evolution ledger

| 추적할 invariant | 도입·변화 SHA | 실제 owner/evidence | 제한·후속 보호 |
| --- | --- | --- | --- |
| Integrity issues는 shape parse 뒤 하나의 배열에 누적된다. | `b9d74d8ccf08` 이후 | `loadPortfolioSource` issues | per-file schema failure는 그 이전에 즉시 throw |
| 주요 identifiers/order/navigation href는 unique하다. | `b9d74d8ccf08` | duplicate helpers + repository collections | 모든 possible array 중복을 포괄하지는 않음 |
| Design registry는 default/list/supported 집합이 일치한다. | `b87da7ca505c` | presentation integrity rules | renderer module 존재는 별도 |
| Internal route는 enabled page/project만 가리킨다. | `b380f56f5d90` → `6b9e10289b64`/`08b4ac81739f` | route helper and consumers | 외부 URL reachability 미검사 |
| Cross-file public references는 enabled target universe에 존재한다. | `08b4ac81739f` → `d5afc69ae9da` | Sets + missing-reference issues | 일부 per-array duplicates/semantic order 미검사 |

## 7. Failure → Fix → Test 관계

| Failure 또는 risk | Fix/전환 SHA | 교정된 결정 | Regression·검증 관계 |
| --- | --- | --- | --- |
| schema-valid ID가 duplicate/dangling일 수 있음 | `b9d74d8ccf08`과 reference sequence | repository-wide Sets와 batch issues | `3353032ba23b` duplicate/missing-reference tests |
| internal href가 unsupported/disabled target을 가리킴 | `b380f56f5d90`, `6b9e10289b64`, `08b4ac81739f` | route policy + source loops | 후속 unsupported/disabled route tests |
| presentation registry가 partial/unsupported일 수 있음 | `b87da7ca505c` | bidirectional supported design completeness | 후속 missing/unsupported design tests |
| selector omission/0이 authoring error를 숨김 | reference checks before facade | dangling refs를 load error로 승격 | selector fallback은 runtime query semantics로만 남음 |

## 8. Ownership·state·responsibility 변화

| 대상 | 이전 owner/state | 최종 owner/state | 근거 |
| --- | --- | --- | --- |
| per-file shape | schema/parser | T8 parser | 즉시 failure |
| repository namespaces | 없음 | T9 loader issues/Sets | duplicate IDs/order/hrefs |
| routing integrity | renderer/route fallback | `addInternalRouteIssue` | enabled page/project policy |
| cross-file references | selector omission/undefined | loader missing-reference rules | enabled target sets |
| batch failure | 첫 consumer failure | `PortfolioContentError(issues)` | 가능한 integrity issues를 함께 보고 |

## 9. Thread 최종 상태

Thread 종료 시점에는 schema-parsed source가 duplicate identifiers/order, supported design registry, internal routes, project group/stack/link, metric/résumé/journey/interview/curation/contact references를 통과해야만 반환됩니다. 가능한 integrity 문제는 한 배열에 누적되지만 per-file schema parse failure는 앞 단계에서 즉시 중단됩니다. 외부 URL, asset 존재, 모든 semantic ordering/duplicate case는 범위 밖입니다.

### 최종 설명

- Shape-valid와 repository-valid를 분리하고 두 번째 integrity phase를 추가했습니다.
- 중복/참조 helper를 공유해 source file과 JSON path를 보존한 batch diagnostic을 만들었습니다.
- Internal route를 page enablement와 enabled project universe에 연결했습니다.
- Selector의 의도된 fallback/omission이 authoring error를 숨기지 않도록 주요 cross-file references를 loader에서 차단했습니다.

## 10. 최종 실행·데이터 흐름

| 단계 | Owner/call path | 입력·출력 | Failure/non-guarantee |
| --- | --- | --- | --- |
| Parsed source에서 namespace Sets를 구성합니다. | `loadPortfolioSource` | group/project/stack/tag/link ID sets | enabled target과 all records를 구분 |
| Duplicate/design registry를 검사합니다. | duplicate helpers + supported design sets | issues 배열 | 한 값당 collection-level issue 가능 |
| Internal routes를 검사합니다. | `addInternalRouteIssue` | navigation/link route issues | 외부 URL은 건너뜀 |
| Cross-file references를 검사합니다. | missing-reference helper loops | project/group/stack/link issues | enabled target만 유효 |
| Issues가 있으면 한 번에 실패합니다. | `PortfolioContentError(issues)` | structured batch error | 없으면 parsed source 반환 |

## 11. 학습 완료 확인

완료했습니다. 모든 commit은 exact SHA의 parent diff/resulting tree를 기준으로 기록했고, direct execution evidence와 static inspection을 구분했습니다. `3353032ba23b`은 duplicate, missing design, unsupported/disabled route, disabled reference 등의 deterministic override cases를 후속 테스트합니다. 이 작업에서는 해당 tests를 실행하지 않았습니다.
