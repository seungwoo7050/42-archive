# Thread: Journey timeline primitives and responsive layout

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

Journey item의 period formatting과 optional case-study link, compact/paired variants, odd-row handling, desktop centerline과 mobile single-column collapse를 실제 history로 복원합니다.

**경계:** 이 Thread는 journey presentation primitive와 responsive CSS를 다룹니다. Journey JSON schema/validation, route section copy, Reveal의 최종 server-first refactor는 각각 content system과 03 Thread가 소유합니다.

### 고정 invariant

- Journey source order는 유지되고 첫 item만 paired timeline의 start card로 분리됩니다.
- 나머지 items는 두 개씩 묶이며 마지막 홀수 item은 단독 row로 손실 없이 렌더링됩니다.
- projectId가 있는 item만 template/debug-aware case-study link를 가집니다.
- Mobile은 같은 semantic ordered list를 단일 column으로 재배치하며 item order를 바꾸지 않습니다.
- Animated flag는 wrapper 선택만 바꾸고 journey data semantics는 바꾸지 않습니다.

## 2. 핵심 질문

- `formatYearMonth`가 ISO date를 검증하지 않고 어떤 substring transform만 수행하는가?
- 첫 item과 projectItems 분리, `chunkPairs`, `is-single` class가 empty/one/even/odd input을 어떻게 처리하는가?
- Compact와 paired variants에서 Reveal wrapper 위치와 delay 계산은 어떻게 다른가?
- Desktop centerline의 three-column grid가 mobile에서 같은 DOM을 어떻게 flatten하는가?
- 03 Thread의 server-first Reveal 전환이 animated flag의 최종 의미를 어떻게 약화시키는가?

## 3. 완료 기준

- 각 SHA의 parent diff와 resulting tree를 구분해 실제 file/symbol/call path를 기록합니다.
- Previous state, owner, state transition, absence/failure branch, guarantee/non-guarantee를 commit별로 분리합니다.
- Fix와 test는 실제로 수정·검증하는 production path에 연결합니다.
- 실행하지 않은 command 결과를 만들지 않습니다.
- 이 Thread는 B-level commit만 포함하므로 각 commit의 concrete role, boundary, failure/non-guarantee를 필요한 범위로 기록합니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Thread 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `f60edf14dae0` | feat(journey): 여정 날짜와 카드 프리미티브 추가 | B | RENDERER | entry/card 기반 도입 |
| 2 | `3c0a1154ba08` | feat(journey): 중앙선 여정 목록 추가 | B | RENDERER | paired timeline composition |
| 3 | `b3182e35aed0` | feat(journey): 여정 목록 변형 연결 | B | RENDERER | public variant dispatcher |
| 4 | `377fa128f82b` | style(journey): 여정 타임라인 시각 계층 추가 | B | RENDERER | compact guide/node 표현 |
| 5 | `7995a3cf5435` | style(journey): 데스크톱 중앙선 여정 구성 | B | RENDERER | desktop centerline geometry |
| 6 | `6394188022fd` | style(journey): 모바일 중앙선 여정 구성 | B | RENDERER | mobile single-column collapse |

## 5. Commit별 학습 기록

### 1. `f60edf14dae0` — feat(journey): 여정 날짜와 카드 프리미티브 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** entry/card 기반 도입

#### 해당 SHA에서 확인할 실제 코드

- `journey-list.tsx`의 `formatYearMonth`, `getJourneyPeriod`, `JourneyEntry`, `JourneyCard`, `chunkPairs`를 확인합니다.
- endDate absence/equality, projectId absence, pair slicing의 boundary를 각각 추적합니다.
- `getTemplateHref`에 homeTemplate/contentDebug가 전달되는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-f60edf14dae0-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-f60edf14dae0-record:end -->

#### 최소 코드 증거

<!-- learner:commit-f60edf14dae0-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-f60edf14dae0-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-f60edf14dae0-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-f60edf14dae0-execution:end -->

### 2. `3c0a1154ba08` — feat(journey): 중앙선 여정 목록 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** paired timeline composition

#### 해당 SHA에서 확인할 실제 코드

- `PairedJourneyList`의 `[startItem, ...projectItems]`, `chunkPairs`, first-item branch를 확인합니다.
- Pair length 1 class, middle node, optional second card와 key 생성 방식을 확인합니다.
- animated true/false에서 element type과 delay가 어떻게 달라지는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-3c0a1154ba08-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-3c0a1154ba08-record:end -->

