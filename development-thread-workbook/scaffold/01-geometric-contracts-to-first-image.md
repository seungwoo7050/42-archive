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

- [ ] 각 커밋의 해당 SHA에서 실제 선언·정의·호출 지점을 기록했습니다.
- [ ] parser 입력부터 PPM 파일까지의 전체 caller → callee 흐름을 실제 심볼과 파일 경로로 설명할 수 있습니다.
- [ ] geometry hit 계약, scene candidate selection, shading 정책, image storage, output/CLI 책임을 구분할 수 있습니다.
- [ ] 잘못된 장면이 출력 파일을 만들지 않는 이유를 실행 순서와 smoke test로 연결했습니다.
- [ ] 후속 BVH·tile renderer가 무엇을 최적화하되 어떤 결과를 보존해야 하는지 직렬 기준선에서 설명할 수 있습니다.

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
- Classification summary: Defines the polymorphic `Shape` intersection contract, `HitRecord`, material transfer, and face-normal orientation.
- Importance rationale: Every primitive, scene query, shading path, acceleration structure, and regression test depends on this contract. Omitting it would leave a central gap in how geometric results become renderer-visible state.
- Most Important Commit anchors:
  - Problem: The renderer needed multiple heterogeneous primitives to participate in one scene query and then provide shading with a consistent point, normal, material, and identity. Primitive-specific return types or ad hoc output parameters would have coupled scene traversal and shading to every concrete shape.
  - Decision: The commit defines one polymorphic `Shape::intersect` contract and one `HitRecord` representation. It also centralizes front/back-face handling so a hit normal is oriented consistently relative to the incoming ray, while material state is copied into the record and the shape pointer remains explicitly non-owning.
  - Why it mattered: This contract is the seam between geometry and the rest of the system. Sphere, plane, cylinder, linear scene traversal, BVH traversal, diffuse shading, metal reflection, tie-breaking tests, and acceleration equivalence all consume the same result model.

#### 해당 SHA에서 확인할 실제 코드

- 해당 SHA의 `Shape` 추상 interface에서 virtual destructor, intersection entry point, material access boundary를 찾고 선언과 구현 파일을 기록합니다.
- `HitRecord`의 parameter, point, normal, material, source shape pointer, front/back-face state가 어떤 field로 표현되는지 표로 옮깁니다.
- `HitRecord::setFaceNormal`이 incoming ray와 outward normal을 사용해 stored normal과 face state를 정하는 mutation 순서를 추적합니다.
- caller-supplied `[t_min, t_max]`가 interface contract에 어떻게 나타나는지 확인하고, record가 소유하는 값과 소유하지 않는 참조를 구분합니다.
- 이 SHA에서 실제 concrete primitive 또는 caller가 새 contract를 사용하는 범위를 확인하되, 뒤 SHA의 구현을 소급하지 않습니다.

#### Source에서 확정된 이 SHA의 경계

- 이 commit은 공통 hit protocol과 normal orientation을 정의하지만 sphere/plane/cylinder의 완전한 교차 계산 자체를 대신하지 않습니다.
- `HitRecord::shape`의 lifetime은 record가 아니라 shape owner에 의존합니다.

#### 추가 확인 포인트

- 왜 oriented normal이 shading에 필요한지 actual caller를 찾기 전에는 추정으로 채우지 말고, 후속 `e8b7dc42a52c`에서 소비 지점을 확인합니다.
- exact `t` tie rule은 이 commit만으로 확정하지 말고 `41a1d6bbe5ef`에서 scene loop를 확인합니다.

#### S-level 학습 기록

##### 직전 상태와 문제

- 이 commit 직전의 relevant architecture/state:
- 해결하려던 문제와 observable risk:
- 기존 설계가 충분하지 않았던 이유:

##### 핵심 decision과 상태 변화

- 선택한 decision:
- 새로 생긴 authoritative boundary:
- ownership/lifetime/state transition의 before → after:
- 다른 subsystem이 이 contract를 소비하는 방식:

##### 보장 범위

- 이 SHA가 보장하는 것:
- 이 SHA가 아직 보장하지 않는 것:
- failure path에서 유지해야 하는 invariant:
- 후속 fix/test가 보완하거나 고정하는 항목:

#### 직접 확인 증거

- 확인한 file path:
- 핵심 symbol과 caller/callee:
- 변경 전 대응 코드:
- 이 SHA의 변경 코드:
- ownership/lifecycle/state transition:
- failure branch와 cleanup:
- 이 코드가 보장하는 invariant:
- 이 코드만으로는 보장하지 않는 것:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: 이 Thread의 시작점
- 다음 Thread commit: `2a01cb406d9d`
- 비교 지침: 직전 상태와 이 SHA를 비교해 primitive 결과를 공통 record로 전달하기 전의 API 공백을 기록하고, 다음 sphere/plane/cylinder 구현이 채워야 할 부분을 분리합니다.
- 직접 작성한 연결 설명:

### 5.2 `2a01cb406d9d` — `feat(scene): 카메라·조명과 장면 aggregate 구성`

- Importance: A
- Tags: ARCH, SCENE
- Thread order: 2/12

#### Source에서 확정된 역할

