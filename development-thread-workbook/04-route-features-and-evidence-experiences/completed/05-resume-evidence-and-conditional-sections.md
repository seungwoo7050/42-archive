# Development Thread: Resume evidence and conditional sections

> **Repository:** `https://github.com/seungwoo7050/42-archive`  
> **Branch:** `web/portfolio`  
> **Category:** `04-route-features-and-evidence-experiences`  
> **Workbook state:** completed workbook  
> **Historical scope:** commits reachable from `web/portfolio` only

## 0. Phase 1 audit result and category boundary

- 포함: `/resume`의 hero·summary·download CTA, 선택 프로젝트, training, profile metadata, experience, education, notes 구성.
- 제외: route query/template lifecycle은 category 02, project-link transport와 공용 카드 primitive는 category 03, `getResumeProjects` selector의 일반 정책은 category 01, 후대 Resume view-model ownership은 category 09가 담당합니다.
- 이 Thread는 HTML resume 경험을 다루며 실제 PDF 파일 생성·배포·다운로드 성공 여부는 범위 밖입니다.

- **Audit decision:** 이 Thread는 독립적인 route feature/evidence story로 유지합니다.
- **Frozen commit count:** 7
- **Importance profile:** branch-local source classification상 이 Thread의 commit은 모두 B입니다. 다른 category의 S/A-level cross-cutting architecture를 중복 편입하지 않았습니다.

## 1. Thread goal

Resume route가 profile summary에서 선택 프로젝트, training, location/availability, experience, education, notes로 확장되는 과정을 복원하고, 각 optional section과 download CTA가 서로 독립적으로 생략되는 계약을 확인합니다.

### Fixed invariants

- `resume.downloadUrl`이 빈 값이면 다운로드 CTA를 만들지 않으며 임의의 기본 파일 경로를 추정하지 않습니다.
- 선택 프로젝트는 `resume.projectIds`의 선언 순서를 보존하고 해석 가능한 project만 렌더링합니다.
- training, experience, education, notes는 서로 독립적인 데이터 집합이며 한 집합의 부재가 다른 section을 숨기지 않습니다.
- 후반 조건부 sections는 각 배열 길이를 직접 확인하고 빈 wrapper/heading을 남기지 않습니다.
- Resume route는 profile location/availability와 resume content를 결합하지만 원본 데이터의 lifetime은 application content aggregate가 소유합니다.

## 2. Core engineering questions

1. 초기 Resume hero와 summary는 어떤 원본을 결합하며 download CTA는 어떤 조건에서 존재하는가?
2. `getResumeProjects`는 project ID 순서와 누락 참조를 어떻게 처리하는가?
3. training과 experience/education은 어떤 데이터 구조와 presentation copy를 사용하며 서로 어떤 관계가 없는가?
4. location과 availability는 Resume 자체 데이터인가 profile 데이터인가?
5. experience, education, notes가 비어 있을 때 heading까지 사라지는지 item만 사라지는지 exact SHA에서 확인할 수 있는가?

## 3. Completion criteria

- [x] 모든 commit을 부모 상태와 exact SHA에서 비교하고 final HEAD를 과거에 투영하지 않았습니다.
- [x] 각 commit의 concrete file/function/component/data field와 caller→callee 또는 data flow를 기록했습니다.
- [x] optional data, missing reference, empty array, disabled page 등 실제 failure/absence branch를 설명했습니다.
- [x] 소유권·표시 책임·상태 전환과 적용되지 않는 resource cleanup을 구분했습니다.
- [x] 보장과 비보장을 분리하고 후속 commit/category와의 관계를 연결했습니다.
- [x] 실행하지 않은 build/test/runtime 결과를 통과했다고 표시하지 않았습니다.

## 4. Frozen commit map

