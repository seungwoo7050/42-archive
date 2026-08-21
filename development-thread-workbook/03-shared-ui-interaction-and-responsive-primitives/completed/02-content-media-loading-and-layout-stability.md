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
| 직전 상태와 부족함 | Profile/project image를 여러 consumer가 직접 렌더링하면 loading mode, crop, aspect reservation과 alt 전달이 달라질 수 있었습니다. |
| 실제 변경 file/symbol/call path | `ProfilePhoto`와 `ProjectScreenshot`을 추가했습니다. Profile photo는 eager img를 사용하고, screenshot은 `priority=false` 기본값에서 lazy, true에서 eager를 사용합니다. Screenshot `<img>`는 16:10 aspect와 object-fit crop을, figure wrapper는 overflow와 frame을 고정합니다. |
| Data/state/DOM/resource owner | Content image object가 src/alt를 소유하고 primitive가 DOM attributes와 presentation frame을 소유합니다. Browser가 실제 image request와 decode lifetime을 소유합니다. |
| Failure·absence·fallback 처리 | Image load error를 대체하는 state나 callback은 없습니다. Invalid src/alt는 이 component가 검증하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | Shared loading/layout contract를 만듭니다. Responsive source selection, framework Image optimization, width/height 기반 intrinsic sizing은 보장하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | b027f42669aa와 06fff9a6e93b가 priority consumer를, cabf3a0e378f가 lazy gallery consumer를 연결합니다. |
<!-- learner:commit-aa115c73ae30-record:end -->

#### 최소 코드 증거

<!-- learner:commit-aa115c73ae30-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-aa115c73ae30-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-aa115c73ae30-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
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
| 직전 상태와 부족함 | Shared screenshot primitive는 있었지만 home showcase가 어떤 media를 eager 처리할지 결정하지 않았습니다. |
| 실제 변경 file/symbol/call path | Design home이 featured selector의 lead project를 조건부로 잡아 `ProjectScreenshot`에 `priority`를 전달합니다. |
| Data/state/DOM/resource owner | Home route가 above-the-fold priority 결정을 소유하고 primitive가 loading attribute로 변환합니다. |
| Failure·absence·fallback 처리 | Lead project가 없으면 해당 screenshot branch가 렌더링되지 않습니다. Broken image fallback은 없습니다. |
| 보장하는 것과 보장하지 않는 것 | Home lead screenshot이 eager loading과 shared aspect/frame contract를 사용합니다. 다른 featured image까지 모두 eager라는 보장은 이 commit만으로는 없습니다. |
| 다음 commit 또는 관련 test 연결 | 06fff9a6e93b가 detail hero에도 같은 priority contract를 적용합니다. |
<!-- learner:commit-b027f42669aa-record:end -->

#### 최소 코드 증거

<!-- learner:commit-b027f42669aa-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-b027f42669aa-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-b027f42669aa-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
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
| 직전 상태와 부족함 | Project detail view와 그 hero media consumer가 없었습니다. |
| 실제 변경 file/symbol/call path | `ProjectDetailView`가 content summary/description/actions 옆에 `ProjectScreenshot image={project.screenshot} priority`를 배치합니다. |
| Data/state/DOM/resource owner | Detail view가 hero placement와 priority를, primitive가 frame/loading을 소유합니다. |
| Failure·absence·fallback 처리 | Project가 존재한다는 전제에서 view가 호출됩니다. 이 component에는 missing screenshot fallback이 없습니다. |
| 보장하는 것과 보장하지 않는 것 | 상세 첫 화면 media는 eager이고 shared aspect/frame contract를 사용합니다. Detail routing/not-found와 data validation은 다른 layer의 책임입니다. |
| 다음 commit 또는 관련 test 연결 | cabf3a0e378f가 같은 view에 evidence gallery를 추가하면서 default lazy behavior를 대조시킵니다. |
<!-- learner:commit-06fff9a6e93b-record:end -->

#### 최소 코드 증거

<!-- learner:commit-06fff9a6e93b-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-06fff9a6e93b-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-06fff9a6e93b-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
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
| 직전 상태와 부족함 | Detail hero 한 장만 표현됐고 추가 evidence screenshots를 순서대로 보여 주는 gallery가 없었습니다. |
| 실제 변경 file/symbol/call path | Architecture section과 screenshots section을 추가하고 `project.screenshots.map`에서 default ProjectScreenshot을 사용합니다. |
| Data/state/DOM/resource owner | Content array가 evidence order를 소유하고 detail view가 반복을 소유합니다. Primitive 기본값이 lazy loading을 결정합니다. |
| Failure·absence·fallback 처리 | 빈 screenshots 배열이면 map 결과가 비어 있지만 section wrapper 자체는 남습니다. Per-image error fallback은 없습니다. |
| 보장하는 것과 보장하지 않는 것 | Hero eager/gallery lazy라는 소비 차이를 만듭니다. Viewport 기반 custom prefetch나 concurrency control은 없습니다. |
| 다음 commit 또는 관련 test 연결 | a00a6bf1af58은 다른 optional media인 profile photo의 consumer contract를 완성합니다. |
<!-- learner:commit-cabf3a0e378f-record:end -->

#### 최소 코드 증거

