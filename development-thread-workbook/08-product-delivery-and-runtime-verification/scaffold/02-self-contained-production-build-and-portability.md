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
| 직전 전달 상태와 부족함 | <!-- LEARNER:7872e1214de7:previous --> |
| 실제 변경 file/symbol/command/artifact | <!-- LEARNER:7872e1214de7:changed --> |
| Build/runtime/resource owner와 lifetime | <!-- LEARNER:7872e1214de7:owner --> |
| Failure·missing output·cleanup 처리 | <!-- LEARNER:7872e1214de7:failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- LEARNER:7872e1214de7:guarantee --> |
| 다음 delivery commit 또는 관련 test 연결 | <!-- LEARNER:7872e1214de7:relation --> |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** <!-- LEARNER:7872e1214de7:before_code -->
- **해당 SHA 핵심 코드:** <!-- LEARNER:7872e1214de7:excerpt -->
- **관찰 근거의 성격:** <!-- LEARNER:7872e1214de7:evidence_kind -->
- **실행·테스트 증거:** <!-- LEARNER:7872e1214de7:execution -->
- **다음 commit 연결:** <!-- LEARNER:7872e1214de7:next -->

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
| 직전 전달 상태와 부족함 | <!-- LEARNER:2f65f6a6fcb6:previous --> |
| 실제 변경 file/symbol/command/artifact | <!-- LEARNER:2f65f6a6fcb6:changed --> |
| Build/runtime/resource owner와 lifetime | <!-- LEARNER:2f65f6a6fcb6:owner --> |
| Failure·missing output·cleanup 처리 | <!-- LEARNER:2f65f6a6fcb6:failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- LEARNER:2f65f6a6fcb6:guarantee --> |
| 다음 delivery commit 또는 관련 test 연결 | <!-- LEARNER:2f65f6a6fcb6:relation --> |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** <!-- LEARNER:2f65f6a6fcb6:before_code -->
- **해당 SHA 핵심 코드:** <!-- LEARNER:2f65f6a6fcb6:excerpt -->
- **관찰 근거의 성격:** <!-- LEARNER:2f65f6a6fcb6:evidence_kind -->
- **실행·테스트 증거:** <!-- LEARNER:2f65f6a6fcb6:execution -->
- **다음 commit 연결:** <!-- LEARNER:2f65f6a6fcb6:next -->

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
| 직전 전달 상태와 부족함 | <!-- LEARNER:404a220e5d40:previous --> |
| 실제 변경 file/symbol/command/artifact | <!-- LEARNER:404a220e5d40:changed --> |
| Build/runtime/resource owner와 lifetime | <!-- LEARNER:404a220e5d40:owner --> |
| Failure·missing output·cleanup 처리 | <!-- LEARNER:404a220e5d40:failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- LEARNER:404a220e5d40:guarantee --> |
| 다음 delivery commit 또는 관련 test 연결 | <!-- LEARNER:404a220e5d40:relation --> |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** <!-- LEARNER:404a220e5d40:before_code -->
- **해당 SHA 핵심 코드:** <!-- LEARNER:404a220e5d40:excerpt -->
- **관찰 근거의 성격:** <!-- LEARNER:404a220e5d40:evidence_kind -->
- **실행·테스트 증거:** <!-- LEARNER:404a220e5d40:execution -->
- **다음 commit 연결:** <!-- LEARNER:404a220e5d40:next -->

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
| 직전 전달 상태와 부족함 | <!-- LEARNER:5d903132306a:previous --> |
| 실제 변경 file/symbol/command/artifact | <!-- LEARNER:5d903132306a:changed --> |
| Build/runtime/resource owner와 lifetime | <!-- LEARNER:5d903132306a:owner --> |
| Failure·missing output·cleanup 처리 | <!-- LEARNER:5d903132306a:failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- LEARNER:5d903132306a:guarantee --> |
| 다음 delivery commit 또는 관련 test 연결 | <!-- LEARNER:5d903132306a:relation --> |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** <!-- LEARNER:5d903132306a:before_code -->
- **해당 SHA 핵심 코드:** <!-- LEARNER:5d903132306a:excerpt -->
- **관찰 근거의 성격:** <!-- LEARNER:5d903132306a:evidence_kind -->
- **실행·테스트 증거:** <!-- LEARNER:5d903132306a:execution -->
- **다음 commit 연결:** <!-- LEARNER:5d903132306a:next -->

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
| 직전 전달 상태와 부족함 | <!-- LEARNER:1de3d36e3a48:previous --> |
| 실제 변경 file/symbol/command/artifact | <!-- LEARNER:1de3d36e3a48:changed --> |
| Build/runtime/resource owner와 lifetime | <!-- LEARNER:1de3d36e3a48:owner --> |
| Failure·missing output·cleanup 처리 | <!-- LEARNER:1de3d36e3a48:failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- LEARNER:1de3d36e3a48:guarantee --> |
| 다음 delivery commit 또는 관련 test 연결 | <!-- LEARNER:1de3d36e3a48:relation --> |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** <!-- LEARNER:1de3d36e3a48:before_code -->
- **해당 SHA 핵심 코드:** <!-- LEARNER:1de3d36e3a48:excerpt -->
- **관찰 근거의 성격:** <!-- LEARNER:1de3d36e3a48:evidence_kind -->
- **실행·테스트 증거:** <!-- LEARNER:1de3d36e3a48:execution -->
- **다음 commit 연결:** <!-- LEARNER:1de3d36e3a48:next -->

