# Thread: Template preview to production publication

> Project: 42 Archive Portfolio (`web/portfolio`)
>
> 이 문서는 source에서 확정된 thread 구조와 commit 역할만 미리 제공합니다. 실제 구현 해석, code evidence, failure 재현, test 결과, 최종 설명은 해당 SHA의 코드를 직접 확인해 작성합니다.

## 1. Thread 목표

Schema-valid starter content와 실제 공개 가능한 production content를 구분하고 strict readiness 결과를 build, metadata, robots, sitemap에 일관되게 적용하는 publication trust boundary를 복원합니다.

**Source-defined significance**

> Schema-valid starter data is not necessarily safe to publish. This progression adds a second, stricter publication contract and then reuses it for canonical metadata, robots policy, and sitemap discovery. It prevents template identities and incomplete evidence from becoming indexed production claims.

### 이 Thread에 직접 연결되는 Critical Invariants

- Missing/empty/explicit template mode는 template이며 exact production만 production을 요청합니다. — `b3bd671a3243`
- Production origin은 public HTTP(S)이고 local/reserved/credential-bearing 값이 아닙니다. — `47b99d6256ef`
- Production result는 complete readiness 성공 뒤에만 verified URL을 포함합니다. — `002b642d52a3`
- Published project는 실제 자산과 enabled public exit를 가지며 usable contact가 존재합니다. — `bcd87ed856bf → 71e7ece7208f`
- Readiness는 normal production build의 mandatory gate입니다. — `37c0dbc079ff`
- Template는 non-indexable이고 crawler output은 enabled publication surface만 반영합니다. — `55b6061e0052 → cb61450ad922 → 70b69f04e8c7`

### 연결되는 Major Engineering Difficulty

- 편집 가능한 template content와 실제 publishable content를 구분해 local preview 편의와 production fail-closed를 동시에 유지하는 문제

## 2. 이 Thread를 이해하기 위한 핵심 질문

- Content mode는 어떤 입력에서 template, production, invalid로 결정되며 추측하지 않는 정책은 어디에 표현되는가?
- Structural schema validation과 production readiness validation은 무엇을 다르게 보장하는가?
- Public origin, asset, project exit, contact method가 production result를 얻기 위해 모두 필요한 이유는 무엇인가?
- Build gate와 crawler-visible output이 같은 mode/result를 소비한다는 것을 어떤 call relation으로 확인하는가?
- Disabled page/project와 template deployment가 metadata, robots, sitemap에서 제외되는 경로는 무엇인가?

## 3. 완료 기준

- Template/production mode의 input, return type, required checks, indexing 결과를 하나의 표로 정리했습니다.
- `002b642d52a3`의 discriminated result가 verified `URL`을 포함하는 success path와 failure branch를 추적했습니다.
- `37c0dbc079ff`에서 schema check 뒤 readiness check가 build status로 전파되는 순서를 기록했습니다.
- Metadata, robots, sitemap이 같은 publication decision을 사용하며 모순되지 않는지 확인했습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Source에서 확정된 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `b3bd671a3243` | feat(content): 콘텐츠 mode와 readiness 오류 모델 추가 | A | CONTENT, VALIDATION | Defines conservative template mode and explicit production mode. |
| 2 | `47b99d6256ef` | feat(content): public origin과 자산 경계 검증 추가 | A | CONTENT, VALIDATION | Rejects local, reserved, credential-bearing, and misplaced publication inputs. |
| 3 | `002b642d52a3` | feat(content): production readiness 기본 검사 추가 | S | ARCH, CONTENT, VALIDATION | Aggregates origin and placeholder checks into a discriminated production result. |
| 4 | `bcd87ed856bf` | feat(content): 필수 자산과 프로젝트 readiness 추가 | A | CONTENT, VALIDATION | Requires real public evidence and exits for every published project. |
| 5 | `71e7ece7208f` | feat(content): 연락 수단과 build readiness 연결 | A | CONTENT, VALIDATION, DEPLOY | Requires a usable contact method and exposes one mode-aware gate. |
| 6 | `37c0dbc079ff` | build(content): readiness 검사를 prebuild에 연결 | A | CONTENT, VALIDATION, DEPLOY | Makes publication completeness mandatory during normal production builds. |
| 7 | `55b6061e0052` | feat(seo): 콘텐츠 mode별 metadata 정책 추가 | A | CONTENT, SEO | Aligns page indexing with the validated content mode. |
| 8 | `cb61450ad922` | feat(seo): 콘텐츠 mode별 robots 정책 추가 | A | CONTENT, SEO | Aligns crawler policy with the same mode contract. |
| 9 | `70b69f04e8c7` | feat(seo): 공개 route sitemap 생성 | A | ARCH, ROUTING, SEO | Publishes only enabled production routes and projects. |

