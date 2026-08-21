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
| 이 dependency commit이 가능하게 한 후속 작업 |  |
| Runtime dependency와 dev-only runner의 lifecycle 차이 |  |
| Lockfile이 제공하는 reproducibility evidence와 제공하지 않는 architecture 설명 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

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
| Project list와 detail renderer가 공통으로 의존하는 field 집합 |  |
| 필수/선택/default field 구분 |  |
| Schema가 보장하는 것과 아직 보장하지 않는 reference |  |
| 직전 관련 schema commit과 비교한 확장 지점 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

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
| Throw-on-first-error 대신 issue accumulation을 선택한 이유 |  |
| Source inventory가 후속 validator에 제공하는 context |  |
| Machine-readable issue와 human-readable error text 구분 |  |
| 아직 실제 issue를 생성하지 않는 부분 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

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
| Raw input ownership에서 validated output ownership으로 넘어가는 함수 경계 |  |
| Schema transformation/default가 output에 반영되는 방식 |  |
| Failure 시 반환되지 않는 값과 보존되는 diagnostics |  |
| 아직 모든 source가 이 함수를 반드시 사용한다고 보장하지 않는 이유 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

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
| 직전 상태: schema와 parser가 있었지만 all-file authoritative loader가 없었던 call graph |  |
| 어떤 source가 validation을 건너뛸 수 있었는지 |  |
| File-to-schema mapping과 single loader decision |  |
| 핵심 loader/parser/output type/export code |  |
| 한 파일/여러 파일 malformed일 때 failure path |  |
| 보장하는 것: loader output의 runtime shape validation |  |
| 아직 보장하지 않는 것: uniqueness/reference/asset/facade consumer migration |  |
| 다음 commit과의 연결 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

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
| Identifier가 하나의 semantic record로 결정된다는 invariant |  |
| Order collision과 identity collision 차이 |  |
| 세 번 이상 반복된 값의 issue cardinality |  |
| 아직 unresolved reference를 직접 검사하지 않는 범위 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

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
| 직전 loader를 facade가 bypass하던 import/relationship |  |
| 두 ingestion path가 다른 interpretation을 만들 수 있었던 이유 |  |
| `portfolioSource`와 group ID 중심 aggregate decision |  |
| Facade construction, sort/derive, exported API |  |
| Raw source, canonical validated collection, derived collection ownership |  |
| Disabled/missing 관계의 absence 처리 |  |
| 보장하는 것: application consumer의 single validated pipeline |  |
| 아직 보장하지 않는 것: asset containment와 prebuild enforcement |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

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
| URL namespace와 filesystem namespace 변환 규칙 |  |
| Containment 검사 전후 normalization 순서 |  |
| 여러 asset issue가 한 번에 보고되는 증거 |  |
| Schema path validation만으로 existence를 보장할 수 없었던 이유 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

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
| Build lifecycle 순서와 failure status |  |
| Manual check와 automatic gate 차이 |  |
| Structural/asset integrity는 강제하지만 production readiness는 아직 아닌 범위 |  |
| 재현 command와 실제 exit code/output |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

## 6. Invariant ledger

| Invariant | Source에서 확인된 변화 지점 | 해당 SHA의 실제 code/test evidence | 부족함이 드러난 시점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| 모든 authoritative content source는 consumer 이전에 schema parsing을 통과합니다. | `a944c73f0557 → d50870c8b8c4 → 03d2c9be0a43` |  |  |  |
| Validation issue는 source file과 JSON path를 잃지 않고 누적됩니다. | `70e49ea34194 → d50870c8b8c4` |  |  |  |
| Identifier와 ordering key는 repository 전체에서 결정적으로 해석됩니다. | `b9d74d8ccf08` |  |  |  |
| Selectors와 routes는 검증된 facade만 소비합니다. | `508e0b71024b` |  |  |  |
| Local asset은 public root 내부에 존재해야 하며 경계를 벗어날 수 없습니다. | `ff2ecadf3489` |  |  |  |
| 잘못된 content는 production compilation 전에 build를 중단합니다. | `28b0db56190f` |  |  |  |

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

## 8. Ownership / state / responsibility 변화

| Concern | Thread 초기 owner/state | Thread 최종 owner/state | 실제 symbol과 호출 경로 |
| --- | --- | --- | --- |
| 원시 JSON shape | TypeScript assertion과 개별 import | 파일별 schema와 `parseContentFile` |  |
| 오류 위치와 집계 | 일반 예외 또는 분산 방어 | `PortfolioContentError`와 source-aware issue collection |  |
| Repository identity/order | Consumer의 암묵적 해석 | Whole-repository validation |  |
| Application aggregate | 직접 JSON import와 중복 derivation | Validated `portfolioSource` 기반 facade |  |
| Local asset validity | Render/build에서 뒤늦은 실패 | Repository-boundary asset validator |  |
| Build 차단 | 수동 검사 가능성 | `prebuild` lifecycle |  |

## 9. Thread 최종 상태

### Source에서 확정된 최종 상태

타입 단언에 의존하던 JSON 입력이 파일별 schema 파싱, 누적 진단, 저장소 전체 참조 검증, 검증된 facade, 자산 경계, prebuild 차단으로 발전하는 과정을 복원합니다.

### 학습자가 완성할 최종 설명

- Thread 시작 시점의 설계와 위험:
- 핵심 architecture/decision이 형성된 순서:
- 실제 failure 또는 부족함이 드러난 지점:
- Fix 또는 boundary 강화가 바꾼 invariant:
- Test/build/browser evidence가 보장한 범위:
- Thread 종료 시점에도 보장하지 않는 범위:

## 10. 최종 architecture 또는 execution flow 정리

아래 source-backed flow의 각 단계에 실제 file path, symbol, input/output, failure branch를 추가합니다.

1. Authoritative JSON source와 targeted test override를 조립합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
2. 각 source file에 대응하는 schema와 source name을 선택합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
3. `safeParse` 결과를 typed output 또는 source/path/message issue로 변환합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
4. 파일별 output 위에 uniqueness와 cross-file policy를 적용합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
5. Asset path를 public root 아래로 제한하고 실제 존재를 확인합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
6. Validated source를 portfolio facade와 selectors/routes가 소비합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
7. `content:check`와 `prebuild`가 동일 경계를 실행해 failure를 build에 전달합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:

### 코드 없이 설명하기

> 이 Thread의 최종 실행 흐름을 code snippet 없이 자신의 말로 작성합니다. 설계 → 구현 → failure/risk → 수정/강화 → 검증 순서가 드러나야 합니다.

## 11. 학습 완료 자가 점검

- [ ] Commit map의 모든 SHA를 실제로 checkout하거나 diff로 확인했습니다.
- [ ] Thread 내 commit 순서를 source와 동일하게 유지했습니다.
- [ ] 각 A/S commit에서 직전 상태, decision, failure boundary, guarantee와 non-guarantee를 구분했습니다.
- [ ] B commit은 thread 흐름에서 필요한 구현 역할과 state change를 확인했습니다.
- [ ] Fix commit을 독립 feature가 아니라 기존 가정 → failure → root cause → corrected invariant로 설명했습니다.
- [ ] Test commit에서 production invariant, failure injection, technique, traversed production path, proves/does-not-prove를 구분했습니다.
- [ ] Invariant ledger의 모든 주장에 해당 SHA의 code/test evidence가 있습니다.
- [ ] Final HEAD의 code를 과거 commit 설명에 소급하지 않았습니다.
- [ ] Thread 최종 흐름을 code 없이 설명할 수 있습니다.
