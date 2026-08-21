# Thread: Client performance and server-first optimization

> Project: 42 Archive Portfolio (`web/portfolio`)
>
> Category: `07-testing-performance-and-regression-strategy`
>
> Phase 1에서 감사·수정한 뒤 동결한 scaffold를 기준으로 합니다.

## 0. 분류 출처와 변경 가능 범위

- Commit SHA, subject, importance와 tags는 branch-local `commit/commit-importance.md` 분류와 exact commit metadata를 기준으로 고정했습니다.
- 이 문서의 Thread goal, commit grouping과 source-defined 역할은 Phase 1 category audit 결과입니다.
- Phase 2에서는 SHA, 순서, subject, importance, tags, 역할, 질문과 문서 구조를 바꾸지 않습니다.
- 다른 branch 또는 final HEAD의 구현을 earlier SHA 설명에 소급하지 않습니다.
- Runtime evidence는 실제로 실행한 command만 기록하며, 미실행 상태를 통과로 해석하지 않습니다.

## 1. Thread 목표

Client reveal state, global font loading과 automatic route prefetch를 줄이고 actual browser request/font behavior 및 native interaction latency를 regression tests로 고정하는 과정을 복원합니다.

### 동결된 핵심 invariant

- Core content visibility는 hydration·IntersectionObserver progress에 의존하지 않습니다.
- Font preload/consumer는 locale·renderer 필요 범위로 제한되고 Geist Mono는 audited initial routes에서 불필요하게 요청되지 않습니다.
- Internal links는 idle/viewport route prefetch를 명시적으로 끄되 user-initiated navigation은 유지합니다.
- Design switcher close와 mobile menu open은 defined Event Timing measurement에서 3-sample median·maximum 200ms 이하를 목표로 합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- Reveal의 observer/state lifecycle을 제거하면 어떤 animation을 포기하고 어떤 server-first invariant를 얻는가?
- Next localFont options, locale predicate와 CSS consumer가 실제 request behavior에 어떻게 연결되는가?
- 모든 renderer Link call site의 prefetch opt-out을 browser request stream에서 어떻게 검증하는가?
- Event Timing sample은 trusted click, interaction ID, below-threshold entry와 paint settlement를 어떻게 처리하는가?

## 3. 완료 기준

- 각 referenced SHA의 exact parent diff와 resulting changed files를 확인합니다.
- Commit별 previous state, implementation decision, ownership/lifetime, failure path와 non-guarantee를 구분합니다.
- Fix는 earlier assumption과 root cause에 연결하고, test는 production path·technique·proves/does-not-prove를 구분합니다.
- A-level은 subsystem·failure·verification 관계까지, B-level은 local role과 후속 연결까지만 설명합니다.
- Thread-level invariant evolution, Failure → Fix → Test, ownership transfer와 final flow를 코드 없이 설명합니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | 이 Thread에서 확인할 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `b8164cfdddbd` | refactor(ui): reveal 콘텐츠를 server에서 즉시 표시 | A | ARCH, CONTENT, REFACTOR | Observer/client state 제거와 immediate server-visible content |
| 2 | `b09775ec17c3` | perf(font): route별 글꼴 로딩 비용 축소 | A | ARCH, ROUTING, PERF | Locale/consumer-aware local font loading policy |
| 3 | `2c0c9bb34b77` | perf(navigation): 유휴 route prefetch 비활성화 | A | ARCH, ROUTING, PERF | Shared/five-renderer internal Link idle-prefetch opt-out |
| 4 | `dfeb324572fa` | test(perf): 유휴 route 요청과 글꼴 경계 검증 | A | ARCH, VALIDATION, ROUTING | Actual `_rsc` request, preload와 font resource browser regression |
| 5 | `787478032d27` | test(perf): 사용자 상호작용 지연 측정 추가 | A | PERF, TEST | Trusted Event Timing samples와 200ms interaction target |

## 5. Commit별 학습 기록

각 section은 해당 SHA의 tree와 parent diff만 기준으로 작성합니다. 같은 SHA가 다른 category Thread에 등장하더라도 여기서는 위 역할과 파일 범위만 설명합니다.

### 1. `b8164cfdddbd` — refactor(ui): reveal 콘텐츠를 server에서 즉시 표시

