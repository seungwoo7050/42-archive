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
| 직전 상태와 부족함 | Classic home에 data-driven terminal preview와 timer lifecycle이 없었습니다. |
| 실제 변경 file/symbol/call path | `AnimatedTerminal`을 client component로 추가했습니다. `formatTerminalLine`은 `{handle}`, `{role}`, `{location}`, `{projectCount}`, `{stackCount}`를 `replaceAll`로 치환하고 unknown token은 그대로 둡니다. 그 결과 배열 위에 index/typed text/phase state를 두며, effect는 typing 42ms, completed typing 후 520ms, hold 1700ms, erase 24ms, 다음 command 전 220ms timeout을 사용하고 cleanup에서 clear합니다. |
| Data/state/DOM/resource owner | Component가 formatted commands, state, timeout handle을 소유합니다. Content가 command/output template을, browser timer가 scheduling을 소유합니다. |
| Failure·absence·fallback 처리 | Reduced-motion match이면 effect가 timeout을 만들지 않습니다. Cleanup은 dependency change/unmount에서 pending timeout을 해제합니다. 그러나 empty commands를 막는 guard가 없어 `activeCommand.command` access와 modulo length가 non-empty input을 전제로 합니다. |
| 보장하는 것과 보장하지 않는 것 | 정상 non-empty input에서 순환 typing state와 timer cleanup을 보장합니다. Exact wall-clock timing, background-tab throttling, empty schema recovery는 보장하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | 1ff1da788f7a·335a00fcf40c가 visual frame/output motion을 추가하고 cdb68fdf59f9가 real content consumer를 연결합니다. |
<!-- learner:commit-f60d46857715-record:end -->

#### 최소 코드 증거

<!-- learner:commit-f60d46857715-excerpt:start -->
- **Commit:** `f60d46857715`
- **Path:** `src/components/portfolio/animated-terminal.tsx`
- **Location:** `AnimatedTerminal effect`

```tsx
if (phase === "erase") {
  if (typedCommand.length > 0) {
    timeout = setTimeout(() => {
      setTypedCommand(activeCommand.command.slice(0, typedCommand.length - 1));
    }, 24);
  } else {
    timeout = setTimeout(() => {
      setCommandIndex((current) => (current + 1) % commands.length);
      setPhase("typing");
    }, 220);
  }
}

return () => clearTimeout(timeout);
```

이 발췌는 해당 SHA의 decision/state/ownership을 보여 주는 최소 부분입니다. 후속 commit의 코드는 섞지 않았습니다.
<!-- learner:commit-f60d46857715-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-f60d46857715-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
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
| 직전 상태와 부족함 | State machine은 text DOM만 제공했고 terminal frame, titlebar, sheen, floating decoration이 없었습니다. |
| 실제 변경 file/symbol/call path | Terminal wrapper/frame/titlebar/body CSS와 pseudo-element decoration, sheen keyframes를 추가했습니다. Decorative layers는 pointer-events none입니다. |
| Data/state/DOM/resource owner | CSS가 visual lifetime과 stacking을 소유하고 component state에는 변화가 없습니다. |
| Failure·absence·fallback 처리 | Reduced-motion에서 terminal window sheen은 끄지만 이 commit 시점의 selector가 모든 wrapper animation을 포함하는지는 제한적입니다. 후속 global policy가 보강합니다. |
| 보장하는 것과 보장하지 않는 것 | Terminal chrome과 decoration을 제공하지만 typing state correctness나 accessibility semantics를 바꾸지 않습니다. |
| 다음 commit 또는 관련 test 연결 | 335a00fcf40c가 output/caret motion을 추가하고 af9191fc15ad가 더 넓은 reduced-motion policy를 적용합니다. |
<!-- learner:commit-1ff1da788f7a-record:end -->

#### 최소 코드 증거

<!-- learner:commit-1ff1da788f7a-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-1ff1da788f7a-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-1ff1da788f7a-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
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
| 직전 상태와 부족함 | Terminal frame은 있었지만 long line wrapping, output entry effect와 caret indicator가 없었습니다. |
| 실제 변경 file/symbol/call path | Anywhere wrapping, output marker/entry animation, blinking caret와 관련 keyframes를 추가했습니다. |
| Data/state/DOM/resource owner | CSS가 transient visual effect를 소유하고 React state는 typed text/output visibility만 소유합니다. |
| Failure·absence·fallback 처리 | Reduced-motion에서 output과 caret animation을 none으로 둡니다. Caret는 aria-hidden이라 assistive text에 포함되지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | Long terminal line의 overflow risk를 줄이고 visual feedback을 제공합니다. Screen-reader live announcement나 typing narration은 제공하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | cdb68fdf59f9가 terminal component를 Classic hero에 배치합니다. |
<!-- learner:commit-335a00fcf40c-record:end -->

#### 최소 코드 증거

<!-- learner:commit-335a00fcf40c-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-335a00fcf40c-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-335a00fcf40c-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
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
| 직전 상태와 부족함 | Terminal primitive와 CSS는 있었지만 실제 Classic home content/data counts를 전달하는 route consumer가 없었습니다. |
| 실제 변경 file/symbol/call path | Classic hero가 AnimatedTerminal에 profile, project count, stack count, presentation terminal object를 전달하고 terminal wrapper에 배치합니다. |
| Data/state/DOM/resource owner | Route가 content aggregation과 placement를, terminal component가 formatting/state를 소유합니다. |
| Failure·absence·fallback 처리 | Route는 commands empty를 별도 검사하지 않습니다. Content contract가 valid/non-empty terminal data를 제공해야 합니다. |
| 보장하는 것과 보장하지 않는 것 | 실제 portfolio data를 terminal state machine에 연결합니다. 다른 design template에서의 사용이나 schema validation은 보장하지 않습니다. |
| 다음 commit 또는 관련 test 연결 | 이 commit으로 content → formatting → state machine → CSS frame의 실행 경로가 완성됩니다. |
<!-- learner:commit-cdb68fdf59f9-record:end -->

