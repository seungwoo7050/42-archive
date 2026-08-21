# Development Thread 01 — Query State and Route-Preserving Navigation

## 0. Source and frozen audit scope

- Repository: `https://github.com/seungwoo7050/42-archive`
- Branch: `web/portfolio`
- Category: `02-routing-navigation-and-page-lifecycle`
- Change range for directed inspection: `902eddcef875^..b669e04c0932`
- Classification source: `commit/commit-importance.md` on `web/portfolio`
- Historical rule: inspect every commit at its exact SHA; do not project later code backward.
- Phase 1 status: audited and frozen before learner-facing completion.
- Thread boundary: URL query 해석과 내부 URL 변환 정책만 다룹니다. typed content link transport 자체는 Category 03의 독립 Thread이므로 `f63c978c71c9`를 이 Thread에서 제거했습니다.
- Execution note: source inspection and runtime command evidence must be recorded separately.

### Phase 1 audit decisions

- `f63c978c71c9`는 query helper의 consumer이지만 typed internal/external link transport를 소유하므로 Category 03으로 환원했습니다.
- `3353032ba23b`의 exact URL boundary test를 누락 보완했습니다.
- `b669e04c0932`를 후속 default-policy ownership correction으로 유지했습니다.

## 1. Learning goal and planned invariants

서버 route가 URL의 `view`/`debug` 상태를 해석하고, 내부 링크가 기존 query/hash와 configured default design 정책을 잃지 않도록 만드는 과정을 재구성합니다.

- 유효한 `view`만 선택되고 unknown/누락 값은 content에 설정된 기본 디자인으로 돌아갑니다.
- 배열형 `view`/`debug`는 첫 값만 사용합니다.
- 내부 root-relative URL만 변환하며 절대 URL과 protocol-relative URL은 그대로 둡니다.
- 기존 query/hash는 보존하고 기본 디자인의 불필요한 `view`는 제거할 수 있습니다.
- 기본 디자인 ownership은 최종적으로 switcher caller의 명시적 `defaultId`에 있습니다.

## 2. Questions to answer

- URL이 design/debug 상태의 source of truth가 된 정확한 SHA는 무엇입니까?
- 기본 디자인을 URL에 포함하거나 제거하는 결정은 어떤 입력에 의해 달라집니까?
- 왜 `URLSearchParams` 기반 재조립이 단순 문자열 연결보다 필요한가요?
- unit test가 증명하는 URL 계약과 실제 browser navigation이 별도로 남는 부분은 무엇입니까?
- 전역 기본값 의존을 explicit prop으로 바꾼 ownership 이동은 무엇을 제거합니까?

## 3. Completion criteria

- 네 commit을 정확한 chronology로 설명합니다.
- 각 SHA의 production 함수와 test assertion을 혼동하지 않습니다.
- 기본/비기본 design, debug, 기존 query/hash, external/protocol-relative URL의 결과를 설명합니다.
- `335303...`의 실행 여부를 source inspection과 구분해 기록합니다.
- `b669...`이 behavior rewrite가 아니라 default-policy ownership refactor인 이유를 설명합니다.

## 4. Fixed commit map

| # | Commit | Subject | Importance | Tags | Source-defined role |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `902eddcef875` | feat(navigation): 템플릿 URL과 쿼리 해석 추가 | A | ARCH, ROUTING | Introduce the canonical query-state utilities for selecting a home template, enabling content-debug mode, and constructing state-preserving internal URLs. |
| 2 | `f4233f024890` | feat(home): 쿼리 기반 디자인 전환 연결 | A | ARCH, ROUTING, RENDERER | Resolve the `view` and debug query parameters in the root page and dispatch to the classic or design home on the server. |
| 3 | `3353032ba23b` | test(content): Vitest 기반 콘텐츠 계약 검증 추가 | A | CONTENT, VALIDATION, TEST | Introduce an executable test boundary for the portfolio content model with Vitest, jsdom, and Testing Library support. |
| 4 | `b669e04c0932` | refactor(navigation): 디자인 전환 URL 기본값 명시 | A | ARCH, ROUTING, REFACTOR | Make the configured default design an explicit input to every design-switcher instance and generate switch links through `createTemplateHref`. |

The commit SHA, order, subject, importance, tags, and source-defined role in this map are frozen.

## 5. Commit-by-commit reconstruction

### 1. `902eddcef875` — feat(navigation): 템플릿 URL과 쿼리 해석 추가

- Importance: **A**
- Tags: `ARCH, ROUTING`
- Fixed role: Introduce the canonical query-state utilities for selecting a home template, enabling content-debug mode, and constructing state-preserving internal URLs.

