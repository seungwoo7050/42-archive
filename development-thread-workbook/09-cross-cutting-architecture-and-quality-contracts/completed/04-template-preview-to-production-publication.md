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
| Conservative template default의 정확한 입력 집합 | `src/lib/content-readiness.ts::resolvePortfolioContentMode`는 `undefined`, 빈 문자열, exact `template`을 template로, exact `production`만 production으로 반환하고 나머지는 throw합니다. Result는 template일 때 `siteUrl: undefined`, production일 때 `siteUrl: URL`입니다. |
| Exact production activation과 invalid mode | unsupported 문자열은 fallback하지 않고 descriptive `Error`가 되며 이 SHA에는 아직 actual readiness issue를 수집하는 validator가 없습니다. |
| Structured issue/error model | conservative resolver와 discriminated readiness result/error types를 도입했습니다. `src/lib/content-readiness.ts::resolvePortfolioContentMode`는 `undefined`, 빈 문자열, exact `template`을 template로, exact `production`만 production으로 반환하고 나머지는 throw합니다. Result는 template일 때 `siteUrl: undefined`, production일 때 `siteUrl: URL`입니다. |
| 후속 validator가 따라야 하는 return shape | `47b99d6256ef`이 production-specific helpers를 추가하고 `002b642d52a3`이 aggregate validator를 구현합니다. |
| 아직 생성되지 않는 readiness issues | public origin, placeholder, asset, project, contact를 실제 검사하지 않습니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** schema-valid content를 template preview와 production publication으로 구분하는 공통 mode/error protocol이 없었습니다.
- **해당 SHA 핵심 코드:** `src/lib/content-readiness.ts::resolvePortfolioContentMode`는 `undefined`, 빈 문자열, exact `template`을 template로, exact `production`만 production으로 반환하고 나머지는 throw합니다. Result는 template일 때 `siteUrl: undefined`, production일 때 `siteUrl: URL`입니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `47b99d6256ef`이 production-specific helpers를 추가하고 `002b642d52a3`이 aggregate validator를 구현합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** schema-valid content를 template preview와 production publication으로 구분하는 공통 mode/error protocol이 없었습니다. 누락되거나 오타인 environment 값을 production으로 추정하면 starter identity가 공개될 수 있고, 반대로 local preview를 strict production rule로 막을 수 있었습니다.
- **구현 결정과 경로:** conservative resolver와 discriminated readiness result/error types를 도입했습니다. `src/lib/content-readiness.ts::resolvePortfolioContentMode`는 `undefined`, 빈 문자열, exact `template`을 template로, exact `production`만 production으로 반환하고 나머지는 throw합니다. Result는 template일 때 `siteUrl: undefined`, production일 때 `siteUrl: URL`입니다.
- **소유권·실패 처리:** resolver가 mode interpretation을 소유하고 후속 validator가 issue/result protocol을 따르게 됩니다. unsupported 문자열은 fallback하지 않고 descriptive `Error`가 되며 이 SHA에는 아직 actual readiness issue를 수집하는 validator가 없습니다.
- **보장:** production activation이 explicit opt-in이고 result type이 verified URL의 유무를 mode와 연결합니다.
- **보장하지 않는 범위:** public origin, placeholder, asset, project, contact를 실제 검사하지 않습니다.
- **후속 연결:** `47b99d6256ef`이 production-specific helpers를 추가하고 `002b642d52a3`이 aggregate validator를 구현합니다.

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
| Accept/reject URL examples와 branch | public site URL parser와 `/content/` asset namespace check를 추가했습니다. `src/lib/content-readiness.ts::parsePublicSiteUrl`은 absolute URL parsing 후 protocol이 HTTP(S)인지, localhost/127.0.0.1/::1/.localhost인지, example.com/net/org 및 `.example/.invalid/.test`인지, username/password가 비어 있는지 검사합니다. `addProductionAssetIssue`는 `/content/` prefix를 요구합니다. |
| Origin validation과 deployable public link validation 구분 | `src/lib/content-readiness.ts::parsePublicSiteUrl`은 absolute URL parsing 후 protocol이 HTTP(S)인지, localhost/127.0.0.1/::1/.localhost인지, example.com/net/org 및 `.example/.invalid/.test`인지, username/password가 비어 있는지 검사합니다. `addProductionAssetIssue`는 `/content/` prefix를 요구합니다. |
| Asset namespace와 publication 의미 | public site URL parser와 `/content/` asset namespace check를 추가했습니다. `src/lib/content-readiness.ts::parsePublicSiteUrl`은 absolute URL parsing 후 protocol이 HTTP(S)인지, localhost/127.0.0.1/::1/.localhost인지, example.com/net/org 및 `.example/.invalid/.test`인지, username/password가 비어 있는지 검사합니다. `addProductionAssetIssue`는 `/content/` prefix를 요구합니다. |
| 이 commit만으로 complete readiness가 되지 않는 이유 | complete content scan, project/contact completeness, actual asset existence와 build enforcement는 아직 없습니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** mode protocol은 있었지만 `SITE_URL`과 production asset namespace를 판정하는 helper가 없었습니다.
- **해당 SHA 핵심 코드:** `src/lib/content-readiness.ts::parsePublicSiteUrl`은 absolute URL parsing 후 protocol이 HTTP(S)인지, localhost/127.0.0.1/::1/.localhost인지, example.com/net/org 및 `.example/.invalid/.test`인지, username/password가 비어 있는지 검사합니다. `addProductionAssetIssue`는 `/content/` prefix를 요구합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `002b642d52a3`이 origin helper와 placeholder scan을 한 production result로 묶습니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** mode protocol은 있었지만 `SITE_URL`과 production asset namespace를 판정하는 helper가 없었습니다. localhost, reserved example host, credentials 또는 template asset path가 production identity/evidence로 사용될 수 있었습니다.
- **구현 결정과 경로:** public site URL parser와 `/content/` asset namespace check를 추가했습니다. `src/lib/content-readiness.ts::parsePublicSiteUrl`은 absolute URL parsing 후 protocol이 HTTP(S)인지, localhost/127.0.0.1/::1/.localhost인지, example.com/net/org 및 `.example/.invalid/.test`인지, username/password가 비어 있는지 검사합니다. `addProductionAssetIssue`는 `/content/` prefix를 요구합니다.
- **소유권·실패 처리:** URL parser가 publication origin 후보를, asset helper가 production-hosted local namespace를 판정합니다. missing/malformed URL과 public-origin predicate 실패는 environment issue로 누적됩니다. 관찰된 차이로 path/query/hash는 이 SHA에서 별도 거부하지 않고 parsed `URL`을 그대로 반환합니다.
- **보장:** local/reserved/credential-bearing/non-HTTP(S) URL과 `/content/` 밖 asset을 거부할 수 있습니다.
- **보장하지 않는 범위:** complete content scan, project/contact completeness, actual asset existence와 build enforcement는 아직 없습니다.
- **후속 연결:** `002b642d52a3`이 origin helper와 placeholder scan을 한 production result로 묶습니다.

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
| 직전 mode protocol과 개별 helper가 분리된 구조 | mode protocol과 개별 origin/asset helpers는 있었지만 production 전체 source를 통과시키는 aggregate decision이 없었습니다. |
| Schema-valid starter가 production claim으로 노출될 수 있었던 문제 | schema-valid starter marker와 non-public origin이 그대로 metadata/indexing의 production claim이 될 수 있었습니다. |
| Aggregate fail-closed readiness와 verified URL decision | 14개 authoritative source의 recursive placeholder scan과 origin validation을 누적한 뒤 issue가 없을 때만 production result를 반환했습니다. |
| Validator, scanner traversal, issue aggregation, success result | 14개 authoritative source의 recursive placeholder scan과 origin validation을 누적한 뒤 issue가 없을 때만 production result를 반환했습니다. `src/lib/content-readiness.ts::validateProductionReadiness`는 `parsePublicSiteUrl` failure를 issue에 남긴 뒤 `contentFiles` 순서로 `collectPlaceholderIssues`를 재귀 호출합니다. `appendPath`가 object/array JSON path를 만들고 하나라도 issue가 있으면 `PortfolioReadinessError`, 없으면 `{ mode: "production", siteUrl }`입니다. |
| Bad origin와 multiple placeholders 동시 failure | bad origin이 있어도 placeholder scan을 계속하므로 서로 다른 category issue가 한 error에 함께 남습니다. Marker는 문자열당 첫 matching pattern을 report합니다. |
| 보장하는 것: origin/content-marker trust level | production result가 public-origin과 template-marker trust level을 통과했음을 보장합니다. |
| 아직 보장하지 않는 것: required assets/project exits/contact/build | required social/profile/resume assets, enabled project exits, contact, actual filesystem file, build gate와 crawler policy는 아직 보장하지 않습니다. |
| 후속 commit과 indexing policy 연결 | `bcd87ed856bf`와 `71e7ece7208f`이 portfolio-specific completeness를 강화하고 이후 build/SEO가 result를 소비합니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** mode protocol과 개별 origin/asset helpers는 있었지만 production 전체 source를 통과시키는 aggregate decision이 없었습니다.
- **해당 SHA 핵심 코드:** `src/lib/content-readiness.ts::validateProductionReadiness`는 `parsePublicSiteUrl` failure를 issue에 남긴 뒤 `contentFiles` 순서로 `collectPlaceholderIssues`를 재귀 호출합니다. `appendPath`가 object/array JSON path를 만들고 하나라도 issue가 있으면 `PortfolioReadinessError`, 없으면 `{ mode: "production", siteUrl }`입니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `bcd87ed856bf`와 `71e7ece7208f`이 portfolio-specific completeness를 강화하고 이후 build/SEO가 result를 소비합니다.

