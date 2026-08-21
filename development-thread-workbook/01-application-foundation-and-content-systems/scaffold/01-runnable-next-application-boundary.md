# Thread: Runnable Next application boundary

> Repository: `https://github.com/seungwoo7050/42-archive`  
> Branch: `web/portfolio`  
> Category: `01-application-foundation-and-content-systems`

## 0. 분류 출처와 변경 가능 범위

- Commit SHA, subject, importance, tags는 target branch의 `commit/commit-importance.md` 분류와 exact commit metadata를 사용합니다.
- 이 문서의 Thread grouping, 목표, 역할, 조사 지점은 Phase 1 category audit에서 repository evidence를 기준으로 확정했습니다.
- Phase 2에서는 이 fixed information을 바꾸지 않고 learner-facing 기록만 채웠습니다.
- 다른 branch나 final HEAD 구현을 과거 SHA 설명에 소급하지 않습니다.

## 1. Thread 목표

문서뿐인 저장소가 고정된 Next.js 애플리케이션, 전역 스타일 입력점, content aggregate를 소비하는 첫 route까지 갖추는 경계를 복원합니다.

### 계획된 핵심 invariant

- 실행 경계는 package script, TypeScript/Next/PostCSS 설정, App Router root로 명시됩니다.
- 전역 스타일은 하나의 `globals.css`와 root layout import를 통해 적용됩니다.
- 첫 route는 JSON을 직접 조립하지 않고 portfolio aggregate를 호출합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 문서용 저장소와 실행 가능한 애플리케이션의 경계는 어느 commit에서 생기는가?
- `globals.css`가 추가된 시점과 실제 import된 시점을 구분하면 무엇이 보이는가?
- 초기 route가 content와 renderer 사이에서 맡은 책임과 아직 맡지 않은 책임은 무엇인가?

## 3. 완료 기준

- 각 SHA의 parent diff와 resulting tree에서 실제 file/symbol을 확인합니다.
- 이전 상태, implementation decision, owner/lifetime, absence/failure/fallback, guarantee/non-guarantee를 분리합니다.
- Fix·refactor·integration은 바로 앞의 assumption이나 duplicated responsibility와 연결합니다.
- 테스트나 command는 실제 실행 여부를 정적 검토와 명확히 구분합니다.
- Thread 종료 시 invariant evolution과 최종 flow를 코드 없이 설명합니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | 이 Thread에서의 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `cce7dd020563` | docs(portfolio): 프로젝트 목적과 초기 규약 정의 | C | CONTENT | 문서 기반 초기 상태 |
| 2 | `448bc2510f34` | build(next): 실행 가능한 애플리케이션 골격 구성 | A | DEPLOY | 실행 가능한 애플리케이션 기반 |
| 3 | `0a28cb050bc8` | style(theme): 포트폴리오 기본 디자인 토큰 추가 | B | RENDERER | 전역 스타일 vocabulary 도입 |
| 4 | `03c4e1f7b439` | feat(app): 콘텐츠 기반 디자인 홈 연결 | B | CONTENT | 첫 content-to-renderer 통합 |

## 5. Commit별 학습 기록

### 1. `cce7dd020563` — docs(portfolio): 프로젝트 목적과 초기 규약 정의

- **Importance:** C
- **Tags:** CONTENT
- **Thread 역할:** 문서 기반 초기 상태
- **조사 깊이:** Thread의 출발점을 이해하는 데 필요한 context와 후속 제약만 기록합니다.

#### 해당 SHA에서 확인할 실제 코드

- `README.md`의 목적, 콘텐츠 편집 위치, 코드/콘텐츠 분리 규칙을 확인합니다.
- 이 tree에 `package.json`, `src/app`, 실행 script가 없는지 확인합니다.

확인 원칙:

- 먼저 `cce7dd020563^`와 `cce7dd020563`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:01-runnable-next-application-boundary.md:c1.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:01-runnable-next-application-boundary.md:c1.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:01-runnable-next-application-boundary.md:c1.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:01-runnable-next-application-boundary.md:c1.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:01-runnable-next-application-boundary.md:c1.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:01-runnable-next-application-boundary.md:c1.next --> |

