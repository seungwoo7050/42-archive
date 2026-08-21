# Thread: Design switcher disclosure and responsive sheet

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

Native `<details>/<summary>`를 기반으로 desktop menu와 mobile bottom sheet를 공유하고, active design/count, template-preserving links, explicit close와 focus restoration을 구현한 초기 story를 복원합니다.

**경계:** Phase 1에서 category README가 약속했지만 기존 7개 Thread가 다루지 않던 responsive disclosure primitive 구현 story를 추가했습니다. 실제 shared-shell 연결은 category 02의 `b9571c485013`이, 후속 hydration race fix/test와 server-component refactor는 category 07이 소유합니다. 이 frozen commit map에는 primitive 구현 commit만 두고 인접 category의 integration/correction/evidence는 관계로 명시합니다.

### 고정 invariant

- Disclosure open state는 React boolean이 아니라 native details element가 소유합니다.
- Desktop dropdown과 mobile bottom sheet는 동일한 semantic details/nav/list DOM을 CSS로 재배치합니다.
- Active design은 aria-current와 active class를 가지며 링크는 current path와 content-debug state를 보존합니다.
- 명시적 close button은 open attribute를 제거한 뒤 summary에 focus를 복원합니다.
- 초기 client implementation은 hydration 전에 native open state가 바뀌는 경쟁 조건을 완전히 해결하지 못합니다.

## 2. 핵심 질문

- Desktop CSS가 summary marker/focus와 absolute panel stacking을 어떻게 정의하는가?
- Mobile CSS가 backdrop, safe-area padding, fixed panel과 overscroll을 같은 details open attribute에 연결하는가?
- DesignSwitcher가 active ID miss, content copy miss, count label을 어떻게 fallback/format하는가?
- Close button과 design link click이 open state/focus를 각각 어떻게 처리하는가?
- Category 02의 b9571c485013이 `SiteHeader`에서 어떤 props와 조건으로 이 primitive를 실제 route shell에 연결하는가?
- c702b870d57a → b6c0238ab8b8 → a37cb8596733 → 1ac7813155c6의 후속 correction이 초기 가정을 어떻게 바꾸는가?

## 3. 완료 기준

- 각 SHA의 parent diff와 resulting tree를 구분해 실제 file/symbol/call path를 기록합니다.
- Previous state, owner, state transition, absence/failure branch, guarantee/non-guarantee를 commit별로 분리합니다.
- Fix와 test는 실제로 수정·검증하는 production path에 연결합니다.
- 실행하지 않은 command 결과를 만들지 않습니다.
- S/A-level은 architecture/owner/failure/later evidence를 B-level보다 깊게 복원합니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Thread 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `cc13abb3b66f` | style(designs): 디자인 선택기 기본 메뉴 구성 | B | RENDERER | desktop disclosure styling |
| 2 | `28dfc5087474` | style(designs): 모바일 디자인 선택 sheet 구성 | B | RENDERER | mobile bottom-sheet styling |
| 3 | `e43e8addd7f3` | feat(designs): 디자인 선택기 상태와 trigger 추가 | B | RENDERER | client details trigger와 active state |
| 4 | `c69ef85c98b2` | feat(designs): 디자인 선택 목록과 닫기 동작 추가 | A | ARCH, RENDERER | nav list와 explicit state transition |

### 관련 commit — 이 frozen map 밖의 경계

아래 commit은 같은 production story의 integration/correction/evidence이지만 인접 category가 소유합니다. Category 중복을 피하기 위해 이 Thread의 commit map에는 넣지 않습니다.

- `b9571c485013` — feat(shell): 디자인 선택기를 공용 shell에 연결 (Category 02)
- `c702b870d57a` — fix(ui): hydration 중 native details 상태 보존 (Category 07)
- `b6c0238ab8b8` — test(ui): details hydration 경쟁 조건 검증 (Category 07)
- `a37cb8596733` — refactor(ui): 디자인 선택기를 server markup으로 전환 (Category 07)
- `1ac7813155c6` — test(ui): server 선택기와 focus 복원 검증 (Category 07)

## 5. Commit별 학습 기록

### 1. `cc13abb3b66f` — style(designs): 디자인 선택기 기본 메뉴 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** desktop disclosure styling

#### 해당 SHA에서 확인할 실제 코드

- 새 `design-switcher.module.css`의 root z-index, summary marker removal/focus-visible, absolute panel와 list/link classes를 확인합니다.
- `.sheetHeader`가 desktop에서 display none이고 active/hover/focus style이 공유되는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-cc13abb3b66f-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-cc13abb3b66f-record:end -->

