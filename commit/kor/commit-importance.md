# 프로젝트 중요도 프로필

프로젝트: `ray-scene-tracer` (`cpp/miniRT`)  
분야: C++17 CPU ray tracing, 기하 교차 계산, correctness-preserving acceleration, 결정적 병렬 렌더링, 안전한 이미지 저장  
주요 목적: miniRT 형식의 `.rt` 장면을 파싱하고 sphere, plane, 유한 임의 축 cylinder, 환경광과 point light, hard shadow, diffuse material, 깊이가 제한된 perfect-metal reflection을 포함하는 P3 ASCII PPM 이미지를 결정적으로 렌더링한다. 완성된 프로젝트는 linear reference path를 유지하면서 bounded shape에 BVH acceleration을 추가하고, worker가 소유하는 16×16 tile 단위로 렌더링하며, 엄격한 CLI·test·benchmark·failure contract를 제공한다.  
확정된 커밋 범위: `cpp/miniRT`의 독립적인 선형 history에서 root `8363adf068e0`부터 tip `04086a2ae050`까지 총 84개 커밋이 모두 대상이다. 관련 없는 inherited history나 merge commit은 없다. 범위에는 구현·테스트·빌드·CI·benchmark 커밋 82개와 문서 전용 커밋 2개가 포함된다. 전체 집합에서 12자리 SHA 축약값은 모두 고유하다.

## 핵심 기술 영역

- **수치 계산과 ray 기반:** `Vec3`, 색상 연산, ray parameterization, 정규화, dot/cross product, finite value 처리, tolerance-sensitive geometry.
- **Primitive geometry:** 공통 hit 계약과 sphere, plane, 유한 임의 축 cylinder 교차 계산. cylinder side/cap 선택과 보수적 bounds를 포함한다.
- **Scene 상태와 소유권:** 카메라, 광원, shape, closest-hit 선택, equal-`t` tie 동작, shape의 exclusive ownership, derived acceleration data의 lifecycle.
- **Scene parsing:** source 위치가 포함된 오류, line tokenization, directive dispatch, 중복·arity 검사, 범위 검증, 필수 directive, file/text loader, optional material syntax.
- **렌더링과 재질:** camera-frame projection, pixel center에서 샘플링한 primary ray, ambient 및 Lambertian direct lighting, shadow visibility, recursive perfect-metal reflection, image quantization, render statistics.
- **가속:** AABB 표현과 slab test, bounded/unbounded shape 분리, 결정적 median-split BVH construction, explicit-stack traversal, linear reference mode, work-count benchmark.
- **결정적 동시성:** 고정 tile, atomic work distribution, 서로 겹치지 않는 pixel ownership, worker별 statistics, thread-count policy, worker join, exception propagation, mode 간 byte equivalence.
- **이미지와 출력 안전성:** 검증된 image dimensions/storage, FNV-1a regression checksum, P3 serialization, stream failure detection, temporary-file cleanup, 실패 시 기존 destination을 보존하는 replacement.
- **운영 검증:** CLI option contract, CMake/CTest 구조, component·integration regression, sanitizer, cross-platform CI, deterministic benchmark, 저장된 reference evidence.

## 핵심 아키텍처

- `.rt` 입력은 카메라 상태, 광원, 다형적 shape를 소유하는 move-only `Scene`으로 파싱된다. parsing이 성공하면 모든 shape 추가가 끝난 뒤 acceleration을 build한다.
- 모든 shape는 하나의 intersection interface를 구현하고, 선택된 parameter, point, 방향이 정리된 normal, material value, hit shape를 가리키는 non-owning pointer를 담은 `HitRecord`를 생성한다.
- `Scene::intersect`는 authoritative candidate-selection boundary다. linear mode와 BVH mode는 같은 update rule을 사용한다. 더 작은 `t`가 이기며, `t`가 정확히 같으면 원래 shape index가 더 뒤인 후보가 선택된다.
- bounded shape는 연속적인 BVH에 저장하고, plane 같은 unbounded shape는 별도의 linear index list에 남긴다. 두 경로는 동일한 shape-testing 함수에서 다시 합쳐진다.
- renderer는 immutable camera frame을 하나 만들고 이미지를 고정 tile로 나눈 뒤, 각 worker가 자신이 claim한 tile의 pixel에 대한 exclusive write ownership을 갖게 한다. shading과 tracing은 scene을 concurrent하게 읽고, statistics는 worker별로 누적한 뒤 join 이후 병합한다.
- `traceRay`는 miss 시 background를 반환하고, diffuse material에서는 ambient/direct/shadow lighting을 계산하며, metal에서는 `maxDepth`를 소모하면서 reflected ray 하나를 재귀적으로 추적한다.
- `Image`는 연속 RGB byte를 소유하고 storage가 정확히 `width × height × 3`인지 검증한다. output은 먼저 checked stream에 직렬화한 뒤 같은 디렉터리의 temporary file과 최종 replacement를 통해 게시한다.
- `raycore`는 CLI, component test, acceleration/material/render/output test, benchmark 실행 파일이 링크하는 재사용 가능한 CMake 라이브러리다.

## 핵심 불변식

- 파싱된 scene directive는 문법적으로 유효하고 finite하며 허용 범위 안에 있고 기하학적으로 퇴화하지 않아야 한다. 필수 singleton directive는 존재해야 하며 중복될 수 없다.
- BVH build 또는 traversal order와 관계없이 linear mode와 BVH mode의 hit 결과는 정확히 같은 의미의 승자를 선택해야 한다. exact equal-distance case도 포함한다.
- 모든 acceleration bound는 해당 shape를 보수적으로 포함해야 한다. unbounded geometry를 임의의 finite box에 억지로 넣어서는 안 된다.
- ready 상태의 BVH는 현재 shape 집합과 현재 built-in geometry를 설명해야 한다. shape mutation은 derived acceleration을 invalidate해야 하며, invalidated 상태에서 BVH를 요청하면 현재 linear geometry로 fallback해야 한다.
- `Scene`은 각 shape를 정확히 한 번 소유하며, 호출자는 acceleration lifecycle을 우회해 built-in geometry를 변경하거나 shape storage 순서를 바꿀 수 없다.
- 각 pixel byte는 정확히 한 worker만 쓴다. 동일한 mode와 scene에서는 thread count나 tile 완료 순서가 pixel, checksum, semantic work count를 바꿔서는 안 된다.
- 시작된 모든 worker thread는 join되어야 한다. worker failure는 worker 밖으로 빠져나가거나 부분 성공 이미지를 만들지 않고 caller thread에서 전달되어야 한다.
- 유효한 image storage는 양의 크기를 가지며 multiplication이나 index overflow 없이 정확한 크기로 할당되어야 한다.
- 최종 PPM path는 serialization, flush, close, replacement가 모두 성공한 뒤에만 변경된다. 그보다 앞선 실패는 기존 destination을 보존하고 temporary file 제거를 시도한다.
- 의도적인 rendering contract 변경이 없는 한 golden checksum과 정확한 PPM byte는 반복 실행, acceleration mode, 검증된 worker count 사이에서 안정적으로 유지되어야 한다.

## 주요 엔지니어링 난점

- 임의 축을 가진 유한 cylinder에서 안정적인 side·cap·normal·nearest-hit 동작을 유도하는 작업.
- 정규화, 이차방정식 교차, near-zero direction, 큰 finite value, 보수적 cylinder bounds 전반에서 수치적 유효성을 유지하는 작업.
- BVH로 primitive test 순서를 바꾸면서 equal-distance selection, material, normal, hit pointer, 최종 image byte를 바꾸지 않는 작업.
- shape lifetime, geometry immutability, invalidation, rebuild, fallback 동작에 correctness가 의존하는 derived state로 BVH를 관리하는 작업.
- 겹치는 write나 schedule-dependent floating-point accumulation 없이 image generation을 병렬화하면서도 deterministic statistics를 유지하는 작업.
- thread 생성 또는 worker-body 실패에서 안전하게 복구하고 모든 thread cleanup을 마친 뒤 원래 failure를 caller에게 전달하는 작업.
- validation, serialization, flush, close, replacement가 실패해도 기존 파일을 파괴하지 않도록 충분히 atomic한 output publication을 구현하는 작업.
- 동작이 다른 결과를 거부하고 primitive work와 AABB work를 분리하며 workload configuration을 고정하고 반복 가능한 median measurement를 보고하는 performance evidence를 설계하는 작업.

## 실무 엔지니어링 영역

- source 위치를 포함한 validation과 public boundary의 엄격한 error reporting.
- 명시적 ownership, move-only aggregate, read-only view, derived-cache invalidation.
- 최적화 경로를 검증하기 위한 linear reference implementation과 equivalence test.
- golden checksum, 정확한 byte 비교, deterministic work counter, injected failure test.
- checked integer arithmetic와 buffer-size validation.
- shape, worker thread, temporary output file에 대한 RAII cleanup.
- 구조화된 benchmark configuration, work metric, correctness gate, environment-specific reference result.
- 재현 가능한 CMake/CTest build, sanitizer-enabled check, Ubuntu/macOS CI.
- CLI 중복 검출, 범위 검사, option 순서 독립성, 안정적인 exit status.

