# Thread: Standalone artifact contract and CI verification

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

Next production build를 source tree나 전체 development dependency graph가 아닌 standalone server artifact로 전달할 수 있게 만들고, 그 artifact의 최소 file-layout contract를 local command와 CI가 동일하게 검증하도록 복원합니다.

### 계획된 핵심 invariant

- `next.config.ts`는 standalone output 생성을 명시합니다.
- post-build verification은 `.next/standalone/server.js`와 `.next/static`의 존재를 fail-closed로 요구합니다.
- CI는 production E2E가 만든 동일한 `.next` tree에 local `build:verify` command를 적용합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- `output: "standalone"`이 생성하는 artifact와 별도로 복사해야 하는 static/public 자산은 무엇인가?
- file existence 검증은 어떤 missing state를 잡고, 실행 가능성·내용·public asset에 대해서는 무엇을 증명하지 못하는가?
- CI가 build를 두 번 수행하는지, 아니면 production E2E의 output을 재사용하는지 step ordering으로 확인할 수 있는가?
- 이 Thread의 artifact contract가 다음 Docker Thread에 어떻게 handoff되는가?

## 3. 완료 기준

- 각 SHA의 parent diff와 resulting tree에서 실제 변경 file, function, config, script와 workflow step을 확인했습니다.
- Source, generated artifact, CI gate, container/runtime owner를 구분했습니다.
- Missing artifact, portability failure, threshold violation, startup failure와 cleanup branch를 기록했습니다.
- Test/CI command의 technique, production path, proves/does-not-prove와 실제 실행 여부를 구분했습니다.
- 최종 product-delivery 흐름과 cross-thread handoff를 코드 없이 설명할 수 있습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | 확장 thread에서 확인할 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `29508f4668ea` | build: standalone server 산출물 생성 | B | DEPLOY | artifact 형식 선택 — Next.js가 traced runtime dependency를 포함한 standalone server bundle을 생성하도록 설정합니다. |
| 2 | `c0f7434467a0` | test(build): standalone 산출물 완전성 검증 | A | VALIDATION, DEPLOY, TEST | artifact shape regression — server entry와 generated static directory의 존재를 explicit command로 검사합니다. |
| 3 | `c5e73853a1b6` | ci: standalone 산출물 검증 추가 | A | VALIDATION, DEPLOY, TEST | CI promotion — production E2E build output에 standalone completeness command를 적용합니다. |

## 5. Commit별 학습 기록

각 section은 반드시 해당 SHA의 tree와 parent diff를 기준으로 작성합니다. 다른 Thread의 later commit은 관계 설명에만 사용하고 과거 구현에 소급하지 않습니다.

### 1. `29508f4668ea` — build: standalone server 산출물 생성

- **Full SHA:** `29508f4668eaed37c393c8c2ef2e80d0e6c8e2f2`
- **Importance:** B
- **Tags:** DEPLOY
- **확장 thread에서의 역할:** artifact 형식 선택 — Next.js가 traced runtime dependency를 포함한 standalone server bundle을 생성하도록 설정합니다.

#### 해당 SHA에서 확인할 실제 코드

- `next.config.ts`의 parent/resulting tree를 비교해 `output: "standalone"`이 유일한 behavior change인지 확인합니다.
- generated `.next/standalone`은 source control에 commit되지 않고 build가 소유하는 ephemeral output이라는 점을 기록합니다.
- standalone output만으로 `.next/static`과 `public`이 자동 포함되는지 후속 commits의 copy/verify logic으로 확인합니다.
- 이 SHA에는 artifact existence test나 runtime launch가 없다는 범위를 명시합니다.

확인 원칙:

- 먼저 `29508f4668ea^`와 `29508f4668ea`를 비교하고, 필요한 file은 `29508f4668ea:<path>`의 resulting tree에서 읽습니다.
- Final HEAD의 workflow, script, Dockerfile 또는 generated output을 이 commit에 소급하지 않습니다.
- Commit subject나 body만으로 behavior를 추정하지 않고 실제 changed code/test/config를 기준으로 판단합니다.
- 실제 실행하지 않은 command 결과는 code inspection과 분리합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 전달 상태와 부족함 | Next production build는 가능했지만 deployment용 traced standalone server bundle을 생성하라는 repository configuration이 없었습니다. 전달자가 전체 project/node_modules를 어떻게 배치할지 암묵적으로 결정해야 했습니다. |
| 실제 변경 file/symbol/command/artifact | `next.config.ts`의 `nextConfig`에 `output: "standalone"`을 추가했습니다. |
| Build/runtime/resource owner와 lifetime | artifact generation의 owner는 Next build configuration과 `npm run build`입니다. `.next/standalone`은 generated directory이며 repository source가 소유하지 않습니다. |
| Failure·missing output·cleanup 처리 | build가 실패하면 artifact가 생성되지 않지만, 이 SHA에는 missing/partial output을 별도로 검사하는 script가 없습니다. standalone server가 실제로 시작되는지도 검증하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | canonical build가 standalone output mode를 요청합니다. generated file의 존재·완전성, static/public asset 포함, runtime response는 아직 보장하지 않습니다. |
| 다음 delivery commit 또는 관련 test 연결 | `c0f7434467a0`이 최소 required artifact를 검사하고, Thread 5의 Dockerfile이 standalone server와 static/public을 명시적으로 분리해 복사합니다. |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** `nextConfig`에는 `devIndicators: false`만 있고 `output` 설정이 없습니다.
- **해당 SHA 핵심 코드:** `29508f4668eaed37c393c8c2ef2e80d0e6c8e2f2` · `next.config.ts`

```text
const nextConfig: NextConfig = {
  devIndicators: false,
  output: "standalone",
};
```

- **관찰 근거의 성격:** Exact-SHA config diff에서 직접 확인한 generated artifact mode입니다.
- **실행·테스트 증거:** 실행하지 않음. 현재 작업 환경에서는 `web/portfolio`의 Git checkout, npm dependency tree, Chromium 및 Docker daemon을 사용할 수 없었습니다. GitHub connector로 해당 SHA의 commit diff와 resulting source를 검사했으며, command 성공 결과는 주장하지 않습니다.
- **다음 commit 연결:** `c0f7434467a0`이 최소 required artifact를 검사하고, Thread 5의 Dockerfile이 standalone server와 static/public을 명시적으로 분리해 복사합니다.

### 2. `c0f7434467a0` — test(build): standalone 산출물 완전성 검증

- **Full SHA:** `c0f7434467a051f93273a7e850d7bf94cc97a215`
- **Importance:** A
- **Tags:** VALIDATION, DEPLOY, TEST
- **확장 thread에서의 역할:** artifact shape regression — server entry와 generated static directory의 존재를 explicit command로 검사합니다.

#### 해당 SHA에서 확인할 실제 코드

- `package.json`의 `build:verify`와 `scripts/verify-build-output.mjs`의 `requiredArtifacts` 배열을 확인합니다.
- `existsSync(resolve(...))`가 file/directory type이나 내용이 아니라 path existence만 확인한다는 technique를 분류합니다.
- missing path를 모두 수집해 한 error에 출력하는 failure shape와 success log를 기록합니다.
- `public` directory와 standalone server launch가 검사 목록에 없는 이유를 후속 Docker contract와 연결합니다.

확인 원칙:

- 먼저 `c0f7434467a0^`와 `c0f7434467a0`를 비교하고, 필요한 file은 `c0f7434467a0:<path>`의 resulting tree에서 읽습니다.
- Final HEAD의 workflow, script, Dockerfile 또는 generated output을 이 commit에 소급하지 않습니다.
- Commit subject나 body만으로 behavior를 추정하지 않고 실제 changed code/test/config를 기준으로 판단합니다.
- 실제 실행하지 않은 command 결과는 code inspection과 분리합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 전달 상태와 부족함 | standalone output mode는 설정됐지만 build가 부분적으로 끝나거나 expected layout이 바뀌어도 repository command가 이를 명시적으로 판정하지 않았습니다. |
| 실제 변경 file/symbol/command/artifact | `build:verify` script와 `scripts/verify-build-output.mjs`를 추가했습니다. `.next/standalone/server.js`와 `.next/static`을 `existsSync`로 확인하고, 누락된 모든 path를 나열해 exception을 던집니다. |
| Build/runtime/resource owner와 lifetime | verification script가 required path list와 pass/fail 결정을 소유합니다. existing build output을 read-only로 검사하며 artifact를 생성·수정·정리하지 않습니다. |
| Failure·missing output·cleanup 처리 | 둘 중 하나라도 없으면 `Standalone build output is incomplete` error와 missing list로 process가 실패합니다. path가 존재하기만 하면 통과하므로 file type, server syntax, static content, permissions, public assets와 runtime startup은 검사하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | 두 deployment-critical path의 부재는 deterministic post-build failure가 됩니다. artifact가 실제로 독립 실행되거나 올바른 response를 제공한다는 보장은 아닙니다. |
| 다음 delivery commit 또는 관련 test 연결 | `c5e73853a1b6`이 exact `npm run build:verify`를 CI에서 호출합니다. Docker builder도 이후 `npm run build && npm run build:verify`를 image 생성 전 조건으로 재사용합니다. |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** Parent에는 `build:verify` script와 `scripts/verify-build-output.mjs`가 없습니다.
- **해당 SHA 핵심 코드:** `c0f7434467a051f93273a7e850d7bf94cc97a215` · `scripts/verify-build-output.mjs`

