# Thread: Project card composition and interaction

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

AvailabilityBadge와 ProjectCard가 screenshot, stack, highlights, action links를 어떻게 조립하고, featured consumer 및 hover/reduced-motion 표현까지 확장되는지 복원합니다.

**경계:** Phase 1에서 기존 `project-card-actions-and-evidence-components` Thread의 link-policy commits를 01 Thread로 이동했습니다. 이 Thread는 card composition과 interaction만 소유하며 link placement/transport는 01 Thread의 selector·renderer를 소비합니다.

### 고정 invariant

- Badge 표시 여부와 tone은 deployment data에서 파생되고 showBadge=false이면 DOM을 만들지 않습니다.
- ProjectCard는 evidence primitives를 조립하지만 link availability와 transport를 다시 구현하지 않습니다.
- Case-study primary navigation은 current template/debug state를 보존합니다.
- Featured/default variant는 layout와 stack limit만 바꾸고 data semantics는 바꾸지 않습니다.
- Hover overlay는 pointer event를 가로채지 않고 reduced-motion에서는 card transform/transition이 제거됩니다.

## 2. 핵심 질문

- AvailabilityBadge가 showBadge, status tone, `isProjectLive`를 어떻게 조합하는가?
- ProjectCard가 직접 만드는 case-study link와 ProjectCardLinks action group의 책임 차이는 무엇인가?
- featured variant가 screenshot priority, grid, stack limit, highlights count에 미치는 영향은 무엇인가?
- Design featured section이 몇 개의 card를 어떤 variant로 소비하는가?
- CSS pseudo overlay가 interaction을 방해하지 않도록 하는 rule과 reduced-motion fallback은 무엇인가?

## 3. 완료 기준

- 각 SHA의 parent diff와 resulting tree를 구분해 실제 file/symbol/call path를 기록합니다.
- Previous state, owner, state transition, absence/failure branch, guarantee/non-guarantee를 commit별로 분리합니다.
- Fix와 test는 실제로 수정·검증하는 production path에 연결합니다.
- 실행하지 않은 command 결과를 만들지 않습니다.
- 이 Thread는 B-level commit만 포함하므로 각 commit의 concrete role, boundary, failure/non-guarantee를 필요한 범위로 기록합니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Thread 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `53ca0860ef3a` | feat(project): 프로젝트 배포 상태 배지 추가 | B | RENDERER | availability badge primitive |
| 2 | `b72c52a22690` | feat(project): 프로젝트 카드 프리미티브 추가 | B | RENDERER | card composition owner |
| 3 | `07dd465dbe20` | feat(home): 디자인 대표 프로젝트 섹션 추가 | B | RENDERER | featured section consumer |
| 4 | `4000a8657a62` | style(project): 프로젝트 카드 상호작용 추가 | B | RENDERER | hover/overlay와 motion fallback |

## 5. Commit별 학습 기록

### 1. `53ca0860ef3a` — feat(project): 프로젝트 배포 상태 배지 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** availability badge primitive

#### 해당 SHA에서 확인할 실제 코드

- 새 `availability-badge.tsx`의 early null, statusTone lookup, default tone과 live dot branch를 확인합니다.
- `isProjectLive`가 badge label이 아니라 dot만 제어하는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-53ca0860ef3a-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-53ca0860ef3a-record:end -->

#### 최소 코드 증거

<!-- learner:commit-53ca0860ef3a-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-53ca0860ef3a-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-53ca0860ef3a-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-53ca0860ef3a-execution:end -->

### 2. `b72c52a22690` — feat(project): 프로젝트 카드 프리미티브 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** card composition owner

#### 해당 SHA에서 확인할 실제 코드

- 새 `project-card.tsx`의 `caseStudyHref`, featured branch와 child primitive calls를 확인합니다.
- Screenshot/title가 같은 internal route를 가리키는지, action group은 `ProjectCardLinks`에 위임되는지 확인합니다.
- Stack limit 6/4, highlight slice 2, priority propagation을 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-b72c52a22690-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-b72c52a22690-record:end -->

#### 최소 코드 증거

<!-- learner:commit-b72c52a22690-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-b72c52a22690-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-b72c52a22690-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-b72c52a22690-execution:end -->

### 3. `07dd465dbe20` — feat(home): 디자인 대표 프로젝트 섹션 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** featured section consumer

#### 해당 SHA에서 확인할 실제 코드

- `FeaturedProjectsSection`의 section gate와 project slices를 확인합니다.
- 첫 project는 featured variant, 다음 두 project는 default인지와 모든 card에 priority가 전달되는지 확인합니다.
- Reveal wrapper와 SectionHeading이 card primitive의 책임과 섞이지 않는지 구분합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-07dd465dbe20-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-07dd465dbe20-record:end -->

#### 최소 코드 증거

<!-- learner:commit-07dd465dbe20-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-07dd465dbe20-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-07dd465dbe20-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-07dd465dbe20-execution:end -->

### 4. `4000a8657a62` — style(project): 프로젝트 카드 상호작용 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** hover/overlay와 motion fallback

#### 해당 SHA에서 확인할 실제 코드

- `.motion-card`, `.project-card::before`, `.project-screenshot::after`와 hover selectors를 확인합니다.
- Pseudo-elements의 `pointer-events: none`, children z-index와 reduced-motion transform/transition neutralization을 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-4000a8657a62-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-4000a8657a62-record:end -->

#### 최소 코드 증거

<!-- learner:commit-4000a8657a62-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-4000a8657a62-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-4000a8657a62-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-4000a8657a62-execution:end -->

## 6. Invariant ledger

<!-- learner:thread-ledger:start -->
| Invariant | 도입·변경 commit | 실제 code/test evidence | 부족함이 드러난 지점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| Badge absence/tone | 53ca0860ef3a |  |  |  |
| Card composition | b72c52a22690 |  |  |  |
| Featured consumption | 07dd465dbe20 |  |  |  |
| Non-blocking interaction | 4000a8657a62 |  |  |  |
<!-- learner:thread-ledger:end -->

## 7. Failure → Fix → Test 관계

<!-- learner:thread-relations:start -->
| Failure/위험 | 실제 영향·root cause | Fix/결정 | Regression evidence 또는 공백 |
| --- | --- | --- | --- |
| Card가 link policy를 직접 소유할 위험 |  |  |  |
| Decorative overlay가 click target을 가릴 위험 |  |  |  |
| Hover lift가 reduced-motion을 무시 |  |  |  |
<!-- learner:thread-relations:end -->

## 8. Ownership·state·responsibility 변화

<!-- learner:thread-ownership:start -->
| 단계 | Owner | 책임 변화 |
| --- | --- | --- |
| Content/selectors |  |  |
| AvailabilityBadge |  |  |
| ProjectCard |  |  |
| Home section |  |  |
| CSS |  |  |
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