## S 등급 기준

- geometry, scene traversal, shading, acceleration, test에서 사용하는 기반 계약 또는 ownership boundary를 확립한다.
- ray tracer의 핵심 목적에 해당하는 최초의 완전한 image-generation 또는 lighting mechanism을 구현한다.
- 프로젝트의 주요 algorithmic improvement를 정의하는 correctness-preserving BVH lifecycle 또는 traversal을 구현한다.
- exclusive pixel ownership과 안정적인 result aggregation을 포함한 deterministic parallel scheduling model을 확립한다.
- 위반 시 ready acceleration structure가 원본 geometry와 불일치할 수 있는 핵심 cross-subsystem invariant를 복구한다.

## A 등급 기준

- 프로젝트 전체 또는 하위 시스템 수준에서 의미 있는 위험을 수반하는 비단순 geometry, numerical, failure-path, lifecycle, performance 문제를 해결한다.
- correctness 또는 reproducibility를 실질적으로 높이는 중요한 parser, material, output, benchmark, verification contract를 확립한다.
- 핵심 최적화가 동작을 보존하거나 위험한 edge case를 처리하거나 명시적인 work-reduction criterion을 충족한다는 강한 근거를 제공한다.
- 전체 아키텍처에 필수적이지는 않더라도 중요한 interface, safety, resource-management 개선을 수행한다.

## 일반적인 B 등급 작업

- 이미 확립된 설계 안에서 표준 수학 연산, 개별 primitive 또는 directive, 일반적인 integration plumbing, 제한된 feature syntax, CLI option, 국소적 최적화를 구현한다.
- 이미 정의된 동작에 대한 일반적인 regression coverage, build organization, sanitizer configuration, CI를 추가한다.
- 결정적인 판단이 다른 커밋에서 이루어지는 더 큰 mechanism을 위한 supporting representation이나 preparatory refactor를 제공한다.

## 일반적인 C 등급 작업

- reusable mechanism이나 invariant를 바꾸지 않는 documentation-only commit, 범위가 좁은 mechanical test maintenance, environment-specific evidence snapshot.
- 유지보수나 설명에는 유용하지만 renderer의 동작, correctness 유지 방식, risk management를 이해하는 데 기여하는 정도가 작은 변경.

## 프로젝트별 태그

상위 rubric의 공통 태그를 그대로 사용한다. 이 브랜치 전용 태그는 다음과 같다.

RAY_PIPELINE — 카메라 투영, ray tracing, shading, sampling, quantization, 이미지 생성  
GEOMETRY — primitive 교차, normal, hit semantics, shape bounds  
SCENE — scene 구성, closest-hit 선택, shape ownership, derived-state lifecycle  
PARSER — `.rt` 문법, tokenization, semantic validation, diagnostics, loading  
MATERIAL — diffuse/metal 표현과 reflection-depth 동작  
ACCEL — AABB와 BVH construction, traversal, correctness, performance  
DETERMINISM — 실행·mode 간 exact result, checksum, byte, work equivalence  
CONCURRENCY — tile scheduling, worker-local state, thread 정리, failure propagation  
OUTPUT — 이미지 표현, checksum, PPM serialization, 파일 게시  
CLI — command-line option, 사용법, exit-status 계약  
BUILD — build graph, test 등록, sanitizer, CI


# 커밋 분류

