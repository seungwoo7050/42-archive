# Thread: Indexing, robots, and sitemap policy

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

Template preview를 crawler-visible surface에서 fail closed로 유지하고, production mode에서만 page robots, `robots.txt`, canonical host, sitemap discovery와 enabled route/project URL을 일관되게 공개하는 정책을 복원합니다.

### Phase 1 boundary decision

기존 draft는 핵심 commits를 포함했지만 root metadata consumer, unit regression, running-application regression이 빠져 있었습니다. Phase 1에서는 `67aabeab1553`, `fb3d18fd660b`, `166f05f7be06`을 추가하고, `adc392157f70`을 metadata Thread에서 이동해 crawler output의 implementation→integration→test sequence를 완성했습니다.

### Frozen critical invariants

- Template mode는 page metadata에서 `noindex,nofollow`, `robots.txt`에서 `Disallow: /`, sitemap에서 빈 목록입니다.
- Production mode만 index/follow와 `Allow: /`를 내며, host와 sitemap URL은 validated public origin에서 계산됩니다.
- Sitemap은 root와 enabled page, projects page가 enabled일 때의 enabled project details만 포함합니다.
- Crawler policy는 content mode를 추측하지 않고 exact environment resolver를 사용합니다.
- Unit tests와 running-app E2E가 helper object와 serialized HTTP output을 서로 다른 수준에서 검증합니다.

### Major engineering difficulties

- Page-level robots directive, standalone robots route, sitemap route가 같은 publication decision을 공유하도록 만드는 문제
- Template preview가 accidentally indexable해지는 반대 방향의 regression을 막는 문제
- Content page flags와 filtered project model을 machine-readable route list로 변환하는 문제

## 2. 핵심 질문

- Metadata factory, robots factory, sitemap factory는 template/production에서 각각 무엇을 반환합니까?
- Production robots output이 site URL이 없을 때 왜 throw하며 host/sitemap을 어떻게 계산합니까?
- Root layout integration과 running-app E2E는 pure unit test보다 무엇을 추가로 증명합니까?
- Sitemap route ordering과 page/project enablement 조건은 무엇입니까?
- 현재 tests가 robots host, sitemap XML serialization, canonical head를 어디까지 검증하지 못합니까?

## 3. 완료 기준

- Metadata, robots, sitemap의 mode matrix를 하나의 표로 정리했습니다.
- Helper policy와 App Router route integration을 별도 ownership으로 설명했습니다.
- `166f05f7be06`의 browser/request technique과 `fb3d18fd660b`의 pure unit technique을 구분했습니다.
- `70b69f04e8c7 → adc392157f70`의 enabled-route sitemap implementation과 deterministic boundary test를 연결했습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Frozen role |
| --- | --- | --- | --- | --- | --- |
| 1 | `55b6061e0052` | feat(seo): 콘텐츠 mode별 metadata 정책 추가 | A | CONTENT, SEO | Define page-level indexing directives from the content mode |
| 2 | `cb61450ad922` | feat(seo): 콘텐츠 mode별 robots 정책 추가 | A | CONTENT, SEO | Create the mode-aware robots factory and App Router robots route |
| 3 | `67aabeab1553` | feat(seo): layout metadata를 콘텐츠 mode에 연결 | A | CONTENT, SEO | Integrate page indexing directives with the real root metadata export |
| 4 | `fb3d18fd660b` | test(content): readiness와 indexing 계약 검증 | A | CONTENT, VALIDATION, SEO | Unit-test the aligned metadata and robots mode contract |
| 5 | `166f05f7be06` | test(e2e): 콘텐츠 mode별 metadata와 robots 검증 | A | CONTENT, VALIDATION, SEO | Exercise indexing policy through the running application |
| 6 | `70b69f04e8c7` | feat(seo): 공개 route sitemap 생성 | A | ARCH, ROUTING, SEO | Generate sitemap discovery from the validated publication surface |
| 7 | `adc392157f70` | test(seo): route metadata와 sitemap 계약 검증 | B | VALIDATION, ROUTING, SEO | Lock down the sitemap publication boundary and route URL order |