- Development Thread role: Creates the scene aggregate that owns the state needed to trace an image.
- Classification summary: Introduces the scene aggregate for resolution, ambient state, camera, lights, and shapes.
- Importance rationale: This creates the central state boundary consumed by parsing and rendering. Later ownership and acceleration changes refine it, but the aggregate is the first meaningful system composition point.

#### 해당 SHA에서 확인할 실제 코드

- `Scene`이 보유하는 resolution, required-directive flags, ambient/background, camera, lights, shape collection의 실제 field를 기록합니다.
- stored default와 `hasResolution`/`hasAmbient`/`hasCamera` presence state가 분리된 이유를 constructor/default initialization에서 확인합니다.
- shape storage의 pointer type과 insertion/access 방식을 확인해 이 SHA의 ownership model을 그대로 기록합니다.
- parser가 아직 완성되기 전에도 Scene이 construction target으로 성립하는 API를 찾습니다.
- rendering side가 장면 상태를 어떤 형태로 읽을 수 있는지 public interface를 확인합니다.

#### Source에서 확정된 이 SHA의 경계

- 이 시점의 shape ownership은 shared이며, 최종 `unique_ptr` 설계를 소급해서 적지 않습니다.
- presence flag는 값의 numeric default와 directive supplied 여부를 구분합니다.

#### 추가 확인 포인트

- Scene이 복사 가능한지, shape lifetime이 어떤 smart pointer semantics를 따르는지 실제 type으로 기록합니다.
- parser와 renderer가 아직 어떤 state를 채우거나 소비하지 않는지도 해당 SHA 기준으로 적습니다.

#### A-level 학습 기록

- 직전 관련 상태:
- 핵심 problem/edge:
- 선택한 algorithm 또는 boundary decision:
- 실제 state/data/control-flow 변화:
- 실패하거나 잘못될 수 있는 branch:
- 후속 test/benchmark가 확인해야 하는 항목:

#### 직접 확인 증거

- 확인한 file path와 symbol:
- 변경 전/후 핵심 차이:
- state 또는 boundary 변화:
- failure/edge branch:
- 관련 production test path:
- 이 SHA가 보장하는 것과 남은 공백:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `f3f1d04cc836`
- 다음 Thread commit: `41a1d6bbe5ef`
- 비교 지침: 직전 관련 state가 개별 값에 흩어져 있었는지 parent diff로 확인하고, 후속 `41a1d6bbe5ef`가 traversal responsibility를 어디에 추가하는지 연결합니다.
- 직접 작성한 연결 설명:

### 5.3 `41a1d6bbe5ef` — `feat(scene): 선형 최근접 교차 탐색 구현`

- Importance: A
- Tags: CORE, SCENE
- Thread order: 3/12

#### Source에서 확정된 역할

- Development Thread role: Defines the linear closest-hit reference semantics later preserved by acceleration.
- Classification summary: Implements linear nearest-hit search over scene shapes.
- Importance rationale: The linear path defines the canonical closest-hit and equal-distance behavior that later BVH traversal must preserve, giving this simple loop lasting semantic importance.

#### 해당 SHA에서 확인할 실제 코드

- `Scene::intersect`의 loop, 초기 closest 값, 각 shape에 전달하는 upper bound, successful candidate의 record 교체 순서를 추적합니다.
- shape collection의 iteration order와 exact equal-`t` candidate가 accepted되는 조건을 코드로 확인합니다.
- no-hit 경로에서 return value와 output record 상태가 어떻게 처리되는지 기록합니다.
- shading 이전에 nearest-hit policy가 scene boundary에 집중되는 실제 caller/callee를 찾습니다.
- later-shape equal-`t` winner가 우연한 현상인지 코드 조건으로 재현하고 예시를 작성합니다.

#### Source에서 확정된 이 SHA의 경계

- 이 commit은 traversal cost를 최적화하지 않으며 complete shape scan이 reference입니다.
- exact equal-`t`의 later-shape replacement는 이후 acceleration이 보존해야 하는 observable behavior입니다.

#### 추가 확인 포인트

- candidate가 `t_max`와 정확히 같은 경우 primitive contract와 scene replacement가 어떻게 맞물리는지 실제 조건식을 기록합니다.
- shadow query에서도 같은 interval contract가 재사용되는지는 `e8b7dc42a52c`에서 확인합니다.

#### A-level 학습 기록

- 직전 관련 상태:
- 핵심 problem/edge:
- 선택한 algorithm 또는 boundary decision:
- 실제 state/data/control-flow 변화:
- 실패하거나 잘못될 수 있는 branch:
- 후속 test/benchmark가 확인해야 하는 항목:

#### 직접 확인 증거

- 확인한 file path와 symbol:
- 변경 전/후 핵심 차이:
- state 또는 boundary 변화:
- failure/edge branch:
- 관련 production test path:
- 이 SHA가 보장하는 것과 남은 공백:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `2a01cb406d9d`
- 다음 Thread commit: `3545eb1e82df`
- 비교 지침: 이 SHA의 linear loop를 후속 `9a7f29b5d78a`, `d4f6ee5b6042`와 비교할 기준으로 저장하되, 현재 문서에는 이 SHA의 semantics만 먼저 확정합니다.
- 직접 작성한 연결 설명:

### 5.4 `3545eb1e82df` — `feat(parser): 소스 위치 오류와 line tokenization 구성`

