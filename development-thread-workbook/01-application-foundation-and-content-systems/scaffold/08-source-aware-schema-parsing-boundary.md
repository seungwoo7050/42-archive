# Thread: Source-aware schema parsing boundary

> Repository: `https://github.com/seungwoo7050/42-archive`  
> Branch: `web/portfolio`  
> Category: `01-application-foundation-and-content-systems`

## 0. 분류 출처와 변경 가능 범위

- Commit SHA, subject, importance, tags는 target branch의 `commit/commit-importance.md` 분류와 exact commit metadata를 사용합니다.
- 이 문서의 Thread grouping, 목표, 역할, 조사 지점은 Phase 1 category audit에서 repository evidence를 기준으로 확정했습니다.
- Phase 2에서는 이 fixed information을 바꾸지 않고 learner-facing 기록만 채웠습니다.
- 다른 branch나 final HEAD 구현을 과거 SHA 설명에 소급하지 않습니다.

## 1. Thread 목표

14개 JSON source를 단순 assertion에서 파일명·JSON path가 포함된 structured validation error와 단일 `loadPortfolioSource()` parsing 경계로 전환하는 과정을 복원합니다.

### 계획된 핵심 invariant

- 각 file은 대응 schema로 `safeParse`되고 성공한 `parsed.data`만 반환됩니다.
- Validation failure는 source filename, JSON-style path, message를 보존한 `PortfolioContentError`로 노출됩니다.
- 기본 `portfolioSource`는 module import 시 load되어 malformed source를 consumer 전에 fail-closed 합니다.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- Zod issue path를 사용자 편집 가능한 JSON path로 바꾸는 규칙은 무엇인가?
- Schema parse failure와 cross-file integrity issue는 같은 error model을 어떻게 공유하는가?
- `overrides`가 테스트 가능성을 만들지만 production source ownership을 흐리지 않는 이유는 무엇인가?

## 3. 완료 기준

- 각 SHA의 parent diff와 resulting tree에서 실제 file/symbol을 확인합니다.
- 이전 상태, implementation decision, owner/lifetime, absence/failure/fallback, guarantee/non-guarantee를 분리합니다.
- Fix·refactor·integration은 바로 앞의 assumption이나 duplicated responsibility와 연결합니다.
- 테스트나 command는 실제 실행 여부를 정적 검토와 명확히 구분합니다.
- Thread 종료 시 invariant evolution과 최종 flow를 코드 없이 설명합니다.

## 4. Commit map

| 순서 | Commit | Subject | Importance | Tags | 이 Thread에서의 역할 |
| ---: | --- | --- | :---: | --- | --- |
| 1 | `70e49ea34194` | feat(content): 콘텐츠 validation 오류 모델 추가 | A | CONTENT, VALIDATION | loader module과 structured error model |
| 2 | `830f02688d63` | feat(content): JSON 경로 진단 추가 | B | CONTENT, VALIDATION | deterministic JSON path formatter |
| 3 | `d50870c8b8c4` | feat(content): JSON schema 파싱 경계 추가 | A | CONTENT, VALIDATION | generic per-file parser |
| 4 | `03d2c9be0a43` | feat(content): 콘텐츠 파일 schema 파싱 연결 | S | ARCH, CONTENT, VALIDATION | 14-source fail-closed loader |

## 5. Commit별 학습 기록

### 1. `70e49ea34194` — feat(content): 콘텐츠 validation 오류 모델 추가

- **Importance:** A
- **Tags:** CONTENT, VALIDATION
- **Thread 역할:** loader module과 structured error model
- **조사 깊이:** 주요 subsystem의 결정 경로, owner, failure/non-guarantee와 integration evidence를 구체적으로 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `src/lib/content-loader.ts`가 import하는 14 JSON/schema 목록을 확인합니다.
- `ContentValidationIssue`, `PortfolioSourceOverrides`, `PortfolioContentError`의 fields/message assembly를 확인합니다.
- supported design IDs와 internal route map이 아직 사용되기 전 scaffold 상태를 기록합니다.

확인 원칙:

- 먼저 `70e49ea34194^`와 `70e49ea34194`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:08-source-aware-schema-parsing-boundary.md:c1.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:08-source-aware-schema-parsing-boundary.md:c1.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:08-source-aware-schema-parsing-boundary.md:c1.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:08-source-aware-schema-parsing-boundary.md:c1.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:08-source-aware-schema-parsing-boundary.md:c1.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:08-source-aware-schema-parsing-boundary.md:c1.next --> |

