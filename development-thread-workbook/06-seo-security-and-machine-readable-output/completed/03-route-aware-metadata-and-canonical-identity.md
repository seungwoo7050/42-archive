# Thread: Route-aware metadata and canonical identity

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

Content-derived site identity를 root layout metadata로 옮기고, production에서는 verified `SITE_URL`을 canonical origin으로 사용하며, 각 공개 route가 query-free canonical path와 route-owned title/description/Open Graph/Twitter 값을 export하도록 확장하는 과정을 복원합니다.

### Phase 1 boundary decision

기존 draft의 route sequence는 대체로 맞았지만 최초 request-header metadata가 후속 mode-aware factory로 대체되는 ownership transfer가 빠져 있었고, sitemap test commit까지 한 Thread에 섞여 있었습니다. Phase 1에서는 `55b6061e0052`와 `67aabeab1553`을 추가해 실제 전환을 복원하고, `adc392157f70`은 sitemap Thread로 이동했습니다.

### Frozen critical invariants

- Production metadata origin은 request host 추정이 아니라 검증된 `SITE_URL`에서 옵니다.
- Root canonical은 `/`, non-root canonical은 해당 route path이며 `view`, `debug` 같은 query state를 포함하지 않습니다.
- Route title/description은 authoritative content에서 읽고, non-root title은 site brand와 결합합니다.
- Disabled page와 unknown project는 metadata export에서도 `notFound()`로 차단됩니다.
- Shared factory가 metadata shape를 소유하고 각 App Router page는 route availability와 content selection을 소유합니다.

### Major engineering difficulties

- Reverse proxy request headers에서 계산한 convenient preview origin과 production canonical origin을 분리하는 문제
- Global site metadata와 route-specific metadata를 중복 없이 합성하면서 canonical identity를 고정하는 문제
- Dynamic project metadata가 page render와 같은 availability/project lookup policy를 사용하도록 맞추는 문제

## 2. 핵심 질문

- 최초 `generateMetadata`는 host/protocol을 어떻게 추정하며 어떤 신뢰 가정을 가집니까?
- Pure factory 도입 뒤 production/template metadataBase ownership이 어떻게 이동합니까?
- `createRouteMetadata`는 root와 non-root title, canonical, Open Graph URL을 어떻게 계산합니까?
- 각 route export가 어떤 content field를 title/description으로 사용하고 disabled state를 어디서 거부합니까?
- Route-export test는 shared helper test와 달리 무엇을 실제로 검증합니까?

## 3. 완료 기준

- `1f4f93ad9a0f → 55b6061e0052 → 67aabeab1553`의 transitional origin/ownership 변화를 설명했습니다.
- 각 route SHA에서 exact page file의 `generateMetadata`와 `notFound` path를 확인했습니다.
- Canonical path와 display-query state를 분리한 contract를 기록했습니다.
- `4358bcd34f2e`가 actual route exports를 호출하는 test technique과 한계를 구분했습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Frozen role |
| --- | --- | --- | --- | --- | --- |
| 1 | `1f4f93ad9a0f` | feat(metadata): 콘텐츠 기반 site metadata 추가 | A | CONTENT, SEO | Introduce content-derived site metadata at the root layout |
| 2 | `55b6061e0052` | feat(seo): 콘텐츠 mode별 metadata 정책 추가 | A | CONTENT, SEO | Extract a pure site-metadata policy driven by content mode |
| 3 | `67aabeab1553` | feat(seo): layout metadata를 콘텐츠 mode에 연결 | A | CONTENT, SEO | Transfer root-metadata ownership to the mode-aware policy and verified production origin |
| 4 | `1c40645caead` | feat(seo): route별 검색 metadata 정책 추가 | A | ARCH, ROUTING, SEO | Introduce the shared route-metadata identity policy |
| 5 | `844ff4d7abcb` | feat(seo): 홈과 프로젝트 route metadata 연결 | B | ROUTING, SEO | Apply the shared policy to home, project index, and dynamic project detail |
| 6 | `fd5ff532bfe9` | feat(seo): 프로필 route metadata 연결 | B | ROUTING, SEO | Apply route metadata to about, contact, and resume |
| 7 | `5632c5df9b47` | feat(seo): 여정과 근거 route metadata 연결 | B | ROUTING, SEO | Complete route metadata coverage for journey and interview evidence |
| 8 | `4358bcd34f2e` | test(seo): route metadata export 검증 | B | VALIDATION, ROUTING, SEO | Characterize the actual metadata exports of every public route |