| Order | SHA | Subject | Importance | Tags | Source-defined role |
|---:|---|---|:---:|---|---|
| 1 | `e655951b0706` | feat(resume): 이력 소개와 요약 추가 | B | RENDERER | Resume route의 hero, summary, optional download CTA를 최초 구성합니다. |
| 2 | `b399ce0c7f84` | feat(resume): 선택 프로젝트 경력 추가 | B | RENDERER | resume가 명시한 project IDs를 case-study evidence로 연결합니다. |
| 3 | `4d17fd7ab81b` | feat(resume): 교육 과정 요약 추가 | B | RENDERER | resume training records와 Resume navigation entry를 추가합니다. |
| 4 | `f64763cffcff` | feat(resume): 프로필 위치와 가용성 추가 | B | RENDERER | profile의 location과 availability를 Resume identity evidence에 통합합니다. |
| 5 | `3c113f1995ff` | feat(resume): 경력 이력 추가 | B | RENDERER | experience history를 데이터가 있을 때만 나타나는 Resume section으로 추가합니다. |
| 6 | `732ae5a6785c` | feat(resume): 교육 이력 추가 | B | RENDERER | education history를 별도의 조건부 Resume section으로 추가합니다. |
| 7 | `579ea168daa8` | feat(resume): Resume 안내 기록 추가 | B | RENDERER | resume notes를 데이터가 있을 때만 공개하는 마지막 안내 section으로 추가합니다. |

## 5. Commit-by-commit historical investigation

### 5.1. `e655951b0706` — feat(resume): 이력 소개와 요약 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** Resume route의 hero, summary, optional download CTA를 최초 구성합니다.

#### Exact inspection targets

- `src/app/resume/page.tsx` — `ResumePage`
- `content.resume.summary`, `content.resume.downloadUrl`
- `content.profile.koreanName`, `content.profile.handle`
- `presentation.pages.resume.hero`, `presentation.pages.resume.summary`
- `downloadUrl ? <a ...> : null` branch

#### Commit-specific investigation tasks

1. `ResumePage` hero/summary가 profile, resume, presentation fields를 어떻게 결합하는지 추적합니다.
2. `downloadUrl` truthy branch가 CTA 전체를 가드하고 fallback path를 만들지 않는지 확인합니다.
3. summary가 빈 경우 heading과 반복 결과의 실제 DOM 상태를 기록합니다.

#### Learner evidence record

- **Previous state:** 직전에는 `/resume`에서 profile identity와 resume summary를 조립하거나 다운로드 가능 여부를 표현하는 route가 없었습니다.
- **Implementation decision and path:** `ResumePage`가 `PageShell` 안에 hero와 summary를 만들고, `downloadUrl`이 truthy일 때만 다운로드 anchor를 추가합니다.
- **Ownership and data lifetime:** resume content가 summary와 URL을, presentation이 labels/copy를, route가 CTA 존재와 section layout을 소유합니다.
- **Failure, absence, and non-guarantee:** download URL이 빈 문자열·undefined이면 CTA는 `null`입니다. summary가 비면 heading은 남고 item 목록만 비며, 이 시점에는 선택 프로젝트나 경력 섹션이 없습니다.
- **Resulting guarantee:** 없는 다운로드 파일을 추정하지 않고, content가 제공한 URL만 공개하는 최소 Resume 경험을 보장합니다.
- **Relationship to later work:** `b399...`가 선택 project evidence를 추가하고 후속 commits가 독립 sections를 누적합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `e655951b0706` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.2. `b399ce0c7f84` — feat(resume): 선택 프로젝트 경력 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** resume가 명시한 project IDs를 case-study evidence로 연결합니다.

#### Exact inspection targets

- `src/app/resume/page.tsx` — selected-project section
- `getResumeProjects(content)` 호출
- `content.resume.projectIds`와 `content.projects`
- `ProjectCard` 또는 detail link에 `homeTemplate`/`contentDebug` 전달

#### Commit-specific investigation tasks

1. `getResumeProjects` 입력과 결과를 따라 `resume.projectIds` 순서가 보존되는지 확인합니다.
2. 누락 project ID가 selector 결과에서 어떻게 처리되는지 exact selector/consumer state를 비교합니다.
3. project cards/links에 template/debug state가 전달되는지 기록합니다.

#### Learner evidence record