#### Historical inspection tasks

- 부모 `7c95a6f387b4`와 비교해 `src/lib/portfolio/selectors.ts` 및 새 `src/lib/portfolio/template-href.ts`의 책임이 어디서 시작되는지 확인합니다.
- `resolveHomeTemplateId`, `resolveContentDebug`, `getTemplateHref`, `createTemplateHref`의 호출 관계와 배열 쿼리에서 첫 값만 사용하는 규칙을 추적합니다.
- `createTemplateHref`가 기존 query/hash를 분해하고 `URLSearchParams`로 `view`와 `debug`를 갱신한 뒤 재조립하는 순서를 적습니다.
- 상대 내부 경로, 절대 외부 URL, protocol-relative URL(`//...`), 기본 디자인, `alwaysInclude`, 기존 `view`, 기존 hash를 각각 대입해 보장과 비보장을 구분합니다.
- 이 SHA에는 실행 테스트가 추가되지 않았다는 점을 확인하고, 코드 inspection으로만 확정할 수 있는 범위를 적습니다.

#### Reconstruction result

**이전 상태와 문제**

부모 `7c95a6f387b4`에는 aggregate content loader와 selector들이 있었지만, route query를 해석하거나 내부 URL에 선택한 design/debug 상태를 다시 싣는 공통 정책은 없었습니다. 따라서 각 caller가 문자열을 직접 조립하면 기본 design 처리, 기존 query/hash 보존, 외부 URL 비변형 규칙이 서로 달라질 위험이 있었습니다.

**구현 결정과 실행 경로**

- `src/lib/portfolio/selectors.ts`
  - `resolveHomeTemplateId(value, presentation)`은 배열이면 첫 항목만 선택합니다.
  - 선택값이 `presentation.templates`에 실제로 존재할 때만 그 ID를 반환하고, 그 외에는 `presentation.defaultHomeTemplate`로 돌아갑니다.
  - `resolveContentDebug(value)`도 배열의 첫 값을 사용하며 정확히 `"content"`일 때만 `true`입니다.
  - `getTemplateHref(...)`는 content-owned default ID를 채워 `createTemplateHref(...)`에 위임합니다.
- `src/lib/portfolio/template-href.ts`
  - template ID가 없거나 href가 `/`로 시작하지 않거나 `//`로 시작하면 원문을 즉시 반환합니다.
  - hash를 먼저 떼고, 남은 값을 path/query로 분리한 뒤 `URLSearchParams`를 만듭니다.
  - 비기본 design 또는 `alwaysInclude`이면 `view`를 설정하고, 기본 design이면 기존 `view`를 삭제합니다.
  - `contentDebug`가 true일 때만 `debug=content`를 설정합니다.
  - 마지막에 path, query, hash를 원래 순서로 다시 결합합니다.

핵심 코드는 다음 정책입니다. 이 발췌는 이 commit의 `src/lib/portfolio/template-href.ts`에서 확인한 내용입니다.

```ts
if (!templateId || !href.startsWith("/") || href.startsWith("//")) {
  return href;
}

if (options.alwaysInclude || templateId !== defaultTemplateId) {
  params.set("view", templateId);
} else {
  params.delete("view");
}
```

**소유권과 실패 경계**

URL 변환 중 생성되는 `URLSearchParams`는 함수 호출 내부의 일시 객체이며 browser history나 전역 상태를 소유하지 않습니다. 잘못된 design 값은 예외가 아니라 configured default로 정규화됩니다. 반면 malformed URL 전체를 일반 URL parser로 검증하지는 않습니다. 이 helper의 입력 계약은 root-relative application href입니다.

**보장**

- 내부 URL의 기존 query와 hash를 보존하면서 `view`/`debug`만 정책적으로 갱신합니다.
- stale default `view`를 제거할 수 있습니다.
- 외부 절대 URL과 protocol-relative URL은 손대지 않습니다.
- repeated query의 route 해석은 첫 값에 고정됩니다.

**비보장과 후속 관계**

이 SHA에는 해당 helper를 실행하는 테스트가 없습니다. 따라서 이 절의 결과는 exact diff와 함수 코드 inspection으로 확정한 것이며 runtime 실행 결과가 아닙니다. 홈 route 소비는 `f4233f024890`, URL boundary regression은 `3353032ba23b`, default ownership 명시는 `b669e04c0932`에서 이어집니다.

### 2. `f4233f024890` — feat(home): 쿼리 기반 디자인 전환 연결

- Importance: **A**
- Tags: `ARCH, ROUTING, RENDERER`
- Fixed role: Resolve the `view` and debug query parameters in the root page and dispatch to the classic or design home on the server.

