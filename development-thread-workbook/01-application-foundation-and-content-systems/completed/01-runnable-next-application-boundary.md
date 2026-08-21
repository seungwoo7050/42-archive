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
| 직전 상태와 부족함 | 저장소에는 실행 코드가 없고 포트폴리오의 목적과 향후 디렉터리 규칙만 문서화되어 있었습니다. |
| 실제 변경 file/symbol/call path | `README.md`가 `src/content`, `src/lib/portfolio`, `src/components/portfolio`를 각각 source, 조립, 표현 위치로 예고합니다. |
| Data/state/resource owner와 lifetime | 소유권은 아직 문서 규칙에만 있으며 runtime owner는 존재하지 않습니다. |
| Failure·absence·fallback 처리 | 문서가 맞아도 build·route·렌더링을 검증할 방법은 없습니다. |
| 보장하는 것과 보장하지 않는 것 | 후속 구현이 따라야 할 편집 경계는 제시하지만 실행 가능성은 보장하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | `448bc2510f34`가 이 문서 규칙 위에 실제 Next 애플리케이션 경계를 만듭니다. |

#### 코드·실행 증거

정적 근거: `cce7dd020563`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

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
| 직전 상태와 부족함 | 직전 tree에는 dependency graph, compiler 설정, App Router entry가 없어 어떤 콘텐츠도 웹 애플리케이션으로 실행할 수 없었습니다. |
| 실제 변경 file/symbol/call path | Next 16.2.4·React 19.2.4 기반 package와 strict TypeScript, Tailwind PostCSS plugin, ESLint, root layout/page를 한 번에 추가합니다. 개발 서버와 production server는 포트 3100을 사용합니다. |
| Data/state/resource owner와 lifetime | `package.json`이 lifecycle command를, `src/app/layout.tsx`가 document shell을, `src/app/page.tsx`가 첫 route output을 소유합니다. |
| Failure·absence·fallback 처리 | 설정 파일이 생겨도 당시 page는 정적 placeholder이며 content schema·loader·실제 renderer 통합은 없습니다. Node/npm 재현성 pinning도 이 Thread가 아니라 category 08의 후속 책임입니다. |
| 보장하는 것과 보장하지 않는 것 | `npm run build`가 가능한 구조와 App Router root는 생기지만 실제 실행 성공은 이번 작업에서 재현하지 않았습니다. |
| 다음 commit 또는 관련 test 연결 | `0a28cb050bc8`이 styling input을 만들고 `03c4e1f7b439`가 content/render integration을 연결합니다. |

#### 코드·실행 증거

정적 근거: `448bc2510f34`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다. 정적 증거: exact SHA diff에서 package/config/App Router 파일 추가를 확인했습니다. 저장소 command는 로컬 checkout 부재로 실행하지 않았습니다.

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
| 직전 상태와 부족함 | 초기 App Router에는 전역 token과 base style을 담을 프로젝트 파일이 없었습니다. |
| 실제 변경 file/symbol/call path | `globals.css`가 색상·font token을 CSS custom property로 정의하고 Tailwind theme alias와 document base style을 제공합니다. |
| Data/state/resource owner와 lifetime | 스타일 값의 owner는 component별 class가 아니라 root stylesheet로 이동하지만, 이 SHA만으로는 layout import가 없어 소비가 시작되지 않습니다. |
| Failure·absence·fallback 처리 | 파일이 존재해도 import되지 않으면 runtime CSS bundle에 포함된다는 보장이 없습니다. |
| 보장하는 것과 보장하지 않는 것 | 공용 token vocabulary를 보장하지만 실제 적용은 다음 commit까지 보장하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | `03c4e1f7b439`의 root layout import가 이 파일을 실제 application boundary에 연결합니다. |

#### 코드·실행 증거

정적 근거: `0a28cb050bc8`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

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
| 직전 상태와 부족함 | App Router skeleton과 stylesheet는 있었지만 site metadata, portfolio aggregate, home renderer가 연결되지 않았습니다. |
| 실제 변경 file/symbol/call path | root layout이 site source로 metadata와 language를 정하고 globals/font를 적용하며, page는 `getPortfolioContent()` 결과를 `DesignHomeRoute`에 전달합니다. |
| Data/state/resource owner와 lifetime | route는 aggregate 호출과 renderer 선택을 소유하고, content 조립은 `src/lib/portfolio`, 표현은 Design route component가 소유합니다. |
| Failure·absence·fallback 처리 | 고정 `contentDebug={false}`이고 다른 design 선택·runtime validation·route error policy는 아직 없습니다. |
| 보장하는 것과 보장하지 않는 것 | 첫 page가 직접 JSON을 조립하지 않는 application/content boundary를 보장하지만 source의 runtime 신뢰성은 보장하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | T2가 aggregate 모델을, T3 이후가 presentation/다중 route 계약을 확장합니다. |