#### 최소 코드 증거

<!-- learner:commit-cc13abb3b66f-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-cc13abb3b66f-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-cc13abb3b66f-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-cc13abb3b66f-execution:end -->

### 2. `28dfc5087474` — style(designs): 모바일 디자인 선택 sheet 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** mobile bottom-sheet styling

#### 해당 SHA에서 확인할 실제 코드

- max-width 640px의 `.root[open]::before`, fixed `.panel`, safe-area padding과 z-index를 확인합니다.
- Sheet header/button size, max-height/overflow/overscroll behavior를 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-28dfc5087474-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-28dfc5087474-record:end -->

#### 최소 코드 증거

<!-- learner:commit-28dfc5087474-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-28dfc5087474-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-28dfc5087474-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-28dfc5087474-execution:end -->

### 3. `e43e8addd7f3` — feat(designs): 디자인 선택기 상태와 trigger 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** client details trigger와 active state

#### 해당 SHA에서 확인할 실제 코드

- 새 `design-switcher.tsx`의 client directive, refs, SITE_DESIGNS/templateCopy/activeIndex fallback을 확인합니다.
- Count template의 padStart와 summary aria-label/content를 확인합니다.
- Import된 Link/getTemplateHref가 이 SHA에서 아직 사용되지 않는다는 staged implementation 상태를 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-e43e8addd7f3-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-e43e8addd7f3-record:end -->

#### 최소 코드 증거

<!-- learner:commit-e43e8addd7f3-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-e43e8addd7f3-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-e43e8addd7f3-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-e43e8addd7f3-execution:end -->

### 4. `c69ef85c98b2` — feat(designs): 디자인 선택 목록과 닫기 동작 추가

- **Importance:** A
- **Tags:** ARCH, RENDERER
- **Thread 역할:** nav list와 explicit state transition

#### 해당 SHA에서 확인할 실제 코드

- `nav`/`ul`/SITE_DESIGNS map의 active aria-current, swatches, copy fallback과 number를 확인합니다.
- `getTemplateHref(currentPath, design.id, { contentDebug })` call path를 확인합니다.
- Close button의 `removeAttribute("open")` → summary focus 순서와 link click close branch를 비교합니다.
- Native state owner와 imperative refs 사이의 ownership, missing refs optional chaining, navigation 발생 전 close의 non-guarantee를 기록합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-c69ef85c98b2-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-c69ef85c98b2-record:end -->

#### 최소 코드 증거

<!-- learner:commit-c69ef85c98b2-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-c69ef85c98b2-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-c69ef85c98b2-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-c69ef85c98b2-execution:end -->

## 6. Invariant ledger

<!-- learner:thread-ledger:start -->
| Invariant | 도입·변경 commit | 실제 code/test evidence | 부족함이 드러난 지점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| Native disclosure state | e43e8addd7f3 |  |  |  |
| Responsive same-DOM presentation | cc13abb3b66f → 28dfc5087474 |  |  |  |
| Template-preserving selection | c69ef85c98b2 |  |  |  |
| Explicit close/focus | c69ef85c98b2 |  |  |  |
| Shared-shell integration | b9571c485013 (외부 관계) |  |  |  |
| Corrected server-first owner | a37cb8596733 (외부 관계) |  |  |  |
<!-- learner:thread-ledger:end -->

## 7. Failure → Fix → Test 관계

<!-- learner:thread-relations:start -->
| Failure/위험 | 실제 영향·root cause | Fix/결정 | Regression evidence 또는 공백 |
| --- | --- | --- | --- |
| Primitive는 존재하지만 shell consumer 없음 |  |  |  |
| Client-rendered native details |  |  |  |
| Close handler가 whole switcher refs를 요구 |  |  |  |
| Link click에서 open 제거 |  |  |  |
<!-- learner:thread-relations:end -->

## 8. Ownership·state·responsibility 변화

<!-- learner:thread-ownership:start -->
| 단계 | Owner | 책임 변화 |
| --- | --- | --- |
| CSS 준비 |  |  |
| e43 초기 component |  |  |
| c69 완성 |  |  |
| 외부 category 02 / b957 |  |  |
| 후속 category 07 |  |  |
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
- [ ] S/A-level과 B-level 깊이를 구분했습니다.
- [ ] 실행 상태를 사실대로 기록했습니다.
- [ ] 빈 learner-facing section을 남기지 않았습니다.
<!-- learner:thread-checklist:end -->
