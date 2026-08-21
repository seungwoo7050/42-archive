# Development Thread: Contact preference, fallback, and empty state

> **Repository:** `https://github.com/seungwoo7050/42-archive`  
> **Branch:** `web/portfolio`  
> **Category:** `04-route-features-and-evidence-experiences`  
> **Workbook state:** Phase 1 frozen scaffold  
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

- [ ] 모든 commit을 부모 상태와 exact SHA에서 비교하고 final HEAD를 과거에 투영하지 않았습니다.
- [ ] 각 commit의 concrete file/function/component/data field와 caller→callee 또는 data flow를 기록했습니다.
- [ ] optional data, missing reference, empty array, disabled page 등 실제 failure/absence branch를 설명했습니다.
- [ ] 소유권·표시 책임·상태 전환과 적용되지 않는 resource cleanup을 구분했습니다.
- [ ] 보장과 비보장을 분리하고 후속 commit/category와의 관계를 연결했습니다.
- [ ] 실행하지 않은 build/test/runtime 결과를 통과했다고 표시하지 않았습니다.

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

- [ ] Frozen commit map 5개를 모두 completion record와 연결했습니다.
- [ ] SHA, subject, importance, tags, source-defined role의 고정 정보를 scaffold와 동일하게 유지했습니다.
- [ ] 각 historical claim을 해당 SHA diff에 한정하고 later implementation을 소급하지 않았습니다.
- [ ] fix/test가 없거나 다른 category 소유인 경우 그 사실을 명시했습니다.
- [ ] runtime execution status를 명시했으며 실행하지 않은 command를 성공으로 기록하지 않았습니다.
- [ ] learner placeholder를 남기지 않았습니다.
