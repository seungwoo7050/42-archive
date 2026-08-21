# Thread: Release performance gates

> Project: 42 Archive Portfolio (`web/portfolio`)
>
> 이 문서는 원본 Development Thread를 변경하지 않고, 같은 branch history에 product-delivery 관점을 추가한 확장 workbook입니다.

## 0. 분류 출처와 변경 가능 범위

- Commit SHA, subject, importance, tags는 `commit/commit-importance.md`의 branch-scoped 분류를 사용합니다.
- Phase 1 audit에서 category/thread grouping과 commit set을 실제 history에 대조한 뒤 이 문서를 freeze했습니다.
- Phase 2는 freeze된 구조와 fixed metadata를 바꾸지 않고 learner-facing 기록만 완성합니다.
- 다른 branch의 구현이나 final HEAD를 과거 SHA 설명에 소급하지 않습니다.
- 실행하지 않은 build/test/CI/Docker 결과는 exact-SHA source inspection과 구분합니다.

## 1. Thread 목표

webpack production output에서 route별 client JS/CSS를 계측하고 reviewable baseline에 대해 fail-closed budget을 적용한 뒤, production server의 desktop Lighthouse matrix와 함께 CI release gate로 승격하는 과정을 복원합니다.

### 계획된 핵심 invariant

- route asset measurement는 source 추정치가 아니라 webpack production manifests와 실제 asset file size를 사용합니다.
- routine `bundle:check`는 committed baseline을 읽기만 하며, baseline 갱신은 별도 explicit command입니다.
- baseline route 누락, 새 route의 baseline 부재, route별 JS/CSS 5% 초과는 모두 violation입니다.
- Lighthouse는 production server에서 5 designs × home/project-detail × 3 desktop runs를 median으로 평가합니다.
- CI는 production build output을 재사용해 standalone, bundle budget과 desktop Lighthouse threshold를 차례로 요구합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- generated client-reference manifest를 JavaScript로 실행하지 않고 JSON payload만 추출하는 parser boundary는 무엇인가?
- shared JS, route JS, non-inlined CSS와 duplicate asset을 어떤 규칙으로 byte accounting하는가?
- baseline creation과 routine check를 분리하지 않으면 어떤 self-approval failure가 생기는가?
- Lighthouse gate의 URL matrix, aggregation, threshold와 browser executable ownership은 어디에 고정되는가?
- committed lab result는 실제 CI gate인가, observation artifact인가, 또는 둘의 조합인가?

## 3. 완료 기준

- 각 SHA의 parent diff와 resulting tree에서 실제 변경 file, function, config, script와 workflow step을 확인했습니다.
- Source, generated artifact, CI gate, container/runtime owner를 구분했습니다.
- Missing artifact, portability failure, threshold violation, startup failure와 cleanup branch를 기록했습니다.
- Test/CI command의 technique, production path, proves/does-not-prove와 실제 실행 여부를 구분했습니다.
- 최종 product-delivery 흐름과 cross-thread handoff를 코드 없이 설명할 수 있습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | 확장 thread에서 확인할 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `c2fb8a7c238d` | fix(perf): webpack route manifest parser 보강 | A | ARCH, ROUTING, PERF | generated-output trust boundary — webpack client-reference wrapper에서 JSON payload만 안전하게 추출합니다. |
| 2 | `c24c350ce42c` | test(build): compiler와 manifest parser 계약 검증 | A | VALIDATION, DEPLOY, TEST | deterministic contract test — webpack build script와 generated wrapper parser fixture를 함께 고정합니다. |
| 3 | `605b64512edf` | build(perf): route별 client asset 측정 추가 | A | ARCH, ROUTING, PERF | production measurement — app paths와 client-reference manifests를 join해 route별 uncompressed JS/CSS bytes를 계산합니다. |
| 4 | `518ff5b51ec5` | build(perf): route bundle 성장 예산 평가 추가 | A | ARCH, ROUTING, PERF | pure policy evaluator — committed route coverage와 JS/CSS별 최대 5% 성장을 structured violations로 판정합니다. |
| 5 | `57a1b0876941` | build(perf): bundle budget CLI 연결 | B | PERF, DEPLOY | operational split — baseline write와 routine check를 별도 package commands로 노출합니다. |
| 6 | `6ac1ea4b5055` | chore(perf): route bundle 기준값 기록 | B | ROUTING, PERF | reviewable operational state — 여덟 public route pattern의 accepted uncompressed byte baseline을 commit합니다. |
| 7 | `1529ccf225c1` | build(perf): desktop Lighthouse 실행 경계 추가 | A | PERF, DEPLOY | production lab gate definition — 10 URL desktop matrix, median aggregation과 release thresholds를 설정합니다. |
| 8 | `f1c72dfdd16a` | build(perf): Lighthouse 결과 요약기 추가 | B | PERF, DEPLOY | measurement provenance — raw LHRs를 URL별 runs/median과 execution environment를 가진 JSON으로 요약합니다. |
| 9 | `4e8f95249481` | test(perf): 배포 성능 gate 규칙 검증 | A | VALIDATION, PERF, TEST | policy regression suite — compiler/parser assertions를 보존하며 Lighthouse matrix와 budget arithmetic을 검증합니다. |
| 10 | `abbd530368a0` | ci: 검증된 bundle과 Lighthouse gate 활성화 | A | VALIDATION, PERF, DEPLOY | release integration — production build output에 standalone, bundle와 Lighthouse checks를 순차 적용합니다. |
| 11 | `a39856cf734a` | chore(perf): 최종 lab 성능 측정 결과 기록 | C | PERF | generated evidence snapshot — desktop enforced matrix와 별도 mobile observation의 측정 결과를 환경과 함께 보존합니다. |

## 5. Commit별 학습 기록

각 section은 반드시 해당 SHA의 tree와 parent diff를 기준으로 작성합니다. 다른 Thread의 later commit은 관계 설명에만 사용하고 과거 구현에 소급하지 않습니다.

### 1. `c2fb8a7c238d` — fix(perf): webpack route manifest parser 보강

- **Full SHA:** `c2fb8a7c238d355c717a14359ef805fb9cc7f6f7`
- **Importance:** A
- **Tags:** ARCH, ROUTING, PERF
- **확장 thread에서의 역할:** generated-output trust boundary — webpack client-reference wrapper에서 JSON payload만 안전하게 추출합니다.

#### 해당 SHA에서 확인할 실제 코드

- parent에는 `scripts/route-budgets.mjs`가 없다는 사실을 확인해, subject의 `fix`를 이전 branch implementation 수정으로 오해하지 않습니다.
- `parseClientReferenceManifest`의 assignment regex, source slicing, semicolon requirement와 `JSON.parse` 호출 순서를 추적합니다.
- ordinary route와 `[...]` dynamic key가 regex에서 어떻게 처리되는지 후속 test fixture와 연결합니다.
- missing assignment/terminator와 malformed JSON이 filename을 포함한 error 또는 JSON parse failure로 닫히는지 확인합니다.

확인 원칙:

