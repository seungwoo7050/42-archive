# Thread: Technology stack icon, list, and marquee

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

simple-icons mapping과 handcrafted fallback, ID 기반 stack list, duplicated-track marquee, hover pause와 reduced-motion fallback을 순서대로 복원합니다.

**경계:** 이 Thread는 stack visual primitives를 다룹니다. Tech stack content schema와 `resolveTechStackItem`의 validation/fallback source, home section 전체 composition은 다른 Thread가 소유합니다.

### 고정 invariant

- Known brand icon은 typed map을 사용하고 map에 없는 supported semantic icon은 local SVG fallback을 사용합니다.
- StackList는 content ID order를 보존하고 optional limit은 앞에서부터 slice합니다.
- Marquee는 assistive technology에 동일 항목을 두 번 노출하지 않습니다.
- Continuous motion은 hover에서 pause하고 reduced-motion에서 중단됩니다.

## 2. 핵심 질문

- Partial Record를 사용한 이유와 map miss가 runtime에서 어떤 branch로 이어지는가?
- FallbackIcon의 named branches와 final generic circle이 어떤 unsupported state를 표현하는가?
- StackList가 ID를 resolver로 넘기고 color CSS variable을 만드는 responsibility chain은 무엇인가?
- Marquee가 track을 복제하면서 key와 aria-hidden을 어떻게 다르게 만드는가?
- 빈 items, 18개 초과 items, hover/reduced-motion에서 실제 contract는 무엇인가?

## 3. 완료 기준

- 각 SHA의 parent diff와 resulting tree를 구분해 실제 file/symbol/call path를 기록합니다.
- Previous state, owner, state transition, absence/failure branch, guarantee/non-guarantee를 commit별로 분리합니다.
- Fix와 test는 실제로 수정·검증하는 production path에 연결합니다.
- 실행하지 않은 command 결과를 만들지 않습니다.
- 이 Thread는 B-level commit만 포함하므로 각 commit의 concrete role, boundary, failure/non-guarantee를 필요한 범위로 기록합니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Thread 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `ebc245105c03` | feat(stack): 기술 스택 아이콘 매핑 추가 | B | RENDERER | brand icon map 도입 |
| 2 | `3d9b847d8094` | feat(stack): 기술 스택 폴백 아이콘 추가 | B | RENDERER | icon renderer와 fallback |
| 3 | `6aa8ee3b90b1` | feat(stack): 공용 기술 스택 목록 추가 | B | RENDERER | ID 기반 chip list |
| 4 | `48559efebf68` | feat(stack): 기술 스택 마키 프리미티브 추가 | B | RENDERER | 복제 track 구조 |
| 5 | `3b9c1a636356` | style(stack): 기술 스택 마키 동작 추가 | B | RENDERER | continuous motion과 fallback |

## 5. Commit별 학습 기록

### 1. `ebc245105c03` — feat(stack): 기술 스택 아이콘 매핑 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** brand icon map 도입

#### 해당 SHA에서 확인할 실제 코드

- 새 `src/components/portfolio/tech-icon.tsx`의 simple-icons imports와 `Partial<Record<TechStackIcon, SimpleIcon>>`을 확인합니다.
- Union 전체를 강제하지 않는 partial map이 후속 fallback 필요성을 어떻게 남기는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-ebc245105c03-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Tech stack item의 icon identifier를 SVG path로 바꾸는 공용 mapping이 없었습니다. |
| 실제 변경 file/symbol/call path | C/CMake/C++/Docker/ESLint/Next/Node/PostgreSQL/Prisma/React/Redis/Tailwind/TypeScript/Vitest를 simple-icons object에 매핑하는 partial record를 추가했습니다. |
| Data/state/DOM/resource owner | TechStackIcon identifier는 content/types가 소유하고, map은 brand SVG source 선택을 소유합니다. |
| Failure·absence·fallback 처리 | Map miss를 처리하는 renderer는 아직 없으므로 이 commit만으로는 icon output을 만들지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | Known brand identifiers의 source를 중앙화합니다. 모든 union member를 simple-icons가 지원한다는 보장은 의도적으로 하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | 3d9b847d8094가 map miss와 semantic icon을 처리하는 TechIcon/FallbackIcon을 추가합니다. |
<!-- learner:commit-ebc245105c03-record:end -->