- **Full SHA:** `b8164cfdddbdda1bbff45f06649fc706cf552123`
- **Importance:** A
- **Tags:** ARCH, CONTENT, REFACTOR
- **이 Thread에서의 역할:** Observer/client state 제거와 immediate server-visible content

#### 해당 SHA에서 확인할 실제 코드

- `src/components/portfolio/reveal.tsx`에서 제거된 `"use client"`, React hooks와 `Ref` type
- 초기 `visible` 계산의 `window`/`IntersectionObserver` branch
- `useEffect`의 observer 생성, rootMargin/threshold, observe/disconnect cleanup
- 최종 class가 항상 `reveal-item is-visible`이며 polymorphic `as`, `className`, `delay`는 유지되는 점

#### Commit-specific investigation

- `b8164cfdddbd^`와 `b8164cfdddbd`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `Observer/client state 제거와 immediate server-visible content`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
- Production path와 test path를 분리하고, state/data/resource owner와 lifetime·cleanup을 실제 symbol 기준으로 추적합니다.
- Failure/absence/fallback branch와 test technique을 구분하고, 이 SHA가 보장하지 않는 범위를 명시합니다.
- 다음 후속 관계를 대조하되 later code를 이 SHA의 구현으로 설명하지 않습니다: `b09775ec17c3`과 `2c0c9bb34b77`이 font/network 비용을 줄이고, `dfeb...`·`787...`가 browser-observable regression evidence를 추가합니다.

#### 학습자 증거

| 확인·기록 항목 | 기록 |
| --- | --- |
| 직전 state와 부족함 | Reveal은 content를 server markup에 포함하더라도 visible class를 client state가 결정했습니다. IntersectionObserver 지원 환경에서는 hydration/effect/intersection 전까지 hidden presentation이 유지되고 observer/ref/state가 모든 instance에 client runtime 비용을 만들었습니다. |
| 실제 변경 file/symbol/call path | Client directive와 state/effect/ref/observer lifecycle을 전부 제거했습니다. Component는 server-compatible function이 되어 항상 `reveal-item is-visible`를 출력하고, optional transition delay만 inline style로 유지합니다. |
| Data/state/DOM/resource owner와 lifetime | Visibility decision은 browser observer가 아니라 server-rendered markup이 소유합니다. Component는 element type과 class/transition-delay presentation만 계산하며 observer resource와 cleanup owner가 사라집니다. |
| Failure·absence·fallback·cleanup | IntersectionObserver 미지원 fallback과 observer cleanup branch 자체가 없어집니다. 대신 scroll-enter animation behavior도 제거됩니다. `delay`가 남아 있어 CSS transition이 존재할 수 있지만 content visibility는 client progress에 의존하지 않습니다. |
| Test technique와 실행 증거 | Server-first refactor입니다. Exact source diff를 확인했으며 JavaScript byte·paint timing은 이 commit에서 측정되지 않았습니다. |
| 보장하는 것 | Reveal-wrapped content가 hydration 또는 viewport intersection을 기다리지 않고 visible class를 가진 server output으로 제공됩니다. |
| 보장하지 않는 것 | 모든 client JavaScript 제거, LCP 개선량, CSS animation cost, below-the-fold rendering 최적화와 user-perceived 성능 개선 수치는 보장하지 않습니다. |
| 다음 commit/관련 test 연결 | `b09775ec17c3`과 `2c0c9bb34b77`이 font/network 비용을 줄이고, `dfeb...`·`787...`가 browser-observable regression evidence를 추가합니다. |

#### 최소 code evidence

- **Commit:** `b8164cfdddbdda1bbff45f06649fc706cf552123`
- **Path:** `src/components/portfolio/reveal.tsx`
- **Location:** Reveal 반환부

```tsx
return (
  <Component
    className={`reveal-item is-visible ${className}`}
    style={{ transitionDelay: `${delay}ms` }}
  >
    {children}
  </Component>
);
```

