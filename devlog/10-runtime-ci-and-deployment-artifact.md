# 재현 가능한 빌드에서 컨테이너 검증까지

## 관련 커밋

- `0d11d54` — `chore(runtime): 지원 Node.js와 npm 버전 고정`
- `6d75352` — `test(e2e): production server 검증 경로 추가`
- `7d0928a` — `ci: 기본 배포 품질 검사 추가`
- `041f499` — `fix(build): production build에 webpack compiler 고정`
- `5d7c8a5` — `build: standalone server 산출물 생성`
- `db30244` — `test(build): standalone 산출물 완전성 검증`
- `8c1ca6d` — `ci: standalone 산출물 검증 추가`
- `3eda174` — `fix(deps): Next.js runtime 보안 패치 적용`
- `b10b9f6` — `build(docker): public 자산을 포함한 비루트 standalone image 추가`
- `9410d7d` — `test(docker): runtime route와 public 자산 검증 자동화`

이 프로젝트의 배포 경계는 네 단계로 나뉜다. 도구 버전을 선언하고, CI에서 소스를
검사하고, Next.js standalone 산출물을 만든 뒤, 그 산출물을 담은 컨테이너를 실제로
띄운다. 앞 단계가 성공해도 다음 단계까지 자동으로 보장되지는 않는다.

## 실행 환경 계약

`.nvmrc`, `.node-version`, `package.json#engines`는 Node.js `24.18.0`을 가리킨다.
`package.json#packageManager`와 CI·Dockerfile은 npm `11.16.0`을 사용한다. lockfile을
어느 도구로 해석할지까지 맞추려는 구성이다.

다만 이 파일들은 로컬 실행을 강제로 차단하지 않는다. 버전 관리자가 설정을 읽지
않거나 npm의 `engine-strict`가 꺼져 있으면 불일치는 경고로 끝날 수 있다. 따라서
버전 문자열의 일치는 재현 조건이지, 모든 실행 환경이 동일하다는 증거는 아니다.

## CI가 실제로 실행하는 범위

`.github/workflows/ci.yml`의 단일 Ubuntu job은 다음 순서로 진행된다.

```text
npm ci
→ lint
→ typecheck
→ content:check
→ Vitest
→ Chromium 설치
→ production build + 비시각 Playwright
→ standalone 경로 확인
→ route bundle 예산
→ desktop Lighthouse
→ 컨테이너 검사
```

Playwright 단계는 현재 `npm run test:e2e:ci`를 호출한다. 이 명령은
`playwright.production.config.ts`로 Next.js production server를 실행하되 `@visual`
테스트만 제외한다. 여기서 production은 서버 실행 방식을 뜻한다. workflow는
`PORTFOLIO_CONTENT_MODE=production`이나 `SITE_URL`을 설정하지 않으므로 콘텐츠는
기본값인 template mode로 빌드된다.

이 config의 server 명령은 `next start`다. 현재 Next.js CLI는
`output: "standalone"` build에 이 명령을 사용하면
`.next/standalone/server.js`를 직접 실행하라는 경고를 낸다. 이번 감사의 browser
행렬은 이 경고가 있는 상태에서도 통과했지만, 그 결과를 패키징된 standalone server
진입점 자체의 기동 검사로 확대할 수는 없다. standalone 묶음의 실제 실행은 뒤의
container 검사가 별도로 맡는다.

CI는 Chromium의 Desktop Chrome·Pixel 7 profile만 사용한다. Firefox, WebKit, 실제
모바일 기기와 외부 네트워크 조건은 이 job의 범위가 아니다. 실패 시 trace를
`on-first-retry`로 설정했지만 retry 횟수와 artifact 업로드 단계는 따로 정의돼 있지
않다.

## 빌드 성공과 배포 산출물은 다른 조건이다

