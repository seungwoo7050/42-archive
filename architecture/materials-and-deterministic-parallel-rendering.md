# 재귀 광선과 타일 작업자가 한 이미지로 모이는 구조

렌더러는 확산 재질의 직접 조명에 금속 재질의 완전 반사를 더하고, 한 스레드의 픽셀 루프를 여러 작업자가 나누어 실행하도록 확장되었다. 두 변화는 광선의 실행 순서와 수를 바꾸지만, 고정된 장면과 설정에서는 같은 이미지 바이트를 만들어야 한다.

이 문서는 장면에서 읽은 재질이 한 픽셀의 재귀 광선으로 이어지고, 서로 다른
픽셀이 여러 작업자로 흩어졌다가 다시 하나의 `Image`와 정수 통계로 모이는
경계를 잇는다.

## 파서의 재질 토큰에서 `HitRecord`까지

`.rt` 도형 줄은 마지막에 `diffuse` 또는 `metal`을 선택적으로 받을 수 있다.

```text
.rt 도형 줄의 [diffuse|metal]
  └─ parseMaterialType
       └─ Material { albedo, type }
            └─ Shape가 값으로 보관
                 └─ 교차 시 HitRecord에 복사
                      └─ traceRay의 분기
                           ├─ 확산 재질: 환경광 + 직접 조명 + 그림자
                           └─ 금속 재질: 반사 광선 + maxDepth - 1
```

토큰을 생략하거나 `diffuse`라고 쓰면 확산 재질로 처리하며, `metal`만 별도 분기로 선택한다. 다른 값은 장면 오류이다.

```cpp
if (tokens.size() == base_count) {
    return MaterialType::Diffuse;
}
if (token == "diffuse") {
    return MaterialType::Diffuse;
}
if (token == "metal") {
    return MaterialType::Metal;
}
throw ParseError(..., "unknown material '" + token + "'");
```

`Material`은 `albedo`와 종류를 가진 값 객체이다. 도형이 재질을 소유하고 교차할 때 `HitRecord`로 복사하므로, 재귀 광선은 도형 안의 재질 참조 수명에 의존하지 않는다. `HitRecord::shape`는 별도의 비소유 포인터이다. 토큰 해석은 [`src/parser.cpp`](../src/parser.cpp), 값 형식은 [`include/ray/material.hpp`](../include/ray/material.hpp), 광선 분기는 [`src/shading.cpp`](../src/shading.cpp)에서 이어진다.

### 확산 재질 경로

확산 재질은 보조 반사 광선을 만들지 않는다. 환경광에서 시작해 각 점광원의 Lambert 내적과 그림자 가시성을 더한 뒤 색을 0 이상 1 이하로 제한한다. 그림자 광선은 표면에서 법선 방향으로 `kRayTMin`만큼 옮겨 시작하고, 광원 바로 앞까지만 차폐 도형을 찾는다.

모든 작업자는 바뀌지 않는 `Scene::lights`를 같은 순서로 읽는다. 한 픽셀 안의 부동소수 덧셈 순서가 작업자 스케줄에 따라 바뀌지 않으므로 픽셀별 계산은 독립적으로 유지된다.

### 금속 재질 경로와 깊이

금속 재질은 법선 기준 완전 반사 방향 하나만 따른다.

```cpp
if (hit.material.type == MaterialType::Metal) {
    if (max_depth <= 0) {
        return Color();
    }
    const Vec3 reflected_direction =
        ray.direction -
        hit.normal * (2.0 * dot(ray.direction, hit.normal));
    const Ray reflected_ray(
        hit.point + hit.normal * kRayTMin,
        reflected_direction);
    if (stats) {
        ++stats->secondaryRays;
    }
    return hit.material.albedo *
           traceRay(scene,
                    reflected_ray,
                    max_depth - 1,
                    mode,
                    stats);
}
```

`maxDepth`는 앞으로 허용할 반사 확장 횟수이다. 금속 재질에서 보조 광선을 하나 만들 때마다 1을 소비한다. 깊이가 0인 상태에서 금속 재질을 만나면 검은색을 반환하지만, 도형을 만나지 않았다면 그보다 먼저 배경색을 반환한다. 확산 재질을 만나면 남은 깊이와 관계없이 직접 조명을 계산하고 끝낸다.

반사 결과에는 현재 금속 재질의 `albedo`를 성분별로 곱한다. 거칠기, 난수, 확률적 산란, Fresnel, 유전체, 에너지 보존 보정은 구현하지 않았다. 따라서 이 재질은 물리 기반 금속 모델 전체가 아니라 결정적인 완전 반사 분기이다.  `src/parser.cpp`, `src/shading.cpp`, `tests/material_tests.cpp`에서 이 경로와 기존 확산 재질 장면의 회귀 값을 함께 추가했다.

## 선언된 설정과 실제로 읽는 설정