#### SHA별 복원 결론

- **이전 상태:** mode protocol과 개별 origin/asset helpers는 있었지만 production 전체 source를 통과시키는 aggregate decision이 없었습니다.
- **문제와 위험:** schema-valid starter marker와 non-public origin이 그대로 metadata/indexing의 production claim이 될 수 있었습니다.
- **핵심 결정:** 14개 authoritative source의 recursive placeholder scan과 origin validation을 누적한 뒤 issue가 없을 때만 production result를 반환했습니다.
- **실제 구현 경로:** `src/lib/content-readiness.ts::validateProductionReadiness`는 `parsePublicSiteUrl` failure를 issue에 남긴 뒤 `contentFiles` 순서로 `collectPlaceholderIssues`를 재귀 호출합니다. `appendPath`가 object/array JSON path를 만들고 하나라도 issue가 있으면 `PortfolioReadinessError`, 없으면 `{ mode: "production", siteUrl }`입니다.
- **소유권·상태 변화:** validator가 source traversal과 aggregate decision을 소유하고 success result의 `URL`은 모든 현재 check가 완료된 뒤에만 생성됩니다.
- **실패 경계:** bad origin이 있어도 placeholder scan을 계속하므로 서로 다른 category issue가 한 error에 함께 남습니다. Marker는 문자열당 첫 matching pattern을 report합니다.
- **보장:** production result가 public-origin과 template-marker trust level을 통과했음을 보장합니다.
- **보장하지 않는 범위:** required social/profile/resume assets, enabled project exits, contact, actual filesystem file, build gate와 crawler policy는 아직 보장하지 않습니다.
- **후속 fix/test:** `bcd87ed856bf`와 `71e7ece7208f`이 portfolio-specific completeness를 강화하고 이후 build/SEO가 result를 소비합니다.

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
| Visible publication evidence의 최소 조건 | 공개 대상으로 선택된 project가 production-hosted evidence와 최소 하나의 public exit를 가집니다. |
| Project-level exit의 의미와 accepted protocol | visible publication evidence와 enabled project별 exit를 production readiness에 추가했습니다. `validateProductionReadiness`가 site.socialImage, profile.photo.src, resume.downloadUrl을 `/content/`로 검사하고 enabled projects가 하나 이상인지 확인합니다. Enabled project의 lead/secondary screenshots와 enabled HTTP(S) non-reserved URL link를 검사하며 `enabled === false` project는 skip합니다. |
| Disabled staging exemption | visible publication evidence와 enabled project별 exit를 production readiness에 추가했습니다. `validateProductionReadiness`가 site.socialImage, profile.photo.src, resume.downloadUrl을 `/content/`로 검사하고 enabled projects가 하나 이상인지 확인합니다. Enabled project의 lead/secondary screenshots와 enabled HTTP(S) non-reserved URL link를 검사하며 `enabled === false` project는 skip합니다. |
| 여러 completeness issue의 accumulation | visible publication evidence와 enabled project별 exit를 production readiness에 추가했습니다. `validateProductionReadiness`가 site.socialImage, profile.photo.src, resume.downloadUrl을 `/content/`로 검사하고 enabled projects가 하나 이상인지 확인합니다. Enabled project의 lead/secondary screenshots와 enabled HTTP(S) non-reserved URL link를 검사하며 `enabled === false` project는 skip합니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** origin과 placeholder만 통과하면 evidence가 없는 portfolio도 production result를 얻을 수 있었습니다.
- **해당 SHA 핵심 코드:** `validateProductionReadiness`가 site.socialImage, profile.photo.src, resume.downloadUrl을 `/content/`로 검사하고 enabled projects가 하나 이상인지 확인합니다. Enabled project의 lead/secondary screenshots와 enabled HTTP(S) non-reserved URL link를 검사하며 `enabled === false` project는 skip합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `71e7ece7208f`이 contact와 mode-aware build entry를 추가합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** origin과 placeholder만 통과하면 evidence가 없는 portfolio도 production result를 얻을 수 있었습니다. social/profile/resume asset, enabled project, screenshot, public exit가 없으면 index 가능한 portfolio claim으로서 불완전했습니다.
- **구현 결정과 경로:** visible publication evidence와 enabled project별 exit를 production readiness에 추가했습니다. `validateProductionReadiness`가 site.socialImage, profile.photo.src, resume.downloadUrl을 `/content/`로 검사하고 enabled projects가 하나 이상인지 확인합니다. Enabled project의 lead/secondary screenshots와 enabled HTTP(S) non-reserved URL link를 검사하며 `enabled === false` project는 skip합니다.
- **소유권·실패 처리:** readiness validator가 publication completeness를 소유하고 disabled project는 staging data로 남을 수 있습니다. 누락 asset, zero enabled project, project별 usable link 부재가 각각 source/path issue로 누적됩니다.
- **보장:** 공개 대상으로 선택된 project가 production-hosted evidence와 최소 하나의 public exit를 가집니다.
- **보장하지 않는 범위:** 실제 file existence, contact method, build enforcement와 crawler consistency는 아직 보장하지 않습니다.
- **후속 연결:** `71e7ece7208f`이 contact와 mode-aware build entry를 추가합니다.

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
| Usable contact method의 exact predicate | usable contact predicate와 `validateBuildReadiness` mode-aware entry를 추가했습니다. |
| Template/production execution path 차이 | `isUsableContactHref`는 placeholder를 거부하고 `mailto:`, `tel:` 또는 usable HTTP(S) URL을 허용합니다. 실제 contact record는 enabled, `placements`에 `contact`, type이 `email\|github\|website` 중 하나여야 합니다. `validateBuildReadiness`는 template이면 `{mode, siteUrl:undefined}`, production이면 full validator로 delegate합니다. |
| Mode-aware public API와 private helper | usable contact predicate와 `validateBuildReadiness` mode-aware entry를 추가했습니다. `isUsableContactHref`는 placeholder를 거부하고 `mailto:`, `tel:` 또는 usable HTTP(S) URL을 허용합니다. 실제 contact record는 enabled, `placements`에 `contact`, type이 `email\|github\|website` 중 하나여야 합니다. `validateBuildReadiness`는 template이면 `{mode, siteUrl:undefined}`, production이면 full validator로 delegate합니다. |
| Build script가 호출해야 하는 단일 entry point | `isUsableContactHref`는 placeholder를 거부하고 `mailto:`, `tel:` 또는 usable HTTP(S) URL을 허용합니다. 실제 contact record는 enabled, `placements`에 `contact`, type이 `email\|github\|website` 중 하나여야 합니다. `validateBuildReadiness`는 template이면 `{mode, siteUrl:undefined}`, production이면 full validator로 delegate합니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** portfolio-specific project evidence는 검사했지만 사용자가 연락할 수 있는 public method와 template/production 공용 entry가 없었습니다.
- **해당 SHA 핵심 코드:** `isUsableContactHref`는 placeholder를 거부하고 `mailto:`, `tel:` 또는 usable HTTP(S) URL을 허용합니다. 실제 contact record는 enabled, `placements`에 `contact`, type이 `email|github|website` 중 하나여야 합니다. `validateBuildReadiness`는 template이면 `{mode, siteUrl:undefined}`, production이면 full validator로 delegate합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `37c0dbc079ff`이 이 단일 entry를 `prebuild`에 연결합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** portfolio-specific project evidence는 검사했지만 사용자가 연락할 수 있는 public method와 template/production 공용 entry가 없었습니다. 프로젝트는 공개됐지만 contact link가 disabled, wrong placement/type, placeholder 또는 unusable URL일 수 있었습니다.
- **구현 결정과 경로:** usable contact predicate와 `validateBuildReadiness` mode-aware entry를 추가했습니다. `isUsableContactHref`는 placeholder를 거부하고 `mailto:`, `tel:` 또는 usable HTTP(S) URL을 허용합니다. 실제 contact record는 enabled, `placements`에 `contact`, type이 `email|github|website` 중 하나여야 합니다. `validateBuildReadiness`는 template이면 `{mode, siteUrl:undefined}`, production이면 full validator로 delegate합니다.
- **소유권·실패 처리:** private helpers가 URL/contact details를 소유하고 public caller는 mode-aware gate 하나를 호출합니다. usable contact가 하나도 없으면 `src/content/links.json:$` issue가 누적됩니다. Template path는 strict publication checks를 의도적으로 생략합니다.
- **보장:** production은 project evidence와 usable contact를 포함한 full current readiness를 통과하고 template preview는 계속 가능합니다.
- **보장하지 않는 범위:** actual build lifecycle 연결과 indexing output 일치는 아직 보장하지 않습니다.
- **후속 연결:** `37c0dbc079ff`이 이 단일 entry를 `prebuild`에 연결합니다.

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
| Schema validity와 publication readiness gate 순서 | `scripts/validate-content-readiness.ts`가 authoritative source와 `PORTFOLIO_CONTENT_MODE`/`SITE_URL`을 `validateBuildReadiness`에 전달합니다. `package.json`의 `prebuild`는 `content:check && content:ready` 순서입니다. |
| Mode/env input source | `scripts/validate-content-readiness.ts`가 authoritative source와 `PORTFOLIO_CONTENT_MODE`/`SITE_URL`을 `validateBuildReadiness`에 전달합니다. `package.json`의 `prebuild`는 `content:check && content:ready` 순서입니다. |
| Success/failure output과 exit code | template은 indexing-disabled/strict-check-skip message, production은 verified origin을 출력합니다. `PortfolioReadinessError`는 stderr와 `process.exitCode = 1`로 변환되고 unknown error는 rethrow되어 Next build가 시작되지 않습니다. |
| Normal build lifecycle에서 우회할 수 없는 이유 | npm lifecycle이 order/failure propagation을, readiness CLI가 environment input과 user-facing output을 소유합니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** readiness API는 존재했지만 normal build가 호출하지 않으면 production completeness를 우회할 수 있었습니다.
- **해당 SHA 핵심 코드:** `scripts/validate-content-readiness.ts`가 authoritative source와 `PORTFOLIO_CONTENT_MODE`/`SITE_URL`을 `validateBuildReadiness`에 전달합니다. `package.json`의 `prebuild`는 `content:check && content:ready` 순서입니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `55b6061e0052`부터 동일 mode/result가 crawler-visible policy에 사용됩니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** readiness API는 존재했지만 normal build가 호출하지 않으면 production completeness를 우회할 수 있었습니다. schema/asset check만 통과한 starter content가 Next compilation에 들어갈 수 있었습니다.
- **구현 결정과 경로:** structural `content:check` 뒤 mode-aware `content:ready`를 실행하는 mandatory prebuild chain을 만들었습니다. `scripts/validate-content-readiness.ts`가 authoritative source와 `PORTFOLIO_CONTENT_MODE`/`SITE_URL`을 `validateBuildReadiness`에 전달합니다. `package.json`의 `prebuild`는 `content:check && content:ready` 순서입니다.
- **소유권·실패 처리:** npm lifecycle이 order/failure propagation을, readiness CLI가 environment input과 user-facing output을 소유합니다. template은 indexing-disabled/strict-check-skip message, production은 verified origin을 출력합니다. `PortfolioReadinessError`는 stderr와 `process.exitCode = 1`로 변환되고 unknown error는 rethrow되어 Next build가 시작되지 않습니다.
- **보장:** normal production build가 structural check 후 publication readiness를 반드시 통과합니다.
- **보장하지 않는 범위:** 직접 `next build` binary를 lifecycle 밖에서 호출하는 외부 우회나 deployment infrastructure 자체는 보장하지 않습니다.
- **후속 연결:** `55b6061e0052`부터 동일 mode/result가 crawler-visible policy에 사용됩니다.

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
| Mode별 metadata/robots 결과 | validated site content, content mode, base URL을 입력으로 하는 pure metadata factory를 추가했습니다. metadata helper는 canonical, Open Graph, Twitter와 optional social image absolute URL을 한 base에서 만들고 robots `index/follow`를 production에서만 true로 설정합니다. Social image가 없으면 image field를 만들지 않습니다. |
| Canonical identity와 social URL source | metadata helper는 canonical, Open Graph, Twitter와 optional social image absolute URL을 한 base에서 만들고 robots `index/follow`를 production에서만 true로 설정합니다. Social image가 없으면 image field를 만들지 않습니다. |
| Optional field omission policy | validated site content, content mode, base URL을 입력으로 하는 pure metadata factory를 추가했습니다. |
| Factory testability와 readiness dependency | metadata helper는 canonical, Open Graph, Twitter와 optional social image absolute URL을 한 base에서 만들고 robots `index/follow`를 production에서만 true로 설정합니다. Social image가 없으면 image field를 만들지 않습니다. 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** build가 production readiness를 알지만 page metadata가 template/production을 별도로 추정할 수 있었습니다.
- **해당 SHA 핵심 코드:** metadata helper는 canonical, Open Graph, Twitter와 optional social image absolute URL을 한 base에서 만들고 robots `index/follow`를 production에서만 true로 설정합니다. Social image가 없으면 image field를 만들지 않습니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `cb61450ad922`과 `70b69f04e8c7`이 같은 contract를 robots/sitemap에 적용합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** build가 production readiness를 알지만 page metadata가 template/production을 별도로 추정할 수 있었습니다. template preview가 canonical/robots index claim을 생성하거나 social URL이 다른 origin을 사용할 위험이 있었습니다.
- **구현 결정과 경로:** validated site content, content mode, base URL을 입력으로 하는 pure metadata factory를 추가했습니다. metadata helper는 canonical, Open Graph, Twitter와 optional social image absolute URL을 한 base에서 만들고 robots `index/follow`를 production에서만 true로 설정합니다. Social image가 없으면 image field를 만들지 않습니다.
- **소유권·실패 처리:** factory input caller가 mode/base URL을 제공하고 pure helper는 request headers/filesystem을 직접 읽지 않습니다. optional field absence는 omission으로 처리하며 template은 canonical metadata가 있어도 index/follow를 허용하지 않습니다.
- **보장:** page metadata의 publication identity와 indexing flag가 같은 validated mode를 따릅니다.
- **보장하지 않는 범위:** `robots.txt`와 sitemap discovery까지의 외부 crawler policy는 아직 분리돼 있습니다.
- **후속 연결:** `cb61450ad922`과 `70b69f04e8c7`이 같은 contract를 robots/sitemap에 적용합니다.

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
| Template disallow-all 정책 | content mode와 verified production URL로 robots output을 생성했습니다. |
| Production allow/host 정책 | content mode와 verified production URL로 robots output을 생성했습니다. |
| Impossible state 방어 | readiness result가 production URL ownership을, robots route가 crawler rule serialization을 소유합니다. |
| Metadata와 crawler policy 일관성 | content mode와 verified production URL로 robots output을 생성했습니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** metadata robots flag는 정리됐지만 `/robots.txt`가 같은 mode/result를 소비하지 않았습니다.
- **해당 SHA 핵심 코드:** robots generator는 template에서 user-agent `*`, disallow `/`; production에서 allow `/`와 verified URL의 host를 반환합니다. Production인데 URL이 없으면 impossible programming state로 error를 throw합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** `70b69f04e8c7`이 enabled publication surface만 sitemap으로 노출합니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** metadata robots flag는 정리됐지만 `/robots.txt`가 같은 mode/result를 소비하지 않았습니다. page metadata는 non-indexable인데 crawler policy는 허용하거나 반대 상태가 될 수 있었습니다.
- **구현 결정과 경로:** content mode와 verified production URL로 robots output을 생성했습니다. robots generator는 template에서 user-agent `*`, disallow `/`; production에서 allow `/`와 verified URL의 host를 반환합니다. Production인데 URL이 없으면 impossible programming state로 error를 throw합니다.
- **소유권·실패 처리:** readiness result가 production URL ownership을, robots route가 crawler rule serialization을 소유합니다. template는 fail-closed disallow-all이고 impossible discriminant/URL mismatch는 조용한 fallback 없이 실패합니다.
- **보장:** metadata와 robots가 template/production indexing decision에서 일치합니다.
- **보장하지 않는 범위:** enabled route discovery와 sitemap advertisement는 아직 추가되지 않았습니다.
- **후속 연결:** `70b69f04e8c7`이 enabled publication surface만 sitemap으로 노출합니다.

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
| Published route set의 source-of-truth | `src/app/sitemap.ts`는 template에서 `[]`, production에서 core route와 enabled optional pages, enabled project IDs의 detail URLs를 만듭니다. `src/app/robots.ts`는 production에서 sitemap URL도 광고합니다. |
| Template/production sitemap 차이 | `src/app/sitemap.ts`는 template에서 `[]`, production에서 core route와 enabled optional pages, enabled project IDs의 detail URLs를 만듭니다. `src/app/robots.ts`는 production에서 sitemap URL도 광고합니다. |
| Optional page와 project detail inclusion rules | validated production origin과 current content availability에서 sitemap entries를 동적으로 생성했습니다. `src/app/sitemap.ts`는 template에서 `[]`, production에서 core route와 enabled optional pages, enabled project IDs의 detail URLs를 만듭니다. `src/app/robots.ts`는 production에서 sitemap URL도 광고합니다. |
| Rendering availability와 crawl discovery의 동일성 | validated production origin과 current content availability에서 sitemap entries를 동적으로 생성했습니다. `src/app/sitemap.ts`는 template에서 `[]`, production에서 core route와 enabled optional pages, enabled project IDs의 detail URLs를 만듭니다. `src/app/robots.ts`는 production에서 sitemap URL도 광고합니다. |

