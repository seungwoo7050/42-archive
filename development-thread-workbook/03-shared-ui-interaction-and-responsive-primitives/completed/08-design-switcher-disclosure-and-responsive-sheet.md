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
| 직전 상태와 부족함 | Design selector에 필요한 desktop disclosure styling과 focus-visible treatment가 없었습니다. |
| 실제 변경 file/symbol/call path | Relative root와 z-index, custom summary trigger, hidden native webkit marker, focus outline, absolute right-aligned panel, list/link/swatch/copy/number styles를 추가했습니다. Sheet header는 desktop에서 숨깁니다. |
| Data/state/DOM/resource owner | Native details가 open state를 소유할 예정이고 CSS가 desktop geometry/visual state를 소유합니다. |
| Failure·absence·fallback 처리 | Panel width는 viewport에서 2rem을 뺀 값으로 제한됩니다. CSS만 추가되어 실제 details DOM이나 close behavior는 아직 없습니다. |
| 보장하는 것과 보장하지 않는 것 | Keyboard-visible summary focus와 desktop menu presentation 기반을 만듭니다. Semantic markup과 state transition은 보장하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | 28dfc5087474가 same class set의 mobile sheet layout을, e43e8addd7f3가 actual details/summary DOM을 추가합니다. |
<!-- learner:commit-cc13abb3b66f-record:end -->

#### 최소 코드 증거

<!-- learner:commit-cc13abb3b66f-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-cc13abb3b66f-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-cc13abb3b66f-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
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
| 직전 상태와 부족함 | Desktop absolute dropdown CSS만 있어 좁은 viewport에서 panel width/position과 close affordance가 적절하지 않았습니다. |
| 실제 변경 file/symbol/call path | Mobile에서 root를 static으로 두고 open일 때 fixed backdrop을 만듭니다. Panel은 bottom fixed, scrollable max-height, safe-area-aware padding과 overscroll contain을 사용합니다. Sheet header와 2.75rem close button을 표시합니다. |
| Data/state/DOM/resource owner | Native open attribute가 backdrop visibility를, media query가 mobile geometry를 소유합니다. |
| Failure·absence·fallback 처리 | CSS는 body scroll lock이나 backdrop click close를 구현하지 않습니다. Overscroll은 panel 내부에 contain합니다. |
| 보장하는 것과 보장하지 않는 것 | 같은 semantic panel을 mobile sheet로 표현할 layout을 제공합니다. 실제 button/DOM과 focus behavior는 후속 component가 필요합니다. |
| 다음 commit 또는 관련 test 연결 | e43e8addd7f3/c69ef85c98b2가 trigger, nav list와 close button을 연결합니다. |
<!-- learner:commit-28dfc5087474-record:end -->

#### 최소 코드 증거

<!-- learner:commit-28dfc5087474-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-28dfc5087474-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-28dfc5087474-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
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
| 직전 상태와 부족함 | CSS는 준비됐지만 native details/summary trigger와 active design label/count 계산이 없었습니다. |
| 실제 변경 file/symbol/call path | Client DesignSwitcher를 추가해 details/summary를 렌더링하고 details/summary refs를 만듭니다. Template copy map을 만들고 active ID를 SITE_DESIGNS에서 찾되 miss이면 first design으로 fallback합니다. Count template의 index/total을 2자리로 치환합니다. |
| Data/state/DOM/resource owner | Native details element가 open attribute를 소유하고 component가 active derivation/count/aria label을 소유합니다. Refs는 후속 close transition을 위해 준비됩니다. |
| Failure·absence·fallback 처리 | Active ID miss 시 active object는 first design으로 fallback하지만 activeIndex는 -1이므로 count의 index가 `00`이 될 수 있습니다. Missing copy는 design ID label로 fallback합니다. |
| 보장하는 것과 보장하지 않는 것 | Native trigger와 active copy를 제공합니다. List, navigation links, close behavior는 아직 렌더링하지 않으며 hydration race도 다루지 않습니다. |
| 다음 commit 또는 관련 test 연결 | c69ef85c98b2가 refs를 사용한 close/focus 및 full design list를 추가합니다. |
<!-- learner:commit-e43e8addd7f3-record:end -->

#### 최소 코드 증거