CLI는 `--max-depth 0..32`, `--threads N|auto`, `--accel linear|bvh`를 받으며 기본 반사 깊이는 4이다. 이 옵션은  `src/main.cpp`에서 추가되었다.

`RenderSettings`에는 다음 필드가 있다.

```cpp
int samplesPerPixel;
int maxDepth;
double tMin;
double tMax;
AccelMode accelMode;
unsigned int threadCount;
```

현재 `renderScene`이 읽는 값은 `maxDepth`, `accelMode`, `threadCount`이다. `samplesPerPixel`은 1로 초기화되지만 루프에서 사용하지 않으므로 실제 렌더링은 픽셀 중심 광선 하나만 만든다. `tMin`과 `tMax`도 사용하지 않으며 `traceRay`가 `kRayTMin`과 무한대를 직접 적용한다. 구조에 필드가 있다는 이유만으로 활성 기능이나 안정된 확장 지점으로 볼 수는 없다.

## 16×16 타일이 픽셀 쓰기 권한이 된다

`src/renderer.cpp`는 한 스레드의 행 우선 루프를 16×16 타일 작업 큐로 바꿨다.

```text
Image·CameraFrame 생성
  └─ 타일 격자 계산
       └─ 작업자 수 결정
            └─ atomic next_tile = 0
                 ├─ 작업자 0: fetch_add → 타일 A → 고유 픽셀 쓰기
                 ├─ 작업자 1: fetch_add → 타일 B → 고유 픽셀 쓰기
                 └─ ...
                      └─ 모든 작업자 합류
                           └─ 정수 통계 합산
                                └─ 완성 Image 반환
```

사용자가 양의 작업자 수를 지정하면 그 값을 사용한다. `auto`는 `hardware_concurrency()`를 따르고 시스템이 0을 반환하면 1로 정한다. 최종 작업자 수는 타일 수를 넘지 않는다.

각 작업자는 원자 카운터에서 서로 다른 타일 번호를 가져온다.

```cpp
const std::size_t tile =
    next_tile.fetch_add(1, std::memory_order_relaxed);
if (tile >= tile_count) {
    break;
}
```

타일 사각형은 겹치지 않으며 픽셀 오프셋은 `(x, y)`로 직접 계산한다. 여러 작업자가 같은 픽셀 벡터를 보지만 각 바이트는 한 작업자만 쓴다. `memory_order_relaxed`는 타일 번호를 겹치지 않게 가져오는 데만 사용하는 현재 구조에 맞다. 렌더 결과는 모든 스레드를 `join()`한 뒤에만 주 스레드에서 사용한다.

작업자는 상태를 다음과 같이 나눈다.

- `Scene`, BVH, `CameraFrame`, 렌더 설정은 읽기 전용으로 공유한다.
- 픽셀 벡터는 타일마다 겹치지 않는 범위만 쓴다.
- 통계는 `alignas(64)`인 작업자별 슬롯에 모은 뒤 정수로 합산한다.
- 타일 배정에는 하나의 원자 인덱스만 사용한다.

64바이트 정렬과 16×16 타일 크기는 코드에 고정되어 있지만 두 값을 선택한 하드웨어별 측정은 저장되어 있지 않는다.

## 실행 순서가 달라도 픽셀이 같은 조건

현재 구조에서는 다음 성질이 함께 유지된다.

1. 난수와 전역 샘플 순서가 없다.
2. 한 픽셀은 다른 픽셀의 결과를 읽지 않는다.
3. 한 픽셀 안에서 광원과 반사 재귀를 처리하는 순서가 고정되어 있다.
4. 정확히 같은 `t`의 도형은 BVH 방문 순서가 아니라 원래 도형 인덱스로 선택한다.
5. 픽셀의 최종 위치는 작업 완료 순서가 아니라 `(x, y)`로 정한다.
6. 광선과 교차 통계는 작업자별 정수 카운터를 마지막에 더한다.

따라서 타일을 가져가는 순서는 실행마다 달라질 수 있어도 공유 부동소수 누적 순서는 생기지 않는다. 실행 시간은 운영체제 스케줄과 부하에 따라 달라질 수 있다.

이 설명은 현재의 단일 샘플, 난수 없는 재질, 렌더 중 변경되지 않는 장면을 전제로 한다. 향후 확률적 샘플링이나 픽셀 간 누적을 추가하면 같은 전제로 결정성을 말할 수 없다.

## 스레드 생성 실패와 작업자 내부 실패를 회수하는 경계

렌더러는 작업자를 만들기 전에 회수 경계를 준비한다. 스레드 생성 도중
`std::system_error`가 발생하면 다음 타일 번호를 끝으로 옮기고 이미 만들어진
스레드를 회수한다.

```cpp
nextTile.store(tileCount, std::memory_order_relaxed);
for (std::thread& worker : workers) {
    if (worker.joinable()) {
        worker.join();
    }
}
```