#### 코드 발췌 기록

- **변경 전 대응 코드:** robots는 production indexing을 허용하지만 실제 enabled route/project set을 알리는 sitemap이 없었습니다.
- **해당 SHA 핵심 코드:** `src/app/sitemap.ts`는 template에서 `[]`, production에서 core route와 enabled optional pages, enabled project IDs의 detail URLs를 만듭니다. `src/app/robots.ts`는 production에서 sitemap URL도 광고합니다.
- **실행·테스트 증거:** 실행하지 못했습니다. 로컬 Git clone 단계에서 실행 환경의 GitHub DNS 해석이 차단되어 build/test/browser/Docker command를 수행할 수 없었습니다. 문서의 구현 설명은 해당 SHA의 diff와 파일을 GitHub connector로 정적 검토한 결과이며 실행 성공으로 표시하지 않습니다.
- **다음 commit 연결:** 이 commit으로 build, metadata, robots, sitemap의 publication decision chain이 완성됩니다.

#### SHA별 복원 결론

- **이전 상태와 문제:** robots는 production indexing을 허용하지만 실제 enabled route/project set을 알리는 sitemap이 없었습니다. disabled optional page나 project가 고정 sitemap에 남으면 rendering availability와 crawler discovery가 어긋납니다.
- **구현 결정과 경로:** validated production origin과 current content availability에서 sitemap entries를 동적으로 생성했습니다. `src/app/sitemap.ts`는 template에서 `[]`, production에서 core route와 enabled optional pages, enabled project IDs의 detail URLs를 만듭니다. `src/app/robots.ts`는 production에서 sitemap URL도 광고합니다.
- **소유권·실패 처리:** content configuration이 route availability를 소유하고 sitemap은 그 predicate를 재사용해 absolute URLs를 직렬화합니다. disabled page/project는 제외되고 production URL이 없는 impossible state는 upstream result contract로 막힙니다.
- **보장:** crawler discovery가 실제 enabled publication surface와 동일한 mode/origin을 사용합니다.
- **보장하지 않는 범위:** 검색 엔진의 실제 crawl/index 결과나 external canonical correctness는 보장하지 않습니다.
- **후속 연결:** 이 commit으로 build, metadata, robots, sitemap의 publication decision chain이 완성됩니다.