#### 코드·실행 증거

<!-- learner:08-source-aware-schema-parsing-boundary.md:c1.evidence -->

### 2. `830f02688d63` — feat(content): JSON 경로 진단 추가

- **Importance:** B
- **Tags:** CONTENT, VALIDATION
- **Thread 역할:** deterministic JSON path formatter
- **조사 깊이:** 이 commit이 맡은 실제 구현 역할, changed symbol, state/absence 처리와 다음 연결을 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `jsonPath(PropertyKey[])`의 empty path `$`, number `[index]`, identifier `.key`, unusual key bracket+JSON.stringify branch를 확인합니다.
- 실제 source file path는 이 helper가 아니라 caller가 붙인다는 점을 기록합니다.

확인 원칙:

- 먼저 `830f02688d63^`와 `830f02688d63`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:08-source-aware-schema-parsing-boundary.md:c2.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:08-source-aware-schema-parsing-boundary.md:c2.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:08-source-aware-schema-parsing-boundary.md:c2.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:08-source-aware-schema-parsing-boundary.md:c2.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:08-source-aware-schema-parsing-boundary.md:c2.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:08-source-aware-schema-parsing-boundary.md:c2.next --> |

#### 코드·실행 증거

<!-- learner:08-source-aware-schema-parsing-boundary.md:c2.evidence -->

### 3. `d50870c8b8c4` — feat(content): JSON schema 파싱 경계 추가

- **Importance:** A
- **Tags:** CONTENT, VALIDATION
- **Thread 역할:** generic per-file parser
- **조사 깊이:** 주요 subsystem의 결정 경로, owner, failure/non-guarantee와 integration evidence를 구체적으로 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `parseContentFile<Schema extends z.ZodType>`의 `safeParse`, failure mapping, `parsed.data` 반환을 확인합니다.
- throw가 첫 issue만이 아니라 해당 file의 모든 Zod issues를 보존하는지 확인합니다.

확인 원칙:

- 먼저 `d50870c8b8c4^`와 `d50870c8b8c4`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:08-source-aware-schema-parsing-boundary.md:c3.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:08-source-aware-schema-parsing-boundary.md:c3.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:08-source-aware-schema-parsing-boundary.md:c3.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:08-source-aware-schema-parsing-boundary.md:c3.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:08-source-aware-schema-parsing-boundary.md:c3.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:08-source-aware-schema-parsing-boundary.md:c3.next --> |

#### 코드·실행 증거

<!-- learner:08-source-aware-schema-parsing-boundary.md:c3.evidence -->

### 4. `03d2c9be0a43` — feat(content): 콘텐츠 파일 schema 파싱 연결

- **Importance:** S
- **Tags:** ARCH, CONTENT, VALIDATION
- **Thread 역할:** 14-source fail-closed loader
- **조사 깊이:** Architecture 전환, 이전 trust/ownership 모델, failure path, lifecycle, downstream regression까지 깊게 복원합니다.

#### 해당 SHA에서 확인할 실제 코드

- `loadPortfolioSource(overrides = {})`가 default imports와 overrides를 merge하는 순서를 확인합니다.
- site/profile/projects/presentation/skills/techStack/experience/journey/links/contact/resume/journeyNarrative/interviewMap/curation 각각의 exact file label/schema call을 추적합니다.
- 반환 object, `portfolioSource = loadPortfolioSource()`, `PortfolioSource = ReturnType<...>`를 확인합니다.
- 이 SHA에 tests가 추가되지 않았음을 구분합니다.

확인 원칙:

- 먼저 `03d2c9be0a43^`와 `03d2c9be0a43`의 first-parent diff를 비교합니다. Root commit이면 parent 부재를 명시합니다.
- Resulting tree의 file/symbol만 이 SHA의 사실로 사용합니다.
- 실행하지 않은 command 결과와 후속 test evidence를 직접 실행한 결과처럼 쓰지 않습니다.

#### 학습자가 남길 증거

