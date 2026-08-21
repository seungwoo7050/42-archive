# Thread: Content link security, placement, and transport

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

연락처와 프로젝트 링크의 선택 정책, 내부/외부 transport, 배치별 노출, availability filtering과 공용 renderer 정리를 실제 commit 순서로 복원합니다.

**경계:** 이 Thread는 링크가 어디에 노출되고 어떤 element/URL로 이동하는지를 소유합니다. ProjectCard의 카드 조립과 hover 표현은 06 Thread에 남기며, route lifecycle 자체는 이 범위에 포함하지 않습니다.

### 고정 invariant

- Project card/detail의 가용성·placement 선택은 selector가 맡고, hero consumer는 이 history에서 같은 placement vocabulary를 직접 적용합니다. Transport renderer는 surface membership을 다시 결정하지 않습니다.
- 외부 링크는 anchor transport와 외부 속성을 사용하고, 내부 링크는 Next Link와 현재 view/debug query 보존 규칙을 사용합니다.
- live가 아닌 프로젝트의 demo와 해당 placement에 없는 링크는 렌더링되지 않습니다.
- 선택 결과가 비면 action container도 렌더링하지 않습니다.

## 2. 핵심 질문

- 초기 selector가 contact/project link availability를 어떤 단일 vocabulary로 만들었는가?
- ContentLinkView가 internal/external transport를 분기할 때 보장하는 속성과 보장하지 않는 검증은 무엇인가?
- card/detail/hero placement가 언제 도입되고 각 consumer의 filtering이 selector 또는 direct predicate 중 어디에 남았는가?
- 09cec616f314의 test가 source order, query 보존, external attributes, empty output을 어떤 technique로 고정하는가?
- 44e4d062da50의 refactor가 behavior를 바꾸지 않고 어떤 렌더링 책임만 합쳤는가?

## 3. 완료 기준

- 각 SHA의 parent diff와 resulting tree를 구분해 실제 file/symbol/call path를 기록합니다.
- Previous state, owner, state transition, absence/failure branch, guarantee/non-guarantee를 commit별로 분리합니다.
- Fix와 test는 실제로 수정·검증하는 production path에 연결합니다.
- 실행하지 않은 command 결과를 만들지 않습니다.
- S/A-level은 architecture/owner/failure/later evidence를 B-level보다 깊게 복원합니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Thread 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `ba8da56d3fcf` | feat(portfolio): 연락과 프로젝트 링크 선택기 추가 | A | CONTENT | 정책 owner 도입 |
| 2 | `f63c978c71c9` | feat(ui): 내부 외부 콘텐츠 링크 렌더링 | A | CONTENT | transport renderer 도입 |
| 3 | `e37ea9c2819a` | feat(project): 프로젝트 링크 그룹 추가 | B | RENDERER | detail action consumer |
| 4 | `1ef269fbdb49` | feat(project): 프로젝트 카드 링크 추가 | B | RENDERER | card action consumer |
| 5 | `daa6815a6dfa` | feat(project): 카드 링크를 콘텐츠 배치 기준으로 선택 | B | CONTENT, RENDERER | card placement 적용 |
| 6 | `119ff9a92090` | feat(content): 링크 배치 selector 추가 | B | CONTENT | placement vocabulary 일반화 |
| 7 | `2d87b62dcce8` | refactor(project): 상세 링크를 배치 기준으로 선택 | B | RENDERER, REFACTOR | detail selector migration |
| 8 | `ee2c118a76d6` | feat(content): 홈 링크를 배치 기준으로 선택 | B | CONTENT | hero consumer migration |
| 9 | `09cec616f314` | test(ui): 디자인 선택과 프로젝트 링크 계약 검증 | A | VALIDATION, TEST | 결정적 component contract 검증 |
| 10 | `44e4d062da50` | refactor(ui): 프로젝트 링크 렌더링 중복 제거 | B | VALIDATION, REFACTOR | 공용 list renderer 추출 |

