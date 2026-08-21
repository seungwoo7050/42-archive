# Thread: Runtime presentation schema contracts

> Repository: `https://github.com/seungwoo7050/42-archive`  
> Branch: `web/portfolio`  
> Category: `01-application-foundation-and-content-systems`

## 0. 분류 출처와 변경 가능 범위

- Commit SHA, subject, importance, tags는 target branch의 `commit/commit-importance.md` 분류와 exact commit metadata를 사용합니다.
- 이 문서의 Thread grouping, 목표, 역할, 조사 지점은 Phase 1 category audit에서 repository evidence를 기준으로 확정했습니다.
- Phase 2에서는 이 fixed information을 바꾸지 않고 learner-facing 기록만 채웠습니다.
- 다른 branch나 final HEAD 구현을 과거 SHA 설명에 소급하지 않습니다.

## 1. Thread 목표

다섯 design과 home/projects/detail/About/Contact/Interview Map/Journey/Resume route의 presentation source를 공용 ID vocabulary, strict nested object, 의도된 passthrough 확장점으로 runtime schema에 단계적으로 연결하는 과정을 복원합니다.

### 계획된 핵심 invariant

- Design/route별 알려진 필드는 schema가 검증하고 section order 배열은 비어 있지 않으며 중복될 수 없습니다.
- Nested design contract는 주로 `strict()`이지만 presentation root, home/pages의 선택된 확장 지점은 `passthrough()`를 유지합니다.
- Presentation schema는 copy/ordering 형식을 검증할 뿐 cross-file project/link/route 존재를 검증하지 않습니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- section ID·count key·design ID는 어떤 enum/refine 조합으로 제한되는가?
- `strict()`와 `passthrough()`가 공존하는 정확한 계층은 어디인가?
- route별 schema가 추가되어도 default template·supported design completeness는 왜 후속 loader 책임인가?

## 3. 완료 기준

- 각 SHA의 parent diff와 resulting tree에서 실제 file/symbol을 확인합니다.
- 이전 상태, implementation decision, owner/lifetime, absence/failure/fallback, guarantee/non-guarantee를 분리합니다.
- Fix·refactor·integration은 바로 앞의 assumption이나 duplicated responsibility와 연결합니다.
- 테스트나 command는 실제 실행 여부를 정적 검토와 명확히 구분합니다.
- Thread 종료 시 invariant evolution과 최종 flow를 코드 없이 설명합니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | 이 Thread에서의 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `807214624c87` | feat(content): 홈 표현 식별자 schema 추가 | B | CONTENT, VALIDATION | presentation primitive와 section uniqueness |
| 2 | `97ff48de55b8` | feat(content): 프로젝트 목록 표현 schema 추가 | B | CONTENT, VALIDATION | five-design projects page schema |
| 3 | `42a81197af82` | feat(content): 표현 공용 UI schema 추가 | B | CONTENT, VALIDATION | presentation root/UI schema |
| 4 | `a3825a49a055` | feat(content): Design과 Classic 홈 표현 schema 추가 | B | CONTENT, VALIDATION, RENDERER | initial home design schemas |
| 5 | `2a02781859b8` | feat(content): Editorial 홈 표현 schema 추가 | B | CONTENT, VALIDATION, RENDERER | Editorial schema |
| 6 | `23d5297b42bd` | feat(content): Brutalist 홈 표현 schema 추가 | B | CONTENT, VALIDATION, RENDERER | Brutalist schema |
| 7 | `ad07ab4b31a9` | feat(content): Cinematic 홈 표현 schema 추가 | B | CONTENT, VALIDATION, RENDERER | Cinematic schema |
| 8 | `3c873e373bbb` | feat(content): 공용 홈 섹션 schema 추가 | B | CONTENT, VALIDATION | shared home schema |
| 9 | `edcf1eaa6f71` | feat(content): About과 Contact 표현 schema 추가 | B | CONTENT, VALIDATION, RENDERER | About/Contact schemas |
| 10 | `4eb0db7b9656` | feat(content): Interview Map 표현 schema 추가 | B | CONTENT, VALIDATION, RENDERER | Interview Map schema |
| 11 | `7f3c16b50990` | feat(content): Journey 표현 schema 추가 | B | CONTENT, VALIDATION, RENDERER | Journey schema |
| 12 | `50b78a557344` | feat(content): 프로젝트 상세 표현 schema 추가 | B | CONTENT, VALIDATION | project detail and projects route schema closure |
| 13 | `4e2454cfc9c4` | feat(content): Resume 표현 schema 추가 | B | CONTENT, VALIDATION, RENDERER | Resume presentation schema closure |

