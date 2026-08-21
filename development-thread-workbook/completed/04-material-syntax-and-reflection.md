# Thread 4. Material syntax to bounded recursive reflection

## 1. Thread 목표

기존 diffuse-only `traceRay`에 deterministic perfect-metal recursion을 추가하고, scene syntax와 CLI depth setting이 그 bounded transport contract를 어떻게 노출하면서 기존 diffuse scene을 보존하는지 확인합니다.

### Source significance

> The material thread changes `traceRay` from a terminal direct-light computation into bounded
> recursion without introducing randomness or schedule-dependent sampling. Keeping omitted material
> tokens diffuse preserves existing scenes, while the depth contract makes recursive work finite and
> externally configurable. The tests show both the new metal path and the unchanged diffuse golden,
> which is the relevant compatibility boundary.

### 이 Thread에 연결된 source invariant

- Recursive metal transport is bounded by `maxDepth`.
- Omitting the material token preserves diffuse behavior and the existing diffuse golden.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- material value가 `Diffuse`와 `Metal`을 구분한 뒤 `traceRay` control flow는 어떻게 갈라지는가?
- metal depth zero와 depth positive의 반환·secondary-ray 생성 규칙은 무엇인가?
- reflected ray origin offset, acceleration mode, statistics sink, decremented depth가 재귀 호출에 어떻게 전달되는가?
- optional material token이 기존 `.rt` arity와 diffuse default를 어떻게 보존하는가?
- test가 grammar, unknown-material failure, recursion, secondary count, diffuse golden을 각각 어떤 경로로 검증하는가?

## 3. 완료 기준

- [x] metal reflection의 실제 수식과 ray 생성 순서를 해당 SHA에서 기록했습니다.
- [x] depth가 감소하는 지점과 depth zero 종료 결과를 코드로 설명할 수 있습니다.
- [x] `sp`, `pl`, `cy`의 base arity와 optional-token arity를 실제 parser 분기에서 확인했습니다.
- [x] 기존 material 생략 scene이 diffuse로 남는 backward-compatibility 증거를 테스트와 연결했습니다.
- [x] CLI `--max-depth`의 default, 범위, 중복·오류 처리를 renderer setting까지 추적했습니다.
- [x] 모든 참조 SHA가 `cpp/miniRT` branch HEAD의 ancestry에 속하는지 확인했습니다.
- [ ] 해당 SHA checkout에서 build/test/benchmark 명령을 직접 실행했습니다. 로컬 외부 네트워크와 checkout이 제공되지 않아 실행 evidence는 만들지 않았습니다.

### 검증 범위

- 지정 branch HEAD: `7d08c7c13fa68c3e60eea3c7014658b0a133e6f0`
- 각 참조 SHA는 Thread 내부의 연속 compare chain에서 `behind_by = 0`, merge base가 선행 SHA였고, Thread 종료 SHA도 branch HEAD의 조상으로 확인했습니다.
- 구현 설명은 해당 commit의 diff/file content를 기준으로 작성했으며, final HEAD의 후속 API를 과거 SHA에 소급하지 않았습니다.
- 테스트와 benchmark는 source mechanism과 production path만 검사했습니다. 실행 결과, sanitizer 결과, wall-clock 수치는 기록하지 않았습니다.

## 4. Commit map

1. `85583e1e9beb` — `feat(material): metal 모델과 깊이 제한 반사 구현`
   - Importance: A
   - Tags: CORE, MATERIAL, RAY_PIPELINE
   - Source-defined role: Extends tracing with a deterministic perfect-metal branch and depth consumption.

2. `a90130a5b030` — `feat(parser): 선택적 도형 재질 문법 추가`
   - Importance: B
   - Tags: PARSER, MATERIAL
   - Source-defined role: Adds optional material tokens while retaining diffuse defaults.

3. `9a352ffe8233` — `test(material): 재질 파싱과 반사 깊이 검증`
   - Importance: B
   - Tags: TEST, MATERIAL, DETERMINISM
   - Source-defined role: Verifies parsing, unknown-material failure, recursion depth, secondary-ray counts, and diffuse compatibility.

4. `3aa806753cc4` — `feat(cli): 반사 깊이 option과 기본값 추가`
   - Importance: B
   - Tags: CLI, MATERIAL
   - Source-defined role: Exposes reflection depth through the CLI and adopts a default of four.

## 5. Commit별 학습 기록

### 5.1 `85583e1e9beb` — `feat(material): metal 모델과 깊이 제한 반사 구현`

