# Thread: Self-contained production build and portability

> Project: 42 Archive Portfolio (`web/portfolio`)
>
> 이 문서는 원본 Development Thread를 변경하지 않고, 같은 branch history에 product-delivery 관점을 추가한 확장 workbook입니다.

## 0. 분류 출처와 변경 가능 범위

- Commit SHA, subject, importance, tags는 `commit/commit-importance.md`의 branch-scoped 분류를 사용합니다.
- Phase 1 audit에서 category/thread grouping과 commit set을 실제 history에 대조한 뒤 이 문서를 freeze했습니다.
- Phase 2는 freeze된 구조와 fixed metadata를 바꾸지 않고 learner-facing 기록만 완성합니다.
- 다른 branch의 구현이나 final HEAD를 과거 SHA 설명에 소급하지 않습니다.
- 실행하지 않은 build/test/CI/Docker 결과는 exact-SHA source inspection과 구분합니다.

## 1. Thread 목표

production build가 외부 font fetch와 암묵적인 compiler·framework native binary·CSS transform 상태에 기대지 않도록 만들고, fresh Linux/container 환경에서도 같은 입력과 설정으로 artifact를 만들 수 있는 경계를 복원합니다.

### 계획된 핵심 invariant

- 빌드에 필요한 font binary와 license/provenance 정보는 repository가 소유하며 `next/font/local`이 소비합니다.
- production build compiler는 generated manifest를 해석하는 downstream tooling과 합의된 webpack 경로로 고정됩니다.
- Next.js runtime, lint tooling과 platform-specific SWC package는 같은 patch line과 lockfile resolution을 사용합니다.
- Tailwind utility 변환은 dependency 존재 여부가 아니라 명시적인 root PostCSS configuration으로 활성화됩니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 외부 font provider 호출을 제거할 때 binary, license, source record와 CSS variable compatibility는 각각 누가 소유하는가?
- source-level TypeScript 성공과 실제 production CSS/font output 성공 사이에 어떤 build-only failure가 남는가?
- webpack compiler pin, Next patch update와 GNU/musl SWC lockfile metadata가 portability에 어떤 서로 다른 역할을 갖는가?
- 각 fix에 직접적인 regression test가 있는지, 아니면 broad build/visual verification만 존재하는지 구분할 수 있는가?

## 3. 완료 기준

- 각 SHA의 parent diff와 resulting tree에서 실제 변경 file, function, config, script와 workflow step을 확인했습니다.
- Source, generated artifact, CI gate, container/runtime owner를 구분했습니다.
- Missing artifact, portability failure, threshold violation, startup failure와 cleanup branch를 기록했습니다.
- Test/CI command의 technique, production path, proves/does-not-prove와 실제 실행 여부를 구분했습니다.
- 최종 product-delivery 흐름과 cross-thread handoff를 코드 없이 설명할 수 있습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | 확장 thread에서 확인할 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `7872e1214de7` | fix(font): 빌드용 글꼴과 출처를 저장소에서 제공 | A | DEPLOY, DEBUG | 외부 build dependency 제거 — Google Font fetch를 repository-owned WOFF2와 `next/font/local`로 교체합니다. |
| 2 | `2f65f6a6fcb6` | test(font): 로컬 글꼴과 license 경계 검증 | A | VALIDATION, DEPLOY, TEST | 결정적 source/file regression — local font registration, WOFF2 file와 license notice를 검사합니다. |
| 3 | `404a220e5d40` | fix(build): production build에 webpack compiler 고정 | B | DEPLOY, DEBUG | compiler contract 고정 — production output을 downstream manifest tooling이 이해하는 webpack 형식으로 만듭니다. |
| 4 | `5d903132306a` | fix(deps): Next.js runtime 보안 패치 적용 | B | DEPLOY, DEBUG | framework/native portability maintenance — Next, ESLint config와 platform SWC resolution을 같은 patch line으로 갱신합니다. |
| 5 | `1de3d36e3a48` | fix(build): Tailwind utility CSS 변환 복원 | A | DEPLOY, DEBUG | production transform 복원 — installed Tailwind PostCSS plugin을 explicit root config로 등록합니다. |

## 5. Commit별 학습 기록

각 section은 반드시 해당 SHA의 tree와 parent diff를 기준으로 작성합니다. 다른 Thread의 later commit은 관계 설명에만 사용하고 과거 구현에 소급하지 않습니다.

