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
| 직전 상태와 부족함 | <!-- learner:06-runtime-presentation-schema-contracts.md:c1.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:06-runtime-presentation-schema-contracts.md:c1.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:06-runtime-presentation-schema-contracts.md:c1.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:06-runtime-presentation-schema-contracts.md:c1.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:06-runtime-presentation-schema-contracts.md:c1.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:06-runtime-presentation-schema-contracts.md:c1.next --> |

#### 코드·실행 증거

<!-- learner:06-runtime-presentation-schema-contracts.md:c1.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:06-runtime-presentation-schema-contracts.md:c2.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:06-runtime-presentation-schema-contracts.md:c2.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:06-runtime-presentation-schema-contracts.md:c2.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:06-runtime-presentation-schema-contracts.md:c2.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:06-runtime-presentation-schema-contracts.md:c2.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:06-runtime-presentation-schema-contracts.md:c2.next --> |

#### 코드·실행 증거

<!-- learner:06-runtime-presentation-schema-contracts.md:c2.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:06-runtime-presentation-schema-contracts.md:c3.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:06-runtime-presentation-schema-contracts.md:c3.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:06-runtime-presentation-schema-contracts.md:c3.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:06-runtime-presentation-schema-contracts.md:c3.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:06-runtime-presentation-schema-contracts.md:c3.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:06-runtime-presentation-schema-contracts.md:c3.next --> |

#### 코드·실행 증거

<!-- learner:06-runtime-presentation-schema-contracts.md:c3.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:06-runtime-presentation-schema-contracts.md:c4.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:06-runtime-presentation-schema-contracts.md:c4.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:06-runtime-presentation-schema-contracts.md:c4.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:06-runtime-presentation-schema-contracts.md:c4.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:06-runtime-presentation-schema-contracts.md:c4.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:06-runtime-presentation-schema-contracts.md:c4.next --> |

#### 코드·실행 증거

<!-- learner:06-runtime-presentation-schema-contracts.md:c4.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:06-runtime-presentation-schema-contracts.md:c5.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:06-runtime-presentation-schema-contracts.md:c5.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:06-runtime-presentation-schema-contracts.md:c5.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:06-runtime-presentation-schema-contracts.md:c5.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:06-runtime-presentation-schema-contracts.md:c5.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:06-runtime-presentation-schema-contracts.md:c5.next --> |

#### 코드·실행 증거

<!-- learner:06-runtime-presentation-schema-contracts.md:c5.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:06-runtime-presentation-schema-contracts.md:c6.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:06-runtime-presentation-schema-contracts.md:c6.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:06-runtime-presentation-schema-contracts.md:c6.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:06-runtime-presentation-schema-contracts.md:c6.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:06-runtime-presentation-schema-contracts.md:c6.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:06-runtime-presentation-schema-contracts.md:c6.next --> |

#### 코드·실행 증거

<!-- learner:06-runtime-presentation-schema-contracts.md:c6.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:06-runtime-presentation-schema-contracts.md:c7.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:06-runtime-presentation-schema-contracts.md:c7.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:06-runtime-presentation-schema-contracts.md:c7.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:06-runtime-presentation-schema-contracts.md:c7.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:06-runtime-presentation-schema-contracts.md:c7.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:06-runtime-presentation-schema-contracts.md:c7.next --> |

#### 코드·실행 증거

<!-- learner:06-runtime-presentation-schema-contracts.md:c7.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:06-runtime-presentation-schema-contracts.md:c8.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:06-runtime-presentation-schema-contracts.md:c8.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:06-runtime-presentation-schema-contracts.md:c8.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:06-runtime-presentation-schema-contracts.md:c8.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:06-runtime-presentation-schema-contracts.md:c8.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:06-runtime-presentation-schema-contracts.md:c8.next --> |

#### 코드·실행 증거

