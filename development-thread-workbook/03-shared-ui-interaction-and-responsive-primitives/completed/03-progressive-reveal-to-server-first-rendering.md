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
| 직전 상태와 부족함 | Reveal wrapper가 없어서 content는 즉시 보였고 viewport entry에 맞춘 공통 transition과 cleanup contract가 없었습니다. |
| 실제 변경 file/symbol/call path | Client component `Reveal`을 추가했습니다. State는 browser에 IntersectionObserver가 없을 때만 초기 true이고, effect는 node를 observe해 첫 intersect에서 visible로 바꾸고 disconnect합니다. CSS는 기본 hidden/blur/translate, `is-visible`에서 복구합니다. |
| Data/state/DOM/resource owner | Component가 visible state와 observer lifetime을 소유하고 browser observer가 intersection event를 제공합니다. CSS가 visual transition을 소유합니다. |
| Failure·absence·fallback 처리 | Ref node가 없으면 effect 종료, observer API가 없으면 initializer의 browser state로 visible입니다. Cleanup과 first-intersect 모두 disconnect합니다. SSR에서는 `window`가 없어 initial state가 false입니다. |
| 보장하는 것과 보장하지 않는 것 | Observer 지원 browser에서 first-entry reveal과 cleanup을 보장합니다. JavaScript/hydration 전 server markup은 hidden class 상태일 수 있고 observer callback timing은 보장하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | 29bb40579cb2·af9191fc15ad가 fallback을 강화하고, b8164cfdddbd가 hydration 의존 자체를 제거합니다. |
<!-- learner:commit-907d85b77bac-record:end -->

#### 최소 코드 증거

<!-- learner:commit-907d85b77bac-excerpt:start -->
- **Commit:** `907d85b77bac`
- **Path:** `src/components/portfolio/reveal.tsx`
- **Location:** `Reveal useEffect`

```tsx
useEffect(() => {
  const node = ref.current;

  if (!node) {
    return;
  }

  if (!("IntersectionObserver" in window)) {
    return;
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
  );

  observer.observe(node);

  return () => observer.disconnect();
}, []);
```

이 발췌는 해당 SHA의 decision/state/ownership을 보여 주는 최소 부분입니다. 후속 commit의 코드는 섞지 않았습니다.
<!-- learner:commit-907d85b77bac-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-907d85b77bac-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
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
| 직전 상태와 부족함 | 초기 reduced-motion block은 Reveal 자체를 즉시 보이게 했지만 이후 생긴 동적 list/chip guide pseudo-elements까지 모두 neutralize하지 않았습니다. |
| 실제 변경 file/symbol/call path | Reduced-motion selector 목록을 tech chip, experience row marker, paired/timeline guide pseudo-elements로 확장해 transform과 transition을 제거했습니다. |
| Data/state/DOM/resource owner | User media preference가 policy input이고 globals.css가 여러 primitive의 motion fallback을 소유합니다. |
| Failure·absence·fallback 처리 | CSS media query가 적용되지 않는 환경에는 영향이 없습니다. Animation property 전체를 전역으로 제한하는 단계는 아직 아닙니다. |
| 보장하는 것과 보장하지 않는 것 | 동적 list의 motion을 줄이지만 client Reveal state/hydration dependency는 그대로입니다. |
| 다음 commit 또는 관련 test 연결 | af9191fc15ad가 wildcard timing clamp와 hover neutralization으로 정책을 더 강하게 만듭니다. |
<!-- learner:commit-29bb40579cb2-record:end -->

#### 최소 코드 증거

<!-- learner:commit-29bb40579cb2-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-29bb40579cb2-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-29bb40579cb2-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
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
| 직전 상태와 부족함 | Primitive별 selector만으로는 새 animation이나 hover transform이 빠질 수 있었고, mobile header backdrop blur도 작은 viewport에서 계속 적용됐습니다. |
| 실제 변경 file/symbol/call path | Reduced-motion에서 모든 element와 pseudo-element의 animation duration을 0.01ms, iteration을 1, transition duration을 0.01ms로 강제하고 scroll behavior를 auto로 둡니다. 특정 animated elements와 hover transform도 명시적으로 neutralize합니다. 640px 이하 header backdrop-filter도 제거합니다. |
| Data/state/DOM/resource owner | Global stylesheet가 user preference에 대한 cross-component policy owner가 됩니다. 개별 component는 해당 policy를 반복 구현할 필요가 줄어듭니다. |
| Failure·absence·fallback 처리 | CSS를 비활성화하거나 media query가 일치하지 않으면 적용되지 않습니다. 0.01ms는 animation property를 제거하는 것이 아니라 사실상 즉시 종료시키는 정책입니다. |
| 보장하는 것과 보장하지 않는 것 | 새 motion primitive가 추가돼도 기본 timing clamp를 받게 합니다. 하지만 Reveal의 hidden initial class와 hydration timing 문제 자체를 해결하지는 않습니다. |
| 다음 commit 또는 관련 test 연결 | b8164cfdddbd가 visibility state owner를 client에서 server markup으로 이동해 content availability를 motion과 분리합니다. |
<!-- learner:commit-af9191fc15ad-record:end -->

#### 최소 코드 증거

<!-- learner:commit-af9191fc15ad-excerpt:start -->
- **Commit:** `af9191fc15ad`
- **Path:** `src/app/globals.css`
- **Location:** `universal selector inside prefers-reduced-motion`

```css
*,
*::before,
*::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  scroll-behavior: auto !important;
  transition-duration: 0.01ms !important;
}
```