## 5. Commit별 학습 기록

### 1. `ba8da56d3fcf` — feat(portfolio): 연락과 프로젝트 링크 선택기 추가

- **Importance:** A
- **Tags:** CONTENT
- **Thread 역할:** 정책 owner 도입

#### 해당 SHA에서 확인할 실제 코드

- `src/lib/portfolio/selectors.ts`의 `getPreferredContactLinks`, `getProjectLink`, `isProjectLive`, `getProjectCardLinks`, `getExternalLinkProps`를 parent와 비교합니다.
- `src/lib/portfolio.ts` export surface가 새 selector를 어떤 public boundary로 노출하는지 확인합니다.
- preferred ID 누락, demo link 부재, non-live deployment, internal link의 반환값을 각각 추적합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-ba8da56d3fcf-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | 직전 tree에는 contact preferred ID를 실제 link로 해석하거나 프로젝트 demo availability와 외부 transport 속성을 공통으로 계산하는 selector가 없었습니다. Consumer가 같은 판단을 반복할 여지가 있었습니다. |
| 실제 변경 file/symbol/call path | `selectors.ts`가 preferred 순서를 유지하면서 존재하는 link만 남기고, type별 project link 조회, `status === "live"`와 demo 존재를 함께 요구하는 live 판정, 초기 card action 선택, 외부 link props를 추가했습니다. `portfolio.ts`가 이를 public export로 묶었습니다. |
| Data/state/DOM/resource owner | Content data가 사실 원본을 소유하고 selector가 파생 결과를 소유합니다. Component는 selector의 반환 배열·boolean·props를 소비할 뿐 deployment 의미를 새로 결정하지 않는 방향이 시작됐습니다. |
| Failure·absence·fallback 처리 | 없는 preferred ID는 type guard filter로 제거되고, 없는 project link는 `null`, live 조건을 만족하지 않는 demo는 card 결과에서 제외됩니다. Internal link의 external props는 빈 object입니다. |
| 보장하는 것과 보장하지 않는 것 | 연락처 순서와 초기 project action availability를 중앙화합니다. 다만 placement vocabulary는 아직 없고, href scheme/content validity와 실제 DOM rendering은 보장하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | f63c978c71c9가 transport renderer를 만들고, e37ea9c2819a·1ef269fbdb49가 detail/card consumer를 붙입니다. daa6815a6dfa 이후 placement가 정책 입력으로 추가됩니다. |
<!-- learner:commit-ba8da56d3fcf-record:end -->

#### 최소 코드 증거

<!-- learner:commit-ba8da56d3fcf-excerpt:start -->
- **Commit:** `ba8da56d3fcf`
- **Path:** `src/lib/portfolio/selectors.ts`
- **Location:** `isProjectLive / getExternalLinkProps`

```tsx
export function getProjectLink(project: PortfolioProject, type: LinkType) {
  return project.links.find((link) => link.type === type) ?? null;
}

export function isProjectLive(project: PortfolioProject) {
  return Boolean(
    project.deployment.status === "live" && getProjectLink(project, "demo"),
  );
}

export function getProjectCardLinks(project: PortfolioProject) {
  return project.links.filter((link) => {
    if (link.type === "demo") {
      return isProjectLive(project);
    }

    return link.type === "github" || link.type === "case-study";
  });
}

export function getExternalLinkProps(link: ContentLink) {
  if (!link.external) {
    return {};
  }

  return {
    rel: "noreferrer",
    target: "_blank",
  };
}
```

이 발췌는 해당 SHA의 decision/state/ownership을 보여 주는 최소 부분입니다. 후속 commit의 코드는 섞지 않았습니다.
<!-- learner:commit-ba8da56d3fcf-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-ba8da56d3fcf-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
<!-- learner:commit-ba8da56d3fcf-execution:end -->