<!-- learner:06-runtime-presentation-schema-contracts.md:c8.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:06-runtime-presentation-schema-contracts.md:c9.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:06-runtime-presentation-schema-contracts.md:c9.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:06-runtime-presentation-schema-contracts.md:c9.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:06-runtime-presentation-schema-contracts.md:c9.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:06-runtime-presentation-schema-contracts.md:c9.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:06-runtime-presentation-schema-contracts.md:c9.next --> |

#### 코드·실행 증거

<!-- learner:06-runtime-presentation-schema-contracts.md:c9.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:06-runtime-presentation-schema-contracts.md:c10.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:06-runtime-presentation-schema-contracts.md:c10.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:06-runtime-presentation-schema-contracts.md:c10.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:06-runtime-presentation-schema-contracts.md:c10.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:06-runtime-presentation-schema-contracts.md:c10.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:06-runtime-presentation-schema-contracts.md:c10.next --> |

#### 코드·실행 증거

<!-- learner:06-runtime-presentation-schema-contracts.md:c10.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:06-runtime-presentation-schema-contracts.md:c11.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:06-runtime-presentation-schema-contracts.md:c11.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:06-runtime-presentation-schema-contracts.md:c11.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:06-runtime-presentation-schema-contracts.md:c11.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:06-runtime-presentation-schema-contracts.md:c11.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:06-runtime-presentation-schema-contracts.md:c11.next --> |

#### 코드·실행 증거

<!-- learner:06-runtime-presentation-schema-contracts.md:c11.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:06-runtime-presentation-schema-contracts.md:c12.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:06-runtime-presentation-schema-contracts.md:c12.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:06-runtime-presentation-schema-contracts.md:c12.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:06-runtime-presentation-schema-contracts.md:c12.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:06-runtime-presentation-schema-contracts.md:c12.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:06-runtime-presentation-schema-contracts.md:c12.next --> |

#### 코드·실행 증거

<!-- learner:06-runtime-presentation-schema-contracts.md:c12.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:06-runtime-presentation-schema-contracts.md:c13.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:06-runtime-presentation-schema-contracts.md:c13.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:06-runtime-presentation-schema-contracts.md:c13.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:06-runtime-presentation-schema-contracts.md:c13.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:06-runtime-presentation-schema-contracts.md:c13.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:06-runtime-presentation-schema-contracts.md:c13.next --> |

#### 코드·실행 증거

<!-- learner:06-runtime-presentation-schema-contracts.md:c13.evidence -->

## 6. Invariant evolution ledger

| 추적할 invariant | 도입·변화 SHA | 실제 owner/evidence | 제한·후속 보호 |
| --- | --- | --- | --- |
| section/design/count key vocabulary는 enum으로 제한한다. | <!-- learner:06-runtime-presentation-schema-contracts.md:ledger1.sha --> | <!-- learner:06-runtime-presentation-schema-contracts.md:ledger1.evidence --> | <!-- learner:06-runtime-presentation-schema-contracts.md:ledger1.limitation --> |
| section order는 최소 한 개이며 중복될 수 없다. | <!-- learner:06-runtime-presentation-schema-contracts.md:ledger2.sha --> | <!-- learner:06-runtime-presentation-schema-contracts.md:ledger2.evidence --> | <!-- learner:06-runtime-presentation-schema-contracts.md:ledger2.limitation --> |
| known nested fields는 주로 strict하게 검사한다. | <!-- learner:06-runtime-presentation-schema-contracts.md:ledger3.sha --> | <!-- learner:06-runtime-presentation-schema-contracts.md:ledger3.evidence --> | <!-- learner:06-runtime-presentation-schema-contracts.md:ledger3.limitation --> |
| presentation root는 확장 가능성을 유지한다. | <!-- learner:06-runtime-presentation-schema-contracts.md:ledger4.sha --> | <!-- learner:06-runtime-presentation-schema-contracts.md:ledger4.evidence --> | <!-- learner:06-runtime-presentation-schema-contracts.md:ledger4.limitation --> |

## 7. Failure → Fix → Test 관계