#### 코드·실행 증거

정적 근거: `03c4e1f7b439`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

## 6. Invariant evolution ledger

| 추적할 invariant | 도입·변화 SHA | 실제 owner/evidence | 제한·후속 보호 |
| --- | --- | --- | --- |
| 실행 command와 App Router root가 존재한다. | `448bc2510f34` | `package.json`, `src/app/layout.tsx`, `src/app/page.tsx` | Node/npm pin과 production smoke는 category 08에서 보강됩니다. |
| 전역 token은 root stylesheet에서 정의되고 layout이 import한다. | `0a28cb050bc8` → `03c4e1f7b439` | `src/app/globals.css`, `src/app/layout.tsx` | token 의미의 visual regression은 이 Thread가 검증하지 않습니다. |
| 첫 route는 portfolio aggregate를 renderer에 전달한다. | `03c4e1f7b439` | `src/app/page.tsx`의 `getPortfolioContent()` 호출 | aggregate 내부 값은 아직 assertion 기반입니다. |

## 7. Failure → Fix → Test 관계

| Failure 또는 risk | Fix/전환 SHA | 교정된 결정 | Regression·검증 관계 |
| --- | --- | --- | --- |
| 문서만 있고 실행 경계가 없음 | `448bc2510f34` | package/config/App Router root 추가 | 이번 작업에서는 repository command 미실행; 후속 category 08 검증과 연결 |
| stylesheet가 존재하지만 소비되지 않을 수 있음 | `03c4e1f7b439` | root layout에서 `./globals.css` import | 후속 browser/visual tests가 실제 회귀 면을 보호 |
| route가 source를 직접 조립할 위험 | `03c4e1f7b439` | `getPortfolioContent()`를 단일 호출점으로 사용 | `3353032ba23b` 이후 content test가 aggregate 경로를 검증 |

## 8. Ownership·state·responsibility 변화

| 대상 | 이전 owner/state | 최종 owner/state | 근거 |
| --- | --- | --- | --- |
| 실행 lifecycle | 없음 | `package.json` scripts | `npm run dev/build/start/lint/typecheck` |
| document shell | 없음 | `src/app/layout.tsx` | metadata, language, font, globals |
| content 조립 | 없음 | `src/lib/portfolio` | `getPortfolioContent()` |
| home 표현 | 정적 placeholder | `DesignHomeRoute` | `src/app/page.tsx`가 aggregate를 전달 |

## 9. Thread 최종 상태

Thread 종료 시점에는 Next App Router가 실행 구조를 갖고 전역 스타일과 site metadata를 root에서 적용하며, 첫 page가 portfolio aggregate를 Design home renderer에 전달합니다. 다만 toolchain pin, production smoke, runtime content validation과 다중 design routing은 별도 후속 책임입니다.

### 최종 설명

- 문서 규칙만 있던 root에 Next/React/TypeScript/PostCSS/ESLint lifecycle을 추가했습니다.
- 전역 CSS token을 별도 파일에 만들고 root layout import로 실제 소비를 연결했습니다.
- page는 content 조립을 소유하지 않고 `getPortfolioContent()` 결과를 renderer에 넘기는 얇은 경계가 되었습니다.
- 실행 성공과 production server 상태는 이번 정적 조사로 증명하지 않았습니다.

## 10. 최종 실행·데이터 흐름

| 단계 | Owner/call path | 입력·출력 | Failure/non-guarantee |
| --- | --- | --- | --- |
| 애플리케이션 lifecycle을 선택합니다. | `package.json` | script와 dependency graph | command 자체의 환경 오류는 이 Thread에서 실행 검증하지 않음 |
| root document를 구성합니다. | `src/app/layout.tsx` | site metadata, language, fonts, global CSS | 잘못된 source 값은 당시 runtime parse 없이 소비 |
| portfolio aggregate를 요청합니다. | `src/app/page.tsx` → `getPortfolioContent()` | 한 개 aggregate | loader/schema failure path는 후속 Thread |
| Design home을 렌더링합니다. | `DesignHomeRoute` | content와 fixed debug flag | 다른 design/route 선택 없음 |

## 11. 학습 완료 확인

완료했습니다. 모든 commit은 exact SHA의 parent diff/resulting tree를 기준으로 기록했고, direct execution evidence와 static inspection을 구분했습니다. 후속 category 08의 toolchain/production smoke와 category 07의 integration/visual tests가 실행·회귀 증거를 추가합니다. 이 Thread에서 repository command는 실행하지 않았습니다.
