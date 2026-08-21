# Thread 1. From geometric contracts to the first rendered image

## 1. Thread 목표

공통 `Shape`/`HitRecord` 계약에서 시작해 유효한 `.rt` 입력이 하나의 `Scene`으로 구성되고, 카메라 광선·조명·그림자·직렬 픽셀 루프를 거쳐 P3 PPM과 체크섬으로 노출되는 최초의 완전한 실행 경로를 복원합니다. 이 Thread의 직렬 렌더러는 이후 BVH와 멀티스레드 구현이 보존해야 하는 의미적 기준선입니다.

### Source significance

> This progression turns isolated mathematical and geometric types into an externally usable renderer.
> The important sequence is not merely feature accumulation: the shape contract gives every primitive
> one result model, the scene supplies one authoritative selection boundary, the parser constructs
> that state, camera and shading transform it into pixel colors, and the renderer/output/CLI layers
> preserve a deterministic artifact. The serial implementation also becomes the semantic baseline
> against which later BVH and threaded versions are judged.

### 이 Thread에 연결된 source invariant

- Parsed scene directives must be syntactically valid, finite, in range, and geometrically non-degenerate; required singleton directives must be present and not duplicated.
- Golden checksums and exact PPM bytes remain stable across repeat runs, acceleration modes, and tested worker counts unless an intentional rendering contract changes.

## 2. 이 Thread를 이해하기 위한 핵심 질문

- `Shape::intersect`와 `HitRecord`가 geometry, scene traversal, shading 사이의 경계를 어떻게 고정하는가?
- `Scene::intersect`가 최근접 hit와 exact equal-`t` 선택을 어떤 순서 규칙으로 결정하는가?
- parser는 line-local 오류와 whole-file 누락을 어떻게 구분하고, 불완전한 장면 반환을 어떻게 막는가?
- 화면 좌표가 정규화된 카메라 광선으로 변환되는 실제 caller/callee 흐름은 무엇인가?
- 직접광과 shadow ray의 시작·끝 구간이 self-intersection과 light 뒤쪽 geometry를 어떻게 배제하는가?
- 한 픽셀의 색이 byte RGB, 체크섬, P3 파일, CLI exit status로 이어지는 순서를 어디서 확인할 수 있는가?

## 3. 완료 기준

- [x] 각 커밋의 해당 SHA에서 실제 선언·정의·호출 지점을 기록했습니다.
- [x] parser 입력부터 PPM 파일까지의 전체 caller → callee 흐름을 실제 심볼과 파일 경로로 설명할 수 있습니다.
- [x] geometry hit 계약, scene candidate selection, shading 정책, image storage, output/CLI 책임을 구분할 수 있습니다.
- [x] 잘못된 장면이 출력 파일을 만들지 않는 이유를 실행 순서와 smoke test로 연결했습니다.
- [x] 후속 BVH·tile renderer가 무엇을 최적화하되 어떤 결과를 보존해야 하는지 직렬 기준선에서 설명할 수 있습니다.
- [x] 모든 참조 SHA가 `cpp/miniRT` branch HEAD의 ancestry에 속하는지 확인했습니다.
- [ ] 해당 SHA checkout에서 build/test/benchmark 명령을 직접 실행했습니다. 로컬 외부 네트워크와 checkout이 제공되지 않아 실행 evidence는 만들지 않았습니다.

### 검증 범위

- 지정 branch HEAD: `7d08c7c13fa68c3e60eea3c7014658b0a133e6f0`
- 각 참조 SHA는 Thread 내부의 연속 compare chain에서 `behind_by = 0`, merge base가 선행 SHA였고, Thread 종료 SHA도 branch HEAD의 조상으로 확인했습니다.
- 구현 설명은 해당 commit의 diff/file content를 기준으로 작성했으며, final HEAD의 후속 API를 과거 SHA에 소급하지 않았습니다.
- 테스트와 benchmark는 source mechanism과 production path만 검사했습니다. 실행 결과, sanitizer 결과, wall-clock 수치는 기록하지 않았습니다.

## 4. Commit map

1. `f3f1d04cc836` — `feat(geometry): hit와 도형 교차 계약 정의`
   - Importance: S
   - Tags: ARCH, GEOMETRY, SCENE
   - Source-defined role: Establishes the common shape/hit contract that lets scene traversal and shading consume heterogeneous geometry.

2. `2a01cb406d9d` — `feat(scene): 카메라·조명과 장면 aggregate 구성`
   - Importance: A
   - Tags: ARCH, SCENE
   - Source-defined role: Creates the scene aggregate that owns the state needed to trace an image.

3. `41a1d6bbe5ef` — `feat(scene): 선형 최근접 교차 탐색 구현`
   - Importance: A
   - Tags: CORE, SCENE
   - Source-defined role: Defines the linear closest-hit reference semantics later preserved by acceleration.

4. `3545eb1e82df` — `feat(parser): 소스 위치 오류와 line tokenization 구성`
   - Importance: B
   - Tags: PARSER, PRACTICAL
   - Source-defined role: Establishes source-located parser diagnostics and line tokenization.

5. `6bff18bf0bac` — `feat(parser): 줄 단위 지시어 dispatch 기반 구성`
   - Importance: A
   - Tags: ARCH, PARSER
   - Source-defined role: Defines the directive-dispatch grammar boundary.

6. `1e1fda47d913` — `feat(parser): 필수 지시어 검증과 입력 loader 완성`
   - Importance: A
   - Tags: PARSER, INTEGRATION
   - Source-defined role: Completes required-directive validation and file/text scene loading.