- 먼저 `c2fb8a7c238d^`와 `c2fb8a7c238d`를 비교하고, 필요한 file은 `c2fb8a7c238d:<path>`의 resulting tree에서 읽습니다.
- Final HEAD의 workflow, script, Dockerfile 또는 generated output을 이 commit에 소급하지 않습니다.
- Commit subject나 body만으로 behavior를 추정하지 않고 실제 changed code/test/config를 기준으로 판단합니다.
- 실제 실행하지 않은 command 결과는 code inspection과 분리합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 전달 상태와 부족함 | parent에는 route budget script나 manifest parser가 없습니다. commit body가 지적하는 위험은 generated JavaScript wrapper를 plain JSON으로 취급하거나 평가하는 접근이며, branch에서 그런 이전 implementation이 실제 commit돼 있었다고 볼 근거는 없습니다. |
| 실제 변경 file/symbol/command/artifact | `scripts/route-budgets.mjs`와 declaration file을 추가했습니다. parser는 `globalThis.__RSC_MANIFEST[...] =` assignment를 line break를 포함해 찾고, 뒤 serialized value를 slice한 뒤 terminating semicolon을 요구해 제거하고 `JSON.parse`합니다. |
| Build/runtime/resource owner와 lifetime | generated source 해석의 owner가 ad hoc caller가 아니라 pure parser function으로 모입니다. source string/filename은 caller가 소유하고 parser는 새 object를 반환하며 global state를 실행·변경하지 않습니다. |
| Failure·missing output·cleanup 처리 | assignment가 없거나 semicolon로 끝나지 않으면 filename을 포함한 custom error가 발생합니다. payload가 JSON이 아니면 `JSON.parse` error가 전파됩니다. regex가 future Next output wrapper 형식을 이해하지 못해도 measurement를 계속하지 않고 실패합니다. |
| 보장하는 것과 보장하지 않는 것 | expected webpack wrapper에서는 value만 JSON으로 해석하며 `eval`하지 않습니다. 모든 future manifest syntax, semantic schema validation, asset existence와 route accounting은 아직 보장하지 않습니다. |
| 다음 delivery commit 또는 관련 test 연결 | `c24c350ce42c`이 compact/dynamic fixtures를 고정하고, `605b64512edf`가 actual build manifest collector에서 이 parser를 호출합니다. |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** Parent에는 두 `route-budgets` files와 parser가 없습니다.
- **해당 SHA 핵심 코드:** `c2fb8a7c238d355c717a14359ef805fb9cc7f6f7` · `scripts/route-budgets.mjs — parseClientReferenceManifest`

```text
const assignment =
  /globalThis\.__RSC_MANIFEST\[[\s\S]+?\]\s*=\s*/.exec(source);
const serialized = assignment
  ? source.slice(assignment.index + assignment[0].length).trim()
  : "";

if (!assignment || !serialized.endsWith(";")) {
  throw new Error(`Cannot parse client reference manifest: ${filename}`);
}

return JSON.parse(serialized.slice(0, -1));
```

- **관찰 근거의 성격:** Exact-SHA new parser implementation과 parent absence를 직접 확인했습니다.
- **실행·테스트 증거:** 실행하지 않음. 현재 작업 환경에서는 `web/portfolio`의 Git checkout, npm dependency tree, Chromium 및 Docker daemon을 사용할 수 없었습니다. GitHub connector로 해당 SHA의 commit diff와 resulting source를 검사했으며, command 성공 결과는 주장하지 않습니다.
- **다음 commit 연결:** `c24c350ce42c`이 compact/dynamic fixtures를 고정하고, `605b64512edf`가 actual build manifest collector에서 이 parser를 호출합니다.

### 2. `c24c350ce42c` — test(build): compiler와 manifest parser 계약 검증

- **Full SHA:** `c24c350ce42cdbfe35eff3c6dd3bebc62ab132aa`
- **Importance:** A
- **Tags:** VALIDATION, DEPLOY, TEST
- **확장 thread에서의 역할:** deterministic contract test — webpack build script와 generated wrapper parser fixture를 함께 고정합니다.

#### 해당 SHA에서 확인할 실제 코드

- `src/performance/build-manifest-contract.test.ts`가 `package.json`을 실제로 require해 exact build string을 검사하는지 확인합니다.
- compact ordinary route fixture와 square bracket가 중첩된 dynamic route fixture를 parser에 직접 전달하는 test technique를 기록합니다.
- fixture가 actual `.next` file을 읽는 integration test가 아니라 pure parser/config contract라는 점을 구분합니다.
- parser가 malformed input, semicolon absence 또는 actual asset accounting을 이 SHA에서 test하는지 확인합니다.

확인 원칙:

- 먼저 `c24c350ce42c^`와 `c24c350ce42c`를 비교하고, 필요한 file은 `c24c350ce42c:<path>`의 resulting tree에서 읽습니다.
- Final HEAD의 workflow, script, Dockerfile 또는 generated output을 이 commit에 소급하지 않습니다.
- Commit subject나 body만으로 behavior를 추정하지 않고 실제 changed code/test/config를 기준으로 판단합니다.
- 실제 실행하지 않은 command 결과는 code inspection과 분리합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 전달 상태와 부족함 | webpack build command와 parser는 존재했지만 compiler flag 제거 또는 dynamic route key handling regression을 결정적으로 잡는 test가 없었습니다. |
| 실제 변경 file/symbol/command/artifact | `src/performance/build-manifest-contract.test.ts`를 추가해 `packageJson.scripts.build === "next build --webpack"`을 요구합니다. ordinary `/about/page`와 `/projects/[projectId]/page` wrapper string을 parser에 넣고 expected object를 비교합니다. |
| Build/runtime/resource owner와 lifetime | Vitest가 package config와 pure parser contract를 소유합니다. fixture string은 test가 소유하며 filesystem-generated manifests, build process와 assets는 사용하지 않습니다. |
| Failure·missing output·cleanup 처리 | compiler string drift, assignment regex가 compact wrapper 또는 dynamic brackets를 처리하지 못하면 assertion이 실패합니다. 실제 Next build format이 fixture와 함께 잘못 업데이트되는 경우, manifest file read/stat failure는 검출하지 못합니다. |
| 보장하는 것과 보장하지 않는 것 | repository build command와 두 대표 wrapper syntax의 parser behavior가 결정적으로 보호됩니다. production build 성공, 모든 route key, malformed input, bundle size accuracy는 증명하지 않습니다. |
| 다음 delivery commit 또는 관련 test 연결 | `605b64512edf`의 collector가 parser를 실제 manifest path에 적용합니다. `4e8f95249481`은 이 test를 broader performance gate test로 이동하면서 같은 assertions를 보존합니다. |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** Parent에는 `src/performance/build-manifest-contract.test.ts`가 없습니다.
- **해당 SHA 핵심 코드:** `c24c350ce42cdbfe35eff3c6dd3bebc62ab132aa` · `src/performance/build-manifest-contract.test.ts`

```text
const source =
  'globalThis.__RSC_MANIFEST=(globalThis.__RSC_MANIFEST||{});globalThis.__RSC_MANIFEST["/projects/[projectId]/page"]={"entryJSFiles":{}};';

expect(parseClientReferenceManifest(source, "project.js")).toEqual({
  entryJSFiles: {},
});
```

- **관찰 근거의 성격:** Exact-SHA test file에서 직접 확인한 config/pure parser regression입니다.
- **실행·테스트 증거:** 실행하지 않음. 현재 작업 환경에서는 `web/portfolio`의 Git checkout, npm dependency tree, Chromium 및 Docker daemon을 사용할 수 없었습니다. GitHub connector로 해당 SHA의 commit diff와 resulting source를 검사했으며, command 성공 결과는 주장하지 않습니다.
- **다음 commit 연결:** `605b64512edf`의 collector가 parser를 실제 manifest path에 적용합니다. `4e8f95249481`은 이 test를 broader performance gate test로 이동하면서 같은 assertions를 보존합니다.