### 1. `7872e1214de7` — fix(font): 빌드용 글꼴과 출처를 저장소에서 제공

- **Full SHA:** `7872e1214de7b5d58722358998c6d63cfbe9f279`
- **Importance:** A
- **Tags:** DEPLOY, DEBUG
- **확장 thread에서의 역할:** 외부 build dependency 제거 — Google Font fetch를 repository-owned WOFF2와 `next/font/local`로 교체합니다.

#### 해당 SHA에서 확인할 실제 코드

- `src/app/layout.tsx`에서 `next/font/google` import와 세 font registration이 `next/font/local`로 어떻게 바뀌는지 비교합니다.
- `src/app/fonts/FONT_SOURCES.md`, 세 WOFF2, 두 OFL license file의 version·size·SHA-256 기록과 실제 file ownership을 확인합니다.
- `SourceHanSerifKR`를 사용하면서 기존 CSS variable `--font-noto-serif-kr`을 유지하는 compatibility decision을 추적합니다.
- `src/designs/editorial/editorial-route.module.css` 등 font-family consumer가 hard-coded name 대신 generated CSS variable을 사용하도록 바뀌는지 확인합니다.

확인 원칙:

- 먼저 `7872e1214de7^`와 `7872e1214de7`를 비교하고, 필요한 file은 `7872e1214de7:<path>`의 resulting tree에서 읽습니다.
- Final HEAD의 workflow, script, Dockerfile 또는 generated output을 이 commit에 소급하지 않습니다.
- Commit subject나 body만으로 behavior를 추정하지 않고 실제 changed code/test/config를 기준으로 판단합니다.
- 실제 실행하지 않은 command 결과는 code inspection과 분리합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 전달 상태와 부족함 | `src/app/layout.tsx`가 `next/font/google`의 Geist, Geist Mono, Noto Serif KR를 사용했습니다. 따라서 production build가 font provider에 접근할 수 없는 환경에서는 source가 유효해도 font download 단계에서 실패할 수 있었습니다. |
| 실제 변경 file/symbol/command/artifact | 세 원본 WOFF2와 OFL license를 `src/app/fonts/**`에 저장하고, 출처·version·size·SHA-256을 `FONT_SOURCES.md`에 기록했습니다. layout은 `next/font/local`로 variable font weight range와 `display: swap`을 선언합니다. Source Han Serif KR를 사용하지만 기존 style contract를 깨지 않도록 `--font-noto-serif-kr` 이름은 유지하고 CSS consumer를 variable 기반으로 바꿉니다. |
| Build/runtime/resource owner와 lifetime | font binary와 license lifetime은 repository가 소유하고 build가 bundle에 포함합니다. `src/app/layout.tsx`가 font registration과 HTML class binding을 소유하며, renderer CSS는 제공된 variable만 소비합니다. 외부 provider는 build path에서 제거됩니다. |
| Failure·missing output·cleanup 처리 | missing/corrupt local file은 build 또는 file read에서 실패할 수 있습니다. 이 commit 자체에는 file signature나 license 검사가 없으며, 문서의 SHA-256과 실제 binary가 일치하는지 자동 검증하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | 이 세 font를 구성하기 위해 build-time Google Fonts 요청이 필요하지 않습니다. npm registry/base image 등 다른 dependency network, 모든 CSS의 외부 URL 부재, glyph coverage와 실제 browser rendering 품질은 보장하지 않습니다. |
| 다음 delivery commit 또는 관련 test 연결 | `2f65f6a6fcb6`이 layout import, local path, WOFF2 magic과 license text를 검증합니다. 후속 performance work는 큰 CJK font의 route별 loading cost를 별도로 최적화하지만 이 SHA에 소급하지 않습니다. |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** `src/app/layout.tsx`는 `next/font/google`에서 `Geist`, `Geist_Mono`, `Noto_Serif_KR`를 import했습니다.
- **해당 SHA 핵심 코드:** `7872e1214de7b5d58722358998c6d63cfbe9f279` · `src/app/layout.tsx`

```text
import localFont from "next/font/local";

const geistSans = localFont({
  display: "swap",
  src: "./fonts/Geist-Variable.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const koreanSerif = localFont({
  src: "./fonts/SourceHanSerifKR-Variable.woff2",
  variable: "--font-noto-serif-kr",
  weight: "250 900",
});
```

