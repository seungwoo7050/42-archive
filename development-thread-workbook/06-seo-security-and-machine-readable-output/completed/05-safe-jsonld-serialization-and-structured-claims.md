# Thread: Safe JSON-LD serialization and structured claims

> Project: 42 Archive Portfolio (`web/portfolio`)
>
> Category: `06-seo-security-and-machine-readable-output`
>
> Phase 1 audit에서 확정한 구조입니다. Phase 2는 이 문서의 fixed fields와 commit sequence를 변경하지 않습니다.

## 0. 분류 출처와 역사 범위

- Repository/branch scope는 `seungwoo7050/42-archive`의 `web/portfolio`로 한정합니다.
- `commit/commit-importance.md` on `web/portfolio` describes the branch as one independent, linear 476-commit history from `cce7dd020563` through `aff0acdd4cf9`. Every SHA below was matched to that branch-local classification and its exact commit object/diff.
- Subject, importance, tags는 branch-local source classification과 일치시켰습니다.
- 아래 role, investigation target, invariant는 Phase 1 category audit에서 repository evidence에 맞춰 동결했습니다.
- 다른 branch 또는 final HEAD를 과거 SHA 설명에 사용하지 않습니다.

## 1. Thread 목표

Validated production content에서만 Person/WebSite와 project CreativeWork claims를 만들고, JSON text가 HTML script context를 종료하거나 변경할 수 없도록 dedicated serializer/component boundary를 거쳐 root와 project detail routes에 연결하는 과정을 복원합니다.

### Phase 1 boundary decision

기존 4번째 draft의 commit set과 순서는 적절했습니다. Phase 1에서는 generic prompts를 serializer threat, stable IDs, optional claims, production gating, dual render branch, negative-claim regression에 맞춘 exact inspection tasks로 교체했습니다.

### Frozen critical invariants

- JSON-LD는 `StructuredData` component를 통해서만 raw script HTML에 삽입되고 `<`, `>`, `&`가 Unicode escape로 변환됩니다.
- Site graph와 project record는 authoritative validated content와 validated public origin만 사용합니다.
- Template mode에서는 site-level과 project-level structured data를 모두 emit하지 않습니다.
- Person/WebSite/CreativeWork IDs와 author references는 같은 public origin의 stable fragments/paths로 연결됩니다.
- Repository content가 근거를 제공하지 않는 award/rating 같은 claims는 추가하지 않습니다.

### Major engineering difficulties

- `application/ld+json` script 안의 JSON validity와 HTML parser context safety를 동시에 유지하는 문제
- Site owner, website, project records를 stable `@id` references로 연결하면서 content evidence를 과장하지 않는 문제
- Project detail의 dedicated renderer와 fallback renderer 두 return paths에 machine-readable output을 빠짐없이 적용하는 문제

## 2. 핵심 질문

- Plain `JSON.stringify` 결과가 `</script>`를 포함할 때 어떤 embedding risk가 있으며 serializer는 무엇을 escape합니까?
- Person/WebSite graph의 stable IDs와 optional alternateName/image branches는 어떻게 구성됩니까?
- CreativeWork record는 어떤 project/site fields만 claim하며 author reference를 어떻게 연결합니까?
- Production gating은 root layout와 project detail page에서 각각 어디에 위치합니까?
- Final tests는 positive fields뿐 아니라 unsupported claims와 script terminator를 어떻게 검증합니까?

## 3. 완료 기준

- Serializer introduction을 content model보다 먼저 둔 실제 commit order와 security rationale를 설명했습니다.
- Site graph와 project record의 fields, IDs, optional branches, non-guarantees를 exact SHA별로 기록했습니다.
- 두 project rendering paths 모두 structured data sibling을 받는 integration을 확인했습니다.
- `c5938ea4b4f8`의 semantic, negative-claim, embedding-safety tests를 구분했습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Frozen role |
| --- | --- | --- | --- | --- | --- |
| 1 | `228e40a48d64` | feat(seo): JSON-LD 안전 직렬화 경계 추가 | A | SEO | Establish the only raw-script embedding boundary and safe serializer |
| 2 | `ee98415be696` | feat(seo): 사이트 소유자 JSON-LD 모델 추가 | B | SEO | Model the site owner and website as one linked graph |
| 3 | `ae4ec172e45a` | feat(seo): production layout에 사이트 JSON-LD 연결 | B | SEO | Emit the site graph at the root layout only in production mode |
| 4 | `7e09745d409e` | feat(seo): 프로젝트 CreativeWork JSON-LD 모델 추가 | B | SEO | Map an authoritative project record to a linked CreativeWork claim |
| 5 | `f7bd33a8b403` | feat(seo): 프로젝트 상세에 JSON-LD 연결 | B | SEO | Emit project structured data across both detail rendering paths |
| 6 | `c5938ea4b4f8` | test(seo): JSON-LD 계약과 직렬화 검증 | A | VALIDATION, SEO, TEST | Protect structured-data semantics, negative claims, and script-context safety |

