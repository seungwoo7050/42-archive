# Thread: Presentation contracts for multi-route UI

> Repository: `https://github.com/seungwoo7050/42-archive`  
> Branch: `web/portfolio`  
> Category: `01-application-foundation-and-content-systems`

## 0. 분류 출처와 변경 가능 범위

- Commit SHA, subject, importance, tags는 target branch의 `commit/commit-importance.md` 분류와 exact commit metadata를 사용합니다.
- 이 문서의 Thread grouping, 목표, 역할, 조사 지점은 Phase 1 category audit에서 repository evidence를 기준으로 확정했습니다.
- Phase 2에서는 이 fixed information을 바꾸지 않고 learner-facing 기록만 채웠습니다.
- 다른 branch나 final HEAD 구현을 과거 SHA 설명에 소급하지 않습니다.

## 1. Thread 목표

한 개 home placeholder에서 다섯 design과 여러 route가 공유·분리하는 copy, section order, metric key, ARIA/empty-state vocabulary까지 `presentation.json` 계약으로 성장하는 과정을 복원합니다.

### 계획된 핵심 invariant

- route/design별 표시 문구와 section order는 renderer 코드가 아니라 presentation source가 소유합니다.
- count key, section ID, empty/ARIA label은 제한된 vocabulary로 소비됩니다.
- placeholder 추가와 실제 copy 완성을 구분하고, JSON 변경만으로 renderer 지원을 과장하지 않습니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- Design/Classic의 초기 home 계약에서 다섯 design·다중 route로 어떻게 확장되는가?
- 새 copy가 추가된 commit과 실제 placeholder가 완성된 commit은 각각 무엇인가?
- 공용 vocabulary와 design-specific vocabulary의 경계는 어디인가?

## 3. 완료 기준

- 각 SHA의 parent diff와 resulting tree에서 실제 file/symbol을 확인합니다.
- 이전 상태, implementation decision, owner/lifetime, absence/failure/fallback, guarantee/non-guarantee를 분리합니다.
- Fix·refactor·integration은 바로 앞의 assumption이나 duplicated responsibility와 연결합니다.
- 테스트나 command는 실제 실행 여부를 정적 검토와 명확히 구분합니다.
- Thread 종료 시 invariant evolution과 최종 flow를 코드 없이 설명합니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | 이 Thread에서의 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `7f5017b21d37` | feat(content): 디자인 홈 표현 모델 추가 | B | CONTENT | Design home 계약 시작 |
| 2 | `04a810bb0ab4` | feat(content): 클래식과 공용 홈 표현 추가 | B | CONTENT | Classic/shared home 계약 |
| 3 | `d21d53591b5c` | feat(content): 프로젝트 목록 표현 계약 정의 | B | CONTENT | projects route type 계약 |
| 4 | `d55a2017e725` | feat(content): 프로젝트 목록 화면 문구 추가 | B | CONTENT | projects route placeholder source |
| 5 | `d6468cbea9e2` | feat(content): 보조 페이지 표현 계약 정의 | B | CONTENT | detail/about/resume/contact 계약 |
| 6 | `da3941184155` | feat(content): 상세 소개 이력 연락 문구 추가 | B | CONTENT | 초기 route copy source |
| 7 | `96c8ba5733f5` | feat(content): 공용 UI 표현 콘텐츠 구성 | B | CONTENT | 공용 ARIA/empty-state vocabulary |
| 8 | `9a7d41edfad0` | feat(content): Design과 Classic 홈 표현 콘텐츠 구성 | B | CONTENT, RENDERER | 초기 두 home의 의미 있는 구성 |
| 9 | `2b9b35d4b8de` | feat(content): 확장 디자인 홈 표현 콘텐츠 구성 | B | CONTENT | Editorial/Brutalist/Cinematic 계약 |
| 10 | `8886459d1b0d` | feat(content): 공용 홈 섹션 표현 콘텐츠 구성 | B | CONTENT | shared home copy 완성 |
| 11 | `61d1976cde0d` | feat(content): 프로젝트 목록 표현 콘텐츠 구성 | B | CONTENT | 다섯 design projects route copy |
| 12 | `a6c72a6b3b34` | feat(content): 프로젝트 상세 표현 콘텐츠 구성 | B | CONTENT | project detail copy 완성 |
| 13 | `20dfc298375c` | feat(content): About과 Journey 표현 콘텐츠 구성 | B | CONTENT, RENDERER | About/Journey narrative 계약 |
| 14 | `13c8c52c54d9` | feat(content): Interview Map과 Resume 표현 콘텐츠 구성 | B | CONTENT, RENDERER | Resume/Interview Map 계약 완성 |
| 15 | `a7a2000ff462` | feat(content): Contact 표현 콘텐츠와 최종 문서 형식 구성 | B | CONTENT, RENDERER | 문서형 route 최종 구성 |