## 6. Invariant ledger

| Invariant | Source에서 확인된 변화 지점 | 해당 SHA의 실제 code/test evidence | 부족함이 드러난 시점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| Missing/empty/explicit template mode는 template이며 exact production만 production을 요청합니다. | `b3bd671a3243` | `resolvePortfolioContentMode`: `undefined\|""\|"template"` → template, exact `"production"` → production, else throw. | 이전에는 consumer가 environment string을 각자 추정할 수 있었습니다. | production은 explicit opt-in이며 mode/result discriminant가 URL 유무와 연결됩니다. |
| Production origin은 public HTTP(S)이고 local/reserved/credential-bearing 값이 아닙니다. | `47b99d6256ef` | `parsePublicSiteUrl`의 URL parse, HTTP(S), local/reserved host, credentials branches와 `/content/` asset helper. | schema-valid URL/string만으로 public production origin/asset placement를 보장하지 못했습니다. | 현재 validator는 public-looking origin과 production asset namespace를 요구합니다. Path/query/hash는 이 SHA에서 별도 거부하지 않습니다. |
| Production result는 complete readiness 성공 뒤에만 verified URL을 포함합니다. | `002b642d52a3` | `validateProductionReadiness`: origin issue accumulation, 14-file recursive placeholder scan, issue-empty success에서만 `{mode:"production", siteUrl}`. | mode/error protocol과 helpers만 있을 때 complete publication decision은 없었습니다. | success result의 URL은 현재 모든 production readiness check를 통과한 뒤에만 노출됩니다. |
| Published project는 실제 자산과 enabled public exit를 가지며 usable contact가 존재합니다. | `bcd87ed856bf → 71e7ece7208f` | required social/profile/resume assets, enabled project count/screenshots/public links와 enabled contact predicate. | origin/placeholder만 통과해도 evidence/contact가 없는 portfolio가 production이 될 수 있었습니다. | enabled publication records만 검사하며 published project와 contact의 minimum evidence/exit를 요구합니다. |
| Readiness는 normal production build의 mandatory gate입니다. | `37c0dbc079ff` | `package.json::prebuild` → `content:check && content:ready`; CLI의 mode/env 전달 및 non-zero handling. | readiness API가 manual command이면 normal build에서 우회할 수 있었습니다. | npm normal build lifecycle은 schema/asset check 후 mode-aware readiness를 통과해야 합니다. |
| Template는 non-indexable이고 crawler output은 enabled publication surface만 반영합니다. | `55b6061e0052 → cb61450ad922 → 70b69f04e8c7` | metadata factory, robots route, sitemap route가 같은 mode/verified URL/content availability를 사용합니다. | build decision과 crawler-visible outputs가 서로 다른 조건을 사용할 수 있었습니다. | template는 noindex/disallow/empty sitemap이며 production은 enabled routes/projects만 canonical/crawl discovery에 포함합니다. |

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

