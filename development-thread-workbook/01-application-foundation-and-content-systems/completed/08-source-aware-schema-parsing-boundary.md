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
| 직전 상태와 부족함 | Schema는 정의되어 있었지만 source imports와 연결되지 않았고 오류가 어느 JSON file/path에서 발생했는지 표현할 공통 모델이 없었습니다. |
| 실제 변경 file/symbol/call path | 모든 source/schema imports와 override key 집합을 한 module에 모으고 `{file, path, message}` issue와 aggregated error class를 추가합니다. |
| Data/state/resource owner와 lifetime | `content-loader.ts`가 validation boundary 및 diagnostic model의 owner가 됩니다. |
| Failure·absence·fallback 처리 | 아직 parse function이나 `loadPortfolioSource()`가 없어 source가 실제로 거부되지는 않습니다. supported design/internal route 상수도 후속 integrity를 위한 준비 상태입니다. |
| 보장하는 것과 보장하지 않는 것 | 후속 schema/integrity failure가 공유할 source-aware error contract를 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `830f02688d63`이 Zod path를 JSON-style path로 변환합니다. |

#### 코드·실행 증거

정적 근거: `70e49ea34194`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다. 중요도 A 근거: 이후 모든 validation 경로와 테스트가 의존하는 public failure type과 source override seam을 정의합니다.

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
| 직전 상태와 부족함 | Zod path segment 배열을 그대로 노출하면 편집자가 어느 JSON 위치를 고쳐야 하는지 일관되게 읽기 어렵습니다. |
| 실제 변경 file/symbol/call path | root, array index, 일반 property, 특수 property를 JSON-style 문자열로 변환하는 helper를 추가합니다. |
| Data/state/resource owner와 lifetime | diagnostic path formatting은 loader helper가 소유합니다. |
| Failure·absence·fallback 처리 | path가 source line number를 제공하지 않고 JSON parser syntax error를 다루는 것도 아닙니다. |
| 보장하는 것과 보장하지 않는 것 | Zod issue path의 결정적이고 읽을 수 있는 표현을 보장합니다. |
| 다음 commit 또는 관련 test 연결 | `d50870c8b8c4`가 이 formatter를 parse failure mapping에 사용합니다. |

#### 코드·실행 증거

정적 근거: `830f02688d63`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다.

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
| 직전 상태와 부족함 | Error model과 path formatter는 있었지만 각 schema call이 반복되거나 assertion으로 우회될 수 있었습니다. |
| 실제 변경 file/symbol/call path | file label, schema, unknown input을 받는 generic parser를 만들고 Zod issues를 source-aware issues로 변환해 `PortfolioContentError`를 던집니다. |
| Data/state/resource owner와 lifetime | per-file shape validation과 output typing은 `parseContentFile`이 소유합니다. |
| Failure·absence·fallback 처리 | 한 file parse가 실패하면 다음 file이나 cross-file integrity 단계로 진행하지 않으며 JSON text syntax는 bundler import 단계의 책임입니다. |
| 보장하는 것과 보장하지 않는 것 | 성공한 schema output만 caller에 반환하고 실패 시 file/path/message를 보존합니다. |
| 다음 commit 또는 관련 test 연결 | 여러 integrity helper commits 뒤 `03d2c9be0a43`가 모든 source에 parser를 연결합니다. |

#### 코드·실행 증거

정적 근거: `d50870c8b8c4`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다. 중요도 A 근거: assertion과 runtime trust 사이의 실제 변환 함수이며 downstream loader invariant의 핵심입니다.

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
| 직전 상태와 부족함 | 개별 parser는 있었지만 production imports는 여전히 직접 assertion path를 사용할 수 있었고 14개 source를 빠짐없이 검사하는 단일 entry가 없었습니다. |
| 실제 변경 file/symbol/call path | default JSON inputs에 caller overrides를 덮어쓴 뒤 각 source를 exact schema와 source path로 `parseContentFile`에 통과시키고 parsed outputs만 aggregate합니다. module-level `portfolioSource`가 import 시 기본 source를 즉시 검증합니다. |
| Data/state/resource owner와 lifetime | `loadPortfolioSource`가 raw source→validated source의 유일한 loader boundary를 소유하고 overrides는 특정 source만 deterministic하게 교체할 test seam이 됩니다. parsed values의 lifetime은 returned source object와 module singleton이 소유합니다. |
| Failure·absence·fallback 처리 | Shape parse가 성공해도 duplicate ID, dangling reference, supported design completeness, internal route, asset 존재는 아직 모두 보장되지 않습니다. 한 file의 shape failure는 즉시 throw하므로 다른 files의 shape issue를 함께 누적하지 않습니다. |
| 보장하는 것과 보장하지 않는 것 | 모든 14 source가 consumer에 도달하기 전에 대응 runtime schema를 통과하고 malformed field는 source-aware error로 fail-closed 된다는 핵심 invariant를 도입합니다. |
| 다음 commit 또는 관련 test 연결 | T9가 parsed outputs 사이의 repository-wide integrity를 누적 검사하고 T10이 기존 portfolio facade를 이 validated singleton으로 교체합니다. |

