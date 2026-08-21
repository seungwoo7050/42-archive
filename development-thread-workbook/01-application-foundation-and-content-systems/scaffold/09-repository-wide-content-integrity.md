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
| 직전 상태와 부족함 | <!-- learner:09-repository-wide-content-integrity.md:c1.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:09-repository-wide-content-integrity.md:c1.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:09-repository-wide-content-integrity.md:c1.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:09-repository-wide-content-integrity.md:c1.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:09-repository-wide-content-integrity.md:c1.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:09-repository-wide-content-integrity.md:c1.next --> |

#### 코드·실행 증거

<!-- learner:09-repository-wide-content-integrity.md:c1.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:09-repository-wide-content-integrity.md:c2.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:09-repository-wide-content-integrity.md:c2.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:09-repository-wide-content-integrity.md:c2.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:09-repository-wide-content-integrity.md:c2.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:09-repository-wide-content-integrity.md:c2.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:09-repository-wide-content-integrity.md:c2.next --> |

#### 코드·실행 증거

<!-- learner:09-repository-wide-content-integrity.md:c2.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:09-repository-wide-content-integrity.md:c3.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:09-repository-wide-content-integrity.md:c3.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:09-repository-wide-content-integrity.md:c3.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:09-repository-wide-content-integrity.md:c3.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:09-repository-wide-content-integrity.md:c3.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:09-repository-wide-content-integrity.md:c3.next --> |

#### 코드·실행 증거

<!-- learner:09-repository-wide-content-integrity.md:c3.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:09-repository-wide-content-integrity.md:c4.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:09-repository-wide-content-integrity.md:c4.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:09-repository-wide-content-integrity.md:c4.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:09-repository-wide-content-integrity.md:c4.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:09-repository-wide-content-integrity.md:c4.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:09-repository-wide-content-integrity.md:c4.next --> |

#### 코드·실행 증거

<!-- learner:09-repository-wide-content-integrity.md:c4.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:09-repository-wide-content-integrity.md:c5.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:09-repository-wide-content-integrity.md:c5.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:09-repository-wide-content-integrity.md:c5.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:09-repository-wide-content-integrity.md:c5.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:09-repository-wide-content-integrity.md:c5.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:09-repository-wide-content-integrity.md:c5.next --> |

#### 코드·실행 증거

<!-- learner:09-repository-wide-content-integrity.md:c5.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:09-repository-wide-content-integrity.md:c6.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:09-repository-wide-content-integrity.md:c6.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:09-repository-wide-content-integrity.md:c6.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:09-repository-wide-content-integrity.md:c6.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:09-repository-wide-content-integrity.md:c6.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:09-repository-wide-content-integrity.md:c6.next --> |

#### 코드·실행 증거

<!-- learner:09-repository-wide-content-integrity.md:c6.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:09-repository-wide-content-integrity.md:c7.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:09-repository-wide-content-integrity.md:c7.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:09-repository-wide-content-integrity.md:c7.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:09-repository-wide-content-integrity.md:c7.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:09-repository-wide-content-integrity.md:c7.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:09-repository-wide-content-integrity.md:c7.next --> |

#### 코드·실행 증거

<!-- learner:09-repository-wide-content-integrity.md:c7.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:09-repository-wide-content-integrity.md:c8.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:09-repository-wide-content-integrity.md:c8.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:09-repository-wide-content-integrity.md:c8.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:09-repository-wide-content-integrity.md:c8.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:09-repository-wide-content-integrity.md:c8.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:09-repository-wide-content-integrity.md:c8.next --> |

#### 코드·실행 증거

<!-- learner:09-repository-wide-content-integrity.md:c8.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:09-repository-wide-content-integrity.md:c9.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:09-repository-wide-content-integrity.md:c9.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:09-repository-wide-content-integrity.md:c9.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:09-repository-wide-content-integrity.md:c9.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:09-repository-wide-content-integrity.md:c9.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:09-repository-wide-content-integrity.md:c9.next --> |

#### 코드·실행 증거

<!-- learner:09-repository-wide-content-integrity.md:c9.evidence -->

## 6. Invariant evolution ledger

| 추적할 invariant | 도입·변화 SHA | 실제 owner/evidence | 제한·후속 보호 |
| --- | --- | --- | --- |
| Integrity issues는 shape parse 뒤 하나의 배열에 누적된다. | <!-- learner:09-repository-wide-content-integrity.md:ledger1.sha --> | <!-- learner:09-repository-wide-content-integrity.md:ledger1.evidence --> | <!-- learner:09-repository-wide-content-integrity.md:ledger1.limitation --> |
| 주요 identifiers/order/navigation href는 unique하다. | <!-- learner:09-repository-wide-content-integrity.md:ledger2.sha --> | <!-- learner:09-repository-wide-content-integrity.md:ledger2.evidence --> | <!-- learner:09-repository-wide-content-integrity.md:ledger2.limitation --> |
| Design registry는 default/list/supported 집합이 일치한다. | <!-- learner:09-repository-wide-content-integrity.md:ledger3.sha --> | <!-- learner:09-repository-wide-content-integrity.md:ledger3.evidence --> | <!-- learner:09-repository-wide-content-integrity.md:ledger3.limitation --> |
| Internal route는 enabled page/project만 가리킨다. | <!-- learner:09-repository-wide-content-integrity.md:ledger4.sha --> | <!-- learner:09-repository-wide-content-integrity.md:ledger4.evidence --> | <!-- learner:09-repository-wide-content-integrity.md:ledger4.limitation --> |
| Cross-file public references는 enabled target universe에 존재한다. | <!-- learner:09-repository-wide-content-integrity.md:ledger5.sha --> | <!-- learner:09-repository-wide-content-integrity.md:ledger5.evidence --> | <!-- learner:09-repository-wide-content-integrity.md:ledger5.limitation --> |

