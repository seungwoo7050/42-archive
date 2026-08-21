# Thread: Fail-closed content ingestion

> Project: 42 Archive Portfolio (`web/portfolio`)
>
> 이 문서는 source에서 확정된 thread 구조와 commit 역할만 미리 제공합니다. 실제 구현 해석, code evidence, failure 재현, test 결과, 최종 설명은 해당 SHA의 코드를 직접 확인해 작성합니다.

## 1. Thread 목표

타입 단언에 의존하던 JSON 입력이 파일별 schema 파싱, 누적 진단, 저장소 전체 참조 검증, 검증된 facade, 자산 경계, prebuild 차단으로 발전하는 과정을 복원합니다.

**Source-defined significance**

> The project evolves from typed-but-asserted JSON to a fail-closed ingestion system. File schemas, aggregate diagnostics, global identity rules, facade integration, asset containment, and prebuild enforcement successively remove places where invalid editorial data could survive into rendering.

### 이 Thread에 직접 연결되는 Critical Invariants

- 모든 authoritative content source는 consumer 이전에 schema parsing을 통과합니다. — `a944c73f0557 → d50870c8b8c4 → 03d2c9be0a43`
- Validation issue는 source file과 JSON path를 잃지 않고 누적됩니다. — `70e49ea34194 → d50870c8b8c4`
- Identifier와 ordering key는 repository 전체에서 결정적으로 해석됩니다. — `b9d74d8ccf08`
- Selectors와 routes는 검증된 facade만 소비합니다. — `508e0b71024b`
- Local asset은 public root 내부에 존재해야 하며 경계를 벗어날 수 없습니다. — `ff2ecadf3489`
- 잘못된 content는 production compilation 전에 build를 중단합니다. — `28b0db56190f`

### 연결되는 Major Engineering Difficulty

- Unchecked JSON과 broad application model을 strict schemas, aggregate validation, validated facade로 이동하면서 기존 route를 깨뜨리지 않는 문제
- Malformed value, duplicate identity, unresolved reference, unsupported route, missing/escaping asset를 하나의 actionable report로 축적하는 문제

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 어느 시점부터 원시 JSON이 application data가 되기 전에 반드시 거치는 단일 경계가 생겼는가?
- 파일 내부 shape 오류와 파일 간 identifier/reference 오류는 각각 어느 계층이 소유하는가?
- Source file과 JSON path를 유지한 채 여러 문제를 모으는 흐름은 어떻게 구성되는가?
- 검증된 source와 portfolio facade 사이에 병렬 ingestion 경로가 남지 않았음을 어떤 코드로 확인할 수 있는가?
- Local asset과 production build가 같은 trust boundary에 포함되는 시점은 언제인가?

## 3. 완료 기준

- `raw JSON → schema output → repository-wide checks → portfolio facade → selectors/routes` 흐름을 실제 symbol과 경로로 설명할 수 있습니다.
- Schema failure, duplicate identifier, unresolved reference, escaping/missing asset의 owner를 구분했습니다.
- `03d2c9be0a43`과 `508e0b71024b`의 S-level 경계를 구분해 설명할 수 있습니다.
- `28b0db56190f`에서 validation failure가 Next.js compilation 이전 build failure로 전파되는 command chain을 기록했습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Source에서 확정된 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `a1977dc7f026` | build(content): runtime 콘텐츠 검증 의존성 추가 | B | CONTENT, VALIDATION, DEPLOY | Introduces the executable schema/tooling prerequisites. |
| 2 | `a944c73f0557` | feat(content): 프로젝트 사례 schema 추가 | A | CONTENT, VALIDATION | Captures the most complete case-study source contract. |
| 3 | `70e49ea34194` | feat(content): 콘텐츠 validation 오류 모델 추가 | A | CONTENT, VALIDATION | Creates accumulated, source-located validation failures. |
| 4 | `d50870c8b8c4` | feat(content): JSON schema 파싱 경계 추가 | A | CONTENT, VALIDATION | Turns raw JSON into schema output at a single parsing boundary. |
| 5 | `03d2c9be0a43` | feat(content): 콘텐츠 파일 schema 파싱 연결 | S | ARCH, CONTENT, VALIDATION | Makes that boundary authoritative for every source file. |
| 6 | `b9d74d8ccf08` | feat(content): 콘텐츠 식별자 중복 검증 추가 | A | CONTENT, VALIDATION | Makes repository-wide references deterministic. |
| 7 | `508e0b71024b` | refactor(content): 검증된 콘텐츠를 portfolio facade에 연결 | S | ARCH, CONTENT, VALIDATION | Moves all application consumers onto the validated pipeline. |
| 8 | `ff2ecadf3489` | feat(content): 저장소 자산 참조 경계 검증 | A | CONTENT, VALIDATION | Extends integrity to repository-hosted assets. |
| 9 | `28b0db56190f` | build(content): 콘텐츠 검사를 prebuild에 연결 | A | CONTENT, DEPLOY | Makes invalid content a production-build failure. |

## 5. Commit별 학습 기록

각 section은 반드시 해당 SHA를 checkout한 상태에서 작성합니다. Thread 내 이전 commit은 비교 대상으로 사용할 수 있지만 final HEAD를 정답처럼 소급하지 않습니다.

### 1. `a1977dc7f026` — build(content): runtime 콘텐츠 검증 의존성 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION, DEPLOY
- **Source-defined thread role:** Introduces the executable schema/tooling prerequisites.
- **Source classification summary:** Add Zod as a runtime dependency and `tsx` as a development-time TypeScript runner, with the generated lockfile updated to capture their complete platform-specific resolution graph.
- **Source classification reason:** Supporting build or maintenance work inside the established release process; useful, but not a defining architectural or correctness decision.

#### Source에서 확정된 구현 의도와 상태 변화

Zod와 TypeScript 실행 도구를 추가해 runtime schema와 standalone validation tooling을 구현할 수 있는 기반을 마련합니다. 핵심 결정은 generated lockfile이 아니라 manifest의 dependency 경계입니다.

#### 해당 SHA에서 확인할 실제 코드

- Package manifest에서 Zod와 `tsx`가 각각 runtime/development dependency로 들어간 위치를 확인합니다.
- 이 SHA의 scripts를 확인해 아직 어떤 validation entry point가 존재하지 않는지 구분합니다.
- Lockfile의 기계적 dependency resolution과 사람이 검토해야 할 manifest 결정을 나눕니다.
- 직전 SHA와 비교해 application runtime behavior에는 아직 schema parsing이 추가되지 않았음을 확인합니다.

확인 원칙:

- 먼저 `a1977dc7f026^`와 `a1977dc7f026`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 이 dependency commit이 가능하게 한 후속 작업 | `a944c73f0557`이 실제 project source schema를 추가해 의존성을 첫 runtime contract로 사용합니다. |
| Runtime dependency와 dev-only runner의 lifecycle 차이 | Zod는 application/runtime validation이 소유하고 `tsx`는 repository command 실행 시점에만 필요합니다. |
| Lockfile이 제공하는 reproducibility evidence와 제공하지 않는 architecture 설명 | schema 정의, parsing, diagnostics, build gate는 보장하지 않습니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** `package.json`에는 runtime schema library와 TypeScript validation runner가 없었고, content check script도 없었습니다.
- **해당 SHA 핵심 코드:** `package.json`의 `dependencies.zod`, `devDependencies.tsx`가 사람이 결정한 변경이고 `package-lock.json`은 그 해상도 결과입니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `a944c73f0557`이 실제 project source schema를 추가해 의존성을 첫 runtime contract로 사용합니다.