- Importance: A
- Tags: CORE, MATERIAL, RAY_PIPELINE
- Thread order: 1/4

#### Source에서 확정된 역할

- Development Thread role: Extends tracing with a deterministic perfect-metal branch and depth consumption.

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** `traceRay`는 모든 material을 ambient/direct diffuse로 끝내며 `maxDepth`를 실제로 소비하지 않았습니다. reflective object를 추가하면 종료 조건, secondary-ray accounting, self-intersection offset과 recursive state 전달을 명시해야 합니다.
- **핵심 구현 결정:** `MaterialType`에 `Diffuse`와 `Metal`을 두고 default를 Diffuse로 유지합니다. hit material이 Metal이면 depth가 0일 때 black을 반환하고, 그 외에는 `r = d - 2·dot(d,n)·n`으로 perfect reflection direction을 계산합니다. origin은 oriented normal 방향으로 epsilon offset하고 secondary counter를 증가시킨 뒤 같은 Scene, acceleration mode, stats sink와 `depth-1`을 재귀 호출합니다. 반환은 albedo component-wise 곱으로 tint합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - include/ray/material.hpp — `MaterialType`, default material
  - src/shading.cpp — metal branch in `traceRay`
  - include/ray/renderer.hpp — depth-aware tracing signature
- **caller → callee / data flow:** primary/secondary ray → hit material → Diffuse: 기존 direct lighting; Metal: depth check → reflected ray → recursive `traceRay(depth-1)` → albedo modulation
- **ownership·state transition:** depth는 recursive budget이며 각 metal bounce에서만 감소합니다. Scene과 camera/geometry는 read-only로 공유되고 stats sink에 secondary count가 누적됩니다.
- **failure/edge branch:** depth 감소가 없으면 mirror cycle이 무한 재귀로 이어질 수 있고, reflected origin offset이 없으면 방금 hit한 surface를 즉시 다시 맞을 수 있습니다. depth 0은 partial diffuse fallback이 아니라 명시적 black입니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** randomness 없는 bounded perfect-metal transport와 기존 diffuse terminal path의 공존을 정의합니다.
- **이 SHA가 보장하지 않는 것:** roughness, Fresnel, refraction, stochastic sampling은 구현하지 않습니다. CLI default depth는 후속 SHA에서 바뀝니다.
- **직접 확인/후속 evidence:** material enum, branch, reflection formula, depth decrement, stats 전달을 해당 SHA에서 확인하고 후속 tests에 연결했습니다.

#### Thread 내 연결

- 이전 Thread commit: 이 Thread의 시작점
- 다음 Thread commit: `a90130a5b030`
- 이 commit이 다음 단계에 제공하는 것: `a90130a5b030`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.2 `a90130a5b030` — `feat(parser): 선택적 도형 재질 문법 추가`

- Importance: B
- Tags: PARSER, MATERIAL
- Thread order: 2/4

#### Source에서 확정된 역할

- Development Thread role: Adds optional material tokens while retaining diffuse defaults.

#### B-level 구현 역할 복원

- **직전 관련 상태:** renderer가 material type을 이해해도 `.rt` grammar가 모든 shape를 diffuse로만 만들면 feature를 입력에서 선택할 수 없습니다. 반대로 token을 필수로 만들면 기존 scene이 깨집니다.
- **핵심 구현 결정:** `sp`, `pl`, `cy` directive가 기존 base arity 또는 base+1 arity를 허용합니다. token이 없으면 Diffuse, 정확히 `diffuse`/`metal`이면 해당 type, 다른 문자열이나 surplus token은 source-located `ParseError`입니다. material 검증은 shape를 Scene에 추가하기 전에 완료됩니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - src/parser.cpp — optional material-token parser and shape directive arity branches
- **caller → callee / data flow:** shape tokens → base/base+1 arity check → optional material decode/default → geometry validation/construction → `Scene::addShape`
- **ownership·state transition:** omitted token은 기존 Material default를 명시적으로 보존합니다. invalid token에서는 Scene mutation 전 예외가 발생합니다.
- **failure/edge branch:** unknown token을 diffuse로 조용히 처리하면 오타가 렌더 결과만 바꾸고 오류가 드러나지 않습니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 기존 scene syntax의 backward compatibility와 explicit metal 선택을 동시에 제공합니다.
- **이 SHA가 보장하지 않는 것:** material parameter(roughness 등) 확장 grammar는 없습니다.
- **직접 확인/후속 evidence:** 세 shape directive의 arity/default/unknown branches를 해당 SHA에서 확인했습니다.