이 excerpt는 위 state/ownership/contract를 식별하는 데 필요한 부분만 남긴 것입니다.

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command | 미실행 |
| 실제 결과 | 실행 환경에서 `github.com` DNS 해석이 실패하여 repository를 local clone하지 못했습니다. 따라서 이 문서의 역사 증거는 GitHub의 exact commit API에서 확인한 parent diff, changed file, 해당 SHA의 file content와 branch-local classification에 한정합니다. Vitest·Playwright·Axe·screenshot·performance command는 실행하지 않았고, 통과했다고 기록하지 않습니다. |
| 정적 검토 범위 | Exact commit diff, changed files, 위에 열거한 symbol/test/config |

### 2. `b09775ec17c3` — perf(font): route별 글꼴 로딩 비용 축소

- **Full SHA:** `b09775ec17c3c393829d7b77d36bd34d34e6c04d`
- **Importance:** A
- **Tags:** ARCH, ROUTING, PERF
- **이 Thread에서의 역할:** Locale/consumer-aware local font loading policy

#### 해당 SHA에서 확인할 실제 코드

- `src/app/layout.tsx`의 Geist Sans/Mono/Korean Serif `localFont` options
- `display: "swap"`에서 `"optional"`로의 변경과 Mono/Korean `preload: false`
- `usesKoreanSerif` language predicate와 non-Korean `serifFallback` CSS custom property
- `<html>` className/style에서 Korean serif variable을 조건부로 주입하는 방식
- `design-switcher.module.css`가 Geist Mono variable 대신 system monospace stack을 사용하는 두 selector

#### Commit-specific investigation

- `b09775ec17c3^`와 `b09775ec17c3`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `Locale/consumer-aware local font loading policy`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
- Production path와 test path를 분리하고, state/data/resource owner와 lifetime·cleanup을 실제 symbol 기준으로 추적합니다.
- Failure/absence/fallback branch와 test technique을 구분하고, 이 SHA가 보장하지 않는 범위를 명시합니다.
- 다음 후속 관계를 대조하되 later code를 이 SHA의 구현으로 설명하지 않습니다: `dfeb324572fa`가 generated `@font-face`, preload links와 actual font requests를 browser에서 검사합니다.

#### 학습자 증거

| 확인·기록 항목 | 기록 |
| --- | --- |
| 직전 state와 부족함 | Root layout은 세 local font variable을 모든 route의 `<html>`에 붙였습니다. 실제 design/locale이 font를 쓰지 않아도 preload 또는 generated font-face consumption이 초기 request 비용으로 이어질 수 있었고 switcher의 작은 ordinal text가 Geist Mono dependency를 유지했습니다. |
| 실제 변경 file/symbol/call path | 세 font의 display policy를 `optional`로 바꾸고 Mono와 Korean Serif preload를 끕니다. Korean serif variable은 site language가 `ko`로 시작할 때만 class에 추가하며 그 외에는 CSS fallback variable을 inline style로 제공합니다. Switcher count/number는 system monospace로 바꿉니다. |
| Data/state/DOM/resource owner와 lifetime | Root layout이 locale에 따른 font-variable ownership을 갖고 Next font loader가 font-face/preload behavior를 생성합니다. Individual renderer CSS는 variable 또는 fallback stack을 소비합니다. Switcher는 더 이상 Geist Mono resource를 요구하지 않습니다. |
| Failure·absence·fallback·cleanup | Locale predicate는 `site.language.toLowerCase().startsWith("ko")`만 봅니다. `optional`은 font가 반드시 내려받지 않는다는 절대 보장이 아니며 실제 CSS consumer가 남아 있으면 request가 발생할 수 있습니다. Korean locale에서는 serif variable이 유지됩니다. |
| Test technique와 실행 증거 | Static performance policy change입니다. Source options와 CSS consumers를 확인했으며 network trace는 후속 test 전까지 없습니다. |
| 보장하는 것 | 불필요한 global font preload를 줄이고 non-Korean routes에 serif system fallback을 제공하며 switcher의 Mono dependency를 제거합니다. |
| 보장하지 않는 것 | 각 route의 실제 font bytes, cache state, browser별 optional behavior, CLS/LCP 개선량과 all-design font usage를 이 commit만으로 보장하지 않습니다. |
| 다음 commit/관련 test 연결 | `dfeb324572fa`가 generated `@font-face`, preload links와 actual font requests를 browser에서 검사합니다. |

#### 최소 code evidence