## 5. Commit별 학습 기록

### `228e40a48d64` — feat(seo): JSON-LD 안전 직렬화 경계 추가

- **Importance:** A
- **Tags:** SEO
- **Frozen role:** Establish the only raw-script embedding boundary and safe serializer

#### 해당 SHA에서 확인할 실제 코드

- 새 `src/components/portfolio/structured-data.tsx`와 `serializeStructuredData`를 확인합니다.
- `JSON.stringify` 뒤 `<`, `>`, `&` replacement 순서와 resulting JSON string semantics를 확인합니다.
- `dangerouslySetInnerHTML`이 serializer result만 받는 call relation을 추적합니다.
- U+2028/U+2029, non-serializable values, CSP nonce가 이 commit에서 다뤄지는지 구분합니다.

확인 원칙:

- `228e40a48d64^`와 `228e40a48d64`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-228e40a48d64 -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Structured data model이나 embedding component가 없었고, future JSON-LD를 plain `JSON.stringify`로 raw script에 넣으면 content string의 `</script>`가 HTML parser context를 닫을 위험이 있었습니다. |
| 실제 변경 file/symbol/call path | `serializeStructuredData(data)`가 JSON text의 markup-significant characters를 unicode escapes로 바꾸고 `StructuredData`가 그 string만 `application/ld+json` script의 `dangerouslySetInnerHTML`로 전달합니다. |
| Data/state/owner | Serializer가 text-safety policy를 소유하고 component가 raw DOM insertion point를 단일화합니다. Input record는 수정하지 않습니다. |
| Failure·absence·fallback | `JSON.stringify`가 unsupported/cyclic input에서 실패하면 그대로 throw합니다. Component에는 fallback rendering이 없습니다. `<`, `>`, `&`는 escaped되어 script terminator를 구성할 수 없습니다. |
| 보장/비보장 | HTML script-context termination과 markup interpretation을 방지합니다. Schema.org semantic validity, CSP nonce, cyclic object handling, every possible Unicode separator policy는 보장하지 않습니다. |
| 후속 연결 | `ee98415be696`과 `7e09745d409e`가 safe boundary에 넣을 site/project models를 만듭니다. |

#### 코드·실행 증거

**최소 코드 발췌**

```ts
// 228e40a48d64 — src/lib/site-metadata.ts — serializeStructuredData
return JSON.stringify(data)
  .replaceAll("<", "\\u003c")
  .replaceAll(">", "\\u003e")
  .replaceAll("&", "\\u0026");
```

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

`ee98415be696`과 `7e09745d409e`가 safe boundary에 넣을 site/project models를 만듭니다.
<!-- learner:end commit-228e40a48d64 -->


### `ee98415be696` — feat(seo): 사이트 소유자 JSON-LD 모델 추가

- **Importance:** B
- **Tags:** SEO
- **Frozen role:** Model the site owner and website as one linked graph

#### 해당 SHA에서 확인할 실제 코드

- `createSiteStructuredData`의 Person/WebSite records와 `@graph` order를 확인합니다.
- `/#person`, `/#website` stable IDs와 `author: {"@id": personId}` relation을 추적합니다.
- Korean name과 profile photo optional branches를 확인합니다.
- Content fields가 validated source에서 오지만 function 자체가 readiness를 호출하지 않는 경계를 기록합니다.

확인 원칙:

- `ee98415be696^`와 `ee98415be696`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-ee98415be696 -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Safe serializer는 있었지만 machine-readable site identity를 표현할 data model이 없었습니다. |
| 실제 변경 file/symbol/call path | `createSiteStructuredData({content, siteUrl})`가 Person record와 author-linked WebSite record를 `@graph`로 반환합니다. |
| Data/state/owner | Validated portfolio aggregate가 claims의 source owner이고 factory가 schema mapping과 stable IDs를 소유합니다. Public origin은 caller가 전달합니다. |
| Failure·absence·fallback | `koreanName`과 `photo`가 없으면 corresponding properties를 생략합니다. Required profile/site fields는 upstream schema를 전제로 합니다. |
| 보장/비보장 | Person/WebSite identity와 relation은 만들지만 runtime emission, production-only gating, external social profiles, credentials/awards는 아직 없습니다. |
| 후속 연결 | `ae4ec172e45a`가 production root layout에 graph를 연결합니다. |

