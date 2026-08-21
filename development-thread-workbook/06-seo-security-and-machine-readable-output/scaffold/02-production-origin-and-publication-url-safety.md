# Thread: Production origin and publication URL safety

> Project: 42 Archive Portfolio (`web/portfolio`)
>
> Category: `06-seo-security-and-machine-readable-output`
>
> Phase 1 audit에서 확정한 구조입니다. Phase 2는 이 문서의 fixed fields와 commit sequence를 변경하지 않습니다.

## 0. 분류 출처와 역사 범위

- Repository/branch scope는 `seungwoo7050/42-archive`의 `web/portfolio`로 한정합니다.
- `commit/commit-importance.md` on `web/portfolio` describes the branch as one independent, linear 476-commit history from `cce7dd020563` through `aff0acdd4cf9`. Every SHA below was matched to that branch-local classification and its exact commit object/diff.
- Subject, importance, tags는 branch-local source classification과 일치시켰습니다.
- 아래 role, investigation target, invariant는 Phase 1 category audit에서 repository evidence에 맞춰 동결했습니다.
- 다른 branch 또는 final HEAD를 과거 SHA 설명에 사용하지 않습니다.

## 1. Thread 목표

Permissive template content와 실제 공개 가능한 production content를 분리하고, public origin, placeholder removal, assets, project exits, contact method가 모두 충족된 경우에만 verified production result를 반환하는 fail-closed publication boundary를 복원합니다.

### Phase 1 boundary decision

기존 draft는 `428055be3e64`의 predicates만 link-security Thread 끝에 두어 실제 owner와 lifecycle을 잃었습니다. Phase 1에서는 mode/error model부터 prebuild integration과 regression test까지 독립 Thread로 분리하고, 중간 B-level placeholder scanner와 S-level aggregate validator를 복원했습니다.

### Frozen critical invariants

- Missing/empty/`template` mode는 template이며 exact `production`만 strict publication을 요청합니다.
- Production `SITE_URL`은 absolute public HTTP(S)이고 local/reserved/credential-bearing origin이 아닙니다.
- Production result는 all-source placeholder scan, required `/content/` assets, enabled project public exit, usable contact가 모두 성공한 뒤에만 verified `URL`을 포함합니다.
- Readiness failure는 first-error가 아니라 file/path/message issue list로 누적됩니다.
- Normal `npm run build`는 schema check 뒤 readiness check를 반드시 실행합니다.

### Major engineering difficulties

- Starter template를 local preview에서는 허용하되 production publication에서는 fail closed로 바꾸는 문제
- URL syntax, public host policy, asset namespace, project/contact domain rules를 하나의 discriminated result로 모으는 문제
- Validation library의 failure를 CLI exit status와 build lifecycle에 정확히 전달하는 문제

## 2. 핵심 질문

- Mode resolver가 허용하는 정확한 input set과 invalid value behavior는 무엇입니까?
- Placeholder scanner는 어떤 source/file map과 JSON path formatter를 사용합니까?
- `parsePublicSiteUrl`과 `isUsablePublicUrl`의 accept/reject policy는 어디가 다릅니까?
- S-level aggregate validator가 성공하기 전후 ownership과 return type은 어떻게 달라집니까?
- Prebuild gate를 우회할 수 있는 invocation과 test가 증명하지 않는 범위는 무엇입니까?

## 3. 완료 기준

- Mode → scanner → origin/link predicates → aggregate validator → domain completeness → build gate 순서를 설명했습니다.
- S-level `002b642d52a3`의 previous risk, fail-closed decision, discriminated result, remaining gaps를 깊게 기록했습니다.
- `isUsablePublicUrl`이 production `SITE_URL` validator와 동일하지 않은 구체적 non-guarantee를 확인했습니다.
- `fb3d18fd660b`의 fixture transformation과 boundary tests를 production paths에 연결했습니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | Frozen role |
| --- | --- | --- | --- | --- | --- |
| 1 | `b3bd671a3243` | feat(content): 콘텐츠 mode와 readiness 오류 모델 추가 | A | CONTENT, VALIDATION | Define conservative mode and structured readiness protocol |
| 2 | `741bbb4caab7` | feat(content): template placeholder 탐색 경계 추가 | B | CONTENT, ROUTING | Add recursive placeholder discovery with source-aware paths |
| 3 | `47b99d6256ef` | feat(content): public origin과 자산 경계 검증 추가 | A | CONTENT, VALIDATION | Validate public production origin and `/content/` asset namespace |
| 4 | `428055be3e64` | feat(content): 공개 URL과 연락 링크 검증 추가 | A | CONTENT, VALIDATION | Define deployable project/contact URL predicates |
| 5 | `002b642d52a3` | feat(content): production readiness 기본 검사 추가 | S | ARCH, CONTENT, VALIDATION | Establish the aggregate fail-closed production trust boundary |
| 6 | `bcd87ed856bf` | feat(content): 필수 자산과 프로젝트 readiness 추가 | A | CONTENT, VALIDATION | Extend production result with portfolio-specific evidence completeness |
| 7 | `71e7ece7208f` | feat(content): 연락 수단과 build readiness 연결 | A | CONTENT, VALIDATION, DEPLOY | Complete domain readiness and expose one mode-aware entry point |
| 8 | `37c0dbc079ff` | build(content): readiness 검사를 prebuild에 연결 | A | CONTENT, VALIDATION, DEPLOY | Make readiness mandatory for the normal npm build lifecycle |
| 9 | `fb3d18fd660b` | test(content): readiness와 indexing 계약 검증 | A | CONTENT, VALIDATION, SEO | Regression-test the complete readiness result and public-origin boundary |