| 커밋 | 제목 | 중요도 | 태그 | 요약 | 이유 |
| --- | --- | --- | --- | --- | --- |
| `8363adf068e0` | `docs(readme): 프로젝트 목표와 초기 개발 규약 정의` | C | - | README에 프로젝트 목표, 범위, 초기 저장소 규약을 정의한다. | 문서 전용 맥락은 실행 동작이나 지속적인 구현 경계를 확립하지 않는다. |
| `4afc85202c6e` | `chore(project): CXX17 실행 골격과 직접 빌드 구성` | B | BUILD | C++17 실행 파일 골격, warning policy, 직접 Make build, placeholder CLI를 구성한다. | 이후 작업에 필요한 기반이지만 프로젝트를 정의하는 판단보다 일반적인 build·argument handling 구조를 사용한다. |
| `85d1bc18037b` | `feat(math): 벡터 값과 산술 연산 구현` | B | RAY_PIPELINE | `Vec3`/`Color` 저장 표현과 기본 성분별 산술 연산을 도입한다. | 재사용 가능한 기반 작업이지만 표현과 연산은 독자적인 아키텍처 결정이라기보다 표준적인 지원 기능이다. |
| `ee555641b641` | `feat(math): 벡터 길이와 기하 연산 구현` | B | RAY_PIPELINE, GEOMETRY | 벡터 크기, 정규화, dot product, cross product를 추가한다. | 모든 geometry 하위 시스템의 기반이지만, 이미 확립된 값 타입 안에서 구현한 일반적인 수학 인프라다. |
| `1a6cd29938e1` | `feat(math): 벡터 비교와 색상 범위 연산 추가` | B | RAY_PIPELINE, OUTPUT | 정확한 벡터 비교와 색상 범위·성분 연산을 추가한다. | renderer의 책임 경계나 핵심 알고리즘을 바꾸지 않고 테스트와 색상 처리를 지원한다. |
| `bcf3952838ae` | `feat(ray): 광선 위치 계산 모델 추가` | B | RAY_PIPELINE | ray를 origin과 direction으로 정의하고 매개변수 기반 위치 계산을 제공한다. | 프로젝트의 필수 개념이지만 프로젝트별 위험이 크지 않은 작고 일반적인 추상화다. |
| `4fa4d2401ee6` | `feat(material): diffuse 재질 값 모델 추가` | B | MATERIAL | surface albedo를 담는 diffuse material 값을 도입한다. | shading을 준비하는 일반적인 도메인 모델링이며 아직 material 동작이나 rendering architecture를 정의하지 않는다. |
| `f3f1d04cc836` | `feat(geometry): hit와 도형 교차 계약 정의` | S | ARCH, GEOMETRY, SCENE | 다형적 `Shape` intersection 계약, `HitRecord`, material 전달, face-normal orientation을 정의한다. | 모든 primitive, scene query, shading path, acceleration structure, regression test가 이 계약에 의존한다. 이 커밋이 빠지면 geometry 결과가 renderer에 보이는 상태로 전달되는 핵심 연결부가 사라진다. |
| `dfb5b010ed54` | `feat(geometry): 구 교차 계산 구현` | B | GEOMETRY | 공통 hit 계약에 맞춰 이차방정식 기반 sphere intersection을 구현한다. | 필수 핵심 기능이지만 앞선 계약이 만든 아키텍처 안에서 구현한 표준 primitive다. |
| `d89812d9173a` | `feat(geometry): 평면 교차 계산 구현` | B | GEOMETRY | 평행 ray를 거부하고 normal 방향을 정리하는 plane intersection을 구현한다. | 필요하고 적절한 구현이지만 새로운 시스템 수준 mechanism을 만들지 않고 기존 shape protocol을 따른다. |
| `7265686c18ee` | `feat(geometry): 유한 원기둥 옆면 교차 구현` | A | GEOMETRY, HARD | 유한 임의 축 cylinder의 side intersection과 axial clipping을 구현한다. | 축 방향·수직 방향 성분으로 분해하는 계산은 프로젝트에서 실제로 어려운 geometry 계산 중 하나이며 correctness risk가 크다. 다만 하나의 primitive 구현 범위에 머문다. |
| `197dbf694170` | `feat(geometry): 원기둥 cap과 최근접 hit 선택 완성` | A | GEOMETRY, HARD | cylinder 양쪽 cap을 추가하고 유효한 side/cap hit 중 가장 가까운 결과를 선택한다. | 가장 어려운 primitive를 완성하면서 seam, 서로 반대인 cap normal, closest-candidate selection을 처리한다. 중요한 geometry 작업이지만 프로젝트 전체 아키텍처 변경은 아니다. |
| `2a01cb406d9d` | `feat(scene): 카메라·조명과 장면 aggregate 구성` | A | ARCH, SCENE | resolution, ambient state, camera, light, shape를 담는 scene aggregate를 도입한다. | parsing과 rendering이 함께 사용하는 중앙 상태 경계를 만든다. 이후 ownership과 acceleration 변경이 이를 다듬지만, 이 aggregate가 최초의 의미 있는 system composition 지점이다. |
| `41a1d6bbe5ef` | `feat(scene): 선형 최근접 교차 탐색 구현` | A | CORE, SCENE | scene shape 전체를 선형으로 순회하는 nearest-hit 탐색을 구현한다. | linear path는 이후 BVH traversal이 보존해야 하는 canonical closest-hit와 equal-distance 동작을 정의하므로 단순한 loop 이상의 지속적인 semantic 중요성을 갖는다. |
| `3545eb1e82df` | `feat(parser): 소스 위치 오류와 line tokenization 구성` | B | PARSER, PRACTICAL | source 위치가 포함된 parse error, comment 처리, line tokenization을 추가한다. | 입력·진단 경계는 유용하고 지속적이지만 이후 dispatch와 loader 단계에 비하면 line tokenization과 source location은 일반적인 parser 인프라다. |
| `7bba0af26d17` | `feat(parser): 유한 수와 범위 값 해석 구현` | B | PARSER, EDGE | finite number parsing과 양수·범위 제한 검증을 추가한다. | 중요한 입력 위생이지만 이미 확립된 parser 구조 안에서 예상되는 구현이다. |
| `d4a24901051a` | `feat(parser): 벡터와 색상 token 해석 구현` | B | PARSER | 쉼표로 구분된 vector와 정규화된 RGB color를 파싱한다. | numeric validator를 재사용하는 일반적인 syntax 지원이며 parser architecture를 바꾸지 않는다. |
| `6bff18bf0bac` | `feat(parser): 줄 단위 지시어 dispatch 기반 구성` | A | ARCH, PARSER | line-oriented directive dispatch, arity 검사, 중복 거부, unknown-directive error를 구성한다. | dispatcher가 scene format 전체의 확장 가능한 grammar boundary가 되므로 이후 directive는 별도 parser architecture가 아니라 이 결정의 적용으로 구현된다. |
| `9aef46929554` | `feat(parser): 해상도와 환경광 지시어 지원` | B | PARSER | resolution과 ambient-light directive를 구현한다. | 이미 확립된 dispatch model 안에서 수행한 직접적인 grammar·validation 작업이다. |
| `5e21e6900fd9` | `feat(parser): 카메라와 광원 지시어 지원` | B | PARSER | camera와 point-light directive를 구현한다. | 파싱된 값을 scene state에 연결하지만 새로운 parsing 또는 rendering mechanism을 도입하지 않는다. |
| `c17a4b5737d2` | `feat(parser): 구와 평면 지시어 지원` | B | PARSER, GEOMETRY | sphere와 plane directive를 구현하고 해당 shape를 생성한다. | 기존 geometry를 parser contract에 연결하는 일반적인 integration이다. |
| `d0cc38dd5762` | `feat(parser): 원기둥 지시어 지원` | B | PARSER, GEOMETRY | finite-cylinder directive와 diameter-to-radius 변환을 구현한다. | 이미 확립된 validator와 shape construction을 남은 primitive에 적용한 작업이다. |
| `1e1fda47d913` | `feat(parser): 필수 지시어 검증과 입력 loader 완성` | A | PARSER, INTEGRATION | 필수 scene directive를 요구하고 valid·invalid fixture와 함께 text/file loading을 완성한다. | 부분적인 directive parsing을 CLI, test, 이후 acceleration build가 사용할 수 있는 신뢰 가능한 scene-loading boundary로 완성한 중요한 integration 단계다. |
| `e6da5f987b97` | `feat(camera): 화면 좌표를 카메라 광선으로 변환` | A | CORE, RAY_PIPELINE | 안정적인 camera frame을 구성하고 pixel 좌표를 정규화된 primary ray로 변환한다. | projection mechanism은 image formation의 핵심이며 퇴화한 camera orientation도 처리하지만, 전체 rendering pipeline의 한 구성 요소에 해당한다. |
| `e8b7dc42a52c` | `feat(render): 직접광과 그림자 추적 구현` | S | CORE, RAY_PIPELINE, RISK | ambient·diffuse direct lighting, shadow-ray occlusion, primary ray tracing을 구현한다. | renderer의 주요 시각적 semantics와 모든 이미지에 적용되는 self-intersection·visibility 규칙을 정의한다. 이 커밋이 없으면 프로젝트는 아직 조명된 ray tracer가 아니다. |
| `c742b2401e52` | `feat(renderer): 직렬 이미지 렌더링 구현` | S | ARCH, CORE, RAY_PIPELINE | `Image`, render settings, 완전한 serial pixel-to-ray-to-RGB loop를 도입한다. | 최초의 end-to-end image-generation mechanism이며 이후 camera caching, BVH traversal, material, tile worker가 최적화하는 실행 구조다. |
| `1bc7cacd30aa` | `feat(output): PPM 직렬화와 이미지 체크섬 구현` | A | OUTPUT, DETERMINISM | P3 PPM serialization과 deterministic image checksum을 추가한다. | 외부 artifact와 이후 test·benchmark에서 사용하는 간결한 correctness fingerprint를 확립하므로 단순 파일 출력 이상의 의미가 있다. |
| `b983f0ea2744` | `feat(cli): 장면 렌더링 명령 연결` | B | CLI, INTEGRATION | scene loading, rendering, PPM writing, checksum output, exit-status 처리를 연결한다. | 필요한 product integration이지만 이미 확립된 subsystem API를 의미 변경 없이 조합한다. |
| `d05a6ab48bb1` | `test(render): 장면 렌더링 smoke 검사 추가` | B | TEST, INTEGRATION | parser failure, PPM header, deterministic output을 확인하는 end-to-end smoke script를 추가한다. | 유용한 integration 신뢰도를 제공하지만 어려운 invariant나 발견된 regression보다 예상 동작을 검증한다. |
| `2cf2f17980bb` | `build(cmake): 코어 라이브러리와 검증 타깃 구성` | B | BUILD, TEST | CMake, 재사용 가능한 `raycore` library, CTest integration, Make wrapper를 도입한다. | reproducibility와 modularity를 실질적으로 개선하지만 핵심 rendering 결정이 아니라 일반적인 build-system engineering이다. |
| `0e8c3b51e3b7` | `test(core): 수학·기하·파서·출력 회귀 기준 추가` | B | TEST, DETERMINISM | math, primitive, parser error, PPM encoding, 기본 rendering에 대한 component regression coverage를 추가한다. | 폭넓고 유용한 baseline을 만들지만 어려운 cross-subsystem invariant를 입증하기보다 예상 component 동작을 주로 고정한다. |
| `f4dcb50939e2` | `perf(render): 광선과 교차 작업량 계측 추가` | A | PERF, RAY_PIPELINE | optional ray·primitive·AABB·timing statistics를 rendering과 intersection 경로에 전달한다. | instrumentation을 semantic work boundary에 신중하게 배치하여 정상 동작을 바꾸지 않고 이후 acceleration claim을 측정 가능하게 한다. |
| `4fb2345c7d35` | `perf(benchmark): 조밀 장면 기준 workload 추가` | B | PERF, ACCEL | 결정적인 400-sphere dense benchmark workload를 추가한다. | 중요한 supporting evidence infrastructure지만 아직 measurement protocol을 정의하거나 runtime behavior를 바꾸지는 않는다. |
| `f5a2c4ade16d` | `perf(benchmark): 반복 측정과 결정성 보고 구성` | A | PERF, DETERMINISM | warm-up, 반복 median measurement, result-consistency check, structured benchmark output을 추가한다. | image 또는 work 결과가 다르면 timing을 거부하는 방어 가능한 performance experiment로 workload를 발전시킨다. |
| `aa92a87c98a3` | `fix(math): 큰 유한 벡터를 안정적으로 정규화` | A | DEBUG, EDGE, RAY_PIPELINE | 안정적인 large-vector normalization을 위해 제곱합 magnitude를 `std::hypot`으로 교체한다. | camera, normal, cylinder axis, ray에 영향을 주는 작지만 쉽게 드러나지 않는 numerical root-cause fix이며 광범위하게 의존하는 수학 불변식을 복구한다. |
| `ff18d1cc3afc` | `test(math): 큰 유한 벡터 정규화 검증` | B | TEST, EDGE | 큰 finite vector normalization regression을 추가한다. | 앞선 fix를 정확히 보호하지만 중요도는 하나의 수치 경계에 국한된다. |
| `438ee0cb48f6` | `fix(parser): 임계값 이하 방향 벡터 거부` | B | PARSER, EDGE | Euclidean length가 `kEpsilon` 이하인 camera·cylinder direction을 거부한다. | 타당한 validation 수정이지만 이미 확립된 parser boundary 안의 직접적인 개선이다. |
| `10e617f98b33` | `test(parser): 퇴화한 카메라와 원기둥 방향 검증` | B | TEST, PARSER | near-zero camera direction과 cylinder axis에 대한 regression을 추가한다. | 의미 있는 edge case를 다루지만 앞선 validator를 넘어 새로운 system invariant를 확립하지 않는다. |
| `71096cd311d5` | `fix(image): 이미지 할당과 픽셀 인덱스 overflow 방지` | A | OUTPUT, RISK, EDGE | image allocation 곱셈을 검사하고 pixel indexing을 `std::size_t`에서 수행한다. | public representation boundary에서 signed overflow와 undersized buffer 위험을 차단하므로 범위는 좁아도 중요한 safety 작업이다. |
| `3d2e6a5becb7` | `test(image): 잘못된 차원과 저장 크기 계산 검증` | B | TEST, OUTPUT | image storage size와 0·음수 dimension 거부를 검증한다. | 독립적인 아키텍처 결정이라기보다 checked constructor에 대한 예상 regression coverage다. |
| `89c3c7269877` | `fix(output): 표준 FNV-1a 기준값 적용` | B | DEBUG, OUTPUT | 64-bit FNV-1a offset basis를 수정한다. | 표준 checksum 정의를 복구하지만 프로젝트 아키텍처에 미치는 영향이 제한적인 좁은 상수 수정이다. |
| `eac2ecd13c33` | `test(output): PPM과 렌더링 체크섬 기준 고정` | A | TEST, DETERMINISM, OUTPUT | 직접 만든 image checksum과 완전한 basic-scene render checksum을 모두 golden으로 고정한다. | 두 golden은 checksum semantics와 full-pipeline pixel을 명시적인 regression contract로 만들며 이후 performance·concurrency 변경이 이에 의존한다. |
| `93167ba2bd94` | `refactor(scene): 장면 도형의 단독 소유권 적용` | S | ARCH, SCENE, RISK | shape를 `unique_ptr`로 전환하고 scene copy를 금지하여 scene ownership을 exclusive하고 movable하게 만든다. | 이후 BVH index와 non-owning hit pointer가 의존하는 sole-owner lifetime model을 확립한다. 이 결정이 없으면 heterogeneous shape lifetime과 derived acceleration state를 누가 제어하는지 불명확해진다. |
| `54b6afe44070` | `perf(camera): 픽셀별 카메라 프레임 재계산 제거` | B | PERF, RAY_PIPELINE | image당 camera frame을 한 번만 계산하고 pixel별로 재사용하는 overload를 추가한다. | 타당하고 유용한 최적화지만 이미 완성된 renderer의 hot loop에 국한된 개선이며 이후 BVH·concurrency 변경만큼 프로젝트를 정의하는 영향은 없다. |
| `d9af892971ff` | `test(camera): 재사용한 카메라 프레임의 동치 검증` | B | TEST, RAY_PIPELINE | 다시 계산한 camera frame과 cache된 frame의 ray generation이 정확히 같은지 검증한다. | 최적화를 보호하지만 국소 refactor에 대한 일반적인 검증이다. |
| `b993a587dac7` | `feat(accel): AABB 값과 결합 연산 구현` | B | ACCEL | AABB value, validation, centroid, surrounding-box composition을 도입한다. | 필요한 acceleration scaffolding이지만 intersection이나 BVH behavior가 생기기 전의 직접적인 supporting representation이다. |
| `7b19f2ad78e3` | `feat(accel): ray-box slab 교차 구현` | A | ACCEL, HARD, EDGE | parallel-axis 처리와 entry distance를 포함한 ray-box slab intersection을 구현한다. | false negative가 렌더링 결과를 바꾸는 correctness-critical acceleration primitive이며 단순하지 않은 interval reasoning이 필요하다. |
| `a40452885176` | `feat(accel): 도형 경계 계약과 구·평면 bounds 추가` | A | ARCH, ACCEL, GEOMETRY | shape bounds 계약, 정확한 sphere box, 명시적인 unbounded plane을 추가한다. | heterogeneous geometry가 acceleration에 들어가거나 제외되는 방식을 확립하며, 이후 mixed BVH/linear 설계의 핵심 책임 경계가 된다. |
| `b782e22450d8` | `feat(accel): 원기둥의 보수적 bounds 계산 추가` | A | ACCEL, GEOMETRY, HARD | 임의 축 cylinder의 보수적인 bounds를 계산하고 바깥쪽으로 padding한다. | box가 너무 작으면 실제 hit가 조용히 제거되므로 수치적 유도와 보수적 정책 모두 중요한 correctness 작업이다. |
| `419d52d687fc` | `test(accel): AABB와 도형 경계 계산 검증` | A | TEST, ACCEL, RISK | slab edge case와 sphere·plane·임의 축 cylinder bounds를 검증한다. | 특히 어려운 cylinder 계산을 포함해 acceleration correctness가 의존하는 no-false-negative 경계를 고정한다. |
| `e4292997eb1a` | `feat(accel): BVH node와 연속 저장소 구성` | B | ARCH, ACCEL | compact BVH node와 contiguous primitive-index storage를 정의한다. | 연속 layout은 적절한 supporting choice지만 결정적인 acceleration 동작은 builder, Scene lifecycle, traversal 커밋에서 확립된다. |
| `bb65e8092632` | `feat(accel): 결정적 중앙 분할 BVH 구축 구현` | A | ACCEL, HARD, DETERMINISM | bounded leaf size와 deterministic tie ordering을 갖는 안정적인 median-split BVH를 구축한다. | 핵심 construction algorithm이며 재현 가능한 tree shape를 확립하지만 traversal이 통합되기 전까지 scene query 자체는 아직 바꾸지 않는다. |
| `9a7f29b5d78a` | `feat(accel): 선형·BVH 탐색 모드 계약 연결` | A | ARCH, ACCEL, DETERMINISM | linear/BVH mode를 도입하고 closest-hit tie가 원래 shape index에 따라 결정되게 한다. | 명시적인 reference mode와 traversal order에 독립적인 tie rule은 순서가 바뀌는 traversal을 위한 핵심 semantic 준비다. 다만 이 시점에는 BVH path가 아직 활성화되지 않는다. |
| `f7e969537c10` | `feat(scene): 가속 구조 소유권과 rebuild 경계 구성` | S | ARCH, ACCEL, SCENE | `Scene`이 BVH와 unbounded index set을 소유하고 명시적인 build, invalidation, readiness state를 갖게 한다. | acceleration이 현재 소유 geometry에서 파생되며 mutation 후 반드시 rebuild되어야 한다는 핵심 lifecycle invariant를 확립한다. infinite plane을 올바르게 유지하는 방식도 함께 정의한다. |
| `d4f6ee5b6042` | `feat(accel): 결정적 BVH 최근접 순회 구현` | S | CORE, ACCEL, HARD | pruning, leaf test, 마지막 unbounded pass를 포함하는 deterministic near-first BVH traversal을 구현한다. | linear path의 hit semantics와 bounded/unbounded 혼합 geometry를 보존하면서 asymptotic work를 바꾸는 프로젝트 정의적 acceleration mechanism이다. |
| `41c9a59f27a6` | `test(accel): 선형 탐색과 BVH 결과 동치 검증` | A | TEST, ACCEL, DETERMINISM | linear·BVH hit, equal-distance tie, 전체 pixel, checksum, primitive-test 감소를 비교한다. | 핵심 최적화가 관찰 가능한 semantics를 보존하면서 실제 작업량을 줄인다는 강한 근거를 제공한다. |
| `da3e8b43d09e` | `perf(benchmark): 선형 탐색과 BVH 작업량 비교` | A | PERF, ACCEL, DETERMINISM | 동일한 scene에서 linear과 BVH mode를 측정하고 checksum divergence를 거부한다. | algorithmic claim에만 의존하지 않고 acceleration 결과를 작업량과 시간 양쪽에서 외부적으로 비교할 수 있게 한다. |
| `85583e1e9beb` | `feat(material): metal 모델과 깊이 제한 반사 구현` | A | CORE, MATERIAL, RAY_PIPELINE | diffuse/metal material type과 secondary-ray accounting을 포함한 depth-limited perfect reflection을 추가한다. | tracing model을 terminal direct lighting에서 deterministic recursion으로 확장하는 중요한 기능·control-flow 변경이다. |
| `a90130a5b030` | `feat(parser): 선택적 도형 재질 문법 추가` | B | PARSER, MATERIAL | 모든 shape directive에 optional `diffuse`/`metal` token을 추가한다. | 이미 정의된 material model의 일반적인 syntax integration이며 생략 시 diffuse를 유지해 backward compatibility를 보장한다. |
| `9a352ffe8233` | `test(material): 재질 파싱과 반사 깊이 검증` | B | TEST, MATERIAL, DETERMINISM | material parsing, unknown type, reflection depth, secondary ray, 변경되지 않은 diffuse golden을 검증한다. | parsing, depth, backward compatibility를 유용하게 다루지만 프로젝트 전체 invariant보다 범위가 제한된 기능을 검증한다. |
| `498266fc0abf` | `refactor(render): 직렬 렌더링을 고정 tile 순회로 전환` | B | REFACTOR, CONCURRENCY, DETERMINISM | serial row loop를 좌표 기반 pixel write를 사용하는 고정 16×16 tile traversal로 바꾼다. | concurrency를 위한 의도적인 preparatory refactor지만 동작은 계속 serial이며 핵심 scheduling mechanism은 다음 커밋에서 도입된다. |
| `849f878ca0b0` | `feat(render): 원자적 tile 분배와 작업자 통계 병합 구현` | S | ARCH, CONCURRENCY, DETERMINISM | atomic index로 tile을 분배하고 worker마다 겹치지 않는 pixel과 local stats를 할당하며 모든 thread를 join한다. | parallel rendering의 핵심 아키텍처다. shared floating-point accumulation 없이 deterministic byte를 보존하면서 명시적인 thread lifecycle과 aggregation boundary를 추가한다. |
| `18459bfda416` | `feat(renderer): 작업자 수 설정과 자동 선택 추가` | B | CONCURRENCY, PERF | 명시적인 worker-count 설정과 hardware 기반 자동 선택을 추가한다. | 이미 확립된 scheduler 안에서 유용한 policy control을 제공하지만 ownership이나 determinism model은 바꾸지 않는다. |
| `3619550fa354` | `test(render): 작업자 수에 따른 함수 결과 동치 검증` | A | TEST, CONCURRENCY, DETERMINISM | 1개·4개 worker에서 linear/BVH rendering을 비교하고 동일한 pixel과 work counter를 확인한다. | scheduling이 execution order만 바꾸고 결과나 semantic work는 바꾸지 않는다는 핵심 concurrency 주장을 직접 검증한다. |
| `f0c6be8f963f` | `refactor(cli): 위치 인자와 checksum option 모델 구성` | B | REFACTOR, CLI | `CliOptions`와 재사용 가능한 option-parsing loop를 도입한다. | 이후 flag를 추가할 깨끗한 확장 지점을 제공하지만 일반적인 interface organization이다. |
| `146749c5b8f5` | `feat(cli): 가속 방식 선택 option 추가` | B | CLI, ACCEL | 중복·값 검증을 포함한 `--accel linear\|bvh`를 추가한다. | 기존 runtime contract를 노출하는 option이며 acceleration mechanism 자체를 만드는 변경은 아니다. |
| `e7b1bd2e8982` | `feat(cli): 작업자 수 option 추가` | B | CLI, CONCURRENCY | 엄격한 `--threads N\|auto` parsing과 range check를 추가한다. | 기존 renderer setting을 위한 적절한 boundary validation이지만 주요 프로젝트 결정은 아니다. |
| `3aa806753cc4` | `feat(cli): 반사 깊이 option과 기본값 추가` | B | CLI, MATERIAL | `--max-depth 0..32`를 추가하고 기본 reflection depth를 4로 변경한다. | recursive rendering을 설정 가능하게 하지만 material mechanism과 depth semantics는 앞서 확립되었다. |
| `3abce94f2c06` | `test(cli): 렌더링 옵션과 오류 종료 계약 검증` | B | TEST, CLI, EDGE | 누락·중복·잘못된 형식·경계 option과 exit-status 동작을 검증한다. | coverage는 철저하지만 core rendering invariant보다 CLI surface에 대한 일반적인 validation이다. |
| `749fad098394` | `test(render): smoke 검사의 fixture와 실행 경로 정리` | C | TEST, PRACTICAL | 저장된 invalid fixture를 재사용하고 shell-specific header reading을 portable command로 교체한다. | 유용한 test maintenance지만 프로젝트의 주요 mechanism, contract, engineering story에 미치는 영향은 작다. |
| `ca2d108f2255` | `test(render): 실행 모드별 PPM byte 결정성 검증` | A | TEST, DETERMINISM, OUTPUT | linear/BVH와 1개/4개 worker CLI 실행 사이에서 checksum과 정확한 PPM byte를 비교한다. | 실제 게시 파일 경계에서 프로젝트를 정의하는 determinism 보장을 입증하는 end-to-end 근거다. |
| `58d53cce0ee5` | `build(sanitizers): 메모리와 정의되지 않은 동작 검사 구성` | B | BUILD, TEST, RISK | opt-in AddressSanitizer/UBSan build를 추가하고 여러 build directory를 ignore한다. | sanitizer 지원은 중요한 실무 엔지니어링이지만 프로젝트별 mechanism보다 표준적인 verification infrastructure다. |
| `4491bea4d93c` | `ci: 플랫폼별 빌드와 회귀 검사 자동화` | B | BUILD, TEST, INTEGRATION | Ubuntu·macOS release build와 regression test, Linux sanitizer check를 자동화한다. | CI가 reproducibility와 platform confidence를 실질적으로 높이지만 runtime architecture를 바꾸거나 고유 invariant를 확립하지는 않는다. |
| `9b77225cf6b7` | `perf(benchmark): 측정 schema와 가속 기준 검증 고정` | A | PERF, ACCEL, DETERMINISM | benchmark schema를 versioning하고 모든 work counter를 검증하며 primitive-test ratio를 25% 미만으로 강제한다. | acceleration 효과를 비공식적인 관찰에서 변경되지 않은 output에 연결된 반복 가능하고 machine-checked된 performance criterion으로 바꾼다. |
| `9ddd3419cac1` | `perf(benchmark): 참조 측정값 기록` | C | PERF | AppleClang/arm64 reference benchmark 결과 하나를 기록한다. | snapshot은 유용한 근거와 맥락이지만 동작을 바꾸지도 reusable measurement mechanism을 확립하지도 않는다. |
| `4eb50073bc3e` | `fix(output): 불일치한 이미지 저장소 거부` | A | OUTPUT, RISK, EDGE | `Image::validate`를 추가하고 checksum 또는 serialization 전에 pixel storage의 정확한 일치를 요구한다. | 두 output entry point에서 public-API memory-safety gap을 막고 dimensions와 storage가 일치해야 한다는 invariant를 복구한다. |
| `918dd1efeaf3` | `test(output): 잘못된 이미지 저장소 처리 검증` | B | TEST, OUTPUT, RISK | 부족하거나 초과한 image storage를 테스트하고 invalid output이 기존 파일을 truncate하지 못함을 검증한다. | validation fix를 뒷받침하는 중요한 coverage지만 representation invariant 자체는 앞선 구현 커밋에서 확립된다. |
| `053235a7a5e1` | `fix(output): PPM 출력 실패 시 기존 파일 보존` | A | OUTPUT, RISK, PRACTICAL | checked stream으로 직렬화하고 같은 디렉터리의 temporary file에 쓴 뒤 성공한 경우에만 destination을 atomic하게 교체한다. | partial write, flush/close failure, replacement failure가 기존 output을 파괴하지 않는 강한 publication guarantee를 확립한다. |
| `c6a6a7562a4d` | `test(output): 출력 실패의 대상 보존과 정리 검증` | A | TEST, OUTPUT, RISK | stream·replacement failure를 주입하고 destination 보존과 temporary-file cleanup을 검증한다. | 정상 serializer 동작뿐 아니라 atomic publication의 어려운 negative path를 직접 실행한다. |
| `0536e4829070` | `fix(renderer): 작업자 예외를 호출자에게 전달` | A | CONCURRENCY, RISK, DEBUG | worker exception을 캡처하고 새 tile 할당을 중단한 뒤 모든 worker를 join하고 caller thread에서 다시 던진다. | 그대로 두면 process 종료나 worker 방치로 이어질 수 있는 심각한 concurrency failure mode를 수정한다. 중요한 lifecycle engineering이지만 최초 scheduler architecture 자체는 아니다. |
| `b5c708ac981a` | `test(renderer): 작업자 실패 전파와 회수 검증` | A | TEST, CONCURRENCY, RISK | 예외를 던지는 shape를 사용해 worker exception propagation과 thread recovery를 검증한다. | 주입한 failure가 앞선 커밋에서 수정한 위험한 lifecycle path를 고정하고 실패가 worker 안에 갇히지 않음을 보장한다. |
| `ef5320a83c27` | `fix(accel): 가속 구조의 도형 불변식 보호` | S | ARCH, ACCEL, SCENE | scene shape storage와 built-in geometry를 private으로 바꾸고 read-only accessor만 노출한다. | 모든 structural mutation이 invalidation을 거치게 하여 stale-BVH 문제를 근본에서 차단한다. scene, geometry, acceleration 전반의 관례를 강제 가능한 ownership·derived-state invariant로 바꾼다. |
| `13f153e23920` | `test(accel): 장면 변경과 가속 상태 불변식 검증` | A | TEST, ACCEL, SCENE | compile-time immutability assertion과 runtime invalidation, fallback, rebuild 검사를 추가한다. | 완전한 acceleration state transition을 입증하고 caller가 S 등급 ownership 수정을 우회하지 못하게 한다. |
| `04086a2ae050` | `docs(project): 프로젝트 문서 정리` | C | - | README를 다시 작성하고 architecture, format, verification, development-history 문서를 추가한다. | 문서가 매우 포괄적이지만 실행 동작은 바꾸지 않으며 고정된 grading rule에 따라 implementation decision에 비해 낮은 중요도로 유지된다. |

