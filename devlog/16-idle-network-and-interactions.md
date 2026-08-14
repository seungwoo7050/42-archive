# 유휴 network와 한 번의 interaction을 분리해 측정하기

## 관련 커밋

- `f3363f1` — `refactor(ui): 디자인 선택기를 server markup으로 전환`
- `726d8a2` — `test(ui): server 선택기와 focus 복원 검증`
- `089424d` — `perf(font): route별 글꼴 로딩 비용 축소`
- `c4116e6` — `perf(navigation): 유휴 route prefetch 비활성화`
- `16e9135` — `test(perf): 유휴 route 요청과 글꼴 경계 검증`
- `e84038b` — `test(perf): 사용자 상호작용 지연 측정 추가`

Lighthouse는 page 전체의 lab metric을 보여 주지만 “아무것도 하지 않았을 때 어떤
요청이 나가는가”와 “특정 control을 한 번 눌렀을 때 다음 paint까지 얼마나 걸리는가”를
직접 답하지 않는다. 두 질문을 별도 Playwright 시나리오로 만든 이유다.

## design switcher의 client 경계 축소

`DesignSwitcher`는 native `<details>`, `<summary>`, navigation과 link를 server
component로 렌더링한다. 명시적으로 닫고 summary에 focus를 돌리는 작은
`DesignSwitcherClose`만 client component다.

```tsx
onClick={(event) => {
  const details = event.currentTarget.closest("details");
  const summary = details?.querySelector<HTMLElement>(":scope > summary");
  details?.removeAttribute("open");
  summary?.focus();
}}
```

server component로 옮겨도 내부 Next `Link`의 client navigation까지 없어지는 것은
아니다. 줄어든 것은 저장소가 직접 소유하는 ref·handler와 hydration 범위다.

`src/components/portfolio/design-switcher.test.tsx`는 source에 `"use client"`와
`useRef`가 없는지, hydration 전에 사용자가 바꾼 native `open` 상태가 보존되는지,
close button이 details를 닫고 summary focus를 복원하는지 확인한다. source 문자열
검사는 client bundle 크기를 측정하지 않고, jsdom hydration 재현은 느린 network의
실제 browser race를 모두 포함하지 않는다.

## 유휴 request의 관찰 창

공통·renderer별 내부 `Link`는 `prefetch={false}`를 사용한다. 이 설정은 click 후
navigation을 막지 않고 click 전 route data 선요청을 끈다. startup network를 줄이는
대신 warm navigation 이점을 포기할 수 있다.

`tests/e2e/performance.spec.ts`는 다섯 design의 home과 첫 활성 project detail에서
request listener를 설치한 뒤 page를 연다. 첫 `h1`이 보인 시점부터 1초를 더 기다리며
다음 두 집합을 수집한다.

- URL에 `_rsc` query가 있는 request
- resource type이 `font`인 request

두 route×다섯 design에서 `_rsc` 집합이 비어 있어야 한다. 1초 뒤 요청,
`_rsc`가 아닌 background API, 다른 route와 hover·click 뒤의 요청은 포함하지 않는다.
모든 `Link`에 `prefetch={false}`가 있는지 정적으로 전수하는 검사도 아니다.

## 글꼴 선언, preload와 실제 전송

production build에서는 font 파일명이 hash되므로 URL 문자열에 `GeistMono`가 남는다고
가정할 수 없다. spec은 CSSOM의 Geist Mono `@font-face`에서 실제 source pathname을
찾고, HTML의 font preload pathname과 비교한다.

모든 design·두 route에서 mono source가 preload되지 않아야 한다. 그중 Design과
Editorial에서는 관찰 창에 실제 mono font request도 없어야 한다. Classic, Brutalist,
Cinematic은 mono font를 사용할 수 있으므로 실제 load 금지 assertion 대상이 아니다.

`src/app/layout.tsx`는 Geist Mono와 Source Han Serif KR를 `preload: false`로 등록하고,
switcher 번호는 system monospace를 사용한다. 선언을 유지하는 것, preload를 끄는 것,
특정 화면에서 전송되지 않는 것은 서로 다른 상태다. 현재 test도 모든 글꼴과 모든
route의 전송량을 재지 않는다.

## trusted click의 Event Timing

`tests/e2e/interaction-performance.spec.ts`는 Chromium의 Event Timing API를 사용한다.
`performance.now()`로 handler body만 감싸지 않고 input부터 다음 paint까지 포함하는
browser entry를 읽는다.

각 test는 observer와 capture listener를 설치해 browser가 만든 trusted click 수를
기록한다. warm-up 뒤 sample마다 정확히 한 번의 trusted click이 있어야 하며,
`interactionId`가 있는 entry를 하나의 interaction으로 묶어 가장 긴 duration을 쓴다.

observer의 `durationThreshold`는 16ms다. entry가 없으면 0ms로 기록하지 않고
`<16ms`라는 상한으로 취급한다. design마다 세 sample을 모아 중앙값과 최댓값이 모두
200ms 이하여야 한다.

측정 시나리오는 다음과 같다.

- home에서 design switcher 닫기: desktop은 summary를 다시 누르고, mobile은 close
  button을 누른다.
- mobile profile의 home에서 mobile menu 열기

두 시나리오 모두 focus·visible 상태 assertion을 통과한 뒤 timing을 판정한다. menu
닫기, design link navigation, route 전환 완료, keyboard interaction과 다른 control은
측정하지 않는다.

## 이 수치를 INP로 부를 수 없는 이유

INP는 실제 사용자 session의 interaction 분포에서 높은 percentile을 보는 field
metric이다. 현재 검사는 다음 조건에 한정된 lab 회귀 gate다.

- Chromium Desktop Chrome·Pixel 7 profile
- local production 또는 dev server
- home의 두 control
- warm-up 뒤 세 표본
- test machine의 순간 CPU 상태

sample 값은 baseline 파일로 저장하지 않고 실행 log에만 출력한다. config에 retry도
없으므로 일시적인 machine 부하를 통계적으로 흡수하는 구조가 아니다. 특정 ms 개선
성과나 실제 사용자 INP를 저장소만으로 주장할 수 없으며, 남아 있는 것은 측정 절차와
200ms 상한 계약이다.

두 performance spec은 `@visual` tag가 아니므로 production E2E와 CI의
`test:e2e:ci`에 포함된다. 다만 test 파일과 CI 연결은 현재 실행 성공의 증거가 아니다.
변경한 checkout에서 명령을 다시 실행하고 실행 환경과 생략한 검사를 함께 기록해야 한다.