작업자 본문도 전체를 `try`/`catch (...)`로 감싼다. 각 작업자는 자신의
`std::exception_ptr` 슬롯에 실패를 보관하고 다음 타일 번호를 끝으로 옮겨 새
타일 배정을 중단한다. 이미 진행 중인 타일은 끝날 수 있다. 시작한 작업자를 모두
`join()`한 뒤 호출자 스레드가 작업자 번호 순서로 보관된 예외를 찾아 다시
던진다. 따라서 작업자 스레드에서 예외가 빠져나가 즉시 종료되지 않고 호출자에서
다시 나타난다. `std::exception` 계열은 `main`의 종료 코드 1 경로로 들어가지만,
그 밖의 예외 타입은 CLI 처리 범위 밖이다.

실패한 렌더는 부분 `Image`를 반환하거나 출력 파일을 열지 않는다. 정상 경로에서만
작업자별 통계를 합치고 완성된 `Image`를 반환한다. 오류를 던지는 검사 도형으로
예외 재전파와 작업자 회수를 검증한다. 이후 PPM 공개까지의 실패 경계는
[장면에서 출력까지의 설명](scene-to-first-image.md)에 정리되어 있다.

## 네 실행 모드를 한 장면에 겹쳐 본 검사

`tests/render_tests.cpp`는 96×54 장면에 확산 재질 구, 금속 재질 구, 평면, 임의 축 원기둥과 광원 두 개를 넣는다. 다음 네 조합을 렌더한다.

- 선형 탐색, 작업자 1개
- 선형 탐색, 작업자 4개
- BVH, 작업자 1개
- BVH, 작업자 4개

모든 조합의 픽셀 벡터와 체크섬이 같아야 한다.

```cpp
require(linear_one.image.pixels == linear_four.image.pixels &&
            linear_one.image.pixels == bvh_one.image.pixels &&
            linear_one.image.pixels == bvh_four.image.pixels,
        "all render modes produce identical pixels");
```

같은 가속 방식 안에서는 작업자 1개와 4개의 주 광선, 보조 광선, 그림자 광선, 도형 검사, AABB 검사 수도 같아야 한다. 선형과 BVH 사이의 도형·AABB 검사 수와 실행 시간은 같다고 요구하지 않는다.

이 장면에 metal 도형이 있다는 사실만으로 실제 반사 교차가 일어났다고 단정할 수
없고, `tests/render_tests.cpp`도 `secondaryRays > 0`을 별도로 요구하지 않는다.
반사 경로를 직접 확인하는 근거는 `tests/material_tests.cpp`가 한 번의 반사
색과 `secondaryRays == 1`을 요구하는 assertion이다. 네 모드 검사는 선택된
장면에서 나온 값들이 서로 같은지를 확인하는 층으로 해석한다.

`tests/render_determinism.sh`는 같은 네 조합을 실제 CLI로 실행해 체크섬 값과
PPM 전체 바이트를 비교하지만 체크섬의 16자리 형식을 직접 검사하지 않는다.
형식 정규식은 `tests/render_smoke.sh`와 `tests/cli_contract.sh`에 있고, 전체
파일 동치는 `cmp`가 확인한다.

이 검사는 같은 내용의 고정 회귀 장면을 라이브러리와 CLI 두 층에서 작업자 1개·4개로 확인한 결과이다. 임의 장면, `auto`, 모든 작업자 수, 모든 컴파일러와 CPU에서 같은 바이트가 나온다는 일반 보장은 아니다.

## 재질과 병렬 경로에서 아직 확인하지 않은 것

`tests/material_tests.cpp`는 재질 생략과 명시한 `diffuse`·`metal`, 알 수 없는 재질, 깊이 0의 검은색, 한 번의 완전 반사, 반복 호출의 같은 색, 보조 광선 수, 기존 확산 재질 장면 체크섬을 확인한다.

현재 검사는 다음 범위를 다루지 않는다.

- 여러 반사면 사이의 깊은 재귀와 CLI 상한 32 전체
- 모든 각도와 장면 크기에서의 자기 교차
- 물리적으로 사실적인 금속 재질 응답
- 임의 작업자 수와 매우 작거나 큰 타일 격자
- 렌더 중 다른 스레드가 공개 장면 상태를 바꾸는 사용법
- 데이터 레이스 전용 ThreadSanitizer 검사

ASan과 UBSan은 구성되어 있지만 ThreadSanitizer는 사용하지 않는다. 결정성 검사는 알고리즘 변경이 선택된 입력의 바이트를 바꾸지 않았는지 확인할 뿐 이미지의 시각적 정답이나 물리적 정확성을 판정하지 않는다.

worker 예외와 공개 설정의 현재 실패 상태는
[실패와 확장 경계](failure-and-extension-boundaries.md)에 모았다.

## 관련 개발 기록

- [제한된 재질 재귀](../devlog/14-bounded-material-recursion.md)
- [결정적 타일 렌더링](../devlog/15-deterministic-tiled-rendering.md)
- [실행 모드 결정성](../devlog/17-execution-mode-determinism.md)
