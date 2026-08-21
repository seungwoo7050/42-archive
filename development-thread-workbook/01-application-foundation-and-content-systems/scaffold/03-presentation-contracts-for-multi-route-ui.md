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
| 직전 상태와 부족함 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c1.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c1.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c1.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c1.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c1.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c1.next --> |

#### 코드·실행 증거

<!-- learner:03-presentation-contracts-for-multi-route-ui.md:c1.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c2.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c2.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c2.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c2.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c2.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c2.next --> |

#### 코드·실행 증거

<!-- learner:03-presentation-contracts-for-multi-route-ui.md:c2.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c3.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c3.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c3.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c3.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c3.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c3.next --> |

#### 코드·실행 증거

<!-- learner:03-presentation-contracts-for-multi-route-ui.md:c3.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c4.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c4.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c4.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c4.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c4.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c4.next --> |

#### 코드·실행 증거

<!-- learner:03-presentation-contracts-for-multi-route-ui.md:c4.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c5.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c5.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c5.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c5.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c5.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c5.next --> |

#### 코드·실행 증거

<!-- learner:03-presentation-contracts-for-multi-route-ui.md:c5.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c6.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c6.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c6.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c6.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c6.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c6.next --> |

#### 코드·실행 증거

<!-- learner:03-presentation-contracts-for-multi-route-ui.md:c6.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c7.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c7.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c7.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c7.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c7.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c7.next --> |

#### 코드·실행 증거

<!-- learner:03-presentation-contracts-for-multi-route-ui.md:c7.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c8.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c8.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c8.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c8.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c8.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c8.next --> |

#### 코드·실행 증거

<!-- learner:03-presentation-contracts-for-multi-route-ui.md:c8.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c9.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c9.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c9.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c9.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c9.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c9.next --> |

#### 코드·실행 증거

<!-- learner:03-presentation-contracts-for-multi-route-ui.md:c9.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c10.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c10.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c10.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c10.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c10.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c10.next --> |

#### 코드·실행 증거

<!-- learner:03-presentation-contracts-for-multi-route-ui.md:c10.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c11.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c11.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c11.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c11.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c11.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c11.next --> |

#### 코드·실행 증거

<!-- learner:03-presentation-contracts-for-multi-route-ui.md:c11.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c12.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c12.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c12.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c12.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c12.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c12.next --> |

#### 코드·실행 증거

<!-- learner:03-presentation-contracts-for-multi-route-ui.md:c12.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c13.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c13.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c13.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c13.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c13.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c13.next --> |

#### 코드·실행 증거

<!-- learner:03-presentation-contracts-for-multi-route-ui.md:c13.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c14.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c14.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c14.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c14.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c14.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c14.next --> |

#### 코드·실행 증거

<!-- learner:03-presentation-contracts-for-multi-route-ui.md:c14.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c15.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c15.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c15.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c15.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c15.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:c15.next --> |

#### 코드·실행 증거

<!-- learner:03-presentation-contracts-for-multi-route-ui.md:c15.evidence -->

## 6. Invariant evolution ledger

| 추적할 invariant | 도입·변화 SHA | 실제 owner/evidence | 제한·후속 보호 |
| --- | --- | --- | --- |
| 표시 문구와 section order는 JSON source가 소유한다. | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:ledger1.sha --> | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:ledger1.evidence --> | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:ledger1.limitation --> |
| 공용 UI/empty/ARIA vocabulary는 한 node에서 공유한다. | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:ledger2.sha --> | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:ledger2.evidence --> | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:ledger2.limitation --> |
| 다섯 design과 핵심 routes가 명시적 copy 계약을 가진다. | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:ledger3.sha --> | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:ledger3.evidence --> | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:ledger3.limitation --> |

## 7. Failure → Fix → Test 관계

| Failure 또는 risk | Fix/전환 SHA | 교정된 결정 | Regression·검증 관계 |
| --- | --- | --- | --- |
| 문구·순서가 renderer마다 하드코딩될 위험 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:failure1.sha --> | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:failure1.correction --> | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:failure1.test --> |
| placeholder/빈 section이 정상 콘텐츠처럼 노출될 위험 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:failure2.sha --> | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:failure2.correction --> | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:failure2.test --> |
| 추가 design/route가 계약 밖 field를 요구할 위험 | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:failure3.sha --> | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:failure3.correction --> | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:failure3.test --> |

## 8. Ownership·state·responsibility 변화

| 대상 | 이전 owner/state | 최종 owner/state | 근거 |
| --- | --- | --- | --- |
| 표시 source | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:owner1.before --> | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:owner1.after --> | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:owner1.evidence --> |
| section order | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:owner2.before --> | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:owner2.after --> | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:owner2.evidence --> |
| 공용 label | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:owner3.before --> | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:owner3.after --> | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:owner3.evidence --> |
| 실제 data resolution | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:owner4.before --> | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:owner4.after --> | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:owner4.evidence --> |

## 9. Thread 최종 상태

<!-- learner:03-presentation-contracts-for-multi-route-ui.md:final.state -->

### 최종 설명

<!-- learner:03-presentation-contracts-for-multi-route-ui.md:final.explanation -->

## 10. 최종 실행·데이터 흐름

| 단계 | Owner/call path | 입력·출력 | Failure/non-guarantee |
| --- | --- | --- | --- |
| route가 active design과 page copy key를 선택합니다. | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:flow1.owner --> | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:flow1.io --> | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:flow1.failure --> |
| presentation copy를 읽습니다. | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:flow2.owner --> | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:flow2.io --> | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:flow2.failure --> |
| domain/view model 값과 결합합니다. | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:flow3.owner --> | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:flow3.io --> | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:flow3.failure --> |
| design renderer가 구조와 스타일을 적용합니다. | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:flow4.owner --> | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:flow4.io --> | <!-- learner:03-presentation-contracts-for-multi-route-ui.md:flow4.failure --> |

## 11. 학습 완료 확인

<!-- learner:03-presentation-contracts-for-multi-route-ui.md:completion.check -->