## 5. Commit별 학습 기록

각 section은 반드시 해당 SHA를 checkout한 상태에서 작성합니다. Thread 내 이전 commit은 비교 대상으로 사용할 수 있지만 final HEAD를 정답처럼 소급하지 않습니다.

### 1. `b3bd671a3243` — feat(content): 콘텐츠 mode와 readiness 오류 모델 추가

- **Importance:** A
- **Tags:** CONTENT, VALIDATION
- **Source-defined thread role:** Defines conservative template mode and explicit production mode.
- **Source classification summary:** Introduce the type and error model for distinguishing template content from production-ready content.
- **Source classification reason:** Significant because it strengthens the shared content trust boundary or a cross-file invariant used by every route, rather than validating one local component.

#### Source에서 확정된 구현 의도와 상태 변화

Template content와 production-ready content를 구분하는 mode/error protocol을 정의합니다. Missing, empty, explicit `template`은 template로, exact `production`만 production으로 처리하며 unsupported 값은 즉시 실패합니다.

#### 해당 SHA에서 확인할 실제 코드

- Content mode union과 resolver의 input normalization/branch를 확인합니다.
- Unsupported string이 fallback되지 않고 어떤 error로 변환되는지 추적합니다.
- Readiness issue의 source file/path/message와 aggregate error formatting을 확인합니다.
- Production branch만 parsed site `URL`을 요구하는 discriminated result type을 확인합니다.
- 이 commit에는 actual readiness check가 아직 없다는 protocol/implementation 경계를 기록합니다.

확인 원칙:

- 먼저 `b3bd671a3243^`와 `b3bd671a3243`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Conservative template default의 정확한 입력 집합 |  |
| Exact production activation과 invalid mode |  |
| Structured issue/error model |  |
| 후속 validator가 따라야 하는 return shape |  |
| 아직 생성되지 않는 readiness issues |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

### 2. `47b99d6256ef` — feat(content): public origin과 자산 경계 검증 추가

- **Importance:** A
- **Tags:** CONTENT, VALIDATION
- **Source-defined thread role:** Rejects local, reserved, credential-bearing, and misplaced publication inputs.
- **Source classification summary:** Add production-specific validation for public origins and locally served assets.
- **Source classification reason:** Significant because it strengthens the shared content trust boundary or a cross-file invariant used by every route, rather than validating one local component.

#### Source에서 확정된 구현 의도와 상태 변화

Production `SITE_URL`과 locally served asset의 publication boundary를 정의합니다. Origin은 public absolute HTTP(S)여야 하며 local, credential-bearing, reserved example host를 거부하고 asset은 `public/content` 아래에 있어야 합니다.

#### 해당 SHA에서 확인할 실제 코드

- `SITE_URL` parsing과 protocol/origin validation 순서를 확인합니다.
- Local/reserved host 판정 helper와 credential 검사 branch를 찾습니다.
- Origin만 허용하는지 path/query/hash가 있는 URL을 어떻게 처리하는지 확인합니다.
- Asset URL이 `public/content` namespace 아래인지 확인하는 boundary check를 추적합니다.
- Schema-level local path와 production-specific placement의 차이를 비교합니다.

확인 원칙:

- 먼저 `47b99d6256ef^`와 `47b99d6256ef`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Accept/reject URL examples와 branch |  |
| Origin validation과 deployable public link validation 구분 |  |
| Asset namespace와 publication 의미 |  |
| 이 commit만으로 complete readiness가 되지 않는 이유 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

### 3. `002b642d52a3` — feat(content): production readiness 기본 검사 추가

- **Importance:** S
- **Tags:** ARCH, CONTENT, VALIDATION
- **Source-defined thread role:** Aggregates origin and placeholder checks into a discriminated production result.
- **Source classification summary:** Introduce the aggregate production-readiness validator.
- **Source classification reason:** Critical because it establishes the fail-closed publication boundary: production mode exists only after origin and content readiness are verified across the complete source set.