## 5. Commit별 학습 기록

### 1. `7f5017b21d37` — feat(content): 디자인 홈 표현 모델 추가

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** Design home 계약 시작
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `presentation.json`의 `defaultHomeTemplate`, templates, `home.design`을 확인합니다.
- `types.ts`의 home section/count key/Design hero type을 확인합니다.

확인 원칙:

- 먼저 `7f5017b21d37^`와 `7f5017b21d37`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | home 문구와 section order가 renderer 내부에 머물 수 있었습니다. |
| 실제 변경 file/symbol/call path | Design/Classic template ID와 Design hero stats, section order, featured copy를 presentation source/type으로 이동합니다. |
| Data/state/resource owner와 lifetime | `presentation.json`이 표시 순서와 문구를, renderer가 구조/스타일을 소유하도록 경계를 시작합니다. |
| Failure·absence·fallback 처리 | Classic 세부 계약과 다른 route는 없고 runtime schema도 없습니다. |
| 보장하는 것과 보장하지 않는 것 | Design home의 데이터 기반 표현 계약을 보장하지만 multi-route 지원은 보장하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | `04a810bb0ab4`가 Classic terminal과 shared home copy를 추가합니다. |

#### 코드·실행 증거

정적 근거: `7f5017b21d37`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 2. `04a810bb0ab4` — feat(content): 클래식과 공용 홈 표현 추가

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** Classic/shared home 계약
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `home.classic.terminal`, shared `workMap`, `technicalFocus`, `stack`, `journey`, `contact`를 확인합니다.
- terminal command/output 배열의 소유 위치를 확인합니다.

확인 원칙:

- 먼저 `04a810bb0ab4^`와 `04a810bb0ab4`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Design home만 source-driven이고 Classic terminal과 공용 section copy는 코드에 남을 수 있었습니다. |
| 실제 변경 file/symbol/call path | Classic hero/featured/terminal과 두 renderer가 공유할 home section copy를 presentation source에 추가합니다. |
| Data/state/resource owner와 lifetime | terminal script-like text와 shared section copy는 JSON이 소유하고 component는 형식만 렌더링합니다. |
| Failure·absence·fallback 처리 | 값은 대부분 placeholder이고 section ID 유일성이나 template consistency는 검증하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | 두 초기 design의 공용/전용 copy 경계를 정의하지만 완성된 editorial content는 아닙니다. |
| 다음 commit 또는 관련 test 연결 | `d21d53591b5c`부터 projects route 계약이 분리됩니다. |

#### 코드·실행 증거

정적 근거: `04a810bb0ab4`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 3. `d21d53591b5c` — feat(content): 프로젝트 목록 표현 계약 정의

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** projects route type 계약
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `ProjectPageContent`와 Design/Classic hero stats, terminal, selected/grouped shape를 확인합니다.
- countKey가 renderer 계산 결과와 연결될 단순 문자열 union인지 확인합니다.

확인 원칙:

- 먼저 `d21d53591b5c^`와 `d21d53591b5c`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | home 외 projects index의 문구·통계 label·terminal 설정이 code-local일 수 있었습니다. |
| 실제 변경 file/symbol/call path | projects list page의 Design/Classic presentation type을 추가하여 route-level copy contract를 분리합니다. |
| Data/state/resource owner와 lifetime | presentation type이 route copy shape를 소유하지만 JSON 값은 다음 commit까지 없습니다. |
| Failure·absence·fallback 처리 | 타입만 추가되어 runtime 데이터 존재나 count key 유효 계산은 보장하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | projects route가 요구할 shape를 명시하지만 실제 source 연결은 다음 commit 책임입니다. |
| 다음 commit 또는 관련 test 연결 | `d55a2017e725`가 placeholder source를 추가합니다. |