# 개발 흐름

## 흐름: 기하 계약에서 최초 렌더링 이미지까지

`f3f1d04cc836` S — scene traversal과 shading이 heterogeneous geometry를 사용할 수 있는 공통 shape/hit 계약을 확립한다.  
↓  
`2a01cb406d9d` A — 이미지를 trace하는 데 필요한 상태를 소유하는 scene aggregate를 만든다.  
↓  
`41a1d6bbe5ef` A — 이후 acceleration이 보존하는 linear closest-hit reference semantics를 정의한다.  
↓  
`3545eb1e82df` B — source 위치가 포함된 parser diagnostics와 line tokenization을 확립한다.  
↓  
`6bff18bf0bac` A — directive-dispatch grammar boundary를 정의한다.  
↓  
`1e1fda47d913` A — required-directive validation과 file/text scene loading을 완성한다.  
↓  
`e6da5f987b97` A — pixel 좌표를 camera ray로 변환한다.  
↓  
`e8b7dc42a52c` S — ambient/direct lighting과 shadow visibility를 정의한다.  
↓  
`c742b2401e52` S — 완전한 serial image-rendering loop를 실행한다.  
↓  
`1bc7cacd30aa` A — P3 표현과 deterministic checksum을 게시한다.  
↓  
`b983f0ea2744` B — pipeline을 CLI에 연결한다.  
↓  
`d05a6ab48bb1` B — 최초의 완전한 valid·invalid command path를 검증한다.