- **Commit:** `b09775ec17c3c393829d7b77d36bd34d34e6c04d`
- **Path:** `src/app/layout.tsx`
- **Location:** Geist Mono localFont configuration

```tsx
const geistMono = localFont({
  display: "optional",
  preload: false,
  src: "./fonts/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
});
```

이 excerpt는 위 state/ownership/contract를 식별하는 데 필요한 부분만 남긴 것입니다.

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command | 미실행 |
| 실제 결과 | 실행 환경에서 `github.com` DNS 해석이 실패하여 repository를 local clone하지 못했습니다. 따라서 이 문서의 역사 증거는 GitHub의 exact commit API에서 확인한 parent diff, changed file, 해당 SHA의 file content와 branch-local classification에 한정합니다. Vitest·Playwright·Axe·screenshot·performance command는 실행하지 않았고, 통과했다고 기록하지 않습니다. |
| 정적 검토 범위 | Exact commit diff, changed files, 위에 열거한 symbol/test/config |

### 3. `2c0c9bb34b77` — perf(navigation): 유휴 route prefetch 비활성화

- **Full SHA:** `2c0c9bb34b77655f40eb13b51fd1e754881a7fdb`
- **Importance:** A
- **Tags:** ARCH, ROUTING, PERF
- **이 Thread에서의 역할:** Shared/five-renderer internal Link idle-prefetch opt-out

#### 해당 SHA에서 확인할 실제 코드

- `ContentLinkView`, `DesignSwitcher`, `ProjectCard`, `SiteHeader`, `SiteFooter`의 internal `<Link>`
- Design/Classic home·project routes의 action/back/detail links
- Editorial, Brutalist, Cinematic renderer의 brand/navigation/project/action links
- 각 href/query-building helper는 유지되고 `prefetch={false}`만 추가되는지
- external `<a>`나 실제 user-initiated navigation은 이 정책의 대상이 아니라는 점

#### Commit-specific investigation

- `2c0c9bb34b77^`와 `2c0c9bb34b77`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `Shared/five-renderer internal Link idle-prefetch opt-out`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
- Production path와 test path를 분리하고, state/data/resource owner와 lifetime·cleanup을 실제 symbol 기준으로 추적합니다.
- Failure/absence/fallback branch와 test technique을 구분하고, 이 SHA가 보장하지 않는 범위를 명시합니다.
- 다음 후속 관계를 대조하되 later code를 이 SHA의 구현으로 설명하지 않습니다: `dfeb324572fa`가 five-design home/detail에서 `_rsc` requests를 실제 browser request stream으로 관찰합니다.

#### 학습자 증거

| 확인·기록 항목 | 기록 |
| --- | --- |
| 직전 state와 부족함 | 많은 route/design links가 viewport에 동시에 나타나는 portfolio 구조에서 Next의 default prefetch는 사용자가 아무 동작을 하지 않아도 여러 RSC route request를 만들 수 있었습니다. Design마다 같은 destination links가 반복되어 idle network work가 증폭될 수 있었습니다. |
| 실제 변경 file/symbol/call path | 공유 shell/content/project components와 독립 renderer의 모든 확인된 internal Next `Link`에 `prefetch={false}`를 추가했습니다. Existing href construction, debug/design query propagation, labels와 navigation semantics는 유지합니다. |
| Data/state/DOM/resource owner와 lifetime | Link가 destination을 소유하지 않고 route helper가 href를 계속 결정합니다. 변경된 ownership은 background acquisition policy이며, browser/Next가 idle prefetch를 시작하지 않도록 각 Link call site가 explicit opt-out을 선언합니다. User click navigation은 그대로 Next Link가 수행합니다. |
| Failure·absence·fallback·cleanup | 누락된 internal Link가 있으면 prefetch가 남을 수 있습니다. `prefetch={false}`는 speculative browser preload, image/font request 또는 click 이후 RSC request를 막지 않습니다. External links에는 적용되지 않습니다. |
| Test technique와 실행 증거 | Cross-renderer network policy refactor입니다. Large diff의 Link call sites를 확인했으며 actual request absence는 후속 Playwright test가 담당합니다. |
| 보장하는 것 | 감사된 public route links는 idle/viewport 상태에서 Next route prefetch를 요청하지 않도록 명시됩니다. |
| 보장하지 않는 것 | Zero background network, navigation latency 개선, hover behavior, future Next semantics와 every dynamically introduced Link coverage는 보장하지 않습니다. |
| 다음 commit/관련 test 연결 | `dfeb324572fa`가 five-design home/detail에서 `_rsc` requests를 실제 browser request stream으로 관찰합니다. |