| 확인·기록 항목 | 학습자 기록 |
| --- | --- |
| 직전 상태와 부족함 | <!-- learner:08-source-aware-schema-parsing-boundary.md:c4.before --> |
| 실제 변경 file/symbol/call path | <!-- learner:08-source-aware-schema-parsing-boundary.md:c4.change --> |
| Data/state/resource owner와 lifetime | <!-- learner:08-source-aware-schema-parsing-boundary.md:c4.owner --> |
| Failure·absence·fallback 처리 | <!-- learner:08-source-aware-schema-parsing-boundary.md:c4.failure --> |
| 보장하는 것과 보장하지 않는 것 | <!-- learner:08-source-aware-schema-parsing-boundary.md:c4.guarantee --> |
| 다음 commit 또는 관련 test 연결 | <!-- learner:08-source-aware-schema-parsing-boundary.md:c4.next --> |

#### 코드·실행 증거

<!-- learner:08-source-aware-schema-parsing-boundary.md:c4.evidence -->

## 6. Invariant evolution ledger

| 추적할 invariant | 도입·변화 SHA | 실제 owner/evidence | 제한·후속 보호 |
| --- | --- | --- | --- |
| 모든 validation issue는 file/path/message를 갖는다. | <!-- learner:08-source-aware-schema-parsing-boundary.md:ledger1.sha --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:ledger1.evidence --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:ledger1.limitation --> |
| Zod path는 결정적 JSON-style 경로로 변환된다. | <!-- learner:08-source-aware-schema-parsing-boundary.md:ledger2.sha --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:ledger2.evidence --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:ledger2.limitation --> |
| schema output만 loader를 통과한다. | <!-- learner:08-source-aware-schema-parsing-boundary.md:ledger3.sha --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:ledger3.evidence --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:ledger3.limitation --> |
| 기본 source는 import 시 fail-closed 된다. | <!-- learner:08-source-aware-schema-parsing-boundary.md:ledger4.sha --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:ledger4.evidence --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:ledger4.limitation --> |

## 7. Failure → Fix → Test 관계

| Failure 또는 risk | Fix/전환 SHA | 교정된 결정 | Regression·검증 관계 |
| --- | --- | --- | --- |
| JSON `as` assertion이 malformed source를 신뢰 | <!-- learner:08-source-aware-schema-parsing-boundary.md:failure1.sha --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:failure1.correction --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:failure1.test --> |
| 오류가 어느 file/path인지 알기 어려움 | <!-- learner:08-source-aware-schema-parsing-boundary.md:failure2.sha --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:failure2.correction --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:failure2.test --> |
| production source만 고정돼 failure case 주입이 어려움 | <!-- learner:08-source-aware-schema-parsing-boundary.md:failure3.sha --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:failure3.correction --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:failure3.test --> |

## 8. Ownership·state·responsibility 변화

| 대상 | 이전 owner/state | 최종 owner/state | 근거 |
| --- | --- | --- | --- |
| raw JSON imports | <!-- learner:08-source-aware-schema-parsing-boundary.md:owner1.before --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:owner1.after --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:owner1.evidence --> |
| per-file parse | <!-- learner:08-source-aware-schema-parsing-boundary.md:owner2.before --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:owner2.after --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:owner2.evidence --> |
| source aggregate | <!-- learner:08-source-aware-schema-parsing-boundary.md:owner3.before --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:owner3.after --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:owner3.evidence --> |
| failure ownership | <!-- learner:08-source-aware-schema-parsing-boundary.md:owner4.before --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:owner4.after --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:owner4.evidence --> |

## 9. Thread 최종 상태

<!-- learner:08-source-aware-schema-parsing-boundary.md:final.state -->

### 최종 설명

<!-- learner:08-source-aware-schema-parsing-boundary.md:final.explanation -->

## 10. 최종 실행·데이터 흐름

| 단계 | Owner/call path | 입력·출력 | Failure/non-guarantee |
| --- | --- | --- | --- |
| Default JSON과 overrides를 합칩니다. | <!-- learner:08-source-aware-schema-parsing-boundary.md:flow1.owner --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:flow1.io --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:flow1.failure --> |
| 각 file을 exact schema로 parse합니다. | <!-- learner:08-source-aware-schema-parsing-boundary.md:flow2.owner --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:flow2.io --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:flow2.failure --> |
| parsed outputs를 aggregate합니다. | <!-- learner:08-source-aware-schema-parsing-boundary.md:flow3.owner --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:flow3.io --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:flow3.failure --> |
| 기본 singleton을 초기화합니다. | <!-- learner:08-source-aware-schema-parsing-boundary.md:flow4.owner --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:flow4.io --> | <!-- learner:08-source-aware-schema-parsing-boundary.md:flow4.failure --> |

## 11. 학습 완료 확인

<!-- learner:08-source-aware-schema-parsing-boundary.md:completion.check -->