## 5. Commit별 학습 기록

### `55b6061e0052` — feat(seo): 콘텐츠 mode별 metadata 정책 추가

- **Importance:** A
- **Tags:** CONTENT, SEO
- **Frozen role:** Define page-level indexing directives from the content mode

#### 해당 SHA에서 확인할 실제 코드

- `createPortfolioMetadata`의 `shouldIndex`와 `robots` result를 확인합니다.
- Template/production 두 상태 외 값을 factory가 받지 않도록 type boundary를 확인합니다.
- 이 commit은 helper only이며 root layout output에 아직 연결되지 않았다는 점을 기록합니다.

확인 원칙:

- `55b6061e0052^`와 `55b6061e0052`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-55b6061e0052 -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Content-driven metadata는 있었지만 starter/template identity가 검색 엔진에 노출되는 것을 막는 explicit page directive가 없었습니다. |
| 실제 변경 file/symbol/call path | `createPortfolioMetadata`가 `mode === "production"`을 `shouldIndex`로 계산해 `{follow, index}`를 반환합니다. |
| Data/state/owner | Pure metadata factory가 page-level crawler directive를 소유하고 mode selection은 upstream resolver가 소유합니다. |
| Failure·absence·fallback | Template은 false/false, production은 true/true입니다. Unsupported mode는 resolver 단계에서 실패해야 하며 factory에는 fallback branch가 없습니다. |
| 보장/비보장 | Policy object만 정의하며 application head나 `robots.txt`는 아직 바뀌지 않습니다. |
| 후속 연결 | `cb61450ad922`가 standalone robots policy를 만들고 `67aabeab1553`이 page directive를 root output에 연결합니다. |

#### 코드·실행 증거

**최소 코드 발췌**

```ts
// 55b6061e0052 — src/lib/site-metadata.ts
const shouldIndex = mode === "production";
robots: { follow: shouldIndex, index: shouldIndex },
```

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

`cb61450ad922`가 standalone robots policy를 만들고 `67aabeab1553`이 page directive를 root output에 연결합니다.
<!-- learner:end commit-55b6061e0052 -->


### `cb61450ad922` — feat(seo): 콘텐츠 mode별 robots 정책 추가

- **Importance:** A
- **Tags:** CONTENT, SEO
- **Frozen role:** Create the mode-aware robots factory and App Router robots route

#### 해당 SHA에서 확인할 실제 코드

- `createRobots({mode, siteUrl})`의 template early return과 production missing-URL throw를 확인합니다.
- Production result의 `host: siteUrl.origin`과 allow rule을 확인합니다.
- `src/app/robots.ts`가 environment mode와 URL을 어떻게 resolve하는지 추적합니다.
- 이 시점 robots result에는 sitemap field가 아직 없음을 기록합니다.

확인 원칙:

- `cb61450ad922^`와 `cb61450ad922`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-cb61450ad922 -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Page meta directive만으로 crawler가 직접 요청하는 `/robots.txt`의 site-wide policy를 통제하지 못했습니다. |
| 실제 변경 file/symbol/call path | `src/lib/site-metadata.ts`에 `createRobots`가, `src/app/robots.ts`에 Next `MetadataRoute.Robots` export가 추가됩니다. |
| Data/state/owner | Factory가 mode-to-robots object mapping을, App route가 env resolution과 framework endpoint를 소유합니다. |
| Failure·absence·fallback | Template은 site URL 없이 전체 disallow합니다. Production인데 URL이 없으면 error를 throw하며 silent relative host로 fallback하지 않습니다. |
| 보장/비보장 | Template/production robots policy와 canonical host는 생기지만 sitemap discovery는 아직 없습니다. Full production readiness를 호출하지 않고 validated URL helper를 직접 사용합니다. |
| 후속 연결 | `67aabeab1553`가 page metadata path를 실제 root layout에 연결하고 tests가 두 output을 함께 검증합니다. |