#### 최소 코드 증거

<!-- learner:commit-ebc245105c03-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-ebc245105c03-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-ebc245105c03-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
<!-- learner:commit-ebc245105c03-execution:end -->

### 2. `3d9b847d8094` — feat(stack): 기술 스택 폴백 아이콘 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** icon renderer와 fallback

#### 해당 SHA에서 확인할 실제 코드

- `TechIcon`의 simpleIcon truthy branch와 fallback SVG branch를 확인합니다.
- `FallbackIcon`의 terminal/shield/check/database/flow/box/api/json/default branches를 inventory합니다.
- `aria-hidden`과 color/currentColor 사용을 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-3d9b847d8094-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Brand mapping은 있었지만 map miss를 실제 SVG로 표현하거나 public icon component로 렌더링하는 path가 없었습니다. |
| 실제 변경 file/symbol/call path | `TechIcon`은 mapped simple icon path를 채우고, miss이면 `FallbackIcon`이 named line icon 또는 generic circle/dot을 반환합니다. Outer svg는 decorative `aria-hidden`입니다. |
| Data/state/DOM/resource owner | TechIcon이 branch 선택과 SVG wrapper를, FallbackIcon이 semantic path를 소유합니다. Label text는 caller가 별도로 제공합니다. |
| Failure·absence·fallback 처리 | Unknown-to-map icon도 generic fallback으로 DOM을 만듭니다. Invalid color는 직접 검증하지 않으며 line icons는 currentColor를 사용합니다. |
| 보장하는 것과 보장하지 않는 것 | Supported union icon이 빈 자리 없이 시각 표시를 갖게 합니다. Icon만으로 accessible name을 제공하지는 않으며 caller label이 필요합니다. |
| 다음 commit 또는 관련 test 연결 | 6aa8ee3b90b1이 label과 icon을 함께 제공하는 StackList를 만듭니다. |
<!-- learner:commit-3d9b847d8094-record:end -->

#### 최소 코드 증거

<!-- learner:commit-3d9b847d8094-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-3d9b847d8094-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-3d9b847d8094-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
<!-- learner:commit-3d9b847d8094-execution:end -->

### 3. `6aa8ee3b90b1` — feat(stack): 공용 기술 스택 목록 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** ID 기반 chip list

#### 해당 SHA에서 확인할 실제 코드

- `StackList`의 optional limit branch와 `resolveTechStackItem(item)` call을 확인합니다.
- key가 raw ID인지, CSS variable color와 TechIcon/label이 어떻게 연결되는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-6aa8ee3b90b1-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Icon renderer는 있었지만 project stack ID array를 ordered chips로 바꾸는 공용 list가 없었습니다. |
| 실제 변경 file/symbol/call path | Items를 optional `slice(0, limit)`한 뒤 각 ID를 resolver로 해석하고, color CSS variable, TechIcon, label을 가진 list item을 생성합니다. |
| Data/state/DOM/resource owner | Caller가 ID order와 limit을, resolver가 canonical stack metadata를, StackList가 chip DOM을 소유합니다. |
| Failure·absence·fallback 처리 | Empty items는 빈 `<ul>`을 만듭니다. Missing ID의 처리 방식은 `resolveTechStackItem`에 위임되며 이 component가 catch하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | Content order와 limit을 보존하는 공용 chip list를 제공합니다. Resolver correctness와 duplicate ID 제거는 보장하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | 48559efebf68은 full TechStackItem array를 사용하는 별도 continuous marquee primitive를 추가합니다. |
<!-- learner:commit-6aa8ee3b90b1-record:end -->