## 5. Commit별 학습 기록

### `b3bd671a3243` — feat(content): 콘텐츠 mode와 readiness 오류 모델 추가

- **Importance:** A
- **Tags:** CONTENT, VALIDATION
- **Frozen role:** Define conservative mode and structured readiness protocol

#### 해당 SHA에서 확인할 실제 코드

- `PortfolioContentMode`, `PortfolioReadinessEnvironment`, issue/result unions를 확인합니다.
- `PortfolioReadinessError`의 message formatting과 retained `issues` ownership을 확인합니다.
- `resolvePortfolioContentMode`가 undefined/empty/template/production/other를 처리하는 branch를 표로 만듭니다.
- 실제 production checks가 아직 없다는 protocol/implementation boundary를 기록합니다.

확인 원칙:

- `b3bd671a3243^`와 `b3bd671a3243`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-b3bd671a3243 -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/owner |  |
| Failure·absence·fallback |  |
| 보장/비보장 |  |
| 후속 연결 |  |

#### 코드·실행 증거

- **코드 발췌:** 
- **실행한 명령과 결과:** 
- **다음 commit 연결:**
<!-- learner:end commit-b3bd671a3243 -->


### `741bbb4caab7` — feat(content): template placeholder 탐색 경계 추가

- **Importance:** B
- **Tags:** CONTENT, ROUTING
- **Frozen role:** Add recursive placeholder discovery with source-aware paths

#### 해당 SHA에서 확인할 실제 코드

- `contentFiles`가 every `PortfolioSource` key를 exact source filename에 매핑하는지 확인합니다.
- `placeholderMarkers`의 regex와 false-positive/false-negative 가능성을 기록합니다.
- `appendPath`가 identifier key, quoted key, array index를 어떻게 표현하는지 확인합니다.
- `collectPlaceholderIssues`의 string/array/object recursion과 non-object terminal behavior를 추적합니다.

확인 원칙:

- `741bbb4caab7^`와 `741bbb4caab7`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-741bbb4caab7 -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/owner |  |
| Failure·absence·fallback |  |
| 보장/비보장 |  |
| 후속 연결 |  |

#### 코드·실행 증거

- **코드 발췌:** 
- **실행한 명령과 결과:** 
- **다음 commit 연결:**
<!-- learner:end commit-741bbb4caab7 -->


### `47b99d6256ef` — feat(content): public origin과 자산 경계 검증 추가

- **Importance:** A
- **Tags:** CONTENT, VALIDATION
- **Frozen role:** Validate public production origin and `/content/` asset namespace

#### 해당 SHA에서 확인할 실제 코드

- `isReservedHostname`의 exact domain/suffix set을 확인합니다.
- `parsePublicSiteUrl`의 missing, parse error, protocol, local, reserved, credentials branches를 확인합니다.
- `resolveProductionSiteUrl`이 issue array를 `PortfolioReadinessError`로 바꾸는 path를 확인합니다.
- URL path/query/hash를 명시적으로 거부하거나 normalize하는지 확인해 non-guarantee에 기록합니다.

확인 원칙:

- `47b99d6256ef^`와 `47b99d6256ef`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-47b99d6256ef -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/owner |  |
| Failure·absence·fallback |  |
| 보장/비보장 |  |
| 후속 연결 |  |

#### 코드·실행 증거

- **코드 발췌:** 
- **실행한 명령과 결과:** 
- **다음 commit 연결:**
<!-- learner:end commit-47b99d6256ef -->


