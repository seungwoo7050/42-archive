# Thread: Brutalist design system construction

> Project: 42 Archive Portfolio (`web/portfolio`)
>
> Category: `05-full-site-visual-systems`
>
> Phase 1 audit에서 확정한 authoritative scaffold입니다. Phase 2에서는 answer marker 내부만 채웁니다.

## 0. Scope and authority

- Commit SHA, subject, importance, tags는 branch의 `commit/commit-importance.md`와 exact commit metadata를 기준으로 고정했습니다.
- **Thread boundary:** Brutalist stylesheet와 `brutalist-route.tsx` construction만 포함합니다. activation은 Thread 1에, formatting-only media consolidation은 제외합니다.
- 다른 branch, final HEAD의 후대 구현, 실행하지 않은 command 결과를 사용하지 않습니다.

## 1. Thread goal

Brutalist의 고대비 visual grammar, responsive/print 계약, content adapter, 여덟 route와 single public entry가 구축되는 과정을 복원합니다.

### Frozen invariant target

최종 invariant는 Brutalist module이 route entry 하나만 공개하고, shell·navigation·link policy·content adapter·view가 같은 module의 private implementation으로 유지되며, mobile/reduced-motion/print와 missing/empty states가 시각 계약에 포함된다는 것입니다.

## 2. Commit map

| 순서 | Commit | Subject | Importance | Tags | 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `162542118ba4` | style(brutalist): 화면 토큰과 brand mark 구성 | B | RENDERER | Brutalist 시각 계약의 scoped palette·focus·skip-link·header/brand 기초 |
| 2 | `a2539ef309d1` | style(brutalist): header 상태와 home hero 구성 | B | RENDERER | Brutalist 시각 계약의 desktop header status/switcher/navigation/debug와 home hero |
| 3 | `1faf77ef9916` | style(brutalist): hero stamp와 action row 구성 | B | RENDERER | Brutalist 시각 계약의 hero stamp·copy·oversized title·action row |
| 4 | `75913149fe24` | style(brutalist): 주요 action과 section 경계 구성 | B | RENDERER | Brutalist 시각 계약의 high-contrast actions·4-column metrics·signal strip·section boundaries |
| 5 | `f4e53be5ea42` | style(brutalist): section header와 프로젝트 지표 구성 | B | RENDERER | Brutalist 시각 계약의 numbered section-header grid와 project index row |
| 6 | `ebfe79d62e53` | style(brutalist): 프로젝트 지표와 card 번호 구성 | B | RENDERER | Brutalist 시각 계약의 project metadata/tag/action과 principle card |
| 7 | `aaf26e755213` | style(brutalist): 원칙 카드와 contact band 구성 | B | RENDERER | Brutalist 시각 계약의 principles·tech wall·compact timeline·large contact band |
| 8 | `16336e1dc469` | style(brutalist): contact 링크와 프로젝트 group 구성 | B | RENDERER | Brutalist 시각 계약의 contact actions·page hero·inline metrics·grouped archive |
| 9 | `2660465c0904` | style(brutalist): 교차 group과 상세 lead 구성 | B | RENDERER | Brutalist 시각 계약의 alternating groups와 case-study lead |
| 10 | `4621b0a3cb1f` | style(brutalist): 상세 fact와 소개 본문 구성 | B | RENDERER | Brutalist 시각 계약의 detail facts·media frame·placeholder·intro band |
| 11 | `1d5445cc6f4a` | style(brutalist): 상세 본문과 gallery grid 구성 | B | RENDERER | Brutalist 시각 계약의 labeled evidence sections·numbered lists·2-column gallery |
| 12 | `bb5008a8c7b3` | style(brutalist): 다음 프로젝트와 focus card 구성 | B | RENDERER, A11Y | Brutalist 시각 계약의 next-project·not-found recovery·About portrait/skills |
| 13 | `8de2180bcc58` | style(brutalist): focus card와 criteria grid 구성 | B | RENDERER, A11Y | Brutalist 시각 계약의 focus/skill cards와 dark curation criteria |
| 14 | `a34cd7cd88bf` | style(brutalist): criteria 본문과 재검토 영역 구성 | B | RENDERER | Brutalist 시각 계약의 curation category·omission·next-review |
| 15 | `5ca14417cf22` | style(brutalist): 재검토와 resume entry 구성 | B | RENDERER | Brutalist 시각 계약의 review panel 마감과 resume repeated sections |
| 16 | `fad7f0216645` | style(brutalist): resume 본문과 contact hero 구성 | B | RENDERER | Brutalist 시각 계약의 resume project rows/notes와 Contact blue hero |
| 17 | `8175392db042` | style(brutalist): contact 상태와 note 목록 구성 | B | RENDERER | Brutalist 시각 계약의 availability badge·channel grid·note list |
| 18 | `6fa3a9dc8665` | style(brutalist): note 목록과 anchor link 구성 | B | RENDERER | Brutalist 시각 계약의 notes/evidence gaps와 Journey milestone card |
| 19 | `242ba8e66e0b` | style(brutalist): archive timeline과 track navigation 구성 | B | ROUTING, RENDERER | Brutalist 시각 계약의 journey archive/current callout와 Interview track shell |
| 20 | `95e55eda6c51` | style(brutalist): track 목록과 question prompt 구성 | B | RENDERER | Brutalist 시각 계약의 track index·track/question hierarchy |
| 21 | `11f229d630e9` | style(brutalist): 답변 근거와 footer lead 구성 | B | RENDERER | Brutalist 시각 계약의 question reference·answer evidence·empty answer·footer lead |
| 22 | `b170c73a36d0` | style(brutalist): footer metadata와 blink 동작 구성 | B | RENDERER, SEO | Brutalist 시각 계약의 footer metadata·dashed empty state·crawl/blink animations |
| 23 | `f810c49022be` | style(brutalist): tablet grid 재배치 | B | RENDERER | Brutalist 시각 계약의 980px tablet grid reflow |
| 24 | `b57da6a41419` | style(brutalist): mobile header와 hero 구성 | B | RENDERER | Brutalist 시각 계약의 720px native details menu와 stacked header/hero |
| 25 | `8168bc76c3e3` | style(brutalist): mobile 프로젝트와 상세 화면 구성 | B | RENDERER | Brutalist 시각 계약의 mobile metrics/project rows/detail/gallery reflow |
| 26 | `5551f3fdbb94` | style(brutalist): mobile profile과 resume 구성 | B | RENDERER | Brutalist 시각 계약의 mobile profile/curation/resume/contact/current-position |
| 27 | `7c08aea7a2f7` | style(brutalist): mobile 여정과 interview 구성 | B | RENDERER | Brutalist 시각 계약의 mobile journey/interview/footer/missing page |
| 28 | `077ff3d49f30` | style(brutalist): 소형 화면과 인쇄 경계 구성 | B | RENDERER | Brutalist 시각 계약의 430px hardening·reduced motion·print |
| 29 | `3e6ec5262bdd` | feat(brutalist): 콘텐츠와 탐색 조회 도우미 추가 | B | CONTENT, ROUTING, RENDERER | content/navigation adapter layer |
| 30 | `08a2b0c0998f` | feat(brutalist): route 레이블과 기본 shell 구성 | B | ROUTING, RENDERER | shared shell start |
| 31 | `cf2fdb36f9fc` | feat(brutalist): 주 탐색과 모바일 메뉴 추가 | B | ROUTING, RENDERER | canonical navigation |
| 32 | `5b44afbc46ef` | feat(brutalist): footer와 홈 히어로 연결 | B | RENDERER | footer + Home start |
| 33 | `b477ba477127` | feat(brutalist): 홈 섹션 공용 프리미티브 추가 | B | RENDERER | Home/archive primitives |
| 34 | `b30b9b1c3505` | feat(brutalist): 대표 작업과 작업 원칙 구성 | B | RENDERER | Home middle + Projects hero |
| 35 | `85ea663aaf19` | feat(brutalist): 홈 여정과 프로젝트 archive 구성 | B | RENDERER | Home completion + Projects archive |
| 36 | `d6b9a99e11ae` | feat(brutalist): 프로젝트 상세 표시 프리미티브 추가 | B | RENDERER | Project detail primitives |
| 37 | `b8268f47e89a` | feat(brutalist): 프로젝트 상세 hero와 소개 구성 | B | RENDERER | Project detail valid/missing boundary |
| 38 | `05b838d52a8b` | feat(brutalist): 프로젝트 상세 본문과 gallery 구성 | B | RENDERER | Project detail evidence body |
| 39 | `80724a26820b` | feat(brutalist): 프로필과 기술 소개 구성 | B | RENDERER | About identity |
| 40 | `3399b55c3aee` | feat(brutalist): 큐레이션과 경력 소개 구성 | B | CONTENT, RENDERER | About experience + feature-gated curation |
| 41 | `70cf13ef1715` | feat(brutalist): 이력 hero와 경력 요약 구성 | B | RENDERER | Resume start |
| 42 | `1ea2a1345b76` | feat(brutalist): 프로젝트 결과와 의사결정 구성 | B | RENDERER | Project detail completion |
| 43 | `5fa378250d64` | feat(brutalist): 선택 프로젝트와 이력 세부 구성 | B | RENDERER | Resume completion |
| 44 | `b535539ae016` | feat(brutalist): 연락 수단과 안내 구성 | B | RENDERER | Contact route |
| 45 | `15a765ecb2aa` | feat(brutalist): 여정 milestone 구성 | B | RENDERER | Journey narrative start |
| 46 | `388446b1a982` | feat(brutalist): 여정 archive와 인터뷰 map 머리말 구성 | B | RENDERER | Journey completion + Interview start |
| 47 | `f3fc6200a45b` | feat(brutalist): 인터뷰 근거 archive 구성 | B | RENDERER | Interview evidence |
| 48 | `da8e59d56783` | feat(brutalist): 인터뷰 근거 공백 구성 | B | RENDERER | Interview gaps |
| 49 | `e6268c4b7c74` | refactor(brutalist): 내부 helper 공개 범위 정리 | B | RENDERER, REFACTOR | module API narrowing |
| 50 | `caa7df81d899` | feat(brutalist): 모든 route를 renderer에 통합 | A | ARCH, ROUTING, RENDERER | Brutalist public API와 여덟 route dispatch의 최종 경계 |

## 3. Historical baseline