#### Source에서 확정된 구현 의도와 상태 변화

Public origin validation과 모든 authoritative content file의 template marker scan을 aggregate production-readiness validator로 묶습니다. 모든 issue가 없을 때만 verified URL을 가진 production result를 반환합니다.

#### S-level source profile

- **Problem:** Schema-valid starter content도 template marker나 non-public origin을 포함해 실제 production claim으로 게시하기에는 부적합할 수 있었습니다.
- **Decision:** Public origin과 모든 authoritative source의 placeholder를 누적 검사하고 complete success 뒤에만 verified URL을 반환합니다.
- **Why it mattered:** Development validity와 publication validity를 분리해 build와 crawler output이 신뢰할 두 번째 trust level을 만듭니다.
- **What changed:** Readiness issue를 actionable set으로 보고하고 production branch를 discriminated result로 표현합니다.

#### 해당 SHA에서 확인할 실제 코드

- Aggregate validator의 input source, environment, issue collection, call order를 확인합니다.
- Origin failure가 issue로 누적되고 즉시 return하지 않는지 확인합니다.
- Source-to-file mapping과 recursive placeholder scanner가 JSON path를 만드는 흐름을 추적합니다.
- Issue가 하나라도 있을 때 aggregate error를 throw하고 result를 만들지 않는 branch를 확인합니다.
- Success branch에서 parsed `URL`과 discriminant가 반환되는지 확인합니다.
- Template mode handling과 production-only validator의 public API 관계를 구분합니다.
- 서로 다른 file/category failure를 둘 이상 주입해 ordering과 completeness를 기록합니다.

확인 원칙:

- 먼저 `002b642d52a3^`와 `002b642d52a3`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 mode protocol과 개별 helper가 분리된 구조 |  |
| Schema-valid starter가 production claim으로 노출될 수 있었던 문제 |  |
| Aggregate fail-closed readiness와 verified URL decision |  |
| Validator, scanner traversal, issue aggregation, success result |  |
| Bad origin와 multiple placeholders 동시 failure |  |
| 보장하는 것: origin/content-marker trust level |  |
| 아직 보장하지 않는 것: required assets/project exits/contact/build |  |
| 후속 commit과 indexing policy 연결 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

### 4. `bcd87ed856bf` — feat(content): 필수 자산과 프로젝트 readiness 추가

- **Importance:** A
- **Tags:** CONTENT, VALIDATION
- **Source-defined thread role:** Requires real public evidence and exits for every published project.
- **Source classification summary:** Extend production readiness from generic placeholder detection to portfolio-specific completeness.
- **Source classification reason:** Significant because it strengthens the shared content trust boundary or a cross-file invariant used by every route, rather than validating one local component.

#### Source에서 확정된 구현 의도와 상태 변화

Readiness에 portfolio-specific completeness를 추가합니다. Social/profile/résumé asset, enabled project, production-hosted screenshots, 각 published project의 enabled public link를 요구하며 disabled project는 제외합니다.

#### 해당 SHA에서 확인할 실제 코드

- 필수 site/profile/resume asset field와 `public/content` check를 확인합니다.
- Enabled project collection과 최소 한 개 요구 branch를 추적합니다.
- Project screenshots의 production-hosted check와 issue path를 찾습니다.
- 각 enabled project에서 usable public link를 선택하는 protocol/enablement 조건을 확인합니다.
- Disabled project가 검사에서 제외되는 위치와 범위를 기록합니다.

확인 원칙:

- 먼저 `bcd87ed856bf^`와 `bcd87ed856bf`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Visible publication evidence의 최소 조건 |  |
| Project-level exit의 의미와 accepted protocol |  |
| Disabled staging exemption |  |
| 여러 completeness issue의 accumulation |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

### 5. `71e7ece7208f` — feat(content): 연락 수단과 build readiness 연결

- **Importance:** A
- **Tags:** CONTENT, VALIDATION, DEPLOY
- **Source-defined thread role:** Requires a usable contact method and exposes one mode-aware gate.
- **Source classification summary:** Require at least one enabled, non-placeholder contact method in production and expose a single mode-aware build-readiness entry point.
- **Source classification reason:** Significant because it strengthens the shared content trust boundary or a cross-file invariant used by every route, rather than validating one local component.