7. `e6da5f987b97` — `feat(camera): 화면 좌표를 카메라 광선으로 변환`
   - Importance: A
   - Tags: CORE, RAY_PIPELINE
   - Source-defined role: Converts pixel coordinates into camera rays.

8. `e8b7dc42a52c` — `feat(render): 직접광과 그림자 추적 구현`
   - Importance: S
   - Tags: CORE, RAY_PIPELINE, RISK
   - Source-defined role: Defines ambient/direct lighting and shadow visibility.

9. `c742b2401e52` — `feat(renderer): 직렬 이미지 렌더링 구현`
   - Importance: S
   - Tags: ARCH, CORE, RAY_PIPELINE
   - Source-defined role: Executes the complete serial image-rendering loop.

10. `1bc7cacd30aa` — `feat(output): PPM 직렬화와 이미지 체크섬 구현`
   - Importance: A
   - Tags: OUTPUT, DETERMINISM
   - Source-defined role: Publishes a P3 representation and deterministic checksum.

11. `b983f0ea2744` — `feat(cli): 장면 렌더링 명령 연결`
   - Importance: B
   - Tags: CLI, INTEGRATION
   - Source-defined role: Connects the pipeline to the CLI.

12. `d05a6ab48bb1` — `test(render): 장면 렌더링 smoke 검사 추가`
   - Importance: B
   - Tags: TEST, INTEGRATION
   - Source-defined role: Verifies the first complete valid and invalid command paths.

## 5. Commit별 학습 기록

### 5.1 `f3f1d04cc836` — `feat(geometry): hit와 도형 교차 계약 정의`

- Importance: S
- Tags: ARCH, GEOMETRY, SCENE
- Thread order: 1/12

#### Source에서 확정된 역할

- Development Thread role: Establishes the common shape/hit contract that lets scene traversal and shading consume heterogeneous geometry.

#### S-level architecture와 invariant 복원

- **직전 관련 상태:** 공통 교차 결과가 없으면 각 도형이 서로 다른 반환 형식이나 출력 인자를 사용하게 되고, 장면 순회와 조명 코드는 구·평면·원기둥의 구체 타입을 알아야 합니다. 이 SHA는 이후 subsystem이 공유할 최초의 geometry 결과 계약을 만드는 지점입니다.
- **핵심 구현 결정:** `include/ray/geometry.hpp`에 다형적 `Shape`를 두고 virtual destructor, `[t_min, t_max]`를 받는 `intersect`, material 접근을 공통 interface로 정의합니다. `HitRecord`는 교차 거리 `t`, 점, 정규화된 법선, material 값, 원본 `Shape` 포인터, 앞면 여부를 한 결과로 묶습니다. `HitRecord::setFaceNormal`은 incoming ray와 outward normal의 내적 부호로 `frontFace`를 정한 뒤 저장 법선을 ray 반대쪽으로 맞춥니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - include/ray/geometry.hpp — `Shape`, `HitRecord`, `HitRecord::setFaceNormal`
  - src/geometry.cpp — 해당 시점의 공통 geometry 구현
- **caller → callee / data flow:** concrete shape의 `intersect(ray, tMin, tMax, record)` → candidate parameter/point/outward normal 계산 → `setFaceNormal` → material 값과 source shape identity 기록 → scene/shading이 동일 record 소비
- **ownership·state transition:** `HitRecord`가 point·normal·material을 값으로 보유합니다. `HitRecord::shape`는 `const Shape*` 비소유 포인터이므로 record 수명보다 shape owner의 수명이 길어야 합니다. normal은 outward normal 그대로가 아니라 incoming ray에 대해 방향이 정해진 상태로 저장됩니다.
- **failure/edge branch:** 이 SHA는 호출자가 주는 유효 구간 밖의 root를 거부할 수 있는 interface만 제공합니다. shape lifetime을 record가 연장하지 않으며, 구체 도형의 완전한 교차 수식과 scene winner 규칙은 아직 이 commit의 보장이 아닙니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 모든 도형이 동일한 hit 표현을 생산하고, shading은 concrete type 없이 point·oriented normal·material·identity를 읽을 수 있습니다.
- **이 SHA가 보장하지 않는 것:** 구·평면·원기둥별 계산, scene-level closest selection, exact equal-`t` 규칙은 후속 commit에서 확인해야 합니다.
- **직접 확인/후속 evidence:** 후속 `41a1d6bbe5ef`, `e8b7dc42a52c`, BVH 관련 SHA가 같은 record를 실제로 소비하는 것을 역사 순서대로 대조했습니다. 실행 명령은 수행하지 않았습니다.

#### Thread 내 연결

- 이전 Thread commit: 이 Thread의 시작점
- 다음 Thread commit: `2a01cb406d9d`
- 이 commit이 다음 단계에 제공하는 것: `2a01cb406d9d`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.2 `2a01cb406d9d` — `feat(scene): 카메라·조명과 장면 aggregate 구성`

- Importance: A
- Tags: ARCH, SCENE
- Thread order: 2/12

#### Source에서 확정된 역할

- Development Thread role: Creates the scene aggregate that owns the state needed to trace an image.

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** 공통 shape/hit 계약만으로는 한 장의 이미지를 추적하는 데 필요한 해상도, 카메라, ambient/background, 조명과 도형 집합을 한곳에서 관리할 수 없습니다.
- **핵심 구현 결정:** `Scene` aggregate에 width/height, 필수 directive 존재 여부, ambient/background, `Camera`, lights, shapes를 모읍니다. 이 SHA의 shape 저장은 `std::vector<std::shared_ptr<Shape>>`이므로 final HEAD의 `unique_ptr`·private storage를 소급하지 않습니다. `addLight`와 aggregate field가 parser와 renderer의 공통 상태를 만듭니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - include/ray/scene.hpp — `Scene`, `Camera`, light/shape storage
  - src/scene.cpp — scene aggregate 동작