**의의**

이 흐름은 분리되어 있던 수학·geometry 타입을 외부에서 사용할 수 있는 renderer로 발전시킨다. 중요한 점은 단순히 기능을 누적한 것이 아니라는 데 있다. shape 계약이 모든 primitive에 하나의 결과 모델을 제공하고, scene이 하나의 authoritative selection boundary를 제공하며, parser가 그 상태를 구성한다. camera와 shading은 이를 pixel color로 변환하고, renderer/output/CLI 계층은 deterministic artifact를 유지한다. serial 구현은 이후 BVH와 threaded version을 판단하는 semantic baseline도 된다.

## 흐름: 큰 유한 벡터와 정규화 안정성

`aa92a87c98a3` A — overflow하기 쉬운 제곱합 magnitude 계산을 `std::hypot`으로 교체한다.  
↓  
`ff18d1cc3afc` B — 정확한 large-finite-vector regression을 영구적인 test case로 고정한다.

**의의**

작지만 root cause가 명확한 수정 흐름이다. 기존 수학 인터페이스는 이미 camera direction, normal, axis, ray에서 공유되고 있었으며, 이후 테스트는 일반적인 unit-vector case만으로는 이를 충분히 보호할 수 없음을 보여준다. 기반 value type의 작은 구현 세부 사항 하나가 의미 있는 finite direction을 renderer 전체에서 조용히 0에 가까운 결과로 바꿀 수 있었기 때문에 중요하다.