#### Source에서 확정된 구현 의도와 상태 변화

Production에 enabled non-placeholder contact method를 요구하고 template mode는 strict publication check를 생략하며 production mode는 aggregate validator로 위임하는 하나의 mode-aware build-readiness entry point를 제공합니다.

#### 해당 SHA에서 확인할 실제 코드

- Preferred contact IDs와 enabled global links를 어떻게 확인하는지 추적합니다.
- `mailto:`, `tel:`, HTTP(S) 허용과 placeholder rejection을 확인합니다.
- Template branch가 publication requirements 없이 반환하는 result를 확인합니다.
- Production branch가 full validator에 delegate하고 verified URL을 보존하는지 확인합니다.
- Public exports가 core contract로 축소되는 diff를 확인합니다.

확인 원칙:

- 먼저 `71e7ece7208f^`와 `71e7ece7208f`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Usable contact method의 exact predicate |  |
| Template/production execution path 차이 |  |
| Mode-aware public API와 private helper |  |
| Build script가 호출해야 하는 단일 entry point |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

### 6. `37c0dbc079ff` — build(content): readiness 검사를 prebuild에 연결

- **Importance:** A
- **Tags:** CONTENT, VALIDATION, DEPLOY
- **Source-defined thread role:** Makes publication completeness mandatory during normal production builds.
- **Source classification summary:** Make content readiness a mandatory prebuild gate after schema validation.
- **Source classification reason:** Significant because it strengthens the shared content trust boundary or a cross-file invariant used by every route, rather than validating one local component.

#### Source에서 확정된 구현 의도와 상태 변화

Schema validation 뒤 content readiness를 수행하는 dedicated script를 `prebuild`에 연결합니다. Selected mode와 production origin을 출력하고 readiness issue는 non-zero process status로 변환합니다.

#### 해당 SHA에서 확인할 실제 코드

- Package `prebuild`에서 structural `content:check`와 readiness check 순서를 확인합니다.
- Readiness CLI가 authoritative source와 environment를 어떻게 전달하는지 추적합니다.
- Template success와 production success의 output 차이를 확인합니다.
- Aggregate error가 stderr/exit code로 변환되는 catch branch를 찾습니다.
- Failure에서 Next build가 시작되지 않는 실행 결과를 기록합니다.

확인 원칙:

- 먼저 `37c0dbc079ff^`와 `37c0dbc079ff`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Schema validity와 publication readiness gate 순서 |  |
| Mode/env input source |  |
| Success/failure output과 exit code |  |
| Normal build lifecycle에서 우회할 수 없는 이유 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

### 7. `55b6061e0052` — feat(seo): 콘텐츠 mode별 metadata 정책 추가

- **Importance:** A
- **Tags:** CONTENT, SEO
- **Source-defined thread role:** Aligns page indexing with the validated content mode.
- **Source classification summary:** Add a pure metadata factory driven by validated site content and the selected content mode.
- **Source classification reason:** Significant because it governs publication identity, indexing, or safe machine-readable output across routes, keeping crawler-visible state aligned with validated content.

#### Source에서 확정된 구현 의도와 상태 변화

Validated site content와 content mode를 입력으로 canonical, Open Graph, Twitter, optional social image metadata를 만드는 pure factory를 추가하고 indexing은 production에서만 허용합니다.

#### 해당 SHA에서 확인할 실제 코드

- Factory input에 site data, mode, base URL이 어떻게 표현되는지 확인합니다.
- Template와 production robots/indexing field 차이를 추적합니다.
- Canonical/Open Graph/Twitter URL과 image가 같은 origin에서 파생되는지 확인합니다.
- Optional social image absent branch가 unsupported claim을 만들지 않는지 확인합니다.
- Pure helper가 request headers/filesystem을 직접 읽지 않는지 확인합니다.

확인 원칙:

- 먼저 `55b6061e0052^`와 `55b6061e0052`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Mode별 metadata/robots 결과 |  |
| Canonical identity와 social URL source |  |
| Optional field omission policy |  |
| Factory testability와 readiness dependency |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

### 8. `cb61450ad922` — feat(seo): 콘텐츠 mode별 robots 정책 추가

