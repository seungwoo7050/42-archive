# Thread: Content link security, placement, and transport

> Project: 42 Archive Portfolio
>
> Branch: `web/portfolio`
>
> Category: `03-shared-ui-interaction-and-responsive-primitives`

## 0. 분류 출처와 Phase 1 고정 범위

- Commit SHA, subject, importance와 tags는 branch의 `commit/commit-importance.md` 분류와 exact commit resolution을 대조했습니다.
- 이 문서의 Thread boundary, commit set, order, 역할과 commit-specific investigation task는 Phase 1 audit에서 확정했습니다.
- Phase 2에서는 이 fixed text와 commit metadata를 바꾸지 않고 learner-facing section만 채웁니다.
- 다른 branch와 final HEAD를 과거 SHA 설명에 사용하지 않습니다.

## 1. Thread 목표와 경계

연락처와 프로젝트 링크의 선택 정책, 내부/외부 transport, 배치별 노출, availability filtering과 공용 renderer 정리를 실제 commit 순서로 복원합니다.

**경계:** 이 Thread는 링크가 어디에 노출되고 어떤 element/URL로 이동하는지를 소유합니다. ProjectCard의 카드 조립과 hover 표현은 06 Thread에 남기며, route lifecycle 자체는 이 범위에 포함하지 않습니다.

### 고정 invariant

- Project card/detail의 가용성·placement 선택은 selector가 맡고, hero consumer는 이 history에서 같은 placement vocabulary를 직접 적용합니다. Transport renderer는 surface membership을 다시 결정하지 않습니다.
- 외부 링크는 anchor transport와 외부 속성을 사용하고, 내부 링크는 Next Link와 현재 view/debug query 보존 규칙을 사용합니다.
- live가 아닌 프로젝트의 demo와 해당 placement에 없는 링크는 렌더링되지 않습니다.
- 선택 결과가 비면 action container도 렌더링하지 않습니다.

## 2. 핵심 질문

- 초기 selector가 contact/project link availability를 어떤 단일 vocabulary로 만들었는가?
- ContentLinkView가 internal/external transport를 분기할 때 보장하는 속성과 보장하지 않는 검증은 무엇인가?
- card/detail/hero placement가 언제 도입되고 각 consumer의 filtering이 selector 또는 direct predicate 중 어디에 남았는가?
- 09cec616f314의 test가 source order, query 보존, external attributes, empty output을 어떤 technique로 고정하는가?
- 44e4d062da50의 refactor가 behavior를 바꾸지 않고 어떤 렌더링 책임만 합쳤는가?

## 3. 완료 기준

- 각 SHA의 parent diff와 resulting tree를 구분해 실제 file/symbol/call path를 기록합니다.
- Previous state, owner, state transition, absence/failure branch, guarantee/non-guarantee를 commit별로 분리합니다.
- Fix와 test는 실제로 수정·검증하는 production path에 연결합니다.
- 실행하지 않은 command 결과를 만들지 않습니다.
- S/A-level은 architecture/owner/failure/later evidence를 B-level보다 깊게 복원합니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Thread 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `ba8da56d3fcf` | feat(portfolio): 연락과 프로젝트 링크 선택기 추가 | A | CONTENT | 정책 owner 도입 |
| 2 | `f63c978c71c9` | feat(ui): 내부 외부 콘텐츠 링크 렌더링 | A | CONTENT | transport renderer 도입 |
| 3 | `e37ea9c2819a` | feat(project): 프로젝트 링크 그룹 추가 | B | RENDERER | detail action consumer |
| 4 | `1ef269fbdb49` | feat(project): 프로젝트 카드 링크 추가 | B | RENDERER | card action consumer |
| 5 | `daa6815a6dfa` | feat(project): 카드 링크를 콘텐츠 배치 기준으로 선택 | B | CONTENT, RENDERER | card placement 적용 |
| 6 | `119ff9a92090` | feat(content): 링크 배치 selector 추가 | B | CONTENT | placement vocabulary 일반화 |
| 7 | `2d87b62dcce8` | refactor(project): 상세 링크를 배치 기준으로 선택 | B | RENDERER, REFACTOR | detail selector migration |
| 8 | `ee2c118a76d6` | feat(content): 홈 링크를 배치 기준으로 선택 | B | CONTENT | hero consumer migration |
| 9 | `09cec616f314` | test(ui): 디자인 선택과 프로젝트 링크 계약 검증 | A | VALIDATION, TEST | 결정적 component contract 검증 |
| 10 | `44e4d062da50` | refactor(ui): 프로젝트 링크 렌더링 중복 제거 | B | VALIDATION, REFACTOR | 공용 list renderer 추출 |