## 5. Commit별 학습 기록

### 1. `807214624c87` — feat(content): 홈 표현 식별자 schema 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION
- **Thread 역할:** presentation primitive와 section uniqueness
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `sectionCopySchema`, home section ID enums, five design IDs, work-map/project count key enums를 확인합니다.
- Editorial/Brutalist/Cinematic section 배열의 `min(1)`과 Set-size `refine`을 확인합니다.

확인 원칙:

- 먼저 `807214624c87^`와 `807214624c87`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | presentation source의 section/order/count key는 임의 문자열 배열이어서 중복·지원하지 않는 값이 들어갈 수 있었습니다. |
| 실제 변경 file/symbol/call path | 공용 section copy와 design별 section ID, site design ID, count key를 enum으로 제한하고 추가 design section order의 비어 있음/중복을 거부합니다. |
| Data/state/resource owner와 lifetime | `content-schema.ts`가 presentation vocabulary와 순서 배열 invariant를 소유합니다. |
| Failure·absence·fallback 처리 | 배열의 업무상 최적 순서나 모든 supported design의 실제 구성 여부는 검사하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | 허용 ID와 section 배열의 최소·유일성을 runtime에서 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `97ff48de55b8`이 projects route 구조를 추가합니다. |

#### 코드·실행 증거

정적 근거: `807214624c87`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 2. `97ff48de55b8` — feat(content): 프로젝트 목록 표현 schema 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION
- **Thread 역할:** five-design projects page schema
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `projectPageContentSchema`의 groups와 Design/Classic/Editorial/Brutalist/Cinematic nested fields를 확인합니다.
- Classic `maxGroups` positive integer, count key enum, nested `strict()`와 root `passthrough()`를 기록합니다.

확인 원칙:

- 먼저 `97ff48de55b8^`와 `97ff48de55b8`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | projects route presentation 값은 type/JSON에 있었지만 runtime shape를 확인하지 못했습니다. |
| 실제 변경 file/symbol/call path | 다섯 design의 hero/stats/terminal/group copy와 group descriptions를 schema로 정의합니다. |
| Data/state/resource owner와 lifetime | route-specific nested object는 schema가 소유하고 outer project page는 확장 key를 허용합니다. |
| Failure·absence·fallback 처리 | `passthrough()` 때문에 unknown outer key를 거부하지 않으며 group category가 실제 project group과 대응하는지 검사하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | known projects presentation field의 runtime 형식을 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `42a81197af82`가 presentation root와 공용 UI를 연결합니다. |

#### 코드·실행 증거

정적 근거: `97ff48de55b8`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 3. `42a81197af82` — feat(content): 표현 공용 UI schema 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION
- **Thread 역할:** presentation root/UI schema
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `presentationContentSchema`의 default/template/ui/emptyStates를 확인합니다.
- template/root `passthrough()`와 UI/emptyStates `strict()`를 구분합니다.

확인 원칙:

- 먼저 `42a81197af82^`와 `42a81197af82`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | 개별 projects schema는 있었지만 `presentation.json` root와 공용 UI copy를 한 문서로 검사할 schema가 없었습니다. |
| 실제 변경 file/symbol/call path | default design, templates, 공용 UI/ARIA/empty-state 필드를 root schema에 추가합니다. |
| Data/state/resource owner와 lifetime | presentation root가 전체 문서 entry contract를 소유합니다. |
| Failure·absence·fallback 처리 | root와 template는 확장 key를 허용하고 default design이 templates에 실제 포함되는지 아직 검사하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | 공용 UI known fields와 design ID 형식을 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `a3825a49a055`부터 home design subtree를 채웁니다. |

#### 코드·실행 증거

정적 근거: `42a81197af82`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 4. `a3825a49a055` — feat(content): Design과 Classic 홈 표현 schema 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION, RENDERER
- **Thread 역할:** initial home design schemas
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- Design/Classic shell, hero, sections, featured, terminal command/output schema를 확인합니다.
- nested strictness와 `home` outer passthrough를 확인합니다.

확인 원칙:

- 먼저 `a3825a49a055^`와 `a3825a49a055`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | presentation root는 존재했지만 초기 두 home design subtree가 runtime 검증되지 않았습니다. |
| 실제 변경 file/symbol/call path | Design/Classic의 shell/home copy, stats/count keys, section order, terminal structure를 strict nested schema로 추가합니다. |
| Data/state/resource owner와 lifetime | 각 design contract가 known field shape를 소유합니다. |
| Failure·absence·fallback 처리 | home outer node는 passthrough이고 terminal placeholder token의 의미나 renderer 지원은 검사하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | 초기 두 design의 known presentation shape를 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `2a02781859b8`부터 세 추가 design을 확장합니다. |