<!-- LEARNER-ANSWER:thread:03-brutalist-design-system-construction.md:baseline:BEGIN -->
- **직전 상태:** 공통 route delegation은 있었지만 Brutalist는 CSS/DOM/shell/helper가 전혀 없는 상태였습니다. 구현 초기는 renderer 내부 content lookup helper를 직접 소유했습니다.
- **경계 판단:** Brutalist stylesheet와 `brutalist-route.tsx` construction만 포함합니다. activation은 Thread 1에, formatting-only media consolidation은 제외합니다.
- **복원 기준:** 각 commit의 parent와 exact SHA tree만 사용하고 final HEAD를 이전 상태에 소급하지 않았습니다.
<!-- LEARNER-ANSWER:thread:03-brutalist-design-system-construction.md:baseline:END -->

## 4. Commit-by-commit reconstruction

### 1. `162542118ba4` — style(brutalist): 화면 토큰과 brand mark 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Brutalist 시각 계약의 scoped palette·focus·skip-link·header/brand 기초

#### Commit-specific investigation

- `162542118ba4^`와 `162542118ba4`를 비교하고 `src/designs/brutalist/brutalist.module.css`에서 **parent diff에서 scoped palette·focus·skip-link·header/brand 기초에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist 시각 계약의 scoped palette·focus·skip-link·header/brand 기초` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:162542118ba4:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **parent diff에서 scoped palette·focus·skip-link·header/brand 기초에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **변경:** `src/designs/brutalist/brutalist.module.css`의 해당 SHA diff가 paper/ink/blue/yellow token, box sizing, focus-visible, selection, skip link와 brand mark를 만든다. 이전 상태에는 이 selector 묶음 또는 breakpoint 재배치가 없었고, 이후 DOM이 사용할 지면 규칙을 이 시점부터 제공한다. 소유권은 콘텐츠/route가 아니라 Brutalist stylesheet에 남는다.
- **inspection:** `src/designs/brutalist/brutalist.module.css`의 parent diff에서 scoped palette·focus·skip-link·header/brand 기초에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인를 확인했습니다.
- **책임/경계:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/designs/brutalist/brutalist.module.css`의 scoped stylesheet가 소유합니다.
- **비보장:** 이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:162542118ba4:END -->

### 2. `a2539ef309d1` — style(brutalist): header 상태와 home hero 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Brutalist 시각 계약의 desktop header status/switcher/navigation/debug와 home hero

#### Commit-specific investigation

- `a2539ef309d1^`와 `a2539ef309d1`를 비교하고 `src/designs/brutalist/brutalist.module.css`에서 **parent diff에서 desktop header status/switcher/navigation/debug와 home hero에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist 시각 계약의 desktop header status/switcher/navigation/debug와 home hero` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:a2539ef309d1:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **parent diff에서 desktop header status/switcher/navigation/debug와 home hero에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **변경:** `src/designs/brutalist/brutalist.module.css`의 해당 SHA diff가 명시적 상태 cell과 큰 hero grid를 만든다. 이전 상태에는 이 selector 묶음 또는 breakpoint 재배치가 없었고, 이후 DOM이 사용할 지면 규칙을 이 시점부터 제공한다. 소유권은 콘텐츠/route가 아니라 Brutalist stylesheet에 남는다.
- **inspection:** `src/designs/brutalist/brutalist.module.css`의 parent diff에서 desktop header status/switcher/navigation/debug와 home hero에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인를 확인했습니다.
- **책임/경계:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/designs/brutalist/brutalist.module.css`의 scoped stylesheet가 소유합니다.
- **비보장:** 이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:a2539ef309d1:END -->

### 3. `1faf77ef9916` — style(brutalist): hero stamp와 action row 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Brutalist 시각 계약의 hero stamp·copy·oversized title·action row

#### Commit-specific investigation

- `1faf77ef9916^`와 `1faf77ef9916`를 비교하고 `src/designs/brutalist/brutalist.module.css`에서 **parent diff에서 hero stamp·copy·oversized title·action row에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist 시각 계약의 hero stamp·copy·oversized title·action row` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:1faf77ef9916:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **parent diff에서 hero stamp·copy·oversized title·action row에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **변경:** `src/designs/brutalist/brutalist.module.css`의 해당 SHA diff가 hero의 시각적 stamp와 유연한 action row를 완성한다. 이전 상태에는 이 selector 묶음 또는 breakpoint 재배치가 없었고, 이후 DOM이 사용할 지면 규칙을 이 시점부터 제공한다. 소유권은 콘텐츠/route가 아니라 Brutalist stylesheet에 남는다.
- **inspection:** `src/designs/brutalist/brutalist.module.css`의 parent diff에서 hero stamp·copy·oversized title·action row에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인를 확인했습니다.
- **책임/경계:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/designs/brutalist/brutalist.module.css`의 scoped stylesheet가 소유합니다.
- **비보장:** 이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:1faf77ef9916:END -->

### 4. `75913149fe24` — style(brutalist): 주요 action과 section 경계 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Brutalist 시각 계약의 high-contrast actions·4-column metrics·signal strip·section boundaries

#### Commit-specific investigation

- `75913149fe24^`와 `75913149fe24`를 비교하고 `src/designs/brutalist/brutalist.module.css`에서 **parent diff에서 high-contrast actions·4-column metrics·signal strip·section boundaries에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist 시각 계약의 high-contrast actions·4-column metrics·signal strip·section boundaries` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:75913149fe24:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **parent diff에서 high-contrast actions·4-column metrics·signal strip·section boundaries에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **변경:** `src/designs/brutalist/brutalist.module.css`의 해당 SHA diff가 공용 버튼 grammar와 metric/signal/section 구획을 추가한다. 이전 상태에는 이 selector 묶음 또는 breakpoint 재배치가 없었고, 이후 DOM이 사용할 지면 규칙을 이 시점부터 제공한다. 소유권은 콘텐츠/route가 아니라 Brutalist stylesheet에 남는다.
- **inspection:** `src/designs/brutalist/brutalist.module.css`의 parent diff에서 high-contrast actions·4-column metrics·signal strip·section boundaries에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인를 확인했습니다.
- **책임/경계:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/designs/brutalist/brutalist.module.css`의 scoped stylesheet가 소유합니다.
- **비보장:** 이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:75913149fe24:END -->

### 5. `f4e53be5ea42` — style(brutalist): section header와 프로젝트 지표 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Brutalist 시각 계약의 numbered section-header grid와 project index row

#### Commit-specific investigation

- `f4e53be5ea42^`와 `f4e53be5ea42`를 비교하고 `src/designs/brutalist/brutalist.module.css`에서 **parent diff에서 numbered section-header grid와 project index row에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist 시각 계약의 numbered section-header grid와 project index row` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:f4e53be5ea42:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **parent diff에서 numbered section-header grid와 project index row에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **변경:** `src/designs/brutalist/brutalist.module.css`의 해당 SHA diff가 홈·archive에서 재사용할 번호 header와 project metadata row를 정의한다. 이전 상태에는 이 selector 묶음 또는 breakpoint 재배치가 없었고, 이후 DOM이 사용할 지면 규칙을 이 시점부터 제공한다. 소유권은 콘텐츠/route가 아니라 Brutalist stylesheet에 남는다.
- **inspection:** `src/designs/brutalist/brutalist.module.css`의 parent diff에서 numbered section-header grid와 project index row에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인를 확인했습니다.
- **책임/경계:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/designs/brutalist/brutalist.module.css`의 scoped stylesheet가 소유합니다.
- **비보장:** 이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:f4e53be5ea42:END -->

### 6. `ebfe79d62e53` — style(brutalist): 프로젝트 지표와 card 번호 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Brutalist 시각 계약의 project metadata/tag/action과 principle card

#### Commit-specific investigation

- `ebfe79d62e53^`와 `ebfe79d62e53`를 비교하고 `src/designs/brutalist/brutalist.module.css`에서 **parent diff에서 project metadata/tag/action과 principle card에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist 시각 계약의 project metadata/tag/action과 principle card` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:ebfe79d62e53:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **parent diff에서 project metadata/tag/action과 principle card에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **변경:** `src/designs/brutalist/brutalist.module.css`의 해당 SHA diff가 project index를 완성하고 첫 principle card system을 추가한다. 이전 상태에는 이 selector 묶음 또는 breakpoint 재배치가 없었고, 이후 DOM이 사용할 지면 규칙을 이 시점부터 제공한다. 소유권은 콘텐츠/route가 아니라 Brutalist stylesheet에 남는다.
- **inspection:** `src/designs/brutalist/brutalist.module.css`의 parent diff에서 project metadata/tag/action과 principle card에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인를 확인했습니다.
- **책임/경계:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/designs/brutalist/brutalist.module.css`의 scoped stylesheet가 소유합니다.
- **비보장:** 이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:ebfe79d62e53:END -->

### 7. `aaf26e755213` — style(brutalist): 원칙 카드와 contact band 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Brutalist 시각 계약의 principles·tech wall·compact timeline·large contact band

#### Commit-specific investigation

- `aaf26e755213^`와 `aaf26e755213`를 비교하고 `src/designs/brutalist/brutalist.module.css`에서 **parent diff에서 principles·tech wall·compact timeline·large contact band에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist 시각 계약의 principles·tech wall·compact timeline·large contact band` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:aaf26e755213:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **parent diff에서 principles·tech wall·compact timeline·large contact band에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **변경:** `src/designs/brutalist/brutalist.module.css`의 해당 SHA diff가 Home 후반의 principle/stack/journey/contact 지면을 만든다. 이전 상태에는 이 selector 묶음 또는 breakpoint 재배치가 없었고, 이후 DOM이 사용할 지면 규칙을 이 시점부터 제공한다. 소유권은 콘텐츠/route가 아니라 Brutalist stylesheet에 남는다.
- **inspection:** `src/designs/brutalist/brutalist.module.css`의 parent diff에서 principles·tech wall·compact timeline·large contact band에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인를 확인했습니다.
- **책임/경계:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/designs/brutalist/brutalist.module.css`의 scoped stylesheet가 소유합니다.
- **비보장:** 이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:aaf26e755213:END -->

### 8. `16336e1dc469` — style(brutalist): contact 링크와 프로젝트 group 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Brutalist 시각 계약의 contact actions·page hero·inline metrics·grouped archive

#### Commit-specific investigation