### 2. `f63c978c71c9` — feat(ui): 내부 외부 콘텐츠 링크 렌더링

- **Importance:** A
- **Tags:** CONTENT
- **Thread 역할:** transport renderer 도입

#### 해당 SHA에서 확인할 실제 코드

- 새 `src/components/portfolio/content-link.tsx`의 `ContentLinkView` 두 return branch를 비교합니다.
- 외부 branch가 `getExternalLinkProps`를 spread하고 내부 branch가 `getTemplateHref`에 `homeTemplate`·`contentDebug`를 전달하는 call path를 확인합니다.
- 이 component가 visibility, href validation, label/icon styling을 소유하는지 구분합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-f63c978c71c9-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Selector는 transport에 필요한 정보만 반환했고, 각 consumer가 `<a>`와 `next/link`를 직접 선택하면 외부 속성이나 query 보존이 서로 달라질 수 있었습니다. |
| 실제 변경 file/symbol/call path | `ContentLinkView`가 `link.external`을 유일한 transport 분기값으로 사용합니다. External branch는 원래 href를 가진 `<a>`와 selector props를 사용하고, internal branch는 `getTemplateHref(link.href, homeTemplate, { contentDebug })`를 거친 Next `Link`를 사용합니다. |
| Data/state/DOM/resource owner | ContentLink data가 external 여부와 href를 소유하고, renderer가 DOM element 선택을 소유합니다. 내부 URL의 view/debug 합성은 `getTemplateHref`가 소유합니다. |
| Failure·absence·fallback 처리 | External false이면 외부 속성을 붙이지 않습니다. 이 commit에는 malformed URL, unsupported protocol, 빈 label을 거부하는 branch가 없습니다. |
| 보장하는 것과 보장하지 않는 것 | 내부·외부 link transport와 내부 query 보존 경로를 일관되게 만듭니다. 어떤 link를 보여 줄지는 보장하지 않고 caller가 children/className도 제공합니다. |
| 다음 commit 또는 관련 test 연결 | e37ea9c2819a 이후 모든 project action이 이 renderer를 통과합니다. 09cec616f314가 internal query와 external `target`/`rel`을 component test로 검증합니다. |
<!-- learner:commit-f63c978c71c9-record:end -->

#### 최소 코드 증거

<!-- learner:commit-f63c978c71c9-excerpt:start -->
- **Commit:** `f63c978c71c9`
- **Path:** `src/components/portfolio/content-link.tsx`
- **Location:** `ContentLinkView`

```tsx
if (link.external) {
  return (
    <a className={className} href={link.href} {...getExternalLinkProps(link)}>
      {children}
    </a>
  );
}

return (
  <Link
    className={className}
    href={getTemplateHref(link.href, homeTemplate, { contentDebug })}
  >
    {children}
  </Link>
);
```

이 발췌는 해당 SHA의 decision/state/ownership을 보여 주는 최소 부분입니다. 후속 commit의 코드는 섞지 않았습니다.
<!-- learner:commit-f63c978c71c9-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-f63c978c71c9-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
<!-- learner:commit-f63c978c71c9-execution:end -->

### 3. `e37ea9c2819a` — feat(project): 프로젝트 링크 그룹 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** detail action consumer

#### 해당 SHA에서 확인할 실제 코드