- **caller → callee / data flow:** parser 또는 caller가 directive 값을 검증 → `Scene` field 설정/shape·light 추가 → camera/shading/renderer가 같은 aggregate를 읽음
- **ownership·state transition:** 이 시점에는 Scene과 외부 `shared_ptr` 보유자가 shape ownership을 공유할 수 있습니다. required-directive flags는 장면 구성 완료 여부를 나타내지만 whole-file validation은 아직 parser 후속 commit에 있습니다.
- **failure/edge branch:** aggregate 자체는 누락·중복 directive를 거부하지 않고, 가속 구조나 invalidation 상태도 갖지 않습니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 한 장면의 렌더링 입력을 하나의 값 경계에서 전달할 수 있습니다.
- **이 SHA가 보장하지 않는 것:** 최근접 교차, parser 완료 조건, acceleration ownership은 각각 후속 commit의 책임입니다.
- **직접 확인/후속 evidence:** `2a01cb406d9d`의 field와 저장 타입을 해당 SHA에서 확인하고, `ef5320a83c27`의 private/immutable 상태를 이 시점에 소급하지 않았습니다.

#### Thread 내 연결

- 이전 Thread commit: `f3f1d04cc836`
- 다음 Thread commit: `41a1d6bbe5ef`
- 이 commit이 다음 단계에 제공하는 것: `41a1d6bbe5ef`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.3 `41a1d6bbe5ef` — `feat(scene): 선형 최근접 교차 탐색 구현`

- Importance: A
- Tags: CORE, SCENE
- Thread order: 3/12

#### Source에서 확정된 역할

- Development Thread role: Defines the linear closest-hit reference semantics later preserved by acceleration.

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** Scene이 도형을 보유해도 광선에 대해 어떤 hit를 authoritative result로 선택할지 정해지지 않으면 shading과 향후 BVH가 비교할 기준이 없습니다.
- **핵심 구현 결정:** `Scene::intersect`가 shape 저장 순서로 선형 순회합니다. 현재 `closest`를 각 `Shape::intersect`의 upper bound로 넘기고 candidate가 성공할 때 authoritative record와 `closest`를 교체합니다. interval upper bound가 포함되고 candidate가 성공하면 그대로 갱신되므로 exact equal-`t`에서는 뒤에 순회한 shape가 winner가 됩니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - src/scene.cpp — `Scene::intersect`
  - include/ray/scene.hpp — scene query 선언
- **caller → callee / data flow:** ray + caller interval → shapes 순서대로 primitive dispatch → 현재 closest 이하 candidate → record 교체 → 마지막 winner 반환
- **ownership·state transition:** `closest`와 output `HitRecord`가 loop의 authoritative state입니다. record의 non-owning shape pointer는 Scene이 보유한 shape를 가리킵니다.
- **failure/edge branch:** 가속 없이 모든 shape를 검사하므로 correctness 기준은 생기지만 work는 O(N)입니다. equal-`t` winner는 단순히 “먼저 발견한 것”이 아니라 뒤 index임을 보존해야 합니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** caller 구간 안의 최근접 hit와 저장 순서에 따른 exact tie semantics를 정의합니다.
- **이 SHA가 보장하지 않는 것:** primitive work 계측과 BVH는 아직 없습니다.
- **직접 확인/후속 evidence:** 후속 `9a7f29b5d78a`의 `(t, original index)` candidate rule이 이 선형 기준을 명시적으로 재현하는 것을 대조했습니다.

#### Thread 내 연결

- 이전 Thread commit: `2a01cb406d9d`
- 다음 Thread commit: `3545eb1e82df`
- 이 commit이 다음 단계에 제공하는 것: `3545eb1e82df`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.4 `3545eb1e82df` — `feat(parser): 소스 위치 오류와 line tokenization 구성`

- Importance: B
- Tags: PARSER, PRACTICAL
- Thread order: 4/12

#### Source에서 확정된 역할

- Development Thread role: Establishes source-located parser diagnostics and line tokenization.

#### B-level 구현 역할 복원

- **직전 관련 상태:** 장면 문자열을 해석할 때 단순 예외 메시지만 있으면 어느 파일의 몇 번째 줄이 잘못됐는지 caller가 알 수 없고, 주석·공백·token 처리를 directive마다 반복하게 됩니다.
- **핵심 구현 결정:** `ParseError`에 source name과 line을 저장하고 `source[:line]: message` 형태를 만듭니다. 공통 trim과 whitespace tokenization helper를 추가해 line-local parsing의 기반을 둡니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - include/ray/parser.hpp — `ParseError`와 parser 선언
  - src/parser.cpp — trim/tokenization 및 오류 문자열 구성
- **caller → callee / data flow:** source text line → trim/token split → validation failure → source/line을 포함한 `ParseError`
- **ownership·state transition:** line number가 0보다 큰 오류는 실제 줄에 귀속되고, whole-file/file-open 오류는 후속 loader에서 line 0으로 구분할 수 있는 표현이 생깁니다.
- **failure/edge branch:** 이 commit은 완전한 directive grammar나 required singleton 검증을 아직 제공하지 않습니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 파서 오류를 입력 위치와 연결하고 모든 directive가 같은 tokenization 기반을 사용할 수 있습니다.
- **이 SHA가 보장하지 않는 것:** dispatch와 loader 완료 조건은 다음 commit들에 남아 있습니다.
- **직접 확인/후속 evidence:** 후속 invalid fixture test가 source line을 assertion하는 경로와 연결했습니다.

