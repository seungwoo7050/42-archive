# Thread: Journey timeline primitives and responsive layout

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

Journey item의 period formatting과 optional case-study link, compact/paired variants, odd-row handling, desktop centerline과 mobile single-column collapse를 실제 history로 복원합니다.

**경계:** 이 Thread는 journey presentation primitive와 responsive CSS를 다룹니다. Journey JSON schema/validation, route section copy, Reveal의 최종 server-first refactor는 각각 content system과 03 Thread가 소유합니다.

### 고정 invariant

- Journey source order는 유지되고 첫 item만 paired timeline의 start card로 분리됩니다.
- 나머지 items는 두 개씩 묶이며 마지막 홀수 item은 단독 row로 손실 없이 렌더링됩니다.
- projectId가 있는 item만 template/debug-aware case-study link를 가집니다.
- Mobile은 같은 semantic ordered list를 단일 column으로 재배치하며 item order를 바꾸지 않습니다.
- Animated flag는 wrapper 선택만 바꾸고 journey data semantics는 바꾸지 않습니다.

## 2. 핵심 질문

- `formatYearMonth`가 ISO date를 검증하지 않고 어떤 substring transform만 수행하는가?
- 첫 item과 projectItems 분리, `chunkPairs`, `is-single` class가 empty/one/even/odd input을 어떻게 처리하는가?
- Compact와 paired variants에서 Reveal wrapper 위치와 delay 계산은 어떻게 다른가?
- Desktop centerline의 three-column grid가 mobile에서 같은 DOM을 어떻게 flatten하는가?
- 03 Thread의 server-first Reveal 전환이 animated flag의 최종 의미를 어떻게 약화시키는가?

## 3. 완료 기준

- 각 SHA의 parent diff와 resulting tree를 구분해 실제 file/symbol/call path를 기록합니다.
- Previous state, owner, state transition, absence/failure branch, guarantee/non-guarantee를 commit별로 분리합니다.
- Fix와 test는 실제로 수정·검증하는 production path에 연결합니다.
- 실행하지 않은 command 결과를 만들지 않습니다.
- 이 Thread는 B-level commit만 포함하므로 각 commit의 concrete role, boundary, failure/non-guarantee를 필요한 범위로 기록합니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Thread 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `f60edf14dae0` | feat(journey): 여정 날짜와 카드 프리미티브 추가 | B | RENDERER | entry/card 기반 도입 |
| 2 | `3c0a1154ba08` | feat(journey): 중앙선 여정 목록 추가 | B | RENDERER | paired timeline composition |
| 3 | `b3182e35aed0` | feat(journey): 여정 목록 변형 연결 | B | RENDERER | public variant dispatcher |
| 4 | `377fa128f82b` | style(journey): 여정 타임라인 시각 계층 추가 | B | RENDERER | compact guide/node 표현 |
| 5 | `7995a3cf5435` | style(journey): 데스크톱 중앙선 여정 구성 | B | RENDERER | desktop centerline geometry |
| 6 | `6394188022fd` | style(journey): 모바일 중앙선 여정 구성 | B | RENDERER | mobile single-column collapse |

## 5. Commit별 학습 기록

### 1. `f60edf14dae0` — feat(journey): 여정 날짜와 카드 프리미티브 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** entry/card 기반 도입

#### 해당 SHA에서 확인할 실제 코드

- `journey-list.tsx`의 `formatYearMonth`, `getJourneyPeriod`, `JourneyEntry`, `JourneyCard`, `chunkPairs`를 확인합니다.
- endDate absence/equality, projectId absence, pair slicing의 boundary를 각각 추적합니다.
- `getTemplateHref`에 homeTemplate/contentDebug가 전달되는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-f60edf14dae0-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Journey item을 공통 날짜/본문/card 구조로 표현하거나 두 개씩 묶는 primitive가 없었습니다. |
| 실제 변경 file/symbol/call path | Date를 YYYY.MM으로 자르고, 동일하거나 없는 endDate는 단일 period, 다른 endDate는 range로 만듭니다. Entry는 category/title/body와 optional project link를 렌더링하고 JourneyCard가 paired card wrapper를 제공합니다. `chunkPairs`는 index를 2씩 증가해 slice합니다. |
| Data/state/DOM/resource owner | Journey data가 date/endDate/projectId를 소유하고 helper가 display string/pair array를 파생합니다. Entry가 semantic content와 optional link를 소유합니다. |
| Failure·absence·fallback 처리 | projectId가 없으면 link는 null입니다. Date format은 `slice(0, 7)` 전제이며 invalid/short input을 reject하지 않습니다. Empty array의 chunk result는 empty입니다. |
| 보장하는 것과 보장하지 않는 것 | Period, optional link, pair chunking의 공통 기반을 제공합니다. Full date validation이나 projectId referential integrity는 보장하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | 3c0a1154ba08이 first item + paired rows composition을 추가합니다. |
<!-- learner:commit-f60edf14dae0-record:end -->