<!-- learner:commit-cabf3a0e378f-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-cabf3a0e378f-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-cabf3a0e378f-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
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
| 직전 상태와 부족함 | ProfilePhoto primitive는 있었지만 About hero가 photo field를 소비하지 않아 optional profile media contract가 실제 route에서 완결되지 않았습니다. |
| 실제 변경 file/symbol/call path | About hero를 text/photo grid로 바꾸고 photo가 있을 때만 ProfilePhoto를 렌더링합니다. ContentHint path도 photo를 포함합니다. |
| Data/state/DOM/resource owner | Profile content가 presence를 소유하고 About page가 conditional composition을 소유합니다. ProfilePhoto가 img DOM을 소유합니다. |
| Failure·absence·fallback 처리 | Photo가 없으면 null이며 빈 frame이나 synthetic fallback을 만들지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | Optional profile photo가 About route에서 안전하게 소비됩니다. Image load 실패나 alt quality는 여전히 content/브라우저 범위입니다. |
| 다음 commit 또는 관련 test 연결 | 이 commit으로 primitive 생성 → lead/detail/gallery/profile consumer 연결이 모두 확인됩니다. |
<!-- learner:commit-a00a6bf1af58-record:end -->

#### 최소 코드 증거

<!-- learner:commit-a00a6bf1af58-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-a00a6bf1af58-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-a00a6bf1af58-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
<!-- learner:commit-a00a6bf1af58-execution:end -->

## 6. Invariant ledger

<!-- learner:thread-ledger:start -->
| Invariant | 도입·변경 commit | 실제 code/test evidence | 부족함이 드러난 지점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| Media metadata 보존 | aa115c73ae30 | ProfilePhoto/ProjectScreenshot의 src·alt 전달 | content validation 없음 | primitive가 원본 metadata를 그대로 DOM에 전달 |
| Above-the-fold priority | b027f42669aa, 06fff9a6e93b | priority prop → eager loading | 실제 network priority 측정 없음 | home/detail hero가 eager를 명시 |
| Evidence gallery lazy default | cabf3a0e378f | priority 없는 ProjectScreenshot 반복 | 빈 section wrapper는 남음 | gallery image는 lazy attribute 사용 |
| Optional photo absence | a00a6bf1af58 | conditional ProfilePhoto | load error fallback 없음 | photo field 부재 시 media DOM 생략 |
<!-- learner:thread-ledger:end -->

## 7. Failure → Fix → Test 관계

<!-- learner:thread-relations:start -->
| Failure/위험 | 실제 영향·root cause | Fix/결정 | Regression evidence 또는 공백 |
| --- | --- | --- | --- |
| 각 consumer의 직접 img rendering 위험 | loading/crop/alt handling 불일치 | aa115c73ae30 shared primitive | 후속 consumer diff로 사용 확인; dedicated test는 없음 |
| 모든 image를 같은 loading으로 처리 | hero 지연 또는 gallery 과도 eager 가능 | priority prop과 consumer별 선택 | 정적 attribute path만 확인; network 성능 test 없음 |
<!-- learner:thread-relations:end -->

## 8. Ownership·state·responsibility 변화

<!-- learner:thread-ownership:start -->
| 단계 | Owner | 책임 변화 |
| --- | --- | --- |
| Content | Image src/alt와 optional presence | Project/profile data object |
| Primitive | img attributes, frame, crop, loading mapping | ProfilePhoto / ProjectScreenshot |
| Consumer | 어디에 배치하고 priority를 켤지 | Home, ProjectDetailView, About |
| Browser | 실제 fetch/decode/error rendering | Application code가 lifetime을 직접 관리하지 않음 |
<!-- learner:thread-ownership:end -->

## 9. 최종 Thread 상태

<!-- learner:thread-final-state:start -->
- ProfilePhoto와 ProjectScreenshot이 raw content media를 공통 DOM contract로 렌더링합니다.
- Home lead와 detail hero는 priority로 eager를 선택하고 detail gallery는 기본 lazy를 사용합니다.
- Screenshot `<img>`의 16:10 aspect ratio가 높이를 계산하게 하고 figure wrapper가 overflow/frame을, image가 object-fit crop을 적용합니다.
- Optional profile photo는 absence 시 완전히 생략됩니다.
- Error fallback, responsive source set, image optimization과 runtime performance measurement는 이 Thread에 없습니다.
<!-- learner:thread-final-state:end -->

## 10. 최종 실행 흐름

<!-- learner:thread-flow:start -->
1. Content loader가 profile/project image metadata를 제공합니다.
2. Route/view가 media presence와 above-the-fold 여부를 판단합니다.
3. Consumer가 ProfilePhoto 또는 ProjectScreenshot과 optional priority를 호출합니다.
4. Primitive가 frame과 img attributes를 생성합니다.
5. Browser가 eager/lazy hint에 따라 resource를 요청하고 decode합니다.
<!-- learner:thread-flow:end -->

## 11. 학습 완료 확인

<!-- learner:thread-checklist:start -->
- [x] 모든 commit을 exact SHA diff와 resulting file 기준으로 기록했습니다.
- [x] SHA, subject, order, importance, tags와 Thread 역할을 frozen scaffold와 동일하게 유지했습니다.
- [x] Previous state, owner, absence/failure, guarantee/non-guarantee와 later relation을 채웠습니다.
- [x] 이 Thread에는 S/A-level commit이 없으며 B-level 범위에서 repository-specific depth를 유지했습니다.
- [x] 실행 상태를 사실대로 기록했습니다: runtime command는 실행하지 않았고 정적 검토와 구분했습니다.
- [x] 빈 learner-facing answer cell을 남기지 않았습니다.
<!-- learner:thread-checklist:end -->
