# Development Thread: Resume evidence and conditional sections

> **Repository:** `https://github.com/seungwoo7050/42-archive`  
> **Branch:** `web/portfolio`  
> **Category:** `04-route-features-and-evidence-experiences`  
> **Workbook state:** Phase 1 frozen scaffold  
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

- [ ] 모든 commit을 부모 상태와 exact SHA에서 비교하고 final HEAD를 과거에 투영하지 않았습니다.
- [ ] 각 commit의 concrete file/function/component/data field와 caller→callee 또는 data flow를 기록했습니다.
- [ ] optional data, missing reference, empty array, disabled page 등 실제 failure/absence branch를 설명했습니다.
- [ ] 소유권·표시 책임·상태 전환과 적용되지 않는 resource cleanup을 구분했습니다.
- [ ] 보장과 비보장을 분리하고 후속 commit/category와의 관계를 연결했습니다.
- [ ] 실행하지 않은 build/test/runtime 결과를 통과했다고 표시하지 않았습니다.

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

<!-- learner: 부모 상태와 정확한 SHA diff를 대조해 아래 항목을 채우십시오. final HEAD의 구현을 이 시점에 소급하지 마십시오. -->
- **Previous state:**
- **Implementation decision and path:**
- **Ownership and data lifetime:**
- **Failure, absence, and non-guarantee:**
- **Resulting guarantee:**
- **Relationship to later work:**
- **Resource acquisition and cleanup, or why not applicable:**

#### Execution evidence

<!-- learner: 실제로 실행한 명령이 있으면 exact SHA, command, relevant result를 기록하십시오. 실행하지 못했다면 정적 검토와 환경 제한을 구분해 설명하십시오. -->

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

<!-- learner: 부모 상태와 정확한 SHA diff를 대조해 아래 항목을 채우십시오. final HEAD의 구현을 이 시점에 소급하지 마십시오. -->
- **Previous state:**
- **Implementation decision and path:**
- **Ownership and data lifetime:**
- **Failure, absence, and non-guarantee:**
- **Resulting guarantee:**
- **Relationship to later work:**
- **Resource acquisition and cleanup, or why not applicable:**

#### Execution evidence

<!-- learner: 실제로 실행한 명령이 있으면 exact SHA, command, relevant result를 기록하십시오. 실행하지 못했다면 정적 검토와 환경 제한을 구분해 설명하십시오. -->

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

<!-- learner: 부모 상태와 정확한 SHA diff를 대조해 아래 항목을 채우십시오. final HEAD의 구현을 이 시점에 소급하지 마십시오. -->
- **Previous state:**
- **Implementation decision and path:**
- **Ownership and data lifetime:**
- **Failure, absence, and non-guarantee:**
- **Resulting guarantee:**
- **Relationship to later work:**
- **Resource acquisition and cleanup, or why not applicable:**

#### Execution evidence

<!-- learner: 실제로 실행한 명령이 있으면 exact SHA, command, relevant result를 기록하십시오. 실행하지 못했다면 정적 검토와 환경 제한을 구분해 설명하십시오. -->

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

<!-- learner: 부모 상태와 정확한 SHA diff를 대조해 아래 항목을 채우십시오. final HEAD의 구현을 이 시점에 소급하지 마십시오. -->
- **Previous state:**
- **Implementation decision and path:**
- **Ownership and data lifetime:**
- **Failure, absence, and non-guarantee:**
- **Resulting guarantee:**
- **Relationship to later work:**
- **Resource acquisition and cleanup, or why not applicable:**

#### Execution evidence

<!-- learner: 실제로 실행한 명령이 있으면 exact SHA, command, relevant result를 기록하십시오. 실행하지 못했다면 정적 검토와 환경 제한을 구분해 설명하십시오. -->

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

<!-- learner: 부모 상태와 정확한 SHA diff를 대조해 아래 항목을 채우십시오. final HEAD의 구현을 이 시점에 소급하지 마십시오. -->
- **Previous state:**
- **Implementation decision and path:**
- **Ownership and data lifetime:**
- **Failure, absence, and non-guarantee:**
- **Resulting guarantee:**
- **Relationship to later work:**
- **Resource acquisition and cleanup, or why not applicable:**

#### Execution evidence

<!-- learner: 실제로 실행한 명령이 있으면 exact SHA, command, relevant result를 기록하십시오. 실행하지 못했다면 정적 검토와 환경 제한을 구분해 설명하십시오. -->

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

<!-- learner: 부모 상태와 정확한 SHA diff를 대조해 아래 항목을 채우십시오. final HEAD의 구현을 이 시점에 소급하지 마십시오. -->
- **Previous state:**
- **Implementation decision and path:**
- **Ownership and data lifetime:**
- **Failure, absence, and non-guarantee:**
- **Resulting guarantee:**
- **Relationship to later work:**
- **Resource acquisition and cleanup, or why not applicable:**

#### Execution evidence

<!-- learner: 실제로 실행한 명령이 있으면 exact SHA, command, relevant result를 기록하십시오. 실행하지 못했다면 정적 검토와 환경 제한을 구분해 설명하십시오. -->

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

<!-- learner: 부모 상태와 정확한 SHA diff를 대조해 아래 항목을 채우십시오. final HEAD의 구현을 이 시점에 소급하지 마십시오. -->
- **Previous state:**
- **Implementation decision and path:**
- **Ownership and data lifetime:**
- **Failure, absence, and non-guarantee:**
- **Resulting guarantee:**
- **Relationship to later work:**
- **Resource acquisition and cleanup, or why not applicable:**

#### Execution evidence

<!-- learner: 실제로 실행한 명령이 있으면 exact SHA, command, relevant result를 기록하십시오. 실행하지 못했다면 정적 검토와 환경 제한을 구분해 설명하십시오. -->

## 6. Invariant evolution

<!-- learner: invariant가 도입·확장·불충분 판정·교정·검증된 순서를 commit SHA와 함께 복원하십시오. -->

## 7. Failure → Fix → Test and later relationships

<!-- learner: Failure → Fix → Test 또는 구현 → integration → regression 관계를 기록하십시오. 해당 commit이 없으면 왜 없는지 설명하십시오. -->

## 8. Ownership, state, and responsibility changes

<!-- learner: content, selector, route, shared component, later view model 사이의 소유권·책임 이동을 기록하십시오. -->

## 9. Final thread state

<!-- learner: frozen commit map 마지막 상태에서 이 Thread가 보장하는 기능과 보장하지 않는 범위를 요약하십시오. -->

## 10. Final architecture and execution flow

<!-- learner: source data에서 route/component/link/failure branch까지 최종 실행·표현 흐름을 순서대로 설명하십시오. -->

## 11. Minimal historical code evidence

<!-- learner: 설계·상태 전환·참조 해석·failure branch를 가장 잘 보여 주는 exact-SHA 최소 code excerpt를 하나 선택하고 SHA/path/symbol을 명시하십시오. -->

## 12. Learning-completion checks

- [ ] Frozen commit map 7개를 모두 completion record와 연결했습니다.
- [ ] SHA, subject, importance, tags, source-defined role의 고정 정보를 scaffold와 동일하게 유지했습니다.
- [ ] 각 historical claim을 해당 SHA diff에 한정하고 later implementation을 소급하지 않았습니다.
- [ ] fix/test가 없거나 다른 category 소유인 경우 그 사실을 명시했습니다.
- [ ] runtime execution status를 명시했으며 실행하지 않은 command를 성공으로 기록하지 않았습니다.
- [ ] learner placeholder를 남기지 않았습니다.