#### Historical inspection tasks

- `src/app/page.tsx`가 동기 컴포넌트에서 async route entry로 바뀐 지점을 부모와 비교합니다.
- `searchParams`를 await한 뒤 `resolveHomeTemplateId`와 `resolveContentDebug`를 호출하고 `ClassicHomeRoute` 또는 `DesignHomeRoute`로 분기하는 실행 순서를 추적합니다.
- 두 renderer에 전달되는 `templateSwitcher`의 `activeId`, `contentDebug`, `currentPath`, `templates`가 어떤 URL 상태를 다음 탐색으로 운반하는지 확인합니다.
- 이 commit이 홈 route만 연결하며 다른 route와 공용 shell의 상태 보존까지 보장하지는 않는다는 경계를 적습니다.

#### Reconstruction result

**이전 상태와 문제**

홈 entry는 content-backed 두 presentation을 가지고 있었지만 URL query가 어느 renderer를 선택하는지 결정하지 않았습니다. `902edd...`에서 helper가 생겼어도 route caller가 이를 사용하지 않으면 URL은 상태의 source of truth가 될 수 없었습니다.

**구현 경로**

`src/app/page.tsx`는 async page가 되고 `searchParams?: RouteSearchParams`를 받습니다. 실행 순서는 다음과 같습니다.

1. portfolio content를 읽습니다.
2. `searchParams`가 있으면 await하고, 없으면 빈 객체를 사용합니다.
3. `resolveHomeTemplateId(params.view, content.presentation)`으로 active template을 결정합니다.
4. `resolveContentDebug(params.debug)`으로 content hint 상태를 결정합니다.
5. active template이 `classic`이면 `ClassicHomeRoute`, 그 외에는 `DesignHomeRoute`를 server에서 선택합니다.
6. 두 renderer 모두 `templateSwitcher`에 같은 `activeId`, `contentDebug`, `currentPath: "/"`, template 목록을 받습니다.

이 결정은 client-side local state가 아니라 request URL에서 매 요청 재구성됩니다. renderer는 선택 결과를 소비하지만 query parsing ownership은 App Router page에 남습니다.

**보장**

- `/?view=classic`과 같은 요청은 server render 단계에서 classic renderer로 분기합니다.
- unknown/누락 `view`는 `902edd...`의 default fallback 정책을 따릅니다.
- debug 상태와 active template이 홈의 후속 design navigation에 전달됩니다.

**비보장**

이 시점의 연결 범위는 root page뿐입니다. `/projects`, About, Resume, Contact 같은 후속 route나 공용 shell 전체의 링크가 같은 상태를 보존한다고 말할 수 없습니다. 또한 이 commit에는 route test가 추가되지 않았습니다. 실제 browser navigation 결과가 아니라 route code와 diff로 확인한 구조입니다.

### 3. `3353032ba23b` — test(content): Vitest 기반 콘텐츠 계약 검증 추가

- Importance: **A**
- Tags: `CONTENT, VALIDATION, TEST`
- Fixed role: Introduce an executable test boundary for the portfolio content model with Vitest, jsdom, and Testing Library support.

#### Historical inspection tasks

- `package.json`, `vitest.config.ts`, `src/test/setup.ts`, `src/lib/portfolio.test.ts`를 확인해 테스트 실행 경계와 jsdom 환경을 재구성합니다.
- `propagates designs and debug state on internal links only` 테스트가 기본 디자인의 `view` 제거, 비기본 디자인 추가, 기존 query/hash 보존, `alwaysInclude`, `debug=content` 전파를 어떤 기대값으로 검증하는지 적습니다.
- 절대 URL과 `//` URL을 그대로 두는 assertion이 어느 production 함수 경로를 통과하는지 확인합니다.
- 이 테스트가 URL 문자열 생성의 결정적 unit/boundary evidence라는 점과 실제 Next.js navigation, browser history, click 동작을 증명하지 않는다는 점을 구분합니다.

#### Reconstruction result

**검증 대상과 기법**

이 commit은 Vitest, jsdom, Testing Library를 프로젝트에 도입한 넓은 content-contract test boundary입니다. 이 Thread와 직접 관련된 부분은 `src/lib/portfolio.test.ts`의 내부 URL 생성 테스트입니다. production 경로는 public portfolio facade가 노출하는 `getTemplateHref`/selector를 통해 `createTemplateHref`에 도달합니다.

`propagates designs and debug state on internal links only` 계열 assertion은 다음 경계를 고정합니다.