## 흐름: 정확성을 보존하는 BVH 가속

`f4dcb50939e2` A — acceleration이 동작을 바꾸기 전에 semantic work counter와 timing을 추가한다.  
↓  
`4fb2345c7d35` B — 고정된 dense-scene workload를 확립한다.  
↓  
`f5a2c4ade16d` A — 반복 median measurement를 정의하고 일치하지 않는 결과를 거부한다.  
↓  
`7b19f2ad78e3` A — ray/AABB interval test를 구현한다.  
↓  
`a40452885176` A — 어떤 shape가 finite bounds를 제공하고 어떤 shape가 unbounded로 남는지 정의한다.  
↓  
`b782e22450d8` A — 보수적인 arbitrary-axis cylinder bounds를 추가한다.  
↓  
`419d52d687fc` A — AABB edge behavior와 no-false-negative bounds contract를 검증한다.  
↓  
`bb65e8092632` A — deterministic median-split BVH를 구축한다.  
↓  
`9a7f29b5d78a` A — 원래 shape index를 이용해 linear equal-`t` winner를 보존하고 두 mode를 모두 노출한다.  
↓  
`f7e969537c10` S — acceleration을 unbounded-shape path를 갖는 owned·rebuildable derived scene state로 만든다.  
↓  
`d4f6ee5b6042` S — near-first explicit-stack traversal과 pruning을 구현한다.  
↓  
`41c9a59f27a6` A — work reduction을 확인하면서 linear/BVH hit·pixel equivalence를 입증한다.  
↓  
`da3e8b43d09e` A — 동일한 correctness constraint 아래에서 두 mode를 측정한다.  
↓  
`9b77225cf6b7` A — versioned benchmark schema를 고정하고 primitive-test reduction threshold를 강제한다.  
↓  
`ef5320a83c27` S — caller가 ready BVH 뒤에서 geometry를 변경하지 못하게 한다.  
↓  
`13f153e23920` A — immutability, invalidation, linear fallback, rebuild를 하나의 state transition으로 검증한다.

**의의**

이 흐름은 acceleration을 단순히 더 빠른 container가 아니라 semantic transformation으로 다뤘음을 보여준다. 먼저 비교 가능한 work metric을 확립하고, 보수적 bounds, deterministic construction, linear candidate rule을 재사용하는 traversal을 차례로 도입한다. 이후 ownership 수정은 중요한 개발 이력이다. BVH 알고리즘 자체가 올바르더라도 원본 geometry가 외부에서 변경 가능하면 잘못된 상태가 될 수 있기 때문이다. 최종 설계는 algorithm, result ordering, bounded/unbounded partitioning, ownership, invalidation, fallback, rebuild, equivalence testing, 측정된 work reduction을 하나로 결합한다.

## 흐름: 재질 문법에서 깊이 제한 재귀 반사까지

`85583e1e9beb` A — deterministic perfect-metal branch와 depth consumption으로 tracing을 확장한다.  
↓  
`a90130a5b030` B — diffuse 기본값을 유지하면서 optional material token을 추가한다.  
↓  
`9a352ffe8233` B — parsing, unknown-material failure, recursion depth, secondary-ray count, diffuse compatibility를 검증한다.  
↓  
`3aa806753cc4` B — reflection depth를 CLI에 노출하고 기본값을 4로 설정한다.

**의의**

material 흐름은 randomness나 schedule-dependent sampling을 도입하지 않고 `traceRay`를 terminal direct-light 계산에서 bounded recursion으로 바꾼다. material token을 생략하면 diffuse를 유지하므로 기존 scene을 보존하고, depth contract는 recursive work를 유한하고 외부에서 설정 가능하게 만든다. 테스트는 새 metal path와 변경되지 않은 diffuse golden을 모두 확인하며, 이것이 관련된 compatibility boundary다.

## 흐름: 결정적 tile 렌더링과 worker 실패 복구

`498266fc0abf` B — thread를 추가하지 않고 serial row loop를 고정 tile traversal로 바꾼다.  
↓  
`849f878ca0b0` S — tile을 atomically 분배하고 서로 겹치지 않는 pixel write를 할당하며 worker-local statistics를 병합한다.  
↓  
`18459bfda416` B — explicit·automatic worker-count policy를 추가한다.  
↓  
`3619550fa354` A — 두 acceleration mode에서 1개와 4개 worker의 pixel·work 동치를 검증한다.  
↓  
`ca2d108f2255` A — CLI를 통해 exact PPM-byte equality를 검증한다.  
↓  
`0536e4829070` A — worker failure를 캡처하고 새 작업을 중단한 뒤 모든 worker를 join하고 caller에서 다시 던진다.  
↓  
`b5c708ac981a` A — 예외를 던지는 shape를 주입해 propagation과 recovery를 고정한다.

**의의**

준비 단계의 tile refactor는 pixel addressing과 execution order를 분리하고, 이후 scheduler는 write가 겹치지 않게 tile을 claim할 수 있다. determinism은 deterministic thread scheduling이 아니라 pixel별 독립성, 고정된 pixel 내부 연산 순서, 명시적인 hit tie-breaking, 정수 statistic 병합에서 나온다. 이후 exception fix는 초기 병렬 구현에 남아 있던 lifecycle gap을 닫는다. `traceRay` 내부 실패는 worker 밖으로 빠져나가거나 process를 종료하거나 부분 성공 이미지를 반환해서는 안 된다.

## 흐름: 이미지 표현과 atomic PPM 게시