- 새 `src/components/portfolio/project-links.tsx`의 `ProjectLinks`와 local visibility predicate를 확인합니다.
- demo availability, `excludeCaseStudy`, empty result, `ContentLinkView` 호출을 각각 추적합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-e37ea9c2819a-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Project detail에서 project.links를 공통 transport renderer로 출력하는 action group이 없었습니다. |
| 실제 변경 file/symbol/call path | `ProjectLinks`가 project links를 filtering한 뒤 flex action group으로 렌더링합니다. demo는 `isProjectLive`, case-study는 prop에 따라 제외하고, 각 item은 `ContentLinkView`를 사용합니다. |
| Data/state/DOM/resource owner | 이 시점에는 detail component가 일부 visibility filtering을 소유합니다. Transport는 ContentLinkView가 소유합니다. |
| Failure·absence·fallback 처리 | 필터 결과가 비면 `null`입니다. Offline demo와 명시적으로 제외한 case-study는 DOM에 없습니다. |
| 보장하는 것과 보장하지 않는 것 | Detail action group을 재사용할 수 있게 하지만 placement는 아직 읽지 않고 filtering이 selector와 component에 나뉩니다. |
| 다음 commit 또는 관련 test 연결 | 2d87b62dcce8이 detail placement selection을 selector로 옮기고, 44e4d062da50이 list rendering을 합칩니다. |
<!-- learner:commit-e37ea9c2819a-record:end -->

#### 최소 코드 증거

<!-- learner:commit-e37ea9c2819a-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-e37ea9c2819a-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-e37ea9c2819a-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
<!-- learner:commit-e37ea9c2819a-execution:end -->

### 4. `1ef269fbdb49` — feat(project): 프로젝트 카드 링크 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** card action consumer

#### 해당 SHA에서 확인할 실제 코드

- `ProjectCardLinks`가 `getProjectCardLinks` 결과를 어떻게 렌더링하는지 확인합니다.
- `ProjectLinks`와 중복된 null branch, class selection, icon choice를 비교합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-1ef269fbdb49-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Detail action은 생겼지만 card가 selector의 card action 결과를 표현하는 wrapper는 없었습니다. |
| 실제 변경 file/symbol/call path | 같은 file에 `ProjectCardLinks`를 추가해 `getProjectCardLinks(project)` 결과를 `ContentLinkView`로 렌더링했습니다. |
| Data/state/DOM/resource owner | Card visibility는 selector, DOM/class/icon은 wrapper가 소유하지만 detail wrapper와 markup 책임이 중복됩니다. |
| Failure·absence·fallback 처리 | 빈 배열이면 `null`입니다. Demo primary styling과 external/internal icon 분기는 rendering에서 처리됩니다. |
| 보장하는 것과 보장하지 않는 것 | Card consumer를 연결하지만 content-authored placement는 아직 반영하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | daa6815a6dfa가 card selector를 placement 기반으로 바꾸고, 44e4d062da50이 중복 list renderer를 제거합니다. |
<!-- learner:commit-1ef269fbdb49-record:end -->

#### 최소 코드 증거

<!-- learner:commit-1ef269fbdb49-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-1ef269fbdb49-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-1ef269fbdb49-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
<!-- learner:commit-1ef269fbdb49-execution:end -->

### 5. `daa6815a6dfa` — feat(project): 카드 링크를 콘텐츠 배치 기준으로 선택

- **Importance:** B
- **Tags:** CONTENT, RENDERER
- **Thread 역할:** card placement 적용

#### 해당 SHA에서 확인할 실제 코드

- `getProjectCardLinks`의 기존 type whitelist와 새 `placements.includes("card")` gate를 비교합니다.
- Placement를 통과한 demo와 non-demo가 각각 어떤 추가 조건을 거치는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-daa6815a6dfa-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Card links는 demo/github/case-study라는 hard-coded type 집합으로 선택되어 content가 같은 type을 특정 surface에서 숨기거나 다른 type을 card에 배치할 수 없었습니다. |
| 실제 변경 file/symbol/call path | Selector가 먼저 `link.placements?.includes("card")`를 요구합니다. Demo만 기존 live 판정을 추가로 통과하고, placement가 card인 다른 type은 허용합니다. |
| Data/state/DOM/resource owner | Content가 placement 의도를 소유하고 selector가 placement와 runtime availability를 결합합니다. Card component는 결과를 그대로 소비합니다. |
| Failure·absence·fallback 처리 | placements가 없거나 card를 포함하지 않으면 제외됩니다. Placement가 있어도 non-live demo는 제외됩니다. |
| 보장하는 것과 보장하지 않는 것 | Type whitelist보다 content-authored placement를 우선하는 card 정책을 보장합니다. 다른 surface의 generic selector는 아직 없습니다. |
| 다음 commit 또는 관련 test 연결 | 119ff9a92090이 placement type과 generic selector를 도입해 이 결정을 card/detail/site로 일반화합니다. |
<!-- learner:commit-daa6815a6dfa-record:end -->

