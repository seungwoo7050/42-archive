# Thread: Content contract test harness

> Project: 42 Archive Portfolio (`web/portfolio`)
>
> Category: `07-testing-performance-and-regression-strategy`
>
> Phase 1에서 감사·수정한 뒤 동결한 scaffold를 기준으로 합니다.

## 0. 분류 출처와 변경 가능 범위

- Commit SHA, subject, importance와 tags는 branch-local `commit/commit-importance.md` 분류와 exact commit metadata를 기준으로 고정했습니다.
- 이 문서의 Thread goal, commit grouping과 source-defined 역할은 Phase 1 category audit 결과입니다.
- Phase 2에서는 SHA, 순서, subject, importance, tags, 역할, 질문과 문서 구조를 바꾸지 않습니다.
- 다른 branch 또는 final HEAD의 구현을 earlier SHA 설명에 소급하지 않습니다.
- Runtime evidence는 실제로 실행한 command만 기록하며, 미실행 상태를 통과로 해석하지 않습니다.

## 1. Thread 목표

Vitest/jsdom/Testing Library 실행 경계를 만들고 content ingestion, public selector surface, clone ownership, route projection rules를 단계적으로 executable contract로 고정하는 과정을 복원합니다.

### 동결된 핵심 invariant

- Test는 production loader·validator·selector·view-model path를 직접 호출하며 별도 모형 구현을 진실의 source로 만들지 않습니다.
- `getPortfolioContent()`가 반환하는 mutable aggregate는 호출 간 격리되고, 의도적으로 immutable한 root metadata만 reference를 공유합니다.
- Route view model은 shared shell fields와 route-specific fields만 노출하며 full `PortfolioContent` spread를 허용하지 않습니다.
- Unknown reference의 null/omission/fallback policy는 route factory에서 명시되고 renderer가 다시 검색하지 않습니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- 최초 harness는 어떤 config·setup·production path를 연결했고 malformed fixture를 어디서 주입했는가?
- Public facade 목록과 clone/reference boundary는 왜 같은 contract에서 검사되는가?
- Home, index, detail, about, resume, contact의 selection/order/fallback은 renderer 이전 어디서 결정되는가?
- Journey와 interview map의 unresolved reference는 각각 어떤 형태로 남거나 제거되는가?

## 3. 완료 기준

- 각 referenced SHA의 exact parent diff와 resulting changed files를 확인합니다.
- Commit별 previous state, implementation decision, ownership/lifetime, failure path와 non-guarantee를 구분합니다.
- Fix는 earlier assumption과 root cause에 연결하고, test는 production path·technique·proves/does-not-prove를 구분합니다.
- A-level은 subsystem·failure·verification 관계까지, B-level은 local role과 후속 연결까지만 설명합니다.
- Thread-level invariant evolution, Failure → Fix → Test, ownership transfer와 final flow를 코드 없이 설명합니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | 이 Thread에서 확인할 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `3353032ba23b` | test(content): Vitest 기반 콘텐츠 계약 검증 추가 | A | CONTENT, VALIDATION, TEST | test runner·jsdom setup과 production content contract의 최초 실행 경계 |
| 2 | `dc07871c4d24` | test(portfolio): selector와 presentation 회귀 계약 보강 | A | CONTENT, TEST | public module surface와 mutable/immutable copy ownership 회귀 계약 |
| 3 | `b77b386b344e` | test(content): route view model 파생 규칙 검증 | A | ARCH, CONTENT, VALIDATION | 여섯 route view-model factory의 selection·ordering·fallback contract |
| 4 | `527b9f872333` | test(content): scoped view model과 연락처 회귀 검증 | A | CONTENT, VALIDATION, TEST | 여덟 route의 scoped field whitelist와 unresolved-reference hardening |

## 5. Commit별 학습 기록

각 section은 해당 SHA의 tree와 parent diff만 기준으로 작성합니다. 같은 SHA가 다른 category Thread에 등장하더라도 여기서는 위 역할과 파일 범위만 설명합니다.

### 1. `3353032ba23b` — test(content): Vitest 기반 콘텐츠 계약 검증 추가

