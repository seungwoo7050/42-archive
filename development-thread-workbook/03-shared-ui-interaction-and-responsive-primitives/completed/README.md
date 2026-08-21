# 03-shared-ui-interaction-and-responsive-primitives

`web/portfolio` branch의 shared UI interaction과 responsive primitive history를 학습하는 category workbook입니다.

## Phase 1 audit 결과

- Category boundary는 shared renderer/component/CSS primitive와 responsive interaction에 한정했습니다.
- Route lifecycle, content schema/loader, design route composition 전체, hydration/performance regression architecture는 인접 category가 소유합니다.
- 기존 01과 06에 중복됐던 `e37ea9c2819a`, `1ef269fbdb49`, `daa6815a6dfa`는 link policy story인 01에만 귀속시켰습니다.
- 01에는 placement vocabulary, detail selector migration, hero placement adoption, regression test와 rendering dedup commits를 추가해 policy → consumer → test → refactor 흐름을 완성했습니다.
- 02에는 실제 `ProfilePhoto` consumer인 `a00a6bf1af58`을 추가했습니다.
- 06은 link action 정책을 제거하고 AvailabilityBadge → ProjectCard → featured consumer → interaction CSS의 card composition story로 보정했습니다.
- README가 약속했지만 빠져 있던 native disclosure/mobile sheet 구현 story를 08 Thread로 추가했습니다.
- 08의 실제 shared-shell integration은 category 02의 `b9571c485013`이, 후속 hydration fix/test/server refactor는 category 07이 소유하므로 여기서는 중복하지 않고 관계만 고정했습니다.
- 나머지 Thread의 경계와 commit order는 실제 history에 맞아 유지했습니다.
- Shared dependency와 consumer story가 전역 history에서 서로 교차하므로 Thread 번호를 전역 commit chronology로 강제하지 않았습니다. 각 Thread 내부는 chronological order이고 category index는 dependency·학습 경계를 따릅니다.

## Branch·metadata 검증 방식

- Branch의 `commit/commit-importance.md`는 root부터 head까지 독립 linear history 476개를 분류합니다.
- 이 category가 참조하는 모든 commit은 그 branch-scoped 목록에서 확인하고 exact SHA commit view로 subject와 changed files를 재확인했습니다.
- 다른 branch의 구현, test, docs 또는 final HEAD를 과거 SHA 설명에 사용하지 않았습니다.
- 실행 가능한 checkout은 작업 환경의 GitHub DNS 해석 실패로 만들지 못했습니다. Runtime test 결과는 없으며 모든 completed 문서가 이를 명시합니다.

## Thread index

| 순서 | Thread | Commit 수 | 경계 |
| --- | --- | --- | --- |
| 1 | [Content link security, placement, and transport](01-content-link-security-and-transport.md) | 10 | 이 Thread는 링크가 어디에 노출되고 어떤 element/URL로 이동하는지를 소유합니다. ProjectCard의 카드 조립과 hover 표현은 06 Thread에 남기며, route lifecycle 자체는 이 범위에 포함하지 않습니다. |
| 2 | [Content media loading and layout stability](02-content-media-loading-and-layout-stability.md) | 5 | 이 Thread는 shared media DOM과 loading/layout contract를 다룹니다. Image optimization pipeline, source asset generation, project detail 정보 architecture 자체는 포함하지 않습니다. |
| 3 | [Progressive reveal to server-first rendering](03-progressive-reveal-to-server-first-rendering.md) | 4 | 이 Thread는 shared Reveal의 visibility/lifecycle과 motion fallback을 다룹니다. 개별 section content, route composition, 전역 performance test architecture는 포함하지 않습니다. |
| 4 | [Terminal state machine and motion fallback](04-terminal-state-machine-and-motion-fallback.md) | 4 | 이 Thread는 terminal preview primitive의 state와 표현을 다룹니다. Terminal content schema validation, home route 전체 section architecture, general motion policy는 각각 다른 Thread의 책임입니다. |
| 5 | [Technology stack icon, list, and marquee](05-technology-stack-icon-list-and-marquee.md) | 5 | 이 Thread는 stack visual primitives를 다룹니다. Tech stack content schema와 `resolveTechStackItem`의 validation/fallback source, home section 전체 composition은 다른 Thread가 소유합니다. |
| 6 | [Project card composition and interaction](06-project-card-composition-and-interaction.md) | 4 | Phase 1에서 기존 `project-card-actions-and-evidence-components` Thread의 link-policy commits를 01 Thread로 이동했습니다. 이 Thread는 card composition과 interaction만 소유하며 link placement/transport는 01 Thread의 selector·renderer를 소비합니다. |
| 7 | [Journey timeline primitives and responsive layout](07-journey-timeline-primitives-and-responsive-layout.md) | 6 | 이 Thread는 journey presentation primitive와 responsive CSS를 다룹니다. Journey JSON schema/validation, route section copy, Reveal의 최종 server-first refactor는 각각 content system과 03 Thread가 소유합니다. |
| 8 | [Design switcher disclosure and responsive sheet](08-design-switcher-disclosure-and-responsive-sheet.md) | 4 | Phase 1에서 category README가 약속했지만 기존 7개 Thread가 다루지 않던 responsive disclosure primitive 구현 story를 추가했습니다. 실제 shared-shell 연결은 category 02의 `b9571c485013`이, 후속 hydration race fix/test와 server-component refactor는 category 07이 소유합니다. 이 frozen commit map에는 primitive 구현 commit만 두고 인접 category의 integration/correction/evidence는 관계로 명시합니다. |

## 구조 규칙

- `scaffold/`는 Phase 1 audit 뒤 동결된 authoritative workbook입니다.
- `completed/`는 동일 file set·relative path·fixed structure를 유지하고 learner-facing section만 채운 counterpart입니다.
- Scaffold와 completed 사이에 SHA, subject, order, importance, tags, role 또는 invariant 차이가 있으면 invalid deliverable입니다.
