# Thread: Content media loading and layout stability

> Project: 42 Archive Portfolio
>
> Branch: `web/portfolio`
>
> Category: `03-shared-ui-interaction-and-responsive-primitives`

## 0. 분류 출처와 Phase 1 고정 범위

- Commit SHA, subject, importance와 tags는 branch의 `commit/commit-importance.md` 분류와 exact commit resolution을 대조했습니다.
- 이 문서의 Thread boundary, commit set, order, 역할과 commit-specific investigation task는 Phase 1 audit에서 확정했습니다.
- Phase 2에서는 이 fixed text와 commit metadata를 바꾸지 않고 learner-facing section만 채웁니다.
- 다른 branch와 final HEAD를 과거 SHA 설명에 사용하지 않습니다.

## 1. Thread 목표와 경계

프로필 사진과 프로젝트 screenshot primitive가 content metadata를 어떻게 보존하고, hero와 gallery consumer가 eager/lazy loading 및 고정 aspect layout을 어떻게 선택하는지 복원합니다.

**경계:** 이 Thread는 shared media DOM과 loading/layout contract를 다룹니다. Image optimization pipeline, source asset generation, project detail 정보 architecture 자체는 포함하지 않습니다.

### 고정 invariant

- alt/src는 content가 소유하고 media primitive는 이를 임의로 대체하지 않습니다.
- ProjectScreenshot의 priority만 eager loading을 선택하며 기본값은 lazy입니다.
- ProjectScreenshot의 `<img>`에 고정 aspect ratio가 있어 image load 전에도 screenshot 높이를 계산할 수 있습니다.
- Optional profile photo가 없으면 consumer는 빈 placeholder가 아니라 media DOM 자체를 생략합니다.

## 2. 핵심 질문

- aa115c73ae30에서 raw `<img>`를 감싸는 두 primitive가 어떤 loading·aspect·alt contract를 갖는가?
- Lead/detail hero가 priority를 명시하고 gallery가 default lazy를 유지하는 consumer 차이는 무엇인가?
- `profile.photo ? ... : null` branch가 optional content를 어떻게 표현하는가?
- 이 history에 error fallback, responsive `srcset`, framework image optimization이 실제로 존재하는가?

## 3. 완료 기준

- 각 SHA의 parent diff와 resulting tree를 구분해 실제 file/symbol/call path를 기록합니다.
- Previous state, owner, state transition, absence/failure branch, guarantee/non-guarantee를 commit별로 분리합니다.
- Fix와 test는 실제로 수정·검증하는 production path에 연결합니다.
- 실행하지 않은 command 결과를 만들지 않습니다.
- 이 Thread는 B-level commit만 포함하므로 각 commit의 concrete role, boundary, failure/non-guarantee를 필요한 범위로 기록합니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Thread 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `aa115c73ae30` | feat(ui): 콘텐츠 이미지 프리미티브 추가 | B | CONTENT | media primitive 도입 |
| 2 | `b027f42669aa` | feat(home): 대표 프로젝트 쇼케이스 추가 | B | RENDERER | lead screenshot consumer |
| 3 | `06fff9a6e93b` | feat(project): 프로젝트 상세 소개 추가 | B | RENDERER | detail hero consumer |
| 4 | `cabf3a0e378f` | feat(project): 프로젝트 구조와 증거 갤러리 추가 | B | RENDERER | gallery lazy consumer |
| 5 | `a00a6bf1af58` | feat(about): 프로필 사진 소개 추가 | B | RENDERER | optional profile consumer |

## 5. Commit별 학습 기록

### 1. `aa115c73ae30` — feat(ui): 콘텐츠 이미지 프리미티브 추가

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** media primitive 도입

#### 해당 SHA에서 확인할 실제 코드

- `src/components/portfolio/profile-photo.tsx`와 `project-screenshot.tsx`의 raw img attributes를 확인합니다.
- ProjectScreenshot의 `priority` default, loading branch, `<img>` aspect ratio, figure overflow frame, object position과 hover class를 확인합니다.
- 같은 commit의 ContentHint는 별도 concern임을 표시하고 media evidence와 섞지 않습니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-aa115c73ae30-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-aa115c73ae30-record:end -->

#### 최소 코드 증거

<!-- learner:commit-aa115c73ae30-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-aa115c73ae30-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-aa115c73ae30-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-aa115c73ae30-execution:end -->

### 2. `b027f42669aa` — feat(home): 대표 프로젝트 쇼케이스 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** lead screenshot consumer

#### 해당 SHA에서 확인할 실제 코드

- Design home lead-project branch에서 `ProjectScreenshot image={leadProject.screenshot} priority` 호출을 확인합니다.
- Lead project absence가 section DOM에 미치는 영향을 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-b027f42669aa-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-b027f42669aa-record:end -->

#### 최소 코드 증거