#### Thread 내 연결

- 이전 Thread commit: `41a1d6bbe5ef`
- 다음 Thread commit: `6bff18bf0bac`
- 이 commit이 다음 단계에 제공하는 것: `6bff18bf0bac`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.5 `6bff18bf0bac` — `feat(parser): 줄 단위 지시어 dispatch 기반 구성`

- Importance: A
- Tags: ARCH, PARSER
- Thread order: 5/12

#### Source에서 확정된 역할

- Development Thread role: Defines the directive-dispatch grammar boundary.

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** tokenization만으로는 identifier별 arity·범위·중복 규칙을 한곳에서 적용하거나 unknown directive를 fail closed로 처리할 수 없습니다.
- **핵심 구현 결정:** 물리적 줄을 순회하며 comment 제거, trim, 빈 줄 skip, token split, identifier dispatch 순서로 처리합니다. directive handler는 exact arity와 값 검증을 담당하고, unknown identifier는 source-located `ParseError`로 거부합니다. singleton duplicate 검사와 non-degenerate 값 검증도 handler 경계에 둡니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - src/parser.cpp — line loop, directive dispatch, directive별 handler/validator
- **caller → callee / data flow:** 각 physical line → comment 제거 → tokens → first token dispatch → validated Scene mutation 또는 즉시 ParseError
- **ownership·state transition:** 한 줄은 검증이 끝난 뒤에만 Scene을 변경합니다. unknown/surplus token은 무시되지 않습니다.
- **failure/edge branch:** line-local grammar는 생기지만 파일 전체가 끝났을 때 R/A/C 누락을 막는 final validation은 아직 없습니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** directive 문법과 Scene mutation 사이에 fail-closed 경계를 만듭니다.
- **이 SHA가 보장하지 않는 것:** 불완전하지만 line-local하게 유효한 장면이 반환되지 않도록 하는 whole-file 검사는 `1e1fda47d913`에서 완성됩니다.
- **직접 확인/후속 evidence:** 해당 SHA의 parser diff에서 dispatch와 handler 추가를 확인했습니다. 후속 material token grammar를 이 시점에 소급하지 않았습니다.

#### Thread 내 연결

- 이전 Thread commit: `3545eb1e82df`
- 다음 Thread commit: `1e1fda47d913`
- 이 commit이 다음 단계에 제공하는 것: `1e1fda47d913`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.6 `1e1fda47d913` — `feat(parser): 필수 지시어 검증과 입력 loader 완성`

- Importance: A
- Tags: PARSER, INTEGRATION
- Thread order: 6/12

#### Source에서 확정된 역할

- Development Thread role: Completes required-directive validation and file/text scene loading.

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** 각 줄이 유효해도 필수 singleton인 resolution, ambient, camera 중 하나가 빠진 파일은 렌더링 가능한 Scene이 아닙니다.
- **핵심 구현 결정:** 전체 line 처리 후 R/A/C 존재 flags를 검사하고 누락 시 line 0의 `ParseError`를 던집니다. `parseSceneText`, 파일 stream을 여는 경로, public loader를 연결하고 파일 open failure도 source-level error로 만듭니다. 유효/무효 `.rt` fixture가 추가됩니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - include/ray/parser.hpp — text/file loader API
  - src/parser.cpp — `parseSceneText`, file load, required-directive final validation
  - scenes/basic.rt
  - scenes/invalid.rt
- **caller → callee / data flow:** file open → text read → line-local parse/mutation → EOF required singleton validation → 완성된 Scene 반환
- **ownership·state transition:** 성공 반환이 Scene completeness의 commit point입니다. line-local 오류는 실제 line, 파일 open/whole-file 누락은 line 0으로 표현됩니다.
- **failure/edge branch:** 어느 단계에서든 `ParseError`가 나오면 Scene은 caller에 성공값으로 반환되지 않습니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 유효한 directive 집합만 renderer로 전달됩니다.
- **이 SHA가 보장하지 않는 것:** CLI가 loader를 호출해 output 전에 실패하는 경로는 `b983f0ea2744`에서 외부 계약이 됩니다.
- **직접 확인/후속 evidence:** invalid fixture와 후속 smoke script의 no-output assertion을 production 순서에 연결했습니다.

#### Thread 내 연결

- 이전 Thread commit: `6bff18bf0bac`
- 다음 Thread commit: `e6da5f987b97`
- 이 commit이 다음 단계에 제공하는 것: `e6da5f987b97`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.7 `e6da5f987b97` — `feat(camera): 화면 좌표를 카메라 광선으로 변환`

- Importance: A
- Tags: CORE, RAY_PIPELINE
- Thread order: 7/12

#### Source에서 확정된 역할

- Development Thread role: Converts pixel coordinates into camera rays.

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** Scene의 camera directive 값은 존재하지만 image coordinate를 world-space ray로 바꾸는 정규직교 frame과 FOV/aspect mapping이 없습니다.
- **핵심 구현 결정:** `buildCameraFrame`이 camera direction을 정규화하고, forward와 평행하지 않은 world-up 후보를 고른 뒤 cross product로 right/up을 구성합니다. `makeCameraRay`는 pixel sample을 normalized screen coordinate로 바꾸고 aspect/FOV scale과 Y 반전을 적용한 후 방향을 다시 정규화합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - include/ray/camera.hpp — camera frame/ray API
  - src/camera.cpp — `buildCameraFrame`, `makeCameraRay`