#### 최소 코드 증거

<!-- learner:commit-6aa8ee3b90b1-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-6aa8ee3b90b1-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-6aa8ee3b90b1-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
<!-- learner:commit-6aa8ee3b90b1-execution:end -->

### 4. `48559efebf68` — feat(stack): 기술 스택 마키 프리미티브 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** 복제 track 구조

#### 해당 SHA에서 확인할 실제 코드

- `TechMarquee`의 `slice(0, 18)`과 두 `TechMarqueeTrack` call을 확인합니다.
- 두 번째 track의 `aria-hidden`과 live/ghost key prefix를 확인합니다.
- Outer aria-label, inner list semantics와 empty input behavior를 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-48559efebf68-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Static chip list만 있었고 continuous scrolling을 위한 duplicate sequence structure가 없었습니다. |
| 실제 변경 file/symbol/call path | 최대 18개를 선택해 동일 track을 두 번 렌더링합니다. 두 번째 track은 `aria-hidden`이고 key에는 ghost prefix를 사용해 React identity를 분리합니다. |
| Data/state/DOM/resource owner | TechMarquee가 visible subset과 track duplication을, each track이 list DOM을 소유합니다. CSS가 실제 movement를 소유할 예정입니다. |
| Failure·absence·fallback 처리 | 18개를 넘는 items는 잘립니다. Empty input이면 두 empty list가 남습니다. Duplicate semantic announcement는 ghost track의 aria-hidden으로 막습니다. |
| 보장하는 것과 보장하지 않는 것 | Seamless animation을 위한 DOM과 accessibility boundary를 만듭니다. 이 commit만으로는 track이 움직이지 않습니다. |
| 다음 commit 또는 관련 test 연결 | 3b9c1a636356이 continuous CSS, hover pause와 reduced-motion fallback을 추가합니다. |
<!-- learner:commit-48559efebf68-record:end -->

#### 최소 코드 증거

<!-- learner:commit-48559efebf68-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-48559efebf68-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-48559efebf68-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
<!-- learner:commit-48559efebf68-execution:end -->

### 5. `3b9c1a636356` — style(stack): 기술 스택 마키 동작 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** continuous motion과 fallback

#### 해당 SHA에서 확인할 실제 코드

- `.stack-marquee-viewport`, 두 track의 width/gap, `stack-scroll` transform을 확인합니다.
- Hover pause selector와 reduced-motion `animation: none`을 확인합니다.
- Mask/overflow가 content clipping과 visual fade를 어떻게 만드는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-3b9c1a636356-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Duplicate tracks는 정적이었고 viewport clipping, movement, pause/fallback policy가 없었습니다. |
| 실제 변경 file/symbol/call path | Viewport를 max-content flex로 만들고 각 track에 34s linear infinite animation을 적용합니다. Keyframe은 한 track 폭과 gap만큼 왼쪽 이동하며 hover에서 pause하고 reduced-motion에서 animation을 제거합니다. |
| Data/state/DOM/resource owner | CSS가 visual progression을 소유하고 DOM duplication/semantics는 component가 소유합니다. |
| Failure·absence·fallback 처리 | Reduced-motion이면 두 track이 정지해 duplicate visual rows가 나란히 남을 수 있지만 ghost track은 assistive tree에서 계속 숨겨집니다. |
| 보장하는 것과 보장하지 않는 것 | Normal motion의 continuous loop, hover pause, reduced-motion stop을 제공합니다. Exact seamless pixel continuity와 frame-rate 성능은 runtime test로 검증되지 않았습니다. |
| 다음 commit 또는 관련 test 연결 | 이 commit으로 content metadata → icon fallback → list/marquee DOM → motion policy 흐름이 완성됩니다. |
<!-- learner:commit-3b9c1a636356-record:end -->

#### 최소 코드 증거

