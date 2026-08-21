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

> **학습자 작성란:** [[LEARNER:commit:902eddcef875]]

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

> **학습자 작성란:** [[LEARNER:commit:f4233f024890]]

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

> **학습자 작성란:** [[LEARNER:commit:3353032ba23b]]

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

> **학습자 작성란:** [[LEARNER:commit:b669e04c0932]]

## 6. Invariant evolution

Record where each invariant was introduced, extended, shown insufficient, corrected, and verified.

> **학습자 작성란:** [[LEARNER:thread:1:invariants]]

## 7. Failure → Fix → Test relationships

Connect fixes and tests to the exact earlier assumption or implementation they correct or verify.

> **학습자 작성란:** [[LEARNER:thread:1:relations]]

## 8. Ownership, state, and responsibility changes

Track caller/callee ownership, browser/framework state, resource lifetime, and boundaries that deliberately remain outside the Thread.

> **학습자 작성란:** [[LEARNER:thread:1:ownership]]

## 9. Final Thread state

> **학습자 작성란:** [[LEARNER:thread:1:final]]

## 10. Final architecture or execution flow

> **학습자 작성란:** [[LEARNER:thread:1:flow]]

## 11. Learning-completion checks

> **학습자 작성란:** [[LEARNER:thread:1:checks]]
