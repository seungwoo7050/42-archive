# Thread: Technology stack icon, list, and marquee

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

simple-icons mapping과 handcrafted fallback, ID 기반 stack list, duplicated-track marquee, hover pause와 reduced-motion fallback을 순서대로 복원합니다.

**경계:** 이 Thread는 stack visual primitives를 다룹니다. Tech stack content schema와 `resolveTechStackItem`의 validation/fallback source, home section 전체 composition은 다른 Thread가 소유합니다.

### 고정 invariant

- Known brand icon은 typed map을 사용하고 map에 없는 supported semantic icon은 local SVG fallback을 사용합니다.
- StackList는 content ID order를 보존하고 optional limit은 앞에서부터 slice합니다.
- Marquee는 assistive technology에 동일 항목을 두 번 노출하지 않습니다.
- Continuous motion은 hover에서 pause하고 reduced-motion에서 중단됩니다.

## 2. 핵심 질문

- Partial Record를 사용한 이유와 map miss가 runtime에서 어떤 branch로 이어지는가?
- FallbackIcon의 named branches와 final generic circle이 어떤 unsupported state를 표현하는가?
- StackList가 ID를 resolver로 넘기고 color CSS variable을 만드는 responsibility chain은 무엇인가?
- Marquee가 track을 복제하면서 key와 aria-hidden을 어떻게 다르게 만드는가?
- 빈 items, 18개 초과 items, hover/reduced-motion에서 실제 contract는 무엇인가?

## 3. 완료 기준

- 각 SHA의 parent diff와 resulting tree를 구분해 실제 file/symbol/call path를 기록합니다.
- Previous state, owner, state transition, absence/failure branch, guarantee/non-guarantee를 commit별로 분리합니다.
- Fix와 test는 실제로 수정·검증하는 production path에 연결합니다.
- 실행하지 않은 command 결과를 만들지 않습니다.
- 이 Thread는 B-level commit만 포함하므로 각 commit의 concrete role, boundary, failure/non-guarantee를 필요한 범위로 기록합니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Thread 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `ebc245105c03` | feat(stack): 기술 스택 아이콘 매핑 추가 | B | RENDERER | brand icon map 도입 |
| 2 | `3d9b847d8094` | feat(stack): 기술 스택 폴백 아이콘 추가 | B | RENDERER | icon renderer와 fallback |
| 3 | `6aa8ee3b90b1` | feat(stack): 공용 기술 스택 목록 추가 | B | RENDERER | ID 기반 chip list |
| 4 | `48559efebf68` | feat(stack): 기술 스택 마키 프리미티브 추가 | B | RENDERER | 복제 track 구조 |
| 5 | `3b9c1a636356` | style(stack): 기술 스택 마키 동작 추가 | B | RENDERER | continuous motion과 fallback |

## 5. Commit별 학습 기록

### 1. `ebc245105c03` — feat(stack): 기술 스택 아이콘 매핑 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** brand icon map 도입

#### 해당 SHA에서 확인할 실제 코드

- 새 `src/components/portfolio/tech-icon.tsx`의 simple-icons imports와 `Partial<Record<TechStackIcon, SimpleIcon>>`을 확인합니다.
- Union 전체를 강제하지 않는 partial map이 후속 fallback 필요성을 어떻게 남기는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-ebc245105c03-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-ebc245105c03-record:end -->

#### 최소 코드 증거

<!-- learner:commit-ebc245105c03-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-ebc245105c03-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-ebc245105c03-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-ebc245105c03-execution:end -->

### 2. `3d9b847d8094` — feat(stack): 기술 스택 폴백 아이콘 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** icon renderer와 fallback

#### 해당 SHA에서 확인할 실제 코드

- `TechIcon`의 simpleIcon truthy branch와 fallback SVG branch를 확인합니다.
- `FallbackIcon`의 terminal/shield/check/database/flow/box/api/json/default branches를 inventory합니다.
- `aria-hidden`과 color/currentColor 사용을 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-3d9b847d8094-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-3d9b847d8094-record:end -->

#### 최소 코드 증거

<!-- learner:commit-3d9b847d8094-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-3d9b847d8094-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-3d9b847d8094-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-3d9b847d8094-execution:end -->

### 3. `6aa8ee3b90b1` — feat(stack): 공용 기술 스택 목록 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** ID 기반 chip list

#### 해당 SHA에서 확인할 실제 코드

- `StackList`의 optional limit branch와 `resolveTechStackItem(item)` call을 확인합니다.
- key가 raw ID인지, CSS variable color와 TechIcon/label이 어떻게 연결되는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-6aa8ee3b90b1-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-6aa8ee3b90b1-record:end -->

#### 최소 코드 증거

<!-- learner:commit-6aa8ee3b90b1-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-6aa8ee3b90b1-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-6aa8ee3b90b1-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-6aa8ee3b90b1-execution:end -->

### 4. `48559efebf68` — feat(stack): 기술 스택 마키 프리미티브 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** 복제 track 구조

#### 해당 SHA에서 확인할 실제 코드

- `TechMarquee`의 `slice(0, 18)`과 두 `TechMarqueeTrack` call을 확인합니다.
- 두 번째 track의 `aria-hidden`과 live/ghost key prefix를 확인합니다.
- Outer aria-label, inner list semantics와 empty input behavior를 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-48559efebf68-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-48559efebf68-record:end -->

#### 최소 코드 증거

<!-- learner:commit-48559efebf68-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-48559efebf68-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-48559efebf68-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-48559efebf68-execution:end -->

### 5. `3b9c1a636356` — style(stack): 기술 스택 마키 동작 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** continuous motion과 fallback

#### 해당 SHA에서 확인할 실제 코드

- `.stack-marquee-viewport`, 두 track의 width/gap, `stack-scroll` transform을 확인합니다.
- Hover pause selector와 reduced-motion `animation: none`을 확인합니다.
- Mask/overflow가 content clipping과 visual fade를 어떻게 만드는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-3b9c1a636356-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-3b9c1a636356-record:end -->

#### 최소 코드 증거

<!-- learner:commit-3b9c1a636356-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-3b9c1a636356-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-3b9c1a636356-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-3b9c1a636356-execution:end -->

## 6. Invariant ledger

<!-- learner:thread-ledger:start -->
| Invariant | 도입·변경 commit | 실제 code/test evidence | 부족함이 드러난 지점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| Known brand icon | ebc245105c03 |  |  |  |
| Map miss fallback | 3d9b847d8094 |  |  |  |
| Ordered stack chips | 6aa8ee3b90b1 |  |  |  |
| Duplicate track semantics | 48559efebf68 |  |  |  |
| Motion fallback | 3b9c1a636356 |  |  |  |
<!-- learner:thread-ledger:end -->

## 7. Failure → Fix → Test 관계

<!-- learner:thread-relations:start -->
| Failure/위험 | 실제 영향·root cause | Fix/결정 | Regression evidence 또는 공백 |
| --- | --- | --- | --- |
| Partial brand map |  |  |  |
| Seamless loop를 위한 duplicate DOM |  |  |  |
| Continuous marquee |  |  |  |
<!-- learner:thread-relations:end -->

## 8. Ownership·state·responsibility 변화

<!-- learner:thread-ownership:start -->
| 단계 | Owner | 책임 변화 |
| --- | --- | --- |
| Content/types |  |  |
| TechIcon |  |  |
| StackList |  |  |
| TechMarquee |  |  |
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