#### 코드·실행 증거

**최소 코드 발췌**

```ts
// cb61450ad922 — src/lib/site-metadata.ts — createRobots
if (mode === "template") return { rules: { disallow: "/", userAgent: "*" } };
if (!siteUrl) throw new Error("A production site URL is required to create robots.txt.");
return { host: siteUrl.origin, rules: { allow: "/", userAgent: "*" } };
```

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

`67aabeab1553`가 page metadata path를 실제 root layout에 연결하고 tests가 두 output을 함께 검증합니다.
<!-- learner:end commit-cb61450ad922 -->


### `67aabeab1553` — feat(seo): layout metadata를 콘텐츠 mode에 연결

- **Importance:** A
- **Tags:** CONTENT, SEO
- **Frozen role:** Integrate page indexing directives with the real root metadata export

#### 해당 SHA에서 확인할 실제 코드

- Root layout가 mode-aware factory를 호출한 뒤 returned robots directives가 actual metadata output에 포함되는지 확인합니다.
- Production/template metadataBase branch와 indexing branch가 같은 resolved mode를 소비하는지 확인합니다.
- Robots route와 root layout이 resolver를 각각 호출해도 동일 env contract를 공유한다는 점을 기록합니다.

확인 원칙:

- `67aabeab1553^`와 `67aabeab1553`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-67aabeab1553 -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Page indexing policy는 pure helper에만 있었기 때문에 real root metadata에는 적용되지 않았습니다. |
| 실제 변경 file/symbol/call path | `src/app/layout.tsx`가 mode와 metadataBase를 결정한 뒤 `createPortfolioMetadata`의 result를 framework metadata export로 반환합니다. |
| Data/state/owner | Root layout은 integration owner이고 policy는 factory owner입니다. Both root and robots route read the same environment mode contract independently. |
| Failure·absence·fallback | Production URL validation failure는 metadata generation을 실패시킵니다. Template은 request-derived origin이어도 noindex/nofollow로 남습니다. |
| 보장/비보장 | Actual page metadata path에 policy가 연결됩니다. Robots endpoint와의 runtime consistency는 아직 test로 보호되지 않습니다. |
| 후속 연결 | `fb3d18fd660b`가 pure policy를, `166f05f7be06`이 running application의 meta/robots endpoint를 검증합니다. |

#### 코드·실행 증거

**최소 코드 발췌**

이 commit은 본문에 exact file/symbol/branch를 기록했습니다. 확인된 diff를 임의 축약한 pseudo-code를 만들지 않기 위해 코드 블록은 생략했습니다.

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

`fb3d18fd660b`가 pure policy를, `166f05f7be06`이 running application의 meta/robots endpoint를 검증합니다.
<!-- learner:end commit-67aabeab1553 -->


### `fb3d18fd660b` — test(content): readiness와 indexing 계약 검증

- **Importance:** A
- **Tags:** CONTENT, VALIDATION, SEO
- **Frozen role:** Unit-test the aligned metadata and robots mode contract

#### 해당 SHA에서 확인할 실제 코드

- `src/lib/site-metadata.test.ts`의 two cases를 확인합니다.
- Template case가 metadata robots와 `createRobots` disallow를 함께 확인하는지 추적합니다.
- Production case가 metadataBase, canonical, index/follow, absolute social image, host/allow를 확인하는지 기록합니다.
- Next serialization이 아닌 object-level test라는 한계를 구분합니다.

확인 원칙:

- `fb3d18fd660b^`와 `fb3d18fd660b`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-fb3d18fd660b -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Metadata와 robots helpers가 같은 mode policy를 구현했지만 한쪽만 바뀌는 drift를 잡는 regression이 없었습니다. |
| 실제 변경 file/symbol/call path | `site-metadata.test.ts`가 동일 site fixture와 mode를 두 factories에 전달해 template/production output pairs를 비교합니다. |
| Data/state/owner | Test owns explicit URL fixtures and observes pure return objects; network/framework layer는 개입하지 않습니다. |
| Failure·absence·fallback | Template noindex/nofollow + disallow, production index/follow + allow/host 및 absolute social image를 고정합니다. |
| 보장/비보장 | Policy alignment를 deterministic하게 증명하지만 emitted `<meta>` 문자열, `/robots.txt` text, App Router integration, sitemap은 증명하지 않습니다. |
| 후속 연결 | `166f05f7be06`이 running server를 통해 serialized outputs를 검증합니다. |

