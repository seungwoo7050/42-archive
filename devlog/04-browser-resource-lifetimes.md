# 브라우저 상태와 타이머의 수명 경계

## 관련 커밋

- `abe4c95` — `fix(ui): hydration 중 native details 상태 보존`
- `629ce27` — `test(ui): details hydration 경쟁 조건 검증`
- `f3363f1` — `refactor(ui): 디자인 선택기를 server markup으로 전환`
- `726d8a2` — `test(ui): server 선택기와 focus 복원 검증`
- `343c467` — `refactor(ui): reveal 콘텐츠를 server에서 즉시 표시`
- `e84038b` — `test(perf): 사용자 상호작용 지연 측정 추가`

현재 저장소에서 직접 상태를 갖는 Client Component는 `AnimatedTerminal`과
`DesignSwitcherClose`뿐이다. 나머지 화면은 서버에서 바로 읽을 수 있는 마크업을
만들고, 애니메이션은 주로 CSS가 맡는다. 이 경계의 핵심은 효과를 많이 넣는 것이
아니라 상태와 브라우저 자원의 소유자를 분명히 하는 데 있다.

## 터미널 상태 머신과 타이머

`AnimatedTerminal`은 명령 입력 효과를 세 단계로 표현한다.

```ts
const [commandIndex, setCommandIndex] = useState(0);
const [typedCommand, setTypedCommand] = useState(commands[0]?.command ?? "");
const [phase, setPhase] = useState<"typing" | "hold" | "erase">("hold");
const activeCommand = commands[commandIndex];
```

여러 boolean 대신 `phase` 하나를 사용하므로 입력과 삭제가 동시에 진행되는 모순
상태를 만들지 않는다. effect는 현재 단계에 필요한 `setTimeout` 하나만 예약하고,
dependency가 바뀌거나 component가 사라질 때 같은 effect의 cleanup에서 취소한다.

```ts
if (phase === "hold") {
  timeout = setTimeout(() => setPhase("erase"), 1700);
}

return () => clearTimeout(timeout);
```

cleanup은 unmount 전용이 아니다. 입력 글자 수나 단계가 바뀌어 effect가 다시 실행될
때 이전 callback이 새 상태를 덮지 않게 하는 규칙이기도 하다. profile과 terminal
문구는 부모가 소유하고, component는 이를 `commands`라는 파생값으로만 사용한다.

`prefers-reduced-motion: reduce`가 활성화되면 effect는 타이머를 만들기 전에 끝난다.
초기 상태가 첫 명령 전체와 `hold`이므로 애니메이션을 멈춰도 명령과 출력은 읽을 수
있다. 전역 CSS도 caret, marquee, transition을 중단한다.

## 확인된 입력 계약 결함: 빈 명령 배열

타이머 정리는 올바르지만 입력 전제는 닫혀 있지 않다.
`presentation.home.classic.terminal.commands`의 Zod schema는 배열 원소의 모양만
검사하고 `.min(1)`을 요구하지 않는다. 따라서 빈 배열도 schema를 통과한다.

반면 `AnimatedTerminal`은 `activeCommand.command`와 `activeCommand.output`을 바로
읽는다. 명령이 없으면 `activeCommand`가 `undefined`이므로 Classic 홈이 예외로
실패한다. 다음 명령을 고르는 `% commands.length`도 유효한 index를 만들 수 없다.

현재 구현은 다음 두 정책 중 어느 것도 선택하지 않았다.

- schema에서 명령을 하나 이상 요구한다.
- consumer가 빈 terminal을 위한 별도 마크업을 제공한다.

현재 JSON에는 명령이 들어 있어 정상 경로에서는 드러나지 않는다. 빈 배열을 넣어
생산자 오류나 대체 UI를 확인하는 전용 회귀 테스트도 없다. devlog에서는 이 전제를
보장된 계약으로 표현하면 안 된다.

## 화면 진입 감지는 제거하고 콘텐츠는 즉시 표시한다

과거 `Reveal`은 `IntersectionObserver`와 local state로 화면 진입을 감지했다.
관찰 성공 시 `disconnect()`하고 unmount cleanup에서도 다시 끊어 자원 수명은 닫았지만,
observer callback 전에는 콘텐츠가 보이지 않는 문제가 남았다.

현재 `Reveal`은 다음과 같은 정적 wrapper다.

```tsx
<Component
  className={`reveal-item is-visible ${className}`}
  style={{ transitionDelay: `${delay}ms` }}
>
  {children}
</Component>
```

즉 현재 코드에는 Reveal용 observer나 client state가 없다. 과거 수명 관리 방식을
현재 동작처럼 설명해서는 안 된다.

marquee는 끊김 없는 시각 효과를 위해 같은 기술 목록을 두 번 그리되, 복제 track에
`aria-hidden`을 지정한다. 화면 복제는 유지하면서 접근성 트리의 의미 중복은 막는
구조다.

## `details` 상태는 브라우저가 소유한다

디자인 선택기와 모바일 메뉴는 native `<details>/<summary>`를 사용한다. `open`을
React boolean로 복제하지 않으며, 브라우저가 토글 상태를 관리한다. 닫기 버튼만 작은
Client Component로 남아 가장 가까운 `details`를 닫고 `summary`로 focus를 돌린다.

```ts
const details = event.currentTarget.closest("details");
const summary = details?.querySelector<HTMLElement>(":scope > summary");

details?.removeAttribute("open");
summary?.focus();
```

서버 마크업과 hydration 사이에 사용자가 먼저 `details`를 열 수 있는 문제는
[09. hydration 전 native 상태 보존](./09-details-hydration-race.md)에서 별도로
다룬다.

## 검증 범위

현재 테스트는 디자인 선택기 닫기와 focus 복원, 일부 클릭의 Event Timing을
확인한다. renderer 행렬은 터미널이 포함된 정상 HTML을 만들 수 있는지도 확인한다.
다만 다음 동작은 전용 테스트가 없다.

- `hold → erase → 다음 command` 전체 전이
- dependency 변경 뒤 이전 timeout 취소
- reduced motion에서 타이머가 생성되지 않는지 여부
- 빈 `commands`의 실패 정책

따라서 코드 구조로 확인한 cleanup 규칙과 실제 타이머 전이를 자동 검증했다는 주장은
구분해야 한다.