#### 최소 코드 증거

<!-- learner:commit-3c0a1154ba08-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-3c0a1154ba08-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-3c0a1154ba08-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-3c0a1154ba08-execution:end -->

### 3. `b3182e35aed0` — feat(journey): 여정 목록 변형 연결

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** public variant dispatcher

#### 해당 SHA에서 확인할 실제 코드

- Exported `JourneyList`의 defaults와 paired-centerline early return을 확인합니다.
- Compact rows의 animated/plain branches와 outer Reveal wrapper 차이를 확인합니다.
- Index-based delay와 stable key가 source order에 어떻게 연결되는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-b3182e35aed0-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-b3182e35aed0-record:end -->

#### 최소 코드 증거

<!-- learner:commit-b3182e35aed0-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-b3182e35aed0-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-b3182e35aed0-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-b3182e35aed0-execution:end -->

### 4. `377fa128f82b` — style(journey): 여정 타임라인 시각 계층 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** compact guide/node 표현

#### 해당 SHA에서 확인할 실제 코드

- `.timeline-list` gutter/x variables, guide pseudo-element와 `.experience-row::before`를 확인합니다.
- `is-visible` class가 guide scaleY와 node opacity/scale를 어떻게 바꾸는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-377fa128f82b-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-377fa128f82b-record:end -->

#### 최소 코드 증거

<!-- learner:commit-377fa128f82b-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-377fa128f82b-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-377fa128f82b-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-377fa128f82b-execution:end -->

### 5. `7995a3cf5435` — style(journey): 데스크톱 중앙선 여정 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** desktop centerline geometry

#### 해당 SHA에서 확인할 실제 코드

- `.paired-timeline::before`, start marker/card, three-column row와 center node를 확인합니다.
- `.is-single` row가 one-column centered card로 바뀌고 node를 숨기는 rule을 확인합니다.
- Classic template의 card shadow override를 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-7995a3cf5435-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-7995a3cf5435-record:end -->

#### 최소 코드 증거

<!-- learner:commit-7995a3cf5435-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-7995a3cf5435-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-7995a3cf5435-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-7995a3cf5435-execution:end -->

### 6. `6394188022fd` — style(journey): 모바일 중앙선 여정 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** mobile single-column collapse

#### 해당 SHA에서 확인할 실제 코드

- max-width 767px media query에서 centerline x, list padding, start/row grid를 확인합니다.
- Desktop center node를 숨기고 각 card pseudo-node를 만드는 selector를 확인합니다.
- Card border/shadow/radius/text alignment가 mobile에서 어떻게 단순화되는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-6394188022fd-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-6394188022fd-record:end -->

#### 최소 코드 증거

<!-- learner:commit-6394188022fd-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-6394188022fd-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-6394188022fd-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-6394188022fd-execution:end -->

## 6. Invariant ledger

<!-- learner:thread-ledger:start -->
| Invariant | 도입·변경 commit | 실제 code/test evidence | 부족함이 드러난 지점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| Period formatting | f60edf14dae0 |  |  |  |
| Source order와 odd tail 보존 | 3c0a1154ba08 |  |  |  |
| Variant dispatch | b3182e35aed0 |  |  |  |
| Desktop centerline | 7995a3cf5435 |  |  |  |
| Mobile reflow | 6394188022fd |  |  |  |
<!-- learner:thread-ledger:end -->

## 7. Failure → Fix → Test 관계

<!-- learner:thread-relations:start -->
| Failure/위험 | 실제 영향·root cause | Fix/결정 | Regression evidence 또는 공백 |
| --- | --- | --- | --- |
| Odd number of project items |  |  |  |
| Desktop paired grid on mobile |  |  |  |
| Reveal is-visible coupling |  |  |  |
<!-- learner:thread-relations:end -->

## 8. Ownership·state·responsibility 변화

<!-- learner:thread-ownership:start -->
| 단계 | Owner | 책임 변화 |
| --- | --- | --- |
| Journey data |  |  |
| Helpers |  |  |
| JourneyList |  |  |
| PairedJourneyList |  |  |
| CSS |  |  |
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
- [ ] B-level commit의 concrete role과 non-guarantee를 필요한 범위로 기록했습니다.
- [ ] 실행 상태를 사실대로 기록했습니다.
- [ ] 빈 learner-facing section을 남기지 않았습니다.
<!-- learner:thread-checklist:end -->
