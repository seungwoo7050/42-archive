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
<!-- learner:end commit-3353032ba23b -->


## 6. Invariant evolution

<!-- learner:start thread-invariant-evolution -->
| Commit/구간 | 상태 | 학습자 기록 |
| --- | --- | --- |
| b380f56f5d90 | Introduced |  |
| 6b9e10289b64 | Extended |  |
| 08b4ac81739f | Completed |  |
| 3353032ba23b | Deterministically verified |  |
<!-- learner:end thread-invariant-evolution -->

## 7. Failure → Fix → Test 관계

<!-- learner:start thread-failure-fix-test -->
| Failure/위험 | Fix/결정 | Test/증거 |
| --- | --- | --- |
| Route strings were schema-valid but not route-valid |  |  |
| Helper initially had no caller |  |  |
<!-- learner:end thread-failure-fix-test -->

## 8. Ownership/state/responsibility 변화

<!-- learner:start thread-ownership -->
| 시점 | Owner | 책임 변화 |
| --- | --- | --- |
| Before |  |  |
| b380 |  |  |
| 6b9 → 08b |  |  |
| 335 |  |  |
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