### 실제 연결 기록

- Unsupported mode는 template fallback이 아니라 immediate error입니다. Production origin issue와 content placeholders는 한 aggregate report에 함께 들어갑니다.
- `47b99d6256ef`의 parser는 path/query/hash를 거부하거나 origin으로 normalize하지 않고 parsed URL을 그대로 반환합니다. 문서에서는 이를 실제 구현 범위로 제한했습니다.
- Contact URL helper는 `mailto:`, `tel:`, usable HTTP(S)를 허용하지만 contact record type filter는 `email|github|website`와 contact placement를 별도로 요구합니다.

## 8. Ownership / state / responsibility 변화

| Concern | Thread 초기 owner/state | Thread 최종 owner/state | 실제 symbol과 호출 경로 |
| --- | --- | --- | --- |
| Content mode 해석 | Consumer별 환경 문자열 해석 | 공용 mode resolver와 error model | `src/lib/content-readiness.ts::resolvePortfolioContentMode` → discriminated template/production path. |
| Public origin/asset policy | Schema 또는 metadata의 추정 | Production-specific readiness validator | `parsePublicSiteUrl`, `addProductionAssetIssue`, `validateProductionReadiness`가 production-specific trust를 소유합니다. |
| Production completeness | Page/SEO별 개별 방어 | Aggregate readiness result | `validateBuildReadiness`가 template short-circuit와 production aggregate validator를 하나의 public entry로 묶습니다. |
| Build enforcement | Optional command | `prebuild` readiness script | `package.json::prebuild` → readiness CLI → `validateBuildReadiness`; issue error가 process status로 전파됩니다. |
| Indexing policy | Metadata/robots/sitemap별 조건 | 공통 content-mode contract | layout metadata helper, `src/app/robots.ts`, `src/app/sitemap.ts`가 같은 mode/siteUrl/availability result를 직렬화합니다. |