## 5. Commit별 학습 기록

### `1f4f93ad9a0f` — feat(metadata): 콘텐츠 기반 site metadata 추가

- **Importance:** A
- **Tags:** CONTENT, SEO
- **Frozen role:** Introduce content-derived site metadata at the root layout

#### 해당 SHA에서 확인할 실제 코드

- `src/app/layout.tsx`의 static metadata 이전 상태와 async `generateMetadata` diff를 비교합니다.
- `headers()`에서 `x-forwarded-host`/`host`, `x-forwarded-proto`, localhost fallback을 선택하는 순서를 확인합니다.
- `site.title`, `site.description`, `site.socialImage`가 title/Open Graph/Twitter로 흐르는 path를 추적합니다.
- Request-controlled origin과 relative canonical `./`가 남기는 production trust gap을 기록합니다.

확인 원칙:

- `1f4f93ad9a0f^`와 `1f4f93ad9a0f`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-1f4f93ad9a0f -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Root layout은 고정 또는 최소 metadata만 제공해 JSON content의 title, description, social image가 crawler/social output에 일관되게 반영되지 않았습니다. |
| 실제 변경 file/symbol/call path | `src/app/layout.tsx`의 `generateMetadata()`가 request headers로 `metadataBase`를 만들고 module-level `site` content를 title, description, Open Graph, Twitter와 canonical `./`에 배치합니다. |
| Data/state/owner | 이 시점의 metadata shape와 origin 추론을 root layout 함수 하나가 모두 소유합니다. Content는 read-only input이고 request headers가 origin input입니다. |
| Failure·absence·fallback | Forwarded host가 없으면 host, 그것도 없으면 `localhost:3100`을 사용합니다. Protocol header가 없으면 local host만 http, 그 외 https로 추정합니다. Invalid host가 `new URL`에서 throw할 수 있으나 별도 domain error는 없습니다. |
| 보장/비보장 | Site copy 기반 output은 생기지만 request headers를 canonical production truth로 신뢰하며 template/production indexing policy가 없습니다. `./` canonical은 route-specific identity도 표현하지 않습니다. |
| 후속 연결 | `55b6061e0052`가 metadata construction을 pure factory로 분리하고, `67aabeab1553`이 production origin을 validated `SITE_URL`로 이전합니다. |

#### 코드·실행 증거

**최소 코드 발췌**

```ts
// 1f4f93ad9a0f — src/app/layout.tsx — generateMetadata
const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3100";
const protocol = requestHeaders.get("x-forwarded-proto") ??
  (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
const metadataBase = new URL(`${protocol}://${host}`);
```

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

`55b6061e0052`가 metadata construction을 pure factory로 분리하고, `67aabeab1553`이 production origin을 validated `SITE_URL`로 이전합니다.
<!-- learner:end commit-1f4f93ad9a0f -->


### `55b6061e0052` — feat(seo): 콘텐츠 mode별 metadata 정책 추가

- **Importance:** A
- **Tags:** CONTENT, SEO
- **Frozen role:** Extract a pure site-metadata policy driven by content mode

#### 해당 SHA에서 확인할 실제 코드

- 새 `src/lib/site-metadata.ts`의 `createPortfolioMetadata` input/output을 확인합니다.
- Relative social image를 `metadataBase`로 absolute URL로 만드는 branch를 확인합니다.
- `mode === "production"`만 index/follow를 활성화하는 decision을 추적합니다.
- Factory가 아직 root layout에 연결되지 않은 integration state를 기록합니다.

확인 원칙:

- `55b6061e0052^`와 `55b6061e0052`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-55b6061e0052 -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Root layout 안에 origin resolution, metadata shape, social image normalization이 결합되어 mode policy를 독립적으로 검증하거나 robots policy와 공유하기 어려웠습니다. |
| 실제 변경 file/symbol/call path | 새 `src/lib/site-metadata.ts`가 `createPortfolioMetadata({metadataBase, mode, site})`를 정의합니다. Social image는 `new URL(site.socialImage, metadataBase)`로 정규화하고 template/production robots directives를 반환합니다. |
| Data/state/owner | Pure factory가 site-level metadata shape와 indexing flag를 소유합니다. Caller는 이미 결정된 mode와 URL을 주입해야 합니다. |
| Failure·absence·fallback | Social image가 없으면 images는 `undefined`입니다. Invalid base/image 조합은 URL constructor가 throw합니다. Unsupported mode는 upstream resolver 책임입니다. |
| 보장/비보장 | Pure deterministic policy는 생겼지만 이 commit에서는 layout caller가 아직 이전되지 않아 application output이 자동으로 바뀌지 않습니다. Canonical은 여전히 `./`입니다. |
| 후속 연결 | `67aabeab1553`이 root layout을 factory에 연결하고 production origin을 readiness validator가 소유하게 합니다. |

#### 코드·실행 증거

**최소 코드 발췌**

```ts
// 55b6061e0052 — src/lib/site-metadata.ts — createPortfolioMetadata
const socialImage = site.socialImage
  ? new URL(site.socialImage, metadataBase).toString()
  : undefined;