- **Full SHA:** `3353032ba23bf0890b3ac0410e3b55638bc70df6`
- **Importance:** A
- **Tags:** CONTENT, VALIDATION, TEST
- **이 Thread에서의 역할:** test runner·jsdom setup과 production content contract의 최초 실행 경계

#### 해당 SHA에서 확인할 실제 코드

- `package.json`의 `test`·`test:watch` script와 Vitest/jsdom/Testing Library devDependencies
- `vitest.config.ts`의 jsdom environment, test include pattern, `src/test/setup.ts` 연결
- `src/test/setup.ts`의 jest-dom matcher 등록
- `src/lib/portfolio.test.ts`가 `loadPortfolioSource`, `validatePortfolioAssets`, selectors와 `PortfolioContentError`를 실제로 호출하는 방식
- 정상 source와 의도적으로 변형한 fixture가 ID, cross-reference, asset, route, metric, selector failure를 어떻게 관찰하는지

#### Commit-specific investigation

- `3353032ba23b^`와 `3353032ba23b`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `test runner·jsdom setup과 production content contract의 최초 실행 경계`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
- Production path와 test path를 분리하고, state/data/resource owner와 lifetime·cleanup을 실제 symbol 기준으로 추적합니다.
- Failure/absence/fallback branch와 test technique을 구분하고, 이 SHA가 보장하지 않는 범위를 명시합니다.
- 다음 후속 관계를 대조하되 later code를 이 SHA의 구현으로 설명하지 않습니다: `dc07871c4d24`가 같은 suite에 public facade surface와 copy/reference ownership을 추가하고, 이후 `b77b...`·`527b...`가 route view-model projection contract를 별도 test file로 확장합니다.

#### 학습자 증거

| 확인·기록 항목 | 기록 |
| --- | --- |
| 직전 state와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner와 lifetime |  |
| Failure·absence·fallback·cleanup |  |
| Test technique와 실행 증거 |  |
| 보장하는 것 |  |
| 보장하지 않는 것 |  |
| 다음 commit/관련 test 연결 |  |

#### 최소 code evidence

- **Commit:**
- **Path / function / test:**
- **왜 이 excerpt가 필요한가:**

```text
[학습자가 exact SHA에서 필요한 최소 excerpt만 기록]
```

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command |  |
| 실제 결과 또는 실행 불가 사유 |  |
| 정적 검토와 실행 결과의 구분 |  |

### 2. `dc07871c4d24` — test(portfolio): selector와 presentation 회귀 계약 보강

- **Full SHA:** `dc07871c4d24ddcd85aa15d41ab7fb334ed784a6`
- **Importance:** A
- **Tags:** CONTENT, TEST
- **이 Thread에서의 역할:** public module surface와 mutable/immutable copy ownership 회귀 계약

#### 해당 SHA에서 확인할 실제 코드

- `src/lib/portfolio.test.ts`의 `import * as portfolio`와 정확한 export-name 목록
- `getPortfolioContent()` 두 호출 사이의 root, `projects`, project item, nested `links`, top-level `links` identity 비교
- `site`, `profile`, `presentation`, `journey`가 같은 reference로 유지되는 assertion
- 이 copy policy가 production `src/lib/portfolio.ts`의 facade 구현과 일치하는지

#### Commit-specific investigation

- `dc07871c4d24^`와 `dc07871c4d24`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `public module surface와 mutable/immutable copy ownership 회귀 계약`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
- Production path와 test path를 분리하고, state/data/resource owner와 lifetime·cleanup을 실제 symbol 기준으로 추적합니다.
- Failure/absence/fallback branch와 test technique을 구분하고, 이 SHA가 보장하지 않는 범위를 명시합니다.
- 다음 후속 관계를 대조하되 later code를 이 SHA의 구현으로 설명하지 않습니다: `b77b386b344e`는 aggregate를 renderer에 직접 넘기는 대신 route factory가 파생 결과를 준비한다는 다음 ownership boundary를 테스트합니다.

#### 학습자 증거

