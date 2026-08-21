# Thread: Content-declared internal route integrity

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

JSON content가 선언한 root-relative URL을 실제 App Router 공개 surface와 대조하고, disabled page·unknown project·unsupported path가 renderer에 도달하기 전에 source-aware 오류로 누적되는 과정을 복원합니다.

### Phase 1 boundary decision

기존 draft는 query-state URL 작성, external anchor transport, content validation을 하나로 묶었습니다. Phase 1에서는 category 02/03이 소유하는 UI transport 커밋을 제거하고, crawler와 publication surface의 정확성에 직접 영향을 주는 content-source route integrity만 남겼습니다.

### Frozen critical invariants

- 검증 대상은 `/`로 시작하지만 `//`로 시작하지 않는 internal route reference입니다.
- 지원되지 않는 pathname, disabled page, unknown/disabled project는 성공으로 통과하지 않습니다.
- 오류는 해당 JSON source file과 정확한 JSON path를 보존한 채 aggregate `PortfolioContentError`에 합쳐집니다.
- site navigation, global links, project links가 동일한 validator를 사용하고 renderer는 이를 재해석하지 않습니다.

### Major engineering difficulties

- URL 문자열의 transport 분류와 실제 공개 route 존재 여부 검증을 분리하는 문제
- 여러 JSON 파일에서 발견되는 오류를 첫 실패에서 중단하지 않고 source-aware 목록으로 누적하는 문제
- page availability와 enabled project identity를 validator가 일관되게 참조하도록 만드는 문제

## 2. 핵심 질문

- `addInternalRouteIssue`는 어떤 입력을 의도적으로 무시하고 어떤 pathname만 검증합니까?
- 지원 page와 project detail route를 판정하는 실제 table/regular expression은 무엇입니까?
- helper 도입 뒤 site, global link, project link consumer가 어떤 순서로 연결됩니까?
- 회귀 테스트는 어떤 content clone을 변형하고 어떤 오류의 file/message를 확인합니까?

## 3. 완료 기준

- 각 SHA에서 `src/lib/content-loader.ts`의 helper와 caller loop를 parent diff로 확인했습니다.
- external/protocol-relative URL이 이 Thread의 검증 범위 밖이라는 점을 보장과 비보장으로 구분했습니다.
- `PortfolioContentError`의 aggregate issue가 source file과 JSON path를 유지하는 흐름을 설명했습니다.
- `3353032ba23b`의 deterministic content mutation test가 무엇을 증명하고 무엇을 증명하지 않는지 기록했습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Frozen role |
| --- | --- | --- | --- | --- | --- |
| 1 | `b380f56f5d90` | feat(content): 내부 route 참조 검증 추가 | A | ARCH, CONTENT, VALIDATION | Reusable internal-route validation primitive |
| 2 | `6b9e10289b64` | feat(content): 사이트와 링크 route 참조 검증 추가 | A | ARCH, CONTENT, VALIDATION | Integrate the route validator with site navigation and global links |
| 3 | `08b4ac81739f` | feat(content): 프로젝트 내부 참조 검증 추가 | A | CONTENT, VALIDATION | Extend integrity checks to project relationships and project-local links |
| 4 | `3353032ba23b` | test(content): Vitest 기반 콘텐츠 계약 검증 추가 | A | CONTENT, VALIDATION, TEST | Deterministic regression coverage for source-aware route failures |

## 5. Commit별 학습 기록

### `b380f56f5d90` — feat(content): 내부 route 참조 검증 추가

- **Importance:** A
- **Tags:** ARCH, CONTENT, VALIDATION
- **Frozen role:** Reusable internal-route validation primitive

#### 해당 SHA에서 확인할 실제 코드

- `src/lib/content-loader.ts`의 `addInternalRouteIssue`와 commit parent를 비교합니다.
- `href.startsWith("/")`, `href.startsWith("//")`, `new URL(..., "https://portfolio.invalid")` branch를 추적합니다.
- supported page map, `/projects/<id>` regular expression, `enabledPageIds`, `enabledProjectIds`의 ownership을 확인합니다.
- helper가 아직 어떤 source loop에도 호출되지 않는 integration gap을 확인합니다.

확인 원칙:

- `b380f56f5d90^`와 `b380f56f5d90`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-b380f56f5d90 -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Schema와 cross-file reference 검증은 존재했지만 content의 root-relative URL이 실제 공개 route를 가리키는지는 중앙에서 확인하지 않았습니다. 잘못된 `/not-a-route`나 disabled page 링크가 구조상 문자열로 통과할 수 있었습니다. |
| 실제 변경 file/symbol/call path | `src/lib/content-loader.ts`에 `addInternalRouteIssue(issues, file, path, href, enabledPageIds, enabledProjectIds, messagePrefix)`가 추가됩니다. URL을 dummy origin으로 parse한 뒤 `/`, 정적 page map, `/projects/<id>` 순서로 판정합니다. |
| Data/state/owner | 검증 결과의 owner는 loader의 `issues` 배열입니다. helper는 content를 수정하지 않고 issue만 append하며, availability set은 caller가 주입합니다. |
| Failure·absence·fallback | 외부 URL과 `//host/path`는 검사하지 않고 return합니다. unsupported path, disabled page, unknown/disabled project는 각각 source-aware issue를 추가합니다. 이 commit 자체에는 caller가 없어 실제 source loading에는 아직 영향이 없습니다. |
| 보장/비보장 | internal pathname 판정 vocabulary는 생겼지만 site/global/project source 전체 적용은 보장하지 않습니다. malformed percent-encoding을 별도 복구하는 branch도 diff에서 확인되지 않습니다. |
| 후속 연결 | `6b9e10289b64`가 site navigation과 global links에, `08b4ac81739f`가 project links에 이 helper를 연결합니다. |

#### 코드·실행 증거

**최소 코드 발췌**

```ts
// b380f56f5d90 — src/lib/content-loader.ts — addInternalRouteIssue
if (!href.startsWith("/") || href.startsWith("//")) return;
const pathname = new URL(href, "https://portfolio.invalid").pathname;
if (pathname === "/") return;
```

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

Helper introduction only; no production caller exists until the next commit.
<!-- learner:end commit-b380f56f5d90 -->


### `6b9e10289b64` — feat(content): 사이트와 링크 route 참조 검증 추가

- **Importance:** A
- **Tags:** ARCH, CONTENT, VALIDATION
- **Frozen role:** Integrate the route validator with site navigation and global links

#### 해당 SHA에서 확인할 실제 코드

- `loadPortfolioSource`에서 enabled page/project set이 만들어지는 위치를 확인합니다.
- `source.site.navigation.forEach`와 `source.links.forEach`가 넘기는 file/path/messagePrefix를 비교합니다.
- disabled link도 schema/load path에 남아 있는지, route validation이 enabled flag를 조건으로 건너뛰는지 확인합니다.
- 여러 issue가 최종 `PortfolioContentError`로 합쳐지는 기존 throw boundary를 추적합니다.

확인 원칙:

- `6b9e10289b64^`와 `6b9e10289b64`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-6b9e10289b64 -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Validator helper는 존재했지만 호출되지 않아 실제 content load가 잘못된 navigation/link를 거부하지 않았습니다. |
| 실제 변경 file/symbol/call path | `loadPortfolioSource`가 `site.navigation`과 global `links`를 순회하며 `addInternalRouteIssue`를 호출합니다. 각 호출은 `src/content/site.json` 또는 `src/content/links.json`과 배열 index 기반 JSON path를 전달합니다. |
| Data/state/owner | route availability 판단은 loader가 만든 `enabledPageIds`와 `enabledProjectIds`가 소유합니다. 개별 renderer나 selector는 검증 정책을 갖지 않습니다. |
| Failure·absence·fallback | 지원되지 않는 navigation은 `Unsupported internal navigation route`, global link는 `Unsupported internal link route` 계열 issue가 됩니다. issue는 즉시 throw하지 않고 기존 aggregate 배열에 누적됩니다. |
| 보장/비보장 | site와 global link source는 보호되지만 project item 내부 links는 아직 검사하지 않습니다. external URL의 protocol/host 안전성도 이 loader helper의 책임이 아닙니다. |
| 후속 연결 | `08b4ac81739f`가 project-local references와 links까지 같은 boundary로 확장합니다. |

#### 코드·실행 증거

**최소 코드 발췌**

이 commit은 본문에 exact file/symbol/branch를 기록했습니다. 확인된 diff를 임의 축약한 pseudo-code를 만들지 않기 위해 코드 블록은 생략했습니다.

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

`08b4ac81739f`가 project-local references와 links까지 같은 boundary로 확장합니다.
<!-- learner:end commit-6b9e10289b64 -->


### `08b4ac81739f` — feat(content): 프로젝트 내부 참조 검증 추가

- **Importance:** A
- **Tags:** CONTENT, VALIDATION
- **Frozen role:** Extend integrity checks to project relationships and project-local links