#### 코드·실행 증거

**최소 코드 발췌**

이 commit은 본문에 exact file/symbol/branch를 기록했습니다. 확인된 diff를 임의 축약한 pseudo-code를 만들지 않기 위해 코드 블록은 생략했습니다.

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

`ae4ec172e45a`가 production root layout에 graph를 연결합니다.
<!-- learner:end commit-ee98415be696 -->


### `ae4ec172e45a` — feat(seo): production layout에 사이트 JSON-LD 연결

- **Importance:** B
- **Tags:** SEO
- **Frozen role:** Emit the site graph at the root layout only in production mode

#### 해당 SHA에서 확인할 실제 코드

- `src/app/layout.tsx`의 mode resolution과 `siteStructuredData` conditional construction을 확인합니다.
- Production branch가 `resolveProductionSiteUrl`과 `getPortfolioContent`를 factory에 전달하는지 추적합니다.
- `<body>` 첫 child로 optional `StructuredData`가 삽입되는 위치를 확인합니다.

확인 원칙:

- `ae4ec172e45a^`와 `ae4ec172e45a`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-ae4ec172e45a -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Site graph factory는 있었지만 어떤 route에서도 rendered output에 포함되지 않았습니다. |
| 실제 변경 file/symbol/call path | RootLayout가 mode를 resolve하고 production에서만 site graph를 생성해 `<StructuredData>`를 body에 삽입합니다. Template은 `undefined`와 null render를 사용합니다. |
| Data/state/owner | Root layout가 site-wide emission lifecycle을 소유합니다. Factory는 model, readiness helper는 public origin, component는 serialization/insertion을 각각 소유합니다. |
| Failure·absence·fallback | Template은 명시적으로 아무 JSON-LD도 출력하지 않습니다. Production SITE_URL validation failure는 layout rendering을 실패시킵니다. |
| 보장/비보장 | 모든 production pages에 site graph가 한 번 포함됩니다. Full aggregate readiness는 normal prebuild의 별도 contract이며 layout은 직접 호출하지 않습니다. |
| 후속 연결 | `7e09745d409e`와 `f7bd33a8b403`이 project-specific record와 detail-route emission을 추가합니다. |

#### 코드·실행 증거

**최소 코드 발췌**

이 commit은 본문에 exact file/symbol/branch를 기록했습니다. 확인된 diff를 임의 축약한 pseudo-code를 만들지 않기 위해 코드 블록은 생략했습니다.

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

`7e09745d409e`와 `f7bd33a8b403`이 project-specific record와 detail-route emission을 추가합니다.
<!-- learner:end commit-ae4ec172e45a -->


### `7e09745d409e` — feat(seo): 프로젝트 CreativeWork JSON-LD 모델 추가

- **Importance:** B
- **Tags:** SEO
- **Frozen role:** Map an authoritative project record to a linked CreativeWork claim

#### 해당 SHA에서 확인할 실제 코드

- `createProjectStructuredData`의 project path, `@id`, author reference를 확인합니다.
- Summary, screenshot, language, tags, title, URL fields가 어떤 source properties에서 오는지 매핑합니다.
- Site-level `/#person` ID와 동일한 author reference를 사용하는지 확인합니다.
- Awards/ratings/deployment claims가 존재하지 않는 것을 resulting object에서 확인합니다.

확인 원칙:

- `7e09745d409e^`와 `7e09745d409e`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-7e09745d409e -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Root site graph만 있어 개별 case study가 machine-readable creative work로 식별되지 않았습니다. |
| 실제 변경 file/symbol/call path | `createProjectStructuredData({content, project, siteUrl})`가 `/projects/<id>` URL과 `#creative-work` ID를 만들고 project summary/image/tags/title 및 site language를 매핑합니다. |
| Data/state/owner | Project aggregate가 claim data를 소유하고 site content는 language/public identity context를 제공합니다. Factory는 mapping only입니다. |
| Failure·absence·fallback | Screenshot path와 URL conversion은 caller가 validated content/public URL을 전달한다는 전제입니다. Optional omission branch 없이 selected fields를 모두 사용합니다. |
| 보장/비보장 | CreativeWork와 site Person 간 stable author link를 보장합니다. Award, rating, employer, deployment status 같은 unsupported semantic claims는 추가하지 않습니다. |
| 후속 연결 | `f7bd33a8b403`이 actual project detail route의 두 rendering branches에 record를 연결합니다. |