#### 최소 코드 증거

<!-- learner:commit-f60edf14dae0-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-f60edf14dae0-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-f60edf14dae0-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
<!-- learner:commit-f60edf14dae0-execution:end -->

### 2. `3c0a1154ba08` — feat(journey): 중앙선 여정 목록 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** paired timeline composition

#### 해당 SHA에서 확인할 실제 코드

- `PairedJourneyList`의 `[startItem, ...projectItems]`, `chunkPairs`, first-item branch를 확인합니다.
- Pair length 1 class, middle node, optional second card와 key 생성 방식을 확인합니다.
- animated true/false에서 element type과 delay가 어떻게 달라지는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-3c0a1154ba08-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Entry/card helper는 있었지만 첫 milestone을 중심 start로 두고 나머지를 paired centerline rows로 만드는 semantic list가 없었습니다. |
| 실제 변경 file/symbol/call path | 첫 item을 start card로 분리하고 나머지를 pairs로 만듭니다. Pair가 하나뿐이면 `is-single`, second item이 있으면 center node 뒤에 두 번째 card를 둡니다. Animated mode에서는 start/rows를 `Reveal as="li"`로, 아니면 plain li로 렌더링합니다. |
| Data/state/DOM/resource owner | PairedJourneyList가 item grouping, row identity와 animation delay를 소유합니다. JourneyCard는 entry representation을 재사용합니다. |
| Failure·absence·fallback 처리 | Empty input이면 start와 rows 모두 없어 empty `<ol>`이 남습니다. Odd tail은 is-single row로 손실 없이 남고 node는 DOM에 있지만 CSS가 숨길 수 있습니다. |
| 보장하는 것과 보장하지 않는 것 | First milestone와 paired rows의 source order 및 odd-tail preservation을 보장합니다. Desktop/mobile geometry는 아직 없습니다. |
| 다음 commit 또는 관련 test 연결 | b3182e35aed0이 public variant dispatcher를, 7995a3cf5435·6394188022fd가 geometry를 추가합니다. |
<!-- learner:commit-3c0a1154ba08-record:end -->

#### 최소 코드 증거

<!-- learner:commit-3c0a1154ba08-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-3c0a1154ba08-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-3c0a1154ba08-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
<!-- learner:commit-3c0a1154ba08-execution:end -->

### 3. `b3182e35aed0` — feat(journey): 여정 목록 변형 연결

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** public variant dispatcher

#### 해당 SHA에서 확인할 실제 코드

- Exported `JourneyList`의 defaults와 paired-centerline early return을 확인합니다.
- Compact rows의 animated/plain branches와 outer Reveal wrapper 차이를 확인합니다.
- Index-based delay와 stable key가 source order에 어떻게 연결되는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-b3182e35aed0-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Paired renderer는 내부 함수였고 기존 compact list와 하나의 public API에서 선택할 variant contract가 없었습니다. |
| 실제 변경 file/symbol/call path | `JourneyList`가 default compact, optional paired-centerline, animated flag를 받습니다. Paired이면 전용 component에 위임하고, compact이면 각 row를 Reveal/plain li로 만든 뒤 animated일 때 list 전체도 Reveal wrapper로 감쌉니다. |
| Data/state/DOM/resource owner | Public component가 variant dispatch를 소유하고 각 variant가 DOM geometry를 소유합니다. Data order는 caller array와 map order가 소유합니다. |
| Failure·absence·fallback 처리 | Unknown variant는 TypeScript union 밖이며 runtime에서는 compact branch로 떨어집니다. Empty compact input도 empty ordered list wrapper를 반환합니다. |
| 보장하는 것과 보장하지 않는 것 | 한 API로 compact/paired 및 animation wrapper를 선택합니다. Variant-specific responsive style은 후속 CSS가 필요합니다. |
| 다음 commit 또는 관련 test 연결 | 377fa128f82b가 compact timeline visual hierarchy를, 7995a3cf5435/6394188022fd가 paired responsive layout을 추가합니다. |
<!-- learner:commit-b3182e35aed0-record:end -->

#### 최소 코드 증거

<!-- learner:commit-b3182e35aed0-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-b3182e35aed0-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-b3182e35aed0-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
<!-- learner:commit-b3182e35aed0-execution:end -->