#### 최소 코드 증거

<!-- learner:commit-daa6815a6dfa-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-daa6815a6dfa-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-daa6815a6dfa-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
<!-- learner:commit-daa6815a6dfa-execution:end -->

### 6. `119ff9a92090` — feat(content): 링크 배치 selector 추가

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** placement vocabulary 일반화

#### 해당 SHA에서 확인할 실제 코드

- `LinkPlacement` union과 `getProjectLinksForPlacement`, card/detail wrapper, site-link placement selector를 확인합니다.
- Source array order가 filter 결과에서도 유지되는지와 placement absence가 어떻게 처리되는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-119ff9a92090-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Card만 placement를 직접 읽고 detail·site consumer는 별도 규칙을 유지해 surface vocabulary와 선택 책임이 분산되어 있었습니다. |
| 실제 변경 file/symbol/call path | `hero`, `contact`, `card`, `detail`, `footer` placement vocabulary와 generic filter를 추가하고 card/detail wrapper 및 site content selector를 만들었습니다. |
| Data/state/DOM/resource owner | Placement membership의 공통 해석은 selector가 소유하고, 각 wrapper는 surface 이름만 고정합니다. |
| Failure·absence·fallback 처리 | Optional placements가 없으면 generic filter에서 제외됩니다. Runtime demo availability는 surface wrapper/consumer가 추가로 처리해야 합니다. |
| 보장하는 것과 보장하지 않는 것 | 모든 surface가 같은 placement vocabulary를 사용할 기반을 보장하지만 consumer migration은 아직 끝나지 않았습니다. |
| 다음 commit 또는 관련 test 연결 | 2d87b62dcce8은 detail consumer를 selector로 이동하고, ee2c118a76d6은 hero consumer가 동일 placement vocabulary를 direct predicate로 채택하게 합니다. |
<!-- learner:commit-119ff9a92090-record:end -->

#### 최소 코드 증거

<!-- learner:commit-119ff9a92090-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-119ff9a92090-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-119ff9a92090-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
<!-- learner:commit-119ff9a92090-execution:end -->

### 7. `2d87b62dcce8` — refactor(project): 상세 링크를 배치 기준으로 선택

- **Importance:** B
- **Tags:** RENDERER, REFACTOR
- **Thread 역할:** detail selector migration

#### 해당 SHA에서 확인할 실제 코드

- `ProjectLinks`가 raw `project.links` 대신 `getProjectDetailLinks(project)`를 호출하도록 바뀐 부분을 확인합니다.
- Placement selection 후에도 `excludeCaseStudy`와 demo live check가 어느 layer에 남는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-2d87b62dcce8-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Detail wrapper가 raw link array에서 자체 filtering하여 detail placement를 반영하지 않았습니다. |
| 실제 변경 file/symbol/call path | 입력 array를 `getProjectDetailLinks(project)` 결과로 교체하고, case-study 제외 option과 demo live check는 component에 유지했습니다. |
| Data/state/DOM/resource owner | Selector가 detail membership을 소유하고 component가 caller option 및 runtime presentation filtering을 소유합니다. |
| Failure·absence·fallback 처리 | Detail placement가 없는 link는 component에 도달하지 않습니다. Empty result는 기존 null branch로 이어집니다. |
| 보장하는 것과 보장하지 않는 것 | Detail surface가 content placement를 따르게 하지만 demo filtering이 완전히 selector로 이동한 것은 아닙니다. |
| 다음 commit 또는 관련 test 연결 | 09cec616f314가 detail source order와 filtering을 검증하고, 44e4d062da50이 rendering 중복만 정리합니다. |
<!-- learner:commit-2d87b62dcce8-record:end -->