#### SHA별 복원 결론

- **Thread 내 역할:** Zod를 runtime dependency로, `tsx`를 development dependency로 추가했습니다.
- **실제 변경:** `package.json`의 `dependencies.zod`, `devDependencies.tsx`가 사람이 결정한 변경이고 `package-lock.json`은 그 해상도 결과입니다.
- **현재 보장:** pinned manifest와 lockfile이 이후 schema/tooling을 재현 가능하게 설치할 기반을 제공합니다.
- **남은 범위:** schema 정의, parsing, diagnostics, build gate는 보장하지 않습니다. `a944c73f0557`이 실제 project source schema를 추가해 의존성을 첫 runtime contract로 사용합니다.

### 2. `a944c73f0557` — feat(content): 프로젝트 사례 schema 추가

- **Importance:** A
- **Tags:** CONTENT, VALIDATION
- **Source-defined thread role:** Captures the most complete case-study source contract.
- **Source classification summary:** Define the complete runtime schema for project case-study sources and the enclosing project catalog.
- **Source classification reason:** Significant because it strengthens the shared content trust boundary or a cross-file invariant used by every route, rather than validating one local component.

#### Source에서 확정된 구현 의도와 상태 변화

Project case-study source와 enclosing catalog를 strict runtime schema로 정의합니다. Group, tag, deployment, media, stack, links, architecture, decisions, trade-offs, results를 실행 가능한 input contract로 묶습니다.

#### 해당 SHA에서 확인할 실제 코드

- Project group, project item, enclosing document schema의 중첩 관계와 strict object 경계를 찾습니다.
- Stable ID, order, non-empty group/project collection, optional enablement/featured field를 실제 schema로 확인합니다.
- Screenshot, stack reference, placement-aware link, deployment 상태가 어느 schema를 재사용하는지 추적합니다.
- Schema-derived TypeScript type 또는 기존 hand-written type과의 연결 상태를 확인합니다.
- 이 schema가 shape는 보장하지만 cross-file reference는 아직 보장하지 않는다는 근거를 기록합니다.

확인 원칙:

- 먼저 `a944c73f0557^`와 `a944c73f0557`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Project list와 detail renderer가 공통으로 의존하는 field 집합 | `src/lib/content-schema.ts`의 project 관련 schemas가 group ID/order, project ID/order, screenshot, links, stack, architecture, decisions, trade-offs, results를 중첩 검증합니다. |
| 필수/선택/default field 구분 | project group/item/catalog를 strict Zod object로 정의하고 collection의 non-empty 조건과 필수·선택 field를 명시했습니다. |
| Schema가 보장하는 것과 아직 보장하지 않는 reference | cross-file reference, uniqueness, asset existence와 모든 consumer의 사용은 보장하지 않습니다. |
| 직전 관련 schema commit과 비교한 확장 지점 | Project JSON은 TypeScript 측 타입과 소비자 가정에 의존했고 runtime에서 중첩 shape를 검사하지 않았습니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** Project JSON은 TypeScript 측 타입과 소비자 가정에 의존했고 runtime에서 중첩 shape를 검사하지 않았습니다.
- **해당 SHA 핵심 코드:** `src/lib/content-schema.ts`의 project 관련 schemas가 group ID/order, project ID/order, screenshot, links, stack, architecture, decisions, trade-offs, results를 중첩 검증합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `70e49ea34194`와 `d50870c8b8c4`가 실패 위치를 보존하고 schema를 실제 parsing boundary로 만듭니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** Project JSON은 TypeScript 측 타입과 소비자 가정에 의존했고 runtime에서 중첩 shape를 검사하지 않았습니다. case-study의 group, media, deployment, stack, decision, result 중 하나만 틀려도 renderer까지 잘못된 값이 도달할 수 있었습니다.
- **구현 결정과 경로:** project group/item/catalog를 strict Zod object로 정의하고 collection의 non-empty 조건과 필수·선택 field를 명시했습니다. `src/lib/content-schema.ts`의 project 관련 schemas가 group ID/order, project ID/order, screenshot, links, stack, architecture, decisions, trade-offs, results를 중첩 검증합니다.
- **소유권·실패 처리:** schema는 한 project source의 구조를 소유하지만 다른 파일의 ID가 실제 존재하는지는 소유하지 않습니다. shape, enum, required/non-empty 조건 위반은 schema parse failure가 되도록 준비됐지만 이 SHA에는 전체 loader 연결이 없습니다.
- **보장:** 해당 schema를 통과한 project source의 파일 내부 runtime shape를 표현할 수 있습니다.
- **보장하지 않는 범위:** cross-file reference, uniqueness, asset existence와 모든 consumer의 사용은 보장하지 않습니다.
- **후속 연결:** `70e49ea34194`와 `d50870c8b8c4`가 실패 위치를 보존하고 schema를 실제 parsing boundary로 만듭니다.

### 3. `70e49ea34194` — feat(content): 콘텐츠 validation 오류 모델 추가

- **Importance:** A
- **Tags:** CONTENT, VALIDATION
- **Source-defined thread role:** Creates accumulated, source-located validation failures.
- **Source classification summary:** Introduced the structured error model and source inventory for runtime content validation.
- **Source classification reason:** Significant because it strengthens the shared content trust boundary or a cross-file invariant used by every route, rather than validating one local component.

#### Source에서 확정된 구현 의도와 상태 변화

Validation issue에 source file, JSON path, message를 보존하고 여러 issue를 한 `PortfolioContentError`로 표현하는 오류 모델과 source inventory를 도입합니다.

#### 해당 SHA에서 확인할 실제 코드

- Issue type과 aggregate error class의 fields, constructor, message formatting을 확인합니다.
- Complete issue array와 human-readable message가 어떻게 분리되는지 확인합니다.
- Schema-backed source 이름과 override 가능한 input inventory를 찾습니다.
- Supported design과 navigable page 목록이 후속 validation을 위해 어떻게 표현되는지 확인합니다.
- 이 commit에서는 실제 schema parsing이 아직 연결되지 않은 경계를 기록합니다.

확인 원칙:

- 먼저 `70e49ea34194^`와 `70e49ea34194`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Throw-on-first-error 대신 issue accumulation을 선택한 이유 | `PortfolioContentValidationIssue`와 issue 배열을 보존하는 `PortfolioContentError`를 도입했습니다. |
| Source inventory가 후속 validator에 제공하는 context | `d50870c8b8c4`가 Zod issue를 이 모델로 변환합니다. |
| Machine-readable issue와 human-readable error text 구분 | `src/lib/content-loader.ts`의 issue type/error class, 14개 source inventory, supported design/navigation inventory가 후속 validator가 사용할 context를 만듭니다. |
| 아직 실제 issue를 생성하지 않는 부분 | 실제 parsing, file 간 누적 범위, uniqueness 검사는 보장하지 않습니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 검증 실패를 source file과 JSON path 단위로 보존하는 공통 오류 모델이 없었습니다.
- **해당 SHA 핵심 코드:** `src/lib/content-loader.ts`의 issue type/error class, 14개 source inventory, supported design/navigation inventory가 후속 validator가 사용할 context를 만듭니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `d50870c8b8c4`가 Zod issue를 이 모델로 변환합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** 검증 실패를 source file과 JSON path 단위로 보존하는 공통 오류 모델이 없었습니다. 일반 예외나 즉시 throw만 사용하면 여러 편집 오류를 한 번에 고치기 어렵고 발생 위치도 잃기 쉽습니다.
- **구현 결정과 경로:** `PortfolioContentValidationIssue`와 issue 배열을 보존하는 `PortfolioContentError`를 도입했습니다. `src/lib/content-loader.ts`의 issue type/error class, 14개 source inventory, supported design/navigation inventory가 후속 validator가 사용할 context를 만듭니다.
- **소유권·실패 처리:** machine-readable issue 배열은 validator가 만들고 human-readable message는 aggregate error가 조립합니다. 아직 schema parser가 호출되지 않아 이 모델 자체는 실제 issue를 생성하지 않습니다.
- **보장:** 후속 실패가 `file/path/message`를 잃지 않고 한 error에 담길 protocol을 제공합니다.
- **보장하지 않는 범위:** 실제 parsing, file 간 누적 범위, uniqueness 검사는 보장하지 않습니다.
- **후속 연결:** `d50870c8b8c4`가 Zod issue를 이 모델로 변환합니다.