### 4. `377fa128f82b` — style(journey): 여정 타임라인 시각 계층 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** compact guide/node 표현

#### 해당 SHA에서 확인할 실제 코드

- `.timeline-list` gutter/x variables, guide pseudo-element와 `.experience-row::before`를 확인합니다.
- `is-visible` class가 guide scaleY와 node opacity/scale를 어떻게 바꾸는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-377fa128f82b-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Compact ordered list에는 semantic rows만 있고 vertical guide와 per-row node visual hierarchy가 없었습니다. |
| 실제 변경 file/symbol/call path | Timeline wrapper에 vertical gradient guide와 row pseudo nodes를 추가하고 `is-visible`에 맞춰 scale/opacity transition을 적용했습니다. |
| Data/state/DOM/resource owner | CSS가 visual guide/node를 소유하고 ordered list/entry semantics는 component가 소유합니다. |
| Failure·absence·fallback 처리 | Guide/node는 pseudo-elements라 accessibility tree에 추가되지 않습니다. Reveal class가 visible 전환을 제공한다는 당시 전제에 의존합니다. |
| 보장하는 것과 보장하지 않는 것 | Compact timeline의 시각적 연결을 제공합니다. Server-first Reveal 전환 뒤에는 entry-on-viewport timing을 보장하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | 29bb40579cb2/af9191fc15ad의 reduced-motion 정책과 b8164cfdddbd의 server-first refactor가 cross-thread로 이 class behavior를 바꿉니다. |
<!-- learner:commit-377fa128f82b-record:end -->

#### 최소 코드 증거

<!-- learner:commit-377fa128f82b-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-377fa128f82b-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-377fa128f82b-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
<!-- learner:commit-377fa128f82b-execution:end -->

### 5. `7995a3cf5435` — style(journey): 데스크톱 중앙선 여정 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** desktop centerline geometry

#### 해당 SHA에서 확인할 실제 코드

- `.paired-timeline::before`, start marker/card, three-column row와 center node를 확인합니다.
- `.is-single` row가 one-column centered card로 바뀌고 node를 숨기는 rule을 확인합니다.
- Classic template의 card shadow override를 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-7995a3cf5435-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Paired DOM은 있었지만 centerline, first milestone, two-sided card grid와 odd-tail layout이 시각적으로 정의되지 않았습니다. |
| 실제 변경 file/symbol/call path | 50% centerline, centered start card/marker, `1fr 2.25rem 1fr` row grid, center node를 추가합니다. Single row는 one-column centered max-width card가 되고 node는 display none입니다. |
| Data/state/DOM/resource owner | CSS가 desktop geometry와 visual centerline을 소유합니다. DOM grouping/order는 PairedJourneyList가 소유합니다. |
| Failure·absence·fallback 처리 | Odd tail은 centerline 양쪽을 억지로 채우지 않고 centered single card가 됩니다. Narrow viewport fallback은 아직 없습니다. |
| 보장하는 것과 보장하지 않는 것 | Desktop에서 first + paired + single-tail hierarchy를 보장합니다. Small-screen readability는 다음 commit이 처리합니다. |
| 다음 commit 또는 관련 test 연결 | 6394188022fd가 767px 이하에서 같은 DOM을 single-column timeline으로 collapse합니다. |
<!-- learner:commit-7995a3cf5435-record:end -->

#### 최소 코드 증거

<!-- learner:commit-7995a3cf5435-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-7995a3cf5435-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-7995a3cf5435-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
<!-- learner:commit-7995a3cf5435-execution:end -->

### 6. `6394188022fd` — style(journey): 모바일 중앙선 여정 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** mobile single-column collapse

#### 해당 SHA에서 확인할 실제 코드

- max-width 767px media query에서 centerline x, list padding, start/row grid를 확인합니다.
- Desktop center node를 숨기고 각 card pseudo-node를 만드는 selector를 확인합니다.
- Card border/shadow/radius/text alignment가 mobile에서 어떻게 단순화되는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-6394188022fd-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Desktop three-column paired layout은 작은 viewport에서 폭이 부족하고 centerline/marker가 content와 충돌할 수 있었습니다. |
| 실제 변경 file/symbol/call path | Centerline을 left 0.45rem로 옮기고 list에 gutter를 둡니다. Start/paired/single rows를 one-column으로 만들고 center node를 숨긴 뒤 각 card에 left timeline node를 제공합니다. Card는 horizontal border/shadow/radius를 제거하고 full width text-left가 됩니다. |
| Data/state/DOM/resource owner | CSS media query가 visual reflow를 소유하며 DOM과 item order는 바뀌지 않습니다. |
| Failure·absence·fallback 처리 | Safe data fallback을 추가하는 commit은 아닙니다. Mobile에서도 empty list는 empty wrapper이고 invalid date는 그대로 formatting됩니다. |
| 보장하는 것과 보장하지 않는 것 | 같은 ordered data와 links를 모바일 single-column timeline으로 읽을 수 있게 합니다. 실제 device visual regression과 touch behavior는 검증하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | 이 commit으로 formatter → entry/card → variants → desktop/mobile presentation 흐름이 완성됩니다. |
<!-- learner:commit-6394188022fd-record:end -->