#### 최소 코드 증거

<!-- learner:commit-2d87b62dcce8-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-2d87b62dcce8-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-2d87b62dcce8-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
<!-- learner:commit-2d87b62dcce8-execution:end -->

### 8. `ee2c118a76d6` — feat(content): 홈 링크를 배치 기준으로 선택

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** hero consumer migration

#### 해당 SHA에서 확인할 실제 코드

- Classic/Design home route에서 hard-coded link type filter가 hero placement filter로 교체된 diff를 확인합니다.
- 두 design route가 같은 content contract를 읽되 각 route의 presentation markup은 유지되는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-ee2c118a76d6-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | 홈 hero는 github/resume/website type을 코드에 직접 열거해 content placement와 분리되어 있었습니다. |
| 실제 변경 file/symbol/call path | 두 home implementation이 `link.placements?.includes("hero")`를 사용하도록 변경됐습니다. |
| Data/state/DOM/resource owner | Content가 hero membership을 선언하고 각 design route가 그 placement predicate와 layout·styling을 직접 적용합니다. 이 시점에는 hero selection owner가 selector로 이동하지 않았습니다. |
| Failure·absence·fallback 처리 | Hero placement가 없는 link는 type과 무관하게 제외됩니다. 이 commit은 generic site selector를 호출하지 않고 동일 predicate를 두 route에 둡니다. |
| 보장하는 것과 보장하지 않는 것 | 홈 link set이 content placement를 따르게 합니다. Footer/contact migration이나 transport 변경은 포함하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | 후속 refactor 대상은 남지만, 09cec616f314의 project-link tests와 별개로 home consumer behavior는 이 commit에 dedicated test가 없습니다. |
<!-- learner:commit-ee2c118a76d6-record:end -->

#### 최소 코드 증거

<!-- learner:commit-ee2c118a76d6-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-ee2c118a76d6-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-ee2c118a76d6-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
<!-- learner:commit-ee2c118a76d6-execution:end -->

### 9. `09cec616f314` — test(ui): 디자인 선택과 프로젝트 링크 계약 검증

- **Importance:** A
- **Tags:** VALIDATION, TEST
- **Thread 역할:** 결정적 component contract 검증

#### 해당 SHA에서 확인할 실제 코드

- `src/components/portfolio/project-links.test.tsx`의 fixtures와 assertion을 production selector/renderer path별로 매핑합니다.
- Internal URL의 `view`·`debug`, external `target`·`rel`, offline demo, case-study exclusion, card placement, empty DOM을 구분합니다.
- 같은 commit의 `design-switcher.test.tsx`가 native details close/focus를 검증하지만 이 Thread에서는 link contract와의 경계만 기록합니다.
- JSDOM component test가 실제 navigation·browser security·network response를 증명하지 않는다는 한계를 명시합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-09cec616f314-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Placement와 transport 규칙은 구현돼 있었지만 source order, query preservation, external attributes, absence branches를 한 번에 깨뜨리지 못하게 하는 deterministic regression evidence가 없었습니다. |
| 실제 변경 file/symbol/call path | Testing Library로 production components를 렌더링합니다. Detail links는 source order와 내부/외부 속성을 검사하고, offline demo·case-study exclusion을 재현합니다. Card links는 card placement가 아닌 source link를 제외하며, 모두 필터된 wrapper는 empty DOM임을 확인합니다. |
| Data/state/DOM/resource owner | Test fixture가 입력 상태를 소유하고 production selector/renderer가 실제 결과 DOM을 소유합니다. Assertion은 href/attributes/text/empty container를 관찰합니다. |
| Failure·absence·fallback 처리 | Failure injection 대신 content fixture의 deployment status, placements, exclude option을 조절하는 경계 테스트입니다. External navigation이나 target page 응답은 실행하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | 해당 SHA의 component-level contract를 결정적으로 고정합니다. Browser 새 창 isolation 전체, route transition, malformed content validation, CSS interaction은 증명하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | 44e4d062da50은 이 test contract를 유지하면서 중복 renderer를 추출합니다. Design-switcher test의 후속 hydration story는 08 Thread의 외부 관계 및 07 category가 소유합니다. |
<!-- learner:commit-09cec616f314-record:end -->