### 4. `d50870c8b8c4` — feat(content): JSON schema 파싱 경계 추가

- **Importance:** A
- **Tags:** CONTENT, VALIDATION
- **Source-defined thread role:** Turns raw JSON into schema output at a single parsing boundary.
- **Source classification summary:** Added the schema-parsing boundary that converts raw JSON into typed application data.
- **Source classification reason:** Significant because it strengthens the shared content trust boundary or a cross-file invariant used by every route, rather than validating one local component.

#### Source에서 확정된 구현 의도와 상태 변화

`parseContentFile`이 raw JSON과 schema를 받아 `safeParse`를 실행하고, Zod issue를 source-aware issue로 변환하거나 schema output을 반환하는 ingestion primitive를 만듭니다.

#### 해당 SHA에서 확인할 실제 코드

- `parseContentFile`의 generic input/output type과 schema output 반환을 확인합니다.
- `safeParse` success/failure branch의 control flow를 추적합니다.
- Zod path를 JSON-style path로 바꾸고 source filename과 결합하는 호출을 찾습니다.
- 한 파일의 여러 issue가 aggregate error로 바뀌는 순서와 throw 지점을 확인합니다.
- Assertion/cast 없이 consumer가 받는 validated value의 type을 기록합니다.

확인 원칙:

- 먼저 `d50870c8b8c4^`와 `d50870c8b8c4`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Raw input ownership에서 validated output ownership으로 넘어가는 함수 경계 | 함수 호출 전 raw value는 caller 소유이고 성공 후에는 schema transformation/default가 반영된 output만 반환됩니다. |
| Schema transformation/default가 output에 반영되는 방식 | `parseContentFile`을 단일 file-local parsing primitive로 만들었습니다. `src/lib/content-loader.ts::parseContentFile`은 `schema.safeParse(raw)`를 호출하고 성공 시 schema output, 실패 시 Zod path를 JSON-style path로 바꾼 issue 배열을 `PortfolioContentError`로 throw합니다. |
| Failure 시 반환되지 않는 값과 보존되는 diagnostics | 모든 authoritative file이 이 함수를 사용한다는 사실은 아직 보장하지 않습니다. |
| 아직 모든 source가 이 함수를 반드시 사용한다고 보장하지 않는 이유 | 모든 authoritative file이 이 함수를 사용한다는 사실은 아직 보장하지 않습니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** schema와 error model이 존재했지만 raw JSON을 반드시 통과시키는 공통 함수는 없었습니다.
- **해당 SHA 핵심 코드:** `src/lib/content-loader.ts::parseContentFile`은 `schema.safeParse(raw)`를 호출하고 성공 시 schema output, 실패 시 Zod path를 JSON-style path로 바꾼 issue 배열을 `PortfolioContentError`로 throw합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `03d2c9be0a43`이 14개 source를 모두 이 함수에 연결합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** schema와 error model이 존재했지만 raw JSON을 반드시 통과시키는 공통 함수는 없었습니다. 소비자가 schema를 선택적으로 사용하면 unchecked JSON path가 계속 남을 수 있었습니다.
- **구현 결정과 경로:** `parseContentFile`을 단일 file-local parsing primitive로 만들었습니다. `src/lib/content-loader.ts::parseContentFile`은 `schema.safeParse(raw)`를 호출하고 성공 시 schema output, 실패 시 Zod path를 JSON-style path로 바꾼 issue 배열을 `PortfolioContentError`로 throw합니다.
- **소유권·실패 처리:** 함수 호출 전 raw value는 caller 소유이고 성공 후에는 schema transformation/default가 반영된 output만 반환됩니다. 한 파일에서 발생한 모든 Zod issue를 모은 뒤 throw하며 실패한 raw/output은 반환하지 않습니다.
- **보장:** 이 함수를 통과한 단일 파일의 output은 해당 schema에 의해 runtime 검증됩니다.
- **보장하지 않는 범위:** 모든 authoritative file이 이 함수를 사용한다는 사실은 아직 보장하지 않습니다.
- **후속 연결:** `03d2c9be0a43`이 14개 source를 모두 이 함수에 연결합니다.

### 5. `03d2c9be0a43` — feat(content): 콘텐츠 파일 schema 파싱 연결

- **Importance:** S
- **Tags:** ARCH, CONTENT, VALIDATION
- **Source-defined thread role:** Makes that boundary authoritative for every source file.
- **Source classification summary:** Connected every portfolio content file to its corresponding runtime schema through a single loader.
- **Source classification reason:** Critical because it makes one loader the authoritative trust boundary for every content file; without it, the later integrity, route, and build guarantees would still rest on unchecked JSON.

#### Source에서 확정된 구현 의도와 상태 변화

모든 portfolio content file을 각 schema와 source name으로 파싱하는 `loadPortfolioSource`를 만들고 validated value만 application model에 노출합니다. Targeted override도 같은 ingestion 경계를 사용합니다.

#### S-level source profile

- **Problem:** Typed JSON file이 많아도 TypeScript type만으로 malformed runtime data가 selector와 route에 도달하는 것을 막을 수 없었습니다.
- **Decision:** 모든 authoritative file을 각 schema와 source name으로 `loadPortfolioSource`에서 파싱하고 schema output만 반환합니다.
- **Why it mattered:** Schema 정의를 선택적 도구가 아니라 유일한 ingestion path로 바꾸며 이후 uniqueness, reference, asset, readiness, build guarantee의 기반이 됩니다.
- **What changed:** Default JSON modules와 targeted override를 한 loader에서 조립하고 file-local error를 consumption 이전에 보고합니다.

#### 해당 SHA에서 확인할 실제 코드

- `loadPortfolioSource`가 default JSON modules와 targeted overrides를 조립하는 순서를 추적합니다.
- 각 file name이 어떤 schema와 `parseContentFile` 호출에 연결되는지 전체 목록을 작성합니다.
- 여러 file parse가 실패할 때 issue가 파일 경계를 넘어 어떻게 합쳐지는지 확인합니다.
- Successful return type이 schema output에서 파생되는지 확인합니다.
- Exported singleton 또는 authoritative source가 어디서 만들어지는지 찾습니다.
- 이 SHA에서 raw JSON direct import 우회가 남아 있는지 검색하되 후속 facade migration 전 상태와 구분합니다.
- Override input의 lifetime과 production source 격리를 확인합니다.

확인 원칙:

- 먼저 `03d2c9be0a43^`와 `03d2c9be0a43`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태: schema와 parser가 있었지만 all-file authoritative loader가 없었던 call graph | `parseContentFile`은 존재했지만 raw JSON direct import를 대체하는 all-file loader가 없어 선택적 도구에 머물렀습니다. |
| 어떤 source가 validation을 건너뛸 수 있었는지 | `parseContentFile`은 존재했지만 raw JSON direct import를 대체하는 all-file loader가 없어 선택적 도구에 머물렀습니다. |
| File-to-schema mapping과 single loader decision | `loadPortfolioSource(overrides = {})`에서 모든 authoritative JSON과 schema/source name의 mapping을 고정하고 `portfolioSource` singleton을 만들었습니다. |
| 핵심 loader/parser/output type/export code | `src/lib/content-loader.ts::loadPortfolioSource`가 site/profile/projects/presentation/skills/techStack/experience/journey/journeyNarrative/interviewMap/curation/links/contact/resume를 각각 `parseContentFile`로 처리합니다. Override도 같은 parser를 통과합니다. |
| 한 파일/여러 파일 malformed일 때 failure path | 중요한 실제 한계가 있습니다. `parseContentFile`이 파일별 실패에서 즉시 throw하므로 한 파일 내부 issue는 누적되지만 여러 파일이 동시에 malformed이면 첫 실패 파일에서 loader가 중단됩니다. |
| 보장하는 것: loader output의 runtime shape validation | loader output에 포함된 모든 source의 파일 내부 runtime shape가 검증됩니다. |
| 아직 보장하지 않는 것: uniqueness/reference/asset/facade consumer migration | repository-wide uniqueness/reference, asset, facade consumer migration과 cross-file parse-error aggregation은 아직 보장하지 않습니다. |
| 다음 commit과의 연결 | `b9d74d8ccf08`이 repository-wide key validation을 추가하고 `508e0b71024b`가 consumer를 이 output으로 이동합니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** `parseContentFile`은 존재했지만 raw JSON direct import를 대체하는 all-file loader가 없어 선택적 도구에 머물렀습니다.
- **해당 SHA 핵심 코드:** `src/lib/content-loader.ts::loadPortfolioSource`가 site/profile/projects/presentation/skills/techStack/experience/journey/journeyNarrative/interviewMap/curation/links/contact/resume를 각각 `parseContentFile`로 처리합니다. Override도 같은 parser를 통과합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `b9d74d8ccf08`이 repository-wide key validation을 추가하고 `508e0b71024b`가 consumer를 이 output으로 이동합니다.

#### SHA별 복원 결론

- **이전 상태:** `parseContentFile`은 존재했지만 raw JSON direct import를 대체하는 all-file loader가 없어 선택적 도구에 머물렀습니다.
- **문제와 위험:** schema가 있어도 source 하나가 parser를 우회하면 전체 application trust boundary가 성립하지 않습니다.
- **핵심 결정:** `loadPortfolioSource(overrides = {})`에서 모든 authoritative JSON과 schema/source name의 mapping을 고정하고 `portfolioSource` singleton을 만들었습니다.
- **실제 구현 경로:** `src/lib/content-loader.ts::loadPortfolioSource`가 site/profile/projects/presentation/skills/techStack/experience/journey/journeyNarrative/interviewMap/curation/links/contact/resume를 각각 `parseContentFile`로 처리합니다. Override도 같은 parser를 통과합니다.
- **소유권·상태 변화:** default JSON module 또는 targeted override는 loader input이고, 성공한 `PortfolioSource`만 이후 계층으로 넘어갑니다.
- **실패 경계:** 중요한 실제 한계가 있습니다. `parseContentFile`이 파일별 실패에서 즉시 throw하므로 한 파일 내부 issue는 누적되지만 여러 파일이 동시에 malformed이면 첫 실패 파일에서 loader가 중단됩니다.
- **보장:** loader output에 포함된 모든 source의 파일 내부 runtime shape가 검증됩니다.
- **보장하지 않는 범위:** repository-wide uniqueness/reference, asset, facade consumer migration과 cross-file parse-error aggregation은 아직 보장하지 않습니다.
- **후속 fix/test:** `b9d74d8ccf08`이 repository-wide key validation을 추가하고 `508e0b71024b`가 consumer를 이 output으로 이동합니다.

### 6. `b9d74d8ccf08` — feat(content): 콘텐츠 식별자 중복 검증 추가

- **Importance:** A
- **Tags:** CONTENT, VALIDATION
- **Source-defined thread role:** Makes repository-wide references deterministic.
- **Source classification summary:** Added whole-repository uniqueness checks for the identifiers and ordering keys that other content records depend on.
- **Source classification reason:** Significant because it strengthens the shared content trust boundary or a cross-file invariant used by every route, rather than validating one local component.

#### Source에서 확정된 구현 의도와 상태 변화

Project group/order, metric, project/order, technology, link, journey, interview, curation, design, navigation identifiers와 ordering key 중복을 repository 전체에서 검사합니다.

#### 해당 SHA에서 확인할 실제 코드

- Duplicate helper가 repeated value를 한 번만 issue로 기록하는 방식을 확인합니다.
- 검사 대상 collection과 key selector를 source 순서대로 목록화합니다.
- Uniqueness validation이 reference validation보다 먼저 실행되는 call order를 찾습니다.
- 동일 order와 동일 ID가 어떤 source path/message로 보고되는지 비교합니다.
- 여러 collection의 collision이 한 aggregate error에 누적되는지 확인합니다.

확인 원칙:

- 먼저 `b9d74d8ccf08^`와 `b9d74d8ccf08`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Identifier가 하나의 semantic record로 결정된다는 invariant | 검사된 identifier와 ordering key가 하나의 record/position으로 결정됩니다. |
| Order collision과 identity collision 차이 | whole-repository duplicate checks를 loader 후단에 추가했습니다. |
| 세 번 이상 반복된 값의 issue cardinality | `src/lib/content-loader.ts`의 `findDuplicates` 계열 검사가 project group ID/order, metric ID, project ID/order, technology/link/milestone/interview/curation/design IDs와 navigation href를 검사합니다. |
| 아직 unresolved reference를 직접 검사하지 않는 범위 | ID가 다른 파일에서 실제로 참조되는지와 asset 존재 여부는 이 commit만으로 보장하지 않습니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 파일별 schema가 통과해도 서로 다른 record가 같은 ID나 order를 사용할 수 있었습니다.
- **해당 SHA 핵심 코드:** `src/lib/content-loader.ts`의 `findDuplicates` 계열 검사가 project group ID/order, metric ID, project ID/order, technology/link/milestone/interview/curation/design IDs와 navigation href를 검사합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `508e0b71024b`이 이 validated source를 facade의 canonical input으로 사용합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** 파일별 schema가 통과해도 서로 다른 record가 같은 ID나 order를 사용할 수 있었습니다. 중복 identity/order는 lookup, sort, cross-reference 결과를 입력 순서나 마지막 write에 의존하게 만듭니다.
- **구현 결정과 경로:** whole-repository duplicate checks를 loader 후단에 추가했습니다. `src/lib/content-loader.ts`의 `findDuplicates` 계열 검사가 project group ID/order, metric ID, project ID/order, technology/link/milestone/interview/curation/design IDs와 navigation href를 검사합니다.
- **소유권·실패 처리:** seen set이 첫 값을 소유하고 duplicates set이 중복 value를 한 번만 report 대상으로 보존합니다. 같은 값이 세 번 이상 나와도 duplicate value당 issue 하나가 생성되며 여러 collection의 issue는 최종 array에 누적됩니다.
- **보장:** 검사된 identifier와 ordering key가 하나의 record/position으로 결정됩니다.
- **보장하지 않는 범위:** ID가 다른 파일에서 실제로 참조되는지와 asset 존재 여부는 이 commit만으로 보장하지 않습니다.
- **후속 연결:** `508e0b71024b`이 이 validated source를 facade의 canonical input으로 사용합니다.