```text
if (missing.length > 0) {
  throw new Error(
    `Standalone build output is incomplete:\n${missing
      .map((artifact) => `- ${artifact}`)
      .join("\n")}`,
  );
}

console.log(`verified ${requiredArtifacts.length} portfolio build artifacts`);
```

- **관찰 근거의 성격:** Exact-SHA script implementation에서 직접 확인한 path-existence test입니다.
- **실행·테스트 증거:** 실행하지 않음. 현재 작업 환경에서는 `web/portfolio`의 Git checkout, npm dependency tree, Chromium 및 Docker daemon을 사용할 수 없었습니다. GitHub connector로 해당 SHA의 commit diff와 resulting source를 검사했으며, command 성공 결과는 주장하지 않습니다.
- **다음 commit 연결:** `c5e73853a1b6`이 exact `npm run build:verify`를 CI에서 호출합니다. Docker builder도 이후 `npm run build && npm run build:verify`를 image 생성 전 조건으로 재사용합니다.

### 3. `c5e73853a1b6` — ci: standalone 산출물 검증 추가

- **Full SHA:** `c5e73853a1b69e39561748435f4768109a368544`
- **Importance:** A
- **Tags:** VALIDATION, DEPLOY, TEST
- **확장 thread에서의 역할:** CI promotion — production E2E build output에 standalone completeness command를 적용합니다.

#### 해당 SHA에서 확인할 실제 코드

- `.github/workflows/ci.yml`에서 새 step이 `Build and run production E2E tests` 뒤에 위치하는지 확인합니다.
- 새 step이 rebuild하지 않고 앞 step이 남긴 `.next`를 `npm run build:verify`로 검사한다는 artifact handoff를 기록합니다.
- 앞 E2E 실패 시 verify step에 도달하지 않는 fail-fast ordering과, E2E 성공 뒤 artifact shape가 별도 실패할 수 있는 이유를 설명합니다.
- CI가 이 시점에 `public` copy나 standalone `server.js` 직접 실행을 아직 하지 않는다는 범위를 명시합니다.

확인 원칙:

- 먼저 `c5e73853a1b6^`와 `c5e73853a1b6`를 비교하고, 필요한 file은 `c5e73853a1b6:<path>`의 resulting tree에서 읽습니다.
- Final HEAD의 workflow, script, Dockerfile 또는 generated output을 이 commit에 소급하지 않습니다.
- Commit subject나 body만으로 behavior를 추정하지 않고 실제 changed code/test/config를 기준으로 판단합니다.
- 실제 실행하지 않은 command 결과는 code inspection과 분리합니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 전달 상태와 부족함 | `build:verify`는 local opt-in command였고 CI production E2E가 성공하더라도 standalone path contract는 integration 조건이 아니었습니다. |
| 실제 변경 file/symbol/command/artifact | CI workflow에 `Verify standalone output` step을 추가해 production E2E 직후 `npm run build:verify`를 실행합니다. |
| Build/runtime/resource owner와 lifetime | 앞 production E2E step이 `.next`를 생성하고, 다음 verify step이 같은 runner workspace의 artifact를 소비합니다. workflow ordering이 producer/consumer lifetime을 소유하며 별도 persistence는 없습니다. |
| Failure·missing output·cleanup 처리 | E2E build/test가 실패하면 step에 도달하지 않습니다. E2E가 통과해도 required path가 없으면 verify command가 non-zero로 CI를 실패시킵니다. runner 종료 시 generated artifact는 폐기됩니다. |
| 보장하는 것과 보장하지 않는 것 | push/PR의 production path는 browser behavior와 standalone 최소 layout을 모두 요구합니다. standalone entry를 직접 실행하거나 public assets, image packaging, non-root user를 검증하지 않습니다. |
| 다음 delivery commit 또는 관련 test 연결 | Thread 5가 이 artifact contract를 Docker builder prerequisite로 사용하고, runtime script가 실제 HTTP response와 public assets를 검증합니다. |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** Parent workflow는 production E2E step으로 끝나며 standalone verify step이 없습니다.
- **해당 SHA 핵심 코드:** `c5e73853a1b69e39561748435f4768109a368544` · `.github/workflows/ci.yml`