#### 코드·실행 증거

**최소 코드 발췌**

이 commit은 본문에 exact file/symbol/branch를 기록했습니다. 확인된 diff를 임의 축약한 pseudo-code를 만들지 않기 위해 코드 블록은 생략했습니다.

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

`166f05f7be06`이 running server를 통해 serialized outputs를 검증합니다.
<!-- learner:end commit-fb3d18fd660b -->


### `166f05f7be06` — test(e2e): 콘텐츠 mode별 metadata와 robots 검증

- **Importance:** A
- **Tags:** CONTENT, VALIDATION, SEO
- **Frozen role:** Exercise indexing policy through the running application

#### 해당 SHA에서 확인할 실제 코드

- `tests/e2e/portfolio.spec.ts`의 added Playwright test를 확인합니다.
- `page.goto('/')`, robots meta locator, API request `/robots.txt`의 서로 다른 paths를 추적합니다.
- Expected mode가 process environment에서 결정되는 방식과 regex assertions를 확인합니다.
- Host/sitemap/canonical까지 검증하지 않는 범위를 기록합니다.

확인 원칙:

- `166f05f7be06^`와 `166f05f7be06`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-166f05f7be06 -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Pure unit tests는 Next가 metadata object를 실제 HTML과 robots text로 serialize하고 routes가 연결되었는지 확인하지 못했습니다. |
| 실제 변경 file/symbol/call path | Playwright test가 `/`을 방문해 `meta[name=robots]` content를 보고, request context로 `/robots.txt`를 받아 serialized allow/disallow text를 확인합니다. |
| Data/state/owner | Test process environment가 expected mode를 소유하고 real application/server response가 observation target입니다. |
| Failure·absence·fallback | Home response와 robots response가 성공해야 하며 mode에 따라 index/follow 또는 noindex/nofollow, allow 또는 disallow regex가 일치해야 합니다. |
| 보장/비보장 | Framework integration과 HTTP serialization을 증명합니다. Production host line, sitemap line, canonical tags, all routes, external crawler behavior는 증명하지 않습니다. |
| 후속 연결 | `70b69f04e8c7`가 robots output에 sitemap discovery를 추가하고 route inventory를 생성합니다. |

#### 코드·실행 증거

**최소 코드 발췌**

```ts
// 166f05f7be06 — tests/e2e/portfolio.spec.ts
await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
  "content", isProductionContent ? /index.*follow/i : /noindex.*nofollow/i,
);
expect(await robotsResponse.text()).toMatch(
  isProductionContent ? /Allow:\s*\//i : /Disallow:\s*\//i,
);
```

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

`70b69f04e8c7`가 robots output에 sitemap discovery를 추가하고 route inventory를 생성합니다.
<!-- learner:end commit-166f05f7be06 -->


### `70b69f04e8c7` — feat(seo): 공개 route sitemap 생성

- **Importance:** A
- **Tags:** ARCH, ROUTING, SEO
- **Frozen role:** Generate sitemap discovery from the validated publication surface

#### 해당 SHA에서 확인할 실제 코드

- 새 `src/app/sitemap.ts`, `absoluteSiteUrl`, `createSitemap`을 확인합니다.
- Template empty return, production missing-URL throw, route array construction 순서를 추적합니다.
- `content.site.pages` flags와 `content.projects`가 어떤 routes를 추가/제외하는지 확인합니다.
- `createRobots` result에 sitemap URL이 추가되는 integration을 확인합니다.

확인 원칙:

- `70b69f04e8c7^`와 `70b69f04e8c7`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-70b69f04e8c7 -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Production robots는 allow/host만 제공했고 검색 엔진이 실제 enabled publication surface를 발견할 sitemap이 없었습니다. |
| 실제 변경 file/symbol/call path | `createSitemap`이 mode/content/siteUrl을 받아 root, enabled static pages, projects index와 content projects details를 absolute URLs로 변환합니다. App Router sitemap route가 env/content를 연결하고 robots가 `/sitemap.xml`을 광고합니다. |
| Data/state/owner | Content page flags와 validated portfolio project list가 route membership을 소유합니다. Factory가 order/URL conversion을 소유하고 route module이 framework endpoint를 소유합니다. |
| Failure·absence·fallback | Template은 빈 array, production missing URL은 throw입니다. `pages.projects === false`면 index와 모든 detail을 함께 제외합니다. 각 optional flag는 explicit false일 때만 제외합니다. |
| 보장/비보장 | Enabled publication URLs와 robots discovery를 보장합니다. `lastModified`, change frequency, priority, alternate languages는 생성하지 않습니다. XML HTTP serialization은 이 commit에 test되지 않습니다. |
| 후속 연결 | `adc392157f70`이 template empty, disabled page exclusion, exact absolute URL order를 unit contract로 고정합니다. |

#### 코드·실행 증거

**최소 코드 발췌**

이 commit은 본문에 exact file/symbol/branch를 기록했습니다. 확인된 diff를 임의 축약한 pseudo-code를 만들지 않기 위해 코드 블록은 생략했습니다.

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

`adc392157f70`이 template empty, disabled page exclusion, exact absolute URL order를 unit contract로 고정합니다.
<!-- learner:end commit-70b69f04e8c7 -->


### `adc392157f70` — test(seo): route metadata와 sitemap 계약 검증

- **Importance:** B
- **Tags:** VALIDATION, ROUTING, SEO
- **Frozen role:** Lock down the sitemap publication boundary and route URL order

#### 해당 SHA에서 확인할 실제 코드

- `src/lib/site-metadata.test.ts`의 `describe("sitemap")` 두 cases를 확인합니다.
- Template mode expected `[]`와 production fixture의 `interviewMap: false` mutation을 추적합니다.
- Expected URL list가 root→projects→project detail→remaining pages 순서인지 확인합니다.
- 같은 commit의 route-metadata helper test는 metadata Thread의 helper 보강이며 이 Thread에서는 sitemap assertions만 해석합니다.

확인 원칙:

- `adc392157f70^`와 `adc392157f70`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-adc392157f70 -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Sitemap algorithm과 robots discovery는 구현됐지만 template leakage, disabled page inclusion, origin/order regression을 방지하는 focused test가 없었습니다. |
| 실제 변경 file/symbol/call path | Test는 actual content를 clone-like object spread로 감싸 `interviewMap`만 false로 바꾸고 `createSitemap`의 URL projection을 exact array로 비교합니다. |
| Data/state/owner | Fixture가 page availability variation을 소유하고 factory result가 deterministic publication inventory입니다. |
| Failure·absence·fallback | Template result는 정확히 빈 배열이어야 하고 disabled interview route는 production expected list에 없어야 합니다. |
| 보장/비보장 | Mode, enabled page exclusion, project detail inclusion, public origin, deterministic order를 증명합니다. Multiple projects beyond fixture shape, rendered XML, robots sitemap line의 HTTP output은 증명하지 않습니다. |
| 후속 연결 | 이 commit이 category 내 sitemap story의 마지막 focused regression evidence입니다. |

#### 코드·실행 증거

**최소 코드 발췌**