### 7. `508e0b71024b` — refactor(content): 검증된 콘텐츠를 portfolio facade에 연결

- **Importance:** S
- **Tags:** ARCH, CONTENT, VALIDATION
- **Source-defined thread role:** Moves all application consumers onto the validated pipeline.
- **Source classification summary:** Moved the portfolio facade from direct JSON imports and unchecked type assertions to the validated `portfolioSource`.
- **Source classification reason:** Critical because it completes the single validated data pipeline used by selectors and routes, replacing parallel imports and duplicated relationships with one canonical application model.

#### Source에서 확정된 구현 의도와 상태 변화

Portfolio facade가 direct JSON import와 unchecked assertion을 버리고 validated `portfolioSource`를 사용합니다. Group ID를 canonical relationship으로 삼고 metrics, links, journey, interview, curation을 한 aggregate로 노출합니다.

#### S-level source profile

- **Problem:** Schema parsing이 있어도 facade가 JSON을 직접 import해 병렬 ingestion path가 남아 있었습니다.
- **Decision:** Facade를 `portfolioSource`로 이동하고 group identifier를 canonical relationship으로 사용합니다.
- **Why it mattered:** List, detail, metrics, links, journey, interview, curation이 같은 source of truth를 사용하게 합니다.
- **What changed:** Direct JSON import와 presentation-layer environment substitution을 validated relationship derivation으로 대체합니다.

#### 해당 SHA에서 확인할 실제 코드

- Facade import에서 raw JSON이 제거되고 `portfolioSource`로 대체되는 diff를 확인합니다.
- Project group sorting이 한 번 수행되고 category/group copy에 재사용되는 흐름을 추적합니다.
- Environment URL substitution이 제거되거나 legacy argument가 의도적으로 무시되는 branch를 찾습니다.
- Selectors와 route-facing `PortfolioContent`가 facade output을 받는 call graph를 작성합니다.
- Journey narrative, interview map, curation, metrics의 exposure ownership을 확인합니다.
- Repository 전체에서 direct JSON import 또는 별도 assertion path가 남는지 이 SHA 기준으로 검색합니다.
- Canonical collection과 derived collection의 referential identity를 구분합니다.

확인 원칙:

- 먼저 `508e0b71024b^`와 `508e0b71024b`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 loader를 facade가 bypass하던 import/relationship | authoritative loader가 있어도 portfolio facade는 raw JSON import와 unchecked cast를 사용해 병렬 ingestion path를 유지했습니다. |
| 두 ingestion path가 다른 interpretation을 만들 수 있었던 이유 | `src/lib/portfolio/content.ts`, `src/lib/portfolio/selectors.ts`, `src/lib/portfolio/types.ts`가 validated source를 받아 group/project/journey를 정렬하고 enabled project/link를 필터링하며 metrics, narrative, interview, curation을 aggregate에 포함합니다. |
| `portfolioSource`와 group ID 중심 aggregate decision | facade input을 `portfolioSource` 하나로 바꾸고 group ID를 canonical relationship으로 사용했습니다. |
| Facade construction, sort/derive, exported API | facade input을 `portfolioSource` 하나로 바꾸고 group ID를 canonical relationship으로 사용했습니다. `src/lib/portfolio/content.ts`, `src/lib/portfolio/selectors.ts`, `src/lib/portfolio/types.ts`가 validated source를 받아 group/project/journey를 정렬하고 enabled project/link를 필터링하며 metrics, narrative, interview, curation을 aggregate에 포함합니다. |
| Raw source, canonical validated collection, derived collection ownership | loader는 canonical validated source를 소유하고 facade는 sort/filter/derived collection을 소유하며 routes/selectors는 facade만 소비합니다. |
| Disabled/missing 관계의 absence 처리 | disabled record는 derived public collection에서 제외되고 missing optional relationship은 selector/facade 정책에 따라 absence로 남습니다. Presentation-layer environment URL substitution도 제거됐습니다. |
| 보장하는 것: application consumer의 single validated pipeline | application consumer가 하나의 validated pipeline을 사용합니다. |
| 아직 보장하지 않는 것: asset containment와 prebuild enforcement | public asset containment, actual file existence와 automatic build enforcement는 아직 보장하지 않습니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** authoritative loader가 있어도 portfolio facade는 raw JSON import와 unchecked cast를 사용해 병렬 ingestion path를 유지했습니다.
- **해당 SHA 핵심 코드:** `src/lib/portfolio/content.ts`, `src/lib/portfolio/selectors.ts`, `src/lib/portfolio/types.ts`가 validated source를 받아 group/project/journey를 정렬하고 enabled project/link를 필터링하며 metrics, narrative, interview, curation을 aggregate에 포함합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `ff2ecadf3489`가 repository asset boundary를, `28b0db56190f`가 build gate를 닫습니다.

#### SHA별 복원 결론

- **이전 상태:** authoritative loader가 있어도 portfolio facade는 raw JSON import와 unchecked cast를 사용해 병렬 ingestion path를 유지했습니다.
- **문제와 위험:** loader와 facade가 같은 관계를 다르게 해석하면 route마다 검증 수준과 group membership이 달라질 수 있었습니다.
- **핵심 결정:** facade input을 `portfolioSource` 하나로 바꾸고 group ID를 canonical relationship으로 사용했습니다.
- **실제 구현 경로:** `src/lib/portfolio/content.ts`, `src/lib/portfolio/selectors.ts`, `src/lib/portfolio/types.ts`가 validated source를 받아 group/project/journey를 정렬하고 enabled project/link를 필터링하며 metrics, narrative, interview, curation을 aggregate에 포함합니다.
- **소유권·상태 변화:** loader는 canonical validated source를 소유하고 facade는 sort/filter/derived collection을 소유하며 routes/selectors는 facade만 소비합니다.
- **실패 경계:** disabled record는 derived public collection에서 제외되고 missing optional relationship은 selector/facade 정책에 따라 absence로 남습니다. Presentation-layer environment URL substitution도 제거됐습니다.
- **보장:** application consumer가 하나의 validated pipeline을 사용합니다.
- **보장하지 않는 범위:** public asset containment, actual file existence와 automatic build enforcement는 아직 보장하지 않습니다.
- **후속 fix/test:** `ff2ecadf3489`가 repository asset boundary를, `28b0db56190f`가 build gate를 닫습니다.

### 8. `ff2ecadf3489` — feat(content): 저장소 자산 참조 경계 검증

- **Importance:** A
- **Tags:** CONTENT, VALIDATION
- **Source-defined thread role:** Extends integrity to repository-hosted assets.
- **Source classification summary:** Added repository-boundary validation for every local asset referenced by portfolio content.
- **Source classification reason:** Significant because it strengthens the shared content trust boundary or a cross-file invariant used by every route, rather than validating one local component.

#### Source에서 확정된 구현 의도와 상태 변화