#### 해당 SHA에서 확인할 실제 코드

- `source.projects.items.forEach` 안에서 group, tags, stack, links 검증 순서를 확인합니다.
- project link의 file/path가 `src/content/projects.json`과 `$.items[i].links[j].href`로 보존되는지 확인합니다.
- `/projects/<id>`가 enabled project set과 대조되는 branch를 다시 확인합니다.
- 이 commit이 route integrity 외에 추가한 duplicate/reference issue를 route 검사와 구분합니다.

확인 원칙:

- `08b4ac81739f^`와 `08b4ac81739f`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-08b4ac81739f -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Site/global links는 검증됐지만 project case study 안의 internal links는 별도 경로라 unknown project detail을 가리킬 수 있었습니다. |
| 실제 변경 file/symbol/call path | `loadPortfolioSource`의 project loop가 각 `project.links` entry에 `addInternalRouteIssue`를 호출합니다. 같은 loop에서 group ID, duplicate tags/stack, technology reference도 검사합니다. |
| Data/state/owner | Project source index가 JSON path ownership을 제공하고, enabled project IDs가 detail-route validity를 결정합니다. 변형 없이 issue만 누적됩니다. |
| Failure·absence·fallback | Unknown 또는 disabled project detail은 project JSON의 정확한 link path에 issue를 남깁니다. external/protocol-relative href는 계속 검사 범위 밖입니다. |
| 보장/비보장 | 세 종류의 content URL source가 동일 route vocabulary를 사용하게 됩니다. 실제 Next route rendering, HTTP 404, external link security attribute는 이 commit이 보장하지 않습니다. |
| 후속 연결 | `3353032ba23b`가 unsupported global link와 missing project route를 deterministic clone mutation으로 검증합니다. |

#### 코드·실행 증거

**최소 코드 발췌**

```ts
// 08b4ac81739f — src/lib/content-loader.ts — project link loop
project.links.forEach((link, linkIndex) =>
  addInternalRouteIssue(
    issues,
    "src/content/projects.json",
    `$.items[${projectIndex}].links[${linkIndex}].href`,
    link.href,
    enabledPageIds,
    enabledProjectIds,
    "Unsupported internal project link route",
  ),
);
```

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

`3353032ba23b`가 unsupported global link와 missing project route를 deterministic clone mutation으로 검증합니다.
<!-- learner:end commit-08b4ac81739f -->


### `3353032ba23b` — test(content): Vitest 기반 콘텐츠 계약 검증 추가

- **Importance:** A
- **Tags:** CONTENT, VALIDATION, TEST
- **Frozen role:** Deterministic regression coverage for source-aware route failures

#### 해당 SHA에서 확인할 실제 코드

- `src/lib/portfolio.test.ts`의 `captureContentError`가 exception type을 어떻게 고정하는지 확인합니다.
- `rejects duplicate IDs, missing designs, and unsupported navigation` test의 clone mutation을 추적합니다.
- `rejects unsupported internal links and missing project routes`가 global/project link를 어떻게 바꾸는지 확인합니다.
- Assertions가 exact full issue list가 아닌 `arrayContaining/objectContaining`임을 기록합니다.

확인 원칙:

- `3353032ba23b^`와 `3353032ba23b`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-3353032ba23b -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | Production validator는 구현됐지만 잘못된 route source가 다시 허용되는 회귀를 자동으로 잡는 executable boundary가 없었습니다. |
| 실제 변경 file/symbol/call path | Vitest/jsdom/Testing Library 기반을 추가하고 `src/lib/portfolio.test.ts`가 cloned JSON을 `loadPortfolioSource`에 주입합니다. `captureContentError`는 thrown value가 `PortfolioContentError`인지 확인합니다. |
| Data/state/owner | Test fixture는 imported JSON을 `structuredClone`해 원본 module state를 변경하지 않습니다. 실패 state는 returned value가 아니라 exception의 `issues` 배열로 관찰합니다. |
| Failure·absence·fallback | `/not-a-route` navigation/global link와 `/projects/not-a-project`를 주입해 file/message를 확인합니다. Disabled page/project reference도 별도 test에서 검사합니다. |
| 보장/비보장 | Source-aware route rejection의 deterministic regression evidence입니다. HTTP router, browser navigation, 모든 exact JSON path/order, malformed URL parser behavior까지 증명하지는 않습니다. |
| 후속 연결 | 이 Thread의 production path는 loader에서 종료됩니다. UI transport와 actual 404 behavior는 다른 category/thread가 소유합니다. |