#### 코드·실행 증거

정적 근거: `d21d53591b5c`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 4. `d55a2017e725` — feat(content): 프로젝트 목록 화면 문구 추가

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** projects route placeholder source
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `presentation.json.pages.projects`의 Design/Classic 구조를 확인합니다.
- 빈 `groups`, placeholder body, stats/countKey, terminal `maxGroups`를 구분합니다.

확인 원칙:

- 먼저 `d55a2017e725^`와 `d55a2017e725`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | projects route type은 있었지만 source 값이 없어 renderer가 계약을 소비할 수 없었습니다. |
| 실제 변경 file/symbol/call path | Design/Classic projects page의 hero, stats, featured, terminal, selected/grouped 문구를 placeholder 형태로 추가합니다. |
| Data/state/resource owner와 lifetime | route copy는 JSON이 소유하지만 groups는 빈 배열이고 실제 group description은 아직 연결되지 않습니다. |
| Failure·absence·fallback 처리 | 구조 존재만 보장하며 의미 있는 copy와 모든 design 지원은 보장하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | projects route source contract의 최소 값을 제공하지만 완성 상태는 아닙니다. |
| 다음 commit 또는 관련 test 연결 | `d6468cbea9e2`가 다른 route type/source 계약을 확장합니다. |

#### 코드·실행 증거

정적 근거: `d55a2017e725`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 5. `d6468cbea9e2` — feat(content): 보조 페이지 표현 계약 정의

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** detail/about/resume/contact 계약
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `types.ts`의 project detail section, About, Resume, Contact page content와 `PresentationContent.pages`를 확인합니다.
- project detail section key 집합과 route별 필수 field를 확인합니다.

확인 원칙:

- 먼저 `d6468cbea9e2^`와 `d6468cbea9e2`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | projects index 외 상세/정보 route는 code-local copy에 의존할 수 있었습니다. |
| 실제 변경 file/symbol/call path | project detail, About, Resume, Contact의 page-level presentation type을 aggregate에 추가합니다. |
| Data/state/resource owner와 lifetime | `PresentationContent.pages`가 multi-route copy contract를 소유합니다. |
| Failure·absence·fallback 처리 | Journey/Interview Map과 다섯 design-specific 확장은 없고 JSON values도 placeholder 단계입니다. |
| 보장하는 것과 보장하지 않는 것 | 초기 핵심 route의 type contract를 보장하지만 complete copy와 runtime parse는 보장하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | `da3941184155`가 실제 route copy를 채웁니다. |

#### 코드·실행 증거

정적 근거: `d6468cbea9e2`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 6. `da3941184155` — feat(content): 상세 소개 이력 연락 문구 추가

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** 초기 route copy source
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `presentation.json.pages`의 projectDetail/about/resume/contact 값을 확인합니다.
- placeholder와 실제 label을 구분하고 renderer가 아직 소비하지 않는 field가 있는지 확인합니다.

확인 원칙:

- 먼저 `da3941184155^`와 `da3941184155`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | route type은 있었지만 JSON에 대응 값이 없어 source-driven rendering이 불완전했습니다. |
| 실제 변경 file/symbol/call path | 상세/About/Resume/Contact의 heading, label, action copy를 presentation source에 추가합니다. |
| Data/state/resource owner와 lifetime | route copy owner가 component에서 JSON으로 이동할 기반이 생깁니다. |
| Failure·absence·fallback 처리 | 여러 값은 placeholder이고 모든 component가 즉시 이 source를 소비한다는 보장은 없습니다. |
| 보장하는 것과 보장하지 않는 것 | 필수 route copy 구조를 제공합니다. |
| 다음 commit 또는 관련 test 연결 | `96c8ba5733f5`가 공용 UI vocabulary와 template description을 추가합니다. |

#### 코드·실행 증거