- **Importance:** A
- **Tags:** CONTENT, SEO
- **Source-defined thread role:** Aligns crawler policy with the same mode contract.
- **Source classification summary:** Generate `robots.txt` from the same content-mode contract used by readiness and metadata.
- **Source classification reason:** Significant because it governs publication identity, indexing, or safe machine-readable output across routes, keeping crawler-visible state aligned with validated content.

#### Source에서 확정된 구현 의도와 상태 변화

같은 content-mode contract로 `robots.txt`를 생성합니다. Template은 모든 crawler를 차단하고 production은 validated host를 명시해 indexing을 허용하며 production URL 누락은 programming error입니다.

#### 해당 SHA에서 확인할 실제 코드

- Robots generator의 template/production branch와 returned rule shape를 확인합니다.
- Production host가 verified URL에서 추출되는지 확인합니다.
- Production mode인데 URL이 없는 impossible state를 어떤 error로 막는지 추적합니다.
- Metadata indexing branch와 robots 결과를 같은 input으로 비교합니다.
- Sitemap advertisement는 후속 commit과 구분합니다.

확인 원칙:

- 먼저 `cb61450ad922^`와 `cb61450ad922`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Template disallow-all 정책 |  |
| Production allow/host 정책 |  |
| Impossible state 방어 |  |
| Metadata와 crawler policy 일관성 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

### 9. `70b69f04e8c7` — feat(seo): 공개 route sitemap 생성

- **Importance:** A
- **Tags:** ARCH, ROUTING, SEO
- **Source-defined thread role:** Publishes only enabled production routes and projects.
- **Source classification summary:** Generate `sitemap.xml` from the validated production origin and the routes that the current content configuration actually exposes.
- **Source classification reason:** Significant because it governs publication identity, indexing, or safe machine-readable output across routes, keeping crawler-visible state aligned with validated content.

#### Source에서 확정된 구현 의도와 상태 변화

Validated production origin과 content configuration이 실제로 노출하는 route만으로 `sitemap.xml`을 생성합니다. Template에서는 entry가 없고 disabled page/project는 제외하며 robots가 sitemap을 광고합니다.

#### 해당 SHA에서 확인할 실제 코드

- Template mode에서 sitemap entries가 빈 collection이 되는 branch를 확인합니다.
- Core/optional page URL과 availability check를 추적합니다.
- Enabled project ID로 detail URL을 생성하는 loop와 URL join을 확인합니다.
- Disabled route/project가 제외되는 predicate를 확인합니다.
- Robots output에 sitemap URL을 추가하는 integration 지점을 찾습니다.

확인 원칙:

- 먼저 `70b69f04e8c7^`와 `70b69f04e8c7`를 비교하고, thread 흐름이 필요한 경우에만 이전 thread commit과 추가 비교합니다.
- Final HEAD의 함수명, file layout, test 결과를 이 commit에 소급하지 않습니다.
- 실제 file path, symbol, caller/callee, state mutation 순서, failure branch를 확인한 뒤 기록합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| Published route set의 source-of-truth |  |
| Template/production sitemap 차이 |  |
| Optional page와 project detail inclusion rules |  |
| Rendering availability와 crawl discovery의 동일성 |  |

#### 코드 발췌 기록

- **변경 전 대응 코드:** 경로, symbol, 핵심 line 범위와 기존 가정을 기록합니다.
- **해당 SHA 핵심 코드:** 전체 diff가 아니라 decision 또는 invariant를 직접 보여 주는 최소 부분만 삽입합니다.
- **실행·테스트 증거:** 사용한 command, environment, 실제 결과, failure 재현 여부를 기록합니다.
- **다음 commit 연결:** 이 commit이 남긴 미해결 범위가 다음 thread commit에서 어떻게 다뤄지는지 기록합니다.

## 6. Invariant ledger

| Invariant | Source에서 확인된 변화 지점 | 해당 SHA의 실제 code/test evidence | 부족함이 드러난 시점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| Missing/empty/explicit template mode는 template이며 exact production만 production을 요청합니다. | `b3bd671a3243` |  |  |  |
| Production origin은 public HTTP(S)이고 local/reserved/credential-bearing 값이 아닙니다. | `47b99d6256ef` |  |  |  |
| Production result는 complete readiness 성공 뒤에만 verified URL을 포함합니다. | `002b642d52a3` |  |  |  |
| Published project는 실제 자산과 enabled public exit를 가지며 usable contact가 존재합니다. | `bcd87ed856bf → 71e7ece7208f` |  |  |  |
| Readiness는 normal production build의 mandatory gate입니다. | `37c0dbc079ff` |  |  |  |
| Template는 non-indexable이고 crawler output은 enabled publication surface만 반영합니다. | `55b6061e0052 → cb61450ad922 → 70b69f04e8c7` |  |  |  |