- Importance: B
- Tags: PARSER, PRACTICAL
- Thread order: 4/12

#### Source에서 확정된 역할

- Development Thread role: Establishes source-located parser diagnostics and line tokenization.
- Classification summary: Adds source-located parse errors, comment handling, and line tokenization.
- Importance rationale: The input and diagnostics boundary is useful and durable, but line tokenization and source locations are normal parser infrastructure relative to the later dispatch and loader milestones.

#### 해당 SHA에서 확인할 실제 코드

- `ParseError`가 source name과 physical line number를 보관하는 field와 `what()` formatting 경로를 확인합니다.
- input stream과 caller-provided source name이 parser object/function boundary로 어떻게 들어오는지 기록합니다.
- whitespace trim과 line tokenization utility의 input/output을 실제 signature로 적습니다.
- line number가 언제 증가하고 어느 시점의 validation error에 결합되는지 추적합니다.
- parser-local lexical helper가 public scene model로 노출되지 않는 경계를 확인합니다.

#### Source에서 확정된 이 SHA의 경계

- 이 commit은 directive handlers나 required-directive validation을 완성하지 않습니다.
- structured location을 문자열에서 다시 parse하지 않아도 되는 API가 핵심이며 exact diagnostic text는 실제 테스트에서 기록합니다.

#### B-level 학습 기록

- Thread에서 이 commit이 맡는 구현 역할:
- 실제 추가/수정된 핵심 symbol:
- 입력·상태·출력의 변화:
- 다음 related commit이 의존하는 결과:

#### 직접 확인 증거

- 확인한 file path와 symbol:
- Thread에서 필요한 핵심 변화:
- 직접 확인한 caller/callee 또는 state change:
- 다음 commit에 제공하는 것:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `41a1d6bbe5ef`
- 다음 Thread commit: `6bff18bf0bac`
- 비교 지침: 이 SHA와 다음 dispatch commit 사이에서 lexical preparation과 grammar dispatch 책임이 어디서 갈리는지 비교 준비를 합니다.
- 직접 작성한 연결 설명:

### 5.5 `6bff18bf0bac` — `feat(parser): 줄 단위 지시어 dispatch 기반 구성`

- Importance: A
- Tags: ARCH, PARSER
- Thread order: 5/12

#### Source에서 확정된 역할

- Development Thread role: Defines the directive-dispatch grammar boundary.
- Classification summary: Builds line-oriented directive dispatch, arity checks, duplicate rejection, and unknown-directive errors.
- Importance rationale: The dispatcher becomes the extensible grammar boundary for the whole scene format, so later directives are applications of this decision rather than separate parser architectures.

#### 해당 SHA에서 확인할 실제 코드

- physical-line loop에서 comment removal, trim, empty-line skip, tokenization, identifier dispatch가 실행되는 정확한 순서를 추적합니다.
- duplicate-singleton validator와 nonzero-vector validator의 state/input/error path를 찾습니다.
- unknown directive가 어느 branch에서 `ParseError`가 되는지 source line propagation과 함께 기록합니다.
- 이 SHA에는 concrete handler가 없다는 사실을 actual dispatch table/branch에서 확인하고 nonempty line의 결과를 기록합니다.
- scene state mutation이 handler validation과 어떻게 분리되도록 scaffold가 구성되었는지 확인합니다.

#### Source에서 확정된 이 SHA의 경계

- fail-closed dispatch는 unknown syntax를 무시하거나 partial Scene을 성공 반환하지 않습니다.
- 이 시점에는 모든 nonempty identifier가 unknown-directive failure로 끝납니다.

#### 추가 확인 포인트

- duplicate validation이 어떤 state를 검사하지만 아직 누가 flag를 set하지 않는지 해당 SHA에서 구분합니다.
- handler installation 이후와 혼동하지 않도록 dispatch representation을 캡처합니다.

#### A-level 학습 기록

- 직전 관련 상태:
- 핵심 problem/edge:
- 선택한 algorithm 또는 boundary decision:
- 실제 state/data/control-flow 변화:
- 실패하거나 잘못될 수 있는 branch:
- 후속 test/benchmark가 확인해야 하는 항목:

#### 직접 확인 증거

- 확인한 file path와 symbol:
- 변경 전/후 핵심 차이:
- state 또는 boundary 변화:
- failure/edge branch:
- 관련 production test path:
- 이 SHA가 보장하는 것과 남은 공백:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `3545eb1e82df`
- 다음 Thread commit: `1e1fda47d913`
- 비교 지침: 직전 `3545eb1e82df`의 lexical utilities가 이 SHA의 loop에서 호출되는 경로를 연결하고, 다음 concrete directive commits를 소급해 넣지 않습니다.
- 직접 작성한 연결 설명:

### 5.6 `1e1fda47d913` — `feat(parser): 필수 지시어 검증과 입력 loader 완성`

- Importance: A
- Tags: PARSER, INTEGRATION
- Thread order: 6/12

#### Source에서 확정된 역할

- Development Thread role: Completes required-directive validation and file/text scene loading.
- Classification summary: Requires the mandatory scene directives and completes text/file loading with valid and invalid fixtures.
- Importance rationale: This turns partial directive parsing into a reliable scene-loading boundary used by the CLI, tests, and later acceleration build, making it a significant integration milestone.