## 5. Commit별 학습 기록

### 1. `ba8da56d3fcf` — feat(portfolio): 연락과 프로젝트 링크 선택기 추가

- **Importance:** A
- **Tags:** CONTENT
- **Thread 역할:** 정책 owner 도입

#### 해당 SHA에서 확인할 실제 코드

- `src/lib/portfolio/selectors.ts`의 `getPreferredContactLinks`, `getProjectLink`, `isProjectLive`, `getProjectCardLinks`, `getExternalLinkProps`를 parent와 비교합니다.
- `src/lib/portfolio.ts` export surface가 새 selector를 어떤 public boundary로 노출하는지 확인합니다.
- preferred ID 누락, demo link 부재, non-live deployment, internal link의 반환값을 각각 추적합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-ba8da56d3fcf-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-ba8da56d3fcf-record:end -->

#### 최소 코드 증거

<!-- learner:commit-ba8da56d3fcf-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-ba8da56d3fcf-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-ba8da56d3fcf-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-ba8da56d3fcf-execution:end -->

### 2. `f63c978c71c9` — feat(ui): 내부 외부 콘텐츠 링크 렌더링

- **Importance:** A
- **Tags:** CONTENT
- **Thread 역할:** transport renderer 도입

#### 해당 SHA에서 확인할 실제 코드

- 새 `src/components/portfolio/content-link.tsx`의 `ContentLinkView` 두 return branch를 비교합니다.
- 외부 branch가 `getExternalLinkProps`를 spread하고 내부 branch가 `getTemplateHref`에 `homeTemplate`·`contentDebug`를 전달하는 call path를 확인합니다.
- 이 component가 visibility, href validation, label/icon styling을 소유하는지 구분합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-f63c978c71c9-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-f63c978c71c9-record:end -->

#### 최소 코드 증거

<!-- learner:commit-f63c978c71c9-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-f63c978c71c9-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-f63c978c71c9-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-f63c978c71c9-execution:end -->

### 3. `e37ea9c2819a` — feat(project): 프로젝트 링크 그룹 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** detail action consumer

#### 해당 SHA에서 확인할 실제 코드

- 새 `src/components/portfolio/project-links.tsx`의 `ProjectLinks`와 local visibility predicate를 확인합니다.
- demo availability, `excludeCaseStudy`, empty result, `ContentLinkView` 호출을 각각 추적합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-e37ea9c2819a-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-e37ea9c2819a-record:end -->

#### 최소 코드 증거

<!-- learner:commit-e37ea9c2819a-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-e37ea9c2819a-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-e37ea9c2819a-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-e37ea9c2819a-execution:end -->

### 4. `1ef269fbdb49` — feat(project): 프로젝트 카드 링크 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** card action consumer

#### 해당 SHA에서 확인할 실제 코드

- `ProjectCardLinks`가 `getProjectCardLinks` 결과를 어떻게 렌더링하는지 확인합니다.
- `ProjectLinks`와 중복된 null branch, class selection, icon choice를 비교합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-1ef269fbdb49-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-1ef269fbdb49-record:end -->

#### 최소 코드 증거

