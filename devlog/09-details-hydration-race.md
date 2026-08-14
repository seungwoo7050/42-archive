# hydration 전에 바뀐 `details` 상태 보존하기

## 관련 커밋

- `abe4c95` — `fix(ui): hydration 중 native details 상태 보존`
- `629ce27` — `test(ui): details hydration 경쟁 조건 검증`
- `f3363f1` — `refactor(ui): 디자인 선택기를 server markup으로 전환`
- `726d8a2` — `test(ui): server 선택기와 focus 복원 검증`

디자인 선택기는 `<details>/<summary>`의 native 동작을 사용한다. 서버 HTML이 도착한
뒤 React가 연결되기 전에도 사용자는 summary를 눌러 메뉴를 열 수 있다. 이때 서버가
만든 닫힌 상태를 기준으로 hydration하면 먼저 열린 `open` 상태를 잃거나 mismatch
경고가 생길 수 있다.

## 재현해야 하는 세 시점

일반 component render는 정적 HTML 구간을 건너뛰므로 이 경쟁 조건을 만들지 못한다.
전용 테스트는 순서를 명시한다.

1. `renderToString()`으로 서버 마크업을 만든다.
2. hydration 전에 `details.open = true`로 native 상태를 바꾼다.
3. 같은 tree를 `hydrateRoot()`로 연결한다.

```tsx
const container = document.createElement("div");
container.innerHTML = renderToString(switcher);
document.body.append(container);

const details = container.querySelector("details");
if (!details) throw new Error("DesignSwitcher must render a details element.");

details.open = true;
root = hydrateRoot(container, switcher);
```

테스트는 hydration 뒤에도 `open`이 남는지 확인하고, `console.error`에서 hydration
관련 문구를 골라 빈 배열인지 검사한다.

## 예외는 `details` 한 요소에만 둔다

현재 `DesignSwitcher`는 다음처럼 해당 요소에만 `suppressHydrationWarning`을 둔다.

```tsx
<details className={styles.root} suppressHydrationWarning>
  <summary aria-label={/* 현재 디자인 label */}>
    {/* count와 label */}
  </summary>
  <nav aria-label={ui.designNavigationAriaLabel}>
    {/* design links */}
  </nav>
</details>
```

여기서 `open`은 콘텐츠 원본이 아니라 사용자가 바꿀 수 있는 순간 UI 상태다. 반면
label, link URL, active design과 route ID는 서버와 client가 같은 입력에서 계산해야
한다. 이 예외를 page root나 선택기 하위 전체로 넓히면 실제 데이터 불일치를 숨길 수
있다.

`suppressHydrationWarning`이 임의의 하위 tree를 동기화하거나 모든 mismatch를
복구하는 기능도 아니다. 적용 대상은 hydration 전에 native하게 바뀔 수 있는
`details` 속성으로 한정한다.

## `open`을 React state로 복제하지 않는다

선택기 전체는 Server Component이고 `useState`나 `useRef`를 사용하지 않는다.
`open`을 controlled prop으로 만들면 서버 초기값, hydration 전 사용자 변경, React
state 중 어느 값을 우선할지 새 동기화 규칙이 필요하다. 현재 구현은 토글 상태를
브라우저에 맡긴다.

닫기 동작만 `DesignSwitcherClose`라는 작은 Client Component에 둔다.

```ts
const details = event.currentTarget.closest("details");
const summary = details?.querySelector<HTMLElement>(":scope > summary");

details?.removeAttribute("open");
summary?.focus();
```

메뉴를 닫은 뒤 focus를 summary로 복원하므로 keyboard 사용자가 문맥을 잃지 않는다.
별도 component test가 link의 `view`·`debug` 보존, 닫힘과 focus 복원을 확인한다.

## 검증의 한계

현재 회귀 테스트는 문제의 순서를 잘 분리하지만 실제 브라우저 경쟁 전체를 재현하지는
않는다.

- jsdom은 브라우저 HTML parser와 hydration scheduling을 그대로 구현하지 않는다.
- `details.open = true`는 결과 상태만 만들며 실제 pointer event와 bundle load의
  타이밍 경합은 만들지 않는다.
- hydration 전에 찾은 DOM node가 교체되지 않았는지는 별도 assertion이 없다.
- 지정한 `console.error` 문구만 수집하므로 React message가 바뀌거나
  `console.warn`을 사용하면 놓칠 수 있다.
- E2E는 hydration이 끝난 뒤 선택기를 조작한다.

따라서 현재 테스트가 직접 보장하는 범위는 “서버 문자열에서 먼저 열린 해당
`details`가 jsdom hydration 뒤에도 열려 있고, 알려진 hydration 오류 문구가 나오지
않는다”까지다.