### `428055be3e64` — feat(content): 공개 URL과 연락 링크 검증 추가

- **Importance:** A
- **Tags:** CONTENT, VALIDATION
- **Frozen role:** Define deployable project/contact URL predicates

#### 해당 SHA에서 확인할 실제 코드

- `isUsablePublicUrl`의 placeholder, URL parse, protocol, reserved-host conditions를 확인합니다.
- `isUsableContactHref`가 `mailto:`/`tel:`과 public URL을 어떻게 합성하는지 확인합니다.
- `parsePublicSiteUrl`과 달리 local host/credentials를 재검사하는지 비교합니다.
- 이 commit 시점에 predicates의 production caller가 있는지 확인합니다.

확인 원칙:

- `428055be3e64^`와 `428055be3e64`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-428055be3e64 -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/owner |  |
| Failure·absence·fallback |  |
| 보장/비보장 |  |
| 후속 연결 |  |

#### 코드·실행 증거

- **코드 발췌:** 
- **실행한 명령과 결과:** 
- **다음 commit 연결:**
<!-- learner:end commit-428055be3e64 -->


### `002b642d52a3` — feat(content): production readiness 기본 검사 추가

- **Importance:** S
- **Tags:** ARCH, CONTENT, VALIDATION
- **Frozen role:** Establish the aggregate fail-closed production trust boundary

#### 해당 SHA에서 확인할 실제 코드

- `ProductionReadinessResult`가 union에서 production branch만 추출하는 방식을 확인합니다.
- `validateProductionReadiness`의 issue initialization → origin parse → all-source scan → single failure boundary → success return 순서를 추적합니다.
- Previous helpers가 isolated utilities에서 one authoritative publication result로 바뀌는 ownership transition을 기록합니다.
- 이 SHA에서 아직 asset/project/contact completeness가 없는 gap을 명시합니다.

확인 원칙:

- `002b642d52a3^`와 `002b642d52a3`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-002b642d52a3 -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/owner |  |
| Failure·absence·fallback |  |
| 보장/비보장 |  |
| 후속 연결 |  |

#### 코드·실행 증거

- **코드 발췌:** 
- **실행한 명령과 결과:** 
- **다음 commit 연결:**
<!-- learner:end commit-002b642d52a3 -->


### `bcd87ed856bf` — feat(content): 필수 자산과 프로젝트 readiness 추가

- **Importance:** A
- **Tags:** CONTENT, VALIDATION
- **Frozen role:** Extend production result with portfolio-specific evidence completeness

#### 해당 SHA에서 확인할 실제 코드

- site social image, profile photo, resume download의 presence와 `/content/` checks를 확인합니다.
- enabled projects filtering과 zero-project failure를 확인합니다.
- 각 enabled project의 screenshot collection과 `isUsablePublicUrl` link requirement를 추적합니다.
- disabled project가 왜 skip되는지 publication surface와 연결합니다.

확인 원칙:

- `bcd87ed856bf^`와 `bcd87ed856bf`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-bcd87ed856bf -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/owner |  |
| Failure·absence·fallback |  |
| 보장/비보장 |  |
| 후속 연결 |  |

#### 코드·실행 증거

- **코드 발췌:** 
- **실행한 명령과 결과:** 
- **다음 commit 연결:**
<!-- learner:end commit-bcd87ed856bf -->


### `71e7ece7208f` — feat(content): 연락 수단과 build readiness 연결

- **Importance:** A
- **Tags:** CONTENT, VALIDATION, DEPLOY
- **Frozen role:** Complete domain readiness and expose one mode-aware entry point

#### 해당 SHA에서 확인할 실제 코드

- `hasContactMethod`의 enabled, placement, type, href predicate conditions를 확인합니다.
- No usable contact issue의 source/path를 확인합니다.
- `validateBuildReadiness`의 template early return과 production delegation을 확인합니다.
- Helper exports가 private로 축소되는 ownership cleanup을 확인합니다.

확인 원칙:

- `71e7ece7208f^`와 `71e7ece7208f`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-71e7ece7208f -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/owner |  |
| Failure·absence·fallback |  |
| 보장/비보장 |  |
| 후속 연결 |  |

#### 코드·실행 증거

- **코드 발췌:** 
- **실행한 명령과 결과:** 
- **다음 commit 연결:**
<!-- learner:end commit-71e7ece7208f -->


### `37c0dbc079ff` — build(content): readiness 검사를 prebuild에 연결

