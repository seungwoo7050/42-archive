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
| 직전 상태와 부족함 | Project card/detail에서 deployment label과 availability tone을 일관되게 표현하는 primitive가 없었습니다. |
| 실제 변경 file/symbol/call path | `AvailabilityBadge`가 `showBadge` false면 null을 반환하고 status별 class tone을 선택합니다. `isProjectLive`인 경우에만 accent dot을 추가하고 content label을 표시합니다. |
| Data/state/DOM/resource owner | Deployment data가 status/showBadge/label을, badge component가 tone과 dot DOM을 소유합니다. Live 의미 자체는 selector가 소유합니다. |
| Failure·absence·fallback 처리 | Unknown status는 source-only tone으로 fallback합니다. showBadge false면 label도 렌더링하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | Deployment badge의 absence/tone/live indicator를 공통화합니다. Status validation과 actual endpoint health는 보장하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | b72c52a22690이 ProjectCard 안에서 badge를 소비합니다. |
<!-- learner:commit-53ca0860ef3a-record:end -->

#### 최소 코드 증거

<!-- learner:commit-53ca0860ef3a-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-53ca0860ef3a-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-53ca0860ef3a-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
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
| 직전 상태와 부족함 | Badge, screenshot, stack list와 action link primitive는 있었지만 project evidence를 한 card contract로 조립하는 component가 없었습니다. |
| 실제 변경 file/symbol/call path | `ProjectCard`가 template/debug-aware case-study href를 만들고 screenshot/title link, ContentHint, category, AvailabilityBadge, summary, StackList, first two highlights, ProjectCardLinks를 조립합니다. Featured variant는 two-column layout과 stack limit 6을 사용하고 default는 limit 4입니다. |
| Data/state/DOM/resource owner | Card가 composition/layout variant와 primary detail route를 소유합니다. Badge, screenshot, stack, action selection/transport는 각 child owner에 위임됩니다. |
| Failure·absence·fallback 처리 | ProjectCard 자체는 missing project field를 검사하지 않습니다. Action links가 비어도 primary screenshot/title case-study navigation은 존재합니다. |
| 보장하는 것과 보장하지 않는 것 | 일관된 project evidence card를 제공합니다. Content validity, detail route existence, link placement rules을 재정의하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | 07dd465dbe20이 실제 Design home section에서 featured/default variants를 소비하고 4000a8657a62가 interaction CSS를 추가합니다. |
<!-- learner:commit-b72c52a22690-record:end -->

#### 최소 코드 증거

<!-- learner:commit-b72c52a22690-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-b72c52a22690-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-b72c52a22690-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
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
| 직전 상태와 부족함 | ProjectCard는 있었지만 Design home presentation config가 featured section을 켤 때 실제 card hierarchy를 만드는 consumer가 없었습니다. |
| 실제 변경 file/symbol/call path | Section key가 enabled일 때 first project를 featured variant로, 다음 두 project를 two-column default cards로 렌더링합니다. 세 card 모두 `priority`를 전달하고 Reveal로 감쌉니다. |
| Data/state/DOM/resource owner | Presentation config가 section presence를, home section이 ranking/slice/layout을, card가 내부 evidence composition을 소유합니다. |
| Failure·absence·fallback 처리 | Featured projects가 0~2개여도 map은 가능한 항목만 렌더링합니다. Empty일 때 section heading/wrapper는 남을 수 있습니다. |
| 보장하는 것과 보장하지 않는 것 | Top three featured projects의 card composition을 실제 route에 연결합니다. 모든 project image를 lazy로 유지하거나 empty section을 숨기는 것은 보장하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | 4000a8657a62가 card class를 이용한 hover/overlay behavior를 추가합니다. |
<!-- learner:commit-07dd465dbe20-record:end -->

#### 최소 코드 증거

<!-- learner:commit-07dd465dbe20-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-07dd465dbe20-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-07dd465dbe20-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
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
| 직전 상태와 부족함 | Card markup은 있었지만 lift, ambient overlay, screenshot sheen과 reduced-motion-specific interaction fallback이 없었습니다. |
| 실제 변경 file/symbol/call path | Motion card hover에서 translateY, project card와 screenshot pseudo-element opacity transition을 추가했습니다. Overlay는 pointer-events none이고 real children은 z-index 1입니다. Reduced-motion에서 motion-card transform과 transition을 제거합니다. |
| Data/state/DOM/resource owner | CSS가 transient interaction 표현을 소유하고 semantic links/buttons는 기존 DOM이 소유합니다. |
| Failure·absence·fallback 처리 | Pointer events를 pseudo overlay가 가로채지 않습니다. Reduced-motion은 transform/transition을 끄지만 color hover class 등 비-motion feedback은 남을 수 있습니다. |
| 보장하는 것과 보장하지 않는 것 | Card interaction을 강화하면서 click targets와 motion preference를 보존합니다. Keyboard-specific visual regression이나 browser compositing 성능은 검증하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | 이 Thread의 최종 card path는 shared child primitives + surface consumer + non-blocking CSS overlay입니다. |
<!-- learner:commit-4000a8657a62-record:end -->

