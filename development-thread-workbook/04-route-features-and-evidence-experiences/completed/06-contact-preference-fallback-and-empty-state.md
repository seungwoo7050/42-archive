# Development Thread: Contact preference, fallback, and empty state

> **Repository:** `https://github.com/seungwoo7050/42-archive`  
> **Branch:** `web/portfolio`  
> **Category:** `04-route-features-and-evidence-experiences`  
> **Workbook state:** completed workbook  
> **Historical scope:** commits reachable from `web/portfolio` only

## 0. Phase 1 audit result and category boundary

- 포함: `/contact` hero, availability/notes, preferred contact links, placement selector integration, accessible link target/copy, no-link empty state.
- 제외: 외부 링크의 보안 속성·transport는 category 03/06, selector의 전체 cross-route 정책은 category 01, route view-model ownership과 renderer matrix는 category 09가 담당합니다.
- `bc651...`은 여러 공용 UI를 함께 바꾸지만 Contact의 링크 target/copy 계약에 직접 연결되는 integration commit으로만 다룹니다.
- Phase 1에서 draft의 `9e99...` → `bc651...` 순서를 실제 이력인 `bc651...` → `9e99...`로 교정했습니다.

- **Audit decision:** 이 Thread는 독립적인 route feature/evidence story로 유지합니다.
- **Frozen commit count:** 5
- **Importance profile:** branch-local source classification상 이 Thread의 commit은 모두 B입니다. 다른 category의 S/A-level cross-cutting architecture를 중복 편입하지 않았습니다.

## 1. Thread goal

Contact route가 소개 화면에서 preferred-link 선택, placement vocabulary, 공용 UI copy, 명시적 empty state로 발전하는 과정을 실제 순서대로 복원하고, 링크가 없을 때 깨진 CTA나 침묵하는 빈 영역을 만들지 않는 경계를 확인합니다.

### Fixed invariants

- Contact는 `getPreferredContactLinks(content)`가 반환한 순서와 활성 결과를 사용하며 route가 임의로 social link를 고르지 않습니다.
- 링크 placement는 typed `LinkPlacement` vocabulary로 표현되며 contact용 전역 링크와 project card/detail 링크는 같은 helper를 오용하지 않습니다.
- preferred links가 하나 이상이면 링크 목록을, 0개이면 `presentation.ui.emptyStates.contactLinks`를 렌더링합니다.
- 링크가 없어도 availability/notes와 Contact route 자체는 유지되며 없는 URL을 합성하지 않습니다.
- 링크 CTA의 최소 터치 target과 UI 문구는 presentation/shared UI 계약에서 오며 Contact 전용 하드코딩 fallback이 아닙니다.

## 2. Core engineering questions

1. 초기 Contact route는 어떤 profile/contact 필드를 보여 주고 아직 무엇을 제공하지 않는가?
2. `getPreferredContactLinks`의 결과가 route에서 어떤 순서로 렌더링되며 fallback source는 무엇인가?
3. `LinkPlacement`와 `getContentLinksByPlacement`가 기존 project-link helper를 어떻게 일반화하는가?
4. `bc651...`이 공용 UI copy와 target size를 먼저 제공한 뒤 `9e99...`이 그 copy를 어떤 branch에서 소비하는가?
5. preferred links가 0개일 때 availability와 notes는 남고 링크 영역만 empty state로 전환되는가?

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
| 1 | `bfcdf44eb34c` | feat(contact): 연락 페이지 소개 추가 | B | RENDERER | Contact route의 profile identity, title, intro를 최초 구성합니다. |
| 2 | `f344a492043c` | feat(contact): 선호 연락 수단과 안내 추가 | B | RENDERER | preferred links, availability, notes를 Contact body에 연결합니다. |
| 3 | `119ff9a92090` | feat(content): 링크 배치 selector 추가 | B | CONTENT | 전역·프로젝트 링크를 typed placement로 선택할 수 있는 selector vocabulary를 도입합니다. |
| 4 | `bc651dd85e14` | feat(content): 공용 UI 접근성 문구 적용 | B | CONTENT, A11Y | 공용 UI labels와 최소 interactive target을 content-driven 계약으로 적용합니다. |
| 5 | `9e99c9531cb8` | feat(contact): 연락 링크 빈 상태 추가 | B | RENDERER | preferred-link 결과가 0개일 때 명시적 Contact empty state를 렌더링합니다. |

## 5. Commit-by-commit historical investigation

### 5.1. `bfcdf44eb34c` — feat(contact): 연락 페이지 소개 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** Contact route의 profile identity, title, intro를 최초 구성합니다.

#### Exact inspection targets

- `src/app/contact/page.tsx` — `ContactPage`
- `content.contact.title`, `content.contact.intro`
- `content.profile.name`, `content.profile.handle`
- `PageShell`과 template switcher의 `/contact` current path