- **Previous state:** Resume summary는 역량을 주장했지만 구체적인 프로젝트 근거로 이동할 수 없었습니다.
- **Implementation decision and path:** 공용 selector가 resume의 project ID 목록을 aggregate에 해석한 결과를 route가 카드/링크로 렌더링합니다.
- **Ownership and data lifetime:** `resume.projectIds`가 선택과 순서를, project aggregate가 표시 데이터와 route ID를, selector가 누락 참조 제거를 소유합니다.
- **Failure, absence, and non-guarantee:** project ID가 해석되지 않으면 결과에서 빠지고, 선택 결과가 비면 item 목록이 비어 별도 fallback project를 고르지 않습니다.
- **Resulting guarantee:** Resume의 사례 선택이 global featured flag가 아니라 resume 전용 ID 목록을 따르고 원본 순서를 보존함을 보장합니다.
- **Relationship to later work:** `4d17...`은 프로젝트와 별개의 training evidence를 추가합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `b399ce0c7f84` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.3. `4d17fd7ab81b` — feat(resume): 교육 과정 요약 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** resume training records와 Resume navigation entry를 추가합니다.

#### Exact inspection targets

- `src/app/resume/page.tsx` — training section
- `content.resume.training.map(...)`
- training item의 `name`, `period`, `description`
- `src/content/site.json` — `/resume` navigation item

#### Commit-specific investigation tasks

1. `content.resume.training` item fields와 card 반복을 확인하고 section에 length guard가 있는지 기록합니다.
2. `src/content/site.json`의 `/resume` navigation 추가를 route renderer change와 분리합니다.
3. training과 later education history가 같은 source인지 다른 source인지 구분합니다.

#### Learner evidence record

- **Previous state:** 선택 프로젝트는 있었지만 formal/structured training의 기간과 설명을 보여 주지 못했고 site navigation에도 Resume 진입점이 없었습니다.
- **Implementation decision and path:** training records를 카드 목록으로 출력하고 site navigation에 Resume route를 추가합니다.
- **Ownership and data lifetime:** training data가 item 순서와 문구를, site content가 navigation 노출을, route가 card presentation을 소유합니다.
- **Failure, absence, and non-guarantee:** training 배열이 비면 이 커밋의 구현상 section wrapper와 heading은 남을 수 있습니다. 후대 experience/education/notes의 length guard를 이 과거 상태에 소급하지 않습니다.
- **Resulting guarantee:** training records와 `/resume` 진입 경로를 제공함을 보장합니다. 비어 있는 training section의 완전한 생략은 보장하지 않습니다.
- **Relationship to later work:** `f647...`이 profile metadata를 hero/evidence에 더하고 `3c113...`부터 별도 조건부 sections를 추가합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `4d17fd7ab81b` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.4. `f64763cffcff` — feat(resume): 프로필 위치와 가용성 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** profile의 location과 availability를 Resume identity evidence에 통합합니다.

#### Exact inspection targets

- `src/app/resume/page.tsx` — profile metadata 영역
- `content.profile.location`, `content.profile.availability`
- `ContentHint`가 가리키는 `src/content/profile.json`
- 값 존재 여부에 따른 separator/DOM 처리

#### Commit-specific investigation tasks

1. profile location/availability가 Resume의 어느 위치에 삽입되고 어떤 source hint를 갖는지 확인합니다.
2. 두 값의 optional branch와 separator 처리를 exact JSX에서 기록합니다.
3. resume JSON에 값을 복제하지 않고 profile aggregate를 재사용하는지 확인합니다.

#### Learner evidence record

- **Previous state:** Resume hero는 이름과 handle만 사용해 현재 위치와 가용성 정보를 전달하지 못했습니다.
- **Implementation decision and path:** profile metadata를 Resume 상단에 추가해 resume summary와 현재 상태를 함께 보여 줍니다.
- **Ownership and data lifetime:** profile content가 location/availability 값을, Resume route가 표시 위치와 문장 조합을 소유합니다.
- **Failure, absence, and non-guarantee:** 값이 없을 때 임의 문구를 만들지 않습니다. 두 값의 독립적 optional 처리 방식은 해당 SHA의 JSX 조건을 기준으로 기록해야 하며 final HEAD를 소급하지 않습니다.
- **Resulting guarantee:** Resume가 별도 중복 데이터 없이 profile aggregate의 현재 상태를 재사용함을 보장합니다.
- **Relationship to later work:** `3c113...`이 work experience를 독립 section으로 추가합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `f64763cffcff` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.5. `3c113f1995ff` — feat(resume): 경력 이력 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** experience history를 데이터가 있을 때만 나타나는 Resume section으로 추가합니다.