`npm run build`는 `prebuild`를 거쳐 `next build --webpack`을 실행한다.
`next.config.ts`의 `output: "standalone"`이 self-hosted server 묶음을 만들고,
`scripts/verify-build-output.mjs`는 다음 두 경로의 존재만 확인한다.

```text
.next/standalone/server.js
.next/static
```

이 검사는 파일 내용, 서버 기동, `public/` 복사 여부와 HTTP 응답을 확인하지 않는다.
compiler를 webpack으로 고정한 이유에는 뒤의 route budget 도구가 webpack의
client-reference manifest를 읽는다는 제약도 포함된다.

## Docker 이미지의 소유권과 실행 사용자

Dockerfile은 `dependencies`, `builder`, `runner` stage로 나뉜다. builder가 build와
산출물 검사를 수행하고, runner는 다음 세 묶음을 복사한다.

```dockerfile
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
```

최종 process는 `USER node`로 실행된다. 이는 root 권한을 줄이지만 read-only root
filesystem, Linux capability, image 취약점, secret 관리까지 해결하지는 않는다.

builder는 `PORTFOLIO_CONTENT_MODE`와 `SITE_URL`을 build argument로 받을 수 있다.
그러나 기본 mode는 `template`이고, 새 runner stage는 두 값을 상속하지 않는다.
빌드와 실행 시점의 metadata가 같은 mode와 origin을 본다는 보장은 배포자가 별도로
만들어야 한다.

## 컨테이너 검사가 직접 확인하는 것

`scripts/verify-container-runtime.mjs`는 고유한 이름으로 image와 container를 만들고,
임의의 localhost port에 연결한다. 준비가 될 때까지 최대 60회, 1초 간격으로 `/`를
요청한 뒤 다음을 검사한다.

- container 설정의 사용자가 정확히 `node`인지
- `/`가 200, non-empty `text/html`로 응답하는지
- `/projects/example-project?view=classic`이 같은 조건으로 응답하는지
- 14개 JSON에서 찾은 `/template/`·`/content/` 참조가 200, non-empty body와
  확장자별 MIME으로 응답하는지

두 번째 route는 현재 활성 project를 동적으로 찾지 않고 `example-project`를
하드코딩한다. 현재 template 데이터와는 일치하지만 project ID가 바뀌면 실제 첫 활성
project가 아니라 오래된 URL을 검사하게 된다. 따라서 이를 “현재 콘텐츠로부터 구성한
project route 검사”라고 해석하면 안 된다.

또한 `npm run test:container`는 Docker build argument와 `docker run` 환경 변수를
전달하지 않는다. 이 명령이 직접 검증하는 것은 기본 template build와 template
runtime이다. production readiness, production robots/sitemap, build·runtime env
일치는 검증하지 않는다.

script는 `finally`에서 시작한 container를 강제 삭제하고 임시 image도 지운다.
이 정리는 테스트 자원 누적을 막기 위한 것이며 SIGTERM 전달, graceful shutdown,
예상 exit code를 확인하는 종료 테스트는 아니다.

## 검증 근거와 남은 운영 경계

`src/performance/performance-gates.test.ts`는 build 명령이 webpack을 유지하는지
확인하고, CI는 실제 build·browser·bundle·Lighthouse·container 명령을 연결한다.
`src/docs/documentation.test.ts`는 문서 제목·필수 명령·상대 링크를 검사한다. 문서의
설명과 runtime 동작이 일치하는지까지 자동 판정하지는 않는다.

공개 배포에서는 다음 조건이 여전히 별도 검증 대상이다.

- build와 runtime의 `PORTFOLIO_CONTENT_MODE`·`SITE_URL` 일치
- 실제 HTML, `/robots.txt`, `/sitemap.xml`, canonical과 JSON-LD origin
- reverse proxy, forwarded header, DNS와 TLS
- SIGTERM 처리, 장시간 부하, 장애와 복구

따라서 standalone 경로 존재, template 컨테이너의 HTTP 응답, 실제 공개 배포 준비를
서로 다른 결과로 기록해야 한다.