## 7. Failure → Fix → Test 관계

| Failure 또는 risk | Fix/전환 SHA | 교정된 결정 | Regression·검증 관계 |
| --- | --- | --- | --- |
| schema-valid ID가 duplicate/dangling일 수 있음 | <!-- learner:09-repository-wide-content-integrity.md:failure1.sha --> | <!-- learner:09-repository-wide-content-integrity.md:failure1.correction --> | <!-- learner:09-repository-wide-content-integrity.md:failure1.test --> |
| internal href가 unsupported/disabled target을 가리킴 | <!-- learner:09-repository-wide-content-integrity.md:failure2.sha --> | <!-- learner:09-repository-wide-content-integrity.md:failure2.correction --> | <!-- learner:09-repository-wide-content-integrity.md:failure2.test --> |
| presentation registry가 partial/unsupported일 수 있음 | <!-- learner:09-repository-wide-content-integrity.md:failure3.sha --> | <!-- learner:09-repository-wide-content-integrity.md:failure3.correction --> | <!-- learner:09-repository-wide-content-integrity.md:failure3.test --> |
| selector omission/0이 authoring error를 숨김 | <!-- learner:09-repository-wide-content-integrity.md:failure4.sha --> | <!-- learner:09-repository-wide-content-integrity.md:failure4.correction --> | <!-- learner:09-repository-wide-content-integrity.md:failure4.test --> |

## 8. Ownership·state·responsibility 변화

| 대상 | 이전 owner/state | 최종 owner/state | 근거 |
| --- | --- | --- | --- |
| per-file shape | <!-- learner:09-repository-wide-content-integrity.md:owner1.before --> | <!-- learner:09-repository-wide-content-integrity.md:owner1.after --> | <!-- learner:09-repository-wide-content-integrity.md:owner1.evidence --> |
| repository namespaces | <!-- learner:09-repository-wide-content-integrity.md:owner2.before --> | <!-- learner:09-repository-wide-content-integrity.md:owner2.after --> | <!-- learner:09-repository-wide-content-integrity.md:owner2.evidence --> |
| routing integrity | <!-- learner:09-repository-wide-content-integrity.md:owner3.before --> | <!-- learner:09-repository-wide-content-integrity.md:owner3.after --> | <!-- learner:09-repository-wide-content-integrity.md:owner3.evidence --> |
| cross-file references | <!-- learner:09-repository-wide-content-integrity.md:owner4.before --> | <!-- learner:09-repository-wide-content-integrity.md:owner4.after --> | <!-- learner:09-repository-wide-content-integrity.md:owner4.evidence --> |
| batch failure | <!-- learner:09-repository-wide-content-integrity.md:owner5.before --> | <!-- learner:09-repository-wide-content-integrity.md:owner5.after --> | <!-- learner:09-repository-wide-content-integrity.md:owner5.evidence --> |

## 9. Thread 최종 상태

<!-- learner:09-repository-wide-content-integrity.md:final.state -->

### 최종 설명

<!-- learner:09-repository-wide-content-integrity.md:final.explanation -->

## 10. 최종 실행·데이터 흐름

| 단계 | Owner/call path | 입력·출력 | Failure/non-guarantee |
| --- | --- | --- | --- |
| Parsed source에서 namespace Sets를 구성합니다. | <!-- learner:09-repository-wide-content-integrity.md:flow1.owner --> | <!-- learner:09-repository-wide-content-integrity.md:flow1.io --> | <!-- learner:09-repository-wide-content-integrity.md:flow1.failure --> |
| Duplicate/design registry를 검사합니다. | <!-- learner:09-repository-wide-content-integrity.md:flow2.owner --> | <!-- learner:09-repository-wide-content-integrity.md:flow2.io --> | <!-- learner:09-repository-wide-content-integrity.md:flow2.failure --> |
| Internal routes를 검사합니다. | <!-- learner:09-repository-wide-content-integrity.md:flow3.owner --> | <!-- learner:09-repository-wide-content-integrity.md:flow3.io --> | <!-- learner:09-repository-wide-content-integrity.md:flow3.failure --> |
| Cross-file references를 검사합니다. | <!-- learner:09-repository-wide-content-integrity.md:flow4.owner --> | <!-- learner:09-repository-wide-content-integrity.md:flow4.io --> | <!-- learner:09-repository-wide-content-integrity.md:flow4.failure --> |
| Issues가 있으면 한 번에 실패합니다. | <!-- learner:09-repository-wide-content-integrity.md:flow5.owner --> | <!-- learner:09-repository-wide-content-integrity.md:flow5.io --> | <!-- learner:09-repository-wide-content-integrity.md:flow5.failure --> |

## 11. 학습 완료 확인

<!-- learner:09-repository-wide-content-integrity.md:completion.check -->