#### 최소 code evidence

- **Commit:** `2c0c9bb34b77655f40eb13b51fd1e754881a7fdb`
- **Path:** `src/components/portfolio/site-shell.tsx`
- **Location:** internal navigation Link pattern

```tsx
<Link
  href={getTemplateHref(item.href, templateSwitcher?.activeId, {
    contentDebug: templateSwitcher?.contentDebug,
  })}
  prefetch={false}
>
  {item.label}
</Link>
```

이 excerpt는 위 state/ownership/contract를 식별하는 데 필요한 부분만 남긴 것입니다.

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command | 미실행 |
| 실제 결과 | 실행 환경에서 `github.com` DNS 해석이 실패하여 repository를 local clone하지 못했습니다. 따라서 이 문서의 역사 증거는 GitHub의 exact commit API에서 확인한 parent diff, changed file, 해당 SHA의 file content와 branch-local classification에 한정합니다. Vitest·Playwright·Axe·screenshot·performance command는 실행하지 않았고, 통과했다고 기록하지 않습니다. |
| 정적 검토 범위 | Exact commit diff, changed files, 위에 열거한 symbol/test/config |

### 4. `dfeb324572fa` — test(perf): 유휴 route 요청과 글꼴 경계 검증

- **Full SHA:** `dfeb324572fac339cc3bd3162da88c4bc1e68c7e`
- **Importance:** A
- **Tags:** ARCH, VALIDATION, ROUTING
- **이 Thread에서의 역할:** Actual `_rsc` request, preload와 font resource browser regression

#### 해당 SHA에서 확인할 실제 코드

- `tests/e2e/performance.spec.ts`의 `designIds × initialRoutes(home, first project detail)` loop
- `page.on("request")` listener가 `_rsc` query와 `resourceType() === "font"`를 기록하는 방식
- page visit, first heading visibility, 1-second idle window와 listener 제거 시점
- same-origin stylesheet `cssRules`에서 Geist Mono `CSSFontFaceRule` source URL을 추출하는 code
- `link[rel~="preload"][as="font"]` manifest와 actual font requests assertions
- Design/Editorial만 Geist Mono download absence를 요구하고 모든 design은 preload absence를 요구하는 scope

#### Commit-specific investigation

- `dfeb324572fa^`와 `dfeb324572fa`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `Actual `_rsc` request, preload와 font resource browser regression`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
- Production path와 test path를 분리하고, state/data/resource owner와 lifetime·cleanup을 실제 symbol 기준으로 추적합니다.
- Failure/absence/fallback branch와 test technique을 구분하고, 이 SHA가 보장하지 않는 범위를 명시합니다.
- 다음 후속 관계를 대조하되 later code를 이 SHA의 구현으로 설명하지 않습니다: `787478032d27`가 network absence와 별개로 user interaction latency를 Event Timing으로 측정합니다. Bundle/Lighthouse/release gates는 category 08의 별도 Thread가 소유합니다.

#### 학습자 증거