#### 코드·실행 증거

**최소 코드 발췌**

이 commit은 본문에 exact file/symbol/branch를 기록했습니다. 확인된 diff를 임의 축약한 pseudo-code를 만들지 않기 위해 코드 블록은 생략했습니다.

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

`f7bd33a8b403`이 actual project detail route의 두 rendering branches에 record를 연결합니다.
<!-- learner:end commit-7e09745d409e -->


### `f7bd33a8b403` — feat(seo): 프로젝트 상세에 JSON-LD 연결

- **Importance:** B
- **Tags:** SEO
- **Frozen role:** Emit project structured data across both detail rendering paths

#### 해당 SHA에서 확인할 실제 코드

- Project detail page의 existing `notFound` checks 뒤 mode/structuredData construction 순서를 확인합니다.
- Dedicated renderer return과 fallback `PageShell` return 모두 fragment sibling으로 `StructuredData`를 받는지 비교합니다.
- Template mode null branch와 production URL resolver failure를 확인합니다.
- Route metadata generation과 page body JSON-LD generation이 separate framework paths임을 기록합니다.

확인 원칙:

- `f7bd33a8b403^`와 `f7bd33a8b403`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-f7bd33a8b403 -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | CreativeWork model은 있었지만 project detail page가 render하지 않았고, multi-design dedicated path와 fallback path 중 하나만 수정할 위험이 있었습니다. |
| 실제 변경 file/symbol/call path | Page가 valid content/project를 확인한 뒤 mode를 resolve합니다. Production에서 record를 만들고 dedicated renderer fragment와 fallback fragment 양쪽 첫 child로 `StructuredData`를 넣습니다. |
| Data/state/owner | Page boundary가 project selection, mode gating, both render branches integration을 소유합니다. Renderer는 structured claims를 재해석하지 않습니다. |
| Failure·absence·fallback | Disabled projects page 또는 missing project는 JSON-LD 생성 전에 `notFound()`합니다. Template은 no structured data. Production SITE_URL invalid이면 render가 실패합니다. |
| 보장/비보장 | 모든 supported visual rendering path에서 같은 project claim을 제공합니다. Browser DOM uniqueness, Schema.org external validation, search-engine rich result eligibility는 보장하지 않습니다. |
| 후속 연결 | `c5938ea4b4f8`이 models와 serializer의 semantic/safety contracts를 함께 잠급니다. |

#### 코드·실행 증거

**최소 코드 발췌**

이 commit은 본문에 exact file/symbol/branch를 기록했습니다. 확인된 diff를 임의 축약한 pseudo-code를 만들지 않기 위해 코드 블록은 생략했습니다.

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

`c5938ea4b4f8`이 models와 serializer의 semantic/safety contracts를 함께 잠급니다.
<!-- learner:end commit-f7bd33a8b403 -->


### `c5938ea4b4f8` — test(seo): JSON-LD 계약과 직렬화 검증

- **Importance:** A
- **Tags:** VALIDATION, SEO, TEST
- **Frozen role:** Protect structured-data semantics, negative claims, and script-context safety

#### 해당 SHA에서 확인할 실제 코드

- `src/lib/site-metadata.test.ts`의 `describe("structured data")` 세 tests를 확인합니다.
- Site graph expected IDs/types/content fields, project expected fields를 production functions에 연결합니다.
- `not.toHaveProperty("award")`, `not.toHaveProperty("aggregateRating")` negative assertions를 확인합니다.
- `serializeStructuredData({value: "</script>"})`의 expected escape와 test가 실제 DOM을 render하지 않는 한계를 기록합니다.

확인 원칙:

- `c5938ea4b4f8^`와 `c5938ea4b4f8`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-c5938ea4b4f8 -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | JSON-LD models와 integration이 있었지만 field drift, unsupported claim addition, script terminator regression을 잡는 focused contract가 없었습니다. |
| 실제 변경 file/symbol/call path | Tests가 site/project factories와 serializer를 직접 호출합니다. Site graph는 Person/WebSite IDs와 content, project는 CreativeWork identity/content/URL을 확인합니다. |
| Data/state/owner | Actual validated content fixture와 explicit public URL이 expected claims의 source입니다. Test는 pure data/serialized string을 관찰합니다. |
| Failure·absence·fallback | Project fixture가 없으면 explicit error를 throw합니다. Negative properties가 없어야 하며 `</script>`는 `\u003c/script\u003e`를 포함해야 합니다. |
| 보장/비보장 | Semantic field mapping, deliberate claim restraint, critical HTML embedding escape를 deterministic하게 증명합니다. React component render, browser parser, CSP, external schema validator, rich result eligibility는 증명하지 않습니다. |
| 후속 연결 | Category 내 structured-data story의 마지막 regression boundary입니다. |