| Failure 또는 risk | Fix/전환 SHA | 교정된 결정 | Regression·검증 관계 |
| --- | --- | --- | --- |
| presentation JSON이 임의 section/count key를 수용 | <!-- learner:06-runtime-presentation-schema-contracts.md:failure1.sha --> | <!-- learner:06-runtime-presentation-schema-contracts.md:failure1.correction --> | <!-- learner:06-runtime-presentation-schema-contracts.md:failure1.test --> |
| route/design known field가 runtime 검증 밖에 있음 | <!-- learner:06-runtime-presentation-schema-contracts.md:failure2.sha --> | <!-- learner:06-runtime-presentation-schema-contracts.md:failure2.correction --> | <!-- learner:06-runtime-presentation-schema-contracts.md:failure2.test --> |
| strictness를 전체 문서에 과장할 위험 | <!-- learner:06-runtime-presentation-schema-contracts.md:failure3.sha --> | <!-- learner:06-runtime-presentation-schema-contracts.md:failure3.correction --> | <!-- learner:06-runtime-presentation-schema-contracts.md:failure3.test --> |

## 8. Ownership·state·responsibility 변화

| 대상 | 이전 owner/state | 최종 owner/state | 근거 |
| --- | --- | --- | --- |
| presentation ID vocabulary | <!-- learner:06-runtime-presentation-schema-contracts.md:owner1.before --> | <!-- learner:06-runtime-presentation-schema-contracts.md:owner1.after --> | <!-- learner:06-runtime-presentation-schema-contracts.md:owner1.evidence --> |
| design/route known fields | <!-- learner:06-runtime-presentation-schema-contracts.md:owner2.before --> | <!-- learner:06-runtime-presentation-schema-contracts.md:owner2.after --> | <!-- learner:06-runtime-presentation-schema-contracts.md:owner2.evidence --> |
| extension keys | <!-- learner:06-runtime-presentation-schema-contracts.md:owner3.before --> | <!-- learner:06-runtime-presentation-schema-contracts.md:owner3.after --> | <!-- learner:06-runtime-presentation-schema-contracts.md:owner3.evidence --> |
| cross-file design/reference integrity | <!-- learner:06-runtime-presentation-schema-contracts.md:owner4.before --> | <!-- learner:06-runtime-presentation-schema-contracts.md:owner4.after --> | <!-- learner:06-runtime-presentation-schema-contracts.md:owner4.evidence --> |

## 9. Thread 최종 상태

<!-- learner:06-runtime-presentation-schema-contracts.md:final.state -->

### 최종 설명

<!-- learner:06-runtime-presentation-schema-contracts.md:final.explanation -->

## 10. 최종 실행·데이터 흐름

| 단계 | Owner/call path | 입력·출력 | Failure/non-guarantee |
| --- | --- | --- | --- |
| presentation JSON을 입력합니다. | <!-- learner:06-runtime-presentation-schema-contracts.md:flow1.owner --> | <!-- learner:06-runtime-presentation-schema-contracts.md:flow1.io --> | <!-- learner:06-runtime-presentation-schema-contracts.md:flow1.failure --> |
| design/section IDs를 검사합니다. | <!-- learner:06-runtime-presentation-schema-contracts.md:flow2.owner --> | <!-- learner:06-runtime-presentation-schema-contracts.md:flow2.io --> | <!-- learner:06-runtime-presentation-schema-contracts.md:flow2.failure --> |
| known nested route/design fields를 검사합니다. | <!-- learner:06-runtime-presentation-schema-contracts.md:flow3.owner --> | <!-- learner:06-runtime-presentation-schema-contracts.md:flow3.io --> | <!-- learner:06-runtime-presentation-schema-contracts.md:flow3.failure --> |
| 후속 integrity 검사로 넘깁니다. | <!-- learner:06-runtime-presentation-schema-contracts.md:flow4.owner --> | <!-- learner:06-runtime-presentation-schema-contracts.md:flow4.io --> | <!-- learner:06-runtime-presentation-schema-contracts.md:flow4.failure --> |

## 11. 학습 완료 확인

<!-- learner:06-runtime-presentation-schema-contracts.md:completion.check -->