#### 최소 코드 증거

<!-- learner:commit-cdb68fdf59f9-excerpt:start -->
별도 코드 발췌는 싣지 않았습니다. 위 기록에서 exact SHA의 변경 path와 symbol을 특정했으며, 직선적인 markup/CSS 추가를 반복 인용해 source dump로 만드는 것을 피했습니다.
<!-- learner:commit-cdb68fdf59f9-excerpt:end -->

#### 실행·테스트 증거

<!-- learner:commit-cdb68fdf59f9-execution:start -->
- **정적 검토:** `web/portfolio` 전용 commit classification과 해당 exact SHA의 commit diff/changed-file view를 대조했습니다.
- **실행:** 하지 않았습니다. 작업 환경에서 `github.com` DNS 해석이 실패해 실행 가능한 checkout을 만들 수 없었고, GitHub connector는 source/diff inspection만 제공했습니다. 따라서 command, pass/fail, timing, browser 결과를 주장하지 않습니다.
<!-- learner:commit-cdb68fdf59f9-execution:end -->

## 6. Invariant ledger

<!-- learner:thread-ledger:start -->
| Invariant | 도입·변경 commit | 실제 code/test evidence | 부족함이 드러난 지점 | 최종 보장 범위 |
| --- | --- | --- | --- | --- |
| Non-empty cyclic command state | f60d46857715 | phase별 timeout과 modulo index | empty commands guard 없음 | valid content에서 typing/hold/erase 반복 |
| Timer cleanup | f60d46857715 | effect cleanup clearTimeout | browser throttling은 제어하지 않음 | dependency change/unmount 시 pending timer 해제 |
| Reduced-motion readable initial state | f60d46857715 + CSS commits | matchMedia early return, animation none | 실제 OS/browser matrix 미실행 | 첫 full command/output 유지, visual animation 중단 |
| Real data integration | cdb68fdf59f9 | ClassicHeroSection props | schema validation은 외부 | profile/count/terminal content를 실제 consumer가 전달 |
<!-- learner:thread-ledger:end -->

## 7. Failure → Fix → Test 관계

<!-- learner:thread-relations:start -->
| Failure/위험 | 실제 영향·root cause | Fix/결정 | Regression evidence 또는 공백 |
| --- | --- | --- | --- |
| Timer effect가 cleanup되지 않을 위험 | unmount 후 state update 또는 중복 timer | f60d46857715 cleanup에서 clearTimeout | Dedicated fake-timer test는 frozen Thread에 없음 |
| Motion preference 무시 위험 | typing/CSS animation 지속 | effect early return + CSS animation none | 정적 branch 확인; browser preference test 없음 |
| Empty command input | activeCommand undefined 및 modulo zero 위험 | 이 Thread에서 fix 없음 | Content validation이 전제이며 regression test 없음 |
<!-- learner:thread-relations:end -->

## 8. Ownership·state·responsibility 변화

<!-- learner:thread-ownership:start -->
| 단계 | Owner | 책임 변화 |
| --- | --- | --- |
| Content | Terminal command/output templates | presentation data |
| Route | profile·projectCount·stackCount 전달과 placement | ClassicHeroSection |
| AnimatedTerminal | formatted command array, phase/index/text state, timeout cleanup | client component |
| CSS | frame, sheen, output, caret, reduced-motion visual fallback | globals.css |
<!-- learner:thread-ownership:end -->

## 9. 최종 Thread 상태

<!-- learner:thread-final-state:start -->
- Classic hero가 content-driven terminal preview를 렌더링합니다.
- State machine은 typing → hold → erase → next command를 반복하고 pending timeout을 cleanup합니다.
- Reduced-motion이면 timer progression을 시작하지 않고 CSS animations도 중단됩니다.
- Formatting은 정해진 placeholder만 replaceAll하며 unknown token은 그대로 남습니다.
- Commands empty recovery와 dedicated timer/browser test는 없습니다.
<!-- learner:thread-final-state:end -->

## 10. 최종 실행 흐름

<!-- learner:thread-flow:start -->
1. ClassicHeroSection이 profile/counts/terminal content를 AnimatedTerminal에 전달합니다.
2. useMemo가 각 output line의 known placeholder를 실제 값으로 치환합니다.
3. State가 active command와 phase를 선택합니다.
4. Effect가 motion preference를 확인하고 phase에 맞는 단일 timeout을 예약합니다.
5. Render는 typed command와 조건부 output을 terminal DOM에 놓고 CSS가 frame/motion을 표현합니다.
6. Effect rerun 또는 unmount 시 pending timeout을 clear합니다.
<!-- learner:thread-flow:end -->

## 11. 학습 완료 확인

<!-- learner:thread-checklist:start -->
- [x] 모든 commit을 exact SHA diff와 resulting file 기준으로 기록했습니다.
- [x] SHA, subject, order, importance, tags와 Thread 역할을 frozen scaffold와 동일하게 유지했습니다.
- [x] Previous state, owner, absence/failure, guarantee/non-guarantee와 later relation을 채웠습니다.
- [x] 이 Thread에는 S/A-level commit이 없으며 B-level 범위에서 repository-specific depth를 유지했습니다.
- [x] 실행 상태를 사실대로 기록했습니다: runtime command는 실행하지 않았고 정적 검토와 구분했습니다.
- [x] 빈 learner-facing answer cell을 남기지 않았습니다.
<!-- learner:thread-checklist:end -->