- **관찰 근거의 성격:** Exact-SHA diff와 repository-owned font/source/license files에서 직접 확인했습니다.
- **실행·테스트 증거:** 실행하지 않음. 현재 작업 환경에서는 `web/portfolio`의 Git checkout, npm dependency tree, Chromium 및 Docker daemon을 사용할 수 없었습니다. GitHub connector로 해당 SHA의 commit diff와 resulting source를 검사했으며, command 성공 결과는 주장하지 않습니다.
- **다음 commit 연결:** `2f65f6a6fcb6`이 layout import, local path, WOFF2 magic과 license text를 검증합니다. 후속 performance work는 큰 CJK font의 route별 loading cost를 별도로 최적화하지만 이 SHA에 소급하지 않습니다.

### 2. `2f65f6a6fcb6` — test(font): 로컬 글꼴과 license 경계 검증

- **Full SHA:** `2f65f6a6fcb6e753497ded0f4a8948cfa0238c48`
- **Importance:** A
- **Tags:** VALIDATION, DEPLOY, TEST
- **확장 thread에서의 역할:** 결정적 source/file regression — local font registration, WOFF2 file와 license notice를 검사합니다.

#### 해당 SHA에서 확인할 실제 코드

- `src/app/local-fonts.test.ts`가 layout source를 어떻게 읽고 Google provider token을 어떤 정규식으로 금지하는지 확인합니다.
- `it.each`의 configured source path와 physical filename 쌍을 추적하고 `wOF2` magic 검사 범위를 기록합니다.
- license 검사가 두 file의 특정 문구만 확인하며 provenance hash나 전체 license equivalence를 검증하지 않는다는 점을 구분합니다.
- production build/browser를 실행하는 test가 아니라 source + repository file boundary test라는 technique를 분류합니다.

확인 원칙:

- 먼저 `2f65f6a6fcb6^`와 `2f65f6a6fcb6`를 비교하고, 필요한 file은 `2f65f6a6fcb6:<path>`의 resulting tree에서 읽습니다.
- Final HEAD의 workflow, script, Dockerfile 또는 generated output을 이 commit에 소급하지 않습니다.
- Commit subject나 body만으로 behavior를 추정하지 않고 실제 changed code/test/config를 기준으로 판단합니다.
- 실제 실행하지 않은 command 결과는 code inspection과 분리합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 전달 상태와 부족함 | local font file과 license가 repository에 들어왔지만, layout이 다시 Google import로 돌아가거나 file이 사라져도 이를 빠르게 잡는 focused regression이 없었습니다. |
| 실제 변경 file/symbol/command/artifact | `src/app/local-fonts.test.ts`를 추가했습니다. layout source에 `next/font/local`이 있고 `next/font/google`, `fonts.googleapis.com`, `fonts.gstatic.com`이 없음을 확인합니다. 세 local path가 layout에 존재하고 각 file의 첫 네 byte가 `wOF2`인지 검사하며, 두 license file에 OFL 1.1 표기가 있는지 검사합니다. |
| Build/runtime/resource owner와 lifetime | Vitest test process가 source와 binary/license file을 read-only로 읽습니다. fixture를 복사하거나 mutation하지 않으며, 각 `readFileSync` 호출의 file descriptor lifetime은 Node가 호출 단위로 관리합니다. |
| Failure·missing output·cleanup 처리 | layout token mismatch, missing file, 잘못된 magic, license 문구 부재가 assertion 또는 file-read error로 실패합니다. binary 전체 corruption, recorded SHA-256, browser font load, glyph coverage와 build output은 검사하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | local registration과 최소 file/license shape가 source regression으로 보호됩니다. 이 test 통과만으로 production build가 성공하거나 font가 시각적으로 올바르게 표시된다고 결론 내릴 수 없습니다. |
| 다음 delivery commit 또는 관련 test 연결 | `7872e1214de7`의 local ownership invariant를 직접 보호합니다. compiler/CSS 변환은 뒤의 별도 fix와 cross-thread build/visual 검증이 맡습니다. |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** Parent에는 `src/app/local-fonts.test.ts`가 없습니다.
- **해당 SHA 핵심 코드:** `2f65f6a6fcb6e753497ded0f4a8948cfa0238c48` · `src/app/local-fonts.test.ts`

```text
expect(layoutSource).toContain('from "next/font/local"');
expect(layoutSource).not.toMatch(
  /next\/font\/google|fonts\.googleapis\.com|fonts\.gstatic\.com/,
);

const font = readFileSync(resolve(projectRoot, "src/app/fonts", fileName));
expect(font.subarray(0, 4).toString("ascii")).toBe("wOF2");
```