#### 해당 SHA에서 확인할 실제 코드

- parse completion 직전에 `R`, `A`, `C` presence를 검사하는 코드와 missing-directive error의 line zero 설정을 찾습니다.
- stream-, text-, file-oriented entry point가 어느 core parser implementation으로 합류하는지 caller graph를 작성합니다.
- file-open failure가 requested path를 source로 가진 `ParseError`로 변환되는 branch를 추적합니다.
- `loadScene`이 executable에 제공하는 narrow boundary와 file handling이 renderer에 노출되지 않는 근거를 확인합니다.
- valid/invalid fixtures가 어떤 directives를 포함하고 invalid fixture의 known line failure가 무엇인지 해당 SHA의 파일을 읽어 기록합니다.

#### Source에서 확정된 이 SHA의 경계

- whole-file omission은 malformed physical line과 달리 line zero로 보고됩니다.
- 이 commit은 scene loading을 완성하지만 camera/rendering/output은 별도 후속 commit입니다.

#### 추가 확인 포인트

- presence flags를 언제 set하는지 각 handler의 success ordering까지 거슬러 확인합니다.
- invalid first occurrence가 duplicate state를 오염시키지 않는지는 관련 handler SHA를 비교해 기록합니다.

#### A-level 학습 기록

- 직전 관련 상태:
- 핵심 problem/edge:
- 선택한 algorithm 또는 boundary decision:
- 실제 state/data/control-flow 변화:
- 실패하거나 잘못될 수 있는 branch:
- 후속 test/benchmark가 확인해야 하는 항목:

#### 직접 확인 증거

- 확인한 file path와 symbol:
- 변경 전/후 핵심 차이:
- state 또는 boundary 변화:
- failure/edge branch:
- 관련 production test path:
- 이 SHA가 보장하는 것과 남은 공백:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `6bff18bf0bac`
- 다음 Thread commit: `e6da5f987b97`
- 비교 지침: 이 SHA의 parent에서 partial directive parsing이 어떤 상태까지 성공했는지 비교하고, 이 commit이 scene-return gate를 어디에 추가했는지 표시합니다.
- 직접 작성한 연결 설명:

### 5.7 `e6da5f987b97` — `feat(camera): 화면 좌표를 카메라 광선으로 변환`

- Importance: A
- Tags: CORE, RAY_PIPELINE
- Thread order: 7/12

#### Source에서 확정된 역할

- Development Thread role: Converts pixel coordinates into camera rays.
- Classification summary: Builds a stable camera frame and converts pixel coordinates into normalized primary rays.
- Importance rationale: The projection mechanism is central to image formation and handles degenerate camera orientation, but it remains one component of the full rendering pipeline.

#### 해당 SHA에서 확인할 실제 코드

- camera frame을 구성하는 forward/right/up 계산과 cross product 순서를 실제 코드로 옮깁니다.
- vertical FOV와 aspect ratio가 viewport width/height로 변환되는 계산을 확인합니다.
- pixel/sample coordinates에서 image-space vertical coordinate를 flip하고 world-space direction을 만드는 경로를 추적합니다.
- zero forward, absent/parallel up vector를 repair하는 fallback branch와 chosen axis를 기록합니다.
- dimensions를 at least one으로 clamp하는 위치와 parser validation이 있어도 defensive logic을 둔 이유를 경계로 구분합니다.
- 반환 `Ray`의 origin과 normalized direction이 어떤 함수에서 확정되는지 확인합니다.

#### Source에서 확정된 이 SHA의 경계

- 이 commit은 한 sample coordinate를 ray로 바꾸는 mechanism을 제공하며 full image loop는 `c742b2401e52`에서 도입됩니다.
- fallback 결과를 final HEAD 기준으로 추정하지 말고 이 SHA의 exact branch를 기록합니다.

#### A-level 학습 기록

- 직전 관련 상태:
- 핵심 problem/edge:
- 선택한 algorithm 또는 boundary decision:
- 실제 state/data/control-flow 변화:
- 실패하거나 잘못될 수 있는 branch:
- 후속 test/benchmark가 확인해야 하는 항목:

#### 직접 확인 증거

- 확인한 file path와 symbol:
- 변경 전/후 핵심 차이:
- state 또는 boundary 변화:
- failure/edge branch:
- 관련 production test path:
- 이 SHA가 보장하는 것과 남은 공백:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `1e1fda47d913`
- 다음 Thread commit: `e8b7dc42a52c`
- 비교 지침: parser의 camera normalization contract와 이 commit의 defensive repair를 비교해 input boundary guarantee와 internal fallback을 혼동하지 않습니다.
- 직접 작성한 연결 설명:

### 5.8 `e8b7dc42a52c` — `feat(render): 직접광과 그림자 추적 구현`

- Importance: S
- Tags: CORE, RAY_PIPELINE, RISK
- Thread order: 8/12

#### Source에서 확정된 역할

