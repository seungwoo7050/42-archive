# Thread: Terminal state machine and motion fallback

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

AnimatedTerminal의 placeholder formatting, typing/hold/erase timer state machine, cleanup, terminal CSS와 reduced-motion behavior, Classic hero integration을 복원합니다.

**경계:** 이 Thread는 terminal preview primitive의 state와 표현을 다룹니다. Terminal content schema validation, home route 전체 section architecture, general motion policy는 각각 다른 Thread의 책임입니다.

### 고정 invariant

- Terminal command output은 profile/project/stack dependency가 바뀔 때 파생되고 state machine은 그 결과 배열을 순환합니다.
- Effect 실행마다 최대 한 timeout을 소유하며 dependency 변화·unmount에서 clear합니다.
- Reduced-motion에서는 timer progression을 시작하지 않고 읽을 수 있는 초기 command/output을 유지합니다.
- CSS animation은 reduced-motion에서 비활성화됩니다.
- Consumer는 terminal commands가 비어 있지 않다는 전제를 제공합니다.

## 2. 핵심 질문

- formatTerminalLine이 어떤 placeholder만 치환하며 unknown placeholder는 어떻게 되는가?
- 초기 commandIndex/typedCommand/phase가 reduced-motion early return과 결합해 무엇을 표시하는가?
- typing/hold/erase 각 branch의 timeout과 다음 state, cleanup은 무엇인가?
- CSS frame/sheen/output/caret animation이 어느 commit에 나뉘어 추가되는가?
- 빈 commands 배열에 대한 guard가 실제로 존재하는가?

## 3. 완료 기준

- 각 SHA의 parent diff와 resulting tree를 구분해 실제 file/symbol/call path를 기록합니다.
- Previous state, owner, state transition, absence/failure branch, guarantee/non-guarantee를 commit별로 분리합니다.
- Fix와 test는 실제로 수정·검증하는 production path에 연결합니다.
- 실행하지 않은 command 결과를 만들지 않습니다.
- 이 Thread는 B-level commit만 포함하므로 각 commit의 concrete role, boundary, failure/non-guarantee를 필요한 범위로 기록합니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Thread 역할 |
| --- | --- | --- | --- | --- | --- |
| 1 | `f60d46857715` | feat(home): 애니메이션 터미널 상호작용 추가 | B | RENDERER | timer state machine 도입 |
| 2 | `1ff1da788f7a` | style(home): 터미널 프레임과 부유 장식 추가 | B | RENDERER | frame/sheen 표현 |
| 3 | `335a00fcf40c` | style(home): 터미널 출력과 커서 동작 추가 | B | RENDERER | output/caret motion |
| 4 | `cdb68fdf59f9` | feat(home): 클래식 홈 히어로 구성 | B | RENDERER | Classic hero integration |

## 5. Commit별 학습 기록

### 1. `f60d46857715` — feat(home): 애니메이션 터미널 상호작용 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** timer state machine 도입

#### 해당 SHA에서 확인할 실제 코드

- `formatTerminalLine`의 replacement key와 `useMemo` dependency를 확인합니다.
- `commandIndex`, `typedCommand`, `phase` 초기값과 `activeCommand` access를 확인합니다.
- typing/hold/erase branch별 delay와 state update, modulo progression, cleanup을 표로 재구성합니다.
- `matchMedia(prefers-reduced-motion)` early return에서 initial DOM이 무엇인지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-f60d46857715-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-f60d46857715-record:end -->

#### 최소 코드 증거

<!-- learner:commit-f60d46857715-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-f60d46857715-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-f60d46857715-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-f60d46857715-execution:end -->

### 2. `1ff1da788f7a` — style(home): 터미널 프레임과 부유 장식 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** frame/sheen 표현

#### 해당 SHA에서 확인할 실제 코드

- globals.css의 `.hero-terminal-wrap`, `.terminal-window`, titlebar/body와 `terminal-sheen` keyframes를 확인합니다.
- decorative pseudo-elements의 pointer-events와 reduced-motion selector가 어떤 animation을 끄는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-1ff1da788f7a-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-1ff1da788f7a-record:end -->