- **관찰 근거의 성격:** Exact-SHA test implementation에서 직접 확인한 static repository contract입니다.
- **실행·테스트 증거:** 실행하지 않음. 현재 작업 환경에서는 `web/portfolio`의 Git checkout, npm dependency tree, Chromium 및 Docker daemon을 사용할 수 없었습니다. GitHub connector로 해당 SHA의 commit diff와 resulting source를 검사했으며, command 성공 결과는 주장하지 않습니다.
- **다음 commit 연결:** `7872e1214de7`의 local ownership invariant를 직접 보호합니다. compiler/CSS 변환은 뒤의 별도 fix와 cross-thread build/visual 검증이 맡습니다.

### 3. `404a220e5d40` — fix(build): production build에 webpack compiler 고정

- **Full SHA:** `404a220e5d408d39e360a7fe2149042a6e2af3ee`
- **Importance:** B
- **Tags:** DEPLOY, DEBUG
- **확장 thread에서의 역할:** compiler contract 고정 — production output을 downstream manifest tooling이 이해하는 webpack 형식으로 만듭니다.

#### 해당 SHA에서 확인할 실제 코드

- `package.json`의 `build`가 `next build`에서 `next build --webpack`으로 바뀌는 단일 diff를 확인합니다.
- 같은 SHA의 `dev`가 이미 `next dev --webpack`이라는 점과 development/production compiler 정렬을 기록합니다.
- 이 commit에는 generated manifest parser나 regression test가 아직 없음을 확인하고 후속 `c24c350ce42c`와 연결합니다.
- compiler pin이 application semantics를 검증하는 것이 아니라 output format 선택을 소유한다는 점을 명시합니다.

확인 원칙:

- 먼저 `404a220e5d40^`와 `404a220e5d40`를 비교하고, 필요한 file은 `404a220e5d40:<path>`의 resulting tree에서 읽습니다.
- Final HEAD의 workflow, script, Dockerfile 또는 generated output을 이 commit에 소급하지 않습니다.
- Commit subject나 body만으로 behavior를 추정하지 않고 실제 changed code/test/config를 기준으로 판단합니다.
- 실제 실행하지 않은 command 결과는 code inspection과 분리합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 전달 상태와 부족함 | development command는 webpack을 명시했지만 production `build`는 compiler를 명시하지 않았습니다. framework default가 바뀌면 development와 production output 형식이 달라질 수 있었습니다. |
| 실제 변경 file/symbol/command/artifact | `package.json`의 `build`를 `next build --webpack`으로 바꿨습니다. 다른 script나 source file은 변경하지 않습니다. |
| Build/runtime/resource owner와 lifetime | compiler 선택의 owner가 framework default에서 repository package script로 이동합니다. 모든 downstream command가 `npm run build`를 호출할 때 동일한 compiler path를 사용합니다. |
| Failure·missing output·cleanup 처리 | webpack build 자체의 failure는 command non-zero로 나타나지만 이 SHA에는 선택값을 검사하는 test가 없습니다. webpack manifest format과 parser의 실제 호환성도 아직 구현되지 않았습니다. |
| 보장하는 것과 보장하지 않는 것 | repository의 canonical production build command가 webpack을 명시합니다. Next 내부 output format의 영구 안정성이나 다른 사람이 직접 `next build`를 호출하는 경우까지 보장하지 않습니다. |
| 다음 delivery commit 또는 관련 test 연결 | Thread 4의 `c2fb8a7c238d` parser와 `c24c350ce42c` compiler contract test가 이 선택을 실제 measurement invariant로 사용합니다. |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** `"build": "next build"`였습니다.
- **해당 SHA 핵심 코드:** `404a220e5d408d39e360a7fe2149042a6e2af3ee` · `package.json`

```text
"build": "next build --webpack"
```

- **관찰 근거의 성격:** Exact-SHA one-line package script diff입니다.
- **실행·테스트 증거:** 실행하지 않음. 현재 작업 환경에서는 `web/portfolio`의 Git checkout, npm dependency tree, Chromium 및 Docker daemon을 사용할 수 없었습니다. GitHub connector로 해당 SHA의 commit diff와 resulting source를 검사했으며, command 성공 결과는 주장하지 않습니다.
- **다음 commit 연결:** Thread 4의 `c2fb8a7c238d` parser와 `c24c350ce42c` compiler contract test가 이 선택을 실제 measurement invariant로 사용합니다.