## 6. Invariant ledger

| Invariant | 이전 상태 | 도입·수정 | 검증·소비 | 남은 비보장 |
| --- | --- | --- | --- | --- |
| Font acquisition | <!-- LEARNER:ledger:1:before --> | <!-- LEARNER:ledger:1:change --> | <!-- LEARNER:ledger:1:verify --> | <!-- LEARNER:ledger:1:gap --> |
| Compiler output format | <!-- LEARNER:ledger:2:before --> | <!-- LEARNER:ledger:2:change --> | <!-- LEARNER:ledger:2:verify --> | <!-- LEARNER:ledger:2:gap --> |
| Framework/native resolution | <!-- LEARNER:ledger:3:before --> | <!-- LEARNER:ledger:3:change --> | <!-- LEARNER:ledger:3:verify --> | <!-- LEARNER:ledger:3:gap --> |
| CSS transform | <!-- LEARNER:ledger:4:before --> | <!-- LEARNER:ledger:4:change --> | <!-- LEARNER:ledger:4:verify --> | <!-- LEARNER:ledger:4:gap --> |

## 7. Failure → Fix → Test 연결

| Failure 또는 위험 | Fix/decision | Test·gate evidence | 한계 |
| --- | --- | --- | --- |
| 외부 font endpoint가 차단된 build | <!-- LEARNER:failure:1:fix --> | <!-- LEARNER:failure:1:test --> | <!-- LEARNER:failure:1:limit --> |
| framework default compiler drift | <!-- LEARNER:failure:2:fix --> | <!-- LEARNER:failure:2:test --> | <!-- LEARNER:failure:2:limit --> |
| OS/libc에 맞지 않는 SWC resolution | <!-- LEARNER:failure:3:fix --> | <!-- LEARNER:failure:3:test --> | <!-- LEARNER:failure:3:limit --> |
| Tailwind plugin 미호출로 utility CSS 누락 | <!-- LEARNER:failure:4:fix --> | <!-- LEARNER:failure:4:test --> | <!-- LEARNER:failure:4:limit --> |

## 8. Ownership / state / responsibility 변화

| 대상 | 이전 owner/state | 중간 변화 | 최종 owner/state |
| --- | --- | --- | --- |
| Font bytes/provenance | <!-- LEARNER:owner:1:before --> | <!-- LEARNER:owner:1:middle --> | <!-- LEARNER:owner:1:final --> |
| Compiler selection | <!-- LEARNER:owner:2:before --> | <!-- LEARNER:owner:2:middle --> | <!-- LEARNER:owner:2:final --> |
| Native compiler package | <!-- LEARNER:owner:3:before --> | <!-- LEARNER:owner:3:middle --> | <!-- LEARNER:owner:3:final --> |
| CSS transform activation | <!-- LEARNER:owner:4:before --> | <!-- LEARNER:owner:4:middle --> | <!-- LEARNER:owner:4:final --> |

## 9. Thread 최종 상태

<!-- LEARNER:thread:final_state -->

## 10. 최종 product-delivery flow 정리

<!-- LEARNER:thread:flow -->

## 11. 학습 완료 자가 점검

- [ ] font binary, source record, license와 layout/CSS consumer ownership을 연결했습니다.
- [ ] webpack pin과 manifest parser contract의 cross-thread 관계를 설명했습니다.
- [ ] Next patch update의 security subject를 CVE-specific 주장으로 확대하지 않았습니다.
- [ ] Tailwind fix의 direct regression test 부재와 broad verification 범위를 구분했습니다.
- [ ] Exact-SHA runtime command를 직접 실행했다면 command, environment와 실제 결과를 기록했습니다. 실행하지 못했다면 이유를 명시했습니다.