정적 근거: `da3941184155`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 7. `96c8ba5733f5` — feat(content): 공용 UI 표현 콘텐츠 구성

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** 공용 ARIA/empty-state vocabulary
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `presentation.json.ui`의 debug/skip/nav/switcher/ARIA/emptyStates를 확인합니다.
- template description과 public UI label이 component-local literal을 대체할 범위를 확인합니다.

확인 원칙:

- 먼저 `96c8ba5733f5^`와 `96c8ba5733f5`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | navigation, accessibility label, empty-state 문구가 여러 component에 중복될 위험이 있었습니다. |
| 실제 변경 file/symbol/call path | 공용 UI label과 ARIA template, empty-state vocabulary를 presentation source에 중앙화합니다. |
| Data/state/resource owner와 lifetime | 문구의 owner는 공용 JSON node로 이동하고 component는 format/placement만 담당합니다. |
| Failure·absence·fallback 처리 | 문구가 존재해도 실제 semantic markup과 screen-reader 동작을 검증하지는 않습니다. |
| 보장하는 것과 보장하지 않는 것 | 공용 vocabulary 일관성을 제공하지만 accessibility behavior 자체는 보장하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | `9a7d41edfad0`이 Design/Classic home placeholder를 실제 copy와 section order로 완성합니다. |

#### 코드·실행 증거

정적 근거: `96c8ba5733f5`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 8. `9a7d41edfad0` — feat(content): Design과 Classic 홈 표현 콘텐츠 구성

- **Importance:** B
- **Tags:** CONTENT, RENDERER
- **Thread 역할:** 초기 두 home의 의미 있는 구성
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `presentation.json.home.design/classic.sections`가 여섯 section으로 채워지는 diff를 확인합니다.
- Design action/featured copy와 Classic terminal commands/output placeholder 교체를 확인합니다.

확인 원칙:

- 먼저 `9a7d41edfad0^`와 `9a7d41edfad0`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | 두 home 계약은 있었지만 빈 section order와 placeholder terminal/copy 때문에 실제 정보 구조가 정해지지 않았습니다. |
| 실제 변경 file/symbol/call path | Design/Classic의 section order를 채우고 action label, featured copy, terminal command sequence를 실제 콘텐츠로 교체합니다. |
| Data/state/resource owner와 lifetime | home 정보 구조와 terminal narrative는 JSON이 소유합니다. |
| Failure·absence·fallback 처리 | 다른 세 design과 shared section body는 아직 완성되지 않았고 renderer behavior는 이 JSON diff만으로 증명되지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | 초기 두 home의 완성된 순서/문구 계약을 제공합니다. |
| 다음 commit 또는 관련 test 연결 | `2b9b35d4b8de`가 추가 design 계약을 만들고 `8886459d1b0d`이 shared copy를 완성합니다. |

#### 코드·실행 증거

정적 근거: `9a7d41edfad0`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 9. `2b9b35d4b8de` — feat(content): 확장 디자인 홈 표현 콘텐츠 구성

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** Editorial/Brutalist/Cinematic 계약
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `presentation.json`과 type에서 editorial/brutalist/cinematic shell/home nodes를 확인합니다.
- 각 design의 section ID vocabulary와 action label 차이를 확인합니다.

확인 원칙:

- 먼저 `2b9b35d4b8de^`와 `2b9b35d4b8de`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Design/Classic 외 visual system은 공용 contract에 표현할 위치가 없었습니다. |
| 실제 변경 file/symbol/call path | 세 추가 design의 shell/home section order, hero/action, design-specific copy shape를 추가합니다. |
| Data/state/resource owner와 lifetime | design별 정보 구조는 JSON이, 실제 layout/visual language는 각 renderer가 소유합니다. |
| Failure·absence·fallback 처리 | JSON node 추가만으로 renderer 구현·lazy loading·visual regression은 보장하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | 다섯 design을 표현할 source contract를 제공합니다. |
| 다음 commit 또는 관련 test 연결 | `8886459d1b0d`과 후속 route copy commits가 placeholder를 실제 콘텐츠로 바꿉니다. |

#### 코드·실행 증거