이 발췌는 해당 SHA의 decision/state/ownership을 보여 주는 최소 부분입니다. 후속 commit의 코드는 섞지 않았습니다.
<!-- learner:commit-af9191fc15ad-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-af9191fc15ad-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
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
| 직전 상태와 부족함 | 초기 design은 SSR에서 hidden markup을 만들고 hydration/effect/observer가 성공해야 content를 visible로 바꿨습니다. Progressive enhancement가 아니라 JavaScript availability가 content visibility의 전제가 되는 위험이 있었습니다. |
| 실제 변경 file/symbol/call path | Reveal을 server component-compatible pure function으로 바꿔 hooks/ref/observer/client directive를 제거했습니다. Class는 항상 `reveal-item is-visible`이며 delay style과 `as` polymorphism만 유지합니다. |
| Data/state/DOM/resource owner | Visibility owner가 client state/observer에서 server markup으로 이동했습니다. CSS는 표현만 소유하고 lifecycle resource는 더 이상 없습니다. |
| Failure·absence·fallback 처리 | Observer 미지원, hydration 지연, effect 미실행 branch 자체가 제거됩니다. 별도 cleanup도 필요 없습니다. |
| 보장하는 것과 보장하지 않는 것 | Content가 첫 HTML에서 visible임을 보장하고 이 wrapper 자체의 client boundary와 lifecycle을 제거합니다. 실제 emitted bundle 크기는 측정하지 않았습니다. Viewport 진입 시점 animation은 더 이상 보장하지 않습니다. `delay`는 inline `transitionDelay`로 serialize되지만 component가 visibility class transition을 일으키지는 않습니다. |
| 다음 commit 또는 관련 test 연결 | 이 frozen Thread에는 이 refactor를 실행한 dedicated regression test가 없습니다. Category 07의 별도 performance/regression 분류와 정적 source inspection이 후속 검증 맥락입니다. |
<!-- learner:commit-b8164cfdddbd-record:end -->

#### 최소 코드 증거

<!-- learner:commit-b8164cfdddbd-excerpt:start -->
- **Commit:** `b8164cfdddbd`
- **Path:** `src/components/portfolio/reveal.tsx`
- **Location:** `Reveal after refactor`

```tsx
export function Reveal({
  as = "div",
  children,
  className = "",
  delay = 0,
}: {
  as?: "div" | "li";
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const Component = as;

  return (
    <Component
      className={`reveal-item is-visible ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Component>
  );
}
```

이 발췌는 해당 SHA의 decision/state/ownership을 보여 주는 최소 부분입니다. 후속 commit의 코드는 섞지 않았습니다.
<!-- learner:commit-b8164cfdddbd-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-b8164cfdddbd-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
<!-- learner:commit-b8164cfdddbd-execution:end -->

## 6. Invariant ledger

<!-- learner:thread-ledger:start -->
| Invariant | 도입·변경 commit | 실제 code/test evidence | 부족함이 드러난 지점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| First-intersection reveal | 907d85b77bac | IntersectionObserver + is-visible state | SSR hidden/hydration 의존 | 후속 refactor 전까지 browser interaction 제공 |
| Reduced-motion content visibility | 907d85b77bac → af9191fc15ad | component selector에서 global timing clamp까지 확장 | client state는 여전히 필요 | motion preference에서 hidden/long animation 방지 |
| Server-first availability | b8164cfdddbd | client directive/hooks/observer 제거, is-visible 고정 | viewport reveal behavior 포기 | 첫 HTML에서 content visible |
<!-- learner:thread-ledger:end -->

## 7. Failure → Fix → Test 관계

<!-- learner:thread-relations:start -->
| Failure/위험 | 실제 영향·root cause | Fix/결정 | Regression evidence 또는 공백 |
| --- | --- | --- | --- |
| SSR hidden + hydration/observer 필요 | JS 지연/실패 시 content visibility 위험 | b8164cfdddbd server-visible markup | Frozen Thread 내 dedicated runtime test 없음; exact diff로 정적 확인 |
| Primitive별 reduced-motion 누락 가능 | 새 animation이 preference를 무시할 수 있음 | 29bb40579cb2와 af9191fc15ad에서 범위 확장 | CSS selector inspection; visual browser test 없음 |
<!-- learner:thread-relations:end -->

## 8. Ownership·state·responsibility 변화

<!-- learner:thread-ownership:start -->
| 단계 | Owner | 책임 변화 |
| --- | --- | --- |
| 907d 초기 | Reveal client state + IntersectionObserver | visibility와 observer lifetime을 component가 관리 |
| 29bb/af919 | Global CSS | reduced-motion policy가 cross-component owner로 확대 |
| b816 최종 | Server markup | content visibility는 server render가 소유; client lifecycle 제거 |
<!-- learner:thread-ownership:end -->

## 9. 최종 Thread 상태

<!-- learner:thread-final-state:start -->
- Reveal은 server-compatible wrapper이며 첫 markup부터 `is-visible`입니다.
- IntersectionObserver, state, ref, effect, disconnect cleanup은 제거됐습니다.
- Global reduced-motion policy는 animation/transition을 사실상 즉시 종료하고 특정 transform을 neutralize합니다.
- Viewport 진입 기반 reveal은 최종 contract가 아닙니다.
- Frozen Thread 안에는 server-first invariant를 실행 검증하는 dedicated test가 없습니다.
<!-- learner:thread-final-state:end -->

## 10. 최종 실행 흐름

<!-- learner:thread-flow:start -->
1. Server component가 `Reveal`을 일반 wrapper처럼 호출합니다.
2. Reveal은 선택된 element type에 children, className, delay style을 붙입니다.
3. Markup은 처음부터 `reveal-item is-visible`입니다.
4. Normal motion에서도 component는 visibility class를 전환하지 않습니다. Reduced-motion에서는 global override가 남은 timing/transform declaration을 neutralize합니다.
5. Client observer lifecycle은 존재하지 않습니다.
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