#### 최소 코드 증거

<!-- learner:commit-09cec616f314-excerpt:start -->
- **Commit:** `09cec616f314`
- **Path:** `src/components/portfolio/project-links.test.tsx`
- **Location:** `project link transport assertions`

```tsx
expect(links[0]).toHaveAttribute(
  "href",
  "/projects/sample-project?view=classic&debug=content",
);
expect(links[0]).not.toHaveAttribute("target");
expect(links[1]).toHaveAttribute("target", "_blank");
expect(links[1]).toHaveAttribute("rel", "noreferrer");
```

이 발췌는 해당 SHA의 decision/state/ownership을 보여 주는 최소 부분입니다. 후속 commit의 코드는 섞지 않았습니다.
<!-- learner:commit-09cec616f314-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-09cec616f314-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
<!-- learner:commit-09cec616f314-execution:end -->

### 10. `44e4d062da50` — refactor(ui): 프로젝트 링크 렌더링 중복 제거

- **Importance:** B
- **Tags:** VALIDATION, REFACTOR
- **Thread 역할:** 공용 list renderer 추출

#### 해당 SHA에서 확인할 실제 코드

- 새 local `ProjectLinkList`와 두 public wrapper의 before/after를 비교합니다.
- Empty branch, key, min-height, primary class, external/internal icon과 `ContentLinkView` props가 한 곳으로 이동했는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-44e4d062da50-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Detail/card wrapper가 같은 empty check, classes, key, icon, transport 호출을 복제해 한쪽만 변경될 위험이 있었습니다. |
| 실제 변경 file/symbol/call path | Local `ProjectLinkList`가 empty `null`과 item rendering을 소유하고 `ProjectLinks`·`ProjectCardLinks`는 selection만 수행해 links를 전달합니다. |
| Data/state/DOM/resource owner | Public wrapper는 surface-specific selection을, private list는 shared DOM representation을 소유합니다. |
| Failure·absence·fallback 처리 | 빈 배열은 공용 list에서 한 번 처리됩니다. 새 failure branch는 없으며 transport는 계속 ContentLinkView에 위임됩니다. |
| 보장하는 것과 보장하지 않는 것 | 09cec616f314에서 고정한 behavior를 유지하면서 duplicate markup을 제거합니다. 독립적인 new feature나 selector change는 아닙니다. |
| 다음 commit 또는 관련 test 연결 | Project action의 최종 layering은 content → selector → surface wrapper → ProjectLinkList → ContentLinkView입니다. Hero는 content placement를 route consumer가 직접 filtering한 뒤 ContentLinkView를 사용합니다. |
<!-- learner:commit-44e4d062da50-record:end -->

#### 최소 코드 증거

<!-- learner:commit-44e4d062da50-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-44e4d062da50-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-44e4d062da50-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
<!-- learner:commit-44e4d062da50-execution:end -->

## 6. Invariant ledger