- **caller → callee / data flow:** camera position/direction/FOV + image dimensions + sample `(x,y)` → precomputed frame → NDC/screen coordinate → normalized world ray
- **ownership·state transition:** frame은 렌더 전체에서 재사용 가능한 derived read-only 값입니다. 방향이 +Z에 가까운 경우 up 후보를 바꾸어 cross product 붕괴를 피합니다.
- **failure/edge branch:** safe dimension 처리로 분모 0을 피하지만 parser가 보장해야 할 실제 positive resolution과 finite/nonzero direction 정책을 대신하지 않습니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 각 화면 sample이 일관된 camera ray로 변환됩니다.
- **이 SHA가 보장하지 않는 것:** ray가 scene color로 변환되는 shading과 pixel loop는 다음 commit들에 있습니다.
- **직접 확인/후속 evidence:** 후속 serial renderer가 `(x+0.5, y+0.5)`를 전달하는 호출 경로와 연결했습니다.

#### Thread 내 연결

- 이전 Thread commit: `1e1fda47d913`
- 다음 Thread commit: `e8b7dc42a52c`
- 이 commit이 다음 단계에 제공하는 것: `e8b7dc42a52c`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.8 `e8b7dc42a52c` — `feat(render): 직접광과 그림자 추적 구현`

- Importance: S
- Tags: CORE, RAY_PIPELINE, RISK
- Thread order: 8/12

#### Source에서 확정된 역할

- Development Thread role: Defines ambient/direct lighting and shadow visibility.

#### S-level architecture와 invariant 복원

- **직전 관련 상태:** camera ray와 hit 계약이 있어도 miss 색, ambient term, Lambertian direct light, visibility를 계산하는 terminal tracing path가 없습니다.
- **핵심 구현 결정:** `traceRay`가 miss에서 background를 반환하고 hit에서는 ambient contribution을 시작값으로 둡니다. 각 light에 대해 거리와 normalized light direction을 구하고 `dot(normal, lightDirection)`이 양수일 때만 shadow query를 수행합니다. shadow ray는 normal 방향으로 `kRayTMin`만큼 이동한 점에서 시작하며 upper bound를 `distance - kRayTMin`로 제한해 light 뒤 도형을 occluder로 보지 않습니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - include/ray/renderer.hpp — tracing/shading API
  - src/shading.cpp — `traceRay`, direct-light/shadow path
  - src/scene.cpp — occlusion query가 통과하는 scene traversal
- **caller → callee / data flow:** primary ray → `Scene::intersect` → miss background 또는 hit ambient → each light: positive diffuse → bounded shadow ray → visible direct contribution → clamped color의 입력
- **ownership·state transition:** shadow ray는 원래 primary ray와 별개이며 origin offset과 `[kRayTMin, lightDistance-kRayTMin]` 구간을 갖습니다. material은 `HitRecord`에서 값으로 읽습니다.
- **failure/edge branch:** 거리 epsilon 이하 또는 diffuse term 이하이면 shadow query 자체를 생략합니다. 이 SHA의 `maxDepth` 인자는 아직 recursive material에 소비되지 않습니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** self-intersection을 줄이는 시작 offset과 light segment에 한정된 visibility를 포함한 deterministic direct lighting을 정의합니다.
- **이 SHA가 보장하지 않는 것:** 반사 recursion은 `85583e1e9beb`에서 추가됩니다. 이 commit은 random sampling이나 global illumination을 제공하지 않습니다.
- **직접 확인/후속 evidence:** 직렬 renderer와 material thread에서 이 함수를 소비하는 상태를 각 SHA별로 분리해 확인했습니다.

#### Thread 내 연결

- 이전 Thread commit: `e6da5f987b97`
- 다음 Thread commit: `c742b2401e52`
- 이 commit이 다음 단계에 제공하는 것: `c742b2401e52`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.9 `c742b2401e52` — `feat(renderer): 직렬 이미지 렌더링 구현`

- Importance: S
- Tags: ARCH, CORE, RAY_PIPELINE
- Thread order: 9/12

#### Source에서 확정된 역할

- Development Thread role: Executes the complete serial image-rendering loop.

#### S-level architecture와 invariant 복원

- **직전 관련 상태:** camera와 shading 함수가 있어도 모든 pixel을 정확한 순서와 quantization 규칙으로 채우는 image-level 실행 경로가 없습니다.
- **핵심 구현 결정:** `renderScene`이 `Image`를 만들고 row-major로 모든 `(x,y)`를 순회합니다. sample은 pixel center `(x+0.5, y+0.5)` 하나이며, camera ray → `traceRay` → `[0,1]` clamp → `std::lround(component*255)` 순서로 byte RGB를 저장합니다. 이 직렬 순서와 산술이 향후 BVH/threads의 의미적 기준선입니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - include/ray/renderer.hpp — `RenderSettings`, `Image`, `renderScene`
  - src/renderer.cpp — serial pixel loop
- **caller → callee / data flow:** Scene + settings → camera frame → row-major pixel center → camera ray → trace → clamp/quantize → contiguous RGB bytes → Image
- **ownership·state transition:** 한 cursor 또는 pixel offset이 image storage를 순차적으로 채웁니다. 렌더 반환 전 모든 pixel이 완성됩니다.
- **failure/edge branch:** 이 시점의 `Image` allocation은 `width*height*3` 산술 overflow를 아직 검사하지 않습니다. `samplesPerPixel`, `tMin/tMax` 설정도 실제 loop에서 모두 소비되는 상태가 아닙니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 한 scene에 대해 deterministic single-sample image byte baseline을 만듭니다.
- **이 SHA가 보장하지 않는 것:** 안전한 image representation은 Thread 6, tile/parallel execution은 Thread 5에서 보완됩니다.
- **직접 확인/후속 evidence:** 후속 exact PPM/checksum 및 worker-count equivalence가 이 pixel kernel 결과를 비교하는 것을 확인했습니다.