- `16336e1dc469^`와 `16336e1dc469`를 비교하고 `src/designs/brutalist/brutalist.module.css`에서 **parent diff에서 contact actions·page hero·inline metrics·grouped archive에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist 시각 계약의 contact actions·page hero·inline metrics·grouped archive` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:16336e1dc469:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **parent diff에서 contact actions·page hero·inline metrics·grouped archive에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **변경:** `src/designs/brutalist/brutalist.module.css`의 해당 SHA diff가 Contact action과 Projects archive 공용 구조를 시작한다. 이전 상태에는 이 selector 묶음 또는 breakpoint 재배치가 없었고, 이후 DOM이 사용할 지면 규칙을 이 시점부터 제공한다. 소유권은 콘텐츠/route가 아니라 Brutalist stylesheet에 남는다.
- **inspection:** `src/designs/brutalist/brutalist.module.css`의 parent diff에서 contact actions·page hero·inline metrics·grouped archive에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인를 확인했습니다.
- **책임/경계:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/designs/brutalist/brutalist.module.css`의 scoped stylesheet가 소유합니다.
- **비보장:** 이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:16336e1dc469:END -->

### 9. `2660465c0904` — style(brutalist): 교차 group과 상세 lead 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Brutalist 시각 계약의 alternating groups와 case-study lead

#### Commit-specific investigation

- `2660465c0904^`와 `2660465c0904`를 비교하고 `src/designs/brutalist/brutalist.module.css`에서 **parent diff에서 alternating groups와 case-study lead에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist 시각 계약의 alternating groups와 case-study lead` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:2660465c0904:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **parent diff에서 alternating groups와 case-study lead에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **변경:** `src/designs/brutalist/brutalist.module.css`의 해당 SHA diff가 archive group의 교차 배경과 상세 도입 grid를 정의한다. 이전 상태에는 이 selector 묶음 또는 breakpoint 재배치가 없었고, 이후 DOM이 사용할 지면 규칙을 이 시점부터 제공한다. 소유권은 콘텐츠/route가 아니라 Brutalist stylesheet에 남는다.
- **inspection:** `src/designs/brutalist/brutalist.module.css`의 parent diff에서 alternating groups와 case-study lead에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인를 확인했습니다.
- **책임/경계:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/designs/brutalist/brutalist.module.css`의 scoped stylesheet가 소유합니다.
- **비보장:** 이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:2660465c0904:END -->

### 10. `4621b0a3cb1f` — style(brutalist): 상세 fact와 소개 본문 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Brutalist 시각 계약의 detail facts·media frame·placeholder·intro band

#### Commit-specific investigation

- `4621b0a3cb1f^`와 `4621b0a3cb1f`를 비교하고 `src/designs/brutalist/brutalist.module.css`에서 **parent diff에서 detail facts·media frame·placeholder·intro band에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist 시각 계약의 detail facts·media frame·placeholder·intro band` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:4621b0a3cb1f:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **parent diff에서 detail facts·media frame·placeholder·intro band에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **변경:** `src/designs/brutalist/brutalist.module.css`의 해당 SHA diff가 project detail의 fact/media/intro 기초를 추가한다. 이전 상태에는 이 selector 묶음 또는 breakpoint 재배치가 없었고, 이후 DOM이 사용할 지면 규칙을 이 시점부터 제공한다. 소유권은 콘텐츠/route가 아니라 Brutalist stylesheet에 남는다.
- **inspection:** `src/designs/brutalist/brutalist.module.css`의 parent diff에서 detail facts·media frame·placeholder·intro band에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인를 확인했습니다.
- **책임/경계:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/designs/brutalist/brutalist.module.css`의 scoped stylesheet가 소유합니다.
- **비보장:** 이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:4621b0a3cb1f:END -->

### 11. `1d5445cc6f4a` — style(brutalist): 상세 본문과 gallery grid 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Brutalist 시각 계약의 labeled evidence sections·numbered lists·2-column gallery

#### Commit-specific investigation

- `1d5445cc6f4a^`와 `1d5445cc6f4a`를 비교하고 `src/designs/brutalist/brutalist.module.css`에서 **parent diff에서 labeled evidence sections·numbered lists·2-column gallery에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist 시각 계약의 labeled evidence sections·numbered lists·2-column gallery` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:1d5445cc6f4a:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **parent diff에서 labeled evidence sections·numbered lists·2-column gallery에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **변경:** `src/designs/brutalist/brutalist.module.css`의 해당 SHA diff가 장문 case-study evidence와 gallery를 구조화한다. 이전 상태에는 이 selector 묶음 또는 breakpoint 재배치가 없었고, 이후 DOM이 사용할 지면 규칙을 이 시점부터 제공한다. 소유권은 콘텐츠/route가 아니라 Brutalist stylesheet에 남는다.
- **inspection:** `src/designs/brutalist/brutalist.module.css`의 parent diff에서 labeled evidence sections·numbered lists·2-column gallery에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인를 확인했습니다.
- **책임/경계:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/designs/brutalist/brutalist.module.css`의 scoped stylesheet가 소유합니다.
- **비보장:** 이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:1d5445cc6f4a:END -->

### 12. `bb5008a8c7b3` — style(brutalist): 다음 프로젝트와 focus card 구성

- **Importance:** B
- **Tags:** RENDERER, A11Y
- **Thread role:** Brutalist 시각 계약의 next-project·not-found recovery·About portrait/skills

#### Commit-specific investigation

- `bb5008a8c7b3^`와 `bb5008a8c7b3`를 비교하고 `src/designs/brutalist/brutalist.module.css`에서 **parent diff에서 next-project·not-found recovery·About portrait/skills에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist 시각 계약의 next-project·not-found recovery·About portrait/skills` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `reduced-motion·focus·semantic 보조는 CSS/DOM 계약의 일부만 다루며, 실제 WCAG 적합성이나 모든 보조기기 동작을 단독으로 보장하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:bb5008a8c7b3:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **parent diff에서 next-project·not-found recovery·About portrait/skills에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **변경:** `src/designs/brutalist/brutalist.module.css`의 해당 SHA diff가 상세 continuation/복구 상태와 About 시작 지면을 추가한다. 이전 상태에는 이 selector 묶음 또는 breakpoint 재배치가 없었고, 이후 DOM이 사용할 지면 규칙을 이 시점부터 제공한다. 소유권은 콘텐츠/route가 아니라 Brutalist stylesheet에 남는다.
- **inspection:** `src/designs/brutalist/brutalist.module.css`의 parent diff에서 next-project·not-found recovery·About portrait/skills에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인를 확인했습니다.
- **책임/경계:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/designs/brutalist/brutalist.module.css`의 scoped stylesheet가 소유합니다.
- **비보장:** reduced-motion·focus·semantic 보조는 CSS/DOM 계약의 일부만 다루며, 실제 WCAG 적합성이나 모든 보조기기 동작을 단독으로 보장하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:bb5008a8c7b3:END -->

### 13. `8de2180bcc58` — style(brutalist): focus card와 criteria grid 구성

- **Importance:** B
- **Tags:** RENDERER, A11Y
- **Thread role:** Brutalist 시각 계약의 focus/skill cards와 dark curation criteria

#### Commit-specific investigation

- `8de2180bcc58^`와 `8de2180bcc58`를 비교하고 `src/designs/brutalist/brutalist.module.css`에서 **parent diff에서 focus/skill cards와 dark curation criteria에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist 시각 계약의 focus/skill cards와 dark curation criteria` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `reduced-motion·focus·semantic 보조는 CSS/DOM 계약의 일부만 다루며, 실제 WCAG 적합성이나 모든 보조기기 동작을 단독으로 보장하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:8de2180bcc58:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **parent diff에서 focus/skill cards와 dark curation criteria에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **변경:** `src/designs/brutalist/brutalist.module.css`의 해당 SHA diff가 About 기술 카드와 numbered curation criteria를 완성한다. 이전 상태에는 이 selector 묶음 또는 breakpoint 재배치가 없었고, 이후 DOM이 사용할 지면 규칙을 이 시점부터 제공한다. 소유권은 콘텐츠/route가 아니라 Brutalist stylesheet에 남는다.
- **inspection:** `src/designs/brutalist/brutalist.module.css`의 parent diff에서 focus/skill cards와 dark curation criteria에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인를 확인했습니다.
- **책임/경계:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/designs/brutalist/brutalist.module.css`의 scoped stylesheet가 소유합니다.
- **비보장:** reduced-motion·focus·semantic 보조는 CSS/DOM 계약의 일부만 다루며, 실제 WCAG 적합성이나 모든 보조기기 동작을 단독으로 보장하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:8de2180bcc58:END -->

### 14. `a34cd7cd88bf` — style(brutalist): criteria 본문과 재검토 영역 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Brutalist 시각 계약의 curation category·omission·next-review

#### Commit-specific investigation

- `a34cd7cd88bf^`와 `a34cd7cd88bf`를 비교하고 `src/designs/brutalist/brutalist.module.css`에서 **parent diff에서 curation category·omission·next-review에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist 시각 계약의 curation category·omission·next-review` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:a34cd7cd88bf:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **parent diff에서 curation category·omission·next-review에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **변경:** `src/designs/brutalist/brutalist.module.css`의 해당 SHA diff가 큐레이션 presentation을 category/omission/review까지 완성한다. 이전 상태에는 이 selector 묶음 또는 breakpoint 재배치가 없었고, 이후 DOM이 사용할 지면 규칙을 이 시점부터 제공한다. 소유권은 콘텐츠/route가 아니라 Brutalist stylesheet에 남는다.
- **inspection:** `src/designs/brutalist/brutalist.module.css`의 parent diff에서 curation category·omission·next-review에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인를 확인했습니다.
- **책임/경계:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/designs/brutalist/brutalist.module.css`의 scoped stylesheet가 소유합니다.
- **비보장:** 이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:a34cd7cd88bf:END -->

### 15. `5ca14417cf22` — style(brutalist): 재검토와 resume entry 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Brutalist 시각 계약의 review panel 마감과 resume repeated sections

#### Commit-specific investigation