#### Thread 내 연결

- 이전 Thread commit: `85583e1e9beb`
- 다음 Thread commit: `9a352ffe8233`
- 이 commit이 다음 단계에 제공하는 것: `9a352ffe8233`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.3 `9a352ffe8233` — `test(material): 재질 파싱과 반사 깊이 검증`

- Importance: B
- Tags: TEST, MATERIAL, DETERMINISM
- Thread order: 3/4

#### Source에서 확정된 역할

- Development Thread role: Verifies parsing, unknown-material failure, recursion depth, secondary-ray counts, and diffuse compatibility.

#### B-level 구현 역할 복원

- **직전 관련 상태:** material implementation과 grammar가 있어도 parser compatibility, exact recursive result, depth stop, secondary work, diffuse baseline을 한꺼번에 고정하는 regression이 없습니다.
- **핵심 구현 결정:** `tests/material_tests.cpp`가 omitted/explicit diffuse/metal parsing과 unknown token failure를 검사합니다. mirror Plane과 constant background를 사용해 depth 1 결과가 background `(0.25,0.5,0.75)`와 albedo `(0.8,0.5,0.25)`의 곱 `(0.2,0.25,0.1875)`인지 확인하고, depth 0 black, repeat determinism, `secondaryRays == 1`을 고정합니다. 기존 diffuse scene checksum `456dc8d87ebf194f`도 유지합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - tests/material_tests.cpp — parser/reflection/depth/stats/golden regressions
  - src/parser.cpp — optional grammar
  - src/shading.cpp — `traceRay` material branch
- **caller → callee / data flow:** parser cases → material assertions/errors; controlled mirror scene → `traceRay` depth 1/0 → exact color and counter; diffuse render → golden checksum
- **ownership·state transition:** mirror fixture는 light contribution 없이 recursive background만 관찰하게 구성되어 reflection arithmetic을 격리합니다.
- **failure/edge branch:** depth가 감소하지 않거나 albedo 곱 위치가 바뀌거나 omitted token default가 바뀌면 서로 다른 assertion이 실패합니다.

#### Test commit 분석 기준

- **대상 production invariant:** material omission은 diffuse를 유지하고 metal recursion은 depth로 제한되며 deterministic합니다.
- **test technique:** direct parser assertions, controlled mirror/background fixture, exact counter/color, full-render golden
- **통과하는 production path:** parser → Material → HitRecord → `traceRay` recursion → image checksum
- **이 test가 증명하는 것:** 대표 metal path와 기존 diffuse behavior가 동시에 보호됩니다.
- **이 test가 증명하지 않는 것:** rough materials, refraction, arbitrary deep scenes나 wall-clock behavior를 증명하지 않습니다.
- **실행 상태:** 테스트 구현과 production 호출 경로는 해당 SHA에서 확인했지만, 이 환경에서는 checkout/build가 불가능해 명령을 실행하지 않았습니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** grammar, bounded recursion, secondary accounting, deterministic metal color, diffuse compatibility를 고정합니다.
- **이 SHA가 보장하지 않는 것:** 복잡한 multi-bounce scene, all material combinations, physical realism은 증명하지 않습니다. 이 SHA의 test code가 public Scene storage를 쓰더라도 후속 immutability API를 과거에 소급하지 않습니다.
- **직접 확인/후속 evidence:** 테스트 성격: parser boundary + deterministic unit/integration regression + compatibility golden. 실행은 하지 않았습니다.

#### Thread 내 연결

- 이전 Thread commit: `a90130a5b030`
- 다음 Thread commit: `3aa806753cc4`
- 이 commit이 다음 단계에 제공하는 것: `3aa806753cc4`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.4 `3aa806753cc4` — `feat(cli): 반사 깊이 option과 기본값 추가`

- Importance: B
- Tags: CLI, MATERIAL
- Thread order: 4/4

#### Source에서 확정된 역할

- Development Thread role: Exposes reflection depth through the CLI and adopts a default of four.

#### B-level 구현 역할 복원

- **직전 관련 상태:** reflection depth가 library setting에만 있으면 user가 CLI에서 조절할 수 없고 초기 default 1은 한 bounce만 허용합니다.
- **핵심 구현 결정:** `src/main.cpp`의 option parser에 `--max-depth`를 추가하고 unsigned/integer input을 0..32로 제한합니다. option 중복, 값 누락, malformed/out-of-range는 usage failure로 처리합니다. `RenderSettings` 기본 depth를 1에서 4로 바꾸고 parsed value를 renderer에 전달합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - src/main.cpp — `--max-depth` parsing and validation
  - include/ray/renderer.hpp — default `maxDepth`
  - benchmarks/tests callers — explicit setting adaptation where needed