Social image, profile portrait, résumé download, project screenshots의 local asset reference를 source file/path와 함께 수집하고 public root containment와 실제 file existence를 검증합니다.

#### 해당 SHA에서 확인할 실제 코드

- 각 asset category와 originating JSON path를 수집하는 code를 찾습니다.
- Public URL이 filesystem path로 변환되는 순서와 public root 주입 방식을 추적합니다.
- Absolute path, root escape/path traversal, missing file을 각각 거부하는 branch를 확인합니다.
- Failure를 기존 `PortfolioContentError` issue로 누적하는 흐름을 확인합니다.
- Committed portrait placeholder가 어떤 content reference를 만족시키는지 해당 SHA에서 확인합니다.

확인 원칙:

- 먼저 `ff2ecadf3489^`와 `ff2ecadf3489`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| URL namespace와 filesystem namespace 변환 규칙 | content에서 local asset reference를 수집하고 주입된 public root 아래의 실제 file로 resolve한 뒤 containment/existence를 검사했습니다. |
| Containment 검사 전후 normalization 순서 | `src/lib/content-assets.ts`가 site social image, profile portrait, resume download, project screenshots를 source path와 함께 수집하고 `resolve`, `relative`, `existsSync`로 검사합니다. `public/template/profile/portrait-placeholder.svg`도 추가됐습니다. |
| 여러 asset issue가 한 번에 보고되는 증거 | content에서 local asset reference를 수집하고 주입된 public root 아래의 실제 file로 resolve한 뒤 containment/existence를 검사했습니다. `src/lib/content-assets.ts`가 site social image, profile portrait, resume download, project screenshots를 source path와 함께 수집하고 `resolve`, `relative`, `existsSync`로 검사합니다. `public/template/profile/portrait-placeholder.svg`도 추가됐습니다. |
| Schema path validation만으로 existence를 보장할 수 없었던 이유 | `src/lib/content-assets.ts`가 site social image, profile portrait, resume download, project screenshots를 source path와 함께 수집하고 `resolve`, `relative`, `existsSync`로 검사합니다. `public/template/profile/portrait-placeholder.svg`도 추가됐습니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** schema가 local-looking path 문자열을 허용해도 실제 public file 존재와 root containment는 확인하지 않았습니다.
- **해당 SHA 핵심 코드:** `src/lib/content-assets.ts`가 site social image, profile portrait, resume download, project screenshots를 source path와 함께 수집하고 `resolve`, `relative`, `existsSync`로 검사합니다. `public/template/profile/portrait-placeholder.svg`도 추가됐습니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `28b0db56190f`가 schema와 asset 검사를 normal build 전에 실행합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** schema가 local-looking path 문자열을 허용해도 실제 public file 존재와 root containment는 확인하지 않았습니다. 누락 파일이나 `..` 경로가 production render/build 시점까지 살아남을 수 있었습니다.
- **구현 결정과 경로:** content에서 local asset reference를 수집하고 주입된 public root 아래의 실제 file로 resolve한 뒤 containment/existence를 검사했습니다. `src/lib/content-assets.ts`가 site social image, profile portrait, resume download, project screenshots를 source path와 함께 수집하고 `resolve`, `relative`, `existsSync`로 검사합니다. `public/template/profile/portrait-placeholder.svg`도 추가됐습니다.
- **소유권·실패 처리:** content는 URL-like reference를 소유하고 validator는 filesystem translation과 public-root boundary를 소유합니다. relative 결과가 root 밖이거나 target이 없으면 issue를 누적해 `PortfolioContentError`로 throw합니다. Scaffold 표현과 달리 이 SHA는 URL의 선행 `/` 자체를 별도 branch로 거부하지 않고 `resolve` 결과의 containment/existence로 판단합니다.
- **보장:** 수집 대상 local asset이 public root를 벗어나지 않고 검사 시점에 존재함을 보장합니다.
- **보장하지 않는 범위:** MIME, decode 가능성, production readiness와 실제 HTTP serving은 보장하지 않습니다.
- **후속 연결:** `28b0db56190f`가 schema와 asset 검사를 normal build 전에 실행합니다.

### 9. `28b0db56190f` — build(content): 콘텐츠 검사를 prebuild에 연결

- **Importance:** A
- **Tags:** CONTENT, DEPLOY
- **Source-defined thread role:** Makes invalid content a production-build failure.
- **Source classification summary:** Connected the content validation command to the package's `prebuild` lifecycle.
- **Source classification reason:** Significant because it changes or hardens the reproducible production-build and runtime boundary rather than merely adjusting local tooling.

#### Source에서 확정된 구현 의도와 상태 변화

`content:check`를 package `prebuild` lifecycle에 연결해 structured content가 잘못되면 Next.js compilation 전에 production build를 중단합니다.

#### 해당 SHA에서 확인할 실제 코드

- Package scripts에서 `prebuild`, `build`, `content:check`의 exact command chain을 확인합니다.
- `content:check`가 production loader와 asset validator를 재사용하는지 추적합니다.
- 직전 SHA에서 manual command였지만 build가 강제하지 않았던 차이를 비교합니다.
- Intentional failure에서 Next compiler output 전 process가 종료되는지 실행 결과를 기록합니다.
- Success status의 project/design count와 실제 build guarantee를 구분합니다.

확인 원칙:

- 먼저 `28b0db56190f^`와 `28b0db56190f`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Build lifecycle 순서와 failure status | loader 또는 asset validator throw가 uncaught 상태로 command를 non-zero 종료시키므로 뒤의 Next compilation이 시작되지 않습니다. |
| Manual check와 automatic gate 차이 | `scripts/validate-content.ts`는 `loadPortfolioSource()`와 `validatePortfolioAssets(..., resolve(cwd, "public"))`를 호출하고 `package.json`의 `prebuild`가 `npm run content:check`를 실행합니다. |
| Structural/asset integrity는 강제하지만 production readiness는 아직 아닌 범위 | template marker, public origin, usable project/contact 같은 production publication readiness는 아직 검사하지 않습니다. |
| 재현 command와 실제 exit code/output | `scripts/validate-content.ts`는 `loadPortfolioSource()`와 `validatePortfolioAssets(..., resolve(cwd, "public"))`를 호출하고 `package.json`의 `prebuild`가 `npm run content:check`를 실행합니다. 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** content/asset validator는 수동 실행할 수 있었지만 `next build`와 강제 연결되지 않았습니다.
- **해당 SHA 핵심 코드:** `scripts/validate-content.ts`는 `loadPortfolioSource()`와 `validatePortfolioAssets(..., resolve(cwd, "public"))`를 호출하고 `package.json`의 `prebuild`가 `npm run content:check`를 실행합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** 다음 thread의 `37c0dbc079ff`이 stricter readiness를 같은 prebuild chain에 추가합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** content/asset validator는 수동 실행할 수 있었지만 `next build`와 강제 연결되지 않았습니다. 개발자가 check command를 생략하면 invalid editorial data가 production compilation에 들어갈 수 있었습니다.
- **구현 결정과 경로:** `content:check`를 만들고 package `prebuild`에서 호출하도록 연결했습니다. `scripts/validate-content.ts`는 `loadPortfolioSource()`와 `validatePortfolioAssets(..., resolve(cwd, "public"))`를 호출하고 `package.json`의 `prebuild`가 `npm run content:check`를 실행합니다.
- **소유권·실패 처리:** validation script가 production source/public root를 소유하고 npm lifecycle이 failure propagation을 소유합니다. loader 또는 asset validator throw가 uncaught 상태로 command를 non-zero 종료시키므로 뒤의 Next compilation이 시작되지 않습니다.
- **보장:** normal `npm run build`가 structural content와 local asset integrity를 선행 조건으로 가집니다.
- **보장하지 않는 범위:** template marker, public origin, usable project/contact 같은 production publication readiness는 아직 검사하지 않습니다.
- **후속 연결:** 다음 thread의 `37c0dbc079ff`이 stricter readiness를 같은 prebuild chain에 추가합니다.