#### Commit-specific investigation tasks

1. `ContactPage`의 최소 hero가 contact title/intro와 profile identity를 어떻게 결합하는지 확인합니다.
2. shell/template switcher의 currentPath가 `/contact`로 설정되는지 기록합니다.
3. preferred links, availability, notes가 아직 없는 이전 state를 명시합니다.

#### Learner evidence record

- **Previous state:** 직전에는 연락 목적과 작성자 identity를 실제 `/contact` route에서 보여 주는 화면이 없었습니다.
- **Implementation decision and path:** `ContactPage`가 aggregate와 query state를 읽어 shell 안에 profile identity, contact title, intro를 렌더링합니다.
- **Ownership and data lifetime:** contact content가 title/intro를, profile이 identity를, route가 hero composition을 소유합니다.
- **Failure, absence, and non-guarantee:** 이 시점에는 preferred links, availability, notes, empty state가 없습니다. 소개 데이터가 비어 있을 때 별도 validation/fallback을 제공하지 않습니다.
- **Resulting guarantee:** Contact route의 최소 정보 구조와 route-preserving shell을 보장합니다. 실제 연락 가능한 수단은 아직 보장하지 않습니다.
- **Relationship to later work:** `f344...`가 선호 연락 수단과 안내를 실제 CTA 영역으로 추가합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `bfcdf44eb34c` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.2. `f344a492043c` — feat(contact): 선호 연락 수단과 안내 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** preferred links, availability, notes를 Contact body에 연결합니다.

#### Exact inspection targets

- `src/app/contact/page.tsx` — `preferredLinks`, links section, availability/notes 영역
- `getPreferredContactLinks(content)`
- `ContentLinkView` 반복과 `homeTemplate`/`contentDebug` 전달
- `content.contact.availability`, contact notes 관련 필드

#### Commit-specific investigation tasks

1. `getPreferredContactLinks(content)` 호출 결과가 `ContentLinkView` cards로 전달되는 흐름을 추적합니다.
2. availability와 notes가 links list와 어느 sibling 위치에 있는지 확인합니다.
3. preferred result가 0개일 때 별도 branch가 없이 map만 비는지 기록합니다.

#### Learner evidence record

- **Previous state:** Contact route는 목적만 설명하고 실제 연락 링크나 응답 가능 상태를 제공하지 않았습니다.
- **Implementation decision and path:** selector 결과를 CTA cards로 반복하고 availability와 notes를 같은 route에 추가합니다.
- **Ownership and data lifetime:** 선호 링크 계산·순서는 selector가, availability/notes 원본은 contact content가, card layout은 route가 소유합니다.
- **Failure, absence, and non-guarantee:** preferred links가 비면 이 시점에는 단순히 빈 반복 결과가 되어 링크 영역에 설명이 없습니다. URL을 임의로 합성하지는 않습니다.
- **Resulting guarantee:** 활성 preferred links와 안내 정보를 content 기반으로 표현함을 보장합니다. no-link 상태의 명시적 설명은 아직 없습니다.
- **Relationship to later work:** `119...`이 placement vocabulary를 일반화하고, `9e99...`이 0개 결과를 explicit empty state로 고칩니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `f344a492043c` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.3. `119ff9a92090` — feat(content): 링크 배치 selector 추가

- **Importance:** B
- **Tags:** CONTENT
- **Source-defined role:** 전역·프로젝트 링크를 typed placement로 선택할 수 있는 selector vocabulary를 도입합니다.

#### Exact inspection targets

- `src/lib/portfolio/types.ts` — `LinkPlacement`, `ContentLink.placements`
- `src/lib/portfolio/selectors.ts` — `getContentLinksByPlacement`, `getProjectLinksForPlacement`
- `getProjectCardLinks`, `getProjectDetailLinks` wrapper
- `src/lib/portfolio.ts` — public exports
- deployment 상태에 따른 project-link filter branch

#### Commit-specific investigation tasks

1. `LinkPlacement` union과 global/project placement selectors의 signatures를 비교합니다.
2. `getProjectCardLinks`/`getProjectDetailLinks` wrappers가 generic helper에 어떤 placement를 고정하는지 확인합니다.
3. placement filter 뒤 project deployment/live filter가 적용되는 순서와 fallback 부재를 기록합니다.

#### Learner evidence record