#### Thread 내 연결

- 이전 Thread commit: `e8b7dc42a52c`
- 다음 Thread commit: `1bc7cacd30aa`
- 이 commit이 다음 단계에 제공하는 것: `1bc7cacd30aa`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.10 `1bc7cacd30aa` — `feat(output): PPM 직렬화와 이미지 체크섬 구현`

- Importance: A
- Tags: OUTPUT, DETERMINISM
- Thread order: 10/12

#### Source에서 확정된 역할

- Development Thread role: Publishes a P3 representation and deterministic checksum.

#### A-level subsystem와 decision 복원

- **직전 관련 상태:** 완성된 RGB byte buffer가 있어도 외부 artifact와 repeat-run 비교값이 없습니다.
- **핵심 구현 결정:** `writePpm`이 P3 header와 RGB 값을 text로 직렬화하고, checksum 함수가 dimensions의 low/high byte와 pixel bytes를 순서대로 FNV-1a 방식으로 반영해 16진수 문자열을 만듭니다. 이 SHA의 offset basis는 `1469598103934665603ULL`이며 표준 상수 수정 전 상태입니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - include/ray/output.hpp — PPM/checksum API
  - src/output.cpp — `writePpm`, image checksum
- **caller → callee / data flow:** Image dimensions/pixels → P3 text 또는 dimension bytes + pixel bytes → checksum hex
- **ownership·state transition:** PPM과 checksum 모두 quantized bytes를 source로 사용합니다. path writer는 이 시점에 대상 파일을 직접 열어 씁니다.
- **failure/edge branch:** stream/write/atomic replacement safety와 public storage validation은 아직 없습니다. 초기 checksum constant는 `89c3c7269877`에서 수정됩니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 외부에서 읽을 수 있는 P3 representation과 repeat-run comparison surface를 제공합니다.
- **이 SHA가 보장하지 않는 것:** 이 시점 checksum 값은 standard FNV-1a와 일치하지 않으며, 파일 실패 시 기존 대상 보존도 보장하지 않습니다.
- **직접 확인/후속 evidence:** Thread 6의 checksum fix와 golden test를 별도 역사 단계로 연결했습니다.

#### Thread 내 연결

- 이전 Thread commit: `c742b2401e52`
- 다음 Thread commit: `b983f0ea2744`
- 이 commit이 다음 단계에 제공하는 것: `b983f0ea2744`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.11 `b983f0ea2744` — `feat(cli): 장면 렌더링 명령 연결`

- Importance: B
- Tags: CLI, INTEGRATION
- Thread order: 11/12

#### Source에서 확정된 역할

- Development Thread role: Connects the pipeline to the CLI.

#### B-level 구현 역할 복원

- **직전 관련 상태:** library-level parse/render/output API가 있어도 사용자가 입력·출력 경로와 checksum 요청을 전달하고 실패를 exit status로 관찰할 수 없습니다.
- **핵심 구현 결정:** `src/main.cpp`가 3개 또는 optional `--checksum`을 포함한 4개 인자를 검증합니다. 성공 경로는 scene load → render → PPM write → optional checksum 출력 순서이며, usage 오류는 2, runtime/parse 오류는 1, 성공은 0으로 종료합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - src/main.cpp — argument parsing과 top-level try/catch
  - Makefile — CLI source 연결
- **caller → callee / data flow:** argv → usage validation → `loadScene` → `renderScene` → `writePpm` → optional checksum stdout → exit 0; exception → stderr → exit 1
- **ownership·state transition:** output 생성은 parsing 이후에만 시작하므로 invalid scene은 writer에 도달하지 않습니다.
- **failure/edge branch:** CLI는 오류를 message/exit status로 변환하지만 당시 writer가 이미 연 대상의 transactional preservation까지 제공하지는 않습니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 최초의 end-to-end command contract와 parse-before-output ordering을 제공합니다.
- **이 SHA가 보장하지 않는 것:** worker/mode/depth options는 후속 commit에서 추가됩니다.
- **직접 확인/후속 evidence:** `d05a6ab48bb1` smoke script가 같은 executable path를 통해 valid/invalid 동작을 검증하는 것을 확인했습니다.

#### Thread 내 연결

- 이전 Thread commit: `1bc7cacd30aa`
- 다음 Thread commit: `d05a6ab48bb1`
- 이 commit이 다음 단계에 제공하는 것: `d05a6ab48bb1`가 소비하거나 검증할 수 있는 현재 contract/state를 만듭니다. 구체적인 연결은 다음 기록에서 현재 SHA와 비교해 설명했습니다.

### 5.12 `d05a6ab48bb1` — `test(render): 장면 렌더링 smoke 검사 추가`

- Importance: B
- Tags: TEST, INTEGRATION
- Thread order: 12/12

#### Source에서 확정된 역할

- Development Thread role: Verifies the first complete valid and invalid command paths.

#### B-level 구현 역할 복원