#### 코드·실행 증거

<!-- learner:01-runnable-next-application-boundary.md:c1.evidence -->

### 2. `448bc2510f34` — build(next): 실행 가능한 애플리케이션 골격 구성

- **Importance:** A
- **Tags:** DEPLOY
- **Thread 역할:** 실행 가능한 애플리케이션 기반
- **조사 깊이:** 주요 subsystem의 결정 경로, owner, failure/non-guarantee와 integration evidence를 구체적으로 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `package.json`의 `dev`, `build`, `start`, `lint`, `typecheck` script와 Next/React version을 확인합니다.
- `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`의 compiler/build 경계를 확인합니다.
- `src/app/layout.tsx`와 `src/app/page.tsx`가 제공하는 최소 App Router tree를 확인합니다.

확인 원칙:

- 먼저 `448bc2510f34^`와 `448bc2510f34`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:01-runnable-next-application-boundary.md:c2.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:01-runnable-next-application-boundary.md:c2.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:01-runnable-next-application-boundary.md:c2.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:01-runnable-next-application-boundary.md:c2.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:01-runnable-next-application-boundary.md:c2.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:01-runnable-next-application-boundary.md:c2.next --> |

#### 코드·실행 증거

<!-- learner:01-runnable-next-application-boundary.md:c2.evidence -->

### 3. `0a28cb050bc8` — style(theme): 포트폴리오 기본 디자인 토큰 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** 전역 스타일 vocabulary 도입
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `src/app/globals.css`의 Tailwind import, `:root` token, `@theme inline`, body/anchor/selection 규칙을 확인합니다.
- 이 SHA에서 root layout이 파일을 import하는지와 아직 미연결인지 구분합니다.

확인 원칙:

- 먼저 `0a28cb050bc8^`와 `0a28cb050bc8`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:01-runnable-next-application-boundary.md:c3.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:01-runnable-next-application-boundary.md:c3.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:01-runnable-next-application-boundary.md:c3.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:01-runnable-next-application-boundary.md:c3.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:01-runnable-next-application-boundary.md:c3.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:01-runnable-next-application-boundary.md:c3.next --> |

#### 코드·실행 증거

<!-- learner:01-runnable-next-application-boundary.md:c3.evidence -->

### 4. `03c4e1f7b439` — feat(app): 콘텐츠 기반 디자인 홈 연결

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** 첫 content-to-renderer 통합
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `src/app/layout.tsx`의 Geist font, `site.json`, `globals.css` import와 metadata/lang 설정을 확인합니다.
- `src/app/page.tsx`의 `getPortfolioContent()` → `DesignHomeRoute` 호출과 전달 props를 확인합니다.
- `contentDebug={false}`와 단일 Design renderer라는 초기 제한을 기록합니다.

확인 원칙:

- 먼저 `03c4e1f7b439^`와 `03c4e1f7b439`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:01-runnable-next-application-boundary.md:c4.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:01-runnable-next-application-boundary.md:c4.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:01-runnable-next-application-boundary.md:c4.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:01-runnable-next-application-boundary.md:c4.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:01-runnable-next-application-boundary.md:c4.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:01-runnable-next-application-boundary.md:c4.next --> |

#### 코드·실행 증거

<!-- learner:01-runnable-next-application-boundary.md:c4.evidence -->

## 6. Invariant evolution ledger

| 추적할 invariant | 도입·변화 SHA | 실제 owner/evidence | 제한·후속 보호 |
| --- | --- | --- | --- |
| 실행 command와 App Router root가 존재한다. | <!-- learner:01-runnable-next-application-boundary.md:ledger1.sha --> | <!-- learner:01-runnable-next-application-boundary.md:ledger1.evidence --> | <!-- learner:01-runnable-next-application-boundary.md:ledger1.limitation --> |
| 전역 token은 root stylesheet에서 정의되고 layout이 import한다. | <!-- learner:01-runnable-next-application-boundary.md:ledger2.sha --> | <!-- learner:01-runnable-next-application-boundary.md:ledger2.evidence --> | <!-- learner:01-runnable-next-application-boundary.md:ledger2.limitation --> |
| 첫 route는 portfolio aggregate를 renderer에 전달한다. | <!-- learner:01-runnable-next-application-boundary.md:ledger3.sha --> | <!-- learner:01-runnable-next-application-boundary.md:ledger3.evidence --> | <!-- learner:01-runnable-next-application-boundary.md:ledger3.limitation --> |