#### Exact inspection targets

- `src/app/resume/page.tsx` — experience length guard와 item 반복
- `content.experience`
- `presentation.pages.resume.experience`
- company/role/period/highlights 표현 위치

#### Commit-specific investigation tasks

1. experience 배열 length guard가 heading과 item wrapper 전체를 감싸는지 확인합니다.
2. experience item의 role/company/period/highlights 표현과 ordering을 기록합니다.
3. experience 부재가 training/summary sections에 영향을 주지 않는지 JSX sibling 구조로 확인합니다.

#### Learner evidence record

- **Previous state:** Resume는 projects와 training은 보여 줬지만 실제 조직·역할 단위의 경력 기록을 별도 section으로 제공하지 않았습니다.
- **Implementation decision and path:** `content.experience.length > 0` 조건 아래 heading과 records를 함께 렌더링합니다.
- **Ownership and data lifetime:** experience content가 records와 순서를, route가 section의 존재·layout을, presentation이 label을 소유합니다.
- **Failure, absence, and non-guarantee:** experience가 비면 item뿐 아니라 section 전체가 없습니다. training이나 summary에는 영향을 주지 않습니다.
- **Resulting guarantee:** 빈 경력 heading을 남기지 않는 독립적 conditional-section 계약을 보장합니다.
- **Relationship to later work:** `732...`이 같은 원칙으로 education을 추가합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `3c113f1995ff` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.6. `732ae5a6785c` — feat(resume): 교육 이력 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** education history를 별도의 조건부 Resume section으로 추가합니다.

#### Exact inspection targets

- `src/app/resume/page.tsx` — education length guard
- `content.resume.education` 또는 해당 education source
- `presentation.pages.resume.education`
- institution/program/period/description 반복

#### Commit-specific investigation tasks

1. education 배열 length guard와 item fields를 exact SHA에서 확인합니다.
2. training section과 education section의 source/labels/semantics 차이를 기록합니다.
3. experience 존재 여부와 독립적으로 education visibility가 결정되는지 확인합니다.

#### Learner evidence record

- **Previous state:** training 요약은 있었지만 education history를 별도 이력으로 구분해 표현하지 않았습니다.
- **Implementation decision and path:** education 배열이 비어 있지 않을 때만 heading과 education cards/rows를 렌더링합니다.
- **Ownership and data lifetime:** education content가 항목과 순서를, route가 section 생략 여부와 표현을 소유합니다.
- **Failure, absence, and non-guarantee:** education이 비면 section 전체가 없습니다. experience가 존재하는지와 무관하게 독립적으로 평가됩니다.
- **Resulting guarantee:** training과 education을 같은 의미로 합치지 않고 독립 evidence sections로 유지함을 보장합니다.
- **Relationship to later work:** `579...`가 마지막으로 작성자 안내 notes를 별도 조건부 section으로 추가합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `732ae5a6785c` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.7. `579ea168daa8` — feat(resume): Resume 안내 기록 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** resume notes를 데이터가 있을 때만 공개하는 마지막 안내 section으로 추가합니다.

#### Exact inspection targets

- `src/app/resume/page.tsx` — notes length guard와 list
- `content.resume.notes`
- `presentation.pages.resume.notes`
- notes item의 key와 semantic list 구조

#### Commit-specific investigation tasks

1. resume notes length guard가 heading과 list 전체를 감싸는지 확인합니다.
2. notes가 validation error가 아니라 사용자 안내 content로 표현되는 semantic 위치를 기록합니다.
3. notes 부재가 다른 Resume evidence sections를 숨기지 않는지 확인합니다.

#### Learner evidence record