정적 근거: `2b9b35d4b8de`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 10. `8886459d1b0d` — feat(content): 공용 홈 섹션 표현 콘텐츠 구성

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** shared home copy 완성
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `home.shared.workMap` card IDs/labels/body/countKey와 technicalFocus/stack/journey/contact diff를 확인합니다.
- `curriculum` card ID가 `archive`로 바뀐 의미를 확인합니다.

확인 원칙:

- 먼저 `8886459d1b0d^`와 `8886459d1b0d`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | 공용 home sections는 placeholder body와 임시 card vocabulary를 사용했습니다. |
| 실제 변경 file/symbol/call path | work-map 분류를 product/archive/reliability로 정리하고 각 shared section의 실제 설명과 contact title을 채웁니다. |
| Data/state/resource owner와 lifetime | 공용 cross-design narrative는 shared node가 소유합니다. |
| Failure·absence·fallback 처리 | count 값 계산과 card ID 참조 무결성은 selector/schema/loader가 별도로 책임집니다. |
| 보장하는 것과 보장하지 않는 것 | 공용 문구 일관성을 제공하지만 계산 결과를 보장하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | `61d1976cde0d`부터 다섯 design의 projects route copy가 완성됩니다. |

#### 코드·실행 증거

정적 근거: `8886459d1b0d`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 11. `61d1976cde0d` — feat(content): 프로젝트 목록 표현 콘텐츠 구성

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** 다섯 design projects route copy
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `presentation.json.pages.projects`의 groups와 editorial/brutalist/cinematic nodes를 확인합니다.
- 초기 Design/Classic placeholder가 실제 archive copy로 교체되는지 확인합니다.

확인 원칙:

- 먼저 `61d1976cde0d^`와 `61d1976cde0d`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | projects route는 초기 두 design placeholder만 갖고 추가 design 표현 계약이 비어 있었습니다. |
| 실제 변경 file/symbol/call path | group copy와 다섯 design의 hero/archive vocabulary를 실제 콘텐츠로 구성합니다. |
| Data/state/resource owner와 lifetime | projects route의 design-specific copy는 presentation source가 소유합니다. |
| Failure·absence·fallback 처리 | group/project 실제 데이터 결합과 route rendering은 별도 selector/view-model 책임입니다. |
| 보장하는 것과 보장하지 않는 것 | 모든 design이 projects route에 필요한 copy를 얻습니다. |
| 다음 commit 또는 관련 test 연결 | `a6c72a6b3b34`가 project detail copy를 확장합니다. |

#### 코드·실행 증거

정적 근거: `61d1976cde0d`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 12. `a6c72a6b3b34` — feat(content): 프로젝트 상세 표현 콘텐츠 구성

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** project detail copy 완성
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `pages.projectDetail`의 missing/facts/outro/frame/editorial/sections를 확인합니다.
- highlights section과 기존 section label의 최종 집합을 확인합니다.

확인 원칙:

- 먼저 `a6c72a6b3b34^`와 `a6c72a6b3b34`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | project detail에는 기본 heading만 있고 missing state, facts, outro, design-specific label이 불완전했습니다. |
| 실제 변경 file/symbol/call path | 없는 프로젝트 fallback과 상세 facts/outro/frame, highlights 포함 section vocabulary를 채웁니다. |
| Data/state/resource owner와 lifetime | 상세 상태 문구는 presentation source가, project 존재 판단은 route/view-model이 소유합니다. |
| Failure·absence·fallback 처리 | 문구는 missing state를 표현하지만 404 status나 route generation behavior는 보장하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | project detail renderer가 사용할 완전한 copy contract를 제공합니다. |
| 다음 commit 또는 관련 test 연결 | `20dfc298375c`이 About/Journey route 구조를 완성합니다. |

#### 코드·실행 증거

정적 근거: `a6c72a6b3b34`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 13. `20dfc298375c` — feat(content): About과 Journey 표현 콘텐츠 구성

- **Importance:** B
- **Tags:** CONTENT, RENDERER
- **Thread 역할:** About/Journey narrative 계약
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `pages.about.curation`과 `pages.journey` hero/narrative/timeline/now를 확인합니다.
- state/reason/result labels와 anchor label을 확인합니다.