## 9. Thread 최종 상태

### Source에서 확정된 최종 상태

Schema-valid starter content와 실제 공개 가능한 production content를 구분하고 strict readiness 결과를 build, metadata, robots, sitemap에 일관되게 적용하는 publication trust boundary를 복원합니다.

### 학습자가 완성할 최종 설명

- **Thread 시작 시점의 설계와 위험:** 시작 시점에는 schema-valid starter data와 실제로 공개 가능한 identity/evidence를 구분하지 않아 template placeholder가 production claim이 될 위험이 있었습니다.
- **핵심 architecture/decision이 형성된 순서:** conservative mode resolver, public-origin/asset helpers, aggregate placeholder scan, project/contact completeness, prebuild gate, metadata/robots/sitemap policy 순서로 publication boundary를 만들었습니다.
- **실제 failure 또는 부족함이 드러난 지점:** origin과 marker만 검사한 초기 aggregate validator는 required assets, enabled exits와 contact를 보장하지 않아 후속 commits에서 completeness가 강화됐습니다.
- **Fix 또는 boundary 강화가 바꾼 invariant:** `validateBuildReadiness`와 `prebuild`가 우회를 줄이고 crawler outputs가 같은 result를 소비해 build state와 indexing state의 모순을 막습니다.
- **Test/build/browser evidence가 보장한 범위:** 각 exact SHA의 predicates, issue accumulation과 command wiring을 정적으로 검토했습니다. build/robots/sitemap command는 실행하지 않았습니다.
- **Thread 종료 시점에도 보장하지 않는 범위:** 실제 asset filesystem/HTTP serving, search engine indexing 결과, external proxy/canonical configuration과 human content quality는 별도 보장입니다.