- **직전 관련 상태:** end-to-end CLI 경로가 만들어졌지만 반복 출력과 잘못된 scene의 no-output behavior를 자동으로 고정하는 증거가 없습니다.
- **핵심 구현 결정:** `tests/render_smoke.sh`가 임시 디렉터리와 cleanup trap을 사용합니다. unknown directive를 포함한 invalid input은 nonzero여야 하고 유효한 output을 만들면 실패합니다. valid 64×32 scene은 두 번 실행해 P3 header, 16진 checksum 형식·동일성, `cmp -s` byte equality를 확인합니다.

#### 실제 코드와 실행 경로

- **확인한 file path와 symbol:**
  - tests/render_smoke.sh — CLI integration regression
  - Makefile — `test` target
- **caller → callee / data flow:** shell fixture 작성 → CLI invalid invocation/no-output assertion → valid invocation 두 번 → header/checksum/byte comparisons
- **ownership·state transition:** test artifact는 temp directory에 한정되고 trap이 제거합니다. production path는 `main`부터 parser, renderer, output까지 전체를 통과합니다.
- **failure/edge branch:** broad smoke이므로 개별 geometry 수식, image overflow, writer replacement failure를 격리해 증명하지 않습니다.

#### Test commit 분석 기준

- **대상 production invariant:** 유효 scene은 결정적인 P3/checksum을 만들고, 잘못된 scene은 성공 artifact를 만들지 않습니다.
- **test technique:** 임시 파일 기반 shell integration, exit-status 검사, header 검사, checksum equality, byte-for-byte comparison
- **통과하는 production path:** `main` → loader/parser → render → output
- **이 test가 증명하는 것:** 두 정상 실행의 외부 bytes/checksum 일치와 invalid command의 실패를 증명합니다.
- **이 test가 증명하지 않는 것:** transactional output failure, sanitizer clean, 모든 parser edge를 증명하지 않습니다.
- **실행 상태:** 테스트 구현과 production 호출 경로는 해당 SHA에서 확인했지만, 이 환경에서는 checkout/build가 불가능해 명령을 실행하지 않았습니다.

#### 보장 범위와 남은 공백

- **이 SHA가 보장하는 것:** 최초 완전한 valid command와 invalid command의 외부 observable contract를 고정합니다.
- **이 SHA가 보장하지 않는 것:** 테스트 자체의 소스 메커니즘은 검사했지만 이 환경에서는 executable을 빌드·실행하지 않았습니다.
- **직접 확인/후속 evidence:** 테스트 성격: broad CLI integration + repeat-run deterministic regression. 실제 명령 결과는 기록하지 않습니다.

#### Thread 내 연결

- 이전 Thread commit: `b983f0ea2744`
- 다음 Thread commit: 이 Thread의 종료점
- 이 commit이 Thread 종료에 제공하는 것: Thread-level invariant ledger와 최종 실행 흐름에서 이 SHA의 결과를 최종 상태에 반영했습니다.

## 6. Invariant ledger

| Invariant | 최초 도입/기준 | 강화 또는 수정 | 부족함/위험 노출 | 고정한 test/evidence | 실제 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| 공통 hit record와 oriented normal | f3f1d04cc836 | f3f1d04cc836 | shape lifetime은 비소유 pointer에 의존 | 후속 scene/shading 사용 경로 | `Shape::intersect`, `HitRecord::setFaceNormal` |
| 선형 최근접 및 equal-`t` winner | 41a1d6bbe5ef | 9a7f29b5d78a에서 명시적 `(t,index)` rule | BVH traversal order가 winner를 바꿀 위험 | 41c9a59f27a6 | `Scene::intersect`의 inclusive upper bound와 candidate 교체 |
| 완성된 Scene만 반환 | 3545eb1e82df/6bff18bf0bac | 1e1fda47d913 | line-local validity만으로 R/A/C 누락 가능 | d05a6ab48bb1 invalid command | EOF required-directive check와 ParseError |
| deterministic serial image bytes | c742b2401e52 | 1bc7cacd30aa에서 artifact/checksum 노출 | image arithmetic와 output failure safety는 미완성 | d05a6ab48bb1 | center sample, clamp, `lround`, row-major RGB |

### Ledger 보완 기록

- 각 invariant는 위 표의 SHA에서 observable behavior 또는 state로 처음 나타났습니다.
- 후속 commit이 같은 용어를 사용하더라도 그 보장을 과거 SHA에 소급하지 않았습니다.
- test/evidence 열은 production path와 assertion 또는 deterministic work gate를 함께 가리킵니다.
- 실행하지 않은 test는 source-level evidence로만 기록했습니다.

## 7. Failure → Fix → Test 연결

| Failure 또는 위험 | Decision/Fix | Test 또는 evidence | 실제 failure path와 assertion |
| --- | --- | --- | --- |
| unknown/malformed/missing scene directive | parser dispatch + EOF required validation | d05a6ab48bb1 smoke invalid path | writer 전에 ParseError → nonzero → output 부재 |
| shadow self-hit 또는 light 뒤 occluder | normal offset + bounded shadow interval | 후속 rendering regressions/직접 코드 검사 | `point+n·epsilon`, upper bound `distance-epsilon` |
| future traversal이 exact tie winner 변경 | 선형 저장 순서 semantics를 기준선으로 유지 | 41c9a59f27a6 | record/shape identity와 full pixels 비교 |

### 연결 검토

- feature commit도 어떤 잘못된 state 또는 semantic drift를 막는지 production path에 연결했습니다.
- fix commit은 기존 가정 → 실제 위험 → root cause → corrected decision → regression 순서로 기록했습니다.
- test가 broad integration인지 deterministic boundary/differential/failure-injection regression인지 commit 기록에서 구분했습니다.
- assertion이 증명하지 않는 범위와 실행하지 못한 항목을 별도로 남겼습니다.