const shouldIndex = mode === "production";
```

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

`67aabeab1553`이 root layout을 factory에 연결하고 production origin을 readiness validator가 소유하게 합니다.
<!-- learner:end commit-55b6061e0052 -->


### `67aabeab1553` — feat(seo): layout metadata를 콘텐츠 mode에 연결

- **Importance:** A
- **Tags:** CONTENT, SEO
- **Frozen role:** Transfer root-metadata ownership to the mode-aware policy and verified production origin

#### 해당 SHA에서 확인할 실제 코드

- `src/app/layout.tsx`에서 inline metadata object가 제거되고 `createPortfolioMetadata` 호출로 대체되는 diff를 확인합니다.
- Production branch의 `resolveProductionSiteUrl(process.env.SITE_URL)`와 template branch의 header-derived URL을 비교합니다.
- Mode resolver와 origin resolver가 throw하는 failure가 `generateMetadata`까지 전파되는 path를 확인합니다.
- Full aggregate readiness가 아니라 mode/public-origin helper를 직접 소비한다는 비보장을 기록합니다.

확인 원칙:

- `67aabeab1553^`와 `67aabeab1553`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-67aabeab1553 -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Pure metadata policy는 있었지만 root output은 여전히 이전 inline implementation을 사용했고 production canonical origin도 request headers에 의존했습니다. |
| 실제 변경 file/symbol/call path | `generateMetadata`가 mode를 resolve합니다. Production은 `resolveProductionSiteUrl(SITE_URL)`, template은 request headers로 `metadataBase`를 만든 뒤 `createPortfolioMetadata({metadataBase, mode, site})`를 반환합니다. |
| Data/state/owner | Publication mode/public origin validation은 `content-readiness.ts`, metadata shape는 `site-metadata.ts`, framework export는 layout이 소유하는 분리가 완성됩니다. |
| Failure·absence·fallback | Production에서 SITE_URL이 missing/local/reserved이면 `PortfolioReadinessError`가 전파됩니다. Template은 local preview를 위해 header-derived fallback을 유지합니다. |
| 보장/비보장 | Production canonical base는 request host spoofing에서 분리됩니다. 그러나 이 runtime path는 `validateProductionReadiness` 전체를 호출하지 않아 asset/contact completeness는 prebuild가 별도로 보장합니다. |
| 후속 연결 | `1c40645caead`가 이 root policy 위에 route-specific canonical/title factory를 추가합니다. |

#### 코드·실행 증거

**최소 코드 발췌**

이 commit은 본문에 exact file/symbol/branch를 기록했습니다. 확인된 diff를 임의 축약한 pseudo-code를 만들지 않기 위해 코드 블록은 생략했습니다.

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

`1c40645caead`가 이 root policy 위에 route-specific canonical/title factory를 추가합니다.
<!-- learner:end commit-67aabeab1553 -->


### `1c40645caead` — feat(seo): route별 검색 metadata 정책 추가

- **Importance:** A
- **Tags:** ARCH, ROUTING, SEO
- **Frozen role:** Introduce the shared route-metadata identity policy

#### 해당 SHA에서 확인할 실제 코드

- `RouteMetadataInput`, `routeTitle`, `createRouteMetadata`의 exact type/branches를 확인합니다.
- Root `path === "/"`와 non-root title composition을 비교합니다.
- canonical, Open Graph URL, Twitter/Open Graph images가 어떤 relative values를 유지하는지 확인합니다.
- 같은 commit에서 root canonical `./ → /`와 Open Graph root URL이 보정되는 이유를 기록합니다.

확인 원칙:

- `1c40645caead^`와 `1c40645caead`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-1c40645caead -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Root metadata는 mode-aware했지만 모든 route가 같은 site title/description/canonical을 상속해 페이지별 검색 identity가 없었습니다. |
| 실제 변경 file/symbol/call path | `src/lib/site-metadata.ts`에 typed `RouteMetadataInput`, `routeTitle`, `createRouteMetadata`가 추가됩니다. Factory는 canonical path, route description, OG/Twitter title/images/URL을 반환합니다. |
| Data/state/owner | Factory가 route metadata shape와 title convention을 소유합니다. App route는 path와 authoritative content field만 선택합니다. |
| Failure·absence·fallback | Optional `type`은 `website`로 default하고 social image가 없으면 image arrays를 생략합니다. Runtime path existence는 caller와 content validation 책임입니다. |
| 보장/비보장 | Query-free path identity와 consistent social metadata를 보장하지만 absolute resolution은 parent `metadataBase`와 Next metadata merge에 의존합니다. Locale alternate, pagination, per-route robots는 없습니다. |
| 후속 연결 | 이어지는 세 commits가 모든 현재 public route export를 factory에 연결합니다. |

#### 코드·실행 증거

**최소 코드 발췌**

```ts
// 1c40645caead — src/lib/site-metadata.ts — createRouteMetadata
const resolvedTitle = path === "/" ? site.title : `${title} | ${site.brand}`;
return {
  alternates: { canonical: path },
  openGraph: { description, images, title: resolvedTitle, type, url: path },
  title: resolvedTitle,
};
```

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

이어지는 세 commits가 모든 현재 public route export를 factory에 연결합니다.
<!-- learner:end commit-1c40645caead -->


### `844ff4d7abcb` — feat(seo): 홈과 프로젝트 route metadata 연결

- **Importance:** B
- **Tags:** ROUTING, SEO
- **Frozen role:** Apply the shared policy to home, project index, and dynamic project detail

#### 해당 SHA에서 확인할 실제 코드

- `src/app/page.tsx`, `src/app/projects/page.tsx`, `src/app/projects/[projectId]/page.tsx`의 `generateMetadata`를 확인합니다.
- Project detail에서 awaited params, `getProjectById`, page-enabled check, `notFound()` 순서를 추적합니다.
- 각 route가 title/description/type에 선택하는 content field를 표로 기록합니다.

확인 원칙:

- `844ff4d7abcb^`와 `844ff4d7abcb`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-844ff4d7abcb -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Shared route factory는 있었지만 실제 App Router exports가 없어 public pages가 route identity를 사용하지 않았습니다. |
| 실제 변경 file/symbol/call path | Home은 site copy, projects는 projects hero, detail은 matched project title/summary와 `article` type을 `createRouteMetadata`에 전달합니다. |
| Data/state/owner | Page module이 route availability와 record lookup을 소유하고 factory가 metadata shape를 소유합니다. Dynamic params는 metadata function에서 await됩니다. |
| Failure·absence·fallback | Projects page가 disabled이거나 detail project가 missing이면 `notFound()`가 metadata generation에서도 실행됩니다. |
| 보장/비보장 | 핵심 3 route의 wiring을 보장하지만 about/resume/contact/journey/interview routes는 아직 root metadata만 상속합니다. |
| 후속 연결 | `fd5ff532bfe9`와 `5632c5df9b47`이 나머지 public routes를 연결합니다. |

#### 코드·실행 증거

**최소 코드 발췌**

이 commit은 본문에 exact file/symbol/branch를 기록했습니다. 확인된 diff를 임의 축약한 pseudo-code를 만들지 않기 위해 코드 블록은 생략했습니다.

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

`fd5ff532bfe9`와 `5632c5df9b47`이 나머지 public routes를 연결합니다.
<!-- learner:end commit-844ff4d7abcb -->


### `fd5ff532bfe9` — feat(seo): 프로필 route metadata 연결

- **Importance:** B
- **Tags:** ROUTING, SEO
- **Frozen role:** Apply route metadata to about, contact, and resume

#### 해당 SHA에서 확인할 실제 코드

- 각 page의 enablement key와 metadata source field를 확인합니다.
- About summary, Contact intro/title, Resume hero body/title가 factory input으로 전달되는지 추적합니다.
- Disabled page가 metadata export에서 `notFound()`되는지 확인합니다.

확인 원칙:

- `fd5ff532bfe9^`와 `fd5ff532bfe9`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-fd5ff532bfe9 -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Home/project routes만 route-specific identity를 제공해 profile-related pages는 generic site metadata로 남았습니다. |
| 실제 변경 file/symbol/call path | About, Contact, Resume page가 각각 sync `generateMetadata()`를 export하고 `getPortfolioContent`, `isSitePageEnabled`, `createRouteMetadata`를 연결합니다. |
| Data/state/owner | 각 route가 자기 content source와 page availability를 선택합니다. Shared factory는 formatting만 담당합니다. |
| Failure·absence·fallback | 해당 page flag가 false면 metadata 생성 시점에 `notFound()`합니다. Content field가 schema-valid하다는 전제는 loader boundary에서 옵니다. |
| 보장/비보장 | 세 profile route의 identity는 추가되지만 journey/interview는 아직 남습니다. |
| 후속 연결 | `5632c5df9b47`가 마지막 두 evidence routes를 연결합니다. |

#### 코드·실행 증거

**최소 코드 발췌**

이 commit은 본문에 exact file/symbol/branch를 기록했습니다. 확인된 diff를 임의 축약한 pseudo-code를 만들지 않기 위해 코드 블록은 생략했습니다.

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

`5632c5df9b47`가 마지막 두 evidence routes를 연결합니다.
<!-- learner:end commit-fd5ff532bfe9 -->


### `5632c5df9b47` — feat(seo): 여정과 근거 route metadata 연결

- **Importance:** B
- **Tags:** ROUTING, SEO
- **Frozen role:** Complete route metadata coverage for journey and interview evidence

#### 해당 SHA에서 확인할 실제 코드

- `src/app/journey/page.tsx`와 `src/app/interview-map/page.tsx`의 metadata exports를 확인합니다.
- Journey narrative intro와 interview map intro가 description owner인지 확인합니다.
- Page availability flags와 exact canonical paths를 기록합니다.

확인 원칙:

- `5632c5df9b47^`와 `5632c5df9b47`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-5632c5df9b47 -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Journey와 interview evidence routes만 generic site identity를 사용해 public route coverage가 불완전했습니다. |
| 실제 변경 file/symbol/call path | 두 page module이 content intro와 presentation hero title을 선택해 `/journey`, `/interview-map` metadata를 만듭니다. |
| Data/state/owner | Route page가 enablement와 source selection을 소유하고 factory가 canonical/social shape를 재사용합니다. |
| Failure·absence·fallback | Disabled route는 `notFound()`합니다. Missing content는 앞선 schema/content validation에서 차단됩니다. |
| 보장/비보장 | 현재 enabled public route set의 metadata exports가 완성됩니다. 실제 rendered head와 absolute canonical serialization은 아직 browser test로 검증하지 않았습니다. |
| 후속 연결 | `4358bcd34f2e`가 page modules의 actual exports를 직접 호출해 wiring regression을 고정합니다. |

#### 코드·실행 증거

**최소 코드 발췌**

이 commit은 본문에 exact file/symbol/branch를 기록했습니다. 확인된 diff를 임의 축약한 pseudo-code를 만들지 않기 위해 코드 블록은 생략했습니다.

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

`4358bcd34f2e`가 page modules의 actual exports를 직접 호출해 wiring regression을 고정합니다.
<!-- learner:end commit-5632c5df9b47 -->


### `4358bcd34f2e` — test(seo): route metadata export 검증

- **Importance:** B
- **Tags:** VALIDATION, ROUTING, SEO
- **Frozen role:** Characterize the actual metadata exports of every public route

#### 해당 SHA에서 확인할 실제 코드

- `src/app/route-metadata.test.ts`가 helper가 아니라 각 page의 `generateMetadata`를 import하는지 확인합니다.
- `it.each` route matrix와 dynamic project detail case를 구분합니다.
- canonical/title/description assertions와 setup-time first-project requirement를 확인합니다.
- Rendered HTML, disabled-route behavior, absolute metadata URL을 증명하지 않는 범위를 기록합니다.

확인 원칙:

- `4358bcd34f2e^`와 `4358bcd34f2e`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-4358bcd34f2e -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Factory implementation은 연결됐지만 route module이 잘못된 path/content를 전달하는 wiring regression을 helper unit test만으로 잡을 수 없었습니다. |
| 실제 변경 file/symbol/call path | Test가 8개 route module의 `generateMetadata`를 alias import하고 static route table과 first project detail invocation을 실행합니다. |
| Data/state/owner | Checked-in validated content가 expected title/description owner입니다. Test는 mutation 없이 actual exports의 return object를 관찰합니다. |
| Failure·absence·fallback | Project fixture가 없으면 setup에서 명시적 error를 throw합니다. Static matrix는 canonical path, title 포함, truthy description을 검사합니다. |
| 보장/비보장 | Route-to-factory wiring과 dynamic project content selection을 증명합니다. Next head rendering, metadata merge, absolute URL, disabled paths, Open Graph/Twitter full shape는 증명하지 않습니다. |
| 후속 연결 | Sitemap/route helper의 추가 contract는 `adc392157f70`에서 indexing Thread 관점으로 검증됩니다. |

#### 코드·실행 증거

**최소 코드 발췌**

```ts
// 4358bcd34f2e — src/app/route-metadata.test.ts
it.each(routeCases)("provides content metadata for %s", async (path, title, getMetadata) => {
  const metadata = await getMetadata();
  expect(metadata.alternates).toEqual({ canonical: path });
  expect(String(metadata.title)).toContain(title);
  expect(metadata.description).toBeTruthy();
});
```

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

Sitemap/route helper의 추가 contract는 `adc392157f70`에서 indexing Thread 관점으로 검증됩니다.
<!-- learner:end commit-4358bcd34f2e -->


## 6. Invariant evolution

<!-- learner:start thread-invariant-evolution -->
| Commit/구간 | 상태 | 근거 기반 설명 |
| --- | --- | --- |
| 1f4f93ad9a0f | Introduced | Content drives site title/description/social output, but origin is request-derived. |
| 55b6061e0052 | Centralized | A pure mode-aware factory owns the root metadata shape. |
| 67aabeab1553 | Corrected/Integrated | Production origin ownership moves to validated `SITE_URL`; template retains preview fallback. |
| 1c40645caead | Extended | Canonical/title/social identity becomes route-aware and query-free. |
| 844ff4d7abcb → 5632c5df9b47 | Integrated | Every current public page exports route-owned metadata. |
| 4358bcd34f2e | Verified | Actual page exports receive deterministic wiring regression coverage. |
<!-- learner:end thread-invariant-evolution -->

## 7. Failure → Fix → Test 관계

<!-- learner:start thread-failure-fix-test -->
| Failure/위험 | Fix/결정 | Test/증거 |
| --- | --- | --- |
| Request-derived origin could become production identity | Production branch resolves validated SITE_URL before calling pure factory | Factory and readiness tests verify public origin policy; route test verifies page wiring |
| All routes inherited one generic canonical/title | Shared route factory plus per-page exports | Route-export matrix checks canonical/title/description for all routes |
| Dynamic project metadata could diverge from page availability | Metadata export reuses page enablement and project lookup | Project detail test invokes actual async export with a real project ID |
<!-- learner:end thread-failure-fix-test -->

## 8. Ownership/state/responsibility 변화

<!-- learner:start thread-ownership -->
| 시점 | Owner | 책임 변화 |
| --- | --- | --- |
| Before | Root layout inline function | Owns headers, origin, metadata shape, and site content mapping together. |
| 55b | `site-metadata.ts` | Owns pure root metadata policy; caller still must choose trustworthy inputs. |
| 67a | Readiness resolver + layout + metadata factory | Origin, framework integration, and shape become separate responsibilities. |
| 1c onward | Page modules + shared factory | Page owns route/content/availability; factory owns canonical/social formatting. |
<!-- learner:end thread-ownership -->

## 9. 최종 Thread 상태와 실행 흐름

<!-- learner:start thread-final-state -->
**최종 상태**

Production site identity is rooted in validated `SITE_URL`, while template previews may use the current request origin. Every public route selects its authoritative title and description, emits a query-free canonical path and consistent social metadata, and rejects disabled or missing content at its page boundary.

**코드 없는 실행 흐름**

1. The root layout resolves content mode and chooses a validated production origin or a request-derived template preview origin.
2. `createPortfolioMetadata` builds site-level title, description, images, and index directives from that input.
3. Each App Router page validates availability, selects route-owned content, and calls `createRouteMetadata` with one canonical pathname.
4. Next combines route metadata with the root `metadataBase`, so relative canonical/social paths resolve against the selected origin.
5. Focused tests import the actual page exports and compare their canonical/title/description to the same authoritative content.
<!-- learner:end thread-final-state -->

## 10. Learning completion check

<!-- learner:start thread-completion-check -->
- [x] 각 SHA의 exact diff/tree를 GitHub connector로 정적 확인했습니다.
- [x] 보장과 비보장을 commit별로 구분했습니다.
- [x] test technique과 proves/does-not-prove를 구분했습니다.
- [x] 최종 흐름을 코드 없이 재구성했습니다.
- [x] 프로젝트 명령은 DNS 제한으로 실행하지 못했으며 그 사실을 모든 실행 증거에 명시했습니다.
<!-- learner:end thread-completion-check -->