## 10. 최종 architecture 또는 execution flow 정리

아래 source-backed flow의 각 단계에 실제 file path, symbol, input/output, failure branch를 추가합니다.

1. Environment에서 content mode를 exact policy로 해석합니다.
   - 실제 코드 위치: `resolvePortfolioContentMode`
   - 입력과 출력: `PORTFOLIO_CONTENT_MODE` raw string을 template 또는 production discriminant로 변환합니다.
   - 실패/absence 처리: unsupported value는 fallback 없이 throw합니다.
2. Template mode는 publication requirements 없이 non-indexable preview 결과를 반환합니다.
   - 실제 코드 위치: `validateBuildReadiness` template branch + metadata/robots/sitemap consumers
   - 입력과 출력: template result는 `siteUrl: undefined`; preview render는 허용하되 indexing은 false, robots disallow, sitemap empty입니다.
   - 실패/absence 처리: publication requirements를 의도적으로 실행하지 않으며 crawler-visible claim을 만들지 않습니다.
3. Production mode는 `SITE_URL`, placeholder, asset, project, contact 검사를 누적합니다.
   - 실제 코드 위치: `validateProductionReadiness`와 helper predicates
   - 입력과 출력: `SITE_URL`, 14 content files, required assets, enabled projects/screenshots/links/contact를 issue array에 누적합니다.
   - 실패/absence 처리: 각 invalid field는 source/path/message issue가 되며 bad origin이 있어도 나머지 scan을 계속합니다.