- Development Thread role: Defines ambient/direct lighting and shadow visibility.
- Classification summary: Implements ambient and diffuse direct lighting, shadow-ray occlusion, and primary ray tracing.
- Importance rationale: This defines the renderer's principal visual semantics and the self-intersection/visibility rules used by every image. Without it, the project would not yet be a lit ray tracer.
- Most Important Commit anchors:
  - Problem: Intersection alone only identifies visible surfaces. A ray tracer also needs a stable rule for misses, ambient contribution, light visibility, diffuse response, and avoidance of immediate self-intersection when tracing shadows.
  - Decision: The commit starts shading from ambient albedo, adds Lambertian point-light contributions only for front-facing lights, offsets shadow origins along the hit normal, and limits occlusion tests to the light distance. `traceRay` returns the scene background on a miss and delegates a hit to the shared shading path.
  - Why it mattered: This establishes the project's principal visual contract. The later image checksum, BVH equivalence, material compatibility, and threaded determinism tests all assume these exact lighting and shadow semantics.

#### 해당 SHA에서 확인할 실제 코드

- `traceRay`의 miss branch와 hit branch를 분리해 background 반환과 shading 호출 흐름을 기록합니다.
- ambient contribution에서 ambient color/ratio와 material albedo가 어떤 순서로 component-wise 결합되는지 확인합니다.
- 각 point light에 대해 oriented normal과 light direction의 dot product가 contribution eligibility를 정하는 branch를 추적합니다.
- shadow ray origin의 normal offset과 `[t_min, light distance 직전]` interval을 실제 상수·식과 함께 기록합니다.
- occlusion helper와 nearest-hit helper가 모두 `Scene::intersect`를 호출하는지 확인해 traversal implementation이 중복되지 않음을 증명합니다.
- depth parameter가 public API에는 존재하지만 이 SHA에서 실제 결과에 영향을 주지 않는지를 call graph로 확인합니다.

#### Source에서 확정된 이 SHA의 경계

- miss는 background, diffuse hit는 ambient와 visible direct light를 반환합니다.
- shadow origin offset은 source self-hit을, bounded maximum은 light 뒤쪽 geometry의 false occlusion을 막습니다.
- reflection은 아직 구현되지 않았고 depth는 의도적으로 효과가 없습니다.

#### 추가 확인 포인트

- surface가 light를 향하지 않을 때 shadow ray가 생성되는지 actual branch order를 확인합니다.
- clamp가 shading 내부인지 renderer quantization 전인지 실제 코드를 기준으로 구분합니다.

#### S-level 학습 기록

##### 직전 상태와 문제

- 이 commit 직전의 relevant architecture/state:
- 해결하려던 문제와 observable risk:
- 기존 설계가 충분하지 않았던 이유:

##### 핵심 decision과 상태 변화

- 선택한 decision:
- 새로 생긴 authoritative boundary:
- ownership/lifetime/state transition의 before → after:
- 다른 subsystem이 이 contract를 소비하는 방식:

##### 보장 범위

- 이 SHA가 보장하는 것:
- 이 SHA가 아직 보장하지 않는 것:
- failure path에서 유지해야 하는 invariant:
- 후속 fix/test가 보완하거나 고정하는 항목:

#### 직접 확인 증거

- 확인한 file path:
- 핵심 symbol과 caller/callee:
- 변경 전 대응 코드:
- 이 SHA의 변경 코드:
- ownership/lifecycle/state transition:
- failure branch와 cleanup:
- 이 코드가 보장하는 invariant:
- 이 코드만으로는 보장하지 않는 것:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `e6da5f987b97`
- 다음 Thread commit: `c742b2401e52`
- 비교 지침: 직전의 geometry/camera components에서 이 commit이 처음으로 visible radiance semantics를 구성하는 연결을 그리고, 후속 metal commit의 recursion은 넣지 않습니다.
- 직접 작성한 연결 설명:

### 5.9 `c742b2401e52` — `feat(renderer): 직렬 이미지 렌더링 구현`

- Importance: S
- Tags: ARCH, CORE, RAY_PIPELINE
- Thread order: 9/12

#### Source에서 확정된 역할

- Development Thread role: Executes the complete serial image-rendering loop.
- Classification summary: Introduces `Image`, render settings, and the complete serial pixel-to-ray-to-RGB loop.
- Importance rationale: This is the first end-to-end image-generation mechanism and the execution structure later optimized by camera caching, BVH traversal, materials, and tile workers.
- Most Important Commit anchors:
  - Problem: The project had scene parsing, camera rays, and single-ray shading, but no mechanism that covered an entire resolution and produced owned pixel storage.
  - Decision: The commit introduces a contiguous RGB `Image`, a render-settings boundary, and a deterministic serial loop that samples each pixel center, traces exactly one ray, clamps the color, and quantizes it to bytes.
  - Why it mattered: This is the first complete renderer and therefore the semantic reference for later camera caching, tile traversal, multithreading, checksums, PPM output, and acceleration benchmarks. Later performance work changes execution cost and order but is repeatedly tested against the bytes established by this path.

#### 해당 SHA에서 확인할 실제 코드

- `Image`와 `RenderSettings`의 field, default, ownership semantics를 해당 SHA에서 기록합니다.
- row-major nested loop에서 pixel center coordinate를 계산하고 camera ray를 생성하는 순서를 추적합니다.
- 각 pixel이 `traceRay`를 호출한 뒤 color clamp, nearest-byte rounding, interleaved RGB write로 이어지는 계산을 기록합니다.
- buffer size와 index/cursor 계산을 확인해 이 SHA의 representation assumption을 적습니다.
- one sample per pixel, one primary ray per pixel, fixed visit order를 실제 loop로 확인합니다.
- rendering과 file encoding이 분리되어 `Image`를 반환하는 interface를 caller 관점에서 기록합니다.