`71096cd311d5` A — allocation sizing과 pixel offset을 overflow-aware하게 만든다.  
↓  
`3d2e6a5becb7` B — 양의 dimension과 정확한 storage size를 검증한다.  
↓  
`89c3c7269877` B — FNV-1a 정의를 수정한다.  
↓  
`eac2ecd13c33` A — checksum과 full-render golden을 고정한다.  
↓  
`4eb50073bc3e` A — 사용 전에 public image dimensions와 byte storage가 일치하는지 검증한다.  
↓  
`918dd1efeaf3` B — 부족·초과 storage와 기존 destination 보존을 검증한다.  
↓  
`053235a7a5e1` A — checked stream으로 쓰고 temporary file과 최종 replacement를 통해 게시한다.  
↓  
`c6a6a7562a4d` A — serialization·replacement failure를 주입하고 cleanup·보존을 검증한다.

**의의**

이 흐름은 output contract를 "byte를 쓴다"에서 "완전하고 내부적으로 일관된 image만 게시한다"로 확장한다. allocation·indexing safety는 생성 시 buffer mismatch를 막고, 이후 validation은 caller가 public `Image` field를 직접 변경하는 경우를 보호한다. 표준화된 checksum은 deterministic regression을 비교할 수 있게 하고, temporary-file publication은 validation, stream, flush, close, replacement failure가 기존의 유효한 output을 파괴하지 않도록 한다.

## 흐름: 재현 가능한 검증 인프라

`2cf2f17980bb` B — CMake 아래에서 `raycore`, 실행 파일, CTest target을 분리한다.  
↓  
`0e8c3b51e3b7` B — 폭넓은 component regression coverage를 추가한다.  
↓  
`58d53cce0ee5` B — AddressSanitizer/UBSan 구성을 추가한다.  
↓  
`4491bea4d93c` B — Ubuntu·macOS에서 release regression을 실행하고 Linux에서 sanitizer check를 실행한다.

**의의**

이 커밋들은 renderer algorithm을 정의하지 않지만 로컬 검사를 반복 가능한 project-wide verification path로 바꾼다. 이후 geometry, BVH, concurrency, output failure test가 모두 안정적인 library/test build에 의존하고, 하나의 command-line smoke path에만 의존하지 않고 여러 platform과 runtime instrumentation 아래에서 실행될 수 있다는 점에서 중요하다.

# 가장 중요한 커밋

## feat(geometry): hit와 도형 교차 계약 정의

커밋: `f3f1d04cc836`  
중요도: S  
태그: ARCH, GEOMETRY, SCENE

### 문제

renderer는 서로 다른 여러 primitive를 하나의 scene query에 참여시키고, 그 결과로 shading에 일관된 point, normal, material, identity를 제공해야 했다. primitive별 return type이나 임시 output parameter를 사용하면 scene traversal과 shading이 모든 concrete shape에 결합된다.

### 결정

하나의 다형적 `Shape::intersect` 계약과 하나의 `HitRecord` 표현을 정의한다. front/back-face 처리도 중앙화하여 hit normal이 입사 ray를 기준으로 일관된 방향을 갖게 하고, material state는 record에 복사하며 shape pointer는 명시적으로 non-owning 상태를 유지한다.

### 중요성

이 계약은 geometry와 나머지 시스템을 잇는 경계다. sphere, plane, cylinder, linear scene traversal, BVH traversal, diffuse shading, metal reflection, tie-breaking test, acceleration equivalence가 모두 동일한 결과 모델을 사용한다.

### 변경 사항

공개 geometry API에 abstract shape boundary, hit state, face-normal helper, 이후 intersection 커밋에 필요한 concrete primitive declaration이 추가되었다.

### 프로젝트 이해에서 중요한 이유

프로젝트는 서로 무관한 세 intersection 함수를 중심으로 구성되지 않는다. 하나의 authoritative hit protocol을 중심으로 구성된다. 이 protocol을 이해하면 이후 acceleration이 test 순서를 바꾸면서도 shading을 바꾸지 않는 이유와 scene ownership이 변경되어도 primitive semantics가 유지되는 이유를 알 수 있다.

## feat(render): 직접광과 그림자 추적 구현

커밋: `e8b7dc42a52c`  
중요도: S  
태그: CORE, RAY_PIPELINE, RISK

### 문제

intersection만으로는 보이는 surface를 식별할 수 있을 뿐이다. ray tracer에는 miss 처리, ambient contribution, light visibility, diffuse response, shadow tracing 시 즉각적인 self-intersection을 피하는 안정적인 규칙도 필요하다.

### 결정

shading을 ambient albedo에서 시작하고, surface 앞쪽에 있는 light에 대해서만 Lambertian point-light contribution을 추가한다. shadow origin은 hit normal 방향으로 offset하고 occlusion test는 light distance까지로 제한한다. `traceRay`는 miss 시 scene background를 반환하고 hit는 공통 shading path에 위임한다.

### 중요성

프로젝트의 주요 시각적 계약을 확립한다. 이후 image checksum, BVH equivalence, material compatibility, threaded determinism test는 모두 이 정확한 lighting·shadow semantics를 전제로 한다.

### 변경 사항

nearest hit, occlusion, shading, tracing을 위한 renderer-facing API와 함께 scene intersection, light iteration, shadow ray, color multiplication, clamping을 통합하는 최초 구현이 추가되었다.

### 프로젝트 이해에서 중요한 이유

geometry correctness가 관찰 가능한 rendering behavior로 바뀌는 지점을 보여준다. 이후 모든 최적화에서 안정적으로 유지해야 하는 offset과 bounded-shadow 규약도 이 커밋에서 도입된다.

## feat(renderer): 직렬 이미지 렌더링 구현

커밋: `c742b2401e52`  
중요도: S  
태그: ARCH, CORE, RAY_PIPELINE

### 문제

프로젝트에는 scene parsing, camera ray, single-ray shading이 있었지만 전체 resolution을 처리하고 소유권이 있는 pixel storage를 생성하는 mechanism이 없었다.

### 결정

연속 RGB `Image`, render-settings boundary, 각 pixel center를 샘플링해 정확히 하나의 ray를 trace하고 색상을 clamp한 뒤 byte로 quantize하는 deterministic serial loop를 도입한다.

### 중요성

최초의 완전한 renderer이므로 이후 camera caching, tile traversal, multithreading, checksum, PPM output, acceleration benchmark의 semantic reference가 된다. 이후 performance 작업은 실행 비용과 순서를 바꾸지만 이 경로가 확립한 byte와 반복해서 비교된다.

### 변경 사항

`renderScene`이 최종 image를 할당하고 production camera·trace API를 통해 모든 pixel을 채운다. `Image`와 `RenderSettings`는 공개 renderer-level data type이 된다.

### 프로젝트 이해에서 중요한 이유

핵심 아키텍처가 가장 선명하게 드러난다. immutable scene input, deterministic per-pixel computation, caller에게 반환하는 owned byte image가 중심이다. 이후 threaded implementation은 별도의 rendering model이 아니라 이 reference computation을 재구성한 것이다.

## refactor(scene): 장면 도형의 단독 소유권 적용

커밋: `93167ba2bd94`  
중요도: S  
태그: ARCH, SCENE, RISK

### 문제

실제로 shared ownership이 필요한 subsystem이 없는데도 shared pointer를 사용하면 shape lifetime이 연장되거나 공유될 수 있다. acceleration structure가 scene-owned geometry의 index나 non-owning reference를 저장하기 시작하면 이러한 모호성이 위험해진다.

### 결정

`Scene`이 `unique_ptr`를 통해 shape의 sole owner가 된다. copy operation은 삭제하고 move operation은 유지하며, 모든 생성 지점이 ownership을 scene으로 이전한다.

### 중요성

shape 파괴에 정확히 하나의 owner를 부여하고 non-owning `HitRecord::shape` pointer와 BVH indexing에 필요한 object address를 안정적으로 유지한다. 또한 이후 acceleration lifecycle을 이해하기 쉬워진다. BVH는 동일한 object가 lifetime을 제어하는 geometry에서 파생된다.

### 변경 사항

parser와 benchmark 생성 코드를 `make_shared`에서 `make_unique`로 전환하고, scene storage와 traversal이 `unique_ptr`를 사용하며, scene copy semantics를 명시적으로 금지한다.

### 프로젝트 이해에서 중요한 이유

완성된 설계는 owned source state와 non-owning derived structure를 구분하는 데 의존한다. 이 커밋은 BVH가 도입되기 전에 그 구분을 확립한다.

## feat(scene): 가속 구조 소유권과 rebuild 경계 구성

커밋: `f7e969537c10`  
중요도: S  
태그: ARCH, ACCEL, SCENE

### 문제

BVH는 독립적인 domain state가 아니라 현재 shape와 bounds에서 파생된다. 프로젝트에는 finite AABB에 넣을 수 없는 plane도 있다. 명시적인 lifecycle이 없으면 scene이 불완전하거나 stale하거나 잘못 bounded된 acceleration data를 질의할 수 있다.

### 결정