<!-- learner:thread-ledger:start -->
| Invariant | 도입·변경 commit | 실제 code/test evidence | 부족함이 드러난 지점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| 가용성·외부 속성 중앙화 | ba8da56d3fcf | selectors.ts의 null/filter/live/external branch | placement가 없어 surface별 의미는 불완전 | 가용성과 transport input은 selector가 소유 |
| 내부/외부 transport 일원화 | f63c978c71c9 | ContentLinkView의 `<a>`/Next Link branch | visibility는 caller에 남음 | 모든 link DOM transport가 공용 renderer를 통과 |
| 배치 기반 노출 | daa6815a6dfa → 119ff9a92090 | card gate, LinkPlacement와 generic selector | consumer migration 필요 | card/detail/hero가 content placement를 따름 |
| 결정적 회귀 보호 | 09cec616f314 | project-links.test.tsx fixture/assertions | 브라우저 navigation·URL validation은 미검증 | source order·query·attributes·absence를 component level에서 고정 |
| 표현 중복 제거 | 44e4d062da50 | ProjectLinkList 추출 | surface selector는 의도적으로 별도 | selection과 rendering 책임이 분리 |
<!-- learner:thread-ledger:end -->

## 7. Failure → Fix → Test 관계

<!-- learner:thread-relations:start -->
| Failure/위험 | 실제 영향·root cause | Fix/결정 | Regression evidence 또는 공백 |
| --- | --- | --- | --- |
| Hard-coded type selection | Content placement를 표현할 수 없음 | daa6815a6dfa/119ff9a92090에서 placement selector 도입 | 09cec616f314이 card/detail filtering을 검증 |
| Internal/external rendering duplication 위험 | 외부 속성 또는 query 보존 불일치 가능 | f63c978c71c9에서 ContentLinkView 도입 | 09cec616f314이 transport attributes를 검증 |
| Detail/card markup duplication | 한 wrapper만 styling/null behavior가 달라질 수 있음 | 44e4d062da50에서 ProjectLinkList 추출 | 앞선 09cec616f314 contract가 behavior 기준 |
<!-- learner:thread-relations:end -->

## 8. Ownership·state·responsibility 변화

<!-- learner:thread-ownership:start -->
| 단계 | Owner | 책임 변화 |
| --- | --- | --- |
| 초기 | Raw content와 각 consumer | availability·transport·surface 규칙이 분산될 수 있음 |
| ba8/f63 | Selectors + ContentLinkView | 정책과 transport renderer가 분리됨 |
| daa/119/2d/ee | Content placements + selectors/hero consumers | card/detail은 selector가 해석하고 hero는 같은 placement predicate를 consumer가 직접 적용 |
| 44e4 최종 | Surface wrapper + ProjectLinkList + ContentLinkView | selection, shared DOM, transport가 단계별 owner를 가짐 |
<!-- learner:thread-ownership:end -->

## 9. 최종 Thread 상태

<!-- learner:thread-final-state:start -->
- Preferred contact와 project card/detail links는 content 원본에서 selector를 거쳐 파생되며, home hero는 route consumer가 content placement를 직접 filtering합니다.
- Card/detail/hero는 content placement를 따릅니다. Project demo는 card/detail visibility path에서 deployment live와 demo href 존재를 추가로 요구합니다.
- Surface wrapper는 선택된 배열과 local option만 처리하고, shared list가 empty·classes·icons를 처리합니다.
- ContentLinkView는 external anchor와 internal Next Link를 분기합니다.
- Malformed href, remote availability, 실제 browser navigation은 이 Thread가 보장하지 않습니다.
<!-- learner:thread-final-state:end -->

## 10. 최종 실행 흐름

<!-- learner:thread-flow:start -->
1. Content loader가 `ContentLink`와 project deployment/placement data를 제공합니다.
2. Card/detail은 selector가 placement와 availability를 적용해 source order를 보존한 배열을 만들고, hero consumer는 같은 `hero` placement predicate를 직접 적용합니다.
3. ProjectLinks 또는 ProjectCardLinks가 surface option을 적용합니다.
4. ProjectLinkList가 빈 배열이면 아무 DOM도 만들지 않고, 아니면 공통 action markup을 만듭니다.
5. ContentLinkView가 external이면 anchor 속성을, internal이면 template/debug가 보존된 app URL을 사용합니다.
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