- **Previous state:** 링크 placement literal과 card 전용 filter가 흩어져 있어 contact/detail/footer 등 다른 소비자가 같은 vocabulary를 안전하게 재사용하기 어려웠습니다.
- **Implementation decision and path:** `LinkPlacement` union을 도입하고 전역 content links와 project links를 placement별로 선택하는 generic helpers를 추가합니다. 기존 card helper는 generic project helper를 호출합니다.
- **Ownership and data lifetime:** content의 `placements` 배열이 노출 위치를, selectors가 placement와 deployment 상태 filter를, route/component가 표현을 소유합니다.
- **Failure, absence, and non-guarantee:** placement가 없거나 요청 placement를 포함하지 않는 링크는 결과에서 제외됩니다. project link는 live/deployment 정책도 통과해야 하며, selector는 fallback URL을 만들지 않습니다.
- **Resulting guarantee:** Contact를 포함한 consumers가 문자열 ad-hoc filter 대신 같은 typed placement contract를 사용할 수 있음을 보장합니다.
- **Relationship to later work:** `bc651...`이 공용 문구/target 계약을 추가하고 `9e99...`이 Contact의 zero-result branch를 명시합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `119ff9a92090` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.4. `bc651dd85e14` — feat(content): 공용 UI 접근성 문구 적용

- **Importance:** B
- **Tags:** CONTENT, A11Y
- **Source-defined role:** 공용 UI labels와 최소 interactive target을 content-driven 계약으로 적용합니다.

#### Exact inspection targets

- `src/content/presentation.json` 및 presentation type/schema — shared UI labels/empty-state copy
- `src/components/portfolio/project-links.tsx` — `min-h-11` link targets
- `src/components/portfolio/journey-list.tsx` — content-provided case-study label
- `src/components/portfolio/animated-terminal.tsx`, `tech-marquee.tsx` — injected aria labels
- Contact empty-state copy가 저장되는 `presentation.ui.emptyStates.contactLinks`

#### Commit-specific investigation tasks

1. presentation UI copy/aria labels가 어떤 components에 prop으로 주입되는지 파일별로 분리합니다.
2. `project-links.tsx`의 `h-9`→`min-h-11` 변경이 어떤 interactive targets에 적용되는지 확인합니다.
3. Contact empty-state copy가 content vocabulary에 존재하지만 Contact branch는 아직 추가되지 않았는지 chronology를 확인합니다.

#### Learner evidence record

- **Previous state:** 여러 공용 component가 영어 label·aria text·고정 높이를 자체 소유해 presentation content와 접근성 target 계약이 분산돼 있었습니다.
- **Implementation decision and path:** UI labels를 presentation content에서 주입하고 일부 link buttons를 최소 높이 44px 상당의 `min-h-11`로 확장합니다. Contact의 후속 no-link branch가 사용할 shared empty-state copy도 content vocabulary에 포함됩니다.
- **Ownership and data lifetime:** presentation content가 사용자 노출/aria copy를, shared components가 semantic target과 적용 위치를, route가 어떤 state에서 copy를 보여 줄지 소유합니다.
- **Failure, absence, and non-guarantee:** 이 커밋 자체가 Contact의 `preferredLinks.length === 0` branch를 추가하지는 않습니다. copy가 존재해도 consumer가 사용하지 않으면 화면에 나타나지 않습니다.
- **Resulting guarantee:** 공용 labels를 하드코딩하지 않고 interactive targets의 최소 크기를 강화할 기반을 보장합니다.
- **Relationship to later work:** `9e99...`이 준비된 Contact empty-state copy를 실제 zero-link branch에 연결합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `bc651dd85e14` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

### 5.5. `9e99c9531cb8` — feat(contact): 연락 링크 빈 상태 추가

- **Importance:** B
- **Tags:** RENDERER
- **Source-defined role:** preferred-link 결과가 0개일 때 명시적 Contact empty state를 렌더링합니다.

#### Exact inspection targets

- `src/app/contact/page.tsx` — `preferredLinks.length > 0` branch
- `ContentLinkView` card의 `min-h-11`
- `content.presentation.ui.emptyStates.contactLinks`
- availability/notes block이 branch 밖에 남는지 확인

#### Commit-specific investigation tasks

1. `preferredLinks.length > 0`의 두 branches를 따라 list와 empty-state DOM을 비교합니다.
2. empty-state 문구가 `presentation.ui.emptyStates.contactLinks`에서 오는지 확인합니다.
3. availability/notes가 branch 밖에 남고 link cards가 `min-h-11`을 사용하는지 기록합니다.

#### Learner evidence record