- **Importance:** A
- **Tags:** CONTENT, VALIDATION, DEPLOY
- **Frozen role:** Make readiness mandatory for the normal npm build lifecycle

#### 해당 SHA에서 확인할 실제 코드

- `package.json`의 `prebuild`, `content:check`, `content:ready` scripts와 shell short-circuit order를 확인합니다.
- `scripts/validate-content-readiness.ts`의 source load, env read, result logging을 확인합니다.
- Known readiness error는 `process.exitCode = 1`, unexpected error는 rethrow되는 branch를 확인합니다.
- `npm run build`와 direct `next build`의 lifecycle 차이를 non-guarantee로 기록합니다.

확인 원칙:

- `37c0dbc079ff^`와 `37c0dbc079ff`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-37c0dbc079ff -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/owner |  |
| Failure·absence·fallback |  |
| 보장/비보장 |  |
| 후속 연결 |  |

#### 코드·실행 증거

- **코드 발췌:** 
- **실행한 명령과 결과:** 
- **다음 commit 연결:**
<!-- learner:end commit-37c0dbc079ff -->


### `fb3d18fd660b` — test(content): readiness와 indexing 계약 검증

- **Importance:** A
- **Tags:** CONTENT, VALIDATION, SEO
- **Frozen role:** Regression-test the complete readiness result and public-origin boundary

#### 해당 SHA에서 확인할 실제 코드

- `replaceTemplateMarkers`와 `createProductionReadyContent`의 deterministic fixture construction을 확인합니다.
- Mode default/invalid, template bypass, aggregate categories, success result, invalid SITE_URL tests를 분류합니다.
- Assertions가 exact issue order보다 category/path presence를 검사하는 이유와 한계를 기록합니다.
- 같은 commit의 `site-metadata.test.ts`는 indexing Thread에서 별도 관점으로 확인합니다.

확인 원칙:

- `fb3d18fd660b^`와 `fb3d18fd660b`의 parent diff와 resulting tree를 기준으로 합니다.
- Later commit이나 final HEAD의 helper/test를 이 SHA에 소급하지 않습니다.
- 실행하지 않은 runtime result와 정적 inspection을 구분합니다.

#### 학습 기록

<!-- learner:start commit-fb3d18fd660b -->
| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/owner |  |
| Failure·absence·fallback |  |
| 보장/비보장 |  |
| 후속 연결 |  |

#### 코드·실행 증거

- **코드 발췌:** 
- **실행한 명령과 결과:** 
- **다음 commit 연결:**
<!-- learner:end commit-fb3d18fd660b -->


## 6. Invariant evolution

<!-- learner:start thread-invariant-evolution -->
| Commit/구간 | 상태 | 학습자 기록 |
| --- | --- | --- |
| b3bd671a3243 | Introduced |  |
| 741bbb4caab7 | Extended |  |
| 47b99d6256ef → 428055be3e64 | Extended |  |
| 002b642d52a3 | Architecturally enforced |  |
| bcd87ed856bf → 71e7ece7208f | Completed |  |
| 37c0dbc079ff | Integrated |  |
| fb3d18fd660b | Deterministically verified |  |
<!-- learner:end thread-invariant-evolution -->

## 7. Failure → Fix → Test 관계

<!-- learner:start thread-failure-fix-test -->
| Failure/위험 | Fix/결정 | Test/증거 |
| --- | --- | --- |
| Schema-valid template could be published |  |  |
| Origin/helper policies could be used partially |  |  |
| Publication could lack evidence/exits/contact |  |  |
<!-- learner:end thread-failure-fix-test -->

## 8. Ownership/state/responsibility 변화

<!-- learner:start thread-ownership -->
| 시점 | Owner | 책임 변화 |
| --- | --- | --- |
| Before |  |  |
| b3bd → 428 |  |  |
| 002 |  |  |
| 71 |  |  |
| 37 |  |  |
<!-- learner:end thread-ownership -->

## 9. 최종 Thread 상태와 실행 흐름

<!-- learner:start thread-final-state -->
- **최종 상태:** 
- **코드 없는 실행 흐름:**
  1. 
  2. 
  3.
<!-- learner:end thread-final-state -->

## 10. Learning completion check

<!-- learner:start thread-completion-check -->
- [ ] 각 SHA의 exact diff/tree를 확인했습니다.
- [ ] 보장과 비보장을 구분했습니다.
- [ ] test technique과 proves/does-not-prove를 구분했습니다.
- [ ] 최종 흐름을 코드 없이 설명할 수 있습니다.
<!-- learner:end thread-completion-check -->