#### 코드·실행 증거

정적 근거: `a3825a49a055`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 5. `2a02781859b8` — feat(content): Editorial 홈 표현 schema 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION, RENDERER
- **Thread 역할:** Editorial schema
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- Editorial shell/home hero/lead/featured/principles/contact fields와 section uniqueness schema 연결을 확인합니다.

확인 원칙:

- 먼저 `2a02781859b8^`와 `2a02781859b8`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Editorial JSON contract가 root passthrough 아래 무검증으로 남았습니다. |
| 실제 변경 file/symbol/call path | Editorial 전용 shell 및 home presentation fields를 strict nested schema로 추가합니다. |
| Data/state/resource owner와 lifetime | Editorial known vocabulary는 schema가 소유합니다. |
| Failure·absence·fallback 처리 | 실제 Editorial renderer가 모든 field를 사용하거나 의미 있는 copy인지 검증하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | Editorial source shape를 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `23d5297b42bd`가 Brutalist를 추가합니다. |

#### 코드·실행 증거

정적 근거: `2a02781859b8`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 6. `23d5297b42bd` — feat(content): Brutalist 홈 표현 schema 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION, RENDERER
- **Thread 역할:** Brutalist schema
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- Brutalist shell/home signal/system/journey/contact fields와 section array schema를 확인합니다.

확인 원칙:

- 먼저 `23d5297b42bd^`와 `23d5297b42bd`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Brutalist subtree가 runtime 검증되지 않았습니다. |
| 실제 변경 file/symbol/call path | Brutalist 전용 표현 fields를 strict nested schema로 추가합니다. |
| Data/state/resource owner와 lifetime | Brutalist contract는 schema가 소유합니다. |
| Failure·absence·fallback 처리 | renderer behavior와 visual contract는 보장하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | Brutalist source shape를 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `ad07ab4b31a9`가 Cinematic을 추가합니다. |

#### 코드·실행 증거

정적 근거: `23d5297b42bd`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 7. `ad07ab4b31a9` — feat(content): Cinematic 홈 표현 schema 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION, RENDERER
- **Thread 역할:** Cinematic schema
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- Cinematic shell subtitle, home sections/hero/statement/focus/contact/case-study labels를 확인합니다.
- home outer passthrough 안의 Cinematic node가 strict인지 확인합니다.

확인 원칙:

- 먼저 `ad07ab4b31a9^`와 `ad07ab4b31a9`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Cinematic subtree가 runtime 검증되지 않았습니다. |
| 실제 변경 file/symbol/call path | Cinematic shell/home presentation fields를 strict nested schema로 추가합니다. |
| Data/state/resource owner와 lifetime | Cinematic known contract는 schema가 소유합니다. |
| Failure·absence·fallback 처리 | 알려지지 않은 sibling home key는 outer passthrough로 허용됩니다. |
| 보장하는 것과 보장하지 않는 것 | Cinematic source shape를 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `3c873e373bbb`이 공용 home sections를 추가합니다. |

#### 코드·실행 증거

정적 근거: `ad07ab4b31a9`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 8. `3c873e373bbb` — feat(content): 공용 홈 섹션 schema 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION
- **Thread 역할:** shared home schema
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- shared workMap cards의 ID/label/body/countKey와 technicalFocus/stack/journey/contact schema를 확인합니다.
- shared node strictness를 확인합니다.

확인 원칙:

- 먼저 `3c873e373bbb^`와 `3c873e373bbb`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | 다섯 design이 공유하는 home copy가 root passthrough 아래 무검증으로 남았습니다. |
| 실제 변경 file/symbol/call path | work map과 공용 home sections를 strict shared object로 정의합니다. |
| Data/state/resource owner와 lifetime | 공유 copy contract는 하나의 schema node가 소유합니다. |
| Failure·absence·fallback 처리 | count key로 계산되는 metric 값과 card ID 의미는 검사하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | cross-design shared copy의 known shape를 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `edcf1eaa6f71`부터 auxiliary routes를 추가합니다. |

#### 코드·실행 증거