#### 최소 코드 증거

<!-- learner:commit-1ff1da788f7a-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-1ff1da788f7a-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-1ff1da788f7a-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-1ff1da788f7a-execution:end -->

### 3. `335a00fcf40c` — style(home): 터미널 출력과 커서 동작 추가

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** output/caret motion

#### 해당 SHA에서 확인할 실제 코드

- `.terminal-line`, `.terminal-output`, pseudo marker, `.terminal-caret`와 keyframes를 확인합니다.
- Reduced-motion selector가 output/caret animation을 모두 끄는지 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-335a00fcf40c-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-335a00fcf40c-record:end -->

#### 최소 코드 증거

<!-- learner:commit-335a00fcf40c-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-335a00fcf40c-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-335a00fcf40c-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-335a00fcf40c-execution:end -->

### 4. `cdb68fdf59f9` — feat(home): 클래식 홈 히어로 구성

- **Importance:** B
- **Tags:** RENDERER
- **Thread 역할:** Classic hero integration

#### 해당 SHA에서 확인할 실제 코드

- `src/designs/classic/home-route.tsx`의 `ClassicHeroSection`에서 AnimatedTerminal props를 추적합니다.
- profile, projects.length, techStack.length와 presentation terminal content가 formatting input으로 전달되는지 확인합니다.
- ContentHint path와 terminal placement wrapper를 확인합니다.
- 먼저 parent diff와 해당 SHA의 resulting tree를 구분합니다.
- Final HEAD의 helper·file layout·behavior를 이 SHA에 소급하지 않습니다.

#### 학습 기록

<!-- learner:commit-cdb68fdf59f9-record:start -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner |  |
| Failure·absence·fallback 처리 |  |
| 보장하는 것과 보장하지 않는 것 |  |
| 다음 commit 또는 관련 test 연결 |  |
<!-- learner:commit-cdb68fdf59f9-record:end -->

#### 최소 코드 증거

<!-- learner:commit-cdb68fdf59f9-excerpt:start -->
- 변경 전 대응 코드의 path/symbol과 기존 가정을 기록합니다.
- 해당 SHA의 decision, state transition, ownership 또는 failure branch를 직접 보여 주는 최소 부분만 삽입합니다.
- 후속 SHA의 코드를 이 section에 넣지 않습니다.
<!-- learner:commit-cdb68fdf59f9-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-cdb68fdf59f9-execution:start -->
- 실행했다면 exact SHA, command, environment와 실제 result를 기록합니다.
- 실행하지 못했다면 정적 검토와 외부 제한을 구분하고 결과를 추정하지 않습니다.
<!-- learner:commit-cdb68fdf59f9-execution:end -->

## 6. Invariant ledger

<!-- learner:thread-ledger:start -->
| Invariant | 도입·변경 commit | 실제 code/test evidence | 부족함이 드러난 지점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| Non-empty cyclic command state | f60d46857715 |  |  |  |
| Timer cleanup | f60d46857715 |  |  |  |
| Reduced-motion readable initial state | f60d46857715 + CSS commits |  |  |  |
| Real data integration | cdb68fdf59f9 |  |  |  |
<!-- learner:thread-ledger:end -->

## 7. Failure → Fix → Test 관계

<!-- learner:thread-relations:start -->
| Failure/위험 | 실제 영향·root cause | Fix/결정 | Regression evidence 또는 공백 |
| --- | --- | --- | --- |
| Timer effect가 cleanup되지 않을 위험 |  |  |  |
| Motion preference 무시 위험 |  |  |  |
| Empty command input |  |  |  |
<!-- learner:thread-relations:end -->

## 8. Ownership·state·responsibility 변화

<!-- learner:thread-ownership:start -->
| 단계 | Owner | 책임 변화 |
| --- | --- | --- |
| Content |  |  |
| Route |  |  |
| AnimatedTerminal |  |  |
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
