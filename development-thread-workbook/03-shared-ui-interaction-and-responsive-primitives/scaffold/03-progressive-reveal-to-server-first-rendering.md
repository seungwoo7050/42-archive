# Thread: Progressive reveal to server-first rendering

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

IntersectionObserver 기반 reveal primitive가 reduced-motion 범위를 넓힌 뒤, 왜 client lifecycle을 제거하고 server-visible markup으로 전환됐는지 복원합니다.

**경계:** 이 Thread는 shared Reveal의 visibility/lifecycle과 motion fallback을 다룹니다. 개별 section content, route composition, 전역 performance test architecture는 포함하지 않습니다.

### 고정 invariant

- Content는 observer 지원, hydration 완료, animation 실행 여부와 무관하게 읽을 수 있어야 합니다.
- Observer를 사용하는 동안에는 첫 intersect에서만 visible로 전환하고 observer를 해제합니다.
- Reduced-motion에서는 opacity/transform/transition 때문에 content가 숨지 않습니다.
- 최종 상태에서는 Reveal markup이 server에서 이미 visible이며 client effect를 요구하지 않습니다.

## 2. 핵심 질문

- 907d85b77bac의 server initial render와 browser initial state가 실제로 같은가?
- IntersectionObserver 미지원 fallback, first intersection, cleanup은 어떤 branch로 구현되는가?
- 29bb40579cb2와 af9191fc15ad가 reduced-motion 대상과 강도를 어떻게 확장하는가?
- b8164cfdddbd가 어떤 hook/ref/client boundary를 제거하며 delay prop의 의미는 무엇이 남는가?
- 최종 server-first 전환을 직접 검증하는 test가 이 frozen Thread에 존재하는가?

## 3. 완료 기준

- 각 SHA의 parent diff와 resulting tree를 구분해 실제 file/symbol/call path를 기록합니다.
- Previous state, owner, state transition, absence/failure branch, guarantee/non-guarantee를 commit별로 분리합니다.
- Fix와 test는 실제로 수정·검증하는 production path에 연결합니다.
- 실행하지 않은 command 결과를 만들지 않습니다.
- S/A-level은 architecture/owner/failure/later evidence를 B-level보다 깊게 복원합니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Thread 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `907d85b77bac` | feat(ui): 뷰포트 진입 공개 효과 추가 | B | - | observer 기반 reveal 도입 |
| 2 | `29bb40579cb2` | style(a11y): 동적 목록의 모션 감소 지원 | B | RENDERER, A11Y | reduced-motion 대상 확장 |
| 3 | `af9191fc15ad` | style(a11y): 모바일 헤더와 동작 감소 보강 | A | ARCH, RENDERER, A11Y | 전역 motion fallback 강화 |
| 4 | `b8164cfdddbd` | refactor(ui): reveal 콘텐츠를 server에서 즉시 표시 | A | ARCH, CONTENT, REFACTOR | server-first visibility 전환 |

## 5. Commit별 학습 기록

### 1. `907d85b77bac` — feat(ui): 뷰포트 진입 공개 효과 추가

- **Importance:** B
- **Tags:** -
- **Thread 역할:** observer 기반 reveal 도입

#### 해당 SHA에서 확인할 실제 코드

- `src/components/portfolio/reveal.tsx`의 `useState` initializer를 SSR과 browser에서 각각 평가합니다.
- `useEffect`의 no-node/no-IntersectionObserver/intersection/cleanup branch를 추적합니다.
- `src/app/globals.css`의 hidden, visible, reduced-motion selector를 component class transition과 연결합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-907d85b77bac-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-907d85b77bac-record:end -->

#### 최소 코드 증거

<!-- learner:commit-907d85b77bac-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-907d85b77bac-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-907d85b77bac-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-907d85b77bac-execution:end -->

### 2. `29bb40579cb2` — style(a11y): 동적 목록의 모션 감소 지원

- **Importance:** B
- **Tags:** RENDERER, A11Y
- **Thread 역할:** reduced-motion 대상 확장

#### 해당 SHA에서 확인할 실제 코드

- `prefers-reduced-motion` block에서 새로 추가된 `.tech-chip`, experience/timeline pseudo-elements를 확인합니다.
- 기존 `.reveal-item`, `.motion-card`와 같은 transform/transition neutralization을 공유하는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-29bb40579cb2-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-29bb40579cb2-record:end -->

#### 최소 코드 증거

<!-- learner:commit-29bb40579cb2-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-29bb40579cb2-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-29bb40579cb2-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-29bb40579cb2-execution:end -->

### 3. `af9191fc15ad` — style(a11y): 모바일 헤더와 동작 감소 보강

- **Importance:** A
- **Tags:** ARCH, RENDERER, A11Y
- **Thread 역할:** 전역 motion fallback 강화

#### 해당 SHA에서 확인할 실제 코드

- `prefers-reduced-motion`의 universal selector와 pseudo-element selector가 animation/transition duration, iteration, scroll behavior를 어떻게 덮는지 확인합니다.
- `.motion-card:hover`, terminal wrap 등 명시적 transform/animation neutralization과 wildcard timing clamp의 역할을 구분합니다.
- 같은 commit의 mobile header backdrop-filter 제거는 motion policy와 별도 responsive performance decision임을 기록합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-af9191fc15ad-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-af9191fc15ad-record:end -->

#### 최소 코드 증거

<!-- learner:commit-af9191fc15ad-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-af9191fc15ad-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-af9191fc15ad-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-af9191fc15ad-execution:end -->

### 4. `b8164cfdddbd` — refactor(ui): reveal 콘텐츠를 server에서 즉시 표시

- **Importance:** A
- **Tags:** ARCH, CONTENT, REFACTOR
- **Thread 역할:** server-first visibility 전환

#### 해당 SHA에서 확인할 실제 코드

- `Reveal`에서 제거된 `"use client"`, hooks, ref, observer와 남은 props/markup을 비교합니다.
- 항상 `reveal-item is-visible`인 server output이 globals.css와 결합해 어떤 state를 제거하는지 확인합니다.
- `delay`가 여전히 inline transitionDelay를 만들지만 viewport entry trigger는 사라졌다는 점을 구분합니다.
- 후속 test가 frozen commit set 안에 있는지 확인하고 없으면 명시합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-b8164cfdddbd-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-b8164cfdddbd-record:end -->

#### 최소 코드 증거

<!-- learner:commit-b8164cfdddbd-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-b8164cfdddbd-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-b8164cfdddbd-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-b8164cfdddbd-execution:end -->

## 6. Invariant ledger

<!-- learner:thread-ledger:start -->
| Invariant | 도입·변경 commit | 실제 code/test evidence | 부족함이 드러난 지점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| First-intersection reveal | 907d85b77bac |  |  |  |
| Reduced-motion content visibility | 907d85b77bac → af9191fc15ad |  |  |  |
| Server-first availability | b8164cfdddbd |  |  |  |
<!-- learner:thread-ledger:end -->

## 7. Failure → Fix → Test 관계

<!-- learner:thread-relations:start -->
| Failure/위험 | 실제 영향·root cause | Fix/결정 | Regression evidence 또는 공백 |
| --- | --- | --- | --- |
| SSR hidden + hydration/observer 필요 |  |  |  |
| Primitive별 reduced-motion 누락 가능 |  |  |  |
<!-- learner:thread-relations:end -->

## 8. Ownership·state·responsibility 변화

<!-- learner:thread-ownership:start -->
| 단계 | Owner | 책임 변화 |
| --- | --- | --- |
| 907d 초기 |  |  |
| 29bb/af919 |  |  |
| b816 최종 |  |  |
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
