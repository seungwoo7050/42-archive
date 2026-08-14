# 공통 UI와 문서 구조의 경계 세우기

## 근거 커밋

| 커밋 | 확인한 변화 |
| --- | --- |
| `a93f4ee` | 링크·이미지·카드·사이트 셸의 첫 공통 구현을 추가했다. |
| `bc2e726` | 디자인 선택기와 skip link를 넣고 header·main·footer를 분리했다. |
| `c42d8b3`, `909a6d6` | 여정 목록과 프로젝트 링크의 중복 렌더링을 공통 컴포넌트로 옮겼다. |
| `c9ae0d7`, `5dc334b` | main 포커스와 Brutalist 지표의 정의 목록 의미를 바로잡았다. |
| `cae295d` | 디자인과 활성 경로 전체에 접근성 검사를 추가했다. |

## 공통화의 대상은 모양보다 정책이다

비슷해 보이는 JSX를 모두 하나로 합치기보다, 어느 화면에서도 같아야 하는 규칙을
공통 컴포넌트에 둔다. 대표적인 예가 링크 이동 정책이다.

```tsx
if (link.external) {
  return <a href={link.href} {...getExternalLinkProps(link)}>{children}</a>;
}

return (
  <Link
    href={getTemplateHref(link.href, homeTemplate, { contentDebug })}
    prefetch={false}
  >
    {children}
  </Link>
);
```

외부 링크는 새 창과 `rel` 속성 정책을 적용하고, 내부 링크는 현재 디자인과 디버그
상태를 이어 간다. 공통 컴포넌트는 URL 모양을 다시 추측하지 않고 검증된 콘텐츠의
`external` 값을 믿는다.

프로젝트 카드도 카드 전체를 링크로 감싸지 않는다. 대표 이미지 링크, 제목 링크,
데모·소스 링크를 같은 `article` 안의 형제 요소로 둔다. 이렇게 해야 링크 안에 다른
링크가 들어가는 잘못된 HTML과 모호한 키보드 초점 순서를 피할 수 있다.

## 이미지 공통화의 한계

Design과 Classic의 `ProjectScreenshot`은 기본 HTML `<img>`를 사용하며 `priority`를
`loading="eager"` 또는 `loading="lazy"`로 바꾸는 저장소 내부 규칙으로 해석한다.
반면 Editorial·Brutalist·Cinematic은 별도의 `next/image` 구성을 가진다.

따라서 공통 이미지 컴포넌트가 다섯 디자인의 최적화·반응형 크기·레이아웃 이동을
모두 해결한다고 볼 수 없다. `alt`도 콘텐츠가 제공한 문자열을 전달할 뿐, 문구가
이미지의 목적에 알맞은지는 자동으로 판정하지 않는다.

## `<main>` 하나가 문서 전체를 감싸던 문제

첫 `PageShell`은 root 자체가 `<main>`이었고, 그 안에 header와 footer까지 넣었다.

```tsx
// a93f4ee의 구조를 줄여 쓴 형태
<main>
  <SiteHeader />
  {children}
  <SiteFooter />
</main>
```

화면은 그려지지만 banner와 contentinfo가 페이지의 주 콘텐츠 안에 들어간다.
`bc2e726`은 바깥 wrapper를 두고 header, main, footer를 형제 landmark로 나눴다.
`c9ae0d7`은 skip link가 실제로 초점을 옮길 수 있도록 main에
`tabIndex={-1}`를 추가했다.

```tsx
<div data-site-design={homeTemplate}>
  <a href="#main-content">{ui.skipLinkLabel}</a>
  <SiteHeader />
  <main id="main-content" tabIndex={-1}>{children}</main>
  <SiteFooter />
</div>
```

hash가 바뀌는 것과 키보드 초점이 이동하는 것은 별개의 동작이다.
`tabIndex={-1}`은 main을 일반 Tab 순서에 넣지 않으면서 명시적인 초점 대상이 되게
한다.

## 무엇을 공유하고 무엇을 나눴나

현재 Design과 Classic은 `PageShell`, 프로젝트 카드, 여정 목록과 기술 스택 목록을
주로 공유한다. 나머지 세 디자인은 각자의 shell과 화면 구조를 갖는다.

```text
Design / Classic  → PageShell과 공통 목록·카드
Editorial         → EditorialShell
Brutalist         → BrutalistShell
Cinematic         → Frame
```

다섯 디자인이 CSS만 바꾼 같은 DOM이라는 설명은 맞지 않는다. 공통 입력은 콘텐츠와
라우트 뷰 모델이지만, 제목 단계, 탐색 구조, 이미지 배치와 모바일 구성은 각
렌더러가 소유한다. Brutalist의 지표 설명을 `<p>`에서 `<dd>`로 바꾼
`5dc334b`가 이 차이를 보여 준다. 같은 모양이어도 의미 구조는 디자인별로 따로
검토해야 한다.

## 현재 요소 선택 원칙

- 다른 URL로 이동하는 동작은 `<a>` 또는 Next `Link`를 사용한다.
- 열린 디자인 선택기를 닫는 동작은 `<button type="button">`을 사용한다.
- 모바일 메뉴와 디자인 목록의 열린 상태는 HTML 기본 요소인
  `<details>/<summary>`가 맡는다.
- 아이콘만 보이는 닫기 버튼은 콘텐츠의 label을 `aria-label`로 받고, 장식용 `×`는
  접근성 트리에서 제외한다.
- 마퀴의 복제 목록과 장식 SVG·번호는 의미가 중복되지 않도록 숨긴다.

## 검사 범위와 남은 위험

`tests/e2e/accessibility.spec.ts`는 다섯 디자인과 활성 경로에서 banner, main,
contentinfo가 각각 하나인지 확인한다. skip link에는 실제 Tab과 Enter를 보내 main
포커스를 검사한다. 별도 단위 검사는 내부 링크와 외부 링크의 속성을 확인한다.

이 검사로 닫히지 않는 범위도 분명하다.

- 로더는 URL scheme과 `external` 값의 일치를 완전히 확인하지 않는다. 잘못된 값은
  디자인마다 다른 이동 결과를 만들 수 있다.
- 외부 링크 이름에 “새 창에서 열림” 안내를 자동으로 추가하지 않는다.
- 카드의 모든 터치 영역, `alt` 문구와 제목 문구의 의미 품질은 수동 검토가
  필요하다.
- Design과 Classic에 나뉘어 있는 보조 경로 파일은 이후 한쪽만 수정될 수 있다.
- axe와 Chromium 행렬이 모든 화면 읽기 프로그램과 실제 모바일 기기를 대신하지
  않는다.

공통 컴포넌트는 중복 코드를 줄이는 도구보다 정책을 한곳에서 바꾸는 경계다. 반대로
공통 셸의 구조 오류는 모든 화면에 퍼지므로, 공유 범위가 넓을수록 의미 구조와 초점
검사를 가까이 둬야 한다.