확인 원칙:

- 먼저 `20dfc298375c^`와 `20dfc298375c`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | About curation과 Journey narrative가 독립 source를 표시할 route copy 계약이 부족했습니다. |
| 실제 변경 file/symbol/call path | curation 설명/section label과 Journey의 현재 상태·이유·결과·timeline/current-position vocabulary를 추가합니다. |
| Data/state/resource owner와 lifetime | route copy는 presentation source가, 실제 milestone/project resolution은 domain/view-model이 소유합니다. |
| Failure·absence·fallback 처리 | 참조 project 존재성과 timeline chronology는 이 JSON 변경이 검증하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | About/Journey route가 source-driven section structure를 갖습니다. |
| 다음 commit 또는 관련 test 연결 | `13c8c52c54d9`가 Resume/Interview Map을 완성합니다. |

#### 코드·실행 증거

정적 근거: `20dfc298375c`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 14. `13c8c52c54d9` — feat(content): Interview Map과 Resume 표현 콘텐츠 구성

- **Importance:** B
- **Tags:** CONTENT, RENDERER
- **Thread 역할:** Resume/Interview Map 계약 완성
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `pages.resume`의 experience/education/notes/identity/editorial/brutalist를 확인합니다.
- `pages.interviewMap`의 hero/tracks/gaps label과 empty label을 확인합니다.

확인 원칙:

- 먼저 `13c8c52c54d9^`와 `13c8c52c54d9`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Resume는 기본 summary/projects/training만, Interview Map은 route-level presentation copy가 없었습니다. |
| 실제 변경 file/symbol/call path | Resume의 identity·experience·education·notes와 design-specific eyebrow, Interview Map의 evidence index/empty/gaps vocabulary를 추가합니다. |
| Data/state/resource owner와 lifetime | 문서 구조와 label은 presentation source가 소유하고 실제 project evidence mapping은 domain content가 소유합니다. |
| Failure·absence·fallback 처리 | download asset 존재성이나 answer project 참조는 이 commit이 검증하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | 두 route의 presentation contract를 완성합니다. |
| 다음 commit 또는 관련 test 연결 | `a7a2000ff462`가 Contact/Journey/Interview Map의 최종 문서 순서와 copy를 다듬습니다. |

#### 코드·실행 증거

정적 근거: `13c8c52c54d9`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

### 15. `a7a2000ff462` — feat(content): Contact 표현 콘텐츠와 최종 문서 형식 구성

- **Importance:** B
- **Tags:** CONTENT, RENDERER
- **Thread 역할:** 문서형 route 최종 구성
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `presentation.json`의 Contact copy와 Journey/Interview Map grouping/reordering diff를 확인합니다.
- 삭제·재배치된 field가 단순 copy 수정인지 contract shape 변경인지 구분합니다.

확인 원칙:

- 먼저 `a7a2000ff462^`와 `a7a2000ff462`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | 문서형 route의 copy는 존재했지만 Contact와 evidence-oriented 화면의 읽기 순서가 최종 정보 구조와 맞지 않았습니다. |
| 실제 변경 file/symbol/call path | Contact 문구를 완성하고 Journey/Interview Map nodes를 renderer가 소비할 최종 문서 순서로 재구성합니다. |
| Data/state/resource owner와 lifetime | presentation source가 route의 문서 계층을 소유합니다. |
| Failure·absence·fallback 처리 | 실제 DOM heading hierarchy, responsive layout, accessibility behavior는 renderer/test 책임입니다. |
| 보장하는 것과 보장하지 않는 것 | 다중 route presentation source의 최종 shape를 제공합니다. |
| 다음 commit 또는 관련 test 연결 | T6가 같은 shape를 runtime schema로 제한하고 후속 renderer/view-model tests가 소비 경로를 보호합니다. |

#### 코드·실행 증거

정적 근거: `a7a2000ff462`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

## 6. Invariant evolution ledger