### 4. `5d903132306a` — fix(deps): Next.js runtime 보안 패치 적용

- **Full SHA:** `5d903132306a1ab6db0fe715415e1527f63ebb93`
- **Importance:** B
- **Tags:** DEPLOY, DEBUG
- **확장 thread에서의 역할:** framework/native portability maintenance — Next, ESLint config와 platform SWC resolution을 같은 patch line으로 갱신합니다.

#### 해당 SHA에서 확인할 실제 코드

- `package.json`에서 `next`와 `eslint-config-next`가 16.2.4에서 16.2.11로 함께 이동하는지 확인합니다.
- `package-lock.json`에서 `@next/env`, lint plugin, 각 OS/CPU SWC package가 같은 patch line으로 해석되는지 추적합니다.
- Linux ARM64/x64 GNU와 musl package에 추가된 `libc` constraint가 container/native binary selection에 미치는 역할을 기록합니다.
- repository가 특정 CVE 번호, exploit 재현이나 security regression test를 제공하는지 확인하고 없는 사실을 명시합니다.

확인 원칙:

- 먼저 `5d903132306a^`와 `5d903132306a`를 비교하고, 필요한 file은 `5d903132306a:<path>`의 resulting tree에서 읽습니다.
- Final HEAD의 workflow, script, Dockerfile 또는 generated output을 이 commit에 소급하지 않습니다.
- Commit subject나 body만으로 behavior를 추정하지 않고 실제 changed code/test/config를 기준으로 판단합니다.
- 실제 실행하지 않은 command 결과는 code inspection과 분리합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 전달 상태와 부족함 | Next runtime과 matching ESLint/compiler package가 16.2.4 patch line에 고정돼 있었습니다. commit subject는 security maintenance 필요를 나타내지만 repository evidence에는 특정 CVE나 재현 scenario가 없습니다. |
| 실제 변경 file/symbol/command/artifact | `next`와 `eslint-config-next`를 16.2.11로 올리고 lockfile의 `@next/env`, `@next/eslint-plugin-next`, darwin/linux/windows SWC package를 같은 version으로 갱신했습니다. Linux GNU/musl native package에는 명시적 `libc` metadata가 기록됩니다. |
| Build/runtime/resource owner와 lifetime | runtime/compiler dependency resolution은 `package.json`과 lockfile이 소유합니다. install 시 npm이 OS·CPU·libc 조건에 맞는 optional SWC package를 선택합니다. application code ownership은 바뀌지 않습니다. |
| Failure·missing output·cleanup 처리 | 잘못된 native package 선택은 install/build failure로 드러날 수 있습니다. 이 commit에는 CVE-specific test, runtime exploit reproduction, application behavior regression test가 없습니다. |
| 보장하는 것과 보장하지 않는 것 | framework, lint plugin과 native compiler artifact가 16.2.11 patch line으로 정렬되고 libc 조건이 lockfile에 남습니다. 모든 보안 취약점 제거, future vulnerability 부재, multi-architecture runtime 실행 성공은 보장하지 않습니다. |
| 다음 delivery commit 또는 관련 test 연결 | 앞의 webpack pin과 뒤의 build measurement/container install이 같은 patched dependency graph를 사용합니다. 이 commit은 font나 Tailwind failure를 직접 고친 것이 아니라 portability thread의 framework/native dependency 경계를 보강합니다. |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** `next`와 `eslint-config-next`가 16.2.4이고 lockfile의 matching packages도 16.2.4였습니다.
- **해당 SHA 핵심 코드:** `5d903132306a1ab6db0fe715415e1527f63ebb93` · `package.json`

```text
"dependencies": {
  "next": "16.2.11"
},
"devDependencies": {
  "eslint-config-next": "16.2.11"
}
```

- **관찰 근거의 성격:** Exact-SHA dependency/lockfile diff와 branch commit body에서 확인했습니다.
- **실행·테스트 증거:** 실행하지 않음. 현재 작업 환경에서는 `web/portfolio`의 Git checkout, npm dependency tree, Chromium 및 Docker daemon을 사용할 수 없었습니다. GitHub connector로 해당 SHA의 commit diff와 resulting source를 검사했으며, command 성공 결과는 주장하지 않습니다.
- **다음 commit 연결:** 앞의 webpack pin과 뒤의 build measurement/container install이 같은 patched dependency graph를 사용합니다. 이 commit은 font나 Tailwind failure를 직접 고친 것이 아니라 portability thread의 framework/native dependency 경계를 보강합니다.