- **caller → callee / data flow:** argv scan → option/value validation → settings.maxDepth → render → `traceRay` recursive budget
- **ownership·state transition:** 0은 metal recursion disabled/black-at-metal-hit 의미를 유지하고, 1..32는 최대 bounce budget입니다. default 4는 CLI와 settings construction에 적용됩니다.
- **failure/edge branch:** 무제한 값은 stack/work 폭증을 허용하고, duplicate option은 ambiguous authority를 만듭니다. 둘 다 renderer 전에 거부됩니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** bounded reflection budget을 external command contract로 노출하고 합리적 default를 정합니다.
- **이 SHA가 보장하지 않는 것:** depth는 quality/performance knob이지 physically convergent path tracer 설정이 아닙니다.
- **직접 확인/후속 evidence:** default change, range 0..32, duplicate/missing-value branches와 settings 전달을 확인했습니다.

#### Thread 내 연결

- 이전 Thread commit: `9a352ffe8233`
- 다음 Thread commit: 이 Thread의 종료점
- 이 commit이 Thread 종료에 제공하는 것: Thread-level invariant ledger와 최종 실행 흐름에서 이 SHA의 결과를 최종 상태에 반영했습니다.

## 6. Invariant ledger

| Invariant | 최초 도입/기준 | 강화 또는 수정 | 부족함/위험 노출 | 고정한 test/evidence | 실제 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| omitted material은 diffuse | 기존 diffuse-only behavior | a90130a5b030 | optional syntax가 old arity를 깨뜨릴 위험 | 9a352ffe8233 | base/base+1 arity와 diffuse golden |
| metal recursion은 bounded | 85583e1e9beb | 3aa806753cc4에서 CLI 0..32/default 4 | depth 감소 누락 시 unbounded recursion | 9a352ffe8233 | depth 0 black, depth 1 exact color, secondary=1 |
| reflection은 deterministic | 85583e1e9beb | 9a352ffe8233 | random/schedule source 없음 | repeat color/checksum tests | perfect reflection formula와 same state propagation |

### Ledger 보완 기록

- 각 invariant는 위 표의 SHA에서 observable behavior 또는 state로 처음 나타났습니다.
- 후속 commit이 같은 용어를 사용하더라도 그 보장을 과거 SHA에 소급하지 않았습니다.
- test/evidence 열은 production path와 assertion 또는 deterministic work gate를 함께 가리킵니다.
- 실행하지 않은 test는 source-level evidence로만 기록했습니다.

## 7. Failure → Fix → Test 연결

| Failure 또는 위험 | Decision/Fix | Test 또는 evidence | 실제 failure path와 assertion |
| --- | --- | --- | --- |
| unknown material token이 silently diffuse 처리 | exact token decode와 ParseError | 9a352ffe8233 parser tests | unknown material failure assertion |
| metal ray 무한 재귀 | depth zero stop와 `depth-1` | 9a352ffe8233 | depth 0 black/depth 1 one secondary |
| feature 추가로 기존 diffuse scene 변화 | omitted token default + unchanged diffuse path | 9a352ffe8233 | golden `456dc8d87ebf194f` |
| 과도하거나 모호한 CLI depth | 0..32 범위와 duplicate/missing reject | CLI contract source inspection | renderer 전에 option parse failure |

### 연결 검토

- feature commit도 어떤 잘못된 state 또는 semantic drift를 막는지 production path에 연결했습니다.
- fix commit은 기존 가정 → 실제 위험 → root cause → corrected decision → regression 순서로 기록했습니다.
- test가 broad integration인지 deterministic boundary/differential/failure-injection regression인지 commit 기록에서 구분했습니다.
- assertion이 증명하지 않는 범위와 실행하지 못한 항목을 별도로 남겼습니다.

## 8. Ownership / state / responsibility 변화

Material은 `HitRecord`에 값으로 복사되며 reflected ray도 stack value입니다. Scene/geometry는 recursion 동안 read-only로 공유됩니다. recursion depth가 remaining-work state이고 stats sink가 secondary count를 누적합니다. parser는 material token 검증 후 shape construction/Scene ownership transfer를 수행하므로 unknown token에서 partial shape를 추가하지 않습니다.

### 학습자 최종 기록