| 확인·기록 항목 | 기록 |
| --- | --- |
| 직전 state와 부족함 | Font/prefetch source policy는 추가되었지만 browser가 generated CSS와 Next runtime을 통해 무엇을 실제로 요청하는지 증명하지 못했습니다. Static grep만으로 framework-generated preload/RSC behavior를 확인할 수 없었습니다. |
| 실제 변경 file/symbol/call path | Playwright test가 각 design의 home과 first project detail을 방문하면서 request listener를 설치합니다. `_rsc` requests와 font resources를 모으고, loaded stylesheets에서 Geist Mono source path를 찾아 preload manifest 및 observed requests와 비교합니다. |
| Data/state/DOM/resource owner와 lifetime | Browser request stream과 CSSOM이 runtime evidence source입니다. `site-matrix`가 design/fixture enumeration을 소유하고 test가 listener lifetime을 page goto부터 1-second idle window까지 소유합니다. Production Link/font config는 decision owner로 남습니다. |
| Failure·absence·fallback·cleanup | Enabled project가 없으면 test module이 error를 던집니다. Cross-origin stylesheet access는 catch 후 건너뜁니다. Geist Mono face 자체가 없으면 별도 assertion이 실패하여 단순 삭제로 test를 우회할 수 없습니다. Listener는 assertion 전 제거됩니다. |
| Test technique와 실행 증거 | Browser network/CSSOM regression test입니다. Five designs × two initial routes를 configured Playwright projects에서 실행하도록 정의합니다. Exact code는 확인했지만 현재 환경에서는 실행하지 않았습니다. |
| 보장하는 것 | 관찰 window 동안 idle `_rsc` request가 없어야 하고 Geist Mono는 preload되지 않아야 하며, Design/Editorial initial routes에서는 해당 font resource가 실제로 내려받아지지 않아야 합니다. |
| 보장하지 않는 것 | 다른 routes, interaction/hover 후 requests, cache-cold/warm variance, all fonts, transferred bytes, navigation speed와 production CDN behavior는 보장하지 않습니다. |
| 다음 commit/관련 test 연결 | `787478032d27`가 network absence와 별개로 user interaction latency를 Event Timing으로 측정합니다. Bundle/Lighthouse/release gates는 category 08의 별도 Thread가 소유합니다. |

#### 최소 code evidence

- **Commit:** `dfeb324572fac339cc3bd3162da88c4bc1e68c7e`
- **Path:** `tests/e2e/performance.spec.ts`
- **Location:** request listener

```ts
if (url.searchParams.has("_rsc")) {
  prefetchedRoutes.push(`${url.pathname}${url.search}`);
}
if (request.resourceType() === "font") {
  loadedFonts.push(url.pathname);
}
```

이 excerpt는 위 state/ownership/contract를 식별하는 데 필요한 부분만 남긴 것입니다.

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command | 미실행 |
| 실제 결과 | 실행 환경에서 `github.com` DNS 해석이 실패하여 repository를 local clone하지 못했습니다. 따라서 이 문서의 역사 증거는 GitHub의 exact commit API에서 확인한 parent diff, changed file, 해당 SHA의 file content와 branch-local classification에 한정합니다. Vitest·Playwright·Axe·screenshot·performance command는 실행하지 않았고, 통과했다고 기록하지 않습니다. |
| 정적 검토 범위 | Exact commit diff, changed files, 위에 열거한 symbol/test/config |

### 5. `787478032d27` — test(perf): 사용자 상호작용 지연 측정 추가

- **Full SHA:** `787478032d27be5dc2435ad3378318644251c10d`
- **Importance:** A
- **Tags:** PERF, TEST
- **이 Thread에서의 역할:** Trusted Event Timing samples와 200ms interaction target

#### 해당 SHA에서 확인할 실제 코드

- `tests/e2e/interaction-performance.spec.ts`의 16ms observer threshold, 200ms target, 3-sample constants
- `PerformanceObserver` event entries, `interactionId`, `startTime`, trusted click counter를 저장하는 probe
- double `requestAnimationFrame`+timer settle, warmup, probe reset/read lifecycle
- entry가 없을 때 `<16ms` upper bound로 해석하고 한 trusted click·한 interaction ID를 요구하는 logic
- 세 sample의 median과 maximum을 모두 200ms 이하로 assert하고 diagnostic line을 출력하는 code
- all-design switcher close와 mobile project에서만 menu-open을 측정하는 scenario scope

#### Commit-specific investigation

- `787478032d27^`와 `787478032d27`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `Trusted Event Timing samples와 200ms interaction target`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
- Production path와 test path를 분리하고, state/data/resource owner와 lifetime·cleanup을 실제 symbol 기준으로 추적합니다.
- Failure/absence/fallback branch와 test technique을 구분하고, 이 SHA가 보장하지 않는 범위를 명시합니다.
- 다음 후속 관계를 대조하되 later code를 이 SHA의 구현으로 설명하지 않습니다: 이 Thread의 runtime interaction evidence를 완성합니다. Release-level Lighthouse/bundle budget 및 CI enforcement는 category 08로 분리됩니다.