<!-- learner:commit-b027f42669aa-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-b027f42669aa-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-b027f42669aa-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-b027f42669aa-execution:end -->

### 3. `06fff9a6e93b` — feat(project): 프로젝트 상세 소개 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** detail hero consumer

#### 해당 SHA에서 확인할 실제 코드

- 새 `ProjectDetailView`에서 hero screenshot 위치와 `priority` prop을 확인합니다.
- Back link, metadata, links와 screenshot primitive의 responsibility boundary를 구분합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-06fff9a6e93b-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-06fff9a6e93b-record:end -->

#### 최소 코드 증거

<!-- learner:commit-06fff9a6e93b-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-06fff9a6e93b-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-06fff9a6e93b-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-06fff9a6e93b-execution:end -->

### 4. `cabf3a0e378f` — feat(project): 프로젝트 구조와 증거 갤러리 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** gallery lazy consumer

#### 해당 SHA에서 확인할 실제 코드

- `ProjectDetailView`의 `project.screenshots.map`과 각 `ProjectScreenshot` 호출에 priority가 없는지 확인합니다.
- Architecture list와 gallery가 content array order를 그대로 사용하는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-cabf3a0e378f-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-cabf3a0e378f-record:end -->

#### 최소 코드 증거

<!-- learner:commit-cabf3a0e378f-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-cabf3a0e378f-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-cabf3a0e378f-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-cabf3a0e378f-execution:end -->

### 5. `a00a6bf1af58` — feat(about): 프로필 사진 소개 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** optional profile consumer

#### 해당 SHA에서 확인할 실제 코드

- `src/app/about/page.tsx`의 responsive grid 변경과 `content.profile.photo ? <ProfilePhoto .../> : null`을 확인합니다.
- ContentHint path가 photo까지 확장된 이유와 photo absence 시 layout branch를 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-a00a6bf1af58-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-a00a6bf1af58-record:end -->

#### 최소 코드 증거

<!-- learner:commit-a00a6bf1af58-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-a00a6bf1af58-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-a00a6bf1af58-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-a00a6bf1af58-execution:end -->

## 6. Invariant ledger

<!-- learner:thread-ledger:start -->
| Invariant | 도입·변경 commit | 실제 code/test evidence | 부족함이 드러난 지점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| Media metadata 보존 | aa115c73ae30 |  |  |  |
| Above-the-fold priority | b027f42669aa, 06fff9a6e93b |  |  |  |
| Evidence gallery lazy default | cabf3a0e378f |  |  |  |
| Optional photo absence | a00a6bf1af58 |  |  |  |
<!-- learner:thread-ledger:end -->

## 7. Failure → Fix → Test 관계

<!-- learner:thread-relations:start -->
| Failure/위험 | 실제 영향·root cause | Fix/결정 | Regression evidence 또는 공백 |
| --- | --- | --- | --- |
| 각 consumer의 직접 img rendering 위험 |  |  |  |
| 모든 image를 같은 loading으로 처리 |  |  |  |
<!-- learner:thread-relations:end -->

## 8. Ownership·state·responsibility 변화

<!-- learner:thread-ownership:start -->
| 단계 | Owner | 책임 변화 |
| --- | --- | --- |
| Content |  |  |
| Primitive |  |  |
| Consumer |  |  |
| Browser |  |  |
<!-- learner:thread-ownership:end -->

## 9. 최종 Thread 상태

<!-- learner:thread-final-state:start -->
- 최종 owner와 data/state/DOM boundary를 설명합니다.
- 최종 guarantee와 명시적으로 남은 non-guarantee를 설명합니다.
- 관련 후속 fix/test가 다른 category에 있으면 경계를 기록합니다.
<!-- learner:thread-final-state:end -->

## 10. 최종 실행 흐름

<!-- learner:thread-flow:start -->
1. 입력/content/state가 어디서 오는지 기록합니다.
2. Selector/helper/component/CSS owner를 실제 call order로 기록합니다.
3. Absence/failure/fallback/cleanup branch를 flow 안에 포함합니다.
4. Code 없이도 최종 흐름을 설명할 수 있게 작성합니다.
<!-- learner:thread-flow:end -->

## 11. 학습 완료 확인

<!-- learner:thread-checklist:start -->
- [ ] 모든 commit을 exact SHA diff와 resulting file 기준으로 기록했습니다.
- [ ] SHA, subject, order, importance, tags와 Thread 역할을 바꾸지 않았습니다.
- [ ] Previous state, owner, absence/failure, guarantee/non-guarantee와 later relation을 채웠습니다.
- [ ] B-level commit의 concrete role과 non-guarantee를 필요한 범위로 기록했습니다.
- [ ] 실행 상태를 사실대로 기록했습니다.
- [ ] 빈 learner-facing section을 남기지 않았습니다.
<!-- learner:thread-checklist:end -->
