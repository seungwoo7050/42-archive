# 성능 예산과 빌드 매니페스트의 계약

## 관련 커밋

- `089424d` — `perf(font): route별 글꼴 로딩 비용 축소`
- `c4116e6` — `perf(navigation): 유휴 route prefetch 비활성화`
- `16e9135` — `test(perf): 유휴 route 요청과 글꼴 경계 검증`
- `e84038b` — `test(perf): 사용자 상호작용 지연 측정 추가`
- `3eda174` — `fix(deps): Next.js runtime 보안 패치 적용`
- `68604e1` — `build(perf): route bundle budget 도구와 기준값 추가`
- `7b8b3b6` — `build(perf): desktop Lighthouse 측정 경계 추가`
- `699279b` — `test(perf): 배포 성능 gate 규칙 검증`
- `1a9fc55` — `test(visual): 다섯 디자인 회귀 기준 추가`
- `2496129` — `ci: 검증된 bundle과 Lighthouse gate 활성화`
- `94a0122` — `chore(perf): 최종 lab 성능 측정 결과 기록`
- `041f499` — `fix(build): production build에 webpack compiler 고정`
- `541f9dc` — `fix(perf): webpack route manifest parser 보강`
- `25dcd8d` — `test(build): compiler와 manifest parser 계약 검증`

성능을 하나의 점수로 다루지 않는다. 이 저장소는 production lab metric, route별
client asset 크기, 초기 network, 지정된 click 비용을 서로 다른 실패 조건으로 둔다.
이 장은 build 결과에 의존하는 Lighthouse와 bundle 예산을 다룬다. 초기 request와
interaction 시나리오는 16장에서 분리한다.

## desktop Lighthouse gate

`lighthouserc.cjs`는 다섯 design의 home과 첫 활성 project detail, 모두 열 개 URL을
port 3300의 production server에서 측정한다. URL마다 세 번 실행하고 다음 threshold를
중앙값으로 판정한다.

| 항목 | 실패 조건 |
| --- | ---: |
| performance category | `0.90` 미만 |
| accessibility category | `0.95` 미만 |
| LCP | `2,500ms` 초과 |
| CLS | `0.1` 초과 |
| TBT | `200ms` 초과 |

collector는 `preset: "desktop"`이며 performance와 accessibility category만 요청한다.
TBT는 lab의 main-thread blocking proxy이지 실제 사용자 INP가 아니다. SEO,
best-practices, mobile 환경과 field data는 gate에 포함되지 않는다.

`src/performance/performance-gates.test.ts`는 URL 10개, run 수, desktop preset과
threshold 설정을 확인한다. 이 unit test는 Lighthouse를 실행하지 않는다. 실제 측정과
실패 판정은 CI의 `npm run lighthouse:audit`가 담당한다.

## gate와 결과 기록은 다른 작업이다

`lighthouse:audit`는 threshold를 판정한다. `lighthouse:summarize`는
`.lighthouseci/lhr-*.json`을 읽어 `performance/lighthouse-baseline.json`을 다시 쓴다.
summary는 URL별 각 metric의 중앙값을 독립적으로 계산하므로 한 행의 값이 실제 단일
run과 일치하지 않을 수 있다.

summary tool은 report가 하나도 없으면 실패하지만 다음은 검사하지 않는다.

- 기대한 열 URL이 모두 있는지
- URL마다 정확히 세 report가 있는지
- 입력 report가 LHCI gate를 통과했는지

따라서 `lighthouse:summarize`는 검증 명령이 아니라 baseline 갱신 명령이다. 생성된
JSON은 검토 후 반영해야 한다.

현재 desktop baseline은 `2026-08-13T02:52:54.086Z`에 Apple M1·macOS·Headless
Chrome 147·Node 24.18.0 환경에서 기록한 10 URL×3회 결과다. 이는 해당 시점의 관찰값이며
현재 checkout이나 CI Ubuntu의 새 실행 결과가 아니다.