4. Issue가 없을 때만 verified public `URL`을 포함한 production result를 만듭니다.
   - 실제 코드 위치: `validateProductionReadiness` success branch
   - 입력과 출력: issue가 없고 parsed URL이 있을 때만 `{mode:"production", siteUrl: URL}`을 반환합니다.
   - 실패/absence 처리: URL이 없거나 issue가 하나라도 있으면 `PortfolioReadinessError`를 throw합니다.
5. Prebuild가 schema validation 뒤 readiness를 실행하고 failure를 전파합니다.
   - 실제 코드 위치: `package.json::prebuild`, `scripts/validate-content-readiness.ts`
   - 입력과 출력: schema/asset check 다음 readiness CLI가 mode/env와 authoritative source를 검사합니다.
   - 실패/absence 처리: known readiness error는 stderr + exitCode 1, unknown error는 rethrow되어 Next build를 중단합니다.
6. Layout metadata, robots, sitemap이 같은 mode/URL/availability를 소비합니다.
   - 실제 코드 위치: metadata factory, `src/app/robots.ts`, `src/app/sitemap.ts`
   - 입력과 출력: verified mode/site URL과 page/project availability로 canonical/social/robots/sitemap outputs를 만듭니다.
   - 실패/absence 처리: production URL 없는 impossible state는 error이고 optional/disabled records는 omission됩니다.
7. Template와 disabled publication surface는 crawler-visible output에서 제외됩니다.
   - 실제 코드 위치: crawler-visible template/disabled branches
   - 입력과 출력: template는 non-indexable, disabled pages/projects는 production sitemap에서 제외됩니다.
   - 실패/absence 처리: rendering availability와 discovery set이 다를 경우 shared predicate/test가 regression을 드러냅니다.

### 코드 없이 설명하기

> 이 Thread의 최종 실행 흐름을 code snippet 없이 자신의 말로 작성합니다. 설계 → 구현 → failure/risk → 수정/강화 → 검증 순서가 드러나야 합니다.

runtime schema를 통과한 starter content라도 공개 가능한 portfolio라는 뜻은 아닙니다. 그래서 mode를 conservative하게 해석하고 production에서만 public URL, placeholder, assets, enabled project exits와 contact를 누적 검사했습니다. 모든 조건이 성공한 뒤에만 verified URL이 있는 production result를 만들고 normal prebuild에서 이 gate를 실행합니다. Metadata, robots와 sitemap도 같은 mode/result 및 enabled content를 사용하므로 template는 preview 가능하지만 index되지 않고 disabled publication surface는 discovery되지 않습니다.

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