#### 최소 코드 증거

<!-- learner:commit-6394188022fd-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-6394188022fd-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-6394188022fd-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
<!-- learner:commit-6394188022fd-execution:end -->

## 6. Invariant ledger

<!-- learner:thread-ledger:start -->
| Invariant | 도입·변경 commit | 실제 code/test evidence | 부족함이 드러난 지점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| Period formatting | f60edf14dae0 | slice/replace와 endDate comparison | date validation 없음 | valid YYYY-MM input의 display period |
| Source order와 odd tail 보존 | 3c0a1154ba08 | first split + chunkPairs + is-single | empty wrapper null 처리 없음 | 모든 item을 순서대로 렌더링 |
| Variant dispatch | b3182e35aed0 | paired early return/compact fallback | unknown runtime value는 compact | 한 public API로 두 layout 선택 |
| Desktop centerline | 7995a3cf5435 | three-column rows/single tail | small screen 부적합 | wide viewport geometry |
| Mobile reflow | 6394188022fd | left guide/one-column/card nodes | device visual test 없음 | DOM order를 바꾸지 않는 responsive collapse |
<!-- learner:thread-ledger:end -->

## 7. Failure → Fix → Test 관계

<!-- learner:thread-relations:start -->
| Failure/위험 | 실제 영향·root cause | Fix/결정 | Regression evidence 또는 공백 |
| --- | --- | --- | --- |
| Odd number of project items | 마지막 item 손실 또는 빈 반대 column 위험 | chunkPairs + is-single + centered card | Dedicated unit test 없음; exact branch inspection |
| Desktop paired grid on mobile | 좁은 card와 centerline 충돌 | 6394188022fd one-column media query | Visual regression test 없음 |
| Reveal is-visible coupling | JS/hydration 의존 시 guide/node visibility 위험 | 03 Thread의 b8164cfdddbd server-visible refactor | Frozen journey commits 자체에는 test 없음 |
<!-- learner:thread-relations:end -->

## 8. Ownership·state·responsibility 변화

<!-- learner:thread-ownership:start -->
| 단계 | Owner | 책임 변화 |
| --- | --- | --- |
| Journey data | date/endDate/category/title/body/projectId와 order | Content source |
| Helpers | display period와 pair grouping | formatYearMonth/getJourneyPeriod/chunkPairs |
| JourneyList | variant dispatch, animated wrappers | Public primitive |
| PairedJourneyList | first item, pairs, odd tail, keys/delays | Paired DOM owner |
| CSS | compact guide, desktop centerline, mobile collapse | Responsive presentation |
<!-- learner:thread-ownership:end -->

## 9. 최종 Thread 상태

<!-- learner:thread-final-state:start -->
- JourneyList는 compact와 paired-centerline 두 variant를 제공합니다.
- Paired variant는 첫 item을 start로 두고 나머지를 두 개씩 묶으며 odd tail을 centered single row로 보존합니다.
- projectId가 있는 entry만 template/debug-aware case-study link를 만듭니다.
- Desktop은 centerline two-sided cards, mobile은 같은 DOM의 left-guide single column을 사용합니다.
- Date validation, empty-list suppression, dedicated unit/visual tests는 이 Thread에 없습니다.
<!-- learner:thread-final-state:end -->

## 10. 최종 실행 흐름

<!-- learner:thread-flow:start -->
1. Caller가 ordered JourneyItem array와 variant/animated options를 전달합니다.
2. JourneyList가 paired variant면 PairedJourneyList로, 아니면 compact map으로 분기합니다.
3. Entry helper가 period/category/title/body와 optional project link를 만듭니다.
4. Paired renderer는 first item을 분리하고 남은 items를 pairs로 묶습니다.
5. CSS가 compact guide 또는 desktop centerline을 적용하고 767px 이하에서 same DOM을 one-column으로 바꿉니다.
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