<!-- learner:commit-e43e8addd7f3-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-e43e8addd7f3-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-e43e8addd7f3-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
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
| 직전 상태와 부족함 | Trigger는 열릴 수 있었지만 선택 목록, active semantics, template-preserving href, explicit mobile close/focus restoration이 없었습니다. |
| 실제 변경 file/symbol/call path | Panel 안에 labelled nav/list를 추가하고 SITE_DESIGNS 순서대로 links를 만듭니다. Active item은 aria-current=page와 active class를 사용합니다. Link는 currentPath/view/contentDebug를 보존합니다. Close button은 details open을 제거하고 summary에 focus하며, link click도 open을 제거합니다. |
| Data/state/DOM/resource owner | Native details가 disclosure state를, component refs/event handlers가 명시적 state transition을, getTemplateHref가 destination query를 소유합니다. Template copy map은 label/description fallback을 제공합니다. |
| Failure·absence·fallback 처리 | Refs가 없으면 optional chaining으로 close/focus가 no-op입니다. Link click close는 navigation 성공을 기다리지 않으며 focus를 복원하지 않습니다. Backdrop click/Escape custom handler/body lock은 없습니다. |
| 보장하는 것과 보장하지 않는 것 | Desktop/mobile이 같은 semantic list를 공유하고 explicit close focus contract를 갖습니다. 그러나 whole component가 client boundary이고 hydration 전에 native open이 바뀌면 server/client attribute mismatch 가능성이 남습니다. |
| 다음 commit 또는 관련 test 연결 | Category 02의 b9571c485013이 이 component를 `SiteHeader`/`PageShell`의 조건부 consumer로 연결합니다. 09cec616f314이 기본 close/link contract를 component test로 확인하고, Category 07의 c702/b6c/a37/1ac가 hydration race를 재현한 뒤 server-markup + tiny client close island로 corrected invariant를 만듭니다. |
<!-- learner:commit-c69ef85c98b2-record:end -->

#### 최소 코드 증거

<!-- learner:commit-c69ef85c98b2-excerpt:start -->
- **Commit:** `c69ef85c98b2`
- **Path:** `src/components/portfolio/design-switcher.tsx`
- **Location:** `close button handler`

```tsx
onClick={() => {
  detailsRef.current?.removeAttribute("open");
  summaryRef.current?.focus();
}}
```

이 발췌는 해당 SHA의 decision/state/ownership을 보여 주는 최소 부분입니다. 후속 commit의 코드는 섞지 않았습니다.
<!-- learner:commit-c69ef85c98b2-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-c69ef85c98b2-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
<!-- learner:commit-c69ef85c98b2-execution:end -->

## 6. Invariant ledger

<!-- learner:thread-ledger:start -->
| Invariant | 도입·변경 commit | 실제 code/test evidence | 부족함이 드러난 지점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| Native disclosure state | e43e8addd7f3 | details/summary DOM | client hydration race 미해결 | 초기 Thread에서는 native open attribute가 state owner |
| Responsive same-DOM presentation | cc13abb3b66f → 28dfc5087474 | desktop absolute panel/mobile fixed sheet | body lock/backdrop close 없음 | 640px boundary에서 CSS만 geometry 전환 |
| Template-preserving selection | c69ef85c98b2 | getTemplateHref currentPath/design/debug | destination response 미검증 | 선택 URL과 active semantics 제공 |
| Explicit close/focus | c69ef85c98b2 | remove open → summary.focus | link click은 focus 복원 안 함 | Close button 경로의 focus contract |
| Shared-shell integration | b9571c485013 (외부 관계) | `SiteHeader`의 조건부 `DesignSwitcher` call과 `PageShell` props | `templateSwitcher`가 없으면 selector 자체가 렌더링되지 않음 | Category 02가 실제 route-wide consumer wiring을 소유 |
| Corrected server-first owner | a37cb8596733 (외부 관계) | server DesignSwitcher + client DesignSwitcherClose | frozen map 밖 category 07 | 후속 architecture에서 markup은 server, close handler만 client |
<!-- learner:thread-ledger:end -->

## 7. Failure → Fix → Test 관계