#### 코드·실행 증거

정적 근거: `03d2c9be0a43`의 parent diff와 resulting tree에서 위 file/symbol을 확인했습니다. 실행 근거: 없음. 로컬 환경에서 GitHub 도메인 DNS가 차단되어 target branch checkout과 repository command 실행을 수행하지 못했고, GitHub commit/file 조회로만 검토했습니다. 코드 발췌 판단: 별도 code block은 넣지 않았습니다. 함수·field·분기 관계를 위 기록에 최소 단위로 직접 명시했습니다. 중요도 S 근거: source 신뢰 모델이 “JSON import + `as`”에서 “unknown input + exact schema parse + structured failure + validated aggregate”로 바뀌며 이후 content architecture 전체의 입력 경계가 됩니다.

## 6. Invariant evolution ledger

| 추적할 invariant | 도입·변화 SHA | 실제 owner/evidence | 제한·후속 보호 |
| --- | --- | --- | --- |
| 모든 validation issue는 file/path/message를 갖는다. | `70e49ea34194` | `ContentValidationIssue`, `PortfolioContentError` | line/column 정보는 없음 |
| Zod path는 결정적 JSON-style 경로로 변환된다. | `830f02688d63` | `jsonPath` | source syntax error는 별도 |
| schema output만 loader를 통과한다. | `d50870c8b8c4` → `03d2c9be0a43` | `parseContentFile`, `loadPortfolioSource` | cross-file integrity는 T9 |
| 기본 source는 import 시 fail-closed 된다. | `03d2c9be0a43` | `portfolioSource = loadPortfolioSource()` | 테스트 실행 증거는 후속 category 07 |

## 7. Failure → Fix → Test 관계

| Failure 또는 risk | Fix/전환 SHA | 교정된 결정 | Regression·검증 관계 |
| --- | --- | --- | --- |
| JSON `as` assertion이 malformed source를 신뢰 | `d50870c8b8c4`, `03d2c9be0a43` | unknown input을 schema `safeParse` | `3353032ba23b` invalid-source regression |
| 오류가 어느 file/path인지 알기 어려움 | `70e49ea34194`, `830f02688d63` | structured issue + JSON path | 후속 tests가 error issue shape를 확인 |
| production source만 고정돼 failure case 주입이 어려움 | `PortfolioSourceOverrides` + loader merge | single-file deterministic overrides | 후속 tests가 malformed/duplicate/route cases 주입 |

## 8. Ownership·state·responsibility 변화

| 대상 | 이전 owner/state | 최종 owner/state | 근거 |
| --- | --- | --- | --- |
| raw JSON imports | 여러 aggregate module | `content-loader.ts` | 14 default inputs |
| per-file parse | 없음 | `parseContentFile` | schema output 또는 structured throw |
| source aggregate | asserted `PortfolioContent` | `PortfolioSource` | validated raw-domain aggregate |
| failure ownership | import/consumer별 | `PortfolioContentError` | loader가 source context를 보존 |

## 9. Thread 최종 상태

Thread 종료 시점에는 14개 JSON source가 각각 exact Zod schema를 통과한 `PortfolioSource`로만 반환되고, 기본 source는 module import 시 fail-closed 됩니다. 오류는 source file과 JSON-style path를 보존합니다. 그러나 duplicate/reference/route/design/asset integrity는 후속 Thread 책임입니다.

### 최종 설명

- 공통 issue/error 모델과 JSON path formatter를 만들었습니다.
- Generic per-file parser가 unknown input을 schema output으로 전환하거나 structured error를 던집니다.
- `loadPortfolioSource()`가 14개 source와 override seam을 한 경계에 모았습니다.
- S-level 전환은 source 신뢰 모델의 변경이며 단순 helper 추가가 아닙니다.

## 10. 최종 실행·데이터 흐름

| 단계 | Owner/call path | 입력·출력 | Failure/non-guarantee |
| --- | --- | --- | --- |
| Default JSON과 overrides를 합칩니다. | `loadPortfolioSource` input object | 14 unknown inputs | override는 지정 key만 대체 |
| 각 file을 exact schema로 parse합니다. | `parseContentFile` | typed parsed output | 한 file 실패 시 즉시 `PortfolioContentError` |
| parsed outputs를 aggregate합니다. | `loadPortfolioSource` return | `PortfolioSource` | cross-file issues는 아직 검사하지 않음 |
| 기본 singleton을 초기화합니다. | `portfolioSource` | module-lifetime validated source | malformed source면 import 실패 |

## 11. 학습 완료 확인

완료했습니다. 모든 commit은 exact SHA의 parent diff/resulting tree를 기준으로 기록했고, direct execution evidence와 static inspection을 구분했습니다. `3353032ba23b`이 override seam으로 malformed source와 structured issue를 후속 검증합니다. 이 작업에서는 Vitest나 content command를 실행하지 않았습니다.