- **Previous state:** Resume의 사실 evidence는 있었지만 문서 사용·해석에 필요한 편집자 notes를 별도로 전달할 수 없었습니다.
- **Implementation decision and path:** notes 배열이 비어 있지 않을 때만 heading과 notes 목록을 추가합니다.
- **Ownership and data lifetime:** resume content가 notes 문구와 순서를, route가 section visibility와 list semantics를 소유합니다.
- **Failure, absence, and non-guarantee:** notes가 비면 section 전체가 없습니다. notes는 validation warning이나 runtime error가 아니며 다른 evidence를 차단하지 않습니다.
- **Resulting guarantee:** 선택적 안내를 빈 UI 없이 추가할 수 있고, summary/project/training/experience/education의 존재와 독립적임을 보장합니다.
- **Relationship to later work:** 후대 Resume view model은 category 09에서 이 파생·조건 데이터를 renderer boundary로 옮깁니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `579ea168daa8` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

## 6. Invariant evolution

| Stage | Historical reconstruction |
|---|---|
| 최소 Resume | `e655...`가 hero·summary와 truthy `downloadUrl` 기반 CTA를 만들었습니다. |
| 사례 근거 | `b399...`가 resume 전용 project ID 순서에 따라 case-study evidence를 연결했습니다. |
| 교육·현재 상태 | `4d17...`과 `f647...`이 training, location, availability를 추가했습니다. |
| 독립 조건부 sections | `3c113...`, `732...`, `579...`가 experience, education, notes를 각각 배열 길이로 가드했습니다. |

## 7. Failure → Fix → Test and later relationships

- 이 frozen map에는 전용 fix/test commit이 없습니다. project ID 참조와 conditional section은 정적 구현으로 확인했으며 실행 회귀를 주장하지 않습니다.
- `4d17...`의 training section과 후대 sections의 length guard는 같은 시점의 계약이 아닙니다. 후대 guard를 training에 소급하지 않습니다.
- `getResumeProjects`의 selector 구현·테스트는 category 01/09에서 소유하고, 이 문서는 Resume가 그 결과를 어떻게 소비하는지에 집중합니다.

## 8. Ownership, state, and responsibility changes

- Profile content: identity, location, availability.
- Resume content: summary, download URL, selected project IDs, training, education, notes.
- Experience content: work-history records.
- Selectors: resume project IDs를 project objects로 해석하며 원본 순서를 보존.
- Resume route: section existence, ordering, links, semantic presentation.

## 9. Final thread state

Resume route는 content-provided download URL만 CTA로 공개하고, summary·선택 프로젝트·training·profile metadata를 보여 줍니다. experience, education, notes는 각각 데이터가 있을 때만 section 전체가 존재하며 서로 독립적입니다.

## 10. Final architecture and execution flow

content aggregate 로드 → Resume hero/profile metadata 구성 → `downloadUrl` truthiness로 CTA 결정 → summary 렌더링 → resume project IDs를 selector로 해석하고 찾은 사례를 원본 순서로 출력 → training 렌더링 → experience/education/notes 배열을 각각 검사해 non-empty section만 추가.

## 11. Minimal historical code evidence

`e655951b0706`, `src/app/resume/page.tsx`, `ResumePage`:
```tsx
{content.resume.downloadUrl ? (
  <a href={content.resume.downloadUrl}>{pageCopy.hero.downloadLabel}</a>
) : null}
```
이 발췌는 route가 추정 경로를 만들지 않고 content가 제공한 다운로드 가능성만 공개하는 계약을 보여 줍니다.

## 12. Learning-completion checks

- [x] Frozen commit map 7개를 모두 completion record와 연결했습니다.
- [x] SHA, subject, importance, tags, source-defined role의 고정 정보를 scaffold와 동일하게 유지했습니다.
- [x] 각 historical claim을 해당 SHA diff에 한정하고 later implementation을 소급하지 않았습니다.
- [x] fix/test가 없거나 다른 category 소유인 경우 그 사실을 명시했습니다.
- [x] runtime execution status를 명시했으며 실행하지 않은 command를 성공으로 기록하지 않았습니다.
- [x] learner placeholder를 남기지 않았습니다.