- **Previous state:** selector가 0개를 반환하면 링크 반복이 아무 DOM도 만들지 않아 사용자는 데이터 부재와 렌더링 실패를 구분할 수 없었습니다.
- **Implementation decision and path:** non-empty 결과는 링크 cards로 렌더링하고, empty 결과는 dashed card 안에 shared presentation copy를 표시합니다.
- **Ownership and data lifetime:** selector가 상태를 계산하고, Contact route가 list-vs-empty 전환을, presentation content가 설명 문구를 소유합니다.
- **Failure, absence, and non-guarantee:** 링크가 없어도 availability/notes와 page shell은 유지됩니다. 이 branch는 연락 수단을 자동 생성하거나 retry하지 않습니다.
- **Resulting guarantee:** Contact가 0개 링크를 침묵하는 빈 영역으로 처리하지 않고 명시적 비가용 상태로 보여 줌을 보장합니다.
- **Relationship to later work:** 후대 Contact view model과 renderer matrix 검증은 category 09/07에서 같은 결과 계약을 보호합니다.
- **Resource acquisition and cleanup:** 이 SHA의 관련 diff에는 파일·소켓·타이머 등 수동 자원 획득/해제 경로가 없습니다. 따라서 cleanup 분석은 적용 대상이 아니며, content aggregate와 React element의 render-time 소비 경계만 기록했습니다.

#### Execution evidence

- **Static historical inspection:** GitHub read-only connector로 정확한 `9e99c9531cb8` commit object와 diff를 조회하고 위 파일·symbol을 그 SHA 상태에서 검토했습니다.
- **Executed repository commands:** 없음. 컨테이너에서 GitHub DNS 해석 실패로 branch checkout을 만들 수 없었으므로 이 SHA에서 build/test/runtime pass를 주장하지 않습니다.
- **Evidence classification:** 위 기록은 exact-SHA code inspection 결과입니다. 실행 결과나 final HEAD에서 역추론한 내용이 아닙니다.

## 6. Invariant evolution

| Stage | Historical reconstruction |
|---|---|
| 소개 route | `bfc...`가 Contact identity와 intro만 제공했습니다. |
| 실제 수단 | `f344...`가 preferred links와 availability/notes를 연결했지만 zero-result 설명은 없었습니다. |
| 선택 vocabulary | `119...`이 link placement와 project/global selector 경계를 typed contract로 정리했습니다. |
| 공용 접근성 기반 | `bc651...`이 shared copy/aria labels와 최소 target을 먼저 제공했습니다. |
| 명시적 absence | `9e99...`이 preferred link 0개를 presentation-owned empty state로 전환했습니다. |

## 7. Failure → Fix → Test and later relationships

- Failure → Fix: `f344...`의 empty iteration은 오류를 던지지 않지만 사용자에게 상태를 설명하지 못했습니다. `9e99...`이 0개 결과를 explicit branch로 보정했습니다.
- Integration dependency: `bc651...`이 empty-state copy를 content vocabulary에 둔 뒤 `9e99...`이 실제 Contact consumer에서 사용합니다. 실제 시간 순서는 이 순서입니다.
- 전용 regression test는 frozen map에 없습니다. route-view-model/renderer matrix 및 broad accessibility tests는 category 09/07이 담당합니다.

## 8. Ownership, state, and responsibility changes

- Contact content: title, intro, availability, notes와 선호 연락 설정.
- Link selectors: enabled/placement/deployment 기반 결과와 순서.
- Presentation UI: empty-state/aria/label copy.
- Contact route: preferred list와 empty-state branch, availability/notes 배치.
- ContentLinkView/shared link components: 외부 링크 semantics와 interactive target 표현.

## 9. Final thread state

Contact route는 preferred selector 결과가 있으면 순서대로 접근 가능한 링크 cards를 보여 주고, 없으면 presentation-owned empty-state 문구를 보여 줍니다. availability와 notes는 두 branch 모두에서 유지되며 없는 링크를 합성하지 않습니다.

## 10. Final architecture and execution flow

content aggregate 로드 → Contact hero 구성 → preferred selector가 enabled/placement 정책으로 links 계산 → 결과 길이 검사 → non-empty이면 `ContentLinkView` cards 렌더링, empty이면 shared empty-state copy 렌더링 → branch와 무관하게 availability/notes 제공.

## 11. Minimal historical code evidence

`9e99c9531cb8`, `src/app/contact/page.tsx`, `ContactPage`:
```tsx
{preferredLinks.length > 0 ? (
  preferredLinks.map((link) => <ContentLinkView key={link.id ?? link.href} link={link} />)
) : (
  <p>{content.presentation.ui.emptyStates.contactLinks}</p>
)}
```
이 발췌는 selector의 0개 결과를 별도 상태로 표현하되 URL을 만들어 내지 않는 수정 계약을 보여 줍니다.

## 12. Learning-completion checks

- [x] Frozen commit map 5개를 모두 completion record와 연결했습니다.
- [x] SHA, subject, importance, tags, source-defined role의 고정 정보를 scaffold와 동일하게 유지했습니다.
- [x] 각 historical claim을 해당 SHA diff에 한정하고 later implementation을 소급하지 않았습니다.
- [x] fix/test가 없거나 다른 category 소유인 경우 그 사실을 명시했습니다.
- [x] runtime execution status를 명시했으며 실행하지 않은 command를 성공으로 기록하지 않았습니다.
- [x] learner placeholder를 남기지 않았습니다.
