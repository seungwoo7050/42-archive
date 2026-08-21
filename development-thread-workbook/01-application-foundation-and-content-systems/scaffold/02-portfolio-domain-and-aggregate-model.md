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
| 직전 상태와 부족함 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c1.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c1.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c1.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c1.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c1.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c1.next --> |

#### 코드·실행 증거

<!-- learner:02-portfolio-domain-and-aggregate-model.md:c1.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c2.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c2.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c2.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c2.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c2.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c2.next --> |

#### 코드·실행 증거

<!-- learner:02-portfolio-domain-and-aggregate-model.md:c2.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c3.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c3.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c3.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c3.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c3.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c3.next --> |

#### 코드·실행 증거

<!-- learner:02-portfolio-domain-and-aggregate-model.md:c3.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c4.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c4.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c4.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c4.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c4.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c4.next --> |

#### 코드·실행 증거

<!-- learner:02-portfolio-domain-and-aggregate-model.md:c4.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c5.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c5.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c5.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c5.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c5.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c5.next --> |

#### 코드·실행 증거

<!-- learner:02-portfolio-domain-and-aggregate-model.md:c5.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c6.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c6.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c6.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c6.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c6.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c6.next --> |

#### 코드·실행 증거

<!-- learner:02-portfolio-domain-and-aggregate-model.md:c6.evidence -->

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
| 직전 상태와 부족함 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c7.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c7.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c7.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c7.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c7.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:c7.next --> |

#### 코드·실행 증거

<!-- learner:02-portfolio-domain-and-aggregate-model.md:c7.evidence -->

## 6. Invariant evolution ledger

| 추적할 invariant | 도입·변화 SHA | 실제 owner/evidence | 제한·후속 보호 |
| --- | --- | --- | --- |
| JSON source와 renderer aggregate를 분리한다. | <!-- learner:02-portfolio-domain-and-aggregate-model.md:ledger1.sha --> | <!-- learner:02-portfolio-domain-and-aggregate-model.md:ledger1.evidence --> | <!-- learner:02-portfolio-domain-and-aggregate-model.md:ledger1.limitation --> |
| journey order와 lookup/filter 정책은 aggregate module이 소유한다. | <!-- learner:02-portfolio-domain-and-aggregate-model.md:ledger2.sha --> | <!-- learner:02-portfolio-domain-and-aggregate-model.md:ledger2.evidence --> | <!-- learner:02-portfolio-domain-and-aggregate-model.md:ledger2.limitation --> |
| disabled project/link와 env href를 호출 전에 해석한다. | <!-- learner:02-portfolio-domain-and-aggregate-model.md:ledger3.sha --> | <!-- learner:02-portfolio-domain-and-aggregate-model.md:ledger3.evidence --> | <!-- learner:02-portfolio-domain-and-aggregate-model.md:ledger3.limitation --> |

## 7. Failure → Fix → Test 관계

| Failure 또는 risk | Fix/전환 SHA | 교정된 결정 | Regression·검증 관계 |
| --- | --- | --- | --- |
| 각 component가 JSON을 직접 import할 위험 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:failure1.sha --> | <!-- learner:02-portfolio-domain-and-aggregate-model.md:failure1.correction --> | <!-- learner:02-portfolio-domain-and-aggregate-model.md:failure1.test --> |
| journey 순서와 tech lookup이 consumer마다 달라질 위험 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:failure2.sha --> | <!-- learner:02-portfolio-domain-and-aggregate-model.md:failure2.correction --> | <!-- learner:02-portfolio-domain-and-aggregate-model.md:failure2.test --> |
| disabled/env link가 그대로 노출될 위험 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:failure3.sha --> | <!-- learner:02-portfolio-domain-and-aggregate-model.md:failure3.correction --> | <!-- learner:02-portfolio-domain-and-aggregate-model.md:failure3.test --> |

## 8. Ownership·state·responsibility 변화

| 대상 | 이전 owner/state | 최종 owner/state | 근거 |
| --- | --- | --- | --- |
| 원본 값 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:owner1.before --> | <!-- learner:02-portfolio-domain-and-aggregate-model.md:owner1.after --> | <!-- learner:02-portfolio-domain-and-aggregate-model.md:owner1.evidence --> |
| aggregate shape | <!-- learner:02-portfolio-domain-and-aggregate-model.md:owner2.before --> | <!-- learner:02-portfolio-domain-and-aggregate-model.md:owner2.after --> | <!-- learner:02-portfolio-domain-and-aggregate-model.md:owner2.evidence --> |
| 파생 정렬/index/filter | <!-- learner:02-portfolio-domain-and-aggregate-model.md:owner3.before --> | <!-- learner:02-portfolio-domain-and-aggregate-model.md:owner3.after --> | <!-- learner:02-portfolio-domain-and-aggregate-model.md:owner3.evidence --> |
| runtime 신뢰 | <!-- learner:02-portfolio-domain-and-aggregate-model.md:owner4.before --> | <!-- learner:02-portfolio-domain-and-aggregate-model.md:owner4.after --> | <!-- learner:02-portfolio-domain-and-aggregate-model.md:owner4.evidence --> |

## 9. Thread 최종 상태

<!-- learner:02-portfolio-domain-and-aggregate-model.md:final.state -->

### 최종 설명

<!-- learner:02-portfolio-domain-and-aggregate-model.md:final.explanation -->

## 10. 최종 실행·데이터 흐름

| 단계 | Owner/call path | 입력·출력 | Failure/non-guarantee |
| --- | --- | --- | --- |
| JSON modules를 import합니다. | <!-- learner:02-portfolio-domain-and-aggregate-model.md:flow1.owner --> | <!-- learner:02-portfolio-domain-and-aggregate-model.md:flow1.io --> | <!-- learner:02-portfolio-domain-and-aggregate-model.md:flow1.failure --> |
| 파생 collection을 준비합니다. | <!-- learner:02-portfolio-domain-and-aggregate-model.md:flow2.owner --> | <!-- learner:02-portfolio-domain-and-aggregate-model.md:flow2.io --> | <!-- learner:02-portfolio-domain-and-aggregate-model.md:flow2.failure --> |
| 환경 링크와 project 활성화를 해석합니다. | <!-- learner:02-portfolio-domain-and-aggregate-model.md:flow3.owner --> | <!-- learner:02-portfolio-domain-and-aggregate-model.md:flow3.io --> | <!-- learner:02-portfolio-domain-and-aggregate-model.md:flow3.failure --> |
| aggregate를 route에 반환합니다. | <!-- learner:02-portfolio-domain-and-aggregate-model.md:flow4.owner --> | <!-- learner:02-portfolio-domain-and-aggregate-model.md:flow4.io --> | <!-- learner:02-portfolio-domain-and-aggregate-model.md:flow4.failure --> |

## 11. 학습 완료 확인

<!-- learner:02-portfolio-domain-and-aggregate-model.md:completion.check -->