- **source state와 derived state:** Material은 `HitRecord`에 값으로 복사되며 reflected ray도 stack value입니다. Scene/geometry는 recursion 동안 read-only로 공유됩니다. recursion depth가 remaining-work state이고 stats sink가 secondary count를 누적합니다. parser는 material token 검증 후 shape construction/Scene ownership transfer를 수행하므로 unknown token에서 partial shape를 추가하지 않습니다.
- **mutation/transition boundary:** commit별 `ownership·state transition`과 위 invariant ledger에 표시했습니다.
- **failure 시 복구 상태:** Failure → Fix → Test 표와 각 fix/test section에 정상·오류 상태를 구분했습니다.

## 9. Thread 최종 상태

Diffuse는 기존 direct-light path와 golden을 유지하고 Metal은 perfect reflection ray를 depth budget 안에서 재귀 추적합니다. scene syntax는 token 생략을 diffuse로 해석해 backward compatibility를 유지하며, CLI는 default 4와 0..32 범위를 renderer setting에 전달합니다. roughness/refraction/stochastic transport는 범위 밖입니다.

### 직접 작성한 결론

- **Thread 시작과 종료의 behavior 차이:** Diffuse는 기존 direct-light path와 golden을 유지하고 Metal은 perfect reflection ray를 depth budget 안에서 재귀 추적합니다. scene syntax는 token 생략을 diffuse로 해석해 backward compatibility를 유지하며, CLI는 default 4와 0..32 범위를 renderer setting에 전달합니다. roughness/refraction/stochastic transport는 범위 밖입니다.
- **아직 다른 Thread 또는 외부 검증이 보완해야 하는 항목:** 물리 기반 Fresnel, roughness, transparency/refraction, stochastic anti-aliasing은 이 material contract에 포함되지 않습니다.

## 10. 최종 architecture 또는 execution flow 정리

### Source가 확정한 흐름 anchor

```text
shape material token/default → `MaterialType` → `HitRecord::material` → `traceRay` diffuse/metal branch → reflected ray with decremented depth → CLI `--max-depth`
```

### 실제 코드로 완성한 흐름

1. parser가 shape base arity 또는 optional material token을 검증합니다.
2. omitted token은 Diffuse, exact `metal`은 Metal 값으로 shape material에 저장됩니다.
3. primary ray hit가 material 값을 `HitRecord`로 전달합니다.
4. `traceRay`가 Diffuse direct-light 또는 Metal branch를 선택합니다.
5. Metal depth 0은 black으로 종료하고, 양수이면 reflected direction과 offset origin을 만듭니다.
6. secondary counter를 올리고 같은 Scene/mode/stats에 `depth-1`을 전달합니다.
7. recursive color에 metal albedo를 곱해 caller로 반환합니다.
8. CLI `--max-depth`가 bounded budget을 외부에서 설정합니다.

### 학습자의 최종 설명

Diffuse는 기존 direct-light path와 golden을 유지하고 Metal은 perfect reflection ray를 depth budget 안에서 재귀 추적합니다. scene syntax는 token 생략을 diffuse로 해석해 backward compatibility를 유지하며, CLI는 default 4와 0..32 범위를 renderer setting에 전달합니다. roughness/refraction/stochastic transport는 범위 밖입니다.

남은 경계는 다음과 같습니다. 물리 기반 Fresnel, roughness, transparency/refraction, stochastic anti-aliasing은 이 material contract에 포함되지 않습니다.

## 11. 학습 완료 자가 점검

- [x] 모든 commit을 source 순서대로 확인했습니다.
- [x] 각 commit의 SHA, subject, importance, tags를 그대로 유지했습니다.
- [x] 모든 핵심 설명에 해당 SHA의 file path와 symbol 근거를 기록했습니다.
- [x] final HEAD의 구조를 과거 SHA에 소급하지 않았습니다.
- [x] S/A/B importance에 맞춰 architecture, subsystem, localized role의 깊이를 구분했습니다.
- [x] source에서 확정하지 않은 실행 결과나 runtime 수치를 사실로 채우지 않았습니다.
- [x] failure와 fix/test를 실제 production path로 연결했습니다.
- [x] test가 증명하는 것과 증명하지 않는 것을 구분했습니다.
- [x] invariant ledger의 각 변화를 commit evidence와 연결했습니다.
- [ ] 해당 SHA checkout에서 테스트·benchmark·sanitizer를 직접 실행했습니다. 환경 제한 때문에 미실행 상태입니다.
- [x] 별도의 프로젝트 재학습 없이 이 Thread의 설계 → 구현 → 위험 → 수정 → 검증 발전을 설명할 수 있는 기록을 남겼습니다.