```text
- name: Build and run production E2E tests
  run: npm run test:e2e:production

- name: Verify standalone output
  run: npm run build:verify
```

- **관찰 근거의 성격:** Exact-SHA workflow diff에서 직접 확인한 artifact producer/consumer order입니다.
- **실행·테스트 증거:** 실행하지 않음. 현재 작업 환경에서는 `web/portfolio`의 Git checkout, npm dependency tree, Chromium 및 Docker daemon을 사용할 수 없었습니다. GitHub connector로 해당 SHA의 commit diff와 resulting source를 검사했으며, command 성공 결과는 주장하지 않습니다.
- **다음 commit 연결:** Thread 5가 이 artifact contract를 Docker builder prerequisite로 사용하고, runtime script가 실제 HTTP response와 public assets를 검증합니다.

## 6. Invariant ledger

| Invariant | 이전 상태 | 도입·수정 | 검증·소비 | 남은 비보장 |
| --- | --- | --- | --- | --- |
| Artifact generation | 일반 Next build output | `29508f4668ea`에서 standalone mode 선택 | production build가 `.next/standalone` 생성 | 생성 성공 여부는 후속 검사 |
| Minimum layout | implicit framework assumption | `c0f7434467a0`에서 server.js + static path를 explicit list로 정의 | `c5e73853a1b6`이 CI에서 소비 | public·content·runtime response |
| CI artifact lifetime | 검증 command local-only | production E2E step이 `.next` producer | 다음 step이 같은 workspace output을 검사 | runner 밖 artifact publish |

## 7. Failure → Fix → Test 연결

| Failure 또는 위험 | Fix/decision | Test·gate evidence | 한계 |
| --- | --- | --- | --- |
| standalone mode 미설정 | `output: "standalone"` | post-build required path check | mode 설정만으로 runtime 성공은 아님 |
| partial/missing build layout | missing path aggregation + throw | CI의 `npm run build:verify` | path type/content 미검사 |
| browser test는 성공하지만 deployable layout 누락 | E2E 뒤 별도 artifact step | 동일 `.next` tree를 순차 검사 | public/container는 다음 Thread |

## 8. Ownership / state / responsibility 변화

| 대상 | 이전 owner/state | 중간 변화 | 최종 owner/state |
| --- | --- | --- | --- |
| Output format | framework default | `next.config.ts` | `npm run build` |
| Artifact completeness policy | 암묵적 | `requiredArtifacts` array | local/CI/Docker builder가 재사용 |
| Generated tree lifetime | local build directory | CI E2E step producer | verify step consumer 후 runner 폐기 |

## 9. Thread 최종 상태

production build는 standalone server mode를 요청하고, repository command와 CI는 `server.js` 및 generated static directory의 존재를 요구합니다. 이 계약은 artifact shape만 다루며 public asset copy, 직접 server startup, runtime user와 HTTP response는 다음 container Thread가 맡습니다.

## 10. 최종 product-delivery flow 정리

`next.config.ts`가 standalone mode 선택 → production E2E의 `npm run build`가 `.next` 생성 → existing browser suite가 `next start` 검증 → 같은 workspace에서 `build:verify`가 server entry/static path 확인 → CI exit status가 artifact completeness를 판정합니다.

## 11. 학습 완료 자가 점검

- [x] standalone mode 설정과 generated output ownership을 구분했습니다.
- [x] path-existence test가 증명하는 것과 증명하지 않는 것을 기록했습니다.
- [x] CI가 rebuild하지 않고 앞 step의 `.next`를 재사용함을 확인했습니다.
- [x] public assets와 actual standalone runtime이 다음 Thread 책임임을 연결했습니다.
- [ ] Exact-SHA runtime command를 직접 실행해 결과를 기록했습니다. — 실행하지 않음. 현재 작업 환경에서는 `web/portfolio`의 Git checkout, npm dependency tree, Chromium 및 Docker daemon을 사용할 수 없었습니다. GitHub connector로 해당 SHA의 commit diff와 resulting source를 검사했으며, command 성공 결과는 주장하지 않습니다.