## 7. Failure → Fix → Test 관계

| Failure 또는 risk | Fix/전환 SHA | 교정된 결정 | Regression·검증 관계 |
| --- | --- | --- | --- |
| 문서만 있고 실행 경계가 없음 | <!-- learner:01-runnable-next-application-boundary.md:failure1.sha --> | <!-- learner:01-runnable-next-application-boundary.md:failure1.correction --> | <!-- learner:01-runnable-next-application-boundary.md:failure1.test --> |
| stylesheet가 존재하지만 소비되지 않을 수 있음 | <!-- learner:01-runnable-next-application-boundary.md:failure2.sha --> | <!-- learner:01-runnable-next-application-boundary.md:failure2.correction --> | <!-- learner:01-runnable-next-application-boundary.md:failure2.test --> |
| route가 source를 직접 조립할 위험 | <!-- learner:01-runnable-next-application-boundary.md:failure3.sha --> | <!-- learner:01-runnable-next-application-boundary.md:failure3.correction --> | <!-- learner:01-runnable-next-application-boundary.md:failure3.test --> |

## 8. Ownership·state·responsibility 변화

| 대상 | 이전 owner/state | 최종 owner/state | 근거 |
| --- | --- | --- | --- |
| 실행 lifecycle | <!-- learner:01-runnable-next-application-boundary.md:owner1.before --> | <!-- learner:01-runnable-next-application-boundary.md:owner1.after --> | <!-- learner:01-runnable-next-application-boundary.md:owner1.evidence --> |
| document shell | <!-- learner:01-runnable-next-application-boundary.md:owner2.before --> | <!-- learner:01-runnable-next-application-boundary.md:owner2.after --> | <!-- learner:01-runnable-next-application-boundary.md:owner2.evidence --> |
| content 조립 | <!-- learner:01-runnable-next-application-boundary.md:owner3.before --> | <!-- learner:01-runnable-next-application-boundary.md:owner3.after --> | <!-- learner:01-runnable-next-application-boundary.md:owner3.evidence --> |
| home 표현 | <!-- learner:01-runnable-next-application-boundary.md:owner4.before --> | <!-- learner:01-runnable-next-application-boundary.md:owner4.after --> | <!-- learner:01-runnable-next-application-boundary.md:owner4.evidence --> |

## 9. Thread 최종 상태

<!-- learner:01-runnable-next-application-boundary.md:final.state -->

### 최종 설명

<!-- learner:01-runnable-next-application-boundary.md:final.explanation -->

## 10. 최종 실행·데이터 흐름

| 단계 | Owner/call path | 입력·출력 | Failure/non-guarantee |
| --- | --- | --- | --- |
| 애플리케이션 lifecycle을 선택합니다. | <!-- learner:01-runnable-next-application-boundary.md:flow1.owner --> | <!-- learner:01-runnable-next-application-boundary.md:flow1.io --> | <!-- learner:01-runnable-next-application-boundary.md:flow1.failure --> |
| root document를 구성합니다. | <!-- learner:01-runnable-next-application-boundary.md:flow2.owner --> | <!-- learner:01-runnable-next-application-boundary.md:flow2.io --> | <!-- learner:01-runnable-next-application-boundary.md:flow2.failure --> |
| portfolio aggregate를 요청합니다. | <!-- learner:01-runnable-next-application-boundary.md:flow3.owner --> | <!-- learner:01-runnable-next-application-boundary.md:flow3.io --> | <!-- learner:01-runnable-next-application-boundary.md:flow3.failure --> |
| Design home을 렌더링합니다. | <!-- learner:01-runnable-next-application-boundary.md:flow4.owner --> | <!-- learner:01-runnable-next-application-boundary.md:flow4.io --> | <!-- learner:01-runnable-next-application-boundary.md:flow4.failure --> |

## 11. 학습 완료 확인

<!-- learner:01-runnable-next-application-boundary.md:completion.check -->