정적 근거: `3c873e373bbb`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 9. `edcf1eaa6f71` — feat(content): About과 Contact 표현 schema 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION, RENDERER
- **Thread 역할:** About/Contact schemas
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- About hero/principles/journey/skills/curation/editorial/brutalist와 Contact availability/notes design fields를 확인합니다.
- About/Contact/pages outer `passthrough()`를 기록합니다.

확인 원칙:

- 먼저 `edcf1eaa6f71^`와 `edcf1eaa6f71`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | About과 Contact route copy가 runtime schema에 포함되지 않았습니다. |
| 실제 변경 file/symbol/call path | 두 route의 known presentation fields를 추가합니다. |
| Data/state/resource owner와 lifetime | route subtree의 known fields는 schema가 소유하되 page nodes는 확장 가능성을 위해 passthrough를 유지합니다. |
| Failure·absence·fallback 처리 | unknown page key를 모두 거부하지 않고 실제 page enablement/route 존재를 검사하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | About/Contact known copy 형식을 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `4eb0db7b9656`이 Interview Map을 추가합니다. |

#### 코드·실행 증거

정적 근거: `edcf1eaa6f71`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 10. `4eb0db7b9656` — feat(content): Interview Map 표현 schema 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION, RENDERER
- **Thread 역할:** Interview Map schema
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- hero, tracks labels/templates, gaps ARIA/eyebrow schema를 확인합니다.
- nested strict와 route passthrough를 구분합니다.

확인 원칙:

- 먼저 `4eb0db7b9656^`와 `4eb0db7b9656`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Interview Map presentation copy가 root passthrough로만 통과했습니다. |
| 실제 변경 file/symbol/call path | Interview Map의 evidence index/empty/gaps vocabulary를 schema에 추가합니다. |
| Data/state/resource owner와 lifetime | known labels/templates는 schema가 소유합니다. |
| Failure·absence·fallback 처리 | template placeholder의 실제 치환과 evidence reference 존재는 검사하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | Interview Map known presentation shape를 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `7f3c16b50990`이 Journey를 추가합니다. |

#### 코드·실행 증거

정적 근거: `4eb0db7b9656`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 11. `7f3c16b50990` — feat(content): Journey 표현 schema 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION, RENDERER
- **Thread 역할:** Journey schema
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- hero/narrative labels/timeline/now schema와 nested strictness를 확인합니다.

확인 원칙:

- 먼저 `7f3c16b50990^`와 `7f3c16b50990`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Journey presentation copy가 runtime 검증되지 않았습니다. |
| 실제 변경 file/symbol/call path | Journey narrative state/reason/result labels와 timeline/current-position fields를 schema에 추가합니다. |
| Data/state/resource owner와 lifetime | Journey route copy contract는 schema가 소유합니다. |
| Failure·absence·fallback 처리 | milestone chronology나 anchor project 참조는 검사하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | Journey known presentation shape를 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `50b78a557344`가 project detail/projects page linkage를 추가합니다. |

#### 코드·실행 증거

정적 근거: `7f3c16b50990`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 12. `50b78a557344` — feat(content): 프로젝트 상세 표현 schema 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION
- **Thread 역할:** project detail and projects route schema closure
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- projectDetail back/case/missing/facts/outro/frame/editorial/sections schema를 확인합니다.
- `pages.projects: projectPageContentSchema` 연결을 확인합니다.

확인 원칙:

- 먼저 `50b78a557344^`와 `50b78a557344`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | project detail route와 이미 정의한 projects page schema가 `presentationContentSchema.pages`에 완전히 연결되지 않았습니다. |
| 실제 변경 file/symbol/call path | project detail known fields와 section key 집합을 추가하고 projects route schema를 pages node에 연결합니다. |
| Data/state/resource owner와 lifetime | 두 project route contract를 presentation schema가 소유합니다. |
| Failure·absence·fallback 처리 | project ID 존재, 404 status, section content 존재는 검사하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | project index/detail known presentation shape를 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `4e2454cfc9c4`가 Resume route를 추가합니다. |

#### 코드·실행 증거

정적 근거: `50b78a557344`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 13. `4e2454cfc9c4` — feat(content): Resume 표현 schema 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION, RENDERER
- **Thread 역할:** Resume presentation schema closure
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- Resume hero/summary/projects/training/experience/education/notes/identity/editorial/brutalist fields를 확인합니다.
- route node passthrough와 nested strictness를 기록합니다.

확인 원칙:

