# 04-route-features-and-evidence-experiences

> **Repository:** `https://github.com/seungwoo7050/42-archive`  
> **Branch:** `web/portfolio`  
> **Workbook state:** completed workbook

## 1. Category boundary

이 category는 route별 사용자 경험과 그 화면에서 증거 데이터를 구성·생략·연결하는 규칙을 다룹니다.

- 포함: home, project index/detail, About, Resume, Contact, Journey, Interview Map의 feature composition.
- 제외: content ingestion/schema foundation은 category 01, query/navigation lifecycle은 category 02, shared UI/interaction primitives는 category 03, visual systems는 category 05, SEO/security는 category 06, broad test strategy는 category 07, production delivery는 category 08, route projection/renderer ownership은 category 09.
- category 09의 `03-route-projections-and-renderer-data-ownership.md`가 후대 view-model 도입·renderer 강제·projection regression을 전담하므로 이 category에 같은 commit을 중복 편입하지 않았습니다.

## 2. Phase 1 audit decisions

- Thread 수는 8개로 유지했습니다. 각 route experience는 독립적인 data interpretation과 absence policy를 가져 merge/split 대상이 아닙니다.
- `01-dual-home-composition-and-content-driven-sections.md`에 `cdb68fdf59f9` (`feat(home): 클래식 홈 히어로 구성`)를 추가했습니다. 이 commit 없이는 dual-home story의 Classic composition이 비어 있었습니다.
- `06-contact-preference-fallback-and-empty-state.md`의 마지막 두 commit 순서를 실제 이력에 맞게 `bc651dd85e14` → `9e99c9531cb8`로 교정했습니다.
- 나머지 commit set은 유지했습니다. broad route-view-model, renderer registry, visual-system, terminal-state, release/test commits는 sibling category와 중복되므로 추가하지 않았습니다.
- 기존의 범용 investigation prompt는 exact file, function/component, JSON field, selector, branch, missing-reference rule을 지정하는 commit-specific tasks로 대체했습니다.
- source classification에 따라 이 category의 59개 frozen commit은 모두 importance B입니다. S/A/C를 임의로 부여하지 않았습니다.

## 3. Historical and source validation basis

- branch-local `commit/commit-importance.md`와 `commit/commit-bodies.md`를 subject, importance, tags, role의 source로 사용했습니다.
- 모든 frozen SHA는 branch-local classification에서 확인하고 exact commit object/diff를 조회했습니다.
- category의 가장 이른 SHA `3475ba3efdb2`와 `web/portfolio` head 비교에서 merge base가 동일하고 head가 452 commits ahead, 0 behind임을 확인했습니다.
- 다른 branch의 구현·test·documentation을 대체 evidence로 사용하지 않았습니다.
- final HEAD code를 과거 commit 설명에 소급하지 않았습니다.

## 4. Thread inventory

| Order | Thread | Frozen commits | Primary route/experience |
|---:|---|---:|---|
| 1 | [`01-dual-home-composition-and-content-driven-sections.md`](./01-dual-home-composition-and-content-driven-sections.md) | 11 | Design/Classic home |
| 2 | [`02-project-index-grouping-and-dual-presentation.md`](./02-project-index-grouping-and-dual-presentation.md) | 8 | Project index |
| 3 | [`03-project-detail-case-study-composition.md`](./03-project-detail-case-study-composition.md) | 7 | Project detail |
| 4 | [`04-about-profile-skills-experience-and-curation.md`](./04-about-profile-skills-experience-and-curation.md) | 9 | About |
| 5 | [`05-resume-evidence-and-conditional-sections.md`](./05-resume-evidence-and-conditional-sections.md) | 7 | Resume |
| 6 | [`06-contact-preference-fallback-and-empty-state.md`](./06-contact-preference-fallback-and-empty-state.md) | 5 | Contact |
| 7 | [`07-journey-narrative-milestones-and-timeline.md`](./07-journey-narrative-milestones-and-timeline.md) | 6 | Journey |
| 8 | [`08-interview-evidence-map-and-gaps.md`](./08-interview-evidence-map-and-gaps.md) | 6 | Interview Map |

## 5. Shared completion rules

- 각 scaffold file은 같은 filename과 relative path의 completed counterpart 하나만 가집니다.
- SHA, commit order, subject, importance, tags, source-defined role, fixed invariant는 Phase 2에서 변경하지 않습니다.
- B-level commit은 concrete implementation role, data/DOM state, optional/missing branch, ownership, later relationship을 이해할 정도로 기록하되 cross-cutting S-level architecture를 중복 설명하지 않습니다.
- 실제 실행하지 않은 build/test/runtime 결과는 작성하지 않습니다.
- manual resource acquisition/cleanup이 없는 UI commit은 적용 불가라고 명시하고 억지 cleanup story를 만들지 않습니다.

## 6. Completion status

- **Status:** completed
- **Completed counterparts:** 8 / 8
- **Commit records completed:** 59 / 59
- **Historical inspection:** 각 참조 SHA의 GitHub commit object/diff를 exact SHA에서 정적으로 검토했습니다.
- **Runtime evidence:** repository checkout이 GitHub DNS 실패로 생성되지 않아 build/test command는 실행하지 않았습니다. 따라서 runtime pass를 주장하지 않습니다.
- **Placeholder status:** completed 문서에 learner marker가 남아 있지 않습니다.