- `5ca14417cf22^`와 `5ca14417cf22`를 비교하고 `src/designs/brutalist/brutalist.module.css`에서 **parent diff에서 review panel 마감과 resume repeated sections에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist 시각 계약의 review panel 마감과 resume repeated sections` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:5ca14417cf22:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **parent diff에서 review panel 마감과 resume repeated sections에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **변경:** `src/designs/brutalist/brutalist.module.css`의 해당 SHA diff가 큐레이션 종료와 Resume entry grammar를 연결한다. 이전 상태에는 이 selector 묶음 또는 breakpoint 재배치가 없었고, 이후 DOM이 사용할 지면 규칙을 이 시점부터 제공한다. 소유권은 콘텐츠/route가 아니라 Brutalist stylesheet에 남는다.
- **inspection:** `src/designs/brutalist/brutalist.module.css`의 parent diff에서 review panel 마감과 resume repeated sections에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인를 확인했습니다.
- **책임/경계:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/designs/brutalist/brutalist.module.css`의 scoped stylesheet가 소유합니다.
- **비보장:** 이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:5ca14417cf22:END -->

### 16. `fad7f0216645` — style(brutalist): resume 본문과 contact hero 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Brutalist 시각 계약의 resume project rows/notes와 Contact blue hero

#### Commit-specific investigation

- `fad7f0216645^`와 `fad7f0216645`를 비교하고 `src/designs/brutalist/brutalist.module.css`에서 **parent diff에서 resume project rows/notes와 Contact blue hero에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist 시각 계약의 resume project rows/notes와 Contact blue hero` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:fad7f0216645:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **parent diff에서 resume project rows/notes와 Contact blue hero에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **변경:** `src/designs/brutalist/brutalist.module.css`의 해당 SHA diff가 Resume 후반과 Contact 시작을 구성한다. 이전 상태에는 이 selector 묶음 또는 breakpoint 재배치가 없었고, 이후 DOM이 사용할 지면 규칙을 이 시점부터 제공한다. 소유권은 콘텐츠/route가 아니라 Brutalist stylesheet에 남는다.
- **inspection:** `src/designs/brutalist/brutalist.module.css`의 parent diff에서 resume project rows/notes와 Contact blue hero에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인를 확인했습니다.
- **책임/경계:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/designs/brutalist/brutalist.module.css`의 scoped stylesheet가 소유합니다.
- **비보장:** 이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:fad7f0216645:END -->

### 17. `8175392db042` — style(brutalist): contact 상태와 note 목록 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Brutalist 시각 계약의 availability badge·channel grid·note list

#### Commit-specific investigation

- `8175392db042^`와 `8175392db042`를 비교하고 `src/designs/brutalist/brutalist.module.css`에서 **parent diff에서 availability badge·channel grid·note list에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist 시각 계약의 availability badge·channel grid·note list` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:8175392db042:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **parent diff에서 availability badge·channel grid·note list에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **변경:** `src/designs/brutalist/brutalist.module.css`의 해당 SHA diff가 Contact 상태/수단과 반복 note 기반을 만든다. 이전 상태에는 이 selector 묶음 또는 breakpoint 재배치가 없었고, 이후 DOM이 사용할 지면 규칙을 이 시점부터 제공한다. 소유권은 콘텐츠/route가 아니라 Brutalist stylesheet에 남는다.
- **inspection:** `src/designs/brutalist/brutalist.module.css`의 parent diff에서 availability badge·channel grid·note list에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인를 확인했습니다.
- **책임/경계:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/designs/brutalist/brutalist.module.css`의 scoped stylesheet가 소유합니다.
- **비보장:** 이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:8175392db042:END -->

### 18. `6fa3a9dc8665` — style(brutalist): note 목록과 anchor link 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Brutalist 시각 계약의 notes/evidence gaps와 Journey milestone card

#### Commit-specific investigation

- `6fa3a9dc8665^`와 `6fa3a9dc8665`를 비교하고 `src/designs/brutalist/brutalist.module.css`에서 **parent diff에서 notes/evidence gaps와 Journey milestone card에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist 시각 계약의 notes/evidence gaps와 Journey milestone card` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:6fa3a9dc8665:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **parent diff에서 notes/evidence gaps와 Journey milestone card에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **변경:** `src/designs/brutalist/brutalist.module.css`의 해당 SHA diff가 Contact note를 마감하고 Journey anchor card를 연다. 이전 상태에는 이 selector 묶음 또는 breakpoint 재배치가 없었고, 이후 DOM이 사용할 지면 규칙을 이 시점부터 제공한다. 소유권은 콘텐츠/route가 아니라 Brutalist stylesheet에 남는다.
- **inspection:** `src/designs/brutalist/brutalist.module.css`의 parent diff에서 notes/evidence gaps와 Journey milestone card에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인를 확인했습니다.
- **책임/경계:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/designs/brutalist/brutalist.module.css`의 scoped stylesheet가 소유합니다.
- **비보장:** 이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:6fa3a9dc8665:END -->

### 19. `242ba8e66e0b` — style(brutalist): archive timeline과 track navigation 구성

- **Importance:** B
- **Tags:** ROUTING, RENDERER
- **Thread role:** Brutalist 시각 계약의 journey archive/current callout와 Interview track shell

#### Commit-specific investigation

- `242ba8e66e0b^`와 `242ba8e66e0b`를 비교하고 `src/designs/brutalist/brutalist.module.css`에서 **parent diff에서 journey archive/current callout와 Interview track shell에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist 시각 계약의 journey archive/current callout와 Interview track shell` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:242ba8e66e0b:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **parent diff에서 journey archive/current callout와 Interview track shell에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **변경:** `src/designs/brutalist/brutalist.module.css`의 해당 SHA diff가 여정 archive와 인터뷰 in-page navigation 기반을 추가한다. 이전 상태에는 이 selector 묶음 또는 breakpoint 재배치가 없었고, 이후 DOM이 사용할 지면 규칙을 이 시점부터 제공한다. 소유권은 콘텐츠/route가 아니라 Brutalist stylesheet에 남는다.
- **inspection:** `src/designs/brutalist/brutalist.module.css`의 parent diff에서 journey archive/current callout와 Interview track shell에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인를 확인했습니다.
- **책임/경계:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/designs/brutalist/brutalist.module.css`의 scoped stylesheet가 소유합니다.
- **비보장:** 이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:242ba8e66e0b:END -->

### 20. `95e55eda6c51` — style(brutalist): track 목록과 question prompt 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Brutalist 시각 계약의 track index·track/question hierarchy

#### Commit-specific investigation

- `95e55eda6c51^`와 `95e55eda6c51`를 비교하고 `src/designs/brutalist/brutalist.module.css`에서 **parent diff에서 track index·track/question hierarchy에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist 시각 계약의 track index·track/question hierarchy` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:95e55eda6c51:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **parent diff에서 track index·track/question hierarchy에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **변경:** `src/designs/brutalist/brutalist.module.css`의 해당 SHA diff가 Interview 질문 hierarchy와 track 목록을 완성한다. 이전 상태에는 이 selector 묶음 또는 breakpoint 재배치가 없었고, 이후 DOM이 사용할 지면 규칙을 이 시점부터 제공한다. 소유권은 콘텐츠/route가 아니라 Brutalist stylesheet에 남는다.
- **inspection:** `src/designs/brutalist/brutalist.module.css`의 parent diff에서 track index·track/question hierarchy에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인를 확인했습니다.
- **책임/경계:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/designs/brutalist/brutalist.module.css`의 scoped stylesheet가 소유합니다.
- **비보장:** 이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:95e55eda6c51:END -->

### 21. `11f229d630e9` — style(brutalist): 답변 근거와 footer lead 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Brutalist 시각 계약의 question reference·answer evidence·empty answer·footer lead

#### Commit-specific investigation

- `11f229d630e9^`와 `11f229d630e9`를 비교하고 `src/designs/brutalist/brutalist.module.css`에서 **parent diff에서 question reference·answer evidence·empty answer·footer lead에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist 시각 계약의 question reference·answer evidence·empty answer·footer lead` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:11f229d630e9:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **parent diff에서 question reference·answer evidence·empty answer·footer lead에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **변경:** `src/designs/brutalist/brutalist.module.css`의 해당 SHA diff가 답변 근거와 빈 답변 표현, footer 도입부를 추가한다. 이전 상태에는 이 selector 묶음 또는 breakpoint 재배치가 없었고, 이후 DOM이 사용할 지면 규칙을 이 시점부터 제공한다. 소유권은 콘텐츠/route가 아니라 Brutalist stylesheet에 남는다.
- **inspection:** `src/designs/brutalist/brutalist.module.css`의 parent diff에서 question reference·answer evidence·empty answer·footer lead에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인를 확인했습니다.
- **책임/경계:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/designs/brutalist/brutalist.module.css`의 scoped stylesheet가 소유합니다.
- **비보장:** 이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:11f229d630e9:END -->

### 22. `b170c73a36d0` — style(brutalist): footer metadata와 blink 동작 구성

- **Importance:** B
- **Tags:** RENDERER, SEO
- **Thread role:** Brutalist 시각 계약의 footer metadata·dashed empty state·crawl/blink animations

#### Commit-specific investigation

- `b170c73a36d0^`와 `b170c73a36d0`를 비교하고 `src/designs/brutalist/brutalist.module.css`에서 **parent diff에서 footer metadata·dashed empty state·crawl/blink animations에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist 시각 계약의 footer metadata·dashed empty state·crawl/blink animations` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:b170c73a36d0:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **parent diff에서 footer metadata·dashed empty state·crawl/blink animations에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **변경:** `src/designs/brutalist/brutalist.module.css`의 해당 SHA diff가 footer와 공용 empty block, 두 animation을 완성한다. 이전 상태에는 이 selector 묶음 또는 breakpoint 재배치가 없었고, 이후 DOM이 사용할 지면 규칙을 이 시점부터 제공한다. 소유권은 콘텐츠/route가 아니라 Brutalist stylesheet에 남는다.
- **inspection:** `src/designs/brutalist/brutalist.module.css`의 parent diff에서 footer metadata·dashed empty state·crawl/blink animations에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인를 확인했습니다.
- **책임/경계:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/designs/brutalist/brutalist.module.css`의 scoped stylesheet가 소유합니다.
- **비보장:** 이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:b170c73a36d0:END -->

### 23. `f810c49022be` — style(brutalist): tablet grid 재배치

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Brutalist 시각 계약의 980px tablet grid reflow

#### Commit-specific investigation

