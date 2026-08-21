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
| 직전 전달 상태와 부족함 | <!-- LEARNER:c2fb8a7c238d:previous --> |
| 실제 변경 file/symbol/command/artifact | <!-- LEARNER:c2fb8a7c238d:changed --> |
| Build/runtime/resource owner와 lifetime | <!-- LEARNER:c2fb8a7c238d:owner --> |
| Failure·missing output·cleanup 처리 | <!-- LEARNER:c2fb8a7c238d:failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- LEARNER:c2fb8a7c238d:guarantee --> |
| 다음 delivery commit 또는 관련 test 연결 | <!-- LEARNER:c2fb8a7c238d:relation --> |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** <!-- LEARNER:c2fb8a7c238d:before_code -->
- **해당 SHA 핵심 코드:** <!-- LEARNER:c2fb8a7c238d:excerpt -->
- **관찰 근거의 성격:** <!-- LEARNER:c2fb8a7c238d:evidence_kind -->
- **실행·테스트 증거:** <!-- LEARNER:c2fb8a7c238d:execution -->
- **다음 commit 연결:** <!-- LEARNER:c2fb8a7c238d:next -->

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
| 직전 전달 상태와 부족함 | <!-- LEARNER:c24c350ce42c:previous --> |
| 실제 변경 file/symbol/command/artifact | <!-- LEARNER:c24c350ce42c:changed --> |
| Build/runtime/resource owner와 lifetime | <!-- LEARNER:c24c350ce42c:owner --> |
| Failure·missing output·cleanup 처리 | <!-- LEARNER:c24c350ce42c:failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- LEARNER:c24c350ce42c:guarantee --> |
| 다음 delivery commit 또는 관련 test 연결 | <!-- LEARNER:c24c350ce42c:relation --> |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** <!-- LEARNER:c24c350ce42c:before_code -->
- **해당 SHA 핵심 코드:** <!-- LEARNER:c24c350ce42c:excerpt -->
- **관찰 근거의 성격:** <!-- LEARNER:c24c350ce42c:evidence_kind -->
- **실행·테스트 증거:** <!-- LEARNER:c24c350ce42c:execution -->
- **다음 commit 연결:** <!-- LEARNER:c24c350ce42c:next -->

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
| 직전 전달 상태와 부족함 | <!-- LEARNER:605b64512edf:previous --> |
| 실제 변경 file/symbol/command/artifact | <!-- LEARNER:605b64512edf:changed --> |
| Build/runtime/resource owner와 lifetime | <!-- LEARNER:605b64512edf:owner --> |
| Failure·missing output·cleanup 처리 | <!-- LEARNER:605b64512edf:failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- LEARNER:605b64512edf:guarantee --> |
| 다음 delivery commit 또는 관련 test 연결 | <!-- LEARNER:605b64512edf:relation --> |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** <!-- LEARNER:605b64512edf:before_code -->
- **해당 SHA 핵심 코드:** <!-- LEARNER:605b64512edf:excerpt -->
- **관찰 근거의 성격:** <!-- LEARNER:605b64512edf:evidence_kind -->
- **실행·테스트 증거:** <!-- LEARNER:605b64512edf:execution -->
- **다음 commit 연결:** <!-- LEARNER:605b64512edf:next -->

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
| 직전 전달 상태와 부족함 | <!-- LEARNER:518ff5b51ec5:previous --> |
| 실제 변경 file/symbol/command/artifact | <!-- LEARNER:518ff5b51ec5:changed --> |
| Build/runtime/resource owner와 lifetime | <!-- LEARNER:518ff5b51ec5:owner --> |
| Failure·missing output·cleanup 처리 | <!-- LEARNER:518ff5b51ec5:failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- LEARNER:518ff5b51ec5:guarantee --> |
| 다음 delivery commit 또는 관련 test 연결 | <!-- LEARNER:518ff5b51ec5:relation --> |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** <!-- LEARNER:518ff5b51ec5:before_code -->
- **해당 SHA 핵심 코드:** <!-- LEARNER:518ff5b51ec5:excerpt -->
- **관찰 근거의 성격:** <!-- LEARNER:518ff5b51ec5:evidence_kind -->
- **실행·테스트 증거:** <!-- LEARNER:518ff5b51ec5:execution -->
- **다음 commit 연결:** <!-- LEARNER:518ff5b51ec5:next -->

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
| 직전 전달 상태와 부족함 | <!-- LEARNER:57a1b0876941:previous --> |
| 실제 변경 file/symbol/command/artifact | <!-- LEARNER:57a1b0876941:changed --> |
| Build/runtime/resource owner와 lifetime | <!-- LEARNER:57a1b0876941:owner --> |
| Failure·missing output·cleanup 처리 | <!-- LEARNER:57a1b0876941:failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- LEARNER:57a1b0876941:guarantee --> |
| 다음 delivery commit 또는 관련 test 연결 | <!-- LEARNER:57a1b0876941:relation --> |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** <!-- LEARNER:57a1b0876941:before_code -->
- **해당 SHA 핵심 코드:** <!-- LEARNER:57a1b0876941:excerpt -->
- **관찰 근거의 성격:** <!-- LEARNER:57a1b0876941:evidence_kind -->
- **실행·테스트 증거:** <!-- LEARNER:57a1b0876941:execution -->
- **다음 commit 연결:** <!-- LEARNER:57a1b0876941:next -->

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
| 직전 전달 상태와 부족함 | <!-- LEARNER:6ac1ea4b5055:previous --> |
| 실제 변경 file/symbol/command/artifact | <!-- LEARNER:6ac1ea4b5055:changed --> |
| Build/runtime/resource owner와 lifetime | <!-- LEARNER:6ac1ea4b5055:owner --> |
| Failure·missing output·cleanup 처리 | <!-- LEARNER:6ac1ea4b5055:failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- LEARNER:6ac1ea4b5055:guarantee --> |
| 다음 delivery commit 또는 관련 test 연결 | <!-- LEARNER:6ac1ea4b5055:relation --> |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** <!-- LEARNER:6ac1ea4b5055:before_code -->
- **해당 SHA 핵심 코드:** <!-- LEARNER:6ac1ea4b5055:excerpt -->
- **관찰 근거의 성격:** <!-- LEARNER:6ac1ea4b5055:evidence_kind -->
- **실행·테스트 증거:** <!-- LEARNER:6ac1ea4b5055:execution -->
- **다음 commit 연결:** <!-- LEARNER:6ac1ea4b5055:next -->

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
| 직전 전달 상태와 부족함 | <!-- LEARNER:1529ccf225c1:previous --> |
| 실제 변경 file/symbol/command/artifact | <!-- LEARNER:1529ccf225c1:changed --> |
| Build/runtime/resource owner와 lifetime | <!-- LEARNER:1529ccf225c1:owner --> |
| Failure·missing output·cleanup 처리 | <!-- LEARNER:1529ccf225c1:failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- LEARNER:1529ccf225c1:guarantee --> |
| 다음 delivery commit 또는 관련 test 연결 | <!-- LEARNER:1529ccf225c1:relation --> |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** <!-- LEARNER:1529ccf225c1:before_code -->
- **해당 SHA 핵심 코드:** <!-- LEARNER:1529ccf225c1:excerpt -->
- **관찰 근거의 성격:** <!-- LEARNER:1529ccf225c1:evidence_kind -->
- **실행·테스트 증거:** <!-- LEARNER:1529ccf225c1:execution -->
- **다음 commit 연결:** <!-- LEARNER:1529ccf225c1:next -->

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
| 직전 전달 상태와 부족함 | <!-- LEARNER:f1c72dfdd16a:previous --> |
| 실제 변경 file/symbol/command/artifact | <!-- LEARNER:f1c72dfdd16a:changed --> |
| Build/runtime/resource owner와 lifetime | <!-- LEARNER:f1c72dfdd16a:owner --> |
| Failure·missing output·cleanup 처리 | <!-- LEARNER:f1c72dfdd16a:failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- LEARNER:f1c72dfdd16a:guarantee --> |
| 다음 delivery commit 또는 관련 test 연결 | <!-- LEARNER:f1c72dfdd16a:relation --> |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** <!-- LEARNER:f1c72dfdd16a:before_code -->
- **해당 SHA 핵심 코드:** <!-- LEARNER:f1c72dfdd16a:excerpt -->
- **관찰 근거의 성격:** <!-- LEARNER:f1c72dfdd16a:evidence_kind -->
- **실행·테스트 증거:** <!-- LEARNER:f1c72dfdd16a:execution -->
- **다음 commit 연결:** <!-- LEARNER:f1c72dfdd16a:next -->

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
| 직전 전달 상태와 부족함 | <!-- LEARNER:4e8f95249481:previous --> |
| 실제 변경 file/symbol/command/artifact | <!-- LEARNER:4e8f95249481:changed --> |
| Build/runtime/resource owner와 lifetime | <!-- LEARNER:4e8f95249481:owner --> |
| Failure·missing output·cleanup 처리 | <!-- LEARNER:4e8f95249481:failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- LEARNER:4e8f95249481:guarantee --> |
| 다음 delivery commit 또는 관련 test 연결 | <!-- LEARNER:4e8f95249481:relation --> |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** <!-- LEARNER:4e8f95249481:before_code -->
- **해당 SHA 핵심 코드:** <!-- LEARNER:4e8f95249481:excerpt -->
- **관찰 근거의 성격:** <!-- LEARNER:4e8f95249481:evidence_kind -->
- **실행·테스트 증거:** <!-- LEARNER:4e8f95249481:execution -->
- **다음 commit 연결:** <!-- LEARNER:4e8f95249481:next -->

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
| 직전 전달 상태와 부족함 | <!-- LEARNER:abbd530368a0:previous --> |
| 실제 변경 file/symbol/command/artifact | <!-- LEARNER:abbd530368a0:changed --> |
| Build/runtime/resource owner와 lifetime | <!-- LEARNER:abbd530368a0:owner --> |
| Failure·missing output·cleanup 처리 | <!-- LEARNER:abbd530368a0:failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- LEARNER:abbd530368a0:guarantee --> |
| 다음 delivery commit 또는 관련 test 연결 | <!-- LEARNER:abbd530368a0:relation --> |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** <!-- LEARNER:abbd530368a0:before_code -->
- **해당 SHA 핵심 코드:** <!-- LEARNER:abbd530368a0:excerpt -->
- **관찰 근거의 성격:** <!-- LEARNER:abbd530368a0:evidence_kind -->
- **실행·테스트 증거:** <!-- LEARNER:abbd530368a0:execution -->
- **다음 commit 연결:** <!-- LEARNER:abbd530368a0:next -->

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
| 직전 전달 상태와 부족함 | <!-- LEARNER:a39856cf734a:previous --> |
| 실제 변경 file/symbol/command/artifact | <!-- LEARNER:a39856cf734a:changed --> |
| Build/runtime/resource owner와 lifetime | <!-- LEARNER:a39856cf734a:owner --> |
| Failure·missing output·cleanup 처리 | <!-- LEARNER:a39856cf734a:failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- LEARNER:a39856cf734a:guarantee --> |
| 다음 delivery commit 또는 관련 test 연결 | <!-- LEARNER:a39856cf734a:relation --> |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** <!-- LEARNER:a39856cf734a:before_code -->
- **해당 SHA 핵심 코드:** <!-- LEARNER:a39856cf734a:excerpt -->
- **관찰 근거의 성격:** <!-- LEARNER:a39856cf734a:evidence_kind -->
- **실행·테스트 증거:** <!-- LEARNER:a39856cf734a:execution -->
- **다음 commit 연결:** <!-- LEARNER:a39856cf734a:next -->