<!-- learner:commit-3b9c1a636356-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-3b9c1a636356-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-3b9c1a636356-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
<!-- learner:commit-3b9c1a636356-execution:end -->

## 6. Invariant ledger

<!-- learner:thread-ledger:start -->
| Invariant | 도입·변경 commit | 실제 code/test evidence | 부족함이 드러난 지점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| Known brand icon | ebc245105c03 | simple-icons partial map | map miss renderer 부재 | 후속 TechIcon이 mapped path 사용 |
| Map miss fallback | 3d9b847d8094 | named SVG branches + generic circle | accessible name은 caller label 의존 | visual 빈 자리 방지 |
| Ordered stack chips | 6aa8ee3b90b1 | slice + resolveTechStackItem + key | missing ID behavior는 resolver 범위 | ID order와 limit 보존 |
| Duplicate track semantics | 48559efebf68 | live/ghost tracks, aria-hidden | empty input null 처리 없음 | 중복 시각 track을 assistive tree에서 한 번만 노출 |
| Motion fallback | 3b9c1a636356 | hover pause/reduced-motion none | browser visual performance 미검증 | continuous motion을 사용자 preference에 맞게 중단 |
<!-- learner:thread-ledger:end -->

## 7. Failure → Fix → Test 관계

<!-- learner:thread-relations:start -->
| Failure/위험 | 실제 영향·root cause | Fix/결정 | Regression evidence 또는 공백 |
| --- | --- | --- | --- |
| Partial brand map | Map miss 시 icon 부재 | 3d9b847d8094 fallback renderer | Dedicated icon snapshot/test 없음 |
| Seamless loop를 위한 duplicate DOM | Screen reader 중복 발표 위험 | 48559efebf68 ghost track aria-hidden | 정적 DOM semantics 확인; AT runtime test 없음 |
| Continuous marquee | motion sensitivity 및 interaction 방해 | 3b9c1a636356 hover pause/reduced-motion stop | CSS inspection; visual regression test 없음 |
<!-- learner:thread-relations:end -->

## 8. Ownership·state·responsibility 변화

<!-- learner:thread-ownership:start -->
| 단계 | Owner | 책임 변화 |
| --- | --- | --- |
| Content/types | stack ID, label, color, icon identifier | TechStackItem |
| TechIcon | simple-icons vs fallback SVG 선택 | decorative icon DOM |
| StackList | ID resolve, optional limit, chip DOM | static list |
| TechMarquee | 18-item cap, duplicate tracks, aria-hidden | continuous list structure |
| CSS | scroll, mask, hover pause, reduced-motion | visual behavior |
<!-- learner:thread-ownership:end -->

## 9. 최종 Thread 상태

<!-- learner:thread-final-state:start -->
- Known brand icon은 simple-icons path를, 나머지 supported icon은 named/generic fallback을 사용합니다.
- StackList는 ID order와 optional limit을 보존한 accessible text chips를 만듭니다.
- TechMarquee는 최대 18개를 live/ghost track으로 복제하고 ghost를 aria-hidden 처리합니다.
- Marquee는 normal motion에서 순환하고 hover에서 pause하며 reduced-motion에서 정지합니다.
- Missing ID validation, empty marquee suppression, runtime visual/AT test는 이 Thread에 없습니다.
<!-- learner:thread-final-state:end -->

## 10. 최종 실행 흐름

<!-- learner:thread-flow:start -->
1. Caller가 stack IDs 또는 resolved TechStackItem array를 전달합니다.
2. Static list는 resolver로 canonical metadata를 얻고, marquee는 앞 18개를 선택합니다.
3. TechIcon이 simple-icons map을 조회하고 miss이면 FallbackIcon을 선택합니다.
4. StackList는 한 list를, TechMarquee는 live/aria-hidden ghost 두 list를 렌더링합니다.
5. CSS가 color variable과 marquee movement/pause/reduced-motion을 적용합니다.
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