`Scene`이 `Bvh`, 별도의 unbounded shape index list, acceleration-readiness flag를 소유한다. shape를 추가하면 derived data를 비우고 unavailable 상태로 만든다. `buildAcceleration`은 bounded geometry와 unbounded geometry를 나누고 tree를 rebuild한다. 파싱된 scene은 모든 directive가 성공한 뒤 한 번 build한다.

### 중요성

acceleration correctness의 state-management 절반을 담당한다. renderer가 한 번 build한 tree를 영구적으로 authoritative하다고 취급하지 못하게 하고, rebuild 전에 BVH mode를 요청했을 때 사용할 안전한 fallback condition을 정의한다.

### 변경 사항

새 build/readiness API와 private acceleration storage가 추가되고, `addShape`가 invalidation boundary가 되며, parser의 성공적인 완료 지점이 일반적인 rebuild boundary가 된다.

### 프로젝트 이해에서 중요한 이유

BVH는 단순히 더 빠른 container가 아니라 correctness obligation을 가진 cache로 이해하는 편이 정확하다. 이 커밋은 그 cache를 누가 소유하고 언제 유효하며 infinite geometry가 어떻게 참여하는지 설명한다.

## feat(accel): 결정적 BVH 최근접 순회 구현

커밋: `d4f6ee5b6042`  
중요도: S  
태그: CORE, ACCEL, HARD

### 문제

renderer는 traversal order가 선택된 hit를 바꾸지 않는 상태에서 많은 shape group을 건너뛸 수 있어야 했다. bounded BVH content와 unbounded plane을 함께 처리하고, pruning에 사용할 현재 closest distance도 유지해야 했다.

### 결정

explicit stack을 구현하고 root·child AABB를 검사하며 가까운 child를 먼저 방문한다. entry가 현재 closest hit보다 먼 node는 prune하고, leaf shape index는 공통 candidate function으로 검사한 뒤 마지막에 unbounded shape를 검사한다. child entry가 같을 때의 순서는 deterministic하게 결정하며, equal-hit selection은 계속 원래 shape index를 따른다.

### 중요성

프로젝트의 핵심 성능 개선을 실제로 구현하는 알고리즘이다. linear renderer의 정확한 semantic result를 보존하면서 작업량과 작업 순서를 바꾼다.

### 변경 사항

acceleration이 ready 상태이면 `Scene::intersect`가 실제 BVH path를 선택하고, AABB work를 기록하며, traversal stack을 유지한다. linear mode를 요청하거나 derived state가 unavailable하면 linear fallback도 그대로 유지한다.

### 프로젝트 이해에서 중요한 이유

bounds, builder, mode contract, tie rule, ownership, unbounded partition 등 앞선 모든 acceleration 결정을 production query path에 연결한다. 이 브랜치의 중심 algorithmic commit이다.

## feat(render): 원자적 tile 분배와 작업자 통계 병합 구현

커밋: `849f878ca0b0`  
중요도: S  
태그: ARCH, CONCURRENCY, DETERMINISM

### 문제

전체 이미지 렌더링은 serial이었지만 단순한 parallelization은 overlapping write, shared statistic race, schedule-dependent accumulation, join되지 않은 thread를 만들 수 있었다. 최적화 후에도 정확한 image byte를 보존해야 했다.

### 결정

renderer는 고정 16×16 tile과 atomic next-tile index를 사용한다. claim한 tile의 pixel은 한 worker가 exclusive하게 소유하고, scene과 camera data는 shared read-only로 사용한다. 각 worker는 별도의 statistics를 누적하며, 모든 worker를 join한 뒤 statistics를 병합하거나 image를 반환한다.

### 중요성

rendering semantics를 바꾸지 않고 parallelism을 얻는 방식을 정의한다. determinism은 고정된 scheduling order가 아니라 ownership과 per-pixel independence에서 나온다.

### 변경 사항

build에 thread 지원이 들어오고, tile loop가 worker body가 되며, 좌표에서 계산한 offset에 image를 concurrent하게 채운다. worker-local counter는 완료 후 합산한다.

### 프로젝트 이해에서 중요한 이유

최종 renderer의 concurrency model이 이 커밋에 드러난다. worker 수가 달라도 동일한 byte를 만들 수 있는 이유와 이후 test가 image와 semantic work counter를 함께 비교하는 이유를 설명한다.

## fix(renderer): 작업자 예외를 호출자에게 전달

커밋: `0536e4829070`  
중요도: A  
태그: CONCURRENCY, RISK, DEBUG

### 문제

`std::thread` body 밖으로 예외가 빠져나가면 `std::terminate`가 호출되며, 자연스럽게 `renderScene`이나 CLI의 정상 error path로 전달되지 않는다. 따라서 초기 scheduler는 성공 경로에서 worker를 정상적으로 join하더라도 위험한 failure mode를 가지고 있었다.

### 결정

각 worker가 실패를 자신의 `exception_ptr`에 저장하고 shared tile counter에 새 작업 할당 중단을 알린 뒤 종료한다. caller는 먼저 모든 worker를 join하고, 그 다음 저장된 failure를 caller thread에서 다시 던진다.

### 중요성

worker failure를 process termination에서 deterministic cleanup을 갖는 일반적인 rendering failure로 바꾼다. 실패한 render가 부분적인 성공 image로 오인되는 것도 막는다.

### 변경 사항

전체 worker body 주변에 worker error slot과 catch/rethrow logic을 추가하고, 기존 join boundary는 cleanup의 authoritative boundary로 유지한다.

### 프로젝트 이해에서 중요한 이유

성공적으로 동작하는 concurrency와 신뢰할 수 있는 concurrency의 차이를 보여준다. renderer history에서 가장 명확한 failure-path 수정이며, 최종 CLI에서 worker `std::exception` failure가 일반적인 status-1 path로 돌아온다는 설명의 근거다.

## fix(accel): 가속 구조의 도형 불변식 보호

커밋: `ef5320a83c27`  
중요도: S  
태그: ARCH, ACCEL, SCENE

### 문제

`Scene`은 acceleration readiness를 추적했지만 public mutable shape storage와 public primitive geometry 때문에 caller가 `addShape`를 호출하지 않고도 원본 데이터를 변경하거나 순서를 바꿀 수 있었다. 그 결과 BVH bounds와 index가 오래된 geometry를 설명하는데도 ready flag는 true로 남을 수 있었다.

### 결정

shape vector를 private으로 만들고, scene inspection은 count와 checked `const Shape&` access만 제공한다. built-in sphere, plane, cylinder parameter도 const accessor 뒤로 옮긴다. structural mutation은 반드시 이미 derived acceleration을 invalidate하는 `addShape`를 거쳐야 한다.

### 중요성

쉽게 드러나지 않는 심각한 correctness hole을 root cause에서 차단한다. `f7e969537c10`이 정의한 lifecycle은 이제 caller가 문서화되지 않은 관례를 기억해야 하는 것이 아니라 type interface가 강제하는 규칙이 된다.

### 변경 사항

geometry implementation을 private field로 이전하고, test와 dependent code는 read-only accessor를 사용하며, scene traversal은 private storage를 사용한다. 공개 API는 더 이상 mutable shape ownership을 노출하지 않는다.

### 프로젝트 이해에서 중요한 이유

완성된 BVH architecture는 traversal algorithm뿐 아니라 caller가 무엇을 변경할 수 없는지로도 정의된다. 이 커밋이 ownership과 cache coherency의 전체 흐름을 완성한다.

## fix(output): PPM 출력 실패 시 기존 파일 보존

커밋: `053235a7a5e1`  
중요도: A  
태그: OUTPUT, RISK, PRACTICAL

### 문제

최종 output path를 곧바로 truncation mode로 열면 serialization, flush, close가 성공하기 전에 기존의 유효한 image를 파괴할 수 있다. 파일을 열기 전 validation은 한 종류의 failure는 막지만 stream·replacement failure까지 보호하지는 못한다.

### 결정

PPM serialization을 checked stream API로 분리한다. file output은 같은 디렉터리의 고유 suffix를 가진 temporary path에 쓴 뒤 stream 완료를 검증하고 그 이후에만 destination을 교체한다. RAII guard는 replacement가 commit되지 않으면 temporary file을 제거한다.

### 중요성

output boundary에 transactional behavior가 생긴다. 완전한 새 PPM이 보이거나 기존 destination이 남는 두 경우만 허용한다. 외부 효과의 핵심이 image 파일 쓰기인 명령에서 중요한 reliability 개선이다.

### 변경 사항

output module에 stream serialization, temporary-name generation, platform-specific replacement, error reason, flush/close checking, cleanup-on-failure가 추가되었다.

### 프로젝트 이해에서 중요한 이유

correctness가 pixel computation에만 국한되지 않음을 보여준다. 완성된 프로그램은 publication failure 시 동작도 정의하며, 이후 주입된 stream·replacement failure test가 이 보장을 뒷받침한다.