#### Source에서 확정된 이 SHA의 경계

- 이 commit은 serial reference renderer이며 concurrency나 BVH를 포함하지 않습니다.
- 후속 overflow fix 이전의 allocation/index assumptions을 final implementation으로 덮어쓰지 않습니다.
- PPM serialization은 다음 commit의 책임입니다.

#### 추가 확인 포인트

- rounding rule과 byte cast 순서를 실제 code snippet으로 남겨 checksum change 원인을 추적할 수 있게 합니다.
- row-major cursor와 coordinate-derived offset 중 이 SHA가 어느 방식을 쓰는지 정확히 기록합니다.

#### S-level 학습 기록

##### 직전 상태와 문제

- 이 commit 직전의 relevant architecture/state:
- 해결하려던 문제와 observable risk:
- 기존 설계가 충분하지 않았던 이유:

##### 핵심 decision과 상태 변화

- 선택한 decision:
- 새로 생긴 authoritative boundary:
- ownership/lifetime/state transition의 before → after:
- 다른 subsystem이 이 contract를 소비하는 방식:

##### 보장 범위

- 이 SHA가 보장하는 것:
- 이 SHA가 아직 보장하지 않는 것:
- failure path에서 유지해야 하는 invariant:
- 후속 fix/test가 보완하거나 고정하는 항목:

#### 직접 확인 증거

- 확인한 file path:
- 핵심 symbol과 caller/callee:
- 변경 전 대응 코드:
- 이 SHA의 변경 코드:
- ownership/lifecycle/state transition:
- failure branch와 cleanup:
- 이 코드가 보장하는 invariant:
- 이 코드만으로는 보장하지 않는 것:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `e8b7dc42a52c`
- 다음 Thread commit: `1bc7cacd30aa`
- 비교 지침: 이 SHA 이전에는 single-ray shading만 존재했음을 확인하고, 이후 tile/parallel commits가 동일 pixel kernel을 어떻게 재배치하는지 비교 기준 코드를 보존합니다.
- 직접 작성한 연결 설명:

### 5.10 `1bc7cacd30aa` — `feat(output): PPM 직렬화와 이미지 체크섬 구현`

- Importance: A
- Tags: OUTPUT, DETERMINISM
- Thread order: 10/12

#### Source에서 확정된 역할

- Development Thread role: Publishes a P3 representation and deterministic checksum.
- Classification summary: Adds P3 PPM serialization and a deterministic image checksum.
- Importance rationale: The commit establishes the external artifact and the compact correctness fingerprint subsequently used by tests and benchmarks, giving it significance beyond routine file output.

#### 해당 SHA에서 확인할 실제 코드

- `writePpm`이 P3 magic, dimensions, max channel, pixel lines를 어떤 formatting과 순서로 출력하는지 확인합니다.
- destination open failure가 어떤 exception type/message로 보고되는지 기록합니다.
- `checksumHex`가 dimensions와 pixel bytes를 어떤 byte order/iteration으로 mix하는지 추적합니다.
- 16-digit hexadecimal formatting과 이미 quantized storage를 hash하는 경계를 확인합니다.
- 이 SHA의 FNV-1a-style constants를 그대로 기록하고 후속 `89c3c7269877`의 standard-basis fix와 혼동하지 않습니다.

#### Source에서 확정된 이 SHA의 경계

- 초기 checksum은 deterministic fingerprint를 제공하지만 후속 commit에서 offset basis가 수정됩니다.
- path writer는 destination을 직접 열며 transactional replacement나 temp cleanup을 아직 보장하지 않습니다.

#### A-level 학습 기록

- 직전 관련 상태:
- 핵심 problem/edge:
- 선택한 algorithm 또는 boundary decision:
- 실제 state/data/control-flow 변화:
- 실패하거나 잘못될 수 있는 branch:
- 후속 test/benchmark가 확인해야 하는 항목:

#### 직접 확인 증거

- 확인한 file path와 symbol:
- 변경 전/후 핵심 차이:
- state 또는 boundary 변화:
- failure/edge branch:
- 관련 production test path:
- 이 SHA가 보장하는 것과 남은 공백:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `c742b2401e52`
- 다음 Thread commit: `b983f0ea2744`
- 비교 지침: 직전 `Image` byte storage를 이 commit이 어떻게 외부 artifact와 regression identity로 변환하는지 연결하고, atomic output은 아직 없음을 표시합니다.
- 직접 작성한 연결 설명:

### 5.11 `b983f0ea2744` — `feat(cli): 장면 렌더링 명령 연결`

- Importance: B
- Tags: CLI, INTEGRATION
- Thread order: 11/12

#### Source에서 확정된 역할

- Development Thread role: Connects the pipeline to the CLI.
- Classification summary: Connects scene loading, rendering, PPM writing, checksum output, and exit-status handling.
- Importance rationale: This is necessary product integration, but it composes already established subsystem APIs without changing their semantics.

