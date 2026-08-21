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
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/owner |  |
| Failure·absence·fallback |  |
| 보장/비보장 |  |
| 후속 연결 |  |

#### 코드·실행 증거

- **코드 발췌:** 
- **실행한 명령과 결과:** 
- **다음 commit 연결:**
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
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/owner |  |
| Failure·absence·fallback |  |
| 보장/비보장 |  |
| 후속 연결 |  |

#### 코드·실행 증거

- **코드 발췌:** 
- **실행한 명령과 결과:** 
- **다음 commit 연결:**
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
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/owner |  |
| Failure·absence·fallback |  |
| 보장/비보장 |  |
| 후속 연결 |  |

#### 코드·실행 증거

- **코드 발췌:** 
- **실행한 명령과 결과:** 
- **다음 commit 연결:**
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
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/owner |  |
| Failure·absence·fallback |  |
| 보장/비보장 |  |
| 후속 연결 |  |

#### 코드·실행 증거

- **코드 발췌:** 
- **실행한 명령과 결과:** 
- **다음 commit 연결:**
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
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/owner |  |
| Failure·absence·fallback |  |
| 보장/비보장 |  |
| 후속 연결 |  |

#### 코드·실행 증거

- **코드 발췌:** 
- **실행한 명령과 결과:** 
- **다음 commit 연결:**
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
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/owner |  |
| Failure·absence·fallback |  |
| 보장/비보장 |  |
| 후속 연결 |  |

#### 코드·실행 증거

- **코드 발췌:** 
- **실행한 명령과 결과:** 
- **다음 commit 연결:**
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
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/owner |  |
| Failure·absence·fallback |  |
| 보장/비보장 |  |
| 후속 연결 |  |

#### 코드·실행 증거

- **코드 발췌:** 
- **실행한 명령과 결과:** 
- **다음 commit 연결:**
<!-- learner:end commit-adc392157f70 -->


## 6. Invariant evolution

<!-- learner:start thread-invariant-evolution -->
| Commit/구간 | 상태 | 학습자 기록 |
| --- | --- | --- |
| 55b6061e0052 | Introduced |  |
| cb61450ad922 | Extended |  |
| 67aabeab1553 | Integrated |  |
| fb3d18fd660b | Unit-verified |  |
| 166f05f7be06 | Runtime-verified in repository history |  |
| 70b69f04e8c7 | Extended |  |
| adc392157f70 | Deterministically verified |  |
<!-- learner:end thread-invariant-evolution -->

## 7. Failure → Fix → Test 관계

<!-- learner:start thread-failure-fix-test -->
| Failure/위험 | Fix/결정 | Test/증거 |
| --- | --- | --- |
| Template starter could be indexed |  |  |
| Crawler outputs could disagree on mode |  |  |
| Sitemap could advertise disabled surfaces |  |  |
<!-- learner:end thread-failure-fix-test -->

## 8. Ownership/state/responsibility 변화

<!-- learner:start thread-ownership -->
| 시점 | Owner | 책임 변화 |
| --- | --- | --- |
| Before |  |  |
| 55b/cb |  |  |
| 67a |  |  |
| 70b |  |  |
| Tests |  |  |
<!-- learner:end thread-ownership -->

## 9. 최종 Thread 상태와 실행 흐름

<!-- learner:start thread-final-state -->
- **최종 상태:** 
- **코드 없는 실행 흐름:**
  1. 
  2. 
  3.
<!-- learner:end thread-final-state -->

## 10. Learning completion check

<!-- learner:start thread-completion-check -->
- [ ] 각 SHA의 exact diff/tree를 확인했습니다.
- [ ] 보장과 비보장을 구분했습니다.
- [ ] test technique과 proves/does-not-prove를 구분했습니다.
- [ ] 최종 흐름을 코드 없이 설명할 수 있습니다.
<!-- learner:end thread-completion-check -->