## 6. Invariant ledger

| Invariant | 이전 상태 | 도입·수정 | 검증·소비 | 남은 비보장 |
| --- | --- | --- | --- | --- |
| Manifest trust | <!-- LEARNER:ledger:1:before --> | <!-- LEARNER:ledger:1:change --> | <!-- LEARNER:ledger:1:verify --> | <!-- LEARNER:ledger:1:gap --> |
| Route byte accounting | <!-- LEARNER:ledger:2:before --> | <!-- LEARNER:ledger:2:change --> | <!-- LEARNER:ledger:2:verify --> | <!-- LEARNER:ledger:2:gap --> |
| Baseline governance | <!-- LEARNER:ledger:3:before --> | <!-- LEARNER:ledger:3:change --> | <!-- LEARNER:ledger:3:verify --> | <!-- LEARNER:ledger:3:gap --> |
| Lab performance | <!-- LEARNER:ledger:4:before --> | <!-- LEARNER:ledger:4:change --> | <!-- LEARNER:ledger:4:verify --> | <!-- LEARNER:ledger:4:gap --> |
| Measurement provenance | <!-- LEARNER:ledger:5:before --> | <!-- LEARNER:ledger:5:change --> | <!-- LEARNER:ledger:5:verify --> | <!-- LEARNER:ledger:5:gap --> |