- 먼저 `4e2454cfc9c4^`와 `4e2454cfc9c4`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Resume presentation route가 schema coverage에서 빠져 있었습니다. |
| 실제 변경 file/symbol/call path | Resume의 known section/title/identity/design-specific fields를 schema에 추가합니다. |
| Data/state/resource owner와 lifetime | Resume copy contract는 schema가 소유합니다. |
| Failure·absence·fallback 처리 | download asset, project refs, 실제 section rendering은 검사하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | 주요 presentation routes와 다섯 design의 known field coverage를 완성합니다. |
| 다음 commit 또는 관련 test 연결 | T8 parser가 이 schema를 실제 `presentation.json`에 적용하고 T9가 design completeness를 검사합니다. |

#### 코드·실행 증거

정적 근거: `4e2454cfc9c4`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

## 6. Invariant evolution ledger

| 추적할 invariant | 도입·변화 SHA | 실제 owner/evidence | 제한·후속 보호 |
| --- | --- | --- | --- |
| section/design/count key vocabulary는 enum으로 제한한다. | `807214624c87` | presentation primitives | 업무상 순서의 타당성은 미검사 |
| section order는 최소 한 개이며 중복될 수 없다. | `807214624c87` | design-specific arrays + refine | 지원 design completeness는 T9 |
| known nested fields는 주로 strict하게 검사한다. | `97ff48de55b8` → `4e2454cfc9c4` | design/route schemas | 선택된 outer nodes는 passthrough |
| presentation root는 확장 가능성을 유지한다. | `42a81197af82` 이후 | `presentationContentSchema` | unknown top-level/page key를 모두 거부하지 않음 |

## 7. Failure → Fix → Test 관계

| Failure 또는 risk | Fix/전환 SHA | 교정된 결정 | Regression·검증 관계 |
| --- | --- | --- | --- |
| presentation JSON이 임의 section/count key를 수용 | `807214624c87` | enum + unique section arrays | 후속 invalid-presentation tests |
| route/design known field가 runtime 검증 밖에 있음 | T6 sequence | 각 subtree schema를 점진 연결 | `03d2c9be0a43`에서 실제 source parse |
| strictness를 전체 문서에 과장할 위험 | 의도된 `passthrough()` 유지 | known nested contract만 strict | unknown extension key 허용을 비보장으로 기록 |

## 8. Ownership·state·responsibility 변화

| 대상 | 이전 owner/state | 최종 owner/state | 근거 |
| --- | --- | --- | --- |
| presentation ID vocabulary | 수동 union | Zod enums/refine | `content-schema.ts` |
| design/route known fields | TypeScript/JSON convention | nested schemas | 각 design/page node |
| extension keys | 암묵적 허용 | 명시적 passthrough 지점 | root/home/pages/선택 route |
| cross-file design/reference integrity | 없음 | 여전히 없음 | T9 loader가 인수 |

## 9. Thread 최종 상태

Thread 종료 시점에는 다섯 design과 주요 route의 known presentation fields, 공용 UI/empty-state vocabulary, section ID·count key·ordering cardinality가 runtime schema로 표현됩니다. 다만 root와 선택된 outer page nodes는 확장 key를 허용하며 default design completeness, route/project reference, renderer behavior는 보장하지 않습니다.

### 최종 설명

- 공용 design/section/count-key vocabulary와 section 유일성 invariant를 정의했습니다.
- 다섯 home design과 shared sections를 strict nested contract로 확장했습니다.
- projects/detail/About/Contact/Interview Map/Journey/Resume route를 schema에 연결했습니다.
- 문서 전체 strictness를 과장하지 않고 의도된 passthrough 지점을 남겼습니다.

## 10. 최종 실행·데이터 흐름

| 단계 | Owner/call path | 입력·출력 | Failure/non-guarantee |
| --- | --- | --- | --- |
| presentation JSON을 입력합니다. | `presentationContentSchema` | root object | parser 연결 전에는 호출되지 않음 |
| design/section IDs를 검사합니다. | enum/refine schemas | 허용·유일한 IDs | 순서 의미는 미검사 |
| known nested route/design fields를 검사합니다. | strict child schemas | typed parsed subtrees | outer extension keys는 보존 |
| 후속 integrity 검사로 넘깁니다. | T8/T9 loader | parsed presentation source | default/templates completeness는 후속 |

## 11. 학습 완료 확인

완료했습니다. 모든 commit은 exact SHA의 parent diff/resulting tree를 기준으로 기록했고, direct execution evidence와 static inspection을 구분했습니다. `3353032ba23b`은 다섯 design과 invalid/unsupported design cases를 후속 테스트합니다. 이 작업에서는 실행하지 않았습니다.
