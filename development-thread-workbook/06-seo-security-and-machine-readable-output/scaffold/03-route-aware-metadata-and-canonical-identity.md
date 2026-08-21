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
<!-- learner:end commit-4358bcd34f2e -->


## 6. Invariant evolution

<!-- learner:start thread-invariant-evolution -->
| Commit/구간 | 상태 | 학습자 기록 |
| --- | --- | --- |
| 1f4f93ad9a0f | Introduced |  |
| 55b6061e0052 | Centralized |  |
| 67aabeab1553 | Corrected/Integrated |  |
| 1c40645caead | Extended |  |
| 844ff4d7abcb → 5632c5df9b47 | Integrated |  |
| 4358bcd34f2e | Verified |  |
<!-- learner:end thread-invariant-evolution -->

## 7. Failure → Fix → Test 관계

<!-- learner:start thread-failure-fix-test -->
| Failure/위험 | Fix/결정 | Test/증거 |
| --- | --- | --- |
| Request-derived origin could become production identity |  |  |
| All routes inherited one generic canonical/title |  |  |
| Dynamic project metadata could diverge from page availability |  |  |
<!-- learner:end thread-failure-fix-test -->

## 8. Ownership/state/responsibility 변화

<!-- learner:start thread-ownership -->
| 시점 | Owner | 책임 변화 |
| --- | --- | --- |
| Before |  |  |
| 55b |  |  |
| 67a |  |  |
| 1c onward |  |  |
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