#### 해당 SHA에서 확인할 실제 코드

- accepted positional arguments와 optional `--checksum`의 parsing branch를 해당 SHA에서 기록합니다.
- usage error status 2와 load/render/write exception status 1의 분기·stderr prefix를 추적합니다.
- load → render → write ordering과 checksum 출력 시점을 actual main path에서 확인합니다.
- invalid scene이 image creation/write에 도달하지 않는 이유를 call order로 설명합니다.
- Make smoke target이 placeholder argument check에서 real pipeline invocation으로 바뀐 부분을 확인합니다.

#### Source에서 확정된 이 SHA의 경계

- 이 SHA의 CLI는 scene path, output path, optional checksum만 지원합니다.
- later `--accel`, `--threads`, `--max-depth` options를 소급하지 않습니다.

#### B-level 학습 기록

- Thread에서 이 commit이 맡는 구현 역할:
- 실제 추가/수정된 핵심 symbol:
- 입력·상태·출력의 변화:
- 다음 related commit이 의존하는 결과:

#### 직접 확인 증거

- 확인한 file path와 symbol:
- Thread에서 필요한 핵심 변화:
- 직접 확인한 caller/callee 또는 state change:
- 다음 commit에 제공하는 것:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `1bc7cacd30aa`
- 다음 Thread commit: `d05a6ab48bb1`
- 비교 지침: 이 commit은 subsystem APIs를 조립하는 boundary이므로 각 subsystem 내부 동작을 중복 설명하지 말고 exception translation과 ordering을 집중 비교합니다.
- 직접 작성한 연결 설명:

### 5.12 `d05a6ab48bb1` — `test(render): 장면 렌더링 smoke 검사 추가`

- Importance: B
- Tags: TEST, INTEGRATION
- Thread order: 12/12

#### Source에서 확정된 역할

- Development Thread role: Verifies the first complete valid and invalid command paths.
- Classification summary: Adds an end-to-end smoke script for parser failure, PPM headers, and deterministic output.
- Importance rationale: The test provides useful integration confidence, but it covers expected behavior rather than a difficult invariant or discovered regression.

#### Test commit 분석 기준

- 대상 production invariant: invalid scene은 output 생성 전에 실패하고, valid deterministic scene은 repeat run에서 같은 P3 artifact와 checksum을 만든다.
- 재현하는 failure/boundary: unknown directive failure와 output absence; valid path의 serialization header 및 repeat determinism.
- test technique: shell-level end-to-end smoke, temporary artifacts, repeated independent execution, header inspection, checksum regex/equality, byte comparison.
- 통과하는 production path: CLI argument handling → `loadScene` → camera/intersection/shading → `renderScene` → `writePpm`/checksum.
- 이 test가 증명하는 것: 첫 complete command path의 실패 isolation과 repeatable observable artifact.
- 이 test가 증명하지 않는 것: 개별 geometry 수식이나 parser helper의 모든 edge case를 고립해 증명하지 않는다.
- test 성격: broad integration smoke with deterministic artifact checks.
- 막는 regression: invalid input 뒤의 stray output, PPM header/format drift, nondeterministic render or serializer output.

#### 학습자 검증 기록

- 실제 test case/function과 file path:
- fixture 또는 test double 구성:
- assertion 전에 통과하는 production function 순서:
- failure가 실제로 주입되는 정확한 지점:
- test 실행 명령과 결과:
- false positive 또는 미검증 범위:

#### 해당 SHA에서 확인할 실제 코드

- shell smoke script가 temporary directory/files를 생성하고 cleanup을 unconditional하게 수행하는 경로를 확인합니다.
- unknown directive input이 nonzero exit를 내고 output path가 존재하지 않음을 검사하는 명령을 기록합니다.
- representative scene을 두 번 별도 파일로 렌더하는 invocation을 확인합니다.
- P3 magic, dimensions, max channel, checksum syntax, checksum equality, full-file byte equality의 assertion 순서를 정리합니다.
- 이 test가 실제 built CLI를 통해 parser → camera → intersections → shading → image → serializer를 통과하는지 CMake/Make invocation까지 추적합니다.

#### 직접 확인 증거

- 확인한 file path와 symbol:
- Thread에서 필요한 핵심 변화:
- 직접 확인한 caller/callee 또는 state change:
- 다음 commit에 제공하는 것:

```cpp
// 해당 SHA에서 확인한 최소 증거 코드만 삽입합니다.
```

- 코드 해석:
- 선택한 범위 밖에서 추가 확인이 필요한 사항:


#### Thread 내 연결

- 이전 Thread commit: `b983f0ea2744`
- 다음 Thread commit: 이 Thread의 종료점
- 비교 지침: 이 test 이전의 smoke가 무엇을 검사했는지 parent diff로 확인하고, 이후 component tests와 역할이 어떻게 다른지 기록합니다.
- 직접 작성한 연결 설명:

## 6. Invariant ledger

source가 연결한 invariant의 시간상 변화를 실제 코드 근거로 완성합니다.

