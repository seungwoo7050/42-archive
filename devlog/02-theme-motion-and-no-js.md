# CSS와 기본 가시성을 계약으로 다루기

## 근거 커밋

| 커밋 | 확인한 변화 |
| --- | --- |
| `2da79c8`, `753ee74` | 기술 스택·여정 화면과 반응형 표현을 확장했다. |
| `63f1fce` | 디자인별 대비가 부족한 색을 보정했다. |
| `343c467` | `Reveal`의 관찰자와 지역 상태를 제거해 서버 HTML부터 내용을 보이게 했다. |
| `089424d` | 디자인별 글꼴 사용과 선행 로딩 범위를 줄였다. |

## 색상값보다 역할을 공유하기

다섯 디자인이 모든 컴포넌트의 색상값을 직접 바꾸면 새 디자인을 추가할 때 수정
지점이 폭발한다. 현재 전역 CSS는 배경, 글자, 표면, 경계선처럼 역할을 나타내는
변수를 정의하고 Tailwind 유틸리티에 연결한다.

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-surface: var(--surface);
  --color-line: var(--line);
}

[data-site-design="classic"] {
  --background: #1f2023;
  --foreground: #f2efe7;
  --surface: #292b2f;
}
```

`bg-background`는 고정된 흰색이 아니라 최종 cascade에서 계산된
`--background`를 읽는다. 따라서 JSX가 `data-site-design="classic"`을 정확히
만들어야 Classic 변수도 적용된다. CSS 선택자와 DOM 속성은 타입 검사가 보장하지
않는 문자열 계약이다.

## 화면 배치는 콘텐츠에서 출발한다

반응형 기준은 특정 기기 이름이 아니라 내용이 읽을 폭을 잃는 지점이다.

- grid 열은 긴 제목과 URL에 밀리지 않도록 `minmax(0, 1fr)`와
  `min-width: 0`을 함께 사용한다.
- 두 열이 각각 필요한 읽기 폭을 잃으면 한 열로 바꾼다.
- 좁은 화면에서는 sticky·absolute 배치를 일반 흐름으로 되돌린다.
- 이미지 wrapper는 비율, 실제 크기와 overflow 정책을 함께 가진다.

`width: 100%` 하나로 넘침, 읽기 폭, 이미지 높이 문제를 모두 해결했다고 보지
않는다. 장식용 가상 요소는 `pointer-events: none`을 사용해 링크와 버튼을 가리지
않고, 실제 콘텐츠보다 아래에 놓이도록 쌓임 순서를 지정한다.

## 스크롤 효과보다 첫 HTML의 가시성을 우선하기

초기 `Reveal`은 서버가 내용을 보내도 CSS에서 숨긴 뒤
`IntersectionObserver`가 화면 진입을 감지해야 `is-visible`을 붙였다.

```text
서버 HTML: opacity 0
→ 클라이언트 코드 실행
→ 관찰자 콜백
→ is-visible 추가
→ 내용 표시
```

관찰자를 올바르게 정리해도 JavaScript가 꺼지거나 번들이 실패하면 내용이 계속
숨는 구조였다. `343c467`은 관찰자, ref와 지역 상태를 없애고 처음부터 최종 상태를
출력하도록 바꿨다.

```tsx
<Component
  className={`reveal-item is-visible ${className}`}
  style={{ transitionDelay: `${delay}ms` }}
>
  {children}
</Component>
```

현재 내용은 서버 HTML부터 보인다. 그 대가로 스크롤 진입 애니메이션은 사라졌다.
이 변경 하나가 특정 Lighthouse 점수 향상을 만들었다고 볼 단계별 측정 자료는
없다. 접근성 개선과 자원 감소라는 구조적 효과만 확인할 수 있다.

## 움직임 감소는 최종 상태까지 복원해야 한다

`prefers-reduced-motion: reduce`에서는 지속 시간만 0으로 만들면 부족하다.
숨김 상태나 transform이 남아 있으면 내용이 즉시 사라진 채 고정될 수 있다.
현재 규칙은 전환과 애니메이션을 끄면서 `filter`, `opacity`, `transform`도 최종
가시 상태로 돌린다.

Classic의 터미널은 CSS 애니메이션이 아니라 JavaScript 타이머를 사용하므로 별도
분기가 필요하다. CSS와 브라우저 자원 수명은 같은 문제가 아니며, 후자는
[04. 브라우저 자원 수명](./04-browser-resource-lifetimes.md)에서 다룬다.

## 검증 범위와 남은 위험

현재 브라우저 검사는 디자인과 활성 경로를 순회하고, 움직임 감소 환경의 긴 전환과
무한 애니메이션을 확인한다. axe는 일부 색 대비도 계산한다. 그러나 다음은 자동으로
완결되지 않는다.

- JavaScript를 완전히 끈 모든 경로의 시각 결과
- hover·focus 상태와 forced-colors 환경의 대비
- 200%·400% 확대와 긴 실제 콘텐츠의 넘침
- 모든 화면 폭에서 sticky·absolute 장식이 내용을 가리지 않는지
- 글꼴 대체가 일어났을 때의 줄바꿈과 레이아웃 이동

현재 `Reveal`에는 과거 전환용 CSS와 `delay` 속성이 남아 있지만, 서버가 두 상태
클래스를 함께 출력하므로 관찰에 따른 상태 전이는 없다. 과거 구현 설명과 현재
동작을 구분해야 이 코드를 다시 클라이언트 효과로 오해하지 않는다.