Ledger 작성 원칙:

- Source가 명시한 invariant만 사용하고 새 invariant를 확정 사실처럼 추가하지 않습니다.
- 도입, 강화, 부족함 노출, fix, regression test가 서로 다른 commit이면 각 열에 분리해 기록합니다.
- Code evidence에는 실제 field, function, branch, selector, command 또는 assertion을 적습니다.

## 7. Failure → Fix → Test 연결

| 기존 가정 또는 위험 | 대응 commit | 실제 수정/강화 code에서 확인할 것 | Test 또는 실행 증거 |
| --- | --- | --- | --- |
| Environment 값이 비어 있거나 오타인데 production으로 추정함 | b3bd671a3243 | Exact-value resolver와 unsupported-value error를 확인합니다. | Production branch만 URL을 요구하는 discriminated type을 기록합니다. |
| Schema는 통과하지만 example host, localhost, credential URL, starter marker가 남음 | 47b99d6256ef, 002b642d52a3 | Origin predicate, placeholder traversal, issue accumulation을 확인합니다. | 여러 category가 동시에 실패할 때 aggregate error를 기록합니다. |
| Published project에 screenshot/exit가 없거나 contact가 없음 | bcd87ed856bf, 71e7ece7208f | Enabled/disabled 분기와 link protocol/placeholder 판정을 추적합니다. | Disabled staging record가 exempt되는 branch를 확인합니다. |
| Template preview가 index되거나 disabled route가 sitemap에 남음 | 55b6061e0052, cb61450ad922, 70b69f04e8c7 | Metadata, `robots.txt`, sitemap을 같은 mode로 대조합니다. | Template에서 sitemap이 비고 crawler가 disallow되는지 기록합니다. |

## 8. Ownership / state / responsibility 변화

| Concern | Thread 초기 owner/state | Thread 최종 owner/state | 실제 symbol과 호출 경로 |
| --- | --- | --- | --- |
| Content mode 해석 | Consumer별 환경 문자열 해석 | 공용 mode resolver와 error model |  |
| Public origin/asset policy | Schema 또는 metadata의 추정 | Production-specific readiness validator |  |
| Production completeness | Page/SEO별 개별 방어 | Aggregate readiness result |  |
| Build enforcement | Optional command | `prebuild` readiness script |  |
| Indexing policy | Metadata/robots/sitemap별 조건 | 공통 content-mode contract |  |

## 9. Thread 최종 상태

### Source에서 확정된 최종 상태

Schema-valid starter content와 실제 공개 가능한 production content를 구분하고 strict readiness 결과를 build, metadata, robots, sitemap에 일관되게 적용하는 publication trust boundary를 복원합니다.

### 학습자가 완성할 최종 설명

- Thread 시작 시점의 설계와 위험:
- 핵심 architecture/decision이 형성된 순서:
- 실제 failure 또는 부족함이 드러난 지점:
- Fix 또는 boundary 강화가 바꾼 invariant:
- Test/build/browser evidence가 보장한 범위:
- Thread 종료 시점에도 보장하지 않는 범위:

## 10. 최종 architecture 또는 execution flow 정리

아래 source-backed flow의 각 단계에 실제 file path, symbol, input/output, failure branch를 추가합니다.

1. Environment에서 content mode를 exact policy로 해석합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
2. Template mode는 publication requirements 없이 non-indexable preview 결과를 반환합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
3. Production mode는 `SITE_URL`, placeholder, asset, project, contact 검사를 누적합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
4. Issue가 없을 때만 verified public `URL`을 포함한 production result를 만듭니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
5. Prebuild가 schema validation 뒤 readiness를 실행하고 failure를 전파합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
6. Layout metadata, robots, sitemap이 같은 mode/URL/availability를 소비합니다.
   - 실제 코드 위치:
   - 입력과 출력:
   - 실패/absence 처리:
7. Template와 disabled publication surface는 crawler-visible output에서 제외됩니다.
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