| 입력 범주 | 기대 |
| --- | --- |
| 비기본 design | `/projects?view=<id>` |
| configured default `editorial` | 불필요한 `view` 없음 |
| 기존 query와 hash | `page=2`와 `#featured` 유지 |
| stale `view=classic` + default 선택 | 기존 `view` 삭제 |
| `alwaysInclude` | 기본 design도 명시 |
| `contentDebug: true` | `debug=content` 추가 |
| `https://example.com/...` | 원문 유지 |
| `//example.com/...` | 원문 유지 |

**무엇을 증명하는가**

이것은 pure URL transformation에 대한 결정적 unit/boundary regression입니다. 문자열 입력과 출력이 고정되어 있어 기본값 제거, query/hash 보존, 내부/외부 경계의 회귀를 빠르게 찾습니다. 특히 external URL이 application query로 오염되지 않는 것을 직접 assertion합니다.

**무엇을 증명하지 않는가**

- Next.js `Link` click이 실제로 browser history를 갱신하는지
- back/forward navigation에서 상태가 복원되는지
- 모든 route component가 helper를 빠짐없이 사용하는지
- hydration 또는 mobile interaction이 정상인지

이 환경에서는 repository checkout과 dependency 설치가 불가능해 이 테스트를 실행하지 않았습니다. 확인한 것은 exact SHA의 test source와 assertion이며, 실행 성공을 주장하지 않습니다.

**후속 관계**

이 test는 당시 configured default인 `editorial`을 기준으로 helper behavior를 고정합니다. `b669e04c0932`가 caller-owned `defaultId`를 명시화할 때 test fixture는 새 prop 계약에 맞게 갱신되지만, 이 commit 자체가 임의의 대체 default configuration까지 증명하는 것은 아닙니다.

### 4. `b669e04c0932` — refactor(navigation): 디자인 전환 URL 기본값 명시

- Importance: **A**
- Tags: `ARCH, ROUTING, REFACTOR`
- Fixed role: Make the configured default design an explicit input to every design-switcher instance and generate switch links through `createTemplateHref`.

#### Historical inspection tasks

- 부모 상태에서 `DesignSwitcher`가 `getTemplateHref`를 통해 모듈 전역 기본값에 결합되어 있던 경로를 확인합니다.
- `src/components/portfolio/design-switcher.tsx`, `site-shell.tsx`, `src/designs/*`, `src/lib/portfolio/page-context.ts`에서 `defaultId`가 생성되어 모든 switcher instance까지 전달되는 경로를 추적합니다.
- `getTemplateHref` 대신 `createTemplateHref`를 직접 호출하면서 `defaultId`가 URL 포함/제거 정책의 명시적 입력이 된 이유를 설명합니다.
- 수정된 테스트 fixture가 새 필수 prop을 제공하는지 확인하고, 대체 기본값에 대한 새로운 독립 assertion이 실제로 추가됐는지 여부를 구분합니다.
- 동작을 보존하는 refactor와 숨은 기본값 ownership 이전을 각각 적습니다.

#### Reconstruction result

**이전 가정과 결합 문제**

초기 `getTemplateHref`는 portfolio module이 아는 `presentation.defaultHomeTemplate`을 내부에서 사용했습니다. 단일 aggregate만 소비할 때는 편리하지만, switcher가 전달받은 template 집합과 URL helper가 참조하는 default source가 암묵적으로 같다는 가정이 생깁니다. renderer/view-model 경계가 커진 뒤에는 caller가 가진 presentation의 default와 module-global default가 달라도 type이나 call signature가 이를 드러내지 못합니다.

**수정된 결정**

- switcher prop에 `defaultId`가 추가됩니다.
- `PageShell`, shared/design-specific shells, page-context 준비 경로가 `content.presentation.defaultHomeTemplate`을 switcher까지 전달합니다.
- `DesignSwitcher`는 facade `getTemplateHref` 대신 lower-level `createTemplateHref(currentPath, design.id, defaultId, options)`를 호출합니다.
- 모든 switcher instance가 URL 포함/제거 정책에 필요한 default를 명시적으로 제공합니다.

결과적으로 active design 목록, current path, debug 상태, default policy를 같은 caller-owned presentation context가 제공합니다. URL helper는 더 이상 어느 portfolio aggregate가 기본값을 소유하는지 추측하지 않습니다.

**소유권 이전**

| 이전 | 이후 |
| --- | --- |
| portfolio module 내부의 암묵적 default | switcher caller가 전달하는 `defaultId` |
| helper가 전역 content와 결합 | pure helper가 명시적 인자를 소비 |
| call site만 봐서는 default 정책 불명 | prop chain에서 default source 추적 가능 |