| Invariant | 최초 도입/기준 | 강화 또는 수정 | 부족함/위험 노출 | 고정한 test/evidence | 실제 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| 공통 hit 결과와 normal orientation | f3f1d04cc836 | 41a1d6bbe5ef | e8b7dc42a52c | d05a6ab48bb1 | 작성 |
| 필수 지시어가 모두 검증된 Scene만 반환 | 3545eb1e82df / 6bff18bf0bac | 1e1fda47d913 | - | d05a6ab48bb1 | 작성 |
| 직렬 pixel-to-byte 결과의 결정성 | c742b2401e52 | 1bc7cacd30aa / b983f0ea2744 | - | d05a6ab48bb1 | 작성 |

### Ledger 보완 기록

- 각 invariant가 처음 observable behavior가 된 SHA:
- invariant를 우회하거나 깨뜨릴 수 있었던 실제 code path:
- fix 뒤 새로 금지되거나 강제된 state transition:
- test가 invariant를 직접 고정하는 assertion:
- source가 명시하지 않은 invariant를 추가했다면 삭제하거나 근거를 재확인:

## 7. Failure → Fix → Test 연결

| Failure 또는 위험 | Decision/Fix | Test 또는 evidence | 실제 failure path와 assertion |
| --- | --- | --- | --- |
| 알 수 없거나 잘못된 scene 입력 | fail-closed dispatch와 required-directive validation | d05a6ab48bb1 smoke test에서 실패 후 출력 부재 확인 | 작성 |
| shadow ray가 원래 표면을 즉시 다시 맞거나 light 뒤의 물체를 차폐자로 오인 | normal offset과 light 직전까지의 bounded interval | 이 Thread의 smoke가 이 경계만을 고립해 증명하는지는 실제 테스트에서 확인 | 작성 |
| 동일 입력의 반복 렌더가 달라짐 | serial center sampling·고정 quantization·정해진 serialization | 두 번 렌더한 checksum과 PPM byte 비교 | 작성 |

### 연결 검토

- feature를 독립적인 성공 경로로만 읽지 않고 어떤 failure를 예방하는지 기록:
- fix가 기존 assumption을 어떻게 수정했는지 기록:
- test가 symptom이 아니라 root cause를 재현하는지 확인:
- test가 증명하지 않는 범위를 별도로 기록:

## 8. Ownership / state / responsibility 변화

- `HitRecord::shape`가 소유하지 않는 포인터인지, 그 수명이 어떤 객체에 의존하는지 해당 SHA에서 기록합니다.
- `Scene`의 shape 저장 방식이 이 Thread 시점에는 무엇이며, 뒤의 exclusive-ownership refactor 전까지 어떤 여지가 남아 있는지 구분합니다.
- parser, scene, renderer, output, CLI 중 누가 생성·선택·변환·저장·예외 변환을 책임지는지 단계별로 적습니다.

### 학습자 최종 기록

- source state:
- derived/cache state:
- owner와 non-owner:
- mutation 또는 transition boundary:
- failure 시 복구되는 상태:

## 9. Thread 최종 상태

이 Thread가 끝나는 시점에는 valid scene이 직렬로 결정적으로 렌더링되고, invalid scene은 출력 이전에 실패하며, 결과는 owned RGB image, P3 PPM, 16자리 체크섬, CLI 상태 코드로 관찰할 수 있습니다. 아직 BVH, metal recursion, tile worker, transactional output publication은 이 Thread의 최종 상태에 포함되지 않습니다.

### 직접 작성

- Thread 시작 시점과 종료 시점의 behavior 차이:
- 최종적으로 authoritative한 contract:
- 아직 다른 Thread가 보완해야 하는 항목:

## 10. 최종 architecture 또는 execution flow 정리

### Source가 확정한 흐름 anchor

``.rt source` → line parser/validation → `Scene` → camera-frame ray generation → `Scene::intersect` → `Shape::intersect`/`HitRecord` → ambient/direct/shadow shading → serial `renderScene` → `Image` RGB bytes → checksum/PPM → CLI`

### 실제 코드로 완성할 흐름

1. entry point와 입력 state:
2. 핵심 caller → callee:
3. state/ownership mutation:
4. success result:
5. failure branch와 cleanup/fallback:
6. test/benchmark가 통과하는 동일 production path:

### 학습자의 최종 설명

이 영역에는 source 문장을 복사하지 말고, 확인한 SHA별 코드와 연결 관계를 근거로
설계 → 구현 → 실패 또는 위험 → 수정 → 검증의 발전 과정을 직접 작성합니다.

## 11. 학습 완료 자가 점검

- [ ] 모든 commit을 source 순서대로 확인했습니다.
- [ ] 각 commit의 SHA, subject, importance, tags를 그대로 유지했습니다.
- [ ] 모든 핵심 설명에 해당 SHA의 file path와 symbol 근거가 있습니다.
- [ ] final HEAD의 구조를 과거 SHA에 소급하지 않았습니다.
- [ ] S/A/B importance에 맞는 깊이로 기록했습니다.
- [ ] source에서 확정하지 않은 구현 세부를 정답처럼 채우지 않았습니다.
- [ ] failure와 fix/test가 실제 production path로 연결됩니다.
- [ ] test가 증명하는 것과 증명하지 않는 것을 구분했습니다.
- [ ] invariant ledger의 각 변화가 commit evidence와 연결됩니다.
- [ ] 별도의 프로젝트 재학습 없이 이 Thread의 발전 과정을 설명할 수 있습니다.