- `f810c49022be^`와 `f810c49022be`를 비교하고 `src/designs/brutalist/brutalist.module.css`에서 **parent diff에서 980px tablet grid reflow에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist 시각 계약의 980px tablet grid reflow` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:f810c49022be:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **parent diff에서 980px tablet grid reflow에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **변경:** `src/designs/brutalist/brutalist.module.css`의 해당 SHA diff가 desktop grid를 tablet column/reading order로 재배치한다. 이전 상태에는 이 selector 묶음 또는 breakpoint 재배치가 없었고, 이후 DOM이 사용할 지면 규칙을 이 시점부터 제공한다. 소유권은 콘텐츠/route가 아니라 Brutalist stylesheet에 남는다.
- **inspection:** `src/designs/brutalist/brutalist.module.css`의 parent diff에서 980px tablet grid reflow에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인를 확인했습니다.
- **책임/경계:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/designs/brutalist/brutalist.module.css`의 scoped stylesheet가 소유합니다.
- **비보장:** 이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:f810c49022be:END -->

### 24. `b57da6a41419` — style(brutalist): mobile header와 hero 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Brutalist 시각 계약의 720px native details menu와 stacked header/hero

#### Commit-specific investigation

- `b57da6a41419^`와 `b57da6a41419`를 비교하고 `src/designs/brutalist/brutalist.module.css`에서 **parent diff에서 720px native details menu와 stacked header/hero에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist 시각 계약의 720px native details menu와 stacked header/hero` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:b57da6a41419:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **parent diff에서 720px native details menu와 stacked header/hero에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **변경:** `src/designs/brutalist/brutalist.module.css`의 해당 SHA diff가 desktop nav를 `<details>`로 바꾸고 status/debug/hero를 stack한다. 이전 상태에는 이 selector 묶음 또는 breakpoint 재배치가 없었고, 이후 DOM이 사용할 지면 규칙을 이 시점부터 제공한다. 소유권은 콘텐츠/route가 아니라 Brutalist stylesheet에 남는다.
- **inspection:** `src/designs/brutalist/brutalist.module.css`의 parent diff에서 720px native details menu와 stacked header/hero에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인를 확인했습니다.
- **책임/경계:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/designs/brutalist/brutalist.module.css`의 scoped stylesheet가 소유합니다.
- **비보장:** 이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:b57da6a41419:END -->

### 25. `8168bc76c3e3` — style(brutalist): mobile 프로젝트와 상세 화면 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Brutalist 시각 계약의 mobile metrics/project rows/detail/gallery reflow

#### Commit-specific investigation

- `8168bc76c3e3^`와 `8168bc76c3e3`를 비교하고 `src/designs/brutalist/brutalist.module.css`에서 **parent diff에서 mobile metrics/project rows/detail/gallery reflow에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist 시각 계약의 mobile metrics/project rows/detail/gallery reflow` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:8168bc76c3e3:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **parent diff에서 mobile metrics/project rows/detail/gallery reflow에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **변경:** `src/designs/brutalist/brutalist.module.css`의 해당 SHA diff가 홈·프로젝트·상세·curation grid를 좁은 화면 reading order로 바꾼다. 이전 상태에는 이 selector 묶음 또는 breakpoint 재배치가 없었고, 이후 DOM이 사용할 지면 규칙을 이 시점부터 제공한다. 소유권은 콘텐츠/route가 아니라 Brutalist stylesheet에 남는다.
- **inspection:** `src/designs/brutalist/brutalist.module.css`의 parent diff에서 mobile metrics/project rows/detail/gallery reflow에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인를 확인했습니다.
- **책임/경계:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/designs/brutalist/brutalist.module.css`의 scoped stylesheet가 소유합니다.
- **비보장:** 이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:8168bc76c3e3:END -->

### 26. `5551f3fdbb94` — style(brutalist): mobile profile과 resume 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Brutalist 시각 계약의 mobile profile/curation/resume/contact/current-position

#### Commit-specific investigation

- `5551f3fdbb94^`와 `5551f3fdbb94`를 비교하고 `src/designs/brutalist/brutalist.module.css`에서 **parent diff에서 mobile profile/curation/resume/contact/current-position에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist 시각 계약의 mobile profile/curation/resume/contact/current-position` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:5551f3fdbb94:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **parent diff에서 mobile profile/curation/resume/contact/current-position에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **변경:** `src/designs/brutalist/brutalist.module.css`의 해당 SHA diff가 About/Resume/Contact 계열의 좁은 화면 배치를 이어서 완성한다. 이전 상태에는 이 selector 묶음 또는 breakpoint 재배치가 없었고, 이후 DOM이 사용할 지면 규칙을 이 시점부터 제공한다. 소유권은 콘텐츠/route가 아니라 Brutalist stylesheet에 남는다.
- **inspection:** `src/designs/brutalist/brutalist.module.css`의 parent diff에서 mobile profile/curation/resume/contact/current-position에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인를 확인했습니다.
- **책임/경계:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/designs/brutalist/brutalist.module.css`의 scoped stylesheet가 소유합니다.
- **비보장:** 이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:5551f3fdbb94:END -->

### 27. `7c08aea7a2f7` — style(brutalist): mobile 여정과 interview 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Brutalist 시각 계약의 mobile journey/interview/footer/missing page

#### Commit-specific investigation

- `7c08aea7a2f7^`와 `7c08aea7a2f7`를 비교하고 `src/designs/brutalist/brutalist.module.css`에서 **parent diff에서 mobile journey/interview/footer/missing page에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist 시각 계약의 mobile journey/interview/footer/missing page` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:7c08aea7a2f7:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **parent diff에서 mobile journey/interview/footer/missing page에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **변경:** `src/designs/brutalist/brutalist.module.css`의 해당 SHA diff가 여정·인터뷰·footer·복구 상태의 mobile layout을 마감한다. 이전 상태에는 이 selector 묶음 또는 breakpoint 재배치가 없었고, 이후 DOM이 사용할 지면 규칙을 이 시점부터 제공한다. 소유권은 콘텐츠/route가 아니라 Brutalist stylesheet에 남는다.
- **inspection:** `src/designs/brutalist/brutalist.module.css`의 parent diff에서 mobile journey/interview/footer/missing page에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인를 확인했습니다.
- **책임/경계:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/designs/brutalist/brutalist.module.css`의 scoped stylesheet가 소유합니다.
- **비보장:** 이 CSS만으로 대응 DOM class가 실제 route에서 사용되거나 브라우저별 layout이 정확하다는 사실은 보장되지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:7c08aea7a2f7:END -->

### 28. `077ff3d49f30` — style(brutalist): 소형 화면과 인쇄 경계 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Brutalist 시각 계약의 430px hardening·reduced motion·print

#### Commit-specific investigation

- `077ff3d49f30^`와 `077ff3d49f30`를 비교하고 `src/designs/brutalist/brutalist.module.css`에서 **parent diff에서 430px hardening·reduced motion·print에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist 시각 계약의 430px hardening·reduced motion·print` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `reduced-motion·focus·semantic 보조는 CSS/DOM 계약의 일부만 다루며, 실제 WCAG 적합성이나 모든 보조기기 동작을 단독으로 보장하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:077ff3d49f30:BEGIN -->
- **직전 상태:** 직전 stylesheet에는 **parent diff에서 430px hardening·reduced motion·print에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인**를 완결하는 selector/media-rule 묶음이 없거나 앞 단계의 일부만 존재했습니다.
- **변경:** `src/designs/brutalist/brutalist.module.css`의 해당 SHA diff가 최소 viewport, animation 제거, 인쇄용 배경/내비게이션 경계를 추가한다. 이전 상태에는 이 selector 묶음 또는 breakpoint 재배치가 없었고, 이후 DOM이 사용할 지면 규칙을 이 시점부터 제공한다. 소유권은 콘텐츠/route가 아니라 Brutalist stylesheet에 남는다.
- **inspection:** `src/designs/brutalist/brutalist.module.css`의 parent diff에서 430px hardening·reduced motion·print에 대응하는 selector·media rule·token과 기존 선언의 재배치를 확인를 확인했습니다.
- **책임/경계:** DOM은 route module이 계속 소유하고, 이 SHA가 추가한 visual/layout state는 `src/designs/brutalist/brutalist.module.css`의 scoped stylesheet가 소유합니다.
- **비보장:** reduced-motion·focus·semantic 보조는 CSS/DOM 계약의 일부만 다루며, 실제 WCAG 적합성이나 모든 보조기기 동작을 단독으로 보장하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:077ff3d49f30:END -->

### 29. `3e6ec5262bdd` — feat(brutalist): 콘텐츠와 탐색 조회 도우미 추가

- **Importance:** B
- **Tags:** CONTENT, ROUTING, RENDERER
- **Thread role:** content/navigation adapter layer

#### Commit-specific investigation

- `3e6ec5262bdd^`와 `3e6ec5262bdd`를 비교하고 `src/designs/brutalist/brutalist-route.tsx`에서 **renderer-preserving href, template/tag/group/metric/navigation helpers**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `content/navigation adapter layer` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:3e6ec5262bdd:BEGIN -->
- **직전 상태:** 직전 상태에는 **renderer-preserving href, template/tag/group/metric/navigation helpers**에 해당하는 실행 가능한 route/component 경계가 아직 없었습니다.
- **변경:** Brutalist가 raw content를 반복 탐색하지 않도록 링크·프로젝트 group·metric·navigation 조회 helper를 한 module에 모은다. 이 시점 helper는 향후 view들이 공유한다.
- **inspection:** `src/designs/brutalist/brutalist-route.tsx`의 renderer-preserving href, template/tag/group/metric/navigation helpers를 확인했습니다.
- **책임/경계:** `src/designs/brutalist/brutalist-route.tsx`가 이 기능의 DOM 조립·분기·링크/상태 표현을 소유하며 source content의 원본 수명은 변경하지 않습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:3e6ec5262bdd:END -->

### 30. `08a2b0c0998f` — feat(brutalist): route 레이블과 기본 shell 구성

- **Importance:** B
- **Tags:** ROUTING, RENDERER
- **Thread role:** shared shell start

#### Commit-specific investigation

