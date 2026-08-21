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
| 직전 state와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner와 lifetime |  |
| Failure·absence·fallback·cleanup |  |
| Test technique와 실행 증거 |  |
| 보장하는 것 |  |
| 보장하지 않는 것 |  |
| 다음 commit/관련 test 연결 |  |

#### 최소 code evidence

- **Commit:**
- **Path / function / test:**
- **왜 이 excerpt가 필요한가:**

```text
[학습자가 exact SHA에서 필요한 최소 excerpt만 기록]
```

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command |  |
| 실제 결과 또는 실행 불가 사유 |  |
| 정적 검토와 실행 결과의 구분 |  |

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
| 직전 state와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner와 lifetime |  |
| Failure·absence·fallback·cleanup |  |
| Test technique와 실행 증거 |  |
| 보장하는 것 |  |
| 보장하지 않는 것 |  |
| 다음 commit/관련 test 연결 |  |

#### 최소 code evidence

- **Commit:**
- **Path / function / test:**
- **왜 이 excerpt가 필요한가:**

```text
[학습자가 exact SHA에서 필요한 최소 excerpt만 기록]
```

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command |  |
| 실제 결과 또는 실행 불가 사유 |  |
| 정적 검토와 실행 결과의 구분 |  |

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
| 직전 state와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner와 lifetime |  |
| Failure·absence·fallback·cleanup |  |
| Test technique와 실행 증거 |  |
| 보장하는 것 |  |
| 보장하지 않는 것 |  |
| 다음 commit/관련 test 연결 |  |

#### 최소 code evidence

- **Commit:**
- **Path / function / test:**
- **왜 이 excerpt가 필요한가:**

```text
[학습자가 exact SHA에서 필요한 최소 excerpt만 기록]
```

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command |  |
| 실제 결과 또는 실행 불가 사유 |  |
| 정적 검토와 실행 결과의 구분 |  |

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
| 직전 state와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner와 lifetime |  |
| Failure·absence·fallback·cleanup |  |
| Test technique와 실행 증거 |  |
| 보장하는 것 |  |
| 보장하지 않는 것 |  |
| 다음 commit/관련 test 연결 |  |

#### 최소 code evidence

- **Commit:**
- **Path / function / test:**
- **왜 이 excerpt가 필요한가:**

```text
[학습자가 exact SHA에서 필요한 최소 excerpt만 기록]
```

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command |  |
| 실제 결과 또는 실행 불가 사유 |  |
| 정적 검토와 실행 결과의 구분 |  |

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
| 직전 state와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner와 lifetime |  |
| Failure·absence·fallback·cleanup |  |
| Test technique와 실행 증거 |  |
| 보장하는 것 |  |
| 보장하지 않는 것 |  |
| 다음 commit/관련 test 연결 |  |

#### 최소 code evidence

- **Commit:**
- **Path / function / test:**
- **왜 이 excerpt가 필요한가:**

```text
[학습자가 exact SHA에서 필요한 최소 excerpt만 기록]
```

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command |  |
| 실제 결과 또는 실행 불가 사유 |  |
| 정적 검토와 실행 결과의 구분 |  |

## 6. Invariant evolution ledger

| Invariant | 도입/변경 SHA | Historical evidence | 상태 |
| --- | --- | --- | --- |
| Content는 server output에서 즉시 visible하다. |  |  |  |
| Font acquisition은 need-based이고 audited mono preload가 없다. |  |  |  |
| Audited internal links는 idle RSC prefetch를 하지 않는다. |  |  |  |
| Core disclosure interactions는 explicit lab target을 가진다. |  |  |  |

## 7. Failure → Fix → Test

| Earlier failure/risk | Fix SHA | Corrected decision | Regression evidence |
| --- | --- | --- | --- |
| Hydration/observer가 늦거나 없을 때 content가 hidden으로 남을 위험 |  |  |  |
| 사용하지 않는 font가 preload/download될 위험 |  |  |  |
| 링크가 많은 page가 idle RSC requests를 폭증시킬 위험 |  |  |  |
| Interaction 측정이 synthetic click/다중 event/threshold absence를 잘못 해석할 위험 |  |  |  |

## 8. Ownership/state/responsibility 변화

| 대상 | 초기 owner/state | 최종 owner/state | Evidence |
| --- | --- | --- | --- |
| Content visibility |  |  |  |
| Font preload/use |  |  |  |
| Idle route acquisition |  |  |  |
| Runtime network evidence |  |  |  |
| Interaction timing evidence |  |  |  |

## 9. 최종 Thread state

다음 내용을 코드 없이 설명합니다: 최종 owner, input→decision→output, failure/absence policy, regression evidence와 명시적 non-guarantee.

> 학습자 기록:

## 10. 최종 실행 흐름

| 단계 | Owner / mechanism | Input | Output/state | Failure/non-guarantee |
| ---: | --- | --- | --- | --- |
| 1. Server content |  |  |  |  |
| 2. Font policy |  |  |  |  |
| 3. Link policy |  |  |  |  |
| 4. Network verification |  |  |  |  |
| 5. Interaction verification |  |  |  |  |

## 11. 학습 완료 확인

- [ ] 모든 referenced SHA를 exact historical diff 기준으로 설명했습니다.
- [ ] Commit map의 SHA·순서·subject·importance·tags를 변경하지 않았습니다.
- [ ] Fix를 earlier failure/assumption에 연결했습니다.
- [ ] Test가 실행하는 production path와 증명하지 않는 범위를 구분했습니다.
- [ ] 정적 inspection과 실제 command execution을 구분했습니다.
- [ ] Thread-level invariant, ownership과 final flow를 완성했습니다.
- [ ] 실행하지 못한 command가 있으면 환경 사유와 정적 검토 범위를 기록했습니다.