## 7. Failure → Fix → Test 연결

| Failure 또는 위험 | Fix/decision | Test·gate evidence | 한계 |
| --- | --- | --- | --- |
| generated manifest를 plain JSON/eval로 오해 | <!-- LEARNER:failure:1:fix --> | <!-- LEARNER:failure:1:test --> | <!-- LEARNER:failure:1:limit --> |
| route/asset가 사라져 낮은 숫자로 오인 | <!-- LEARNER:failure:2:fix --> | <!-- LEARNER:failure:2:test --> | <!-- LEARNER:failure:2:limit --> |
| routine check가 baseline을 자동 승인 | <!-- LEARNER:failure:3:fix --> | <!-- LEARNER:failure:3:test --> | <!-- LEARNER:failure:3:limit --> |
| Lighthouse config threshold가 약화 | <!-- LEARNER:failure:4:fix --> | <!-- LEARNER:failure:4:test --> | <!-- LEARNER:failure:4:limit --> |
| local gate가 integration에서 누락 | <!-- LEARNER:failure:5:fix --> | <!-- LEARNER:failure:5:test --> | <!-- LEARNER:failure:5:limit --> |

## 8. Ownership / state / responsibility 변화

| 대상 | 이전 owner/state | 중간 변화 | 최종 owner/state |
| --- | --- | --- | --- |
| Generated manifest interpretation | <!-- LEARNER:owner:1:before --> | <!-- LEARNER:owner:1:middle --> | <!-- LEARNER:owner:1:final --> |
| Route bytes | <!-- LEARNER:owner:2:before --> | <!-- LEARNER:owner:2:middle --> | <!-- LEARNER:owner:2:final --> |
| Accepted growth state | <!-- LEARNER:owner:3:before --> | <!-- LEARNER:owner:3:middle --> | <!-- LEARNER:owner:3:final --> |
| Lab threshold | <!-- LEARNER:owner:4:before --> | <!-- LEARNER:owner:4:middle --> | <!-- LEARNER:owner:4:final --> |
| Browser binary | <!-- LEARNER:owner:5:before --> | <!-- LEARNER:owner:5:middle --> | <!-- LEARNER:owner:5:final --> |
| Result history | <!-- LEARNER:owner:6:before --> | <!-- LEARNER:owner:6:middle --> | <!-- LEARNER:owner:6:final --> |

## 9. Thread 최종 상태

<!-- LEARNER:thread:final_state -->

## 10. 최종 product-delivery flow 정리

<!-- LEARNER:thread:flow -->

## 11. 학습 완료 자가 점검

- [ ] parser가 code execution 없이 generated wrapper payload만 해석하는 방식을 설명했습니다.
- [ ] route byte accounting의 shared/route/dedup/non-inlined 규칙과 비측정 범위를 기록했습니다.
- [ ] baseline write와 routine check의 ownership을 분리했습니다.
- [ ] desktop Lighthouse matrix/threshold와 mobile observation-only 상태를 구분했습니다.
- [ ] CI가 actual gate를 실행하지만 summary file을 자동 갱신하지 않는다고 기록했습니다.
- [ ] Exact-SHA runtime command를 직접 실행했다면 command, environment와 실제 결과를 기록했습니다. 실행하지 못했다면 이유를 명시했습니다.