- `08a2b0c0998f^`와 `08a2b0c0998f`를 비교하고 `src/designs/brutalist/brutalist-route.tsx`에서 **exhaustive route label resolver와 `BrutalistShell` root/skip/header/main**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `shared shell start` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:08a2b0c0998f:BEGIN -->
- **직전 상태:** 직전 상태에는 **exhaustive route label resolver와 `BrutalistShell` root/skip/header/main**에 해당하는 실행 가능한 route/component 경계가 아직 없었습니다.
- **변경:** 여덟 route에 대한 label resolver를 switch로 닫고 root, skip link, header, main landmark를 만든다. 아직 nav/footer/body는 후속 commit에서 채워진다.
- **inspection:** `src/designs/brutalist/brutalist-route.tsx`의 exhaustive route label resolver와 `BrutalistShell` root/skip/header/main를 확인했습니다.
- **책임/경계:** `src/designs/brutalist/brutalist-route.tsx`가 이 기능의 DOM 조립·분기·링크/상태 표현을 소유하며 source content의 원본 수명은 변경하지 않습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:08a2b0c0998f:END -->

### 31. `cf2fdb36f9fc` — feat(brutalist): 주 탐색과 모바일 메뉴 추가

- **Importance:** B
- **Tags:** ROUTING, RENDERER
- **Thread role:** canonical navigation

#### Commit-specific investigation

- `cf2fdb36f9fc^`와 `cf2fdb36f9fc`를 비교하고 `src/designs/brutalist/brutalist-route.tsx`에서 **desktop/mobile nav, current-state, debug, `ActionLink` internal/external/mailto 분기**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `canonical navigation` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:cf2fdb36f9fc:BEGIN -->
- **직전 상태:** 직전 상태에는 **desktop/mobile nav, current-state, debug, `ActionLink` internal/external/mailto 분기**에 해당하는 실행 가능한 route/component 경계가 아직 없었습니다.
- **변경:** canonical nav를 desktop과 native disclosure 양쪽에 연결하고 내부 route에는 renderer/debug query를 보존한다. 외부/mailto는 anchor 속성을 사용한다.
- **inspection:** `src/designs/brutalist/brutalist-route.tsx`의 desktop/mobile nav, current-state, debug, `ActionLink` internal/external/mailto 분기를 확인했습니다.
- **책임/경계:** `src/designs/brutalist/brutalist-route.tsx`가 이 기능의 DOM 조립·분기·링크/상태 표현을 소유하며 source content의 원본 수명은 변경하지 않습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:cf2fdb36f9fc:END -->

### 32. `5b44afbc46ef` — feat(brutalist): footer와 홈 히어로 연결

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** footer + Home start

#### Commit-specific investigation

- `5b44afbc46ef^`와 `5b44afbc46ef`를 비교하고 `src/designs/brutalist/brutalist-route.tsx`에서 **placement-filtered footerLinks, `HomeRoute` hero, current year/metrics/configured section loop**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `footer + Home start` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:5b44afbc46ef:BEGIN -->
- **직전 상태:** 직전 상태에는 **placement-filtered footerLinks, `HomeRoute` hero, current year/metrics/configured section loop**에 해당하는 실행 가능한 route/component 경계가 아직 없었습니다.
- **변경:** footer link를 placement로 필터링하고 Home hero를 canonical profile/presentation에 연결한다. Home은 configured section 순서를 순회하지만 일부 section은 아직 후속 구현 전이다.
- **inspection:** `src/designs/brutalist/brutalist-route.tsx`의 placement-filtered footerLinks, `HomeRoute` hero, current year/metrics/configured section loop를 확인했습니다.
- **책임/경계:** `src/designs/brutalist/brutalist-route.tsx`가 이 기능의 DOM 조립·분기·링크/상태 표현을 소유하며 source content의 원본 수명은 변경하지 않습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:5b44afbc46ef:END -->

### 33. `b477ba477127` — feat(brutalist): 홈 섹션 공용 프리미티브 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Home/archive primitives

#### Commit-specific investigation

- `b477ba477127^`와 `b477ba477127`를 비교하고 `src/designs/brutalist/brutalist-route.tsx`에서 **signal strip, numbered section header, renderer-preserving project row, contact primitive**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Home/archive primitives` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:b477ba477127:BEGIN -->
- **직전 상태:** 직전 상태에는 **signal strip, numbered section header, renderer-preserving project row, contact primitive**에 해당하는 실행 가능한 route/component 경계가 아직 없었습니다.
- **변경:** Home과 archive가 반복 사용할 시각/링크 단위를 private component로 추출해 route별 markup 중복을 줄인다.
- **inspection:** `src/designs/brutalist/brutalist-route.tsx`의 signal strip, numbered section header, renderer-preserving project row, contact primitive를 확인했습니다.
- **책임/경계:** `src/designs/brutalist/brutalist-route.tsx`가 이 기능의 DOM 조립·분기·링크/상태 표현을 소유하며 source content의 원본 수명은 변경하지 않습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:b477ba477127:END -->

### 34. `b30b9b1c3505` — feat(brutalist): 대표 작업과 작업 원칙 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Home middle + Projects hero

#### Commit-specific investigation

- `b30b9b1c3505^`와 `b30b9b1c3505`를 비교하고 `src/designs/brutalist/brutalist-route.tsx`에서 **signal/featured/system sections와 Projects route hero**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Home middle + Projects hero` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:b30b9b1c3505:BEGIN -->
- **직전 상태:** 직전 상태에는 **signal/featured/system sections와 Projects route hero**에 해당하는 실행 가능한 route/component 경계가 아직 없었습니다.
- **변경:** configured Home sequence에 대표 프로젝트와 작업 원칙을 추가하고 Projects archive의 hero/metric 경계를 시작한다.
- **inspection:** `src/designs/brutalist/brutalist-route.tsx`의 signal/featured/system sections와 Projects route hero를 확인했습니다.
- **책임/경계:** `src/designs/brutalist/brutalist-route.tsx`가 이 기능의 DOM 조립·분기·링크/상태 표현을 소유하며 source content의 원본 수명은 변경하지 않습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:b30b9b1c3505:END -->

### 35. `85ea663aaf19` — feat(brutalist): 홈 여정과 프로젝트 archive 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Home completion + Projects archive

#### Commit-specific investigation

- `85ea663aaf19^`와 `85ea663aaf19`를 비교하고 `src/designs/brutalist/brutalist-route.tsx`에서 **`slice(-4).reverse()` recent journey copy, contact band, project groups, explicit empty archive**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Home completion + Projects archive` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:85ea663aaf19:BEGIN -->
- **직전 상태:** 직전 상태에는 **`slice(-4).reverse()` recent journey copy, contact band, project groups, explicit empty archive**에 해당하는 실행 가능한 route/component 경계가 아직 없었습니다.
- **변경:** 최근 네 여정을 복사한 배열에서 역순으로 표시해 source를 mutate하지 않는다. Projects route는 canonical groups를 순회하고 비면 명시적 empty block을 보인다.
- **inspection:** `src/designs/brutalist/brutalist-route.tsx`의 `slice(-4).reverse()` recent journey copy, contact band, project groups, explicit empty archive를 확인했습니다.
- **책임/경계:** `src/designs/brutalist/brutalist-route.tsx`가 이 기능의 DOM 조립·분기·링크/상태 표현을 소유하며 source content의 원본 수명은 변경하지 않습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:85ea663aaf19:END -->

### 36. `d6b9a99e11ae` — feat(brutalist): 프로젝트 상세 표시 프리미티브 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Project detail primitives

#### Commit-specific investigation

- `d6b9a99e11ae^`와 `d6b9a99e11ae`를 비교하고 `src/designs/brutalist/brutalist-route.tsx`에서 **optimized media, ordered actions, text/list section shells, page labels, curation heading**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Project detail primitives` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:d6b9a99e11ae:BEGIN -->
- **직전 상태:** 직전 상태에는 **optimized media, ordered actions, text/list section shells, page labels, curation heading**에 해당하는 실행 가능한 route/component 경계가 아직 없었습니다.
- **변경:** 상세 route가 사용할 media/action/evidence primitive를 먼저 정의한다. action 순서와 optional media 처리 정책이 route body 밖으로 분리된다.
- **inspection:** `src/designs/brutalist/brutalist-route.tsx`의 optimized media, ordered actions, text/list section shells, page labels, curation heading를 확인했습니다.
- **책임/경계:** `src/designs/brutalist/brutalist-route.tsx`가 이 기능의 DOM 조립·분기·링크/상태 표현을 소유하며 source content의 원본 수명은 변경하지 않습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:d6b9a99e11ae:END -->

### 37. `b8268f47e89a` — feat(brutalist): 프로젝트 상세 hero와 소개 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Project detail valid/missing boundary

#### Commit-specific investigation

- `b8268f47e89a^`와 `b8268f47e89a`를 비교하고 `src/designs/brutalist/brutalist-route.tsx`에서 **`ProjectDetailRoute` unresolved guard, hero, facts, actions, intro**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Project detail valid/missing boundary` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.
- 후속 관계: `05b838d52a8b`와 `1ea2a1345b76`가 본문·결과를 완성한다.

#### Learning record

<!-- LEARNER-ANSWER:commit:b8268f47e89a:BEGIN -->
- **직전 상태:** 직전 상태에는 **`ProjectDetailRoute` unresolved guard, hero, facts, actions, intro**에 해당하는 실행 가능한 route/component 경계가 아직 없었습니다.
- **변경:** project가 없으면 모든 field 접근 전에 missing view를 반환한다. 유효하면 hero/facts/actions/intro를 구성하고 archive 복귀 경로를 보존한다.
- **inspection:** `src/designs/brutalist/brutalist-route.tsx`의 `ProjectDetailRoute` unresolved guard, hero, facts, actions, intro를 확인했습니다.
- **책임/경계:** `src/designs/brutalist/brutalist-route.tsx`가 이 기능의 DOM 조립·분기·링크/상태 표현을 소유하며 source content의 원본 수명은 변경하지 않습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **다음 관계:** `05b838d52a8b`와 `1ea2a1345b76`가 본문·결과를 완성한다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:b8268f47e89a:END -->

### 38. `05b838d52a8b` — feat(brutalist): 프로젝트 상세 본문과 gallery 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Project detail evidence body

#### Commit-specific investigation

- `05b838d52a8b^`와 `05b838d52a8b`를 비교하고 `src/designs/brutalist/brutalist-route.tsx`에서 **problem/solution/architecture/screenshots/resolved stack**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Project detail evidence body` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:05b838d52a8b:BEGIN -->
- **직전 상태:** 직전 상태에는 **problem/solution/architecture/screenshots/resolved stack**에 해당하는 실행 가능한 route/component 경계가 아직 없었습니다.
- **변경:** 상세 본문과 gallery를 구성하며 stack ID는 이미 해석된 표시 데이터를 사용한다. optional screenshot 배열은 존재하는 항목만 렌더링한다.
- **inspection:** `src/designs/brutalist/brutalist-route.tsx`의 problem/solution/architecture/screenshots/resolved stack를 확인했습니다.
- **책임/경계:** `src/designs/brutalist/brutalist-route.tsx`가 이 기능의 DOM 조립·분기·링크/상태 표현을 소유하며 source content의 원본 수명은 변경하지 않습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:05b838d52a8b:END -->