### 3. `605b64512edf` — build(perf): route별 client asset 측정 추가

- **Full SHA:** `605b64512edfdf416335ee500355fb1008100168`
- **Importance:** A
- **Tags:** ARCH, ROUTING, PERF
- **확장 thread에서의 역할:** production measurement — app paths와 client-reference manifests를 join해 route별 uncompressed JS/CSS bytes를 계산합니다.

#### 해당 SHA에서 확인할 실제 코드

- `collectRouteBundleMeasurements`가 `server/app-paths-manifest.json`과 `build-manifest.json`을 어떤 순서로 읽는지 확인합니다.
- `/page` → `/`, `/.../page` suffix 제거, `/_` skip과 sorted key iteration 규칙을 기록합니다.
- root shared JS와 route `entryJSFiles`, non-inlined `entryCSSFiles`를 합치고 `Set`으로 route 내부 duplicate를 제거하는 byte accounting을 추적합니다.
- missing manifest/asset, invalid JSON와 parser failure가 catch되지 않고 caller를 실패시키는 fail-closed behavior를 확인합니다.

확인 원칙:

- 먼저 `605b64512edf^`와 `605b64512edf`를 비교하고, 필요한 file은 `605b64512edf:<path>`의 resulting tree에서 읽습니다.
- Final HEAD의 workflow, script, Dockerfile 또는 generated output을 이 commit에 소급하지 않습니다.
- Commit subject나 body만으로 behavior를 추정하지 않고 실제 changed code/test/config를 기준으로 판단합니다.
- 실제 실행하지 않은 command 결과는 code inspection과 분리합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 전달 상태와 부족함 | parser만 존재했고 실제 production routes, shared chunks와 emitted file sizes를 수집하는 measurement path가 없었습니다. |
| 실제 변경 file/symbol/command/artifact | `collectRouteBundleMeasurements`와 related types를 추가했습니다. app-paths manifest의 page entries를 public route pattern으로 바꾸고, 각 route의 client-reference manifest를 parse합니다. root shared JS + route JS와 non-inlined route CSS를 deduplicate한 뒤 `.next` 아래 실제 file의 `stat.size`를 합산합니다. |
| Build/runtime/resource owner와 lifetime | Next generated manifests가 route→artifact mapping의 source of truth이고 collector가 join/accounting을 소유합니다. `assetBytes`는 caller의 build directory를 read-only로 stat하며 output object가 route별 byte state를 소유합니다. |
| Failure·missing output·cleanup 처리 | manifest read/JSON parse/parser/stat 중 하나라도 실패하면 Promise가 reject합니다. framework-internal `/_`와 non-page entry는 의도적으로 제외됩니다. missing files를 0으로 처리하지 않아 false-green measurement를 만들지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | 측정 대상 route별로 shared + entry JS와 별도 transfer되는 CSS의 uncompressed bytes를 계산합니다. gzip/Brotli, runtime cache, lazy chunk의 모든 future fetch, concrete dynamic IDs, network transfer overhead는 측정하지 않습니다. |
| 다음 delivery commit 또는 관련 test 연결 | `518ff5b51ec5`가 이 measurement와 baseline을 비교하고, `57a1b0876941`이 production build directory를 대상으로 CLI에서 호출합니다. |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** Parser만 있고 filesystem/manifests를 연결하는 collector와 byte types가 없습니다.
- **해당 SHA 핵심 코드:** `605b64512edfdf416335ee500355fb1008100168` · `scripts/route-budgets.mjs — collectRouteBundleMeasurements`

```text
const sharedJavaScript = buildManifest.rootMainFiles ?? [];

const routeJavaScript = Object.values(
  manifest.entryJSFiles ?? {},
).flat();
const routeCss = Object.values(manifest.entryCSSFiles ?? {})
  .flat()
  .filter(({ inlined }) => !inlined)
  .map(({ path: assetPath }) => assetPath);

measurements[route] = {
  cssBytes: await assetBytes(buildDirectory, routeCss),
  jsBytes: await assetBytes(buildDirectory, [
    ...sharedJavaScript,
    ...routeJavaScript,
  ]),
};
```

- **관찰 근거의 성격:** Exact-SHA collector implementation에서 직접 확인한 build-output accounting입니다.
- **실행·테스트 증거:** 실행하지 않음. 현재 작업 환경에서는 `web/portfolio`의 Git checkout, npm dependency tree, Chromium 및 Docker daemon을 사용할 수 없었습니다. GitHub connector로 해당 SHA의 commit diff와 resulting source를 검사했으며, command 성공 결과는 주장하지 않습니다.
- **다음 commit 연결:** `518ff5b51ec5`가 이 measurement와 baseline을 비교하고, `57a1b0876941`이 production build directory를 대상으로 CLI에서 호출합니다.

### 4. `518ff5b51ec5` — build(perf): route bundle 성장 예산 평가 추가

- **Full SHA:** `518ff5b51ec54c4eb4fcca9bab5ff6ba8e70a67b`
- **Importance:** A
- **Tags:** ARCH, ROUTING, PERF
- **확장 thread에서의 역할:** pure policy evaluator — committed route coverage와 JS/CSS별 최대 5% 성장을 structured violations로 판정합니다.

#### 해당 SHA에서 확인할 실제 코드

- `BUDGET_GROWTH_FACTOR = 1.05`와 `Math.floor(expected * factor)`의 exact pass boundary를 계산합니다.
- baseline route missing, asset overage와 measured new route without baseline이 서로 다른 `asset` category로 기록되는지 확인합니다.
- evaluator가 process exit, logging, file read/write를 하지 않는 pure function인지 확인합니다.
- type에 `schemaVersion`/`growthLimitPercent`가 있어도 evaluator 자체가 runtime value를 검증하는지 구분합니다.

확인 원칙:

- 먼저 `518ff5b51ec5^`와 `518ff5b51ec5`를 비교하고, 필요한 file은 `518ff5b51ec5:<path>`의 resulting tree에서 읽습니다.
- Final HEAD의 workflow, script, Dockerfile 또는 generated output을 이 commit에 소급하지 않습니다.
- Commit subject나 body만으로 behavior를 추정하지 않고 실제 changed code/test/config를 기준으로 판단합니다.
- 실제 실행하지 않은 command 결과는 code inspection과 분리합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 전달 상태와 부족함 | route별 bytes는 계산할 수 있었지만 accepted reference, 허용 성장률, route coverage mismatch를 판정하는 policy가 없었습니다. |
| 실제 변경 file/symbol/command/artifact | `BUDGET_GROWTH_FACTOR = 1.05`, baseline/violation types와 `evaluateRouteBudgets`를 추가했습니다. 각 baseline route의 CSS/JS allowed bytes를 floor해 초과를 기록하고, expected route missing과 baseline 없는 measured route도 violation으로 반환합니다. |
| Build/runtime/resource owner와 lifetime | pure evaluator가 policy calculation을 소유하고 caller가 measurement/baseline input과 violation 처리 lifecycle을 소유합니다. function은 input을 수정하거나 baseline을 update하지 않습니다. |
| Failure·missing output·cleanup 처리 | function 자체는 throw/exit하지 않고 violations를 반환합니다. missing expected route는 `route`, new route는 `baseline`, overage는 `css`/`js`로 구분합니다. schema/growth field validity는 이 function에서 검사하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | exactly floor(105%)까지 허용하고 그 다음 byte부터 실패 대상으로 표시하며 route set drift도 false-green으로 두지 않습니다. baseline 값 자체의 적절성, absolute size quality, compression과 schema validation은 보장하지 않습니다. |
| 다음 delivery commit 또는 관련 test 연결 | `57a1b0876941` CLI가 violations를 stderr/exit code로 승격하고, `4e8f95249481`이 exact 5%와 first-byte-over tests를 추가합니다. |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** Collector output을 비교하는 evaluator와 budget policy가 없습니다.
- **해당 SHA 핵심 코드:** `518ff5b51ec54c4eb4fcca9bab5ff6ba8e70a67b` · `scripts/route-budgets.mjs — evaluateRouteBudgets`