<!-- learner:commit-1ef269fbdb49-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-1ef269fbdb49-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-1ef269fbdb49-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-1ef269fbdb49-execution:end -->

### 5. `daa6815a6dfa` — feat(project): 카드 링크를 콘텐츠 배치 기준으로 선택

- **Importance:** B
- **Tags:** CONTENT, RENDERER
- **Thread 역할:** card placement 적용

#### 해당 SHA에서 확인할 실제 코드

- `getProjectCardLinks`의 기존 type whitelist와 새 `placements.includes("card")` gate를 비교합니다.
- Placement를 통과한 demo와 non-demo가 각각 어떤 추가 조건을 거치는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-daa6815a6dfa-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-daa6815a6dfa-record:end -->

#### 최소 코드 증거

<!-- learner:commit-daa6815a6dfa-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-daa6815a6dfa-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-daa6815a6dfa-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-daa6815a6dfa-execution:end -->

### 6. `119ff9a92090` — feat(content): 링크 배치 selector 추가

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** placement vocabulary 일반화

#### 해당 SHA에서 확인할 실제 코드

- `LinkPlacement` union과 `getProjectLinksForPlacement`, card/detail wrapper, site-link placement selector를 확인합니다.
- Source array order가 filter 결과에서도 유지되는지와 placement absence가 어떻게 처리되는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-119ff9a92090-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-119ff9a92090-record:end -->

#### 최소 코드 증거

<!-- learner:commit-119ff9a92090-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-119ff9a92090-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-119ff9a92090-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-119ff9a92090-execution:end -->

### 7. `2d87b62dcce8` — refactor(project): 상세 링크를 배치 기준으로 선택

- **Importance:** B
- **Tags:** RENDERER, REFACTOR
- **Thread 역할:** detail selector migration

#### 해당 SHA에서 확인할 실제 코드

- `ProjectLinks`가 raw `project.links` 대신 `getProjectDetailLinks(project)`를 호출하도록 바뀐 부분을 확인합니다.
- Placement selection 후에도 `excludeCaseStudy`와 demo live check가 어느 layer에 남는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-2d87b62dcce8-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-2d87b62dcce8-record:end -->

#### 최소 코드 증거

<!-- learner:commit-2d87b62dcce8-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-2d87b62dcce8-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-2d87b62dcce8-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-2d87b62dcce8-execution:end -->

### 8. `ee2c118a76d6` — feat(content): 홈 링크를 배치 기준으로 선택

- **Importance:** B
- **Tags:** CONTENT
- **Thread 역할:** hero consumer migration

#### 해당 SHA에서 확인할 실제 코드

- Classic/Design home route에서 hard-coded link type filter가 hero placement filter로 교체된 diff를 확인합니다.
- 두 design route가 같은 content contract를 읽되 각 route의 presentation markup은 유지되는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-ee2c118a76d6-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-ee2c118a76d6-record:end -->

#### 최소 코드 증거

<!-- learner:commit-ee2c118a76d6-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-ee2c118a76d6-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-ee2c118a76d6-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-ee2c118a76d6-execution:end -->

### 9. `09cec616f314` — test(ui): 디자인 선택과 프로젝트 링크 계약 검증

- **Importance:** A
- **Tags:** VALIDATION, TEST
- **Thread 역할:** 결정적 component contract 검증

#### 해당 SHA에서 확인할 실제 코드

- `src/components/portfolio/project-links.test.tsx`의 fixtures와 assertion을 production selector/renderer path별로 매핑합니다.
- Internal URL의 `view`·`debug`, external `target`·`rel`, offline demo, case-study exclusion, card placement, empty DOM을 구분합니다.
- 같은 commit의 `design-switcher.test.tsx`가 native details close/focus를 검증하지만 이 Thread에서는 link contract와의 경계만 기록합니다.
- JSDOM component test가 실제 navigation·browser security·network response를 증명하지 않는다는 한계를 명시합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-09cec616f314-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-09cec616f314-record:end -->