#### 코드·실행 증거

**최소 코드 발췌**

```ts
// c5938ea4b4f8 — src/lib/site-metadata.test.ts
expect(structuredData).not.toHaveProperty("award");
expect(structuredData).not.toHaveProperty("aggregateRating");
expect(serializeStructuredData({ value: "</script>" }))
  .toContain("\\u003c/script\\u003e");
```

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

Category 내 structured-data story의 마지막 regression boundary입니다.
<!-- learner:end commit-c5938ea4b4f8 -->


## 6. Invariant evolution

<!-- learner:start thread-invariant-evolution -->
| Commit/구간 | 상태 | 근거 기반 설명 |
| --- | --- | --- |
| 228e40a48d64 | Security boundary introduced | Raw script insertion is centralized and markup-significant characters are escaped. |
| ee98415be696 | Semantic model introduced | Person and WebSite share stable IDs and an author relation. |
| ae4ec172e45a | Production-gated integration | The site graph is emitted globally only for production. |
| 7e09745d409e | Extended | Projects become linked CreativeWork records without unsupported claims. |
| f7bd33a8b403 | Route-integrated | Both project detail rendering branches emit the same record only after route validation. |
| c5938ea4b4f8 | Deterministically verified | Positive semantics, negative claims, and script-terminator escaping are protected. |
<!-- learner:end thread-invariant-evolution -->

## 7. Failure → Fix → Test 관계

<!-- learner:start thread-failure-fix-test -->
| Failure/위험 | Fix/결정 | Test/증거 |
| --- | --- | --- |
| Plain JSON text could terminate the script context | Dedicated serializer escapes `<`, `>`, `&` before raw insertion | Regression uses `</script>` and checks Unicode escapes |
| Structured claims could overstate evidence | Factories map only authoritative content fields | Negative tests forbid award and aggregateRating |
| Multi-design detail paths could diverge | Page boundary wraps both dedicated and fallback render branches | Static inspection confirms both branches; no browser branch-count test in this commit |
<!-- learner:end thread-failure-fix-test -->

## 8. Ownership/state/responsibility 변화

<!-- learner:start thread-ownership -->
| 시점 | Owner | 책임 변화 |
| --- | --- | --- |
| Before | No owner | No structured-data model or safe insertion boundary. |
| 228 | Serializer + `StructuredData` | Own text safety and the only raw-script insertion point. |
| ee/7e | Metadata factories | Own evidence-to-Schema.org mapping and stable IDs. |
| ae/f7 | Root and project page boundaries | Own production gating, public origin, and rendering lifecycle. |
| c593 | Focused unit contract | Protects semantics, restraint, and escaping without claiming browser/schema validation. |
<!-- learner:end thread-ownership -->

## 9. 최종 Thread 상태와 실행 흐름

<!-- learner:start thread-final-state -->
**최종 상태**

Production pages expose one linked Person/WebSite graph and each valid project detail can expose a CreativeWork linked to the same Person. Template previews emit no structured claims. Every record passes through a dedicated serializer that prevents content from closing or altering the JSON-LD script context, and tests explicitly reject unsupported award/rating claims.

**코드 없는 실행 흐름**

1. A production page resolves the validated public origin and authoritative portfolio content.
2. The root or project factory maps only supported fields to stable Schema.org IDs and references.
3. The page passes the resulting record to the shared `StructuredData` component; template mode renders nothing.
4. The component serializes JSON and escapes markup-significant characters before raw insertion into an `application/ld+json` script.
5. Focused tests compare graph identity/content, forbid unsupported claims, and reproduce the `</script>` embedding boundary.
<!-- learner:end thread-final-state -->

## 10. Learning completion check

<!-- learner:start thread-completion-check -->
- [x] 각 SHA의 exact diff/tree를 GitHub connector로 정적 확인했습니다.
- [x] 보장과 비보장을 commit별로 구분했습니다.
- [x] test technique과 proves/does-not-prove를 구분했습니다.
- [x] 최종 흐름을 코드 없이 재구성했습니다.
- [x] 프로젝트 명령은 DNS 제한으로 실행하지 못했으며 그 사실을 모든 실행 증거에 명시했습니다.
<!-- learner:end thread-completion-check -->