```text
const allowedBytes = Math.floor(
  expected[property] * BUDGET_GROWTH_FACTOR,
);
if (actual[property] > allowedBytes) {
  violations.push({
    actualBytes: actual[property],
    allowedBytes,
    asset,
    baselineBytes: expected[property],
    route,
  });
}
```

- **관찰 근거의 성격:** Exact-SHA pure evaluator에서 직접 확인한 arithmetic/fail categories입니다.
- **실행·테스트 증거:** 실행하지 않음. 현재 작업 환경에서는 `web/portfolio`의 Git checkout, npm dependency tree, Chromium 및 Docker daemon을 사용할 수 없었습니다. GitHub connector로 해당 SHA의 commit diff와 resulting source를 검사했으며, command 성공 결과는 주장하지 않습니다.
- **다음 commit 연결:** `57a1b0876941` CLI가 violations를 stderr/exit code로 승격하고, `4e8f95249481`이 exact 5%와 first-byte-over tests를 추가합니다.

### 5. `57a1b0876941` — build(perf): bundle budget CLI 연결

- **Full SHA:** `57a1b0876941d2dc1e78f4439ef9dd4f4b9edb2a`
- **Importance:** B
- **Tags:** PERF, DEPLOY
- **확장 thread에서의 역할:** operational split — baseline write와 routine check를 별도 package commands로 노출합니다.

#### 해당 SHA에서 확인할 실제 코드

- `bundle:baseline`과 `bundle:check`의 argv 차이와 둘 다 existing `.next` measurement를 먼저 수행한다는 순서를 확인합니다.
- `--write-baseline` branch가 directory 생성, formatted JSON write 후 return하고 comparison을 수행하지 않는다는 점을 기록합니다.
- normal branch가 committed file을 읽고 `growthLimitPercent === 5`를 검사한 뒤 모든 violation을 출력하고 `process.exitCode = 1`로 끝나는지 확인합니다.
- `isMain` guard가 test import 시 filesystem/process side effect를 막는지 확인합니다.

확인 원칙:

- 먼저 `57a1b0876941^`와 `57a1b0876941`를 비교하고, 필요한 file은 `57a1b0876941:<path>`의 resulting tree에서 읽습니다.
- Final HEAD의 workflow, script, Dockerfile 또는 generated output을 이 commit에 소급하지 않습니다.
- Commit subject나 body만으로 behavior를 추정하지 않고 실제 changed code/test/config를 기준으로 판단합니다.
- 실제 실행하지 않은 command 결과는 code inspection과 분리합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 전달 상태와 부족함 | collector/evaluator는 import 가능한 functions였지만 operator가 baseline을 만들거나 routine validation을 실행할 canonical package command와 exit behavior가 없었습니다. |
| 실제 변경 file/symbol/command/artifact | `bundle:baseline`과 `bundle:check`를 추가했습니다. CLI는 measurement를 출력하고, explicit write mode에서는 schema/source/routes를 `performance/route-budgets.json`에 씁니다. normal mode에서는 committed baseline과 policy를 읽어 violations를 모두 출력하고 exit code 1을 설정합니다. |
| Build/runtime/resource owner와 lifetime | operator가 어느 command를 선택하는지 소유하고, CLI가 filesystem path, serialization, diagnostics와 process exit state를 소유합니다. `isMain` guard 덕분에 imported functions는 CLI lifecycle을 시작하지 않습니다. |
| Failure·missing output·cleanup 처리 | missing/invalid baseline JSON, growth limit가 5가 아님, measurement failure는 throw/reject합니다. violations는 전부 출력된 뒤 exit code 1입니다. write mode는 current numbers를 승인 여부 없이 overwrite할 수 있으므로 review process가 policy owner입니다. |
| 보장하는 것과 보장하지 않는 것 | routine check는 baseline을 자동 갱신하지 않고 비교만 합니다. baseline 변경은 명시적 command와 diff를 남겨야 합니다. 누가 baseline update를 승인하는지, build 선행 여부, schemaVersion runtime validation은 강제하지 않습니다. |
| 다음 delivery commit 또는 관련 test 연결 | `6ac1ea4b5055`가 최초 generated baseline을 commit하고 `abbd530368a0`이 only `bundle:check`를 CI에 연결합니다. |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** package scripts와 CLI `main`/baseline path가 없습니다.
- **해당 SHA 핵심 코드:** `57a1b0876941d2dc1e78f4439ef9dd4f4b9edb2a` · `scripts/route-budgets.mjs — main`

```text
if (writeBaseline) {
  const baseline = {
    schemaVersion: 1,
    growthLimitPercent: 5,
    source: "Next.js production client assets (uncompressed bytes)",
    routes: measurements,
  };
  await mkdir(path.dirname(DEFAULT_BASELINE_PATH), { recursive: true });
  await writeFile(
    DEFAULT_BASELINE_PATH,
    `${JSON.stringify(baseline, null, 2)}\n`,
    "utf8",
  );
  console.log(`Wrote ${DEFAULT_BASELINE_PATH}`);
  return;
}
```

- **관찰 근거의 성격:** Exact-SHA package script/CLI implementation에서 직접 확인했습니다.
- **실행·테스트 증거:** 실행하지 않음. 현재 작업 환경에서는 `web/portfolio`의 Git checkout, npm dependency tree, Chromium 및 Docker daemon을 사용할 수 없었습니다. GitHub connector로 해당 SHA의 commit diff와 resulting source를 검사했으며, command 성공 결과는 주장하지 않습니다.
- **다음 commit 연결:** `6ac1ea4b5055`가 최초 generated baseline을 commit하고 `abbd530368a0`이 only `bundle:check`를 CI에 연결합니다.

### 6. `6ac1ea4b5055` — chore(perf): route bundle 기준값 기록

- **Full SHA:** `6ac1ea4b5055cad7e1eef05d8a8e7811b5cb8807`
- **Importance:** B
- **Tags:** ROUTING, PERF
- **확장 thread에서의 역할:** reviewable operational state — 여덟 public route pattern의 accepted uncompressed byte baseline을 commit합니다.

#### 해당 SHA에서 확인할 실제 코드

- `performance/route-budgets.json`의 schemaVersion, growthLimitPercent, source description과 route key set을 확인합니다.
- 여덟 route가 모두 같은 `cssBytes: 169861`, `jsBytes: 425976`을 기록한다는 generated state를 그대로 기록합니다.
- 이 file이 test result 증명서가 아니라 future checks의 accepted configuration이라는 ownership을 설명합니다.
- baseline 값을 manual edit/write command로 낮추거나 높일 수 있고 review가 필요하다는 non-guarantee를 명시합니다.

확인 원칙:

- 먼저 `6ac1ea4b5055^`와 `6ac1ea4b5055`를 비교하고, 필요한 file은 `6ac1ea4b5055:<path>`의 resulting tree에서 읽습니다.
- Final HEAD의 workflow, script, Dockerfile 또는 generated output을 이 commit에 소급하지 않습니다.
- Commit subject나 body만으로 behavior를 추정하지 않고 실제 changed code/test/config를 기준으로 판단합니다.
- 실제 실행하지 않은 command 결과는 code inspection과 분리합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 전달 상태와 부족함 | CLI는 baseline path를 요구하지만 committed `performance/route-budgets.json`이 없어 normal check가 성공할 reference state가 없었습니다. |
| 실제 변경 file/symbol/command/artifact | schema version 1, growth limit 5%, uncompressed client assets라는 source 설명과 8 route patterns를 가진 baseline을 추가했습니다. 각 route는 CSS 169,861 bytes, JS 425,976 bytes를 기록합니다. |
| Build/runtime/resource owner와 lifetime | committed JSON이 accepted reference와 route coverage를 소유합니다. generator가 만들었더라도 merge review 이후 operational configuration으로 기능합니다. |
| Failure·missing output·cleanup 처리 | file 누락/invalid JSON/policy drift는 CLI failure가 됩니다. 값이 부적절하게 높게 승인되면 evaluator는 그 기준을 신뢰하므로 absolute bloat를 막지 못합니다. |
| 보장하는 것과 보장하지 않는 것 | future build가 비교할 explicit route set와 byte reference가 생깁니다. 이 숫자가 빠르거나 작은 artifact임을 독립적으로 증명하지 않습니다. |
| 다음 delivery commit 또는 관련 test 연결 | `abbd530368a0`의 CI `bundle:check`가 이 file을 읽습니다. baseline update는 routine check가 아니라 별도 reviewable commit이어야 합니다. |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** `performance/route-budgets.json`이 없습니다.
- **해당 SHA 핵심 코드:** `6ac1ea4b5055cad7e1eef05d8a8e7811b5cb8807` · `performance/route-budgets.json`

```text
{
  "schemaVersion": 1,
  "growthLimitPercent": 5,
  "source": "Next.js production client assets (uncompressed bytes)",
  "routes": {
    "/": { "cssBytes": 169861, "jsBytes": 425976 },
    "/projects/[projectId]": {
      "cssBytes": 169861,
      "jsBytes": 425976
    }
  }
}
```

- **관찰 근거의 성격:** Exact-SHA committed generated measurement입니다. 이 작업에서 재측정하지 않았습니다.
- **실행·테스트 증거:** 실행하지 않음. 현재 작업 환경에서는 `web/portfolio`의 Git checkout, npm dependency tree, Chromium 및 Docker daemon을 사용할 수 없었습니다. GitHub connector로 해당 SHA의 commit diff와 resulting source를 검사했으며, command 성공 결과는 주장하지 않습니다.
- **다음 commit 연결:** `abbd530368a0`의 CI `bundle:check`가 이 file을 읽습니다. baseline update는 routine check가 아니라 별도 reviewable commit이어야 합니다.

### 7. `1529ccf225c1` — build(perf): desktop Lighthouse 실행 경계 추가

- **Full SHA:** `1529ccf225c10028607b6a8963c3280f4ab56a42`
- **Importance:** A
- **Tags:** PERF, DEPLOY
- **확장 thread에서의 역할:** production lab gate definition — 10 URL desktop matrix, median aggregation과 release thresholds를 설정합니다.

#### 해당 SHA에서 확인할 실제 코드

- `lighthouserc.cjs`가 `src/content/projects.json`에서 첫 enabled project를 찾고 없으면 config load 단계에서 실패하는지 확인합니다.
- 5 design IDs × home/project detail로 10 URLs를 구성하고 `start:performance` port 3300의 production server를 사용하는지 추적합니다.
- 3 runs, desktop preset, performance/accessibility only, headless/no-sandbox와 median assertion 설정을 기록합니다.
- performance 0.90, accessibility 0.95, LCP 2500ms, TBT 200ms, CLS 0.1의 exact threshold와 mobile/all-route non-coverage를 명시합니다.

확인 원칙:

- 먼저 `1529ccf225c1^`와 `1529ccf225c1`를 비교하고, 필요한 file은 `1529ccf225c1:<path>`의 resulting tree에서 읽습니다.
- Final HEAD의 workflow, script, Dockerfile 또는 generated output을 이 commit에 소급하지 않습니다.
- Commit subject나 body만으로 behavior를 추정하지 않고 실제 changed code/test/config를 기준으로 판단합니다.
- 실제 실행하지 않은 command 결과는 code inspection과 분리합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 전달 상태와 부족함 | route byte budget은 정의됐지만 rendered production page의 lab performance/accessibility와 visual stability를 release threshold로 평가하는 command/config가 없었습니다. |
| 실제 변경 file/symbol/command/artifact | `@lhci/cli`, `lighthouse:audit`, `start:performance`, `.lighthouseci` ignore와 `lighthouserc.cjs`를 추가했습니다. 첫 enabled project와 5 designs로 10 URLs를 만들고 production server에서 각 3회 desktop audit를 수행합니다. |
| Build/runtime/resource owner와 lifetime | content JSON이 project ID availability를, Lighthouse config가 URL matrix/metrics/threshold를, LHCI가 server lifecycle과 Chrome audits를 소유합니다. raw reports는 ignored `.lighthouseci`에 ephemeral하게 남습니다. |
| Failure·missing output·cleanup 처리 | enabled project가 없으면 config load가 throw합니다. server가 120초 안에 readiness pattern을 내지 않거나 median assertion이 threshold를 벗어나면 LHCI command가 실패합니다. browser sandbox는 CI compatibility를 위해 비활성화됩니다. |
| 보장하는 것과 보장하지 않는 것 | production server의 5-design home/detail 대표 표본에 desktop median gate가 생깁니다. mobile, 다른 routes, field/RUM, network diversity, long interaction INP를 직접 보장하지 않으며 TBT가 interaction proxy입니다. |
| 다음 delivery commit 또는 관련 test 연결 | `f1c72dfdd16a`가 raw reports를 reviewable summary로 만들고, `4e8f95249481`이 config rules를 unit-test하며, `abbd530368a0`이 CI에서 실행합니다. |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** LHCI dependency, package commands, config와 ignored workspace가 없습니다.
- **해당 SHA 핵심 코드:** `1529ccf225c10028607b6a8963c3280f4ab56a42` · `lighthouserc.cjs`

```text
const urls = designIds.flatMap((designId) => [
  `${baseUrl}/?view=${designId}`,
  `${baseUrl}/projects/${firstProject.id}?view=${designId}`,
]);

collect: {
  numberOfRuns: 3,
  startServerCommand: "npm run start:performance",
  settings: { preset: "desktop" },
},
assert: {
  assertions: {
    "categories:performance": ["error", { ...median, minScore: 0.9 }],
    "largest-contentful-paint": ["error", { ...median, maxNumericValue: 2_500 }],
  },
}
```

