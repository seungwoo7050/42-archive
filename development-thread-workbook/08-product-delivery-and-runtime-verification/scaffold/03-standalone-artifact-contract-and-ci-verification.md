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
| 직전 전달 상태와 부족함 | <!-- LEARNER:29508f4668ea:previous --> |
| 실제 변경 file/symbol/command/artifact | <!-- LEARNER:29508f4668ea:changed --> |
| Build/runtime/resource owner와 lifetime | <!-- LEARNER:29508f4668ea:owner --> |
| Failure·missing output·cleanup 처리 | <!-- LEARNER:29508f4668ea:failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- LEARNER:29508f4668ea:guarantee --> |
| 다음 delivery commit 또는 관련 test 연결 | <!-- LEARNER:29508f4668ea:relation --> |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** <!-- LEARNER:29508f4668ea:before_code -->
- **해당 SHA 핵심 코드:** <!-- LEARNER:29508f4668ea:excerpt -->
- **관찰 근거의 성격:** <!-- LEARNER:29508f4668ea:evidence_kind -->
- **실행·테스트 증거:** <!-- LEARNER:29508f4668ea:execution -->
- **다음 commit 연결:** <!-- LEARNER:29508f4668ea:next -->

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
| 직전 전달 상태와 부족함 | <!-- LEARNER:c0f7434467a0:previous --> |
| 실제 변경 file/symbol/command/artifact | <!-- LEARNER:c0f7434467a0:changed --> |
| Build/runtime/resource owner와 lifetime | <!-- LEARNER:c0f7434467a0:owner --> |
| Failure·missing output·cleanup 처리 | <!-- LEARNER:c0f7434467a0:failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- LEARNER:c0f7434467a0:guarantee --> |
| 다음 delivery commit 또는 관련 test 연결 | <!-- LEARNER:c0f7434467a0:relation --> |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** <!-- LEARNER:c0f7434467a0:before_code -->
- **해당 SHA 핵심 코드:** <!-- LEARNER:c0f7434467a0:excerpt -->
- **관찰 근거의 성격:** <!-- LEARNER:c0f7434467a0:evidence_kind -->
- **실행·테스트 증거:** <!-- LEARNER:c0f7434467a0:execution -->
- **다음 commit 연결:** <!-- LEARNER:c0f7434467a0:next -->

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
| 직전 전달 상태와 부족함 | <!-- LEARNER:c5e73853a1b6:previous --> |
| 실제 변경 file/symbol/command/artifact | <!-- LEARNER:c5e73853a1b6:changed --> |
| Build/runtime/resource owner와 lifetime | <!-- LEARNER:c5e73853a1b6:owner --> |
| Failure·missing output·cleanup 처리 | <!-- LEARNER:c5e73853a1b6:failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- LEARNER:c5e73853a1b6:guarantee --> |
| 다음 delivery commit 또는 관련 test 연결 | <!-- LEARNER:c5e73853a1b6:relation --> |

#### 코드·실행 증거 기록

- **변경 전 대응 코드:** <!-- LEARNER:c5e73853a1b6:before_code -->
- **해당 SHA 핵심 코드:** <!-- LEARNER:c5e73853a1b6:excerpt -->
- **관찰 근거의 성격:** <!-- LEARNER:c5e73853a1b6:evidence_kind -->
- **실행·테스트 증거:** <!-- LEARNER:c5e73853a1b6:execution -->
- **다음 commit 연결:** <!-- LEARNER:c5e73853a1b6:next -->

## 6. Invariant ledger

| Invariant | 이전 상태 | 도입·수정 | 검증·소비 | 남은 비보장 |
| --- | --- | --- | --- | --- |
| Artifact generation | <!-- LEARNER:ledger:1:before --> | <!-- LEARNER:ledger:1:change --> | <!-- LEARNER:ledger:1:verify --> | <!-- LEARNER:ledger:1:gap --> |
| Minimum layout | <!-- LEARNER:ledger:2:before --> | <!-- LEARNER:ledger:2:change --> | <!-- LEARNER:ledger:2:verify --> | <!-- LEARNER:ledger:2:gap --> |
| CI artifact lifetime | <!-- LEARNER:ledger:3:before --> | <!-- LEARNER:ledger:3:change --> | <!-- LEARNER:ledger:3:verify --> | <!-- LEARNER:ledger:3:gap --> |

## 7. Failure → Fix → Test 연결

| Failure 또는 위험 | Fix/decision | Test·gate evidence | 한계 |
| --- | --- | --- | --- |
| standalone mode 미설정 | <!-- LEARNER:failure:1:fix --> | <!-- LEARNER:failure:1:test --> | <!-- LEARNER:failure:1:limit --> |
| partial/missing build layout | <!-- LEARNER:failure:2:fix --> | <!-- LEARNER:failure:2:test --> | <!-- LEARNER:failure:2:limit --> |
| browser test는 성공하지만 deployable layout 누락 | <!-- LEARNER:failure:3:fix --> | <!-- LEARNER:failure:3:test --> | <!-- LEARNER:failure:3:limit --> |

## 8. Ownership / state / responsibility 변화

| 대상 | 이전 owner/state | 중간 변화 | 최종 owner/state |
| --- | --- | --- | --- |
| Output format | <!-- LEARNER:owner:1:before --> | <!-- LEARNER:owner:1:middle --> | <!-- LEARNER:owner:1:final --> |
| Artifact completeness policy | <!-- LEARNER:owner:2:before --> | <!-- LEARNER:owner:2:middle --> | <!-- LEARNER:owner:2:final --> |
| Generated tree lifetime | <!-- LEARNER:owner:3:before --> | <!-- LEARNER:owner:3:middle --> | <!-- LEARNER:owner:3:final --> |

## 9. Thread 최종 상태

<!-- LEARNER:thread:final_state -->

## 10. 최종 product-delivery flow 정리

<!-- LEARNER:thread:flow -->

## 11. 학습 완료 자가 점검

- [ ] standalone mode 설정과 generated output ownership을 구분했습니다.
- [ ] path-existence test가 증명하는 것과 증명하지 않는 것을 기록했습니다.
- [ ] CI가 rebuild하지 않고 앞 step의 `.next`를 재사용함을 확인했습니다.
- [ ] public assets와 actual standalone runtime이 다음 Thread 책임임을 연결했습니다.
- [ ] Exact-SHA runtime command를 직접 실행했다면 command, environment와 실제 결과를 기록했습니다. 실행하지 못했다면 이유를 명시했습니다.