| 확인·기록 항목 | 기록 |
| --- | --- |
| 직전 state와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner와 lifetime |  |
| Failure·absence·fallback·cleanup |  |
| Test technique와 실행 증거 |  |
| 보장하는 것 |  |
| 보장하지 않는 것 |  |
| 다음 commit/관련 test 연결 |  |

#### 최소 code evidence

- **Commit:**
- **Path / function / test:**
- **왜 이 excerpt가 필요한가:**

```text
[학습자가 exact SHA에서 필요한 최소 excerpt만 기록]
```

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command |  |
| 실제 결과 또는 실행 불가 사유 |  |
| 정적 검토와 실행 결과의 구분 |  |

### 3. `b77b386b344e` — test(content): route view model 파생 규칙 검증

- **Full SHA:** `b77b386b344e60e1aa2ed3eafd76ab5dafb32342`
- **Importance:** A
- **Tags:** ARCH, CONTENT, VALIDATION
- **이 Thread에서의 역할:** 여섯 route view-model factory의 selection·ordering·fallback contract

#### 해당 SHA에서 확인할 실제 코드

- `src/lib/portfolio/view-models.test.ts`의 `createHomeViewModel`, `createProjectIndexViewModel`, `createProjectDetailViewModel`
- `createAboutViewModel`, `createResumeViewModel`, `createContactViewModel`
- Home의 fixed date, featured/lead fallback, hero/footer placement, metric derivation
- Project group order·중복 방지, detail unknown-ID `null`, stack/image/link preparation
- About/resume/contact의 source-order 유지, unknown reference omission, cinematic contact fallback

#### Commit-specific investigation

- `b77b386b344e^`와 `b77b386b344e`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `여섯 route view-model factory의 selection·ordering·fallback contract`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
- Production path와 test path를 분리하고, state/data/resource owner와 lifetime·cleanup을 실제 symbol 기준으로 추적합니다.
- Failure/absence/fallback branch와 test technique을 구분하고, 이 SHA가 보장하지 않는 범위를 명시합니다.
- 다음 후속 관계를 대조하되 later code를 이 SHA의 구현으로 설명하지 않습니다: `527b9f872333`가 journey/interview를 추가하고, route별 허용 source field와 full-content spread 금지를 structural regression으로 강화합니다.

#### 학습자 증거

| 확인·기록 항목 | 기록 |
| --- | --- |
| 직전 state와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner와 lifetime |  |
| Failure·absence·fallback·cleanup |  |
| Test technique와 실행 증거 |  |
| 보장하는 것 |  |
| 보장하지 않는 것 |  |
| 다음 commit/관련 test 연결 |  |

#### 최소 code evidence

- **Commit:**
- **Path / function / test:**
- **왜 이 excerpt가 필요한가:**

```text
[학습자가 exact SHA에서 필요한 최소 excerpt만 기록]
```

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command |  |
| 실제 결과 또는 실행 불가 사유 |  |
| 정적 검토와 실행 결과의 구분 |  |

### 4. `527b9f872333` — test(content): scoped view model과 연락처 회귀 검증

- **Full SHA:** `527b9f872333cbd45f6ab436a7d0e6178ccba6d3`
- **Importance:** A
- **Tags:** CONTENT, VALIDATION, TEST
- **이 Thread에서의 역할:** 여덟 route의 scoped field whitelist와 unresolved-reference hardening

#### 해당 SHA에서 확인할 실제 코드

- `src/lib/portfolio/view-models.test.ts`의 route별 `sourceFields` whitelist
- 공통 `site`, `profile`, `presentation`, `footerLinks`와 route-specific field 비교
- `readFileSync`로 `src/lib/portfolio/view-models.ts`를 읽어 `PortfolioContent &` 및 `...content`를 거부하는 structural assertion
- projects/about model의 `contact` 전달
- Journey milestone의 missing anchor omission과 interview answer의 `{ projectId, project: null }` 유지

#### Commit-specific investigation