### 39. `80724a26820b` — feat(brutalist): 프로필과 기술 소개 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** About identity

#### Commit-specific investigation

- `80724a26820b^`와 `80724a26820b`를 비교하고 `src/designs/brutalist/brutalist-route.tsx`에서 **`AboutRoute`, optional photo, principles, focus areas, skill groups**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `About identity` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:80724a26820b:BEGIN -->
- **직전 상태:** 직전 상태에는 **`AboutRoute`, optional photo, principles, focus areas, skill groups**에 해당하는 실행 가능한 route/component 경계가 아직 없었습니다.
- **변경:** profile identity와 기술 영역을 canonical content에서 구성하고 photo가 없으면 media 영역을 생략한다.
- **inspection:** `src/designs/brutalist/brutalist-route.tsx`의 `AboutRoute`, optional photo, principles, focus areas, skill groups를 확인했습니다.
- **책임/경계:** `src/designs/brutalist/brutalist-route.tsx`가 이 기능의 DOM 조립·분기·링크/상태 표현을 소유하며 source content의 원본 수명은 변경하지 않습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:80724a26820b:END -->

### 40. `3399b55c3aee` — feat(brutalist): 큐레이션과 경력 소개 구성

- **Importance:** B
- **Tags:** CONTENT, RENDERER
- **Thread role:** About experience + feature-gated curation

#### Commit-specific investigation

- `3399b55c3aee^`와 `3399b55c3aee`를 비교하고 `src/designs/brutalist/brutalist-route.tsx`에서 **experience, `isSitePageEnabled`, category project resolution/filter**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `About experience + feature-gated curation` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:3399b55c3aee:BEGIN -->
- **직전 상태:** 직전 상태에는 **experience, `isSitePageEnabled`, category project resolution/filter**에 해당하는 실행 가능한 route/component 경계가 아직 없었습니다.
- **변경:** 경력 archive를 추가하고 curation capability가 켜진 경우에만 criteria/category/omission/review를 렌더링한다. 잘못된 project ID는 link 없이 제외한다.
- **inspection:** `src/designs/brutalist/brutalist-route.tsx`의 experience, `isSitePageEnabled`, category project resolution/filter를 확인했습니다.
- **책임/경계:** `src/designs/brutalist/brutalist-route.tsx`가 이 기능의 DOM 조립·분기·링크/상태 표현을 소유하며 source content의 원본 수명은 변경하지 않습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:3399b55c3aee:END -->

### 41. `70cf13ef1715` — feat(brutalist): 이력 hero와 경력 요약 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Resume start

#### Commit-specific investigation

- `70cf13ef1715^`와 `70cf13ef1715`를 비교하고 `src/designs/brutalist/brutalist-route.tsx`에서 **`ResumeRoute`, identity/availability, optional download, summary, experience**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Resume start` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:70cf13ef1715:BEGIN -->
- **직전 상태:** 직전 상태에는 **`ResumeRoute`, identity/availability, optional download, summary, experience**에 해당하는 실행 가능한 route/component 경계가 아직 없었습니다.
- **변경:** download URL 유무를 분기하고 numbered summary와 dated experience를 구성한다.
- **inspection:** `src/designs/brutalist/brutalist-route.tsx`의 `ResumeRoute`, identity/availability, optional download, summary, experience를 확인했습니다.
- **책임/경계:** `src/designs/brutalist/brutalist-route.tsx`가 이 기능의 DOM 조립·분기·링크/상태 표현을 소유하며 source content의 원본 수명은 변경하지 않습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:70cf13ef1715:END -->

### 42. `1ea2a1345b76` — feat(brutalist): 프로젝트 결과와 의사결정 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Project detail completion

#### Commit-specific investigation

- `1ea2a1345b76^`와 `1ea2a1345b76`를 비교하고 `src/designs/brutalist/brutalist-route.tsx`에서 **highlights/decisions/tradeoffs/results와 explicit empty labels**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Project detail completion` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:1ea2a1345b76:BEGIN -->
- **직전 상태:** 직전 상태에는 **highlights/decisions/tradeoffs/results와 explicit empty labels**에 해당하는 실행 가능한 route/component 경계가 아직 없었습니다.
- **변경:** 각 evidence 배열을 별도 section으로 표시하고 비어 있을 때 route copy가 지정한 empty message를 사용한다.
- **inspection:** `src/designs/brutalist/brutalist-route.tsx`의 highlights/decisions/tradeoffs/results와 explicit empty labels를 확인했습니다.
- **책임/경계:** `src/designs/brutalist/brutalist-route.tsx`가 이 기능의 DOM 조립·분기·링크/상태 표현을 소유하며 source content의 원본 수명은 변경하지 않습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:1ea2a1345b76:END -->

### 43. `5fa378250d64` — feat(brutalist): 선택 프로젝트와 이력 세부 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Resume completion

#### Commit-specific investigation

- `5fa378250d64^`와 `5fa378250d64`를 비교하고 `src/designs/brutalist/brutalist-route.tsx`에서 **resume projectIds resolution/filter, training/education/notes empty fallback**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Resume completion` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:5fa378250d64:BEGIN -->
- **직전 상태:** 직전 상태에는 **resume projectIds resolution/filter, training/education/notes empty fallback**에 해당하는 실행 가능한 route/component 경계가 아직 없었습니다.
- **변경:** 선택 project ID를 canonical project로 해석해 유효 항목만 남기고 training/education/notes를 추가한다. 비어 있는 목록에는 명시적 fallback이 적용된다.
- **inspection:** `src/designs/brutalist/brutalist-route.tsx`의 resume projectIds resolution/filter, training/education/notes empty fallback를 확인했습니다.
- **책임/경계:** `src/designs/brutalist/brutalist-route.tsx`가 이 기능의 DOM 조립·분기·링크/상태 표현을 소유하며 source content의 원본 수명은 변경하지 않습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:5fa378250d64:END -->

### 44. `b535539ae016` — feat(brutalist): 연락 수단과 안내 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Contact route

#### Commit-specific investigation

- `b535539ae016^`와 `b535539ae016`를 비교하고 `src/designs/brutalist/brutalist-route.tsx`에서 **preferred IDs 우선, placement fallback, explicit empty channels, notes**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Contact route` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:b535539ae016:BEGIN -->
- **직전 상태:** 직전 상태에는 **preferred IDs 우선, placement fallback, explicit empty channels, notes**에 해당하는 실행 가능한 route/component 경계가 아직 없었습니다.
- **변경:** preferred contact가 해석되지 않으면 placement 기반 links로 후퇴하고 그래도 비면 empty block을 렌더링한다.
- **inspection:** `src/designs/brutalist/brutalist-route.tsx`의 preferred IDs 우선, placement fallback, explicit empty channels, notes를 확인했습니다.
- **책임/경계:** `src/designs/brutalist/brutalist-route.tsx`가 이 기능의 DOM 조립·분기·링크/상태 표현을 소유하며 source content의 원본 수명은 변경하지 않습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:b535539ae016:END -->

### 45. `15a765ecb2aa` — feat(brutalist): 여정 milestone 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Journey narrative start

#### Commit-specific investigation

- `15a765ecb2aa^`와 `15a765ecb2aa`를 비교하고 `src/designs/brutalist/brutalist-route.tsx`에서 **milestones, anchorProjectIds resolution/filter, empty narrative**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Journey narrative start` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:15a765ecb2aa:BEGIN -->
- **직전 상태:** 직전 상태에는 **milestones, anchorProjectIds resolution/filter, empty narrative**에 해당하는 실행 가능한 route/component 경계가 아직 없었습니다.
- **변경:** milestone의 project 참조를 유효 project로만 연결하고 milestone이 없으면 journey empty state를 표시한다.
- **inspection:** `src/designs/brutalist/brutalist-route.tsx`의 milestones, anchorProjectIds resolution/filter, empty narrative를 확인했습니다.
- **책임/경계:** `src/designs/brutalist/brutalist-route.tsx`가 이 기능의 DOM 조립·분기·링크/상태 표현을 소유하며 source content의 원본 수명은 변경하지 않습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:15a765ecb2aa:END -->

### 46. `388446b1a982` — feat(brutalist): 여정 archive와 인터뷰 map 머리말 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Journey completion + Interview start

#### Commit-specific investigation

- `388446b1a982^`와 `388446b1a982`를 비교하고 `src/designs/brutalist/brutalist-route.tsx`에서 **dated journey archive/current position, Interview intro/reference/track fragment nav, project Map**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Journey completion + Interview start` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:388446b1a982:BEGIN -->
- **직전 상태:** 직전 상태에는 **dated journey archive/current position, Interview intro/reference/track fragment nav, project Map**에 해당하는 실행 가능한 route/component 경계가 아직 없었습니다.
- **변경:** Journey를 full archive와 current state까지 완성하고 Interview hero와 track index를 연다. Interview answer join용 project Map을 준비한다.
- **inspection:** `src/designs/brutalist/brutalist-route.tsx`의 dated journey archive/current position, Interview intro/reference/track fragment nav, project Map를 확인했습니다.
- **책임/경계:** `src/designs/brutalist/brutalist-route.tsx`가 이 기능의 DOM 조립·분기·링크/상태 표현을 소유하며 source content의 원본 수명은 변경하지 않습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:388446b1a982:END -->

### 47. `f3fc6200a45b` — feat(brutalist): 인터뷰 근거 archive 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Interview evidence

#### Commit-specific investigation