`performance/lighthouse-mobile-observation.json`도 같은 날짜의 별도 기록이다. mobile
설정에서 URL별 한 번만 측정했고 `enforcement: "observation-only"`로 표시돼 있다. 파일이
기록한 target 충족 수는 accessibility·CLS 10/10, performance·TBT 9/10, LCP 3/10이다.
한 번의 mobile 관찰을 세 번의 desktop 중앙값 gate와 같은 통과 판정으로 비교할 수는
없지만, desktop gate가 mobile 성능을 보장하지 않는다는 근거는 분명하다.

## route bundle 예산

`scripts/route-budgets.mjs`는 `.next`의 production manifest와 실제 asset을 읽어
route별 client JS와 non-inlined CSS의 압축 전 byte를 합산한다. 현재 baseline에는
home, 다섯 support route, project index와 dynamic detail을 합친 여덟 route가 있다.

각 JS/CSS 값은 committed baseline의 105%까지 허용한다. baseline route가 build에서
사라지거나 build에 생긴 route가 baseline에 없을 때도 실패한다. 이 fail-closed 규칙은
측정 누락을 0 byte 개선으로 받아들이지 않게 한다.

포함되지 않는 크기도 명확하다.

- server bundle
- image와 font
- gzip/Brotli 전송 크기
- Docker image 전체 크기
- 실제 route 전환 시간과 체감 성능

`npm run bundle:check`는 기존 production build와 committed baseline을 비교한다.
`npm run bundle:baseline`은 현재 측정값으로 JSON을 덮어쓰므로 회귀 검사에 사용하면 안
된다. baseline 갱신과 판정을 분리해야 증가분이 새 정상값으로 자동 승인되지 않는다.

## compiler output을 읽는 parser

route 예산은 Next.js의 공개 API가 아니라 webpack이 만든
`*_client-reference-manifest.js` 형식에 의존한다. 이 때문에 `build` 명령과 parser가
하나의 측정 계약을 이룬다.

```text
source
→ next build --webpack
→ client-reference manifest
→ JSON assignment parser
→ route별 JS/CSS byte
→ committed baseline 비교
```

초기 parser는 `] = `처럼 대입문 주변의 공백을 가정했다. 압축된 `]=` 형식과
`/projects/[projectId]/page` key를 읽도록 `541f9dc`에서 정규식을 보강했다. 현재 함수는
다음 대입 위치를 찾고 마지막 semicolon을 제거한 뒤 `JSON.parse()`한다.

```js
/globalThis\.__RSC_MANIFEST\[[\s\S]+?\]\s*=\s*/
```

`src/performance/performance-gates.test.ts`는 공백 없는 compact assignment와 square
bracket이 있는 dynamic route fixture를 직접 검사한다. parser는 `eval`하지 않으며
대입문이나 끝 semicolon을 찾지 못하면 filename을 포함한 오류를 낸다.

이 검사가 미래의 모든 Next.js output을 보장하지는 않는다. 한 파일에 여러 assignment가
생기거나 값이 JSON literal이 아닌 표현식으로 바뀌거나, manifest 경로·key 이름 또는
compiler가 바뀌면 다시 실패할 수 있다. runtime export와 수동
`scripts/route-budgets.d.mts` 선언도 함께 유지해야 한다.

## 측정 전에 필요한 순서

bundle과 Lighthouse는 모두 기존 `.next` production output이 필요하다. 일반적인 판정
순서는 다음과 같다.

```text
npm run build
→ npm run build:verify
→ npm run bundle:check
→ npm run lighthouse:audit
```

이 명령들이 통과해도 실제 사용자 기기·network·서버 지역, warm navigation, 장기
INP와 전송 압축은 알 수 없다. 저장된 baseline은 비교 기준과 과거 관찰값이지 현재
성능 통과 증명서가 아니다.