## 6. Invariant ledger

| Invariant | Source에서 확인된 변화 지점 | 해당 SHA의 실제 code/test evidence | 부족함이 드러난 시점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| 모든 authoritative content source는 consumer 이전에 schema parsing을 통과합니다. | `a944c73f0557 → d50870c8b8c4 → 03d2c9be0a43` | `a944c73f0557`의 strict project schemas, `d50870c8b8c4::parseContentFile`, `03d2c9be0a43::loadPortfolioSource`의 14개 file-to-schema mapping과 exported `portfolioSource`. | `d50870c8b8c4`까지 parser는 선택적이었고 `03d2c9be0a43`에서 authoritative loader가 됐습니다. 단, 여러 파일 동시 parse failure는 첫 failing file에서 중단됩니다. | loader가 반환한 모든 authoritative source는 해당 file schema를 통과합니다. 이후 facade consumer도 이 output만 사용합니다. |
| Validation issue는 source file과 JSON path를 잃지 않고 누적됩니다. | `70e49ea34194 → d50870c8b8c4` | `PortfolioContentError.issues`, Zod issue의 `file/path/message` 변환과 JSON-style path formatter. | `70e49ea34194`에서는 protocol만 있었고 `d50870c8b8c4`부터 한 파일의 모든 Zod issue를 실제로 누적합니다. | 한 failing file의 diagnostics는 source/path를 보존합니다. File 간 shape issue까지 한 번에 모으는 것은 최종 구현도 보장하지 않습니다. |
| Identifier와 ordering key는 repository 전체에서 결정적으로 해석됩니다. | `b9d74d8ccf08` | `b9d74d8ccf08`의 seen/duplicate set과 ID/order별 issue collection. | 파일 내부 schema만 통과한 상태에서는 duplicate ID/order가 허용됐습니다. | 명시된 group/metric/project/technology/link/journey/interview/curation/design/navigation key는 duplicate value당 하나의 issue로 거부됩니다. |
| Selectors와 routes는 검증된 facade만 소비합니다. | `508e0b71024b` | `508e0b71024b`에서 facade가 raw JSON/cast 대신 `portfolioSource`를 import하고 routes/selectors가 facade output을 사용합니다. | loader가 생긴 뒤에도 facade direct imports가 병렬 path로 남아 있었습니다. | application aggregate, selectors와 routes가 하나의 validated source 및 canonical group relationship을 소비합니다. |
| Local asset은 public root 내부에 존재해야 하며 경계를 벗어날 수 없습니다. | `ff2ecadf3489` | `ff2ecadf3489::validatePortfolioAssets`의 content-derived refs, `resolve`/`relative` containment, `existsSync`와 aggregate issues. | schema path 문자열만으로는 root escape와 missing file을 알 수 없었습니다. | 수집 대상 asset은 검사 시점 public root 내부에 존재해야 합니다. MIME/HTTP serving은 별도 thread 범위입니다. |
| 잘못된 content는 production compilation 전에 build를 중단합니다. | `28b0db56190f` | `28b0db56190f`의 `content:check` script와 npm `prebuild` lifecycle. | validator가 수동 command일 때는 normal build에서 생략할 수 있었습니다. | `npm run build`는 Next compilation 전에 structural source와 asset check를 통과해야 합니다. Stricter production readiness는 후속 thread에서 추가됩니다. |

Ledger 작성 원칙:

- Source가 명시한 invariant만 사용하고 새 invariant를 확정 사실처럼 추가하지 않습니다.
- 도입, 강화, 부족함 노출, fix, regression test가 서로 다른 commit이면 각 열에 분리해 기록합니다.
- Code evidence에는 실제 field, function, branch, selector, command 또는 assertion을 적습니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 위험 | 대응 commit | 실제 수정/강화 code에서 확인할 것 | Test 또는 실행 증거 |
| --- | --- | --- | --- |
| 타입은 맞는다고 단언했지만 runtime JSON shape가 잘못됨 | d50870c8b8c4, 03d2c9be0a43 | 각 schema의 `safeParse` 결과와 structured issue 변환을 확인합니다. | Override input을 사용하는 validation scenario를 해당 SHA에서 찾습니다. |
| 서로 다른 파일이 같은 identifier/order를 선언함 | b9d74d8ccf08 | 중복 검사를 reference 검사보다 먼저 수행하는 순서와 누적 issue를 확인합니다. | 세 번 이상 반복된 값의 issue cardinality를 기록합니다. |
| Content가 public root 밖을 가리키거나 실제 파일이 없음 | ff2ecadf3489 | URL 해석, containment, absolute/escape 거부, existence check를 추적합니다. | 여러 asset failure가 한 번에 보고되는지 확인합니다. |
| 검증 command를 생략해 invalid content가 build에 포함됨 | 28b0db56190f | `prebuild`에서 동일 loader/validator와 exit status 전파를 확인합니다. | Malformed source에서 Next compilation이 시작되지 않는지 기록합니다. |

### 실제 연결 기록

- Shape failure는 `parseContentFile`, duplicate identity/order는 repository validator, asset escape/missing은 `validatePortfolioAssets`, build propagation은 npm `prebuild`가 각각 소유합니다.
- `03d2c9be0a43`의 실제 구현은 파일 내부 issue는 누적하지만 여러 malformed 파일을 모두 parse한 뒤 합치지는 않습니다. 이 차이를 scaffold의 기대와 구분했습니다.
- `ff2ecadf3489`은 normalized target containment/existence를 검사하며 absolute-looking URL을 별도 error category로 나누지 않습니다.

## 8. Ownership / state / responsibility 변화

| Concern | Thread 초기 owner/state | Thread 최종 owner/state | 실제 symbol과 호출 경로 |
| --- | --- | --- | --- |
| 원시 JSON shape | TypeScript assertion과 개별 import | 파일별 schema와 `parseContentFile` | `src/lib/content-loader.ts::parseContentFile`: raw JSON + schema → validated output 또는 `PortfolioContentError`. |
| 오류 위치와 집계 | 일반 예외 또는 분산 방어 | `PortfolioContentError`와 source-aware issue collection | `PortfolioContentValidationIssue`/`PortfolioContentError`: validator issue array → source-aware formatted error. |
| Repository identity/order | Consumer의 암묵적 해석 | Whole-repository validation | `loadPortfolioSource` 후단의 duplicate validators: validated collections → deterministic ID/order set. |
| Application aggregate | 직접 JSON import와 중복 derivation | Validated `portfolioSource` 기반 facade | `loadPortfolioSource` → exported `portfolioSource` → `src/lib/portfolio/content.ts` facade → selectors/App Router pages. |
| Local asset validity | Render/build에서 뒤늦은 실패 | Repository-boundary asset validator | `src/lib/content-assets.ts::validatePortfolioAssets`: content asset refs + injected public root → containment/existence issues. |
| Build 차단 | 수동 검사 가능성 | `prebuild` lifecycle | `package.json::prebuild` → `scripts/validate-content.ts` → loader + asset validator; throw가 npm status로 전파됩니다. |