- `f3fc6200a45b^`와 `f3fc6200a45b`를 비교하고 `src/designs/brutalist/brutalist-route.tsx`에서 **tracks/questions/references, valid project answers, no-mapped-evidence fallback**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Interview evidence` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:f3fc6200a45b:BEGIN -->
- **직전 상태:** 직전 상태에는 **tracks/questions/references, valid project answers, no-mapped-evidence fallback**에 해당하는 실행 가능한 route/component 경계가 아직 없었습니다.
- **변경:** 각 answer의 project를 Map에서 찾아 유효하면 detail link를 만들고, 없거나 answer 배열이 비면 명시적 근거 없음 문구를 보인다.
- **inspection:** `src/designs/brutalist/brutalist-route.tsx`의 tracks/questions/references, valid project answers, no-mapped-evidence fallback를 확인했습니다.
- **책임/경계:** `src/designs/brutalist/brutalist-route.tsx`가 이 기능의 DOM 조립·분기·링크/상태 표현을 소유하며 source content의 원본 수명은 변경하지 않습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:f3fc6200a45b:END -->

### 48. `da8e59d56783` — feat(brutalist): 인터뷰 근거 공백 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread role:** Interview gaps

#### Commit-specific investigation

- `da8e59d56783^`와 `da8e59d56783`를 비교하고 `src/designs/brutalist/brutalist-route.tsx`에서 **gaps title/body/items와 empty list handling**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Interview gaps` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:da8e59d56783:BEGIN -->
- **직전 상태:** 직전 상태에는 **gaps title/body/items와 empty list handling**에 해당하는 실행 가능한 route/component 경계가 아직 없었습니다.
- **변경:** Interview Map 마지막에 선언된 evidence gaps를 별도 section으로 추가해 미지원 영역을 숨기지 않는다.
- **inspection:** `src/designs/brutalist/brutalist-route.tsx`의 gaps title/body/items와 empty list handling를 확인했습니다.
- **책임/경계:** `src/designs/brutalist/brutalist-route.tsx`가 이 기능의 DOM 조립·분기·링크/상태 표현을 소유하며 source content의 원본 수명은 변경하지 않습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:da8e59d56783:END -->

### 49. `e6268c4b7c74` — refactor(brutalist): 내부 helper 공개 범위 정리

- **Importance:** B
- **Tags:** RENDERER, REFACTOR
- **Thread role:** module API narrowing

#### Commit-specific investigation

- `e6268c4b7c74^`와 `e6268c4b7c74`를 비교하고 `src/designs/brutalist/brutalist-route.tsx`에서 **content adapters, primitives, individual views의 `export` 제거**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `module API narrowing` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.`라는 한계를 코드와 test 범위에서 확인합니다.
- 후속 관계: `caa7df81d899`가 유일한 public route entry를 추가한다.

#### Learning record

<!-- LEARNER-ANSWER:commit:e6268c4b7c74:BEGIN -->
- **직전 상태:** 동작 자체는 앞선 구현에 존재했지만 **content adapters, primitives, individual views의 `export` 제거**의 조립·조회·공개 책임이 App Router, raw content consumer 또는 여러 module에 분산돼 있었습니다.
- **변경:** registry가 알 필요 없는 helper/view를 module-private로 바꾼다. runtime output을 바꾸는 새 분기보다 ownership을 외부 entry 하나로 수렴시키는 변화다.
- **inspection:** `src/designs/brutalist/brutalist-route.tsx`의 content adapters, primitives, individual views의 `export` 제거를 확인했습니다.
- **책임/경계:** 표현·조립 책임은 `src/designs/brutalist/brutalist-route.tsx` 쪽으로 이동하고, 이전 caller는 framework/context 준비 또는 public entry 호출만 남습니다.
- **비보장:** 이 commit은 해당 route/section의 정적 composition을 추가하지만 다른 route, 모든 빈 상태, 브라우저 layout을 자동으로 검증하지 않는다.
- **다음 관계:** `caa7df81d899`가 유일한 public route entry를 추가한다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.
<!-- LEARNER-ANSWER:commit:e6268c4b7c74:END -->

### 50. `caa7df81d899` — feat(brutalist): 모든 route를 renderer에 통합

- **Importance:** A
- **Tags:** ARCH, ROUTING, RENDERER
- **Thread role:** Brutalist public API와 여덟 route dispatch의 최종 경계

#### Commit-specific investigation

- `caa7df81d899^`와 `caa7df81d899`를 비교하고 `src/designs/brutalist/brutalist-route.tsx`에서 **`BrutalistRoute`, exhaustive switch, shared shell wrapping**가 처음 생기거나 이동한 위치를 찾습니다.
- 직전 owner와 이 SHA 이후 owner를 구분하고, `Brutalist public API와 여덟 route dispatch의 최종 경계` 역할이 caller/callee·DOM·content-reference 경계에 어떤 변화를 주는지 적습니다.
- absence, unsupported route, missing reference, empty list, optional media/link 또는 responsive fallback 중 이 SHA에 실제 존재하는 분기만 기록합니다.
- `runtime unknown route에 대한 별도 default UI는 없고 closed union의 compile-time exhaustiveness에 의존한다.`라는 한계를 코드와 test 범위에서 확인합니다.
- 후속 관계: Thread 1의 `dd71d28143a8` activation이 이 entry를 lazy registry에 연결한다.
- 같은 contract를 소비하는 다른 route/design과 비교하되, 이 SHA 이후 코드를 현재 commit의 구현으로 소급하지 않습니다.

#### Learning record

<!-- LEARNER-ANSWER:commit:caa7df81d899:BEGIN -->
- **직전 상태:** 직전 상태에는 **`BrutalistRoute`, exhaustive switch, shared shell wrapping**에 해당하는 실행 가능한 route/component 경계가 아직 없었습니다.
- **구현 결정:** module-private view들이 완성된 뒤 exported `BrutalistRoute` 하나가 discriminated route를 여덟 view로 매핑하고 결과를 shared shell에 넣는다. 외부 registry는 helper·view·content adapter를 import할 수 없으며 full-site shell이 모든 route에 적용된다.
- **파일·symbol:** `src/designs/brutalist/brutalist-route.tsx`에서 `BrutalistRoute`, exhaustive switch, shared shell wrapping를 확인했습니다.
- **소유권:** `src/designs/brutalist/brutalist-route.tsx`가 이 기능의 DOM 조립·분기·링크/상태 표현을 소유하며 source content의 원본 수명은 변경하지 않습니다.
- **보장/비보장:** 이 SHA는 `Brutalist public API와 여덟 route dispatch의 최종 경계` 경계를 고정합니다. runtime unknown route에 대한 별도 default UI는 없고 closed union의 compile-time exhaustiveness에 의존한다.
- **역사적 연결:** Thread 1의 `dd71d28143a8` activation이 이 entry를 lazy registry에 연결한다.
- **실행 증거:** 이 SHA의 repository test/runtime command는 실행하지 않았습니다. 기록은 branch의 exact commit diff와 해당 tree에 대한 정적 inspection 결과입니다.

```tsx
// caa7df81d899 · src/designs/brutalist/brutalist-route.tsx
export function BrutalistRoute(props: BrutalistRouteProps) {
  return <BrutalistShell {...props}>{renderRoute(props)}</BrutalistShell>;
}
```
<!-- LEARNER-ANSWER:commit:caa7df81d899:END -->

## 5. Invariant evolution

<!-- LEARNER-ANSWER:thread:03-brutalist-design-system-construction.md:invariant:BEGIN -->
최종 invariant는 Brutalist module이 route entry 하나만 공개하고, shell·navigation·link policy·content adapter·view가 같은 module의 private implementation으로 유지되며, mobile/reduced-motion/print와 missing/empty states가 시각 계약에 포함된다는 것입니다.

- 도입·확장·폐쇄의 순서는 commit map에 고정했습니다.
- B-level construction은 route/style surface를 단계적으로 넓히고, A/S-level commit은 owner·dispatch·검증 invariant를 바꿉니다.
<!-- LEARNER-ANSWER:thread:03-brutalist-design-system-construction.md:invariant:END -->

## 6. Failure → Fix → Test and ownership relations

<!-- LEARNER-ANSWER:thread:03-brutalist-design-system-construction.md:relations:BEGIN -->
스타일은 route 전체의 desktop grammar를 순차 구축하고 980/720/mobile/430/reduced-motion/print로 좁힙니다. TSX는 adapters/shell/navigation 뒤 Home→Projects→Detail→About→Resume→Contact→Journey→Interview를 완성합니다. `e6268c4b7c74`가 helper export를 회수하고 `caa7df81d899`가 public route entry를 확정합니다.
<!-- LEARNER-ANSWER:thread:03-brutalist-design-system-construction.md:relations:END -->

## 7. Final architecture or execution flow

<!-- LEARNER-ANSWER:thread:03-brutalist-design-system-construction.md:flow:BEGIN -->
registry entry → `BrutalistRoute` → closed route switch → route view → private content/navigation helpers와 visual primitives → `BrutalistShell` root/header/main/footer 순서입니다.

각 단계에서 optional/empty/missing reference가 처리되지 않는 경우도 보장으로 포장하지 않았으며, 해당 commit의 non-guarantee에 남겼습니다.
<!-- LEARNER-ANSWER:thread:03-brutalist-design-system-construction.md:flow:END -->

## 8. Runtime and verification evidence

<!-- LEARNER-ANSWER:thread:03-brutalist-design-system-construction.md:runtime:BEGIN -->
- **실행한 repository test/build:** 없음.
- **정적 확인:** 지정 branch의 commit classification, commit bodies, exact commit diff와 historical file 변경을 GitHub 연결을 통해 확인했습니다.
- **실행하지 못한 이유:** 작업 container에서 직접 clone 시 DNS가 `github.com`을 해석하지 못해 historical worktree를 만들 수 없었습니다. 따라서 Vitest, Playwright, Next build 결과를 성공으로 기록하지 않았습니다.
- **검증 수준:** code/test implementation의 존재와 범위는 inspection으로 확인했고, runtime pass/fail은 주장하지 않습니다.
<!-- LEARNER-ANSWER:thread:03-brutalist-design-system-construction.md:runtime:END -->

## 9. Learning-completion checks

<!-- LEARNER-ANSWER:thread:03-brutalist-design-system-construction.md:checks:BEGIN -->
- [x] 모든 고정 SHA·subject·importance·tags를 commit map과 commit section에서 동일하게 유지했습니다.
- [x] 각 SHA에 concrete file과 symbol/selector/route focus를 기록했습니다.
- [x] 이전 상태, owner, absence/fallback, guarantee/non-guarantee, 후속 관계를 채웠습니다.
- [x] S/A/B depth를 구분했습니다.
- [x] 실행하지 않은 test를 통과로 표시하지 않았습니다.
<!-- LEARNER-ANSWER:thread:03-brutalist-design-system-construction.md:checks:END -->