#### 학습자 증거

| 확인·기록 항목 | 기록 |
| --- | --- |
| 직전 state와 부족함 | Server-first/network optimizations은 있었지만 사용자가 실제 native disclosure를 조작할 때 처리 지연이 목표 안에 있는지 정량 contract가 없었습니다. 단일 wall-clock click measurement는 warmup·paint·untrusted dispatch를 섞을 위험이 있었습니다. |
| 실제 변경 file/symbol/call path | Chromium Event Timing observer를 설치하고 browser-trusted click을 정확히 하나 포함하는 sample만 받습니다. Warmup 뒤 각 scenario를 세 번 측정하고 동일 interaction ID의 event entries 중 최대 duration을 sample upper bound로 사용합니다. Median과 maximum 모두 200ms target을 넘으면 실패합니다. |
| Data/state/DOM/resource owner와 lifetime | Browser PerformanceObserver가 event timing entries를 소유하고 test probe가 한 page lifetime 동안 수집 buffer와 sample start를 관리합니다. Production native disclosure/close island가 interaction path이며 test는 state visible/hidden과 focus end-state도 확인합니다. |
| Failure·absence·fallback·cleanup | Event Timing 미지원이면 즉시 실패합니다. Observer threshold 아래라 entry가 없으면 `<16ms`로 conservative upper bound를 기록합니다. Trusted click 수가 1이 아니거나 interaction ID가 여러 개면 측정 자체를 invalid로 실패시킵니다. Desktop에서는 mobile menu test를 skip합니다. |
| Test technique와 실행 증거 | Browser interaction-performance regression입니다. Three-sample median/max gate와 paint settle을 사용하지만 lab measurement이며 statistical benchmark suite는 아닙니다. Exact implementation을 확인했으나 실행하지 않았습니다. |
| 보장하는 것 | 다섯 design의 switcher-close와 mobile viewport의 menu-open이 defined browser project에서 3회 sample median·maximum 200ms 이하라는 executable target을 갖습니다. |
| 보장하지 않는 것 | Real-user INP distribution, low-end devices, network-dependent navigation, long sessions, every interaction, cross-browser timing API와 production telemetry를 보장하지 않습니다. |
| 다음 commit/관련 test 연결 | 이 Thread의 runtime interaction evidence를 완성합니다. Release-level Lighthouse/bundle budget 및 CI enforcement는 category 08로 분리됩니다. |

#### 최소 code evidence

- **Commit:** `787478032d27be5dc2435ad3378318644251c10d`
- **Path:** `tests/e2e/interaction-performance.spec.ts`
- **Location:** reportAndAssertSamples

```ts
expect(medianUpperBoundMs).toBeLessThanOrEqual(
  INTERACTION_TARGET_MS,
);
expect(maxUpperBoundMs).toBeLessThanOrEqual(
  INTERACTION_TARGET_MS,
);
```

이 excerpt는 위 state/ownership/contract를 식별하는 데 필요한 부분만 남긴 것입니다.

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command | 미실행 |
| 실제 결과 | 실행 환경에서 `github.com` DNS 해석이 실패하여 repository를 local clone하지 못했습니다. 따라서 이 문서의 역사 증거는 GitHub의 exact commit API에서 확인한 parent diff, changed file, 해당 SHA의 file content와 branch-local classification에 한정합니다. Vitest·Playwright·Axe·screenshot·performance command는 실행하지 않았고, 통과했다고 기록하지 않습니다. |
| 정적 검토 범위 | Exact commit diff, changed files, 위에 열거한 symbol/test/config |

## 6. Invariant evolution ledger

| Invariant | 도입/변경 SHA | Historical evidence | 상태 |
| --- | --- | --- | --- |
| Content는 server output에서 즉시 visible하다. | b8164cfdddbd | Reveal이 항상 `is-visible`, no client hooks/observer | 수정 |
| Font acquisition은 need-based이고 audited mono preload가 없다. | b09775ec17c3 → dfeb324572fa | localFont policy + CSSOM/request assertions | 정책→검증 |
| Audited internal links는 idle RSC prefetch를 하지 않는다. | 2c0c9bb34b77 → dfeb324572fa | `prefetch={false}` + `_rsc` request capture | 정책→검증 |
| Core disclosure interactions는 explicit lab target을 가진다. | 787478032d27 | 3 samples, median/max ≤200ms | 측정·gate |