#### 코드·실행 증거

**최소 코드 발췌**

```ts
// 3353032ba23b — src/lib/portfolio.test.ts
links[0].href = "/not-a-route";
links[0].external = false;
projectWithLinks.links[0].href = "/projects/not-a-project";
const error = captureContentError(() => loadPortfolioSource({ links, projects }));
```

**실행 증거**

프로젝트 명령은 실행하지 않았습니다. `git clone --branch web/portfolio --single-branch --filter=blob:none https://github.com/seungwoo7050/42-archive.git /mnt/data/portfolio-branch-checkout`가 `Could not resolve host: github.com`으로 종료되어 exact-SHA checkout과 의존성 설치가 불가능했습니다. 따라서 아래 결론은 GitHub connector로 조회한 해당 SHA의 diff와 resulting file에 대한 정적 검토입니다.

**다음 commit 연결**

이 Thread의 production path는 loader에서 종료됩니다. UI transport와 actual 404 behavior는 다른 category/thread가 소유합니다.
<!-- learner:end commit-3353032ba23b -->


## 6. Invariant evolution

<!-- learner:start thread-invariant-evolution -->
| Commit/구간 | 상태 | 근거 기반 설명 |
| --- | --- | --- |
| b380f56f5d90 | Introduced | Internal route vocabulary and issue-producing helper exist, but are not yet integrated. |
| 6b9e10289b64 | Extended | Site navigation and global links consume the helper with source-aware paths. |
| 08b4ac81739f | Completed | Project-local links and project identities enter the same validation boundary. |
| 3353032ba23b | Deterministically verified | Cloned invalid sources reproduce unsupported and disabled-reference failures. |
<!-- learner:end thread-invariant-evolution -->

## 7. Failure → Fix → Test 관계

<!-- learner:start thread-failure-fix-test -->
| Failure/위험 | Fix/결정 | Test/증거 |
| --- | --- | --- |
| Route strings were schema-valid but not route-valid | Central helper classifies supported/disabled/unknown internal paths | Vitest mutates navigation/global/project URLs and inspects `PortfolioContentError` |
| Helper initially had no caller | Two integration commits connect all content URL collections | The final content test invokes the aggregate loader, not the helper in isolation |
<!-- learner:end thread-failure-fix-test -->

## 8. Ownership/state/responsibility 변화

<!-- learner:start thread-ownership -->
| 시점 | Owner | 책임 변화 |
| --- | --- | --- |
| Before | Individual content strings/renderers | No shared knowledge that an internal path corresponds to an enabled route. |
| b380 | `addInternalRouteIssue` | Owns path classification but no source traversal. |
| 6b9 → 08b | `loadPortfolioSource` | Owns traversal, enabled sets, source file/path, and aggregate failure. |
| 335 | `src/lib/portfolio.test.ts` | Owns deterministic regression fixtures without mutating checked-in JSON. |
<!-- learner:end thread-ownership -->

## 9. 최종 Thread 상태와 실행 흐름

<!-- learner:start thread-final-state -->
**최종 상태**

At the end of this Thread, every internal route declared in site navigation, global links, or project links is checked against one enabled-route vocabulary during content loading. Unsupported and disabled destinations prevent a valid portfolio aggregate from being produced. External-link transport attributes and browser navigation remain outside this Thread.

**코드 없는 실행 흐름**

1. JSON modules are schema-parsed into `PortfolioSource`.
2. `loadPortfolioSource` derives enabled page and project identity sets.
3. Each relevant URL field is passed to `addInternalRouteIssue` with its source file and JSON path.
4. External/protocol-relative values leave this validator; internal pathnames are classified as root, supported page, project detail, or invalid.
5. All discovered issues are accumulated and the loader throws one `PortfolioContentError`; only an issue-free source reaches selectors/renderers.
<!-- learner:end thread-final-state -->

## 10. Learning completion check

<!-- learner:start thread-completion-check -->
- [x] 각 SHA의 exact diff/tree를 GitHub connector로 정적 확인했습니다.
- [x] 보장과 비보장을 commit별로 구분했습니다.
- [x] test technique과 proves/does-not-prove를 구분했습니다.
- [x] 최종 흐름을 코드 없이 재구성했습니다.
- [x] 프로젝트 명령은 DNS 제한으로 실행하지 못했으며 그 사실을 모든 실행 증거에 명시했습니다.
<!-- learner:end thread-completion-check -->