**보장과 비보장**

동일한 current configuration에서는 기존 URL 결과를 유지하면서 dependency를 드러냅니다. test fixture들은 새 필수 prop을 제공하도록 수정되었습니다. 그러나 diff에서 별도의 “default를 다른 ID로 바꾼 경우” 전용 assertion이 새로 추가된 것은 확인되지 않았습니다. 따라서 alternate-default behavior는 `createTemplateHref` 구현과 explicit propagation으로 inspection했으며 새 runtime regression 결과로 과장하지 않습니다.

이 commit은 `902edd...`의 canonical URL 정책을 폐기하지 않습니다. 오히려 그 정책의 마지막 숨은 입력을 caller ownership으로 이동시킨 refactor입니다.

## 6. Invariant evolution

Record where each invariant was introduced, extended, shown insufficient, corrected, and verified.

| 단계 | 상태 | 근거 |
| --- | --- | --- |
| 도입 | URL query 해석과 내부 href 변환을 canonical helper로 통합 | `902eddcef875` |
| route 연결 | root page가 request query로 renderer를 server dispatch | `f4233f024890` |
| 결정적 검증 | default 제거, query/hash 보존, external 비변형을 unit assertion | `3353032ba23b` |
| ownership 보정 | configured default를 caller가 `defaultId`로 명시 | `b669e04c0932` |

최종 invariant는 “URL이 design/debug 상태의 source of truth이며, URL 변환에 필요한 default 정책까지 현재 presentation context가 명시적으로 제공한다”입니다.

## 7. Failure → Fix → Test relationships

Connect fixes and tests to the exact earlier assumption or implementation they correct or verify.

- **Failure risk → Test:** 문자열 조립이 stale `view`, hash 손실, external URL 오염을 만들 수 있는 위험을 `335303...`의 table-like URL assertions가 막습니다.
- **Hidden assumption → Refactor:** `getTemplateHref`가 module-global default와 caller default가 같다고 가정하던 결합을 `b669...`가 explicit `defaultId`로 제거합니다.
- **검증 공백:** `b669...` 뒤 alternate default configuration을 독립적으로 실행하는 새 assertion은 확인되지 않았습니다. 기존 helper tests와 prop fixture update가 있지만, 이 ownership 보정 전체를 runtime으로 검증했다고 쓰지 않습니다.

## 8. Ownership, state, and responsibility changes

Track caller/callee ownership, browser/framework state, resource lifetime, and boundaries that deliberately remain outside the Thread.

| 책임 | 초기 | 최종 |
| --- | --- | --- |
| query parsing | 없음/route별 미연결 | App Router page가 helper 호출 |
| valid design 결정 | 없음 | `resolveHomeTemplateId` |
| debug 결정 | 없음 | `resolveContentDebug` |
| 내부 URL 변환 | caller별 문자열 위험 | `createTemplateHref` |
| configured default | helper 내부 aggregate 의존 | switcher caller의 `defaultId` |
| browser history | 이 Thread가 소유하지 않음 | 여전히 Next/browser 소유 |

## 9. Final Thread state

- root-relative internal href는 기존 query/hash를 유지하면서 design/debug 상태를 정규화합니다.
- unknown design은 configured default로 복귀합니다.
- default design은 필요하지 않으면 URL에서 제거되고, switcher처럼 명시가 필요한 caller는 `alwaysInclude`를 사용할 수 있습니다.
- 외부 및 protocol-relative URL은 변형하지 않습니다.
- runtime 실행 증거는 기록하지 않았습니다. exact commit code와 test source를 inspection했습니다.

## 10. Final architecture or execution flow

1. App Router page가 request `searchParams`를 await합니다.
2. `resolveHomeTemplateId`와 `resolveContentDebug`가 배열 첫 값과 configured presentation을 기준으로 상태를 정규화합니다.
3. server page가 active renderer를 선택합니다.
4. navigation caller는 current path, target design, explicit default ID, debug 옵션을 `createTemplateHref`에 전달합니다.
5. helper는 내부 URL만 query/hash-preserving 방식으로 다시 만들고 `Link` 또는 anchor consumer에 돌려줍니다.

## 11. Learning-completion checks

- [x] 네 SHA의 subject, importance, tags, order를 frozen scaffold와 일치시켰습니다.
- [x] `f63c...`를 typed link transport story로 분리한 이유를 설명했습니다.
- [x] production code와 `335303...` test source를 구분했습니다.
- [x] runtime test를 실행하지 않았다는 제한을 명시했습니다.
- [x] 기본값 ownership이 `b669...`에서 이동하는 과정을 연결했습니다.