## 8. Ownership / state / responsibility 변화

`Scene`은 카메라·조명·도형 집합의 aggregate입니다. 초기 SHA에서 shapes는
`shared_ptr` storage이므로 외부와 소유를 공유할 수 있고, `HitRecord::shape`는 수명을
연장하지 않는 `const Shape*`입니다. parser는 성공 반환 전까지 Scene construction을
담당하고, renderer는 Scene을 읽어 새 `Image`를 소유해 반환합니다. output은 Image를
소비하지만 이 Thread의 초기 path writer는 아직 final path publication을 transactional하게
관리하지 않습니다. 후속 Thread의 `unique_ptr`/private storage와 atomic output을 이 시점에
소급하지 않았습니다.

### 학습자 최종 기록

- **source state와 derived state:** `Scene`은 카메라·조명·도형 집합의 aggregate입니다. 초기 SHA에서 shapes는 `shared_ptr` storage이므로 외부와 소유를 공유할 수 있고, `HitRecord::shape`는 수명을 연장하지 않는 `const Shape*`입니다. parser는 성공 반환 전까지 Scene construction을 담당하고, renderer는 Scene을 읽어 새 `Image`를 소유해 반환합니다. output은 Image를 소비하지만 이 Thread의 초기 path writer는 아직 final path publication을 transactional하게 관리하지 않습니다. 후속 Thread의 `unique_ptr`/private storage와 atomic output을 이 시점에 소급하지 않았습니다.
- **mutation/transition boundary:** commit별 `ownership·state transition`과 위 invariant ledger에 표시했습니다.
- **failure 시 복구 상태:** Failure → Fix → Test 표와 각 fix/test section에 정상·오류 상태를 구분했습니다.

## 9. Thread 최종 상태

Thread 종료 시 유효 `.rt` 파일은 source-located validation을 통과한 `Scene`으로 바뀌고,
각 pixel center는 camera ray가 되어 선형 closest-hit, direct lighting, bounded shadow visibility를
통과합니다. 결과는 고정 clamp/rounding으로 RGB bytes가 되고 P3 및 checksum으로 노출됩니다.
CLI는 parsing 전에 output을 시작하지 않으며 smoke regression은 invalid no-output과 두 정상
실행의 exact bytes/checksum을 고정합니다. 다만 큰 vector 안정성, acceleration, parallelism,
image mutation, transactional publication은 뒤 Thread의 책임입니다.

### 직접 작성한 결론

- **Thread 시작과 종료의 behavior 차이:** Thread 종료 시 유효 `.rt` 파일은 source-located validation을 통과한 `Scene`으로 바뀌고, 각 pixel center는 camera ray가 되어 선형 closest-hit, direct lighting, bounded shadow visibility를 통과합니다. 결과는 고정 clamp/rounding으로 RGB bytes가 되고 P3 및 checksum으로 노출됩니다. CLI는 parsing 전에 output을 시작하지 않으며 smoke regression은 invalid no-output과 두 정상 실행의 exact bytes/checksum을 고정합니다. 다만 큰 vector 안정성, acceleration, parallelism, image mutation, transactional publication은 뒤 Thread의 책임입니다.
- **아직 다른 Thread 또는 외부 검증이 보완해야 하는 항목:** normalization overflow, BVH correctness, reflection depth, thread failure, representation validation, atomic output publication은 각각 Thread 2~6에서 보완됩니다.

## 10. 최종 architecture 또는 execution flow 정리

### Source가 확정한 흐름 anchor

```text
`main` → `loadScene`/parser → `Scene` → `renderScene` → `makeCameraRay` → `traceRay` → `Scene::intersect`/shadow query → RGB quantization → `Image` → `writePpm`/`imageChecksum`
```

### 실제 코드로 완성한 흐름

1. CLI가 입력 경로와 optional checksum 요청을 검증합니다.
2. loader가 파일을 열고 line tokenizer/dispatcher가 검증된 directive만 Scene에 반영합니다.
3. EOF에서 required singleton R/A/C를 검사한 뒤에만 Scene을 반환합니다.
4. renderer가 camera frame을 만들고 row-major pixel center마다 camera ray를 생성합니다.
5. `traceRay`가 선형 `Scene::intersect`로 authoritative hit를 고르고 miss/background 또는 ambient/direct/shadow color를 계산합니다.
6. color를 `[0,1]`로 clamp하고 `lround(component*255)`로 quantize해 RGB storage에 씁니다.
7. writer/checksum이 같은 Image bytes를 외부 P3와 비교값으로 노출합니다.
8. smoke test는 전체 production path의 valid/invalid 외부 결과를 검사합니다.

### 학습자의 최종 설명

Thread 종료 시 유효 `.rt` 파일은 source-located validation을 통과한 `Scene`으로 바뀌고,
각 pixel center는 camera ray가 되어 선형 closest-hit, direct lighting, bounded shadow visibility를
통과합니다. 결과는 고정 clamp/rounding으로 RGB bytes가 되고 P3 및 checksum으로 노출됩니다.
CLI는 parsing 전에 output을 시작하지 않으며 smoke regression은 invalid no-output과 두 정상
실행의 exact bytes/checksum을 고정합니다. 다만 큰 vector 안정성, acceleration, parallelism,
image mutation, transactional publication은 뒤 Thread의 책임입니다.

남은 경계는 다음과 같습니다. normalization overflow, BVH correctness, reflection depth, thread failure, representation validation, atomic output publication은 각각 Thread 2~6에서 보완됩니다.

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