#### 최소 코드 증거

<!-- learner:commit-4000a8657a62-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-4000a8657a62-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-4000a8657a62-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
<!-- learner:commit-4000a8657a62-execution:end -->

## 6. Invariant ledger

<!-- learner:thread-ledger:start -->
| Invariant | 도입·변경 commit | 실제 code/test evidence | 부족함이 드러난 지점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| Badge absence/tone | 53ca0860ef3a | showBadge null, statusTone default, live dot | actual service health 미검증 | deployment presentation을 일관되게 표현 |
| Card composition | b72c52a22690 | ProjectCard child call graph | content validity는 외부 | evidence primitives를 한 component로 조립 |
| Featured consumption | 07dd465dbe20 | first/next slices와 variants | empty section suppression 없음 | Design home top-three hierarchy |
| Non-blocking interaction | 4000a8657a62 | pointer-events none, z-index, reduced-motion | visual/browser test 없음 | hover overlay가 links를 가리지 않음 |
<!-- learner:thread-ledger:end -->

## 7. Failure → Fix → Test 관계

<!-- learner:thread-relations:start -->
| Failure/위험 | 실제 영향·root cause | Fix/결정 | Regression evidence 또는 공백 |
| --- | --- | --- | --- |
| Card가 link policy를 직접 소유할 위험 | 01 Thread와 중복·불일치 | b72c52a22690은 ProjectCardLinks를 소비만 함 | 09cec616f314이 child link contract를 검증 |
| Decorative overlay가 click target을 가릴 위험 | hover 시 navigation 불가 | 4000a8657a62 pointer-events none + child z-index | 정적 CSS 확인; browser hit-test 미실행 |
| Hover lift가 reduced-motion을 무시 | motion sensitivity | 4000a8657a62 motion-card neutralization | Global a11y policy는 03 Thread에서 추가 보강 |
<!-- learner:thread-relations:end -->

## 8. Ownership·state·responsibility 변화

<!-- learner:thread-ownership:start -->
| 단계 | Owner | 책임 변화 |
| --- | --- | --- |
| Content/selectors | Deployment status, featured ordering, link actions | Card가 의미를 재계산하지 않음 |
| AvailabilityBadge | Badge DOM/tone/live dot | Optional status indicator |
| ProjectCard | Evidence composition, primary route, variant layout | Shared child primitives 호출 |
| Home section | Top project slicing과 card variant 선택 | Surface-level composition |
| CSS | Hover lift/overlays/reduced-motion | Semantic interaction을 가리지 않음 |
<!-- learner:thread-ownership:end -->

## 9. 최종 Thread 상태

<!-- learner:thread-final-state:start -->
- ProjectCard는 badge, screenshot, stack, highlights와 action links를 공통 구조로 조립합니다.
- Screenshot와 title은 template/debug-aware case-study route를 직접 제공합니다.
- Action link visibility/transport는 01 Thread의 ProjectCardLinks/ContentLinkView에 위임됩니다.
- Design featured section은 첫 card를 featured, 다음 두 card를 default로 사용합니다.
- Hover overlays는 pointer event를 받지 않고 reduced-motion에서 lift/transition을 제거합니다.
<!-- learner:thread-final-state:end -->

## 10. 최종 실행 흐름

<!-- learner:thread-flow:start -->
1. Home consumer가 featured projects를 순서대로 선택하고 card variant/priority를 정합니다.
2. ProjectCard가 project data로 primary case-study URL을 만듭니다.
3. Card가 AvailabilityBadge, ProjectScreenshot, StackList, highlights, ProjectCardLinks를 조립합니다.
4. 각 child primitive가 자기 정책/DOM을 처리합니다.
5. CSS가 hover overlay와 lift를 적용하되 pointer events를 통과시키고 reduced-motion에서 movement를 제거합니다.
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