#### 최소 코드 증거

<!-- learner:commit-09cec616f314-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-09cec616f314-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-09cec616f314-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-09cec616f314-execution:end -->

### 10. `44e4d062da50` — refactor(ui): 프로젝트 링크 렌더링 중복 제거

- **Importance:** B
- **Tags:** VALIDATION, REFACTOR
- **Thread 역할:** 공용 list renderer 추출

#### 해당 SHA에서 확인할 실제 코드

- 새 local `ProjectLinkList`와 두 public wrapper의 before/after를 비교합니다.
- Empty branch, key, min-height, primary class, external/internal icon과 `ContentLinkView` props가 한 곳으로 이동했는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-44e4d062da50-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-44e4d062da50-record:end -->

#### 최소 코드 증거

<!-- learner:commit-44e4d062da50-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-44e4d062da50-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-44e4d062da50-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-44e4d062da50-execution:end -->

## 6. Invariant ledger

<!-- learner:thread-ledger:start -->
| Invariant | 도입·변경 commit | 실제 code/test evidence | 부족함이 드러난 지점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| 가용성·외부 속성 중앙화 | ba8da56d3fcf |  |  |  |
| 내부/외부 transport 일원화 | f63c978c71c9 |  |  |  |
| 배치 기반 노출 | daa6815a6dfa → 119ff9a92090 |  |  |  |
| 결정적 회귀 보호 | 09cec616f314 |  |  |  |
| 표현 중복 제거 | 44e4d062da50 |  |  |  |
<!-- learner:thread-ledger:end -->

## 7. Failure → Fix → Test 관계

<!-- learner:thread-relations:start -->
| Failure/위험 | 실제 영향·root cause | Fix/결정 | Regression evidence 또는 공백 |
| --- | --- | --- | --- |
| Hard-coded type selection |  |  |  |
| Internal/external rendering duplication 위험 |  |  |  |
| Detail/card markup duplication |  |  |  |
<!-- learner:thread-relations:end -->

## 8. Ownership·state·responsibility 변화

<!-- learner:thread-ownership:start -->
| 단계 | Owner | 책임 변화 |
| --- | --- | --- |
| 초기 |  |  |
| ba8/f63 |  |  |
| daa/119/2d/ee |  |  |
| 44e4 최종 |  |  |
<!-- learner:thread-ownership:end -->

## 9. 최종 Thread 상태

<!-- learner:thread-final-state:start -->
- 최종 owner와 data/state/DOM boundary를 설명합니다.
- 최종 guarantee와 명시적으로 남은 non-guarantee를 설명합니다.
- 관련 후속 fix/test가 다른 category에 있으면 경계를 기록합니다.
<!-- learner:thread-final-state:end -->

## 10. 최종 실행 흐름

<!-- learner:thread-flow:start -->
1. 입력/content/state가 어디서 오는지 기록합니다.
2. Selector/helper/component/CSS owner를 실제 call order로 기록합니다.
3. Absence/failure/fallback/cleanup branch를 flow 안에 포함합니다.
4. Code 없이도 최종 흐름을 설명할 수 있게 작성합니다.
<!-- learner:thread-flow:end -->

## 11. 학습 완료 확인

<!-- learner:thread-checklist:start -->
- [ ] 모든 commit을 exact SHA diff와 resulting file 기준으로 기록했습니다.
- [ ] SHA, subject, order, importance, tags와 Thread 역할을 바꾸지 않았습니다.
- [ ] Previous state, owner, absence/failure, guarantee/non-guarantee와 later relation을 채웠습니다.
- [ ] S/A-level과 B-level 깊이를 구분했습니다.
- [ ] 실행 상태를 사실대로 기록했습니다.
- [ ] 빈 learner-facing section을 남기지 않았습니다.
<!-- learner:thread-checklist:end -->