- **관찰 근거의 성격:** Exact-SHA LHCI config/package diff에서 직접 확인한 release gate definition입니다.
- **실행·테스트 증거:** 실행하지 않음. 현재 작업 환경에서는 `web/portfolio`의 Git checkout, npm dependency tree, Chromium 및 Docker daemon을 사용할 수 없었습니다. GitHub connector로 해당 SHA의 commit diff와 resulting source를 검사했으며, command 성공 결과는 주장하지 않습니다.
- **다음 commit 연결:** `f1c72dfdd16a`가 raw reports를 reviewable summary로 만들고, `4e8f95249481`이 config rules를 unit-test하며, `abbd530368a0`이 CI에서 실행합니다.

### 8. `f1c72dfdd16a` — build(perf): Lighthouse 결과 요약기 추가

- **Full SHA:** `f1c72dfdd16a0be14f7c2a650bde9ee431ec27bf`
- **Importance:** B
- **Tags:** PERF, DEPLOY
- **확장 thread에서의 역할:** measurement provenance — raw LHRs를 URL별 runs/median과 execution environment를 가진 JSON으로 요약합니다.

#### 해당 SHA에서 확인할 실제 코드

- `scripts/summarize-lighthouse.mjs`가 `lhr-*.json`만 읽고 report가 0개면 실패하는지 확인합니다.
- `resultFromReport`, `median`, `aggregate`가 다섯 metrics를 URL별로 계산하고 URL key를 정렬하는지 추적합니다.
- `measuredAt`과 host environment가 output마다 달라질 수 있어 deterministic ordering과 byte-identical reproducibility를 구분합니다.
- summary command가 threshold를 판정하는 gate가 아니라 generated evidence writer라는 점을 명시합니다.

확인 원칙:

- 먼저 `f1c72dfdd16a^`와 `f1c72dfdd16a`를 비교하고, 필요한 file은 `f1c72dfdd16a:<path>`의 resulting tree에서 읽습니다.
- Final HEAD의 workflow, script, Dockerfile 또는 generated output을 이 commit에 소급하지 않습니다.
- Commit subject나 body만으로 behavior를 추정하지 않고 실제 changed code/test/config를 기준으로 판단합니다.
- 실제 실행하지 않은 command 결과는 code inspection과 분리합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 전달 상태와 부족함 | LHCI는 raw reports와 pass/fail을 만들 수 있었지만 median values와 environment를 한 reviewable repository file로 정규화하는 command가 없었습니다. |
| 실제 변경 file/symbol/command/artifact | `lighthouse:summarize`와 104-line summarizer를 추가했습니다. raw LHRs를 final URL로 group하고 performance/accessibility score, CLS, LCP, TBT의 모든 run과 median을 기록합니다. targets, measuredAt, Chrome UA, Node, platform, arch, CPU/core/memory도 output에 포함합니다. |
| Build/runtime/resource owner와 lifetime | raw `.lighthouseci` reports가 input lifetime을, summarizer가 transformation/output path를, committed result review가 provenance 해석을 소유합니다. |
| Failure·missing output·cleanup 처리 | input directory/read/JSON/required field failure가 전파되고 report 0개는 explicit error입니다. 첫 report의 environment를 전체 group 대표로 사용하며 run count가 실제로 3인지 별도 runtime validation하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | URL별 raw runs, median과 material host context가 stable key order로 보존됩니다. summary 자체는 threshold를 enforce하지 않고 timestamp/environment 때문에 동일 source에서 byte-identical하지 않습니다. |
| 다음 delivery commit 또는 관련 test 연결 | `a39856cf734a`가 이 형식의 desktop result를 commit합니다. CI `abbd530368a0`은 `lighthouse:audit`만 실행하고 summarize/commit은 하지 않습니다. |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** raw LHR을 repository JSON으로 요약하는 script/package command가 없습니다.
- **해당 SHA 핵심 코드:** `f1c72dfdd16a0be14f7c2a650bde9ee431ec27bf` · `scripts/summarize-lighthouse.mjs`

```text
const filenames = (await readdir(INPUT_DIRECTORY)).filter(
  (filename) => filename.startsWith("lhr-") && filename.endsWith(".json"),
);
if (filenames.length === 0) {
  throw new Error("No Lighthouse JSON reports were found in .lighthouseci.");
}

const routes = Object.fromEntries(
  [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([url, runs]) => [url, { median: aggregate(runs), runs }]),
);
```

- **관찰 근거의 성격:** Exact-SHA summarizer implementation에서 직접 확인했습니다.
- **실행·테스트 증거:** 실행하지 않음. 현재 작업 환경에서는 `web/portfolio`의 Git checkout, npm dependency tree, Chromium 및 Docker daemon을 사용할 수 없었습니다. GitHub connector로 해당 SHA의 commit diff와 resulting source를 검사했으며, command 성공 결과는 주장하지 않습니다.
- **다음 commit 연결:** `a39856cf734a`가 이 형식의 desktop result를 commit합니다. CI `abbd530368a0`은 `lighthouse:audit`만 실행하고 summarize/commit은 하지 않습니다.

### 9. `4e8f95249481` — test(perf): 배포 성능 gate 규칙 검증

- **Full SHA:** `4e8f952494812b4da0125b19ce56518505392cad`
- **Importance:** A
- **Tags:** VALIDATION, PERF, TEST
- **확장 thread에서의 역할:** policy regression suite — compiler/parser assertions를 보존하며 Lighthouse matrix와 budget arithmetic을 검증합니다.

#### 해당 SHA에서 확인할 실제 코드

- 기존 `build-manifest-contract.test.ts`가 제거되고 assertions가 `performance-gates.test.ts`로 이동·확장되는 ownership transfer를 확인합니다.
- 실제 `lighthouserc.cjs`를 require해 production server, 3 runs, desktop, 10 URLs와 exact thresholds를 검사하는지 추적합니다.
- 100/1000 baseline에서 105/1050은 통과하고 106/2101은 route+asset violation이 되는 boundary fixture를 계산합니다.
- missing baseline routes는 test하지만 measured new route without baseline, CLI exit와 actual build/Lighthouse는 직접 test하지 않는 범위를 기록합니다.

확인 원칙:

- 먼저 `4e8f95249481^`와 `4e8f95249481`를 비교하고, 필요한 file은 `4e8f95249481:<path>`의 resulting tree에서 읽습니다.
- Final HEAD의 workflow, script, Dockerfile 또는 generated output을 이 commit에 소급하지 않습니다.
- Commit subject나 body만으로 behavior를 추정하지 않고 실제 changed code/test/config를 기준으로 판단합니다.
- 실제 실행하지 않은 command 결과는 code inspection과 분리합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 전달 상태와 부족함 | compiler/parser fixture는 test됐지만 Lighthouse configuration drift와 budget evaluator의 exact boundary/fail-closed behavior는 executable contract가 아니었습니다. |
| 실제 변경 file/symbol/command/artifact | 기존 test를 broader `src/performance/performance-gates.test.ts`로 교체했습니다. compiler/parser tests를 보존하고, 5-design×2-route×3-run desktop config와 5 thresholds를 검사합니다. pure budget fixtures로 exactly 5% pass, first-byte over violation, expected route missing을 검증합니다. |
| Build/runtime/resource owner와 lifetime | unit suite가 static config와 pure policy behavior를 소유합니다. actual build files, browser, network와 CLI process는 사용하지 않습니다. |
| Failure·missing output·cleanup 처리 | config URL/threshold/command drift, compiler flag 제거, parser regression, arithmetic/fail-closed regression이 deterministic assertion failure가 됩니다. real performance variability나 stale committed baseline은 이 test가 검출하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | gate를 약화시키는 주요 config/pure evaluator 변화가 test failure 없이 들어가기 어렵습니다. LHCI/asset collector가 실제 environment에서 성공하거나 CLI가 expected exit code를 내는지는 증명하지 않습니다. |
| 다음 delivery commit 또는 관련 test 연결 | Thread 2의 Tailwind transform fix가 이후 artifact correctness를 보강하고, `abbd530368a0`이 unit-tested rules를 actual CI commands로 활성화합니다. |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** compiler/parser만 다루는 36-line test가 있고 performance gate policy fixtures는 없습니다.
- **해당 SHA 핵심 코드:** `4e8f952494812b4da0125b19ce56518505392cad` · `src/performance/performance-gates.test.ts`