## 9. Thread 최종 상태

### Source에서 확정된 최종 상태

타입 단언에 의존하던 JSON 입력이 파일별 schema 파싱, 누적 진단, 저장소 전체 참조 검증, 검증된 facade, 자산 경계, prebuild 차단으로 발전하는 과정을 복원합니다.

### 학습자가 완성할 최종 설명

- **Thread 시작 시점의 설계와 위험:** 시작 시점에는 runtime JSON이 TypeScript assertion과 direct import를 통해 renderer까지 갈 수 있었고 file location을 보존하는 공통 failure report도 없었습니다.
- **핵심 architecture/decision이 형성된 순서:** schema 정의 → source-aware parser → all-file loader → repository duplicate checks → validated facade → asset validator → prebuild 순서로 trust boundary가 형성됐습니다.
- **실제 failure 또는 부족함이 드러난 지점:** 중간에 parser가 있어도 facade가 raw JSON을 계속 import해 병렬 ingestion path가 남았고, schema-valid path가 실제 file 존재를 뜻하지 않는 공백도 드러났습니다.
- **Fix 또는 boundary 강화가 바꾼 invariant:** `508e0b71024b`이 consumer 우회를 제거하고 `ff2ecadf3489`/`28b0db56190f`이 filesystem과 build lifecycle까지 fail-closed로 확장했습니다.
- **Test/build/browser evidence가 보장한 범위:** 정적 검토로 file-to-schema mapping, duplicate branches, asset containment와 npm command chain을 확인했습니다. 환경 제한 때문에 command exit/result는 실행 증거로 만들지 않았습니다.
- **Thread 종료 시점에도 보장하지 않는 범위:** 여러 malformed 파일의 parse issue를 하나의 report로 합치는 것, MIME/HTTP serving, production placeholder/origin completeness는 이 thread 종료 시점의 보장이 아닙니다.

## 10. 최종 architecture 또는 execution flow 정리

아래 source-backed flow의 각 단계에 실제 file path, symbol, input/output, failure branch를 추가합니다.

1. Authoritative JSON source와 targeted test override를 조립합니다.
   - 실제 코드 위치: `src/lib/content-loader.ts::loadPortfolioSource`
   - 입력과 출력: 14개 imported JSON module과 optional per-key override를 받아 하나의 loader input set을 구성합니다.
   - 실패/absence 처리: override가 있어도 schema를 우회하지 않으며 first failing file의 `PortfolioContentError`가 호출을 중단합니다.
2. 각 source file에 대응하는 schema와 source name을 선택합니다.
   - 실제 코드 위치: `contentFiles`/각 explicit `parseContentFile` call in `src/lib/content-loader.ts`
   - 입력과 출력: source key별 raw value, schema, `src/content/*.json` filename을 결합합니다.
   - 실패/absence 처리: mapping 누락은 type/source inventory 검토 대상이며 schema mismatch는 parser failure가 됩니다.
3. `safeParse` 결과를 typed output 또는 source/path/message issue로 변환합니다.
   - 실제 코드 위치: `parseContentFile`
   - 입력과 출력: `safeParse` 성공 시 transformed/defaulted output, 실패 시 Zod issue를 JSON path가 있는 issue array로 변환합니다.
   - 실패/absence 처리: issue가 하나라도 있으면 output을 반환하지 않고 aggregate error를 throw합니다.
4. 파일별 output 위에 uniqueness와 cross-file policy를 적용합니다.
   - 실제 코드 위치: `loadPortfolioSource`의 repository validators
   - 입력과 출력: validated collections에서 ID/order/href values를 추출해 duplicates를 찾습니다.
   - 실패/absence 처리: duplicate value당 source-aware issue를 누적하고 validation error로 중단합니다.
5. Asset path를 public root 아래로 제한하고 실제 존재를 확인합니다.
   - 실제 코드 위치: `src/lib/content-assets.ts::validatePortfolioAssets`
   - 입력과 출력: social/profile/resume/project asset URL과 public root를 filesystem target으로 변환합니다.
   - 실패/absence 처리: root 밖 relative path 또는 missing target을 issue로 누적합니다. 선행 `/` 자체는 별도 reject branch가 아닙니다.
6. Validated source를 portfolio facade와 selectors/routes가 소비합니다.
   - 실제 코드 위치: `src/lib/portfolio/content.ts` 및 selectors/pages
   - 입력과 출력: `portfolioSource`를 canonical input으로 받아 sorted/filtered/derived portfolio aggregate를 만듭니다.
   - 실패/absence 처리: disabled/absent data는 facade/selector policy로 제외되며 raw JSON fallback은 없습니다.
7. `content:check`와 `prebuild`가 동일 경계를 실행해 failure를 build에 전달합니다.
   - 실제 코드 위치: `package.json` → `scripts/validate-content.ts`
   - 입력과 출력: `prebuild`가 content loader와 asset validator를 실행한 뒤에만 Next build로 진행합니다.
   - 실패/absence 처리: throw/non-zero status면 compilation 이전에 build가 종료됩니다.

### 코드 없이 설명하기

> 이 Thread의 최종 실행 흐름을 code snippet 없이 자신의 말로 작성합니다. 설계 → 구현 → failure/risk → 수정/강화 → 검증 순서가 드러나야 합니다.

처음에는 JSON module을 TypeScript 타입으로 취급했지만 runtime 값은 검증되지 않았습니다. 프로젝트 schema와 source-aware error model을 만든 뒤 `parseContentFile`과 `loadPortfolioSource`가 모든 파일을 통과시키는 단일 입력 경계가 됐습니다. Repository-wide duplicate checks가 identity를 결정적으로 만들고 facade migration이 raw import 우회를 없앴습니다. 마지막으로 local asset을 public root에 묶고 같은 loader/validator를 `prebuild`에서 실행해 invalid content가 compilation 전에 실패하도록 했습니다. 다만 이 단계는 publication readiness와 실제 HTTP serving까지는 다루지 않습니다.

> **실행 증거 구분:** 참조 SHA의 diff와 해당 SHA 파일은 GitHub connector로 확인했습니다. 로컬 clone은 실행 환경의 DNS 차단으로 실패해 build, unit/E2E, browser, Lighthouse, Docker command는 실행하지 않았습니다. 따라서 위 test 결과는 구현된 test technique과 assertion의 정적 검토이며 실제 통과 결과가 아닙니다.

## 11. 학습 완료 자가 점검

- [x] Commit map의 모든 SHA를 실제로 checkout하거나 diff로 확인했습니다.
- [x] Thread 내 commit 순서를 source와 동일하게 유지했습니다.
- [x] 각 A/S commit에서 직전 상태, decision, failure boundary, guarantee와 non-guarantee를 구분했습니다.
- [x] B commit은 thread 흐름에서 필요한 구현 역할과 state change를 확인했습니다.
- [x] Fix commit을 독립 feature가 아니라 기존 가정 → failure → root cause → corrected invariant로 설명했습니다.
- [x] Test commit에서 production invariant, failure injection, technique, traversed production path, proves/does-not-prove를 구분했습니다.
- [x] Invariant ledger의 모든 주장에 해당 SHA의 code/test evidence가 있습니다.
- [x] Final HEAD의 code를 과거 commit 설명에 소급하지 않았습니다.
- [x] Thread 최종 흐름을 code 없이 설명할 수 있습니다.