```ts
// adc392157f70 — src/lib/site-metadata.test.ts
expect(sitemap.map(({ url }) => url)).toEqual([
  "https://portfolio.example.dev/",
  "https://portfolio.example.dev/projects",
  `https://portfolio.example.dev/projects/${content.projects[0]?.id}`,
  "https://portfolio.example.dev/about",
  "https://portfolio.example.dev/resume",
  "https://portfolio.example.dev/contact",
  "https://portfolio.example.dev/journey",
]);
```

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

이 commit이 category 내 sitemap story의 마지막 focused regression evidence입니다.
<!-- learner:end commit-adc392157f70 -->


## 6. Invariant evolution

<!-- learner:start thread-invariant-evolution -->
| Commit/구간 | 상태 | 근거 기반 설명 |
| --- | --- | --- |
| 55b6061e0052 | Introduced | Page metadata distinguishes template noindex from production index. |
| cb61450ad922 | Extended | The same mode controls site-wide robots allow/disallow and host. |
| 67aabeab1553 | Integrated | The root layout emits the page directive in the real application. |
| fb3d18fd660b | Unit-verified | Metadata and robots object policies are tested together. |
| 166f05f7be06 | Runtime-verified in repository history | The running app's meta tag and robots text are exercised by Playwright; not rerun here. |
| 70b69f04e8c7 | Extended | Robots advertises a sitemap containing only enabled production routes. |
| adc392157f70 | Deterministically verified | Template empty and production enabled-route inventory are locked down. |
<!-- learner:end thread-invariant-evolution -->

## 7. Failure → Fix → Test 관계

<!-- learner:start thread-failure-fix-test -->
| Failure/위험 | Fix/결정 | Test/증거 |
| --- | --- | --- |
| Template starter could be indexed | Noindex/nofollow + robots disallow + empty sitemap | Unit and E2E tests cover metadata and robots; sitemap unit test covers empty output |
| Crawler outputs could disagree on mode | All factories consume the same exact mode vocabulary | One unit commit compares metadata/robots; E2E observes both serialized outputs |
| Sitemap could advertise disabled surfaces | Route inventory is built from page flags and validated enabled projects | Disabled interview route is omitted in exact expected URL list |
<!-- learner:end thread-failure-fix-test -->

## 8. Ownership/state/responsibility 변화

<!-- learner:start thread-ownership -->
| 시점 | Owner | 책임 변화 |
| --- | --- | --- |
| Before | Implicit framework defaults | No explicit crawler publication policy. |
| 55b/cb | Pure factories | Own page and robots policy while route modules own environment integration. |
| 67a | Root layout | Consumes page policy in actual metadata export. |
| 70b | Sitemap factory + route | Owns machine-readable publication inventory; robots owns discovery link. |
| Tests | Unit and Playwright layers | Separate object contract from framework/HTTP integration evidence. |
<!-- learner:end thread-ownership -->

## 9. 최종 Thread 상태와 실행 흐름

<!-- learner:start thread-final-state -->
**최종 상태**

Template previews are closed to indexing through three aligned surfaces: page metadata, robots.txt, and an empty sitemap. Production uses a validated public origin, permits crawling, advertises its sitemap, and lists only routes enabled by current content plus validated project details.

**코드 없는 실행 흐름**

1. Each machine-readable route resolves the exact content mode from the environment.
2. The root metadata factory emits index/follow only for production; template receives noindex/nofollow.
3. The robots route disallows all template crawling or emits production allow/host/sitemap values from the public origin.
4. The sitemap route returns no template URLs; production maps enabled pages and projects to absolute URLs.
5. Unit tests protect pure output objects, while the repository's Playwright test exercises page metadata and robots text through the running application.
<!-- learner:end thread-final-state -->

## 10. Learning completion check

<!-- learner:start thread-completion-check -->
- [x] 각 SHA의 exact diff/tree를 GitHub connector로 정적 확인했습니다.
- [x] 보장과 비보장을 commit별로 구분했습니다.
- [x] test technique과 proves/does-not-prove를 구분했습니다.
- [x] 최종 흐름을 코드 없이 재구성했습니다.
- [x] 프로젝트 명령은 DNS 제한으로 실행하지 못했으며 그 사실을 모든 실행 증거에 명시했습니다.
<!-- learner:end thread-completion-check -->