| 추적할 invariant | 도입·변화 SHA | 실제 owner/evidence | 제한·후속 보호 |
| --- | --- | --- | --- |
| 표시 문구와 section order는 JSON source가 소유한다. | `7f5017b21d37` → `a7a2000ff462` | `src/content/presentation.json` | renderer는 구조·스타일·interaction을 유지 |
| 공용 UI/empty/ARIA vocabulary는 한 node에서 공유한다. | `96c8ba5733f5` | `presentation.ui` | semantic behavior 자체는 별도 검증 |
| 다섯 design과 핵심 routes가 명시적 copy 계약을 가진다. | `2b9b35d4b8de` → `13c8c52c54d9` | `home.*`, `pages.*` | runtime validity는 T6가 인수 |

## 7. Failure → Fix → Test 관계

| Failure 또는 risk | Fix/전환 SHA | 교정된 결정 | Regression·검증 관계 |
| --- | --- | --- | --- |
| 문구·순서가 renderer마다 하드코딩될 위험 | `7f5017b21d37` 이후 | presentation source와 type으로 이동 | 후속 route/view-model tests가 source consumption을 검증 |
| placeholder/빈 section이 정상 콘텐츠처럼 노출될 위험 | `9a7d41edfad0`, `8886459d1b0d`, route copy commits | 실제 section order와 body로 교체 | visual/content completeness 자체는 자동 증명하지 않음 |
| 추가 design/route가 계약 밖 field를 요구할 위험 | `2b9b35d4b8de`와 route 확장 | design/page별 node 추가 | T6 runtime schema가 known fields를 검사 |

## 8. Ownership·state·responsibility 변화

| 대상 | 이전 owner/state | 최종 owner/state | 근거 |
| --- | --- | --- | --- |
| 표시 source | component literal | `presentation.json` | home/pages/ui nodes |
| section order | renderer 고정 | design별 arrays | `home.<design>.sections` |
| 공용 label | 여러 component | `presentation.ui`, `home.shared` | ARIA/empty/work-map copy |
| 실제 data resolution | 혼재 가능 | presentation 밖 selector/view-model | T4·후속 view-model Thread |

## 9. Thread 최종 상태

Thread 종료 시점에는 다섯 design과 Projects, Project Detail, About, Resume, Contact, Journey, Interview Map이 presentation source의 명시적 copy/section 계약을 공유합니다. JSON은 무엇을 말하고 어떤 순서로 보여 줄지를 소유하지만 실제 data resolution, DOM semantics, runtime schema와 visual behavior는 별도 계층이 책임집니다.

### 최종 설명

- Design/Classic home에서 시작해 공용 section과 다섯 design-specific 계약으로 확장했습니다.
- Projects와 문서형 routes의 placeholder를 실제 copy와 section order로 교체했습니다.
- ARIA/empty/count-key vocabulary를 공용 source로 이동했습니다.
- 이 Thread는 presentation 데이터의 의미를 다루며 runtime parsing과 renderer 동작을 직접 보장하지 않습니다.

## 10. 최종 실행·데이터 흐름

| 단계 | Owner/call path | 입력·출력 | Failure/non-guarantee |
| --- | --- | --- | --- |
| route가 active design과 page copy key를 선택합니다. | `presentation.defaultHomeTemplate`, `templates`, `pages` | design/page node | 없는 key는 당시 type assertion 단계에서 runtime 거부 없음 |
| presentation copy를 읽습니다. | `presentation.json` | section order, labels, templates | placeholder 여부는 자동 판별하지 않음 |
| domain/view model 값과 결합합니다. | T4 selectors 및 route view models | count/project/evidence와 copy | unknown references는 T9 loader가 후속 차단 |
| design renderer가 구조와 스타일을 적용합니다. | 각 design route renderer | DOM/UI | visual/ARIA behavior는 category 05/07 검증 |

## 11. 학습 완료 확인

완료했습니다. 모든 commit은 exact SHA의 parent diff/resulting tree를 기준으로 기록했고, direct execution evidence와 static inspection을 구분했습니다. `3353032ba23b`은 다섯 design과 presentation validation을, `b77b386b344e`·`527b9f872333`은 route별 view-model/scoped payload를 후속 검증합니다. 이번 작업에서 테스트는 실행하지 않았습니다.