## 7. Failure → Fix → Test

| Earlier failure/risk | Fix SHA | Corrected decision | Regression evidence |
| --- | --- | --- | --- |
| Hydration/observer가 늦거나 없을 때 content가 hidden으로 남을 위험 | b8164cfdddbd | Client visibility state 제거 | Server-first correction |
| 사용하지 않는 font가 preload/download될 위험 | b09775ec17c3 → dfeb324572fa | Options/consumer 축소 + CSSOM/network observation | Fix→Test |
| 링크가 많은 page가 idle RSC requests를 폭증시킬 위험 | 2c0c9bb34b77 → dfeb324572fa | Cross-renderer opt-out + request listener | Fix→Test |
| Interaction 측정이 synthetic click/다중 event/threshold absence를 잘못 해석할 위험 | 787478032d27 | Trusted count, one interaction ID, `<16ms` upper bound | Measurement validity checks |

## 8. Ownership/state/responsibility 변화

| 대상 | 초기 owner/state | 최종 owner/state | Evidence |
| --- | --- | --- | --- |
| Content visibility | Client Reveal observer/state | Server markup | `Reveal` |
| Font preload/use | Global root classes | Locale + actual CSS consumers | `layout.tsx`, CSS |
| Idle route acquisition | Next default Link policy | Explicit call-site opt-out | `prefetch={false}` |
| Runtime network evidence | 없음 | Playwright request/CSSOM probe | `performance.spec.ts` |
| Interaction timing evidence | 없음 | PerformanceObserver probe | `interaction-performance.spec.ts` |

## 9. 최종 Thread state

다음 내용을 코드 없이 설명합니다: 최종 owner, input→decision→output, failure/absence policy, regression evidence와 명시적 non-guarantee.

최종 상태에서는 content reveal이 server-visible이고 font 및 route prefetch policy가 initial request cost를 줄이는 방향으로 explicit해집니다. Playwright가 five-design home/detail의 idle `_rsc`와 font request/preload를 관찰하고, Event Timing test가 disclosure interactions의 lab target을 검사합니다. Bundle size, Lighthouse와 release CI enforcement는 category 08이 소유합니다.

## 10. 최종 실행 흐름

| 단계 | Owner / mechanism | Input | Output/state | Failure/non-guarantee |
| ---: | --- | --- | --- | --- |
| 1. Server content | `Reveal` | children/as/delay | visible markup | observer 없음 |
| 2. Font policy | Root layout/Next font | site language + font definitions | conditional variables/preloads | browser optional behavior |
| 3. Link policy | Shared/renderer Next Links | internal href | no idle prefetch opt-in | 누락된 call site 가능 |
| 4. Network verification | `performance.spec.ts` | browser requests/CSSOM/preloads | absence/presence assertions | window 밖 behavior 미보장 |
| 5. Interaction verification | `interaction-performance.spec.ts` | trusted click/Event Timing | 3-sample upper bounds | unsupported API/invalid sample failure |

## 11. 학습 완료 확인

- [x] 모든 referenced SHA를 exact historical diff 기준으로 설명했습니다.
- [x] Commit map의 SHA·순서·subject·importance·tags를 변경하지 않았습니다.
- [x] Fix를 earlier failure/assumption에 연결했습니다.
- [x] Test가 실행하는 production path와 증명하지 않는 범위를 구분했습니다.
- [x] 정적 inspection과 실제 command execution을 구분했습니다.
- [x] Thread-level invariant, ownership과 final flow를 완성했습니다.
- [x] 실행 제한을 명시했습니다: 실행 환경에서 `github.com` DNS 해석이 실패하여 repository를 local clone하지 못했습니다. 따라서 이 문서의 역사 증거는 GitHub의 exact commit API에서 확인한 parent diff, changed file, 해당 SHA의 file content와 branch-local classification에 한정합니다. Vitest·Playwright·Axe·screenshot·performance command는 실행하지 않았고, 통과했다고 기록하지 않습니다.