### 5. `1de3d36e3a48` — fix(build): Tailwind utility CSS 변환 복원

- **Full SHA:** `1de3d36e3a485830b0a459cbc9dc9748ca15d763`
- **Importance:** A
- **Tags:** DEPLOY, DEBUG
- **확장 thread에서의 역할:** production transform 복원 — installed Tailwind PostCSS plugin을 explicit root config로 등록합니다.

#### 해당 SHA에서 확인할 실제 코드

- parent에 `@tailwindcss/postcss` dependency는 있지만 root `postcss.config.mjs`가 없는지 구분합니다.
- 새 config의 export shape와 plugin key를 확인하고 Next production build가 conventional root config를 발견하는 경로를 추적합니다.
- source CSS가 parse되더라도 utility output이 없는 structurally valid/visually broken artifact 가능성을 기록합니다.
- 이 SHA에 direct regression test가 없고 후속 broad production visual checks가 간접 보호만 제공한다는 점을 명시합니다.

확인 원칙:

- 먼저 `1de3d36e3a48^`와 `1de3d36e3a48`를 비교하고, 필요한 file은 `1de3d36e3a48:<path>`의 resulting tree에서 읽습니다.
- Final HEAD의 workflow, script, Dockerfile 또는 generated output을 이 commit에 소급하지 않습니다.
- Commit subject나 body만으로 behavior를 추정하지 않고 실제 changed code/test/config를 기준으로 판단합니다.
- 실제 실행하지 않은 command 결과는 code inspection과 분리합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 전달 상태와 부족함 | `@tailwindcss/postcss` package는 설치돼 있었지만 root PostCSS configuration이 없었습니다. dependency 존재만으로 Next build가 plugin을 호출하지 않으므로 Tailwind import/utility가 production CSS로 확장되지 않을 수 있었습니다. |
| 실제 변경 file/symbol/command/artifact | root `postcss.config.mjs`를 추가해 `plugins: { "@tailwindcss/postcss": {} }`를 export합니다. application component나 stylesheet source는 변경하지 않습니다. |
| Build/runtime/resource owner와 lifetime | CSS transform activation의 owner가 implicit tooling assumption에서 repository root config로 이동합니다. Next development, production build, Lighthouse와 bundle measurement가 같은 config discovery path를 사용합니다. |
| Failure·missing output·cleanup 처리 | config가 없거나 plugin key가 틀리면 source/build가 일부 성공해도 utility layer가 누락된 visually broken artifact가 나올 수 있습니다. 이 commit 자체에는 config contract unit test나 snapshot이 없습니다. |
| 보장하는 것과 보장하지 않는 것 | canonical Next/PostCSS path가 Tailwind plugin을 명시적으로 등록합니다. 모든 utility가 사용 의도대로 생성되는지, visual snapshot이 통과하는지, browser별 rendering이 동일한지는 이 SHA만으로 보장하지 않습니다. |
| 다음 delivery commit 또는 관련 test 연결 | 후속 production visual regression suite와 Lighthouse/CI가 broad artifact 결과를 검사하지만, PostCSS config 하나만을 격리한 direct test는 branch에 없습니다. Thread 4의 CI activation 전에 이 fix가 들어가므로 performance 수치가 styling이 빠진 artifact를 기준으로 확정되는 위험을 줄입니다. |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** Parent root에는 `postcss.config.mjs`가 없습니다.
- **해당 SHA 핵심 코드:** `1de3d36e3a485830b0a459cbc9dc9748ca15d763` · `postcss.config.mjs`