```text
const measurements: RouteBundleMeasurement = {
  "/": { cssBytes: 106, jsBytes: 1_050 },
  "/projects/[projectId]": { cssBytes: 210, jsBytes: 2_101 },
};

expect(evaluateRouteBudgets(measurements, baseline)).toEqual([
  expect.objectContaining({ asset: "css", route: "/" }),
  expect.objectContaining({
    asset: "js",
    route: "/projects/[projectId]",
  }),
]);
```

- **관찰 근거의 성격:** Exact-SHA test replacement/fixtures에서 직접 확인한 deterministic regression coverage입니다.
- **실행·테스트 증거:** 실행하지 않음. 현재 작업 환경에서는 `web/portfolio`의 Git checkout, npm dependency tree, Chromium 및 Docker daemon을 사용할 수 없었습니다. GitHub connector로 해당 SHA의 commit diff와 resulting source를 검사했으며, command 성공 결과는 주장하지 않습니다.
- **다음 commit 연결:** Thread 2의 Tailwind transform fix가 이후 artifact correctness를 보강하고, `abbd530368a0`이 unit-tested rules를 actual CI commands로 활성화합니다.

### 10. `abbd530368a0` — ci: 검증된 bundle과 Lighthouse gate 활성화

- **Full SHA:** `abbd530368a03b8dc40221d663377c1f45e254ee`
- **Importance:** A
- **Tags:** VALIDATION, PERF, DEPLOY
- **확장 thread에서의 역할:** release integration — production build output에 standalone, bundle와 Lighthouse checks를 순차 적용합니다.

#### 해당 SHA에서 확인할 실제 코드

- `test:e2e:ci`가 build 후 production config를 사용하되 `--grep-invert @visual`로 visual cases를 제외하는 정확한 scope를 확인합니다.
- CI가 E2E build 후 `build:verify`, `bundle:check`, browser path export, `lighthouse:audit`을 순서대로 실행해 `.next`를 재사용하는지 추적합니다.
- `CHROME_PATH`가 Playwright-installed Chromium executable에서 생성되어 `$GITHUB_ENV`로 전달되는 ownership을 기록합니다.
- `lighthouse:summarize`와 mobile observation이 CI gate에 포함되는지 확인해 advisory/generated evidence와 enforced checks를 분리합니다.

확인 원칙:

- 먼저 `abbd530368a0^`와 `abbd530368a0`를 비교하고, 필요한 file은 `abbd530368a0:<path>`의 resulting tree에서 읽습니다.
- Final HEAD의 workflow, script, Dockerfile 또는 generated output을 이 commit에 소급하지 않습니다.
- Commit subject나 body만으로 behavior를 추정하지 않고 실제 changed code/test/config를 기준으로 판단합니다.
- 실제 실행하지 않은 command 결과는 code inspection과 분리합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 전달 상태와 부족함 | bundle/Lighthouse tooling과 tests는 local에 있었지만 CI workflow는 production E2E와 standalone verify까지만 수행했습니다. |
| 실제 변경 file/symbol/command/artifact | CI E2E를 `test:e2e:ci`로 바꿔 build + non-visual production tests를 실행합니다. 이어 standalone verify, route bundle check, Playwright Chromium path export, production Lighthouse audit를 추가합니다. |
| Build/runtime/resource owner와 lifetime | 한 CI workspace의 E2E build가 `.next` producer이고 artifact/bundle/Lighthouse steps가 순차 consumers입니다. Playwright installation이 browser binary를 소유하고 workflow가 path를 LHCI environment로 전달합니다. |
| Failure·missing output·cleanup 처리 | 각 command non-zero가 후속 gate를 막습니다. visual snapshots는 `@visual` exclusion으로 general CI E2E에서 실행되지 않습니다. Lighthouse는 existing production build와 configured server가 준비되지 않으면 실패합니다. |
| 보장하는 것과 보장하지 않는 것 | CI가 standalone layout, committed route growth budget와 enforced desktop Lighthouse thresholds를 자동 차단 조건으로 사용합니다. visual suite, summarize output commit, mobile Lighthouse, field performance와 hosting runtime은 이 gate에 포함되지 않습니다. |
| 다음 delivery commit 또는 관련 test 연결 | `a39856cf734a`는 별도 local lab evidence를 기록하고, Thread 5의 `b94fa6dd0118`이 같은 workflow 끝에 container runtime check를 추가합니다. |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** CI에는 bundle check, Lighthouse audit와 browser path handoff가 없고 production E2E가 visual cases까지 포함합니다.
- **해당 SHA 핵심 코드:** `abbd530368a03b8dc40221d663377c1f45e254ee` · `.github/workflows/ci.yml 및 package.json`

```text
- name: Check route bundle budgets
  run: npm run bundle:check

- name: Locate Playwright Chromium for Lighthouse
  run: echo "CHROME_PATH=$(node -e 'process.stdout.write(require(\"playwright\").chromium.executablePath())')" >> "$GITHUB_ENV"

- name: Run production Lighthouse budgets
  run: npm run lighthouse:audit
```

- **관찰 근거의 성격:** Exact-SHA package/workflow diff에서 직접 확인한 CI gate graph입니다.
- **실행·테스트 증거:** 실행하지 않음. 현재 작업 환경에서는 `web/portfolio`의 Git checkout, npm dependency tree, Chromium 및 Docker daemon을 사용할 수 없었습니다. GitHub connector로 해당 SHA의 commit diff와 resulting source를 검사했으며, command 성공 결과는 주장하지 않습니다.
- **다음 commit 연결:** `a39856cf734a`는 별도 local lab evidence를 기록하고, Thread 5의 `b94fa6dd0118`이 같은 workflow 끝에 container runtime check를 추가합니다.

### 11. `a39856cf734a` — chore(perf): 최종 lab 성능 측정 결과 기록

- **Full SHA:** `a39856cf734a309a32f5c7f239ba6bec90e1c259`
- **Importance:** C
- **Tags:** PERF
- **확장 thread에서의 역할:** generated evidence snapshot — desktop enforced matrix와 별도 mobile observation의 측정 결과를 환경과 함께 보존합니다.

#### 해당 SHA에서 확인할 실제 코드

- `performance/lighthouse-baseline.json`의 measuredAt, environment, 10 URL × 3 runs와 median values가 summarizer schema를 따르는지 확인합니다.
- `performance/lighthouse-mobile-observation.json`의 `enforcement: observation-only`, 1 run과 pass-count summary를 desktop gate와 구분합니다.
- recorded values를 이 작업에서 재실행한 결과로 표현하지 않고 historical generated evidence로만 기록합니다.

확인 원칙:

- 먼저 `a39856cf734a^`와 `a39856cf734a`를 비교하고, 필요한 file은 `a39856cf734a:<path>`의 resulting tree에서 읽습니다.
- Final HEAD의 workflow, script, Dockerfile 또는 generated output을 이 commit에 소급하지 않습니다.
- Commit subject나 body만으로 behavior를 추정하지 않고 실제 changed code/test/config를 기준으로 판단합니다.
- 실제 실행하지 않은 command 결과는 code inspection과 분리합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 전달 상태와 부족함 | measurement/summarizer와 CI gate는 있었지만 repository에 host context와 raw-run-derived desktop/mobile result snapshot이 없었습니다. |
| 실제 변경 file/symbol/command/artifact | Apple M1, Node v24.18.0, HeadlessChrome 147 환경의 desktop 10 URL×3 run summary와 mobile 10 URL×1 run observation을 commit했습니다. mobile summary는 performance 9/10, accessibility 10/10, LCP 3/10, TBT 9/10, CLS 10/10 target pass를 기록하고 명시적으로 non-enforced입니다. |
| Build/runtime/resource owner와 lifetime | JSON files가 historical measurement record를 소유합니다. CI threshold source는 여전히 `lighthouserc.cjs`이며 이 generated file이 gate input은 아닙니다. |
| Failure·missing output·cleanup 처리 | 이 commit은 data를 추가할 뿐 command failure를 새로 만들지 않습니다. recorded result는 stale해질 수 있고 다른 hardware/network에 일반화되지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | 특정 시각·host에서 실행된 lab 결과와 mobile gap이 review 가능합니다. current build의 성능, mobile release pass 또는 CI 재현을 보장하지 않습니다. |
| 다음 delivery commit 또는 관련 test 연결 | desktop file은 `f1c72dfdd16a` summary shape의 historical output이고, mobile file은 observation-only입니다. enforced gate는 `abbd530368a0`의 desktop LHCI command입니다. |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** 두 performance result JSON files가 없습니다.
- **해당 SHA 핵심 코드:** `a39856cf734a309a32f5c7f239ba6bec90e1c259` · `performance/lighthouse-mobile-observation.json`

```text
"measurement": {
  "kind": "Lighthouse mobile lab run against the local production server",
  "enforcement": "observation-only",
  "runCountPerUrl": 1
},
"passedTargets": {
  "performanceScore": 9,
  "accessibilityScore": 10,
  "lcp": 3,
  "tbt": 9,
  "cls": 10
}
```

- **관찰 근거의 성격:** Exact-SHA committed measurement files에서 읽은 historical record입니다.
- **실행·테스트 증거:** 재실행하지 않음. JSON에 기록된 2026-08-13 측정값은 repository의 historical generated evidence이며, 현재 작업이 생산한 runtime evidence로 취급하지 않습니다.
- **다음 commit 연결:** desktop file은 `f1c72dfdd16a` summary shape의 historical output이고, mobile file은 observation-only입니다. enforced gate는 `abbd530368a0`의 desktop LHCI command입니다.

## 6. Invariant ledger

| Invariant | 이전 상태 | 도입·수정 | 검증·소비 | 남은 비보장 |
| --- | --- | --- | --- | --- |
| Manifest trust | generated JS를 직접 해석할 명시 경계 없음 | `c2fb8a7c238d`의 slice+JSON parser | `c24c350ce42c` fixtures와 collector가 소비 | future wrapper/schema |
| Route byte accounting | source/estimate 중심 | `605b64512edf`가 actual manifests/files를 join | `518ff5b51ec5`가 route/asset policy 적용 | compression·lazy/network |
| Baseline governance | accepted state 없음 | `57a1b0876941`이 write/check 분리 | `6ac1ea4b5055` committed reference + CI check | review quality·absolute cap |
| Lab performance | manual/advisory | `1529ccf225c1` desktop matrix/threshold | `4e8f95249481` config test + `abbd530368a0` CI enforcement | mobile/field/all routes |
| Measurement provenance | raw ignored reports | `f1c72dfdd16a` summary writer | `a39856cf734a` environment-bound desktop/mobile records | currentness·cross-machine equivalence |

## 7. Failure → Fix → Test 연결

| Failure 또는 위험 | Fix/decision | Test·gate evidence | 한계 |
| --- | --- | --- | --- |
| generated manifest를 plain JSON/eval로 오해 | slice + semicolon + JSON.parse | ordinary/dynamic fixtures | future syntax는 fail-closed |
| route/asset가 사라져 낮은 숫자로 오인 | expected route missing/new baseline missing violations | missing route policy test | extra measured route test는 없음 |
| routine check가 baseline을 자동 승인 | write/check commands 분리 | CI는 only `bundle:check` | manual baseline approval는 process 책임 |
| Lighthouse config threshold가 약화 | exact config values | config contract test | real noise는 3-run median으로만 완화 |
| local gate가 integration에서 누락 | CI sequential steps + browser handoff | command non-zero가 release 차단 | visual/mobile/field는 비차단 |

## 8. Ownership / state / responsibility 변화

| 대상 | 이전 owner/state | 중간 변화 | 최종 owner/state |
| --- | --- | --- | --- |
| Generated manifest interpretation | 각 caller/암묵적 | `parseClientReferenceManifest` | collector가 consumer |
| Route bytes | 없음 | Next manifests + collector | baseline/evaluator/CLI |
| Accepted growth state | 없음 | committed JSON + review | CI routine read-only check |
| Lab threshold | 없음 | `lighthouserc.cjs` | unit contract + LHCI CI process |
| Browser binary | LHCI environment 가정 | Playwright install | workflow `$GITHUB_ENV` handoff |
| Result history | ignored raw reports | summarizer + committed JSON | non-authoritative historical evidence |

## 9. Thread 최종 상태

webpack production artifact의 route별 uncompressed client JS/CSS가 explicit baseline에 대해 5% 성장 및 route coverage gate를 통과해야 합니다. production server의 5-design home/detail desktop matrix도 median performance/accessibility/LCP/TBT/CLS threshold를 통과해야 CI가 성공합니다. mobile JSON은 observation-only이며 field data, all-route coverage와 absolute bundle cap은 없습니다.

## 10. 최종 product-delivery flow 정리

`npm run build --webpack` → app/build/client-reference manifests 생성 → parser가 JSON payload 추출 → collector가 actual asset bytes 계산 → `bundle:check`가 committed baseline/5% policy와 비교 → CI가 standalone verify와 bundle check를 수행 → Playwright Chromium path를 LHCI에 전달 → port 3300 production server에서 10 URLs×3 desktop runs → median threshold failure가 CI를 차단합니다.

## 11. 학습 완료 자가 점검

- [x] parser가 code execution 없이 generated wrapper payload만 해석하는 방식을 설명했습니다.
- [x] route byte accounting의 shared/route/dedup/non-inlined 규칙과 비측정 범위를 기록했습니다.
- [x] baseline write와 routine check의 ownership을 분리했습니다.
- [x] desktop Lighthouse matrix/threshold와 mobile observation-only 상태를 구분했습니다.
- [x] CI가 actual gate를 실행하지만 summary file을 자동 갱신하지 않는다고 기록했습니다.
- [ ] Exact-SHA runtime command를 직접 실행해 결과를 기록했습니다. — 실행하지 않음. 현재 작업 환경에서는 `web/portfolio`의 Git checkout, npm dependency tree, Chromium 및 Docker daemon을 사용할 수 없었습니다. GitHub connector로 해당 SHA의 commit diff와 resulting source를 검사했으며, command 성공 결과는 주장하지 않습니다.