<!-- learner:thread-relations:start -->
| Failure/위험 | 실제 영향·root cause | Fix/결정 | Regression evidence 또는 공백 |
| --- | --- | --- | --- |
| Primitive는 존재하지만 shell consumer 없음 | 공용 route shell에서 아직 도달할 수 없음 | b9571c485013이 `SiteHeader`에서 `templateSwitcher` 존재 시 `DesignSwitcher`를 호출 | Category 02 exact diff로 정적 확인; runtime integration test는 실행하지 않음 |
| Client-rendered native details | Hydration 전 사용자가 open을 바꾸면 attribute mismatch 위험 | c702b870d57a suppress warning 후 a37cb8596733 server markup 전환 | b6c0238ab8b8 SSR→native open→hydrate deterministic test, 1ac7813155c6 source-boundary test |
| Close handler가 whole switcher refs를 요구 | 전체 list가 client boundary에 묶임 | a37cb8596733에서 small DesignSwitcherClose client island로 이동 | 1ac7813155c6가 source에 use client/useRef가 없음을 검증 |
| Link click에서 open 제거 | Navigation을 event handler semantics에 결합 | a37cb8596733에서 link onClick 제거; route navigation에 맡김 | Updated component test는 explicit close/focus와 href를 검증 |
<!-- learner:thread-relations:end -->

## 8. Ownership·state·responsibility 변화

<!-- learner:thread-ownership:start -->
| 단계 | Owner | 책임 변화 |
| --- | --- | --- |
| CSS 준비 | Desktop/mobile geometry | details open attribute selector를 예상 |
| e43 초기 component | Native details state + client refs | Trigger/active label만 존재 |
| c69 완성 | Client component가 list, links, refs, close/focus를 모두 소유 | Initial functional contract |
| 외부 category 02 / b957 | SiteHeader와 PageShell이 component reachability와 UI/template props를 소유 | 실제 shared-shell consumer |
| 후속 category 07 | Server markup + client close island | Native state를 hydration-safe하게 보존하는 corrected owner |
<!-- learner:thread-ownership:end -->

## 9. 최종 Thread 상태

<!-- learner:thread-final-state:start -->
- Frozen commit set의 최종 상태는 client DesignSwitcher 안의 native details/summary/nav/list이며, 이 set만으로는 아직 shared shell에 연결되지 않습니다.
- 실제 route-wide reachability는 인접 category 02의 b9571c485013이 `SiteHeader`/`PageShell`에 조건부 consumer를 추가하면서 생깁니다.
- Desktop은 absolute dropdown, mobile은 backdrop이 있는 fixed bottom sheet를 같은 DOM으로 표현합니다.
- Active item과 count/copy fallback, template/debug-aware links가 구현돼 있습니다.
- Explicit close button은 open을 제거하고 summary focus를 복원합니다.
- 이 초기 상태의 hydration 경쟁 조건은 후속 category 07 commits에서 재현·수정·검증됩니다.
<!-- learner:thread-final-state:end -->

## 10. 최종 실행 흐름

<!-- learner:thread-flow:start -->
1. Frozen map은 DesignSwitcher의 component contract를 완성하고, category 02의 b9571c485013이 `SiteHeader`에서 `templateSwitcher`가 있을 때 active design, current path, templates, UI copy와 contentDebug를 전달합니다.
2. DesignSwitcher가 template map과 active/count label을 파생합니다.
3. Native details/summary가 browser-managed disclosure를 제공합니다.
4. Nav list가 SITE_DESIGNS 순서와 active aria-current를 렌더링하고 getTemplateHref로 destination을 만듭니다.
5. CSS가 viewport에 따라 desktop dropdown 또는 mobile bottom sheet로 재배치합니다.
6. Close button은 open attribute를 제거하고 summary focus를 복원합니다.
7. 후속 server-first refactor에서는 markup owner가 server로 이동하고 close interaction만 client island에 남습니다.
<!-- learner:thread-flow:end -->

## 11. 학습 완료 확인

<!-- learner:thread-checklist:start -->
- [x] 모든 commit을 exact SHA diff와 resulting file 기준으로 기록했습니다.
- [x] SHA, subject, order, importance, tags와 Thread 역할을 frozen scaffold와 동일하게 유지했습니다.
- [x] Previous state, owner, absence/failure, guarantee/non-guarantee와 later relation을 채웠습니다.
- [x] S/A-level 설명을 B-level보다 깊게 작성했습니다.
- [x] 실행 상태를 사실대로 기록했습니다: runtime command는 실행하지 않았고 정적 검토와 구분했습니다.
- [x] 빈 learner-facing answer cell을 남기지 않았습니다.
<!-- learner:thread-checklist:end -->