- `527b9f872333^`와 `527b9f872333`의 diff에서 위 파일·symbol이 실제로 추가·변경·제거된 범위를 구분합니다.
- 직전 state에서 `여덟 route의 scoped field whitelist와 unresolved-reference hardening`가 필요해진 구체적 부족함 또는 잘못된 가정을 찾습니다.
- Production path와 test path를 분리하고, state/data/resource owner와 lifetime·cleanup을 실제 symbol 기준으로 추적합니다.
- Failure/absence/fallback branch와 test technique을 구분하고, 이 SHA가 보장하지 않는 범위를 명시합니다.
- 다음 후속 관계를 대조하되 later code를 이 SHA의 구현으로 설명하지 않습니다: 이 commit으로 content contract Thread가 route projection ownership까지 닫히며, `1598a...`·`055b...`의 renderer matrix가 같은 production factories의 최종 consumer를 검증합니다.

#### 학습자 증거

| 확인·기록 항목 | 기록 |
| --- | --- |
| 직전 state와 부족함 |  |
| 실제 변경 file/symbol/call path |  |
| Data/state/DOM/resource owner와 lifetime |  |
| Failure·absence·fallback·cleanup |  |
| Test technique와 실행 증거 |  |
| 보장하는 것 |  |
| 보장하지 않는 것 |  |
| 다음 commit/관련 test 연결 |  |

#### 최소 code evidence

- **Commit:**
- **Path / function / test:**
- **왜 이 excerpt가 필요한가:**

```text
[학습자가 exact SHA에서 필요한 최소 excerpt만 기록]
```

#### 실행 증거

| 항목 | 기록 |
| --- | --- |
| 해당 SHA에서 실행한 command |  |
| 실제 결과 또는 실행 불가 사유 |  |
| 정적 검토와 실행 결과의 구분 |  |

## 6. Invariant evolution ledger

| Invariant | 도입/변경 SHA | Historical evidence | 상태 |
| --- | --- | --- | --- |
| Production content path가 executable contract의 source다. |  |  |  |
| Mutable aggregate는 호출 간 격리된다. |  |  |  |
| Renderer는 full content가 아니라 route projection을 받는다. |  |  |  |
| Unknown references는 route별 explicit absence로 처리된다. |  |  |  |

## 7. Failure → Fix → Test

| Earlier failure/risk | Fix SHA | Corrected decision | Regression evidence |
| --- | --- | --- | --- |
| Malformed ID/cross-reference/asset가 정상 content처럼 통과할 위험 |  |  |  |
| 호출자가 returned project/link를 mutation해 다음 요청을 오염할 위험 |  |  |  |
| Renderer가 full aggregate를 받아 local search/spread를 반복할 위험 |  |  |  |
| Unknown project reference가 crash 또는 stale object로 흘러갈 위험 |  |  |  |

## 8. Ownership/state/responsibility 변화

| 대상 | 초기 owner/state | 최종 owner/state | Evidence |
| --- | --- | --- | --- |
| Raw JSON/source |  |  |  |
| Validation/derived aggregate |  |  |  |
| Mutable returned data |  |  |  |
| Route-specific projection |  |  |  |
| Regression evidence |  |  |  |

## 9. 최종 Thread state

다음 내용을 코드 없이 설명합니다: 최종 owner, input→decision→output, failure/absence policy, regression evidence와 명시적 non-guarantee.

> 학습자 기록:

## 10. 최종 실행 흐름

| 단계 | Owner / mechanism | Input | Output/state | Failure/non-guarantee |
| ---: | --- | --- | --- | --- |
| 1. Source load |  |  |  |  |
| 2. Validation/aggregate |  |  |  |  |
| 3. Public selection |  |  |  |  |
| 4. Route projection |  |  |  |  |
| 5. Regression evidence |  |  |  |  |

## 11. 학습 완료 확인

- [ ] 모든 referenced SHA를 exact historical diff 기준으로 설명했습니다.
- [ ] Commit map의 SHA·순서·subject·importance·tags를 변경하지 않았습니다.
- [ ] Fix를 earlier failure/assumption에 연결했습니다.
- [ ] Test가 실행하는 production path와 증명하지 않는 범위를 구분했습니다.
- [ ] 정적 inspection과 실제 command execution을 구분했습니다.
- [ ] Thread-level invariant, ownership과 final flow를 완성했습니다.
- [ ] 실행하지 못한 command가 있으면 환경 사유와 정적 검토 범위를 기록했습니다.