```text
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

- **관찰 근거의 성격:** Exact-SHA에서 새로 추가된 root build configuration입니다.
- **실행·테스트 증거:** 실행하지 않음. 현재 작업 환경에서는 `web/portfolio`의 Git checkout, npm dependency tree, Chromium 및 Docker daemon을 사용할 수 없었습니다. GitHub connector로 해당 SHA의 commit diff와 resulting source를 검사했으며, command 성공 결과는 주장하지 않습니다.
- **다음 commit 연결:** 후속 production visual regression suite와 Lighthouse/CI가 broad artifact 결과를 검사하지만, PostCSS config 하나만을 격리한 direct test는 branch에 없습니다. Thread 4의 CI activation 전에 이 fix가 들어가므로 performance 수치가 styling이 빠진 artifact를 기준으로 확정되는 위험을 줄입니다.

## 6. Invariant ledger

| Invariant | 이전 상태 | 도입·수정 | 검증·소비 | 남은 비보장 |
| --- | --- | --- | --- | --- |
| Font acquisition | build-time provider fetch | `7872e1214de7`에서 binary/license/provenance를 repository로 이동 | `2f65f6a6fcb6`이 source/path/magic/license를 보호 | hash·glyph·browser rendering |
| Compiler output format | production compiler default | `404a220e5d40`에서 webpack을 package script에 고정 | Thread 4 parser/contract test가 소비 | Next internal format의 future 변화 |
| Framework/native resolution | 16.2.4 patch line | `5d903132306a`에서 16.2.11과 GNU/musl metadata로 정렬 | 후속 npm install/build/container가 같은 lockfile 사용 | CVE-specific behavior·multiarch 실행 |
| CSS transform | plugin 설치만 존재 | `1de3d36e3a48`에서 root PostCSS config가 plugin 호출을 소유 | 후속 broad production visual/performance path가 결과를 소비 | direct config regression test |

## 7. Failure → Fix → Test 연결

| Failure 또는 위험 | Fix/decision | Test·gate evidence | 한계 |
| --- | --- | --- | --- |
| 외부 font endpoint가 차단된 build | local WOFF2 + `next/font/local` | `local-fonts.test.ts`의 source/file contract | 실제 build/browser는 별도 |
| framework default compiler drift | `next build --webpack` | Thread 4의 exact script/parser fixture test | 직접 `next build` 호출은 우회 가능 |
| OS/libc에 맞지 않는 SWC resolution | matching 16.2.11 lockfile + libc constraints | install/build downstream에서만 드러남 | dedicated native matrix 없음 |
| Tailwind plugin 미호출로 utility CSS 누락 | root PostCSS config | 후속 broad visual regression이 간접 검출 | 이 commit에 direct test 없음 |

## 8. Ownership / state / responsibility 변화

| 대상 | 이전 owner/state | 중간 변화 | 최종 owner/state |
| --- | --- | --- | --- |
| Font bytes/provenance | external provider | `src/app/fonts/**`와 `FONT_SOURCES.md` | layout registration + CSS variables |
| Compiler selection | Next production default | `package.json` canonical build script | performance parser/test가 계약 소비 |
| Native compiler package | 기존 lock resolution | patched package/lock graph와 libc metadata | npm platform selection |
| CSS transform activation | dependency가 암묵적으로 동작한다는 가정 | root `postcss.config.mjs` | 모든 Next build consumer |

## 9. Thread 최종 상태

font binary와 legal/source record는 repository 안에 있고, production build는 webpack과 patched Next/SWC graph를 명시하며, Tailwind transform은 root config로 활성화됩니다. 이는 fresh build portability를 크게 좁히지만 npm registry, base image, OS toolchain과 실제 browser rendering을 완전히 offline/self-contained하게 만들지는 않습니다.

## 10. 최종 product-delivery flow 정리

npm이 pinned framework/SWC graph를 platform 조건에 맞게 설치 → `npm run build`가 webpack을 선택 → Next가 root PostCSS config로 Tailwind를 변환 → `next/font/local`이 repository WOFF2를 build output에 포함 → downstream production/measurement/container 경로가 같은 artifact를 소비합니다.

## 11. 학습 완료 자가 점검

- [x] font binary, source record, license와 layout/CSS consumer ownership을 연결했습니다.
- [x] webpack pin과 manifest parser contract의 cross-thread 관계를 설명했습니다.
- [x] Next patch update의 security subject를 CVE-specific 주장으로 확대하지 않았습니다.
- [x] Tailwind fix의 direct regression test 부재와 broad verification 범위를 구분했습니다.
- [ ] Exact-SHA runtime command를 직접 실행해 결과를 기록했습니다. — 실행하지 않음. 현재 작업 환경에서는 `web/portfolio`의 Git checkout, npm dependency tree, Chromium 및 Docker daemon을 사용할 수 없었습니다. GitHub connector로 해당 SHA의 commit diff와 resulting source를 검사했으며, command 성공 결과는 주장하지 않습니다.
